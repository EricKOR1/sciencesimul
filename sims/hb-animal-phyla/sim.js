/* =========================================================
   고등학교 생명과학 Ⅲ. 생명의 연속성과 다양성 - 동물의 분류군 (단원 39, 8차시)
   성취기준 [12생과03-05] 동물과 식물 분류군의 특징을 문 수준에서 이해하고, 생물의 유연관계를 계통수로 나타낼 수 있다. (동물 부분)
   ① 관찰: 동물의 몸 (대칭, 체강 단면, 소화관)  ② 분석: 9개 문 비교  ③ 탐구: 이분 검색표  ④ 적용: 헷갈리는 사례 분류
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const BGCOL = '#eaf3f9';
  /* ---------- 공통 도구 (kit) ---------- */
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const ease = SciSim.ease;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* 한글 조사: 받침 있으면 첫째, 없으면 둘째 */
  function josa(word, pair) {
    const w = String(word), c = w.charCodeAt(w.length - 1);
    let batchim;
    if (c >= 0xAC00 && c <= 0xD7A3) batchim = (c - 0xAC00) % 28 !== 0;
    else batchim = '013678'.indexOf(w[w.length - 1]) >= 0;
    const ab = pair.split('/');
    if (pair === '으로/로') { const rieul = c >= 0xAC00 && (c - 0xAC00) % 28 === 8; return batchim && !rieul ? '으로' : '로'; }
    return batchim ? ab[0] : ab[1];
  }
  const withJosa = (w, p) => w + josa(w, p);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BGCOL });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
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
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill, o) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); if (o && o.stroke) { D.roundRect(x, y, w, h, r || 14); ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); } }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const inRect = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  /* 글자 크기를 줄여 상자 폭에 맞춰요 (최소 13) */
  function fitText(str, maxW, size, weight, minSize) {
    ctx.save();
    let s = size;
    ctx.font = D.font(s, weight || 800);
    while (ctx.measureText(str).width > maxW && s > (minSize || 13)) { s -= 0.5; ctx.font = D.font(s, weight || 800); }
    ctx.restore(); return s;
  }
  /* 칩 (둥근 알약) 그리기: 폭은 글자에 맞춤 */
  function chip(x, y, str, o) {
    o = o || {};
    const size = o.size || 13;
    ctx.save(); ctx.font = D.font(size, o.weight || 800);
    const w = Math.max(o.minW || 0, ctx.measureText(str).width + (o.pad != null ? o.pad : 10) * 2), h = o.h || size + 10;
    ctx.restore();
    const lx = o.align === 'center' ? x - w / 2 : x;
    D.roundRect(lx, y - h / 2, w, h, h / 2); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = o.lw || 1.5; ctx.stroke(); }
    T(lx + w / 2, y + size * 0.36, str, size, o.color || '#1b2333', 'center', o.weight || 800);
    return { x: lx, y: y - h / 2, w, h };
  }
  /* 카드(전체 라운드 사각형) + 가운데 글자 */
  function box(r, str, o) {
    o = o || {};
    D.roundRect(r.x, r.y, r.w, r.h, o.r != null ? o.r : 10);
    ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
    if (str != null && str !== '') {
      const sz = fitText(str, r.w - 8, o.size || 14, o.weight || 800, o.minSize || 12.5);
      T(r.x + r.w / 2, r.y + r.h / 2 + sz * 0.36, str, sz, o.color || '#1b2333', 'center', o.weight || 800);
    }
  }
  /* 곡선 점 */
  function cPts(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    return out;
  }
  function polyline(pts, close) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); }
  function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }

  /* ---------- 드래그 토큰 ---------- */
  /* items: {id, x, y, w, h, hx, hy, lift, ...}  cfg: {drawItem(item, t), canGrab(item), drop(item, p) -> {x,y,slot}|null, tap(item, p), moved(item)} */
  function Tokens(cfg) {
    const T_ = { items: [], drag: null, cfg };
    T_.add = (it) => { it.lift = 0; it.x = it.hx; it.y = it.hy; it.sx = 0; it.sy = 0; T_.items.push(it); return it; };
    T_.hit = (p) => { for (let i = T_.items.length - 1; i >= 0; i--) { const it = T_.items[i]; if ((!cfg.canGrab || cfg.canGrab(it)) && inRect(p, { x: it.x - it.w / 2, y: it.y - it.h / 2, w: it.w, h: it.h }, 4)) return it; } return null; };
    T_.down = (p) => {
      const it = T_.hit(p); if (!it) return false;
      T_.items.splice(T_.items.indexOf(it), 1); T_.items.push(it);
      T_.drag = { it, ox: it.x - p.x, oy: it.y - p.y, x0: p.x, y0: p.y, moved: false };
      SciSim.tween(it, { lift: 1 }, { duration: 0.12, ease: 'outCubic' });
      return true;
    };
    T_.move = (p) => {
      const d = T_.drag; if (!d) return;
      if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) > 6) d.moved = true;
      if (d.moved) { d.it.x = p.x + d.ox; d.it.y = p.y + d.oy; }
    };
    T_.up = (p) => {
      const d = T_.drag; if (!d) return; T_.drag = null;
      const it = d.it;
      SciSim.tween(it, { lift: 0 }, { duration: 0.18, ease: 'outCubic' });
      if (!d.moved) { it.x = it.hx; it.y = it.hy; if (it.at) { it.x = it.at.x; it.y = it.at.y; } cfg.tap && cfg.tap(it, p); return; }
      const r = cfg.drop ? cfg.drop(it, p) : null;
      if (r) { it.at = { x: r.x, y: r.y }; SciSim.tween(it, { x: r.x, y: r.y }, { duration: 0.28, ease: 'outBack' }); }
      else { it.at = null; SciSim.tween(it, { x: it.hx, y: it.hy }, { duration: 0.3, ease: 'outCubic' }); }
    };
    return T_;
  }
  /* =========================================================
     자료: 동물 9개 문, 동물 카드 13장, 사례 카드 8장
     ========================================================= */
  const SYM_N = ['비대칭', '방사 대칭', '좌우 대칭'];
  const COEL_N = ['체강 없음', '가체강', '진체강'];
  const AP = [
    { n: '해면동물문', s: '해면', sym: 0, coel: 0, seg: 0, exo: 0, noto: 0, rep: '해면', col: '#c28b3c',
      clue: '몸에 구멍이 많고 한곳에 붙어 살아요. 조직과 기관이 따로 나뉘어 있지 않아요.' },
    { n: '자포동물문', s: '자포', sym: 1, coel: 0, seg: 0, exo: 0, noto: 0, rep: '해파리, 말미잘, 산호', col: '#e0568a',
      clue: '입 둘레의 촉수에 자포 세포가 있고, 입과 항문의 구분이 없어요. 몸의 중심에서 사방으로 퍼진 모양이에요.' },
    { n: '편형동물문', s: '편형', sym: 2, coel: 0, seg: 0, exo: 0, noto: 0, rep: '플라나리아, 촌충', col: '#8e6bd1',
      clue: '몸이 납작하고 앞뒤와 좌우가 구분돼요. 몸속에 따로 빈 공간이 없고 조직으로 가득 차 있어요.' },
    { n: '선형동물문', s: '선형', sym: 2, coel: 1, seg: 0, exo: 0, noto: 0, rep: '회충', col: '#d98324',
      clue: '몸이 가늘고 둥근 원통형이에요. 입과 항문이 모두 있고, 체강은 중배엽으로 완전히 둘러싸이지 않은 가짜 체강이에요.' },
    { n: '연체동물문', s: '연체', sym: 2, coel: 2, seg: 0, exo: 0, noto: 0, rep: '달팽이, 오징어, 조개', col: '#2a9d8f',
      clue: '부드러운 몸을 외투막이 감싸고 있고 대부분 껍데기가 있어요. 몸은 마디로 나뉘지 않아요.' },
    { n: '환형동물문', s: '환형', sym: 2, coel: 2, seg: 1, exo: 0, noto: 0, rep: '지렁이, 거머리', col: '#d1495b',
      clue: '고리 모양의 마디(체절)가 몸 전체에 반복돼요. 체강은 중배엽으로 둘러싸여 있어요.' },
    { n: '절지동물문', s: '절지', sym: 2, coel: 2, seg: 1, exo: 1, noto: 0, rep: '곤충, 거미, 가재', col: '#3a6ea5',
      clue: '키틴질 외골격과 마디가 있는 다리를 가졌고 몸에 체절이 있어요. 체강은 혈체강으로 변형된 진체강이에요.' },
    { n: '극피동물문', s: '극피', sym: 1, coel: 2, seg: 0, exo: 0, noto: 0, rep: '불가사리, 성게', col: '#f08a24',
      clue: '피부에 가시가 있고 수관계로 움직여요. 성체는 몸의 중심에서 사방으로 퍼진 모양이에요(유생은 좌우 대칭).' },
    { n: '척삭동물문', s: '척삭', sym: 2, coel: 2, seg: 0, exo: 0, noto: 1, rep: '어류, 양서류, 파충류, 조류, 포유류', col: '#4b7f3a',
      clue: '발생 중 등 쪽에 척삭이라는 지지 구조가 생겨요. 대부분 척추동물이고, 몸의 겉마디와 키틴 외골격은 없어요.' },
  ];
  const NA = AP.length;
  // 동물 카드 13장: [이름, 문]
  const AN = [['해면', 0], ['말미잘', 1], ['플라나리아', 2], ['촌충', 2], ['회충', 3], ['달팽이', 4], ['오징어', 4], ['지렁이', 5], ['가재', 6], ['메뚜기', 6], ['불가사리', 7], ['개구리', 8], ['사람', 8]].map((a) => ({ n: a[0], ph: a[1] }));
  const NAN = AN.length;
  // 검색표 질문(이분): 문마다 참/거짓
  const QA = {
    bil: { q: '좌우 대칭인가요?', s: '좌우 대칭?', f: (p) => p.sym === 2 },
    rad: { q: '방사 대칭인가요?', s: '방사 대칭?', f: (p) => p.sym === 1 },
    coel: { q: '체강이 있나요?', s: '체강?', f: (p) => p.coel >= 1 },
    tru: { q: '진체강인가요?', s: '진체강?', f: (p) => p.coel === 2 },
    seg: { q: '체절이 있나요?', s: '체절?', f: (p) => !!p.seg },
    exo: { q: '키틴질 외골격이 있나요?', s: '외골격?', f: (p) => !!p.exo },
    noto: { q: '척삭이 있나요?', s: '척삭?', f: (p) => !!p.noto },
  };
  const NAT = ['bil', 'rad', 'coel', 'tru', 'seg', 'exo', 'noto'];
  const attrFact = (k, v, ph) => { const p = AP[ph]; switch (k) { case 'bil': return v ? '좌우 대칭이에요' : (p.sym === 1 ? '방사 대칭이라 좌우 대칭이 아니에요' : '좌우 대칭이 아니에요'); case 'rad': return v ? '방사 대칭이에요' : '방사 대칭이 아니에요'; case 'coel': return v ? '체강이 있어요' : '체강이 없어요'; case 'tru': return v ? '진체강이에요' : (p.coel === 1 ? '가체강이라 진체강이 아니에요' : '진체강이 아니에요'); case 'seg': return v ? '체절이 있어요' : '체절이 없어요'; case 'exo': return v ? '키틴질 외골격이 있어요' : '키틴질 외골격이 없어요'; default: return v ? '척삭이 있어요' : '척삭이 없어요'; } };
  /* 우선순위 목록으로 이분 검색표(결정 트리) 만들기: 노드 {k, y, n, depth} / 잎 {leaf: [문 번호], depth} */
  function buildTree(order) {
    function rec(set, depth) {
      for (const k of order) {
        const y = set.filter((i) => QA[k].f(AP[i])), n = set.filter((i) => !QA[k].f(AP[i]));
        if (y.length && n.length) return { k, depth, no: rec(n, depth + 1), yes: rec(y, depth + 1) };
      }
      return { leaf: set, depth };
    }
    return rec(AP.map((p, i) => i), 0);
  }
  function treeInfo(tree) {            // 잎 배열, 노드 배열, 동물별 질문 수
    const leaves = [], nodes = [];
    (function walk(t, parent, side) { t.parent = parent; t.side = side; if (t.leaf) { leaves.push(t); return; } nodes.push(t); walk(t.no, t, '아니오'); walk(t.yes, t, '예'); })(tree, null, '');
    const depthOf = {}; leaves.forEach((lf) => lf.leaf.forEach((p) => { depthOf[p] = lf.depth; }));
    const per = AN.map((a) => depthOf[a.ph]);
    return { leaves, nodes, maxQ: Math.max.apply(null, per), avgQ: per.reduce((x, y) => x + y, 0) / per.length };
  }
  const rootOf = (t) => { while (t.parent) t = t.parent; return t; };
  function layoutTree(root, info, x0, x1, y0, step, leafY) {
    const nL = info.leaves.length; info.leaves.forEach((lf, i) => { lf.x = x0 + (i + 0.5) * (x1 - x0) / nL; lf.y = leafY; });
    (function pos(t) { if (t.leaf) return t.x; const a = pos(t.no), b = pos(t.yes); t.x = (a + b) / 2; t.y = y0 + t.depth * step; return t.x; })(root);
  }

  /* ---------- 동물 그림 ---------- */
  const AN_EMO = { 달팽이: '🐌', 오징어: '🦑', 가재: '🦞', 메뚜기: '🦗', 개구리: '🐸', 사람: '🧑', 상어: '🦈', 고래: '🐋', 거미: '🕷️' };
  function animalIcon(name, x, y, s, t) {
    t = t || 0;
    if (AN_EMO[name]) { E(AN_EMO[name], x, y, s * 1.05); return; }
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 50, s / 50); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (name === '해면') {
      ctx.fillStyle = '#d9a857'; ctx.beginPath(); ctx.moveTo(-18, 22); ctx.quadraticCurveTo(-26, -4, -14, -20); ctx.lineTo(14, -20); ctx.quadraticCurveTo(26, -4, 18, 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b57f2c'; for (const [a, b] of [[-8, -4], [6, 4], [-4, 12], [9, -12], [-10, 6]]) { ctx.beginPath(); ctx.ellipse(a, b, 3.4, 4.4, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#8a5a1a'; ell(0, -20, 14, 4); ctx.fill();
    } else if (name === '말미잘') {
      ctx.fillStyle = '#e0568a'; ctx.beginPath(); ctx.moveTo(-9, 22); ctx.lineTo(-12, -4); ctx.lineTo(12, -4); ctx.lineTo(9, 22); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f08ab0'; ctx.lineWidth = 3.2; for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * 2.6, -4); ctx.quadraticCurveTo(k * 7, -18, k * 8 + Math.sin(t * 2 + k) * 2, -26); ctx.stroke(); }
      ctx.fillStyle = '#7a1f46'; ell(0, -4, 8, 3); ctx.fill();
    } else if (name === '해파리') {
      const pu = RM ? 0 : Math.sin(t * 3) * 2;
      ctx.fillStyle = 'rgba(214,150,230,.85)'; ctx.beginPath(); ctx.moveTo(-24, 0 + pu * 0.4); ctx.quadraticCurveTo(-24, -26 - pu, 0, -26 - pu); ctx.quadraticCurveTo(24, -26 - pu, 24, 0 + pu * 0.4); ctx.quadraticCurveTo(0, 6, -24, 0 + pu * 0.4); ctx.fill();
      ctx.strokeStyle = 'rgba(190,120,215,.9)'; ctx.lineWidth = 2.2; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 6, 3); ctx.quadraticCurveTo(k * 6 + Math.sin(t * 3 + k) * 4, 14, k * 6 - Math.sin(t * 3 + k) * 3, 26); ctx.stroke(); }
    } else if (name === '산호') {
      ctx.strokeStyle = '#e8584a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(0, 0); ctx.moveTo(0, 14); ctx.lineTo(-14, 0); ctx.lineTo(-18, -14); ctx.moveTo(0, 6); ctx.lineTo(13, -6); ctx.lineTo(16, -20); ctx.moveTo(0, 0); ctx.lineTo(2, -22); ctx.stroke();
      ctx.fillStyle = '#ffb3a8'; for (const [a, b] of [[-18, -16], [16, -22], [2, -24], [-14, 0], [13, -6]]) { ctx.beginPath(); ctx.arc(a, b, 3.4, 0, TAU); ctx.fill(); }
    } else if (name === '플라나리아') {
      ctx.fillStyle = '#b79a6e'; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-8, -10, 14, -8); ctx.lineTo(30, 0); ctx.lineTo(14, 8); ctx.quadraticCurveTo(-8, 10, -26, 0); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-18, -3, 3.2, 0, TAU); ctx.arc(-18, 3, 3.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-17, -3, 1.4, 0, TAU); ctx.arc(-17, 3, 1.4, 0, TAU); ctx.fill();
    } else if (name === '촌충') {
      for (let k = 0; k < 9; k++) { ctx.fillStyle = k % 2 ? '#f1e6cc' : '#e6d8b4'; D.roundRect(-28 + k * 6.4, -6 + Math.sin(k * 0.8 + t * 2) * 1.5, 6.4, 12, 2); ctx.fill(); }
      ctx.fillStyle = '#c9a96a'; ctx.beginPath(); ctx.arc(-30, 0, 4.2, 0, TAU); ctx.fill();
    } else if (name === '회충') {
      ctx.strokeStyle = '#e8cfa0'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-28, 4); ctx.bezierCurveTo(-14, -16, 0, 22, 14, 0); ctx.bezierCurveTo(22, -10, 26, 4, 30, -4); ctx.stroke();
      ctx.strokeStyle = '#c9a56a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-28, 4); ctx.bezierCurveTo(-14, -16, 0, 22, 14, 0); ctx.bezierCurveTo(22, -10, 26, 4, 30, -4); ctx.stroke();
    } else if (name === '지렁이') {
      ctx.strokeStyle = '#d98b8b'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-28, 6); ctx.bezierCurveTo(-14, -14, 4, 18, 18, -2); ctx.bezierCurveTo(24, -10, 28, 0, 30, -6); ctx.stroke();
      ctx.strokeStyle = '#a65a5a'; ctx.lineWidth = 1.4; for (let k = 0; k < 11; k++) { const u = k / 10, bx = -28 + 58 * u, by = 6 - 12 * Math.sin(u * 5.2) * (1 - u * 0.4); ctx.beginPath(); ctx.moveTo(bx - 1, by - 5); ctx.lineTo(bx + 1, by + 5); ctx.stroke(); }
      ctx.fillStyle = '#c47070'; ctx.beginPath(); ctx.ellipse(-8, -1, 5, 6, 0.4, 0, TAU); ctx.fill();
    } else if (name === '불가사리') {
      ctx.fillStyle = '#f08a24'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 11 : 28; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd08a'; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5; for (const r of [10, 18, 24]) { ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.8, 0, TAU); ctx.fill(); } }
    } else if (name === '지네') {
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.8;
      for (let k = 0; k < 9; k++) { const bx = -26 + k * 6.6, by = Math.sin(k * 0.7 + t * 3) * 3; ctx.beginPath(); ctx.moveTo(bx, by - 11); ctx.lineTo(bx, by + 11); ctx.stroke(); }
      for (let k = 0; k < 9; k++) { const bx = -26 + k * 6.6, by = Math.sin(k * 0.7 + t * 3) * 3; ctx.fillStyle = k === 0 ? '#c0392b' : k % 2 ? '#b0682f' : '#c27a3a'; ell(bx, by, 4.4, 6.2); ctx.fill(); }
    }
    ctx.restore();
  }

  /* ---------- 위에서 본 대칭 표본 (원점 중심, 반지름 약 90) ---------- */
  function mirrorSide(fn) { fn(1); ctx.save(); ctx.scale(-1, 1); fn(-1); ctx.restore(); }
  const SPEC = [
    { n: '해면', cls: 0, axes: [], note: '몸의 모양이 불규칙해서 어떻게 잘라도 거울상이 되지 않아요.' },
    { n: '해파리', cls: 1, axes: [22.5, 67.5, 112.5, 157.5], note: '중심을 지나는 여러 방향으로 자르면 거울상이 돼요.' },
    { n: '지렁이', cls: 2, axes: [90], note: '몸의 가운데를 세로로 자르는 한 방향에서만 거울상이 돼요.' },
    { n: '불가사리', cls: 1, axes: [90, 162, 54, 126, 18], note: '다섯 팔을 따라 자르는 여러 방향에서 거울상이 돼요. (성체 기준)' },
    { n: '가재', cls: 2, axes: [90], note: '몸의 가운데를 세로로 자르는 한 방향에서만 거울상이 돼요.' },
  ];
  function drawSpec(i, t) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (i === 0) {          // 해면 (불규칙)
      const rr = mulberry(31); const pts = []; for (let k = 0; k < 14; k++) { const a = k * TAU / 14, r = 52 + rr() * 30 + (k % 3) * 6; pts.push([Math.cos(a) * r * (1 + 0.18 * Math.sin(a * 2 + 1)), Math.sin(a) * r * 0.86 + (k === 3 ? 10 : 0)]); }
      ctx.fillStyle = '#d9a857'; ctx.beginPath(); pts.forEach((p, k) => { const q = pts[(k + 1) % pts.length], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (k === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p[0], p[1], mx, my); }); ctx.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a8761f'; ctx.lineWidth = 3; ctx.stroke();
      const r2 = mulberry(5); ctx.fillStyle = '#8a5a1a'; for (let k = 0; k < 16; k++) { ctx.beginPath(); ctx.ellipse(-50 + r2() * 100, -34 + r2() * 70, 4 + r2() * 4, 5 + r2() * 4, r2() * 3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#6b4310'; ctx.beginPath(); ctx.ellipse(8, -6, 14, 11, 0.4, 0, TAU); ctx.fill();
    } else if (i === 1) {   // 해파리 (4회 회전 + 거울)
      const pu = RM ? 1 : 1 + 0.035 * Math.sin(t * 3);
      ctx.save(); ctx.scale(pu, pu);
      ctx.fillStyle = 'rgba(214,160,235,.75)'; ctx.beginPath(); for (let k = 0; k <= 180; k++) { const a = k / 180 * TAU, r = 72 + 6 * Math.cos(8 * a); (k ? ctx.lineTo : ctx.moveTo).call(ctx, Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a45cc4'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8e3fb0'; ctx.lineWidth = 7; for (let k = 0; k < 4; k++) { const c = (22.5 + 90 * k) * Math.PI / 180; ctx.beginPath(); ctx.arc(0, 0, 32, c - 0.45, c + 0.45); ctx.stroke(); }
      ctx.strokeStyle = '#c28ee0'; ctx.lineWidth = 2.5; for (let k = 0; k < 4; k++) { const c = (67.5 + 90 * k) * Math.PI / 180; ctx.beginPath(); ctx.moveTo(Math.cos(c) * 8, Math.sin(c) * 8); ctx.lineTo(Math.cos(c) * 62, Math.sin(c) * 62); ctx.stroke(); }
      ctx.fillStyle = '#6a2c8a'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (i === 2) {   // 지렁이(위에서, 머리가 위쪽)
      const wv = RM ? 0 : t * 4;
      for (let k = 0; k < 15; k++) {
        const u = k / 14, y = -92 + u * 184, w = 22 - 4 * (1 - Math.abs(u - 0.4) * 1.0) * 0 + 4 * Math.sin(u * 3), con = 1 + (RM ? 0 : 0.08 * Math.sin(wv - u * 9));
        ctx.fillStyle = k >= 4 && k <= 6 ? '#c46a6a' : k % 2 ? '#e39a9a' : '#d98585';
        D.roundRect(-w * con, y, w * 2 * con, 14, 7); ctx.fill();
      }
      ctx.fillStyle = '#c46a6a'; ctx.beginPath(); ctx.arc(0, -90, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, -96, 2, 0, TAU); ctx.fill();
    } else if (i === 3) {   // 불가사리
      ctx.fillStyle = '#f08a24'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 30 : 96; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c96a10'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#ffd08a'; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5; for (const r of [18, 38, 58, 76]) { ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3.4, 0, TAU); ctx.fill(); } }
      ctx.fillStyle = '#b8560a'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
    } else {                // 가재 (좌우 대칭: 한쪽을 그리고 뒤집어 그림)
      ctx.fillStyle = '#c0543f';
      ctx.beginPath(); ctx.moveTo(-12, -24); ctx.quadraticCurveTo(0, -38, 12, -24); ctx.lineTo(14, 22); ctx.quadraticCurveTo(0, 28, -14, 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b04632'; for (let k = 0; k < 4; k++) { D.roundRect(-13 + k * 0.5, 26 + k * 13, 26 - k, 12, 5); ctx.fill(); }
      ctx.fillStyle = '#c0543f'; ctx.beginPath(); ctx.moveTo(-8, 78); ctx.lineTo(-22, 96); ctx.lineTo(0, 90); ctx.lineTo(22, 96); ctx.lineTo(8, 78); ctx.closePath(); ctx.fill();
      mirrorSide((sd) => {
        ctx.strokeStyle = '#a43f2c'; ctx.lineWidth = 4;
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(10, -10 + k * 10); ctx.lineTo(34 + k * 2, -2 + k * 12); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(10, -26); ctx.quadraticCurveTo(34, -40, 38, -66); ctx.stroke();
        ctx.fillStyle = '#d0634b'; ctx.beginPath(); ctx.moveTo(38, -66); ctx.quadraticCurveTo(54, -92, 40, -100); ctx.quadraticCurveTo(28, -86, 30, -68); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(38, -66); ctx.quadraticCurveTo(52, -66, 54, -80); ctx.quadraticCurveTo(46, -76, 38, -66); ctx.fill();
        ctx.strokeStyle = '#8a2f20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, -34); ctx.quadraticCurveTo(18, -60, 16, -84); ctx.stroke();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(7, -32, 2.6, 0, TAU); ctx.fill();
      });
    }
  }

  /* ---------- 체강 단면 (중심 원점, 반지름 R) ---------- */
  const GL = { ecto: '#4cc9f0', meso: '#f4845f', endo: '#ffd166', cav: '#eaf6ff', lumen: '#ffffff' };
  function drawSection(kind, R, color, t) {           // kind 0 체강 없음, 1 가체강, 2 진체강
    const rg = R * 0.2, tEc = R * 0.07, tMw = R * 0.16, tEn = R * 0.07, tMg = R * 0.07;
    const c = color ? GL : { ecto: '#e5dccb', meso: '#e5dccb', endo: '#e5dccb', cav: '#ffffff', lumen: '#ffffff' };
    const ring = (r0, r1, fill) => { ctx.beginPath(); ctx.arc(0, 0, r1, 0, TAU); ctx.arc(0, 0, r0, 0, TAU, true); ctx.fillStyle = fill; ctx.fill('evenodd'); };
    ctx.lineWidth = 1.5; ctx.strokeStyle = color ? 'rgba(0,0,0,.18)' : '#9a8f78';
    if (kind === 0) {
      ring(R - tEc, R, c.ecto); ring(rg + tEn, R - tEc, c.meso); ring(rg, rg + tEn, c.endo); ring(0, rg, c.lumen);
      if (color) { ctx.fillStyle = 'rgba(180,70,40,.28)'; const rr = mulberry(2); for (let k = 0; k < 60; k++) { const a = rr() * TAU, r = rg + tEn + 4 + rr() * (R - tEc - rg - tEn - 8); ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2, 0, TAU); ctx.fill(); } }
    } else if (kind === 1) {
      ring(R - tEc, R, c.ecto); ring(R - tEc - tMw, R - tEc, c.meso); ring(rg + tEn, R - tEc - tMw, c.cav); ring(rg, rg + tEn, c.endo); ring(0, rg, c.lumen);
    } else {
      ring(R - tEc, R, c.ecto); ring(R - tEc - tMw, R - tEc, c.meso); ring(rg + tEn + tMg, R - tEc - tMw, c.cav); ring(rg + tEn, rg + tEn + tMg, c.meso); ring(rg, rg + tEn, c.endo); ring(0, rg, c.lumen);
    }
    ctx.strokeStyle = color ? 'rgba(0,0,0,.35)' : '#9a8f78'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    const sw = (t || 0) * 0.8; ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.translate(Math.cos(sw) * R * 0.3, Math.sin(sw) * R * 0.3); ell(-R * 0.35, -R * 0.4, R * 0.5, R * 0.16, -0.6); ctx.fill(); ctx.restore();
  }
  /* =========================================================
     상태
     ========================================================= */
  const S = { mode: 'sym', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const adiff = (a, b) => Math.abs(((a - b + 90) % 180 + 180) % 180 - 90);

  /* ---------- 1단계-가: 대칭 ---------- */
  function resetSym() { S.sy = { i: 0, ang: 0, tried: {}, found: SPEC.map(() => ({})), cls: SPEC.map(() => null), msg: '', shake: 0 }; }
  const SYC = { x: L(400, 240), y: L(300, 300) }, SYS = L(1.45, 1.12), SYR = L(168, 134);
  const symAxisHit = () => { const q = S.sy, sp = SPEC[q.i]; return sp.axes.findIndex((a) => adiff(q.ang, a) <= 2); };
  function setSymAng(v) {
    const q = S.sy; q.ang = v; q.tried[q.i] = true;
    const h = symAxisHit(); if (h >= 0 && !q.found[q.i][h]) { q.found[q.i][h] = true; Sound.tick(); parts.burst(SYC.x, SYC.y, { count: 8, colors: ['#22c55e', '#fff'], speed: 70, size: 2.4, life: 0.5, gravity: 0 }); }
    updateCtl();
  }
  function selSpec(i) { const q = S.sy; q.i = (i + SPEC.length) % SPEC.length; q.msg = ''; Sound.click(); updateCtl(); }
  function classify(c) {
    const q = S.sy, sp = SPEC[q.i];
    if (!q.tried[q.i]) { showHint('먼저 자르는 방향을 돌려 거울상이 되는 방향이 있는지 살펴봐요.', 3200); Sound.fail(); return; }
    if (c !== sp.cls) { Sound.fail(); q.shake = 1; SciSim.tween(q, { shake: 0 }, { duration: 0.4, ease: 'outCubic' }); const nf = Object.keys(q.found[q.i]).length; showHint(c === 2 && sp.cls === 1 ? '방사 대칭은 중심을 지나는 여러 방향에서 거울상이 돼요. 좌우 대칭은 단 한 방향뿐이에요.' : c === 0 ? '거울상이 되는 방향이 있는지 칼을 더 돌려 봐요.' : c === 1 && sp.cls === 2 ? '거울상이 되는 방향이 한 곳뿐이면 좌우 대칭이에요.' : '다시 한 번 칼을 돌려 거울상이 되는 방향의 수를 세어 봐요.', 4600); return; }
    if (q.cls[q.i] == null) { q.cls[q.i] = c; Sound.success(); parts.burst(SYC.x, SYC.y - 90, { count: 16, colors: ['#22c55e', '#fde68a', '#fff'], speed: 130, size: 3.4, life: 0.8, gravity: 80 }); }
    hideHint(); updateCtl();
  }
  const symDone = () => S.sy.cls.filter((c) => c != null).length;
  function drawSym(dt, t) {
    const q = S.sy, sp = SPEC[q.i], hit = symAxisHit();
    bgFill('#eaf3f9', '#f2f7fb');
    T(L(20, 12), 30, '⚖️ 몸을 자르는 방향을 돌려 거울상을 찾아요', L(18, 15.5), '#0f3a5a', 'left', 800);
    // 표본 이름표
    SPEC.forEach((s, i) => { const w = L(100, 84), x = L(20, 12) + i * (w + L(8, 6)), done = q.cls[i] != null; box({ x, y: 46, w, h: 34 }, s.n + (done ? ' ✔' : ''), { bg: i === q.i ? '#16a34a' : done ? '#dcfce7' : '#fff', color: i === q.i ? '#fff' : '#1b2333', border: i === q.i ? '#0b6b39' : done ? '#16a34a' : '#cbd5e1', lw: 2, size: 13.5, r: 12 }); });
    // 눈금판
    ctx.save(); ctx.translate(SYC.x, SYC.y);
    D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, SYR + 14, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 12, y: 4 });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; for (let a = 0; a < 360; a += 15) { const r0 = SYR + (a % 45 === 0 ? 0 : 6), c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); ctx.beginPath(); ctx.moveTo(c * r0, s * r0); ctx.lineTo(c * (SYR + 14), s * (SYR + 14)); ctx.stroke(); }
    sp.axes.forEach((a, k) => { if (q.found[q.i][k]) for (const sg of [0, 180]) { const r = (a + sg) * Math.PI / 180; D.sphere(Math.cos(r) * (SYR + 7), Math.sin(r) * (SYR + 7), 6, '#22c55e', { gloss: false }); } });
    // 표본 + 거울 그림자
    ctx.save(); const sh = q.shake * Math.sin(q.shake * 40) * 5; ctx.translate(sh, 0); ctx.scale(SYS, SYS);
    drawSpec(q.i, t);
    ctx.restore();
    ctx.save(); const ar = q.ang * Math.PI / 180; ctx.rotate(ar); ctx.scale(1, -1); ctx.rotate(-ar); ctx.globalAlpha = 0.38; ctx.scale(SYS, SYS); drawSpec(q.i, t); ctx.restore();
    // 칼(자르는 선)
    const ar2 = q.ang * Math.PI / 180, col = hit >= 0 ? '#16a34a' : '#475569';
    ctx.save(); ctx.rotate(ar2); ctx.strokeStyle = col; ctx.lineWidth = hit >= 0 ? 4 : 3; ctx.setLineDash(hit >= 0 ? [] : [10, 7]); ctx.beginPath(); ctx.moveTo(-SYR - 12, 0); ctx.lineTo(SYR + 12, 0); ctx.stroke(); ctx.setLineDash([]);
    if (hit >= 0) D.glow(0, 0, SYR * 0.9, '#22c55e', 0.12);
    ctx.restore();
    ctx.restore();
    // 결과 표시
    const nf = Object.keys(q.found[q.i]).length;
    const msg = hit >= 0 ? '✅ 거울상이 겹쳐요! 이 방향은 대칭이에요' : '자르는 방향: ' + Math.round(q.ang) + '°  (거울상이 겹치는 방향을 찾아봐요)';
    T(VW / 2, L(520, 548), msg, L(17, 14.5), hit >= 0 ? '#0b6b39' : '#475569', 'center', 800);
    T(VW / 2, L(546, 574), '찾은 거울상 방향: ' + nf + '개' + (nf ? ' (초록 점)' : ' · 칼을 0°에서 180°까지 돌려 보세요'), L(14.5, 13.5), '#64748b', 'center', 700);
    if (q.cls[q.i] != null) { chip(VW / 2, L(80, 98), (q.i === 0 ? '비대칭' : SYM_N[sp.cls]) + ' · ' + sp.note, { align: 'center', size: L(14, 13), bg: '#dcfce7', color: '#0b6b39', border: '#16a34a', pad: 12, h: 28 }); }
  }
  function symDown(p) {
    for (let i = 0; i < SPEC.length; i++) { const w = L(100, 84), x = L(20, 12) + i * (w + L(8, 6)); if (inRect(p, { x, y: 46, w, h: 34 })) { selSpec(i); return false; } }
    return false;
  }

  /* ---------- 1단계-나: 체강 단면 ---------- */
  const SEC_ORDER = [2, 0, 1];                 // 화면의 A, B, C 단면 종류 (진체강, 체강 없음, 가체강)
  const SEC_ANIMAL = ['플라나리아', '회충', '지렁이'];      // 체강 없음, 가체강, 진체강 순
  function resetCoel() { S.ce = { pick: [null, null, null], color: true, bad: [false, false, false], pop: [1, 1, 1] }; }
  const CER = L(104, 68), CEY = L(238, 210);
  const cePos = (k) => ({ x: L(140 + k * 260, 88 + k * 152), y: CEY });
  function drawCoel(dt, t) {
    const c = S.ce;
    bgFill('#eaf3f9', '#f2f7fb');
    T(L(20, 12), 30, '🔪 몸을 가로로 자른 단면: 체강은 어디일까?', L(18, 15.5), '#0f3a5a', 'left', 800);
    for (let k = 0; k < 3; k++) {
      const p = cePos(k), pr = c.pop[k];
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pr, pr);
      D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, CER + 8, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 12, y: 4 });
      drawSection(SEC_ORDER[k], CER, c.color, t);
      const kind = SEC_ORDER[k];
      if (c.color && kind > 0) T(0, -CER * 0.5, '체강', 13, '#2563a8', 'center', 800);
      ctx.restore();
      chip(p.x, p.y + CER + 30, '단면 ' + 'ABC'[k] + (c.pick[k] != null ? ' → ' + SEC_ANIMAL[c.pick[k]] : ''), { align: 'center', size: 14.5, bg: c.bad[k] ? '#fee2e2' : c.pick[k] != null ? '#dcfce7' : '#fff', border: c.bad[k] ? '#dc2626' : c.pick[k] != null ? '#16a34a' : '#94a3b8', color: '#1b2333', pad: 12, h: 30 });
    }
    // 범례
    const ly = L(420, 436);
    panel(L(20, 12), ly, VW - L(40, 24), L(118, 184), 14);
    if (c.color) {
      const items = [['외배엽', GL.ecto], ['중배엽', GL.meso], ['내배엽', GL.endo], ['체강(빈 공간)', GL.cav], ['소화관 안쪽', '#ffffff']];
      items.forEach((it, i) => { const x = L(40, 30) + (PHONE ? (i % 2) * 210 : i * 142), y = ly + (PHONE ? 26 + Math.floor(i / 2) * 26 : 28); ctx.fillStyle = it[1]; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2; D.roundRect(x, y - 11, 20, 20, 5); ctx.fill(); ctx.stroke(); T(x + 28, y + 5, it[0], 13.5, '#1b2333', 'left', 700); });
    } else T(L(40, 30), ly + 32, '색을 끄면 층 구분이 어려워요. 🎨 배엽 색 보기를 켜 보세요.', L(15, 14), '#475569', 'left', 700);
    textBlock(L(40, 30), ly + L(62, 118), VW - L(80, 60), '체강은 몸속 빈 공간이에요. 진체강은 빈 공간의 안쪽과 바깥쪽이 모두 중배엽으로 둘러싸여 있고, 가체강은 소화관 쪽에 중배엽이 없어요.', L(14.5, 13.5), '#475569', 20, 700);
  }

  /* ---------- 1단계-다: 소화관 ---------- */
  function gutGeo(k) {
    if (!PHONE) { const x = 20 + k * 256; return { x, y: 52, w: 244, h: 330 }; }
    return { x: 10, y: 44 + k * 196, w: 460, h: 186 };
  }
  // 각 표본의 소화관 경로(창 안 좌표 0~1 → 화면 좌표)
  const GUTS = [
    { n: '말미잘', kind: 'sac', pts: [[0.5, 0.2], [0.5, 0.5], [0.5, 0.78]], cap: '입만 있어요' },
    { n: '플라나리아', kind: 'sac', pts: [[0.5, 0.56], [0.5, 0.46], [0.74, 0.46], [0.9, 0.46]], cap: '입만 있어요' },
    { n: '지렁이', kind: 'tube', pts: [[0.08, 0.5], [0.5, 0.5], [0.92, 0.5]], cap: '입과 항문이 있어요' },
  ];
  function gutPts(k) {
    const g = gutGeo(k), G0 = GUTS[k], P = (u, v) => PHONE ? { x: g.x + 20 + u * (g.w - 40), y: g.y + 30 + v * (g.h - 50) } : { x: g.x + 14 + u * (g.w - 28), y: g.y + 42 + v * (g.h - 80) };
    // 모바일은 옆으로 눕힌 그림: 말미잘과 플라나리아도 가로 경로
    if (PHONE && k === 0) return [[0.14, 0.5], [0.44, 0.5], [0.72, 0.5]].map(([u, v]) => P(u, v));
    return G0.pts.map(([u, v]) => P(u, v));
  }
  function resetGut() { S.gu = { food: [], exited: [0, 0, 0], flash: [0, 0, 0], fedN: 0, wob: 0 }; }
  const polyLen = (pts) => pts.reduce((a, p, i) => (i ? a + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
  function polyAt(pts, s) {
    let rem = s; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); if (rem <= d || i === pts.length - 1) { const f = d ? clamp(rem / d, 0, 1) : 0; return { x: lerp(pts[i - 1].x, pts[i].x, f), y: lerp(pts[i - 1].y, pts[i].y, f) }; } rem -= d; }
    return pts[pts.length - 1];
  }
  function feedAll() {
    const G_ = S.gu; for (let k = 0; k < 3; k++) G_.food.push({ k, s: 0, dir: 1, dig: 0, born: S.clock });
    G_.fedN++; Sound.click(); updateCtl();
  }
  function stepGut(dt) {
    const G_ = S.gu; if (!G_) return;
    for (let i = G_.food.length - 1; i >= 0; i--) {
      const f = G_.food[i], pts = gutPts(f.k), Ltot = polyLen(pts), sp = 46;
      if (f.dir === 1) { f.s += sp * dt; if (f.s >= Ltot) { f.s = Ltot; if (GUTS[f.k].kind === 'tube') { f.dir = 2; } else { f.dir = -1; f.dig = 0; } } }
      else if (f.dir === -1) { f.s -= sp * dt; f.dig = Math.min(1, f.dig + dt * 1.2); if (f.s <= 0) { f.s = 0; f.dir = 2; } }
      if (f.dir === 1 && GUTS[f.k].kind === 'tube') f.dig = clamp(f.s / Ltot * 1.4, 0, 1);
      if (f.dir === 2) {
        f.out = (f.out || 0) + dt;
        if (f.out > 0.7) { G_.exited[f.k]++; G_.flash[f.k] = 1; SciSim.tween(G_.flash, { [f.k]: 0 }, { duration: 1.8, ease: 'outCubic' }); const e = GUTS[f.k].kind === 'tube' ? pts[pts.length - 1] : pts[0]; parts.burst(e.x, e.y, { count: 8, colors: ['#8a5a2b', '#b07a45'], speed: 50, size: 2.6, life: 0.7, gravity: 40 }); G_.food.splice(i, 1); updateCtl(); }
      }
    }
  }
  function drawGutAnimal(k, g, t) {
    const pts = gutPts(k);
    ctx.save(); D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.clip();
    ctx.fillStyle = '#d6ecf8'; ctx.fillRect(g.x, g.y, g.w, g.h);
    const cx = g.x + g.w / 2;
    if (k === 0) {            // 말미잘: 자루 모양 몸
      if (!PHONE) {
        ctx.fillStyle = '#e8a5bd'; ctx.beginPath(); ctx.moveTo(cx - 52, g.y + g.h - 28); ctx.lineTo(cx - 40, g.y + 76); ctx.lineTo(cx + 40, g.y + 76); ctx.lineTo(cx + 52, g.y + g.h - 28); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d78aa6'; ctx.fillRect(cx - 62, g.y + g.h - 30, 124, 18);
        ctx.fillStyle = '#fbe6ee'; ctx.beginPath(); ctx.moveTo(cx - 28, g.y + 84); ctx.lineTo(cx + 28, g.y + 84); ctx.lineTo(cx + 36, g.y + g.h - 40); ctx.lineTo(cx - 36, g.y + g.h - 40); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#f08ab0'; ctx.lineWidth = 5; for (let j = -4; j <= 4; j++) { ctx.beginPath(); ctx.moveTo(cx + j * 8, g.y + 76); ctx.quadraticCurveTo(cx + j * 13 + Math.sin(t * 2 + j) * 3, g.y + 50, cx + j * 17 + Math.sin(t * 2.4 + j) * 4, g.y + 36); ctx.stroke(); }
        ctx.fillStyle = '#7a1f46'; ell(cx, g.y + 78, 24, 5); ctx.fill();
      } else {
        const my = g.y + g.h / 2;
        ctx.fillStyle = '#e8a5bd'; ctx.beginPath(); ctx.moveTo(g.x + 40, my - 38); ctx.lineTo(g.x + g.w - 60, my - 52); ctx.lineTo(g.x + g.w - 60, my + 52); ctx.lineTo(g.x + 40, my + 38); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fbe6ee'; ctx.beginPath(); ctx.moveTo(g.x + 54, my - 24); ctx.lineTo(g.x + g.w - 74, my - 36); ctx.lineTo(g.x + g.w - 74, my + 36); ctx.lineTo(g.x + 54, my + 24); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#f08ab0'; ctx.lineWidth = 5; for (let j = -3; j <= 3; j++) { ctx.beginPath(); ctx.moveTo(g.x + 40, my + j * 9); ctx.quadraticCurveTo(g.x + 20, my + j * 13 + Math.sin(t * 2 + j) * 3, g.x + 8, my + j * 17); ctx.stroke(); }
      }
    } else if (k === 1) {      // 플라나리아: 위에서 본 납작한 몸, 갈라진 소화관
      const by = g.y + g.h * (PHONE ? 0.5 : 0.52);
      ctx.fillStyle = '#c9ad7f'; ctx.beginPath(); ctx.moveTo(g.x + 20, by); ctx.quadraticCurveTo(g.x + 70, by - 62, g.x + g.w - 60, by - 38); ctx.lineTo(g.x + g.w - 16, by); ctx.lineTo(g.x + g.w - 60, by + 38); ctx.quadraticCurveTo(g.x + 70, by + 62, g.x + 20, by); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(g.x + 40, by - 8, 6, 0, TAU); ctx.arc(g.x + 40, by + 8, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(g.x + 42, by - 8, 2.6, 0, TAU); ctx.arc(g.x + 42, by + 8, 2.6, 0, TAU); ctx.fill();
      // 소화관 (입은 몸 가운데 아래쪽에서 인두를 내밀어요)
      ctx.strokeStyle = '#f2e3c4'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pts[2].x, pts[2].y); ctx.lineTo(pts[2].x + 8, pts[2].y - 30); ctx.moveTo(pts[2].x, pts[2].y); ctx.lineTo(pts[2].x + 8, pts[2].y + 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pts[1].x, pts[1].y); ctx.lineTo(pts[1].x - 34, pts[1].y); ctx.stroke();
    } else {                   // 지렁이: 가로 관
      const by = g.y + g.h * 0.5;
      const w0 = g.x + 10, w1 = g.x + g.w - 10;
      for (let j = 0; j < 14; j++) { const u = j / 13, x = w0 + u * (w1 - w0 - 22), con = 1 + (RM ? 0 : 0.1 * Math.sin(t * 4 - u * 9)); ctx.fillStyle = j >= 3 && j <= 4 ? '#c46a6a' : j % 2 ? '#e39a9a' : '#d98585'; D.roundRect(x, by - 30 * con, (w1 - w0) / 13 + 1, 60 * con, 8); ctx.fill(); }
      ctx.strokeStyle = '#f2e3c4'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[2].x, pts[2].y); ctx.stroke();
      ctx.fillStyle = '#7a3d3d'; ctx.beginPath(); ctx.arc(pts[0].x - 4, pts[0].y, 7, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(pts[2].x + 2, pts[2].y, 5, 0, TAU); ctx.fill();
    }
    // 입 / 항문 표시
    const m = pts[0], e = GUTS[k].kind === 'tube' ? pts[pts.length - 1] : pts[0];
    ctx.restore();
    D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.strokeStyle = '#7fb4d6'; ctx.lineWidth = 2.5; ctx.stroke();
    const flash = S.gu.flash[k];
    chip(g.x + g.w / 2, g.y + 20, GUTS[k].n + ' · ' + GUTS[k].cap, { align: 'center', size: 14, bg: '#fff', border: '#7fb4d6', color: '#0f3a5a', pad: 10, h: 28 });
    const lm = GUTS[k].kind === 'tube' ? [['입', pts[0], -22], ['항문', pts[2], 22]] : [['입 = 항문', pts[0], PHONE ? -26 : -26]];
    lm.forEach(([s, p, dy]) => { const lx = PHONE ? clamp(p.x, g.x + 40, g.x + g.w - 40) : clamp(p.x, g.x + 44, g.x + g.w - 44); const ly = k === 0 && !PHONE ? g.y + 100 : k === 1 && !PHONE ? p.y + 36 : p.y + (PHONE ? 34 : 38); D.label(lx, ly, s, { bg: '#16a34a', size: 13, pad: 7 }); });
    if (flash > 0.02) { const p = GUTS[k].kind === 'tube' ? pts[2] : pts[0]; T(g.x + g.w / 2, g.y + g.h - 14, GUTS[k].kind === 'tube' ? '찌꺼기가 항문으로 나가요' : '찌꺼기가 입으로 나가요', 13.5, '#8a3b0a', 'center', 800, { alpha: clamp(flash * 1.6, 0, 1) }); }
  }
  function drawGut(dt, t) {
    bgFill('#eaf3f9', '#f2f7fb');
    T(L(20, 12), 30, '🍽️ 먹이를 주고 소화관 안의 흐름을 따라가요', L(18, 15.5), '#0f3a5a', 'left', 800);
    for (let k = 0; k < 3; k++) drawGutAnimal(k, gutGeo(k), t);
    // 먹이 입자
    S.gu.food.forEach((f) => {
      const pts = gutPts(f.k), Ltot = polyLen(pts), tube = GUTS[f.k].kind === 'tube';
      let p = polyAt(pts, f.s); if (f.dir === 2) { const e = tube ? pts[pts.length - 1] : pts[0]; p = { x: e.x + (tube ? 1 : -1) * (f.out || 0) * (PHONE ? 24 : 18) * (tube ? 1 : 0.9), y: e.y + (PHONE ? 0 : (tube ? 0 : -(f.out || 0) * 30)) }; if (!tube && !PHONE) p = { x: e.x, y: e.y - (f.out || 0) * 30 }; }
      const col = SciSim.color.mix('#f59e0b', '#7a4a1e', f.dir === 2 ? 1 : f.dig);
      D.sphere(p.x, p.y, 7, col, { gloss: true });
      if (f.dir === -1 || (tube && f.dir === 1)) { ctx.fillStyle = 'rgba(34,197,94,.8)'; for (let j = 0; j < 2; j++) { const a = t * 3 + j * 3 + f.k; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 13, p.y - 10 + Math.sin(a) * 6 - ((t * 20 + j * 7) % 14), 2.4, 0, TAU); ctx.fill(); } }
    });
    const ty = L(412, PHONE ? 600 : 412);
    if (!PHONE) {
      panel(20, ty, 760, 128, 14);
      textBlock(40, ty + 32, 720, '말미잘과 플라나리아는 소화관이 한쪽만 열려 있어서 먹이가 들어온 입으로 찌꺼기가 다시 나가요. 지렁이는 입으로 들어가 항문으로 나가는 한 방향 관이라, 먹이가 지나가는 동안 부위마다 다른 일을 할 수 있어요.', 15, '#1b2333', 22, 700);
      T(40, ty + 108, '🍽️ 먹이를 준 횟수 ' + S.gu.fedN + '번 · 입으로 나간 찌꺼기 ' + (S.gu.exited[0] + S.gu.exited[1]) + '개 · 항문으로 나간 찌꺼기 ' + S.gu.exited[2] + '개', 14.5, '#64748b', 'left', 800);
    }
  }

  /* ---------- 2단계: 9개 문 비교표 ---------- */
  const TCOLS = [{ k: 'sym', n: '대칭', lab: ['비대칭', '방사', '좌우'] }, { k: 'coel', n: '체강', lab: ['없음', '가체강', '진체강'] }, { k: 'seg', n: '체절', lab: ['X', 'O'] }, { k: 'exo', n: '키틴 외골격', lab: ['X', 'O'] }];
  const TB = L({ x: 20, y: 46, w: 760, h: 320 }, { x: 10, y: 42, w: 460, h: 248 });
  const TBH = L(34, 30), TBR = L(31, 24);
  const tbCW = L(95, 90), tbC0 = TB.w - 4 * tbCW;
  function resetTbl() { S.tb = { v: AP.map(() => [null, null, null, null]), bad: AP.map(() => [false, false, false, false]), sel: 0 }; }
  const tbCell = (r, c) => ({ x: TB.x + tbC0 + c * tbCW, y: TB.y + TBH + r * TBR, w: tbCW, h: TBR });
  const tblAns = (r, c) => AP[r][TCOLS[c].k];
  const tblFilled = () => S.tb.v.reduce((a, r) => a + r.filter((x) => x != null).length, 0);
  const tblRight = () => S.tb.v.reduce((a, r, i) => a + r.filter((x, c) => x != null && x === tblAns(i, c)).length, 0);
  function setTb(r, c, v) { S.tb.v[r][c] = v; S.tb.bad[r][c] = false; Sound.tick(); updateCtl(); }
  function drawTbl(dt, t) {
    const B = S.tb;
    bgFill('#eaf3f9', '#f2f7fb');
    panel(TB.x, TB.y, TB.w, TB.h, 14);
    ctx.fillStyle = '#dcebf5'; D.roundRect(TB.x, TB.y, TB.w, TBH, 12); ctx.fill();
    T(TB.x + 14, TB.y + TBH / 2 + 5, '문', 14, '#0f3a5a', 'left', 800);
    if (!PHONE) T(TB.x + 160, TB.y + TBH / 2 + 5, '대표 동물', 14, '#0f3a5a', 'left', 800);
    TCOLS.forEach((c, ci) => { const r = tbCell(0, ci); T(r.x + r.w / 2, TB.y + TBH / 2 + 5, c.n, PHONE && ci === 3 ? 12.5 : 13.5, '#0f3a5a', 'center', 800); });
    for (let r = 0; r < NA; r++) {
      const y = TB.y + TBH + r * TBR, sel = B.sel === r;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(TB.x + 8, y); ctx.lineTo(TB.x + TB.w - 8, y); ctx.stroke();
      const rowOk = B.v[r].every((x, c) => x === tblAns(r, c));
      if (sel) { ctx.fillStyle = 'rgba(37,99,168,.1)'; ctx.fillRect(TB.x + 2, y + 1, TB.w - 4, TBR - 1); }
      if (rowOk) { ctx.fillStyle = 'rgba(34,160,74,.1)'; ctx.fillRect(TB.x + 2, y + 1, TB.w - 4, TBR - 1); }
      ctx.fillStyle = AP[r].col; D.roundRect(TB.x + 6, y + 5, 5, TBR - 10, 3); ctx.fill();
      T(TB.x + 18, y + TBR / 2 + 5, AP[r].n, fitText(AP[r].n, PHONE ? tbC0 - 22 : 130, 14, 800, 12.5), AP[r].col, 'left', 800);
      if (!PHONE) T(TB.x + 160, y + TBR / 2 + 5, AP[r].rep.length > 14 ? '어류, 양서류 등 척추동물' : AP[r].rep, 13.5, '#475569', 'left', 700);
      for (let c = 0; c < 4; c++) {
        const cr = tbCell(r, c), v = B.v[r][c], cx = cr.x + cr.w / 2, cy = cr.y + cr.h / 2;
        if (B.bad[r][c]) { D.roundRect(cr.x + 5, cr.y + 3, cr.w - 10, cr.h - 6, 8); ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2.2; ctx.stroke(); }
        if (v == null) T(cx, cy + 5, '?', 15, '#cbd5e1', 'center', 800);
        else { const s = TCOLS[c].lab[v]; chip(cx, cy, s, { align: 'center', size: 13, bg: c < 2 ? '#e8f1fb' : v ? '#dcfce7' : '#f1f5f9', color: c < 2 ? '#1d4f8a' : v ? '#0b6b39' : '#64748b', border: c < 2 ? '#9cc0e8' : v ? '#16a34a' : '#cbd5e1', pad: 8, h: L(24, 21) }); }
      }
    }
    // 단서 카드
    const cy0 = TB.y + TB.h + L(12, 10), r = B.sel, ph = AP[r];
    panel(TB.x, cy0, TB.w, VH - cy0 - 10, 14, '#fff', { stroke: ph.col, lw: 2 });
    T(TB.x + 16, cy0 + 28, '🔎 ' + ph.n + ' · 대표 동물: ' + ph.rep, fitText('🔎 ' + ph.n + ' · 대표 동물: ' + ph.rep, TB.w - 32, L(16, 14.5), 800, 13), ph.col, 'left', 800);
    textBlock(TB.x + 16, cy0 + 56, TB.w - 32, ph.clue, L(15, 14), '#1b2333', L(22, 20), 700);
  }
  function tblDown(p) {
    const B = S.tb;
    for (let r = 0; r < NA; r++) {
      for (let c = 0; c < 4; c++) if (inRect(p, tbCell(r, c))) { B.sel = r; const n = TCOLS[c].lab.length, cur = B.v[r][c]; setTb(r, c, cur == null ? 0 : cur + 1 >= n ? null : cur + 1); return false; }
      if (p.x >= TB.x && p.x <= TB.x + tbC0 && p.y >= TB.y + TBH + r * TBR && p.y < TB.y + TBH + (r + 1) * TBR) { B.sel = r; Sound.click(); updateCtl(); return false; }
    }
    return false;
  }

  /* ---------- 3단계: 검색표(걷기) ---------- */
  const TREE_NAT = (() => { const t = buildTree(NAT); return t; })();
  const INFO_NAT = treeInfo(TREE_NAT);
  const KT = L({ x: 12, w: 776, y0: 62, step: 40, leafY: 258, leafH: 76 }, { x: 8, w: 464, y0: 62, step: 38, leafY: 238, leafH: 66 });
  layoutTree(TREE_NAT, INFO_NAT, KT.x, KT.x + KT.w, KT.y0, KT.step, KT.leafY);
  const NODE_W = L(88, 70), NODE_H = L(28, 26);
  const KTRAY = AN.map((a, i) => (PHONE ? { x: 8 + (i % 4) * 116, y: 316 + Math.floor(i / 4) * 44, w: 110, h: 40 } : { x: 14 + (i % 7) * 111, y: 350 + Math.floor(i / 7) * 42, w: 106, h: 36 }));
  const KQ = L({ txtY: 450, trailY: 474, yes: { x: 200, y: 486, w: 190, h: 46 }, no: { x: 410, y: 486, w: 190, h: 46 } }, { txtY: 506, trailY: 530, yes: { x: 20, y: 548, w: 205, h: 46 }, no: { x: 255, y: 548, w: 205, h: 46 } });
  function resetKey() { S.ky = { cur: null, done: {}, leafs: INFO_NAT.leaves.map(() => []), miss: 0, trail: [], shake: 0, pop: {} }; }
  const nodeStand = (nd) => ({ x: nd.x, y: nd.y + (PHONE ? 30 : 32) });
  const leafOf = (ph) => INFO_NAT.leaves.findIndex((lf) => lf.leaf.indexOf(ph) >= 0);
  function pickAnimal(i) {
    const K = S.ky; if (!K || K.done[i] != null) return;
    if (K.cur && K.cur.busy) return;
    const tr = KTRAY[i], st = nodeStand(TREE_NAT);
    K.cur = { i, node: TREE_NAT, x: tr.x + tr.w / 2, y: tr.y + tr.h / 2, busy: true };
    K.trail = []; const c = K.cur;
    SciSim.tween(c, { x: st.x, y: st.y }, { duration: RM ? 0.01 : 0.5, ease: 'outBack', onDone: () => { c.busy = false; updateCtl(); } });
    Sound.click(); hideHint(); updateCtl();
  }
  function keyAnswer(yes) {
    const K = S.ky, c = K && K.cur; if (!c || c.busy) return;
    const nd = c.node, ph = AN[c.i].ph, truth = QA[nd.k].f(AP[ph]);
    if (yes !== truth) {
      K.miss++; Sound.fail(); K.shake = 1; SciSim.tween(K, { shake: 0 }, { duration: 0.4, ease: 'outCubic' });
      showHint(withJosa(AN[c.i].n, '은/는') + ' ' + attrFact(nd.k, truth, ph) + '. 그래서 "' + (truth ? '예' : '아니오') + '"를 골라요.', 5600); updateCtl(); return;
    }
    hideHint(); Sound.success();
    K.trail.push(QA[nd.k].s + ' ' + (yes ? '예' : '아니오'));
    const nx = yes ? nd.yes : nd.no; c.busy = true;
    if (!nx.leaf) {
      const st = nodeStand(nx); c.node = nx;
      SciSim.tween(c, { x: st.x, y: st.y }, { duration: RM ? 0.01 : 0.55, ease: 'outCubic', onDone: () => { c.busy = false; updateCtl(); } });
    } else {
      const li = INFO_NAT.leaves.indexOf(nx);
      SciSim.tween(c, { x: nx.x, y: nx.y + 4 }, { duration: RM ? 0.01 : 0.65, ease: 'outBack', onDone: () => {
        if (S.ky !== K) return;
        K.leafs[li].push(c.i); K.done[c.i] = li; K.pop[c.i] = 0; SciSim.tween(K.pop, { [c.i]: 1 }, { duration: 0.4, ease: 'outBack' });
        if (K.cur === c) K.cur = null;
        parts.burst(nx.x, nx.y + 20, { count: 12, colors: [AP[AN[c.i].ph].col, '#fde68a', '#fff'], speed: 90, size: 3, life: 0.6, gravity: 60 });
        updateCtl();
      } });
    }
    updateCtl();
  }
  const keyDoneN = () => Object.keys(S.ky.done).length;
  function drawTreeEdges(root, active) {
    (function e(t) {
      if (t.leaf) return;
      [t.no, t.yes].forEach((ch, idx) => {
        const cx = ch.x, cy = ch.leaf ? ch.y : ch.y - NODE_H / 2, on = active && active.indexOf(ch) >= 0, col = idx === 0 ? '#dc2626' : '#16a34a';
        ctx.strokeStyle = on ? col : (idx === 0 ? 'rgba(220,38,38,.45)' : 'rgba(22,163,74,.45)'); ctx.lineWidth = on ? 4 : 2.2;
        ctx.beginPath(); ctx.moveTo(t.x, t.y + NODE_H / 2); ctx.lineTo(cx, cy); ctx.stroke();
        e(ch);
      });
    })(root);
  }
  function drawTreeNodes(root, hl) {
    (function e(t) { if (t.leaf) return; e(t.no); e(t.yes); const on = hl === t; D.shadow(() => box({ x: t.x - NODE_W / 2, y: t.y - NODE_H / 2, w: NODE_W, h: NODE_H }, QA[t.k].s, { bg: on ? '#fef9c3' : '#fff', border: on ? '#eab308' : '#2563a8', lw: on ? 3 : 2, size: L(13.5, 13), r: 10, minSize: 12.5 }), { blur: on ? 10 : 4, y: 2 }); })(root);
  }
  function drawKey(dt, t) {
    const K = S.ky, c = K.cur;
    bgFill('#eaf3f9', '#f2f7fb');
    T(L(16, 10), 28, '🔑 이분 검색표: 질문에 답하며 문을 찾아요', L(17, 15), '#0f3a5a', 'left', 800);
    // 현재 경로 강조
    const act = []; if (c) { let n = c.node; while (n) { act.push(n); n = n.parent; } }
    drawTreeEdges(TREE_NAT, act);
    // 잎 상자
    INFO_NAT.leaves.forEach((lf, li) => {
      const ph = AP[lf.leaf[0]], w = KT.w / INFO_NAT.leaves.length - 6, r = { x: lf.x - w / 2, y: KT.leafY, w, h: KT.leafH };
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.strokeStyle = ph.col; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = ph.col; D.roundRect(r.x, r.y, r.w, L(24, 38), 10); ctx.fill(); ctx.fillRect(r.x, r.y + L(14, 20), r.w, L(10, 18));
      if (!PHONE) T(lf.x, r.y + 17, ph.n, fitText(ph.n, w - 6, 13, 800, 12), '#fff', 'center', 800);
      else { T(lf.x, r.y + 16, ph.s, 13, '#fff', 'center', 800); T(lf.x, r.y + 31, '동물', 12.5, '#fff', 'center', 700); }
      if (!PHONE) K.leafs[li].forEach((ai, n) => T(lf.x, r.y + 42 + n * 17, AN[ai].n, fitText(AN[ai].n, w - 6, 13, 800, 12), '#1b2333', 'center', 800));
      else { const cnt = K.leafs[li].length; T(lf.x, r.y + 56, cnt ? cnt + '마리' : '', 13, '#1b2333', 'center', 800); }
    });
    drawTreeNodes(TREE_NAT, c && c.node);
    // 카드 쟁반
    for (let i = 0; i < NAN; i++) {
      const r = KTRAY[i], done = K.done[i] != null, cur = c && c.i === i;
      if (cur) { ctx.fillStyle = 'rgba(0,0,0,.06)'; D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill(); T(r.x + r.w / 2, r.y + r.h / 2 + 5, '…', 18, '#94a3b8', 'center', 800); continue; }
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = done ? '#f1f5f9' : '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
      if (done) { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.strokeStyle = AP[AN[i].ph].col; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.save(); if (done) ctx.globalAlpha = 0.45; animalIcon(AN[i].n, r.x + 20, r.y + r.h / 2, L(24, 26), t); T(r.x + 40, r.y + r.h / 2 + 5, AN[i].n, fitText(AN[i].n, r.w - 62, 13.5, 800, 12.5), '#1b2333', 'left', 800); ctx.restore();
      if (done) T(r.x + r.w - 12, r.y + r.h / 2 + 5, '✔', 14, '#16a34a', 'center', 800);
    }
    // 질문 영역
    if (!c) T(VW / 2, KQ.txtY, keyDoneN() < NAN ? '👆 위의 동물 카드를 눌러 검색표를 따라가 보세요' : '🎉 13마리를 9개의 문으로 모두 나눴어요!', L(17, 15), keyDoneN() < NAN ? '#475569' : '#0b6b39', 'center', 800);
    else {
      T(VW / 2, KQ.txtY, AN[c.i].n + ' · 질문: ' + QA[c.node.k].q, L(17, 15), '#1b2333', 'center', 800);
      T(VW / 2, KQ.trailY, K.trail.length ? '지나온 길: ' + K.trail.join(' → ') : '아직 지나온 길이 없어요', 13.5, '#64748b', 'center', 700);
    }
    const can = !!(c && !c.busy);
    box(KQ.yes, '예', { bg: can ? '#16a34a' : '#cbd5e1', color: '#fff', size: 17, r: 14 });
    box(KQ.no, '아니오', { bg: can ? '#dc2626' : '#cbd5e1', color: '#fff', size: 17, r: 14 });
    if (c) {
      const w = L(112, 108), h = 30, off = K.shake * Math.sin(K.shake * 40) * 6;
      D.shadow(() => { D.roundRect(c.x - w / 2 + off, c.y - h / 2, w, h, 15); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 12, y: 5 });
      D.roundRect(c.x - w / 2 + off, c.y - h / 2, w, h, 15); ctx.strokeStyle = K.shake > 0.05 ? '#dc2626' : '#16a34a'; ctx.lineWidth = 2.5; ctx.stroke();
      animalIcon(AN[c.i].n, c.x - w / 2 + 18 + off, c.y, 22, t); T(c.x + 12 + off, c.y + 5, AN[c.i].n, 13.5, '#1b2333', 'center', 800);
    }
  }
  function keyDown(p) {
    for (let i = 0; i < NAN; i++) if (inRect(p, KTRAY[i])) { pickAnimal(i); return false; }
    if (inRect(p, KQ.yes)) { keyAnswer(true); return false; }
    if (inRect(p, KQ.no)) { keyAnswer(false); return false; }
    return false;
  }

  /* ---------- 3단계: 첫 질문 고르기 (검색표 만들기) ---------- */
  const FIRSTQ = ['bil', 'rad', 'coel', 'tru', 'seg', 'exo', 'noto'];
  const FIRST_EVAL = FIRSTQ.map((k) => { const order = [k].concat(NAT.filter((a) => a !== k)); const tr = buildTree(order); const inf = treeInfo(tr); return { k, tree: tr, info: inf }; });
  function resetBuild() { S.bd = { opt: 0, seen: { 0: true }, k: 1 }; }
  function setBuild(o) { S.bd.opt = o; S.bd.seen[o] = true; S.bd.k = 0; SciSim.tween(S.bd, { k: 1 }, { duration: RM ? 0.01 : 0.55, ease: 'outCubic' }); Sound.click(); updateCtl(); }
  function drawBuild(dt, t) {
    const ev = FIRST_EVAL[S.bd.opt], k = S.bd.k;
    bgFill('#eaf3f9', '#f2f7fb');
    T(L(16, 10), 28, '🛠️ 첫 번째 질문: ' + QA[ev.k].q, L(17, 15), '#0f3a5a', 'left', 800);
    const maxD = Math.max.apply(null, ev.info.nodes.map((n) => n.depth));
    const step = Math.min(KT.step, (KT.leafY - 20 - KT.y0 - NODE_H / 2) / Math.max(1, maxD));
    layoutTree(ev.tree, ev.info, KT.x, KT.x + KT.w, KT.y0, step, KT.leafY);
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5, 0, 1);
    drawTreeEdges(ev.tree, null);
    ev.info.leaves.forEach((lf) => {
      const ph = AP[lf.leaf[0]], w = KT.w / ev.info.leaves.length - 6, r = { x: lf.x - w / 2, y: KT.leafY, w, h: L(40, 52) };
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.strokeStyle = ph.col; ctx.lineWidth = 2.2; ctx.stroke();
      if (!PHONE) T(lf.x, r.y + 17, ph.n, fitText(ph.n, w - 6, 13, 800, 12), ph.col, 'center', 800); else { T(lf.x, r.y + 18, ph.s, 13, ph.col, 'center', 800); T(lf.x, r.y + 34, '동물', 12.5, ph.col, 'center', 700); }
      T(lf.x, r.y + r.h - 8, lf.depth + '번', 13, '#64748b', 'center', 800);
    });
    drawTreeNodes(ev.tree, null);
    ctx.restore();
    const ry = L(380, 360);
    panel(L(20, 8), ry, VW - L(40, 16), VH - ry - 12, 14);
    const x0 = L(40, 24), ok = ev.info.maxQ <= 4;
    T(x0, ry + 34, '📏 가장 긴 경로: ' + ev.info.maxQ + '번 질문', L(18, 16), ok ? '#0b6b39' : '#b91c1c', 'left', 800);
    T(x0, ry + 66, '📊 동물 13마리의 평균 질문 수: ' + (Math.round(ev.info.avgQ * 100) / 100).toFixed(2) + '번', L(16, 14.5), '#1b2333', 'left', 800);
    T(x0, ry + 96, '🌿 나뉜 문: 9개 (같은 문끼리 모여요)', L(15, 14), '#475569', 'left', 700);
    textBlock(x0, ry + 126, VW - L(80, 48), ok ? '가장 긴 경로가 4번으로 가장 짧은 검색표예요. 먼저 많은 문을 한꺼번에 가르는 질문이 효율적이에요.' : '한 번에 갈라내는 문이 적은 질문을 앞에 두면 뒤의 질문이 길어져요. 더 효율적인 첫 질문이 있을까요?', L(15, 14), '#475569', 21, 700);
  }

  /* ---------- 4단계: 사례 분류 ---------- */
  const CASES = [
    { n: '오징어', ph: 4, clue: '다리가 열 개나 있어요.', tip: '다리의 수가 아니라 몸이 부드럽고 외투막이 있는지 살펴봐요.', why: '다리가 많지만 부드러운 몸과 외투막이 있는 연체동물이에요.' },
    { n: '불가사리', ph: 7, clue: '몸이 별 모양으로 사방으로 퍼져 있어요.', tip: '방사 대칭이라고 모두 자포동물은 아니에요. 피부의 가시와 수관계, 진체강을 떠올려요.', why: '성체가 방사 대칭이어도 진체강, 피부의 가시와 수관계가 있는 극피동물이에요.' },
    { n: '상어', ph: 8, clue: '물속에서 아가미로 숨 쉬는 큰 물고기예요.', tip: '척삭(척추)이 있는지 생각해 봐요.', why: '상어는 어류로 척삭동물문이에요.' },
    { n: '고래', ph: 8, clue: '물속에 살지만 허파로 숨 쉬고 젖을 먹여 새끼를 키워요.', tip: '물에 사는 것과 문은 관계가 없어요. 척삭이 있는지 생각해 봐요.', why: '고래는 어류가 아니라 포유류이지만 상어와 같은 척삭동물문이에요.' },
    { n: '거미', ph: 6, clue: '다리가 여덟 개이고 몸이 머리가슴과 배로 나뉘어요.', tip: '곤충이 아니어도 키틴질 외골격과 마디가 있는 다리가 있어요.', why: '곤충이 아니어도 외골격과 마디가 있는 다리를 가진 절지동물이에요.' },
    { n: '지네', ph: 6, clue: '몸이 마디로 나뉘고 마디마다 다리가 달려 있어요.', tip: '체절이 있어도 지렁이와 달리 단단한 외골격과 마디가 있는 다리가 있어요.', why: '체절에 단단한 외골격과 마디가 있는 다리가 있는 절지동물이에요.' },
    { n: '산호', ph: 1, clue: '식물처럼 한곳에 붙어 살지만 촉수로 먹이를 잡아요.', tip: '촉수에 자포 세포가 있고 입과 항문의 구분이 없어요.', why: '촉수에 자포 세포가 있는 자포동물이에요.' },
    { n: '해파리', ph: 1, clue: '몸이 투명하고 우산 모양으로 물에 떠다녀요.', tip: '해파리와 말미잘은 같은 무리예요. 입과 항문의 구분이 없는 방사 대칭 동물이에요.', why: '방사 대칭에 자포 세포가 있는 자포동물이에요.' },
  ];
  function resetCase() { S.cs = { sel: 0, pick: CASES.map(() => null), bad: CASES.map(() => false), pop: CASES.map(() => 1) }; }
  const CASEG = (i) => (PHONE ? { x: 10 + (i % 2) * 232, y: 44 + Math.floor(i / 2) * 114, w: 226, h: 108 } : { x: 20 + (i % 4) * 192, y: 46 + Math.floor(i / 4) * 178, w: 184, h: 170 });
  function pickCase(i) { S.cs.sel = i; Sound.click(); updateCtl(); }
  function setCasePh(v) { const c = S.cs; c.pick[c.sel] = v; c.bad[c.sel] = false; c.pop[c.sel] = 0.6; SciSim.tween(c.pop, { [c.sel]: 1 }, { duration: 0.4, ease: 'outBack' }); Sound.click(); updateCtl(); }
  function drawCase(dt, t) {
    const c = S.cs;
    bgFill('#eaf3f9', '#f2f7fb');
    CASES.forEach((cs, i) => {
      const g = CASEG(i), sel = c.sel === i, pop = c.pop[i], pk = c.pick[i];
      ctx.save(); ctx.translate(g.x + g.w / 2, g.y + g.h / 2); ctx.scale(pop, pop); ctx.translate(-g.w / 2, -g.h / 2);
      D.shadow(() => { D.roundRect(0, 0, g.w, g.h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: sel ? 12 : 5, y: sel ? 4 : 2 });
      D.roundRect(0, 0, g.w, g.h, 14); ctx.strokeStyle = c.bad[i] ? '#dc2626' : sel ? '#2563a8' : pk != null ? AP[pk].col : '#d3dde6'; ctx.lineWidth = sel || c.bad[i] ? 3.5 : 2; ctx.stroke();
      if (!PHONE) {
        animalIcon(cs.n, g.w / 2, 42, 52, t);
        T(g.w / 2, 90, cs.n, 18, '#1b2333', 'center', 800);
        textBlock(10, 112, g.w - 20, cs.clue, 13, '#475569', 16, 700);
        if (pk != null) chip(g.w / 2, g.h - 16, AP[pk].n, { align: 'center', size: 13, bg: AP[pk].col, color: '#fff', pad: 9, h: 24 });
        else T(g.w / 2, g.h - 12, '문을 골라요', 13, '#94a3b8', 'center', 700);
      } else {
        animalIcon(cs.n, 34, 34, 44, t);
        T(70, 28, cs.n, 17, '#1b2333', 'left', 800);
        textBlock(70, 48, g.w - 80, cs.clue, 13, '#475569', 16, 700);
        if (pk != null) chip(g.w / 2, g.h - 13, AP[pk].n, { align: 'center', size: 13, bg: AP[pk].col, color: '#fff', pad: 9, h: 22 }); else T(g.w / 2, g.h - 9, '문을 골라요', 13, '#94a3b8', 'center', 700);
      }
      ctx.restore();
    });
    const iy = PHONE ? 44 + 4 * 114 + 6 : 46 + 2 * 178 + 6;
    panel(L(20, 10), iy, VW - L(40, 20), VH - iy - 10, 14, '#fff');
    const cs = CASES[c.sel];
    T(L(40, 22), iy + 28, '🔎 ' + cs.n + ': ' + cs.clue, fitText('🔎 ' + cs.n + ': ' + cs.clue, VW - L(80, 44), L(15, 14), 800, 12.5), '#0f3a5a', 'left', 800);
    textBlock(L(40, 22), iy + 56, VW - L(80, 44), '힌트가 필요하면 미션의 💡 힌트를 눌러요. 조작 패널에서 소속 문을 골라요.', L(14.5, 13.5), '#64748b', 20, 700);
  }
  function caseDown(p) {
    for (let i = 0; i < CASES.length; i++) if (inRect(p, CASEG(i))) { pickCase(i); return false; }
    return false;
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_LABEL = { sym: '⚖️ 대칭: 거울상 찾기', coel: '🔪 체강: 몸의 단면', gut: '🍽️ 소화관: 먹이의 길', tbl: '📊 9개 문 비교표', key: '🔑 이분 검색표', build: '🛠️ 검색표 만들기', case: '🧩 헷갈리는 사례 분류' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  const PH_OPTS = '<option value="">— 문 고르기 —</option>' + AP.map((p, i) => '<option value="' + i + '">' + p.n + '</option>').join('');
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    const q = S.sy;
    if (q) {
      $('#syName').textContent = '⚖️ ' + SPEC[q.i].n + ' (' + (q.i + 1) + ' / ' + SPEC.length + ')';
      $('#oAng').textContent = Math.round(q.ang) + '°'; $('#sAng').value = q.ang; $('#sAng').style.setProperty('--pct', (q.ang / 180 * 100) + '%');
      $$('#symCls button').forEach((b) => { b.classList.toggle('ok', q.cls[q.i] === +b.dataset.c); b.disabled = q.cls[q.i] != null && q.cls[q.i] !== +b.dataset.c; });
      $('#syNote').innerHTML = '판정한 표본 <b>' + symDone() + ' / 5</b> · 칼을 돌려 <b>거울상이 겹치는</b> 방향을 찾아요.';
    }
    const c = S.ce;
    if (c) { ['A', 'B', 'C'].forEach((l, k) => { const s = $('#selCe' + l); s.value = c.pick[k] == null ? '' : String(c.pick[k]); s.classList.toggle('bad', c.bad[k]); }); $('#bCeColor').textContent = c.color ? '🎨 배엽 색 끄기' : '🎨 배엽 색 보기'; $('#ceNote').innerHTML = '고른 단면 <b>' + c.pick.filter((x) => x != null).length + ' / 3</b>'; }
    const g = S.gu;
    if (g) $('#guNote').innerHTML = '먹이를 준 횟수 <b>' + g.fedN + '번</b> · 찌꺼기가 나간 동물 <b>' + g.exited.filter((n) => n > 0).length + ' / 3</b>';
    const B = S.tb;
    if (B) {
      $('#tbName').textContent = '📊 ' + AP[B.sel].n;
      $$('#tbSegs [data-col]').forEach((seg) => { const ci = +seg.dataset.col; $$('button', seg).forEach((b) => b.classList.toggle('on', B.v[B.sel][ci] === +b.dataset.v)); });
      $('#tbNote').innerHTML = '채운 칸 <b>' + tblFilled() + ' / 36</b> · 맞은 칸 <b>' + tblRight() + ' / 36</b>';
    }
    const K = S.ky;
    if (K) {
      const can = !!(K.cur && !K.cur.busy);
      $('#bYes').disabled = !can; $('#bNo').disabled = !can;
      $('#keyNote').innerHTML = K.cur ? '<b>' + AN[K.cur.i].n + '</b> · 질문: ' + QA[K.cur.node.k].q : keyDoneN() === NAN ? '🎉 모두 분류했어요. 처음부터 다시 해 볼 수 있어요.' : '캔버스 아래 동물 카드를 눌러 시작해요.';
    }
    if (S.bd) { $$('#bdGrid button').forEach((b) => { const o = +b.dataset.o; b.classList.toggle('on', S.bd.opt === o); b.classList.toggle('ok', !!S.bd.seen[o] && S.bd.opt !== o); }); $('#bdNote').innerHTML = '살펴본 첫 질문 <b>' + Object.keys(S.bd.seen).length + ' / 7</b> · 가장 긴 경로가 가장 짧은 검색표를 찾아요.'; }
    const cs = S.cs;
    if (cs) { $('#csName').textContent = '🧩 ' + CASES[cs.sel].n + '의 소속 문'; $('#selCase').value = cs.pick[cs.sel] == null ? '' : String(cs.pick[cs.sel]); $('#csNote').innerHTML = '문을 고른 카드 <b>' + cs.pick.filter((x) => x != null).length + ' / 8</b>'; }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#syPrev').addEventListener('click', () => selSpec(S.sy.i - 1));
  $('#syNext').addEventListener('click', () => selSpec(S.sy.i + 1));
  $('#sAng').addEventListener('input', (e) => setSymAng(+e.target.value));
  $$('#symCls button').forEach((b) => b.addEventListener('click', () => classify(+b.dataset.c)));
  ['A', 'B', 'C'].forEach((l, k) => { const s = $('#selCe' + l); s.innerHTML = '<option value="">— 동물 고르기 —</option>' + SEC_ANIMAL.map((n, i) => '<option value="' + i + '">' + n + '</option>').join(''); s.addEventListener('change', () => { S.ce.pick[k] = s.value === '' ? null : +s.value; S.ce.bad[k] = false; S.ce.pop[k] = 0.9; SciSim.tween(S.ce.pop, { [k]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click(); updateCtl(); }); });
  $('#bCeColor').addEventListener('click', () => { S.ce.color = !S.ce.color; Sound.click(); updateCtl(); });
  $('#bFeed').addEventListener('click', feedAll);
  (function buildTbCtl() {
    const wrapEl = $('#tbSegs');
    TCOLS.forEach((c, ci) => {
      const h = document.createElement('div'); h.className = 'sub-h'; h.textContent = c.n; wrapEl.appendChild(h);
      const seg = document.createElement('div'); seg.className = 'segmented seg-full'; seg.dataset.col = ci; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', c.n + ' 고르기');
      c.lab.forEach((lb, v) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = lb; b.addEventListener('click', () => setTb(S.tb.sel, ci, v)); seg.appendChild(b); });
      wrapEl.appendChild(seg);
    });
    const eg = $('#bdGrid'); FIRSTQ.forEach((k, o) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.o = o; b.textContent = QA[k].s.replace('?', ''); b.addEventListener('click', () => setBuild(o)); eg.appendChild(b); });
    $('#selCase').innerHTML = PH_OPTS;
  })();
  $('#bTbClear').addEventListener('click', () => { Sound.click(); const s = S.tb.sel; resetTbl(); S.tb.sel = s; updateCtl(); });
  $('#bYes').addEventListener('click', () => keyAnswer(true));
  $('#bNo').addEventListener('click', () => keyAnswer(false));
  $('#bKeyReset').addEventListener('click', () => { Sound.click(); resetKey(); hideHint(); updateCtl(); });
  $('#selCase').addEventListener('change', (e) => { if (e.target.value !== '') setCasePh(+e.target.value); });

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'sym') return symDown(p); if (S.mode === 'tbl') return tblDown(p); if (S.mode === 'key') return keyDown(p); if (S.mode === 'case') return caseDown(p); return false; },
    hover(p) {
      if (S.mode === 'tbl' || S.mode === 'case') return 'pointer';
      if (S.mode === 'key') return KTRAY.some((r) => inRect(p, r)) || inRect(p, KQ.yes) || inRect(p, KQ.no) ? 'pointer' : 'default';
      return 'default';
    },
  });
  let rlast = '';
  function readouts() {
    let a1, a2, a3, b1, b2, b3; const m = S.mode;
    if (m === 'sym') { const sp = SPEC[S.sy.i]; a1 = '표본'; b1 = sp.n; a2 = '찾은 거울상 방향'; b2 = Object.keys(S.sy.found[S.sy.i]).length + '개'; a3 = '판정한 표본'; b3 = symDone() + ' / 5'; }
    else if (m === 'coel') { a1 = '고른 단면'; b1 = S.ce.pick.filter((x) => x != null).length + ' / 3'; a2 = '배엽 색'; b2 = S.ce.color ? '보는 중' : '끔'; a3 = '체강'; b3 = '몸속 빈 공간'; }
    else if (m === 'gut') { a1 = '먹이를 준 횟수'; b1 = S.gu.fedN + '번'; a2 = '입으로 나간 찌꺼기'; b2 = (S.gu.exited[0] + S.gu.exited[1]) + '개'; a3 = '항문으로 나간 찌꺼기'; b3 = S.gu.exited[2] + '개'; }
    else if (m === 'tbl') { a1 = '채운 칸'; b1 = tblFilled() + ' / 36'; a2 = '맞은 칸'; b2 = tblRight() + ' / 36'; a3 = '선택한 문'; b3 = AP[S.tb.sel].s; }
    else if (m === 'key') { a1 = '분류한 동물'; b1 = keyDoneN() + ' / 13'; a2 = '틀린 답'; b2 = S.ky.miss + '번'; a3 = '검색표 질문'; b3 = '8개'; }
    else if (m === 'build') { const ev = FIRST_EVAL[S.bd.opt]; a1 = '첫 질문'; b1 = QA[ev.k].s; a2 = '가장 긴 경로'; b2 = ev.info.maxQ + '번 질문'; a3 = '평균 질문 수'; b3 = (Math.round(ev.info.avgQ * 100) / 100).toFixed(2) + '번'; }
    else { a1 = '선택한 카드'; b1 = CASES[S.cs.sel].n; a2 = '문을 고른 카드'; b2 = S.cs.pick.filter((x) => x != null).length + ' / 8'; a3 = '맞게 분류'; b3 = S.cs.pick.filter((x, i) => x === CASES[i].ph).length + ' / 8'; }
    const kS = [a1, b1, a2, b2, a3, b3].join('|');
    if (kS === rlast) return; rlast = kS;
    l1.textContent = a1; v1.textContent = b1; l2.textContent = a2; v2.textContent = b2; l3.textContent = a3; v3.textContent = b3;
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '동물의 몸 관찰', short: '동물의 몸', icon: '🐙', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 해파리, 지렁이, 오징어, 사람 같은 다양한 동물을 몇 가지 몸의 특징으로 정리할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교 \'생물의 분류\'와 앞 차시에서</b> 동물이 동물계에 속한다는 것을 배웠어요. 이번에는 동물계를 <b>문(門) 수준</b>에서 나눠요.</div>' +
        '<p>동물의 몸을 세 가지 관점으로 살펴봐요. ① <b>대칭</b>(자르는 방향에 따른 거울상) ② <b>체강</b>(몸속 빈 공간) ③ <b>소화관</b>(입만 있는가, 입과 항문이 있는가).</p>',
      features: ['sym', 'coel', 'gut'],
      setup() { resetSym(); resetCoel(); resetGut(); setMode('sym'); },
      recap: '동물의 몸은 대칭(비대칭 · 방사 · 좌우), 체강(없음 · 가체강 · 진체강), 소화관(입만 · 입과 항문)으로 비교할 수 있어요.',
      summary: '<ul><li><b>대칭</b>: 비대칭(해면), 방사 대칭(해파리, 불가사리 성체: 중심을 지나는 여러 방향에서 거울상), 좌우 대칭(지렁이, 가재, 사람: 한 방향에서만 거울상).</li><li><b>체강</b>: 소화관과 체벽 사이의 빈 공간. 없음(플라나리아), <b>가체강</b>(회충: 중배엽이 소화관 쪽을 덮지 않음), <b>진체강</b>(지렁이: 체강 둘레가 모두 중배엽).</li><li><b>배엽</b>: 자포동물은 외배엽과 내배엽 2개 층, 그 밖의 동물 문(해면 제외)은 중배엽이 더해진 3개 층이에요.</li><li><b>소화관</b>: 입만 있는 동물(자포동물, 편형동물)은 같은 구멍으로 찌꺼기가 나가고, 입과 항문이 있는 동물은 먹이가 한 방향으로 이동해요.</li></ul>',
      missions: [
        {
          title: '대칭 판정하기', goal: '표본 5종의 자르는 방향을 돌려 거울상이 겹치는 방향을 찾고 대칭의 종류를 판정해요.',
          check: () => symDone() === 5, hold: 0.4,
          status: () => '⚖️ ' + SPEC.map((s, i) => mark(S.sy.cls[i] != null) + s.n).join(' '),
          hint: '거울상이 겹치는 방향이 한 곳뿐이면 좌우 대칭, 여러 곳이면 방사 대칭, 하나도 없으면 비대칭이에요.',
          setup() { setMode('sym'); },
          explain: '<b>좌우 대칭</b>은 몸의 가운데를 지나는 한 방향에서만 거울상이 되고, <b>방사 대칭</b>은 중심을 지나는 여러 방향에서 거울상이 돼요. 해면은 어떤 방향으로 잘라도 거울상이 되지 않는 <b>비대칭</b>이에요.',
        },
        {
          title: '체강 단면 맞추기', goal: '단면 A, B, C가 플라나리아, 회충, 지렁이 중 어느 동물의 것인지 골라 확인해요.', manual: true,
          hint: '체강이 있는지, 있다면 소화관을 감싸는 중배엽(주황색 층)이 체강 안쪽에도 있는지 살펴봐요.',
          setup() { setMode('coel'); },
          check() {
            const c = S.ce; c.bad.fill(false);
            if (c.pick.some((x) => x == null)) return '세 단면에 모두 동물을 골라 주세요.';
            const w = []; c.pick.forEach((x, k) => { if (x !== SEC_ORDER[k]) { c.bad[k] = true; w.push(k); } });
            if (w.length) return '단면 ' + 'ABC'[w[0]] + '를 다시 살펴봐요. 체강이 없는지, 체강 둘레가 중배엽으로 완전히 둘러싸여 있는지 확인해요. (틀린 단면 ' + w.length + '개)';
            return true;
          },
          explain: '<b>플라나리아</b>는 체강이 없어 중배엽 조직이 속을 채워요. <b>회충</b>은 체강이 있지만 소화관 쪽에는 중배엽이 없는 <b>가체강</b>이에요. <b>지렁이</b>는 체강의 안쪽과 바깥쪽이 모두 중배엽으로 둘러싸인 <b>진체강</b>이에요.',
        },
        {
          title: '먹이의 길 따라가기', goal: '먹이를 주고 말미잘 · 플라나리아 · 지렁이의 소화관에서 찌꺼기가 어디로 나가는지 관찰해요.',
          check: () => S.gu.exited.every((n) => n > 0), hold: 0.3,
          status: () => '🍽️ ' + GUTS.map((g, k) => mark(S.gu.exited[k] > 0) + g.n + '(' + (g.kind === 'tube' ? '항문' : '입') + ')').join(' '),
          hint: '🍽️ 먹이 주기 버튼을 눌러요. 먹이가 움직여서 찌꺼기가 나갈 때까지 기다려요.',
          setup() { setMode('gut'); },
          explain: '입만 있는 동물은 <b>한 구멍</b>으로 먹이가 들어오고 찌꺼기도 같은 구멍으로 나가요. 입과 항문이 있는 동물은 먹이가 <b>한 방향</b>으로 지나가며 소화되고 항문으로 나가요.',
        },
        {
          type: 'quiz', title: '방사 대칭 동물의 특징은?', goal: '불가사리와 해파리 같은 방사 대칭 동물에 대한 설명으로 옳은 것은?',
          setup() { setMode('sym'); },
          choices: ['몸의 중심을 지나는 여러 방향으로 잘라도 거울상이 된다', '단 한 방향으로만 자르면 거울상이 된다', '어떤 방향으로 잘라도 거울상이 되지 않는다', '머리와 꼬리가 뚜렷하게 구분된다'],
          answer: 0,
          feedback: ['', '한 방향에서만 거울상이 되는 것은 좌우 대칭이에요.', '거울상이 되는 방향이 없는 것은 비대칭이에요.', '머리와 꼬리의 구분은 좌우 대칭 동물에서 뚜렷해요.'],
          explain: '방사 대칭 동물은 몸의 중심에서 사방으로 퍼진 모양이라 <b>중심을 지나는 여러 방향</b>에서 거울상이 돼요. 이런 동물은 앞뒤 구분이 뚜렷하지 않아요.',
        },
      ],
    },
    {
      title: '9개 문 비교', short: '9개 문 비교', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대칭, 체강, 소화관을 관찰했어요. 이번에는 <b>체절</b>과 <b>키틴 외골격</b>을 더해 동물 9개 문의 특징을 비교표로 정리해요.</div>' +
        '<p>문마다 대표 동물과 설명이 있어요. 설명을 읽고 표의 칸(대칭 · 체강 · 체절 · 키틴 외골격)을 채워 보세요.</p>',
      features: ['tbl'],
      setup() { resetTbl(); setMode('tbl'); },
      recap: '9개 문은 대칭, 체강, 체절, 외골격 같은 형질의 조합으로 구분할 수 있어요.',
      summary: '<table class="mini"><tr><th>문</th><th>대칭</th><th>체강</th><th>체절</th><th>외골격</th></tr>' + AP.map((p) => '<tr><td>' + p.n.replace('동물문', '') + '</td><td>' + ['비대칭', '방사', '좌우'][p.sym] + '</td><td>' + ['없음', '가체강', '진체강'][p.coel] + '</td><td>' + (p.seg ? 'O' : 'X') + '</td><td>' + (p.exo ? 'O' : 'X') + '</td></tr>').join('') + '</table><ul><li>극피동물은 성체가 방사 대칭이지만 유생은 좌우 대칭이에요.</li><li>척삭동물은 발생 중 등 쪽에 <b>척삭</b>이 생겨요(표에는 없는 형질).</li><li>이 표의 체절은 몸 겉에 뚜렷이 반복되는 마디만 표시했어요. 척삭동물도 척추뼈 · 근육이 마디 구조를 이루지만 겉으로 뚜렷한 체절은 아니라서 X로 두었어요.</li></ul>',
      missions: [
        {
          title: '9개 문 비교표 채우기', goal: '문마다 설명을 읽고 대칭, 체강, 체절, 키틴 외골격 칸을 모두 채운 뒤 확인해요.', manual: true,
          hint: '칸을 누를 때마다 값이 바뀌어요. 조작 패널의 버튼으로도 고를 수 있어요. 체강은 중배엽이 체강을 얼마나 둘러싸는지가 기준이에요.',
          setup() { setMode('tbl'); },
          check() {
            const B = S.tb, miss = 36 - tblFilled(); B.bad.forEach((r) => r.fill(false));
            if (miss) return '아직 비어 있는 칸이 ' + miss + '개 있어요. 문마다 설명을 읽고 채워요.';
            let n = 0, first = -1; B.v.forEach((r, i) => r.forEach((x, c) => { if (x !== tblAns(i, c)) { B.bad[i][c] = true; n++; if (first < 0) first = i; } }));
            if (n) return '빨간 칸 ' + n + '개를 다시 살펴봐요. 예를 들어 ' + AP[first].n + '의 설명을 다시 읽어 보세요.';
            return true;
          },
          explain: '겉으로 뚜렷한 체절은 환형동물과 절지동물에서 볼 수 있어요(척삭동물의 척추뼈 · 근육 마디는 이 표에서 제외). 키틴질 외골격은 <b>절지동물</b>만 가져요. 연체동물의 껍데기와 척삭동물의 뼈는 키틴 외골격이 아니에요.',
        },
        {
          type: 'quiz', title: '체절이 있고 진체강인 문은?', goal: '비교표에서 체절이 있고 진체강인 문을 골라요.',
          setup() { setMode('tbl'); },
          choices: ['환형동물문과 절지동물문', '연체동물문과 환형동물문', '선형동물문과 절지동물문', '환형동물문과 척삭동물문'],
          answer: 0,
          feedback: ['', '연체동물은 몸이 마디로 나뉘지 않아요.', '선형동물은 체절이 없고 체강은 가체강이에요.', '척삭동물은 몸의 겉마디(체절)가 뚜렷하지 않아요.'],
          explain: '체절이 있고 진체강인 문은 <b>환형동물문(지렁이)</b>과 <b>절지동물문(가재, 곤충)</b>이에요. 둘의 차이는 키틴질 외골격과 마디가 있는 다리예요.',
        },
      ],
    },
    {
      title: '이분 검색표', short: '검색표', icon: '🔑', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 9개 문의 형질을 표로 정리했어요. 이 형질을 질문으로 바꾸어 <b>이분 검색표</b>를 따라가고, 질문 순서가 검색표의 길이를 어떻게 바꾸는지 비교해요.</div>' +
        '<p>동물 카드 13장을 검색표에 따라 문으로 분류해요. 그다음 첫 질문을 바꿔 검색표를 직접 만들어 봐요.</p>',
      features: ['key', 'build'],
      setup() { resetKey(); resetBuild(); setMode('key'); },
      recap: '검색표는 형질의 유무를 차례로 물어 문을 찾아요. 한 번에 여러 문을 갈라내는 질문을 앞에 두면 경로가 짧아져요.',
      summary: '<ul><li><b>이분 검색표</b>: 예 / 아니오로 답하며 동물을 문으로 분류해요.</li><li>이 검색표의 질문: 좌우 대칭 → 방사 대칭 → 체강 → 진체강 → 체절 → 외골격 → 척삭 (한 동물이 거치는 질문은 최대 5번).</li><li>질문 순서가 달라도 9개 문으로 나뉘지만, <b>진체강인가?</b>를 먼저 물으면 가장 긴 경로가 4번으로 짧아져요.</li></ul>',
      missions: [
        {
          title: '검색표로 13마리 분류하기', goal: '동물 카드를 눌러 질문에 예 / 아니오로 답하며 알맞은 문에 모두 넣어요.',
          check: () => keyDoneN() === NAN, hold: 0.4,
          status: () => '🔑 분류한 동물 ' + keyDoneN() + ' / 13 · 틀린 답 ' + S.ky.miss + '번',
          hint: '질문을 읽고 그 동물에 해당하는지 생각해요. 틀리면 이유를 알려 줘요.',
          setup() { setMode('key'); },
          explain: '검색표는 한 번에 한 가지 <b>형질의 유무</b>를 물어 가능성을 줄여 가요. 다른 모양의 동물이라도 같은 문이면 같은 잎(문)에 모여요. 달팽이와 오징어는 모양이 달라도 연체동물문이에요.',
        },
        {
          title: '더 짧은 검색표 만들기', goal: '첫 번째 질문을 바꿔 가며 7가지를 살펴보고, 가장 긴 경로가 4번 질문 이하인 검색표의 첫 질문을 골라 확인해요.', manual: true,
          hint: '한 번에 여러 문을 한쪽으로 몰아 주는 질문이 좋아요. 진체강인 문이 몇 개인지 세어 봐요.',
          setup() { setMode('build'); },
          check() {
            const seen = Object.keys(S.bd.seen).length;
            if (seen < 4) return '첫 질문을 4가지 이상 살펴본 뒤에 골라요. (지금 ' + seen + '가지)';
            const ev = FIRST_EVAL[S.bd.opt];
            if (ev.info.maxQ > 4) return '이 검색표는 가장 긴 경로가 ' + ev.info.maxQ + '번 질문이에요. 더 짧은 검색표가 있어요.';
            return true;
          },
          explain: '<b>진체강인가?</b>를 먼저 물으면 진체강 문 5개와 나머지 4개가 한 번에 나뉘어, 가장 긴 경로가 4번이 돼요. 질문 순서에 따라 같은 9개 문을 가르는 데 필요한 질문 수가 달라져요.',
        },
        {
          type: 'quiz', title: '달팽이와 사람을 가르는 질문은?', goal: '달팽이(연체동물문)와 사람(척삭동물문)은 둘 다 좌우 대칭, 진체강, 체절 없음이에요. 검색표에서 둘을 가르는 질문은?',
          setup() { setMode('key'); },
          choices: ['체절이 있나요?', '키틴질 외골격이 있나요?', '척삭이 있나요?', '좌우 대칭인가요?'],
          answer: 2,
          feedback: ['둘 다 체절이 없어서 이 질문으로는 가를 수 없어요.', '둘 다 키틴질 외골격이 없어요.', '', '둘 다 좌우 대칭이에요.'],
          explain: '두 동물이 같은 답을 하는 질문으로는 구분할 수 없어요. <b>척삭</b>은 척삭동물문만 가진 형질이라 둘을 가르는 질문이 돼요.',
        },
      ],
    },
    {
      title: '헷갈리는 사례 분류', short: '사례 분류', icon: '🧩', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 검색표로 동물을 분류했어요. 겉모습만 보면 헷갈리는 동물 8종을 <b>형질</b>을 근거로 문에 넣어 봐요.</div>' +
        '<p>카드를 누르고 조작 패널에서 소속 문을 골라요. 다리 수, 사는 곳, 모양이 아니라 <b>문을 나누는 형질</b>로 판단해요.</p>',
      features: ['case'],
      setup() { resetCase(); setMode('case'); },
      recap: '문은 겉모습이나 사는 곳이 아니라 대칭, 체강, 체절, 외골격, 척삭 같은 형질로 정해요.',
      summary: '<ul><li>오징어: 다리가 많지만 부드러운 몸과 외투막 → <b>연체동물문</b></li><li>불가사리: 성체가 방사 대칭이지만 가시와 수관계, 진체강 → <b>극피동물문</b></li><li>상어(어류), 고래(포유류): 물에 살아도 척삭이 있어 모두 <b>척삭동물문</b></li><li>거미, 지네: 곤충이 아니어도 외골격과 마디 다리 → <b>절지동물문</b></li><li>해파리, 산호: 촉수의 자포 세포 → <b>자포동물문</b></li></ul>',
      missions: [
        {
          title: '사례 8종 분류하기', goal: '카드 8장의 소속 문을 모두 고른 뒤 확인해요.', manual: true,
          hint: '카드를 눌러 설명을 읽고 문을 골라요. 틀리면 형질 힌트를 알려 줘요.',
          setup() { setMode('case'); },
          check() {
            const c = S.cs; c.bad.fill(false);
            const miss = c.pick.filter((x) => x == null).length;
            if (miss) return '아직 문을 고르지 않은 카드가 ' + miss + '장 있어요.';
            const w = []; c.pick.forEach((x, i) => { if (x !== CASES[i].ph) { c.bad[i] = true; w.push(i); } });
            if (w.length) return '빨간 카드 ' + w.length + '장을 다시 생각해 봐요. ' + withJosa(CASES[w[0]].n, '은/는') + ' 이렇게 생각해 보세요: ' + CASES[w[0]].tip;
            return true;
          },
          explain: CASES.map((c) => '<b>' + c.n + '</b>: ' + c.why).join('<br>'),
        },
        {
          type: 'quiz', title: '옳은 설명은?', goal: '동물 분류에 대한 설명으로 옳은 것을 골라요.',
          setup() { setMode('case'); },
          choices: ['물에 사는 동물은 모두 어류이므로 같은 문이다', '다리가 많은 동물은 모두 같은 문이다', '곤충은 절지동물문에 속하는 한 무리이고, 절지동물에는 거미와 가재도 포함된다', '방사 대칭 동물은 모두 자포동물문이다'],
          answer: 2,
          feedback: ['고래는 물에 살지만 포유류이고, 어류와 포유류는 모두 척삭동물문이에요. 사는 곳은 분류 기준이 아니에요.', '오징어(연체동물문)와 지네(절지동물문)는 다리가 많아도 다른 문이에요.', '', '불가사리는 성체가 방사 대칭이지만 극피동물문이에요.'],
          explain: '<b>곤충은 절지동물문의 일부</b>일 뿐이에요. 절지동물은 키틴질 외골격과 마디가 있는 다리를 가진 무리라 거미, 가재, 지네도 포함돼요. 문은 겉모습이나 사는 곳이 아니라 형질로 정해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-animal-phyla', mount: '#game', badge: '동물 분류 탐험가', homeHref: '../../index.html#hb',
    featureLabels: { sym: '⚖️ 대칭 거울상 찾기', coel: '🔪 체강 단면 모형', gut: '🍽️ 소화관 먹이 흐름', tbl: '📊 9개 문 비교표', key: '🔑 이분 검색표', build: '🛠️ 검색표 첫 질문 비교', case: '🧩 헷갈리는 사례 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetSym(); resetCoel(); resetGut(); resetTbl(); resetKey(); resetBuild(); resetCase();
  setMode('sym');
  let lastFree = false, lastMode = '', lastLv = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && (game.free !== lastFree || game.level !== lastLv)) { lastFree = game.free; lastLv = game.level; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepGut(dt);
    switch (S.mode) {
      case 'sym': drawSym(dt, t); break;
      case 'coel': drawCoel(dt, t); break;
      case 'gut': drawGut(dt, t); break;
      case 'tbl': drawTbl(dt, t); break;
      case 'key': drawKey(dt, t); break;
      case 'build': drawBuild(dt, t); break;
      default: drawCase(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,245,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, AP, AN, SPEC, CASES, KTRAY, KQ, FIRST_EVAL, INFO_NAT, TREE_NAT, QA, SEC_ORDER, SEC_ANIMAL, TCOLS, tblAns, tbCell, setSymAng, selSpec, classify, setTb, setBuild, pickAnimal, keyAnswer, feedAll, pickCase, setCasePh, GUTS, gutPts, symAxisHit, KT, CASEG, SYC,
    symDiff(i, angDeg) {
      const sc = view.scale * view.dpr, W = view.canvas.width, H = view.canvas.height;
      const grab = (refl) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); view.apply(); ctx.save(); ctx.translate(VW / 2, VH / 2); if (refl) { const a = angDeg * Math.PI / 180; ctx.rotate(a); ctx.scale(1, -1); ctx.rotate(-a); } ctx.scale(1.2, 1.2); drawSpec(i, 0); ctx.restore(); return ctx.getImageData(0, 0, W, H).data; };
      const A = grab(false), B = grab(true); let diff = 0, tot = 0;
      for (let k = 0; k < A.length; k += 4) { const a = A[k] < 250 || A[k + 1] < 250 || A[k + 2] < 250, b = B[k] < 250 || B[k + 1] < 250 || B[k + 2] < 250; if (a || b) { tot++; if (a !== b) diff++; } }
      return diff / Math.max(1, tot);
    },
    fillTb() { S.tb.v = AP.map((p, i) => TCOLS.map((c, ci) => tblAns(i, ci))); S.tb.bad.forEach((r) => r.fill(false)); updateCtl(); },
  };
})();
