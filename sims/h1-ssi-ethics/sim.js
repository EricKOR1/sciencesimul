/* =========================================================
   통합과학2 Ⅲ. 과학과 미래 사회 - 과학 쟁점과 윤리 (단원 6차시)
   성취기준 [10통과2-03-04] 과학기술의 발전 과정에서 발생할 수 있는 과학 관련 사회적 쟁점(SSI)과 과학기술 이용에서
   과학 윤리의 중요성에 대해 논증할 수 있다.
   ① 관찰: 쟁점 찾기 (가상 쟁점 카드 6장, 사실 판단 vs 가치 판단)
   ② 탐구: 여러 입장 (감염병 동선 공개 범위, 이해관계자 5명의 주장·가치·근거 유형)
   ③ 설명: 과학 윤리 (조작 의심 자료 찾기, 윤리 원칙과 사례 짝짓기)
   ④ 적용: 논증하기 (주장 – 근거 – 가치 기준 – 반론 대응 – 결론 틀에 카드 배치)
   ※ 모든 사례는 가상이며, 특정 인물·기업·정치적 입장을 지목하지 않고 결론을 정해 주지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  const PHONE_VH = 1040;
  /* ---------- 공통 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? (typeof PHONE_VH === 'number' ? PHONE_VH : 840) : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f6fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FS = PHONE ? 1.2 : 1;
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  let game = null;
  const has = (n) => !!(game && game.has(n));

  function wrapText(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    const push = () => { if (line) out.push(line); line = ''; };
    str.split(' ').forEach((tok) => {
      const cand = line ? line + ' ' + tok : tok;
      if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
      if (line) push();
      if (ctx.measureText(tok).width <= maxW) { line = tok; return; }
      tok.split('').forEach((ch) => { if (ctx.measureText(line + ch).width > maxW) push(); line += ch; });
    });
    push(); ctx.restore(); return out;
  }
  function paraText(x, y, str, maxW, size, o) {
    o = o || {};
    const lines = wrapText(str, maxW, size, o.weight || 700), lh = Math.round(size * (o.lh || 1.35) * FS);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, color: o.color || '#1b2333', weight: o.weight || 700, align: o.align || 'left', alpha: o.alpha }));
    return lines.length * lh;
  }
  function panel(x, y, w, h, fill, stroke) {
    ctx.fillStyle = 'rgba(30,45,80,.10)'; rr(x, y + 3, w, h, 16).fill();
    ctx.fillStyle = fill || '#fff'; rr(x, y, w, h, 16).fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; rr(x, y, w, h, 16).stroke(); }
  }
  function fitText(str, maxW, size, weight) { // 한 줄에 맞게 말줄임
    ctx.save(); ctx.font = D.font(size, weight || 700);
    let s = str;
    if (ctx.measureText(s).width > maxW) { while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1); s += '…'; }
    ctx.restore(); return s;
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const L1 = $('#l1'), V1 = $('#v1'), L2 = $('#l2'), V2 = $('#v2'), L3 = $('#l3'), V3 = $('#v3');
  let rlast = '';
  function setRead(a, b, c) { // [라벨, 값] 3개
    const k = a.join('|') + b.join('|') + c.join('|'); if (k === rlast) return; rlast = k;
    L1.textContent = a[0]; V1.textContent = a[1]; L2.textContent = b[0]; V2.textContent = b[1]; L3.textContent = c[0]; V3.textContent = c[1];
  }
  function segBind(sel, fn) { $$(sel + ' button').forEach((b) => b.addEventListener('click', () => { Sound.click(); fn(b.dataset.v, b); })); }
  function segSet(sel, v) { $$(sel + ' button').forEach((x) => x.classList.toggle('on', String(x.dataset.v) === String(v))); }

  /* ---------- 카드 끌어 놓기 보드 ----------
     cards: [{id, ans, ...}] / zones: [{id, x, y, w, h, cap, fixed, slots:[{x,y,w,h}(중심 좌표)]}] / homes: 카드별 처음 자리 {x,y,w,h}(중심) */
  function makeBoard(cards, zones, homes) {
    const B = { cards, zones, homes, drag: null, seq: 0, ok: false, okA: 0 };
    cards.forEach((c, i) => {
      const h = homes[i];
      Object.assign(c, { hid: i, x: h.x, y: h.y, w: h.w, h: h.h, tx: h.x, ty: h.y, tw: h.w, th: h.h, lift: 0, shake: 0, free: false, zone: null, slot: -1, bad: false, seq: 0 });
    });
    return B;
  }
  function bdLayout(B) {
    B.zones.forEach((z) => {
      if (z.fixed) return;
      B.cards.filter((c) => c.zone === z.id).sort((a, b) => a.seq - b.seq).forEach((c, k) => { c.slot = k; });
    });
    B.cards.forEach((c) => {
      if (c.zone) { const z = B.zones.find((q) => q.id === c.zone), s = z.slots[c.slot]; c.tx = s.x; c.ty = s.y; c.tw = s.w; c.th = s.h; }
      else { const h = B.homes[c.hid]; c.tx = h.x; c.ty = h.y; c.tw = h.w; c.th = h.h; }
      if (!B.drag || B.drag.c !== c) c.free = false;
    });
  }
  function bdPick(B, p) { for (let i = B.cards.length - 1; i >= 0; i--) { const c = B.cards[i]; if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; } return null; }
  function bdStart(B, c, p) {
    B.drag = { c, ox: p.x - c.x, oy: p.y - c.y };
    const i = B.cards.indexOf(c); if (i >= 0) { B.cards.splice(i, 1); B.cards.push(c); }
    c.zone = null; c.slot = -1; c.free = true; c.bad = false; B.ok = false;
    SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click();
    bdLayout(B);
  }
  function bdMove(B, p) { if (!B.drag) return; B.drag.c.x = p.x - B.drag.ox; B.drag.c.y = p.y - B.drag.oy; }
  function bdDrop(B, c, p) {
    B.drag = null; c.free = false;
    const z = B.zones.find((q) => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h);
    let ok = false;
    if (z && z.accept && !z.accept(c)) { c.zone = null; c.slot = -1; c.shake = 0.45; Sound.fail(); bdLayout(B); SciSim.tween(c, { lift: 0 }, { duration: 0.25 }); return; }
    if (z) {
      const used = new Set(B.cards.filter((o) => o !== c && o.zone === z.id).map((o) => o.slot));
      if (z.fixed) {
        let best = -1, bd = 1e9;
        z.slots.forEach((s, i) => { if (used.has(i)) return; const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { c.zone = z.id; c.slot = best; ok = true; }
      } else if (used.size < z.cap) { c.zone = z.id; c.slot = used.size; c.seq = ++B.seq; ok = true; }
    }
    if (ok) { Sound.tick(); parts.burst(c.x, c.y, { count: 5, speed: 60, size: 2.5, life: 0.4, gravity: 0, colors: ['#93c5fd', '#fff'] }); }
    else { c.zone = null; c.slot = -1; if (z) { c.shake = 0.45; Sound.fail(); } }
    bdLayout(B); SciSim.tween(c, { lift: 0 }, { duration: 0.25 });
  }
  function bdReset(B) { B.cards.forEach((c) => { c.zone = null; c.slot = -1; c.bad = false; c.free = false; c.shake = 0; }); B.drag = null; B.ok = false; B.okA = 0; B.cards.sort((a, b) => a.hid - b.hid); bdLayout(B); }
  function bdStep(B, dt) {
    B.cards.forEach((c) => {
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      c.w = approach(c.w, c.tw, dt, 14); c.h = approach(c.h, c.th, dt, 14);
      if (c.free) return;
      c.x = approach(c.x, c.tx, dt, 14); c.y = approach(c.y, c.ty, dt, 14);
    });
  }
  function bdSnap(B) { B.cards.forEach((c) => { c.x = c.tx; c.y = c.ty; c.w = c.tw; c.h = c.th; }); }
  function bdPlaced(B) { return B.cards.filter((c) => c.zone).length; }
  function cardBox(c, o) {
    o = o || {};
    const lift = c.lift || 0, sc = 1 + lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * Math.min(1, c.shake * 3) : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(sc, sc);
    if (lift > 0.05) D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 7, color: 'rgba(30,45,80,' + (0.16 + lift * 0.12) + ')' });
    else { ctx.fillStyle = 'rgba(30,45,80,.13)'; rr(-c.w / 2, -c.h / 2 + 3, c.w, c.h, 11).fill(); ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).fill(); }
    ctx.strokeStyle = o.stroke || '#cbd5e1'; ctx.lineWidth = o.sw || 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).stroke();
    return () => ctx.restore();
  }
  function bdDraw(B, bodyFn, strokeFn) {
    B.cards.forEach((c) => {
      const end = cardBox(c, { stroke: strokeFn ? strokeFn(c) : (c.bad ? '#e2464b' : c.zone ? '#3867f4' : '#cbd5e1'), sw: c.zone ? 2.5 : 2 });
      ctx.beginPath(); rr(-c.w / 2 + 1, -c.h / 2 + 1, c.w - 2, c.h - 2, 10); ctx.save(); ctx.clip();
      bodyFn(c);
      ctx.restore();
      end();
    });
  }
  // 모든 카드가 놓였는지 / 틀린 카드 표시: judge(c) → true면 맞음
  function bdJudge(B, judge, names) {
    const un = B.cards.filter((c) => !c.zone);
    if (un.length) return '아직 놓지 않은 카드가 <b>' + un.length + '장</b> 있어요.';
    const bad = B.cards.filter((c) => !judge(c));
    bad.forEach((c) => { if (!c.bad) { c.bad = true; c.shake = 0.5; } });
    if (bad.length) return '<b>' + bad.length + '장</b>의 위치를 다시 생각해 보세요. (빨간 테두리)';
    B.cards.forEach((c) => { c.bad = false; });
    if (!B.ok) { B.ok = true; SciSim.tween(B, { okA: 1 }, { duration: 0.8 }); B.cards.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
    return true;
  }
  // 위치를 일부러 채우는 디버그용
  function bdFill(B, zoneOf) { // zoneOf(c, i) → zone id
    bdReset(B);
    B.cards.forEach((c, i) => { const zid = zoneOf(c, i); if (!zid) return; const z = B.zones.find((q) => q.id === zid); c.zone = zid; c.seq = ++B.seq; if (z.fixed) { const used = new Set(B.cards.filter((o) => o !== c && o.zone === zid).map((o) => o.slot)); c.slot = z.slots.findIndex((s, k) => !used.has(k)); } });
    bdLayout(B); bdSnap(B); B.ok = false;
  }

  /* ======================================================
     자료 (모든 사례는 가상이에요. 특정 인물·기업·정치적 입장을 지목하지 않아요.)
     ====================================================== */
  const mixC = SciSim.color.mix, rgba = SciSim.color.rgba;
  const ISSUES = [
    { ico: '🦠', name: '감염병 동선 공개', text: '가상의 도시에서 감염병이 퍼졌어요. 도시는 확진자의 이동 경로를 어디까지 알릴지 정해야 해요. 자세히 알리면 접촉자를 빨리 찾을 수 있지만, 확진자의 사생활이 드러날 수 있어요.',
      q: [{ t: '경로를 자세히 알리면 접촉자를 찾는 데 걸리는 시간이 줄어들까?', type: 1 }, { t: '확진자의 사생활보다 이웃의 안전을 더 우선해야 할까?', type: 2 }] },
    { ico: '🌾', name: '유전자 변형 작물', text: '가상의 마을에서 병충해에 강하도록 유전자를 바꾼 벼를 재배하자는 의견이 나왔어요. 수확량이 늘 수 있지만, 환경과 건강에 미칠 영향을 걱정하는 사람도 있어요.',
      q: [{ t: '우리 지역에서 이 벼의 재배를 허용해야 할까?', type: 2 }, { t: '이 벼를 먹은 사람에게서 건강 이상이 더 많이 나타날까?', type: 1 }] },
    { ico: '📷', name: '얼굴 인식 카메라', text: '가상의 구청이 거리에 얼굴 인식 카메라를 설치하려고 해요. 범죄 예방에 도움이 될 수 있지만, 모르는 사이에 내 얼굴이 기록되는 것을 불편해하는 사람도 있어요.',
      q: [{ t: '카메라를 설치한 거리에서 범죄 신고 건수가 줄었을까?', type: 1 }, { t: '안전을 위해 내 얼굴이 기록되는 것을 받아들여야 할까?', type: 2 }] },
    { ico: '🧬', name: '유전체 정보 제공', text: '가상의 건강 서비스 회사가 이용자의 유전체 정보를 받아 질병 위험을 알려 주겠다고 해요. 건강 관리에 도움이 되지만, 정보가 새면 불이익을 받을까 걱정하는 사람도 있어요.',
      q: [{ t: '내 유전체 정보를 서비스 회사에 맡겨도 괜찮을까?', type: 2 }, { t: '유전체 정보로 특정 질병이 생길 위험을 어느 정도 예측할 수 있을까?', type: 1 }] },
    { ico: '🚗', name: '자율주행차 책임', text: '가상의 자동차 회사가 만든 자율주행차가 사고를 냈어요. 차가 스스로 판단해 달리는 동안 난 사고의 책임을 누가 져야 하는지 의견이 갈려요.',
      q: [{ t: '사고의 책임은 제조사와 차 주인 중 누가 더 져야 할까?', type: 2 }, { t: '사고 직전 30초 동안 차의 센서가 무엇을 감지했을까?', type: 1 }] },
    { ico: '🐭', name: '동물 실험', text: '가상의 연구소가 새 약의 안전성을 확인하려고 동물 실험을 해요. 사람에게 쓰기 전에 위험을 확인할 수 있지만, 동물이 겪는 고통을 줄여야 한다는 의견도 있어요.',
      q: [{ t: '컴퓨터 모의실험만으로 약의 부작용을 모두 알아낼 수 있을까?', type: 1 }, { t: '사람을 위해 동물이 겪는 고통을 어디까지 허용해야 할까?', type: 2 }] },
  ];
  // type: 1 = 사실(과학으로 확인할 수 있는 질문), 2 = 가치(사회가 정해야 할 질문)
  const LAB = ['눌러서 고르기', '🔬 사실 판단', '⚖️ 가치 판단'];
  const LAB_COL = ['#94a3b8', '#0ea5e9', '#f59e0b'];

  const CLAIMS = ['자세히 공개', '필요한 만큼만 공개', '거의 공개하지 않음'];
  const VALUES = ['이웃의 안전', '개인의 사생활', '가게의 생계', '정확한 정보와 신뢰'];
  const ETYPES = ['사실', '가치'];
  const VOICES = [
    { ico: '🤒', role: '확진 환자', say: '제 이동 경로가 자세히 알려지면 사는 곳과 직장이 드러나서 비난받을 것 같아요. 접촉자에게는 방문한 장소와 시간만 알려 줘도 충분하다고 생각해요.', reason: '누구나 비난받지 않고 치료받을 수 있어야 해요.', claim: 1, value: 1, etype: 1 },
    { ico: '🧓', role: '이웃 주민', say: '같은 건물에서 확진자가 나오면 어디를 피해야 하는지 자세히 알아야 해요. 경로를 자세히 공개한 뒤 접촉자 연락 시간이 이틀에서 하루로 줄었다는 조사도 있었어요.', reason: '자세히 공개한 뒤 접촉자 연락 시간이 이틀에서 하루로 줄었다는 조사가 있어요.', claim: 0, value: 0, etype: 0 },
    { ico: '🧑‍⚕️', role: '방역 담당자', say: '접촉자를 찾으려면 시간과 장소는 꼭 필요하지만 이름이나 직장까지 알릴 필요는 없어요. 공개 범위가 넓었던 지역에서 검사를 받으러 오는 사람이 줄었다는 보고도 있어요.', reason: '공개 범위가 넓었던 지역에서 검사를 받는 사람이 줄었다는 보고가 있어요.', claim: 1, value: 3, etype: 0 },
    { ico: '🏪', role: '상점 주인', say: '우리 가게 이름이 알려지면 손님이 끊겨서 생계가 어려워져요. 가게 이름은 공개하지 말고 접촉자에게만 따로 연락해 주면 좋겠어요.', reason: '생계가 무너지는 억울한 일이 없어야 해요.', claim: 2, value: 2, etype: 1 },
    { ico: '🛡️', role: '개인정보 전문가', say: '공개된 이동 경로를 다른 정보와 합치면 이름이 없어도 누구인지 알아낼 수 있어요. 그래서 공개 범위는 최소로 하고 꼭 필요한 사람에게만 알려야 해요.', reason: '공개된 경로를 다른 정보와 합치면 이름 없이도 개인을 알아낼 수 있어요.', claim: 2, value: 1, etype: 0 },
  ];

  const DATA_A = [12.1, 11.8, 12.4], DATA_B = [12.0, 12.0, 12.0];
  const mean3 = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10;
  const DATA_C = Array.from({ length: 10 }, (_, i) => Math.round((5 + 0.9 * (i + 1) + hash(i * 3.7 + 1) * 0.7) * 10) / 10);
  const PRINC = [
    { id: 'honest', ico: '📝', name: '정직', d: '자료를 조작하거나 베끼지 않아요', col: '#0ea5e9' },
    { id: 'consent', ico: '🤝', name: '동의', d: '충분히 설명하고 허락을 받아요', col: '#8b5cf6' },
    { id: 'safe', ico: '🦺', name: '안전', d: '사람과 환경을 위험하지 않게 지켜요', col: '#16a34a' },
    { id: 'resp', ico: '🧭', name: '책임', d: '결과를 예측하고 책임을 져요', col: '#f59e0b' },
    { id: 'fair', ico: '⚖️', name: '공정', d: '누구도 차별하지 않아요', col: '#e2464b' },
  ];
  const CASES = [
    { id: 'c1', ans: 'consent', t: '연구에 참여할 사람에게 연구 내용과 위험을 설명하고 참여하겠다는 허락을 받았어요.' },
    { id: 'c2', ans: 'honest', t: '실험 결과가 기대와 달라도 측정값을 그대로 적고, 인용한 글은 출처를 밝혔어요.' },
    { id: 'c3', ans: 'fair', t: '얼굴 인식 프로그램을 만들 때 여러 나이와 피부색의 자료를 고르게 넣었어요.' },
    { id: 'c4', ans: 'safe', t: '위험한 약품을 쓸 때 보안경을 쓰고, 쓰고 남은 약품은 정해진 방법으로 버렸어요.' },
    { id: 'c5', ans: 'resp', t: '새 기술이 일으킬 수 있는 문제를 미리 따져 보고, 사고가 나면 책임지겠다고 밝혔어요.' },
  ];
  const CASE_ORDER = [3, 0, 4, 1, 2];

  // 논증 틀 자료: 쟁점마다 입장 2개, 근거 카드 6장(사실 4 + 출처 없음 1 + 의견 1), 가치 기준 3장, 반론 대응 2장
  const ARGS = [
    { ico: '📷', name: '얼굴 인식 카메라', pos: [
        { label: '입장 A · 조건을 붙여 설치해요', claim: '얼굴 인식 카메라를 조건을 붙여 설치하는 것이 알맞아요', end: '얼굴 인식 카메라를 보관 기간과 열람 조건을 정해 설치하는 것이 알맞다고 주장합니다.' },
        { label: '입장 B · 설치를 제한해요', claim: '얼굴 인식 카메라 설치를 제한해야 해요', end: '얼굴 인식 카메라 설치를 제한하고 다른 방법을 먼저 찾는 것이 알맞다고 주장합니다.' }],
      ev: [
        { t: '시범 지역에서 6개월 동안 거리 범죄 신고가 시범 전보다 줄었어요.', src: '가상 시 안전조사 보고서', pos: 0, fact: true },
        { t: '시범 기간에 카메라 기록으로 실종자를 찾은 사례가 3건 있었어요.', src: '가상 경찰 시범운영 자료', pos: 0, fact: true },
        { t: '어떤 얼굴 인식 프로그램이 피부색이 어두운 얼굴에서 더 자주 틀렸어요.', src: '가상 대학 연구팀 논문', pos: 1, fact: true },
        { t: '다른 도시에서 얼굴 기록이 저장된 서버가 해킹되어 정보가 새어 나갔어요.', src: '가상 정보보호원 보고서', pos: 1, fact: true },
        { t: '얼굴 인식을 하면 범죄가 완전히 사라진대요.', src: null, pos: 0, fact: true },
        { t: '얼굴이 찍히는 건 정말 기분 나쁜 일이에요.', src: null, pos: 1, fact: false }],
      val: ['safe', 'privacy', 'fair'],
      reb: ['얼굴 기록을 정해진 기간만 보관하고 허가받은 경우에만 열어 보게 하면 사생활 침해를 줄일 수 있어요.', '카메라 대신 가로등과 순찰을 늘리면 얼굴 기록 없이도 거리의 안전을 높일 수 있어요.'] },
    { ico: '🧬', name: '개인 유전체 정보 제공', pos: [
        { label: '입장 A · 조건을 지키며 제공해요', claim: '동의와 보호 조건을 지키며 유전체 정보를 제공해도 좋아요', end: '충분한 동의와 보호 장치가 있다면 유전체 정보를 건강 서비스에 제공해도 좋다고 주장합니다.' },
        { label: '입장 B · 신중하게 제한해요', claim: '유전체 정보 제공은 신중하게 제한해야 해요', end: '유전체 정보는 가족의 정보까지 드러날 수 있으므로 제공을 신중하게 제한해야 한다고 주장합니다.' }],
      ev: [
        { t: '유전체 분석 서비스 이용자 1,000명 중 500명이 위험을 알고 생활 습관을 바꿨어요.', src: '가상 건강연구소 조사', pos: 0, fact: true },
        { t: '유전체 정보로 약의 양을 정해 부작용이 줄어든 사례가 보고되었어요.', src: '가상 의학 학술지', pos: 0, fact: true },
        { t: '이름을 지운 유전체 자료도 다른 정보와 합치면 누구의 것인지 알아낼 수 있어요.', src: '가상 보안 연구팀 실험', pos: 1, fact: true },
        { t: '유전 정보는 가족과 공유돼서 한 사람이 제공해도 가족 정보가 드러날 수 있어요.', src: '가상 유전학 교과서', pos: 1, fact: true },
        { t: '유전체를 검사하면 평생 병에 안 걸린대요.', src: null, pos: 0, fact: true },
        { t: '내 몸 정보를 회사에 맡기는 건 무서운 일이에요.', src: null, pos: 1, fact: false }],
      val: ['safe', 'privacy', 'fair'],
      reb: ['이용 동의를 받고 정보를 암호화해 보관하며 원하면 언제든 지울 수 있게 하면 위험을 줄일 수 있어요.', '건강 관리의 이익은 법으로 보호받는 병원의 검사에서도 얻을 수 있어서 민간 서비스에 맡기지 않아도 돼요.'] },
    { ico: '🚗', name: '자율주행차 사고 책임', pos: [
        { label: '입장 A · 제조사가 더 크게 져요', claim: '자율주행차 사고는 제조사가 더 큰 책임을 져야 해요', end: '자율주행차 사고의 책임은 제조사가 더 크게 져야 한다고 주장합니다.' },
        { label: '입장 B · 차 주인도 나눠 져요', claim: '자율주행차 사고는 차 주인도 책임을 나눠 져야 해요', end: '자율주행차 사고의 책임은 제조사와 차 주인이 나누어 져야 한다고 주장합니다.' }],
      ev: [
        { t: '사고 조사에서 차의 판단 소프트웨어 오류가 원인인 사고가 절반이 넘었어요.', src: '가상 교통안전연구원', pos: 0, fact: true },
        { t: '운전자는 소프트웨어 내부를 확인할 수 없고 제조사만 고칠 수 있어요.', src: '가상 기술 설명서', pos: 0, fact: true },
        { t: '정비와 소프트웨어 업데이트를 미룬 차에서 사고가 더 자주 났어요.', src: '가상 보험 통계 자료', pos: 1, fact: true },
        { t: '운전대를 잡아야 하는 상황에서 휴대전화를 보다가 난 사고 기록이 있어요.', src: '가상 사고기록장치 자료', pos: 1, fact: true },
        { t: '자율주행차는 절대 사고가 안 난다고 들었어요.', src: null, pos: 0, fact: true },
        { t: '책임은 무조건 큰 회사가 져야 마음이 편해요.', src: null, pos: 0, fact: false }],
      val: ['safe', 'resp', 'fair'],
      reb: ['주인이 모든 오류를 확인할 수는 없으니, 오류를 알리고 고치는 책임은 제조사에게 더 크게 있어요.', '주인이 정비와 업데이트를 미루면 위험이 커지므로, 주인이 지킬 책임을 정해 나눠 지는 것이 공정해요.'] },
  ];
  const VAL_INFO = {
    safe: { ico: '🦺', name: '안전', d: '사람들이 위험하지 않게 지켜요' }, privacy: { ico: '🔒', name: '개인정보 보호', d: '내 정보를 함부로 모으지 않아요' },
    fair: { ico: '⚖️', name: '공정', d: '누구도 차별하지 않아요' }, resp: { ico: '🧭', name: '책임', d: '결과를 예측하고 책임져요' },
  };

  /* ======================================================
     상태
     ====================================================== */
  const S = {
    mode: 'issues', fade: 0, clock: 0,
    is: { read: ISSUES.map(() => false), lab: ISSUES.map(() => [0, 0]), bad: ISSUES.map(() => [false, false]), open: -1, popA: 0, pop: ISSUES.map(() => [0, 0]) },
    vc: { read: VOICES.map(() => false), v: [], bad: [], open: -1, popA: 0, tilt: new SciSim.Spring(0, { stiffness: 90, damping: 9 }), pop: [] },
    da: { pick: -1, said: '' },
    board: {},
    ar: { issue: 0, pos: 0, done: false, okA: 0 },
  };
  const IS = S.is, VC = S.vc;
  function isReset() { IS.read = ISSUES.map(() => false); IS.lab = ISSUES.map(() => [0, 0]); IS.bad = ISSUES.map(() => [false, false]); IS.open = -1; IS.pop = ISSUES.map(() => [0, 0]); }
  function vcReset() { VC.read = VOICES.map(() => false); VC.v = VOICES.map((p) => [(p.claim + 1) % 3, (p.value + 1) % 4, (p.etype + 1) % 2]); VC.bad = VOICES.map(() => [false, false, false]); VC.open = -1; VC.pop = VOICES.map(() => [0, 0, 0]); }
  vcReset();
  const isRead = () => IS.read.filter(Boolean).length, vcRead = () => VC.read.filter(Boolean).length;
  const isRight = (i, k) => IS.lab[i][k] === ISSUES[i].q[k].type;
  const isLabeled = () => IS.lab.reduce((n, r) => n + r.filter((v) => v > 0).length, 0);
  const isCorrect = () => IS.lab.reduce((n, r, i) => n + r.filter((v, k) => v === ISSUES[i].q[k].type).length, 0);
  const vcRight = (i, c) => (c === 0 ? VC.v[i][0] === VOICES[i].claim : c === 1 ? VC.v[i][1] === VOICES[i].value : VC.v[i][2] === VOICES[i].etype);
  const vcCorrect = () => VOICES.reduce((n, p, i) => n + [0, 1, 2].filter((c) => vcRight(i, c)).length, 0);

  /* ======================================================
     쟁점 사례 짝짓기 (윤리 원칙) 보드
     ====================================================== */
  function matchBoard() {
    const zones = [], homes = [];
    PRINC.forEach((z, i) => {
      const r = PHONE ? { x: 12, y: 12 + i * 86, w: 576, h: 80 } : { x: 14 + i * 156, y: 14, w: 148, h: 256 };
      zones.push({ id: z.id, x: r.x, y: r.y, w: r.w, h: r.h, cap: 1, fixed: true, z, slots: [PHONE ? { x: r.x + 168 + (r.w - 176) / 2, y: r.y + 40, w: r.w - 182, h: 72 } : { x: r.x + r.w / 2, y: r.y + 112 + 68, w: r.w - 12, h: 136 }] });
    });
    const pos = (t) => (PHONE ? { x: 153 + (t % 2) * 294, y: 480 + 62 + Math.floor(t / 2) * 112, w: 282, h: 104 } : { x: 14 + 74 + t * 156, y: 372, w: 148, h: 148 });
    CASES.forEach((c, ci) => homes.push(pos(CASE_ORDER.indexOf(ci))));
    return makeBoard(CASES.map((c) => Object.assign({}, c)), zones, homes);
  }
  S.board.match = matchBoard();

  /* ======================================================
     논증 틀 보드
     ====================================================== */
  const argIssue = () => ARGS[S.ar.issue], argPos = () => argIssue().pos[S.ar.pos];
  function argGeom() {
    if (!PHONE) {
      const ez = (i) => ({ x: 186 + i * 152, y: 84, w: 140, h: 154 });
      return { head: { x: 14, y: 14, w: 772, h: 62 }, claim: { x: 14, y: 84, w: 160, h: 154 }, zones: { e0: ez(0), e1: ez(1), val: { x: 490, y: 84, w: 130, h: 154 }, reb: { x: 632, y: 84, w: 154, h: 154 } },
        hd: 30, ev: (t) => ({ x: 15 + 125 + (t % 3) * 258, y: 278 + Math.floor(t / 3) * 68, w: 250, h: 60 }), val: (t) => ({ x: 15 + 59 + t * 128, y: 422, w: 118, h: 66 }), reb: (t) => ({ x: 401 + 93 + t * 196, y: 422, w: 186, h: 66 }), chk: { x: 14, y: 464, w: 772, h: 82 } };
    }
    const row = (i) => ({ x: 12, y: 170 + i * 88, w: 576, h: 82 });
    return { head: { x: 12, y: 12, w: 576, h: 86 }, claim: { x: 12, y: 106, w: 576, h: 56 }, zones: { e0: row(0), e1: row(1), val: row(2), reb: row(3) }, hd: 0,
      ev: (t) => ({ x: 153 + (t % 2) * 294, y: 572 + Math.floor(t / 2) * 78, w: 282, h: 72 }), val: (t) => ({ x: 98 + t * 202, y: 808, w: 192, h: 64 }), reb: (t) => ({ x: 153 + t * 294, y: 896, w: 282, h: 84 }), chk: { x: 12, y: 944, w: 576, h: 94 } };
  }
  function argBoard() {
    const G = argGeom(), I = argIssue(), zones = [], homes = [], cards = [];
    const mkZone = (id, kind, label) => { const r = G.zones[id]; const slot = PHONE ? { x: r.x + 124 + (r.w - 132) / 2, y: r.y + r.h / 2, w: r.w - 140, h: r.h - 12 } : { x: r.x + r.w / 2, y: r.y + G.hd + (r.h - G.hd) / 2, w: r.w - 10, h: r.h - G.hd - 8 }; zones.push({ id, x: r.x, y: r.y, w: r.w, h: r.h, cap: 1, fixed: true, label, accept: (c) => c.kind === kind, slots: [slot] }); };
    mkZone('e0', 'ev', '근거 ①'); mkZone('e1', 'ev', '근거 ②'); mkZone('val', 'val', '가치 기준'); mkZone('reb', 'reb', '반론 대응');
    const order = [3, 0, 5, 2, 4, 1];
    I.ev.forEach((e, k) => { cards.push({ id: 'ev' + k, kind: 'ev', data: e }); homes.push(G.ev(order.indexOf(k))); });
    I.val.forEach((v, k) => { cards.push({ id: 'val' + k, kind: 'val', vid: v }); homes.push(G.val(k)); });
    I.reb.forEach((r, k) => { cards.push({ id: 'reb' + k, kind: 'reb', t: r, forPos: k }); homes.push(G.reb(k)); });
    return makeBoard(cards, zones, homes);
  }
  function argReset() { S.board.arg = argBoard(); bdLayout(S.board.arg); bdSnap(S.board.arg); S.ar.done = false; S.ar.okA = 0; }
  const argCard = (zid) => S.board.arg.cards.find((c) => c.zone === zid);
  function argChecks() {
    const e0 = argCard('e0'), e1 = argCard('e1'), v = argCard('val'), r = argCard('reb'), pos = S.ar.pos;
    const evs = [e0, e1].filter(Boolean);
    const src = evs.length === 2 && evs.every((c) => c.data.fact && c.data.src);
    const sup = evs.length === 2 && evs.every((c) => c.data.pos === pos && c.data.fact && c.data.src);
    const bad = evs.filter((c) => !c.data.fact || !c.data.src).length;
    return [
      { ok: src, t: '근거 2개가 모두 사실이고 출처가 있어요', note: evs.length < 2 ? '근거 칸을 모두 채워요' : bad ? '출처가 없거나 사실이 아닌 카드가 있어요' : '' },
      { ok: sup, t: '근거가 내 입장을 지지해요', note: evs.length < 2 ? '' : src && !sup ? '내 입장과 다른 쪽을 지지하는 근거가 있어요' : '' },
      { ok: !!v, t: '가치 기준을 밝혔어요', note: v ? '' : '가치 기준 카드를 놓아요' },
      { ok: !!r && r.forPos === pos, t: '반론을 다루었어요', note: !r ? '반론 대응 카드를 놓아요' : r.forPos !== pos ? '내 입장에 맞는 반론 대응이 아니에요' : '' },
    ];
  }
  const argAllOK = () => argChecks().every((c) => c.ok);

  /* ======================================================
     화면 1: 쟁점 찾기
     ====================================================== */
  function isGeom() {
    if (!PHONE) return { P: { x: 14, y: 14, w: 772, h: 532 }, btn: (i) => ({ x: 24, y: 60 + i * 80, w: 212, h: 70 }), chip: (i, k) => ({ x: 248 + k * 270, y: 60 + i * 80, w: 262, h: 70 }), pop: { x: 60, y: 92, w: 680, h: 360 } };
    return { P: { x: 12, y: 12, w: 576, h: 816 }, btn: (i) => ({ x: 22, y: 56 + i * 124, w: 556, h: 38 }), chip: (i, k) => ({ x: 22 + k * 282, y: 98 + i * 124, w: 274, h: 76 }), pop: { x: 16, y: 150, w: 568, h: 520 } };
  }
  function drawIssues(t) {
    const G = isGeom(), P = G.P;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    panel(P.x, P.y, P.w, P.h);
    D.text(P.x + 16, P.y + 28, PHONE ? '🗂️ 쟁점 카드 (가상 사례) · 읽은 카드 ' + isRead() + ' / ' + ISSUES.length : '🗂️ 과학 관련 사회적 쟁점 (가상 사례) · 읽은 카드 ' + isRead() + ' / ' + ISSUES.length, { size: PHONE ? 13 : 14.5, weight: 800, color: '#334155', align: 'left' });
    if (!PHONE) D.text(P.x + P.w - 16, P.y + 28, '질문: 🔬 사실 / ⚖️ 가치', { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
    ISSUES.forEach((is, i) => {
      const b = G.btn(i), rd = IS.read[i];
      ctx.fillStyle = 'rgba(30,45,80,.1)'; rr(b.x, b.y + 3, b.w, b.h, 14).fill();
      ctx.fillStyle = rd ? '#ecfdf3' : '#fff'; rr(b.x, b.y, b.w, b.h, 14).fill(); ctx.strokeStyle = rd ? '#14a058' : '#cbd5e1'; ctx.lineWidth = 2.5; rr(b.x, b.y, b.w, b.h, 14).stroke();
      D.text(b.x + 14, b.y + b.h / 2 + 9, is.ico, { size: PHONE ? 22 : 28, align: 'left' });
      if (PHONE) { D.text(b.x + 50, b.y + b.h / 2 + 5, is.name, { size: 15, weight: 800, color: '#1b2333', align: 'left' }); D.text(b.x + b.w - 12, b.y + b.h / 2 + 5, rd ? '✓ 읽었어요' : '읽기 ▶', { size: 12.5, weight: 800, color: rd ? '#14a058' : '#64748b', align: 'right' }); }
      else { D.text(b.x + 56, b.y + 30, is.name, { size: 15, weight: 800, color: '#1b2333', align: 'left' }); D.text(b.x + 56, b.y + 52, rd ? '✓ 읽었어요' : '읽기 ▶', { size: 12, weight: 800, color: rd ? '#14a058' : '#64748b', align: 'left' }); }
      [0, 1].forEach((k) => {
        const c = G.chip(i, k), lab = IS.lab[i][k], bad = IS.bad[i][k], pop = IS.pop[i][k], sc = 1 + 0.04 * Math.sin(pop * Math.PI);
        ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(sc, sc); ctx.translate(-c.w / 2, -c.h / 2);
        ctx.fillStyle = 'rgba(30,45,80,.1)'; rr(0, 3, c.w, c.h, 12).fill();
        ctx.fillStyle = !rd ? '#eef1f6' : lab === 1 ? '#e8f6fd' : lab === 2 ? '#fff6e3' : '#fff'; rr(0, 0, c.w, c.h, 12).fill();
        ctx.strokeStyle = bad ? '#e2464b' : !rd ? '#e2e8f0' : LAB_COL[lab]; ctx.lineWidth = bad ? 3 : 2.2; rr(0, 0, c.w, c.h, 12).stroke();
        if (!rd) { D.text(c.w / 2, c.h / 2 + 5, '🔒 사례를 읽으면 질문이 나타나요', { size: 12.5, weight: 700, color: '#94a3b8' }); }
        else {
          D.text(10, 17, LAB[lab], { size: 11.5, weight: 800, color: LAB_COL[lab], align: 'left' });
          paraText(10, 35, ISSUES[i].q[k].t, c.w - 18, PHONE ? 11.5 : 12.5, { color: '#1b2333', lh: 1.25 });
        }
        ctx.restore();
      });
    });
    // 사례 읽기 창
    if (IS.popA > 0.01 && IS.open >= 0) {
      const is = ISSUES[IS.open], pp = G.pop, a = SciSim.ease.outCubic(clamp(IS.popA, 0, 1));
      ctx.fillStyle = 'rgba(15,23,42,' + 0.5 * a + ')'; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.translate(pp.x + pp.w / 2, pp.y + pp.h / 2); ctx.scale(0.9 + 0.1 * a, 0.9 + 0.1 * a); ctx.globalAlpha = a;
      ctx.translate(-pp.w / 2, -pp.h / 2);
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(0, 0, pp.w, pp.h, 22).fill(); }, { blur: 24, y: 8, color: 'rgba(15,23,42,.35)' });
      ctx.fillStyle = '#eef2f7'; rr(0, 0, pp.w, 78, 22).fill(); ctx.fillRect(0, 56, pp.w, 22);
      D.text(36, 56, is.ico, { size: 40, align: 'center' }); D.text(70, 54, is.name, { size: 20, weight: 800, color: '#1b2333', align: 'left' });
      D.text(pp.w - 20, 28, '가상 사례', { size: 12, weight: 800, color: '#64748b', align: 'right' });
      const h = paraText(28, 120, is.text, pp.w - 56, PHONE ? 15 : 16.5, { color: '#334155', lh: 1.5 });
      D.text(28, 120 + h + 36, '👇 이 사례에서 나온 질문 2개가 쟁점 카드 옆에 나타나요.', { size: 14, weight: 800, color: '#3867f4', align: 'left' });
      is.q.forEach((q, k) => paraText(28, 120 + h + 66 + k * (PHONE ? 52 : 40), (k + 1) + '. ' + q.t, pp.w - 56, 13.5, { color: '#475569' }));
      D.text(pp.w / 2, pp.h - 22, '화면을 누르면 닫혀요', { size: 13, weight: 800, color: '#94a3b8' });
      ctx.restore();
    }
  }
  function stepIssues(dt) {
    IS.popA = approach(IS.popA, IS.open >= 0 ? 1 : 0, dt, 12);
    IS.pop.forEach((r) => r.forEach((v, k) => { if (v > 0) r[k] = Math.max(0, v - dt * 4); }));
  }

  /* ======================================================
     화면 2: 여러 입장 (저울 + 표)
     ====================================================== */
  function vcGeom() {
    if (!PHONE) return { sc: { x: 14, y: 14, w: 250, h: 420 }, P: { x: 276, y: 14, w: 510, h: 420 }, person: (i) => ({ x: 286, y: 62 + i * 72, w: 106, h: 64 }), cell: (i, c) => ({ x: 400 + c * 128, y: 62 + i * 72, w: 120, h: 64 }), tip: { x: 14, y: 446, w: 772, h: 100 }, pop: { x: 80, y: 96, w: 640, h: 330 } };
    return { sc: { x: 12, y: 12, w: 576, h: 160 }, P: { x: 12, y: 180, w: 576, h: 600 }, person: (i) => ({ x: 22, y: 192 + i * 118, w: 556, h: 40 }), cell: (i, c) => ({ x: 22 + c * 188, y: 238 + i * 118, w: 180, h: 64 }), tip: { x: 12, y: 786, w: 576, h: 46 }, pop: { x: 16, y: 150, w: 568, h: 460 } };
  }
  function stepVoices(dt) {
    VC.popA = approach(VC.popA, VC.open >= 0 ? 1 : 0, dt, 12);
    let nL = 0, nR = 0; VC.v.forEach((r) => { if (r[0] === 0) nL++; else if (r[0] === 2) nR++; });
    VC.tilt.target = clamp((nR - nL) * 0.13, -(PHONE ? 0.26 : 0.4), PHONE ? 0.26 : 0.4); VC.tilt.update(dt);
    VC.pop.forEach((r) => r.forEach((v, k) => { if (v > 0) r[k] = Math.max(0, v - dt * 4); }));
  }
  function drawVoices(t) {
    const G = vcGeom(), sc = G.sc, P = G.P;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    // 저울
    panel(sc.x, sc.y, sc.w, sc.h);
    D.text(sc.x + 14, sc.y + 24, '⚖️ 입장의 저울', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const px = sc.x + sc.w / 2, py = sc.y + (PHONE ? 52 : 120), half = PHONE ? 150 : 66, th = VC.tilt.value;
    const ex = (s) => ({ x: px + s * half * Math.cos(th), y: py + s * half * Math.sin(th) });
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(px - 12, sc.y + sc.h - 22); ctx.lineTo(px + 12, sc.y + sc.h - 22); ctx.lineTo(px + 4, py); ctx.lineTo(px - 4, py); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#64748b'; rr(px - 34, sc.y + sc.h - 24, 68, 10, 5).fill();
    const L = ex(-1), Rr = ex(1);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(Rr.x, Rr.y); ctx.stroke(); D.sphere(px, py, 7, '#334155', { gloss: false });
    const pans = [[L, '넓게 공개', 0], [Rr, '거의 비공개', 2]];
    pans.forEach(([E, name, claim]) => {
      const pw = PHONE ? 130 : 80, drop = PHONE ? 36 : 46;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(E.x, E.y); ctx.lineTo(E.x - pw / 2, E.y + drop); ctx.moveTo(E.x, E.y); ctx.lineTo(E.x + pw / 2, E.y + drop); ctx.stroke();
      ctx.fillStyle = '#e2e8f0'; rr(E.x - pw / 2, E.y + drop, pw, 9, 4).fill();
      const who = VOICES.map((p, i) => i).filter((i) => VC.v[i][0] === claim);
      who.forEach((i, k) => { const cx = E.x - (who.length - 1) * 13 + k * 26, cy = E.y + drop - 14; ctx.fillStyle = '#fff'; rr(cx - 13, cy - 13, 26, 26, 7).fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(cx - 13, cy - 13, 26, 26, 7).stroke(); D.text(cx, cy + 5, VOICES[i].ico, { size: 15 }); });
      D.text(E.x, E.y + drop + (PHONE ? 22 : 28), name, { size: 12, weight: 800, color: '#475569' });
    });
    const mid = VOICES.map((p, i) => i).filter((i) => VC.v[i][0] === 1);
    mid.forEach((i, k) => { const cx = px - (mid.length - 1) * 15 + k * 30, cy = sc.y + sc.h - 44; ctx.fillStyle = '#fff'; rr(cx - 13, cy - 13, 26, 26, 7).fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(cx - 13, cy - 13, 26, 26, 7).stroke(); D.text(cx, cy + 5, VOICES[i].ico, { size: 15 }); });
    D.text(px, sc.y + sc.h - 4, '가운데: 필요한 만큼만', { size: 11, weight: 700, color: '#64748b' });
    // 표
    panel(P.x, P.y, P.w, P.h);
    D.text(P.x + 14, P.y + 26, '💬 감염병 동선, 어디까지 공개할까? · 읽은 말풍선 ' + vcRead() + ' / ' + VOICES.length, { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    VOICES.forEach((p, i) => {
      const pr = G.person(i), rd = VC.read[i];
      ctx.fillStyle = 'rgba(30,45,80,.1)'; rr(pr.x, pr.y + 3, pr.w, pr.h, 12).fill();
      ctx.fillStyle = rd ? '#ecfdf3' : '#fff'; rr(pr.x, pr.y, pr.w, pr.h, 12).fill(); ctx.strokeStyle = rd ? '#14a058' : '#cbd5e1'; ctx.lineWidth = 2.2; rr(pr.x, pr.y, pr.w, pr.h, 12).stroke();
      if (PHONE) { D.text(pr.x + 14, pr.y + 28, p.ico, { size: 22, align: 'left' }); D.text(pr.x + 52, pr.y + 26, p.role, { size: 14, weight: 800, color: '#1b2333', align: 'left' }); D.text(pr.x + pr.w - 12, pr.y + 26, rd ? '✓ 말풍선 읽음' : '💬 말풍선 보기', { size: 12.5, weight: 800, color: rd ? '#14a058' : '#3867f4', align: 'right' }); }
      else { D.text(pr.x + pr.w / 2, pr.y + 28, p.ico, { size: 24 }); D.text(pr.x + pr.w / 2, pr.y + 46, p.role, { size: 11.5, weight: 800, color: '#1b2333' }); D.text(pr.x + pr.w / 2, pr.y + 59, rd ? '✓ 읽음' : '💬 누르기', { size: 10.5, weight: 800, color: rd ? '#14a058' : '#3867f4' }); }
      [0, 1, 2].forEach((c) => {
        const cl = G.cell(i, c), v = VC.v[i][c], bad = VC.bad[i][c], pop = VC.pop[i][c], hue = ['#0ea5e9', '#8b5cf6', '#f59e0b'][c];
        const txt = c === 0 ? CLAIMS[v] : c === 1 ? VALUES[v] : ETYPES[v];
        const sc2 = 1 + 0.04 * Math.sin(pop * Math.PI);
        ctx.save(); ctx.translate(cl.x + cl.w / 2, cl.y + cl.h / 2); ctx.scale(sc2, sc2); ctx.translate(-cl.w / 2, -cl.h / 2);
        ctx.fillStyle = 'rgba(30,45,80,.1)'; rr(0, 3, cl.w, cl.h, 12).fill(); ctx.fillStyle = '#fff'; rr(0, 0, cl.w, cl.h, 12).fill();
        ctx.strokeStyle = bad ? '#e2464b' : rgba(hue, 0.55); ctx.lineWidth = bad ? 3 : 2; rr(0, 0, cl.w, cl.h, 12).stroke();
        D.text(8, 14, ['주장', '가치', '근거의 종류'][c], { size: 10.5, weight: 800, color: hue, align: 'left' });
        paraText(cl.w / 2, 36, txt, cl.w - 20, PHONE ? 12 : 12.5, { color: '#1b2333', align: 'center', lh: 1.2 });
        D.text(cl.w - 10, cl.h - 8, '▾', { size: 14, weight: 800, color: '#94a3b8', align: 'right' });
        ctx.restore();
      });
    });
    const tp = G.tip; panel(tp.x, tp.y, tp.w, tp.h, '#fffbeb', '#fde68a');
    paraText(tp.x + 16, tp.y + (PHONE ? 20 : 28), '💡 근거가 <사실>인지 <가치>인지 구분해요. 사실은 자료로 확인할 수 있는 내용이고, 가치는 무엇이 옳고 바람직한지에 대한 생각이에요.'.replace(/[<>]/g, ''), tp.w - 32, PHONE ? 11.5 : 13.5, { color: '#92400e' });
    // 말풍선 창
    if (VC.popA > 0.01 && VC.open >= 0) {
      const p = VOICES[VC.open], pp = G.pop, a = SciSim.ease.outCubic(clamp(VC.popA, 0, 1));
      ctx.fillStyle = 'rgba(15,23,42,' + 0.5 * a + ')'; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.translate(pp.x + pp.w / 2, pp.y + pp.h / 2); ctx.scale(0.88 + 0.12 * a, 0.88 + 0.12 * a); ctx.globalAlpha = a; ctx.translate(-pp.w / 2, -pp.h / 2);
      D.text(46, 64, p.ico, { size: 48 }); D.text(46, 90, p.role, { size: 14, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.6)', strokeWidth: 4 });
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(92, 14, pp.w - 106, pp.h - 74, 22).fill(); ctx.beginPath(); ctx.moveTo(92, 52); ctx.lineTo(74, 66); ctx.lineTo(94, 76); ctx.fill(); }, { blur: 20, y: 6, color: 'rgba(15,23,42,.35)' });
      const h = paraText(116, 56, '“' + p.say + '”', pp.w - 154, PHONE ? 15 : 16.5, { color: '#1b2333', lh: 1.5 });
      ctx.fillStyle = '#eff6ff'; rr(116, 56 + h + 12, pp.w - 154, PHONE ? 90 : 76, 12).fill();
      D.text(130, 56 + h + 36, '👉 이 사람이 내세운 근거', { size: 12.5, weight: 800, color: '#3867f4', align: 'left' });
      paraText(130, 56 + h + 58, p.reason, pp.w - 182, 14, { color: '#1e3a8a' });
      D.text(pp.w / 2, pp.h - 18, '화면을 누르면 닫혀요', { size: 13, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.75)', strokeWidth: 4 });
      ctx.restore();
    }
  }

  /* ======================================================
     화면 3: 조작 의심 자료 찾기
     ====================================================== */
  function daGeom() {
    return PHONE ? { pn: (i) => ({ x: 12, y: 12 + i * 236, w: 576, h: 228 }), ex: { x: 12, y: 724, w: 576, h: 110 } } : { pn: (i) => ({ x: 14 + i * 262, y: 14, w: 248, h: 330 }), ex: { x: 14, y: 356, w: 772, h: 190 } };
  }
  const DA_NAMES = ['① 식물 키 (3번 반복)', '② 식물 키 (3번 반복)', '③ 식물 키 변화 (10일)'];
  function drawData(t) {
    const G = daGeom(), da = S.da;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    [0, 1, 2].forEach((i) => {
      const p = G.pn(i), sel = da.pick === i, right = sel && i === 1;
      ctx.fillStyle = 'rgba(30,45,80,.1)'; rr(p.x, p.y + 3, p.w, p.h, 16).fill();
      ctx.fillStyle = right ? '#ecfdf3' : '#fff'; rr(p.x, p.y, p.w, p.h, 16).fill();
      ctx.strokeStyle = right ? '#14a058' : sel ? '#e2464b' : '#cbd5e1'; ctx.lineWidth = sel ? 3.5 : 2; rr(p.x, p.y, p.w, p.h, 16).stroke();
      D.text(p.x + 14, p.y + 26, DA_NAMES[i], { size: 14, weight: 800, color: '#334155', align: 'left' });
      if (i < 2) {
        const arr = i === 0 ? DATA_A : DATA_B, cw = (p.w - 40) / 3, ty = p.y + (PHONE ? 50 : 56), rh = PHONE ? 46 : 52;
        ctx.fillStyle = '#eef2f7'; rr(p.x + 14, ty, p.w - 28, 28, 8).fill();
        ['1번째', '2번째', '3번째'].forEach((h, k) => D.text(p.x + 20 + cw * (k + 0.5), ty + 19, h, { size: 12.5, weight: 800, color: '#475569' }));
        arr.forEach((v, k) => D.text(p.x + 20 + cw * (k + 0.5), ty + 28 + rh * 0.7, v.toFixed(1), { size: PHONE ? 22 : 24, weight: 800, color: '#1b2333' }));
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x + 14, ty + 28 + rh); ctx.lineTo(p.x + p.w - 14, ty + 28 + rh); ctx.stroke();
        D.text(p.x + 20, ty + 28 + rh + 28, '평균', { size: 13, weight: 800, color: '#64748b', align: 'left' }); D.text(p.x + p.w - 20, ty + 28 + rh + 30, mean3(arr).toFixed(1) + ' cm', { size: 20, weight: 800, color: '#0369a1', align: 'right' });
        D.text(p.x + p.w / 2, p.y + p.h - 18, '길이 (cm)', { size: 12, weight: 700, color: '#94a3b8' });
      } else {
        const gx = p.x + 40, gy = p.y + 46, gw = p.w - 56, gh = p.h - 46 - (PHONE ? 40 : 46), ymin = 5, ymax = 16;
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(gx, gy, gw, gh);
        [6, 10, 14].forEach((v) => { const y = gy + gh - (v - ymin) / (ymax - ymin) * gh; ctx.strokeStyle = '#e3e9f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); D.text(gx - 5, y + 4, String(v), { size: 11.5, weight: 700, color: '#64748b', align: 'right' }); });
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
        ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.5; ctx.beginPath(); DATA_C.forEach((v, k) => { const x = gx + gw * (k + 0.5) / 10, y = gy + gh - clamp((v - ymin) / (ymax - ymin), 0, 1) * gh; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
        DATA_C.forEach((v, k) => { const x = gx + gw * (k + 0.5) / 10, y = gy + gh - clamp((v - ymin) / (ymax - ymin), 0, 1) * gh; D.sphere(x, y, 4.5, '#0ea5e9', { outline: '#fff', outlineWidth: 1.5 }); });
        [1, 5, 10].forEach((d) => D.text(gx + gw * (d - 0.5) / 10, gy + gh + 16, d + '일', { size: 11.5, weight: 700, color: '#64748b' }));
        D.text(p.x + 14, p.y + 42, '키 (cm)', { size: 11.5, weight: 700, color: '#94a3b8', align: 'left' });
      }
      if (sel) D.label(p.x + p.w - 14, p.y + 24, right ? '✅ 의심돼요' : '다시 생각해요', { bg: right ? '#14a058' : '#e2464b', size: 12, align: 'right' });
    });
    const ex = G.ex; panel(ex.x, ex.y, ex.w, ex.h);
    D.text(ex.x + 16, ex.y + 28, '🔬 자료 점검', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    const msg = da.pick === 1 ? '② 표는 세 번 잰 값이 모두 12.0 cm로 똑같아요. 같은 방법으로 반복해서 재도 측정값은 조금씩 달라지는 것이 보통이라서, 값을 맞춰 적었거나 지어냈을 수 있어요. 의심되는 자료는 출처와 원자료(처음 측정한 기록)를 확인해야 해요.'
      : da.pick >= 0 ? '이 자료는 값이 조금씩 달라서 자연스러워요. 실제 측정에서는 측정 오차 때문에 값이 조금씩 달라져요. 다른 자료도 살펴볼까요?'
      : '같은 식물의 키를 같은 방법으로 반복해서 재었어요. 세 자료 중 <조작이 의심되는 자료>를 눌러 고르세요. 힌트: 진짜 측정값은 어떻게 달라질까요?'.replace(/[<>]/g, '');
    paraText(ex.x + 16, ex.y + 56, msg, ex.w - 32, PHONE ? 12.5 : 14.5, { color: '#475569', lh: 1.5 });
  }

  /* ======================================================
     화면 4: 윤리 원칙과 사례 짝짓기
     ====================================================== */
  function drawMatch(t) {
    const B = S.board.match;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    B.zones.forEach((z) => {
      const hit = B.drag && B.dragP && B.dragP.x >= z.x && B.dragP.x <= z.x + z.w && B.dragP.y >= z.y && B.dragP.y <= z.y + z.h, used = B.cards.some((c) => c.zone === z.id);
      panel(z.x, z.y, z.w, z.h, hit ? '#eef4ff' : '#fff', B.ok ? '#14a058' : hit ? z.z.col : null);
      ctx.fillStyle = z.z.col; ctx.globalAlpha = 0.14; rr(z.x, z.y, z.w, PHONE ? z.h : 104, 16).fill(); ctx.globalAlpha = 1;
      if (PHONE) { D.text(z.x + 14, z.y + 36, z.z.ico, { size: 26, align: 'left' }); D.text(z.x + 52, z.y + 30, z.z.name, { size: 16, weight: 800, color: z.z.col, align: 'left' }); paraText(z.x + 52, z.y + 50, z.z.d, 120, 11, { color: '#475569', lh: 1.2 }); }
      else { D.text(z.x + z.w / 2, z.y + 38, z.z.ico, { size: 28 }); D.text(z.x + z.w / 2, z.y + 62, z.z.name, { size: 16, weight: 800, color: z.z.col }); paraText(z.x + z.w / 2, z.y + 82, z.z.d, z.w - 18, 11.5, { color: '#475569', align: 'center', lh: 1.2 }); }
      if (!used) { const s = z.slots[0]; ctx.save(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.restore(); D.text(s.x, s.y + 5, '사례 카드', { size: 13, weight: 700, color: '#cbd5e1' }); }
    });
    if (!PHONE) D.text(VW / 2, 288, '▼ 사례 카드를 끌어 그 사례가 지킨 원칙에 놓아요', { size: 13.5, weight: 800, color: '#64748b' }); else D.text(VW / 2, 470, '▼ 사례 카드를 끌어 그 사례가 지킨 원칙에 놓아요', { size: 13, weight: 800, color: '#64748b' });
    bdDraw(B, (c) => { const z = PRINC.find((q) => q.id === c.zone); ctx.fillStyle = z ? z.col : '#94a3b8'; ctx.fillRect(-c.w / 2, -c.h / 2, 5, c.h); paraText(-c.w / 2 + 12, -c.h / 2 + 20, c.t, c.w - 20, PHONE ? 12 : 12.5, { color: '#334155', lh: 1.32 }); },
      (c) => (c.bad ? '#e2464b' : B.ok && c.zone ? '#14a058' : c.zone ? '#3867f4' : '#cbd5e1'));
    if (!PHONE) { const I = { x: 14, y: 450, w: 772, h: 96 }; panel(I.x, I.y, I.w, I.h, '#fffbeb', '#fde68a'); paraText(I.x + 16, I.y + 26, '📜 왜 이런 원칙이 중요해졌을까요? 과거 인간을 대상으로 한 연구에서 참여자에게 충분히 알리지 않거나 치료를 막은 일이 문제가 되어 \'동의\'와 \'안전\' 원칙이 강조되었어요. 논문의 자료를 조작한 사건이 알려지면서 \'정직\'의 중요성도 커졌어요. (구체적인 인물·기관을 비난하려는 것이 아니에요.)', I.w - 32, 12.5, { color: '#92400e', lh: 1.4 }); }
  }

  /* ======================================================
     화면 5: 논증하기
     ====================================================== */
  function stepArgue(dt) {
    const B = S.board.arg; if (!B) return;
    const all = argAllOK();
    if (all && !S.ar.done) { S.ar.done = true; Sound.success(); B.cards.filter((c) => c.zone).forEach((c) => parts.burst(c.x, c.y, { count: 8, speed: 110, size: 3, life: 0.7 })); }
    if (!all) S.ar.done = false;
    S.ar.okA = approach(S.ar.okA, S.ar.done ? 1 : 0, dt, 6);
  }
  function drawArgue(t) {
    const B = S.board.arg, G = argGeom(), I = argIssue(), pos = argPos(), done = S.ar.done;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    const h = G.head; panel(h.x, h.y, h.w, h.h, done ? '#ecfdf3' : '#fff', done ? '#14a058' : null);
    D.text(h.x + 16, h.y + 24, I.ico + ' ' + I.name + ' · ' + pos.label + '  (가상 사례)', { size: 14, weight: 800, color: '#334155', align: 'left' });
    paraText(h.x + 16, h.y + 46, done ? '결론: 따라서 ' + pos.end : '카드를 끌어 틀을 채워요. 근거는 출처가 있는 사실만 써요.', h.w - 32, PHONE ? 12 : 12.5, { color: done ? '#0b6b39' : '#3867f4', lh: 1.35 });
    // 주장 상자
    const c = G.claim; panel(c.x, c.y, c.w, c.h, '#eef4ff');
    D.text(c.x + 14, c.y + (PHONE ? 22 : 26), '📣 주장', { size: 13.5, weight: 800, color: '#3867f4', align: 'left' });
    paraText(c.x + 14, c.y + (PHONE ? 42 : 52), pos.claim, c.w - 28, PHONE ? 13 : 13.5, { color: '#1e3a8a', lh: 1.4 });
    // 칸
    B.zones.forEach((z) => {
      const dragging = B.drag && B.drag.c && z.accept(B.drag.c), hit = dragging && B.dragP && B.dragP.x >= z.x && B.dragP.x <= z.x + z.w && B.dragP.y >= z.y && B.dragP.y <= z.y + z.h, used = B.cards.some((q) => q.zone === z.id);
      const col = z.id === 'val' ? '#8b5cf6' : z.id === 'reb' ? '#e2464b' : '#0ea5e9';
      panel(z.x, z.y, z.w, z.h, hit ? '#eef4ff' : '#fff', done ? '#14a058' : dragging ? col : null);
      ctx.fillStyle = col; ctx.globalAlpha = 0.13; rr(z.x, z.y, z.w, PHONE ? z.h : G.hd, 16).fill(); ctx.globalAlpha = 1;
      if (PHONE) D.text(z.x + 14, z.y + z.h / 2 + 5, z.label, { size: 14.5, weight: 800, color: col, align: 'left' }); else D.text(z.x + z.w / 2, z.y + 21, z.label, { size: 14, weight: 800, color: col });
      if (!used) { const s = z.slots[0]; ctx.save(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.restore(); D.text(s.x, s.y + 5, z.id === 'e0' || z.id === 'e1' ? '사실 카드' : z.id === 'val' ? '윤리 원칙' : '반론 대응', { size: 12.5, weight: 700, color: '#cbd5e1' }); }
    });
    bdDraw(B, (cd) => {
      if (cd.kind === 'ev') {
        ctx.fillStyle = '#0ea5e9'; ctx.fillRect(-cd.w / 2, -cd.h / 2, 5, cd.h);
        const compact = cd.w < 200;
        const hh = paraText(-cd.w / 2 + 12, -cd.h / 2 + 17, cd.data.t, cd.w - 20, compact ? 11 : (PHONE ? 11.5 : 12), { color: '#1b2333', lh: 1.22 });
        D.text(-cd.w / 2 + 12, cd.h / 2 - 7, fitText('출처: ' + (cd.data.src || '없음'), cd.w - 18, 10.5, 800), { size: 10.5, weight: 800, color: cd.data.src ? '#0369a1' : '#b91c1c', align: 'left' });
      } else if (cd.kind === 'val') {
        const v = VAL_INFO[cd.vid]; ctx.fillStyle = '#8b5cf6'; ctx.fillRect(-cd.w / 2, -cd.h / 2, 5, cd.h);
        D.text(-cd.w / 2 + 16, -cd.h / 2 + 24, v.ico, { size: 18, align: 'left' }); D.text(-cd.w / 2 + 40, -cd.h / 2 + 23, v.name, { size: PHONE ? 12.5 : 12.5, weight: 800, color: '#6d28d9', align: 'left' });
        if (cd.h > 50) paraText(-cd.w / 2 + 12, -cd.h / 2 + 40, v.d, cd.w - 18, 10.5, { color: '#475569', lh: 1.2 });
      } else { ctx.fillStyle = '#e2464b'; ctx.fillRect(-cd.w / 2, -cd.h / 2, 5, cd.h); paraText(-cd.w / 2 + 12, -cd.h / 2 + 17, cd.t, cd.w - 20, cd.w < 200 ? 10.5 : (PHONE ? 11 : 11.5), { color: '#1b2333', lh: 1.2 }); }
    }, (cd) => (cd.bad ? '#e2464b' : done && cd.zone ? '#14a058' : cd.zone ? '#3867f4' : '#cbd5e1'));
    // 체크리스트
    const k = G.chk; panel(k.x, k.y, k.w, k.h, done ? '#ecfdf3' : '#fff', done ? '#14a058' : null);
    D.text(k.x + 14, k.y + 22, done ? '✅ 논증이 완성됐어요!' : '✅ 논증 체크리스트 (자동 점검)', { size: 13.5, weight: 800, color: done ? '#0b6b39' : '#334155', align: 'left' });
    argChecks().forEach((q, i) => {
      const cx = PHONE ? k.x + 14 : k.x + 14 + (i % 2) * 384, cy = PHONE ? k.y + 42 + i * 16 : k.y + 46 + Math.floor(i / 2) * 24;
      D.text(cx, cy, (q.ok ? '✅ ' : '⬜ ') + (q.ok ? q.t : (q.note || q.t)), { size: PHONE ? 11.5 : 12.5, weight: 800, color: q.ok ? '#0b6b39' : q.note ? '#b45309' : '#64748b', align: 'left' });
    });
  }

  /* ======================================================
     입력
     ====================================================== */
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const boardKey = () => (S.mode === 'match' ? 'match' : S.mode === 'argue' ? 'arg' : null);
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'issues') {
        if (IS.open >= 0) { IS.open = -1; Sound.click(); return false; }
        const G = isGeom();
        for (let i = 0; i < ISSUES.length; i++) {
          if (inR(p, G.btn(i))) { IS.open = i; IS.read[i] = true; Sound.click(); return false; }
          for (let k = 0; k < 2; k++) if (IS.read[i] && inR(p, G.chip(i, k))) { IS.lab[i][k] = (IS.lab[i][k] + 1) % 3; IS.bad[i][k] = false; IS.pop[i][k] = 1; Sound.tick(); return false; }
        }
        return false;
      }
      if (S.mode === 'voices') {
        if (VC.open >= 0) { VC.open = -1; Sound.click(); return false; }
        const G = vcGeom();
        for (let i = 0; i < VOICES.length; i++) {
          if (inR(p, G.person(i))) { VC.open = i; VC.read[i] = true; Sound.click(); return false; }
          for (let c = 0; c < 3; c++) if (inR(p, G.cell(i, c))) { VC.v[i][c] = (VC.v[i][c] + 1) % (c === 0 ? 3 : c === 1 ? 4 : 2); VC.bad[i][c] = false; VC.pop[i][c] = 1; Sound.tick(); return false; }
        }
        return false;
      }
      if (S.mode === 'data') { const G = daGeom(); for (let i = 0; i < 3; i++) if (inR(p, G.pn(i))) { S.da.pick = i; if (i === 1) Sound.success(); else Sound.fail(); return false; } return false; }
      const key = boardKey();
      if (key) { const B = S.board[key], c = bdPick(B, p); if (!c) return false; bdStart(B, c, p); B.dragP = p; return true; }
      return false;
    },
    move(p) { const key = boardKey(); if (key) { const B = S.board[key]; if (B.drag) { bdMove(B, p); B.dragP = p; } } },
    up(p) { const key = boardKey(); if (key) { const B = S.board[key]; if (B.drag) { const c = B.drag.c; bdMove(B, p); bdDrop(B, c, p); B.dragP = null; } } },
    hover(p) {
      const key = boardKey(); if (key) return bdPick(S.board[key], p) ? 'grab' : 'default';
      if (S.mode === 'issues') { const G = isGeom(); for (let i = 0; i < ISSUES.length; i++) { if (inR(p, G.btn(i))) return 'pointer'; for (let k = 0; k < 2; k++) if (IS.read[i] && inR(p, G.chip(i, k))) return 'pointer'; } }
      if (S.mode === 'voices') { const G = vcGeom(); for (let i = 0; i < VOICES.length; i++) { if (inR(p, G.person(i))) return 'pointer'; for (let c = 0; c < 3; c++) if (inR(p, G.cell(i, c))) return 'pointer'; } }
      if (S.mode === 'data') { const G = daGeom(); for (let i = 0; i < 3; i++) if (inR(p, G.pn(i))) return 'pointer'; }
      return 'default';
    },
  });

  /* ======================================================
     컨트롤
     ====================================================== */
  const MODE_LABEL = { issues: '🗂️ 쟁점 카드 · 사실 판단과 가치 판단', voices: '💬 감염병 동선 공개 · 여러 입장', data: '🔬 조작이 의심되는 자료 찾기', match: '🤝 과학 윤리 원칙과 사례', argue: '🧩 논증 틀 만들기' };
  const modeSeg = $('#modeSeg');
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; hideHint(); IS.open = -1; VC.open = -1; updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.mode); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bIsReset').addEventListener('click', () => { Sound.click(); isReset(); });
  $('#bVcReset').addEventListener('click', () => { Sound.click(); vcReset(); });
  $('#bMtReset').addEventListener('click', () => { Sound.click(); bdReset(S.board.match); });
  $('#bArReset').addEventListener('click', () => { Sound.click(); bdReset(S.board.arg); S.ar.done = false; });
  function syncArgCtl() {
    $$('#isuSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.ar.issue));
    $$('#posSeg button').forEach((b) => { const k = +b.dataset.v; b.textContent = argIssue().pos[k].label; b.classList.toggle('on', k === S.ar.pos); });
  }
  segBind('#isuSeg', (v) => { S.ar.issue = +v; S.ar.pos = 0; argReset(); syncArgCtl(); });
  segBind('#posSeg', (v) => { S.ar.pos = +v; argReset(); syncArgCtl(); });

  /* ======================================================
     읽음 칸
     ====================================================== */
  function readouts() {
    const m = S.mode;
    if (m === 'issues') setRead(['읽은 쟁점', isRead() + ' / ' + ISSUES.length], ['표시한 질문', isLabeled() + ' / ' + ISSUES.length * 2], ['질문의 종류', '사실 · 가치']);
    else if (m === 'voices') setRead(['읽은 말풍선', vcRead() + ' / ' + VOICES.length], ['넓게 공개', VC.v.filter((r) => r[0] === 0).length + '명'], ['거의 비공개', VC.v.filter((r) => r[0] === 2).length + '명']);
    else if (m === 'data') setRead(['고른 자료', S.da.pick < 0 ? '없음' : ['①', '②', '③'][S.da.pick]], ['①의 평균', mean3(DATA_A).toFixed(1) + ' cm'], ['②의 평균', mean3(DATA_B).toFixed(1) + ' cm']);
    else if (m === 'match') { const B = S.board.match; setRead(['놓은 카드', bdPlaced(B) + ' / ' + B.cards.length], ['윤리 원칙', '5가지'], ['원칙 이름', '정직·동의·안전·책임·공정']); }
    else { const B = S.board.arg, ck = argChecks(); setRead(['놓은 카드', bdPlaced(B) + ' / 4'], ['체크리스트', ck.filter((q) => q.ok).length + ' / 4'], ['쟁점', argIssue().name]); }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) { isReset(); setMode('issues'); }
    else if (li === 1) { vcReset(); setMode('voices'); }
    else if (li === 2) { S.da.pick = -1; bdReset(S.board.match); setMode('data'); }
    else { S.ar.issue = 0; S.ar.pos = 0; argReset(); syncArgCtl(); setMode('argue'); }
  }
  const ensure = (m) => { if (S.mode !== m) setMode(m); };
  const FIG_OUTLIER = '<svg viewBox="0 0 420 170" width="100%" role="img" aria-label="실험 그래프. 왼쪽은 원래 측정 점 10개, 오른쪽은 예상과 다른 점 2개를 지운 발표용 그래프"><rect width="420" height="170" fill="#fff" rx="10"/>' +
    '<g transform="translate(14,18)"><text x="0" y="0" font-size="13" font-weight="800" fill="#475569">원래 측정</text><line x1="0" y1="124" x2="180" y2="124" stroke="#94a3b8" stroke-width="2"/><line x1="0" y1="10" x2="0" y2="124" stroke="#94a3b8" stroke-width="2"/>' +
    [[16, 104], [34, 96], [52, 88], [70, 78], [88, 70], [106, 62], [124, 52], [142, 44], [160, 34]].map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="#0ea5e9"/>').join('') +
    '<circle cx="70" cy="30" r="4.5" fill="#e2464b"/><circle cx="124" cy="96" r="4.5" fill="#e2464b"/><text x="76" y="26" font-size="11" font-weight="800" fill="#e2464b">예상과 다른 점</text></g>' +
    '<g transform="translate(230,18)"><text x="0" y="0" font-size="13" font-weight="800" fill="#475569">발표한 그래프</text><line x1="0" y1="124" x2="180" y2="124" stroke="#94a3b8" stroke-width="2"/><line x1="0" y1="10" x2="0" y2="124" stroke="#94a3b8" stroke-width="2"/>' +
    [[16, 104], [34, 96], [52, 88], [70, 78], [88, 70], [106, 62], [124, 52], [142, 44], [160, 34]].map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="#0ea5e9"/>').join('') +
    '<text x="90" y="112" font-size="11" font-weight="800" fill="#64748b" text-anchor="middle">(점 2개를 말없이 지움)</text></g></svg>';

  const levels = [
    {
      title: '쟁점 찾기: 사실 판단과 가치 판단', short: '쟁점 찾기', icon: '🗂️', phase: '관찰',
      features: ['issues'],
      intro: '<p class="si-q">❓ 탐구 질문: 과학이 발달할수록 \'할 수 있는 일\'은 늘어나는데, 그 일을 \'해도 되는지\'는 누가 어떻게 정할까?</p>' +
        '<div class="si-link">🔗 중학교에서 <b>과학 관련 직업과 미래</b>를 배우며 과학기술이 사회를 바꾼다는 것을 보았어요. 이 단원에서는 <b>감염병 동선 정보</b>, <b>빅데이터와 개인정보</b>, <b>인공지능의 편향과 책임</b> 같은 문제도 만났어요. 이번에는 이런 문제를 <b>사회적 쟁점(SSI)</b>으로 살펴봐요.</div>' +
        '<p><b>과학 관련 사회적 쟁점(SSI)</b>은 과학 지식과 사회의 가치가 얽혀 있어서 <b>과학만으로 답이 정해지지 않는</b> 문제예요. 쟁점 안의 질문은 🔬 <b>사실 판단</b>(자료와 실험으로 확인할 수 있어요)과 ⚖️ <b>가치 판단</b>(무엇이 옳고 바람직한지 사회가 정해요)으로 나눌 수 있어요. (모든 사례는 가상이에요.)</p>',
      setup() { enterLevel(0); showHint('쟁점 이름을 눌러 사례를 읽어요', 6000); },
      recap: '사회적 쟁점에는 자료로 확인할 수 있는 사실 판단과, 사회가 함께 정해야 하는 가치 판단이 함께 들어 있어요.',
      summary: '<ul><li><b>사회적 쟁점(SSI)</b>: 과학 지식과 사회적 가치가 얽혀 과학만으로 답이 정해지지 않는 문제 (예: 동선 공개, 유전자 변형 작물, 얼굴 인식 카메라, 유전체 정보, 자율주행차 책임, 동물 실험)</li><li>🔬 <b>사실 판단</b>: 자료와 실험으로 확인할 수 있는 질문 (예: 접촉자를 찾는 시간이 줄어들까?)</li><li>⚖️ <b>가치 판단</b>: 무엇이 옳고 바람직한지 사회가 정해야 하는 질문 (예: 사생활보다 안전을 우선해야 할까?)</li></ul>',
      missions: [
        {
          title: '쟁점 카드 읽고 질문 나누기',
          goal: '쟁점 카드 <b>6장</b>을 모두 읽고, 질문 <b>12개</b>를 🔬 <b>사실</b> 또는 ⚖️ <b>가치</b>로 표시한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '자료와 실험으로 답을 확인할 수 있으면 사실 판단이에요. 사람마다 생각이 달라 사회가 함께 정해야 하면 가치 판단이에요.',
          manual: true,
          setup() { ensure('issues'); },
          status: () => '읽은 쟁점 <b>' + isRead() + ' / 6</b> ' + mark(isRead() === 6) + ' · 표시한 질문 <b>' + isLabeled() + ' / 12</b> ' + mark(isLabeled() === 12),
          check() {
            if (isRead() < 6) return '쟁점 카드를 <b>모두 읽어야</b> 질문이 나타나요. (지금 ' + isRead() + ' / 6)';
            if (isLabeled() < 12) return '표시하지 않은 질문이 <b>' + (12 - isLabeled()) + '개</b> 있어요.';
            let wrong = 0; ISSUES.forEach((is, i) => is.q.forEach((q, k) => { if (!isRight(i, k)) { wrong++; if (!IS.bad[i][k]) IS.bad[i][k] = true; } }));
            return wrong ? '<b>' + wrong + '개</b>의 표시를 다시 생각해 보세요. (빨간 테두리) \'확인할 수 있는가, 사회가 정해야 하는가\'를 떠올려요.' : true;
          },
          explain: '같은 쟁점 안에도 <b>🔬 사실 판단</b>(예: 범죄 신고가 줄었을까?, 접촉자를 찾는 시간이 줄어들까?)과 <b>⚖️ 가치 판단</b>(예: 설치를 받아들여야 할까?, 책임을 누가 더 져야 할까?)이 함께 있어요. 사실은 과학이 답할 수 있지만, 가치 판단은 사회가 함께 이야기해서 정해야 해요.',
        },
        {
          type: 'quiz', title: '사실 판단 찾기',
          goal: '다음 중 <b>사실 판단</b>에 해당하는 질문은?',
          setup() { ensure('issues'); },
          choices: ['동물 실험을 허용해야 할까?', '이 약의 부작용이 실험에 참여한 사람 중 몇 %에게 나타났을까?', '편리함보다 개인정보를 더 소중히 여겨야 할까?', '자율주행차 사고의 책임을 누가 더 크게 져야 할까?'],
          answer: 1,
          feedback: ['허용할지는 사회의 가치 판단이에요.', '', '무엇을 더 소중히 여길지는 가치 판단이에요.', '책임을 누가 더 질지는 가치 판단이에요.'],
          explain: '부작용이 나타난 사람의 비율은 실험으로 <b>확인할 수 있어서 사실 판단</b>이에요. \'해야 할까?\', \'더 소중히 여길까?\'처럼 옳고 그름을 따지는 질문은 <b>가치 판단</b>이고, 과학만으로는 답이 정해지지 않아요.',
        },
      ],
    },
    {
      title: '여러 입장: 같은 문제, 다른 생각', short: '여러 입장', icon: '💬', phase: '탐구',
      features: ['voices'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 쟁점에는 사실 판단과 가치 판단이 함께 있다는 것을 알았어요. 이번에는 앞 차시의 <b>감염병 동선과 개인정보</b> 문제를 쟁점 하나로 골라, 이해관계자 5명의 입장을 살펴봐요.</div>' +
        '<p>가상의 도시에서 확진자의 이동 경로를 어디까지 공개할지 이야기하고 있어요. 사람 이름을 눌러 <b>말풍선</b>을 읽고, <b>주장 · 중요하게 여기는 가치 · 근거의 종류(사실/가치)</b>를 표에 정리해 봐요. 저울은 사람들의 주장이 어느 쪽에 모이는지 보여 줘요.</p>',
      setup() { enterLevel(1); showHint('사람 이름을 눌러 말풍선을 읽어요', 6000); },
      recap: '같은 자료를 보아도 사람마다 우선하는 가치가 달라서 주장이 달라질 수 있고, 정답이 하나가 아닐 수 있어요.',
      summary: '<ul><li><b>이해관계자</b>마다 중요하게 여기는 가치가 달라요. (이웃의 안전, 개인의 사생활, 가게의 생계, 정확한 정보와 신뢰)</li><li>주장은 <b>필요한 근거</b>를 가져야 하고, 근거에는 자료로 확인할 수 있는 <b>사실</b>과 옳고 바람직하다는 생각인 <b>가치</b>가 있어요.</li><li>모든 입장이 같은 가치를 우선하지는 않아서 하나의 정답을 정하기 어려운 쟁점이 많아요. 그래서 서로의 근거와 가치를 이해하며 <b>사회가 함께 합의</b>해야 해요.</li></ul>',
      missions: [
        {
          title: '5명의 입장 정리하기',
          goal: '말풍선 <b>5개</b>를 모두 읽고, 표의 <b>15칸</b>(주장 · 가치 · 근거의 종류)을 정리한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '말풍선 안의 "👉 이 사람이 내세운 근거"를 보세요. 자료로 확인할 수 있으면 사실, 무엇이 옳은지에 대한 생각이면 가치예요.',
          manual: true,
          setup() { ensure('voices'); },
          status: () => '읽은 말풍선 <b>' + vcRead() + ' / 5</b> ' + mark(vcRead() === 5),
          check() {
            if (vcRead() < 5) return '말풍선을 <b>모두 읽어 주세요</b>. (지금 ' + vcRead() + ' / 5)';
            let wrong = 0; VOICES.forEach((p, i) => [0, 1, 2].forEach((c) => { if (!vcRight(i, c)) { wrong++; if (!VC.bad[i][c]) VC.bad[i][c] = true; } }));
            return wrong ? '<b>' + wrong + '칸</b>이 달라요. (빨간 테두리) 말풍선을 다시 읽고 주장·가치·근거를 확인해 보세요.' : true;
          },
          explain: '<b>환자</b>(사생활)와 <b>전문가</b>(사생활)는 공개를 줄이자고 하고, <b>이웃</b>(안전)은 자세한 공개를 원해요. <b>방역 담당자</b>는 정확한 정보와 신뢰를 위해 필요한 만큼만, <b>상점 주인</b>은 생계 때문에 가게 이름 공개를 꺼려요. 이웃·방역 담당자·전문가의 근거는 확인할 수 있는 <b>사실</b>이고, 환자·상점 주인의 근거는 <b>가치</b>예요.',
        },
        {
          type: 'quiz', title: '입장이 달라지는 까닭',
          goal: '같은 감염병 자료를 보고도 사람들의 <b>주장이 서로 다른</b> 까닭으로 가장 알맞은 것은?',
          setup() { ensure('voices'); },
          choices: ['누군가는 틀린 자료를 보았기 때문이다', '사람마다 우선하는 가치(안전, 사생활, 생계 등)가 다르기 때문이다', '과학자는 항상 하나의 답만 알고 있기 때문이다', '목소리가 큰 사람이 항상 옳기 때문이다'],
          answer: 1,
          feedback: ['같은 사실을 알아도 입장이 다를 수 있어요.', '', '과학은 사실을 알려 주지만, 무엇을 우선할지는 가치 판단이에요.', '목소리의 크기가 옳고 그름을 정하지는 않아요.'],
          explain: '사실 판단이 같아도 <b>가치 판단</b>이 다르면 주장이 달라져요. 그래서 한 가지 정답이 없을 수 있고, 근거와 가치를 서로 이해하며 <b>합의</b>를 찾아가는 과정이 중요해요.',
        },
      ],
    },
    {
      title: '과학 윤리: 연구와 기술의 약속', short: '과학 윤리', icon: '🤝', phase: '설명',
      features: ['data', 'match'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 사람마다 우선하는 가치가 달라도, 근거가 되는 <b>사실</b>은 믿을 수 있어야 한다는 것을 알았어요. 사실이 믿을 만하려면 연구를 하는 사람과 기술을 쓰는 사람이 지켜야 할 약속, 곧 <b>과학 윤리</b>가 필요해요.</div>' +
        '<p>먼저 <b>조작이 의심되는 자료</b>를 찾아봐요. 그다음 <b>정직 · 동의 · 안전 · 책임 · 공정</b> 다섯 가지 윤리 원칙과 사례를 짝지어요. 연구 윤리는 과학의 신뢰와, 기술 이용의 윤리는 사회의 안전과 이어져요.</p>',
      setup() { enterLevel(2); showHint('세 자료 중 이상한 자료를 눌러 봐요', 6000); },
      recap: '과학자는 자료를 정직하게 다루고 참여자에게 동의를 받아야 하며, 기술을 쓰는 사람은 안전과 책임, 공정을 지켜야 해요.',
      summary: '<ul><li><b>연구 윤리</b>: 정직(자료를 조작·위조·표절하지 않기), 연구 대상자 보호(충분한 설명과 동의, 안전), 동물 복지, 공정한 평가</li><li><b>과학기술 이용 윤리</b>: 책임(결과를 예측하고 책임지기), 안전, 개인정보 보호, 공정성(차별 금지), 지속가능성</li><li>같은 방법으로 반복한 측정값은 조금씩 달라요. 모두 똑같거나 예상과 다른 값만 지운 자료는 조작이 의심돼요. 연구 윤리가 지켜져야 과학에 대한 <b>신뢰</b>가 생겨요.</li></ul>',
      missions: [
        {
          title: '조작이 의심되는 자료 찾기',
          goal: '세 자료 중 <b>조작이 의심되는 자료</b>를 찾아 눌러 보세요.',
          hint: '같은 방법으로 세 번 반복해서 재면 값이 정확히 똑같을까요? 측정 오차를 떠올려요.',
          setup() { ensure('data'); S.da.pick = -1; },
          check: () => S.da.pick === 1, hold: 0.3,
          status: () => (S.da.pick < 0 ? '자료를 눌러 골라요 ⬜' : S.da.pick === 1 ? '② 자료를 골랐어요 ✅' : ['①', '', '③'][S.da.pick] + ' 자료는 값이 자연스럽게 달라요. 다른 자료도 살펴봐요 ⬜'),
          explain: '② 표는 세 번 잰 값이 모두 <b>' + DATA_B[0].toFixed(1) + ' cm</b>로 똑같아요. 같은 방법으로 반복해서 재도 측정값은 <b>조금씩 달라지는 것</b>이 보통이에요. ①의 값(' + DATA_A.map((v) => v.toFixed(1)).join(', ') + ')처럼요. 값을 맞췄거나 지어낸 것은 아닌지 <b>원자료</b>를 확인해야 해요.',
        },
        {
          title: '윤리 원칙과 사례 짝짓기',
          goal: '사례 카드 <b>5장</b>을 그 사례가 지킨 <b>윤리 원칙</b>에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '허락을 받았다면 동의, 값을 그대로 적었다면 정직, 위험에 대비했다면 안전, 결과를 예측하고 책임진다면 책임, 차별하지 않았다면 공정이에요.',
          manual: true,
          setup() { ensure('match'); },
          status: () => '놓은 카드 <b>' + bdPlaced(S.board.match) + ' / 5</b>',
          check: () => bdJudge(S.board.match, (c) => c.zone === c.ans),
          explain: '<b>동의</b>: 충분히 설명하고 허락을 받아요. <b>정직</b>: 자료를 있는 그대로 적고 출처를 밝혀요. <b>안전</b>: 사람과 환경을 위험하지 않게 해요. <b>책임</b>: 결과를 예측하고 책임을 져요. <b>공정</b>: 누구도 차별하지 않아요.',
        },
        {
          type: 'quiz', title: '연구 윤리와 과학의 신뢰',
          goal: '아래 그림처럼 <b>예상과 다른 점 2개를 말없이 지우고</b> 발표한 연구에 대한 평가로 알맞은 것은?',
          figure: FIG_OUTLIER,
          setup() { ensure('data'); },
          choices: ['발표가 더 깔끔해지므로 좋은 방법이다', '남아 있는 점이 많으면 문제가 없다', '결과의 큰 흐름이 같으니 문제가 없다', '정직의 원칙에 어긋나고, 과학에 대한 신뢰를 떨어뜨릴 수 있다'],
          answer: 3,
          feedback: ['깔끔해 보이려고 자료를 지우면 안 돼요.', '몇 개를 지웠든 말없이 지운 것이 문제예요.', '흐름이 같아도 측정값을 임의로 지우는 것은 조작이에요.', ''],
          explain: '예상과 다른 값도 <b>있는 그대로 기록하고 알려야</b> 해요. 마음에 들지 않는 자료를 지우는 것은 <b>정직의 원칙</b>에 어긋나요. 이런 일이 알려지면 그 연구뿐 아니라 과학 전체에 대한 <b>신뢰</b>가 흔들려요.',
        },
        {
          type: 'quiz', title: '기술을 쓰는 사람의 책임',
          goal: '새로운 과학기술을 만들어 사회에 내놓는 회사가 지켜야 할 <b>책임</b>으로 알맞은 것은?',
          setup() { ensure('match'); },
          choices: ['기술이 일으킬 수 있는 문제를 미리 예측하고 안전 대책을 마련하며, 문제가 생기면 책임을 진다', '이익이 생기면 회사 것이고 문제가 생기면 사용자 책임이라고 알린다', '법에 없는 일이면 어떤 위험이 있어도 신경 쓰지 않는다', '사고가 나도 자료는 공개하지 않는다'],
          answer: 0,
          feedback: ['', '문제를 일으킬 수 있는 기술은 만든 쪽이 책임을 함께 져야 해요.', '법이 없더라도 위험을 예측하고 줄이려는 노력이 필요해요.', '사고의 원인을 밝히려면 자료를 공개하고 점검해야 해요.'],
          explain: '과학기술은 편리함과 함께 위험도 가져와요. 그래서 <b>결과를 예측하고(책임), 안전을 확인하고, 개인정보를 보호하며, 차별하지 않는(공정)</b> 노력이 필요해요. 앞 차시의 인공지능 로봇과 센서 기술도 마찬가지예요.',
        },
      ],
    },
    {
      title: '논증하기: 근거로 입장 세우기', short: '논증하기', icon: '🧩', phase: '적용',
      features: ['argue'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 연구에는 정직과 동의 같은 윤리가 필요하다는 것을 알았고, 쟁점에서는 사실과 가치를 구분했어요. 이제 쟁점 하나를 정해 <b>근거 있는 논증</b>을 만들어 봐요.</div>' +
        '<p>논증 틀은 <b>주장 – 근거(사실) 2개 – 가치 기준(윤리 원칙) – 반론 대응 – 결론</b>으로 이루어져요. 쟁점과 입장을 고르고 카드를 끌어 틀을 채우세요. 어느 입장이든 괜찮아요. 근거가 <b>출처가 있는 사실</b>인지, 반론을 다루었는지, 가치 기준을 밝혔는지가 중요해요. (모든 사례와 자료는 가상이에요.)</p>',
      setup() { enterLevel(3); showHint('쟁점·입장을 고르고 카드를 끌어 틀을 채워요', 6000); },
      recap: '좋은 논증은 출처가 있는 사실을 근거로 들고, 어떤 가치를 우선하는지 밝히며, 반대 의견에도 답해요. 결론은 근거와 가치로 스스로 세워요.',
      summary: '<ul><li><b>논증의 틀</b>: 주장 → 근거(자료로 확인할 수 있는 사실, 출처 확인) → 가치 기준(어떤 윤리 원칙을 우선하는가) → 반론 대응 → 결론</li><li><b>자료 점검</b>: 출처가 분명한가, 사실인가 의견인가, 표본과 측정 방법이 믿을 만한가를 확인해요.</li><li>쟁점에는 정해진 정답이 없을 수 있어요. 서로 다른 입장의 근거와 가치를 이해하고 사회가 <b>합의</b>를 이루어 가는 것이 중요해요.</li><li>과학기술 시민으로서 근거를 따져 보고, 내 의견을 밝히고, 다른 의견도 들으며, 안전과 개인정보를 지키는 선택을 해요.</li></ul>',
      missions: [
        {
          title: '논증 틀 완성하기',
          goal: '쟁점과 입장을 고르고, 카드를 끌어 <b>근거 2개 · 가치 기준 · 반론 대응</b>을 채워 체크리스트를 모두 ✅로 만든 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '근거는 <b>출처가 있는 사실</b>이면서 내 입장을 지지해야 해요. 반론 대응은 반대 입장의 걱정에 답하는 카드예요. 어느 가치 기준을 골라도 돼요.',
          manual: true,
          setup() { ensure('argue'); },
          status: () => '체크리스트 <b>' + argChecks().filter((q) => q.ok).length + ' / 4</b> ' + mark(argAllOK()),
          check() {
            const ck = argChecks(), bad = ck.find((q) => !q.ok);
            if (bad) return '아직 ✅가 아닌 항목이 있어요: <b>' + (bad.note || bad.t) + '</b>';
            return true;
          },
          explain: '좋은 논증은 <b>① 내 입장을 지지하는 사실</b>(출처가 있는 자료) <b>② 어떤 윤리 원칙을 우선하는지(가치 기준)</b> <b>③ 반대 의견에 대한 답(반론 대응)</b>을 갖춰요. 어느 입장을 골라도 이 틀을 갖추면 근거 있는 논증이에요. 정답이 하나로 정해진 것이 아니라서, 다른 입장의 논증도 만들어 비교해 보면 좋아요.',
        },
        {
          type: 'quiz', title: '자료 점검: 근거로 쓸 만한 자료',
          goal: '논증의 근거로 쓸 자료를 고를 때 가장 알맞은 기준은?',
          setup() { ensure('argue'); },
          choices: ['많은 사람이 공유한 글이면 사실이다', '내 입장과 같은 내용이면 출처를 확인하지 않아도 된다', '출처가 분명하고 확인할 수 있는 사실인지, 조사 방법이 믿을 만한지 살펴본다', '글쓴이가 확신에 차 있으면 믿어도 된다'],
          answer: 2,
          feedback: ['많이 퍼졌다고 해서 사실인 것은 아니에요.', '내 입장과 같아도 출처가 불분명하면 근거가 될 수 없어요.', '', '확신이 있다고 해서 사실인 것은 아니에요.'],
          explain: '근거는 <b>출처가 분명하고 확인할 수 있는 사실</b>이어야 해요. 의견이나 소문을 사실처럼 쓰면 논증의 힘이 약해져요. 이것이 <b>디지털 소양</b>이기도 해요.',
        },
        {
          type: 'quiz', title: '과학기술 시민으로서 내가 할 일',
          goal: '과학 관련 사회적 쟁점 앞에서 <b>과학기술 시민</b>으로서 가장 알맞은 태도는?',
          setup() { ensure('argue'); },
          choices: ['전문가가 정할 일이니 나는 관심을 두지 않는다', '근거와 출처를 확인해 내 의견을 만들고, 다른 입장의 근거와 가치도 들으며 합의를 찾는다', '내 생각과 다른 의견은 듣지 않고 내 의견만 주장한다', '쟁점마다 무조건 다수결로 정하면 된다'],
          answer: 1,
          feedback: ['쟁점은 사회가 함께 정하는 일이라서 시민의 참여가 필요해요.', '', '다른 입장을 이해해야 합의를 찾을 수 있어요.', '다수결도 방법일 수 있지만, 근거와 가치를 충분히 논의하는 과정이 먼저 필요해요.'],
          explain: '과학기술 시민은 <b>근거를 확인하고</b>, 내 의견을 밝히며, <b>다른 입장도 듣고</b>, 안전·개인정보·공정 같은 가치를 함께 고려해 합의에 참여해요. 과학이 \'할 수 있는 일\'을 늘려 줄수록 \'해도 되는지\'를 함께 정하는 시민의 역할이 커져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-ssi-ethics', mount: '#game', badge: '과학기술 시민', homeHref: '../../index.html#h1b',
    featureLabels: { issues: '🗂️ 쟁점 카드 6장', voices: '💬 말풍선 · 입장의 저울', data: '🔬 자료 점검', match: '🤝 윤리 원칙 짝짓기', argue: '🧩 논증 틀과 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  argReset(); syncArgCtl(); updateCtl();
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    bdStep(S.board.match, dt); bdStep(S.board.arg, dt);
    stepIssues(dt); stepVoices(dt); stepArgue(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    const m = S.mode;
    if (m === 'issues') drawIssues(t); else if (m === 'voices') drawVoices(t); else if (m === 'data') drawData(t); else if (m === 'match') drawMatch(t); else drawArgue(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, ISSUES, VOICES, ARGS, get game() { return game; }, setMode, enterLevel, isGeom, vcGeom, daGeom, argGeom, argReset, argChecks, argAllOK, syncArgCtl,
    solveIssues(right) { ISSUES.forEach((is, i) => { IS.read[i] = true; is.q.forEach((q, k) => { IS.lab[i][k] = right === false && i === 0 && k === 0 ? 3 - q.type : q.type; }); }); },
    solveVoices(right) { VOICES.forEach((p, i) => { VC.read[i] = true; VC.v[i] = [p.claim, p.value, p.etype]; }); if (right === false) VC.v[0][0] = (VC.v[0][0] + 1) % 3; },
    fillMatch(right) { bdFill(S.board.match, (c) => (right === false ? PRINC[(PRINC.findIndex((z) => z.id === c.ans) + 1) % 5].id : c.ans)); },
    solveArg(right) {
      const B = S.board.arg, pos = S.ar.pos, I = argIssue(); bdReset(B);
      const evs = B.cards.filter((c) => c.kind === 'ev' && c.data.fact && c.data.src && (right === false ? c.data.pos !== pos : c.data.pos === pos));
      const rumor = B.cards.find((c) => c.kind === 'ev' && !c.data.src);
      const slots = ['e0', 'e1']; const take = right === false ? [rumor, evs[0]] : [evs[0], evs[1]];
      take.forEach((c, i) => { c.zone = slots[i]; c.slot = 0; c.seq = ++B.seq; });
      const v = B.cards.find((c) => c.kind === 'val'); v.zone = 'val'; v.slot = 0; const r = B.cards.find((c) => c.kind === 'reb' && (right === false ? c.forPos !== pos : c.forPos === pos)); r.zone = 'reb'; r.slot = 0;
      bdLayout(B); bdSnap(B);
    },
  };

})();
