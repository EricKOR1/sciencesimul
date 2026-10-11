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
    // 1단계
    ig: { dark: false, v: 0.7, vs: 0.7, cooling: false, tau: 0, done: false, built: '', want: '', rock: null, made: new Set(), dragging: false, sparkAcc: 0 },
    // 2단계
    layers: [], falling: [], press: 0, pressS: 0, selLayer: -1, sedMade: new Set(), pourT: 0,
    // 3단계
    meta: { rock: 'lime', p: 0, ps: 0, made: new Set(), arrowDrag: null, seen: new Set() },
    // 4단계
    cyc: { slots: {}, sel: null, drag: null, flag: new Set(), shake: {}, extra: false, extraT: 0, done: false, born: 0 },
    tipText: null, fade: 1, stamp: null, lastPhase: '', note: '',
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
