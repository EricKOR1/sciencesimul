/* =========================================================
   중1 Ⅶ. 태양계 - 태양 표면과 태양 활동  [9과07-02]
   탐구 흐름(4단계):
   ① 관찰: 필터를 끼운 망원경으로 광구(쌀알 무늬·흑점)를 관찰하고, 흑점이 움직이는 까닭을 추론
   ② 관찰: 가리개로 광구를 가려 대기(채층·코로나·홍염)를 관찰
   ③ 분석: 연평균 흑점 수 그래프에서 약 11년 주기와 태양 활동의 변화를 분석
   ④ 적용(추론): 태양 폭풍이 지구에 미치는 영향(오로라·통신·위성·전력) 추론
   안전: 태양은 맨눈·망원경·선글라스로 직접 보지 않고 필터를 사용합니다. (정성적으로 다룸)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp } = SciSim;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;
  const RM = !!SciSim.reduceMotion;
  const shade = SciSim.color.shade, rgba = SciSim.color.rgba, mixc = SciSim.color.mix;
  const EZ = SciSim.ease;
  const nowS = () => performance.now() / 1000;

  /* =========================================================
     공통 그리기 도우미 (단원 Ⅶ 우주 화면 스타일)
     ========================================================= */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
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
      ctx.globalAlpha = alpha * tw;
      ctx.fillStyle = s.c;
      if (s.s > 1.45) {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s * 0.75, 0, TAU); ctx.fill();
        ctx.globalAlpha = alpha * tw * 0.35;
        ctx.fillRect(s.x - s.s * 2.2, s.y - 0.4, s.s * 4.4, 0.8);
        ctx.fillRect(s.x - 0.4, s.y - s.s * 2.2, 0.8, s.s * 4.4);
      } else ctx.fillRect(s.x, s.y, s.s * 1.3, s.s * 1.3);
    }
    ctx.globalAlpha = 1;
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
  function pillWidth(ctx, text, o) { ctx.font = o.font; return ctx.measureText(text).width + (o.pad || 9) * 2; }
  function pill(ctx, text, x, y, o) {
    o = o || {};
    ctx.font = o.font || 'bold 13px ' + FONT;
    const w = ctx.measureText(text).width, h = o.h || 22, pad = o.pad || 9;
    const bx = o.align === 'left' ? x : o.align === 'right' ? x - w - pad * 2 : x - w / 2 - pad;
    ctx.fillStyle = o.bg || 'rgba(6,10,26,.78)';
    roundRect(ctx, bx, y - h / 2, w + pad * 2, h, h / 2); ctx.fill();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + pad, y + 0.5);
    ctx.textBaseline = 'alphabetic';
    return { x: bx, w: w + pad * 2 };
  }
  function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
    const words = text.split(' ');
    const lines = [];
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
    const n = maxLines ? Math.min(maxLines, lines.length) : lines.length;
    for (let i = 0; i < n; i++) ctx.fillText(lines[i], x, y + i * lh);
    return y + (n - 1) * lh;
  }
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  function newTag(ctx, L, rx, ty) {
    ctx.font = fnt(L, 13, 'bold');
    const tw = ctx.measureText('NEW').width + 16, th = Math.round(22 * L.fs);
    ctx.fillStyle = '#0ea5e9'; roundRect(ctx, rx - tw, ty, tw, th, th / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NEW', rx - tw / 2, ty + th / 2 + 0.5); ctx.textBaseline = 'alphabetic';
  }
  function newRing(ctx, L, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(94,234,212,' + (0.35 + pulse() * 0.6) + ')'; ctx.lineWidth = 4;
    roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 14); ctx.stroke();
    const th = Math.round(22 * L.fs);
    newTag(ctx, L, x + w - 6, y - th - 6 >= 0 ? y - th - 6 : y + 6);
    ctx.restore();
  }
  function newRingCircle(ctx, L, x, y, r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(94,234,212,' + (0.35 + pulse() * 0.6) + ')'; ctx.lineWidth = 4;
    circle(ctx, x, y, r + 2 * pulse()); ctx.stroke();
    newTag(ctx, L, x + r * 0.71 + 40 * L.fs, y - r * 0.71 - 12 * L.fs);
    ctx.restore();
  }
  function checkMark(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.12, y + s * 0.4); ctx.lineTo(x + s * 0.55, y - s * 0.4); ctx.stroke();
  }
  function panelBase(ctx, P, stars, t) {
    roundRect(ctx, P.x, P.y, P.w, P.h, 14);
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, '#0c1636'); g.addColorStop(1, '#1b2d60');
    ctx.fillStyle = g; ctx.fill();
    if (stars) drawStars(ctx, stars, t, 0.7);
  }
  function panelEdge(ctx, P) {
    roundRect(ctx, P.x, P.y, P.w, P.h, 14);
    ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const fmtN = (v, d) => (d != null ? v.toFixed(d) : String(v));


  /* =========================================================
     자료: 연평균 흑점 수 (SILSO v2, 반올림) 1985~2024
     ========================================================= */
  const Y0 = 1985, Y1 = 2024;
  const SN = [21, 15, 34, 123, 211, 192, 203, 133, 76, 45, 25, 12, 29, 88, 136, 174, 170, 164, 99, 65, 46, 25, 13, 4, 5, 25, 81, 85, 94, 113, 70, 40, 22, 7, 4, 9, 30, 83, 126, 155];
  const snAt = (y) => { const f = clamp(y, Y0, Y1) - Y0, i = Math.floor(f), j = Math.min(SN.length - 1, i + 1), u = f - i; return SN[i] + (SN[j] - SN[i]) * u; };
  const SN_TOP = 220;
  // 극대기 무리 (그래프에서 흑점 수가 가장 많은 해들)
  const PEAKS = [{ a: 1989, b: 1991 }, { a: 2000, b: 2002 }, { a: 2012, b: 2014 }, { a: 2023, b: 2024 }];
  PEAKS.forEach((g) => { g.max = Math.max.apply(null, SN.slice(g.a - Y0, g.b - Y0 + 1)); g.name = g.a + '~' + String(g.b).slice(2); g.mid = (g.a + g.b) / 2; });
  // 누른 해가 어느 극대기 무리에 속하는지 (막대가 낮은 해는 제외)
  function peakOf(y) {
    for (let i = 0; i < PEAKS.length; i++) {
      const g = PEAKS[i];
      if (y >= g.a - 1 && y <= g.b + 1 && SN[y - Y0] >= 0.6 * g.max) return i;
    }
    return -1;
  }
  // 광구 관찰용 흑점 (위도·1일째 경도[도]·크기). 하루 약 13°씩 동→서로 이동
  const SPOTS = [
    { lat: 14, lon0: -64, r: 13 }, { lat: 12, lon0: -53, r: 6 }, { lat: 17, lon0: -58, r: 4.5 },
    { lat: -17, lon0: -34, r: 10 }, { lat: -15, lon0: -25, r: 5.5 },
    { lat: 7, lon0: -84, r: 7.5 },
    { lat: -9, lon0: 6, r: 14 }, { lat: -12, lon0: 15, r: 5 },
    { lat: 23, lon0: 20, r: 7 },
    { lat: 11, lon0: -150, r: 11 }, { lat: 14, lon0: -141, r: 5 },
    { lat: -21, lon0: -124, r: 9 }, { lat: 5, lon0: -106, r: 6.5 },
  ];
  const ROT = 13.2;   // 하루에 도는 각 (도)
  // 해마다 다른 흑점 무리 (활동 보기)
  const yearSpotCache = {};
  function spotsOfYear(y) {
    if (yearSpotCache[y]) return yearSpotCache[y];
    const N = SN[y - Y0], r = rng(y * 97 + 13), groups = Math.round(N / 21), out = [];
    for (let g = 0; g < groups; g++) {
      const lat = (r() < 0.5 ? -1 : 1) * (6 + r() * 22), lon = -62 + r() * 124, n = 1 + Math.floor(r() * 3), base = 6 + r() * 6 + N / 40;
      for (let k = 0; k < n; k++) out.push({ lat: lat + (r() - 0.5) * 6, lon: lon + (r() - 0.5) * 12, r: k === 0 ? base : base * (0.35 + r() * 0.3), g });
    }
    return (yearSpotCache[y] = out);
  }

  /* =========================================================
     무늬 잡음 · 쌀알 무늬(보로노이) · 코로나 그림
     ========================================================= */
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
  const GRAN_SIZE = 520;
  const SUN_RAMP = [[0, [255, 251, 232]], [0.5, [255, 240, 184]], [0.86, [255, 208, 112]], [1, [246, 160, 58]]];
  function makeGranTex(seed) {
    const size = GRAN_SIZE, c = size / 2, Rpx = c - 2, cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d'), img = g.createImageData(size, size), d = img.data;
    const cs = 0.062, Wc = Math.ceil(Math.PI / cs) + 6;
    const fx = new Float32Array(Wc * Wc), fy = new Float32Array(Wc * Wc), fb = new Float32Array(Wc * Wc);
    for (let j = 0; j < Wc; j++) for (let i = 0; i < Wc; i++) { const k = j * Wc + i; fx[k] = i + hash2(i, j, seed); fy[k] = j + hash2(i, j, seed + 9); fb[k] = hash2(i, j, seed + 31); }
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x = (px + 0.5 - c) / Rpx, y = (py + 0.5 - c) / Rpx, r2 = x * x + y * y;
        if (r2 > 1.004) continue;
        const rr = Math.sqrt(r2), z = Math.sqrt(Math.max(0, 1 - r2)), lon = Math.atan2(x, z), lat = Math.asin(clamp(-y, -1, 1));
        const u = (lon + Math.PI / 2) / cs + 2.5, v = (lat + Math.PI / 2) / cs + 2.5;
        const iu = Math.floor(u), iv = Math.floor(v);
        let f1 = 99, f2 = 99, id = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const k = (iv + dj) * Wc + (iu + di), dx = fx[k] - u, dy = fy[k] - v, dd = dx * dx + dy * dy;
          if (dd < f1) { f2 = f1; f1 = dd; id = k; } else if (dd < f2) f2 = dd;
        }
        const e = Math.sqrt(f2) - Math.sqrt(f1), s = clamp(e / 0.36, 0, 1), sm = s * s * (3 - 2 * s);
        const br = (0.74 + 0.26 * sm) * (0.9 + 0.1 * fb[id]);
        // 가장자리로 갈수록 붉고 어두워지는 바탕색(주연 감광)
        const bd = clamp(Math.hypot(x + 0.06, y + 0.07) / 1.06, 0, 1), col = ramp(SUN_RAMP, bd);
        const lm = clamp((rr - 0.78) / 0.22, 0, 1), la = 0.4 * lm * lm * 0.9 + 0.08 * lm * (1 - lm);
        const edge = clamp((1 - rr) * Rpx + 0.5, 0, 1), k4 = (py * size + px) * 4;
        d[k4] = (col[0] * br) * (1 - la) + 170 * la; d[k4 + 1] = (col[1] * br) * (1 - la) + 64 * la; d[k4 + 2] = (col[2] * br) * (1 - la) + 0 * la; d[k4 + 3] = 255 * edge;
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }
  function ramp(stops, s) {
    if (s <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (s <= stops[i][0]) { const a = stops[i - 1], b = stops[i], u = (s - a[0]) / (b[0] - a[0]); return [a[1][0] + (b[1][0] - a[1][0]) * u, a[1][1] + (b[1][1] - a[1][1]) * u, a[1][2] + (b[1][2] - a[1][2]) * u]; }
    }
    return stops[stops.length - 1][1];
  }
  let GRAN = null;
  // 첫 장은 바로 만들고 나머지는 틈틈이 만들어서 처음 열 때 화면이 멈추지 않게 해요
  function granTex() {
    if (!GRAN) {
      GRAN = [makeGranTex(11)];
      setTimeout(() => { GRAN.push(makeGranTex(47)); setTimeout(() => GRAN.push(makeGranTex(93)), 150); }, 500);
    }
    return GRAN;
  }
  // 6초 주기로 세 장을 번갈아 겹쳐 그려요 (끓어오르듯). 반환: [아래 장, 위 장, 위 장 투명도]
  const GM = [null, null, 0];
  function granMixed(t) {
    const T = granTex(), n = T.length;
    if (n === 1) { GM[0] = T[0]; GM[1] = null; GM[2] = 0; return GM; }
    const ph = (RM ? 0 : t / 6) % 1, k = Math.floor(ph * n), u = ph * n - k, e = u * u * (3 - 2 * u);
    GM[0] = T[k % n]; GM[1] = T[(k + 1) % n]; GM[2] = e;
    return GM;
  }
  let CORONA = null;
  function coronaTex() {
    if (CORONA) return CORONA;
    const size = 512, c = size / 2, cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d'), img = g.createImageData(size, size), d = img.data, RR = 2.6;
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x = (px + 0.5 - c) / c * RR, y = (py + 0.5 - c) / c * RR, rr = Math.sqrt(x * x + y * y);
        if (rr < 0.4 || rr > RR) continue;
        const r1 = Math.max(rr, 1), ang = Math.atan2(y, x), ca = Math.cos(ang), sa = Math.sin(ang);
        const strm = Math.pow(fbm(ca * 2.2 + 3, sa * 2.2 + 7, 5, 3), 2.2) * 3.4;
        const eq = 0.55 + 0.45 * Math.cos(2 * ang) * Math.cos(2 * ang);
        const rays = vnoise(ang * 30 + 5, r1 * 1.3, 11) * (0.45 + 0.55 * vnoise(ang * 11 + 2, r1 * 0.5, 21));
        const glow = Math.exp(-(r1 - 1) * 4.6) * 0.5 + Math.exp(-(r1 - 1) * 0.9) * 0.27 * (0.12 + strm * eq * 1.25 + rays * 1.05);
        const fade = clamp((RR - rr) / 0.7, 0, 1), a = clamp(glow * fade, 0, 1), k4 = (py * size + px) * 4;
        const warm = Math.exp(-(r1 - 1) * 5);
        d[k4] = 238 + 17 * warm; d[k4 + 1] = 244 + 4 * warm; d[k4 + 2] = 255 - 20 * warm; d[k4 + 3] = a * 255;
      }
    }
    g.putImageData(img, 0, 0);
    return (CORONA = cv);
  }

  /* =========================================================
     한 번만 그려 두고 계속 쓰는 배경 그림 (그라데이션이 큰 배경은 매 프레임 다시 칠하면 느려요)
     ========================================================= */
  const SPRITES = {};
  const SPR_SCALE = Math.min(2, window.devicePixelRatio || 1);
  function sprite(key, w, h, fn) {
    let c = SPRITES[key];
    if (!c) {
      c = document.createElement('canvas'); c.width = Math.ceil(w * SPR_SCALE); c.height = Math.ceil(h * SPR_SCALE);
      const g = c.getContext('2d'); g.scale(SPR_SCALE, SPR_SCALE); fn(g, w, h);
      SPRITES[key] = c;
    }
    return c;
  }

  /* =========================================================
     상태 · 배치
     ========================================================= */
  const S = {
    scene: 'photo', sceneA: 1,
    // 광구
    filter: false, capA: 0, day: 1, dayA: 1, lens: null, lensA: 0, labs: { gran: false, spot: false }, pops: [], photoHint: true, shake: 0,
    // 대기
    occ: { x: 0, y: 0 }, occSp: { x: new SciSim.Spring(0, { stiffness: 190, damping: 26 }), y: new SciSim.Spring(0, { stiffness: 190, damping: 26 }) }, occDrag: false, occTouched: false, c: 0, atmoLab: {}, snapped: false, hold: 0,
    // 활동
    year: 2000, yearA: 2000, spotsFrom: null, spotsTo: null, spotMix: 1, flashes: [], flareAcc: 0, found: [false, false, false, false], barA: 0, peakMsg: null, barPop: 0,
    // 지구
    storm: null, wind: [], windAcc: 0, aurora: 0, auroraT: 0, hit: false, stormOnce: false, sats: [{ a: 0.6, sp: 0.5 }, { a: 3.7, sp: -0.38 }], stormMsg: null,
    // 영향 카드
    cards: [false, false, false, false, false, false], cardMsg: null,
    flash: null,
  };
  let FEAT = new Set();
  const on = (f) => FEAT.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);
  const isFree = () => !!(game && game.free);

  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 600, fs: 1, col: true },
    tall: { key: 'tall', vw: 520, vh: 846, fs: 1.2, col: false },
  };
  function photoGeo(L) {
    if (L.col) return { cx: 400, cy: 304, R: 214, rim: 276, eye: 268, strip: { x: 62, y: 90, dx: 0, dy: 36 }, side: { x: 690, y: 90, w: 104 } };
    return { cx: 260, cy: 272, R: 200, rim: 250, eye: 242, strip: { x: 44, y: 580, dx: 34, dy: 0 }, side: { x: 20, y: 640, w: 480 }, hintY: 706, labelY: 548 };
  }
  function atmoGeo(L) {
    if (L.col) return { cx: 400, cy: 304, R: 108, P: { x: 8, y: 8, w: 784, h: 584 } };
    return { cx: 260, cy: 340, R: 100, P: { x: 8, y: 8, w: 504, h: 690 } };
  }
  const mkSp = () => new SciSim.Spring(0, { stiffness: 190, damping: 26 });
  S.occSp = { x: mkSp(), y: mkSp() };

  /* =========================================================
     태양 원반 (광구) 그리기 — 쌀알 무늬 + 가장자리 어두움 + 흑점
     ========================================================= */
  // 구면 좌표 → 원반 위 위치. 반환 (x, y, 중심에서 바라본 코사인 c)
  function spotProj(lat, lon, R) {
    const la = lat * DEG, lo = lon * DEG, c = Math.cos(la) * Math.cos(lo);
    return { x: R * Math.cos(la) * Math.sin(lo), y: -R * Math.sin(la), c };
  }
  function drawSpot(ctx, cx, cy, R, sp, lon, scale, alpha, t) {
    const P = spotProj(sp.lat, lon, R);
    if (P.c < 0.08) return null;
    const x = cx + P.x, y = cy + P.y, r = sp.r * scale * (R / 214) * (0.85 + 0.15 * Math.min(1, P.c * 2));
    const ang = Math.atan2(P.y, P.x), k = Math.max(0.16, P.c);
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(k, 1);          // 가장자리에서는 납작해져요
    const pg = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r * 1.02);
    pg.addColorStop(0, 'rgba(122,62,18,1)'); pg.addColorStop(0.7, 'rgba(150,84,28,.88)'); pg.addColorStop(1, 'rgba(190,120,40,0)');
    ctx.fillStyle = pg; circle(ctx, 0, 0, r); ctx.fill();
    // 반암부의 방사 줄무늬
    ctx.strokeStyle = 'rgba(70,30,8,.34)'; ctx.lineWidth = Math.max(0.7, r * 0.06);
    const n = r > 7 ? 20 : 12;
    for (let i = 0; i < n; i++) { const a = i / n * TAU + sp.lat * 0.31; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); ctx.lineTo(Math.cos(a) * r * (0.9 + 0.08 * Math.sin(i * 7)), Math.sin(a) * r * (0.9 + 0.08 * Math.sin(i * 7))); ctx.stroke(); }
    const ug = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
    ug.addColorStop(0, '#1f0e05'); ug.addColorStop(0.75, '#2b1408'); ug.addColorStop(1, 'rgba(43,20,8,0)');
    ctx.fillStyle = ug; circle(ctx, 0, 0, r * 0.5); ctx.fill();
    ctx.restore();
    void t;
    return { x, y, rx: r * k + 4, ry: r + 4, ang };
  }
  // 원반 한 장 그리기. o: {spots: [{sp, lon, scale, alpha}], t}
  // 바탕색·쌀알 무늬·가장자리 어두움은 미리 구워 둔 그림 한 장으로 그려요 (한 프레임에 그림 1~2번)
  function drawSunDisc(ctx, cx, cy, R, o) {
    const M = granMixed(o.t), s = GRAN_SIZE / (GRAN_SIZE / 2 - 2) * R;
    ctx.drawImage(M[0], cx - s / 2, cy - s / 2, s, s);
    if (M[1] && M[2] > 0.01) { ctx.globalAlpha = M[2]; ctx.drawImage(M[1], cx - s / 2, cy - s / 2, s, s); ctx.globalAlpha = 1; }
    const hits = [];
    if (o.spots && o.spots.length) {
      ctx.save();
      circle(ctx, cx, cy, R * 0.998); ctx.clip();
      o.spots.forEach((q, i) => { const h = drawSpot(ctx, cx, cy, R, q.sp, q.lon, q.scale || 1, q.alpha != null ? q.alpha : 1, o.t); if (h) { h.i = i; hits.push(h); } });
      ctx.restore();
    }
    return hits;
  }

  /* =========================================================
     1단계: 필터 + 망원경 시야 (광구)
     ========================================================= */
  const DAY_X = (G, i) => ({ x: G.strip.x + G.strip.dx * i, y: G.strip.y + G.strip.dy * i });
  function photoHit(L, p) {
    const G = photoGeo(L), dx = p.x - G.cx, dy = p.y - G.cy;
    if (dx * dx + dy * dy > (G.R - 6) * (G.R - 6)) return null;
    // 흑점 위인지 (화면에 그려진 위치 기준)
    const lon0 = S.dayA - 1;
    let best = null, bd = 1e9;
    SPOTS.forEach((sp, i) => {
      const P = spotProj(sp.lat, sp.lon0 + ROT * lon0, G.R);
      if (P.c < 0.18) return;
      const d = Math.hypot(dx - P.x, dy - P.y), rr = Math.max(18, sp.r * (G.R / 214) + 12);
      if (d < rr && d < bd) { bd = d; best = i; }
    });
    if (best != null) return { type: 'spot', i: best, u: dx / G.R, v: dy / G.R };
    return { type: 'gran', u: dx / G.R, v: dy / G.R };
  }
  function daySpots(day) { return SPOTS.map((sp) => ({ sp, lon: sp.lon0 + ROT * (day - 1), scale: 1 })); }
  function drawCap(ctx, L, G, a) {
    // 뚜껑 (a: 0 닫힘 ~ 1 열림) — 조리개처럼 줄어들며 열려요
    const rr = G.eye * (1 - a), fs = L.fs;
    if (rr < 3) return;
    ctx.save(); ctx.translate(G.cx, G.cy); ctx.rotate(a * 1.4);
    const cg = ctx.createRadialGradient(-rr * 0.3, -rr * 0.35, rr * 0.1, 0, 0, rr);
    cg.addColorStop(0, '#5c6684'); cg.addColorStop(0.7, '#2e3650'); cg.addColorStop(1, '#171c30');
    ctx.fillStyle = cg; circle(ctx, 0, 0, rr); ctx.fill();
    ctx.strokeStyle = 'rgba(190,205,240,.35)'; ctx.lineWidth = 2;
    [0.86, 0.62, 0.38].forEach((k) => { circle(ctx, 0, 0, rr * k); ctx.stroke(); });
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(-rr * 0.3, -rr * 0.42, rr * 0.42, rr * 0.16, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
    if (a < 0.2) {
      const al = 1 - a / 0.2;
      ctx.save(); ctx.globalAlpha = al;
      // 경고 표지
      const wx = G.cx, wy = G.cy - 22 * fs, s = 64 * fs;
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(wx, wy - s * 0.62); ctx.lineTo(wx + s * 0.62, wy + s * 0.46); ctx.lineTo(wx - s * 0.62, wy + s * 0.46); ctx.closePath();
      ctx.lineJoin = 'round'; ctx.lineWidth = 7 * fs; ctx.strokeStyle = '#facc15'; ctx.stroke(); ctx.fill();
      ctx.fillStyle = '#1f1300'; ctx.font = 'bold ' + Math.round(40 * fs) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', wx, wy + s * 0.12); ctx.textBaseline = 'alphabetic';
      pill(ctx, '필터가 없어요! 태양을 직접 보면 눈을 다쳐요', G.cx, G.cy + 62 * fs, { font: fnt(L, 14.5, 'bold'), h: Math.round(30 * fs), pad: 13, bg: 'rgba(127,29,29,.95)', stroke: '#fca5a5' });
      pill(ctx, '아래 [🕶️ 태양 필터]를 끼워요', G.cx, G.cy + 102 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 12, bg: 'rgba(14,165,233,.94)' });
      ctx.restore();
    }
  }
  function drawLens(ctx, L, G, spotsArr, t) {
    if (!S.lens || S.lensA < 0.02) return;
    const lx = G.cx + S.lens.u * G.R, ly = G.cy + S.lens.v * G.R, LR = 74 * L.fs * (0.55 + 0.45 * S.lensA);
    ctx.save();
    // 손잡이
    ctx.strokeStyle = '#8a93ad'; ctx.lineWidth = 9 * L.fs; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lx + LR * 0.74, ly + LR * 0.74); ctx.lineTo(lx + LR * 1.5, ly + LR * 1.5); ctx.stroke();
    ctx.strokeStyle = '#3a4260'; ctx.lineWidth = 6 * L.fs; ctx.beginPath(); ctx.moveTo(lx + LR * 0.74, ly + LR * 0.74); ctx.lineTo(lx + LR * 1.5, ly + LR * 1.5); ctx.stroke();
    ctx.save(); circle(ctx, lx, ly, LR); ctx.clip();
    ctx.fillStyle = '#1a1005'; ctx.fillRect(lx - LR, ly - LR, LR * 2, LR * 2);
    ctx.translate(lx, ly); ctx.scale(3, 3); ctx.translate(-lx, -ly);
    drawSunDisc(ctx, G.cx, G.cy, G.R, { spots: spotsArr, t, texA: 1 });
    ctx.restore();
    const rg = ctx.createLinearGradient(lx - LR, ly - LR, lx + LR, ly + LR);
    rg.addColorStop(0, '#f1f5ff'); rg.addColorStop(0.5, '#6b7694'); rg.addColorStop(1, '#c9d2ea');
    ctx.strokeStyle = rg; ctx.lineWidth = 6 * L.fs; circle(ctx, lx, ly, LR + 3); ctx.stroke();
    const hg = ctx.createLinearGradient(lx - LR, ly - LR, lx + LR * 0.4, ly + LR * 0.4);
    hg.addColorStop(0, 'rgba(255,255,255,.28)'); hg.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg; circle(ctx, lx, ly, LR); ctx.fill();
    pill(ctx, '🔍 3배', lx - LR * 0.55, ly - LR - 12 * L.fs, { font: fnt(L, 12.5, 'bold'), h: Math.round(20 * L.fs), pad: 7, bg: 'rgba(6,10,26,.85)', color: '#fde68a' });
    ctx.restore();
  }
  function drawPhoto(ctx, L, t, V) {
    const G = photoGeo(L), fs = L.fs;
    // 바탕
    ctx.fillStyle = '#04070f'; ctx.fillRect(0, 0, L.vw, L.vh);
    drawStars(ctx, L.starsPhoto, t, 0.5);
    // 접안렌즈 안쪽 (배경·비네팅은 미리 그려 둔 그림)
    const ES = G.eye * 2, eyeSpr = sprite('eyeBg' + L.key, ES, ES, (g, w, h) => {
      g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, TAU); g.clip();
      const bg = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
      bg.addColorStop(0, '#16100a'); bg.addColorStop(1, '#050304'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    });
    const vigSpr = sprite('eyeVig' + L.key, ES, ES, (g, w, h) => {
      const vg = g.createRadialGradient(w / 2, h / 2, w / 2 * 0.7, w / 2, h / 2, w / 2 * 1.02);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.78)');
      g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, TAU); g.clip(); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    });
    const glowSpr = sprite('eyeGlow' + L.key, ES, ES, (g, w, h) => {
      const gg = g.createRadialGradient(w / 2, h / 2, G.R * 0.96, w / 2, h / 2, G.R * 1.18);
      gg.addColorStop(0, 'rgba(255,170,70,.32)'); gg.addColorStop(1, 'rgba(255,140,50,0)'); g.fillStyle = gg; g.fillRect(0, 0, w, h);
    });
    ctx.drawImage(eyeSpr, G.cx - G.eye, G.cy - G.eye, ES, ES);
    let hits = [];
    const spotsArr = daySpots(S.dayA);
    if (S.filter || S.capA > 0.02) {
      ctx.globalAlpha = clamp(S.capA * 1.4 - 0.15, 0, 1);
      ctx.drawImage(glowSpr, G.cx - G.eye, G.cy - G.eye, ES, ES);
      hits = drawSunDisc(ctx, G.cx, G.cy, G.R, { spots: spotsArr, t });
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(vigSpr, G.cx - G.eye, G.cy - G.eye, ES, ES);
    drawCap(ctx, L, G, S.capA);
    // 접안렌즈 테두리
    const rg = ctx.createLinearGradient(G.cx - G.rim, G.cy - G.rim, G.cx + G.rim, G.cy + G.rim);
    rg.addColorStop(0, '#e6ecfa'); rg.addColorStop(0.45, '#566280'); rg.addColorStop(1, '#202840');
    ctx.strokeStyle = rg; ctx.lineWidth = 12 * fs * (L.col ? 1 : 0.85); circle(ctx, G.cx, G.cy, G.eye + 6 * fs); ctx.stroke();
    ctx.strokeStyle = S.filter ? 'rgba(52,211,153,.85)' : 'rgba(251,113,133,.85)'; ctx.lineWidth = 3; circle(ctx, G.cx, G.cy, G.eye + 16 * fs); ctx.stroke();
    // 돋보기
    if (S.filter && S.capA > 0.9) drawLens(ctx, L, G, spotsArr, t);
    // 방위 표시
    if (S.capA > 0.5) {
      const co = { font: fnt(L, 13, 'bold'), h: Math.round(20 * fs), pad: 7, bg: 'rgba(6,10,26,.72)', color: '#cfe0ff' };
      ctx.globalAlpha = clamp((S.capA - 0.5) * 2, 0, 1);
      pill(ctx, '북', G.cx, G.cy - G.eye + 14 * fs, co); pill(ctx, '남', G.cx, G.cy + G.eye - 14 * fs, co);
      pill(ctx, '동', G.cx - G.eye + 18 * fs, G.cy, co); pill(ctx, '서', G.cx + G.eye - 18 * fs, G.cy, co);
      ctx.globalAlpha = 1;
    }
    // 이름표
    S.pops.forEach((q) => {
      let qu = q.u, qv = q.v, vis = 1;
      if (q.si != null) { const sp = SPOTS[q.si], P = spotProj(sp.lat, sp.lon0 + ROT * (S.dayA - 1), 1); qu = P.x; qv = P.y; vis = clamp((P.c - 0.08) * 8, 0, 1); }
      if (vis < 0.02) return;
      const a = clamp((nowS() - q.t0) * 5, 0, 1) * vis, x = G.cx + qu * G.R, y = G.cy + qv * G.R, up = qv > 0.45 ? -1 : 1;
      ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 34 * fs, y - 40 * fs * up); ctx.stroke();
      circle(ctx, x, y, 4); ctx.fillStyle = '#fff'; ctx.fill();
      pill(ctx, q.text, x + 34 * fs, y - 40 * fs * up, { align: 'left', font: fnt(L, 14, 'bold'), h: Math.round(26 * fs), pad: 10, bg: q.col, color: '#10182e' });
      ctx.globalAlpha = 1;
    });
    // 위쪽 알림
    pill(ctx, '📅 ' + Math.round(S.dayA) + '일째 관측', 14, 24 * fs, { align: 'left', font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: 'rgba(124,58,237,.78)', stroke: 'rgba(196,181,253,.7)' });
    pill(ctx, S.filter ? '🕶️ 필터 켜짐' : '🕶️ 필터 없음', L.vw - 14, 24 * fs, { align: 'right', font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: S.filter ? 'rgba(6,95,70,.92)' : 'rgba(127,29,29,.92)', stroke: S.filter ? '#34d399' : '#fca5a5' });
    // 관측일 줄
    ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 12.5, 'bold'); ctx.textAlign = 'center';
    if (on('days') || isFree()) {
      for (let i = 0; i < 14; i++) {
        const p = DAY_X(G, i), cur = Math.abs(S.dayA - 1 - i) < 0.5;
        ctx.fillStyle = cur ? '#fbbf24' : 'rgba(160,190,255,.22)'; circle(ctx, p.x, p.y, cur ? 12 * (L.col ? 1 : 0.95) : 9); ctx.fill();
        ctx.strokeStyle = cur ? '#fff' : 'rgba(160,190,255,.5)'; ctx.lineWidth = cur ? 2.2 : 1; ctx.stroke();
        ctx.fillStyle = cur ? '#2a1a00' : '#c7d3f2'; ctx.font = fnt(L, cur ? 12.5 : 11.5, 'bold'); ctx.textAlign = 'center'; ctx.fillText(String(i + 1), p.x, p.y + 4.2);
      }
      if (L.col) { ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('관측일', G.strip.x, G.strip.y - 26); }
      else { ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'left'; ctx.fillText('📅 관측일 (숫자를 눌러서 바꿔요)', G.strip.x - 24, G.labelY + 6); }
    }
    // 오른쪽(또는 아래) 체크 칸
    const sd = G.side, items = [['쌀알 무늬', S.labs.gran], ['흑점', S.labs.spot]];
    if (S.filter) {
      ctx.textAlign = 'left';
      if (L.col) {
        ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('찾은 것', sd.x, sd.y - 12);
        items.forEach((it, i) => pill(ctx, (it[1] ? '✔ ' : '') + it[0], sd.x, sd.y + 16 + i * 34, { align: 'left', font: fnt(L, 13.5, 'bold'), h: 26, pad: 10, bg: it[1] ? 'rgba(6,95,70,.92)' : 'rgba(10,16,40,.82)', stroke: it[1] ? '#34d399' : 'rgba(160,190,255,.45)', color: '#fff' }));
      } else {
        items.forEach((it, i) => pill(ctx, (it[1] ? '✔ ' : '') + it[0], sd.x + i * 120, sd.y + 4, { align: 'left', font: fnt(L, 13.5, 'bold'), h: Math.round(28 * fs), pad: 10, bg: it[1] ? 'rgba(6,95,70,.92)' : 'rgba(10,16,40,.82)', stroke: it[1] ? '#34d399' : 'rgba(160,190,255,.45)', color: '#fff' }));
      }
    }
    if (S.filter && S.photoHint && !S.lens && S.capA > 0.9) pill(ctx, '👆 태양 표면을 눌러 돋보기로 보세요', G.cx, L.col ? L.vh - 18 * fs : G.hintY, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 12, bg: 'rgba(14,165,233,.94)' });
    if (isNew('filter')) newRingCircle(ctx, L, G.cx, G.cy, G.eye + 24 * fs);
    void V; void hits;
  }

  /* =========================================================
     2단계: 가리개로 광구를 가려 대기 관찰 (개기 일식과 같은 원리)
     ========================================================= */
  // 반지름이 같은 두 원이 d(반지름의 몇 배)만큼 떨어져 있을 때 가려진 비율
  function coverFrac(d) {
    if (d >= 2) return 0;
    if (d <= 0) return 1;
    return (2 * Math.acos(d / 2) - (d / 2) * Math.sqrt(4 - d * d)) / Math.PI;
  }
  const PROMS = [{ a: -0.62, w: 0.13, hh: 0.38, ph: 0.3 }, { a: 2.35, w: 0.11, hh: 0.48, ph: 2.1 }, { a: 4.0, w: 0.15, hh: 0.34, ph: 4.3 }];
  const promHeight = (p, t) => p.hh * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(RM ? 1 : t * TAU / 4 + p.ph))) + 0.1;
  const SPIC = (function () { const r = rng(88), a = []; for (let i = 0; i < 110; i++) a.push({ a: r() * TAU, l: 0.02 + r() * 0.05, p: r() * 6, k: 1.5 + r() * 3 }); return a; })();
  function resetOcc() { S.occSp.x.value = S.occSp.x.target = 1.7; S.occSp.y.value = S.occSp.y.target = 1.05; S.occSp.x.velocity = S.occSp.y.velocity = 0; S.occDrag = false; S.snapped = false; S.c = 0; S.atmoLab = {}; S.pops = []; S.occTouched = false; S.hold = 0; }
  function drawOcculter(ctx, cx, cy, R, lift) {
    ctx.save();
    if (lift) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8; }
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 1.02);
    g.addColorStop(0, '#454b5e'); g.addColorStop(0.6, '#20242f'); g.addColorStop(1, '#0a0c12');
    ctx.fillStyle = g; circle(ctx, cx, cy, R * 1.008); ctx.fill();
    ctx.shadowColor = 'transparent';
    // 바다(어두운 무늬)와 분화구
    ctx.save(); circle(ctx, cx, cy, R * 1.008); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    [[-0.32, -0.15, 0.34], [0.2, 0.28, 0.3], [0.38, -0.32, 0.2]].forEach((m) => { ctx.beginPath(); ctx.ellipse(cx + m[0] * R, cy + m[1] * R, m[2] * R, m[2] * R * 0.8, 0.5, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1.5;
    [[-0.5, 0.35, 0.1], [0.1, -0.5, 0.08], [0.55, 0.1, 0.12], [-0.1, 0.55, 0.07]].forEach((m) => { circle(ctx, cx + m[0] * R, cy + m[1] * R, m[2] * R); ctx.stroke(); });
    ctx.restore();
    ctx.strokeStyle = lift ? 'rgba(94,234,212,.9)' : 'rgba(160,180,230,.35)'; ctx.lineWidth = lift ? 3 : 1.5; circle(ctx, cx, cy, R * 1.008); ctx.stroke();
    ctx.restore();
  }
  function drawAtmo(ctx, L, t, V) {
    const G = atmoGeo(L), P = G.P, fs = L.fs, R = G.R, cx = G.cx, cy = G.cy;
    const ox = S.occSp.x.value, oy = S.occSp.y.value, d = Math.hypot(ox, oy), c = coverFrac(d);
    S.c = c;
    ctx.save();
    roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.clip();
    // 하늘 (미리 그려 둔 배경)
    ctx.drawImage(sprite('atmoSky' + L.key, P.w, P.h, (g, w, h) => {
      const sg = g.createRadialGradient(cx - P.x, cy - P.y, R, cx - P.x, cy - P.y, Math.max(P.w, P.h) * 0.7);
      sg.addColorStop(0, '#16224a'); sg.addColorStop(1, '#04081a'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
    }), P.x, P.y, P.w, P.h);
    drawStars(ctx, L.starsAtmo, t, 0.25 + 0.75 * c);
    // 코로나: α ∝ c⁴
    const ca = Math.pow(c, 4);
    if (ca > 0.01) {
      const T = coronaTex(), s = R * 5.2, wob = RM ? 0 : Math.sin(t * 0.35) * 0.012;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(wob);
      ctx.globalAlpha = ca; ctx.drawImage(T, -s / 2, -s / 2, s, s);
      ctx.restore(); ctx.globalAlpha = 1;
    }
    // 광구 (가리개 밑)
    if (c < 0.999) {
      const gl = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.6);
      gl.addColorStop(0, 'rgba(255,230,160,.7)'); gl.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = gl; circle(ctx, cx, cy, R * 1.6); ctx.fill();
      const dg = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.12, R * 0.1, cx, cy, R);
      dg.addColorStop(0, '#fffbea'); dg.addColorStop(0.6, '#ffefb8'); dg.addColorStop(1, '#ffd070');
      ctx.fillStyle = dg; circle(ctx, cx, cy, R); ctx.fill();
    }
    // 눈부심: α = 1 − c  (은은한 크림색 번짐)
    const ga = 1 - c;
    if (ga > 0.01) {
      ctx.globalAlpha = ga;
      ctx.drawImage(sprite('atmoGlare' + L.key, P.w, P.h, (g, w, h) => {
        const bl = g.createRadialGradient(cx - P.x, cy - P.y, R * 0.4, cx - P.x, cy - P.y, R * 3.4);
        bl.addColorStop(0, 'rgba(255,248,214,.95)'); bl.addColorStop(0.45, 'rgba(255,240,190,.62)'); bl.addColorStop(1, 'rgba(255,232,170,.3)'); g.fillStyle = bl; g.fillRect(0, 0, w, h);
      }), P.x, P.y, P.w, P.h);
      ctx.globalAlpha = 1;
    }
    // 채층 · 홍염 (거의 다 가렸을 때) — 붉은 고리와 불꽃 모양 홍염
    const fa = clamp((c - 0.95) / 0.05, 0, 1);
    if (fa > 0.01) {
      ctx.save(); ctx.globalAlpha = fa;
      const chg = ctx.createRadialGradient(cx, cy, R * 0.99, cx, cy, R * 1.12);
      chg.addColorStop(0, 'rgba(255,60,90,1)'); chg.addColorStop(0.45, 'rgba(255,77,109,.8)'); chg.addColorStop(1, 'rgba(255,90,110,0)');
      ctx.fillStyle = chg; circle(ctx, cx, cy, R * 1.12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,110,125,.85)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      SPIC.forEach((sp) => { const l = sp.l * (0.6 + 0.4 * Math.sin(RM ? 1 : t * sp.k + sp.p)); ctx.beginPath(); ctx.moveTo(cx + Math.cos(sp.a) * R * 1.0, cy + Math.sin(sp.a) * R * 1.0); ctx.lineTo(cx + Math.cos(sp.a) * R * (1.0 + l * 1.2), cy + Math.sin(sp.a) * R * (1.0 + l * 1.2)); ctx.stroke(); });
      PROMS.forEach((p) => {
        const h = promHeight(p, t) * R, a0 = p.a - p.w, a1 = p.a + p.w, rb = R * 1.0;
        const x0 = cx + Math.cos(a0) * rb, y0 = cy + Math.sin(a0) * rb, x1 = cx + Math.cos(a1) * rb, y1 = cy + Math.sin(a1) * rb;
        const qx = 0, qy = 0;
        const ax = cx + Math.cos(p.a) * (R + h), ay = cy + Math.sin(p.a) * (R + h);
        const pg = ctx.createRadialGradient(ax, ay, 0, ax, ay, h * 1.4 + 12);
        pg.addColorStop(0, 'rgba(255,100,100,.45)'); pg.addColorStop(1, 'rgba(255,90,100,0)');
        ctx.fillStyle = pg; circle(ctx, ax, ay, h * 1.4 + 12); ctx.fill();
        [[1, 0.07, 'rgba(255,70,95,.95)', 0], [0.78, 0.042, 'rgba(255,118,110,.92)', 0.2], [0.55, 0.024, 'rgba(255,196,165,.92)', 0.38]].forEach((lay, li) => {
          const wob = RM ? 0 : Math.sin(t * 1.3 + p.ph + li) * 0.035, k = lay[0], inset = lay[3];
          const aa0 = p.a - p.w * (1 - inset), aa1 = p.a + p.w * (1 - inset);
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(aa0) * rb, cy + Math.sin(aa0) * rb);
          ctx.bezierCurveTo(cx + Math.cos(p.a - p.w * 1.5 * (1 - inset) + wob) * (R + h * 1.5 * k), cy + Math.sin(p.a - p.w * 1.5 * (1 - inset) + wob) * (R + h * 1.5 * k),
            cx + Math.cos(p.a + p.w * 1.5 * (1 - inset) + wob) * (R + h * 1.5 * k), cy + Math.sin(p.a + p.w * 1.5 * (1 - inset) + wob) * (R + h * 1.5 * k),
            cx + Math.cos(aa1) * rb, cy + Math.sin(aa1) * rb);
          ctx.strokeStyle = lay[2]; ctx.lineWidth = R * lay[1]; ctx.stroke();
        });
        void qx; void qy;
      });
      ctx.restore();
    }
    // 가리개 원판
    const lift = S.occDrag;
    drawOcculter(ctx, cx + ox * R, cy + oy * R, R, lift);
    // 거의 다 가렸을 때 가장자리 다이아몬드 반지 대신 부드러운 빛
    if (c > 0.9 && c < 0.985 && !RM) { ctx.globalCompositeOperation = 'lighter'; const a = (0.985 - c) * 6; ctx.strokeStyle = 'rgba(255,240,200,' + a + ')'; ctx.lineWidth = 3; circle(ctx, cx, cy, R * 1.02); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    // 이름표
    S.pops.forEach((q) => {
      const a = clamp((nowS() - q.t0) * 5, 0, 1), x = cx + q.u * R, y = cy + q.v * R;
      ctx.globalAlpha = a * (c > 0.9 ? 1 : 0.5); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + q.dx * fs, y + q.dy * fs); ctx.stroke(); circle(ctx, x, y, 4); ctx.fillStyle = '#fff'; ctx.fill();
      pill(ctx, q.text, x + q.dx * fs, y + q.dy * fs, { font: fnt(L, 14, 'bold'), h: Math.round(26 * fs), pad: 10, bg: q.col, color: '#10182e' });
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    pill(ctx, '🌅 가린 정도 ' + Math.round(c * 100) + ' %', P.x + 14, P.y + 24 * fs, { align: 'left', font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: c >= 0.98 ? 'rgba(6,95,70,.95)' : 'rgba(10,16,40,.82)', stroke: c >= 0.98 ? '#34d399' : 'rgba(160,190,255,.45)' });
    // 안내
    const lab = fa > 0.5;
    if (!S.occTouched && !isFree()) pill(ctx, '👆 가리개 원판을 끌어 태양을 덮어요', L.col ? P.x + P.w / 2 : P.x + P.w / 2, P.y + P.h - 22 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 12, bg: 'rgba(14,165,233,.94)' });
    else if (lab && game && (isFree() || game.level === 1) && !(S.atmoLab.chromo && S.atmoLab.corona && S.atmoLab.prom) && (isFree() || game.index === 4)) pill(ctx, '👆 채층·코로나·홍염을 눌러 이름표를 붙여요', P.x + P.w / 2, P.y + P.h - 22 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 12, bg: 'rgba(14,165,233,.94)' });
    // 범례
    const items = [['채층', S.atmoLab.chromo, '#ff4d6d'], ['코로나', S.atmoLab.corona, '#e6f0ff'], ['홍염', S.atmoLab.prom, '#ff8a6b']];
    items.forEach((it, i) => {
      const x = L.col ? P.x + P.w - 14 : P.x + 14 + i * 128 * fs / 1.2, y = L.col ? P.y + 24 * fs + i * 34 * fs : P.y + P.h + 24;
      pill(ctx, (it[1] ? '✔ ' : '') + it[0], x, y, { align: L.col ? 'right' : 'left', font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), pad: 10, bg: it[1] ? 'rgba(6,95,70,.92)' : 'rgba(10,16,40,.82)', stroke: it[1] ? '#34d399' : it[2], color: '#fff' });
    });
    if (!L.col) { ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13); ctx.textAlign = 'left'; ctx.fillText('가린 비율이 98 % 이상일 때 대기가 또렷하게 보여요.', P.x + 14, P.y + P.h + 62); }
    panelEdge(ctx, P);
    if (isNew('occulter')) newRing(ctx, L, P.x, P.y, P.w, P.h);
    void V;
  }
  function atmoHit(L, p) {
    const G = atmoGeo(L), dx = p.x - G.cx, dy = p.y - G.cy, d = Math.hypot(dx, dy), R = G.R;
    if (S.c < 0.9) return null;
    const ang = Math.atan2(dy, dx);
    // 홍염
    for (let i = 0; i < PROMS.length; i++) {
      const q = PROMS[i], da = Math.abs(((ang - q.a + Math.PI * 3) % TAU) - Math.PI), h = promHeight(q, performance.now() / 1000) * R;
      if (da < q.w + 0.18 && d > R * 0.98 && d < R + h * 1.9 + 14) return { name: '홍염', key: 'prom', u: dx / R, v: dy / R, col: '#ff8a6b' };
    }
    if (d >= R * 0.97 && d <= R * 1.2 && S.c > 0.95) return { name: '채층', key: 'chromo', u: dx / R, v: dy / R, col: '#ff7a8f' };
    if (d > R * 1.2 && d < R * 2.9) return { name: '코로나', key: 'corona', u: dx / R, v: dy / R, col: '#e6f0ff' };
    return null;
  }

  /* =========================================================
     3단계: 해마다 달라지는 태양 (흑점 수 · 플레어 · 코로나) + 연평균 흑점 수 그래프
     ========================================================= */
  function actGeo(L) {
    if (L.col) return { D: { x: 8, y: 8, w: 326, h: 584 }, dcx: 171, dcy: 210, dR: 112, G: { x: 342, y: 8, w: 450, h: 584 }, px: 392, py: 84, pw: 388, ph: 410, meters: { x: 22, y: 392, w: 298 } };
    return { D: { x: 8, y: 8, w: 504, h: 316 }, dcx: 122, dcy: 172, dR: 78, G: { x: 8, y: 332, w: 504, h: 506 }, px: 60, py: 408, pw: 436, ph: 366, meters: { x: 262, y: 76, w: 234 } };
  }
  const barX = (G, i) => G.px + (i + 0.5) * G.pw / 40;
  const barY = (G, n) => G.py + G.ph - n / SN_TOP * G.ph;
  function setYear(y, instant) {
    y = clamp(Math.round(y), Y0, Y1);
    if (y === S.year && !instant) return;
    S.spotsFrom = spotsOfYear(S.year); S.spotsTo = spotsOfYear(y); S.year = y; S.spotMix = 0;
    SciSim.tween(S, { spotMix: 1 }, { duration: instant ? 0.001 : 0.5, ease: 'outCubic' });
    SciSim.tween(S, { yearA: y }, { duration: instant ? 0.001 : 0.55, ease: 'inOutCubic' });
    S.barPop = nowS();
    syncControls();
  }
  function addFlash(u, v, big) { S.flashes.push({ u, v, t0: nowS(), big: !!big }); }
  function drawYearDisc(ctx, L, G, t, N) {
    const R = G.dR, cx = G.dcx, cy = G.dcy, k = 1.06 * (1 + N / 250);
    // 코로나 (크기 ∝ 1 + N/250)
    const T = coronaTex(), s = R * 5.2 * k;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.4 * clamp(N / 160, 0, 1); ctx.drawImage(T, cx - s / 2, cy - s / 2, s, s);
    ctx.restore();
    // 흑점: 해에 따라 바뀌는 무리 (겹쳐서 부드럽게 바뀜)
    const mk = (arr, alpha) => (arr || []).map((sp) => ({ sp, lon: sp.lon, scale: 1, alpha }));
    const mix = S.spotMix;
    const arr = mk(S.spotsFrom, 1 - mix).concat(mk(S.spotsTo, mix));
    drawSunDisc(ctx, cx, cy, R, { spots: arr, t, texA: 0.9 });
    // 플레어 섬광
    const n = nowS();
    for (let i = S.flashes.length - 1; i >= 0; i--) {
      const f = S.flashes[i], a = (n - f.t0) / (f.big ? 0.7 : 0.45);
      if (a >= 1) { S.flashes.splice(i, 1); continue; }
      const x = cx + f.u * R, y = cy + f.v * R, rr = (f.big ? 36 : 22) * (R / 112);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fg = ctx.createRadialGradient(x, y, 0, x, y, rr * (0.6 + a * 0.9));
      fg.addColorStop(0, 'rgba(255,255,255,' + (1 - a) + ')'); fg.addColorStop(0.35, 'rgba(255,240,170,' + (0.7 * (1 - a)) + ')'); fg.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = fg; circle(ctx, x, y, rr * (0.6 + a * 0.9)); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - a)) + ')'; ctx.lineWidth = 2.4 * (1 - a) + 0.6; circle(ctx, x, y, rr * (0.4 + a * 1.1)); ctx.stroke();
      ctx.restore();
    }
  }
  function meter(ctx, L, x, y, w, label, v, col, txt) {
    ctx.textAlign = 'left'; ctx.fillStyle = '#e3ebff'; ctx.font = fnt(L, 13.5, 'bold'); ctx.fillText(label, x, y);
    ctx.textAlign = 'right'; ctx.fillStyle = col; ctx.fillText(txt, x + w, y);
    roundRect(ctx, x, y + 8, w, 12 * L.fs, 6 * L.fs); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
    roundRect(ctx, x, y + 8, Math.max(12 * L.fs, w * clamp(v, 0, 1)), 12 * L.fs, 6 * L.fs); ctx.fillStyle = col; ctx.fill();
  }
  // 부드러운 곡선(카디널 스플라인)
  function smoothPath(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
  }
  function drawActivity(ctx, L, t, V) {
    const G = actGeo(L), fs = L.fs, N = snAt(S.yearA);
    // 왼쪽: 태양 원반
    panelBase(ctx, G.D, L.starsAct, t);
    ctx.save(); roundRect(ctx, G.D.x, G.D.y, G.D.w, G.D.h, 14); ctx.clip();
    drawYearDisc(ctx, L, G, t, N);
    ctx.restore();
    pill(ctx, '☀️ ' + Math.round(S.yearA) + '년의 태양', G.D.x + 12, G.D.y + 24 * fs, { align: 'left', font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: 'rgba(6,10,26,.72)' });
    const M = G.meters, my = M.y;
    if (!L.col) { roundRect(ctx, M.x - 10, M.y - 26, M.w + 20, 206, 12); ctx.fillStyle = 'rgba(6,10,26,.62)'; ctx.fill(); }
    meter(ctx, L, M.x, my, M.w, '흑점 수', N / 160, '#fbbf24', Math.round(N) + '개');
    meter(ctx, L, M.x, my + 56 * fs, M.w, '플레어(섬광) 빈도', N / 160, '#fb923c', N > 110 ? '매우 잦음' : N > 55 ? '잦음' : N > 20 ? '가끔' : '드묾');
    meter(ctx, L, M.x, my + 112 * fs, M.w, '코로나 크기', (1 + N / 250 - 1) / 0.62 * 0.62 + 0.18, '#a5b4fc', N > 110 ? '큼' : N > 55 ? '보통' : '작음');
    if (L.col) pill(ctx, N > 100 ? '🔥 태양 활동이 활발해요' : N > 40 ? '태양 활동이 보통이에요' : '😴 태양 활동이 약해요', G.D.x + G.D.w / 2, G.D.y + G.D.h - 28 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 13, bg: N > 100 ? 'rgba(154,52,18,.92)' : 'rgba(10,16,40,.85)', stroke: N > 100 ? '#fdba74' : 'rgba(160,190,255,.5)' });
    else pill(ctx, N > 100 ? '🔥 활동이 활발해요' : N > 40 ? '활동이 보통이에요' : '😴 활동이 약해요', M.x + M.w / 2, M.y + 180 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 13, bg: N > 100 ? 'rgba(154,52,18,.92)' : 'rgba(10,16,40,.85)', stroke: N > 100 ? '#fdba74' : 'rgba(160,190,255,.5)' });
    panelEdge(ctx, G.D);
    // 오른쪽(또는 아래): 연평균 흑점 수 그래프
    panelBase(ctx, G.G, null, t);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold'); ctx.fillText('📈 연평균 흑점 수 (1985~2024)', G.G.x + 14, G.G.y + 26 * fs);
    // 눈금
    for (let v = 0; v <= 200; v += 50) { const y = barY(G, v); ctx.strokeStyle = 'rgba(160,190,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(G.px, y); ctx.lineTo(G.px + G.pw, y); ctx.stroke(); ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 12.5); ctx.textAlign = 'right'; ctx.fillText(String(v), G.px - 6, y + 4); }
    ctx.textAlign = 'center';
    for (let y = 1985; y <= 2024; y += 5) { ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 12); ctx.fillText(String(y), barX(G, y - Y0), G.py + G.ph + 18 * fs); }
    ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 12.5, 'bold'); ctx.textAlign = 'left'; ctx.fillText('흑점 수', G.px - 10, G.py - 10);
    // 막대 (처음 열릴 때 차례로 자라요)
    const cur = Math.round(S.yearA);
    for (let i = 0; i < 40; i++) {
      const grow = clamp(S.barA * 1.8 - i / 40 * 0.8, 0, 1), e = EZ.outCubic(grow);
      const n = SN[i] * e, x = barX(G, i), bw = G.pw / 40 * 0.74, y = barY(G, n);
      const isCur = i + Y0 === cur, pk = peakOf(i + Y0), found = pk >= 0 && S.found[pk];
      const bg = ctx.createLinearGradient(0, y, 0, G.py + G.ph);
      if (isCur) { bg.addColorStop(0, '#fde68a'); bg.addColorStop(1, '#f59e0b'); } else if (found) { bg.addColorStop(0, '#6ee7b7'); bg.addColorStop(1, '#0f766e'); } else { bg.addColorStop(0, '#7dd3fc'); bg.addColorStop(1, '#1d4ed8'); }
      ctx.fillStyle = bg;
      roundRect(ctx, x - bw / 2, y, bw, Math.max(1, G.py + G.ph - y), Math.min(3, bw / 2)); ctx.fill();
      if (isCur) { ctx.strokeStyle = 'rgba(255,248,200,.9)'; ctx.lineWidth = 2; ctx.stroke(); }
    }
    // 매끈한 선
    if (S.barA > 0.7) {
      const pts = SN.map((n, i) => [barX(G, i), barY(G, n)]);
      ctx.save(); ctx.globalAlpha = clamp((S.barA - 0.7) / 0.3, 0, 1);
      smoothPath(ctx, pts); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
    }
    // 찾은 극대기: 깃발 + 주기 표시
    const mids = [];
    PEAKS.forEach((g, i) => { if (S.found[i]) { const x = barX(G, g.mid - Y0), y = barY(G, g.max) - 8; ctx.fillStyle = '#34d399'; circle(ctx, x, y - 10, 9); ctx.fill(); ctx.fillStyle = '#052e22'; ctx.font = 'bold ' + Math.round(13 * fs) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('★', x, y - 5.5); mids.push(x); } });
    if (mids.length >= 2 && game && (isFree() || game.level >= 2)) {
      for (let i = 0; i < mids.length - 1; i++) {
        const y = G.py + 22 * fs + (i % 2) * 20 * fs, x0 = mids[i], x1 = mids[i + 1], a = clamp((nowS() - (S.peakMsg ? S.peakMsg.t0 : 0)) * 2, 0, 1);
        ctx.save(); ctx.globalAlpha = Math.max(a, 0.9); ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x0, y - 5); ctx.lineTo(x0, y + 5); ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y + 5); ctx.stroke();
        pill(ctx, '약 11년', (x0 + x1) / 2, y - 12 * fs, { font: fnt(L, 12.5, 'bold'), h: Math.round(22 * fs), pad: 8, bg: 'rgba(120,53,15,.92)', color: '#fde68a' });
        ctx.restore();
      }
    }
    // 현재 연도 표시
    const ci = clamp(cur - Y0, 0, 39), cxp = barX(G, ci), cyp = barY(G, SN[ci]);
    const pop = S.barPop && nowS() - S.barPop < 0.4 ? 1 + Math.sin((nowS() - S.barPop) / 0.4 * Math.PI) * 0.12 : 1;
    ctx.save(); ctx.translate(clamp(cxp, G.px + 44, G.px + G.pw - 44), cyp - 30 * fs); ctx.scale(pop, pop);
    pill(ctx, cur + '년 · ' + SN[ci], 0, 0, { font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), pad: 10, bg: 'rgba(251,191,36,.96)', color: '#2a1a00' });
    ctx.restore();
    // 안내 / 피드백
    const my2 = G.G.y + G.G.h - 22 * fs;
    if (S.peakMsg && nowS() - S.peakMsg.t0 < 2.6) { ctx.globalAlpha = clamp((2.6 - (nowS() - S.peakMsg.t0)) * 2, 0, 1); pill(ctx, S.peakMsg.text, G.G.x + G.G.w / 2, my2, { font: fnt(L, 13.5, 'bold'), h: Math.round(28 * fs), pad: 12, bg: S.peakMsg.good ? 'rgba(6,95,70,.96)' : 'rgba(127,29,29,.96)' }); ctx.globalAlpha = 1; }
    else if (game && !isFree() && game.level === 2 && game.index === 6) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(199,211,242,.92)'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('👆 막대가 가장 높은 해(극대기)를 눌러 표시해요', G.G.x + G.G.w / 2, my2 + 4); }
    panelEdge(ctx, G.G);
    if (isNew('years')) newRing(ctx, L, G.G.x, G.G.y, G.G.w, G.G.h);
    void V;
  }
  function actHit(L, p) {
    const G = actGeo(L);
    if (p.x < G.px - 4 || p.x > G.px + G.pw + 4 || p.y < G.py - 30 || p.y > G.py + G.ph + 10) return null;
    return clamp(Math.floor((p.x - G.px) / (G.pw / 40)), 0, 39) + Y0;
  }

  /* =========================================================
     4단계: 태양 폭풍과 지구 (태양풍 · 지구 자기장 · 오로라 · 피해)
     ========================================================= */
  function earthGeo(L) {
    if (L.col) return { P: { x: 8, y: 8, w: 784, h: 584 }, sx: 88, sy: 218, sR: 58, ex: 586, ey: 218, eR: 62, pillY: 428, cards: { x: 24, y: 452, w: 240, h: 122, gap: 14, cols: 3 } };
    return { P: { x: 8, y: 8, w: 504, h: 420 }, sx: 62, sy: 214, sR: 40, ex: 366, ey: 214, eR: 52, pillY: 404, cards: { x: 14, y: 440, w: 492, h: 122, gap: 10, cols: 1 } };
  }
  const LV = [1.9, 2.6, 3.5, 4.8];           // 자기장선 (지구 반지름 단위의 최대 거리)
  function fieldPts(Lv, side, kDay, kTail) {   // side: +1 (밤쪽, 오른쪽) / -1 (낮쪽, 왼쪽). 반환: 위도별 점들
    const lf = Math.acos(1 / Math.sqrt(Lv)), pts = [];
    for (let i = 0; i <= 28; i++) {
      const lat = -lf + 2 * lf * i / 28, r0 = Lv * Math.cos(lat) * Math.cos(lat), k = side > 0 ? kTail : kDay, r = 1 + (r0 - 1) * k;
      pts.push([side * r * Math.cos(lat), -r * Math.sin(lat)]);   // y: 화면 아래가 +
    }
    return pts;
  }
  const stormAmp = (s) => clamp((s - 0.18) / 0.7, 0, 1);
  const stormDmg = (s) => clamp((s - 0.45) / 0.4, 0, 1);
  function startStorm() {
    if (S.storm && !S.storm.done) return false;
    const N = snAt(S.yearA), s = clamp(N / 130, 0.04, 1.25);
    S.storm = { T: 0, s, amp: stormAmp(s), dmg: stormDmg(s), cloud: false, hit: false, done: false, flashId: 0 };
    S.stormOnce = true; S.hit = false; S.auroraT = 0; S.auroraSeen = false;
    Sound.tone(220, 0.25, 'sawtooth', 0.05); Sound.tone(440, 0.3, 'triangle', 0.06, 0.06);
    syncControls();
    return true;
  }
  function earthView() { const V = activeView(); return { V, G: earthGeo(V.L) }; }
  function updateStorm(dt, views) {
    const st = S.storm;
    // 기본 태양풍 입자: 태양 표면에서 부채꼴로 퍼져 나가요
    const N = snAt(S.yearA), rate = (RM ? 10 : 26) * (0.35 + N / 150);
    S.windAcc += rate * dt;
    const { G } = earthView(), sunX = -(G.ex - G.sx) / G.eR, r0 = G.sR / G.eR * 0.95, xs = sunX + r0;
    while (S.windAcc > 1) {
      S.windAcc -= 1;
      if (S.wind.length < 230) { const th = (Math.random() + Math.random() - 1) * 0.5, sp = 1.5 + Math.random() * 0.8 + N / 300; S.wind.push({ k: 0, x: sunX + Math.cos(th) * r0, y: Math.sin(th) * r0, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, a: 0, ph: Math.random() * 6 }); }
    }
    if (st && !st.done) {
      st.T += dt;
      if (st.T >= 0.5 && !st.cloud) {
        st.cloud = true;
        const dist = Math.max(1, -xs - 0.5 - 1.8), v = dist / 3.0, n = RM ? 40 : 150, spread = 0.2 + 0.16 * Math.min(1.2, st.s);
        for (let i = 0; i < n; i++) {
          const th = (Math.random() + Math.random() - 1) * spread * 2.0, rr = r0 * (1.0 + Math.random() * 1.1);
          S.wind.push({ k: 1, x: sunX + Math.cos(th) * rr, y: Math.sin(th) * rr, vx: Math.cos(th) * v * (0.94 + Math.random() * 0.1), vy: Math.sin(th) * v * (0.94 + Math.random() * 0.1), a: 0, ph: Math.random() * 6 });
        }
        views.forEach((Vw) => { const g = earthGeo(Vw.L); Vw.P.burst(g.sx + g.sR * 0.9, g.sy, { count: 14, colors: ['#fff7d6', '#ffd36b', '#fb923c'], speed: 160, gravity: 0, size: 3.4 }); });
      }
      if (st.T >= 3.6 && !st.hit) { st.hit = true; S.hit = true; Sound.tone(110, 0.4, 'sine', 0.14); Sound.tone(330, 0.2, 'triangle', 0.06, 0.1); S.shake = 0.5; }
      if (st.T >= 18) { st.done = true; syncControls(); }
    }
    // 오로라 세기
    let target = 0;
    if (st && st.hit && !st.done) { const u = st.T - 3.6; target = st.amp * clamp(u / 1.4, 0, 1) * (1 - clamp((st.T - 11) / 4.5, 0, 1)); }
    S.aurora = approach(S.aurora, target, dt, 3);
    if (S.aurora > 0.6) { S.auroraT += dt; if (S.auroraT >= 1) S.auroraSeen = true; }
    // 입자 이동
    const kD = st && st.hit ? lerp(0.58, 0.8, clamp((st.T - 3.6) / 6, 0, 1)) : 0.8;
    for (let i = S.wind.length - 1; i >= 0; i--) {
      const p = S.wind[i];
      if (p.k === 2) { // 자기장선을 타고 극지방으로
        p.u += dt / p.dur;
        if (p.u >= 1) { S.wind.splice(i, 1); continue; }
        continue;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.a = Math.min(1, p.a + dt * 2.5);
      const d = Math.hypot(p.x, p.y);
      if (p.x < 0.6 && d < 1.78 * (kD / 0.8)) {
        if (p.k === 1 && st && st.hit && Math.abs(p.y) < 1.5 && Math.random() < 0.5) {
          S.wind[i] = { k: 2, Lv: 2.0 + Math.random() * 1.8, h: Math.random() < 0.5 ? 1 : -1, u: 0, dur: 0.9 + Math.random() * 0.9, ph: Math.random() * 6 };
          continue;
        }
        const nx = p.x / (d || 1), ny = p.y / (d || 1), sp = Math.hypot(p.vx, p.vy), sg = ny >= 0 ? 1 : -1;
        p.x = nx * 1.8; p.y = ny * 1.8; p.vx = Math.abs(-ny) * sp * 0.9 + 0.2; p.vy = sg * Math.abs(nx) * sp * 0.9;
      } else if (p.x > 0 && p.x < 3.2 && Math.abs(p.y) < 1.8) {
        p.y += (p.y >= 0 ? 1 : -1) * dt * 1.3;
      }
      if (p.x > 9.5 || Math.abs(p.y) > 6) S.wind.splice(i, 1);
    }
  }
  const approach = SciSim.approach;
  function windScreen(G, p) { return { x: G.ex + p.x * G.eR, y: G.ey + p.y * G.eR }; }
  // 지구 (왼쪽 = 낮, 오른쪽 = 밤)
  function drawEarthBig(ctx, x, y, r, t) {
    const ag = ctx.createRadialGradient(x, y, r * 0.95, x, y, r * 1.3);
    ag.addColorStop(0, 'rgba(120,190,255,.5)'); ag.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = ag; circle(ctx, x, y, r * 1.3); ctx.fill();
    const og = ctx.createRadialGradient(x - r * 0.45, y - r * 0.15, r * 0.05, x, y, r * 1.05);
    og.addColorStop(0, '#6fb4ff'); og.addColorStop(0.5, '#2d6fd0'); og.addColorStop(1, '#0d2f72');
    ctx.fillStyle = og; circle(ctx, x, y, r); ctx.fill();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    const spin = RM ? 0 : t * 0.07;
    const blob = (lon, lat, w, h, col) => { const L = lon + spin, c = Math.cos(L); if (c < -0.15) return; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x + r * Math.sin(L) * Math.cos(lat), y - r * Math.sin(lat), Math.max(0.5, w * r * Math.max(0.15, c)), h * r * Math.cos(lat * 0.8), 0, 0, TAU); ctx.fill(); };
    [[0.3, 0.45, 0.32, 0.22], [2.1, -0.2, 0.28, 0.3], [3.8, 0.35, 0.36, 0.2], [5.2, -0.5, 0.22, 0.16], [1.0, 0.1, 0.18, 0.12], [4.6, 0.0, 0.2, 0.24]].forEach((c) => { blob(c[0], c[1], c[2], c[3], '#4aa35a'); blob(c[0] + 0.05, c[1] - 0.04, c[2] * 0.6, c[3] * 0.6, '#8fbf6a'); });
    ctx.globalAlpha = 0.7; [[1.0, 0.15, 0.5, 0.06], [2.8, -0.5, 0.4, 0.05], [4.4, 0.6, 0.45, 0.05], [5.8, -0.05, 0.35, 0.06], [0.2, -0.2, 0.4, 0.05]].forEach((c) => blob(c[0], c[1], c[2], c[3], '#f4f8ff')); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(245,250,255,.9)'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.95, r * 0.45, r * 0.17, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y + r * 0.96, r * 0.4, r * 0.14, 0, 0, TAU); ctx.fill();
    // 밤 (태양 반대쪽)
    const ng = ctx.createLinearGradient(x - r * 0.45, y, x + r * 0.85, y);
    ng.addColorStop(0, 'rgba(3,6,20,0)'); ng.addColorStop(0.55, 'rgba(3,6,20,.62)'); ng.addColorStop(1, 'rgba(3,6,20,.9)');
    ctx.fillStyle = ng; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    // 밤 도시 불빛
    const rr = rng(5);
    for (let i = 0; i < 26; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * r * 0.9, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; if (px > x + r * 0.15) { ctx.fillStyle = 'rgba(255,214,120,' + (0.35 + 0.4 * rr()) + ')'; ctx.fillRect(px, py, 1.6, 1.6); } }
    ctx.restore();
    ctx.strokeStyle = 'rgba(180,215,255,.45)'; ctx.lineWidth = 1.5; circle(ctx, x, y, r); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(x - r * 0.42, y - r * 0.5, r * 0.26, r * 0.13, -0.6, 0, TAU); ctx.fill();
  }
  function drawAurora(ctx, G, t, A) {
    if (A < 0.02) return;
    const r = G.eR, N = 44;
    ctx.save();
    [1, -1].forEach((h) => {          // h = 1: 북극 쪽(위), h = -1: 남극 쪽(아래)
      const cy = G.ey - h * r * 0.88, rx = r * 0.5, ry = r * 0.17;
      // 오로라 띠(오벌) 바닥의 은은한 빛
      const gl = ctx.createRadialGradient(G.ex, cy, 0, G.ex, cy, rx * 1.7);
      gl.addColorStop(0, 'rgba(110,231,183,' + (0.42 * A) + ')'); gl.addColorStop(1, 'rgba(110,231,183,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(G.ex, cy, rx * 1.7, ry * 2.4, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      // 커튼: 앞쪽(관측자 쪽)이 더 밝고 뒤쪽은 어둡게
      for (let i = 0; i < N; i++) {
        const ph = i / N * TAU, front = Math.sin(ph) * h * -1 < 0;   // 화면 아래쪽 호가 앞쪽
        const bx = G.ex + Math.cos(ph) * rx, by = cy + Math.sin(ph) * ry;
        const wv = 0.5 + 0.5 * Math.sin(RM ? ph * 3 : t * 1.7 + ph * 3.1) * Math.sin(RM ? 1 : t * 0.9 + ph * 1.3 + 1);
        const hh = r * (0.26 + 0.55 * wv + 0.08 * Math.sin(RM ? 0 : t * 4.2 + i * 1.9)) * A * (Math.sin(ph) * h * -1 > 0 ? 0.75 : 1);
        const sway = RM ? 0 : Math.sin(t * 1.3 + i * 0.4) * 2.5, bw = rx * TAU / N * 1.25;
        const y1 = by - h * hh;
        const g = ctx.createLinearGradient(0, by, 0, y1);
        const al = (front ? 0.55 : 0.32) * A;
        g.addColorStop(0, 'rgba(167,243,208,' + al + ')'); g.addColorStop(0.45, 'rgba(52,211,153,' + (al * 0.7) + ')'); g.addColorStop(0.8, 'rgba(45,170,150,' + (al * 0.28) + ')'); g.addColorStop(1, 'rgba(236,72,153,' + (al * 0.5) + ')');
        ctx.fillStyle = g; ctx.fillRect(bx - bw / 2 + sway, Math.min(by, y1), bw, Math.abs(hh));
      }
      ctx.globalCompositeOperation = 'source-over';
    });
    ctx.restore();
  }
  function drawSat(ctx, x, y, s, glitch, t) {
    ctx.save(); ctx.translate(x + (glitch > 0 && !RM ? (Math.random() - 0.5) * 6 * glitch : 0), y + (glitch > 0 && !RM ? (Math.random() - 0.5) * 4 * glitch : 0)); ctx.scale(s, s);
    if (glitch > 0 && (RM || Math.sin(t * 40) > -0.3)) ctx.globalAlpha = 1; else if (glitch > 0) ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#3b6fd6'; ctx.fillRect(-15, -3, 9, 6); ctx.fillRect(6, -3, 9, 6);
    ctx.strokeStyle = '#9fc2ff'; ctx.lineWidth = 0.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-15 + i * 3, -3); ctx.lineTo(-15 + i * 3, 3); ctx.moveTo(6 + i * 3, -3); ctx.lineTo(6 + i * 3, 3); ctx.stroke(); }
    const g = ctx.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, '#f1f5ff'); g.addColorStop(1, '#8c97b8');
    ctx.fillStyle = g; ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(-2, -7, 4, 2); ctx.beginPath(); ctx.arc(0, 8, 3, 0, Math.PI); ctx.fillStyle = '#e8edf8'; ctx.fill();
    if (glitch > 0.3) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(8, -8, 1.8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawEffectCards(ctx, L, G, t, st) {
    const C = G.cards, fs = L.fs, dmg = st && st.hit && !st.done ? st.dmg * clamp((st.T - 3.6) / 1.2, 0, 1) * (1 - clamp((st.T - 14) / 3.5, 0, 1)) : 0;
    const items = [
      { icon: 'sat', t: '인공위성', ok: '정상 작동', bad: '고장·GPS 오차' },
      { icon: 'radio', t: '장거리 통신', ok: '정상', bad: '전파 끊김' },
      { icon: 'grid', t: '송전망', ok: '정상', bad: '정전 위험' },
    ];
    items.forEach((it, i) => {
      const x = C.cols === 3 ? C.x + i * (C.w + C.gap) : C.x, y = C.cols === 3 ? C.y : C.y + i * (C.h + C.gap), w = C.w, h = C.h;
      const bad = dmg > 0.15;
      roundRect(ctx, x, y, w, h, 12);
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, bad ? '#3a1a22' : '#16264f'); g.addColorStop(1, bad ? '#27101a' : '#0e1a3c');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = bad ? 'rgba(251,113,133,.8)' : 'rgba(160,190,255,.35)'; ctx.lineWidth = bad ? 2 : 1.3; ctx.stroke();
      const ix = x + 50 * (L.col ? 1 : 1.1), iy = y + h / 2;
      ctx.save(); ctx.translate(ix, iy);
      const jit = bad && !RM ? (Math.random() - 0.5) * 3 * dmg : 0;
      ctx.translate(jit, 0);
      if (it.icon === 'sat') { drawSat(ctx, 0, 0, 1.7, bad ? dmg : 0, t); }
      else if (it.icon === 'radio') {
        ctx.fillStyle = '#cfd8ee'; ctx.fillRect(-3, -8, 6, 34); ctx.beginPath(); ctx.moveTo(-10, 26); ctx.lineTo(0, -10); ctx.lineTo(10, 26); ctx.strokeStyle = '#cfd8ee'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#ef4444'; circle(ctx, 0, -12, 3.4); ctx.fill();
        ctx.strokeStyle = bad ? 'rgba(251,113,133,.9)' : 'rgba(94,234,212,.9)'; ctx.lineWidth = 2.2;
        for (let k = 1; k <= 3; k++) { const a = bad && (Math.floor(t * 8) + k) % 2 ? 0.25 : 1; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(0, -12, 8 + k * 7, -2.5, -0.64); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -12, 8 + k * 7, Math.PI + 0.64, Math.PI + 2.5, false); ctx.stroke(); }
        ctx.globalAlpha = 1;
        if (bad) { ctx.strokeStyle = '#fb7185'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-22, 8); ctx.lineTo(22, -26); ctx.moveTo(22, 8); ctx.lineTo(-22, -26); ctx.stroke(); }
      } else {
        ctx.strokeStyle = '#cfd8ee'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-14, 26); ctx.lineTo(0, -20); ctx.lineTo(14, 26); ctx.moveTo(-9, 10); ctx.lineTo(9, 10); ctx.moveTo(-18, -8); ctx.lineTo(18, -8); ctx.stroke();
        ctx.strokeStyle = 'rgba(207,216,238,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.quadraticCurveTo(-34, 2, -46, -2); ctx.moveTo(18, -8); ctx.quadraticCurveTo(34, 2, 46, -2); ctx.stroke();
        if (bad && !RM) { for (let k = 0; k < 3; k++) { if (Math.random() < 0.7) { const sx = (Math.random() < 0.5 ? -1 : 1) * (22 + Math.random() * 20), sy = -2 + Math.random() * 8; ctx.fillStyle = '#fde047'; ctx.fillRect(sx, sy, 2.6, 2.6); ctx.strokeStyle = 'rgba(253,224,71,.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (Math.random() - 0.5) * 12, sy - 8 - Math.random() * 6); ctx.stroke(); } } }
      }
      ctx.restore();
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold'); ctx.fillText(it.t, x + 100 * (L.col ? 0.9 : 1.05), y + 38 * fs / 1.1);
      const led = bad ? (RM || Math.floor(t * 4) % 2 ? '#ef4444' : '#7f1d1d') : '#34d399';
      ctx.fillStyle = led; circle(ctx, x + 108 * (L.col ? 0.9 : 1.05), y + 68 * fs / 1.1, 6); ctx.fill();
      ctx.fillStyle = bad ? '#fecaca' : '#a7f3d0'; ctx.font = fnt(L, 14, 'bold'); ctx.fillText(bad ? it.bad : it.ok, x + 122 * (L.col ? 0.9 : 1.05), y + 73 * fs / 1.1);
    });
  }
  function drawEarthScene(ctx, L, t, V) {
    const G = earthGeo(L), P = G.P, fs = L.fs, st = S.storm, N = snAt(S.yearA);
    ctx.save(); roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.clip();
    ctx.drawImage(sprite('earthBg' + L.key, P.w, P.h, (g, w, h) => {
      const bg = g.createRadialGradient(G.ex - P.x, G.ey - P.y, 20, G.ex - P.x, G.ey - P.y, P.w);
      bg.addColorStop(0, '#16224a'); bg.addColorStop(1, '#050a1c'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const sgl = g.createRadialGradient(G.sx - P.x, G.sy - P.y, G.sR * 0.6, G.sx - P.x, G.sy - P.y, G.sR * 2.8);
      sgl.addColorStop(0, 'rgba(255,196,100,.55)'); sgl.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = sgl; g.fillRect(0, 0, w, h);
    }), P.x, P.y, P.w, P.h);
    drawStars(ctx, L.starsEarth, t, 0.8);
    const shk = S.shake > 0 && !RM ? (Math.random() - 0.5) * 6 * Math.min(1, S.shake * 3) : 0;
    ctx.translate(shk, shk * 0.5);
    // 태양
    drawSunDisc(ctx, G.sx, G.sy, G.sR, { spots: spotsOfYear(S.year).slice(0, 8).map((sp) => ({ sp, lon: sp.lon * 0.6, scale: 0.8 })), t, texA: 0.85 });
    // 플레어 섬광
    if (st && !st.done && st.T < 1.4) {
      const a = st.T / 1.4, fx = G.sx + G.sR * 0.78, fy = G.sy - G.sR * 0.1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, G.sR * (0.5 + a * 1.4));
      fg.addColorStop(0, 'rgba(255,255,255,' + (1 - a) + ')'); fg.addColorStop(0.4, 'rgba(255,230,150,' + (0.7 * (1 - a)) + ')'); fg.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = fg; circle(ctx, fx, fy, G.sR * (0.5 + a * 1.4)); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * (1 - a)) + ')'; ctx.lineWidth = 3 * (1 - a) + 0.6; circle(ctx, fx, fy, G.sR * (0.3 + a * 1.9)); ctx.stroke(); ctx.restore();
    }
    // 자기장선
    const impact = st && st.hit ? clamp(1 - Math.abs(st.T - 4.2) / 1.2, 0, 1) : 0;
    const kD = st && st.hit && !st.done ? lerp(0.78, 0.55, clamp((st.T - 3.6) / 0.8, 0, 1)) + (RM ? 0 : Math.sin(t * 9) * 0.02 * impact) : 0.8, kT = 1.25;
    ctx.save(); ctx.translate(G.ex, G.ey);
    LV.forEach((Lv, li) => {
      [1, -1].forEach((sd) => {
        const pts = fieldPts(Lv, sd, kD, kT);
        ctx.strokeStyle = 'rgba(147,197,253,' + (0.62 - li * 0.1) + ')'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 6]); ctx.lineDashOffset = RM ? 0 : -t * 20 * (li % 2 ? -1 : 1);
        ctx.beginPath(); pts.forEach((q, i) => { if (i) ctx.lineTo(q[0] * G.eR, q[1] * G.eR); else ctx.moveTo(q[0] * G.eR, q[1] * G.eR); }); ctx.stroke();
      });
    });
    ctx.setLineDash([]);
    // 자기장 경계(활모양 충격면)
    ctx.strokeStyle = 'rgba(94,234,212,' + (0.3 + 0.35 * impact) + ')'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.ellipse(0, 0, G.eR * (1.8 * (kD / 0.8)), G.eR * 2.25, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 지구
    drawEarthBig(ctx, G.ex, G.ey, G.eR, t);
    // 위성
    const gl = st && st.hit && !st.done ? st.dmg * clamp((st.T - 3.6) / 1.2, 0, 1) * (1 - clamp((st.T - 14) / 3.5, 0, 1)) : 0;
    S.sats.forEach((sa, i) => { const a = sa.a + (RM ? 0 : t * sa.sp); drawSat(ctx, G.ex + Math.cos(a) * G.eR * 1.7, G.ey + Math.sin(a) * G.eR * 0.95 * (i ? 1.0 : 0.8) - G.eR * 0.1, L.col ? 1.3 : 1.1, gl > 0.15 ? gl : 0, t); });
    // 태양풍 입자
    ctx.save();
    if (st && !st.done && st.cloud && !st.hit) {   // 폭풍 입자 구름의 은은한 빛
      let cxm = 0, n = 0; S.wind.forEach((p) => { if (p.k === 1) { cxm += p.x; n++; } });
      if (n > 6) { const q = windScreen(G, { x: cxm / n, y: 0 }), gg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 120 * (L.col ? 1 : 0.8)); gg.addColorStop(0, 'rgba(255,170,90,.26)'); gg.addColorStop(1, 'rgba(255,140,60,0)'); ctx.fillStyle = gg; circle(ctx, q.x, q.y, 120 * (L.col ? 1 : 0.8)); ctx.fill(); }
    }
    S.wind.forEach((p) => {
      if (p.k === 2) {
        const lf = Math.acos(1 / Math.sqrt(p.Lv)), lat = 0.12 + (lf - 0.12) * p.u, r0 = p.Lv * Math.cos(lat) * Math.cos(lat), r = 1 + (r0 - 1) * 1.25;
        const x = G.ex + r * Math.cos(lat) * G.eR, y = G.ey - p.h * r * Math.sin(lat) * G.eR;
        const gg = ctx.createRadialGradient(x, y, 0, x, y, 7); gg.addColorStop(0, 'rgba(190,255,220,.95)'); gg.addColorStop(1, 'rgba(110,231,183,0)'); ctx.fillStyle = gg; circle(ctx, x, y, 7); ctx.fill();
        return;
      }
      const q = windScreen(G, p);
      if (q.x < G.sx + G.sR * 0.95 || q.x > P.x + P.w || q.y < P.y || q.y > P.y + P.h) return;
      const fade = clamp((q.x - G.sx - G.sR) / 40, 0, 1) * p.a, big = p.k === 1;
      ctx.fillStyle = big ? 'rgba(255,200,120,' + (0.9 * fade) + ')' : 'rgba(255,238,170,' + (0.75 * fade) + ')';
      circle(ctx, q.x, q.y, big ? 2.8 : 1.8); ctx.fill();
      if (big) { ctx.fillStyle = 'rgba(255,150,80,' + (0.25 * fade) + ')'; circle(ctx, q.x, q.y, 6); ctx.fill(); }
    });
    ctx.restore();
    drawAurora(ctx, G, t, S.aurora);
    ctx.restore();
    // 글자
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('🌍 태양에서 지구로', P.x + 14, P.y + 26 * fs);
    pill(ctx, '☀️ ' + Math.round(S.yearA) + '년 · 흑점 ' + Math.round(N), P.x + P.w - 14, P.y + 24 * fs, { align: 'right', font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), pad: 10, bg: 'rgba(120,53,15,.9)', stroke: '#fbbf24' });
    pill(ctx, '태양', G.sx, G.sy + G.sR + 20 * fs, { font: fnt(L, 13, 'bold'), h: Math.round(20 * fs), pad: 8, bg: 'rgba(6,10,26,.75)', color: '#ffe7a3' });
    pill(ctx, '지구', G.ex, G.ey + G.eR + 22 * fs, { font: fnt(L, 13, 'bold'), h: Math.round(20 * fs), pad: 8, bg: 'rgba(6,10,26,.75)' });
    if (S.aurora > 0.3) { pill(ctx, '오로라', G.ex + G.eR * 1.35, G.ey - G.eR * 1.2, { font: fnt(L, 14, 'bold'), h: Math.round(24 * fs), pad: 10, bg: 'rgba(6,95,70,.92)', stroke: '#6ee7b7' }); }
    if (st && !st.done && st.cloud && !st.hit) pill(ctx, '⚡ 폭풍 입자 이동 중… 실제로는 1~3일 걸려요', P.x + P.w / 2, G.pillY, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 13, bg: 'rgba(124,45,18,.94)', stroke: '#fdba74' });
    else if (st && st.hit && !st.done && st.T < 9) pill(ctx, S.aurora > 0.3 ? '입자가 자기장을 따라 극지방으로 들어와요!' : '입자가 지구에 닿았어요', P.x + P.w / 2, G.pillY, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 13, bg: 'rgba(6,95,70,.94)', stroke: '#6ee7b7' });
    else if (!st || st.done) pill(ctx, S.stormOnce ? '다른 연도로 바꿔 [⚡ 태양 폭풍]을 다시 눌러 봐요' : '☀️ 빛은 약 8분 20초 걸려 지구에 닿아요', P.x + P.w / 2, G.pillY, { font: fnt(L, 13.5, 'bold'), h: Math.round(28 * fs), pad: 12, bg: 'rgba(10,16,40,.85)', stroke: 'rgba(160,190,255,.45)' });
    panelEdge(ctx, P);
    drawEffectCards(ctx, L, G, t, st);
    if (isNew('earth')) newRing(ctx, L, P.x, P.y, P.w, P.h);
    void V;
  }

  /* ---- 영향 고르기 카드 ---- */
  const EFFECTS = [
    { icon: '🌌', text: '오로라가 더 자주, 더 낮은 위도에서도 보인다', ok: true },
    { icon: '🍂', text: '계절이 바뀐다', ok: false, why: '계절이 바뀌는 까닭은 지구의 자전축이 기울어진 채 공전하기 때문이에요. 태양 폭풍과는 관계없어요.' },
    { icon: '🛰️', text: '인공위성이 고장나거나 GPS에 오차가 생긴다', ok: true },
    { icon: '🌙', text: '달의 모양이 바뀐다', ok: false, why: '달의 모양(위상)은 달이 지구 둘레를 돌면서 햇빛을 받는 부분이 달라져서 바뀌어요. 태양 폭풍과는 관계없어요.' },
    { icon: '📻', text: '멀리 있는 곳과의 무선 통신이 끊긴다', ok: true },
    { icon: '🔌', text: '송전망이 고장 나 정전이 일어날 수 있다', ok: true },
  ];
  function cardGeo(L, i) {
    if (L.col) return { x: 8 + (i % 3) * 267, y: 96 + Math.floor(i / 3) * 244, w: 250, h: 230 };
    return { x: 8 + (i % 2) * 254, y: 84 + Math.floor(i / 2) * 252, w: 250, h: 240 };
  }
  function drawCards(ctx, L, t) {
    const fs = L.fs;
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 16, 'bold'); ctx.fillText('🌍 태양 폭풍이 지구에 미치는 영향은?', 14, 30 * fs);
    ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 13.5); ctx.fillText('맞는 카드 4장을 눌러 고른 뒤 [✔ 확인하기]를 눌러요.', 14, 54 * fs);
    EFFECTS.forEach((e, i) => {
      const g = cardGeo(L, i), sel = S.cards[i], pu = sel ? 1 : 0;
      ctx.save(); ctx.translate(g.x + g.w / 2, g.y + g.h / 2); const sc = sel ? 1.025 : 1; ctx.scale(sc, sc); ctx.translate(-g.w / 2, -g.h / 2);
      ctx.shadowColor = sel ? 'rgba(94,234,212,.5)' : 'rgba(0,0,0,.4)'; ctx.shadowBlur = sel ? 20 : 10; ctx.shadowOffsetY = 4;
      roundRect(ctx, 0, 0, g.w, g.h, 16);
      const gg = ctx.createLinearGradient(0, 0, 0, g.h); gg.addColorStop(0, sel ? '#1d4a63' : '#1d3470'); gg.addColorStop(1, sel ? '#0f2f45' : '#101f48');
      ctx.fillStyle = gg; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = sel ? '#5eead4' : 'rgba(160,190,255,.4)'; ctx.lineWidth = sel ? 3.2 : 1.5; ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = Math.round(56 * fs / (L.col ? 1 : 1.1)) + 'px ' + FONT; ctx.fillStyle = '#fff'; ctx.fillText(e.icon, g.w / 2, 80 * fs / 1.1);
      ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15.5, 'bold');
      const lines = []; let line = ''; e.text.split(' ').forEach((w) => { if (ctx.measureText(line + ' ' + w).width > g.w - 28 && line) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w; }); lines.push(line);
      lines.forEach((ln, k) => ctx.fillText(ln, g.w / 2, 128 * fs / 1.1 + k * 23 * fs / 1.1));
      if (sel) { ctx.fillStyle = '#10b981'; circle(ctx, g.w - 20, 20, 13); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; checkMark(ctx, g.w - 20, 20, 10); ctx.lineCap = 'butt'; }
      ctx.restore();
      void pu;
    });
    const n = S.cards.filter(Boolean).length;
    pill(ctx, '고른 카드 ' + n + '장', L.vw - 14, 28 * fs, { align: 'right', font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: 'rgba(14,165,233,.9)' });
  }
  function cardHit(L, p) {
    for (let i = 0; i < EFFECTS.length; i++) { const g = cardGeo(L, i); if (p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h) return i; }
    return -1;
  }

  /* =========================================================
     조작
     ========================================================= */
  const filterBtn = $('#filterBtn'), dayEl = $('#sDay'), yearEl = $('#sYear'), stormBtn = $('#stormBtn');
  function setFilter(on_, instant) {
    S.filter = !!on_;
    SciSim.tween(S, { capA: S.filter ? 1 : 0 }, { duration: instant ? 0.001 : 0.7, ease: 'inOutCubic' });
    if (S.filter) { S.photoHint = true; if (!instant) { Sound.tone(660, 0.1, 'triangle', 0.07); Sound.tone(990, 0.14, 'triangle', 0.06, 0.1); } } else { S.lens = null; S.lensA = 0; }
    syncControls();
  }
  filterBtn.addEventListener('click', () => { Sound.click(); setFilter(!S.filter); });
  function setDay(d, instant) {
    d = clamp(Math.round(d), 1, 14); S.day = d;
    SciSim.tween(S, { dayA: d }, { duration: instant ? 0.001 : 0.5, ease: 'inOutCubic' });
    dayEl.value = d; dayEl.dispatchEvent(new Event('input'));
  }
  SciSim.bindRange(dayEl, $('#oDay'), (v) => v + '일째', (v) => { S.day = v; SciSim.tween(S, { dayA: v }, { duration: 0.5, ease: 'inOutCubic' }); Sound.tick(); });
  SciSim.bindRange(yearEl, $('#oYear'), (v) => v + '년 · 흑점 ' + SN[v - Y0], (v) => { setYear(v); Sound.tick(); });
  stormBtn.addEventListener('click', () => { Sound.click(); startStorm(); });
  function setScene(s) {
    if (S.scene !== s) {
      S.scene = s; S.sceneA = 0; SciSim.tween(S, { sceneA: 1 }, { duration: 0.45, ease: 'outCubic' });
      if (s === 'activity') { S.barA = 0; SciSim.tween(S, { barA: 1 }, { duration: 1.3, ease: 'outCubic' }); }
    }
    syncControls();
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.s); }));
  function syncControls() {
    const free = isFree(), sc = S.scene;
    $('#cScene').classList.toggle('is-off', !free);
    $('#cFilter').classList.toggle('is-off', sc !== 'photo');
    $('#cDays').classList.toggle('is-off', sc !== 'photo');
    $('#cYears').classList.toggle('is-off', !(sc === 'activity' || sc === 'earth'));
    $('#cStorm').classList.toggle('is-off', sc !== 'earth');
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === sc));
    filterBtn.setAttribute('aria-pressed', S.filter ? 'true' : 'false');
    filterBtn.classList.toggle('on-state', S.filter);
    filterBtn.innerHTML = S.filter ? '🕶️ 태양 필터 끼움 ✔' : '🕶️ 태양 필터 끼우기';
    $('#filterNote').textContent = S.filter ? '필터를 눌러 빼면 다시 닫혀요.' : '필터가 없으면 태양을 볼 수 없어요.';
    const running = S.storm && !S.storm.done;
    stormBtn.disabled = !!running;
    stormBtn.innerHTML = running ? '⏳ 폭풍 진행 중…' : S.storm && S.storm.done ? '🔁 다시 태양 폭풍' : '⚡ 태양 폭풍';
    $('#stormNote').textContent = running ? '입자가 지구로 가는 모습을 지켜봐요.' : '연도(흑점 수)에 따라 폭풍의 세기가 달라져요.';
    const any = ['#cScene', '#cFilter', '#cDays', '#cYears', '#cStorm'].some((q) => { const n = $(q); return !n.classList.contains('is-off') && !n.hidden; });
    $('#ctrlCard').hidden = !any;
  }

  /* ---------- 포인터 ---------- */
  function hitDayDot(L, p) {
    if (!(on('days') || isFree())) return -1;
    const G = photoGeo(L);
    for (let i = 0; i < 14; i++) { const q = DAY_X(G, i); if (Math.hypot(p.x - q.x, p.y - q.y) < 21) return i + 1; }
    return -1;
  }
  function tipPeak(text, good) { S.peakMsg = { text, good: !!good, t0: nowS() }; }
  function markPeak(V, year) {
    const pk = peakOf(year);
    if (pk >= 0) {
      if (!S.found[pk]) {
        S.found[pk] = true; Sound.tone(880, 0.12, 'triangle', 0.08);
        const G = actGeo(V.L); ringFx(V, barX(G, PEAKS[pk].mid - Y0), barY(G, PEAKS[pk].max) - 18, 16);
        V.P.burst(barX(G, PEAKS[pk].mid - Y0), barY(G, PEAKS[pk].max) - 18, { count: 12, colors: ['#34d399', '#5eead4', '#fde68a'], speed: 110, gravity: 100, size: 3 });
        tipPeak('✅ 극대기 찾았어요! (' + PEAKS[pk].name + ')', true);
      }
    } else if (game && !isFree() && game.level === 2 && game.index === 6) { Sound.fail(); tipPeak('🤔 ' + year + '년은 극대기가 아니에요. 가장 높은 막대를 찾아요', false); }
  }
  function attachPointer(V) {
    const { v, L } = V;
    let drag = null;
    SciSim.pointer(v, {
      hover(p) {
        if (S.scene === 'photo') return (hitDayDot(L, p) > 0 || (S.filter && photoHit(L, p))) ? 'pointer' : null;
        if (S.scene === 'atmo') { const G = atmoGeo(L); return Math.hypot(p.x - (G.cx + S.occSp.x.value * G.R), p.y - (G.cy + S.occSp.y.value * G.R)) < G.R ? 'grab' : (atmoHit(L, p) ? 'pointer' : null); }
        if (S.scene === 'activity') return actHit(L, p) ? 'pointer' : null;
        if (S.scene === 'cards') return cardHit(L, p) >= 0 ? 'pointer' : null;
        return null;
      },
      down(p) {
        if (S.scene === 'photo') {
          const dd = hitDayDot(L, p);
          if (dd > 0) { setDay(dd); Sound.tick(); return false; }
          if (!S.filter || S.capA < 0.9) return false;
          const h = photoHit(L, p);
          if (!h) return false;
          S.photoHint = false;
          S.lens = { u: h.u, v: h.v, tu: h.u, tv: h.v }; S.lensA = 0.001; SciSim.tween(S, { lensA: 1 }, { duration: 0.3, ease: 'outBack' });
          drag = { type: 'lens', moved: false, x0: p.x, y0: p.y, t0: performance.now(), h };
          return true;
        }
        if (S.scene === 'atmo') {
          const G = atmoGeo(L), ox = G.cx + S.occSp.x.value * G.R, oy = G.cy + S.occSp.y.value * G.R;
          if (Math.hypot(p.x - ox, p.y - oy) < G.R * 1.0) {
            S.occDrag = true; S.occTouched = true; drag = { type: 'occ', gx: p.x - ox, gy: p.y - oy };
            Sound.tone(620, 0.05, 'triangle', 0.05); v.canvas.style.cursor = 'grabbing'; return true;
          }
          const h = atmoHit(L, p);
          if (h && game && (isFree() || game.level === 1)) {
            S.atmoLab[h.key] = true; Sound.tone(880, 0.1, 'triangle', 0.07);
            S.pops = S.pops.filter((q) => q.key !== h.key);
            const dx = h.key === 'corona' ? 44 : h.key === 'chromo' ? 42 : 40, dy = h.key === 'corona' ? 34 : h.key === 'chromo' ? -36 : -42;
            S.pops.push({ key: h.key, text: h.name, u: h.u, v: h.v, col: h.col, t0: nowS(), dx: h.u < -0.2 ? -dx - 20 : dx, dy });
            ringFx(V, p.x, p.y, 10, '#5eead4');
          }
          return false;
        }
        if (S.scene === 'activity') {
          const y = actHit(L, p);
          if (y) { setYear(y); yearEl.value = y; yearEl.dispatchEvent(new Event('input')); drag = { type: 'year' }; return true; }
          return false;
        }
        if (S.scene === 'cards') {
          const i = cardHit(L, p);
          if (i >= 0) { S.cards[i] = !S.cards[i]; Sound.click(); const g = cardGeo(L, i); ringFx(V, g.x + g.w / 2, g.y + g.h / 2, 34, '#5eead4'); }
          return false;
        }
        return false;
      },
      move(p) {
        if (!drag) return;
        if (drag.type === 'lens') {
          const G = photoGeo(L);
          if (Math.hypot(p.x - drag.x0, p.y - drag.y0) > 8) drag.moved = true;
          let u = (p.x - G.cx) / G.R, w = (p.y - G.cy) / G.R, d = Math.hypot(u, w);
          if (d > 0.97) { u *= 0.97 / d; w *= 0.97 / d; }
          S.lens.tu = u; S.lens.tv = w;
        } else if (drag.type === 'occ') {
          const G = atmoGeo(L);
          let ox = (p.x - drag.gx - G.cx) / G.R, oy = (p.y - drag.gy - G.cy) / G.R;
          if (Math.hypot(ox, oy) < 0.14) { if (!S.snapped) { S.snapped = true; Sound.tone(520, 0.06, 'square', 0.05); Sound.tone(780, 0.1, 'triangle', 0.07, 0.04); ringFx(V, G.cx, G.cy, G.R, '#5eead4'); } ox = 0; oy = 0; } else S.snapped = false;
          S.occSp.x.target = ox; S.occSp.y.target = oy;
        } else if (drag.type === 'year') {
          const y = actHit(L, p);
          if (y && y !== S.year) { setYear(y); yearEl.value = y; yearEl.dispatchEvent(new Event('input')); }
        }
      },
      up(p) {
        v.canvas.style.cursor = '';
        if (!drag) return;
        if (drag.type === 'lens') {
          if (!drag.moved) {
            const h = drag.h;
            S.lens.tu = S.lens.u = h.u; S.lens.tv = S.lens.v = h.v;
            if (h.type === 'spot') { if (!S.labs.spot) Sound.tone(880, 0.12, 'triangle', 0.08); S.labs.spot = true; S.pops = S.pops.filter((q) => q.key !== 'spot'); S.pops.push({ key: 'spot', si: h.i, text: '흑점', u: h.u, v: h.v, col: '#fbbf24', t0: nowS() }); ringFx(V, p.x, p.y, 16, '#fbbf24'); }
            else { if (!S.labs.gran) Sound.tone(880, 0.12, 'triangle', 0.08); S.labs.gran = true; S.pops = S.pops.filter((q) => q.key !== 'gran'); S.pops.push({ key: 'gran', text: '쌀알 무늬', u: h.u, v: h.v, col: '#fde68a', t0: nowS() }); ringFx(V, p.x, p.y, 16, '#fde68a'); }
          }
        } else if (drag.type === 'occ') { S.occDrag = false; }
        else if (drag.type === 'year') { markPeak(V, S.year); }
        drag = null;
      },
    });
    if (L.key === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0]; if (!tc) return;
        const p = v.toLocal(tc);
        // pointerdown은 touchstart보다 먼저 일어나므로, 이미 끌기가 시작됐으면(drag) 페이지 스크롤을 막아요
        const G = atmoGeo(L);
        if (drag || (S.scene === 'atmo' && Math.hypot(p.x - (G.cx + S.occSp.x.value * G.R), p.y - (G.cy + S.occSp.y.value * G.R)) < G.R) || (S.scene === 'photo' && S.filter && photoHit(L, p)) || (S.scene === 'activity' && actHit(L, p))) e.preventDefault();
      }, { passive: false });
    }
  }
  const V2 = [];
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#070d1f' });
    L.starsPhoto = makeStars({ x: 0, y: 0, w: L.vw, h: L.vh }, 70, k === 'wide' ? 3 : 5);
    L.starsAtmo = makeStars(atmoGeo(L).P, 90, 13);
    L.starsAct = makeStars(actGeo(L).D, 30, 17);
    L.starsEarth = makeStars(earthGeo(L).P, 100, 19);
    const V = { v, L, fx: [], P: new SciSim.Particles() };
    attachPointer(V);
    V2.push(V);
    return V;
  });
  const activeView = () => views.find((V) => V.v.canvas.offsetWidth > 0) || views[0];
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

  /* =========================================================
     전체 그리기
     ========================================================= */
  function draw(V, t) {
    const { v, L } = V, ctx = v.ctx;
    v.clear('#070d1f');
    const sc = S.scene;
    if (sc === 'photo') drawPhoto(ctx, L, t, V);
    else if (sc === 'atmo') drawAtmo(ctx, L, t, V);
    else if (sc === 'activity') drawActivity(ctx, L, t, V);
    else if (sc === 'earth') drawEarthScene(ctx, L, t, V);
    else {
      const bg = ctx.createRadialGradient(L.vw / 2, L.vh * 0.35, 20, L.vw / 2, L.vh / 2, L.vw);
      bg.addColorStop(0, '#16224a'); bg.addColorStop(1, '#050a1c'); ctx.fillStyle = bg; ctx.fillRect(0, 0, L.vw, L.vh);
      drawStars(ctx, L.starsPhoto, t, 0.5);
      drawCards(ctx, L, t);
    }
    V.P.draw(ctx);
    drawFx(ctx, V);
    if (S.sceneA < 0.995) { ctx.fillStyle = 'rgba(7,13,31,' + ((1 - S.sceneA) * 0.94) + ')'; ctx.fillRect(0, 0, L.vw, L.vh); }
  }

  /* =========================================================
     퀴즈·노트 그림 (SVG)
     ========================================================= */
  const SVG_OPEN = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FONT.replace(/"/g, '') + '\'>';
  const FIG = {};
  FIG.spots = (function () {
    const W = 340, H = 176, R = 38, cy = 86, xs = [56, 170, 284];
    let s = SVG_OPEN(W, H, '같은 흑점을 1일, 4일, 7일째 관측한 모습') + '<defs><radialGradient id="fsD" cx="42%" cy="40%" r="70%"><stop offset="0" stop-color="#fff3cf"/><stop offset=".75" stop-color="#ffcf6a"/><stop offset="1" stop-color="#f2972a"/></radialGradient><marker id="fsA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#fde68a"/></marker></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    s += '<text x="14" y="22" font-size="13" font-weight="800" fill="#9fb3e0">← 동쪽</text><text x="' + (W - 14) + '" y="22" text-anchor="end" font-size="13" font-weight="800" fill="#9fb3e0">서쪽 →</text>';
    [1, 4, 7].forEach((d, k) => {
      const cx = xs[k];
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 5) + '" fill="rgba(255,170,70,.18)"/><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="url(#fsD)"/>';
      [0, 3, 6].forEach((i) => {
        const sp = SPOTS[i], P = spotProj(sp.lat, sp.lon0 + ROT * (d - 1), R);
        if (P.c < 0.1) return;
        const r = sp.r * (R / 214) * 2.5, ang = Math.atan2(P.y, P.x) * 180 / Math.PI, kx = Math.max(0.2, P.c);
        s += '<g transform="translate(' + (cx + P.x).toFixed(1) + ' ' + (cy + P.y).toFixed(1) + ') rotate(' + ang.toFixed(1) + ') scale(' + kx.toFixed(2) + ' 1)"><circle r="' + r.toFixed(1) + '" fill="#8a4a18"/><circle r="' + (r * 0.5).toFixed(1) + '" fill="#2b1408"/></g>';
      });
      s += '<text x="' + cx + '" y="' + (H - 14) + '" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">' + d + '일째</text>';
    });
    [[xs[0] + R + 8, xs[1] - R - 8], [xs[1] + R + 8, xs[2] - R - 8]].forEach((a) => { s += '<path d="M' + a[0] + ',' + cy + ' L' + a[1] + ',' + cy + '" stroke="#fde68a" stroke-width="2.6" marker-end="url(#fsA)" fill="none"/>'; });
    return s + '</svg>';
  })();
  FIG.layers = (function () {
    const W = 340, H = 190, cx = 120, cy = 96, R = 40;
    let s = SVG_OPEN(W, H, '태양 대기의 층: 광구, 채층, 코로나, 홍염') + '<defs><radialGradient id="flD" cx="42%" cy="40%" r="70%"><stop offset="0" stop-color="#fff7da"/><stop offset="1" stop-color="#ffc860"/></radialGradient><radialGradient id="flC"><stop offset=".3" stop-color="#eef4ff" stop-opacity=".9"/><stop offset="1" stop-color="#eef4ff" stop-opacity="0"/></radialGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="86" fill="url(#flC)"/>';
    for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, l = 62 + 20 * Math.abs(Math.sin(i * 1.7)) + (Math.abs(Math.cos(a)) > 0.7 ? 14 : 0); s += '<line x1="' + (cx + Math.cos(a) * R).toFixed(1) + '" y1="' + (cy + Math.sin(a) * R).toFixed(1) + '" x2="' + (cx + Math.cos(a) * l).toFixed(1) + '" y2="' + (cy + Math.sin(a) * l).toFixed(1) + '" stroke="#eef4ff" stroke-opacity=".28" stroke-width="2"/>'; }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 5) + '" fill="none" stroke="#ff4d6d" stroke-width="4" opacity=".9"/><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="url(#flD)"/>';
    s += '<path d="M' + (cx + 26) + ',' + (cy - 33) + ' C' + (cx + 40) + ',' + (cy - 78) + ' ' + (cx + 74) + ',' + (cy - 52) + ' ' + (cx + 40) + ',' + (cy - 18) + '" fill="none" stroke="#ff6b7a" stroke-width="5" stroke-linecap="round"/>';
    const lab = (y, txt, x2, y2, col) => '<line x1="214" y1="' + y + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="1.6"/><circle cx="' + x2 + '" cy="' + y2 + '" r="3.2" fill="' + col + '"/><text x="222" y="' + (y + 5) + '" font-size="15" font-weight="800" fill="' + col + '">' + txt + '</text>';
    s += lab(46, '홍염', cx + 58, cy - 46, '#ff8a8f') + lab(88, '코로나', cx + 78, cy + 8, '#dbe8ff') + lab(128, '채층', cx + 44, cy + 22, '#ff4d6d') + lab(166, '광구', cx + 14, cy + 36, '#ffd36b');
    return s + '</svg>';
  })();
  function cycleSVG() {
    const W = 330, H = 150, px = 14, py = 12, pw = 302, ph = 96, bw = pw / 40;
    let s = SVG_OPEN(W, H, '연평균 흑점 수: 약 11년마다 되풀이') + '<rect width="' + W + '" height="' + H + '" rx="10" fill="#0e1838"/>';
    SN.forEach((n, i) => { const h = n / SN_TOP * ph; s += '<rect x="' + (px + i * bw + 1).toFixed(1) + '" y="' + (py + ph - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" fill="' + (peakOf(i + Y0) >= 0 ? '#34d399' : '#4aa8ff') + '"/>'; });
    [1990, 2001, 2013, 2023.5].forEach((yy, i, a) => { const x = px + (yy - Y0 + 0.5) * bw; s += '<text x="' + x.toFixed(1) + '" y="' + (py + 8) + '" text-anchor="middle" font-size="14" fill="#fde68a">★</text>'; if (i) { const x0 = px + (a[i - 1] - Y0 + 0.5) * bw; s += '<line x1="' + x0.toFixed(1) + '" y1="' + (py + ph + 14) + '" x2="' + x.toFixed(1) + '" y2="' + (py + ph + 14) + '" stroke="#fde68a" stroke-width="1.6" stroke-dasharray="4 3"/><text x="' + ((x0 + x) / 2).toFixed(1) + '" y="' + (py + ph + 32) + '" text-anchor="middle" font-size="12.5" font-weight="800" fill="#fde68a">약 11년</text>'; } });
    s += '<text x="' + px + '" y="' + (H - 4) + '" font-size="11" fill="#9fb3e0">1985</text><text x="' + (px + pw) + '" y="' + (H - 4) + '" text-anchor="end" font-size="11" fill="#9fb3e0">2024</text>';
    return s + '</svg>';
  }

  /* =========================================================
     단계별 학습
     ========================================================= */
  const peakChips = () => PEAKS.map((g, i) => chk(S.found[i], g.name)).join(' · ');
  game = SciSim.game({
    simId: 'm1-sun-activity',
    mount: '#game',
    badge: '태양 관측가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      scope: '🔭 태양 관측 망원경',
      filter: '🕶️ 태양 필터',
      days: '📅 관측일',
      occulter: '🌑 가리개 원판',
      years: '📆 연도 고르기',
      graph: '📈 흑점 수 그래프',
      earth: '🌍 지구 영향 보기',
      storm: '⚡ 태양 폭풍',
    },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart() { S.peakMsg = null; },
    onComplete() { setScene('photo'); if (!S.filter) setFilter(true); syncControls(); },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '태양의 표면', short: '태양의 표면', icon: '🔭', phase: '관찰',
        features: ['scope', 'filter', 'days'],
        intro: '<p class="si-q">❓ 탐구 질문: 태양의 표면은 어떻게 생겼고, 태양에서 일어나는 일이 지구에 어떤 영향을 줄까?</p>' +
          '<p>태양을 관측하는 <b>망원경</b>으로 태양의 표면을 살펴봐요.</p>' +
          '<p>⚠️ <b>안전</b>: 태양은 맨눈·망원경·선글라스로 직접 보면 눈을 크게 다쳐요. 꼭 <b>태양 필터</b>를 쓰고 관측해요!</p>',
        setup() { setScene('photo'); },
        recap: '태양은 꼭 필터를 끼우고 관측해요. 광구에는 쌀알 무늬와 흑점이 있고, 흑점이 움직이는 것은 태양이 자전하기 때문이에요.',
        summary: '<ul><li>⚠️ 태양은 <b>필터(또는 투영법)</b>로만 관측해요. 맨눈·망원경·선글라스로 직접 보면 안 돼요.</li>' +
          '<li><b>광구</b> = 태양의 표면(약 6000 °C). <b>쌀알 무늬</b>는 광구 아래에서 뜨거운 기체가 올라오고(밝은 곳) 식은 기체가 내려가는(어두운 경계) 모습이에요.</li>' +
          '<li><b>흑점</b>은 주위보다 온도가 낮아(약 4000 °C) 어둡게 보여요.</li>' +
          '<li>흑점이 같은 방향으로 움직이고 가장자리에서 납작해지는 것은 공 모양의 <b>태양이 자전</b>하기 때문이에요.</li></ul>',
        missions: [
          {
            title: '🕶️ 안전하게 관측하기',
            goal: '태양을 볼 때는 <b>필터</b>가 꼭 필요해요. [🕶️ 태양 필터]를 끼워 관측 창을 열어요.',
            hint: '아래의 <b>[🕶️ 태양 필터 끼우기]</b> 버튼을 눌러요. 필터가 없으면 뚜껑이 닫혀 있어요.',
            setup() { setScene('photo'); setFilter(false, true); S.lens = null; S.lensA = 0; S.labs = { gran: false, spot: false }; S.pops = []; setDay(1, true); syncControls(); },
            check: () => S.filter && S.capA > 0.95,
            hold: 0.4,
            status: () => chk(S.filter, '태양 필터 끼우기'),
            explain: '태양은 <b>맨눈·망원경·선글라스</b>로 직접 보면 눈을 크게 다칠 수 있어요(실명 위험). 꼭 <b>태양 필터</b>나 투영법을 써서 안전하게 관측해요.',
          },
          {
            title: '🔍 광구 살펴보기',
            goal: '태양 표면을 눌러 <b>돋보기</b>로 보고, <b>쌀알 무늬</b>와 <b>흑점</b>을 눌러 이름표를 붙여요.',
            hint: '밝은 곳을 누르면 <b>쌀알 무늬</b>, 어두운 점을 누르면 <b>흑점</b>이에요. 관측일을 바꾸면 흑점이 움직여요.',
            setup() { setScene('photo'); if (!S.filter) setFilter(true, true); S.lens = null; S.lensA = 0; S.labs = { gran: false, spot: false }; S.pops = []; S.photoHint = true; setDay(1, true); syncControls(); },
            check: () => S.labs.gran && S.labs.spot,
            hold: 0.4,
            status: () => chk(S.labs.gran, '쌀알 무늬') + ' · ' + chk(S.labs.spot, '흑점'),
            explain: '<b>광구</b>는 태양의 표면이에요(약 6000 °C). <b>쌀알 무늬</b>는 광구 아래의 대류 때문에 생겨요(밝은 곳은 뜨거운 기체가 올라오는 곳, 어두운 경계는 식은 기체가 내려가는 곳). <b>흑점</b>은 주위보다 온도가 낮아(약 4000 °C) 어둡게 보여요.',
          },
          {
            type: 'quiz',
            title: '🔄 흑점이 움직인 까닭',
            goal: '그림은 같은 흑점들을 1일, 4일, 7일째 관측한 모습이에요. 흑점이 오른쪽(서쪽)으로 움직이고 가장자리에서 납작해지는 까닭은?',
            figure: FIG.spots,
            setup() { setScene('photo'); if (!S.filter) setFilter(true, true); S.lens = null; S.lensA = 0; setDay(1, true); syncControls(); },
            choices: ['지구가 태양 둘레를 공전하기 때문', '흑점이 태양 표면 위를 기어 다니기 때문', '태양이 자전하기 때문', '흑점이 식어서 사라지고 새로 생기기 때문'],
            answer: 2,
            feedback: [
              '지구의 공전은 1년에 한 바퀴예요. 일주일 동안 이렇게 크게 움직이지 않고, 여러 흑점이 함께 같은 방향으로 움직이는 것과도 맞지 않아요.',
              '여러 흑점이 한꺼번에 같은 방향으로 움직이고 가장자리에서 납작해져요. 공 모양의 태양이 <b>돌고 있다</b>는 증거예요.',
              '',
              '흑점은 며칠 동안 모양을 유지한 채 위치만 옮겨 갔어요. 식어서 사라진다면 위치가 이동하지 않아요.',
            ],
            explain: '여러 흑점이 같은 방향으로 함께 움직이고 가장자리에서 납작해져요. 공 모양의 <b>태양이 자전</b>하기 때문이에요.',
          },
        ],
      },
      /* ---------- 2단계 · 관찰 ---------- */
      {
        title: '태양의 대기', short: '태양의 대기', icon: '🌅', phase: '관찰',
        features: ['occulter'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광구를 관찰했어요. 광구가 너무 밝아서 그 바깥의 희미한 대기는 보이지 않았어요.</div>' +
          '<p>광구를 <b>가리개</b>로 가려 볼까요? 개기 일식 때 달이 광구를 가리는 것과 같아요.</p>',
        setup() { setScene('atmo'); },
        recap: '광구를 가리면 채층·코로나·홍염이 보여요. 코로나는 늘 있지만 광구가 너무 밝아서 평소에는 보이지 않아요.',
        summary: '<div class="note-fig">' + FIG.layers + '</div><ul><li><b>채층</b>: 광구 바로 위의 얇은 붉은 대기층</li>' +
          '<li><b>코로나</b>: 그 바깥으로 멀리 퍼진 진주색 대기 (100만 °C 이상)</li>' +
          '<li><b>홍염</b>: 고온의 기체가 대기로 솟아오르는 현상</li>' +
          '<li>코로나는 늘 있지만 광구가 너무 밝아 평소에는 안 보여요. 개기 일식 때 볼 수 있어요.</li></ul>',
        missions: [
          {
            title: '🌑 광구 가리기',
            goal: '<b>가리개 원판</b>을 끌어 태양의 광구를 꼭 맞게 덮어 봐요. (개기 일식과 같아요)',
            hint: '아래쪽의 어두운 원판을 태양 위로 끌어요. 가까이 가면 <b>딸깍</b> 하고 붙어요. 98 % 이상 가리고 1초 기다려요.',
            setup() { setScene('atmo'); resetOcc(); syncControls(); },
            check: () => S.c >= 0.98,
            hold: 1.0,
            status: () => '가린 정도 <b>' + Math.round(S.c * 100) + ' %</b> · ' + chk(S.c >= 0.98, '꼭 맞게 덮기'),
            explain: '달이 태양을 가리는 <b>개기 일식</b>과 같아요. 눈부신 광구를 가리면 희미한 바깥 대기가 보여요. 코로나는 늘 있지만, 평소에는 광구가 너무 밝아서 보이지 않을 뿐이에요.',
          },
          {
            title: '🏷️ 대기 이름표',
            goal: '드러난 태양의 대기에서 <b>채층·코로나·홍염</b>을 눌러 이름표를 붙여요.',
            hint: '광구 바로 위의 얇은 붉은 띠는 <b>채층</b>, 불꽃처럼 솟는 붉은 고리는 <b>홍염</b>, 멀리 퍼진 진주색 빛은 <b>코로나</b>예요.',
            setup() { setScene('atmo'); resetOcc(); S.occSp.x.value = S.occSp.x.target = 0; S.occSp.y.value = S.occSp.y.target = 0; S.occTouched = true; S.snapped = true; syncControls(); },
            check: () => !!(S.atmoLab.chromo && S.atmoLab.corona && S.atmoLab.prom),
            hold: 0.4,
            status: () => chk(S.atmoLab.chromo, '채층') + ' · ' + chk(S.atmoLab.corona, '코로나') + ' · ' + chk(S.atmoLab.prom, '홍염'),
            explain: '<b>채층</b>은 광구 바로 위의 얇은 붉은 대기층, <b>코로나</b>는 그 바깥으로 멀리 퍼진 진주색 대기(100만 °C 이상), <b>홍염</b>은 고온의 기체가 대기로 솟아오르는 현상이에요.',
          },
          {
            type: 'quiz',
            title: '🌤️ 평소에 코로나가 안 보이는 까닭',
            goal: '코로나는 가리개로 광구를 가렸을 때(또는 개기 일식 때) 잘 보여요. 그렇다면 평소에 코로나가 보이지 않는 까닭은 무엇일까요?',
            setup() { setScene('atmo'); S.occSp.x.value = S.occSp.x.target = 0; S.occSp.y.value = S.occSp.y.target = 0; S.occTouched = true; S.snapped = true; syncControls(); },
            choices: ['코로나는 밤에만 생기기 때문에', '코로나는 일식이 일어날 때만 생기기 때문에', '광구가 너무 밝아서 희미한 코로나가 가려지기 때문에', '지구 대기가 코로나의 빛을 모두 막기 때문에'],
            answer: 2,
            feedback: [
              '태양은 밤에는 보이지 않아요. 코로나는 낮이든 밤이든 늘 태양 둘레에 있어요.',
              '코로나는 일식 때만 생기는 게 아니라 <b>늘 있어요</b>. 일식 때는 달이 광구를 가려서 볼 수 있을 뿐이에요.',
              '',
              '지구 대기도 빛을 조금 흩뜨리지만, 가장 큰 까닭은 <b>광구가 훨씬 밝기</b> 때문이에요. 가리개로 광구를 가리니까 코로나가 보였죠?',
            ],
            explain: '코로나는 <b>늘 있지만</b> 광구가 너무 밝아서 평소에는 보이지 않아요. 달이 광구를 가리는 <b>개기 일식</b> 때나 가리개로 광구를 가렸을 때 볼 수 있어요.',
          },
        ],
      },
      /* ---------- 3단계 · 분석 ---------- */
      {
        title: '태양 활동의 변화', short: '활동 변화', icon: '📈', phase: '분석',
        features: ['years', 'graph'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광구의 흑점과 대기의 홍염을 살펴봤어요.</div>' +
          '<p>이런 현상은 해마다 똑같을까요? <b>연평균 흑점 수</b> 그래프를 분석하고, 해마다 달라지는 태양을 비교해 봐요.</p>',
        setup() { setScene('activity'); setYear(2000, true); },
        recap: '흑점 수는 약 11년 주기로 늘고 줄어요. 흑점이 많은 때는 태양 활동이 활발해서 플레어·홍염이 잦고 코로나가 커져요.',
        summary: '<div class="note-fig">' + cycleSVG() + '</div><ul><li>흑점 수는 <b>약 11년</b>을 주기로 많아졌다 적어졌다를 되풀이해요.</li>' +
          '<li>흑점이 많을 때는 태양 활동이 <b>활발</b>해서 <b>플레어</b>(흑점 부근의 폭발)와 <b>홍염</b>이 잦고 <b>코로나</b>가 커져요.</li>' +
          '<li>활동이 활발하면 <b>태양풍</b>(전기를 띤 입자의 흐름)도 강해져요.</li></ul>',
        missions: [
          {
            title: '📈 극대기 찾기',
            goal: '그래프에서 흑점 수가 가장 많은 <b>극대기</b> 세 곳을 눌러 표시하고, 극대기 사이의 <b>간격</b>이 얼마인지 살펴봐요.',
            hint: '막대가 가장 높게 솟은 해 무리를 찾아요. 1990년 무렵, 2001년 무렵, 2013년 무렵, 2024년 무렵 중 세 곳을 눌러요.',
            setup() { setScene('activity'); S.found = [false, false, false, false]; S.peakMsg = null; setYear(2000, true); syncControls(); },
            check: () => S.found.filter(Boolean).length >= 3,
            hold: 0.8,
            status: () => '찾은 극대기 <b>' + S.found.filter(Boolean).length + ' / 3</b> · ' + peakChips() + (S.found.filter(Boolean).length >= 2 ? '<br>극대기 사이의 간격: <b>약 11년</b>' : ''),
            explain: '흑점 수는 늘었다 줄었다를 되풀이해요. 흑점 수가 가장 많은 <b>극대기</b>가 40년 동안 네 번 나타났고, 극대기 사이의 간격은 <b>약 11년</b>이에요. 흑점 수는 약 11년을 주기로 변해요.',
          },
          {
            type: 'quiz',
            title: '🔥 흑점이 많은 때의 태양',
            goal: '왼쪽의 태양에서 흑점이 많은 해와 적은 해를 비교해 보세요. 흑점이 많을 때 태양은 어떻게 달라질까요?',
            setup() { setScene('activity'); setYear(2014); syncControls(); },
            choices: ['흑점이 많아 태양이 어두워지고 활동이 약해진다', '홍염·플레어가 자주 일어나고 코로나가 커진다', '태양의 크기가 커진다', '아무 변화가 없다'],
            answer: 1,
            feedback: [
              '흑점은 주위보다 어둡지만, 흑점이 많을 때 태양은 오히려 더 <b>활발</b>해요. 플레어도 더 자주 일어나요.',
              '',
              '태양의 크기는 변하지 않아요. 연도를 바꿔도 원반의 크기는 같아요.',
              '2008년(흑점 4개)과 2014년(113개)의 태양을 비교하면 플레어와 코로나의 크기가 달라요.',
            ],
            explain: '흑점 수가 많은 때는 태양 활동이 <b>활발한 시기</b>예요. 흑점 부근의 폭발인 <b>플레어</b>와 <b>홍염</b>이 자주 일어나고 <b>코로나</b>가 커져요. <b>태양풍</b>(전기를 띤 입자의 흐름)도 강해져요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용(추론) ---------- */
      {
        title: '지구에 미치는 영향', short: '지구 영향', icon: '🌍', phase: '적용',
        features: ['earth', 'storm'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양 활동이 활발하면 플레어와 태양풍이 강해진다는 것을 알았어요.</div>' +
          '<p>강한 <b>태양 폭풍</b>이 지구에 닿으면 어떤 일이 생길까요? 직접 관찰하고 <b>추론</b>해 봐요.</p>',
        setup() { setScene('earth'); },
        recap: '태양 활동이 활발할 때 강한 태양 폭풍이 지구에 닿으면 오로라가 잦아지고 통신·위성·전력에 문제가 생길 수 있어요.',
        summary: '<ul><li>태양 활동이 활발하면 <b>플레어</b>가 잦고 <b>태양풍</b>이 강해져요. 강한 태양 폭풍이 지구에 닿으면:</li>' +
          '<li>🌌 <b>오로라</b>가 더 자주, 낮은 위도에서도 보여요.</li><li>📻 장거리 <b>무선 통신</b> 장애 (델린저 현상)</li><li>🛰️ <b>인공위성</b> 고장·GPS 오차</li><li>🔌 <b>송전망</b> 고장으로 정전</li>' +
          '<li>사례: 1989년 3월 캐나다 퀘벡 대정전(약 9시간), 2022년 2월 인공위성 수십 기 추락, 2024년 5월 우리나라 오로라 관측</li></ul>',
        missions: [
          {
            title: '⚡ 태양 폭풍 관찰',
            goal: '연도를 <b>2024년</b>으로 맞추고 [⚡ 태양 폭풍]을 눌러, 입자가 지구에 닿아 <b>오로라</b>가 켜질 때까지 지켜봐요.',
            hint: '아래 연도가 2024년인지 확인하고 <b>[⚡ 태양 폭풍]</b>을 눌러요. 입자 구름이 지구로 가는 모습을 끝까지 봐요.',
            setup() { setScene('earth'); setYear(2024, true); yearEl.value = 2024; yearEl.dispatchEvent(new Event('input')); S.storm = null; S.stormOnce = false; S.hit = false; S.auroraSeen = false; S.auroraT = 0; S.aurora = 0; S.wind = S.wind.filter((p) => p.k === 0); syncControls(); },
            check: () => S.hit && S.auroraSeen,
            hold: 0.5,
            status: () => chk(S.hit, '입자가 지구에 도착') + ' · ' + chk(S.auroraSeen, '오로라 켜짐') + (S.storm && S.storm.done && !S.auroraSeen ? '<br>💡 흑점이 많은 해(2024년)로 바꿔 다시 눌러 봐요.' : ''),
            explain: '태양 폭풍(플레어)이 일어나면 많은 입자가 태양풍을 타고 지구로 와요. 입자는 지구 <b>자기장</b>을 따라 극지방으로 들어와 대기와 부딪쳐 <b>오로라</b>를 만들어요. 통신·위성·전력에도 문제가 생길 수 있어요.',
          },
          {
            title: '🧠 영향 고르기',
            manual: true,
            goal: '태양 폭풍이 지구에 미치는 영향 <b>네 가지</b>를 카드에서 골라요. 다 고르면 [✔ 확인하기]를 눌러요.',
            hint: '앞 장면에서 본 일을 떠올려요. 오로라·위성·통신·전력에 어떤 일이 있었나요? 계절과 달의 모양은 태양 폭풍과 관계없어요.',
            setup() { setScene('cards'); S.cards = [false, false, false, false, false, false]; syncControls(); },
            check: () => {
              const sel = S.cards.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
              if (!sel.length) return '카드를 눌러 영향을 골라 보세요.';
              const wrong = sel.find((i) => !EFFECTS[i].ok);
              if (wrong != null) return EFFECTS[wrong].why;
              if (sel.length < 4) return '맞는 영향이 더 있어요. 앞 장면에서 본 일을 떠올려 봐요.';
              return true;
            },
            status: () => '고른 카드 <b>' + S.cards.filter(Boolean).length + ' / 4</b>',
            explain: '태양 폭풍이 지구에 닿으면 <b>오로라</b>가 더 자주 보이고, <b>무선 통신 장애</b>, <b>인공위성 고장·GPS 오차</b>, <b>송전망 고장(정전)</b>이 생길 수 있어요. 계절과 달의 모양은 태양 폭풍과 관계없어요.',
          },
          {
            type: 'quiz',
            title: '🌌 2024년 5월의 오로라',
            goal: '2024년 5월, 우리나라에서도 오로라가 관측되었어요. 그 까닭은 무엇일까요?',
            setup() { setScene('earth'); setYear(2024, true); yearEl.value = 2024; yearEl.dispatchEvent(new Event('input')); syncControls(); },
            choices: ['지구의 자전이 갑자기 빨라져서', '개기 일식이 일어나서', '달이 지구에 가까워져서', '태양 활동이 활발한 시기에 강한 태양 폭풍이 지구에 닿아서'],
            answer: 3,
            feedback: [
              '지구의 자전 속도는 그렇게 갑자기 달라지지 않아요. 오로라는 태양에서 온 입자가 만드는 현상이에요.',
              '일식은 달이 태양을 가리는 현상이에요. 오로라와는 관계없어요.',
              '달이 가까워진다고 오로라가 생기지는 않아요. 오로라는 태양 입자가 지구 자기장을 따라 들어와 생겨요.',
              '',
            ],
            explain: '2024년은 태양 활동이 활발한 시기였어요. <b>강한 태양 폭풍</b>이 지구에 닿아 평소에는 보기 어려운 낮은 위도(우리나라)에서도 오로라가 관측되었어요.',
          },
        ],
      },
    ],
  });

  /* =========================================================
     움직임
     ========================================================= */
  let lastDayTxt = '';
  function update(dt, t) {
    S.occSp.x.update(dt); S.occSp.y.update(dt);
    if (!S.occDrag && Math.hypot(S.occSp.x.target, S.occSp.y.target) < 0.14 && (S.occSp.x.target !== 0 || S.occSp.y.target !== 0)) { S.occSp.x.target = 0; S.occSp.y.target = 0; }
    if (S.lens) { S.lens.u = approach(S.lens.u, S.lens.tu, dt, 22); S.lens.v = approach(S.lens.v, S.lens.tv, dt, 22); }
    // 플레어 섬광: 흑점 수에 비례해 자주 일어나요
    if (S.scene === 'activity') {
      const N = snAt(S.yearA), rate = (0.05 + N / 105) * (RM ? 0.35 : 1);
      S.flareAcc += rate * dt;
      if (S.flareAcc >= 1) {
        S.flareAcc -= 1;
        const arr = spotsOfYear(S.year);
        if (arr.length) { const sp = arr[Math.floor(Math.random() * arr.length)], P = spotProj(sp.lat, sp.lon, 1); addFlash(P.x, P.y, Math.random() < 0.18 + N / 800); }
      }
    }
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt);
    updateStorm(dt, views);
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) V.P.update(dt); });
  }
  let frameMs = 0;
  S.spotsFrom = spotsOfYear(2000); S.spotsTo = spotsOfYear(2000);
  setYear(2000, true);
  syncControls();
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    frameMs += (performance.now() - t0 - frameMs) * 0.05;
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, FIG, SN, SPOTS, PEAKS, frameMs: () => frameMs, game: () => game, view: activeView,
    client(L, x, y) { const V = views.find((q) => q.L === L) || activeView(); const r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    discClient(u, w) { const V = activeView(), G = photoGeo(V.L); return this.client(V.L, G.cx + u * G.R, G.cy + w * G.R); },
    spotClient(i) { const V = activeView(), G = photoGeo(V.L), sp = SPOTS[i], P = spotProj(sp.lat, sp.lon0 + ROT * (S.dayA - 1), G.R); return this.client(V.L, G.cx + P.x, G.cy + P.y); },
    spotVisible(i) { const sp = SPOTS[i]; return spotProj(sp.lat, sp.lon0 + ROT * (S.dayA - 1), 1).c; },
    dayClient(d) { const V = activeView(), q = DAY_X(photoGeo(V.L), d - 1); return this.client(V.L, q.x, q.y); },
    occClient() { const V = activeView(), G = atmoGeo(V.L); return this.client(V.L, G.cx + S.occSp.x.value * G.R, G.cy + S.occSp.y.value * G.R); },
    sunClient() { const V = activeView(), G = atmoGeo(V.L); return this.client(V.L, G.cx, G.cy); },
    atmoPoint(u, w) { const V = activeView(), G = atmoGeo(V.L); return this.client(V.L, G.cx + u * G.R, G.cy + w * G.R); },
    barClient(y) { const V = activeView(), G = actGeo(V.L); return this.client(V.L, barX(G, y - Y0), barY(G, SN[y - Y0]) + 6); },
    cardClient(i) { const V = activeView(), g = cardGeo(V.L, i); return this.client(V.L, g.x + g.w / 2, g.y + g.h / 2); },
    setYear, setDay, setFilter, setScene, startStorm,
  };
})();
