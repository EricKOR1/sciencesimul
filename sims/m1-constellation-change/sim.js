/* =========================================================
   중1 Ⅶ. 태양계 - 지구의 공전과 별자리 변화  [9과07-03 뒷부분]
   탐구 흐름(4단계):
   ① 관찰: 계절(월)마다 한밤중 남쪽 하늘에 보이는 별자리가 달라지고, 같은 시각의 별자리가 한 달에 약 30°씩 서쪽으로 움직임
   ② 모형: 북극 위 우주에서 태양 둘레를 도는 지구가 한밤중에 바라보는 방향이 달라져 별자리가 바뀜
   ③ 설명: 태양이 별자리 사이를 서→동으로 이동하는 연주 운동, 황도와 황도 12궁
   ④ 적용: 관측 계획 카드 만들기 (한밤중 남쪽 별자리 = 태양이 있는 별자리의 정반대)
   하늘 계산: 서울(북위 37.5°)의 한밤중(24시) 하늘. 태양의 황경 λ = 280° + (태양 쪽 각)로 적경 α를 구하고,
   한밤중 항성시 LST = α + 12 h, 시간각 H = LST − 적경으로 고도·방위를 계산해요. (세차·점성술·연주 시차는 다루지 않음)
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
     하늘 계산 (서울 북위 37.5°) 과 별자리 자료
     링 각도 β: 태양 쪽에서 보이는 방향을 시계 반대 방향으로 잰 각 (궁수자리 한가운데 = 0°)
     지구 위치각 θE(월 초) = 180° + 30°(월 − 1),  태양이 보이는 방향 β = θE + 180°
     ========================================================= */
  const LAT = 37.5, SIN_LAT = Math.sin(LAT * DEG), COS_LAT = Math.cos(LAT * DEG), EPS = 23.44 * DEG;
  function altaz(ra, dec, lst, out) {
    const H = (lst - ra) * 15 * DEG, d = dec * DEG, sd = Math.sin(d), cd = Math.cos(d), cH = Math.cos(H);
    const sa = SIN_LAT * sd + COS_LAT * cd * cH;
    out.alt = Math.asin(clamp(sa, -1, 1)) / DEG;
    const az = Math.atan2(-cd * Math.sin(H), sd * COS_LAT - cd * cH * SIN_LAT) / DEG;
    out.az = az < 0 ? az + 360 : az;
    return out;
  }
  // 태양 쪽 각 β → 태양의 적경(h)·적위(°)
  function sunEq(beta, out) {
    const l = (280 + beta) * DEG;
    out.ra = (((Math.atan2(Math.cos(EPS) * Math.sin(l), Math.cos(l)) / DEG / 15) % 24) + 24) % 24;
    out.dec = Math.asin(Math.sin(EPS) * Math.sin(l)) / DEG;
    return out;
  }
  const monthF = (thE) => ((((thE - 180) / 30) % 12) + 12) % 12 + 1;              // 1 ≤ m < 13 (실수)
  const thOfMonth = (m) => 180 + 30 * (m - 1);
  const slotOf = (ang) => ((Math.round(ang / 30) % 12) + 12) % 12;                // 링 각도가 속한 별자리 칸

  /* ---------- 별자리 자료: 별 [적경 h, 적위 °, 등급], 선 [별 번호 쌍] ---------- */
  const ZOD_DEF = [
    { key: 'sgr', name: '궁수자리', col: '#ffb86b', stars: [[18.097, -30.424, 2.99], [18.350, -29.828, 2.70], [18.403, -34.385, 1.85], [18.466, -25.422, 2.81], [18.762, -26.991, 3.17], [18.921, -26.297, 2.05], [19.044, -29.880, 2.60], [19.116, -27.670, 3.32]],
      lines: [[0, 1], [1, 2], [2, 6], [6, 4], [4, 5], [5, 7], [7, 6], [4, 3], [3, 1]] },
    { key: 'cap', name: '염소자리', col: '#c4a6ff', stars: [[20.294, -12.545, 3.57], [20.350, -14.781, 3.08], [20.768, -25.271, 4.14], [20.866, -26.919, 4.11], [21.100, -16.835, 4.28], [21.444, -22.411, 3.74], [21.668, -16.662, 3.68], [21.784, -16.127, 2.87]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 5], [5, 6], [6, 7], [7, 4], [4, 0]] },
    { key: 'aqr', name: '물병자리', col: '#6ec6ff', stars: [[20.795, -9.496, 3.77], [21.526, -5.571, 2.91], [22.096, -0.320, 2.96], [22.361, -1.387, 3.84], [22.421, 1.378, 4.66], [22.481, -0.020, 3.65], [22.588, -0.118, 4.02], [22.877, -7.580, 3.74], [22.911, -15.821, 3.27]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 6], [6, 5], [5, 3], [6, 7], [7, 8]] },
    { key: 'psc', name: '물고기자리', col: '#7ae0c8', stars: [[23.286, 3.282, 3.69], [23.449, 1.256, 4.94], [23.701, 1.782, 4.50], [23.665, 5.626, 4.13], [23.464, 6.379, 4.28], [23.989, 6.863, 4.01], [24.811, 7.585, 4.44], [25.049, 7.890, 4.28], [25.395, 6.144, 4.84], [25.688, 5.488, 4.44], [26.034, 2.764, 3.82], [25.756, 9.158, 4.26], [25.525, 15.346, 3.62]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [3, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [9, 11], [11, 12]] },
    { key: 'ari', name: '양자리', col: '#ff9a8a', stars: [[2.833, 27.261, 3.63], [2.120, 23.462, 2.00], [1.911, 20.808, 2.64], [1.891, 19.294, 3.86]],
      lines: [[0, 1], [1, 2], [2, 3]] },
    { key: 'tau', name: '황소자리', col: '#ffd76b', stars: [[4.599, 16.509, 0.85], [5.438, 28.608, 1.65], [5.627, 21.143, 3.0], [4.477, 19.180, 3.53], [4.330, 15.628, 3.65], [4.382, 17.543, 3.76], [4.479, 15.871, 3.40], [4.011, 12.490, 3.47], [3.414, 9.029, 3.6], [3.791, 24.105, 2.87], [3.748, 24.113, 3.7], [3.763, 24.368, 3.9], [3.772, 23.948, 4.2], [3.819, 24.053, 3.6], [3.753, 24.467, 4.3]],
      lines: [[2, 0], [0, 6], [6, 4], [4, 5], [5, 3], [3, 1], [4, 7], [7, 8]], cols: { 0: '#ffb27a' } },
    { key: 'gem', name: '쌍둥이자리', col: '#a9d37a', stars: [[7.577, 31.888, 1.58], [7.755, 28.026, 1.14], [6.629, 16.399, 1.93], [6.732, 25.131, 2.98], [6.383, 22.514, 2.88], [6.248, 22.507, 3.28], [7.335, 21.982, 3.53], [7.069, 20.570, 3.79], [6.755, 12.896, 3.35], [7.302, 16.540, 3.58]],
      lines: [[0, 1], [0, 3], [3, 4], [4, 5], [1, 6], [6, 7], [7, 2], [2, 8], [6, 9]], cols: { 1: '#ffd9a8' } },
    { key: 'cnc', name: '게자리', col: '#8ad0d0', stars: [[8.975, 11.858, 4.25], [8.275, 9.186, 3.52], [8.745, 18.154, 3.94], [8.721, 21.469, 4.66], [8.778, 28.760, 4.02]],
      lines: [[1, 2], [2, 0], [2, 3], [3, 4]] },
    { key: 'leo', name: '사자자리', col: '#ffb347', stars: [[10.140, 11.967, 1.35], [11.818, 14.572, 2.14], [10.333, 19.842, 2.08], [11.235, 20.524, 2.56], [11.237, 15.430, 3.34], [9.764, 23.774, 2.98], [9.879, 26.007, 3.88], [10.122, 16.763, 3.52], [10.278, 23.417, 3.44]],
      lines: [[0, 7], [7, 2], [2, 8], [8, 6], [6, 5], [2, 3], [3, 1], [1, 4], [4, 0], [3, 4]], cols: { 0: '#d6e4ff' } },
    { key: 'vir', name: '처녀자리', col: '#d6a2ff', stars: [[13.420, -11.161, 0.97], [12.694, -1.449, 2.74], [13.036, 10.959, 2.83], [13.578, -0.596, 3.37], [11.845, 1.765, 3.61], [12.332, -0.667, 3.89], [12.927, 3.398, 3.38]],
      lines: [[4, 5], [5, 1], [1, 6], [6, 2], [1, 3], [3, 0]], cols: { 0: '#cfe0ff' } },
    { key: 'lib', name: '천칭자리', col: '#8fd0a0', stars: [[14.848, -16.042, 2.75], [15.283, -9.383, 2.61], [15.592, -14.790, 3.91], [15.068, -25.282, 3.29], [15.618, -28.135, 3.58]],
      lines: [[0, 1], [1, 2], [2, 0], [0, 3], [2, 4], [3, 4]] },
    { key: 'sco', name: '전갈자리', col: '#ff7a6a', stars: [[16.091, -19.805, 2.62], [16.006, -22.622, 2.32], [15.981, -26.114, 2.89], [16.353, -25.593, 2.89], [16.490, -26.432, 1.06], [16.598, -28.216, 2.82], [16.836, -34.293, 2.29], [16.864, -38.047, 3.08], [16.909, -42.361, 3.62], [17.203, -43.243, 3.33], [17.622, -42.998, 1.87], [17.793, -40.127, 3.03], [17.708, -39.030, 2.41], [17.560, -37.104, 1.62], [17.513, -37.296, 2.69]],
      lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14]], cols: { 4: '#ff8a6a' } },
  ];
  const ORION_DEF = { key: 'ori', name: '오리온자리', col: '#7dd3fc', ang: 165, orion: true,
    stars: [[5.919, 7.407, 0.5], [5.419, 6.350, 1.6], [5.585, 9.934, 3.5], [5.533, -0.299, 2.2], [5.603, -1.202, 1.7], [5.679, -1.943, 1.9], [5.796, -9.670, 2.1], [5.242, -8.202, 0.1]],
    lines: [[2, 0], [2, 1], [0, 5], [1, 3], [3, 4], [4, 5], [5, 6], [3, 7]], cols: { 0: '#ffb27a', 7: '#bcd6ff' } };
  const ZST = [];                               // 하늘에 그릴 모든 별
  const ZODS = ZOD_DEF.concat([ORION_DEF]);
  ZODS.forEach((c, ci) => {
    c.ang = c.ang != null ? c.ang : ci * 30;                      // 링에서의 각도
    c.i = ci;
    c.st = c.stars.map((q, k) => {
      const s = { ra: ((q[0] % 24) + 24) % 24, dec: q[1], mag: q[2], col: (c.cols && c.cols[k]) || '#eef3ff', c, k, mx: 0, my: 0, mon: false, alt: 0, az: 0 };
      s.rad = clamp(0.95 + (4.3 - s.mag) * 0.55, 0.9, 3.5); s.bri = clamp(1.15 - (s.mag - 1) * 0.12, 0.45, 1); s.ph = (s.ra * 7.3 + s.dec) % TAU;
      ZST.push(s); return s;
    });
    // 중심(원형 평균)과 그림용 위치 (북쪽이 위, 동쪽이 왼쪽)
    let sx = 0, sy = 0, sd = 0;
    c.st.forEach((s) => { sx += Math.cos(s.ra * 15 * DEG); sy += Math.sin(s.ra * 15 * DEG); sd += s.dec; });
    c.ra = (((Math.atan2(sy, sx) / DEG / 15) % 24) + 24) % 24; c.dec = sd / c.st.length;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    c.st.forEach((s) => {
      const dra = ((s.ra - c.ra + 36) % 24) - 12;
      s.lx = -dra * 15 * Math.cos(c.dec * DEG); s.ly = -(s.dec - c.dec);
      minx = Math.min(minx, s.lx); maxx = Math.max(maxx, s.lx); miny = Math.min(miny, s.ly); maxy = Math.max(maxy, s.ly);
    });
    c.ext = Math.max(maxx - minx, maxy - miny, 6); c.cx0 = (minx + maxx) / 2; c.cy0 = (miny + maxy) / 2;
    c.nameStar = c.st.reduce((a, s) => (s.mag < a.mag ? s : a), c.st[0]);
  });
  const BYKEY = {}; ZODS.forEach((c) => { BYKEY[c.key] = c; });
  // 길잡이 별과 희미한 별 (하늘에 고정, 함께 움직여요)
  const BG = [];
  [['시리우스', 6.752, -16.716, -1.46, '#d8e8ff'], ['프로키온', 7.655, 5.225, 0.4, '#fff6e0'], ['카펠라', 5.278, 45.998, 0.1, '#fff0c8'], ['아르크투루스', 14.261, 19.182, -0.05, '#ffc890'],
    ['베가', 18.616, 38.784, 0.0, '#e6eeff'], ['알타이르', 19.846, 8.868, 0.8, '#eef3ff'], ['데네브', 20.690, 45.280, 1.25, '#eef3ff'], ['포말하우트', 22.961, -29.62, 1.2, '#eef3ff'],
    ['북극성', 2.530, 89.264, 2.0, '#fff1c9']].forEach((a) => BG.push({ name: a[0], ra: a[1], dec: a[2], mag: a[3], col: a[4], bg: true }));
  (function () {
    const r = rng(20240301);
    for (let i = 0; i < 320; i++) { const c = r(); BG.push({ ra: r() * 24, dec: Math.asin(2 * r() - 1) / DEG, mag: 3.7 + Math.pow(r(), 0.7) * 2.3, col: c < 0.15 ? '#ffe7c2' : c < 0.35 ? '#cfe0ff' : '#eef3ff', faint: true }); }
  })();
  BG.forEach((s) => { s.rad = clamp(0.95 + (4.3 - s.mag) * 0.55, 0.7, 3.5); s.bri = clamp(1.15 - (s.mag - 1) * 0.12, 0.34, 1); s.ph = (s.ra * 7.3 + s.dec) % TAU; s.mx = 0; s.my = 0; s.mon = false; });
  // 은하수 (희미한 빛 덩어리)
  const MW = [];
  (function () {
    const r = rng(777), dG = 27.128 * DEG, aG = 192.859 * DEG, lN = 122.932 * DEG;
    for (let i = 0; i < 120; i++) {
      const l = r() * TAU, b = ((r() + r() + r() - 1.5) * 9) * DEG, dl = lN - l;
      const sd = Math.sin(dG) * Math.sin(b) + Math.cos(dG) * Math.cos(b) * Math.cos(dl);
      let ra = aG + Math.atan2(Math.cos(b) * Math.sin(dl), Math.cos(dG) * Math.sin(b) - Math.sin(dG) * Math.cos(b) * Math.cos(dl));
      ra = ((ra / DEG / 15) % 24 + 24) % 24;
      MW.push({ ra, dec: Math.asin(clamp(sd, -1, 1)) / DEG, size: 6.5 + r() * 7.5, a: (0.04 + r() * 0.04) * (0.8 + 0.5 * Math.pow(Math.max(0, Math.cos(l - 0.1)), 2)) });
    }
  })();
  // 황도(태양이 지나는 길) 점들
  const ECL = [];
  for (let l = 0; l <= 360; l += 3) { const L2 = l * DEG; ECL.push({ ra: (((Math.atan2(Math.cos(EPS) * Math.sin(L2), Math.cos(L2)) / DEG / 15) % 24) + 24) % 24, dec: Math.asin(Math.sin(EPS) * Math.sin(L2)) / DEG }); }
  // 월 → 계절
  const seasonOf = (mi) => (mi >= 3 && mi <= 5 ? 0 : mi >= 6 && mi <= 8 ? 1 : mi >= 9 && mi <= 11 ? 2 : 3);
  const SEASON = [{ name: '봄', col: '#86efac', ico: '🌸' }, { name: '여름', col: '#fdba74', ico: '☀️' }, { name: '가을', col: '#fcd34d', ico: '🍂' }, { name: '겨울', col: '#93c5fd', ico: '❄️' }];

  /* =========================================================
     상태 · 화면 배치
     ========================================================= */
  const S = {
    scene: 'sky', sceneA: 1,
    th: 180, thA: 180, thAV: 0, playing: false, drag: false,
    cmp: false, glare: false, glareA: 0, noonA: 0, noonT: 0,
    bounce: 0, bounceV: 0, monthShown: 1, tapMsg: null, hint: true,
    seasons: [false, false, false, false], dwellS: -1, dwellT: 0, cmpMoves: 0, lastInt: 1, cmpSeen: false,
    reached: { gem: false, sgr: false }, spaceTouched: false,
    walk: { visited: [], fwd: 0, last: null }, path0: 0,
    plan: { sel: -1, month: 0, made: false, card: 0, wrong: null },
    link: {}, flash: null, lockMonth: false,
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
      space: { x: 8, y: 8, w: 520, h: 584 }, mini: { x: 536, y: 8, w: 256, h: 262 }, cbox: { x: 536, y: 278, w: 256, h: 314 },
    },
    tall: {
      key: 'tall', vw: 520, vh: 846, fs: 1.2, col: false,
      sky: { x: 8, y: 8, w: 504, h: 500 }, strip: { x: 8, y: 516, w: 504, h: 322 },
      space: { x: 8, y: 8, w: 504, h: 520 }, mini: { x: 8, y: 536, w: 296, h: 302 }, cbox: { x: 312, y: 536, w: 200, h: 302 },
    },
  };
  function skyGeo(R, L, mini) {
    const ground = (mini ? 30 : 54) * L.fs, baseY = R.y + R.h - ground;
    return { x: R.x, y: R.y, w: R.w, h: R.h, baseY, ground, kx: R.w / 192, ky: (baseY - R.y - (mini ? 6 : 12)) / 80, cx: R.x + R.w / 2, mini: !!mini };
  }
  function skyProj(G, az, alt, o) {
    const d = ((az - 180 + 540) % 360) - 180;
    o.x = G.cx + d * G.kx; o.y = G.baseY - alt * G.ky; o.ok = Math.abs(d) <= 99 && alt > -0.5; o.d = d;
    return o;
  }
  function spaceGeo(L) {
    const M = L.space;
    if (L.col) return { M, cx: M.x + 260, cy: M.y + 292, orb: 98, ring: 186, R: 15, sun: 21 };
    return { M, cx: M.x + 252, cy: M.y + 262, orb: 84, ring: 172, R: 13, sun: 18 };
  }
  const ringXY = (G, ang, r, o) => { const a = ang * DEG; o.x = G.cx + (r == null ? G.ring : r) * Math.cos(a); o.y = G.cy - (r == null ? G.ring : r) * Math.sin(a); return o; };

  /* ---------- 하늘색 ---------- */
  const hexRgb = (h) => { const c = SciSim.color.hexToRgb(h); return [c.r, c.g, c.b]; };
  const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgbS = (c, a) => (a == null ? 'rgb(' : 'rgba(') + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + (a == null ? ')' : ',' + a + ')');
  const PAL_NIGHT = ['#04091a', '#0a1432', '#18284f'].map(hexRgb);
  const PAL_TWI = ['#1d2160', '#5b3c7e', '#f09a68'].map(hexRgb);
  const PAL_DAY = ['#3d8ae0', '#6fb6f2', '#d4ecff'].map(hexRgb);
  const PAL_TMP = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  function skyPalette(sunAlt, planet) {
    let A, B, k;
    if (sunAlt <= -14) { A = PAL_NIGHT; B = PAL_NIGHT; k = 0; }
    else if (sunAlt < -1) { A = PAL_NIGHT; B = PAL_TWI; k = (sunAlt + 14) / 13; k = k * k * (3 - 2 * k); }
    else if (sunAlt < 9) { A = PAL_TWI; B = PAL_DAY; k = (sunAlt + 1) / 10; k = k * k * (3 - 2 * k); }
    else { A = PAL_DAY; B = PAL_DAY; k = 0; }
    for (let i = 0; i < 3; i++) PAL_TMP[i] = mixRgb(mixRgb(A[i], B[i], k), PAL_NIGHT[i], planet || 0);
    return PAL_TMP;
  }
  const starVisOf = (sunAlt, planet) => Math.max(clamp((-sunAlt - 3.5) / 8.5, 0, 1), planet || 0);

  /* ---------- 지평선 실루엣 ---------- */
  function ridgeSprite(L, G) {
    const key = 'ridge-' + L.key + (G.mini ? 'm' : ''), W = G.w, Hh = G.ground + 64 * L.fs;
    return sprite(key, W, Hh, (g, w, h) => {
      const r = rng(61), base = h - G.ground, S1 = L.fs * (G.mini ? 0.5 : 1);
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
      if (!G.mini) {
        const dx = w * 0.82, idx = Math.round(dx / 4), by = near[Math.min(near.length - 1, idx)][1] + 3, dr = 17 * L.fs;
        g.fillStyle = '#05091a'; g.fillRect(dx - dr * 1.1, by - dr * 0.7, dr * 2.2, dr * 0.8);
        g.beginPath(); g.arc(dx, by - dr * 0.7, dr * 1.1, Math.PI, 0); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(120,150,220,.4)'; g.lineWidth = 1.2; g.beginPath(); g.arc(dx, by - dr * 0.7, dr * 1.1, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        g.fillStyle = 'rgba(255,214,120,.9)'; g.fillRect(dx - 1.4, by - dr * 1.78, 2.8, dr * 1.0);
      }
      for (let i = 0; i < (G.mini ? 6 : 16); i++) {
        const x = r() * w, idx = Math.min(near.length - 1, Math.round(x / 4)), y = near[idx][1] + 2, th = (8 + r() * 12) * S1;
        g.fillStyle = '#04070f'; g.beginPath(); g.moveTo(x, y - th); g.lineTo(x + th * 0.32, y); g.lineTo(x - th * 0.32, y); g.closePath(); g.fill();
      }
      g.fillStyle = '#04070f'; g.fillRect(0, base + 2, w, G.ground);
      const gg = g.createLinearGradient(0, base, 0, h); gg.addColorStop(0, 'rgba(60,90,160,.18)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gg; g.fillRect(0, base, w, G.ground);
    });
  }
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
  const _p = { x: 0, y: 0, ok: false, d: 0 }, _q = { x: 0, y: 0, ok: false, d: 0 }, _al = { alt: 0, az: 0 }, _sq = { alt: 0, az: 0 }, _se = { ra: 0, dec: 0 };
  function drawStarDot(ctx, s, x, y, a, t, sc) {
    const tw = RM ? 1 : 0.9 + 0.1 * Math.sin(t * TAU + s.ph);
    const al = a * s.bri * tw;
    if (al < 0.02) return;
    if (s.rad < 1.15) { ctx.globalAlpha = al; ctx.fillStyle = s.col; ctx.fillRect(x - 0.7 * sc, y - 0.7 * sc, 1.4 * sc, 1.4 * sc); return; }
    if (s.rad > 1.45) {
      const gs = s.rad * 4.8 * sc;
      ctx.globalAlpha = al * 0.55; ctx.drawImage(glowSpr(s.col), x - gs, y - gs, gs * 2, gs * 2);
    }
    ctx.globalAlpha = al; ctx.fillStyle = s.col; circle(ctx, x, y, s.rad * sc * 0.82); ctx.fill();
  }

  // 같은 항성시에서는 별의 고도·방위를 다시 계산하지 않아요 (멈춰 있을 때 가볍게)
  let AAL = NaN, AAG = NaN;
  function ensureAA(lst) {
    if (Math.abs(lst - AAL) < 1e-6) return;
    AAL = lst;
    for (let i = 0; i < BG.length; i++) { const s = BG[i]; altaz(s.ra, s.dec, lst, _al); s.alt = _al.alt; s.az = _al.az; }
    for (let i = 0; i < ZST.length; i++) { const s = ZST[i]; altaz(s.ra, s.dec, lst, _al); s.alt = _al.alt; s.az = _al.az; }
    for (let i = 0; i < MW.length; i++) { const m = MW[i]; altaz(m.ra, m.dec, lst, _al); m.alt = _al.alt; m.az = _al.az; }
    for (let i = 0; i < ECL.length; i++) { const m = ECL[i]; altaz(m.ra, m.dec, lst, _al); m.alt = _al.alt; m.az = _al.az; }
  }
  function ensureGhost(lst) {
    if (Math.abs(lst - AAG) < 1e-6) return;
    AAG = lst;
    for (let i = 0; i < ZST.length; i++) { const s = ZST[i]; altaz(s.ra, s.dec, lst, _al); s.galt = _al.alt; s.gaz = _al.az; }
  }
  /* =========================================================
     하늘 창: 한밤중(또는 한낮) 남쪽 하늘
     o: {mini, lst, sun:{ra,dec}, planet(0~1), fade, ghostLst, ghostA, ecl, names, title}
     ========================================================= */
  function drawSky(ctx, L, R, t, o) {
    const mini = !!o.mini, G = skyGeo(R, L, mini), lst = o.lst, fs = L.fs, fade = o.fade == null ? 1 : o.fade, planet = o.planet || 0;
    altaz(o.sun.ra, o.sun.dec, lst, _sq);
    const sunAlt = _sq.alt, sunAz = _sq.az, pal = skyPalette(sunAlt, planet), vis = starVisOf(sunAlt, planet), A = vis * fade;
    ctx.save();
    roundRect(ctx, R.x, R.y, R.w, R.h, 14); ctx.clip();
    const sg = ctx.createLinearGradient(0, R.y, 0, G.baseY);
    sg.addColorStop(0, rgbS(pal[0])); sg.addColorStop(0.58, rgbS(pal[1])); sg.addColorStop(1, rgbS(pal[2]));
    ctx.fillStyle = sg; ctx.fillRect(R.x, R.y, R.w, R.h);
    const glowK = clamp(1 - Math.abs(sunAlt + 1) / 11, 0, 1) * (1 - planet);
    if (glowK > 0.02) {
      const d = ((sunAz - 180 + 540) % 360) - 180, gx = G.cx + clamp(d, -130, 130) * G.kx;
      const rg = ctx.createRadialGradient(gx, G.baseY, 4, gx, G.baseY, R.w * 0.62);
      rg.addColorStop(0, 'rgba(255,170,90,' + (0.62 * glowK) + ')'); rg.addColorStop(0.5, 'rgba(255,120,110,' + (0.2 * glowK) + ')'); rg.addColorStop(1, 'rgba(255,120,110,0)');
      ctx.fillStyle = rg; ctx.fillRect(R.x, R.y, R.w, G.baseY - R.y);
    }
    const sc = mini ? 0.72 : fs * 0.95;
    // 별 위치
    ensureAA(lst);
    for (let i = 0; i < BG.length; i++) { const s = BG[i]; skyProj(G, s.az, s.alt, _p); s.mx = _p.x; s.my = _p.y; s.mon = _p.ok; }
    for (let i = 0; i < ZST.length; i++) { const s = ZST[i]; skyProj(G, s.az, s.alt, _p); s.mx = _p.x; s.my = _p.y; s.mon = _p.ok; }
    // 은하수와 희미한 별
    if (A > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gsp = glowSpr('#b9ccff');
      for (let i = 0; i < MW.length; i++) {
        const m = MW[i];
        if (m.alt < -4) continue;
        const d = ((m.az - 180 + 540) % 360) - 180;
        if (Math.abs(d) > 112) continue;
        const sz = m.size * G.ky * (mini ? 1.5 : 1.7) * (1 - Math.max(0, 25 - m.alt) / 90);
        ctx.globalAlpha = m.a * A * (m.alt < 4 ? Math.max(0, (m.alt + 4) / 8) : 1);
        ctx.drawImage(gsp, G.cx + d * G.kx - sz, G.baseY - Math.max(m.alt, 0) * G.ky - sz, sz * 2, sz * 2);
      }
      ctx.restore();
      for (let i = 0; i < BG.length; i++) { const s = BG[i]; if (s.faint && s.mon) drawStarDot(ctx, s, s.mx, s.my, A, t, sc); }
    }
    // 황도: 태양이 지나는 길
    if (A > 0.05 && o.ecl) {
      ctx.setLineDash([6, 7]); ctx.strokeStyle = 'rgba(255,190,100,' + (0.55 * Math.min(1, A + planet)) + ')'; ctx.lineWidth = 1.8 * Math.min(1.2, fs); ctx.beginPath();
      let pen = false;
      for (let i = 0; i < ECL.length; i++) {
        skyProj(G, ECL[i].az, ECL[i].alt, _q);
        if (_q.ok) { if (pen) ctx.lineTo(_q.x, _q.y); else ctx.moveTo(_q.x, _q.y); pen = true; } else pen = false;
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    // 지난달 위치 (비교 모드): 반투명 점선 유령
    const gA = (o.ghostA || 0) * (A > 0.05 ? 1 : 0);
    let ghostC = null;
    if (o.ghostLst != null && gA > 0.02) {
      ensureGhost(o.ghostLst);
      ctx.save(); ctx.lineWidth = 1.3 * (mini ? 0.7 : fs); ctx.setLineDash([4, 4]);
      ZODS.forEach((c) => {
        const pts = c.st.map((s) => { skyProj(G, s.gaz, s.galt, _p); return _p.ok ? [_p.x, _p.y] : null; });
        ctx.strokeStyle = rgbS(hexRgb(c.col), (0.34 * gA * fade).toFixed(3)); ctx.beginPath();
        c.lines.forEach((ln) => { const a = pts[ln[0]], b = pts[ln[1]]; if (a && b) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } });
        ctx.stroke();
        ctx.fillStyle = rgbS(hexRgb(c.col), (0.5 * gA * fade).toFixed(3));
        pts.forEach((p) => { if (p) { circle(ctx, p[0], p[1], (mini ? 1.4 : 2.1) * fs); ctx.fill(); } });
        const vp = pts.filter(Boolean);
        c.gc = vp.length >= 3 ? [vp.reduce((a, p) => a + p[0], 0) / vp.length, vp.reduce((a, p) => a + p[1], 0) / vp.length] : null;
      });
      ctx.setLineDash([]); ctx.restore();
      ghostC = true;
    }
    // 별자리 선과 별
    if (A > 0.01) {
      ctx.lineWidth = 1.4 * (mini ? 0.7 : fs); ctx.lineCap = 'round';
      ZODS.forEach((c) => {
        ctx.strokeStyle = rgbS(hexRgb(c.col), (0.5 * A).toFixed(3)); ctx.beginPath();
        c.lines.forEach((ln) => { const a = c.st[ln[0]], b = c.st[ln[1]]; if (a.mon && b.mon) { ctx.moveTo(a.mx, a.my); ctx.lineTo(b.mx, b.my); } });
        ctx.stroke();
      });
      for (let i = 0; i < BG.length; i++) { const s = BG[i]; if (!s.faint && s.mon) drawStarDot(ctx, s, s.mx, s.my, A, t, sc); }
      for (let i = 0; i < ZST.length; i++) { const s = ZST[i]; if (s.mon) drawStarDot(ctx, s, s.mx, s.my, A, t, sc); }
      ctx.globalAlpha = 1;
    }
    // 태양
    {
      const d = ((sunAz - 180 + 540) % 360) - 180;
      if (Math.abs(d) < 110 && sunAlt > -4) {
        const x = G.cx + d * G.kx, y = G.baseY - sunAlt * G.ky, r = (mini ? 8 : 15) * fs, low = clamp(1 - sunAlt / 25, 0, 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const gs = r * (planet > 0.5 ? 6 : 7 + 3 * low);
        ctx.globalAlpha = 1 - planet * 0.35; ctx.drawImage(glowSpr(low > 0.5 ? '#ff9a4a' : '#ffd36b'), x - gs, y - gs, gs * 2, gs * 2);
        ctx.restore();
        const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
        g.addColorStop(0, '#fffbe6'); g.addColorStop(0.6, low > 0.5 ? '#ffb347' : '#ffe27a'); g.addColorStop(1, low > 0.5 ? '#ff7a2e' : '#ffc233');
        ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
        if (planet > 0.3 && !mini) {
          ctx.strokeStyle = 'rgba(255,211,107,.85)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); circle(ctx, x, y, r + 9 * fs); ctx.stroke(); ctx.setLineDash([]);
        }
        o.sunPos = { x, y };
      } else o.sunPos = null;
    }
    // 산 실루엣과 방위 글자
    const rs = ridgeSprite(L, G);
    ctx.drawImage(rs, R.x, G.baseY + G.ground - rs.height / SPR_SCALE, R.w, rs.height / SPR_SCALE);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [[-90, '동'], [0, '남'], [90, '서']].forEach((q, i) => {
      const x = G.cx + q[0] * G.kx;
      if (mini) { ctx.font = Math.round(13 * fs) + 'px ' + DISPLAY; ctx.fillStyle = 'rgba(210,225,255,.9)'; ctx.fillText(q[1], x, G.baseY + G.ground * 0.52); }
      else { ctx.font = dfnt(L, 21); ctx.fillStyle = i === 1 ? '#fde68a' : '#cfe0ff'; ctx.fillText(q[1], x, G.baseY + G.ground * 0.5); }
    });
    if (!mini) {
      ctx.strokeStyle = 'rgba(180,200,245,.5)'; ctx.lineWidth = 1.2;
      for (let dd = -90; dd <= 90; dd += 15) { const x = G.cx + dd * G.kx, h = dd % 45 === 0 ? 9 : 5; ctx.beginPath(); ctx.moveTo(x, G.baseY + 4); ctx.lineTo(x, G.baseY + 4 + h * fs); ctx.stroke(); }
    }
    ctx.textBaseline = 'alphabetic';
    // 남쪽(자오선) 기준선
    ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(253,230,138,' + (mini ? 0.3 : 0.38) + ')'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(G.cx, R.y + (mini ? 24 : 54) * fs); ctx.lineTo(G.cx, G.baseY); ctx.stroke(); ctx.setLineDash([]);
    // 별자리 이름표
    if (o.names !== false && A > 0.2) {
      const placed = [];
      ZODS.map((c) => c).sort((a, b) => b.st.filter((s) => s.mon).length - a.st.filter((s) => s.mon).length).forEach((c) => {
        let n = 0, top = 1e9, mx = 0;
        c.st.forEach((s) => { if (s.mon) { n++; mx += s.mx; top = Math.min(top, s.my); } });
        const want = n >= 3 && (!mini || Math.abs(mx / n - G.cx) < R.w * 0.46) ? 1 : 0;
        c.labA = approach(c.labA || 0, want, 0.016, 7);
        if (c.labA < 0.05) return;
        mx /= Math.max(1, n);
        ctx.globalAlpha = c.labA * A;
        const lx = clamp(mx, R.x + (mini ? 46 : 70) * fs, R.x + R.w - (mini ? 46 : 70) * fs);
        let ly = clamp(top - (mini ? 14 : 22) * fs, R.y + (mini ? 36 : 56) * fs, G.baseY - 12);
        ctx.font = fnt(L, mini ? 11.5 : 13.5, 'bold');
        const hw = ctx.measureText(c.name).width / 2 + (mini ? 8 : 10), hh = (mini ? 11 : 13) * fs;
        for (let tries = 0; tries < 4; tries++) {
          const hit = placed.find((q) => Math.abs(q.x - lx) < q.hw + hw && Math.abs(q.y - ly) < q.hh + hh);
          if (!hit) break;
          ly = hit.y - hit.hh - hh - 2;
        }
        if (ly < R.y + (mini ? 30 : 50) * fs) { c.labA = 0; return; }
        placed.push({ x: lx, y: ly, hw, hh });
        pill(ctx, c.name, lx, ly, { font: fnt(L, mini ? 11.5 : 13.5, 'bold'), h: Math.round((mini ? 20 : 24) * fs), pad: mini ? 7 : 9, bg: 'rgba(6,10,26,.7)', color: c.col, stroke: rgbS(hexRgb(c.col), 0.5) });
        c.lx = lx; c.ly = ly;
      });
      ctx.globalAlpha = 1;
    }
    // 비교 모드 화살표: 지난달 가운데에 있던 별자리가 서쪽(오른쪽)으로 약 30° 미끄러져요
    if (ghostC && !mini && gA > 0.3) {
      let best = null, bd = 1e9;
      ZODS.forEach((c) => {
        const vp = c.st.filter((s) => s.mon);
        if (vp.length < 3 || !c.gc) return;
        const d = Math.abs(c.gc[0] - G.cx);
        if (d < bd) { bd = d; best = { c, x: vp.reduce((a, s) => a + s.mx, 0) / vp.length, y: vp.reduce((a, s) => a + s.my, 0) / vp.length }; }
      });
      if (best) {
        const x0 = best.c.gc[0], y0 = best.c.gc[1], x1 = best.x, y1 = best.y, topY = Math.min(y0, y1), botY = Math.max(y0, y1);
        const above = topY - 74 * fs > R.y + 64 * fs, sgn = above ? -1 : 1;
        const my = above ? topY - 36 * fs : botY + 40 * fs, sy0 = y0 + sgn * 10, ey = y1 + sgn * 10, ex1 = x1 - 8;
        ctx.save(); ctx.globalAlpha = gA * A;
        ctx.strokeStyle = '#fde68a'; ctx.fillStyle = '#fde68a'; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, sy0); ctx.quadraticCurveTo((x0 + x1) / 2, my, ex1, ey); ctx.stroke();
        const ang = Math.atan2(ey - my, ex1 - (x0 + x1) / 2);
        ctx.save(); ctx.translate(ex1, ey); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-7, -6.5); ctx.lineTo(-7, 6.5); ctx.closePath(); ctx.fill(); ctx.restore();
        pill(ctx, '서쪽으로 약 30°', (x0 + x1) / 2, my + sgn * 12 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(26 * fs), pad: 11, bg: 'rgba(253,230,138,.96)', color: '#3b2a00' });
        pill(ctx, '지난달', x0, y0 + (above ? 26 : -26) * fs, { font: fnt(L, 12, 'bold'), h: Math.round(20 * fs), pad: 8, bg: 'rgba(6,10,26,.7)', color: '#9fb3e0' });
        ctx.restore();
      }
    }
    // 창 이름표
    if (o.title) pill(ctx, o.title, R.x + 12, R.y + (mini ? 20 : 22) * fs, { align: 'left', font: fnt(L, mini ? 12 : 13.5, 'bold'), h: Math.round((mini ? 24 : 26) * fs), pad: mini ? 9 : 10, bg: 'rgba(6,10,26,.66)', color: o.titleCol || '#e6eeff' });
    if (o.sub && !mini) pill(ctx, o.sub, R.x + 12, R.y + 22 * fs + 32 * fs, { align: 'left', font: fnt(L, 13, 'bold'), h: Math.round(26 * fs), bg: 'rgba(6,10,26,.62)', color: o.subCol || '#fde68a' });
    ctx.restore();
    return G;
  }

  /* =========================================================
     태양 · 지구 · 별자리 그림
     ========================================================= */
  function drawSun(ctx, x, y, r, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4.2);
    g.addColorStop(0, 'rgba(255,200,96,0.6)'); g.addColorStop(0.3, 'rgba(255,160,64,0.22)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; circle(ctx, x, y, r * 4.2); ctx.fill();
    if (!RM) {
      ctx.globalAlpha = 0.16;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + t * 0.05, len = r * (2.1 + 0.5 * Math.sin(t * 0.9 + i * 1.7));
        const rg = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
        rg.addColorStop(0, 'rgba(255,220,140,1)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = rg; ctx.beginPath();
        ctx.moveTo(x + Math.cos(a + 0.1) * r, y + Math.sin(a + 0.1) * r); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.lineTo(x + Math.cos(a - 0.1) * r, y + Math.sin(a - 0.1) * r);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
    const amp = RM ? 0 : 1.3, ph = t * TAU / 3;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const a = i / 60 * TAU, rr = r + amp * (0.55 * Math.sin(3 * a + ph) + 0.3 * Math.sin(5 * a - ph * 1.3 + 1));
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    const bg = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, r * 0.05, x, y, r * 1.05);
    bg.addColorStop(0, '#fff7d6'); bg.addColorStop(0.55, '#ffcf5a'); bg.addColorStop(1, '#ff9a2e');
    ctx.fillStyle = bg; ctx.fill();
  }
  // 햇빛을 받는 작은 지구 (ux, uy = 태양 쪽 단위 벡터)
  function drawEarthSmall(ctx, x, y, r, ux, uy, lift) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = r * (0.7 + (lift || 0)); ctx.shadowOffsetY = r * 0.25;
    ctx.fillStyle = '#1d5aa8'; circle(ctx, x, y, r); ctx.fill(); ctx.restore();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    const og = ctx.createRadialGradient(x + ux * r * 0.38, y + uy * r * 0.38, r * 0.06, x, y, r * 1.05);
    og.addColorStop(0, '#6cc0ff'); og.addColorStop(0.55, '#2a74c9'); og.addColorStop(1, '#14437f');
    ctx.fillStyle = og; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = '#3fae6a';
    [[0.3, -0.35, 0.34, 0.22, 0.5], [-0.35, 0.3, 0.3, 0.2, -0.4], [0.45, 0.4, 0.2, 0.15, 0.2], [-0.5, -0.4, 0.2, 0.13, 0.7]].forEach((c) => { ctx.beginPath(); ctx.ellipse(x + c[0] * r, y + c[1] * r, c[2] * r, c[3] * r, c[4], 0, TAU); ctx.fill(); });
    const g = ctx.createLinearGradient(x + ux * r * 0.18, y + uy * r * 0.18, x - ux * r, y - uy * r);
    g.addColorStop(0, 'rgba(2,5,16,0)'); g.addColorStop(0.32, 'rgba(2,5,16,.74)'); g.addColorStop(1, 'rgba(2,5,16,.92)');
    ctx.fillStyle = g; ctx.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,244,214,.55)'; ctx.lineWidth = Math.max(1, r * 0.1);
    const a = Math.atan2(uy, ux); ctx.beginPath(); ctx.arc(x, y, r - ctx.lineWidth / 2, a - 1.1, a + 1.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(190,225,255,.5)'; ctx.lineWidth = 1; circle(ctx, x, y, r); ctx.stroke();
  }
  // 링 위의 별자리 그림 (북쪽이 위, 동쪽이 왼쪽). o: {a, hl(0~1, 색), dim, size}
  function drawZodIcon(ctx, L, c, x, y, o) {
    const sc = clamp((o.size || 44) / c.ext, 0.9, 3.4), a = o.a == null ? 1 : o.a;
    const P = c.st.map((s) => [x + (s.lx - c.cx0) * sc, y + (s.ly - c.cy0) * sc]);
    ctx.save();
    if (o.hl > 0.02) {
      const g = (o.size || 44) * 0.95 * (0.85 + 0.15 * o.hl);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 * o.hl; ctx.drawImage(glowSpr(o.hlCol || '#5eead4'), x - g, y - g, g * 2, g * 2); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.strokeStyle = rgbS(hexRgb(c.col), (0.55 + 0.4 * (o.hl || 0)).toFixed(3)); ctx.lineWidth = (1.4 + 0.8 * (o.hl || 0)) * Math.min(1.2, L.fs);
    ctx.beginPath(); c.lines.forEach((ln) => { const p = P[ln[0]], q = P[ln[1]]; ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }); ctx.stroke();
    ctx.setLineDash([]);
    P.forEach((p, i) => { const s = c.st[i]; ctx.fillStyle = s.col; circle(ctx, p[0], p[1], clamp(1.0 + (4 - s.mag) * 0.5, 1.0, 3.0) * Math.min(1.25, L.fs)); ctx.fill(); });
    ctx.restore();
    return sc;
  }
  /* ---------- 월 정보 ---------- */
  function monthBits(th) {
    const m = monthF(th), mi = Math.min(12, Math.floor(m + 1e-6)), fr = m - mi;
    return { m, mi, part: fr < 0.34 ? '초' : fr < 0.67 ? '중순' : '말', season: seasonOf(mi), mid: ZODS[slotOf(norm360(th))], sun: ZODS[slotOf(norm360(th + 180))] };
  }
  const _vn = { alt: 0, az: 0 };
  // 한밤중 정남쪽 근처에 보이는 별자리 이름들 (자오선에 가까운 순)
  let VN_KEY = NaN, VN_OUT = [];
  function visibleNames(lst) {
    if (Math.abs(lst - VN_KEY) < 0.004) return VN_OUT;
    VN_KEY = lst;
    const out = [];
    ZODS.forEach((c) => {
      let n = 0, dev = 0;
      c.st.forEach((s) => { altaz(s.ra, s.dec, lst, _vn); if (_vn.alt > 8 && Math.abs(_vn.az - 180) < 80) { n++; dev += Math.abs(_vn.az - 180); } });
      if (n >= 3) out.push({ c, dev: dev / n });
    });
    out.sort((a, b) => a.dev - b.dev);
    return (VN_OUT = out.map((q) => q.c));
  }
  const midLst = (th) => { sunEq(norm360(th + 180), _se); return (_se.ra + 12) % 24; };

  /* =========================================================
     월 안내판 (STEP 1 아래 띠 / 우주 장면 옆 카드)
     ========================================================= */
  const MONTH_CHIP = (mi) => SEASON[seasonOf(mi)].col;
  function drawRibbon(ctx, L, x, y, w, h, m) {
    const cw = w / 12, fs = L.fs;
    for (let i = 1; i <= 12; i++) {
      const sx = x + (i - 1) * cw, sea = seasonOf(i), cur = Math.floor(m + 1e-6) === i;
      roundRect(ctx, sx + 1.5, y, cw - 3, h, Math.min(8, h / 3));
      ctx.fillStyle = rgbS(hexRgb(SEASON[sea].col), cur ? 0.95 : 0.3); ctx.fill();
      ctx.fillStyle = cur ? '#10203f' : '#dbe7ff'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i + '월', sx + cw / 2, y + h / 2 + 0.5);
    }
    ctx.textBaseline = 'alphabetic';
    // 지금 위치 표지 (부드럽게 움직여요)
    const mx = x + (m - 1) * cw + cw / 2;
    ctx.fillStyle = '#5eead4'; ctx.beginPath(); ctx.moveTo(mx, y + h + 3); ctx.lineTo(mx - 7, y + h + 13 * fs); ctx.lineTo(mx + 7, y + h + 13 * fs); ctx.closePath(); ctx.fill();
    // 계절 띠 (보고 온 계절에는 ✓)
    const segs = [[1, 2, 3], [3, 5, 0], [6, 8, 1], [9, 11, 2], [12, 12, 3]];
    ctx.font = fnt(L, 12.5, 'bold');
    segs.forEach((sg) => {
      const sx = x + (sg[0] - 1) * cw + 2, ex = x + sg[1] * cw - 2, yy = y + h + 22 * fs, col = SEASON[sg[2]].col;
      ctx.strokeStyle = rgbS(hexRgb(col), 0.8); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, yy); ctx.lineTo(ex, yy); ctx.stroke();
      const ok = S.seasons[sg[2]];
      if (ex - sx > 28 || sg[2] !== 3 || sg[0] === 1) { ctx.fillStyle = ok ? '#34d399' : rgbS(hexRgb(col), 0.95); ctx.textAlign = 'center'; ctx.fillText((ok ? '✓ ' : '') + SEASON[sg[2]].name, (sx + ex) / 2, yy + 17 * fs); }
    });
  }
  function drawStrip(ctx, L, t, th) {
    const P = L.strip, fs = L.fs, mb = monthBits(th), sea = SEASON[mb.season];
    panelBase(ctx, P, L.starsStrip, t); panelEdge(ctx, P);
    const lst = midLst(th), names = visibleNames(lst).filter((c) => c !== mb.mid).slice(0, 3).map((c) => c.name);
    ctx.textAlign = 'left';
    if (L.col) {
      ctx.fillStyle = '#fff'; ctx.font = dfnt(L, 60); ctx.fillText(mb.mi + '월', P.x + 22, P.y + 80);
      ctx.fillStyle = '#b9c8ee'; ctx.font = fnt(L, 15, 'bold'); ctx.fillText(mb.part, P.x + 24, P.y + 110);
      pill(ctx, sea.ico + ' ' + sea.name, P.x + 66, P.y + 104, { align: 'left', font: fnt(L, 14, 'bold'), h: 26, pad: 11, bg: rgbS(hexRgb(sea.col), 0.22), color: sea.col, stroke: rgbS(hexRgb(sea.col), 0.6) });
      drawRibbon(ctx, L, P.x + 200, P.y + 30, 356, 30, mb.m);
      ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'left';
      ctx.fillText('🌙 한밤중(24시) 정남쪽', P.x + 590, P.y + 40);
      ctx.fillStyle = mb.mid.col; ctx.font = dfnt(L, 24); ctx.fillText(mb.mid.name, P.x + 590, P.y + 72);
      if (names.length) { ctx.fillStyle = '#b9c8ee'; ctx.font = fnt(L, 12.5, 'bold'); ctx.fillText('함께 보여요', P.x + 590, P.y + 98); ctx.fillStyle = '#d6e4ff'; ctx.fillText(names.join(' · '), P.x + 590, P.y + 116); }
    } else {
      ctx.fillStyle = '#fff'; ctx.font = dfnt(L, 62); ctx.fillText(mb.mi + '월', P.x + 22, P.y + 78);
      ctx.fillStyle = '#b9c8ee'; ctx.font = fnt(L, 15, 'bold'); ctx.fillText(mb.part, P.x + 26, P.y + 106);
      pill(ctx, sea.ico + ' ' + sea.name, P.x + 150, P.y + 52, { align: 'left', font: fnt(L, 14, 'bold'), h: 28, pad: 12, bg: rgbS(hexRgb(sea.col), 0.22), color: sea.col, stroke: rgbS(hexRgb(sea.col), 0.6) });
      ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('🌙 한밤중(24시) 정남쪽', P.x + 270, P.y + 44);
      ctx.fillStyle = mb.mid.col; ctx.font = dfnt(L, 25); ctx.fillText(mb.mid.name, P.x + 270, P.y + 80);
      drawRibbon(ctx, L, P.x + 16, P.y + 146, P.w - 32, 36, mb.m);
      ctx.textAlign = 'left';
      if (names.length) { ctx.fillStyle = '#b9c8ee'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('함께 보여요: ' + names.join(' · '), P.x + 22, P.y + 262); }
      ctx.fillStyle = 'rgba(190,205,240,.8)'; ctx.font = fnt(L, 12.5, 'bold'); ctx.fillText('같은 시각(24시)에 본 하늘이에요', P.x + 22, P.y + 292);
    }
    if (isNew('month')) newRing(ctx, L, P.x + (L.col ? 196 : 12), P.y + (L.col ? 24 : 140), L.col ? 366 : P.w - 24, L.col ? 70 : 78);
  }
  // 우주 장면 옆 카드: 월 · 한밤중 별자리 · 태양 별자리
  function drawCard(ctx, L, t, th) {
    const Cb = L.cbox, fs = L.fs, mb = monthBits(th), sea = SEASON[mb.season];
    panelBase(ctx, Cb, L.starsCbox, t); panelEdge(ctx, Cb);
    const x0 = Cb.x + 16, w = Cb.w - 32;
    ctx.textAlign = 'left';
    if (S.plan.mode && S.plan.card > 0.01) { drawPlanCard(ctx, L, Cb, mb); return; }
    ctx.fillStyle = '#fff'; ctx.font = dfnt(L, L.col ? 50 : 42); ctx.fillText(mb.mi + '월', x0, Cb.y + (L.col ? 58 : 52));
    ctx.fillStyle = '#b9c8ee'; ctx.font = fnt(L, 14, 'bold'); ctx.fillText(mb.part, x0 + (L.col ? 96 : 80), Cb.y + (L.col ? 58 : 52));
    pill(ctx, sea.ico + ' ' + sea.name, x0 + w, Cb.y + (L.col ? 30 : 28), { align: 'right', font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), pad: 10, bg: rgbS(hexRgb(sea.col), 0.22), color: sea.col, stroke: rgbS(hexRgb(sea.col), 0.6) });
    let y = Cb.y + (L.col ? 96 : 92);
    ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('🌙 한밤중 정남쪽 별자리', x0, y);
    ctx.fillStyle = mb.mid.col; ctx.font = dfnt(L, L.col ? 26 : 22); ctx.fillText(mb.mid.name, x0, y + (L.col ? 30 : 28));
    y += L.col ? 66 : 62;
    ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('☀️ 태양이 있는 쪽 (낮)', x0, y);
    ctx.fillStyle = '#ffd36b'; ctx.font = dfnt(L, L.col ? 22 : 19); ctx.fillText(mb.sun.name, x0, y + (L.col ? 28 : 25));
    ctx.fillStyle = 'rgba(190,205,240,.85)'; ctx.font = fnt(L, 12.5, 'bold');
    ctx.fillText(S.glare ? '햇빛을 가려서 본 모습' : '낮이라 보이지 않아요', x0, y + (L.col ? 52 : 46));
    ctx.fillStyle = 'rgba(190,205,240,.7)'; ctx.font = fnt(L, 11, 'bold');
    ctx.fillText(L.col ? '※ 실제 별자리 크기는 서로 달라요' : '※ 별자리 크기는 서로 달라요', x0, Cb.y + Cb.h - 14);
  }

  /* =========================================================
     장면: 하늘 창 (STEP 1)
     ========================================================= */
  const SUNQ = { ra: 0, dec: 0 };
  const skyLst = (th, noonA) => (midLst(th) + 12 * noonA + 24) % 24;
  function skyArgs(L, th, mini) {
    sunEq(norm360(th + 180), SUNQ);
    const noon = S.noonA > 0.5;
    return {
      mini, lst: skyLst(th, S.noonA), sun: SUNQ, planet: S.glareA,
      ghostLst: S.cmpA > 0.02 ? skyLst(th - 30, S.noonA) : null, ghostA: S.cmpA,
      ecl: on('suntrack') || isFree(),
      title: noon ? '🔭 한낮 남쪽 하늘' : '🔭 한밤중 남쪽 하늘',
      sub: mini ? null : (noon ? (S.glare ? '☀️ 햇빛을 가린 모습 (실제로는 볼 수 없어요)' : '☀️ 낮에는 별이 보이지 않아요') : '📍 서울 · 매월 24시'),
      subCol: noon ? '#ffd36b' : '#fde68a',
    };
  }
  function skyScene(ctx, L, t) {
    const R = L.sky, o = skyArgs(L, S.thA, false);
    drawSky(ctx, L, R, t, o);
    ctx.save(); roundRect(ctx, R.x, R.y, R.w, R.h, 14); ctx.clip();
    if (S.hint && on('month') && S.noonA < 0.5) pill(ctx, '아래 [📅 월] 막대나 [▶ 공전 재생]으로 달을 바꿔 보세요', R.x + R.w / 2, R.y + R.h * 0.2, { font: fnt(L, 14.5, 'bold'), h: Math.round(30 * L.fs), pad: 13, bg: 'rgba(14,165,233,.9)' });
    ctx.restore();
    panelEdge(ctx, R);
    drawStrip(ctx, L, t, S.thA);
  }

  /* =========================================================
     장면: 북극 위에서 본 공전 모형 (STEP 2~4)
     ========================================================= */
  function spaceBgSprite(L, M) {
    return sprite('spbg-' + L.key, M.w, M.h, (g, w, h) => {
      const bg = g.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      bg.addColorStop(0, '#17264f'); bg.addColorStop(0.6, '#0e1838'); bg.addColorStop(1, '#070d1f');
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
    });
  }
  const _e = { x: 0, y: 0 }, _z = { x: 0, y: 0 };
  const zodPos = (G, c, o) => (c.orion ? ringXY(G, c.ang, G.ring + 46, o) : ringXY(G, c.ang, G.ring, o));
  const iconSize = (L) => (L.col ? 46 : 40);
  function spaceScene(ctx, L, t, V) {
    const G = spaceGeo(L), M = G.M, fs = L.fs, th = S.thA, cx = G.cx, cy = G.cy, mb = monthBits(th);
    ringXY(G, th, G.orb, _e);
    const ex = _e.x, ey = _e.y, ux = (cx - ex) / G.orb, uy = (cy - ey) / G.orb;
    ctx.save(); roundRect(ctx, M.x, M.y, M.w, M.h, 14); ctx.clip();
    ctx.drawImage(spaceBgSprite(L, M), M.x, M.y, M.w, M.h);
    drawBgStars(ctx, L.starsSpace, t, 0.8);
    // 별자리 고리와 공전 궤도
    ctx.setLineDash([2, 7]); ctx.strokeStyle = 'rgba(160,190,255,.32)'; ctx.lineWidth = 1.4; circle(ctx, cx, cy, G.ring); ctx.stroke();
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(170,200,255,.5)'; ctx.lineWidth = 1.6; circle(ctx, cx, cy, G.orb); ctx.stroke(); ctx.setLineDash([]);
    // 월 눈금과 이름
    for (let m = 1; m <= 12; m++) {
      const a = thOfMonth(m) * DEG, cur = mb.mi === m, r1 = G.orb, r2 = G.orb + (cur ? 9 : 6);
      ctx.strokeStyle = cur ? '#5eead4' : 'rgba(200,220,255,.55)'; ctx.lineWidth = cur ? 2.4 : 1.4;
      ctx.beginPath(); ctx.moveTo(cx + r1 * Math.cos(a), cy - r1 * Math.sin(a)); ctx.lineTo(cx + r2 * Math.cos(a), cy - r2 * Math.sin(a)); ctx.stroke();
      ctx.fillStyle = cur ? '#5eead4' : 'rgba(205,220,250,.8)'; ctx.font = fnt(L, cur ? 13.5 : 12.5, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m + '월', cx + (G.orb + 24 * fs) * Math.cos(a), cy - (G.orb + 24 * fs) * Math.sin(a));
    }
    ctx.textBaseline = 'alphabetic';
    // 태양의 길 (황도): 태양이 별자리 사이를 지나는 길
    const showPath = on('suntrack') || isFree();
    const pr = G.ring - 24 * fs - (L.col ? 0 : 2);
    if (showPath) {
      ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255,190,100,.38)'; ctx.lineWidth = 1.8; circle(ctx, cx, cy, pr); ctx.stroke(); ctx.setLineDash([]);
      const w = S.walk;
      if (w.fwd > 0.5) {
        const a0 = w.b0 * DEG, a1 = (w.b0 + w.fwd) * DEG;
        ctx.strokeStyle = 'rgba(255,170,60,.95)'; ctx.lineWidth = 4.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, pr, -a1, -a0, false); ctx.stroke();
        const k0 = Math.ceil((w.b0 - 1e-6) / 30), k1 = Math.floor((w.b0 + w.fwd) / 30);
        for (let k = k0; k <= k1; k++) {
          const a = k * 30 * DEG, px = cx + pr * Math.cos(a), py = cy - pr * Math.sin(a);
          ctx.fillStyle = '#ffcf5a'; circle(ctx, px, py, 7 * Math.min(1.2, fs)); ctx.fill(); ctx.strokeStyle = '#ff9a2e'; ctx.lineWidth = 1.6; ctx.stroke();
          const mm = ((k * 30 / 30 + 0) % 12 + 12) % 12;   // β = 30(m−1) 이므로 그 달 '월 초'의 태양 자리
          ctx.fillStyle = '#ffe3a0'; ctx.font = fnt(L, 11.5, 'bold'); ctx.textAlign = 'center';
          ctx.fillText((mm + 1) + '월', cx + (pr - 17 * fs) * Math.cos(a), cy - (pr - 17 * fs) * Math.sin(a) + 4);
        }
        // 진행 방향 화살표
        const ea = a1, tx = -Math.sin(ea), ty = -Math.cos(ea), hx = cx + pr * Math.cos(ea), hy = cy - pr * Math.sin(ea);
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(hx + tx * 13, hy + ty * 13); ctx.lineTo(hx - ty * 7, hy + tx * 7); ctx.lineTo(hx + ty * 7, hy - tx * 7); ctx.closePath(); ctx.fill();
      }
      // 지금 태양이 보이는 방향
      const sb = (th + 180) * DEG, sx2 = cx + pr * Math.cos(sb), sy2 = cy - pr * Math.sin(sb);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSpr('#ffcf5a'), sx2 - 24 * fs, sy2 - 24 * fs, 48 * fs, 48 * fs); ctx.restore();
      ctx.fillStyle = '#fff3c4'; circle(ctx, sx2, sy2, 8 * Math.min(1.2, fs)); ctx.fill(); ctx.strokeStyle = '#ff9a2e'; ctx.lineWidth = 2; ctx.stroke();
    }
    // 별자리 (한밤중 시선이 닿는 별자리는 청록 빛, 태양 쪽은 흐릿하게)
    const isz = iconSize(L);
    ZODS.forEach((c) => {
      zodPos(G, c, _z);
      const wm = clamp(1 - Math.abs(sdiff(c.ang, th)) / 21, 0, 1), ws = clamp(1 - Math.abs(sdiff(c.ang, th + 180)) / 21, 0, 1);
      const sun = ws > 0.05;
      const hot = S.plan.mode && S.plan.sel === c.i;
      if (c.orion) { ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(160,200,255,.35)'; ctx.lineWidth = 1.2; roundRect(ctx, _z.x - isz * 0.6, _z.y - isz * 0.72, isz * 1.2, isz * 1.44, 12); ctx.stroke(); ctx.setLineDash([]); }
      const sunHi = sun && S.glare;
      drawZodIcon(ctx, L, c, _z.x, _z.y, { size: isz, hl: sunHi ? ws : wm, hlCol: sunHi ? '#ffb347' : '#5eead4', a: sun && !S.glare ? 1 - 0.72 * ws : 1 });
      if (hot) { ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); circle(ctx, _z.x, _z.y, isz * 0.78 + 2 * pulse()); ctx.stroke(); ctx.setLineDash([]); }
      // 이름표 (그림 위나 아래에 둬서 시선 점선과 겹치지 않게)
      const ca = Math.cos(c.ang * DEG), sa = Math.sin(c.ang * DEG), up = sa >= -0.2 && !c.orion;
      const dy = c.orion ? isz * 0.72 + 14 * fs : (up ? -(isz * 0.5 + 13 * fs) : (isz * 0.5 + 13 * fs));
      let lx = _z.x, ly = _z.y + dy;
      ctx.font = fnt(L, 12.5, 'bold');
      const lw = ctx.measureText(c.name).width / 2 + 10;
      lx = clamp(lx, M.x + lw + 4, M.x + M.w - lw - 4); ly = clamp(ly, M.y + 16 * fs, M.y + M.h - 14 * fs);
      const on1 = wm > 0.45 || hot, tone = sunHi ? '#ffcf8a' : on1 ? '#5eead4' : (sun && !S.glare ? 'rgba(160,175,210,.7)' : '#cfe0ff');
      pill(ctx, c.name, lx, ly, { font: ctx.font, h: Math.round(22 * fs), pad: 8, bg: 'rgba(6,10,26,.78)', color: tone, stroke: on1 ? 'rgba(94,234,212,.7)' : sunHi ? 'rgba(255,179,71,.7)' : null });
      c.sx = _z.x; c.sy = _z.y;
      if (sun && ws > 0.5) {
        const tx2 = S.glare ? '☀️ 태양 앞' : '낮이라 안 보임', by = _z.y + (c.orion ? -(isz * 0.72 + 14 * fs) : (up ? (isz * 0.5 + 13 * fs) : -(isz * 0.5 + 13 * fs)));
        pill(ctx, tx2, clamp(_z.x, M.x + 50 * fs, M.x + M.w - 50 * fs), clamp(by, M.y + 14 * fs, M.y + M.h - 14 * fs), { font: fnt(L, 11.5, 'bold'), h: Math.round(20 * fs), pad: 8, bg: S.glare ? 'rgba(180,100,10,.92)' : 'rgba(120,53,15,.9)', color: '#fff1d6', stroke: 'rgba(253,186,116,.8)' });
      }
    });
    // 한밤중 시선(청록 점선)과 태양 쪽 연장선(주황 점선)
    {
      const a = th * DEG, ca = Math.cos(a), sa = Math.sin(a);
      ctx.setLineDash([4, 6]); ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(94,234,212,.95)';
      ctx.beginPath(); ctx.moveTo(ex + ca * (G.R + 3), ey - sa * (G.R + 3)); ctx.lineTo(cx + (G.ring - isz * 0.55) * ca, cy - (G.ring - isz * 0.55) * sa); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,180,90,.7)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(ex - ca * (G.R + 3), ey + sa * (G.R + 3)); ctx.lineTo(cx - (G.ring - isz * 0.55) * ca, cy + (G.ring - isz * 0.55) * sa); ctx.stroke();
      ctx.setLineDash([]);
    }
    // 태양과 지구
    drawSun(ctx, cx, cy, G.sun, t);
    drawEarthSmall(ctx, ex, ey, G.R, ux, uy, S.drag ? 0.6 : 0);
    {
      const a = th * DEG, ox = ex + (G.R + 1) * Math.cos(a), oy = ey - (G.R + 1) * Math.sin(a);
      ctx.fillStyle = '#5eead4'; circle(ctx, ox, oy, 3.6 * Math.min(1.2, fs)); ctx.fill(); ctx.strokeStyle = '#06222a'; ctx.lineWidth = 1.2; ctx.stroke();
      const s = 1 + 0.16 * S.bounce;
      ctx.save(); ctx.translate(ex - Math.sin(a) * (G.R + 28 * fs), ey - Math.cos(a) * (G.R + 28 * fs)); ctx.scale(s, s);
      pill(ctx, mb.mi + '월 ' + mb.part, 0, 0, { font: fnt(L, 13.5, 'bold'), h: Math.round(24 * fs), pad: 10, bg: 'rgba(6,30,34,.9)', color: '#5eead4', stroke: 'rgba(94,234,212,.7)' });
      ctx.restore();
    }
    // 안내
    if (L.col || !(!S.spaceTouched && S.scene === 'space' && !S.plan.mode) && !(S.plan.mode && S.plan.sel < 0 && !S.plan.made)) pill(ctx, '🌍 북극 위에서 내려다본 태양과 지구', M.x + 14, M.y + 22 * fs, { align: 'left', font: fnt(L, 13.5, 'bold'), h: Math.round(26 * fs), bg: 'rgba(6,10,26,.7)', color: '#e6eeff' });
    pill(ctx, '↺ 공전: 서 → 동 (반시계 방향)', M.x + 14, L.col ? M.y + 22 * fs + 32 * fs : M.y + M.h - 20 * fs, { align: 'left', font: fnt(L, 13, 'bold'), h: Math.round(26 * fs), pad: 10, color: '#3b2a00', bg: 'rgba(255,209,102,.96)' });
    const hintA = !S.spaceTouched && S.scene === 'space' && !S.plan.mode, hintB = S.plan.mode && S.plan.sel < 0 && !S.plan.made;
    if (hintA) { ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(253,230,138,' + (0.4 + 0.5 * pulse()) + ')'; ctx.lineWidth = 2.4; circle(ctx, ex, ey, G.R + 10 + 3 * pulse()); ctx.stroke(); ctx.setLineDash([]); }
    if (hintA || hintB) {
      const txt = hintA ? '👆 지구를 끌어서 궤도를 따라 움직여 보세요' : '👆 한밤중에 볼 수 있는 별자리를 눌러요';
      pill(ctx, txt, L.col ? M.x + M.w / 2 : M.x + 14, L.col ? M.y + M.h - 24 * fs : M.y + 22 * fs, { align: L.col ? 'center' : 'left', font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 13, bg: 'rgba(14,165,233,.92)' });
    }
    if (isNew('space') && !S.spaceTouched) newRingCircle(ctx, L, ex, ey, G.R + 16);
    ctx.restore();
    panelEdge(ctx, M);
    // 옆: 한밤중 남쪽 하늘 + 안내 카드
    const Mn = L.mini;
    drawSky(ctx, L, Mn, t, skyArgs(L, S.thA, true));
    panelEdge(ctx, Mn);
    drawCard(ctx, L, t, S.thA);
  }

  /* ---------- 관측 카드 (STEP 4) ---------- */
  function drawPlanCard(ctx, L, Cb, mb) {
    const fs = L.fs, x0 = Cb.x + 14, w = Cb.w - 28, a = S.plan.card, done = S.plan.made;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#e6eeff'; ctx.font = dfnt(L, L.col ? 20 : 18); ctx.textAlign = 'left';
    ctx.fillText('📋 나의 관측 카드', x0, Cb.y + 32 * fs);
    ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('🎂 생일 달', x0, Cb.y + 62 * fs);
    ctx.fillStyle = '#fff'; ctx.font = dfnt(L, L.col ? 30 : 26); ctx.fillText(mb.mi + '월', x0 + 78 * fs, Cb.y + 64 * fs);
    ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('🌙 한밤중 남쪽 별자리', x0, Cb.y + 96 * fs);
    // 고른 별자리 칸
    const bx = x0, by = Cb.y + 108 * fs, bw = w, bh = (L.col ? 116 : 104) * fs, sel = S.plan.sel >= 0 ? ZODS[S.plan.sel] : null;
    roundRect(ctx, bx, by, bw, bh, 12);
    ctx.fillStyle = done ? 'rgba(52,211,153,.14)' : 'rgba(255,255,255,.05)'; ctx.fill();
    ctx.strokeStyle = done ? '#34d399' : sel ? '#fde68a' : 'rgba(160,185,235,.45)'; ctx.lineWidth = done ? 2.6 : 1.6; if (!sel) ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    if (sel) {
      drawZodIcon(ctx, L, sel, bx + bw * 0.28, by + bh * 0.5, { size: Math.min(bh * 0.72, 60), hl: done ? 1 : 0.3, hlCol: done ? '#34d399' : '#fde68a' });
      ctx.fillStyle = sel.col; ctx.font = dfnt(L, L.col ? 22 : 19); ctx.textAlign = 'left'; ctx.fillText(sel.name, bx + bw * 0.5 - 4, by + bh * 0.5 + 7);
    } else {
      ctx.fillStyle = 'rgba(190,205,240,.7)'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'center'; ctx.fillText('? 별자리를 눌러요', bx + bw / 2, by + bh / 2 + 5);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = done ? '#34d399' : 'rgba(190,205,240,.8)'; ctx.font = fnt(L, 12.5, 'bold');
    if (done) { ctx.fillText('✅ 관측 카드 완성!', x0, by + bh + 26 * fs); ctx.fillStyle = '#cfe0ff'; ctx.fillText('관측 앱으로 확인해 볼까요?', x0, by + bh + 46 * fs); }
    else { ctx.fillText('청록 점선 끝이 정답!', x0, by + bh + 26 * fs); }
    ctx.restore();
  }

  /* =========================================================
     전체 그리기 · 화면 전환 · 컨트롤
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
    if (S.scene === 'sky') skyScene(ctx, L, t); else spaceScene(ctx, L, t, V);
    V.P.draw(ctx);
    drawFx(ctx, V);
    if (S.sceneA < 0.995) { ctx.fillStyle = 'rgba(7,13,31,' + ((1 - S.sceneA) * 0.94) + ')'; ctx.fillRect(0, 0, L.vw, L.vh); }
  }
  function setScene(name) {
    const changed = S.scene !== name;
    S.scene = name;
    if (changed) { S.sceneA = 0.001; SciSim.tween(S, { sceneA: 1 }, { duration: 0.45, ease: 'outCubic' }); }
    setPlaying(false);
    syncControls();
  }
  const sMonth = $('#sMonth'), oMonth = $('#oMonth'), playBtn = $('#playBtn'), tCmp = $('#tCmp'), tGlare = $('#tGlare');
  const monthTxt = (v) => { const m = v >= 13 ? 1 : v, mi = Math.min(12, Math.floor(m + 1e-6)), fr = m - mi; return mi + '월 ' + (fr < 0.34 ? '초' : fr < 0.67 ? '중순' : '말'); };
  const rangeMonth = SciSim.bindRange(sMonth, oMonth, monthTxt, (v) => { setPlaying(false); setMonth(v); });
  function setMonth(v, instant) {
    S.th += sdiff(thOfMonth(v), S.th);
    if (instant) { S.thA = S.th; S.thAV = 0; S.monthShown = monthBits(S.th).mi; }
    S.hint = false;
  }
  const syncSlider = () => rangeMonth.set(clamp(monthF(S.th), 1, 13));
  function setPlaying(p) {
    S.playing = !!p && on('month') && !S.plan.mode;
    playBtn.innerHTML = S.playing ? '⏸ 정지' : '▶ 공전 재생';
    playBtn.classList.toggle('btn-primary', !S.playing);
    playBtn.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  playBtn.addEventListener('click', () => { Sound.click(); setPlaying(!S.playing); S.hint = false; S.spaceTouched = true; });
  tCmp.addEventListener('change', () => { Sound.click(); S.cmp = tCmp.checked; });
  tGlare.addEventListener('change', () => { Sound.click(); S.glare = tGlare.checked; S.glareUsed = true; });
  function syncControls() {
    const lv = game ? game.level : 0, sky = S.scene === 'sky';
    $('#cMonth').classList.toggle('is-off', !on('month'));
    $('#playRow').classList.toggle('is-off', !!S.plan.mode);
    $('#cCmp').classList.toggle('is-off', !(on('month') && !S.plan.mode && !on('suntrack') && !isFree()));
    $('#cGlare').classList.toggle('is-off', !(on('noglare') && !S.plan.mode));
    tCmp.checked = S.cmp; tGlare.checked = S.glare;
    syncSlider();
    const any = ['#cMonth', '#cCmp', '#cGlare'].some((q) => !$(q).classList.contains('is-off') && !$(q).hidden);
    $('#ctrlCard').hidden = !any;
    void lv; void sky;
  }

  /* ---------- 포인터 ---------- */
  const angOf = (cx, cy, p) => Math.atan2(cy - p.y, p.x - cx) / DEG;
  function attachPointer(V) {
    const { v, L } = V;
    let drag = null;
    const earthHit = (p) => {
      const G = spaceGeo(L); ringXY(G, S.thA, G.orb, _e);
      const dE = Math.hypot(p.x - _e.x, p.y - _e.y), dO = Math.abs(Math.hypot(p.x - G.cx, p.y - G.cy) - G.orb);
      return dE < 30 * L.fs || dO < 20 * L.fs;
    };
    const zodHit = (p) => {
      if (!S.plan.mode) return null;
      const G = spaceGeo(L), r = iconSize(L) * 0.72; let best = null, bd = r;
      ZODS.forEach((c) => { zodPos(G, c, _z); const d = Math.hypot(p.x - _z.x, p.y - _z.y); if (d < bd) { bd = d; best = c; } });
      return best;
    };
    SciSim.pointer(v, {
      hover(p) { if (S.scene !== 'space') return null; return zodHit(p) ? 'pointer' : earthHit(p) ? 'grab' : null; },
      down(p) {
        if (S.scene !== 'space') return false;
        const c = zodHit(p);
        if (c && !(game && game.phase !== 'active')) {
          S.plan.sel = c.i; S.plan.wrong = null; Sound.tone(660, 0.07, 'triangle', 0.07);
          const G = spaceGeo(L); zodPos(G, c, _z); ringFx(V, _z.x, _z.y, 26, '#fde68a');
          return false;
        }
        if (!earthHit(p)) return false;
        const G = spaceGeo(L);
        S.spaceTouched = true; S.hint = false; setPlaying(false); S.drag = true;
        drag = { last: angOf(G.cx, G.cy, p) };
        v.canvas.style.cursor = 'grabbing';
        return true;
      },
      move(p) {
        if (!drag) return;
        const G = spaceGeo(L), a = angOf(G.cx, G.cy, p), d = sdiff(a, drag.last);
        drag.last = a; S.th += d; syncSlider();
      },
      up() {
        v.canvas.style.cursor = ''; S.drag = false;
        if (!drag) return;
        drag = null;
        const nr = Math.round((S.th - 180) / 30) * 30 + 180;
        if (Math.abs(S.th - nr) <= 7) S.th = nr;
        syncSlider();
      },
    });
    if (L.key === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0]; if (!tc) return;
        const p = v.toLocal(tc);
        if (drag || (S.scene === 'space' && (earthHit(p) || zodHit(p)))) e.preventDefault();
      }, { passive: false });
    }
  }

  /* =========================================================
     퀴즈·노트 그림 (SVG)
     ========================================================= */
  const SVG_OPEN = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FONT.replace(/"/g, '') + '\'>';
  const f1 = (v) => v.toFixed(1);
  const FIG = {};
  // 한밤중 남쪽 하늘 한 장 (동쪽이 왼쪽)
  function svgPano(x0, y0, w, h, th, hiKey, title) {
    const lst = midLst(th), a0 = 100, a1 = 260, kx = (w - 20) / (a1 - a0), base = y0 + h - 14, ky = (h - 34) / 78, o = { alt: 0, az: 0 };
    let s = '<rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" rx="10" fill="#0a1432"/><rect x="' + x0 + '" y="' + base + '" width="' + w + '" height="14" rx="0" fill="#04070f"/>';
    s += '<clipPath id="fc' + y0 + '"><rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + (h - 0) + '" rx="10"/></clipPath><g clip-path="url(#fc' + y0 + ')">';
    const px = (az, alt) => [x0 + 10 + (az - a0) * kx, base - alt * ky];
    ZODS.forEach((c) => {
      const P = c.st.map((st) => { altaz(st.ra, st.dec, lst, o); return o.alt > -1 && o.az > a0 - 12 && o.az < a1 + 12 ? px(o.az, o.alt) : null; });
      const hi = hiKey === c.key;
      let d = ''; c.lines.forEach((ln) => { const p = P[ln[0]], q = P[ln[1]]; if (p && q) d += 'M' + f1(p[0]) + ',' + f1(p[1]) + ' L' + f1(q[0]) + ',' + f1(q[1]) + ' '; });
      s += '<path d="' + d + '" fill="none" stroke="' + (hi ? c.col : '#8fa8d8') + '" stroke-opacity="' + (hi ? 0.95 : 0.4) + '" stroke-width="' + (hi ? 2 : 1.2) + '" stroke-linecap="round"/>';
      P.forEach((p, i) => { if (p) s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + (hi ? 2.8 : 1.9) + '" fill="' + (hi ? c.col : '#d6e4ff') + '"/>'; });
      if (hi) { const vp = P.filter(Boolean); if (vp.length) { const mx = vp.reduce((a, p) => a + p[0], 0) / vp.length, my = Math.min.apply(null, vp.map((p) => p[1])); s += '<text x="' + f1(mx) + '" y="' + f1(my - 8) + '" font-size="12.5" font-weight="800" text-anchor="middle" fill="' + c.col + '">' + c.name + '</text>'; }}
    });
    s += '</g>';
    const mx = px(180, 0)[0];
    s += '<line x1="' + f1(mx) + '" y1="' + (y0 + 22) + '" x2="' + f1(mx) + '" y2="' + base + '" stroke="#fde68a" stroke-opacity=".55" stroke-dasharray="3 4"/><text x="' + f1(mx) + '" y="' + (base + 11) + '" font-size="10.5" font-weight="800" text-anchor="middle" fill="#fde68a">남</text>';
    s += '<text x="' + (x0 + 10) + '" y="' + (base + 11) + '" font-size="10.5" font-weight="800" fill="#9fb3e0">동</text><text x="' + (x0 + w - 10) + '" y="' + (base + 11) + '" font-size="10.5" font-weight="800" text-anchor="end" fill="#9fb3e0">서</text>';
    s += '<text x="' + (x0 + 12) + '" y="' + (y0 + 17) + '" font-size="13" font-weight="800" fill="#fff">' + title + '</text>';
    return s;
  }
  FIG.shift = (function () {
    const W = 340, H = 232;
    return SVG_OPEN(W, H, '1월과 2월 같은 시각(24시)의 남쪽 하늘: 쌍둥이자리가 서쪽(오른쪽)으로 움직였어요') + '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>' +
      svgPano(10, 8, 320, 104, 180, 'gem', '1월 24시') + svgPano(10, 120, 320, 104, 210, 'gem', '2월 24시') + '</svg>';
  })();
  // 위에서 본 공전 모형. earths: [{th, label, ask, col, dash}], sunSlot: 태양 쪽 연장선 표시 여부
  function modelSVG(W, H, earths, opts) {
    opts = opts || {};
    const cx = W / 2, cy = H / 2 + 2, ring = Math.min(W, H) / 2 - 36, orb = ring * 0.5;
    let s = SVG_OPEN(W, H, opts.label || '태양 둘레를 도는 지구와 황도 12궁') + '<defs><radialGradient id="fmS"><stop offset="0" stop-color="#fff7d6"/><stop offset=".6" stop-color="#ffcf5a"/><stop offset="1" stop-color="#ff9a2e"/></radialGradient><radialGradient id="fmE" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#7cc8ff"/><stop offset="1" stop-color="#1d5aa8"/></radialGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ring + '" fill="none" stroke="rgba(160,190,255,.3)" stroke-dasharray="2 6"/><circle cx="' + cx + '" cy="' + cy + '" r="' + orb + '" fill="none" stroke="rgba(170,200,255,.5)" stroke-dasharray="5 5"/>';
    ZOD_DEF.forEach((c, i) => {
      const a = c.ang * DEG, x = cx + ring * Math.cos(a), y = cy - ring * Math.sin(a), hi = opts.hi && opts.hi.indexOf(c.key) >= 0;
      s += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (hi ? 4.5 : 3) + '" fill="' + c.col + '"/>';
      const lx = cx + (ring + 22) * Math.cos(a), ly = cy - (ring + 22) * Math.sin(a);
      s += '<text x="' + f1(lx) + '" y="' + f1(ly + 4) + '" font-size="' + (W > 330 ? 12 : 11) + '" font-weight="800" text-anchor="middle" fill="' + (hi ? c.col : '#b9c8ee') + '">' + c.name + '</text>';
    });
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="11" fill="url(#fmS)"/>';
    (earths || []).forEach((e) => {
      const a = e.th * DEG, ex = cx + orb * Math.cos(a), ey = cy - orb * Math.sin(a), ca = Math.cos(a), sa = Math.sin(a);
      const far = ring - 12;
      s += '<line x1="' + f1(ex + ca * 9) + '" y1="' + f1(ey - sa * 9) + '" x2="' + f1(cx + far * ca) + '" y2="' + f1(cy - far * sa) + '" stroke="#5eead4" stroke-width="2" stroke-dasharray="4 4"' + (e.dash ? ' opacity=".7"' : '') + '/>';
      if (e.sun !== false) s += '<line x1="' + f1(ex - ca * 9) + '" y1="' + f1(ey + sa * 9) + '" x2="' + f1(cx - far * ca) + '" y2="' + f1(cy + far * sa) + '" stroke="#ffb45a" stroke-width="1.8" stroke-dasharray="3 5" opacity=".85"/>';
      s += '<circle cx="' + f1(ex) + '" cy="' + f1(ey) + '" r="8" fill="url(#fmE)" stroke="' + (e.col || '#e6f3ff') + '" stroke-width="' + (e.dash ? 1.4 : 1.2) + '"' + (e.dash ? ' stroke-dasharray="3 3"' : '') + '/>';
      s += '<circle cx="' + f1(ex + ca * 8) + '" cy="' + f1(ey - sa * 8) + '" r="2.6" fill="#5eead4"/>';
      const tx = ex - sa * 22 * 0 + (ca >= 0 ? -1 : 1) * 0, lx = cx + (orb - 20) * ca, ly = cy - (orb - 20) * sa;
      s += '<text x="' + f1(lx) + '" y="' + f1(ly + 4) + '" font-size="12" font-weight="800" text-anchor="middle" fill="' + (e.col || '#e6f3ff') + '">' + e.label + '</text>';
      if (e.ask) { const qx = cx + (far + 4) * ca, qy = cy - (far + 4) * sa; s += '<circle cx="' + f1(qx) + '" cy="' + f1(qy) + '" r="9" fill="#fde68a"/><text x="' + f1(qx) + '" y="' + f1(qy + 4.5) + '" font-size="13" font-weight="800" text-anchor="middle" fill="#3b2a00">?</text>'; void tx; }
    });
    return s + '</svg>';
  }
  FIG.sep = modelSVG(340, 300, [{ th: thOfMonth(9), label: '9월', ask: true }], { hi: ['leo'], label: '9월의 지구와 태양: 태양은 사자자리 쪽에 있어요' });
  FIG.six = modelSVG(340, 300, [{ th: thOfMonth(3), label: '오늘(3월)', col: '#5eead4' }, { th: thOfMonth(9), label: '6개월 뒤', ask: true, dash: true, col: '#fde68a', sun: false }], { hi: ['leo'], label: '3월과 6개월 뒤 9월의 지구' });
  FIG.winSum = modelSVG(340, 300, [{ th: 180, label: '1월', col: '#93c5fd' }, { th: 0, label: '7월', col: '#fdba74' }], { hi: ['gem', 'sgr'], label: '지구가 1월과 7월에 한밤중에 바라보는 방향' });
  FIG.earth6 = modelSVG(340, 300, [{ th: thOfMonth(1), label: '1월' }, { th: thOfMonth(4), label: '4월' }, { th: thOfMonth(7), label: '7월' }, { th: thOfMonth(10), label: '10월' }], { label: '일 년 동안 지구는 태양 둘레를 한 바퀴 돌아요', hi: [] });

  /* =========================================================
     단계별 학습
     ========================================================= */
  function resetState(o) {
    o = o || {};
    S.playing = false; setPlaying(false);
    S.plan.mode = !!o.plan; S.plan.sel = -1; S.plan.made = false; S.plan.wrong = null;
    S.noonT = o.noon ? 1 : 0;
    S.cmp = !!o.cmp; S.glare = false; tGlare.checked = false; tCmp.checked = S.cmp;
    S.seasonOn = !!o.seasons; S.reachOn = !!o.reach; S.walkOn = !!o.walk; S.cmpOn = !!o.cmpCount;
    S.tapMsg = null;
    if (!o.walk && !o.noon && S.walk) S.walk.fwd = 0;
    if (o.month != null) setMonth(o.month, true);
    setScene(o.scene || 'sky');
    syncControls();
  }
  const seasonChips = () => SEASON.map((q, i) => chk(S.seasons[i], q.name)).join(' · ');
  game = SciSim.game({
    simId: 'm1-constellation-change',
    mount: '#game',
    badge: '별자리 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      sky: '🔭 한밤중 남쪽 하늘',
      month: '📅 월 · 공전 재생',
      space: '🌍 북극 위 공전 모형',
      suntrack: '☀️ 태양의 길(황도)',
      noglare: '☀️ 햇빛 가리기',
      planner: '📋 관측 카드',
    },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart() { S.tapMsg = null; },
    onComplete() { resetState({ month: 1, scene: 'sky' }); S.hint = false; },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '계절마다 다른 밤하늘', short: '계절 하늘', icon: '🌌', phase: '관찰',
        features: ['sky', 'month'],
        intro: '<p class="si-q">❓ 탐구 질문: 왜 계절마다 밤하늘에 보이는 별자리가 달라질까?</p>' +
          '<p>서울에서 매달 <b>한밤중(24시)</b>에 <b>남쪽 하늘</b>을 올려다본 모습이에요. [📅 월]을 바꿔 가며 어떤 별자리가 보이는지 살펴봐요.</p>' +
          '<p>🔦 밤에 직접 별을 관측할 때는 어른과 함께, 안전한 곳에서 해요.</p>',
        setup() { resetState({ month: 1, scene: 'sky', seasons: false }); S.hint = true; S.seasons = [false, false, false, false]; },
        recap: '계절마다 한밤중 남쪽 하늘의 별자리가 달라요. 같은 시각의 별자리는 한 달에 약 30°씩 서쪽으로 움직여요.',
        summary: '<div class="note-fig">' + FIG.shift + '</div><ul><li>계절마다 한밤중 남쪽 하늘에 보이는 별자리가 달라요. <b>봄</b> 사자자리, <b>여름</b> 전갈·궁수자리, <b>가을</b> 물병·물고기자리, <b>겨울</b> 쌍둥이·오리온자리</li>' +
          '<li>같은 시각에 본 별자리는 <b>하루에 약 1°, 한 달에 약 30°</b>씩 <b>서쪽</b>으로 움직여요.</li><li>1년이 지나면 같은 별자리가 같은 시각에 같은 자리로 돌아와요.</li></ul>',
        missions: [
          {
            title: '🍂 네 계절의 한밤중 하늘',
            goal: '봄·여름·가을·겨울의 달로 [📅 월]을 옮기고, 계절마다 <b>0.5초 이상</b> 멈춰서 한밤중 남쪽 하늘을 살펴봐요.',
            hint: '월 막대를 3~5월(봄), 6~8월(여름), 9~11월(가을), 12~2월(겨울)에 놓고 잠깐 멈춰요. [▶ 공전 재생] 중에는 멈춰야 살펴본 것으로 쳐요.',
            setup() { resetState({ month: 1, scene: 'sky', seasons: true }); S.hint = true; S.seasons = [false, false, false, false]; S.dwellS = -1; S.dwellT = 0; },
            check: () => S.seasons.every(Boolean),
            hold: 0.4,
            status: () => seasonChips() + '<br>지금 한밤중 정남쪽: <b>' + monthBits(S.th).mid.name + '</b>',
            explain: '계절마다 한밤중 남쪽 하늘에서 보이는 별자리가 <b>달라요</b>. 봄에는 사자자리, 여름에는 전갈·궁수자리, 가을에는 물병·물고기자리, 겨울에는 쌍둥이·오리온자리가 보여요.',
          },
          {
            title: '🔁 한 달 뒤 같은 시각',
            goal: '[🔁 지난달 위치와 비교]를 켜고, <b>1월에서 2월로</b> 한 달만 옮겨 보세요. <b>쌍둥이자리</b>가 어느 쪽으로 움직일까요?',
            hint: '월 막대를 1월에서 2월 쪽으로 조금만 밀거나, [▶ 공전 재생]을 1.2초 동안만 눌러요. 노란 화살표가 나타나요.',
            setup() { resetState({ month: 1, scene: 'sky', cmp: true, cmpCount: true }); S.cmpMoves = 0; S.lastInt = 1; S.hint = false; },
            check: () => S.cmp && S.cmpMoves >= 1,
            hold: 0.5,
            status: () => chk(S.cmp, '비교 켜기') + ' · ' + chk(S.cmpMoves >= 1, '한 달 뒤로 옮기기'),
            explain: '같은 시각(24시)에 본 별자리는 한 달 뒤에 <b>서쪽(오른쪽)</b>으로 약 30° 움직여요. 한 달 전의 위치(점선)와 비교해 보면 알 수 있어요.',
          },
          {
            type: 'quiz',
            title: '🧭 이동 방향과 크기',
            goal: '그림은 1월과 2월의 같은 시각(24시) 남쪽 하늘이에요. 같은 시각에 본 별자리는 <b>한 달 뒤</b> 어떻게 될까요?',
            figure: FIG.shift,
            setup() { resetState({ month: 1, scene: 'sky', cmp: true }); S.hint = false; },
            choices: ['서쪽으로 약 30° 움직인다', '동쪽으로 약 30° 움직인다', '제자리에 있다', '서쪽으로 약 1° 움직인다'],
            answer: 0,
            feedback: [
              '',
              '그림에서 쌍둥이자리가 1월에는 가운데(남쪽)에 있었는데 2월에는 오른쪽(서쪽)에 있어요. 동쪽(왼쪽)으로 가지 않아요.',
              '1월과 2월의 쌍둥이자리 위치가 달라요. 같은 시각이라도 한 달 뒤에는 자리가 옮겨져 있어요.',
              '약 1°는 하루 동안 움직이는 양이에요. 한 달(약 30일)이면 약 30°가 돼요.',
            ],
            explain: '하루에 약 1°씩, 한 달이면 약 30° <b>서쪽</b>으로 움직여요. 1년(약 365일)이면 한 바퀴를 돌아 제자리로 와요. 그래서 같은 별자리는 1년 뒤 같은 시각에 같은 자리에 보여요.',
          },
        ],
      },
      /* ---------- 2단계 · 모형 ---------- */
      {
        title: '공전하는 지구', short: '공전', icon: '🌍', phase: '모형',
        features: ['space'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별자리가 한 달에 약 30°씩 서쪽으로 밀려나는 것을 봤어요.</div>' +
          '<p>왜 그럴까요? <b>북극 위 우주</b>에서 태양 둘레를 도는 지구를 내려다봐요. 바깥 고리는 태양이 지나는 길의 별자리 <b>황도 12궁</b>이에요. <b>청록 점선</b>은 한밤중에 지구에서 바라보는 방향이에요.</p>',
        setup() { resetState({ month: 4, scene: 'space', reach: true }); S.reached = { gem: false, sgr: false }; S.spaceTouched = false; },
        recap: '지구가 태양 둘레를 공전하면서 한밤중에 바라보는 방향이 바뀌어요. 그래서 계절마다 보이는 별자리가 달라요.',
        summary: '<div class="note-fig">' + FIG.winSum + '</div><ul><li>지구는 태양 둘레를 1년에 한 바퀴(하루 약 1°) <b>서→동</b>(북극 위에서 보면 반시계 방향)으로 <b>공전</b>해요.</li>' +
          '<li>공전하면서 <b>한밤중에 바라보는 방향</b>이 달라져서 계절마다 다른 별자리가 보여요.</li><li>1월에는 쌍둥이자리 쪽, 7월에는 궁수자리 쪽을 봐요.</li></ul>',
        missions: [
          {
            title: '🌍 겨울·여름 밤하늘 만들기',
            goal: '지구를 끌어서 <b>한밤중 시선(청록 점선)</b>이 먼저 <b>쌍둥이자리</b>에, 그다음 <b>궁수자리</b>에 닿게 해 보세요.',
            hint: '지구는 궤도를 따라 움직여요. 쌍둥이자리는 1월(왼쪽), 궁수자리는 7월(오른쪽)일 때예요. 반시계 방향으로 돌려요.',
            setup() { resetState({ month: 4, scene: 'space', reach: true }); S.reached = { gem: false, sgr: false }; S.spaceTouched = false; },
            check: () => S.reached.gem && S.reached.sgr,
            hold: 0.5,
            status: () => chk(S.reached.gem, '쌍둥이자리(겨울)') + ' → ' + chk(S.reached.sgr, '궁수자리(여름)') + (S.spaceTouched ? '' : '<br>💡 지구를 손가락으로 끌어 보세요.'),
            explain: '지구가 공전하면서 한밤중에 바라보는 방향이 바뀌어요. 1월에는 <b>쌍둥이자리</b> 쪽, 7월에는 <b>궁수자리</b> 쪽을 보게 돼요. 그래서 계절마다 한밤중 하늘의 별자리가 달라요.',
          },
          {
            type: 'quiz',
            title: '🌌 별자리가 바뀌는 까닭',
            goal: '계절마다 한밤중에 보이는 별자리가 달라지는 까닭은 무엇일까요?',
            setup() { if (S.scene !== 'space') resetState({ month: 1, scene: 'space' }); },
            choices: ['지구가 공전하면서 한밤중에 바라보는 방향이 바뀌기 때문', '별자리가 지구 둘레를 돌기 때문', '지구가 자전하기 때문', '계절마다 별자리가 새로 생기기 때문'],
            answer: 0,
            feedback: [
              '',
              '별자리는 지구 둘레를 돌지 않아요. 바깥 고리의 별자리는 제자리에 있고, 지구가 태양 둘레를 돌아요.',
              '자전은 하루 동안의 변화(앞 차시)를 만들어요. 한 달, 계절 단위의 변화는 공전 때문이에요.',
              '별자리는 새로 생기거나 사라지지 않아요. 늘 그 자리에 있고, 우리가 보는 방향이 달라질 뿐이에요.',
            ],
            explain: '지구는 태양 둘레를 1년에 한 바퀴(하루 약 1°) 서→동으로 <b>공전</b>해요. 그래서 한밤중에 향하는 쪽이 달라져 계절마다 다른 별자리가 보여요.',
          },
        ],
      },
      /* ---------- 3단계 · 설명 ---------- */
      {
        title: '태양의 연주 운동', short: '연주 운동', icon: '☀️', phase: '설명',
        features: ['suntrack', 'noglare'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구가 공전하면 한밤중에 보는 별자리가 달라진다는 것을 알았어요.</div>' +
          '<p>그럼 지구에서 <b>태양</b>을 볼 때, 태양 뒤쪽의 별자리는 어떻게 바뀔까요? 낮에는 별이 보이지 않지만 <b>[☀️ 햇빛 가리기]</b>로 태양 뒤의 별자리를 확인해 봐요. (실제로는 볼 수 없는 모습이에요)</p>',
        setup() { resetState({ month: 1, scene: 'space', noon: true }); S.walk = { visited: [], fwd: 0, last: null, b0: 0 }; },
        recap: '지구가 공전해서 태양은 별자리 사이를 서쪽에서 동쪽으로 옮겨 가요. 한밤중 남쪽 별자리는 태양이 있는 별자리의 정반대예요.',
        summary: '<div class="note-fig">' + FIG.sep + '</div><ul><li>지구가 공전하면 태양이 별자리 사이를 <b>서→동</b>으로 하루 약 1°씩, 1년에 한 바퀴 옮겨 가는 것처럼 보여요. 이것이 <b>연주 운동</b>이에요.</li>' +
          '<li>태양이 지나는 길을 <b>황도</b>, 황도 위의 12개 별자리를 <b>황도 12궁</b>이라고 해요.</li>' +
          '<li>한밤중 남쪽 하늘의 별자리는 태양이 있는 별자리의 <b>정반대</b>(6개월 차이)예요.</li><li>※ 실제 별자리의 크기는 서로 달라요.</li></ul>',
        missions: [
          {
            title: '☀️ 태양의 길 따라가기',
            goal: '지구를 <b>공전 방향(반시계)</b>으로 <b>3달 이상</b> 움직이며 태양이 지나는 별자리를 <b>3개</b> 이상 확인해요. [☀️ 햇빛 가리기]도 켜 보세요.',
            hint: '[▶ 공전 재생]을 3~4초 눌러 두면 태양 모양이 별자리 사이를 옮겨 가요. 시계 방향으로 돌리면 진행되지 않아요.',
            setup() { resetState({ month: 1, scene: 'space', noon: true, walk: true }); S.walk = { visited: [], fwd: 0, last: null, b0: norm360(S.th + 180) }; S.walk.visited.push(slotOf(S.walk.b0)); },
            check: () => S.walk.fwd >= 90 && S.walk.visited.length >= 3,
            hold: 0.5,
            status: () => '태양이 지나간 별자리: <b>' + (S.walk.visited.map((i) => ZODS[i].name.replace('자리', '')).join(' · ') || '-') + '</b> (' + S.walk.visited.length + '개)<br>' + chk(S.walk.fwd >= 90, '공전 방향으로 3달 이상 (' + Math.min(3, Math.floor(S.walk.fwd / 30)) + '/3달)'),
            explain: '지구가 공전하는 동안 태양은 별자리 사이를 <b>서쪽에서 동쪽</b>으로 옮겨 가는 것처럼 보여요. 이 움직임이 <b>연주 운동</b>이에요. 태양이 지나는 길이 <b>황도</b>이고, 황도 위의 12개 별자리가 <b>황도 12궁</b>이에요.',
          },
          {
            type: 'quiz',
            title: '🌅 별자리 사이의 태양',
            goal: '별자리를 배경으로 한 <b>태양의 위치</b>는 어떻게 움직이는 것처럼 보일까요?',
            setup() { resetState({ month: 1, scene: 'space', noon: true }); },
            choices: ['서쪽에서 동쪽으로 하루 약 1°씩', '동쪽에서 서쪽으로 1시간에 15°씩', '서쪽에서 동쪽으로 1시간에 15°씩', '별자리 사이에서 움직이지 않는다'],
            answer: 0,
            feedback: [
              '',
              '동→서로 1시간에 15°는 지구 자전 때문에 하루 동안 해가 지나가는 일주 운동(앞 차시)이에요. 별자리 사이의 이동은 훨씬 느리고 방향도 반대예요.',
              '서→동 방향은 맞지만, 1시간에 15°는 일주 운동의 빠르기예요. 공전에 의한 이동은 하루에 약 1°예요.',
              '태양은 한 달에 약 30°씩, 1년에 한 바퀴 별자리 사이를 옮겨 가요. 앞 미션에서 태양이 움직였죠?',
            ],
            explain: '지구의 공전 때문에 태양은 별자리 사이를 <b>서→동</b>으로 하루에 약 1°씩, 1년에 한 바퀴 도는 것처럼 보여요. (15°/시간은 하루 동안의 일주 운동이에요.)',
          },
          {
            type: 'quiz',
            title: '🌃 사자자리를 지나는 태양',
            goal: '그림은 9월의 지구예요. 태양이 <b>사자자리</b>를 지나고 있을 때, <b>한밤중</b> 남쪽 하늘(? 쪽)에는 어떤 별자리가 보일까요?',
            figure: FIG.sep,
            setup() { resetState({ month: 9, scene: 'space', noon: true }); },
            choices: ['물병자리', '사자자리', '처녀자리', '게자리'],
            answer: 0,
            feedback: [
              '',
              '사자자리는 태양과 같은 방향에 있어서 낮에 떠 있어요. 한밤중에는 볼 수 없어요.',
              '처녀자리는 사자자리 바로 옆이라 태양과 가까운 쪽이에요. 한밤중 남쪽은 태양의 반대쪽이에요.',
              '게자리도 태양과 가까운 쪽(낮)이에요. 태양의 반대쪽을 찾아봐요.',
            ],
            explain: '한밤중 남쪽에 보이는 별자리는 태양이 있는 별자리의 <b>정반대</b>(6개월 차이)예요. 태양이 사자자리를 지나는 9월에는 반대쪽의 <b>물병자리</b>가 한밤중 남쪽에 보여요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '밤하늘 관측 계획', short: '관측 계획', icon: '📋', phase: '적용',
        features: ['planner'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한밤중 남쪽 별자리는 태양이 있는 별자리의 정반대라는 것을 알았어요.</div>' +
          '<p>이제 <b>내가 직접 밤하늘을 관측할 계획</b>을 세워 봐요. 생일 달 한밤중에 볼 별자리를 찾아 <b>관측 카드</b>를 만들어요. 🌠</p>',
        setup() { resetState({ month: 5, scene: 'space', plan: true }); S.plan.card = 0; SciSim.tween(S.plan, { card: 1 }, { duration: 0.6, ease: 'outCubic' }); },
        recap: '한밤중에 볼 수 있는 별자리는 태양이 있는 별자리의 반대쪽이에요. 별자리는 늘 그 자리에 있고, 보이는 방향이 달라질 뿐이에요.',
        summary: '<ul><li>📋 <b>관측 카드</b>: 날짜(월) → 그 달 태양이 있는 별자리 → <b>정반대</b> 별자리 = 한밤중 남쪽에 보이는 별자리</li>' +
          '<li>6개월 뒤에는 한밤중 남쪽 별자리가 <b>정반대</b>로 바뀌어요.</li><li>별자리는 사라지지 않고 늘 그 자리에 있어요. 태양과 같은 쪽이면 낮에 떠 있어 볼 수 없어요.</li>' +
          '<li>🔭 천체 관측 앱으로 <b>오늘 밤하늘</b>을 확인해 보세요!</li></ul>',
        missions: [
          {
            title: '🎂 내 생일 달의 밤하늘',
            manual: true,
            goal: '[📅 월]로 <b>생일 달</b>을 고르고, 그 달 <b>한밤중</b>에 볼 수 있는 별자리를 바깥 고리에서 눌러요. 다 고르면 [✔ 확인하기]를 눌러 관측 카드를 완성해요.',
            hint: '청록 점선이 닿는 별자리가 한밤중에 보여요. 태양과 같은 쪽(주황 점선)은 낮이라 보이지 않아요.',
            setup() { resetState({ month: 5, scene: 'space', plan: true }); S.plan.card = 0; SciSim.tween(S.plan, { card: 1 }, { duration: 0.6, ease: 'outCubic' }); },
            check: () => {
              if (S.plan.sel < 0) return '바깥 고리에서 한밤중에 볼 별자리를 눌러 보세요.';
              const th = norm360(S.th), want = slotOf(th), sunSlot = slotOf(norm360(th + 180)), sel = S.plan.sel, ori = ZODS.length - 1;
              const orionMid = Math.abs(sdiff(ORION_DEF.ang, th)) <= 22, orionSun = Math.abs(sdiff(ORION_DEF.ang, th + 180)) <= 22;
              if (sel === want || (sel === ori && orionMid)) return true;
              if (sel === sunSlot || (sel === ori && orionSun)) return '태양과 같은 쪽은 낮이에요. 한밤중 시선(청록 점선)이 닿는 별자리를 골라요.';
              return '한밤중 시선(청록 점선)이 닿는 별자리를 눌러야 해요.';
            },
            status: () => '고른 달: <b>' + monthBits(S.th).mi + '월</b> · ' + chk(S.plan.sel >= 0, S.plan.sel >= 0 ? ZODS[S.plan.sel].name : '별자리 고르기'),
            explain: '한밤중에 볼 수 있는 별자리는 태양이 있는 별자리의 <b>반대쪽</b>이에요. 완성한 관측 카드를 들고 천체 관측 앱으로 확인해 봐요!',
          },
          {
            type: 'quiz',
            title: '📆 6개월 뒤',
            goal: '오늘 한밤중 남쪽 하늘에 <b>사자자리</b>가 보여요(3월). <b>6개월 뒤</b> 같은 시각에는 어떤 별자리가 남쪽 하늘에 보일까요?',
            figure: FIG.six,
            setup() { resetState({ month: 3, scene: 'space' }); },
            choices: ['물병자리', '사자자리', '처녀자리', '아무것도 보이지 않는다'],
            answer: 0,
            feedback: [
              '',
              '6개월 뒤에는 지구가 궤도의 반대쪽으로 가요. 그때 사자자리는 태양과 같은 쪽이라 낮에 떠 있어요.',
              '처녀자리는 사자자리 바로 옆이라 한 달 뒤쯤이에요. 6개월 뒤에는 정반대 별자리가 보여요.',
              '별자리는 사라지지 않아요. 6개월 뒤에는 정반대쪽 물병자리가 한밤중 남쪽에 보여요.',
            ],
            explain: '지구가 6개월 동안 반 바퀴(180°) 공전하므로 한밤중 남쪽 별자리도 정반대인 <b>물병자리</b>로 바뀌어요.',
          },
          {
            type: 'quiz',
            title: '🔭 여름엔 오리온이 어디에?',
            goal: '겨울 밤하늘의 오리온자리가 <b>여름밤</b>에는 보이지 않는 까닭은 무엇일까요?',
            setup() { resetState({ month: 7, scene: 'space' }); },
            choices: ['여름에는 태양과 같은 방향에 있어 낮에 떠 있기 때문', '여름에는 사라졌다가 겨울에 다시 생기기 때문', '여름에는 지구에서 멀어지기 때문', '여름밤에는 구름이 많기 때문'],
            answer: 0,
            feedback: [
              '',
              '별자리는 사라지지 않고 늘 그 자리에 있어요. 우리가 바라보는 방향이 달라질 뿐이에요.',
              '별자리까지의 거리는 거의 변하지 않아요. 까닭은 보이는 방향이 달라지기 때문이에요.',
              '구름은 날씨 때문이에요. 여름의 맑은 밤에도 오리온자리는 보이지 않아요.',
            ],
            explain: '여름에는 태양이 오리온자리와 같은 쪽에 있어서 오리온자리가 낮에 떠 있어 볼 수 없어요. 별자리는 늘 그 자리에 있어요. <b>천체 관측 앱</b>으로 오늘 밤하늘도 찾아보며 하늘에 호기심을 가져 봐요!',
          },
        ],
      },
    ],
  });

  /* =========================================================
     움직임
     ========================================================= */
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#070d1f' });
    L.starsStrip = makeStars(L.strip, 26, k === 'wide' ? 3 : 5);
    L.starsCbox = makeStars(L.cbox, 22, k === 'wide' ? 17 : 19);
    L.starsSpace = makeStars(L.space, 80, k === 'wide' ? 23 : 29);
    const V = { v, L, fx: [], P: new SciSim.Particles() };
    attachPointer(V);
    return V;
  });
  const activeView = () => views.find((V) => V.v.canvas.offsetWidth > 0) || views[0];
  S.cmpA = 0;
  function update(dt, t) {
    if (S.playing) {
      S.th += dt * 25; S.hint = false; syncSlider();
    }
    crit(S, 'thA', S.th, dt, 14);
    S.glareA = approach(S.glareA, S.glare ? 1 : 0, dt, 4);
    S.cmpA = approach(S.cmpA, S.cmp ? 1 : 0, dt, 5);
    S.noonA = approach(S.noonA, S.noonT, dt, RM ? 60 : 1.8);
    const mb = monthBits(S.thA);
    if (mb.mi !== S.monthShown) { S.monthShown = mb.mi; S.bounce = 1; if (S.scene === 'space' || S.playing || S.drag) Sound.tick(); }
    S.bounce = approach(S.bounce, 0, dt, 4.5);
    const settled = Math.abs(S.th - S.thA) < 0.6 && !S.drag && !S.playing;
    // ① 네 계절 살펴보기 (0.5초 멈춰 보기)
    if (S.seasonOn && settled && S.scene === 'sky' && game && game.phase === 'active') {
      const sea = seasonOf(monthBits(S.th).mi);
      if (sea === S.dwellS) {
        S.dwellT += dt;
        if (S.dwellT >= 0.5 && !S.seasons[sea]) {
          S.seasons[sea] = true; Sound.tone(880, 0.12, 'triangle', 0.08);
          const V = activeView(); ringFx(V, V.L.strip.x + (V.L.col ? 112 : 190) * V.L.fs, V.L.strip.y + (V.L.col ? 104 : 52) * V.L.fs, 18, SEASON[sea].col);
        }
      } else { S.dwellS = sea; S.dwellT = 0; }
    } else S.dwellT = 0;
    // ① 한 달 뒤로 옮기기 (비교 모드)
    if (S.cmpOn) {
      const cur = monthBits(S.th).mi;
      if (cur !== S.lastInt) { if (cur === (S.lastInt % 12) + 1 && S.cmp) S.cmpMoves++; S.lastInt = cur; }
    }
    // ② 시선이 쌍둥이자리 → 궁수자리에 닿게
    if (S.reachOn && S.scene === 'space') {
      if (!S.reached.gem && Math.abs(sdiff(S.thA, 180)) < 12) { S.reached.gem = true; Sound.tone(880, 0.12, 'triangle', 0.08); const V = activeView(), G = spaceGeo(V.L); zodPos(G, BYKEY.gem, _z); ringFx(V, _z.x, _z.y, 30, '#34d399'); }
      else if (S.reached.gem && !S.reached.sgr && Math.abs(sdiff(S.thA, 0)) < 12) { S.reached.sgr = true; Sound.tone(880, 0.12, 'triangle', 0.08); const V = activeView(), G = spaceGeo(V.L); zodPos(G, BYKEY.sgr, _z); ringFx(V, _z.x, _z.y, 30, '#34d399'); }
    }
    // ③ 태양의 길: 공전 방향으로 간 만큼만 쌓아요 (거꾸로는 진행으로 치지 않아요)
    if (S.walkOn && S.scene === 'space') {
      const b = norm360(S.thA + 180), w = S.walk;
      if (w.last == null) w.last = b;
      const d = sdiff(b, w.last); w.last = b;
      if (d > 0 && d < 40) w.fwd += d;
      if (w.fwd > 0) { const idx = slotOf(w.b0 + w.fwd); if (w.visited.indexOf(idx) < 0) { w.visited.push(idx); Sound.tone(660 + 60 * w.visited.length, 0.08, 'triangle', 0.06); } }
    }
    // ④ 관측 카드 완성
    if (S.plan.mode && game && game.phase === 'success' && !S.plan.made) {
      S.plan.made = true; Sound.tone(880, 0.12, 'triangle', 0.08);
      const V = activeView(), G = spaceGeo(V.L); if (S.plan.sel >= 0) { zodPos(G, ZODS[S.plan.sel], _z); V.P.burst(_z.x, _z.y, { count: 16, colors: ['#5eead4', '#fde68a', '#ffffff'], speed: 130, gravity: 40, size: 3 }); }
    }
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) V.P.update(dt); });
  }
  let frameMs = 0;
  S.lastInt = 1; S.monthShown = 1;
  setMonth(1, true);
  syncControls();
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    frameMs += (performance.now() - t0 - frameMs) * 0.05;
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, FIG, ZODS, BYKEY, frameMs: () => frameMs, game: () => game, view: activeView,
    client(L, x, y) { const V = views.find((q) => q.L === L) || activeView(); const r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    earthClient(f) { const V = activeView(), G = spaceGeo(V.L); ringXY(G, S.thA, G.orb * (f == null ? 1 : f), _e); return this.client(V.L, _e.x, _e.y); },
    orbitClient(angDeg) { const V = activeView(), G = spaceGeo(V.L); ringXY(G, angDeg, G.orb, _e); return this.client(V.L, _e.x, _e.y); },
    zodClient(key) { const V = activeView(), G = spaceGeo(V.L); zodPos(G, BYKEY[key], _z); return this.client(V.L, _z.x, _z.y); },
    setMonth, setScene, resetState, monthBits, monthF, thOfMonth, midLst, altaz, sunEq, syncSlider, norm360, slotOf,
  };
})();
