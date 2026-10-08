/* =========================================================
   중3 Ⅵ. 생식과 유전 - 독립의 법칙  [9과21-04]
   씨 모양(R 둥근 / r 주름진)과 씨 색깔(Y 노란색 / y 초록색), 두 쌍의 대립 형질을 함께 다룹니다.
   ① 관찰: 두 쌍의 대립 형질 → ② 실험: 잡종 1대
   → ③ 설명: 잡종 2대(9 : 3 : 3 : 1, 형질별 3 : 1) → ④ 적용: 독립의 법칙과 예측
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 이 실험의 설정 ---------- */
  const CONFIG = {
    simId: 'm3-mendel-ind',
    badge: '독립의 법칙 탐구왕',
    home: '../../index.html#g3',
    genes: ['R', 'Y'],                              // 씨 모양 + 씨 색깔
    classes: [
      { key: 'RY', name: '둥글고 노란색' }, { key: 'Ry', name: '둥글고 초록색' },
      { key: 'rY', name: '주름지고 노란색' }, { key: 'ry', name: '주름지고 초록색' },
    ],
    parents: ['RRYY', 'rryy'],                      // 보관함의 순종 완두
    f1: 'RrYy',                                     // 잡종 1대
    defaultN: 20,
    resW: 210,                                      // 결과 표 너비 (가로형 배치)
  };

  /* =========================================================
     완두 실험실 공통 코드 (m3-mendel · m3-mendel-ind 공통)
     ========================================================= */
  const GENES = {
    R: { up: 'R', lo: 'r', trait: '씨 모양', dom: '둥근', rec: '주름진', ink: '#c2410c' },
    Y: { up: 'Y', lo: 'y', trait: '씨 색깔', dom: '노란색', rec: '초록색', ink: '#2563eb' },
  };
  const CLASSES = CONFIG.classes;
  const MULTI = CONFIG.genes.length > 1;

  const isUp = (c) => c !== c.toLowerCase();
  const pairs = (g) => g.match(/../g) || [];
  const normPair = (a, b) => (!isUp(a) && isUp(b) ? b + a : a + b);
  const phenoKey = (g) => pairs(g).map((p) => p[0]).join('');      // 정렬된 쌍의 첫 글자 = 나타나는 형질
  const isPure = (g) => pairs(g).every((p) => p[0] === p[1]);
  const geneOf = (c) => (c === '?' ? null : c.toUpperCase());
  function gametesOf(g) {                     // RrYy → [RY, Ry, rY, ry]
    return pairs(g).reduce((acc, p) => {
      const out = [];
      acc.forEach((a) => { out.push(a + p[0]); out.push(a + p[1]); });
      return out;
    }, ['']);
  }
  // 생식세포 종류와 확률 (RR → R 하나, Rr → R ½ · r ½)
  function gameteGroups(g) {
    const all = gametesOf(g), map = new Map();
    all.forEach((gm) => map.set(gm, (map.get(gm) || 0) + 1));
    return Array.from(map, ([gm, c]) => ({ gm, p: c / all.length }));
  }
  const fracText = (p) => (p === 1 ? '모두' : p === 0.5 ? '½' : p === 0.25 ? '¼' : String(p));
  function fuse(ga, gb) {                     // 두 생식세포가 수정 → 자손 유전자형
    let s = '';
    for (let i = 0; i < ga.length; i++) s += normPair(ga[i], gb[i]);
    return s;
  }
  function looks(g) {                         // 완두 그림: 모양, 색
    const k = phenoKey(g);
    const out = { round: true, yellow: true };
    CONFIG.genes.forEach((gn, i) => {
      const dom = k[i] === GENES[gn].up;
      if (gn === 'R') out.round = dom; else out.yellow = dom;
    });
    return out;
  }
  const className = (key) => (CLASSES.find((c) => c.key === key) || {}).name || '';
  const phenoName = (g) => className(phenoKey(g));
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  // 퍼넷 사각형으로 기대 비율 계산
  function expected(ga, gb) {
    const A = gametesOf(ga), B = gametesOf(gb);
    const cnt = {};
    CLASSES.forEach((c) => { cnt[c.key] = 0; });
    A.forEach((a) => B.forEach((b) => { cnt[phenoKey(fuse(a, b))]++; }));
    const vals = CLASSES.map((c) => cnt[c.key]);
    const d = vals.filter((v) => v).reduce(gcd);
    return vals.map((v) => v / d);
  }
  function expectedText(ga, gb) {
    const v = expected(ga, gb);
    const nz = v.filter((x) => x > 0);
    if (nz.length === 1) return '모두 ' + CLASSES[v.findIndex((x) => x > 0)].name;
    return v.join(' : ');
  }
  // 실제 비율 글자. 2가지 표현형: 열성 개수를 1로 (예 3.1 : 1)
  // 4가지 표현형: 예상 비의 합(9+3+3+1=16)에 맞춰 나눔 (예 9.2 : 3.1 : 2.8 : 0.9)
  function ratioText(vals, exp) {
    const nz = vals.filter((v) => v > 0);
    if (!nz.length) return '–';
    if (nz.length === 1) return '모두 ' + CLASSES[vals.findIndex((x) => x > 0)].name;
    if (vals.length === 4 && exp && exp.filter((x) => x > 0).length > 2) {
      const E = exp.reduce((a, b) => a + b, 0), n = vals.reduce((a, b) => a + b, 0);
      return vals.map((v) => (v ? (v * E / n).toFixed(1) : '0')).join(' : ');
    }
    return ratio2(vals[0], vals[vals.length - 1]);
  }
  function ratio2(a, b) {                      // a : b 를 b = 1로
    if (!a && !b) return '–';
    if (!b) return a + ' : 0';
    const r = a / b;
    return (Math.abs(r - Math.round(r)) < 0.05 ? String(Math.round(r)) : r.toFixed(1)) + ' : 1';
  }
  const expOf = (res) => expected(res.a.g, res.b.g);

  /* ---------- 열린 도구 (단계별) ---------- */
  let F = new Set();
  const on = (f) => F.has(f);
  let game = null;
  const isNew = (f) => !!(game && game.isNew(f));

  /* ---------- 상태 ---------- */
  let uid = 0;
  const plant = (g, gen, extra) => Object.assign({ id: 'p' + (++uid), g, gen }, extra || {});
  const P_DOM = plant(CONFIG.parents[0], 0), P_REC = plant(CONFIG.parents[1], 0);
  const S = {
    n: CONFIG.defaultN,
    sorted: false,
    bank: [P_DOM, P_REC],
    slots: [null, null], stamp: [0, 0], result: null,
    drag: null, anim: null, targets: {},
    seq: 0, missionSeq: 0, history: [],
    small: [],            // 자손 4개로 한 교배 결과 기록
    flash: [0, 0], pulse: null, lockTip: null,
  };
  const now = () => performance.now() / 1000;
  const f1Plant = () => S.bank.find((it) => it.g === CONFIG.f1 && it.gen === 1) || null;
  function ensureF1(announce) {
    let it = f1Plant();
    if (!it) {
      it = plant(CONFIG.f1, 1);
      S.bank.push(it);
      S.pulse = { id: it.id, t: now() };
      if (announce) toast('🫛 잡종 1대 완두를 보관함에 넣어 두었어요', 'good');
    }
    return it;
  }
  const titleOf = (it) => phenoName(it.g) + (MULTI ? '' : ' 완두');
  function chipOf(it) {
    if (it.gen === 0) return '순종';
    if (it.gen >= 1) return '잡종 ' + it.gen + '대';
    return isPure(it.g) ? '순종' : '잡종';
  }
  const genName = (gen) => (gen == null ? '' : '잡종 ' + gen + '대(F' + gen + ')');

  /* ---------- 캔버스 배치 ---------- */
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const BG = '#f3f8ef';
  const SLOT_STYLE = [
    { name: '♀ 암술 쪽', col: '#e0518d', soft: '#ffe4ef' },
    { name: '♂ 꽃가루 쪽', col: '#4b7be5', soft: '#e3edff' },
  ];
  // 태블릿(가로·세로)은 가로형 800×560, 휴대폰(599px 이하)은 세로형 480×890
  function makeLayouts() {
    const rx = 792 - CONFIG.resW;
    return {
      wide: {
        w: 800, h: 560,
        bank: { x: 8, y: 8, w: 180, h: 292, titleY: 34, subY: 55, cols: 1, cardX: 16, cardY: 64, cardW: 164, cardH: 70, dx: 0, dy: 76 },
        legend: { x: 8, y: 308, w: 180, h: 244, horiz: false },
        slots: [{ x: 200, y: 32, w: 196, h: 100 }, { x: 596, y: 32, w: 196, h: 100 }], headY: 24,
        flower: { x: 496, y: 82, r: 42 }, capY: 156, longCap: true,
        gamY: 204, merge: { x: 496, y: 238 },
        tray: { x: 200, y: 266, w: rx - 210, h: 286 },
        res: { x: rx, y: 266, w: CONFIG.resW, h: 286, horiz: false },
      },
      tall: {
        w: 480, h: 890,
        bank: { x: 6, y: 6, w: 468, h: 122, titleY: 30, subY: 30, cols: 3, cardX: 12, cardY: 42, cardW: 148, cardH: 74, dx: 152, dy: 0 },
        legend: { x: 6, y: 136, w: 468, h: MULTI ? 66 : 50, horiz: true },
        slots: [{ x: 8, y: 232, w: 182, h: 100 }, { x: 290, y: 232, w: 182, h: 100 }], headY: 224,
        flower: { x: 240, y: 282, r: 36 }, capY: 352, longCap: false,
        gamY: 386, merge: { x: 240, y: 414 },
        tray: { x: 8, y: 436, w: 464, h: 262 },
        res: { x: 8, y: 708, w: 464, h: 176, horiz: true },
      },
    };
  }
  const LAYOUTS = makeLayouts();
  let view, ctx, LAY;
  let BANK, LEGEND, SLOTS, FLOWER, GAM_Y, MERGE, TRAY, PEAS, SORT_BTN, RES;
  function applyLayout(kind) {
    LAY = Object.assign({ kind }, LAYOUTS[kind]);
    BANK = LAY.bank; LEGEND = LAY.legend;
    SLOTS = LAY.slots.map((s, i) => Object.assign({ cx: s.x + s.w / 2 }, s, SLOT_STYLE[i]));
    FLOWER = LAY.flower; GAM_Y = LAY.gamY; MERGE = LAY.merge;
    TRAY = LAY.tray; RES = LAY.res;
    PEAS = { x: TRAY.x + 10, y: TRAY.y + 42, w: TRAY.w - 20, h: TRAY.h - 76 };   // 아래 24px는 안내 글 자리
    SORT_BTN = { x: TRAY.x + TRAY.w - 106, y: TRAY.y + 7, w: 98, h: 30 };
  }

  const bankRect = (i) => ({
    x: BANK.cardX + (i % BANK.cols) * BANK.dx,
    y: BANK.cardY + Math.floor(i / BANK.cols) * BANK.dy,
    w: BANK.cardW, h: BANK.cardH,
  });
  const inR = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const ratioBox = () => (RES.horiz
    ? { x: RES.x + 300, y: RES.y + 36, w: RES.w - 310, h: 72 }
    : { x: RES.x + 8, y: RES.y + RES.h - 80, w: RES.w - 16, h: 72 });

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function font(size, weight) { return (weight || 700) + ' ' + size + 'px ' + FONT; }
  function text(s, x, y, o) {
    o = o || {};
    let size = o.size || 14;
    ctx.font = font(size, o.weight);
    if (o.max) {
      while (size > (o.min || 13) && ctx.measureText(s).width > o.max) { size -= 0.5; ctx.font = font(size, o.weight); }
    }
    ctx.fillStyle = o.color || '#1b2333';
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(s, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  // 유전자 글자를 유전자별 색으로 그리기 (가운데 정렬)
  function alleleText(s, x, y, size, o) {
    o = o || {};
    ctx.font = font(size, 800);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const ws = Array.from(s).map((c) => ctx.measureText(c).width);
    const gap = size * 0.04;
    let tx = x - (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)) / 2;
    Array.from(s).forEach((c, i) => {
      const gn = geneOf(c);
      if (o.halo) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineJoin = 'round'; ctx.strokeText(c, tx, y + 1); }
      ctx.fillStyle = o.color || (gn ? GENES[gn].ink : '#8a95a6');
      ctx.fillText(c, tx, y + 1);
      tx += ws[i] + gap;
    });
    ctx.textBaseline = 'alphabetic';
  }
  // 아직 열리지 않은 자리 (빈자리가 어색한 곳에만 흐리게 표시)
  function lockedBox(r, label, step) {
    ctx.save();
    ctx.setLineDash([7, 6]); ctx.strokeStyle = '#cfd8c8'; ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    rr(r.x, r.y, r.w, r.h, 14); ctx.fill(); ctx.stroke();
    ctx.restore();
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    text('🔒 ' + label, cx, cy - 3, { size: 14, weight: 800, color: '#8d97a6', align: 'center', max: r.w - 16 });
    text(step + '단계에서 열려요', cx, cy + 18, { size: 13, weight: 700, color: '#a3acba', align: 'center' });
  }
  // 새로 열린 도구 강조 (몇 초 동안)
  function newRing(r, rad) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save();
    ctx.strokeStyle = 'rgba(249,115,22,' + (0.35 + a * 0.5).toFixed(2) + ')'; ctx.lineWidth = 4;
    rr(r.x - 5, r.y - 5, r.w + 10, r.h + 10, (rad || 14) + 4); ctx.stroke();
    ctx.fillStyle = '#f97316'; rr(r.x + r.w - 46, r.y - 16, 50, 22, 11); ctx.fill();
    ctx.restore();
    text('NEW', r.x + r.w - 21, r.y - 5, { size: 13, weight: 800, color: '#fff', align: 'center', base: 'middle' });
  }

  /* ---------- 완두 그리기 ---------- */
  function peaColors(round, yellow) {
    if (yellow) return round ? ['#fff3ad', '#f6cc3c', '#b28812'] : ['#f6e08e', '#dcae33', '#8f6c10'];
    return round ? ['#d8f4b6', '#80c652', '#3f7f22'] : ['#c2e59e', '#69aa41', '#386c1e'];
  }
  function peaPath(x, y, r, round, seed) {
    ctx.beginPath();
    if (round) { ctx.arc(x, y, r, 0, Math.PI * 2); return; }
    const n = 18, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 0.9 + 0.07 * Math.sin(a * 5 + seed) + 0.05 * Math.sin(a * 7 + seed * 1.7);
      pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.93]);
    }
    const mid = (i) => { const p = pts[i % n], q = pts[(i + 1) % n]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
    const m0 = mid(n - 1);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(i); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    ctx.closePath();
  }
  function drawPea(x, y, r, round, yellow, seed) {
    const c = peaColors(round, yellow);
    ctx.save();
    peaPath(x, y, r, round, seed || 0);
    if (r > 9) {
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
      g.addColorStop(0, c[0]); g.addColorStop(0.55, c[1]); g.addColorStop(1, c[2]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = c[1];
    ctx.fill();
    ctx.strokeStyle = c[2]; ctx.lineWidth = Math.max(1, r * 0.07); ctx.stroke();
    if (!round) {
      // 주름
      ctx.strokeStyle = 'rgba(60,40,0,.28)'; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = 'round';
      const s = seed || 0;
      const nC = r > 9 ? 3 : 1;
      for (let j = 0; j < nC; j++) {
        const a = s + j * 2.1;
        const cx = x + Math.cos(a) * r * 0.32, cy = y + Math.sin(a) * r * 0.32;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.34, a + 0.7, a + 2.5); ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.36, y - r * 0.38, r * 0.27, r * 0.17, -0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 생식세포 위치 ---------- */
  const singleSlot = () => !on('cross');            // 교배가 열리기 전: 한 자리(자가 수분)만
  function gameteR(m) { return m <= 2 ? 19 : 17; }
  function gametePos(side, k, m) {
    const sp = m <= 2 ? 62 : 42;
    return { x: SLOTS[side].cx + (k - (m - 1) / 2) * sp, y: GAM_Y };
  }
  function tokenRects(side, g) {
    const s = SLOTS[side], n = g.length;
    const w = n === 2 ? 26 : 21, gap = n === 2 ? 6 : 4;
    const x0 = s.x + 64;
    return Array.from(g).map((c, i) => ({ x: x0 + i * (w + gap), y: s.y + 52, w, h: 28, c }));
  }
  // 생식세포 gm의 j번째 글자를 주는 유전자 토큰 번호들
  const tokensFor = (g, gm, j) => [2 * j, 2 * j + 1].filter((t) => g[t] === gm[j]);

  /* =========================================================
     그리기
     ========================================================= */
  function draw() {
    view.clear(BG);
    const t = now();
    drawBank(t);
    drawLegend();
    drawSlots(t);
    drawFlower(t);
    drawGametes(t);
    drawTray(t);
    drawResults(t);
    if (S.anim) drawAnim(t);
    drawNewRings();
    if (S.lockTip && t - S.lockTip.t < 1.4) drawLockTip(t);
    if (S.drag && S.drag.moved) drawGhost();
  }

  function drawNewRings() {
    if (isNew('cross')) newRing(SLOTS[1]);
    if (isNew('results')) newRing(RES);
    if (isNew('genes')) newRing({ x: SLOTS[0].x, y: GAM_Y - 26, w: SLOTS[1].x + SLOTS[1].w - SLOTS[0].x, h: 52 });
    if (isNew('split')) { const b = splitRect(); if (b) newRing(b, 8); }
  }
  function drawLockTip(t) {
    const L = S.lockTip, a = 1 - (t - L.t) / 1.4;
    ctx.save(); ctx.strokeStyle = 'rgba(236,72,153,' + a.toFixed(2) + ')'; ctx.lineWidth = 3;
    const dx = Math.sin((t - L.t) * 40) * 3 * a;
    rr(L.r.x + dx, L.r.y, L.r.w, L.r.h, 14); ctx.stroke(); ctx.restore();
  }
  function ring(x, y, w, h, r, t) {
    const a = 0.55 + 0.45 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(20,160,88,' + a.toFixed(2) + ')'; ctx.lineWidth = 3.5;
    rr(x - 4, y - 4, w + 8, h + 8, r + 4); ctx.stroke();
    ctx.restore();
  }
  function panel(r) {
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.08)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.restore();
  }

  function drawBank(t) {
    panel(BANK);
    text('🫛 씨앗 보관함', BANK.x + 12, BANK.titleY, { size: 15, weight: 800 });
    const sub = on('cross') ? '끌어 놓거나 눌러요' : '눌러서 자리에 놓아요';
    if (BANK.subY === BANK.titleY) text(sub, BANK.x + BANK.w - 12, BANK.subY, { size: 13, color: '#6f7a8c', weight: 600, align: 'right' });
    else text(sub, BANK.x + 12, BANK.subY, { size: 13, color: '#6f7a8c', weight: 600 });
    S.bank.forEach((it, i) => drawCard(bankRect(i), it, t, false));
  }

  function drawCard(r, it, t, ghost) {
    const inSlot = S.slots.includes(it);
    ctx.save();
    if (ghost) { ctx.globalAlpha = 0.92; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; }
    ctx.fillStyle = inSlot ? '#f2faef' : '#f8fafc';
    rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = inSlot ? '#86c96a' : '#dbe2ec'; ctx.lineWidth = 2;
    rr(r.x, r.y, r.w, r.h, 12); ctx.stroke();
    const L = looks(it.g);
    const compact = r.w < 160;
    const pr = compact ? 15 : 18, px = r.x + (compact ? 21 : 26), tx = r.x + (compact ? 40 : 50);
    drawPea(px, r.y + r.h / 2, pr, L.round, L.yellow, parseInt(it.id.slice(1), 10) * 1.7);
    text(titleOf(it), tx, r.y + 29, { size: 14, weight: 800, max: r.x + r.w - tx - 6 });
    const gy = r.y + r.h - 22;
    let cx = tx;
    if (on('genes')) {
      const fs = compact && MULTI ? 15 : 17;
      ctx.font = font(fs, 800);
      const gw = ctx.measureText(it.g).width;
      alleleText(it.g, tx + gw / 2, gy, fs);
      cx = tx + gw + 6;
    }
    let chip = chipOf(it);
    ctx.font = font(13, 800);
    if (cx + ctx.measureText(chip).width + 12 > r.x + r.w - 4) chip = isPure(it.g) ? '순종' : '잡종';
    pureChip(chip, isPure(it.g), cx, gy);
    const T = S.targets;
    if (!ghost && T.ids && T.ids.includes(it.id) && !inSlot) ring(r.x, r.y, r.w, r.h, 12, t);
    if (!ghost && S.pulse && S.pulse.id === it.id && t - S.pulse.t < 1.6) {
      const a = 1 - (t - S.pulse.t) / 1.6;
      ctx.save(); ctx.strokeStyle = 'rgba(236,72,153,' + a.toFixed(2) + ')'; ctx.lineWidth = 4;
      rr(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 14); ctx.stroke(); ctx.restore();
    }
  }
  function pureChip(s, pure, x, cy) {
    ctx.font = font(13, 800);
    const w = ctx.measureText(s).width + 12;
    ctx.fillStyle = pure ? '#e2f6eb' : '#fff4dc'; rr(x, cy - 10, w, 21, 10); ctx.fill();
    text(s, x + w / 2, cy + 1, { size: 13, weight: 800, color: pure ? '#0b6b39' : '#9a5b00', align: 'center', base: 'middle' });
  }

  // 대립 형질 안내판
  function drawLegend() {
    const R = LEGEND;
    panel(R);
    const rows = CONFIG.genes.map((gn) => GENES[gn]);
    const peaOf = (gn, dom) => {
      const L = { round: true, yellow: true };
      if (gn.up === 'R') L.round = dom; else L.yellow = dom;
      return L;
    };
    if (R.horiz) {
      // 휴대폰: 한 줄(또는 두 줄)로 간단히
      rows.forEach((gn, i) => {
        const y = R.y + (rows.length > 1 ? 21 + i * 26 : R.h / 2 + 1);
        text(gn.trait, R.x + 12, y + 5, { size: 13, weight: 800, color: '#6f7a8c' });
        const a = peaOf(gn, true), b = peaOf(gn, false);
        drawPea(R.x + 92, y, 9, a.round, a.yellow, 1);
        text(gn.dom + (on('genes') ? ' ' + gn.up : '') + (on('genes') ? ' (우성)' : ''), R.x + 106, y + 5, { size: 13, weight: 800 });
        text('↔', R.x + 252, y + 5, { size: 14, weight: 800, color: '#9aa5b6', align: 'center' });
        drawPea(R.x + 278, y, 9, b.round, b.yellow, 2);
        text(gn.rec + (on('genes') ? ' ' + gn.lo : '') + (on('genes') ? ' (열성)' : ''), R.x + 292, y + 5, { size: 13, weight: 800 });
      });
      return;
    }
    text(rows.length > 1 ? '🔎 두 쌍의 대립 형질' : '🔎 대립 형질', R.x + 12, R.y + 27, { size: 15, weight: 800 });
    const one = rows.length === 1;
    if (!one) {
      ctx.strokeStyle = '#e6ebf2'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(R.x + 14, R.y + 139); ctx.lineTo(R.x + R.w - 14, R.y + 139); ctx.stroke();
    }
    rows.forEach((gn, i) => {
      const top = one ? R.y + 50 : R.y + 40 + i * 104;
      const pr = one ? 26 : 16;
      const py = one ? top + 52 : top + 36;
      const xa = R.x + 48, xb = R.x + R.w - 48;
      text(gn.trait, R.x + R.w / 2, top + (one ? 6 : 8), { size: 13, weight: 800, color: '#6f7a8c', align: 'center' });
      const a = peaOf(gn, true), b = peaOf(gn, false);
      drawPea(xa, py, pr, a.round, a.yellow, 1.3);
      drawPea(xb, py, pr, b.round, b.yellow, 2.2);
      text('↔', R.x + R.w / 2, py + 6, { size: 18, weight: 800, color: '#9aa5b6', align: 'center' });
      const ny = py + pr + (one ? 20 : 19);
      text(gn.dom, xa, ny, { size: 14, weight: 800, align: 'center' });
      text(gn.rec, xb, ny, { size: 14, weight: 800, align: 'center' });
      if (on('genes')) {
        if (one) {
          const ly = ny + 30;
          alleleText(gn.up, xa, ly - 5, 22);
          alleleText(gn.lo, xb, ly - 5, 22);
          tag('우성', xa, ly + 24, true); tag('열성', xb, ly + 24, false);
        } else {
          const ly = ny + 21;
          alleleText(gn.up, xa - 15, ly - 5, 17);
          alleleText(gn.lo, xb - 15, ly - 5, 17);
          text('우성', xa - 5, ly, { size: 13, weight: 800, color: '#0b6b39' });
          text('열성', xb - 5, ly, { size: 13, weight: 800, color: '#7f8a9b' });
        }
      }
    });
  }
  function tag(s, cx, cy, strong) {
    ctx.font = font(13, 800);
    const w = ctx.measureText(s).width + 14;
    ctx.fillStyle = strong ? '#e2f6eb' : '#eef1f6'; rr(cx - w / 2, cy - 11, w, 22, 11); ctx.fill();
    text(s, cx, cy + 1, { size: 13, weight: 800, color: strong ? '#0b6b39' : '#6f7a8c', align: 'center', base: 'middle' });
  }

  function drawSlots(t) {
    SLOTS.forEach((s, i) => {
      if (i === 1 && singleSlot()) {
        text('♂ 다른 완두', s.cx, LAY.headY, { size: 14, weight: 800, color: '#a3acba', align: 'center' });
        lockedBox(s, '다른 완두와 교배', 2);
        return;
      }
      const it = S.slots[i];
      const head = i === 0 && singleSlot() ? '🌼 자가 수분할 완두' : s.name;
      text(head, s.cx, LAY.headY, { size: 14, weight: 800, color: s.col, align: 'center' });
      const over = S.drag && S.drag.moved && inR(S.drag, s);
      ctx.save();
      ctx.fillStyle = over ? s.soft : it ? '#fff' : 'rgba(255,255,255,.6)';
      rr(s.x, s.y, s.w, s.h, 14); ctx.fill();
      if (!it) ctx.setLineDash([7, 5]);
      ctx.strokeStyle = over ? s.col : it ? s.col : '#b9c4d4'; ctx.lineWidth = over ? 3 : 2;
      rr(s.x, s.y, s.w, s.h, 14); ctx.stroke();
      ctx.restore();
      const fl = t - S.flash[i];
      if (fl < 0.5) {
        ctx.save(); ctx.strokeStyle = s.col; ctx.globalAlpha = 1 - fl / 0.5; ctx.lineWidth = 3;
        rr(s.x - fl * 14, s.y - fl * 14, s.w + fl * 28, s.h + fl * 28, 14 + fl * 10); ctx.stroke(); ctx.restore();
      }
      if (!it) {
        text('＋', s.cx, s.y + 44, { size: 28, weight: 700, color: '#b9c4d4', align: 'center', base: 'middle' });
        text('완두를 여기로', s.cx, s.y + 80, { size: 13, weight: 700, color: '#7f8a9b', align: 'center' });
        if (S.targets.ids && S.targets.ids.length) ring(s.x, s.y, s.w, s.h, 14, t);
        return;
      }
      const L = looks(it.g);
      drawPea(s.x + 34, s.y + 56, 24, L.round, L.yellow, parseInt(it.id.slice(1), 10) * 1.7);
      text(titleOf(it), s.x + 64, s.y + 36, { size: 14, weight: 800, max: s.w - 70 });
      if (on('genes')) {
        tokenRects(i, it.g).forEach((tk) => {
          const gn = geneOf(tk.c);
          ctx.fillStyle = '#fff'; rr(tk.x, tk.y, tk.w, tk.h, 7); ctx.fill();
          ctx.strokeStyle = GENES[gn].ink; ctx.lineWidth = 2; ctx.stroke();
          alleleText(tk.c, tk.x + tk.w / 2, tk.y + tk.h / 2, it.g.length === 2 ? 18 : 16);
        });
      } else {
        pureChip(chipOf(it), isPure(it.g), s.x + 64, s.y + 66);
      }
      // 비우기 표시
      ctx.fillStyle = '#eef1f6'; ctx.beginPath(); ctx.arc(s.x + s.w - 14, s.y + 14, 10, 0, Math.PI * 2); ctx.fill();
      text('✕', s.x + s.w - 14, s.y + 15, { size: 13, weight: 800, color: '#6b768a', align: 'center', base: 'middle' });
    });
  }

  function canGo() { return !S.anim && !!(S.slots[0] || S.slots[1]); }
  function drawFlower(t) {
    const [a, b] = S.slots;
    const ready = canGo();
    const f = FLOWER;
    const spin = S.anim ? (t - S.anim.t0) * 2.2 : 0;
    const pulse = ready ? 1 + 0.04 * Math.sin(t * 5) : 1;
    const lit = ready || !!S.anim;
    ctx.save();
    ctx.translate(f.x, f.y); ctx.scale(pulse, pulse); ctx.rotate(spin);
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate((i / 5) * Math.PI * 2);
      ctx.fillStyle = lit ? '#f9a8d4' : '#e2e6ee';
      ctx.strokeStyle = lit ? '#ec4899' : '#c3cad6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -f.r * 0.56, f.r * 0.36, f.r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = lit ? '#fde047' : '#eef1f6';
    ctx.beginPath(); ctx.arc(0, 0, f.r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = lit ? '#eab308' : '#c3cad6'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    const crossing = !!(a && b && a !== b);
    text(crossing ? '교배' : '수분', f.x, f.y + 1, { size: 15, weight: 800, color: lit ? '#7a3b00' : '#9aa5b6', align: 'center', base: 'middle' });
    let cap;
    if (S.anim) cap = S.anim.res.self ? '🌼 자가 수분 중…' : '🌸 교배 중…';
    else if (singleSlot()) cap = a ? '꽃을 누르면 자가 수분' : '완두를 놓아요';
    else if (a && b) cap = a === b ? '🌼 자가 수분' : LAY.longCap ? '타가 수분 (다른 개체끼리)' : '타가 수분';
    else if (a || b) cap = LAY.longCap ? '한쪽만 놓으면 자가 수분' : '자가 수분 가능';
    else cap = LAY.longCap ? '♀ × ♂ 부모를 놓아요' : '부모를 놓아요';
    text(cap, f.x, LAY.capY, { size: 13, weight: 700, color: a || b ? '#be185d' : '#7f8a9b', align: 'center', max: LAY.longCap ? 196 : 96 });
    if (ready && S.targets.flower) {
      const al = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.save(); ctx.strokeStyle = 'rgba(20,160,88,' + al.toFixed(2) + ')'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  function drawGametes(t) {
    if (!on('genes')) {
      // 유전자를 배우기 전: 꽃 → 자손 트레이 화살표만
      const x = FLOWER.x, y0 = LAY.capY + 12, y1 = TRAY.y - 8;
      ctx.save();
      ctx.strokeStyle = '#c2cbb9'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1 - 8); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#c2cbb9';
      ctx.beginPath(); ctx.moveTo(x - 9, y1 - 12); ctx.lineTo(x + 9, y1 - 12); ctx.lineTo(x, y1); ctx.closePath(); ctx.fill();
      ctx.restore();
      text('씨(자손)', x + 14, (y0 + y1) / 2 + 5, { size: 13, weight: 700, color: '#8d97a6' });
      return;
    }
    const A = S.anim;
    const el = A ? t - A.t0 : 99;
    const any = S.slots[0] || S.slots[1];
    if (!any) {
      text(LAY.longCap ? '부모를 놓으면 생식세포(유전자를 하나씩 가진 세포)가 나타나요' : '부모를 놓으면 생식세포가 나타나요',
        (SLOTS[0].x + SLOTS[1].x + SLOTS[1].w) / 2, GAM_Y + 5, { size: 13, weight: 700, color: '#8a95a6', align: 'center', max: SLOTS[1].x + SLOTS[1].w - SLOTS[0].x - 20 });
      return;
    }
    S.slots.forEach((it, side) => {
      if (!it || (side === 1 && singleSlot())) return;
      const g = it.g;
      const groups = gameteGroups(g);
      const toks = tokenRects(side, g);
      const appear = A ? clamp((el - 0.35) / 0.2, 0, 1) : 1;
      // 분리 선: 유전자 토큰 → 생식세포
      ctx.save();
      ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
      groups.forEach((gr, k) => {
        const gp = gametePos(side, k, groups.length);
        Array.from(gr.gm).forEach((c, j) => {
          tokensFor(g, gr.gm, j).forEach((ti) => {
            const tk = toks[ti];
            ctx.strokeStyle = GENES[geneOf(c)].ink + '55';
            ctx.beginPath(); ctx.moveTo(tk.x + tk.w / 2, tk.y + tk.h + 2); ctx.lineTo(gp.x, gp.y - gameteR(groups.length) - 2); ctx.stroke();
          });
        });
      });
      ctx.restore();
      groups.forEach((gr, k) => {
        const gp = gametePos(side, k, groups.length);
        const r = gameteR(groups.length);
        if (appear <= 0) return;
        ctx.save(); ctx.globalAlpha = appear;
        gameteCircle(gp.x, gp.y, r * (A ? 0.6 + 0.4 * appear : 1), gr.gm, side);
        ctx.restore();
        text(fracText(gr.p), gp.x, gp.y + r + 16, { size: 13, weight: 700, color: '#6f7a8c', align: 'center' });
      });
    });
    if (!singleSlot() && (!A || el > 2.4)) {
      text(LAY.longCap ? '◀  생식세포  ▶' : '◀ 생식세포 ▶', MERGE.x, GAM_Y + 5, { size: 13, weight: 800, color: '#6f7a8c', align: 'center' });
    } else if (singleSlot() && (!A || el > 2.4)) {
      text('◀ 생식세포', SLOTS[0].x + SLOTS[0].w + 12, GAM_Y + 5, { size: 13, weight: 800, color: '#6f7a8c' });
    }
  }
  function gameteCircle(x, y, r, letters, side) {
    const s = SLOTS[side];
    ctx.fillStyle = s.soft; ctx.strokeStyle = s.col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    alleleText(letters, x, y, letters.length === 1 ? Math.min(18, r * 0.95) : Math.max(13, Math.min(15, r * 0.82)));
  }

  /* ---------- 자손 트레이 ---------- */
  function drawTray(t) {
    ctx.save();
    const g = ctx.createLinearGradient(0, TRAY.y, 0, TRAY.y + TRAY.h);
    g.addColorStop(0, '#6b5644'); g.addColorStop(1, '#58463a');
    ctx.fillStyle = g; rr(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 14); ctx.fill();
    ctx.strokeStyle = '#4a3b30'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    const res = S.result;
    if (!res) {
      text('자손 트레이', TRAY.x + 14, TRAY.y + 26, { size: 14, weight: 800, color: '#f6efe6' });
      text(on('cross') ? '🌸 교배하면 자손 완두(씨)가 여기에 나와요' : '🌼 자가 수분하면 자손 완두(씨)가 여기에 나와요',
        TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h / 2 + 14, { size: 14, weight: 700, color: 'rgba(246,239,230,.82)', align: 'center', max: TRAY.w - 24 });
      return;
    }
    const shown = revealed(res, t);
    const gn = genName(res.gen);
    text((gn ? gn + ' · ' : '자손 · ') + shown + '개', TRAY.x + 14, TRAY.y + 26, { size: 14, weight: 800, color: '#f6efe6', max: SORT_BTN.x - TRAY.x - 24 });
    if (on('results')) {
      const sb = SORT_BTN;
      ctx.fillStyle = S.sorted ? '#fde68a' : 'rgba(255,255,255,.18)';
      rr(sb.x, sb.y, sb.w, sb.h, 15); ctx.fill();
      text(S.sorted ? '섞어 보기' : '모아 보기', sb.x + sb.w / 2, sb.y + sb.h / 2 + 1, { size: 13, weight: 800, color: S.sorted ? '#6b4a00' : '#f6efe6', align: 'center', base: 'middle' });
    }
    const A = S.anim && S.anim.res === res ? S.anim : null;
    const el = A ? t - A.t0 : 99;
    const r = res.r;
    const showText = on('genes') && r >= (MULTI ? 16 : 13);   // 자손이 많으면 글자 생략 (모양이 잘 보이도록)
    const fs = clamp(r * (MULTI ? 0.55 : 0.78), 13, 18);
    res.kids.forEach((k, i) => {
      let sc = 1;
      if (A) {
        const pt = popTime(i, res.n, A.p0);
        if (el < pt) return;
        const u = (el - pt) / 0.18;
        sc = u >= 1 ? 1 : 0.3 + Math.sin(u * Math.PI * 0.75) * 0.95;
      }
      const L = looks(k.g);
      drawPea(k.x, k.y, r * sc, L.round, L.yellow, k.seed);
      if (showText && sc >= 1) alleleText(k.g, k.x, k.y, fs, { halo: true });
    });
    if (on('genes') && !showText && !A && res.sel < 0) {
      const note = '🧬 자손이 많아 유전자형 글자는 생략' + (MULTI ? ' (20개에서 보여요)' : ' → 결과 표');
      ctx.font = font(13, 800);
      const w = Math.min(TRAY.w - 16, ctx.measureText(note).width + 20);
      ctx.fillStyle = 'rgba(30,22,16,.6)'; rr(TRAY.x + (TRAY.w - w) / 2, TRAY.y + TRAY.h - 29, w, 24, 12); ctx.fill();
      text(note, TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h - 16, { size: 13, weight: 800, color: '#fdf6ec', align: 'center', base: 'middle', max: w - 14 });
    }
    // 선택한 자손
    if (res.sel >= 0 && !A) {
      const k = res.kids[res.sel];
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(k.x, k.y, r + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(k.x, k.y, r + 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      const lab = phenoName(k.g) + (on('genes') ? ' · ' + k.g : '');
      ctx.font = font(14, 800);
      const w = ctx.measureText(lab).width + 18;
      const bx = clamp(k.x - w / 2, TRAY.x + 6, TRAY.x + TRAY.w - w - 6);
      let by = k.y - r - 38;
      if (by < PEAS.y - 8) by = k.y + r + 10;      // 위쪽 줄이면 머리글과 겹치지 않게 아래에 표시
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#fff'; rr(bx, by, w, 27, 13); ctx.fill(); ctx.restore();
      text(lab, bx + w / 2, by + 14, { size: 14, weight: 800, align: 'center', base: 'middle' });
    }
  }
  const POP_DUR = 1.0;
  const popTime = (i, n, p0) => p0 + POP_DUR * (i / Math.max(1, n));
  function revealed(res, t) {
    const A = S.anim && S.anim.res === res ? S.anim : null;
    if (!A) return res.n;
    const el = t - A.t0;
    if (el < A.p0) return 0;
    return Math.min(res.n, Math.floor(((el - A.p0) / POP_DUR) * res.n) + 1);
  }
  function countsOf(res, upto) {
    const c = {}, gc = {};
    CLASSES.forEach((k) => { c[k.key] = 0; });
    for (let i = 0; i < upto; i++) { const k = res.kids[i]; c[k.key]++; gc[k.g] = (gc[k.g] || 0) + 1; }
    return { vals: CLASSES.map((k) => c[k.key]), gc };
  }
  // 두 형질: 형질별로 나누어 센 수 [[둥근, 주름진], [노란색, 초록색]]
  function splitCounts(vals) { return [[vals[0] + vals[1], vals[2] + vals[3]], [vals[0] + vals[2], vals[1] + vals[3]]]; }
  function splitRect() {
    if (!MULTI || !on('results')) return null;
    return RES.horiz ? { x: RES.x + 300, y: RES.y + 116, w: RES.w - 310, h: 52 } : { x: RES.x + 8, y: RES.y + 166, w: RES.w - 16, h: 36 };
  }

  /* ---------- 결과 표 ---------- */
  function drawResults(t) {
    if (!on('results')) { lockedBox(RES, '결과 표', 2); return; }
    panel(RES);
    text('📊 결과 (표현형)', RES.x + 12, RES.y + 25, { size: 14, weight: 800 });
    const res = S.result;
    const H = RES.horiz;
    if (!res) {
      const cy = H ? RES.y + RES.h / 2 + 4 : RES.y + RES.h / 2;
      text('교배 결과가', H ? RES.x + RES.w / 2 : RES.x + RES.w / 2, cy - 10, { size: 13, weight: 700, color: '#7f8a9b', align: 'center' });
      text('여기에 나와요', RES.x + RES.w / 2, cy + 10, { size: 13, weight: 700, color: '#7f8a9b', align: 'center' });
      return;
    }
    const shown = revealed(res, t);
    const { vals, gc } = countsOf(res, shown);
    const x0 = RES.x + 12, x1 = H ? RES.x + 288 : RES.x + RES.w - 12;
    const step = MULTI ? (H ? 33 : 32) : 52;
    CLASSES.forEach((c, i) => {
      const y0 = RES.y + (MULTI ? 34 : 40) + i * step;
      const L = looks(c.key.split('').map((ch) => ch + ch).join(''));
      drawPea(x0 + 9, y0 + 9, MULTI ? 8 : 11, L.round, L.yellow, i * 2.3);
      text(c.name, x0 + (MULTI ? 22 : 26), y0 + 14, { size: MULTI ? 13 : 14, weight: 800, max: x1 - x0 - (MULTI ? 62 : 70) });
      text(String(vals[i]), x1, y0 + 14, { size: MULTI ? 14 : 16, weight: 800, align: 'right' });
      const barW = x1 - x0, bh = MULTI ? 6 : 10, by = y0 + (MULTI ? 21 : 26);
      ctx.fillStyle = '#eef2f7'; rr(x0, by, barW, bh, bh / 2); ctx.fill();
      const frac = shown ? vals[i] / shown : 0;
      if (frac > 0) {
        ctx.fillStyle = peaColors(L.round, L.yellow)[L.round ? 1 : 2];
        rr(x0, by, Math.max(bh, barW * frac), bh, bh / 2); ctx.fill();
      }
    });
    const box = ratioBox();
    // 유전자형 수 (한 가지 형질, 유전자를 배운 뒤)
    if (!MULTI && on('genes')) {
      const gene = GENES[CONFIG.genes[0]];
      const gs = [gene.up + gene.up, gene.up + gene.lo, gene.lo + gene.lo];
      const gx = H ? box.x + 6 : RES.x + 12, gw = H ? box.w - 8 : RES.w - 24;
      const gy = H ? RES.y + 132 : RES.y + 160;
      text('유전자형 ' + gs.join(' : '), gx, gy, { size: 13, weight: 700, color: '#6f7a8c', max: gw });
      text(gs.map((g) => gc[g] || 0).join(' : '), gx, gy + 21, { size: 15, weight: 800, max: gw });
    }
    // 형질별로 나누어 본 비 (두 가지 형질)
    const sr = splitRect();
    if (sr && on('split')) {
      const sc = splitCounts(vals);
      [[GENES.R.dom + ' : ' + GENES.R.rec, sc[0]], [GENES.Y.dom + ' : ' + GENES.Y.rec, sc[1]]].forEach((row, i) => {
        const y = sr.y + 14 + i * (H ? 22 : 19);
        text(row[0], sr.x + 6, y, { size: 13, weight: 700, color: '#6f7a8c', max: sr.w - 70 });
        text(shown ? ratio2(row[1][0], row[1][1]) : '–', sr.x + sr.w - 6, y, { size: 14, weight: 800, color: '#14532d', align: 'right' });
      });
    }
    // 비율 상자
    ctx.fillStyle = '#f5f8fd'; rr(box.x, box.y, box.w, box.h, 10); ctx.fill();
    const ev = expOf(res);
    const lab = MULTI && ev.filter((x) => x > 0).length > 2 ? '표현형 비 (합 ' + ev.reduce((p, q) => p + q, 0) + ' 기준)' : '표현형 비';
    const rt = shown ? ratioText(vals, ev) : '–';
    if (on('punnett')) {
      text(lab, box.x + 8, box.y + 19, { size: 13, weight: 700, color: '#6f7a8c', max: box.w - 14 });
      text(rt, box.x + 8, box.y + 43, { size: MULTI ? 16 : 19, weight: 800, color: '#14532d', max: box.w - 14 });
      text('🧮 예상 ' + expectedText(res.a.g, res.b.g), box.x + 8, box.y + 63, { size: 13, weight: 700, color: '#6f7a8c', max: box.w - 14 });
    } else {
      text(lab, box.x + 8, box.y + 25, { size: 13, weight: 700, color: '#6f7a8c', max: box.w - 14 });
      text(rt, box.x + 8, box.y + 53, { size: MULTI ? 16 : 19, weight: 800, color: '#14532d', max: box.w - 14 });
    }
  }

  /* ---------- 교배 애니메이션 ---------- */
  function drawAnim(t) {
    const A = S.anim;
    if (!A.genes) { drawPollen(t); return; }
    const el = t - A.t0, res = A.res;
    const sides = A.single ? [0] : [0, 1];
    // ① 분리: 유전자 토큰이 생식세포로 이동
    if (el < 0.6) {
      sides.forEach((side) => {
        const g = A.g[side];
        const groups = gameteGroups(g);
        const toks = tokenRects(side, g);
        const u = clamp(el / 0.5, 0, 1), e = u * u * (3 - 2 * u);
        groups.forEach((gr, k) => {
          const gp = gametePos(side, k, groups.length);
          Array.from(gr.gm).forEach((c, j) => {
            const tk = toks[tokensFor(g, gr.gm, j)[0]];
            const off = gr.gm.length === 1 ? 0 : (j - 0.5) * 11;
            const x = tk.x + tk.w / 2 + (gp.x + off - tk.x - tk.w / 2) * e;
            const y = tk.y + tk.h / 2 + (gp.y - tk.y - tk.h / 2) * e;
            ctx.save(); ctx.globalAlpha = 1 - clamp((el - 0.45) / 0.15, 0, 1);
            alleleText(c, x, y, 17, { halo: true });
            ctx.restore();
          });
        });
      });
      if (el > 0.1) text('분리!', A.single ? SLOTS[0].x + SLOTS[0].w + 40 : MERGE.x, GAM_Y + 5, { size: 15, weight: 800, color: '#be185d', align: 'center' });
    }
    // ② 수정: 생식세포가 만나 자손이 됨
    const K = Math.min(6, res.n);
    const gA = gameteGroups(A.g[0]), gB = gameteGroups(A.g[1]);
    const allA = gametesOf(A.g[0]), allB = gametesOf(A.g[1]);
    const mx = A.single ? SLOTS[0].x + SLOTS[0].w + 50 : MERGE.x;
    for (let e = 0; e < K; e++) {
      const st = 0.55 + e * 0.13;
      const u = (el - st) / 0.42;
      if (u < 0 || u > 2.1) continue;
      const kid = res.kids[e];
      const ga = allA[kid.ia], gb = allB[kid.ib];
      const ka = gA.findIndex((x) => x.gm === ga), kb = gB.findIndex((x) => x.gm === gb);
      const pa = gametePos(0, ka, gA.length), pb = gametePos(A.single ? 0 : 1, kb, gB.length);
      const r = gA.length <= 2 ? 15 : 13;
      if (u <= 1) {
        const ee = u * u * (3 - 2 * u);
        gameteCircle(pa.x + (mx - 16 - pa.x) * ee, pa.y + (MERGE.y - pa.y) * ee, r, ga, 0);
        gameteCircle(pb.x + (mx + 16 - pb.x) * ee, pb.y + (MERGE.y - pb.y) * ee, r, gb, 1);
      } else {
        const v = clamp(u - 1, 0, 1);
        const zx = mx, zy = MERGE.y + v * 60;
        ctx.save(); ctx.globalAlpha = 1 - clamp((u - 1.6) / 0.5, 0, 1);
        ctx.fillStyle = '#ecfccb'; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(zx, zy, r + 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        alleleText(fuse(ga, gb), zx, zy, ga.length === 1 ? 15 : 13);
        ctx.restore();
      }
    }
    if (el > 0.6 && el < 2.0) text('수정!', mx, MERGE.y - 24, { size: 15, weight: 800, color: '#15803d', align: 'center' });
  }
  // 유전자를 배우기 전: 꽃가루가 꽃으로 날아가는 모습만
  function drawPollen(t) {
    const A = S.anim, el = t - A.t0;
    if (el > 0.75) return;
    const s = SLOTS[A.single ? 0 : 1];
    const sx = s.cx, sy = s.y + s.h / 2;
    for (let k = 0; k < 8; k++) {
      const u = clamp((el - k * 0.03) / 0.45, 0, 1);
      if (u <= 0 || u >= 1) continue;
      const e = u * u * (3 - 2 * u);
      const x = sx + (FLOWER.x - sx) * e + Math.sin(k * 1.7 + el * 9) * 6;
      const y = sy + (FLOWER.y - sy) * e - Math.sin(u * Math.PI) * 34 + (k - 3.5) * 2;
      ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  function drawGhost() {
    const d = S.drag;
    drawCard({ x: d.x - BANK.cardW / 2, y: d.y - BANK.cardH / 2, w: BANK.cardW, h: BANK.cardH }, d.item, now(), true);
  }

  /* ---------- 자손 배치 ---------- */
  function layoutKids(res, snap) {
    const n = res.kids.length;
    let best = { c: 1, rws: n, s: 0 };
    for (let c = 1; c <= n; c++) {
      const rws = Math.ceil(n / c);
      const s = Math.min(PEAS.w / c, PEAS.h / rws);
      if (s > best.s) best = { c, rws, s };
    }
    res.cell = best.s;
    res.r = Math.min(30, best.s * 0.42);
    const order = res.kids.map((k, i) => i);
    if (S.sorted) {
      const ci = (k) => CLASSES.findIndex((c) => c.key === k.key);
      order.sort((a, b) => ci(res.kids[a]) - ci(res.kids[b]) || (res.kids[a].g < res.kids[b].g ? -1 : res.kids[a].g > res.kids[b].g ? 1 : a - b));
    }
    const gw = best.c * best.s, gh = best.rws * best.s;
    const ox = PEAS.x + (PEAS.w - gw) / 2, oy = PEAS.y + (PEAS.h - gh) / 2;
    order.forEach((ki, slot) => {
      const k = res.kids[ki];
      const col = slot % best.c, row = Math.floor(slot / best.c);
      k.tx = ox + (col + 0.5) * best.s;
      k.ty = oy + (row + 0.5) * best.s;
      if (snap) { k.x = k.tx; k.y = k.ty; }
    });
  }
  function stepKids(dt) {
    const res = S.result;
    if (!res) return;
    const f = Math.min(1, dt * 9);
    res.kids.forEach((k) => { k.x += (k.tx - k.x) * f; k.y += (k.ty - k.y) * f; });
  }
  function kidAt(p) {
    const res = S.result;
    if (!res || !inR(p, PEAS, 6)) return -1;
    let bi = -1, bd = Infinity;
    res.kids.forEach((k, i) => { const d = Math.hypot(k.x - p.x, k.y - p.y); if (d < bd) { bd = d; bi = i; } });
    return bd <= Math.max(res.r + 6, res.cell * 0.6) ? bi : -1;
  }

  /* ---------- 조작 ---------- */
  function placeItem(side, item) {
    if (singleSlot()) { side = 0; S.slots[1] = null; }
    S.slots[side] = item;
    S.stamp[side] = now();
    S.flash[side] = now();
    Sound.click();
    changed();
  }
  function tapBank(item) {
    const side = singleSlot() ? 0 : S.slots[0] ? (S.slots[1] ? (S.stamp[0] <= S.stamp[1] ? 0 : 1) : 1) : 0;
    placeItem(side, item);
  }
  function clearSlot(side) {
    S.slots[side] = null;
    if (singleSlot()) S.slots = [null, null];
    Sound.tick();
    changed();
  }
  function lockTap(r, step, what) {
    S.lockTip = { r, t: now() };
    Sound.tick();
    toast('🔒 ' + what + '은(는) ' + step + '단계에서 열려요');
  }
  function doCross(selfPlant) {
    if (S.anim) return;
    if (selfPlant) { S.slots = [selfPlant, selfPlant]; S.stamp = [now(), now()]; S.flash = [now(), now()]; changed(); }
    const [a, b] = S.slots;
    if (!a || !b) {
      Sound.fail();
      toast(on('cross') ? '♀ 자리와 ♂ 자리에 부모 완두를 모두 놓아 주세요' : '먼저 완두를 자리에 놓아 주세요', 'bad');
      return;
    }
    hideHint();
    const GA = gametesOf(a.g), GB = gametesOf(b.g);
    const kids = [];
    for (let i = 0; i < S.n; i++) {
      const ia = Math.floor(Math.random() * GA.length), ib = Math.floor(Math.random() * GB.length);
      const g = fuse(GA[ia], GB[ib]);
      kids.push({ g, key: phenoKey(g), ia, ib, seed: Math.random() * 10, x: 0, y: 0, tx: 0, ty: 0 });
    }
    // 세대: 순종끼리 교배 → 잡종 1대, 잡종 1대 자가 수분 → 잡종 2대 (순종의 자가 수분은 세대 표시 없음)
    let gen = null;
    if (a.gen != null && a.gen === b.gen && !(a === b && a.gen === 0)) gen = a.gen + 1;
    const res = { seq: 0, a: { id: a.id, g: a.g, gen: a.gen }, b: { id: b.id, g: b.g, gen: b.gen }, self: a === b, n: S.n, kids, gen, sel: -1, done: false };
    layoutKids(res, true);
    S.result = res;
    const genes = on('genes');
    const p0 = genes ? 1.15 : 0.6;
    S.anim = { t0: now(), res, g: [a.g, b.g], single: singleSlot(), ticks: 0, genes, p0, end: p0 + POP_DUR + 0.3 };
    Sound.tone(660, 0.12, 'triangle', 0.08); Sound.tone(880, 0.14, 'triangle', 0.07, 0.08);
    updateButtons();
    revealScene();
  }
  function selfOrCross() {
    const [a, b] = S.slots;
    if (a && b) doCross();
    else if (a || b) doCross(a || b);
    else doCross();
  }
  // 휴대폰(세로형)에서 교배하면 부모 → 자손 장면이 화면에 보이도록 스크롤
  function revealScene() {
    if (LAY.kind !== 'tall') return;
    const r = view.canvas.getBoundingClientRect();
    const head = ($('.sim-header') || { offsetHeight: 0 }).offsetHeight;
    const top = r.top + view.scale * (LAY.headY - 18);
    const bottom = r.top + view.scale * (TRAY.y + TRAY.h);
    if (top < head || bottom > window.innerHeight) {
      try { window.scrollBy({ top: top - head - 6, behavior: 'smooth' }); } catch (e) { window.scrollBy(0, top - head - 6); }
    }
  }
  function stepAnim() {
    const A = S.anim;
    if (!A) return;
    const el = now() - A.t0;
    const want = Math.min(8, revealed(A.res, now()));
    if (want > A.ticks && el > A.p0) { A.ticks = want; Sound.tick(); }
    if (el >= A.end) {
      S.anim = null;
      const res = A.res;
      res.done = true;
      res.seq = ++S.seq;
      S.history.push(res);
      if (S.history.length > 40) S.history.shift();
      if (res.n === 4 && res.a.g === CONFIG.f1 && res.b.g === CONFIG.f1) {
        const v = countsOf(res, res.n).vals;
        S.small.push(v.join(' : '));
        if (S.small.length > 6) S.small.shift();
      }
      // 순종끼리 교배하면 잡종 1대를 보관함에 넣어 줌
      if (!res.self && sameSet(res, CONFIG.parents[0], CONFIG.parents[1])) ensureF1(true);
      updateButtons();
    }
  }
  function selectKid(i) {
    const res = S.result;
    if (!res) return;
    res.sel = res.sel === i ? -1 : i;
    Sound.tick();
  }
  function setSlots(a, b) {
    S.slots = [a, b];
    S.stamp = [now(), now() + 0.001];
    S.flash = [now(), now()];
    changed();
  }
  // 단계를 시작할 때 실험대를 깨끗하게
  function resetLab(keepF1) {
    S.anim = null; S.drag = null;
    S.slots = [null, null]; S.stamp = [0, 0]; S.result = null;
    if (!keepF1) S.bank = S.bank.filter((it) => it.gen === 0);
    S.small = [];
    S.sorted = false;
    if (!on('count')) setN(CONFIG.defaultN);
    changed();
  }

  /* ---------- 포인터 ---------- */
  function hitTest(p) {
    for (let i = 0; i < S.bank.length; i++) if (inR(p, bankRect(i), 2)) return { type: 'bank', item: S.bank[i] };
    if (singleSlot() && inR(p, SLOTS[1])) return { type: 'locked', r: SLOTS[1], step: 2, what: '다른 완두와의 교배' };
    for (let i = 0; i < 2; i++) if (inR(p, SLOTS[i]) && S.slots[i]) return { type: 'slot', i };
    if (Math.hypot(p.x - FLOWER.x, p.y - FLOWER.y) <= FLOWER.r + 10) return { type: 'flower' };
    if (!on('results') && inR(p, RES)) return { type: 'locked', r: RES, step: 2, what: '결과 표' };
    if (S.result) {
      if (on('results') && inR(p, SORT_BTN, 8)) return { type: 'sort' };
      const k = kidAt(p);
      if (k >= 0) return { type: 'kid', i: k };
    }
    return null;
  }
  const handlers = {
    hover(p) {
      const h = hitTest(p);
      if (!h) return null;
      if (h.type === 'locked') return 'not-allowed';
      if (S.anim && h.type !== 'sort') return 'wait';
      return h.type === 'bank' ? 'grab' : 'pointer';
    },
    down(p) {
      hideHint();
      const h = hitTest(p);
      if (!h) return false;
      if (h.type === 'locked') { lockTap(h.r, h.step, h.what); return false; }
      if (h.type === 'sort') { toggleSort(); return false; }
      if (S.anim) return false;
      if (h.type === 'bank') { S.drag = { item: h.item, sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false }; return true; }
      if (h.type === 'slot') { clearSlot(h.i); return false; }
      if (h.type === 'flower') { selfOrCross(); return false; }
      if (h.type === 'kid') { selectKid(h.i); return false; }
      return false;
    },
    move(p) {
      const d = S.drag;
      if (!d) return;
      d.x = p.x; d.y = p.y;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
    },
    up(p) {
      const d = S.drag;
      S.drag = null;
      if (!d) return;
      if (!d.moved) { tapBank(d.item); return; }
      const side = SLOTS.findIndex((s) => inR(p, { x: s.x - 10, y: s.y - 14, w: s.w + 20, h: s.h + 40 }));
      if (side === 1 && singleSlot()) { lockTap(SLOTS[1], 2, '다른 완두와의 교배'); return; }
      if (side >= 0) placeItem(side, d.item);
    },
  };
  function toggleSort() {
    S.sorted = !S.sorted;
    Sound.click();
    if (S.result) layoutKids(S.result, false);
  }

  /* ---------- 무대(캔버스): 휴대폰에서는 세로형 배치 ---------- */
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  function buildStage() {
    const kind = mq && mq.matches ? 'tall' : 'wide';
    if (LAY && LAY.kind === kind) return;
    let cv = $('#cv');
    if (view) {
      // 배치가 바뀌면 새 캔버스로 교체 (가상 좌표계가 달라지므로)
      const fresh = document.createElement('canvas');
      fresh.id = 'cv';
      fresh.setAttribute('aria-label', cv.getAttribute('aria-label') || '');
      cv.replaceWith(fresh);
      cv = fresh;
    }
    applyLayout(kind);
    S.drag = null;
    view = SciSim.stage(cv, { width: LAY.w, height: LAY.h, background: BG, onResize: placeHint });
    ctx = view.ctx;
    SciSim.pointer(view, handlers);
    if (S.result) layoutKids(S.result, true);
    placeHint();
  }

  /* ---------- HTML 컨트롤 ---------- */
  const nBtns = $$('#nSeg button');
  const sideCol = $('.side-col');
  function setN(n) {
    S.n = n;
    nBtns.forEach((b) => b.classList.toggle('on', +b.dataset.n === n));
    refreshTargets();
  }
  nBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setN(+b.dataset.n); }));
  $('#crossBtn').addEventListener('click', () => doCross());
  $('#selfBtn').addEventListener('click', () => {
    const [a, b] = S.slots;
    const p = a && b ? (a === b ? a : null) : a || b;
    if (!p) {
      Sound.fail();
      toast(a && b ? '자가 수분은 한 그루의 완두로 해요. 한쪽 자리만 남겨 주세요' : '먼저 완두 하나를 자리에 놓아 주세요', 'bad');
      return;
    }
    doCross(p);
  });
  function updateButtons() {
    const [a, b] = S.slots;
    $('#crossBtn').disabled = !!S.anim;
    $('#selfBtn').disabled = !!S.anim || !(a || b) || !!(a && b && a !== b);
  }

  const hintEl = $('#stageHint');
  // 안내 말풍선: 가로형은 캔버스 아래쪽, 세로형(휴대폰)은 보관함 바로 아래
  function placeHint() {
    if (!hintEl || !view) return;
    if (LAY.kind === 'tall') {
      const wr = view.wrap.getBoundingClientRect(), cr = view.canvas.getBoundingClientRect();
      hintEl.style.bottom = 'auto';
      hintEl.style.top = Math.round(cr.top - wr.top + view.scale * 200) + 'px';
    } else {
      hintEl.style.top = '';
      hintEl.style.bottom = '';
    }
  }
  function showHint(msg, ms) {
    hintEl.textContent = msg;
    hintEl.classList.remove('hide');
    placeHint();
    clearTimeout(showHint.t);
    showHint.t = setTimeout(hideHint, ms || 7000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  function changed() {
    updateButtons();
    renderPunnett();
    refreshTargets();
  }

  /* ---------- 퍼넷 사각형 (HTML) ---------- */
  const pn = {
    key: '', fill: [], pal: null, ans: [], cells: [], missionMode: false,
    card: $('#pnCard'), grid: $('#pnGrid'), palEl: $('#pnPalette'), help: $('#pnHelp'), sub: $('#pnSub'),
    msg: $('#pnMsg'), check: $('#pnCheck'), clear: $('#pnClear'), foot: $('#pnFoot'),
  };
  let WRINKLE_D = '';
  (function () {
    const n = 18, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 0.9 + 0.07 * Math.sin(a * 5 + 1.3) + 0.05 * Math.sin(a * 7 + 2.2);
      pts.push([12 + Math.cos(a) * 9.6 * k, 12 + Math.sin(a) * 9.6 * k * 0.93]);
    }
    WRINKLE_D = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + 'Z';
  })();
  function peaSVG(round, yellow, size) {
    const c = peaColors(round, yellow);
    const body = round
      ? '<circle cx="12" cy="12" r="9.6" fill="' + c[1] + '" stroke="' + c[2] + '" stroke-width="1.4"/><ellipse cx="8.6" cy="8.4" rx="2.6" ry="1.7" fill="#fff" opacity=".65" transform="rotate(-35 8.6 8.4)"/>'
      : '<path d="' + WRINKLE_D + '" fill="' + c[1] + '" stroke="' + c[2] + '" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 9 q3 -2 5 1 M10 15 q3 1 6 -2" fill="none" stroke="rgba(60,40,0,.35)" stroke-width="1.3" stroke-linecap="round"/>';
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  }
  const alleleHTML = (s) => Array.from(s).map((c) => {
    const gn = geneOf(c);
    return gn ? '<span class="pn-allele-' + gn + '">' + c + '</span>' : c;
  }).join('');

  function renderPunnett(force) {
    const [a, b] = S.slots;
    const key = (a ? a.g : '-') + '|' + (b ? b.g : '-');
    if (!force && key === pn.key) return;
    pn.key = key;
    const ok = !!(a && b);
    const q = MULTI ? ['?', '?', '?', '?'] : ['?', '?'];
    const fG = a ? gametesOf(a.g) : q, mG = b ? gametesOf(b.g) : q;
    const m = MULTI ? 4 : 2;
    pn.sub.innerHTML = (a ? alleleHTML(a.g) : '?') + ' × ' + (b ? alleleHTML(b.g) : '?');
    pn.fill = []; pn.ans = []; pn.cells = [];
    pn.msg.textContent = ''; pn.msg.className = 'pn-msg';
    pn.grid.className = 'pn-grid ' + (MULTI ? 'g4' : 'g2');
    pn.grid.innerHTML = '';
    if (!ok) pn.help.innerHTML = '♀·♂ 자리에 부모 완두를 놓으면(자가 수분은 한 자리만) <b>생식세포</b>가 가로·세로에 나타나요.';
    else if (MULTI) pn.help.innerHTML = '16칸이 자동으로 채워져요. <b>같은 표현형끼리 같은 색</b>이에요.';
    else pn.help.innerHTML = '① 유전자형을 고르고 ② 칸을 눌러요. 각 칸 = <b>♀ 생식세포 + ♂ 생식세포</b>';
    // 팔레트 (한 가지 형질만)
    pn.palEl.innerHTML = '';
    const editable = ok && !MULTI;
    pn.palEl.hidden = !editable;
    pn.foot.hidden = !editable;
    if (editable) {
      const gene = GENES[CONFIG.genes[0]];
      const opts = [gene.up + gene.up, gene.up + gene.lo, gene.lo + gene.lo];
      if (!opts.includes(pn.pal)) pn.pal = opts[0];
      opts.concat(['erase']).forEach((o) => {
        const L = o === 'erase' ? null : looks(o);
        const btn = SciSim.el('button', {
          type: 'button', class: 'pn-pal' + (o === 'erase' ? ' erase' : '') + (pn.pal === o ? ' on' : ''), 'data-pal': o,
          'aria-label': o === 'erase' ? '지우개' : o + ' 고르기',
          html: o === 'erase' ? '🧽 지우개' : '<span>' + alleleHTML(o) + '</span>' + peaSVG(L.round, L.yellow, 20),
        });
        btn.addEventListener('click', () => {
          pn.pal = o; Sound.tick();
          $$('.pn-pal', pn.palEl).forEach((x) => x.classList.toggle('on', x === btn));
        });
        pn.palEl.appendChild(btn);
      });
    }
    const E = SciSim.el;
    pn.grid.appendChild(E('div', { class: 'pn-corner', html: '♀ ＼ ♂' }));
    mG.forEach((g) => pn.grid.appendChild(E('div', { class: 'pn-gam ' + (b ? 'm' : 'q') }, [E('span', { html: alleleHTML(g) })])));
    for (let i = 0; i < m; i++) {
      pn.grid.appendChild(E('div', { class: 'pn-gam ' + (a ? 'f' : 'q') }, [E('span', { html: alleleHTML(fG[i]) })]));
      pn.fill.push([]); pn.ans.push([]); pn.cells.push([]);
      for (let j = 0; j < m; j++) {
        const ans = ok ? fuse(fG[i], mG[j]) : null;
        pn.ans[i][j] = ans;
        pn.fill[i][j] = null;
        let cell;
        if (MULTI && ok) {
          const L = looks(ans);
          cell = E('div', { class: 'pn-cell c-' + phenoKey(ans), title: phenoName(ans) }, []);
          cell.innerHTML = '<span>' + alleleHTML(ans) + '</span>' + peaSVG(L.round, L.yellow, 18);
        } else {
          cell = E('button', { type: 'button', class: 'pn-cell', 'data-cell': i + '-' + j, 'aria-label': (i + 1) + '행 ' + (j + 1) + '열 칸' });
          if (!editable) { cell.disabled = true; cell.textContent = '?'; }
          else cell.addEventListener('click', () => paintCell(i, j));
        }
        pn.cells[i][j] = cell;
        pn.grid.appendChild(cell);
      }
    }
    if (MULTI && ok) {
      const cnt = {};
      CLASSES.forEach((c) => { cnt[c.key] = 0; });
      pn.ans.forEach((row) => row.forEach((g) => { cnt[phenoKey(g)]++; }));
      pn.msg.innerHTML = '16칸 → ' + CLASSES.map((c) => c.name + ' <b>' + cnt[c.key] + '</b>').join(' · ');
      pn.foot.hidden = false;
      pn.check.hidden = true; pn.clear.hidden = true;
    } else { pn.check.hidden = false; pn.clear.hidden = false; }
    updatePnButton();
  }
  function paintCell(i, j) {
    const v = pn.pal === 'erase' ? null : pn.fill[i][j] === pn.pal ? null : pn.pal;
    pn.fill[i][j] = v;
    const cell = pn.cells[i][j];
    cell.classList.remove('bad', 'warn', 'good');
    cell.classList.toggle('filled', !!v);
    if (v) {
      const L = looks(v);
      cell.innerHTML = '<span>' + alleleHTML(v) + '</span>' + peaSVG(L.round, L.yellow, 22);
    } else cell.innerHTML = '';
    pn.msg.textContent = ''; pn.msg.className = 'pn-msg';
    Sound.tick();
  }
  function gradePunnett() {
    const [a, b] = S.slots;
    if (!a || !b) return '♀·♂ 자리에 부모 완두를 먼저 놓아 주세요.';
    if (MULTI) return true;
    let wrong = 0, empty = 0;
    pn.cells.forEach((row, i) => row.forEach((cell, j) => {
      cell.classList.remove('bad', 'warn', 'good');
      const v = pn.fill[i][j];
      if (!v) { empty++; cell.classList.add('warn'); } else if (v !== pn.ans[i][j]) { wrong++; cell.classList.add('bad'); }
    }));
    if (wrong) return '빨간 칸 ' + wrong + '개가 틀렸어요. 그 칸의 왼쪽(♀)과 위쪽(♂) 생식세포 글자를 하나씩 합쳐 보세요.';
    if (empty) return '빈 칸(노란색)이 ' + empty + '개 있어요. 4칸을 모두 채워 주세요.';
    pn.cells.forEach((row) => row.forEach((cell) => cell.classList.add('good')));
    const gene = GENES[CONFIG.genes[0]];
    const gs = [gene.up + gene.up, gene.up + gene.lo, gene.lo + gene.lo];
    const gc = gs.map((g) => pn.ans.flat().filter((x) => x === g).length);
    pn.msg.className = 'pn-msg good';
    pn.msg.innerHTML = '✔ 정답! 유전자형 ' + gs.join(' : ') + ' = <b>' + gc.join(' : ') + '</b> · 표현형 ' + gene.dom + ' : ' + gene.rec + ' = <b>' + (gc[0] + gc[1]) + ' : ' + gc[2] + '</b>';
    return true;
  }
  pn.check.addEventListener('click', () => {
    if (pn.missionMode) {
      const mb = $('#game .mission-actions .btn-primary');
      if (mb && !mb.hidden) { mb.click(); return; }
    }
    const r = gradePunnett();
    if (r === true) { Sound.success(); toast('🎉 퍼넷 사각형 정답!', 'good'); } else { Sound.fail(); pn.msg.className = 'pn-msg'; pn.msg.textContent = '🤔 ' + r; }
  });
  pn.clear.addEventListener('click', () => { Sound.click(); renderPunnett(true); });
  function updatePnButton() { pn.check.innerHTML = pn.missionMode ? '✔ 확인하기 (미션 제출)' : '✔ 채점하기'; }

  /* ---------- 미션 도우미 ---------- */
  function refreshTargets() {
    const T = S.targets;
    nBtns.forEach((b) => b.classList.toggle('target', !!T.n && T.n.includes(+b.dataset.n) && !T.n.includes(S.n)));
    pn.card.classList.toggle('pn-target', !!T.punnett);
  }
  function setTargets(T) { S.targets = T || {}; refreshTargets(); }
  const fresh = () => S.history.filter((r) => r.seq > S.missionSeq);
  function sameSet(res, g1, g2) { return (res.a.g === g1 && res.b.g === g2) || (res.a.g === g2 && res.b.g === g1); }
  const doneSelf = (g) => fresh().some((r) => r.self && r.a.g === g);
  const lastOf = (pred) => fresh().filter(pred).pop() || null;
  const mark = (ok) => (ok ? '✅' : '⬜');
  function parentsHTML() {
    const [a, b] = S.slots;
    const g = (it) => (it ? '<b>' + (on('genes') ? it.g : phenoName(it.g)) + '</b>' : '<span style="color:#8a95a6">빈자리</span>');
    return '♀ ' + g(a) + ' × ♂ ' + g(b);
  }
  function resultHTML(res) {
    if (!res) return '';
    const v = countsOf(res, res.n).vals;
    return CLASSES.map((c, i) => c.name + ' <b>' + v[i] + '</b>').join(' : ');
  }
  function scrollSideTop() {
    requestAnimationFrame(() => { if (sideCol && sideCol.scrollHeight > sideCol.clientHeight) sideCol.scrollTop = 0; });
  }
  const figPeas = (list) => '<div class="fig-peas">' + list.join('') + '</div>';
  const figPea = (round, yellow, label) => '<span class="fp">' + peaSVG(round, yellow, 46) + '<small>' + label + '</small></span>';

  /* =========================================================
     단계와 미션 (이 실험만의 내용)
     ========================================================= */
  const isF1xF1 = (r) => r.a.g === CONFIG.f1 && r.b.g === CONFIG.f1;
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '두 쌍의 대립 형질', short: '두 형질', icon: '🔎', phase: '관찰',
      features: ['bank', 'self', 'genes'],
      intro: '<p class="si-q">❓ 씨 모양과 씨 색깔, 두 가지 형질은 함께 묶여서 유전될까, 따로따로 유전될까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 씨 모양 한 가지 형질로 우열의 원리와 분리의 법칙을 알아냈어요.</div>' +
        '<p>이번에는 <b>씨 모양</b>(둥근 R ↔ 주름진 r)과 <b>씨 색깔</b>(노란색 Y ↔ 초록색 y)을 함께 살펴봐요. 먼저 보관함의 두 순종 완두를 관찰해요.</p>',
      setup() { resetLab(false); showHint('👆 보관함의 완두를 눌러 자가 수분 자리에 놓아 보세요'); },
      recap: '씨 모양과 씨 색깔은 <b>두 쌍의 대립 형질</b>이고, 순종 RRYY는 <b>RY</b>, rryy는 <b>ry</b> 생식세포만 만들어요.',
      summary: '<ul><li><b>두 쌍의 대립 형질</b>: 씨 모양(둥근 R ↔ 주름진 r), 씨 색깔(노란색 Y ↔ 초록색 y)</li>' +
        '<li>우성: 둥근, 노란색 · 열성: 주름진, 초록색</li>' +
        '<li>생식세포에는 각 형질의 유전자 쌍에서 <b>하나씩</b> 들어간다. → RRYY는 <b>RY</b>, rryy는 <b>ry</b> 생식세포만 만든다.</li></ul>',
      missions: [
        {
          type: 'quiz',
          title: '두 쌍의 대립 형질',
          goal: '보관함의 두 완두를 비교해 보세요. 이 실험에서 관찰하는 <b>두 쌍의 대립 형질</b>을 바르게 짝 지은 것은?',
          get figure() { return figPeas([figPea(true, true, '둥글고 노란색'), '<span class="vs">↔</span>', figPea(false, false, '주름지고 초록색')]); },
          choices: [
            '둥근 ↔ 주름진, 노란색 ↔ 초록색',
            '둥근 ↔ 노란색, 주름진 ↔ 초록색',
            '둥글고 노란색 ↔ 주름지고 초록색, 한 쌍뿐이다',
            '노란색 ↔ 초록색, 한 쌍뿐이다',
          ],
          answer: 0,
          feedback: [
            '',
            '둥근(모양)과 노란색(색깔)은 서로 다른 형질이에요. 대립 형질은 <b>같은 형질</b> 안에서 짝 지어요.',
            '모양과 색깔은 서로 다른 형질이에요. 그래서 대립 형질은 <b>두 쌍</b>이에요.',
            '씨 모양도 둥근 것과 주름진 것으로 뚜렷하게 구별돼요.',
          ],
          explain: '씨 <b>모양</b>(둥근 ↔ 주름진)과 씨 <b>색깔</b>(노란색 ↔ 초록색), 이렇게 <b>두 쌍의 대립 형질</b>을 함께 관찰해요. 둥근 모양과 노란색이 우성이에요.',
        },
        {
          title: '순종인지 확인하기',
          goal: '<b>둥글고 노란색</b> 완두와 <b>주름지고 초록색</b> 완두를 <b>각각 자가 수분</b>해 보세요.',
          hint: '완두 카드를 누르면 자리에 놓여요. 🌼 자가 수분 버튼이나 가운데 꽃을 눌러요. 두 완두 모두 해 봐요!',
          setup() { setTargets({ ids: [P_DOM.id, P_REC.id], flower: true }); },
          check: () => doneSelf(CONFIG.parents[0]) && doneSelf(CONFIG.parents[1]),
          hold: 0.5,
          status() {
            const last = lastOf((r) => r.self);
            return '둥글고 노란색 ' + mark(doneSelf('RRYY')) + ' · 주름지고 초록색 ' + mark(doneSelf('rryy')) +
              (last ? '<br>최근 자손 ' + last.n + '개: <b>' + ratioText(countsOf(last, last.n).vals) + '</b>' : '');
          },
          explain: '두 완두 모두 어버이와 똑같은 자손만 나왔어요. 두 형질 모두 같은 유전자 쌍을 가진 <b>순종</b>(RRYY, rryy)이기 때문이에요.',
        },
        {
          type: 'quiz',
          title: 'RRYY가 만드는 생식세포',
          goal: '자가 수분 자리에 <b>RRYY</b> 완두를 놓았어요. 이 완두가 만드는 생식세포로 옳은 것은?',
          setup() { S.result = null; setSlots(P_DOM, null); },
          choices: ['RY 한 종류', 'RR과 YY 두 종류', 'R, R, Y, Y 네 종류', 'RRYY 그대로 한 종류'],
          answer: 0,
          feedback: [
            '',
            '같은 형질의 유전자 쌍(RR)이 함께 들어가지는 않아요. 생식세포에는 <b>각 형질마다 하나씩</b> 들어가요.',
            '생식세포 하나에는 씨 모양 유전자 하나와 씨 색깔 유전자 하나가 <b>함께</b> 들어가요.',
            '생식세포에는 유전자 쌍 중 <b>하나씩만</b> 들어가요. (분리의 법칙)',
          ],
          explain: '분리의 법칙에 따라 씨 모양 유전자 쌍(RR)에서 하나, 씨 색깔 유전자 쌍(YY)에서 하나가 생식세포로 들어가요. 그래서 RRYY는 <b>RY</b>, rryy는 <b>ry</b> 생식세포만 만들어요.',
        },
      ],
    },
    /* ---------- 2단계 · 실험 ---------- */
    {
      title: '잡종 1대', short: '잡종 1대', icon: '🌸', phase: '실험',
      features: ['cross', 'results'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 순종 RRYY는 RY, rryy는 ry 생식세포만 만든다는 것을 알았어요.</div>' +
        '<p>이제 <b>둥글고 노란색(RRYY)</b> 완두와 <b>주름지고 초록색(rryy)</b> 완두를 교배해 봐요. 잡종 1대는 어떤 모습일까요?</p>',
      setup() { resetLab(false); showHint('👆 완두를 ♀·♂ 자리로 끌어다 놓거나 차례로 눌러 보세요'); },
      recap: '순종 RRYY × rryy의 잡종 1대는 모두 <b>둥글고 노란색(RrYy)</b>이에요. 두 형질 모두 우성 형질이 나타나요.',
      summary: '<span class="formula">RRYY × rryy → 잡종 1대 RrYy (모두 둥글고 노란색)</span>' +
        '<ul><li>RY 생식세포와 ry 생식세포가 수정해 잡종 1대는 모두 <b>RrYy</b>가 된다.</li>' +
        '<li>잡종 1대에는 두 형질 모두 <b>우성</b> 형질(둥근, 노란색)이 나타난다.</li></ul>',
      missions: [
        {
          title: '두 순종 교배하기',
          goal: '<b>둥글고 노란색</b>과 <b>주름지고 초록색</b> 완두를 ♀·♂ 자리에 놓고 <b>🌸 교배하기</b>를 눌러 보세요.',
          hint: '보관함의 카드를 차례로 누르면 ♀ → ♂ 순서로 놓여요. 끌어다 놓아도 돼요. 그다음 🌸 교배하기 또는 가운데 꽃을 눌러요.',
          setup() { setSlots(null, null); setTargets({ ids: [P_DOM.id, P_REC.id], flower: true }); },
          check: () => fresh().some((r) => !r.self && sameSet(r, CONFIG.parents[0], CONFIG.parents[1])),
          hold: 0.4,
          status: () => '부모: ' + parentsHTML(),
          explain: '잡종 1대는 <b>모두 둥글고 노란색</b>이에요! RY 생식세포와 ry 생식세포가 만나 모두 <b>RrYy</b>가 되었고, 두 형질 모두 우성(둥근, 노란색)이 나타났어요.',
        },
        {
          type: 'quiz',
          title: '잡종 1대 알아보기',
          goal: '잡종 1대의 <b>유전자형</b>과 <b>표현형</b>을 바르게 짝 지은 것은?',
          choices: ['RrYy · 둥글고 노란색', 'RRYY · 둥글고 노란색', 'RrYy · 둥글고 초록색', 'RY · 둥글고 노란색'],
          answer: 0,
          feedback: [
            '',
            '겉모습은 같아도 유전자형은 달라요. 잡종 1대는 rryy 부모에게서 r과 y도 받았어요.',
            'Y(노란색)가 y(초록색)에 대해 우성이에요. Yy는 어떤 색으로 나타날까요?',
            '몸의 세포에는 유전자가 <b>쌍</b>으로 있어요. RY는 생식세포예요.',
          ],
          explain: '잡종 1대는 부모에게서 RY와 ry를 하나씩 받아 <b>RrYy</b>예요. 두 쌍 모두 잡종이지만 우성인 둥근 모양과 노란색만 겉으로 나타나요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '잡종 2대', short: '잡종 2대', icon: '🌈', phase: '설명',
      features: ['count', 'punnett', 'split'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 잡종 1대는 모두 둥글고 노란색(RrYy)이었어요.</div>' +
        '<p>잡종 1대를 자가 수분하면 잡종 2대에서는 어떤 완두가 나올까요? 자손을 많이 얻어 <b>두 형질을 함께</b>, 그리고 <b>형질별로 따로</b> 세어 봐요.</p>',
      setup() { resetLab(true); ensureF1(false); },
      recap: '잡종 2대는 약 <b>9 : 3 : 3 : 1</b>이고, 씨 모양과 씨 색깔을 따로 보면 각각 약 <b>3 : 1</b>이에요. 두 형질은 서로 영향을 주지 않고 따로 유전돼요.',
      summary: '<span class="formula">RrYy × RrYy → 9 : 3 : 3 : 1<br><small>(둥글고 노란색 : 둥글고 초록색 : 주름지고 노란색 : 주름지고 초록색)</small></span>' +
        '<ul><li>형질별로 따로 보면 둥근 : 주름진 ≈ 3 : 1, 노란색 : 초록색 ≈ 3 : 1</li>' +
        '<li>RrYy의 생식세포: RY : Ry : rY : ry = 1 : 1 : 1 : 1</li>' +
        '<li>부모에게 없던 새로운 조합(둥글고 초록색, 주름지고 노란색)이 나타난다.</li></ul>',
      missions: [
        {
          title: '잡종 2대 400개 얻기',
          goal: '보관함의 <b>잡종 1대(RrYy)</b>를 <b>자가 수분</b>해서 자손 <b>400개</b>를 얻어 보세요.',
          hint: '잡종 1대 카드를 자리에 놓고 🌼 자가 수분! 자손 수는 아래에서 400을 골라요. 🧮 퍼넷 사각형 16칸도 살펴보세요.',
          setup() { const f1 = ensureF1(false); setSlots(null, null); setTargets({ ids: [f1.id], n: [400], flower: true }); },
          check: () => fresh().some((r) => isF1xF1(r) && r.n >= 400),
          hold: 0.4,
          status: () => '부모: ' + parentsHTML() + ' · 자손 수 <b>' + S.n + '</b>',
          get explain() {
            const r = lastOf(isF1xF1);
            const v = r ? countsOf(r, r.n).vals : [9, 3, 3, 1];
            return '표현형이 <b>4가지</b>나 나왔어요! ' + CLASSES.map((c) => c.name).join(' : ') + ' = <b>' + v.join(' : ') + '</b> → 합을 16으로 맞추면 <b>' + ratioText(v, [9, 3, 3, 1]) + '</b>. 부모에게 없던 <b>새로운 조합</b>(둥글고 초록색, 주름지고 노란색)도 생겼어요.';
          },
        },
        {
          type: 'quiz',
          title: '9 : 3 : 3 : 1',
          goal: '잡종 2대의 표현형 비(둥글고 노란색 : 둥글고 초록색 : 주름지고 노란색 : 주름지고 초록색)로 가장 알맞은 것은?',
          hint: '🧮 퍼넷 사각형 16칸에서 같은 색 칸끼리 세어 보세요.',
          choices: ['3 : 1', '1 : 1 : 1 : 1', '9 : 3 : 3 : 1', '1 : 2 : 1'],
          answer: 2,
          feedback: [
            '3 : 1은 한 가지 형질만 볼 때의 비예요. 지금은 표현형이 4가지예요!',
            '1 : 1 : 1 : 1은 RrYy가 만드는 <b>생식세포</b>(RY, Ry, rY, ry)의 비예요. 이 생식세포끼리 만나면?',
            '',
            '1 : 2 : 1은 Rr × Rr의 <b>유전자형</b> 비(RR : Rr : rr)예요.',
          ],
          explain: '퍼넷 사각형 16칸 중 둥글고 노란색 9칸, 둥글고 초록색 3칸, 주름지고 노란색 3칸, 주름지고 초록색 1칸이에요. 실험 결과도 <b>9 : 3 : 3 : 1</b>에 가까워요.',
        },
        {
          type: 'quiz',
          title: '형질별로 따로 세면?',
          goal: '결과 표 아래의 <b>형질별 비</b>를 보세요. 씨 모양만, 씨 색깔만 따로 세면 어떻게 될까요?',
          status() {
            const r = S.result;
            if (!r || !r.done || r.a.g !== CONFIG.f1) return '';
            const sc = splitCounts(countsOf(r, r.n).vals);
            return '내 실험 (자손 ' + r.n + '개) → 둥근 <b>' + sc[0][0] + '</b> : 주름진 <b>' + sc[0][1] + '</b> · 노란색 <b>' + sc[1][0] + '</b> : 초록색 <b>' + sc[1][1] + '</b>';
          },
          choices: [
            '둘 다 약 3 : 1 — 각 형질이 따로 분리의 법칙을 따른다',
            '씨 모양만 3 : 1이고, 씨 색깔은 규칙이 없다',
            '둘 다 약 1 : 1이다',
            '둥근 완두는 모두 노란색이다 — 두 형질이 함께 붙어 다닌다',
          ],
          answer: 0,
          feedback: [
            '',
            '결과 표에서 노란색 : 초록색도 약 3 : 1이에요. 다시 확인해 보세요.',
            '1 : 1은 Rr이 만드는 생식세포 R : r의 비예요. 자손의 표현형을 세어 보세요.',
            '둥글고 <b>초록색</b> 완두도 나왔어요! 두 형질은 붙어 다니지 않아요.',
          ],
          explain: '둥근 : 주름진 ≈ 3 : 1, 노란색 : 초록색 ≈ 3 : 1. 두 형질을 함께 교배해도 <b>각 형질은 따로 분리의 법칙</b>을 따라요. RrYy는 생식세포를 RY, Ry, rY, ry 네 종류로 <b>1 : 1 : 1 : 1</b> 만들기 때문이에요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '독립의 법칙', short: '적용', icon: '🧠', phase: '적용',
      features: [],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 잡종 2대는 9 : 3 : 3 : 1이고, 형질별로는 각각 3 : 1이었어요.</div>' +
        '<p>이 결과를 정리한 것이 <b>독립의 법칙</b>이에요. 법칙의 뜻을 정리하고, 확률로 자손의 수를 예측해 봐요.</p>',
      setup() { resetLab(true); ensureF1(false); },
      recap: '두 쌍의 대립 형질은 서로 영향을 주지 않고 각각 분리의 법칙에 따라 유전돼요. → <b>독립의 법칙</b>',
      summary: '<p><b>독립의 법칙</b>: 두 쌍 이상의 대립 형질이 함께 유전될 때, 각 형질을 나타내는 유전자는 서로 영향을 주지 않고 <b>독립적으로</b> 분리되어 유전된다.</p>' +
        '<span class="formula">(3 : 1) × (3 : 1) = 9 : 3 : 3 : 1</span>' +
        '<p class="note">예: 잡종 2대가 주름지고 초록색일 확률 = ¼ × ¼ = 1/16</p>',
      missions: [
        {
          type: 'quiz',
          title: '독립의 법칙이란?',
          goal: '실험 결과가 알려 주는 <b>독립의 법칙</b>으로 옳은 것은?',
          choices: [
            '둥근 모양 유전자와 노란색 유전자는 항상 함께 붙어서 자손에게 전해진다',
            '두 쌍의 대립 형질은 서로 영향을 주지 않고, 각각 분리의 법칙에 따라 유전된다',
            '두 형질을 함께 교배하면 우열의 원리가 성립하지 않는다',
            '씨 모양이 씨 색깔을 결정한다',
          ],
          answer: 1,
          feedback: [
            '그렇다면 둥글고 초록색, 주름지고 노란색 같은 새로운 조합은 나올 수 없겠죠? 실제로는 나왔어요!',
            '',
            '둥근(우성)과 노란색(우성)이 여전히 더 많이 나타났어요. 우열의 원리는 그대로 성립해요.',
            '둥근 완두 중에도 초록색이, 주름진 완두 중에도 노란색이 있었어요. 씨 모양과 씨 색깔은 서로 관계없이 정해져요.',
          ],
          explain: '씨 모양 유전자(R, r)와 씨 색깔 유전자(Y, y)는 생식세포를 만들 때 <b>서로 독립적으로</b> 분리돼요. 그래서 각 형질은 따로 3 : 1이 되고, 함께 보면 (3 : 1) × (3 : 1) = <b>9 : 3 : 3 : 1</b>이 돼요.',
        },
        {
          type: 'quiz',
          title: '확률로 예측하기',
          goal: '잡종 1대(RrYy)를 자가 수분해 자손 <b>1600개</b>를 얻는다면, <b>주름지고 초록색</b>인 완두는 약 몇 개일까요?',
          hint: '주름질 확률과 초록색일 확률을 각각 구해 곱해 보세요.',
          choices: ['약 100개', '약 300개', '약 400개', '약 900개'],
          answer: 0,
          feedback: [
            '',
            '300개(3/16)는 둥글고 초록색 또는 주름지고 노란색 완두의 수예요.',
            '400개(¼)는 주름진 완두 <b>전체</b>(또는 초록색 완두 전체)의 수예요. 두 형질이 모두 열성이어야 해요.',
            '900개(9/16)는 둥글고 노란색 완두의 수예요.',
          ],
          explain: '주름질 확률 ¼ × 초록색일 확률 ¼ = <b>1/16</b>. 1600 × 1/16 = <b>약 100개</b>. 두 형질이 독립적으로 유전되기 때문에 각 확률을 곱해서 예측할 수 있어요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작 (공통)
     ========================================================= */
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  changed();
  renderPunnett(true);

  game = SciSim.game({
    simId: CONFIG.simId,
    mount: '#game',
    badge: CONFIG.badge,
    homeHref: CONFIG.home,
    featureLabels: {
      bank: '🫛 씨앗 보관함',
      self: '🌼 자가 수분',
      cross: '🌸 교배하기 (♀ × ♂)',
      results: '📊 결과 표',
      genes: '🧬 유전자형 · 생식세포',
      count: '🔢 자손 수',
      punnett: '🧮 퍼넷 사각형',
    },
    onFeatures(set) {
      F = new Set(set);
      if (!set.has('count') && S.n !== CONFIG.defaultN) setN(CONFIG.defaultN);
      if (!set.has('cross') && S.slots[1] && S.slots[1] !== S.slots[0]) S.slots[1] = null;
      if (sideCol) sideCol.classList.toggle('solo', !set.has('punnett'));
      changed();
    },
    onMissionStart() {
      setTargets({});
      S.missionSeq = S.seq;
      if (pn.missionMode) { pn.missionMode = false; updatePnButton(); }
    },
    levels,
  });

  setTimeout(() => { if (!hintEl.classList.contains('hide')) hideHint(); }, 8000);
  SciSim.loop((dt) => {
    stepAnim();
    stepKids(dt);
    draw();
  });
})();
