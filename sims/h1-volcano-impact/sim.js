/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 화산 분출과 지구시스템 (단원 4차시)
   성취기준 [10통과1-03-02] 지권의 변화를 판구조론 관점에서 해석하고, 에너지 흐름의 결과로 발생하는
   지권의 변화가 지구시스템에 미치는 영향을 추론할 수 있다.
   ① 관찰: 분출 관찰 (마그마 방 → 용암 · 화산 쇄설물 · 화산 가스, VEI 3/5/7)
   ② 탐구: 영향 연쇄 (에어로졸이 지구를 감싸고 기온이 내려감) + 영향 카드 12장을 권역에 분류
   ③ 탐구: 피해 조사 (탐보라 · 크라카타우 · 아이슬란드 사례를 환경 / 사회경제 피해 표로)
   ④ 적용: 대책 수립 (예산 10점으로 대책 카드를 골라 시나리오 3개에서 피해자 90 % 감소)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 860 : 560;
  const FS = PHONE ? 1.2 : 1;
  const RM = SciSim.reduceMotion;
  const MINUS = '−';
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fmtT = (v) => (v < -1e-9 ? MINUS : '') + Math.abs(v).toFixed(1);   // 기온 변화(°C)
  const koFin = (s) => { const c = s.charCodeAt(s.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const iga = (s) => s + (koFin(s) ? '이' : '가');
  const eunneun = (s) => s + (koFin(s) ? '은' : '는');

  /* ---------- 자료 ---------- */
  // 화산 폭발 지수(VEI)별 화산재 기둥 높이(분화구 위, km)와 분출물의 양(최소, km³)
  const VEI = {
    3: { h: 10, vol: '0.01' }, 4: { h: 15, vol: '0.1' }, 5: { h: 25, vol: '1' }, 6: { h: 35, vol: '10' }, 7: { h: 45, vol: '100' },
  };
  const TROPO = 12;      // 대류권과 성층권의 경계 높이(km)
  // 시간에 따른 변화 (1991년 피나투보 VEI 6 분화를 단순화한 값)
  const STOPS = [
    { k: '직후', long: '분출 직후', dT: 0.0, am: 0.0, cv: 0.0, where: '화산 근처', txt: '화산재와 이산화 황이 분출 기둥을 타고 성층권까지 올라가요.' },
    { k: '1일', long: '1일 뒤', dT: 0.0, am: 0.15, cv: 0.06, where: '화산 주변', txt: '에어로졸이 화산 주변 성층권에 퍼지기 시작해요.' },
    { k: '1주', long: '1주 뒤', dT: 0.0, am: 0.4, cv: 0.3, where: '열대 지방', txt: '바람을 타고 열대 지방을 따라 퍼져요. 일부는 산성비로 내려요.' },
    { k: '1개월', long: '1개월 뒤', dT: -0.1, am: 0.8, cv: 0.7, where: '지구의 대부분', txt: '지구를 반 바퀴 이상 돌며 햇빛을 가려서 기온이 내려가기 시작해요.' },
    { k: '6개월', long: '6개월 뒤', dT: -0.4, am: 1.0, cv: 1.0, where: '지구 전체', txt: '지구 전체를 감싸 햇빛이 가장 많이 줄어요. 농작물 피해가 나타나요.' },
    { k: '1년', long: '1년 뒤', dT: -0.5, am: 0.9, cv: 1.0, where: '지구 전체', txt: '기온이 가장 낮아져요(약 −0.5 °C). 식량 부족이 이어져요.' },
    { k: '2년', long: '2년 뒤', dT: -0.2, am: 0.45, cv: 1.0, where: '지구 전체', txt: '에어로졸이 서서히 가라앉아 기온이 조금씩 올라와요.' },
  ];
  // 영향 카드 (분류용)
  const BINS = [
    { id: 'geo', name: '지권', icon: '🪨', color: '#a16207' },
    { id: 'atm', name: '기권', icon: '☁️', color: '#0ea5e9' },
    { id: 'hyd', name: '수권', icon: '🌊', color: '#2563eb' },
    { id: 'bio', name: '생물권', icon: '🌱', color: '#16a34a' },
    { id: 'soc', name: '인간 사회', icon: '🏘️', color: '#7c3aed' },
  ];
  const BIN = {}; BINS.forEach((b) => { BIN[b.id] = b; });
  const CARDS = [
    { id: 'c1', t: '용암이 땅을 덮어요', bin: 'geo' },
    { id: 'c2', t: '화산 쇄설류가 흘러내려요', bin: 'geo' },
    { id: 'c3', t: '햇빛이 줄어 기온이 내려가요', bin: 'atm' },
    { id: 'c4', t: '산성비가 내려요', bin: 'atm' },
    { id: 'c5', t: '화산재 구름이 하늘을 덮어요', bin: 'atm' },
    { id: 'c6', t: '쓰나미가 해안을 덮쳐요', bin: 'hyd' },
    { id: 'c7', t: '하천이 화산재로 오염돼요', bin: 'hyd' },
    { id: 'c8', t: '농작물이 시들어요', bin: 'bio' },
    { id: 'c9', t: '숲과 서식지가 파괴돼요', bin: 'bio' },
    { id: 'c10', t: '항공 운항이 중단돼요', bin: 'soc' },
    { id: 'c11', t: '주민이 대피하고 인명 피해가 생겨요', bin: 'soc' },
    { id: 'c12', t: '식량 가격이 오르고 관광이 줄어요', bin: 'soc' },
  ];
  // 피해 사례
  const CASES = [
    { id: 'tambora', tab: '1815 탐보라', tabShort: '탐보라', title: '1815년 탐보라 화산 (인도네시아)', vei: 'VEI 7', color: '#a16207',
      facts: ['분출물이 성층권까지 올라가 에어로졸이 햇빛을 가렸어요.', '지구 평균 기온이 내려가 이듬해 1816년은 "여름 없는 해"가 되었어요.', '북반구에 이상 저온이 이어져 유럽과 북아메리카에서 흉작이 들었어요.', '식량이 부족해지고 곡물 가격이 크게 올랐어요.'] },
    { id: 'krakatoa', tab: '1883 크라카타우', tabShort: '크라카타우', title: '1883년 크라카타우 화산 (인도네시아)', vei: 'VEI 6', color: '#2563eb',
      facts: ['섬이 무너지듯 폭발하면서 큰 쓰나미가 생겼어요. 높이는 최대 약 30 m예요.', '해안 마을이 파괴되어 약 3만 6천 명이 목숨을 잃었어요.', '화산재가 하늘을 덮어 몇 달 동안 붉은 노을이 나타났어요.', '지구 평균 기온이 1~2년 동안 조금 내려갔어요.'] },
    { id: 'iceland', tab: '2010 아이슬란드', tabShort: '아이슬란드', title: '2010년 아이슬란드 화산 (에이야프야들라이외퀴들)', vei: 'VEI 4', color: '#64748b',
      facts: ['화산 아래의 빙하가 녹아 홍수가 일어났어요.', '화산재 구름이 편서풍을 타고 유럽 하늘로 퍼졌어요.', '화산재가 비행기 엔진 안에서 녹아 붙으면 고장 날 수 있어서 유럽의 많은 공항이 문을 닫았어요.', '항공편 약 10만 편이 취소되어 약 1000만 명의 이동에 영향을 주었어요.'] },
  ];
  const CHIPS_CASE = [
    { id: 'k1', t: '1816년 이상 저온 (여름 없는 해)', cs: 'tambora', kind: 'env' },
    { id: 'k2', t: '식량 부족과 곡물 가격 상승', cs: 'tambora', kind: 'soc' },
    { id: 'k3', t: '큰 쓰나미 발생', cs: 'krakatoa', kind: 'env' },
    { id: 'k4', t: '해안 마을 파괴와 인명 피해', cs: 'krakatoa', kind: 'soc' },
    { id: 'k5', t: '빙하가 녹아 홍수 발생', cs: 'iceland', kind: 'env' },
    { id: 'k6', t: '항공 운항 중단과 경제 손실', cs: 'iceland', kind: 'soc' },
  ];
  // 대책 시뮬레이션
  const MEAS = {
    monitor: { name: '감시 장비', icon: '📡', cost: 3 }, map: { name: '위험 지도', icon: '🗺️', cost: 2 },
    shelter: { name: '대피소', icon: '🏠', cost: 3 }, drill: { name: '대피 훈련', icon: '🏃', cost: 2 }, edu: { name: '시민 교육', icon: '📚', cost: 1 },
  };
  const MORDER = ['monitor', 'map', 'shelter', 'drill', 'edu'];
  const BUDGET = 10, DOT = 800, NDOT = 100, GATE = 0.45;
  const SCEN = [
    { id: 'ash', name: '화산재 낙하', sph: '기권', base: 30, loss: 1200, blocks: [0, 1, 2], w: { monitor: 0.30, map: 0.15, shelter: 0.65, drill: 0.20, edu: 0.60 }, dur: 4.2,
      need: '넓게 쌓이는 화산재는 <b>대피소</b>(실내 대피)와 <b>시민 교육</b>(마스크·실내 대기)이 특히 도움이 돼요.' },
    { id: 'flow', name: '화산 쇄설류', sph: '지권', base: 50, loss: 2000, blocks: [0, 1, 2, 3, 4], w: { monitor: 0.30, map: 0.60, shelter: 0.55, drill: 0.60, edu: 0.25 }, dur: 2.2,
      need: '순식간에 흐르는 쇄설류는 <b>위험 지도</b>와 <b>대피 훈련</b>, <b>대피소</b>로 빨리 피해야 해요.' },
    { id: 'lahar', name: '화산 이류', sph: '수권', base: 40, loss: 1500, blocks: [3, 4, 8, 9], w: { monitor: 0.30, map: 0.60, shelter: 0.35, drill: 0.55, edu: 0.50 }, dur: 3.2,
      need: '비와 화산재가 섞여 강을 따라 흐르는 이류는 <b>위험 지도</b>와 <b>시민 교육</b>, <b>대피 훈련</b>이 도움이 돼요.' },
  ];
  function cityResult(si, sel) {
    const sc = SCEN[si];
    let p = 1;
    MORDER.forEach((m) => { if (m !== 'monitor' && sel.has(m)) p *= 1 - sc.w[m]; });
    if (sel.has('monitor')) p *= 1 - sc.w.monitor;
    const gate = sel.has('monitor') ? 1 : GATE;
    const resid = 1 - gate * (1 - p);                       // 남는 피해 비율
    const dots = Math.round(sc.base * resid);                // 피해자 수(점 1개 = 800명)
    const people = dots * DOT, basePeople = sc.base * DOT;
    const loss = Math.round(sc.loss * (0.2 + 0.8 * dots / sc.base) / 10) * 10;
    const cut = Math.floor((1 - dots / sc.base) * 1000 + 1e-9) / 10;   // 감소율(%), 소수 첫째 자리 버림
    const ok = dots <= sc.base * 0.1 + 1e-9;
    return { dots, people, basePeople, loss, cut, ok };
  }
  const fmtN = (n) => n.toLocaleString('ko-KR');

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'erupt', clock: 0, fade: 0,
    vei: 5, plumeH: 0, flowL: 0, stable: 0, seenVei: new Set(), tremor: 0,
    tIdx: 0, tView: 0, tSeen: new Set([0]), litA: [0, 0, 0, 0, 0, 0], pulse: 0,
    selCase: 0, seenCase: new Set([0]), tabHot: -1,
    sortOK: false, caseOK: false,
    sel: new Set(), res: [null, null, null], run: null, cityFlash: 0,
    drag: null, selChip: null,
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef5fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const font = (n, w) => D.font(n, w || 700);
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const AP = (c, t, dt, r) => (RM ? t : SciSim.approach(c, t, dt, r));
  const sh = SciSim.color.shade, rgba = SciSim.color.rgba;

  function sprite(r, g, b, a0) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, `rgba(${r},${g},${b},${a0})`); gr.addColorStop(0.55, `rgba(${r},${g},${b},${a0 * 0.55})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return c;
  }
  const SP_DARK = sprite(58, 50, 46, 0.9), SP_MID = sprite(118, 108, 100, 0.85), SP_AERO = sprite(226, 172, 70, 0.8);

  /* 글자 줄바꿈 (단어 단위, 너무 긴 단어는 글자 단위) */
  const wrapCache = new Map();
  function wrap(text, maxW, fnt) {
    const key = text + '|' + Math.round(maxW) + '|' + fnt;
    if (wrapCache.has(key)) return wrapCache.get(key);
    ctx.save(); ctx.font = fnt;
    const lines = []; let cur = '';
    const push = (w) => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW) { cur = t; return; }
      if (cur) { lines.push(cur); cur = ''; }
      if (ctx.measureText(w).width <= maxW) { cur = w; return; }
      let s = '';
      for (const ch of w) { if (ctx.measureText(s + ch).width > maxW && s) { lines.push(s); s = ''; } s += ch; }
      cur = s;
    };
    text.split(' ').forEach(push);
    if (cur) lines.push(cur);
    ctx.restore();
    wrapCache.set(key, lines);
    return lines;
  }
  function textBlock(text, x, y, maxW, o) {
    o = o || {};
    const size = (o.size || 14), lh = o.lh || size * 1.32 * FS;
    const lines = wrap(text, maxW, font(size, o.weight || 700));
    lines.forEach((ln, i) => D.text(x, y + i * lh, ln, { size, weight: o.weight || 700, color: o.color || '#1b2333', align: o.align || 'left', baseline: 'middle' }));
    return lines.length * lh;
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(x, y, w, h, o.r || 14).fill(); }, { blur: 12, y: 3 });
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || 1.5; rr(x, y, w, h, o.r || 14).stroke(); }
  }

  /* ======================================================
     ① 분출 장면 (화산 단면 + 고도 눈금)
     ====================================================== */
  const EG = (() => {
    const ventY = Math.round(VH * (PHONE ? 0.70 : 0.705));
    const kmPx = (ventY - 36) / 50;
    const cx = PHONE ? 330 : 420;
    const mtnH = PHONE ? 96 : 66;
    const hw = PHONE ? 250 : 185;
    const groundY = ventY + mtnH;
    const chamberY = groundY + (VH - groundY) * 0.58;
    return { ventY, kmPx, cx, mtnH, hw, groundY, chamberY, axisX: PHONE ? 52 : 58, PS: PHONE ? 1.4 : 1 };
  })();
  function mtnY(x) {
    const dd = Math.max(0, Math.abs(x - EG.cx) - 7);
    if (dd >= EG.hw) return EG.groundY;
    return EG.groundY - EG.mtnH * Math.pow(1 - dd / EG.hw, 1.5);
  }
  const TREES = [];
  [-1, 1].forEach((sd) => { for (let i = 0; i < 6; i++) { const d = EG.hw * (0.34 + i * 0.12) + rnd(-6, 6); TREES.push({ x: EG.cx + sd * (7 + d), s: rnd(0.8, 1.2), sd }); } });
  const ASH = [], BOMBS = [];
  let ashAcc = 0, bombAcc = 0, gasAcc = 0;

  function stepErupt(dt) {
    const T = VEI[S.vei].h;
    S.plumeH = AP(S.plumeH, T, dt, 1.5);
    S.flowL = AP(S.flowL, EG.hw * (0.28 + 0.13 * (S.vei - 3)), dt, 1.2);
    S.tremor = AP(S.tremor, 0.25 + 0.15 * (S.vei - 3), dt, 3);
    const rate = (24 + 12 * (S.vei - 3)) * (RM ? 0.5 : 1);
    ashAcc += rate * dt;
    while (ashAcc >= 1) { ashAcc -= 1; if (ASH.length < 520) ASH.push({ a: 0, life: 2.3 + 0.12 * S.vei + Math.random() * 0.7, rf: 0.12 + 0.88 * Math.sqrt(Math.random()), dx: Math.random() * 2 - 1, sd: Math.random() }); }
    for (let i = ASH.length - 1; i >= 0; i--) { ASH[i].a += dt; if (ASH[i].a >= ASH[i].life) ASH.splice(i, 1); }
    bombAcc += (2 + 1.6 * S.vei) * dt;
    while (bombAcc >= 1) {
      bombAcc -= 1;
      const k = EG.PS;
      BOMBS.push({ x: EG.cx + rnd(-5, 5), y: EG.ventY - 2, vx: rnd(-1, 1) * (70 + 16 * S.vei) * k, vy: -rnd(0.6, 1) * Math.sqrt(2 * 560 * k * (26 + 9 * S.vei) * k) });
    }
    for (let i = BOMBS.length - 1; i >= 0; i--) {
      const b = BOMBS[i]; b.vy += 560 * EG.PS * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.vy > 0 && b.y >= mtnY(b.x) - 1) { parts.burst(b.x, mtnY(b.x) - 2, { count: 3, speed: 40, size: 2, life: 0.35, colors: ['#fbbf24', '#9a3412'], gravity: 120, shape: 'circle' }); BOMBS.splice(i, 1); }
      else if (b.x < 6 || b.x > VW - 6 || b.y > VH) BOMBS.splice(i, 1);
    }
    gasAcc += 7 * dt;
    while (gasAcc >= 1 && !RM) { gasAcc -= 1; parts.emit({ x: EG.cx + rnd(-6, 6), y: EG.ventY - 4, vx: rnd(-14, 14) * EG.PS, vy: -rnd(40, 80) * EG.PS, life: rnd(1.3, 2.2), size: rnd(3.5, 6) * EG.PS, color: Math.random() < 0.5 ? '#8fd0ff' : '#f2d95c', shape: 'bubble', drag: 0.5 }); }
    if (gasAcc > 3) gasAcc = 0;
    // 지금 보이는 세기를 충분히 오래 봤는지 (기둥이 목표 높이에 거의 닿은 뒤 0.8초)
    if (Math.abs(S.plumeH - T) < 0.6 && S.flowL > 0) S.stable += dt; else S.stable = 0;
    if (S.stable > 0.8 && S.mode === 'erupt') S.seenVei.add(S.vei);
  }

  function drawErupt(t) {
    const E = EG;
    const shake = RM ? 0 : S.tremor * (S.vei >= 5 ? 1.6 : 0.8);
    ctx.save();
    if (shake > 0.01) ctx.translate(Math.sin(t * 47) * shake, Math.cos(t * 39) * shake * 0.6);
    // 하늘: 대류권 / 성층권
    const yT = E.ventY - TROPO * E.kmPx, yTop = E.ventY - 50 * E.kmPx;
    let g = ctx.createLinearGradient(0, 0, 0, yT);
    g.addColorStop(0, '#a9b9e4'); g.addColorStop(1, '#d3e0f6');
    ctx.fillStyle = g; ctx.fillRect(-10, -10, VW + 20, yT + 10);
    g = ctx.createLinearGradient(0, yT, 0, E.groundY);
    g.addColorStop(0, '#cfe6fb'); g.addColorStop(1, '#f1f8ff');
    ctx.fillStyle = g; ctx.fillRect(-10, yT, VW + 20, E.groundY - yT);
    D.dashedLine(E.axisX, yT, VW - 8, yT, { color: 'rgba(60,80,140,.55)', width: 2, dash: [8, 6] });
    D.text(VW - 12, yT - 8, '성층권 (약 12 ~ 50 km)', { size: 13, weight: 800, color: '#3b4a85', align: 'right' });
    D.text(VW - 12, yT + 18, '대류권 (약 12 km 아래)', { size: 13, weight: 800, color: '#2a6a9e', align: 'right' });
    // 고도 눈금
    ctx.strokeStyle = '#4b5a73'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(E.axisX, E.ventY); ctx.lineTo(E.axisX, yTop); ctx.stroke();
    for (let k = 0; k <= 50; k += 10) {
      const y = E.ventY - k * E.kmPx;
      ctx.beginPath(); ctx.moveTo(E.axisX - 6, y); ctx.lineTo(E.axisX + 6, y); ctx.stroke();
      D.text(E.axisX - 10, y + 4.5, k + '', { size: 13, weight: 800, color: '#334155', align: 'right' });
    }
    D.text(E.axisX + 4, yTop - 14 * FS + 2, '분화구 위 높이 (km)', { size: 13, weight: 800, color: '#334155', align: 'left' });

    // 구름 몇 개 (대류권)
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    [[0.18, 0.78, 1], [0.84, 0.86, 0.8]].forEach(([fx, fy, s]) => {
      const x = VW * fx + (RM ? 0 : Math.sin(t * 0.2 + fx * 9) * 8), y = E.groundY - (E.groundY - yT) * (1 - fy) * 0.9 - 8;
      ctx.beginPath(); ctx.arc(x, y, 14 * s, 0, 7); ctx.arc(x + 17 * s, y - 7 * s, 17 * s, 0, 7); ctx.arc(x + 36 * s, y, 13 * s, 0, 7); ctx.fill();
    });

    // 땅 · 화산
    ctx.fillStyle = '#7fbf7a'; ctx.fillRect(-10, E.groundY, VW + 20, VH - E.groundY + 10);
    g = ctx.createLinearGradient(0, E.groundY, 0, VH);
    g.addColorStop(0, '#b08a5c'); g.addColorStop(0.18, '#8b6a45'); g.addColorStop(1, '#5a4330');
    ctx.fillStyle = g; ctx.fillRect(-10, E.groundY + 14, VW + 20, VH - E.groundY);
    ctx.fillStyle = '#7fbf7a'; ctx.fillRect(-10, E.groundY, VW + 20, 14);
    // 지층 무늬
    ctx.strokeStyle = 'rgba(40,25,10,.18)'; ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) { const y = E.groundY + 14 + i * (VH - E.groundY - 14) / 4.6; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= VW; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 3); ctx.stroke(); }
    // 산
    ctx.beginPath(); ctx.moveTo(E.cx - E.hw - 7, E.groundY);
    for (let x = E.cx - E.hw - 7; x <= E.cx + E.hw + 7; x += 4) ctx.lineTo(x, mtnY(x));
    ctx.lineTo(E.cx + E.hw + 7, E.groundY); ctx.closePath();
    g = ctx.createLinearGradient(E.cx - E.hw, 0, E.cx + E.hw, 0);
    g.addColorStop(0, '#8a7566'); g.addColorStop(0.5, '#6b5a50'); g.addColorStop(1, '#4e413a');
    ctx.fillStyle = g; ctx.fill();
    // 나무
    TREES.forEach((tr) => {
      const burnt = Math.abs(tr.x - E.cx) - 7 < S.flowL - 2;
      const y = mtnY(tr.x), s = tr.s * (PHONE ? 1.3 : 1);
      ctx.fillStyle = burnt ? '#3b2f2a' : '#2f8f4e';
      ctx.beginPath(); ctx.moveTo(tr.x, y - 20 * s); ctx.lineTo(tr.x - 7 * s, y + 1); ctx.lineTo(tr.x + 7 * s, y + 1); ctx.closePath(); ctx.fill();
    });
    // 땅속: 도관 + 마그마 방
    const cY = E.chamberY, ry = PHONE ? 30 : 23, rx = PHONE ? 110 : 92;
    ctx.fillStyle = '#6a1f12';
    ctx.beginPath(); ctx.rect(E.cx - 8, E.ventY + 4, 16, cY - ry - E.ventY); ctx.fill();
    const flow = ctx.createLinearGradient(0, E.ventY, 0, cY);
    flow.addColorStop(0, '#fbbf24'); flow.addColorStop(1, '#ef4444');
    ctx.fillStyle = flow; ctx.globalAlpha = 0.9; ctx.fillRect(E.cx - 5, E.ventY + 6, 10, cY - ry - E.ventY - 4); ctx.globalAlpha = 1;
    if (!RM) for (let i = 0; i < 5; i++) { const u = ((t * 0.6 + i / 5) % 1); const y = lerp(cY - ry, E.ventY + 6, u); D.glow(E.cx, y, 9, '#fff3b0', 0.8 * Math.sin(u * Math.PI)); }
    D.glow(E.cx, cY, rx * 1.5, '#ff7a1a', 0.35 + 0.1 * Math.sin(t * 2));
    g = ctx.createRadialGradient(E.cx - rx * 0.3, cY - ry * 0.4, 4, E.cx, cY, rx);
    g.addColorStop(0, '#ffd166'); g.addColorStop(0.5, '#f97316'); g.addColorStop(1, '#b91c1c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(E.cx, cY, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    D.label(E.cx, cY + 2, '마그마 방', { bg: 'rgba(60,15,5,.78)', color: '#fff', size: 13, pad: 8 });
    // 지구 내부 에너지 화살표
    for (let i = -1; i <= 1; i++) { const bx = E.cx + i * 54; const wob = RM ? 0 : Math.sin(t * 3 + i) * 2; D.arrow(bx + wob, VH - 4, bx + wob, cY + ry + 4, { color: '#fb923c', width: 3, head: 9, alpha: 0.9 }); }
    D.label(E.cx + rx + 70, cY + ry - 4, '지구 내부 에너지', { bg: '#fff7ed', color: '#9a3412', size: 13, border: '#fb923c', pad: 8 });

    // 용암 흐름
    [-1, 1].forEach((sd) => {
      if (S.flowL < 2) return;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => { ctx.beginPath(); for (let d = 0; d <= S.flowL; d += 4) { const x = E.cx + sd * (7 + d); const y = mtnY(x) - 1.5; d === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } };
      ctx.shadowColor = 'rgba(255,120,20,.9)'; ctx.shadowBlur = 10;
      ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 7 * (PHONE ? 1.2 : 1); path(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 4 * (PHONE ? 1.2 : 1); path(); ctx.stroke();
      ctx.setLineDash([12, 14]); ctx.lineDashOffset = -(RM ? 0 : t * 36); ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; path(); ctx.stroke();
      ctx.restore();
    });
    // 분화구 불빛
    D.glow(E.cx, E.ventY - 4, 38 + 6 * S.vei, '#ff8a2a', 0.55);
    // 화산탄
    BOMBS.forEach((b) => { D.glow(b.x, b.y, 7, '#ff9a3c', 0.5); ctx.fillStyle = '#2a1b14'; ctx.beginPath(); ctx.arc(b.x, b.y, 3 * EG.PS, 0, 7); ctx.fill(); });
    // 화산재 기둥
    drawAsh(t);
    // 화산 가스 (거품 모양)
    parts.draw(ctx);
    ctx.restore();

    // 기둥 높이 표시선
    const topY = E.ventY - S.plumeH * E.kmPx;
    D.dashedLine(E.axisX, topY, E.cx + 70 + 2.2 * S.plumeH * E.PS, topY, { color: '#be123c', width: 2, dash: [6, 5] });
    D.label(E.axisX + 8, topY - 15, '기둥 높이 약 ' + VEI[S.vei].h + ' km', { bg: '#be123c', size: 13, align: 'left', pad: 8 });
    // 성층권 도달 표시
    const strat = VEI[S.vei].h > TROPO;
    if (S.plumeH > 3) {
      const pulse = RM ? 1 : 0.85 + 0.15 * Math.sin(t * 5);
      const bx = Math.min(VW - 150, E.cx + 90 + (strat ? 40 : 0)), by = Math.min(E.ventY - 24, topY + 8);
      D.label(bx, by, strat ? '성층권까지 올라가요!' : '대류권에 머물러요', { bg: strat ? 'rgba(124,58,237,' + pulse + ')' : 'rgba(14,116,144,.92)', size: 13.5, pad: 9 });
    }
    // 이름표 (분출물)
    const lv = Math.min(S.flowL, EG.hw * 0.6);
    const lx = E.cx + (PHONE ? 70 : 62) + lv * 0.5, ly = mtnY(E.cx + 7 + lv * 0.5) - 1.5;
    ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 24, ly + (PHONE ? 38 : 30)); ctx.stroke();
    D.label(lx + 24, ly + (PHONE ? 52 : 42), '용암', { bg: '#fff1e6', color: '#9a3412', border: '#fb923c', size: 14, pad: 9 });
    const ex = E.cx - (PHONE ? 130 : 108), ey = E.ventY - (PHONE ? 140 : 100);
    ctx.strokeStyle = '#3f3a36'; ctx.beginPath(); ctx.moveTo(ex + 34, ey); ctx.lineTo(E.cx - 26, ey + 20); ctx.stroke();
    D.label(ex, ey, '화산 쇄설물', { bg: '#efe9e4', color: '#3f3a36', border: '#8a7f78', size: 14, pad: 9, align: 'right' });
    D.text(ex + 6, ey + 22, '(화산재 · 화산탄)', { size: 12.5, weight: 800, color: '#3f3a36', align: 'right' });
    const gx2 = E.cx + (PHONE ? 78 : 70), gy2 = E.ventY - (PHONE ? 78 : 56);
    ctx.strokeStyle = '#1e6aa8'; ctx.beginPath(); ctx.moveTo(gx2 + 6, gy2 - 8); ctx.lineTo(E.cx + 8, E.ventY - 30 * EG.PS); ctx.stroke();
    D.label(gx2, gy2, '화산 가스', { bg: '#e8f4ff', color: '#1e6aa8', border: '#8fd0ff', size: 14, pad: 9, align: 'left' });
    D.text(gx2 + 2, gy2 + 22, '(수증기 · CO₂ · SO₂)', { size: 12.5, weight: 800, color: '#1e6aa8', align: 'left' });
    D.text(12, VH - 10, '화산의 높이와 땅속 그림은 보기 쉽게 과장했어요.', { size: 12, weight: 700, color: '#f5e9dc', align: 'left' });
  }

  function drawAsh(t) {
    const E = EG, H = S.plumeH * E.kmPx;
    if (H < 2) return;
    const big = Math.min(1, Math.max(0, (S.plumeH - TROPO) / 20));
    ASH.forEach((p) => {
      const u = p.a / p.life;
      const rise = 1 - Math.pow(1 - Math.min(1, u * 1.15), 2.2);
      const h = H * p.rf * rise;
      const y = E.ventY - h;
      const colW = (5 + h * 0.07) * (PHONE ? 1.2 : 1);
      const frac = H > 0 ? h / H : 0;
      let umb = 0;
      if (S.plumeH > TROPO && p.rf > 0.78) umb = smooth(u, 0.4, 1) * big * Math.min(E.hw * 1.0, H * 0.42) * frac * frac;
      const wind = smooth(frac, 0.45, 1) * (S.plumeH > TROPO ? 14 : 34) * E.PS * (0.6 + 0.4 * p.sd);
      const x = E.cx + p.dx * (colW + umb) + wind;
      const size = (10 + 25 * smooth(u, 0, 0.8) + 4 * (S.vei - 3)) * (PHONE ? 1.25 : 1);
      const a = smooth(u, 0, 0.12) * (1 - smooth(u, 0.8, 1)) * 0.72;
      if (a < 0.01) return;
      ctx.globalAlpha = a;
      ctx.drawImage(p.sd < 0.55 ? SP_DARK : SP_MID, x - size, y - size, size * 2, size * 2);
    });
    ctx.globalAlpha = 1;
  }

  /* ======================================================
     ② 영향 연쇄 장면 (지구를 감싸는 에어로졸 · 기온 그래프 · 연쇄 도식)
     ====================================================== */
  const CL = PHONE
    ? { globe: { x: 12, y: 12, w: 576, h: 332 }, graph: { x: 12, y: 356, w: 576, h: 268 }, chain: { x: 12, y: 636, w: 576, h: 212 } }
    : { globe: { x: 12, y: 12, w: 380, h: 332 }, graph: { x: 404, y: 12, w: 384, h: 332 }, chain: { x: 12, y: 356, w: 776, h: 192 } };
  const NODES = [
    { ic: '🌋', a: '화산 분출', b: '', tag: '지권', col: '#a16207', thr: 0 },
    { ic: '☁️', a: '에어로졸', b: '햇빛 차단', tag: '기권', col: '#0ea5e9', thr: 1 },
    { ic: '🌡️', a: '기온 하강', b: '', tag: '기권', col: '#0ea5e9', thr: 3 },
    { ic: '🌾', a: '농작물', b: '피해', tag: '생물권', col: '#16a34a', thr: 4 },
    { ic: '🍞', a: '식량 부족', b: '', tag: '인간 사회', col: '#7c3aed', thr: 5 },
  ];
  const BRANCH = { ic: '🌧️', a: '산성비', b: '이산화 황이 빗물에 녹아요', tag: '기권 → 수권 · 지권', col: '#2563eb', thr: 2 };
  const ip = (key) => { const a = Math.min(6, Math.floor(S.tView + 1e-6)), b = Math.min(6, a + 1), f = clamp(S.tView - a, 0, 1); return lerp(STOPS[a][key], STOPS[b][key], f); };
  const CONT = [[-0.38, -0.22, 0.3, 0.2, 0.4], [0.24, 0.08, 0.26, 0.4, -0.3], [-0.1, 0.5, 0.24, 0.13, 0.1], [0.52, -0.42, 0.16, 0.1, 0.5], [-0.62, 0.18, 0.1, 0.18, 0]];

  function stepChain(dt) {
    S.tView = AP(S.tView, S.tIdx, dt, 5);
    if (Math.abs(S.tView - S.tIdx) < 0.004) S.tView = S.tIdx;
    NODES.concat([BRANCH]).forEach((n, i) => {
      const target = S.tIdx >= n.thr ? 1 : 0;
      S.litA[i] = AP(S.litA[i], target, dt, 7);
    });
    S.pulse += dt;
  }

  function drawGlobe(r, t) {
    panel(r.x, r.y, r.w, r.h);
    D.text(r.x + 14, r.y + 24, '🌍 에어로졸이 지구를 감싸요', { size: 15, weight: 800, color: '#1b2333', align: 'left' });
    const R = Math.min(r.h * 0.27, r.w * 0.2) * (PHONE ? 1.05 : 1), gx = r.x + r.w * 0.56, gy = r.y + r.h * 0.46, Rr = R + 13 * FS;
    const am = ip('am'), cv = ip('cv');
    // 지구
    ctx.save();
    ctx.beginPath(); ctx.arc(gx, gy, R, 0, Math.PI * 2); ctx.clip();
    let g = ctx.createRadialGradient(gx - R * 0.4, gy - R * 0.4, R * 0.1, gx, gy, R);
    g.addColorStop(0, '#5aa9ee'); g.addColorStop(1, '#1f5fae');
    ctx.fillStyle = g; ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
    ctx.fillStyle = '#58b368';
    CONT.forEach(([cx0, cy0, rx, ry, rot]) => { ctx.beginPath(); ctx.ellipse(gx + cx0 * R, gy + cy0 * R, rx * R, ry * R, rot, 0, Math.PI * 2); ctx.fill(); });
    g = ctx.createLinearGradient(gx - R, 0, gx + R, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(10,20,60,.45)');
    ctx.fillStyle = g; ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
    ctx.restore();
    // 화산 표시 (지구 위, 햇빛을 받는 왼쪽 위)
    const tv = (200 * Math.PI) / 180, vx = gx + Math.cos(tv) * R, vy = gy + Math.sin(tv) * R;
    ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(vx - 8 * FS, vy + 3); ctx.lineTo(vx, vy - 12 * FS); ctx.lineTo(vx + 8 * FS, vy + 3); ctx.closePath(); ctx.fill();
    D.glow(vx, vy - 12 * FS, 8 * FS, '#ff8a2a', 0.8);
    // 에어로졸 층
    const half = clamp(cv, 0.02, 1) * Math.PI;
    if (am > 0.01 || S.tIdx === 0) {
      ctx.save();
      ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(214,160,60,' + (0.28 + 0.42 * am) + ')';
      ctx.lineWidth = (4 + 12 * am) * FS;
      ctx.beginPath();
      if (cv >= 0.999) ctx.arc(gx, gy, Rr, 0, Math.PI * 2); else ctx.arc(gx, gy, Rr, tv - half, tv + half);
      ctx.stroke(); ctx.restore();
      const n = Math.round(10 + 70 * clamp(cv, 0, 1) * (0.5 + 0.5 * am));
      for (let i = 0; i < n; i++) {
        const a = cv >= 0.999 ? (i / n) * Math.PI * 2 : tv - half + (2 * half) * ((i + 0.5) / n);
        const rad = Rr + Math.sin(a * 7 + t * 1.2 + i) * 3 * FS;
        const sz = (5 + 9 * am) * FS;
        ctx.globalAlpha = 0.35 + 0.3 * am;
        ctx.drawImage(SP_AERO, gx + Math.cos(a) * rad - sz, gy + Math.sin(a) * rad - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
    }
    // 햇빛 화살표 (오른쪽 방향)
    const angDiff = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
    D.text(r.x + 18, gy - R - 20 * FS, '☀️ 햇빛', { size: 14, weight: 800, color: '#b45309', align: 'left' });
    for (let k = -2; k <= 2; k++) {
      const dy = k * R * 0.42, sx = r.x + 16;
      const xe = gx - Math.sqrt(Math.max(0, R * R - dy * dy)), xr = gx - Math.sqrt(Math.max(0, Rr * Rr - dy * dy));
      const aHit = Math.atan2(dy, xr - gx);
      const covered = cv >= 0.999 || angDiff(aHit, tv) <= half;
      const yy = gy + dy;
      if (covered && am > 0.02) {
        D.arrow(sx, yy, xr - 2, yy, { color: '#f5a60b', width: 5, head: 11 });
        const wTr = Math.max(1.2, 5 * (1 - 0.6 * am));
        D.arrow(xr + 2, yy, xe - 1, yy, { color: '#f5a60b', width: wTr, head: Math.max(7, wTr * 2.4), alpha: 0.95 });
        D.arrow(xr, yy, xr - 30 * FS, yy - 24 * FS, { color: '#f59e0b', width: Math.max(1.2, 5 * 0.6 * am), head: 8, alpha: 0.8 });
      } else {
        D.arrow(sx, yy, xe - 1, yy, { color: '#f5a60b', width: 5, head: 11 });
      }
    }
    // 설명
    const stp = STOPS[S.tIdx];
    D.label(gx, r.y + r.h - 70 * FS, stp.long + ' · 에어로졸이 퍼진 곳: ' + stp.where, { bg: '#fff7e6', color: '#8a4b00', border: '#f5c36b', size: 13, pad: 9 });
    textBlock(stp.txt, r.x + r.w / 2, r.y + r.h - 38 * FS, r.w - 32, { size: 13.5, weight: 700, color: '#2b3445', align: 'center' });
  }

  function drawGraph(r, t) {
    panel(r.x, r.y, r.w, r.h);
    D.text(r.x + 14, r.y + 24, '🌡️ 지구 평균 기온의 변화', { size: 15, weight: 800, color: '#1b2333', align: 'left' });
    const L = { x: r.x + 56 * (PHONE ? 1.1 : 1), y: r.y + 44, w: r.w - 56 * (PHONE ? 1.1 : 1) - 20, h: r.h - 44 - 56 * FS };
    const yMax = 0.1, yMin = -0.6;
    const px = (i) => L.x + (L.w * i) / 6;
    const py = (v) => L.y + (L.h * (yMax - v)) / (yMax - yMin);
    // 격자
    ctx.strokeStyle = '#e6ebf3'; ctx.lineWidth = 1;
    [0, -0.2, -0.4, -0.6].forEach((v) => { ctx.beginPath(); ctx.moveTo(L.x, py(v)); ctx.lineTo(L.x + L.w, py(v)); ctx.stroke(); D.text(L.x - 7, py(v) + 4.5, fmtT(v), { size: 12.5, weight: 700, color: '#475569', align: 'right' }); });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(L.x, py(0)); ctx.lineTo(L.x + L.w, py(0)); ctx.stroke();
    D.text(L.x + L.w - 2, py(0) - 7, '분출 전 평균 기온', { size: 12, weight: 800, color: '#64748b', align: 'right' });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(L.x, L.y + L.h); ctx.stroke();
    STOPS.forEach((s, i) => {
      D.text(px(i), L.y + L.h + 17 * FS, s.k, { size: 12.5, weight: i === S.tIdx ? 800 : 700, color: i === S.tIdx ? '#0f172a' : '#64748b' });
      ctx.strokeStyle = i === S.tIdx ? 'rgba(14,165,233,.5)' : '#eef2f7'; ctx.lineWidth = i === S.tIdx ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(px(i), L.y); ctx.lineTo(px(i), L.y + L.h); ctx.stroke();
    });
    D.text(L.x + L.w / 2, L.y + L.h + 38 * FS, '분출 뒤 시간 (눈금 간격은 같지 않아요)', { size: 12.5, weight: 700, color: '#64748b' });
    ctx.save(); ctx.translate(r.x + 14, L.y + L.h / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, '기온 변화 (°C)', { size: 12.5, weight: 800, color: '#475569' }); ctx.restore();
    // 곡선 (지금 시점까지)
    ctx.save();
    ctx.beginPath(); ctx.rect(L.x - 2, L.y - 4, L.w + 4, L.h + 8); ctx.clip();
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    const last = S.tView;
    for (let i = 0; i <= Math.floor(last + 1e-6); i++) { i === 0 ? ctx.moveTo(px(0), py(STOPS[0].dT)) : ctx.lineTo(px(i), py(STOPS[i].dT)); }
    const fl = Math.floor(last + 1e-6);
    if (last - fl > 1e-4 && fl < 6) ctx.lineTo(px(last), py(lerp(STOPS[fl].dT, STOPS[fl + 1].dT, last - fl)));
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i <= Math.floor(last + 1e-6); i++) { D.sphere(px(i), py(STOPS[i].dT), 5 * FS, '#0ea5e9', { gloss: false }); }
    // 현재 값 표시
    const cur = STOPS[S.tIdx];
    const mx = px(S.tView), my = py(ip('dT'));
    D.sphere(mx, my, 8 * FS, '#e2464b', { shadow: true });
    const bx = clamp(mx, L.x + 44, L.x + L.w - 44), by = my + (my > L.y + L.h - 40 ? -26 : 26);
    D.label(bx, by, fmtT(cur.dT) + ' °C', { bg: '#e2464b', size: 14, pad: 9 });
  }

  function drawNode(x, y, w, h, n, lit, extra) {
    const pop = RM ? 1 : 0.9 + 0.1 * SciSim.ease.outBack(clamp(lit, 0, 1));
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(pop, pop); ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = 0.38 + 0.62 * lit;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(0, 0, w, h, 12).fill(); }, { blur: lit > 0.5 ? 10 : 3, y: 3 });
    ctx.strokeStyle = lit > 0.5 ? n.col : '#cbd5e1'; ctx.lineWidth = lit > 0.5 ? 3 : 1.5; rr(0, 0, w, h, 12).stroke();
    ctx.font = font(24); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(n.ic, w / 2, h * 0.24);
    D.text(w / 2, h * 0.5, n.a, { size: 13.5, weight: 800, color: '#1b2333', baseline: 'middle' });
    const sub = extra || n.b;
    if (sub) D.text(w / 2, h * 0.5 + 16 * FS, sub, { size: 12, weight: 700, color: extra ? '#be123c' : '#475569', baseline: 'middle' });
    D.label(w / 2, h - 13 * FS, n.tag, { bg: n.col, size: 11.5, pad: 7 });
    ctx.restore();
  }
  function drawChain(r, t) {
    panel(r.x, r.y, r.w, r.h, { fill: '#f8fbff' });
    D.text(r.x + 14, r.y + 22, '🔗 한 권역의 변화가 다른 권역으로 이어져요', { size: 14.5, weight: 800, color: '#1b2333', align: 'left' });
    const nw = PHONE ? 94 : 118, gap = (r.w - 24 - 5 * nw) / 4, nh = PHONE ? 100 : 88, ny = r.y + 38;
    const xs = NODES.map((_, i) => r.x + 12 + i * (nw + gap));
    NODES.forEach((n, i) => {
      if (i > 0) {
        const lit = Math.min(S.litA[i], S.litA[i - 1]);
        D.arrow(xs[i - 1] + nw + 3, ny + nh * 0.42, xs[i] - 3, ny + nh * 0.42, { color: lit > 0.5 ? '#334155' : '#cbd5e1', width: 3, head: 9 });
      }
      drawNode(xs[i], ny, nw, nh, n, S.litA[i], i === 2 && S.tIdx >= 3 ? fmtT(STOPS[S.tIdx].dT) + ' °C' : '');
    });
    // 곁가지: 산성비
    const bw = PHONE ? 300 : 250, bh = PHONE ? 50 : 46, bx = xs[1] - (PHONE ? 4 : 16), by = ny + nh + (PHONE ? 12 : 10);
    const bl = S.litA[5];
    D.arrow(xs[0] + nw / 2 + 4, ny + nh + 2, bx - 3, by + bh / 2, { color: bl > 0.5 ? '#334155' : '#cbd5e1', width: 3, head: 9 });
    ctx.save(); ctx.globalAlpha = 0.38 + 0.62 * bl;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(bx, by, bw, bh, 12).fill(); }, { blur: bl > 0.5 ? 10 : 3, y: 3 });
    ctx.strokeStyle = bl > 0.5 ? BRANCH.col : '#cbd5e1'; ctx.lineWidth = bl > 0.5 ? 3 : 1.5; rr(bx, by, bw, bh, 12).stroke();
    ctx.font = font(22); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(BRANCH.ic, bx + 10, by + bh / 2);
    D.text(bx + 44 * FS, by + bh * 0.32, BRANCH.a + ' (' + BRANCH.tag + ')', { size: 13.5, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
    D.text(bx + 44 * FS, by + bh * 0.72, BRANCH.b, { size: 12, weight: 700, color: '#475569', align: 'left', baseline: 'middle' });
    ctx.restore();
    if (!PHONE) D.text(r.x + r.w - 12, by + bh / 2 + 2, '시간 슬라이더를 움직이면 차례로 켜져요', { size: 12.5, weight: 700, color: '#64748b', align: 'right', baseline: 'middle' });
  }
  function drawChainScene(t) {
    ctx.fillStyle = '#eef5fb'; ctx.fillRect(0, 0, VW, VH);
    drawGlobe(CL.globe, t); drawGraph(CL.graph, t); drawChain(CL.chain, t);
  }

  /* ======================================================
     카드 판 (끌어 놓기) - 분류판 · 피해 조사 표 공통
     ====================================================== */
  let ORD = 0;
  const BOARD = { sort: { chips: [], zones: [] }, cases: { chips: [], zones: [] } };
  function mkChip(id, text, extra) {
    return Object.assign({ id, text, x: VW / 2, y: VH + 40, tx: VW / 2, ty: VH - 60, w: 160, h: 44, tw: 160, th: 44, zone: null, ord: 0, bad: false, shake: 0, lift: 0, home: { x: VW / 2, y: VH - 60, w: 160, h: 44 }, fs: 13 }, extra || {});
  }
  function shuffled(arr, seed) { const a = arr.slice(); let s = seed; for (let i = a.length - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  BOARD.sort.chips = shuffled(CARDS, 11).map((c) => mkChip(c.id, c.t, { bin: c.bin }));
  BOARD.cases.chips = shuffled(CHIPS_CASE, 7).map((c) => mkChip(c.id, c.t, { cs: c.cs, kind: c.kind }));

  function layoutSort() {
    const B = BOARD.sort;
    const zones = [];
    if (!PHONE) {
      const bw = (VW - 24 - 4 * 8) / 5;
      BINS.forEach((b, i) => zones.push({ id: b.id, x: 12 + i * (bw + 8), y: 58, w: bw, h: 276 }));
      B.chips.forEach((c, i) => { const col = i % 4, row = Math.floor(i / 4); c.home = { x: 27 + 88 + col * 190, y: 364 + 24 + row * 57, w: 176, h: 48 }; });
    } else {
      const bw = (VW - 24 - 16) / 3;
      BINS.forEach((b, i) => zones.push({ id: b.id, x: 12 + (i % 3) * (bw + 8), y: 66 + Math.floor(i / 3) * 208, w: bw, h: 198 }));
      B.chips.forEach((c, i) => { const col = i % 2, row = Math.floor(i / 2); c.home = { x: 12 + 140 + col * 296, y: 496 + 25 + row * 58, w: 280, h: 50 }; });
    }
    B.zones = zones;
    zones.forEach((z) => {
      const list = B.chips.filter((c) => c.zone === z.id).sort((a, b) => a.ord - b.ord);
      const ch = PHONE ? 52 : 46, n = list.length;
      const step = n > 1 ? Math.min(ch + 5, (z.h - 40 - ch) / (n - 1)) : 0;
      list.forEach((c, i) => { c.tx = z.x + z.w / 2; c.ty = z.y + 36 + ch / 2 + i * step; c.tw = z.w - 14; c.th = ch; c.fs = 13; });
    });
    B.chips.forEach((c) => { if (!c.zone) { c.tx = c.home.x; c.ty = c.home.y; c.tw = c.home.w; c.th = c.home.h; c.fs = 14; } });
  }
  function layoutCases() {
    const B = BOARD.cases;
    const zones = [];
    const T = caseGeo();
    CASES.forEach((cs, r) => ['env', 'soc'].forEach((k, cI) => zones.push({ id: cs.id + '-' + k, cs: cs.id, kind: k, x: T.cx[cI], y: T.ry[r], w: T.cw, h: T.rh })));
    B.zones = zones;
    B.chips.forEach((c, i) => {
      if (c.zone) {
        const z = zones.find((q) => q.id === c.zone);
        c.tx = z.x + z.w / 2; c.ty = z.y + z.h / 2; c.tw = z.w - 8; c.th = z.h - 8; c.fs = 12.5;
      } else {
        const g = T.tray(i);
        c.home = g; c.tx = g.x; c.ty = g.y; c.tw = g.w; c.th = g.h; c.fs = 13;
      }
    });
  }
  function caseGeo() {
    if (!PHONE) {
      const x0 = 12, rowH = 128, cw = 217, hh = 30;
      return { tabY: 12, tabH: 40, info: { x: 12, y: 60, w: 776, h: 178 }, tx: x0, ty: 250, hh, rowHead: 124,
        cx: [x0 + 128, x0 + 128 + cw + 4], cw, rh: 56, ry: [250 + hh + 3, 250 + hh + 3 + 60, 250 + hh + 3 + 120], tableW: 128 + 2 * cw + 4,
        tray: (i) => ({ x: 592 + 98, y: 270 + 21 + i * 46, w: 196, h: 40 }) };
    }
    return { tabY: 12, tabH: 46, info: { x: 12, y: 66, w: 576, h: 252 }, tx: 12, ty: 330, hh: 36, rowHead: 112,
      cx: [12 + 116, 12 + 116 + 228 + 4], cw: 228, rh: 64, ry: [330 + 36 + 3, 330 + 36 + 3 + 68, 330 + 36 + 3 + 136], tableW: 116 + 2 * 228 + 4,
      tray: (i) => ({ x: 12 + 140 + (i % 2) * 296, y: 590 + 28 + Math.floor(i / 2) * 62, w: 280, h: 54 }) };
  }
  const activeBoard = () => (S.mode === 'sort' ? BOARD.sort : S.mode === 'cases' ? BOARD.cases : null);
  const relayout = () => { layoutSort(); layoutCases(); };
  function stepChips(dt) {
    ['sort', 'cases'].forEach((k) => BOARD[k].chips.forEach((c) => {
      const dragging = S.drag && S.drag.c === c;
      if (!dragging) { c.x = AP(c.x, c.tx, dt, 14); c.y = AP(c.y, c.ty, dt, 14); }
      c.w = AP(c.w, c.tw, dt, 14); c.h = AP(c.h, c.th, dt, 14);
      c.lift = AP(c.lift, dragging ? 1 : 0, dt, 16);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
    }));
  }
  function zoneAt(board, p) { return board.zones.find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) || null; }
  function placeChip(board, c, z) {
    if (!z) { c.zone = null; c.bad = false; layoutAll(); return; }
    if (S.mode === 'cases' || board === BOARD.cases) {
      const other = board.chips.find((q) => q !== c && q.zone === z.id);
      if (other) { other.zone = c.zone || null; other.bad = false; }
    }
    c.zone = z.id; c.ord = ++ORD; c.bad = false;
    layoutAll();
    parts.burst(c.tx, c.ty, { count: 5, speed: 70, size: 2.5, life: 0.45, gravity: 80 });
    Sound.tick();
  }
  function layoutAll() { relayout(); }
  function chipAt(board, p) {
    for (let i = board.chips.length - 1; i >= 0; i--) { const c = board.chips[i]; if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; }
    return null;
  }
  function drawChip(c, t, okState) {
    const lift = c.lift;
    ctx.save();
    const sx = c.shake > 0 ? Math.sin(c.shake * 60) * 4 * (c.shake / 0.5) : 0;
    ctx.translate(c.x + sx, c.y - 3 * lift);
    ctx.scale(1 + 0.05 * lift, 1 + 0.05 * lift);
    const w = c.w, h = c.h;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(-w / 2, -h / 2, w, h, 10).fill(); }, { blur: 6 + 12 * lift, y: 2 + 6 * lift, color: 'rgba(20,40,80,.28)' });
    const selected = S.selChip === c;
    ctx.lineWidth = selected || c.bad ? 3 : 1.8;
    ctx.strokeStyle = c.bad ? '#e2464b' : okState ? '#14a058' : selected ? '#0ea5e9' : '#b9c6da';
    rr(-w / 2, -h / 2, w, h, 10).stroke();
    if (selected && !RM) { ctx.strokeStyle = 'rgba(14,165,233,.35)'; ctx.lineWidth = 6; rr(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 12).stroke(); }
    const lines = wrap(c.text, w - 14, font(c.fs, 800));
    const lh = c.fs * 1.28 * FS;
    lines.forEach((ln, i) => D.text(0, (i - (lines.length - 1) / 2) * lh, ln, { size: c.fs, weight: 800, color: c.bad ? '#a3262b' : '#1b2333', baseline: 'middle' }));
    ctx.restore();
  }
  function drawChips(board, t, okFn) {
    board.chips.forEach((c) => { if (!(S.drag && S.drag.c === c)) drawChip(c, t, okFn && okFn(c)); });
    if (S.drag) drawChip(S.drag.c, t, false);
  }

  /* ---------- ② 영향 카드 분류판 ---------- */
  function drawSort(t) {
    ctx.fillStyle = '#eef5fb'; ctx.fillRect(0, 0, VW, VH);
    const B = BOARD.sort;
    D.text(VW / 2, 30, '영향 카드를 알맞은 권역에 놓아요', { size: 17, weight: 800, color: '#1b2333', baseline: 'middle' });
    const hz = S.drag ? zoneAt(B, S.drag.p) : null;
    B.zones.forEach((z) => {
      const b = BIN[z.id];
      D.shadow(() => { ctx.fillStyle = rgba(b.color, hz === z ? 0.2 : 0.09); rr(z.x, z.y, z.w, z.h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(20,40,80,.12)' });
      ctx.strokeStyle = S.sortOK ? '#14a058' : b.color; ctx.lineWidth = hz === z ? 3.5 : 2; ctx.setLineDash(hz === z ? [] : [7, 5]); rr(z.x, z.y, z.w, z.h, 14).stroke(); ctx.setLineDash([]);
      D.text(z.x + z.w / 2, z.y + 19, b.icon + ' ' + b.name, { size: 15, weight: 800, color: b.color, baseline: 'middle' });
    });
    if (PHONE) { const z = B.zones[4]; D.text(z.x + z.w + 12 + (VW - 24 - 16) / 6, z.y + 60, '카드를 끌어서', { size: 13, weight: 700, color: '#64748b', baseline: 'middle' }); D.text(z.x + z.w + 12 + (VW - 24 - 16) / 6, z.y + 84, '칸에 놓아요', { size: 13, weight: 700, color: '#64748b', baseline: 'middle' }); }
    const unplaced = B.chips.filter((c) => !c.zone).length;
    if (!PHONE) { D.text(VW / 2, 350, unplaced ? '아래 카드 ' + unplaced + '장이 남았어요' : '카드를 모두 놓았어요 — 확인하기를 눌러요', { size: 13, weight: 700, color: '#64748b', baseline: 'middle' }); }
    drawChips(B, t, S.sortOK ? (c) => c.zone === c.bin : null);
  }

  /* ---------- ③ 피해 조사 ---------- */
  function drawCasePic(cs, x, y, w, h, t) {
    ctx.save();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#dbeafe'); g.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = g; rr(x, y, w, h, 12).fill();
    ctx.clip();
    const gy = y + h * 0.82;
    ctx.fillStyle = '#86c78c'; ctx.fillRect(x, gy, w, h);
    // 산
    ctx.fillStyle = '#6b5a50'; ctx.beginPath(); ctx.moveTo(x + w * 0.18, gy); ctx.lineTo(x + w * 0.42, y + h * 0.34); ctx.lineTo(x + w * 0.66, gy); ctx.closePath(); ctx.fill();
    if (cs.id === 'tambora') {
      for (let i = 0; i < 9; i++) { const a = 0.4 + 0.4 * Math.sin(t * 1.5 + i); ctx.globalAlpha = 0.4 + 0.3 * a; ctx.drawImage(SP_DARK, x + w * 0.2 + i * w * 0.07, y + h * (0.04 + 0.12 * (i % 3)), 40, 40); }
      ctx.globalAlpha = 1; ctx.font = font(24); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('❄️', x + w * 0.82, y + h * 0.3); ctx.fillText('🌾', x + w * 0.82, gy - 4);
    } else if (cs.id === 'krakatoa') {
      ctx.fillStyle = '#2f74c4'; ctx.fillRect(x, gy - 8, w, h);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let px = 0; px <= w; px += 6) { const yy = gy - 8 - k * 12 + Math.sin(px * 0.08 - t * 3 + k) * (4 + k * 2); px === 0 ? ctx.moveTo(x + px, yy) : ctx.lineTo(x + px, yy); } ctx.stroke(); }
      ctx.font = font(24); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('🏘️', x + w * 0.86, gy - 14);
    } else {
      for (let i = 0; i < 8; i++) { ctx.globalAlpha = 0.45; ctx.drawImage(SP_MID, x + w * 0.1 + i * w * 0.1 + Math.sin(t + i) * 4, y + h * 0.08 + (i % 2) * 14, 44, 44); }
      ctx.globalAlpha = 1; ctx.font = font(26); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('✈️', x + w * 0.78 + (RM ? 0 : Math.sin(t * 1.4) * 8), y + h * 0.28);
      ctx.fillText('🧊', x + w * 0.88, gy - 6);
    }
    ctx.restore();
  }
  function drawCases(t) {
    const T = caseGeo(), B = BOARD.cases;
    ctx.fillStyle = '#eef5fb'; ctx.fillRect(0, 0, VW, VH);
    // 탭
    const tw = (VW - 24 - 16) / 3;
    CASES.forEach((cs, i) => {
      const x = 12 + i * (tw + 8), on = S.selCase === i;
      D.shadow(() => { ctx.fillStyle = on ? cs.color : '#fff'; rr(x, T.tabY, tw, T.tabH, 12).fill(); }, { blur: on ? 8 : 4, y: 2 });
      if (!on) { ctx.strokeStyle = S.seenCase.has(i) ? '#14a058' : '#c3cedf'; ctx.lineWidth = 2; rr(x, T.tabY, tw, T.tabH, 12).stroke(); }
      D.text(x + tw / 2, T.tabY + T.tabH / 2, (S.seenCase.has(i) && !on ? '✓ ' : '') + (PHONE ? cs.tabShort : cs.tab), { size: PHONE ? 13.5 : 15, weight: 800, color: on ? '#fff' : '#334155', baseline: 'middle' });
    });
    // 자료 패널
    const cs = CASES[S.selCase], I = T.info;
    panel(I.x, I.y, I.w, I.h);
    D.label(I.x + 14, I.y + 22, cs.vei, { bg: cs.color, size: 13, align: 'left', pad: 9 });
    D.text(I.x + 14 + 70 * FS, I.y + 22, cs.title, { size: 14.5, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
    const textW = PHONE ? I.w - 28 : I.w - 28 - 220;
    let yy = I.y + 56;
    ctx.globalAlpha = 1;
    cs.facts.forEach((f) => {
      D.sphere(I.x + 20, yy, 4 * FS, cs.color, { gloss: false });
      const hgt = textBlock(f, I.x + 34, yy, textW - 20, { size: 14.5, weight: 700, color: '#2b3445' });
      yy += Math.max(hgt, 22) + (PHONE ? 12 : 10);
    });
    if (!PHONE) drawCasePic(cs, I.x + I.w - 220, I.y + 10, 208, I.h - 20, t);
    // 표
    const hh = T.hh;
    ['환경 피해', '사회경제적 피해'].forEach((h, i) => {
      D.shadow(() => { ctx.fillStyle = i ? '#7c3aed' : '#16a34a'; rr(T.cx[i], T.ty, T.cw, hh, 8).fill(); }, { blur: 3, y: 1 });
      D.text(T.cx[i] + T.cw / 2, T.ty + hh / 2, (i ? '🏙️ ' : '🌳 ') + h, { size: 14, weight: 800, color: '#fff', baseline: 'middle' });
    });
    D.text(T.tx + 60 * (PHONE ? 1 : 1), T.ty + hh / 2, '사례', { size: 13.5, weight: 800, color: '#64748b', baseline: 'middle' });
    const dz = S.drag ? zoneAt(B, S.drag.p) : null;
    CASES.forEach((c2, r) => {
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(T.tx, T.ry[r], T.rowHead - 4, T.rh, 8).fill(); }, { blur: 3, y: 1 });
      ctx.strokeStyle = S.selCase === r ? c2.color : '#cbd5e1'; ctx.lineWidth = S.selCase === r ? 3 : 1.5; rr(T.tx, T.ry[r], T.rowHead - 4, T.rh, 8).stroke();
      D.text(T.tx + (T.rowHead - 4) / 2, T.ry[r] + T.rh / 2 - 8 * FS, c2.tab.split(' ')[0], { size: 13, weight: 800, color: c2.color, baseline: 'middle' });
      D.text(T.tx + (T.rowHead - 4) / 2, T.ry[r] + T.rh / 2 + 9 * FS, c2.tabShort, { size: 13, weight: 800, color: '#1b2333', baseline: 'middle' });
    });
    B.zones.forEach((z) => {
      ctx.fillStyle = dz === z ? 'rgba(14,165,233,.16)' : 'rgba(255,255,255,.7)'; rr(z.x, z.y, z.w, z.h, 8).fill();
      ctx.strokeStyle = S.caseOK ? '#14a058' : dz === z ? '#0ea5e9' : '#b9c6da'; ctx.lineWidth = dz === z ? 3 : 1.8; ctx.setLineDash(dz === z || S.caseOK ? [] : [6, 5]); rr(z.x, z.y, z.w, z.h, 8).stroke(); ctx.setLineDash([]);
    });
    const left = B.chips.filter((c) => !c.zone).length;
    if (!PHONE) D.text(592 + 98, 256, left ? '카드 ' + left + '장 남음' : '모두 놓았어요', { size: 13, weight: 800, color: '#64748b', baseline: 'middle' });
    else D.text(VW / 2, 578, left ? '아래 카드를 표에 끌어 놓아요 (' + left + '장 남음)' : '카드를 모두 놓았어요', { size: 13, weight: 700, color: '#64748b', baseline: 'middle' });
    drawChips(B, t, S.caseOK ? (c) => c.zone === c.cs + '-' + c.kind : null);
  }
  function selectCase(i) {
    if (S.selCase === i) return;
    S.selCase = i; S.seenCase.add(i); Sound.click();
  }

  /* ======================================================
     ④ 대책 수립 장면 (화산 도시 · 시나리오 3개)
     ====================================================== */
  const CG = (() => {
    if (!PHONE) {
      const MP = { x: 12, y: 12, w: 776, h: 330 }, RP = { x: 12, y: 354, w: 776, h: 194 };
      return { MP, RP, vx: 400, cy: 48, bw: 100, bh: 62, gx0: 126, gy0: 144, gapX: 12, gapY: 10, band: { y: 290, h: 52 }, shx: [190, 400, 610] };
    }
    const MP = { x: 12, y: 12, w: 576, h: 430 }, RP = { x: 12, y: 454, w: 576, h: 394 };
    return { MP, RP, vx: 300, cy: 70, bw: 100, bh: 78, gx0: 28, gy0: 186, gapX: 11, gapY: 14, band: { y: 380, h: 62 }, shx: [120, 300, 480] };
  })();
  const blockRect = (b) => ({ x: CG.gx0 + (b % 5) * (CG.bw + CG.gapX), y: CG.gy0 + Math.floor(b / 5) * (CG.bh + CG.gapY), w: CG.bw, h: CG.bh });
  const DOTS = [];
  for (let b = 0; b < 10; b++) {
    const r = blockRect(b);
    for (let j = 0; j < 10; j++) {
      const hx = r.x + r.w * (0.12 + 0.19 * (j % 5)), hy = r.y + r.h * (j < 5 ? 0.36 : 0.7);
      DOTS.push({ b, hx, hy, x: hx, y: hy, st: 'home', t0: 0, dur: 1.3, tx: hx, ty: hy, sx: hx, sy: hy, sc: -1 });
    }
  }
  const crater = () => ({ x: CG.vx, y: CG.cy + 8 });
  const selPoints = () => MORDER.reduce((a, m) => a + (S.sel.has(m) ? MEAS[m].cost : 0), 0);

  function resetDots() {
    DOTS.forEach((d) => { d.x = d.hx; d.y = d.hy; d.st = 'home'; d.sc = -1; });
  }
  function startRun(si, instant) {
    if (S.run && !S.run.done) return;
    resetDots();
    const sc = SCEN[si], res = cityResult(si, S.sel);
    const cr = crater();
    const inFp = DOTS.filter((d) => sc.blocks.includes(d.b)).sort((a, b) => Math.hypot(a.hx - cr.x, a.hy - cr.y) - Math.hypot(b.hx - cr.x, b.hy - cr.y));
    const victims = inFp.slice(0, res.dots), evac = inFp.slice(res.dots);
    const dest = [];
    const nS = S.sel.has('shelter') ? 3 : 0;
    evac.forEach((d, k) => {
      let tx, ty;
      if (nS) { const sx = CG.shx[k % 3]; tx = sx + rnd(-30, 30); ty = CG.band.y + CG.band.h * 0.8 + rnd(-5, 5); }
      else { tx = CG.MP.x + 30 + ((k + 0.5) / Math.max(1, evac.length)) * (CG.MP.w - 60) + rnd(-6, 6); ty = CG.band.y + CG.band.h * 0.62 + rnd(-8, 8); }
      d.sx = d.hx; d.sy = d.hy; d.tx = clamp(tx, CG.MP.x + 12, CG.MP.x + CG.MP.w - 12); d.ty = ty;
      dest.push(d);
    });
    const warnAt = S.sel.has('monitor') ? 0.2 : 1.9;
    evac.forEach((d, k) => { d.st = 'wait'; d.t0 = warnAt + (S.sel.has('drill') ? 0.1 : 0.55) * Math.random() + (S.sel.has('drill') ? 0 : 0.5 * (k % 3) * 0.2); d.dur = S.sel.has('drill') ? 1.2 : 1.7; });
    victims.forEach((d) => { d.sc = si; });
    S.run = { si, t: 0, res, victims, evac, front0: 1.0, dur: sc.dur, warnAt, done: false, shownDone: false };
    if (instant) { S.run.t = 99; finishRun(); }
    Sound.click();
  }
  function finishRun() {
    const R = S.run; if (!R || R.done) return;
    R.done = true;
    S.res[R.si] = Object.assign({ sig: [...S.sel].sort().join(',') }, R.res);
    R.evac.forEach((d) => { d.st = 'safe'; d.x = d.tx; d.y = d.ty; });
    R.victims.forEach((d) => { d.st = 'dead'; });
    S.cityFlash = 1;
    Sound[R.res.ok ? 'success' : 'fail']();
    updateCtl();
  }
  function stepCity(dt) {
    S.cityFlash = AP(S.cityFlash, 0, dt, 2.5);
    const R = S.run;
    if (!R || R.done) return;
    R.t += dt;
    const cr = crater();
    R.evac.forEach((d) => {
      if (R.t < d.t0) return;
      const u = clamp((R.t - d.t0) / d.dur, 0, 1), e = SciSim.ease.inOutCubic(u);
      d.st = u >= 1 ? 'safe' : 'move';
      d.x = lerp(d.sx, d.tx, RM ? 1 : e); d.y = lerp(d.sy, d.ty, RM ? 1 : e);
    });
    const rMax = frontRMax(R.si), prog = clamp((R.t - R.front0) / R.dur, 0, 1), rad = rMax * prog;
    R.victims.forEach((d) => { if (d.st !== 'dead' && Math.hypot(d.hx - cr.x, d.hy - cr.y) <= rad) { d.st = 'dead'; if (!RM) parts.burst(d.hx, d.hy, { count: 6, speed: 70, size: 3, life: 0.5, colors: ['#e2464b', '#fca5a5'], gravity: 100 }); } });
    if (R.t >= R.front0 + R.dur + 0.7) finishRun();
  }
  function frontRMax(si) {
    const cr = crater(); let m = 0;
    SCEN[si].blocks.forEach((b) => { const r = blockRect(b); [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([x, y]) => { m = Math.max(m, Math.hypot(x - cr.x, y - cr.y)); }); });
    return m + 6;
  }
  function fpPath(si) {
    const cr = crater();
    ctx.beginPath();
    let minX = 1e9, maxX = -1e9;
    SCEN[si].blocks.forEach((b) => { const r = blockRect(b); ctx.rect(r.x, r.y, r.w, r.h); minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.w); });
    ctx.moveTo(cr.x, cr.y); ctx.lineTo(minX, CG.gy0); ctx.lineTo(maxX, CG.gy0); ctx.closePath();
  }
  const HZ = [
    { c0: 'rgba(120,110,104,.0)', c1: 'rgba(96,88,82,.62)', edge: 'rgba(70,62,58,.9)' },
    { c0: 'rgba(255,140,40,.0)', c1: 'rgba(230,70,20,.62)', edge: 'rgba(120,20,10,.9)' },
    { c0: 'rgba(140,100,60,.0)', c1: 'rgba(120,84,50,.66)', edge: 'rgba(80,50,28,.9)' },
  ];

  function drawCityMap(t) {
    const M = CG.MP, cr = crater();
    ctx.save();
    rr(M.x, M.y, M.w, M.h, 14).clip();
    // 바탕 (위에서 본 지형)
    let g = ctx.createLinearGradient(0, M.y, 0, M.y + M.h);
    g.addColorStop(0, '#cdbfa8'); g.addColorStop(0.28, '#a9d1a0'); g.addColorStop(1, '#bfe3b6');
    ctx.fillStyle = g; ctx.fillRect(M.x, M.y, M.w, M.h);
    // 강 (이류 길)
    ctx.strokeStyle = '#6aa9dc'; ctx.lineWidth = 14 * FS; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const rv = [[cr.x + 30, cr.y + 30], [cr.x + 120, CG.gy0 - 14], [cr.x + 150, CG.gy0 + CG.bh + 5], [cr.x + 190, CG.band.y - 4]];
    ctx.beginPath(); rv.forEach((p, i) => { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -(RM ? 0 : t * 20);
    ctx.beginPath(); rv.forEach((p, i) => { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.setLineDash([]);
    // 화산 (위에서 본 모습)
    g = ctx.createRadialGradient(cr.x - 10, cr.y - 6, 4, cr.x, cr.y + 10, 96 * FS);
    g.addColorStop(0, '#7a6b5f'); g.addColorStop(1, 'rgba(110,95,84,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cr.x, cr.y + 14, 120 * FS, 62 * FS, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4b4038'; ctx.beginPath(); ctx.ellipse(cr.x, cr.y, 22 * FS, 12 * FS, 0, 0, Math.PI * 2); ctx.fill();
    D.glow(cr.x, cr.y, 26 * FS, '#ff7a1a', 0.7);
    // 위험 지도(칸 색)
    if (S.sel.has('map')) {
      const cnt = new Array(10).fill(0);
      SCEN.forEach((s) => s.blocks.forEach((b) => { cnt[b]++; }));
      for (let b = 0; b < 10; b++) { const r = blockRect(b); if (cnt[b]) { ctx.fillStyle = 'rgba(226,70,75,' + (0.14 + 0.1 * cnt[b]) + ')'; rr(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 8).fill(); } }
    }
    // 도로 + 칸
    ctx.fillStyle = '#e6e2d6'; ctx.fillRect(M.x, CG.gy0 + CG.bh + 1, M.w, CG.gapY - 2);
    for (let b = 0; b < 10; b++) {
      const r = blockRect(b);
      ctx.fillStyle = '#f5f1e6'; rr(r.x, r.y, r.w, r.h, 8).fill();
      ctx.strokeStyle = '#c7bfa9'; ctx.lineWidth = 1.5; rr(r.x, r.y, r.w, r.h, 8).stroke();
    }
    // 안전 지대
    const B2 = CG.band;
    ctx.fillStyle = 'rgba(20,160,88,.22)'; ctx.fillRect(M.x, B2.y, M.w, M.y + M.h - B2.y);
    ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(M.x, B2.y); ctx.lineTo(M.x + M.w, B2.y); ctx.stroke(); ctx.setLineDash([]);
    D.text(M.x + 14, B2.y + 14, '안전 지대', { size: 12.5, weight: 800, color: '#0b6b39', align: 'left', baseline: 'middle' });
    if (S.sel.has('shelter')) CG.shx.forEach((x) => { D.shadow(() => { ctx.fillStyle = '#fff'; rr(x - 30, B2.y + 6, 60, 20 * FS, 5).fill(); }, { blur: 4, y: 1 }); ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(x - 34, B2.y + 8); ctx.lineTo(x, B2.y - 7); ctx.lineTo(x + 34, B2.y + 8); ctx.closePath(); ctx.fill(); D.text(x, B2.y + 17 * FS, '대피소', { size: 12, weight: 800, color: '#a3262b', baseline: 'middle' }); });
    // 대피 경로 (위험 지도)
    if (S.sel.has('map')) {
      const tgt = S.sel.has('shelter') ? CG.shx : [CG.gx0 + 60, CG.vx, CG.gx0 + 480];
      [0, 1, 2].forEach((i) => { const sx = CG.gx0 + 50 + i * 2 * (CG.bw + CG.gapX), ex = tgt[i]; ctx.strokeStyle = 'rgba(14,116,144,.9)'; ctx.lineWidth = 3; ctx.setLineDash([9, 8]); ctx.lineDashOffset = -(RM ? 0 : t * 28); ctx.beginPath(); ctx.moveTo(sx, CG.gy0 + 2 * CG.bh + CG.gapY + 4); ctx.lineTo(ex, B2.y + 2); ctx.stroke(); ctx.setLineDash([]); });
    }
    // 감시 장비
    if (S.sel.has('monitor')) {
      [[-62, 30], [58, 36], [0, 54]].forEach(([dx, dy], i) => {
        const x = cr.x + dx * FS, y = cr.y + dy * FS;
        ctx.fillStyle = '#334155'; ctx.fillRect(x - 2, y - 2, 4, 14 * FS);
        D.sphere(x, y - 4, 5 * FS, '#e2464b', { gloss: false });
        if (!RM) { ctx.strokeStyle = 'rgba(226,70,75,' + (0.6 - 0.6 * ((t * 0.9 + i * 0.3) % 1)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 4, 6 * FS + ((t * 0.9 + i * 0.3) % 1) * 18, 0, 7); ctx.stroke(); }
      });
    }
    // 위험 구역: 진행 중인 시나리오
    const R = S.run;
    if (R) {
      const sc = SCEN[R.si], hz = HZ[R.si];
      const prog = clamp((R.t - R.front0) / R.dur, 0, 1), rad = frontRMax(R.si) * (R.done ? 1 : SciSim.ease.outQuad(prog));
      ctx.save(); fpPath(R.si); ctx.clip();
      if (rad > 1) {
        const gg = ctx.createRadialGradient(cr.x, cr.y, rad * 0.2, cr.x, cr.y, rad);
        gg.addColorStop(0, hz.c1); gg.addColorStop(0.85, hz.c1); gg.addColorStop(1, hz.c0);
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cr.x, cr.y, rad, 0, Math.PI * 2); ctx.fill();
        if (R.si === 0 && !RM) { for (let i = 0; i < 26; i++) { const a = (i * 2.399 + t * 0.4) % 6.283, rr2 = (i / 26) * rad; ctx.globalAlpha = 0.4; ctx.drawImage(SP_DARK, cr.x + Math.cos(a) * rr2 - 14, cr.y + Math.sin(a) * rr2 * 0.9 - 14 + ((t * 40 + i * 13) % 20), 28, 28); } ctx.globalAlpha = 1; }
        if (R.si === 1 && !RM) { D.glow(cr.x, cr.y, rad * 0.5, '#ffb347', 0.4); }
      }
      ctx.restore();
    }
    // 화산 쇄설류 · 이류 이름표 / 사람 점
    DOTS.forEach((d) => {
      const dead = d.st === 'dead', safe = d.st === 'safe';
      ctx.fillStyle = dead ? '#e2464b' : safe ? '#16a34a' : '#2563eb';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(d.x, d.y, 4.8 * FS, 0, 7); ctx.fill(); ctx.stroke();
      if (dead) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(d.x - 2.4, d.y - 2.4); ctx.lineTo(d.x + 2.4, d.y + 2.4); ctx.moveTo(d.x + 2.4, d.y - 2.4); ctx.lineTo(d.x - 2.4, d.y + 2.4); ctx.stroke(); }
    });
    parts.draw(ctx);
    // 경보 배너
    if (R && !R.done) {
      const warn = S.sel.has('monitor');
      const msg = R.t < R.warnAt ? (warn ? '' : '아직 아무도 몰라요…') : warn ? '⚠ 경보 발령! 대피 시작' : '늦게 알았어요! 서둘러 대피해요';
      if (msg) D.label(M.x + 14, M.y + 22, msg, { bg: warn ? 'rgba(226,70,75,' + (RM ? 0.95 : 0.75 + 0.2 * Math.sin(t * 9)) + ')' : 'rgba(100,116,139,.92)', size: 14, pad: 10, align: 'left' });
    }
    ctx.restore();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; rr(M.x, M.y, M.w, M.h, 14).stroke();
    // 안내 이름표 (캔버스 위, 클리핑 밖)
    D.text(M.x + M.w - 12, M.y + 18, '● 점 하나 = 800명', { size: 12.5, weight: 800, color: '#334155', align: 'right', baseline: 'middle' });
    D.text(cr.x, cr.y + 30 * FS, '화산', { size: 13, weight: 800, color: '#f5efe9', stroke: 'rgba(60,45,38,.8)', strokeWidth: 3, baseline: 'middle' });
    if (R && !R.done) D.label(cr.x + (PHONE ? 100 : 90), cr.y + 2, ['화산재 낙하', '화산 쇄설류', '화산 이류'][R.si], { bg: ['#6b625b', '#c2410c', '#78542f'][R.si], size: 13, pad: 9, align: 'left' });
    // 선택한 대책 표시
    const picked = MORDER.filter((m) => S.sel.has(m));
    if (!PHONE) D.text(M.x + 14, M.y + 48 * FS, picked.length ? '선택한 대책: ' + picked.map((m) => MEAS[m].icon + MEAS[m].name).join('  ') : '선택한 대책이 없어요', { size: 12.5, weight: 800, color: '#334155', align: 'left', baseline: 'middle' });
  }

  function drawResults(t) {
    const P = CG.RP;
    panel(P.x, P.y, P.w, P.h);
    D.text(P.x + 14, P.y + 22, '📊 시나리오 결과', { size: 15, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
    D.text(P.x + P.w - 14, P.y + 22, '목표: 피해자 90 % 이상 줄이기', { size: 13, weight: 800, color: '#0b6b39', align: 'right', baseline: 'middle' });
    const rh = (P.h - 58) / 3;
    SCEN.forEach((sc, i) => {
      const y = P.y + 40 + i * rh, res = S.res[i];
      const running = S.run && !S.run.done && S.run.si === i;
      const barX = PHONE ? P.x + 14 : P.x + 176, barW = PHONE ? P.w - 28 : 270, bh = 10 * FS;
      const by0 = PHONE ? y + 30 : y + 8, scale = barW / 50;
      D.text(P.x + 14, PHONE ? y + 12 : y + rh * 0.45, (i + 1) + '. ' + sc.name + ' (' + sc.sph + ')', { size: 13.5, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
      ctx.fillStyle = '#d5dbe6'; rr(barX, by0, sc.base * scale, bh, 5).fill();
      if (res && !running && res.dots > 0) { ctx.fillStyle = res.ok ? '#14a058' : '#e2464b'; rr(barX, by0 + bh + 4, res.dots * scale, bh, 5).fill(); }
      const tx = barX + sc.base * 0.1 * scale;
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tx, by0 - 3); ctx.lineTo(tx, by0 + 2 * bh + 7); ctx.stroke();
      const base = '처음 ' + fmtN(sc.base * DOT) + '명';
      let l1, l2 = '', col = '#64748b';
      if (running) l1 = base + ' · 계산 중…';
      else if (res) { l1 = base + ' → ' + fmtN(res.people) + '명 · ' + res.cut.toFixed(1) + ' % 감소 ' + (res.ok ? '✔' : '✖'); l2 = '경제 피해 약 ' + fmtN(res.loss) + '억 원'; col = res.ok ? '#0b6b39' : '#a3262b'; }
      else l1 = base + ' · 아직 실행하지 않았어요';
      if (PHONE) {
        D.text(P.x + 14, by0 + 2 * bh + 22, l1, { size: 13, weight: 700, color: col, align: 'left', baseline: 'middle' });
        if (l2) D.text(P.x + 14, by0 + 2 * bh + 42, l2, { size: 13, weight: 700, color: col, align: 'left', baseline: 'middle' });
      } else {
        D.text(barX + barW + 14, y + rh * 0.3, l1, { size: 12.5, weight: 800, color: col, align: 'left', baseline: 'middle' });
        if (l2) D.text(barX + barW + 14, y + rh * 0.72, l2, { size: 12.5, weight: 700, color: col, align: 'left', baseline: 'middle' });
      }
    });
    D.text(P.x + P.w - 14, P.y + P.h - 10, '초록 선 = 목표(처음의 10 %) · 막대 길이는 피해자 수에 비례해요', { size: 12, weight: 700, color: '#94a3b8', align: 'right', baseline: 'middle' });
  }
  function drawCity(t) {
    ctx.fillStyle = '#eef5fb'; ctx.fillRect(0, 0, VW, VH);
    drawCityMap(t); drawResults(t);
  }

  /* ======================================================
     화면 · 조작 연결
     ====================================================== */
  const hint = $('#stageHint');
  let hintTimer = 0;
  function showHint(msg, ms) {
    hint.textContent = msg; hint.classList.remove('hide');
    clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.add('hide'), ms || 4200);
  }
  const TB = { erupt: '🌋 화산 분출', chain: '🌍 영향의 연쇄', sort: '🗂️ 영향 카드 분류', cases: '📑 피해 사례 조사', city: '🏙️ 화산 도시의 대책' };
  function setMode(m) {
    if (S.mode !== m) { S.mode = m; S.fade = 1; parts.clear(); S.drag = null; S.selChip = null; }
    if (m === 'sort' || m === 'cases') relayout();
    updateCtl();
  }
  function setVei(v) { S.vei = clamp(Math.round(v), 3, 7); S.stable = 0; updateCtl(); }
  function setTime(i, silent) {
    i = clamp(Math.round(i), 0, 6);
    if (i !== S.tIdx && !silent) { Sound.tick(); S.pulse = 0; }
    S.tIdx = i; S.tSeen.add(i); updateCtl();
  }
  function setSel(m, on) {
    if (on === S.sel.has(m)) return true;
    if (on && selPoints() + MEAS[m].cost > BUDGET) return false;
    if (on) S.sel.add(m); else S.sel.delete(m);
    S.res = [null, null, null]; S.run = null; resetDots(); parts.clear();
    updateCtl();
    return true;
  }
  function updateCtl() {
    $$('#ctrlCard .control').forEach((c) => { const ms = (c.dataset.modes || '').split(/\s+/); c.hidden = ms.indexOf(S.mode) < 0; });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#tbLabel').textContent = TB[S.mode];
    $('#sVei').value = S.vei; $('#sVei').style.setProperty('--pct', ((S.vei - 3) / 4 * 100) + '%'); $('#oVei').textContent = 'VEI ' + S.vei;
    $('#sTime').value = S.tIdx; $('#sTime').style.setProperty('--pct', (S.tIdx / 6 * 100) + '%'); $('#oTime').textContent = STOPS[S.tIdx].long;
    $('#tMinus').disabled = S.tIdx <= 0; $('#tPlus').disabled = S.tIdx >= 6;
    const pts = selPoints();
    $('#oBud').textContent = pts + ' / ' + BUDGET + '점'; $('#budBar').style.width = (pts / BUDGET * 100) + '%';
    $$('#measureBtns .opt').forEach((b) => b.setAttribute('aria-pressed', S.sel.has(b.dataset.m) ? 'true' : 'false'));
    const running = !!(S.run && !S.run.done);
    $$('#runBtns .btn').forEach((b) => { const i = +b.dataset.sc; b.disabled = running; b.classList.toggle('done', !!S.res[i]); });
    const left = BUDGET - pts;
    $('#cityNote').innerHTML = S.sel.size ? '남은 예산 <b>' + left + '점</b>. 대책을 고른 뒤 ①②③을 모두 실행해요. 선택을 바꾸면 결과가 지워져요.' : '대책 카드를 골라 보세요. 선택을 바꾸면 결과는 다시 계산해야 해요.';
    readouts();
  }
  function readouts() {
    const L = ['', '', ''], V = ['', '', ''];
    if (S.mode === 'erupt') {
      L[0] = '분출 세기'; V[0] = 'VEI ' + S.vei;
      L[1] = '화산재 기둥 높이'; V[1] = '약 ' + VEI[S.vei].h + ' km' + (VEI[S.vei].h > TROPO ? ' (성층권)' : ' (대류권)');
      L[2] = '분출물의 양'; V[2] = VEI[S.vei].vol + ' km³ 이상';
    } else if (S.mode === 'chain') {
      const st = STOPS[S.tIdx];
      L[0] = '경과 시간'; V[0] = st.long;
      L[1] = '지구 평균 기온 변화'; V[1] = fmtT(st.dT) + ' °C';
      L[2] = '에어로졸이 퍼진 곳'; V[2] = st.where;
    } else if (S.mode === 'sort') {
      const n = BOARD.sort.chips.filter((c) => c.zone).length;
      L[0] = '놓은 카드'; V[0] = n + ' / 12장'; L[1] = '남은 카드'; V[1] = (12 - n) + '장'; L[2] = '권역'; V[2] = '지권 · 기권 · 수권 · 생물권 · 사회';
    } else if (S.mode === 'cases') {
      const n = BOARD.cases.chips.filter((c) => c.zone).length;
      L[0] = '읽은 사례'; V[0] = S.seenCase.size + ' / 3'; L[1] = '표에 놓은 카드'; V[1] = n + ' / 6장'; L[2] = '지금 보는 사례'; V[2] = CASES[S.selCase].tabShort + ' (' + CASES[S.selCase].vei + ')';
    } else {
      const pts = selPoints();
      L[0] = '쓴 예산'; V[0] = pts + ' / ' + BUDGET + '점'; L[1] = '고른 대책'; V[1] = S.sel.size + '가지';
      L[2] = '실행한 시나리오'; V[2] = S.res.filter(Boolean).length + ' / 3';
    }
    for (let i = 0; i < 3; i++) { const a = $('#l' + (i + 1)), b = $('#v' + (i + 1)); if (a.textContent !== L[i]) a.textContent = L[i]; if (b.textContent !== V[i]) b.textContent = V[i]; }
  }

  $('#sVei').addEventListener('input', (e) => { setVei(+e.target.value); });
  $('#sTime').addEventListener('input', (e) => setTime(+e.target.value));
  $('#tMinus').addEventListener('click', () => setTime(S.tIdx - 1));
  $('#tPlus').addEventListener('click', () => setTime(S.tIdx + 1));
  $('#sortReset').addEventListener('click', () => { Sound.click(); BOARD.sort.chips.forEach((c) => { c.zone = null; c.bad = false; }); S.sortOK = false; S.selChip = null; relayout(); updateCtl(); });
  $('#caseReset').addEventListener('click', () => { Sound.click(); BOARD.cases.chips.forEach((c) => { c.zone = null; c.bad = false; }); S.caseOK = false; S.selChip = null; relayout(); updateCtl(); });
  $$('#measureBtns .opt').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.m, on = !S.sel.has(m);
    if (!setSel(m, on)) { Sound.fail(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); toast('예산 10점을 넘어요. 다른 대책을 빼고 골라요.', 'bad', 2200); }
    else Sound.click();
  }));
  $$('#runBtns .btn').forEach((b) => b.addEventListener('click', () => { startRun(+b.dataset.sc); updateCtl(); }));
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  /* ---------- 캔버스 입력 ---------- */
  const tabRect = (i) => { const T = caseGeo(), tw = (VW - 24 - 16) / 3; return { x: 12 + i * (tw + 8), y: T.tabY, w: tw, h: T.tabH }; };
  const hitBoardChip = (p) => { const B = activeBoard(); return B ? chipAt(B, p) : null; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'cases') { for (let i = 0; i < 3; i++) { const r = tabRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { selectCase(i); return false; } } }
      const B = activeBoard(); if (!B) return false;
      const c = chipAt(B, p);
      if (c) {
        B.chips.splice(B.chips.indexOf(c), 1); B.chips.push(c);
        S.drag = { c, ox: c.x - p.x, oy: c.y - p.y, sx: p.x, sy: p.y, moved: false, p }; return true;
      }
      if (S.selChip) { const z = zoneAt(B, p); if (z) { const sc = S.selChip; S.selChip = null; placeChip(B, sc, z); updateCtl(); } }
      return false;
    },
    move(p) { const d = S.drag; if (!d) return; d.p = p; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 7) d.moved = true; if (d.moved) { d.c.x = p.x + d.ox; d.c.y = p.y + d.oy; } },
    up(p) {
      const d = S.drag; if (!d) return; const B = activeBoard(); S.drag = null;
      if (!B) return;
      if (!d.moved) { S.selChip = S.selChip === d.c ? null : d.c; Sound.click(); return; }
      S.selChip = null;
      placeChip(B, d.c, zoneAt(B, p)); updateCtl();
    },
    hover(p) {
      if (S.mode === 'cases') for (let i = 0; i < 3; i++) { const r = tabRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'pointer'; }
      return hitBoardChip(p) ? 'grab' : null;
    },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t0 = e.touches[0]; if (!t0) return;
      const p = view.toLocal(t0);
      if (hitBoardChip(p)) e.preventDefault();
    }, { passive: false });
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const chip3 = (items) => items.map(([ok, label]) => mark(ok) + ' ' + label).join('  ');
  const levels = [
    {
      title: '분출 관찰: 마그마에서 분출물까지', short: '분출 관찰', icon: '🌋', phase: '관찰',
      features: ['erupt'],
      intro: '<p class="si-q">❓ 탐구 질문: 화산 하나가 폭발하면 지구의 어디까지 영향이 미치고, 우리는 피해를 어떻게 줄일 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 판의 경계에서 화산이 생기는 것(중2)과 지진·화산 같은 재해·재난의 원인과 피해(중3)를 배웠어요. 지구 내부 에너지로 일어난 <b>지권의 변화</b>가 지구시스템에 어떤 영향을 주는지 따라가 봐요.</div>' +
        '<p>먼저 <b>마그마 방</b>에서 올라온 분출물을 관찰해요. 분출의 세기는 <b>화산 폭발 지수(VEI)</b>로 나타내요.</p>',
      setup() { S.vei = 5; setMode('erupt'); },
      recap: '분출물은 용암, 화산 쇄설물(화산재·화산탄), 화산 가스예요. VEI가 1 커지면 분출물의 양은 약 10배가 되고, 클수록 화산재 기둥이 성층권까지 올라가요.',
      summary: '<ul><li><b>분출물</b>: 용암 · 화산 쇄설물(화산재, 화산탄) · 화산 가스(수증기, 이산화 탄소, 이산화 황)</li><li>마그마는 <b>지구 내부 에너지</b>로 만들어져 위로 올라와요.</li>' +
        '<li><b>VEI</b>가 1 커지면 분출물의 양이 약 <b>10배</b>가 돼요.</li></ul>' +
        '<table class="mini"><tr><th>VEI</th><th>기둥 높이</th><th>분출물의 양</th></tr><tr><td>3</td><td>약 10 km</td><td>0.01 km³ 이상</td></tr><tr><td>5</td><td>약 25 km</td><td>1 km³ 이상</td></tr><tr><td>7</td><td>약 45 km</td><td>100 km³ 이상</td></tr></table>' +
        '<p class="note">약 12 km 위부터가 성층권이에요. 성층권에 올라간 분출물은 오래 머물러요.</p>',
      missions: [
        {
          title: '세기 세 가지 관찰하기',
          goal: '슬라이더로 VEI를 <b>3, 5, 7</b>에 맞추고, 화산재 기둥이 어디까지 올라가는지 지켜봐요.',
          hint: '슬라이더를 3, 5, 7에 하나씩 맞추고 기둥 높이 표시선이 멈출 때까지 기다려 보세요.',
          setup() { S.seenVei.clear(); setMode('erupt'); showHint('슬라이더로 분출 세기를 바꿔 보세요', 5000); },
          hold: 0.4,
          check: () => S.seenVei.has(3) && S.seenVei.has(5) && S.seenVei.has(7),
          status: () => chip3([[S.seenVei.has(3), 'VEI 3'], [S.seenVei.has(5), 'VEI 5'], [S.seenVei.has(7), 'VEI 7']]),
          explain: 'VEI 3의 화산재는 대류권(약 12 km 아래)에 머물지만, VEI 5와 7은 <b>성층권</b>까지 올라가요. 세기가 클수록 분출물의 양이 많고 기둥도 높아져서, 영향이 더 넓게 퍼져요.',
        },
        {
          type: 'quiz', title: '분출물의 종류',
          goal: '분출물 가운데 <b>고체 조각</b>인 화산재와 화산탄은 어디에 속할까요?',
          setup() { setMode('erupt'); },
          choices: ['용암', '화산 쇄설물', '화산 가스', '마그마'],
          answer: 1,
          feedback: ['용암은 지표로 흘러나온 액체 상태의 암석이에요. 화산재와 화산탄은 굳은 조각이에요.', '', '화산 가스는 수증기, 이산화 탄소, 이산화 황 같은 기체예요.', '마그마는 땅속에서 녹아 있는 암석이에요. 땅 위로 나오면 용암이라고 불러요.'],
          explain: '화산 분출물은 <b>용암</b>(액체), <b>화산 쇄설물</b>(고체 조각: 화산재 · 화산탄), <b>화산 가스</b>(기체)로 나뉘어요. 이 중 가는 화산재와 이산화 황 가스가 높이 올라가 멀리 퍼져요.',
        },
        {
          type: 'quiz', title: 'VEI와 분출물의 양',
          goal: 'VEI가 <b>5에서 7로</b> 커지면 분출물의 양은 약 몇 배가 될까요?',
          setup() { setMode('erupt'); },
          choices: ['약 2배', '약 10배', '약 100배', '약 1000배'],
          answer: 2,
          feedback: ['VEI는 숫자가 1 커질 때마다 양이 약 10배가 돼요. 2배가 아니에요.', 'VEI가 1 커질 때의 변화예요. 5에서 7까지는 두 단계 커졌어요.', '', '세 단계(5 → 8) 커질 때의 값이에요. 5에서 7은 두 단계예요.'],
          explain: 'VEI 5는 1 km³ 이상, VEI 7은 100 km³ 이상이에요. 두 단계 커졌으니 10 × 10 = <b>약 100배</b>예요. 숫자는 조금 달라 보여도 분출물의 양은 크게 차이 나요.',
        },
      ],
    },
    {
      title: '영향 연쇄: 지구 전체로 퍼지는 영향', short: '영향 연쇄', icon: '🌍', phase: '탐구',
      features: ['chain', 'sort'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> VEI가 클수록 분출물이 성층권까지 올라가고, 화산 가스에는 <b>이산화 황</b>이 들어 있다는 것을 봤어요.</div>' +
        '<p>성층권에 올라간 이산화 황은 작은 알갱이(<b>에어로졸</b>)가 되어 지구를 감싸요. <b>시간 슬라이더</b>로 1991년 피나투보 화산(VEI 6)을 단순화한 영향을 따라가 보고, 영향 카드를 <b>권역</b>별로 분류해 봐요.</p>',
      setup() { S.tIdx = 0; S.tView = 0; setMode('chain'); },
      recap: '성층권의 에어로졸이 햇빛을 줄여 기온이 내려가고(VEI 6에서 약 −0.5 °C, 1~2년), 산성비와 농작물 피해가 이어져요. 영향은 기권을 넘어 수권 · 생물권 · 인간 사회까지 연쇄적으로 퍼져요.',
      summary: '<ul><li>이산화 황 → <b>에어로졸</b> → 햇빛 감소 → <b>기온 하강</b>(VEI 6에서 약 −0.5 °C, 1~2년)</li><li>이어서 농작물 피해 → 식량 부족 → <b>인간 사회</b>의 피해</li><li><b>산성비</b>: 이산화 황이 빗물에 녹아 내려요.</li></ul>' +
        '<table class="mini"><tr><th>권역</th><th>영향의 예</th></tr><tr><td>지권</td><td>용암, 화산 쇄설류</td></tr><tr><td>기권</td><td>기온 하강, 산성비, 화산재 구름</td></tr><tr><td>수권</td><td>쓰나미, 하천 오염</td></tr><tr><td>생물권</td><td>농작물 피해, 서식지 파괴</td></tr><tr><td>사회</td><td>항공 중단, 인명 피해, 식량 가격</td></tr></table>',
      missions: [
        {
          title: '시간을 따라가기',
          goal: '시간 슬라이더를 <b>직후부터 2년</b>까지 모든 시점으로 움직여서 영향이 어떻게 이어지는지 살펴봐요.',
          hint: '＋ 버튼을 눌러 한 칸씩 넘기거나 슬라이더를 끝까지 끌어 보세요.',
          setup() { setMode('chain'); S.tSeen = new Set([S.tIdx]); showHint('시간을 흘려 보내며 에어로졸과 기온을 살펴봐요', 5000); },
          hold: 0.5,
          check: () => S.tSeen.size === 7 && S.tIdx === 6,
          status: () => '확인한 시점 <b>' + S.tSeen.size + ' / 7</b>' + (S.tSeen.size === 7 && S.tIdx !== 6 ? ' · 마지막은 2년 뒤' : ''),
          explain: '분출 직후에는 화산 근처에만 있던 에어로졸이 1주, 1개월 지나며 지구를 감싸요. <b>6개월 ~ 1년</b> 사이에 햇빛이 가장 많이 줄어 기온이 약 0.5 °C 내려갔다가, 에어로졸이 가라앉으면서 다시 올라와요.',
        },
        {
          title: '영향 카드 분류하기', manual: true,
          goal: '카드 <b>12장</b>이 어느 권역에 일어난 영향인지 알맞은 칸에 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '카드를 끌어 놓거나, 카드를 누른 뒤 칸을 눌러도 돼요. 쓰나미는 바닷물의 움직임이니 수권이에요.',
          setup() { setMode('sort'); },
          check() {
            const B = BOARD.sort;
            const un = B.chips.filter((c) => !c.zone).length;
            if (un) return '아직 놓지 않은 카드가 <b>' + un + '장</b> 있어요.';
            const bad = B.chips.filter((c) => c.zone !== c.bin);
            bad.forEach((c) => { if (!c.bad) { c.bad = true; c.shake = 0.5; } });
            if (bad.length) return '<b>' + bad.length + '장</b>이 알맞지 않아요. 빨간 테두리 카드를 다시 생각해 보세요.<br><small>예) “' + bad[0].text + '”는 어느 권역에서 일어나는 일일까요?</small>';
            if (!S.sortOK) { S.sortOK = true; B.chips.forEach((c) => parts.burst(c.tx, c.ty, { count: 5, speed: 80, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '화산이 <b>지권</b>의 변화(용암, 쇄설류)를 일으키면, 화산재와 가스는 <b>기권</b>으로 퍼지고, 쓰나미와 오염은 <b>수권</b>에, 농작물과 서식지 피해는 <b>생물권</b>에, 대피와 항공 중단 같은 피해는 <b>인간 사회</b>에 나타나요. 권역들은 서로 이어져 있어요.',
        },
        {
          type: 'quiz', title: '왜 기온이 내려갈까?',
          goal: '화산재와 에어로졸이 성층권을 덮으면 지구 평균 기온이 <b>내려가는 까닭</b>은 무엇일까요?',
          setup() { setMode('chain'); },
          choices: ['화산 가스가 모두 얼어붙어서 지구가 차가워지기 때문이다', '화산이 지구 내부의 열을 모두 빼앗아 가기 때문이다', '에어로졸이 햇빛의 일부를 막아 지표에 닿는 에너지가 줄기 때문이다', '화산재가 지구의 자전을 느리게 하기 때문이다'],
          answer: 2,
          feedback: ['화산 가스가 얼어붙는 것이 아니에요. 가스가 알갱이(에어로졸)가 되어 햇빛을 가려요.', '화산은 지구 내부의 열을 일부 밖으로 내보낼 뿐, 지구를 식히지는 않아요.', '', '화산재는 지구의 자전과 상관없어요. 햇빛이 지표에 덜 닿는 것이 원인이에요.'],
          explain: '지구에 들어오는 에너지의 대부분은 <b>태양 에너지</b>예요. 성층권의 에어로졸이 햇빛 일부를 반사하고 흡수해 지표에 닿는 에너지가 줄면 기온이 내려가요. 에너지 흐름이 바뀌면 지구시스템 전체가 영향을 받는 거예요.',
        },
      ],
    },
    {
      title: '피해 조사: 환경 피해와 사회경제적 피해', short: '피해 조사', icon: '📑', phase: '탐구',
      features: ['cases'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화산 하나의 영향이 기권 · 수권 · 생물권 · 인간 사회로 이어지는 것을 봤어요.</div>' +
        '<p>실제 화산은 어떤 피해를 남겼을까요? <b>세 사례</b>(탐보라 · 크라카타우 · 아이슬란드)의 자료를 읽고, 피해를 <b>환경 피해</b>와 <b>사회경제적 피해</b>로 나누어 표에 정리해 봐요.</p>',
      setup() { setMode('cases'); },
      recap: '화산 피해는 환경 피해(저온, 쓰나미, 홍수)와 사회경제적 피해(식량 부족, 인명 피해, 항공 중단)로 나눌 수 있고, 한 가지 현상이 둘 다로 이어지기도 해요.',
      summary: '<table class="mini"><tr><th>사례</th><th>환경 피해</th><th>사회경제적 피해</th></tr><tr><td>1815 탐보라 (VEI 7)</td><td>이상 저온, 여름 없는 해</td><td>식량 부족, 곡물 가격 상승</td></tr><tr><td>1883 크라카타우 (VEI 6)</td><td>큰 쓰나미</td><td>해안 마을 파괴, 인명 피해(약 3만 6천 명)</td></tr><tr><td>2010 아이슬란드 (VEI 4)</td><td>빙하가 녹아 홍수</td><td>항공 약 10만 편 결항, 경제 손실</td></tr></table>' +
        '<ul><li>화산재는 비행기 엔진 안에서 녹아 붙어 <b>엔진 고장</b>을 일으킬 수 있어요.</li><li>VEI가 작아도(VEI 4) 바람을 타고 멀리 퍼지면 큰 사회경제적 피해가 날 수 있어요.</li></ul>',
      missions: [
        {
          title: '피해 조사표 완성하기', manual: true,
          goal: '세 사례의 자료를 읽고, 카드 <b>6장</b>을 알맞은 칸에 놓은 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '위쪽 사례 이름을 눌러 자료를 읽어요. 자연환경에서 일어난 일은 환경 피해, 사람의 삶과 경제에 생긴 일은 사회경제적 피해예요.',
          setup() { setMode('cases'); S.seenCase = new Set([S.selCase]); showHint('사례 이름을 눌러 세 가지 자료를 모두 읽어요', 5200); },
          check() {
            const B = BOARD.cases;
            if (S.seenCase.size < 3) return '먼저 위쪽 사례 이름을 눌러 <b>세 사례의 자료</b>를 모두 읽어요. (읽은 사례 ' + S.seenCase.size + ' / 3)';
            const un = B.chips.filter((c) => !c.zone).length;
            if (un) return '아직 놓지 않은 카드가 <b>' + un + '장</b> 있어요.';
            const bad = B.chips.filter((c) => c.zone !== c.cs + '-' + c.kind);
            bad.forEach((c) => { if (!c.bad) { c.bad = true; c.shake = 0.5; } });
            if (bad.length) {
              const swap = bad.filter((c) => c.zone && c.zone.indexOf(c.cs) === 0).length;
              return '<b>' + bad.length + '장</b>이 알맞지 않아요.' + (swap ? ' 같은 사례 안에서 환경 피해와 사회경제적 피해가 바뀐 카드가 있어요.' : ' 카드의 내용이 어느 사례의 자료인지 다시 읽어 보세요.');
            }
            if (!S.caseOK) { S.caseOK = true; B.chips.forEach((c) => parts.burst(c.tx, c.ty, { count: 5, speed: 80, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '<b>환경 피해</b>는 기온 하강, 쓰나미, 홍수처럼 자연환경에 생긴 변화예요. <b>사회경제적 피해</b>는 식량 부족, 인명 피해, 항공 중단처럼 사람의 삶과 경제에 생긴 피해예요. 환경 피해가 사회경제적 피해로 이어지는 경우가 많아요.',
        },
        {
          type: 'quiz', title: '화산재와 비행기',
          goal: 'VEI 4였던 2010년 아이슬란드 분화에도 유럽의 하늘길이 막혔어요. <b>화산재가 비행기에 위험한 까닭</b>은 무엇일까요?',
          setup() { setMode('cases'); },
          choices: ['화산재가 너무 무거워서 비행기가 바로 땅으로 떨어지기 때문이다', '화산재가 뜨거운 엔진 안에서 녹아 붙어 엔진이 고장 날 수 있기 때문이다', '화산재가 전파를 모두 막아서 통신이 끊기기 때문이다', '화산재가 연료와 섞여 연료가 더 많이 생기기 때문이다'],
          answer: 1,
          feedback: ['화산재 한 알은 아주 가벼워요. 문제는 엔진 속에서 일어나는 일이에요.', '', '통신보다 엔진의 고장이 더 큰 위험이에요.', '연료가 늘어나지 않아요. 오히려 엔진이 멈출 수 있어요.'],
          explain: '화산재는 작은 유리 · 암석 알갱이예요. 엔진 안의 높은 온도에서 <b>녹아 터빈에 달라붙으면</b> 엔진이 멈출 수 있어서, 화산재 구름 속에는 비행기가 다니지 않아요. 그래서 분출이 작아도 <b>항공 중단 → 경제 손실</b>이라는 사회경제적 피해가 커져요.',
        },
      ],
    },
    {
      title: '대책 수립: 피해를 줄이는 방법', short: '대책 수립', icon: '🏙️', phase: '적용',
      features: ['city'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화산 피해가 환경 피해와 사회경제적 피해로 나뉘고, 분출이 작아도 피해가 커질 수 있다는 것을 알았어요.</div>' +
        '<p>인구 <b>8만 명</b>의 가상 화산 도시에서 화산 활동이 늘고 있어요. <b>예산 10점</b>으로 대책 카드를 골라, 세 가지 시나리오에서 <b>피해자를 90 % 이상 줄여</b> 보세요.</p>',
      setup() { setMode('city'); },
      recap: '감시 · 예보로 경보를 일찍 내리고, 위험 지도 · 대피소 · 훈련 · 교육으로 대피 효과를 높이면 피해를 크게 줄일 수 있어요. 화산재와 이류는 기권 · 수권으로도 퍼지므로 지구시스템 전체를 함께 살펴야 해요.',
      summary: '<ul><li><b>감시</b>(지진계, GPS, 화산 가스 측정, 위성 영상) → <b>예보 · 경보</b>로 대피 시간 확보</li><li><b>위험 지도</b>(화산재 · 쇄설류 경로), <b>대피소</b>, <b>대피 훈련</b>, <b>시민 교육</b></li><li>시나리오마다 효과적인 대책이 달라요: 화산재는 대피소 · 교육, 쇄설류는 지도 · 훈련, 이류는 지도 · 교육</li></ul>' +
        '<p class="note">분출을 막을 수는 없지만, 준비한 만큼 피해를 줄일 수 있어요. 화산재와 가스는 기권을 따라 멀리 퍼지고, 비와 만나면 이류나 산성비가 되므로 <b>지구시스템 차원</b>에서 대비해야 해요.</p>',
      missions: [
        {
          title: '도시를 지켜라', manual: true,
          goal: '예산 <b>10점</b> 안에서 대책을 골라 시나리오 <b>①②③을 모두 실행</b>하고, 세 시나리오 모두 피해자를 <b>90 % 이상</b> 줄여요.',
          hint: '감시 장비가 없으면 경보가 늦어져 다른 대책의 효과가 크게 줄어요. 모든 카드를 살 수는 없으니(11점), 시나리오마다 필요한 대책을 비교해 보세요.',
          setup() { setMode('city'); showHint('대책을 고르고 ① ② ③ 시나리오를 실행해요', 5000); },
          check() {
            const miss = [0, 1, 2].filter((i) => !S.res[i]);
            if (S.run && !S.run.done) return '시나리오가 진행 중이에요. 끝날 때까지 잠깐 기다려요.';
            if (miss.length) return '시나리오 <b>' + miss.map((i) => i + 1).join(', ') + '</b>번을 아직 실행하지 않았어요. 지금 고른 대책으로 세 가지를 모두 실행해 보세요.';
            const fail = [0, 1, 2].filter((i) => !S.res[i].ok);
            if (fail.length) return fail.map((i) => '<b>' + (i + 1) + '. ' + SCEN[i].name + '</b> ' + S.res[i].cut.toFixed(1) + ' % 감소').join(' · ') + ' — 90 % 이상 줄여야 해요.<br><small>' + SCEN[fail[0]].need + '</small>';
            return true;
          },
          explain: '피해를 90 % 이상 줄이려면 <b>감시(경보)</b>가 꼭 필요하고, 나머지 예산은 시나리오에 맞게 나눠야 해요. 화산재는 대피소 · 교육, 쇄설류는 지도 · 훈련, 이류는 지도 · 교육이 특히 효과적이에요. 한정된 예산에서 <b>위험을 비교해 우선순위를 정하는 것</b>이 재해 대책의 핵심이에요.',
        },
        {
          type: 'quiz', title: '감시 장비의 효과',
          goal: '지진계 · GPS · 화산 가스 측정 같은 <b>감시 장비</b>를 설치하면 무엇이 가장 좋아질까요?',
          setup() { setMode('city'); },
          choices: ['화산 분출을 막을 수 있다', '화산재가 하늘로 올라가지 못한다', '분출 조짐을 빨리 알아 경보를 내리고 대피할 시간을 벌 수 있다', '마그마 방의 열이 줄어든다'],
          answer: 2,
          feedback: ['분출은 지구 내부 에너지로 일어나서 사람이 막을 수 없어요. 대신 미리 알아서 대비해요.', '감시 장비는 분출 자체를 바꾸지 못해요.', '', '감시 장비는 열을 줄이는 것이 아니라 변화를 알아내는 장치예요.'],
          explain: '화산은 분출 전에 지진, 땅의 부풀어 오름, 가스 성분의 변화 같은 <b>조짐</b>이 나타나요. 감시 장비로 이를 알아내 경보를 내리면 대피 시간을 벌어, 다른 대책(대피소 · 훈련 · 교육)의 효과도 커져요.',
        },
        {
          type: 'quiz', title: '지구시스템으로 보는 대책',
          goal: '화산 대책을 세울 때 화산 가까이의 도시뿐 아니라 <b>기권과 수권</b>까지 함께 살펴야 하는 까닭은 무엇일까요?',
          setup() { setMode('city'); },
          choices: ['화산재와 가스가 바람을 타고 멀리 퍼지고, 비와 만나 이류나 산성비 같은 다른 피해로 이어지기 때문이다', '기권과 수권에는 화산이 없어서 안전하기 때문이다', '화산재가 지구 내부로 다시 들어가기 때문이다', '화산 근처에서는 어떤 대책도 효과가 없기 때문이다'],
          answer: 0,
          feedback: ['', '기권과 수권도 화산 영향을 받아요. 화산재와 가스가 기권으로, 쓰나미와 이류가 수권으로 퍼져요.', '화산재는 대기를 따라 퍼지거나 땅 위에 쌓여요.', '앞에서 봤듯이 감시 · 지도 · 훈련 같은 대책은 피해를 크게 줄여요.'],
          explain: '지권에서 시작된 화산 활동은 <b>물질(화산재 · 가스)과 에너지(햇빛 감소)</b>를 통해 기권 · 수권 · 생물권 · 인간 사회로 이어져요. 그래서 대책도 한 권역만이 아니라 <b>지구시스템 전체의 연결</b>을 보고 세워야 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-volcano-impact', mount: '#game', badge: '화산 대책 전문가', homeHref: '../../index.html#h1a',
    featureLabels: { erupt: '🌋 분출 세기(VEI) 슬라이더', chain: '🌍 시간 슬라이더 · 기온 그래프', sort: '🗂️ 영향 카드 분류판', cases: '📑 피해 사례 조사표', city: '🏙️ 화산 도시 대책 시뮬레이션' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  relayout(); resetDots(); updateCtl();
  BOARD.sort.chips.concat(BOARD.cases.chips).forEach((c) => { c.x = c.tx; c.y = c.ty; c.w = c.tw; c.h = c.th; });
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'erupt') stepErupt(dt);
    else if (S.mode === 'chain') stepChain(dt);
    stepChips(dt); stepCity(dt); parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'erupt') drawErupt(t);
    else if (S.mode === 'chain') drawChainScene(t);
    else if (S.mode === 'sort') drawSort(t);
    else if (S.mode === 'cases') drawCases(t);
    else drawCity(t);
    if (S.mode !== 'erupt' && S.mode !== 'city') parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, BOARD, SCEN, VEI, STOPS, get game() { return game; }, setMode, setVei, setTime, setSel, startRun, finishRun, cityResult, relayout,
    sortAll(right) { BOARD.sort.chips.forEach((c, i) => { c.zone = right === false ? BINS[(BINS.findIndex((b) => b.id === c.bin) + 1) % 5].id : c.bin; c.ord = ++ORD; c.bad = false; }); relayout(); BOARD.sort.chips.forEach((c) => { c.x = c.tx; c.y = c.ty; c.w = c.tw; c.h = c.th; }); },
    fillCases(right) { BOARD.cases.chips.forEach((c) => { const k = right === false ? (c.kind === 'env' ? 'soc' : 'env') : c.kind; c.zone = c.cs + '-' + k; c.ord = ++ORD; c.bad = false; }); relayout(); BOARD.cases.chips.forEach((c) => { c.x = c.tx; c.y = c.ty; c.w = c.tw; c.h = c.th; }); },
    dropChip(id, zoneId) { const B = activeBoard(); const c = B.chips.find((q) => q.id === id); const z = B.zones.find((q) => q.id === zoneId); S.drag = { c, p: { x: z.x + z.w / 2, y: z.y + z.h / 2 } }; const p = S.drag.p; S.drag = null; placeChip(B, c, zoneAt(B, p)); updateCtl(); },
    chipPos(id) { const B = activeBoard(); const c = B.chips.find((q) => q.id === id); return { x: c.x, y: c.y, w: c.w, h: c.h }; },
    zonePos(zid) { const B = activeBoard(); const z = B.zones.find((q) => q.id === zid); return z; },
    runAll(sel) { S.sel = new Set(sel); S.res = [null, null, null]; S.run = null; [0, 1, 2].forEach((i) => { S.run = null; startRun(i, true); }); updateCtl(); },
  };
})();
