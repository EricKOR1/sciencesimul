/* =========================================================
   중1 Ⅱ. 생물의 구성과 다양성 — 변이와 생물다양성 [9과02-03]
   ① [관찰] 생물다양성의 세 가지: 유전적 다양성 · 종 다양성 · 생태계 다양성
   ② [탐구] 변이 관찰: 무당벌레 30마리의 점 개수 → 막대그래프
   ③ [실험] 환경과 변이: 두 섬의 새 무리(부리 두께) 세대 진행
   ④ [적용] 다양성 형성: 변이 → 환경에 적응 → 오랜 시간 → 생물다양성 (※ '자연선택'·'진화' 용어는 쓰지 않음)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const EASE = SciSim.ease;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const now = () => performance.now() / 1000;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // 고정 시드 난수 (그림이 매번 같도록)
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, seed) {
    const R = rng(seed), a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    if (a.every((v, i) => v === arr[i])) a.push(a.shift());
    return a;
  }

  /* =========================================================
     무대: 태블릿 = 가로형 800×640, 휴대폰 = 세로형 460×800
     ========================================================= */
  const LAYOUTS = { wide: { w: 800, h: 640 }, tall: { w: 460, h: 800 } };
  const BG = '#eef4ef';
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  let view = null, ctx = null, D = null, W = 800, H = 640, TALL = false, KIND = '';
  let LAY = null;

  /* =========================================================
     그리기 도우미
     ========================================================= */
  const font = (size, weight) => (weight || 700) + ' ' + size + 'px ' + FONT;
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(s, x, y, o) {
    o = o || {};
    let size = o.size || 14;
    ctx.font = font(size, o.weight);
    if (o.max) {
      while (size > (o.min || 11) && ctx.measureText(s).width > o.max) { size -= 0.5; ctx.font = font(size, o.weight); }
    }
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || 4; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#1b2333';
    ctx.fillText(s, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  const lineCache = new Map();
  function lines(s, maxW, size, weight) {
    const key = s + '|' + maxW + '|' + size + '|' + (weight || 700);
    let out = lineCache.get(key);
    if (out) return out;
    ctx.save();
    ctx.font = font(size, weight);
    out = [];
    s.split('\n').forEach((par) => {
      let cur = '';
      par.split(' ').forEach((w) => {
        const tryS = cur ? cur + ' ' + w : w;
        if (ctx.measureText(tryS).width <= maxW) { cur = tryS; return; }
        if (cur) out.push(cur);
        cur = w;
        while (ctx.measureText(cur).width > maxW && cur.length > 1) {
          let k = cur.length - 1;
          while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
          out.push(cur.slice(0, k)); cur = cur.slice(k);
        }
      });
      if (cur) out.push(cur);
    });
    ctx.restore();
    lineCache.set(key, out);
    return out;
  }
  function para(s, x, y, maxW, o) {
    o = o || {};
    const size = o.size || 14, lh = o.lh || Math.round(size * 1.38);
    const ls = lines(s, maxW, size, o.weight);
    ls.forEach((ln, i) => txt(ln, x, y + i * lh, { size, weight: o.weight, color: o.color, align: o.align, base: o.base }));
    return ls.length * lh;
  }
  function pill(s, x, y, o) {
    o = o || {};
    const size = o.size || 14, pad = o.pad != null ? o.pad : 10, h = o.h || size + 12;
    ctx.font = font(size, o.weight || 800);
    const w = ctx.measureText(s).width + pad * 2;
    let lx = x - w / 2;
    if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - w;
    ctx.save();
    if (o.shadow) { ctx.shadowColor = 'rgba(20,40,30,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    rr(lx, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || '#1b2333'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(lx, y - h / 2, w, h, h / 2); ctx.strokeStyle = o.border; ctx.lineWidth = o.borderW || 2; ctx.stroke(); }
    txt(s, lx + w / 2, y + 1, { size, weight: o.weight || 800, color: o.color || '#fff', align: 'center', base: 'middle' });
    return { x: lx, y: y - h / 2, w, h };
  }
  function newRing(r, rad) {
    const a = 0.5 + 0.5 * Math.sin(now() * 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(22,163,74,' + (0.35 + a * 0.5).toFixed(2) + ')'; ctx.lineWidth = 4;
    rr(r.x - 6, r.y - 6, r.w + 12, r.h + 12, (rad || 14) + 6); ctx.stroke();
    const tx = Math.min(r.x + r.w - 44, W - 56), ty = Math.max(r.y - 17, 3);
    ctx.fillStyle = '#16a34a'; rr(tx, ty, 50, 22, 11); ctx.fill();
    ctx.restore();
    txt('NEW', tx + 25, ty + 12, { size: 13, weight: 800, color: '#fff', align: 'center', base: 'middle' });
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = 'rgba(30,60,40,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, o.r || 16); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(x, y, w, h, o.r || 16); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
  }
  const inR = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const inC = (p, c, pad) => Math.hypot(p.x - c.x, p.y - c.y) <= c.r + (pad || 0);
  const PFX = new SciSim.Particles();
  function burst(x, y, colors, n, o) { PFX.burst(x, y, Object.assign({ count: n || 18, colors: colors || ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], speed: 150, gravity: 120, size: 4 }, o || {})); }
  const rgba = SciSim.color.rgba;

  /* 부드러운 곡선 (Catmull-Rom → 베지어). c는 ctx 또는 Path2D */
  function smooth(c, pts, closed) {
    const n = pts.length;
    c.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % n];
      const p0 = closed || i > 0 ? pts[(i - 1 + n) % n] : p1;
      const p3 = closed || i < n - 2 ? pts[(i + 2) % n] : p2;
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) c.closePath();
  }
  function lgrad(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function rgrad(c, x0, y0, r0, x1, y1, r1, stops) { const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }

  function gauss(R) { let u = 0; while (u === 0) u = R(); const v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  /* =========================================================
     장면 ① 생물다양성의 세 가지
     ========================================================= */
  const DIV_TYPES = {
    gen: { name: '유전적 다양성', color: '#8b5cf6', soft: '#ece5fd', def: '같은 종 안에서도 형질(생김새, 색 등)이 다양한 것' },
    spe: { name: '종 다양성', color: '#2f7fe8', soft: '#dfeafd', def: '한 지역에 사는 생물의 종류(종)가 다양한 것' },
    eco: { name: '생태계 다양성', color: '#12a06a', soft: '#dcf6ea', def: '숲, 갯벌, 사막처럼 서로 다른 생태계가 있는 것' },
  };
  const DIV_SCENES = [
    { key: 'A', type: 'gen', title: '장면 1', cap: '바지락 8마리예요. 모두 같은 종인데 껍데기의 무늬와 색이 서로 달라요.' },
    { key: 'B', type: 'eco', title: '장면 2', cap: '숲, 갯벌, 사막이에요. 사는 환경이 서로 다른 여러 생태계가 있어요.' },
    { key: 'C', type: 'spe', title: '장면 3', cap: '한 풀밭에 나비, 무당벌레, 잠자리, 꿀벌, 메뚜기, 풍뎅이가 살아요. 여러 종의 곤충이에요.' },
  ];
  const TAG_ORDER = ['spe', 'gen', 'eco'];          // 이름표를 놓아 둔 처음 순서

  /* =========================================================
     장면 ② 무당벌레 변이 (점 개수 0~7)
     ========================================================= */
  const LB_SPOTS = [1, 2, 4, 6, 7, 5, 3, 2];        // 점 개수 0~7인 무당벌레 수 (모두 30마리)
  const LB_STYLE = [
    { base: '#e53935', dark: '#a81d1a', spot: '#1b1b1f' }, { base: '#f57c00', dark: '#b45500', spot: '#1b1b1f' },
    { base: '#f9c21a', dark: '#b88a00', spot: '#1b1b1f' }, { base: '#2d2d33', dark: '#111115', spot: '#ef4444' },
  ];
  const LB_SPOT_POS = [[-0.42, -0.34], [0.42, -0.34], [-0.46, 0.14], [0.46, 0.14], [-0.22, 0.52], [0.22, 0.52], [0, -0.62]];
  const LADYBUGS = (function () {
    const R = rng(4107), list = [];
    LB_SPOTS.forEach((n, spots) => { for (let i = 0; i < n; i++) list.push({ spots, style: Math.floor(R() * 4), ph: R() * TAU, ang: (R() - 0.5) * 1.0, sz: 0.92 + R() * 0.16, jx: R() - 0.5, jy: R() - 0.5 }); });
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = list[i]; list[i] = list[j]; list[j] = t; }
    list.forEach((b, i) => { b.id = i; b.rec = false; b.fly = null; b.x = 0; b.y = 0; });
    return list;
  })();

  /* =========================================================
     장면 ③ 두 섬의 새 무리 (부리 두께의 변화)
     ========================================================= */
  const NB = 24;                                     // 섬마다 새 24마리
  const BINS = 8;
  const MUT = 0.065;
  const SEL_SEED = { init: 57, a: 58 * 3 + 1, b: 58 * 3 + 2 };
  function fitness(env, t) { const m = env === 'big' ? t : 1 - t; return 0.08 + 0.86 * Math.pow(m, 1.4); }
  function initBeaks() { const R = rng(SEL_SEED.init), a = []; for (let i = 0; i < NB; i++) a.push(clamp(0.5 + gauss(R) * 0.17, 0.08, 0.92)); return a; }
  // 한 세대: 먹이에 알맞은 부리일수록 살아남을 가능성이 커요 → 살아남은 새의 자손(부모와 비슷한 부리 ± 작은 차이)
  function nextGen(pop, env, R) {
    const alive = pop.map((t) => R() < fitness(env, t));
    let idx = [];
    alive.forEach((a, i) => { if (a) idx.push(i); });
    if (idx.length < 4) {
      const order = pop.map((t, i) => i).sort((p, q) => fitness(env, pop[q]) - fitness(env, pop[p]));
      idx = order.slice(0, 4); alive.fill(false); idx.forEach((i) => { alive[i] = true; });
    }
    const kids = [];
    for (let i = 0; i < NB; i++) { const p = idx[Math.floor(R() * idx.length)]; kids.push({ t: clamp(pop[p] + gauss(R) * MUT, 0.05, 0.95), parent: p }); }
    return { alive, kids };
  }
  const meanOf = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const binOf = (t) => clamp(Math.floor(t * BINS), 0, BINS - 1);
  const ISL_INFO = {
    A: { name: 'A섬', env: 'big', color: '#e8890c' },
    B: { name: 'B섬', env: 'small', color: '#0e9aa0' },
  };

  /* =========================================================
     장면 ④ 다양성이 생기는 과정
     ========================================================= */
  const STORY = [
    { text: '같은 종 안에도 변이가 있어요', icon: 'var' },
    { text: '환경에 알맞은 변이를 가진 개체가 더 많이 살아남아요', icon: 'surv' },
    { text: '살아남은 개체가 자손을 남겨요', icon: 'kids' },
    { text: '이런 일이 오랜 시간 반복돼요', icon: 'time' },
    { text: '환경에 적응한 서로 다른 생물이 생겨 생물다양성이 커져요', icon: 'div' },
  ];

  /* =========================================================
     그림 모음
     ========================================================= */
  // ----- 바지락 -----
  const SHELL_PATH = (function () {
    const p = new Path2D();
    p.moveTo(-0.38, -0.62);
    p.bezierCurveTo(0.2, -0.88, 0.96, -0.48, 0.99, 0.14);
    p.bezierCurveTo(1.02, 0.62, 0.36, 0.86, -0.3, 0.8);
    p.bezierCurveTo(-0.86, 0.72, -1.02, 0.2, -0.82, -0.26);
    p.bezierCurveTo(-0.72, -0.5, -0.56, -0.58, -0.38, -0.62);
    p.closePath();
    return p;
  })();
  const SHELLS = [
    { base: ['#f6ead0', '#d8c08e'], pat: 'rings', c1: '#a58a55' },
    { base: ['#dcb98f', '#a8794c'], pat: 'radial', c1: '#5e3a1f' },
    { base: ['#9aa3ad', '#5c6772'], pat: 'spots', c1: '#f4f6f8' },
    { base: ['#f5cfa4', '#dc9150'], pat: 'zigzag', c1: '#8a4817' },
    { base: ['#4a443f', '#201c1a'], pat: 'bands', c1: '#efe2c8' },
    { base: ['#f6cdd5', '#da8da2'], pat: 'radial', c1: '#a24b66' },
    { base: ['#bcc58a', '#80904e'], pat: 'spots', c1: '#3b4719' },
    { base: ['#f2e6d2', '#cdb695'], pat: 'tri', c1: '#6a4529' },
  ];
  const SHELL_DOTS = (function () { const R = rng(88), a = []; for (let i = 0; i < 18; i++) a.push([-0.7 + R() * 1.6, -0.5 + R() * 1.2, 0.04 + R() * 0.06]); return a; })();
  function drawShell(c, x, y, s, v, rot, t) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.save(); c.translate(0.07, 0.12); c.fillStyle = 'rgba(70,52,28,.24)'; c.fill(SHELL_PATH); c.restore();
    c.fillStyle = rgrad(c, -0.45, -0.5, 0.05, 0.1, 0.1, 1.25, [[0, v.base[0]], [1, v.base[1]]]); c.fill(SHELL_PATH);
    c.save(); c.clip(SHELL_PATH);
    const U = [-0.4, -0.56];
    c.lineJoin = 'round';
    if (v.pat === 'bands') {
      for (let k = 2; k <= 8; k += 2) { c.save(); c.translate(U[0], U[1]); c.scale(k * 0.16, k * 0.16); c.translate(-U[0], -U[1]); c.strokeStyle = rgba(v.c1, 0.8); c.lineWidth = 0.1 / (k * 0.16); c.stroke(SHELL_PATH); c.restore(); }
    }
    c.strokeStyle = 'rgba(70,50,28,.2)';
    for (let k = 1; k <= 9; k++) { c.save(); c.translate(U[0], U[1]); const sc = k * 0.14; c.scale(sc, sc); c.translate(-U[0], -U[1]); c.lineWidth = 0.022 / sc; c.stroke(SHELL_PATH); c.restore(); }
    if (v.pat === 'radial') {
      c.strokeStyle = rgba(v.c1, 0.55); c.lineWidth = 0.04; c.lineCap = 'round';
      for (let a = -0.05; a < 1.75; a += 0.13) { c.beginPath(); c.moveTo(U[0], U[1]); c.lineTo(U[0] + Math.cos(a) * 2, U[1] + Math.sin(a) * 2); c.stroke(); }
    } else if (v.pat === 'spots') {
      c.fillStyle = rgba(v.c1, 0.85); SHELL_DOTS.forEach((d) => { c.beginPath(); c.arc(d[0], d[1], d[2], 0, TAU); c.fill(); });
    } else if (v.pat === 'zigzag') {
      c.strokeStyle = rgba(v.c1, 0.65); c.lineWidth = 0.05;
      for (let yy = -0.3; yy < 0.9; yy += 0.3) { c.beginPath(); for (let xx = -1; xx <= 1.1; xx += 0.14) { const y2 = yy + ((Math.round((xx + 1) / 0.14)) % 2 ? 0.09 : -0.09); if (xx === -1) c.moveTo(xx, y2); else c.lineTo(xx, y2); } c.stroke(); }
    } else if (v.pat === 'tri') {
      c.fillStyle = rgba(v.c1, 0.6);
      for (let a = 0; a < 1.7; a += 0.19) for (let d = 0.5; d < 1.6; d += 0.5) {
        const px = U[0] + Math.cos(a) * d, py = U[1] + Math.sin(a) * d;
        c.beginPath(); c.moveTo(px, py - 0.07); c.lineTo(px + 0.06, py + 0.05); c.lineTo(px - 0.06, py + 0.05); c.closePath(); c.fill();
      }
    }
    const g = 0.22 + 0.08 * Math.sin(t * 1.6 + x);
    c.fillStyle = 'rgba(255,255,255,' + g.toFixed(2) + ')'; c.beginPath(); c.ellipse(-0.12, -0.28, 0.5, 0.17, -0.5, 0, TAU); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(70,50,25,.6)'; c.lineWidth = 0.04; c.lineJoin = 'round'; c.stroke(SHELL_PATH);
    c.fillStyle = 'rgba(70,50,25,.5)'; c.beginPath(); c.arc(U[0], U[1], 0.05, 0, TAU); c.fill();
    c.restore();
  }
  function artShells(c, w, h, t) {
    c.fillStyle = lgrad(c, 0, 0, 0, h, [[0, '#f1e5c6'], [1, '#d9c597']]); c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(190,165,115,.45)'; c.lineWidth = 2;
    for (let k = 0; k < 7; k++) { c.beginPath(); for (let x = 0; x <= w; x += 8) { const y = h * (0.1 + k * 0.14) + Math.sin(x * 0.045 + k * 1.3 + t * 0.5) * 3; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
    const R = rng(33);
    c.fillStyle = 'rgba(150,125,85,.35)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(R() * w, R() * h, 1 + R() * 1.8, 0, TAU); c.fill(); }
    const rows = 2, cols = 4, s = Math.min(w / 9.2, h / 8.4);
    for (let i = 0; i < 8; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = w * (0.135 + 0.243 * col) + Math.sin(i * 2.3) * 3, y = h * (0.3 + 0.4 * row) + Math.cos(i * 1.7) * 4;
      drawShell(c, x, y + (RM ? 0 : Math.sin(t * 1.2 + i) * 1.2), s, SHELLS[i], (i * 0.9 % 1.4) - 0.7, t);
    }
    // 올라가는 거품
    if (!RM) for (let k = 0; k < 4; k++) { const u = ((t * 0.22 + k * 0.27) % 1); c.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - u)).toFixed(2) + ')'; c.lineWidth = 1.6; c.beginPath(); c.arc(w * (0.2 + k * 0.2) + Math.sin(u * 8 + k) * 4, h * 0.75 - u * h * 0.5, 3 + k * 0.6, 0, TAU); c.stroke(); }
  }

  // ----- 숲 · 갯벌 · 사막 -----
  function artEco(c, w, h, t) {
    const sw = w / 3, tt = RM ? 0 : t;
    // 숲
    c.save(); c.beginPath(); c.rect(0, 0, sw, h); c.clip();
    c.fillStyle = lgrad(c, 0, 0, 0, h, [[0, '#d8f2cf'], [0.6, '#a9dd9e'], [1, '#5fa857']]); c.fillRect(0, 0, sw, h);
    c.fillStyle = 'rgba(255,255,220,.22)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(sw * (0.1 + k * 0.3), 0); c.lineTo(sw * (0.3 + k * 0.3), 0); c.lineTo(sw * (0.05 + k * 0.3), h * 0.8); c.lineTo(sw * (-0.1 + k * 0.3), h * 0.8); c.closePath(); c.fill(); }
    c.fillStyle = lgrad(c, 0, h * 0.72, 0, h, [[0, '#4f9b48'], [1, '#34773a']]); c.fillRect(0, h * 0.74, sw, h);
    [[0.22, 0.74, 0.19, 1.0], [0.62, 0.7, 0.23, 1.15], [0.86, 0.78, 0.15, 0.85]].forEach((tr, i) => {
      const x = sw * tr[0], y = h * tr[1], r = sw * tr[2], sway = Math.sin(tt * 0.9 + i) * 1.6;
      c.fillStyle = '#7a5230'; c.fillRect(x - 3.2 * tr[3], y - h * 0.18, 6.4 * tr[3], h * 0.28);
      [[0, -h * 0.3, 1], [-0.7, -h * 0.22, 0.7], [0.7, -h * 0.22, 0.72]].forEach((b) => {
        const bx = x + b[0] * r + sway, by = y + b[1], br = r * b[2];
        c.fillStyle = rgrad(c, bx - br * 0.3, by - br * 0.4, br * 0.1, bx, by, br, [[0, '#8ad47a'], [1, '#2f8a3e']]); c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
      });
    });
    c.restore();
    // 갯벌
    c.save(); c.translate(sw, 0); c.beginPath(); c.rect(0, 0, sw, h); c.clip();
    c.fillStyle = lgrad(c, 0, 0, 0, h * 0.42, [[0, '#cfe8f7'], [1, '#e9f4fa']]); c.fillRect(0, 0, sw, h * 0.42);
    c.fillStyle = lgrad(c, 0, h * 0.34, 0, h * 0.5, [[0, '#8fc0dd'], [1, '#6aa6c8']]); c.fillRect(0, h * 0.34, sw, h * 0.16);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.6; for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 0; x <= sw; x += 6) { const y = h * (0.38 + k * 0.035) + Math.sin(x * 0.12 + tt * 1.6 + k) * 1.6; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
    c.fillStyle = lgrad(c, 0, h * 0.48, 0, h, [[0, '#b2a28f'], [1, '#7f705f']]); c.fillRect(0, h * 0.48, sw, h);
    c.strokeStyle = 'rgba(90,75,60,.28)'; c.lineWidth = 1.5; for (let k = 0; k < 7; k++) { c.beginPath(); for (let x = 0; x <= sw; x += 6) { const y = h * (0.56 + k * 0.065) + Math.sin(x * 0.2 + k * 1.7) * 2.4; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
    [[0.3, 0.68, 0.16], [0.7, 0.8, 0.13]].forEach((p) => { c.fillStyle = 'rgba(170,205,225,.85)'; c.beginPath(); c.ellipse(sw * p[0], h * p[1], sw * p[2], sw * p[2] * 0.34, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(sw * p[0] - 5, h * p[1] - 1.5, sw * p[2] * 0.4, 2, 0, 0, TAU); c.fill(); });
    const cx = sw * (0.28 + 0.4 * (0.5 + 0.5 * Math.sin(tt * 0.4))), cy = h * 0.88;       // 게
    c.fillStyle = '#e0573f'; c.beginPath(); c.ellipse(cx, cy, 8, 5.5, 0, 0, TAU); c.fill();
    c.strokeStyle = '#c4452f'; c.lineWidth = 1.6; for (let k = -1; k <= 1; k += 2) for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(cx + k * 6, cy + j * 2 - 2); c.lineTo(cx + k * (11 + j), cy + j * 3 + Math.sin(tt * 6 + j) * 1.4); c.stroke(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - 3, cy - 5, 1.5, 0, TAU); c.arc(cx + 3, cy - 5, 1.5, 0, TAU); c.fill();
    const bx = sw * 0.6, by = h * 0.55 + Math.sin(tt * 1.3) * 1;                          // 백로
    c.strokeStyle = '#4a4a4a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(bx, by + 12); c.lineTo(bx, by + 28); c.moveTo(bx + 5, by + 12); c.lineTo(bx + 5, by + 28); c.stroke();
    c.fillStyle = '#fafafa'; c.beginPath(); c.ellipse(bx + 2, by + 4, 9, 7, -0.2, 0, TAU); c.fill();
    c.strokeStyle = '#fafafa'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx + 8, by + 1); c.quadraticCurveTo(bx + 14, by - 8, bx + 10, by - 14); c.stroke();
    c.fillStyle = '#f3a21b'; c.beginPath(); c.moveTo(bx + 10, by - 15); c.lineTo(bx + 20, by - 13); c.lineTo(bx + 10, by - 11); c.closePath(); c.fill();
    c.restore();
    // 사막
    c.save(); c.translate(sw * 2, 0); c.beginPath(); c.rect(0, 0, sw, h); c.clip();
    c.fillStyle = lgrad(c, 0, 0, 0, h, [[0, '#ffe3a6'], [0.55, '#ffd08a'], [1, '#f0b266']]); c.fillRect(0, 0, sw, h);
    c.fillStyle = rgrad(c, sw * 0.7, h * 0.18, 4, sw * 0.7, h * 0.18, 34, [[0, 'rgba(255,255,230,.95)'], [1, 'rgba(255,240,170,0)']]); c.beginPath(); c.arc(sw * 0.7, h * 0.18, 34, 0, TAU); c.fill();
    c.fillStyle = '#fff4c4'; c.beginPath(); c.arc(sw * 0.7, h * 0.18, 11, 0, TAU); c.fill();
    c.fillStyle = '#e6a65a'; c.beginPath(); c.moveTo(0, h * 0.6); c.quadraticCurveTo(sw * 0.35, h * 0.45, sw * 0.7, h * 0.58); c.quadraticCurveTo(sw * 0.9, h * 0.62, sw, h * 0.55); c.lineTo(sw, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.fillStyle = '#f3be78'; c.beginPath(); c.moveTo(0, h * 0.74); c.quadraticCurveTo(sw * 0.4, h * 0.58, sw, h * 0.76); c.lineTo(sw, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(180,120,60,.25)'; c.lineWidth = 1.4; c.beginPath(); for (let x = 0; x <= sw; x += 6) { const y = h * 0.86 + Math.sin(x * 0.14 + tt * 0.8) * 2; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    const px = sw * 0.38, py = h * 0.8;                                                    // 선인장
    c.fillStyle = lgrad(c, px - 9, 0, px + 9, 0, [[0, '#4f9d55'], [0.5, '#7bc47f'], [1, '#3f8446']]);
    rr2(c, px - 8, py - 62, 16, 62, 8); c.fill(); rr2(c, px - 24, py - 44, 10, 26, 5); c.fill(); rr2(c, px - 24, py - 24, 24, 10, 5); c.fill(); rr2(c, px + 14, py - 52, 10, 28, 5); c.fill(); rr2(c, px + 0, py - 30, 24, 10, 5); c.fill();
    c.restore();
    // 이름표
    ['숲', '갯벌', '사막'].forEach((n, i) => { pill(n, sw * (i + 0.5), h - 20, { size: 14, bg: 'rgba(255,255,255,.88)', color: '#334155', pad: 10, h: 26 }); });
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(sw, 0); c.lineTo(sw, h); c.moveTo(sw * 2, 0); c.lineTo(sw * 2, h); c.stroke();
  }
  function rr2(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // ----- 무당벌레 (위에서 본 모양) -----
  function drawLadybug(c, x, y, s, lb, t, o) {
    o = o || {};
    const st = LB_STYLE[lb.style], rot = (o.rot != null ? o.rot : lb.ang), tt = RM ? 0 : t;
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    c.fillStyle = 'rgba(30,50,30,.2)'; c.beginPath(); c.ellipse(0.1, 0.18, 0.95, 1.12, 0, 0, TAU); c.fill();
    c.strokeStyle = '#2b2b30'; c.lineWidth = 0.1; c.lineCap = 'round';
    for (let k = 0; k < 3; k++) for (let sd = -1; sd <= 1; sd += 2) { const w = Math.sin(tt * 7 + k + lb.ph) * (o.walk ? 0.12 : 0.03); c.beginPath(); c.moveTo(sd * 0.7, -0.4 + k * 0.5); c.lineTo(sd * (1.1 + w), -0.55 + k * 0.5 + w); c.stroke(); }
    c.lineWidth = 0.06;
    for (let sd = -1; sd <= 1; sd += 2) { c.beginPath(); c.moveTo(sd * 0.14, -1.18); c.quadraticCurveTo(sd * 0.4, -1.5 + Math.sin(tt * 3 + lb.ph) * 0.05, sd * 0.5, -1.62); c.stroke(); }
    c.fillStyle = '#26262b'; c.beginPath(); c.ellipse(0, -0.95, 0.42, 0.34, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-0.17, -1.03, 0.1, 0.07, 0, 0, TAU); c.ellipse(0.17, -1.03, 0.1, 0.07, 0, 0, TAU); c.fill();
    c.fillStyle = lgrad(c, -0.8, -0.6, 0.8, 0.8, [[0, st.base], [1, st.dark]]);
    c.beginPath(); c.ellipse(0, 0.12, 0.88, 1.06, 0, 0, TAU); c.fill();
    c.strokeStyle = rgba('#000000', 0.45); c.lineWidth = 0.05; c.stroke();
    c.beginPath(); c.moveTo(0, -0.88); c.lineTo(0, 1.12); c.stroke();
    c.fillStyle = st.spot;
    for (let k = 0; k < lb.spots; k++) { const p = LB_SPOT_POS[k]; c.beginPath(); c.arc(p[0] * 0.95, p[1] * 1.05 + 0.1, 0.17, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-0.36, -0.36, 0.2, 0.34, -0.4, 0, TAU); c.fill();
    c.restore();
  }

  // ----- 여러 종의 곤충 -----
  function bugButterfly(c, t) {
    const f = RM ? 1 : 0.3 + 0.7 * Math.abs(Math.cos(t * 4.5));
    [-1, 1].forEach((s) => {
      c.save(); c.scale(s * f, 1);
      c.fillStyle = lgrad(c, 0, -14, 16, 4, [[0, '#ffb04a'], [1, '#e8590c']]); c.beginPath(); c.moveTo(1, -2); c.bezierCurveTo(8, -20, 22, -16, 20, -4); c.bezierCurveTo(19, 2, 8, 2, 1, 0); c.closePath(); c.fill();
      c.strokeStyle = '#2b1d12'; c.lineWidth = 1.6; c.stroke();
      c.fillStyle = lgrad(c, 0, 0, 12, 14, [[0, '#ffc86b'], [1, '#e9770f']]); c.beginPath(); c.moveTo(1, 0); c.bezierCurveTo(14, 2, 15, 13, 8, 15); c.bezierCurveTo(2, 14, 1, 8, 1, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(13, -9, 2.2, 0, TAU); c.arc(9, 8, 1.8, 0, TAU); c.fill();
      c.restore();
    });
    c.fillStyle = '#2b1d12'; c.beginPath(); c.ellipse(0, 2, 1.8, 9, 0, 0, TAU); c.fill();
    c.strokeStyle = '#2b1d12'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(-4, -13, -7, -13); c.moveTo(0, -6); c.quadraticCurveTo(4, -13, 7, -13); c.stroke();
  }
  function bugDragonfly(c, t) {
    const fl = RM ? 0 : Math.sin(t * 28) * 0.08;
    c.fillStyle = 'rgba(190,225,245,.65)'; c.strokeStyle = 'rgba(90,140,170,.7)'; c.lineWidth = 0.8;
    [[-1, -4], [1, -4], [-1, 1], [1, 1]].forEach((w) => { c.save(); c.translate(0, w[1]); c.rotate(w[0] * (0.1 + fl)); c.beginPath(); c.ellipse(w[0] * 13, 0, 13, 3.4, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); });
    c.strokeStyle = '#2a8f8a'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, 22); c.stroke();
    c.strokeStyle = '#1d5f5c'; c.lineWidth = 1; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-2, 3 + k * 3.2); c.lineTo(2, 3 + k * 3.2); c.stroke(); }
    c.fillStyle = '#34a79f'; c.beginPath(); c.ellipse(0, -2, 3.4, 8, 0, 0, TAU); c.fill();
    c.fillStyle = '#1f6f6a'; c.beginPath(); c.arc(0, -10, 4.6, 0, TAU); c.fill();
    c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(-3, -11, 2.2, 0, TAU); c.arc(3, -11, 2.2, 0, TAU); c.fill();
  }
  function bugBee(c, t) {
    const fl = RM ? 0 : Math.sin(t * 40) * 0.12;
    c.fillStyle = 'rgba(210,235,250,.75)'; c.strokeStyle = 'rgba(100,150,180,.6)'; c.lineWidth = 0.8;
    [-1, 1].forEach((s) => { c.save(); c.rotate(s * (0.6 + fl)); c.beginPath(); c.ellipse(s * 2, -11, 5, 9, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); });
    c.fillStyle = lgrad(c, 0, -10, 0, 12, [[0, '#ffd23f'], [1, '#e6a100']]); c.beginPath(); c.ellipse(0, 2, 8, 11, 0, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.ellipse(0, 2, 8, 11, 0, 0, TAU); c.clip(); c.fillStyle = '#2b2118'; c.fillRect(-9, -1, 18, 3.6); c.fillRect(-9, 6, 18, 3.6); c.restore();
    c.fillStyle = '#2b2118'; c.beginPath(); c.arc(0, -11, 5.2, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-1.5, 12); c.lineTo(0, 17); c.lineTo(1.5, 12); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-2, -12, 1.2, 0, TAU); c.arc(2, -12, 1.2, 0, TAU); c.fill();
  }
  function bugGrasshopper(c, t) {
    const hop = RM ? 0 : Math.max(0, Math.sin(t * 1.4)) * 5;
    c.save(); c.translate(0, -hop);
    c.strokeStyle = '#4a7a2a'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-3, 4); c.lineTo(-13, -4); c.lineTo(-20, 10); c.moveTo(2, 4); c.lineTo(-6, -2); c.lineTo(-10, 12); c.stroke();
    c.lineWidth = 1.6; c.beginPath(); c.moveTo(6, 6); c.lineTo(10, 14); c.moveTo(11, 4); c.lineTo(16, 12); c.stroke();
    c.fillStyle = lgrad(c, 0, -8, 0, 10, [[0, '#a8dc5a'], [1, '#5f9f2e']]); c.beginPath(); c.ellipse(-2, 0, 15, 6.6, -0.05, 0, TAU); c.fill();
    c.fillStyle = '#7bbd3d'; c.beginPath(); c.moveTo(-16, -2); c.lineTo(8, -6); c.lineTo(-6, 4); c.closePath(); c.fill();
    c.fillStyle = '#94d04a'; c.beginPath(); c.ellipse(15, -2, 6.6, 5.6, 0.1, 0, TAU); c.fill();
    c.fillStyle = '#1b2a0f'; c.beginPath(); c.arc(17, -4, 1.7, 0, TAU); c.fill();
    c.strokeStyle = '#4a7a2a'; c.lineWidth = 1; c.beginPath(); c.moveTo(18, -6); c.quadraticCurveTo(25, -12, 30, -10); c.stroke();
    c.restore();
  }
  function bugBeetle(c, t) {
    const aw = RM ? 0 : Math.sin(t * 2.2) * 1.4;
    c.strokeStyle = '#2a1a10'; c.lineWidth = 1.8; c.lineCap = 'round';
    for (let k = 0; k < 3; k++) for (let sd = -1; sd <= 1; sd += 2) { c.beginPath(); c.moveTo(sd * 8, -5 + k * 6); c.lineTo(sd * (15 + (k === 1 ? 2 : 0)), -9 + k * 8 + aw * 0.3 * sd); c.stroke(); }
    c.fillStyle = lgrad(c, -10, -12, 12, 14, [[0, '#8c5a2f'], [0.5, '#4d2f18'], [1, '#2a180c']]); c.beginPath(); c.ellipse(0, 3, 10.5, 14, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 17); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-4, -3, 2.6, 7, -0.2, 0, TAU); c.fill();
    c.fillStyle = '#2a180c'; c.beginPath(); c.ellipse(0, -12, 6.6, 5, 0, 0, TAU); c.fill();
    c.strokeStyle = '#2a180c'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -15); c.quadraticCurveTo(0, -23, 4, -24); c.stroke();
    c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3, -14); c.lineTo(-7, -20 + aw); c.moveTo(3, -14); c.lineTo(7, -20 - aw); c.stroke();
  }
  function artInsects(c, w, h, t) {
    c.fillStyle = lgrad(c, 0, 0, 0, h, [[0, '#d9f0fb'], [0.55, '#c8eab4'], [1, '#8fcb76']]); c.fillRect(0, 0, w, h);
    const R = rng(51);
    for (let i = 0; i < 16; i++) { const x = R() * w, y = h * (0.66 + R() * 0.3); c.strokeStyle = 'rgba(60,130,60,.5)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y + 10); c.lineTo(x + (R() - 0.5) * 6, y - 6); c.stroke(); if (i % 3 === 0) { c.fillStyle = ['#f9a8d4', '#fde68a', '#ffffff', '#fdba74'][(i / 3 | 0) % 4]; c.beginPath(); c.arc(x, y - 8, 3.4, 0, TAU); c.fill(); } }
    const names = ['나비', '무당벌레', '잠자리', '꿀벌', '메뚜기', '풍뎅이'];
    const cols = 3, cw = w / cols, rh = h / 2;
    const fns = [bugButterfly, null, bugDragonfly, bugBee, bugGrasshopper, bugBeetle];
    fns.forEach((fn, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = cw * (col + 0.5), y = rh * (row + 0.46) + (i === 0 || i === 3 || i === 2 ? (RM ? 0 : Math.sin(t * 1.6 + i) * 3) : 0);
      c.save(); c.translate(x, y); c.scale(1.45, 1.45);
      if (fn) fn(c, t); else drawLadybug(c, 0, 0, 10, { spots: 6, style: 0, ph: 1, ang: 0 }, t, { walk: true });
      c.restore();
      txt(names[i], x, rh * (row + 1) - 8, { size: 13.5, weight: 800, color: '#2f4a2a', align: 'center', halo: 'rgba(255,255,255,.75)', haloW: 4 });
    });
  }

  // ----- 새 (부리 두께 t: 0 얇음 ~ 1 두꺼움) -----
  // 새를 (0,0) 발 위치 기준으로 그려요. 오른쪽을 보는 모양이고, face = -1이면 뒤집어요.
  function drawBird(c, x, y, s, t, o) {
    o = o || {};
    const face = o.face || 1, peck = o.peck || 0, tilt = o.tilt || 0, puff = o.puff || 1, alpha = o.alpha != null ? o.alpha : 1;
    if (alpha <= 0.01) return;
    c.save(); c.translate(x, y); c.scale(s * face * puff, s * puff); c.globalAlpha *= alpha;
    c.fillStyle = 'rgba(40,50,30,.2)'; c.beginPath(); c.ellipse(0, 1, 12, 3, 0, 0, TAU); c.fill();
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-3, -6); c.lineTo(-3, 0); c.moveTo(3, -6); c.lineTo(3, 0); c.stroke();
    c.save(); c.translate(0, -6); c.rotate(tilt + peck * 0.5);
    // 꼬리
    c.fillStyle = '#7a5a3a'; c.beginPath(); c.moveTo(-9, -3); c.lineTo(-20, -9); c.lineTo(-18, 0); c.lineTo(-10, 3); c.closePath(); c.fill();
    // 몸
    c.fillStyle = lgrad(c, 0, -10, 0, 9, [[0, '#b88a5a'], [0.55, '#c9a173'], [1, '#f2dfc2']]);
    c.beginPath(); c.ellipse(0, -2, 13, 9.4, 0.05, 0, TAU); c.fill();
    c.fillStyle = '#8a6540'; c.beginPath(); c.ellipse(-3, -3, 8.5, 5, -0.3, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, -3); c.quadraticCurveTo(-3, -6, 3, -2); c.stroke();
    // 머리
    c.translate(peck * 3, peck * 3);
    c.fillStyle = lgrad(c, 0, -14, 0, 0, [[0, '#a87b4c'], [1, '#c9a173']]); c.beginPath(); c.arc(10, -8.5, 6.8, 0, TAU); c.fill();
    c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(12.2, -10, 1.5, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(12.6, -10.5, 0.55, 0, TAU); c.fill();
    // 부리: 두꺼울수록 깊고 짧아요
    const d = 2.2 + 8.6 * t, L = 11.8 - 3.8 * t, bx = 15.4, by = -7.4;
    c.fillStyle = lgrad(c, 0, by - d / 2, 0, by + d / 2, [[0, '#ffc54a'], [1, '#e78a1c']]);
    c.beginPath(); c.moveTo(bx - 1.2, by - d / 2); c.quadraticCurveTo(bx + L * 0.55, by - d / 2, bx + L, by + d * 0.1); c.quadraticCurveTo(bx + L * 0.5, by + d * 0.58, bx - 1.2, by + d / 2); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(120,60,0,.55)'; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.moveTo(bx, by + d * 0.05); c.lineTo(bx + L * 0.62, by + d * 0.1); c.stroke();
    c.restore();
    c.restore();
  }
  function drawNut(c, x, y, r, a) {      // 크고 단단한 씨앗
    if (a <= 0.01) return;
    c.save(); c.globalAlpha *= a; c.translate(x, y);
    c.fillStyle = 'rgba(40,30,15,.25)'; c.beginPath(); c.ellipse(1, r * 0.8, r, r * 0.34, 0, 0, TAU); c.fill();
    c.fillStyle = rgrad(c, -r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1, [[0, '#b98b5a'], [0.6, '#7b5230'], [1, '#4a2f18']]); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(40,24,10,.6)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r * 0.98, 0, TAU); c.moveTo(-r * 0.7, 0); c.quadraticCurveTo(0, -r * 0.5, r * 0.7, 0); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.42, r * 0.28, r * 0.15, -0.6, 0, TAU); c.fill();
    c.restore();
  }
  function drawSeeds(c, x, y, a, t) {    // 작은 씨앗과 작은 곤충
    if (a <= 0.01) return;
    c.save(); c.globalAlpha *= a; c.translate(x, y);
    [[-5, 1.5], [0, 3], [5, 0.5], [2, -2.5]].forEach((p, i) => { c.fillStyle = i % 2 ? '#c9a24a' : '#8f6a30'; c.beginPath(); c.ellipse(p[0], p[1], 2.3, 1.7, i, 0, TAU); c.fill(); });
    const w = RM ? 0 : Math.sin(t * 8 + x) * 0.8;
    c.fillStyle = '#3f7d34'; c.beginPath(); c.ellipse(-1, -5, 2.5, 1.7, 0, 0, TAU); c.fill();
    c.strokeStyle = '#2d5a25'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-3, -5); c.lineTo(-4.5, -3.5 + w); c.moveTo(1, -5); c.lineTo(2.5, -3.5 - w); c.stroke();
    c.restore();
  }

  // ----- 섬 (바탕) -----
  function artIsland(c, w, h, env, envT, t) {       // env: 'big' | 'small', envT: 0(큰 씨앗) ~ 1(작은 씨앗) 바뀌는 정도
    const tt = RM ? 0 : t;
    const dry = env === 'big' ? 1 - envT : 0;
    // 하늘
    c.fillStyle = lgrad(c, 0, 0, 0, h * 0.6, [[0, lerpColor('#cfe9fb', '#ffe9b8', dry * 0.7)], [1, lerpColor('#eaf6fd', '#fff3d6', dry * 0.7)]]); c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.85)';
    [[0.2, 0.15, 30], [0.72, 0.1, 24]].forEach((cl, i) => { const x = ((cl[0] * w + tt * (6 + i * 3)) % (w + 120)) - 60; c.beginPath(); c.ellipse(x, h * cl[1], cl[2], cl[2] * 0.36, 0, 0, TAU); c.ellipse(x + cl[2] * 0.55, h * cl[1] - 5, cl[2] * 0.6, cl[2] * 0.32, 0, 0, TAU); c.fill(); });
    // 바다
    c.fillStyle = lgrad(c, 0, h * 0.5, 0, h, [[0, '#6bb8dc'], [1, '#3f8fbc']]); c.fillRect(0, h * 0.5, w, h * 0.5);
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 0; x <= w; x += 8) { const y = h * (0.54 + k * 0.05) + Math.sin(x * 0.07 + tt * 1.4 + k * 2) * 1.8; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
    // 섬
    const top = env === 'big' ? ['#e2c488', '#bc9558'] : ['#9fd88f', '#62ad5a'];
    const mix = envT;
    const c0 = env === 'big' ? lerpColor(top[0], '#a9d98a', mix) : top[0], c1 = env === 'big' ? lerpColor(top[1], '#6fb55e', mix) : top[1];
    c.save(); c.shadowColor = 'rgba(30,60,80,.3)'; c.shadowBlur = 0;
    c.fillStyle = lgrad(c, 0, h * 0.5, 0, h, [[0, c0], [1, c1]]);
    c.beginPath(); c.moveTo(w * 0.02, h * 1.02); c.bezierCurveTo(w * 0.06, h * 0.62, w * 0.2, h * 0.5, w * 0.5, h * 0.5); c.bezierCurveTo(w * 0.8, h * 0.5, w * 0.94, h * 0.62, w * 0.98, h * 1.02); c.closePath(); c.fill(); c.restore();
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(w * 0.4, h * 0.56, w * 0.26, h * 0.04, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(w * 0.5, h * 1.0, w * 0.54, h * 0.035, 0, 0, TAU); c.fill();
    // 나무와 덤불
    const palm = (px, py, sc) => {
      c.save(); c.translate(px, py); c.scale(sc, sc);
      c.strokeStyle = '#7a5230'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -28, 2, -52); c.stroke();
      c.fillStyle = '#3f9b45'; for (let k = 0; k < 5; k++) { c.save(); c.translate(2, -52); c.rotate(-1.3 + k * 0.65 + Math.sin(tt * 1.2 + k) * 0.04); c.beginPath(); c.ellipse(16, 0, 18, 4.6, 0, 0, TAU); c.fill(); c.restore(); }
      const na = 1 - envT;
      if (na > 0.02) { c.globalAlpha = na; drawNut(c, -2, -48, 6.4 * (0.4 + 0.6 * na), 1); drawNut(c, 8, -46, 5.8 * (0.4 + 0.6 * na), 1); }
      c.restore();
    };
    const bush = (px, py, sc) => {
      c.save(); c.translate(px, py); c.scale(sc, sc);
      [[-10, 0, 11], [0, -5, 13], [10, 0, 11]].forEach((b) => { c.fillStyle = rgrad(c, b[0] - 3, b[1] - 4, 2, b[0], b[1], b[2], [[0, '#8fd47f'], [1, '#3f9b45']]); c.beginPath(); c.arc(b[0], b[1], b[2], 0, TAU); c.fill(); });
      c.fillStyle = '#fde68a'; [[-8, -4], [3, -10], [9, -2]].forEach((f) => { c.beginPath(); c.arc(f[0], f[1], 2.2, 0, TAU); c.fill(); });
      c.restore();
    };
    if (env === 'big') { palm(w * 0.1, h * 0.72, 0.9); palm(w * 0.9, h * 0.74, 0.8); if (envT > 0) { bush(w * 0.12, h * 0.78, 0.8 * envT); bush(w * 0.88, h * 0.8, 0.75 * envT); } }
    else { bush(w * 0.1, h * 0.7, 1.1); bush(w * 0.9, h * 0.72, 1.0); bush(w * 0.26, h * 0.58, 0.7); }
    if (env === 'small') for (let k = 0; k < 3; k++) { const bx = w * (0.25 + 0.25 * k) + Math.sin(tt * 0.9 + k * 2) * 18, by = h * (0.3 + 0.05 * Math.sin(tt * 1.2 + k)); c.fillStyle = ['#fb923c', '#f472b6', '#facc15'][k]; c.beginPath(); c.ellipse(bx, by, 4, 2.4 * Math.abs(Math.cos(tt * 9 + k)) + 0.6, 0, 0, TAU); c.fill(); }
  }
  function lerpColor(a, b, t) {
    const A = SciSim.color.hexToRgb(a), B = SciSim.color.hexToRgb(b);
    const f = (x, y) => Math.round(x + (y - x) * t);
    return 'rgb(' + f(A.r, B.r) + ',' + f(A.g, B.g) + ',' + f(A.b, B.b) + ')';
  }

  // ----- 이야기 그림 (다양성이 생기는 과정) -----
  function artStory(c, kind, t, s) {
    const tt = RM ? 0 : t;
    c.save(); c.scale(s, s);
    c.fillStyle = lgrad(c, 0, -50, 0, 50, [[0, '#eaf6e6'], [1, '#d3ebcb']]); c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.clip();
    if (kind === 'var') {
      [[-26, 8, 2, 0], [0, -6, 4, 1], [26, 8, 6, 2]].forEach((p, i) => drawLadybug(c, p[0], p[1], 10, { spots: p[2], style: p[3], ph: i, ang: (i - 1) * 0.35 }, t, {}));
    } else if (kind === 'surv') {
      drawNut(c, 20, 24, 8, 1);
      drawBird(c, -8, 26, 1.5, 0.9, { peck: RM ? 0 : Math.max(0, Math.sin(tt * 3)) * 0.8 });
      c.fillStyle = '#16a34a'; c.font = font(15, 800); c.textAlign = 'center'; c.fillText('✔', 22, 0);
    } else if (kind === 'kids') {
      c.fillStyle = '#fff8e6'; c.beginPath(); c.ellipse(-14, 10, 11, 14, 0, 0, TAU); c.fill(); c.strokeStyle = '#d9c9a0'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = 'rgba(160,120,70,.5)'; [[-17, 6], [-12, 14], [-10, 5]].forEach((p) => { c.beginPath(); c.arc(p[0], p[1], 1.6, 0, TAU); c.fill(); });
      const b = RM ? 0 : Math.sin(tt * 3) * 1.5;
      c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(16, 8 + b, 12, 0, TAU); c.fill(); c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(20, 5 + b, 1.8, 0, TAU); c.fill();
      c.fillStyle = '#f08c1a'; c.beginPath(); c.moveTo(24, 9 + b); c.lineTo(32, 11 + b); c.lineTo(24, 14 + b); c.closePath(); c.fill();
    } else if (kind === 'time') {
      c.strokeStyle = '#7a5a3a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-16, -26); c.lineTo(16, -26); c.moveTo(-16, 26); c.lineTo(16, 26); c.stroke();
      c.fillStyle = 'rgba(190,225,245,.7)'; c.strokeStyle = '#5b7f99'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(-14, -24); c.lineTo(14, -24); c.lineTo(2, 0); c.lineTo(14, 24); c.lineTo(-14, 24); c.lineTo(-2, 0); c.closePath(); c.fill(); c.stroke();
      const p = RM ? 0.5 : (tt * 0.25) % 1;
      c.fillStyle = '#e0a63a'; c.beginPath(); c.moveTo(-12, -22 + p * 14); c.lineTo(12, -22 + p * 14); c.lineTo(1, -2); c.lineTo(-1, -2); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-12, 23); c.lineTo(12, 23); c.lineTo(0, 23 - p * 14 - 4); c.closePath(); c.fill();
      c.fillRect(-0.7, 0, 1.4, 22);
    } else if (kind === 'div') {
      c.save(); c.translate(-18, -14); c.scale(0.8, 0.8); bugButterfly(c, t); c.restore();
      drawShell(c, 16, -10, 11, SHELLS[3], 0.2, t);
      drawShell(c, -4, 18, 9, SHELLS[2], -0.4, t);
      c.save(); c.translate(24, 22); c.scale(0.55, 0.55); bugBee(c, t); c.restore();
      c.fillStyle = '#3f9b45'; c.beginPath(); c.arc(-26, 20, 8, 0, TAU); c.fill(); c.fillStyle = '#7a5230'; c.fillRect(-27.5, 24, 3, 8);
    }
    c.restore();
    c.strokeStyle = 'rgba(60,90,60,.35)'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.stroke();
    c.restore();
  }

  /* =========================================================
     상태
     ========================================================= */
  const VIEW_ORDER = ['div', 'bugs', 'isl', 'story'];
  const S = {
    scene: 'div', prevKey: null, sceneT0: -9, snapOK: false, drag: null,
    divSeen: {}, divSel: null, divSelT0: -9, divDone: false, divDoneT: -9,
    recN: 0, hasEnvBtn: false,
  };
  let game = null;
  let F = new Set();
  const isNew = (f) => !!(game && game.isNew(f));
  let MANUAL = false;
  $('#game').addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('.mission-actions .btn-primary')) { MANUAL = true; setTimeout(() => { MANUAL = false; }, 0); }
  }, true);

  /* =========================================================
     배치 (태블릿 가로형 / 휴대폰 세로형)
     ========================================================= */
  function computeLayouts() {
    if (!TALL) {
      return {
        div: {
          cards: { x0: 14, y: 54, w: 248, h: 300, gap: 12, artH: 268 },
          slots: { y: 362, h: 64 },
          tray: { x0: 14, y: 440, w: 248, h: 88, gap: 12 },
          cap: { x: 14, y: 542, w: 772, h: 88 },
          hint: { x: 400, y: 28, maxW: 700 },
        },
        bugs: {
          meadow: { x: 14, y: 54, w: 476, h: 506, cols: 6, rows: 5 },
          chart: { x: 502, y: 54, w: 284, h: 506 },
          cap: { x: 14, y: 570, w: 772, h: 60 },
          hint: { x: 252, y: 30, maxW: 440 },
        },
        isl: {
          panel: [{ x: 12, y: 46, w: 386, h: 234 }, { x: 402, y: 46, w: 386, h: 234 }],
          hist: [{ x: 12, y: 286, w: 386, h: 148 }, { x: 402, y: 286, w: 386, h: 148 }],
          trend: { x: 12, y: 442, w: 776, h: 190 },
          home: { cols: 6, rows: 4, dx: 52, dy: 27, y0: 0.52, bird: 1.0 },
          env: { x: 205, y: 78 },
          hint: { x: 400, y: 24, maxW: 700 },
        },
        story: {
          slot: { x0: 18, y: 88, w: 140, h: 214, gap: 16 },
          tray: { x0: 18, y: 332, w: 140, h: 214, gap: 16, cols: 5 },
          cap: { x: 18, y: 560, w: 764, h: 70 },
          arrowY: 66, hint: { x: 400, y: 30, maxW: 700 },
        },
      };
    }
    return {
      div: {
        cards: { x0: 8, y: 48, w: 306, h: 160, gap: 8, artH: 130, rows: true },
        slots: { x: 320, w: 132, y: 48, h: 160 },
        tray: { x0: 8, y: 566, w: 144, h: 56, gap: 6 },
        cap: { x: 8, y: 636, w: 444, h: 156 },
        hint: { x: 230, y: 24, maxW: 430 },
      },
      bugs: {
        meadow: { x: 8, y: 46, w: 444, h: 340, cols: 6, rows: 5 },
        chart: { x: 8, y: 394, w: 444, h: 320 },
        cap: { x: 8, y: 722, w: 444, h: 70 },
        hint: { x: 230, y: 26, maxW: 430 },
      },
      isl: {
        panel: [{ x: 8, y: 42, w: 444, h: 168 }, { x: 8, y: 306, w: 444, h: 168 }],
        hist: [{ x: 8, y: 214, w: 444, h: 86 }, { x: 8, y: 478, w: 444, h: 86 }],
        trend: { x: 8, y: 570, w: 444, h: 222 },
        home: { cols: 6, rows: 4, dx: 62, dy: 20, y0: 0.5, bird: 0.92 },
        env: { x: 230, y: 70 },
        hint: { x: 230, y: 22, maxW: 430 },
      },
      story: {
        slot: { x0: 8, y: 44, w: 444, h: 84, gap: 6, rows: true },
        tray: { x0: 8, y: 506, w: 218, h: 84, gapX: 8, gapY: 6, cols: 2 },
        cap: { x: 8, y: 700, w: 444, h: 92 },
        arrowY: 0, hint: { x: 230, y: 482, maxW: 430 },
      },
    };
  }

  /* =========================================================
     카드 끌어 놓기 (공통)
     ========================================================= */
  function mkCard(o) { return Object.assign({ x: 0, y: 0, w: 100, h: 50, lift: 0, bad: -9, ok: false, tw: null }, o); }
  function moveCard(cd, r, animate) {
    cd.w = r.w; cd.h = r.h;
    if (animate && !RM) { cd.tw = SciSim.tween(cd, { x: r.x, y: r.y }, { duration: 0.42, ease: 'outBack' }); }
    else { if (cd.tw) cd.tw.cancel(); cd.x = r.x; cd.y = r.y; }
  }
  function cardAt(list, p) { for (let i = list.length - 1; i >= 0; i--) if (inR(p, list[i], 4)) return list[i]; return null; }
  function raise(list, cd) { list.splice(list.indexOf(cd), 1); list.push(cd); }
  function snapAll(list, targetFn, animate) { list.forEach((cd) => moveCard(cd, targetFn(cd), animate)); }
  function cardFrame(cd, t, accent, fn) {
    const lift = cd.lift, sc = 1 + 0.05 * lift;
    let shake = 0;
    const ba = t - cd.bad;
    if (ba < 0.55) shake = Math.sin(ba * 42) * 7 * (1 - ba / 0.55);
    const pop = cd.pop != null ? Math.max(0, now() - cd.pop) : 9;
    const bump = pop < 0.5 ? Math.sin(pop / 0.5 * Math.PI) * 0.08 : 0;
    ctx.save();
    ctx.translate(cd.x + cd.w / 2 + shake, cd.y + cd.h / 2 - lift * 3);
    ctx.scale(sc + bump, sc + bump);
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,30,' + (0.16 + lift * 0.14).toFixed(3) + ')'; ctx.shadowBlur = 6 + lift * 16; ctx.shadowOffsetY = 2 + lift * 7;
    rr(-cd.w / 2, -cd.h / 2, cd.w, cd.h, 14); ctx.fillStyle = cd.ok ? '#f3fdf6' : '#fff'; ctx.fill();
    ctx.restore();
    const bad = ba < 1.2;
    rr(-cd.w / 2, -cd.h / 2, cd.w, cd.h, 14);
    ctx.strokeStyle = bad ? '#ef4444' : cd.ok ? '#22c55e' : accent || '#c9d4e2'; ctx.lineWidth = bad || cd.ok ? 3 : 2; ctx.stroke();
    ctx.save(); ctx.translate(-cd.w / 2, -cd.h / 2); fn(cd.w, cd.h); ctx.restore();
    if (cd.ok) D.check(cd.w / 2 - 14, -cd.h / 2 + 14, 9, 1);
    ctx.restore();
  }
  function dragSetup(cd, set, list, p) {
    if (cd.tw) cd.tw.cancel();
    S.drag = { card: cd, set, list, dx: p.x - cd.x, dy: p.y - cd.y, sx: p.x, sy: p.y, px: p.x, py: p.y, moved: false };
    raise(list, cd); cd.ok = false;
    Sound.click();
    return true;
  }

  /* =========================================================
     ① 생물다양성의 세 가지
     ========================================================= */
  const TAGS = TAG_ORDER.map((k, home) => mkCard({ key: k, home, slot: -1, name: DIV_TYPES[k].name }));
  function cardRect(i) {
    const C = LAY.div.cards;
    return C.rows ? { x: C.x0, y: C.y + i * (C.h + C.gap), w: C.w, h: C.h } : { x: C.x0 + i * (C.w + C.gap), y: C.y, w: C.w, h: C.h };
  }
  function slotRectD(i) {
    const L = LAY.div, r = cardRect(i);
    return L.cards.rows ? { x: L.slots.x, y: r.y, w: L.slots.w, h: r.h } : { x: r.x, y: L.slots.y, w: r.w, h: L.slots.h };
  }
  function tagTarget(tg) {
    const T = LAY.div.tray;
    if (tg.slot >= 0) { const s = slotRectD(tg.slot); return TALL ? { x: s.x + 4, y: s.y + (s.h - 56) / 2, w: s.w - 8, h: 56 } : { x: s.x + 6, y: s.y + (s.h - T.h * 0.72) / 2, w: s.w - 12, h: T.h * 0.72 }; }
    return { x: T.x0 + tg.home * (T.w + T.gap), y: T.y, w: T.w, h: T.h };
  }
  function snapTags(animate) { snapAll(TAGS, tagTarget, animate); }
  function resetDiv() {
    TAGS.forEach((tg) => { tg.slot = -1; tg.ok = false; tg.bad = -9; });
    S.divSeen = {}; S.divSel = null; S.divDone = false; snapTags(false);
  }
  function divSlotAt(p) { for (let i = 0; i < 3; i++) { const c = cardRect(i), s = slotRectD(i); if (inR(p, s, 8) || (TALL ? false : inR(p, { x: c.x, y: c.y, w: c.w, h: s.y + s.h - c.y }, 0))) return i; } return -1; }
  function placeTag(tg, slot) {
    const other = TAGS.find((o) => o !== tg && o.slot === slot);
    if (other) { other.slot = tg.slot >= 0 && tg.slot !== slot ? tg.slot : -1; other.ok = false; }
    tg.slot = slot; tg.ok = false; Sound.tick(); snapTags(true);
  }
  function divCheck() {
    const empty = TAGS.filter((t) => t.slot < 0).length;
    if (empty) return '아직 놓지 않은 이름표가 ' + empty + '개 있어요. 세 장면에 하나씩 놓아 주세요.';
    const wrong = TAGS.filter((t) => DIV_SCENES[t.slot].type !== t.key);
    if (wrong.length) {
      if (MANUAL) {
        const t = now();
        wrong.forEach((c) => { c.bad = t; });
        setTimeout(() => { wrong.forEach((c) => { c.slot = -1; }); snapTags(true); }, 650);
      }
      return '빨간 이름표가 알맞지 않아요. 같은 종 안의 다양함인지, 여러 종인지, 여러 생태계인지 장면을 다시 살펴보세요.';
    }
    if (MANUAL) {
      S.divDone = true; S.divDoneT = now();
      TAGS.forEach((t) => { t.ok = true; t.pop = now() + Math.random() * 0.3; });
      for (let i = 0; i < 3; i++) { const c = cardRect(i); burst(c.x + c.w / 2, c.y + c.h / 2, [DIV_TYPES[DIV_SCENES[i].type].color, '#fff', '#fde047'], 14, { speed: 130 }); }
    }
    return true;
  }
  function selectDiv(i) {
    S.divSel = i; S.divSelT0 = now(); S.divSeen[i] = true;
    Sound.tone(520 + i * 110, 0.1, 'triangle', 0.07);
  }
  function drawDivCard(i, t) {
    const r = cardRect(i), sc = DIV_SCENES[i], sel = S.divSel === i;
    const age = now() - S.divSelT0, pop = sel && age < 0.45 ? 1 + 0.035 * Math.sin(age / 0.45 * Math.PI) : 1;
    const type = DIV_TYPES[sc.type];
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(pop, pop); ctx.translate(-r.w / 2, -r.h / 2);
    ctx.save(); ctx.shadowColor = 'rgba(20,40,30,.22)'; ctx.shadowBlur = sel ? 18 : 10; ctx.shadowOffsetY = 4;
    rr(0, 0, r.w, r.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    const artH = TALL ? r.h - 30 : r.h - 38;
    ctx.save(); rr(5, 5, r.w - 10, artH - 5, 12); ctx.clip();
    ctx.translate(5, 5);
    const aw = r.w - 10, ah = artH - 5;
    if (i === 0) artShells(ctx, aw, ah, t); else if (i === 1) artEco(ctx, aw, ah, t); else artInsects(ctx, aw, ah, t);
    ctx.restore();
    rr(0, 0, r.w, r.h, 16); ctx.strokeStyle = S.divDone ? type.color : sel ? '#16a34a' : '#d6dee8'; ctx.lineWidth = sel || S.divDone ? 3.2 : 1.6; ctx.stroke();
    // 아래 줄
    const by = r.h - (TALL ? 16 : 20);
    txt(sc.title, 14, by + 1, { size: 16, weight: 800, color: '#334155', base: 'middle' });
    if (S.divSeen[i] && !S.divDone) txt('✅ 살펴봤어요', r.w - 12, by + 1, { size: 14, weight: 800, color: '#15803d', align: 'right', base: 'middle' });
    if (!S.divSeen[i] && !S.divDone) txt('👆 눌러 보기', r.w - 12, by + 1, { size: 14, weight: 800, color: '#64748b', align: 'right', base: 'middle' });
    if (S.divDone) { const ag = clamp((now() - S.divDoneT - i * 0.12) / 0.4, 0, 1); ctx.save(); ctx.globalAlpha = ag; pill(type.name, r.w - 12, by + 1, { size: 14.5, align: 'right', bg: type.color, color: '#fff', pad: 11, h: 26 }); ctx.restore(); }
    ctx.restore();
  }
  function drawDivScene(t) {
    const L = LAY.div;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eef7f1'); g.addColorStop(1, '#dcebe2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) drawDivCard(i, t);
    // 이름표 칸
    const hot = (() => { const d = S.drag; if (!d || d.set !== 'div' || d.px == null) return -1; return divSlotAt({ x: d.px, y: d.py }); })();
    for (let i = 0; i < 3; i++) {
      const s = slotRectD(i);
      ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = hot === i ? '#16a34a' : '#a9b8c8'; ctx.lineWidth = hot === i ? 3 : 1.8;
      rr(s.x, s.y, s.w, s.h, 14); ctx.stroke(); ctx.setLineDash([]);
      if (hot === i) { ctx.fillStyle = 'rgba(34,197,94,.1)'; rr(s.x, s.y, s.w, s.h, 14); ctx.fill(); }
      ctx.restore();
      if (!TAGS.some((tg) => tg.slot === i)) txt(TALL ? '이름표를 여기에' : '👇 알맞은 이름표를 여기에', s.x + s.w / 2, s.y + s.h / 2 + 1, { size: TALL ? 13.5 : 14.5, weight: 700, color: '#94a3b8', align: 'center', base: 'middle' });
    }
    if (!TAGS.every((tg) => tg.slot >= 0) || !S.divDone) {
      if (!S.divDone) txt('🏷️ 이름표 (끌어서 놓아요)', TALL ? 10 : 16, L.tray.y - 8, { size: 13.5, weight: 800, color: '#64748b' });
    }
    // 설명 상자
    const C = L.cap;
    panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: '#e2e8f0' });
    if (S.divSel != null) {
      const sc = DIV_SCENES[S.divSel];
      pill(sc.title, C.x + 14, C.y + 24, { size: 14, align: 'left', bg: '#e8f1ec', color: '#166534', pad: 11, h: 26 });
      para(sc.cap, C.x + 16, C.y + 58, C.w - 32, { size: TALL ? 15 : 16.5, weight: 800, color: '#1e293b', lh: TALL ? 21 : 23 });
      if (S.divDone) { const tp = DIV_TYPES[sc.type]; para(tp.name + ': ' + tp.def, C.x + 16, C.y + C.h - (TALL ? 52 : 24), C.w - 32, { size: TALL ? 14 : 14.5, weight: 700, color: tp.color, lh: 19 }); }
    } else {
      txt('👆 장면을 눌러 보세요', C.x + 16, C.y + 32, { size: 17, weight: 800, color: '#166534' });
      para('세 장면의 생물을 살펴본 뒤, 생물다양성의 종류를 알맞은 이름표로 나눠 봐요.', C.x + 16, C.y + 62, C.w - 32, { size: 15, weight: 700, color: '#475569', lh: 21 });
    }
    // 이름표 카드
    const dragCd = S.drag && S.drag.set === 'div' ? S.drag.card : null;
    TAGS.forEach((tg) => { if (tg !== dragCd) drawTag(tg, t); });
    if (dragCd) drawTag(dragCd, t);
    if (isNew('div')) newRing({ x: L.cards.x0, y: cardRect(0).y, w: cardRect(2).x + cardRect(2).w - cardRect(0).x, h: cardRect(2).y + cardRect(2).h - cardRect(0).y }, 16);
  }
  function drawTag(tg, t) {
    const tp = DIV_TYPES[tg.key];
    cardFrame(tg, t, tp.color, (w, h) => {
      ctx.fillStyle = tp.color; rr(8, 9, 6, h - 18, 3); ctx.fill();
      if (tg.slot >= 0 || TALL) txt(tp.name, w / 2 + 4, h / 2 + 1, { size: TALL ? 15 : 17, weight: 800, color: tp.color, align: 'center', base: 'middle', max: w - 28 });
      else {
        txt(tp.name, 22, 24, { size: 17, weight: 800, color: tp.color, max: w - 34 });
        para(tp.def, 22, 46, w - 34, { size: 13, weight: 700, color: '#475569', lh: 16 });
      }
    });
  }

  /* =========================================================
     ② 무당벌레 변이 관찰 → 점 개수별 막대그래프
     ========================================================= */
  const BUG = { counts: new Array(8).fill(0), reserved: new Array(8).fill(0), icons: [[], [], [], [], [], [], [], []] };
  function layoutBugs() {
    const M = LAY.bugs.meadow, cw = M.w / M.cols, rh = M.h / M.rows;
    LADYBUGS.forEach((b, i) => {
      const col = i % M.cols, row = Math.floor(i / M.cols);
      b.hx = M.x + cw * (col + 0.5) + b.jx * cw * 0.26; b.hy = M.y + rh * (row + 0.5) + b.jy * rh * 0.22;
      b.size = Math.min(cw, rh) * 0.255 * b.sz;
    });
  }
  function chartGeom() {
    const C = LAY.bugs.chart;
    const padL = TALL ? 40 : 38, padR = 12, padT = TALL ? 54 : 64, padB = TALL ? 58 : 66;
    const x0 = C.x + padL, x1 = C.x + C.w - padR, yBase = C.y + C.h - padB;
    const bw = (x1 - x0) / 8, u = Math.min(40, (yBase - (C.y + padT)) / 8);
    return { C, x0, x1, yBase, bw, u, yTop: yBase - 8 * u };
  }
  function resetBugs() {
    LADYBUGS.forEach((b) => { b.rec = false; b.fly = null; });
    BUG.counts.fill(0); BUG.reserved.fill(0); BUG.icons.forEach((a) => { a.length = 0; });
    S.recN = 0;
  }
  function recordBug(b) {
    if (b.rec) return;
    b.rec = true; S.recN++;
    const G = chartGeom(), k = b.spots, n = BUG.reserved[k]++;
    const to = { x: G.x0 + G.bw * (k + 0.5), y: G.yBase - (n + 0.5) * G.u };
    b.fly = { t0: now(), dur: 0.9, from: { x: b.hx, y: b.hy }, to, k, n, landed: false };
    Sound.tone(560 + k * 60, 0.09, 'triangle', 0.07);
  }
  function updateBugFlights() {
    LADYBUGS.forEach((b) => {
      const f = b.fly;
      if (!f || f.landed) return;
      if (now() - f.t0 >= f.dur) {
        f.landed = true; BUG.counts[f.k]++; BUG.icons[f.k].push({ style: b.style, spots: b.spots, t0: now(), id: b.id });
        burst(f.to.x, f.to.y, ['#fde047', '#ffffff', LB_STYLE[b.style].base], 7, { speed: 80, life: 0.5, gravity: 60, size: 3 });
        Sound.tick();
      }
    });
  }
  function bugAt(p) {
    let best = null, bd = 1e9;
    LADYBUGS.forEach((b) => { if (b.rec) return; const d = Math.hypot(p.x - b.hx, p.y - b.hy); if (d < bd) { bd = d; best = b; } });
    const M = LAY.bugs.meadow, lim = Math.min(M.w / M.cols, M.h / M.rows) * 0.52;
    return best && bd <= lim ? best : null;
  }
  function drawBugsScene(t) {
    const L = LAY.bugs, M = L.meadow, G = chartGeom();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eef7f1'); g.addColorStop(1, '#dcebe2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 풀밭
    panel(M.x, M.y, M.w, M.h, { bg: '#e3f3d6', border: '#c5e0b4', r: 20 });
    ctx.save(); rr(M.x, M.y, M.w, M.h, 20); ctx.clip();
    ctx.fillStyle = lgrad(ctx, 0, M.y, 0, M.y + M.h, [[0, '#d5efc3'], [1, '#b7dd9e']]); ctx.fillRect(M.x, M.y, M.w, M.h);
    const cw = M.w / M.cols, rh = M.h / M.rows;
    for (let r = 0; r < M.rows; r++) for (let c2 = 0; c2 < M.cols; c2++) {            // 잎사귀
      const cx = M.x + cw * (c2 + 0.5), cy = M.y + rh * (r + 0.5), sw = Math.sin(RM ? 0 : t * 0.7 + r * 1.3 + c2) * 0.03;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(((r + c2) % 2 ? 0.25 : -0.25) + sw);
      ctx.fillStyle = 'rgba(70,150,70,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, cw * 0.46, rh * 0.38, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-cw * 0.4, 0); ctx.lineTo(cw * 0.4, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // 무당벌레
    LADYBUGS.forEach((b) => {
      const sw = RM ? 0 : Math.sin(t * 0.6 + b.ph) * 3.2, tilt = RM ? 0 : Math.sin(t * 0.9 + b.ph * 2) * 0.1;
      if (b.rec) {
        const fl = b.fly;
        if (fl && !fl.landed) return;            // 날아가는 동안은 따로 그려요
        ctx.save(); ctx.strokeStyle = 'rgba(80,120,70,.35)'; ctx.lineWidth = 1.8; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(b.hx, b.hy, b.size * 1.5, 0, TAU); ctx.stroke(); ctx.restore();
        drawLadybug(ctx, b.hx, b.hy, b.size, b, t, { alpha: 0.2, rot: b.ang });
        return;
      }
      const hot = b.hov ? 1.08 : 1;
      drawLadybug(ctx, b.hx + sw, b.hy, b.size * hot, b, t, { rot: b.ang + tilt, walk: true });
    });
    // 그래프 판
    const C = G.C;
    panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: '#e2e8f0', r: 20 });
    pill('점 개수별 무당벌레 수', C.x + 14, C.y + 26, { size: 14.5, align: 'left', bg: '#fee2e2', color: '#991b1b', pad: 12, h: 30 });
    ctx.strokeStyle = '#e5eaf1'; ctx.lineWidth = 1.2; ctx.fillStyle = '#94a3b8';
    for (let v = 0; v <= 8; v += 2) { const y = G.yBase - v * G.u; ctx.beginPath(); ctx.moveTo(G.x0 - 4, y); ctx.lineTo(G.x1, y); ctx.stroke(); txt(String(v), G.x0 - 10, y + 5, { size: 13, weight: 700, color: '#94a3b8', align: 'right' }); }
    txt('마리', C.x + 8, G.yTop - 12, { size: 13, weight: 800, color: '#64748b' });
    for (let k = 0; k < 8; k++) {
      const bx = G.x0 + G.bw * k + 3, bw2 = G.bw - 6, n = BUG.counts[k];
      const cs = Math.min(bw2 * 0.8 / 1.9, G.u * 0.9 / 2.4);
      rr(bx, G.yBase - 8 * G.u, bw2, 8 * G.u, 8); ctx.fillStyle = 'rgba(226,232,240,.35)'; ctx.fill();
      if (n > 0) { rr(bx, G.yBase - n * G.u, bw2, n * G.u, 8); ctx.fillStyle = 'rgba(244,114,114,.2)'; ctx.fill(); ctx.strokeStyle = 'rgba(239,68,68,.45)'; ctx.lineWidth = 1.6; ctx.stroke(); }
      BUG.icons[k].forEach((ic, j) => {
        const age = now() - ic.t0, sc = age < 0.35 ? 1 + 0.4 * Math.sin(age / 0.35 * Math.PI) : 1;
        drawLadybug(ctx, bx + bw2 / 2, G.yBase - (j + 0.5) * G.u, cs * sc, { spots: ic.spots, style: ic.style, ph: j, ang: 0 }, t, { rot: 0 });
      });
      txt(String(k), bx + bw2 / 2, G.yBase + 22, { size: 15, weight: 800, color: '#334155', align: 'center' });
      if (n > 0) txt(String(n), bx + bw2 / 2, G.yBase - n * G.u - 7, { size: 14, weight: 800, color: '#b91c1c', align: 'center' });
    }
    txt('날개의 점 개수 (개)', (G.x0 + G.x1) / 2, G.yBase + 46, { size: 14, weight: 800, color: '#64748b', align: 'center' });
    // 날아가는 무당벌레
    LADYBUGS.forEach((b) => {
      const f = b.fly;
      if (!f || f.landed) return;
      const u = clamp((now() - f.t0) / f.dur, 0, 1), e = EASE.inOutCubic(u);
      const mx = (f.from.x + f.to.x) / 2, my = Math.min(f.from.y, f.to.y) - 70;
      const x = (1 - e) * (1 - e) * f.from.x + 2 * (1 - e) * e * mx + e * e * f.to.x;
      const y = (1 - e) * (1 - e) * f.from.y + 2 * (1 - e) * e * my + e * e * f.to.y;
      const cs = Math.min((G.bw - 6) * 0.8 / 1.9, G.u * 0.9 / 2.4);
      drawLadybug(ctx, x, y, lerp(b.size * 1.15, cs, e), b, t, { rot: b.ang + e * 6.0, walk: true });
    });
    // 설명
    const Cp = L.cap;
    panel(Cp.x, Cp.y, Cp.w, Cp.h, { bg: '#fff', border: '#e2e8f0' });
    const n = S.recN;
    if (n === 0) para('무당벌레를 눌러 점 개수를 세고, 그래프에 기록해요. 20마리 이상 기록해 보세요.', Cp.x + 16, Cp.y + (TALL ? 28 : 26), Cp.w - 150, { size: TALL ? 14.5 : 16.5, weight: 800, color: '#1e293b', lh: 21 });
    else if (n < 20) para('기록한 무당벌레 ' + n + '마리! 점 개수가 서로 다른지 살펴봐요.', Cp.x + 16, Cp.y + (TALL ? 28 : 26), Cp.w - 150, { size: TALL ? 14.5 : 16.5, weight: 800, color: '#1e293b', lh: 21 });
    else para('같은 종인데도 점 개수가 서로 달라요. 이런 차이를 변이라고 해요.', Cp.x + 16, Cp.y + (TALL ? 28 : 26), Cp.w - 150, { size: TALL ? 14.5 : 16.5, weight: 800, color: '#166534', lh: 21 });
    pill('기록 ' + n + ' / 30', Cp.x + Cp.w - 14, Cp.y + Cp.h / 2, { size: 16, align: 'right', bg: n >= 20 ? '#16a34a' : '#475569', color: '#fff', pad: 14, h: 34 });
    if (isNew('bugs')) newRing({ x: M.x, y: M.y, w: M.w, h: M.h }, 20);
  }

  /* =========================================================
     ③ 환경과 변이: 두 섬의 새 무리
     ========================================================= */
  const ISL = { gen: 0, busy: false, queue: 0, envChanged: false, envGen: -1, envMean: 0, envT: 0, envAnim: null, anim: null, trend: [[], []], trendT0: -9, RA: null, RB: null, isl: [], base: null };
  const faceR = rng(909);
  const FACES = []; for (let i = 0; i < NB; i++) FACES.push(faceR() < 0.5 ? -1 : 1);
  function homePos(i, k) {                      // 섬 i의 k번째 새 자리 (섬 그림 안 좌표)
    const L = LAY.isl, P = L.panel[i], H0 = L.home;
    const col = k % H0.cols, row = Math.floor(k / H0.cols);
    return { x: P.w / 2 + (col - (H0.cols - 1) / 2) * H0.dx + (row % 2 ? H0.dx * 0.18 : -H0.dx * 0.18), y: P.h * H0.y0 + row * H0.dy, row, s: H0.bird * (0.88 + row * 0.07) };
  }
  function makeBird(i, k, t) {
    const h = homePos(i, k);
    return { t, k, hx: h.x, hy: h.y, x: h.x, y: h.y, s: h.s, face: FACES[k], ph: k * 1.7, a: 1, sc: 1, peck: 0, tilt: 0, puff: 1, ring: 0, fed: null, seed: 1, shake: 0, mark: 0 };
  }
  function makeIsland(i) {
    return { i, key: i === 0 ? 'A' : 'B', env: i === 0 ? 'big' : 'small', pop: [], birds: [], chicks: [], hist: new Array(BINS).fill(0), histV: new Array(BINS).fill(0), mean: 0.5, meanV: 0.5, survN: -1 };
  }
  function histOf(pop) { const h = new Array(BINS).fill(0); pop.forEach((t) => { h[binOf(t)]++; }); return h; }
  function setPop(is, pop, instant) {
    is.pop = pop.slice();
    is.birds = pop.map((t, k) => makeBird(is.i, k, t)); is.chicks = [];
    is.hist = histOf(pop); is.mean = meanOf(pop);
    if (instant) { is.histV = is.hist.slice(); is.meanV = is.mean; }
  }
  function resetIsl() {
    ISL.gen = 0; ISL.busy = false; ISL.queue = 0; ISL.envChanged = false; ISL.envGen = -1; ISL.envT = 0; ISL.envAnim = null; ISL.anim = null;
    ISL.RA = rng(SEL_SEED.a); ISL.RB = rng(SEL_SEED.b);
    ISL.base = initBeaks();
    ISL.isl = [makeIsland(0), makeIsland(1)];
    ISL.isl.forEach((is) => setPop(is, ISL.base, true));
    ISL.trend = [[ISL.isl[0].mean], [ISL.isl[1].mean]]; ISL.trendT0 = -9;
    updateIslUI();
  }
  // 소리 없이 g세대까지 한 번에 (이어하기용)
  function simulateTo(g) {
    resetIsl();
    for (let k = 0; k < g; k++) {
      ISL.isl.forEach((is) => { const R = is.i === 0 ? ISL.RA : ISL.RB; const r = nextGen(is.pop, is.env, R); is.pop = r.kids.map((c) => c.t); ISL.trend[is.i].push(meanOf(is.pop)); });
      ISL.gen++;
    }
    ISL.isl.forEach((is) => setPop(is, is.pop, true));
    updateIslUI();
  }
  function startGen(fast) {
    if (ISL.busy) return false;
    ISL.busy = true;
    const plans = ISL.isl.map((is) => nextGen(is.pop, is.env, is.i === 0 ? ISL.RA : ISL.RB));
    ISL.anim = { t0: now(), fast: !!fast, plans, speed: (fast || RM) ? 0.3 : 1, hist: false, done: false };
    ISL.isl.forEach((is, i) => { is.birds.forEach((b) => { b.fed = null; b.seed = 1; b.mark = 0; b.ring = 0; b.shake = 0; b.fedAt = -9; }); is.chicks = []; is.survN = plans[i].alive.filter(Boolean).length; });
    updateIslUI();
    return true;
  }
  function stepGens(n) {
    if (ISL.busy) return;
    ISL.queue = Math.max(0, n - 1);
    startGen(n > 1);
  }
  function updateGen(dt) {
    const A = ISL.anim;
    if (!A) return;
    const T = (now() - A.t0) / A.speed;
    ISL.isl.forEach((is, ii) => {
      const plan = A.plans[ii];
      is.birds.forEach((b, i) => {
        const alive = plan.alive[i];
        const ps = 0.1 + i * 0.04, loc = T - ps;
        // 먹이 먹기
        b.peck = loc > 0 && loc < 0.95 ? Math.abs(Math.sin(loc * 7.2)) : 0;
        if (loc >= 0.95 && b.fed === null) {
          b.fed = alive; b.fedAt = now();
          if (alive) { b.seed = 0; b.puff = 1.18; if (!A.fast) { const PP = LAY.isl.panel[is.i]; burst(PP.x + b.x + b.face * 16, PP.y + b.y + 2, ['#fde047', '#ffffff', '#c9a24a'], 6, { speed: 70, life: 0.5, gravity: 90, size: 2.6 }); } }
          else { b.shake = 1; }
        }
        b.puff = SciSim.approach(b.puff, 1, dt, 8);
        if (b.fed === false) { const sa = now() - b.fedAt; b.tilt = sa < 0.6 ? Math.sin(sa * 22) * 0.22 * (1 - sa / 0.6) : 0; b.mark = clamp(1 - sa / 1.6, 0, 1); }
        // 걸러짐
        if (T > 1.75 && !alive) { const u = clamp((T - 1.75) / 0.7, 0, 1); b.a = 1 - EASE.inQuad(u); b.y = b.hy - u * 20; b.tilt = u * 0.5 * b.face; }
        if (T > 1.75 && alive) b.ring = clamp((T - 1.75) / 0.4, 0, 1) * (1 - clamp((T - 3.0) / 0.5, 0, 1));
        if (T > 3.0 && alive) b.a = 1 - EASE.inQuad(clamp((T - 3.0) / 0.55, 0, 1));
      });
      // 새끼 태어나기
      if (T > 2.5 && !A.hist) { A.hist = true; ISL.isl.forEach((q, qi) => { const kids = A.plans[qi].kids.map((k) => k.t); q.hist = histOf(kids); q.mean = meanOf(kids); }); Sound.tone(660, 0.1, 'triangle', 0.06); }
      if (T > 2.5 && is.chicks.length === 0) {
        is.chicks = plan.kids.map((kd, j) => { const par = is.birds[kd.parent], c = makeBird(is.i, j, kd.t); c.x = par.hx + (j % 3 - 1) * 10; c.y = par.hy + 4; c.a = 0; c.sc = 0.2; c.born = 2.5 + j * 0.035; return c; });
      }
      is.chicks.forEach((c) => {
        const u = clamp((T - c.born) / 0.7, 0, 1), e = EASE.outBack(u);
        if (T < c.born) { c.a = 0; return; }
        c.a = clamp(u * 2, 0, 1); c.sc = lerp(0.3, 1, e);
        const m = EASE.inOutCubic(clamp((T - c.born - 0.25) / 0.7, 0, 1));
        const par = is.birds[plan.kids[c.k].parent];
        c.x = lerp(par.hx + (c.k % 3 - 1) * 10, c.hx, m); c.y = lerp(par.hy + 4, c.hy, m) - Math.sin(m * Math.PI) * 10;
      });
    });
    if (T > 4.0 && !A.done) {
      A.done = true;
      ISL.isl.forEach((is, ii) => { const kids = A.plans[ii].kids; is.pop = kids.map((k) => k.t); is.birds = is.chicks.map((c) => { c.a = 1; c.sc = 1; c.x = c.hx; c.y = c.hy; c.fed = null; c.seed = 1; c.puff = 1; c.tilt = 0; c.born = 0; return c; }); is.chicks = []; is.survN = -1; ISL.trend[ii].push(meanOf(is.pop)); });
      ISL.gen++; ISL.trendT0 = now(); ISL.busy = false; ISL.anim = null;
      Sound.tone(740, 0.1, 'triangle', 0.06);
      updateIslUI();
      if (ISL.queue > 0) { ISL.queue--; startGen(true); }
    }
  }
  function envChange() {
    if (ISL.envChanged || ISL.busy) return false;
    ISL.envChanged = true; ISL.envGen = ISL.gen; ISL.envMean = ISL.isl[0].mean; ISL.isl[0].env = 'small'; ISL.envAnim = { t0: now() };
    burst(LAY.isl.panel[0].x + 200, LAY.isl.panel[0].y + 100, ['#fde68a', '#fb923c', '#ffffff'], 24, { speed: 150 });
    Sound.tone(300, 0.25, 'sawtooth', 0.04); Sound.tone(420, 0.2, 'triangle', 0.06, 0.12);
    updateIslUI();
    return true;
  }
  const sinceEnv = () => (ISL.envChanged ? ISL.gen - ISL.envGen : 0);

  function drawBirdsOf(is, P, t) {
    const list = is.birds.concat(is.chicks).sort((p, q) => p.y - q.y);
    list.forEach((b) => {
      if (b.a <= 0.01) return;
      // 먹이 (새 앞 땅 위)
      const sx = b.x + b.face * 18 * b.s, sy = b.y + 1;
      if (is.env === 'big' || (is.i === 0 && ISL.envT < 1)) { const na = is.i === 0 ? 1 - ISL.envT : 1; if (b.seed > 0 && b.a > 0.5) drawNut(ctx, sx, sy, 5.4 * b.s * (0.5 + 0.5 * na), na * b.seed); }
      if (is.env === 'small' || (is.i === 0 && ISL.envT > 0)) { const sa = is.i === 0 ? ISL.envT : 1; if (b.seed > 0 && b.a > 0.5) drawSeeds(ctx, sx, sy, sa * b.seed, t); }
      if (b.ring > 0.02) { ctx.save(); ctx.globalAlpha = b.ring * 0.8; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(b.x, b.y - 6 * b.s, 22 * b.s, 16 * b.s, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
      const idle = RM ? 0 : Math.sin(t * 1.3 + b.ph) * 0.03;
      drawBird(ctx, b.x, b.y, b.s * b.sc, b.t, { face: b.face, peck: b.peck, tilt: b.tilt + idle, puff: b.puff, alpha: b.a });
      if (b.mark > 0.05 && b.fed === false) { ctx.save(); ctx.globalAlpha = b.mark; txt('✗', b.x, b.y - 28 * b.s - (1 - b.mark) * 8, { size: 17, weight: 800, color: '#dc2626', align: 'center', halo: '#fff', haloW: 3 }); ctx.restore(); }
      if (b.fed === true && now() - b.fedAt < 1.0) { const a = 1 - (now() - b.fedAt); ctx.save(); ctx.globalAlpha = a; txt('✓', b.x, b.y - 28 * b.s - (1 - a) * 10, { size: 17, weight: 800, color: '#16a34a', align: 'center', halo: '#fff', haloW: 3 }); ctx.restore(); }
    });
  }
  function drawIslPanel(i, t) {
    const P = LAY.isl.panel[i], is = ISL.isl[i];
    ctx.save();
    ctx.shadowColor = 'rgba(20,50,70,.22)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; rr(P.x, P.y, P.w, P.h, 18); ctx.fillStyle = '#9fd0ea'; ctx.fill(); ctx.restore();
    ctx.save(); rr(P.x, P.y, P.w, P.h, 18); ctx.clip(); ctx.translate(P.x, P.y);
    artIsland(ctx, P.w, P.h, i === 0 ? 'big' : 'small', i === 0 ? ISL.envT : 0, t);
    drawBirdsOf(is, P, t);
    // 가뭄 효과
    if (i === 0 && ISL.envAnim) { const u = clamp((now() - ISL.envAnim.t0) / 2.2, 0, 1); if (u < 1) { ctx.fillStyle = 'rgba(255,214,120,' + (0.35 * Math.sin(u * Math.PI)).toFixed(3) + ')'; ctx.fillRect(0, 0, P.w, P.h); } }
    ctx.restore();
    rr(P.x, P.y, P.w, P.h, 18); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.stroke();
    const col = ISL_INFO[is.key].color;
    const label = i === 0 ? (ISL.envChanged ? 'A섬 · 작은 씨앗만 남았어요' : 'A섬 · 크고 단단한 씨앗') : 'B섬 · 작은 씨앗과 곤충';
    pill(label, P.x + 12, P.y + 24, { size: 14.5, align: 'left', bg: col, color: '#fff', pad: 12, h: 30, shadow: true });
    pill(ISL.gen + '세대', P.x + P.w - 12, P.y + 24, { size: 15, align: 'right', bg: 'rgba(255,255,255,.92)', color: '#334155', pad: 12, h: 30 });
    if (is.survN >= 0 && ISL.anim && (now() - ISL.anim.t0) / ISL.anim.speed > 1.7 && !ISL.anim.fast) pill('살아남은 새 ' + is.survN + ' / ' + NB, P.x + P.w - 12, P.y + P.h - 20, { size: 14, align: 'right', bg: 'rgba(255,255,255,.92)', color: '#166534', pad: 11, h: 28 });
  }
  function drawHist(i, t) {
    const R0 = LAY.isl.hist[i], is = ISL.isl[i], col = ISL_INFO[is.key].color;
    panel(R0.x, R0.y, R0.w, R0.h, { bg: '#fff', border: '#e2e8f0', r: 16 });
    pill(is.key + '섬 · 부리 두께 분포', R0.x + 12, R0.y + 22, { size: 13.5, align: 'left', bg: rgba(col, 0.14), color: col, pad: 11, h: 26 });
    const x0 = R0.x + 30, x1 = R0.x + R0.w - 14, yb = R0.y + R0.h - (TALL ? 26 : 32), yt = R0.y + (TALL ? 40 : 46);
    const bw = (x1 - x0) / BINS, ymax = 14, u = (yb - yt) / ymax;
    ctx.strokeStyle = '#eef1f5'; ctx.lineWidth = 1;
    for (let v = 0; v <= 12; v += 4) { const y = yb - v * u; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); txt(String(v), x0 - 5, y + 4, { size: 11.5, weight: 700, color: '#a0abb9', align: 'right' }); }
    for (let k = 0; k < BINS; k++) {
      const hh = is.histV[k] * u, bx = x0 + bw * k + 3;
      if (hh > 0.5) {
        rr(bx, yb - hh, bw - 6, hh, 5); ctx.fillStyle = lgrad(ctx, 0, yb - hh, 0, yb, [[0, rgba(col, 0.95)], [1, rgba(col, 0.55)]]); ctx.fill();
        if (is.histV[k] >= 0.6) txt(String(Math.round(is.histV[k])), bx + (bw - 6) / 2, yb - hh - 4, { size: 12.5, weight: 800, color: col, align: 'center' });
      }
    }
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke();
    const mx = x0 + (x1 - x0) * is.meanV;
    ctx.save(); ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(mx, yb); ctx.lineTo(mx, yt - 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(mx, yb + 1); ctx.lineTo(mx - 5, yb + 8); ctx.lineTo(mx + 5, yb + 8); ctx.closePath(); ctx.fill(); ctx.restore();
    txt('평균', mx + 7, yt + 6, { size: 12.5, weight: 800, color: '#1f2937' });
    txt('얇은 부리', x0, R0.y + R0.h - 8, { size: 12.5, weight: 800, color: '#64748b' });
    txt('두꺼운 부리', x1, R0.y + R0.h - 8, { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
  }
  function drawTrend(t) {
    const R0 = LAY.isl.trend;
    panel(R0.x, R0.y, R0.w, R0.h, { bg: '#fff', border: '#e2e8f0', r: 16 });
    pill('세대에 따른 부리 두께 평균', R0.x + 12, R0.y + 22, { size: 13.5, align: 'left', bg: '#f1f5f9', color: '#334155', pad: 11, h: 26 });
    const x0 = R0.x + 44, x1 = R0.x + R0.w - 16, yb = R0.y + R0.h - 30, yt = R0.y + 44;
    const gmax = Math.max(20, ISL.gen + 1);
    ctx.strokeStyle = '#eef1f5'; ctx.lineWidth = 1;
    [0, 0.5, 1].forEach((v) => { const y = yb - v * (yb - yt); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); });
    txt('두꺼움', x0 - 6, yt + 4, { size: 12.5, weight: 700, color: '#94a3b8', align: 'right' });
    txt('얇음', x0 - 6, yb + 4, { size: 12.5, weight: 700, color: '#94a3b8', align: 'right' });
    for (let g = 0; g <= gmax; g += 5) { const x = x0 + (x1 - x0) * g / gmax; ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb + 5); ctx.stroke(); txt(String(g), x, yb + 20, { size: 12.5, weight: 700, color: '#94a3b8', align: 'center' }); }
    txt('세대', x1, yb + 20, { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
    if (ISL.envChanged) { const x = x0 + (x1 - x0) * ISL.envGen / gmax; ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yt); ctx.stroke(); ctx.restore(); txt('A섬 먹이 변화', x + 5, yt + 12, { size: 12.5, weight: 800, color: '#b45309' }); }
    [0, 1].forEach((i) => {
      const col = ISL_INFO[i === 0 ? 'A' : 'B'].color, pts = ISL.trend[i];
      const px = (g) => x0 + (x1 - x0) * g / gmax, py = (v) => yb - v * (yb - yt);
      const grow = clamp((now() - ISL.trendT0) / 0.6, 0, 1);
      ctx.strokeStyle = col; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      pts.forEach((v, g) => {
        let x = px(g), y = py(v);
        if (g === pts.length - 1 && g > 0 && grow < 1) { const pv = pts[g - 1]; x = lerp(px(g - 1), x, grow); y = lerp(py(pv), y, grow); }
        if (g === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      pts.forEach((v, g) => { if (g === pts.length - 1 && grow < 1 && g > 0) return; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px(g), py(v), 3.6, 0, TAU); ctx.fill(); });
      if (pts.length) { const g = pts.length - 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px(g), py(pts[g]), 2, 0, TAU); ctx.fill(); }
    });
    pill('A섬', R0.x + R0.w - 96, R0.y + 22, { size: 13.5, bg: ISL_INFO.A.color, color: '#fff', pad: 10, h: 24 });
    pill('B섬', R0.x + R0.w - 40, R0.y + 22, { size: 13.5, bg: ISL_INFO.B.color, color: '#fff', pad: 10, h: 24 });
  }
  function envBtnRect() { const e = LAY.isl.env; return { x: e.x - 112, y: e.y - 20, w: 224, h: 40 }; }
  function drawIslScene(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eaf4f9'); g.addColorStop(1, '#d9e8ef');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2; i++) drawIslPanel(i, t);
    for (let i = 0; i < 2; i++) drawHist(i, t);
    drawTrend(t);
    // 먹이 바꾸기 단추 (3번째 미션에서)
    if (S.hasEnvBtn && !ISL.envChanged) {
      const b = envBtnRect(), a = 0.5 + 0.5 * Math.sin(now() * 5);
      ctx.save(); ctx.strokeStyle = 'rgba(245,158,11,' + (0.4 + 0.5 * a).toFixed(2) + ')'; ctx.lineWidth = 4; rr(b.x - 5, b.y - 5, b.w + 10, b.h + 10, 24); ctx.stroke(); ctx.restore();
      pill('🌵 A섬에 가뭄! 먹이 바꾸기', b.x + b.w / 2, b.y + b.h / 2, { size: 16, bg: '#f59e0b', color: '#fff', pad: 16, h: 40, shadow: true });
    }
    if (isNew('islands')) newRing({ x: LAY.isl.panel[0].x, y: LAY.isl.panel[0].y, w: 776, h: LAY.isl.panel[0].h }, 18);
  }
  const btnStep = $('#btnStep'), btnStep5 = $('#btnStep5'), oGen = $('#oGen'), ctrlNote = $('#ctrlNote');
  function smoothIsl(dt) {
    if (ISL.envAnim) ISL.envT = SciSim.approach(ISL.envT, 1, dt, 1.5);
    ISL.isl.forEach((is) => { for (let k = 0; k < BINS; k++) is.histV[k] = SciSim.approach(is.histV[k], is.hist[k], dt, 7); is.meanV = SciSim.approach(is.meanV, is.mean, dt, 7); });
  }
  function updateIslUI() {
    oGen.textContent = ISL.gen + '세대';
    btnStep.disabled = btnStep5.disabled = ISL.busy;
  }
  btnStep.addEventListener('click', () => { Sound.click(); hideHint(); stepGens(1); });
  btnStep5.addEventListener('click', () => { Sound.click(); hideHint(); stepGens(5); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetIsl(); });

  /* =========================================================
     ④ 다양성이 만들어지는 과정 (순서 맞추기)
     ========================================================= */
  const STORY_C = { cards: shuffled([0, 1, 2, 3, 4], 21).map((idx, home) => mkCard({ idx, home, slot: -1, text: STORY[idx].text, icon: STORY[idx].icon })), done: false, t0: -9, fired: [] };
  function storySlot(i) { const s = LAY.story.slot; return s.rows ? { x: s.x0, y: s.y + i * (s.h + s.gap), w: s.w, h: s.h } : { x: s.x0 + i * (s.w + s.gap), y: s.y, w: s.w, h: s.h }; }
  function storyTray(i) { const T = LAY.story.tray, col = i % T.cols, row = Math.floor(i / T.cols); return { x: T.x0 + col * (T.w + (T.gapX != null ? T.gapX : T.gap)), y: T.y + row * (T.h + (T.gapY != null ? T.gapY : 0)), w: T.w, h: T.h }; }
  function storyTarget(cd) {
    if (cd.slot >= 0) { const r = storySlot(cd.slot); return LAY.story.slot.rows ? { x: r.x + 4, y: r.y, w: LAY.story.tray.w, h: r.h } : r; }
    return storyTray(cd.home);
  }
  function snapStory(animate) { snapAll(STORY_C.cards, storyTarget, animate); }
  function resetStory() { STORY_C.cards.forEach((c) => { c.slot = -1; c.ok = false; c.bad = -9; }); STORY_C.done = false; STORY_C.fired = []; snapStory(false); }
  function storySlotAt(p) { for (let i = 0; i < 5; i++) if (inR(p, storySlot(i), 8)) return i; return -1; }
  function placeStory(cd, slot) {
    const other = STORY_C.cards.find((o) => o !== cd && o.slot === slot);
    if (other) { other.slot = cd.slot >= 0 && cd.slot !== slot ? cd.slot : -1; other.ok = false; }
    cd.slot = slot; cd.ok = false; Sound.tick(); snapStory(true);
  }
  function storyCheck() {
    const empty = STORY_C.cards.filter((c) => c.slot < 0).length;
    if (empty) return '아직 놓지 않은 카드가 ' + empty + '장 있어요. 5장을 모두 칸에 놓아 주세요.';
    const wrong = STORY_C.cards.filter((c) => c.slot !== c.idx);
    if (wrong.length) {
      if (MANUAL) {
        const t = now();
        wrong.forEach((c) => { c.bad = t; });
        setTimeout(() => { wrong.forEach((c) => { c.slot = -1; }); snapStory(true); }, 650);
      }
      return '빨간 카드 ' + wrong.length + '장이 알맞지 않아요. 변이가 먼저 있어야 환경에 알맞은 개체가 살아남을 수 있어요. 앞에서 한 실험을 떠올려 보세요.';
    }
    if (MANUAL) { STORY_C.done = true; STORY_C.t0 = now(); STORY_C.fired = [false, false, false, false, false, false]; STORY_C.cards.forEach((c) => { c.ok = true; }); Sound.tone(660, 0.12, 'triangle', 0.08); }
    return true;
  }
  function storyCenter(i) { const r = storySlot(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  const STORY_HOP = 0.6;
  function drawStoryFace(cd, w, h) {
    if (!TALL) {
      ctx.save(); ctx.translate(w / 2, 56); artStory(ctx, cd.icon, now(), 0.82); ctx.restore();
      para(cd.text, 12, 122, w - 24, { size: 14.5, weight: 800, color: '#1e293b', lh: 19, align: 'left' });
    } else {
      ctx.save(); ctx.translate(40, h / 2); artStory(ctx, cd.icon, now(), 0.6); ctx.restore();
      para(cd.text, 78, h / 2 - 22, w - 86, { size: 13.5, weight: 800, color: '#1e293b', lh: 17 });
    }
  }
  function drawStoryScene(t) {
    const L = LAY.story;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f2f8ec'); g.addColorStop(1, '#e0eed6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const T = STORY_C.done ? now() - STORY_C.t0 : -1;
    if (!TALL) {
      pill('🌱 생물다양성은 이렇게 만들어져요', 16, 30, { size: 15, align: 'left', bg: '#dcfce7', color: '#166534', pad: 12 });
      const y = L.arrowY;
      ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.setLineDash([2, 8]);
      ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(736, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(756, y); ctx.lineTo(738, y - 8); ctx.lineTo(738, y + 8); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(46, y, 4, 0, TAU); ctx.fill(); ctx.restore();
      txt('먼저', 48, y - 12, { size: 13.5, weight: 800, color: '#64748b' }); txt('나중', 756, y - 12, { size: 13.5, weight: 800, color: '#64748b', align: 'right' });
    }
    const hot = (() => { const d = S.drag; if (!d || d.set !== 'story' || d.px == null) return -1; return storySlotAt({ x: d.px, y: d.py }); })();
    for (let i = 0; i < 5; i++) {
      const r = storySlot(i);
      ctx.save();
      if (STORY_C.done) { const a = clamp((T - i * 0.2) / 0.4, 0, 1); rr(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = 'rgba(34,197,94,' + (0.1 * a).toFixed(3) + ')'; ctx.fill(); }
      ctx.setLineDash([7, 6]); ctx.strokeStyle = hot === i ? '#16a34a' : '#b8c4d4'; ctx.lineWidth = hot === i ? 3 : 1.8; rr(r.x, r.y, r.w, r.h, 16); ctx.stroke(); ctx.setLineDash([]);
      if (hot === i) { ctx.fillStyle = 'rgba(34,197,94,.1)'; rr(r.x, r.y, r.w, r.h, 16); ctx.fill(); }
      ctx.restore();
      if (!STORY_C.cards.some((c) => c.slot === i)) txt(String(i + 1), TALL ? r.x + 34 : r.x + r.w / 2, TALL ? r.y + r.h / 2 + 2 : r.y + r.h / 2 + 10, { size: TALL ? 28 : 46, weight: 800, color: '#cbd5e1', align: 'center', base: 'middle' });
      if (STORY_C.done) { const a = clamp((T - i * 0.2) / 0.35, 0, 1); ctx.save(); ctx.translate(TALL ? r.x + r.w - 40 : r.x + r.w / 2, TALL ? r.y + r.h / 2 : r.y + r.h + 20); ctx.scale(EASE.outBack(a), EASE.outBack(a)); pill(String(i + 1) + '단계', 0, 0, { size: 15, bg: '#16a34a', color: '#fff', pad: 12, h: 28, shadow: true }); ctx.restore(); }
      if (!TALL && i < 4) { const ax = r.x + r.w + L.slot.gap / 2, ay = r.y + r.h / 2; ctx.fillStyle = '#a8b5c4'; ctx.beginPath(); ctx.moveTo(ax - 4, ay - 7); ctx.lineTo(ax + 5, ay); ctx.lineTo(ax - 4, ay + 7); ctx.closePath(); ctx.fill(); }
    }
    if (!STORY_C.done && !STORY_C.cards.every((c) => c.slot >= 0)) txt('🃏 카드 (섞여 있어요)', TALL ? 12 : 22, L.tray.y - 10, { size: 13.5, weight: 800, color: '#64748b' });
    const dragCd = S.drag && S.drag.set === 'story' ? S.drag.card : null;
    STORY_C.cards.forEach((cd) => { if (cd !== dragCd) cardFrame(cd, t, null, (w, h) => drawStoryFace(cd, w, h)); });
    if (dragCd) cardFrame(dragCd, t, null, (w, h) => drawStoryFace(dragCd, w, h));
    // 이어지는 빛 (한 단계씩 다음으로)
    if (STORY_C.done && T < 0.9 + 4 * STORY_HOP + 0.3) {
      for (let h = 0; h < 4; h++) {
        const u = (T - 0.9 - h * STORY_HOP) / STORY_HOP;
        const a = storyCenter(h), b = storyCenter(h + 1);
        if (u > 0 && u < 1) { const e = EASE.inOutCubic(u); const x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e) - Math.sin(e * Math.PI) * (TALL ? 0 : 36); D.glow(x, y, 26, '#fde047', 0.85); D.sphere(x, y, 7, '#facc15', { gloss: true }); }
        if (u >= 1 && !STORY_C.fired[h]) { STORY_C.fired[h] = true; const cd = STORY_C.cards.find((c) => c.slot === h + 1); if (cd) cd.pop = now(); burst(b.x, b.y, ['#fde047', '#86efac', '#ffffff'], 12, { speed: 120, life: 0.7 }); Sound.tone(520 + h * 110, 0.1, 'triangle', 0.07); }
      }
      if (T > 0.9 + 4 * STORY_HOP && !STORY_C.fired[5]) { STORY_C.fired[5] = true; const b = storyCenter(4); burst(b.x, b.y, null, 36, { speed: 190, life: 1 }); Sound.success(); }
    }
    // 설명 상자
    const C = L.cap;
    panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: STORY_C.done ? '#86efac' : '#e2e8f0', bw: STORY_C.done ? 2 : 1.5 });
    if (!STORY_C.done) {
      para('💡 변이가 있어야 환경에 알맞은 개체가 있을 수 있어요. 어떤 일이 먼저 일어날까요?', C.x + 16, C.y + (TALL ? 30 : 28), C.w - 32, { size: TALL ? 14.5 : 16, weight: 800, color: '#475569', lh: 22 });
    } else if (T > 0.9 + 4 * STORY_HOP) {
      para('변이가 있는 무리에서 환경에 알맞은 개체가 더 많이 살아남아 자손을 남기고, 이것이 오랜 시간 쌓이면 서로 다른 생물이 생겨 생물다양성이 커져요.', C.x + 16, C.y + (TALL ? 28 : 26), C.w - 32, { size: TALL ? 14 : 15.5, weight: 800, color: '#166534', lh: TALL ? 20 : 22 });
    } else txt('단계마다 이어지는 모습을 살펴봐요…', C.x + 16, C.y + C.h / 2 + 1, { size: 15.5, weight: 800, color: '#64748b', base: 'middle' });
    if (isNew('story')) { const a = storySlot(0), b = storySlot(4); newRing({ x: a.x, y: a.y, w: b.x + b.w - a.x, h: b.y + b.h - a.y }, 16); }
  }

  /* =========================================================
     장면 전환 · 안내 말풍선 · 입력
     ========================================================= */
  const SCENE_LABEL = { div: '🌍 생물다양성의 세 가지 살펴보기', bugs: '🐞 같은 종의 변이 관찰하기', isl: '🐦 환경에 따라 달라지는 부리', story: '🌱 생물다양성이 생기는 과정' };
  const SCENE_BG = { div: 'linear-gradient(180deg,#eef7f1,#dcebe2)', bugs: 'linear-gradient(180deg,#eef7f1,#dcebe2)', isl: 'linear-gradient(180deg,#eaf4f9,#d9e8ef)', story: 'linear-gradient(180deg,#f2f8ec,#e0eed6)' };
  let snapCv = null;
  function setView(scene, instant) {
    if (S.scene === scene) { updateSceneUI(); return; }
    if (!instant && !RM && view && view.canvas.width > 2) {
      if (!snapCv) snapCv = document.createElement('canvas');
      snapCv.width = view.canvas.width; snapCv.height = view.canvas.height;
      snapCv.getContext('2d').drawImage(view.canvas, 0, 0);
      S.snapOK = true;
    } else S.snapOK = false;
    S.prevKey = S.scene; S.scene = scene; S.sceneT0 = now(); S.drag = null;
    updateSceneUI(); hideHint();
  }
  function drawView(key, t) {
    if (key === 'div') drawDivScene(t); else if (key === 'bugs') drawBugsScene(t); else if (key === 'isl') drawIslScene(t); else drawStoryScene(t);
  }
  function draw(t) {
    view.clear(BG);
    const key = S.scene;
    const p = S.snapOK ? clamp((now() - S.sceneT0) / 0.75, 0, 1) : 1;
    if (p < 1) {
      const fwd = VIEW_ORDER.indexOf(key) > VIEW_ORDER.indexOf(S.prevKey);
      const e = EASE.inOutCubic(p);
      const s1 = fwd ? 0.84 + 0.16 * EASE.outCubic(p) : 1.1 - 0.1 * EASE.outCubic(p);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s1, s1); ctx.translate(-W / 2, -H / 2); drawView(key, t); ctx.restore();
      const s0 = fwd ? 1 + 1.5 * e : 1 - 0.18 * e;
      ctx.save(); ctx.globalAlpha = 1 - EASE.inQuad(p); ctx.translate(W / 2, H / 2); ctx.scale(s0, s0); ctx.translate(-W / 2, -H / 2); ctx.drawImage(snapCv, 0, 0, W, H); ctx.restore();
    } else { drawView(key, t); drawHint(); }
    PFX.draw(ctx);
  }
  const HINT = { msg: '', t0: 0, tEnd: 0 };
  function showHint(msg, ms) { HINT.msg = msg; HINT.t0 = now(); HINT.tEnd = now() + (ms || 6000) / 1000; }
  function hideHint() { if (HINT.msg && HINT.tEnd > now()) HINT.tEnd = now(); }
  function drawHint() {
    if (!HINT.msg) return;
    const hp = LAY[S.scene] && LAY[S.scene].hint;
    if (!hp) return;
    const t = now(), inA = clamp((t - HINT.t0) / 0.35, 0, 1), a = Math.min(inA, clamp(1 - (t - HINT.tEnd) / 0.4, 0, 1));
    if (a <= 0.01) { if (t > HINT.tEnd + 0.5) HINT.msg = ''; return; }
    const size = 14, padX = 14, lh = 19, ls = lines(HINT.msg, hp.maxW - padX * 2, size, 800);
    ctx.save(); ctx.font = font(size, 800);
    let tw = 0; ls.forEach((ln) => { tw = Math.max(tw, ctx.measureText(ln).width); });
    const w = tw + padX * 2, h = ls.length * lh + 10, x = hp.x - w / 2, y = hp.y - h / 2 + (1 - EASE.outCubic(inA)) * 8;
    ctx.globalAlpha = a; ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, Math.min(h / 2, 18)); ctx.fillStyle = 'rgba(27,35,51,.9)'; ctx.fill(); ctx.shadowColor = 'transparent';
    ls.forEach((ln, i) => txt(ln, x + w / 2, y + 5 + lh / 2 + i * lh, { size, weight: 800, color: '#fff', align: 'center', base: 'middle' }));
    ctx.restore();
  }
  function interactiveAt(p) {
    if (S.scene === 'div') return !S.divDone && !!cardAt(TAGS, p) || [0, 1, 2].some((i) => inR(p, cardRect(i)));
    if (S.scene === 'bugs') return !!bugAt(p);
    if (S.scene === 'isl') return S.hasEnvBtn && !ISL.envChanged && inR(p, envBtnRect());
    return !STORY_C.done && !!cardAt(STORY_C.cards, p);
  }
  const handlers = {
    hover(p) {
      if (S.scene === 'div') return !S.divDone && cardAt(TAGS, p) ? 'grab' : [0, 1, 2].some((i) => inR(p, cardRect(i))) ? 'pointer' : null;
      if (S.scene === 'bugs') { const b = bugAt(p); LADYBUGS.forEach((q) => { q.hov = q === b; }); return b ? 'pointer' : null; }
      if (S.scene === 'isl') return S.hasEnvBtn && !ISL.envChanged && inR(p, envBtnRect()) ? 'pointer' : null;
      return !STORY_C.done && cardAt(STORY_C.cards, p) ? 'grab' : null;
    },
    down(p) {
      hideHint();
      if (S.scene === 'div') {
        if (!S.divDone) { const tg = cardAt(TAGS, p); if (tg) return dragSetup(tg, 'div', TAGS, p); }
        for (let i = 0; i < 3; i++) if (inR(p, cardRect(i))) { selectDiv(i); break; }
        return false;
      }
      if (S.scene === 'bugs') { const b = bugAt(p); if (b) recordBug(b); return false; }
      if (S.scene === 'isl') { if (S.hasEnvBtn && !ISL.envChanged && inR(p, envBtnRect())) envChange(); return false; }
      if (!STORY_C.done) { const cd = cardAt(STORY_C.cards, p); if (cd) return dragSetup(cd, 'story', STORY_C.cards, p); }
      return false;
    },
    move(p) {
      const d = S.drag; if (!d) return;
      d.card.x = p.x - d.dx; d.card.y = p.y - d.dy; d.px = p.x; d.py = p.y;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 6) d.moved = true;
    },
    up(p) {
      const d = S.drag; if (!d) return;
      S.drag = null;
      const cd = d.card;
      if (d.set === 'div') { const s = divSlotAt(p); if (s >= 0) placeTag(cd, s); else { cd.slot = -1; snapTags(true); if (d.moved) Sound.tick(); } }
      else { const s = storySlotAt(p); if (s >= 0) placeStory(cd, s); else { cd.slot = -1; snapStory(true); if (d.moved) Sound.tick(); } }
    },
  };

  /* =========================================================
     HTML 조작 · 상태 갱신
     ========================================================= */
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.scene); }));
  function updateSceneUI() {
    if (view) view.wrap.style.setProperty('--stage-bg', SCENE_BG[S.scene]);
    $$('#sceneSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.scene === S.scene); b.setAttribute('aria-selected', b.dataset.scene === S.scene ? 'true' : 'false'); });
    $('#ctrlCard').hidden = S.scene !== 'isl';
    $('#resetBtn').hidden = S.scene !== 'isl';
    const seg = $('#sceneSeg');
    $('#sceneLabel').hidden = !!(seg && !seg.hidden);
    $('#sceneLabel').textContent = SCENE_LABEL[S.scene];
  }
  function update(dt, t) {
    [TAGS, STORY_C.cards].forEach((list) => list.forEach((cd) => { cd.lift = SciSim.approach(cd.lift, S.drag && S.drag.card === cd ? 1 : 0, dt, 14); }));
    updateBugFlights();
    updateGen(dt); smoothIsl(dt);
    PFX.update(dt);
  }

  /* =========================================================
     퀴즈 그림
     ========================================================= */
  const FIG_BUGS = (function () {
    const bug = (x, y, c) => '<g transform="translate(' + x + ' ' + y + ')"><ellipse cx="0" cy="1" rx="7.5" ry="10" fill="' + c + '" stroke="#2b2b2b" stroke-width="1.2"/><circle cx="0" cy="-10" r="4.2" fill="#2b2b2b"/><line x1="0" y1="-8" x2="0" y2="11" stroke="#2b2b2b" stroke-width=".9"/></g>';
    const grp = (cols, label, x0) => {
      let g = '<g transform="translate(' + x0 + ' 0)"><rect x="0" y="0" width="134" height="76" rx="10" fill="#cfe9bb" stroke="#9fcb86"/>';
      cols.forEach((c, i) => { g += bug(20 + (i % 3) * 47, 24 + Math.floor(i / 3) * 30, c); });
      return g + '<text x="67" y="94" text-anchor="middle" font-size="13.5" font-weight="800" fill="#334155">' + label + '</text></g>';
    };
    return '<svg viewBox="0 0 284 104" width="284" height="104" role="img" aria-label="A 무리는 초록·갈색·노랑 곤충, B 무리는 모두 노란 곤충">' +
      grp(['#4caf50', '#8d6e3f', '#f9c21a', '#4caf50', '#8d6e3f', '#f9c21a'], 'A 무리: 색이 다양해요', 0) +
      grp(['#f9c21a', '#f9c21a', '#f9c21a', '#f9c21a', '#f9c21a', '#f9c21a'], 'B 무리: 모두 노란색', 150) + '</svg>';
  })();

  /* =========================================================
     단계와 미션
     ========================================================= */
  const mark = (ok) => (ok ? '✅' : '⬜');
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '생물다양성의 세 가지', short: '다양성', icon: '🌍', phase: '관찰',
      features: ['div'],
      intro: '<p class="si-q">❓ 탐구 질문: 같은 종류의 생물인데 왜 생김새가 조금씩 다를까?</p>' +
        '<p>세상에는 아주 다양한 생물이 살아요. 세 장면을 살펴보고, <b>생물다양성</b>에는 어떤 종류가 있는지 알아봐요.</p>',
      setup() { setView('div', true); },
      recap: '생물다양성에는 <b>유전적 다양성</b>, <b>종 다양성</b>, <b>생태계 다양성</b>이 있어요.',
      summary: '<ul><li><b>생물다양성</b>: 일정한 지역에 사는 생물이 다양한 정도</li>' +
        '<li><b>유전적 다양성</b>: 같은 종 안에서도 형질(생김새, 색 등)이 다양한 것 (예: 바지락 껍데기 무늬)</li>' +
        '<li><b>종 다양성</b>: 여러 종의 생물이 사는 것 (예: 여러 종의 곤충)</li>' +
        '<li><b>생태계 다양성</b>: 숲, 갯벌, 사막처럼 여러 생태계가 있는 것</li></ul>',
      missions: [
        {
          title: '세 장면 살펴보기',
          goal: '세 장면을 하나씩 눌러서 어떤 생물이 있는지 살펴보세요.',
          hint: '장면 1은 바지락, 장면 2는 숲·갯벌·사막, 장면 3은 여러 곤충이에요. 카드를 눌러 보세요.',
          setup() { setView('div'); resetDiv(); showHint('👆 장면을 하나씩 눌러 보세요', 5500); },
          check: () => [0, 1, 2].every((i) => S.divSeen[i]),
          hold: 0.5,
          status: () => DIV_SCENES.map((s, i) => mark(!!S.divSeen[i]) + ' ' + s.title).join(' · '),
          explain: '장면 1은 <b>같은 종</b>(바지락) 안의 다양함, 장면 2는 <b>여러 생태계</b>, 장면 3은 <b>여러 종</b>의 곤충이에요.',
        },
        {
          title: '생물다양성의 종류 분류하기',
          manual: true,
          goal: '<b>이름표</b>를 끌어 알맞은 장면의 칸에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '같은 종 안의 다양함 → 유전적 다양성, 여러 종 → 종 다양성, 여러 생태계 → 생태계 다양성이에요.',
          setup() { setView('div'); TAGS.forEach((t) => { t.slot = -1; t.ok = false; t.bad = -9; }); S.divDone = false; snapTags(false); showHint('🏷️ 이름표를 끌어 알맞은 칸에 놓아요', 5500); },
          status: () => '놓은 이름표: <b>' + TAGS.filter((t) => t.slot >= 0).length + ' / 3</b>',
          check() { return divCheck(); },
          explain: '바지락처럼 같은 종 안에서 형질이 다양한 것은 <b>유전적 다양성</b>, 여러 종의 곤충이 사는 것은 <b>종 다양성</b>, 숲·갯벌·사막처럼 환경이 다른 곳이 많은 것은 <b>생태계 다양성</b>이에요.',
        },
        {
          type: 'quiz',
          title: '생물다양성 바르게 알기',
          goal: '생물다양성에 대한 설명으로 <b>옳은</b> 것은?',
          setup() { setView('div'); },
          choices: [
            '같은 종 안에서 형질이 다양한 것을 유전적 다양성이라고 한다',
            '종 다양성은 한 종 안에서 형질이 다양한 정도이다',
            '생태계 다양성은 한 지역에 사는 생물의 종류가 많은 것이다',
            '사는 생물의 수가 많을수록 생물다양성이 높다',
          ],
          answer: 0,
          feedback: [
            '',
            '한 종 안의 다양함은 유전적 다양성이에요. 종 다양성은 여러 종이 사는 것이에요.',
            '생물의 종류가 많은 것은 종 다양성이에요. 생태계 다양성은 숲·갯벌·사막처럼 여러 생태계가 있는 것이에요.',
            '생물다양성은 생물의 수가 아니라, 사는 생물이 얼마나 다양한지를 말해요.',
          ],
          explain: '<b>유전적 다양성</b>은 같은 종 안의 형질이 다양한 것, <b>종 다양성</b>은 여러 종이 사는 것, <b>생태계 다양성</b>은 여러 생태계가 있는 것이에요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '같은 종 안의 변이 관찰하기', short: '변이', icon: '🐞', phase: '탐구',
      features: ['bugs'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 종(바지락)인데도 무늬가 서로 다른 것을 보았어요. 이것이 <b>유전적 다양성</b>이에요.</div>' +
        '<p>같은 종의 개체들은 어떤 점이 서로 다를까요? <b>무당벌레 30마리</b>를 관찰하고, 날개의 <b>점 개수</b>를 막대그래프로 나타내 봐요.</p>',
      setup() { setView('bugs', true); },
      recap: '같은 종의 개체 사이에 나타나는 형질의 차이를 <b>변이</b>라고 해요.',
      summary: '<ul><li><b>변이</b>: 같은 종의 개체 사이에 나타나는 형질의 차이 (예: 무당벌레의 날개 점 개수, 색)</li>' +
        '<li>같은 종이어도 개체마다 형질이 조금씩 달라요. 변이는 유전적 다양성의 바탕이에요.</li>' +
        '<li>무당벌레와 나비처럼 <b>다른 종끼리의 차이</b>는 변이가 아니에요.</li></ul>',
      missions: [
        {
          title: '무당벌레 20마리 이상 기록하기',
          goal: '무당벌레를 눌러 <b>날개의 점 개수</b>를 그래프에 기록해요. <b>20마리 이상</b> 기록해 보세요.',
          hint: '무당벌레를 하나씩 눌러 보세요. 점이 몇 개인지에 따라 막대그래프가 차곡차곡 쌓여요.',
          setup() { setView('bugs'); resetBugs(); layoutBugs(); showHint('🐞 무당벌레를 눌러 그래프에 기록해요', 6000); },
          check: () => S.recN >= 20,
          hold: 0.6,
          status: () => '기록한 무당벌레: <b>' + S.recN + '</b> / 20마리 ' + mark(S.recN >= 20),
          explain: '같은 종(무당벌레)인데도 날개의 점 개수와 색이 서로 달라요. 이렇게 같은 종의 개체 사이에 나타나는 형질의 차이를 <b>변이</b>라고 해요.',
        },
        {
          type: 'quiz',
          title: '변이란?',
          goal: '다음 중 <b>변이</b>에 해당하는 것은?',
          setup() { setView('bugs'); },
          choices: [
            '무당벌레와 나비의 생김새 차이',
            '같은 종인 무당벌레끼리 날개 점 개수가 다른 것',
            '한 마리 무당벌레가 자라면서 몸이 커지는 것',
            '부모와 자손의 형질이 완전히 똑같은 것',
          ],
          answer: 1,
          feedback: [
            '서로 다른 종끼리의 차이는 변이가 아니에요. 변이는 같은 종 안에서의 차이예요.',
            '',
            '한 개체가 자라는 것은 변이가 아니에요. 변이는 같은 종의 여러 개체 사이의 차이예요.',
            '같은 종의 개체들은 형질이 조금씩 달라요. 이것이 변이예요.',
          ],
          explain: '<b>변이</b>는 같은 종의 개체 사이에 나타나는 형질의 차이예요. 무당벌레끼리 점 개수가 다른 것이 그 예예요.',
        },
      ],
    },
    /* ---------- 3단계 · 실험 ---------- */
    {
      title: '환경에 따라 달라지는 변이', short: '환경과 변이', icon: '🐦', phase: '실험',
      features: ['islands'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 종 안에도 서로 다른 변이가 있다는 것을 알았어요.</div>' +
        '<p>환경이 다르면 어떤 변이를 가진 개체가 더 많이 살아남을까요? <b>같은 새 무리</b>를 두 섬에 보내고, <b>세대</b>를 거듭하면서 부리 두께가 어떻게 달라지는지 지켜봐요.</p>',
      setup() { setView('isl', true); },
      recap: '환경에 알맞은 변이를 가진 개체가 더 많이 살아남아 자손을 남기므로, 섬마다 부리 두께의 분포가 달라져요.',
      summary: '<ul><li>두 섬의 새 무리는 처음에는 부리 두께가 똑같이 다양했다(변이).</li>' +
        '<li><b>A섬</b>(크고 단단한 씨앗) → 두꺼운 부리, <b>B섬</b>(작은 씨앗·곤충) → 얇은 부리를 가진 새가 더 많이 살아남아 자손을 남겼다.</li>' +
        '<li>세대가 거듭되면서 섬마다 부리 두께의 분포가 달라졌다.</li>' +
        '<li>환경이 바뀌면 유리한 변이도 달라진다.</li></ul>',
      missions: [
        {
          title: '20세대 진행하기',
          goal: '<b>▶ 1세대</b>, <b>⏩ 5세대</b> 단추로 두 섬의 새 무리를 <b>20세대</b>까지 진행해 보세요. 부리 두께 분포가 어떻게 달라지는지 살펴봐요.',
          hint: '먹이를 잘 먹은 새가 살아남아 새끼를 낳아요. 그래프의 막대와 평균(▼ 표시)이 어떻게 움직이는지 보세요.',
          setup() { setView('isl'); S.hasEnvBtn = false; if (ISL.gen > 0 && !ISL.envChanged) { /* 그대로 이어서 */ } else resetIsl(); ctrlNote.textContent = '두 섬의 새 무리를 한 세대씩 지켜봐요. 먹이에 맞는 부리를 가진 새가 더 많이 살아남아요.'; updateIslUI(); showHint('▶ 1세대 단추를 눌러 새 무리를 지켜보세요', 6500); },
          check: () => ISL.gen >= 20,
          hold: 0.5,
          status: () => '진행한 세대: <b>' + ISL.gen + ' / 20</b> ' + mark(ISL.gen >= 20),
          explain: '처음에는 두 섬의 새 무리가 똑같았어요. 하지만 A섬(크고 단단한 씨앗)에서는 <b>두꺼운 부리</b>를, B섬(작은 씨앗과 곤충)에서는 <b>얇은 부리</b>를 가진 새가 더 많이 살아남아 자손을 남겼어요.',
        },
        {
          type: 'quiz',
          title: '섬마다 부리가 달라진 까닭',
          goal: '두 섬의 새 무리는 처음에는 똑같았는데, 20세대 뒤에는 부리 두께가 서로 달라졌어요. 그 까닭은?',
          setup() { setView('isl'); S.hasEnvBtn = false; },
          choices: [
            '새들이 먹이를 먹으려고 노력해서 부리가 변했다',
            '섬의 먹이에 알맞은 부리를 가진 새가 더 많이 살아남아 자손을 남겼다',
            '두 섬의 새는 처음부터 서로 다른 종이었다',
            '부리가 두꺼운 새만 자손을 남길 수 있다',
          ],
          answer: 1,
          feedback: [
            '새가 노력한다고 부리가 바뀌지는 않아요. 처음부터 있던 부리 두께의 변이 중에서 먹이에 알맞은 것이 살아남았어요.',
            '',
            '처음에는 두 섬의 새 무리가 똑같았어요. 같은 무리에서 시작했지요?',
            '두꺼운 부리는 A섬에서만 유리했어요. B섬에서는 얇은 부리가 더 유리했어요.',
          ],
          explain: '새 무리에는 처음부터 <b>부리 두께의 변이</b>가 있었어요. 섬의 먹이에 알맞은 변이를 가진 새가 더 많이 살아남아 <b>자손을 남기면서</b>, 섬마다 부리 두께의 분포가 달라졌어요.',
        },
        {
          title: '먹이가 바뀌면?',
          goal: 'A섬에 가뭄이 들어 큰 씨앗이 사라졌어요! <b>먹이 바꾸기</b>를 누르고 <b>10세대 이상</b> 진행해 보세요.',
          hint: '그림 속 주황색 \'먹이 바꾸기\' 단추를 눌러요. 그다음 ▶ 1세대나 ⏩ 5세대로 진행하며 A섬 새들의 부리가 어떻게 달라지는지 보세요.',
          setup() {
            setView('isl');
            if (ISL.gen < 20) { simulateTo(20); toast('이어서 하기 위해 20세대까지 진행된 상태로 준비했어요.'); }
            S.hasEnvBtn = !ISL.envChanged;
            ctrlNote.textContent = '먹이가 바뀌면 어떤 부리가 더 유리할까요? 세대를 진행하며 A섬 새들의 변화를 지켜봐요.';
            updateIslUI(); showHint('🌵 A섬의 \'먹이 바꾸기\' 단추를 눌러 보세요', 7000);
          },
          check: () => ISL.envChanged && sinceEnv() >= 10 && ISL.isl[0].mean < ISL.envMean - 0.08,
          hold: 0.5,
          status: () => mark(ISL.envChanged) + ' 먹이 바꾸기 · 바뀐 뒤 진행한 세대 <b>' + Math.min(sinceEnv(), 99) + ' / 10</b>' + (ISL.envChanged && sinceEnv() >= 10 && ISL.isl[0].mean >= ISL.envMean - 0.08 ? '<br>조금 더 진행해 보세요.' : ''),
          explain: '먹이가 작은 씨앗으로 바뀌자 이번에는 <b>얇은 부리</b>를 가진 새가 더 많이 살아남았어요. 그래서 A섬 새들의 부리가 점점 얇아졌어요. 환경이 달라지면 살아남는 변이도 달라져요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '생물다양성이 생기는 과정', short: '다양성 형성', icon: '🌱', phase: '적용',
      features: ['story'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 섬의 환경에 알맞은 부리를 가진 새가 더 많이 살아남아 자손을 남겼어요.</div>' +
        '<p>이런 일이 오랜 시간 쌓이면 어떻게 생물다양성이 만들어질까요? 과정을 순서대로 정리하고, 여러 사례에 적용해 봐요.</p>',
      setup() { setView('story', true); },
      recap: '같은 종 안의 <b>변이</b> 중 환경에 알맞은 것이 살아남아 자손을 남기고, 오랜 시간 쌓여 <b>생물다양성</b>이 커져요.',
      summary: '<ul><li>다양성이 생기는 과정: 같은 종 안의 <b>변이</b> → 환경에 알맞은 변이를 가진 개체가 <b>더 많이 살아남음</b> → <b>자손을 남김</b> → <b>오랜 시간</b> 쌓임 → 환경에 적응한 서로 다른 생물이 생겨 <b>생물다양성</b>이 커짐</li>' +
        '<li>생물이 노력해서 몸이 변하는 것이 아니라, <b>이미 있던 변이</b> 중에서 환경에 알맞은 것이 살아남는다.</li>' +
        '<li>변이가 다양한 무리에는 환경에 알맞은 변이를 가진 개체가 있을 가능성이 커요.</li></ul>',
      missions: [
        {
          title: '다양성이 생기는 순서 맞추기',
          manual: true,
          goal: '카드 5장을 <b>일어나는 순서</b>대로 칸에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '앞에서 한 실험을 떠올려 봐요. 먼저 무엇이 있어야 환경에 알맞은 개체가 더 많이 살아남을 수 있을까요?',
          setup() { setView('story'); resetStory(); showHint('🃏 카드를 끌어 순서대로 놓아요', 6000); },
          status: () => '놓은 카드: <b>' + STORY_C.cards.filter((c) => c.slot >= 0).length + ' / 5</b>',
          check() { return storyCheck(); },
          explain: '같은 종 안에 <b>변이</b>가 있고, <b>환경에 알맞은 변이</b>를 가진 개체가 더 많이 살아남아 <b>자손을 남겨요</b>. 이런 일이 <b>오랜 시간</b> 반복되면 환경에 적응한 서로 다른 생물이 생겨 <b>생물다양성</b>이 커져요.',
        },
        {
          type: 'quiz',
          title: '기린의 목은 왜 길까?',
          goal: '기린의 목이 길어진 까닭을 바르게 설명한 것은?',
          setup() { setView('story'); },
          choices: [
            '높은 곳의 잎을 먹으려고 목을 계속 늘려서 목이 길어졌다',
            '목이 긴 변이를 가진 기린이 환경에 알맞아 더 많이 살아남아 자손을 남겼다',
            '기린은 처음부터 모두 목 길이가 똑같았다',
            '기린이 필요하다고 생각하면 자손의 목이 길어진다',
          ],
          answer: 1,
          feedback: [
            '노력해서 몸이 변하는 것이 아니에요. 이미 있던 목 길이의 변이 중에서 환경에 알맞은 것이 살아남았어요.',
            '',
            '처음부터 목 길이가 모두 같았다면 변이가 없어서 차이가 생길 수 없어요.',
            '필요하다고 생각한다고 자손의 형질이 바뀌지는 않아요.',
          ],
          explain: '기린의 목 길이에도 <b>변이</b>가 있었어요. 높은 곳의 잎을 먹기에 알맞은 <b>긴 목</b>을 가진 기린이 더 많이 살아남아 자손을 남겼고, 이런 일이 오랜 시간 쌓였어요.',
        },
        {
          type: 'quiz',
          title: '변이가 다양한 무리',
          goal: '초록 풀이 우거진 초원에서 새가 눈에 띄는 곤충을 먼저 잡아먹어요. 오랜 시간이 지난 뒤 더 잘 살아남을 무리는?',
          figure: FIG_BUGS,
          setup() { setView('story'); },
          choices: [
            'A 무리 (환경에 알맞은 초록색 변이를 가진 개체가 있어서)',
            'B 무리 (모두 같은 색이라 서로 도울 수 있어서)',
            '두 무리 모두 똑같이 살아남는다',
            'B 무리 (노란색이 눈에 잘 띄어서)',
          ],
          answer: 0,
          feedback: [
            '',
            '모두 같은 색이면 모두 눈에 띄어 한꺼번에 사라질 수 있어요. 변이가 있어야 환경에 알맞은 개체가 있을 수 있어요.',
            '변이가 다양한 무리와 그렇지 않은 무리는 결과가 달라질 수 있어요.',
            '눈에 잘 띄면 천적에게 먼저 잡아먹혀요.',
          ],
          explain: '변이가 다양한 A 무리에는 <b>초록색처럼 환경에 알맞은 변이</b>를 가진 개체가 있어서, 그 개체가 더 많이 살아남아 자손을 남길 수 있어요. 이렇게 <b>변이</b>는 생물다양성의 바탕이 돼요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작
     ========================================================= */
  function buildStage() {
    const kind = mq && mq.matches ? 'tall' : 'wide';
    if (kind === KIND) return;
    let cv = $('#cv');
    if (view) {
      const fresh = document.createElement('canvas');
      fresh.id = 'cv'; fresh.setAttribute('aria-label', cv.getAttribute('aria-label') || '');
      cv.replaceWith(fresh); cv = fresh;
    }
    KIND = kind; TALL = kind === 'tall';
    W = LAYOUTS[kind].w; H = LAYOUTS[kind].h;
    LAY = computeLayouts();
    S.drag = null; S.snapOK = false;
    view = SciSim.stage(cv, { width: W, height: H, background: BG });
    ctx = view.ctx; D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    if (TALL) {
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => { const tc = e.touches[0]; if (tc && interactiveAt(view.toLocal(tc))) e.preventDefault(); }, { passive: false });
    }
    lineCache.clear();
    snapTags(false); snapStory(false); layoutBugs();
    if (ISL.isl.length) ISL.isl.forEach((is) => { is.birds.concat(is.chicks).forEach((b) => { const h = homePos(is.i, b.k); b.hx = h.x; b.hy = h.y; b.s = h.s; if (!ISL.anim) { b.x = h.x; b.y = h.y; } }); });
    updateSceneUI();
  }
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  resetIsl();
  resetBugs(); resetDiv(); resetStory(); layoutBugs();

  game = SciSim.game({
    simId: 'm1-variation',
    mount: '#game',
    badge: '변이 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      div: '🌍 세 장면 · 생물다양성 이름표',
      bugs: '🐞 무당벌레 30마리 · 막대그래프',
      islands: '🐦 두 섬의 새 무리 · 세대 진행',
      story: '🌱 다양성이 생기는 과정 카드',
    },
    onFeatures(set) { F = new Set(set); updateSceneUI(); },
    onMissionStart() { hideHint(); },
    onComplete() { S.hasEnvBtn = false; updateSceneUI(); },
    levels,
  });
  updateSceneUI();
  updateIslUI();

  // 테스트·점검용
  window.__sim = {
    S, ISL, BUG, LADYBUGS, TAGS, STORY_C, game, setView, LAY: () => LAY, KIND: () => KIND, stepGens, envChange, resetIsl, simulateTo, startGen, sinceEnv,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
    divCardPoint(i) { const r = cardRect(i); return this.toClient(r.x + r.w / 2, r.y + r.h * 0.4); },
    tagPoint(key) { const tg = TAGS.find((q) => q.key === key); return this.toClient(tg.x + tg.w / 2, tg.y + tg.h / 2); },
    divSlotPoint(i) { const r = slotRectD(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    bugPoint(id) { const b = LADYBUGS[id]; return this.toClient(b.hx, b.hy); },
    envBtnPoint() { const b = envBtnRect(); return this.toClient(b.x + b.w / 2, b.y + b.h / 2); },
    storyCardPoint(idx) { const cd = STORY_C.cards.find((c) => c.idx === idx); return this.toClient(cd.x + cd.w / 2, cd.y + cd.h / 2); },
    storySlotPoint(i) { const r = storySlot(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    DIV_SCENES,
  };

  SciSim.loop((dt, t) => {
    update(dt, t);
    draw(t);
  });
})();
