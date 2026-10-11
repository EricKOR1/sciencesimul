/* =========================================================
   중2 Ⅱ. 지권의 변화 - 지구계와 지권의 구조  [9과09-01]
   탐구 흐름(4단계):
   ① 관찰: 풍경 속 물체를 지구계의 다섯 권역(지권·수권·기권·생물권·외권)으로 분류
   ② 탐구: 사례 카드를 두 권역 사이의 화살표(상호작용)로 연결
   ③ 모형: 지구를 잘라 보고(단면), 층을 분리하며 지권의 층상 구조(지각·맨틀·외핵·내핵)와 상태·깊이를 알아봄
   ④ 적용: 지각이 얇다는 것, 가장 큰 층, 깊이와 상태 짝짓기
   범위: 지구계의 구성 요소와 지권 각 층의 명칭·상태만 다룸 (지진파 X)
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
  const FRAME = '#0a1330';

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
     자료
     ========================================================= */
  const SPHERES = [
    { id: 'geo', name: '지권', emoji: '⛰️', color: '#b9803f', desc: '암석과 흙으로 된 땅, 그리고 지구 속' },
    { id: 'hydro', name: '수권', emoji: '💧', color: '#2f80ed', desc: '지구에 있는 모든 물' },
    { id: 'atmo', name: '기권', emoji: '☁️', color: '#4fb3ee', desc: '지구를 둘러싼 공기(대기)' },
    { id: 'bio', name: '생물권', emoji: '🌳', color: '#35a755', desc: '지구에 사는 모든 생물' },
    { id: 'space', name: '외권', emoji: '🌙', color: '#7b6cf0', desc: '지구 대기 바깥의 우주 공간' },
  ];
  const SP = {}; SPHERES.forEach((s) => (SP[s.id] = s));
  // 풍경 속 물체 (정답 권역)
  const ITEMS = [
    { id: 'mountain', name: '산', emoji: '⛰️', sphere: 'geo' },
    { id: 'sea', name: '바다', emoji: '🌊', sphere: 'hydro' },
    { id: 'cloud', name: '구름', emoji: '☁️', sphere: 'atmo' },
    { id: 'person', name: '사람', emoji: '🧑', sphere: 'bio' },
    { id: 'tree', name: '나무', emoji: '🌳', sphere: 'bio' },
    { id: 'moon', name: '달', emoji: '🌙', sphere: 'space' },
  ];
  const IT = {}; ITEMS.forEach((s) => (IT[s.id] = s));
  // 상호작용 사례 카드 (a→b: 영향을 주는 방향)
  const CASES = [
    { id: 'volcano', emoji: '🌋', text: '화산이 폭발해 화산 가스가 하늘로 나와요', short: '화산 가스', a: 'geo', b: 'atmo' },
    { id: 'evap', emoji: '♨️', text: '바닷물이 증발해 구름이 만들어져요', short: '물의 증발', a: 'hydro', b: 'atmo' },
    { id: 'root', emoji: '🌱', text: '나무뿌리가 자라 바위틈을 벌려요', short: '뿌리가 바위를', a: 'bio', b: 'geo' },
    { id: 'meteor', emoji: '☄️', text: '운석이 날아와 지표에 부딪혀요', short: '운석 충돌', a: 'space', b: 'geo' },
  ];
  const CS = {}; CASES.forEach((s) => (CS[s.id] = s));
  // 지권의 층 (r0~r1: 중심에서 반지름 비율, 그림은 지각을 두껍게 그려요)
  const LAYERS = [
    { id: 'crust', name: '지각', state: '고체', r0: 0.93, r1: 1.0, tr0: 0.9945, color: '#9a7650', depth: '0 ~ 약 35 km', cardDepth: '깊이 0 ~ 약 35 km', note: '대륙 약 35 km · 해양 약 5 km', short: '아주 얇은 암석층' },
    { id: 'mantle', name: '맨틀', state: '고체', r0: 0.547, r1: 0.93, tr0: 0.547, color: '#e0662a', depth: '약 2900 km까지', cardDepth: '깊이 약 2900 km까지', note: '지권 부피의 대부분을 차지해요', short: '가장 두꺼운 층' },
    { id: 'outer', name: '외핵', state: '액체', r0: 0.203, r1: 0.547, tr0: 0.203, color: '#ffb02e', depth: '약 2900 ~ 5100 km', cardDepth: '깊이 약 2900 ~ 5100 km', note: '지권에서 유일하게 액체인 층이에요', short: '액체로 된 층' },
    { id: 'inner', name: '내핵', state: '고체', r0: 0, r1: 0.203, tr0: 0, color: '#ffe48a', depth: '약 5100 ~ 6400 km', cardDepth: '깊이 약 5100 ~ 6400 km', note: '지구의 가장 안쪽, 단단한 중심이에요', short: '중심의 단단한 공' },
  ];
  const LY = {}; LAYERS.forEach((s) => (LY[s.id] = s));
  const R_EARTH = 6400;
  // 깊이(km) → 층
  function layerAtDepth(d) {
    if (d < 35) return LY.crust;
    if (d < 2900) return LY.mantle;
    if (d < 5100) return LY.outer;
    return LY.inner;
  }

  /* =========================================================
     무늬 만들기: 층별 질감 타일, 지구 표면(대륙) 그림
     ========================================================= */
  const TILE_N = 256;
  function cellular(u, v, per, seed) {
    const x = u * per, y = v * per, ix = Math.floor(x), iy = Math.floor(y);
    let f1 = 9, f2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const cx = ix + i, cy = iy + j;
        const wx = ((cx % per) + per) % per, wy = ((cy % per) + per) % per;
        const px = cx + hash2(wx, wy, seed), py = cy + hash2(wx, wy, seed + 5);
        const d = Math.hypot(px - x, py - y);
        if (d < f1) { f2 = f1; f1 = d; id = hash2(wx, wy, seed + 9); } else if (d < f2) f2 = d;
      }
    }
    return { f1, f2, id };
  }
  function* tileTask(kind) {
    const N = TILE_N, c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
    const PAL = [[140, 107, 76], [166, 132, 95], [118, 96, 63], [139, 143, 147], [163, 137, 107], [111, 90, 66], [152, 130, 106]];
    for (let j = 0; j < N; j++) {
      if ((j & 7) === 0) yield;
      for (let i = 0; i < N; i++) {
        const u = i / N, v = j / N;
        let r, gg, b;
        if (kind === 'crust') {
          const warp = pfbm(u * 4, v * 4, 4, 4, 11, 3);
          const band = v * 7 + (warp - 0.5) * 2.4, bi = Math.floor(band), f = band - bi;
          const p = PAL[((bi % 7) + 7) % 7];
          let k = 1 + (pnoise(u * 80, v * 80, 80, 80, 5) - 0.5) * 0.3;
          if (f < 0.09) k *= 0.82;
          if (pnoise(u * 40, v * 40, 40, 40, 31) > 0.86) k *= 0.7;
          r = p[0] * k; gg = p[1] * k; b = p[2] * k;
        } else if (kind === 'mantle') {
          const n1 = pfbm(u * 3, v * 3, 3, 3, 21, 4);
          const ridge = 1 - Math.abs(2 * pfbm(u * 5, v * 5, 5, 5, 27, 3) - 1);
          const vein = Math.pow(ridge, 7);
          const t = clamp((n1 - 0.25) * 2.0, 0, 1);
          r = 168 + 76 * t; gg = 48 + 84 * t; b = 24 + 20 * t;
          r += 80 * vein; gg += 110 * vein; b += 30 * vein;
          const sp = 1 + (pnoise(u * 90, v * 90, 90, 90, 7) - 0.5) * 0.22;
          r *= sp; gg *= sp; b *= sp;
        } else if (kind === 'outer') {
          const fl = pfbm(u * 2, v * 10, 2, 10, 41, 4);
          const fl2 = pfbm(u * 4 + fl * 2, v * 6, 4, 6, 47, 3);
          const t = clamp(fl * 0.7 + fl2 * 0.5 - 0.1, 0, 1);
          r = 255; gg = 150 + 90 * t; b = 20 + 100 * Math.pow(t, 1.6);
          const hl = Math.pow(clamp((fl2 - 0.55) * 4, 0, 1), 2);
          gg += 40 * hl; b += 70 * hl;
        } else { // inner
          const cl = cellular(u, v, 7, 3);
          const edge = clamp((cl.f2 - cl.f1) * 5, 0, 1);
          const t = 0.55 + cl.id * 0.45;
          r = 255 * (0.93 + 0.07 * t); gg = 232 * (0.85 + 0.15 * t); b = 150 * (0.7 + 0.3 * t);
          const k = 0.8 + 0.2 * edge;
          r *= k; gg *= k; b *= k * (0.95 + 0.05 * edge);
          if (hash2(i, j, 99) > 0.995) { r = 255; gg = 255; b = 235; }
        }
        const k4 = (j * N + i) * 4;
        d[k4] = clamp(r, 0, 255); d[k4 + 1] = clamp(gg, 0, 255); d[k4 + 2] = clamp(b, 0, 255); d[k4 + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    TILES = TILES || {};
    TILES[kind] = c;
  }
  let TILES = null;
  const patCache = new Map();
  // 타일을 무늬(pattern)로 만들어 두고, 크기·이동만 바꿔 씀 (아직 만드는 중이면 null)
  function tilePattern(ctx, id, scale, tx, ty) {
    if (!TILES || !TILES[id]) return null;
    let p = patCache.get(ctx);
    if (!p) { p = {}; patCache.set(ctx, p); }
    let pat = p[id];
    if (!pat) { pat = ctx.createPattern(TILES[id], 'repeat'); p[id] = pat; }
    if (pat.setTransform) {
      try { pat.setTransform(new DOMMatrix([scale, 0, 0, scale, tx || 0, ty || 0])); } catch (e) { /* 무시 */ }
    }
    return pat;
  }

  // 대륙 윤곽 (경도, 위도 쌍) - 단순화한 모양
  const LAND = [
    // 북아메리카
    [-168, 65.5, -166, 68.5, -156.5, 71.3, -141, 69.7, -128, 70, -115, 68.8, -108, 68, -98, 68.5, -95, 71.5, -90, 69, -82, 69.5, -81, 67, -86, 66, -90, 64, -94, 61.5, -94.5, 58.8, -92.5, 57, -85, 55.3, -82.3, 52.9, -79, 51.5, -78.8, 55, -77, 59, -78, 62.3, -73, 62, -70, 60, -65, 60.3, -62, 57, -60, 55, -56, 52.5, -59, 50.2, -64.5, 50.2, -66.5, 49.2, -64, 48, -65, 46, -61, 45.5, -64.5, 43.8, -67, 44.8, -70, 43.5, -70.5, 41.8, -74, 40.5, -75.5, 38, -76, 35, -78, 33.8, -81, 31.5, -80.2, 27, -80.2, 25.3, -81.8, 26.5, -82.7, 28, -83.5, 29.9, -87, 30.3, -89.5, 30.1, -89.2, 29, -91.5, 29.5, -94, 29.6, -97, 27.8, -97.5, 24, -97.7, 22, -96, 19, -94.5, 18.2, -91, 18.6, -90.5, 21, -87, 21.5, -87.5, 18, -88.3, 15.8, -84, 15.8, -83.3, 11, -82, 9, -79.5, 9.5, -77.4, 8.6, -78.5, 7.3, -80.5, 7.3, -83.5, 8.4, -85.7, 10, -87.5, 13, -91.5, 14, -94.5, 16, -96.5, 15.7, -101, 17.5, -105.5, 20, -105.6, 22.5, -109, 25.5, -112.5, 29.5, -114.7, 31.7, -114.2, 28, -110, 23, -112, 24.5, -115, 28, -117, 32.5, -120.5, 34.5, -122.5, 37.5, -124.2, 40.5, -124, 46.5, -124.7, 48.3, -122.7, 49, -127, 50.8, -130, 54.5, -134, 58, -138, 59.5, -145, 60.5, -151, 59.2, -154, 57.5, -158, 56.5, -163, 54.7, -164.5, 54.5, -160, 58.6, -162, 60, -165, 62.5, -161, 64.5, -166, 64.7],
    // 남아메리카
    [-77.4, 8.6, -72, 12, -71.5, 10.8, -67, 10.6, -62, 10.7, -60, 8.5, -52, 5, -50, 1.5, -44.5, -2.5, -38.5, -3.7, -35, -5.5, -35, -9, -38.5, -13, -39, -17.8, -41, -22, -44, -23.2, -48, -25.5, -48.7, -28, -52, -32, -54.5, -34.8, -58.3, -34.2, -57.5, -37.5, -62, -39, -65, -41, -65.2, -45, -67.5, -46.5, -66, -48, -68.5, -50.5, -69, -52.5, -68.5, -54.2, -66, -55, -71.5, -53.5, -75, -50, -74, -44, -73.5, -40, -73.5, -37, -71.7, -33, -71.5, -28, -70.3, -18.4, -76, -14, -79, -8, -81.2, -5, -80, -2.5, -80.5, -0.5, -79.5, 1.5, -77.5, 4],
    // 아프리카
    [-9.5, 35.8, -5.9, 35.8, -3, 35.2, 0, 35.8, 3, 36.8, 10.2, 37.2, 11, 35, 10.2, 33.2, 15, 32.2, 19, 30.3, 20, 32.5, 22, 32.8, 25, 31.8, 29, 30.9, 32, 31.3, 34.2, 31.2, 34.9, 29.5, 32.6, 29.9, 33.5, 27.8, 35, 24, 36.8, 22, 37.3, 19, 39, 15.5, 41, 14.2, 43.2, 12.6, 44.5, 10.5, 51, 11.8, 51, 10.5, 49.5, 6.5, 47.5, 4, 42, -1, 40, -4, 39, -7, 40.4, -11, 40.7, -15, 35.2, -19.5, 35.5, -24, 32.8, -26, 32.5, -28.5, 31, -29.9, 27, -33.5, 25.5, -34.2, 20, -34.8, 18.4, -34.2, 17.8, -32, 15, -26.5, 14.5, -22.5, 11.8, -17.2, 13.5, -12, 12.3, -6, 9, -1, 9.7, 3.5, 8.5, 4.3, 6, 4.3, 4.5, 6.2, 1.5, 6.2, -2, 4.8, -7.5, 4.4, -10.5, 6.2, -13, 8.4, -14.5, 10.5, -16.7, 12.5, -17.5, 14.7, -16.5, 19.5, -17, 21, -15, 25, -13, 27.5, -9.8, 30.5, -9.5, 32, -6.8, 34],
    // 유라시아
    [-5.3, 36, -6.3, 36.5, -8.8, 37, -9.5, 38.7, -8.9, 41.5, -9.3, 43, -8, 43.7, -1.8, 43.4, -1.2, 46, -2.5, 47.3, -4.5, 48, -1.5, 48.7, -1.2, 49.7, 1.6, 50.8, 3.5, 51.4, 4.5, 53, 7, 53.5, 8.7, 54, 8.4, 55.5, 9.8, 57, 10.6, 57.6, 10.5, 56, 9.7, 54.8, 11, 54, 13.5, 54.3, 14.2, 53.9, 18.5, 54.8, 19.8, 54.4, 21, 55.2, 21, 56.6, 21.2, 57.5, 24, 57.2, 24.4, 58.3, 23.5, 59.2, 28, 59.5, 29.7, 60, 27, 60.5, 23, 60, 21.5, 61, 21.4, 63, 25, 65, 24, 65.8, 21.4, 65.1, 17.2, 62.5, 17.5, 60.5, 18.8, 59.8, 16.5, 57, 14.5, 56, 12.8, 55.8, 12, 56.6, 11, 58.2, 10.5, 59.5, 8, 58, 6, 58.2, 5, 60, 5.5, 62, 10, 64, 14, 67.5, 19, 70, 24, 71, 28, 71, 31, 70.3, 33.5, 69.5, 41, 67.2, 40, 66, 34, 66.5, 32, 64, 37, 63.8, 38, 64.5, 41, 64.5, 44, 66, 44, 68.5, 53, 68.8, 60, 69.8, 69, 68.5, 69, 72.5, 73, 72.8, 80, 73.5, 88, 75.5, 98, 76.2, 104, 77.7, 113, 73.7, 125, 73.5, 129, 71.5, 140, 72.5, 150, 71.5, 161, 69.5, 170, 69.7, 180, 68.5, 180, 65, 177, 65.5, 178.5, 64.5, 179.5, 62.5, 173, 61.5, 170, 60.2, 164.5, 60, 163.5, 58, 162, 55.5, 159, 53, 156.7, 51, 156, 57, 155.5, 59, 150, 59.5, 143, 59.3, 141, 58.5, 137, 56, 135.5, 54.7, 137.5, 54, 140.5, 53, 140.4, 51, 140.5, 48.5, 138.5, 47.5, 135.5, 44, 132.5, 43, 130.7, 42.3, 129.7, 41, 127.5, 39.8, 128.5, 38.5, 129.4, 37, 129.2, 35.2, 127.7, 34.7, 126.5, 34.5, 126.2, 37.7, 125, 39.5, 123, 39.6, 121.7, 39, 121.2, 40.9, 117.8, 38.7, 119, 37.2, 120.2, 37.8, 122.5, 37, 120.8, 36.5, 119.3, 34.8, 120.8, 33, 121, 31.5, 122, 30, 121.6, 28, 119.5, 25.5, 116.5, 23, 113.5, 22.2, 111.5, 21.5, 110.4, 20.3, 108, 21.6, 106.7, 20.7, 105.7, 19, 106.5, 17.5, 108.8, 15.5, 109.3, 13, 108.5, 11.5, 106.7, 10.4, 105.2, 8.7, 104.8, 10, 102.5, 12, 100.8, 13.4, 100.3, 13.5, 99.5, 10, 100.5, 7, 102.2, 6.2, 103.4, 5, 104.2, 1.8, 103.5, 1.3, 101.3, 3, 100.3, 6.5, 98.3, 8.5, 98.5, 13, 97.6, 16.5, 94.3, 16.5, 92.3, 20.5, 91, 22.5, 88.5, 22, 87, 21.5, 84.8, 19.5, 82.3, 17, 80.2, 15.8, 80.3, 13, 79.5, 9.8, 77.5, 8, 76.3, 9.5, 74.8, 12.8, 73.8, 15.5, 72.8, 19, 72.5, 21.3, 70, 21, 68.8, 23.2, 66.5, 25.4, 61.5, 25.2, 57.3, 25.8, 57, 27, 54, 26.5, 51.5, 27.8, 50, 30.2, 48.5, 29.9, 50, 26.5, 51.5, 24.5, 54, 24.2, 56.4, 26, 57, 24, 59, 22.5, 57, 19, 55, 17.5, 52.2, 16.5, 50, 15, 45, 12.8, 43.3, 13, 42.5, 16.5, 39, 21.5, 37, 25, 35, 28, 34.9, 29.5, 34.3, 31.3, 35, 33, 36, 35, 36, 36.8, 34, 36.5, 32, 36.2, 29, 36.5, 27.5, 37, 26.5, 38.5, 27, 40, 29, 41, 29.2, 41.2, 32, 41.7, 35.5, 41.9, 39, 41, 41.7, 41.5, 41.5, 42, 39.7, 43.5, 37.5, 44.5, 38, 45.5, 38.5, 47, 37.5, 47, 35, 45, 33, 45.5, 30.5, 46, 28.7, 45, 28.5, 43.5, 28, 41.5, 26, 40.8, 23, 40.2, 24, 38, 22.8, 36.5, 21, 38, 19.5, 40, 19.4, 41.9, 15.5, 43.5, 13.7, 45.5, 12.5, 44, 14, 42.5, 16.5, 41.5, 18.5, 40.1, 17.2, 39.3, 16.5, 38.5, 16, 38, 15.8, 40, 12.5, 41.5, 10.5, 43, 8.8, 44.3, 6.5, 43.1, 4, 43.4, 3, 42, -0.3, 39.4, 0, 38.8, -2, 36.7],
    // 오스트레일리아
    [113, -22, 114, -26, 115, -34, 118, -35, 123, -34, 129, -31.5, 134, -32.7, 138, -35, 140, -37.8, 144, -38.4, 147, -38, 150, -37, 151, -33, 153, -30, 153, -26, 150, -22.5, 146, -19, 145.4, -15, 143.5, -13, 142.5, -10.7, 141.5, -13, 141, -17, 139, -17.5, 136, -15.5, 136.5, -12, 132, -11.3, 130.5, -12.5, 129, -15, 126, -14, 123, -17, 122, -18, 119, -20, 117, -20.7, 114, -22],
    // 남극 대륙
    [-180, -78, -150, -77, -120, -74, -90, -72, -65, -67, -60, -64, -62, -70, -58, -76, -40, -78, -20, -72, 0, -70, 30, -70, 60, -67, 90, -66, 120, -66, 150, -69, 170, -72, 180, -78, 180, -90, -180, -90],
    // 그린란드
    [-73, 78, -60, 82, -30, 83.5, -20, 81.5, -18, 76, -20, 70, -26, 68.5, -35, 66, -42, 60, -47, 60.5, -52, 64, -54, 67, -55, 70, -58, 75, -70, 76.5],
    // 영국·아일랜드·아이슬란드·일본·섬들
    [-5.5, 50, 1.5, 51, 1.7, 53, -0.5, 54.5, -2, 56, -2, 57.6, -3.5, 58.6, -5, 58.6, -6.2, 56.5, -5, 55, -3, 54.8, -3, 53.4, -4.5, 53, -5, 51.7, -3.5, 51.2],
    [-10, 51.7, -6, 52, -6, 54, -8, 55.2, -10, 54],
    [-24, 65.5, -22, 66.4, -16, 66.5, -13.5, 65, -18, 63.5, -22, 63.8],
    [130.5, 31, 132, 33.5, 135, 33.5, 137, 34.5, 140, 35, 141, 38, 142, 40, 141.5, 41.5, 140, 40, 139.5, 38, 137, 37, 136, 35.5, 133, 35.5, 131, 34.5, 130, 33],
    [140, 42, 141.5, 43, 143, 42.8, 145.5, 43.5, 144, 44.5, 142, 45.5, 141.5, 43.5, 140, 43.2],
    [95.3, 5.5, 98, 4, 104, -1.5, 106, -3, 105.5, -5.8, 102, -4, 100, -1.5, 97, 2.5],
    [109, 1.5, 111, 2, 116, 6.8, 119, 5, 118, 1, 116.5, -2.5, 114, -4, 111, -3, 110, -1],
    [105.2, -6.8, 108, -6.5, 111, -6.7, 114.5, -7.8, 114.4, -8.7, 108, -7.8, 105.5, -7],
    [131, -0.8, 135, -3.3, 138, -1.8, 141, -2.6, 145, -4.7, 148, -6.5, 150.5, -10.5, 147, -10, 143, -9, 141, -9.1, 138, -8.3, 137, -5.5, 133, -4, 132, -2.8],
    [120.5, 18.5, 122.2, 18.4, 122, 16, 124, 13.5, 121, 13.8, 120, 14.5, 120, 16.5],
    [43.5, -24, 44, -20, 44, -17, 46.5, -15.5, 49.5, -12, 50.3, -15.5, 49.5, -18, 47.5, -25, 45, -25.5],
    [172.5, -34.5, 175, -37, 178, -37.7, 177, -39.5, 175, -41.3, 173, -39.5],
    [172.7, -40.5, 174.3, -41.7, 172.5, -43.7, 171, -44.5, 169, -46.5, 166.5, -46, 168, -44, 171, -42.5],
    [-85, 22, -82, 23.2, -79, 22.6, -77, 20.5, -74.2, 20.2, -77.5, 19.8, -80, 21.7],
    [-59, 47.5, -55.5, 46.8, -53, 46.7, -52.7, 47.6, -55.5, 49.5, -57.5, 50.5, -59, 48.5],
  ];
  const SEAS = [
    [47, 45, 50, 46.5, 53, 45.5, 53, 42, 53.8, 40, 52.8, 37.5, 50, 37, 49, 39, 49.5, 41, 47.5, 43], // 카스피해
  ];
  const TEX_W = 1024, TEX_H = 512, CLOUD_W = 512, CLOUD_H = 256;
  let EARTH = null;
  function* earthTask() {
    const W = TEX_W, H = TEX_H;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const X = (lon) => (lon + 180) / 360 * W, Y = (lat) => (90 - lat) / 180 * H;
    const poly = (g, arr) => { g.beginPath(); for (let i = 0; i < arr.length; i += 2) { const x = X(arr[i]), y = Y(arr[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); g.fill(); };
    const m = mk(), mg = m.getContext('2d');
    mg.fillStyle = '#000'; mg.fillRect(0, 0, W, H);
    mg.fillStyle = '#fff'; LAND.forEach((a) => poly(mg, a));
    mg.fillStyle = '#000'; SEAS.forEach((a) => poly(mg, a));
    const s = mk(), sg = s.getContext('2d');
    sg.shadowColor = '#fff'; sg.shadowBlur = 9; sg.shadowOffsetX = W; sg.translate(-W, 0); sg.fillStyle = '#fff';
    LAND.forEach((a) => poly(sg, a));
    const md = mg.getImageData(0, 0, W, H).data, sd = sg.getImageData(0, 0, W, H).data;
    const out = new Uint32Array(W * H), water = new Uint8Array(W * H);
    const pack = (r, g, b) => (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
    yield;
    for (let y = 0; y < H; y++) {
      if ((y & 15) === 0) yield;
      const lat = 90 - (y + 0.5) / H * 180, al = Math.abs(lat);
      for (let x = 0; x < W; x++) {
        const idx = y * W + x, land = md[idx * 4] / 255, shallow = sd[idx * 4 + 3] / 255;
        const nO = vnoise(x / 60, y / 60, 3);
        // 바다
        let or = 22 + 10 * nO, og = 84 + 28 * nO, ob = 160 + 30 * nO;
        or += (70 - or) * shallow * 0.8; og += (170 - og) * shallow * 0.8; ob += (225 - ob) * shallow * 0.7;
        if (al > 72) { const ice = smooth(72, 82, al); or += (225 - or) * ice * 0.9; og += (238 - og) * ice * 0.9; ob += (248 - ob) * ice * 0.9; }
        let r = or, g = og, b = ob;
        if (land > 0.02) {
          const n = fbm(x / 70, y / 70, 8, 4), n2 = fbm(x / 22, y / 22, 12, 3);
          const w2 = smooth(16, 32, al), w3 = smooth(44, 60, al), w1 = 1 - w2, wm = w2 * (1 - w3);
          let lr = w1 * (40 + 30 * n) + wm * (92 + 40 * n) + w2 * w3 * (84 + 30 * n);
          let lg = w1 * (122 + 38 * n) + wm * (148 + 26 * n) + w2 * w3 * (118 + 28 * n);
          let lb = w1 * (58 + 20 * n) + wm * (80 + 20 * n) + w2 * w3 * (82 + 18 * n);
          const des = smooth(0.47, 0.6, n) * smooth(8, 16, al) * (1 - smooth(34, 42, al));
          lr += (212 - lr) * des; lg += (176 - lg) * des; lb += (112 - lb) * des;
          const mt = smooth(0.58, 0.72, n2 * 0.6 + n * 0.5);
          lr += (138 - lr) * mt * 0.55; lg += (118 - lg) * mt * 0.55; lb += (96 - lb) * mt * 0.55;
          const pol = smooth(64, 74, al);
          lr += (245 - lr) * pol; lg += (248 - lg) * pol; lb += (252 - lb) * pol;
          r = or + (lr - or) * land; g = og + (lg - og) * land; b = ob + (lb - ob) * land;
        } else water[idx] = 1;
        out[idx] = pack(r, g, b);
      }
    }
    // 구름
    const cl = new Uint8Array(CLOUD_W * CLOUD_H);
    for (let y = 0; y < CLOUD_H; y++) {
      if ((y & 15) === 0) yield;
      for (let x = 0; x < CLOUD_W; x++) {
        const n = pfbm(x / 40, y / 24, CLOUD_W / 40, CLOUD_H / 24, 77, 5);
        const lat = 90 - (y + 0.5) / CLOUD_H * 180;
        const band = 0.8 + 0.25 * Math.cos(lat * DEG * 3);
        cl[y * CLOUD_W + x] = Math.round(smooth(0.5, 0.74, n * band) * 255);
      }
    }
    EARTH = { out, water, cl };
  }
  // 무거운 바탕 그림은 프레임마다 조금씩 나누어 만들어요 (화면이 끊기지 않게)
  const buildQueue = [earthTask(), tileTask('crust'), tileTask('mantle'), tileTask('outer'), tileTask('inner')];
  function stepBuild(ms) {
    const t0 = performance.now();
    while (buildQueue.length && performance.now() - t0 < ms) {
      const r = buildQueue[0].next();
      if (r.done) buildQueue.shift();
    }
  }

  /* =========================================================
     지구본 (구에 무늬를 입혀 자전시키기)
     ========================================================= */
  const globes = new Map();
  function getGlobe(R) {
    const key = Math.round(R);
    let G = globes.get(key);
    if (G) return G;
    const q = R > 100 ? 1.15 : 1.5;
    const N = Math.ceil(R * 2 * q);
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'), img = g.createImageData(N, N), u32 = new Uint32Array(img.data.buffer);
    const n2 = N * N;
    const colF = new Float32Array(n2), rowI = new Uint16Array(n2), shadeA = new Uint8Array(n2), limbA = new Uint8Array(n2), specA = new Uint8Array(n2), alphaA = new Uint8Array(n2);
    const tilt = 23.4 * DEG, pitch = 16 * DEG, ct = Math.cos(tilt), st = Math.sin(tilt), cp = Math.cos(pitch), sp = Math.sin(pitch);
    let lx = -0.5, ly = 0.55, lz = 0.67; { const l = Math.hypot(lx, ly, lz); lx /= l; ly /= l; lz /= l; }
    let hx = lx, hy = ly, hz = lz + 1; { const l = Math.hypot(hx, hy, hz); hx /= l; hy /= l; hz /= l; }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = j * N + i;
        const nx = (i + 0.5) / N * 2 - 1, ny = -((j + 0.5) / N * 2 - 1), d2 = nx * nx + ny * ny, d = Math.sqrt(d2);
        const edge = clamp((1 - d) * (N / 2), 0, 1);
        if (edge <= 0) continue;
        alphaA[k] = Math.round(edge * 255);
        const nz = Math.sqrt(Math.max(0, 1 - d2));
        const x1 = nx * ct - ny * st, y1 = nx * st + ny * ct, z1 = nz;
        const y2 = y1 * cp + z1 * sp, z2 = -y1 * sp + z1 * cp, x2 = x1;
        const lat = Math.asin(clamp(y2, -1, 1)), lon = Math.atan2(x2, z2);
        rowI[k] = clamp(Math.floor((0.5 - lat / Math.PI) * TEX_H), 0, TEX_H - 1);
        colF[k] = (lon / TAU + 0.5) * TEX_W;
        const df = nx * lx + ny * ly + nz * lz;
        const t = clamp((df + 0.2) / 1.25, 0, 1);
        shadeA[k] = Math.round(clamp(0.27 + 0.92 * (t * t * (3 - 2 * t)), 0, 1.2) * 200);
        limbA[k] = Math.round(Math.pow(1 - nz, 2.4) * 255);
        const sh = nx * hx + ny * hy + nz * hz;
        specA[k] = sh > 0 ? Math.round(Math.pow(sh, 90) * 255) : 0;
      }
    }
    G = { R, N, canvas: cv, g, img, u32, colF, rowI, shadeA, limbA, specA, alphaA, last: null };
    globes.set(key, G);
    return G;
  }
  function renderGlobe(G, spin, cloudSpin) {
    if (!EARTH) return false;
    const key = Math.round(spin * 40) + ':' + Math.round(cloudSpin * 40);
    if (G.last === key) return true;
    G.last = key;
    const { out, water, cl } = EARTH, { u32, colF, rowI, shadeA, limbA, specA, alphaA } = G;
    const n2 = G.N * G.N, sc = (spin / TAU) * TEX_W, cc = (cloudSpin / TAU) * CLOUD_W;
    const M = TEX_W - 1;
    for (let k = 0; k < n2; k++) {
      const a = alphaA[k];
      if (!a) { u32[k] = 0; continue; }
      const row = rowI[k];
      const ti = row * TEX_W + (((colF[k] - sc) | 0) & M);
      const c = out[ti];
      let r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
      const ca = cl[(row >> 1) * CLOUD_W + ((((colF[k] * 0.5) - cc) | 0) & (CLOUD_W - 1))] / 255 * 0.82;
      if (ca > 0.01) { r += (246 - r) * ca; g += (249 - g) * ca; b += (252 - b) * ca; }
      const s = shadeA[k] / 200;
      r *= s; g *= s; b *= s;
      if (water[ti] && ca < 0.4) { const sp2 = specA[k] * 0.38 * (1 - ca * 2); r += sp2; g += sp2; b += sp2; }
      const lm = limbA[k] / 255 * 0.55;
      r += (110 - r) * lm * 0.6; g += (170 - g) * lm * 0.6; b += (255 - b) * lm * 0.6;
      u32[k] = (a << 24) | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
    }
    G.g.putImageData(G.img, 0, 0);
    return true;
  }
  // 지구본 그리기 (큰 대기 후광 + 몸체 + 반짝임)
  function drawGlobe(ctx, cx, cy, R, spin, cloudSpin, o) {
    o = o || {};
    const G = getGlobe(R);
    const ready = renderGlobe(G, spin, cloudSpin);
    if (o.glow !== false) {
      const ag = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.24);
      ag.addColorStop(0, 'rgba(125,195,255,.55)'); ag.addColorStop(0.35, 'rgba(90,160,255,.22)'); ag.addColorStop(1, 'rgba(90,160,255,0)');
      ctx.fillStyle = ag; circle(ctx, cx, cy, R * 1.24); ctx.fill();
    }
    if (ready) ctx.drawImage(G.canvas, cx - R, cy - R, R * 2, R * 2);
    else { const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R); g.addColorStop(0, '#5aa8ec'); g.addColorStop(1, '#1b4f9c'); ctx.fillStyle = g; circle(ctx, cx, cy, R); ctx.fill(); }
    // 반사광
    const hg = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.5, 0, cx - R * 0.42, cy - R * 0.5, R * 0.55);
    hg.addColorStop(0, 'rgba(255,255,255,.2)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg; circle(ctx, cx, cy, R); ctx.fill();
    return G;
  }

  /* =========================================================
     화면 배치 · 상태
     ========================================================= */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 640, fs: 1 },
    tall: { key: 'tall', vw: 520, vh: 846, fs: 1.2 },
  };
  const S = {
    scene: 'land',            // land | web | earth
    // 1단계: 물체 분류
    assign: {}, assignOrder: [], sel: null, drag: null, hoverBin: -1, flagged: new Set(), shakeAt: {}, tip: null,
    // 2단계: 상호작용 연결
    links: {}, caseSel: 'volcano', linkFrom: null, linkDrag: null, flagLinks: new Set(), linkShake: {}, linkBorn: {}, hoverNode: -1,
    // 3~4단계: 지구 단면
    view: 'globe', cut: 0, split: 0, vis: { globe: 1, disc: 0, scale: 0, depth: 0 },
    spin: 0.9, spinV: 0.32, cloudSpin: 0.2, spinDrag: null,
    seen: new Set(), focus: null, focusAt: 0, hintAt: 0,
    slots: {}, cardSel: null, cardDrag: null, flagSlots: new Set(), slotShake: {}, slotMode: false, slotBorn: {},
    lensAng: -0.75, lensDrag: false, lensSeen: false, depth: 1500, depthTarget: 1500, depthDrag: false, depthTouched: false,
    note: '', fade: 1, stamp: null, lastPhase: '',
  };
  let game = null;
  let FEAT = new Set();

  /* ---------- 배치 계산 ---------- */
  function frameOf(L, trayH) {
    if (L.key === 'wide') return { M: { x: 12, y: 12, w: 776, h: L.vh - 24 - trayH }, T: { x: 12, y: L.vh - 12 - trayH + 10, w: 776, h: trayH - 10 } };
    return { M: { x: 10, y: 10, w: 500, h: L.vh - 20 - trayH }, T: { x: 10, y: L.vh - 10 - trayH + 10, w: 500, h: trayH - 10 } };
  }
  function landGeo(L) {
    const wide = L.key === 'wide';
    const P = wide ? { x: 12, y: 12, w: 776, h: 440 } : { x: 10, y: 10, w: 500, h: 470 };
    const bins = [];
    if (wide) {
      const bw = 146, gap = (776 - 5 * bw) / 4;
      SPHERES.forEach((s, i) => bins.push({ id: s.id, x: 12 + i * (bw + gap), y: 464, w: bw, h: 164 }));
    } else {
      const bw = 160, bh = 160, gap = 10;
      SPHERES.forEach((s, i) => {
        const row = i < 3 ? 0 : 1, col = i < 3 ? i : i - 3, n = row === 0 ? 3 : 2;
        const x0 = 10 + (500 - (n * bw + (n - 1) * gap)) / 2;
        bins.push({ id: s.id, x: x0 + col * (bw + gap), y: 492 + row * (bh + 10), w: bw, h: bh });
      });
    }
    // 물체 위치: (cx, cy) = 눌러 볼 영역의 가운데, hw·hh = 반폭·반높이
    const it = {};
    if (wide) {
      it.mountain = { cx: P.x + P.w * 0.27, cy: P.y + P.h * 0.54, hw: P.w * 0.19, hh: P.h * 0.31, base: P.y + P.h * 0.82, w: P.w * 0.42, h: P.h * 0.64 };
      it.sea = { cx: P.x + P.w * 0.775, cy: P.y + P.h * 0.64, hw: P.w * 0.225, hh: P.h * 0.15 };
      it.cloud = { cx: P.x + P.w * 0.16, cy: P.y + P.h * 0.17, hw: 62, hh: 32, s: 1.25 };
      it.moon = { cx: P.x + P.w * 0.88, cy: P.y + P.h * 0.15, hw: 34, hh: 34, r: 26 };
      it.tree = { cx: P.x + P.w * 0.82, cy: P.y + P.h * 0.97 - 128 * 0.44, hw: 52, hh: 70, base: P.y + P.h * 0.97, h: 128 };
      it.person = { cx: P.x + P.w * 0.52, cy: P.y + P.h * 0.97 - 104 * 0.5, hw: 36, hh: 58, base: P.y + P.h * 0.97, h: 104 };
    } else {
      it.mountain = { cx: P.x + P.w * 0.32, cy: P.y + P.h * 0.55, hw: P.w * 0.3, hh: P.h * 0.25, base: P.y + P.h * 0.80, w: P.w * 0.62, h: P.h * 0.5 };
      it.sea = { cx: P.x + P.w * 0.8, cy: P.y + P.h * 0.66, hw: P.w * 0.2, hh: P.h * 0.12 };
      it.cloud = { cx: P.x + P.w * 0.24, cy: P.y + P.h * 0.13, hw: 62, hh: 34, s: 1.25 };
      it.moon = { cx: P.x + P.w * 0.84, cy: P.y + P.h * 0.12, hw: 38, hh: 38, r: 28 };
      it.tree = { cx: P.x + P.w * 0.84, cy: P.y + P.h * 0.975 - 130 * 0.44, hw: 52, hh: 70, base: P.y + P.h * 0.975, h: 130 };
      it.person = { cx: P.x + P.w * 0.5, cy: P.y + P.h * 0.975 - 108 * 0.5, hw: 38, hh: 60, base: P.y + P.h * 0.975, h: 108 };
    }
    return { P, bins, it };
  }
  function webGeo(L) {
    const wide = L.key === 'wide';
    const F = frameOf(L, wide ? 98 : 232);
    const M = F.M, T = F.T;
    const cx = M.x + M.w / 2, cy = M.y + M.h / 2 + (wide ? 8 : 6);
    const rx = wide ? 262 : 170, ry = wide ? 182 : 214, nr = wide ? 40 : 38;
    const nodes = [];
    const order = ['space', 'geo', 'atmo', 'hydro', 'bio'];
    order.forEach((id, i) => {
      const a = (-90 + i * 72) * DEG;
      nodes.push({ id, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, r: nr });
    });
    const cards = [];
    if (wide) {
      const w = (T.w - 30) / 4;
      CASES.forEach((c, i) => cards.push({ id: c.id, x: T.x + i * (w + 10), y: T.y, w, h: T.h }));
    } else {
      const w = (T.w - 10) / 2, h = (T.h - 10) / 2;
      CASES.forEach((c, i) => cards.push({ id: c.id, x: T.x + (i % 2) * (w + 10), y: T.y + Math.floor(i / 2) * (h + 10), w, h }));
    }
    return { M, T, cx, cy, nodes, cards, globeR: wide ? 56 : 54 };
  }
  function earthGeo(L) {
    const wide = L.key === 'wide';
    const F = frameOf(L, wide ? 96 : 214);
    const M = F.M, T = F.T;
    let g;
    if (wide) {
      g = { cx: 262, cy: 274, R: 184, rowsX: 520, rowsY: 56, rowW: 268, rowH: 98, rowGap: 10, cols: 1 };
    } else {
      g = { cx: 260, cy: 232, R: 164, rowsX: 10, rowsY: 428, rowW: 245, rowH: 92, rowGap: 8, cols: 2 };
    }
    const rows = LAYERS.map((l, i) => {
      if (g.cols === 1) return { id: l.id, x: g.rowsX, y: g.rowsY + i * (g.rowH + g.rowGap), w: g.rowW, h: g.rowH };
      return { id: l.id, x: g.rowsX + (i % 2) * (g.rowW + 10), y: g.rowsY + Math.floor(i / 2) * (g.rowH + g.rowGap), w: g.rowW, h: g.rowH };
    });
    const cards = [];
    if (wide) {
      const w = (T.w - 30) / 4;
      for (let i = 0; i < 4; i++) cards.push({ x: T.x + i * (w + 10), y: T.y + 4, w, h: T.h - 4 });
    } else {
      const w = (T.w - 10) / 2, h = (T.h - 10) / 2;
      for (let i = 0; i < 4; i++) cards.push({ x: T.x + (i % 2) * (w + 10), y: T.y + Math.floor(i / 2) * (h + 10), w, h });
    }
    return Object.assign(g, { M, T, rows, cards, wide });
  }

  /* =========================================================
     지구 단면 그리기
     ========================================================= */
  // 위에서 비스듬히 내려다본 모양 (등각 투영): 축 X는 왼쪽 아래, Y는 오른쪽 아래, Z는 위쪽
  const AX = { X: [-0.7071, 0.4082], Y: [0.7071, 0.4082], Z: [0, -0.8165] };
  const FACES = [
    { id: 'floor', u: AX.X, v: AX.Y, dark: -0.1 },
    { id: 'left', u: AX.X, v: AX.Z, dark: 0.15 },
    { id: 'right', u: AX.Y, v: AX.Z, dark: 0.36 },
  ];
  function radiiOf(trueScale) {
    const c0 = trueScale ? 0.9945 : 0.93;
    return { crust: [c0, 1], mantle: [0.547, c0], outer: [0.203, 0.547], inner: [0, 0.203] };
  }
  // 잘라낸 조각(구의 1/8)의 윤곽
  function notchPath(ctx, cx, cy, R) {
    const N = 28, pt = (a, b, th) => [cx + R * (Math.cos(th) * a[0] + Math.sin(th) * b[0]), cy + R * (Math.cos(th) * a[1] + Math.sin(th) * b[1])];
    ctx.beginPath();
    for (let k = 0; k <= N; k++) { const p = pt(AX.X, AX.Y, k / N * Math.PI / 2); if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
    for (let k = 1; k <= N; k++) { const p = pt(AX.Y, AX.Z, k / N * Math.PI / 2); ctx.lineTo(p[0], p[1]); }
    for (let k = N - 1; k >= 0; k--) { const p = pt(AX.X, AX.Z, k / N * Math.PI / 2); ctx.lineTo(p[0], p[1]); }
    ctx.closePath();
  }
  // 단면(부채꼴 1/4)에 층 무늬 채우기
  function paintSector(ctx, id, r1, scale, tx, ty, baseColor) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r1 * 512, 0, Math.PI / 2); ctx.closePath();
    const pat = tilePattern(ctx, id, scale, tx, ty);
    ctx.fillStyle = pat || baseColor; ctx.fill();
  }
  const DISC_GAP = 0.125;
  function ringPath(ctx, cx, cy, ro, ri) {
    ctx.beginPath(); ctx.arc(cx, cy, ro, 0, TAU);
    if (ri > 0.2) { ctx.moveTo(cx + ri, cy); ctx.arc(cx, cy, ri, 0, TAU, true); }
  }
  // 단면 한 장 그리기 (face: 등각 투영 면)
  function drawFace(ctx, face, cx, cy, R, o) {
    const k = R / 512, rd = radiiOf(false), t = o.t;
    ctx.save();
    ctx.transform(face.u[0] * k, face.u[1] * k, face.v[0] * k, face.v[1] * k, cx, cy);
    const sc = 1.9;
    paintSector(ctx, 'crust', 1, sc, 0, 0, '#9a7650');
    paintSector(ctx, 'mantle', rd.mantle[1], sc * 1.1, t * 3, t * 1.5, '#e0662a');
    paintSector(ctx, 'outer', rd.outer[1], sc * 0.9, t * 40, -t * 9, '#ffb02e');
    // 층 경계선 (가장자리 어둡게, 안쪽 밝게)
    [rd.mantle[1], rd.outer[1], rd.inner[1]].forEach((r) => {
      ctx.beginPath(); ctx.arc(0, 0, r * 512, 0, Math.PI / 2);
      ctx.strokeStyle = 'rgba(40,16,4,.55)'; ctx.lineWidth = 5; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, (r - 0.012) * 512, 0, Math.PI / 2);
      ctx.strokeStyle = 'rgba(255,230,170,.35)'; ctx.lineWidth = 3; ctx.stroke();
    });
    // 안쪽 그림자(모서리) + 면 밝기
    const ao = ctx.createRadialGradient(0, 0, 0, 0, 0, 420);
    ao.addColorStop(0, 'rgba(30,8,0,.0)'); ao.addColorStop(0.45, 'rgba(30,8,0,.0)'); ao.addColorStop(1, 'rgba(30,8,0,.22)');
    ctx.fillStyle = ao; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rd.outer[1] * 512, 0, Math.PI / 2); ctx.closePath(); ctx.fill();
    paintSector(ctx, 'inner', rd.inner[1], sc * 0.8, 0, 0, '#ffe48a');
    // 안쪽 핵의 빛남
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 180);
    gl.addColorStop(0, 'rgba(255,250,210,.55)'); gl.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 190, 0, Math.PI / 2); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (face.dark !== 0) {
      ctx.fillStyle = face.dark > 0 ? 'rgba(8,14,40,' + face.dark + ')' : 'rgba(255,244,214,' + (-face.dark) + ')';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 512, 0, Math.PI / 2); ctx.closePath(); ctx.fill();
    }
    // 강조/흐림
    if (o.focus) {
      LAYERS.forEach((l) => {
        const r = rd[l.id];
        ctx.beginPath(); ctx.arc(0, 0, r[1] * 512, 0, Math.PI / 2); if (r[0] > 0) ctx.arc(0, 0, r[0] * 512, Math.PI / 2, 0, true); else ctx.lineTo(0, 0); ctx.closePath();
        if (l.id === o.focus) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.12 + 0.1 * pulse()) + ')'; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 6; ctx.stroke();
        } else { ctx.fillStyle = 'rgba(6,10,30,.42)'; ctx.fill(); }
      });
    } else if (o.hintLayer) {
      const r = rd[o.hintLayer];
      ctx.beginPath(); ctx.arc(0, 0, r[1] * 512, 0, Math.PI / 2); if (r[0] > 0) ctx.arc(0, 0, r[0] * 512, Math.PI / 2, 0, true); else ctx.lineTo(0, 0); ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.38 * o.hintA) + ')'; ctx.fill();
    }
    // 잘린 가장자리(평면 모서리)
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(512, 0); ctx.lineTo(0, 0); ctx.lineTo(0, 512); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 512, 0, Math.PI / 2); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  // 층 위치(누른 곳) → 층 번호  (등각 투영 면에서)
  function hitFace(p, cx, cy, R) {
    for (let i = 0; i < FACES.length; i++) {
      const f = FACES[i], dx = p.x - cx, dy = p.y - cy;
      const det = f.u[0] * f.v[1] - f.u[1] * f.v[0];
      const a = (dx * f.v[1] - dy * f.v[0]) / (R * det), b = (f.u[0] * dy - f.u[1] * dx) / (R * det);
      if (a >= -0.002 && b >= -0.002) {
        const rho = Math.hypot(a, b);
        if (rho <= 1.015) return layerAtRho(rho, false);
      }
    }
    return null;
  }
  function layerAtRho(rho, trueScale) {
    const rd = radiiOf(trueScale);
    if (rho >= rd.crust[0]) return 'crust';
    if (rho >= rd.mantle[0]) return 'mantle';
    if (rho >= rd.outer[0]) return 'outer';
    return 'inner';
  }
  // 한 층의 안내 점 (단면 위, 바깥에서 안쪽으로 가며 이름표를 달 곳)
  function faceAnchor(id, cx, cy, R) {
    const rd = radiiOf(false)[id], rho = id === 'inner' ? 0.1 : (rd[0] + rd[1]) / 2;
    const ang = id === 'crust' ? 52 * DEG : 50 * DEG;
    const a = rho * Math.cos(ang), b = rho * Math.sin(ang);
    return { x: cx + R * (a * AX.Y[0] + b * AX.Z[0]), y: cy + R * (a * AX.Y[1] + b * AX.Z[1]) };
  }

  // 지구본 + 단면 (cut: 0~1 조각이 열린 정도)
  function drawCutGlobe(V, G, t, alpha) {
    const ctx = V.ctx, { cx, cy, R } = G;
    if (alpha < 0.01) return;
    ctx.save(); ctx.globalAlpha = alpha;
    drawGlobe(ctx, cx, cy, R, S.spin, S.cloudSpin);
    const c = S.cut;
    if (c > 0.002) {
      ctx.save(); notchPath(ctx, cx, cy, R); ctx.clip();
      // 단면이 보이는 구멍 안쪽 바닥
      ctx.fillStyle = '#1a0d08'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      const hintLayer = S._hintLayer || null, hintA = S._hintA || 0;
      FACES.forEach((f) => drawFace(ctx, f, cx, cy, R, { t, focus: S.focus, hintLayer, hintA }));
      // 구멍 가장자리 안쪽의 부드러운 그림자 (깊이감)
      notchPath(ctx, cx, cy, R);
      ctx.shadowColor = 'rgba(10,4,0,.7)'; ctx.shadowBlur = 16; ctx.strokeStyle = 'rgba(10,4,0,.5)'; ctx.lineWidth = 10; ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.restore();
      ctx.save(); notchPath(ctx, cx, cy, R);
      ctx.strokeStyle = 'rgba(20,10,4,.55)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }
    // 떼어낸 조각 (구의 1/8): 앞으로 떠올랐다가 옆으로 사라져요
    if (c > 0.002) {
      const off = EZ.inOutCubic(clamp(c, 0, 1)), al = 1 - smooth(0.55, 0.98, off);
      if (al > 0.01) {
        const dx = off * R * 0.82, dy = -off * R * 0.74, sc = 1 + 0.16 * Math.sin(Math.min(1, off * 1.2) * Math.PI * 0.9);
        ctx.save();
        ctx.translate(cx + dx, cy + dy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
        ctx.globalAlpha = alpha * al;
        ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 26 * off; ctx.shadowOffsetX = -10 * off; ctx.shadowOffsetY = 18 * off;
        notchPath(ctx, cx, cy, R); ctx.fillStyle = '#3a78b8'; ctx.fill();
        ctx.shadowColor = 'transparent';
        notchPath(ctx, cx, cy, R); ctx.clip();
        const Gl = getGlobe(R);
        ctx.drawImage(Gl.canvas, cx - R, cy - R, R * 2, R * 2);
        const hg = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.5, 0, cx - R * 0.42, cy - R * 0.5, R * 0.55);
        hg.addColorStop(0, 'rgba(255,255,255,.2)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ---------- 납작한 단면 (층이 갈라져 나가는 그림) ---------- */
  function discMetrics(cx, cy, R, split, trueScale) {
    const rd = radiiOf(trueScale);
    const Reff = R / (1 + 3 * DISC_GAP * split);
    const out = {};
    const order = ['inner', 'outer', 'mantle', 'crust'];
    order.forEach((id, k) => {
      const g = split * DISC_GAP * Reff * k;
      out[id] = { ri: rd[id][0] * Reff + (id === 'inner' ? 0 : g), ro: rd[id][1] * Reff + g, g, k };
    });
    return { Reff, m: out, cx, cy };
  }
  function drawDisc(ctx, cx, cy, R, o) {
    const split = o.split || 0, tr = !!o.trueScale, t = o.t || 0;
    const D = discMetrics(cx, cy, R, split, tr);
    const order = ['crust', 'mantle', 'outer', 'inner'];
    const sc = D.Reff / 512 * 2.0;
    ctx.save();
    ctx.globalAlpha *= (o.alpha != null ? o.alpha : 1);
    order.forEach((id) => {
      const m = D.m[id];
      const L = LY[id];
      if (split > 0.04) {
        // 그림자는 단색으로 먼저 (무늬 채우기에 그림자를 같이 쓰면 아주 느려요)
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16 * split; ctx.shadowOffsetY = 7 * split; ctx.shadowOffsetX = 2 * split;
        ringPath(ctx, cx, cy, m.ro, m.ri); ctx.fillStyle = L.color; ctx.fill('evenodd'); ctx.restore();
      }
      ctx.save();
      ringPath(ctx, cx, cy, m.ro, m.ri);
      const drift = id === 'outer' ? [t * 22, -t * 6] : id === 'mantle' ? [t * 3, t * 1.5] : [0, 0];
      const pat = tilePattern(ctx, id, sc * (id === 'mantle' ? 1.1 : id === 'inner' ? 0.8 : id === 'outer' ? 0.9 : 1), drift[0] + cx, drift[1] + cy);
      ctx.fillStyle = pat || L.color;
      ctx.fill('evenodd');
      ctx.restore();
      // 입체감: 가장자리 밝은 선 + 아래쪽 그늘
      ctx.save();
      ringPath(ctx, cx, cy, m.ro, m.ri);
      ctx.clip('evenodd');
      const g = ctx.createLinearGradient(cx - m.ro, cy - m.ro, cx + m.ro, cy + m.ro);
      g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(10,6,20,.34)');
      ctx.fillStyle = g; ctx.fillRect(cx - m.ro - 2, cy - m.ro - 2, m.ro * 2 + 4, m.ro * 2 + 4);
      ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, m.ro - 0.8), 0, TAU);
      ctx.strokeStyle = 'rgba(30,12,4,.5)'; ctx.lineWidth = split > 0.04 ? 1.6 : 1.2; ctx.stroke();
      if (m.ri > 0.2) { ctx.beginPath(); ctx.arc(cx, cy, m.ri + 0.6, 0, TAU); ctx.stroke(); }
    });
    // 안쪽 핵의 빛남
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const cgl = ctx.createRadialGradient(cx, cy, 0, cx, cy, D.m.inner.ro * 1.5);
    cgl.addColorStop(0, 'rgba(255,240,170,' + (0.5 * (tr ? 0.6 : 1)) + ')'); cgl.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = cgl; circle(ctx, cx, cy, D.m.inner.ro * 1.5); ctx.fill(); ctx.restore();
    // 바깥 반짝임
    const hl = ctx.createRadialGradient(cx - D.Reff * 0.4, cy - D.Reff * 0.45, 0, cx - D.Reff * 0.4, cy - D.Reff * 0.45, D.Reff * 0.7);
    hl.addColorStop(0, 'rgba(255,255,255,' + (0.16 * (1 - split * 0.6)) + ')'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); circle(ctx, cx, cy, D.m.crust.ro); ctx.clip(); ctx.fillStyle = hl; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); ctx.restore();
    // 강조
    if (o.focus) {
      order.forEach((id) => {
        const m = D.m[id];
        ringPath(ctx, cx, cy, m.ro, m.ri);
        if (id === o.focus) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.1 * pulse()) + ')'; ctx.fill('evenodd');
          ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3.2; ctx.stroke();
          if (m.ri > 0.2) { ctx.beginPath(); ctx.arc(cx, cy, m.ri, 0, TAU); ctx.stroke(); }
        } else { ctx.fillStyle = 'rgba(6,10,30,.45)'; ctx.fill('evenodd'); }
      });
    } else if (o.hintLayer) {
      const m = D.m[o.hintLayer];
      ringPath(ctx, cx, cy, m.ro, m.ri);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.36 * o.hintA) + ')'; ctx.fill('evenodd');
    }
    ctx.restore();
    return D;
  }
  function hitDisc(p, cx, cy, R, split, trueScale) {
    const D = discMetrics(cx, cy, R, split, trueScale);
    const d = Math.hypot(p.x - cx, p.y - cy);
    const ids = ['inner', 'outer', 'mantle', 'crust'];
    for (let i = 0; i < ids.length; i++) {
      const m = D.m[ids[i]];
      if (d <= m.ro + 3 && d >= m.ri - 3) return ids[i];
    }
    return null;
  }
  function discAnchor(id, cx, cy, R, split, ang) {
    const D = discMetrics(cx, cy, R, split, false), m = D.m[id];
    const rr = id === 'inner' ? m.ro * 0.45 : (m.ri + m.ro) / 2;
    return { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr };
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
     3단계 화면: 층 이름표(행) · 카드
     ========================================================= */
  const STATE_COL = { 고체: '#64748b', 액체: '#f59e0b' };
  function stateChip(ctx, L, x, y, text, o) {
    o = o || {};
    ctx.save();
    ctx.font = fnt(L, o.size || 13.5, 'bold');
    const w = ctx.measureText(text).width + 16 * L.fs, h = 21 * L.fs * (o.k || 1);
    roundRect(ctx, x, y - h / 2, w, h, h / 2);
    ctx.fillStyle = STATE_COL[text] || '#64748b'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + 0.5);
    ctx.restore();
    return w;
  }
  function slotRect(r) { return { x: r.x + 100, y: r.y + 9, w: r.w - 110, h: r.h - 18 }; }
  function drawRow(V, r, l, o) {
    const ctx = V.ctx, L = V.L, fs = L.fs;
    ctx.save();
    if (o.shake) { const k = o.shake; ctx.translate(Math.sin(k * 40) * 5 * (1 - k), 0); }
    roundRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fillStyle = o.sel ? 'rgba(255,255,255,.17)' : 'rgba(255,255,255,.08)'; ctx.fill();
    ctx.strokeStyle = o.sel ? 'rgba(255,255,255,.95)' : o.hot ? rgba(l.color, 0.95) : 'rgba(255,255,255,.2)'; ctx.lineWidth = o.sel || o.hot ? 2.4 : 1.4; ctx.stroke();
    // 색 띠
    const sw = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    if (o.found) { sw.addColorStop(0, shade(l.color, 0.25)); sw.addColorStop(1, shade(l.color, -0.25)); } else { sw.addColorStop(0, '#5b6a8f'); sw.addColorStop(1, '#33415f'); }
    roundRect(ctx, r.x + 8, r.y + 9, 12, r.h - 18, 6); ctx.fillStyle = sw; ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    if (!o.found) {
      ctx.font = fnt(L, 16, 'bold'); ctx.fillStyle = 'rgba(232,239,255,.78)';
      ctx.fillText('❓ 층을 눌러 알아봐요', r.x + 32, r.y + r.h / 2);
    } else if (o.slot) {
      ctx.font = dfnt(L, 22); ctx.fillStyle = '#fff';
      ctx.fillText(l.name, r.x + 30, r.y + r.h / 2);
      const s = slotRect(r);
      if (!o.filled) {
        roundRect(ctx, s.x, s.y, s.w, s.h, 10);
        ctx.fillStyle = o.over ? 'rgba(120,220,255,.28)' : 'rgba(255,255,255,.06)'; ctx.fill();
        ctx.setLineDash([6, 5]); ctx.lineDashOffset = -nowS() * 10; ctx.strokeStyle = o.over ? '#7fe3ff' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
        ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = 'rgba(232,239,255,.65)'; ctx.textAlign = 'center';
        ctx.fillText('카드를 놓아요', s.x + s.w / 2, s.y + s.h / 2);
      }
    } else {
      const h = r.h;
      ctx.font = dfnt(L, 23); ctx.fillStyle = '#fff';
      const nw = ctx.measureText(l.name).width;
      ctx.fillText(l.name, r.x + 32, r.y + h * 0.25);
      stateChip(ctx, L, r.x + 32 + nw + 10, r.y + h * 0.25, l.state);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = fnt(L, 14.5, 'bold'); ctx.fillStyle = '#ffe9b8';
      ctx.fillText('깊이 ' + l.depth, r.x + 32, r.y + h * 0.5);
      ctx.font = fnt(L, 12.5, '600'); ctx.fillStyle = 'rgba(232,239,255,.82)';
      drawWrapped(ctx, l.note, r.x + 32, r.y + h * 0.71, r.w - 42, 14.5 * fs, 2);
    }
    ctx.restore();
  }
  function cardText(l) { return { state: l.state, depth: l.cardDepth }; }
  function drawCardFace(ctx, L, c, l, o) {
    o = o || {};
    const x = c.x - c.w / 2, y = c.y - c.h / 2, fs = L.fs, small = c.h < 76;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,' + (o.drag ? 0.5 : 0.3) + ')'; ctx.shadowBlur = o.drag ? 20 : 8; ctx.shadowOffsetY = o.drag ? 10 : 3;
    roundRect(ctx, x, y, c.w, c.h, 12); ctx.fillStyle = '#f4f7ff'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = o.bad ? '#ef4444' : o.sel ? '#38bdf8' : '#c6d3ee'; ctx.lineWidth = o.bad || o.sel ? 3 : 1.5; ctx.stroke();
    const t = cardText(l), pad = 9;
    stateChip(ctx, L, x + pad, y + pad + 10 * fs * (small ? 0.9 : 1), t.state, { size: small ? 12.5 : 13.5, k: small ? 0.9 : 1 });
    ctx.fillStyle = '#1f2a44'; ctx.font = fnt(L, small ? 12.5 : 14.5, 'bold'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const ty = y + pad + 24 * fs * (small ? 0.9 : 1) + 3, lh = (small ? 15 : 18) * fs;
    drawWrapped(ctx, t.depth, x + pad, ty, c.w - pad * 2, lh, 2);
    ctx.restore();
  }
  const CARD_ORDER = ['outer', 'crust', 'inner', 'mantle'];
  function cardHome(G, id) { return G.cards[CARD_ORDER.indexOf(id)]; }
  function cardTarget(V, G, id) {
    // 어디에 있어야 하는지: 끄는 중 / 칸에 붙음 / 처음 자리
    if (S.cardDrag && S.cardDrag.id === id) return { x: S.cardDrag.x, y: S.cardDrag.y, w: cardHome(G, id).w * 1.05, h: cardHome(G, id).h * 1.05, drag: true };
    const slotOf = Object.keys(S.slots).find((k) => S.slots[k] === id);
    if (slotOf) {
      const row = G.rows[LAYERS.findIndex((l) => l.id === slotOf)], s = slotRect(row);
      return { x: s.x + s.w / 2, y: s.y + s.h / 2, w: s.w, h: s.h };
    }
    const h = cardHome(G, id);
    return { x: h.x + h.w / 2, y: h.y + h.h / 2, w: h.w, h: h.h };
  }

  /* =========================================================
     4단계 화면: 크기 비교(렌즈·사과) · 깊이 탐사
     ========================================================= */
  function scaleGeo(L) {
    const wide = L.key === 'wide';
    if (wide) return { cx: 196, cy: 282, R: 156, lx: 520, ly: 176, lr: 88, ax: 520, ay: 414, ar: 64, px: 624, pw: 164, lang: -0.32 };
    return { cx: 160, cy: 190, R: 116, lx: 150, ly: 500, lr: 90, ax: 390, ay: 520, ar: 66, px: 300, pw: 210, lang: 1.6 };
  }
  function clampLens(Gs, a) {
    const c = Math.atan2(Gs.ly - Gs.cy, Gs.lx - Gs.cx);
    const d = Math.atan2(Math.sin(a - c), Math.cos(a - c));
    return c + clamp(d, -1.25, 1.25);
  }
  function lensAnchor(Gs, ang) { return { x: Gs.cx + Math.cos(ang) * Gs.R, y: Gs.cy + Math.sin(ang) * Gs.R }; }
  function drawCrustLens(ctx, x, y, r, t, L) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    circle(ctx, x, y, r + 3); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    const y0 = y - r * 0.36, kmPx = 1.9;
    const sky = ctx.createLinearGradient(0, y - r, 0, y0);
    sky.addColorStop(0, '#8fd0ff'); sky.addColorStop(1, '#dff2ff');
    ctx.fillStyle = sky; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    // 바다 (오른쪽)
    const seaD = 4 * kmPx * 0.9;
    const sg = ctx.createLinearGradient(0, y0, 0, y0 + seaD + 10); sg.addColorStop(0, '#5ec0f2'); sg.addColorStop(1, '#2a77c9');
    ctx.fillStyle = sg; ctx.fillRect(x, y0, r, seaD + 12);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); for (let i = 0; i <= 20; i++) { const px = x + 4 + (r - 4) * i / 20, py = y0 + 1.2 + Math.sin(t * 2.2 + i * 0.9) * 1.4; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
    // 대륙 지각 (왼쪽)
    const cT = 35 * kmPx, oT = 5 * kmPx;
    const patC = tilePattern(ctx, 'crust', 0.55, x, y0), patM = tilePattern(ctx, 'mantle', 0.5, x, y0);
    ctx.beginPath();
    ctx.moveTo(x - r, y0 - 6); ctx.bezierCurveTo(x - r * 0.7, y0 - 16, x - r * 0.5, y0 - 4, x - r * 0.3, y0 - 12); ctx.bezierCurveTo(x - r * 0.15, y0 - 6, x - 6, y0 - 2, x, y0 + 1);
    ctx.lineTo(x, y0 + seaD + 8); ctx.lineTo(x, y0 + cT); ctx.lineTo(x - r, y0 + cT); ctx.closePath();
    ctx.fillStyle = patC || '#9a7650'; ctx.fill();
    // 해양 지각 (오른쪽, 얇음)
    ctx.beginPath(); ctx.rect(x, y0 + seaD + 8, r, oT);
    ctx.fillStyle = '#4a4f5d'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, y0 + seaD + 8, r, 1.5);
    // 맨틀
    ctx.beginPath(); ctx.moveTo(x - r, y0 + cT); ctx.lineTo(x, y0 + cT); ctx.lineTo(x, y0 + seaD + 8 + oT); ctx.lineTo(x + r, y0 + seaD + 8 + oT); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath();
    ctx.fillStyle = patM || '#e0662a'; ctx.fill();
    ctx.strokeStyle = 'rgba(40,16,4,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - r, y0 + cT); ctx.lineTo(x, y0 + cT); ctx.lineTo(x, y0 + seaD + 8 + oT); ctx.lineTo(x + r, y0 + seaD + 8 + oT); ctx.stroke();
    // 두께 표시
    const dim = (xx, ya, yb, txt, tx) => {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xx, ya); ctx.lineTo(xx, yb); ctx.moveTo(xx - 5, ya); ctx.lineTo(xx + 5, ya); ctx.moveTo(xx - 5, yb); ctx.lineTo(xx + 5, yb); ctx.stroke();
      ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(20,10,4,.85)'; ctx.lineWidth = 4; ctx.strokeText(txt, tx, (ya + yb) / 2);
      ctx.fillStyle = '#fff'; ctx.fillText(txt, tx, (ya + yb) / 2);
    };
    dim(x - r * 0.72, y0, y0 + cT, '약 35 km', x - r * 0.72 + 8);
    dim(x + r * 0.3, y0 + seaD + 8, y0 + seaD + 8 + oT, '약 5 km', x + r * 0.3 + 8);
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.stroke();
    // 라벨
    const lab = (txt, lx, ly, col) => pill(ctx, txt, lx, ly, { font: fnt(L, 13, 'bold'), bg: col, h: 22 * L.fs });
    lab('대륙 지각', x - r * 0.52, y + r + 20 * L.fs, 'rgba(154,118,80,.95)');
    lab('해양 지각', x + r * 0.52, y + r + 20 * L.fs, 'rgba(74,79,93,.95)');
  }
  function drawApple(ctx, x, y, r) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    circle(ctx, x, y, r); ctx.fillStyle = '#d9323d'; ctx.fill();
    ctx.restore();
    const fg = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r * 0.93);
    fg.addColorStop(0, '#fffdf0'); fg.addColorStop(1, '#f3e4a6');
    circle(ctx, x, y, r * 0.93); ctx.fillStyle = fg; ctx.fill();
    // 씨방
    ctx.fillStyle = '#e8d08a'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.05, r * 0.2, r * 0.3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6b3b1c'; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(x + s * r * 0.07, y + r * 0.08, r * 0.045, r * 0.1, s * 0.3, 0, TAU); ctx.fill(); });
    // 꼭지와 잎
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + 2, y - r - r * 0.2, x + r * 0.08, y - r - r * 0.34); ctx.stroke();
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.moveTo(x + r * 0.1, y - r - r * 0.22); ctx.quadraticCurveTo(x + r * 0.5, y - r - r * 0.5, x + r * 0.58, y - r - r * 0.2); ctx.quadraticCurveTo(x + r * 0.3, y - r - r * 0.08, x + r * 0.1, y - r - r * 0.22); ctx.fill();
    // 껍질 반짝임
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r - 1.5, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  }
  function drawScaleView(V, t, A) {
    const ctx = V.ctx, L = V.L, Gs = scaleGeo(L), fs = L.fs;
    ctx.save(); ctx.globalAlpha = A;
    // 실제 비율의 지구 단면
    drawGlobeGlow(ctx, Gs.cx, Gs.cy, Gs.R);
    drawDisc(ctx, Gs.cx, Gs.cy, Gs.R, { split: 0, trueScale: true, t });
    // 지각(아주 얇은 띠) 강조
    ctx.beginPath(); ctx.arc(Gs.cx, Gs.cy, Gs.R + 1.5, 0, TAU); ctx.strokeStyle = 'rgba(255,214,150,.95)'; ctx.lineWidth = 2; ctx.stroke();
    const ang = S.lensAng, ap = lensAnchor(Gs, ang);
    // 돋보기 연결 (원뿔)
    const lx = Gs.lx, ly = Gs.ly, lr = Gs.lr;
    const dx = lx - ap.x, dy = ly - ap.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    const half = Math.asin(Math.min(0.99, lr / d));
    ctx.save();
    ctx.beginPath(); ctx.moveTo(ap.x, ap.y);
    const a0 = Math.atan2(dy, dx);
    ctx.lineTo(lx + Math.cos(a0 - Math.PI / 2 - 0.0) * lr * 0.0 + Math.cos(a0 + Math.PI / 2) * lr * 0.98, ly + Math.sin(a0 + Math.PI / 2) * lr * 0.98);
    ctx.lineTo(lx + Math.cos(a0 - Math.PI / 2) * lr * 0.98, ly + Math.sin(a0 - Math.PI / 2) * lr * 0.98);
    ctx.closePath();
    const cg = ctx.createLinearGradient(ap.x, ap.y, lx, ly); cg.addColorStop(0, 'rgba(255,230,170,.0)'); cg.addColorStop(1, 'rgba(255,230,170,.2)');
    ctx.fillStyle = cg; ctx.fill();
    ctx.restore();
    // 돋보기 표시(지구 가장자리)
    circle(ctx, ap.x, ap.y, 11); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    circle(ctx, ap.x, ap.y, 3.2); ctx.fillStyle = '#ffd36b'; ctx.fill();
    if (!S.lensSeen) { ctx.save(); ctx.globalAlpha = A * (0.35 + 0.65 * pulse()); circle(ctx, ap.x, ap.y, 19 + 3 * pulse()); ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
    drawCrustLens(ctx, lx, ly, lr, t, L);
    // 사과 비교
    drawApple(ctx, Gs.ax, Gs.ay, Gs.ar);
    pill(ctx, '사과 껍질', Gs.ax, Gs.ay + Gs.ar + 22 * fs, { font: fnt(L, 14, 'bold'), bg: 'rgba(217,50,61,.92)', h: 24 * fs });
    pill(ctx, '지각 (가장자리의 아주 얇은 띠)', Gs.cx, Gs.cy - Gs.R - 24 * fs, { font: fnt(L, 14, 'bold'), bg: 'rgba(154,118,80,.95)', h: 24 * fs });
    // 오른쪽(또는 아래) 수치 카드
    const cardR = L.key === 'wide' ? { x: Gs.px, y: 80, w: Gs.pw, h: 190 } : { x: Gs.px, y: 76, w: Gs.pw, h: 190 };
    roundRect(ctx, cardR.x, cardR.y, cardR.w, cardR.h, 14); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = fnt(L, 13.5, 'bold'); ctx.fillStyle = 'rgba(232,239,255,.8)';
    ctx.fillText('지구 반지름', cardR.x + 14, cardR.y + 24 * fs);
    ctx.font = dfnt(L, 22); ctx.fillStyle = '#fff'; ctx.fillText('약 6400 km', cardR.x + 14, cardR.y + 50 * fs);
    ctx.font = fnt(L, 13.5, 'bold'); ctx.fillStyle = 'rgba(232,239,255,.8)'; ctx.fillText('지각의 두께', cardR.x + 14, cardR.y + 82 * fs);
    ctx.font = dfnt(L, 22); ctx.fillStyle = '#ffd9a0'; ctx.fillText('약 5 ~ 35 km', cardR.x + 14, cardR.y + 108 * fs);
    ctx.font = fnt(L, 13, '700'); ctx.fillStyle = 'rgba(232,239,255,.72)';
    ctx.fillText('반지름의 1%도 안 돼요', cardR.x + 14, cardR.y + cardR.h - 38 * fs);
    ctx.font = fnt(L, 12.5, '600'); ctx.fillStyle = 'rgba(232,239,255,.55)';
    ctx.fillText('(실제 비율로 그린 단면)', cardR.x + 14, cardR.y + cardR.h - 16 * fs);
    ctx.restore();
  }
  function drawGlobeGlow(ctx, cx, cy, R) {
    const ag = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.22);
    ag.addColorStop(0, 'rgba(255,190,120,.25)'); ag.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = ag; circle(ctx, cx, cy, R * 1.22); ctx.fill();
  }
  function depthGeo(L) {
    if (L.key === 'wide') return { cx: 300, cy: 296, R: 184, rulerX: 84, px: 520, py: 168, pw: 268, ph: 216 };
    return { cx: 280, cy: 250, R: 166, rulerX: 70, px: 10, py: 436, pw: 500, ph: 170 };
  }
  function depthToY(Gd, d) { return Gd.cy - Gd.R + (d / R_EARTH) * Gd.R; }
  function yToDepth(Gd, y) { return clamp((y - (Gd.cy - Gd.R)) / Gd.R * R_EARTH, 0, R_EARTH); }
  function drawDepthView(V, t, A) {
    const ctx = V.ctx, L = V.L, Gd = depthGeo(L), fs = L.fs;
    ctx.save(); ctx.globalAlpha = A;
    drawGlobeGlow(ctx, Gd.cx, Gd.cy, Gd.R);
    drawDisc(ctx, Gd.cx, Gd.cy, Gd.R, { split: 0, trueScale: true, t });
    // 눈금 (층 색 띠)
    const x0 = Gd.rulerX, yTop = Gd.cy - Gd.R, yBot = Gd.cy;
    const segs = [[0, 35, '#9a7650'], [35, 2900, '#e0662a'], [2900, 5100, '#ffb02e'], [5100, 6400, '#ffe48a']];
    segs.forEach((s) => {
      const ya = depthToY(Gd, s[0]), yb = depthToY(Gd, s[1]);
      roundRect(ctx, x0 - 6, ya, 12, Math.max(2, yb - ya), 3); ctx.fillStyle = s[2]; ctx.fill();
    });
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5; ctx.fillStyle = '#e8efff'; ctx.font = fnt(L, 12.5, 'bold'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let d = 0; d <= 6000; d += 1000) {
      const y = depthToY(Gd, d);
      ctx.beginPath(); ctx.moveTo(x0 - 6, y); ctx.lineTo(x0 - 13, y); ctx.stroke();
      if (d % 2000 === 0) ctx.fillText(String(d), x0 - 17, y);
    }
    ctx.font = fnt(L, 12.5, 'bold'); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(232,239,255,.8)';
    ctx.fillText('깊이(km)', x0 - 4, yTop - 16 * fs);
    // 탐사선 줄과 탐사 캡슐
    const py = depthToY(Gd, S.depth);
    ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(Gd.cx, yTop - 8); ctx.lineTo(Gd.cx, py); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 8, py); ctx.lineTo(Gd.cx - 16, py); ctx.stroke();
    const lyr = layerAtDepth(S.depth);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(Gd.cx, py, 0, Gd.cx, py, 34); gg.addColorStop(0, 'rgba(120,230,255,.7)'); gg.addColorStop(1, 'rgba(120,230,255,0)');
    ctx.fillStyle = gg; circle(ctx, Gd.cx, py, 34); ctx.fill(); ctx.restore();
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    roundRect(ctx, Gd.cx - 11, py - 15, 22, 30, 11); ctx.fillStyle = '#e9f1ff'; ctx.fill(); ctx.restore();
    roundRect(ctx, Gd.cx - 11, py - 15, 22, 30, 11); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5; ctx.stroke();
    circle(ctx, Gd.cx, py - 3, 5); ctx.fillStyle = '#38bdf8'; ctx.fill();
    if (!S.depthTouched) { ctx.save(); ctx.globalAlpha = A * (0.35 + 0.65 * pulse()); circle(ctx, Gd.cx, py, 26 + 3 * pulse()); ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
    pill(ctx, '깊이 약 ' + (Math.round(S.depth / 10) * 10).toLocaleString('ko-KR') + ' km', Gd.cx + 26, py - 28 * fs, { font: fnt(L, 14, 'bold'), bg: 'rgba(6,12,34,.86)', align: 'left', stroke: 'rgba(120,230,255,.7)', h: 25 * fs });
    // 읽기 카드
    const c = { x: Gd.px, y: Gd.py, w: Gd.pw, h: Gd.ph };
    roundRect(ctx, c.x, c.y, c.w, c.h, 16); ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.fill();
    ctx.strokeStyle = rgba(lyr.color, 0.9); ctx.lineWidth = 2.4; ctx.stroke();
    roundRect(ctx, c.x + 12, c.y + 14, 14, 54 * fs, 7); ctx.fillStyle = lyr.color; ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = fnt(L, 13.5, 'bold'); ctx.fillStyle = 'rgba(232,239,255,.8)'; ctx.fillText('이 깊이에서 만나는 층', c.x + 36, c.y + 24 * fs);
    ctx.font = dfnt(L, 32); ctx.fillStyle = '#fff'; ctx.fillText(lyr.name, c.x + 36, c.y + 56 * fs);
    const nw = ctx.measureText(lyr.name).width;
    stateChip(ctx, L, c.x + 36 + nw + 12, c.y + 56 * fs, lyr.state, { size: 15 });
    ctx.font = fnt(L, 14.5, 'bold'); ctx.fillStyle = '#ffe9b8'; ctx.fillText('깊이 ' + lyr.depth, c.x + 16, c.y + 100 * fs);
    ctx.font = fnt(L, 13.5, '600'); ctx.fillStyle = 'rgba(232,239,255,.85)';
    drawWrapped(ctx, lyr.note, c.x + 16, c.y + 126 * fs, c.w - 30, 18 * fs, 3);
    ctx.restore();
  }

  /* =========================================================
     3~4단계 화면 합치기
     ========================================================= */
  function lerpPt(a, b, k) { return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
  function layerAnchor(id, G) {
    const fa = faceAnchor(id, G.cx, G.cy, G.R);
    const da = discAnchor(id, G.cx, G.cy, G.R, S.split, -38 * DEG);
    return lerpPt(fa, da, clamp(S.vis.disc, 0, 1));
  }
  function infoPanel(V, G, A) {
    if (A < 0.01) return;
    const ctx = V.ctx, L = V.L, fs = L.fs;
    const r = G.wide ? { x: G.rowsX, y: 120, w: G.rowW, h: 260 } : { x: 10, y: 446, w: 500, h: 160 };
    ctx.save(); ctx.globalAlpha = A;
    roundRect(ctx, r.x, r.y, r.w, r.h, 16); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = dfnt(L, 26); ctx.fillStyle = '#fff'; ctx.fillText('🌍 지구 속은?', r.x + 18, r.y + 34 * fs);
    ctx.font = fnt(L, 15.5, '600'); ctx.fillStyle = 'rgba(232,239,255,.92)';
    const lines = FEAT.has('cut') || (game && game.free) ? ['겉에서는 땅과 바다만 보여요.', '지구를 잘라서 속을 들여다볼까요?', '✂️ 단면 버튼을 눌러 봐요!'] : ['지구의 겉모습이에요.', '끌어서 돌려 볼 수 있어요.'];
    lines.forEach((ln, i) => ctx.fillText(ln, r.x + 18, r.y + (74 + i * 30) * fs));
    ctx.restore();
  }
  function drawEarth(V, t) {
    const ctx = V.ctx, L = V.L, G = earthGeo(L), v = S.vis, fs = L.fs;
    spacePanel(ctx, G.M, V.stars.earth, t);
    const hintLayer = (!S.focus && S.seen.size < 4 && game && game.phase === 'active' && game.index === 5 && S.cut > 0.9) ? LAYERS[Math.floor(t * 0.9) % 4].id : null;
    const hintA = hintLayer ? Math.sin((t * 0.9 % 1) * Math.PI) : 0;
    S._hintLayer = hintLayer; S._hintA = hintA;
    drawCutGlobe(V, G, t, v.globe);
    if (v.disc > 0.01) drawDisc(ctx, G.cx, G.cy, G.R, { split: S.split, alpha: v.disc, focus: S.focus, t, hintLayer, hintA });
    if (v.scale > 0.01) drawScaleView(V, t, v.scale);
    if (v.depth > 0.01) drawDepthView(V, t, v.depth);
    // 지구 이름표 (겉모습일 때)
    const rowsA = clamp(S.cut, 0, 1) * Math.max(v.globe, v.disc);
    infoPanel(V, G, v.globe * (1 - clamp(S.cut, 0, 1)));
    if (rowsA > 0.01) {
      ctx.save(); ctx.globalAlpha = rowsA;
      LAYERS.forEach((l, i) => {
        const r = G.rows[i];
        const found = S.seen.has(l.id) || S.slotMode || (game && game.free);
        const filled = S.slots[l.id];
        const born = S.slotBorn['row' + l.id];
        let shake = 0;
        if (S.slotShake[l.id]) { const k = (nowS() - S.slotShake[l.id]) / 0.45; if (k < 1) shake = k; }
        drawRow(V, r, l, { found, sel: S.focus === l.id, slot: S.slotMode, filled: !!filled, over: S.cardDrag && S.cardDrag.over === l.id, shake, hot: false });
        // 이름표 선: 그림 속 층 → 이름표
        if (G.wide && found && !S.slotMode || (G.wide && S.slotMode)) {
          const a = layerAnchor(l.id, G);
          const ex = r.x - 6, ey = r.y + r.h / 2;
          ctx.strokeStyle = 'rgba(255,255,255,' + (S.focus === l.id ? 0.95 : 0.55) + ')'; ctx.lineWidth = S.focus === l.id ? 2 : 1.4;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ex - 20, ey); ctx.lineTo(ex, ey); ctx.stroke();
          circle(ctx, a.x, a.y, 4.5); ctx.fillStyle = '#fff'; ctx.fill(); circle(ctx, a.x, a.y, 7.5); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
        }
      });
      ctx.restore();
    }
    // 아래 안내 띠 / 카드 놓는 곳
    const T = G.T;
    if (S.slotMode && rowsA > 0.5) {
      // 카드
      const dt = V.dt || 0.016;
      CARD_ORDER.forEach((id) => {
        const tg = cardTarget(V, G, id);
        let c = V.cards[id];
        if (!c) { const h = cardHome(G, id); c = V.cards[id] = { x: h.x + h.w / 2, y: h.y + h.h / 2, vx: 0, vy: 0, w: h.w, h: h.h }; }
        if (tg.drag) { c.x = approach(c.x, tg.x, dt, 40); c.y = approach(c.y, tg.y, dt, 40); c.vx = c.vy = 0; }
        else springTo(c, tg.x, tg.y, dt, 230, 20);
        c.w = approach(c.w, tg.w, dt, 15); c.h = approach(c.h, tg.h, dt, 15);
      });
      // 칸에 붙은 카드 먼저, 끄는 카드는 맨 위
      const ids = CARD_ORDER.slice().sort((a, b) => (S.cardDrag && S.cardDrag.id === a ? 1 : 0) - (S.cardDrag && S.cardDrag.id === b ? 1 : 0));
      // 처음 자리에 칸 윤곽(빈자리) 그리기
      CARD_ORDER.forEach((id) => { const h = cardHome(G, id); roundRect(ctx, h.x, h.y, h.w, h.h, 12); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]); });
      ids.forEach((id) => {
        const c = V.cards[id];
        const bad = S.flagSlots.has(id) && Object.keys(S.slots).some((k) => S.slots[k] === id);
        let sh = 0; const sk = Object.keys(S.slots).find((k) => S.slots[k] === id);
        if (sk && S.slotShake[sk]) { const k = (nowS() - S.slotShake[sk]) / 0.45; if (k < 1) sh = k; }
        const cc = Object.assign({}, c); if (sh) cc.x += Math.sin(sh * 40) * 5 * (1 - sh);
        drawCardFace(ctx, L, cc, LY[id], { drag: S.cardDrag && S.cardDrag.id === id, sel: S.cardSel === id, bad });
      });
    } else if (T) {
      const bar = { x: T.x + 20, y: T.y + 2, w: T.w - 40, h: G.wide ? T.h - 4 : 72 };
      hintBar(ctx, L, bar, S.note || '', { alpha: 1 });
    }
  }

  /* =========================================================
     1단계 화면: 풍경과 다섯 권역 바구니
     ========================================================= */
  function drawCloudShape(ctx, x, y, s, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(40,80,140,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
    const g = ctx.createLinearGradient(0, -34, 0, 24); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d9e8f8');
    ctx.fillStyle = g;
    ctx.beginPath();
    [[-34, 4, 17], [-14, -10, 23], [14, -8, 21], [36, 4, 17], [0, 6, 22]].forEach((c) => { ctx.moveTo(c[0] + c[2], c[1]); ctx.arc(c[0], c[1], c[2], 0, TAU); });
    ctx.moveTo(-34, 4); ctx.rect(-34, 4, 70, 19);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-12, -18, 11, 5, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawMoonShape(ctx, x, y, r) {
    ctx.save();
    const gl = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.2); gl.addColorStop(0, 'rgba(255,253,235,.45)'); gl.addColorStop(1, 'rgba(255,253,235,0)');
    ctx.fillStyle = gl; circle(ctx, x, y, r * 2.2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#fffef4'); g.addColorStop(1, '#d9dcc9'); ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = 'rgba(150,152,130,.28)';
    [[-0.3, -0.2, 0.2], [0.25, 0.1, 0.26], [-0.1, 0.4, 0.14], [0.4, -0.4, 0.1]].forEach((c) => { ctx.beginPath(); ctx.arc(x + c[0] * r, y + c[1] * r, c[2] * r, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  function drawMountainShape(ctx, x, base, w, h, t) {
    const X = (u) => x + u * w, Y = (v) => base - v * h;
    ctx.save();
    // 뒤쪽 봉우리
    ctx.fillStyle = '#9aa7b8';
    ctx.beginPath(); ctx.moveTo(X(-0.56), Y(0)); ctx.lineTo(X(-0.36), Y(0.5)); ctx.lineTo(X(-0.26), Y(0.42)); ctx.lineTo(X(-0.12), Y(0.62)); ctx.lineTo(X(0.12), Y(0)); ctx.closePath(); ctx.fill();
    // 몸통
    const g = ctx.createLinearGradient(X(-0.5), 0, X(0.5), 0);
    g.addColorStop(0, '#b3a69a'); g.addColorStop(0.5, '#8d8077'); g.addColorStop(1, '#64585a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(-0.5), Y(0)); ctx.lineTo(X(-0.3), Y(0.36)); ctx.lineTo(X(-0.2), Y(0.3)); ctx.lineTo(X(-0.07), Y(0.72)); ctx.lineTo(X(0), Y(1)); ctx.lineTo(X(0.09), Y(0.8)); ctx.lineTo(X(0.17), Y(0.58)); ctx.lineTo(X(0.27), Y(0.64)); ctx.lineTo(X(0.5), Y(0)); ctx.closePath(); ctx.fill();
    // 그늘진 오른쪽 면
    ctx.fillStyle = 'rgba(30,20,40,.25)';
    ctx.beginPath(); ctx.moveTo(X(0), Y(1)); ctx.lineTo(X(0.09), Y(0.8)); ctx.lineTo(X(0.17), Y(0.58)); ctx.lineTo(X(0.27), Y(0.64)); ctx.lineTo(X(0.5), Y(0)); ctx.lineTo(X(0.08), Y(0)); ctx.lineTo(X(0.02), Y(0.45)); ctx.closePath(); ctx.fill();
    // 능선 줄
    ctx.strokeStyle = 'rgba(50,38,34,.35)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    [[0, 1, 0.02, 0.45, 0.1, 0.1], [-0.07, 0.72, -0.14, 0.4, -0.2, 0.12], [0.17, 0.58, 0.2, 0.34, 0.3, 0.08]].forEach((c) => { ctx.beginPath(); ctx.moveTo(X(c[0]), Y(c[1])); ctx.quadraticCurveTo(X(c[2]), Y(c[3]), X(c[4]), Y(c[5])); ctx.stroke(); });
    // 눈
    ctx.fillStyle = '#fbfdff';
    ctx.beginPath(); ctx.moveTo(X(-0.07), Y(0.72)); ctx.lineTo(X(0), Y(1)); ctx.lineTo(X(0.09), Y(0.8)); ctx.lineTo(X(0.07), Y(0.74)); ctx.lineTo(X(0.04), Y(0.79)); ctx.lineTo(X(0.0), Y(0.7)); ctx.lineTo(X(-0.03), Y(0.77)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(130,160,210,.35)';
    ctx.beginPath(); ctx.moveTo(X(0), Y(1)); ctx.lineTo(X(0.09), Y(0.8)); ctx.lineTo(X(0.07), Y(0.74)); ctx.lineTo(X(0.03), Y(0.79)); ctx.closePath(); ctx.fill();
    // 숲
    for (let i = 0; i < 16; i++) {
      const u = -0.48 + i * 0.062 + ((i * 7) % 3) * 0.012, hh = h * (0.045 + ((i * 5) % 4) * 0.008);
      const tx = X(u), ty = base - (Math.abs(u) < 0.2 ? 0 : 2);
      ctx.fillStyle = i % 2 ? '#2f7d4a' : '#3b8f55';
      ctx.beginPath(); ctx.moveTo(tx, ty - hh * 2.2); ctx.lineTo(tx - hh * 0.8, ty); ctx.lineTo(tx + hh * 0.8, ty); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawSeaShape(ctx, x0, y0, x1, y1, t) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#5db6ef'); g.addColorStop(0.35, '#2f86d8'); g.addColorStop(1, '#1b5fae');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    for (let i = 0; i < 7; i++) {
      const yy = y0 + 10 + (y1 - y0 - 14) * (i / 6) ** 1.2, amp = 1.5 + i * 0.5, len = 36 + i * 9;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.16 + i * 0.03) + ')'; ctx.lineWidth = 1.5 + i * 0.25;
      ctx.beginPath();
      for (let x = x0; x <= x1 + 6; x += 6) { const y = yy + Math.sin((x / len) * TAU + t * (0.8 + i * 0.1) + i) * amp; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // 반짝임
    for (let i = 0; i < 9; i++) {
      const sx = x0 + ((i * 97) % 100) / 100 * (x1 - x0), sy = y0 + 6 + ((i * 61) % 100) / 100 * (y1 - y0 - 10), a = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * a) + ')'; ctx.fillRect(sx, sy, 7, 1.6);
    }
    ctx.restore();
  }
  function drawTreeShape(ctx, x, base, h, t) {
    const sway = RM ? 0 : Math.sin(t * 1.1) * 0.02;
    ctx.save();
    ctx.fillStyle = 'rgba(0,50,10,.22)'; ctx.beginPath(); ctx.ellipse(x + 6, base, h * 0.34, h * 0.06, 0, 0, TAU); ctx.fill();
    const tg = ctx.createLinearGradient(x - h * 0.06, 0, x + h * 0.06, 0); tg.addColorStop(0, '#9a6a3d'); tg.addColorStop(1, '#6b4426');
    ctx.fillStyle = tg; roundRect(ctx, x - h * 0.055, base - h * 0.42, h * 0.11, h * 0.42, 4); ctx.fill();
    ctx.translate(x, base - h * 0.4); ctx.rotate(sway);
    const blobs = [[-0.2, -0.2, 0.26], [0.2, -0.2, 0.26], [0, -0.42, 0.3], [-0.12, -0.05, 0.24], [0.16, -0.05, 0.24]];
    blobs.forEach((b, i) => {
      const bx = b[0] * h, by = b[1] * h, br = b[2] * h;
      const g = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br);
      g.addColorStop(0, i % 2 ? '#7bd36a' : '#8fe07a'); g.addColorStop(1, '#2f8f48');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(-h * 0.12, -h * 0.5, h * 0.09, h * 0.045, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawPersonShape(ctx, x, base, h, t) {
    const u = h / 100, wave = RM ? 0 : Math.sin(t * 3.2) * 0.35;
    ctx.save(); ctx.translate(x, base); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(0,50,10,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 22 * u, 5 * u, 0, 0, TAU); ctx.fill();
    // 다리
    ctx.strokeStyle = '#34478f'; ctx.lineWidth = 9 * u;
    ctx.beginPath(); ctx.moveTo(-7 * u, -38 * u); ctx.lineTo(-8 * u, -8 * u); ctx.moveTo(7 * u, -38 * u); ctx.lineTo(8 * u, -8 * u); ctx.stroke();
    ctx.fillStyle = '#2b3445'; roundRect(ctx, -15 * u, -9 * u, 14 * u, 8 * u, 4 * u); ctx.fill(); roundRect(ctx, 1 * u, -9 * u, 14 * u, 8 * u, 4 * u); ctx.fill();
    // 팔
    ctx.strokeStyle = '#f6c7a1'; ctx.lineWidth = 7 * u;
    ctx.beginPath(); ctx.moveTo(-15 * u, -66 * u); ctx.lineTo(-22 * u, -44 * u); ctx.stroke();
    ctx.save(); ctx.translate(15 * u, -66 * u); ctx.rotate(-0.4 - wave); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8 * u, -22 * u); ctx.stroke();
    ctx.fillStyle = '#f6c7a1'; ctx.beginPath(); ctx.arc(8 * u, -24 * u, 5 * u, 0, TAU); ctx.fill(); ctx.restore();
    // 몸
    const sg = ctx.createLinearGradient(-16 * u, 0, 16 * u, 0); sg.addColorStop(0, '#f0675f'); sg.addColorStop(1, '#d94841');
    ctx.fillStyle = sg; roundRect(ctx, -17 * u, -72 * u, 34 * u, 38 * u, 11 * u); ctx.fill();
    // 머리
    ctx.fillStyle = '#f9d3b0'; ctx.beginPath(); ctx.arc(0, -86 * u, 15 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a3226'; ctx.beginPath(); ctx.arc(0, -90 * u, 15.5 * u, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(8 * u, -96 * u, 0, -93 * u); ctx.quadraticCurveTo(-8 * u, -96 * u, -15.4 * u, -88 * u); ctx.fill();
    ctx.fillStyle = '#2b3445'; ctx.beginPath(); ctx.arc(-5 * u, -85 * u, 1.8 * u, 0, TAU); ctx.arc(5 * u, -85 * u, 1.8 * u, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c4574a'; ctx.lineWidth = 1.8 * u; ctx.beginPath(); ctx.arc(0, -82 * u, 5 * u, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();
  }
  function itemShape(id, ctx, it, t, L) {
    if (id === 'mountain') drawMountainShape(ctx, it.cx, it.base, it.w, it.h, t);
    else if (id === 'tree') drawTreeShape(ctx, it.cx, it.base, it.h, t);
    else if (id === 'person') drawPersonShape(ctx, it.cx, it.base, it.h, t);
  }
  function drawLand(V, t) {
    const ctx = V.ctx, L = V.L, G = landGeo(L), P = G.P, it = G.it, fs = L.fs;
    ctx.save();
    roundRect(ctx, P.x, P.y, P.w, P.h, 16); ctx.clip();
    // 하늘
    const sky = ctx.createLinearGradient(0, P.y, 0, P.y + P.h * 0.62);
    sky.addColorStop(0, '#4aa3ee'); sky.addColorStop(1, '#cfeaff');
    ctx.fillStyle = sky; ctx.fillRect(P.x, P.y, P.w, P.h);
    const sun = ctx.createRadialGradient(P.x + 20, P.y + 6, 0, P.x + 20, P.y + 6, P.w * 0.5);
    sun.addColorStop(0, 'rgba(255,248,214,.75)'); sun.addColorStop(1, 'rgba(255,248,214,0)');
    ctx.fillStyle = sun; ctx.fillRect(P.x, P.y, P.w, P.h);
    // 달 (낮에도 보이는 희미한 달)
    ctx.save(); ctx.globalAlpha = 0.92; drawMoonShape(ctx, it.moon.cx, it.moon.cy, it.moon.r); ctx.restore();
    // 먼 산
    const hz = P.y + P.h * 0.52;
    ctx.fillStyle = '#a5c3e3';
    ctx.beginPath(); ctx.moveTo(P.x, P.y + P.h * 0.8); ctx.lineTo(P.x, P.y + P.h * 0.6);
    [[0.08, 0.5], [0.15, 0.58], [0.34, 0.44], [0.46, 0.56], [0.58, 0.5]].forEach((c) => ctx.lineTo(P.x + P.w * c[0], P.y + P.h * c[1]));
    ctx.lineTo(P.x + P.w * 0.64, P.y + P.h * 0.8); ctx.closePath(); ctx.fill();
    // 바다
    const sea = it.sea;
    drawSeaShape(ctx, sea.cx - sea.hw, sea.cy - sea.hh, sea.cx + sea.hw + 2, sea.cy + sea.hh, t);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(sea.cx - sea.hw, sea.cy - sea.hh, sea.hw * 2 + 2, 2);
    // 구름
    const cl = it.cloud, drift = RM ? 0 : Math.sin(t * 0.28) * 16;
    drawCloudShape(ctx, cl.cx + drift, cl.cy, cl.s, 1);
    drawCloudShape(ctx, P.x + P.w * 0.56 + drift * 0.6, P.y + P.h * 0.13, 0.8, 0.9);
    drawCloudShape(ctx, P.x + P.w * 0.7 - drift * 0.5, P.y + P.h * 0.3, 0.62, 0.8);
    // 산
    itemShape('mountain', ctx, it.mountain, t, L);
    // 풀밭
    const gy = P.y + P.h * 0.79;
    const gg = ctx.createLinearGradient(0, gy - 10, 0, P.y + P.h);
    gg.addColorStop(0, '#8fd36f'); gg.addColorStop(0.35, '#5fb85a'); gg.addColorStop(1, '#3f9a4b');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.moveTo(P.x, P.y + P.h);
    ctx.lineTo(P.x, gy + 4);
    for (let i = 0; i <= 20; i++) { const x = P.x + P.w * i / 20; ctx.lineTo(x, gy + Math.sin(i * 0.9 + 1) * 5 - (x > sea.cx - sea.hw - 30 ? 4 : 0) + 3); }
    ctx.lineTo(P.x + P.w, P.y + P.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(P.x, gy + 8, P.w, 2);
    for (let i = 0; i < 24; i++) {
      const fx = P.x + ((i * 53) % 100) / 100 * P.w, fy = gy + 18 + ((i * 37) % 100) / 100 * (P.h * 0.19);
      ctx.fillStyle = ['#ffffff', '#ffd54a', '#ff9bb5'][i % 3]; ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, TAU); ctx.fill();
    }
    itemShape('tree', ctx, it.tree, t, L);
    itemShape('person', ctx, it.person, t, L);
    ctx.restore();
    roundRect(ctx, P.x, P.y, P.w, P.h, 16); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();

    // 물체 표시: 눌러 볼 수 있어요(맥박) / 선택 / 분류됨(이름표)
    ITEMS.forEach((m) => {
      const h = it[m.id], selected = S.sel === m.id, dragging = S.drag && S.drag.id === m.id && S.drag.moved, asg = S.assign[m.id];
      const bx = h.cx - h.hw, by = h.cy - h.hh, bw = h.hw * 2, bh = h.hh * 2;
      let shake = 0;
      if (S.shakeAt[m.id]) { const k = (nowS() - S.shakeAt[m.id]) / 0.5; if (k < 1) shake = k; }
      ctx.save();
      if (shake) ctx.translate(Math.sin(shake * 38) * 6 * (1 - shake), 0);
      if (selected || dragging) {
        ctx.setLineDash([7, 5]); ctx.lineDashOffset = -nowS() * 24; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        roundRect(ctx, bx - 4, by - 4, bw + 8, bh + 8, 14); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,.14)'; roundRect(ctx, bx - 4, by - 4, bw + 8, bh + 8, 14); ctx.fill();
      } else if (S.hoverItem === m.id) {
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.4; roundRect(ctx, bx - 3, by - 3, bw + 6, bh + 6, 13); ctx.stroke();
      } else if (!asg && S.pulseItems) {
        const k = (nowS() * 0.9 + (m.id.length * 0.13)) % 1;
        ctx.fillStyle = 'rgba(255,255,255,.9)'; circle(ctx, h.cx, h.cy, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * (1 - k)) + ')'; ctx.lineWidth = 3; circle(ctx, h.cx, h.cy, 8 + k * 20); ctx.stroke();
      }
      const flag = S.flagged.has(m.id);
      if (asg) {
        const sp = SP[asg];
        pill(ctx, (flag ? '🤔 ' : '') + sp.name, h.cx, by - 14 * fs + (m.id === 'cloud' ? 6 : 0), { font: fnt(L, 14, 'bold'), bg: flag ? 'rgba(226,70,75,.95)' : rgba(sp.color, 0.95), h: 24 * fs });
      }
      ctx.restore();
    });

    // 안내 말풍선
    let msg = S.tip && nowS() - S.tip.t0 < 3.2 ? S.tip.text : null;
    const cm = game && game.current(), interactive = isFree() || !cm || cm.manual;
    if (!msg && !interactive) msg = '지구계의 다섯 권역으로 분류한 모습이에요';
    if (!msg) {
      const n = Object.keys(S.assign).length;
      if (S.sel) msg = '‘' + IT[S.sel].name + '’은(는) 어느 권역일까요? 아래 권역을 눌러요';
      else if (!n) msg = '그림 속 물체를 눌러서 알맞은 권역에 담아요';
      else if (n < ITEMS.length) msg = '다음 물체를 눌러 보세요 (' + n + ' / ' + ITEMS.length + ')';
      else msg = '모두 담았어요! ✔ 확인하기를 눌러요';
    }
    pill(ctx, msg, P.x + P.w / 2, P.y + 24 * fs, { font: fnt(L, 14.5, 'bold'), bg: 'rgba(8,16,40,.78)', h: 28 * fs, pad: 14 });

    // 권역 바구니
    const hov = S.hoverBin;
    SPHERES.forEach((sp, bi) => {
      const b = G.bins[bi], on = S.sel || (S.drag && S.drag.moved), hot = hov === bi && on;
      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.h, 14);
      ctx.fillStyle = rgba(sp.color, hot ? 0.5 : 0.2); ctx.fill();
      ctx.strokeStyle = rgba(sp.color, on ? 0.65 + 0.35 * pulse() : 0.7); ctx.lineWidth = hot ? 4 : on ? 3 : 2; ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = Math.round(24 * fs) + 'px ' + FONT; ctx.fillStyle = '#fff';
      ctx.fillText(sp.emoji, b.x + 10, b.y + 24 * fs);
      ctx.font = dfnt(L, 21); ctx.fillStyle = '#fff';
      ctx.fillText(sp.name, b.x + 12 + 30 * fs, b.y + 25 * fs);
      ctx.font = fnt(L, 12.5, '600'); ctx.fillStyle = 'rgba(232,239,255,.88)';
      ctx.textBaseline = 'alphabetic';
      drawWrapped(ctx, sp.desc, b.x + 10, b.y + 54 * fs, b.w - 18, 16 * fs, 2);
      ctx.restore();
    });
    // 담긴 물체 (칩)
    ITEMS.forEach((m) => {
      const tk = V.tok[m.id];
      if (!tk || tk.vis < 0.02) return;
      drawChip(ctx, L, tk.x, tk.y, m, { vis: tk.vis, scale: tk.scale, drag: tk.drag, color: S.assign[m.id] ? SP[S.assign[m.id]].color : '#fff', bad: S.flagged.has(m.id) });
    });
    ctx.restore();
  }
  function chipSize(ctx, L, m) {
    ctx.font = fnt(L, 14, 'bold');
    return { w: ctx.measureText(m.emoji + ' ' + m.name).width + 18 * L.fs, h: 25 * L.fs };
  }
  function drawChip(ctx, L, x, y, m, o) {
    o = o || {};
    const sz = chipSize(ctx, L, m), sc = o.scale || 1;
    ctx.save(); ctx.globalAlpha *= o.vis != null ? o.vis : 1; ctx.translate(x, y); ctx.scale(sc, sc);
    if (o.drag) { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8; }
    roundRect(ctx, -sz.w / 2, -sz.h / 2, sz.w, sz.h, sz.h / 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = o.bad ? '#e2464b' : o.color || '#fff'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.fillStyle = '#1f2a44'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(m.emoji + ' ' + m.name, 0, 1);
    ctx.restore();
  }
  // 바구니 안 칩 자리
  function chipSlot(G, L, bi, k) {
    const b = G.bins[bi], col = k % 2, row = Math.floor(k / 2), cw = (b.w - 16) / 2;
    return { x: b.x + 8 + cw / 2 + col * cw, y: b.y + b.h - 8 - 13 * L.fs - row * 29 * L.fs };
  }

  /* =========================================================
     2단계 화면: 다섯 권역이 서로 영향을 주고받아요
     ========================================================= */
  function qbez(a, c, b, u) { const v = 1 - u; return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y }; }
  function linkCurve(G, A, B) {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const a = { x: A.x + ux * (A.r + 5), y: A.y + uy * (A.r + 5) }, b = { x: B.x - ux * (B.r + 9), y: B.y - uy * (B.r + 9) };
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    let nx = -uy, ny = ux;
    if ((mx - G.cx) * nx + (my - G.cy) * ny < 0) { nx = -nx; ny = -ny; }
    const dc = Math.hypot(mx - G.cx, my - G.cy);
    const k = 0.12 * d + Math.max(0, 2 * (G.globeR + 30 - dc));
    return { a, b, c: { x: mx + nx * k, y: my + ny * k } };
  }
  function drawLinkArrow(ctx, cur, o) {
    const prog = o.prog != null ? o.prog : 1, col = o.color || '#ffd36b';
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba('#000000', 0.25); ctx.lineWidth = 7;
    const path = () => { ctx.beginPath(); for (let i = 0; i <= 28; i++) { const p = qbez(cur.a, cur.c, cur.b, prog * i / 28); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); } };
    path(); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 4; path(); ctx.stroke();
    // 흐르는 점
    if (prog >= 1) {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const u = ((o.t * 0.42 + i / n) % 1), p = qbez(cur.a, cur.c, cur.b, u);
        const fade = Math.sin(u * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.65 * fade) + ')'; circle(ctx, p.x, p.y, 3 + 1.6 * fade); ctx.fill();
      }
    }
    // 화살촉
    if (prog > 0.96) {
      const e = qbez(cur.a, cur.c, cur.b, 1), q = qbez(cur.a, cur.c, cur.b, 0.93);
      const ang = Math.atan2(e.y - q.y, e.x - q.x), hs = 15;
      ctx.translate(e.x, e.y); ctx.rotate(ang);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-hs, -hs * 0.62); ctx.lineTo(-hs * 0.65, 0); ctx.lineTo(-hs, hs * 0.62); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawNode(V, nd, sp, o) {
    const ctx = V.ctx, L = V.L, fs = L.fs;
    const r = nd.r * (o.pop || 1);
    ctx.save();
    if (o.active) {
      ctx.strokeStyle = 'rgba(94,234,212,' + (0.5 + 0.5 * pulse()) + ')'; ctx.lineWidth = 4; circle(ctx, nd.x, nd.y, r + 7 + 2 * pulse()); ctx.stroke();
    }
    const gl = ctx.createRadialGradient(nd.x, nd.y, r * 0.7, nd.x, nd.y, r * 1.7);
    gl.addColorStop(0, rgba(sp.color, 0.4)); gl.addColorStop(1, rgba(sp.color, 0));
    ctx.fillStyle = gl; circle(ctx, nd.x, nd.y, r * 1.7); ctx.fill();
    V.D.sphere(nd.x, nd.y, r, sp.color, { shadow: true, outline: 'rgba(255,255,255,.55)', outlineWidth: 2 });
    ctx.font = Math.round(r * 0.95) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText(sp.emoji, nd.x, nd.y + 2);
    ctx.restore();
    pill(ctx, sp.name, nd.x, nd.y + r + 17 * fs, { font: fnt(L, 15, 'bold'), bg: rgba(sp.color, 0.92), h: 25 * fs });
  }
  function drawWeb(V, t) {
    const ctx = V.ctx, L = V.L, G = webGeo(L), fs = L.fs, dt = V.dt || 0.016;
    spacePanel(ctx, G.M, V.stars.web, t);
    // 가운데 지구
    drawGlobe(ctx, G.cx, G.cy, G.globeR, S.spin, S.cloudSpin);
    pill(ctx, '지구계', G.cx, G.cy + G.globeR + 20 * fs, { font: fnt(L, 14, 'bold'), bg: 'rgba(255,255,255,.18)', h: 24 * fs });
    const NI = {}; G.nodes.forEach((n, i) => (NI[n.id] = n));
    // 완성된 연결
    CASES.forEach((c) => {
      const lk = S.links[c.id]; if (!lk) return;
      const cur = linkCurve(G, NI[lk.a], NI[lk.b]);
      const born = S.linkBorn[c.id] || 0, prog = RM ? 1 : clamp((nowS() - born) / 0.55, 0, 1);
      let sh = 0; if (S.linkShake[c.id]) { const k = (nowS() - S.linkShake[c.id]) / 0.5; if (k < 1) sh = k; }
      const bad = S.flagLinks.has(c.id);
      ctx.save(); if (sh) ctx.translate(Math.sin(sh * 40) * 5 * (1 - sh), 0);
      drawLinkArrow(ctx, cur, { prog: EZ.outCubic(prog), t, color: bad ? '#ff6b6b' : '#ffd36b' });
      if (prog >= 1) {
        const mp = qbez(cur.a, cur.c, cur.b, 0.5);
        pill(ctx, c.emoji + ' ' + c.short, mp.x, mp.y, { font: fnt(L, 13.5, 'bold'), bg: bad ? 'rgba(226,70,75,.95)' : 'rgba(10,18,44,.9)', stroke: bad ? '#fff' : '#ffd36b', h: 24 * fs });
      }
      ctx.restore();
    });
    // 끄는 선
    if (S.linkDrag && S.linkDrag.moved) {
      const A = G.nodes[S.linkDrag.from], p = S.linkDrag;
      ctx.save(); ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore();
    }
    // 권역 (노드)
    G.nodes.forEach((nd, i) => {
      const sp = SP[nd.id];
      const active = S.linkFrom === i || (S.linkDrag && S.linkDrag.from === i) || (S.hoverNode === i && (S.linkFrom != null || (S.linkDrag && S.linkDrag.moved)));
      drawNode(V, nd, sp, { active, pop: 1 + (S.hoverNode === i ? 0.06 : 0) });
    });
    // 위쪽 안내
    const cs = CS[S.caseSel];
    let msg;
    const nL = Object.keys(S.links).length;
    if (S.linkFrom != null) msg = '‘' + SP[G.nodes[S.linkFrom].id].name + '’에서 시작! 영향을 받는 권역을 눌러요';
    else if (cs && !S.links[cs.id]) msg = '‘' + cs.short + '’: 어느 권역과 어느 권역일까요? 차례로 눌러요';
    else if (nL < CASES.length) msg = '다음 카드를 골라 연결해 보세요 (' + nL + ' / ' + CASES.length + ')';
    else msg = '카드를 모두 연결했어요! ✔ 확인하기를 눌러요';
    if (S.tip && nowS() - S.tip.t0 < 3) msg = S.tip.text;
    { const cm = game && game.current(); if (!isFree() && cm && !cm.manual) msg = '권역들은 서로 영향을 주고받아요'; }
    pill(ctx, msg, G.M.x + G.M.w / 2, G.M.y + 26 * fs, { font: fnt(L, 14.5, 'bold'), bg: 'rgba(8,16,40,.82)', h: 28 * fs, pad: 14, stroke: 'rgba(160,190,255,.35)' });
    // 사례 카드
    CASES.forEach((c, i) => {
      const r = G.cards[i], lk = S.links[c.id], sel = S.caseSel === c.id, bad = S.flagLinks.has(c.id);
      ctx.save();
      const lift = sel ? -3 : 0;
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = sel ? 14 : 6; ctx.shadowOffsetY = sel ? 6 : 2;
      roundRect(ctx, r.x, r.y + lift, r.w, r.h, 13); ctx.fillStyle = sel ? '#ffffff' : '#eef3fc'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = bad ? '#ef4444' : sel ? '#38bdf8' : lk ? '#9bb3d9' : '#c6d3ee'; ctx.lineWidth = sel || bad ? 3.2 : 1.6; ctx.stroke();
      ctx.font = Math.round(30 * fs) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(c.emoji, r.x + 10, r.y + lift + 30 * fs);
      ctx.fillStyle = '#1f2a44'; ctx.font = fnt(L, 13.5, 'bold'); ctx.textBaseline = 'top';
      const tx = r.x + 10 + 40 * fs;
      drawWrapped(ctx, c.text, tx, r.y + lift + 11 * fs, r.w - (tx - r.x) - 8, 17 * fs, 3);
      ctx.textBaseline = 'middle';
      if (lk) {
        ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = bad ? '#dc2626' : '#0f766e';
        ctx.fillText('🔗 ' + SP[lk.a].name + ' → ' + SP[lk.b].name, r.x + 12, r.y + lift + r.h - 14 * fs);
      } else { ctx.font = fnt(L, 12.5, '600'); ctx.fillStyle = '#7a869c'; ctx.fillText(sel ? '👆 두 권역을 눌러요' : '연결 안 됨', r.x + 12, r.y + lift + r.h - 14 * fs); }
      ctx.restore();
    });
  }

  /* =========================================================
     화면 만들기 · 입력
     ========================================================= */
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: FRAME });
    const V = { v, L, ctx: v.ctx, fx: [], P: new SciSim.Particles(), D: SciSim.draw(v.ctx), tok: {}, cards: {}, dt: 0.016 };
    V.stars = { earth: makeStars(earthGeo(L).M, 90, 7), web: makeStars(webGeo(L).M, 80, 11) };
    return V;
  });
  const activeView = () => views.find((V) => V.v.canvas.offsetWidth > 0) || views[0];
  const inRect = (p, r, pad) => p.x >= r.x - (pad || 0) && p.x <= r.x + r.w + (pad || 0) && p.y >= r.y - (pad || 0) && p.y <= r.y + r.h + (pad || 0);
  function tip(text) { S.tip = { text, t0: nowS() }; }
  const isFree = () => !!(game && game.free);

  /* ---- 1단계: 분류 ---- */
  function landHit(G, p) {
    for (let i = 0; i < G.bins.length; i++) if (inRect(p, G.bins[i])) return { type: 'bin', index: i };
    let best = null, area = 1e9;
    ITEMS.forEach((m) => {
      const h = G.it[m.id];
      if (Math.abs(p.x - h.cx) <= h.hw + 4 && Math.abs(p.y - h.cy) <= h.hh + 4) {
        const a = h.hw * h.hh; if (a < area) { area = a; best = m.id; }
      }
    });
    return best ? { type: 'item', id: best } : null;
  }
  function assignTo(V, id, bi) {
    const sp = SPHERES[bi], G = landGeo(V.L);
    S.assign[id] = sp.id; S.assignOrder = S.assignOrder.filter((x) => x !== id); S.assignOrder.push(id);
    S.sel = null; S.flagged.delete(id);
    Sound.tone(660 + bi * 60, 0.09, 'triangle', 0.07);
    const b = G.bins[bi];
    ringFx(V, b.x + b.w / 2, b.y + b.h / 2, 30, sp.color);
    V.P.burst(b.x + b.w / 2, b.y + 30, { count: 8, colors: [sp.color, '#ffffff'], speed: 90, gravity: 80, size: 3 });
  }
  function unassign(id) { delete S.assign[id]; S.assignOrder = S.assignOrder.filter((x) => x !== id); S.flagged.delete(id); }
  function binSlotIndex(id) { const sp = S.assign[id]; return S.assignOrder.filter((x) => S.assign[x] === sp).indexOf(id); }

  /* ---- 2단계: 연결 ---- */
  function nodeAt(G, p) {
    for (let i = 0; i < G.nodes.length; i++) { const n = G.nodes[i]; if (Math.hypot(p.x - n.x, p.y - n.y) <= n.r + 12) return i; }
    return -1;
  }
  function nextCase() {
    const i = CASES.findIndex((c) => !S.links[c.id]);
    return i >= 0 ? CASES[i].id : S.caseSel;
  }
  function completeLink(V, a, b) {
    const G = webGeo(V.L);
    if (!S.caseSel) { S.caseSel = nextCase(); }
    const cid = S.caseSel;
    S.links[cid] = { a: G.nodes[a].id, b: G.nodes[b].id };
    S.linkBorn[cid] = nowS(); S.flagLinks.delete(cid); S.linkFrom = null;
    Sound.tone(740, 0.1, 'triangle', 0.08); Sound.tone(988, 0.12, 'triangle', 0.07, 0.07);
    const nb = G.nodes[b];
    ringFx(V, nb.x, nb.y, nb.r, '#ffd36b');
    V.P.burst(nb.x, nb.y, { count: 10, colors: ['#ffd36b', '#ffffff', '#5eead4'], speed: 110, gravity: 60, size: 3 });
    S.caseSel = nextCase();
  }

  /* ---- 3~4단계: 지구 ---- */
  function selectLayer(V, id, at) {
    S.focus = id; S.focusAt = nowS();
    const first = !S.seen.has(id);
    S.seen.add(id);
    Sound.tone(first ? 880 : 620, 0.1, 'triangle', 0.07);
    if (at) { ringFx(V, at.x, at.y, 16, first ? '#34d399' : '#ffffff'); if (first) V.P.burst(at.x, at.y, { count: 10, colors: ['#ffe48a', '#ffffff', '#34d399'], speed: 100, gravity: 70, size: 3 }); }
  }
  function earthHit(V, p) {
    const G = earthGeo(V.L);
    if (S.view === 'cut' && S.cut > 0.6) return hitFace(p, G.cx, G.cy, G.R);
    if (S.view === 'split') return hitDisc(p, G.cx, G.cy, G.R, S.split, false);
    return null;
  }
  function rowHit(G, p) {
    for (let i = 0; i < G.rows.length; i++) if (inRect(p, G.rows[i])) return LAYERS[i].id;
    return null;
  }
  function cardAt(V, G, p) {
    const ids = CARD_ORDER.slice().reverse();
    for (let i = 0; i < ids.length; i++) { const c = V.cards[ids[i]]; if (c && Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return ids[i]; }
    return null;
  }
  function placeCard(V, cardId, layerId) {
    // 한 칸에는 카드 한 장 (이미 있으면 서로 자리 바꾸기)
    const prev = Object.keys(S.slots).find((k) => S.slots[k] === cardId);
    const old = S.slots[layerId];
    if (prev) delete S.slots[prev];
    S.slots[layerId] = cardId;
    if (old && old !== cardId && prev) S.slots[prev] = old;
    S.flagSlots.delete(cardId); S.flagSlots.delete(old);
    Sound.tone(700, 0.08, 'triangle', 0.07);
    const G = earthGeo(V.L), row = G.rows[LAYERS.findIndex((l) => l.id === layerId)], s = slotRect(row);
    ringFx(V, s.x + s.w / 2, s.y + s.h / 2, 26, '#5eead4');
  }
  function depthFromPoint(Gd, p) { return clamp((1 - Math.hypot(p.x - Gd.cx, p.y - Gd.cy) / Gd.R) * R_EARTH, 0, R_EARTH); }

  function attachPointer(V) {
    const { v, L } = V;
    let dragKind = null;
    SciSim.pointer(v, {
      hover(p) {
        if (S.scene === 'land') {
          const h = landHit(landGeo(L), p);
          S.hoverItem = h && h.type === 'item' ? h.id : null;
          S.hoverBin = h && h.type === 'bin' ? h.index : -1;
          return h ? 'pointer' : null;
        }
        if (S.scene === 'web') {
          const G = webGeo(L), n = nodeAt(G, p); S.hoverNode = n;
          return n >= 0 || G.cards.some((c) => inRect(p, c)) ? 'pointer' : null;
        }
        const G = earthGeo(L);
        if (S.view === 'globe' && Math.hypot(p.x - G.cx, p.y - G.cy) < G.R) return 'grab';
        if (S.slotMode && cardAt(V, G, p)) return 'grab';
        if (earthHit(V, p) || (S.view !== 'globe' && rowHit(G, p))) return 'pointer';
        if (S.view === 'scale' || S.view === 'depth') return 'grab';
        return null;
      },
      down(p) {
        if (S.scene === 'land') {
          const G = landGeo(L), h = landHit(G, p);
          if (!h) return false;
          if (h.type === 'bin') {
            if (S.sel) assignTo(V, S.sel, h.index);
            else { Sound.tick(); tip('먼저 그림 속 물체를 눌러서 골라요'); }
            return false;
          }
          S.drag = { id: h.id, x: p.x, y: p.y, x0: p.x, y0: p.y, moved: false };
          S.pulseItems = false; return true;
        }
        if (S.scene === 'web') {
          const G = webGeo(L);
          for (let i = 0; i < G.cards.length; i++) if (inRect(p, G.cards[i])) { S.caseSel = CASES[i].id; S.linkFrom = null; Sound.tick(); return false; }
          const n = nodeAt(G, p);
          if (n < 0) { if (S.linkFrom != null) S.linkFrom = null; return false; }
          S.linkDrag = { from: n, x: p.x, y: p.y, moved: false }; return true;
        }
        // earth
        const G = earthGeo(L);
        if (S.slotMode && (S.view === 'split')) {
          const cid = cardAt(V, G, p);
          if (cid) { const c = V.cards[cid]; S.cardDrag = { id: cid, x: c.x, y: c.y, gx: p.x - c.x, gy: p.y - c.y, moved: false, x0: p.x, y0: p.y }; dragKind = 'card'; Sound.tick(); return true; }
          const rid = rowHit(G, p);
          if (rid && S.cardSel) { placeCard(V, S.cardSel, rid); S.cardSel = null; return false; }
        }
        if (S.view === 'globe' && Math.hypot(p.x - G.cx, p.y - G.cy) < G.R * 1.05) {
          S.spinDrag = { x: p.x, t: performance.now(), v: 0 }; dragKind = 'spin'; return true;
        }
        if (S.view === 'cut' || S.view === 'split') {
          const id = earthHit(V, p);
          if (id) { selectLayer(V, id, p); return false; }
          const rid = rowHit(G, p);
          if (rid && (S.seen.has(rid) || S.slotMode || isFree())) { selectLayer(V, rid, null); return false; }
        }
        if (S.view === 'scale') {
          const Gs = scaleGeo(L);
          if (Math.hypot(p.x - Gs.cx, p.y - Gs.cy) < Gs.R * 1.7) { S.lensTarget = clampLens(Gs, Math.atan2(p.y - Gs.cy, p.x - Gs.cx)); S.lensSeen = true; dragKind = 'lens'; return true; }
        }
        if (S.view === 'depth') {
          const Gd = depthGeo(L);
          if (Math.hypot(p.x - Gd.cx, p.y - Gd.cy) < Gd.R * 1.12 || Math.abs(p.x - Gd.rulerX) < 30) {
            S.depthTouched = true; dragKind = 'depth';
            S.depthTarget = Math.abs(p.x - Gd.rulerX) < 30 ? yToDepth(Gd, p.y) : depthFromPoint(Gd, p); return true;
          }
        }
        return false;
      },
      move(p) {
        if (S.scene === 'land' && S.drag) {
          S.drag.x = p.x; S.drag.y = p.y;
          if (!S.drag.moved && Math.hypot(p.x - S.drag.x0, p.y - S.drag.y0) > 9) {
            S.drag.moved = true; S.sel = null;
            if (S.assign[S.drag.id]) unassign(S.drag.id);
            Sound.tick();
          }
          const h = landHit(landGeo(L), p); S.hoverBin = h && h.type === 'bin' ? h.index : -1;
        } else if (S.scene === 'web' && S.linkDrag) {
          const G = webGeo(L), d = S.linkDrag;
          d.x = p.x; d.y = p.y;
          if (!d.moved && Math.hypot(p.x - G.nodes[d.from].x, p.y - G.nodes[d.from].y) > G.nodes[d.from].r + 8) d.moved = true;
          S.hoverNode = nodeAt(G, p);
        } else if (S.scene === 'earth') {
          const G = earthGeo(L);
          if (dragKind === 'spin' && S.spinDrag) {
            const now = performance.now(), dx = p.x - S.spinDrag.x, dtm = Math.max(8, now - S.spinDrag.t);
            S.spin += dx / G.R; S.spinV = clamp(dx / G.R / (dtm / 1000), -3, 3);
            S.spinDrag.x = p.x; S.spinDrag.t = now;
          } else if (dragKind === 'card' && S.cardDrag) {
            const d = S.cardDrag; d.x = p.x - d.gx; d.y = p.y - d.gy;
            if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) > 8) d.moved = true;
            d.over = rowHit(G, p);
          } else if (dragKind === 'lens') {
            const Gs = scaleGeo(L); S.lensTarget = clampLens(Gs, Math.atan2(p.y - Gs.cy, p.x - Gs.cx));
          } else if (dragKind === 'depth') {
            const Gd = depthGeo(L);
            S.depthTarget = Math.abs(p.x - Gd.rulerX) < 30 ? yToDepth(Gd, p.y) : depthFromPoint(Gd, p);
          }
        }
      },
      up(p) {
        if (S.scene === 'land' && S.drag) {
          const d = S.drag; S.drag = null;
          const h = landHit(landGeo(L), p);
          if (d.moved) {
            if (h && h.type === 'bin') assignTo(V, d.id, h.index);
            else { Sound.tick(); }
          } else {
            S.sel = S.sel === d.id ? null : d.id; Sound.tick();
            const g = landGeo(L).it[d.id]; ringFx(V, g.cx, g.cy, Math.min(g.hw, g.hh) * 0.6, '#ffffff');
          }
          S.hoverBin = -1;
        } else if (S.scene === 'web' && S.linkDrag) {
          const G = webGeo(L), d = S.linkDrag; S.linkDrag = null;
          const to = nodeAt(G, p);
          if (d.moved) { if (to >= 0 && to !== d.from) completeLink(V, d.from, to); }
          else if (S.linkFrom == null) { S.linkFrom = d.from; Sound.tick(); }
          else if (S.linkFrom !== d.from) completeLink(V, S.linkFrom, d.from);
          else S.linkFrom = null;
          S.hoverNode = -1;
        } else if (S.scene === 'earth') {
          const G = earthGeo(L);
          if (dragKind === 'card' && S.cardDrag) {
            const d = S.cardDrag; S.cardDrag = null;
            const rid = rowHit(G, p);
            if (d.moved) { if (rid) placeCard(V, d.id, rid); else { const prev = Object.keys(S.slots).find((k) => S.slots[k] === d.id); if (prev) delete S.slots[prev]; } }
            else {
              if (rid) placeCard(V, d.id, rid);
              else S.cardSel = S.cardSel === d.id ? null : d.id;
            }
          }
          if (dragKind === 'spin') S.spinDrag = null;
          dragKind = null;
        }
        dragKind = null;
      },
    });
    if (L.key === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0]; if (!tc) return;
        const p = v.toLocal(tc);
        let block = false;
        if (S.drag || S.linkDrag || S.spinDrag || S.cardDrag || dragKind) block = true;
        else if (S.scene === 'land') block = !!landHit(landGeo(L), p);
        else if (S.scene === 'web') { const G = webGeo(L); block = nodeAt(G, p) >= 0; }
        else { const G = earthGeo(L); block = (S.view === 'globe' && Math.hypot(p.x - G.cx, p.y - G.cy) < G.R) || (S.slotMode && !!cardAt(V, G, p)) || S.view === 'scale' || S.view === 'depth'; }
        if (block) e.preventDefault();
      }, { passive: false });
    }
  }
  views.forEach(attachPointer);

  /* =========================================================
     지구 보기 전환 · 조작 연결
     ========================================================= */
  const VIEW_NOTE = {
    globe: '지구를 끌어서 돌려 볼 수 있어요.',
    cut: '단면에서 색이 다른 띠(층)를 눌러 보세요.',
    split: '층이 갈라졌어요. 층을 눌러 이름과 특징을 알아봐요.',
    scale: '실제 비율의 지구예요. 돋보기를 끌어 지각을 확대해 봐요.',
    depth: '탐사 캡슐을 끌어 지구 속으로 내려가 봐요.',
  };
  const viewTargets = (v) => ({
    globe: { g: 1, d: 0, s: 0, p: 0, cut: 0, split: 0 },
    cut: { g: 1, d: 0, s: 0, p: 0, cut: 1, split: 0 },
    split: { g: 0, d: 1, s: 0, p: 0, cut: 1, split: 1 },
    scale: { g: 0, d: 0, s: 1, p: 0, cut: S.cut, split: 0 },
    depth: { g: 0, d: 0, s: 0, p: 1, cut: S.cut, split: 0 },
  }[v]);
  function setView(v, instant) {
    S.view = v;
    const T = viewTargets(v);
    const go = (o, k, val, dur, ease, delay) => { if (instant || RM) o[k] = val; else SciSim.tween(o, { [k]: val }, { duration: dur, ease: ease || 'inOutCubic', delay: delay || 0 }); };
    go(S.vis, 'globe', T.g, 0.6); go(S.vis, 'disc', T.d, 0.6); go(S.vis, 'scale', T.s, 0.6); go(S.vis, 'depth', T.p, 0.6);
    go(S, 'cut', T.cut, T.cut > S.cut ? 1.15 : 0.75, 'linear');
    go(S, 'split', T.split, T.split > S.split ? 1.0 : 0.6, T.split > S.split ? 'outBack' : 'inOutCubic', T.split > S.split ? 0.2 : 0);
    if (v === 'cut') S.hintAt = nowS();
    if (v === 'scale') { const Gs = scaleGeo(activeView().L); S.lensTarget = Gs.lang; }
    syncControls();
  }
  function setScene(sc) {
    if (S.scene !== sc) { S.scene = sc; S.fade = 0; if (RM) S.fade = 1; else SciSim.tween(S, { fade: 1 }, { duration: 0.55, ease: 'outCubic' }); }
    syncControls();
  }
  function syncControls() {
    $$('#viewSeg button').forEach((b) => { const on = b.dataset.v === S.view; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    const n = $('#viewNote'); if (n) n.textContent = VIEW_NOTE[S.view] || '';
  }
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => {
    if (S.scene !== 'earth') return;
    Sound.click(); setView(b.dataset.v);
  }));
  function computeNote() {
    if (S.scene !== 'earth') return '';
    const v = S.view;
    if (v === 'globe') return FEAT.has('cut') || isFree() ? '지구를 끌어서 돌려 봐요. ✂️ 단면 버튼을 누르면 지구 속을 볼 수 있어요' : '지구를 끌어서 돌려 봐요';
    if (v === 'cut') return S.seen.size < 4 && !isFree() ? '단면에서 색이 다른 층을 눌러 이름과 특징을 알아봐요 (' + S.seen.size + ' / 4)' : '층을 눌러 특징을 살펴봐요. 🧅 층 분리로 하나씩 떼어 볼 수도 있어요';
    if (v === 'split') return '층이 떨어졌어요. 층을 눌러 두께를 비교해 봐요';
    if (v === 'scale') return '지구 가장자리의 돋보기를 끌어 지각을 확대해 봐요';
    return '탐사 캡슐을 끌어 지구 속으로 내려가 봐요';
  }

  /* =========================================================
     움직임 · 그리기 순서
     ========================================================= */
  function updateTokens(V, dt) {
    const G = landGeo(V.L);
    ITEMS.forEach((m) => {
      let tk = V.tok[m.id];
      const h = G.it[m.id];
      if (!tk) tk = V.tok[m.id] = { x: h.cx, y: h.cy, vx: 0, vy: 0, vis: 0, scale: 1, drag: false };
      let tx = tk.x, ty = tk.y, tv = 0, rate = 14;
      if (S.drag && S.drag.id === m.id && S.drag.moved) { tx = S.drag.x; ty = S.drag.y - 8; tv = 1; rate = 36; tk.drag = true; tk.scale = approach(tk.scale, 1.14, dt, 18); }
      else if (S.assign[m.id]) {
        const bi = SPHERES.findIndex((s) => s.id === S.assign[m.id]), sl = chipSlot(G, V.L, bi, binSlotIndex(m.id));
        if (tk.vis < 0.06 && !tk.drag) { tk.x = h.cx; tk.y = h.cy; tk.vx = tk.vy = 0; }
        tx = sl.x; ty = sl.y; tv = 1; tk.drag = false; tk.scale = approach(tk.scale, 1, dt, 14);
      } else { tk.drag = false; tv = 0; tk.scale = approach(tk.scale, 1, dt, 14); }
      if (tk.drag) { tk.x = approach(tk.x, tx, dt, rate); tk.y = approach(tk.y, ty, dt, rate); tk.vx = tk.vy = 0; }
      else springTo(tk, tx, ty, dt, 240, 19);
      tk.vis = approach(tk.vis, tv, dt, 12);
    });
  }
  function update(dt, t) {
    stepBuild(7);
    const wantSpin = !RM && (S.scene === 'web' || (S.scene === 'earth' && S.view === 'globe' && S.cut < 0.02));
    if (!S.spinDrag) S.spinV = approach(S.spinV, wantSpin ? 0.3 : 0, dt, wantSpin ? 1.2 : 4);
    S.spin += S.spinV * dt;
    S.cloudSpin += dt * (RM ? 0 : 0.03) + S.spinV * dt * 0.12;
    S.depth = approach(S.depth, S.depthTarget, dt, 12);
    let da = (S.lensTarget != null ? S.lensTarget : S.lensAng) - S.lensAng; da = Math.atan2(Math.sin(da), Math.cos(da));
    S.lensAng += da * (1 - Math.exp(-14 * dt));
    S.note = computeNote();
    watchPhase();
    views.forEach((V) => {
      if (V.v.canvas.offsetWidth <= 0) return;
      V.dt = dt; V.P.update(dt);
      if (S.scene === 'land') updateTokens(V, dt);
    });
  }
  function draw(V, t) {
    const ctx = V.ctx, L = V.L;
    V.v.apply();
    ctx.fillStyle = FRAME; ctx.fillRect(0, 0, L.vw, L.vh);
    ctx.textBaseline = 'alphabetic';
    const slide = (1 - S.fade) * 16;
    if (slide > 0.2) { ctx.save(); ctx.translate(0, slide); }
    if (S.scene === 'land') drawLand(V, t);
    else if (S.scene === 'web') drawWeb(V, t);
    else drawEarth(V, t);
    if (slide > 0.2) ctx.restore();
    V.P.draw(ctx); drawFx(ctx, V);
    // 성공 도장 (✔)
    if (S.stamp) {
      const k = (nowS() - S.stamp.t0) / 1.6;
      if (k >= 1) S.stamp = null;
      else {
        const sz = 46 * (0.6 + 0.4 * EZ.outBack(Math.min(1, k * 3.5))), x = L.vw / 2, y = L.vh / 2 - 10;
        ctx.save(); ctx.globalAlpha = 1 - smooth(0.7, 1, k);
        V.D.check(x, y, sz, clamp(k * 3, 0, 1));
        ctx.restore();
      }
    }
    if (S.fade < 0.999) { ctx.globalAlpha = 1 - S.fade; ctx.fillStyle = FRAME; ctx.fillRect(0, 0, L.vw, L.vh); ctx.globalAlpha = 1; }
  }
  // 미션 성공을 캔버스에서도 축하
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
     퀴즈·공책 그림 (SVG)
     ========================================================= */
  const SVG_OPEN = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family="' + FONT.replace(/"/g, "'") + '">';
  const FIG = {};
  FIG.depth = (function () {
    const W = 340, H = 150, x0 = 20, bw = 300, k = bw / R_EARTH;
    const seg = [[0, 35, '#9a7650', '지각'], [35, 2900, '#e0662a', '맨틀'], [2900, 5100, '#ffb02e', '외핵'], [5100, 6400, '#ffe48a', '내핵']];
    let s = SVG_OPEN(W, H, '깊이 줄자: 지표 0 km에서 지구 중심 6400 km까지 층의 구간과 깊이 4000 km 표시') + '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    s += '<text x="' + x0 + '" y="22" font-size="13" font-weight="700" fill="#c7d3f2">깊이 줄자 (km): 지표 → 지구 중심</text>';
    seg.forEach((g) => { s += '<rect x="' + (x0 + g[0] * k).toFixed(1) + '" y="60" width="' + Math.max(2, (g[1] - g[0]) * k).toFixed(1) + '" height="30" fill="' + g[2] + '" stroke="#0e1838" stroke-width="1.5"/>'; });
    s += '<text x="' + (x0 + 1500 * k).toFixed(1) + '" y="80" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">맨틀</text>';
    s += '<text x="' + (x0 + 4000 * k).toFixed(1) + '" y="80" text-anchor="middle" font-size="14" font-weight="800" fill="#5a3200">외핵</text>';
    s += '<text x="' + (x0 + 5750 * k).toFixed(1) + '" y="80" text-anchor="middle" font-size="14" font-weight="800" fill="#6b4a00">내핵</text>';
    s += '<text x="' + x0 + '" y="54" font-size="12" font-weight="700" fill="#e8c9a2">지각</text>';
    [[0, '0'], [2900, '2900'], [5100, '5100'], [6400, '6400']].forEach((tk) => { const x = x0 + tk[0] * k; s += '<line x1="' + x + '" y1="90" x2="' + x + '" y2="100" stroke="#c7d3f2" stroke-width="1.5"/><text x="' + (tk[0] === 6400 ? x - 6 : x) + '" y="116" text-anchor="' + (tk[0] === 6400 ? 'end' : tk[0] === 0 ? 'start' : 'middle') + '" font-size="12.5" font-weight="700" fill="#c7d3f2">' + tk[1] + '</text>'; });
    const mx = x0 + 4000 * k;
    s += '<path d="M' + mx + ',58 l-7,-12 h14 z" fill="#5eead4"/><line x1="' + mx + '" y1="58" x2="' + mx + '" y2="92" stroke="#5eead4" stroke-width="2" stroke-dasharray="3 3"/>';
    s += '<text x="' + mx + '" y="40" text-anchor="middle" font-size="14" font-weight="800" fill="#5eead4">깊이 4000 km</text>';
    s += '<text x="' + x0 + '" y="140" font-size="12" fill="#9fb3dd">(깊이 단위: km, 눈금은 층의 경계)</text>';
    return s + '</svg>';
  })();
  FIG.layers = (function () {
    const W = 300, H = 190, cx = 92, cy = 96, R = 78;
    const rd = radiiOf(false);
    let s = SVG_OPEN(W, H, '지권의 층상 구조: 지각, 맨틀, 외핵, 내핵') + '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    [['crust', '#9a7650'], ['mantle', '#e0662a'], ['outer', '#ffb02e'], ['inner', '#ffe48a']].forEach((l) => { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rd[l[0]][1] * R).toFixed(1) + '" fill="' + l[1] + '" stroke="#0e1838" stroke-width="1.5"/>'; });
    const lab = [['지각 · 고체', 36, '#e8c9a2'], ['맨틀 · 고체', 76, '#ffb48a'], ['외핵 · 액체', 116, '#ffd36b'], ['내핵 · 고체', 156, '#fff0b0']];
    const tx = [cx + R * 0.9, cx + R * 0.45, cx + R * 0.38, cx + R * 0.05];
    const ty = [cy - R * 0.45, cy - R * 0.3, cy - R * 0.05, cy];
    lab.forEach((l, i) => { s += '<line x1="' + (tx[i]).toFixed(1) + '" y1="' + (ty[i]).toFixed(1) + '" x2="178" y2="' + l[1] + '" stroke="#c7d3f2" stroke-width="1.3"/><circle cx="' + (tx[i]).toFixed(1) + '" cy="' + (ty[i]).toFixed(1) + '" r="2.6" fill="#fff"/><text x="184" y="' + (l[1] + 5) + '" font-size="15" font-weight="800" fill="' + l[2] + '">' + l[0] + '</text>'; });
    return s + '</svg>';
  })();

  /* =========================================================
     미션
     ========================================================= */
  function resetLand() {
    S.assign = {}; S.assignOrder = []; S.sel = null; S.drag = null; S.flagged = new Set(); S.shakeAt = {}; S.hoverBin = -1; S.hoverItem = null; S.pulseItems = true;
    views.forEach((V) => { V.tok = {}; });
  }
  function fillLand() { ITEMS.forEach((m) => { if (S.assign[m.id] !== m.sphere) { S.assign[m.id] = m.sphere; S.assignOrder = S.assignOrder.filter((x) => x !== m.id); S.assignOrder.push(m.id); } }); S.sel = null; S.flagged = new Set(); S.pulseItems = false; }
  function resetWeb() { S.links = {}; S.caseSel = CASES[0].id; S.linkFrom = null; S.linkDrag = null; S.flagLinks = new Set(); S.linkShake = {}; S.linkBorn = {}; }
  function fillWeb() { CASES.forEach((c) => { S.links[c.id] = { a: c.a, b: c.b }; S.linkBorn[c.id] = 0; }); S.linkFrom = null; S.flagLinks = new Set(); }
  const allSeen = () => LAYERS.forEach((l) => S.seen.add(l.id));
  function resetEarth() { S.seen = new Set(); S.focus = null; S.slots = {}; S.slotMode = false; S.cardSel = null; S.cardDrag = null; S.flagSlots = new Set(); S.slotShake = {}; S.depthTouched = false; S.lensSeen = false; }

  game = SciSim.game({
    simId: 'm2-earth-system',
    mount: '#game',
    badge: '지구 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: { cut: '✂️ 단면 열기', split: '🧅 층 분리', scale: '📏 크기 비교' },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart() { S.focus = null; S.tip = null; },
    onComplete() {
      setScene('earth'); allSeen(); S.slotMode = false; S.focus = null; setView('cut');
    },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '지구는 무엇으로 이루어져 있을까?', short: '지구계', icon: '🌍', phase: '관찰',
        features: [],
        intro: '<p class="si-q">❓ 탐구 질문: 지구는 어떤 부분들로 이루어져 있고, 그 속은 어떻게 생겼을까?</p>' +
          '<p>그림 속 산·바다·구름·사람·나무·달은 지구를 이루는 <b>다섯 가지 권역</b> 중 하나에 속해요. 물체를 눌러서 <b>알맞은 권역</b>에 나누어 담아 봐요.</p>',
        setup() { setScene('land'); resetLand(); },
        recap: '지구는 <b>지권·수권·기권·생물권·외권</b> 다섯 권역으로 이루어져 있어요. 이것을 <b>지구계</b>라고 해요.',
        summary: '<ul><li><b>지구계</b>: 지구를 이루는 여러 부분(권역)이 서로 영향을 주고받는 하나의 체계예요.</li>' +
          '<li><b>지권</b> 암석과 흙으로 된 땅, 그리고 지구 속 · <b>수권</b> 바다·강·빙하 등 지구에 있는 물 · <b>기권</b> 지구를 둘러싼 공기(대기) · <b>생물권</b> 지구에 사는 모든 생물 · <b>외권</b> 지구 대기 바깥의 우주 공간(달·태양 등)</li></ul>',
        missions: [
          {
            title: '🧺 권역에 나누어 담기', manual: true,
            goal: '그림 속 물체 <b>6개</b>(산·바다·구름·사람·나무·달)를 눌러서 알맞은 <b>권역 바구니</b>에 담아 보세요. 다 담았으면 <b>확인하기</b>를 눌러요.',
            hint: '구름은 지구를 둘러싼 <b>공기</b> 속에 있어요. 달은 지구 <b>대기 바깥</b>에 있고, 사람과 나무는 모두 <b>살아 있는 생물</b>이에요.',
            setup() { setScene('land'); },
            status: () => ITEMS.map((m) => chk(!!S.assign[m.id], m.name)).join(' · '),
            check() {
              const miss = ITEMS.filter((m) => !S.assign[m.id]);
              if (miss.length) return '아직 담지 않은 물체가 있어요: ' + miss.map((m) => m.name).join(', ');
              const wrong = ITEMS.filter((m) => S.assign[m.id] !== m.sphere), now = new Set(wrong.map((m) => m.id));
              now.forEach((id) => { if (!S.flagged.has(id)) S.shakeAt[id] = nowS(); });
              S.flagged = now;
              if (wrong.length) return '다시 생각해 볼 물체가 있어요 (' + wrong.map((m) => m.name).join(', ') + '). 어느 권역에 속할까요?';
              return true;
            },
            explain: '<b>산</b>은 지권, <b>바다</b>는 수권, <b>구름</b>은 기권, <b>사람과 나무</b>는 생물권, <b>달</b>은 외권에 속해요. 지구 대기 바깥의 우주 공간(태양·달·별 등)도 지구계의 구성 요소예요.',
          },
          {
            type: 'quiz', title: '🧊 빙하는 어느 권역일까?',
            goal: '남극의 <b>빙하</b>는 얼음으로 되어 있어요. 빙하는 어느 권역에 속할까요?',
            setup() { setScene('land'); fillLand(); },
            choices: ['지권 — 얼음도 단단한 고체라서', '수권 — 지구에 있는 물이 얼음 상태로 있어서', '기권 — 차가운 공기와 맞닿아 있어서', '생물권 — 그 위에 펭귄이 살고 있어서'],
            answer: 1,
            feedback: [
              '고체라고 해서 모두 지권은 아니에요. 지권은 <b>암석과 흙</b>으로 된 땅이에요. 빙하는 <b>물</b>이 얼어 있는 거예요.',
              '',
              '기권은 지구를 둘러싼 <b>공기</b>예요. 빙하는 공기가 아니라 얼음(물)이에요.',
              '펭귄은 생물권이지만, 빙하 자체는 생물이 아니에요. 빙하가 무엇으로 되어 있는지 생각해 봐요.',
            ],
            explain: '빙하는 물이 얼음 상태로 있는 것이므로 <b>수권</b>에 속해요. 바닷물·강물·지하수·빙하는 모두 지구에 있는 물이에요.',
          },
        ],
      },
      /* ---------- 2단계 · 탐구 ---------- */
      {
        title: '권역끼리 영향을 주고받아요', short: '상호작용', icon: '🔄', phase: '탐구',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구가 지권·수권·기권·생물권·외권으로 이루어진 것을 알았어요.</div>' +
          '<p>이 권역들은 따로따로일까요? <b>사례 카드</b>를 보고, 어떤 두 권역이 서로 영향을 주고받는지 <b>화살표로 연결</b>해 봐요.</p>',
        setup() { setScene('web'); resetWeb(); },
        recap: '지구계의 권역들은 따로 있지 않고, 서로 <b>영향을 주고받아요</b>(상호작용).',
        summary: '<ul><li>지구계의 권역들은 <b>서로 영향을 주고받으며</b> 하나의 체계를 이뤄요. 이것을 <b>상호작용</b>이라고 해요.</li>' +
          '<li>🌋 화산 가스: <b>지권 → 기권</b> · ♨️ 바닷물의 증발: <b>수권 → 기권</b></li>' +
          '<li>🌱 나무뿌리가 바위를 부숨: <b>생물권 → 지권</b> · ☄️ 운석 충돌: <b>외권 → 지권</b></li>' +
          '<li>🌧️ 비: <b>기권 → 수권</b>. 물은 수권과 기권을 오가요.</li></ul>',
        missions: [
          {
            title: '🔗 사례 카드 연결하기', manual: true,
            goal: '사례 카드를 고른 뒤, 영향을 <b>주는 권역 → 받는 권역</b> 순서로 두 권역을 눌러 연결해요. 카드 <b>4장</b>을 모두 연결하고 <b>확인하기</b>를 눌러요.',
            hint: '카드 속 사건이 <b>어느 권역에서 일어나서</b> <b>어느 권역으로</b> 영향을 주는지 생각해 봐요. 권역을 끌어서 이어도 돼요.',
            setup() { setScene('web'); },
            status: () => CASES.map((c) => chk(!!S.links[c.id], c.short)).join(' · '),
            check() {
              const un = CASES.filter((c) => !S.links[c.id]);
              if (un.length) return '아직 연결하지 않은 카드가 있어요 (' + un.map((c) => c.short).join(', ') + ')';
              const bad = [], rev = [];
              CASES.forEach((c) => {
                const l = S.links[c.id];
                if (l.a === c.a && l.b === c.b) return;
                if (l.a === c.b && l.b === c.a) rev.push(c); else bad.push(c);
              });
              const wrong = bad.concat(rev), now = new Set(wrong.map((c) => c.id));
              now.forEach((id) => { if (!S.flagLinks.has(id)) S.linkShake[id] = nowS(); });
              S.flagLinks = now;
              if (bad.length) return '연결을 다시 살펴볼 카드: ' + bad.map((c) => c.short).join(', ') + '. 사건이 일어나는 권역과 영향을 받는 권역을 생각해 봐요.';
              if (rev.length) return '두 권역은 맞아요! 하지만 화살표 방향이 거꾸로예요 (' + rev.map((c) => c.short).join(', ') + '). <b>영향을 주는 권역 → 받는 권역</b> 순서로 눌러요.';
              return true;
            },
            explain: '화산 가스는 <b>지권 → 기권</b>, 바닷물의 증발은 <b>수권 → 기권</b>, 나무뿌리가 바위를 부수는 일은 <b>생물권 → 지권</b>, 운석 충돌은 <b>외권 → 지권</b>의 상호작용이에요. 권역들은 이렇게 서로 영향을 주고받아요.',
          },
          {
            type: 'quiz', title: '🌧️ 비가 내리면?',
            goal: '구름에서 비가 내려 강물과 바다로 흘러들어요. 이것은 어느 권역에서 어느 권역으로 영향을 주는 일일까요?',
            setup() { setScene('web'); fillWeb(); },
            choices: ['수권 → 기권', '기권 → 수권', '지권 → 수권', '생물권 → 기권'],
            answer: 1,
            feedback: [
              '바닷물이 증발해 구름이 되는 것은 <b>수권 → 기권</b>이에요. 비는 그 반대 방향이에요.',
              '',
              '비는 땅에서 생기는 것이 아니에요. 비를 내리는 <b>구름</b>은 어느 권역에 있나요?',
              '비를 만드는 것은 생물이 아니에요. 구름이 있는 곳과 물이 흘러드는 곳을 생각해 봐요.',
            ],
            explain: '비는 구름이 있는 <b>기권</b>에서 <b>수권</b>(강·바다)으로 내려요. 물은 수권과 기권을 오가며 돌아요.',
          },
          {
            type: 'quiz', title: '🌐 지구계란?',
            goal: '지구계에 대한 설명으로 <b>옳은 것</b>은 무엇일까요?',
            setup() { setScene('web'); fillWeb(); },
            choices: ['다섯 권역은 서로 독립되어 있어서 영향을 주고받지 않는다', '다섯 권역은 서로 영향을 주고받으며 하나의 체계를 이룬다', '지구계에는 땅과 바다만 포함된다', '외권은 지구에서 멀어서 지구계에 포함되지 않는다'],
            answer: 1,
            feedback: [
              '앞에서 연결한 사례를 떠올려 봐요. 화산 가스는 기권에, 나무뿌리는 바위에 영향을 줬어요.',
              '',
              '공기(기권)와 생물(생물권), 우주 공간(외권)도 지구계의 구성 요소예요.',
              '운석 충돌처럼 외권도 지구에 영향을 줘요. 외권도 지구계에 포함돼요.',
            ],
            explain: '지구계는 <b>지권·수권·기권·생물권·외권</b>이 서로 영향을 주고받으며 이루는 하나의 체계예요.',
          },
        ],
      },
      /* ---------- 3단계 · 모형 ---------- */
      {
        title: '지권의 층상 구조', short: '지권의 층', icon: '🧅', phase: '모형',
        features: ['view', 'cut', 'split'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구계의 한 권역인 <b>지권</b>이 땅과 지구 속을 이루는 부분이라는 것을 알았어요.</div>' +
          '<p>지구 속은 어떻게 생겼을까요? 지구를 <b>잘라</b> 보고, 층을 <b>하나씩 떼어</b> 살펴봐요.</p>',
        setup() { setScene('earth'); resetEarth(); setView('globe', true); },
        recap: '지권은 바깥에서부터 <b>지각 → 맨틀 → 외핵 → 내핵</b>의 층으로 이루어져 있고, <b>외핵만 액체</b>예요.',
        summary: '<div class="note-fig">' + FIG.layers + '</div><table class="cmp"><tr><th>층</th><th>상태</th><th>깊이</th></tr>' +
          '<tr><td>지각</td><td>고체</td><td>0 ~ 약 35 km (대륙 지각 평균 약 35 km, 해양 지각 약 5 km)</td></tr>' +
          '<tr><td>맨틀</td><td>고체</td><td>지각 아래 ~ 약 2900 km (지권 부피의 대부분)</td></tr>' +
          '<tr><td>외핵</td><td>액체</td><td>약 2900 ~ 5100 km</td></tr>' +
          '<tr><td>내핵</td><td>고체</td><td>약 5100 ~ 6400 km</td></tr></table>' +
          '<p class="note">이렇게 층이 차례로 쌓인 모양을 <b>층상 구조</b>라고 해요.</p>',
        missions: [
          {
            title: '✂️ 네 개의 층 찾기',
            goal: '<b>✂️ 단면</b> 버튼으로 지구를 잘라 보세요. 단면에서 서로 다른 <b>네 개의 층</b>을 눌러 이름과 특징을 알아봐요.',
            hint: '단면에서 색이 다른 띠를 하나씩 눌러 보세요. 가장 안쪽의 작은 부분도 눌러야 해요.',
            setup() { setScene('earth'); S.slotMode = false; S.seen = new Set(); S.focus = null; setView('globe'); },
            check: () => S.seen.size >= 4,
            hold: 0.5,
            status: () => LAYERS.map((l) => chk(S.seen.has(l.id), S.seen.has(l.id) ? l.name : '?')).join(' · '),
            explain: '지권은 바깥에서 안쪽으로 <b>지각 · 맨틀 · 외핵 · 내핵</b> 네 층으로 이루어져 있어요. 이렇게 층이 차례로 쌓인 모양을 <b>층상 구조</b>라고 해요.',
          },
          {
            title: '🧩 상태·깊이 카드 붙이기', manual: true,
            goal: '<b>🧅 층 분리</b>로 층이 떨어졌어요. <b>상태·깊이 카드</b> 4장을 끌어서 알맞은 층의 칸에 놓고 <b>확인하기</b>를 눌러요.',
            hint: '바깥쪽 층일수록 깊이가 <b>얕아요</b>. 카드의 깊이를 층의 위치와 비교해 봐요. 앞에서 눌러 본 특징도 떠올려요.',
            setup() { setScene('earth'); allSeen(); S.focus = null; S.slotMode = true; S.slots = {}; S.cardSel = null; S.flagSlots = new Set(); setView('split'); },
            status: () => LAYERS.map((l) => chk(!!S.slots[l.id], l.name)).join(' · '),
            check() {
              const un = LAYERS.filter((l) => !S.slots[l.id]);
              if (un.length) return '아직 카드를 놓지 않은 층이 있어요: ' + un.map((l) => l.name).join(', ');
              const wrong = LAYERS.filter((l) => S.slots[l.id] !== l.id), nowSet = new Set(wrong.map((l) => S.slots[l.id]));
              wrong.forEach((l) => { if (!S.flagSlots.has(S.slots[l.id])) S.slotShake[l.id] = nowS(); });
              S.flagSlots = nowSet;
              if (wrong.length) return '카드가 맞지 않는 층이 있어요 (' + wrong.map((l) => l.name).join(', ') + '). 바깥쪽 층일수록 깊이가 얕다는 점과 층의 상태를 생각해 봐요.';
              return true;
            },
            explain: '<b>지각</b>은 0~약 35 km의 얇은 고체, <b>맨틀</b>은 약 2900 km까지 이어지는 고체, <b>외핵</b>은 약 2900~5100 km의 <b>액체</b>, <b>내핵</b>은 약 5100~6400 km의 고체예요.',
          },
          {
            type: 'quiz', title: '💧 액체인 층',
            goal: '지권을 이루는 네 층 중 <b>액체 상태</b>인 층은 무엇일까요?',
            setup() { setScene('earth'); allSeen(); S.slotMode = false; S.focus = null; setView('cut'); },
            choices: ['지각', '맨틀', '외핵', '내핵'],
            answer: 2,
            feedback: [
              '지각은 우리가 딛고 서 있는 단단한 암석이에요. <b>고체</b>예요.',
              '맨틀은 지권에서 가장 두꺼운 층이지만 <b>고체</b> 상태예요.',
              '',
              '내핵은 가장 안쪽에 있지만 단단한 <b>고체</b>예요. 액체인 층은 내핵을 둘러싸고 있어요.',
            ],
            explain: '<b>외핵</b>(깊이 약 2900~5100 km)만 <b>액체</b> 상태예요. 지각·맨틀·내핵은 모두 고체예요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '지구 속 크기와 깊이', short: '적용', icon: '📏', phase: '적용',
        features: ['scale'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지권이 지각·맨틀·외핵·내핵의 층상 구조라는 것을 알았어요.</div>' +
          '<p>이제 층의 <b>크기와 깊이</b>를 어림해 보면서 지구 속에 대해 더 생각해 봐요.</p>',
        setup() { setScene('earth'); allSeen(); S.slotMode = false; S.focus = null; setView('scale'); S.lensSeen = false; },
        recap: '지각은 지구 전체에 비해 <b>아주 얇고</b>, <b>맨틀</b>이 가장 큰 층이에요. 깊이를 알면 어떤 층·상태인지 알 수 있어요.',
        summary: '<ul><li><b>지각</b>은 지구 반지름(약 6400 km)에 비해 두께가 약 5~35 km밖에 안 돼서 <b>사과 껍질</b>처럼 아주 얇아요.</li>' +
          '<li><b>맨틀</b>은 깊이 약 2900 km까지 이어져 <b>지권 부피의 대부분</b>을 차지해요.</li>' +
          '<li>깊이로 층을 알 수 있어요: 약 35 km보다 얕으면 지각, ~2900 km는 맨틀, ~5100 km는 <b>외핵(액체)</b>, 그 아래는 내핵이에요.</li></ul>',
        missions: [
          {
            type: 'quiz', title: '🍎 지각은 얼마나 얇을까?',
            goal: '지구 반지름은 약 <b>6400 km</b>, 지각의 두께는 약 <b>5~35 km</b>예요. 지구 전체에 비해 지각은 어느 정도일까요?',
            setup() { setScene('earth'); allSeen(); S.slotMode = false; setView('scale'); },
            choices: ['지구 반지름의 절반쯤 되는 아주 두꺼운 층이다', '맨틀과 비슷한 두께의 층이다', '사과 껍질처럼 지구 전체에 비해 아주 얇은 층이다', '외핵보다 훨씬 두꺼운 층이다'],
            answer: 2,
            feedback: [
              '지구 반지름은 약 6400 km인데 지각은 5~35 km예요. 반지름의 1%도 안 돼요. 그림에서 지각을 찾아보세요.',
              '맨틀은 약 2900 km 깊이까지 이어져요. 지각은 그보다 훨씬 얇아요.',
              '',
              '외핵은 약 2200 km 두께(2900~5100 km)이고, 지각은 최대 35 km예요. 지각이 훨씬 얇아요.',
            ],
            explain: '지각의 두께는 지구 반지름의 <b>1%도 안 돼요</b>. 지구를 사과에 비유하면 지각은 <b>사과 껍질</b>처럼 아주 얇은 층이에요.',
          },
          {
            type: 'quiz', title: '📦 부피가 가장 큰 층',
            goal: '지권을 이루는 네 층 중 <b>부피가 가장 큰 층</b>은 무엇일까요?',
            setup() { setScene('earth'); allSeen(); S.slotMode = false; setView('split'); },
            choices: ['지각', '맨틀', '외핵', '내핵'],
            answer: 1,
            feedback: [
              '지각은 가장 얇은 층이라 부피가 아주 작아요.',
              '',
              '외핵도 두껍지만, 더 바깥쪽에서 훨씬 넓게 퍼져 있는 층이 있어요. 층의 두께와 반지름을 비교해 봐요.',
              '내핵은 가장 안쪽의 작은 공 모양이에요. 부피가 가장 작은 쪽이에요.',
            ],
            explain: '<b>맨틀</b>은 지각 아래부터 약 2900 km 깊이까지 이어지는 가장 두꺼운 층이에요. 지권 <b>부피의 대부분</b>을 차지해요.',
          },
          {
            type: 'quiz', title: '⛏️ 깊이 4000 km에서는?',
            goal: '지구 속으로 구멍을 파고 내려가요. <b>깊이 약 4000 km</b>에서 만나는 층의 이름과 상태는 무엇일까요?',
            figure: FIG.depth,
            setup() { setScene('earth'); allSeen(); S.slotMode = false; setView('depth'); S.depth = S.depthTarget = 1500; S.depthTouched = false; },
            choices: ['맨틀 — 고체', '외핵 — 액체', '외핵 — 고체', '내핵 — 고체'],
            answer: 1,
            feedback: [
              '맨틀은 약 2900 km 깊이까지예요. 4000 km는 그보다 더 깊어요.',
              '',
              '층 이름은 맞아요! 하지만 외핵의 상태는 고체가 아니에요. 지권에서 유일하게 액체인 층이에요.',
              '내핵은 약 5100 km보다 깊은 곳이에요. 4000 km는 아직 내핵에 닿기 전이에요.',
            ],
            explain: '깊이 약 2900~5100 km는 <b>외핵</b>이에요. 4000 km는 이 구간에 들어가고, 외핵은 지권에서 유일한 <b>액체</b>예요.',
          },
        ],
      },
    ],
  });
  syncControls();

  /* =========================================================
     실행
     ========================================================= */
  S.lensTarget = S.lensAng;
  SciSim.loop((dt, t) => {
    try {
      update(dt, t);
      views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    } catch (e) { console.error(e); }
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, LAYERS, ITEMS, CASES, SPHERES, game: () => game, view: activeView, setView, setScene, fillLand, fillWeb, allSeen, selectLayer,
    client(x, y) { const V = activeView(), r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    itemClient(id) { const V = activeView(), h = landGeo(V.L).it[id]; return this.client(h.cx, h.cy); },
    binClient(i) { const V = activeView(), b = landGeo(V.L).bins[i]; return this.client(b.x + b.w / 2, b.y + b.h / 2); },
    nodeClient(id) { const V = activeView(), G = webGeo(V.L), n = G.nodes.find((q) => q.id === id); return this.client(n.x, n.y); },
    caseClient(id) { const V = activeView(), G = webGeo(V.L), i = CASES.findIndex((c) => c.id === id), r = G.cards[i]; return this.client(r.x + r.w / 2, r.y + r.h / 2); },
    layerClient(id) { const V = activeView(), G = earthGeo(V.L), a = S.view === 'split' ? discAnchor(id, G.cx, G.cy, G.R, S.split, -38 * DEG) : faceAnchor(id, G.cx, G.cy, G.R); return this.client(a.x, a.y); },
    rowClient(id) { const V = activeView(), G = earthGeo(V.L), i = LAYERS.findIndex((l) => l.id === id), r = G.rows[i]; return this.client(r.x + r.w / 2, r.y + r.h / 2); },
    cardClient(id) { const V = activeView(), c = V.cards[id]; return this.client(c.x, c.y); },
    slotClient(id) { const V = activeView(), G = earthGeo(V.L), i = LAYERS.findIndex((l) => l.id === id), s = slotRect(G.rows[i]); return this.client(s.x + s.w / 2, s.y + s.h / 2); },
    globeClient() { const V = activeView(), G = earthGeo(V.L); return this.client(G.cx, G.cy); },
    depthClient(d) { const V = activeView(), Gd = depthGeo(V.L); return this.client(Gd.cx, depthToY(Gd, d)); },
    lensClient() { const V = activeView(), Gs = scaleGeo(V.L), a = lensAnchor(Gs, S.lensAng); return this.client(a.x, a.y); },
    ready: () => !!EARTH && !!TILES && !!TILES.inner,
    globeCanvas: (R) => getGlobe(R).canvas,
    bench(n) { const V = activeView(); const t0 = performance.now(); for (let i = 0; i < n; i++) { draw(V, nowS()); V.ctx.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / n; },
  };
})();
