/* =========================================================
   고등학교 생명과학 Ⅲ. 생명의 연속성과 다양성 - 계통수 만들기 (단원 39, 9차시)
   성취기준 [12생과03-05] 동물과 식물 분류군의 특징을 문 수준에서 이해하고, 생물의 유연관계를 계통수로 나타낼 수 있다. (계통수 부분)
   ① 관찰: 형질 행렬과 포함 관계  ② 모형: 계통수 그리기  ③ 분석: 분자 계통수  ④ 적용: 분류 프로그래밍
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const BGCOL = '#f1f6ec';
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
     자료: 형질 행렬, 분자(염기 서열 차이) 자료, 분류 프로그래밍 자료
     ========================================================= */
  const SP5 = ['칠성장어', '연어', '개구리', '도마뱀', '고양이'];
  const SP5_ICON = ['🐍', '🐟', '🐸', '🦎', '🐱'];
  const TR4 = ['턱', '네 다리', '양막', '털·젖'];
  const M5 = [[0, 0, 0, 0], [1, 0, 0, 0], [1, 1, 0, 0], [1, 1, 1, 0], [1, 1, 1, 1]];
  const TRCOL = ['#2563a8', '#0f9d8a', '#b4690e', '#d6336c'];
  const SPCOL = ['#64748b', '#2a9d8f', '#4b7f3a', '#b4690e', '#d6336c'];
  /* 형질 행렬에서 계통수 만들기: 가장 바깥(많은 종이 가진) 형질부터 가르기 */
  function treeFromMatrix(rows, M, ntr) {
    if (rows.length === 1) return { sp: rows[0] };
    let best = -1, bestN = 0;
    for (let t = 0; t < ntr; t++) { const have = rows.filter((r) => M[r][t]).length; if (have > 0 && have < rows.length && have > bestN) { best = t; bestN = have; } }
    if (best < 0) return { group: rows.slice() };
    const have = rows.filter((r) => M[r][best]), no = rows.filter((r) => !M[r][best]);
    return { trait: best, kids: [treeFromMatrix(no, M, ntr), treeFromMatrix(have, M, ntr)] };
  }
  const leavesOf = (n) => (n.sp != null ? [n.sp] : n.group ? n.group.slice() : n.kids.reduce((a, k) => a.concat(leavesOf(k)), []));
  const setKey = (a) => a.slice().sort((x, y) => x - y).join(',');
  /* 계통수 모양이 같은지 (가지의 좌우 순서는 무시) */
  const canon = (n) => (n.sp != null ? String(n.sp) : n.group ? '{' + n.group.slice().sort((a, b) => a - b).join(',') + '}' : '(' + n.kids.map(canon).sort().join('|') + ')');
  /* 모든 노드(잎 묶음 포함)의 잎 집합 */
  function cladeSets(n, out) { out = out || []; out.push(setKey(leavesOf(n))); if (n.kids) n.kids.forEach((k) => cladeSets(k, out)); return out; }
  const REF = treeFromMatrix([0, 1, 2, 3, 4], M5, 4);

  /* ---------- 분자 자료 (가상 염기 서열 차이 수) ---------- */
  const DSETS = {
    ae: { names: ['A', 'B', 'C', 'D', 'E'], full: ['A', 'B', 'C', 'D', 'E'], d: { '0-1': 2, '3-4': 4, '0-2': 6, '1-2': 6, '0-3': 8, '0-4': 8, '1-3': 8, '1-4': 8, '2-3': 8, '2-4': 8 }, title: '가상 종 A~E' },
    vt: { names: SP5.slice(), full: SP5.slice(), code: ['칠', '연', '개', '도', '고'], d: { '3-4': 2, '2-3': 4, '2-4': 4, '1-2': 6, '1-3': 6, '1-4': 6, '0-1': 8, '0-2': 8, '0-3': 8, '0-4': 8 }, title: '척추동물 5종' },
  };
  const dd = (set, a, b) => DSETS[set].d[Math.min(a, b) + '-' + Math.max(a, b)];
  /* 평균 연결법: 두 묶음 사이 차이 수 = 모든 쌍의 평균 */
  function clDist(set, A, B) { let s = 0, n = 0; A.forEach((a) => B.forEach((b) => { s += dd(set, a, b); n++; })); return s / n; }
  function newMol(set) {
    const nm = DSETS[set].names.length;
    return { set, cl: DSETS[set].names.map((n, i) => ({ id: i, mem: [i], node: { sp: i, h: 0 }, y: 0 })), joins: [], miss: 0, anim: 1, hl: null };
  }
  const molLabel = (set, c) => (c.mem.length === 1 ? DSETS[set].names[c.mem[0]] : DSETS[set].code ? c.mem.map((i) => DSETS[set].code[i]).join('+') : c.mem.map((i) => DSETS[set].names[i]).join(''));
  function molMin(M) {      // 현재 묶음들 중 가장 가까운 쌍
    let best = null;
    for (let i = 0; i < M.cl.length; i++) for (let j = i + 1; j < M.cl.length; j++) { const v = clDist(M.set, M.cl[i].mem, M.cl[j].mem); if (!best || v < best.v) best = { i, j, v }; }
    return best;
  }
  const molDone = (M) => M.cl.length === 1;
  const molTree = (M) => M.cl[0].node;
  /* 분자 계통수 모양(앞 단계 형질 계통수와 같은지 비교용): 종 번호로 구성 */
  const molCanon = (n) => (n.sp != null ? String(n.sp) : '(' + [molCanon(n.a), molCanon(n.b)].sort().join('|') + ')');

  /* ---------- 분류 프로그래밍 자료 ---------- */
  const PSETS = {
    plant: {
      title: '식물 8종', sp: ['우산이끼', '솔이끼', '고사리', '소나무', '은행나무', '벼', '민들레', '장미'],
      tr: ['관다발', '종자', '씨방'],
      M: [[0, 0, 0], [0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 0], [1, 1, 1], [1, 1, 1], [1, 1, 1]],
      init: [2, 1, 0], good: [[0, 1, 2]], noun: '식물',
    },
    animal: {
      title: '동물 9문', sp: ['해면동물', '자포동물', '편형동물', '선형동물', '연체동물', '환형동물', '절지동물', '극피동물', '척삭동물'],
      tr: ['조직', '3배엽', '후구', '탈피'],
      // 조직(진짜 조직), 3배엽(중배엽 있음), 후구(원구가 항문이 됨), 탈피(허물을 벗음)
      M: [[0, 0, 0, 0], [1, 0, 0, 0], [1, 1, 0, 0], [1, 1, 0, 1], [1, 1, 0, 0], [1, 1, 0, 0], [1, 1, 0, 1], [1, 1, 1, 0], [1, 1, 1, 0]],
      init: [2, 3, 1, 0], good: null, noun: '동물',
    },
  };
  /* 프로그램: 형질 순서대로 집단을 둘로 가르기 (집단을 가르지 못하는 형질은 건너뜀) */
  function runProgram(ps, order) {
    const P = PSETS[ps], steps = [];
    function rec(rows, ti, depth) {
      for (let k = ti; k < order.length; k++) {
        const t = order[k], have = rows.filter((r) => P.M[r][t]), no = rows.filter((r) => !P.M[r][t]);
        if (have.length && no.length) { const node = { trait: t, depth, kids: [rec(no, k + 1, depth + 1), rec(have, k + 1, depth + 1)] }; return node; }
      }
      return { group: rows.slice(), depth };
    }
    return rec(P.sp.map((s, i) => i), 0, 0);
  }
  function checkProgram(ps, tree) {
    const P = PSETS[ps], sets = cladeSets(tree), all = setKey(P.sp.map((s, i) => i));
    for (let t = 0; t < P.tr.length; t++) {
      const have = P.sp.map((s, i) => i).filter((r) => P.M[r][t]);
      if (have.length >= 2 && setKey(have) !== all && sets.indexOf(setKey(have)) < 0) return { ok: false, trait: t, have };
    }
    return { ok: true };
  }
  const phNames = (ps, idxs) => idxs.map((i) => PSETS[ps].sp[i]).join(', ');
  /* =========================================================
     상태 · 공통
     ========================================================= */
  const S = { mode: 'matrix', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const short = (n) => n.replace(/동물$/, '');
  const ONE_O = ['?', 'O', 'X'];

  /* ---------- 1단계: 형질 행렬 ---------- */
  const MX = L({ x: 20, y: 50, w: 760, h: 300 }, { x: 10, y: 46, w: 460, h: 290 });
  const MXH = L(44, 44), MXR = L(50, 46), MXN = L(190, 118), MXC = (MX.w - MXN - L(80, 0)) / 4;
  function resetMx() { S.mx = { v: SP5.map(() => [null, null, null, null]), bad: SP5.map(() => [false, false, false, false]), k: 0 }; }
  const mxCell = (r, c) => ({ x: MX.x + MXN + c * MXC, y: MX.y + MXH + r * MXR, w: MXC, h: MXR });
  const mxFilled = () => S.mx.v.reduce((a, r) => a + r.filter((x) => x != null).length, 0);
  const mxRight = () => S.mx.v.reduce((a, r, i) => a + r.filter((x, c) => x != null && x === M5[i][c]).length, 0);
  function mxDown(p) {
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) if (inRect(p, mxCell(r, c))) { const cur = S.mx.v[r][c]; S.mx.v[r][c] = cur == null ? 1 : cur === 1 ? 0 : null; S.mx.bad[r][c] = false; Sound.tick(); updateCtl(); return false; }
    return false;
  }
  function drawMx(dt, t) {
    const B = S.mx;
    bgFill('#f1f6ec', '#f6f8ef');
    T(L(20, 12), 30, '📋 5종의 형질 행렬: 있으면 O, 없으면 X', L(18, 15.5), '#1d4a2a', 'left', 800);
    panel(MX.x, MX.y, MX.w, MX.h, 14);
    ctx.fillStyle = '#e6f1dc'; D.roundRect(MX.x, MX.y, MX.w, MXH, 12); ctx.fill();
    T(MX.x + 14, MX.y + MXH / 2 + 5, '종', 14, '#1d4a2a', 'left', 800);
    TR4.forEach((n, c) => { const r = mxCell(0, c); chip(r.x + r.w / 2, MX.y + MXH / 2, n, { align: 'center', size: 13.5, bg: TRCOL[c], color: '#fff', pad: 10, h: 26 }); });
    if (!PHONE) T(MX.x + MX.w - 40, MX.y + MXH / 2 + 5, '형질 수', 13.5, '#1d4a2a', 'center', 800);
    for (let r = 0; r < 5; r++) {
      const y = MX.y + MXH + r * MXR;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(MX.x + 8, y); ctx.lineTo(MX.x + MX.w - 8, y); ctx.stroke();
      const rowOk = B.v[r].every((x, c) => x === M5[r][c]);
      if (rowOk) { ctx.fillStyle = 'rgba(34,160,74,.1)'; ctx.fillRect(MX.x + 3, y + 1, MX.w - 6, MXR - 1); }
      E(SP5_ICON[r], MX.x + 24, y + MXR / 2 + 2, L(24, 20));
      T(MX.x + 46, y + MXR / 2 + 5, SP5[r], L(16, 14.5), '#1b2333', 'left', 800);
      for (let c = 0; c < 4; c++) {
        const cr = mxCell(r, c), v = B.v[r][c], cx = cr.x + cr.w / 2, cy = cr.y + cr.h / 2;
        D.roundRect(cr.x + 6, cr.y + 5, cr.w - 12, cr.h - 10, 10); ctx.strokeStyle = B.bad[r][c] ? '#e11d48' : '#e5e7eb'; ctx.lineWidth = B.bad[r][c] ? 2.4 : 1.2; if (!B.bad[r][c]) ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        if (v == null) T(cx, cy + 6, '?', 17, '#cbd5e1', 'center', 800);
        else if (v) { D.sphere(cx, cy, 13, '#22a04a', { gloss: false }); T(cx, cy + 5, 'O', 15, '#fff', 'center', 800); }
        else { D.sphere(cx, cy, 13, '#94a3b8', { gloss: false }); T(cx, cy + 5, 'X', 15, '#fff', 'center', 800); }
      }
      if (!PHONE) { const n = B.v[r].filter((x) => x === 1).length; T(MX.x + MX.w - 40, y + MXR / 2 + 6, B.v[r].every((x) => x != null) ? String(n) : '—', 16, '#1b2333', 'center', 800); }
    }
    const done = mxRight() === 20; B.k = SciSim.approach(B.k, done ? 1 : 0, dt, 3);
    const by = MX.y + MX.h + L(14, 12);
    panel(MX.x, by, MX.w, VH - by - 10, 14);
    if (!done) textBlock(MX.x + 16, by + 30, MX.w - 32, '칸을 누를 때마다 ? → O → X 순서로 바뀌어요. 모두 채우면 형질이 어떻게 쌓이는지 보여 줘요.', L(15, 14), '#475569', 21, 700);
    else {
      T(MX.x + 16, by + 28, '📈 O를 가진 종이 열마다 달라져요', L(16, 14.5), '#1d4a2a', 'left', 800);
      const cnt = TR4.map((n, c) => M5.filter((r) => r[c]).length);
      cnt.forEach((n, c) => { const x = MX.x + 16 + c * ((MX.w - 32) / 4); chip(x, by + 62, TR4[c] + ' O: ' + n + '종', { size: L(14.5, 13), bg: TRCOL[c], color: '#fff', pad: 10, h: 28 }); });
      textBlock(MX.x + 16, by + 96, MX.w - 32, '턱을 가진 종 ⊃ 네 다리를 가진 종 ⊃ 양막을 가진 종 ⊃ 털·젖을 가진 종. 형질이 겹겹이 포함돼요.', L(15, 14), '#475569', 21, 700);
    }
  }

  /* ---------- 1단계: 포함 관계 (집합 그림) ---------- */
  const SC = L({ cx: 400, cy: 266, rx: [340, 265, 190, 115], ry: [205, 158, 108, 56] }, { cx: 240, cy: 300, rx: [232, 192, 152, 112], ry: [258, 190, 140, 70] });
  const TKW = L(140, 104), TKH = L(36, 34);
  const regionOf = (p) => { let r = 0; for (let i = 0; i < 4; i++) { const dx = (p.x - SC.cx) / SC.rx[i], dy = (p.y - SC.cy) / SC.ry[i]; if (dx * dx + dy * dy <= 1) r = i + 1; } return r; };
  const bandY = (r) => (r === 1 ? [SC.cy - (SC.ry[0] + SC.ry[1]) / 2, SC.cy + (SC.ry[0] + SC.ry[1]) / 2] : r === 2 ? [SC.cy - (SC.ry[1] + SC.ry[2]) / 2, SC.cy + (SC.ry[1] + SC.ry[2]) / 2] : r === 3 ? [SC.cy - (SC.ry[2] + SC.ry[3]) / 2, SC.cy + (SC.ry[2] + SC.ry[3]) / 2] : [SC.cy, SC.cy]);
  const SLOTS = [[{ x: L(86, 64), y: L(64, 52) }, { x: L(714, 416), y: L(64, 52) }], [bandY(1)[0], bandY(1)[1]].map((y) => ({ x: SC.cx, y })), [bandY(2)[0], bandY(2)[1]].map((y) => ({ x: SC.cx, y })), [bandY(3)[0], bandY(3)[1]].map((y) => ({ x: SC.cx, y })), [{ x: SC.cx, y: SC.cy }]];
  function slotInside(r, s) {       // 카드 네 모서리가 그 영역 안에 있는지 (설계 점검용)
    const hw = TKW / 2, hh = TKH / 2;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const q = { x: s.x + sx * hw, y: s.y + sy * hh }; if (regionOf(q) !== r) return false; }
    return true;
  }
  const SPTRAY = SP5.map((n, i) => (PHONE ? { x: 8 + TKW / 2 + (i % 4) * 118, y: 580 + Math.floor(i / 4) * 40 } : { x: 20 + TKW / 2 + i * 152, y: 512 }));
  function resetSets() {
    S.sets = { msg: '', ok: [false, false, false, false, false], k: 0 };
    S.setTok = Tokens({
      drop(it, p) {
        const r = regionOf(p), slots = SLOTS[r], used = S.setTok.items.filter((o) => o !== it && o.region === r).length;
        if (used >= slots.length) { showHint('이 영역에는 이미 카드가 있어요. 다른 종은 다른 영역에 놓아요.', 3000); Sound.fail(); it.region = null; return null; }
        const free = slots.find((s) => !S.setTok.items.some((o) => o !== it && o.region === r && o.slotIdx === slots.indexOf(s)));
        it.region = r; it.slotIdx = slots.indexOf(free); Sound.click(); updateCtl(); return { x: free.x, y: free.y };
      },
      canGrab: () => true,
    });
    SP5.forEach((n, i) => S.setTok.add({ id: i, w: TKW, h: TKH, hx: SPTRAY[i].x, hy: SPTRAY[i].y, region: null, slotIdx: -1 }));
    updateCtl();
  }
  const setsPlaced = () => S.setTok.items.filter((t) => t.region != null).length;
  const setsRight = () => S.setTok.items.filter((t) => t.region != null && t.region === M5[t.id].reduce((a, b) => a + b, 0)).length;
  function drawSets(dt, t) {
    bgFill('#f1f6ec', '#f6f8ef');
    T(L(20, 12), 30, '🧺 형질의 포함 관계: 종 카드를 알맞은 영역에 놓아요', L(18, 15), '#1d4a2a', 'left', 800);
    const fills = ['#e8f0fb', '#e0f4f0', '#fbefd9', '#fde4ee'], cols = TRCOL;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.ellipse(SC.cx, SC.cy, SC.rx[i], SC.ry[i], 0, 0, TAU); ctx.fillStyle = fills[i]; ctx.fill(); ctx.strokeStyle = cols[i]; ctx.lineWidth = 3; ctx.stroke();
    }
    // 집합 이름표 (경계 위)
    const PDY = [-90, -30, 30, 90];
    for (let i = 0; i < 4; i++) {
      if (!PHONE) chip(SC.cx - SC.rx[i], SC.cy, TR4[i], { align: 'center', size: 13.5, bg: cols[i], color: '#fff', pad: 8, h: 26 });
      else { const dy = PDY[i], bx = SC.cx - SC.rx[i] * Math.sqrt(1 - (dy / SC.ry[i]) * (dy / SC.ry[i])); chip(bx + 2, SC.cy + dy, TR4[i], { align: 'left', size: 13.5, bg: cols[i], color: '#fff', pad: 8, h: 26 }); }
    }
    // 카드
    S.setTok.items.forEach((it) => {
      const sel = S.setTok.drag && S.setTok.drag.it === it, lift = it.lift;
      const ok = it.region != null && it.region === M5[it.id].reduce((a, b) => a + b, 0);
      ctx.save(); ctx.translate(it.x, it.y - lift * 5); ctx.scale(1 + lift * 0.06, 1 + lift * 0.06);
      D.shadow(() => { D.roundRect(-it.w / 2, -it.h / 2, it.w, it.h, it.h / 2); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + lift * 10, y: 2 + lift * 5 });
      D.roundRect(-it.w / 2, -it.h / 2, it.w, it.h, it.h / 2); ctx.strokeStyle = it.region != null ? (ok ? '#16a34a' : '#dc2626') : SPCOL[it.id]; ctx.lineWidth = 2.6; ctx.stroke();
      E(SP5_ICON[it.id], -it.w / 2 + 20, 1, L(20, 18)); T(8, 5, SP5[it.id], 14, '#1b2333', 'center', 800);
      ctx.restore();
    });
    if (!PHONE) T(VW / 2, 52, setsPlaced() < 5 ? '카드를 끌어 알맞은 영역에 놓아요' : '5장을 모두 놓았어요. 확인해 보세요', 14.5, '#64748b', 'center', 700);
  }

  /* ---------- 2단계: 계통수 그리기 ---------- */
  const TRL = L({ x0: 40, dx: 130, xTip: 560, ty0: 80, ts: 58 }, { x0: 18, dx: 84, xTip: 354, ty0: 92, ts: 46 });
  function mkTree(n, parentEdge, depth, id0) {
    const node = { id: id0.n++, depth, trEdge: parentEdge, x: 0, y: 0, dx: null, dy: null };
    if (n.sp != null) { node.sp = n.sp; node.kids = null; }
    else { node.kids = [mkTree(n.kids[0], -1, depth + 1, id0), mkTree(n.kids[1], n.trait, depth + 1, id0)]; }
    return node;
  }
  function resetTree() {
    S.tr = { root: mkTree(REF, -1, 0, { n: 0 }), traitAt: {}, spAt: {}, pick: [], msg: '', done: false, flips: 0, ring: 0 };
    const nodes = []; (function w(n) { nodes.push(n); if (n.kids) n.kids.forEach(w); })(S.tr.root); S.tr.nodes = nodes;
    layoutTr(true);
    S.trTok = Tokens({
      drop(it, p) {
        const slots = trSlots();
        if (it.kind === 'tr') { const s = slots.traits.find((q) => inRect(p, q.r, 10)); if (!s) return null; const prev = S.tr.traitAt[s.id]; if (prev != null && prev !== it.id) { const o = S.trTok.items.find((x) => x.kind === 'tr' && x.id === prev); if (o) { o.slotId = null; o.at = null; SciSim.tween(o, { x: o.hx, y: o.hy }, { duration: 0.3 }); } } Object.keys(S.tr.traitAt).forEach((k) => { if (S.tr.traitAt[k] === it.id) delete S.tr.traitAt[k]; }); S.tr.traitAt[s.id] = it.id; it.slotId = s.id; S.tr.msg = ''; Sound.click(); updateCtl(); return { x: s.r.x + s.r.w / 2, y: s.r.y + s.r.h / 2 }; }
        const s = slots.tips.find((q) => inRect(p, q.r, 8)); if (!s) return null;
        const prev = S.tr.spAt[s.id]; if (prev != null && prev !== it.id) { const o = S.trTok.items.find((x) => x.kind === 'sp' && x.id === prev); if (o) { o.slotId = null; o.at = null; SciSim.tween(o, { x: o.hx, y: o.hy }, { duration: 0.3 }); } }
        Object.keys(S.tr.spAt).forEach((k) => { if (S.tr.spAt[k] === it.id) delete S.tr.spAt[k]; }); S.tr.spAt[s.id] = it.id; it.slotId = s.id; S.tr.msg = ''; Sound.click(); updateCtl(); return { x: s.r.x + s.r.w / 2, y: s.r.y + s.r.h / 2 };
      },
      tap(it) { if (it.kind === 'sp' && it.slotId != null) { const q = S.tr.pick, ix = q.indexOf(it.id); if (ix >= 0) q.splice(ix, 1); else { q.push(it.id); if (q.length > 2) q.shift(); } Sound.click(); updateCtl(); } },
    });
    const TW = L(118, 106), TH = L(34, 32), SW = L(146, 108);
    TR4.forEach((n, i) => S.trTok.add({ kind: 'tr', id: i, w: TW, h: TH, hx: PHONE ? 8 + TW / 2 + (i % 2) * 124 : 20 + TW / 2 + i * 128, hy: PHONE ? 340 + Math.floor(i / 2) * 42 : 382, slotId: null }));
    SP5.forEach((n, i) => S.trTok.add({ kind: 'sp', id: i, w: SW, h: L(36, 32), hx: PHONE ? 8 + SW / 2 + (i % 3) * 115 : 20 + SW / 2 + i * 152, hy: PHONE ? 440 + Math.floor(i / 3) * 40 : 440, slotId: null }));
    updateCtl();
  }
  function layoutTr(snap) {
    const Tn = S.tr; let tip = 0;
    (function pos(n) {
      if (!n.kids) { n.tx = TRL.xTip; n.ty = TRL.ty0 + (tip++) * TRL.ts; }
      else { n.kids.forEach(pos); n.tx = TRL.x0 + n.depth * TRL.dx; n.ty = (n.kids[0].ty + n.kids[1].ty) / 2; }
      if (snap || n.x === 0) { n.x = n.tx; n.y = n.ty; }
    })(Tn.root);
  }
  function trSlots() {
    const traits = [], tips = [];
    S.tr.nodes.forEach((n) => {
      if (n.trEdge >= 0) { const par = S.tr.nodes.find((q) => q.kids && q.kids.indexOf(n) >= 0); const mid = (par.x + n.x) / 2, w = L(104, 78); traits.push({ id: n.id, trait: n.trEdge, node: n, r: { x: mid - w / 2, y: n.y - 22 - L(15, 14), w, h: L(30, 28) } }); }
      if (!n.kids) tips.push({ id: n.id, sp: n.sp, node: n, r: { x: n.x + 12, y: n.y - L(18, 16), w: L(150, 112), h: L(36, 32) } });
    });
    return { traits, tips };
  }
  const pathTo = (n) => { const out = []; let cur = n; while (cur) { out.push(cur); cur = S.tr.nodes.find((q) => q.kids && q.kids.indexOf(cur) >= 0); } return out; };
  function mismatchOf(tipNode, sp) {
    const path = pathTo(tipNode), onPath = {};
    path.forEach((n) => { if (n.trEdge >= 0 && S.tr.traitAt[n.id] != null) onPath[S.tr.traitAt[n.id]] = true; });
    for (const t in onPath) if (!M5[sp][t]) return withJosa(SP5[sp], '은/는') + ' ' + TR4[t] + josa(TR4[t], '이/가') + ' 없는데 이 가지에는 ' + TR4[t] + josa(TR4[t], '이/가') + ' 있어요.';
    for (let t = 0; t < 4; t++) if (M5[sp][t] && !onPath[t]) { const placed = Object.keys(S.tr.traitAt).some((k) => S.tr.traitAt[k] === t); if (placed) return withJosa(SP5[sp], '은/는') + ' ' + TR4[t] + josa(TR4[t], '을/를') + ' 가졌는데 이 가지에는 ' + TR4[t] + josa(TR4[t], '이/가') + ' 없어요.'; }
    return null;
  }
  function trCheck() {
    const sl = trSlots(); let miss = 0, wrong = 0;
    sl.traits.forEach((s) => { const v = S.tr.traitAt[s.id]; if (v == null) miss++; else if (v !== s.trait) wrong++; });
    sl.tips.forEach((s) => { const v = S.tr.spAt[s.id]; if (v == null) miss++; else if (v !== s.sp) wrong++; });
    return { miss, wrong };
  }
  const lcaOf = (a, b) => { const pa = pathTo(a), pb = pathTo(b); return pa.find((n) => pb.indexOf(n) >= 0); };
  function flipNode(n) { if (!n.kids) return; n.kids.reverse(); S.tr.flips++; layoutTr(false); Sound.click(); updateCtl(); }
  function drawTree(dt, t) {
    const Tn = S.tr;
    bgFill('#f1f6ec', '#f6f8ef');
    T(L(20, 12), 30, '🌳 계통수: 공유 파생 형질을 가지에 달아요', L(18, 15.5), '#1d4a2a', 'left', 800);
    Tn.nodes.forEach((n) => { n.x = SciSim.approach(n.x, n.tx, dt, 8); n.y = SciSim.approach(n.y, n.ty, dt, 8); });
    // 가지 선
    const hl = {}; if (Tn.pick.length === 2) { const a = Tn.nodes.find((n) => n.sp === Tn.pick[0]), b = Tn.nodes.find((n) => n.sp === Tn.pick[1]), l = lcaOf(a, b); const pa = pathTo(a), pb = pathTo(b); pa.slice(0, pa.indexOf(l) + 1).concat(pb.slice(0, pb.indexOf(l) + 1)).forEach((n) => { hl[n.id] = true; }); Tn.lca = l; } else Tn.lca = null;
    Tn.nodes.forEach((n) => {
      if (!n.kids) return;
      n.kids.forEach((k) => {
        const on = hl[k.id] && hl[n.id] && Tn.lca && (k !== Tn.lca);
        ctx.strokeStyle = on ? '#f59e0b' : '#4b6b3a'; ctx.lineWidth = on ? 5 : 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n.x, k.y); ctx.lineTo(k.x, k.y); ctx.stroke();
      });
    });
    // 분기점
    Tn.nodes.forEach((n) => { if (!n.kids) return; const isL = Tn.lca === n; if (isL) D.ring(n.x, n.y, 14, t, { color: '#f59e0b', width: 3 }); D.sphere(n.x, n.y, isL ? 9 : 7, isL ? '#f59e0b' : '#2f6b3a', { gloss: false }); });
    // 칸
    const sl = trSlots();
    sl.traits.forEach((s) => {
      const placed = Tn.traitAt[s.id] != null;
      D.roundRect(s.r.x, s.r.y, s.r.w, s.r.h, 14); ctx.fillStyle = placed ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,.7)'; ctx.fill(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
      if (!placed) T(s.r.x + s.r.w / 2, s.r.y + s.r.h / 2 + 5, '형질', 13, '#94a3b8', 'center', 700);
    });
    sl.tips.forEach((s) => { const placed = Tn.spAt[s.id] != null; D.roundRect(s.r.x, s.r.y, s.r.w, s.r.h, 16); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]); if (!placed) T(s.r.x + s.r.w / 2, s.r.y + s.r.h / 2 + 5, '종', 13, '#94a3b8', 'center', 700); });
    // 토큰
    S.trTok.items.forEach((it) => {
      if (it.slotId != null && !(S.trTok.drag && S.trTok.drag.it === it)) {
        const s = (it.kind === 'tr' ? sl.traits : sl.tips).find((q) => q.id === it.slotId);
        if (s) { it.x = SciSim.approach(it.x, s.r.x + s.r.w / 2, dt, 14); it.y = SciSim.approach(it.y, s.r.y + s.r.h / 2, dt, 14); }
      }
    });
    S.trTok.items.slice().sort((a, b) => a.lift - b.lift).forEach((it) => {
      const lift = it.lift; ctx.save(); ctx.translate(it.x, it.y - lift * 5); ctx.scale(1 + lift * 0.06, 1 + lift * 0.06);
      let bad = null;
      if (it.kind === 'sp' && it.slotId != null) { const tn = Tn.nodes.find((n) => n.id === it.slotId); if (tn) bad = mismatchOf(tn, it.id); }
      const sel = it.kind === 'sp' && Tn.pick.indexOf(it.id) >= 0;
      D.shadow(() => { D.roundRect(-it.w / 2, -it.h / 2, it.w, it.h, it.h / 2); ctx.fillStyle = it.kind === 'tr' ? TRCOL[it.id] : '#fff'; ctx.fill(); }, { blur: 5 + lift * 10, y: 2 + lift * 5 });
      if (it.kind === 'sp') { D.roundRect(-it.w / 2, -it.h / 2, it.w, it.h, it.h / 2); ctx.strokeStyle = bad ? '#dc2626' : sel ? '#f59e0b' : SPCOL[it.id]; ctx.lineWidth = bad || sel ? 3.4 : 2.4; ctx.stroke(); E(SP5_ICON[it.id], -it.w / 2 + 18, 1, L(19, 17)); T(8, 5, SP5[it.id], 14, '#1b2333', 'center', 800); }
      else T(0, 5, TR4[it.id], 14, '#fff', 'center', 800);
      ctx.restore();
      if (bad && !(S.trTok.drag && S.trTok.drag.it === it)) Tn.badMsg = bad;
    });
    // 안내
    const ty = L(512, 566);
    if (Tn.lca) T(VW / 2, ty - L(26, 30), '⭐ 마지막 공통 조상: ' + withJosa(SP5[Tn.pick[0]], '과/와') + ' ' + withJosa(SP5[Tn.pick[1]], '이/가') + ' 갈라진 분기점', L(15, 13.5), '#b45309', 'center', 800);
    else T(VW / 2, ty - L(26, 30), Tn.pick.length === 1 ? '다른 종도 눌러 보세요' : '종 카드를 두 개 누르면 마지막 공통 조상이 나타나요', L(14.5, 13.5), '#64748b', 'center', 700);
    const r = trCheck();
    if (r.miss === 0 && r.wrong === 0) T(VW / 2, ty, '✅ 가지의 형질이 5종의 형질 행렬과 모두 일치해요', L(16, 14), '#0b6b39', 'center', 800);
    else T(VW / 2, ty, '카드를 끌어 칸에 놓아요 · 분기점(●)을 누르면 가지가 뒤집혀요', L(14.5, 13.5), '#64748b', 'center', 700);
  }
  function treeDown(p) {
    const hit = S.trTok.down(p); if (hit) return true;
    for (const n of S.tr.nodes) if (n.kids && Math.hypot(p.x - n.x, p.y - n.y) <= 16) { flipNode(n); return false; }
    return false;
  }

  /* ---------- 3단계: 분자 계통수 ---------- */
  const MT = L({ x: 20, y: 46, w: 760, rh: 38 }, { x: 10, y: 44, w: 460, rh: 33 });
  const MTR = L({ x0: 40, xTip: 640, ty0: 318, ts: 44, axisY: 536 }, { x0: 14, xTip: 360, ty0: 296, ts: 54, axisY: 592 });
  function resetMol(set) {
    const keep = S.mo ? S.mo.dsDone : { ae: false, vt: false };
    S.mo = { set: set || 'ae', M: newMol(set || 'ae'), dsDone: keep, shake: 0, msg: '' };
    updateCtl();
  }
  const moN = () => S.mo.M.cl.length;
  const mtCW = () => MT.w / Math.max(2, moN());
  const mtCell = (i, j) => { const cw = mtCW(); return { x: MT.x + j * cw, y: MT.y + i * MT.rh, w: cw, h: MT.rh }; };
  function molJoin(i, j) {
    const o = S.mo, M = o.M, mn = molMin(M), v = clDist(M.set, M.cl[i].mem, M.cl[j].mem);
    if (v > mn.v + 1e-9) { M.miss++; o.shake = 1; SciSim.tween(o, { shake: 0 }, { duration: 0.4, ease: 'outCubic' }); Sound.fail(); o.msg = '이 쌍의 차이 수는 ' + (Math.round(v * 10) / 10) + '이에요. 더 작은 차이 수가 있어요. 가장 적은 쌍부터 묶어요.'; showHint(o.msg, 4200); updateCtl(); return; }
    const A = M.cl[i], B = M.cl[j];
    const node = { a: A.node, b: B.node, h: v, k: 0 };
    const nc = { id: 100 + M.joins.length, mem: A.mem.concat(B.mem), node };
    M.cl.splice(j, 1); M.cl.splice(i, 1, nc);
    M.joins.push({ mem: nc.mem.slice(), v });
    SciSim.tween(node, { k: 1 }, { duration: RM ? 0.01 : 0.8, ease: 'outCubic' });
    Sound.success(); parts.burst(molX(v), molY(node) , { count: 14, colors: ['#22c55e', '#fde68a', '#fff'], speed: 90, size: 3, life: 0.7, gravity: 30 });
    if (M.cl.length === 1) o.dsDone[M.set] = true;
    hideHint(); o.msg = ''; M.anim = 0; SciSim.tween(M, { anim: 1 }, { duration: RM ? 0.01 : 0.5, ease: 'outCubic' });
    updateCtl();
  }
  const molY = (n) => (n.sp != null ? MTR.ty0 + n.sp * MTR.ts : (molY(n.a) + molY(n.b)) / 2);
  const molX = (h) => MTR.xTip - h / 8 * (MTR.xTip - MTR.x0 - 6);
  function drawMolTree(n) {
    if (n.sp != null) return;
    const ya = molY(n.a), yb = molY(n.b), xp = molX(n.h), xa = molX(n.a.sp != null ? 0 : n.a.h), xb = molX(n.b.sp != null ? 0 : n.b.h), k = n.k == null ? 1 : n.k;
    const xd = lerp(Math.max(xa, xb), xp, k);
    ctx.strokeStyle = '#2f6b3a'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xd, ya); ctx.moveTo(xb, yb); ctx.lineTo(xd, yb); ctx.moveTo(xd, ya); ctx.lineTo(xd, yb); ctx.stroke();
    if (k > 0.2) { D.sphere(xd, (ya + yb) / 2, 6, '#2f6b3a', { gloss: false }); ctx.save(); ctx.globalAlpha = clamp((k - 0.4) * 2, 0, 1); chip(xd - 4, (ya + yb) / 2, String(Math.round(n.h * 10) / 10), { align: 'right' === 'x' ? 'left' : 'center', size: 13, bg: '#fff', color: '#2f6b3a', border: '#2f6b3a', pad: 5, h: 20 }); ctx.restore(); }
    drawMolTree(n.a); drawMolTree(n.b);
  }
  function drawMol(dt, t) {
    const o = S.mo, M = o.M, n = M.cl.length;
    bgFill('#f1f6ec', '#f6f8ef');
    ctx.save(); ctx.globalAlpha = clamp(0.35 + M.anim * 0.65, 0, 1);
    const mn = n > 1 ? molMin(M) : null;
    panel(MT.x, MT.y - 4, MT.w, n * MT.rh + 8, 12);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        const r = mtCell(i, j), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        if (j === i) chip(cx, cy, molLabel(M.set, M.cl[i]), { align: 'center', size: L(14.5, 13), bg: '#e6f1dc', color: '#1d4a2a', border: '#9cc18a', pad: 7, h: L(28, 26) });
        else {
          const v = clDist(M.set, M.cl[i].mem, M.cl[j].mem), isMin = mn && Math.abs(v - mn.v) < 1e-9, hint = M.miss >= 2 && isMin;
          D.roundRect(r.x + 4, r.y + 3, r.w - 8, r.h - 6, 8); ctx.fillStyle = hint ? 'rgba(34,197,94,.22)' : '#fff'; ctx.fill(); ctx.strokeStyle = hint ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = hint ? 2.6 : 1.4; ctx.stroke();
          T(cx, cy + 5.5, String(Math.round(v * 10) / 10), L(17, 15), '#1b2333', 'center', 800);
        }
      }
    }
    ctx.restore();
    const ny = MT.y + n * MT.rh + L(30, 26);
    T(MT.x + 8, ny, n > 1 ? '👆 차이 수가 가장 적은 칸을 눌러 두 묶음을 합쳐요' : '🎉 모두 하나로 묶었어요', L(15.5, 13.5), n > 1 ? '#475569' : '#0b6b39', 'left', 800);
    if (molDone(M) && M.set === 'vt') { const same = molCanon(molTree(M)) === canon(REF); T(MT.x + 8, ny + L(28, 24), same ? '✅ 형질로 만든 계통수와 가지가 갈라진 순서가 같아요' : '⚠️ 형질 계통수와 달라요', L(15.5, 13.5), same ? '#0b6b39' : '#b91c1c', 'left', 800); }
    // 눈금
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.2;
    for (let h = 0; h <= 8; h += 2) { const x = molX(h); ctx.beginPath(); ctx.moveTo(x, MTR.ty0 - 24); ctx.lineTo(x, MTR.axisY - 18); ctx.stroke(); T(x, MTR.axisY, String(h), 13.5, '#64748b', 'center', 800); }
    T((MTR.x0 + MTR.xTip) / 2, MTR.axisY + 20, '묶인 지점의 염기 차이 수', 13.5, '#64748b', 'center', 700);
    DSETS[M.set].names.forEach((nm, i) => { const y = MTR.ty0 + i * MTR.ts; D.sphere(MTR.xTip, y, 5, '#2f6b3a', { gloss: false }); T(MTR.xTip + 12, y + 5, nm, L(16, 14.5), '#1b2333', 'left', 800); });
    M.cl.forEach((c) => drawMolTree(c.node));
  }
  function molDown(p) {
    const n = S.mo.M.cl.length;
    for (let i = 1; i < n; i++) for (let j = 0; j < i; j++) if (inRect(p, mtCell(i, j))) { molJoin(j, i); return false; }
    return false;
  }

  /* ---------- 4단계: 분류 프로그래밍 ---------- */
  const PG = L({ cx: 14, cw: 340, ox: 366, ow: 420 }, { cx: 8, cw: 464, ox: 8, ow: 464 });
  function resetPg() {
    S.pg = { ds: 'plant', order: { plant: PSETS.plant.init.slice(), animal: PSETS.animal.init.slice() }, tree: { plant: null, animal: null }, ran: { plant: false, animal: false }, stale: { plant: false, animal: false }, grow: 0, tapped: { fwd: false, back: false }, rects: [], msg: '' };
  }
  const pgP = () => PSETS[S.pg.ds];
  /* 미션이 시작될 때 그 자료의 실행 결과와 순서를 처음 상태로 되돌려요 (미리 채워진 채 열리지 않게) */
  function pgFresh(ds) { const g = S.pg; g.order[ds] = PSETS[ds].init.slice(); g.tree[ds] = null; g.ran[ds] = false; g.stale[ds] = false; g.tapped = { fwd: false, back: false }; }
  const pgNames = (idxs) => idxs.map((i) => short(pgP().sp[i])).join('·');
  function runPg() {
    const g = S.pg, P = pgP();
    g.tree[g.ds] = runProgram(g.ds, g.order[g.ds]); g.ran[g.ds] = true; g.stale[g.ds] = false; g.grow = 0; g.tapped = { fwd: false, back: false };
    const cnt = []; (function w(n) { cnt.push(n); if (n.kids) n.kids.forEach(w); })(g.tree[g.ds]); g.nodeCount = cnt.length;
    g.growT = S.clock; Sound.click(); updateCtl();
  }
  const pgCheck = () => (S.pg.tree[S.pg.ds] ? checkProgram(S.pg.ds, S.pg.tree[S.pg.ds]) : null);
  function setPgOrder(k, t) { const g = S.pg; g.order[g.ds][k] = t; if (g.ran[g.ds]) g.stale[g.ds] = true; Sound.tick(); updateCtl(); }
  const pgPickRect = (k) => (PHONE ? { x: 8 + (k % 2) * 232, y: 140 + Math.floor(k / 2) * 46, w: 224, h: 42 } : { x: PG.cx + 16, y: 226 + k * 56, w: PG.cw - 32, h: 46 });
  function pgLayout(tree, areaX, areaY, areaW, areaH) {
    let maxD = 0, leafN = 0; (function w(n) { if (n.kids) { maxD = Math.max(maxD, n.depth); n.kids.forEach(w); } else leafN++; })(tree);
    const leafW = L(124, 112), dx = Math.min(L(86, 74), (areaW - leafW - 30) / (maxD + 1));
    let li = 0;
    (function pos(n) {
      if (!n.kids) { n.px = areaX + 14 + (maxD + 1) * dx; n.py = areaY + (li + 0.5) * areaH / leafN; li++; return; }
      n.kids.forEach(pos); n.px = areaX + 14 + n.depth * dx; n.py = (n.kids[0].py + n.kids[1].py) / 2;
    })(tree);
    return { leafW, dx };
  }
  function drawPg(dt, t) {
    const g = S.pg, P = pgP(), tree = g.tree[g.ds];
    bgFill('#f1f6ec', '#f6f8ef');
    T(L(14, 10), 28, '💻 분류 프로그램: 형질 순서를 정해 계통수를 자동으로 그려요', L(17, 14.5), '#1d4a2a', 'left', 800);
    // 코드 블록
    const bx = PG.cx;
    const blk = (x, y, w, h, col, str) => { D.shadow(() => { D.roundRect(x, y, w, h, 10); ctx.fillStyle = col; ctx.fill(); }, { blur: 4, y: 2 }); T(x + 12, y + h / 2 + 5, str, fitText(str, w - 20, L(15, 13.5), 800, 12.5), '#fff', 'left', 800); };
    const hy = L(46, 38), hh = L(40, 32), gy = hy + hh + L(8, 6), gh = L(36, 30), ly = gy + gh + L(8, 6), lh = L(36, 30);
    const hat = { x: bx, y: hy, w: PG.cw, h: hh };
    D.shadow(() => { D.roundRect(hat.x, hat.y, hat.w, hat.h, 12); ctx.fillStyle = '#16a34a'; ctx.fill(); }, { blur: 6, y: 2 });
    T(hat.x + 14, hat.y + hat.h / 2 + 6, '▶ 실행하기 (눌러요)', L(16, 14.5), '#fff', 'left', 800); g.runRect = hat;
    blk(bx, gy, PG.cw, gh, '#3b82f6', '집단 ← ' + P.title + ' (' + P.sp.length + '종)');
    blk(bx, ly, PG.cw, lh, '#f59e0b', '반복: 남은 집단이 2종 이상이면');
    const nPick = P.tr.length, p0 = pgPickRect(0), pEnd = pgPickRect(nPick - 1), barTop = ly + lh;
    const barEnd = PHONE ? pgPickRect(nPick - 1).y + pgPickRect(nPick - 1).h + 8 : pEnd.y + pEnd.h + 38;
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx, barTop, L(10, 8), barEnd - barTop); D.roundRect(bx, barEnd, PG.cw, L(12, 8), 5); ctx.fill();
    if (!PHONE) { T(bx + 24, barTop + 24, '다음 형질로 집단을 가르기 (눌러서 바꿔요)', 13.5, '#92400e', 'left', 800); T(bx + 24, pEnd.y + pEnd.h + 26, '있다면 → 가지 A, 아니면 → 가지 B', 13.5, '#92400e', 'left', 800); }
    g.pickRects = [];
    const ord = g.order[g.ds];
    ord.forEach((tr, k) => {
      const r = pgPickRect(k); g.pickRects.push(r);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.4; ctx.stroke();
      T(r.x + 12, r.y + r.h / 2 + 5, (k + 1) + '번째', 13.5, '#92400e', 'left', 800);
      chip(r.x + r.w - 14 - 52, r.y + r.h / 2, P.tr[tr] + ' ▾', { align: 'center', size: 14.5, bg: '#fef3c7', color: '#1b2333', border: '#f59e0b', pad: 10, h: 30, minW: 104 });
    });
    // 출력
    const OA = { x: PG.ox, y: PHONE ? 244 : 46, w: PG.ow, h: PHONE ? 196 : 296 };
    panel(OA.x, OA.y, OA.w, OA.h, 14);
    T(OA.x + 14, OA.y + 24, g.ds === 'animal' ? '🌳 계통수' : '🌳 자동으로 그려진 계통수', 14.5, '#1d4a2a', 'left', 800);
    g.rects = [];
    if (!tree) { T(OA.x + OA.w / 2, OA.y + OA.h / 2, '▶ 실행하면 계통수가 한 가지씩 자라나요', L(15, 13.5), '#94a3b8', 'center', 700); return; }
    const lay = pgLayout(tree, OA.x, OA.y + 40, OA.w, OA.h - 52);
    (function clr(n) { n.hl = null; if (n.kids) n.kids.forEach(clr); })(tree);
    const mark2 = (n, c) => { n.hl = c; if (n.kids) n.kids.forEach((q) => mark2(q, c)); };
    let hnode = null; (function f(n) { if (n.kids) { if (n.trait === 2 && g.ds === 'animal') hnode = n; n.kids.forEach(f); } })(tree);
    if (hnode) { if (g.tapped.fwd) mark2(hnode.kids[1], '#7c3aed'); if (g.tapped.back) mark2(hnode.kids[0], '#ea580c'); }
    ctx.save(); if (g.stale[g.ds]) ctx.globalAlpha = 0.35;
    const el = (t - g.growT) / 0.45; let idx = 0;
    const order = []; (function bfs(q) { const nq = []; q.forEach((n) => { order.push(n); if (n.kids) nq.push(...n.kids); }); if (nq.length) bfs(nq); })([tree]);
    order.forEach((n, i) => { n.reveal = RM ? 1 : clamp(el - i * 1.0 + 1.0 - 0.0, 0, 1); });
    (function edges(n) {
      if (!n.kids) return;
      n.kids.forEach((k, ki) => {
        const a = clamp(n.reveal, 0, 1) * clamp(k.reveal, 0, 1); if (a <= 0) return;
        ctx.strokeStyle = k.hl || (ki === 1 ? '#2f6b3a' : '#9a6a3a'); ctx.lineWidth = k.hl ? 4.4 : 3.2; ctx.lineCap = 'round'; ctx.globalAlpha = (g.stale[g.ds] ? 0.35 : 1) * a;
        ctx.beginPath(); ctx.moveTo(n.px, n.py); ctx.lineTo(n.px, k.py); ctx.lineTo(lerp(n.px, k.px, a), k.py); ctx.stroke();
        ctx.globalAlpha = g.stale[g.ds] ? 0.35 : 1;
        edges(k);
      });
    })(tree);
    ctx.globalAlpha = g.stale[g.ds] ? 0.35 : 1;
    (function nodes(n) {
      if (n.reveal <= 0) return;
      if (n.kids) {
        D.sphere(n.px, n.py, 6.5, '#2f6b3a', { gloss: false });
        const lab = P.tr[n.trait];
        chip(n.px + 6, n.py - 19, lab, { align: 'center', size: 13, bg: TRCOL[n.trait % 4], color: '#fff', pad: 7, h: 22 });
        n.kids.forEach((k, ki) => { if (k.reveal > 0.9) T(lerp(n.px, k.px, 0.55), k.py + (ki === 1 ? L(-6, -8) : L(16, 12)), ki === 1 ? '있음' : '없음', 12.5, ki === 1 ? '#2f6b3a' : '#9a6a3a', 'center', 800); });
        n.kids.forEach(nodes);
      } else {
        const r = { x: n.px + 6, y: n.py - L(20, 18), w: n.reveal > 0.9 ? L(124, 112) : 0, h: L(40, 36) };
        if (n.reveal > 0.9) {
          const nm = pgNames(n.group), nl = wrap(nm, r.w - 10, 13, 800).length;   // 이름이 길면 상자를 키워요
          r.h = PHONE ? nl * 15 + 9 : Math.max(r.h, nl * 15 + 9); r.y = n.py - r.h / 2;
          D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#2f6b3a'; ctx.lineWidth = 2; ctx.stroke(); textBlock(r.x + 6, r.y + 16, r.w - 10, nm, 13, '#1b2333', 15, 800);
        }
      }
    })(tree);
    // 큰 분기 이름표 (동물: 후구 형질) - 패널 머리줄의 두 칩을 눌러 이름을 확인
    if (hnode && hnode.reveal > 0.9) {
      [['fwd', '후구 있는 가지', '후구동물', '#7c3aed', 1], ['back', '후구 없는 가지', '선구동물', '#ea580c', 0]].forEach(([key, q, nm, col], i) => {
        const r = { x: OA.x + OA.w - 14 - (2 - i) * L(124, 108) - (1 - i) * 0 + (i ? 0 : 0), y: OA.y + 8, w: L(116, 102), h: 26 };
        r.x = OA.x + OA.w - 12 - (2 - i) * (L(116, 102) + 6) + 6; g.rects.push({ r, key });
        chip(r.x + r.w / 2, r.y + r.h / 2, g.tapped[key] ? nm : q + ' ?', { align: 'center', size: 13, bg: g.tapped[key] ? col : '#ede9fe', color: g.tapped[key] ? '#fff' : '#4c1d95', border: col, pad: 7, h: 26, minW: r.w });
      });
    }
    ctx.restore();
    // 점검 메시지 + 검색표
    const chk = checkProgram(g.ds, tree), done = el > g.nodeCount + 0.5;
    const my = OA.y + OA.h + L(10, 0);
    if (g.stale[g.ds]) T(OA.x + OA.w / 2, OA.y + OA.h - 10, '코드가 바뀌었어요. ▶ 실행을 다시 눌러요', 13.5, '#b45309', 'center', 800);
    const msgY = PHONE ? OA.y + OA.h + 22 : OA.y + OA.h + 28;
    let msgH;
    if (chk.ok) msgH = textBlock(OA.x, msgY, OA.w, '✅ 모든 형질을 가진 종이 한 가지로 묶였어요. 공유 파생 형질의 순서가 올바른 계통수예요.', L(15, 13.5), '#0b6b39', 20, 800);
    else msgH = textBlock(OA.x, msgY, OA.w, '⚠️ "' + P.tr[chk.trait] + '"' + josa(P.tr[chk.trait], '을/를') + ' 가진 ' + pgNames(chk.have) + josa(pgNames(chk.have), '이/가') + ' 한 가지로 묶이지 않았어요. 형질을 쓰는 순서를 다시 생각해 봐요.', L(15, 13.5), '#b91c1c', 20, 800);
    // 자동 검색표
    const ky = msgY + msgH + 10;
    const nodesList = []; (function bfs(q) { const nq = []; q.forEach((n) => { if (n.kids) { nodesList.push(n); nq.push(...n.kids); } }); if (nq.length) bfs(nq); })([tree]);
    T(OA.x + 2, ky, '🔑 자동으로 만든 이분 검색표', 14, '#1d4a2a', 'left', 800);
    let yy = ky + 22;
    nodesList.forEach((n, i) => {
      const tg = (k) => (k.kids ? (nodesList.indexOf(k) + 1) + '번' : pgNames(k.group));
      const line = (i + 1) + '. ' + withJosa(P.tr[n.trait], '이/가') + ' 있나? 있다→' + tg(n.kids[1]) + ' / 없다→' + tg(n.kids[0]);
      const sz = fitText(line, OA.w - 10, L(14, 13), 700, 12.5), nl = wrap(line, OA.w - 10, sz, 700).length;   // 한 줄에 안 들어가면 줄바꿈
      if (yy < VH - 6) { if (nl > 1) textBlock(OA.x + 6, yy, OA.w - 10, line, sz, '#1b2333', 15, 700); else T(OA.x + 6, yy, line, sz, '#1b2333', 'left', 700); }
      yy += nl > 1 ? nl * 15 + 6 : L(21, 20);
    });
  }
  function pgDown(p) {
    const g = S.pg;
    if (g.runRect && inRect(p, g.runRect)) { runPg(); return false; }
    for (let k = 0; k < g.pickRects.length; k++) if (inRect(p, g.pickRects[k])) { const n = pgP().tr.length, cur = g.order[g.ds][k]; setPgOrder(k, (cur + 1) % n); return false; }
    for (const q of g.rects) if (inRect(p, q.r)) { g.tapped[q.key] = true; Sound.success(); updateCtl(); return false; }
    return false;
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_LABEL = { matrix: '📋 형질 행렬', sets: '🧺 형질의 포함 관계', tree: '🌳 계통수 그리기', mol: '🧬 분자 계통수 (염기 차이)', code: '💻 분류 프로그래밍' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    if (S.mx) $('#mxNote').innerHTML = '채운 칸 <b>' + mxFilled() + ' / 20</b> · 맞은 칸 <b>' + mxRight() + ' / 20</b><br>칸을 누를 때마다 ? → O → X로 바뀌어요.';
    if (S.setTok) $('#stNote').innerHTML = '놓은 카드 <b>' + setsPlaced() + ' / 5</b> · 맞는 영역 <b>' + setsRight() + ' / 5</b><br>카드를 끌어서(또는 눌러서 끌어서) 영역에 놓아요.';
    if (S.tr) { const r = trCheck(); $('#trNote').innerHTML = '빈 칸 <b>' + r.miss + '개</b> · 맞지 않는 칸 <b>' + r.wrong + '개</b><br>형질 이름표와 종 카드를 끌어 칸에 놓아요.'; }
    if (S.mo) { const M = S.mo.M; $$('#moSet button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.mo.set)); $('#moNote').innerHTML = '합친 횟수 <b>' + M.joins.length + ' / ' + (DSETS[M.set].names.length - 1) + '</b> · 틀린 선택 <b>' + M.miss + '번</b>'; }
    const g = S.pg;
    if (g) {
      const P = pgP(); $$('#pgSet button').forEach((b) => b.classList.toggle('on', b.dataset.s === g.ds));
      for (let k = 0; k < 4; k++) { const sel = $('#selPg' + k), row = sel.closest('.pg-row'); row.hidden = k >= P.tr.length; if (k < P.tr.length) { if (sel.dataset.ds !== g.ds) { sel.innerHTML = P.tr.map((n, i) => '<option value="' + i + '">' + n + '</option>').join(''); sel.dataset.ds = g.ds; } sel.value = String(g.order[g.ds][k]); } }
      const chk = pgCheck();
      $('#pgNote').innerHTML = g.ran[g.ds] ? (g.stale[g.ds] ? '코드가 바뀌었어요. <b>▶ 실행</b>을 다시 눌러요.' : chk && chk.ok ? '✅ 공유 파생 형질 규칙을 만족해요.' : '⚠️ 형질 순서를 바꿔 다시 실행해 봐요.') : '형질 순서를 정하고 <b>▶ 실행</b>을 눌러요.';
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bMxClear').addEventListener('click', () => { Sound.click(); resetMx(); updateCtl(); });
  $('#bStReset').addEventListener('click', () => { Sound.click(); resetSets(); });
  $('#bTrClear').addEventListener('click', () => { Sound.click(); resetTree(); });
  $('#bFlip').addEventListener('click', () => { const n = S.tr.nodes.filter((q) => q.kids).slice(-1)[0]; flipNode(n); });
  $$('#moSet button').forEach((b) => b.addEventListener('click', () => { Sound.click(); resetMol(b.dataset.s); }));
  $('#bMoReset').addEventListener('click', () => { Sound.click(); resetMol(S.mo.set); hideHint(); });
  $$('#pgSet button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pg.ds = b.dataset.s; updateCtl(); }));
  for (let k = 0; k < 4; k++) $('#selPg' + k).addEventListener('change', (e) => setPgOrder(k, +e.target.value));
  $('#bRun').addEventListener('click', runPg);

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'matrix') return mxDown(p);
      if (S.mode === 'sets') return S.setTok.down(p);
      if (S.mode === 'tree') return treeDown(p);
      if (S.mode === 'mol') return molDown(p);
      if (S.mode === 'code') return pgDown(p);
      return false;
    },
    move(p) { if (S.mode === 'sets') S.setTok.move(p); else if (S.mode === 'tree') S.trTok.move(p); },
    up(p) { if (S.mode === 'sets') S.setTok.up(p); else if (S.mode === 'tree') S.trTok.up(p); },
    hover(p) { if (S.mode === 'sets') return S.setTok.hit(p) ? 'grab' : 'default'; if (S.mode === 'tree') return S.trTok.hit(p) ? 'grab' : 'default'; return S.mode === 'matrix' || S.mode === 'mol' || S.mode === 'code' ? 'pointer' : 'default'; },
  });
  let rlast = '';
  function readouts() {
    let a1, a2, a3, b1, b2, b3; const m = S.mode;
    if (m === 'matrix') { a1 = '채운 칸'; b1 = mxFilled() + ' / 20'; a2 = '맞은 칸'; b2 = mxRight() + ' / 20'; a3 = '종 · 형질'; b3 = '5종 · 4형질'; }
    else if (m === 'sets') { a1 = '놓은 카드'; b1 = setsPlaced() + ' / 5'; a2 = '맞는 영역'; b2 = setsRight() + ' / 5'; a3 = '가장 바깥 집합'; b3 = '턱'; }
    else if (m === 'tree') { const r = trCheck(); a1 = '빈 칸'; b1 = r.miss + '개'; a2 = '맞지 않는 칸'; b2 = r.wrong + '개'; a3 = '가지 뒤집은 횟수'; b3 = S.tr.flips + '번'; }
    else if (m === 'mol') { const M = S.mo.M; a1 = '자료'; b1 = DSETS[M.set].title; a2 = '합친 횟수'; b2 = M.joins.length + ' / ' + (DSETS[M.set].names.length - 1); a3 = '방금 합친 값'; b3 = M.joins.length ? String(Math.round(M.joins[M.joins.length - 1].v * 10) / 10) : '—'; }
    else { const g = S.pg, chk = pgCheck(); a1 = '자료'; b1 = pgP().title; a2 = '실행'; b2 = g.ran[g.ds] ? (g.stale[g.ds] ? '다시 실행' : '완료') : '아직'; a3 = '순서 점검'; b3 = !g.ran[g.ds] || g.stale[g.ds] ? '—' : chk.ok ? '올바름 ✔' : '다시 ✘'; }
    const kS = [a1, b1, a2, b2, a3, b3].join('|');
    if (kS === rlast) return; rlast = kS;
    l1.textContent = a1; v1.textContent = b1; l2.textContent = a2; v2.textContent = b2; l3.textContent = a3; v3.textContent = b3;
  }

  /* =========================================================
     미션
     ========================================================= */
  /* 퀴즈 미션이 열릴 때(이어하기 포함) 문제가 가리키는 그림이 완성되어 있도록 채워 줘요 */
  function fillMxAll() { S.mx.v = M5.map((r) => r.slice()); S.mx.bad.forEach((r) => r.fill(false)); updateCtl(); }
  function fillTreeAll() {
    const sl = trSlots();
    sl.traits.forEach((s) => { const it = S.trTok.items.find((x) => x.kind === 'tr' && x.id === s.trait); it.slotId = s.id; it.at = { x: s.r.x + s.r.w / 2, y: s.r.y + s.r.h / 2 }; S.tr.traitAt[s.id] = s.trait; it.x = it.at.x; it.y = it.at.y; });
    sl.tips.forEach((s) => { const it = S.trTok.items.find((x) => x.kind === 'sp' && x.id === s.sp); it.slotId = s.id; it.at = { x: s.r.x + s.r.w / 2, y: s.r.y + s.r.h / 2 }; S.tr.spAt[s.id] = s.sp; it.x = it.at.x; it.y = it.at.y; });
    updateCtl();
  }
  function fillMolAll(set) {
    resetMol(set); const o = S.mo, M = o.M;
    while (M.cl.length > 1) { const mn = molMin(M), A = M.cl[mn.i], B = M.cl[mn.j]; const node = { a: A.node, b: B.node, h: mn.v, k: 1 }; const nc = { id: 100 + M.joins.length, mem: A.mem.concat(B.mem), node }; M.cl.splice(mn.j, 1); M.cl.splice(mn.i, 1, nc); M.joins.push({ mem: nc.mem.slice(), v: mn.v }); }
    updateCtl();
  }
  const levels = [
    {
      title: '형질 행렬과 포함 관계', short: '형질 행렬', icon: '📋', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 생물들이 서로 얼마나 가까운 친척인지 어떻게 한 장의 그림으로 나타낼까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 식물(관다발 → 종자 → 씨방)과 동물 9개 문의 형질을 비교했어요. 이번에는 형질을 근거로 <b>유연관계</b>를 한 장의 그림, <b>계통수</b>로 나타내요.</div>' +
        '<p>칠성장어, 연어, 개구리, 도마뱀, 고양이 5종이 <b>턱, 네 다리, 양막, 털·젖</b>을 가졌는지 표(형질 행렬)로 정리하고, 같은 형질을 가진 종끼리 묶어 포함 관계를 살펴봐요.</p>',
      features: ['matrix', 'sets'],
      setup() { resetMx(); resetSets(); setMode('matrix'); },
      recap: '형질 행렬에서 공유한 형질로 종을 묶으면 턱 ⊃ 네 다리 ⊃ 양막 ⊃ 털·젖처럼 포함 관계가 나타나요.',
      summary: '<table class="mini"><tr><th>종</th><th>턱</th><th>네 다리</th><th>양막</th><th>털·젖</th></tr><tr><td>칠성장어</td><td>X</td><td>X</td><td>X</td><td>X</td></tr><tr><td>연어</td><td>O</td><td>X</td><td>X</td><td>X</td></tr><tr><td>개구리</td><td>O</td><td>O</td><td>X</td><td>X</td></tr><tr><td>도마뱀</td><td>O</td><td>O</td><td>O</td><td>X</td></tr><tr><td>고양이</td><td>O</td><td>O</td><td>O</td><td>O</td></tr></table><ul><li><b>계통수</b>: 공통 조상에서 갈라져 나온 순서를 나뭇가지 모양으로 나타낸 그림이에요.</li><li>형질을 공유한 종은 같은 집합에 들어가고, 집합이 겹겹이 포함돼요(턱 ⊃ 네 다리 ⊃ 양막 ⊃ 털·젖).</li></ul>',
      missions: [
        {
          title: '형질 행렬 채우기', goal: '5종이 4가지 형질을 가졌으면 O, 없으면 X로 표를 채우고 확인해요.', manual: true,
          hint: '칠성장어는 턱이 없어요. 형질은 칠성장어에서 고양이로 갈수록 하나씩 더 쌓여요. 양막은 알이나 배를 싸는 막이고 도마뱀과 고양이가 가졌어요.',
          setup() { setMode('matrix'); },
          check() {
            const B = S.mx, miss = 20 - mxFilled(); B.bad.forEach((r) => r.fill(false));
            if (miss) return '아직 비어 있는 칸이 ' + miss + '개 있어요.';
            let n = 0, first = -1; B.v.forEach((r, i) => r.forEach((x, c) => { if (x !== M5[i][c]) { B.bad[i][c] = true; n++; if (first < 0) first = i; } }));
            if (n) return '빨간 칸 ' + n + '개를 다시 살펴봐요. 예를 들어 ' + SP5[first] + '의 형질이에요.';
            return true;
          },
          explain: '턱은 칠성장어를 뺀 4종, 네 다리는 개구리 · 도마뱀 · 고양이, 양막은 도마뱀 · 고양이, 털과 젖은 고양이만 가져요. 가진 종이 점점 줄어드는 포함 관계가 보여요.',
        },
        {
          title: '포함 관계 집합 그림 완성하기', goal: '종 카드를 끌어, 그 종이 가진 가장 안쪽 형질의 영역에 놓아요. 5장을 모두 놓고 확인해요.', manual: true,
          hint: '고양이는 4가지 형질을 모두 가졌으니 가장 안쪽, 칠성장어는 어느 집합에도 속하지 않으니 바깥에 놓아요.',
          setup() { setMode('sets'); },
          check() {
            const p = setsPlaced(); if (p < 5) return '아직 놓지 않은 카드가 ' + (5 - p) + '장 있어요.';
            const w = S.setTok.items.filter((t) => t.region !== M5[t.id].reduce((a, b) => a + b, 0));
            if (w.length) return withJosa(SP5[w[0].id], '은/는') + ' 형질 개수만큼 안쪽 영역에 있어야 해요. (맞지 않는 카드 ' + w.length + '장)';
            return true;
          },
          explain: '종이 가진 형질이 많을수록 더 안쪽 집합에 들어가요. <b>가장 바깥쪽의 턱 집합</b>에는 칠성장어를 뺀 4종이 있고, 가장 안쪽 털·젖 집합에는 고양이만 있어요.',
        },
        {
          type: 'quiz', title: '칠성장어에게만 없는 형질은?', goal: '5종 가운데 칠성장어에게만 없고 나머지 4종은 모두 가진 형질을 골라요.',
          setup() { fillMxAll(); setMode('matrix'); },
          choices: ['턱', '네 다리', '양막', '털·젖'],
          answer: 0,
          feedback: ['', '연어도 네 다리가 없어요.', '연어와 개구리도 양막이 없어요.', '고양이만 털과 젖이 있어요. 나머지 4종에는 없어요.'],
          explain: '턱은 칠성장어를 뺀 모든 종이 가진 형질이라, 칠성장어가 가장 먼저 갈라졌다는 증거가 돼요.',
        },
      ],
    },
    {
      title: '계통수 그리기', short: '계통수 그리기', icon: '🌳', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 형질 행렬로 종 사이의 포함 관계를 확인했어요. 이제 이 관계를 <b>나뭇가지 모양의 계통수</b>로 바꿔요. 가지의 분기점은 <b>공통 조상</b>이고, 그 위에 달린 형질은 이후 갈라진 종들이 <b>공유하는 새 형질</b>(공유 파생 형질)이에요.</div>' +
        '<p>형질 이름표 4개와 종 카드 5장을 끌어 알맞은 칸에 놓아 계통수를 완성해요. 카드를 두 장 눌러 마지막 공통 조상을 찾아볼 수도 있어요.</p>',
      features: ['tree'],
      setup() { resetTree(); setMode('tree'); },
      recap: '계통수의 분기점은 공통 조상이고, 같은 가지에서 가깝게 묶일수록 유연관계가 가까워요. 가지의 좌우 순서는 의미가 없어요.',
      summary: '<ul><li>계통수의 <b>분기점 = 공통 조상</b>, 가지 위의 형질 = 그 아래 종들이 공유하는 <b>공유 파생 형질</b>이에요.</li><li>마지막 공통 조상이 최근일수록 <b>유연관계가 가까워요</b>(도마뱀 · 고양이 &gt; 개구리 · 도마뱀).</li><li>읽는 규칙: 가지의 <b>좌우 순서는 의미가 없고</b>(가지를 뒤집어도 같은 나무), 위쪽에 있다고 더 고등한 것이 아니며, 현생 생물끼리 서로의 조상이 아니에요.</li></ul>',
      missions: [
        {
          title: '계통수 완성하기', goal: '형질 이름표를 가지 위 칸에, 종 카드를 가지 끝 칸에 놓아요. 모두 놓고 확인해요.', manual: true,
          hint: '형질 이름표는 그 형질을 가진 종들이 모두 아래쪽에 모이는 분기에 놓아요. 가장 먼저 갈라진 종에는 형질이 하나도 없어요.',
          setup() { setMode('tree'); },
          check() {
            const sl = trSlots(), Tn = S.tr, r = trCheck();
            if (r.miss) return '아직 비어 있는 칸이 ' + r.miss + '개 있어요.';
            for (const s of sl.tips) { const sp = Tn.spAt[s.id]; if (sp != null) { const m = mismatchOf(s.node, sp); if (m) return m; } }
            if (r.wrong) { const bad = sl.traits.find((s) => Tn.traitAt[s.id] !== s.trait); if (bad) return '"' + TR4[Tn.traitAt[bad.id]] + '" 이름표의 위치를 다시 생각해 봐요. 그 형질을 가진 종이 모두 그 가지 아래에 있어야 해요.'; return '위치가 맞지 않는 카드가 ' + r.wrong + '장 있어요.'; }
            return true;
          },
          explain: '턱은 칠성장어를 뺀 4종이 공유하므로 칠성장어가 갈라진 다음 가지에, 네 다리는 개구리 · 도마뱀 · 고양이가 공유하므로 연어가 갈라진 다음 가지에 놓여요. 가지마다 새 형질이 한 개씩 더해져요.',
        },
        {
          type: 'quiz', title: '계통수 읽기', goal: '완성한 계통수를 보고 옳은 설명을 골라요. 카드를 두 장 눌러 마지막 공통 조상을 확인해도 좋아요.',
          setup() { fillTreeAll(); setMode('tree'); },
          choices: ['도마뱀과 고양이의 마지막 공통 조상이 더 최근이고, 가지를 좌우로 뒤집어도 같은 나무이다', '개구리와 도마뱀이 더 가깝고, 가지를 뒤집으면 다른 나무가 된다', '도마뱀과 고양이가 더 가깝지만, 가지를 뒤집으면 유연관계가 달라진다', '개구리와 도마뱀이 더 가깝지만, 가지를 뒤집어도 같은 나무이다'],
          answer: 0,
          feedback: ['', '도마뱀과 고양이가 양막을 공유하며 더 나중에 갈라졌어요. 또 가지를 뒤집어도 갈라진 순서는 그대로예요.', '가지를 뒤집어도 분기점의 순서는 변하지 않아서 유연관계는 달라지지 않아요.', '도마뱀과 고양이의 공통 조상이 개구리와 도마뱀의 공통 조상보다 더 최근이에요.'],
          explain: '계통수에서는 <b>분기점으로 이어진 순서</b>가 중요해요. 가지의 위아래나 좌우 배치는 그림을 그리는 방식일 뿐이라 가지를 뒤집어도 같은 계통수예요.',
        },
      ],
    },
    {
      title: '분자 계통수', short: '분자 계통수', icon: '🧬', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 형질로 계통수를 그렸어요. 이번에는 <b>염기 서열 차이 수</b> 표에서 차이가 가장 적은 쌍부터 차례로 묶어 계통수를 만들어요. 염기 서열이 비슷할수록 공통 조상에서 갈라진 지 얼마 안 된 가까운 친척이에요.</div>' +
        '<p>표에서 가장 작은 차이 수의 칸을 눌러 두 묶음을 합쳐요. 합친 묶음과 다른 묶음 사이의 차이 수는 두 묶음의 모든 쌍을 평균해서 계산해요.</p>',
      features: ['mol'],
      setup() { resetMol('ae'); setMode('mol'); },
      recap: '염기 서열 차이가 가장 적은 쌍부터 묶으면 계통수가 만들어지고, 형질로 만든 계통수와 같은 결론을 줄 수 있어요.',
      summary: '<ul><li><b>분자 계통수</b>: 염기 서열(분자) 자료의 차이 수가 작은 쌍부터 차례로 묶어 그려요.</li><li>A~E 예: A–B(2) → D–E(4) → (A, B)–C(6) → 마지막으로 두 묶음(8)을 합쳐요.</li><li>형질과 분자 자료가 같은 가지 순서를 주면 계통수의 신뢰가 높아져요(척추동물 5종 예).</li></ul>',
      missions: [
        {
          title: '가상 종 A~E의 계통수 만들기', goal: '표에서 차이 수가 가장 적은 쌍부터 눌러 하나의 계통수로 묶어요.',
          check: () => S.mo.dsDone.ae, hold: 0.4,
          status: () => '🧬 합친 횟수 ' + (S.mo.set === 'ae' ? S.mo.M.joins.length : S.mo.dsDone.ae ? 4 : 0) + ' / 4 · 틀린 선택 ' + (S.mo.set === 'ae' ? S.mo.M.miss : 0) + '번',
          hint: '표에서 가장 작은 숫자를 찾아요. 합치면 표가 줄어들고, 합친 묶음의 차이 수는 평균으로 바뀌어요.',
          setup() { resetMol('ae'); S.mo.dsDone.ae = false; setMode('mol'); },
          explain: 'A–B(2)가 가장 가까워 먼저 묶이고, 다음으로 D–E(4), 그다음 (A, B)–C(6), 마지막으로 두 묶음(8)이 합쳐져요. <b>C는 A, B와 가깝지만 A와 B가 서로 가까운 것보다는 멀어서</b> 더 늦게 합류해요.',
        },
        {
          title: '척추동물 5종: 형질 계통수와 비교하기', goal: '자료를 척추동물 5종으로 바꾸어 계통수를 만들고, 앞 단계의 형질 계통수와 같은지 확인해요.',
          check: () => S.mo.dsDone.vt && S.mo.set === 'vt' && molCanon(molTree(S.mo.M)) === canon(REF), hold: 0.4,
          status: () => '🧬 ' + (S.mo.set === 'vt' ? '합친 횟수 ' + S.mo.M.joins.length + ' / 4' : '아래 패널에서 척추동물 5종 자료를 골라요'),
          hint: '조작 패널에서 "척추동물 5종" 자료를 고르고, 가장 작은 차이 수부터 묶어 봐요.',
          setup() { resetMol('vt'); S.mo.dsDone.vt = false; setMode('mol'); },
          explain: '도마뱀–고양이(2) → 개구리와 그 묶음(4) → 연어(6) → 칠성장어(8) 순서로 묶여요. 이것은 형질로 만든 계통수(칠성장어가 가장 먼저 갈라지고 연어, 개구리, 도마뱀·고양이 순)와 <b>같은 결론</b>이에요.',
        },
        {
          type: 'quiz', title: 'C가 늦게 합류하는 까닭은?', goal: 'A~E 계통수에서 C는 (A, B) 묶음에 차이 수 6에서 합류했어요. 이것이 뜻하는 것은?',
          setup() { fillMolAll('ae'); setMode('mol'); },
          choices: ['C는 A, B와 공통 조상을 갖지만, A와 B의 공통 조상보다 더 오래전에 갈라졌다', 'C는 A와 B의 조상이다', 'C는 D, E와 더 가까운 친척이다', 'C는 A, B보다 더 진화한 생물이다'],
          answer: 0,
          feedback: ['', '계통수에서 현생 생물끼리는 서로의 조상이 아니에요. 공통 조상에서 각각 갈라진 후손이에요.', 'C와 D, E 사이의 차이 수는 8로 가장 커요. A, B와 훨씬 가까워요.', '합류 시점이 늦다고 더 진화한 것이 아니에요. 갈라진 순서와 거리를 나타낼 뿐이에요.'],
          explain: '합류하는 지점의 차이 수가 클수록 공통 조상이 <b>더 오래전</b>이에요. A와 B는 서로 더 최근에 갈라졌고, C는 그보다 먼저 갈라졌어요.',
        },
      ],
    },
    {
      title: '분류 프로그래밍', short: '프로그래밍', icon: '💻', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 형질과 분자 자료로 계통수를 손으로 만들었어요. 이번에는 <b>블록 코딩</b>으로 형질을 쓰는 순서를 정해 계통수와 이분 검색표를 <b>자동으로</b> 출력해요.</div>' +
        '<p>프로그램은 "집단 ← 모든 종, 남은 집단이 2종 이상이면 [형질]이 있다면 가지 A, 아니면 가지 B"를 반복해요. 형질을 쓰는 순서를 바꾸면 계통수의 모양이 달라져요. 공유 파생 형질의 순서가 올바른지 점검해요.</p>',
      features: ['code'],
      setup() { resetPg(); setMode('code'); },
      recap: '형질을 쓰는 순서에 따라 계통수의 모양이 달라지고, 모든 형질을 가진 종이 한 가지로 묶여야 올바른 계통수예요.',
      summary: '<ul><li><b>분류 프로그램</b>: 집단 ← 전체 → 반복(남은 집단이 2종 이상이면 형질로 있다 / 없다 가르기).</li><li>같은 자료라도 <b>형질 순서</b>에 따라 계통수가 달라져요. 식물은 관다발 → 종자 → 씨방 순서가 올바른 계통수를 만들어요.</li><li>동물 9문 자료에서는 후구 형질로 <b>후구동물</b>(극피동물, 척삭동물)과 <b>선구동물</b>이 크게 갈라져요(이름만).</li><li>검색표는 분류를 위한 질문 순서, 계통수는 공통 조상에서 갈라진 순서를 나타내요.</li></ul>',
      missions: [
        {
          title: '식물 8종 계통수 자동 출력하기', goal: '식물 8종 자료에서 형질 순서를 바꿔 ▶ 실행하고, 공유 파생 형질 점검을 통과하는 계통수를 만들어요.',
          check: () => { const g = S.pg; if (!g.ran.plant || g.stale.plant) return false; const t = g.tree.plant; return !!t && checkProgram('plant', t).ok; }, hold: 0.5,
          status: () => { const g = S.pg; const c = g.tree.plant && !g.stale.plant ? checkProgram('plant', g.tree.plant) : null; return '💻 실행 ' + mark(g.ran.plant && !g.stale.plant) + ' · 규칙 점검 ' + mark(!!(c && c.ok)); },
          hint: '관다발, 종자, 씨방 중 가장 많은 종이 가진 형질부터 차례로 쓰면 돼요. 점검 메시지가 어느 형질이 문제인지 알려 줘요.',
          setup() { pgFresh('plant'); S.pg.ds = 'plant'; setMode('code'); updateCtl(); },
          explain: '관다발 → 종자 → 씨방 순서로 쓰면 각 형질을 가진 종이 한 가지로 묶여요. 다른 순서는 검색표로는 쓸 수 있어도 <b>공유 파생 형질이 쌓인 순서</b>와 달라 계통수로는 알맞지 않아요.',
        },
        {
          title: '동물 9개 문의 큰 분기 찾기', goal: '동물 자료로 바꿔 실행하고, 규칙을 만족하는 계통수에서 두 큰 가지(? 이름표)를 눌러 이름을 확인해요.',
          check: () => { const g = S.pg; if (!g.ran.animal || g.stale.animal) return false; const t = g.tree.animal; return !!t && checkProgram('animal', t).ok && g.tapped.fwd && g.tapped.back; }, hold: 0.5,
          status: () => { const g = S.pg; const c = g.tree.animal && !g.stale.animal ? checkProgram('animal', g.tree.animal) : null; return '💻 실행 ' + mark(g.ran.animal && !g.stale.animal) + ' · 규칙 점검 ' + mark(!!(c && c.ok)) + ' · 큰 가지 이름 ' + mark(g.tapped.fwd && g.tapped.back); },
          hint: '동물 9문 자료에서 형질 순서를 조직 → 3배엽 → 후구 → 탈피(또는 후구와 탈피를 서로 바꾼 순서)로 정하고 실행해요.',
          setup() { pgFresh('animal'); S.pg.ds = 'animal'; setMode('code'); updateCtl(); },
          explain: '입(원구)이 항문이 되는 <b>후구동물</b>(극피동물, 척삭동물)과 입이 먼저 생기는 <b>선구동물</b>이 큰 가지로 갈라져요. 선구동물 안에서는 허물을 벗는 무리(선형동물, 절지동물)가 한 가지로 묶여요.',
        },
        {
          type: 'quiz', title: '검색표와 계통수의 차이는?', goal: '검색표와 계통수에 대한 설명으로 옳은 것을 골라요.',
          setup() { setMode('code'); },
          choices: ['검색표는 분류를 위한 질문 순서이고 계통수는 공통 조상에서 갈라진 순서를 나타낸다. 위쪽에 그려졌다고 더 진화한 생물은 아니다', '계통수에서 위쪽에 있는 생물일수록 더 진화한 생물이다', '검색표와 계통수는 같은 그림이라서 형질 순서를 마음대로 정해도 된다', '계통수에서 현생 생물은 서로의 조상이다'],
          answer: 0,
          feedback: ['', '가지의 위아래는 그림을 그린 방식일 뿐이에요. 가지를 뒤집으면 위치가 바뀌어도 같은 계통수예요.', '검색표는 질문 순서를 마음대로 정해도 분류할 수 있지만, 계통수는 공유 파생 형질이 쌓인 순서를 따라야 해요.', '현생 생물끼리는 공통 조상에서 각각 갈라져 나온 후손이에요. 서로의 조상이 아니에요.'],
          explain: '<b>검색표</b>는 생물을 찾기 위한 도구이고 <b>계통수</b>는 공통 조상에서 갈라진 순서(유연관계)를 나타내는 가설이에요. 계통수에서 위쪽, 아래쪽은 진화의 정도와 관계가 없어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-phylogeny', mount: '#game', badge: '계통수 작도가', homeHref: '../../index.html#hb',
    featureLabels: { matrix: '📋 5종 형질 행렬', sets: '🧺 포함 관계 집합 그림', tree: '🌳 계통수 그리기 모형', mol: '🧬 분자(염기 차이) 계통수', code: '💻 분류 프로그래밍' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetMx(); resetSets(); resetTree(); resetMol('ae'); resetPg();
  setMode('matrix');
  let lastFree = false, lastMode = '', lastLv = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && (game.free !== lastFree || game.level !== lastLv)) { lastFree = game.free; lastLv = game.level; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    switch (S.mode) {
      case 'matrix': drawMx(dt, t); break;
      case 'sets': drawSets(dt, t); break;
      case 'tree': drawTree(dt, t); break;
      case 'mol': drawMol(dt, t); break;
      default: drawPg(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,236,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, SP5, TR4, M5, REF, SC, SLOTS, SPTRAY, TKW, TKH, regionOf, slotInside, trSlots, trCheck, mismatchOf, flipNode, pathTo, DSETS, molJoin, molMin, mtCell, molCanon, canon, PSETS, runProgram, checkProgram, runPg, setPgOrder, pgPickRect, mxCell, TRL,
    fillMx: fillMxAll,
    placeAll() { const sl = trSlots(); sl.traits.forEach((s) => { const it = S.trTok.items.find((x) => x.kind === 'tr' && x.id === s.trait); it.slotId = s.id; S.tr.traitAt[s.id] = s.trait; it.x = s.r.x + s.r.w / 2; it.y = s.r.y + s.r.h / 2; }); sl.tips.forEach((s) => { const it = S.trTok.items.find((x) => x.kind === 'sp' && x.id === s.sp); it.slotId = s.id; S.tr.spAt[s.id] = s.sp; it.x = s.r.x + s.r.w / 2; it.y = s.r.y + s.r.h / 2; }); updateCtl(); },
  };
})();
