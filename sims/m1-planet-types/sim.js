/* =========================================================
   중1 Ⅶ. 태양계 - 지구형 행성과 목성형 행성  [9과07-01 뒷부분]
   탐구 흐름(4단계):
   ① 관찰: 망원경으로 목성·토성·화성을 초점 맞춰 관측하고, 목성 둘레 네 점이 밤마다 움직이는 것을 기록
   ② 분석: 행성 8개의 반지름·평균 밀도 자료를 그래프에 찍고 두 무리로 묶기
   ③ 설명: 탐사선을 보내 지구형(단단한 암석 표면)과 목성형(기체, 단단한 표면 없음)을 비교, 고리 확인
   ④ 적용: 외계 행성 X 판정, 궤도 위치, 특징 표 완성
   비교 항목은 질량·반지름·평균 밀도·위성 수·고리·표면 상태만 다룹니다. (자세한 특징은 다루지 않아요)
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
     행성 자료 (NASA, 반올림) — 질량·반지름은 지구=1, 밀도 g/cm³, 위성 수는 2025년 무렵 기준
     ========================================================= */
  const PL = [
    { id: 'mercury', name: '수성', g: 't', R: 0.38, M: '0.055', rho: 5.43, moons: '0', moonsTxt: '0개', au: 0.39, col: '#a8a29a', ring: 0 },
    { id: 'venus', name: '금성', g: 't', R: 0.95, M: '0.82', rho: 5.24, moons: '0', moonsTxt: '0개', au: 0.72, col: '#e3bf78', ring: 0 },
    { id: 'earth', name: '지구', g: 't', R: 1, M: '1', rho: 5.51, moons: '1', moonsTxt: '1개', au: 1.0, col: '#2f6fc8', ring: 0 },
    { id: 'mars', name: '화성', g: 't', R: 0.53, M: '0.11', rho: 3.93, moons: '2', moonsTxt: '2개', au: 1.52, col: '#c8582f', ring: 0 },
    { id: 'jupiter', name: '목성', g: 'j', R: 11.2, M: '318', rho: 1.33, moons: '95+', moonsTxt: '95개 이상', au: 5.2, col: '#d6b088', ring: 1 },
    { id: 'saturn', name: '토성', g: 'j', R: 9.45, M: '95', rho: 0.69, moons: '270+', moonsTxt: '270개 이상', au: 9.58, col: '#e0c68c', ring: 2 },
    { id: 'uranus', name: '천왕성', g: 'j', R: 4.01, M: '14.5', rho: 1.27, moons: '28+', moonsTxt: '28개 이상', au: 19.2, col: '#94d8e2', ring: 1 },
    { id: 'neptune', name: '해왕성', g: 'j', R: 3.88, M: '17.1', rho: 1.64, moons: '16', moonsTxt: '16개', au: 30.1, col: '#4a6fe0', ring: 1 },
  ];
  const PI = {}; PL.forEach((p, i) => { p.i = i; PI[p.id] = p; });
  const GROUP = { t: { name: '지구형 행성', short: '지구형', col: '#fb923c', soft: 'rgba(251,146,60,.2)', ink: '#ffd2a8' }, j: { name: '목성형 행성', short: '목성형', col: '#60a5fa', soft: 'rgba(96,165,250,.2)', ink: '#bfd9ff' } };
  // 갈릴레이 위성: 주기(일), 최대 이각(목성 반지름) — 화면에서는 보기 좋게 압축해서 그려요
  const GAL = [
    { id: 'io', name: '이오', P: 1.77, a: 5.9, amp: 86, col: '#ffe27a', ph: 0.31 },
    { id: 'europa', name: '유로파', P: 3.55, a: 9.4, amp: 113, col: '#f4efe2', ph: 0.72 },
    { id: 'ganymede', name: '가니메데', P: 7.15, a: 15.0, amp: 141, col: '#d2c6b2', ph: 0.18 },
    { id: 'callisto', name: '칼리스토', P: 16.7, a: 26.4, amp: 172, col: '#a79b8c', ph: 0.53 },
  ];
  const galX = (m, day) => m.amp * Math.sin(TAU * (day + m.ph * m.P) / m.P);
  const galZ = (m, day) => Math.cos(TAU * (day + m.ph * m.P) / m.P);
  // 망원경 초점이 가장 선명한 눈금 (0~100)
  const FOCUS_AT = { jupiter: 63, saturn: 28, mars: 81, venus: 45 };
  const SKY = [  // 해 진 뒤 하늘의 밝은 점 (패널 안 비율 좌표)
    { id: 'venus', name: '금성', x: 0.2, y: 0.6, s: 5.2, col: '#fff6d8' },
    { id: 'mars', name: '화성', x: 0.4, y: 0.36, s: 3.4, col: '#ffb08a' },
    { id: 'jupiter', name: '목성', x: 0.66, y: 0.24, s: 4.4, col: '#fff1d6' },
    { id: 'saturn', name: '토성', x: 0.84, y: 0.44, s: 3.4, col: '#ffe9b8' },
  ];
  const SKY_BY = {}; SKY.forEach((s) => { SKY_BY[s.id] = s; });
  const SCOPE_NOTE = {
    jupiter: '띠 무늬와 대적점, 곁의 밝은 점 네 개',
    saturn: '기울어진 뚜렷한 고리',
    mars: '붉은 원반과 하얀 극관',
    venus: '밝고 매끈한 원반',
  };

  /* =========================================================
     무늬 잡음 + 구 그림(스프라이트) — 망원경 시야용
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
  const hexRGB = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  function ramp(stops, s) {   // stops: [[pos, [r,g,b]], ...]
    if (s <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (s <= stops[i][0]) {
        const a = stops[i - 1], b = stops[i], u = (s - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * u, a[1][1] + (b[1][1] - a[1][1]) * u, a[1][2] + (b[1][2] - a[1][2]) * u];
      }
    }
    return stops[stops.length - 1][1];
  }
  const JUP_RAMP = [[-1, '#8a6a4e'], [-0.8, '#c9a27a'], [-0.62, '#946040'], [-0.46, '#efdcbf'], [-0.3, '#a8683e'], [-0.14, '#f2e2c6'], [0.02, '#d49a6a'], [0.18, '#f0dec0'], [0.34, '#b4784c'], [0.52, '#ecd5b0'], [0.7, '#b98a62'], [0.88, '#d9bc98'], [1, '#8a6a4e']].map((p) => [p[0], hexRGB(p[1])]);
  const SAT_RAMP = [[-1, '#b9a273'], [-0.7, '#d8c08a'], [-0.45, '#f0e0b8'], [-0.2, '#dcc58f'], [0.05, '#f2e4bd'], [0.3, '#d6bd86'], [0.55, '#ecd9a8'], [0.8, '#cfb57f'], [1, '#a99468']].map((p) => [p[0], hexRGB(p[1])]);
  const LIGHT = (function () { const l = [-0.5, -0.58, 0.64], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
  // 구 표면을 픽셀 단위로 칠해 캔버스에 담기. fn(lon, lat, x, y, z) -> [r,g,b]
  function sphereCanvas(size, Rpx, fn, o) {
    o = o || {};
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const g = cv.getContext('2d'), img = g.createImageData(size, size), d = img.data, c = size / 2;
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = (i + 0.5 - c) / Rpx, y = (j + 0.5 - c) / Rpx, r2 = x * x + y * y;
        if (r2 > 1.0 + 2.2 / Rpx) continue;
        const edge = clamp((1 - Math.sqrt(r2)) * Rpx + 0.5, 0, 1);
        const z = Math.sqrt(Math.max(0, 1 - r2));
        const lat = Math.asin(clamp(-y, -1, 1)), lon = Math.atan2(x, z);
        const col = fn(lon, lat, x, y, z);
        let lam = Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]);
        const sh = (o.amb != null ? o.amb : 0.1) + (1 - (o.amb != null ? o.amb : 0.1)) * Math.pow(lam, o.gam || 0.8);
        const ld = (o.limb != null ? o.limb : 0.5) + (1 - (o.limb != null ? o.limb : 0.5)) * Math.pow(z, 0.6);
        const spec = (o.spec || 0.05) * Math.pow(lam, 28);
        const k = (j * size + i) * 4, f = sh * ld;
        d[k] = clamp(col[0] * f + 255 * spec, 0, 255); d[k + 1] = clamp(col[1] * f + 255 * spec, 0, 255); d[k + 2] = clamp(col[2] * f + 255 * spec, 0, 255);
        d[k + 3] = 255 * edge;
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }
  const SPU = 2.6;   // 스프라이트 해상도 (정규화 단위 1당 픽셀)
  const SPR = {};
  function scopeSprite(id) {
    if (SPR[id]) return SPR[id];
    let out;
    if (id === 'jupiter') {
      const Ru = 50, half = 62, size = Math.round(half * 2 * SPU);
      const cv = sphereCanvas(size, Ru * SPU, (lon, lat) => {
        const s = lat / (Math.PI / 2);
        const turb = (fbm(lon * 2.2 + 3, s * 7, 5, 3) - 0.5) * 0.09 + (fbm(lon * 9, s * 26, 9, 2) - 0.5) * 0.02;
        let c = ramp(JUP_RAMP, s + turb).slice();
        const streak = 0.9 + 0.2 * fbm(lon * 7, s * 38, 13, 2);
        c = [c[0] * streak, c[1] * streak, c[2] * streak];
        // 대적점
        const dx = (lon - 0.46) / 0.3, dy = (s + 0.3) / 0.1, dd = dx * dx + dy * dy;
        if (dd < 1.9) {
          const u = clamp(1 - dd / 1.9, 0, 1), core = clamp(1 - dd / 0.8, 0, 1);
          const rc = [196, 85, 58], rim = [232, 170, 128];
          const m = Math.min(1, u * 2.2);
          const tgt = [rim[0] + (rc[0] - rim[0]) * core, rim[1] + (rc[1] - rim[1]) * core, rim[2] + (rc[2] - rim[2]) * core];
          c = [c[0] + (tgt[0] - c[0]) * m, c[1] + (tgt[1] - c[1]) * m, c[2] + (tgt[2] - c[2]) * m];
        }
        // 작은 흰 타원 소용돌이
        const ex = (lon + 0.9) / 0.1, ey = (s - 0.34) / 0.03; if (ex * ex + ey * ey < 1) c = [244, 236, 220];
        const fx = (lon - 0.1) / 0.07, fy = (s + 0.5) / 0.022; if (fx * fx + fy * fy < 1) c = [240, 232, 214];
        return c;
      }, { amb: 0.12, limb: 0.42, spec: 0.07 });
      out = { cv, Ru, half };
    } else if (id === 'saturn') {
      const Ru = 38, half = 100, size = Math.round(half * 2 * SPU);
      const cv = document.createElement('canvas'); cv.width = cv.height = size;
      const g = cv.getContext('2d'), c = size / 2, P = Ru * SPU;
      const body = sphereCanvas(Math.round((Ru + 6) * 2 * SPU), P, (lon, lat) => {
        const s = lat / (Math.PI / 2);
        const turb = (fbm(lon * 2 + 7, s * 8, 21, 3) - 0.5) * 0.05;
        const cc = ramp(SAT_RAMP, s + turb), st = 0.94 + 0.12 * fbm(lon * 6, s * 30, 3, 2);
        return [cc[0] * st, cc[1] * st, cc[2] * st];
      }, { amb: 0.14, limb: 0.5, spec: 0.04 });
      const tilt = 0.4, roll = -0.34, rin = 1.28 * P, rout = 2.3 * P;
      const ringPath = (a0, a1, rr, rr2) => {
        g.beginPath(); g.ellipse(c, c, rr, rr * tilt, roll, a0, a1, false); g.ellipse(c, c, rr2, rr2 * tilt, roll, a1, a0, true); g.closePath();
      };
      const ringBands = [[1.28, 1.52, 'rgba(150,130,100,.42)'], [1.52, 1.95, 'rgba(238,222,176,.92)'], [1.95, 2.03, 'rgba(24,18,12,.5)'], [2.03, 2.3, 'rgba(216,196,148,.78)']];
      const drawRing = (a0, a1) => ringBands.forEach((b) => { ringPath(a0, a1, b[0] * P, b[1] * P); g.fillStyle = b[2]; g.fill(); });
      // 뒤쪽 고리 → 행성 → 앞쪽 고리 (위쪽이 뒤)
      drawRing(Math.PI, TAU);
      // 행성이 고리에 드리우는 그림자
      g.save(); g.globalCompositeOperation = 'source-atop';
      const sg = g.createLinearGradient(c + P * 0.2, c - P * 0.9, c + P * 1.5, c - P * 0.2);
      sg.addColorStop(0, 'rgba(0,0,0,.0)'); sg.addColorStop(0.35, 'rgba(0,0,0,.5)'); sg.addColorStop(1, 'rgba(0,0,0,.05)');
      g.fillStyle = sg; g.beginPath(); g.ellipse(c + P * 0.95, c - P * 0.38, P * 1.1, P * 0.5, roll, 0, TAU); g.fill();
      g.restore();
      g.drawImage(body, c - body.width / 2, c - body.height / 2);
      // 고리가 행성에 드리우는 그림자 띠
      g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); g.arc(c, c, P * 0.995, 0, TAU); g.clip();
      g.fillStyle = 'rgba(30,22,10,.28)'; g.beginPath(); g.ellipse(c, c + P * 0.1, P * 1.1, P * 0.09, roll, 0, TAU); g.fill(); g.restore();
      drawRing(0, Math.PI);
      void rin; void rout;
      out = { cv, Ru, half };
    } else if (id === 'mars') {
      const Ru = 62, half = 70, size = Math.round(half * 2 * SPU);
      const cv = sphereCanvas(size, Ru * SPU, (lon, lat) => {
        const s = lat / (Math.PI / 2);
        let base = [196, 98, 58];
        const patch = fbm(lon * 2.4 + 2, lat * 3.2, 33, 4);
        const dark = clamp((patch - 0.5) * 3.2, 0, 1);
        base = [base[0] + (96 - base[0]) * dark * 0.7, base[1] + (46 - base[1]) * dark * 0.7, base[2] + (28 - base[2]) * dark * 0.7];
        const lite = fbm(lon * 5 + 8, lat * 5, 51, 3); base = [base[0] * (0.92 + 0.16 * lite), base[1] * (0.92 + 0.16 * lite), base[2] * (0.92 + 0.16 * lite)];
        const capEdge = 0.8 + (fbm(lon * 6, 2, 7, 2) - 0.5) * 0.08;
        if (s > capEdge) { const u = clamp((s - capEdge) / 0.06, 0, 1); base = [base[0] + (250 - base[0]) * u, base[1] + (248 - base[1]) * u, base[2] + (244 - base[2]) * u]; }
        if (s < -0.9) { const u = clamp((-s - 0.9) / 0.05, 0, 1) * 0.7; base = [base[0] + (240 - base[0]) * u, base[1] + (240 - base[1]) * u, base[2] + (240 - base[2]) * u]; }
        return base;
      }, { amb: 0.1, limb: 0.45, spec: 0.02 });
      out = { cv, Ru, half };
    } else { // venus
      const Ru = 52, half = 60, size = Math.round(half * 2 * SPU);
      const cv = sphereCanvas(size, Ru * SPU, (lon, lat) => {
        const sw = fbm(lon * 1.6 + lat * 1.2, lat * 5.5, 77, 4), sw2 = fbm(lon * 3 - lat * 2, lat * 11, 91, 3);
        const k = 0.9 + 0.16 * sw + 0.06 * sw2;
        return [248 * k, 232 * k, 188 * k];
      }, { amb: 0.14, limb: 0.55, spec: 0.03 });
      out = { cv, Ru, half };
    }
    return (SPR[id] = out);
  }

  // 한 번만 그려 두고 계속 쓰는 배경 그림 (큰 방사형 그라데이션을 매 프레임 칠하면 느려요)
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
     작은 행성 그림 (칩·궤도 그림용)
     ========================================================= */
  const BAND = {
    jupiter: [['#b98a62', -0.62, 0.16], ['#f0dbbd', -0.3, 0.16], ['#c08a5c', 0.02, 0.18], ['#f3e1c4', 0.34, 0.14], ['#b9845a', 0.62, 0.14]],
    saturn: [['#d2b67c', -0.55, 0.2], ['#f0dcae', -0.15, 0.2], ['#d8bd84', 0.25, 0.2], ['#eedaa8', 0.6, 0.16]],
  };
  // 둥근 행성 아이콘. o: {lx, ly (빛 쪽 단위벡터), rings (희미한 고리 표시), shadow}
  function miniPlanet(ctx, id, x, y, r, o) {
    o = o || {};
    const P = PI[id], lx = o.lx != null ? o.lx : -0.62, ly = o.ly != null ? o.ly : -0.78;
    const L = Math.hypot(lx, ly) || 1, ux = lx / L, uy = ly / L;
    if (o.shadow !== false && r > 5) {
      const sg = ctx.createRadialGradient(x, y + r * 0.62, r * 0.2, x, y + r * 0.62, r * 1.3);
      sg.addColorStop(0, 'rgba(0,0,0,.32)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x, y + r * 0.62, r * 1.3, r * 0.62, 0, 0, TAU); ctx.fill();
    }
    const ringTilt = -0.34;
    const ringDraw = (front, strong) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ringTilt); ctx.scale(1, 0.36);
      const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : TAU;
      if (strong) {
        [[1.35, 1.62, 'rgba(160,140,108,.55)'], [1.62, 2.05, 'rgba(240,224,180,.92)'], [2.1, 2.34, 'rgba(218,198,150,.8)']].forEach((b) => {
          ctx.beginPath(); ctx.arc(0, 0, r * b[1], a0, a1, false); ctx.arc(0, 0, r * b[0], a1, a0, true); ctx.closePath(); ctx.fillStyle = b[2]; ctx.fill();
        });
      } else {
        ctx.strokeStyle = 'rgba(200,215,240,.5)'; ctx.lineWidth = Math.max(0.8, r * 0.07) / 0.36 * 0.36;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.55, a0, a1); ctx.stroke();
      }
      ctx.restore();
    };
    const wantRing = id === 'saturn' || (o.rings && P.ring === 1);
    if (wantRing) ringDraw(false, id === 'saturn');
    // 대기 빛무리
    if (r > 6 && (id === 'earth' || id === 'venus' || id === 'mars' || id === 'uranus' || id === 'neptune')) {
      const ac = { earth: '#8cc4ff', venus: '#ffe1a6', mars: '#ffb08a', uranus: '#c9f6fa', neptune: '#9db4ff' }[id];
      const ag = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.45);
      ag.addColorStop(0, rgba(ac, 0.4)); ag.addColorStop(1, rgba(ac, 0));
      ctx.fillStyle = ag; circle(ctx, x, y, r * 1.45); ctx.fill();
    }
    const g = ctx.createRadialGradient(x + ux * r * 0.4, y + uy * r * 0.4, r * 0.05, x, y, r * 1.04);
    g.addColorStop(0, shade(P.col, 0.5)); g.addColorStop(0.5, P.col); g.addColorStop(1, shade(P.col, -0.5));
    ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
    if (r > 6) {
      ctx.save(); circle(ctx, x, y, r); ctx.clip();
      const bands = BAND[id];
      if (bands) bands.forEach((b) => { ctx.fillStyle = b[0]; ctx.globalAlpha = 0.7; ctx.fillRect(x - r, y + b[1] * r - b[2] * r / 2, r * 2, b[2] * r); });
      ctx.globalAlpha = 1;
      if (id === 'earth') {
        ctx.fillStyle = '#4aa35a'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.15, r * 0.34, r * 0.24, -0.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + r * 0.35, y + r * 0.3, r * 0.26, r * 0.2, 0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x + r * 0.1, y - r * 0.5, r * 0.4, r * 0.08, 0.1, 0, TAU); ctx.fill();
      } else if (id === 'mars') {
        ctx.fillStyle = 'rgba(110,44,22,.5)'; ctx.beginPath(); ctx.ellipse(x - r * 0.1, y + r * 0.1, r * 0.4, r * 0.2, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.92, r * 0.4, r * 0.14, 0, 0, TAU); ctx.fill();
      } else if (id === 'mercury') {
        ctx.fillStyle = 'rgba(40,34,28,.26)'; [[-0.3, -0.2, 0.2], [0.3, 0.25, 0.16], [0.1, -0.45, 0.12]].forEach((c) => { circle(ctx, x + c[0] * r, y + c[1] * r, c[2] * r); ctx.fill(); });
      } else if (id === 'venus') {
        ctx.globalAlpha = 0.4; ctx.fillStyle = '#fff3d0'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.2, r * 1.1, r * 0.16, 0.15, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      } else if (id === 'uranus' || id === 'neptune') {
        ctx.globalAlpha = 0.2; ctx.fillStyle = '#fff'; [-0.4, 0.05, 0.45].forEach((b) => ctx.fillRect(x - r, y + b * r - r * 0.05, r * 2, r * 0.1)); ctx.globalAlpha = 1;
      }
      // 태양 반대쪽 명암
      const ng = ctx.createLinearGradient(x + ux * r * 0.2, y + uy * r * 0.2, x - ux * r, y - uy * r);
      ng.addColorStop(0, 'rgba(2,5,16,0)'); ng.addColorStop(0.4, 'rgba(2,5,16,.62)'); ng.addColorStop(1, 'rgba(2,5,16,.86)');
      ctx.fillStyle = ng; ctx.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(x + ux * r * 0.45, y + uy * r * 0.45, r * 0.24, r * 0.14, Math.atan2(uy, ux) + Math.PI / 2, 0, TAU); ctx.fill();
    }
    if (wantRing) ringDraw(true, id === 'saturn');
  }
  // 칩·꼬리표용 행성 색 (그룹 색 테두리)
  function groupCol(g) { return GROUP[g].col; }

  /* =========================================================
     상태
     ========================================================= */
  const S = {
    scene: 'scope', sceneA: 1,
    // 망원경
    sel: 'jupiter', slew: null, scopeAng: -1.0, eyeA: 1, focus: 12, held: 0, got: {}, night: 0, nightsJ: 0, tDay: 0, rec: [], recSlide: 1, ghost: null, scopeHint: true, focusFlash: 0,
    // 그래프
    chips: [], colors: {}, groupsOk: false, ellA: 0, ellOpen: false, tipMsg: null, graphLook: 'all',
    // 탐사선
    probeSel: 'earth', probe: null, probed: {}, probedAny: false,
    // 표
    tags: [],
    // 궤도
    orbitT: 0, belt: 0,
    // 외계 행성 X
    showX: false, xA: 0,
    flash: null,
  };
  let FEAT = new Set();
  const on = (f) => FEAT.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);
  const isFree = () => !!(game && game.free);
  const shown = (f) => isFree() || on(f);

  /* =========================================================
     화면 배치: wide(태블릿) 800×600 / tall(휴대폰) 520×846
     ========================================================= */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 600, fs: 1, col: true },
    tall: { key: 'tall', vw: 520, vh: 846, fs: 1.2, col: false },
  };
  function scopeGeo(L) {
    if (L.col) return { sky: { x: 8, y: 8, w: 292, h: 584 }, eyeP: { x: 308, y: 8, w: 484, h: 584 }, cx: 550, cy: 234, r: 188, info: { x: 320, y: 454, w: 460, h: 130 }, rows: 4 };
    return { sky: { x: 8, y: 8, w: 504, h: 300 }, eyeP: { x: 8, y: 316, w: 504, h: 522 }, cx: 260, cy: 486, r: 148, info: { x: 20, y: 656, w: 480, h: 174 }, rows: 5 };
  }
  function skyPos(L, id) {
    const G = scopeGeo(L), P = G.sky, s = SKY_BY[id];
    return { x: P.x + s.x * P.w, y: P.y + 34 * L.fs + s.y * (P.h * 0.74 - 34 * L.fs) };
  }
  function skyPivot(L) {
    const P = scopeGeo(L).sky;
    return { x: P.x + P.w * (L.col ? 0.5 : 0.5), y: P.y + P.h * (L.col ? 0.87 : 0.84) };
  }
  function aimAngle(L, id) {
    const a = skyPos(L, id), p = skyPivot(L);
    return Math.atan2(a.y - p.y, a.x - p.x);
  }
  // 하늘 점 → 망원경이 향하는 각도 (두 배치가 달라도 같은 각으로 쓰기 위해 활성 배치 기준으로 저장)
  let ACTIVE_L = LAYOUTS.wide;

  /* =========================================================
     흐림(초점이 안 맞음) 그리기: 작게 줄였다가 키우기
     ========================================================= */
  const BLUR_A = document.createElement('canvas'), BLUR_B = document.createElement('canvas');
  BLUR_A.width = BLUR_A.height = 560; BLUR_B.width = BLUR_B.height = 360;
  const bA = BLUR_A.getContext('2d'), bB = BLUR_B.getContext('2d');
  bA.imageSmoothingQuality = 'high'; bB.imageSmoothingQuality = 'high';
  function blitBlur(ctx, spr, dx, dy, dw, dh, blur) {
    if (blur < 0.35) { ctx.drawImage(spr, dx, dy, dw, dh); return; }
    const sw = spr.width, sh = spr.height, k = 1 + blur * (sw / dw) * 0.5;
    const w1 = Math.max(8, Math.round(sw / k)), h1 = Math.max(8, Math.round(sh / k));
    const w2 = Math.max(6, Math.round(w1 / 1.6)), h2 = Math.max(6, Math.round(h1 / 1.6));
    bA.clearRect(0, 0, w1 + 1, h1 + 1); bA.drawImage(spr, 0, 0, sw, sh, 0, 0, w1, h1);
    bB.clearRect(0, 0, w2 + 1, h2 + 1); bB.drawImage(BLUR_A, 0, 0, w1, h1, 0, 0, w2, h2);
    ctx.drawImage(BLUR_B, 0, 0, w2, h2, dx, dy, dw, dh);
  }
  const blurOf = (err) => Math.min(14, err * 0.2);
  const focusErr = () => Math.abs(S.focus - (FOCUS_AT[S.sel] != null ? FOCUS_AT[S.sel] : 50));
  const FOCUS_OK = 10;

  /* =========================================================
     1단계: 해 진 뒤 하늘 + 망원경
     ========================================================= */
  function drawTelescope(ctx, L, t) {
    const p = skyPivot(L), ang = curAim(L), fs = L.col ? 1 : 0.85;
    const legs = [[-34, 0], [34, 0], [0, 12]];
    ctx.save();
    // 삼각대
    ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 4.5 * fs; ctx.lineCap = 'round';
    legs.forEach((l) => { ctx.beginPath(); ctx.moveTo(p.x, p.y + 4); ctx.lineTo(p.x + l[0] * fs, p.y + 52 * fs + l[1]); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(160,150,190,.35)'; ctx.lineWidth = 1.2;
    legs.forEach((l) => { ctx.beginPath(); ctx.moveTo(p.x - 1, p.y + 3); ctx.lineTo(p.x + l[0] * fs - 1, p.y + 52 * fs + l[1]); ctx.stroke(); });
    ctx.translate(p.x, p.y); ctx.rotate(ang);
    const Lt = 104 * fs, W = 11 * fs;
    // 몸통
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    roundRect(ctx, -22 * fs, -W, Lt + 22 * fs, W * 2, 5 * fs);
    const tg = ctx.createLinearGradient(0, -W, 0, W);
    tg.addColorStop(0, '#e8edf7'); tg.addColorStop(0.4, '#aab4c8'); tg.addColorStop(1, '#4b566e');
    ctx.fillStyle = tg; ctx.fill();
    ctx.shadowColor = 'transparent';
    // 앞쪽 후드(그늘막)
    roundRect(ctx, Lt - 26 * fs, -W - 3 * fs, 32 * fs, (W + 3 * fs) * 2, 4 * fs);
    const hg = ctx.createLinearGradient(0, -W, 0, W); hg.addColorStop(0, '#6c7790'); hg.addColorStop(1, '#262d40');
    ctx.fillStyle = hg; ctx.fill();
    // 렌즈
    ctx.beginPath(); ctx.ellipse(Lt + 6 * fs, 0, 4 * fs, W + 1, 0, 0, TAU);
    const lg = ctx.createLinearGradient(Lt, -W, Lt + 10, W); lg.addColorStop(0, '#bfe3ff'); lg.addColorStop(1, '#3a6aa8');
    ctx.fillStyle = lg; ctx.fill();
    // 파인더
    roundRect(ctx, 14 * fs, -W - 13 * fs, 46 * fs, 8 * fs, 3 * fs); ctx.fillStyle = '#586179'; ctx.fill();
    ctx.fillStyle = '#394057'; ctx.fillRect(22 * fs, -W - 6 * fs, 3 * fs, 6 * fs); ctx.fillRect(46 * fs, -W - 6 * fs, 3 * fs, 6 * fs);
    // 접안부
    roundRect(ctx, -34 * fs, -4 * fs, 14 * fs, 8 * fs, 2 * fs); ctx.fillStyle = '#d9dff0'; ctx.fill();
    ctx.fillStyle = '#7b86a2'; ctx.fillRect(-27 * fs, -4 * fs, 2, 8 * fs);
    // 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-10 * fs, -W + 2 * fs, Lt - 40 * fs, 2 * fs);
    ctx.restore();
    // 받침 머리
    const hgd = ctx.createRadialGradient(p.x - 3, p.y - 3, 1, p.x, p.y, 11 * fs);
    hgd.addColorStop(0, '#d9dff0'); hgd.addColorStop(1, '#30384e');
    ctx.fillStyle = hgd; circle(ctx, p.x, p.y, 8.5 * fs); ctx.fill();
    // 시선 방향 점선
    const tipX = p.x + Math.cos(ang) * (Lt + 12 * fs), tipY = p.y + Math.sin(ang) * (Lt + 12 * fs);
    const tg2 = skyPos(L, S.aimTo);
    ctx.save(); ctx.setLineDash([3, 7]); ctx.strokeStyle = 'rgba(255,240,200,.35)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tg2.x, tg2.y); ctx.stroke(); ctx.restore();
  }
  function drawSky(ctx, L, t) {
    const G = scopeGeo(L), P = G.sky, fs = L.fs;
    ctx.save();
    roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.clip();
    const hy = P.y + P.h * 0.84;
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, '#050a1e'); g.addColorStop(0.42, '#13204a'); g.addColorStop(0.68, '#3f3774'); g.addColorStop(0.8, '#a4566e'); g.addColorStop(0.9, '#ee9a5e'); g.addColorStop(1, '#f4b36a');
    ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
    drawStars(ctx, L.starsSky, t, 0.85);
    // 지평선 노을 빛
    const hg = ctx.createRadialGradient(P.x + P.w * 0.3, hy, 4, P.x + P.w * 0.3, hy, P.w * 0.9);
    hg.addColorStop(0, 'rgba(255,190,110,.35)'); hg.addColorStop(1, 'rgba(255,150,90,0)');
    ctx.fillStyle = hg; ctx.fillRect(P.x, P.y, P.w, P.h);
    // 밝은 점 (행성)
    SKY.forEach((s) => {
      const q = skyPos(L, s.id), tw = RM ? 1 : 0.85 + 0.15 * Math.sin(t * 3 + s.x * 9);
      const sel = S.aimTo === s.id;
      const gg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s.s * 5.5);
      gg.addColorStop(0, rgba(s.col, 0.8 * tw)); gg.addColorStop(0.35, rgba(s.col, 0.22 * tw)); gg.addColorStop(1, rgba(s.col, 0));
      ctx.fillStyle = gg; circle(ctx, q.x, q.y, s.s * 5.5); ctx.fill();
      ctx.fillStyle = s.col; circle(ctx, q.x, q.y, s.s * tw * (L.col ? 1 : 1.1)); ctx.fill();
      ctx.strokeStyle = rgba(s.col, 0.4 * tw); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(q.x - s.s * 3.4, q.y); ctx.lineTo(q.x + s.s * 3.4, q.y); ctx.moveTo(q.x, q.y - s.s * 3.4); ctx.lineTo(q.x, q.y + s.s * 3.4); ctx.stroke();
      // 선택 고리 / 눌러 보라는 점선 고리
      if (sel) { ctx.strokeStyle = 'rgba(94,234,212,.95)'; ctx.lineWidth = 2.4; circle(ctx, q.x, q.y, 15 * fs + 1.5 * Math.sin(t * 5)); ctx.stroke(); }
      else if (S.scopeHint && !RM) { ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.3 * Math.sin(t * 4 + s.y * 7)) + ')'; ctx.lineWidth = 1.6; circle(ctx, q.x, q.y, 16 * fs + 2 * Math.sin(t * 4 + s.x * 5)); ctx.stroke(); ctx.setLineDash([]); }
      pill(ctx, s.name, q.x, q.y + 26 * fs, { font: fnt(L, 13, 'bold'), h: Math.round(20 * fs), pad: 8, bg: sel ? 'rgba(14,165,233,.85)' : 'rgba(6,10,26,.62)', color: '#fff' });
    });
    // 언덕 · 건물 실루엣
    const ridge = (base, amp, seed, col) => {
      const rr = rng(seed);
      ctx.beginPath(); ctx.moveTo(P.x, P.y + P.h);
      const n = 16; let pv = 0;
      for (let i = 0; i <= n; i++) { pv = lerp(pv, rr(), 0.7); const x = P.x + P.w * i / n, y = base - amp * Math.sin(i / n * Math.PI * 2.2 + seed) * 0.5 - pv * amp * 0.6; ctx.lineTo(x, y); }
      ctx.lineTo(P.x + P.w, P.y + P.h); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };
    ridge(hy + 6, 24 * fs, 3, '#3a2d52'); ridge(hy + 26 * fs, 22 * fs, 8, '#1b1530');
    // 도시 불빛
    const rr = rng(11);
    for (let i = 0; i < 14; i++) {
      const bx = P.x + 12 + rr() * (P.w - 24), bw = (7 + rr() * 8) * fs, bh = (12 + rr() * 22) * fs, by = hy + 22 * fs;
      ctx.fillStyle = '#120e22'; ctx.fillRect(bx, by - bh + 20 * fs, bw, bh);
      for (let k = 0; k < 3; k++) if (rr() < 0.7) { ctx.fillStyle = 'rgba(255,214,120,' + (0.5 + 0.3 * rr()) + ')'; ctx.fillRect(bx + 1.5 + rr() * (bw - 4), by - bh + 24 * fs + rr() * (bh - 8), 1.6 * fs, 2 * fs); }
    }
    drawTelescope(ctx, L, t);
    ctx.restore();
    // 글자
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('🌆 해 진 뒤의 하늘', P.x + 14, P.y + 26 * fs);
    if (S.scopeHint && !S.slew && on('scope')) pill(ctx, '👆 밝은 점을 눌러 보세요', L.col ? P.x + P.w / 2 : P.x + P.w - 12, L.col ? P.y + 52 * fs : P.y + 24 * fs, { align: L.col ? undefined : 'right', font: fnt(L, 13, 'bold'), h: Math.round(26 * fs), pad: 11, bg: 'rgba(14,165,233,.94)' });
    pill(ctx, '⚠️ 태양은 망원경으로 보지 않아요', L.col ? P.x + P.w / 2 : P.x + P.w - 14, P.y + P.h - 16 * fs, { align: L.col ? undefined : 'right', font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), pad: 10, bg: 'rgba(120,20,20,.82)', stroke: 'rgba(255,170,150,.6)', color: '#ffe4dc' });
    panelEdge(ctx, P);
  }

  /* ---- 접안렌즈 ---- */
  function drawEyeBody(ctx, id, cx, cy, k, t, err) {
    const sp = scopeSprite(id), bl = blurOf(err);
    const sh = RM ? 0 : (0.35 + bl * 0.12);
    const ox = (Math.sin(t * 1.7) * 0.9 + Math.sin(t * 4.3 + 1) * 0.5) * sh, oy = (Math.cos(t * 1.4) * 0.9 + Math.sin(t * 3.7) * 0.5) * sh;
    const wob = 1 + (RM ? 0 : Math.sin(t * 2.2) * 0.004 * (1 + bl * 0.2));
    const d = sp.half * 2 * k * wob;
    ctx.save();
    ctx.globalAlpha *= 1 / (1 + bl * 0.07);
    blitBlur(ctx, sp.cv, cx - d / 2 + ox * k, cy - d / 2 + oy * k, d, d, bl * k);
    ctx.restore();
  }
  function drawEyepiece(ctx, L, t) {
    const G = scopeGeo(L), E = G.eyeP, cx = G.cx, cy = G.cy, r = G.r, k = r / 200, fs = L.fs;
    panelBase(ctx, E, L.starsEye, t);
    const id = S.sel, err = focusErr(), bl = blurOf(err), inF = err <= FOCUS_OK;
    // 렌즈 안쪽 (배경은 미리 그려 둔 그림)
    ctx.drawImage(sprite('lensBg' + L.key, r * 2, r * 2, (g, w, h) => {
      g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, TAU); g.clip();
      const bg = g.createRadialGradient(w / 2 - r * 0.2, h / 2 - r * 0.25, 10, w / 2, h / 2, r);
      bg.addColorStop(0, '#0b1230'); bg.addColorStop(1, '#02040c'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    }), cx - r, cy - r, r * 2, r * 2);
    ctx.save();
    circle(ctx, cx, cy, r); ctx.clip();
    drawStars(ctx, L.starsLens, t, 0.8 / (1 + bl * 0.15));
    ctx.globalAlpha = clamp(S.eyeA, 0, 1);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    // 목성의 위성 (뒤 → 행성 → 앞)
    const front = [], back = [];
    if (id === 'jupiter') GAL.forEach((m) => { const x = galX(m, S.tDay), z = galZ(m, S.tDay); (z > 0 ? front : back).push({ m, x }); });
    const dot = (m, x, a) => {
      const rm = 4.4 + bl * 0.6, al = a / (1 + bl * 0.16);
      const gg = ctx.createRadialGradient(x, 0, 0, x, 0, rm * 2.6);
      gg.addColorStop(0, rgba(m.col, al)); gg.addColorStop(0.35, rgba(m.col, al * 0.6)); gg.addColorStop(1, rgba(m.col, 0));
      ctx.fillStyle = gg; circle(ctx, x, 0, rm * 2.6); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', al); circle(ctx, x, 0, rm * 0.62); ctx.fill();
    };
    if (id === 'jupiter') {
      // 지난밤 위치 (희미한 점)
      if (S.ghost != null) GAL.forEach((m) => { const gx = galX(m, S.ghost); ctx.fillStyle = rgba(m.col, 0.28 / (1 + bl * 0.2)); circle(ctx, gx, 0, 2.8); ctx.fill(); });
      back.forEach((o) => { if (Math.abs(o.x) > 52) dot(o.m, o.x, 0.95); });
    }
    ctx.globalAlpha *= 1;
    ctx.save(); ctx.globalAlpha = clamp(S.eyeA, 0, 1); drawEyeBody(ctx, id, 0, 0, 1, t, err); ctx.restore();
    if (id === 'jupiter') front.forEach((o) => dot(o.m, o.x, 1));
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.restore();
    // 둘레 어둡게(비네팅) + 유리 반사 (미리 그려 둔 그림)
    ctx.drawImage(sprite('lensVig' + L.key, r * 2, r * 2, (g, w, h) => {
      g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, TAU); g.clip();
      const vg = g.createRadialGradient(w / 2, h / 2, r * 0.55, w / 2, h / 2, r * 1.02);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.8, 'rgba(0,0,0,.45)'); vg.addColorStop(1, 'rgba(0,0,0,.92)');
      g.fillStyle = vg; g.fillRect(0, 0, w, h);
      const lg = g.createLinearGradient(0, 0, w * 0.6, h * 0.6);
      lg.addColorStop(0, 'rgba(255,255,255,.10)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
    }), cx - r, cy - r, r * 2, r * 2);
    // 접안렌즈 테두리
    const rg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rg.addColorStop(0, '#e6ecfa'); rg.addColorStop(0.45, '#5b6784'); rg.addColorStop(1, '#232b44');
    ctx.strokeStyle = rg; ctx.lineWidth = 11 * fs * (L.col ? 1 : 0.9); circle(ctx, cx, cy, r + 5 * fs); ctx.stroke();
    // 초점 상태 고리
    const col = inF ? '#34d399' : err < 30 ? '#fbbf24' : '#fb7185';
    ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 3.2; circle(ctx, cx, cy, r + 13 * fs); ctx.stroke();
    if (inF) {
      ctx.strokeStyle = rgba('#34d399', 0.25 + 0.2 * pulse()); ctx.lineWidth = 8; circle(ctx, cx, cy, r + 13 * fs); ctx.stroke();
    }
    // 1초 유지 진행 호
    if (S.held > 0.02 && !S.got[id]) {
      ctx.strokeStyle = '#34d399'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r + 13 * fs, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(S.held, 0, 1)); ctx.stroke(); ctx.lineCap = 'butt';
    }
    // 제목·표시
    const P = PI[id] || { name: SKY_BY[id].name };
    const nm = (SKY_BY[id] || {}).name || '';
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText(L.col ? '🔭 접안렌즈로 본 ' + nm : '🔭 ' + nm, E.x + 14, E.y + 24 * fs);
    void P;
    const status = inF ? '초점 OK ✔' : '초점 오차 ' + Math.round(err) + ' %';
    pill(ctx, status, cx, cy + r - 28 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(26 * fs), pad: 12, bg: inF ? 'rgba(6,95,70,.95)' : 'rgba(10,16,40,.86)', stroke: inF ? '#34d399' : 'rgba(160,190,255,.4)', color: '#fff' });
    if (S.got[id]) pill(ctx, '✅ 관측 완료', cx, cy - r + 30 * fs, { font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), pad: 10, bg: 'rgba(6,95,70,.95)', stroke: '#34d399', color: '#fff' });
    if (id === 'jupiter') pill(ctx, '관측 ' + (S.night + 1) + '일째 밤', E.x + E.w - 14, E.y + 24 * fs, { align: 'right', font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), pad: 10, bg: 'rgba(124,58,237,.7)', stroke: 'rgba(196,181,253,.7)', color: '#fff' });
    drawScopeInfo(ctx, L, t);
    panelEdge(ctx, E);
    if (isNew('focus')) newRingCircle(ctx, L, cx, cy, r + 18 * fs);
  }
  // 아래쪽: 목성 → 관측 기록장, 그 밖 → 설명
  function drawScopeInfo(ctx, L, t) {
    const G = scopeGeo(L), I = G.info, fs = L.fs, id = S.sel;
    roundRect(ctx, I.x, I.y, I.w, I.h, 12);
    ctx.fillStyle = 'rgba(5,9,26,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,190,255,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'left';
    if (id === 'jupiter') {
      ctx.fillStyle = '#ffe9a8'; ctx.font = fnt(L, 14, 'bold');
      ctx.fillText('📓 목성 관측 기록장 (밤마다 네 점의 위치)', I.x + 12, I.y + 22 * fs);
      const rowH = 24 * fs, y0 = I.y + 30 * fs, n = G.rows, rows = S.rec.slice(-n);
      const lx = I.x + 12, x0 = I.x + 84 * fs, x1 = I.x + I.w - 16, cxr = (x0 + x1) / 2, hw = (x1 - x0) / 2 - 6;
      ctx.save(); roundRect(ctx, I.x + 2, y0 - 4, I.w - 4, I.h - (y0 - I.y) - 4, 8); ctx.clip();
      rows.forEach((row, i) => {
        const last = i === rows.length - 1;
        const slide = last ? EZ.outCubic(S.recSlide) : 1;
        const y = y0 + i * rowH + rowH / 2 + (1 - slide) * rowH * 0.8;
        ctx.globalAlpha = last ? slide : 1;
        if (last) { ctx.fillStyle = 'rgba(94,234,212,.08)'; ctx.fillRect(I.x + 6, y - rowH / 2 + 1, I.w - 12, rowH - 2); }
        ctx.fillStyle = last ? '#fff' : '#b8c6ea'; ctx.font = fnt(L, 13, last ? 'bold' : null); ctx.textAlign = 'left';
        ctx.fillText(row.night + '일째 밤', lx, y + 4.5 * fs);
        ctx.strokeStyle = 'rgba(160,190,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.fillStyle = '#e9c98a'; circle(ctx, cxr, y, 6.5 * fs * 0.9); ctx.fill();
        row.xs.forEach((xx, mi) => { ctx.fillStyle = GAL[mi].col; circle(ctx, cxr + xx / 172 * hw, y, 3.5 * fs); ctx.fill(); });
      });
      ctx.restore(); ctx.globalAlpha = 1;
      if (!rows.length) { ctx.fillStyle = '#b8c6ea'; ctx.font = fnt(L, 13); ctx.fillText('초점을 맞추고 🌙 다음 날 밤을 눌러 보세요.', I.x + 12, I.y + 60 * fs); }
    } else {
      const nm = (SKY_BY[id] || {}).name || '';
      ctx.fillStyle = '#fff'; ctx.font = dfnt(L, 24);
      ctx.fillText(nm, I.x + 16, I.y + 36 * fs);
      ctx.fillStyle = '#d6e2ff'; ctx.font = fnt(L, 14);
      let y = wrapText(ctx, '이렇게 보여요: ' + (SCOPE_NOTE[id] || ''), I.x + 16, I.y + 64 * fs, I.w - 32, 21 * fs, 2) + 28 * fs;
      ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13);
      wrapText(ctx, id === 'saturn' ? '고리가 행성을 가리고, 행성 그림자가 고리에 드리워져요.' : id === 'mars' ? '어두운 무늬와 하얀 극관이 보여요.' : '구름에 덮여 무늬가 거의 없어요.', I.x + 16, y, I.w - 32, 20 * fs, 2);
    }
  }

  /* =========================================================
     2단계: 행성 자료표 + 그래프 (반지름 × 평균 밀도)
     ========================================================= */
  function graphGeo(L) {
    if (L.col) return { gp: { x: 8, y: 8, w: 512, h: 584 }, px: 78, py: 40, pw: 424, ph: 404, tp: { x: 528, y: 8, w: 264, h: 584 }, rowX: 536, rowW: 248, rowY0: 92, rowH: 50, cols: 1, colGap: 0 };
    return { gp: { x: 8, y: 8, w: 504, h: 436 }, px: 66, py: 26, pw: 424, ph: 322, tp: { x: 8, y: 452, w: 504, h: 386 }, rowX: 16, rowW: 238, rowY0: 498, rowH: 84, cols: 2, colGap: 12 };
  }
  const gX = (G, r) => G.px + r / 12 * G.pw;
  const gY = (G, d) => G.py + G.ph - d / 6 * G.ph;
  const SNAP_DX = 0.6, SNAP_DY = 0.35;
  function rowRect(L, i) {
    const G = graphGeo(L);
    if (G.cols === 1) return { x: G.rowX, y: G.rowY0 + i * G.rowH, w: G.rowW, h: G.rowH - 6 };
    const c = i % 2, rr = Math.floor(i / 2);
    return { x: G.rowX + c * (G.rowW + G.colGap), y: G.rowY0 + rr * G.rowH, w: G.rowW, h: G.rowH - 6 };
  }
  const dotPos = (L, p) => { const G = graphGeo(L); return { x: gX(G, p.R), y: gY(G, p.rho) }; };
  const mkSpring = () => new SciSim.Spring(0, { stiffness: 196, damping: 28 });
  S.chips = PL.map((p) => ({ id: p.id, where: 'row', sx: mkSpring(), sy: mkSpring(), dragL: null, ret: null, snap: null, bounceT: 0, shakeT: 0, placedAt: 0, grab: { x: 0, y: 0 } }));
  const chipOf = (id) => S.chips.find((c) => c.id === id);
  const placedCount = () => S.chips.filter((c) => c.where === 'placed').length;
  const tCol = (id) => PI[id].g === 't';
  // 색 배정: 0 = 없음, 1 = 주황, 2 = 파랑
  const COLORS = { 1: { name: '주황', col: '#fb923c', soft: 'rgba(251,146,60,.28)' }, 2: { name: '파랑', col: '#60a5fa', soft: 'rgba(96,165,250,.28)' } };
  function groupCheck() {
    const t = PL.filter((p) => p.g === 't').map((p) => S.colors[p.id] || 0), j = PL.filter((p) => p.g === 'j').map((p) => S.colors[p.id] || 0);
    if (t.some((c) => !c) || j.some((c) => !c)) return false;
    return t.every((c) => c === t[0]) && j.every((c) => c === j[0]) && t[0] !== j[0];
  }
  function resetChips() {
    S.chips.forEach((c) => { c.where = 'row'; c.ret = null; c.snap = null; c.placedAt = 0; });
    S.colors = {}; S.groupsOk = false; S.ellOpen = false; S.ellA = 0; S.tipMsg = null;
  }
  function fillGraph(withColors) {
    S.chips.forEach((c, i) => { c.where = 'placed'; c.placedAt = 1 + i; c.snap = null; c.ret = null; });
    S.colors = {}; if (withColors) PL.forEach((p) => { S.colors[p.id] = p.g === 't' ? 1 : 2; });
    S.groupsOk = withColors; S.ellOpen = withColors; S.ellA = withColors ? 1 : 0;
  }
  const groupNamed = () => isFree() || (game && (game.index > 4 || (game.index === 4 && game.phase === 'success')));
  function rowCenter(L, i) { const r = rowRect(L, i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  function chipPos(L, c) {
    const i = PI[c.id].i;
    if (c.where === 'row') return Object.assign(rowCenter(L, i), { k: 0 });
    if (c.where === 'drag') return c.dragL === L.key ? { x: c.sx.value, y: c.sy.value, k: 1 } : Object.assign(rowCenter(L, i), { k: 0 });
    const tgt = dotPos(L, PI[c.id]);
    if (c.where === 'placed') return { x: tgt.x, y: tgt.y, k: 2 };
    if (c.where === 'snap') {
      const A = c.snap, from = A.L === L.key ? A : rowCenter(L, i), u = clamp(A.u, 0, 1), e = EZ.outBack(u);
      return { x: lerp(from.x, tgt.x, e), y: lerp(from.y, tgt.y, e), k: lerp(1, 2, EZ.outCubic(u)) };
    }
    if (c.where === 'return') {
      const R = c.ret, to = rowCenter(L, i), from = R.L === L.key ? R : to, e = EZ.outBack(clamp(R.u, 0, 1));
      return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), k: 1 - clamp(R.u * 1.3, 0, 1) };
    }
    return Object.assign(rowCenter(L, i), { k: 0 });
  }
  function startSnap(c, L, x, y) {
    c.where = 'snap'; c.snap = { L: L.key, x, y, u: 0 };
  }
  function startReturnChip(c, L, x, y) {
    c.where = 'return'; c.ret = { L: L.key, x, y, u: 0 };
  }
  function updateChips(dt) {
    S.chips.forEach((c) => {
      if (c.where === 'drag') { c.sx.update(dt); c.sy.update(dt); }
      else if (c.where === 'snap') {
        c.snap.u += dt / 0.5;
        if (c.snap.u >= 1) { c.where = 'placed'; c.snap = null; c.placedAt = performance.now(); c.bounceT = nowS(); }
      } else if (c.where === 'return') {
        c.ret.u += dt / 0.5;
        if (c.ret.u >= 1) { c.where = 'row'; c.ret = null; }
      }
    });
  }
  const fmtV = (v, d) => (d != null ? v.toFixed(d) : '' + v);
  function drawGraphAxes(ctx, L, t) {
    const G = graphGeo(L), fs = L.fs, P = G.gp;
    panelBase(ctx, P, L.starsGraph, t);
    ctx.save();
    roundRect(ctx, G.px, G.py, G.pw, G.ph, 8); ctx.clip();
    const bg = ctx.createLinearGradient(0, G.py, 0, G.py + G.ph);
    bg.addColorStop(0, 'rgba(18,34,78,.9)'); bg.addColorStop(1, 'rgba(8,16,44,.95)');
    ctx.fillStyle = bg; ctx.fillRect(G.px, G.py, G.pw, G.ph);
    // 격자
    for (let r = 0; r <= 12; r++) { ctx.strokeStyle = r % 2 ? 'rgba(160,190,255,.07)' : 'rgba(160,190,255,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gX(G, r), G.py); ctx.lineTo(gX(G, r), G.py + G.ph); ctx.stroke(); }
    for (let d = 0; d <= 6; d++) { ctx.strokeStyle = 'rgba(160,190,255,.16)'; ctx.beginPath(); ctx.moveTo(G.px, gY(G, d)); ctx.lineTo(G.px + G.pw, gY(G, d)); ctx.stroke(); }
    // 물의 밀도 기준선
    ctx.setLineDash([7, 5]); ctx.strokeStyle = 'rgba(125,211,252,.85)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(G.px, gY(G, 1)); ctx.lineTo(G.px + G.pw, gY(G, 1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 눈금 글자
    ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 13); ctx.textAlign = 'center';
    for (let r = 0; r <= 12; r += 2) ctx.fillText(String(r), gX(G, r), G.py + G.ph + 18 * fs);
    ctx.textAlign = 'right';
    for (let d = 0; d <= 6; d++) ctx.fillText(String(d), G.px - 8, gY(G, d) + 4.5);
    ctx.textAlign = 'center'; ctx.fillStyle = '#e9f0ff'; ctx.font = fnt(L, 14, 'bold');
    ctx.fillText('반지름 (지구 = 1)', G.px + G.pw / 2, G.py + G.ph + 40 * fs);
    ctx.save(); ctx.translate(G.px - 38 * (L.col ? 1 : 1.05), G.py + G.ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('평균 밀도 (g/cm³)', 0, 0); ctx.restore();
    pill(ctx, '물 = 1', G.px + 10, gY(G, 1) - 14 * fs, { align: 'left', font: fnt(L, 13, 'bold'), h: Math.round(20 * fs), pad: 7, bg: 'rgba(7,60,90,.85)', stroke: 'rgba(125,211,252,.7)', color: '#bfe9ff' });
    // 축 선
    ctx.strokeStyle = 'rgba(230,238,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(G.px, G.py); ctx.lineTo(G.px, G.py + G.ph); ctx.lineTo(G.px + G.pw, G.py + G.ph); ctx.stroke();
  }
  // 무리 둘레 타원 (주황/파랑)
  function groupEllipse(L, ids) {
    const G = graphGeo(L);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    ids.forEach((id) => { const p = dotPos(L, PI[id]); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2 + 30, ry: (y1 - y0) / 2 + 28, G };
  }
  function drawGroupEllipses(ctx, L, t) {
    if (S.ellA < 0.01) return;
    const named = groupNamed(), fs = L.fs;
    [[1, 't'], [2, 'j']].forEach(([cn, g]) => {
      const ids = PL.filter((p) => S.colors[p.id] === cn && (g === 't' ? p.g === 't' : p.g === 'j')).map((p) => p.id);
      // 학생이 정한 색으로 무리를 묶음 (정답일 때만 그려요)
      const grp = PL.filter((p) => p.g === g).map((p) => p.id), colN = S.colors[grp[0]];
      const C = COLORS[colN]; if (!C) return;
      const E = groupEllipse(L, grp);
      ctx.save(); ctx.globalAlpha = S.ellA;
      ctx.translate(E.cx, E.cy); ctx.scale(1, E.ry / E.rx);
      ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = C.col; ctx.lineWidth = 3 * (E.rx / E.ry > 1 ? 1 : 1);
      circle(ctx, 0, 0, E.rx); ctx.stroke(); ctx.setLineDash([]);
      const eg = ctx.createRadialGradient(0, 0, E.rx * 0.2, 0, 0, E.rx);
      eg.addColorStop(0, rgba(C.col, 0.03)); eg.addColorStop(1, rgba(C.col, 0.2));
      ctx.fillStyle = eg; circle(ctx, 0, 0, E.rx); ctx.fill();
      ctx.restore();
      const label = named ? GROUP[g].name : C.name + ' 무리';
      const ly = g === 't' ? E.cy + E.ry + 16 * fs : E.cy - E.ry - 14 * fs;
      ctx.globalAlpha = S.ellA;
      pill(ctx, label, clamp(E.cx, 90, L.vw - 90), clamp(ly, 22, L.vh - 22), { font: fnt(L, 14, 'bold'), h: Math.round(26 * fs), pad: 11, bg: rgba(C.col, 0.92), color: '#10182e' });
      ctx.globalAlpha = 1;
    });
  }
  const DOT_OFF = { mercury: [-4, -26], venus: [38, 12], earth: [38, -16], mars: [34, 0], jupiter: [0, -24], saturn: [0, 26], uranus: [0, 26], neptune: [0, -26] };
  function drawGraphDots(ctx, L, t) {
    const fs = L.fs;
    PL.forEach((p) => {
      const c = chipOf(p.id);
      if (c.where !== 'placed' && c.where !== 'snap') return;
      const pos = chipPos(L, c), sq = c.bounceT && nowS() - c.bounceT < 0.45 ? 1 + Math.sin((nowS() - c.bounceT) / 0.45 * Math.PI * 2) * 0.16 * (1 - (nowS() - c.bounceT) / 0.45) : 1;
      const rr = 10 * (L.col ? 1 : 1.1);
      // 색 고리
      const cn = S.colors[p.id];
      if (cn) { ctx.strokeStyle = COLORS[cn].col; ctx.lineWidth = 3.4; circle(ctx, pos.x, pos.y, rr + 5); ctx.stroke(); ctx.fillStyle = COLORS[cn].soft; circle(ctx, pos.x, pos.y, rr + 5); ctx.fill(); }
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(2 - sq, sq); ctx.translate(-pos.x, -pos.y);
      miniPlanet(ctx, p.id, pos.x, pos.y, rr * (p.id === 'saturn' ? 0.8 : 1), { shadow: false, lx: -0.5, ly: -0.8 });
      ctx.restore();
      if (c.where === 'snap' || (c.bounceT && nowS() - c.bounceT < 0.6)) { const a = c.where === 'snap' ? 0 : (nowS() - c.bounceT) / 0.6; ctx.strokeStyle = 'rgba(52,211,153,' + (1 - a) + ')'; ctx.lineWidth = 3 * (1 - a) + 1; circle(ctx, pos.x, pos.y, rr + 4 + a * 22); ctx.stroke(); }
      if (c.where === 'placed' && !(S.xA > 0.3 && (p.id === 'mercury' || p.id === 'venus' || p.id === 'earth'))) {
        const o = DOT_OFF[p.id] || [0, 24], k2 = L.col ? 1 : 1.12;
        pill(ctx, p.name, pos.x + o[0] * k2, pos.y + o[1] * k2, { font: fnt(L, 13, 'bold'), h: Math.round(20 * fs), pad: 7, bg: 'rgba(6,10,26,.78)', color: cn ? COLORS[cn].col : '#fff' });
      }
    });
  }
  function drawTableRow(ctx, L, i, x, y, w, h, st, lift) {
    const p = PL[i], c = S.chips[i], fs = L.fs;
    ctx.save();
    roundRect(ctx, x, y, w, h, 11);
    if (st === 'ghost') { ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.setLineDash([]); ctx.restore(); return; }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (st === 'placed') { g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(255,255,255,.02)'); }
    else { g.addColorStop(0, '#24407f'); g.addColorStop(1, '#162c5e'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = st === 'placed' ? 'rgba(160,190,255,.2)' : 'rgba(170,200,255,.55)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.globalAlpha = st === 'placed' ? 0.5 : 1;
    const ir = L.col ? 12 : 13;
    miniPlanet(ctx, p.id, x + 22, y + h / 2, ir * (p.id === 'saturn' ? 0.75 : 1), { shadow: false, lx: -0.5, ly: -0.8 });
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (L.col) {
      ctx.font = fnt(L, 14, 'bold'); ctx.fillText(p.name, x + 42, y + h / 2 + 1);
      ctx.font = fnt(L, 13); ctx.textAlign = 'right';
      const cols = [p.R, p.M, p.rho.toFixed(2), p.moons], xs = [x + 118, x + 162, x + 203, x + w - 6];
      cols.forEach((v, k) => { ctx.fillStyle = k === 0 || k === 2 ? '#fde68a' : '#d6e2ff'; ctx.fillText(String(v), xs[k], y + h / 2 + 1); });
    } else {
      ctx.font = fnt(L, 14, 'bold'); ctx.fillText(p.name, x + 46, y + 22);
      ctx.font = fnt(L, 12.5); ctx.fillStyle = '#fde68a'; ctx.fillText('반지름 ' + p.R + ' · 밀도 ' + p.rho.toFixed(2), x + 46, y + 44);
      ctx.fillStyle = '#c7d3f2'; ctx.fillText('질량 ' + p.M + ' · 위성 ' + p.moons, x + 46, y + 65);
    }
    ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
    if (st === 'placed') { ctx.fillStyle = '#10b981'; circle(ctx, x + w - 14, y + 14, 8); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; checkMark(ctx, x + w - 14, y + 14, 7); ctx.lineCap = 'butt'; }
    ctx.restore();
    void c; void lift;
  }
  function drawTablePanel(ctx, L, t) {
    const G = graphGeo(L), P = G.tp, fs = L.fs;
    panelBase(ctx, P, L.starsTable, t);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('📋 행성 자료표 (NASA)', P.x + 14, P.y + 28 * fs);
    if (L.col) {
      // 열 제목: 그래프 축과 연결되는 열에 표시
      const hy = P.y + 66, xs = [G.rowX + 118, G.rowX + 162, G.rowX + 203, G.rowX + G.rowW - 6], names = ['반지름', '질량', '밀도', '위성'];
      ctx.font = fnt(L, 12.5, 'bold'); ctx.textAlign = 'right';
      names.forEach((n, k) => { ctx.fillStyle = k === 0 || k === 2 ? '#fde68a' : '#9fb3e0'; ctx.fillText(n, xs[k], hy); });
      ctx.fillStyle = '#9fb3e0'; ctx.textAlign = 'left'; ctx.fillText('행성', G.rowX + 14, hy);
      ctx.fillStyle = 'rgba(253,230,138,.9)'; ctx.font = fnt(L, 11.5, 'bold'); ctx.textAlign = 'right';
      ctx.fillText('x축', xs[0], hy + 14); ctx.fillText('y축', xs[2], hy + 14);
    } else {
      ctx.font = fnt(L, 12.5); ctx.fillStyle = '#9fb3e0'; ctx.textAlign = 'right';
      ctx.fillText('반지름·질량: 지구 = 1 · 밀도: g/cm³', P.x + P.w - 12, P.y + 28 * fs);
    }
    PL.forEach((p, i) => {
      const r = rowRect(L, i), c = S.chips[i];
      if (c.where === 'row' || c.where === 'return') drawTableRow(ctx, L, i, r.x, r.y, r.w, r.h, 'row');
      else if (c.where === 'placed' || c.where === 'snap') drawTableRow(ctx, L, i, r.x, r.y, r.w, r.h, 'placed');
      else drawTableRow(ctx, L, i, r.x, r.y, r.w, r.h, 'ghost');
    });
    ctx.textAlign = 'left'; ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 12.5);
    if (L.col) {
      const fy = G.rowY0 + 8 * G.rowH + 6;
      ctx.fillText('위성 수의 + 는 "개 이상"이에요.', P.x + 14, fy + 4); ctx.fillText('(위성 수는 2025년 무렵 기준)', P.x + 14, fy + 22);
    }
    panelEdge(ctx, P);
  }
  function drawGraphScene(ctx, L, t, V) {
    const G = graphGeo(L), fs = L.fs;
    drawGraphAxes(ctx, L, t);
    drawGroupEllipses(ctx, L, t);
    drawGraphDots(ctx, L, t);
    // 외계 행성 X (4단계)
    if (S.xA > 0.01) {
      const x = gX(G, 1.3), y = gY(G, 5.0), a = S.xA, pu = RM ? 0.5 : 0.5 + 0.5 * Math.sin(t * 4);
      ctx.save(); ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * pu) + ')'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); circle(ctx, x, y, 17 + 3 * pu); ctx.stroke(); ctx.setLineDash([]);
      const xg = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, 11); xg.addColorStop(0, '#fff'); xg.addColorStop(0.5, '#c4b5fd'); xg.addColorStop(1, '#6d28d9');
      ctx.fillStyle = xg; circle(ctx, x, y, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(14 * fs) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y + 1); ctx.textBaseline = 'alphabetic';
      pill(ctx, '행성 X', x + 58 * (L.col ? 1 : 1.1), y + 4 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(24 * fs), pad: 10, bg: 'rgba(91,33,182,.92)', stroke: '#c4b5fd', color: '#fff' });
      ctx.restore();
    }
    drawTablePanel(ctx, L, t);
    // 안내 문장
    const gy = G.gp.y + G.gp.h;
    let msg = null;
    if (S.tipMsg && nowS() - S.tipMsg.t0 < 2.6) msg = S.tipMsg;
    const mx = G.gp.x + G.gp.w / 2, my = gy - (L.col ? 30 : 14) * (L.col ? 1 : 1);
    if (msg) {
      ctx.globalAlpha = clamp((2.6 - (nowS() - msg.t0)) * 2, 0, 1);
      pill(ctx, msg.text, mx, my, { font: fnt(L, 13.5, 'bold'), h: Math.round(28 * fs), pad: 12, bg: msg.good ? 'rgba(6,95,70,.96)' : 'rgba(127,29,29,.96)', color: '#fff' });
      ctx.globalAlpha = 1;
    } else if (game && !isFree() && game.level === 1 && game.index === 2 && placedCount() < 8) {
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(199,211,242,.9)'; ctx.font = fnt(L, 13, 'bold');
      ctx.fillText('👆 표의 행성을 끌어 (반지름, 밀도) 자리에 놓아요', mx, my + 4);
    } else if (placedCount() >= 8 && !S.groupsOk && game && (isFree() || (game.level === 1 && game.index === 3))) {
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(199,211,242,.9)'; ctx.font = fnt(L, 13, 'bold');
      ctx.fillText('👆 점을 눌러 색을 바꿔 두 무리로 묶어 보세요', mx, my + 4);
    }
    // 끌고 있는 칩의 안내선
    const dr = S.chips.find((c) => c.where === 'drag' && c.dragL === L.key);
    if (dr) {
      const x = dr.sx.value, y = dr.sy.value;
      if (x > G.px - 4 && x < G.px + G.pw + 4 && y > G.py - 4 && y < G.py + G.ph + 4) {
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(94,234,212,.75)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, G.py + G.ph); ctx.moveTo(x, y); ctx.lineTo(G.px, y); ctx.stroke(); ctx.restore();
        const rv = clamp((x - G.px) / G.pw * 12, 0, 12), dv = clamp((G.py + G.ph - y) / G.ph * 6, 0, 6);
        pill(ctx, '반지름 ' + rv.toFixed(1), clamp(x, G.px + 50, G.px + G.pw - 50), G.py + G.ph - 14 * fs, { font: fnt(L, 13, 'bold'), h: Math.round(22 * fs), pad: 8, bg: 'rgba(14,116,144,.95)', color: '#fff' });
        pill(ctx, '밀도 ' + dv.toFixed(1), G.px + 44 * fs, clamp(y, G.py + 16, G.py + G.ph - 16), { font: fnt(L, 13, 'bold'), h: Math.round(22 * fs), pad: 8, bg: 'rgba(14,116,144,.95)', color: '#fff' });
      }
    }
    // 끌고 있는 칩/움직이는 칩
    S.chips.slice().sort((a, b) => ({ drag: 3, snap: 2, return: 1 }[a.where] || 0) - ({ drag: 3, snap: 2, return: 1 }[b.where] || 0)).forEach((c) => {
      if (c.where === 'drag' || c.where === 'return' || c.where === 'snap') {
        const p = chipPos(L, c), P = PI[c.id];
        if (c.where === 'snap' && p.k > 1.8) return;
        drawChipToken(ctx, L, P, p.x, p.y, c.where === 'drag' ? 1 : c.where === 'snap' ? 0.4 : 0, p.k, c);
      }
    });
    if (isNew('graph')) newRing(ctx, L, G.gp.x, G.gp.y, G.gp.w, G.gp.h);
    else if (isNew('table')) newRing(ctx, L, G.tp.x, G.tp.y, G.tp.w, G.tp.h);
    void V;
  }
  function drawChipToken(ctx, L, P, x, y, lift, k, c) {
    const w = L.col ? 112 : 124, h = L.col ? 38 : 42;
    let sx = x;
    if (c.shakeT && nowS() - c.shakeT < 0.35) { const a = (nowS() - c.shakeT) / 0.35; sx += Math.sin(a * 30) * 6 * (1 - a); }
    const s = lerp(1, 0.55, clamp(k - 1, 0, 1));
    ctx.save(); ctx.translate(sx, y); ctx.scale((1 + lift * 0.07) * s, (1 + lift * 0.07) * s);
    ctx.shadowColor = 'rgba(0,0,0,' + (0.35 + lift * 0.2) + ')'; ctx.shadowBlur = 8 + lift * 14; ctx.shadowOffsetY = 3 + lift * 6;
    roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#2d4d95'); g.addColorStop(1, '#1a3270');
    ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = lift ? '#5eead4' : 'rgba(170,200,255,.7)'; ctx.lineWidth = lift ? 2.6 : 1.4; ctx.stroke();
    miniPlanet(ctx, P.id, -w / 2 + 20, 0, 11 * (P.id === 'saturn' ? 0.78 : 1), { shadow: false, lx: -0.5, ly: -0.8 });
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + Math.round(15 * L.fs * (L.col ? 1 : 0.95)) + 'px ' + FONT;
    ctx.fillText(P.name, -w / 2 + 38, 1); ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  /* =========================================================
     3단계: 탐사선 투하 (지구형: 단단한 암석 표면 / 목성형: 단단한 표면 없음)
     ========================================================= */
  function probeGeo(L) {
    if (L.col) {
      const chips = PL.map((p, i) => ({ x: 8 + i * 98, y: 8, w: 92, h: 66 }));
      return { chips, win: { x: 8, y: 82, w: 784, h: 400 }, info: { x: 8, y: 490, w: 784, h: 102 } };
    }
    const chips = PL.map((p, i) => ({ x: 8 + (i % 4) * 128, y: 8 + Math.floor(i / 4) * 66, w: 120, h: 60 }));
    return { chips, win: { x: 8, y: 142, w: 504, h: 470 }, info: { x: 8, y: 620, w: 504, h: 218 } };
  }
  const PROBE_ENV = {
    mercury: { sky: ['#02030a', '#0a0d18'], stars: true, ground: ['#a29d95', '#4a453f'], rock: '#8a857d', hor: 0.74, chute: false, craters: true, sun: '#fff7d6' },
    venus: { sky: ['#6b3f14', '#e9b35c'], ground: ['#82583a', '#3d2616'], rock: '#6a4a30', hor: 0.76, chute: true, haze: 'rgba(255,200,120,.25)' },
    earth: { sky: ['#2b68c9', '#bfe2fb'], ground: ['#668f4c', '#3b5a30'], rock: '#8a8478', hor: 0.74, chute: true, grass: true },
    mars: { sky: ['#8f5a3d', '#ecb890'], ground: ['#ad5430', '#5f2d1a'], rock: '#8e4a2c', hor: 0.75, chute: true, haze: 'rgba(255,190,150,.18)' },
    jupiter: { gas: true, top: '#f0e0c2', deep: '#3a1608', cloud: ['#f4e7cf', '#dcb98a', '#c08a58', '#a06a40'] },
    saturn: { gas: true, top: '#f3e6c2', deep: '#45300e', cloud: ['#f6ecd0', '#e4cd96', '#cfae6c', '#b08e4e'] },
    uranus: { gas: true, top: '#d4f4f6', deep: '#0a3c48', cloud: ['#e4fbfc', '#bfeff3', '#8fd8e2', '#62bccc'] },
    neptune: { gas: true, top: '#bcd0ff', deep: '#0a1450', cloud: ['#d4e0ff', '#a9bfff', '#7c98ee', '#5472d8'] },
  };
  const PROBE_T = { rock: 5.4, gas: 7.4 };
  function startProbe() {
    if (S.probe && !S.probe.done) return false;
    const P = PI[S.probeSel], gas = P.g === 'j';
    S.probe = { id: P.id, gas, T: 0, dur: gas ? PROBE_T.gas : PROBE_T.rock, done: false, marked: false, landed: false, vanished: false, dust: false, shake: 0, fx: false };
    Sound.tone(300, 0.2, 'sawtooth', 0.05); Sound.tone(520, 0.25, 'triangle', 0.06, 0.08);
    syncControls();
    return true;
  }
  function selectProbe(id) {
    if (S.probe && !S.probe.done) return;
    if (S.probeSel !== id) { S.probeSel = id; S.probe = null; S.probeFade = 0; SciSim.tween(S, { probeFade: 1 }, { duration: 0.4, ease: 'outCubic' }); Sound.click(); }
    syncControls();
  }
  function updateProbe(dt, views) {
    const pr = S.probe;
    if (!pr || pr.done) return;
    pr.T += dt;
    if (pr.shake > 0) pr.shake = Math.max(0, pr.shake - dt);
    if (!pr.gas) {
      if (pr.T >= 3.7 && !pr.landed) {
        pr.landed = true; pr.shake = 0.32; Sound.tone(150, 0.16, 'sine', 0.12);
        views.forEach((V) => { const W = probeGeo(V.L).win, hx = W.x + W.w / 2, hy = W.y + W.h * PROBE_ENV[pr.id].hor + 6;
          for (let i = 0; i < (RM ? 6 : 20); i++) { const a = -Math.PI * (0.05 + 0.9 * Math.random()), sp = 40 + Math.random() * 90; V.P.emit({ x: hx + (Math.random() - 0.5) * 24, y: hy, vx: Math.cos(a) * sp * (Math.random() < 0.5 ? 1 : -1) * 0.9, vy: -Math.abs(Math.sin(a)) * sp * 0.6, life: 0.9 + Math.random() * 0.8, size: 5 + Math.random() * 7, color: pr.id === 'earth' ? 'rgba(130,110,80,.75)' : pr.id === 'mars' ? 'rgba(190,100,60,.75)' : 'rgba(150,140,128,.75)', shape: 'smoke', gravity: 20, drag: 1.3, grow: 14 }); } });
      }
      if (pr.T >= 4.2 && !pr.marked) { pr.marked = true; S.probed[pr.id] = true; Sound.tone(880, 0.12, 'triangle', 0.08); Sound.tone(1175, 0.14, 'triangle', 0.07, 0.1); }
    } else {
      if (pr.T >= 4.3 && pr.T < 5.9) pr.shake = 0.1;
      if (pr.T >= 5.9 && !pr.vanished) {
        pr.vanished = true; Sound.fail();
        views.forEach((V) => { const W = probeGeo(V.L).win; V.P.burst(W.x + W.w / 2, W.y + W.h * 0.5, { count: 16, colors: ['#ffd36b', '#fb923c', '#f87171'], speed: 150, gravity: 40, size: 3 }); });
      }
      if (pr.T >= 6.2 && !pr.marked) { pr.marked = true; S.probed[pr.id] = true; }
    }
    if (pr.T >= pr.dur) { pr.done = true; syncControls(); }
  }
  function cloudBands(env, id) {
    if (env.bands) return env.bands;
    const r = rng(id.length * 31 + id.charCodeAt(0)), b = [];
    for (let i = 0; i < 14; i++) b.push({ y: i / 14, th: 0.06 + r() * 0.1, c: Math.floor(r() * 4), ph: r() * 6, amp: 4 + r() * 8, sp: 0.2 + r() * 0.5 });
    return (env.bands = b);
  }
  // 탐사선 모양 (s: 크기, chute: 낙하산 펼침 0~1, flame: 로켓 분사)
  function drawProbe(ctx, x, y, s, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.tilt || 0);
    if (o.chute > 0.02) {
      const cs = o.chute, cy = -74 * s * cs, rx = 46 * s * cs, ry = 30 * s * cs;
      ctx.strokeStyle = 'rgba(240,240,250,.75)'; ctx.lineWidth = 1.2;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * rx * 0.44, cy + ry * 0.2 * (1 - Math.abs(k) * 0.12)); ctx.lineTo(k * 3 * s, -14 * s); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-rx, cy + ry * 0.2); ctx.bezierCurveTo(-rx, cy - ry * 1.15, rx, cy - ry * 1.15, rx, cy + ry * 0.2);
      for (let k = 0; k < 4; k++) { const u = 1 - k / 2; ctx.quadraticCurveTo(rx * (u - 0.25), cy + ry * 0.55, rx * (u - 0.5), cy + ry * 0.2); }
      ctx.closePath();
      const pg = ctx.createLinearGradient(-rx, cy - ry, rx, cy + ry);
      pg.addColorStop(0, '#ff8a5c'); pg.addColorStop(0.5, '#fff1e6'); pg.addColorStop(1, '#f04b4b');
      ctx.fillStyle = pg; ctx.fill(); ctx.strokeStyle = 'rgba(80,30,30,.4)'; ctx.stroke();
      ctx.strokeStyle = 'rgba(120,40,40,.35)';
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * rx * 0.5, cy + ry * 0.2); ctx.quadraticCurveTo(k * rx * 0.4, cy - ry * 0.6, k * rx * 0.1, cy - ry * 0.95); ctx.stroke(); }
    }
    if (o.flame > 0.02) {
      const fl = o.flame * (0.8 + 0.2 * Math.sin(t * 40));
      const fg = ctx.createLinearGradient(0, 8 * s, 0, 8 * s + 34 * s * fl);
      fg.addColorStop(0, 'rgba(255,255,230,.95)'); fg.addColorStop(0.4, 'rgba(255,190,80,.8)'); fg.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-6 * s, 8 * s); ctx.lineTo(0, 8 * s + 34 * s * fl); ctx.lineTo(6 * s, 8 * s); ctx.closePath(); ctx.fill();
    }
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    // 단열 방패
    ctx.beginPath(); ctx.moveTo(-14 * s, 4 * s); ctx.lineTo(14 * s, 4 * s); ctx.lineTo(7 * s, 14 * s); ctx.lineTo(-7 * s, 14 * s); ctx.closePath();
    const sg = ctx.createLinearGradient(0, 4 * s, 0, 14 * s); sg.addColorStop(0, '#6b5646'); sg.addColorStop(1, '#2d2118');
    ctx.fillStyle = sg; ctx.fill();
    roundRect(ctx, -13 * s, -15 * s, 26 * s, 21 * s, 7 * s);
    const bg = ctx.createLinearGradient(-13 * s, 0, 13 * s, 0); bg.addColorStop(0, '#f4f7ff'); bg.addColorStop(0.5, '#b8c3dc'); bg.addColorStop(1, '#657089');
    ctx.fillStyle = bg; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#1f3b72'; circle(ctx, 0, -5 * s, 5 * s); ctx.fill();
    ctx.fillStyle = 'rgba(160,220,255,.7)'; circle(ctx, -1.5 * s, -6.5 * s, 2 * s); ctx.fill();
    // 안테나
    ctx.strokeStyle = '#cfd6ea'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(0, -15 * s); ctx.lineTo(0, -22 * s); ctx.stroke();
    ctx.fillStyle = '#e8edf8'; ctx.beginPath(); ctx.ellipse(0, -23 * s, 6 * s, 2.4 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = (RM || Math.floor(t * 2.4) % 2) ? '#ef4444' : '#7f1d1d'; circle(ctx, 9 * s, -13 * s, 1.6 * s); ctx.fill();
    if (o.legs) { ctx.strokeStyle = '#aeb8d0'; ctx.lineWidth = 2.2 * s; [[-1, 1], [1, 1]].forEach((l) => { ctx.beginPath(); ctx.moveTo(l[0] * 9 * s, 5 * s); ctx.lineTo(l[0] * 18 * s, 15 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(l[0] * 15 * s, 15 * s); ctx.lineTo(l[0] * 21 * s, 15 * s); ctx.stroke(); }); }
    ctx.restore();
  }
  function groundShape(W, env, id) {
    const r = rng(id.charCodeAt(0) * 13 + id.length), pts = [];
    const n = 24; let p = 0;
    for (let i = 0; i <= n; i++) { p = lerp(p, r(), 0.5); pts.push(p); }
    return pts;
  }
  const GROUND_CACHE = {};
  function drawRocky(ctx, L, W, env, pr, t, id) {
    const hy = W.y + W.h * env.hor;
    // 하늘
    const sg = ctx.createLinearGradient(0, W.y, 0, hy);
    sg.addColorStop(0, env.sky[0]); sg.addColorStop(1, env.sky[1]);
    ctx.fillStyle = sg; ctx.fillRect(W.x, W.y, W.w, hy - W.y + 2);
    if (env.stars) drawStars(ctx, L.starsProbe, t, 0.9);
    if (env.haze) { ctx.fillStyle = env.haze; ctx.fillRect(W.x, W.y, W.w, hy - W.y); }
    // 태양
    const sx = W.x + W.w * 0.8, sy = W.y + W.h * 0.2;
    const sgl = ctx.createRadialGradient(sx, sy, 2, sx, sy, W.w * 0.22);
    sgl.addColorStop(0, 'rgba(255,248,214,.95)'); sgl.addColorStop(0.1, 'rgba(255,230,160,.5)'); sgl.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = sgl; ctx.fillRect(sx - W.w * 0.22, sy - W.w * 0.22, W.w * 0.44, W.w * 0.44);
    if (id === 'earth') { // 구름
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      [[0.2, 0.22, 60], [0.52, 0.12, 80], [0.4, 0.34, 50]].forEach((c, i) => { const cxx = W.x + ((c[0] * W.w + t * (RM ? 0 : 6 + i * 2)) % (W.w + 160)) - 80, cyy = W.y + c[1] * W.h; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(cxx + k * c[2] * 0.3, cyy + (k % 2) * 4, c[2] * 0.34, c[2] * 0.16, 0, 0, TAU); ctx.fill(); } });
    }
    // 먼 산
    ctx.fillStyle = rgba(env.ground[1], 0.7);
    ctx.beginPath(); ctx.moveTo(W.x, hy);
    const gp = GROUND_CACHE[id] || (GROUND_CACHE[id] = groundShape(W, env, id));
    for (let i = 0; i < gp.length; i++) ctx.lineTo(W.x + W.w * i / (gp.length - 1), hy - 8 - gp[i] * 34);
    ctx.lineTo(W.x + W.w, hy); ctx.closePath(); ctx.fill();
    // 땅
    const gg = ctx.createLinearGradient(0, hy, 0, W.y + W.h);
    gg.addColorStop(0, env.ground[0]); gg.addColorStop(1, env.ground[1]);
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(W.x, hy + 4);
    for (let i = 0; i < gp.length; i++) ctx.lineTo(W.x + W.w * i / (gp.length - 1), hy + 2 - gp[(i * 5) % gp.length] * 6);
    ctx.lineTo(W.x + W.w, W.y + W.h); ctx.lineTo(W.x, W.y + W.h); ctx.closePath(); ctx.fill();
    // 바위·분화구·풀
    const rr = rng(id.length * 77 + 5);
    for (let i = 0; i < 16; i++) {
      const rx = W.x + 20 + rr() * (W.w - 40), ry = hy + 14 + rr() * (W.y + W.h - hy - 30), rs = 5 + rr() * 16 * ((ry - hy) / (W.h * 0.3) + 0.4);
      if (env.craters && i % 3 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(rx, ry, rs * 1.6, rs * 0.55, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(rx, ry - 1, rs * 1.6, rs * 0.55, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else {
        const rg = ctx.createRadialGradient(rx - rs * 0.3, ry - rs * 0.4, 1, rx, ry, rs);
        rg.addColorStop(0, shade(env.rock, 0.4)); rg.addColorStop(1, shade(env.rock, -0.45));
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(rx + rs * 0.2, ry + rs * 0.55, rs * 1.1, rs * 0.3, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(rx, ry, rs, rs * 0.72, 0, 0, TAU); ctx.fill();
      }
      if (env.grass && i % 2 === 0) { ctx.strokeStyle = '#7bc062'; ctx.lineWidth = 1.6; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(rx + 30 + k * 2, ry + 4); ctx.lineTo(rx + 30 + k * 3.4, ry - 7 - (k % 2) * 2); ctx.stroke(); } }
    }
  }
  function drawGas(ctx, L, W, env, pr, t, id, D) {
    // 하늘 → 깊은 곳 (D가 커질수록 어두워져요)
    const gTop = mixc(env.top, env.deep, clamp(D * 1.1, 0, 1)), gBot = mixc(env.cloud[2], env.deep, clamp(D * 1.25, 0, 1));
    const sg = ctx.createLinearGradient(0, W.y, 0, W.y + W.h);
    sg.addColorStop(0, gTop); sg.addColorStop(1, gBot);
    ctx.fillStyle = sg; ctx.fillRect(W.x, W.y, W.w, W.h);
    const bands = cloudBands(env, id), H = W.h;
    ctx.save(); ctx.beginPath(); ctx.rect(W.x, W.y, W.w, W.h); ctx.clip();
    const ct = W.y + H * lerp(0.6, -0.4, clamp(D * 1.3, 0, 1));   // 구름 꼭대기 높이
    // 맑은 하늘 위쪽의 빛번짐
    const skyg = ctx.createLinearGradient(0, W.y, 0, ct);
    skyg.addColorStop(0, rgba(env.top, 0)); skyg.addColorStop(1, 'rgba(255,255,255,.25)');
    if (ct > W.y) { ctx.fillStyle = skyg; ctx.fillRect(W.x, W.y, W.w, ct - W.y); }
    ctx.beginPath(); ctx.rect(W.x, Math.max(W.y, ct - 6), W.w, W.y + H - Math.max(W.y, ct - 6)); ctx.clip();
    // 구름 꼭대기 층
    ctx.beginPath(); ctx.moveTo(W.x, W.y + H);
    for (let i = 0; i <= 28; i++) { const x = W.x + W.w * i / 28; ctx.lineTo(x, ct + Math.sin(i * 0.8 + (RM ? 0 : t * 0.5)) * 7 + Math.sin(i * 2.1) * 3); }
    ctx.lineTo(W.x + W.w, W.y + H); ctx.closePath();
    ctx.globalAlpha = 0.92; ctx.fillStyle = mixc(env.cloud[0], env.deep, clamp(D * 0.8, 0, 1)); ctx.fill(); ctx.globalAlpha = 1;
    const scroll = D * H * 3.4 + (RM ? 0 : t * 6);
    bands.forEach((b, bi) => {
      const span = H * 1.8;
      let y = ((b.y * span + H * 0.9 - scroll) % span + span) % span - H * 0.35 + W.y;
      const th = b.th * H * (1 + 0.5 * (1 - D));
      const col = env.cloud[b.c], dark = clamp(D * 1.15, 0, 1);
      ctx.beginPath();
      const n = 22;
      for (let i = 0; i <= n; i++) { const x = W.x + W.w * i / n, yy = y + Math.sin(i * 0.9 + b.ph + (RM ? 0 : t * b.sp)) * b.amp * (0.6 + D); if (i) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); }
      for (let i = n; i >= 0; i--) { const x = W.x + W.w * i / n, yy = y + th + Math.sin(i * 0.7 + b.ph * 1.3 + (RM ? 0 : t * b.sp * 0.8)) * b.amp * (0.6 + D); ctx.lineTo(x, yy); }
      ctx.closePath();
      ctx.globalAlpha = 0.5 * (1 - dark * 0.55);
      ctx.fillStyle = mixc(col, env.deep, dark * 0.78); ctx.fill();
      void bi;
    });
    ctx.globalAlpha = 1;
    // 빠르게 지나가는 줄무늬 (내려가는 느낌)
    if (!RM && pr && D > 0.02) {
      ctx.strokeStyle = 'rgba(255,240,220,' + (0.08 + 0.12 * D) + ')'; ctx.lineWidth = 1.4;
      const r = rng(9);
      for (let i = 0; i < 26; i++) { const x = W.x + r() * W.w, sp = 200 + r() * 500, y = W.y + ((r() * H + sp * D * 4.5 + (-t * sp * 0.5)) % H + H) % H, len = 14 + D * 60; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len * (0.4 + r())); ctx.stroke(); }
    }
    // 깊어질수록 붉게 달아오르는 빛
    if (D > 0.55) { const a = clamp((D - 0.55) / 0.45, 0, 1) * 0.35; const hg = ctx.createLinearGradient(0, W.y + W.h * 0.4, 0, W.y + W.h); hg.addColorStop(0, 'rgba(255,90,40,0)'); hg.addColorStop(1, 'rgba(255,90,40,' + a + ')'); ctx.fillStyle = hg; ctx.fillRect(W.x, W.y, W.w, W.h); }
    ctx.restore();
  }
  function drawProbeScene(ctx, L, t, V) {
    const G = probeGeo(L), W = G.win, fs = L.fs, id = S.probeSel, env = PROBE_ENV[id], P = PI[id], pr = S.probe && S.probe.id === id ? S.probe : null;
    // 행성 고르기 칩
    G.chips.forEach((r, i) => {
      const p = PL[i], sel = p.id === id, done = S.probed[p.id], gc = GROUP[p.g];
      ctx.save();
      roundRect(ctx, r.x, r.y, r.w, r.h, 12);
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, sel ? '#2e5ab0' : '#1d3470'); g.addColorStop(1, sel ? '#1d3f86' : '#122253');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = sel ? '#5eead4' : 'rgba(160,190,255,.35)'; ctx.lineWidth = sel ? 3 : 1.3; ctx.stroke();
      ctx.restore();
      miniPlanet(ctx, p.id, r.x + r.w / 2 - (L.col ? 0 : 26), r.y + (L.col ? 25 : 30), (L.col ? 15 : 14) * (p.id === 'saturn' ? 0.78 : 1), { shadow: false, rings: shown('rings'), lx: -0.5, ly: -0.8 });
      ctx.fillStyle = '#fff'; ctx.font = fnt(L, 13.5, 'bold'); ctx.textAlign = L.col ? 'center' : 'left';
      ctx.fillText(p.name, L.col ? r.x + r.w / 2 : r.x + 48, L.col ? r.y + r.h - 12 : r.y + 26 * fs / 1.2 + 4);
      // 그룹 띠
      ctx.fillStyle = gc.col; roundRect(ctx, r.x + 8, r.y + r.h - 6, r.w - 16, 3.5, 2); ctx.fill();
      if (!L.col) { ctx.fillStyle = gc.ink; ctx.font = fnt(L, 12, 'bold'); ctx.textAlign = 'left'; ctx.fillText(gc.short, r.x + 48, r.y + r.h - 14); }
      if (done) { ctx.fillStyle = '#10b981'; circle(ctx, r.x + r.w - 11, r.y + 11, 8); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; checkMark(ctx, r.x + r.w - 11, r.y + 11, 7); ctx.lineCap = 'butt'; }
    });
    // 장면 창
    ctx.save();
    roundRect(ctx, W.x, W.y, W.w, W.h, 14); ctx.clip();
    const sh = pr && pr.shake > 0 ? (RM ? 0 : (Math.random() - 0.5) * 7 * Math.min(1, pr.shake * 6)) : 0;
    ctx.translate(sh, sh * 0.6);
    const T = pr ? pr.T : 0;
    let D = 0;
    if (env.gas) {
      D = pr ? clamp((T - 0.7) / 4.6, 0, 1) : 0; D = EZ.inOutSine ? EZ.inOutSine(D) : D;
      drawGas(ctx, L, W, env, pr, t, id, D);
    } else drawRocky(ctx, L, W, env, pr, t, id);
    // 탐사선
    const px = W.x + W.w / 2 + (RM ? 0 : Math.sin(t * 1.6) * 6);
    if (!env.gas) {
      const hy = W.y + W.h * env.hor, yTop = W.y + (L.col ? 140 : 150), yLand = hy + 34 * fs, PS = L.col ? 1.7 : 1.5;
      let y, chute = 0, flame = 0, tilt = 0;
      if (!pr) { y = yTop + (RM ? 0 : Math.sin(t * 2) * 3); }
      else {
        const u = clamp((T - 0.5) / 3.2, 0, 1), e = EZ.outCubic(u);
        y = lerp(yTop, yLand, e);
        if (T > 3.2 && T < 4.4) y = yLand - Math.abs(Math.sin((T - 3.2) * 4.2)) * 10 * Math.max(0, 1 - (T - 3.2) / 1.2);
        if (T >= 4.4) y = yLand;
        chute = env.chute ? clamp((T - 0.8) / 0.6, 0, 1) * (1 - clamp((T - 3.7) / 0.8, 0, 1)) : 0;
        flame = !env.chute ? (T > 0.8 && T < 3.9 ? 1 : 0) : 0;
        tilt = RM ? 0 : Math.sin(t * 2.1) * 0.07 * (1 - clamp((T - 3.5) / 0.5, 0, 1));
      }
      // 땅에 닿은 낙하산 천
      if (pr && T > 3.7 && env.chute) { ctx.globalAlpha = clamp((T - 3.7) / 0.6, 0, 1) * 0.9; ctx.fillStyle = '#f2a590'; ctx.beginPath(); ctx.ellipse(px - 40, yLand + 12, 38, 8, -0.1, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff1e6'; ctx.beginPath(); ctx.ellipse(px - 26, yLand + 10, 16, 5, 0.1, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      drawProbe(ctx, px, y, PS, t, { chute, flame, tilt, legs: pr && T > 3.2 });
      // 지면 표시
      if (pr && T >= 4.2) {
        const a = clamp((T - 4.2) / 0.6, 0, 1);
        ctx.globalAlpha = a; pill(ctx, '🪨 단단한 암석 표면에 착륙했어요!', W.x + W.w / 2, W.y + W.h - 30 * fs, { font: fnt(L, 15, 'bold'), h: Math.round(32 * fs), pad: 14, bg: 'rgba(6,95,70,.95)', stroke: '#34d399' }); ctx.globalAlpha = 1;
      }
    } else {
      const yTop = W.y + (L.col ? 140 : 150), yMid = W.y + W.h * 0.5, PS = L.col ? 1.7 : 1.5;
      let y = yTop, chute = 1, alpha = 1, glow = 0;
      if (!pr) { y = yTop + (RM ? 0 : Math.sin(t * 2) * 3); chute = 0; }
      else {
        const u = clamp((T - 0.4) / 1.2, 0, 1); y = lerp(yTop, yMid, EZ.outCubic(u));
        chute = clamp((T - 0.5) / 0.6, 0, 1);
        glow = clamp((T - 3.8) / 1.8, 0, 1);
        if (T > 5.9) alpha = clamp(1 - (T - 5.9) / 0.25, 0, 1);
      }
      if (alpha > 0.01) {
        ctx.save(); ctx.globalAlpha = alpha;
        if (glow > 0) { const hg = ctx.createRadialGradient(px, y, 4, px, y, 90); hg.addColorStop(0, 'rgba(255,120,60,' + 0.55 * glow + ')'); hg.addColorStop(1, 'rgba(255,80,40,0)'); ctx.fillStyle = hg; circle(ctx, px, y, 90); ctx.fill(); }
        drawProbe(ctx, px + (pr && T > 4.3 && !RM ? (Math.random() - 0.5) * 3 * glow : 0), y, PS, t, { chute: pr ? chute * (1 - glow * 0.35) : 0, tilt: RM ? 0 : Math.sin(t * 2.4) * 0.09 });
        ctx.restore();
      }
      // 깊이 표시줄
      if (pr) {
        const bx = W.x + W.w - 32, by = W.y + 56 * fs, bh = W.h - 120 * fs;
        roundRect(ctx, bx, by, 14, bh, 7); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
        roundRect(ctx, bx, by, 14, Math.max(14, bh * D), 7); const dg = ctx.createLinearGradient(0, by, 0, by + bh); dg.addColorStop(0, '#fde68a'); dg.addColorStop(1, '#ef4444'); ctx.fillStyle = dg; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'right'; ctx.fillText('내려간 깊이', bx + 14, by - 8);
      }
      if (pr && T >= 5.9) {
        // 신호 끊김: 지직거리는 선
        const a = clamp((T - 5.9) / 0.4, 0, 1) * (RM ? 0.3 : 0.55); ctx.globalAlpha = a; const r = rng(Math.floor(t * 20));
        for (let i = 0; i < 18; i++) { ctx.fillStyle = r() < 0.5 ? '#fff' : '#9ca3af'; ctx.fillRect(W.x + r() * W.w, W.y + r() * W.h, 20 + r() * 80, 1.5); }
        ctx.globalAlpha = 1;
        const a2 = clamp((T - 6.1) / 0.6, 0, 1);
        ctx.globalAlpha = a2; pill(ctx, '🌫️ 단단한 표면이 없어요! 기체와 구름이 계속 이어져요', W.x + W.w / 2, W.y + W.h - 30 * fs, { font: fnt(L, 14.5, 'bold'), h: Math.round(32 * fs), pad: 14, bg: 'rgba(127,29,29,.95)', stroke: '#fca5a5' }); ctx.globalAlpha = 1;
      }
    }
    if (!pr) {
      pill(ctx, '🚀 탐사선 준비 완료 — [탐사선 투하]를 눌러요', W.x + W.w / 2, W.y + W.h - 28 * fs, { font: fnt(L, 14, 'bold'), h: Math.round(30 * fs), pad: 14, bg: 'rgba(14,165,233,.92)' });
    }
    V.P.draw(ctx);
    // 장면 바뀔 때 부드럽게
    if (S.probeFade < 0.995) { ctx.fillStyle = 'rgba(7,13,31,' + ((1 - S.probeFade) * 0.9) + ')'; ctx.fillRect(W.x, W.y, W.w, W.h); }
    ctx.restore();
    ctx.textAlign = 'left'; ctx.font = fnt(L, 15, 'bold'); ctx.fillStyle = '#fff';
    pill(ctx, P.name + ' 탐사', W.x + 14, W.y + 22 * fs, { align: 'left', font: fnt(L, 14, 'bold'), h: Math.round(26 * fs), pad: 11, bg: 'rgba(6,10,26,.7)', stroke: GROUP[P.g].col });
    panelEdge(ctx, W);
    drawProbeInfo(ctx, L, t);
    if (isNew('probe')) newRing(ctx, L, W.x, W.y, W.w, W.h);
    else if (isNew('rings')) newRing(ctx, L, G.chips[0].x, G.chips[0].y, G.chips[7].x + G.chips[7].w - G.chips[0].x, G.chips[7].y + G.chips[7].h - G.chips[0].y);
  }
  function drawProbeInfo(ctx, L, t) {
    const G = probeGeo(L), I = G.info, fs = L.fs, id = S.probeSel, P = PI[id], done = S.probed[id], gas = P.g === 'j';
    panelBase(ctx, I, null, t);
    const wide = L.col;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = dfnt(L, 22); ctx.fillText(P.name, I.x + 16, I.y + (wide ? 32 : 40));
    const nw = ctx.measureText(P.name).width;
    pill(ctx, GROUP[P.g].name, I.x + 16 + nw + 12, I.y + (wide ? 24 : 32), { align: 'left', font: fnt(L, 13, 'bold'), h: Math.round(22 * fs), pad: 9, bg: rgba(GROUP[P.g].col, 0.9), color: '#10182e' });
    // 평균 밀도 막대 (0~6, 물 = 1)
    const bx = I.x + 16, bw = wide ? 300 : I.w - 32, by = I.y + (wide ? 66 : 88);
    ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('평균 밀도 ' + P.rho.toFixed(2) + ' g/cm³', bx, by - 9);
    roundRect(ctx, bx, by, bw, 12, 6); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
    roundRect(ctx, bx, by, Math.max(12, bw * P.rho / 6), 12, 6); ctx.fillStyle = GROUP[P.g].col; ctx.fill();
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(bx + bw / 6, by - 4); ctx.lineTo(bx + bw / 6, by + 16); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#7dd3fc'; ctx.font = fnt(L, 12.5, 'bold'); ctx.textAlign = 'center'; ctx.fillText('물 = 1', bx + bw / 6, by + (wide ? 30 : 33));
    // 탐사 결과
    const cx0 = wide ? I.x + 350 : I.x + 16, cy0 = wide ? I.y + 26 : I.y + 146, cw = wide ? I.w - (cx0 - I.x) - 16 : I.w - 32;
    ctx.textAlign = 'left'; ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 13, 'bold'); ctx.fillText('탐사 결과', cx0, cy0);
    if (done) {
      const bh = Math.round(28 * fs);
      roundRect(ctx, cx0, cy0 + 9, cw, bh, 8);
      const cg = ctx.createLinearGradient(cx0, 0, cx0 + cw, 0);
      if (gas) { cg.addColorStop(0, '#fde9b8'); cg.addColorStop(0.6, '#e8a96a'); cg.addColorStop(1, '#a8e6f2'); } else { cg.addColorStop(0, '#8a7f74'); cg.addColorStop(0.5, '#b0613a'); cg.addColorStop(1, '#6b5b4e'); }
      ctx.fillStyle = cg; ctx.fill();
      ctx.fillStyle = gas ? '#10182e' : '#fff'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'center';
      ctx.fillText(gas ? '주로 수소·헬륨 같은 가벼운 기체' : '암석과 금속 → 단단한 표면', cx0 + cw / 2, cy0 + 9 + bh * 0.66);
      ctx.textAlign = 'left'; ctx.fillStyle = '#e3ebff'; ctx.font = fnt(L, 13);
      ctx.fillText(gas ? '단단한 표면이 없고 밀도가 작아요.' : '밀도가 커요. 단단한 땅이 있어요.', cx0, cy0 + 9 + bh + 20 * fs);
    } else {
      ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13); ctx.fillText('탐사선을 보내 알아봐요.', cx0, cy0 + 28);
    }
    panelEdge(ctx, I);
  }

  /* =========================================================
     4단계: 궤도 지도(소행성대) + 특징 표 꾸미기
     ========================================================= */
  const AU2R = (au) => 46 + 92 * Math.sqrt(au);
  const R_B0 = AU2R(2.2), R_B1 = AU2R(3.3);
  const ORB_RM = { mercury: 4.6, venus: 6.4, earth: 6.8, mars: 5.4, jupiter: 12.5, saturn: 10, uranus: 8.2, neptune: 8.2 };
  const BELT = (function () {
    const r = rng(404), a = [];
    for (let i = 0; i < 260; i++) { const u = (r() + r() + r()) / 3, rad = R_B0 + (R_B1 - R_B0) * u, au = Math.pow((rad - 46) / 92, 2); a.push({ rad, th: r() * TAU, w: TAU / (14 * Math.pow(au, 1.5)), s: 0.7 + r() * 1.4, c: r() < 0.5 ? '#c9bda9' : r() < 0.6 ? '#9b8f80' : '#776c60' }); }
    return a;
  })();
  function orbitGeo(L) {
    const P = L.col ? { x: 8, y: 8, w: 784, h: 584 } : { x: 8, y: 8, w: 504, h: 560 };
    const rmax = AU2R(30.1) + 52, s = Math.min(P.w, P.h) / 2 / rmax;
    return { P, cx: P.x + P.w / 2, cy: P.y + P.h / 2, s, info: L.col ? null : { x: 8, y: 576, w: 504, h: 262 } };
  }
  function drawSunSimple(ctx, x, y, r, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4);
    g.addColorStop(0, 'rgba(255,200,96,0.55)'); g.addColorStop(0.3, 'rgba(255,160,64,0.2)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; circle(ctx, x, y, r * 4); ctx.fill(); ctx.restore();
    const amp = RM ? 0 : 1.0, ph = t * TAU / 3;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU, rr = r + amp * (0.55 * Math.sin(3 * a + ph) + 0.3 * Math.sin(5 * a - ph * 1.3 + 1)); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath();
    const bg = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, r * 0.05, x, y, r * 1.05);
    bg.addColorStop(0, '#fff7d6'); bg.addColorStop(0.55, '#ffcf5a'); bg.addColorStop(1, '#ff9a2e'); ctx.fillStyle = bg; ctx.fill();
  }
  function drawOrbits(ctx, L, t) {
    const O = orbitGeo(L), P = O.P, fs = L.fs, s = O.s;
    panelBase(ctx, P, L.starsOrbit, t);
    ctx.save(); roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.clip();
    // 소행성대 빛무리 + 점
    const bgr = ctx.createRadialGradient(O.cx, O.cy, R_B0 * s * 0.95, O.cx, O.cy, R_B1 * s * 1.05);
    bgr.addColorStop(0, 'rgba(200,180,150,0)'); bgr.addColorStop(0.5, 'rgba(200,180,150,.16)'); bgr.addColorStop(1, 'rgba(200,180,150,0)');
    ctx.fillStyle = bgr; ctx.beginPath(); ctx.arc(O.cx, O.cy, R_B1 * s * 1.05, 0, TAU); ctx.arc(O.cx, O.cy, R_B0 * s * 0.95, 0, TAU, true); ctx.fill();
    BELT.forEach((b) => { const th = b.th + (RM ? 0 : b.w * S.orbitT); ctx.fillStyle = b.c; const px = O.cx + Math.cos(th) * b.rad * s, py = O.cy - Math.sin(th) * b.rad * s; ctx.fillRect(px - b.s * 0.7, py - b.s * 0.7, b.s * 1.4, b.s * 1.4); });
    // 소행성대 강조 고리 + 이름표
    const pu = RM ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3);
    ctx.strokeStyle = 'rgba(253,230,138,' + (0.25 + 0.3 * pu) + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    circle(ctx, O.cx, O.cy, R_B0 * s * 0.96); ctx.stroke(); circle(ctx, O.cx, O.cy, R_B1 * s * 1.04); ctx.stroke(); ctx.setLineDash([]);
    // 궤도
    PL.forEach((p) => {
      ctx.strokeStyle = rgba(GROUP[p.g].col, 0.4); ctx.lineWidth = 1.6; ctx.setLineDash([4, 6]); circle(ctx, O.cx, O.cy, AU2R(p.au) * s); ctx.stroke(); ctx.setLineDash([]);
    });
    drawSunSimple(ctx, O.cx, O.cy, 17 * Math.max(0.9, s * 1.8) * (L.col ? 1 : 1), t);
    const placed = [];
    const LH = Math.round(20 * fs);
    PL.forEach((p, i) => {
      const th = (i * 1.9 + 0.7) + (RM ? 0 : S.orbitT * TAU / (14 * Math.pow(p.au, 1.5)));
      const x = O.cx + Math.cos(th) * AU2R(p.au) * s, y = O.cy - Math.sin(th) * AU2R(p.au) * s;
      const dx = O.cx - x, dy = O.cy - y, dl = Math.hypot(dx, dy) || 1;
      const rr = ORB_RM[p.id] * (L.col ? 1.12 : 1.2) * Math.max(0.85, s * 1.5);
      miniPlanet(ctx, p.id, x, y, rr * (p.id === 'saturn' ? 0.85 : 1), { lx: dx / dl, ly: dy / dl, rings: true });
      // 이름표: 태양 바깥쪽, 겹치면 비켜 놓기
      ctx.font = fnt(L, 13, 'bold'); const lw = ctx.measureText(p.name).width + 14;
      let lx = x - (dx / dl) * (rr + 14 * fs), ly = y - (dy / dl) * (rr + 12 * fs);
      for (let k = 0; k < 5; k++) {
        const hit = placed.some((q) => Math.abs(lx - q[0]) < (lw + q[2]) / 2 + 1 && Math.abs(ly - q[1]) < LH + 1);
        if (!hit) break; ly += (k % 2 ? -1 : 1) * (LH + 2) * ((k + 2) >> 1);
      }
      lx = clamp(lx, P.x + lw / 2 + 6, P.x + P.w - lw / 2 - 6); ly = clamp(ly, P.y + 14 * fs, P.y + P.h - 14 * fs);
      placed.push([lx, ly, lw]);
      pill(ctx, p.name, lx, ly, { font: fnt(L, 13, 'bold'), h: LH, pad: 7, bg: 'rgba(6,10,26,.74)', color: GROUP[p.g].ink });
    });
    ctx.restore();
    pill(ctx, '소행성대', O.cx + Math.cos(2.3) * (R_B0 + R_B1) / 2 * s, O.cy - Math.sin(2.3) * (R_B0 + R_B1) / 2 * s - 2, { font: fnt(L, 14, 'bold'), h: Math.round(24 * fs), pad: 10, bg: 'rgba(60,44,12,.9)', stroke: 'rgba(253,230,138,.8)', color: '#fde68a' });
    // 범례
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('🗺️ 위에서 본 행성 궤도', P.x + 14, P.y + 26 * fs);
    ctx.font = fnt(L, 13); ctx.fillStyle = 'rgba(212,226,255,.75)'; ctx.fillText('거리는 실제와 달라요', P.x + 14, P.y + 46 * fs);
    const lx = P.x + P.w - 14, ly = P.y + P.h - 18 * fs;
    pill(ctx, '● 목성형 행성', lx, ly, { align: 'right', font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), pad: 10, bg: 'rgba(30,64,130,.85)', color: GROUP.j.ink });
    pill(ctx, '● 지구형 행성', lx - 124 * fs, ly, { align: 'right', font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), pad: 10, bg: 'rgba(120,60,10,.85)', color: GROUP.t.ink });
    panelEdge(ctx, P);
    if (O.info) {
      const I = O.info;
      panelBase(ctx, I, null, t);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold'); ctx.fillText('🔎 지도 읽는 법', I.x + 14, I.y + 30 * fs);
      ctx.font = fnt(L, 14); ctx.fillStyle = '#d6e2ff';
      ['• 노란 점선 띠는 소행성대예요.', '• 주황색 궤도: 지구형 행성 4개', '• 파랑색 궤도: 목성형 행성 4개', '• 소행성대를 기준으로 안쪽과 바깥쪽을 살펴봐요.'].forEach((tx, i) => { wrapText(ctx, tx, I.x + 16, I.y + 64 * fs + i * 32 * fs, I.w - 32, 20 * fs, 2); });
      panelEdge(ctx, I);
    }
  }

  /* ---- 특징 표 꾸미기 ---- */
  const TAGS = [
    { id: 'dense', text: '밀도가 크다', row: 0, side: 't', say: '지구형 행성의 평균 밀도는 약 4~5.5 g/cm³로 커요.' },
    { id: 'light', text: '밀도가 작다', row: 0, side: 'j', say: '목성형 행성의 평균 밀도는 0.7~1.6 g/cm³로 작아요.' },
    { id: 'ringN', text: '고리가 없다', row: 1, side: 't', say: '지구형 행성에는 고리가 없어요.' },
    { id: 'ringY', text: '고리가 있다', row: 1, side: 'j', say: '목성형 행성에는 고리가 있어요. (토성은 뚜렷, 나머지는 희미)' },
    { id: 'moonF', text: '위성이 없거나 적다', row: 2, side: 't', say: '지구형 행성의 위성은 0~2개로 적어요.' },
    { id: 'moonM', text: '위성이 많다', row: 2, side: 'j', say: '목성형 행성은 위성이 16개 이상으로 많아요.' },
  ];
  const TROWS = [
    { label: '질량·반지름', t: '작다', j: '크다', pre: true },
    { label: '평균 밀도', row: 0 },
    { label: '고리', row: 1 },
    { label: '위성 수', row: 2 },
    { label: '표면 상태', t: '단단한 암석 표면', j: '단단한 표면 없음 (기체)', pre: true },
  ];
  S.tags = TAGS.map((d) => ({ d, where: 'tray', sx: mkSpring(), sy: mkSpring(), dragL: null, ret: null, snap: null, shakeT: 0, bounceT: 0, grab: { x: 0, y: 0 } }));
  function tableGeo(L) {
    if (L.col) {
      const T = { x: 8, y: 8, w: 540, h: 584 }, lw = 124, cw = (T.w - 28 - lw) / 2, hh = 52, rh = (T.h - 50 - hh - 18) / 5;
      return { T, tray: { x: 556, y: 8, w: 236, h: 584 }, lx: T.x + 14, lw, cw, hh, rh, y0: T.y + 50, tag: { w: 208, h: 50, gap: 16, x: 556 + 14, y: 8 + 60, cols: 1 } };
    }
    const T = { x: 8, y: 8, w: 504, h: 438 }, lw = 108, cw = (T.w - 28 - lw) / 2, hh = 46, rh = (T.h - 46 - hh - 14) / 5;
    return { T, tray: { x: 8, y: 454, w: 504, h: 384 }, lx: T.x + 14, lw, cw, hh, rh, y0: T.y + 44, tag: { w: 236, h: 62, gap: 14, x: 8 + 12, y: 454 + 58, cols: 2 } };
  }
  function cellRect(L, row, side) {
    const G = tableGeo(L), x = G.lx + G.lw + (side === 't' ? 0 : G.cw), y = G.y0 + G.hh + row * G.rh;
    return { x: x + 3, y: y + 3, w: G.cw - 6, h: G.rh - 6 };
  }
  function tagTrayPos(L, i) {
    const G = tableGeo(L), g = G.tag;
    if (g.cols === 1) return { x: g.x + g.w / 2, y: g.y + i * (g.h + g.gap) + g.h / 2 + 8 };
    return { x: g.x + (i % 2) * (g.w + g.gap) + g.w / 2, y: g.y + Math.floor(i / 2) * (g.h + g.gap) + g.h / 2 + 4 };
  }
  const tagCell = (L, d) => { const r = cellRect(L, TROWS.findIndex((q) => q.row === d.row), d.side); return { x: r.x + r.w / 2, y: r.y + r.h / 2, r }; };
  function tagPos(L, c) {
    const i = TAGS.indexOf(c.d);
    if (c.where === 'tray') return Object.assign(tagTrayPos(L, i), { k: 0 });
    if (c.where === 'drag') return c.dragL === L.key ? { x: c.sx.value, y: c.sy.value, k: 1 } : Object.assign(tagTrayPos(L, i), { k: 0 });
    const tg = tagCell(L, c.d);
    if (c.where === 'placed') return { x: tg.x, y: tg.y, k: 2 };
    if (c.where === 'snap') { const A = c.snap, from = A.L === L.key ? A : tagTrayPos(L, i), e = EZ.outBack(clamp(A.u, 0, 1)); return { x: lerp(from.x, tg.x, e), y: lerp(from.y, tg.y, e), k: lerp(1, 2, EZ.outCubic(clamp(A.u, 0, 1))) }; }
    if (c.where === 'return') { const R = c.ret, to = tagTrayPos(L, i), from = R.L === L.key ? R : to, e = EZ.outBack(clamp(R.u, 0, 1)); return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), k: 1 - clamp(R.u * 1.3, 0, 1) }; }
    return Object.assign(tagTrayPos(L, i), { k: 0 });
  }
  const tagsPlaced = () => S.tags.filter((c) => c.where === 'placed').length;
  function resetTags() { S.tags.forEach((c) => { c.where = 'tray'; c.ret = null; c.snap = null; }); }
  function updateTags(dt) {
    S.tags.forEach((c) => {
      if (c.where === 'drag') { c.sx.update(dt); c.sy.update(dt); }
      else if (c.where === 'snap') { c.snap.u += dt / 0.45; if (c.snap.u >= 1) { c.where = 'placed'; c.snap = null; c.bounceT = nowS(); } }
      else if (c.where === 'return') { c.ret.u += dt / 0.5; if (c.ret.u >= 1) { c.where = 'tray'; c.ret = null; } }
    });
  }
  function cellAt(L, x, y) {
    for (let row = 0; row < 5; row++) {
      if (!TROWS[row].pre) for (const side of ['t', 'j']) { const r = cellRect(L, row, side); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { row: TROWS[row].row, trow: row, side }; }
    }
    return null;
  }
  function drawTagToken(ctx, L, c, x, y, lift, k) {
    const G = tableGeo(L), w = G.tag.w, h = G.tag.h;
    let sx = x;
    if (c.shakeT && nowS() - c.shakeT < 0.35) { const a = (nowS() - c.shakeT) / 0.35; sx += Math.sin(a * 30) * 6 * (1 - a); }
    const sq = c.bounceT && nowS() - c.bounceT < 0.4 ? 1 + Math.sin((nowS() - c.bounceT) / 0.4 * Math.PI * 2) * 0.1 * (1 - (nowS() - c.bounceT) / 0.4) : 1;
    const sc = lerp(1, Math.min(1, (G.cw - 22) / w), clamp(k - 1, 0, 1)) * (placedTight(L) ? 1 : 1);
    ctx.save(); ctx.translate(sx, y); ctx.scale((1 - lift * 0.2) * sc * (2 - sq), (1 - lift * 0.2) * sc * sq);
    ctx.shadowColor = 'rgba(0,0,0,' + (0.3 + lift * 0.2) + ')'; ctx.shadowBlur = 8 + lift * 14; ctx.shadowOffsetY = 3 + lift * 6;
    roundRect(ctx, -w / 2, -h / 2, w, h, h / 2 * 0.7);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, k >= 2 ? '#2f6f5a' : '#2d4d95'); g.addColorStop(1, k >= 2 ? '#1b4a3c' : '#1a3270');
    ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = lift ? '#5eead4' : k >= 2 ? 'rgba(110,231,183,.8)' : 'rgba(170,200,255,.7)'; ctx.lineWidth = lift ? 2.6 : 1.6; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + Math.round(15 * L.fs * (L.col ? 1 : 0.9)) + 'px ' + FONT;
    ctx.fillText(c.d.text, 0, 1); ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
  function placedTight() { return false; }
  function drawTable(ctx, L, t, V) {
    const G = tableGeo(L), T = G.T, fs = L.fs;
    panelBase(ctx, T, L.starsTable, t);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('📋 지구형 행성과 목성형 행성 비교표', T.x + 14, T.y + 28 * fs);
    // 머리줄
    const hx = G.lx + G.lw, hy = G.y0;
    ['t', 'j'].forEach((sd, k) => {
      const x = hx + k * G.cw + 3;
      roundRect(ctx, x, hy, G.cw - 6, G.hh - 6, 10); ctx.fillStyle = rgba(GROUP[sd].col, 0.92); ctx.fill();
      ctx.fillStyle = '#10182e'; ctx.font = fnt(L, 15, 'bold'); ctx.textAlign = 'center'; ctx.fillText(GROUP[sd].name, x + (G.cw - 6) / 2, hy + (G.hh - 6) / 2 + 5);
    });
    const dr = S.tags.find((c) => c.where === 'drag' && c.dragL === L.key);
    const over = dr ? cellAt(L, dr.sx.value, dr.sy.value) : null;
    TROWS.forEach((row, ri) => {
      const y = G.y0 + G.hh + ri * G.rh;
      roundRect(ctx, G.lx, y + 3, G.lw - 6, G.rh - 6, 10); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
      ctx.fillStyle = '#e3ebff'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      wrapLines(ctx, row.label, G.lx + (G.lw - 6) / 2, y + G.rh / 2, G.lw - 16, 17 * fs);
      ['t', 'j'].forEach((sd) => {
        const r = cellRect(L, ri, sd);
        roundRect(ctx, r.x, r.y, r.w, r.h, 10);
        if (row.pre) {
          ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,190,255,.22)'; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.fillStyle = '#cfe0ff'; ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'center';
          wrapLines(ctx, row[sd], r.x + r.w / 2, r.y + r.h / 2, r.w - 16, 17 * fs);
        } else {
          const hot = over && over.trow === ri && over.side === sd;
          ctx.fillStyle = hot ? 'rgba(94,234,212,.2)' : 'rgba(255,255,255,.04)'; ctx.fill();
          ctx.setLineDash(hot ? [] : [6, 5]); ctx.strokeStyle = hot ? '#5eead4' : 'rgba(160,190,255,.4)'; ctx.lineWidth = hot ? 2.6 : 1.4; ctx.stroke(); ctx.setLineDash([]);
        }
      });
    });
    ctx.textBaseline = 'alphabetic';
    panelEdge(ctx, T);
    // 꼬리표 상자
    const Q = G.tray;
    panelBase(ctx, Q, null, t);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold'); ctx.fillText('🏷️ 꼬리표 (' + tagsPlaced() + ' / 6)', Q.x + 14, Q.y + 28 * fs);
    ctx.font = fnt(L, 12.5); ctx.fillStyle = '#9fb3e0'; ctx.fillText('알맞은 칸으로 끌어다 놓아요', Q.x + 14, Q.y + 46 * fs);
    TAGS.forEach((d, i) => { const p = tagTrayPos(L, i), g = G.tag; roundRect(ctx, p.x - g.w / 2, p.y - g.h / 2, g.w, g.h, g.h / 2 * 0.7); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(160,190,255,.25)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]); });
    panelEdge(ctx, Q);
    // 꼬리표
    S.tags.slice().sort((a, b) => ({ drag: 3, snap: 2, return: 2, placed: 1 }[a.where] || 0) - ({ drag: 3, snap: 2, return: 2, placed: 1 }[b.where] || 0)).forEach((c) => {
      const p = tagPos(L, c);
      drawTagToken(ctx, L, c, p.x, p.y, c.where === 'drag' ? 1 : 0, p.k);
    });
    // 처음 안내
    if (!S.tagHint && tagsPlaced() === 0 && !dr) { const p = tagTrayPos(L, 0); const pu = RM ? 0.5 : 0.5 + 0.5 * Math.sin(t * 4); const g = G.tag; ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(94,234,212,' + (0.45 + 0.5 * pu) + ')'; ctx.lineWidth = 2.4; roundRect(ctx, p.x - g.w / 2 - 4, p.y - g.h / 2 - 4, g.w + 8, g.h + 8, 18); ctx.stroke(); ctx.setLineDash([]); }
    // 안내/피드백 알약
    if (S.tipMsg && nowS() - S.tipMsg.t0 < 3) { ctx.globalAlpha = clamp((3 - (nowS() - S.tipMsg.t0)) * 2, 0, 1); pill(ctx, S.tipMsg.text, T.x + T.w / 2, T.y + T.h - 20 * fs, { font: fnt(L, 13.5, 'bold'), h: Math.round(28 * fs), pad: 12, bg: S.tipMsg.good ? 'rgba(6,95,70,.96)' : 'rgba(127,29,29,.96)', color: '#fff' }); ctx.globalAlpha = 1; }
    void V;
  }
  function wrapLines(ctx, text, x, y, maxW, lh) {
    const w = ctx.measureText(text).width;
    if (w <= maxW) { ctx.fillText(text, x, y); return; }
    const parts = text.split(' '); let l1 = '', i = 0;
    while (i < parts.length && ctx.measureText((l1 ? l1 + ' ' : '') + parts[i]).width <= maxW) { l1 += (l1 ? ' ' : '') + parts[i]; i++; }
    const l2 = parts.slice(i).join(' ');
    if (!l1) { l1 = text.slice(0, Math.ceil(text.length / 2)); ctx.fillText(l1, x, y - lh / 2); ctx.fillText(text.slice(l1.length), x, y + lh / 2); return; }
    ctx.fillText(l1, x, y - lh / 2); ctx.fillText(l2, x, y + lh / 2);
  }

  /* ---------- 효과: 퍼지는 고리 ---------- */
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
    ACTIVE_L = L;
    const sc = S.scene;
    if (sc === 'scope') { drawSky(ctx, L, t); drawEyepiece(ctx, L, t); }
    else if (sc === 'graph') drawGraphScene(ctx, L, t, V);
    else if (sc === 'probe') drawProbeScene(ctx, L, t, V);
    else if (sc === 'orbits') drawOrbits(ctx, L, t);
    else drawTable(ctx, L, t, V);
    if (sc !== 'probe') V.P.draw(ctx);
    drawFx(ctx, V);
    if (S.sceneA < 0.995) { ctx.fillStyle = 'rgba(7,13,31,' + ((1 - S.sceneA) * 0.94) + ')'; ctx.fillRect(0, 0, L.vw, L.vh); }
  }

  /* =========================================================
     조작
     ========================================================= */
  const focusEl = $('#sFocus'), focusOut = $('#oFocus'), nightBtn = $('#nightBtn'), probeBtn = $('#probeBtn'), resetBtn = $('#resetBtn');
  const aimLerp = (a, b, u) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * u; };
  S.aimFrom = 'jupiter'; S.aimTo = 'jupiter'; S.aimU = 1; S.probeFade = 1; S.tagHint = false;
  function curAim(L) { return aimLerp(aimAngle(L, S.aimFrom), aimAngle(L, S.aimTo), S.aimU); }
  function selectPlanet(id) {
    if (S.scene !== 'scope' || (id === S.aimTo && !S.slew)) return;
    S.scopeHint = false; Sound.click();
    S.aimFrom = S.aimU > 0.5 ? S.aimTo : S.aimFrom; S.aimTo = id; S.aimU = 0; S.slew = id; S.held = 0;
    SciSim.tween(S, { aimU: 1 }, { duration: 0.6, ease: 'inOutCubic' });
    SciSim.tween(S, { eyeA: 0 }, { duration: 0.28, ease: 'outCubic', onDone() {
      S.sel = id; S.slew = null; S.held = 0; syncControls();
      SciSim.tween(S, { eyeA: 1 }, { duration: 0.45, delay: 0.12, ease: 'outCubic' });
    } });
    syncControls();
  }
  function recRow(n) { return { night: n + 1, xs: GAL.map((m) => galX(m, n)) }; }
  function resetScope() {
    S.got = {}; S.held = 0; S.night = 0; S.nightsJ = 0; S.tDay = 0; S.ghost = null; S.rec = [recRow(0)]; S.recSlide = 1;
    S.sel = 'jupiter'; S.aimFrom = S.aimTo = 'jupiter'; S.aimU = 1; S.slew = null; S.eyeA = 1; S.scopeHint = true;
    setFocus(12);
  }
  function setFocus(v) { S.focus = v; focusEl.value = v; focusEl.dispatchEvent(new Event('input')); }
  SciSim.bindRange(focusEl, null, null, (v) => { S.focus = v; });
  function nextNight() {
    if (S.sel !== 'jupiter' || S.slew) return;
    S.ghost = S.night; S.night++; S.nightsJ++;
    SciSim.tween(S, { tDay: S.night }, { duration: 0.8, ease: 'inOutCubic' });
    S.rec.push(recRow(S.night)); S.recSlide = 0;
    SciSim.tween(S, { recSlide: 1 }, { duration: 0.6, delay: 0.55, ease: 'outCubic' });
    Sound.tone(520 + 40 * Math.min(S.night, 6), 0.1, 'triangle', 0.07);
    syncControls();
  }
  nightBtn.addEventListener('click', nextNight);
  probeBtn.addEventListener('click', () => { Sound.click(); startProbe(); });
  resetBtn.addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'graph') {
      if (game && !isFree() && game.level === 1 && game.index === 3) { S.colors = {}; S.groupsOk = false; S.ellOpen = false; S.ellA = 0; }
      else resetChips();
    } else if (S.scene === 'table') resetTags();
    syncControls();
  });
  function setScene(s) {
    if (S.scene !== s) { S.scene = s; S.sceneA = 0; SciSim.tween(S, { sceneA: 1 }, { duration: 0.45, ease: 'outCubic' }); }
    syncControls();
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.showX = false; showX(false); setScene(b.dataset.s); }));
  function showX(v) { S.showX = v; SciSim.tween(S, { xA: v ? 1 : 0 }, { duration: 0.5, ease: 'outCubic' }); }
  function syncControls() {
    const free = isFree(), sc = S.scene;
    $('#cScene').classList.toggle('is-off', !free);
    $('#cFocus').classList.toggle('is-off', sc !== 'scope');
    $('#cNight').classList.toggle('is-off', sc !== 'scope');
    $('#cProbe').classList.toggle('is-off', sc !== 'probe');
    const resetOn = sc === 'table' || (sc === 'graph' && !S.showX);
    $('#cReset').classList.toggle('is-off', !resetOn);
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === sc));
    const jup = S.sel === 'jupiter' && !S.slew;
    nightBtn.disabled = !jup;
    $('#nightNote').textContent = jup ? '같은 시각에 하루 뒤의 밤하늘을 봐요. (' + S.night + '번 넘김)' : '목성을 보고 있을 때 눌러요.';
    const running = S.probe && !S.probe.done;
    probeBtn.disabled = !!running;
    probeBtn.innerHTML = running ? '⏳ 하강 중…' : S.probe && S.probe.done ? '🔁 다시 투하' : '🚀 탐사선 투하';
    $('#probeNote').textContent = running ? '탐사선이 내려가는 모습을 지켜봐요.' : '위에서 행성을 고른 뒤 눌러요.';
    resetBtn.innerHTML = sc === 'graph' && game && !free && game.level === 1 && game.index === 3 ? '↺ 색 지우기' : '↺ 되돌리기';
    const any = ['#cScene', '#cFocus', '#cNight', '#cProbe', '#cReset'].some((q) => { const n = $(q); return !n.classList.contains('is-off') && !n.hidden; });
    $('#ctrlCard').hidden = !any;
  }

  /* ---------- 포인터 ---------- */
  function hitSky(L, p) {
    let best = null, bd = 1e9;
    SKY.forEach((s) => { const q = skyPos(L, s.id), d = Math.hypot(p.x - q.x, p.y - q.y); if (d < 30 * L.fs && d < bd) { bd = d; best = s.id; } });
    return best;
  }
  function hitRow(L, p) {
    for (let i = 0; i < PL.length; i++) {
      if (S.chips[i].where !== 'row') continue;
      const r = rowRect(L, i);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return S.chips[i];
    }
    return null;
  }
  function hitDot(L, p) {
    let best = null, bd = 1e9;
    PL.forEach((q) => { const c = chipOf(q.id); if (c.where !== 'placed') return; const d0 = dotPos(L, q), d = Math.hypot(p.x - d0.x, p.y - d0.y); if (d < 22 && d < bd) { bd = d; best = q.id; } });
    return best;
  }
  function hitProbeChip(L, p) {
    const G = probeGeo(L);
    for (let i = 0; i < G.chips.length; i++) { const r = G.chips[i]; if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return PL[i].id; }
    return null;
  }
  function hitTag(L, p) {
    const G = tableGeo(L), g = G.tag;
    for (let i = S.tags.length - 1; i >= 0; i--) {
      const c = S.tags[i]; if (c.where !== 'tray') continue;
      const q = tagTrayPos(L, i);
      if (Math.abs(p.x - q.x) < g.w / 2 + 4 && Math.abs(p.y - q.y) < g.h / 2 + 4) return c;
    }
    return null;
  }
  const canDragChips = () => on('table') || isFree();
  const canColor = () => placedCount() >= 8 && (isFree() || (game && game.level >= 1 && game.index >= 3));
  function tip(text, good) { S.tipMsg = { text, good: !!good, t0: nowS() }; }
  function attachPointer(V) {
    const { v, L } = V;
    let drag = null;
    SciSim.pointer(v, {
      hover(p) {
        if (S.scene === 'scope') return hitSky(L, p) ? 'pointer' : null;
        if (S.scene === 'graph') return (canDragChips() && hitRow(L, p)) ? 'grab' : (canColor() && hitDot(L, p) ? 'pointer' : null);
        if (S.scene === 'probe') return hitProbeChip(L, p) ? 'pointer' : null;
        if (S.scene === 'table') return hitTag(L, p) ? 'grab' : null;
        return null;
      },
      down(p, e) {
        const lift = e && e.pointerType === 'touch' ? 34 : 0;
        if (S.scene === 'scope') { const id = hitSky(L, p); if (id) selectPlanet(id); return false; }
        if (S.scene === 'probe') { const id = hitProbeChip(L, p); if (id) selectProbe(id); return false; }
        if (S.scene === 'graph') {
          if (canDragChips()) {
            const c = hitRow(L, p);
            if (c) {
              const q = rowCenter(L, PI[c.id].i);
              c.where = 'drag'; c.dragL = L.key; c.sx.value = q.x; c.sy.value = q.y; c.sx.velocity = c.sy.velocity = 0;
              c.grab = { x: 0, y: lift }; c.sx.target = p.x; c.sy.target = p.y - lift; S.tagHint = true;
              drag = { type: 'chip', c }; Sound.tone(620, 0.05, 'triangle', 0.05); v.canvas.style.cursor = 'grabbing';
              return true;
            }
          }
          if (canColor()) {
            const id = hitDot(L, p);
            if (id) {
              S.colors[id] = S.colors[id] === 1 ? 2 : 1; Sound.click();
              const d0 = dotPos(L, PI[id]); ringFx(V, d0.x, d0.y, 12, COLORS[S.colors[id]].col);
              return false;
            }
          }
          return false;
        }
        if (S.scene === 'table') {
          const c = hitTag(L, p);
          if (c) {
            const q = tagTrayPos(L, TAGS.indexOf(c.d));
            c.where = 'drag'; c.dragL = L.key; c.sx.value = q.x; c.sy.value = q.y; c.sx.velocity = c.sy.velocity = 0;
            c.grab = { x: 0, y: lift }; c.sx.target = p.x; c.sy.target = p.y - lift; S.tagHint = true;
            drag = { type: 'tag', c }; Sound.tone(620, 0.05, 'triangle', 0.05); v.canvas.style.cursor = 'grabbing';
            return true;
          }
        }
        return false;
      },
      move(p) {
        if (!drag) return;
        const c = drag.c; c.sx.target = p.x - c.grab.x; c.sy.target = p.y - c.grab.y;
      },
      up(p) {
        v.canvas.style.cursor = '';
        if (!drag) return;
        const c = drag.c, x = c.sx.target, y = c.sy.target;
        if (drag.type === 'chip') {
          const G = graphGeo(L), P = PI[c.id];
          const rv = (x - G.px) / G.pw * 12, dv = (G.py + G.ph - y) / G.ph * 6;
          const inPlot = x > G.px - 12 && x < G.px + G.pw + 12 && y > G.py - 12 && y < G.py + G.ph + 12;
          if (inPlot && Math.abs(rv - P.R) <= SNAP_DX && Math.abs(dv - P.rho) <= SNAP_DY) {
            startSnap(c, L, c.sx.value, c.sy.value);
            Sound.tone(880, 0.12, 'triangle', 0.08);
            V2.forEach((W) => { const d0 = dotPos(W.L, P); ringFx(W, d0.x, d0.y, 14); W.P.burst(d0.x, d0.y, { count: 12, colors: ['#34d399', '#5eead4', '#fde68a'], speed: 110, gravity: 100, size: 3 }); });
            tip('✅ ' + P.name + ' (반지름 ' + P.R + ', 밀도 ' + P.rho.toFixed(2) + ')', true);
          } else {
            startReturnChip(c, L, c.sx.value, c.sy.value);
            if (inPlot) { c.shakeT = nowS(); Sound.fail(); tip('🤔 자료표의 ' + P.name + ' 값을 다시 확인해요', false); }
          }
        } else {
          const cell = cellAt(L, x, y), d = c.d;
          if (cell && cell.row === d.row && cell.side === d.side) {
            c.where = 'snap'; c.snap = { L: L.key, x: c.sx.value, y: c.sy.value, u: 0 };
            Sound.tone(880, 0.12, 'triangle', 0.08);
            V2.forEach((W) => { const q = tagCell(W.L, d); ringFx(W, q.x, q.y, 22); W.P.burst(q.x, q.y, { count: 12, colors: ['#34d399', '#5eead4', '#fde68a'], speed: 110, gravity: 100, size: 3 }); });
            tip('✅ ' + GROUP[d.side].short + ' 행성: ' + d.text, true);
          } else {
            c.where = 'return'; c.ret = { L: L.key, x: c.sx.value, y: c.sy.value, u: 0 };
            if (cell) { c.shakeT = nowS(); Sound.fail(); tip(cell.row !== d.row ? '🤔 이 칸은 \'' + TROWS[cell.trow].label + '\' 칸이에요' : '🤔 ' + d.say, false); }
          }
        }
        drag = null;
      },
    });
    if (L.key === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0]; if (!tc) return;
        const p = v.toLocal(tc);
        // pointerdown은 touchstart보다 먼저 일어나므로, 이미 끌기가 시작됐으면(drag) 페이지 스크롤을 막아요
        if (drag || (S.scene === 'graph' && canDragChips() && hitRow(L, p)) || (S.scene === 'table' && hitTag(L, p))) e.preventDefault();
      }, { passive: false });
    }
  }
  const V2 = [];
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#070d1f' });
    const sg = scopeGeo(L), gg = graphGeo(L), pg = probeGeo(L), tg = tableGeo(L), og = orbitGeo(L);
    L.starsSky = makeStars(sg.sky, 70, k === 'wide' ? 3 : 5);
    L.starsEye = makeStars(sg.eyeP, 36, 17);
    L.starsLens = makeStars({ x: sg.cx - sg.r, y: sg.cy - sg.r, w: sg.r * 2, h: sg.r * 2 }, 46, 29);
    L.starsGraph = makeStars(gg.gp, 26, 31);
    L.starsTable = makeStars(gg.tp, 22, 37);
    L.starsProbe = makeStars(pg.win, 90, 41);
    L.starsOrbit = makeStars(og.P, 90, 43);
    void tg;
    const V = { v, L, fx: [], P: new SciSim.Particles() };
    attachPointer(V);
    V2.push(V);
    return V;
  });
  const activeView = () => views.find((V) => V.v.canvas.offsetWidth > 0) || views[0];

  /* =========================================================
     퀴즈 그림·노트 그림 (SVG)
     ========================================================= */
  const SVG_OPEN = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FONT.replace(/"/g, '') + '\'>';
  const sGrad = (id, c0, c1) => '<radialGradient id="' + id + '" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="' + c0 + '"/><stop offset="1" stop-color="' + c1 + '"/></radialGradient>';
  const FIG = {};
  FIG.dots = (function () {
    const W = 340, H = 196, x0 = 86, x1 = 322, cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 - 8;
    let s = SVG_OPEN(W, H, '목성 곁의 밝은 점 네 개를 4일 동안 관측한 기록') + '<defs>' + sGrad('fdJ', '#f6e3c0', '#a8703f') + '</defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    s += '<text x="14" y="26" font-size="14" font-weight="800" fill="#ffe9a8">📓 목성 관측 기록 (같은 시각)</text>';
    for (let n = 0; n < 4; n++) {
      const y = 56 + n * 36;
      s += '<text x="14" y="' + (y + 5) + '" font-size="13" font-weight="700" fill="#c7d3f2">' + (n + 1) + '일째 밤</text>';
      s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#a0beff" stroke-opacity=".3"/>';
      s += '<circle cx="' + cx + '" cy="' + y + '" r="9" fill="url(#fdJ)"/>';
      GAL.forEach((m) => { s += '<circle cx="' + (cx + galX(m, n) / 172 * hw).toFixed(1) + '" cy="' + y + '" r="3.8" fill="' + m.col + '"/>'; });
    }
    s += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12.5" font-weight="700" fill="#9fb3e0">가운데 큰 원 = 목성</text>';
    return s + '</svg>';
  })();
  FIG.density = (function () {
    const W = 340, H = 156, x0 = 70, x1 = 320, sc = (x1 - x0) / 6;
    let s = SVG_OPEN(W, H, '물, 토성, 지구의 평균 밀도 비교') + '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    [['물', 1.0, '#60a5fa'], ['토성', 0.69, '#e0c68c'], ['지구', 5.51, '#34d399']].forEach((b, i) => {
      const y = 22 + i * 40;
      s += '<text x="14" y="' + (y + 17) + '" font-size="14" font-weight="800" fill="#fff">' + b[0] + '</text>';
      s += '<rect x="' + x0 + '" y="' + y + '" width="' + (b[1] * sc).toFixed(1) + '" height="24" rx="6" fill="' + b[2] + '"/>';
      s += '<text x="' + (x0 + b[1] * sc + 8).toFixed(1) + '" y="' + (y + 17) + '" font-size="13" font-weight="800" fill="#e9f0ff">' + b[1].toFixed(2) + '</text>';
    });
    s += '<line x1="' + (x0 + sc) + '" y1="14" x2="' + (x0 + sc) + '" y2="136" stroke="#7dd3fc" stroke-dasharray="4 4"/>';
    s += '<text x="' + (x0 + sc + 6) + '" y="150" font-size="12" font-weight="700" fill="#7dd3fc">물 = 1</text>';
    s += '<text x="' + x1 + '" y="150" text-anchor="end" font-size="12" font-weight="700" fill="#9fb3e0">평균 밀도 (g/cm³)</text>';
    return s + '</svg>';
  })();
  FIG.rings = (function () {
    const W = 360, H = 150;
    let s = SVG_OPEN(W, H, '여덟 행성의 고리') + '<defs>';
    PL.forEach((p) => { s += sGrad('fr' + p.id, shade(p.col, 0.5), shade(p.col, -0.35)); });
    s += '</defs><rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    PL.forEach((p, i) => {
      const cx = 24 + i * 44.5, cy = 62, r = [5, 7, 7.5, 6, 15, 13, 10, 10][i];
      const g = GROUP[p.g];
      if (p.id === 'saturn') s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (r * 2.2) + '" ry="' + (r * 0.62) + '" fill="none" stroke="#f0e0b4" stroke-width="5" transform="rotate(-18 ' + cx + ' ' + cy + ')" opacity=".55"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#fr' + p.id + ')"/>';
      if (p.id === 'saturn') s += '<path d="M' + (cx - r * 2.2) + ',' + cy + ' A' + (r * 2.2) + ',' + (r * 0.62) + ' 0 0 0 ' + (cx + r * 2.2) + ',' + cy + '" fill="none" stroke="#f0e0b4" stroke-width="5" opacity=".95" transform="rotate(-18 ' + cx + ' ' + cy + ')"/>';
      if (p.ring === 1) s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (r * 1.55) + '" ry="' + (r * 0.4) + '" fill="none" stroke="#cfe0ff" stroke-width="1.3" stroke-dasharray="3 2" opacity=".85" transform="rotate(-18 ' + cx + ' ' + cy + ')"/>';
      s += '<text x="' + cx + '" y="108" text-anchor="middle" font-size="12.5" font-weight="800" fill="#fff">' + p.name + '</text>';
      s += '<text x="' + cx + '" y="126" text-anchor="middle" font-size="12" font-weight="700" fill="' + (p.ring === 2 ? '#fde68a' : p.ring === 1 ? '#bfd9ff' : '#9fb3e0') + '">' + (p.ring === 2 ? '뚜렷' : p.ring === 1 ? '희미' : '없음') + '</text>';
      s += '<rect x="' + (cx - 17) + '" y="140" width="34" height="4" rx="2" fill="' + g.col + '"/>';
    });
    s += '<text x="12" y="22" font-size="13" font-weight="800" fill="#ffd36b">💍 행성의 고리 (탐사선·큰 망원경 관측)</text>';
    return s + '</svg>';
  })();
  FIG.x = (function () {
    const W = 320, H = 150;
    let s = SVG_OPEN(W, H, '외계 행성 X의 자료') + '<defs>' + sGrad('fxX', '#ede9fe', '#5b21b6') + '</defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/><rect x="10" y="10" width="300" height="130" rx="10" fill="#14214f" stroke="#a78bfa" stroke-opacity=".6"/>';
    s += '<circle cx="62" cy="75" r="34" fill="url(#fxX)"/><text x="62" y="86" text-anchor="middle" font-size="30" font-weight="800" fill="#fff">?</text>';
    s += '<text x="118" y="42" font-size="15" font-weight="800" fill="#ddd6fe">🛰️ 새로 발견된 행성 X</text>';
    [['반지름', '지구의 1.3배'], ['평균 밀도', '5.0 g/cm³'], ['고리', '없음']].forEach((r, i) => {
      s += '<text x="118" y="' + (70 + i * 25) + '" font-size="14" font-weight="700" fill="#c7d3f2">' + r[0] + '</text><text x="196" y="' + (70 + i * 25) + '" font-size="14" font-weight="800" fill="#fff">' + r[1] + '</text>';
    });
    return s + '</svg>';
  })();
  function miniGraphSVG() {
    const W = 330, H = 190, px = 40, py = 14, pw = 270, ph = 138, X = (r) => px + r / 12 * pw, Y = (d) => py + ph - d / 6 * ph;
    let s = SVG_OPEN(W, H, '반지름과 평균 밀도 그래프: 두 무리') + '<rect width="' + W + '" height="' + H + '" rx="10" fill="#0e1838"/>';
    for (let d = 0; d <= 6; d += 2) s += '<line x1="' + px + '" y1="' + Y(d) + '" x2="' + (px + pw) + '" y2="' + Y(d) + '" stroke="#a0beff" stroke-opacity=".2"/><text x="' + (px - 6) + '" y="' + (Y(d) + 4) + '" text-anchor="end" font-size="11" fill="#c7d3f2">' + d + '</text>';
    for (let r = 0; r <= 12; r += 4) s += '<text x="' + X(r) + '" y="' + (py + ph + 15) + '" text-anchor="middle" font-size="11" fill="#c7d3f2">' + r + '</text>';
    s += '<line x1="' + px + '" y1="' + py + '" x2="' + px + '" y2="' + (py + ph) + '" stroke="#e6eeff" stroke-opacity=".7"/><line x1="' + px + '" y1="' + (py + ph) + '" x2="' + (px + pw) + '" y2="' + (py + ph) + '" stroke="#e6eeff" stroke-opacity=".7"/>';
    s += '<ellipse cx="' + X(0.72) + '" cy="' + Y(5.0) + '" rx="30" ry="26" fill="rgba(251,146,60,.18)" stroke="#fb923c" stroke-dasharray="4 3"/><ellipse cx="' + X(7.1) + '" cy="' + Y(1.0) + '" rx="64" ry="26" fill="rgba(96,165,250,.18)" stroke="#60a5fa" stroke-dasharray="4 3"/>';
    PL.forEach((p) => { s += '<circle cx="' + X(p.R).toFixed(1) + '" cy="' + Y(p.rho).toFixed(1) + '" r="5" fill="' + p.col + '" stroke="#fff" stroke-width="1"/>'; });
    s += '<text x="' + (X(0.72) + 34) + '" y="' + (Y(5.0) - 22) + '" font-size="12" font-weight="800" fill="#ffd2a8">지구형</text><text x="' + (X(7.1)) + '" y="' + (Y(1.0) + 40) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#bfd9ff">목성형</text>';
    s += '<text x="' + (px + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="#9fb3e0">반지름(지구 = 1) → · 세로: 평균 밀도(g/cm³)</text>';
    return s + '</svg>';
  }
  const CMP_TABLE = '<table class="cmp"><tr><th></th><th class="t">지구형 행성</th><th class="j">목성형 행성</th></tr>' +
    '<tr><td class="k">행성</td><td>수성·금성·지구·화성</td><td>목성·토성·천왕성·해왕성</td></tr>' +
    '<tr><td class="k">질량·반지름</td><td>작다</td><td>크다</td></tr>' +
    '<tr><td class="k">평균 밀도</td><td>크다</td><td>작다</td></tr>' +
    '<tr><td class="k">위성</td><td>없거나 적다</td><td>많다</td></tr>' +
    '<tr><td class="k">고리</td><td>없다</td><td>있다 (토성은 뚜렷)</td></tr>' +
    '<tr><td class="k">표면</td><td>단단한 암석 표면</td><td>주로 기체, 단단한 표면 없음</td></tr></table>';

  /* =========================================================
     단계별 학습
     ========================================================= */
  const nameChips = (ids, got) => ids.map((id) => chk(got(id), PI[id].name)).join(' · ');
  game = SciSim.game({
    simId: 'm1-planet-types',
    mount: '#game',
    badge: '행성 분류가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      scope: '🔭 망원경 관측',
      focus: '🎚️ 초점 손잡이',
      table: '📋 행성 자료표',
      graph: '📊 자료 그래프',
      probe: '🚀 탐사선 투하',
      rings: '💍 고리 보기',
    },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart() { S.tipMsg = null; },
    onComplete() { showX(false); setScene('scope'); syncControls(); },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '망원경으로 본 행성', short: '망원경 관측', icon: '🔭', phase: '관찰',
        features: ['scope', 'focus'],
        intro: '<p class="si-q">❓ 탐구 질문: 망원경으로 본 행성들은 서로 어떤 점이 다를까? 행성들을 두 무리로 나눌 수 있을까?</p>' +
          '<p>해 진 뒤 하늘에서 밝게 보이는 행성을 <b>망원경</b>으로 관측해 봐요. <b>초점</b>을 맞춰야 또렷하게 보여요.</p>' +
          '<p>⚠️ <b>안전</b>: 태양은 필터 없이 망원경이나 맨눈으로 절대 보지 않아요.</p>',
        setup() { setScene('scope'); },
        recap: '망원경으로 보면 행성마다 모양·무늬·고리가 달라요. 목성 곁의 밝은 점 네 개는 목성의 위성이에요.',
        summary: '<ul><li>망원경으로 보면 행성의 <b>모양·무늬·고리·위성</b>이 서로 다르게 보여요. (목성: 띠 무늬와 위성, 토성: 뚜렷한 고리, 화성: 붉은 원반)</li>' +
          '<li>목성 곁의 점 네 개는 밤마다 위치가 바뀌는 <b>목성의 위성</b>이에요. 1610년 갈릴레이가 처음 발견했어요.</li>' +
          '<li>⚠️ 태양은 <b>필터 없이 절대</b> 직접 보지 않아요.</li></ul>',
        missions: [
          {
            title: '🔭 행성 관측 일지',
            goal: '하늘의 <b>목성·토성·화성</b>을 눌러 망원경을 돌리고, 초점을 맞춰 1초 동안 또렷하게 봐요. 목성은 <b>🌙 다음 날 밤</b>도 3번 넘겨 봐요.',
            hint: '초점 손잡이를 천천히 움직여 <b>초점 오차 10 % 이하</b>(초록 고리)로 맞춘 채 1초 동안 기다려요. 다음 날 밤 버튼은 목성을 볼 때 눌러요.',
            setup() { setScene('scope'); resetScope(); },
            check: () => !!(S.got.jupiter && S.got.saturn && S.got.mars && S.nightsJ >= 3),
            hold: 0.5,
            status: () => nameChips(['jupiter', 'saturn', 'mars'], (id) => !!S.got[id]) + ' · ' + chk(S.nightsJ >= 3, '🌙 다음 날 밤 ' + Math.min(3, S.nightsJ) + ' / 3'),
            explain: '행성마다 크기·색·무늬가 달라요. <b>토성</b>은 뚜렷한 고리가 있고, <b>목성</b>에는 띠 무늬와 곁의 밝은 점이 있어요. 목성 곁의 점은 밤마다 위치가 바뀌었죠?',
          },
          {
            type: 'quiz',
            title: '🔍 네 점의 정체',
            goal: '그림은 목성 곁의 밝은 점 네 개를 4일 동안 같은 시각에 관측한 기록이에요. 네 점은 무엇일까요?',
            figure: FIG.dots,
            setup() { setScene('scope'); S.sel = 'jupiter'; S.aimFrom = S.aimTo = 'jupiter'; S.aimU = 1; S.slew = null; S.eyeA = 1; S.scopeHint = false; setFocus(63); syncControls(); },
            choices: ['목성 뒤쪽에 있는 아주 먼 별', '목성 둘레를 도는 위성', '망원경 렌즈에 묻은 먼지', '소행성대의 소행성'],
            answer: 1,
            feedback: [
              '먼 별이라면 밤마다 목성과 함께 움직이지 않아요. 이 점들은 며칠 동안 목성 곁을 떠나지 않고 <b>좌우로 오가요</b>.',
              '',
              '렌즈의 먼지는 밤하늘의 움직임과 상관없이 늘 같은 자리에 있어요. 점들의 위치가 <b>밤마다 바뀌는 것</b>과 맞지 않아요.',
              '소행성은 태양 둘레를 돌기 때문에 목성 곁을 따라다니지 않아요.',
            ],
            explain: '네 점은 목성 둘레를 도는 큰 <b>위성</b> 4개(이오·유로파·가니메데·칼리스토)예요. <b>1610년 갈릴레이</b>가 망원경으로 처음 발견했어요.',
          },
        ],
      },
      /* ---------- 2단계 · 분석 ---------- */
      {
        title: '행성 자료 분석', short: '자료 분석', icon: '📊', phase: '분석',
        features: ['table', 'graph'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 망원경으로 행성의 모양·무늬·고리·위성이 서로 다르다는 것을 봤어요.</div>' +
          '<p>이제 <b>숫자 자료</b>로 비교해 볼까요? 자료표의 행성을 <b>그래프</b>에 찍고 <b>두 무리</b>로 묶어 봐요.</p>',
        setup() { setScene('graph'); },
        recap: '반지름과 평균 밀도 그래프에서 행성은 두 무리로 나뉘어요. 작고 밀도가 큰 무리가 지구형, 크고 밀도가 작은 무리가 목성형이에요.',
        summary: '<div class="note-fig">' + miniGraphSVG() + '</div><ul><li><b>지구형 행성</b>: 수성·금성·지구·화성 — 반지름(질량)이 <b>작고</b> 평균 밀도가 <b>커요</b>.</li>' +
          '<li><b>목성형 행성</b>: 목성·토성·천왕성·해왕성 — 반지름(질량)이 <b>크고</b> 평균 밀도가 <b>작아요</b>.</li></ul>',
        missions: [
          {
            title: '📈 그래프에 점 찍기',
            goal: '자료표의 행성을 끌어 <b>반지름(가로)</b>과 <b>평균 밀도(세로)</b>가 만나는 자리에 놓아요. 여덟 행성을 모두 찍어 봐요.',
            hint: '표에서 반지름과 밀도 숫자를 읽고, 가로축·세로축에서 그 값을 찾아 만나는 곳에 놓아요. 끄는 동안 안내선과 숫자가 따라와요.',
            setup() { setScene('graph'); resetChips(); },
            check: () => placedCount() >= 8,
            hold: 0.5,
            status: () => '찍은 행성: <b>' + placedCount() + ' / 8</b> · ' + nameChips(PL.map((p) => p.id), (id) => chipOf(id).where === 'placed'),
            explain: '자료표의 숫자를 그래프의 점으로 바꾸면, 숫자만 볼 때보다 행성들의 <b>비슷한 점과 다른 점</b>이 한눈에 보여요.',
          },
          {
            title: '🎨 두 무리로 묶기',
            goal: '점을 눌러 <b>색</b>(주황·파랑)을 바꿔서, 서로 가까이 모인 점끼리 <b>같은 색</b>이 되게 두 무리로 묶어요.',
            hint: '그래프에서 서로 가까이 모여 있는 점끼리 같은 색이 되게 눌러요. 왼쪽 위에 모인 네 점과, 오른쪽 아래의 네 점을 살펴봐요.',
            setup() { setScene('graph'); if (placedCount() < 8) fillGraph(false); S.colors = {}; S.groupsOk = false; S.ellOpen = false; S.ellA = 0; syncControls(); },
            check: () => groupCheck(),
            hold: 0.8,
            status: () => { const n1 = PL.filter((p) => S.colors[p.id] === 1).length, n2 = PL.filter((p) => S.colors[p.id] === 2).length; return '주황 <b>' + n1 + '개</b> · 파랑 <b>' + n2 + '개</b> · ' + chk(groupCheck(), '두 무리로 나뉨'); },
            explain: '반지름이 작고 밀도가 큰 점들과, 반지름이 크고 밀도가 작은 점들이 <b>두 무리</b>로 나뉘어요. 크기와 밀도를 함께 보면 행성을 두 종류로 구분할 수 있어요.',
          },
          {
            type: 'quiz',
            title: '🔍 두 무리의 차이',
            goal: '그래프의 두 무리를 비교하면 어떤 차이가 있을까요?',
            setup() { setScene('graph'); if (!groupCheck()) fillGraph(true); syncControls(); },
            choices: ['두 무리의 평균 밀도는 같다', '반지름이 큰 무리는 평균 밀도도 크다', '반지름이 큰 무리는 평균 밀도가 작다', '반지름과 평균 밀도는 서로 관계가 없다'],
            answer: 2,
            feedback: [
              '지구형은 평균 밀도가 약 4~5.5, 목성형은 약 0.7~1.6으로 <b>서로 달라요</b>.',
              '그래프에서 반지름이 큰 오른쪽 무리는 점의 높이(밀도)가 <b>더 낮아요</b>.',
              '',
              '두 무리는 반지름과 평균 밀도 모두에서 <b>뚜렷하게 나뉘어요</b>. 그래프의 점 위치를 다시 살펴봐요.',
            ],
            explain: '반지름(질량)이 작고 밀도가 큰 무리가 <b>지구형 행성</b>(수성·금성·지구·화성), 반지름(질량)이 크고 밀도가 작은 무리가 <b>목성형 행성</b>(목성·토성·천왕성·해왕성)이에요.',
          },
        ],
      },
      /* ---------- 3단계 · 설명 ---------- */
      {
        title: '두 무리의 특징', short: '두 무리', icon: '🚀', phase: '설명',
        features: ['probe', 'rings'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 행성이 <b>지구형</b>과 <b>목성형</b> 두 무리로 나뉜다는 것을 알았어요. 목성형은 크지만 밀도가 작았죠.</div>' +
          '<p>왜 그럴까요? <b>탐사선</b>을 보내 행성의 표면을 살펴봐요.</p>',
        setup() { setScene('probe'); },
        recap: '지구형 행성은 단단한 암석 표면이 있고, 목성형 행성은 주로 가벼운 기체라 단단한 표면이 없어서 평균 밀도가 작아요.',
        summary: CMP_TABLE + '<p class="note">위성 수는 새로 발견되면서 계속 바뀌어요. (2025년 무렵 기준)</p>',
        missions: [
          {
            title: '🚀 탐사선 보내기',
            goal: '<b>지구형 행성 하나</b>와 <b>목성형 행성 하나</b>에 탐사선을 보내 표면의 모습을 비교해요.',
            hint: '위쪽 칩에서 행성을 고르고 [🚀 탐사선 투하]를 눌러요. 탐사선이 내려가는 모습을 끝까지 지켜봐요.',
            setup() { setScene('probe'); S.probe = null; S.probed = {}; S.probeSel = 'earth'; syncControls(); },
            check: () => PL.some((p) => p.g === 't' && S.probed[p.id]) && PL.some((p) => p.g === 'j' && S.probed[p.id]),
            hold: 0.6,
            status: () => chk(PL.some((p) => p.g === 't' && S.probed[p.id]), '지구형 행성') + ' · ' + chk(PL.some((p) => p.g === 'j' && S.probed[p.id]), '목성형 행성'),
            explain: '<b>지구형 행성</b>은 암석으로 된 단단한 표면이 있어요. <b>목성형 행성</b>은 주로 수소·헬륨 같은 가벼운 기체로 되어 있어서 단단한 표면이 없고, 그래서 평균 밀도가 작아요.',
          },
          {
            type: 'quiz',
            title: '⚖️ 토성의 평균 밀도',
            goal: '토성의 평균 밀도는 0.69 g/cm³예요. 물의 밀도(1 g/cm³)와 비교하면 무엇을 알 수 있을까요?',
            figure: FIG.density,
            setup() { setScene('probe'); selectProbe('saturn'); syncControls(); },
            choices: ['토성은 가장 무거운 행성이다', '토성은 암석으로 이루어져 있다', '토성의 질량은 지구보다 작다', '토성의 평균 밀도는 물보다 작다'],
            answer: 3,
            feedback: [
              '토성의 질량은 지구의 약 95배지만, 목성(약 318배)이 더 무거워요. 밀도는 <b>부피에 비해 얼마나 무거운지</b>를 나타내요.',
              '암석의 밀도는 약 3~5 g/cm³로 물보다 훨씬 커요. 토성은 가벼운 <b>기체</b>가 주성분이에요.',
              '토성의 질량은 지구의 약 <b>95배</b>예요! 질량은 크지만 부피가 훨씬 커서 밀도가 작은 거예요.',
              '',
            ],
            explain: '토성은 질량이 지구의 약 95배지만, 주로 <b>가벼운 기체</b>로 되어 있고 부피가 아주 커서 평균 밀도가 물보다 작아요.',
          },
          {
            type: 'quiz',
            title: '💍 고리가 있는 행성',
            goal: '행성의 고리에 대해 옳은 설명은 무엇일까요?',
            figure: FIG.rings,
            setup() { setScene('probe'); },
            choices: ['목성형 행성에는 모두 고리가 있다', '고리가 있는 행성은 토성뿐이다', '지구형 행성에도 모두 고리가 있다', '고리가 있는 행성은 하나도 없다'],
            answer: 0,
            feedback: [
              '',
              '목성·천왕성·해왕성에도 <b>희미한 고리</b>가 있어요. 토성의 고리만 크고 뚜렷해서 잘 보일 뿐이에요.',
              '지구형 행성(수성·금성·지구·화성)에는 고리가 <b>없어요</b>.',
              '토성의 뚜렷한 고리를 망원경으로 이미 봤어요!',
            ],
            explain: '고리는 <b>목성형 행성 모두</b>에 있어요. 토성의 고리는 뚜렷하고, 목성·천왕성·해왕성의 고리는 희미해서 큰 망원경이나 탐사선으로 확인했어요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '행성 판정하기', short: '행성 판정', icon: '🏁', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구형 행성과 목성형 행성의 특징을 비교했어요.</div>' +
          '<p>배운 특징으로 <b>새로 발견된 행성</b>을 판정하고, 특징 <b>비교표</b>를 완성해 봐요.</p>',
        setup() { setScene('graph'); },
        recap: '반지름·밀도 같은 자료를 비교하면 새로 발견된 행성도 지구형인지 목성형인지 판단할 수 있어요.',
        summary: '<ul><li>행성 X(반지름 지구의 1.3배, 평균 밀도 5.0 g/cm³, 고리 없음) → <b>지구형 행성</b>과 비슷해요.</li>' +
          '<li>지구형 행성은 소행성대의 <b>안쪽</b>(태양에 가까운 곳), 목성형 행성은 <b>바깥쪽</b>에 있어요.</li></ul>' + CMP_TABLE,
        missions: [
          {
            type: 'quiz',
            title: '🪐 새로 발견된 행성 X',
            goal: '행성 X는 반지름이 지구의 1.3배, 평균 밀도가 5.0 g/cm³이고 고리가 없어요. 어떤 행성과 비슷할까요?',
            figure: FIG.x,
            setup() { setScene('graph'); fillGraph(true); showX(true); syncControls(); },
            choices: ['목성형 행성과 비슷하다', '자료가 부족해서 알 수 없다', '지구형 행성과 비슷하다', '행성이 아니라 위성이다'],
            answer: 2,
            feedback: [
              '목성형 행성은 반지름이 지구의 약 4~11배로 크고 밀도가 약 0.7~1.6 g/cm³로 작아요. 행성 X의 밀도는 <b>5.0</b>으로 커요.',
              '그래프에 X를 찍어 보면 <b>지구형 무리</b> 가까이에 있어요. 반지름과 밀도 자료만으로도 분류를 짐작할 수 있어요.',
              '',
              '위성은 행성 둘레를 도는 천체예요. 여기서는 <b>행성 X를 분류</b>하는 문제예요.',
            ],
            explain: '행성 X는 반지름이 작고 밀도가 커서 그래프의 <b>지구형 무리</b>에 속해요. 고리가 없다는 점도 지구형 행성의 특징이에요.',
          },
          {
            type: 'quiz',
            title: '🗺️ 행성의 위치',
            goal: '궤도 지도를 보세요. 지구형 행성(수성·금성·지구·화성)은 소행성대의 어느 쪽에 있을까요?',
            setup() { setScene('orbits'); showX(false); syncControls(); },
            choices: ['소행성대의 바깥쪽 (태양에서 먼 곳)', '소행성대의 안쪽 (태양과 가까운 곳)', '소행성대 안에 섞여 있다', '행성마다 달라서 정할 수 없다'],
            answer: 1,
            feedback: [
              '소행성대 바깥쪽에는 <b>목성형 행성</b>(목성·토성·천왕성·해왕성)이 있어요.',
              '',
              '소행성대에는 작은 소행성들이 모여 있고, 행성은 그 안쪽과 바깥쪽에 나뉘어 있어요.',
              '지도의 색을 보세요. 지구형 행성은 모두 같은 쪽에 모여 있어요.',
            ],
            explain: '지구형 행성은 <b>소행성대의 안쪽</b>(태양 가까이)에 있고, 목성형 행성은 소행성대의 <b>바깥쪽</b>에 있어요. 1차시에서 찾은 소행성대가 두 무리의 경계예요.',
          },
          {
            title: '📋 특징 표 완성',
            goal: '꼬리표 6개를 끌어 <b>지구형 행성</b>과 <b>목성형 행성</b>의 알맞은 칸에 넣어 비교표를 완성해요.',
            hint: '밀도·고리·위성 수를 하나씩 떠올려요. 지구형은 작고 밀도가 크며 고리가 없어요. 목성형은 그 반대예요.',
            setup() { setScene('orbits'); setScene('table'); showX(false); resetTags(); syncControls(); },
            check: () => tagsPlaced() >= 6,
            hold: 0.5,
            status: () => '완성한 칸: <b>' + tagsPlaced() + ' / 6</b>',
            explain: '지구형 행성은 질량·반지름이 작고 <b>밀도가 크며 위성이 적고 고리가 없는</b> 암석 행성이에요. 목성형 행성은 질량·반지름이 크고 <b>밀도가 작으며 위성이 많고 고리가 있는</b> 기체 행성이에요.',
          },
        ],
      },
    ],
  });

  /* =========================================================
     움직임
     ========================================================= */
  let lastFocusTxt = '';
  function update(dt, t) {
    S.orbitT += RM ? 0 : dt;
    updateChips(dt); updateTags(dt); updateProbe(dt, views);
    // 망원경: 초점이 맞은 채 1초 유지하면 관측 완료
    if (S.scene === 'scope' && !S.slew && S.eyeA > 0.9) {
      const err = focusErr();
      if (err <= FOCUS_OK) {
        S.held = Math.min(1.2, S.held + dt);
        if (S.held >= 1 && !S.got[S.sel]) {
          S.got[S.sel] = true; Sound.tone(880, 0.12, 'triangle', 0.08); Sound.tone(1175, 0.14, 'triangle', 0.07, 0.1);
          views.forEach((V) => { const g = scopeGeo(V.L); ringFx(V, g.cx, g.cy, g.r, '#34d399'); V.P.burst(g.cx, g.cy, { count: 16, colors: ['#34d399', '#5eead4', '#fde68a'], speed: 150, gravity: 60, size: 3 }); });
        }
      } else S.held = 0;
    }
    const ft = S.scene === 'scope' ? (focusErr() <= FOCUS_OK ? '초점 OK ✔' : '오차 ' + Math.round(focusErr()) + ' %') : '';
    if (ft !== lastFocusTxt) { lastFocusTxt = ft; focusOut.textContent = ft; }
    // 두 무리 묶기 성공/해제
    const ok = groupCheck();
    if (ok !== S.groupsOk) {
      S.groupsOk = ok;
      if (ok) {
        if (S.colors.mercury !== 1) PL.forEach((p) => { S.colors[p.id] = S.colors[p.id] === 1 ? 2 : 1; });
        S.ellOpen = true; SciSim.tween(S, { ellA: 1 }, { duration: 0.7, ease: 'outCubic' });
        Sound.tone(740, 0.12, 'triangle', 0.08); Sound.tone(988, 0.14, 'triangle', 0.07, 0.1);
      } else { S.ellOpen = false; SciSim.tween(S, { ellA: 0 }, { duration: 0.3, ease: 'outCubic' }); }
    }
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) V.P.update(dt); });
  }
  let frameMs = 0;
  resetScope();
  syncControls();
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    frameMs += (performance.now() - t0 - frameMs) * 0.05;
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, FIG, PL, GAL, frameMs: () => frameMs, game: () => game, view: activeView, scopeSprite,
    client(L, x, y) { const V = views.find((q) => q.L === L) || activeView(); const r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    skyClient(id) { const V = activeView(), q = skyPos(V.L, id); return this.client(V.L, q.x, q.y); },
    rowClient(i) { const V = activeView(), q = rowCenter(V.L, i); return this.client(V.L, q.x, q.y); },
    plotClient(rv, dv) { const V = activeView(), G = graphGeo(V.L); return this.client(V.L, gX(G, rv), gY(G, dv)); },
    dotClient(id) { const V = activeView(), q = dotPos(V.L, PI[id]); return this.client(V.L, q.x, q.y); },
    probeChipClient(id) { const V = activeView(), r = probeGeo(V.L).chips[PI[id].i]; return this.client(V.L, r.x + r.w / 2, r.y + r.h / 2); },
    tagClient(i) { const V = activeView(), q = tagTrayPos(V.L, i); return this.client(V.L, q.x, q.y); },
    cellClient(d) { const V = activeView(), q = tagCell(V.L, d); return this.client(V.L, q.x, q.y); },
    focusAt: (id) => FOCUS_AT[id],
    setFocus,
  };
})();
