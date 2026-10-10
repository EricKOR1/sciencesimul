/* =========================================================
   중1 Ⅰ. 과학과 인류의 지속가능한 삶 — 첨단 과학기술과 미래 [9과01-02 뒷부분]
   ① [관찰] 민지의 하루 속 숨은 첨단 과학기술 찾기 (4컷 캐러셀)
   ② [탐구] 사례 기사 ↔ 기술 카드 연결 (조사 보드)
   ③ [예측] 미래 도시 2045: 근거 있는 예측 + 걱정되는 점과 해결 노력
   ④ [적용] 미래 신문(글 + 그림) 만들고 발표하기
   ※ 원리보다 활용 중심. 작동 원리·직업 세계·특정 기업명은 다루지 않음.
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
  const BG = '#eef3fb';

  /* =========================================================
     자료
     ========================================================= */
  const TECH = {
    ai: { icon: '🧠', name: '인공지능', color: '#7c3aed', desc: '많은 자료로 학습해 판단과 예측을 돕는 컴퓨터 프로그램' },
    iot: { icon: '📶', name: '사물 인터넷', color: '#0d9488', desc: '물건에 센서와 인터넷을 연결해 정보를 주고받게 하는 기술' },
    big: { icon: '📊', name: '빅데이터', color: '#2563eb', desc: '아주 많은 자료를 모아 분석해 쓸모 있는 정보를 찾는 기술' },
    robot: { icon: '🦾', name: '로봇', color: '#ea580c', desc: '사람 대신 일을 하는 기계' },
    print: { icon: '🖨️', name: '3D 프린팅', color: '#dc2626', desc: '설계도에 따라 재료를 한 층씩 쌓아 물건을 만드는 기술' },
    vr: { icon: '🥽', name: '가상 현실', color: '#db2777', desc: '컴퓨터로 만든 공간을 실제처럼 체험하게 하는 기술' },
  };
  const TECH_IDS = ['ai', 'iot', 'big', 'robot', 'print', 'vr'];
  const TRAP_TEXT = '이것도 과학기술로 만든 물건이지만, 최신 첨단 기술은 아니에요.';

  // 민지의 하루 4컷 (기준 좌표 800 × 468)
  const CW = 800, CH = 468;
  const CUTS = [
    {
      id: 'morning', icon: '🌅', name: '아침', place: '집', sky: ['#bfe3ff', '#ffd9a8'],
      spots: [
        { id: 'speaker', icon: '🔊', name: 'AI 스피커', tech: 'ai', x: 588, y: 266, r: 46, text: '“오늘 오후 비 올 확률은 70 %예요.” 말을 알아듣고 대답해요.' },
        { id: 'watch', icon: '⌚', name: '스마트워치', tech: 'iot', x: 386, y: 262, r: 40, text: '걸음 수·심장 박동을 재서 스마트폰으로 보내요.' },
        { id: 'calendar', icon: '📅', name: '종이 달력', trap: true, x: 606, y: 142, r: 54 },
      ],
    },
    {
      id: 'commute', icon: '🚌', name: '등굣길', place: '길', sky: ['#cdeaff', '#eef8ff'],
      spots: [
        { id: 'busboard', icon: '🚏', name: '버스 도착 알림판', tech: 'iot', x: 204, y: 212, r: 50, text: '버스의 위치 정보를 인터넷으로 주고받아 ‘3분 후 도착’을 알려요.' },
        { id: 'navi', icon: '🗺️', name: '내비게이션', tech: 'big', x: 452, y: 356, r: 46, text: '수많은 차의 이동 자료로 막히지 않는 길을 안내해요.' },
        { id: 'bike', icon: '🚲', name: '자전거', trap: true, x: 658, y: 350, r: 50 },
      ],
    },
    {
      id: 'school', icon: '🏫', name: '학교', place: '교실', sky: ['#a8dcff', '#e2f3ff'],
      spots: [
        { id: 'translate', icon: '🌐', name: '번역 앱', tech: 'ai', x: 268, y: 286, r: 50, text: '“Hello!”를 “안녕!”으로 바꿔 줘요.' },
        { id: 'vrset', icon: '🥽', name: 'VR 헤드셋', tech: 'vr', x: 578, y: 246, r: 42, text: '교실에서 화산 속을 탐험해요.' },
        { id: 'chalk', icon: '🖍️', name: '칠판과 분필', trap: true, x: 528, y: 128, r: 68 },
      ],
    },
    {
      id: 'evening', icon: '🌙', name: '저녁', place: '집', sky: ['#3b3f8f', '#ff9a76'],
      spots: [
        { id: 'vacuum', icon: '🤖', name: '로봇 청소기', tech: 'robot', x: 360, y: 430, r: 44, text: '장애물을 피해 스스로 청소해요.' },
        { id: 'recommend', icon: '📺', name: '영상 추천', tech: 'ai', x: 216, y: 214, r: 72, text: '내가 좋아할 만한 영상을 골라 줘요.' },
        { id: 'book', icon: '📖', name: '종이책', trap: true, x: 648, y: 296, r: 38 },
      ],
    },
  ];
  const ALL_SPOTS = [];
  CUTS.forEach((c, ci) => c.spots.forEach((s) => { s.cut = ci; if (!s.trap) ALL_SPOTS.push(s); }));

  // 사례 기사 6장
  const ARTICLES = [
    { id: 'scan', tech: 'ai', field: '🏥 의료', text: '엑스선·CT 사진에서 의사가 놓치기 쉬운 병의 흔적을 찾아 진단을 돕는다', fb: '많은 사진 자료로 학습해 병의 흔적을 찾아내는 사례예요. 판단과 예측을 돕는 기술을 찾아보세요.' },
    { id: 'farm', tech: 'iot', field: '🌾 농업', text: '비닐하우스의 온도·습도를 센서가 재서 스마트폰으로 알려 주고, 멀리서도 창을 열고 물을 준다(스마트 팜)', fb: '사람 대신 움직이는 기계보다, 센서와 인터넷으로 정보를 주고받는 사례예요.' },
    { id: 'bus', tech: 'big', field: '🚌 교통', text: '밤늦게 휴대 전화를 쓴 위치 자료 수십억 건을 분석해 심야버스 노선을 정했다(서울, 2013년)', fb: '아주 많은 자료(수십억 건)를 모아 분석한 사례예요.' },
    { id: 'rescue', tech: 'robot', field: '🚒 안전', text: '사람이 들어가기 위험한 재난 현장에서 문을 열고 밸브를 잠그는 임무를 해냈다(2015년 국제 재난 로봇 대회 우승, KAIST 휴보)', fb: '사람 대신 위험한 현장에서 일을 해낸 기계의 사례예요.' },
    { id: 'hand', tech: 'print', field: '✋ 의료', text: '사고로 손을 잃은 어린이의 손 크기에 꼭 맞는 의수(인공 손)를 짧은 시간에 싸게 만들었다', fb: '설계도에 따라 재료를 한 층씩 쌓아 꼭 맞는 물건을 만든 사례예요.' },
    { id: 'train', tech: 'vr', field: '✈️ 훈련', text: '조종사와 소방관이 실제와 같은 가상 공간에서 위험한 상황을 안전하게 훈련한다', fb: '컴퓨터로 만든 가상 공간을 실제처럼 체험하는 사례예요.' },
  ];
  const ART_ORDER = ['bus', 'hand', 'scan', 'train', 'farm', 'rescue'];   // 보관함 배치(고정 섞기)

  // 미래 도시 구역 (q = 등각 투영 섬의 사분면 [u0, v0])
  const ZONES = [
    { id: 'traffic', icon: '🚗', name: '교통', q: [0, 1] },
    { id: 'hospital', icon: '🏥', name: '병원', q: [0, 0] },
    { id: 'home', icon: '🏠', name: '집', q: [1, 0] },
    { id: 'farm', icon: '🌾', name: '농장', q: [1, 1] },
  ];
  const ZONE = {};
  ZONES.forEach((z) => { ZONE[z.id] = z; });
  const DRAW_ORDER = ['hospital', 'traffic', 'home', 'farm'];
  // 판정표: 구역 × 기술 → 예측 문장 (3·4단계 공통)
  const PRED = {
    traffic: {
      ai: '운전자 없이 스스로 달리는 자율 주행 자동차가 늘어난다.',
      big: '실시간 교통 자료로 신호를 바꿔 길 막힘이 줄어든다.',
      iot: '빈 주차 자리와 버스 위치를 스마트폰으로 바로 확인한다.',
      robot: '배달 로봇이 길을 따라 물건을 나른다.',
    },
    hospital: {
      ai: '인공지능이 의료 영상을 함께 살펴 병을 더 일찍 찾는다.',
      robot: '로봇 팔이 의사의 정밀한 수술을 돕는다.',
      print: '환자 몸에 꼭 맞는 의수와 인공 뼈를 빨리 만든다.',
      vr: '의사가 가상 공간에서 어려운 수술을 미리 연습한다.',
      iot: '몸에 찬 기기가 건강 정보를 병원에 보내 집에서도 진료를 받는다.',
      big: '많은 자료를 분석해 감염병이 퍼지는 것을 미리 알린다.',
    },
    home: {
      iot: '밖에서도 스마트폰으로 전등과 보일러를 켜고 끈다.',
      ai: '말로 부탁하면 집 안 기기가 알아서 움직인다.',
      robot: '청소와 빨래를 돕는 로봇이 늘어난다.',
      print: '3D 프린터로 집을 빠르게 짓는다.',
      vr: '집에서 가상 현실로 박물관 여행과 체험 학습을 한다.',
      big: '우리 집 전기 사용 자료를 분석해 아끼는 방법을 알려 준다.',
    },
    farm: {
      iot: '센서가 온도와 물을 자동으로 맞추는 스마트 팜이 늘어난다.',
      robot: '로봇과 드론이 씨 뿌리기와 수확을 돕는다.',
      big: '날씨와 수확 자료를 분석해 언제 심고 거둘지 알려 준다.',
    },
  };
  const NO_ZONE_FB = '2단계에서 조사한 사례 중 이 구역과 이어지는 것이 있었나요? 다른 구역에 놓아 보세요.';
  const CONCERNS = [
    { id: 'privacy', icon: '🔐', text: '기기에 모인 개인 정보가 새어 나갈 수 있다', zones: ['home', 'hospital'], fix: '개인 정보 보호 법과 보안 기술',
      fb: '개인 정보는 집 안 기기나 병원처럼 내 생활·건강 정보가 모이는 곳과 관계가 깊어요.' },
    { id: 'blame', icon: '⚖️', text: '사고가 나면 누구 책임인지 정하기 어렵다', zones: ['traffic'], fix: '책임을 정하는 법과 제도',
      fb: '운전자 없이 달리는 자동차가 사고를 내면 누구 책임일까요? 교통 구역을 살펴보세요.' },
    { id: 'jobs', icon: '🧑‍🌾', text: '사람이 하던 일을 기계가 대신해 일자리가 바뀐다', zones: ['farm', 'traffic'], fix: '새로운 일을 배우는 교육',
      fb: '사람이 하던 운전이나 농사일을 기계가 대신하는 곳을 찾아보세요.' },
    { id: 'divide', icon: '📵', text: '기기를 쓰기 어려운 사람은 혜택을 받기 어렵다', zones: ['hospital', 'home'], fix: '누구나 쓰기 쉬운 기기와 교육',
      fb: '원격 진료나 스마트 홈 기기를 쓰기 어려운 사람을 떠올려 보세요.' },
  ];
  const CONCERN = {};
  CONCERNS.forEach((c) => { CONCERN[c.id] = c; });

  // 미래 신문
  const POSTER = {
    traffic: { over: '모든 자동차가 하늘을 날아다닌다', good: '교통사고와 길에서 보내는 시간이 줄어든다', worry: 'blame', bad: 'vr',
      stickers: [['🚘', '자율 주행차'], ['🚦', '신호등'], ['🛣️', '도로'], ['📦', '배달 로봇'], ['🅿️', '주차장'], ['🚌', '버스']] },
    hospital: { over: '모든 병이 사라진다', good: '병을 더 일찍 찾고 치료를 받기 쉬워진다', worry: 'divide',
      stickers: [['🦾', '로봇 팔'], ['🖥️', '의료 화면'], ['🚑', '구급차'], ['🧑‍⚕️', '의사'], ['⌚', '스마트워치'], ['🖨️', '3D 프린터']] },
    home: { over: '사람은 아무 일도 하지 않아도 된다', good: '집안일이 줄고 에너지를 아낄 수 있다', worry: 'privacy',
      stickers: [['💡', '스마트 전등'], ['🔊', 'AI 스피커'], ['🤖', '로봇 청소기'], ['♨️', '보일러'], ['🥽', 'VR 기기'], ['🏠', '집']] },
    farm: { over: '농부가 전혀 필요 없어진다', good: '적은 일손으로 날씨에 덜 휘둘리며 농사짓는다', worry: 'jobs', bad: 'print',
      stickers: [['🌱', '스마트 팜'], ['🚁', '드론'], ['📡', '센서'], ['🤖', '수확 로봇'], ['⛺', '비닐하우스'], ['🍅', '토마토']] },
  };
  const SLOTS = ['theme', 'tech', 'head', 'good', 'worry', 'src'];
  const SLOT_NAME = { theme: '① 주제', tech: '② 첨단 과학기술', head: '③ 예상되는 변화', good: '④ 좋은 점', worry: '⑤ 걱정되는 점과 해결 노력', src: '⑥ 근거(출처)', pic: '⑦ 그림' };

  /* =========================================================
     상태
     ========================================================= */
  const S = {
    scene: 'day', from: null, sceneP: 1,
    day: { idx: 0, from: 0, p: 1, dir: 1, found: [], foundAt: {}, popup: null, fly: [], lastTap: now(), press: {}, vacU: 0, visited: new Set([0]) },
    board: { popup: null },
    city: { mode: 'tech', zones: {} },
    poster: { theme: null, filled: {}, slotAt: {}, cands: [], candSlot: null },
    present: null,
    fb: null, rings: [], hintAt: -99,
  };
  ZONES.forEach((z) => { S.city.zones[z.id] = { tech: null, concern: null, riseAt: -99, popAt: -99, worryAt: -99, bubbleAt: -99 }; });
  const PT = new SciSim.Particles();
  let game = null;
  let F = new Set();
  const has = (f) => F.has(f) || !!(game && game.free);
  const isNew = (f) => !!(game && game.isNew(f));

  /* =========================================================
     무대 (태블릿 800×520 / 휴대폰 480×820)
     ========================================================= */
  const LAYS = { wide: { kind: 'wide', w: 800, h: 600 }, tall: { kind: 'tall', w: 480, h: 820 } };
  let view = null, ctx = null, D = null, LAY = null;
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  const handlers = {
    down: (p) => onDown(p), move: (p) => onMove(p), up: (p) => onUp(p), hover: (p) => onHover(p),
  };
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
    endDrag();
    view = SciSim.stage(cv, { width: LAY.w, height: LAY.h, background: BG, onResize: clearCaches });
    ctx = view.ctx;
    D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    if (kind === 'tall') {
      // 휴대폰: 카드·물건을 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc && interactiveAt(view.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
    clearCaches();
    layoutAll(true);
  }

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
  // 정적 배경층을 오프스크린 캔버스에 한 번만 그림
  function layer(key, w, h, fn) {
    const k = kpx();
    const id = key + '|' + LAY.kind + '|' + Math.round(k * 100);
    let c = LAYER.get(id);
    if (!c) {
      c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w * k));
      c.height = Math.max(1, Math.ceil(h * k));
      const g = c.getContext('2d');
      g.scale(k, k);
      const keep = ctx;
      ctx = g; D = SciSim.draw(g);
      try { fn(); } finally { ctx = keep; D = SciSim.draw(ctx); }
      LAYER.set(id, c);
    }
    return c;
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
  function newBadge(x, y, w, h, t) {
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(139,92,246,' + (0.35 + a * 0.5) + ')';
    ctx.lineWidth = 4;
    rr(x, y, w, h, 14); ctx.stroke();
    ctx.fillStyle = '#8b5cf6';
    rr(x + w - 58, y + 6, 52, 22, 11); ctx.fill();
    T('NEW', x + w - 32, y + 22, 13, { c: '#fff', a: 'center', w: 800 });
    ctx.restore();
  }
  function breathe(x, y, w, h, r, t, color) {
    const a = 0.45 + 0.45 * Math.sin(t * 5);
    ctx.save();
    ctx.strokeStyle = rgba(color || '#14a058', 0.5 + a * 0.5);
    ctx.lineWidth = 3 + a * 1.5;
    rr(x - 3, y - 3, w + 6, h + 6, r + 3); ctx.stroke();
    ctx.restore();
  }
  // 성공 연출: 초록 링 + 반짝이 10개 + 체크
  function successFx(x, y) {
    S.rings.push({ x, y, t0: now() });
    PT.burst(x, y, { count: 10, colors: ['#14a058', '#ffd34d', '#5eead4', '#a78bfa'], speed: 150, size: 3.6, gravity: 120 });
    Sound.tick();
  }
  function showFeedback(text, x, y, kind) {
    S.fb = { text, x, y, t0: now(), kind: kind || 'bad', dur: 2.6 };
  }
  // 드래그 카드 (토큰): x, y는 가운데 좌표
  function Tok(o) {
    return Object.assign({ x: 0, y: 0, w: 100, h: 50, hx: 0, hy: 0, sc: 1, rot: 0, lift: 0, tilt: 0, vx: 0, shake: 0, alpha: 1, drag: false, tx: 0, ty: 0, busy: false }, o);
  }
  function tokUpdate(k, dt) {
    if (k.drag) {
      const a = 1 - Math.exp(-18 * dt);
      const nx = k.x + (k.tx - k.x) * a;
      k.vx = lerp(k.vx, (nx - k.x) / Math.max(dt, 0.001), 0.25);
      k.x = nx;
      k.y += (k.ty - k.y) * a;
    } else k.vx *= 0.8;
    k.lift = SciSim.approach(k.lift, k.drag ? 1 : 0, dt, 14);
    k.tilt = SciSim.approach(k.tilt, k.drag ? clamp(k.vx * 0.0011, -0.105, 0.105) : 0, dt, 12);
    if (k.shake > 0) k.shake = Math.max(0, k.shake - dt);
  }
  function tokHit(k, p, pad) {
    pad = pad || 0;
    const w = k.w * k.sc / 2 + pad, h = k.h * k.sc / 2 + pad;
    return Math.abs(p.x - k.x) <= w && Math.abs(p.y - k.y) <= h;
  }
  function tokDraw(k, body) {
    if (k.alpha <= 0.01) return;
    const sx = k.shake > 0 && !RM ? Math.sin(k.shake * 70) * 6 * (k.shake / 0.3) : 0;
    ctx.save();
    ctx.globalAlpha *= k.alpha;
    ctx.translate(k.x + sx, k.y);
    ctx.rotate(k.rot + k.tilt + (k.idle && !k.drag && !k.busy && !RM ? Math.sin(now() * 1.3 + k.hx * 0.03) * 0.009 : 0));
    const s = k.sc * (1 + 0.04 * k.lift);
    ctx.scale(s, s);
    body(-k.w / 2, -k.h / 2, k.w, k.h, k);
    ctx.restore();
  }
  function tokGrab(k, p) {
    k.drag = true; k.busy = false;
    k.offX = p.x - k.x; k.offY = p.y - k.y;
    k.tx = k.x; k.ty = k.y;
    Sound.click();
  }
  function tokFollow(k, p) { k.tx = p.x - k.offX; k.ty = p.y - k.offY; }
  function tokHome(k, delay) {
    k.drag = false;
    k.busy = true;
    const go = () => SciSim.tween(k, { x: k.hx, y: k.hy, sc: k.hsc || 1, rot: k.hrot || 0 }, { duration: 0.45, ease: 'outBack', onDone: () => { k.busy = false; } });
    if (delay && !RM) setTimeout(go, delay * 1000); else go();
  }
  function tokReject(k, msg) {
    k.drag = false;
    k.shake = 0.3;
    Sound.fail();
    showFeedback(msg, k.x, k.y - k.h * k.sc / 2 - 8, 'bad');
    tokHome(k, 0.3);
  }

  /* =========================================================
     장면 전환
     ========================================================= */
  const SCENE_LABEL = { day: '🗓️ 민지의 하루', board: '🗂️ 활용 사례 조사 보드', city: '🏙️ 미래 도시 2045', poster: '📰 2045 미래 신문' };
  function setScene(name, instant) {
    if (S.scene === name) { syncUI(); return; }
    endDrag();
    S.from = S.scene;
    S.scene = name;
    S.fb = null;
    layoutAll(false);
    if (instant || RM) { S.sceneP = 1; S.from = null; }
    else {
      S.sceneP = 0;
      SciSim.tween(S, { sceneP: 1 }, { duration: 0.7, ease: 'inOutCubic', onDone: () => { S.from = null; } });
    }
    syncUI();
  }
  let drag = null;   // { kind, tok, ... }
  function endDrag() {
    if (drag && drag.tok) { drag.tok.drag = false; if (drag.tok.ghost) drag.tok.alpha = 0; else tokHome(drag.tok); }
    drag = null;
  }

  /* =========================================================
     STEP 1 · 민지의 하루
     ========================================================= */
  const Day = {
    frame() { return LAY.kind === 'wide' ? { x: 0, y: 0, w: 800, h: 468, s: 1, ox: 0 } : { x: 0, y: 0, w: 480, h: 351, s: 0.75, ox: -60 }; },
    toBase(p) { const f = this.frame(); return { x: (p.x - f.x - f.ox) / f.s, y: (p.y - f.y) / f.s }; },
    toCanvas(bx, by) { const f = this.frame(); return { x: f.x + f.ox + bx * f.s, y: f.y + by * f.s }; },
    spot(id) { for (const c of CUTS) for (const s of c.spots) if (s.id === id) return s; return null; },
    vacPos(t) {
      // 가구를 피해 도는 닫힌 스플라인 경로
      const pts = [[360, 430], [452, 446], [560, 440], [612, 412], [540, 392], [430, 396], [330, 410]];
      const u = S.day.vacU;
      const n = pts.length, seg = Math.floor(u * n) % n, f = u * n - Math.floor(u * n);
      const p0 = pts[(seg - 1 + n) % n], p1 = pts[seg], p2 = pts[(seg + 1) % n], p3 = pts[(seg + 2) % n];
      const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
      return { x: cr(p0[0], p1[0], p2[0], p3[0]), y: cr(p0[1], p1[1], p2[1], p3[1]) };
    },
    isFound(id) { return S.day.found.indexOf(id) >= 0; },
    foundAge(id) { const t0 = S.day.foundAt[id]; return t0 == null ? -1 : now() - t0; },
    go(dir) {
      const d = S.day;
      const ni = clamp(d.idx + dir, 0, CUTS.length - 1);
      if (ni === d.idx || d.p < 1) return;
      Sound.click();
      d.from = d.idx; d.idx = ni; d.dir = dir; d.p = 0; d.popup = null;
      d.visited.add(ni);
      if (RM) d.p = 1; else SciSim.tween(d, { p: 1 }, { duration: 0.7, ease: 'inOutCubic' });
      syncUI();
    },
    tap(p) {
      const d = S.day;
      if (d.p < 1) return false;
      const f = this.frame();
      if (p.x < f.x || p.x > f.x + f.w || p.y < f.y || p.y > f.y + f.h) return false;
      const b = this.toBase(p);
      const cut = CUTS[d.idx];
      let hit = null;
      const order = cut.spots.filter((s) => !s.trap).concat(cut.spots.filter((s) => s.trap));
      for (const s of order) {
        const pos = s.id === 'vacuum' ? this.vacPos() : s;
        const rr0 = Math.max(s.r, LAY.kind === 'tall' ? 40 : 0);
        if (Math.hypot(b.x - pos.x, b.y - pos.y) <= rr0) { hit = s; break; }
      }
      if (!hit) return false;
      d.lastTap = now();
      d.press[hit.id] = now();
      const pos = hit.id === 'vacuum' ? this.vacPos() : hit;
      d.popup = { spot: hit, t0: now(), bx: pos.x, by: pos.y };
      if (hit.trap) { Sound.click(); return true; }
      if (!this.isFound(hit.id)) {
        d.found.push(hit.id);
        d.foundAt[hit.id] = now();
        const c = this.toCanvas(pos.x, pos.y - hit.r * 0.6);
        const slot = this.slotPos(d.found.length - 1);
        d.fly.push({ spot: hit, x0: c.x, y0: c.y, x1: slot.x, y1: slot.y, t0: now() });
        successFx(c.x, c.y);
      } else Sound.click();
      return true;
    },
    // 찾은 기술 선반의 칸 위치 (캔버스 좌표)
    slotPos(i) {
      if (LAY.kind === 'wide') return { x: 12 + (i % 4) * 197 + 36, y: 468 + 36 + Math.floor(i / 4) * 54 + 23 };
      const col = i % 2, row = Math.floor(i / 2);
      return { x: 12 + col * 234 + 30, y: 372 + row * 110 + 34 };
    },
    update(dt) {
      const d = S.day;
      if (this.isFound('vacuum') && !RM) d.vacU = (d.vacU + dt / 11) % 1;
      if (d.popup && now() - d.popup.t0 > 3.6) d.popup = null;
      d.fly = d.fly.filter((f) => now() - f.t0 < 0.62);
    },
  };

  /* ---------- 사람 그리기 ---------- */
  // (x, y) = 발 가운데. o.hand = [dx, dy] 왼팔 손 위치(어깨 기준), o.handR, o.sit, o.vr, o.pack
  function kid(x, y, s, o) {
    o = o || {};
    const skin = o.skin || '#ffd9b8', hair = o.hair || '#3b2a20', shirt = o.shirt || '#f472b6', pants = o.pants || '#3b4a6b';
    ctx.save();
    const br = RM ? 0 : Math.sin(now() * 2.1 + x * 0.013) * 0.011;   // 숨쉬기
    ctx.translate(x, y); ctx.scale(s, s * (1 + br));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (!o.sit) {
      contact(0, 0, 30, 7, 0.22);
      ctx.strokeStyle = pants; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(-8, -52); ctx.lineTo(-9, -8); ctx.moveTo(8, -52); ctx.lineTo(9, -8); ctx.stroke();
      ellipse(-11, -4, 9, 5, '#f8fafc'); ellipse(11, -4, 9, 5, '#f8fafc');
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(-11, -4, 9, 5, 0, 0, TAU); ctx.ellipse(11, -4, 9, 5, 0, 0, TAU); ctx.stroke();
    } else if (o.sit === 'sofa') {
      ctx.strokeStyle = pants; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(-8, -50); ctx.lineTo(16, -48); ctx.lineTo(18, -14); ctx.moveTo(6, -50); ctx.lineTo(28, -48); ctx.lineTo(30, -14); ctx.stroke();
    }
    if (o.pack) {
      ctx.fillStyle = lingrad(-30, -100, -10, -50, ['#60a5fa', '#2563eb']);
      rr(-30, -100, 18, 48, 8); ctx.fill();
    }
    // 몸통
    ctx.fillStyle = lingrad(-20, -104, 20, -44, [shade(shirt, 0.18), shade(shirt, -0.14)]);
    rr(-20, -104, 40, 58, 15); ctx.fill();
    if (o.pack) { ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-14, -102); ctx.lineTo(-12, -60); ctx.stroke(); }
    // 팔
    const arm = (sx, sy, h) => {
      const hx = sx + h[0], hy = sy + h[1];
      const ex = sx + h[0] * 0.5 + (h[1] < 0 ? (sx < 0 ? -10 : 10) : (sx < 0 ? -6 : 6)), ey = sy + h[1] * 0.5 + 4;
      ctx.strokeStyle = shade(shirt, -0.05); ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ex, ey, hx, hy); ctx.stroke();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx, hy, 6.2, 0, TAU); ctx.fill();
      return { x: hx, y: hy };
    };
    const hl = arm(-17, -96, o.hand || [-6, 44]);
    arm(17, -96, o.handR || [6, 44]);
    // 머리
    ctx.fillStyle = skin; ctx.fillRect(-5, -112, 10, 10);
    const hg = ctx.createRadialGradient(-6, -134, 4, 0, -126, 23);
    hg.addColorStop(0, '#ffe7d1'); hg.addColorStop(1, skin);
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -126, 21, 0, TAU); ctx.fill();
    ctx.fillStyle = hair;
    if (o.style === 'short') {
      ctx.beginPath(); ctx.arc(0, -130, 22, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(14, -142, 0, -140); ctx.quadraticCurveTo(-12, -140, -21, -128); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, -128, 22.5, Math.PI * 0.96, Math.PI * 2.04); ctx.quadraticCurveTo(10, -140, -2, -136); ctx.quadraticCurveTo(-14, -132, -22, -124); ctx.fill();
      ctx.beginPath(); ctx.ellipse(20, -122, 8, 15, -0.5, 0, TAU); ctx.fill();   // 묶은 머리
      ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(17, -134, 3.6, 0, TAU); ctx.fill();
    }
    if (o.vr) {
      ctx.fillStyle = lingrad(0, -134, 0, -116, ['#475569', '#1e293b']);
      rr(-20, -134, 40, 18, 7); ctx.fill();
      ctx.fillStyle = 'rgba(56,189,248,.55)'; rr(-15, -129, 30, 6, 3); ctx.fill();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -126, 22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else {
      ctx.fillStyle = '#2a2230';
      if (!RM && ((now() + x * 0.37) % 4.3) < 0.13) {   // 눈 깜빡임
        ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-10, -124); ctx.lineTo(-5, -124); ctx.moveTo(5, -124); ctx.lineTo(10, -124); ctx.stroke();
      } else { ctx.beginPath(); ctx.ellipse(-7.5, -124, 2.3, 3, 0, 0, TAU); ctx.ellipse(7.5, -124, 2.3, 3, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,120,140,.35)'; ctx.beginPath(); ctx.arc(-12, -117, 3.6, 0, TAU); ctx.arc(12, -117, 3.6, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#9a4b3d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -117, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();
    return { hand: { x: x + hl.x * s, y: y + hl.y * s } };
  }

  /* ---------- 4컷 그리기 (기준 좌표) ---------- */
  function seeded(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  function skyline(seed, x0, x1, base, hmin, hmax, color, winColor, t) {
    const rnd = seeded(seed);
    let x = x0;
    while (x < x1) {
      const w = 40 + rnd() * 60, h = hmin + rnd() * (hmax - hmin);
      ctx.fillStyle = color;
      ctx.fillRect(x, base - h, w, h + 4);
      if (winColor) {
        ctx.fillStyle = winColor;
        for (let yy = base - h + 10; yy < base - 10; yy += 16) {
          for (let xx = x + 7; xx < x + w - 10; xx += 13) if (rnd() > 0.45) ctx.fillRect(xx, yy, 6, 8);
        }
      }
      x += w + 4 + rnd() * 10;
    }
  }
  function cloud(x, y, s, a) {
    ctx.fillStyle = 'rgba(255,255,255,' + (a || 0.9) + ')';
    ctx.beginPath();
    ctx.arc(x, y, 18 * s, 0, TAU); ctx.arc(x + 20 * s, y - 10 * s, 22 * s, 0, TAU); ctx.arc(x + 44 * s, y, 18 * s, 0, TAU);
    ctx.rect(x, y - 2 * s, 44 * s, 18 * s);
    ctx.fill();
  }
  function drawCutLayer(ci, L, t) {
    const cut = CUTS[ci];
    if (L === 0) {
      ctx.fillStyle = lingrad(0, 0, 0, 330, cut.sky);
      ctx.fillRect(-700, -40, 2200, 560);
      if (ci === 0) { D.glow(178, 236, 110, '#fff2c4', 0.85); ellipse(178, 236, 24, 24, '#fff7dc'); }
      if (ci === 1) { const dx = (t * 6) % 900; cloud(120 + dx - 300, 70, 1.2); cloud(520 + dx - 300, 100, 0.9); cloud(860 + dx - 300, 60, 1.1); }
      if (ci === 2) { const dr = RM ? 0 : t * 7; cloud(((150 + dr) % 520) - 140, 96, 1, 0.8); cloud(((300 + dr * 0.7) % 520) - 140, 150, 0.7, 0.7); }
      if (ci === 3) {
        const rnd = seeded(77);
        for (let i = 0; i < 26; i++) { const x = rnd() * 900 - 50, y = rnd() * 120, a = 0.4 + 0.5 * Math.sin(t * 2 + i); ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; ctx.fillRect(x, y, 2, 2); }
        ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(640, 92, 16, 0, TAU); ctx.fill();
        ctx.fillStyle = cut.sky[0]; ctx.beginPath(); ctx.arc(648, 87, 14, 0, TAU); ctx.fill();
      }
      return;
    }
    if (L === 1) {
      if (ci === 0) skyline(11, -560, 1360, 310, 70, 160, 'rgba(126,152,190,.55)', 'rgba(255,255,255,.35)');
      if (ci === 1) { skyline(23, -560, 1360, 330, 90, 230, '#b4c7dd', 'rgba(255,255,255,.45)'); skyline(29, -560, 1360, 330, 50, 120, '#9fb5cf', null); }
      if (ci === 2) {
        ctx.fillStyle = '#9ed5a6'; ctx.beginPath(); ctx.moveTo(-560, 300); for (let x = -560; x <= 1360; x += 40) ctx.lineTo(x, 236 + Math.sin(x * 0.012) * 26); ctx.lineTo(1360, 320); ctx.closePath(); ctx.fill();
        for (let x = -540; x < 1360; x += 70) { ctx.fillStyle = '#5fae6a'; ctx.beginPath(); ctx.arc(x, 236 + Math.sin(x * 0.012) * 26 - 8, 16, 0, TAU); ctx.fill(); }
      }
      if (ci === 3) skyline(41, -560, 1360, 300, 70, 170, '#3e3566', 'rgba(255,214,120,.8)');
      return;
    }
    // L === 2 : 앞 물체
    if (ci === 0) drawMorning(t);
    else if (ci === 1) drawCommute(t);
    else if (ci === 2) drawSchool(t);
    else drawEvening(t);
  }
  function wallWithWindow(x, y, w, h, wall, win) {
    ctx.beginPath();
    ctx.rect(-40, -40, CW + 80, h + 40 + y);
    ctx.rect(win[0], win[1], win[2], win[3]);
    ctx.fillStyle = wall;
    ctx.fill('evenodd');
  }
  function windowFrame(x, y, w, h, col) {
    ctx.strokeStyle = col || '#ffffff'; ctx.lineWidth = 10; ctx.strokeRect(x, y, w, h);
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h * 0.42); ctx.lineTo(x + w, y + h * 0.42); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + 18, y + h * 0.8); ctx.lineTo(x + w * 0.32, y + 16); ctx.moveTo(x + w * 0.58, y + h * 0.9); ctx.lineTo(x + w * 0.86, y + 22); ctx.stroke();
    ctx.fillStyle = shade(col || '#ffffff', -0.08); ctx.fillRect(x - 12, y + h + 4, w + 24, 10);
  }
  function floor(y, c1, c2, plank) {
    ctx.fillStyle = lingrad(0, y, 0, CH, [c1, c2]);
    ctx.fillRect(-40, y, CW + 80, CH - y + 40);
    ctx.strokeStyle = 'rgba(80,50,20,.12)'; ctx.lineWidth = 1.5;
    for (let yy = y + plank; yy < CH; yy += plank) { ctx.beginPath(); ctx.moveTo(-40, yy); ctx.lineTo(CW + 40, yy); ctx.stroke(); }
  }
  function pressScale(id) {
    const t0 = S.day.press[id];
    if (t0 == null) return 1;
    const a = now() - t0;
    if (a > 0.35) return 1;
    return 1 + 0.07 * Math.sin(Math.PI * a / 0.35) - (a < 0.06 ? 0.03 : 0);
  }
  function withScale(id, cx, cy, fn) {
    const s = pressScale(id);
    if (s === 1) { fn(); return; }
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore();
  }
  function soundWaves(x, y, t, color) {
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.9) + i / 3) % 1;
      ctx.strokeStyle = rgba(color, 0.65 * (1 - k)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 16 + k * 46, -0.75, 0.75); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 16 + k * 46, Math.PI - 0.75, Math.PI + 0.75); ctx.stroke();
    }
  }
  function drawMorning(t) {
    wallWithWindow(0, 0, CW, 384, lingrad(0, 0, 0, 384, ['#fcf3e4', '#f1dec2']), [120, 52, 250, 206]);
    ctx.fillStyle = 'rgba(120,80,40,.06)';
    for (let x = 30; x < CW; x += 46) ctx.fillRect(x, 0, 2, 380);
    windowFrame(120, 52, 250, 206);
    // 커튼
    const sw = RM ? 0 : Math.sin(t * 1.6) * 4;
    [[92, 148, 1], [342, 398, -1]].forEach(([a, b, dir]) => {
      ctx.fillStyle = lingrad(a, 0, b, 0, ['#f9c8cc', '#f4aab2', '#f9c8cc']);
      ctx.beginPath(); ctx.moveTo(a, 40); ctx.lineTo(b, 40);
      ctx.quadraticCurveTo(b + dir * 4 + sw, 180, b - dir * 8 + sw * 1.6, 286); ctx.lineTo(a + sw, 286); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = '#c9a27a'; rr(80, 34, 334, 8, 4); ctx.fill();
    // 바닥 + 햇빛 자국
    floor(380, '#dcb88d', '#c49a6c', 24);
    ctx.fillStyle = '#ead7bb'; ctx.fillRect(-40, 374, CW + 80, 8);
    ctx.fillStyle = 'rgba(255,238,170,' + (0.32 + 0.03 * Math.sin(t * 1.5)).toFixed(3) + ')';
    ctx.beginPath(); ctx.moveTo(150, 392); ctx.lineTo(340, 392); ctx.lineTo(420, 456); ctx.lineTo(210, 456); ctx.closePath(); ctx.fill();
    // 러그
    ellipse(400, 436, 150, 22, 'rgba(126,168,214,.45)');
    // 수납장 + AI 스피커 + 화분
    contact(620, 386, 120, 10, 0.22);
    ctx.fillStyle = lingrad(0, 300, 0, 386, ['#c08f62', '#9b6a42']); rr(520, 300, 200, 84, 6); ctx.fill();
    ctx.fillStyle = '#d7aa7c'; rr(514, 294, 212, 10, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(70,40,20,.35)'; ctx.lineWidth = 2; ctx.strokeRect(532, 314, 84, 58); ctx.strokeRect(624, 314, 84, 58);
    ellipse(574, 343, 4, 4, '#f3d9a8'); ellipse(666, 343, 4, 4, '#f3d9a8');
    withScale('speaker', 588, 266, () => drawSpeaker(588, 294, t));
    ctx.fillStyle = '#e9e1d6'; rr(670, 268, 34, 28, 6); ctx.fill();
    ctx.fillStyle = '#4caf6a';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(687 + (i - 2) * 8, 250 - Math.abs(i - 2) * 4, 6, 18, (i - 2) * 0.35, 0, TAU); ctx.fill(); }
    // 달력 (함정)
    withScale('calendar', 606, 142, () => {
      ctx.save(); ctx.translate(606, 142); ctx.rotate(-0.03);
      softShadow(-46, -56, 92, 112, 4, 0, 0.7);
      ctx.fillStyle = '#fff'; ctx.fillRect(-46, -56, 92, 112);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(-46, -56, 92, 26);
      T('5월', 0, -37, 15, { c: '#fff', a: 'center', jua: true });
      ctx.strokeStyle = '#d6dbe3'; ctx.lineWidth = 1;
      for (let i = 1; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-46 + i * 13.1, -26); ctx.lineTo(-46 + i * 13.1, 56); ctx.stroke(); }
      for (let j = 1; j < 5; j++) { ctx.beginPath(); ctx.moveTo(-46, -26 + j * 16.4); ctx.lineTo(46, -26 + j * 16.4); ctx.stroke(); }
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-26, 14, 6, 0, TAU); ctx.fill();
      ellipse(-20, -58, 3.5, 3.5, '#64748b'); ellipse(20, -58, 3.5, 3.5, '#64748b');
      ctx.restore();
    });
    // 민지 (손을 들어 인사) + 스마트워치
    const k = kid(430, 440, 1.28, { shirt: '#f472b6', hand: [-26, -42] });
    const w = { x: k.hand.x + 3, y: k.hand.y + 10 };
    CUTS[0].spots[1].x = w.x; CUTS[0].spots[1].y = w.y;
    withScale('watch', w.x, w.y, () => drawWatch(w.x, w.y, t));
  }
  function drawSpeaker(x, by, t) {
    const found = Day.isFound('speaker');
    if (found && !RM) soundWaves(x, by - 34, t, '#22d3ee');
    contact(x, by, 30, 6, 0.3);
    ctx.fillStyle = lingrad(x - 24, 0, x + 24, 0, ['#2a3040', '#4a5368', '#2a3040']);
    rr(x - 23, by - 62, 46, 62, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (let yy = by - 52; yy < by - 6; yy += 6) for (let xx = x - 18; xx < x + 18; xx += 6) ctx.fillRect(xx + ((yy / 6) % 2) * 3, yy, 2, 2);
    ellipse(x, by - 62, 23, 7, '#5b6478');
    // LED 고리
    const a0 = found && !RM ? t * 4 : 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = found ? 'rgba(34,211,238,.35)' : 'rgba(148,163,184,.5)';
    ctx.beginPath(); ctx.ellipse(x, by - 62, 18, 5, 0, 0, TAU); ctx.stroke();
    if (found) { ctx.strokeStyle = '#22d3ee'; ctx.beginPath(); ctx.ellipse(x, by - 62, 18, 5, 0, a0, a0 + 1.6); ctx.stroke(); }
  }
  function drawWatch(x, y, t) {
    const found = Day.isFound('watch');
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4);
    ctx.fillStyle = '#334155'; rr(-6, -13, 12, 26, 4); ctx.fill();
    ctx.fillStyle = '#111827'; rr(-8.5, -8.5, 17, 17, 4); ctx.fill();
    ctx.fillStyle = found ? '#0f172a' : '#1f2937'; rr(-6.5, -6.5, 13, 13, 3); ctx.fill();
    ctx.restore();
    if (found) {
      const beat = RM ? 1 : 1 + 0.18 * Math.max(0, Math.sin(t * 7.5)) ** 6;
      bubble(x + 14, y - 58, 64, 36, x + 6, y - 10, { r: 12 });
      ctx.save(); ctx.translate(x + 32, y - 40); ctx.scale(beat, beat);
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-12, -2, -8, -12, 0, -6); ctx.bezierCurveTo(8, -12, 12, -2, 0, 6); ctx.fill();
      ctx.restore();
      T('72', x + 58, y - 34, 14, { a: 'center', w: 800, c: '#ef4444' });
    }
  }
  function drawCommute(t) {
    // 인도 + 도로
    ctx.fillStyle = lingrad(0, 318, 0, 392, ['#e3e6eb', '#cfd4dc']); ctx.fillRect(-40, 318, CW + 80, 74);
    ctx.strokeStyle = 'rgba(120,130,150,.25)'; ctx.lineWidth = 1;
    for (let x = -40; x < CW + 40; x += 36) { ctx.beginPath(); ctx.moveTo(x, 318); ctx.lineTo(x - 14, 392); ctx.stroke(); }
    ctx.fillStyle = '#aeb5c0'; ctx.fillRect(-40, 388, CW + 80, 9);
    ctx.fillStyle = lingrad(0, 397, 0, CH, ['#5d6372', '#474c58']); ctx.fillRect(-40, 397, CW + 80, CH - 397 + 40);
    ctx.fillStyle = '#f8fafc';
    for (let x = -40; x < CW + 40; x += 90) ctx.fillRect(x, 446, 50, 5);
    // 나무
    contact(640, 330, 30, 6, 0.2);
    ctx.fillStyle = '#8a5a35'; ctx.fillRect(634, 236, 12, 96);
    ctx.fillStyle = '#4caf6a'; ctx.beginPath(); ctx.arc(640, 210, 40, 0, TAU); ctx.arc(612, 232, 28, 0, TAU); ctx.arc(668, 232, 28, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(628, 196, 16, 0, TAU); ctx.fill();
    // 버스 정류장
    contact(200, 312, 120, 8, 0.18);
    ctx.fillStyle = 'rgba(190,225,255,.38)'; ctx.fillRect(108, 182, 192, 126);
    ctx.strokeStyle = 'rgba(120,160,200,.6)'; ctx.lineWidth = 2; ctx.strokeRect(108, 182, 192, 126);
    ctx.fillStyle = '#334155'; ctx.fillRect(100, 176, 8, 140); ctx.fillRect(300, 176, 8, 140);
    ctx.fillStyle = lingrad(0, 164, 0, 182, ['#14b8a6', '#0f766e']); rr(88, 164, 232, 18, 6); ctx.fill();
    ctx.fillStyle = '#64748b'; rr(130, 290, 150, 10, 4); ctx.fill(); ctx.fillRect(140, 300, 6, 16); ctx.fillRect(264, 300, 6, 16);
    // 정류장 표지판
    ctx.fillStyle = '#475569'; ctx.fillRect(68, 150, 6, 170);
    ellipse(71, 150, 20, 20, '#2563eb'); emo('🚏', 71, 150, 22);
    withScale('busboard', 204, 212, () => drawBusBoard(136, 190, t));
    // 민지 (가방)
    kid(344, 380, 1.15, { shirt: '#facc15', pack: true, hand: [-4, 44] });
    // 자동차 + 내비게이션
    withScale('navi', 452, 356, () => drawCar(t));
    // 자전거 (함정)
    withScale('bike', 658, 350, () => drawBike(658, 362));
  }
  function drawBusBoard(x, y, t) {
    const found = Day.isFound('busboard');
    ctx.fillStyle = '#1f2937'; ctx.fillRect(x + 30, y - 8, 4, 10); ctx.fillRect(x + 102, y - 8, 4, 10);
    ctx.fillStyle = '#0b0f19'; rr(x, y, 136, 44, 8); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; rr(x, y, 136, 44, 8); ctx.stroke();
    ctx.save(); rr(x + 6, y + 6, 124, 32, 5); ctx.clip();
    ctx.fillStyle = '#140d05'; ctx.fillRect(x + 6, y + 6, 124, 32);
    ctx.fillStyle = 'rgba(255,170,40,.10)';
    for (let yy = y + 8; yy < y + 38; yy += 4) for (let xx = x + 8; xx < x + 130; xx += 4) ctx.fillRect(xx, yy, 2, 2);
    if (found) {
      const msg = '101번  3분 후 도착  ·  ';
      ctx.font = fnt(17, 800);
      const tw = ctx.measureText(msg).width;
      const off = RM ? 0 : (t * 40) % tw;
      ctx.fillStyle = '#ffb020'; ctx.shadowColor = '#ff9a00'; ctx.shadowBlur = 6;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(msg + msg, x + 10 - off, y + 23);
      ctx.shadowBlur = 0;
    } else T('101번 ···', x + 68, y + 28, 16, { a: 'center', c: 'rgba(255,176,32,.55)', w: 800 });
    ctx.restore();
  }
  function drawCar(t) {
    const x = 372, y = 344;
    contact(486, 424, 130, 9, 0.3);
    ctx.fillStyle = lingrad(0, y - 16, 0, y + 80, ['#60a5fa', '#2563eb', '#1e40af']);
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 70); ctx.lineTo(x + 2, y + 40); ctx.quadraticCurveTo(x + 6, y + 26, x + 40, y + 22);
    ctx.lineTo(x + 70, y - 12); ctx.quadraticCurveTo(x + 80, y - 18, x + 100, y - 18);
    ctx.lineTo(x + 172, y - 18); ctx.quadraticCurveTo(x + 188, y - 16, x + 198, y + 20);
    ctx.quadraticCurveTo(x + 228, y + 26, x + 230, y + 44); ctx.lineTo(x + 228, y + 70); ctx.closePath(); ctx.fill();
    // 창문
    ctx.fillStyle = 'rgba(210,235,255,.92)';
    ctx.beginPath(); ctx.moveTo(x + 50, y + 20); ctx.lineTo(x + 76, y - 8); ctx.lineTo(x + 128, y - 8); ctx.lineTo(x + 128, y + 20); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 136, y + 20); ctx.lineTo(x + 136, y - 8); ctx.lineTo(x + 170, y - 8); ctx.lineTo(x + 186, y + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 12, y + 30, 210, 4);
    ellipse(x + 16, y + 40, 7, 5, '#fde68a');
    // 바퀴
    [x + 46, x + 184].forEach((wx) => { ellipse(wx, y + 72, 21, 21, '#1f2937'); ellipse(wx, y + 72, 10, 10, '#9ca3af'); });
    // 내비게이션 화면
    drawNavi(x + 56, y - 4, t);
  }
  function drawNavi(x, y, t) {
    const found = Day.isFound('navi');
    const w = 58, h = 38;
    ctx.fillStyle = '#0f172a'; rr(x - 3, y - 3, w + 6, h + 6, 6); ctx.fill();
    ctx.save(); rr(x, y, w, h, 4); ctx.clip();
    ctx.fillStyle = '#e8f0e6'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x + w, y + 12); ctx.moveTo(x, y + 28); ctx.lineTo(x + w, y + 28); ctx.moveTo(x + 18, y); ctx.lineTo(x + 18, y + h); ctx.moveTo(x + 42, y); ctx.lineTo(x + 42, y + h); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.fillRect(x + 20, y + 10, 20, 4);
    if (found) {
      const route = [[x + 4, y + 28], [x + 18, y + 28], [x + 18, y + 12], [x + 42, y + 12], [x + 42, y + 34]];
      const age = Day.foundAge('navi');
      const cyc = RM ? 1 : ((age * 0.45) % 1.4) / 1.0;
      const prog = clamp(cyc, 0, 1);
      const segL = []; let total = 0;
      for (let i = 1; i < route.length; i++) { const l = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]); segL.push(l); total += l; }
      let left = total * prog;
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(route[0][0], route[0][1]);
      let dot = { x: route[0][0], y: route[0][1] };
      for (let i = 1; i < route.length && left > 0; i++) {
        const f = Math.min(1, left / segL[i - 1]);
        dot = { x: route[i - 1][0] + (route[i][0] - route[i - 1][0]) * f, y: route[i - 1][1] + (route[i][1] - route[i - 1][1]) * f };
        ctx.lineTo(dot.x, dot.y); left -= segL[i - 1];
      }
      ctx.stroke();
      ellipse(dot.x, dot.y, 4, 4, '#1d4ed8'); ellipse(dot.x, dot.y, 2, 2, '#fff');
    }
    ctx.restore();
  }
  function drawBike(x, y) {
    ctx.save();
    contact(x, y + 26, 54, 6, 0.18);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x - 34, y, 24, 0, TAU); ctx.arc(x + 34, y, 24, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 34, y); ctx.lineTo(x - 6, y - 30); ctx.lineTo(x + 22, y - 30); ctx.lineTo(x + 34, y); ctx.moveTo(x - 6, y - 30); ctx.lineTo(x + 2, y); ctx.lineTo(x - 34, y); ctx.moveTo(x + 2, y); ctx.lineTo(x + 22, y - 30); ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 22, y - 30); ctx.lineTo(x + 18, y - 44); ctx.lineTo(x + 30, y - 46); ctx.moveTo(x - 8, y - 32); ctx.lineTo(x - 10, y - 40); ctx.stroke();
    ctx.fillStyle = '#1f2937'; rr(x - 20, y - 46, 22, 7, 3); ctx.fill();
    ctx.restore();
  }
  function drawSchool(t) {
    wallWithWindow(0, 0, CW, 376, lingrad(0, 0, 0, 376, ['#ecf6f0', '#d6e8de']), [70, 56, 230, 190]);
    windowFrame(70, 56, 230, 190, '#f8fafc');
    floor(372, '#e6cfa9', '#d2b48a', 26);
    ctx.fillStyle = '#c7d9cf'; ctx.fillRect(-40, 366, CW + 80, 8);
    // 칠판 (함정)
    withScale('chalk', 528, 128, () => {
      softShadow(352, 52, 352, 172, 6, 0, 0.6);
      ctx.fillStyle = '#a0764d'; rr(352, 52, 352, 172, 6); ctx.fill();
      ctx.fillStyle = lingrad(0, 60, 0, 216, ['#2f6656', '#24503f']); ctx.fillRect(362, 62, 332, 152);
      T('미래 기술 조사', 400, 104, 22, { c: 'rgba(255,255,255,.88)', jua: true });
      T('3교시 · 과학', 400, 134, 16, { c: 'rgba(255,255,255,.6)', w: 700 });
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(400, 150); ctx.quadraticCurveTo(480, 140, 560, 156); ctx.stroke();
      ctx.fillStyle = '#8b6440'; ctx.fillRect(352, 224, 352, 8);
      ctx.fillStyle = '#fff'; ctx.fillRect(420, 219, 16, 5); ctx.fillStyle = '#fde68a'; ctx.fillRect(446, 219, 12, 5);
      ctx.fillStyle = '#475569'; rr(600, 216, 34, 9, 3); ctx.fill();
    });
    // 친구 (VR 헤드셋) + 책상
    const vrFound = Day.isFound('vrset');
    kid(578, 386, 1.08, { shirt: '#60a5fa', style: 'short', hair: '#1f2937', vr: true, hand: [10, 36], handR: [-8, 36] });
    drawDesk(470, 330);
    if (vrFound) drawLavaBubble(648, 172, t);
    // 민지 + 책상 + 태블릿(번역 앱)
    kid(208, 388, 1.08, { shirt: '#f472b6', hand: [14, 32], handR: [30, 34] });
    drawDesk(110, 330);
    withScale('translate', 268, 286, () => drawTablet(256, 300, t));
  }
  function drawDesk(x, y) {
    contact(x + 106, y + 46, 110, 8, 0.18);
    ctx.fillStyle = '#9aa5b6'; ctx.fillRect(x + 14, y + 12, 6, 34); ctx.fillRect(x + 192, y + 12, 6, 34);
    ctx.fillStyle = lingrad(0, y, 0, y + 16, ['#e9c896', '#c99d62']); rr(x, y, 212, 16, 4); ctx.fill();
  }
  function drawTablet(x, y, t) {
    const found = Day.isFound('translate');
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(-26, 30); ctx.lineTo(-22, -10); ctx.lineTo(30, -10); ctx.lineTo(28, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = found ? '#e0f2fe' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(-21, 26); ctx.lineTo(-18, -6); ctx.lineTo(26, -6); ctx.lineTo(24, 26); ctx.closePath(); ctx.fill();
    T('🌐', 3, 16, 16, { a: 'center' });
    ctx.restore();
    // 말풍선: Hello! ↔ 안녕!
    const cyc = RM ? 0.5 : (found ? (Day.foundAge('translate') / 2.4) % 1 : 0);
    const flip = found ? Math.cos(Math.PI * clamp((cyc - 0.4) / 0.2, 0, 1)) : 1;
    const korean = found && cyc > 0.5;
    ctx.save(); ctx.translate(x + 6, y - 52); ctx.scale(Math.max(0.04, Math.abs(flip)), 1);
    bubble(-46, -20, 92, 38, 0, 30, { r: 14, fill: korean ? '#dcfce7' : '#fff', stroke: korean ? '#22c55e' : '#94a3b8' });
    T(korean ? '안녕!' : 'Hello!', 0, 6, 18, { a: 'center', jua: true, c: korean ? '#15803d' : '#334155' });
    ctx.restore();
  }
  function drawLavaBubble(x, y, t) {
    ellipse(x - 52, y + 62, 6, 6, 'rgba(255,255,255,.92)'); ellipse(x - 40, y + 46, 9, 9, 'rgba(255,255,255,.92)');
    bubble(x - 30, y - 50, 124, 84, null, null, { r: 30, fill: 'rgba(255,255,255,.96)' });
    ctx.save(); rr(x - 24, y - 44, 112, 72, 26); ctx.clip();
    ctx.fillStyle = lingrad(0, y - 44, 0, y + 28, ['#fecaca', '#fde68a']); ctx.fillRect(x - 24, y - 44, 112, 72);
    ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(x - 24, y + 28); ctx.lineTo(x + 12, y - 16); ctx.lineTo(x + 40, y - 16); ctx.lineTo(x + 88, y + 28); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.7 + i * 0.21) % 1;
      const bx = x + 26 + Math.sin(i * 2.3 + t * 2) * 8;
      ellipse(bx, y - 16 - ph * 34, 5 + 3 * Math.sin(t * 3 + i), 5 + 2 * Math.cos(t * 4 + i), rgba('#f97316', 1 - ph));
    }
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(x + 14, y - 14); ctx.quadraticCurveTo(x + 22 + Math.sin(t * 3) * 3, y + 4, x + 8, y + 28); ctx.lineTo(x + 18, y + 28); ctx.quadraticCurveTo(x + 34, y + 4, x + 38, y - 14); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawEvening(t) {
    wallWithWindow(0, 0, CW, 372, lingrad(0, 0, 0, 372, ['#f4e6d4', '#e3cbb0']), [472, 52, 236, 186]);
    windowFrame(472, 52, 236, 186, '#fdfaf5');
    ctx.fillStyle = 'rgba(120,90,160,.5)'; ctx.fillRect(452, 44, 22, 220); ctx.fillRect(706, 44, 22, 220);
    D.glow(760, 160, 120, '#ffd27a', 0.35);
    floor(368, '#bf9468', '#a17451', 24);
    ctx.fillStyle = '#d6bf9f'; ctx.fillRect(-40, 362, CW + 80, 8);
    ellipse(440, 426, 220, 30, 'rgba(201,167,216,.5)');
    // TV + 거치대
    contact(216, 352, 130, 9, 0.22);
    ctx.fillStyle = lingrad(0, 300, 0, 352, ['#8b6a4a', '#6b4f35']); rr(96, 300, 240, 52, 6); ctx.fill();
    withScale('recommend', 216, 214, () => drawTV(110, 150, t));
    // 소파 + 민지 + 책
    contact(560, 372, 150, 10, 0.25);
    ctx.fillStyle = lingrad(0, 270, 0, 368, ['#7b9bd0', '#55759f']); rr(430, 272, 262, 56, 18); ctx.fill();
    kid(530, 356, 1.02, { shirt: '#a78bfa', sit: 'sofa', hand: [16, 30], handR: [10, 34] });
    ctx.fillStyle = lingrad(0, 318, 0, 370, ['#6f8fc4', '#4d6b94']); rr(420, 318, 282, 50, 16); ctx.fill();
    ctx.fillStyle = '#5a78a6'; rr(412, 290, 30, 78, 12); ctx.fill(); rr(682, 290, 30, 78, 12); ctx.fill();
    withScale('book', 648, 296, () => {
      ctx.save(); ctx.translate(648, 304); ctx.rotate(-0.12);
      ctx.fillStyle = '#b45309'; rr(-24, -12, 48, 24, 3); ctx.fill();
      ctx.fillStyle = '#fefce8'; ctx.beginPath(); ctx.moveTo(-22, -14); ctx.quadraticCurveTo(-11, -18, 0, -13); ctx.lineTo(0, 10); ctx.quadraticCurveTo(-11, 6, -22, 9); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(22, -14); ctx.quadraticCurveTo(11, -18, 0, -13); ctx.lineTo(0, 10); ctx.quadraticCurveTo(11, 6, 22, 9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(100,90,60,.45)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-18, -8 + i * 5); ctx.lineTo(-4, -8 + i * 5); ctx.moveTo(4, -8 + i * 5); ctx.lineTo(18, -8 + i * 5); ctx.stroke(); }
      ctx.restore();
    });
    // 로봇 청소기
    const v = Day.vacPos(t);
    CUTS[3].spots[0].x = v.x; CUTS[3].spots[0].y = v.y;
    withScale('vacuum', v.x, v.y, () => drawVacuum(v.x, v.y, t));
  }
  function drawTV(x, y, t) {
    const found = Day.isFound('recommend');
    softShadow(x, y, 212, 132, 8, 0, 0.8);
    ctx.fillStyle = '#111827'; rr(x, y, 212, 132, 8); ctx.fill();
    ctx.save(); rr(x + 8, y + 8, 196, 116, 4); ctx.clip();
    ctx.fillStyle = lingrad(0, y, 0, y + 124, ['#1e3a8a', '#0f172a']); ctx.fillRect(x + 8, y + 8, 196, 116);
    T('추천 영상', x + 18, y + 30, 14, { c: '#e0e7ff', w: 800 });
    const cols = ['#f97316', '#22c55e', '#e11d48', '#06b6d4', '#a855f7'];
    const age = found ? Day.foundAge('recommend') : 0;
    const shift = found && !RM ? ((age * 0.7) % cols.length) : 0;
    const fi = Math.floor(shift), ff = EZ.inOutCubic(clamp((shift - fi) * 2.2, 0, 1));
    for (let i = -1; i < 4; i++) {
      const ci = ((i + fi) % cols.length + cols.length) % cols.length;
      const tx = x + 16 + (i - ff) * 64;
      ctx.fillStyle = cols[ci]; rr(tx, y + 44, 58, 40, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(tx + 24, y + 56); ctx.lineTo(tx + 36, y + 64); ctx.lineTo(tx + 24, y + 72); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(tx, y + 90, 50, 5); ctx.fillRect(tx, y + 100, 34, 5);
    }
    ctx.restore();
    ctx.fillStyle = '#374151'; ctx.fillRect(x + 96, y + 132, 20, 18);
  }
  function drawVacuum(x, y, t) {
    const found = Day.isFound('vacuum');
    contact(x, y + 8, 38, 9, 0.3);
    ctx.fillStyle = lingrad(0, y - 12, 0, y + 10, ['#f1f5f9', '#94a3b8']);
    ctx.beginPath(); ctx.ellipse(x, y, 32, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(x, y - 4, 26, 8, 0, 0, TAU); ctx.fill();
    ellipse(x, y - 6, 8, 3, found ? '#22c55e' : '#64748b');
    if (found && !RM) {
      const a = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.strokeStyle = 'rgba(56,189,248,' + (0.3 + a * 0.4).toFixed(2) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, 40 + a * 6, 15 + a * 2, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }
  }

  /* ---------- STEP 1 장면 그리기 ---------- */
  function drawCutFrame(ci, sx, t) {
    const f = Day.frame();
    ctx.save();
    ctx.beginPath(); ctx.rect(f.x + sx, f.y, f.w, f.h); ctx.clip();
    const K = [0.3, 0.6, 1];
    for (let L = 0; L < 3; L++) {
      ctx.save();
      ctx.translate(f.x + f.ox + sx * K[L], f.y);
      ctx.scale(f.s, f.s);
      drawCutLayer(ci, L, t);
      ctx.restore();
    }
    // 찾은 물건 표시 + 힌트 반짝임 (캔버스 좌표)
    const cut = CUTS[ci];
    const idle = now() - S.day.lastTap > 6 || now() - S.hintAt < 3;
    cut.spots.forEach((s) => {
      if (s.trap) return;
      const c = Day.toCanvas(s.x, s.y);
      c.x += sx;
      if (Day.isFound(s.id)) {
        const age = Day.foundAge(s.id);
        const p = clamp(age / 0.5, 0, 1);
        D.check(c.x + s.r * f.s * 0.7, c.y - s.r * f.s * 0.7, 11, p);
      } else if (idle && game && has('day')) {
        const a = 0.35 + 0.35 * Math.sin(t * 3 + s.x);
        ctx.save(); ctx.globalAlpha = now() - S.hintAt < 3 ? 0.95 : a;
        D.spark(c.x - s.r * f.s * 0.5, c.y - s.r * f.s * 0.6, 7, t + s.y, '#fff3a8');
        ctx.restore();
      }
    });
    // 장면 이름표
    const lx = f.x + sx + 12, ly = f.y + 12;
    ctx.save();
    ctx.globalAlpha = 0.95;
    D.label(lx, ly + 14, cut.icon + ' ' + cut.name + ' · ' + cut.place, { bg: 'rgba(27,35,51,.78)', size: 15, align: 'left' });
    ctx.restore();
    // 4컷 점 표시
    const dx0 = f.x + sx + f.w / 2 - 33;
    for (let i = 0; i < 4; i++) ellipse(dx0 + i * 22, f.y + f.h - 14, i === ci ? 6 : 4.5, i === ci ? 6 : 4.5, i === ci ? '#ffffff' : 'rgba(255,255,255,.55)');
    ctx.restore();
  }
  function drawDayPopup(t) {
    const pp = S.day.popup;
    if (!pp || S.day.p < 1) return;
    const age = now() - pp.t0;
    const a = clamp(age / 0.16, 0, 1) * clamp((3.6 - age) / 0.35, 0, 1);
    if (a <= 0) return;
    const s = pp.spot;
    const f = Day.frame();
    const c = Day.toCanvas(pp.bx, pp.by);
    const w = Math.min(296, f.w - 24);
    const tw = w - 24;
    const body = s.trap ? TRAP_TEXT : s.text;
    const bh = para(body, 0, 0, tw, 14, { measure: true, lh: 19 });
    const h = 44 + bh + 10;
    const rad = s.r * f.s;
    let y = c.y - rad - h - 14;
    let below = false;
    if (y < f.y + 6) { y = c.y + rad + 14; below = true; }
    if (y + h > f.y + f.h - 4) y = f.y + f.h - h - 4;
    let x = clamp(c.x - w / 2, f.x + 8, f.x + f.w - w - 8);
    const pop = EZ.outBack(clamp(age / 0.3, 0, 1));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(c.x, below ? y : y + h); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop); ctx.translate(-c.x, below ? -y : -(y + h));
    const tech = s.trap ? null : TECH[s.tech];
    bubble(x, y, w, h, c.x, below ? c.y + rad * 0.5 : c.y - rad * 0.5, { r: 14, fill: s.trap ? '#f1f5f9' : '#ffffff', stroke: s.trap ? '#cbd5e1' : rgba(tech.color, 0.55) });
    emo(s.icon, x + 24, y + 22, 22);
    T(s.name, x + 42, y + 28, 16, { w: 800, c: s.trap ? '#475569' : '#1b2333' });
    if (tech) {
      ctx.font = fnt(16, 800); const nw = ctx.measureText(s.name).width;
      D.label(x + 52 + nw, y + 22, tech.name, { bg: tech.color, size: 13, align: 'left' });
    }
    para(body, x + 12, y + 56, tw, 14, { lh: 19, c: s.trap ? '#475569' : '#2b3445', w: 600 });
    ctx.restore();
  }
  function drawShelf(t) {
    const d = S.day;
    const n = Math.min(6, d.found.length);
    if (LAY.kind === 'wide') {
      // 아래 선반: 찾은 기술이 카드로 모인다 (2줄 × 4칸)
      ctx.fillStyle = lingrad(0, 468, 0, 600, ['#ffffff', '#eef2f8']); ctx.fillRect(0, 468, 800, 132);
      ctx.fillStyle = '#dde4ef'; ctx.fillRect(0, 468, 800, 1.5);
      T('🔎 찾은 첨단 기술', 14, 489, 15, { w: 800, c: '#334155' });
      T(n + ' / 6', 150, 489, 15, { w: 800, c: n >= 6 ? '#14a058' : '#64748b' });
      if (n < 6) T('6곳 이상 찾아 보세요', 800 - 14, 489, 13.5, { w: 700, c: '#94a3b8', a: 'right' });
      else T('✔ 목표 달성!', 800 - 14, 489, 13.5, { w: 800, c: '#14a058', a: 'right' });
      for (let i = 0; i < 8; i++) {
        const sx = 12 + (i % 4) * 197, sy = 496 + Math.floor(i / 4) * 52;
        const id = d.found[i];
        const flying = id && d.fly.some((fl) => fl.spot.id === id);
        if (id && !flying) {
          const s = Day.spot(id), tech = TECH[s.tech];
          const age = Day.foundAge(id) - 0.5;
          const pop = age < 0 ? 0 : EZ.outBack(clamp(age / 0.35, 0, 1));
          ctx.save(); ctx.translate(sx + 94, sy + 23); ctx.scale(pop, pop); ctx.translate(-(sx + 94), -(sy + 23));
          softShadow(sx, sy, 188, 46, 12, 0, 0.7);
          ctx.fillStyle = '#fff'; rr(sx, sy, 188, 46, 12); ctx.fill();
          ctx.fillStyle = tech.color; rr(sx, sy, 5, 46, 2.5); ctx.fill();
          ctx.fillStyle = rgba(tech.color, 0.14); ctx.beginPath(); ctx.arc(sx + 25, sy + 23, 17, 0, TAU); ctx.fill();
          emo(s.icon, sx + 25, sy + 23, 21);
          T(s.name, sx + 50, sy + 20, 14.5, { w: 800 });
          T(tech.name, sx + 50, sy + 37, 13, { w: 800, c: tech.color });
          ctx.restore();
        } else {
          ctx.setLineDash([5, 5]); ctx.strokeStyle = i < 6 ? '#c3ccd9' : '#e2e8f1'; ctx.lineWidth = 2;
          rr(sx, sy, 188, 46, 12); ctx.stroke(); ctx.setLineDash([]);
          T('?', sx + 94, sy + 31, 22, { a: 'center', c: i < 6 ? '#cbd5e1' : '#e8edf4', jua: true });
        }
      }
      if (isNew('day')) newBadge(4, 472, 792, 124, t);
    } else {
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 351, 480, 469);
      ctx.fillStyle = '#dde4ef'; ctx.fillRect(0, 351, 480, 1);
      T('🔎 찾은 첨단 기술  ' + n + ' / 6', 14, 368, 15, { w: 800, c: n >= 6 ? '#14a058' : '#334155', b: 'middle' });
      for (let i = 0; i < 8; i++) {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 12 + col * 234, y = 384 + row * 108;
        const id = d.found[i];
        const flying = id && d.fly.some((fl) => fl.spot.id === id);
        if (id && !flying) {
          const s = Day.spot(id), tech = TECH[s.tech];
          softShadow(x, y, 222, 98, 12, 0, 0.8);
          ctx.fillStyle = '#fff'; rr(x, y, 222, 98, 12); ctx.fill();
          ctx.fillStyle = tech.color; rr(x, y, 6, 98, 3); ctx.fill();
          emo(s.icon, x + 30, y + 30, 26);
          T(s.name, x + 52, y + 26, 15, { w: 800 });
          D.label(x + 52, y + 44, tech.name, { bg: tech.color, size: 13, align: 'left' });
          para(s.text, x + 14, y + 74, 196, 13, { lh: 17, max: 2, c: '#475569' });
        } else {
          ctx.setLineDash([5, 5]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
          rr(x, y, 222, 98, 12); ctx.stroke(); ctx.setLineDash([]);
          T('?', x + 111, y + 58, 26, { a: 'center', c: '#cbd5e1', jua: true });
        }
      }
    }
    // 날아가는 이름표 칩
    d.fly.forEach((fl) => {
      const p = clamp((now() - fl.t0) / 0.5, 0, 1), e = EZ.inOutCubic(p);
      const cx = (fl.x0 + fl.x1) / 2, cy = Math.min(fl.y0, fl.y1) - 90;
      const x = (1 - e) * (1 - e) * fl.x0 + 2 * (1 - e) * e * cx + e * e * fl.x1;
      const y = (1 - e) * (1 - e) * fl.y0 + 2 * (1 - e) * e * cy + e * e * fl.y1;
      const tech = TECH[fl.spot.tech];
      const sc = 1 - 0.3 * e;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      D.label(0, 0, fl.spot.icon + ' ' + tech.name, { bg: tech.color, size: 15 });
      ctx.restore();
    });
  }
  function drawDay(t) {
    const d = S.day;
    if (LAY.kind === 'wide') { ctx.fillStyle = BG; ctx.fillRect(0, 0, 800, 600); }
    const f = Day.frame();
    if (d.p < 1) {
      const e = d.p;
      drawCutFrame(d.from, -d.dir * e * f.w, t);
      drawCutFrame(d.idx, d.dir * (1 - e) * f.w, t);
    } else drawCutFrame(d.idx, 0, t);
    drawDayPopup(t);
    drawShelf(t);
  }

  /* =========================================================
     STEP 2 · 활용 사례 조사 보드
     ========================================================= */
  const Board = {
    cards: {},     // techId → rect
    toks: [], lastPinAt: 0,
    geo() {
      if (LAY.kind === 'wide') return { cw: 248, ch: 114, cols: 3, x0: 14, y0: 12, gx: 13, gy: 10, trayY: 270, aw: 248, ah: 140, ay0: 300, agy: 10 };
      return { cw: 222, ch: 96, cols: 2, x0: 12, y0: 8, gx: 12, gy: 8, trayY: 318, aw: 222, ah: 152, ay0: 344, agy: 8 };
    },
    layout(reset) {
      const g = this.geo();
      TECH_IDS.forEach((id, i) => {
        const c = i % g.cols, r = Math.floor(i / g.cols);
        this.cards[id] = { x: g.x0 + c * (g.cw + g.gx), y: g.y0 + r * (g.ch + g.gy), w: g.cw, h: g.ch };
      });
      if (!this.toks.length) ARTICLES.forEach((a) => this.toks.push(Tok({ id: a.id, a, placed: null, pinAt: -99, idle: true })));
      ART_ORDER.forEach((id, i) => {
        const k = this.toks.find((x) => x.id === id);
        const c = i % g.cols, r = Math.floor(i / g.cols);
        k.w = g.aw; k.h = g.ah;
        k.hx = g.x0 + c * (g.aw + g.gx) + g.aw / 2;
        k.hy = g.ay0 + r * (g.ah + g.agy) + g.ah / 2;
        k.hrot = ((i * 37) % 5 - 2) * 0.012;
        k.hsc = 1;
        if (k.placed) { const p = this.pinPos(k.placed); k.x = p.x; k.y = p.y; k.sc = p.sc; k.rot = p.rot; }
        else if (reset || !k.drag) { k.x = k.hx; k.y = k.hy; k.sc = 1; k.rot = k.hrot; }
      });
    },
    pinPos(tech) {
      const r = this.cards[tech];
      return { x: r.x + 37, y: r.y + r.h - 25, sc: 0.2, rot: -0.07 };
    },
    reset() {
      this.toks.forEach((k) => { k.placed = null; k.pinAt = -99; k.drag = false; k.alpha = 1; });
      S.board.popup = null;
      this.layout(true);
    },
    count() { return this.toks.filter((k) => k.placed).length; },
    cardAt(p) { for (const id of TECH_IDS) { const r = this.cards[id]; if (p.x >= r.x - 8 && p.x <= r.x + r.w + 8 && p.y >= r.y - 8 && p.y <= r.y + r.h + 8) return id; } return null; },
    down(p) {
      if (S.board.popup) { S.board.popup = null; Sound.click(); return true; }
      for (let i = this.toks.length - 1; i >= 0; i--) {
        const k = this.toks[i];
        if (!k.placed && !k.busy && tokHit(k, p)) {
          this.toks.splice(i, 1); this.toks.push(k);
          tokGrab(k, p);
          drag = { kind: 'article', tok: k, sx: p.x, sy: p.y };
          return true;
        }
      }
      const id = this.cardAt(p);
      if (id) { drag = { kind: 'tapcard', id, sx: p.x, sy: p.y }; return true; }
      return false;
    },
    dropCard(k, p) { return this.cardAt(p) || this.cardAt({ x: k.tx, y: k.ty }); },   // 손가락 위치 우선 (카드는 손가락을 따라 늦게 움직이므로)
    move(p) { if (drag.kind === 'article') { tokFollow(drag.tok, p); drag.over = this.dropCard(drag.tok, p); } },
    up(p) {
      if (drag.kind === 'tapcard') {
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) < 12) {
          const att = this.toks.find((k) => k.placed === drag.id);
          S.board.popup = { tech: drag.id, art: att ? att.a : null, t0: now() };
          Sound.click();
        }
        return;
      }
      const k = drag.tok;
      const target = this.dropCard(k, p);
      if (!target) { k.drag = false; tokHome(k); return; }
      if (target !== k.a.tech) {
        tokReject(k, k.a.fb);
        return;
      }
      if (this.toks.some((o) => o.placed === target)) { tokHome(k); return; }
      k.placed = target;
      k.drag = false;
      k.busy = true;
      const pp = this.pinPos(target);
      SciSim.tween(k, { x: pp.x, y: pp.y, sc: pp.sc, rot: pp.rot }, { duration: 0.32, ease: 'outBack', onDone: () => { k.busy = false; } });
      k.pinAt = now() + 0.25;
      this.lastPinAt = now();
      const r = this.cards[target];
      successFx(r.x + r.w / 2, r.y + r.h / 2);
    },
    hover(p) {
      if (S.board.popup) return 'pointer';
      if (this.toks.some((k) => !k.placed && tokHit(k, p))) return 'grab';
      return this.cardAt(p) ? 'pointer' : null;
    },
    update(dt) { this.toks.forEach((k) => tokUpdate(k, dt)); },
    draw(t) {
      const g = this.geo();
      const bg = layer('board', LAY.w, LAY.h, () => {
        ctx.fillStyle = lingrad(0, 0, 0, g.trayY, ['#dcc39b', '#cfb084']); ctx.fillRect(0, 0, LAY.w, g.trayY);
        const rnd = seeded(5);
        for (let i = 0; i < 900; i++) { ctx.fillStyle = rnd() > 0.5 ? 'rgba(120,80,30,.13)' : 'rgba(255,255,255,.16)'; ctx.fillRect(rnd() * LAY.w, rnd() * g.trayY, 2, 2); }
        ctx.fillStyle = lingrad(0, g.trayY, 0, LAY.h, ['#eef2f7', '#e2e8f1']); ctx.fillRect(0, g.trayY, LAY.w, LAY.h - g.trayY);
        ctx.fillStyle = 'rgba(20,40,80,.12)'; ctx.fillRect(0, g.trayY, LAY.w, 3);
      });
      ctx.drawImage(bg, 0, 0, LAY.w, LAY.h);
      T('📰 사례 기사 보관함 · 기사를 끌어 알맞은 기술 카드에 놓아요', 14, g.trayY + 14, 13.5, { w: 800, c: '#64748b', b: 'middle' });
      if (this.count() >= 6) {
        const a = clamp((now() - this.lastPinAt - 0.5) / 0.4, 0, 1);
        ctx.save(); ctx.globalAlpha = a;
        T('✅ 사례 6개를 모두 조사했어요!', LAY.w / 2, (g.trayY + LAY.h) / 2 - 4, 22, { a: 'center', jua: true, c: '#15803d' });
        T('기술 카드를 누르면 연결한 기사를 다시 읽을 수 있어요', LAY.w / 2, (g.trayY + LAY.h) / 2 + 24, 14, { a: 'center', w: 700, c: '#64748b' });
        ctx.restore();
      }
      TECH_IDS.forEach((id) => this.drawCard(id, t));
      if (isNew('cards')) newBadge(6, 4, LAY.w - 12, g.trayY - 10, t);
      // 붙은 기사 (작게) → 그 위에 핀 → 리본
      this.toks.filter((k) => k.placed && !k.busy).forEach((k) => this.drawPinned(k, t));
      this.toks.filter((k) => !(k.placed && !k.busy)).forEach((k) => tokDraw(k, (x, y, w, h, kk) => { softShadow(x, y, w, h, 6, kk.lift); drawArticleBody(kk.a, x, y, w, h); }));
      if (S.board.popup) this.drawPopup(t);
    },
    drawCard(id, t) {
      const c = TECH[id], r = this.cards[id];
      const hov = drag && drag.kind === 'article' && drag.over === id;
      softShadow(r.x, r.y, r.w, r.h, 14, 0, 0.9);
      ctx.fillStyle = '#ffffff'; rr(r.x, r.y, r.w, r.h, 14); ctx.fill();
      ctx.save(); rr(r.x, r.y, r.w, r.h, 14); ctx.clip();
      ctx.fillStyle = rgba(c.color, 0.09); ctx.fillRect(r.x, r.y, r.w, 30);
      ctx.fillStyle = c.color; ctx.fillRect(r.x, r.y, r.w, 4);
      ctx.restore();
      D.sphere(r.x + 34, r.y + 38, 22, mix(c.color, '#ffffff', 0.55), { gloss: true });
      emo(c.icon, r.x + 34, r.y + 39, 24);
      T(c.name, r.x + 66, r.y + 30, 19, { jua: true, c: shade(c.color, -0.25) });
      para(c.desc, r.x + 66, r.y + 52, r.w - 76, 13, { lh: 17, max: 3, c: '#475569' });
      const placed = this.toks.find((k) => k.placed === id);
      if (placed && !placed.busy) {
        const k = clamp((now() - placed.pinAt) / 0.4, 0, 1);
        const p = EZ.outBack(k);
        if (k > 0) {
          ctx.save(); rr(r.x, r.y, r.w, r.h, 14); ctx.clip();
          ctx.translate(r.x + r.w - 17, r.y + 17); ctx.rotate(Math.PI / 4);
          const sc = RM ? 1 : 1 + 1.1 * (1 - p); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 2, 0, 1);
          ctx.fillStyle = '#14a058'; ctx.fillRect(-34, -9, 68, 18);
          T('조사 완료', 0, 4.5, 11.5, { c: '#fff', a: 'center', w: 800 });
          ctx.restore();
        }
      }
      if (hov) breathe(r.x, r.y, r.w, r.h, 14, t);
    },
    drawPinned(k, t) {
      tokDraw(k, (x, y, w, h, kk) => { drawArticleBody(kk.a, x, y, w, h); });
      const age = now() - k.pinAt;
      if (age < 0) return;
      const drop = RM ? 0 : (1 - EZ.outBounce(clamp(age / 0.45, 0, 1))) * 30;
      const px = k.x - 4, py = k.y - k.h * k.sc / 2 + 2 - drop;
      contact(px + 2, py + 6, 6, 3, 0.35);
      D.sphere(px, py, 6.5, '#ef4444', { gloss: true });
    },
    drawPopup(t) {
      const pp = S.board.popup;
      const age = now() - pp.t0;
      const a = clamp(age / 0.18, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.45; ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, LAY.w, LAY.h);
      ctx.globalAlpha = a;
      const w = Math.min(420, LAY.w - 40), x = (LAY.w - w) / 2;
      const c = TECH[pp.tech];
      const body = pp.art ? pp.art.text : '아직 연결한 사례 기사가 없어요. 아래 보관함에서 기사를 끌어 와 보세요.';
      const bh = para(body, 0, 0, w - 40, 16, { measure: true, lh: 23 });
      const h = 96 + bh;
      const y = (LAY.h - h) / 2;
      const s = 0.9 + 0.1 * EZ.outBack(clamp(age / 0.3, 0, 1));
      ctx.translate(LAY.w / 2, LAY.h / 2); ctx.scale(s, s); ctx.translate(-LAY.w / 2, -LAY.h / 2);
      softShadow(x, y, w, h, 10, 1);
      ctx.fillStyle = pp.art ? '#fbf8f1' : '#ffffff'; rr(x, y, w, h, 10); ctx.fill();
      ctx.fillStyle = c.color; rr(x, y, w, 8, 4); ctx.fill();
      emo(c.icon, x + 30, y + 38, 26);
      T(c.name + (pp.art ? ' · 사례 기사' : ''), x + 52, y + 45, 20, { jua: true, c: shade(c.color, -0.25) });
      if (pp.art) T(pp.art.field, x + w - 20, y + 44, 14, { a: 'right', w: 800, c: '#64748b' });
      ctx.fillStyle = '#1f2937'; ctx.fillRect(x + 20, y + 60, w - 40, 2);
      para(body, x + 20, y + 88, w - 40, 16, { lh: 23, c: '#1f2937', w: 600 });
      T('화면을 누르면 닫혀요', x + w / 2, y + h + 24, 13, { a: 'center', c: '#e2e8f0', w: 700 });
      ctx.restore();
    },
  };
  function drawArticleBody(a, x, y, w, h) {
    ctx.fillStyle = '#fbf8f1';
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - 5);
    const n = Math.max(6, Math.round(w / 12));
    for (let i = n; i >= 0; i--) ctx.lineTo(x + (w * i) / n, y + h - (i % 2 ? 0 : 7));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,100,60,.25)'; ctx.lineWidth = 1; ctx.stroke();
    T('📰 ' + a.field, x + 12, y + 22, 14, { w: 800, c: '#374151' });
    T('사례 기사', x + w - 12, y + 21, 13, { a: 'right', w: 700, c: '#9ca3af' });
    ctx.fillStyle = '#1f2937'; ctx.fillRect(x + 12, y + 29, w - 24, 2);
    para(a.text, x + 12, y + 47, w - 24, 13, { lh: 16.5, c: '#1f2937', w: 600, max: 6 });
  }

  /* =========================================================
     STEP 3 · 미래 도시 2045 (등각 투영 섬)
     ========================================================= */
  const City = {
    chips: [], cards: [],
    geo() {
      if (LAY.kind === 'wide') return {
        cx: 400, cy: 238, hw: 214, hh: 107, th: 48,
        call: { traffic: [8, 10, 232, 172], hospital: [560, 10, 232, 172], farm: [8, 286, 232, 172], home: [560, 286, 232, 172] },
        shelfY: 476, chipW: 122, chipH: 52, cardW: 190, cardH: 78,
      };
      return {
        cx: 240, cy: 150, hw: 158, hh: 79, th: 34,
        call: { traffic: [8, 270, 228, 178], hospital: [244, 270, 228, 178], farm: [8, 456, 228, 178], home: [244, 456, 228, 178] },
        shelfY: 646, chipW: 146, chipH: 50, cardW: 228, cardH: 62,
      };
    },
    iso(u, v, z) {
      const g = this.geo();
      const fy = RM ? 0 : Math.sin(now() * 0.9) * 2;
      return { x: g.cx + (u - v) * g.hw / 2, y: g.cy - g.hh + (u + v) * g.hh / 2 - (z || 0) + fy };
    },
    zoneAt(p) {
      const g = this.geo();
      const fy = RM ? 0 : Math.sin(now() * 0.9) * 2;
      const dx = p.x - g.cx, dy = p.y - (g.cy - g.hh + fy);
      const u = dx / g.hw + dy / g.hh, v = dy / g.hh - dx / g.hw;
      if (u >= 0 && u <= 2 && v >= 0 && v <= 2) {
        const qu = u < 1 ? 0 : 1, qv = v < 1 ? 0 : 1;
        const z = ZONES.find((zz) => zz.q[0] === qu && zz.q[1] === qv);
        return z ? z.id : null;
      }
      for (const z of ZONES) { const r = g.call[z.id]; if (p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3]) return z.id; }
      return null;
    },
    zoneCenter(id) { const q = ZONE[id].q; return this.iso(q[0] + 0.5, q[1] + 0.5, 0); },
    layout(reset) {
      const g = this.geo();
      if (!this.chips.length) TECH_IDS.forEach((id) => this.chips.push(Tok({ id, ghost: false })));
      if (!this.cards.length) CONCERNS.forEach((c) => this.cards.push(Tok({ id: c.id, c, placed: null })));
      const cw = g.chipW, ch = g.chipH;
      const per = LAY.kind === 'wide' ? 6 : 3;
      const totalW = per * cw + (per - 1) * 8;
      TECH_IDS.forEach((id, i) => {
        const k = this.chips.find((x) => x.id === id);
        const c = i % per, r = Math.floor(i / per);
        k.w = cw; k.h = ch;
        k.hx = (LAY.w - totalW) / 2 + c * (cw + 8) + cw / 2;
        k.hy = g.shelfY + 42 + r * (ch + 8) + ch / 2;
        if (!k.drag) { k.x = k.hx; k.y = k.hy; }
      });
      const per2 = LAY.kind === 'wide' ? 4 : 2;
      const tw2 = per2 * g.cardW + (per2 - 1) * 8;
      CONCERNS.forEach((c, i) => {
        const k = this.cards.find((x) => x.id === c.id);
        const cc = i % per2, r = Math.floor(i / per2);
        k.w = g.cardW; k.h = g.cardH;
        k.hx = (LAY.w - tw2) / 2 + cc * (g.cardW + 8) + g.cardW / 2;
        k.hy = g.shelfY + 40 + r * (g.cardH + 8) + g.cardH / 2;
        k.hsc = 1;
        if (!k.placed && (reset || !k.drag)) { k.x = k.hx; k.y = k.hy; k.sc = 1; k.alpha = 1; }
      });
    },
    reset() {
      ZONES.forEach((z) => { Object.assign(S.city.zones[z.id], { tech: null, concern: null, riseAt: -99, popAt: -99, worryAt: -99, bubbleAt: -99 }); });
      this.cards.forEach((k) => { k.placed = null; k.alpha = 1; k.drag = false; });
      this.layout(true);
    },
    techCount() { return ZONES.filter((z) => S.city.zones[z.id].tech).length; },
    worryCount() { return ZONES.filter((z) => S.city.zones[z.id].concern).length; },
    ensureTech() {
      const def = { traffic: 'ai', hospital: 'ai', home: 'iot', farm: 'iot' };
      ZONES.forEach((z) => { const zz = S.city.zones[z.id]; if (!zz.tech) { zz.tech = def[z.id]; zz.riseAt = now() - 5; zz.bubbleAt = now() - 5; } });
    },
    ensureWorry() {
      const def = { traffic: 'blame', hospital: 'divide', home: 'privacy', farm: 'jobs' };
      ZONES.forEach((z) => {
        const zz = S.city.zones[z.id];
        if (!zz.concern) { zz.concern = def[z.id]; zz.worryAt = now() - 5; const k = this.cards.find((c) => c.id === def[z.id]); if (k) { k.placed = z.id; k.alpha = 0; } }
      });
    },
    placeTech(zid, tech, x, y) {
      const zz = S.city.zones[zid];
      const first = !zz.tech;
      zz.tech = tech;
      if (first) zz.riseAt = now();
      zz.popAt = now(); zz.bubbleAt = first ? now() + 0.35 : now();
      const c = this.zoneCenter(zid);
      if (!RM) for (let i = 0; i < 14; i++) PT.emit({ x: c.x + (Math.random() - 0.5) * 120, y: c.y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 0.9, size: 7 + Math.random() * 6, grow: 10, color: 'rgba(214,190,150,.7)', shape: 'smoke' });
      successFx(c.x, c.y);
    },
    placeWorry(zid, k) {
      const zz = S.city.zones[zid];
      if (zz.concern && zz.concern !== k.id) {
        const old = this.cards.find((c) => c.id === zz.concern);
        if (old) { old.placed = null; old.x = this.zoneCenter(zid).x; old.y = this.zoneCenter(zid).y; old.sc = 0.4; old.alpha = 1; tokHome(old); }
      }
      ZONES.forEach((z) => { if (S.city.zones[z.id].concern === k.id) S.city.zones[z.id].concern = null; });
      zz.concern = k.id; zz.worryAt = now();
      k.placed = zid; k.drag = false; k.busy = true;
      const c = this.zoneCenter(zid);
      SciSim.tween(k, { x: c.x, y: c.y - 30, sc: 0.3, alpha: 0 }, { duration: 0.35, ease: 'inOutCubic', onDone: () => { k.busy = false; } });
      successFx(c.x, c.y - 20);
    },
    signPos(zid) { const q = ZONE[zid].q; return this.iso(q[0] + 0.78, q[1] + 0.22, 0); },
    down(p) {
      const mode = S.city.mode;
      if (mode === 'tech') {
        for (const k of this.chips) {
          if (tokHit(k, p)) {
            const gk = Tok({ id: k.id, ghost: true, w: k.w, h: k.h, x: k.x, y: k.y, hx: k.hx, hy: k.hy });
            tokGrab(gk, p);
            drag = { kind: 'chip', tok: gk, src: k };
            return true;
          }
        }
      } else if (mode === 'worry') {
        for (let i = this.cards.length - 1; i >= 0; i--) {
          const k = this.cards[i];
          if (!k.placed && !k.busy && tokHit(k, p)) {
            this.cards.splice(i, 1); this.cards.push(k);
            tokGrab(k, p);
            drag = { kind: 'worry', tok: k };
            return true;
          }
        }
        // 구역에 붙은 경고 표지를 누르면 떼어 냄
        for (const z of ZONES) {
          const zz = S.city.zones[z.id];
          if (!zz.concern) continue;
          const s = this.signPos(z.id);
          if (Math.hypot(p.x - s.x, p.y - (s.y - 26)) < 26) { drag = { kind: 'sign', zid: z.id, sx: p.x, sy: p.y }; return true; }
        }
      }
      if (game && game.free && this.modeHit(p)) { drag = { kind: 'mode', sx: p.x, sy: p.y }; return true; }
      return false;
    },
    move(p) {
      if (drag.tok) { tokFollow(drag.tok, p); drag.over = this.zoneAt(p); }
    },
    up(p) {
      if (drag.kind === 'mode') { const m = this.modeHit(p); if (m) { S.city.mode = m; Sound.click(); } return; }
      if (drag.kind === 'sign') {
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) < 14) {
          const zz = S.city.zones[drag.zid];
          const k = this.cards.find((c) => c.id === zz.concern);
          zz.concern = null;
          if (k) { const s = this.signPos(drag.zid); k.placed = null; k.x = s.x; k.y = s.y - 26; k.sc = 0.4; k.alpha = 1; tokHome(k); }
          Sound.click();
        }
        return;
      }
      const k = drag.tok;
      const zid = this.zoneAt(p);
      if (drag.kind === 'chip') {
        if (!zid) { k.drag = false; SciSim.tween(k, { x: k.hx, y: k.hy, alpha: 0 }, { duration: 0.35, ease: 'inOutCubic' }); this.ghosts.push(k); return; }
        if (!PRED[zid][k.id]) {
          k.drag = false; k.shake = 0.3; Sound.fail();
          showFeedback(NO_ZONE_FB, p.x, p.y - 34, 'bad');
          this.ghosts.push(k);
          setTimeout(() => SciSim.tween(k, { x: k.hx, y: k.hy, alpha: 0 }, { duration: 0.4, ease: 'inOutCubic' }), RM ? 0 : 300);
          return;
        }
        k.drag = false;
        const c = this.zoneCenter(zid);
        this.ghosts.push(k);
        SciSim.tween(k, { x: c.x, y: c.y - 40, sc: 0.4, alpha: 0 }, { duration: 0.3, ease: 'inOutCubic' });
        this.placeTech(zid, k.id);
        return;
      }
      if (drag.kind === 'worry') {
        if (!zid) { tokHome(k); return; }
        if (CONCERN[k.id].zones.indexOf(zid) < 0) { tokReject(k, CONCERN[k.id].fb); return; }
        this.placeWorry(zid, k);
      }
    },
    ghosts: [],
    modeRects() {
      const g = this.geo();
      const y = g.shelfY + 2;
      return { tech: [LAY.w - 236, y - 2, 112, 38], worry: [LAY.w - 118, y - 2, 112, 38] };
    },
    modeHit(p) {
      const R = this.modeRects();
      for (const k in R) { const r = R[k]; if (p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3]) return k; }
      return null;
    },
    hover(p) {
      if (S.city.mode === 'tech' && this.chips.some((k) => tokHit(k, p))) return 'grab';
      if (S.city.mode === 'worry' && this.cards.some((k) => !k.placed && tokHit(k, p))) return 'grab';
      return null;
    },
    update(dt) {
      this.chips.forEach((k) => tokUpdate(k, dt));
      this.cards.forEach((k) => tokUpdate(k, dt));
      if (drag && drag.tok && drag.tok.ghost) tokUpdate(drag.tok, dt);
      this.ghosts.forEach((k) => tokUpdate(k, dt));
      this.ghosts = this.ghosts.filter((k) => k.alpha > 0.02);
    },
    draw(t) {
      const g = this.geo();
      const bg = layer('city', LAY.w, LAY.h, () => {
        ctx.fillStyle = lingrad(0, 0, 0, LAY.h, ['#cfe8ff', '#eaf4ff', '#f6f0ff']); ctx.fillRect(0, 0, LAY.w, LAY.h);
        const rnd = seeded(9);
        for (let i = 0; i < 6; i++) { const x = rnd() * LAY.w, y = 30 + rnd() * (g.shelfY - 120); ctx.globalAlpha = 0.6; cloud(x, y, 0.8 + rnd() * 0.7); ctx.globalAlpha = 1; }
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(0, g.shelfY, LAY.w, LAY.h - g.shelfY);
        ctx.fillStyle = 'rgba(20,40,80,.1)'; ctx.fillRect(0, g.shelfY, LAY.w, 2);
      });
      ctx.drawImage(bg, 0, 0, LAY.w, LAY.h);
      this.drawIsland(t);
      // 말풍선 (예측 + 걱정 + 해결 노력)
      ZONES.forEach((z) => this.drawCallout(z, t));
      if (isNew('city')) { const top = this.iso(0, 0), bot = this.iso(2, 2); newBadge(g.cx - g.hw - 4, top.y - 6, g.hw * 2 + 8, bot.y - top.y + g.th + 12, t); }
      this.drawShelf(t);
    },
    drawIsland(t) {
      const g = this.geo();
      const L = this.iso(0, 2), R = this.iso(2, 0), B = this.iso(2, 2), Tp = this.iso(0, 0);
      contact(B.x, B.y + g.th + 34, g.hw * 0.95, 20, 0.2);
      // 옆면 (흙·바위)
      ctx.fillStyle = lingrad(0, L.y, 0, B.y + g.th, ['#a77b4f', '#7a5534', '#5b3d24']);
      ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x, B.y + g.th); ctx.quadraticCurveTo((L.x + B.x) / 2, (L.y + B.y) / 2 + g.th + 26, L.x, L.y + g.th * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lingrad(0, R.y, 0, B.y + g.th, ['#8f6640', '#644528', '#4a321c']);
      ctx.beginPath(); ctx.moveTo(R.x, R.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x, B.y + g.th); ctx.quadraticCurveTo((R.x + B.x) / 2, (R.y + B.y) / 2 + g.th + 26, R.x, R.y + g.th * 0.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(L.x + 10, L.y + 14); ctx.lineTo(B.x, B.y + 16); ctx.lineTo(R.x - 10, R.y + 14); ctx.stroke();
      // 윗면 잔디
      ctx.fillStyle = lingrad(Tp.x, Tp.y, B.x, B.y, ['#9ad48a', '#78bf6a']);
      ctx.beginPath(); ctx.moveTo(Tp.x, Tp.y); ctx.lineTo(R.x, R.y); ctx.lineTo(B.x, B.y); ctx.lineTo(L.x, L.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5fa653'; ctx.lineWidth = 2; ctx.stroke();
      DRAW_ORDER.forEach((id) => this.drawZone(ZONE[id], t));
      // 구역 경계 길
      ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      const a = this.iso(1, 0), b = this.iso(1, 2), c = this.iso(0, 1), d = this.iso(2, 1);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke(); ctx.setLineDash([]);
      // 구역 이름표 + 기술 배지 + 경고 표지
      DRAW_ORDER.forEach((id) => {
        const z = ZONE[id], zz = S.city.zones[id];
        const q = z.q;
        const lp = this.iso(q[0] + 0.5, q[1] + 0.5, 0);
        const hov = drag && drag.over === id && drag.tok;
        if (hov) {
          ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6);
          const p0 = this.iso(q[0], q[1]), p1 = this.iso(q[0] + 1, q[1]), p2 = this.iso(q[0] + 1, q[1] + 1), p3 = this.iso(q[0], q[1] + 1);
          ctx.fillStyle = '#14a058'; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        const lab = D.label(lp.x, lp.y + 26, z.icon + ' ' + z.name, { bg: 'rgba(27,35,51,.78)', size: 13 });
        if (zz.tech) {
          const pop = EZ.outBack(clamp((now() - zz.popAt) / 0.35, 0, 1));
          const bx = lab.x + lab.w + 14, by = lp.y + 26;
          ctx.save(); ctx.translate(bx, by); ctx.scale(pop, pop);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
          ctx.strokeStyle = TECH[zz.tech].color; ctx.lineWidth = 3; ctx.stroke();
          emo(TECH[zz.tech].icon, 0, 0, 16);
          ctx.restore();
        }
        if (zz.concern) {
          const s = this.signPos(id);
          const age = now() - zz.worryAt;
          const drop = RM ? 0 : (1 - EZ.outBounce(clamp(age / 0.5, 0, 1))) * 24;
          const wob = RM ? 0 : Math.sin(t * 3 + q[0] * 2) * 0.08;
          ctx.save(); ctx.translate(s.x, s.y - drop); ctx.rotate(wob);
          ctx.fillStyle = '#64748b'; ctx.fillRect(-1.5, -14, 3, 14);
          ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(16, -16); ctx.lineTo(-16, -16); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.stroke();
          T('!', 0, -20, 16, { a: 'center', w: 900, c: '#713f12' });
          ctx.restore();
        }
      });
    },
    tile(u, v, du, dv, col, lift, alpha) {
      const p0 = this.iso(u, v, lift), p1 = this.iso(u + du, v, lift), p2 = this.iso(u + du, v + dv, lift), p3 = this.iso(u, v + dv, lift);
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    box(u, v, du, dv, h, top, left, right, lift) {
      lift = lift || 0;
      const z0 = lift, z1 = lift + h;
      const a = this.iso(u, v + dv, z0), b = this.iso(u + du, v + dv, z0), c = this.iso(u + du, v, z0);
      const a1 = this.iso(u, v + dv, z1), b1 = this.iso(u + du, v + dv, z1), c1 = this.iso(u + du, v, z1), d1 = this.iso(u, v, z1);
      ctx.fillStyle = left; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(a1.x, a1.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = right; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(b1.x, b1.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(d1.x, d1.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(a1.x, a1.y); ctx.closePath(); ctx.fill();
      return { top: d1, a1, b1, c1 };
    },
    drawZone(z, t) {
      const zz = S.city.zones[z.id];
      const [u0, v0] = z.q;
      const fut = !!zz.tech;
      const age = now() - zz.riseAt;
      const BASE = { traffic: ['#9aa3af', '#59606e'], hospital: ['#e5e7eb', '#cfe9f5'], home: ['#a6d98f', '#8fd3a0'], farm: ['#c9a46a', '#79c26b'] };
      // 3×3 타일이 차례로 솟아오름
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const n = i + j * 3;
          let lift = 0, al = 1, col = BASE[z.id][0];
          if (fut) {
            const e = RM ? 1 : clamp((age - n * 0.04) / 0.45, 0, 1);
            col = BASE[z.id][1];
            lift = (1 - EZ.outBack(e)) * -18;
            al = clamp(e * 1.6, 0, 1);
            if (e < 1) this.tile(u0 + i / 3 + 0.02, v0 + j / 3 + 0.02, 1 / 3 - 0.04, 1 / 3 - 0.04, BASE[z.id][0], 0, 1 - al);
          }
          this.tile(u0 + i / 3 + 0.02, v0 + j / 3 + 0.02, 1 / 3 - 0.04, 1 / 3 - 0.04, col, lift, al);
        }
      }
      const show = fut ? (RM ? 1 : clamp((age - 0.3) / 0.4, 0, 1)) : 0;
      ctx.save();
      if (!fut || show < 1) { ctx.globalAlpha = 1 - show; this.present(z.id, u0, v0, t); }
      ctx.restore();
      if (show > 0) {
        ctx.save(); ctx.globalAlpha = show;
        const lift = (1 - EZ.outBack(show)) * -16;
        this.future(z.id, u0, v0, t, lift);
        ctx.restore();
      }
    },
    present(id, u, v, t) {
      if (id === 'traffic') {
        this.tile(u + 0.05, v + 0.4, 0.9, 0.2, '#4b5563', 0, 1);
        const cx = ((t * 0.08) % 1);
        this.box(u + 0.05 + cx * 0.8, v + 0.42, 0.12, 0.08, 7, '#f87171', '#dc2626', '#b91c1c');
        this.box(u + 0.85 - ((t * 0.06 + 0.5) % 1) * 0.8, v + 0.5, 0.12, 0.08, 7, '#fbbf24', '#d97706', '#b45309');
      } else if (id === 'hospital') {
        const b = this.box(u + 0.3, v + 0.3, 0.4, 0.4, 34, '#f8fafc', '#e2e8f0', '#cbd5e1');
        const c = this.iso(u + 0.5, v + 0.5, 34);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(c.x - 3, c.y - 7, 6, 14); ctx.fillRect(c.x - 7, c.y - 3, 14, 6);
      } else if (id === 'home') {
        [[0.15, 0.2], [0.55, 0.5]].forEach(([a, b]) => {
          this.box(u + a, v + b, 0.28, 0.28, 16, '#fde68a', '#fcd34d', '#f59e0b');
          const p = this.iso(u + a + 0.14, v + b + 0.14, 30);
          const l = this.iso(u + a, v + b + 0.28, 16), r = this.iso(u + a + 0.28, v + b, 16), f = this.iso(u + a + 0.28, v + b + 0.28, 16);
          ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(p.x, p.y); ctx.lineTo(f.x, f.y); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(p.x, p.y); ctx.lineTo(r.x, r.y); ctx.closePath(); ctx.fill();
        });
      } else {
        for (let i = 0; i < 5; i++) this.tile(u + 0.1 + i * 0.17, v + 0.1, 0.08, 0.8, '#65a30d', 0, 1);
      }
    },
    future(id, u, v, t, lift) {
      if (id === 'traffic') {
        // 고리 도로 + 일정한 간격으로 흐르는 자율 주행차
        const ring = (s) => {
          const a = s * TAU;
          return [u + 0.5 + Math.cos(a) * 0.32, v + 0.5 + Math.sin(a) * 0.32];
        };
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 12; ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const [a, b] = ring(i / 40); const p = this.iso(a, b, lift); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(56,189,248,.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < 4; i++) {
          const s = ((RM ? 0 : t * 0.07) + i / 4) % 1;
          const [a, b] = ring(s);
          const p = this.iso(a, b, lift + 4);
          ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9, 5, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 5, 2.6, 0, 0, TAU); ctx.fill();
          const bl = 0.5 + 0.5 * Math.sin(t * 8 + i);
          ctx.strokeStyle = 'rgba(56,189,248,' + (0.25 + bl * 0.5).toFixed(2) + ')'; ctx.lineWidth = 1.6;
          const [a2, b2] = ring(s + 0.05); const q = this.iso(a2, b2, lift + 4);
          const ang = Math.atan2(q.y - p.y, q.x - p.x);
          ctx.beginPath(); ctx.arc(p.x, p.y, 13, ang - 0.6, ang + 0.6); ctx.stroke();
        }
      } else if (id === 'hospital') {
        this.box(u + 0.15, v + 0.15, 0.4, 0.4, 52, '#e0f2fe', '#bae6fd', '#7dd3fc', lift);
        const w1 = this.iso(u + 0.15, v + 0.55, lift + 40), w2 = this.iso(u + 0.55, v + 0.55, lift + 40);
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(w1.x, w1.y - k * 12); ctx.lineTo(w2.x, w2.y - k * 12); ctx.stroke(); }
        const top = this.iso(u + 0.35, v + 0.35, lift + 52);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(top.x - 3, top.y - 7, 6, 14); ctx.fillRect(top.x - 7, top.y - 3, 14, 6);
        // 로봇 팔
        const base = this.iso(u + 0.75, v + 0.7, lift);
        const a1 = -1.9 + (RM ? 0 : Math.sin(t * 0.9) * 0.35), a2 = 0.9 + (RM ? 0 : Math.sin(t * 1.3 + 1) * 0.4);
        const e1 = { x: base.x + Math.cos(a1) * 22, y: base.y - 10 + Math.sin(a1) * 22 };
        const e2 = { x: e1.x + Math.cos(a1 + a2) * 18, y: e1.y + Math.sin(a1 + a2) * 18 };
        ellipse(base.x, base.y, 8, 4, '#64748b');
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(base.x, base.y - 8); ctx.lineTo(e1.x, e1.y); ctx.lineTo(e2.x, e2.y); ctx.stroke();
        ellipse(e1.x, e1.y, 4, 4, '#334155'); ellipse(e2.x, e2.y, 3, 3, '#e2e8f0');
        // 스캔 화면
        const sc = this.iso(u + 0.8, v + 0.25, lift + 30);
        ctx.fillStyle = '#0f172a'; rr(sc.x - 16, sc.y - 12, 32, 24, 3); ctx.fill();
        const sy = sc.y - 10 + ((t * 0.8) % 1) * 20;
        ctx.fillStyle = 'rgba(52,211,153,.8)'; ctx.fillRect(sc.x - 14, sy, 28, 2);
      } else if (id === 'home') {
        const sig = Math.floor((RM ? 0 : t) / 1.4) % 4;
        [[0.12, 0.18], [0.55, 0.52]].forEach(([a, b], hi) => {
          this.box(u + a, v + b, 0.3, 0.3, 22, '#f1f5f9', '#e2e8f0', '#cbd5e1', lift);
          const p = this.iso(u + a + 0.15, v + b + 0.15, lift + 38);
          const l = this.iso(u + a, v + b + 0.3, lift + 22), r = this.iso(u + a + 0.3, v + b, lift + 22), f = this.iso(u + a + 0.3, v + b + 0.3, lift + 22);
          ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(p.x, p.y); ctx.lineTo(f.x, f.y); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(p.x, p.y); ctx.lineTo(r.x, r.y); ctx.closePath(); ctx.fill();
          // 앱 신호에 맞춰 켜지는 창
          const on1 = (sig + hi) % 2 === 0;
          const wpos = this.iso(u + a + 0.15, v + b + 0.3, lift + 11);
          ctx.fillStyle = on1 ? '#fde047' : '#64748b'; ctx.fillRect(wpos.x - 5, wpos.y - 5, 10, 8);
          if (on1) D.glow(wpos.x, wpos.y, 14, '#fde047', 0.5);
          // 와이파이 호
          ctx.strokeStyle = 'rgba(14,165,233,.85)'; ctx.lineWidth = 2;
          for (let k = 0; k < 3; k++) {
            const ph = ((RM ? 0 : t * 1.2) + k / 3) % 1;
            ctx.globalAlpha = 1 - ph;
            ctx.beginPath(); ctx.arc(p.x, p.y - 4, 5 + ph * 12, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        });
      } else {
        // 수직 농장 + 센서 + 드론
        const b = this.box(u + 0.2, v + 0.15, 0.32, 0.32, 56, 'rgba(224,242,254,.9)', 'rgba(186,230,253,.8)', 'rgba(125,211,252,.75)', lift);
        for (let k = 0; k < 4; k++) {
          const a = this.iso(u + 0.2, v + 0.47, lift + 8 + k * 12), c = this.iso(u + 0.52, v + 0.47, lift + 8 + k * 12), d = this.iso(u + 0.52, v + 0.15, lift + 8 + k * 12);
          ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
          ctx.strokeStyle = 'rgba(244,114,182,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y - 4); ctx.lineTo(c.x, c.y - 4); ctx.lineTo(d.x, d.y - 4); ctx.stroke();
        }
        D.glow(b.top.x, b.top.y + 26, 34, '#f472b6', 0.25);
        for (let i = 0; i < 4; i++) this.tile(u + 0.6 + (i % 2) * 0.18, v + 0.15 + Math.floor(i / 2) * 0.35, 0.12, 0.28, '#4d7c0f', lift, 1);
        [[0.66, 0.85], [0.86, 0.62]].forEach(([a, bb], i) => {
          const p = this.iso(u + a, v + bb, lift + 6);
          const pul = 0.5 + 0.5 * Math.sin(t * 4 + i * 2);
          ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 9); ctx.quadraticCurveTo(p.x + 5, p.y - 2, p.x, p.y + 1); ctx.quadraticCurveTo(p.x - 5, p.y - 2, p.x, p.y - 9); ctx.fill();
          ctx.strokeStyle = 'rgba(56,189,248,' + (0.6 * pul).toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 8 + pul * 4, 3 + pul * 1.5, 0, 0, TAU); ctx.stroke();
        });
        const da = RM ? 0 : t * 0.9;
        const dp = this.iso(u + 0.5 + Math.cos(da) * 0.3, v + 0.5 + Math.sin(da) * 0.3, lift + 64 + Math.sin(t * 2) * 3);
        const ds = this.iso(u + 0.5 + Math.cos(da) * 0.3, v + 0.5 + Math.sin(da) * 0.3, lift);
        ellipse(ds.x, ds.y, 9, 3, 'rgba(20,40,80,.2)');
        ctx.fillStyle = '#334155'; rr(dp.x - 7, dp.y - 3, 14, 6, 3); ctx.fill();
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dp.x - 12, dp.y - 4); ctx.lineTo(dp.x + 12, dp.y - 4); ctx.stroke();
        const sp = RM ? 1 : Math.abs(Math.sin(t * 30));
        ellipse(dp.x - 12, dp.y - 5, 6 * sp + 1, 1.5, 'rgba(148,163,184,.8)'); ellipse(dp.x + 12, dp.y - 5, 6 * sp + 1, 1.5, 'rgba(148,163,184,.8)');
      }
    },
    drawCallout(z, t) {
      const g = this.geo();
      const zz = S.city.zones[z.id];
      const [x, y, w] = g.call[z.id];
      const c = this.zoneCenter(z.id);
      const hasTech = !!zz.tech;
      const bage = now() - zz.bubbleAt;
      const vis = hasTech ? clamp(bage / 0.35, 0, 1) : 0;
      const hov = drag && drag.over === z.id && drag.tok;
      // 빈 자리 안내
      if (!hasTech || vis < 1) {
        ctx.save(); ctx.globalAlpha = 1 - vis;
        ctx.setLineDash([6, 6]); ctx.strokeStyle = hov ? '#14a058' : 'rgba(100,116,139,.55)'; ctx.lineWidth = 2;
        rr(x, y, w, 64, 14); ctx.stroke(); ctx.setLineDash([]);
        T(z.icon + ' ' + z.name, x + 12, y + 26, 15, { w: 800, c: '#475569' });
        T('어떻게 달라질까?', x + 12, y + 48, 14, { w: 600, c: '#64748b' });
        ctx.restore();
        if (vis <= 0) return;
      }
      const body = PRED[z.id][zz.tech];
      const tw = w - 24;
      const bh = para(body, 0, 0, tw, 14, { measure: true, lh: 18 });
      const con = zz.concern ? CONCERN[zz.concern] : null;
      const ch = con ? para('⚠️ ' + con.text, 0, 0, tw - 6, 13.5, { measure: true, lh: 17 }) + 12 : 0;
      const fh = con ? para('💡 ' + con.fix, 0, 0, tw - 6, 13.5, { measure: true, lh: 17 }) + 10 : 0;
      const h = 34 + bh + 8 + (con ? ch + 6 + fh + 4 : 0);
      const lift = (1 - EZ.outCubic(vis)) * 10;
      const pop = 1 + 0.06 * Math.sin(Math.PI * clamp((now() - zz.popAt) / 0.3, 0, 1));
      ctx.save();
      ctx.globalAlpha = vis;
      // 지시선
      const ax = clamp(c.x, x + 16, x + w - 16), ay = y + h / 2 > c.y ? y : y + h;
      ctx.strokeStyle = 'rgba(71,85,105,.45)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(x + (x < c.x ? w : 0), y + 24 + lift); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.translate(x + w / 2, y + lift + h / 2); ctx.scale(pop, pop); ctx.translate(-(x + w / 2), -(y + h / 2));
      bubble(x, y, w, h, null, null, { r: 14, stroke: hov ? '#14a058' : rgba(TECH[zz.tech].color, 0.5) });
      T(z.icon + ' ' + z.name, x + 12, y + 23, 15, { w: 800 });
      ctx.font = fnt(15, 800); const nw = ctx.measureText(z.icon + ' ' + z.name).width;
      D.label(x + 22 + nw, y + 18, TECH[zz.tech].icon + ' ' + TECH[zz.tech].name, { bg: TECH[zz.tech].color, size: 13, align: 'left' });
      para(body, x + 12, y + 46, tw, 14, { lh: 18, c: '#1f2937', w: 600 });
      if (con) {
        const wy = y + 34 + bh + 8;
        const wa = clamp((now() - zz.worryAt) / 0.3, 0, 1);
        ctx.save(); ctx.globalAlpha *= wa;
        ctx.fillStyle = '#fef9c3'; rr(x + 8, wy, w - 16, ch, 10); ctx.fill();
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.5; rr(x + 8, wy, w - 16, ch, 10); ctx.stroke();
        para('⚠️ ' + con.text, x + 14, wy + 17, tw - 6, 13.5, { lh: 17, c: '#713f12', w: 700 });
        ctx.restore();
        const fa = EZ.outBack(clamp((now() - zz.worryAt - 0.45) / 0.35, 0, 1));
        if (fa > 0) {
          const fy = wy + ch + 6;
          ctx.save(); ctx.translate(x + 24, fy); ctx.scale(fa, fa); ctx.translate(-(x + 24), -fy);
          ctx.fillStyle = '#dcfce7'; rr(x + 8, fy, w - 16, fh, 10); ctx.fill();
          ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5; rr(x + 8, fy, w - 16, fh, 10); ctx.stroke();
          para('💡 ' + con.fix, x + 14, fy + 16, tw - 6, 13.5, { lh: 17, c: '#166534', w: 700 });
          ctx.restore();
        }
      }
      ctx.restore();
    },
    drawShelf(t) {
      const g = this.geo();
      const mode = S.city.mode;
      const label = mode === 'tech' ? '🧩 기술 칩을 끌어 도시의 구역에 놓아요' : '⚠️ 걱정 카드를 가장 관계 깊은 구역에 놓아요';
      T(label, 14, g.shelfY + 18, 14, { w: 800, c: '#475569', b: 'middle', fit: (game && game.free ? this.modeRects().tech[0] - 28 : LAY.w - 28) });
      if (game && game.free) {
        const R = this.modeRects();
        [['tech', '🧩 기술'], ['worry', '⚠️ 걱정']].forEach(([k, txt]) => {
          const r = R[k];
          ctx.fillStyle = mode === k ? '#64748b' : '#ffffff'; rr(r[0], r[1], r[2], r[3], 19); ctx.fill();
          ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(r[0], r[1], r[2], r[3], 19); ctx.stroke();
          T(txt, r[0] + r[2] / 2, r[1] + 24, 14.5, { a: 'center', w: 800, c: mode === k ? '#fff' : '#475569' });
        });
      }
      if (mode === 'tech') {
        this.chips.forEach((k) => {
          const dim = drag && drag.src === k;
          tokDraw(k, (x, y, w, h) => drawChip(k.id, x, y, w, h, dim ? 0.45 : 1, k.lift));
        });
        if (drag && drag.tok && drag.tok.ghost) tokDraw(drag.tok, (x, y, w, h, kk) => drawChip(kk.id, x, y, w, h, 1, kk.lift));
      } else {
        this.cards.forEach((k) => { if (!k.placed || k.busy) tokDraw(k, (x, y, w, h, kk) => drawConcernCard(kk.c, x, y, w, h, kk.lift)); });
        if (this.cards.every((k) => k.placed)) T('✅ 걱정 카드를 모두 놓았어요', LAY.w / 2, g.shelfY + 76, 16, { a: 'center', w: 800, c: '#14a058' });
      }
      this.ghosts.forEach((k) => tokDraw(k, (x, y, w, h, kk) => drawChip(kk.id, x, y, w, h, 1, 0)));
    },
  };
  function drawChip(id, x, y, w, h, alpha, lift) {
    const c = TECH[id];
    ctx.save(); ctx.globalAlpha *= alpha;
    softShadow(x, y, w, h, h / 2, lift);
    ctx.fillStyle = '#ffffff'; rr(x, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = c.color; ctx.lineWidth = 2.5; rr(x + 1, y + 1, w - 2, h - 2, h / 2); ctx.stroke();
    ellipse(x + h / 2, y + h / 2, h / 2 - 6, h / 2 - 6, mix(c.color, '#ffffff', 0.75));
    emo(c.icon, x + h / 2, y + h / 2, 20);
    T(c.name, x + h - 2, y + h / 2 + 1, 14, { w: 800, b: 'middle', c: shade(c.color, -0.3) });
    ctx.restore();
  }
  function drawConcernCard(c, x, y, w, h, lift) {
    softShadow(x, y, w, h, 12, lift);
    ctx.fillStyle = '#fffbea'; rr(x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; rr(x, y, w, h, 12); ctx.stroke();
    emo(c.icon, x + 20, y + 22, 20);
    T('걱정', x + 36, y + 27, 13, { w: 800, c: '#a16207' });
    para(c.text, x + 10, y + 46, w - 20, 13, { lh: 16, max: 2, c: '#422006', w: 700 });
  }

  /* =========================================================
     STEP 4 · 미래 신문
     ========================================================= */
  const Poster = {
    toks: [], stk: [],
    geo() {
      if (LAY.kind === 'wide') return { paper: { x: 10, y: 10, w: 512, h: 580 }, panel: { x: 532, y: 10, w: 258, h: 580 } };
      return { paper: { x: 8, y: 8, w: 464, h: 512 }, panel: { x: 8, y: 528, w: 464, h: 284 } };
    },
    L() {
      const P = this.geo().paper;
      const x = P.x + 14, w = P.w - 28;
      const leftW = Math.round(w * 0.56);
      const wide = LAY.kind === 'wide';
      const hd = wide ? { y: 126, h: 88, y0: 222, tech: 50, good: 72, worry: 100, src: 76 } : { y: 122, h: 66, y0: 194, tech: 44, good: 64, worry: 88, src: 64 };
      const y0 = P.y + hd.y0;
      const yg = y0 + hd.tech + 8, yw = yg + hd.good + 8, ys = yw + hd.worry + 8;
      return {
        mast: { x, y: P.y + 8, w, h: 58 },
        tabs: { x, y: P.y + 72, w, h: 44 },
        head: { x, y: P.y + hd.y, w, h: hd.h },
        tech: { x, y: y0, w: leftW, h: hd.tech },
        good: { x, y: yg, w: leftW, h: hd.good },
        worry: { x, y: yw, w: leftW, h: hd.worry },
        src: { x, y: ys, w: leftW, h: hd.src },
        pic: { x: x + leftW + 10, y: y0, w: w - leftW - 10, h: ys + hd.src - y0 },
      };
    },
    tabRect(i) { const r = this.L().tabs; const tw = (r.w - 18) / 4; return { x: r.x + i * (tw + 6), y: r.y, w: tw, h: r.h }; },
    next() {
      const P = S.poster;
      for (const s of SLOTS) if (!(s === 'theme' ? P.theme : P.filled[s])) return s;
      return 'pic';
    },
    filledCount() { const P = S.poster; return (P.theme ? 1 : 0) + SLOTS.slice(1).filter((s) => P.filled[s]).length; },
    stickerCount() { return this.stk.filter((k) => k.placed).length; },
    complete() { return this.filledCount() === 6 && this.stickerCount() >= 2; },
    reset() {
      const P = S.poster;
      P.theme = null; P.filled = {}; P.slotAt = {}; P.candSlot = null;
      this.toks = []; this.stk = [];
      S.present = null;
    },
    setTheme(th) {
      const P = S.poster;
      if (P.theme === th) return;
      const had = this.filledCount() > 1 || this.stickerCount() > 0;
      this.reset();
      P.theme = th; P.slotAt.theme = now();
      if (had) toast('🗞️ 주제를 바꿔 신문을 새로 만들어요');
      Sound.tick();
      this.refreshCands();
      syncUI();
    },
    seedShuffle(arr, seed) {
      const rnd = seeded(seed);
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
      return a;
    },
    candidates(slot) {
      const P = S.poster, th = P.theme, data = POSTER[th];
      const others = ['traffic', 'hospital', 'home', 'farm'].filter((x) => x !== th);
      const oth = others[(th.length + (P.filled.tech || '').length) % 3];
      let list = [];
      if (slot === 'tech') {
        const valid = Object.keys(PRED[th]);
        const used = S.city.zones[th] && S.city.zones[th].tech;
        const a = used && valid.indexOf(used) >= 0 ? used : valid[0];
        const b = valid.find((v) => v !== a);
        list = [{ text: TECH[a].icon + ' ' + TECH[a].name, ok: true, val: a }, { text: TECH[b].icon + ' ' + TECH[b].name, ok: true, val: b }];
        if (data.bad) list.push({ text: TECH[data.bad].icon + ' ' + TECH[data.bad].name, ok: false, fb: '2단계에서 조사한 사례 중 이 주제와 이어지는 것이 없었어요. 다른 기술을 골라 보세요.' });
      } else if (slot === 'head') {
        const othTech = Object.keys(PRED[oth])[0];
        list = [
          { text: PRED[th][P.filled.tech], ok: true },
          { text: data.over + '.', ok: false, fb: '조사한 사례로 뒷받침되지 않는 지나친 예측이에요.' },
          { text: PRED[oth][othTech], ok: false, fb: '고른 주제·기술과 맞지 않는 변화예요.' },
        ];
      } else if (slot === 'good') {
        list = [
          { text: data.good, ok: true },
          { text: '걱정할 일이 하나도 없다', ok: false, fb: '좋은 점만 있는 기술은 없어요. 지나친 기대보다 예상되는 좋은 점을 골라요.' },
          { text: POSTER[oth].good, ok: false, fb: '고른 주제와 맞지 않는 좋은 점이에요.' },
        ];
      } else if (slot === 'worry') {
        const cid = (S.city.zones[th] && S.city.zones[th].concern && CONCERN[S.city.zones[th].concern].zones.indexOf(th) >= 0) ? S.city.zones[th].concern : data.worry;
        const con = CONCERN[cid];
        const wrongC = CONCERNS.find((c) => c.zones.indexOf(th) < 0);
        list = [
          { text: '⚠️ ' + con.text + ' → 💡 ' + con.fix, ok: true, val: cid },
          { text: '걱정되는 점은 없다', ok: false, fb: '좋은 점만 쓰면 치우친 발표가 돼요.' },
          { text: '⚠️ ' + wrongC.text + ' → 💡 ' + wrongC.fix, ok: false, fb: '이 주제와 관계가 깊은 걱정이 아니에요. 3단계 미래 도시를 떠올려 보세요.' },
        ];
      } else if (slot === 'src') {
        list = [
          { text: '2단계에서 조사한 사례와 공공 기관·전문 기관 자료', ok: true },
          { text: '친구에게 들은 소문', ok: false, fb: '출처를 확인할 수 없는 소문은 근거가 될 수 없어요.' },
          { text: '출처를 모르는 짧은 영상', ok: false, fb: '출처를 모르는 영상은 사실인지 확인하기 어려워요. 인공지능으로 만든 가짜 영상일 수도 있어요.' },
        ];
      }
      return this.seedShuffle(list, th.length * 7 + slot.length * 13 + 3);
    },
    refreshCands() {
      const P = S.poster;
      const slot = P.theme ? this.next() : null;
      if (P.candSlot === slot && (slot !== 'pic' || this.stk.length)) return;
      P.candSlot = slot;
      this.toks = [];
      if (!slot || slot === 'theme') return;
      if (slot === 'pic') { if (!this.stk.length) this.makeStickers(); return; }
      const g = this.geo().panel;
      const list = this.candidates(slot);
      const wide = LAY.kind === 'wide';
      const cw = wide ? g.w - 20 : (g.w - 28) / 2;
      list.forEach((c, i) => {
        const h = Math.max(54, para(c.text, 0, 0, cw - 24, 14, { measure: true, lh: 18.5 }) + 22);
        const k = Tok(Object.assign({ w: cw, h, slot }, c));
        this.toks.push(k);
      });
      this.layoutCands(true);
    },
    layoutCands(reset) {
      const g = this.geo().panel;
      const wide = LAY.kind === 'wide';
      let y = g.y + (wide ? 92 : 62);
      this.toks.forEach((k, i) => {
        if (wide) { k.hx = g.x + g.w / 2; k.hy = y + k.h / 2; y += k.h + 10; }
        else {
          const col = i % 2, row = Math.floor(i / 2);
          k.w = (g.w - 28) / 2;
          k.hx = g.x + 10 + col * (k.w + 8) + k.w / 2;
          k.hy = g.y + 58 + row * 100 + k.h / 2;
        }
        if (reset) { k.x = k.hx + (RM ? 0 : 40); k.y = k.hy; k.alpha = RM ? 1 : 0; SciSim.tween(k, { x: k.hx, alpha: 1 }, { duration: 0.35, ease: 'outCubic', delay: i * 0.07 }); }
        else if (!k.drag && !k.busy) { k.x = k.hx; k.y = k.hy; }
      });
    },
    makeStickers() {
      const g = this.geo().panel;
      const th = S.poster.theme;
      this.stk = POSTER[th].stickers.map((s, i) => {
        const wide = LAY.kind === 'wide';
        const cols = wide ? 3 : 6;
        const size = wide ? 74 : 66;
        const col = i % cols, row = Math.floor(i / cols);
        const gx = wide ? (g.w - cols * size) / (cols + 1) : (g.w - cols * size) / (cols + 1);
        const hx = g.x + gx + col * (size + gx) + size / 2;
        const hy = g.y + (wide ? 112 : 82) + row * (size + 30) + size / 2;
        return Tok({ id: 'stk' + i, emoji: s[0], label: s[1], w: size, h: size, hx, hy, x: hx, y: hy, placed: false, popAt: -99 });
      });
    },
    layoutAll() {
      if (!S.poster.theme) return;
      this.layoutCands(false);
      if (this.stk.length) {
        const placed = this.stk.filter((k) => k.placed).map((k) => ({ k, fx: k.fx, fy: k.fy }));
        const keep = this.stk;
        this.makeStickers();
        this.stk.forEach((k, i) => { const o = keep[i]; k.placed = o.placed; k.fx = o.fx; k.fy = o.fy; k.popAt = o.popAt; });
        const pic = this.L().pic;
        this.stk.forEach((k) => { if (k.placed) { k.x = pic.x + k.fx * pic.w; k.y = pic.y + k.fy * pic.h; } });
        void placed;
      }
    },
    slotRect(s) { return this.L()[s]; },
    inRect(p, r, pad) { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; },
    fill(slot, k) {
      const P = S.poster;
      P.filled[slot] = k.val || k.text;
      P.slotAt[slot] = now();
      const r = this.slotRect(slot);
      k.drag = false; k.busy = true;
      SciSim.tween(k, { x: r.x + r.w / 2, y: r.y + r.h / 2, alpha: 0, sc: 0.85 }, { duration: 0.28, ease: 'outCubic' });
      successFx(r.x + r.w / 2, r.y + r.h / 2);
      setTimeout(() => this.refreshCands(), RM ? 0 : 260);
    },
    down(p) {
      const P = S.poster;
      // 주제 탭
      for (let i = 0; i < 4; i++) {
        const r = this.tabRect(i);
        if (this.inRect(p, r)) { drag = { kind: 'tab', i, sx: p.x, sy: p.y }; return true; }
      }
      if (!P.theme) return false;
      for (let i = this.stk.length - 1; i >= 0; i--) {
        const k = this.stk[i];
        if (!k.busy && tokHit(k, p, 4) && (P.candSlot === 'pic' || k.placed)) {
          this.stk.splice(i, 1); this.stk.push(k);
          tokGrab(k, p);
          drag = { kind: 'sticker', tok: k };
          return true;
        }
      }
      for (let i = this.toks.length - 1; i >= 0; i--) {
        const k = this.toks[i];
        if (!k.busy && k.alpha > 0.5 && tokHit(k, p)) {
          tokGrab(k, p);
          drag = { kind: 'cand', tok: k };
          return true;
        }
      }
      return false;
    },
    move(p) {
      if (!drag.tok) return;
      tokFollow(drag.tok, p);
      if (drag.kind === 'cand') drag.over = this.inRect(p, this.slotRect(drag.tok.slot), 16);
      if (drag.kind === 'sticker') drag.over = this.inRect(p, this.L().pic, 4);
    },
    up(p) {
      if (drag.kind === 'tab') {
        const r = this.tabRect(drag.i);
        if (this.inRect(p, r, 6)) this.setTheme(['traffic', 'hospital', 'home', 'farm'][drag.i]);
        return;
      }
      const k = drag.tok;
      if (drag.kind === 'cand') {
        const r = this.slotRect(k.slot);
        if (!this.inRect(p, r, 16) && !this.inRect({ x: k.x, y: k.y }, r, 10)) { tokHome(k); return; }
        if (!k.ok) { tokReject(k, k.fb); return; }
        this.fill(k.slot, k);
        return;
      }
      if (drag.kind === 'sticker') {
        const pic = this.L().pic;
        const inside = this.inRect({ x: k.x, y: k.y }, pic, 0) || this.inRect(p, pic, 0);
        if (!inside) { k.placed = false; tokHome(k); return; }
        k.drag = false;
        const x = clamp(k.x, pic.x + k.w * 0.4, pic.x + pic.w - k.w * 0.4), y = clamp(k.y, pic.y + k.h * 0.4 + 18, pic.y + pic.h - k.h * 0.4);
        const first = !k.placed;
        k.placed = true; k.fx = (x - pic.x) / pic.w; k.fy = (y - pic.y) / pic.h;
        k.busy = true; k.sc = 0.82;
        SciSim.tween(k, { x, y, sc: 0.78 }, { duration: 0.12, ease: 'outCubic', onDone: () => SciSim.tween(k, { sc: 0.92 }, { duration: 0.32, ease: 'outBack', onDone: () => { k.busy = false; } }) });
        k.popAt = now();
        if (first) successFx(x, y); else Sound.tick();
      }
    },
    hover(p) {
      for (let i = 0; i < 4; i++) if (this.inRect(p, this.tabRect(i))) return 'pointer';
      if (this.toks.some((k) => tokHit(k, p)) || this.stk.some((k) => tokHit(k, p))) return 'grab';
      return null;
    },
    update(dt) {
      this.toks.forEach((k) => tokUpdate(k, dt));
      this.stk.forEach((k) => tokUpdate(k, dt));
      this.toks = this.toks.filter((k) => !(k.busy === false && k.alpha < 0.02 && k.drag === false && S.poster.filled[k.slot]));
    },
    draw(t) {
      const g = this.geo();
      ctx.fillStyle = '#e9edf4'; ctx.fillRect(0, 0, LAY.w, LAY.h);
      const pr = S.present;
      ctx.save();
      if (pr && !RM) {
        // 발표 카메라: 천천히 확대하며 위에서 아래로 훑는다 (처음과 끝은 부드럽게 제자리)
        const k = clamp((now() - pr.t0) / 6.2, 0, 1);
        const m = EZ.inOutCubic(clamp(k / 0.14, 0, 1)) * EZ.inOutCubic(clamp((1 - k) / 0.1, 0, 1));
        const zoom = 1 + (LAY.kind === 'wide' ? 0.05 : 0.04) * m * (0.3 + 0.7 * k);
        const ax = g.paper.x + 30, ay = g.paper.y + g.paper.h / 2;
        ctx.translate(ax, ay + (0.5 - k) * 12 * m); ctx.scale(zoom, zoom); ctx.translate(-ax, -ay);
      }
      this.drawPaper(t);
      ctx.restore();
      if (!pr) this.drawPanel(t);
      if (pr) this.drawPresent(t);
    },
    drawPaper(t) {
      const P = S.poster, G = this.geo().paper, L = this.L();
      const paper = layer('paper', G.w, G.h, () => {
        ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, G.w, G.h);
        const rnd = seeded(31);
        for (let i = 0; i < 1400; i++) { ctx.fillStyle = rnd() > 0.5 ? 'rgba(120,100,60,.07)' : 'rgba(255,255,255,.5)'; ctx.fillRect(rnd() * G.w, rnd() * G.h, 1.5, 1.5); }
      });
      softShadow(G.x, G.y, G.w, G.h, 4, 0.3);
      ctx.drawImage(paper, G.x, G.y, G.w, G.h);
      // 제호
      T('2045 미래 신문', L.mast.x + L.mast.w / 2, L.mast.y + 34, 30, { a: 'center', jua: true, c: '#111827' });
      ctx.fillStyle = '#111827'; ctx.fillRect(L.mast.x, L.mast.y + 44, L.mast.w, 3); ctx.fillRect(L.mast.x, L.mast.y + 50, L.mast.w, 1);
      T('리포터 특집', L.mast.x, L.mast.y + 14, 13, { w: 700, c: '#6b7280' });
      T('2045년', L.mast.x + L.mast.w, L.mast.y + 14, 13, { a: 'right', w: 700, c: '#6b7280' });
      // ① 주제 탭
      const next = P.theme ? this.next() : 'theme';
      ['traffic', 'hospital', 'home', 'farm'].forEach((th, i) => {
        const r = this.tabRect(i), z = ZONE[th];
        const on = P.theme === th;
        ctx.fillStyle = on ? '#334155' : '#ffffff'; rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
        ctx.strokeStyle = on ? '#334155' : '#cbd5e1'; ctx.lineWidth = 1.5; rr(r.x, r.y, r.w, r.h, 12); ctx.stroke();
        T(z.icon + ' ' + z.name, r.x + r.w / 2, r.y + r.h / 2 + 1, 15, { a: 'center', b: 'middle', w: 800, c: on ? '#fff' : '#334155' });
        if (on) { const a = EZ.outBack(clamp((now() - P.slotAt.theme) / 0.35, 0, 1)); if (a < 1) { ctx.strokeStyle = rgba('#14a058', 1 - a); ctx.lineWidth = 3; rr(r.x - 4 * a, r.y - 4 * a, r.w + 8 * a, r.h + 8 * a, 14); ctx.stroke(); } }
      });
      if (next === 'theme') breathe(L.tabs.x, L.tabs.y, L.tabs.w, L.tabs.h, 12, t);
      // 칸들
      ['head', 'tech', 'good', 'worry', 'src'].forEach((s) => this.drawSlot(s, next === s, t));
      // ⑦ 그림
      const pic = L.pic;
      ctx.fillStyle = 'rgba(255,255,255,.6)'; rr(pic.x, pic.y, pic.w, pic.h, 8); ctx.fill();
      ctx.setLineDash([5, 5]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(pic.x, pic.y, pic.w, pic.h, 8); ctx.stroke(); ctx.setLineDash([]);
      T(SLOT_NAME.pic + (next === 'pic' ? '  (스티커 ' + Math.min(2, this.stickerCount()) + '/2)' : ''), pic.x + 8, pic.y + 18, 13, { w: 800, c: '#64748b' });
      if (next === 'pic') breathe(pic.x, pic.y, pic.w, pic.h, 8, t);
      if (!this.stickerCount()) T('🖼️', pic.x + pic.w / 2, pic.y + pic.h / 2 + 10, 34, { a: 'center', c: 'rgba(100,116,139,.35)' });
      const pr = S.present;
      this.stk.filter((k) => k.placed && !k.drag).forEach((k, i) => {
        let jump = 0;
        if (pr) { const a = now() - pr.t0 - 2 - i * 0.4; if (a > 0 && a < 0.5) jump = Math.sin(Math.PI * a / 0.5) * 14; }
        const y0 = k.y; k.y -= jump; tokDraw(k, (x, y, w, h, kk) => drawSticker(kk, x, y, w, h)); k.y = y0;
      });
      // 아래 줄
      ctx.fillStyle = '#111827'; ctx.fillRect(G.x + 14, G.y + G.h - 18, G.w - 28, 1);
    },
    drawSlot(s, isNext, t) {
      const P = S.poster, r = this.slotRect(s);
      const val = P.filled[s];
      const age = now() - (P.slotAt[s] || -99);
      ctx.save();
      if (!val) {
        ctx.setLineDash([5, 5]); ctx.strokeStyle = isNext ? '#14a058' : '#d1d5db'; ctx.lineWidth = 1.5; rr(r.x, r.y, r.w, r.h, 8); ctx.stroke(); ctx.setLineDash([]);
        T(SLOT_NAME[s], r.x + 8, r.y + 18, 13, { w: 800, c: isNext ? '#15803d' : '#9ca3af' });
        if (isNext) breathe(r.x, r.y, r.w, r.h, 8, t);
        ctx.restore();
        return;
      }
      const a = clamp(age / 0.3, 0, 1);
      ctx.globalAlpha = a;
      if (a < 1) { ctx.fillStyle = rgba('#fde68a', 0.5 * (1 - a)); rr(r.x, r.y, r.w, r.h, 8); ctx.fill(); }
      if (s === 'head') {
        let text = val;
        const pr = S.present;
        if (pr) { const n = Math.floor(clamp((now() - pr.t0 - 0.5) / 0.04, 0, text.length)); text = text.slice(0, n); }
        para(text, r.x + r.w / 2, r.y + (LAY.kind === 'wide' ? 46 : 37), r.w - 16, 21, { jua: true, lh: LAY.kind === 'wide' ? 27 : 25, a: 'center', c: '#111827', max: 2 });
        T(SLOT_NAME.head, r.x + 4, r.y + 2, 13, { w: 700, c: '#9ca3af', b: 'top' });
      } else if (s === 'tech') {
        const c = TECH[val];
        T(SLOT_NAME.tech, r.x + 4, r.y + 2, 13, { w: 700, c: '#9ca3af', b: 'top' });
        D.label(r.x + 6, r.y + 31, c.icon + ' ' + c.name, { bg: c.color, size: 15, align: 'left' });
      } else if (s === 'worry') {
        const con = CONCERN[val];
        T(SLOT_NAME.worry, r.x + 4, r.y + 2, 13, { w: 700, c: '#9ca3af', b: 'top' });
        const h1 = para('⚠️ ' + con.text, r.x + 6, r.y + 34, r.w - 12, 13.5, { lh: 17, c: '#713f12', w: 700, max: 2 });
        para('💡 ' + con.fix, r.x + 6, r.y + 36 + h1, r.w - 12, 13.5, { lh: 17, c: '#166534', w: 700, max: 2 });
      } else {
        T(SLOT_NAME[s], r.x + 4, r.y + 2, 13, { w: 700, c: '#9ca3af', b: 'top' });
        para((s === 'good' ? '😊 ' : '📚 ') + val, r.x + 6, r.y + 34, r.w - 12, 14, { lh: 18, c: '#1f2937', w: 700, max: 2 });
      }
      ctx.restore();
    },
    drawPanel(t) {
      const g = this.geo().panel, P = S.poster;
      softShadow(g.x, g.y, g.w, g.h, 16, 0, 0.8);
      ctx.fillStyle = '#ffffff'; rr(g.x, g.y, g.w, g.h, 16); ctx.fill();
      if (isNew('poster')) newBadge(g.x, g.y, g.w, g.h, t);
      const slot = P.theme ? this.next() : 'theme';
      if (slot === 'theme') {
        T('먼저 주제를 골라요', g.x + 16, g.y + 34, 20, { jua: true });
        para('신문 위쪽의 ① 주제 탭(교통 · 병원 · 집 · 농장) 중 하나를 누르세요. 3단계에서 예측한 미래 도시를 떠올려 보세요!', g.x + 16, g.y + 64, g.w - 32, 14.5, { lh: 21, c: '#475569' });
        const L = this.L().tabs;
        if (LAY.kind === 'wide') D.arrow(g.x + 18, g.y + 150, L.x + L.w - 10, L.y + L.h / 2 + 4, { color: '#14a058', width: 4, dash: [6, 6] });
        return;
      }
      if (slot === 'pic') {
        T('⑦ 그림 붙이기', g.x + 16, g.y + 32, 20, { jua: true });
        if (LAY.kind === 'wide') para('스티커를 그림 칸으로 끌어 2개 이상 붙여요', g.x + 16, g.y + 56, g.w - 32, 13.5, { w: 700, c: '#475569', lh: 18 });
        else T('스티커를 그림 칸으로 끌어 2개 이상 붙여요', g.x + 16, g.y + 56, 13.5, { w: 700, c: '#475569' });
        this.stk.forEach((k) => {
          if (k.placed && !k.drag) return;
          tokDraw(k, (x, y, w, h, kk) => drawSticker(kk, x, y, w, h));
        });
        if (this.stk.filter((k) => !k.placed).length === 0) T('모든 스티커를 붙였어요!', g.x + g.w / 2, g.y + 120, 15, { a: 'center', w: 800, c: '#14a058' });
        if (this.complete()) {
          ctx.fillStyle = '#dcfce7'; rr(g.x + 12, g.y + g.h - 66, g.w - 24, 54, 12); ctx.fill();
          T('🎉 미래 신문 완성!', g.x + g.w / 2, g.y + g.h - 44, 16, { a: 'center', w: 800, c: '#15803d' });
          T('🎤 발표하기로 다시 볼 수 있어요', g.x + g.w / 2, g.y + g.h - 22, 13.5, { a: 'center', w: 700, c: '#166534' });
        }
        return;
      }
      if (LAY.kind === 'wide') {
        T('다음 칸', g.x + 16, g.y + 28, 13, { w: 800, c: '#64748b' });
        T(SLOT_NAME[slot], g.x + 16, g.y + 54, 20, { jua: true, fit: g.w - 32 });
        T('알맞은 카드를 끌어 빛나는 칸에 놓아요', g.x + 16, g.y + 76, 13, { w: 700, c: '#64748b', fit: g.w - 32 });
      } else {
        T('다음 칸: ' + SLOT_NAME[slot], g.x + 16, g.y + 30, 18, { jua: true });
        T('알맞은 카드를 끌어 빛나는 칸에 놓아요', g.x + 16, g.y + 50, 13.5, { w: 700, c: '#64748b' });
      }
      this.toks.forEach((k) => {
        if (k.alpha < 0.01) return;
        const bob = k.drag || k.busy || RM ? 0 : Math.sin(t * 2 + k.hy * 0.05);
        const y0 = k.y; k.y += bob;
        tokDraw(k, (x, y, w, h, kk) => {
          softShadow(x, y, w, h, 12, kk.lift);
          ctx.fillStyle = '#fffdf6'; rr(x, y, w, h, 12); ctx.fill();
          ctx.strokeStyle = '#e5dcc3'; ctx.lineWidth = 1.5; rr(x, y, w, h, 12); ctx.stroke();
          const lines = para(kk.text, 0, 0, w - 24, 14, { measure: true, lh: 18.5 });
          para(kk.text, x + 12, y + (h - lines) / 2 + 14, w - 24, 14, { lh: 18.5, c: '#1f2937', w: 700 });
        });
        k.y = y0;
      });
    },
    drawPresent(t) {
      const pr = S.present, age = now() - pr.t0;
      const fin = clamp((age - 6) / 0.4, 0, 1);
      const a = clamp(age / 0.5, 0, 1) * (1 - fin);
      const W = LAY.w, H = LAY.h;
      const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(10,14,30,0)'); g.addColorStop(1, 'rgba(10,14,30,' + (0.62 * a).toFixed(3) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // 마이크 + 소리 물결
      const mx = LAY.kind === 'wide' ? 662 : W / 2, my = LAY.kind === 'wide' ? 470 : H - 140;
      ctx.save(); ctx.globalAlpha = a;
      for (let i = 0; i < 3; i++) {
        const k = ((age * 0.9) + i / 3) % 1;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)).toFixed(2) + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(mx, my - 40, 30 + k * 60, -2.4, -0.7); ctx.stroke();
      }
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(mx - 3, my - 10, 6, 70);
      ctx.fillStyle = lingrad(mx - 18, 0, mx + 18, 0, ['#94a3b8', '#e2e8f0', '#64748b']); rr(mx - 18, my - 66, 36, 56, 18); ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,.35)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(mx - 14, my - 56 + i * 10); ctx.lineTo(mx + 14, my - 56 + i * 10); ctx.stroke(); }
      if (LAY.kind === 'wide') {
        bubble(560, 64, 210, 76, null, null, { r: 16, fill: 'rgba(255,255,255,.95)', shadow: false });
        T('🎤 발표 중', 580, 94, 18, { jua: true, c: '#334155' });
        T('근거와 함께 미래를 전해요', 580, 120, 13.5, { w: 700, c: '#475569' });
      }
      ctx.restore();
      if (!pr.clap && age > 5) {
        pr.clap = true;
        Sound.success();
        const cx = LAY.w / 2, cy = LAY.h * 0.4;
        if (!RM) for (let i = 0; i < 26; i++) PT.emit({ x: cx + (Math.random() - 0.5) * 300, y: cy + 120 + Math.random() * 60, vx: (Math.random() - 0.5) * 80, vy: -160 - Math.random() * 120, gravity: 120, life: 1.6, size: 7 + Math.random() * 5, color: ['#f43f5e', '#fb7185', '#facc15', '#a78bfa'][i % 4], shape: i % 2 ? 'star' : 'circle', vr: (Math.random() - 0.5) * 6 });
      }
      if (age > 6.4) { S.present = null; syncUI(); }
    },
  };
  function drawSticker(k, x, y, w, h) {
    const pop = k.popAt > 0 ? 1 + 0.12 * Math.sin(Math.PI * clamp((now() - k.popAt) / 0.35, 0, 1)) : 1;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(pop, pop); ctx.translate(-(x + w / 2), -(y + h / 2));
    softShadow(x + 4, y + 4, w - 8, h - 8, (w - 8) / 2, k.lift);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2 - 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
    emo(k.emoji, x + w / 2, y + h / 2 - 2, w * 0.46);
    ctx.restore();
    T(k.label, x + w / 2, y + h + 14, 13, { a: 'center', w: 800, c: '#334155', stroke: 'rgba(255,255,255,.95)', sw: 4 });
  }
  function startPresent() {
    if (!Poster.complete() || S.present) return;
    S.present = { t0: now(), clap: false };
    Sound.click();
    syncUI();
  }

  /* =========================================================
     입력 라우팅
     ========================================================= */
  const SCENES = { day: null, board: Board, city: City, poster: Poster };
  function interactiveAt(p) {
    if (S.sceneP < 1 || S.present) return false;
    if (S.scene === 'day') {
      const b = Day.toBase(p); const cut = CUTS[S.day.idx];
      return cut.spots.some((s) => Math.hypot(b.x - s.x, b.y - s.y) <= Math.max(s.r, 40));
    }
    if (S.scene === 'board') return Board.toks.some((k) => !k.placed && tokHit(k, p)) || !!Board.cardAt(p) || !!S.board.popup;
    if (S.scene === 'city') return City.chips.some((k) => tokHit(k, p)) || City.cards.some((k) => !k.placed && tokHit(k, p));
    if (S.scene === 'poster') return Poster.toks.some((k) => tokHit(k, p)) || Poster.stk.some((k) => tokHit(k, p)) || [0, 1, 2, 3].some((i) => Poster.inRect(p, Poster.tabRect(i)));
    return false;
  }
  function onDown(p) {
    if (S.sceneP < 1 || S.present) return false;
    S.fb = null;
    if (S.scene === 'day') return Day.tap(p);
    const sc = SCENES[S.scene];
    return sc ? sc.down(p) : false;
  }
  function onMove(p) { if (drag) { const sc = SCENES[S.scene]; if (sc && sc.move) sc.move(p); } }
  function onUp(p) {
    if (!drag) return;
    const sc = SCENES[S.scene];
    const d = drag;
    try { if (sc && sc.up) sc.up(p); } finally { if (drag === d) drag = null; }
  }
  function onHover(p) {
    if (S.sceneP < 1 || S.present) return null;
    if (S.scene === 'day') return interactiveAt(p) ? 'pointer' : null;
    const sc = SCENES[S.scene];
    return sc ? sc.hover(p) : null;
  }

  /* =========================================================
     DOM 컨트롤
     ========================================================= */
  const dayCtrl = $('#dayCtrl'), prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn'), dayName = $('#dayName');
  const presentBtn = $('#presentBtn'), ctrlCard = $('#ctrlCard'), sceneLabel = $('#sceneLabel');
  const hintEl = $('#stageHint');
  prevBtn.addEventListener('click', () => Day.go(-1));
  nextBtn.addEventListener('click', () => Day.go(1));
  presentBtn.addEventListener('click', startPresent);
  $$('#sceneGrid button').forEach((b) => b.addEventListener('click', () => {
    Sound.click();
    const sc = b.dataset.scene;
    if (sc === 'city' && !City.techCount()) S.city.mode = 'tech';
    setScene(sc);
  }));
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(() => hintEl.classList.add('hide'), ms || 5000);
  }
  function syncUI() {
    const free = !!(game && game.free);
    dayCtrl.hidden = !(has('day') && S.scene === 'day');
    presentBtn.hidden = !(has('present') && S.scene === 'poster');
    presentBtn.disabled = !Poster.complete() || !!S.present;
    ctrlCard.hidden = !free;
    $$('#sceneGrid button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    sceneLabel.textContent = SCENE_LABEL[S.scene];
    const c = CUTS[S.day.idx];
    dayName.textContent = c.icon + ' ' + c.name + ' ' + (S.day.idx + 1) + '/4';
    prevBtn.disabled = S.day.idx === 0;
    nextBtn.disabled = S.day.idx === CUTS.length - 1;
  }
  function layoutAll(reset) {
    Board.layout(!!reset);
    City.layout(!!reset);
    if (reset) Poster.layoutAll();
    else Poster.layoutCands(false);
  }

  /* =========================================================
     미션
     ========================================================= */
  const mark = (b) => (b ? '✔' : '—');
  const fig = (s) => '<div class="fig-row">' + s + '</div>';
  const levels = [
    {
      title: '내 하루 속 첨단 과학기술', short: '기술 찾기', icon: '🔎', phase: '관찰',
      features: ['day'],
      intro: '<p class="si-q">❓ 탐구 질문: 인공지능은 이미 내 하루의 어디에 들어와 있을까? 앞으로 우리 생활은 어떻게 달라질까?</p>' +
        '<p>민지의 하루(아침 → 등굣길 → 학교 → 저녁)를 따라가며 숨어 있는 <b>첨단 과학기술</b>을 찾아봐요.</p>',
      setup() {
        setScene('day');
        S.day.found = []; S.day.foundAt = {}; S.day.idx = 0; S.day.p = 1; S.day.popup = null; S.day.lastTap = now(); S.day.visited = new Set([0]);
        syncUI();
        showHint('◀ ▶로 장면을 넘기며 물건을 눌러 보세요', 6000);
      },
      recap: '인공지능·사물 인터넷·빅데이터·로봇·가상 현실 같은 첨단 과학기술이 이미 우리 생활 곳곳에서 쓰이고 있어요.',
      summary: '<p><b>첨단 과학기술</b>: 최신 과학 지식을 바탕으로 개발되어 생활과 사회를 빠르게 바꾸는 앞선 기술. 예) 인공지능, 사물 인터넷, 빅데이터, 로봇, 가상 현실</p><p>AI 스피커, 번역 앱, 버스 도착 알림, 로봇 청소기 등 이미 생활 속에서 쓰이고 있다.</p>',
      missions: [
        {
          title: '숨은 첨단 기술 찾기',
          goal: '◀ ▶로 장면을 넘기며 첨단 과학기술이 쓰인 곳을 <b>6곳</b> 이상 찾아 누르세요.',
          hint: '말을 알아듣는 기계, 스스로 움직이는 기계, 실시간 정보를 알려 주는 화면을 찾아보세요.',
          setup() { setScene('day'); },
          check: () => S.day.found.length >= 6,
          status: () => '찾은 첨단 기술 <b>' + Math.min(6, S.day.found.length) + '/6</b> · 장면 <b>' + (S.day.idx + 1) + '/4</b>',
          hold: 0,
          explain: '인공지능, 사물 인터넷, 빅데이터, 로봇, 가상 현실 같은 첨단 과학기술은 먼 미래가 아니라 이미 우리 하루 곳곳에서 쓰이고 있어요.',
        },
        {
          type: 'quiz',
          title: '첨단 과학기술이란?',
          setup() { setScene('day'); },
          goal: '첨단 과학기술에 대한 설명으로 가장 알맞은 것은?',
          choices: ['사람처럼 생긴 로봇만을 말한다', '최신 과학 지식을 바탕으로 개발되어 우리 생활과 사회를 빠르게 바꾸고 있는 앞선 기술이다', '아주 먼 미래에만 쓰일 상상 속의 기술이다', '과학자들만 실험실에서 쓰는 기술이다'],
          answer: 1,
          feedback: ['모양이 아니라 기술의 성격이 중요해요. 번역 앱처럼 눈에 보이지 않는 첨단 기술도 많아요.', '', '방금 민지의 하루에서 이미 쓰이고 있는 것을 찾았어요.', 'AI 스피커, 번역 앱처럼 누구나 생활에서 써요.'],
          explain: '첨단 과학기술은 과학 지식이 쌓여 만들어진 가장 앞선 기술이에요. 이 차시에서는 기술의 원리보다 <b>어떻게 활용되는지</b>를 중심으로 조사해요.',
        },
      ],
    },
    {
      title: '활용 사례 조사하기', short: '사례 조사', icon: '🗂️', phase: '탐구',
      features: ['cards'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 생활 속에 숨은 첨단 과학기술을 찾았어요.</div>' +
        '<p>이번에는 신문 기사 카드를 읽고, 각 첨단 과학기술이 사회의 어떤 분야에서 <b>어떻게 활용</b>되고 있는지 <b>조사</b>해 봐요.</p>',
      setup() { setScene('board'); Board.reset(); hintEl.classList.add('hide'); },
      recap: '첨단 과학기술은 의료·농업·교통·안전·교육 등 여러 분야에서 활용되며, 조사할 때는 믿을 만한 출처의 자료를 비교해야 해요.',
      summary: '<ul><li>인공지능: 의료 영상 진단 보조, 번역</li><li>사물 인터넷: 스마트 팜, 스마트 홈</li><li>빅데이터: 심야버스 노선, 교통 정보</li><li>로봇: 재난 구조, 공장 자동화</li><li>3D 프린팅: 맞춤형 의수</li><li>가상 현실: 안전한 훈련, 체험 학습</li></ul><p>조사할 때는 출처를 확인하고 여러 자료를 비교한다.</p>',
      missions: [
        {
          title: '기사와 기술 연결하기',
          goal: '📰 사례 기사 카드를 읽고, 그 사례에 쓰인 첨단 과학기술 카드로 끌어 놓으세요(6개).',
          hint: '기사 속 핵심 낱말(센서, 자료 분석, 학습, 가상 공간, 한 층씩 쌓기)을 찾아보세요.',
          setup() { setScene('board'); },
          check: () => Board.count() >= 6,
          status: () => '조사 완료 <b>' + Board.count() + '/6</b>',
          hold: 0,
          explain: '첨단 과학기술은 의료, 농업, 교통, 안전, 교육 등 사회 곳곳에서 활용되고 있어요. 자율 주행 자동차처럼 한 사례에 여러 기술(인공지능 + 사물 인터넷 + 빅데이터)이 함께 쓰이기도 해요.',
        },
        {
          type: 'quiz',
          title: '믿을 만한 자료로 조사하기',
          setup() { setScene('board'); },
          goal: '첨단 과학기술의 사례를 조사할 때 가장 바른 방법은?',
          choices: ['조회 수가 많은 영상의 내용은 모두 사실로 믿는다', '가장 먼저 찾은 자료 하나만 보면 충분하다', '출처를 확인하고 공공 기관·전문 기관의 자료 등 여러 자료를 비교한다', '출처는 몰라도 재미있는 내용이면 그대로 옮겨 쓴다'],
          answer: 2,
          feedback: ['조회 수가 많다고 사실인 것은 아니에요. 인공지능으로 만든 가짜 영상도 있어요.', '한 자료만 보면 치우친 정보일 수 있어요.', '', '출처가 없는 정보는 사실인지 확인할 수 없어요.'],
          explain: '조사할 때는 <b>출처</b>를 확인하고 <b>여러 자료를 비교</b>해 믿을 만한 정보를 골라야 해요. 발표 자료에도 출처를 밝혀요.',
        },
      ],
    },
    {
      title: '미래 사회의 변화 예측하기', short: '미래 예측', icon: '🔮', phase: '예측',
      features: ['city'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 첨단 과학기술이 오늘날 활용되는 사례를 조사했어요.</div>' +
        '<p>조사한 사례를 근거로 20년 뒤 우리 도시가 어떻게 달라질지 <b>예측</b>해 봐요. 좋은 점뿐 아니라 <b>걱정되는 점</b>도 함께 따져 봐요.</p>',
      setup() { setScene('city'); City.reset(); S.city.mode = 'tech'; hintEl.classList.add('hide'); },
      recap: '조사한 사례를 근거로 미래 사회의 변화를 예측하고, 좋은 점과 걱정되는 점을 함께 따져 보았어요.',
      summary: '<ul><li>교통: 자율 주행 자동차 ↔ 사고 책임 문제</li><li>병원: 인공지능 진단·원격 진료 ↔ 정보 격차, 개인 정보</li><li>집: 스마트 홈 ↔ 개인 정보 유출</li><li>농장: 스마트 팜·로봇 ↔ 일자리 변화</li></ul><p>첨단 과학기술의 영향은 양면적이므로 법·제도·윤리·교육으로 바르게 활용해야 한다.</p>',
      missions: [
        {
          title: '미래 도시 설계하기',
          goal: '기술 칩을 도시의 네 구역(교통 · 병원 · 집 · 농장)에 끌어 놓아, 각 구역이 어떻게 달라질지 예측해 보세요.',
          hint: '2단계 기사에서 병원은 인공지능·3D 프린팅, 농장은 사물 인터넷 사례가 있었어요.',
          setup() { setScene('city'); S.city.mode = 'tech'; },
          check: () => City.techCount() >= 4,
          status: () => '변화를 예측한 구역 <b>' + City.techCount() + '/4</b>',
          hold: 0,
          explain: '조사한 사례를 근거로 예측하면, 미래 사회의 변화를 막연한 상상이 아니라 <b>근거 있는 예측</b>으로 표현할 수 있어요.',
        },
        {
          title: '걱정되는 점도 살펴보기',
          goal: '⚠️ 걱정 카드 4장을 가장 관계 깊은 구역에 하나씩 놓으세요.',
          hint: '사고 책임은 운전자 없이 달리는 자동차, 일자리 변화는 농장의 로봇·드론을 떠올려 보세요. 한 구역에는 걱정 카드를 1장만 놓을 수 있어요.',
          setup() {
            setScene('city'); City.ensureTech(); S.city.mode = 'worry';
            ZONES.forEach((z) => { S.city.zones[z.id].concern = null; });
            City.cards.forEach((k) => { k.placed = null; k.alpha = 1; k.drag = false; });
            City.layout(true);
          },
          check: () => City.worryCount() >= 4,
          status: () => '살펴본 걱정 <b>' + City.worryCount() + '/4</b>',
          hold: 0,
          explain: '첨단 과학기술은 생활을 편리하게 하지만 개인 정보 유출, 책임 문제, 일자리 변화, 정보 격차 같은 새로운 문제를 만들 수도 있어요. 이런 문제를 줄이려면 법과 제도, 윤리 기준, 교육이 함께 필요해요.',
        },
        {
          type: 'quiz',
          title: '미래를 바라보는 태도',
          setup() { setScene('city'); City.ensureTech(); City.ensureWorry(); S.city.mode = 'worry'; },
          goal: '첨단 과학기술과 미래 사회에 대한 생각으로 가장 알맞은 것은?',
          choices: ['첨단 과학기술이 발달하면 모든 문제가 저절로 해결된다', '첨단 과학기술은 위험하므로 개발을 모두 멈춰야 한다', '미래는 이미 정해져 있어서 우리가 할 수 있는 일은 없다', '좋은 점과 걱정되는 점을 함께 따져 보고, 바르게 활용하는 방법을 사회가 함께 정해야 한다'],
          answer: 3,
          feedback: ['과학기술로 해결하기 어려운 문제도 있고, 새로운 문제가 생기기도 해요.', '의료·안전처럼 생명을 지키는 데 쓰이는 첨단 기술도 많아요.', '미래 사회의 모습은 우리가 과학기술을 어떻게 이용하느냐에 따라 달라져요.', ''],
          explain: '과학기술이 미래 사회에 미치는 영향은 우리가 어떻게 선택하고 이용하느냐에 달려 있어요.',
        },
      ],
    },
    {
      title: '미래 생활 발표하기', short: '발표하기', icon: '🎤', phase: '적용',
      features: ['poster', 'present'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 미래 도시의 변화와 걱정되는 점을 예측했어요.</div>' +
        '<p>예측한 미래 생활을 <b>글과 그림</b>으로 표현한 발표 자료(미래 신문)로 만들고, 친구들 앞에서 <b>발표</b>해 봐요.</p>',
      setup() { setScene('poster'); Poster.reset(); syncUI(); hintEl.classList.add('hide'); },
      recap: '조사한 근거로 미래 생활을 예측해 글과 그림으로 표현하고 발표했어요.',
      summary: '<p><b>발표 자료</b>: 주제 · 첨단 과학기술 · 예상되는 변화 · 좋은 점 · 걱정되는 점과 해결 노력 · 근거(출처) + 그림</p><p>좋은 발표: 근거를 바탕으로 예측하고, 좋은 점과 걱정되는 점을 함께 제시한다.</p>',
      missions: [
        {
          title: '발표 자료 만들기',
          goal: '주제를 고르고, 카드를 끌어 미래 신문의 빈칸을 채운 뒤, 그림 칸에 스티커를 2개 이상 붙이세요.',
          hint: '헤드라인은 3단계에서 예측한 문장 중에서 골라요.',
          setup() { setScene('poster'); },
          check: () => Poster.complete(),
          status: () => '채운 칸 <b>' + Poster.filledCount() + '/6</b> · 스티커 <b>' + Math.min(2, Poster.stickerCount()) + '/2</b>',
          hold: 0,
          explain: '조사한 근거를 바탕으로 미래 생활을 예측하고, 좋은 점과 걱정되는 점을 함께 글과 그림으로 표현했어요. 이 자료로 친구들과 의견을 나눠 보세요.',
          done: true,
        },
        {
          type: 'quiz',
          title: '좋은 발표의 조건',
          setup() { setScene('poster'); if (!Poster.complete()) autoPoster(); },
          goal: '미래 사회 변화에 대한 발표로 가장 좋은 것은?',
          choices: ['근거 없이 재미있는 상상만 담은 발표', '좋은 점만 강조해 듣는 사람을 설득하는 발표', '어려운 전문 용어를 많이 써서 멋져 보이는 발표', '조사한 자료와 출처를 근거로 예측하고, 좋은 점과 걱정되는 점을 함께 제시한 발표'],
          answer: 3,
          feedback: ['상상도 좋지만, 근거가 있어야 믿을 수 있는 예측이 돼요.', '걱정되는 점을 빼면 치우친 발표가 돼요.', '듣는 사람이 이해하기 쉽게 말하는 것이 중요해요.', ''],
          explain: '좋은 발표는 <b>근거(조사 자료와 출처)</b>를 바탕으로 예측하고, <b>좋은 점과 걱정되는 점</b>을 함께 보여 주며, 쉽게 전달하는 발표예요.',
        },
      ],
    },
  ];
  let wasComplete = false;   // 신문이 방금 완성되었는지 (자동 발표 재생용)
  // 다시 열었을 때 신문이 비어 있으면 예시 신문을 채워 둠
  function autoPoster() {
    Poster.reset();
    wasComplete = true;   // 예시 신문은 자동으로 발표하지 않음
    const th = 'traffic';
    S.poster.theme = th; S.poster.slotAt.theme = now() - 5;
    const tech = (S.city.zones[th].tech && PRED[th][S.city.zones[th].tech]) ? S.city.zones[th].tech : 'ai';
    Object.assign(S.poster.filled, { tech, head: PRED[th][tech], good: POSTER[th].good, worry: 'blame', src: '2단계에서 조사한 사례와 공공 기관·전문 기관 자료' });
    SLOTS.forEach((s) => { S.poster.slotAt[s] = now() - 5; });
    S.poster.candSlot = null;
    Poster.refreshCands();
    const pic = Poster.L().pic;
    Poster.stk.slice(0, 2).forEach((k, i) => { k.placed = true; k.fx = 0.32 + i * 0.36; k.fy = 0.4 + i * 0.2; k.x = pic.x + k.fx * pic.w; k.y = pic.y + k.fy * pic.h; k.sc = 0.92; });
  }

  // 무대는 게임 엔진보다 먼저 만들어 둔다 (이어하기로 중간 미션부터 시작해도 setup()이 바로 장면을 바꿀 수 있게)
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  game = SciSim.game({
    simId: 'm1-future-tech',
    mount: '#game',
    badge: '미래 도시 리포터',
    homeHref: '../../index.html#g1',
    featureLabels: {
      day: '🗓️ 민지의 하루 (◀ ▶)',
      cards: '🗂️ 기술 카드 · 📰 사례 기사',
      city: '🏙️ 미래 도시 2045',
      poster: '📰 미래 신문 만들기',
      present: '🎤 발표하기',
    },
    onFeatures(set) { F = new Set(set); syncUI(); },
    onMissionStart() { S.fb = null; S.day.popup = null; S.board.popup = null; },
    onHint() { S.hintAt = now(); },
    onComplete() { syncUI(); },
    levels,
  });
  // 발표 자료가 완성되면 발표 연출 자동 재생
  function watchPoster() {
    const c = Poster.complete();
    if (c && !wasComplete && S.scene === 'poster') setTimeout(startPresent, RM ? 0 : 500);
    wasComplete = c;
  }

  /* =========================================================
     그리기 루프
     ========================================================= */
  function drawSceneByName(name, t) {
    if (name === 'day') drawDay(t);
    else if (name === 'board') Board.draw(t);
    else if (name === 'city') City.draw(t);
    else Poster.draw(t);
  }
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
      const w = Math.min(300, LAY.w - 24);
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
    Day.update(dt);
    Board.update(dt);
    City.update(dt);
    Poster.update(dt);
    PT.update(dt);
    view.clear(BG);
    if (S.sceneP < 1 && S.from) {
      const e = S.sceneP, W = LAY.w, H = LAY.h;
      ctx.save(); ctx.globalAlpha = 1 - e; ctx.translate(-e * W * 0.3, 0); drawSceneByName(S.from, t); ctx.restore();
      ctx.save(); ctx.globalAlpha = clamp(e * 1.5, 0, 1);
      const sc = 0.96 + 0.04 * e;
      ctx.translate((1 - e) * W * 0.4 + W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
      drawSceneByName(S.scene, t);
      ctx.restore();
    } else drawSceneByName(S.scene, t);
    drawOverlay(t);
  }

  syncUI();
  let uiT = 0;
  SciSim.loop((dt) => {
    frame(dt);
    watchPoster();
    uiT += dt;
    if (uiT > 0.25) { uiT = 0; syncUI(); }
  });

  /* ---------- 테스트용 디버그 훅 ---------- */
  window.__sim = {
    S, Board, City, Poster, Day,
    get layout() { return LAY.kind; },
    get game() { return game; },
    // 가상 좌표 → 화면(client) 좌표
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / LAY.w, y: r.top + y * r.height / LAY.h }; },
    spots() {
      const cut = CUTS[S.day.idx];
      return cut.spots.map((s) => { const pos = s.id === 'vacuum' ? Day.vacPos() : s; const c = Day.toCanvas(pos.x, pos.y); return { id: s.id, trap: !!s.trap, x: c.x, y: c.y }; });
    },
    articles() { return Board.toks.map((k) => ({ id: k.id, tech: k.a.tech, x: k.x, y: k.y, placed: k.placed })); },
    techCard(id) { const r = Board.cards[id]; return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; },
    chips() { return City.chips.map((k) => ({ id: k.id, x: k.x, y: k.y })); },
    concerns() { return City.cards.map((k) => ({ id: k.id, x: k.x, y: k.y, placed: k.placed, zones: CONCERN[k.id].zones })); },
    zone(id) { return City.zoneCenter(id); },
    tab(i) { const r = Poster.tabRect(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; },
    cands() { return Poster.toks.filter((k) => k.alpha > 0.5).map((k) => ({ ok: k.ok, slot: k.slot, x: k.x, y: k.y, text: k.text })); },
    slot(s) { const r = Poster.slotRect(s); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; },
    stickers() { return Poster.stk.map((k) => ({ x: k.x, y: k.y, placed: k.placed })); },
    pic() { const r = Poster.L().pic; return { x: r.x + r.w / 2, y: r.y + r.h / 2, w: r.w, h: r.h }; },
    next: () => Poster.next(),
    autoPoster, startPresent, setScene,
    busy() { return S.sceneP < 1 || S.day.p < 1 || !!S.present; },
  };
})();
