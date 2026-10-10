/* =========================================================
   중1 Ⅶ. 태양계 - 지구의 자전과 일주 운동  [9과07-03 앞부분]
   탐구 흐름(4단계):
   ① 관찰: 서울의 밤하늘을 지켜보며 별이 동→서로 움직이고, 북쪽 별은 북극성 둘레를 도는 것을 관찰
   ② 탐구: 북쪽 하늘 장노출 사진에서 각도기로 별 자취의 각도를 재어 1시간에 약 15°임을 알아냄
   ③ 모형: 북극 위 우주에서 지구를 돌려 자전이 일주 운동(겉보기 운동)의 까닭임을 설명
   ④ 적용: 별의 위치를 예측
   관측 장소는 서울(북위 37.5°) 하나로 고정합니다. (위도에 따른 일주 운동 차이는 다루지 않음)
   하늘 계산: 항성시 LST = 7.7 h + (t − 24 h) × 1.0027, 시간각 H = LST − 적경, 고도·방위는 위도 37.5°로 계산
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp } = SciSim;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;
  const RM = !!SciSim.reduceMotion;
  const shade = SciSim.color.shade, rgba = SciSim.color.rgba, mixc = SciSim.color.mix;
  const nowS = () => performance.now() / 1000;
  const approach = SciSim.approach;
  const ease = SciSim.ease;

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
  function drawBgStars(ctx, stars, t, alpha) {
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
  function panelBase(ctx, P, stars, t) {
    roundRect(ctx, P.x, P.y, P.w, P.h, 14);
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, '#0c1636'); g.addColorStop(1, '#1b2d60');
    ctx.fillStyle = g; ctx.fill();
    if (stars) drawBgStars(ctx, stars, t, 0.7);
  }
  function panelEdge(ctx, P) {
    roundRect(ctx, P.x, P.y, P.w, P.h, 14);
    ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const norm360 = (a) => ((a % 360) + 360) % 360;
  const sdiff = (a, b) => { let d = norm360(a - b); return d > 180 ? d - 360 : d; };
  const hhmm = (t) => { const m = Math.round((((t % 24) + 24) % 24) * 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  // 임계 감쇠 스프링으로 목표에 따라가기 (o[key], o[key + 'V'])
  function crit(o, key, target, dt, w) {
    const vk = key + 'V';
    if (RM) { o[key] = target; o[vk] = 0; return; }
    let x = o[key], v = o[vk] || 0;
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) { const a = -w * w * (x - target) - 2 * w * v; v += a * h; x += v * h; }
    o[key] = x; o[vk] = v;
  }
  // 한 번만 그려 두고 계속 쓰는 배경 그림
  const SPRITES = {}, SPR_SCALE = Math.min(2, window.devicePixelRatio || 1);
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
     하늘 계산 (서울 북위 37.5°, 1월 중순)
     ========================================================= */
  const LAT = 37.5, SIN_LAT = Math.sin(LAT * DEG), COS_LAT = Math.cos(LAT * DEG);
  const SUN = { ra: 19.7, dec: -21 };
  const lstOf = (t) => 7.7 + (t - 24) * 1.0027379;
  // 적경(시)·적위(도) → 고도·방위(북 0°, 동 90°, 남 180°, 서 270°)  (out에 담아 돌려줘요)
  function altaz(ra, dec, lst, out) {
    const H = (lst - ra) * 15 * DEG, d = dec * DEG, sd = Math.sin(d), cd = Math.cos(d), cH = Math.cos(H);
    const sa = SIN_LAT * sd + COS_LAT * cd * cH;
    out.alt = Math.asin(clamp(sa, -1, 1)) / DEG;
    let az = Math.atan2(-cd * Math.sin(H), sd * COS_LAT - cd * cH * SIN_LAT) / DEG;
    out.az = az < 0 ? az + 360 : az;
    return out;
  }
  const sunAltAt = (t) => { const o = {}; return altaz(SUN.ra, SUN.dec, lstOf(t), o).alt; };

  /* ---------- 별 자료 (적경 h, 적위 °, 등급) ---------- */
  const ST = [], STAR = {};
  function addStar(key, ra, dec, mag, col, name, extra) {
    const s = Object.assign({ key, ra, dec, mag, col: col || '#eef3ff', name: name || '', al: { alt: 0, az: 0 }, sx: 0, sy: 0, on: false }, extra || {});
    ST.push(s); STAR[key] = s; return s;
  }
  addStar('polaris', 2.530, 89.264, 2.0, '#fff1c9', '북극성');
  // 북두칠성 (큰곰자리)
  addStar('dubhe', 11.062, 61.751, 1.8, '#ffe2b8'); addStar('merak', 11.031, 56.382, 2.4, '#e6eeff');
  addStar('phecda', 11.897, 53.695, 2.4, '#eef3ff'); addStar('megrez', 12.257, 57.033, 3.3, '#eef3ff');
  addStar('alioth', 12.900, 55.960, 1.8, '#eef3ff'); addStar('mizar', 13.399, 54.925, 2.2, '#eef3ff'); addStar('alkaid', 13.792, 49.313, 1.9, '#d6e4ff');
  // 카시오페이아자리
  addStar('caph', 0.153, 59.150, 2.3, '#fff3d6'); addStar('schedar', 0.675, 56.537, 2.2, '#ffd9a8');
  addStar('gcas', 0.945, 60.717, 2.5, '#cfe0ff'); addStar('ruchbah', 1.430, 60.235, 2.7, '#eef3ff'); addStar('segin', 1.907, 63.670, 3.4, '#cfe0ff');
  // 오리온자리
  addStar('betel', 5.919, 7.407, 0.5, '#ffb27a', '베텔게우스'); addStar('rigel', 5.242, -8.202, 0.1, '#bcd6ff', '리겔');
  addStar('bella', 5.419, 6.350, 1.6, '#cfe0ff'); addStar('mintaka', 5.533, -0.299, 2.2, '#cfe0ff');
  addStar('alnilam', 5.603, -1.202, 1.7, '#cfe0ff'); addStar('alnitak', 5.679, -1.943, 1.9, '#cfe0ff');
  addStar('saiph', 5.796, -9.670, 2.1, '#cfe0ff'); addStar('meissa', 5.585, 9.934, 3.5, '#cfe0ff');
  addStar('sirius', 6.752, -16.716, -1.46, '#d8e8ff', '시리우스');
  // 길잡이 별(이름표 없이 하늘을 채워 줘요)
  [['capella', 5.278, 45.998, 0.1, '#fff0c8'], ['aldebaran', 4.599, 16.509, 0.9, '#ffb98a'], ['procyon', 7.655, 5.225, 0.4, '#fff6e0'],
    ['castor', 7.577, 31.888, 1.6, '#e6eeff'], ['pollux', 7.755, 28.026, 1.1, '#ffd9a8'], ['regulus', 10.140, 11.967, 1.4, '#d6e4ff'],
    ['arcturus', 14.261, 19.182, -0.05, '#ffc890'], ['spica', 13.420, -11.161, 1.0, '#cfe0ff'], ['vega', 18.616, 38.784, 0.0, '#e6eeff'],
    ['deneb', 20.690, 45.280, 1.25, '#eef3ff'], ['altair', 19.846, 8.868, 0.8, '#eef3ff'], ['fomalhaut', 22.961, -29.62, 1.2, '#eef3ff'],
    ['alcyone', 3.791, 24.105, 2.9, '#cfe0ff'], ['atlas', 3.819, 24.053, 3.6, '#cfe0ff'], ['electra', 3.748, 24.113, 3.7, '#cfe0ff'],
    ['maia', 3.763, 24.368, 3.9, '#cfe0ff'], ['merope', 3.772, 23.948, 4.2, '#cfe0ff'], ['taygeta', 3.753, 24.467, 4.3, '#cfe0ff'],
    ['hamal', 2.120, 23.462, 2.0, '#ffd9a8'], ['mirfak', 3.405, 49.861, 1.8, '#fff3d6'], ['algol', 3.136, 40.956, 2.1, '#cfe0ff']].forEach((a) => addStar(a[0], a[1], a[2], a[3], a[4], '', { bg: true }));
  // 나머지는 씨앗 난수로 만든 희미한 별 (하늘에 고정, 함께 움직여요)
  (function () {
    const r = rng(20240115);
    for (let i = 0; i < 420; i++) {
      const ra = r() * 24, dec = Math.asin(2 * r() - 1) / DEG, mag = 3.7 + Math.pow(r(), 0.7) * 2.3, c = r();
      addStar('f' + i, ra, dec, mag, c < 0.15 ? '#ffe7c2' : c < 0.35 ? '#cfe0ff' : '#eef3ff', '', { faint: true });
    }
  })();
  // 은하수: 은하면(b≈0) 둘레의 부드러운 빛 덩어리 (적경·적위로 바꿔 하늘과 함께 움직여요)
  const MW = [];
  (function () {
    const r = rng(777), dG = 27.128 * DEG, aG = 192.859 * DEG, lN = 122.932 * DEG;
    for (let i = 0; i < 170; i++) {
      const l = r() * TAU, b = ((r() + r() + r() - 1.5) * 9) * DEG, dl = lN - l;
      const sd = Math.sin(dG) * Math.sin(b) + Math.cos(dG) * Math.cos(b) * Math.cos(dl);
      const dec = Math.asin(clamp(sd, -1, 1)) / DEG;
      let ra = aG + Math.atan2(Math.cos(b) * Math.sin(dl), Math.cos(dG) * Math.sin(b) - Math.sin(dG) * Math.cos(b) * Math.cos(dl));
      ra = ((ra / DEG / 15) % 24 + 24) % 24;
      const bright = 0.5 + 0.5 * Math.pow(Math.max(0, Math.cos(l - 0.1)), 2) + 0.3;      // 은하 중심 쪽이 더 밝아요
      MW.push({ ra, dec, size: 5.5 + r() * 6.5, a: (0.03 + r() * 0.03) * bright });
    }
  })();
  const CONS = [
    { key: 'dipper', name: '북두칠성', stars: ['dubhe', 'merak', 'phecda', 'megrez', 'alioth', 'mizar', 'alkaid'], col: '#9ad7ff',
      lines: [['dubhe', 'merak'], ['merak', 'phecda'], ['phecda', 'megrez'], ['megrez', 'dubhe'], ['megrez', 'alioth'], ['alioth', 'mizar'], ['mizar', 'alkaid']] },
    { key: 'cas', name: '카시오페이아자리', stars: ['caph', 'schedar', 'gcas', 'ruchbah', 'segin'], col: '#ffcf9a',
      lines: [['caph', 'schedar'], ['schedar', 'gcas'], ['gcas', 'ruchbah'], ['ruchbah', 'segin']] },
    { key: 'orion', name: '오리온자리', stars: ['betel', 'bella', 'meissa', 'mintaka', 'alnilam', 'alnitak', 'saiph', 'rigel'], col: '#a9c8ff',
      lines: [['meissa', 'betel'], ['meissa', 'bella'], ['betel', 'alnitak'], ['bella', 'mintaka'], ['mintaka', 'alnilam'], ['alnilam', 'alnitak'], ['alnitak', 'saiph'], ['mintaka', 'rigel']] },
  ];
  const CONS_BY = {};
  CONS.forEach((c) => { CONS_BY[c.key] = c; c.ids = c.stars.map((k) => STAR[k]); c.ids.forEach((s) => { s.cons = c; s.trail = true; }); });
  ['polaris', 'sirius', 'capella', 'aldebaran', 'procyon', 'castor', 'pollux', 'regulus', 'arcturus', 'vega', 'deneb', 'altair', 'spica', 'mirfak', 'hamal'].forEach((k) => { STAR[k].trail = true; });
  const TRAIL = ST.filter((s) => s.trail);
  // 별 크기·밝기 (등급이 작을수록 밝아요)
  ST.forEach((s) => { s.rad = clamp(0.95 + (4.3 - s.mag) * 0.55, 0.7, 3.5); s.bri = clamp(1.15 - (s.mag - 1) * 0.12, 0.34, 1); s.ph = (s.ra * 7.3 + s.dec) % TAU; });

  /* =========================================================
     상태 · 화면 배치
     ========================================================= */
  const T_MIN = 18, T_MAX = 30;                  // 밤 관측 시각 범위 (18:00 ~ 다음 날 06:00)
  const S = {
    scene: 'sky', sceneA: 1,
    view: 'south', viewShown: 'south', viewFade: 1,
    t: 21, tA: 21, tAV: 0, playing: false, free24: false,
    acc: { south: 0, north: 0 }, tapMsg: null, labelPolaris: false, polarFound: false, trails: true, hintPlay: true,
    // 사진
    expo: 1, expoA: 0.0001, camFlash: 0,
    pc: { u: 0, v: 0, tu: 0, tv: 0, uV: 0, vV: 0, snap: false, placed: false, grab: false },   // 각도기 중심 (북극에서의 거리, 도 단위: 위치 u→오른쪽, v→아래)
    arm: [{ a: 215, ta: 215, aV: 0, len: 15, grab: false }, { a: 172, ta: 172, aV: 0, len: 15, grab: false }], armTouched: false, pmode: 'photo',
    // 우주
    rho: 135, maxRho: 135, startRho: 135, space: { stage: 0, hit: [true, false, false, false] }, spaceDrag: null, lastTick: 0, spinV: 0,
    // 예측
    ghost: { a: 0, ta: 0, aV: 0 }, ghostTouched: false, predict: { revealed: false, T: 21, k: 0, done: false }, armAng: 0,
    // 연결 강조(우주 창 ↔ 하늘 창)
    link: { key: null, col: '#5eead4' },
    flash: null,
  };
  let FEAT = new Set();
  const on = (f) => FEAT.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);
  const isFree = () => !!(game && game.free);

  const LAYOUTS = {
    wide: {
      key: 'wide', vw: 800, vh: 600, fs: 1, col: true,
      sky: { x: 8, y: 8, w: 784, h: 448 }, strip: { x: 8, y: 464, w: 784, h: 128 },
      photo: { x: 8, y: 8, w: 596, h: 584 }, pside: { x: 612, y: 8, w: 180, h: 584 },
      space: { x: 8, y: 8, w: 520, h: 584 }, mini: { x: 536, y: 8, w: 256, h: 262 }, cbox: { x: 536, y: 278, w: 256, h: 314 },
    },
    tall: {
      key: 'tall', vw: 520, vh: 846, fs: 1.2, col: false,
      sky: { x: 8, y: 8, w: 504, h: 500 }, strip: { x: 8, y: 516, w: 504, h: 322 },
      photo: { x: 8, y: 8, w: 504, h: 504 }, pside: { x: 8, y: 520, w: 504, h: 318 },
      space: { x: 8, y: 8, w: 504, h: 520 }, mini: { x: 8, y: 536, w: 296, h: 302 }, cbox: { x: 312, y: 536, w: 200, h: 302 },
    },
  };
  // 하늘 창: 방위 ±96°를 가로로, 고도 0~80°를 세로로 펼친 원통 투영
  function skyGeo(R, L, mini) {
    const ground = (mini ? 30 : 54) * L.fs, baseY = R.y + R.h - ground;
    return { x: R.x, y: R.y, w: R.w, h: R.h, baseY, ground, kx: R.w / 192, ky: (baseY - R.y - (mini ? 6 : 12)) / 80, cx: R.x + R.w / 2, mini: !!mini };
  }
  function skyProj(G, view, az, alt, o) {
    const azc = view === 'south' ? 180 : 0, d = ((az - azc + 540) % 360) - 180;
    o.x = G.cx + d * G.kx; o.y = G.baseY - alt * G.ky; o.ok = Math.abs(d) <= 99 && alt > -0.5;
    return o;
  }
  // 북쪽 하늘을 북극 중심으로 본 틀 (사진·예측)
  function polarGeo(L) {
    const P = L.photo;
    if (L.col) return { P, cx: P.x + P.w / 2, cy: P.y + P.h * 0.5 - 6, k: 6.1 };
    return { P, cx: P.x + P.w / 2, cy: P.y + P.h * 0.5 - 6, k: 5.0 };
  }
  function spaceGeo(L) {
    const M = L.space;
    if (L.col) return { M, cx: M.x + 250, cy: M.y + 298, R: 122, ring: 226, sunX: M.x + M.w + 12, sunR: 62 };
    return { M, cx: M.x + 246, cy: M.y + 262, R: 106, ring: 204, sunX: M.x + M.w + 8, sunR: 54 };
  }

  /* ---------- 하늘색 ---------- */
  const hexRgb = (h) => { const c = SciSim.color.hexToRgb(h); return [c.r, c.g, c.b]; };
  const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgbS = (c, a) => (a == null ? 'rgb(' : 'rgba(') + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + (a == null ? ')' : ',' + a + ')');
  const PAL_NIGHT = ['#04091a', '#0a1432', '#18284f'].map(hexRgb);
  const PAL_TWI = ['#1d2160', '#5b3c7e', '#f09a68'].map(hexRgb);
  const PAL_DAY = ['#3d8ae0', '#6fb6f2', '#d4ecff'].map(hexRgb);
  const PAL_TMP = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  function skyPalette(sunAlt) {
    let A, B, k;
    if (sunAlt <= -14) { A = PAL_NIGHT; B = PAL_NIGHT; k = 0; }
    else if (sunAlt < -1) { A = PAL_NIGHT; B = PAL_TWI; k = (sunAlt + 14) / 13; k = k * k * (3 - 2 * k); }
    else if (sunAlt < 9) { A = PAL_TWI; B = PAL_DAY; k = (sunAlt + 1) / 10; k = k * k * (3 - 2 * k); }
    else { A = PAL_DAY; B = PAL_DAY; k = 0; }
    for (let i = 0; i < 3; i++) PAL_TMP[i] = mixRgb(A[i], B[i], k);
    return PAL_TMP;
  }
  const starVisOf = (sunAlt) => clamp((-sunAlt - 3.5) / 8.5, 0, 1);

  /* ---------- 지평선 실루엣 (산 + 천문대 돔) : 한 번만 그려 두고 써요 ---------- */
  function ridgeSprite(L, G, side) {
    const key = 'ridge-' + L.key + side + (G.mini ? 'm' : ''), W = G.w, Hh = G.ground + 64 * L.fs;
    return sprite(key, W, Hh, (g, w, h) => {
      const r = rng(side === 'S' ? 77 : 191), base = h - G.ground, S1 = L.fs * (G.mini ? 0.5 : 1);
      const ridge = (amp, y0, col, seed, rough) => {
        const rr = rng(seed), ph = [rr() * 6, rr() * 6, rr() * 6], pts = [];
        for (let x = 0; x <= w; x += 4) {
          const u = x / w;
          const v = Math.sin(u * 7.1 + ph[0]) * 0.5 + Math.sin(u * 15.3 + ph[1]) * 0.3 + Math.sin(u * 31 + ph[2]) * 0.12 * rough;
          pts.push([x, base - (y0 + amp * (0.55 + 0.45 * v)) * S1]);
        }
        g.beginPath(); g.moveTo(0, h);
        pts.forEach((p) => g.lineTo(p[0], p[1]));
        g.lineTo(w, h); g.closePath(); g.fillStyle = col; g.fill();
        return pts;
      };
      ridge(34, 10, 'rgba(18,30,66,.92)', 5, 1);
      const near = ridge(22, 2, '#060b1c', 9, 1.6);
      // 천문대 돔 (한쪽 능선 위)
      if (!G.mini) {
        const dx = side === 'S' ? w * 0.8 : w * 0.17, idx = Math.round(dx / 4), by = near[Math.min(near.length - 1, idx)][1] + 3;
        const dr = 17 * L.fs;
        g.fillStyle = '#05091a';
        g.fillRect(dx - dr * 1.1, by - dr * 0.7, dr * 2.2, dr * 0.8);
        g.beginPath(); g.arc(dx, by - dr * 0.7, dr * 1.1, Math.PI, 0); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(120,150,220,.4)'; g.lineWidth = 1.2; g.beginPath(); g.arc(dx, by - dr * 0.7, dr * 1.1, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        g.fillStyle = 'rgba(255,214,120,.9)'; g.fillRect(dx - 1.4, by - dr * 1.78, 2.8, dr * 1.0);       // 열린 틈
        g.fillStyle = 'rgba(255,200,110,.85)'; g.fillRect(dx + dr * 0.55, by - dr * 0.38, 3, 4);       // 창
      }
      // 나무
      for (let i = 0; i < (G.mini ? 6 : 16); i++) {
        const x = r() * w, idx = Math.min(near.length - 1, Math.round(x / 4)), y = near[idx][1] + 2, th = (8 + r() * 12) * S1;
        g.fillStyle = '#04070f'; g.beginPath(); g.moveTo(x, y - th); g.lineTo(x + th * 0.32, y); g.lineTo(x - th * 0.32, y); g.closePath(); g.fill();
      }
      // 바닥
      g.fillStyle = '#04070f'; g.fillRect(0, base + 2, w, G.ground);
      const gg = g.createLinearGradient(0, base, 0, h); gg.addColorStop(0, 'rgba(60,90,160,.18)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gg; g.fillRect(0, base, w, G.ground);
    });
  }

  /* =========================================================
     하늘 창 그리기 (서울의 밤하늘, 지평선 실루엣)
     ========================================================= */
  const GLOWS = {};
  function glowSpr(col) {
    let c = GLOWS[col];
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), rgb = hexRgb(col), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, rgbS(rgb, 0.9)); gr.addColorStop(0.18, rgbS(rgb, 0.45)); gr.addColorStop(0.5, rgbS(rgb, 0.1)); gr.addColorStop(1, rgbS(rgb, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      GLOWS[col] = c;
    }
    return c;
  }
  const MARKS = [
    { key: 'orion', name: '오리온자리', ra: 5.6, col: '#7dd3fc', stars: CONS_BY.orion.ids },
    { key: 'sirius', name: '시리우스', ra: 6.752, col: '#fde68a', stars: [STAR.sirius] },
    { key: 'dipper', name: '북두칠성', ra: 12.2, col: '#f9a8d4', stars: CONS_BY.dipper.ids },
  ];
  const markAng = (m) => (m.ra - SUN.ra) * 15;                    // 태양 방향에서 시계 반대 방향으로 잰 각
  const _sun = { alt: 0, az: 0 }, _p = { x: 0, y: 0, ok: false }, _q = { x: 0, y: 0, ok: false }, _al = { alt: 0, az: 0 };

  function drawStarDot(ctx, s, x, y, a, t, sc) {
    const tw = RM ? 1 : 0.9 + 0.1 * Math.sin(t * TAU + s.ph);          // 1초 주기로 살짝 반짝여요
    const al = a * s.bri * tw;
    if (al < 0.02) return;
    if (s.rad < 1.15) { ctx.globalAlpha = al; ctx.fillStyle = s.col; ctx.fillRect(x - 0.7 * sc, y - 0.7 * sc, 1.4 * sc, 1.4 * sc); return; }
    if (s.rad > 1.45) {
      const gs = s.rad * 4.8 * sc;
      ctx.globalAlpha = al * 0.55; ctx.drawImage(glowSpr(s.col), x - gs, y - gs, gs * 2, gs * 2);
    }
    ctx.globalAlpha = al; ctx.fillStyle = s.col; circle(ctx, x, y, s.rad * sc * 0.82); ctx.fill();
  }
  function drawSunSky(ctx, L, G, view, alt, az, a) {
    skyProj(G, view, az, Math.max(alt, -4), _q);
    const azc = view === 'south' ? 180 : 0, d = ((az - azc + 540) % 360) - 180;
    if (Math.abs(d) > 110 || a < 0.02) return;
    const x = G.cx + d * G.kx, y = G.baseY - alt * G.ky, r = (G.mini ? 8 : 15) * L.fs, low = clamp(1 - alt / 25, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    const gs = r * (7 + 3 * low);
    ctx.drawImage(glowSpr(low > 0.5 ? '#ff9a4a' : '#ffd36b'), x - gs, y - gs, gs * 2, gs * 2);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
    g.addColorStop(0, '#fffbe6'); g.addColorStop(0.6, low > 0.5 ? '#ffb347' : '#ffe27a'); g.addColorStop(1, low > 0.5 ? '#ff7a2e' : '#ffc233');
    ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
    ctx.restore();
  }

  // R: 그릴 사각형, o: {mini, view, tt(시각), fade, labels, hud}
  function drawSky(ctx, L, R, t, o) {
    const mini = !!o.mini, G = skyGeo(R, L, mini), view = o.view, T = o.tt, lst = lstOf(T), fs = L.fs, fade = o.fade == null ? 1 : o.fade;
    altaz(SUN.ra, SUN.dec, lst, _sun);
    const sunAlt = _sun.alt, pal = skyPalette(sunAlt), vis = starVisOf(sunAlt);
    ctx.save();
    roundRect(ctx, R.x, R.y, R.w, R.h, 14); ctx.clip();
    // 하늘 바탕과 해 쪽 지평선의 노을빛
    const sg = ctx.createLinearGradient(0, R.y, 0, G.baseY);
    sg.addColorStop(0, rgbS(pal[0])); sg.addColorStop(0.58, rgbS(pal[1])); sg.addColorStop(1, rgbS(pal[2]));
    ctx.fillStyle = sg; ctx.fillRect(R.x, R.y, R.w, R.h);
    const glowK = clamp(1 - Math.abs(sunAlt + 1) / 11, 0, 1);
    if (glowK > 0.02) {
      const azc = view === 'south' ? 180 : 0, d = ((_sun.az - azc + 540) % 360) - 180, gx = G.cx + clamp(d, -130, 130) * G.kx;
      const rg = ctx.createRadialGradient(gx, G.baseY, 4, gx, G.baseY, R.w * 0.62);
      rg.addColorStop(0, 'rgba(255,170,90,' + (0.62 * glowK) + ')'); rg.addColorStop(0.5, 'rgba(255,120,110,' + (0.2 * glowK) + ')'); rg.addColorStop(1, 'rgba(255,120,110,0)');
      ctx.fillStyle = rg; ctx.fillRect(R.x, R.y, R.w, G.baseY - R.y);
    }
    // 별 위치 계산
    const writeBack = !mini;
    const sc = mini ? 0.72 : fs * 0.95;
    for (let i = 0; i < ST.length; i++) {
      const s = ST[i];
      altaz(s.ra, s.dec, lst, _al); skyProj(G, view, _al.az, _al.alt, _p);
      s.mx = _p.x; s.my = _p.y; s.mon = _p.ok;
      if (writeBack) { s.sx = _p.x; s.sy = _p.y; s.on = _p.ok; s.alt = _al.alt; s.az = _al.az; }
    }
    const A = vis * fade * (o.alpha == null ? 1 : o.alpha);
    // 희미한 별
    if (A > 0.01) {
      for (let i = 0; i < ST.length; i++) { const s = ST[i]; if (s.faint && s.mon) drawStarDot(ctx, s, s.mx, s.my, A, t, sc); }
    }
    // 은하수 (아주 희미하게)
    if (A > 0.05 && !o.noMW) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gsp = glowSpr('#b9ccff');
      for (let i = 0; i < MW.length; i++) {
        const m = MW[i];
        altaz(m.ra, m.dec, lst, _al);
        if (_al.alt < -4) continue;
        skyProj(G, view, _al.az, Math.max(_al.alt, 0), _q);
        const d = ((_al.az - (view === 'south' ? 180 : 0) + 540) % 360) - 180;
        if (Math.abs(d) > 112) continue;
        const sz = m.size * G.ky * (mini ? 1.5 : 1.7) * (1 - Math.max(0, 25 - _al.alt) / 90);
        ctx.globalAlpha = m.a * A * (_al.alt < 4 ? Math.max(0, (_al.alt + 4) / 8) : 1);
        ctx.drawImage(gsp, G.cx + d * G.kx - sz, G.baseY - _al.alt * G.ky - sz, sz * 2, sz * 2);
      }
      ctx.restore();
    }
    // 별의 자취: 지난 3시간 (끝으로 갈수록 투명)
    if (A > 0.01 && o.trails && !mini) {
      const N = 30, span = 3, groups = CONS.concat([{ key: 'etc', col: '#cfe0ff' }]);
      const pts = [];
      for (let i = 0; i < TRAIL.length; i++) {
        const s = TRAIL[i], arr = [];
        for (let k = 0; k <= N; k++) {
          altaz(s.ra, s.dec, lstOf(T - span + span * k / N), _al); skyProj(G, view, _al.az, _al.alt, _q);
          arr.push(_q.ok ? [_q.x, _q.y] : null);
        }
        pts.push(arr);
      }
      ctx.lineCap = 'butt'; ctx.lineWidth = 1.5 * fs;
      groups.forEach((gp) => {
        for (let k = 0; k < N; k++) {
          ctx.strokeStyle = rgbS(hexRgb(gp.col), (0.78 * Math.pow((k + 1) / N, 1.6) * A).toFixed(3));
          ctx.beginPath();
          for (let i = 0; i < TRAIL.length; i++) {
            const s = TRAIL[i], key = s.cons ? s.cons.key : 'etc';
            if (key !== gp.key) continue;
            const a = pts[i][k], b = pts[i][k + 1];
            if (a && b && Math.abs(a[0] - b[0]) < R.w / 3) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
          }
          ctx.stroke();
        }
      });
    }
    // 별자리 선
    if (A > 0.01) {
      ctx.lineWidth = 1.3 * (mini ? 0.7 : fs); ctx.lineCap = 'round';
      CONS.forEach((c) => {
        ctx.strokeStyle = rgbS(hexRgb(c.col), (0.4 * A).toFixed(3));
        ctx.beginPath();
        c.lines.forEach((ln) => {
          const a = STAR[ln[0]], b = STAR[ln[1]];
          if (a.mon && b.mon) { ctx.moveTo(a.mx, a.my); ctx.lineTo(b.mx, b.my); }
        });
        ctx.stroke();
      });
    }
    // 밝은 별
    if (A > 0.01) {
      for (let i = 0; i < ST.length; i++) { const s = ST[i]; if (!s.faint && s.mon) drawStarDot(ctx, s, s.mx, s.my, A, t, sc); }
      ctx.globalAlpha = 1;
    }
    // 우주 창과 이어 주는 강조 (같은 색 후광)
    if (o.links) {
      MARKS.forEach((m) => {
        const k = o.links[m.key] || 0;
        if (k < 0.02) return;
        m.stars.forEach((s) => {
          if (!s.mon) return;
          const gs = (m.stars.length > 1 ? 15 : 22) * (mini ? 0.8 : fs) * (0.8 + 0.2 * Math.sin(t * 5));
          ctx.globalAlpha = k * 0.9; ctx.drawImage(glowSpr(m.col), s.mx - gs, s.my - gs, gs * 2, gs * 2);
        });
      });
      ctx.globalAlpha = 1;
    }
    // 해
    drawSunSky(ctx, L, G, view, _sun.alt, _sun.az, fade);
    // 산 실루엣과 방위 글자
    const rs = ridgeSprite(L, G, view === 'south' ? 'S' : 'N');
    ctx.drawImage(rs, R.x, G.baseY + G.ground - rs.height / SPR_SCALE, R.w, rs.height / SPR_SCALE);
    const names = view === 'south' ? ['동', '남', '서'] : ['서', '북', '동'];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [-90, 0, 90].forEach((dd, i) => {
      const x = G.cx + dd * G.kx;
      if (mini) { ctx.font = Math.round(13 * L.fs) + 'px ' + DISPLAY; ctx.fillStyle = 'rgba(210,225,255,.9)'; ctx.fillText(names[i], x, G.baseY + G.ground * 0.52); }
      else { ctx.font = dfnt(L, 21); ctx.fillStyle = i === 1 ? '#fde68a' : '#cfe0ff'; ctx.fillText(names[i], x, G.baseY + G.ground * 0.5); }
    });
    if (!mini) {
      ctx.strokeStyle = 'rgba(180,200,245,.5)'; ctx.lineWidth = 1.2;
      for (let dd = -90; dd <= 90; dd += 15) {
        const x = G.cx + dd * G.kx, h = dd % 45 === 0 ? 9 : 5;
        ctx.beginPath(); ctx.moveTo(x, G.baseY + 4); ctx.lineTo(x, G.baseY + 4 + h * fs); ctx.stroke();
      }
    }
    ctx.textBaseline = 'alphabetic';
    // 별자리 이름표
    if (!mini && o.labels && A > 0.2) {
      CONS.forEach((c) => {
        const vs = c.ids.filter((s) => s.mon);
        c.labA = approach(c.labA || 0, vs.length >= 3 ? 1 : 0, 0.016, 7);
        if (c.labA < 0.05) return;
        let mx = 0, top = 1e9;
        vs.forEach((s) => { mx += s.mx; top = Math.min(top, s.my); });
        mx /= vs.length;
        ctx.globalAlpha = c.labA * A;
        pill(ctx, c.name, clamp(mx, R.x + 70 * fs, R.x + R.w - 70 * fs), clamp(top - 22 * fs, R.y + 30 * fs, G.baseY - 14), { font: fnt(L, 13.5, 'bold'), h: Math.round(24 * fs), bg: 'rgba(6,10,26,.7)', color: c.col, stroke: rgbS(hexRgb(c.col), 0.5) });
      });
      [STAR.sirius].forEach((s) => { if (s.mon && A > 0.3) { ctx.globalAlpha = A; pill(ctx, s.name, s.mx, s.my + 20 * fs, { font: fnt(L, 13, 'bold'), h: Math.round(22 * fs), color: '#fde68a' }); } });
      if (o.labelPolaris && STAR.polaris.mon) {
        const s = STAR.polaris;
        ctx.globalAlpha = 1; ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 2.5; circle(ctx, s.mx, s.my, (13 + 2 * pulse()) * fs); ctx.stroke();
        pill(ctx, '북극성', s.mx, s.my + 28 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(24 * fs), color: '#5eead4', stroke: 'rgba(94,234,212,.6)' });
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return G;
  }

  /* =========================================================
     시계 · 시간표 · 안내 알약
     ========================================================= */
  const dayWord = (T) => {
    const h = Math.floor((((T % 24) + 24) % 24) + 1e-6);
    if (h === 0) return '밤 12시 (자정)';
    if (h < 6) return '새벽 ' + h + '시';
    if (h < 12) return '오전 ' + h + '시';
    if (h === 12) return '낮 12시 (정오)';
    if (h < 18) return '오후 ' + (h - 12) + '시';
    if (h < 21) return '저녁 ' + (h - 12) + '시';
    return '밤 ' + (h - 12) + '시';
  };
  // 부드럽게 도는 아날로그 시계 (T: 시 단위 실수)
  function drawClock(ctx, L, cx, cy, r, T, o) {
    o = o || {};
    const sunAlt = sunAltAt(T), isDay = sunAlt > -2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    const bz = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bz.addColorStop(0, '#9fb6e8'); bz.addColorStop(0.5, '#4b5f96'); bz.addColorStop(1, '#27345f');
    ctx.fillStyle = bz; circle(ctx, cx, cy, r + 5); ctx.fill();
    ctx.restore();
    const fg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    if (isDay) { fg.addColorStop(0, '#2b4a86'); fg.addColorStop(1, '#16275a'); } else { fg.addColorStop(0, '#16224d'); fg.addColorStop(1, '#0a1230'); }
    ctx.fillStyle = fg; circle(ctx, cx, cy, r); ctx.fill();
    for (let h = 0; h < 12; h++) {
      const a = h / 12 * TAU - Math.PI / 2, big = h % 3 === 0;
      ctx.strokeStyle = big ? '#e6eeff' : 'rgba(200,215,250,.6)'; ctx.lineWidth = big ? 2.6 : 1.5;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * (big ? 0.78 : 0.84), cy + Math.sin(a) * r * (big ? 0.78 : 0.84)); ctx.lineTo(cx + Math.cos(a) * r * 0.93, cy + Math.sin(a) * r * 0.93); ctx.stroke();
    }
    ctx.fillStyle = '#e6eeff'; ctx.font = Math.round(r * 0.26) + 'px ' + DISPLAY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [['12', 0], ['3', 3], ['6', 6], ['9', 9]].forEach((q) => { const a = q[1] / 12 * TAU - Math.PI / 2; ctx.fillText(q[0], cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62 + 1); });
    ctx.font = Math.round(r * 0.3) + 'px ' + FONT; ctx.globalAlpha = 0.9;
    ctx.fillText(isDay ? '☀️' : '🌙', cx, cy - r * 0.3);
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
    // 바늘
    const Tm = ((T % 12) + 12) % 12, ha = Tm / 12 * TAU - Math.PI / 2, ma = (T % 1 + 1) % 1 * TAU - Math.PI / 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2; ctx.lineCap = 'round';
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = Math.max(3.5, r * 0.085);
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(ha) * r * 0.1, cy - Math.sin(ha) * r * 0.1); ctx.lineTo(cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2.4, r * 0.055);
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(ma) * r * 0.12, cy - Math.sin(ma) * r * 0.12); ctx.lineTo(cx + Math.cos(ma) * r * 0.8, cy + Math.sin(ma) * r * 0.8); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fde68a'; circle(ctx, cx, cy, Math.max(3, r * 0.07)); ctx.fill();
  }
  // 밤 시간표: 18시~06시, 현재 시각과 지난 3시간(별의 자취)
  let TL_COL = null;
  function drawTimeline(ctx, L, x, y, w, h, T) {
    if (!TL_COL) { TL_COL = []; for (let i = 0; i <= 24; i++) { const p = skyPalette(sunAltAt(T_MIN + i * 0.5)); TL_COL.push(rgbS(mixRgb(p[1], p[2], 0.45))); } }
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    TL_COL.forEach((c, i) => g.addColorStop(i / 24, c));
    ctx.fillStyle = g; roundRect(ctx, x, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,190,255,.4)'; ctx.lineWidth = 1.2; ctx.stroke();
    const px = (tt) => x + clamp((tt - T_MIN) / (T_MAX - T_MIN), 0, 1) * w;
    // 지난 3시간 (별의 자취)
    if (T > T_MIN) {
      const a = px(T - 3), b = px(T);
      ctx.fillStyle = 'rgba(94,234,212,.28)'; roundRect(ctx, a, y - h / 2 + 2, Math.max(2, b - a), h - 4, (h - 4) / 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(214,228,255,.85)'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'center';
    for (let hh = 0; hh <= 12; hh++) {
      const xx = px(T_MIN + hh);
      ctx.strokeStyle = 'rgba(214,228,255,' + (hh % 3 === 0 ? 0.7 : 0.35) + ')'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xx, y + h / 2 - (hh % 3 === 0 ? 6 : 3)); ctx.lineTo(xx, y + h / 2); ctx.stroke();
      if (hh % 3 === 0) ctx.fillText(((T_MIN + hh) % 24) + '시', xx, y + h / 2 + 16 * L.fs);
    }
    const mx = px(T);
    ctx.save(); ctx.shadowColor = 'rgba(94,234,212,.9)'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#5eead4'; circle(ctx, mx, y, h * 0.62); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#06222a'; ctx.font = fnt(L, 11, 'bold'); ctx.textBaseline = 'middle'; ctx.fillText('▶', mx + 0.5, y + 0.5); ctx.textBaseline = 'alphabetic';
  }
  function stripGeo(L) {
    const P = L.strip;
    if (L.col) return { P, ccx: P.x + 70, ccy: P.y + P.h / 2 + 2, cr: 50, tx: P.x + 140, ty: P.y + P.h / 2 - 14, lx: P.x + 280, ly: P.y + P.h / 2 + 2, lw: P.w - 280 - 26, lh: 22 };
    return { P, ccx: P.x + 118, ccy: P.y + 112, cr: 78, tx: P.x + 236, ty: P.y + 96, lx: P.x + 28, ly: P.y + 252, lw: P.w - 56, lh: 26 };
  }
  function drawStrip(ctx, L, t, T, o) {
    o = o || {};
    const G = stripGeo(L), P = G.P, fs = L.fs;
    panelBase(ctx, P, L.starsStrip, t); panelEdge(ctx, P);
    drawClock(ctx, L, G.ccx, G.ccy, G.cr, T);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = dfnt(L, L.col ? 36 : 38); ctx.fillText(hhmm(T), G.tx, G.ty + (L.col ? 8 : 10));
    ctx.fillStyle = '#b9c8ee'; ctx.font = fnt(L, 14, 'bold'); ctx.fillText(dayWord(T), G.tx + 2, G.ty + (L.col ? 32 : 40) * (L.col ? 1 : 1));
    if (o.timeline) {
      ctx.fillStyle = '#d6e4ff'; ctx.font = fnt(L, 13.5, 'bold'); ctx.textAlign = 'left';
      ctx.fillText('🌙 서울의 밤 시간표 (1월 중순)', G.lx, G.ly - 24 * fs);
      drawTimeline(ctx, L, G.lx, G.ly + 4 * fs, G.lw, G.lh, T);
      ctx.fillStyle = 'rgba(94,234,212,.9)'; ctx.font = fnt(L, 13, 'bold');
      if (L.col) { ctx.textAlign = 'right'; ctx.fillText('청록색 띠 = 지난 3시간 (별의 자취)', G.lx + G.lw, G.ly - 24 * fs); }
      else { ctx.textAlign = 'left'; ctx.fillText('청록색 띠 = 지난 3시간 (별의 자취)', G.lx, G.ly + 62 * fs); }
    }
    if (o.clockNew) newRingCircle(ctx, L, G.ccx, G.ccy, G.cr + 8);
  }
  function hudPills(ctx, L, R, view, T) {
    const fs = L.fs;
    pill(ctx, '📍 서울 · 1월 중순', R.x + 14, R.y + 22 * fs, { align: 'left', font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), bg: 'rgba(6,10,26,.62)', color: '#e6eeff' });
    pill(ctx, view === 'south' ? '🧭 남쪽 하늘 (동쪽이 왼쪽)' : '🧭 북쪽 하늘 (서쪽이 왼쪽)', R.x + 14, R.y + 22 * fs + 32 * fs, { align: 'left', font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), bg: 'rgba(6,10,26,.62)', color: '#fde68a' });
  }
  function skyScene(ctx, L, t, V) {
    const R = L.sky;
    const G = drawSky(ctx, L, R, t, { view: S.viewShown, tt: S.tA, fade: S.viewFade, labels: true, trails: S.trails, labelPolaris: S.labelPolaris });
    ctx.save(); roundRect(ctx, R.x, R.y, R.w, R.h, 14); ctx.clip();
    hudPills(ctx, L, R, S.viewShown, S.tA);
    if (S.hintPlay && on('clock') && S.tapMsg == null) {
      pill(ctx, '아래 [▶ 재생]이나 시각 막대로 시간을 흘려 보세요', R.x + R.w / 2, R.y + R.h * 0.2, { font: fnt(L, 14.5, 'bold'), h: Math.round(30 * L.fs), pad: 13, bg: 'rgba(14,165,233,.9)' });
    }
    const m = S.tapMsg;
    if (m) {
      const age = nowS() - m.t0;
      if (age > 3.2) S.tapMsg = null;
      else {
        ctx.globalAlpha = Math.min(1, (3.2 - age) * 2.5);
        pill(ctx, m.text, clamp(m.x, R.x + 150 * L.fs, R.x + R.w - 150 * L.fs), clamp(m.y - 36 * L.fs, R.y + 80 * L.fs, R.y + R.h - 80 * L.fs), { font: fnt(L, 14, 'bold'), h: Math.round(28 * L.fs), pad: 12, bg: m.good ? 'rgba(5,150,105,.94)' : 'rgba(180,83,9,.94)', stroke: m.good ? '#6ee7b7' : '#fcd34d' });
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    panelEdge(ctx, R);
    drawStrip(ctx, L, t, S.tA, { timeline: true, clockNew: isNew('clock') });
    return G;
  }

  /* =========================================================
     북쪽 하늘 지도 (북극성이 가운데): 장노출 사진 · 예측에 같이 써요
     위치각 θ = 90° + 15°×(항성시 − 적경)  → 시간이 흐르면 θ가 커져요 = 시계 반대 방향
     ========================================================= */
  const PH_T0 = 21;                              // 사진을 찍기 시작하는 시각
  const polarTh = (ra, T) => 90 + 15 * (lstOf(T) - ra);
  const polarXY = (G, ra, dec, T, add, o) => {
    const th = (polarTh(ra, T) + (add || 0)) * DEG, r = G.k * (90 - dec);
    o.x = G.cx + r * Math.cos(th); o.y = G.cy - r * Math.sin(th); o.r = r; o.th = th / DEG;
    return o;
  };
  function drawPolarGround(ctx, L, G) {
    const fs = L.fs, P = G.P, rr = rng(31);
    // 지평선 곡선: 적위 δ = atan(−cos H / tan φ) 인 점들
    const pts = [];
    for (let a = 175; a <= 365; a += 3) {
      const Hd = (a - 90) * DEG, dec = Math.atan(-Math.cos(Hd) / Math.tan(LAT * DEG)) / DEG, pd = 90 - dec;
      const wob = (Math.sin(a * 0.43) * 5 + Math.sin(a * 1.31 + 1) * 3 + Math.sin(a * 3.1) * 1.5) * fs;
      const rad = G.k * pd - 4 * fs + wob, th = a * DEG;
      pts.push([G.cx + rad * Math.cos(th), G.cy - rad * Math.sin(th)]);
    }
    ctx.save();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    pts.forEach((p) => ctx.lineTo(p[0], p[1]));
    const last = pts[pts.length - 1], first = pts[0];
    ctx.lineTo(last[0] + 400 * Math.cos(5.8), last[1] + 400); ctx.lineTo(first[0] - 400, first[1] + 400); ctx.closePath();
    const gg = ctx.createLinearGradient(0, G.cy + G.k * 30, 0, P.y + P.h);
    gg.addColorStop(0, '#0a1230'); gg.addColorStop(0.25, '#050a1b'); gg.addColorStop(1, '#03060f');
    ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = 'rgba(90,120,200,.35)'; ctx.lineWidth = 1.4; ctx.stroke();
    // 나무와 천문대 돔
    for (let i = 0; i < pts.length; i += 2) {
      if (rr() < 0.45) { const p = pts[i], th = (6 + rr() * 9) * fs; ctx.fillStyle = '#03060f'; ctx.beginPath(); ctx.moveTo(p[0], p[1] - th); ctx.lineTo(p[0] + th * 0.33, p[1] + 2); ctx.lineTo(p[0] - th * 0.33, p[1] + 2); ctx.closePath(); ctx.fill(); }
    }
    const dp = pts[Math.round(pts.length * 0.72)], dr = 15 * fs;
    ctx.fillStyle = '#03060f'; ctx.fillRect(dp[0] - dr * 1.1, dp[1] - dr * 0.5, dr * 2.2, dr * 0.9);
    ctx.beginPath(); ctx.arc(dp[0], dp[1] - dr * 0.5, dr * 1.1, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,120,.85)'; ctx.fillRect(dp[0] - 1.3, dp[1] - dr * 1.55, 2.6, dr * 0.9);
    ctx.restore();
  }
  // 사진 바탕: 하늘 + 가장자리 어둡게
  function drawPolarBg(ctx, L, G) {
    const P = G.P;
    const sg = ctx.createRadialGradient(G.cx, G.cy, 10, G.cx, G.cy, Math.hypot(P.w, P.h) * 0.62);
    sg.addColorStop(0, '#0d1a3e'); sg.addColorStop(0.6, '#070f28'); sg.addColorStop(1, '#03060f');
    ctx.fillStyle = sg; ctx.fillRect(P.x, P.y, P.w, P.h);
  }
  const _pp = { x: 0, y: 0, r: 0, th: 0 }, _pq = { x: 0, y: 0, r: 0, th: 0 };
  // 노출 expo시간 동안의 별 자취(호). 별마다 시작 위치가 달라요.
  function drawTrails(ctx, L, G, expo, t, heads) {
    const P = G.P, fs = L.fs;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const sweep = 15.0411 * expo;                              // 도 (표준 시간 15°/h에 가까운 값)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < ST.length; i++) {
        const s = ST[i];
        if (s.dec < 8 || (pass === 0 && s.rad < 1.3)) continue;
        const r = G.k * (90 - s.dec);
        if (r > 520) continue;
        const th0 = polarTh(s.ra, PH_T0);
        const rad = s.rad * fs * 0.8;
        ctx.strokeStyle = rgbS(hexRgb(s.col), pass === 0 ? 0.16 * s.bri : Math.min(1, 0.95 * s.bri));
        ctx.lineWidth = pass === 0 ? Math.max(3, rad * 3.4) : Math.max(1.05, rad * 0.92);
        ctx.beginPath();
        if (sweep < 0.4) { ctx.arc(G.cx + r * Math.cos(th0 * DEG), G.cy - r * Math.sin(th0 * DEG), 0.3, 0, TAU); }
        else ctx.arc(G.cx, G.cy, Math.max(0.5, r), -th0 * DEG, -(th0 + sweep) * DEG, true);
        ctx.stroke();
      }
    }
    if (heads && sweep > 0.4) {
      for (let i = 0; i < ST.length; i++) {
        const s = ST[i];
        if (s.dec < 8 || s.rad < 1.7) continue;
        const r = G.k * (90 - s.dec), a = (polarTh(s.ra, PH_T0) + sweep) * DEG, gs = (7 + s.rad * 3) * L.fs;
        ctx.globalAlpha = 0.85; ctx.drawImage(glowSpr(s.col), G.cx + r * Math.cos(a) - gs, G.cy - r * Math.sin(a) - gs, gs * 2, gs * 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  // 노출 시간이 정해져 멈춘 뒤에는 한 장의 그림으로 만들어 두고 다시 써요 (매 프레임 수백 개의 호를 다시 그리지 않도록)
  const TRAIL_CACHE = {};
  function trailsCached(ctx, L, G, expo, t) {
    const P = G.P, key = L.key + ':' + expo;
    let c = TRAIL_CACHE[L.key];
    if (!c || c.key !== key) {
      const cv = c ? c.cv : document.createElement('canvas');
      cv.width = Math.ceil(P.w * SPR_SCALE); cv.height = Math.ceil(P.h * SPR_SCALE);
      const g = cv.getContext('2d'); g.setTransform(SPR_SCALE, 0, 0, SPR_SCALE, -P.x * SPR_SCALE, -P.y * SPR_SCALE);
      drawTrails(g, L, G, expo, t);
      c = TRAIL_CACHE[L.key] = { key, cv };
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(c.cv, P.x, P.y, P.w, P.h); ctx.restore();
  }
  // 호의 양 끝(각도기가 달라붙는 곳)
  function trailEnds(G, expo) {
    const out = [], sweep = 15.0411 * expo;
    for (let i = 0; i < ST.length; i++) {
      const s = ST[i];
      if (s.dec < 20 || s.mag > 3.4 || s.key === 'polaris') continue;
      const r = G.k * (90 - s.dec), th0 = polarTh(s.ra, PH_T0);
      [0, sweep].forEach((add, k) => { const a = (th0 + add) * DEG; out.push({ x: G.cx + r * Math.cos(a), y: G.cy - r * Math.sin(a), k, star: s.key }); });
    }
    return out;
  }
  // 북극성 둘레의 호 모양 안내 (각도 읽기용)
  function wedge(ctx, cx, cy, r, a0, a1, fill, edge) {
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, -a0 * DEG, -a1 * DEG, a1 > a0 ? true : false); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function protGeo(L, G) { return { rad: 76 * L.fs, hr: 16 * L.fs, home: { u: (G.P.w / 2 - 112 * L.fs) / G.k, v: (G.P.h / 2 - 150 * L.fs) / G.k } }; }
  const pcXY = (G) => ({ x: G.cx + S.pc.u * G.k, y: G.cy + S.pc.v * G.k });
  const armXY = (G, i) => { const p = pcXY(G), a = S.arm[i]; return { x: p.x + a.len * G.k * Math.cos(a.a * DEG), y: p.y - a.len * G.k * Math.sin(a.a * DEG) }; };
  const protAngle = () => Math.abs(sdiff(S.arm[1].ta, S.arm[0].ta));
  function drawProtractor(ctx, L, G, t) {
    const fs = L.fs, PG = protGeo(L, G), pc = S.pc, cxy = pcXY(G), cx = cxy.x, cy = cxy.y;
    // 각도기 몸체 (반투명 원)
    ctx.save();
    const bg = ctx.createRadialGradient(cx, cy, 6, cx, cy, PG.rad);
    bg.addColorStop(0, 'rgba(94,234,212,.04)'); bg.addColorStop(0.8, 'rgba(94,234,212,.12)'); bg.addColorStop(1, 'rgba(94,234,212,.2)');
    ctx.fillStyle = bg; circle(ctx, cx, cy, PG.rad); ctx.fill();
    ctx.strokeStyle = pc.snap ? '#34d399' : 'rgba(150,240,225,.8)'; ctx.lineWidth = 2.2; circle(ctx, cx, cy, PG.rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(190,250,240,.75)'; ctx.fillStyle = 'rgba(206,252,244,.9)'; ctx.font = fnt(L, 12, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let a = 0; a < 360; a += 10) {
      const big = a % 30 === 0, c = Math.cos(-a * DEG), s2 = Math.sin(-a * DEG);
      ctx.lineWidth = big ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(cx + c * PG.rad, cy + s2 * PG.rad); ctx.lineTo(cx + c * (PG.rad - (big ? 10 : 6)), cy + s2 * (PG.rad - (big ? 10 : 6))); ctx.stroke();
      if (big && L.col) ctx.fillText(String(a), cx + c * (PG.rad - 20 * fs), cy + s2 * (PG.rad - 20 * fs));
    }
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    // 부채꼴(두 팔 사이의 각)
    const a0 = S.arm[0].a, a1 = S.arm[1].a, d = sdiff(a1, a0);
    const wr = Math.max(40 * fs, Math.min(PG.rad * 0.9, 120 * fs));
    const showAng = pc.snap || S.armTouched;
    if (showAng && Math.abs(d) > 0.5) wedge(ctx, cx, cy, wr, a0, a0 + d, 'rgba(253,230,138,.28)', 'rgba(253,230,138,.9)');
    // 팔과 손잡이
    S.arm.forEach((arm, i) => {
      const hxy = armXY(G, i), hx = hxy.x, hy = hxy.y;
      ctx.strokeStyle = i ? '#fde68a' : '#7dd3fc'; ctx.lineWidth = 2.6 * Math.min(1.2, fs); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      ctx.fillStyle = i ? '#fde68a' : '#7dd3fc'; circle(ctx, hx, hy, PG.hr * (arm.grab ? 1.2 : 1)); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#0b1d3a'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i ? '②' : '①', hx, hy + 0.5); ctx.textBaseline = 'alphabetic';
      if (!S.armTouched && pc.snap) { ctx.strokeStyle = 'rgba(253,230,138,' + (0.3 + 0.6 * pulse()) + ')'; ctx.lineWidth = 2.4; circle(ctx, hx, hy, PG.hr + 5 + 3 * pulse()); ctx.stroke(); }
    });
    // 중심 표시
    ctx.fillStyle = pc.snap ? '#34d399' : '#5eead4'; circle(ctx, cx, cy, 5 * fs); ctx.fill();
    ctx.strokeStyle = '#06222a'; ctx.lineWidth = 1.4; circle(ctx, cx, cy, 5 * fs); ctx.stroke();
    // 각도 읽기
    const ang = Math.abs(d), mid = (a0 + d / 2) * DEG, tr = wr + 24 * fs;
    ctx.save(); ctx.globalAlpha = showAng ? Math.min(1, Math.abs(d) / 4) : 0;
    pill(ctx, Math.round(ang) + '°', cx + Math.cos(mid) * tr, cy - Math.sin(mid) * tr, { font: fnt(L, 16, 'bold'), h: Math.round(28 * fs), pad: 11, bg: 'rgba(253,230,138,.96)', color: '#3b2a00' });
    ctx.restore();
    if (isNew('protractor') && !pc.placed) newRingCircle(ctx, L, cx, cy, PG.rad + 12);
    if (!pc.placed) {
      ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(94,234,212,' + (0.4 + 0.5 * pulse()) + ')'; ctx.lineWidth = 2.4; circle(ctx, cx, cy, PG.rad + 6); ctx.stroke(); ctx.setLineDash([]);
      pill(ctx, '👆 끌어서 북극성에 맞춰요', clamp(cx, G.P.x + 128 * fs, G.P.x + G.P.w - 128 * fs), cy - PG.rad - 22 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 12, bg: 'rgba(14,165,233,.92)' });
    }
  }

  /* ---------- 북두칠성 (예측) ---------- */
  const DIPPER = CONS_BY.dipper;
  function drawDipperAt(ctx, L, G, T, add, o) {
    o = o || {};
    const pos = DIPPER.ids.map((s) => polarXY(G, s.ra, s.dec, T, add, { x: 0, y: 0, r: 0, th: 0 }));
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = (o.lw || 2.2) * L.fs; ctx.strokeStyle = o.line; if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath();
    DIPPER.lines.forEach((ln) => { const a = pos[DIPPER.stars.indexOf(ln[0])], b = pos[DIPPER.stars.indexOf(ln[1])]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); });
    ctx.stroke(); ctx.setLineDash([]);
    if (o.glow) {
      pos.forEach((p) => { const gs = 22 * L.fs; ctx.globalAlpha = o.glow; ctx.drawImage(glowSpr(o.starCol), p.x - gs, p.y - gs, gs * 2, gs * 2); });
      ctx.globalAlpha = 1;
    }
    pos.forEach((p, i) => { ctx.fillStyle = o.starCol; ctx.globalAlpha = o.a == null ? 1 : o.a; circle(ctx, p.x, p.y, (o.rad || 3.4) * L.fs * (DIPPER.ids[i].rad > 2.4 ? 1.12 : 0.95)); ctx.fill(); });
    ctx.restore();
    return pos;
  }

  /* =========================================================
     북쪽 하늘 지도 장면 (사진 / 예측)
     ========================================================= */
  function polarScene(ctx, L, t, V) {
    const G = polarGeo(L), P = G.P, fs = L.fs, mode = S.pmode, Tv = mode === 'predict' ? S.predict.T : PH_T0;
    ctx.save(); roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.clip();
    drawPolarBg(ctx, L, G);
    if (mode === 'photo') {
      // 길게 찍은 사진: 별이 그린 호 (노출 시간만큼 천천히 길어져요)
      if (Math.abs(S.expoA - S.expo) < 0.004 && S.expo === Math.round(S.expo)) trailsCached(ctx, L, G, S.expo, t); else drawTrails(ctx, L, G, S.expoA, t, true);
      if (S.camFlash > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + (S.camFlash * 0.5) + ')'; ctx.fillRect(P.x, P.y, P.w, P.h); }
    } else {
      // 지름 10°씩 점선 고리 (돌아가는 모습이 잘 보이도록)
      ctx.setLineDash([3, 7]); ctx.strokeStyle = 'rgba(150,175,235,.22)'; ctx.lineWidth = 1;
      [10, 20, 30, 40, 50, 60].forEach((p) => { circle(ctx, G.cx, G.cy, p * G.k); ctx.stroke(); });
      ctx.setLineDash([]);
      for (let i = 0; i < ST.length; i++) {
        const s = ST[i];
        if (s.dec < 20) continue;
        polarXY(G, s.ra, s.dec, Tv, 0, _pp);
        if (_pp.x < P.x || _pp.x > P.x + P.w || _pp.y < P.y || _pp.y > P.y + P.h) continue;
        drawStarDot(ctx, s, _pp.x, _pp.y, 0.95, t, fs * 0.95);
      }
      ctx.globalAlpha = 1;
      // 카시오페이아 선
      ctx.strokeStyle = 'rgba(255,207,154,.38)'; ctx.lineWidth = 1.3 * fs; ctx.beginPath();
      CONS_BY.cas.lines.forEach((ln) => { const a = polarXY(G, STAR[ln[0]].ra, STAR[ln[0]].dec, Tv, 0, _pp), ax = a.x, ay = a.y, b = polarXY(G, STAR[ln[1]].ra, STAR[ln[1]].dec, Tv, 0, _pq); ctx.moveTo(ax, ay); ctx.lineTo(b.x, b.y); });
      ctx.stroke();
      // 지금(21시) 북두칠성 또는 시간이 흐르는 북두칠성
      const pr = S.predict;
      const real = drawDipperAt(ctx, L, G, Tv, 0, { line: pr.revealed ? 'rgba(94,234,212,.95)' : 'rgba(154,215,255,.9)', starCol: pr.revealed ? '#5eead4' : '#9ad7ff', glow: 0.5, lw: 2.4 });
      if (!pr.revealed || pr.k < 0.05) {
        const lp = real[0];
        pill(ctx, '21:00의 북두칠성', lp.x, lp.y - 26 * fs, { font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), color: '#9ad7ff' });
      }
      // 내가 돌린 유령 (반투명)
      const ga = S.ghost.a;
      if (Math.abs(ga) > 0.3 || S.ghostTouched || true) {
        drawDipperAt(ctx, L, G, PH_T0, ga, { line: 'rgba(253,230,138,.8)', starCol: '#fde68a', a: 0.85, dash: [7, 6], lw: 2.2, rad: 3.2 });
        // 돌린 각 표시 (원호 + 화살표)
        const rr = 60 * fs;
        if (Math.abs(ga) > 1) {
          ctx.strokeStyle = 'rgba(253,230,138,.9)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
          const a0 = polarTh(DIPPER.ids[6].ra, PH_T0);
          ctx.beginPath(); ctx.arc(G.cx, G.cy, rr, -a0 * DEG, -(a0 + ga) * DEG, ga > 0); ctx.stroke();
          const ea = (a0 + ga) * DEG, ex = G.cx + rr * Math.cos(ea), ey = G.cy - rr * Math.sin(ea), dir = ga > 0 ? 1 : -1, tx = -Math.sin(ea) * dir, ty = -Math.cos(ea) * dir;
          ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.moveTo(ex + tx * 12, ey + ty * 12); ctx.lineTo(ex - ty * 6, ey + tx * 6); ctx.lineTo(ex + ty * 6, ey - tx * 6); ctx.closePath(); ctx.fill();
          const md = (a0 + ga / 2) * DEG;
          pill(ctx, Math.round(Math.abs(ga)) + '°' + (ga < 0 ? ' (시계 방향)' : ''), G.cx + Math.cos(md) * (rr + 30 * fs), G.cy - Math.sin(md) * (rr + 30 * fs), { font: fnt(L, 14.5, 'bold'), h: Math.round(26 * fs), pad: 10, bg: 'rgba(253,230,138,.95)', color: '#3b2a00' });
        }
      }
      if (!S.ghostTouched) {
        pill(ctx, '👆 화면을 돌려 노란 북두칠성을 옮겨 보세요', P.x + P.w / 2, P.y + 62 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 13, bg: 'rgba(14,165,233,.92)' });
      }
      if (pr.revealed && pr.k > 0.9) {
        pill(ctx, '실제 24:00 위치 (청록색)', G.cx, P.y + 28 * fs, { font: fnt(L, 14.5, 'bold'), h: Math.round(30 * fs), pad: 13, bg: 'rgba(5,150,105,.94)', stroke: '#6ee7b7' });
      }
    }
    // 북극 표시
    const pol = polarXY(G, STAR.polaris.ra, STAR.polaris.dec, Tv, 0, _pp);
    drawStarDot(ctx, STAR.polaris, pol.x, pol.y, 1, t, fs * 1.15);
    ctx.globalAlpha = 1;
    drawPolarGround(ctx, L, G);
    ctx.fillStyle = '#cfe0ff'; ctx.font = dfnt(L, 18); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('서', P.x + 26 * fs, P.y + P.h - 22 * fs); ctx.fillText('북', G.cx, P.y + P.h - 18 * fs); ctx.fillText('동', P.x + P.w - 26 * fs, P.y + P.h - 22 * fs);
    ctx.textBaseline = 'alphabetic';
    // 북극성 이름표와 중심
    ctx.strokeStyle = 'rgba(94,234,212,.55)'; ctx.lineWidth = 1.4; circle(ctx, G.cx, G.cy, 11 * fs); ctx.stroke();
    if (!(mode === 'photo' && S.pc.snap)) pill(ctx, '북극성', G.cx + 36 * fs, G.cy - 20 * fs, { font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), color: '#5eead4' });
    // 안내 알약
    pill(ctx, mode === 'photo' ? '📷 북쪽 하늘 · 21:00부터 ' + Math.round(S.expoA * 10) / 10 + '시간 노출' : '🎯 북쪽 하늘 · 북극성이 가운데', P.x + 14, P.y + 22 * fs, { align: 'left', font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), bg: 'rgba(6,10,26,.7)', color: '#e6eeff' });
    if (mode === 'photo' && on('protractor')) drawProtractor(ctx, L, G, t);
    ctx.restore();
    panelEdge(ctx, P);
    polarSide(ctx, L, t, G);
  }
  // 옆 패널: 시계 + 읽기값
  function polarSide(ctx, L, t, G) {
    const Pn = L.pside, fs = L.fs, mode = S.pmode;
    panelBase(ctx, Pn, L.starsPside, t); panelEdge(ctx, Pn);
    const x0 = Pn.x, y0 = Pn.y;
    ctx.textAlign = 'center';
    const T = mode === 'photo' ? PH_T0 + S.expoA : S.predict.T;
    if (L.col) {
      const cx = x0 + Pn.w / 2;
      ctx.fillStyle = '#e6eeff'; ctx.font = dfnt(L, 19); ctx.fillText(mode === 'photo' ? '📷 장노출 사진' : '🎯 3시간 뒤 예측', cx, y0 + 34);
      drawClock(ctx, L, cx, y0 + 112, 50, T);
      ctx.fillStyle = '#fff'; ctx.font = dfnt(L, 26); ctx.fillText(hhmm(T), cx, y0 + 196);
      ctx.fillStyle = '#b9c8ee'; ctx.font = fnt(L, 13.5, 'bold');
      ctx.fillText(mode === 'photo' ? '21:00 → ' + hhmm(PH_T0 + S.expo) : '21:00 → 24:00', cx, y0 + 220);
      if (mode === 'photo') {
        ctx.fillStyle = '#d6e4ff'; ctx.fillText('노출 ' + (Math.round(S.expoA * 10) / 10) + '시간', cx, y0 + 244);
        if (on('protractor')) {
          ctx.strokeStyle = 'rgba(160,190,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + 16, y0 + 268); ctx.lineTo(x0 + Pn.w - 16, y0 + 268); ctx.stroke();
          ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('각도기로 잰 각', cx, y0 + 294);
          ctx.fillStyle = S.pc.snap ? '#fde68a' : '#7a8bb8'; ctx.font = dfnt(L, 46); ctx.fillText(angTxt(), cx, y0 + 346);
          ctx.fillStyle = S.pc.snap ? '#9fb3e0' : '#f59e0b'; ctx.font = fnt(L, 13, 'bold');
          ctx.fillText(S.pc.snap ? '중심이 북극성에 맞았어요' : '각도기 중심을 북극성에!', cx, y0 + 370);
          wrapSmall(ctx, L, '두 팔을 같은 별의 호 양 끝에 맞춰요.', cx, y0 + 408, Pn.w - 24, 18 * fs);
        }
      } else {
        const gv = Math.round(S.ghost.a);
        ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('내가 돌린 각', cx, y0 + 270);
        ctx.fillStyle = S.ghostTouched ? '#fde68a' : '#7a8bb8'; ctx.font = dfnt(L, 46); ctx.fillText(Math.abs(gv) + '°', cx, y0 + 322);
        ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText(gv < -1 ? '시계 방향' : gv > 1 ? '시계 반대 방향' : '', cx, y0 + 346);
        wrapSmall(ctx, L, '1시간에 몇 도씩 돌았는지 떠올려 봐요.', cx, y0 + 392, Pn.w - 24, 18 * fs);
      }
    } else {
      const cx = x0 + 96, cy = y0 + 150;
      ctx.fillStyle = '#e6eeff'; ctx.font = dfnt(L, 22); ctx.textAlign = 'left'; ctx.fillText(mode === 'photo' ? '📷 장노출 사진' : '🎯 3시간 뒤 예측', x0 + 18, y0 + 40);
      drawClock(ctx, L, cx, cy + 10, 70, T);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = dfnt(L, 34); ctx.fillText(hhmm(T), x0 + 196, y0 + 120);
      ctx.fillStyle = '#b9c8ee'; ctx.font = fnt(L, 14, 'bold');
      ctx.fillText(mode === 'photo' ? '21:00 → ' + hhmm(PH_T0 + S.expo) + ' · 노출 ' + (Math.round(S.expoA * 10) / 10) + '시간' : '21:00 → 24:00 (3시간 뒤)', x0 + 198, y0 + 150);
      if (mode === 'photo' && on('protractor')) {
        ctx.fillStyle = '#9fb3e0'; ctx.fillText('각도기로 잰 각', x0 + 198, y0 + 196);
        ctx.fillStyle = S.pc.snap ? '#fde68a' : '#7a8bb8'; ctx.font = dfnt(L, 44); ctx.fillText(angTxt(), x0 + 198, y0 + 244);
        ctx.fillStyle = S.pc.snap ? '#9fb3e0' : '#f59e0b'; ctx.font = fnt(L, 13, 'bold');
        ctx.fillText(S.pc.snap ? '중심이 북극성에 맞았어요' : '각도기 중심을 북극성에!', x0 + 198, y0 + 272);
      } else if (mode === 'predict') {
        const gv = Math.round(S.ghost.a);
        ctx.fillStyle = '#9fb3e0'; ctx.fillText('내가 돌린 각', x0 + 198, y0 + 196);
        ctx.fillStyle = S.ghostTouched ? '#fde68a' : '#7a8bb8'; ctx.font = dfnt(L, 44); ctx.fillText(Math.abs(gv) + '°', x0 + 198, y0 + 244);
        ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText(gv < -1 ? '시계 방향' : gv > 1 ? '시계 반대 방향' : '', x0 + 198, y0 + 272);
      }
    }
    ctx.textAlign = 'center';
  }
  const angTxt = () => ((S.pc.snap || S.armTouched) ? Math.round(S.armAng) + '°' : '—');
  function wrapSmall(ctx, L, text, cx, y, maxW, lh) {
    ctx.fillStyle = 'rgba(190,205,240,.85)'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'center';
    const words = text.split(' '); let line = '', yy = y;
    words.forEach((w) => { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, cx, yy); yy += lh; line = w; } else line = test; });
    if (line) ctx.fillText(line, cx, yy);
  }

  /* =========================================================
     북극 위에서 본 지구 (우주 창)
     방위 등거리 투영: 북극이 가운데, 반지름 r = R×(90°−위도)/90°, 동쪽 = 시계 반대 방향
     ========================================================= */
  const LAND = {
    eurasia: [[37, -9], [43, -9], [43, -2], [47, -2], [48.5, -5], [51, 2], [54, 8], [57, 8], [55, 13], [59, 11], [58, 5], [63, 5], [67, 14], [71, 26], [70, 31], [67, 41], [69, 45], [68, 56], [72, 66], [73, 80], [77, 104], [73, 113], [73, 130], [71, 150], [69, 170], [66, 180], [64, 188], [62, 180], [60, 172], [59, 163], [56, 162], [51, 156], [53, 155], [59, 153], [59, 143], [54, 138], [48, 140], [43, 132], [40, 129.5], [38, 128.5], [35, 129], [34.5, 127], [37, 126], [39, 125], [40, 124.5], [39, 122], [38, 118.5], [37, 122.5], [35, 119.5], [31, 122], [27, 120.5], [22, 114], [21, 110], [20.5, 106.5], [16, 108], [10.5, 107], [8.5, 105], [12, 100], [8, 100], [2, 103.5], [6, 100], [13, 98], [16, 94], [21, 92], [22, 89], [19, 85], [15, 80.5], [10, 79], [8, 77.5], [12, 75], [21, 72.5], [24, 67], [25, 62], [26, 57], [24, 56.5], [22, 59.5], [17, 55], [13, 45], [15, 42.5], [21, 39], [28, 34.5], [30, 32.5], [36.5, 36], [36.7, 30], [37, 27], [40, 26], [39, 22], [36.5, 22.5], [40, 19], [45, 13], [44, 8], [43, 3], [41, 2], [37.5, -1], [36, -5.5]],
    africa: [[30, 32.5], [31, 30], [31, 25], [32.5, 20], [30, 19], [33, 11], [37, 10], [37, 5], [35.5, -1], [35.8, -5.5], [32, -9.5], [28, -13], [21, -17], [15, -17], [12, -16], [9, -13.5], [6, -10], [5, -3], [6, 2], [6, 6], [4, 9.5], [0, 9.5], [0, 20], [0, 30], [0, 42], [4, 48], [11, 51], [12.5, 43.5], [15, 40], [22, 37], [27, 34]],
    namerica: [[49, -125], [55, -130], [58, -136], [60, -141], [59, -151], [57, -158], [55, -163], [59, -162], [61, -166], [64, -166], [66, -162], [68, -166], [71, -156], [70, -141], [69, -130], [68, -115], [68, -97], [70, -90], [66, -84], [64, -93], [60, -94], [57, -92], [55, -83], [52, -80], [55, -78], [60, -78], [62, -72], [58, -68], [53, -60], [50, -56], [47, -53], [46, -60], [44, -66], [42, -70], [41, -74], [37, -76], [35, -75.5], [31, -81], [25.5, -80.3], [25.5, -81.5], [29, -83], [30, -86], [29.5, -90], [29, -94.5], [26, -97], [22, -97.5], [19, -96], [19, -91], [21, -87], [16, -88], [15.5, -83.5], [11, -83.5], [9, -82], [8.5, -77], [11, -74], [12, -71.5], [11, -62], [10, -61], [6, -55], [4, -51], [0, -50], [0, -60], [0, -70], [0, -80], [4, -77.5], [8, -78.5], [8, -83], [10, -85.5], [13, -88], [16, -95], [19, -105], [23, -109.5], [29, -114.5], [32, -117], [34.5, -120.5], [38, -123], [43, -124.5]],
    greenland: [[60, -44], [62, -50], [67, -54], [70, -52], [76, -60], [78, -72], [82, -62], [83, -40], [81, -20], [77, -19], [72, -22], [69, -25], [66, -35], [63, -41]],
    britain: [[50, -5], [51, 1.5], [53, 1.7], [55, -1.5], [58.5, -3], [58, -5.5], [55, -6], [54, -3], [53, -4.5], [51.5, -3], [50.5, -4]],
    japan: [[31, 131], [34, 131], [35.5, 135], [34, 136], [35, 139.5], [38, 141], [41, 141.5], [44, 145], [45, 142], [41, 140], [37, 137], [35.5, 133]],
    iceland: [[63.5, -22], [64, -14], [65.5, -14], [66.3, -18], [65.5, -24]],
    borneo: [[7, 117], [4, 118.5], [1, 116], [1, 110], [2, 109.5], [4, 113]],
    luzon: [[18.5, 121], [16, 122], [13.5, 124], [14, 120.5], [16, 119.8]],
  };
  const LAND_COL = { eurasia: '#46a35e', africa: '#c7a85a', namerica: '#4f9d58', greenland: '#e8f1f8', britain: '#4f9d58', japan: '#4f9d58', iceland: '#dfeaf0', borneo: '#3f9456', luzon: '#3f9456' };
  const SEOUL_LON = 127;
  // 가장자리를 5° 간격으로 나눠 (위도, 경도)에서 곡선이 부드럽게 보이게 해요 → [r(0~1), 각(도, 서울 기준)]
  const LAND_P = {};
  Object.keys(LAND).forEach((k) => {
    const poly = LAND[k], out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 4));
      for (let j = 0; j < n; j++) { const u = j / n, lat = a[0] + (b[0] - a[0]) * u, lon = a[1] + (b[1] - a[1]) * u; out.push([(90 - lat) / 90, lon - SEOUL_LON]); }
    }
    LAND_P[k] = out;
  });
  function landPath(ctx, key, cx, cy, R, rot) {
    const pts = LAND_P[key];
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const a = (pts[i][1] + rot) * DEG, r = pts[i][0] * R, x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  const _phi = (T) => (lstOf(T) - SUN.ra) * 15;                    // 관측자의 위치각 = 자오선이 가리키는 방향 (태양 방향 0°)
  const earthRot = (T) => (T - 12) * 15;                           // 지구 그림 회전각 (정오에 서울이 태양 쪽)
  const obsAng = (T) => earthRot(T);                               // 서울 핀이 있는 화면 각도

  // 지구 원반 (밝은 쪽은 오른쪽, 밤 쪽은 어둡게)
  function drawEarthDisc(ctx, L, G, rot, t) {
    const { cx, cy, R } = G, fs = L.fs;
    // 대기 후광(햇빛 쪽)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ag = ctx.createRadialGradient(cx + R * 0.12, cy, R * 0.92, cx + R * 0.12, cy, R * 1.28);
    ag.addColorStop(0, 'rgba(110,190,255,.42)'); ag.addColorStop(1, 'rgba(110,190,255,0)');
    ctx.fillStyle = ag; circle(ctx, cx, cy, R * 1.28); ctx.fill(); ctx.restore();
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#1d5aa8'; circle(ctx, cx, cy, R); ctx.fill(); ctx.restore();
    ctx.save(); circle(ctx, cx, cy, R); ctx.clip();
    const og = ctx.createRadialGradient(cx + R * 0.15, cy - R * 0.1, R * 0.05, cx, cy, R);
    og.addColorStop(0, '#3a8ee0'); og.addColorStop(0.6, '#2368b8'); og.addColorStop(1, '#174a8e');
    ctx.fillStyle = og; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // 위도·경도 눈금
    ctx.strokeStyle = 'rgba(200,225,255,.2)'; ctx.lineWidth = 1;
    [30, 60].forEach((lat) => { circle(ctx, cx, cy, R * (90 - lat) / 90); ctx.stroke(); });
    for (let lon = 0; lon < 360; lon += 30) { const a = (lon + rot) * DEG; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(a), cy - R * Math.sin(a)); ctx.stroke(); }
    // 대륙
    Object.keys(LAND).forEach((k) => {
      landPath(ctx, k, cx, cy, R, rot);
      ctx.fillStyle = LAND_COL[k]; ctx.fill();
      ctx.strokeStyle = 'rgba(20,50,30,.4)'; ctx.lineWidth = 0.9; ctx.stroke();
    });
    // 북극 얼음
    const ig = ctx.createRadialGradient(cx, cy, 1, cx, cy, R * 0.2);
    ig.addColorStop(0, 'rgba(245,250,255,.95)'); ig.addColorStop(0.7, 'rgba(235,245,255,.8)'); ig.addColorStop(1, 'rgba(235,245,255,0)');
    ctx.fillStyle = ig; circle(ctx, cx, cy, R * 0.2); ctx.fill();
    // 밤: 왼쪽 절반을 부드럽게 어둡게 (경계 띠)
    const ng = ctx.createLinearGradient(cx - R * 0.36, 0, cx + R * 0.22, 0);
    ng.addColorStop(0, 'rgba(2,5,18,.82)'); ng.addColorStop(1, 'rgba(2,5,18,0)');
    ctx.fillStyle = ng; ctx.fillRect(cx - R - 2, cy - R - 2, R + 2 + R * 0.22, R * 2 + 4);
    // 햇빛 쪽 가장자리 빛
    const rg = ctx.createRadialGradient(cx - R * 0.3, cy, R * 0.6, cx, cy, R);
    rg.addColorStop(0, 'rgba(255,240,200,0)'); rg.addColorStop(1, 'rgba(255,236,190,.16)');
    ctx.fillStyle = rg; ctx.fillRect(cx, cy - R, R, R * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(190,225,255,.7)'; ctx.lineWidth = 1.6; circle(ctx, cx, cy, R); ctx.stroke();
    // 북극 점
    ctx.fillStyle = '#ffffff'; circle(ctx, cx, cy, 3.2 * fs); ctx.fill();
    ctx.fillStyle = '#cfe0ff'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'center'; ctx.fillText('북극', cx, cy - 8 * fs);
  }

  // 먼 별 방향 표지 (작은 별자리 그림)
  function markIcon(ctx, L, m, x, y, k, t) {
    const sc = 1.55 * L.fs * (0.9 + 0.2 * k);
    ctx.save(); ctx.translate(x, y);
    if (m.key === 'sirius') {
      const g = 11 * L.fs * (0.9 + 0.3 * k);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.45 * k; ctx.drawImage(glowSpr(m.col), -g * 1.7, -g * 1.7, g * 3.4, g * 3.4);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff'; circle(ctx, 0, 0, 3.6 * L.fs); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-g, 0); ctx.lineTo(g, 0); ctx.moveTo(0, -g); ctx.lineTo(0, g); ctx.stroke();
    } else {
      const C = CONS_BY[m.key], ra0 = C.ids.reduce((a, s) => a + s.ra, 0) / C.ids.length, dc0 = C.ids.reduce((a, s) => a + s.dec, 0) / C.ids.length;
      const pos = C.ids.map((s) => ({ x: -(s.ra - ra0) * 15 * Math.cos(dc0 * DEG) * sc * (m.key === 'orion' ? 1 : 0.9), y: -(s.dec - dc0) * sc * (m.key === 'orion' ? 1 : 1.2) }));
      ctx.strokeStyle = rgbS(hexRgb(m.col), 0.45 + 0.4 * k); ctx.lineWidth = 1.3; ctx.beginPath();
      C.lines.forEach((ln) => { const a = pos[C.stars.indexOf(ln[0])], b = pos[C.stars.indexOf(ln[1])]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); });
      ctx.stroke();
      ctx.fillStyle = m.col; ctx.globalAlpha = 0.65 + 0.35 * k;
      pos.forEach((p, i) => { circle(ctx, p.x, p.y, (C.ids[i].rad > 2.4 ? 2.5 : 1.9) * L.fs); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function spaceBgSprite(L, M) {
    return sprite('spbg-' + L.key, M.w, M.h, (g, w, h) => {
      const bg = g.createRadialGradient(w * 0.46, h * 0.5, 20, w * 0.46, h * 0.5, Math.max(w, h) * 0.75);
      bg.addColorStop(0, '#17264f'); bg.addColorStop(0.6, '#0e1838'); bg.addColorStop(1, '#070d1f');
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
    });
  }
  const QUADS = [{ a: 0, name: '정오', i: 2 }, { a: 90, name: '해 질 무렵', i: 3 }, { a: 180, name: '한밤중', i: 0 }, { a: 270, name: '해 뜰 무렵', i: 1 }];
  function spaceScene(ctx, L, t, V) {
    const G = spaceGeo(L), M = G.M, fs = L.fs, T = S.tA, rot = earthRot(T), oa = rot, cx = G.cx, cy = G.cy, R = G.R;
    ctx.save(); roundRect(ctx, M.x, M.y, M.w, M.h, 14); ctx.clip();
    ctx.drawImage(spaceBgSprite(L, M), M.x, M.y, M.w, M.h);
    drawBgStars(ctx, L.starsSpace, t, 0.85);
    // 태양과 햇빛
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const sg = G.sunR * 4.2;
    const g1 = ctx.createRadialGradient(G.sunX, cy, G.sunR * 0.6, G.sunX, cy, sg);
    g1.addColorStop(0, 'rgba(255,200,96,.62)'); g1.addColorStop(0.35, 'rgba(255,160,64,.2)'); g1.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g1; ctx.fillRect(M.x, M.y, M.w, M.h);
    ctx.restore();
    const sunD = ctx.createRadialGradient(G.sunX - G.sunR * 0.2, cy - G.sunR * 0.2, G.sunR * 0.1, G.sunX, cy, G.sunR);
    sunD.addColorStop(0, '#fff7d6'); sunD.addColorStop(0.55, '#ffcf5a'); sunD.addColorStop(1, '#ff9a2e');
    ctx.fillStyle = sunD; circle(ctx, G.sunX, cy, G.sunR); ctx.fill();
    // 햇빛 화살표 (왼쪽으로 흘러요)
    ctx.strokeStyle = 'rgba(255,225,140,.75)'; ctx.lineWidth = 2.2 * Math.min(1.2, fs); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let j = -3; j <= 3; j++) {
      const dy = j * R * 0.27, limb = cx + Math.sqrt(Math.max(0, R * R - dy * dy)) + 6, x0 = G.sunX - G.sunR - 8, span = x0 - limb;
      if (span < 20) continue;
      const ph = RM ? 0.3 : ((t * 0.35 + j * 0.17) % 1 + 1) % 1;
      for (let q = 0; q < 3; q++) {
        const u = (ph + q / 3) % 1, x = x0 - span * u, a = Math.sin(u * Math.PI);
        ctx.globalAlpha = 0.85 * a; ctx.beginPath(); ctx.moveTo(x + 6, cy + dy - 5); ctx.lineTo(x, cy + dy); ctx.lineTo(x + 6, cy + dy + 5); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    pill(ctx, '☀️ 햇빛', M.x + M.w - 50 * fs, M.y + 22 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(26 * fs), color: '#ffd36b', bg: 'rgba(6,10,26,.7)' });
    // 먼 별 고리
    ctx.setLineDash([2, 7]); ctx.strokeStyle = 'rgba(160,190,255,.4)'; ctx.lineWidth = 1.4; circle(ctx, cx, cy, G.ring); ctx.stroke(); ctx.setLineDash([]);
    // 관측자가 볼 수 있는 하늘 (남쪽 하늘: 동 ~ 서)
    const half = 85, steps = 18, oaR = oa * DEG;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) { const a = oaR + (-half + 2 * half * i / steps) * DEG; ctx.lineTo(cx + (G.ring + 6) * Math.cos(a), cy - (G.ring + 6) * Math.sin(a)); }
    for (let i = steps; i >= 0; i--) { const a = oaR + (-half + 2 * half * i / steps) * DEG; ctx.lineTo(cx + (R + 3) * Math.cos(a), cy - (R + 3) * Math.sin(a)); }
    ctx.closePath();
    const fg = ctx.createRadialGradient(cx, cy, R, cx, cy, G.ring + 6);
    fg.addColorStop(0, 'rgba(94,234,212,.30)'); fg.addColorStop(1, 'rgba(94,234,212,.07)');
    ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = 'rgba(94,234,212,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 5]);
    [-half, half].forEach((dd) => { const a = oaR + dd * DEG; ctx.beginPath(); ctx.moveTo(cx + (R + 3) * Math.cos(a), cy - (R + 3) * Math.sin(a)); ctx.lineTo(cx + (G.ring + 6) * Math.cos(a), cy - (G.ring + 6) * Math.sin(a)); ctx.stroke(); });
    ctx.setLineDash([]);
    // 별 표지
    MARKS.forEach((m) => {
      const b = markAng(m) * DEG, k = S.link[m.key] || 0, mx = cx + G.ring * Math.cos(b), my = cy - G.ring * Math.sin(b);
      if (k > 0.02) {
        ctx.save(); ctx.globalAlpha = k * 0.9; ctx.strokeStyle = m.col; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
        const pxy = obsPos(G, oa); ctx.beginPath(); ctx.moveTo(pxy.x + Math.cos(b) * 0, pxy.y); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }
      ctx.globalAlpha = 0.55 + 0.45 * k; markIcon(ctx, L, m, mx, my, k, t); ctx.globalAlpha = 1;
      ctx.font = fnt(L, 13, 'bold');
      const lw = ctx.measureText(m.name).width / 2 + 10;
      let off = m.key === 'sirius' ? -(34 * fs) : 36 * fs;
      if (mx + Math.cos(b) * off - lw < M.x + 6) off = -Math.abs(off);
      pill(ctx, m.name, clamp(mx + Math.cos(b) * off, M.x + lw + 6, M.x + M.w - lw - 6), my - Math.sin(b) * off, { font: fnt(L, 13, 'bold'), h: Math.round(23 * fs), pad: 9, color: k > 0.5 ? m.col : '#9fb3e0', bg: 'rgba(6,10,26,.78)', stroke: k > 0.5 ? m.col : null });
    });
    // 지구
    drawEarthDisc(ctx, L, G, rot, t);
    // 15°마다 눈금(1시간)
    for (let i = 0; i < 24; i++) {
      const a = i * 15 * DEG, big = i % 6 === 0;
      ctx.strokeStyle = big ? 'rgba(255,255,255,.75)' : 'rgba(200,220,255,.42)'; ctx.lineWidth = big ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(cx + (R + 3) * Math.cos(a), cy - (R + 3) * Math.sin(a)); ctx.lineTo(cx + (R + (big ? 11 : 7)) * Math.cos(a), cy - (R + (big ? 11 : 7)) * Math.sin(a)); ctx.stroke();
    }
    if (S.tickA > 0.02) {
      const a = Math.round(oa / 15) * 15 * DEG;
      ctx.strokeStyle = 'rgba(94,234,212,' + S.tickA + ')'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(cx + (R + 2) * Math.cos(a), cy - (R + 2) * Math.sin(a)); ctx.lineTo(cx + (R + 15) * Math.cos(a), cy - (R + 15) * Math.sin(a)); ctx.stroke();
    }
    // 관측자 (서울) : 위에서 본 사람과 시선
    const op = obsPos(G, oa), oR = oa * DEG, ux = Math.cos(oR), uy = -Math.sin(oR);
    ctx.strokeStyle = 'rgba(94,234,212,.9)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(op.x + ux * 9 * fs, op.y + uy * 9 * fs); ctx.lineTo(cx + (G.ring - 4) * ux, cy + (G.ring - 4) * uy); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(op.x, op.y); ctx.rotate(Math.atan2(uy, ux)); ctx.scale(1.3, 1.3);
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(-1, 0, 4.8 * fs, 8.4 * fs, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffe9b0'; circle(ctx, 1.5 * fs, 0, 4.2 * fs); ctx.fill();
    ctx.fillStyle = '#5eead4'; ctx.beginPath(); ctx.moveTo(11 * fs, 0); ctx.lineTo(6.2 * fs, -3.8 * fs); ctx.lineTo(6.2 * fs, 3.8 * fs); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; circle(ctx, op.x, op.y, 14 * fs + 1.5 * Math.sin(t * 4)); ctx.stroke();
    pill(ctx, '서울', op.x - ux * 30 * fs, op.y - uy * 30 * fs - 2, { font: fnt(L, 13, 'bold'), h: Math.round(22 * fs), pad: 8, color: '#fde68a' });
    // 남쪽 표시와 동·서 표시 (관측자의 시선 = 남쪽)
    const sp = G.ring - 2 * fs;
    pill(ctx, '남쪽', cx + sp * ux, cy + sp * uy, { font: fnt(L, 13, 'bold'), h: Math.round(23 * fs), color: '#5eead4', bg: 'rgba(6,30,34,.82)', stroke: 'rgba(94,234,212,.6)' });
    [[half - 4, '동'], [-half + 4, '서']].forEach((q) => {
      const a = oaR + q[0] * DEG, rr = G.ring - 24 * fs;
      pill(ctx, q[1], cx + rr * Math.cos(a), cy - rr * Math.sin(a), { font: fnt(L, 13, 'bold'), h: Math.round(23 * fs), pad: 9, color: '#5eead4', bg: 'rgba(6,30,34,.82)' });
    });
    // 지구 둘레 네 지점 (정오·해 질 무렵·한밤중·해 뜰 무렵)
    QUADS.forEach((q) => {
      const a = q.a * DEG, ok = S.space.hit[q.i];
      ctx.font = fnt(L, 13, 'bold');
      const w = ctx.measureText(q.name).width + 16, h = Math.round(22 * fs), rr = R + 14 * fs + Math.abs(Math.cos(a)) * w / 2 + Math.abs(Math.sin(a)) * h / 2 + 4;
      const x = cx + rr * Math.cos(a), y = cy - rr * Math.sin(a);
      pill(ctx, (ok ? '✓ ' : '') + q.name, x, y, { font: ctx.font, h, pad: 8, color: ok ? '#34d399' : '#cfe0ff', bg: 'rgba(6,10,26,.78)', stroke: ok ? 'rgba(52,211,153,.8)' : null });
    });
    // 자전 방향 화살표 (서→동 = 시계 반대 방향)
    const ar = R * 1.07 + 34 * fs, a0 = 28 * DEG, a1 = 70 * DEG;
    ctx.strokeStyle = '#ffd166'; ctx.fillStyle = '#ffd166'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, ar, -a1, -a0, false); ctx.stroke();
    { const ex = cx + ar * Math.cos(a1), ey = cy - ar * Math.sin(a1), tx = -Math.sin(a1), ty = -Math.cos(a1);
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(ex + tx * 12 * fs, ey + ty * 12 * fs); ctx.lineTo(ex - ty * 8 * fs, ey + tx * 8 * fs); ctx.lineTo(ex + ty * 8 * fs, ey - tx * 8 * fs); ctx.closePath(); ctx.fill(); }
    pill(ctx, '🌍 북극 위에서 내려다본 지구', M.x + 14, M.y + 22 * fs, { align: 'left', font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), bg: 'rgba(6,10,26,.7)', color: '#e6eeff' });
    pill(ctx, '↺ 자전: 서 → 동 (반시계 방향)', M.x + 14, M.y + 22 * fs + 32 * fs, { align: 'left', font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), pad: 10, color: '#3b2a00', bg: 'rgba(255,209,102,.96)' });
    if (isNew('space') && S.spaceTouched !== 2) newRingCircle(ctx, L, cx, cy, R + 8);
    if (!S.spaceTouched) {
      ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(253,230,138,' + (0.4 + 0.5 * pulse()) + ')'; ctx.lineWidth = 2.4; circle(ctx, cx, cy, R + 4); ctx.stroke(); ctx.setLineDash([]);
      pill(ctx, '👆 지구를 끌어서 돌려 보세요', M.x + M.w / 2, M.y + M.h - 24 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 13, bg: 'rgba(14,165,233,.92)' });
    }
    ctx.restore();
    panelEdge(ctx, M);
    spaceSide(ctx, L, t);
  }
  const obsPos = (G, oa) => { const r = G.R * (90 - LAT) / 90, a = oa * DEG; return { x: G.cx + r * Math.cos(a), y: G.cy - r * Math.sin(a) }; };
  // 옆 패널: 서울의 하늘(작게) + 시계
  function spaceSide(ctx, L, t) {
    const Mn = L.mini, Cb = L.cbox, fs = L.fs, T = S.tA;
    drawSky(ctx, L, Mn, t, { mini: true, view: 'south', tt: T, fade: 1, links: S.link });
    pill(ctx, '🔭 서울의 남쪽 하늘', Mn.x + 10, Mn.y + 20 * fs, { align: 'left', font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), pad: 9, bg: 'rgba(6,10,26,.68)', color: '#e6eeff' });
    panelEdge(ctx, Mn);
    panelBase(ctx, Cb, L.starsCbox, t); panelEdge(ctx, Cb);
    const cx = Cb.x + Cb.w / 2, r = L.col ? 52 : 46;
    drawClock(ctx, L, cx, Cb.y + (L.col ? 78 : 76), r, T);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = dfnt(L, L.col ? 32 : 28); ctx.fillText(hhmm(T), cx, Cb.y + (L.col ? 170 : 160));
    ctx.fillStyle = '#b9c8ee'; ctx.font = fnt(L, 13.5, 'bold'); ctx.fillText(dayWord(T), cx, Cb.y + (L.col ? 194 : 182));
    const day = sunAltAt(T) > -2;
    pill(ctx, day ? '☀️ 서울은 지금 낮' : '🌙 서울은 지금 밤', cx, Cb.y + (L.col ? 224 : 208), { font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), pad: 11, bg: day ? 'rgba(180,120,20,.9)' : 'rgba(24,36,86,.95)', color: day ? '#fff6d6' : '#cfe0ff', stroke: day ? '#fcd34d' : 'rgba(160,190,255,.5)' });
    wrapSmall(ctx, L, '지구는 하루(24시간)에 한 바퀴, 1시간에 15°씩 돌아요.', cx, Cb.y + (L.col ? 262 : 240), Cb.w - 22, 17 * fs);
    ctx.textAlign = 'left';
  }

  /* =========================================================
     전체 그리기 · 화면 전환
     ========================================================= */
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
  function draw(V, t) {
    const { v, L } = V, ctx = v.ctx;
    v.clear('#070d1f');
    if (S.scene === 'sky') skyScene(ctx, L, t, V);
    else if (S.scene === 'polar') polarScene(ctx, L, t, V);
    else spaceScene(ctx, L, t, V);
    V.P.draw(ctx);
    drawFx(ctx, V);
    if (S.sceneA < 0.995) { ctx.fillStyle = 'rgba(7,13,31,' + ((1 - S.sceneA) * 0.94) + ')'; ctx.fillRect(0, 0, L.vw, L.vh); }
  }
  function setScene(name, mode) {
    const changed = S.scene !== name || (mode && S.pmode !== mode);
    if (mode) S.pmode = mode;
    S.scene = name;
    if (changed) { S.sceneA = 0.001; SciSim.tween(S, { sceneA: 1 }, { duration: 0.45, ease: 'outCubic' }); }
    S.playing = false;
    syncControls();
  }
  function setView(v, instant) {
    if (v !== 'south' && v !== 'north') return;
    if (S.view === v && S.viewShown === v) return;
    S.view = v;
    if (instant || RM) { S.viewShown = v; S.viewFade = 1; }
    else SciSim.tween(S, { viewFade: 0 }, { duration: 0.16, ease: 'inOutQuad', onDone: () => { S.viewShown = S.view; SciSim.tween(S, { viewFade: 1 }, { duration: 0.28, ease: 'outCubic' }); } });
    syncControls();
  }

  /* ---------- 컨트롤 ---------- */
  const sTime = $('#sTime'), oTime = $('#oTime'), sExp = $('#sExp'), oExp = $('#oExp'), playBtn = $('#playBtn');
  const rangeTime = SciSim.bindRange(sTime, oTime, (v) => hhmm(v), (v) => { setPlaying(false); setTime(v, false); });
  const rangeExp = SciSim.bindRange(sExp, oExp, (v) => v + '시간', (v) => { S.expo = +v; Sound.tone(500 + 90 * v, 0.05, 'triangle', 0.05); S.camFlash = 0.35; });
  function setTime(v, instant) {
    const old = S.t;
    S.t = v;
    if (S.scene === 'sky' && v > old + 1e-6) S.acc[S.view] += v - old;
    if (instant) { S.tA = v; S.tAV = 0; }
    if (Math.abs(v - old) > 1e-6) S.hintPlay = false;
    if (Math.abs(+sTime.value - v) > 1e-6) rangeTime.set(clamp(v, +sTime.min, +sTime.max));
  }
  function setPlaying(p) {
    S.playing = !!p && on('clock') && (S.scene === 'sky' || S.scene === 'space');
    playBtn.innerHTML = S.playing ? '⏸ 정지' : (S.scene === 'space' ? '▶ 자전 재생' : '▶ 재생');
    playBtn.classList.toggle('btn-primary', !S.playing);
    playBtn.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  playBtn.addEventListener('click', () => {
    Sound.click();
    if (!S.playing) { const top = +sTime.max; if (S.t >= top - 0.01 && S.scene === 'sky') setTime(T_MIN, true); if (S.scene === 'space') S.spaceTouched = true; }
    setPlaying(!S.playing); S.hintPlay = false;
  });
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setPlaying(false); setView(b.dataset.v); S.tapMsg = null; }));
  function syncControls() {
    const sky = S.scene === 'sky', space = S.scene === 'space', photo = S.scene === 'polar' && S.pmode === 'photo';
    $$('#viewSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.view); b.setAttribute('aria-pressed', b.dataset.v === S.view ? 'true' : 'false'); });
    $('#cView').classList.toggle('is-off', !(sky && on('sky')) || !!S.lockView);
    $('#cTime').classList.toggle('is-off', !((sky || space) && on('clock')) || !!S.lockTime);
    $('#cExp').classList.toggle('is-off', !(photo && on('photo')));
    if (space) { sTime.min = 16; sTime.max = 48; $('#timeNote').textContent = '지구를 직접 끌어 돌려도 돼요.'; }
    else { sTime.min = T_MIN; sTime.max = T_MAX; $('#timeNote').textContent = '1시간이 2초로 흘러요.'; }
    rangeTime.set(clamp(S.t, +sTime.min, +sTime.max));
    const any = ['#cView', '#cTime', '#cExp'].some((q) => !$(q).classList.contains('is-off') && !$(q).hidden);
    $('#ctrlCard').hidden = !any;
    playBtn.innerHTML = S.playing ? '⏸ 정지' : (space ? '▶ 자전 재생' : '▶ 재생');
  }

  /* ---------- 포인터 ---------- */
  function nearestStar(L, p, maxD) {
    let best = null, bd = maxD;
    for (let i = 0; i < ST.length; i++) {
      const s = ST[i];
      if (!s.on || s.mag > 4.2) continue;
      const d = Math.hypot(p.x - s.sx, p.y - s.sy);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  const inRect = (p, R) => p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h;
  const angOf = (cx, cy, p) => Math.atan2(cy - p.y, p.x - cx) / DEG;
  function setProtractorAt(V, p, grab) {
    const G = polarGeo(V.L), x = p.x - grab.dx, y = p.y - grab.dy;
    const ou = (x - G.cx) / G.k, ov = (y - G.cy) / G.k;
    if (Math.hypot(ou, ov) * G.k < 12 * V.L.fs + 2) {
      if (!S.pc.snap) { Sound.tone(880, 0.12, 'triangle', 0.08); ringFx(V, G.cx, G.cy, 18, '#5eead4'); V.P.burst(G.cx, G.cy, { count: 10, colors: ['#5eead4', '#fde68a'], speed: 90, gravity: 0, size: 2.5 }); }
      S.pc.snap = true; S.pc.tu = 0; S.pc.tv = 0;
    } else { S.pc.snap = false; S.pc.tu = ou; S.pc.tv = ov; }
  }
  function attachPointer(V) {
    const { v, L } = V;
    let drag = null;
    const hitsAny = (p) => {
      if (S.scene === 'space') { const G = spaceGeo(L); return Math.hypot(p.x - G.cx, p.y - G.cy) < G.R + 18; }
      if (S.scene === 'polar') {
        const G = polarGeo(L);
        if (S.pmode === 'predict') return inRect(p, G.P);
        if (!on('protractor')) return false;
        const pg = protGeo(L, G), c = pcXY(G);
        if (Math.hypot(p.x - c.x, p.y - c.y) < pg.rad) return true;
        return [0, 1].some((i) => { const h = armXY(G, i); return Math.hypot(p.x - h.x, p.y - h.y) < pg.hr + 12; });
      }
      return false;
    };
    SciSim.pointer(v, {
      hover(p) {
        if (S.scene === 'sky') return nearestStar(L, p, 18 * L.fs) ? 'pointer' : null;
        return hitsAny(p) ? 'grab' : null;
      },
      down(p) {
        if (S.scene === 'sky') {
          if (!inRect(p, L.sky)) return false;
          const s = nearestStar(L, p, 20 * L.fs);
          if (!s) return false;
          tapStar(V, s);
          return false;
        }
        if (S.scene === 'polar' && S.pmode === 'photo' && on('protractor')) {
          const G = polarGeo(L), pg = protGeo(L, G), c = pcXY(G);
          let bi = -1, bd = pg.hr + 12;
          for (let i = 0; i < 2; i++) { const h = armXY(G, i), d = Math.hypot(p.x - h.x, p.y - h.y); if (d < bd) { bd = d; bi = i; } }
          if (bi >= 0) { drag = { type: 'arm', i: bi }; S.arm[bi].grab = true; S.armTouched = true; Sound.tone(620, 0.05, 'triangle', 0.05); return true; }
          if (Math.hypot(p.x - c.x, p.y - c.y) < pg.rad) { drag = { type: 'pc', dx: p.x - c.x, dy: p.y - c.y }; S.pc.grab = true; S.pc.placed = true; Sound.tone(560, 0.05, 'triangle', 0.05); return true; }
          return false;
        }
        if (S.scene === 'polar' && S.pmode === 'predict') {
          const G = polarGeo(L);
          if (!inRect(p, G.P) || S.predict.revealed || (game && game.phase !== 'active')) return false;
          drag = { type: 'ghost', last: angOf(G.cx, G.cy, p) }; S.ghostTouched = true; return true;
        }
        if (S.scene === 'space') {
          const G = spaceGeo(L);
          if (Math.hypot(p.x - G.cx, p.y - G.cy) > G.R + 18) return false;
          S.spaceTouched = true; setPlaying(false); S.inertia = 0;
          drag = { type: 'earth', last: angOf(G.cx, G.cy, p), vs: [] };
          v.canvas.style.cursor = 'grabbing';
          return true;
        }
        return false;
      },
      move(p) {
        if (!drag) return;
        if (drag.type === 'pc') setProtractorAt(V, p, drag);
        else if (drag.type === 'arm') {
          const G = polarGeo(L), c = pcXY(G), arm = S.arm[drag.i];
          let q = { x: p.x, y: p.y };
          if (S.pc.snap) {
            let best = null, bd = 18 * L.fs;
            trailEnds(G, S.expo).forEach((e) => { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } });
            if (best) { q = best; if (arm.sn !== best) { arm.sn = best; Sound.tick(); } } else arm.sn = null;
          }
          const ang = angOf(c.x, c.y, q);
          arm.ta = arm.a + sdiff(ang, arm.a);
          arm.len = clamp(Math.hypot(q.x - c.x, q.y - c.y) / G.k, 6, 64);
          S.armTouched = true;
        } else if (drag.type === 'ghost') {
          const G = polarGeo(L), ang = angOf(G.cx, G.cy, p);
          S.ghost.ta = clamp(S.ghost.ta + sdiff(ang, drag.last), -200, 380); drag.last = ang;
        } else if (drag.type === 'earth') {
          const G = spaceGeo(L), ang = angOf(G.cx, G.cy, p), d = sdiff(ang, drag.last);
          drag.last = ang;
          const dt = d / 15;
          S.t += dt; S.hintPlay = false;
          drag.vs.push({ t: performance.now(), d }); if (drag.vs.length > 6) drag.vs.shift();
          rangeTime.set(clamp(S.t, +sTime.min, +sTime.max));
        }
      },
      up() {
        v.canvas.style.cursor = '';
        if (!drag) return;
        if (drag.type === 'pc') S.pc.grab = false;
        else if (drag.type === 'arm') S.arm[drag.i].grab = false;
        else if (drag.type === 'earth') {
          const vs = drag.vs;
          if (vs.length >= 2) {
            const span = (vs[vs.length - 1].t - vs[0].t) / 1000;
            if (span > 0.01 && performance.now() - vs[vs.length - 1].t < 120) S.inertia = clamp(vs.slice(1).reduce((a, q) => a + q.d, 0) / span / 15, -9, 9);
          }
        }
        drag = null;
      },
    });
    if (L.key === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0]; if (!tc) return;
        if (drag || hitsAny(v.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
  }
  function tapStar(V, s) {
    const L = V.L;
    const msg = (text, good) => { S.tapMsg = { text, good, x: s.sx, y: s.sy, t0: nowS() }; };
    if (s.key === 'polaris') {
      if (S.view !== 'north') { msg('북극성은 북쪽 하늘에 있어요', false); return; }
      if (S.acc.north < 1 && !isFree()) { Sound.fail(); msg('먼저 시간을 1시간 이상 흘려 보세요 (▶ 재생)', false); return; }
      if (!S.polarFound) { Sound.tone(880, 0.12, 'triangle', 0.08); V.P.burst(s.sx, s.sy, { count: 14, colors: ['#5eead4', '#fde68a', '#ffffff'], speed: 120, gravity: 40, size: 3 }); }
      S.polarFound = true; S.labelPolaris = true;
      ringFx(V, s.sx, s.sy, 16, '#5eead4'); msg('찾았어요! 거의 움직이지 않는 별 = 북극성', true);
      return;
    }
    Sound.fail();
    ringFx(V, s.sx, s.sy, 12, '#fb923c');
    msg(s.cons ? s.cons.name + '의 별이에요. 이 별은 계속 움직여요' : '이 별도 움직여요. 거의 안 움직이는 별을 찾아요', false);
  }

  /* =========================================================
     퀴즈·노트 그림 (SVG)
     ========================================================= */
  const SVG_OPEN = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FONT.replace(/"/g, '') + '\'>';
  const f1 = (v) => v.toFixed(1);
  const FIG = {};
  // 북쪽 하늘: 북두칠성의 21시·24시·3시 모습 (3시간마다 한 장씩)
  FIG.north = (function () {
    const W = 340, H = 214, cx = 108, cy = 108, k = 2.0;
    let s = SVG_OPEN(W, H, '북극성 둘레에서 본 북두칠성의 21시, 24시, 3시 모습') + '<defs><radialGradient id="fnG"><stop offset="0" stop-color="#fff3d0"/><stop offset="1" stop-color="#fff3d0" stop-opacity="0"/></radialGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    [20, 40].forEach((p) => { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + f1(p * k) + '" fill="none" stroke="rgba(150,175,235,.28)" stroke-dasharray="3 5"/>'; });
    const cols = ['#6d8fc8', '#9fd0f2', '#e4f5ff'], ops = [0.7, 0.85, 1];
    [[21, '21시'], [24, '24시'], [27, '3시']].forEach((q, ti) => {
      const T = q[0];
      const pos = DIPPER.ids.map((st) => { const th = polarTh(st.ra, T) * DEG, r = (90 - st.dec) * k; return [cx + r * Math.cos(th), cy - r * Math.sin(th)]; });
      let d = '';
      DIPPER.lines.forEach((ln) => { const a = pos[DIPPER.stars.indexOf(ln[0])], b = pos[DIPPER.stars.indexOf(ln[1])]; d += 'M' + f1(a[0]) + ',' + f1(a[1]) + ' L' + f1(b[0]) + ',' + f1(b[1]) + ' '; });
      s += '<path d="' + d + '" fill="none" stroke="' + cols[ti] + '" stroke-opacity="' + ops[ti] + '" stroke-width="2" stroke-linecap="round"/>';
      pos.forEach((p) => { s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="3" fill="' + cols[ti] + '" fill-opacity="' + ops[ti] + '"/>'; });
      const lp = pos[4], dx = lp[0] - cx, dy = lp[1] - cy, dl = Math.hypot(dx, dy) || 1;
      s += '<text x="' + f1(lp[0] + dx / dl * 22) + '" y="' + f1(lp[1] + dy / dl * 22 + 5) + '" font-size="13.5" font-weight="800" fill="' + cols[ti] + '" text-anchor="middle">' + q[1] + '</text>';
    });
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="9" fill="url(#fnG)"/><circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#fff3d0"/><text x="' + (cx - 6) + '" y="' + (cy + 22) + '" font-size="12.5" font-weight="800" fill="#fde68a" text-anchor="middle">북극성</text>';
    s += '<text x="226" y="40" font-size="14" font-weight="800" fill="#e6eeff">북두칠성</text><text x="226" y="62" font-size="12.5" fill="#b9c8ee">3시간마다 한 장씩</text>';
    s += '<text x="226" y="92" font-size="12" fill="#9fb3e0">북극성을 가운데 두고</text><text x="226" y="110" font-size="12" fill="#9fb3e0">그린 북쪽 하늘</text>';
    return s + '</svg>';
  })();
  // 달리는 기차의 창밖
  FIG.train = (function () {
    const W = 340, H = 196;
    let s = SVG_OPEN(W, H, '달리는 기차 안에서 보면 창밖의 나무가 뒤로 가는 것처럼 보여요') + '<defs><linearGradient id="ftS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#d9f0ff"/></linearGradient>';
    s += '<marker id="ftA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c2410c"/></marker><marker id="ftB" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#1d4ed8"/></marker></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="url(#ftS)"/><rect y="112" width="' + W + '" height="84" fill="#8bc47a"/><rect y="150" width="' + W + '" height="46" fill="#6fa862"/>';
    s += '<rect x="76" y="48" width="188" height="62" rx="12" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/><rect x="88" y="58" width="44" height="30" rx="6" fill="#bfe3ff" stroke="#64748b"/><rect x="140" y="58" width="44" height="30" rx="6" fill="#bfe3ff" stroke="#64748b"/><rect x="208" y="58" width="44" height="30" rx="6" fill="#bfe3ff" stroke="#64748b"/>';
    s += '<circle cx="118" cy="114" r="8" fill="#475569"/><circle cx="222" cy="114" r="8" fill="#475569"/><circle cx="162" cy="72" r="6" fill="#ffd9a8"/><rect x="156" y="78" width="12" height="10" rx="3" fill="#3867f4"/>';
    s += '<path d="M96,36 h148" stroke="#1d4ed8" stroke-width="3.4" marker-end="url(#ftB)"/><text x="170" y="26" text-anchor="middle" font-size="13" font-weight="800" fill="#1d4ed8">기차는 앞으로 가요</text>';
    [60, 170, 280].forEach((x) => { s += '<path d="M' + x + ',148 l-15,-36 l30,0 z M' + x + ',130 l-12,-32 l24,0 z" fill="#2f7a46"/><rect x="' + (x - 2.5) + '" y="146" width="5" height="12" fill="#6b4a2b"/><path d="M' + (x + 14) + ',170 h-34" stroke="#c2410c" stroke-width="2.8" marker-end="url(#ftA)"/>'; });
    s += '<text x="170" y="189" text-anchor="middle" font-size="13" font-weight="800" fill="#fff6e8">창밖의 나무는 뒤로 가는 것처럼 보여요</text>';
    return s + '</svg>';
  })();
  // 남쪽 하늘 21시 (눈금 1칸 = 15°)
  FIG.south = (function () {
    const W = 340, H = 186, base = 144, a0 = 120, a1 = 240, kx = (W - 36) / (a1 - a0), ky = (base - 16) / 62, o = { alt: 0, az: 0 };
    const px = (az, alt) => [18 + (az - a0) * kx, base - alt * ky];
    let s = SVG_OPEN(W, H, '21시에 남쪽 하늘에서 본 오리온자리와 표시한 별') + '<defs><radialGradient id="fsG"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0a1432"/><rect x="0" y="' + base + '" width="' + W + '" height="' + (H - base) + '" fill="#04070f"/>';
    const lst = lstOf(21), pts = {};
    CONS_BY.orion.stars.forEach((k) => { const st = STAR[k]; altaz(st.ra, st.dec, lst, o); pts[k] = px(o.az, o.alt); });
    let d = '';
    CONS_BY.orion.lines.forEach((ln) => { const a = pts[ln[0]], b = pts[ln[1]]; d += 'M' + f1(a[0]) + ',' + f1(a[1]) + ' L' + f1(b[0]) + ',' + f1(b[1]) + ' '; });
    s += '<path d="' + d + '" stroke="#a9c8ff" stroke-opacity=".6" stroke-width="1.7" fill="none"/>';
    CONS_BY.orion.stars.forEach((k) => { const p = pts[k]; s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + (STAR[k].rad > 2.3 ? 3.6 : 2.8) + '" fill="#e6eeff"/>'; });
    const m = pts.alnilam;
    s += '<circle cx="' + f1(m[0]) + '" cy="' + f1(m[1]) + '" r="18" fill="url(#fsG)"/><circle cx="' + f1(m[0]) + '" cy="' + f1(m[1]) + '" r="9.5" fill="none" stroke="#fde68a" stroke-width="2.4"/>';
    s += '<text x="' + f1(m[0] + 16) + '" y="' + f1(m[1] - 12) + '" font-size="13.5" font-weight="800" fill="#fde68a">21시</text>';
    for (let az = 120; az <= 240; az += 15) {
      const x = px(az, 0)[0], big = az % 45 === 0 || az === 180, h = big ? 11 : 7;
      s += '<line x1="' + f1(x) + '" y1="' + base + '" x2="' + f1(x) + '" y2="' + (base + h) + '" stroke="#b9c8ee" stroke-width="1.4"/>';
    }
    s += '<text x="' + f1(px(180, 0)[0]) + '" y="' + (base + 30) + '" text-anchor="middle" font-size="15" font-weight="800" fill="#fde68a">남</text>';
    s += '<text x="24" y="' + (base + 30) + '" font-size="14" font-weight="800" fill="#cfe0ff">← 동쪽</text><text x="' + (W - 24) + '" y="' + (base + 30) + '" text-anchor="end" font-size="14" font-weight="800" fill="#cfe0ff">서쪽 →</text>';
    s += '<text x="' + (W - 14) + '" y="22" text-anchor="end" font-size="12.5" fill="#9fb3e0">눈금 한 칸 = 15°</text>';
    return s + '</svg>';
  })();

  /* =========================================================
     단계별 학습
     ========================================================= */
  function resetSky(view, t) {
    S.lockView = false; S.lockTime = false; S.free24 = false;
    setScene('sky');
    setView(view, true);
    S.playing = false; setPlaying(false);
    S.t = t; S.tA = t; S.tAV = 0; S.acc = { south: 0, north: 0 }; S.tapMsg = null; S.hintPlay = true;
    syncControls();
  }
  function resetPhoto(expo) {
    setScene('polar', 'photo');
    S.expo = expo; rangeExp.set(expo); S.camFlash = 0.6;
    Object.assign(S.pc, { u: 0, v: 0, tu: 0, tv: 0, uV: 0, vV: 0, snap: false, placed: false, grab: false });
    S.arm[0].len = S.arm[1].len = 15; S.arm[0].a = S.arm[0].ta = 215; S.arm[1].a = S.arm[1].ta = 172; S.armTouched = false;
    const G = polarGeo(LAYOUTS.wide), pg = protGeo(LAYOUTS.wide, G);
    S.pc.u = S.pc.tu = pg.home.u; S.pc.v = S.pc.tv = pg.home.v;
    syncControls();
  }
  function resetSpace() {
    setScene('space');
    S.free24 = true; S.t = 22; S.tA = 22; S.tAV = 0; S.maxRho = earthRot(22); S.space = { stage: 0, hit: [true, false, false, false] };
    S.spaceTouched = false; S.lastK = null; S.inertia = 0; S.tickA = 0; setPlaying(false); syncControls();
  }
  function resetPredict() {
    setScene('polar', 'predict');
    S.ghost.a = S.ghost.ta = 0; S.ghost.aV = 0; S.ghostTouched = false;
    S.predict = { revealed: false, T: 21, k: 0, done: false };
    syncControls();
  }
  game = SciSim.game({
    simId: 'm1-diurnal-motion',
    mount: '#game',
    badge: '밤하늘 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      sky: '🔭 서울의 밤하늘',
      clock: '🕘 시계와 시각 막대',
      photo: '📷 장노출 사진',
      protractor: '📐 각도기',
      space: '🌍 북극 위 우주 창',
      predict: '🎯 위치 예측',
    },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart() { S.tapMsg = null; },
    onComplete() { resetSky('south', 21); S.labelPolaris = true; S.trails = true; syncControls(); },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '밤하늘의 움직임', short: '밤하늘', icon: '🌌', phase: '관찰',
        features: ['sky', 'clock'],
        intro: '<p class="si-q">❓ 탐구 질문: 밤새 별들은 어떻게 움직일까? 별이 정말 움직이는 걸까?</p>' +
          '<p>서울의 1월 밤하늘을 <b>천문대</b>에서 지켜봐요. 시각 막대를 움직이면 시간이 흘러가고, 별이 지나온 길이 <b>꼬리(자취)</b>로 남아요.</p>' +
          '<p>🔦 밤에 직접 별을 관측할 때는 어른과 함께, 안전한 곳에서 해요.</p>',
        setup() { resetSky('south', 18); },
        recap: '별은 동쪽에서 서쪽으로 움직여요. 북쪽 하늘의 별은 북극성을 중심으로 시계 반대 방향으로 돌아요.',
        summary: '<div class="note-fig">' + FIG.north + '</div><ul><li>별은 <b>동쪽에서 떠서 남쪽을 지나 서쪽으로</b> 져요.</li>' +
          '<li>북쪽 하늘의 별은 <b>북극성</b>을 중심으로 <b>시계 반대 방향</b>으로 돌아요.</li>' +
          '<li><b>북극성</b>은 거의 움직이지 않아서 북쪽을 찾는 길잡이가 돼요.</li></ul>',
        missions: [
          {
            title: '🔭 남쪽 하늘 지켜보기',
            goal: '<b>남쪽 하늘</b>을 보며 시각을 <b>3시간</b> 이상 흘려 보내요. 오리온자리는 어느 쪽에서 어느 쪽으로 움직일까요?',
            hint: '아래 <b>[▶ 재생]</b>을 누르거나 시각 막대를 오른쪽으로 밀어요. 18시에서 21시까지가 3시간이에요.',
            setup() { resetSky('south', 18); },
            check: () => S.view === 'south' && S.acc.south >= 3,
            hold: 0.5,
            status: () => '남쪽 하늘을 지켜본 시간 <b>' + Math.min(3, S.acc.south).toFixed(1) + ' / 3시간</b> · ' + chk(S.acc.south >= 3, '3시간 지켜보기') + (S.view !== 'south' ? '<br>💡 [남쪽 하늘]로 바꿔 보세요.' : ''),
            explain: '오리온자리는 <b>남동쪽</b>에서 떠올라 <b>남쪽</b>을 지나 <b>서쪽</b>으로 움직였어요. 별은 <b>동쪽에서 서쪽으로</b> 움직여요. 꼬리는 별이 지나온 길이에요.',
          },
          {
            title: '⭐ 움직이지 않는 별',
            goal: '<b>북쪽 하늘</b>로 바꾸고 시간을 <b>1시간</b> 이상 흘려 보낸 뒤, 거의 움직이지 않는 별을 눌러 보세요.',
            hint: '[북쪽 하늘]을 누르고 [▶ 재생]을 눌러요. 다른 별들은 꼬리를 길게 끌며 도는데, 한 별은 거의 제자리예요.',
            setup() { resetSky('north', 18); S.polarFound = false; S.labelPolaris = false; },
            check: () => S.polarFound && S.acc.north >= 1,
            hold: 0.5,
            status: () => '북쪽 하늘을 지켜본 시간 <b>' + Math.min(1, S.acc.north).toFixed(1) + ' / 1시간</b> · ' + chk(S.acc.north >= 1, '1시간 지켜보기') + ' · ' + chk(S.polarFound, '움직이지 않는 별 찾기') + (S.view !== 'north' ? '<br>💡 [북쪽 하늘]로 바꿔 보세요.' : ''),
            explain: '거의 움직이지 않는 이 별이 <b>북극성</b>이에요. 다른 별들은 북극성을 중심으로 돌아요.',
          },
          {
            type: 'quiz',
            title: '🔁 북쪽 하늘의 별',
            goal: '그림은 북두칠성의 21시, 24시, 3시 모습이에요. 북쪽 하늘의 별은 북극성을 중심으로 어떻게 움직일까요?',
            figure: FIG.north,
            setup() { resetSky('north', 21); S.labelPolaris = true; },
            choices: ['북극성을 중심으로 시계 반대 방향으로 돈다', '북극성을 중심으로 시계 방향으로 돈다', '북극성 쪽으로 모여든다', '움직이지 않는다'],
            answer: 0,
            feedback: [
              '',
              '그림에서 21시 → 24시 → 3시 순서를 따라가 보세요. 시곗바늘이 도는 방향과는 반대예요.',
              '별들은 북극성에 가까워지거나 멀어지지 않고, 같은 거리를 유지하며 돌아요.',
              '북쪽 하늘의 별도 움직여요. 거의 제자리인 별은 북극성뿐이에요.',
            ],
            explain: '북쪽 하늘의 별은 북극성을 중심으로 <b>시계 반대 방향</b>으로 돌아요.',
          },
        ],
      },
      /* ---------- 2단계 · 탐구 ---------- */
      {
        title: '일주 운동 측정', short: '일주 측정', icon: '📷', phase: '탐구',
        features: ['photo', 'protractor'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별이 움직이는 것을 봤어요. 그런데 얼마나 빨리 움직일까요?</div>' +
          '<p>카메라 셔터를 오래 열어 <b>북쪽 하늘</b>을 찍으면 별이 움직인 길이 <b>호</b>(원의 일부)로 남아요. <b>각도기</b>로 호의 각도를 재어 별이 움직이는 빠르기를 알아내요.</p>',
        setup() { resetPhoto(1); },
        recap: '북쪽 하늘의 별은 1시간에 약 15°씩, 하루(24시간)에 한 바퀴 돌아요.',
        summary: '<ul><li>북쪽 하늘의 별이 그린 호는 북극성을 중심으로 한 <b>동심원의 일부</b>예요.</li>' +
          '<li>노출 2시간 → 약 <b>30°</b>, 4시간 → 약 <b>60°</b> : 각도는 시간에 <b>비례</b>해요.</li>' +
          '<li>별은 1시간에 약 <b>15°</b>, 하루(24시간)에 <b>한 바퀴(360°)</b> 돌아요.</li></ul>',
        missions: [
          {
            title: '📐 2시간 동안 몇 도?',
            manual: true,
            goal: '노출 시간을 <b>2시간</b>으로 맞추고, 각도기의 <b>중심을 북극성</b>에 놓은 뒤 두 팔을 <b>같은 별이 그린 호의 양 끝</b>에 맞춰요. 다 맞추면 [✔ 확인하기]를 눌러요.',
            hint: '노출 막대를 2시간으로 → 각도기를 북극성(가운데)에 가져가면 딸깍 붙어요 → ①②의 손잡이를 같은 호의 두 끝으로 끌어요.',
            setup() { resetPhoto(1); },
            check: () => measureCheck(2, 30),
            status: () => measureStatus(2),
            explain: '2시간 동안 별은 북극성을 중심으로 약 <b>30°</b> 움직였어요.',
          },
          {
            title: '📐 4시간이면?',
            manual: true,
            goal: '노출 시간을 <b>4시간</b>으로 바꾸고, 같은 방법으로 호의 각도를 다시 재어 봐요.',
            hint: '노출 막대를 4시간으로 바꾸면 호가 더 길어져요. 각도기의 중심은 그대로 두고 두 팔만 새 호의 끝으로 옮겨요.',
            setup() { S.expo = 4; rangeExp.set(4); setScene('polar', 'photo'); S.camFlash = 0.5; },
            check: () => measureCheck(4, 60),
            status: () => measureStatus(4),
            explain: '노출 시간이 2배가 되니 각도도 2배(약 <b>60°</b>)가 되었어요. 별이 움직인 각은 시간에 <b>비례</b>해요.',
          },
          {
            type: 'quiz',
            title: '⏱️ 1시간에 몇 도?',
            goal: '2시간에 약 30°, 4시간에 약 60°였어요. 별은 <b>1시간</b>에 약 몇 도씩 움직일까요?',
            setup() { setScene('polar', 'photo'); },
            choices: ['약 15°', '약 1°', '약 30°', '약 360°'],
            answer: 0,
            feedback: [
              '',
              '약 1°는 별자리가 하루에 조금씩 밀리는 양(다음 차시에서 만나요)이에요. 2시간에 30°였으니 1시간에는 더 커요.',
              '30°는 2시간 동안 움직인 각이에요. 1시간에는 그 반이에요.',
              '360°는 한 바퀴예요. 한 바퀴는 하루(24시간) 동안 돌아요.',
            ],
            explain: '2시간에 30° → 1시간에 약 <b>15°</b>예요. 24시간이면 15° × 24 = 360°, 즉 하루에 <b>한 바퀴</b> 돌아요.',
          },
        ],
      },
      /* ---------- 3단계 · 모형(설명) ---------- */
      {
        title: '우주에서 보기', short: '우주에서', icon: '🌍', phase: '모형',
        features: ['space'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별이 하루에 한 바퀴 도는 것처럼 보인다는 것을 알았어요.</div>' +
          '<p>정말 별이 움직이는 걸까요, 아니면 우리가 움직이는 걸까요? <b>북극 위 우주</b>에서 지구를 내려다봐요. 태양빛은 오른쪽에서 와요.</p>',
        setup() { resetSpace(); },
        recap: '지구가 서쪽에서 동쪽으로 하루에 한 바퀴 자전해서, 천체가 동쪽에서 서쪽으로 도는 것처럼 보여요.',
        summary: '<div class="note-fig">' + FIG.train + '</div><ul><li><b>일주 운동</b>: 천체가 하루에 한 바퀴씩 동→서로 도는 것처럼 보이는 <b>겉보기 운동</b>이에요.</li>' +
          '<li>까닭: 지구가 <b>자전축</b>을 중심으로 하루에 한 바퀴, <b>서→동</b>으로 <b>자전</b>하기 때문이에요.</li>' +
          '<li>북극 위에서 내려다보면 지구는 <b>반시계 방향</b>으로 돌아요.</li>' +
          '<li>북극성은 자전축을 북쪽으로 늘인 방향 가까이에 있어서 거의 움직이지 않아 보여요.</li></ul>',
        missions: [
          {
            title: '🔄 하루 돌려 보기',
            goal: '지구를 끌어서 <b>반시계 방향</b>으로 돌려요. 서울의 사람이 <b>해 뜰 무렵 → 정오 → 해 질 무렵</b>을 차례로 지나게 해 보세요. 오른쪽 위 하늘 창도 함께 봐요.',
            hint: '지구 위에서 손가락으로 반시계 방향으로 빙 돌려요. 시계 방향으로 돌리면 진행되지 않아요. [▶ 자전 재생]을 눌러도 돼요.',
            setup() { resetSpace(); },
            check: () => S.space.hit.every(Boolean),
            hold: 0.6,
            status: () => spaceChips(),
            explain: '지구가 <b>서쪽에서 동쪽</b>(북극 위에서 보면 반시계 방향)으로 돌면서 서울이 밤 → 해 뜰 무렵 → 정오 → 해 질 무렵을 지나요. 하늘 창에서는 해가 <b>동쪽에서 떠서 남쪽을 지나 서쪽으로</b> 져요.',
          },
          {
            type: 'quiz',
            title: '🚂 동에서 서로 가는 까닭',
            goal: '하늘의 별·해·달이 <b>동쪽에서 서쪽으로</b> 움직이는 것처럼 보이는 까닭은 무엇일까요?',
            figure: FIG.train,
            setup() { if (S.scene !== 'space') resetSpace(); },
            choices: ['지구가 서쪽에서 동쪽으로 자전하기 때문', '별과 해, 달이 실제로 지구 둘레를 돌기 때문', '지구가 태양 둘레를 공전하기 때문', '별이 바람에 밀려 움직이기 때문'],
            answer: 0,
            feedback: [
              '',
              '별은 지구에서 아주 멀리 있어요. 모두 지구를 도는 것보다, 지구 하나가 도는 것으로 훨씬 간단하게 설명돼요. 기차가 가면 나무가 뒤로 가 보이는 것과 같아요.',
              '공전은 1년에 한 바퀴 도는 운동이에요. 하루 동안의 움직임은 자전 때문이에요.',
              '우주에는 바람이 없고, 별은 지구에서 아주 멀리 있어요. 별이 밀려서 움직이는 게 아니에요.',
            ],
            explain: '달리는 기차에서 창밖의 나무가 뒤로 가는 것처럼 보이듯이, 지구가 <b>서→동</b>으로 <b>자전</b>하기 때문에 천체가 <b>동→서</b>로 움직이는 것처럼 보여요. 이런 움직임을 <b>겉보기 운동</b>이라고 해요. 해와 달도 같은 까닭으로 동쪽에서 떠서 서쪽으로 져요.',
          },
          {
            type: 'quiz',
            title: '⭐ 북극성의 비밀',
            goal: '북극성이 거의 움직이지 않는 것처럼 보이는 까닭은 무엇일까요?',
            setup() { if (S.scene !== 'space') resetSpace(); },
            choices: ['지구 자전축을 북쪽으로 늘인 방향 가까이에 있기 때문', '하늘에서 가장 밝은 별이기 때문', '지구에서 가장 가까운 별이기 때문', '북극성도 지구와 함께 돌고 있기 때문'],
            answer: 0,
            feedback: [
              '',
              '북극성은 가장 밝은 별이 아니에요. 가장 밝은 별은 시리우스예요. 밝기는 움직임과 관계없어요.',
              '북극성이 제자리처럼 보이는 것은 거리 때문이 아니라 위치(방향) 때문이에요.',
              '별은 지구와 함께 돌지 않아요. 지구가 도는 거예요. 자전축 방향에 있는 별만 제자리처럼 보여요.',
            ],
            explain: '지구는 <b>자전축</b>(북극과 남극을 잇는 선)을 중심으로 돌아요. 이 축을 북쪽으로 길게 늘인 방향 가까이에 <b>북극성</b>이 있어서 거의 움직이지 않는 것처럼 보여요. 돌아가는 팽이의 가운데 점을 떠올려 봐요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '움직임 예측', short: '예측', icon: '🎯', phase: '적용',
        features: ['predict'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별이 1시간에 약 15°씩 움직인다는 것과, 그 까닭이 지구의 자전이라는 것을 알았어요.</div>' +
          '<p>이 규칙을 이용해서 별이 <b>앞으로 어디에 있을지 예측</b>해 봐요.</p>',
        setup() { resetPredict(); },
        recap: '별의 움직임은 1시간에 약 15°예요. 북쪽 하늘은 북극성 둘레를 반시계 방향으로, 남쪽 하늘은 동쪽에서 서쪽으로 움직여요.',
        summary: '<ul><li>예측 규칙: <b>움직이는 각 = 15° × 시간</b></li>' +
          '<li>북쪽 하늘: 북극성을 중심으로 <b>반시계 방향</b>으로 돌아요. (3시간 → 45°)</li>' +
          '<li>남쪽 하늘: <b>동쪽에서 서쪽으로</b> 움직여요. (2시간 → 서쪽으로 약 30°)</li>' +
          '<li>해와 달도 지구의 자전 때문에 같은 일주 운동을 해요.</li></ul>',
        missions: [
          {
            title: '🎯 3시간 뒤의 북두칠성',
            manual: true,
            goal: '21시의 북두칠성이 <b>24시</b>(3시간 뒤)에는 어디에 있을까요? 화면을 돌려 노란 북두칠성을 <b>예측한 위치</b>에 놓고 [✔ 확인하기]를 눌러요.',
            hint: '1시간에 15°씩, 3시간이면 몇 도일까요? 북극성을 중심으로 <b>반시계 방향</b>으로 돌려요.',
            setup() { resetPredict(); },
            check: () => {
              const a = S.ghost.ta;
              if (!S.ghostTouched || Math.abs(a) < 4) return '먼저 화면을 돌려 노란 북두칠성을 옮겨 보세요.';
              if (a < 0) return '별은 북극성을 중심으로 시계 <b>반대</b> 방향으로 돌아요. 반대로 돌렸어요.';
              if (a >= 38 && a <= 52) return true;
              return a < 38 ? '조금 더 돌려야 해요. 1시간에 15°씩, 3시간이면 몇 도일까요?' : '너무 많이 돌렸어요. 1시간에 15°씩, 3시간이면 몇 도일까요?';
            },
            status: () => '내가 돌린 각 <b>' + Math.abs(Math.round(S.ghost.ta)) + '°</b>' + (S.ghost.ta < -3 ? ' (시계 방향)' : S.ghost.ta > 3 ? ' (시계 반대 방향)' : ''),
            explain: '3시간 × 15° = <b>45°</b>, 북극성을 중심으로 <b>반시계 방향</b>으로 움직여요. 실제 24시의 위치와 비교해 보세요!',
          },
          {
            type: 'quiz',
            title: '🌙 남쪽 별 2시간 뒤',
            goal: '그림은 21시에 남쪽 하늘에서 본 별이에요. 2시간 뒤인 <b>23시</b>에는 이 별이 어디에 있을까요?',
            figure: FIG.south,
            setup() { resetSky('south', 21); S.hintPlay = false; },
            choices: ['서쪽으로 약 30° 이동', '동쪽으로 약 30° 이동', '거의 제자리', '서쪽으로 약 2° 이동'],
            answer: 0,
            feedback: [
              '',
              '별은 동쪽에서 서쪽으로 움직여요. 방향이 반대예요.',
              '별은 1시간에 약 15°씩 움직이므로 2시간 동안 거의 제자리일 수는 없어요.',
              '2°가 아니라 2시간 × 15° = 30°예요. (1시간에 약 15°)',
            ],
            explain: '2시간 × 15°/시간 = <b>30°</b>. 남쪽 하늘의 별은 동쪽에서 서쪽으로 움직이므로 <b>서쪽으로 약 30°</b> 이동해요. (눈금 두 칸)',
          },
        ],
      },
    ],
  });

  function measureCheck(expo, target) {
    if (Math.abs(S.expo - expo) > 0.01) return '노출 시간을 ' + expo + '시간으로 맞춰 보세요.';
    if (!S.pc.snap) return '각도기의 중심을 북극성(가운데)에 맞춰 보세요.';
    return Math.abs(protAngle() - target) <= 3 ? true : '팔을 호의 끝에 더 정확히 맞춰 보세요. (같은 별이 그린 호의 양 끝이에요)';
  }
  function measureStatus(expo) {
    return chk(Math.abs(S.expo - expo) < 0.01, '노출 ' + expo + '시간') + ' · ' + chk(S.pc.snap, '중심을 북극성에') + ' · 잰 각 <b>' + ((S.pc.snap || S.armTouched) ? Math.round(protAngle()) + '°' : '—') + '</b>';
  }
  function spaceChips() {
    const h = S.space.hit;
    return chk(h[0], '밤') + ' → ' + chk(h[1], '해 뜰 무렵') + ' → ' + chk(h[2], '정오') + ' → ' + chk(h[3], '해 질 무렵') + (S.spaceTouched ? '' : '<br>💡 지구를 손가락으로 끌어 돌려 보세요.');
  }

  /* =========================================================
     움직임
     ========================================================= */
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#070d1f' });
    L.starsStrip = makeStars(L.strip, 26, k === 'wide' ? 3 : 5);
    L.starsPside = makeStars(L.pside, 24, k === 'wide' ? 13 : 15);
    L.starsCbox = makeStars(L.cbox, 22, k === 'wide' ? 17 : 19);
    L.starsSpace = makeStars(L.space, 90, k === 'wide' ? 23 : 29);
    const V = { v, L, fx: [], P: new SciSim.Particles() };
    attachPointer(V);
    return V;
  });
  const activeView = () => views.find((V) => V.v.canvas.offsetWidth > 0) || views[0];

  S.lastK = null; S.inertia = 0; S.tickA = 0; S.spaceTouched = false;
  function update(dt, t) {
    // 시간 재생
    if (S.playing) {
      const top = S.scene === 'sky' ? T_MAX : 48;
      const nt = Math.min(top, S.t + dt * 0.5);
      setTime(nt, false);
      if (nt >= top - 1e-6) setPlaying(false);
    }
    if (S.inertia && S.scene === 'space') {
      S.t += S.inertia * dt; S.inertia *= Math.exp(-3.2 * dt);
      if (Math.abs(S.inertia) < 0.04) S.inertia = 0;
      rangeTime.set(clamp(S.t, +sTime.min, +sTime.max));
    }
    crit(S, 'tA', S.t, dt, 15);
    // 사진·각도기·유령
    S.expoA = approach(S.expoA, S.expo, dt, RM ? 60 : 2.3);
    S.camFlash = approach(S.camFlash, 0, dt, 6);
    crit(S.pc, 'u', S.pc.tu, dt, 17); crit(S.pc, 'v', S.pc.tv, dt, 17);
    S.arm.forEach((a) => crit(a, 'a', a.ta, dt, 19));
    S.armAng = Math.abs(sdiff(S.arm[1].a, S.arm[0].a));
    crit(S.ghost, 'a', S.ghost.ta, dt, 16);
    // 예측 확인: 성공하면 실제 24시 위치로 0.8초 동안 보여 줘요
    if (S.scene === 'polar' && S.pmode === 'predict' && !S.predict.revealed && game && game.phase === 'success') {
      S.predict.revealed = true;
      SciSim.tween(S.predict, { T: 24, k: 1 }, { duration: 0.8, ease: 'inOutCubic', delay: 0.15 });
      Sound.tone(880, 0.12, 'triangle', 0.08);
      const V = activeView(), G = polarGeo(V.L);
      ringFx(V, G.cx, G.cy, 60, '#5eead4');
    }
    // 우주 창: 눈금 소리, 별 표지 연결, 통과 지점
    if (S.scene === 'space') {
      const rho = earthRot(S.tA), kk = Math.floor(rho / 15);
      if (S.lastK != null && kk !== S.lastK && performance.now() - (S.lastTickAt || 0) > 60) { Sound.tick(); S.tickA = 1; S.lastTickAt = performance.now(); }
      S.lastK = kk;
      if (rho > S.maxRho) S.maxRho = rho;
      const h = S.space.hit;
      h[1] = S.maxRho >= 264; h[2] = S.maxRho >= 354; h[3] = S.maxRho >= 444;
      S.space.stage = h.filter(Boolean).length - 1;
      MARKS.forEach((m) => { S.link[m.key] = approach(S.link[m.key] || 0, Math.abs(sdiff(markAng(m), obsAng(S.tA))) < 80 ? 1 : 0, dt, 8); });
    } else MARKS.forEach((m) => { S.link[m.key] = 0; });
    S.tickA = approach(S.tickA, 0, dt, 4.5);
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) V.P.update(dt); });
  }
  let frameMs = 0;
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    frameMs += (performance.now() - t0 - frameMs) * 0.05;
  });
  syncControls();

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, FIG, ST, STAR, MARKS, frameMs: () => frameMs, game: () => game, view: activeView,
    client(L, x, y) { const V = views.find((q) => q.L === L) || activeView(); const r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    starClient(key) { const V = activeView(), s = STAR[key]; return this.client(V.L, s.sx, s.sy); },
    earthClient(angDeg, f) { const V = activeView(), G = spaceGeo(V.L), a = angDeg * DEG, r = G.R * (f == null ? 0.7 : f); return this.client(V.L, G.cx + r * Math.cos(a), G.cy - r * Math.sin(a)); },
    poleClient() { const V = activeView(), G = polarGeo(V.L); return this.client(V.L, G.cx, G.cy); },
    pcClient() { const V = activeView(), G = polarGeo(V.L), c = pcXY(G); return this.client(V.L, c.x, c.y); },
    armClient(i) { const V = activeView(), G = polarGeo(V.L), c = armXY(G, i); return this.client(V.L, c.x, c.y); },
    endClient(key, which, expo) { const V = activeView(), G = polarGeo(V.L), e = trailEnds(G, expo || S.expo).filter((q) => q.star === key && q.k === which)[0]; return this.client(V.L, e.x, e.y); },
    chartClient(angDeg, p) { const V = activeView(), G = polarGeo(V.L), a = angDeg * DEG; return this.client(V.L, G.cx + p * G.k * Math.cos(a), G.cy - p * G.k * Math.sin(a)); },
    setT(v, instant) { setTime(v, instant !== false); }, setView, setScene, resetSky, resetPhoto, resetSpace, resetPredict, polarTh, altaz, lstOf, sunAltAt,
  };
})();
