/* =========================================================
   중3 Ⅵ. 생식과 유전 - 독립의 법칙  [9과21-04]
   씨 모양(R 둥근 / r 주름진)과 씨 색깔(Y 노란색 / y 초록색), 두 쌍의 대립 형질을 함께 다룹니다.
   ① 관찰: 두 쌍의 대립 형질 → ② 실험: 잡종 1대
   → ③ 설명: 잡종 2대(9 : 3 : 3 : 1, 형질별 3 : 1) → ④ 적용: 독립의 법칙과 예측
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = SciSim.reduceMotion;                  // 움직임 줄이기 설정
  const ease = SciSim.ease;
  const { rgba, mix } = SciSim.color;
  const parts = new SciSim.Particles();            // 캔버스 위 반짝임 · 터지는 효과
  let D = null;                                    // SciSim.draw(ctx) — 캔버스를 만들 때마다 새로 연결


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
    pose: [{ dx: 0, dy: 0, s: 1, a: 1 }, { dx: 0, dy: 0, s: 1, a: 1 }],   // 자리에 놓인 완두가 날아와 안착하는 모양
    gT0: [0, 0],          // 생식세포가 나타난 시각
    fly: [], hov: null, fc: null, okAt: null,
    disp: { res: null, v: CONFIG.classes.map(() => 0) },                 // 막대 · 숫자가 부드럽게 따라가는 값
  };
  // 꽃: 열린 정도(스프링)와 켜짐(0~1)
  const FL = { open: new SciSim.Spring(0.25, { stiffness: 120, damping: 11 }), lit: 0 };
  let tNow = 0, lastPhase = null;
  const now = () => performance.now() / 1000;
  const f1Plant = () => S.bank.find((it) => it.g === CONFIG.f1 && it.gen === 1) || null;
  function ensureF1(announce) {
    let it = f1Plant();
    if (!it) {
      it = plant(CONFIG.f1, 1);
      it.born = now() + 0.15;
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
  /* ---------- 흔들기(틀렸을 때) · 나타나기(도구가 열릴 때) ---------- */
  const shakeAt = {};
  function shake(key) { shakeAt[key] = now(); }
  function shakeOff(key, t) {
    const u = (t - (shakeAt[key] || -9)) / 0.5;
    return u >= 0 && u < 1 ? Math.sin(u * Math.PI * 5) * 6 * (1 - u) : 0;
  }
  const revealAt = {};
  // 도구가 열린 뒤 0.8초 동안 0 → 1
  function revealP(name, t) {
    const t0 = revealAt[name];
    return t0 == null ? 1 : clamp((t - t0) / 0.8, 0, 1);
  }
  // 열리는 도구: 가운데에서 살짝 튕기며 커지고 나타남
  function popIn(r, p) {
    if (p >= 1) return false;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, sc = 0.82 + 0.18 * ease.outBack(p);
    ctx.save();
    ctx.globalAlpha *= clamp(p * 1.8, 0, 1);
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    return true;
  }

  // 아직 열리지 않은 자리 (빈자리가 어색한 곳에만 흐리게 표시)
  function lockedBox(r, label, step, shakeKey, t) {
    ctx.save();
    ctx.translate(shakeKey ? shakeOff(shakeKey, t) : 0, 0);
    ctx.setLineDash([7, 6]); ctx.strokeStyle = '#c3d1b8'; ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    rr(r.x, r.y, r.w, r.h, 14); ctx.fill(); ctx.stroke();
    ctx.restore();
    const cx = r.x + r.w / 2 + (shakeKey ? shakeOff(shakeKey, t) : 0), cy = r.y + r.h / 2;
    text('🔒 ' + label, cx, cy - 3, { size: 14, weight: 800, color: '#7d8a74', align: 'center', max: r.w - 16 });
    text(step + '단계에서 열려요', cx, cy + 18, { size: 13, weight: 700, color: '#93a08a', align: 'center' });
  }
  // 새로 열린 도구 강조 (몇 초 동안)
  function newRing(r, rad, t) {
    const a = 0.5 + 0.5 * Math.sin(t * 6.2);
    ctx.save();
    ctx.strokeStyle = 'rgba(249,115,22,' + (0.35 + a * 0.5).toFixed(2) + ')'; ctx.lineWidth = 4;
    rr(r.x - 5, r.y - 5, r.w + 10, r.h + 10, (rad || 14) + 4); ctx.stroke();
    ctx.restore();
    D.label(r.x + r.w - 21, r.y - 5, 'NEW', { bg: '#f97316', color: '#fff', size: 13, pad: 7 });
  }
  // 목표 표시: 맥박 치는 둥근 사각형 고리
  function ringRR(x, y, w, h, rad, t, color) {
    const col = color || '#14a058', k = RM ? 0.35 : (t * 1.2) % 1;
    ctx.save();
    ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 3.2;
    rr(x - 3, y - 3, w + 6, h + 6, rad + 3); ctx.stroke();
    const e = 3 + k * 9;
    ctx.strokeStyle = rgba(col, 0.55 * (1 - k)); ctx.lineWidth = 3;
    rr(x - e, y - e, w + 2 * e, h + 2 * e, rad + e); ctx.stroke();
    ctx.restore();
  }
  function panel(r) {
    D.shadow(() => { rr(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 14, y: 3, color: 'rgba(40,70,30,.17)' });
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f5f9f1');
    ctx.fillStyle = g; rr(r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(176,196,164,.6)'; ctx.lineWidth = 1.2; rr(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 14); ctx.stroke();
  }
  function drawBackground(t) {
    // 바탕색은 무대 상자와 같게 두어 이음매가 보이지 않게 (빛은 안쪽에만)
    // 꽃 뒤의 따뜻한 빛
    D.glow(FLOWER.x, FLOWER.y + 10, 130, '#ffd3e8', 0.38);
  }

  /* ---------- 완두 씨앗 (한 번 그려 두고 다시 쓰는 그림) ---------- */
  function peaColors(round, yellow) {
    if (yellow) return round ? ['#fff3ad', '#f6cc3c', '#b28812'] : ['#f6e08e', '#dcae33', '#8f6c10'];
    return round ? ['#d8f4b6', '#80c652', '#3f7f22'] : ['#c2e59e', '#69aa41', '#386c1e'];
  }
  function peaBody(c, R, round, seed) {
    c.beginPath();
    if (round) { c.arc(0, 0, R, 0, TAU); return; }
    const n = 18, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 0.9 + 0.07 * Math.sin(a * 5 + seed) + 0.05 * Math.sin(a * 7 + seed * 1.7);
      pts.push([Math.cos(a) * R * k, Math.sin(a) * R * k * 0.93]);
    }
    const mid = (i) => { const p = pts[i % n], q = pts[(i + 1) % n]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
    const m0 = mid(n - 1);
    c.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(i); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    c.closePath();
  }
  function paintPea(c, R, round, yellow, seed) {
    const col = peaColors(round, yellow);
    const body = () => peaBody(c, R, round, seed);
    body();
    const g = c.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.08, 0, 0, R * 1.05);
    g.addColorStop(0, col[0]); g.addColorStop(0.5, col[1]); g.addColorStop(1, col[2]);
    c.fillStyle = g; c.fill();
    c.save(); body(); c.clip();
    // 바닥에서 올라오는 반사광
    const b = c.createRadialGradient(R * 0.45, R * 0.55, 0, R * 0.45, R * 0.55, R * 0.8);
    b.addColorStop(0, rgba(col[0], 0.5)); b.addColorStop(1, rgba(col[0], 0));
    c.fillStyle = b; c.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
    if (!round) {
      c.lineCap = 'round';
      for (let j = 0; j < 4; j++) {
        const a = seed * 1.3 + j * 1.7;
        const cx = Math.cos(a) * R * 0.34, cy = Math.sin(a) * R * 0.34, r2 = R * (0.27 + 0.05 * (j % 3));
        c.strokeStyle = 'rgba(70,45,0,.4)'; c.lineWidth = Math.max(1, R * 0.09);
        c.beginPath(); c.arc(cx, cy, r2, a + 0.6, a + 2.5); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.38)'; c.lineWidth = Math.max(1, R * 0.05);
        c.beginPath(); c.arc(cx - R * 0.03, cy - R * 0.05, r2, a + 0.6, a + 2.5); c.stroke();
      }
      const dx = Math.cos(seed) * R * 0.3, dy = Math.sin(seed) * R * 0.3;
      const dm = c.createRadialGradient(dx, dy, 0, dx, dy, R * 0.42);
      dm.addColorStop(0, 'rgba(60,40,0,.22)'); dm.addColorStop(1, 'rgba(60,40,0,0)');
      c.fillStyle = dm; c.fillRect(-R, -R, R * 2, R * 2);
    }
    c.restore();
    body(); c.lineWidth = Math.max(1, R * 0.06); c.strokeStyle = rgba(col[2], 0.9); c.stroke();
    if (round) {
      const ha = 0.5 + ((seed * 1.3) % 1.8), hx = Math.cos(ha) * R * 0.78, hy = Math.sin(ha) * R * 0.78;
      c.fillStyle = 'rgba(255,255,225,.5)'; c.beginPath(); c.ellipse(hx, hy, R * 0.13, R * 0.075, ha + 1.57, 0, TAU); c.fill();
      c.strokeStyle = rgba(col[2], 0.55); c.lineWidth = Math.max(0.8, R * 0.03); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.72)'; c.beginPath(); c.ellipse(-R * 0.36, -R * 0.42, R * 0.28, R * 0.17, -0.6, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(-R * 0.08, -R * 0.66, R * 0.05, 0, TAU); c.fill();
    } else {
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-R * 0.34, -R * 0.4, R * 0.22, R * 0.12, -0.6, 0, TAU); c.fill();
    }
  }
  const sprites = new Map();
  function peaSprite(round, yellow, rq, vi) {
    const ps = view.scale * view.dpr, rp = Math.max(3, Math.round(rq * ps));
    const key = (round ? 'r' : 'w') + (yellow ? 'y' : 'g') + rp + '_' + vi;
    let sp = sprites.get(key);
    if (sp) return sp;
    const size = Math.ceil(rp * 2 * 1.2) + 4;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    c.translate(size / 2, size / 2);
    paintPea(c, rp, round, yellow, vi * 1.7 + 0.6);
    sp = { cv, w: size / ps };
    if (sprites.size > 500) sprites.clear();
    sprites.set(key, sp);
    return sp;
  }
  function drawPea(x, y, r, round, yellow, seed, o) {
    o = o || {};
    const ps = view.scale * view.dpr;
    if (r < 0.5) return;
    if (o.shadow !== false && r > 6) {
      ctx.save(); ctx.globalAlpha *= 0.2; ctx.fillStyle = '#26361a';
      ctx.beginPath(); ctx.ellipse(x + r * 0.12, y + r * 0.84, r * 0.82, r * 0.26, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (r * ps < 3.5) {
      ctx.fillStyle = peaColors(round, yellow)[1];
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      return;
    }
    const rq = Math.max(1, Math.round(r * 2) / 2);
    const vi = Math.abs(Math.floor((seed || 0) * 1.7)) % 6;
    const sp = peaSprite(round, yellow, rq, vi);
    const w = sp.w * (r / rq);
    ctx.drawImage(sp.cv, x - w / 2, y - w / 2, w, w);
  }
  // 꼬투리 (열린 껍질에 씨앗이 놓여 있는 모양)
  function drawPod(cx, cy, len, th) {
    const L = len / 2, T = th / 2;
    const shape = (k) => {
      ctx.beginPath();
      ctx.moveTo(-L * k, 2); ctx.bezierCurveTo(-L * 0.55 * k, -T * 1.5 * k, L * 0.55 * k, -T * 1.5 * k, L * k, -3);
      ctx.bezierCurveTo(L * 0.55 * k, T * 1.25 * k, -L * 0.55 * k, T * 1.25 * k, -L * k, 2); ctx.closePath();
    };
    ctx.save(); ctx.translate(cx, cy);
    D.shadow(() => {
      shape(1);
      const g = ctx.createLinearGradient(0, -T, 0, T);
      g.addColorStop(0, '#a5dc6f'); g.addColorStop(1, '#4f9a33');
      ctx.fillStyle = g; ctx.fill();
    }, { blur: 8, y: 3, color: 'rgba(30,60,20,.3)' });
    ctx.strokeStyle = '#3e7f29'; ctx.lineWidth = 1.5; shape(1); ctx.stroke();
    shape(0.82);
    const ig = ctx.createLinearGradient(0, -T, 0, T);
    ig.addColorStop(0, '#bfe58f'); ig.addColorStop(1, '#e3f4c3');
    ctx.fillStyle = ig; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-L * 0.7, -T * 0.62); ctx.quadraticCurveTo(0, -T * 1.12, L * 0.7, -T * 0.55); ctx.stroke();
    // 꼭지
    ctx.fillStyle = '#3e7f29';
    ctx.beginPath(); ctx.moveTo(-L, 2); ctx.lineTo(-L - 7, 8); ctx.lineTo(-L + 2, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ---------- 완두 꽃 (나비 모양 꽃) ---------- */
  function peaFlower(cx, cy, R, open, litA, t) {
    const sway = RM ? 0 : Math.sin(t * 1.7) * 0.05 * litA;
    const pc = (a, b) => mix(b, a, litA);                 // 꺼진 색(회색) → 켜진 색
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(sway);
    // 꽃받침
    ctx.fillStyle = pc('#5fae3f', '#cdd8c4');
    ctx.beginPath(); ctx.moveTo(-R * 0.22, R * 0.52); ctx.lineTo(R * 0.22, R * 0.52); ctx.lineTo(R * 0.34, R * 0.95); ctx.lineTo(0, R * 0.78); ctx.lineTo(-R * 0.34, R * 0.95); ctx.closePath(); ctx.fill();
    // 기발꽃잎 (뒤로 젖혀지는 큰 꽃잎)
    ctx.save(); ctx.translate(0, R * 0.1); ctx.rotate(-0.05 * open); ctx.scale(1, 0.9 + 0.1 * open);
    const bg = ctx.createLinearGradient(0, -R, 0, R * 0.2);
    bg.addColorStop(0, pc('#f6a6d3', '#e9dfe6')); bg.addColorStop(1, pc('#d94b9a', '#d3c3cf'));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(0, R * 0.1);
    ctx.bezierCurveTo(-R * 1.0, 0, -R * 0.9, -R * 1.05, -R * 0.2, -R * 0.86);
    ctx.quadraticCurveTo(0, -R * 0.7, R * 0.2, -R * 0.86);
    ctx.bezierCurveTo(R * 0.9, -R * 1.05, R * 1.0, 0, 0, R * 0.1); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = pc('#b83680', '#b7a6b3'); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = pc('rgba(184,54,128,.35)', 'rgba(150,130,145,.3)'); ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, R * 0.06); ctx.quadraticCurveTo(i * R * 0.22, -R * 0.4, i * R * 0.3, -R * 0.74); ctx.stroke(); }
    ctx.restore();
    // 날개꽃잎 두 장 (열릴수록 벌어짐)
    [-1, 1].forEach((sd) => {
      ctx.save(); ctx.translate(sd * R * 0.3, R * 0.2); ctx.rotate(sd * (0.35 + 0.55 * open));
      const wg = ctx.createLinearGradient(0, -R * 0.5, 0, R * 0.4);
      wg.addColorStop(0, pc('#fde4f1', '#f4eef2')); wg.addColorStop(1, pc('#f3a3cf', '#e0d5dc'));
      ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(0, -R * 0.1, R * 0.34, R * 0.6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = pc('#d0569c', '#bfb0ba'); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    });
    // 용골꽃잎 (가운데의 작은 배 모양) + 꽃가루
    ctx.save(); ctx.translate(0, R * 0.36);
    ctx.fillStyle = pc('#fff3f9', '#f7f3f6'); ctx.strokeStyle = pc('#d0569c', '#bfb0ba'); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-R * 0.3, -R * 0.12); ctx.quadraticCurveTo(0, R * 0.62, R * 0.3, -R * 0.12); ctx.quadraticCurveTo(0, R * 0.08, -R * 0.3, -R * 0.12); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (litA > 0.5) {
      ctx.fillStyle = '#facc15';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc((i - 1) * R * 0.1, R * 0.02 + Math.abs(i - 1) * R * 0.03, R * 0.055, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
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
    const x0 = s.x + (n === 2 ? 84 : 76);
    return Array.from(g).map((c, i) => ({ x: x0 + i * (w + gap), y: s.y + 52, w, h: 28, c }));
  }
  // 생식세포 gm의 j번째 글자를 주는 유전자 토큰 번호들
  const tokensFor = (g, gm, j) => [2 * j, 2 * j + 1].filter((t) => g[t] === gm[j]);
  const bez = (x1, y1, x2, y2, u) => {          // 위에서 아래로 부드럽게 휘는 곡선
    const my = (y1 + y2) / 2, v = 1 - u;
    return {
      x: v * v * v * x1 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x2,
      y: v * v * v * y1 + 3 * v * v * u * my + 3 * v * u * u * my + u * u * u * y2,
    };
  };

  /* =========================================================
     그리기
     ========================================================= */
  function draw() {
    const t = now();
    tNow = t;
    view.clear(BG);
    drawBackground(t);
    S.fc = frameCounts(t);
    drawBank(t);
    drawLegend(t);
    drawSlots(t);
    drawFlower(t);
    drawGametes(t);
    drawTray(t);
    drawResults(t);
    if (S.anim) drawAnim(t);
    drawNewRings(t);
    drawFly(t);
    if (S.lockTip && t - S.lockTip.t < 1.2) drawLockTip(t);
    parts.draw(ctx);
    drawSuccess(t);
    if (S.drag && S.drag.moved) drawGhost(t);
  }

  function drawNewRings(t) {
    if (isNew('cross')) newRing(SLOTS[1], 14, t);
    if (isNew('results')) newRing(RES, 14, t);
    if (isNew('genes')) newRing({ x: SLOTS[0].x, y: GAM_Y - 26, w: SLOTS[1].x + SLOTS[1].w - SLOTS[0].x, h: 52 }, 14, t);
    if (isNew('split')) { const b = splitRect(); if (b) newRing(b, 8, t); }
  }
  function drawLockTip(t) {
    const L = S.lockTip, a = 1 - (t - L.t) / 1.2;
    ctx.save(); ctx.strokeStyle = 'rgba(236,72,153,' + a.toFixed(2) + ')'; ctx.lineWidth = 3;
    rr(L.r.x + shakeOff(L.key, t), L.r.y, L.r.w, L.r.h, 14); ctx.stroke(); ctx.restore();
  }

  function drawBank(t) {
    panel(BANK);
    const rv = revealP('bank', t);
    ctx.save();
    popIn(BANK, rv) || ctx.save();
    D.text(BANK.x + 12, BANK.titleY, '🫛 씨앗 보관함', { size: 15, weight: 800, align: 'left' });
    const sub = on('cross') ? '끌어 놓거나 눌러요' : '눌러서 자리에 놓아요';
    if (BANK.subY === BANK.titleY) D.text(BANK.x + BANK.w - 12, BANK.subY, sub, { size: 13, color: '#6f7a8c', weight: 600, align: 'right' });
    else D.text(BANK.x + 12, BANK.subY, sub, { size: 13, color: '#6f7a8c', weight: 600, align: 'left' });
    S.bank.forEach((it, i) => drawCard(bankRect(i), it, t, false));
    ctx.restore(); ctx.restore();
  }

  function drawCard(r, it, t, ghost) {
    const inSlot = S.slots.includes(it);
    let sc = 1, lift = 0, dy = 0;
    if (!ghost) {
      if (it.born != null) {
        const u = (t - it.born) / 0.7;
        if (u < 0) return;
        sc = u >= 1 ? 1 : Math.max(0.01, ease.outBack(u));
      }
      lift = it.lift || 0;
      sc *= 1 + 0.035 * lift + 0.07 * (it.bump || 0);
      dy = -3 * lift;
      // 끌려가고 있거나 날아가는 중이면 빈자리 표시
      if (it.away) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#c3d1b8'; ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke(); ctx.restore();
        return;
      }
    }
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.save();
    ctx.translate(cx, cy + dy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    const o = ghost ? { blur: 22, y: 10, color: 'rgba(20,40,20,.32)' } : { blur: 6 + 10 * lift, y: 2 + 4 * lift, color: 'rgba(40,70,30,.18)' };
    D.shadow(() => { rr(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, o);
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    if (inSlot) { g.addColorStop(0, '#f6fcf2'); g.addColorStop(1, '#e7f5df'); } else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f1f5f9'); }
    ctx.fillStyle = g; rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
    ctx.strokeStyle = inSlot ? '#86c96a' : lift > 0.3 ? '#9dc88a' : '#d7dfe9'; ctx.lineWidth = 2;
    rr(r.x, r.y, r.w, r.h, 12); ctx.stroke();
    const L = looks(it.g);
    const compact = r.w < 160;
    const pr = compact ? 15 : 18, px = r.x + (compact ? 21 : 26), tx = r.x + (compact ? 40 : 50);
    drawPea(px, r.y + r.h / 2, pr, L.round, L.yellow, parseInt(it.id.slice(1), 10) * 1.7);
    text(titleOf(it), tx, r.y + 29, { size: 14, weight: 800, max: r.x + r.w - tx - 6 });
    const gy = r.y + r.h - 22;
    let cx2 = tx;
    if (on('genes')) {
      const fs = compact && MULTI ? 15 : 17;
      ctx.font = font(fs, 800);
      const gw = ctx.measureText(it.g).width;
      alleleText(it.g, tx + gw / 2, gy, fs);
      cx2 = tx + gw + 6;
    }
    let chip = chipOf(it);
    ctx.font = font(13, 800);
    if (cx2 + ctx.measureText(chip).width + 12 > r.x + r.w - 4) chip = isPure(it.g) ? '순종' : '잡종';
    pureChip(chip, isPure(it.g), cx2, gy);
    ctx.restore();
    const T = S.targets;
    if (!ghost && T.ids && T.ids.includes(it.id) && !inSlot) ringRR(r.x, r.y, r.w, r.h, 12, t);
    if (!ghost && S.pulse && S.pulse.id === it.id && t - S.pulse.t < 1.6) {
      const a = 1 - (t - S.pulse.t) / 1.6;
      ctx.save(); ctx.strokeStyle = 'rgba(236,72,153,' + a.toFixed(2) + ')'; ctx.lineWidth = 4;
      rr(r.x - 3 - (1 - a) * 8, r.y - 3 - (1 - a) * 8, r.w + 6 + (1 - a) * 16, r.h + 6 + (1 - a) * 16, 14); ctx.stroke(); ctx.restore();
    }
  }
  function pureChip(s, pure, x, cy) {
    ctx.font = font(13, 800);
    const w = ctx.measureText(s).width + 12;
    ctx.fillStyle = pure ? '#e2f6eb' : '#fff4dc'; rr(x, cy - 10, w, 21, 10); ctx.fill();
    text(s, x + w / 2, cy + 1, { size: 13, weight: 800, color: pure ? '#0b6b39' : '#9a5b00', align: 'center', base: 'middle' });
  }

  // 대립 형질 안내판
  function drawLegend(t) {
    const R = LEGEND;
    panel(R);
    const rows = CONFIG.genes.map((gn) => GENES[gn]);
    const peaOf = (gn, dom) => {
      const L = { round: true, yellow: true };
      if (gn.up === 'R') L.round = dom; else L.yellow = dom;
      return L;
    };
    const gp = revealP('genes', t);
    if (R.horiz) {
      // 휴대폰: 한 줄(또는 두 줄)로 간단히
      rows.forEach((gn, i) => {
        const y = R.y + (rows.length > 1 ? 21 + i * 26 : R.h / 2 + 1);
        text(gn.trait, R.x + 12, y + 5, { size: 13, weight: 800, color: '#6f7a8c' });
        const a = peaOf(gn, true), b = peaOf(gn, false);
        drawPea(R.x + 92, y, 9, a.round, a.yellow, 1, { shadow: false });
        text(gn.dom + (on('genes') ? ' ' + gn.up : '') + (on('genes') ? ' (우성)' : ''), R.x + 106, y + 5, { size: 13, weight: 800 });
        text('↔', R.x + 252, y + 5, { size: 14, weight: 800, color: '#9aa5b6', align: 'center' });
        drawPea(R.x + 278, y, 9, b.round, b.yellow, 2, { shadow: false });
        text(gn.rec + (on('genes') ? ' ' + gn.lo : '') + (on('genes') ? ' (열성)' : ''), R.x + 292, y + 5, { size: 13, weight: 800 });
      });
      return;
    }
    text(rows.length > 1 ? '🔎 두 쌍의 대립 형질' : '🔎 대립 형질', R.x + 12, R.y + 27, { size: 15, weight: 800 });
    const one = rows.length === 1;
    if (!one) {
      ctx.strokeStyle = '#e3eadb'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(R.x + 14, R.y + 139); ctx.lineTo(R.x + R.w - 14, R.y + 139); ctx.stroke();
    }
    rows.forEach((gn, i) => {
      const top = one ? R.y + 50 : R.y + 40 + i * 104;
      const pr = one ? 26 : 16;
      const py = one ? top + 52 : top + 36;
      const xa = R.x + 48, xb = R.x + R.w - 48;
      text(gn.trait, R.x + R.w / 2, top + (one ? 6 : 8), { size: 13, weight: 800, color: '#6f7a8c', align: 'center' });
      const a = peaOf(gn, true), b = peaOf(gn, false);
      const bob = RM ? 0 : Math.sin(t * 1.8 + i) * 1.2;
      if (one) { drawPod(xa, py + 6, 78, 46); drawPod(xb, py + 6, 78, 46); }
      drawPea(xa, py + bob, pr, a.round, a.yellow, 1.3);
      drawPea(xb, py - bob, pr, b.round, b.yellow, 2.2);
      text('↔', R.x + R.w / 2, py + 6, { size: 18, weight: 800, color: '#9aa5b6', align: 'center' });
      const ny = py + pr + (one ? 20 : 19);
      text(gn.dom, xa, ny, { size: 14, weight: 800, align: 'center' });
      text(gn.rec, xb, ny, { size: 14, weight: 800, align: 'center' });
      if (on('genes')) {
        ctx.save(); ctx.globalAlpha = gp; ctx.translate(0, (1 - gp) * 8);
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
        ctx.restore();
      }
    });
  }
  function tag(s, cx, cy, strong) {
    ctx.font = font(13, 800);
    const w = ctx.measureText(s).width + 14;
    ctx.fillStyle = strong ? '#e2f6eb' : '#eef1f6'; rr(cx - w / 2, cy - 11, w, 22, 11); ctx.fill();
    text(s, cx, cy + 1, { size: 13, weight: 800, color: strong ? '#0b6b39' : '#6f7a8c', align: 'center', base: 'middle' });
  }

  /* ---------- 부모 자리 ---------- */
  function drawSlots(t) {
    SLOTS.forEach((s, i) => {
      const sx = shakeOff('s' + i, t);
      if (i === 1 && singleSlot()) {
        text('♂ 다른 완두', s.cx, LAY.headY, { size: 14, weight: 800, color: '#93a08a', align: 'center' });
        lockedBox(s, '다른 완두와 교배', 2, 'lockS', t);
        return;
      }
      const rv = i === 1 ? revealP('cross', t) : 1;
      const it = S.slots[i];
      const cy0 = s.y + s.h / 2;
      ctx.save();
      popIn(s, rv) || ctx.save();
      ctx.translate(sx, 0);
      const head = i === 0 && singleSlot() ? '🌼 자가 수분할 완두' : s.name;
      text(head, s.cx, LAY.headY, { size: 14, weight: 800, color: s.col, align: 'center' });
      const over = !!(S.drag && S.drag.moved && inR(S.drag, s));
      const hot = s.hot || 0;
      // 끌고 있을 때 놓을 수 있는 자리 안내 (맥박)
      const dragging = !!(S.drag && S.drag.moved);
      if (dragging && !it) {
        const k = RM ? 0.5 : 0.5 + 0.5 * Math.sin(t * 6);
        D.glow(s.cx, cy0, s.w * 0.62, s.col, 0.12 + 0.12 * k);
      }
      D.shadow(() => { rr(s.x, s.y, s.w, s.h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10 + 8 * hot, y: 3, color: 'rgba(40,70,30,.16)' });
      const fg = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
      if (it) { fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, mix('#f5f9f1', s.soft, 0.35 + 0.4 * hot)); }
      else { fg.addColorStop(0, mix('#f8fbf4', s.soft, hot)); fg.addColorStop(1, mix('#eef4e8', s.soft, hot)); }
      ctx.fillStyle = fg; rr(s.x, s.y, s.w, s.h, 14); ctx.fill();
      ctx.save();
      if (!it && !over) ctx.setLineDash([7, 5]);
      ctx.strokeStyle = it || over ? s.col : mix('#b9c4d4', s.col, hot * 0.7); ctx.lineWidth = 2 + hot * 1.5;
      rr(s.x, s.y, s.w, s.h, 14); ctx.stroke();
      ctx.restore();
      const fl = t - S.flash[i];
      if (fl < 0.5 && !RM) {
        ctx.save(); ctx.strokeStyle = s.col; ctx.globalAlpha = 1 - fl / 0.5; ctx.lineWidth = 3;
        rr(s.x - fl * 14, s.y - fl * 14, s.w + fl * 28, s.h + fl * 28, 14 + fl * 10); ctx.stroke(); ctx.restore();
      }
      if (!it) {
        const bob = RM ? 0 : Math.sin(t * 2.2 + i) * 2;
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = mix('#b9c4d4', s.col, 0.5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.cx, s.y + 43 + bob, 17, 0, TAU); ctx.stroke(); ctx.restore();
        text('＋', s.cx, s.y + 44 + bob, { size: 26, weight: 700, color: mix('#b9c4d4', s.col, 0.5), align: 'center', base: 'middle' });
        text('완두를 여기로', s.cx, s.y + 80, { size: 13, weight: 700, color: '#6f7a8c', align: 'center' });
        if (S.targets.ids && S.targets.ids.length) ringRR(s.x, s.y, s.w, s.h, 14, t);
        ctx.restore(); ctx.restore();
        return;
      }
      // 부모 완두 (놓을 때 날아와 안착)
      const P = S.pose[i];
      const pa = clamp(P.a, 0, 1);
      ctx.save();
      ctx.translate(s.cx + P.dx, cy0 + P.dy); ctx.scale(Math.max(0.05, P.s), Math.max(0.05, P.s)); ctx.translate(-s.cx, -cy0);
      ctx.globalAlpha *= pa;
      const L = looks(it.g);
      const sd = parseInt(it.id.slice(1), 10) * 1.7;
      drawPod(s.x + 42, s.y + 62, 76, 38);
      drawPea(s.x + 28, s.y + 60, 14, L.round, L.yellow, sd, { shadow: false });
      drawPea(s.x + 56, s.y + 62, 14, L.round, L.yellow, sd + 1.9, { shadow: false });
      text(titleOf(it), s.x + 84, s.y + 36, { size: 14, weight: 800, max: s.w - 90 });
      if (on('genes')) {
        const dim = tokenDim(i, t);
        tokenRects(i, it.g).forEach((tk, ti) => {
          const gn = geneOf(tk.c);
          const tp = clamp((t - S.gT0[i] - 0.2 - ti * 0.07) / 0.35, 0, 1);
          const tsc = ease.outBack(tp);
          ctx.save();
          ctx.globalAlpha *= dim;
          ctx.translate(tk.x + tk.w / 2, tk.y + tk.h / 2); ctx.scale(Math.max(0.05, tsc), Math.max(0.05, tsc));
          D.shadow(() => { rr(-tk.w / 2, -tk.h / 2, tk.w, tk.h, 8); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2, color: 'rgba(40,40,20,.2)' });
          ctx.strokeStyle = GENES[gn].ink; ctx.lineWidth = 2; rr(-tk.w / 2, -tk.h / 2, tk.w, tk.h, 8); ctx.stroke();
          alleleText(tk.c, 0, 0, it.g.length === 2 ? 18 : 16);
          ctx.restore();
        });
      } else {
        pureChip(chipOf(it), isPure(it.g), s.x + 84, s.y + 68);
      }
      ctx.restore();
      // 비우기 표시
      ctx.fillStyle = '#eef1f6'; ctx.beginPath(); ctx.arc(s.x + s.w - 14, s.y + 14, 10, 0, TAU); ctx.fill();
      text('✕', s.x + s.w - 14, s.y + 15, { size: 13, weight: 800, color: '#6b768a', align: 'center', base: 'middle' });
      ctx.restore(); ctx.restore();
    });
  }
  // 분리되는 동안 유전자 카드가 흐려졌다가 돌아옴
  function tokenDim(side, t) {
    const A = S.anim;
    if (!A || !A.genes) return 1;
    const el = t - A.t0;
    const a = ease.inOutCubic(clamp(el / 0.15, 0, 1)), b = ease.inOutCubic(clamp((el - 0.75) / 0.35, 0, 1));
    return 1 - 0.55 * a * (1 - b);
  }

  /* ---------- 꽃 ---------- */
  function canGo() { return !S.anim && !!(S.slots[0] || S.slots[1]); }
  function drawFlower(t) {
    const [a, b] = S.slots;
    const ready = canGo();
    const f = FLOWER;
    const lit = FL.lit;
    const fx = f.x + shakeOff('fl', t);
    const pulse = ready && !RM ? 1 + 0.035 * Math.sin(t * 5) : 1;
    // 꽃 줄기
    ctx.save();
    ctx.strokeStyle = mix('#cdd8c4', '#5fae3f', lit); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fx, f.y + f.r * 0.8); ctx.quadraticCurveTo(fx + 6, f.y + f.r * 1.15, fx, f.y + f.r * 1.4); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(fx, f.y); ctx.scale(pulse, pulse); ctx.translate(-fx, -f.y);
    if (lit > 0.3) D.glow(fx, f.y - 4, f.r * 1.5, '#ff9fd0', 0.28 * lit * (S.anim ? 1.4 : 1));
    peaFlower(fx, f.y, f.r * 0.92, FL.open.value, lit, t);
    ctx.restore();
    const crossing = !!(a && b && a !== b);
    D.label(fx, f.y + f.r + 6, crossing ? '교배' : '수분', { bg: lit > 0.5 ? '#be185d' : '#aeb7c4', color: '#fff', size: 13, pad: 9 });
    let cap;
    if (S.anim) cap = S.anim.res.self ? '🌼 자가 수분 중…' : '🌸 교배 중…';
    else if (singleSlot()) cap = a ? '꽃을 누르면 자가 수분' : '완두를 놓아요';
    else if (a && b) cap = a === b ? '🌼 자가 수분' : LAY.longCap ? '타가 수분 (다른 개체끼리)' : '타가 수분';
    else if (a || b) cap = LAY.longCap ? '한쪽만 놓으면 자가 수분' : '자가 수분 가능';
    else cap = LAY.longCap ? '♀ × ♂ 부모를 놓아요' : '부모를 놓아요';
    text(cap, f.x, LAY.capY, { size: 13, weight: 700, color: a || b ? '#be185d' : '#6f7a8c', align: 'center', max: LAY.longCap ? 196 : 96 });
    if (ready && S.targets.flower) D.ring(fx, f.y - 2, f.r + 6, t, { color: '#14a058', speed: 1.2 });
  }

  /* ---------- 생식세포 ---------- */
  function gameteCell(x, y, r, letters, side, o) {
    o = o || {};
    const sc = o.scale == null ? 1 : o.scale;
    if (sc <= 0.02) return;
    const s = SLOTS[side];
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    D.glow(0, 0, r * 1.8, s.col, o.glow == null ? 0.26 : o.glow);
    D.sphere(0, 0, r, side === 0 ? '#f9a8d4' : '#93b8f8', { shadow: !o.noShadow, outline: s.col, outlineWidth: 2 });
    alleleText(letters, 0, 0, letters.length === 1 ? Math.min(19, r * 1.0) : Math.max(13, Math.min(15, r * 0.82)), { halo: true });
    ctx.restore();
  }
  function zygoteCell(x, y, r, letters, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(o.scale == null ? 1 : o.scale, o.scale == null ? 1 : o.scale);
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    D.glow(0, 0, r * 2.2, '#a3e635', 0.4);
    D.sphere(0, 0, r, '#bef264', { shadow: true, outline: '#16a34a', outlineWidth: 2.5 });
    alleleText(letters, 0, 0, letters.length === 1 ? 15 : 13, { halo: true });
    ctx.restore();
  }
  function drawGametes(t) {
    if (!on('genes')) {
      // 유전자를 배우기 전: 꽃 → 자손 트레이 화살표만
      const x = FLOWER.x, y0 = LAY.capY + 12, y1 = TRAY.y - 6;
      ctx.save();
      const flow = RM ? 0 : (t * 18) % 12;
      D.dashedLine(x, y0, x, y1 - 10, { color: '#b3c2a6', width: 3, dash: [6, 6], offset: flow });
      ctx.fillStyle = '#b3c2a6';
      ctx.beginPath(); ctx.moveTo(x - 9, y1 - 12); ctx.lineTo(x + 9, y1 - 12); ctx.lineTo(x, y1); ctx.closePath(); ctx.fill();
      ctx.restore();
      text('씨(자손)', x + 14, (y0 + y1) / 2 + 5, { size: 13, weight: 700, color: '#7d8a74' });
      return;
    }
    const A = S.anim;
    const el = A ? t - A.t0 : 99;
    const any = S.slots[0] || S.slots[1];
    if (!any) {
      text(LAY.longCap ? '부모를 놓으면 생식세포(유전자를 하나씩 가진 세포)가 나타나요' : '부모를 놓으면 생식세포가 나타나요',
        (SLOTS[0].x + SLOTS[1].x + SLOTS[1].w) / 2, GAM_Y + 5, { size: 13, weight: 700, color: '#6f7a8c', align: 'center', max: SLOTS[1].x + SLOTS[1].w - SLOTS[0].x - 20 });
      return;
    }
    S.slots.forEach((it, side) => {
      if (!it || (side === 1 && singleSlot())) return;
      const g = it.g;
      const groups = gameteGroups(g);
      const toks = tokenRects(side, g);
      const born = t - S.gT0[side];
      // 분리 선: 유전자 카드 → 생식세포 (부드럽게 휘는 점선)
      ctx.save();
      ctx.lineWidth = 1.8; ctx.setLineDash([3, 4]);
      ctx.lineDashOffset = RM ? 0 : -(t * 14) % 14;
      groups.forEach((gr, k) => {
        const gp = gametePos(side, k, groups.length);
        Array.from(gr.gm).forEach((c, j) => {
          tokensFor(g, gr.gm, j).forEach((ti) => {
            const tk = toks[ti];
            const x1 = tk.x + tk.w / 2, y1 = tk.y + tk.h + 3, x2 = gp.x, y2 = gp.y - gameteR(groups.length) - 2;
            ctx.strokeStyle = rgba(GENES[geneOf(c)].ink, 0.3 * clamp(born / 0.4, 0, 1));
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(x1, (y1 + y2) / 2, x2, (y1 + y2) / 2, x2, y2); ctx.stroke();
          });
        });
      });
      ctx.restore();
      groups.forEach((gr, k) => {
        const gp = gametePos(side, k, groups.length);
        const r = gameteR(groups.length);
        const pp = clamp((born - 0.3 - k * 0.1) / 0.45, 0, 1);
        const bob = RM ? 0 : Math.sin(t * 2.1 + k * 1.7 + side * 2.3) * 2.2;
        let pulse = 1;
        if (A && A.genes && el > 0.62 && el < 1.0) pulse = 1 + 0.2 * Math.sin(((el - 0.62) / 0.38) * Math.PI);
        gameteCell(gp.x, gp.y + bob * pp, r, gr.gm, side, { scale: ease.outBack(pp) * pulse });
        if (pp > 0.5) text(fracText(gr.p), gp.x, gp.y + r + 16, { size: 13, weight: 700, color: '#6f7a8c', align: 'center' });
      });
    });
    if (!singleSlot() && (!A || el > 2.4)) {
      text(LAY.longCap ? '◀  생식세포  ▶' : '◀ 생식세포 ▶', MERGE.x, GAM_Y + 5, { size: 13, weight: 800, color: '#6f7a8c', align: 'center' });
    } else if (singleSlot() && (!A || el > 2.4)) {
      text('◀ 생식세포', SLOTS[0].x + SLOTS[0].w + 12, GAM_Y + 5, { size: 13, weight: 800, color: '#6f7a8c' });
    }
  }

  /* ---------- 자손 트레이 ---------- */
  let TRAY_DOTS = null;
  function drawTray(t) {
    const T = TRAY;
    D.shadow(() => {
      const g = ctx.createLinearGradient(0, T.y, 0, T.y + T.h);
      g.addColorStop(0, '#9a7b58'); g.addColorStop(1, '#6f553c');
      ctx.fillStyle = g; rr(T.x, T.y, T.w, T.h, 16); ctx.fill();
    }, { blur: 14, y: 4, color: 'rgba(50,35,20,.35)' });
    // 안쪽 흙
    const ix = T.x + 5, iy = T.y + 5, iw = T.w - 10, ih = T.h - 10;
    const sg = ctx.createLinearGradient(0, iy, 0, iy + ih);
    sg.addColorStop(0, '#5a4636'); sg.addColorStop(1, '#6a5240');
    ctx.fillStyle = sg; rr(ix, iy, iw, ih, 12); ctx.fill();
    ctx.save(); rr(ix, iy, iw, ih, 12); ctx.clip();
    const ig = ctx.createLinearGradient(0, iy, 0, iy + 26);
    ig.addColorStop(0, 'rgba(20,12,6,.45)'); ig.addColorStop(1, 'rgba(20,12,6,0)');
    ctx.fillStyle = ig; ctx.fillRect(ix, iy, iw, 26);
    if (!TRAY_DOTS || TRAY_DOTS.w !== iw) {
      let s = 7;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      TRAY_DOTS = { w: iw, list: Array.from({ length: 70 }, () => [rnd(), rnd(), rnd() > 0.5]) };
    }
    TRAY_DOTS.list.forEach((d) => { ctx.fillStyle = d[2] ? 'rgba(255,235,210,.07)' : 'rgba(20,10,0,.12)'; ctx.fillRect(ix + d[0] * iw, iy + d[1] * ih, 2.4, 2.4); });
    ctx.restore();
    const res = S.result;
    if (!res) {
      text('자손 트레이', T.x + 16, T.y + 27, { size: 14, weight: 800, color: '#f6efe6' });
      text(on('cross') ? '🌸 교배하면 자손 완두(씨)가 여기에 나와요' : '🌼 자가 수분하면 자손 완두(씨)가 여기에 나와요',
        T.x + T.w / 2, T.y + T.h / 2 + 14, { size: 14, weight: 700, color: 'rgba(246,239,230,.88)', align: 'center', max: T.w - 24 });
      return;
    }
    const fc = S.fc;
    const shown = fc.shown;
    const gn = genName(res.gen);
    text((gn ? gn + ' · ' : '자손 · ') + shown + '개', T.x + 16, T.y + 27, { size: 14, weight: 800, color: '#f6efe6', max: SORT_BTN.x - T.x - 24 });
    if (on('results')) {
      const sb = SORT_BTN, hv = S.hov && S.hov.type === 'sort';
      D.shadow(() => { rr(sb.x, sb.y, sb.w, sb.h, 15); ctx.fillStyle = S.sorted ? '#fde68a' : hv ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.2)'; ctx.fill(); }, { blur: 5, y: 2, color: 'rgba(0,0,0,.25)' });
      text(S.sorted ? '섞어 보기' : '모아 보기', sb.x + sb.w / 2, sb.y + sb.h / 2 + 1, { size: 13, weight: 800, color: S.sorted ? '#6b4a00' : '#f6efe6', align: 'center', base: 'middle' });
    }
    const A = fc.A;
    const el = fc.el;
    const r = res.r;
    const showText = on('genes') && r >= (MULTI ? 16 : 13);   // 자손이 많으면 글자 생략 (모양이 잘 보이도록)
    const fs = clamp(r * (MULTI ? 0.55 : 0.78), 13, 18);
    res.kids.forEach((k, i) => {
      let sc = 1;
      if (A) {
        if (el < k.pop) return;
        sc = ease.outBack(clamp((el - k.pop) / 0.35, 0, 1));
      }
      const L = looks(k.g);
      const hv = S.hov && S.hov.type === 'kid' && S.hov.i === i ? 1.12 : 1;
      drawPea(k.x, k.y - (hv > 1 ? 2 : 0), r * sc * hv, L.round, L.yellow, k.seed, { shadow: r > 7 });
      if (showText && sc >= 0.98) alleleText(k.g, k.x, k.y, fs, { halo: true });
    });
    if (on('genes') && !showText && !A && res.sel < 0) {
      const note = '🧬 자손이 많아 유전자형 글자는 생략' + (MULTI ? ' (20개에서 보여요)' : ' → 결과 표');
      ctx.font = font(13, 800);
      const w = Math.min(T.w - 16, ctx.measureText(note).width + 20);
      ctx.fillStyle = 'rgba(30,22,16,.62)'; rr(T.x + (T.w - w) / 2, T.y + T.h - 30, w, 24, 12); ctx.fill();
      text(note, T.x + T.w / 2, T.y + T.h - 17, { size: 13, weight: 800, color: '#fdf6ec', align: 'center', base: 'middle', max: w - 14 });
    }
    // 선택한 자손
    if (res.sel >= 0 && !A) {
      const k = res.kids[res.sel];
      const u = clamp((t - (res.selAt || 0)) / 0.3, 0, 1), e = ease.outBack(u);
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(k.x, k.y, r + 4 * e, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(k.x, k.y, r + 6.5 * e, 0, TAU); ctx.stroke();
      ctx.restore();
      const lab = phenoName(k.g) + (on('genes') ? ' · ' + k.g : '');
      ctx.font = font(14, 800);
      const w = ctx.measureText(lab).width + 18;
      const bx = clamp(k.x - w / 2, T.x + 6, T.x + T.w - w - 6);
      let by = k.y - r - 38;
      if (by < PEAS.y - 8) by = k.y + r + 10;      // 위쪽 줄이면 머리글과 겹치지 않게 아래에 표시
      ctx.save(); ctx.globalAlpha = u; ctx.translate(0, (1 - e) * 6);
      D.shadow(() => { rr(bx, by, w, 27, 13); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 2, color: 'rgba(0,0,0,.3)' });
      text(lab, bx + w / 2, by + 14, { size: 14, weight: 800, align: 'center', base: 'middle' });
      ctx.restore();
    }
  }
  // 한 프레임에서 보이는 자손 수 · 표현형별 개수 · 유전자형별 개수
  function frameCounts(t) {
    const res = S.result;
    if (!res) return null;
    const A = S.anim && S.anim.res === res ? S.anim : null;
    const el = A ? t - A.t0 : 1e9;
    const c = {}, gc = {};
    let shown = 0;
    CLASSES.forEach((k) => { c[k.key] = 0; });
    for (let i = 0; i < res.kids.length; i++) {
      const k = res.kids[i];
      if (k.pop > el) continue;
      shown++; c[k.key]++; gc[k.g] = (gc[k.g] || 0) + 1;
    }
    return { shown, vals: CLASSES.map((k) => c[k.key]), gc, el, A };
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
    if (!on('results')) { lockedBox(RES, '결과 표', 2, 'lockR', t); return; }
    const rv = revealP('results', t);
    ctx.save();
    popIn(RES, rv) || ctx.save();
    drawResultsBody(t);
    ctx.restore(); ctx.restore();
  }
  function drawResultsBody(t) {
    panel(RES);
    text('📊 결과 (표현형)', RES.x + 12, RES.y + 25, { size: 14, weight: 800 });
    const res = S.result;
    const H = RES.horiz;
    if (!res) {
      const cy = H ? RES.y + RES.h / 2 + 4 : RES.y + RES.h / 2;
      text('교배 결과가', RES.x + RES.w / 2, cy - 10, { size: 13, weight: 700, color: '#6f7a8c', align: 'center' });
      text('여기에 나와요', RES.x + RES.w / 2, cy + 10, { size: 13, weight: 700, color: '#6f7a8c', align: 'center' });
      return;
    }
    const fc = S.fc, shown = fc.shown, vals = fc.vals, gc = fc.gc;
    const dv = S.disp.v;
    const dsum = Math.max(1e-6, dv.reduce((a, b) => a + b, 0));
    const x0 = RES.x + 12, x1 = H ? RES.x + 288 : RES.x + RES.w - 12;
    const step = MULTI ? (H ? 33 : 32) : 52;
    CLASSES.forEach((c, i) => {
      const y0 = RES.y + (MULTI ? 34 : 40) + i * step;
      const L = looks(c.key.split('').map((ch) => ch + ch).join(''));
      drawPea(x0 + 9, y0 + 9, MULTI ? 8 : 11, L.round, L.yellow, i * 2.3, { shadow: false });
      text(c.name, x0 + (MULTI ? 22 : 26), y0 + 14, { size: MULTI ? 13 : 14, weight: 800, max: x1 - x0 - (MULTI ? 62 : 70) });
      text(String(Math.round(dv[i])), x1, y0 + 14, { size: MULTI ? 14 : 16, weight: 800, align: 'right' });
      const barW = x1 - x0, bh = MULTI ? 6 : 10, by = y0 + (MULTI ? 21 : 26);
      ctx.fillStyle = '#e8eee2'; rr(x0, by, barW, bh, bh / 2); ctx.fill();
      const frac = dv[i] / dsum;
      if (frac > 0.002) {
        const cc = peaColors(L.round, L.yellow);
        const bw = Math.max(bh, barW * frac);
        const bg = ctx.createLinearGradient(0, by, 0, by + bh);
        bg.addColorStop(0, cc[0]); bg.addColorStop(0.5, cc[1]); bg.addColorStop(1, cc[2]);
        ctx.fillStyle = bg; rr(x0, by, bw, bh, bh / 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(x0 + 2, by + 1, Math.max(0, bw - 4), Math.max(1.5, bh * 0.28), bh / 4); ctx.fill();
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
    const bgr = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
    bgr.addColorStop(0, '#f2f8ee'); bgr.addColorStop(1, '#e8f1e1');
    ctx.fillStyle = bgr; rr(box.x, box.y, box.w, box.h, 10); ctx.fill();
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
  // 교배 한 번의 시간표 (초): 분리 → 생식세포가 만남(수정) → 수정란이 씨로 자람
  const T_SEP = 0.7, T_MERGE = 0.5, T_HOLD = 0.15, T_FLY = 0.5;
  const kidArrive = (e) => T_SEP + 0.05 + e * 0.2 + T_MERGE + T_HOLD + T_FLY;
  function drawAnim(t) {
    const A = S.anim;
    if (!A.genes) { drawPollen(t); return; }
    const el = t - A.t0, res = A.res;
    const sides = A.single ? [0] : [0, 1];
    // ① 분리: 유전자 글자가 생식세포로 날아감
    if (el < T_SEP + 0.05) {
      sides.forEach((side) => {
        const g = A.g[side];
        const groups = gameteGroups(g);
        const toks = tokenRects(side, g);
        const u = clamp((el - 0.05) / 0.62, 0, 1), e = ease.inOutCubic(u);
        if (u <= 0) return;
        groups.forEach((gr, k) => {
          const gp = gametePos(side, k, groups.length);
          Array.from(gr.gm).forEach((c, j) => {
            const tk = toks[tokensFor(g, gr.gm, j)[0]];
            const off = gr.gm.length === 1 ? 0 : (j - 0.5) * 11;
            const x1 = tk.x + tk.w / 2, y1 = tk.y + tk.h / 2, x2 = gp.x + off, y2 = gp.y;
            const q = bez(x1, y1, x2, y2, e);
            ctx.save(); ctx.globalAlpha = 1 - clamp((u - 0.88) / 0.12, 0, 1);
            D.glow(q.x, q.y, 20, GENES[geneOf(c)].ink, 0.28);
            alleleText(c, q.x, q.y, 18 + 2 * Math.sin(u * Math.PI), { halo: true });
            ctx.restore();
            if (!RM && u < 1 && A.trail !== Math.floor(el * 40)) {
              parts.emit({ x: q.x + (Math.random() - 0.5) * 6, y: q.y + (Math.random() - 0.5) * 6, vx: 0, vy: 0, life: 0.35, size: 2.6, color: GENES[geneOf(c)].ink, gravity: 0 });
            }
          });
        });
      });
      A.trail = Math.floor(el * 40);
      const lp = ease.outBack(clamp((el - 0.12) / 0.3, 0, 1));
      if (el > 0.12 && el < 1.3) {
        ctx.save(); ctx.globalAlpha = 1 - clamp((el - 1.0) / 0.3, 0, 1);
        const lx = A.single ? SLOTS[0].x + SLOTS[0].w + 42 : MERGE.x, ly = GAM_Y - 34;
        ctx.translate(lx, ly); ctx.scale(lp, lp);
        D.label(0, 0, '분리!', { bg: '#be185d', color: '#fff', size: 15, pad: 10 });
        ctx.restore();
      }
    }
    // ② 수정: 생식세포가 만나 수정란이 되고, 수정란이 씨가 됨
    const K = A.K;
    const gA = gameteGroups(A.g[0]), gB = gameteGroups(A.g[1]);
    const allA = gametesOf(A.g[0]), allB = gametesOf(A.g[1]);
    const mx = A.single ? SLOTS[0].x + SLOTS[0].w + 50 : MERGE.x, my = MERGE.y;
    for (let e = 0; e < K; e++) {
      const st = T_SEP + 0.05 + e * 0.2;
      const u = (el - st) / T_MERGE;
      if (u < 0) continue;
      const kid = res.kids[e];
      const ga = allA[kid.ia], gb = allB[kid.ib];
      const ka = gA.findIndex((x) => x.gm === ga), kb = gB.findIndex((x) => x.gm === gb);
      const pa = gametePos(0, ka, gA.length), pb = gametePos(A.single ? 0 : 1, kb, gB.length);
      const r = gA.length <= 2 ? 15 : 13;
      if (u < 1) {
        const ee = ease.inOutCubic(u);
        const ax = pa.x + (mx - 15 - pa.x) * ee, ay = pa.y + (my - pa.y) * ee - Math.sin(u * Math.PI) * 10;
        const bx = pb.x + (mx + 15 - pb.x) * ee, by = pb.y + (my - pb.y) * ee - Math.sin(u * Math.PI) * 10;
        gameteCell(ax, ay, r, ga, 0, { glow: 0.2 });
        gameteCell(bx, by, r, gb, A.single ? 0 : 1, { glow: 0.2 });
        continue;
      }
      const w = (el - st - T_MERGE);               // 합쳐진 뒤의 시간
      const zr = r + 7;
      const fz = fuse(ga, gb);
      if (w < T_HOLD) {
        const k = clamp(w / 0.12, 0, 1);
        D.glow(mx, my, 46 * (0.6 + k * 0.7), '#fff7a8', 0.75 * (1 - k * 0.6));
        zygoteCell(mx, my, zr, fz, { scale: 0.55 + 0.45 * ease.outBack(clamp(w / 0.14, 0, 1)) });
      } else {
        const fu = clamp((w - T_HOLD) / T_FLY, 0, 1), fe = ease.inOutCubic(fu);
        const zx = mx + (kid.x - mx) * fe, zy = my + (kid.y - my) * fe - Math.sin(fu * Math.PI) * 16;
        const rad = zr + (Math.max(5, res.r) - zr) * fe;
        zygoteCell(zx, zy, rad, fz, { alpha: 1 - clamp((fu - 0.78) / 0.22, 0, 1) });
      }
    }
    const lt = el - (T_SEP + 0.05 + T_MERGE);
    if (lt > 0 && lt < 1.0) {
      const lp = ease.outBack(clamp(lt / 0.25, 0, 1));
      ctx.save(); ctx.globalAlpha = 1 - clamp((lt - 0.7) / 0.3, 0, 1); ctx.translate(mx, my - 52); ctx.scale(lp, lp);
      D.label(0, 0, '수정!', { bg: '#15803d', color: '#fff', size: 15, pad: 10 });
      ctx.restore();
    }
  }
  // 유전자를 배우기 전: 꽃가루가 꽃으로 날아가고, 꽃에서 씨가 자라 트레이로 내려옴
  const seedStart = (e) => 0.45 + e * 0.15, SEED_FLY = 0.55;
  const seedArrive = (e) => seedStart(e) + SEED_FLY;
  function drawPollen(t) {
    const A = S.anim, el = t - A.t0;
    for (let e = 0; e < A.K; e++) {
      const u = (el - seedStart(e)) / SEED_FLY;
      if (u <= 0 || u >= 1) continue;
      const kid = A.res.kids[e], L = looks(kid.g), ee = ease.inOutCubic(u);
      const x0 = FLOWER.x, y0 = FLOWER.y + FLOWER.r + 4;
      const x = x0 + (kid.x - x0) * ee, y = y0 + (kid.y - y0) * ee - Math.sin(u * Math.PI) * 12;
      D.glow(x, y, 20, '#fde68a', 0.4 * (1 - u));
      drawPea(x, y, 7 + (Math.max(5, A.res.r) - 7) * ee, L.round, L.yellow, kid.seed, { shadow: false });
    }
    if (el > 0.8) return;
    const s = SLOTS[A.single ? 0 : 1];
    const sx = s.cx, sy = s.y + s.h / 2;
    for (let k = 0; k < 9; k++) {
      const u = clamp((el - k * 0.03) / 0.5, 0, 1);
      if (u <= 0 || u >= 1) continue;
      const e = ease.inOutCubic(u);
      const x = sx + (FLOWER.x - sx) * e + Math.sin(k * 1.7 + el * 9) * 6;
      const y = sy + (FLOWER.y - sy) * e - Math.sin(u * Math.PI) * 38 + (k - 4) * 2;
      D.glow(x, y, 11, '#facc15', 0.5);
      D.sphere(x, y, 4.6, '#fde047', { gloss: false, outline: '#ca8a04', outlineWidth: 1 });
    }
  }
  function drawFly(t) {
    S.fly.forEach((f) => {
      const u = clamp((t - f.t0) / f.dur, 0, 1), e = f.card ? ease.outBack(u) : ease.inOutCubic(u);
      const x = f.from.x + (f.to.x - f.from.x) * e, y = f.from.y + (f.to.y - f.from.y) * e - (f.card ? 0 : Math.sin(u * Math.PI) * 22);
      if (f.card) {
        drawCard({ x: x - BANK.cardW / 2, y: y - BANK.cardH / 2, w: BANK.cardW, h: BANK.cardH }, f.item, t, true);
      } else {
        const L = looks(f.item.g);
        drawPea(x, y, 12 + 8 * (1 - e), L.round, L.yellow, 2, { shadow: false });
      }
    });
  }
  function drawGhost(t) {
    const d = S.drag;
    ctx.save();
    ctx.translate(d.x, d.y); ctx.rotate(d.tilt || 0); ctx.scale(1 + 0.07 * d.lift, 1 + 0.07 * d.lift); ctx.translate(-d.x, -d.y);
    ctx.globalAlpha = 0.96;
    drawCard({ x: d.x - BANK.cardW / 2, y: d.y - BANK.cardH / 2, w: BANK.cardW, h: BANK.cardH }, d.item, t, true);
    ctx.restore();
  }
  // 미션을 해냈을 때 꽃 위에 나타나는 체크
  function drawSuccess(t) {
    if (S.okAt == null) return;
    const u = t - S.okAt;
    if (u > 2.2) { S.okAt = null; return; }
    const x = FLOWER.x + 34, y = FLOWER.y - FLOWER.r - 12;
    const sc = ease.outBack(clamp(u / 0.45, 0, 1)) * (1 - clamp((u - 1.7) / 0.5, 0, 1));
    if (sc <= 0.02) return;
    ctx.save(); ctx.globalAlpha = clamp(sc, 0, 1);
    D.check(x, y, 21 * sc, clamp(u / 0.6, 0, 1));
    ctx.restore();
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
    res.kids.forEach((k, i) => {
      const rate = 8 + (i % 5);                   // 조금씩 다른 속도로 움직여 자연스럽게
      k.x = SciSim.approach(k.x, k.tx, dt, rate); k.y = SciSim.approach(k.y, k.ty, dt, rate);
    });
  }
  function kidAt(p) {
    const res = S.result;
    if (!res || !inR(p, PEAS, 6)) return -1;
    let bi = -1, bd = Infinity;
    res.kids.forEach((k, i) => { const d = Math.hypot(k.x - p.x, k.y - p.y); if (d < bd) { bd = d; bi = i; } });
    return bd <= Math.max(res.r + 6, res.cell * 0.6) ? bi : -1;
  }

  /* ---------- 조작 ---------- */
  const bankCenter = (item) => {
    const i = S.bank.indexOf(item);
    if (i < 0) return { x: BANK.x + BANK.w / 2, y: BANK.y + BANK.h / 2 };
    const r = bankRect(i);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  };
  // 놓은 완두가 (손을 뗀 곳 · 보관함에서) 날아와 자리에 안착
  function landPose(side, from) {
    const s = SLOTS[side], c = { x: s.cx, y: s.y + s.h / 2 }, P = S.pose[side];
    P.dx = from.x - c.x; P.dy = from.y - c.y; P.s = 0.5; P.a = 0.1;
    SciSim.tween(P, { dx: 0, dy: 0, s: 1, a: 1 }, {
      duration: 0.5, ease: 'outBack',
      onDone: () => parts.burst(c.x, c.y, { count: 10, colors: [s.col, '#ffffff', '#facc15'], speed: 100, size: 3, life: 0.5, gravity: 40 }),
    });
    S.gT0[side] = now();
  }
  function placeItem(side, item, from) {
    if (singleSlot()) { side = 0; S.slots[1] = null; }
    S.slots[side] = item;
    S.stamp[side] = now();
    S.flash[side] = now();
    landPose(side, from || bankCenter(item));
    Sound.click();
    changed();
  }
  function tapBank(item) {
    const side = singleSlot() ? 0 : S.slots[0] ? (S.slots[1] ? (S.stamp[0] <= S.stamp[1] ? 0 : 1) : 1) : 0;
    placeItem(side, item);
  }
  function clearSlot(side) {
    const it = S.slots[side];
    if (it) {
      const s = SLOTS[side];
      S.fly.push({ item: it, from: { x: s.cx, y: s.y + s.h / 2 + 4 }, to: bankCenter(it), t0: now(), dur: 0.4 });
      it.away = true;
      setTimeout(() => { it.away = false; it.bump = 1; S.fly = S.fly.filter((f) => f.item !== it || f.card); }, 400);
    }
    S.slots[side] = null;
    if (singleSlot()) S.slots = [null, null];
    Sound.tick();
    changed();
  }
  function lockTap(r, step, what) {
    const key = r === RES ? 'lockR' : 'lockS';
    S.lockTip = { r, t: now(), key };
    shake(key);
    Sound.tick();
    toast('🔒 ' + what + '은(는) ' + step + '단계에서 열려요');
  }
  function doCross(selfPlant) {
    if (S.anim) return;
    if (selfPlant) {
      const had = S.slots.slice();
      S.slots = [selfPlant, selfPlant]; S.stamp = [now(), now()]; S.flash = [now(), now()];
      [0, 1].forEach((i) => { if (had[i] !== selfPlant) landPose(i, bankCenter(selfPlant)); });
      changed();
    }
    const [a, b] = S.slots;
    if (!a || !b) {
      Sound.fail();
      if (!a) shake('s0');
      if (!b && on('cross')) shake('s1');
      shake('fl');
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
    // 자손이 나타나는 시각: 앞의 몇 개는 생식세포 → 수정란 → 씨로 이어지는 장면과 맞추고, 나머지는 차례로 톡톡 나타남
    const K = Math.min(4, S.n);
    let last = 0;
    kids.forEach((k, i) => {
      const a0 = genes ? kidArrive(0) : seedArrive(0);
      if (i < K) k.pop = (genes ? kidArrive(i) : seedArrive(i)) - 0.1;
      else k.pop = a0 + 0.1 + 0.9 * ((i - K) / Math.max(1, S.n - K));
      last = Math.max(last, k.pop);
    });
    S.disp.res = res; S.disp.v = CLASSES.map(() => 0);
    S.anim = { t0: now(), res, g: [a.g, b.g], single: singleSlot(), ticks: 0, genes, K, puffed: {}, end: last + 0.5 };
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
    const kids = A.res.kids;
    let want = 0;
    for (let i = 0; i < kids.length; i++) if (kids[i].pop <= el) want++;
    if (want > A.ticks) { if (A.ticks < 10) Sound.tick(); A.ticks = want; }
    for (let e = 0; e < A.K; e++) {                    // 수정란이 씨가 되는 순간 흙먼지
      if (!A.puffed[e] && el >= kids[e].pop + 0.1) {
        A.puffed[e] = true;
        const k = kids[e], L = looks(k.g);
        parts.burst(k.x, k.y + 4, { count: 8, colors: [peaColors(L.round, L.yellow)[1], '#e9d8b8'], speed: 70, size: 2.6, life: 0.4, gravity: 90, shape: 'circle' });
      }
    }
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
    res.selAt = now();
    Sound.tick();
  }
  function setSlots(a, b) {
    const had = S.slots.slice();
    S.slots = [a, b];
    [a, b].forEach((it, i) => { if (it && had[i] !== it) landPose(i, bankCenter(it)); });
    S.stamp = [now(), now() + 0.001];
    S.flash = [now(), now()];
    changed();
  }
  // 단계를 시작할 때 실험대를 깨끗하게
  function resetLab(keepF1) {
    S.anim = null; S.drag = null; S.fly = [];
    S.bank.forEach((it) => { it.away = false; });
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
      S.hov = h;
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
      if (h.type === 'bank') { S.drag = { item: h.item, sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false, lift: 0, tilt: 0, vx: 0 }; return true; }
      if (h.type === 'slot') { clearSlot(h.i); return false; }
      if (h.type === 'flower') { selfOrCross(); return false; }
      if (h.type === 'kid') { selectKid(h.i); return false; }
      return false;
    },
    move(p) {
      const d = S.drag;
      if (!d) return;
      d.vx = p.x - d.x;
      d.x = p.x; d.y = p.y;
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 8) { d.moved = true; d.item.away = true; Sound.tick(); }
    },
    up(p) {
      const d = S.drag;
      S.drag = null;
      if (!d) return;
      d.item.away = false;
      if (!d.moved) { tapBank(d.item); return; }
      const side = SLOTS.findIndex((s) => inR(p, { x: s.x - 10, y: s.y - 14, w: s.w + 20, h: s.h + 40 }));
      if (side === 1 && singleSlot()) { lockTap(SLOTS[1], 2, '다른 완두와의 교배'); flyBack(d, p); return; }
      if (side >= 0) placeItem(side, d.item, { x: p.x, y: p.y });
      else flyBack(d, p);
    },
  };
  // 엉뚱한 곳에 놓으면 카드가 튕겨 보관함으로 돌아감
  function flyBack(d, p) {
    const it = d.item, to = bankCenter(it);
    it.away = true;
    S.fly.push({ item: it, card: true, from: { x: p.x, y: p.y }, to, t0: now(), dur: 0.45 });
    setTimeout(() => { it.away = false; it.bump = 1; S.fly = S.fly.filter((f) => f.item !== it); }, 450);
  }
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
    view = SciSim.stage(cv, { width: LAY.w, height: LAY.h, background: BG, onResize: () => { sprites.clear(); placeHint(); } });
    ctx = view.ctx;
    D = SciSim.draw(ctx);
    sprites.clear();
    SciSim.pointer(view, handlers);
    cv.addEventListener('pointerleave', () => { S.hov = null; });
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
    pn.colH = []; pn.rowH = [];
    mG.forEach((g, j) => {
      const h = E('div', { class: 'pn-gam ' + (b ? 'm' : 'q') }, [E('span', { html: alleleHTML(g), class: 'drop', style: '--d:' + (0.05 * j).toFixed(2) + 's' })]);
      pn.colH.push(h); pn.grid.appendChild(h);
    });
    for (let i = 0; i < m; i++) {
      const rh = E('div', { class: 'pn-gam ' + (a ? 'f' : 'q') }, [E('span', { html: alleleHTML(fG[i]), class: 'drop', style: '--d:' + (0.05 * i + 0.1).toFixed(2) + 's' })]);
      pn.rowH.push(rh); pn.grid.appendChild(rh);
      pn.fill.push([]); pn.ans.push([]); pn.cells.push([]);
      for (let j = 0; j < m; j++) {
        const ans = ok ? fuse(fG[i], mG[j]) : null;
        pn.ans[i][j] = ans;
        pn.fill[i][j] = null;
        let cell;
        if (MULTI && ok) {
          const L = looks(ans);
          cell = E('div', { class: 'pn-cell c-' + phenoKey(ans), title: phenoName(ans) }, []);
          cell.innerHTML = '<span class="drop" style="--d:' + (0.3 + 0.045 * (i * m + j)).toFixed(2) + 's">' + alleleHTML(ans) + '</span>' + peaSVG(L.round, L.yellow, 18);
        } else {
          cell = E('button', { type: 'button', class: 'pn-cell', 'data-cell': i + '-' + j, 'aria-label': (i + 1) + '행 ' + (j + 1) + '열 칸' });
          if (!editable) { cell.disabled = true; cell.textContent = '?'; }
          else cell.addEventListener('click', () => paintCell(i, j));
        }
        pn.cells[i][j] = cell;
        // 칸에 손을 올리면 그 칸을 만드는 ♀·♂ 생식세포 표시
        const hl = (on_) => { if (pn.rowH[i]) pn.rowH[i].classList.toggle('hl', on_); if (pn.colH[j]) pn.colH[j].classList.toggle('hl', on_); cell.classList.toggle('hov', on_); };
        cell.addEventListener('pointerenter', () => hl(true));
        cell.addEventListener('pointerleave', () => hl(false));
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
      cell.innerHTML = '<span class="drop">' + alleleHTML(v) + '</span>' + peaSVG(L.round, L.yellow, 22).replace('<svg', '<svg class="drop"');
    } else cell.innerHTML = '';
    pn.lastSig = '';
    pn.msg.textContent = ''; pn.msg.className = 'pn-msg';
    Sound.tick();
  }
  function gradePunnett() {
    const [a, b] = S.slots;
    if (!a || !b) return '♀·♂ 자리에 부모 완두를 먼저 놓아 주세요.';
    if (MULTI) return true;
    let wrong = 0, empty = 0, sig = '';
    pn.cells.forEach((row, i) => row.forEach((cell, j) => {
      cell.classList.remove('bad', 'warn', 'good');
      const v = pn.fill[i][j];
      if (!v) { empty++; cell.classList.add('warn'); sig += 'e'; } else if (v !== pn.ans[i][j]) { wrong++; cell.classList.add('bad'); sig += 'x'; } else sig += 'o';
    }));
    // 틀린 칸이 새로 생겼을 때만 살짝 흔들기 (다시 확인하는 동안 계속 흔들리지 않게)
    if ((wrong || empty) && sig !== pn.lastSig) {
      pn.lastSig = sig;
      pn.grid.classList.remove('shake'); void pn.grid.offsetWidth; pn.grid.classList.add('shake');
    }
    if (wrong) return '빨간 칸 ' + wrong + '개가 틀렸어요. 그 칸의 왼쪽(♀)과 위쪽(♂) 생식세포 글자를 하나씩 합쳐 보세요.';
    if (empty) return '빈 칸(노란색)이 ' + empty + '개 있어요. 4칸을 모두 채워 주세요.';
    pn.cells.forEach((row, i) => row.forEach((cell, j) => {
      if (!cell.classList.contains('good')) { cell.style.setProperty('--d', ((i * 2 + j) * 0.08).toFixed(2) + 's'); cell.classList.add('good', 'pop'); }
    }));
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
    if (r === true) { Sound.success(); toast('🎉 퍼넷 사각형 정답!', 'good'); celebrate(false); } else { Sound.fail(); pn.msg.className = 'pn-msg'; pn.msg.textContent = '🤔 ' + r; }
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
    onFeatures(set, added) {
      F = new Set(set);
      (added || []).forEach((f) => {
        revealAt[f] = now();
        const q = LAY && featureSpot(f);
        if (q) { parts.burst(q.x, q.y, { count: 14, colors: [q.c, '#ffffff'], speed: 120, size: 3, life: 0.7, gravity: 40 }); }
      });
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
  // 점검용 (개발자 도구 · 자동 시험에서 사용)
  window.__sim = {
    S, pn,
    get game() { return game; }, get LAY() { return LAY; }, get view() { return view; },
    bankRect, SLOTS: () => SLOTS, FLOWER: () => FLOWER, TRAY: () => TRAY, RES: () => RES, SORT_BTN: () => SORT_BTN,
    doCross, setSlots, setN, ensureF1, P_DOM, P_REC, parts,
  };
  /* ---------- 프레임마다 부드럽게 따라가는 값들 ---------- */
  function celebrate(big) {
    S.okAt = now();
    parts.burst(FLOWER.x, FLOWER.y, { count: 26, speed: 190, size: 4, life: 1.0 });
    if (big) parts.burst(TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h / 2, { count: 36, speed: 240, size: 4.5, life: 1.2 });
  }
  function featureSpot(f) {
    if (f === 'cross') return { x: SLOTS[1].cx, y: SLOTS[1].y + SLOTS[1].h / 2, c: SLOT_STYLE[1].col };
    if (f === 'results') return { x: RES.x + RES.w / 2, y: RES.y + RES.h / 2, c: '#facc15' };
    if (f === 'genes') return { x: (SLOTS[0].cx + SLOTS[1].cx) / 2, y: GAM_Y, c: '#a78bfa' };
    if (f === 'bank') return { x: BANK.x + BANK.w / 2, y: BANK.y + 40, c: '#facc15' };
    return null;
  }
  function stepFrame(dt) {
    const t = now();
    const busy = !!S.anim, ready = canGo();
    FL.open.target = busy ? 1 : ready ? 0.6 : 0.25;
    FL.open.update(dt);
    FL.lit = SciSim.approach(FL.lit, busy || ready ? 1 : 0, dt, 8);
    SLOTS.forEach((s) => {
      const over = !!(S.drag && S.drag.moved && inR(S.drag, { x: s.x - 10, y: s.y - 14, w: s.w + 20, h: s.h + 40 }));
      s.hot = SciSim.approach(s.hot || 0, over ? 1 : 0, dt, 14);
    });
    S.bank.forEach((it) => {
      const hv = (S.hov && S.hov.type === 'bank' && S.hov.item === it) || (S.drag && S.drag.item === it && !S.drag.moved);
      it.lift = SciSim.approach(it.lift || 0, hv ? 1 : 0, dt, 14);
      it.bump = SciSim.approach(it.bump || 0, 0, dt, 9);
      if (it.born != null && !it.bornFx && t >= it.born + 0.3) {
        it.bornFx = true;
        const c = bankCenter(it);
        parts.burst(c.x, c.y, { count: 14, colors: ['#ec4899', '#facc15', '#ffffff'], speed: 120, size: 3, life: 0.7, gravity: 80 });
      }
    });
    const d = S.drag;
    if (d) {
      d.lift = SciSim.approach(d.lift, d.moved ? 1 : 0, dt, 16);
      d.tilt = SciSim.approach(d.tilt, clamp(d.vx * 0.012, -0.18, 0.18), dt, 10);
      d.vx *= 0.85;
    }
    if (S.result && S.fc) {
      if (S.disp.res !== S.result) { S.disp.res = S.result; S.disp.v = CLASSES.map(() => 0); }
      S.disp.v = S.disp.v.map((v, i) => SciSim.approach(v, S.fc.vals[i], dt, 12));
    }
    // 수분하는 동안 꽃가루가 피어오름
    if (S.anim && !RM && t - S.anim.t0 < 1.6 && Math.random() < dt * 40) {
      parts.emit({ x: FLOWER.x + (Math.random() - 0.5) * 22, y: FLOWER.y + FLOWER.r * 0.35, vx: (Math.random() - 0.5) * 36, vy: -36 - Math.random() * 30, life: 0.9, size: 2.6, color: '#facc15', gravity: -6 });
    }
    parts.update(dt);
    const ph = game ? game.phase : null;
    if (ph !== lastPhase) {
      if (ph === 'success' || ph === 'complete') celebrate(ph === 'complete');
      lastPhase = ph;
    }
  }

  SciSim.loop((dt) => {
    stepAnim();
    stepKids(dt);
    stepFrame(dt);
    draw();
  });
})();
