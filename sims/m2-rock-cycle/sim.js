/* =========================================================
   중2 Ⅱ. 지권의 변화 - 암석의 생성과 순환  [9과09-03]
   탐구 흐름(4단계):
   ① 실험: 마그마의 색과 식는 빠르기에 따라 결정 크기가 달라지는 것을 보고 화성암 4종(현무암·유문암·반려암·화강암)을 분류
   ② 모형: 퇴적물(자갈·모래·진흙·석회 물질)이 쌓이고 다져지고 굳어 퇴적암(역암·사암·이암·석회암)이 되는 과정
   ③ 모형: 열과 압력으로 이암→편암→편마암(엽리), 사암→규암, 석회암→대리암으로 변하는 과정
   ④ 적용: 암석의 순환도에 풍화·침식, 퇴적·굳음, 열과 압력, 녹음, 냉각을 붙이기
   범위: 화성암(현무암·유문암·화강암·반려암), 퇴적암(이암·사암·역암·석회암), 변성암(편암·편마암·대리암·규암)만 다룸
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp } = SciSim;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;
  const RM = !!SciSim.reduceMotion;
  const shade = SciSim.color.shade, rgba = SciSim.color.rgba, mixc = SciSim.color.mix;
  const EZ = SciSim.ease, approach = SciSim.approach;
  const nowS = () => performance.now() / 1000;
  const FRAME = '#140f18';

  /* =========================================================
     공통 그리기 도우미
     ========================================================= */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(ix, iy, seed) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(x, y, seed, oct) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, y * f, seed + i * 17); f *= 2; a *= 0.5; }
    return v / (1 - Math.pow(0.5, oct));
  }
  // 가로·세로로 이어 붙여도 이음새가 없는 잡음 (무늬 타일용)
  function pnoise(x, y, px, py, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const mx = (v) => ((v % px) + px) % px, my = (v) => ((v % py) + py) % py;
    const a = hash2(mx(ix), my(iy), seed), b = hash2(mx(ix + 1), my(iy), seed), c = hash2(mx(ix), my(iy + 1), seed), d = hash2(mx(ix + 1), my(iy + 1), seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function pfbm(x, y, px, py, seed, oct) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * pnoise(x * f, y * f, px * f, py * f, seed + i * 17); f *= 2; a *= 0.5; }
    return v / (1 - Math.pow(0.5, oct));
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); }
  const fnt = (L, px, weight) => (weight ? weight + ' ' : '') + Math.round(px * L.fs * 10) / 10 + 'px ' + FONT;
  const dfnt = (L, px) => Math.round(px * L.fs) + 'px ' + DISPLAY;
  function pill(ctx, text, x, y, o) {
    o = o || {};
    ctx.font = o.font || 'bold 13px ' + FONT;
    const w = ctx.measureText(text).width, h = o.h || 24, pad = o.pad || 10;
    const bx = o.align === 'left' ? x : o.align === 'right' ? x - w - pad * 2 : x - w / 2 - pad;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.fillStyle = o.bg || 'rgba(6,10,26,.78)';
    roundRect(ctx, bx, y - h / 2, w + pad * 2, h, h / 2); ctx.fill();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1.4; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + pad, y + 0.5);
    ctx.restore();
    return { x: bx, y: y - h / 2, w: w + pad * 2, h };
  }
  // 글자를 가로 폭에 맞춰 줄바꿈 (공백 기준, 필요하면 글자 단위)
  function wrapLines(ctx, text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    words.forEach((w) => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW || !line) {
        if (!line && ctx.measureText(w).width > maxW) {
          let part = '';
          for (const ch of w) { if (ctx.measureText(part + ch).width > maxW && part) { lines.push(part); part = ch; } else part += ch; }
          line = part;
        } else line = test;
      } else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines;
  }
  function drawWrapped(ctx, text, x, y, maxW, lh, maxLines) {
    const lines = wrapLines(ctx, text, maxW), n = maxLines ? Math.min(maxLines, lines.length) : lines.length;
    for (let i = 0; i < n; i++) ctx.fillText(lines[i], x, y + i * lh);
    return n;
  }
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // 살짝 튕기며 자리 잡는 스프링 (o: {x, y, vx, vy})
  function springTo(o, tx, ty, dt, k, c) {
    if (RM) { o.x = tx; o.y = ty; o.vx = o.vy = 0; return; }
    const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
    for (let i = 0; i < n; i++) {
      o.vx += (k * (tx - o.x) - c * o.vx) * h; o.vy += (k * (ty - o.y) - c * o.vy) * h;
      o.x += o.vx * h; o.y += o.vy * h;
    }
  }


  /* =========================================================
     우주 배경 · 공통 부품
     ========================================================= */
  function makeStars(rect, n, seed) {
    const r = rng(seed), a = [];
    for (let i = 0; i < n; i++) {
      const c = r();
      a.push({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, s: 0.5 + Math.pow(r(), 1.8) * 1.5, p: r() * TAU, k: 0.6 + r() * 1.8, c: c < 0.14 ? '#ffe7c2' : c < 0.3 ? '#cfe0ff' : '#eef3ff' });
    }
    return a;
  }
  function drawStars(ctx, stars, t, alpha) {
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const tw = RM ? 0.7 : 0.45 + 0.4 * Math.sin(t * s.k + s.p);
      ctx.globalAlpha = alpha * tw; ctx.fillStyle = s.c;
      if (s.s > 1.45) {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s * 0.75, 0, TAU); ctx.fill();
        ctx.globalAlpha = alpha * tw * 0.35; ctx.fillRect(s.x - s.s * 2.2, s.y - 0.4, s.s * 4.4, 0.8); ctx.fillRect(s.x - 0.4, s.y - s.s * 2.2, 0.8, s.s * 4.4);
      } else ctx.fillRect(s.x, s.y, s.s * 1.3, s.s * 1.3);
    }
    ctx.globalAlpha = 1;
  }
  function spacePanel(ctx, P, stars, t) {
    roundRect(ctx, P.x, P.y, P.w, P.h, 16);
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, '#0c1636'); g.addColorStop(1, '#1b2d60');
    ctx.fillStyle = g; ctx.fill();
    if (stars) drawStars(ctx, stars, t, 0.75);
    roundRect(ctx, P.x, P.y, P.w, P.h, 16);
    ctx.strokeStyle = 'rgba(160,190,255,.28)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function ringFx(V, x, y, r, col) { V.fx.push({ x, y, r, col: col || '#34d399', t0: nowS() }); }
  function drawFx(ctx, V) {
    const n = nowS();
    for (let i = V.fx.length - 1; i >= 0; i--) {
      const f = V.fx[i], a = (n - f.t0) / 0.6;
      if (a >= 1) { V.fx.splice(i, 1); continue; }
      ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - a; ctx.lineWidth = 3 * (1 - a) + 1;
      circle(ctx, f.x, f.y, f.r + a * Math.min(f.r * 1.4, 36) + 4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // 캔버스 안 안내 띠
  function hintBar(ctx, L, rect, text, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.font = fnt(L, 15, 'bold');
    const lines = wrapLines(ctx, text, rect.w - 28 * L.fs), lh = 20 * L.fs, h = Math.max(36 * L.fs, lines.length * lh + 14 * L.fs);
    const y = rect.y + (rect.h - h) / 2;
    roundRect(ctx, rect.x, y, rect.w, h, 14);
    ctx.fillStyle = o.bg || 'rgba(10,18,44,.82)'; ctx.fill();
    ctx.strokeStyle = o.stroke || 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = o.color || '#e8efff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((ln, i) => ctx.fillText(ln, rect.x + rect.w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * lh + 0.5));
    ctx.restore();
  }


  /* =========================================================
     자료
     ========================================================= */
  // 화성암: 마그마의 색 × 식는 곳(빠르게=화산암, 천천히=심성암)
  const IG = {
    'dark-fast': { name: '현무암', kind: '화산암', color: '어두운색', size: '작음', desc: '지표 가까이에서 빨리 식어 결정이 아주 작아요' },
    'light-fast': { name: '유문암', kind: '화산암', color: '밝은색', size: '작음', desc: '지표 가까이에서 빨리 식어 결정이 아주 작아요' },
    'dark-slow': { name: '반려암', kind: '심성암', color: '어두운색', size: '큼', desc: '땅속 깊은 곳에서 천천히 식어 결정이 커요' },
    'light-slow': { name: '화강암', kind: '심성암', color: '밝은색', size: '큼', desc: '땅속 깊은 곳에서 천천히 식어 결정이 커요' },
  };
  const SED = {
    gravel: { id: 'gravel', name: '자갈', emoji: '🪨', rock: '역암', h0: 74, k: 0.1, col: '#8a8178', rockCol: '#7d756c', desc: '자갈이 모래·진흙과 함께 굳은 암석' },
    sand: { id: 'sand', name: '모래', emoji: '🏖️', rock: '사암', h0: 62, k: 0.24, col: '#d9bd7e', rockCol: '#c9a45e', desc: '모래알이 굳은 암석' },
    mud: { id: 'mud', name: '진흙', emoji: '🟤', rock: '이암', h0: 56, k: 0.5, col: '#6b5a50', rockCol: '#5a4a42', desc: '아주 작은 진흙 알갱이가 굳은 암석' },
    lime: { id: 'lime', name: '석회 물질', emoji: '🐚', rock: '석회암', h0: 60, k: 0.3, col: '#e9e1c8', rockCol: '#d9d0b4', desc: '석회질 조개 껍데기·산호 등이 굳은 암석' },
  };
  const SEDIDS = ['gravel', 'sand', 'mud', 'lime'];
  const META = {
    mud: { id: 'mud', name: '이암', stages: ['이암', '편암', '편마암'] },
    sand: { id: 'sand', name: '사암', stages: ['사암', '규암'] },
    lime: { id: 'lime', name: '석회암', stages: ['석회암', '대리암'] },
  };
  const metaStageOf = (rid, p) => {
    if (rid === 'mud') return p < 0.3 ? 0 : p < 0.66 ? 1 : 2;
    return p < 0.4 ? 0 : 1;
  };
  const CYC_PROCS = [
    { id: 'cool', name: '냉각', emoji: '❄️' },
    { id: 'weather', name: '풍화·침식', emoji: '🌬️' },
    { id: 'deposit', name: '퇴적·굳음', emoji: '⏬' },
    { id: 'heatp', name: '열과 압력', emoji: '🔥' },
    { id: 'melt', name: '녹음', emoji: '🫠' },
  ];
  const CP = {}; CYC_PROCS.forEach((c) => (CP[c.id] = c));
  // 순환도 노드: 시계 방향 (위 → 오른쪽 → …)
  const CYC_NODES = [
    { id: 'igneous', name: '화성암', emoji: '🌋', color: '#e0662a', rock: true },
    { id: 'sediment', name: '퇴적물', emoji: '🏖️', color: '#d9a441', rock: false },
    { id: 'sedrock', name: '퇴적암', emoji: '🪨', color: '#b07a3c', rock: true },
    { id: 'meta', name: '변성암', emoji: '💠', color: '#7b6cf0', rock: true },
    { id: 'magma', name: '마그마', emoji: '🔥', color: '#ef4444', rock: false },
  ];
  // 5개의 큰 화살표: from → to, 정답 과정
  const CYC_ARROWS = [
    { id: 'a1', from: 'magma', to: 'igneous', proc: 'cool' },
    { id: 'a2', from: 'igneous', to: 'sediment', proc: 'weather' },
    { id: 'a3', from: 'sediment', to: 'sedrock', proc: 'deposit' },
    { id: 'a4', from: 'sedrock', to: 'meta', proc: 'heatp' },
    { id: 'a5', from: 'meta', to: 'magma', proc: 'melt' },
  ];
  // 다른 길(점선): 어떤 암석이든 풍화·침식되고, 녹고, 열과 압력을 받을 수 있어요
  const CYC_EXTRA = [
    { id: 'x1', from: 'sedrock', to: 'sediment', proc: 'weather' },
    { id: 'x2', from: 'meta', to: 'sediment', proc: 'weather' },
    { id: 'x3', from: 'igneous', to: 'meta', proc: 'heatp' },
    { id: 'x4', from: 'igneous', to: 'magma', proc: 'melt' },
    { id: 'x5', from: 'sedrock', to: 'magma', proc: 'melt' },
    { id: 'x6', from: 'meta', to: 'meta', proc: 'heatp' },
  ];

  /* =========================================================
     화면 배치 · 상태
     ========================================================= */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 640, fs: 1 },
    tall: { key: 'tall', vw: 520, vh: 846, fs: 1.2 },
  };
  const S = {
    scene: 'igneous',        // igneous | sed | meta | cycle
    // 1단계: 화성암
    ig: { dark: true, v: 0, vs: 0, darkS: 1, heatS: 1, cooling: false, waiting: false, tau: 0, T: 3, done: false, key: '', G: null, A: null, made: new Set(), dragging: false, fly: null, pop: {}, smokeAcc: 0, sparkAcc: 0 },
    // 2단계: 퇴적암
    sed: { layers: [], pour: null, grains: [], press: 0, pressS: 0, sel: -1, made: new Set(), bubbleAcc: 0, rewind: false },
    // 3단계: 변성암
    meta: { rock: 'mud', p: 0, ps: 0, made: new Set(), drag: null, swap: 1 },
    // 4단계: 순환
    cyc: { slots: {}, sel: null, drag: null, shake: {}, extra: false, extraS: 0, done: false, born: 0, wrong: {}, chips: {} },
    tipText: null, fade: 1, stamp: null, lastPhase: '', speed: 1,
  };
  let game = null;
  let FEAT = new Set();
  const isFree = () => !!(game && game.free);
  function frameOf(L, trayH) {
    if (L.key === 'wide') return { M: { x: 12, y: 12, w: 776, h: L.vh - 24 - trayH }, T: { x: 12, y: L.vh - 12 - trayH + 10, w: 776, h: trayH - 10 } };
    return { M: { x: 10, y: 10, w: 500, h: L.vh - 20 - trayH }, T: { x: 10, y: L.vh - 10 - trayH + 10, w: 500, h: trayH - 10 } };
  }
  // 화면 바탕 (어두운 흙빛 판)
  function earthPanel(ctx, P, t, o) {
    o = o || {};
    roundRect(ctx, P.x, P.y, P.w, P.h, 16);
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, o.top || '#2b2230'); g.addColorStop(1, o.bottom || '#161019');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); roundRect(ctx, P.x, P.y, P.w, P.h, 16); ctx.clip();
    const sp = ctx.createRadialGradient(P.x + P.w * 0.25, P.y, 10, P.x + P.w * 0.25, P.y, P.w * 0.8);
    sp.addColorStop(0, 'rgba(255,226,190,.14)'); sp.addColorStop(1, 'rgba(255,226,190,0)');
    ctx.fillStyle = sp; ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.restore();
    roundRect(ctx, P.x, P.y, P.w, P.h, 16); ctx.strokeStyle = 'rgba(255,214,170,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  /* =========================================================
     시간 나눠 만들기 (무거운 그림은 한 프레임에 몇 ms씩만 계산해요)
     ========================================================= */
  const BQ = [];
  let BEND = 0;
  const overBudget = () => performance.now() > BEND;
  function queueJob(gen, done, first) {
    const j = { gen, done };
    if (first) BQ.unshift(j); else BQ.push(j);
  }
  function pumpJobs(ms) {
    if (!BQ.length) return;
    BEND = performance.now() + ms;
    while (BQ.length && performance.now() < BEND) {
      const j = BQ[0];
      let r;
      try { r = j.gen.next(); } catch (e) { console.error(e); BQ.shift(); continue; }
      if (r.done) { BQ.shift(); try { if (j.done) j.done(r.value); } catch (e) { console.error(e); } }
    }
  }

  /* =========================================================
     결정 격자: 씨앗(핵)에서 사방으로 자라는 결정 (Johnson-Mehl 모형)
     arr = 그 칸이 결정이 되는 때(0~1), own = 어느 결정인지, ed = 결정 경계까지 거리
     ========================================================= */
  const GN = 128;
  function* cellsGen(o) {
    const N = GN, R = N / 2, rnd = rng(o.seed), M = o.M;
    const sx = new Float32Array(M), sy = new Float32Array(M), st = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      let bx = 0, by = 0, bd = -1;
      const K = i === 0 ? 1 : 5;
      for (let k = 0; k < K; k++) {
        let x, y;
        do { x = rnd() * N; y = rnd() * N; } while ((x - R) * (x - R) + (y - R) * (y - R) > R * R * 1.04);
        let d = 1e9;
        for (let j = 0; j < i; j++) { const dx = x - sx[j], dy = y - sy[j], dd = dx * dx + dy * dy; if (dd < d) d = dd; }
        if (d > bd) { bd = d; bx = x; by = y; }
      }
      sx[i] = bx; sy[i] = by; st[i] = rnd() * o.spread;
    }
    const own = new Uint16Array(N * N).fill(65535), arr = new Float32Array(N * N);
    const g = o.gscale / R;
    let mn = 1e9, mx = 0, cnt = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const dx0 = x + 0.5 - R, dy0 = y + 0.5 - R;
        if (dx0 * dx0 + dy0 * dy0 > R * R) continue;
        let best = 1e9, bi = 0;
        for (let i = 0; i < M; i++) {
          const ex = x + 0.5 - sx[i], ey = y + 0.5 - sy[i];
          const t = st[i] + Math.sqrt(ex * ex + ey * ey) * g;
          if (t < best) { best = t; bi = i; }
        }
        const k = y * N + x;
        own[k] = bi; arr[k] = best; cnt++;
        if (best < mn) mn = best;
        if (best > mx) mx = best;
      }
      if (overBudget()) yield;
    }
    const valid = new Int32Array(cnt);
    let vi = 0;
    const span = Math.max(1e-6, mx - mn);
    for (let k = 0; k < N * N; k++) if (own[k] !== 65535) { valid[vi++] = k; arr[k] = 0.04 + 0.96 * (arr[k] - mn) / span; }
    yield;
    // 결정 경계까지의 거리 (두 번 훑는 근사)
    const ed = new Float32Array(N * N).fill(99);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const k = y * N + x, a = own[k];
        if (a === 65535) continue;
        let e = false;
        if (x + 1 < N) { const b = own[k + 1]; if (b !== 65535 && b !== a) { e = true; ed[k + 1] = 0; } }
        if (y + 1 < N) { const b = own[k + N]; if (b !== 65535 && b !== a) { e = true; ed[k + N] = 0; } }
        if (e) ed[k] = 0;
      }
    }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const k = y * N + x;
        if (own[k] === 65535) continue;
        let d = ed[k];
        if (x > 0) d = Math.min(d, ed[k - 1] + 1);
        if (y > 0) {
          d = Math.min(d, ed[k - N] + 1);
          if (x > 0) d = Math.min(d, ed[k - N - 1] + 1.41);
          if (x + 1 < N) d = Math.min(d, ed[k - N + 1] + 1.41);
        }
        ed[k] = d;
      }
    }
    for (let y = N - 1; y >= 0; y--) {
      for (let x = N - 1; x >= 0; x--) {
        const k = y * N + x;
        if (own[k] === 65535) continue;
        let d = ed[k];
        if (x + 1 < N) d = Math.min(d, ed[k + 1] + 1);
        if (y + 1 < N) {
          d = Math.min(d, ed[k + N] + 1);
          if (x + 1 < N) d = Math.min(d, ed[k + N + 1] + 1.41);
          if (x > 0) d = Math.min(d, ed[k + N - 1] + 1.41);
        }
        ed[k] = d;
      }
      if ((y & 15) === 0 && overBudget()) yield;
    }
    const nz = new Float32Array(N * N);
    for (let i = 0; i < valid.length; i++) {
      const k = valid[i], x = k % N, y = (k / N) | 0;
      nz[k] = fbm(x * 0.07, y * 0.07, o.seed + 5, 3);
    }
    return { N, M, own, arr, ed, nz, valid, sx, sy };
  }

  /* =========================================================
     암석 무늬 (작은 그림 96x72 · 큰 그림 216x162)
     ========================================================= */
  const WO = { d1: 0, d2: 0, id: 0 };
  function worley(u, v, cell, seed) {
    const gx = Math.floor(u / cell), gy = Math.floor(v / cell);
    let d1 = 1e9, d2 = 1e9, id = 0;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const cx = gx + i, cy = gy + j;
        const fx = (cx + 0.12 + 0.76 * hash2(cx, cy, seed)) * cell, fy = (cy + 0.12 + 0.76 * hash2(cx, cy, seed + 91)) * cell;
        const dx = u - fx, dy = v - fy, d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; id = ((cx & 255) << 8) | (cy & 255); } else if (d < d2) d2 = d;
      }
    }
    WO.d1 = Math.sqrt(d1); WO.d2 = Math.sqrt(d2); WO.id = id;
    return WO;
  }
  const ROCKS = {
    basalt: { name: '현무암', col: '#34343c' }, rhyolite: { name: '유문암', col: '#d6c0b4' }, gabbro: { name: '반려암', col: '#4a524e' }, granite: { name: '화강암', col: '#d9b8a6' },
    conglomerate: { name: '역암', col: '#8a7a66' }, sandstone: { name: '사암', col: '#c9a45e' }, mudstone: { name: '이암', col: '#5f5048' }, limestone: { name: '석회암', col: '#ddd5bb' },
    schist: { name: '편암', col: '#8a948f' }, gneiss: { name: '편마암', col: '#9a928a' }, marble: { name: '대리암', col: '#eee9de' }, quartzite: { name: '규암', col: '#e2d6cb' },
  };
  const IG_ROCK = { 'dark-fast': 'basalt', 'light-fast': 'rhyolite', 'dark-slow': 'gabbro', 'light-slow': 'granite' };
  const SED_ROCK = { gravel: 'conglomerate', sand: 'sandstone', mud: 'mudstone', lime: 'limestone' };
  const META_ROCKS = { mud: ['mudstone', 'schist', 'gneiss'], sand: ['sandstone', 'quartzite'], lime: ['limestone', 'marble'] };
  const L3 = (o, a, b, t) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; };
  const MUL = (o, f) => { o[0] *= f; o[1] *= f; o[2] *= f; };
  function rockPx(id, W) {
    const s = W / 96, sd = 17 + id.length * 13 + id.charCodeAt(0);
    const gr = (x, y, a) => 1 + (hash2(x, y, sd) - 0.5) * a;
    const rr = rng(sd * 3 + 1);
    switch (id) {
      case 'granite': {
        const PINK = [[232, 184, 164], [221, 160, 140], [236, 198, 178]], WH = [[240, 233, 224], [226, 220, 212]], QZ = [[196, 201, 206], [176, 182, 189], [208, 212, 214]], BK = [[43, 38, 36], [30, 27, 26]];
        return (x, y, o) => {
          const u = x / s, v = y / s, w = worley(u, v, 11, sd), h = hash2(w.id, 3, sd);
          const c = h < 0.40 ? PINK[(h * 77 | 0) % 3] : h < 0.52 ? WH[0] : h < 0.78 ? QZ[(h * 91 | 0) % 3] : h < 0.88 ? WH[1] : BK[(h * 53 | 0) % 2];
          o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
          MUL(o, (0.74 + 0.26 * smooth(0, 1.4, w.d2 - w.d1)) * (0.93 + 0.14 * fbm(u * 0.35, v * 0.35, sd, 2)) * gr(x, y, 0.1));
        };
      }
      case 'rhyolite': {
        const A = [221, 200, 188], B = [194, 160, 148], C = [234, 226, 216], K = [92, 78, 72];
        return (x, y, o) => {
          const u = x / s, v = y / s, band = 0.5 + 0.5 * Math.sin(v * 0.5 + 6 * fbm(u * 0.05, v * 0.1, sd, 3) + u * 0.05);
          const w = worley(u, v, 2.6, sd), h = hash2(w.id, 5, sd);
          L3(o, A, band > 0.5 ? B : C, Math.abs(band - 0.5) * 1.4);
          if (h > 0.9) L3(o, o, K, 0.7); else if (h > 0.8) L3(o, o, C, 0.5);
          MUL(o, (0.9 + 0.1 * smooth(0, 0.7, w.d2 - w.d1)) * gr(x, y, 0.13));
        };
      }
      case 'basalt': {
        const ves = []; for (let i = 0; i < 9; i++) ves.push({ x: 6 + rr() * 84, y: 6 + rr() * 60, r: 1.6 + rr() * 3.4 });
        return (x, y, o) => {
          const u = x / s, v = y / s, n = fbm(u * 0.2, v * 0.2, sd, 3), w = worley(u, v, 2.8, sd);
          o[0] = 44 + n * 22; o[1] = 44 + n * 22; o[2] = 52 + n * 24;
          if (hash2(w.id, 9, sd) > 0.93) { o[0] += 70; o[1] += 70; o[2] += 76; }
          MUL(o, (0.9 + 0.1 * smooth(0, 0.6, w.d2 - w.d1)) * gr(x, y, 0.14));
          for (let i = 0; i < ves.length; i++) {
            const q = ves[i], dx = u - q.x, dy = v - q.y, d = Math.sqrt(dx * dx + dy * dy) / q.r;
            if (d < 1) { const lit = clamp((dx + dy) / q.r * 0.5 + 0.35, 0, 1); o[0] = 12 + 40 * lit * lit; o[1] = 12 + 40 * lit * lit; o[2] = 16 + 44 * lit * lit; break; }
            if (d < 1.35) MUL(o, d < 1.15 ? 0.7 : 1.16);
          }
        };
      }
      case 'gabbro': {
        const DK = [[38, 46, 42], [28, 33, 31], [48, 56, 50]], PL = [[152, 158, 160], [178, 182, 182]], OL = [[92, 110, 60]];
        return (x, y, o) => {
          const u = x / s, v = y / s, w = worley(u, v, 9, sd), h = hash2(w.id, 3, sd);
          const c = h < 0.52 ? DK[(h * 99 | 0) % 3] : h < 0.86 ? PL[(h * 77 | 0) % 2] : OL[0];
          o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
          MUL(o, (0.7 + 0.3 * smooth(0, 1.4, w.d2 - w.d1)) * (0.92 + 0.16 * fbm(u * 0.4, v * 0.4, sd, 2)) * gr(x, y, 0.1));
        };
      }
      case 'conglomerate': {
        const CL = [[125, 117, 108], [169, 155, 134], [94, 86, 79], [181, 165, 143], [140, 111, 90], [112, 118, 120]], peb = [];
        for (let i = 0; i < 22; i++) peb.push({ x: rr() * 96, y: rr() * 72, rx: 5 + rr() * 6, ry: 4 + rr() * 5, c: CL[(rr() * CL.length) | 0], a: rr() * 3 });
        return (x, y, o) => {
          const u = x / s, v = y / s;
          const n = fbm(u * 0.3, v * 0.3, sd, 3);
          o[0] = 158 + n * 24; o[1] = 140 + n * 22; o[2] = 114 + n * 20; MUL(o, gr(x, y, 0.2));
          for (let i = peb.length - 1; i >= 0; i--) {
            const q = peb[i], ca = Math.cos(q.a), sa = Math.sin(q.a), dx = u - q.x, dy = v - q.y;
            const px = (dx * ca + dy * sa) / q.rx, py = (-dx * sa + dy * ca) / q.ry, d = px * px + py * py;
            if (d < 1) { const lit = 0.62 + 0.5 * clamp(-(dx + dy) / (q.rx + q.ry) * 1.3 + 0.35, -0.4, 0.8); o[0] = q.c[0] * lit; o[1] = q.c[1] * lit; o[2] = q.c[2] * lit; MUL(o, gr(x, y, 0.1)); if (d > 0.82) MUL(o, 0.8); break; }
          }
        };
      }
      case 'sandstone': {
        const A = [205, 168, 98], B = [188, 148, 82];
        return (x, y, o) => {
          const u = x / s, v = y / s, band = 0.5 + 0.5 * Math.sin(v * 0.42 + 4 * fbm(u * 0.04, v * 0.08, sd, 2));
          L3(o, A, B, band);
          const h = hash2(x, y, sd);
          if (h > 0.97) { o[0] = 120; o[1] = 92; o[2] = 60; } else if (h < 0.02) { o[0] = 240; o[1] = 224; o[2] = 190; }
          MUL(o, gr(x, y, 0.2) * (0.94 + 0.12 * fbm(u * 0.3, v * 0.3, sd, 2)));
        };
      }
      case 'mudstone': {
        const A = [100, 85, 76], B = [80, 66, 59];
        return (x, y, o) => {
          const u = x / s, v = y / s, lam = 0.5 + 0.5 * Math.sin(v * 1.7 + 3 * fbm(u * 0.04, v * 0.1, sd, 2));
          L3(o, A, B, lam); MUL(o, (0.93 + 0.14 * fbm(u * 0.25, v * 0.25, sd, 3)) * gr(x, y, 0.06));
        };
      }
      case 'limestone': {
        const sh = []; for (let i = 0; i < 7; i++) sh.push({ x: 8 + rr() * 80, y: 8 + rr() * 56, r: 3 + rr() * 4.5, a: rr() * 6 });
        return (x, y, o) => {
          const u = x / s, v = y / s, n = fbm(u * 0.25, v * 0.25, sd, 3);
          o[0] = 214 + n * 20; o[1] = 206 + n * 20; o[2] = 178 + n * 20; MUL(o, gr(x, y, 0.12));
          if (hash2(x, y, sd + 4) > 0.985) { o[0] = 130; o[1] = 120; o[2] = 100; }
          for (let i = 0; i < sh.length; i++) {
            const q = sh[i], dx = u - q.x, dy = v - q.y, d = Math.sqrt(dx * dx + dy * dy) / q.r;
            if (d < 1.12) {
              const ang = Math.atan2(dy, dx) + q.a, rib = 0.5 + 0.5 * Math.cos(ang * 6);
              if (d > 0.95) { o[0] = 120; o[1] = 108; o[2] = 88; } else if (d > 0.3) { const t = 0.84 + 0.16 * rib; o[0] = 246 * t; o[1] = 240 * t; o[2] = 224 * t; } else { o[0] = 178; o[1] = 164; o[2] = 134; }
              break;
            }
          }
        };
      }
      case 'schist': {
        const LT = [214, 222, 219], MD = [146, 156, 151], DK = [96, 106, 102];
        return (x, y, o) => {
          const u = x / s, v = y / s, wv = v + 5 * Math.sin(u * 0.12 + 3 * fbm(u * 0.03, v * 0.06, sd, 2)) + 3 * fbm(u * 0.1, v * 0.05, sd + 3, 2);
          const st = 0.5 + 0.5 * Math.sin(wv * 1.35), fl = fbm(u * 0.55, wv * 0.2, sd + 8, 3);
          L3(o, DK, MD, smooth(0.12, 0.7, st));
          if (fl > 0.52) L3(o, o, LT, smooth(0.52, 0.72, fl) * (0.4 + 0.6 * st));
          MUL(o, gr(x, y, 0.12));
          if (hash2(x, y, sd + 2) > 0.988) { o[0] = 250; o[1] = 252; o[2] = 250; }
        };
      }
      case 'gneiss': {
        const LA = [232, 222, 208], LB = [214, 184, 168], DKA = [52, 46, 44], DKB = [74, 66, 62];
        return (x, y, o) => {
          const u = x / s, v = y / s, b = v * 0.1 + 2.3 * fbm(u * 0.022, v * 0.03, sd, 3) + 0.5 * Math.sin(u * 0.05);
          const k = Math.floor(b), f = b - k, dark = hash2(k, 2, sd) > 0.5;
          const w = worley(u * 0.55, v, 3.4, sd), h = hash2(w.id, 1, sd);
          const c = dark ? (h > 0.5 ? DKA : DKB) : (h > 0.55 ? LA : LB);
          o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
          const edge = smooth(0, 0.08, f) * smooth(0, 0.08, 1 - f);
          if (!dark && edge < 1) L3(o, DKA, o, 0.5 + 0.5 * edge);
          MUL(o, (0.88 + 0.12 * smooth(0, 1, w.d2 - w.d1)) * gr(x, y, 0.12));
        };
      }
      case 'marble': {
        const A = [239, 235, 226], V = [174, 169, 160];
        return (x, y, o) => {
          const u = x / s, v = y / s, rd = 1 - Math.abs(2 * fbm(u * 0.04 + 3, v * 0.07, sd, 4) - 1);
          const w = worley(u, v, 4.2, sd), h = hash2(w.id, 6, sd);
          L3(o, A, V, smooth(0.86, 0.97, rd) * 0.85);
          MUL(o, (0.96 + 0.06 * h) * (0.94 + 0.06 * smooth(0, 0.8, w.d2 - w.d1)) * gr(x, y, 0.05));
          if (hash2(x, y, sd + 1) > 0.992) { o[0] = 255; o[1] = 255; o[2] = 255; }
        };
      }
      case 'quartzite': {
        const GS = [[232, 222, 212], [218, 206, 196], [240, 232, 224], [204, 198, 196]];
        return (x, y, o) => {
          const u = x / s, v = y / s, w = worley(u, v, 4.8, sd), h = hash2(w.id, 4, sd);
          const c = GS[(h * 97 | 0) % 4]; o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
          const st = fbm(u * 0.08, v * 0.1, sd + 6, 3);
          if (st > 0.58) L3(o, o, [214, 170, 140], smooth(0.58, 0.74, st) * 0.55);
          MUL(o, (0.95 + 0.05 * smooth(0, 0.6, w.d2 - w.d1)) * gr(x, y, 0.06));
        };
      }
      default: return (x, y, o) => { o[0] = o[1] = o[2] = 128; };
    }
  }
  const ROCK_ICON = {}, ROCK_BIG = {};
  function* rockGen(id, W, H) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), img = c.createImageData(W, H), d = img.data, o = [0, 0, 0], px = rockPx(id, W);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) { px(x, y, o); const k = (y * W + x) * 4; d[k] = o[0]; d[k + 1] = o[1]; d[k + 2] = o[2]; d[k + 3] = 255; }
      if (overBudget()) yield;
    }
    c.putImageData(img, 0, 0);
    return cv;
  }
  // 필요한 암석 무늬를 (아직 없으면) 만들도록 예약하고, 있으면 돌려줘요
  function wantRock(id, big, first) {
    const store = big ? ROCK_BIG : ROCK_ICON;
    if (store[id] !== undefined) return store[id] || null;
    store[id] = false;
    queueJob(rockGen(id, big ? 216 : 96, big ? 162 : 72), (cv) => { store[id] = cv; }, first);
    return null;
  }
  // 암석 그림 한 장 (둥근 모서리 + 빛 + 테두리)
  function drawRockIcon(ctx, rid, x, y, w, h, o) {
    o = o || {};
    const cv = wantRock(rid, !!o.big, o.first), r = o.r == null ? 8 : o.r;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    roundRect(ctx, x, y, w, h, r); ctx.clip();
    if (cv) ctx.drawImage(cv, x, y, w, h);
    else { ctx.fillStyle = ROCKS[rid].col; ctx.fillRect(x, y, w, h); }
    const g = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
    g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    roundRect(ctx, x, y, w, h, r); ctx.strokeStyle = o.stroke || 'rgba(255,255,255,.35)'; ctx.lineWidth = o.lw || 1.4; ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     장면 공통: 카드 · 돋보기 · 배경 그림 저장
     ========================================================= */
  function cardPanel(ctx, R, o) {
    o = o || {};
    roundRect(ctx, R.x, R.y, R.w, R.h, o.r || 16);
    ctx.fillStyle = o.fill || 'rgba(255,255,255,.055)'; ctx.fill();
    ctx.strokeStyle = o.stroke || 'rgba(255,214,170,.2)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function cardTitle(ctx, L, R, text, o) {
    o = o || {};
    ctx.font = fnt(L, 15, 'bold'); ctx.fillStyle = o.color || '#ffe9cf'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, o.align === 'center' ? R.x + R.w / 2 : R.x + 14, R.y + 22 * L.fs);
  }
  function tagPill(ctx, L, text, x, y, o) {
    o = o || {};
    return pill(ctx, text, x, y, Object.assign({ font: fnt(L, o.size || 13, 'bold'), h: (o.h || 24) * L.fs, pad: 9 * L.fs }, o));
  }
  // 돋보기: 손잡이 + 안쪽 그림 + 금속 테두리 + 유리 반사
  function lensFrame(V, cx, cy, R, inner, o) {
    const ctx = V.ctx; o = o || {};
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-Math.PI * 0.25);
    const hw = R * 0.1, hg = ctx.createLinearGradient(-hw, 0, hw, 0);
    hg.addColorStop(0, '#4d3a26'); hg.addColorStop(0.5, '#b08a5c'); hg.addColorStop(1, '#4a3826');
    roundRect(ctx, -hw, R * 0.92, hw * 2, R * 0.58, hw); ctx.fillStyle = hg; ctx.fill();
    ctx.restore();
    ctx.save(); circle(ctx, cx, cy, R - 3); ctx.clip(); inner(ctx); ctx.restore();
    const vg = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)');
    circle(ctx, cx, cy, R - 3); ctx.fillStyle = vg; ctx.fill();
    const rg = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rg.addColorStop(0, '#f6ead0'); rg.addColorStop(0.45, '#b49560'); rg.addColorStop(1, '#6c5430');
    circle(ctx, cx, cy, R); ctx.lineWidth = 7; ctx.strokeStyle = rg; ctx.stroke();
    circle(ctx, cx, cy, R - 4.5); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
    ctx.save(); circle(ctx, cx, cy, R - 6); ctx.clip();
    const sg = ctx.createLinearGradient(cx - R, cy - R, cx - R * 0.2, cy - R * 0.2);
    sg.addColorStop(0, 'rgba(255,255,255,.3)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.ellipse(cx - R * 0.3, cy - R * 0.5, R * 0.55, R * 0.22, -0.62, 0, TAU); ctx.fillStyle = sg; ctx.fill();
    ctx.restore();
  }
  const BG = {};
  function bgCache(V, key, W, H, paint) {
    const ck = key + V.L.key, sc = Math.max(1, Math.min(2, V.v.scale * V.v.dpr));
    let e = BG[ck];
    if (!e || Math.abs(e.sc - sc) > 0.25) {
      const cv = document.createElement('canvas'); cv.width = Math.round(W * sc); cv.height = Math.round(H * sc);
      const c = cv.getContext('2d'); c.scale(sc, sc);
      paint(c);
      e = BG[ck] = { cv, sc, W, H };
    }
    return e;
  }
  const rgbs = (c, a) => (a == null ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')');
  const mixa = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function blobPath(ctx, cx, cy, rx, ry, t, seed, wob) {
    const n = 28;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = i / n * TAU, w = 1 + wob * (0.5 * Math.sin(a * 3 + t * 1.1 + seed) + 0.5 * Math.sin(a * 5 - t * 0.8 + seed * 2));
      const x = cx + Math.cos(a) * rx * w, y = cy + Math.sin(a) * ry * w;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /* =========================================================
     1단계 장면: 화성암 (마그마의 색 × 식는 빠르기)
     ========================================================= */
  const MELT = {
    dark: { hot: [255, 132, 58], mid: [214, 58, 22], cool: [104, 24, 14] },
    light: { hot: [255, 232, 152], mid: [255, 172, 72], cool: [206, 94, 44] },
  };
  const ROCK_TONE = { dark: [58, 58, 68], light: [216, 192, 180] };
  const IGPAL = {
    'dark-fast': { cols: [[44, 44, 52], [58, 58, 68], [34, 34, 40], [108, 108, 120]], w: [0.32, 0.3, 0.26, 0.12], line: 0.28 },
    'light-fast': { cols: [[224, 203, 191], [206, 177, 165], [238, 230, 220], [112, 98, 92]], w: [0.38, 0.3, 0.24, 0.08], line: 0.22 },
    'dark-slow': { cols: [[40, 48, 44], [30, 35, 33], [160, 166, 168], [184, 188, 188], [98, 116, 64]], w: [0.3, 0.22, 0.2, 0.18, 0.1], line: 0.55, seq: [0, 2, 1, 3, 0, 4, 2] },
    'light-slow': { cols: [[234, 186, 166], [222, 162, 142], [201, 206, 211], [181, 187, 194], [242, 236, 228], [46, 41, 39]], w: [0.22, 0.2, 0.17, 0.15, 0.14, 0.12], line: 0.55, seq: [0, 2, 4, 1, 5, 3, 0] },
  };
  const IGG = { fast: null, slow: null };
  function ensureIgGeo() {
    ['slow', 'fast'].forEach((k) => {
      if (IGG[k] !== null) return;
      IGG[k] = false;
      queueJob(cellsGen(k === 'fast' ? { M: 300, seed: 41, spread: 0.04, gscale: 2.7 } : { M: 7, seed: 9, spread: 0.5, gscale: 0.9 }), (g) => { IGG[k] = g; });
    });
  }
  const lensCv = document.createElement('canvas'); lensCv.width = GN; lensCv.height = GN;
  const lensCx = lensCv.getContext('2d'), lensImg = lensCx.createImageData(GN, GN);
  function assignColors(G, key, seed) {
    const P = IGPAL[key], M = G.M, r = rng(seed), cc = new Float32Array(M * 3), tex = new Float32Array(M * 2);
    let order = null;
    if (M < 20 && P.seq) { order = P.seq.slice(); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = order[i]; order[i] = order[j]; order[j] = tmp; } }
    for (let i = 0; i < M; i++) {
      let c;
      if (order) c = P.cols[order[i % order.length]];
      else { let q = r(), k = 0; while (k < P.w.length - 1 && q > P.w[k]) { q -= P.w[k]; k++; } c = P.cols[k]; }
      const j = 0.9 + 0.2 * r();
      cc[i * 3] = c[0] * j; cc[i * 3 + 1] = c[1] * j; cc[i * 3 + 2] = c[2] * j;
      tex[i * 2] = r() * Math.PI; tex[i * 2 + 1] = r() < 0.4 ? 1 : 0;
    }
    return { cc, tex };
  }
  function renderIgLens(G, A, key, darkK, tau, t) {
    const d = lensImg.data, N = G.N, V = G.valid, own = G.own, arr = G.arr, ed = G.ed, nz = G.nz, cc = A ? A.cc : null, tx = A ? A.tex : null;
    const P = IGPAL[key], line = P.line, flow = key === 'light-fast';
    const mH = mixa(MELT.light.hot, MELT.dark.hot, darkK), mM = mixa(MELT.light.mid, MELT.dark.mid, darkK), mC = mixa(MELT.light.cool, MELT.dark.cool, darkK);
    d.fill(0);
    for (let i = 0; i < V.length; i++) {
      const k = V[i], a = arr[k], p = k << 2, x = k % N;
      let r, g, b;
      if (!cc || a > tau) {
        const f = 0.5 + 0.5 * Math.sin(nz[k] * 11 + t * 1.5 + x * 0.04);
        const near = Math.max(0, 1 - (a - tau) * 16);
        const q = clamp(f * 0.75 * (1 - 0.4 * tau) + near * 0.5, 0, 1), cl = tau * 0.55;
        r = mM[0] + (mH[0] - mM[0]) * q; g = mM[1] + (mH[1] - mM[1]) * q; b = mM[2] + (mH[2] - mM[2]) * q;
        r += (mC[0] - r) * cl; g += (mC[1] - g) * cl; b += (mC[2] - b) * cl;
      } else {
        const o = own[k], e = ed[k], y = (k / N) | 0;
        let sh = 0.8 + 0.2 * Math.min(e, 9) / 9 + 0.16 * (nz[k] - 0.5);
        sh *= 0.95 + 0.1 * (((Math.imul(k, 2654435761) >>> 24) & 255) / 255);
        if (tx[o * 2 + 1] > 0.5) { const ang = tx[o * 2]; sh *= 0.955 + 0.045 * Math.sin((x * Math.cos(ang) + y * Math.sin(ang)) * 2.5); }
        if (flow) sh *= 0.94 + 0.06 * Math.sin(y * 0.2 + nz[k] * 6);
        if (e < 1.7) sh *= 1 - line * (1 - e / 1.7);
        r = cc[o * 3] * sh; g = cc[o * 3 + 1] * sh; b = cc[o * 3 + 2] * sh;
        const hot = Math.exp(-(tau - a) * 9) * 0.85 + (1 - tau) * 0.14;
        r += (255 - r) * hot; g += (150 - g) * hot; b += (60 - b) * hot;
      }
      d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
    }
    lensCx.putImageData(lensImg, 0, 0);
  }

  function igGeo(L) {
    if (L.key === 'wide') {
      return {
        D: { x: 12, y: 12, w: 384, h: 616 },
        LC: { x: 408, y: 12, w: 380, h: 316 }, lens: { cx: 586, cy: 178, R: 120 },
        TC: { x: 408, y: 340, w: 380, h: 288 },
      };
    }
    return {
      D: { x: 10, y: 10, w: 500, h: 320 },
      LC: { x: 10, y: 340, w: 250, h: 262 }, lens: { cx: 120, cy: 474, R: 92 },
      RC: { x: 270, y: 340, w: 240, h: 262 },
      TC: { x: 10, y: 612, w: 500, h: 224 },
    };
  }
  function dioGeo(L) {
    const wide = L.key === 'wide', W = wide ? 384 : 500, H = wide ? 616 : 320;
    return {
      W, H, wide, gY: H * (wide ? 0.25 : 0.34), apexX: W * 0.5, apexY: H * (wide ? 0.07 : 0.085), coneW: W * (wide ? 0.84 : 0.6),
      cY: H * (wide ? 0.8 : 0.77), crx: W * (wide ? 0.3 : 0.25), cry: H * (wide ? 0.085 : 0.105), rim: wide ? 20 : 22,
    };
  }
  function paintIgDio(c, G) {
    const { W, H, gY, apexX, apexY, coneW, cY, crx, cry, rim } = G;
    // 하늘
    const sk = c.createLinearGradient(0, 0, 0, gY);
    sk.addColorStop(0, '#0e1332'); sk.addColorStop(0.6, '#2b2a5a'); sk.addColorStop(1, '#a45a50');
    c.fillStyle = sk; c.fillRect(0, 0, W, gY + 6);
    const r = rng(77);
    for (let i = 0; i < 46; i++) { c.globalAlpha = 0.3 + r() * 0.6; c.fillStyle = r() < 0.2 ? '#ffe7c2' : '#e8efff'; const s = 0.6 + r() * 1.3; c.fillRect(r() * W, r() * gY * 0.62, s, s); }
    c.globalAlpha = 1;
    c.fillStyle = '#f7ecd0'; circle(c, W * 0.15, gY * 0.2, 11); c.fill();
    c.fillStyle = '#0e1332'; circle(c, W * 0.15 + 5, gY * 0.2 - 3, 10); c.fill();
    // 먼 산
    c.fillStyle = 'rgba(70,64,110,.55)';
    c.beginPath(); c.moveTo(0, gY); c.lineTo(0, gY - gY * 0.16); c.quadraticCurveTo(W * 0.12, gY - gY * 0.3, W * 0.24, gY - gY * 0.1); c.quadraticCurveTo(W * 0.3, gY - gY * 0.04, W * 0.36, gY); c.fill();
    c.beginPath(); c.moveTo(W, gY); c.lineTo(W, gY - gY * 0.2); c.quadraticCurveTo(W * 0.9, gY - gY * 0.34, W * 0.78, gY - gY * 0.08); c.lineTo(W * 0.72, gY); c.fill();
    // 땅속 지층
    const ug = H - gY, bands = [
      { y0: 0, y1: 0.14, c: '#6e5744', d1: '#8a7059', d2: '#4f3d30' },
      { y0: 0.14, y1: 0.36, c: '#9a7a52', d1: '#b79a6c', d2: '#7a5e3c' },
      { y0: 0.36, y1: 0.62, c: '#5e5048', d1: '#75665c', d2: '#463a34' },
      { y0: 0.62, y1: 1.01, c: '#403d4a', d1: '#5a566a', d2: '#2c2a34' },
    ];
    bands.forEach((b, bi) => {
      const ya = gY + b.y0 * ug, yb = gY + b.y1 * ug;
      c.beginPath(); c.moveTo(0, ya);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, ya + (bi ? 3 * Math.sin(x * 0.03 + bi * 2) : 0));
      for (let x = W; x >= 0; x -= 8) c.lineTo(x, yb + (bi < 3 ? 3 * Math.sin(x * 0.03 + (bi + 1) * 2) : 0));
      c.closePath(); c.fillStyle = b.c; c.fill();
      c.save(); c.clip();
      const n = Math.round(W * (yb - ya) / 90);
      for (let i = 0; i < n; i++) { c.fillStyle = r() < 0.5 ? b.d1 : b.d2; c.globalAlpha = 0.35 + r() * 0.4; const s = 0.8 + r() * 2.4; c.fillRect(r() * W, ya + r() * (yb - ya), s * (bi === 3 ? 1.5 : 1), s); }
      c.globalAlpha = 0.07;
      for (let y = ya + 6; y < yb; y += 9) { c.fillStyle = bi % 2 ? '#fff' : '#000'; c.fillRect(0, y, W, 1.5); }
      c.globalAlpha = 1; c.restore();
    });
    // 화산 (잘라 본 모양)
    const bx0 = apexX - coneW / 2, bx1 = apexX + coneW / 2, hh = gY - apexY;
    const cone = () => {
      c.beginPath(); c.moveTo(bx0 - 8, gY + 2);
      c.quadraticCurveTo(apexX - coneW * 0.16, gY - hh * 0.28, apexX - rim, apexY);
      c.lineTo(apexX + rim, apexY);
      c.quadraticCurveTo(apexX + coneW * 0.16, gY - hh * 0.28, bx1 + 8, gY + 2); c.closePath();
    };
    cone();
    const cg = c.createLinearGradient(bx0, 0, bx1, 0); cg.addColorStop(0, '#6a5448'); cg.addColorStop(0.5, '#4d3b36'); cg.addColorStop(1, '#2d2428');
    c.fillStyle = cg; c.fill();
    c.save(); cone(); c.clip();
    for (let i = 1; i < 7; i++) {
      const yy = apexY + hh * i / 7, half = (coneW / 2) * Math.pow(i / 7, 0.82) + rim * (1 - i / 7);
      c.beginPath(); c.moveTo(apexX - half, yy + hh * 0.05); c.quadraticCurveTo(apexX, yy - hh * 0.07, apexX + half, yy + hh * 0.05);
      c.strokeStyle = i % 2 ? 'rgba(255,214,170,.14)' : 'rgba(0,0,0,.22)'; c.lineWidth = 4; c.stroke();
    }
    c.restore();
    cone(); c.strokeStyle = 'rgba(20,14,16,.65)'; c.lineWidth = 2; c.stroke();
    // 분화구 속
    c.fillStyle = '#1a0f12'; c.beginPath(); c.ellipse(apexX, apexY + 2, rim, 6, 0, 0, TAU); c.fill();
    // 지표 점선
    c.setLineDash([6, 5]); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, gY); c.lineTo(bx0 + 4, gY); c.moveTo(bx1 - 4, gY); c.lineTo(W, gY); c.stroke(); c.setLineDash([]);
    // 통로 · 마그마 방 (어두운 틀)
    c.fillStyle = '#1a0e10'; c.beginPath(); c.moveTo(apexX - 12, apexY + 6); c.lineTo(apexX + 12, apexY + 6); c.lineTo(apexX + 9, gY + 30); c.lineTo(apexX + 15, cY - cry * 0.7); c.lineTo(apexX - 15, cY - cry * 0.7); c.lineTo(apexX - 9, gY + 30); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(apexX, cY, crx, cry, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,170,110,.28)'; c.lineWidth = 2; c.beginPath(); c.ellipse(apexX, cY, crx, cry, 0, 0, TAU); c.stroke();
    // 깊이 눈금
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.fillStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2;
    const dx = 18, y0 = gY + 14, y1 = H - 16;
    c.beginPath(); c.moveTo(dx, y0); c.lineTo(dx, y1); c.stroke();
    c.beginPath(); c.moveTo(dx - 5, y1 - 7); c.lineTo(dx, y1); c.lineTo(dx + 5, y1 - 7); c.stroke();
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(dx - 4, y0 + (y1 - y0 - 10) * i / 3); c.lineTo(dx + 4, y0 + (y1 - y0 - 10) * i / 3); c.stroke(); }
  }
  // 마그마 몸체 색 (q: 0 가장자리 ~ 1 중심, heat: 1 녹음 ~ 0 굳음)
  function magmaRGB(darkK, q, heat) {
    const m = mixa(mixa(MELT.light.mid, MELT.dark.mid, darkK), mixa(MELT.light.hot, MELT.dark.hot, darkK), q);
    const rock = mixa(ROCK_TONE.light, ROCK_TONE.dark, darkK);
    return mixa(rock, mixa(mixa(MELT.light.cool, MELT.dark.cool, darkK), m, 0.3 + 0.7 * heat), smooth(0.0, 0.5, heat));
  }
  function igPins(g, G) {
    const D = g.D;
    return { sx: D.x + G.apexX, sy: D.y + G.apexY + 12, dx: D.x + G.apexX, dy: D.y + G.cY };
  }
  function igKey() { return (S.ig.dark ? 'dark' : 'light') + '-' + (S.ig.v < 0.5 ? 'fast' : 'slow'); }

  // 몸 밖으로 빠져나가는 열 (지표 가까이는 빨리, 땅속 깊은 곳은 천천히)
  function heatArrows(ctx, cx, cy, rx, ry, n, a0, a1, len, alpha, t, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1)), ph = RM ? 0 : (t * 1.5 + i * 0.37) % 1;
      let nx = Math.cos(a) / rx, ny = Math.sin(a) / ry; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const x0 = cx + Math.cos(a) * rx, y0 = cy + Math.sin(a) * ry, l = len * (0.8 + 0.2 * Math.sin(t * 3 + i)), off = 4 + ph * 7;
      const x1 = x0 + nx * off, y1 = y0 + ny * off, x2 = x1 + nx * l, y2 = y1 + ny * l;
      ctx.globalAlpha = alpha * (0.55 + 0.45 * (1 - ph));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      arrowHead(ctx, x2, y2, Math.atan2(ny, nx), 8, col);
    }
    ctx.restore();
  }
  function drawIgDio(V, g, t) {
    const { ctx, L } = V, D = g.D, G = dioGeo(L), I = S.ig, fs = L.fs;
    const bg = bgCache(V, 'igdio', G.W, G.H, (c) => paintIgDio(c, G));
    ctx.save();
    roundRect(ctx, D.x, D.y, D.w, D.h, 16); ctx.clip();
    ctx.drawImage(bg.cv, D.x, D.y, G.W, G.H);
    ctx.translate(D.x, D.y);
    const darkK = I.darkS, vs = I.vs, hD = lerp(1, I.heatS, vs), hS = lerp(1, I.heatS, 1 - vs);
    const rid = I.done || I.cooling ? IG_ROCK[I.key] : null;
    // 분화구의 용암과 흘러내림
    const sx = G.apexX, sy = G.apexY + 4;
    const lavaA = (0.55 + 0.45 * (1 - vs));
    ctx.globalAlpha = lavaA;
    const slopeX = (u) => sx + G.rim + (G.coneW / 2 - G.rim) * u * 0.62, slopeY = (u) => sy + (G.gY - sy) * Math.pow(u, 1.15) * 0.8;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = 0; i <= 10; i++) { const u = i / 10; if (i === 0) ctx.moveTo(slopeX(u), slopeY(u) + 3); else ctx.lineTo(slopeX(u), slopeY(u) + 3 + 3 * Math.sin(u * 5)); }
    ctx.strokeStyle = rgbs(magmaRGB(darkK, 0.3, hS)); ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = rgbs(magmaRGB(darkK, 0.9, hS)); ctx.lineWidth = 4; ctx.stroke();
    if (hS > 0.35 && !RM) { ctx.setLineDash([3, 14]); ctx.lineDashOffset = -t * 18; ctx.strokeStyle = 'rgba(255,255,230,.7)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
    blobPath(ctx, sx, sy + 1, G.rim * 1.1, 8, t, 3, RM ? 0 : 0.06 * hS);
    const lg = ctx.createRadialGradient(sx, sy - 2, 1, sx, sy, G.rim * 1.2);
    lg.addColorStop(0, rgbs(magmaRGB(darkK, 1, hS))); lg.addColorStop(1, rgbs(magmaRGB(darkK, 0.2, hS)));
    ctx.fillStyle = lg; ctx.fill();
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    if (hS > 0.3) {
      ctx.globalCompositeOperation = 'lighter';
      const hg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 62);
      hg.addColorStop(0, rgbs(mixa(MELT.light.hot, MELT.dark.hot, darkK), 0.5 * hS * lavaA)); hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg; ctx.fillRect(sx - 64, sy - 64, 128, 128);
      ctx.globalCompositeOperation = 'source-over';
    }
    // 통로의 마그마
    const topY = G.apexY + 8, botY = G.cY - G.cry * 0.6;
    const cgrad = ctx.createLinearGradient(0, topY, 0, botY);
    cgrad.addColorStop(0, rgbs(magmaRGB(darkK, 0.7, hS))); cgrad.addColorStop(1, rgbs(magmaRGB(darkK, 0.7, hD)));
    ctx.fillStyle = cgrad; ctx.beginPath();
    ctx.moveTo(sx - 7, topY); ctx.lineTo(sx + 7, topY); ctx.lineTo(sx + 5, G.gY + 30); ctx.lineTo(sx + 10, botY); ctx.lineTo(sx - 10, botY); ctx.lineTo(sx - 5, G.gY + 30); ctx.closePath(); ctx.fill();
    if (!RM && hD > 0.4) {
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(255,240,200,.35)';
      for (let i = 0; i < 5; i++) { const yy = botY - ((t * 36 + i * 52) % (botY - topY)); ctx.fillRect(sx - 3 + Math.sin(yy * 0.05 + i) * 3, yy, 2, 8); }
      ctx.restore();
    }
    // 마그마 방
    const wob = RM ? 0 : 0.045 * hD + 0.012;
    blobPath(ctx, sx, G.cY, G.crx * 0.92, G.cry * 0.84, t, 1, wob);
    const cg = ctx.createRadialGradient(sx - G.crx * 0.2, G.cY - G.cry * 0.25, 4, sx, G.cY, G.crx);
    cg.addColorStop(0, rgbs(magmaRGB(darkK, 1, hD))); cg.addColorStop(0.55, rgbs(magmaRGB(darkK, 0.5, hD))); cg.addColorStop(1, rgbs(magmaRGB(darkK, 0, hD)));
    ctx.fillStyle = cg; ctx.fill();
    if (rid && hD < 0.6) {
      const ic = wantRock(rid, false);
      if (ic) { ctx.save(); blobPath(ctx, sx, G.cY, G.crx * 0.92, G.cry * 0.84, t, 1, wob); ctx.clip(); ctx.globalAlpha = smooth(0.6, 0.1, hD) * vs; ctx.drawImage(ic, sx - G.crx, G.cY - G.cry, G.crx * 2, G.cry * 2); ctx.restore(); }
    }
    if (hD < 0.95) {
      ctx.save(); blobPath(ctx, sx, G.cY, G.crx * 0.92, G.cry * 0.84, t, 1, wob); ctx.clip();
      ctx.globalAlpha = (1 - hD) * 0.7 * vs; ctx.strokeStyle = 'rgba(20,14,16,.7)'; ctx.lineWidth = 1.6;
      const rr2 = rng(5);
      for (let i = 0; i < 9; i++) { const a = rr2() * TAU, l = 0.35 + rr2() * 0.6; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 6, G.cY + Math.sin(a) * 4); ctx.lineTo(sx + Math.cos(a) * G.crx * l, G.cY + Math.sin(a) * G.cry * l * 1.1); ctx.stroke(); }
      ctx.restore();
    }
    if (hD > 0.3) {
      ctx.globalCompositeOperation = 'lighter';
      const hg2 = ctx.createRadialGradient(sx, G.cY, 6, sx, G.cY, G.crx * 1.25);
      hg2.addColorStop(0, rgbs(mixa(MELT.light.hot, MELT.dark.hot, darkK), 0.42 * hD * (0.4 + 0.6 * vs))); hg2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg2; ctx.fillRect(sx - G.crx * 1.3, G.cY - G.crx * 1.3, G.crx * 2.6, G.crx * 2.6);
      ctx.globalCompositeOperation = 'source-over';
    }
    // 열이 빠져나가는 화살표
    const loss = 0.3 + 0.7 * I.heatS;
    heatArrows(ctx, sx, sy - 2, G.rim * 1.1, 9, 5, -2.55, -0.6, 30, (0.25 + 0.65 * (1 - vs)) * loss, t, '#ffb066');
    heatArrows(ctx, sx, G.cY, G.crx * 0.98, G.cry * 0.95, 8, 0, TAU * 7 / 8, 9, (0.2 + 0.55 * vs) * loss, t, '#ffb066');
    ctx.restore();
    // 핀과 안내 이름표 (지도 위 좌표)
    const pn = igPins(g, G), py = lerp(pn.sy, pn.dy, vs);
    const near = vs < 0.5;
    ctx.save();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pn.sx, pn.sy); ctx.lineTo(pn.dx, pn.dy); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    const lx = D.x + 12 * fs, ly = near ? D.y + G.apexY + 26 * fs : D.y + G.cY + G.cry + 22 * fs;
    ctx.font = fnt(L, 13, 'bold');
    // 위쪽 이름표 (지표 가까이)
    tagPill(ctx, L, '⚡ 지표 가까이 · 빨리 식어요', D.x + (G.wide ? 14 : 14), D.y + G.apexY + (G.wide ? 56 : 30) * fs, { align: 'left', bg: near ? 'rgba(14,165,233,.9)' : 'rgba(6,10,26,.62)', alpha: near ? 1 : 0.7, stroke: near ? '#bae6fd' : null });
    tagPill(ctx, L, '🐢 땅속 깊은 곳 · 천천히 식어요', D.x + D.w / 2, D.y + G.cY + G.cry + 20 * fs, { bg: near ? 'rgba(6,10,26,.62)' : 'rgba(14,165,233,.9)', alpha: near ? 0.7 : 1, stroke: near ? null : '#bae6fd' });
    tagPill(ctx, L, '지표', D.x + 12, D.y + G.gY - 14 * fs, { align: 'left', bg: 'rgba(6,10,26,.6)', size: 12.5, h: 22 });
    ctx.font = fnt(L, 12.5, 'bold'); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('깊이', D.x + 28, D.y + G.gY + 22 * fs);
    // 핀
    const pulseK = I.cooling ? 0 : pulse();
    ctx.save();
    if (!I.cooling && !I.done) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 + 0.3 * pulseK) + ')'; ctx.lineWidth = 2; circle(ctx, pn.sx, py, 20 + 4 * pulseK); ctx.stroke(); }
    circle(ctx, pn.sx, py, 13); ctx.fillStyle = I.dragging ? '#bae6fd' : '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.fill();
    ctx.shadowBlur = 0; circle(ctx, pn.sx, py, 13); ctx.lineWidth = 3; ctx.strokeStyle = '#0ea5e9'; ctx.stroke();
    ctx.font = (14 * fs) + 'px ' + FONT; ctx.fillStyle = '#0369a1'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔍', pn.sx, py + 1);
    ctx.restore();
    ctx.restore();
    roundRect(ctx, D.x, D.y, D.w, D.h, 16); ctx.strokeStyle = 'rgba(255,214,170,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  const VES = [[-0.5, -0.32, 0.075], [-0.12, -0.58, 0.055], [0.38, -0.46, 0.085], [0.58, -0.05, 0.06], [0.2, 0.18, 0.09], [-0.56, 0.12, 0.065], [-0.18, 0.38, 0.08], [0.44, 0.5, 0.06], [-0.7, 0.5, 0.05], [0.04, -0.12, 0.05], [0.72, -0.5, 0.045]];
  function igResultOf(I) {
    const rid = IG_ROCK[I.key], rk = IG[I.key];
    return { rid, name: ROCKS[rid].name, kind: rk.kind, color: rk.color, size: rk.size };
  }
  function drawIgLensCard(V, g, t) {
    const { ctx, L } = V, I = S.ig, LC = g.LC, ln = g.lens, fs = L.fs;
    cardPanel(ctx, LC);
    cardTitle(ctx, L, LC, '🔍 확대해서 보기');
    const run = I.cooling || I.done;
    if (I.heatS > 0.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const hg = ctx.createRadialGradient(ln.cx, ln.cy, ln.R * 0.8, ln.cx, ln.cy, ln.R * 1.4);
      hg.addColorStop(0, rgbs(mixa(MELT.light.hot, MELT.dark.hot, I.darkS), 0.3 * I.heatS)); hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg; ctx.fillRect(ln.cx - ln.R * 1.45, ln.cy - ln.R * 1.45, ln.R * 2.9, ln.R * 2.9);
      ctx.restore();
    }
    const G = run ? I.G : (IGG.slow || IGG.fast), have = !!G;
    if (have) renderIgLens(G, run ? I.A : null, run ? I.key : igKey(), I.darkS, run ? I.tau : 0, t);
    lensFrame(V, ln.cx, ln.cy, ln.R, (c) => {
      c.fillStyle = '#1b0d0d'; c.fillRect(ln.cx - ln.R, ln.cy - ln.R, ln.R * 2, ln.R * 2);
      if (have) { c.imageSmoothingEnabled = true; c.drawImage(lensCv, ln.cx - ln.R, ln.cy - ln.R, ln.R * 2, ln.R * 2); }
      else { const fg = c.createRadialGradient(ln.cx, ln.cy, 4, ln.cx, ln.cy, ln.R); fg.addColorStop(0, rgbs(MELT.dark.hot)); fg.addColorStop(1, rgbs(MELT.dark.mid)); c.fillStyle = fg; c.fillRect(ln.cx - ln.R, ln.cy - ln.R, ln.R * 2, ln.R * 2); }
      if (run && I.key === 'dark-fast') {
        const va = smooth(0.78, 1, I.tau);
        if (va > 0.01) {
          c.globalAlpha = va;
          VES.forEach((q) => {
            const x = ln.cx + q[0] * ln.R, y = ln.cy + q[1] * ln.R, r = q[2] * ln.R;
            c.fillStyle = '#0c0c10'; circle(c, x, y, r); c.fill();
            c.strokeStyle = 'rgba(200,200,215,.55)'; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, r + 0.7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
            c.strokeStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.arc(x, y, r + 0.7, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
          });
          c.globalAlpha = 1;
        }
      }
    });
    // 이름표 (녹은 마그마 / 결정이 자라는 중 / 완성)
    let cap, bg = 'rgba(6,10,26,.78)';
    if (I.done) { const r = igResultOf(I); cap = '🪨 ' + r.name + ' · 결정 ' + r.size; bg = 'rgba(15,118,110,.92)'; }
    else if (I.cooling) cap = '🌱 결정이 자라요… ' + Math.round(I.tau * 100) + '%';
    else if (I.waiting) cap = '⏳ 준비하는 중…';
    else cap = '🔥 녹은 마그마 (결정이 없어요)';
    tagPill(ctx, L, cap, ln.cx, ln.cy + ln.R + 22 * fs - (g.LC.h - (ln.cy - LC.y) - ln.R < 36 * fs ? 36 * fs : 0), { bg, size: 13.5 });
    // 결정 이름표
    if (I.done && I.G) {
      const G2 = I.G, N = G2.N, tx = N * 0.4, ty = N * 0.42;
      let bi = 0, bd = 1e9;
      for (let i = 0; i < G2.M; i++) { const dx = G2.sx[i] - tx, dy = G2.sy[i] - ty, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
      const x = ln.cx - ln.R + G2.sx[bi] / N * 2 * ln.R, y = ln.cy - ln.R + G2.sy[bi] / N * 2 * ln.R;
      const a = smooth(0, 0.4, (nowS() - (I.doneAt || 0)));
      ctx.save(); ctx.globalAlpha = a;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; circle(ctx, x, y, I.key.endsWith('fast') ? 7 : 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x - 22 * fs, y - 22 * fs); ctx.stroke();
      tagPill(ctx, L, I.key.endsWith('fast') ? '작은 결정' : '큰 결정', x - 24 * fs, y - 26 * fs, { align: 'right', bg: 'rgba(6,10,26,.85)', stroke: '#fff', size: 13 });
      ctx.restore();
    }
  }

  function igTableGeo(g, L) {
    const T = g.TC, wide = L.key === 'wide';
    const labW = wide ? 76 : 100, x0 = T.x + labW + 12, cw = (T.x + T.w - 12 - x0 - 8) / 2;
    const y0 = T.y + (wide ? 92 : 80), ch = wide ? 92 : 62, gap = wide ? 8 : 6;
    const cells = {};
    [['dark-fast', 0, 0], ['light-fast', 1, 0], ['dark-slow', 0, 1], ['light-slow', 1, 1]].forEach((q) => {
      cells[q[0]] = { x: x0 + q[1] * (cw + 8), y: y0 + q[2] * (ch + gap), w: cw, h: ch };
    });
    return { cells, x0, cw, y0, ch, gap, labW, head: { x: T.x + 10, y: T.y + 8, w: T.w - 20, h: wide ? 44 : 36 }, colY: T.y + (wide ? 70 : 62) };
  }
  function drawIgTable(V, g, t) {
    const { ctx, L } = V, I = S.ig, T = g.TC, fs = L.fs, tg = igTableGeo(g, L);
    cardPanel(ctx, T);
    // 상태 줄
    const H = tg.head;
    roundRect(ctx, H.x, H.y, H.w, H.h, 12); ctx.fillStyle = I.done ? 'rgba(15,118,110,.55)' : 'rgba(0,0,0,.35)'; ctx.fill();
    ctx.fillStyle = '#fff4e4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let l1, l2 = '';
    if (I.done) { const r = igResultOf(I); l1 = '🪨 ' + r.name + ' 완성!'; l2 = r.kind + ' · ' + r.color + ' · 결정 ' + r.size; }
    else if (I.cooling) { l1 = '❄️ 식는 중…'; l2 = I.v < 0.5 ? '지표 가까이에서 빠르게' : '땅속 깊은 곳에서 천천히'; }
    else { l1 = (I.dark ? '⚫ 어두운색' : '⚪ 밝은색') + ' 마그마'; l2 = I.v < 0.5 ? '지표 가까이 → 빠르게 식어요' : '땅속 깊은 곳 → 천천히 식어요'; }
    if (L.key === 'wide') {
      ctx.font = fnt(L, 15, 'bold'); ctx.fillText(l1, H.x + H.w / 2, H.y + 14);
      ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = 'rgba(255,244,228,.82)'; ctx.fillText(l2, H.x + H.w / 2, H.y + 32);
    } else {
      ctx.font = fnt(L, 14, 'bold'); ctx.fillText(l1 + (l2 ? ' · ' + l2 : ''), H.x + H.w / 2, H.y + H.h / 2 + 1);
    }
    // 열 머리글
    ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = '#ffe9cf';
    ctx.fillText('⚫ 어두운색', tg.x0 + tg.cw / 2, tg.colY); ctx.fillText('⚪ 밝은색', tg.x0 + tg.cw * 1.5 + 8, tg.colY);
    // 행 머리글
    ctx.textAlign = 'left';
    [['결정 작음', '빠르게 식음', '화산암', 0], ['결정 큼', '천천히 식음', '심성암', 1]].forEach((q) => {
      const cy = tg.y0 + q[3] * (tg.ch + tg.gap) + tg.ch / 2;
      const wd = L.key === 'wide';
      ctx.font = fnt(L, 13.5, 'bold'); ctx.fillStyle = '#ffe9cf'; ctx.fillText(q[0], T.x + 12, cy - (wd ? 18 : 11) * fs);
      if (wd) { ctx.font = fnt(L, 12.5, 'bold'); ctx.fillStyle = 'rgba(255,233,207,.7)'; ctx.fillText(q[1], T.x + 12, cy); }
      tagPill(ctx, L, q[2], T.x + 12, cy + (wd ? 20 : 13) * fs, { align: 'left', bg: q[3] ? 'rgba(124,58,237,.8)' : 'rgba(234,88,12,.85)', size: 12.5, h: 22 });
    });
    // 칸
    const keys = ['dark-fast', 'light-fast', 'dark-slow', 'light-slow'], tn = nowS();
    keys.forEach((k) => {
      const c = tg.cells[k], made = I.made.has(k), pop = I.pop[k] ? tn - I.pop[k] : 9;
      const sc = pop < 0.5 ? 1 + 0.08 * Math.sin(pop / 0.5 * Math.PI) : 1;
      ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(sc, sc); ctx.translate(-c.x - c.w / 2, -c.y - c.h / 2);
      const live = (I.cooling || I.done) && I.key === k;
      if (made) {
        const nm = ROCKS[IG_ROCK[k]].name;
        drawRockIcon(ctx, IG_ROCK[k], c.x, c.y, c.w, c.h, { r: 12, stroke: live && I.done ? '#34d399' : 'rgba(255,255,255,.4)', lw: live && I.done ? 3 : 1.4 });
        tagPill(ctx, L, nm, c.x + c.w / 2, c.y + c.h - 17 * fs, { bg: 'rgba(6,10,26,.82)', size: 14, h: 24 });
      } else {
        roundRect(ctx, c.x, c.y, c.w, c.h, 12); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
        ctx.setLineDash([6, 5]); ctx.strokeStyle = live ? '#fbbf24' : 'rgba(255,233,207,.4)'; ctx.lineWidth = live ? 2.5 : 1.5; ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,233,207,.55)'; ctx.font = dfnt(L, 30); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', c.x + c.w / 2, c.y + c.h / 2 + 2);
      }
      ctx.restore();
    });
    // 날아오는 암석
    if (I.fly) {
      const f = I.fly, k = clamp((tn - f.t0) / f.dur, 0, 1), e = EZ.inOutCubic ? EZ.inOutCubic(k) : k * k * (3 - 2 * k);
      const x = lerp(f.x0, f.x1, e), y = lerp(f.y0, f.y1, e) - Math.sin(e * Math.PI) * 40, w = lerp(60, f.w, e), h = w * 0.75;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12; drawRockIcon(ctx, f.rid, x - w / 2, y - h / 2, w, h, { r: 10, stroke: '#fff', lw: 2 }); ctx.restore();
    }
  }
  function drawIgResult(V, g) {
    const { ctx, L } = V, I = S.ig, R = g.RC, fs = L.fs;
    cardPanel(ctx, R);
    cardTitle(ctx, L, R, '🪨 만든 암석');
    const iw = R.w - 28, ih = Math.min(R.h - 130 * fs, iw * 0.75), ix = R.x + 14, iy = R.y + 40 * fs;
    if (I.done) {
      const r = igResultOf(I);
      drawRockIcon(ctx, r.rid, ix + (iw - ih / 0.75) / 2, iy, ih / 0.75, ih, { r: 12, stroke: '#34d399', lw: 2.5, big: true });
      ctx.fillStyle = '#fff4e4'; ctx.font = dfnt(L, 26); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(r.name, R.x + R.w / 2, iy + ih + 22 * fs);
      ctx.font = fnt(L, 13.5, 'bold'); ctx.fillStyle = 'rgba(255,244,228,.85)'; ctx.fillText(r.kind + ' · ' + r.color + ' · 결정 ' + r.size, R.x + R.w / 2, iy + ih + 48 * fs);
    } else {
      roundRect(ctx, ix, iy, iw, ih, 12); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,233,207,.4)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,233,207,.7)'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = wrapLines(ctx, I.cooling ? '결정이 다 자라면 암석이 나타나요' : '❄️ 식히기를 눌러 암석을 만들어 봐요', iw - 24);
      lines.forEach((ln, i) => ctx.fillText(ln, ix + iw / 2, iy + ih / 2 + (i - (lines.length - 1) / 2) * 20 * fs));
    }
  }

  function startCooling() {
    const I = S.ig;
    if (I.cooling) return;
    const speed = I.v < 0.5 ? 'fast' : 'slow';
    ensureIgGeo();
    if (!IGG[speed]) { I.waiting = true; syncControls(); return; }
    I.waiting = false;
    I.G = IGG[speed]; I.key = igKey(); I.A = assignColors(I.G, I.key, (Math.random() * 1e9) | 0);
    I.tau = 0; I.cooling = true; I.done = false; I.T = speed === 'fast' ? 2.8 : 8.5; I.fly = null;
    Sound.tone(240, 0.5, 'sine', 0.05); Sound.tone(180, 0.7, 'sine', 0.04, 0.05);
    const V = activeView();
    if (V) {
      const g = igGeo(V.L), G = dioGeo(V.L), pn = igPins(g, G);
      for (let i = 0; i < 10; i++) V.P.emit({ x: pn.sx + (Math.random() - 0.5) * 40, y: lerp(pn.sy, pn.dy, I.vs) - 8, vx: (Math.random() - 0.5) * 14, vy: -26 - Math.random() * 30, life: 1.6, size: 7, grow: 12, color: 'rgba(230,236,248,.55)', shape: 'smoke', gravity: -6, drag: 0.4 });
    }
    syncControls();
  }
  function finishCooling() {
    const I = S.ig;
    I.cooling = false; I.done = true; I.tau = 1; I.doneAt = nowS();
    const first = !I.made.has(I.key);
    I.made.add(I.key);
    Sound.tone(660, 0.12, 'triangle', 0.08); Sound.tone(880, 0.16, 'triangle', 0.07, 0.1); Sound.tone(1175, 0.2, 'triangle', 0.06, 0.2);
    const V = activeView();
    if (V) {
      const g = igGeo(V.L), ln = g.lens, tg = igTableGeo(g, V.L), c = tg.cells[I.key];
      ringFx(V, ln.cx, ln.cy, ln.R - 6, '#34d399');
      V.P.burst(ln.cx, ln.cy, { count: 22, colors: ['#ffd36b', '#ffffff', '#fb923c', '#fde68a'], speed: 170, gravity: 120, size: 3.4, life: 0.9 });
      I.fly = { rid: IG_ROCK[I.key], t0: nowS(), dur: first ? 0.75 : 0.5, x0: ln.cx, y0: ln.cy, x1: c.x + c.w / 2, y1: c.y + c.h / 2, w: c.w, key: I.key };
    }
    syncControls();
  }
  function resetIg() {
    const I = S.ig;
    I.cooling = false; I.done = false; I.tau = 0; I.waiting = false; I.fly = null; I.key = '';
  }
  function igUpdate(dt, t) {
    const I = S.ig, V = activeView();
    I.vs = approach(I.vs, I.v, dt, 8);
    I.darkS = approach(I.darkS, I.dark ? 1 : 0, dt, 7);
    I.heatS = approach(I.heatS, I.cooling || I.done ? Math.max(0, 1 - I.tau) : 1, dt, 9);
    if (I.waiting && IGG[I.v < 0.5 ? 'fast' : 'slow']) startCooling();
    if (I.cooling) {
      I.tau = Math.min(1, I.tau + dt * S.speed / I.T);
      const pct = Math.round(I.tau * 100);
      if (pct !== I.lastPct) { I.lastPct = pct; const btn = $('#coolBtn'); if (btn) btn.textContent = '❄️ 식는 중… ' + pct + '%'; }
      if (I.tau >= 1) finishCooling();
    }
    if (I.fly && nowS() - I.fly.t0 >= I.fly.dur) {
      const f = I.fly; I.fly = null; I.pop[f.key] = nowS();
      if (V) { const tg = igTableGeo(igGeo(V.L), V.L), c = tg.cells[f.key]; ringFx(V, c.x + c.w / 2, c.y + c.h / 2, c.h / 2, '#34d399'); V.P.burst(c.x + c.w / 2, c.y + c.h / 2, { count: 10, colors: ['#ffd36b', '#ffffff'], speed: 110, gravity: 80, size: 3, life: 0.6 }); }
      Sound.tone(980, 0.1, 'triangle', 0.07);
    }
    if (V && S.scene === 'igneous' && !RM) {
      const g = igGeo(V.L), G = dioGeo(V.L), pn = igPins(g, G);
      I.smokeAcc += dt;
      if (I.smokeAcc > 0.55 && V.P.count < 80) {
        I.smokeAcc = 0;
        V.P.emit({ x: pn.sx + (Math.random() - 0.5) * 12, y: pn.sy - 6, vx: 8 + Math.random() * 8, vy: -24 - Math.random() * 12, life: 2.8, size: 5, grow: 8, color: 'rgba(190,180,196,.42)', shape: 'smoke', gravity: -3, drag: 0.3 });
      }
      I.sparkAcc += dt;
      const hs = 1 - I.vs;
      if (I.sparkAcc > 0.12 && hs > 0.4 && I.heatS > 0.3 && V.P.count < 100) {
        I.sparkAcc = 0;
        V.P.emit({ x: pn.sx + (Math.random() - 0.5) * 18, y: pn.sy + 2, vx: (Math.random() - 0.5) * 60, vy: -50 - Math.random() * 50, life: 0.8, size: 1.6, color: I.dark ? '#ff9a4a' : '#ffe08a', gravity: 160, shape: 'circle', drag: 0.2 });
      }
    }
  }

  const SCENES = {}, HOOKS = {};
  /* ---------- 1단계 장면 등록: 그리기 · 입력 · 조작판 ---------- */
  function drawIgneous(V, t) {
    const g = igGeo(V.L);
    drawIgDio(V, g, t);
    drawIgLensCard(V, g, t);
    if (g.RC) drawIgResult(V, g);
    drawIgTable(V, g, t);
  }
  function igSetV(v, snapSlider) {
    const I = S.ig;
    if (I.cooling) return;
    if (I.v !== v || I.done) resetIg();
    I.v = v;
    syncControls(snapSlider);
  }
  function igHit(V, p) {
    const g = igGeo(V.L), G = dioGeo(V.L), pn = igPins(g, G), py = lerp(pn.sy, pn.dy, S.ig.vs);
    return Math.hypot(p.x - pn.sx, p.y - py) < 28;
  }
  SCENES.igneous = {
    draw: drawIgneous,
    update: igUpdate,
    enter() { ensureIgGeo(); Object.keys(IG_ROCK).forEach((k) => wantRock(IG_ROCK[k], false, true)); },
    hover(V, p) { return igHit(V, p) && !S.ig.cooling ? 'grab' : null; },
    blocks(V, p) { return igHit(V, p) && !S.ig.cooling; },
    down(V, p) {
      const I = S.ig;
      if (I.cooling) return null;
      if (igHit(V, p)) { if (I.done) resetIg(); I.dragging = true; Sound.tick(); return { kind: 'pin' }; }
      const g = igGeo(V.L), G = dioGeo(V.L), D = g.D;
      if (p.x > D.x && p.x < D.x + D.w && p.y > D.y && p.y < D.y + D.h) {
        const lx = p.x - D.x, ly = p.y - D.y;
        if (Math.abs(lx - G.apexX) < G.crx * 1.1 && Math.abs(ly - G.cY) < G.cry * 1.4) { Sound.tick(); igSetV(1); }
        else if (ly < G.gY + 4 && Math.abs(lx - G.apexX) < G.coneW * 0.42) { Sound.tick(); igSetV(0); }
      }
      return null;
    },
    move(V, d, p) {
      const I = S.ig, g = igGeo(V.L), pn = igPins(g, dioGeo(V.L));
      I.v = clamp((p.y - pn.sy) / (pn.dy - pn.sy), 0, 1);
      syncControls();
    },
    up(V, d, p) {
      const I = S.ig;
      I.dragging = false; I.v = I.v > 0.5 ? 1 : 0;
      syncControls(true);
    },
    sync(c) {
      const I = S.ig, busy = I.cooling;
      $$('#magmaSeg button').forEach((b) => { const on = (b.dataset.m === 'dark') === I.dark; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = busy; });
      const rg = $('#coolRange');
      rg.disabled = busy;
      if (c.snap || document.activeElement !== rg) rg.value = Math.round(I.v * 100);
      $('#coolOut').textContent = I.v < 0.5 ? '빠르게 · 지표 가까이' : '천천히 · 땅속 깊은 곳';
      const btn = $('#coolBtn');
      btn.disabled = busy;
      const txt = busy ? '❄️ 식는 중… ' + Math.round(I.tau * 100) + '%' : I.waiting ? '⏳ 준비 중…' : I.done ? '↺ 다시 식히기' : '❄️ 식히기';
      if (btn.textContent !== txt) btn.textContent = txt;
    },
  };
  $('#magmaSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-m]');
    if (!b || S.ig.cooling) return;
    Sound.click();
    const dk = b.dataset.m === 'dark';
    if (S.ig.dark !== dk || S.ig.done) resetIg();
    S.ig.dark = dk; syncControls();
  });
  $('#coolRange').addEventListener('input', () => {
    if (S.ig.cooling) return;
    const v = $('#coolRange').value / 100;
    if (S.ig.done) resetIg();
    S.ig.v = v; syncControls();
  });
  $('#coolRange').addEventListener('change', () => {
    if (S.ig.cooling) return;
    const from = $('#coolRange').value / 100, to = from > 0.5 ? 1 : 0;
    S.ig.v = to;
    const o = { x: from * 100 };
    if (RM) syncControls(true); else SciSim.tween(o, { x: to * 100 }, { duration: 0.22, ease: 'outCubic', onUpdate: () => { $('#coolRange').value = o.x; }, onDone: () => syncControls(true) });
    syncControls();
  });
  $('#coolBtn').addEventListener('click', () => {
    Sound.click();
    if (S.ig.cooling) return;
    if (S.ig.done) resetIg();
    startCooling();
  });
  HOOKS.ig = {
    pin() { const V = activeView(), g = igGeo(V.L), pn = igPins(g, dioGeo(V.L)); return HOOKS.client(pn.sx, lerp(pn.sy, pn.dy, S.ig.vs)); },
    pinTo(v) { const V = activeView(), g = igGeo(V.L), pn = igPins(g, dioGeo(V.L)); return HOOKS.client(pn.sx, lerp(pn.sy, pn.dy, v)); },
    cell(key) { const V = activeView(), c = igTableGeo(igGeo(V.L), V.L).cells[key]; return HOOKS.client(c.x + c.w / 2, c.y + c.h / 2); },
    ready: () => !!(IGG.fast && IGG.slow),
    start: startCooling,
  };

  /* =========================================================
     2단계 장면: 퇴적암 (쌓이고 → 눌리고 → 굳는다)
     알갱이 모형: 알갱이 사이의 빈틈(물)이 눌려서 줄고, 알갱이를 붙이는 물질이 스며들어 굳어요
     ========================================================= */
  const hexCache = {};
  function hex(c) {
    if (hexCache[c]) return hexCache[c];
    const n = parseInt(c.slice(1), 16);
    return (hexCache[c] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  const PORE = '#243240';
  const PACK = {
    gravel: { s: 70, r0: 28, r1: 36, cols: ['#7a7168', '#8f8577', '#5f5851', '#a09280', '#6e6155', '#7b7774', '#8b6f58'], cement: '#a89a82', flat: 0.12, jit: 0.16, zt: 0.46, a0: 0.7, a1: 1.0 },
    sand: { s: 19, r0: 8, r1: 9.8, cols: ['#e0c58a', '#d6b574', '#c9a45e', '#ead6a2', '#b8935a', '#f0e0b0', '#6b5a44'], cement: '#b8955a', flat: 0.1, jit: 0.14, zt: 0.42, a0: 0.88, a1: 1.04 },
    mud: { s: 7.8, r0: 3.2, r1: 4.1, cols: ['#6b5a50', '#5a4a42', '#7a6a5e', '#4d3f38'], cement: '#4a3d37', flat: 0.42, jit: 0.2, zt: 0.5, a0: 0.75, a1: 1.0 },
    lime: { s: 21, r0: 8.5, r1: 10.5, cols: ['#eee6cd', '#e1d8b9', '#f5f0de', '#d8cfae'], cement: '#cfc6a8', flat: 0.2, jit: 0.15, zt: 0.44, a0: 0.8, a1: 1.05 },
  };
  const packCache = {};
  function packLattice(id, hw, hh) {
    const key = id + '|' + (hw | 0) + '|' + (hh | 0);
    if (packCache[key]) return packCache[key];
    const P = PACK[id], r = rng(id.charCodeAt(0) * 31 + (hw | 0)), out = [];
    const sx = P.s, sy = P.s * 0.866, ex = hw * 1.3 + P.s, ey = hh * 1.45 + P.s;
    let row = 0;
    for (let y = -ey; y <= ey; y += sy, row++) {
      for (let x = -ex + (row % 2 ? sx / 2 : 0); x <= ex; x += sx) {
        out.push({ x: x + (r() - 0.5) * P.s * P.jit * 2, y: y + (r() - 0.5) * P.s * P.jit * 2, r: P.r0 + (P.r1 - P.r0) * r(), ci: Math.floor(r() * P.cols.length), rot: r() * Math.PI, asp: P.a0 + (P.a1 - P.a0) * r() });
      }
    }
    let shells = null;
    if (id === 'lime') {
      shells = [];
      for (let i = 0; i < 24; i++) shells.push({ x: (r() * 2 - 1) * hw * 1.1, y: (r() * 2 - 1) * hh * 1.1, r: 15 + r() * 13, a0: r() * TAU, span: 3.4 + r() * 2.2, rot: r() * TAU, sp: r() < 0.4 });
    }
    return (packCache[key] = { grains: out, shells });
  }
  // 알갱이 더미를 그려요: c = 0(막 쌓임) ~ 1(눌려서 굳음). (0,0)이 가운데, 가로 ±hw · 세로 ±hh
  function drawPack(ctx, id, hw, hh, c, o) {
    const P = PACK[id], Lt = packLattice(id, hw, hh), cc = clamp(c, 0, 1);
    const fx = 1.2 - 0.2 * cc, fy = 1.28 - (id === 'mud' ? 0.5 : 0.36) * cc, flat = P.flat * cc;
    const pore = hex(PORE), cem = hex(P.cement), bg = mixa(pore, cem, smooth(0, 1, cc));
    ctx.fillStyle = rgbs(bg); ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.save(); ctx.beginPath(); ctx.rect(-hw, -hh, hw * 2, hh * 2); ctx.clip();
    if (id === 'gravel') {
      // 모래·진흙 섞인 바탕 알갱이
      const rr = rng(5);
      ctx.fillStyle = 'rgba(214,190,140,' + (0.25 + 0.5 * cc) + ')';
      ctx.beginPath(); for (let i = 0; i < 160; i++) { const x = (rr() * 2 - 1) * hw, y = (rr() * 2 - 1) * hh; ctx.moveTo(x + 3, y); ctx.arc(x, y, 3 + rr() * 2.4, 0, TAU); } ctx.fill();
    }
    const G = Lt.grains;
    if (id === 'gravel') {
      for (let i = 0; i < G.length; i++) {
        const q = G[i], x = q.x * fx, y = q.y * fy;
        if (x < -hw - 40 || x > hw + 40 || y < -hh - 40 || y > hh + 40) continue;
        const rx = q.r, ry = q.r * q.asp * (1 - flat), cr = Math.cos(q.rot), sr = Math.sin(q.rot);
        const base = hex(P.cols[q.ci]);
        ctx.beginPath();
        for (let j = 0; j <= 12; j++) {
          const a = j / 12 * TAU, w = 1 + 0.08 * Math.sin(a * 3 + q.rot * 5) + 0.05 * Math.sin(a * 5 + q.r), ux = Math.cos(a) * rx * w, uy = Math.sin(a) * ry * w;
          const px = x + ux * cr - uy * sr, py = y + ux * sr + uy * cr;
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, 2, x, y, rx * 1.15);
        g.addColorStop(0, rgbs(mixa(base, [255, 255, 255], 0.18))); g.addColorStop(0.6, rgbs(base)); g.addColorStop(1, rgbs(mixa(base, [18, 14, 10], 0.55)));
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(24,18,14,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = 'rgba(30,24,20,.28)';
        for (let j = 0; j < 4; j++) { const a = q.rot * 3 + j * 1.9, d = rx * (0.15 + 0.4 * ((j * 37 + i * 11) % 10) / 10); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 2.2 + (j % 2) * 1.6, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        for (let j = 0; j < 3; j++) { const a = q.rot * 5 + j * 2.4 + 1, d = rx * (0.2 + 0.35 * ((j * 53 + i * 7) % 10) / 10); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 1.8, 0, TAU); ctx.fill(); }
      }
    } else {
      const bucket = {};
      for (let i = 0; i < G.length; i++) {
        const q = G[i], x = q.x * fx, y = q.y * fy;
        if (x < -hw - 12 || x > hw + 12 || y < -hh - 12 || y > hh + 12) continue;
        (bucket[q.ci] || (bucket[q.ci] = [])).push(q);
      }
      Object.keys(bucket).forEach((ci) => {
        ctx.beginPath();
        bucket[ci].forEach((q) => {
          const x = q.x * fx, y = q.y * fy, rx = q.r * (1 + 0.04 * cc), ry = q.r * q.asp * (1 - flat);
          ctx.moveTo(x + rx * Math.cos(q.rot), y + rx * Math.sin(q.rot)); ctx.ellipse(x, y, rx, ry, q.rot, 0, TAU);
        });
        ctx.fillStyle = P.cols[ci]; ctx.fill();
      });
      // 빛 받는 쪽 하이라이트와 아래쪽 그늘
      ctx.beginPath();
      for (let i = 0; i < G.length; i++) { const q = G[i], x = q.x * fx - q.r * 0.3, y = q.y * fy - q.r * 0.32; if (x < -hw || x > hw || y < -hh || y > hh) continue; ctx.moveTo(x + q.r * 0.34, y); ctx.arc(x, y, q.r * 0.34, 0, TAU); }
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
      if (id !== 'mud') {
        ctx.beginPath();
        for (let i = 0; i < G.length; i++) { const q = G[i], x = q.x * fx, y = q.y * fy; if (x < -hw || x > hw || y < -hh || y > hh) continue; ctx.moveTo(x + q.r * 1.02, y); ctx.ellipse(x, y, q.r * 1.02, q.r * q.asp * (1 - flat) * 1.02, q.rot, 0, TAU); }
        ctx.strokeStyle = 'rgba(30,22,14,.32)'; ctx.lineWidth = 1.4; ctx.stroke();
      }
    }
    if (Lt.shells) {
      Lt.shells.forEach((s) => {
        const x = s.x * fx, y = s.y * fy;
        ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#8b7d5e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, s.r, s.a0, s.a0 + s.span); ctx.stroke();
        ctx.strokeStyle = '#fff7e2'; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.arc(0, 0, s.r, s.a0, s.a0 + s.span); ctx.stroke();
        if (s.sp) { ctx.strokeStyle = 'rgba(120,104,76,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let a = 0; a < 7; a += 0.2) { const rr2 = s.r * 0.12 + a * s.r * 0.08; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.stroke(); }
        ctx.restore();
      });
    }
    if (id === 'mud') {
      ctx.strokeStyle = 'rgba(20,14,12,' + (0.4 * cc) + ')'; ctx.lineWidth = 1.6;
      ctx.beginPath(); for (let y = -hh + 6; y < hh; y += 11) { ctx.moveTo(-hw, y); for (let x = -hw; x <= hw; x += 20) ctx.lineTo(x, y + 2 * Math.sin(x * 0.04 + y)); } ctx.stroke();
    }
    ctx.restore();
  }
  const STRIPS = {};
  function* stripGen(id, st, gw, gh, sc) {
    const z = PACK[id].zt, cv = document.createElement('canvas');
    cv.width = Math.round(gw * sc); cv.height = Math.round(gh * sc);
    const c = cv.getContext('2d'); c.scale(sc, sc);
    c.translate(gw / 2, gh / 2); c.scale(z, z);
    drawPack(c, id, gw / 2 / z, gh / 2 / z, st * 0.5);
    yield;
    return cv;
  }
  // 상자 속 띠 그림 (눌림 정도 0 · 0.5 · 1 세 장). 만드는 중이면 null
  function getStrip(V, g, id, st) {
    const key = V.L.key + id + st;
    if (STRIPS[key] !== undefined) return STRIPS[key] || null;
    STRIPS[key] = false;
    const sc = Math.max(1, Math.min(2, V.v.scale * V.v.dpr));
    queueJob(stripGen(id, st, g.tank.w, Math.ceil(SED[id].h0 * g.k) + 6, sc), (cv) => { STRIPS[key] = cv; }, true);
    return null;
  }

  function sedGeo(L) {
    if (L.key === 'wide') {
      return {
        B: { x: 12, y: 12, w: 384, h: 616 }, tank: { x: 40, y: 130, w: 250, h: 460 }, k: 1,
        LC: { x: 408, y: 12, w: 380, h: 316 }, lens: { cx: 586, cy: 176, R: 120 },
        TC: { x: 408, y: 340, w: 380, h: 288 },
      };
    }
    return {
      B: { x: 10, y: 10, w: 500, h: 400 }, tank: { x: 34, y: 100, w: 300, h: 290 }, k: 0.63,
      LC: { x: 10, y: 420, w: 250, h: 416 }, lens: { cx: 135, cy: 568, R: 92 },
      TC: { x: 270, y: 420, w: 240, h: 416 },
    };
  }
  // 층마다 위·아래 높이
  function sedBands(g) {
    const SD = S.sed, T = g.tank, cs = smooth(0.04, 0.96, SD.pressS);
    let yb = T.y + T.h;
    return SD.layers.map((l, i) => {
      const s = SED[l.id], th = s.h0 * g.k * l.grow * (1 - s.k * cs);
      const b = { i, id: l.id, y1: yb, y0: yb - th, th, l };
      yb -= th;
      return b;
    });
  }
  const sedTop = (g) => { const b = sedBands(g); return b.length ? b[b.length - 1].y0 : g.tank.y + g.tank.h; };
  const sedFullH = (g) => S.sed.layers.reduce((a, l) => a + SED[l.id].h0 * g.k, 0);
  const POUR = { gravel: { n: 16, vy: 560, r: 6.2, dur: 0.8 }, sand: { n: 100, vy: 430, r: 2.7, dur: 1.0 }, mud: { n: 150, vy: 330, r: 1.7, dur: 1.0 }, lime: { n: 80, vy: 380, r: 2.6, dur: 1.0 } };
  const sedName = (id) => SED[id].name + (id === 'lime' ? '' : '');
  const sedLayerName = (id) => (id === 'lime' ? '석회 물질층' : SED[id].name + '층');
  function sedTimeText(p) { return p < 0.04 ? '막 쌓였어요' : p < 0.35 ? '시간이 흘러요…' : p < 0.7 ? '위에서 눌려 다져져요' : p < 0.93 ? '알갱이가 붙기 시작해요' : '굳어서 암석이 됐어요'; }
  function sedDesc(p, id) {
    const rock = id ? SED[id].rock : '퇴적암';
    if (p < 0.04) return '알갱이 사이에 빈틈(물)이 많아요.';
    if (p < 0.4) return '위에 쌓이는 퇴적물에 눌려 빈틈이 줄어요. (다져짐)';
    if (p < 0.93) return '빈틈이 더 줄고, 알갱이 사이에 붙이는 물질이 스며들어요.';
    return '알갱이가 서로 붙어 단단한 ' + rock + '이 됐어요. (굳어짐)';
  }
  function sedPour(id) {
    const SD = S.sed, g = sedGeo(activeView().L);
    if (SD.pour || SD.rewind) return;
    if (sedFullH(g) + SED[id].h0 * g.k > g.tank.h - 60 * g.k) { tip('상자가 가득 찼어요. 비우거나 시간을 흘려 보세요.'); Sound.fail(); return; }
    if (SD.press > 0.01 || SD.pressS > 0.03) {
      SD.press = 0; SD.rewind = true; SD.pending = id;
      tip('새 퇴적물이 쌓이면, 시간이 처음부터 다시 흘러요.');
      const rg = $('#pressRange'), o = { x: +rg.value };
      if (RM) rg.value = 0; else SciSim.tween(o, { x: 0 }, { duration: 0.5, ease: 'outCubic', onUpdate: () => { rg.value = o.x; } });
      syncControls(); return;
    }
    startPour(id);
  }
  function startPour(id) {
    const SD = S.sed, P = POUR[id];
    const l = { id, born: nowS(), grow: 0, landed: 0, count: P.n, rocked: false, popT: 0 };
    SD.layers.push(l); SD.sel = SD.layers.length - 1;
    SD.pour = { id, layer: l, spawned: 0, t0: nowS() };
    SD.pending = null; SD.rewind = false;
    Sound.tone(id === 'gravel' ? 150 : id === 'sand' ? 260 : 340, 0.5, 'sawtooth', 0.025);
    syncControls();
  }
  function sedReset() {
    const SD = S.sed;
    SD.layers = []; SD.grains = []; SD.pour = null; SD.rewind = false; SD.pending = null; SD.sel = -1;
    SD.press = 0; SD.pressS = 0;
    const rg = $('#pressRange'); if (rg) rg.value = 0;
    syncControls();
  }
  function sedUpdate(dt, t) {
    const SD = S.sed, V = activeView(), g = sedGeo(V.L), T = g.tank;
    SD.pressS = approach(SD.pressS, SD.press, dt, 5);
    if (SD.rewind && SD.pressS < 0.05 && SD.pending) startPour(SD.pending);
    // 쏟기: 알갱이를 만들어 떨어뜨려요
    const pr = SD.pour;
    if (pr) {
      const P = POUR[pr.id];
      pr.spawned += dt * P.n / P.dur;
      while (pr.spawned >= 1 && SD.grains.length < 260) {
        pr.spawned -= 1;
        const lay = pr.layer;
        if (lay.spawnedN >= lay.count) break;
        lay.spawnedN = (lay.spawnedN || 0) + 1;
        SD.grains.push({ u: Math.random(), y: T.y - 20 + Math.random() * 6, vy: P.vy * g.k * (0.8 + Math.random() * 0.4), r: P.r * g.k * (0.8 + Math.random() * 0.5), ci: Math.floor(Math.random() * PACK[pr.id].cols.length), id: pr.id, lay, ph: Math.random() * 6 });
      }
    }
    const top = sedTop(g);
    for (let i = SD.grains.length - 1; i >= 0; i--) {
      const q = SD.grains[i];
      const inWater = q.y > T.y + 14;
      q.y += q.vy * (inWater ? (q.id === 'mud' ? 0.55 : 0.7) : 1) * dt;
      q.u += Math.sin(t * 3 + q.ph) * dt * (q.id === 'mud' ? 0.05 : 0.015);
      if (q.y + q.r >= top - 1) { q.lay.landed++; SD.grains.splice(i, 1); }
    }
    SD.layers.forEach((l) => { l.grow = approach(l.grow, l.landed / l.count, dt, 14); if (l.landed >= l.count && l.grow > 0.985) l.grow = 1; });
    if (pr && pr.layer.landed >= pr.layer.count && pr.layer.spawnedN >= pr.layer.count) { SD.pour = null; Sound.tick(); syncControls(); }
    // 굳어서 암석이 되는 순간
    const settled = SD.layers.length && !SD.pour && SD.layers.every((l) => l.landed >= l.count);
    if (settled && SD.pressS >= 0.93) {
      let first = false;
      SD.layers.forEach((l) => { if (!l.rocked) { l.rocked = true; l.popT = nowS(); SD.made.add(l.id); first = true; } });
      if (first) {
        Sound.tone(660, 0.12, 'triangle', 0.08); Sound.tone(880, 0.16, 'triangle', 0.07, 0.1);
        const b = sedBands(g);
        b.forEach((q) => { ringFx(V, T.x + T.w / 2, (q.y0 + q.y1) / 2, Math.min(40, q.th), '#fbbf24'); });
        V.P.burst(T.x + T.w / 2, (b.length ? b[b.length - 1].y0 : T.y + T.h) + 10, { count: 16, colors: ['#ffe9a8', '#ffffff', '#fbbf24'], speed: 120, gravity: 60, size: 3, life: 0.8 });
        syncControls();
      }
    } else if (SD.pressS < 0.6) SD.layers.forEach((l) => { l.rocked = false; });
    // 눌릴 때 빠져나가는 물방울
    const dp = Math.abs(SD.press - SD.pressS);
    SD.bubbleAcc += dt * dp * 40;
    if (SD.bubbleAcc > 1 && SD.layers.length && !RM && V.P.count < 90) {
      SD.bubbleAcc = 0;
      const b = sedBands(g), q = b[Math.floor(Math.random() * b.length)];
      if (q && q.th > 6) V.P.emit({ x: T.x + 12 + Math.random() * (T.w - 24), y: q.y1 - Math.random() * q.th, vx: 0, vy: -45 - Math.random() * 30, life: 1.5, size: 2.4 + Math.random() * 2.4, color: 'rgba(190,230,255,.9)', shape: 'bubble', gravity: -10 });
    }
  }

  function drawSedTank(V, g, t) {
    const { ctx, L } = V, B = g.B, T = g.tank, SD = S.sed, fs = L.fs, k = g.k;
    roundRect(ctx, B.x, B.y, B.w, B.h, 16);
    const bgG = ctx.createLinearGradient(0, B.y, 0, B.y + B.h); bgG.addColorStop(0, '#12354d'); bgG.addColorStop(1, '#10171f');
    ctx.fillStyle = bgG; ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,170,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
    cardTitle(ctx, L, B, '🌊 바다 밑 퇴적 상자');
    // 쏟아 붓는 통
    const pr = SD.pour, hy = T.y - 40 * Math.min(1, fs), hh = 22;
    ctx.save();
    const hg = ctx.createLinearGradient(0, hy, 0, hy + hh); hg.addColorStop(0, '#9aa7b4'); hg.addColorStop(1, '#556270');
    roundRect(ctx, T.x - 6, hy, T.w + 12, hh, 8); ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    const col = pr ? PACK[pr.id].cols[0] : '#7d8896';
    ctx.fillStyle = col; roundRect(ctx, T.x + 4, hy + hh - 8, T.w - 8, 6, 3); ctx.fill();
    ctx.restore();
    if (pr) tagPill(ctx, L, SED[pr.id].emoji + ' ' + SED[pr.id].name + ' 쏟는 중', T.x + T.w / 2, hy - 16 * fs, { bg: 'rgba(14,165,233,.92)', stroke: '#bae6fd', size: 13.5 });
    else if (!SD.layers.length) tagPill(ctx, L, '아래 버튼으로 퇴적물을 골라요', T.x + T.w / 2, hy - 16 * fs, { bg: 'rgba(6,10,26,.7)', size: 13.5 });
    // 상자 속: 물
    ctx.save();
    roundRect(ctx, T.x, T.y, T.w, T.h, 6); ctx.clip();
    ctx.fillStyle = '#0a1620'; ctx.fillRect(T.x, T.y, T.w, T.h);
    const wy = T.y + 16, wg = ctx.createLinearGradient(0, wy, 0, T.y + T.h);
    wg.addColorStop(0, 'rgba(70,160,220,.5)'); wg.addColorStop(1, 'rgba(20,80,130,.55)');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.moveTo(T.x, wy);
    for (let x = 0; x <= T.w; x += 10) ctx.lineTo(T.x + x, wy + (RM ? 0 : 2.4 * Math.sin(x * 0.07 + t * 1.6)));
    ctx.lineTo(T.x + T.w, T.y + T.h); ctx.lineTo(T.x, T.y + T.h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,235,255,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let x = 0; x <= T.w; x += 10) { const yy = wy + (RM ? 0 : 2.4 * Math.sin(x * 0.07 + t * 1.6)); if (x === 0) ctx.moveTo(T.x, yy); else ctx.lineTo(T.x + x, yy); } ctx.stroke();
    // 층
    const bands = sedBands(g), cs = smooth(0.04, 0.96, SD.pressS), u = cs * 2, i0 = Math.min(1, Math.floor(u)), aa = u - i0;
    bands.forEach((b) => {
      if (b.th < 0.5) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(T.x, b.y0, T.w, b.th + 0.6); ctx.clip();
      const sh = Math.ceil(SED[b.id].h0 * k) + 6, flip = b.i % 2 === 1;
      ctx.translate(flip ? T.x + T.w : T.x, b.y1 - sh);
      if (flip) ctx.scale(-1, 1);
      const s0 = getStrip(V, g, b.id, i0), s1 = getStrip(V, g, b.id, i0 + 1);
      if (s0) { ctx.drawImage(s0, 0, 0, T.w, sh); if (s1 && aa > 0.01) { ctx.globalAlpha = aa; ctx.drawImage(s1, 0, 0, T.w, sh); ctx.globalAlpha = 1; } }
      else { ctx.fillStyle = PACK[b.id].cols[0]; ctx.fillRect(0, 0, T.w, sh); }
      ctx.restore();
      // 층 사이의 경계 (눌려서 굳으면 또렷한 줄무늬: 층리)
      const edge = 0.35 + 0.6 * cs;
      const lg = ctx.createLinearGradient(0, b.y0, 0, b.y0 + 9);
      lg.addColorStop(0, 'rgba(10,8,6,' + (0.45 * edge) + ')'); lg.addColorStop(1, 'rgba(10,8,6,0)');
      ctx.fillStyle = lg; ctx.fillRect(T.x, b.y0, T.w, 9);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.14 + 0.1 * cs) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(T.x, b.y0 + 0.5); ctx.lineTo(T.x + T.w, b.y0 + 0.5); ctx.stroke();
      if (b.l.rocked) { const a = 1 - Math.min(1, (nowS() - b.l.popT) / 0.6); if (a > 0) { ctx.fillStyle = 'rgba(255,240,180,' + 0.45 * a + ')'; ctx.fillRect(T.x, b.y0, T.w, b.th); } }
    });
    // 물빛 덮기
    if (bands.length) { ctx.fillStyle = 'rgba(30,110,170,' + 0.16 * (1 - 0.6 * cs) + ')'; ctx.fillRect(T.x, sedTop(g) - 2, T.w, T.y + T.h - sedTop(g) + 2); }
    // 떨어지는 알갱이
    const byId = {};
    SD.grains.forEach((q) => { (byId[q.id + '|' + q.ci] || (byId[q.id + '|' + q.ci] = [])).push(q); });
    Object.keys(byId).forEach((kk) => {
      const parts = kk.split('|'); ctx.beginPath();
      byId[kk].forEach((q) => { const x = T.x + 6 + q.u * (T.w - 12); ctx.moveTo(x + q.r, q.y); ctx.arc(x, q.y, q.r, 0, TAU); });
      ctx.fillStyle = PACK[parts[0]].cols[+parts[1]]; ctx.fill();
    });
    // 누르는 힘 (시간이 흐를 때)
    if (SD.pressS > 0.03 && bands.length) {
      const top = sedTop(g), al = smooth(0.03, 0.2, SD.pressS) * (0.9 - 0.4 * smooth(0.85, 1, SD.pressS));
      ctx.globalAlpha = al; ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ax = T.x + T.w * (0.2 + 0.3 * i), len = (26 + 20 * SD.pressS) * Math.max(0.7, fs * 0.9), bob = RM ? 0 : 3 * Math.sin(t * 4 + i);
        const ay1 = Math.max(wy + 6, top - 12 - len) + bob, ay2 = Math.max(wy + 26, top - 12) + bob;
        ctx.beginPath(); ctx.moveTo(ax, ay1); ctx.lineTo(ax, ay2 - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax - 8, ay2 - 10); ctx.lineTo(ax, ay2); ctx.lineTo(ax + 8, ay2 - 10); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    }
    if (!bands.length && !pr) {
      ctx.font = fnt(L, 14.5, 'bold'); ctx.fillStyle = 'rgba(220,240,255,.6)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('여기에 퇴적물이 쌓여요', T.x + T.w / 2, T.y + T.h - 60 * fs);
    }
    ctx.restore();
    // 유리 상자 테두리
    roundRect(ctx, T.x, T.y, T.w, T.h, 6); ctx.strokeStyle = 'rgba(190,225,255,.55)'; ctx.lineWidth = 2.5; ctx.stroke();
    const gl = ctx.createLinearGradient(T.x, 0, T.x + 26, 0); gl.addColorStop(0, 'rgba(255,255,255,.2)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(T.x + 2, T.y + 4, 24, T.h - 8);
    // 바닥 암반
    const rg = ctx.createLinearGradient(0, T.y + T.h, 0, T.y + T.h + 14); rg.addColorStop(0, '#3a3744'); rg.addColorStop(1, '#23212b');
    roundRect(ctx, T.x - 8, T.y + T.h - 2, T.w + 16, 14, 5); ctx.fillStyle = rg; ctx.fill();
    // 층 이름표
    let lastY = 1e9;
    bands.forEach((b) => {
      const cy = Math.min((b.y0 + b.y1) / 2, lastY - 25 * fs); lastY = cy;
      const rocked = SD.pressS >= 0.9, sel = b.i === SD.sel;
      const txt = rocked ? SED[b.id].rock : sedLayerName(b.id);
      ctx.strokeStyle = sel ? '#fde68a' : 'rgba(255,255,255,.45)'; ctx.lineWidth = sel ? 2 : 1.5;
      ctx.beginPath(); ctx.moveTo(T.x + T.w + 2, (b.y0 + b.y1) / 2); ctx.lineTo(T.x + T.w + 12, cy); ctx.stroke();
      const sc = b.l.rocked ? 1 + 0.12 * Math.max(0, 1 - (nowS() - b.l.popT) / 0.5) : 1;
      ctx.save(); ctx.translate(T.x + T.w + 14, cy); ctx.scale(sc, sc); ctx.translate(-(T.x + T.w + 14), -cy);
      tagPill(ctx, L, (rocked ? '🪨 ' : '') + txt, T.x + T.w + 14, cy, { align: 'left', bg: rocked ? 'rgba(180,83,9,.92)' : 'rgba(6,10,26,.8)', stroke: sel ? '#fde68a' : null, size: 13.5 });
      ctx.restore();
    });
    if (bands.length && SD.pressS > 0.02) tagPill(ctx, L, '⏳ ' + sedTimeText(SD.pressS), B.x + B.w - 14, B.y + 24 * fs, { align: 'right', bg: 'rgba(6,10,26,.78)', size: 13 });
  }

  function drawSedLens(V, g, t) {
    const { ctx, L } = V, LC = g.LC, ln = g.lens, SD = S.sed, fs = L.fs;
    cardPanel(ctx, LC);
    cardTitle(ctx, L, LC, L.key === 'wide' ? '🔍 알갱이를 확대해서 봐요' : '🔍 알갱이 확대');
    const idx = SD.sel >= 0 && SD.sel < SD.layers.length ? SD.sel : SD.layers.length - 1, lay = SD.layers[idx];
    const c = smooth(0.04, 0.96, SD.pressS);
    lensFrame(V, ln.cx, ln.cy, ln.R, (cx) => {
      cx.fillStyle = PORE; cx.fillRect(ln.cx - ln.R, ln.cy - ln.R, ln.R * 2, ln.R * 2);
      if (lay) {
        cx.save(); cx.translate(ln.cx, ln.cy); const z = ln.R / 120; cx.scale(z, z);
        drawPack(cx, lay.id, 135, 135, c);
        if (c > 0.02) {
          cx.globalAlpha = smooth(0.02, 0.2, c) * 0.9; cx.fillStyle = '#fff'; cx.strokeStyle = '#fff'; cx.lineWidth = 5; cx.lineCap = 'round';
          for (let i = 0; i < 3; i++) { const ax = -64 + i * 64, by = RM ? 0 : 3 * Math.sin(t * 4 + i); cx.beginPath(); cx.moveTo(ax, -112 + by); cx.lineTo(ax, -84 + by); cx.stroke(); cx.beginPath(); cx.moveTo(ax - 9, -90 + by); cx.lineTo(ax, -78 + by); cx.lineTo(ax + 9, -90 + by); cx.closePath(); cx.fill(); }
          cx.globalAlpha = 1;
        }
        cx.restore();
      } else {
        cx.fillStyle = 'rgba(220,240,255,.7)'; cx.font = fnt(L, 14, 'bold'); cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillText('퇴적물을 쌓으면', ln.cx, ln.cy - 12 * fs); cx.fillText('알갱이를 볼 수 있어요', ln.cx, ln.cy + 10 * fs);
      }
    });
    if (lay) {
      const rocked = SD.pressS >= 0.93;
      tagPill(ctx, L, rocked ? '🪨 ' + SED[lay.id].rock : SED[lay.id].emoji + ' ' + sedLayerName(lay.id), ln.cx, ln.cy + ln.R - 22 * fs + (L.key === 'tall' ? 30 * fs : 0), { bg: rocked ? 'rgba(180,83,9,.92)' : 'rgba(6,10,26,.8)', size: 13.5 });
      // 범례
      const ly = L.key === 'wide' ? LC.y + LC.h - 15 : ln.cy + ln.R + 34 * fs;
      ctx.font = fnt(L, 12.5, 'bold'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const items = [[PACK[lay.id].cols[0], '알갱이'], [PORE, '빈틈(물)'], [PACK[lay.id].cement, '붙이는 물질']];
      let lx = L.key === 'wide' ? LC.x + 22 : LC.x + 18;
      items.forEach((q) => {
        ctx.fillStyle = q[0]; roundRect(ctx, lx, ly - 6, 12, 12, 3); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,233,207,.9)'; ctx.fillText(q[1], lx + 17, ly + 0.5); lx += 17 + ctx.measureText(q[1]).width + (L.key === 'wide' ? 22 : 14);
      });
    }
    if (L.key === 'tall') {
      ctx.fillStyle = '#ffe9cf'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const txt = lay ? sedDesc(SD.pressS, lay.id) : '버튼을 눌러 퇴적물을 쌓아 보세요.';
      const lines = wrapLines(ctx, txt, LC.w - 28);
      lines.forEach((ln2, i) => ctx.fillText(ln2, LC.x + LC.w / 2, ln.cy + ln.R + 62 * fs + i * 21 * fs));
    }
  }

  function drawSedLegend(V, g, t) {
    const { ctx, L } = V, TC = g.TC, SD = S.sed, fs = L.fs, wide = L.key === 'wide';
    cardPanel(ctx, TC);
    cardTitle(ctx, L, TC, '📒 퇴적물 → 퇴적암');
    const rowH = wide ? 52 : 86, y0 = TC.y + (wide ? 40 : 38), gap = 4;
    const lastId = SD.layers.length ? SD.layers[SD.sel >= 0 && SD.sel < SD.layers.length ? SD.sel : SD.layers.length - 1].id : null;
    SEDIDS.forEach((id, i) => {
      const y = y0 + i * (rowH + gap), s = SED[id], made = SD.made.has(id), cur = id === lastId;
      roundRect(ctx, TC.x + 10, y, TC.w - 20, rowH, 12);
      ctx.fillStyle = cur ? 'rgba(14,165,233,.2)' : 'rgba(0,0,0,.22)'; ctx.fill();
      ctx.strokeStyle = made ? '#34d399' : cur ? 'rgba(125,211,252,.8)' : 'rgba(255,233,207,.15)'; ctx.lineWidth = made ? 2.4 : 1.4; ctx.stroke();
      const sw = wide ? 36 : 34;
      // 퇴적물 알갱이 그림
      const sx = TC.x + 20, sy = y + (wide ? (rowH - sw) / 2 : 7);
      ctx.save(); roundRect(ctx, sx, sy, sw, sw, 8); ctx.clip();
      ctx.translate(sx + sw / 2, sy + sw / 2); ctx.scale(sw / 100 * 0.9, sw / 100 * 0.9); drawPack(ctx, id, 60, 60, 0.5);
      ctx.restore();
      roundRect(ctx, sx, sy, sw, sw, 8); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff4e4'; ctx.font = fnt(L, 15, 'bold');
      if (wide) {
        ctx.fillText(s.name, sx + sw + 10, y + rowH / 2 + 1);
        ctx.fillStyle = 'rgba(255,233,207,.7)'; ctx.font = fnt(L, 20, 'bold'); ctx.fillText('→', TC.x + 150, y + rowH / 2 + 1);
        drawRockIcon(ctx, SED_ROCK[id], TC.x + 186, y + 6, 58, 40, { r: 8 });
        ctx.fillStyle = made ? '#6ee7b7' : '#fff4e4'; ctx.font = fnt(L, 16, 'bold'); ctx.fillText(s.rock, TC.x + 254, y + rowH / 2 + 1);
        if (made) { ctx.font = fnt(L, 18, 'bold'); ctx.fillStyle = '#34d399'; ctx.textAlign = 'right'; ctx.fillText('✔', TC.x + TC.w - 20, y + rowH / 2 + 1); }
      } else {
        ctx.fillText(s.name, sx + sw + 10, sy + sw / 2 + 1);
        ctx.fillStyle = 'rgba(255,233,207,.7)'; ctx.font = fnt(L, 18, 'bold'); ctx.fillText('→', TC.x + TC.w - 54, sy + sw / 2);
        drawRockIcon(ctx, SED_ROCK[id], TC.x + 20, y + 44, 52, 34, { r: 7 });
        ctx.fillStyle = made ? '#6ee7b7' : '#fff4e4'; ctx.font = fnt(L, 16, 'bold'); ctx.fillText(s.rock, TC.x + 82, y + 62);
        if (made) { ctx.font = fnt(L, 18, 'bold'); ctx.fillStyle = '#34d399'; ctx.textAlign = 'right'; ctx.fillText('✔', TC.x + TC.w - 22, y + 62); }
      }
    });
    if (wide) {
      const lay = SD.layers[SD.sel >= 0 && SD.sel < SD.layers.length ? SD.sel : SD.layers.length - 1];
      ctx.fillStyle = '#ffe9cf'; ctx.font = fnt(L, 13.5, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const msg = SD.layers.length >= 2 && SD.pressS >= 0.93 ? '층층이 쌓인 줄무늬를 층리라고 해요.' : lay ? sedDesc(SD.pressS, lay.id) : '퇴적물이 쌓이고 굳어 퇴적암이 돼요.';
      const lines = wrapLines(ctx, msg, TC.w - 30);
      lines.forEach((ln2, i) => ctx.fillText(ln2, TC.x + TC.w / 2, TC.y + TC.h - 20 * lines.length + 10 + i * 18));
    } else if (SD.layers.length >= 2 && SD.pressS >= 0.93) {
      ctx.fillStyle = '#ffe9cf'; ctx.font = fnt(L, 13.5, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('줄무늬 = 층리', TC.x + TC.w / 2, TC.y + TC.h - 12);
    }
  }
  function drawSed(V, t) {
    const g = sedGeo(V.L);
    drawSedTank(V, g, t);
    drawSedLens(V, g, t);
    drawSedLegend(V, g, t);
  }
  function sedLayerAt(V, p) {
    const g = sedGeo(V.L), T = g.tank;
    if (p.x < T.x || p.x > T.x + T.w) return -1;
    const b = sedBands(g);
    for (let i = 0; i < b.length; i++) if (p.y >= b[i].y0 && p.y <= b[i].y1) return i;
    return -1;
  }
  SCENES.sed = {
    draw: drawSed,
    update: sedUpdate,
    enter() { },
    hover(V, p) { return sedLayerAt(V, p) >= 0 ? 'pointer' : null; },
    down(V, p) {
      const i = sedLayerAt(V, p);
      if (i >= 0) { S.sed.sel = i; Sound.tick(); const g = sedGeo(V.L), b = sedBands(g)[i]; ringFx(V, g.tank.x + g.tank.w / 2, (b.y0 + b.y1) / 2, Math.min(40, b.th), '#7dd3fc'); }
      return null;
    },
    sync() {
      const SD = S.sed, busy = !!SD.pour || SD.rewind, has = SD.layers.length > 0;
      $$('#sedSeg button').forEach((b) => { const on = !!SD.pour && SD.pour.id === b.dataset.s; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = busy; });
      const rg = $('#pressRange'); rg.disabled = !has || busy;
      if (!has) rg.value = 0;
      $('#pressOut').textContent = has ? sedTimeText(SD.press) : '먼저 퇴적물을 쌓아요';
      $('#sedReset').disabled = !has && !SD.pour;
    },
  };
  $('#sedSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-s]');
    if (!b || b.disabled) return;
    Sound.click(); sedPour(b.dataset.s);
  });
  $('#pressRange').addEventListener('input', () => {
    const SD = S.sed;
    if (!SD.layers.length || SD.pour || SD.rewind) return;
    SD.press = $('#pressRange').value / 100;
    syncControls();
  });
  $('#sedReset').addEventListener('click', () => { Sound.click(); sedReset(); });
  HOOKS.sed = {
    layerPt(i) { const V = activeView(), g = sedGeo(V.L), b = sedBands(g)[i]; return HOOKS.client(g.tank.x + g.tank.w / 2, (b.y0 + b.y1) / 2); },
    pour: sedPour, reset: sedReset,
    bands() { return sedBands(sedGeo(activeView().L)); },
  };
  /* =========================================================
     3단계 장면: 변성암 (높은 열과 압력)
     ========================================================= */
  const MSTAGE = {
    mud: [
      { rid: 'mudstone', name: '이암', note: '진흙이 굳은 퇴적암이에요. 알갱이가 아주 작고 제멋대로 놓여 있어요.' },
      { rid: 'schist', name: '편암', note: '열과 압력을 받아 광물이 한 방향으로 줄지어 배열돼요. 이 줄무늬를 엽리라고 해요.' },
      { rid: 'gneiss', name: '편마암', note: '더 센 열과 압력으로 밝은 광물과 어두운 광물이 띠 모양으로 나뉘어요. (뚜렷한 엽리)' },
    ],
    sand: [
      { rid: 'sandstone', name: '사암', note: '모래알이 굳은 퇴적암이에요. 알갱이 사이에 틈이 있어요.' },
      { rid: 'quartzite', name: '규암', note: '열과 압력으로 알갱이가 단단하게 붙어 한 덩어리처럼 돼요.' },
    ],
    lime: [
      { rid: 'limestone', name: '석회암', note: '석회 물질이 굳은 퇴적암이에요. 작은 결정들이 모여 있어요.' },
      { rid: 'marble', name: '대리암', note: '열과 압력으로 결정이 커지고 단단해져요. 하얗고 곱게 반짝여요.' },
    ],
  };
  const MBOUND = { mud: [0.3, 0.66], sand: [0.4], lime: [0.4] };
  const metaCells = { sand: null, fine: null, coarse: null };
  function ensureMetaCells() {
    [['sand', { M: 110, seed: 21, spread: 0, gscale: 1 }], ['fine', { M: 240, seed: 33, spread: 0.05, gscale: 1 }], ['coarse', { M: 22, seed: 45, spread: 0.7, gscale: 0.8 }]].forEach((q) => {
      if (metaCells[q[0]] !== null) return;
      metaCells[q[0]] = false;
      queueJob(cellsGen(q[1]), (g) => { metaCells[q[0]] = g; });
    });
  }
  function metaGeo(L) {
    if (L.key === 'wide') {
      return {
        D: { x: 12, y: 12, w: 384, h: 616 },
        block: { cx: 204, baseY: 500, w: 236, h: 190, plateH: 40, slabH: 36 },
        LC: { x: 408, y: 12, w: 380, h: 316 }, lens: { cx: 586, cy: 176, R: 120 },
        CC: { x: 408, y: 340, w: 380, h: 288 },
      };
    }
    return {
      D: { x: 10, y: 10, w: 500, h: 340 },
      block: { cx: 260, baseY: 262, w: 230, h: 124, plateH: 34, slabH: 30 },
      LC: { x: 10, y: 360, w: 250, h: 476 }, lens: { cx: 135, cy: 510, R: 92 },
      CC: { x: 270, y: 360, w: 240, h: 476 },
    };
  }
  const COMPRESS = 0.3;
  function metaBlock(g, p) {
    const B = g.block, h = B.h * (1 - COMPRESS * p), w = B.w * (1 + 0.07 * p);
    return { x: B.cx - w / 2, y: B.baseY - h, w, h };
  }
  function metaPlate(g, p) {
    const bl = metaBlock(g, p), B = g.block, pw = bl.w + 56;
    return { x: B.cx - pw / 2, y: bl.y - B.plateH - 3, w: pw, h: B.plateH };
  }
  function metaStages() { return MSTAGE[S.meta.rock]; }
  function metaStageIdx(p) { return metaStageOf(S.meta.rock, p); }
  // 단계마다 암석 무늬를 섞어요 (이암→편암→편마암 …)
  function metaMix(rock, p) {
    const st = MSTAGE[rock], b = MBOUND[rock], out = [];
    if (st.length === 3) {
      const a = smooth(b[0] - 0.04, b[0] + 0.04, p), c = smooth(b[1] - 0.04, b[1] + 0.04, p);
      out.push({ rid: st[0].rid, a: 1 - a }, { rid: st[1].rid, a: a * (1 - c) }, { rid: st[2].rid, a: c });
    } else { const a = smooth(b[0] - 0.04, b[0] + 0.04, p); out.push({ rid: st[0].rid, a: 1 - a }, { rid: st[1].rid, a }); }
    return out;
  }

  // 이암 → 편암 → 편마암: 납작한 광물(운모 등)이 눌려서 줄지어 배열돼요
  const FLAKE_COLS = ['#cdd5da', '#aeb9c0', '#3f3b42', '#56515c', '#ece6dc', '#d7cfc2'];
  let flakeSet = null;
  function getFlakes() {
    if (flakeSet) return flakeSet;
    const r = rng(77), out = [];
    for (let j = 0; j < 12; j++) {
      for (let i = 0; i < 12; i++) {
        const x = (i / 11 * 2 - 1) * 150 + (r() - 0.5) * 22, y = (j / 11 * 2 - 1) * 150 + (r() - 0.5) * 22;
        const t = r(), dark = t < 0.42, kind = dark ? (r() < 0.5 ? 2 : 3) : (t < 0.72 ? (r() < 0.5 ? 0 : 1) : (r() < 0.5 ? 4 : 5));
        out.push({ x, y, a0: r() * Math.PI, len: 15 + r() * 15, wid: 4.2 + r() * 3.4, kind, dark, band: 0 });
      }
    }
    return (flakeSet = out);
  }
  function drawFlakes(ctx, p, t) {
    const F = getFlakes(), a = smooth(0.1, 0.62, p), seg = smooth(0.62, 0.96, p), gr = 1 + 0.45 * smooth(0.25, 1, p);
    const bgc = mixa(hex('#6a584e'), hex('#4a434c'), smooth(0, 1, p));
    ctx.fillStyle = rgbs(bgc); ctx.fillRect(-150, -150, 300, 300);
    // 띠 바탕 (밝은 띠 · 어두운 띠)
    if (seg > 0.01) {
      for (let y = -170; y < 170; y += 68) {
        ctx.fillStyle = 'rgba(236,228,214,' + 0.16 * seg + ')'; ctx.fillRect(-150, y, 300, 34);
        ctx.fillStyle = 'rgba(20,16,20,' + 0.22 * seg + ')'; ctx.fillRect(-150, y + 34, 300, 34);
      }
    }
    // 흩어진 작은 알갱이 (진흙)
    const rr = rng(3);
    ctx.fillStyle = 'rgba(30,22,18,' + (0.5 * (1 - a)) + ')';
    ctx.beginPath(); for (let i = 0; i < 260; i++) { const x = (rr() * 2 - 1) * 150, y = (rr() * 2 - 1) * 150; ctx.moveTo(x + 2, y); ctx.arc(x, y, 1 + rr() * 1.4, 0, TAU); } ctx.fill();
    const buckets = {};
    F.forEach((f) => {
      let ang = lerp(f.a0, Math.PI * 2 * Math.round(f.a0 / Math.PI), a);
      ang = f.a0 * (1 - a);
      let y = f.y;
      if (seg > 0.01) { const band = Math.round(y / 68) * 68, tgt = band + (f.dark ? 34 + 17 : 17); y = lerp(y, tgt, seg); }
      const wob = RM ? 0 : (1 - a) * 0.05 * Math.sin(t * 0.8 + f.x);
      (buckets[f.kind] || (buckets[f.kind] = [])).push([f.x, y, ang + wob, f.len * gr * (0.8 + 0.2 * a), f.wid * (1 + 0.25 * seg)]);
    });
    Object.keys(buckets).forEach((kd) => {
      ctx.beginPath();
      buckets[kd].forEach((q) => { ctx.moveTo(q[0] + q[3] / 2 * Math.cos(q[2]), q[1] + q[3] / 2 * Math.sin(q[2])); ctx.ellipse(q[0], q[1], q[3] / 2, q[4] / 2, q[2], 0, TAU); });
      ctx.fillStyle = FLAKE_COLS[kd]; ctx.fill();
    });
    // 반짝이는 줄 (줄지어 배열되면 결이 보여요)
    if (a > 0.05) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 * a) + ')'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let y = -140; y < 150; y += 17) { ctx.moveTo(-150, y); for (let x = -150; x <= 150; x += 30) ctx.lineTo(x, y + 2 * Math.sin(x * 0.03 + y)); }
      ctx.stroke();
    }
  }
  // 사암 → 규암: 알갱이 사이의 경계가 사라지며 한 덩어리가 돼요 / 석회암 → 대리암: 작은 결정이 큰 결정으로
  const SAND_COLS = [[222, 196, 140], [214, 181, 116], [201, 164, 94], [234, 214, 162], [184, 147, 90]];
  const QZ_COLS = [[232, 222, 212], [220, 208, 196], [240, 232, 224], [206, 198, 192], [226, 214, 202]];
  const FINE_COLS = [[226, 218, 190], [214, 205, 175], [236, 230, 208], [200, 192, 164]];
  const COARSE_COLS = [[244, 241, 233], [234, 230, 220], [250, 249, 244], [224, 221, 212]];
  function renderSandLens(G, p, t) {
    const d = lensImg.data, N = G.N, V = G.valid, own = G.own, ed = G.ed, nz = G.nz, sx = G.sx, sy = G.sy, fuse = smooth(0.2, 0.85, p);
    const rg = 5.2 + 11 * fuse, line = 1.1 * (1 - fuse) + 0.2;
    d.fill(0);
    const pore = [38, 32, 30], cem = mixa([38, 32, 30], [176, 140, 96], smooth(0.1, 0.7, p));
    for (let i = 0; i < V.length; i++) {
      const k = V[i], o = own[k], e = ed[k], q = (o * 7 + 3) % 5, p4 = k << 2, x = k % N, y = (k / N) | 0;
      const dx = x + 0.5 - sx[o], dy = y + 0.5 - sy[o], ds = Math.sqrt(dx * dx + dy * dy);
      let r, g, b;
      if (ds > rg) { r = cem[0]; g = cem[1]; b = cem[2]; }
      else {
        const sh = (0.8 + 0.24 * (1 - ds / rg)) * (0.95 + 0.1 * nz[k]) - 0.04 * dy / 8 * (1 - fuse);
        r = lerp(SAND_COLS[q][0], QZ_COLS[q][0], fuse) * sh; g = lerp(SAND_COLS[q][1], QZ_COLS[q][1], fuse) * sh; b = lerp(SAND_COLS[q][2], QZ_COLS[q][2], fuse) * sh;
        if (e < line) { const f = clamp(1 - e / line, 0, 1) * 0.55; r = lerp(r, pore[0], f); g = lerp(g, pore[1], f); b = lerp(b, pore[2], f); }
        else if (ds > rg - 1.6) { const f = (ds - (rg - 1.6)) / 1.6 * 0.5; r = lerp(r, cem[0], f); g = lerp(g, cem[1], f); b = lerp(b, cem[2], f); }
      }
      d[p4] = r; d[p4 + 1] = g; d[p4 + 2] = b; d[p4 + 3] = 255;
    }
    lensCx.putImageData(lensImg, 0, 0);
  }
  function renderLimeLens(Gf, Gc, p, t) {
    const d = lensImg.data, N = Gf.N, V = Gf.valid, thr = smooth(0.12, 0.96, p);
    d.fill(0);
    for (let i = 0; i < V.length; i++) {
      const k = V[i], p4 = k << 2;
      let r, g, b;
      if (Gc.arr[k] <= thr) {
        const o = Gc.own[k], e = Gc.ed[k], c = COARSE_COLS[o % 4], sh = (0.9 + 0.1 * Math.min(e, 8) / 8) * (0.96 + 0.06 * Gc.nz[k]);
        r = c[0] * sh; g = c[1] * sh; b = c[2] * sh;
        if (e < 1.5) { const f = 0.8 + 0.2 * (e / 1.5); r *= f; g *= f; b *= f; }
        const front = Math.max(0, 1 - (thr - Gc.arr[k]) * 25);
        if (front > 0) { r += (255 - r) * front * 0.5; g += (255 - g) * front * 0.5; b += (255 - b) * front * 0.45; }
      } else {
        const o = Gf.own[k], e = Gf.ed[k], c = FINE_COLS[o % 4], sh = (0.84 + 0.16 * Math.min(e, 4) / 4) * (0.94 + 0.1 * Gf.nz[k]);
        r = c[0] * sh; g = c[1] * sh; b = c[2] * sh;
        if (e < 1.2) { r *= 0.74; g *= 0.74; b *= 0.74; }
      }
      d[p4] = r; d[p4 + 1] = g; d[p4 + 2] = b; d[p4 + 3] = 255;
    }
    lensCx.putImageData(lensImg, 0, 0);
  }
  function paintMetaDio(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1620'); g.addColorStop(1, '#2d1a16');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = rng(19);
    for (let i = 0; i < 16; i++) {
      const y = (i + 0.5) / 16 * H, th = 3 + r() * 9;
      c.fillStyle = r() < 0.5 ? 'rgba(255,214,170,.05)' : 'rgba(0,0,0,.18)';
      c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= W; x += 12) c.lineTo(x, y + 3 * Math.sin(x * 0.02 + i));
      for (let x = W; x >= 0; x -= 12) c.lineTo(x, y + th + 3 * Math.sin(x * 0.02 + i + 1));
      c.closePath(); c.fill();
    }
    for (let i = 0; i < 260; i++) { c.globalAlpha = 0.2 + r() * 0.4; c.fillStyle = r() < 0.5 ? '#6b5a5a' : '#120c10'; const s = 0.8 + r() * 2.2; c.fillRect(r() * W, r() * H, s, s); }
    c.globalAlpha = 1;
  }
  function drawRockFill(ctx, rid, x, y, w, h, alpha) {
    const big = wantRock(rid, true, true), sm = big || wantRock(rid, false, true);
    ctx.save(); ctx.globalAlpha *= alpha;
    if (sm) ctx.drawImage(sm, x, y, w, h); else { ctx.fillStyle = ROCKS[rid].col; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
  function drawArrowDown(ctx, x, y1, y2, w, col) {
    const hw = w * 1.15, hh = w * 1.2;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y1); ctx.lineTo(x + w / 2, y1); ctx.lineTo(x + w / 2, y2 - hh); ctx.lineTo(x + hw, y2 - hh); ctx.lineTo(x, y2); ctx.lineTo(x - hw, y2 - hh); ctx.lineTo(x - w / 2, y2 - hh); ctx.closePath(); ctx.fill();
  }
  function drawMetaDio(V, g, t) {
    const { ctx, L } = V, D = g.D, M = S.meta, p = M.ps, fs = L.fs, B = g.block;
    const bg = bgCache(V, 'metadio', D.w, D.h, (c) => paintMetaDio(c, D.w, D.h));
    ctx.save();
    roundRect(ctx, D.x, D.y, D.w, D.h, 16); ctx.clip();
    ctx.drawImage(bg.cv, D.x, D.y, D.w, D.h);
    const bl = metaBlock(g, p), pl = metaPlate(g, p), cx = B.cx, cy = bl.y + bl.h / 2;
    // 열: 뒤쪽 붉은 빛
    ctx.globalCompositeOperation = 'lighter';
    const hg = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(D.w, bl.w) * 0.8);
    hg.addColorStop(0, 'rgba(255,110,40,' + (0.5 * p) + ')'); hg.addColorStop(0.6, 'rgba(255,70,20,' + (0.18 * p) + ')'); hg.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = hg; ctx.fillRect(D.x, D.y, D.w, D.h);
    ctx.globalCompositeOperation = 'source-over';
    // 아래 받침
    const sw = bl.w + 56, sg = ctx.createLinearGradient(0, B.baseY, 0, B.baseY + B.slabH);
    sg.addColorStop(0, '#6a6470'); sg.addColorStop(1, '#2d2a33');
    roundRect(ctx, cx - sw / 2, B.baseY - 2, sw, B.slabH, 8); ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx, B.baseY - 1, bl.w * 0.55, 8, 0, 0, TAU); ctx.fill();
    // 암석 덩어리
    const sc = 0.88 + 0.12 * EZ.outBack(clamp(M.swap, 0, 1));
    ctx.save();
    ctx.translate(cx, bl.y + bl.h); ctx.scale(sc, sc); ctx.translate(-cx, -(bl.y + bl.h));
    roundRect(ctx, bl.x, bl.y, bl.w, bl.h, 12); ctx.save(); ctx.clip();
    ctx.fillStyle = '#222'; ctx.fillRect(bl.x, bl.y, bl.w, bl.h);
    metaMix(M.rock, p).forEach((m) => { if (m.a > 0.01) drawRockFill(ctx, m.rid, bl.x, bl.y, bl.w, bl.h, m.a); });
    const sh = ctx.createLinearGradient(bl.x, bl.y, bl.x + bl.w, bl.y + bl.h);
    sh.addColorStop(0, 'rgba(255,255,255,.2)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = sh; ctx.fillRect(bl.x, bl.y, bl.w, bl.h);
    ctx.fillStyle = 'rgba(255,100,30,' + (0.2 * p) + ')'; ctx.fillRect(bl.x, bl.y, bl.w, bl.h);
    ctx.restore();
    roundRect(ctx, bl.x, bl.y, bl.w, bl.h, 12); ctx.strokeStyle = 'rgba(20,12,14,.85)'; ctx.lineWidth = 3; ctx.stroke();
    roundRect(ctx, bl.x + 2, bl.y + 2, bl.w - 4, bl.h - 4, 10); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    // 위쪽 판 (끌어서 누르기)
    const grab = M.drag ? 1 : 0, py = pl.y + (M.drag ? 0 : 0);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10 + 8 * grab; ctx.shadowOffsetY = 4 + 3 * grab;
    const pg = ctx.createLinearGradient(0, py, 0, py + pl.h); pg.addColorStop(0, '#dfe6ee'); pg.addColorStop(0.5, '#9aa6b4'); pg.addColorStop(1, '#6b7684');
    roundRect(ctx, pl.x, py, pl.w, pl.h, 9); ctx.fillStyle = pg; ctx.fill();
    ctx.restore();
    roundRect(ctx, pl.x, py, pl.w, pl.h, 9); ctx.strokeStyle = M.drag ? '#fde68a' : 'rgba(255,255,255,.6)'; ctx.lineWidth = M.drag ? 3 : 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(40,48,60,.7)';
    [0.1, 0.9].forEach((q) => { circle(ctx, pl.x + pl.w * q, py + pl.h / 2, 4); ctx.fill(); });
    ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = '#263241'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⬇ 끌어서 누르기', cx, py + pl.h / 2 + 1);
    // 누르는 힘 화살표
    const bob = RM || M.drag ? 0 : 4 * Math.sin(t * 3) * (1 - p), alen = (L.key === 'wide' ? 40 + 40 * p : 20 + 22 * p);
    [-0.34, 0.34].forEach((q) => { drawArrowDown(ctx, cx + pl.w * q, py - alen - 4 + bob, py - 3 + bob, 15 * Math.min(1.2, fs), 'rgba(239,68,68,' + (0.55 + 0.4 * p) + ')'); });
    if (L.key === 'wide') tagPill(ctx, L, '압력', cx, py - alen - 22 * fs + bob, { bg: 'rgba(185,28,28,.9)', size: 13.5 });
    // 열: 일렁이는 선과 불씨
    if (p > 0.03) {
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const sd = i < 3 ? -1 : 1, bx = cx + sd * (bl.w / 2 + 16 + (i % 3) * 14), ph = t * 2.4 + i;
        ctx.strokeStyle = 'rgba(255,' + (150 + 40 * (i % 3)) + ',60,' + (0.7 * p) + ')';
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const yy = B.baseY - k * (bl.h / 8) * 0.95, xx = bx + (RM ? 0 : 5 * Math.sin(ph + k * 0.9)); if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    ctx.restore();
    // 바깥 이름표 · 눈금
    tagPill(ctx, L, '🔥 땅속 깊은 곳 · 높은 열과 압력', D.x + D.w / 2, D.y + 22 * fs, { bg: 'rgba(6,10,26,.72)', size: 13.5 });
    const gx = D.x + 16, gy = D.y + 54 * fs, gw = D.w - 32 > 170 ? 170 : D.w - 32;
    ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = '#ffe9cf'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('열과 압력', gx, gy);
    roundRect(ctx, gx + 74 * fs, gy - 6, gw - 74 * fs + 14, 12, 6); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    const gg = ctx.createLinearGradient(gx + 74 * fs, 0, gx + gw + 14, 0); gg.addColorStop(0, '#38bdf8'); gg.addColorStop(0.5, '#fb923c'); gg.addColorStop(1, '#ef4444');
    if (p > 0.005) { roundRect(ctx, gx + 74 * fs, gy - 6, Math.max(12, (gw - 74 * fs + 14) * p), 12, 6); ctx.fillStyle = gg; ctx.fill(); }
    // 지금 암석 이름
    const st = metaStages()[metaStageIdx(p)], pop = M.pop ? nowS() - M.pop : 9, ps = pop < 0.5 ? 1 + 0.18 * Math.sin(pop / 0.5 * Math.PI) : 1;
    ctx.save(); ctx.translate(cx, B.baseY + B.slabH + 28 * fs); ctx.scale(ps, ps);
    tagPill(ctx, L, '🪨 ' + st.name, 0, 0, { bg: metaStageIdx(p) > 0 ? 'rgba(109,40,217,.92)' : 'rgba(6,10,26,.8)', stroke: metaStageIdx(p) > 0 ? '#ddd6fe' : null, size: 16, h: 30 });
    ctx.restore();
    roundRect(ctx, D.x, D.y, D.w, D.h, 16); ctx.strokeStyle = 'rgba(255,214,170,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function metaLensCaption(rock, p) {
    const idx = metaStageOf(rock, p);
    if (rock === 'mud') return idx === 0 ? '진흙 알갱이가 제멋대로 놓여 있어요' : idx === 1 ? '광물이 한 방향으로 줄지어 배열돼요 (엽리)' : '밝은 광물과 어두운 광물이 띠를 이뤄요';
    if (rock === 'sand') return idx === 0 ? '알갱이 사이에 틈이 있어요' : '알갱이가 단단히 붙어 한 덩어리가 돼요';
    return idx === 0 ? '작은 결정들이 모여 있어요' : '결정이 커지고 서로 맞물려요';
  }
  function drawMetaLens(V, g, t) {
    const { ctx, L } = V, LC = g.LC, ln = g.lens, M = S.meta, p = M.ps, rock = M.rock, fs = L.fs;
    cardPanel(ctx, LC);
    cardTitle(ctx, L, LC, L.key === 'wide' ? '🔍 광물 알갱이를 확대해서 봐요' : '🔍 알갱이 확대');
    let ready = true;
    if (rock === 'sand') { ready = !!metaCells.sand; if (ready) renderSandLens(metaCells.sand, p, t); }
    else if (rock === 'lime') { ready = !!(metaCells.fine && metaCells.coarse); if (ready) renderLimeLens(metaCells.fine, metaCells.coarse, p, t); }
    lensFrame(V, ln.cx, ln.cy, ln.R, (c) => {
      c.fillStyle = '#2a2024'; c.fillRect(ln.cx - ln.R, ln.cy - ln.R, ln.R * 2, ln.R * 2);
      if (rock === 'mud') { c.save(); c.translate(ln.cx, ln.cy); const z = ln.R / 120; c.scale(z, z); drawFlakes(c, p, t); c.restore(); }
      else if (ready) { c.imageSmoothingEnabled = true; c.drawImage(lensCv, ln.cx - ln.R, ln.cy - ln.R, ln.R * 2, ln.R * 2); }
      if (p > 0.03) {
        c.globalAlpha = smooth(0.03, 0.2, p) * 0.85; c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 5; c.lineCap = 'round';
        const z = ln.R / 120;
        for (let i = 0; i < 3; i++) { const ax = ln.cx + (-64 + i * 64) * z, by = (RM ? 0 : 3 * Math.sin(t * 4 + i)); c.beginPath(); c.moveTo(ax, ln.cy - 112 * z + by); c.lineTo(ax, ln.cy - 84 * z + by); c.stroke(); c.beginPath(); c.moveTo(ax - 9 * z, ln.cy - 90 * z + by); c.lineTo(ax, ln.cy - 78 * z + by); c.lineTo(ax + 9 * z, ln.cy - 90 * z + by); c.closePath(); c.fill(); }
        c.globalAlpha = 1;
      }
    });
    const st = metaStages()[metaStageIdx(p)];
    tagPill(ctx, L, '🪨 ' + st.name, ln.cx, ln.cy + ln.R - 22 * fs + (L.key === 'tall' ? 30 * fs : 0), { bg: metaStageIdx(p) > 0 ? 'rgba(109,40,217,.92)' : 'rgba(6,10,26,.8)', size: 13.5 });
    ctx.fillStyle = '#ffe9cf'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = metaLensCaption(rock, p);
    if (L.key === 'tall') {
      ctx.textBaseline = 'top';
      const lines = wrapLines(ctx, txt, LC.w - 28);
      lines.forEach((l2, i) => ctx.fillText(l2, LC.x + LC.w / 2, ln.cy + ln.R + 70 * fs + i * 21 * fs));
    } else {
      const lines = wrapLines(ctx, txt, LC.w - 30);
      lines.forEach((l2, i) => ctx.fillText(l2, LC.x + LC.w / 2 - 38, LC.y + LC.h - 18 - (lines.length - 1 - i) * 18));
    }
  }
  function drawMetaChart(V, g, t) {
    const { ctx, L } = V, CC = g.CC, M = S.meta, p = M.ps, fs = L.fs, wide = L.key === 'wide', sts = metaStages(), n = sts.length, idx = metaStageIdx(p), bnd = MBOUND[M.rock];
    cardPanel(ctx, CC);
    cardTitle(ctx, L, CC, wide ? '💠 ' + sts[0].name + '이 변해 가요' : '💠 변해 가요');
    const tx0 = CC.x + 28, tx1 = CC.x + CC.w - 28, ty = wide ? CC.y + 168 : CC.y + 56;
    // 진행 막대
    roundRect(ctx, tx0, ty - 6, tx1 - tx0, 12, 6); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    const gg = ctx.createLinearGradient(tx0, 0, tx1, 0); gg.addColorStop(0, '#38bdf8'); gg.addColorStop(0.5, '#fb923c'); gg.addColorStop(1, '#ef4444');
    if (p > 0.005) { roundRect(ctx, tx0, ty - 6, Math.max(12, (tx1 - tx0) * p), 12, 6); ctx.fillStyle = gg; ctx.fill(); }
    bnd.forEach((b) => { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(tx0 + (tx1 - tx0) * b - 1, ty - 9, 2, 18); });
    circle(ctx, tx0 + (tx1 - tx0) * p, ty, 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = fnt(L, 12.5, 'bold'); ctx.fillStyle = 'rgba(255,233,207,.8)'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillText('약한 열·압력', tx0 - 6, ty + 22 * fs); ctx.textAlign = 'right'; ctx.fillText('센 열·압력', tx1 + 6, ty + 22 * fs);
    // 단계 그림
    sts.forEach((s, i) => {
      const reached = i <= idx, cur = i === idx;
      let x, y, w, h;
      if (wide) { w = 96; h = 66; x = CC.x + CC.w * (i + 0.5) / n - w / 2; y = CC.y + 46; }
      else { w = 84; h = 60; x = CC.x + 14; y = CC.y + 100 + i * 94; }
      ctx.save();
      if (cur) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(1.06, 1.06); ctx.translate(-(x + w / 2), -(y + h / 2)); }
      drawRockIcon(ctx, s.rid, x, y, w, h, { r: 10, alpha: reached ? 1 : 0.45, stroke: cur ? '#fbbf24' : 'rgba(255,255,255,.35)', lw: cur ? 3 : 1.4 });
      ctx.restore();
      ctx.textAlign = wide ? 'center' : 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = reached ? '#fff4e4' : 'rgba(255,233,207,.5)'; ctx.font = fnt(L, 16, 'bold');
      if (wide) {
        ctx.fillText(s.name, x + w / 2, y + h + 18);
        if (i < n - 1) { const ax = x + w + (CC.w / n - w) / 2; ctx.fillStyle = 'rgba(255,233,207,.7)'; ctx.font = fnt(L, 20, 'bold'); ctx.fillText('→', ax, y + h / 2); }
      } else {
        ctx.fillText(s.name, x + w + 12, y + h / 2 - 8);
        if (cur) tagPill(ctx, L, '지금', x + w + 12, y + h / 2 + 18, { align: 'left', bg: 'rgba(251,191,36,.95)', color: '#422006', size: 12.5, h: 22 });
        else if (i > idx) { ctx.font = fnt(L, 12.5, 'bold'); ctx.fillStyle = 'rgba(255,233,207,.5)'; ctx.fillText('더 세게 → ', x + w + 12, y + h / 2 + 14); }
        if (i < n - 1) { ctx.fillStyle = 'rgba(255,233,207,.6)'; ctx.font = fnt(L, 16, 'bold'); ctx.textAlign = 'center'; ctx.fillText('↓', x + w / 2, y + h + 17); }
      }
    });
    // 설명
    const note = sts[idx].note, dy = wide ? CC.y + 214 : CC.y + 100 + n * 94 + 4;
    ctx.fillStyle = '#ffe9cf'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = wide ? 'center' : 'left'; ctx.textBaseline = 'top';
    const lines = wrapLines(ctx, note, CC.w - 34), lh = 20 * fs;
    lines.slice(0, wide ? 4 : 5).forEach((l2, i) => ctx.fillText(l2, wide ? CC.x + CC.w / 2 : CC.x + 16, dy + i * lh));
    if (M.rock === 'mud' && idx >= 1) tagPill(ctx, L, '엽리 ✔', CC.x + CC.w - 16, CC.y + 22 * fs, { align: 'right', bg: 'rgba(109,40,217,.92)', stroke: '#ddd6fe', size: 13 });
  }
  function drawMeta(V, t) {
    const g = metaGeo(V.L);
    drawMetaDio(V, g, t);
    drawMetaLens(V, g, t);
    drawMetaChart(V, g, t);
  }
  const heatText = (p) => (p < 0.08 ? '약해요' : p < 0.4 ? '조금 세졌어요' : p < 0.7 ? '세졌어요' : '아주 세요');
  function metaSetRock(r) {
    const M = S.meta;
    if (M.rock === r) return;
    M.rock = r; M.p = 0; M.swap = 0;
    ensureMetaCells();
    if (RM) { M.swap = 1; $('#heatRange').value = 0; } else {
      SciSim.tween(M, { swap: 1 }, { duration: 0.5, ease: 'outBack' });
      const rg = $('#heatRange'), o = { x: +rg.value };
      SciSim.tween(o, { x: 0 }, { duration: 0.4, ease: 'outCubic', onUpdate: () => { rg.value = o.x; } });
    }
    syncControls();
  }
  function metaUpdate(dt, t) {
    const M = S.meta, V = activeView(), g = metaGeo(V.L);
    M.ps = approach(M.ps, M.p, dt, 7);
    const idx = metaStageOf(M.rock, M.ps), bnd = MBOUND[M.rock], sts = MSTAGE[M.rock];
    for (let i = 1; i < sts.length; i++) {
      if (M.ps >= bnd[i - 1] + 0.05 && !M.made.has(sts[i].name)) {
        M.made.add(sts[i].name); M.pop = nowS();
        const bl = metaBlock(g, M.ps);
        ringFx(V, g.block.cx, bl.y + bl.h / 2, Math.min(bl.w, bl.h) / 2, '#a78bfa');
        V.P.burst(g.block.cx, bl.y + bl.h / 2, { count: 22, colors: ['#c4b5fd', '#ffffff', '#fbbf24', '#fb923c'], speed: 190, gravity: 100, size: 3.4, life: 0.9 });
        Sound.tone(660, 0.12, 'triangle', 0.08); Sound.tone(990, 0.16, 'triangle', 0.07, 0.1);
      }
    }
    if (idx !== M.lastIdx) { if (M.lastIdx != null && idx < M.lastIdx) M.pop = nowS(); M.lastIdx = idx; }
    if (!RM && M.ps > 0.2 && V.P.count < 90 && Math.random() < dt * 14 * M.ps) {
      const bl = metaBlock(g, M.ps);
      V.P.emit({ x: g.block.cx + (Math.random() - 0.5) * bl.w * 1.2, y: g.block.baseY - 4, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 60, life: 1.1, size: 1.8, color: Math.random() < 0.5 ? '#ffb15a' : '#ff7a3a', gravity: -10, shape: 'circle' });
    }
  }
  function metaPlateHit(V, p) {
    const g = metaGeo(V.L), pl = metaPlate(g, S.meta.ps);
    return p.x >= pl.x - 6 && p.x <= pl.x + pl.w + 6 && p.y >= pl.y - 110 && p.y <= pl.y + pl.h + 6;
  }
  SCENES.meta = {
    draw: drawMeta,
    update: metaUpdate,
    enter() { ensureMetaCells(); Object.keys(MSTAGE).forEach((k) => MSTAGE[k].forEach((s) => wantRock(s.rid, true, true))); },
    hover(V, p) { return metaPlateHit(V, p) ? (S.meta.drag ? 'grabbing' : 'grab') : null; },
    blocks(V, p) { return metaPlateHit(V, p); },
    down(V, p) {
      if (!metaPlateHit(V, p)) return null;
      const g = metaGeo(V.L), pl = metaPlate(g, S.meta.ps);
      S.meta.drag = { off: p.y - pl.y }; Sound.tick();
      return { kind: 'plate' };
    },
    move(V, d, p) {
      const g = metaGeo(V.L), M = S.meta, y0 = metaPlate(g, 0).y, travel = g.block.h * COMPRESS;
      M.p = clamp((p.y - S.meta.drag.off - y0) / travel, 0, 1);
      $('#heatRange').value = Math.round(M.p * 100); syncControls();
    },
    up() { S.meta.drag = null; },
    sync() {
      const M = S.meta;
      $$('#metaSeg button').forEach((b) => { const on = b.dataset.r === M.rock; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      const rg = $('#heatRange'); if (document.activeElement !== rg && !M.drag) rg.value = Math.round(M.p * 100);
      $('#heatOut').textContent = heatText(M.p);
      $('#metaNote').textContent = M.p < 0.05 ? '위쪽 판을 아래로 끌어도 돼요.' : M.rock === 'mud' ? '이암이 어떻게 변하는지 지켜봐요.' : M.rock === 'sand' ? '사암의 알갱이를 지켜봐요.' : '석회암의 결정을 지켜봐요.';
    },
  };
  $('#metaSeg').addEventListener('click', (e) => { const b = e.target.closest('button[data-r]'); if (!b) return; Sound.click(); metaSetRock(b.dataset.r); });
  $('#heatRange').addEventListener('input', () => { S.meta.p = $('#heatRange').value / 100; syncControls(); });
  HOOKS.meta = {
    plate() { const V = activeView(), g = metaGeo(V.L), pl = metaPlate(g, S.meta.ps); return HOOKS.client(pl.x + pl.w / 2, pl.y + pl.h / 2); },
    plateAt(p) { const V = activeView(), g = metaGeo(V.L), pl = metaPlate(g, p); return HOOKS.client(pl.x + pl.w / 2, pl.y + pl.h / 2); },
    setRock: metaSetRock,
  };
  /* =========================================================
     4단계 장면: 암석의 순환 (빈 화살표에 과정 붙이기)
     ========================================================= */
  const PROC_COL = { cool: '#38bdf8', weather: '#84cc16', deposit: '#f59e0b', heatp: '#f97316', melt: '#ef4444' };
  const NODE_BY = {}; CYC_NODES.forEach((n) => (NODE_BY[n.id] = n));
  const NODE_ANG = { igneous: -90, sediment: -18, sedrock: 54, meta: 126, magma: 198 };
  function cycGeo(L) {
    const wide = L.key === 'wide';
    const A = wide ? { x: 12, y: 12, w: 776, h: 486 } : { x: 10, y: 10, w: 500, h: 566 };
    const T = wide ? { x: 12, y: 510, w: 776, h: 118 } : { x: 10, y: 586, w: 500, h: 250 };
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2 + (wide ? 6 : 4), rx = wide ? 286 : 168, ry = wide ? 168 : 206;
    const nw = wide ? 150 : 124, nh = wide ? 90 : 86, sw = wide ? 136 : 120, sh = wide ? 42 : 42;
    const nodes = {};
    const TALL = { igneous: [260, 68], sediment: [412, 232], sedrock: [392, 440], meta: [128, 440], magma: [108, 232] };
    CYC_NODES.forEach((n) => {
      if (wide) { const a = NODE_ANG[n.id] * DEG; nodes[n.id] = { id: n.id, x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), w: nw, h: nh }; }
      else nodes[n.id] = { id: n.id, x: A.x + TALL[n.id][0] - 10, y: A.y + TALL[n.id][1] - 10, w: nw, h: nh };
    });
    const bul = wide ? { a1: 36, a2: 36, a3: 36, a4: 36, a5: 36 } : { a1: 36, a2: 36, a3: 28, a4: 12, a5: 28 };
    const arrows = CYC_ARROWS.map((a) => curveOf(nodes[a.from], nodes[a.to], cx, cy, bul[a.id], 6, a));
    // 빈칸이 이름표 카드와 겹치지 않게, 화살표를 따라 알맞은 자리를 찾아요
    arrows.forEach((cv) => {
      const ts = [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7];
      cv.slotT = 0.5;
      for (let i = 0; i < ts.length; i++) {
        const m = bez(cv, ts[i]), r = { x: m.x - sw / 2 - 5, y: m.y - sh / 2 - 5, w: sw + 10, h: sh + 10 };
        const hit = CYC_NODES.some((n) => { const q = nodes[n.id]; return !(r.x + r.w < q.x - q.w / 2 || r.x > q.x + q.w / 2 || r.y + r.h < q.y - q.h / 2 || r.y > q.y + q.h / 2); });
        if (!hit) { cv.slotT = ts[i]; break; }
      }
    });
    const extras = CYC_EXTRA.filter((x) => x.id !== 'x6').map((a) => {
      const sep = Math.abs(((NODE_ANG[a.to] - NODE_ANG[a.from]) % 360 + 540) % 360 - 180);
      const adjacent = sep < 100;
      return curveOf(nodes[a.from], nodes[a.to], cx, cy, adjacent ? -(wide ? 30 : 26) : (a.id === 'x2' ? 26 : -26), 6, a, !adjacent);
    });
    // 카드(과정) 놓는 자리
    const tray = {};
    CYC_PROCS.forEach((c, i) => {
      if (wide) tray[c.id] = { x: T.x + 12 + 71 + i * 150, y: T.y + 74, w: 138, h: 46 };
      else { const col = i % 3, row = (i / 3) | 0, n = row ? 2 : 3, x0 = T.x + T.w / 2 - (n * 150 + (n - 1) * 8) / 2; tray[c.id] = { x: x0 + 75 + col * 158, y: T.y + 96 + row * 66, w: 148, h: 52 }; }
    });
    return { A, T, cx, cy, nodes, arrows, extras, tray, nw, nh, sw, sh, wide };
  }
  function edgePt(n, tx, ty, pad) {
    const dx = tx - n.x, dy = ty - n.y, hw = n.w / 2 + pad, hh = n.h / 2 + pad;
    const t = Math.min(Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : 1e9);
    return { x: n.x + dx * t, y: n.y + dy * t };
  }
  function curveOf(n0, n1, cx, cy, bulge, pad, arrow, perp) {
    const mx = (n0.x + n1.x) / 2, my = (n0.y + n1.y) / 2;
    let dx, dy;
    if (perp) { dx = -(n1.y - n0.y); dy = n1.x - n0.x; } else { dx = mx - cx; dy = my - cy; }
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const c = { x: mx + dx * bulge, y: my + dy * bulge };
    const p0 = edgePt(n0, c.x, c.y, pad), p1 = edgePt(n1, c.x, c.y, pad + 4);
    return { id: arrow.id, from: arrow.from, to: arrow.to, proc: arrow.proc, p0, c, p1 };
  }
  const bez = (cv, t) => { const u = 1 - t; return { x: u * u * cv.p0.x + 2 * u * t * cv.c.x + t * t * cv.p1.x, y: u * u * cv.p0.y + 2 * u * t * cv.c.y + t * t * cv.p1.y }; };
  const bezTan = (cv, t) => { const dx = 2 * (1 - t) * (cv.c.x - cv.p0.x) + 2 * t * (cv.p1.x - cv.c.x), dy = 2 * (1 - t) * (cv.c.y - cv.p0.y) + 2 * t * (cv.p1.y - cv.c.y); return Math.atan2(dy, dx); };
  function slotRect(g, cv) { const m = bez(cv, cv.slotT || 0.5); return { x: m.x - g.sw / 2, y: m.y - g.sh / 2, w: g.sw, h: g.sh }; }
  function cycChip(id) {
    const C = S.cyc;
    return C.chips[id] || (C.chips[id] = { id, x: null, y: null, vx: 0, vy: 0, held: false, lift: 0 });
  }
  const slotOfProc = (pid) => { const a = CYC_ARROWS.find((q) => S.cyc.slots[q.id] === pid); return a ? a.id : null; };
  function cycAllCorrect() { return CYC_ARROWS.every((a) => S.cyc.slots[a.id] === a.proc); }
  function cycFill() { CYC_ARROWS.forEach((a) => { S.cyc.slots[a.id] = a.proc; }); }
  function cycReset(full) {
    const C = S.cyc;
    C.slots = {}; C.sel = null; C.drag = null; C.wrong = {}; C.unlocked = false; C.done = false; C.extra = false; C.extraS = 0; C.tap = null;
    if (full) C.chips = {};
    syncControls();
  }
  function cycNodeArt(ctx, n, x, y, w, h, t) {
    ctx.save(); roundRect(ctx, x, y, w, h, 8); ctx.clip();
    if (n.id === 'igneous') drawRockIconRaw(ctx, 'granite', x, y, w, h);
    else if (n.id === 'sedrock') drawRockIconRaw(ctx, 'sandstone', x, y, w, h);
    else if (n.id === 'meta') drawRockIconRaw(ctx, 'gneiss', x, y, w, h);
    else if (n.id === 'sediment') { ctx.translate(x + w / 2, y + h / 2); const z = h / 100; ctx.scale(z, z); drawPack(ctx, 'sand', w / z / 2 + 4, 52, 0.2); }
    else {
      ctx.fillStyle = '#2a0f0c'; ctx.fillRect(x, y, w, h);
      const wob = RM ? 0 : 0.06;
      blobPath(ctx, x + w / 2, y + h / 2 + 2, w * 0.4, h * 0.42, t, 4, wob);
      const g = ctx.createRadialGradient(x + w / 2 - 8, y + h / 2 - 6, 2, x + w / 2, y + h / 2, w * 0.42);
      g.addColorStop(0, '#fff1a8'); g.addColorStop(0.45, '#ff9a3c'); g.addColorStop(1, '#c2260e');
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.restore();
  }
  function drawRockIconRaw(ctx, rid, x, y, w, h) {
    const cv = wantRock(rid, false);
    if (cv) ctx.drawImage(cv, x, y, w, h); else { ctx.fillStyle = ROCKS[rid].col; ctx.fillRect(x, y, w, h); }
  }
  function drawCycNode(V, g, n, t) {
    const { ctx, L } = V, nd = g.nodes[n.id], fs = L.fs, x = nd.x - nd.w / 2, y = nd.y - nd.h / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    roundRect(ctx, x, y, nd.w, nd.h, 14); ctx.fillStyle = '#2a2030'; ctx.fill();
    ctx.restore();
    const ih = nd.h - 34 * Math.min(1.1, fs);
    cycNodeArt(ctx, n, x + 7, y + 7, nd.w - 14, ih - 4, t);
    const by = y + 7 + ih - 4 + 5, bh = nd.h - (by - y) - 6;
    roundRect(ctx, x + 6, by, nd.w - 12, bh, 9); ctx.fillStyle = n.color; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = fnt(L, 16, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(n.emoji + ' ' + n.name, nd.x, by + bh / 2 + 1);
    roundRect(ctx, x, y, nd.w, nd.h, 14); ctx.strokeStyle = n.color; ctx.lineWidth = 3; ctx.stroke();
  }
  function arrowHead(ctx, x, y, ang, size, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-size, -size * 0.62); ctx.lineTo(-size * 0.7, 0); ctx.lineTo(-size, size * 0.62); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  function drawCycArrow(ctx, cv, o) {
    ctx.save();
    ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.strokeStyle = o.col; ctx.lineWidth = o.w; ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.beginPath(); ctx.moveTo(cv.p0.x, cv.p0.y); ctx.quadraticCurveTo(cv.c.x, cv.c.y, cv.p1.x, cv.p1.y); ctx.stroke();
    ctx.setLineDash([]);
    arrowHead(ctx, cv.p1.x, cv.p1.y, bezTan(cv, 1), o.head, o.col);
    ctx.restore();
  }
  function cycChipDraw(V, o, cx, cy, w, h, procId, st) {
    const { ctx, L } = V, pr = CP[procId], col = PROC_COL[procId], fs = L.fs;
    st = st || {};
    ctx.save();
    ctx.translate(cx, cy);
    const sc = 1 + 0.07 * (st.lift || 0); ctx.scale(sc, sc);
    if (st.shake) ctx.translate(Math.sin(nowS() * 60) * 4 * st.shake, 0);
    ctx.shadowColor = 'rgba(0,0,0,' + (0.3 + 0.2 * (st.lift || 0)) + ')'; ctx.shadowBlur = 8 + 10 * (st.lift || 0); ctx.shadowOffsetY = 3 + 6 * (st.lift || 0);
    roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, mixRGBS(col, '#ffffff', 0.35)); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = st.sel ? '#fde047' : st.bad ? '#fff' : 'rgba(255,255,255,.7)'; ctx.lineWidth = st.sel ? 3.4 : 1.8; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 2;
    ctx.fillText(pr.emoji + ' ' + pr.name, 0, 1);
    ctx.restore();
  }
  const mixRGBS = (a, b, t) => rgbs(mixa(hex(a), hex(b), t));
  // 순환도를 따라 돌며 모습이 바뀌는 암석 알갱이 (냉각 · 풍화 · 퇴적 · 열과 압력 · 녹음)
  function cycTokenArt(ctx, id, r, t) {
    ctx.save(); circle(ctx, 0, 0, r); ctx.clip();
    if (id === 'igneous' || id === 'sedrock' || id === 'meta') {
      const rid = id === 'igneous' ? 'granite' : id === 'sedrock' ? 'sandstone' : 'gneiss', cv = wantRock(rid, false);
      if (cv) ctx.drawImage(cv, -r * 1.35, -r, r * 2.7, r * 2); else { ctx.fillStyle = ROCKS[rid].col; ctx.fillRect(-r, -r, r * 2, r * 2); }
    } else if (id === 'sediment') { const z = r / 52; ctx.scale(z, z); drawPack(ctx, 'sand', 60, 60, 0.1); }
    else {
      const g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 1, 0, 0, r); g.addColorStop(0, '#fff1a8'); g.addColorStop(0.5, '#ff9a3c'); g.addColorStop(1, '#c2260e');
      ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    ctx.restore();
  }
  function drawTraveler(ctx, g, t) {
    const n = CYC_ARROWS.length, k = (t * 0.17) % n, i = Math.floor(k), u = k - i, cv = g.arrows[i], a = CYC_ARROWS[i];
    const pt = bez(cv, u), ang = bezTan(cv, u), r = g.wide ? 18 : 15, col = PROC_COL[a.proc], mix = smooth(0.35, 0.65, u), fade = Math.min(1, u * 8, (1 - u) * 8);
    ctx.save(); ctx.translate(pt.x, pt.y); ctx.globalAlpha = 0.25 + 0.75 * fade;
    // 과정별 효과 (뒤쪽)
    if (a.proc === 'weather') {
      ctx.fillStyle = '#a8a29e';
      for (let j = 0; j < 5; j++) { const fy = r * 0.5 + ((t * 38 + j * 11) % 28), fx = (j - 2) * 6 + Math.sin(t * 3 + j) * 2; ctx.globalAlpha = (0.25 + 0.75 * fade) * Math.max(0, 1 - fy / (r + 30)); ctx.fillRect(fx - 1.6, fy, 3.2, 3.2); }
    } else if (a.proc === 'deposit') {
      ctx.fillStyle = '#d9bd7e';
      for (let j = 1; j <= 5; j++) { ctx.globalAlpha = (0.25 + 0.75 * fade) * (1 - j / 6); circle(ctx, -Math.cos(ang) * (r + j * 6), -Math.sin(ang) * (r + j * 6), 2.6); ctx.fill(); }
    } else if (a.proc === 'melt') {
      ctx.fillStyle = '#fb923c';
      for (let j = 0; j < 4; j++) { const dy = r * 0.7 + ((t * 30 + j * 9) % 24); ctx.globalAlpha = (0.25 + 0.75 * fade) * Math.max(0, 1 - (dy - r * 0.7) / 24); circle(ctx, (j - 1.5) * 7, dy, 2.6); ctx.fill(); }
    }
    ctx.globalAlpha = 0.25 + 0.75 * fade;
    const glow = a.proc === 'heatp' || a.proc === 'melt' ? 0.55 : 0.22;
    const gr = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2); gr.addColorStop(0, rgbs(hex(col), glow)); gr.addColorStop(1, rgbs(hex(col), 0));
    ctx.fillStyle = gr; circle(ctx, 0, 0, r * 2); ctx.fill();
    ctx.save();
    if (a.proc === 'heatp') ctx.scale(1 + 0.12 * mix, 1 - 0.2 * mix);
    cycTokenArt(ctx, a.from, r, t);
    if (mix > 0.01) { ctx.globalAlpha *= mix; cycTokenArt(ctx, a.to, r, t); }
    ctx.restore();
    ctx.globalAlpha = 0.25 + 0.75 * fade;
    circle(ctx, 0, 0, r); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    circle(ctx, 0, 0, r + 2.5); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
    if (a.proc === 'cool') {
      ctx.strokeStyle = '#e0f2fe'; ctx.fillStyle = '#e0f2fe'; ctx.lineWidth = 1.6;
      for (let j = 0; j < 4; j++) { const q = t * 2 + j * 1.571, x = Math.cos(q) * (r + 8), y = Math.sin(q) * (r + 8); ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawCycle(V, t) {
    const { ctx, L } = V, g = cycGeo(L), C = S.cyc, fs = L.fs, tn = nowS();
    // 바탕
    earthPanel(ctx, g.A, t, { top: '#2a2036', bottom: '#150f1b' });
    // 가운데 글
    const cen = 1 - C.extraS;
    ctx.globalAlpha = 0.9 * cen;
    ctx.fillStyle = 'rgba(255,233,207,.9)'; ctx.font = dfnt(L, 27); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('암석의 순환', g.cx, g.cy - 8 * fs);
    ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = 'rgba(255,233,207,.65)';
    ctx.fillText(C.done ? '♻️ 돌고 돌아요' : '빈 화살표를 채워요', g.cx, g.cy + 20 * fs);
    ctx.globalAlpha = 1;
    // 다른 길 (점선): 색은 과정을 뜻하고, 가운데 범례가 알려 줘요
    if (C.extraS > 0.01) {
      g.extras.forEach((cv, i) => {
        const col = PROC_COL[cv.proc], a = C.extraS;
        drawCycArrow(ctx, cv, { col, w: 3.4, head: 13, dash: [4, 7], alpha: 0.95 * a });
        if (!RM) { for (let k = 0; k < 2; k++) { const u = ((tn * 0.16 + k / 2 + i * 0.17) % 1), pt = bez(cv, u); ctx.globalAlpha = 0.9 * a; ctx.fillStyle = '#fff'; circle(ctx, pt.x, pt.y, 2.8); ctx.fill(); } ctx.globalAlpha = 1; }
      });
      const lw = g.wide ? 206 : 168, lh = g.wide ? 100 : 98, lx = g.cx - lw / 2, ly = g.cy - lh / 2 + (g.wide ? 4 : 10);
      ctx.save(); ctx.globalAlpha = C.extraS;
      roundRect(ctx, lx, ly, lw, lh, 14); ctx.fillStyle = 'rgba(12,8,22,.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,233,207,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffe9cf'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('점선은 다른 길', g.cx, ly + 17 * fs);
      [['weather', '초록'], ['heatp', '주황'], ['melt', '빨강']].forEach((q, i) => {
        const yy = ly + (40 + i * 22) * fs * (g.wide ? 1 : 0.93), col = PROC_COL[q[0]];
        ctx.setLineDash([4, 5]); ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(lx + 14, yy); ctx.lineTo(lx + 44, yy); ctx.stroke(); ctx.setLineDash([]);
        arrowHead(ctx, lx + 46, yy, 0, 9, col);
        ctx.fillStyle = '#fff4e4'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'left'; ctx.fillText(CP[q[0]].emoji + ' ' + CP[q[0]].name, lx + 62, yy + 0.5);
      });
      ctx.restore();
    }
    // 큰 화살표 다섯 개
    g.arrows.forEach((cv, i) => {
      const ok = C.slots[cv.id] === cv.proc, col = PROC_COL[cv.proc];
      if (C.done && ok) {
        drawCycArrow(ctx, cv, { col, w: 7, head: 20, alpha: 1 });
        if (!RM) {
          for (let k = 0; k < 4; k++) {
            const u = ((tn * 0.24 + k / 4 + i * 0.11) % 1), pt = bez(cv, u);
            ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.95; circle(ctx, pt.x, pt.y, 3.6); ctx.fill();
            ctx.globalAlpha = 0.28; circle(ctx, pt.x, pt.y, 8); ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
          }
        }
      } else drawCycArrow(ctx, cv, { col: 'rgba(255,233,207,.55)', w: 5, head: 18, dash: [10, 8] });
    });
    // 빈칸
    g.arrows.forEach((cv) => {
      const R = slotRect(g, cv), filled = !!C.slots[cv.id], hot = C.sel && !filled;
      roundRect(ctx, R.x, R.y, R.w, R.h, R.h / 2);
      ctx.fillStyle = filled ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.08)'; ctx.fill();
      ctx.setLineDash([6, 5]); ctx.lineWidth = hot ? 3 : 2; ctx.strokeStyle = hot ? 'rgba(253,224,71,' + (0.55 + 0.45 * pulse()) + ')' : 'rgba(255,233,207,.55)';
      if (!filled || hot) ctx.stroke(); ctx.setLineDash([]);
      if (!filled) { ctx.fillStyle = 'rgba(255,233,207,.55)'; ctx.font = fnt(L, 13.5, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('과정은?', R.x + R.w / 2, R.y + R.h / 2 + 1); }
    });
    // 이름표 카드 (암석 · 퇴적물 · 마그마)
    CYC_NODES.forEach((n) => drawCycNode(V, g, n, t));
    // 카드 놓는 곳
    cardPanel(ctx, g.T);
    ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = '#ffe9cf'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('🏷️ 과정 카드를 끌어서 빈칸에 붙여요', g.T.x + 16, g.T.y + 22 * fs);
    CYC_PROCS.forEach((c) => { const h = g.tray[c.id]; roundRect(ctx, h.x - h.w / 2, h.y - h.h / 2, h.w, h.h, h.h / 2); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,233,207,.18)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]); });
    // 카드
    const order = CYC_PROCS.map((c) => c.id).sort((a, b) => (cycChip(a).held ? 1 : 0) - (cycChip(b).held ? 1 : 0));
    order.forEach((pid) => {
      const ch = cycChip(pid);
      if (ch.x == null) return;
      const aid = slotOfProc(pid), w = aid ? g.sw - 6 : g.tray[pid].w, h = aid ? g.sh - 6 : g.tray[pid].h;
      const bad = aid && C.wrong[aid] ? 1 - clamp((tn - C.wrong[aid]) / 0.7, 0, 1) : 0;
      cycChipDraw(V, null, ch.x, ch.y, w, h, pid, { lift: ch.lift, sel: C.sel === pid, shake: bad });
      if (aid && C.wrong[aid]) { const R = slotRect(g, g.arrows.find((q) => q.id === aid)); ctx.save(); roundRect(ctx, R.x - 2, R.y - 2, R.w + 4, R.h + 4, (R.h + 4) / 2); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
    });
    if (C.done && !RM) drawTraveler(ctx, g, tn);
  }
  function cycUpdate(dt, t) {
    const C = S.cyc, V = activeView(), g = cycGeo(V.L);
    if (!C.unlocked && game && (game.phase === 'success' || isFree()) && cycAllCorrect()) C.unlocked = true;
    const wasDone = C.done;
    C.done = C.unlocked && cycAllCorrect();
    if (C.done && !wasDone) {
      C.born = nowS();
      CYC_NODES.forEach((n, i) => setTimeout(() => { const nd = cycGeo(activeView().L).nodes[n.id]; ringFx(activeView(), nd.x, nd.y, 46, NODE_BY[n.id].color); }, i * 110));
      Sound.tone(660, 0.12, 'triangle', 0.08); Sound.tone(880, 0.14, 'triangle', 0.07, 0.1); Sound.tone(1175, 0.18, 'triangle', 0.06, 0.2);
      syncControls();
    } else if (!C.done && wasDone) syncControls();
    C.extraS = approach(C.extraS, C.extra ? 1 : 0, dt, 6);
    CYC_PROCS.forEach((c) => {
      const ch = cycChip(c.id), aid = slotOfProc(c.id), h = g.tray[c.id];
      let tx = h.x, ty = h.y;
      if (aid && !ch.held) { const R = slotRect(g, g.arrows.find((q) => q.id === aid)); tx = R.x + R.w / 2; ty = R.y + R.h / 2; }
      if (ch.x == null) { ch.x = tx; ch.y = ty; }
      if (ch.held) { ch.lift = approach(ch.lift, 1, dt, 14); }
      else { ch.lift = approach(ch.lift, 0, dt, 10); springTo(ch, tx, ty, dt, 230, 22); }
    });
  }
  function cycHitChip(V, p) {
    const g = cycGeo(V.L), C = S.cyc;
    const ids = CYC_PROCS.map((c) => c.id).reverse();
    for (const pid of ids) {
      const ch = cycChip(pid); if (ch.x == null) continue;
      const aid = slotOfProc(pid), w = aid ? g.sw : g.tray[pid].w, h = aid ? g.sh : g.tray[pid].h;
      if (Math.abs(p.x - ch.x) < w / 2 + 4 && Math.abs(p.y - ch.y) < h / 2 + 4) return pid;
    }
    return null;
  }
  function cycHitSlot(V, p, pad) {
    const g = cycGeo(V.L);
    let best = null, bd = 1e9;
    g.arrows.forEach((cv) => { const R = slotRect(g, cv), d = Math.hypot(p.x - (R.x + R.w / 2), p.y - (R.y + R.h / 2)); if (d < bd && (Math.abs(p.x - (R.x + R.w / 2)) < R.w / 2 + pad && Math.abs(p.y - (R.y + R.h / 2)) < R.h / 2 + pad)) { bd = d; best = cv.id; } });
    return best;
  }
  function cycPlace(pid, aid, fromSlot) {
    const C = S.cyc, old = C.slots[aid], from = fromSlot || slotOfProc(pid);
    if (old && old !== pid) {
      if (from) C.slots[from] = old;     // 자리 맞바꾸기 (쫓겨난 카드는 내가 있던 자리로)
    } else if (from && from !== aid) C.slots[from] = null;
    C.slots[aid] = pid;
    delete C.wrong[aid]; if (from) delete C.wrong[from];
    C.sel = null;
    Sound.tone(520, 0.08, 'triangle', 0.07);
    const V = activeView(), g = cycGeo(V.L), R = slotRect(g, g.arrows.find((q) => q.id === aid));
    ringFx(V, R.x + R.w / 2, R.y + R.h / 2, 24, PROC_COL[pid]);
    syncControls();
  }
  SCENES.cycle = {
    draw: drawCycle,
    update: cycUpdate,
    enter() { Object.keys(ROCKS).forEach((k) => wantRock(k, false, true)); },
    hover(V, p) { return cycHitChip(V, p) ? 'grab' : (S.cyc.sel && cycHitSlot(V, p, 6) ? 'pointer' : null); },
    blocks(V, p) { return !!cycHitChip(V, p); },
    down(V, p) {
      const C = S.cyc, pid = cycHitChip(V, p);
      if (pid) {
        const ch = cycChip(pid); ch.held = true; ch.ox = ch.x - p.x; ch.oy = ch.y - p.y; ch.sx = p.x; ch.sy = p.y; ch.moved = false;
        const aid = slotOfProc(pid); if (aid) { C.slots[aid] = null; ch.from = aid; } else ch.from = null;
        Sound.tick();
        return { kind: 'chip', pid };
      }
      if (C.sel) { const aid = cycHitSlot(V, p, 6); if (aid) cycPlace(C.sel, aid, slotOfProc(C.sel)); else C.sel = null; }
      return null;
    },
    move(V, d, p) {
      const ch = cycChip(d.pid);
      ch.x = p.x + ch.ox; ch.y = p.y + ch.oy;
      if (Math.hypot(p.x - ch.sx, p.y - ch.sy) > 7) ch.moved = true;
    },
    up(V, d, p) {
      const C = S.cyc, ch = cycChip(d.pid);
      ch.held = false;
      if (!ch.moved) {
        // 눌러서 고르기 (고른 뒤 빈칸을 누르면 붙어요)
        if (ch.from) C.slots[ch.from] = d.pid;
        C.sel = C.sel === d.pid ? null : d.pid; Sound.tick();
        return;
      }
      const aid = cycHitSlot(V, { x: ch.x, y: ch.y }, 16) || cycHitSlot(V, p, 10);
      if (aid) cycPlace(d.pid, aid, ch.from);
      else { if (ch.from) delete C.wrong[ch.from]; syncControls(); }
    },
    sync() {
      const C = S.cyc, free = isFree();
      const b = $('#extraBtn'), n = $('#cycNote');
      const can = C.done || free;
      b.disabled = !can;
      b.setAttribute('aria-pressed', C.extra ? 'true' : 'false');
      b.classList.toggle('on-state', C.extra);
      b.textContent = C.extra ? '➖ 다른 길 숨기기' : can ? '➕ 다른 길도 보기' : '🔒 순환을 완성하면 열려요';
      const filled = CYC_ARROWS.filter((a) => C.slots[a.id]).length;
      n.textContent = C.extra ? '점선은 다른 길이에요. 암석은 한 가지 길로만 바뀌지 않아요.' : C.done ? '순환을 완성했어요! 다른 길도 볼까요?' : filled === 0 ? '카드를 끌어서 화살표 위 빈칸에 붙여요.' : filled < 5 ? '빈칸이 ' + (5 - filled) + '개 남았어요.' : '모두 붙였어요. ✔ 확인하기를 눌러요.';
    },
  };
  $('#extraBtn').addEventListener('click', () => { if ($('#extraBtn').disabled) return; Sound.click(); S.cyc.extra = !S.cyc.extra; syncControls(); });
  function cycNodeName(id) { return NODE_BY[id].name; }
  function cycCheck() {
    const C = S.cyc;
    const empties = CYC_ARROWS.filter((a) => !C.slots[a.id]);
    if (empties.length) return '아직 빈칸이 ' + empties.length + '개 있어요. 과정 카드를 모두 붙여 보세요.';
    const wrong = CYC_ARROWS.filter((a) => C.slots[a.id] !== a.proc);
    if (wrong.length) {
      wrong.forEach((a) => { if (!C.wrong[a.id]) C.wrong[a.id] = nowS(); });
      const a = wrong[0];
      return '"' + cycNodeName(a.from) + ' → ' + cycNodeName(a.to) + '" 화살표에서 일어나는 일이 아니에요. ' + (wrong.length > 1 ? '(고칠 곳 ' + wrong.length + '개) ' : '') + '빨간 테두리 카드를 다시 생각해 보세요.';
    }
    return true;
  }
  HOOKS.cyc = {
    chip(pid) { const V = activeView(), ch = cycChip(pid); return HOOKS.client(ch.x, ch.y); },
    slot(aid) { const V = activeView(), g = cycGeo(V.L), R = slotRect(g, g.arrows.find((q) => q.id === aid)); return HOOKS.client(R.x + R.w / 2, R.y + R.h / 2); },
    fill: cycFill, reset: cycReset, arrows: CYC_ARROWS,
  };
  // @@PARTS-END@@
  /* =========================================================
     화면 만들기 · 입력
     ========================================================= */
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage(document.querySelector(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: FRAME });
    return { v, L, ctx: v.ctx, fx: [], P: new SciSim.Particles(), D: SciSim.draw(v.ctx), dt: 0.016 };
  });
  function activeView() { return views.find((V) => V.v.canvas.offsetWidth > 0) || views[0]; }
  const inRect = (p, r, pad) => p.x >= r.x - (pad || 0) && p.x <= r.x + r.w + (pad || 0) && p.y >= r.y - (pad || 0) && p.y <= r.y + r.h + (pad || 0);
  HOOKS.client = (x, y) => { const V = activeView(), r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; };
  function tip(text) { S.tipText = { text, t0: nowS() }; }
  const SCENE_BLOCK = { igneous: 'cIg', sed: 'cSed', meta: 'cMeta', cycle: 'cCyc' };
  function setScene(sc) {
    if (S.scene !== sc) {
      S.scene = sc; S.fade = 0;
      if (RM) S.fade = 1; else SciSim.tween(S, { fade: 1 }, { duration: 0.5, ease: 'outCubic' });
      if (SCENES[sc] && SCENES[sc].enter) SCENES[sc].enter();
    }
    syncControls(true);
  }
  function syncControls(snap) {
    const sc = S.scene, free = isFree();
    $('#ctrlCard').classList.remove('is-off');
    Object.keys(SCENE_BLOCK).forEach((k) => { const b = $('#' + SCENE_BLOCK[k]); if (b) b.classList.toggle('is-off', k !== sc); });
    const tabs = $('#cTabs');
    if (tabs) {
      tabs.classList.toggle('is-off', !free);
      $$('#tabSeg button').forEach((b) => { const on = b.dataset.sc === sc; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    }
    if (SCENES[sc] && SCENES[sc].sync) SCENES[sc].sync({ snap: !!snap });
  }
  const tabSeg = $('#tabSeg');
  if (tabSeg) tabSeg.addEventListener('click', (e) => { const b = e.target.closest('button[data-sc]'); if (!b) return; Sound.click(); setScene(b.dataset.sc); });

  function attachPointer(V) {
    const { v, L } = V;
    let drag = null;
    const sc = () => SCENES[S.scene] || {};
    SciSim.pointer(v, {
      hover(p) { const s = sc(); return s.hover ? s.hover(V, p) : null; },
      down(p) { const s = sc(); if (!s.down) return false; const r = s.down(V, p); if (r) drag = r; return !!r; },
      move(p) { if (!drag) return; const s = sc(); if (s.move) s.move(V, drag, p); },
      up(p) { if (!drag) return; const s = sc(); if (s.up) s.up(V, drag, p); drag = null; },
    });
    if (L.key === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0]; if (!tc) return;
        const p = v.toLocal(tc), s = sc();
        if (drag || (s.blocks && s.blocks(V, p))) e.preventDefault();
      }, { passive: false });
    }
  }
  views.forEach(attachPointer);

  /* =========================================================
     움직임 · 그리기 순서
     ========================================================= */
  function update(dt, t) {
    pumpJobs(5);
    const s = SCENES[S.scene];
    if (s && s.update) s.update(dt, t);
    watchPhase();
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) { V.dt = dt; V.P.update(dt); } });
  }
  function draw(V, t) {
    const ctx = V.ctx, L = V.L;
    V.v.apply();
    ctx.fillStyle = FRAME; ctx.fillRect(0, 0, L.vw, L.vh);
    ctx.textBaseline = 'alphabetic';
    const slide = (1 - S.fade) * 14;
    if (slide > 0.2) { ctx.save(); ctx.translate(0, slide); }
    const s = SCENES[S.scene];
    if (s && s.draw) s.draw(V, t);
    if (slide > 0.2) ctx.restore();
    V.P.draw(ctx); drawFx(ctx, V);
    if (S.tipText) {
      const k = nowS() - S.tipText.t0;
      if (k > 3.4) S.tipText = null;
      else {
        ctx.font = fnt(L, 14, 'bold');
        const a = k < 0.2 ? k / 0.2 : k > 2.8 ? (3.4 - k) / 0.6 : 1;
        tagPill(ctx, L, S.tipText.text, L.vw / 2, L.vh - 26 * L.fs, { bg: 'rgba(30,41,59,.94)', stroke: '#fbbf24', alpha: a, size: 14, h: 30 });
      }
    }
    if (S.stamp) {
      const k = (nowS() - S.stamp.t0) / 1.6;
      if (k >= 1) S.stamp = null;
      else { const sz = 46 * (0.6 + 0.4 * EZ.outBack(Math.min(1, k * 3.5))); ctx.save(); ctx.globalAlpha = 1 - smooth(0.7, 1, k); V.D.check(L.vw / 2, L.vh / 2 - 10, sz, clamp(k * 3, 0, 1)); ctx.restore(); }
    }
    if (S.fade < 0.999) { ctx.globalAlpha = 1 - S.fade; ctx.fillStyle = FRAME; ctx.fillRect(0, 0, L.vw, L.vh); ctx.globalAlpha = 1; }
  }
  function watchPhase() {
    const ph = game ? game.phase : '';
    if (ph === 'success' && S.lastPhase !== 'success') {
      S.stamp = { t0: nowS() };
      const V = activeView();
      V.P.burst(V.L.vw / 2, V.L.vh / 2 - 10, { count: 26, colors: ['#ffd36b', '#5eead4', '#ffffff', '#7bd3ff', '#a78bfa'], speed: 230, gravity: 220, size: 4, life: 1.1 });
    }
    S.lastPhase = ph;
  }

  /* =========================================================
     미션
     ========================================================= */
  const LEVELS = [];
  function figIgTable() {
    const cell = (x, y, w, h, fill, tc, t1, t2) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + fill + '"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + (t2 ? -3 : 6)) + '" text-anchor="middle" font-size="17" font-weight="800" fill="' + tc + '">' + t1 + '</text>' +
      (t2 ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 15) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + tc + '" opacity=".85">' + t2 + '</text>' : '');
    return '<svg viewBox="0 0 340 172" width="100%" role="img" aria-label="화성암 분류표: 가로는 암석의 색, 세로는 결정의 크기" style="background:#fff7ed;display:block" font-family="sans-serif">' +
      '<text x="158" y="22" text-anchor="middle" font-size="13" font-weight="800" fill="#44403c">⚫ 어두운색</text><text x="274" y="22" text-anchor="middle" font-size="13" font-weight="800" fill="#44403c">⚪ 밝은색</text>' +
      '<text x="46" y="68" text-anchor="middle" font-size="13" font-weight="800" fill="#44403c">결정 작음</text><text x="46" y="85" text-anchor="middle" font-size="11.5" font-weight="700" fill="#78716c">빠르게 식음</text>' +
      '<text x="46" y="136" text-anchor="middle" font-size="13" font-weight="800" fill="#44403c">결정 큼</text><text x="46" y="153" text-anchor="middle" font-size="11.5" font-weight="700" fill="#78716c">천천히 식음</text>' +
      cell(100, 34, 116, 62, '#4b4b55', '#fff', '현무암') + cell(220, 34, 116, 62, '#fde68a', '#78350f', '(가)') +
      cell(100, 104, 116, 62, '#fde68a', '#78350f', '(나)') + cell(220, 104, 116, 62, '#e7c9bb', '#44302a', '화강암') +
      '</svg>';
  }
  LEVELS.push({
    title: '화성암: 마그마가 식어서', short: '화성암', icon: '🌋', phase: '실험',
    features: [],
    intro: '<p class="si-q">❓ 탐구 질문: 암석은 어떻게 만들어지고, 다른 암석으로 바뀔 수 있을까?</p>' +
      '<p>땅속 깊은 곳에서는 암석이 녹아 <b>마그마</b>가 돼요. 마그마가 <b>식어서 굳으면</b> <b>화성암</b>이 만들어져요.</p>' +
      '<p>마그마의 <b>색</b>과 <b>식는 곳</b>을 바꿔 가며 화성암을 만들고, 결정(알갱이)의 크기가 어떻게 달라지는지 확대해서 관찰해 봐요.</p>',
    setup() { setScene('igneous'); ensureIgGeo(); },
    recap: '화성암은 마그마가 식어 만들어져요. <b>빨리</b> 식으면 결정이 <b>작고</b>, <b>천천히</b> 식으면 결정이 <b>커요</b>.',
    summary: '<ul><li><b>화성암</b>은 <b>마그마가 식어서 굳은</b> 암석이에요.</li>' +
      '<li>지표 가까이에서 <b>빨리</b> 식으면 결정이 <b>작은 화산암</b>, 땅속 깊은 곳에서 <b>천천히</b> 식으면 결정이 <b>큰 심성암</b>이 돼요.</li>' +
      '<li>암석의 색(어두운색·밝은색)과 결정 크기로 화성암 네 가지를 분류해요.</li></ul>' +
      '<table class="cmp"><tr><th></th><th>어두운색</th><th>밝은색</th></tr>' +
      '<tr><th>결정 작음<br>(화산암)</th><td>현무암</td><td>유문암</td></tr>' +
      '<tr><th>결정 큼<br>(심성암)</th><td>반려암</td><td>화강암</td></tr></table>',
    missions: [
      {
        title: '🌋 화강암 만들기',
        goal: '<b>밝은색</b>이면서 결정이 <b>큰</b> 화성암, <b>화강암</b>을 만들어 보세요.',
        hint: '마그마의 색을 바꾸고, 🔍 핀을 끌어 식히는 곳을 고른 뒤 ❄️ 식히기를 눌러요. 결정을 크게 키우려면 어디서 식혀야 할까요?',
        setup() { setScene('igneous'); },
        check: () => S.ig.made.has('light-slow'),
        hold: 0.6,
        status: () => [chk(!S.ig.dark, '밝은색 마그마'), chk(S.ig.made.has('light-slow'), '화강암 완성')].join(' · '),
        explain: '화강암은 <b>밝은색</b> 마그마가 <b>땅속 깊은 곳</b>에서 <b>천천히</b> 식어 만들어져요. 천천히 식는 동안 결정이 충분히 자라서 <b>결정이 커요</b>.',
      },
      {
        title: '📒 화성암 도감 채우기',
        goal: '마그마의 색과 식는 곳을 바꿔 가며 <b>네 가지 화성암</b>을 모두 만들어 도감을 채워 보세요.',
        hint: '색(어두운색·밝은색)과 식는 곳(지표 가까이·땅속 깊은 곳)을 서로 바꿔 가며 만들어요. 모두 4가지예요.',
        setup() { setScene('igneous'); },
        check: () => S.ig.made.size >= 4,
        hold: 0.6,
        status: () => [['dark-fast', '현무암'], ['light-fast', '유문암'], ['dark-slow', '반려암'], ['light-slow', '화강암']].map((q) => chk(S.ig.made.has(q[0]), q[1])).join(' · '),
        explain: '식는 곳이 <b>지표 가까이</b>이면 빨리 식어 결정이 <b>작고</b>(현무암·유문암), <b>땅속 깊은 곳</b>이면 천천히 식어 결정이 <b>커요</b>(반려암·화강암). 색은 <b>어두운색</b>(현무암·반려암)과 <b>밝은색</b>(유문암·화강암)으로 나뉘어요.',
      },
      {
        type: 'quiz', title: '🧩 화성암 분류표',
        goal: '화성암을 <b>색</b>과 <b>결정 크기</b>로 분류한 표예요. <b>(가)</b>와 <b>(나)</b>에 알맞은 암석을 차례로 고른 것은?',
        figure: figIgTable(),
        setup() { setScene('igneous'); },
        choices: ['(가) 유문암 · (나) 반려암', '(가) 반려암 · (나) 유문암', '(가) 화강암 · (나) 현무암', '(가) 현무암 · (나) 화강암'],
        answer: 0,
        feedback: [
          '',
          '(가)는 밝은색이면서 결정이 작은 암석이에요. 반려암은 어두운색이고 결정이 커요.',
          '화강암은 이미 표에 있어요. (가)는 밝은색에 결정이 작은 암석이에요.',
          '현무암도 이미 표에 있어요. 표에 없는 암석을 찾아보세요.',
        ],
        explain: '(가)는 <b>밝은색</b>이면서 결정이 <b>작은</b> 화산암인 <b>유문암</b>, (나)는 <b>어두운색</b>이면서 결정이 <b>큰</b> 심성암인 <b>반려암</b>이에요.',
      },
    ],
  });
  LEVELS.push({
    title: '퇴적암: 쌓이고 눌려서', short: '퇴적암', icon: '🪨', phase: '모형',
    features: [],
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마그마가 식어 <b>화성암</b>이 만들어졌어요. 암석은 또 다른 방법으로도 만들어져요.</div>' +
      '<p>강이나 바다 밑에는 자갈·모래·진흙·석회 물질 같은 <b>퇴적물</b>이 쌓여요. 퇴적물이 위에서 <b>눌리고</b>(다져짐) 알갱이 사이가 <b>굳으면</b>(굳어짐) <b>퇴적암</b>이 돼요.</p>' +
      '<p>퇴적물을 골라 쌓고, 시간을 흘려 보내면서 알갱이가 어떻게 변하는지 확대해서 봐요.</p>',
    setup() { setScene('sed'); sedReset(); S.sed.made.clear(); },
    recap: '퇴적물이 <b>쌓이고 → 다져지고 → 굳어서</b> 퇴적암이 돼요.',
    summary: '<ul><li><b>퇴적암</b>은 <b>퇴적물</b>이 쌓여 <b>다져지고 굳어서</b> 만들어진 암석이에요.</li>' +
      '<li>퇴적물의 종류에 따라 <b>역암</b>(자갈), <b>사암</b>(모래), <b>이암</b>(진흙), <b>석회암</b>(석회 물질)이 돼요.</li>' +
      '<li>퇴적물이 층층이 쌓여 생긴 줄무늬를 <b>층리</b>라고 해요.</li></ul>' +
      '<table class="cmp"><tr><th>퇴적물</th><th>퇴적암</th></tr><tr><td>자갈</td><td>역암</td></tr><tr><td>모래</td><td>사암</td></tr><tr><td>진흙</td><td>이암</td></tr><tr><td>석회 물질</td><td>석회암</td></tr></table>',
    missions: [
      {
        title: '🏖️ 퇴적물 쌓기',
        goal: '퇴적물을 골라 <b>3층 이상</b> 쌓아 보세요. 종류가 다르면 층이 나뉘어 보여요.',
        hint: '아래 버튼에서 자갈·모래·진흙·석회 물질을 눌러 쌓아요. 한 번 누를 때마다 한 층이 쌓여요.',
        setup() { setScene('sed'); sedReset(); S.sed.made.clear(); },
        check: () => S.sed.layers.filter((l) => l.landed >= l.count).length >= 3,
        hold: 0.5,
        status: () => { const n = S.sed.layers.filter((l) => l.landed >= l.count).length; return chk(n >= 3, '퇴적물 3층 쌓기 (' + Math.min(n, 3) + '/3)'); },
        explain: '강이나 바다 밑에서 퇴적물은 종류별로 <b>층층이</b> 쌓여요. 이렇게 층이 나뉘어 보이는 줄무늬를 <b>층리</b>라고 해요.',
      },
      {
        title: '🪨 사암 만들기',
        goal: '<b>모래</b>를 쌓고 시간을 흘려 보내 <b>사암</b>을 만들어 보세요.',
        hint: '🏖️ 모래를 쌓은 뒤, ⏳ 슬라이더를 끝까지 밀어요. 눌려서 알갱이가 붙으면 사암이 돼요.',
        setup() { setScene('sed'); sedReset(); S.sed.made.clear(); },
        check: () => S.sed.made.has('sand'),
        hold: 0.6,
        status: () => { const has = S.sed.layers.some((l) => l.id === 'sand' && l.landed >= l.count); return [chk(has, '모래 쌓기'), chk(has && S.sed.pressS > 0.5, '눌러서 다지기'), chk(S.sed.made.has('sand'), '사암 완성')].join(' · '); },
        explain: '모래가 쌓인 뒤 위에서 눌리면 알갱이 사이의 빈틈이 줄어요(<b>다져짐</b>). 그 사이로 알갱이를 붙이는 물질이 스며들어 알갱이가 서로 붙으면(<b>굳어짐</b>) 단단한 <b>사암</b>이 돼요.',
      },
      {
        type: 'quiz', title: '🤔 퇴적암이 되는 과정',
        goal: '퇴적물이 퇴적암이 되는 과정으로 알맞은 것은 무엇일까요?',
        setup() { setScene('sed'); },
        choices: ['마그마가 식으면서 결정이 자라 굳는다', '위에 쌓인 퇴적물에 눌려 빈틈이 줄고, 알갱이들이 서로 붙어 굳는다', '땅속 깊은 곳에서 높은 열과 압력을 받아 알갱이가 줄지어 배열된다', '알갱이가 서로 붙으면서 빈틈이 오히려 늘어난다'],
        answer: 1,
        feedback: [
          '그것은 화성암이 만들어지는 과정이에요. 퇴적암은 퇴적물이 굳어서 만들어져요.',
          '',
          '그것은 변성암이 만들어지는 과정이에요. 다음 단계에서 알아볼 거예요.',
          '눌리면 알갱이 사이의 빈틈은 줄어들어요. 슬라이더를 밀어 알갱이를 다시 살펴봐요.',
        ],
        explain: '퇴적물은 위에 쌓이는 퇴적물에 눌려 <b>빈틈이 줄어들고</b>(다져짐), 알갱이 사이로 붙이는 물질이 스며들어 <b>서로 붙어 굳어서</b>(굳어짐) 퇴적암이 돼요.',
      },
    ],
  });
  function metaReset() {
    const M = S.meta;
    M.rock = 'mud'; M.p = 0; M.ps = 0; M.made.clear(); M.swap = 1; M.drag = null; M.lastIdx = 0;
    const rg = $('#heatRange'); if (rg) rg.value = 0;
    syncControls();
  }
  LEVELS.push({
    title: '변성암: 열과 압력으로', short: '변성암', icon: '💠', phase: '모형',
    features: [],
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 퇴적물이 굳어 <b>퇴적암</b>이 만들어졌어요. 이미 만들어진 암석도 더 변할 수 있어요.</div>' +
      '<p>땅속 깊은 곳에서 암석이 <b>녹지 않을 만큼</b> 높은 <b>열과 압력</b>을 받으면, 광물 알갱이의 모양과 배열이 달라져 <b>변성암</b>이 돼요.</p>' +
      '<p>위쪽 판을 눌러서 이암·사암·석회암이 어떻게 변하는지 확대해서 봐요.</p>',
    setup() { setScene('meta'); metaReset(); ensureMetaCells(); },
    recap: '암석이 <b>녹지 않고</b> 높은 열과 압력을 받으면 알갱이가 변해 <b>변성암</b>이 돼요.',
    summary: '<ul><li><b>변성암</b>은 암석이 <b>녹지 않고</b> 높은 <b>열과 압력</b>을 받아 알갱이의 모양과 배열이 변해 만들어진 암석이에요.</li>' +
      '<li>이암 → <b>편암</b> → <b>편마암</b>: 광물이 줄지어 배열되어 줄무늬(<b>엽리</b>)가 생겨요.</li>' +
      '<li>사암 → <b>규암</b>, 석회암 → <b>대리암</b></li></ul>' +
      '<table class="cmp"><tr><th>원래 암석</th><th>변성암</th></tr><tr><td>이암</td><td>편암 → 편마암</td></tr><tr><td>사암</td><td>규암</td></tr><tr><td>석회암</td><td>대리암</td></tr></table>',
    missions: [
      {
        title: '💠 이암이 변해 가요',
        goal: '<b>이암</b>에 열과 압력을 점점 세게 주어 <b>편암</b>과 <b>편마암</b>을 만들어 보세요.',
        hint: '처음 암석을 이암으로 두고, 위쪽 판을 아래로 끌거나 슬라이더를 오른쪽으로 밀어요.',
        setup() { setScene('meta'); metaReset(); },
        check: () => S.meta.made.has('편암') && S.meta.made.has('편마암'),
        hold: 0.6,
        status: () => [chk(S.meta.made.has('편암'), '편암'), chk(S.meta.made.has('편마암'), '편마암')].join(' · '),
        explain: '이암이 열과 압력을 받으면 광물이 한 방향으로 줄지어 배열돼 줄무늬(<b>엽리</b>)가 생겨요. 처음에는 <b>편암</b>, 더 세게 받으면 밝은 띠와 어두운 띠가 뚜렷한 <b>편마암</b>이 돼요.',
      },
      {
        title: '🤍 규암과 대리암 만들기',
        goal: '<b>사암</b>을 <b>규암</b>으로, <b>석회암</b>을 <b>대리암</b>으로 바꿔 보세요.',
        hint: '처음 암석을 사암 → 석회암 순서로 바꿔 가며 열과 압력을 끝까지 올려요.',
        setup() { setScene('meta'); S.meta.made.delete('규암'); S.meta.made.delete('대리암'); },
        check: () => S.meta.made.has('규암') && S.meta.made.has('대리암'),
        hold: 0.6,
        status: () => [chk(S.meta.made.has('규암'), '사암 → 규암'), chk(S.meta.made.has('대리암'), '석회암 → 대리암')].join(' · '),
        explain: '사암은 알갱이가 서로 단단히 붙어 <b>규암</b>이 되고, 석회암은 결정이 커지고 서로 맞물려 <b>대리암</b>이 돼요.',
      },
      {
        type: 'quiz', title: '🤔 변성암이 되는 과정',
        goal: '변성암이 만들어지는 과정으로 알맞은 것은 무엇일까요?',
        setup() { setScene('meta'); },
        choices: ['암석이 완전히 녹았다가 식어서 굳는다', '암석이 녹지 않은 채 높은 열과 압력을 받아 알갱이의 모양과 배열이 변한다', '자갈과 모래가 쌓여 눌리고 굳는다', '지표에서 바람과 물에 부서져 흙이 된다'],
        answer: 1,
        feedback: [
          '그것은 화성암이 만들어지는 과정이에요. 변성암은 암석이 녹지 않아요.',
          '',
          '그것은 퇴적암이 만들어지는 과정이에요.',
          '그것은 풍화예요. 암석이 부서질 뿐, 새로운 암석이 만들어지지는 않아요.',
        ],
        explain: '변성암은 이미 있던 암석이 <b>녹지 않고</b> 높은 <b>열과 압력</b>을 받아 알갱이의 모양과 배열이 <b>변해서</b> 만들어져요.',
      },
    ],
  });
  function figCycle() {
    const nd = (x, y, t, c) => '<rect x="' + (x - 42) + '" y="' + (y - 15) + '" width="84" height="30" rx="9" fill="' + c + '"/><text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">' + t + '</text>';
    const lb = (x, y, t) => '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="12.5" font-weight="800" fill="#334155" stroke="#fff" stroke-width="3.5" paint-order="stroke">' + t + '</text>';
    const ar = (d) => '<path d="' + d + '" fill="none" stroke="#64748b" stroke-width="2.6" marker-end="url(#ar)"/>';
    return '<svg viewBox="0 0 320 232" width="100%" role="img" aria-label="암석의 순환도" style="background:#f8fafc;display:block" font-family="sans-serif">' +
      '<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>' +
      ar('M64,73 Q58,32 116,27') + ar('M204,27 Q262,28 266,72') + ar('M278,104 Q286,168 250,181') + ar('M184,197 L136,197') + ar('M68,183 Q26,150 36,106') +
      nd(160, 26, '화성암', '#e0662a') + nd(272, 88, '퇴적물', '#d9a441') + nd(228, 197, '퇴적암', '#b07a3c') + nd(92, 197, '변성암', '#7b6cf0') + nd(48, 88, '마그마', '#ef4444') +
      lb(52, 46, '냉각') + lb(262, 36, '풍화·침식') + lb(298, 142, '퇴적·굳음') + lb(160, 188, '열과 압력') + lb(24, 148, '녹음') +
      '<text x="160" y="124" text-anchor="middle" font-size="15" font-weight="800" fill="#94a3b8">암석의 순환</text></svg>';
  }
  LEVELS.push({
    title: '암석의 순환', short: '순환', icon: '♻️', phase: '적용',
    features: [],
    intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 마그마가 식어 <b>화성암</b>, 퇴적물이 굳어 <b>퇴적암</b>, 열과 압력으로 <b>변성암</b>이 만들어지는 것을 알아봤어요.</div>' +
      '<p>암석은 한 번 만들어지고 끝나지 않아요. 냉각, 풍화·침식, 퇴적·굳음, 열과 압력, 녹음이 <b>돌고 돌면서</b> 암석이 다른 암석으로 바뀌어요. 이것을 <b>암석의 순환</b>이라고 해요.</p>' +
      '<p>순환도의 빈 화살표에 알맞은 <b>과정 카드</b>를 붙여 순환을 완성해 봐요.</p>',
    setup() { setScene('cycle'); cycReset(true); },
    recap: '암석은 <b>냉각 → 풍화·침식 → 퇴적·굳음 → 열과 압력 → 녹음</b>을 거치며 서로 바뀌고 돌고 돌아요.',
    summary: '<ul><li><b>암석의 순환</b>: 암석은 여러 과정을 거치며 다른 암석으로 바뀌고, 돌고 돌아요.</li>' +
      '<li>마그마 →(<b>냉각</b>)→ 화성암 →(<b>풍화·침식</b>)→ 퇴적물 →(<b>퇴적·굳음</b>)→ 퇴적암 →(<b>열과 압력</b>)→ 변성암 →(<b>녹음</b>)→ 마그마</li>' +
      '<li>꼭 이 순서로만 바뀌지는 않아요. 어떤 암석이든 풍화·침식을 받아 퇴적물이 되거나, 녹아서 마그마가 될 수 있어요.</li></ul>' +
      '<div class="note-fig">' + figCycle() + '</div>',
    missions: [
      {
        title: '♻️ 순환도 완성하기', manual: true,
        goal: '다섯 개의 <b>과정 카드</b>를 끌어서 순환도의 <b>빈칸</b>에 알맞게 붙인 뒤 <b>확인하기</b>를 눌러 보세요.',
        hint: '화살표가 <b>무엇에서 무엇으로</b> 향하는지 보세요. 예를 들어 마그마 → 화성암은 마그마가 식어서 굳는 과정이에요.',
        setup() { setScene('cycle'); },
        check: cycCheck,
        explain: '마그마가 <b>냉각</b>되어 화성암이 되고, 화성암이 <b>풍화·침식</b>을 받아 퇴적물이 돼요. 퇴적물이 <b>퇴적·굳음</b>으로 퇴적암이 되고, 퇴적암이 <b>열과 압력</b>을 받아 변성암이 되며, 변성암이 <b>녹아</b> 마그마가 돼요.',
      },
      {
        type: 'quiz', title: '🤔 돌고 도는 암석',
        goal: '<b>화강암</b>이 지표에 드러나 <b>풍화·침식</b>을 받고, 그 알갱이가 쌓여 오랜 시간 눌려 굳으면 어떤 암석이 될까요?',
        setup() { setScene('cycle'); if (!cycAllCorrect()) cycFill(); S.cyc.unlocked = true; syncControls(); },
        choices: ['화성암', '퇴적암', '변성암', '마그마'],
        answer: 1,
        feedback: [
          '화성암은 마그마가 식어서 만들어져요. 풍화·침식을 받은 알갱이가 쌓여 굳는 것과는 달라요.',
          '',
          '변성암은 열과 압력을 받아야 만들어져요. 여기서는 알갱이가 쌓여 굳었어요.',
          '마그마는 암석이 녹아서 만들어져요. 알갱이가 쌓여 굳는 것과는 달라요.',
        ],
        explain: '화강암(화성암)이 <b>풍화·침식</b>을 받아 퇴적물이 되고, 퇴적물이 <b>쌓여 굳으면</b> <b>퇴적암</b>이 돼요. 이처럼 어떤 암석이든 다른 암석으로 바뀔 수 있어서 암석이 <b>순환</b>한다고 해요.',
      },
    ],
  });
  // @@LEVELS-END@@
  game = SciSim.game({
    simId: 'm2-rock-cycle',
    mount: '#game',
    badge: '암석 박사',
    homeHref: '../../index.html#g2',
    featureLabels: {},
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart() { S.tipText = null; },
    onComplete() { syncControls(); },
    levels: LEVELS,
  });
  syncControls();
  ensureIgGeo();
  Object.keys(IG_ROCK).forEach((k) => wantRock(IG_ROCK[k], false));
  Object.keys(ROCKS).forEach((k) => wantRock(k, false));

  /* =========================================================
     실행
     ========================================================= */
  SciSim.loop((dt, t) => {
    try {
      update(dt, t);
      views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    } catch (e) { console.error(e); }
  });

  /* ---------- 점검용 ---------- */
  window.__sim = Object.assign({
    S, game: () => game, view: activeView, setScene, syncControls, ROCKS,
    ready: () => true,
    speed(n) { S.speed = n; },
    jobs: () => BQ.length,
    bench(n) { const V = activeView(); const t0 = performance.now(); for (let i = 0; i < n; i++) { draw(V, nowS()); V.ctx.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / n; },
  }, HOOKS);
})();
