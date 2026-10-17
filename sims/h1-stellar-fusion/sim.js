/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 별 속의 핵융합 (단원 3차시)
   성취기준 [10통과1-02-02] 우주 초기의 원소들로부터 태양계의 재료이면서 생명체를 구성하는 원소들이
   형성되는 과정을 통해 지구와 생명의 역사가 우주 역사의 일부분임을 해석할 수 있다.
   ① 관찰: 별의 일생 (질량에 따른 색 · 크기 · 수명)
   ② 모형: 수소 핵융합 (중심핵 확대 · 온도 · 질량 저울)
   ③ 탐구: 무거운 별 (양파 껍질 구조 · 철 핵)
   ④ 확인: 원소의 고향 (분류)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 780 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- 배치 ---------- */
  const LIFE = PHONE ? {
    sky: { x: 8, y: 8, w: 584, h: 330 }, c: { x: 300, y: 150 }, rs: 0.8, trackY: 296, chart: { x: 8, y: 350, w: 584, h: 214 },
  } : {
    sky: { x: 12, y: 8, w: 776, h: 372 }, c: { x: 400, y: 172 }, rs: 1, trackY: 336, chart: { x: 12, y: 392, w: 776, h: 158 },
  };
  const CORE = PHONE ? {
    c: { x: 300, y: 262 }, R: 252, bal: { x: 8, y: 530, w: 584, h: 240 }, pivot: { x: 300, y: 590 }, L: 130,
  } : {
    c: { x: 290, y: 284 }, R: 246, bal: { x: 548, y: 8, w: 240, h: 544 }, pivot: { x: 668, y: 190 }, L: 84,
  };
  const ONION = PHONE ? {
    c: { x: 300, y: 224 }, R: 200, leg: { x: 8, y: 440, w: 584, h: 332 },
  } : {
    c: { x: 262, y: 284 }, R: 236, leg: { x: 510, y: 8, w: 278, h: 544 },
  };
  const BINS = [
    { id: 0, icon: '💥', title: '빅뱅', sub: '우주 초기 약 3분', col: '#38bdf8' },
    { id: 1, icon: '⭐', title: '별 속 핵융합', sub: '태양 정도의 별도 가능', col: '#fbbf24' },
    { id: 2, icon: '🌟', title: '큰 별의 중심핵', sub: '태양 질량 약 8배 이상', col: '#a78bfa' },
    { id: 3, icon: '🌠', title: '초신성 폭발', sub: '철보다 무거운 원소', col: '#f472b6' },
  ];
  function binRect(i) {
    if (PHONE) return { x: 8 + (i % 2) * 296, y: 8 + Math.floor(i / 2) * 184, w: 288, h: 176 };
    return { x: 12 + i * 196, y: 12, w: 186, h: 330 };
  }
  const BIN_CW = PHONE ? 84 : 82, BIN_CH = PHONE ? 44 : 46;
  function poolRect(k) {
    if (PHONE) return { x: 8 + 70 + (k % 4) * 148, y: 432 + Math.floor(k / 4) * 62, w: 140, h: 52 };
    return { x: 166 + (k % 4) * 156, y: 400 + Math.floor(k / 4) * 66, w: 148, h: 56 };
  }

  /* ---------- 자료 ---------- */
  const MASS = {
    0.5: { r: 34, col: '#ff8a4c', life: '약 700억 년', tag: '붉은색', temp: '낮음', lg: 10.85 },
    1: { r: 50, col: '#ffd34d', life: '약 100억 년', tag: '노란색', temp: '중간', lg: 10 },
    8: { r: 82, col: '#cfe0ff', life: '약 4천만 년', tag: '청백색', temp: '높음', lg: 7.6 },
    20: { r: 106, col: '#8fb4ff', life: '약 1천만 년', tag: '푸른색', temp: '매우 높음', lg: 7 },
  };
  const MKEYS = [0.5, 1, 8, 20];
  const LAYERS = [
    { name: '수소 층', prod: '수소 → 헬륨', col: '#60a5fa' },
    { name: '헬륨 층', prod: '헬륨 → 탄소·산소', col: '#fde68a' },
    { name: '탄소 층', prod: '탄소 → 네온·마그네슘', col: '#34d399' },
    { name: '네온·산소 층', prod: '네온·산소 → 규소·황', col: '#fb923c' },
    { name: '규소 층', prod: '규소 → 철', col: '#a78bfa' },
    { name: '철 핵', prod: '핵융합이 멈춰요', col: '#d1d5db' },
  ];
  const RR = [1.0, 0.82, 0.64, 0.47, 0.31, 0.17];
  const STN = ['① 수소 연소', '② 헬륨 연소', '③ 탄소 연소', '④ 네온·산소 연소', '⑤ 규소 연소', '⑥ 철 핵 완성'];
  const TIME20 = ['약 1천만 년', '약 1백만 년', '약 수백 년', '약 1년', '약 1일', '—'];
  const ANS_OPT = ['?', '헬륨', '탄소·산소', '네온·마그네슘', '규소', '철'];
  const ANS_OK = { 1: 2, 8: 5, 20: 5 };
  const ELCARDS = [
    { id: 'H', sym: 'H', name: '수소', col: '#60a5fa', bin: 0 }, { id: 'He', sym: 'He', name: '헬륨', col: '#fde68a', bin: 0 },
    { id: 'C', sym: 'C', name: '탄소', col: '#34d399', bin: 1 }, { id: 'N', sym: 'N', name: '질소', col: '#38bdf8', bin: 1 },
    { id: 'O', sym: 'O', name: '산소', col: '#f87171', bin: 1 }, { id: 'Si', sym: 'Si', name: '규소', col: '#a78bfa', bin: 2 },
    { id: 'Fe', sym: 'Fe', name: '철', col: '#cbd5e1', bin: 2 }, { id: 'Au', sym: 'Au', name: '금', col: '#fbbf24', bin: 3 },
  ];
  const TIPS = {
    H: '수소는 우주 초기(빅뱅 후 약 3분)에 만들어졌어요.', He: '헬륨의 대부분은 우주 초기에 만들어졌어요.',
    C: '탄소는 별 속의 헬륨 핵융합으로 만들어져요. 태양 정도의 별에서도 가능해요.', N: '질소는 별 속에서 탄소·산소 위에서 일어나는 수소 핵융합으로 만들어져요.',
    O: '산소는 별 속의 헬륨 핵융합으로 만들어져요. 태양 정도의 별에서도 가능해요.', Si: '규소는 질량이 큰 별의 중심핵에서만 만들어져요.',
    Fe: '철은 질량이 큰 별의 중심핵에서 마지막으로 만들어져요.', Au: '철보다 무거운 금은 초신성 폭발에서 만들어져요.',
  };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'life', t: 0, fade: 0,
    // 별의 일생
    mass: 1, birth: 0, msReached: false, massSeen: new Set(), seenT: 0, rad: 0, col: { r: 185, g: 28, b: 28 }, flash: 0, ignited: false,
    // 핵융합
    T: 5, cl: [], heCount: 0, spawnT: 0, sparks: [], balPressed: false, balAng: 0, balShow: 0, fusedFlash: 0, foundFirst: false,
    // 양파
    m3: 20, st: 0, lr: [1, 0, 0, 0, 0, 0], ans: { 1: 0, 8: 0, 20: 0 }, ansBad: {}, maxSt: { 1: 0, 8: 0, 20: 0 }, reached20: false,
    // 분류
    cards: [], bins: [], drag: null, originOK: 0,
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));
  const stepNo = () => (game ? game.level : 0);

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#070b1a' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FS = PHONE ? 1.2 : 1;
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const font = (n, w) => D.font(n, w || 700);
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function wrap(text, maxW, size, weight) {
    ctx.font = font(size, weight || 600);
    const out = []; let line = '';
    text.split(' ').forEach((w) => { const tr = line ? line + ' ' + w : w; if (ctx.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr; });
    if (line) out.push(line);
    return out;
  }
  function paragraph(text, x, y, maxW, size, color, lh, weight) {
    const ls = wrap(text, maxW, size, weight);
    ls.forEach((s, i) => D.text(x, y + i * (lh || size * 1.45), s, { size, color, align: 'left', weight: weight || 600 }));
    return ls.length * (lh || size * 1.45);
  }
  function panel(r, title, a) {
    ctx.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.07 : a) + ')'; rr(r.x, r.y, r.w, r.h, 14).fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.2; rr(r.x, r.y, r.w, r.h, 14).stroke();
    if (title) D.text(r.x + 14, r.y + 24, title, { size: 15, color: '#e6ecff', align: 'left', weight: 800 });
  }
  const BGS = (() => { const r = rng(31); return Array.from({ length: 80 }, () => ({ x: r() * VW, y: r() * VH, s: 0.4 + r() * 1.2, p: r() * 6 })); })();
  function drawBg(t) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#070b1a'); g.addColorStop(1, '#0d1633'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    BGS.forEach((s) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.14 + 0.14 * Math.sin(t * 1.3 + s.p)) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 6.3); ctx.fill(); });
  }
  const hexRgb = (h) => SciSim.color.hexToRgb(h);
  const rgbStr = (c) => 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')';

  /* ======================================================
     장면 1: 별의 일생
     ====================================================== */
  const CLOUD = (() => { const r = rng(7); return Array.from({ length: 220 }, () => ({ a: r() * 6.28, d: Math.sqrt(r()), s: 0.8 + r() * 1.8, w: 0.2 + r() * 0.5, c: r() })); })();
  function lifeRadius() { return MASS[S.mass].r * LIFE.rs; }
  function stepLife(dt) {
    const prev = S.birth;
    S.birth = Math.min(1, S.birth + dt / 6.5);
    if (prev < 0.6 && S.birth >= 0.6) {
      S.ignited = true; S.flash = 1; Sound.success();
      parts.burst(LIFE.c.x, LIFE.c.y, { count: 34, speed: 280, size: 4, life: 1.1, colors: ['#fff7c2', '#fde68a', '#fb923c', '#fff'], gravity: 0 });
      S.rad = 20 * LIFE.rs;
    }
    const b = S.birth;
    if (b < 0.6) { S.rad = b > 0.36 ? (12 + 16 * smooth((b - 0.36) / 0.24)) * LIFE.rs : 0; S.col = { r: 185, g: 28, b: 28 }; }
    else {
      S.rad = RM ? lifeRadius() : SciSim.approach(S.rad, lifeRadius(), dt, 4);
      const tc = hexRgb(MASS[S.mass].col);
      S.col.r = SciSim.approach(S.col.r, tc.r, dt, 3.5); S.col.g = SciSim.approach(S.col.g, tc.g, dt, 3.5); S.col.b = SciSim.approach(S.col.b, tc.b, dt, 3.5);
    }
    if (b >= 0.78) {
      S.msReached = true; S.seenT += dt;
      if (S.seenT > 0.9) S.massSeen.add(S.mass);
    }
    S.flash = Math.max(0, S.flash - dt * 2);
  }
  function restartBirth() { S.birth = 0; S.rad = 0; S.ignited = false; S.seenT = 0; S.col = { r: 185, g: 28, b: 28 }; }
  function drawLife(t) {
    const sk = LIFE.sky, c = LIFE.c, b = S.birth;
    ctx.save(); rr(sk.x, sk.y, sk.w, sk.h, 16).clip();
    D.space(sk.x, sk.y, sk.w, sk.h, t, { stars: 80, top: '#13204a', bottom: '#050813' });
    // 가스 구름 수축
    if (b < 0.66) {
      const cr = (PHONE ? 130 : 170) * (1 - 0.62 * smooth(b / 0.4)) * (b > 0.5 ? 1 - (b - 0.5) / 0.16 : 1) + (b > 0.5 ? 0 : 0);
      const al = b < 0.5 ? 1 : clamp(1 - (b - 0.5) / 0.16, 0, 1);
      D.glow(c.x, c.y, cr * 1.5, '#6366f1', 0.28 * al);
      CLOUD.forEach((p) => {
        const a = p.a + t * p.w * (1 + b * 3), d = p.d * cr;
        ctx.fillStyle = p.c < 0.5 ? 'rgba(165,180,252,' + 0.65 * al + ')' : 'rgba(244,168,200,' + 0.6 * al + ')';
        ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.8, p.s, 0, 6.3); ctx.fill();
      });
    }
    // 별
    if (S.rad > 1) {
      const col = rgbStr(S.col), hex = '#' + [S.col.r, S.col.g, S.col.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
      const r = S.rad, pulse = 1 + 0.03 * Math.sin(t * 3);
      D.glow(c.x, c.y, r * 3.2 * pulse, hex, 0.5);
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + t * 0.1, l1 = r * (1.18 + 0.12 * Math.sin(t * 2 + i * 1.9)); ctx.strokeStyle = SciSim.color.rgba(hex, 0.45); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * r * 1.04, c.y + Math.sin(a) * r * 1.04); ctx.lineTo(c.x + Math.cos(a) * l1, c.y + Math.sin(a) * l1); ctx.stroke(); }
      D.sphere(c.x, c.y, r, hex, { gloss: false, light: SciSim.color.shade(hex, 0.6), dark: SciSim.color.shade(hex, -0.3) });
      ctx.fillStyle = 'rgba(0,0,0,.08)'; [[-0.35, 0.2, 0.12], [0.3, -0.28, 0.1], [0.28, 0.32, 0.08]].forEach(([dx, dy, rad]) => { ctx.beginPath(); ctx.arc(c.x + dx * r, c.y + dy * r, rad * r, 0, 6.3); ctx.fill(); });
    }
    if (S.flash > 0.01) D.glow(c.x, c.y, 280 * (1.2 - S.flash * 0.4), '#ffffff', S.flash * 0.85);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; rr(sk.x, sk.y, sk.w, sk.h, 16).stroke();
    // 질량 라벨
    D.label(sk.x + 16, sk.y + 24, '⚖ 질량 ' + S.mass + '배', { bg: 'rgba(15,23,42,.8)', color: '#fde68a', size: 15, align: 'left', border: 'rgba(253,230,138,.5)' });
    // 진행 표시
    const ty = LIFE.trackY, tx0 = sk.x + 70, tx1 = sk.x + sk.w - 70, nodes = [['가스 구름', 0], ['원시별', 0.38], ['주계열성', 0.78]];
    ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx0, ty); ctx.lineTo(tx1, ty); ctx.stroke();
    ctx.strokeStyle = '#7dd3fc'; ctx.beginPath(); ctx.moveTo(tx0, ty); ctx.lineTo(tx0 + (tx1 - tx0) * clamp(b / 0.78, 0, 1), ty); ctx.stroke();
    nodes.forEach(([nm, th], i) => {
      const x = tx0 + (tx1 - tx0) * i / 2, on = b >= th - 0.001, last = i === 2;
      const pop = last && on ? SciSim.ease.outBack(clamp((b - 0.78) / 0.06, 0, 1)) : 1;
      D.sphere(x, ty, (on ? 9 : 7) * pop, on ? (last ? '#22c55e' : '#7dd3fc') : '#475569', { gloss: false });
      if (last && on) D.label(x, ty + 28, '🟢 주계열성', { bg: '#22c55e', color: '#052e16', size: 14 }); else D.text(x, ty + 28, nm, { size: 14, color: on ? '#e6ecff' : '#94a3b8', weight: 800 });
    });
    // 수명 막대 그래프
    const P = LIFE.chart; panel(P, '⏳ 별의 수명 비교 (눈금은 로그, 길수록 오래 살아요)');
    const bx = P.x + (PHONE ? 118 : 130), bw = P.w - (PHONE ? 118 : 130) - 20, rowH = (P.h - 40) / 4;
    MKEYS.forEach((m, i) => {
      const y = P.y + 36 + i * rowH, sel = m === S.mass, M = MASS[m], f = (M.lg - 6) / 5;
      D.text(P.x + 14, y + rowH / 2 + 5, m + '배', { size: 15, color: sel ? '#fff' : '#94a3b8', align: 'left', weight: 800 });
      D.sphere(P.x + (PHONE ? 74 : 84), y + rowH / 2, 7, M.col, { gloss: false });
      ctx.fillStyle = 'rgba(255,255,255,.08)'; rr(bx, y + 4, bw, rowH - 8, 7).fill();
      const bl = Math.max(12, bw * f * 0.78);
      ctx.fillStyle = M.col; ctx.globalAlpha = sel ? 1 : 0.55; rr(bx, y + 4, bl, rowH - 8, 7).fill(); ctx.globalAlpha = 1;
      if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(bx, y + 4, bl, rowH - 8, 7).stroke(); }
      D.text(bx + bl + 8, y + rowH / 2 + 5, M.life, { size: 14, color: sel ? '#fde68a' : '#cbd5e1', align: 'left', weight: 800 });
    });
  }

  /* ======================================================
     장면 2: 수소 핵융합 (중심핵 확대)
     ====================================================== */
  const CR = [0, 10, 14, 17, 19];
  const VC = 120, NU = 46;
  const v0 = () => 20 * Math.sqrt(S.T);
  function spawnProton(edge) {
    const C = CORE.c, a = Math.random() * 6.283, d = edge ? CORE.R - 14 : Math.sqrt(Math.random()) * (CORE.R - 30), sf = 0.7 + 0.7 * Math.random(), sp = v0() * sf, b = Math.random() * 6.283;
    return { x: C.x + Math.cos(a) * d, y: C.y + Math.sin(a) * d, vx: Math.cos(b) * sp, vy: Math.sin(b) * sp, sf, k: 1, he: false, born: S.t, die: 0 };
  }
  function initCore() { S.cl = []; for (let i = 0; i < NU; i++) S.cl.push(spawnProton(false)); S.heCount = 0; S.sparks = []; S.balPressed = false; S.balAng = 0; S.balShow = 0; $('#inDiff').value = ''; }
  function stepCore(dt) {
    const C = CORE.c, R = CORE.R, cl = S.cl, target = v0();
    // 온도에 맞춰 속도 조절
    cl.forEach((p) => {
      if (p.die) return;
      const sp = Math.hypot(p.vx, p.vy) || 1, want = target * (p.sf || 1) / Math.sqrt(p.k) * (p.he ? 0.5 : 1), nsp = SciSim.approach(sp, want, dt, 1.2);
      p.vx *= nsp / sp; p.vy *= nsp / sp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const rk = CR[p.k], dx = p.x - C.x, dy = p.y - C.y, d = Math.hypot(dx, dy);
      if (d > R - rk - 6) { const nx = dx / d, ny = dy / d, dv = p.vx * nx + p.vy * ny; if (dv > 0) { p.vx -= 2 * dv * nx; p.vy -= 2 * dv * ny; } p.x = C.x + nx * (R - rk - 6); p.y = C.y + ny * (R - rk - 6); }
    });
    // 충돌
    for (let i = 0; i < cl.length; i++) {
      const a = cl[i]; if (a.die || a.dead) continue;
      for (let j = i + 1; j < cl.length; j++) {
        const b = cl[j]; if (b.die || b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rs = CR[a.k] + CR[b.k], d2 = dx * dx + dy * dy;
        if (d2 >= rs * rs || d2 < 0.01) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, rvx = a.vx - b.vx, rvy = a.vy - b.vy, closing = rvx * nx + rvy * ny;
        if (closing <= 0) continue;
        const rel = Math.hypot(rvx, rvy);
        if (a.k + b.k <= 4 && rel >= VC && !a.he && !b.he) {
          // 융합
          const k = a.k + b.k, ma = a.k, mb = b.k;
          a.x = (a.x * ma + b.x * mb) / k; a.y = (a.y * ma + b.y * mb) / k; a.vx = (a.vx * ma + b.vx * mb) / k; a.vy = (a.vy * ma + b.vy * mb) / k; a.k = k; b.dead = true; a.t0 = S.t + Math.random() * 1.2;
          parts.burst(a.x, a.y, { count: k === 4 ? 16 : 6, speed: k === 4 ? 200 : 110, size: k === 4 ? 4 : 2.5, life: k === 4 ? 1 : 0.5, colors: ['#fff7c2', '#fde68a', '#fb923c'], gravity: 0, shape: 'star' });
          if (k === 4) {
            a.he = true; a.die = 0.0001; S.heCount++; S.fusedFlash = 1; Sound.success();
            for (let q = 0; q < 3; q++) parts.emit({ x: a.x, y: a.y, vx: 0, vy: 0, life: 0.9, size: 20 + q * 20, color: 'rgba(255,240,170,.55)', shape: 'smoke', grow: 80 });
            a.vx *= 0.3; a.vy *= 0.3;
          } else Sound.tick();
        } else {
          // 튕김 (같은 질량 비율의 탄성 충돌)
          const ma = a.k, mb = b.k, dvn = rvx * nx + rvy * ny, imp = 2 * dvn / (ma + mb);
          a.vx -= imp * mb * nx; a.vy -= imp * mb * ny; b.vx += imp * ma * nx; b.vy += imp * ma * ny;
          const ov = rs - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
          if (a.k + b.k <= 4 && !a.he && !b.he && S.t - (a.rep || 0) > 0.35) { a.rep = S.t; S.sparks.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0, nx, ny }); }
        }
      }
    }
    // 오래 짝을 못 찾은 덩어리는 다시 흩어져요 (불안정)
    const extra = [];
    cl.forEach((p) => { if (!p.dead && !p.he && p.k > 1 && S.t - (p.t0 || S.t) > 5) { p.dead = true; for (let q = 0; q < p.k; q++) { const a = Math.random() * 6.283, sp = v0() * (0.8 + 0.6 * Math.random()); extra.push({ x: p.x + Math.cos(a) * 12, y: p.y + Math.sin(a) * 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sf: 0.7 + 0.7 * Math.random(), k: 1, he: false, die: 0 }); } } });
    extra.forEach((e) => cl.push(e));
    // 헬륨 핵은 밖으로 빠져 나가요
    cl.forEach((p) => { if (p.he && p.die) { p.die += dt; const dx = p.x - C.x, dy = p.y - C.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * 120 * dt; p.vy += dy / d * 120 * dt; if (p.die > 1.8) p.dead = true; } });
    S.cl = cl.filter((p) => !p.dead);
    let units = 0; S.cl.forEach((p) => { if (!p.he) units += p.k; });
    S.spawnT -= dt; if (units < NU && S.spawnT <= 0) { S.cl.push(spawnProton(true)); S.spawnT = 0.12; }
    S.sparks.forEach((s) => { s.t += dt; }); S.sparks = S.sparks.filter((s) => s.t < 0.5);
    S.fusedFlash = Math.max(0, S.fusedFlash - dt * 2.2);
    // 저울
    const tgt = S.balPressed ? 0.17 : 0;
    S.balAng = RM ? tgt : SciSim.approach(S.balAng, tgt, dt, 3.2);
    S.balShow = RM ? (S.balPressed ? 1 : 0) : SciSim.approach(S.balShow, S.balPressed ? 1 : 0, dt, 2);
  }
  function drawCluster(p, t) {
    const x = p.x, y = p.y;
    const prot = (px, py, r) => D.sphere(px, py, r * 1.22, '#ef4444', { text: '+', textScale: 1.0 });
    const neut = (px, py, r) => D.sphere(px, py, r * 1.22, '#9ca3af', { text: 'n', textScale: 1.0 });
    if (p.he) {
      const fade = clamp(1 - (p.die - 1.2) / 0.6, 0, 1); ctx.save(); ctx.globalAlpha = fade;
      D.glow(x, y, 54, '#fde68a', 0.5); prot(x - 9, y - 8, 9); neut(x + 9, y - 8, 9); neut(x - 9, y + 9, 9); prot(x + 9, y + 9, 9);
      D.label(x, y - 32, '헬륨 핵', { bg: '#fde68a', color: '#422006', size: 13 }); ctx.restore(); return;
    }
    if (p.k === 1) prot(x, y, 9);
    else if (p.k === 2) { prot(x - 8, y, 9); prot(x + 8, y, 9); }
    else if (p.k === 3) { prot(x - 8, y + 6, 9); prot(x + 8, y + 6, 9); prot(x, y - 9, 9); }
  }
  function drawCore(t) {
    const C = CORE.c, R = CORE.R;
    // 뜨거운 중심핵
    ctx.save(); ctx.beginPath(); ctx.arc(C.x, C.y, R, 0, 6.3); ctx.clip();
    const heat = clamp((S.T - 2) / 18, 0, 1);
    const g = ctx.createRadialGradient(C.x, C.y, 10, C.x, C.y, R);
    g.addColorStop(0, SciSim.color.mix('#7a2a10', '#fff0b0', heat)); g.addColorStop(0.55, SciSim.color.mix('#3b1208', '#ff9a3c', heat)); g.addColorStop(1, SciSim.color.mix('#1a0a10', '#7a1d0a', heat));
    ctx.fillStyle = g; ctx.fillRect(C.x - R, C.y - R, R * 2, R * 2);
    for (let i = 0; i < 6; i++) { const a = t * 0.2 * (i % 2 ? 1 : -1) + i; D.glow(C.x + Math.cos(a) * R * 0.5, C.y + Math.sin(a * 1.3) * R * 0.5, 90, '#ffd27a', 0.1 + 0.12 * heat); }
    if (S.fusedFlash > 0.01) D.glow(C.x, C.y, R * 1.1, '#ffffff', S.fusedFlash * 0.18);
    S.cl.forEach((p) => drawCluster(p, t));
    // 전기 반발 표시
    S.sparks.forEach((s) => {
      const k = s.t / 0.5; ctx.strokeStyle = 'rgba(254,240,138,' + (1 - k) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(s.x, s.y, 6 + k * 18, 0, 6.3); ctx.stroke();
      D.arrow(s.x - s.nx * 8, s.y - s.ny * 8, s.x - s.nx * (24 + k * 12), s.y - s.ny * (24 + k * 12), { color: 'rgba(254,240,138,' + (1 - k) + ')', width: 3, head: 9 });
      D.arrow(s.x + s.nx * 8, s.y + s.ny * 8, s.x + s.nx * (24 + k * 12), s.y + s.ny * (24 + k * 12), { color: 'rgba(254,240,138,' + (1 - k) + ')', width: 3, head: 9 });
    });
    ctx.restore();
    ctx.strokeStyle = 'rgba(253,230,138,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(C.x, C.y, R, 0, 6.3); ctx.stroke();
    // 확대 표시 · 라벨
    D.label(C.x, C.y - R + 34, '🔍 별 중심핵을 확대한 모형', { bg: 'rgba(15,23,42,.82)', color: '#fde68a', size: 14, border: 'rgba(253,230,138,.5)' });
    D.label(C.x - 84, C.y + R - 34, '🌡 ' + (S.T * 100).toLocaleString('ko-KR') + '만 K', { bg: heat > 0.4 ? '#f97316' : '#475569', color: '#fff', size: 15 });
    D.label(C.x + 84, C.y + R - 34, '헬륨 핵 ' + S.heCount + '개', { bg: '#fde68a', color: '#422006', size: 15 });
    // 저울
    drawBalance(t);
  }
  function drawBalance(t) {
    const B = CORE.bal, pv = CORE.pivot, Lh = CORE.L, ang = S.balAng;
    panel(B, '⚖ 질량 비교');
    const lx = pv.x - Math.cos(ang) * Lh, ly = pv.y + Math.sin(ang) * Lh, rx = pv.x + Math.cos(ang) * Lh, ry = pv.y - Math.sin(ang) * Lh;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pv.x, pv.y + 70); ctx.lineTo(pv.x, pv.y); ctx.stroke();
    ctx.fillStyle = '#64748b'; rr(pv.x - 36, pv.y + 66, 72, 10, 5).fill();
    D.shadow(() => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke(); }, { blur: 6, y: 3, color: 'rgba(0,0,0,.5)' });
    D.sphere(pv.x, pv.y, 7, '#f1f5f9', { gloss: false });
    [[lx, ly, 0], [rx, ry, 1]].forEach(([x, y, k]) => {
      const pw = PHONE ? 118 : 64, ph = 52;
      ctx.strokeStyle = 'rgba(203,213,225,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - pw / 2 + 6, y + ph); ctx.moveTo(x, y); ctx.lineTo(x + pw / 2 - 6, y + ph); ctx.stroke();
      ctx.fillStyle = '#cbd5e1'; rr(x - pw / 2, y + ph, pw, 8, 4).fill();
      const py = y + ph;
      if (k === 0) { [[-9, -9], [9, -9], [-9, -26], [9, -26]].forEach(([dx, dy]) => D.sphere(x + dx, py + dy, 8, '#ef4444', { text: '+', textScale: 1 })); }
      else { [[-9, -9, 'p'], [9, -9, 'n'], [-9, -26, 'n'], [9, -26, 'p']].forEach(([dx, dy, q]) => D.sphere(x + dx, py + dy, 8, q === 'p' ? '#ef4444' : '#9ca3af', { text: q === 'p' ? '+' : 'n', textScale: 1 })); }
    });
    const ly0 = pv.y + 110;
    if (!PHONE) {
      D.text(B.x + B.w / 2, ly0 - 4, S.balPressed ? '' : '같은 질량일까요?', { size: 15, color: '#fde68a', weight: 800 });
      D.text(B.x + 14, ly0 + 22, '수소 핵 4개', { size: 14.5, color: '#fca5a5', align: 'left', weight: 800 }); D.text(B.x + B.w - 14, ly0 + 22, S.balShow > 0.3 ? '4.0291 u' : '? u', { size: 15, color: '#fff', align: 'right', weight: 800 });
      D.text(B.x + 14, ly0 + 48, '헬륨 핵 1개', { size: 14.5, color: '#fde68a', align: 'left', weight: 800 }); D.text(B.x + B.w - 14, ly0 + 48, S.balShow > 0.3 ? '4.0015 u' : '? u', { size: 15, color: '#fff', align: 'right', weight: 800 });
      if (S.balShow > 0.6) {
        ctx.globalAlpha = smooth((S.balShow - 0.6) / 0.4);
        ctx.fillStyle = 'rgba(253,230,138,.14)'; rr(B.x + 10, ly0 + 66, B.w - 20, 112, 12).fill();
        D.text(B.x + B.w / 2, ly0 + 90, '사라진 질량 0.0276 u', { size: 15.5, color: '#fde68a', weight: 800 });
        D.text(B.x + B.w / 2, ly0 + 112, '(약 0.7 %)', { size: 14, color: '#fde68a', weight: 700 });
        paragraph('사라진 질량이 빛 에너지로 나와요. 이 에너지가 별을 빛나게 해요.', B.x + 18, ly0 + 134, B.w - 36, 13.5, '#e6ecff', 19, 700);
        ctx.globalAlpha = 1;
        const gx = rx, gy = ry + 6 - 36 - Math.sin(t * 3) * 3; D.glow(gx, gy - 6, 40, '#fde68a', 0.5 * S.balShow); D.spark(gx, gy - 6, 14, t, '#fff6c2');
      }
    } else {
      D.text(B.x + B.w / 2, B.y + B.h - 30, S.balPressed ? '' : '같은 질량일까요? (⚖ 버튼을 눌러요)', { size: 14.5, color: '#fde68a', weight: 800 });
      D.text(lx, ly + 100, '수소 핵 4개', { size: 14, color: '#fca5a5', weight: 800 }); D.text(lx, ly + 122, S.balShow > 0.3 ? '4.0291 u' : '? u', { size: 15, color: '#fff', weight: 800 });
      D.text(rx, ry + 100, '헬륨 핵 1개', { size: 14, color: '#fde68a', weight: 800 }); D.text(rx, ry + 122, S.balShow > 0.3 ? '4.0015 u' : '? u', { size: 15, color: '#fff', weight: 800 });
      if (S.balShow > 0.6) { ctx.globalAlpha = smooth((S.balShow - 0.6) / 0.4); D.text(B.x + B.w / 2, B.y + B.h - 44, '사라진 질량 0.0276 u (약 0.7 %) → 빛 에너지', { size: 14.5, color: '#fde68a', weight: 800 }); ctx.globalAlpha = 1; }
    }
  }

  /* ======================================================
     장면 3: 무거운 별 (양파 껍질)
     ====================================================== */
  function endState() { return S.m3 === 1 && S.st >= 2; }
  function stepOnion(dt) {
    for (let i = 0; i < 6; i++) {
      let tg = 0;
      if (!endState() && i <= S.st) tg = RR[i];
      if (endState() && i <= 1) tg = RR[i] * 0.35;
      if (endState() && i === 0) tg = 0.4;
      S.lr[i] = RM ? tg : SciSim.approach(S.lr[i], tg, dt, i === S.st && S.lr[i] < 0.05 ? 6 : 5);
    }
    S.maxSt[S.m3] = Math.max(S.maxSt[S.m3], endState() ? 1 : S.st);
    if (S.m3 === 20 && S.st === 5) S.reached20 = true;
  }
  function drawOnion(t) {
    const C = ONION.c, R = ONION.R;
    D.glow(C.x, C.y, R * 1.35, '#6366f1', 0.14);
    const end = endState();
    if (end) {
      // 행성상 성운 + 백색 왜성
      for (let k = 0; k < 3; k++) { const p = ((t * 0.18 + k / 3) % 1), rad = R * (0.5 + p * 0.55); ctx.strokeStyle = 'rgba(165,243,252,' + (0.55 * (1 - p)) + ')'; ctx.lineWidth = 10 - p * 6; ctx.beginPath(); ctx.arc(C.x, C.y, rad, 0, 6.3); ctx.stroke(); }
      D.glow(C.x, C.y, R * 0.7, '#67e8f9', 0.22);
      D.glow(C.x, C.y, 54, '#ffffff', 0.9); D.sphere(C.x, C.y, 14, '#f8fafc', { gloss: false, light: '#fff', dark: '#bfdbfe' });
      D.label(C.x, C.y + R + 8, '행성상 성운 + 백색 왜성 (탄소·산소 핵)', { bg: 'rgba(15,23,42,.85)', color: '#a5f3fc', size: 14.5, border: 'rgba(165,243,252,.5)' });
    } else {
      // 양파 껍질: 바깥에서 안쪽으로 칠하기
      for (let i = 0; i <= 5; i++) {
        const f = S.lr[i]; if (f < 0.01) continue;
        const r = R * f, col = LAYERS[i].col;
        const g = ctx.createRadialGradient(C.x - r * 0.3, C.y - r * 0.35, r * 0.1, C.x, C.y, r);
        g.addColorStop(0, SciSim.color.shade(col, 0.35)); g.addColorStop(1, col);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C.x, C.y, r, 0, 6.3); ctx.fill();
        ctx.strokeStyle = 'rgba(15,23,42,.45)'; ctx.lineWidth = 2; ctx.stroke();
      }
      // 핵융합이 일어나는 곳 (맥박)
      const s = S.st, f = S.lr[s];
      if (f > 0.02 && s < 5) { const pr = R * f * (0.78 + 0.07 * Math.sin(t * 5)); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.arc(C.x, C.y, Math.max(6, pr * 0.55), 0, 6.3); ctx.stroke(); ctx.setLineDash([]); D.glow(C.x, C.y, Math.max(14, R * f * 0.5), '#fff7c2', 0.45 + 0.2 * Math.sin(t * 5)); }
      if (s === 5 && f > 0.02) { D.glow(C.x, C.y, R * 0.3, '#ef4444', 0.55 + 0.2 * Math.sin(t * 4)); D.text(C.x, C.y + 5, 'Fe', { size: 16, color: '#7f1d1d', weight: 800 }); }
      if (s >= 5) D.label(C.x, C.y + R + 8, '철 핵융합은 에너지를 내지 못해 핵융합이 멈춰요', { bg: 'rgba(127,29,29,.85)', color: '#fecaca', size: 14, border: 'rgba(252,165,165,.5)' });
    }
    // 표지
    D.label(C.x - R + (PHONE ? 6 : 0), C.y - R + 2, '⚖ ' + S.m3 + '배 · ' + (end ? '진화의 끝' : STN[S.st]), { bg: 'rgba(15,23,42,.82)', color: '#fde68a', size: 15, align: 'left', border: 'rgba(253,230,138,.5)' });
    // 범례
    const P = ONION.leg; panel(P, '🧅 층과 핵융합');
    const rowH = PHONE ? 35 : 44, y0 = P.y + 36;
    LAYERS.forEach((ly, i) => {
      const y = y0 + i * rowH, on = !end && i <= S.st, cur = !end && i === S.st;
      if (cur) { ctx.fillStyle = 'rgba(255,255,255,.10)'; rr(P.x + 8, y - 2, P.w - 16, rowH - 4, 10).fill(); }
      ctx.globalAlpha = on || end && i < 2 ? 1 : 0.35;
      D.sphere(P.x + 26, y + rowH / 2 - 3, 9, ly.col, { gloss: false });
      D.text(P.x + 44, y + rowH / 2 - (PHONE ? 4 : 5), ly.name, { size: 14.5, color: '#f1f5f9', align: 'left', weight: 800 });
      D.text(P.x + 44, y + rowH / 2 + (PHONE ? 13 : 14), ly.prod, { size: 13, color: '#bfd0ff', align: 'left', weight: 600 });
      ctx.globalAlpha = 1;
    });
    const by = y0 + 6 * rowH + 6;
    ctx.fillStyle = 'rgba(253,230,138,.10)'; rr(P.x + 10, by, P.w - 20, P.h - (by - P.y) - 10, 12).fill();
    let msg;
    if (end) msg = '질량이 작은 별은 중심 온도가 탄소 핵융합이 일어날 만큼 높아지지 않아요. 바깥 층은 날아가 행성상 성운이 되고, 중심핵은 백색 왜성이 돼요.';
    else if (S.st === 5) msg = '철 핵이 만들어지면 더 핵융합이 일어나도 에너지를 내지 못해요. 별 속에서 만들어지는 원소는 철까지예요.';
    else msg = '현재 중심핵 연료: ' + LAYERS[S.st].name.replace(' 층', '') + '. 핵융합은 온도가 높을수록 더 무거운 원소로 이어져요.';
    let hh = paragraph(msg, P.x + 20, by + 24, P.w - 40, 13.5, '#fde68a', 19, 700);
    if (!PHONE && S.m3 === 20 && !end && S.st < 5) paragraph('걸리는 시간(20배 별, 대략): ' + TIME20[S.st], P.x + 20, by + 28 + hh, P.w - 40, 13.5, '#a5f3fc', 19, 700);
  }

  /* ======================================================
     장면 4: 원소의 고향 (분류)
     ====================================================== */
  function initOrigin() {
    const order = [3, 6, 0, 5, 1, 7, 2, 4];
    S.cards = order.map((di, k) => { const d = ELCARDS[di], r = poolRect(k); return Object.assign({}, d, { want: d.bin, pi: k, hx: r.x, hy: r.y, x: r.x, y: r.y, w: r.w, h: r.h, bin: -1, bad: false, lift: 0, shake: 0 }); });
    S.originOK = 0;
  }
  function layoutBins() {
    const per = BINS.map(() => 0);
    S.cards.forEach((c) => {
      if (c.bin < 0) { const pr = poolRect(c.pi); c.hx = pr.x; c.hy = pr.y; return; }
      const r = binRect(c.bin), n = per[c.bin]++, cols = PHONE ? 3 : 2;
      c.hx = r.x + 10 + BIN_CW / 2 + (n % cols) * (BIN_CW + 6); c.hy = r.y + (PHONE ? 62 : 82) + BIN_CH / 2 + Math.floor(n / cols) * (BIN_CH + 6);
    });
  }
  function stepOrigin(dt) {
    layoutBins();
    S.cards.forEach((c) => {
      const dr = S.drag && S.drag.c === c;
      if (!dr) { c.x = RM ? c.hx : SciSim.approach(c.x, c.hx, dt, 14); c.y = RM ? c.hy : SciSim.approach(c.y, c.hy, dt, 14); }
      c.lift = RM ? (dr ? 1 : 0) : SciSim.approach(c.lift, dr ? 1 : 0, dt, 16);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 3);
      const pr = poolRect(c.pi), tw = c.bin >= 0 ? BIN_CW : pr.w, th = c.bin >= 0 ? BIN_CH : pr.h;
      c.w = dr ? pr.w : SciSim.approach(c.w, tw, dt, 14); c.h = dr ? pr.h : SciSim.approach(c.h, th, dt, 14);
    });
  }
  function drawOrigin(t) {
    BINS.forEach((b, i) => {
      const r = binRect(i), n = S.cards.filter((c) => c.bin === i).length;
      ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(r.x, r.y, r.w, r.h, 16).fill();
      ctx.strokeStyle = SciSim.color.rgba(b.col, n ? 0.9 : 0.5); ctx.lineWidth = 2; if (!n) ctx.setLineDash([6, 5]); rr(r.x, r.y, r.w, r.h, 16).stroke(); ctx.setLineDash([]);
      const hg = ctx.createLinearGradient(0, r.y, 0, r.y + 60); hg.addColorStop(0, SciSim.color.rgba(b.col, 0.28)); hg.addColorStop(1, SciSim.color.rgba(b.col, 0)); ctx.fillStyle = hg; rr(r.x, r.y, r.w, PHONE ? 52 : 72, 16).fill();
      D.text(r.x + r.w / 2, r.y + (PHONE ? 26 : 32), b.icon + ' ' + b.title, { size: 16, color: '#f8fafc', weight: 800 });
      D.text(r.x + r.w / 2, r.y + (PHONE ? 46 : 54), b.sub, { size: 13, color: '#cbd5e1', weight: 700 });
      if (!n) D.text(r.x + r.w / 2, r.y + r.h / 2 + (PHONE ? 20 : 30), '여기에 놓아요', { size: 13.5, color: '#64748b', weight: 700 });
    });
    D.text(PHONE ? 16 : 24, PHONE ? 410 : 372, '👇 원소 카드 (끌어서 상자에 놓아요)', { size: 14.5, color: '#bae6fd', align: 'left', weight: 800 });
    S.cards.forEach((c) => drawCard(c));
  }
  function drawCard(c) {
    const sh = c.shake > 0 ? Math.sin(c.shake * 30) * 4 : 0, lift = c.lift, small = c.bin >= 0 && !(S.drag && S.drag.c === c);
    D.shadow(() => { ctx.fillStyle = c.bad ? '#fecaca' : '#f8fafc'; rr(c.x - c.w / 2 + sh - lift * 2, c.y - c.h / 2 - lift * 4, c.w + lift * 4, c.h + lift * 2, 10).fill(); }, { blur: 6 + lift * 10, y: 2 + lift * 4, color: 'rgba(0,0,0,.45)' });
    ctx.fillStyle = c.col; rr(c.x - c.w / 2 + sh, c.y - c.h / 2, 7, c.h, 4).fill();
    if (c.bad) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; rr(c.x - c.w / 2 + sh, c.y - c.h / 2, c.w, c.h, 10).stroke(); }
    D.text(c.x + sh + 4, c.y + (small ? 3 : 2), c.sym, { size: small ? 18 : 24, color: '#0b1226', weight: 800 });
    if (!small) D.text(c.x + sh + 4, c.y + c.h / 2 - 7, c.name, { size: 13, color: '#475569', weight: 800 });
    else D.text(c.x + sh + 4, c.y + c.h / 2 - 5, c.name, { size: 11.5, color: '#475569', weight: 800 });
  }

  /* ======================================================
     입력
     ====================================================== */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'origin') return false;
      let best = null;
      for (let i = S.cards.length - 1; i >= 0; i--) { const c = S.cards[i]; if (Math.abs(p.x - c.x) < c.w / 2 + 4 && Math.abs(p.y - c.y) < c.h / 2 + 4) { best = c; break; } }
      if (!best) return false;
      best.bin = -1; best.bad = false; S.cards.splice(S.cards.indexOf(best), 1); S.cards.push(best);
      layoutBins();
      S.drag = { c: best, ox: best.x - p.x, oy: best.y - p.y }; Sound.tick(); return true;
    },
    move(p) { const d = S.drag; if (d) { d.c.x = p.x + d.ox; d.c.y = p.y + d.oy; } },
    up() {
      const d = S.drag; if (!d) return; S.drag = null;
      const c = d.c; let hit = -1;
      BINS.forEach((b, i) => { const r = binRect(i); if (c.x > r.x && c.x < r.x + r.w && c.y > r.y && c.y < r.y + r.h) hit = i; });
      c.bin = hit; if (hit >= 0) Sound.click();
    },
    hover(p) { return S.mode === 'origin' && S.cards.some((c) => Math.abs(p.x - c.x) < c.w / 2 && Math.abs(p.y - c.y) < c.h / 2) ? 'grab' : 'default'; },
  });

  /* ---------- HTML 컨트롤 ---------- */
  const ctl = { m: $$('#massBtns .opt'), m3: $$('#mass3Btns .opt'), scene: $$('#sceneBtns .opt'), ans: $$('#ansBtns .opt') };
  const sTemp = $('#sTemp'), oTemp = $('#oTemp'), sSt = $('#sSt'), oSt = $('#oSt');
  function setMass(m) { if (S.mass === m) return; S.mass = m; S.seenT = 0; Sound.tick(); updateCtl(); }
  ctl.m.forEach((b) => b.addEventListener('click', () => setMass(+b.dataset.m)));
  $('#bBirth').addEventListener('click', () => { Sound.click(); restartBirth(); });
  const bTemp = SciSim.bindRange(sTemp, oTemp, (v) => (+v * 100).toLocaleString('ko-KR') + '만 K', (v) => { S.T = v; });
  $('#bBalance').addEventListener('click', () => { Sound.click(); S.balPressed = true; updateCtl(); });
  function setM3(m) { S.m3 = m; Sound.tick(); updateCtl(); }
  ctl.m3.forEach((b) => b.addEventListener('click', () => setM3(+b.dataset.m)));
  function setSt(v) { S.st = clamp(Math.round(v), 0, 5); sSt.value = S.st; updateCtl(); }
  const bSt = SciSim.bindRange(sSt, oSt, (v) => STN[+v], (v) => { S.st = +v; Sound.tick(); updateCtl(); });
  $('#bPrev').addEventListener('click', () => { Sound.tick(); setSt(S.st - 1); });
  $('#bNext').addEventListener('click', () => { Sound.tick(); setSt(S.st + 1); });
  ctl.ans.forEach((b) => b.addEventListener('click', () => { Sound.tick(); const k = +b.dataset.ans; S.ans[k] = (S.ans[k] + 1) % ANS_OPT.length; S.ansBad[k] = false; b.classList.remove('shake', 'ok'); updateCtl(); }));
  ctl.scene.forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#bOriginReset').addEventListener('click', () => { Sound.click(); initOrigin(); });
  $('#inDiff').addEventListener('input', () => {});

  function setScene(m) {
    if (S.mode !== m) { S.mode = m; S.fade = 1; }
    if (m === 'core' && !S.cl.length) initCore();
    if (m === 'origin' && !S.cards.length) initOrigin();
    updateCtl();
  }
  const MODE_LABEL = { life: '⭐ 별의 일생', core: '🔍 수소 핵융합', onion: '🧅 무거운 별', origin: '🧭 원소의 고향' };
  function updateCtl() {
    const free = !!(game && game.free);
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => {
      const mo = c.dataset.modes;
      let ok = mo === 'free' ? free : mo.split(' ').includes(S.mode);
      const need = c.dataset.need;
      if (ok && need === 'balance') ok = true;
      if (ok && need === 'diff') ok = free || has('balance');
      if (ok && need === 'table') ok = free || has('table');
      c.hidden = !ok;
    });
    $('#bBalance').hidden = !(free || has('balance'));
    ctl.m.forEach((b) => b.classList.toggle('on', +b.dataset.m === S.mass));
    ctl.m3.forEach((b) => b.classList.toggle('on', +b.dataset.m === S.m3));
    ctl.scene.forEach((b) => b.classList.toggle('on', b.dataset.scene === S.mode));
    ctl.ans.forEach((b) => { const k = +b.dataset.ans, v = S.ans[k]; b.textContent = k + '배: ' + ANS_OPT[v]; b.classList.toggle('on', v > 0 && !S.ansOK); b.classList.toggle('ok', !!S.ansOK); });
    sSt.value = S.st; bSt.refresh();
    $('#bPrev').disabled = S.st <= 0; $('#bNext').disabled = S.st >= 5;
    $('#bBalance').classList.toggle('on', S.balPressed);
  }

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let A, a, B, b, C, c;
    if (S.mode === 'life') { const M = MASS[S.mass]; A = '별의 질량'; a = '태양의 ' + S.mass + '배'; B = '수명 · 색'; b = M.life + ' · ' + M.tag; C = '표면 온도'; c = M.temp; }
    else if (S.mode === 'core') {
      A = '중심 온도'; a = (S.T * 100).toLocaleString('ko-KR') + '만 K'; B = '핵융합'; b = S.T >= 10 ? '활발해요' : S.T >= 8 ? '가끔 일어나요' : '일어나지 않아요'; C = '만든 헬륨 핵'; c = S.heCount + '개';
    } else if (S.mode === 'onion') { A = '별의 질량'; a = '태양의 ' + S.m3 + '배'; B = '진화 단계'; b = endState() ? '진화의 끝' : STN[S.st]; C = '중심핵의 연료'; c = endState() ? '더 쓸 연료 없음' : LAYERS[S.st].name.replace(' 층', ''); }
    else { A = '놓은 카드'; a = S.cards.filter((x) => x.bin >= 0).length + ' / 8'; B = '빅뱅'; b = '수소·헬륨'; C = '별 속'; c = '탄소·질소·산소…'; }
    const key = A + a + B + b + C + c;
    if (key === rlast) return; rlast = key;
    l1.textContent = A; v1.textContent = a; l2.textContent = B; v2.textContent = b; l3.textContent = C; v3.textContent = c;
  }
  let hintTimer = null;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function ensure(m) { if (S.mode !== m) setScene(m); else updateCtl(); }
  function enterLevel(li) {
    if (li === 0) { setScene('life'); S.mass = 1; S.massSeen = new Set(); S.msReached = false; restartBirth(); }
    else if (li === 1) { setScene('core'); S.T = 5; sTemp.value = 5; bTemp.refresh(); initCore(); }
    else if (li === 2) { setScene('onion'); S.m3 = 20; S.st = 0; S.lr = [1, 0, 0, 0, 0, 0]; S.ans = { 1: 0, 8: 0, 20: 0 }; S.ansOK = 0; S.reached20 = false; S.maxSt = { 1: 0, 8: 0, 20: 0 }; }
    else { setScene('origin'); initOrigin(); }
    updateCtl();
  }
  const levels = [
    {
      title: '별의 탄생과 일생', short: '별의 일생', icon: '⭐', phase: '관찰',
      features: ['birth', 'mass'],
      intro: '<p class="si-q">❓ 탐구 질문: 별은 어떻게 오랫동안 빛을 내고, 그 속에서 새로운 원소가 만들어질까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 수소와 헬륨은 우주 초기에, 산소·탄소 같은 무거운 원소는 <b>별 속에서</b> 만들어진다고 했어요. 또 <b>중학교</b>에서 별의 색이 표면 온도와 관계있다는 것(중2 Ⅷ 별과 우주)을 배웠어요.</div>' +
        '<p>먼저 별이 태어나는 과정을 지켜보고, <b>질량이 다른 별</b>을 비교해 봐요. 별의 색, 크기, <b>수명</b>이 어떻게 달라질까요?</p>',
      setup() { enterLevel(0); showHint('⭐ 별이 태어나는 모습을 지켜보세요', 6000); },
      recap: '가스 구름이 뭉쳐 중심 온도가 충분히 높아지면 핵융합이 시작되어 주계열성이 돼요. 질량이 클수록 푸르고 크며 수명이 짧아요.',
      summary: '<ul><li>성운의 가스 구름이 중력으로 수축 → <b>원시별</b> → 중심 온도가 약 1천만 K에 이르면 수소 핵융합 시작 → <b>주계열성</b>.</li><li>질량이 클수록 표면 온도가 높아 <b>푸른색</b>이고 크기가 커요.</li><li>질량이 클수록 연료를 훨씬 빨리 써서 <b>수명이 짧아요</b>. (0.5배 약 700억 년 · 1배 약 100억 년 · 8배 약 4천만 년 · 20배 약 1천만 년)</li></ul>',
      missions: [
        {
          title: '별의 탄생 지켜보기',
          goal: '가스 구름이 뭉쳐 원시별을 거쳐 <b>주계열성</b>이 될 때까지 지켜보세요. (놓쳤다면 ▶ 별 탄생 다시 보기)',
          hint: '약 6초 걸려요. 중심에서 환하게 불이 켜지고 초록색 "주계열성" 배지가 나타나면 성공이에요.',
          setup() { ensure('life'); S.msReached = false; restartBirth(); },
          check: () => S.msReached, hold: 0.4,
          status: () => '진행 <b>' + Math.round(S.birth * 100) + '%</b> · ' + mark(S.ignited) + ' 핵융합 시작 · ' + mark(S.msReached) + ' 주계열성',
          explain: '가스 구름이 중력으로 수축하며 중심의 온도와 압력이 올라가요. 중심 온도가 약 <b>1천만 K</b>에 이르면 수소 핵융합이 시작돼 별이 빛나요. 핵융합으로 나오는 에너지와 중력이 균형을 이루는 안정된 별이 <b>주계열성</b>이에요.',
        },
        {
          title: '질량 4가지 비교하기',
          goal: '질량이 <b>0.5배, 1배, 8배, 20배</b>인 별을 모두 골라 색과 크기, 수명을 비교하세요.',
          hint: '질량 버튼을 하나씩 눌러 별이 바뀌는 것을 1초쯤 살펴봐요.',
          setup() { ensure('life'); if (S.birth < 0.78) S.birth = 0.9; },
          check: () => S.massSeen.size >= 4, hold: 0.3,
          status: () => MKEYS.map((m) => mark(S.massSeen.has(m)) + ' ' + m + '배').join(' · '),
          explain: '질량이 클수록 별이 <b>푸르고(표면 온도가 높고) 커요</b>. 그리고 수명은 짧아져요. 태양(1배)은 약 100억 년, 20배 별은 약 1천만 년밖에 살지 못해요.',
        },
        {
          type: 'quiz', title: '질량이 큰 별의 수명',
          goal: '질량이 큰 별일수록 수명이 <b>짧은</b> 까닭은 무엇일까요?',
          setup() { ensure('life'); },
          choices: ['중심 온도가 높아 핵융합 연료를 훨씬 빨리 쓰기 때문이다', '연료가 거의 없이 태어나기 때문이다', '핵융합을 하지 않고 빛만 내기 때문이다', '지구에서 멀리 있어서 수명이 짧아 보이기 때문이다'],
          answer: 0,
          feedback: ['', '큰 별은 연료(수소)를 더 많이 가지고 태어나요. 그런데 훨씬 더 빨리 써요.', '모든 주계열성은 중심에서 수소 핵융합으로 에너지를 내요.', '수명은 별 자체의 성질이에요. 거리와는 관계없어요.'],
          explain: '질량이 큰 별은 중력이 커서 중심의 온도와 압력이 훨씬 높고, 핵융합이 아주 <b>빠르게</b> 일어나요. 연료는 더 많지만 소비가 훨씬 더 빨라서 수명이 짧아요.',
        },
      ],
    },
    {
      title: '수소 핵융합 모형', short: '수소 핵융합', icon: '🔍', phase: '모형',
      features: ['core', 'balance'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별의 중심 온도가 약 1천만 K이 되면 핵융합이 시작된다는 것을 알았어요. 별의 중심핵 속에서는 어떤 일이 일어날까요?</div>' +
        '<p>🔍 별의 <b>중심핵을 확대</b>해 보면 수소 원자핵(양성자)이 빠르게 돌아다녀요. 수소 핵은 모두 (+)전하라서 서로 밀어내요. <b>온도를 높여</b> 빠르게 부딪치게 하면 <b>수소 핵 4개가 합쳐져 헬륨 핵 1개</b>가 돼요.</p>' +
        '<p>이때 <b>질량이 조금 줄어요</b>. 저울로 확인해 봐요. (핵반응식은 다루지 않아요)</p>',
      setup() { enterLevel(1); showHint('🌡 온도를 높여 수소 핵을 부딪쳐 보세요', 6000); },
      recap: '매우 뜨거운 중심핵에서 수소 핵 4개가 헬륨 핵 1개로 바뀌며, 줄어든 질량만큼 에너지가 나와요.',
      summary: '<ul><li><b>핵융합</b>: 가벼운 원자핵이 합쳐져 더 무거운 원자핵이 되는 반응. 별의 중심핵(약 1천만 K 이상)에서 일어나요.</li><li>수소 핵 4개 → 헬륨 핵 1개. 질량: 4.0291 u → 4.0015 u, 줄어든 질량 <b>0.0276 u(약 0.7 %)</b>가 <b>에너지</b>로 나와요.</li><li>태양은 매초 수소 약 6억 톤을 헬륨으로 바꾸고, 그중 약 4백만 톤이 에너지가 돼요.</li><li>연소(화학 반응)는 원자핵이 그대로이지만, 핵융합은 <b>원자핵이 바뀌어요</b>.</li></ul>',
      missions: [
        {
          title: '헬륨 핵 3개 만들기',
          goal: '중심 온도를 높여 수소 핵을 합쳐서 <b>헬륨 핵 3개</b>를 만드세요.',
          hint: '온도가 낮으면 수소 핵이 서로 밀어내며 튕겨 나가요. 슬라이더를 1000만 K 이상으로 올려 보세요.',
          setup() { ensure('core'); },
          check: () => S.heCount >= 3, hold: 0.3,
          status: () => '🌡 ' + (S.T * 100).toLocaleString('ko-KR') + '만 K · 헬륨 핵 <b>' + S.heCount + ' / 3</b>',
          explain: '온도가 낮을 때는 수소 핵이 (+)전하의 <b>전기적 반발력</b> 때문에 가까이 가도 튕겨 나가요. 약 1000만 K 이상으로 뜨거우면 매우 빠르게 부딪쳐 반발력을 이기고 붙어요. 수소 핵 4개가 헬륨 핵 1개로 합쳐질 때마다 빛 에너지가 나와요.',
        },
        {
          title: '줄어든 질량 구하기',
          goal: '<b>⚖ 질량 비교하기</b>로 두 접시의 질량을 확인하고, 핵융합으로 <b>줄어든 질량(u)</b>을 구해 적으세요.',
          hint: '4.0291 − 4.0015 를 계산해요. 소수점 아래 넷째 자리까지 적어 봐요.',
          manual: true,
          setup() { ensure('core'); },
          check() {
            if (!S.balPressed) return '먼저 <b>⚖ 질량 비교하기</b>를 눌러 두 접시의 질량을 확인해요.';
            const raw = String($('#inDiff').value).trim().replace(',', '.');
            if (!raw) return '줄어든 질량을 입력칸에 적어 주세요. (단위 u)';
            const v = parseFloat(raw);
            if (!isFinite(v)) return '숫자로 적어 주세요.';
            if (Math.abs(v - 0.0276) <= 0.0008) return true;
            if (Math.abs(v - 0.7) <= 0.05) return '0.7은 줄어든 질량의 <b>비율(%)</b>이에요. 줄어든 질량 자체를 u로 적어요.';
            if (Math.abs(v + 0.0276) <= 0.0008) return '줄어든 질량은 양수로 적어요. (큰 값 − 작은 값)';
            return '4.0291 − 4.0015 를 계산해 보세요.';
          },
          explain: '4.0291 u − 4.0015 u = <b>0.0276 u</b> (약 0.7 %)예요. 이 <b>사라진 질량이 에너지</b>로 바뀌어 나와요(질량-에너지 관계 E = mc²). 이 에너지가 별이 수십억 년 동안 빛나는 힘이에요.',
        },
        {
          type: 'quiz', title: '핵융합과 연소의 차이',
          goal: '별이 빛나는 것은 장작이 타는 <b>연소</b>와 같은 현상일까요?',
          setup() { ensure('core'); },
          choices: ['다르다. 핵융합은 원자핵이 바뀌며 줄어든 질량만큼 에너지가 나온다', '같다. 별 속의 수소가 산소와 반응해 타는 것이다', '다르다. 핵융합은 질량이 늘어난 만큼 에너지가 나온다', '같다. 연소도 원자핵이 합쳐지는 반응이다'],
          answer: 0,
          feedback: ['', '별 속에는 산소가 거의 없고, 별의 에너지는 화학 반응(연소)으로는 설명할 수 없을 만큼 커요. 원자핵이 바뀌는 핵융합이에요.', '핵융합에서는 질량이 <b>줄어들어요</b>. (4.0291 u → 4.0015 u)', '연소는 원자의 결합이 바뀌는 화학 반응이라서 원자핵은 그대로예요.'],
          explain: '연소는 원자의 <b>결합(전자)</b>이 바뀌는 화학 반응이고 원자핵은 그대로예요. <b>핵융합</b>은 원자핵 자체가 바뀌어 질량이 조금 줄어들고, 그 질량이 큰 에너지가 돼요. 같은 질량으로 비교하면 핵융합이 훨씬 많은 에너지를 내요.',
        },
      ],
    },
    {
      title: '무거운 별과 양파 껍질', short: '무거운 별', icon: '🧅', phase: '탐구',
      features: ['onion', 'table'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별 중심핵에서 수소가 헬륨이 되는 것을 확인했어요. 수소를 다 쓰고 나면 별은 어떻게 될까요? 그리고 더 무거운 원소는 어떻게 만들어질까요?</div>' +
        '<p>별이 <b>질량에 따라</b> 어디까지 핵융합을 이어 가는지 알아봐요. 수소를 다 쓰면 중심핵이 수축해 더 뜨거워지고, 온도가 충분하면 <b>헬륨 → 탄소·산소 → … → 철</b>로 이어져요. 새 연료를 태울 때마다 <b>양파 껍질</b> 같은 층이 쌓여요.</p>' +
        '<p>질량(1배·8배·20배)과 진화 단계를 고르며 어떤 원소가 만들어지는지 살펴봐요.</p>',
      setup() { enterLevel(2); showHint('🧅 진화 단계를 한 칸씩 넘겨 보세요', 6000); },
      recap: '태양 정도의 별은 탄소·산소까지, 태양 질량의 약 8배 이상인 별은 철까지 핵융합이 이어져 양파 껍질 구조가 돼요.',
      summary: '<table class="mini"><tr><th>별의 질량</th><th>가장 무거운 원소</th><th>마지막 모습</th></tr><tr><td>1배(태양)</td><td>탄소·산소</td><td>행성상 성운 + 백색 왜성</td></tr><tr><td>8배 이상</td><td>철</td><td>철 핵 → (다음 차시) 초신성</td></tr></table><ul><li>큰 별: 수소 → 헬륨 → 탄소 → 네온·산소 → 규소 → <b>철</b> 순서로 핵융합하며 <b>양파 껍질</b> 구조가 돼요.</li><li><b>철</b> 핵융합은 에너지를 내지 못해 핵융합이 멈춰요.</li><li>탄소·질소·산소는 별 속의 핵융합으로 만들어져요.</li></ul>',
      missions: [
        {
          title: '철 핵까지 진화시키기',
          goal: '질량이 <b>20배</b>인 별을 골라 진화 단계를 <b>⑥ 철 핵 완성</b>까지 진행하세요.',
          hint: '질량 20배를 고르고 "다음 단계 ▶"를 다섯 번 눌러요. 층이 하나씩 안쪽에 쌓여요.',
          setup() { ensure('onion'); },
          check: () => S.m3 === 20 && S.st === 5, hold: 1.0,
          status: () => mark(S.m3 === 20) + ' 질량 20배 · ' + mark(S.st === 5) + ' ' + STN[S.st],
          explain: '질량이 큰 별은 중심 온도가 계속 높아져서 <b>헬륨 → 탄소 → 네온·산소 → 규소</b>를 차례로 핵융합해요. 그 결과 별 속에 층이 쌓인 <b>양파 껍질</b> 구조가 되고, 중심에는 <b>철 핵</b>이 만들어져요.',
        },
        {
          title: '질량별로 만드는 가장 무거운 원소',
          goal: '질량 <b>1배, 8배, 20배</b> 별이 핵융합으로 만들 수 있는 <b>가장 무거운 원소</b>를 표에서 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '질량 1배 별은 진화 단계를 넘겨 보면 어디서 멈추는지 알 수 있어요. 8배와 20배도 각각 끝까지 넘겨 봐요.',
          manual: true,
          setup() { ensure('onion'); },
          check() {
            const ks = [1, 8, 20];
            const unset = ks.filter((k) => !S.ans[k]);
            if (unset.length) return '<b>' + unset.map((k) => k + '배').join(', ') + '</b> 별의 원소를 아직 고르지 않았어요. 아래 표 버튼을 눌러요.';
            const bad = ks.filter((k) => S.ans[k] !== ANS_OK[k]);
            ks.forEach((k) => { if (bad.includes(k) && !S.ansBad[k]) { S.ansBad[k] = true; const b = ctl.ans.find((x) => +x.dataset.ans === k); if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } } if (!bad.includes(k)) S.ansBad[k] = false; });
            if (bad.length) return bad.map((k) => '<b>' + k + '배</b> 별: ' + (k === 1 ? '진화 단계를 넘겨 보면 탄소 핵융합이 일어나기 전에 멈춰요.' : '단계를 끝까지 넘기면 어떤 핵이 중심에 생기는지 봐요.')).join('<br>');
            if (!S.ansOK) { S.ansOK = 1; updateCtl(); parts.burst(ONION.c.x, ONION.c.y, { count: 24, speed: 200 }); }
            return true;
          },
          explain: '<b>1배</b>(태양 정도) 별은 온도가 모자라 헬륨 핵융합으로 만든 <b>탄소·산소</b>에서 멈춰요. <b>8배</b> 이상인 별은 규소까지 핵융합을 이어 중심에 <b>철</b>이 만들어져요.',
        },
        {
          type: 'quiz', title: '태양은 왜 철을 만들 수 없을까',
          goal: '태양은 중심에서 철을 만들 수 없어요. 그 까닭은 무엇일까요?',
          setup() { ensure('onion'); },
          choices: ['질량이 작아 중심 온도가 충분히 높아지지 않기 때문이다', '수소가 너무 많아 핵융합이 일어나지 않기 때문이다', '철은 우주에 존재하지 않기 때문이다', '태양은 이미 철 핵융합을 끝냈기 때문이다'],
          answer: 0,
          feedback: ['', '수소가 많은 것은 문제가 아니에요. 더 무거운 원소를 만들려면 더 높은 온도가 필요해요.', '철은 지구에도, 우리 몸속에도 있어요. 다른 별에서 만들어진 거예요.', '태양은 아직 수소를 핵융합하는 중이고, 앞으로도 철까지 가지 못해요.'],
          explain: '핵융합은 원자핵의 (+)전하 반발력을 이겨야 해서 <b>무거운 원소일수록 더 높은 온도</b>가 필요해요. 태양 정도의 질량으로는 중심 온도가 탄소 핵융합이 일어날 만큼 오르지 않아 탄소·산소에서 멈추고, 질량이 큰 별만 철까지 가요.',
        },
      ],
    },
    {
      title: '원소의 고향 찾기', short: '원소의 고향', icon: '🧭', phase: '확인',
      features: ['origin'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별 속에서 핵융합으로 탄소·산소부터 철까지 만들어진다는 것을 알았어요. 그리고 수소·헬륨은 우주 초기에 만들어졌어요.</div>' +
        '<p>원소 카드 8장이 <b>어디에서 만들어졌는지</b> 상자에 분류해 봐요. 철보다 무거운 원소(금)는 다음 차시에서 자세히 배울 <b>초신성 폭발</b>에서 만들어져요.</p>',
      setup() { enterLevel(3); showHint('🧭 카드를 끌어 만들어진 곳에 놓아요', 6000); },
      recap: '수소·헬륨은 우주 초기, 탄소·질소·산소는 별 속 핵융합, 규소·철은 큰 별의 중심핵, 철보다 무거운 원소는 초신성에서 만들어져요.',
      summary: '<table class="mini"><tr><th>만들어진 곳</th><th>원소</th></tr><tr><td>빅뱅 (우주 초기)</td><td>수소, 헬륨</td></tr><tr><td>별 속 핵융합</td><td>탄소, 질소, 산소</td></tr><tr><td>큰 별의 중심핵</td><td>규소, 철</td></tr><tr><td>초신성 폭발</td><td>철보다 무거운 원소(금 등)</td></tr></table><ul><li>우리 몸의 탄소·산소는 오래전 별 속에서 만들어진 원소예요.</li></ul>',
      missions: [
        {
          title: '원소 카드 분류하기',
          goal: '원소 카드 <b>8장</b>을 만들어진 곳 상자에 모두 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '수소·헬륨은 우주 초기, 탄소·질소·산소는 별 속 핵융합, 규소·철은 큰 별의 중심핵, 철보다 무거운 금은 초신성이에요.',
          manual: true,
          setup() { ensure('origin'); },
          check() {
            const un = S.cards.filter((c) => c.bin < 0);
            if (un.length) return '아직 상자에 놓지 않은 카드가 <b>' + un.length + '장</b> 있어요.';
            const bad = S.cards.filter((c) => c.bin !== c.want);
            S.cards.forEach((c) => { c.bad = false; });
            bad.forEach((c) => { c.bad = true; if (!c.shaken) { c.shaken = true; c.shake = 0.5; } });
            S.cards.forEach((c) => { if (!c.bad) c.shaken = false; });
            if (bad.length) return '<b>' + bad.map((c) => c.name).join(', ') + '</b>의 자리를 다시 생각해 보세요. ' + TIPS[bad[0].id];
            if (!S.originOK) { S.originOK = 1; BINS.forEach((b, i) => { const r = binRect(i); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 10, speed: 120, size: 3, life: 0.7 }); }); }
            return true;
          },
          explain: '<b>수소·헬륨</b>은 우주 초기(빅뱅 후 약 3분), <b>탄소·질소·산소</b>는 별 속 핵융합, <b>규소·철</b>은 질량이 큰 별의 중심핵에서 만들어졌어요. <b>금</b>처럼 철보다 무거운 원소는 초신성 폭발에서 만들어져요(다음 차시).',
        },
        {
          type: 'quiz', title: '우리 몸의 탄소와 산소',
          goal: '우리 몸을 이루는 <b>탄소와 산소</b>는 어디에서 왔을까요?',
          setup() { ensure('origin'); },
          choices: ['오래전 별 속의 핵융합으로 만들어져 우주로 퍼진 물질에서 왔다', '빅뱅 때 수소와 함께 만들어졌다', '지구가 생기면서 새로 만들어졌다', '사람 몸 안에서 수소가 합쳐져 만들어진다'],
          answer: 0,
          feedback: ['', '빅뱅 때는 수소와 헬륨이 대부분 만들어졌고, 탄소와 산소는 거의 만들어지지 않았어요.', '지구 같은 행성은 이미 있던 원소를 재료로 만들어졌어요. 새 원소를 만들지는 않아요.', '우리 몸속에서는 핵융합이 일어나지 않아요. 핵융합은 아주 뜨거운 별의 중심에서만 일어나요.'],
          explain: '우리 몸의 탄소·산소는 <b>오래전 별 속에서</b> 핵융합으로 만들어진 원소예요. 그 별이 죽으며 우주로 흩어진 물질이 태양계와 지구, 그리고 우리의 재료가 되었어요. 몸속 수소는 빅뱅 때 만들어진 거예요. 그래서 지구와 생명의 역사는 <b>우주 역사의 일부분</b>이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-stellar-fusion', mount: '#game', badge: '별의 연금술사', homeHref: '../../index.html#h1a',
    featureLabels: {
      birth: '⭐ 별 탄생 장면 · 수명 그래프', mass: '⚖ 별의 질량 버튼', core: '🔍 중심핵 확대 모형 · 🌡 온도 조절', balance: '⚖ 질량 저울', onion: '🧅 양파 껍질 모형 · 진화 단계', table: '📋 가장 무거운 원소 표', origin: '🧭 원소 카드 · 분류 상자',
    },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initCore(); initOrigin(); restartBirth(); S.birth = 0;
  updateCtl();
  let lastFree = false, lastStep = -1;
  SciSim.loop((dt, tt) => {
    S.t = tt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (stepNo() !== lastStep) { lastStep = stepNo(); updateCtl(); }
    if (S.mode === 'life') stepLife(dt);
    if (S.mode === 'core') stepCore(dt);
    if (S.mode === 'onion') stepOnion(dt);
    if (S.mode === 'origin') stepOrigin(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    drawBg(tt);
    if (S.mode === 'life') drawLife(tt);
    else if (S.mode === 'core') drawCore(tt);
    else if (S.mode === 'onion') drawOnion(tt);
    else drawOrigin(tt);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(7,11,26,' + S.fade * 0.9 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 8); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, LIFE, CORE, ONION, BINS, get game() { return game; }, enterLevel, setScene, setMass, setM3, setSt, restartBirth, binRect, poolRect, updateCtl, initCore, initOrigin,
    setT(v) { S.T = v; sTemp.value = v; bTemp.refresh(); },
    place(right) { S.cards.forEach((c, i) => { c.bin = right ? c.want : (c.want + 1) % 4; }); },
    MKEYS, ANS_OK, stepCore, v0,
  };
})();
