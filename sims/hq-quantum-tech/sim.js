/* =========================================================
   전자기와 양자 Ⅲ. 양자와 미시세계 - 양자 기술과 사회 (단원 3차시)
   성취기준 [12전자03-02] 중첩과 측정을 통한 확률적 상태 변화를 이해하고, 이를 이용한 양자컴퓨터, 양자암호 통신 등의 양자 기술이
   일상생활과 미래 사회에 미칠 영향을 인식할 수 있다. (이 차시: 물리 원리보다 사회에 미치는 영향 중심)
   ① 분석: 양자 컴퓨터 (문제 크기별 걸리는 시간 모형, 한계 카드, 이득이 큰 일과 작은 일)
   ② 실험: 양자 암호 (BB84를 단순화한 키 분배 게임: 도청자가 있으면 오류율 약 25 %)
   ③ 탐구: 다양한 기술 (양자 센서 · 시뮬레이션 · 통신망 카드를 분야에 연결)
   ④ 적용: 사회 토론 (이익 · 위험 · 대비 분류와 나의 입장)
   Shor 알고리즘의 수학, 큐비트 구현 방식 상세, BB84 수식 증명, 얽힘 기반 프로토콜, 오류 정정 부호는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const PH0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PH0 ? 480 : 800, VH = PH0 ? 680 : 560;
  const BG = '#eef2fa';
  /* ===== 공통 도우미 (모든 차시 공통) ===== */
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
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
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const supOf = (n) => String(n).split('').map((c) => SUP[c] || c).join('');
  // 과학적 표기: sci(5.55e14, 1) → "5.6×10¹⁴"
  function sci(x, d) {
    d = d == null ? 1 : d;
    if (!isFinite(x) || x === 0) return '0';
    let e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e);
    m = +m.toFixed(d); if (Math.abs(m) >= 10) { m /= 10; e += 1; }
    if (e === 0) return m.toFixed(d);
    return m.toFixed(d) + '×10' + supOf(e);
  }
  // 파장(nm) → 색 (가시광선 근사, 380 미만은 자외선=보라 회색, 780 초과는 적외선)
  function wlRGB(wl) {
    let r = 0, g = 0, b = 0;
    if (wl >= 380 && wl < 440) { r = -(wl - 440) / 60; b = 1; }
    else if (wl >= 440 && wl < 490) { g = (wl - 440) / 50; b = 1; }
    else if (wl >= 490 && wl < 510) { g = 1; b = -(wl - 510) / 20; }
    else if (wl >= 510 && wl < 580) { r = (wl - 510) / 70; g = 1; }
    else if (wl >= 580 && wl < 645) { r = 1; g = -(wl - 645) / 65; }
    else if (wl >= 645 && wl <= 780) { r = 1; }
    else if (wl < 380) { return [150, 120, 210]; }
    else { return [150, 60, 60]; }
    let f = 1;
    if (wl < 420) f = 0.35 + 0.65 * (wl - 380) / 40; else if (wl > 700) f = 0.35 + 0.65 * (780 - wl) / 80;
    const gm = 0.8;
    return [r, g, b].map((c) => Math.round(255 * Math.pow(Math.max(0, c) * f, gm)));
  }
  const wlColor = (wl) => { const c = wlRGB(wl); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(rand) { let u = 0; while (u === 0) u = rand(); const v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  // 슬라이더(+조절 버튼) 연결: id 'sX' → 값 표시 'oX'. 반환 {set, refresh}
  function bindSlider(id, fmt, onInput) {
    const inp = $('#' + id), out = $('#o' + id.slice(1));
    const api = SciSim.bindRange(inp, out, fmt, (v) => { Sound.tick(); onInput && onInput(v); });
    $$('.nudge[data-for="' + id + '"]').forEach((b) => b.addEventListener('click', () => {
      const st = +inp.step || 1, d = +b.dataset.d;
      const v = clamp(Math.round(((+inp.value) + d * st) / st) * st, +inp.min, +inp.max);
      inp.value = v; api.refresh(); Sound.tick(); onInput && onInput(+inp.value);
    }));
    return api;
  }
  // 버튼 묶음(segmented/chips): data-v 값 선택. 반환 {set(v), get()}
  function bindSeg(id, onPick) {
    const root = $('#' + id); let cur = null;
    const set = (v) => { cur = String(v); $$('button', root).forEach((b) => b.classList.toggle('on', b.dataset.v === cur)); };
    $$('button', root).forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); set(b.dataset.v); onPick && onPick(b.dataset.v); }));
    return { set, get: () => cur, root };
  }
  // 고르기 문장 묶음: rows = [{q, opts:[...], ans:index(0-based)}]  → 값은 vals[i] (''/'0'..)
  function mkSelRows(hostId, rows) {
    const host = $('#' + hostId); const sels = []; const vals = {}; const okS = {};
    rows.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + r.q + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r.q.replace(/<[^>]+>/g, ''));
      sel.innerHTML = '<option value="">— 고르기 —</option>' + r.opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { vals[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okS[i]; Sound.click(); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    return {
      sels, vals,
      reset() { Object.keys(vals).forEach((k) => delete vals[k]); Object.keys(okS).forEach((k) => delete okS[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); },
      count() { return rows.filter((r, i) => vals[i] !== undefined && vals[i] !== '').length; },
      grade(missMsg, badMsg) {
        const miss = rows.filter((r, i) => vals[i] === undefined || vals[i] === '').length;
        if (miss) return missMsg || ('아직 고르지 않은 문장이 ' + miss + '개 있어요.');
        let bad = 0;
        rows.forEach((r, i) => {
          const ok = +vals[i] === r.ans;
          if (!ok) bad++;
          if (!ok && okS[i] !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
          if (ok) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
          okS[i] = ok;
        });
        return bad ? (badMsg || '빨간 칸을 다시 골라 보세요.') : true;
      },
    };
  }
  // 그래프 축 그리기: 반환 {X(v), Y(v), x, y, w, h}
  function axes(x, y, w, h, o) {
    const X = (v) => x + (v - o.xmin) / (o.xmax - o.xmin) * w;
    const Y = (v) => y + h - (v - o.ymin) / (o.ymax - o.ymin) * h;
    ctx.save();
    ctx.fillStyle = o.bg || '#fbfcff'; ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 1; ctx.strokeStyle = '#e3e8f2';
    (o.xt || []).forEach((t) => { ctx.beginPath(); ctx.moveTo(X(t[0]), y); ctx.lineTo(X(t[0]), y + h); ctx.stroke(); });
    (o.yt || []).forEach((t) => { ctx.beginPath(); ctx.moveTo(x, Y(t[0])); ctx.lineTo(x + w, Y(t[0])); ctx.stroke(); });
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.6; ctx.strokeRect(x, y, w, h);
    const fs = o.fs || 12;
    (o.xt || []).forEach((t) => T(X(t[0]), y + h + fs + 4, t[1], fs, '#5d6879', 'center', 700));
    (o.yt || []).forEach((t) => T(x - 6, Y(t[0]) + fs * 0.35, t[1], fs, '#5d6879', 'right', 700));
    if (o.xl) T(x + w / 2, y + h + fs * 2 + 10, o.xl, fs + 1, '#26324a', 'center', 800);
    if (o.yl) { ctx.save(); ctx.translate(x - (o.ylx || 40), y + h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, o.yl, fs + 1, '#26324a', 'center', 800); ctx.restore(); }
    ctx.restore();
    return { X, Y, x, y, w, h };
  }


  const rad = Math.PI / 180;
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 520 } : { x: 12, y: 12, w: 776, h: 414 };
  const BOT = PHONE ? { x: 8, y: 536, w: 464, h: 136 } : { x: 12, y: 436, w: 776, h: 112 };
  const INK = '#26324a', MUTE = '#5d6879', CB = '#3867f4', CO = '#f26b3a', CG = '#14a058', CR = '#e2464b', CV = '#8b5cf6';
  const rb = () => (Math.random() < 0.5 ? 0 : 1);

  /* ---------- ① 양자 컴퓨터: 걸리는 시간 모형 (이론적 추정을 단순화한 값) ---------- */
  const YR = 3.156e7;                                                        // 1년(초)
  const logTc = (n) => 1.486 * Math.cbrt(n) - 6.37;                          // 고전 컴퓨터: 비트 수의 세제곱근에 비례해 지수적으로 늘어요
  const logTq = (n) => Math.log10(3.3e-6) + 3 * Math.log10(n);               // 양자 컴퓨터: 비트 수의 세제곱에 비례해 완만하게 늘어요
  const tC = (n) => Math.pow(10, logTc(n)), tQ = (n) => Math.pow(10, logTq(n));
  function human(s) {
    if (s < 0.95) return '1초 미만';
    if (s < 60) return Math.round(s) + '초';
    if (s < 3600) return Math.round(s / 60) + '분';
    if (s < 86400) return (s / 3600).toFixed(1) + '시간';
    if (s < YR) return Math.round(s / 86400) + '일';
    const y = s / YR;
    if (y < 1e4) return (y < 10 ? y.toFixed(1) : Math.round(y).toLocaleString('ko-KR')) + '년';
    if (y < 1e8) { const m = y / 1e4; return (m < 10 ? m.toFixed(1) : Math.round(m).toLocaleString('ko-KR')) + '만 년'; }
    return (y / 1e8).toFixed(1) + '억 년';
  }
  const Y_TICKS = [[0, '1초'], [Math.log10(3600), '1시간'], [Math.log10(YR), '1년'], [Math.log10(YR * 1000), '1000년'], [Math.log10(YR * 1e6), '100만 년']];

  /* ---------- ② 양자 암호: BB84를 단순화한 키 분배 게임 ---------- */
  const measureState = (st, basis) => (basis === st.b ? { b: basis, v: st.v } : { b: basis, v: rb() });   // 같은 기준이면 그대로, 다르면 50 %
  function genRound(eve) {
    const a = { b: rb(), v: rb() };                       // Alice: 기준(0 = +, 1 = ×)과 비트
    let st = { b: a.b, v: a.v }, e = null;
    if (eve) { const m = measureState(st, rb()); e = { b: m.b, v: m.v }; st = { b: m.b, v: m.v }; }   // Eve: 기준을 무작위로 골라 측정하고 같은 상태로 다시 보내요
    const bm = measureState(st, rb());                    // Bob: 기준을 무작위로 골라 측정
    const same = a.b === bm.b;
    return { a, e, bob: { b: bm.b, v: bm.v }, same, err: same && a.v !== bm.v, eveWrong: !!e && e.b !== a.b };
  }

  /* ---------- ③ 기술 카드와 분야 ---------- */
  const FIELDS = [{ id: 'med', n: '의료', ic: '🏥' }, { id: 'nav', n: '항법', ic: '🧭' }, { id: 'fin', n: '금융', ic: '🏦' }, { id: 'def', n: '국방', ic: '🛡️' }, { id: 'mat', n: '신소재', ic: '🔋' }, { id: 'com', n: '통신', ic: '📡' }];
  const TECH = [
    { id: 'clock', ic: '⏱️', t: '원자시계', d: '위성 항법 시스템의 시각 기준이 되는 초정밀 시계', f: 'nav', info: '원자시계는 원자의 에너지 준위 사이 전이에서 나오는 일정한 진동수로 시간을 재요. 시간 오차 1 ns(10⁻⁹ s)는 빛의 속력으로 약 30 cm의 위치 오차가 돼요.' },
    { id: 'mag', ic: '🧠', t: '양자 자기장 센서', d: '뇌가 내는 아주 약한 자기 신호를 재요', f: 'med', info: '양자 센서는 원자나 광자의 양자 상태가 자기장 같은 작은 변화에 민감하게 변하는 것을 이용해요. 뇌의 약한 자기 신호를 재는 연구가 진행되고 있어요.' },
    { id: 'sim', ic: '⚗️', t: '양자 시뮬레이션', d: '새 배터리 소재의 전자 상태를 계산해요', f: 'mat', info: '양자 컴퓨터로 분자나 소재의 양자 현상을 따라 계산해서 새 배터리 소재와 촉매, 신약 후보 분자를 연구하려는 기술이에요(연구 단계).' },
    { id: 'qkd', ic: '🔑', t: '양자 암호 키 분배', d: '은행 거래를 지키는 암호 키를 안전하게 나눠요', f: 'fin', info: '양자 키 분배로 만든 키로 거래 정보를 암호화하면, 중간에서 엿보는 시도가 있을 때 오류율이 올라가 알아챌 수 있어요. 도청을 막는 것이 아니라 탐지해요.' },
    { id: 'imu', ic: '🪖', t: '양자 관성 센서', d: '적의 교란 속에서도 위치를 알아내요 (연구 중)', f: 'def', info: '원자의 양자 상태를 이용해 가속도와 회전을 정밀하게 재는 센서예요. 위성 신호가 교란되어도 위치를 추정할 수 있도록 군사 분야에서 연구하고 있어요.' },
    { id: 'net', ic: '🌐', t: '양자 통신망', d: '도시 사이를 광섬유·위성으로 잇는 암호 통신망', f: 'com', info: '양자 키 분배를 광섬유와 위성으로 도시 사이에 연결한 통신망이에요. 우리나라에도 양자 암호 통신 시범망이 만들어져 있어요.' },
  ];

  /* ---------- ④ 사회 시나리오 ---------- */
  const SCEN = [
    { ic: '🔐', t: '현행 암호가 풀릴 날', d: '지금 쓰는 공개키 암호는 큰 수의 소인수분해가 어렵다는 가정에 기대요. 충분히 큰 양자 컴퓨터가 생기면 이야기가 달라져요.',
      st: [{ t: '양자 키 분배로 도청을 알아채는 안전한 통신이 가능해져요', c: 0 }, { t: '지금 가로채 저장한 암호 자료를 나중에 풀어서 읽을 수 있어요', c: 1 }, { t: '양자 내성 암호로 미리 전환하고 중요한 자료부터 바꿔요', c: 2 }],
      stance: ['지금부터 중요한 자료는 양자 내성 암호로 전환해야 해요', '위험이 확실해질 때까지 기존 암호를 유지해도 돼요', '자료의 중요도에 따라 순서를 정해 단계적으로 전환해요'] },
    { ic: '💊', t: '신약 개발과 기술 격차', d: '양자 시뮬레이션으로 신약 후보 분자를 빨리 찾을 수 있다면 치료제 개발이 빨라질 수 있어요. 그런데 그 기술을 누구나 쓸 수 있을까요?',
      st: [{ t: '신약 후보 분자를 빠르게 찾아 치료제 개발 기간이 줄 수 있어요', c: 0 }, { t: '기술을 가진 나라·기업과 그렇지 못한 곳의 격차가 커질 수 있어요', c: 1 }, { t: '기술을 공유하는 국제 협력과 교육의 기회를 넓혀요', c: 2 }],
      stance: ['신약 개발을 앞당기는 이익이 크니 적극 투자해요', '격차가 커지지 않도록 기술 공유 방안을 먼저 마련해요', '이익을 키우는 투자와 격차를 줄이는 노력을 함께 해요'] },
    { ic: '🏛️', t: '양자 컴퓨터 보유국·기업의 독점', d: '큰 양자 컴퓨터는 만들고 운영하는 데 큰 비용이 들어요. 소수의 국가와 기업만 가지게 된다면 어떤 일이 생길까요?',
      st: [{ t: '큰 투자가 모여서 기술 발전이 빨라질 수 있어요', c: 0 }, { t: '소수가 계산 능력을 독점해 정보와 힘의 격차가 생길 수 있어요', c: 1 }, { t: '공공 연구에 투자하고 누구나 쓸 수 있는 환경과 국제 규범을 만들어요', c: 2 }],
      stance: ['기술 독점을 막는 국제 규범이 필요해요', '경쟁이 발전을 이끌므로 기업의 투자를 자유롭게 둬요', '핵심 기술은 공공 연구로 키우고 응용은 경쟁에 맡겨요'] },
    { ic: '👩‍💻', t: '새로운 직업의 등장', d: '양자 소프트웨어 개발자, 양자 보안 전문가 같은 직업이 생기고 있어요. 우리 사회의 일자리는 어떻게 바뀔까요?',
      st: [{ t: '양자 소프트웨어·양자 보안 같은 새로운 일자리가 생겨요', c: 0 }, { t: '양자 기술을 다룰 인력이 부족하고 기존 일자리가 바뀔 수 있어요', c: 1 }, { t: '학교와 대학에서 양자 교육을 늘리고 재교육 기회를 줘요', c: 2 }],
      stance: ['학교 교육을 바꿔 양자 인재를 길러야 해요', '기존 직업을 위한 재교육 지원이 먼저예요', '인재 양성과 재교육을 함께 추진해요'] },
  ];
  const CAT = [{ n: '이익', ic: '👍', col: CG, bg: '#e6f6ec' }, { n: '위험', ic: '⚠️', col: CR, bg: '#fdeaea' }, { n: '대비', ic: '🛡️', col: CB, bg: '#e9efff' }];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'qc', t: 0, fade: 0,
    n: 512, seenSmall: false, seenBig: false,
    show: { selQ: false, selK: false, selT: false, socCls: false, socStance: false },
    k: { eve: false, fly: [], q: 0, spawnT: 0, cols: [], fast: 0, rateF: 0, accF: 0, tot: { off: { sent: 0, sift: 0, err: 0 }, on: { sent: 0, sift: 0, err: 0 } }, flashE: 0, flashB: 0, lastRound: null },
    tc: { cards: [], occ: {}, sel: null, drag: null, wrong: 0, placed: 0, info: '' },
    so: { cur: 0, seen: {}, tl: 0 },
    qk: { cell: [] },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { qc: '💻 양자 컴퓨터', qkd: '🔐 양자 암호', tech: '🧭 다양한 기술', soc: '🗣️ 사회 토론' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); if (mode !== 'tech') S.tc.drag = null; }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm] || (!!game && game.free);
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#bChips button').forEach((b) => b.classList.toggle('on', +b.dataset.b === S.n));
    $$('#scChips button').forEach((b) => b.classList.toggle('on', +b.dataset.s === S.so.cur));
    const be = $('#bEve'); be.classList.toggle('on', S.k.eve); be.setAttribute('aria-pressed', S.k.eve ? 'true' : 'false'); be.textContent = S.k.eve ? '🕵️ 도청자 Eve 끄기 (지금: 켜짐)' : '🕵️ 도청자 Eve 켜기 (지금: 꺼짐)';
    $$('#socCls > div').forEach((d) => { d.hidden = +d.dataset.s !== S.so.cur; });
    $$('#socStance > div[data-s]').forEach((d) => { d.hidden = +d.dataset.s !== S.so.cur; });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- ① 컨트롤 ---------- */
  function setBits(v) { S.n = clamp(Math.round(v / 64) * 64, 64, 2048); if (S.n <= 128) S.seenSmall = true; if (S.n === 2048) S.seenBig = true; slB.set(S.n); updateCtl(); }
  const slB = bindSlider('sB', (v) => v + '비트', (v) => { setBits(+v); });
  $$('#bChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setBits(+b.dataset.b); }));
  const SEL_Q = mkSelRows('selQ', [
    ['신약 후보 분자의 에너지 계산', 0], ['스마트폰 앱 실행', 1], ['아주 큰 수의 소인수분해', 0], ['문서 작성', 1], ['새 배터리 소재 설계', 0], ['동영상 재생', 1], ['택배 배송 경로의 최적화', 0], ['이메일 보내기와 웹 검색', 1],
  ].map(([q, a]) => ({ q, opts: ['이득 가능성 큼', '이득 작음'], ans: a })));

  /* ---------- ② 키 분배 게임 ---------- */
  const K_T = 1.5, K_STEP = 0.42, K_MAXC = PHONE ? 10 : 20;
  const kCur = () => S.k.tot[S.k.eve ? 'on' : 'off'];
  function kCommit(r, eve) {
    const tt = S.k.tot[eve ? 'on' : 'off']; tt.sent++; if (r.same) tt.sift++; if (r.err) tt.err++;
  }
  function kSpawn() {
    const eve = S.k.eve, r = genRound(eve);
    S.k.fly.push({ t: 0, r, eve });
  }
  function kStep(dt) {
    const K = S.k;
    if (K.q > 0) { K.spawnT -= dt; if (K.spawnT <= 0) { K.spawnT = K_STEP; K.q--; kSpawn(); } }
    for (let i = K.fly.length - 1; i >= 0; i--) {
      const f = K.fly[i], t0 = f.t; f.t += dt;
      if (f.eve && t0 < 0.5 * K_T && f.t >= 0.5 * K_T) { K.flashE = 1; if (!RM) { const e = kPos(0.5, f); parts.burst(e.x, e.y, { count: 8, colors: [f.r.eveWrong ? CR : '#ffd166', '#ffd166'], speed: 90, life: 0.45, size: 3, gravity: 0 }); } }
      if (f.t >= K_T) {
        K.fly.splice(i, 1);
        kCommit(f.r, f.eve); K.lastRound = f.r; K.flashB = 1;
        K.cols.push({ r: f.r, eve: f.eve }); if (K.cols.length > K_MAXC) K.cols.shift();
        const b = kPos(1, f); if (!RM) parts.burst(b.x, b.y, { count: 8, colors: [f.r.err ? CR : f.r.same ? CG : '#8a95a8'], speed: 80, life: 0.45, size: 3, gravity: 0 });
      }
    }
    if (K.fast > 0) {
      K.accF += K.rateF * dt; const k = Math.min(Math.floor(K.accF), K.fast); K.accF -= Math.floor(K.accF);
      const eve = K.eve; for (let i = 0; i < k; i++) kCommit(genRound(eve), eve);
      K.fast -= k; if (K.fast <= 0) { K.fast = 0; K.rateF = 0; K.accF = 0; }
    }
    K.flashE = Math.max(0, K.flashE - dt * 2.2); K.flashB = Math.max(0, K.flashB - dt * 2.2);
  }
  function kClearView() { const K = S.k; K.fly = []; K.q = 0; K.cols = []; K.fast = 0; K.rateF = 0; K.lastRound = null; K.spawnT = 0; }
  $('#bEve').addEventListener('click', () => { Sound.click(); S.k.eve = !S.k.eve; kClearView(); updateCtl(); });
  $('#bSend').addEventListener('click', () => { Sound.click(); S.k.q += 20; if (S.k.cols.length >= K_MAXC && !S.k.fly.length) S.k.cols = []; });
  $('#bFast').addEventListener('click', () => { Sound.click(); S.k.fast += 200; S.k.rateF = Math.max(S.k.rateF, 200 / 1.3); });
  $('#bKReset').addEventListener('click', () => { Sound.click(); kClearView(); S.k.tot = { off: { sent: 0, sift: 0, err: 0 }, on: { sent: 0, sift: 0, err: 0 } }; });
  const SEL_K = mkSelRows('selK', [
    { q: '도청자 Eve가 없을 때 키 비트의 오류율은', opts: ['0 %예요', '약 25 %예요', '약 50 %예요'], ans: 0 },
    { q: '도청자 Eve가 있을 때 키 비트의 오류율은', opts: ['0 %예요', '약 25 %예요', '약 50 %예요'], ans: 1 },
    { q: 'Eve가 기준을 맞게 고른 광자는', opts: ['상태가 그대로라서 오류가 생기지 않아요', '항상 오류가 생겨요'], ans: 0 },
    { q: '공개 비교한 키에서 오류율이 높게 나오면', opts: ['그 키를 그대로 사용해요', '도청을 의심하고 그 키를 버린 뒤 새로 나눠요'], ans: 1 },
  ]);

  /* ---------- ③ 기술 카드 (끌어서 놓기) ---------- */
  const cardHome = (i) => (PHONE ? { x: MA.x + 8, y: MA.y + 176 + i * 56, w: 448, h: 50 } : { x: MA.x + 14, y: MA.y + 14 + i * 66, w: 340, h: 56 });
  const slotRect = (i) => (PHONE ? { x: MA.x + 10 + (i % 2) * 226, y: MA.y + 10 + Math.floor(i / 2) * 54, w: 218, h: 46 } : { x: MA.x + MA.w - 14 - 340, y: MA.y + 14 + i * 66, w: 340, h: 56 });
  function resetCards() {
    S.tc.cards = TECH.map((c, i) => { const h = cardHome(i); return Object.assign({}, c, { i, home: h, x: h.x, y: h.y, w: h.w, h: h.h, placed: -1, lift: 0, shake: 0 }); });
    S.tc.occ = {}; S.tc.sel = null; S.tc.drag = null; S.tc.wrong = 0; S.tc.placed = 0; S.tc.info = '';
  }
  const SEL_T = mkSelRows('selT', [
    { q: '양자 센서가 정밀한 까닭은 양자 상태가 작은 변화에', opts: ['민감하게 반응하기 때문이에요', '전혀 반응하지 않기 때문이에요'], ans: 0 },
    { q: '양자 시뮬레이션은 분자·소재의 양자 현상을', opts: ['양자 컴퓨터로 따라 계산해 연구해요', '눈으로 직접 관찰해 연구해요'], ans: 0 },
    { q: '양자 통신망에서 나눠 쓰는 키는', opts: ['도청을 알아챌 수 있어요', '도청이 절대 불가능해요'], ans: 0 },
  ]);

  /* ---------- ④ 사회 토론 (시나리오마다 선택 칸을 만들어요) ---------- */
  const SOC_CLS = [], SOC_ST = [];
  SCEN.forEach((sc, i) => {
    const d1 = document.createElement('div'); d1.dataset.s = i; d1.id = 'clsH' + i; $('#socCls').appendChild(d1);
    SOC_CLS.push(mkSelRows('clsH' + i, sc.st.map((s) => ({ q: s.t, opts: ['👍 이익', '⚠️ 위험', '🛡️ 대비'], ans: s.c }))));
    const d2 = document.createElement('div'); d2.dataset.s = i; d2.id = 'stH' + i; $('#socStance').appendChild(d2);
    SOC_ST.push(mkSelRows('stH' + i, [{ q: '“' + sc.t + '”에 대한 나의 입장은', opts: sc.stance, ans: -1 }]));
  });
  const dEff = document.createElement('div'); dEff.id = 'effH'; $('#socStance').appendChild(dEff);
  const SEL_EFF = mkSelRows('effH', [{ q: '양자 기술이 모두에게 이익이 되려면 필요한 노력은', opts: ['기술과 표준을 공유·협력하고 교육 기회를 넓혀요', '가장 앞선 한 나라가 기술을 독점해요', '위험이 있으니 연구를 모두 금지해요', '아무 대비 없이 기술이 퍼지기를 기다려요'], ans: 0 }]);
  const clsVal = (i, k) => { const v = SOC_CLS[i].vals[k]; return v === undefined || v === '' ? -1 : +v; };
  const scenDone = (i) => SCEN[i].st.every((s, k) => clsVal(i, k) === s.c);
  const scenAny = (i) => SCEN[i].st.some((s, k) => clsVal(i, k) >= 0);
  const stanceOf = (i) => { const v = SOC_ST[i].vals[0]; return v === undefined || v === '' ? -1 : +v; };
  const doneCount = () => SCEN.filter((s, i) => scenDone(i)).length;
  const stanceCount = () => SCEN.filter((s, i) => stanceOf(i) >= 0).length;
  $$('#scChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.so.cur = +b.dataset.s; S.so.seen[S.so.cur] = true; S.so.tl = 0; updateCtl(); }));

  /* ---------- 공통 그리기 ---------- */
  function card(r, fill) { panel(r.x, r.y, r.w, r.h, 16, fill || '#fff'); }
  function pill(x, y, text, bg, color, size, extra) { return D.label(x, y, text, Object.assign({ size: size || 13, bg, color: color || '#fff', pad: 8 }, extra)); }
  const bitsTxt = (n) => n + '비트';

  /* ---------- ① 양자 컴퓨터 ---------- */
  const QG = PHONE ? { x: MA.x, y: MA.y, w: MA.w, h: 332 } : { x: MA.x, y: MA.y, w: 484, h: MA.h };
  function drawQC(t) {
    card(QG);
    T(QG.x + 14, QG.y + 26, '풀어야 할 수의 크기와 걸리는 시간', 15, '#d6452f', 'left', 800);
    T(QG.x + QG.w - 14, QG.y + 26, '(이론적 추정을 단순화한 모형 값)', 12.5, MUTE, 'right', 700);
    const gx = QG.x + (PHONE ? 74 : 82), gy = QG.y + 44, gw = QG.w - (PHONE ? 90 : 100), gh = QG.h - (PHONE ? 110 : 112);
    const ax = axes(gx, gy, gw, gh, { xmin: 64, xmax: 2048, ymin: -1, ymax: 14, fs: 13, xl: '소인수분해할 수의 크기 (비트)', yl: '걸리는 시간', ylx: PHONE ? 62 : 70,
      xt: [[64, '64'], [512, '512'], [1024, '1024'], [1536, '1536'], [2048, '2048']], yt: Y_TICKS.map((q) => [q[0], q[1]]) });
    const Xc = ax.X, Yc = (v) => ax.Y(clamp(v, -1, 14));
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
    // RSA-2048 표시
    ctx.strokeStyle = 'rgba(255,180,0,.8)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Xc(2048) - 1, gy); ctx.lineTo(Xc(2048) - 1, gy + gh); ctx.stroke(); ctx.setLineDash([]);
    [[logTc, CO], [logTq, CB]].forEach(([fn, col]) => {
      ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let n = 64; n <= 2048; n += 16) { const x = Xc(n), y = Yc(fn(n)); if (n === 64) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    });
    // 선택한 크기
    const mx = Xc(S.n), yc = Yc(logTc(S.n)), yq = Yc(logTq(S.n));
    ctx.strokeStyle = 'rgba(38,50,74,.55)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(mx, gy); ctx.lineTo(mx, gy + gh); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    D.sphere(mx, yc, 7, CO, { gloss: false, shadow: true }); D.sphere(mx, yq, 7, CB, { gloss: false, shadow: true });
    const right = mx > gx + gw * 0.55;
    pill(mx + (right ? -10 : 10), clamp(yc - 18, gy + 14, gy + gh - 14), '고전 ' + human(tC(S.n)), CO, '#fff', 13, { align: right ? 'right' : 'left' });
    pill(mx + (right ? -10 : 10), clamp(yq + 20, gy + 14, gy + gh - 14), '양자 ' + human(tQ(S.n)), CB, '#fff', 13, { align: right ? 'right' : 'left' });
    pill(Xc(2048) - 6, gy + 14, 'RSA-2048', '#ffb400', '#3a2a00', 12.5, { align: 'right' });
    // 범례
    const lyy = QG.y + QG.h - 14;
    ctx.fillStyle = CO; ctx.fillRect(gx, lyy - 8, 22, 5); T(gx + 28, lyy - 2, '고전 컴퓨터', 13, INK, 'left', 800);
    ctx.fillStyle = CB; ctx.fillRect(gx + 130, lyy - 8, 22, 5); T(gx + 158, lyy - 2, '양자 컴퓨터', 13, INK, 'left', 800);
    // 한계 카드
    const lim = [
      { ic: '⚠️', t: '오류', d: '큐비트는 열과 잡음에 약해서 상태가 쉽게 깨져요. 오류가 많아 아직 큰 문제를 풀기에는 부족해요.' },
      { ic: '❄️', t: '냉각', d: '초전도 방식은 −273 °C에 가까운 극저온(약 0.01 K)으로 식혀야 해요.' },
      { ic: '🔢', t: '규모', d: '지금은 수백~천여 개 큐비트 수준이에요. RSA-2048을 풀려면 오류를 고친 훨씬 많은 큐비트가 필요해요.' },
    ];
    if (!PHONE) {
      const rx = QG.x + QG.w + 10, rw = MA.w - QG.w - 10;
      T(rx + 4, MA.y + 22, '지금 양자 컴퓨터의 한계', 15, '#d6452f', 'left', 800);
      lim.forEach((c, i) => {
        const r = { x: rx, y: MA.y + 34 + i * 126, w: rw, h: 118 };
        card(r); T(r.x + 14, r.y + 32, c.ic, 24, INK, 'left', 700); T(r.x + 50, r.y + 30, c.t, 16, INK, 'left', 800);
        textBlock(r.x + 14, r.y + 56, rw - 28, c.d, 13.5, MUTE, 18.5, 700);
        if (i === 2) qubitDots(r.x + rw - 84, r.y + 10, t);
      });
    } else {
      lim.forEach((c, i) => {
        const r = { x: MA.x, y: MA.y + 340 + i * 62, w: MA.w, h: 58 };
        card(r); T(r.x + 12, r.y + 36, c.ic, 22, INK, 'left', 700); T(r.x + 44, r.y + 20, c.t, 14.5, INK, 'left', 800);
        textBlock(r.x + 44, r.y + 38, r.w - 56, c.d, 12.5, MUTE, 15, 700);
      });
    }
  }
  function qubitDots(x, y, t) {            // 큐비트 격자 (켜졌다 꺼졌다 하는 중첩의 느낌)
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const ph = Math.sin(t * 2.2 + i * 1.7 + j * 2.9), a = RM ? 0.7 : 0.35 + 0.35 * (ph * 0.5 + 0.5);
      ctx.globalAlpha = a + 0.25; D.sphere(x + i * 16, y + j * 13, 4.8, C.mix(CB, CO, (Math.sin(t * 1.3 + i * 0.9 + j) * 0.5 + 0.5)), { gloss: false }); ctx.globalAlpha = 1;
    }
  }

  /* ---------- ② 양자 암호 ---------- */
  function kGeom() {
    return PHONE
      ? { ax: MA.x + 78, bx: MA.x + MA.w - 78, cy: MA.y + 98, ex: MA.x + MA.w / 2, sceneH: 192 }
      : { ax: MA.x + 116, bx: MA.x + MA.w - 116, cy: MA.y + 104, ex: MA.x + MA.w / 2, sceneH: 208 };
  }
  function kPos(p, f) { const g = kGeom(); return { x: g.ax + (g.bx - g.ax) * p, y: g.cy }; }
  const bAng = (b, v) => (b === 0 ? (v ? 90 : 0) : (v ? 135 : 45));
  const bCol = (b) => (b === 0 ? CB : CG);
  function photonGlyph(x, y, b, v, a, big) {
    const r = big ? 11 : 9, ang = bAng(b, v) * rad;
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    D.glow(x, y, r * 2.4, bCol(b), 0.55);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = bCol(b); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = bCol(b); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * (r - 3), y + Math.sin(ang) * (r - 3)); ctx.lineTo(x + Math.cos(ang) * (r - 3), y - Math.sin(ang) * (r - 3)); ctx.stroke();
    ctx.restore();
  }
  const bSym = (b) => (b === 0 ? '＋' : '×');
  function drawQKD(t) {
    const K = S.k, g = kGeom();
    card(MA, '#fff');
    // 장면 바탕과 통로
    D.roundRect(MA.x + 8, MA.y + 8, MA.w - 16, g.sceneH, 14); const sg = ctx.createLinearGradient(0, MA.y, 0, MA.y + g.sceneH); sg.addColorStop(0, '#eef3ff'); sg.addColorStop(1, '#e3ebfb'); ctx.fillStyle = sg; ctx.fill();
    D.roundRect(g.ax - 26, g.cy - 9, g.bx - g.ax + 52, 18, 9); ctx.fillStyle = 'rgba(56,103,244,.13)'; ctx.fill();
    ctx.save(); ctx.setLineDash([6, 8]); ctx.lineDashOffset = RM ? 0 : -t * 22; ctx.strokeStyle = 'rgba(56,103,244,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.ax - 20, g.cy); ctx.lineTo(g.bx + 20, g.cy); ctx.stroke(); ctx.restore();
    // Alice
    const aw = PHONE ? 62 : 84, ah = PHONE ? 78 : 96;
    const ar = { x: MA.x + (PHONE ? 10 : 20), y: g.cy - ah / 2, w: aw, h: ah };
    D.shadow(() => { D.roundRect(ar.x, ar.y, ar.w, ar.h, 12); const gg = ctx.createLinearGradient(0, ar.y, 0, ar.y + ar.h); gg.addColorStop(0, '#9fb0d8'); gg.addColorStop(1, '#46517a'); ctx.fillStyle = gg; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = '#ffd0c4'; ctx.fillRect(ar.x + ar.w - 8, g.cy - 6, 12, 12);
    T(ar.x + ar.w / 2, ar.y + ar.h / 2 + 8, '👩', PHONE ? 26 : 34, '#fff', 'center', 700);
    T(ar.x + ar.w / 2, ar.y - 10, '송신자 Alice', 13.5, INK, 'center', 800);
    // Bob
    const br = { x: MA.x + MA.w - (PHONE ? 10 : 20) - aw, y: ar.y, w: aw, h: ah };
    D.shadow(() => { D.roundRect(br.x, br.y, br.w, br.h, 12); const gg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h); gg.addColorStop(0, '#9fd8c0'); gg.addColorStop(1, '#3f7a63'); ctx.fillStyle = gg; ctx.fill(); }, { blur: 8, y: 3 });
    if (K.flashB > 0) D.glow(br.x + 6, g.cy, 34, K.lastRound && K.lastRound.err ? CR : CG, 0.7 * K.flashB);
    ctx.fillStyle = '#d6fff0'; ctx.fillRect(br.x - 4, g.cy - 6, 10, 12);
    T(br.x + br.w / 2, br.y + br.h / 2 + 8, '👨', PHONE ? 26 : 34, '#fff', 'center', 700);
    T(br.x + br.w / 2, br.y - 10, '수신자 Bob', 13.5, INK, 'center', 800);
    // Eve
    if (K.eve) {
      const ew = PHONE ? 56 : 74, er = { x: g.ex - ew / 2, y: g.cy - 66, w: ew, h: 132 };
      D.shadow(() => { D.roundRect(er.x, er.y, er.w, er.h, 14); ctx.fillStyle = 'rgba(80,30,40,.88)'; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(er.x, g.cy - 11, er.w, 22);
      if (K.flashE > 0) D.glow(g.ex, g.cy, 46, '#ffd166', 0.75 * K.flashE);
      T(g.ex, er.y + 28, '🕵️', PHONE ? 24 : 30, '#fff', 'center', 700);
      T(g.ex, er.y + er.h + 18, '도청자 Eve', 13.5, CR, 'center', 800);
    }
    // 날아가는 광자
    K.fly.forEach((f) => {
      const p = f.t / K_T, pos = kPos(p, f), hide = f.eve && Math.abs(p - 0.5) < 0.05;
      const st = f.eve && p >= 0.5 ? f.r.e : f.r.a;
      if (!hide) photonGlyph(pos.x, pos.y, st.b, st.v, 1);
      if (!hide && p < 0.95) T(pos.x, pos.y + 27, bSym(st.b), 14, bCol(st.b), 'center', 900);
      if (f.eve && p >= 0.5 && f.r.eveWrong && p < 0.9) T(pos.x, pos.y - 22, '바뀜!', 12.5, CR, 'center', 900);
    });
    // 표
    drawKTable(g);
    if (PHONE) drawKStats(MA.x + 8, MA.y + 436, MA.w - 16, 76);
  }
  function drawKTable(g) {
    const K = S.k, cols = K.cols;
    const rows = [['Alice 기준', (c) => bSym(c.r.a.b), (c) => bCol(c.r.a.b)], ['Alice 비트', (c) => String(c.r.a.v), () => INK]];
    if (K.eve) rows.push(['Eve 기준', (c) => (c.eve && c.r.e ? bSym(c.r.e.b) : ''), (c) => (c.r.e ? bCol(c.r.e.b) : INK)]);
    rows.push(['Bob 기준', (c) => bSym(c.r.bob.b), (c) => bCol(c.r.bob.b)], ['Bob 결과', (c) => String(c.r.bob.v), () => INK], ['기준이 같은가', (c) => (c.r.same ? '✓' : '✗'), (c) => (c.r.same ? CG : '#8a95a8')], ['키 비트', null, null]);
    const lw = PHONE ? 78 : 104, nC = K_MAXC, x0 = MA.x + 10 + lw, cw = (MA.w - 20 - lw) / nC;
    const ty = MA.y + (PHONE ? 206 : 224), rh = PHONE ? 30 : 25;
    rows.forEach((rw, i) => {
      const y = ty + i * rh;
      D.roundRect(MA.x + 10, y, MA.w - 20, rh - 3, 7); ctx.fillStyle = i % 2 ? '#f6f8fd' : '#eef2fa'; ctx.fill();
      T(MA.x + 16, y + rh - 9, rw[0], PHONE ? 13 : 13, INK, 'left', 800);
      for (let c = 0; c < nC; c++) {
        const col = cols[c], cx = x0 + c * cw + cw / 2;
        if (!col) { T(cx, y + rh - 9, '·', 14, '#c7cfdf', 'center', 800); continue; }
        if (rw[1]) {
          const s = rw[1](col);
          if (rw[0] === 'Eve 기준' && col.r.eveWrong) { ctx.strokeStyle = CR; ctx.lineWidth = 2; D.roundRect(cx - cw / 2 + 2, y + 1, cw - 4, rh - 5, 5); ctx.stroke(); }
          T(cx, y + rh - 9, s, rw[0].indexOf('기준') >= 0 ? 17 : 15, rw[2](col), 'center', 900);
        } else {
          if (col.r.same) { D.roundRect(cx - cw / 2 + 3, y + 2, cw - 6, rh - 7, 5); ctx.fillStyle = col.r.err ? CR : CG; ctx.fill(); T(cx, y + rh - 9, String(col.r.a.v), 14.5, '#fff', 'center', 900); }
          else T(cx, y + rh - 9, '–', 14, '#8a95a8', 'center', 800);
        }
      }
    });
  }
  function rateTxt(o) { return o.sift ? ((o.err / o.sift) * 100).toFixed(0) + ' %' : '—'; }
  function drawKStats(x, y, w, h) {
    const bw = (w - 10) / 2;
    [['off', 'Eve 없음', CG], ['on', 'Eve 있음', CR]].forEach(([k, nm, col], i) => {
      const o = S.k.tot[k], cur = (S.k.eve ? 'on' : 'off') === k, bx = x + i * (bw + 10);
      D.roundRect(bx, y, bw, h, 12); ctx.fillStyle = cur ? '#fff6e6' : '#f1f4fb'; ctx.fill(); if (cur) { ctx.strokeStyle = '#ffb400'; ctx.lineWidth = 2.4; ctx.stroke(); }
      T(bx + 12, y + 20, nm, 14.5, col, 'left', 800);
      T(bx + 12, y + h / 2 + 8, '오류율 ' + rateTxt(o), 19, INK, 'left', 800);
      T(bx + 12, y + h - 10, '키 ' + o.sift + '개 중 오류 ' + o.err + '개', 12.5, MUTE, 'left', 700);
    });
  }

  /* ---------- ③ 다양한 기술 ---------- */
  function drawCard(c, scale) {
    const r = { x: c.x, y: c.y, w: c.w, h: c.h }, big = c.w > 300, compact = c.w < 260;
    ctx.save();
    if (scale && scale !== 1) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(scale, scale); ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2)); }
    const dx = c.shake ? Math.sin(c.shake * 40) * 6 * Math.min(1, c.shake * 3) : 0;
    ctx.translate(dx, 0);
    const placed = c.placed >= 0, sel = S.tc.sel === c.i;
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = placed ? '#eafaf1' : '#fff'; ctx.fill(); }, { blur: c.lift ? 16 : 7, y: c.lift ? 8 : 3, color: 'rgba(20,40,80,.28)' });
    ctx.strokeStyle = placed ? CG : sel ? '#f26b3a' : '#cfd8ea'; ctx.lineWidth = placed || sel ? 2.6 : 1.4; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
    T(r.x + 24, r.y + r.h / 2 + 9, c.ic, compact ? 22 : 26, INK, 'center', 700);
    if (compact) { T(r.x + 48, r.y + r.h / 2 + 5, c.t, 14, INK, 'left', 800); if (placed) T(r.x + r.w - 12, r.y + r.h / 2 + 6, '✔', 16, CG, 'right', 900); }
    else {
      T(r.x + 48, r.y + (PHONE ? 20 : 19), c.t, PHONE ? 14 : 14.5, INK, 'left', 800);
      const lines = wrap(c.d, r.w - 62, PHONE ? 12.5 : 12.5, 700).slice(0, 2);
      lines.forEach((l, i) => T(r.x + 48, r.y + (PHONE ? 37 : 34) + i * 14, l, 12.5, MUTE, 'left', 700));
      if (placed) T(r.x + r.w - 10, r.y + 20, '✔', 16, CG, 'right', 900);
    }
    ctx.restore();
  }
  function drawTech(t, dt) {
    const tc = S.tc;
    card(MA, '#f4f7fd');
    FIELDS.forEach((f, i) => {
      const r = slotRect(i), occ = tc.occ[i] != null;
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = occ ? '#dff3e8' : '#fff'; ctx.fill();
      ctx.save(); ctx.setLineDash(occ ? [] : [7, 5]); ctx.strokeStyle = occ ? CG : '#9fb0d8'; ctx.lineWidth = 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke(); ctx.restore();
      if (!occ) {
        T(r.x + r.w / 2, r.y + r.h / 2 + 7, f.ic + ' ' + f.n + ' 분야', PHONE ? 15 : 17, MUTE, 'center', 800);
        if (tc.drag && tc.drag.over === i) { ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke(); }
        else if (tc.sel != null) { D.ring(r.x + r.w - 14, r.y + 14, 5, t, { color: '#f26b3a', width: 2 }); }
      }
    });
    // 카드: 놓은 것 → 놓지 않은 것 → 끄는 중인 것 순서로
    tc.cards.forEach((c) => { if (c.placed >= 0) drawCard(c); });
    tc.cards.forEach((c) => { if (c.placed < 0 && !(tc.drag && tc.drag.c === c)) drawCard(c); });
    FIELDS.forEach((f, i) => { if (tc.occ[i] == null) return; const r = slotRect(i); if (!PHONE) pill(r.x + 62, r.y - 7, f.ic + ' ' + f.n, CG, '#fff', 12.5, {}); else pill(r.x + r.w - 8, r.y - 1, f.ic + ' ' + f.n, CG, '#fff', 12, { align: 'right' }); });
    if (tc.drag) drawCard(tc.drag.c, 1.04);
    // 설명 칸 + 통신망 지도
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const sel = tc.drag ? tc.drag.c : tc.sel != null ? tc.cards[tc.sel] : null;
    const mapW = PHONE ? 120 : 220;
    T(BOT.x + 16, BOT.y + 26, sel ? sel.ic + ' ' + sel.t : '기술 카드를 눌러 보세요', 16, '#d6452f', 'left', 800);
    textBlock(BOT.x + 16, BOT.y + 50, BOT.w - 32 - mapW, sel ? sel.info : '카드를 끌어서 알맞은 분야 칸에 놓아요. 카드를 누르면 설명이 나와요.', PHONE ? 13 : 14.5, INK, PHONE ? 18 : 21, 700);
    drawNetMap(BOT.x + BOT.w - mapW - 8, BOT.y + 8, mapW, BOT.h - 16, t, sel && sel.id === 'net');
  }
  const CITY = [[0.1, 0.62], [0.32, 0.35], [0.5, 0.7], [0.72, 0.4], [0.9, 0.66]];
  function drawNetMap(x, y, w, h, t, hot) {
    D.roundRect(x, y, w, h, 10); ctx.fillStyle = '#eaf0fc'; ctx.fill();
    const P = (c) => ({ x: x + c[0] * w, y: y + c[1] * h });
    const links = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 3]];
    links.forEach(([a, b], i) => {
      const pa = P(CITY[a]), pb = P(CITY[b]);
      ctx.strokeStyle = hot ? 'rgba(56,103,244,.8)' : 'rgba(56,103,244,.4)'; ctx.lineWidth = hot ? 2.4 : 1.6; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      const k = RM ? 0.5 : ((t * 0.5 + i * 0.23) % 1);
      D.sphere(pa.x + (pb.x - pa.x) * k, pa.y + (pb.y - pa.y) * k, 3.6, i % 2 ? CG : CO, { gloss: false });
    });
    const sat = { x: x + w * 0.5, y: y + h * 0.16 };
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(139,92,246,.7)'; ctx.lineWidth = 1.4; [1, 3].forEach((c) => { const p = P(CITY[c]); ctx.beginPath(); ctx.moveTo(sat.x, sat.y + 6); ctx.lineTo(p.x, p.y); ctx.stroke(); }); ctx.restore();
    T(sat.x, sat.y + 5, '🛰️', 15, INK, 'center', 700);
    CITY.forEach((c) => { const p = P(c); D.sphere(p.x, p.y, 5, '#26324a', { gloss: false }); });
    T(x + w / 2, y + h - 5, '양자 통신망 (모형)', 12, MUTE, 'center', 700);
  }

  /* ---------- ④ 사회 토론 ---------- */
  function drawSoc(t, dt) {
    const sc = SCEN[S.so.cur], i = S.so.cur;
    card(MA, '#f4f7fd');
    const H = PHONE ? 104 : 142;
    D.roundRect(MA.x + 8, MA.y + 8, MA.w - 16, H, 14); ctx.fillStyle = '#fff'; ctx.fill();
    T(MA.x + 24, MA.y + 48, sc.ic, PHONE ? 26 : 32, INK, 'left', 700);
    T(MA.x + (PHONE ? 62 : 74), MA.y + (PHONE ? 38 : 38), (i + 1) + '. ' + sc.t, PHONE ? 16 : 18, '#d6452f', 'left', 800);
    textBlock(MA.x + (PHONE ? 20 : 74), MA.y + (PHONE ? 64 : 62), MA.w - (PHONE ? 40 : 100), sc.d, PHONE ? 13 : 14, INK, PHONE ? 17 : 19, 700);
    // 시나리오 1: 시간 흐름
    if (i === 0 && !PHONE) {
      S.so.tl = (S.so.tl + dt * 0.28) % 1;
      const nodes = [['오늘: 암호화해 저장', MA.x + 150], ['도둑이 몰래 복사해 보관', MA.x + 388], ['미래: 양자 컴퓨터로 해독', MA.x + 626]];
      nodes.forEach(([s, x], k) => { pill(x, MA.y + 112, s, k === 1 ? CR : k === 2 ? CV : CB, '#fff', 13, {}); });
      [[220, 316], [458, 548]].forEach(([a, b], k) => { const x1 = MA.x + a, x2 = MA.x + b; D.arrow(x1, MA.y + 112, x2, MA.y + 112, { color: '#8a95a8', width: 3, head: 10 }); const pk = (S.so.tl + k * 0.5) % 1; D.sphere(x1 + (x2 - x1) * pk, MA.y + 112, 4, '#ffb400', { gloss: false }); });
    }
    const sv = stanceOf(i);
    if (sv >= 0) T(MA.x + 20, MA.y + H - (PHONE ? 4 : 0), '🙋 나의 입장: ' + sc.stance[sv], PHONE ? 12.5 : 13.5, '#5a3fb0', 'left', 800);
    // 이익 · 위험 · 대비
    const cy0 = MA.y + H + 16, chH = MA.h - H - 24;
    CAT.forEach((cat, c) => {
      let r;
      if (!PHONE) { const cw = (MA.w - 16 - 20) / 3; r = { x: MA.x + 8 + c * (cw + 10), y: cy0, w: cw, h: chH }; }
      else { const rh = (chH - 12) / 3; r = { x: MA.x + 8, y: cy0 + c * (rh + 6), w: MA.w - 16, h: rh }; }
      D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = cat.bg; ctx.fill();
      if (!PHONE) { D.roundRect(r.x, r.y, r.w, 34, 14); ctx.fillStyle = cat.col; ctx.fill(); ctx.fillRect(r.x, r.y + 18, r.w, 16); T(r.x + r.w / 2, r.y + 23, cat.ic + ' ' + cat.n, 15, '#fff', 'center', 800); }
      else { D.roundRect(r.x, r.y, 70, r.h, 14); ctx.fillStyle = cat.col; ctx.fill(); ctx.fillRect(r.x + 50, r.y, 20, r.h); T(r.x + 35, r.y + r.h / 2 - 2, cat.ic, 20, '#fff', 'center', 700); T(r.x + 35, r.y + r.h / 2 + 18, cat.n, 14, '#fff', 'center', 800); }
      const items = sc.st.map((s, k) => ({ s, k, v: clsVal(i, k) })).filter((q) => q.v === c);
      const ax = r.x + (PHONE ? 80 : 10), aw = r.w - (PHONE ? 90 : 20), ay = r.y + (PHONE ? 6 : 42);
      if (!items.length) T(ax + aw / 2, r.y + (PHONE ? r.h / 2 + 5 : 90), '(비어 있어요)', 13, '#9aa6bd', 'center', 700);
      items.forEach((q, n) => {
        const ih = PHONE ? 56 : 78, yy = ay + n * (ih + 6), ok = q.s.c === c;
        D.roundRect(ax, yy, aw, ih, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = ok ? cat.col : CR; ctx.lineWidth = ok ? 2 : 2.4; if (!ok) ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
        textBlock(ax + 8, yy + (PHONE ? 20 : 22), aw - 34, q.s.t, PHONE ? 12.5 : 13.5, INK, PHONE ? 16 : 18, 700);
        T(ax + aw - 8, yy + 20, ok ? '✅' : '❌', 15, INK, 'right', 700);
        if (!ok) T(ax + aw - 8, yy + ih - 8, '다시 생각해 봐요', 12, CR, 'right', 800);
      });
    });
    // 완성 배지
    if (scenDone(i)) pill(MA.x + MA.w - 20, MA.y + 24, '✔ 이 시나리오 완성', CG, '#fff', 13, { align: 'right' });
    // 아래 안내
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    T(BOT.x + 16, BOT.y + 26, '정답은 하나가 아니에요', 16, '#d6452f', 'left', 800);
    textBlock(BOT.x + 16, BOT.y + 50, BOT.w - 32, '같은 기술도 이익과 위험이 함께 있어요. 문장을 이익 · 위험 · 대비로 나누고, 근거를 들어 나의 입장을 정해 보세요. 완성한 시나리오: ' + doneCount() + ' / 4, 정한 입장: ' + stanceCount() + ' / 4', PHONE ? 14 : 15, INK, PHONE ? 20 : 22, 700);
  }

  /* ---------- 아래 안내 칸 ---------- */
  function drawBotQC() {
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const n = S.n, a = tC(n), b = tQ(n);
    let head, body;
    if (n <= 128) { head = '작은 문제는 고전 컴퓨터가 빨라요'; body = n + '비트에서는 고전 컴퓨터 ' + human(a) + ', 양자 컴퓨터 ' + human(b) + '이에요. 크기가 작을 때는 양자 컴퓨터의 이득이 없어요. 스마트폰 앱이나 문서 작성도 마찬가지예요.'; }
    else { head = n + '비트: 문제가 클수록 양자 컴퓨터가 유리해요'; body = '고전 컴퓨터는 약 ' + human(a) + ', 양자 컴퓨터는 약 ' + human(b) + '이에요(이론적 추정). 단, 지금의 양자 컴퓨터는 오류와 규모의 한계 때문에 아직 이런 큰 문제를 풀지 못해요.'; }
    T(BOT.x + 16, BOT.y + 26, head, 16, '#d6452f', 'left', 800);
    textBlock(BOT.x + 16, BOT.y + 50, BOT.w - 32, body, PHONE ? 14 : 15, INK, PHONE ? 20 : 22, 700);
  }
  function drawBotKKD() {
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const K = S.k, tw = PHONE ? BOT.w - 32 : 440;
    let head, body;
    if (!K.cols.length && !K.fly.length) { head = '키 분배 게임'; body = 'Alice가 광자에 비트(0/1)를 실어 + 기준 또는 × 기준으로 보내요. Bob은 기준을 무작위로 골라 측정해요. 기준이 같은 광자의 비트만 비밀 키가 돼요.'; }
    else if (K.eve) { head = '도청자 Eve가 끼어들었어요'; body = 'Eve도 기준을 무작위로 골라 측정해요. 기준을 틀린(빨간 테두리) 광자는 상태가 바뀌어 Bob의 결과가 50 %는 틀려요. 키 비트에서 빨간 칸이 오류예요.'; }
    else { head = '도청자가 없을 때'; body = '기준이 같은 광자(초록 칸)는 Alice와 Bob의 비트가 100 % 일치해요. 기준이 다른 광자는 버려요.'; }
    T(BOT.x + 16, BOT.y + 26, head, 16, '#d6452f', 'left', 800);
    textBlock(BOT.x + 16, BOT.y + 50, tw, body, PHONE ? 13.5 : 14.5, INK, PHONE ? 19 : 21, 700);
    if (!PHONE) drawKStats(BOT.x + BOT.w - 316, BOT.y + 12, 304, BOT.h - 24);
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'qc') {
      L1 = '수의 크기'; a = bitsTxt(S.n) + (S.n === 2048 ? ' (RSA-2048)' : '');
      L2 = '고전 컴퓨터가 걸리는 시간'; b = human(tC(S.n));
      L3 = '양자 컴퓨터가 걸리는 시간'; c = human(tQ(S.n));
    } else if (S.mode === 'qkd') {
      const o = kCur();
      L1 = '키 비트 (Eve ' + (S.k.eve ? '있음' : '없음') + ')'; a = o.sift + '개 (광자 ' + o.sent + '개 중)';
      L2 = '오류 비트'; b = o.err + '개';
      L3 = '오류율'; c = rateTxt(o);
    } else if (S.mode === 'tech') {
      L1 = '연결한 기술'; a = S.tc.placed + ' / 6';
      L2 = '잘못 연결한 횟수'; b = S.tc.wrong + '번';
      L3 = '고른 카드'; c = S.tc.sel != null ? S.tc.cards[S.tc.sel].t : '—';
    } else {
      L1 = '완성한 시나리오'; a = doneCount() + ' / 4';
      L2 = '정한 입장'; b = stanceCount() + ' / 4';
      L3 = '지금 시나리오'; c = (S.so.cur + 1) + '. ' + SCEN[S.so.cur].t;
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  // 받침이 있으면 첫째, 없으면 둘째 조사
  const josa = (w, a, b) => { const ch = w.charCodeAt(w.length - 1); return ch >= 0xAC00 && ch <= 0xD7A3 && (ch - 0xAC00) % 28 !== 0 ? a : b; };
  /* ---------- 포인터: 기술 카드 끌어서 놓기 ---------- */
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const slotAt = (p) => { for (let i = 0; i < FIELDS.length; i++) { const r = slotRect(i); if (inR(p, { x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 })) return i; } return -1; };
  function returnHome(c) { SciSim.tween(c, { x: c.home.x, y: c.home.y, w: c.home.w, h: c.home.h }, { duration: 0.38, ease: 'outBack' }); }
  function tryPlace(c, si) {
    const tc = S.tc, r = slotRect(si);
    if (tc.occ[si] != null) { returnHome(c); showHint('그 칸에는 이미 카드가 있어요.', 2200); return false; }
    if (FIELDS[si].id !== c.f) {
      tc.wrong++; c.shake = 0.55; Sound.fail(); returnHome(c);
      showHint('“' + c.t + '”' + josa(c.t, '은', '는') + ' ' + FIELDS[si].n + ' 분야보다 더 알맞은 분야가 있어요. 설명을 읽고 다시 생각해 봐요.', 3600);
      return false;
    }
    c.placed = si; tc.occ[si] = c.i; tc.placed++; tc.sel = null;
    SciSim.tween(c, { x: r.x, y: r.y, w: r.w, h: r.h }, { duration: 0.42, ease: 'outBack' });
    Sound.success(); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 16, colors: ['#ffb400', CG, CB], speed: 150, life: 0.7, size: 4 });
    return true;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'tech') return false;
      const tc = S.tc;
      if (tc.sel != null) { const si = slotAt(p); if (si >= 0 && tc.occ[si] == null) { tryPlace(tc.cards[tc.sel], si); return false; } }
      for (let k = tc.cards.length - 1; k >= 0; k--) {
        const c = tc.cards[k];
        if (c.placed < 0 && inR(p, c)) { tc.drag = { c, dx: p.x - c.x, dy: p.y - c.y, sx: p.x, sy: p.y, moved: 0, over: -1 }; c.lift = 1; Sound.click(); return true; }
      }
      return false;
    },
    move(p) { const d = S.tc.drag; if (!d) return; d.c.x = p.x - d.dx; d.c.y = p.y - d.dy; d.moved = Math.max(d.moved, Math.hypot(p.x - d.sx, p.y - d.sy)); d.over = slotAt(p); },
    up(p) {
      const tc = S.tc, d = tc.drag; if (!d) return;
      tc.drag = null; d.c.lift = 0;
      if (d.moved < 6) { tc.sel = tc.sel === d.c.i ? null : d.c.i; returnHome(d.c); return; }
      const si = slotAt(p);
      if (si >= 0) tryPlace(d.c, si); else returnHome(d.c);
    },
    hover(p) { return S.mode === 'tech' && S.tc.cards.some((c) => c.placed < 0 && inR(p, c)) ? 'grab' : 'default'; },
  });

  /* ---------- 미션 ---------- */
  const rateOf = (o) => (o.sift ? o.err / o.sift : 0);
  function resetSoc() { SOC_CLS.forEach((s) => s.reset()); SOC_ST.forEach((s) => s.reset()); SEL_EFF.reset(); S.so.cur = 0; S.so.seen = { 0: true }; }

  const levels = [
    {
      title: '양자 컴퓨터: 특정 문제에서 빠를 가능성', short: '양자 컴퓨터', icon: '💻', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 아무도 몰래 엿볼 수 없는 통신은 어떻게 가능하고, 양자 컴퓨터는 우리 생활을 어떻게 바꿀까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 큐비트 n개는 2ⁿ가지 값의 중첩이고 측정하면 한 값만 얻는다는 것을, <b>통합과학</b>에서는 디지털 정보와 사물 인터넷을 배웠어요. 이번에는 그 규칙이 사회에서 어떤 기술이 되는지, 그리고 우리 삶에 어떤 영향을 줄지 살펴봐요.</div>' +
        '<p><b>양자 컴퓨터</b>는 큐비트의 중첩을 이용해 <b>특정한 문제</b>(큰 수의 소인수분해, 분자 시뮬레이션, 최적화)에서 기존 컴퓨터보다 훨씬 빠를 가능성이 있어요. 하지만 모든 계산이 빨라지는 것은 아니고, 지금은 오류 · 냉각 · 규모의 한계가 있어요. 이 차시는 물리 원리의 계산보다 <b>사회에 미치는 영향</b>을 중심으로 해요.</p>',
      features: ['qc'],
      setup() { S.n = 512; slB.set(512); S.seenSmall = false; S.seenBig = false; S.show.selQ = false; SEL_Q.reset(); setScene('qc'); },
      recap: '양자 컴퓨터는 큰 수의 소인수분해 같은 특정 문제에서 기존 컴퓨터보다 훨씬 빠를 가능성이 있지만, 모든 계산이 빨라지는 것은 아니에요. 지금은 오류 · 냉각 · 규모의 한계가 있어요.',
      summary: '<ul><li>문제의 크기가 커질수록 고전 컴퓨터의 시간은 <b>급격히</b> 늘고, 양자 컴퓨터의 시간은 <b>완만하게</b> 늘어요(이론적 추정, 모형). RSA 2048비트: 고전 수만 년 이상, 충분히 큰 양자 컴퓨터 수 시간 이내.</li><li>작은 문제(약 100비트 이하)는 고전 컴퓨터가 더 빨라요. 스마트폰 앱 · 문서 작성 · 동영상 재생 같은 일은 양자 컴퓨터의 이득이 없어요.</li><li>쓰임: 신약 분자 설계 · 신소재 · 물류 최적화 · 큰 수의 소인수분해(연구 중인 분야 포함).</li><li>현재 한계: 큐비트가 오류에 약하고, −273 °C에 가까운 극저온이 필요하며, 수백~천여 개 큐비트 수준이에요.</li></ul>',
      missions: [
        {
          title: '문제 크기에 따른 시간 비교하기',
          goal: '“수의 크기” 슬라이더로 <b>작은 수(128비트 이하)</b>와 <b>RSA 크기(2048비트)</b>를 각각 맞춰, 두 컴퓨터가 걸리는 시간을 비교하세요.',
          hint: '“64”와 “2048 (RSA)” 칩을 눌러 보세요. 곡선이 어디에서 서로 엇갈리나요? 그래프의 눈금은 시간을 로그로 나타낸 거예요.',
          setup() { S.show.selQ = false; setScene('qc'); },
          check: () => S.mode === 'qc' && S.seenSmall && S.seenBig,
          hold: 0.8,
          status: () => mark(S.seenSmall) + ' 작은 수(128비트 이하) &nbsp; ' + mark(S.seenBig) + ' RSA 크기(2048비트) &nbsp; · 지금 ' + S.n + '비트',
          explain: '약 100비트 이하의 작은 수는 고전 컴퓨터가 더 빨라요. 수가 커지면 고전 컴퓨터의 시간은 급격히 늘어 2048비트에서는 약 10만 년(수만 년 이상)이 되고, 양자 컴퓨터는 약 8시간(수 시간 이내)이에요. 이것은 충분히 큰 양자 컴퓨터를 가정한 이론적 추정이에요.',
        },
        {
          title: '양자 컴퓨터가 이득인 일 가려내기', manual: true,
          goal: '8가지 일에서 양자 컴퓨터의 <b>이득 가능성이 큰 일</b>과 <b>작은 일</b>을 나누세요.',
          hint: '큰 수의 소인수분해 · 분자나 소재의 양자 현상 계산 · 많은 경우의 수 중 최적을 찾는 일은 가능성이 커요. 스마트폰 앱 · 문서 작성 · 동영상 · 이메일 · 웹 검색은 기존 컴퓨터로 충분해요.',
          setup() { S.show.selQ = true; SEL_Q.reset(); setScene('qc'); },
          check: () => SEL_Q.grade(),
          status: () => '고른 일 ' + SEL_Q.count() + ' / 8',
          explain: '양자 컴퓨터는 <b>특정 문제</b>에서 이득이 커요: 신약 후보 분자와 신소재의 계산(양자 현상 따라 하기), 큰 수의 소인수분해, 경우의 수가 많은 최적화(아직 연구 중). 스마트폰 앱 · 문서 작성 · 동영상 재생 · 웹 검색 같은 일은 기존 컴퓨터로도 충분히 빨라서 이득이 없어요.',
        },
        {
          type: 'quiz', title: '양자 컴퓨터가 기존 컴퓨터를 대체할까?',
          goal: '앞으로 양자 컴퓨터가 기존 컴퓨터를 완전히 대체할까요?',
          setup() { S.show.selQ = false; setScene('qc'); },
          choices: ['아니에요. 특정 문제에서 이득이 크고, 일상적인 계산은 기존 컴퓨터가 계속 맡아요', '네. 양자 컴퓨터는 모든 계산을 즉시 끝내기 때문이에요', '네. 큐비트가 많아지면 문서 작성도 훨씬 빨라지기 때문이에요', '아니에요. 양자 컴퓨터는 계산 결과를 알 수 없어서 쓸 수 없기 때문이에요'],
          answer: 0,
          feedback: ['', '양자 컴퓨터가 모든 계산을 즉시 끝내는 것은 아니에요. 측정하면 한 값만 얻으므로 문제에 맞게 설계해야 이득이 생겨요.', '문서 작성 같은 일은 큐비트의 중첩으로 빨라지는 문제가 아니에요. 이득이 없는 일이 많아요.', '결과는 측정으로 얻을 수 있어요. 다만 오류와 규모의 한계가 있어 아직 큰 문제에는 쓰기 어려운 거예요.'],
          explain: '양자 컴퓨터는 <b>특정 문제</b>(소인수분해, 분자 시뮬레이션, 최적화 등)에서 큰 이득을 줄 가능성이 있는 도구예요. 기존 컴퓨터를 대체하는 것이 아니라 <b>함께 쓰이는</b> 방향으로 연구되고 있어요.',
        },
      ],
    },
    {
      title: '양자 암호: 도청은 들통나요', short: '양자 암호', icon: '🔐', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 양자 컴퓨터가 지금의 암호를 풀 수 있다는 이야기를 했어요. 그럼 엿볼 수 없는 통신은 어떻게 만들까요? 앞 차시의 <b>“측정하면 상태가 바뀐다”</b>를 떠올려 봐요.</div>' +
        '<p><b>양자 키 분배</b>: Alice가 광자의 편광에 0/1 비트를 실어 보내요. 이때 두 가지 <b>기준</b>(＋ 기준과 × 기준) 중 하나를 무작위로 골라요. Bob도 기준을 무작위로 골라 측정하고, 나중에 공개 채널로 <b>기준만</b> 비교해 기준이 같았던 시행의 비트만 비밀 키로 써요. 중간에서 도청자 Eve가 측정하면 광자의 상태가 바뀌어서 Bob의 결과에 <b>오류</b>가 생겨요.</p>',
      features: ['qkd'],
      setup() { S.k.eve = false; S.k.tot = { off: { sent: 0, sift: 0, err: 0 }, on: { sent: 0, sift: 0, err: 0 } }; kClearView(); S.show.selK = false; SEL_K.reset(); setScene('qkd'); },
      recap: '도청자가 없으면 기준이 같은 광자의 비트는 100 % 일치하지만, 도청자가 있으면 측정으로 광자의 상태가 바뀌어 키 비트에 약 25 %의 오류가 생겨요. 양자 암호는 도청을 막는 것이 아니라 도청을 알아채요.',
      summary: '<ul><li>Alice가 기준(＋ 또는 ×)과 비트를 무작위로 골라 광자를 보내고, Bob도 기준을 무작위로 골라 측정해요. 공개 채널로 <b>기준만</b> 비교해 기준이 같은 시행의 비트를 비밀 키로 써요.</li><li>도청자가 <b>없으면</b> 키 비트의 오류율은 0 %예요.</li><li>도청자 Eve가 기준을 무작위로 골라 측정해서 다시 보내면: 기준을 맞출 확률 1/2(상태 그대로), 틀릴 확률 1/2(Bob의 결과가 50 % 틀림) → 오류율 1/2 × 1/2 = <b>약 25 %</b>.</li><li>키의 일부를 공개 비교해 오류율이 높으면 그 키를 <b>버려요</b>(도청 탐지). 양자 암호는 도청을 “막는” 것이 아니라 “알아채는” 것이에요.</li></ul>',
      missions: [
        {
          title: 'Eve가 있을 때와 없을 때 오류율 비교',
          goal: 'Eve를 <b>끈 채로</b> 키 비트 10개 이상, Eve를 <b>켠 채로</b> 키 비트 60개 이상 만든 뒤 두 오류율을 비교하세요.',
          hint: '“광자 20개 보내기”는 키 비트가 평균 10개쯤 만들어져요. “200개 더 (빠르게)”를 쓰면 키 비트가 100개쯤 만들어져 오류율이 25 %에 가까워져요.',
          setup() { S.show.selK = false; setScene('qkd'); },
          check: () => S.mode === 'qkd' && S.k.tot.off.sift >= 10 && S.k.tot.on.sift >= 60 && rateOf(S.k.tot.on) >= 0.1 && rateOf(S.k.tot.on) <= 0.4,
          hold: 0.8,
          status: () => mark(S.k.tot.off.sift >= 10) + ' Eve 없음: 키 ' + S.k.tot.off.sift + ' / 10개, 오류율 ' + rateTxt(S.k.tot.off) + ' &nbsp; ' + mark(S.k.tot.on.sift >= 60 && rateOf(S.k.tot.on) >= 0.1 && rateOf(S.k.tot.on) <= 0.4) + ' Eve 있음: 키 ' + S.k.tot.on.sift + ' / 60개, 오류율 ' + rateTxt(S.k.tot.on),
          explain: 'Eve가 없으면 기준이 같은 광자의 비트는 항상 일치해서 오류율이 <b>0 %</b>예요. Eve가 있으면 Eve가 기준을 틀린 광자(1/2)는 상태가 바뀌고 Bob의 결과가 절반은 틀려서 오류율이 1/2 × 1/2 = <b>약 25 %</b>가 돼요. 광자가 적을 때는 운이 좋아 오류가 안 보일 수도 있어서, 많이 비교할수록 확실해요.',
        },
        {
          title: '도청 탐지 정리하기', manual: true,
          goal: '키 분배 게임에서 본 것을 바탕으로 도청 탐지 방법을 정리하세요.',
          hint: 'Eve가 없으면 0 %, 있으면 약 25 %였어요. Eve가 기준을 맞게 고른 광자는 상태가 바뀌지 않았어요. 오류율이 높으면 어떻게 할까요?',
          setup() { S.show.selK = true; SEL_K.reset(); setScene('qkd'); },
          check: () => SEL_K.grade(),
          status: () => '고른 문장 ' + SEL_K.count() + ' / 4',
          explain: '도청이 없으면 오류율 0 %, 도청이 있으면 약 25 %예요. Eve가 기준을 맞게 고른 광자는 상태가 그대로라 오류가 없고, 틀리게 고른 광자에서만 오류가 생겨요. 키의 일부를 공개 비교해 오류율이 높으면 <b>도청을 의심하고 그 키를 버린 뒤</b> 새로 키를 나눠요.',
        },
        {
          type: 'quiz', title: '양자 암호는 도청을 막을까, 알아챌까?',
          goal: '양자 암호 통신에서 도청자에 대해 알맞은 설명은?',
          setup() { S.show.selK = false; setScene('qkd'); },
          choices: ['도청 자체를 막지는 못하지만, 도청이 있으면 오류율이 올라가 알아챌 수 있어요', '도청자는 광자를 절대 볼 수 없어요', '도청을 해도 오류율이 변하지 않아서 알 수 없어요', '도청이 있으면 키가 저절로 더 안전해져요'],
          answer: 0,
          feedback: ['', 'Eve도 광자를 측정할 수 있어요. 다만 측정하면 상태가 바뀌어 흔적이 남아요(“볼 수 없다”가 아니라 “보면 들통난다”).', '도청이 있으면 오류율이 약 25 %로 올라가요. 그것이 도청을 알아채는 단서예요.', '키가 안전해지는 것이 아니라, 오류율을 확인해 도청이 의심되면 그 키를 버려요.'],
          explain: '양자 암호의 핵심은 “측정하면 상태가 바뀐다”예요. 도청자도 광자를 측정할 수는 있지만 측정하는 순간 상태가 바뀌어 오류가 생기고, 이 오류율을 확인해서 <b>도청을 탐지</b>해요. 도청을 막는 것이 아니라 도청이 있었는지 알아채는 기술이에요.',
        },
      ],
    },
    {
      title: '다양한 기술: 센서 · 시뮬레이션 · 통신망', short: '다양한 기술', icon: '🧭', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 양자 컴퓨터와 양자 암호를 살펴봤어요. 중첩과 측정, 그리고 원자의 에너지 준위(<b>물리학</b>)를 이용하는 양자 기술은 이것만이 아니에요.</div>' +
        '<p>양자 센서(원자시계, 정밀 자기장 센서), 양자 시뮬레이션, 양자 통신망 같은 기술이 의료 · 항법 · 금융 · 국방 · 신소재 · 통신 분야에서 연구되고 쓰이고 있어요. 기술 카드 6장을 알맞은 분야 칸에 끌어다 놓아 연결해 봐요.</p>',
      features: ['tech'],
      setup() { S.show.selT = false; SEL_T.reset(); resetCards(); setScene('tech'); },
      recap: '양자 센서는 양자 상태가 작은 변화에 민감한 것을, 양자 시뮬레이션은 양자 현상을 따라 계산하는 것을, 양자 통신망은 도청 탐지가 가능한 키 분배를 이용해요. 의료 · 항법 · 금융 · 국방 · 신소재 · 통신 분야에 쓰여요.',
      summary: '<ul><li><b>양자 센서</b>: 원자나 광자의 양자 상태가 시간 · 자기장 · 중력의 작은 변화에 민감한 것을 이용해요. 원자시계(항법), 정밀 자기장 센서(뇌 신호 등 의료), 양자 관성 센서(교란 속 위치 추정, 연구 중).</li><li><b>양자 시뮬레이션</b>: 분자나 소재의 양자 현상을 따라 계산해 신약 후보 분자와 신소재(배터리 등)를 연구해요(연구 단계).</li><li><b>양자 통신망</b>: 도시 사이를 광섬유 · 위성으로 이어 키를 나눠요. 우리나라에도 양자 암호 통신 시범망이 있어요. 금융 거래 보호에도 쓸 수 있어요.</li><li>시간 오차 1 ns = 빛이 약 30 cm 가는 시간 → 항법 위성에는 원자시계가 필요해요.</li></ul>',
      missions: [
        {
          title: '기술 카드를 분야에 연결하기',
          goal: '기술 카드 6장을 끌어서 알맞은 <b>분야 칸</b>에 모두 연결하세요.',
          hint: '카드를 누르면 아래에 설명이 나와요. 원자시계는 위성 시각, 자기장 센서는 뇌 신호, 시뮬레이션은 소재, 암호 키는 은행, 관성 센서는 군용, 통신망은 도시 연결이 힌트예요.',
          setup() { S.show.selT = false; setScene('tech'); },
          check: () => S.mode === 'tech' && S.tc.placed === 6,
          hold: 0.8,
          status: () => mark(S.tc.placed === 6) + ' 연결한 기술 ' + S.tc.placed + ' / 6 &nbsp; · 잘못 놓은 횟수 ' + S.tc.wrong,
          explain: '원자시계는 위성 <b>항법</b>의 시각 기준, 양자 자기장 센서는 뇌 신호를 재는 <b>의료</b>, 양자 시뮬레이션은 <b>신소재</b>(신약도 포함) 연구, 양자 암호 키 분배는 <b>금융</b> 거래 보호, 양자 관성 센서는 <b>국방</b>, 양자 통신망은 <b>통신</b> 분야와 이어져요.',
        },
        {
          title: '기술과 개념 연결하기', manual: true,
          goal: '양자 기술과 앞에서 배운 개념을 문장으로 연결하세요.',
          hint: '양자 센서는 양자 상태가 환경의 작은 변화에 민감한 것을, 양자 통신은 “측정하면 상태가 바뀐다”를 이용해요.',
          setup() { S.show.selT = true; SEL_T.reset(); setScene('tech'); },
          check: () => SEL_T.grade(),
          status: () => '고른 문장 ' + SEL_T.count() + ' / 3',
          explain: '양자 센서는 양자 상태가 작은 변화에 <b>민감하게 반응</b>하는 성질을 이용해요. 양자 시뮬레이션은 양자 컴퓨터로 분자 · 소재의 양자 현상을 따라 계산해요. 양자 통신망의 키는 측정하면 상태가 바뀌는 성질 덕분에 <b>도청을 알아챌 수 있어요</b>.',
        },
        {
          type: 'quiz', title: '원자시계가 항법 위성에 중요한 까닭',
          goal: '위성 항법 시스템에서 원자시계가 중요한 까닭은?',
          setup() { S.show.selT = false; setScene('tech'); },
          choices: ['시간 오차 1 ns(10⁻⁹ s)가 빛의 속력(약 3×10⁸ m/s) 때문에 약 30 cm의 위치 오차가 되기 때문에', '시계가 빨라야 위성이 더 빨리 날 수 있기 때문에', '시간 오차는 위치와 관계없고 달력을 맞추는 데만 쓰이기 때문에', '시간 오차 1 ns가 약 30 km의 위치 오차가 되기 때문에'],
          answer: 0,
          feedback: ['', '시계는 위성의 속도를 바꾸지 않아요. 위성에서 오는 신호의 도착 시각으로 거리를 계산하기 때문에 시각이 중요해요.', '항법은 신호가 오는 데 걸린 시간 × 빛의 속력으로 거리를 구해요. 시간 오차가 곧 위치 오차예요.', '3×10⁸ m/s × 10⁻⁹ s = 0.3 m예요. km가 아니라 약 30 cm예요.'],
          explain: '위성 항법은 위성 신호가 도착하는 시간으로 거리를 구해요. 거리 = 빛의 속력 × 시간이므로 3×10⁸ m/s × 1 ns(10⁻⁹ s) = <b>약 0.3 m = 30 cm</b>예요. 그래서 정확도가 높은 원자시계가 필요해요.',
        },
      ],
    },
    {
      title: '사회 토론: 이익 · 위험 · 대비', short: '사회 토론', icon: '🗣️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 양자 기술이 여러 분야에서 쓰이는 모습을 봤어요. 기술은 이익만 주지 않아요. <b>통합과학의 과학 기술과 사회</b>에서 배운 것처럼 이익, 위험, 그리고 대비를 함께 생각해 봐요.</div>' +
        '<p>시나리오 4개(현행 암호가 풀릴 날 · 신약 개발과 기술 격차 · 기술 독점 · 새로운 직업)에서 문장을 <b>이익 · 위험 · 대비</b>로 나눠 보고, 나의 <b>입장</b>을 정해 봐요. 정답이 하나로 정해진 토론이 아니에요. 근거를 들어 생각하는 것이 중요해요.</p>',
      features: ['soc'],
      setup() { resetSoc(); S.show.socCls = false; S.show.socStance = false; setScene('soc'); },
      recap: '양자 기술은 이익과 위험을 함께 가져와요. 지금 가로챈 암호 자료를 나중에 풀 수 있는 위험에 미리 대비하고, 기술 격차와 독점을 줄이기 위해 협력과 교육 같은 사회적 노력이 필요해요.',
      summary: '<ul><li><b>현행 암호</b>: 지금 암호화해 저장한 자료를 나중에 양자 컴퓨터로 풀 수 있어요 → 양자 내성 암호로 미리 전환(2024년 미국 NIST가 첫 표준 발표).</li><li><b>신약 · 신소재</b>: 개발이 빨라지는 이익 vs 기술 격차 → 협력과 교육.</li><li><b>독점</b>: 소수의 보유국 · 기업 → 공공 투자 · 국제 규범.</li><li><b>직업</b>: 양자 소프트웨어 · 양자 보안 등 새 일자리와 인력 부족 → 교육과 재교육.</li><li>양자 기술이 모두에게 이익이 되려면 기술 · 표준 공유와 협력, 교육 기회 확대가 필요해요.</li></ul>',
      missions: [
        {
          title: '이익 · 위험 · 대비로 나누기', manual: true,
          goal: '시나리오 <b>3개 이상</b>에서 문장 3개를 각각 <b>이익 · 위험 · 대비</b>로 나누세요.',
          hint: '“이익”은 기술이 가져오는 좋은 점, “위험”은 생길 수 있는 문제, “대비”는 위험을 줄이기 위한 노력이에요. 틀린 문장은 화면에 ❌로 표시돼요.',
          setup() { S.show.socCls = true; S.show.socStance = false; setScene('soc'); },
          check() {
            SOC_CLS.forEach((s, i) => { if (scenAny(i)) s.grade('', ''); });
            const n = doneCount();
            return n >= 3 ? true : '완성한 시나리오가 ' + n + '개예요. 3개 이상 완성해 보세요. 틀린 문장은 화면에 ❌로 표시돼요.';
          },
          status: () => '완성한 시나리오 ' + doneCount() + ' / 4 (3개 이상)' + SCEN.map((s, i) => ' &nbsp;' + mark(scenDone(i)) + (i + 1)).join(''),
          explain: '같은 기술도 이익과 위험이 함께 있어요. <b>이익</b>(양자 키 분배, 신약 개발 가속, 투자와 발전, 새 일자리), <b>위험</b>(가로챈 자료의 해독, 기술 격차, 독점, 인력 부족), <b>대비</b>(양자 내성 암호 전환, 협력과 교육, 공공 투자와 규범, 재교육)로 생각해 볼 수 있어요.',
        },
        {
          title: '나의 입장 정하기', manual: true,
          goal: '시나리오를 바꿔 가며 <b>나의 입장</b>을 2개 이상 정하고, 양자 기술이 모두에게 이익이 되려면 필요한 노력도 고르세요.',
          hint: '입장에는 정답이 없어요. 어떤 이익과 위험을 중요하게 생각하는지 떠올려 보세요.',
          setup() { S.show.socCls = false; S.show.socStance = true; setScene('soc'); },
          check() {
            if (stanceCount() < 2) return '시나리오를 바꿔 가며 나의 입장을 2개 이상 정해 보세요. (지금 ' + stanceCount() + '개)';
            return SEL_EFF.grade();
          },
          status: () => mark(stanceCount() >= 2) + ' 정한 입장 ' + stanceCount() + ' / 2개 이상 &nbsp; · 노력 고르기 ' + SEL_EFF.count() + ' / 1',
          explain: '입장은 사람마다 다를 수 있고 각각 근거가 있어요. 중요한 것은 이익과 위험을 함께 따져 보고 대비를 생각하는 거예요. 어떤 입장이든 양자 기술이 모두에게 이익이 되려면 <b>기술과 표준을 공유하는 협력</b>, <b>교육 기회 확대</b>, 투명한 규범 같은 사회적 노력이 필요해요.',
        },
        {
          type: 'quiz', title: '왜 지금부터 대비해야 할까',
          goal: '지금 암호화된 자료를 훔쳐 두었다가 양자 컴퓨터가 생긴 뒤에 풀 위험이 있어요. 그래서 지금부터 대비해야 하는 까닭은?',
          setup() { S.show.socCls = false; S.show.socStance = false; setScene('soc'); },
          choices: ['오래 보관해야 하는 중요한 자료는 지금 가로채 저장해 두었다가 나중에 풀 수 있으므로, 양자 컴퓨터가 생기기 전에 미리 암호를 바꿔야 하기 때문에', '양자 컴퓨터가 이미 모든 암호를 풀고 있기 때문에', '암호를 바꾸는 데는 시간이 들지 않아 아무 때나 해도 되기 때문에', '기존 암호는 영원히 안전해서 바꿀 필요가 없기 때문에'],
          answer: 0,
          feedback: ['', '지금의 양자 컴퓨터는 오류와 규모의 한계로 실제 암호를 풀 만큼 크지 않아요. 그래서 “미래의 위험”에 미리 대비하는 거예요.', '암호 체계를 바꾸는 데는 오랜 시간과 비용이 들어요. 그래서 일찍 준비를 시작해야 해요.', '현행 공개키 암호는 큰 수의 소인수분해가 어렵다는 가정에 기대요. 충분히 큰 양자 컴퓨터가 생기면 이 가정이 깨질 수 있어요.'],
          explain: '지금 가로챈 자료를 <b>나중에</b> 풀 수 있다는 점이 핵심이에요(저장해 두었다가 나중에 해독). 오래 비밀로 지켜야 하는 자료는 양자 컴퓨터가 생기기 <b>전에</b> 양자 내성 암호로 바꿔야 해요. 암호 체계를 바꾸는 데 시간이 오래 걸려서 지금부터 준비해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-quantum-tech', mount: '#game', badge: '양자 사회 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { qc: '💻 걸리는 시간 그래프 · 한계 카드', qkd: '🔐 키 분배 게임 · 도청자 Eve', tech: '🧭 기술 카드 끌어서 연결하기', soc: '🗣️ 시나리오 · 이익 위험 대비' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetCards(); resetSoc();
  setScene('qc'); updateCtl();
  let lastFree = false, lastMode = 'qc';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { if (lastMode === 'qkd') kClearView(); lastMode = S.mode; }
    view.apply();
    if (S.mode === 'qkd') kStep(dt);
    S.tc.cards.forEach((c) => { if (c.shake > 0) c.shake = Math.max(0, c.shake - dt); });
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'qc') { drawQC(t); drawBotQC(); } else if (S.mode === 'qkd') { drawQKD(t); drawBotKKD(); } else if (S.mode === 'tech') drawTech(t, dt); else drawSoc(t, dt);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, BOT, SEL_Q, SEL_K, SEL_T, SOC_CLS, SOC_ST, SEL_EFF, SCEN, TECH, FIELDS, setScene, updateCtl, setBits, slB, tC, tQ, human, genRound, kStep, kSpawn, cardHome, slotRect, resetCards, tryPlace, doneCount, stanceCount, kClearView, kGeom,
    perfPrep(m) { setScene(m); if (m === 'qkd') { S.k.eve = true; updateCtl(); setInterval(() => { if (S.k.q < 5) S.k.q += 20; }, 1500); } },
    get game() { return game; },
  };
})();
