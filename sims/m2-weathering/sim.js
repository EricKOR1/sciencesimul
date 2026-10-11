/* =========================================================
   중2 Ⅱ. 지권의 변화 - 풍화와 토양  [9과09-04]
   탐구 흐름(4단계):
   ① 관찰: 산 위 바위가 오랜 세월 동안 금이 가고 부서져 알갱이가 되는 타임랩스 (풍화의 뜻)
   ② 실험: 틈 속 물이 얼었다 녹기를 되풀이할 때(부피 약 9 % 증가)와 식물 뿌리가 자랄 때 바위가 쪼개지는 모습
   ③ 모형: 토양 단면 모형 - 세월 막대를 밀면 기반암 → 암석 부스러기 층 → 표토 → 심토 순서로 생김
   ④ 적용: 숲이 있는/없는 비탈에 비를 내려 비교, 나무 심기·계단식 밭으로 토양 지키기
   (화학적 풍화의 세부 반응, 토양의 종류·분류는 다루지 않음)
   화면 구조: 세계(scene) 좌표 800×600 위에 장면을 그리고, 휴대폰 세로 화면은 가운데 520칸만 잘라 보여 줘요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp } = SciSim;
  const TAU = Math.PI * 2;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;
  const RM = !!SciSim.reduceMotion;
  const shade = SciSim.color.shade, rgba = SciSim.color.rgba, mixc = SciSim.color.mix;
  const approach = SciSim.approach, EZ = SciSim.ease;
  const SS = Math.max(1.5, Math.min(2, window.devicePixelRatio || 1));      // 스프라이트 해상도
  const nowS = () => performance.now() / 1000;

  /* ---------------------------------------------------------
     작은 도우미
     --------------------------------------------------------- */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mixn = (a, b, t) => a + (b - a) * t;
  function hash1(seed, i) {
    let h = Math.imul((i | 0) ^ (seed | 0), 0x9E3779B1);
    h ^= h >>> 15; h = Math.imul(h, 0x85EBCA6B); h ^= h >>> 13;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  }
  function vnoise(seed, x) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return hash1(seed, i) * (1 - u) + hash1(seed, i + 1) * u;
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function polyPath(ctx, pts, close) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) { if (i) ctx.lineTo(pts[i].x, pts[i].y); else ctx.moveTo(pts[i].x, pts[i].y); }
    if (close !== false) ctx.closePath();
  }
  const fnt = (L, px, weight) => (weight || 'bold') + ' ' + Math.round(px * L.fs * 10) / 10 + 'px ' + FONT;
  function pill(ctx, text, x, y, o) {
    o = o || {};
    ctx.font = o.font || 'bold 13px ' + FONT;
    const w = ctx.measureText(text).width, h = o.h || 24, pad = o.pad != null ? o.pad : 10;
    const bx = o.align === 'left' ? x : o.align === 'right' ? x - w - pad * 2 : x - w / 2 - pad;
    ctx.save();
    if (o.shadow) { ctx.shadowColor = 'rgba(20,40,80,.28)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    ctx.fillStyle = o.bg || 'rgba(27,35,51,.82)';
    roundRect(ctx, bx, y - h / 2, w + pad * 2, h, h / 2); ctx.fill();
    ctx.restore();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || 1.6; roundRect(ctx, bx, y - h / 2, w + pad * 2, h, h / 2); ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + pad, y + 0.5);
    ctx.textBaseline = 'alphabetic';
    return { x: bx, y: y - h / 2, w: w + pad * 2, h };
  }
  // 여러 줄 글 상자 (말풍선·설명 상자)
  function wrapLines(ctx, text, maxW) {
    const out = []; let line = '';
    text.split(' ').forEach((w) => {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    });
    if (line) out.push(line);
    return out;
  }
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  // 임계 감쇠 스프링으로 목표에 따라가기
  function crit(o, key, target, dt, w) {
    const vk = key + 'V';
    if (RM) { o[key] = target; o[vk] = 0; return; }
    let x = o[key], v = o[vk] || 0;
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) { const a = -w * w * (x - target) - 2 * w * v; v += a * h; x += v * h; }
    o[key] = x; o[vk] = v;
  }
  // 살짝 튕기는 스프링 (놓으면 자리에서 한 번 출렁여요)
  function springTo(o, key, target, dt, k, c) {
    const vk = key + 'V';
    if (RM) { o[key] = target; o[vk] = 0; return; }
    let x = o[key], v = o[vk] || 0;
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) { const a = -k * (x - target) - c * v; v += a * h; x += v * h; }
    o[key] = x; o[vk] = v;
  }
  const SPRITES = {};
  function sprite(key, w, h, fn) {
    let c = SPRITES[key];
    if (!c) {
      c = document.createElement('canvas'); c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
      const g = c.getContext('2d'); g.scale(SS, SS); fn(g, w, h);
      SPRITES[key] = c;
    }
    return c;
  }
  // 부드러운 그림자는 한 번만 그려 두고 쓰기 (shadowBlur는 매 프레임 쓰면 느려요)
  function softShadow(ctx, x, y, w, h, r, o) {
    o = o || {};
    const blur = o.blur || 12, pad = blur * 2 + 4, oy = o.y != null ? o.y : 3;
    const key = 'sh|' + Math.round(w) + 'x' + Math.round(h) + '|' + r + '|' + blur + '|' + (o.a || 0.2);
    const cv = sprite(key, w + pad * 2, h + pad * 2, (g) => {
      g.shadowColor = 'rgba(20,40,80,' + (o.a || 0.2) + ')'; g.shadowBlur = blur; g.shadowOffsetY = 0;
      g.fillStyle = '#000'; roundRect(g, pad, pad, w, h, r); g.fill();
      g.shadowColor = 'transparent'; g.globalCompositeOperation = 'destination-out'; roundRect(g, pad, pad, w, h, r); g.fill();
    });
    ctx.drawImage(cv, x - pad, y - pad + oy, w + pad * 2, h + pad * 2);
  }
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const fmtYears = (n) => {
    n = Math.round(n);
    if (n < 1) return '지금';
    if (n < 100) return '약 ' + n + '년 뒤';
    if (n < 10000) { const v = Math.round(n / 100) * 100; return '약 ' + (v >= 1000 ? Math.floor(v / 1000) + '천' + (v % 1000 ? ' ' + (v % 1000) : '') : v) + '년 뒤'; }
    const m = n / 10000; return '약 ' + (Math.abs(m - Math.round(m)) < 0.05 ? Math.round(m) : m.toFixed(1)) + '만 년 뒤';
  };

  /* ---------------------------------------------------------
     화면 배치: 세계 좌표(800×600) → 캔버스
     wide: 그대로 · tall(휴대폰): 가운데 520칸만 보여 주고 아래에 설명판
     --------------------------------------------------------- */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 600, fs: 1, tall: false, ox: 0, oy: 0, sceneW: 800, sceneH: 600, hud: { x: 0, y: 0, w: 800, h: 600 } },
    tall: { key: 'tall', vw: 520, vh: 846, fs: 1.2, tall: true, ox: -140, oy: 0, sceneW: 520, sceneH: 600, hud: { x: 0, y: 600, w: 520, h: 246 } },
  };

  /* =========================================================
     바위 만들기: 다각형 · 금(crack) · 질감 스프라이트
     ========================================================= */
  // 둥글둥글한 바위 다각형 (바닥은 평평하게)
  function blobRing(cx, cy, rx, ry, n, jit, seed, flatBottom) {
    const R = rng(seed), pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (R() - 0.5) * 0.22 - Math.PI / 2;
      const k = 1 + (R() - 0.5) * 2 * jit;
      const ca = Math.cos(a), sa = Math.sin(a), e = 0.62;
      let x = cx + rx * Math.sign(ca) * Math.pow(Math.abs(ca), e) * k;
      let y = cy + ry * Math.sign(sa) * Math.pow(Math.abs(sa), e) * k;
      if (flatBottom) y = Math.min(y, cy + ry * flatBottom);
      pts.push({ x, y });
    }
    return pts;
  }
  const bboxOf = (ring, pad) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    ring.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    pad = pad || 0;
    return { x: Math.floor(x0 - pad), y: Math.floor(y0 - pad), w: Math.ceil(x1 - x0 + pad * 2), h: Math.ceil(y1 - y0 + pad * 2) };
  };
  const centroidOf = (ring) => {
    let x = 0, y = 0; ring.forEach((p) => { x += p.x; y += p.y; });
    return { x: x / ring.length, y: y / ring.length };
  };
  // 금(crack): 거의 세로(axis 'y')이거나 거의 가로(axis 'x')인 구불구불한 선. f(u)는 다른 좌표
  function makeCrack(axis, base, slope, amp, seed, u0) {
    return {
      axis, u0: u0 || 0,
      f(u) { return base + slope * (u - (u0 || 0)) + amp * (vnoise(seed, u / 34) * 0.7 + vnoise(seed + 9, u / 11) * 0.3); },
      pt(u) { return axis === 'y' ? { x: this.f(u), y: u } : { x: u, y: this.f(u) }; },
      side(x, y) { return axis === 'y' ? x - this.f(y) : y - this.f(x); },
    };
  }
  // 다각형을 금을 따라 둘로 나누기 → {A: side<0쪽, B: side>0쪽, path: 금 위의 점들(A→B 방향 아님: X0→X1)}
  function splitRing(ring, crack) {
    const n = ring.length, s = ring.map((p) => crack.side(p.x, p.y));
    const cross = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if ((s[i] < 0) !== (s[j] < 0)) {
        let a = 0, b = 1;
        for (let k = 0; k < 26; k++) {
          const m = (a + b) / 2, x = ring[i].x + (ring[j].x - ring[i].x) * m, y = ring[i].y + (ring[j].y - ring[i].y) * m;
          if ((crack.side(x, y) < 0) === (s[i] < 0)) a = m; else b = m;
        }
        const t = (a + b) / 2;
        cross.push({ i, neg: s[i] < 0, x: ring[i].x + (ring[j].x - ring[i].x) * t, y: ring[i].y + (ring[j].y - ring[i].y) * t });
      }
    }
    if (cross.length !== 2) return null;
    const c0 = cross[0], c1 = cross[1];
    const key = crack.axis === 'y' ? 'y' : 'x';
    const crackPts = (from, to) => {                       // from→to 방향으로 금 위의 점들
      const out = [{ x: from.x, y: from.y }];
      const a = from[key], b = to[key], step = 5, dir = b > a ? 1 : -1;
      for (let u = a + dir * step; dir > 0 ? u < b : u > b; u += dir * step) out.push(crack.pt(u));
      out.push({ x: to.x, y: to.y });
      return out;
    };
    const arc = (iFrom, iTo) => {                          // iFrom+1 … iTo 꼭짓점
      const out = []; let i = (iFrom + 1) % n;
      for (let guard = 0; guard < n + 2; guard++) { out.push({ x: ring[i].x, y: ring[i].y }); if (i === iTo) break; i = (i + 1) % n; }
      return out;
    };
    // c0 → c1 사이 호(arc1), c1 → c0 사이 호(arc2)
    const arc1 = arc(c0.i, c1.i), arc2 = arc(c1.i, c0.i);
    const P1 = [{ x: c0.x, y: c0.y }].concat(arc1, crackPts(c1, c0));      // c0→(arc1)→c1→(금)→c0
    const P2 = [{ x: c1.x, y: c1.y }].concat(arc2, crackPts(c0, c1));
    // arc1의 첫 꼭짓점이 side<0 쪽인지로 A/B 결정
    const arc1Neg = s[(c0.i + 1) % n] < 0;
    const path = crackPts(c0, c1);
    // path의 방향을 key 증가 방향(위→아래, 왼→오른)으로 정렬
    if (path[0][key] > path[path.length - 1][key]) path.reverse();
    return { A: arc1Neg ? P1 : P2, B: arc1Neg ? P2 : P1, path };
  }

  /* ----- 바위 질감 (한 번만 그려 두고 계속 써요) ----- */
  const PAL_ROCK = { light: '#c3c5ca', base: '#8f9299', dark: '#565961', speck: ['#6a6d75', '#d7d9de', '#a79b90', '#4a4c53'] };
  const PAL_ROCK_WARM = { light: '#cdbfae', base: '#9b8d7e', dark: '#5f554b', speck: ['#76695c', '#e1d5c6', '#b0856a', '#4d453d'] };
  function makeTex(box, seed, pal) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(box.w * SS); cv.height = Math.ceil(box.h * SS);
    const g = cv.getContext('2d'); g.scale(SS, SS); g.translate(-box.x, -box.y);
    const R = rng(seed);
    const gr = g.createLinearGradient(box.x, box.y, box.x + box.w * 0.75, box.y + box.h);
    gr.addColorStop(0, pal.light); gr.addColorStop(0.42, pal.base); gr.addColorStop(1, pal.dark);
    g.fillStyle = gr; g.fillRect(box.x, box.y, box.w, box.h);
    const m = Math.max(box.w, box.h);
    // 면(facet)
    for (let i = 0; i < 26; i++) {
      const cx = box.x + R() * box.w, cy = box.y + R() * box.h, rad = (0.1 + R() * 0.22) * m, a0 = R() * TAU, k = 3 + Math.floor(R() * 2);
      g.beginPath();
      for (let j = 0; j < k; j++) { const a = a0 + (j / k) * TAU + (R() - 0.5) * 0.6, rr = rad * (0.6 + R() * 0.6); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.closePath();
      g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,' + (0.035 + R() * 0.09) + ')' : 'rgba(10,12,20,' + (0.04 + R() * 0.1) + ')';
      g.fill();
    }
    // 결(층리)
    g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      const y0 = box.y + R() * box.h, sl = (R() - 0.5) * 0.25;
      g.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(10,12,20,0.13)';
      g.beginPath(); g.moveTo(box.x, y0); g.lineTo(box.x + box.w, y0 + sl * box.w); g.stroke();
    }
    // 알갱이(광물 무늬)
    const nSp = Math.floor(box.w * box.h / 55);
    for (let i = 0; i < nSp; i++) {
      const x = box.x + R() * box.w, y = box.y + R() * box.h, s = 0.6 + R() * 1.7;
      g.globalAlpha = 0.18 + R() * 0.4; g.fillStyle = pal.speck[Math.floor(R() * pal.speck.length)];
      if (R() < 0.5) g.fillRect(x, y, s * 1.4, s); else { g.beginPath(); g.arc(x, y, s * 0.8, 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
    return { cv, x: box.x, y: box.y, w: box.w, h: box.h };
  }
  const LIGHT = { x: -0.55, y: -0.83 };
  // 질감을 다각형으로 오려 테두리까지 그린 조각 스프라이트. o.moss: 위쪽 면에 이끼
  function cutSprite(tex, ring, o) {
    o = o || {};
    const cv = document.createElement('canvas'); cv.width = tex.cv.width; cv.height = tex.cv.height;
    const g = cv.getContext('2d'); g.scale(SS, SS); g.translate(-tex.x, -tex.y);
    g.save(); polyPath(g, ring); g.clip();
    g.drawImage(tex.cv, tex.x, tex.y, tex.w, tex.h);
    // 안쪽 가장자리 어둡게 (입체감)
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(15,18,28,.22)'; g.lineWidth = 9; polyPath(g, ring); g.stroke();
    g.strokeStyle = 'rgba(15,18,28,.16)'; g.lineWidth = 4.5; polyPath(g, ring); g.stroke();
    g.restore();
    const c = centroidOf(ring), n = ring.length;
    const R = rng((o.seed || 5) + 31);
    for (let i = 0; i < n; i++) {
      const p0 = ring[i], p1 = ring[(i + 1) % n];
      const dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy) || 1;
      let nx = dy / len, ny = -dx / len;
      if (nx * ((p0.x + p1.x) / 2 - c.x) + ny * ((p0.y + p1.y) / 2 - c.y) < 0) { nx = -nx; ny = -ny; }
      const lit = nx * LIGHT.x + ny * LIGHT.y;
      const outer = o.inner ? 0.55 : 1;
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(24,27,38,' + ((0.55 + 0.25 * Math.max(0, -lit)) * outer) + ')'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
      if (lit > 0.15) {
        g.strokeStyle = 'rgba(255,255,255,' + (0.5 * lit * outer) + ')'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(p0.x - nx * 1.6, p0.y - ny * 1.6); g.lineTo(p1.x - nx * 1.6, p1.y - ny * 1.6); g.stroke();
      }
      // 이끼: 위를 보는 면
      if (o.moss && ny < -0.55 && len > 14) {
        const cnt = Math.floor(len / 9);
        for (let k = 0; k < cnt; k++) {
          const t = R(), mx = p0.x + dx * t, my = p0.y + dy * t, rr = 3 + R() * 5 * o.moss;
          g.fillStyle = R() < 0.5 ? 'rgba(104,160,84,.8)' : 'rgba(140,186,96,.75)';
          g.beginPath(); g.ellipse(mx, my + 1, rr * 1.3, rr * 0.7, 0, 0, TAU); g.fill();
        }
      }
    }
    return { cv, x: tex.x, y: tex.y, w: tex.w, h: tex.h };
  }
  const blit = (ctx, sp, dx, dy) => ctx.drawImage(sp.cv, sp.x + (dx || 0), sp.y + (dy || 0), sp.w, sp.h);
  // 가로줄 조각으로 그리기 (금이 벌어진 부분): 행 y0~y1을 dx만큼 옮겨서
  function blitRows(ctx, sp, y0, y1, dx) {
    const sy = Math.max(0, (y0 - sp.y) * SS), sh = Math.min(sp.cv.height - sy, (y1 - y0) * SS);
    if (sh <= 0) return;
    ctx.drawImage(sp.cv, 0, sy, sp.cv.width, sh, sp.x + dx, y0, sp.w, sh / SS);
  }

  /* =========================================================
     환경: 하늘 · 해/달 · 구름 · 먼 산 · 언덕 · 나무
     ========================================================= */
  const SKY = { dayTop: '#7cc4f5', dayBot: '#e4f4ff', nightTop: '#070d26', nightBot: '#2b4a8c', duskBot: '#f6a56a' };
  // day: 낮 길이 위상(0~1 반복). 0~0.5 낮, 0.5~1 밤. light: 0(깜깜)~1(대낮)
  const lightOf = (day) => { const s = Math.sin((((day % 1) + 1) % 1) * TAU); return clamp(0.5 + s * 1.3, 0, 1); };
  const duskOf = (day) => { const s = Math.sin((((day % 1) + 1) % 1) * TAU); return clamp(1 - Math.abs(s) * 4, 0, 1) * 0.9; };
  function drawSky(ctx, W, H, day, light, t, opt) {
    opt = opt || {};
    const dusk = duskOf(day);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mixc(SKY.nightTop, opt.top || SKY.dayTop, light));
    g.addColorStop(1, mixc(mixc(SKY.nightBot, opt.bot || SKY.dayBot, light), SKY.duskBot, dusk * 0.55));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 별
    if (light < 0.9) {
      const r = rng(77); ctx.fillStyle = '#fff';
      for (let i = 0; i < 46; i++) {
        const x = r() * W, y = r() * H * 0.45, s = 0.6 + r() * 1.4, ph = r() * 6, sp = 0.8 + r();
        ctx.globalAlpha = (1 - light) * (RM ? 0.7 : 0.45 + 0.4 * Math.sin(t * sp + ph));
        ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1;
    }
    if (opt.noSun) return;
    // 해와 달 (호를 그리며 지나가요)
    const ph = (((day % 1) + 1) % 1);
    const arc = (a) => ({ x: 400 - 340 * Math.cos(a), y: 450 - 330 * Math.sin(a) });
    if (ph < 0.5) {
      const p = arc(Math.PI * (ph / 0.5));
      const gg = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 90);
      gg.addColorStop(0, 'rgba(255,240,170,.75)'); gg.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.x, p.y, 90, 0, TAU); ctx.fill();
      SciSim.draw(ctx).sphere(p.x, p.y, 24, '#ffd54a', { gloss: false, light: '#fff3b0', dark: '#ffb300' });
    } else {
      const p = arc(Math.PI * ((ph - 0.5) / 0.5));
      const gm = ctx.createRadialGradient(p.x, p.y, 6, p.x, p.y, 70);
      gm.addColorStop(0, 'rgba(215,228,255,.28)'); gm.addColorStop(1, 'rgba(215,228,255,0)');
      ctx.fillStyle = gm; ctx.beginPath(); ctx.arc(p.x, p.y, 70, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, TAU); ctx.clip();               // 초승달
      ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, TAU); ctx.moveTo(p.x + 22, p.y - 5); ctx.arc(p.x + 8, p.y - 5, 15, 0, TAU);
      ctx.fillStyle = '#f2f5ff'; ctx.fill('evenodd'); ctx.restore();
    }
  }
  function cloudShape(ctx, x, y, s, col, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col;
    [[0, 0, 30], [30, -10, 36], [66, 0, 30], [32, 12, 34], [-4, 10, 22], [60, 12, 24]].forEach((c) => { ctx.beginPath(); ctx.arc(x + c[0] * s, y + c[1] * s, c[2] * s, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  const CLOUDS = [{ x: 60, y: 96, s: 0.9, v: 4 }, { x: 330, y: 150, s: 1.1, v: 3 }, { x: 600, y: 70, s: 0.8, v: 5 }];
  function drawClouds(ctx, t, light, rainy) {
    const col = mixc('#6f7ca0', '#ffffff', light * (1 - rainy * 0.5));
    CLOUDS.forEach((c) => {
      const x = ((c.x + (RM ? 0 : t * c.v)) % 1000) - 120;
      cloudShape(ctx, x, c.y, c.s * (1 + rainy * 0.12), col, 0.5 + 0.4 * light);
    });
  }
  // 먼 산 (두 겹)
  function drawFarHills(ctx, W, light) {
    const ridge = (base, amp, col, seed, per) => {
      ctx.beginPath(); ctx.moveTo(-10, 600);
      for (let x = -10; x <= W + 10; x += 8) ctx.lineTo(x, base - amp * (0.5 + 0.5 * (vnoise(seed, x / per) * 0.75 + vnoise(seed + 5, x / (per / 2.4)) * 0.25)));
      ctx.lineTo(W + 10, 600); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };
    ridge(352, 118, mixc('#27385f', '#a9c4e4', light), 3, 150);
    ridge(396, 92, mixc('#1d4a46', '#7fb69a', light), 8, 120);
  }
  // 언덕 (왼쪽이 높고 오른쪽 아래로 흘러내려요)
  const gy = (x) => 396 + 0.11 * x - 22 * Math.exp(-Math.pow((x - 322) / 130, 2)) + 6 * Math.sin(x * 0.03);
  function drawHill(ctx, W, H) {
    const path = () => { ctx.beginPath(); ctx.moveTo(-10, H + 10); for (let x = -10; x <= W + 10; x += 8) ctx.lineTo(x, gy(x)); ctx.lineTo(W + 10, H + 10); ctx.closePath(); };
    path();
    const g = ctx.createLinearGradient(0, 380, 0, H);
    g.addColorStop(0, '#79c86b'); g.addColorStop(0.1, '#5faa56'); g.addColorStop(0.13, '#9a7753'); g.addColorStop(1, '#5d432e');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(190,240,150,.9)'; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 8) (x === -10 ? ctx.moveTo(x, gy(x) + 1) : ctx.lineTo(x, gy(x) + 1));
    ctx.stroke();
    const r = rng(19); ctx.globalAlpha = 0.4;
    for (let i = 0; i < 110; i++) {
      const x = r() * W, y = gy(x) + 20 + r() * (H - gy(x) - 30), s = 1 + r() * 3;
      ctx.fillStyle = r() < 0.5 ? '#c4a57f' : '#46321f'; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 밤 색조 + 노을 (물체 위에 덮어요)
  function drawTint(ctx, W, H, day, light) {
    const a = 0.58 * (1 - light);
    if (a > 0.01) {
      const g = ctx.createLinearGradient(0, 190, 0, 270);
      g.addColorStop(0, 'rgba(8,18,60,0)'); g.addColorStop(1, 'rgba(8,18,60,' + a + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 190, W, H - 190);
    }
    const d = duskOf(day);
    if (d > 0.02) { ctx.fillStyle = 'rgba(255,140,70,' + (0.13 * d) + ')'; ctx.fillRect(0, 250, W, H - 250); }
  }
  // 나무 (둥근 잎)
  function drawTree(ctx, x, y, s, t, o) {
    o = o || {};
    const sway = RM ? 0 : Math.sin(t * 1.3 + x * 0.05) * 2.2 * s;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const g = ctx.createLinearGradient(-8, 0, 8, 0);
    g.addColorStop(0, '#6b4a2f'); g.addColorStop(0.5, '#8a6141'); g.addColorStop(1, '#553821');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-5, -40, -3 + sway * 0.2, -80); ctx.lineTo(4 + sway * 0.2, -80); ctx.quadraticCurveTo(6, -40, 10, 2); ctx.closePath(); ctx.fill();
    if (o.bare) { ctx.restore(); return; }
    const blobs = [[0, -108, 36], [-26, -92, 28], [27, -94, 29], [-8, -128, 28], [16, -122, 24]];
    blobs.forEach((b, i) => {
      const bx = b[0] + sway * (0.6 + i * 0.12), by = b[1];
      const gg = ctx.createRadialGradient(bx - b[2] * 0.3, by - b[2] * 0.4, 2, bx, by, b[2]);
      gg.addColorStop(0, o.light || '#7fd37a'); gg.addColorStop(0.6, o.mid || '#3f9f55'); gg.addColorStop(1, o.dark || '#2a7a43');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(bx, by, b[2], 0, TAU); ctx.fill();
    });
    ctx.restore();
  }
  function drawPine(ctx, x, y, s, t) {
    const sway = RM ? 0 : Math.sin(t * 1.1 + x * 0.04) * 1.6 * s;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#6b4a2f'; ctx.fillRect(-4, -26, 8, 28);
    [[-26, 66, 46], [-50, 54, 40], [-72, 42, 34], [-92, 30, 28]].forEach((c, i) => {
      const gg = ctx.createLinearGradient(-c[1] / 2, c[0], c[1] / 2, c[0] + c[2]);
      gg.addColorStop(0, '#4fa86a'); gg.addColorStop(1, '#25673f');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.moveTo(sway * (i * 0.3), c[0] - c[2] + 6); ctx.lineTo(c[1] / 2, c[0] + 6); ctx.lineTo(-c[1] / 2, c[0] + 6); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
  // 풀포기
  function drawTuft(ctx, x, y, s, col, t) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col || '#4f9f4d'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const sw = RM ? 0 : Math.sin(t * 2 + x * 0.1 + i) * 1.4 * s;
      ctx.beginPath(); ctx.moveTo(i * 3 * s, 0); ctx.quadraticCurveTo(i * 4 * s + sw, -7 * s, i * 6 * s + sw * 1.4, -(15 - Math.abs(i)) * s); ctx.stroke();
    }
    ctx.restore();
  }

  /* =========================================================
     상태
     ========================================================= */
  const S = {
    scene: 'mountain', fade: 0, hintPlay: true,
    mt: { p: 0, pV: 0, tp: 0, maxP: 0, playing: false, day: 0.1, clues: {}, callout: null, user: false, rain: 0, rainAmt: 0 },
    // 실험: 얼음
    ice: null, root: null, pf: null, sl: null,
  };
  let FEAT = new Set();
  const on = (f) => FEAT.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);
  const isFree = () => !!(game && game.free);

  /* 잔해 먼지 */
  function dust(P, x, y, n, col, spread) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + Math.random() * 0.8), sp = 20 + Math.random() * (spread || 70);
      P.emit({ x: x + (Math.random() - 0.5) * 20, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, life: 0.9 + Math.random() * 0.6, size: 10 + Math.random() * 12, color: col || 'rgba(214,200,176,.55)', shape: 'smoke', gravity: -10, drag: 2.2, grow: 14, fade: true });
    }
    for (let i = 0; i < Math.ceil(n * 0.7); i++) {
      const a = -Math.PI * (0.05 + Math.random() * 0.9), sp = 60 + Math.random() * 130;
      P.emit({ x: x + (Math.random() - 0.5) * 24, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7 + Math.random() * 0.5, size: 1.6 + Math.random() * 2.6, color: ['#9a9da4', '#c5c0b6', '#7d7f86'][i % 3], shape: 'square', gravity: 520, drag: 0.6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
  }

  /* =========================================================
     장면 1 · 산 위 바위의 타임랩스
     ========================================================= */
  let MT = null;                                   // 만들어 둔 바위 조각들
  function buildMountain() {
    const cx = 330, ry = 82, rx = 132, cy = gy(cx) + 10 - ry;
    const ring = blobRing(cx, cy, rx, ry, 22, 0.05, 12, 0.92);
    const bb = bboxOf(ring, 14);
    const topY = bb.y + 14;
    const c1 = makeCrack('y', cx + 16, 0.07, 9, 21, topY);
    const s1 = splitRing(ring, c1);
    const c2 = makeCrack('x', cy - 6, 0.05, 8, 34, bb.x);
    const s2 = s1 && splitRing(s1.A, c2);
    const c3 = makeCrack('x', cy + 10, -0.15, 8, 47, cx);
    const s3 = s1 && splitRing(s1.B, c3);
    if (!s1 || !s2 || !s3) console.warn('바위 나누기 실패', !!s1, !!s2, !!s3);
    const tex = makeTex(bb, 7, PAL_ROCK);
    const defs = [
      { key: 'RT', ring: s3 && s3.A, sep: 0.24, land: 0.42, dx: 138, dy: 74, rot: 0.72, cr: 0.56 },
      { key: 'RB', ring: s3 && s3.B, sep: 0.29, land: 0.46, dx: 58, dy: 22, rot: 0.15, cr: 0.60 },
      { key: 'LT', ring: s2 && s2.A, sep: 0.33, land: 0.50, dx: -74, dy: 66, rot: -0.52, cr: 0.64 },
      { key: 'LB', ring: s2 && s2.B, sep: 0.37, land: 0.54, dx: -14, dy: 16, rot: -0.08, cr: 0.68 },
    ];
    const R = rng(91);
    // 회전한 조각의 가장 낮은 점이 땅에 닿도록 내려앉는 거리 계산
    const landDy = (ring, c, dx, rot) => {
      const cs = Math.cos(rot), sn = Math.sin(rot); let worst = -1e9;
      ring.forEach((q) => { const rx2 = q.x - c.x, ry2 = q.y - c.y; const x = c.x + dx + rx2 * cs - ry2 * sn, y = c.y + rx2 * sn + ry2 * cs; worst = Math.max(worst, y - gy(x)); });
      return 3 - worst;
    };
    const pieces = defs.filter((d) => d.ring).map((d, i) => {
      const c = centroidOf(d.ring);
      d.dy = landDy(d.ring, c, d.dx, d.rot);
      const spr = cutSprite(tex, d.ring, { inner: true, seed: 5 + i, moss: i < 2 ? 0.6 : 0.9 });
      const chunks = [];
      for (let k = 0; k < 11; k++) {
        const a = R() * TAU;
        chunks.push({ ox: Math.cos(a) * (14 + R() * 62) * 1.25, oy: Math.sin(a) * 14 - 4, s: 6 + R() * 13, rot: R() * TAU, t0: d.cr + 0.02 + R() * 0.12, t1: 0.80 + R() * 0.10, pts: 5 + Math.floor(R() * 2), seed: R() * 100, shade: R() });
      }
      return Object.assign({}, d, { c, spr, chunks, hw: bboxOf(d.ring).w / 2 });
    });
    const full = cutSprite(tex, ring, { moss: 1, seed: 3 });
    const paths = [];
    // 금(선이 자라는 모양) : 화면에 그릴 때 길이의 일부만 보여 줘요
    const addCrack = (pts, a0, a1, w) => {
      let len = 0; const cum = [0];
      for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); cum.push(len); }
      paths.push({ pts, cum, len, a0, a1, w });
    };
    if (s1) addCrack(s1.path, 0.03, 0.22, 4.2);
    if (s2) addCrack(s2.path, 0.12, 0.27, 3.4);
    if (s3) addCrack(s3.path, 0.14, 0.29, 3.4);
    // 잔금 (장식)
    const RR = rng(5);
    paths.slice(0).forEach((cp) => {
      for (let k = 0; k < 3; k++) {
        const f = 0.2 + RR() * 0.6, i = Math.min(cp.pts.length - 2, Math.floor(f * cp.pts.length)), b = cp.pts[i];
        const dir = (RR() < 0.5 ? -1 : 1), ang = (RR() * 0.8 + 0.3) * dir + (Math.abs(cp.pts[i + 1].x - b.x) > Math.abs(cp.pts[i + 1].y - b.y) ? 0 : Math.PI / 2);
        const pts = [b]; let x = b.x, y = b.y;
        for (let j = 0; j < 5; j++) { x += Math.cos(ang + (RR() - 0.5) * 0.7) * 7; y += Math.sin(ang + (RR() - 0.5) * 0.7) * 7; pts.push({ x, y }); }
        addCrack(pts, cp.a0 + (cp.a1 - cp.a0) * f, Math.min(0.3, cp.a1 + 0.02), 2);
      }
    });
    return { cx, cy, rx, ry, ring, full, pieces, paths, topY, crackTop: s1 ? s1.path[0] : { x: cx + 16, y: topY } };
  }
  const mtGeo = () => MT || (MT = buildMountain());
  const MARKERS = [
    { key: 'ice', x: 350, y: 228, icon: '❄', title: '틈 속의 물', text: '바위 틈에 스며든 물이 얼고 녹기를 되풀이하며 틈을 벌려요.' },
    { key: 'root', x: 170, y: 352, icon: '🌱', title: '식물 뿌리', text: '식물 뿌리가 바위 틈으로 파고들며 자라 틈을 넓혀요.' },
    { key: 'rain', x: 520, y: 122, icon: '💧', title: '빗물과 공기', text: '빗물과 공기가 바위의 성분을 서서히 녹이거나 변하게 해요.' },
  ];
  const moundH = (p) => 88 * sstep(0.34, 0.92, p);
  const moundTop = (x, H) => { const u = (x - 392) / 215; return gy(x) - H * Math.pow(Math.max(0, 1 - u * u), 1.1); };

  function updateMountain(dt, t, V) {
    const M = S.mt, G = mtGeo();
    const prev = M.p;
    if (M.playing) {
      M.tp = Math.min(1, M.tp + dt * 0.058);
      syncTime(M.tp);
      if (M.tp >= 1) setPlaying(false);
    }
    crit(M, 'p', M.tp, dt, RM ? 99 : 13);
    M.p = clamp(M.p, 0, 1);
    if (M.p > M.maxP) M.maxP = M.p;
    const dp = M.p - prev;
    M.day += (RM ? 0 : Math.abs(dp) * 7 + dt * 0.03);
    // 비: 날이 바뀌는 사이 가끔
    const rc = (((M.day * 0.5 + 0.18) % 1) + 1) % 1;
    M.rainAmt = approach(M.rainAmt, rc < 0.2 && M.p > 0.04 ? 1 : 0, dt, 2.5);
    // 조각이 땅에 닿을 때 먼지 (앞으로 갈 때만)
    G.pieces.forEach((pc) => {
      if (prev < pc.land && M.p >= pc.land && dp > 0 && !RM) {
        dust(V.P, pc.c.x + pc.dx, pc.c.y + pc.dy + 30, 7, 'rgba(214,200,176,.55)');
        Sound.tone(150 + Math.random() * 40, 0.12, 'sine', 0.05);
      }
      if (prev < pc.cr + 0.04 && M.p >= pc.cr + 0.04 && dp > 0 && !RM) dust(V.P, pc.c.x + pc.dx, pc.c.y + pc.dy + 26, 5, 'rgba(190,176,150,.5)', 90);
    });
    // 얼음 반짝임(밤)
    if (!RM && lightOf(M.day) < 0.3 && M.p > 0.05 && M.p < 0.45 && Math.random() < dt * 4) {
      const cp = G.paths[0], f = Math.random(), i = Math.min(cp.pts.length - 1, Math.floor(f * cp.pts.length * clamp((M.p - 0.03) / 0.19, 0.05, 1)));
      V.P.emit({ x: cp.pts[i].x, y: cp.pts[i].y, vx: 0, vy: -4, life: 0.9, size: 2.6, color: '#e9faff', shape: 'star', fade: true, rot: Math.random() * 3, vr: 2 });
    }
    // 단서 설명 상자
    if (M.callout && nowS() - M.callout.t0 > 5.2) M.callout = null;
  }

  function drawCrackLine(ctx, cp, r, wScale, alpha) {
    if (r <= 0.002) return;
    const need = Math.min(1, r) * cp.len;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trace = (dx, dy) => {
      ctx.beginPath(); ctx.moveTo(cp.pts[0].x + dx, cp.pts[0].y + dy);
      for (let i = 1; i < cp.pts.length; i++) {
        if (cp.cum[i] <= need) ctx.lineTo(cp.pts[i].x + dx, cp.pts[i].y + dy);
        else { const f = (need - cp.cum[i - 1]) / Math.max(0.001, cp.cum[i] - cp.cum[i - 1]); ctx.lineTo(cp.pts[i - 1].x + (cp.pts[i].x - cp.pts[i - 1].x) * f + dx, cp.pts[i - 1].y + (cp.pts[i].y - cp.pts[i - 1].y) * f + dy); break; }
      }
    };
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = Math.max(1, cp.w * wScale * 0.45); trace(1.6, 1.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(12,13,20,.9)'; ctx.lineWidth = Math.max(1.1, cp.w * wScale); trace(0, 0); ctx.stroke();
    ctx.restore();
  }

  // 조각 모양 (자갈): 불규칙 다각형
  function chunkPoly(ctx, x, y, s, rot, n, seed) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU, k = 0.7 + 0.35 * Math.abs(hash1(Math.floor(seed * 100), i));
      ctx.lineTo(x + Math.cos(a) * s * k, y + Math.sin(a) * s * k * 0.82);
    }
    ctx.closePath();
  }

  function drawMountain(ctx, V, t) {
    const M = S.mt, G = mtGeo(), p = M.p, W = 800, H = 600;
    const light = lightOf(M.day), rainy = M.rainAmt;
    drawSky(ctx, W, H, M.day, light, t);
    drawClouds(ctx, t, light, rainy);
    // 비구름 (단서)
    if (p > 0.04) cloudShape(ctx, 486, 106, 0.82, mixc('#7c88a8', '#e8eef8', light * (1 - rainy * 0.55)), 0.85);
    drawFarHills(ctx, W, light);
    ctx.drawImage(sprite('hill', 820, 600, (g) => { g.translate(10, 0); drawHill(g, 800, 600); }), -10, 0, 820, 600);

    // 쌓이는 부스러기 더미 (바위 뒤)
    drawMound(ctx, p, t);
    // 나무와 뿌리
    drawTree(ctx, 142, gy(142) + 2, 0.82, t);
    drawPine(ctx, 724, gy(724) + 2, 0.78, t);
    drawTree(ctx, 652, gy(652) + 2, 0.5, t, { mid: '#4aa85a' });
    ctx.save(); ctx.lineCap = 'round';
    [[0, 3.6], [8, 2.6], [-6, 2.2]].forEach((rt, i) => {
      const x0 = 146 + rt[0], x1 = 196 + i * 7, y0 = gy(x0) + 3, y1 = gy(x1) + 2 - (i === 0 ? 4 : 0);
      ctx.strokeStyle = '#4c331f'; ctx.lineWidth = rt[1] * 2.4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0 + 22, y0 + 8 - i * 3, x1 - 24, y1 - 9, x1, y1); ctx.stroke();
      ctx.strokeStyle = '#8a6240'; ctx.lineWidth = rt[1] * 1.2;
      ctx.beginPath(); ctx.moveTo(x0, y0 - 1); ctx.bezierCurveTo(x0 + 22, y0 + 7 - i * 3, x1 - 24, y1 - 10, x1, y1 - 1); ctx.stroke();
    });
    ctx.restore();

    // 바위
    const sepA = sstep(0.21, 0.27, p);
    if (sepA <= 0.001 && p < 0.235) {
      blit(ctx, G.full);
      G.paths.forEach((cp) => drawCrackLine(ctx, cp, (p - cp.a0) / (cp.a1 - cp.a0), 0.6 + 0.7 * sstep(cp.a0, cp.a1, p), 1));
    } else {
      G.pieces.forEach((pc) => {
        const u = sstep(pc.sep, pc.land, p);
        const e = EZ.outCubic(u);
        const hop = Math.sin(u * Math.PI) * 14 * (1 - u * 0.4);
        const k = sstep(pc.cr, pc.cr + 0.22, p);
        const sc = 1 - 0.9 * k, a = 1 - sstep(pc.cr + 0.12, pc.cr + 0.24, p);
        if (a <= 0.01) return;
        const shx = pc.c.x + pc.dx * e;                                  // 땅에 드리우는 그림자
        ctx.fillStyle = 'rgba(20,24,34,' + (0.24 * Math.max(sepA, u) * a) + ')';
        ctx.beginPath(); ctx.ellipse(shx, gy(shx) + 4, pc.hw * sc * (1 - 0.3 * hop / 14), 8 * sc, 0, 0, TAU); ctx.fill();
        ctx.save();
        ctx.translate(pc.c.x + pc.dx * e, pc.c.y + pc.dy * e - hop);
        ctx.rotate(pc.rot * (u < 1 ? EZ.outBack(u) : 1));
        ctx.scale(sc, sc);
        ctx.globalAlpha = a;
        ctx.translate(-pc.c.x, -pc.c.y);
        blit(ctx, pc.spr);
        ctx.strokeStyle = 'rgba(20,22,34,' + (0.75 * Math.max(sepA, u)) + ')'; ctx.lineWidth = 1.7; ctx.lineJoin = 'round';
        polyPath(ctx, pc.ring); ctx.stroke();
        ctx.restore();
      });
      // 아직 붙어 있는 동안 남은 금 (조각이 움직이면 사라져요)
      const ca = 1 - sstep(0.23, 0.27, p);
      if (ca > 0.01) G.paths.forEach((cp) => drawCrackLine(ctx, cp, 1, 1.3, ca));
    }
    // 자갈 조각
    G.pieces.forEach((pc) => {
      pc.chunks.forEach((ch) => {
        const vis = sstep(ch.t0, ch.t0 + 0.04, p) * (1 - sstep(ch.t1, ch.t1 + 0.1, p));
        if (vis <= 0.01) return;
        const lx = pc.c.x + pc.dx + ch.ox, base = moundTop(lx, moundH(p));
        const x = lx, y = Math.min(gy(lx) - ch.s * 0.35, base + ch.s * 0.2 + (ch.shade * 10)) - 1;
        const s = ch.s * (0.35 + 0.65 * sstep(ch.t0, ch.t0 + 0.08, p)) * (1 - 0.4 * sstep(ch.t1, ch.t1 + 0.1, p));
        const col = mixc('#8d9097', '#b9b1a4', ch.shade);
        ctx.save(); ctx.globalAlpha = vis;
        chunkPoly(ctx, x, y, s, ch.rot, ch.pts, ch.seed);
        ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(30,30,40,.55)'; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x - s * 0.6, y - s * 0.25); ctx.lineTo(x - s * 0.05, y - s * 0.62); ctx.stroke();
        ctx.restore();
      });
    });
    // 풀과 꽃이 돋아요
    const gr = sstep(0.82, 1, p);
    if (gr > 0.02) {
      const r = rng(41);
      for (let i = 0; i < 16; i++) {
        const x = 200 + r() * 380, ph = i / 16;
        if (gr < ph) continue;
        const top = moundTop(x, moundH(p)), s = clamp((gr - ph) * 3, 0, 1) * (0.9 + r() * 0.5);
        drawTuft(ctx, x, top + 3, s, i % 3 ? '#4f9f4d' : '#6bbd5b', t);
        if (i % 5 === 0 && s > 0.8) { ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(x + 4, top - 14 * s, 2.6, 0, TAU); ctx.fill(); }
      }
    }
    // 어린 나무 한 그루 (끝 무렵)
    const sap = sstep(0.9, 1, p);
    if (sap > 0.02) drawTree(ctx, 300, moundTop(300, moundH(p)) + 2, 0.34 * EZ.outBack(sap), t);

    V.P.draw(ctx);
    // 비
    if (rainy > 0.02) {
      ctx.save(); ctx.strokeStyle = 'rgba(205,225,250,' + (0.55 * rainy) + ')'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      const r = rng(8);
      for (let i = 0; i < 70; i++) {
        const x0 = 120 + r() * 420, sp = 380 + r() * 220, ph = r(), y = 130 + ((t * sp + ph * 400) % 320), x = x0 - (y - 130) * 0.18;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2.4, y + 11); ctx.stroke();
      }
      ctx.restore();
    }
    drawTint(ctx, W, H, M.day, light);
    // 단서 표시
    if (p > 0.1) {
      const k = EZ.outBack(sstep(0.1, 0.17, p));
      MARKERS.forEach((m, i) => {
        const found = M.clues[m.key];
        const by = m.y + (RM ? 0 : Math.sin(t * 2.4 + i * 1.7) * 3);
        ctx.save(); ctx.translate(m.x, by); ctx.scale(k, k);
        if (!found) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.4 * pulse()) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 21 + 4 * pulse(), 0, TAU); ctx.stroke(); }
        SciSim.draw(ctx).sphere(0, 0, 16, found ? '#14a058' : '#0ea5e9', { shadow: true, gloss: true });
        ctx.fillStyle = '#fff'; ctx.font = 'bold 19px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(found ? '✓' : '?', 0, 1);
        ctx.restore();
      });
    }
    ctx.textBaseline = 'alphabetic';
  }

  function drawMound(ctx, p, t) {
    const H = moundH(p);
    if (H < 0.8) return;
    const x0 = 160, x1 = 624, soil = sstep(0.78, 0.98, p);
    ctx.beginPath(); ctx.moveTo(x0, gy(x0) + 4);
    for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, moundTop(x, H));
    for (let x = x1; x >= x0; x -= 6) ctx.lineTo(x, gy(x) + 4);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, gy(300) - H, 0, gy(300));
    g.addColorStop(0, mixc('#cbbfa9', '#6d4f34', soil)); g.addColorStop(1, mixc('#a79b86', '#5b412b', soil));
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    const pat = ctx.createPattern(sprite('gravelTile', 70, 70, (g2) => {
      const r = rng(12);
      for (let i = 0; i < 70; i++) { g2.fillStyle = ['#8f8f92', '#d4cdbf', '#6c6a68', '#b9ad98'][i % 4]; g2.globalAlpha = 0.55; g2.beginPath(); const x = r() * 70, y = r() * 70, s = 1.2 + r() * 3; g2.moveTo(x, y); g2.lineTo(x + s, y + s * 0.3); g2.lineTo(x + s * 0.4, y + s); g2.closePath(); g2.fill(); }
    }), 'repeat');
    if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / SS));
    ctx.globalAlpha = 0.9 * (1 - soil * 0.7); ctx.fillStyle = pat; ctx.fillRect(x0, gy(300) - H - 6, x1 - x0, H + 60);
    const pat2 = ctx.createPattern(sprite('soilTile', 60, 60, (g2) => {
      const r = rng(31);
      for (let i = 0; i < 60; i++) { g2.fillStyle = ['#3d2a1a', '#8a6a48', '#c9a77c'][i % 3]; g2.globalAlpha = 0.5; g2.beginPath(); g2.arc(r() * 60, r() * 60, 0.8 + r() * 1.9, 0, TAU); g2.fill(); }
    }), 'repeat');
    if (pat2.setTransform) pat2.setTransform(new DOMMatrix().scale(1 / SS));
    ctx.globalAlpha = soil * 0.9; ctx.fillStyle = pat2; ctx.fillRect(x0, gy(300) - H - 6, x1 - x0, H + 60);
    ctx.restore();
    ctx.globalAlpha = 1;
    // 윗면 반짝이는 가장자리
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let x = x0; x <= x1; x += 6) (x === x0 ? ctx.moveTo(x, moundTop(x, H) + 1) : ctx.lineTo(x, moundTop(x, H) + 1));
    ctx.stroke();
  }

  /* ---------- 공통 HUD 조각 ---------- */
  function bubble(ctx, L, x, y, w, lines, o) {            // 말풍선 (x,y: 꼬리 끝, 위쪽에 상자)
    o = o || {};
    const fs = Math.round(14.5 * L.fs * 10) / 10, lh = fs * 1.4, pad = 11;
    const h = (o.title ? lh + 2 : 0) + lines.length * lh + pad * 2 - 4;
    let bx = clamp(x - w / 2, 8, L.vw - w - 8), by = (o.below ? y + 22 : y - h - 20);
    by = clamp(by, 8, L.vh - h - 8);
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#fff'; roundRect(ctx, bx, by, w, h, 14); ctx.fill();
    ctx.restore();
    // 꼬리
    ctx.fillStyle = '#fff'; ctx.beginPath();
    const tx = clamp(x, bx + 18, bx + w - 18);
    if (o.below) { ctx.moveTo(tx - 9, by + 1); ctx.lineTo(x, y + 4); ctx.lineTo(tx + 9, by + 1); } else { ctx.moveTo(tx - 9, by + h - 1); ctx.lineTo(x, y - 2); ctx.lineTo(tx + 9, by + h - 1); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = o.color || '#0ea5e9'; ctx.lineWidth = 2; roundRect(ctx, bx, by, w, h, 14); ctx.stroke();
    let ty = by + pad + fs * 0.9;
    ctx.textAlign = 'left';
    if (o.title) { ctx.fillStyle = o.color || '#0b6b9f'; ctx.font = 'bold ' + fs + 'px ' + FONT; ctx.fillText(o.title, bx + pad + 1, ty); ty += lh + 2; }
    ctx.fillStyle = '#1b2333'; ctx.font = '600 ' + fs + 'px ' + FONT;
    lines.forEach((ln) => { ctx.fillText(ln, bx + pad + 1, ty); ty += lh; });
    return { x: bx, y: by, w, h };
  }
  function textBubble(ctx, L, x, y, w, title, text, o) {
    ctx.font = '600 ' + Math.round(14.5 * L.fs * 10) / 10 + 'px ' + FONT;
    const lines = wrapLines(ctx, text, w - 26);
    return bubble(ctx, L, x, y, w, lines, Object.assign({ title }, o || {}));
  }
  function hintPill(ctx, L, text, y) {
    ctx.font = fnt(L, 14);
    const a = 0.8 + 0.2 * pulse();
    ctx.globalAlpha = a;
    pill(ctx, text, L.vw / 2, y, { bg: 'rgba(27,35,51,.86)', h: 32 * L.fs, shadow: true });
    ctx.globalAlpha = 1;
  }
  // 작은 막대 (게이지)
  function gaugeBar(ctx, x, y, w, h, frac, col, bg) {
    ctx.fillStyle = bg || 'rgba(30,50,90,.14)'; roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    const fw = Math.max(h, w * clamp(frac, 0, 1));
    if (frac > 0.002) { const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, shade(col, 0.2)); g.addColorStop(1, col); ctx.fillStyle = g; roundRect(ctx, x, y, fw, h, h / 2); ctx.fill(); }
  }

  // 새로 열린 도구 표시 (NEW 딱지 · 맥박 치는 테두리)
  function newMark(ctx, x, y) {
    const k = 1 + 0.06 * Math.sin(performance.now() / 150);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.font = 'bold 12.5px ' + FONT;
    ctx.fillStyle = '#0ea5e9'; roundRect(ctx, -22, -11, 44, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NEW', 0, 1);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  }
  function newRect(ctx, r, rad) {
    ctx.save(); ctx.strokeStyle = 'rgba(94,234,212,' + (0.35 + pulse() * 0.6) + ')'; ctx.lineWidth = 4;
    roundRect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, rad || 16); ctx.stroke(); ctx.restore();
  }

  const MT_STAGES = [
    { a: 0, name: '단단한 바위', icon: '🪨' }, { a: 0.07, name: '금이 가요', icon: '⚡' }, { a: 0.25, name: '갈라져서 굴러요', icon: '💥' },
    { a: 0.5, name: '잘게 부서져요', icon: '🧱' }, { a: 0.8, name: '흙 알갱이가 돼요', icon: '🌱' },
  ];
  const stageOf = (p) => { let k = 0; MT_STAGES.forEach((s, i) => { if (p >= s.a) k = i; }); return k; };
  function hudMountain(ctx, V, t) {
    const { L } = V, M = S.mt, p = M.p;
    const found = MARKERS.filter((m) => M.clues[m.key]).length;
    // 시간 표시
    ctx.font = fnt(L, 17);
    const tc = pill(ctx, '⏳ ' + fmtYears(p * 10000), 14, 24 * L.fs + 4, { align: 'left', bg: 'rgba(27,35,51,.82)', h: 34 * L.fs, pad: 12, shadow: true });
    if (isNew('timelapse')) newMark(ctx, tc.x + tc.w + 30, 24 * L.fs + 4);
    // 단계 이름
    const st = MT_STAGES[stageOf(p)];
    ctx.font = fnt(L, 15);
    const by = L.tall ? L.sceneH - 26 : L.vh - 26;
    pill(ctx, st.icon + ' ' + st.name, 14, by, { align: 'left', bg: 'rgba(255,255,255,.92)', color: '#1b2333', stroke: 'rgba(14,165,233,.5)', h: 34 * L.fs, pad: 12, shadow: true });
    // 단서 수
    if (p > 0.12) {
      ctx.font = fnt(L, 14);
      pill(ctx, '🔎 단서 ' + found + ' / 3', L.vw - 14, 24 * L.fs + 4, { align: 'right', bg: found >= 3 ? '#14a058' : 'rgba(255,255,255,.92)', color: found >= 3 ? '#fff' : '#1b2333', stroke: found >= 3 ? null : 'rgba(14,165,233,.5)', h: 32 * L.fs, pad: 12, shadow: true });
    }
    if (S.hintPlay && p < 0.03 && !M.user) hintPill(ctx, L, '👉 ‘세월’ 막대를 밀거나 ▶ 재생을 눌러요', L.tall ? L.sceneH - 70 : L.vh - 76);
    else if (p > 0.12 && found === 0 && !M.callout && p < 0.97) hintPill(ctx, L, '반짝이는 ? 표시를 눌러 보세요', L.tall ? L.sceneH - 70 : L.vh - 76);
    // 단서 설명
    if (M.callout) {
      const m = MARKERS.find((q) => q.key === M.callout.key);
      const age = nowS() - M.callout.t0, a = clamp(age * 6, 0, 1) * (1 - sstep(4.6, 5.2, age));
      ctx.globalAlpha = a;
      textBubble(ctx, L, m.x + L.ox, m.y + L.oy + 24, 260 * Math.min(1, L.fs), m.icon + ' ' + m.title, m.text, { below: true });
      ctx.globalAlpha = 1;
    }
    if (L.tall) {                                                   // 휴대폰 아래 설명판
      const x0 = 14, y0 = L.hud.y + 16;
      ctx.fillStyle = '#5d6879'; ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'left';
      ctx.fillText('바위의 변화 순서', x0, y0 + 14);
      const cur = stageOf(p);
      let x = x0, y = y0 + 40;
      MT_STAGES.slice(1).forEach((s, i) => {
        const on = cur === i + 1, done = cur > i + 1;
        ctx.font = (on ? 'bold ' : '600 ') + '14px ' + FONT;
        const label = s.icon + ' ' + s.name, w = ctx.measureText(label).width + 22;
        if (x + w > L.vw - 10) { x = x0; y += 38; }
        ctx.fillStyle = on ? '#0ea5e9' : done ? '#d7f0e0' : '#e4ebf5';
        roundRect(ctx, x, y - 14, w, 30, 15); ctx.fill();
        ctx.fillStyle = on ? '#fff' : done ? '#14663c' : '#6b7587'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 11, y + 1.5); ctx.textBaseline = 'alphabetic';
        x += w + 8;
      });
      y += 52;
      ctx.fillStyle = '#5d6879'; ctx.font = 'bold 15px ' + FONT; ctx.fillText('찾은 단서', x0, y);
      x = x0; y += 24;
      MARKERS.forEach((m) => {
        const f = M.clues[m.key];
        ctx.font = 'bold 14px ' + FONT;
        const label = (f ? '✅ ' : '⬜ ') + m.title, w = ctx.measureText(label).width + 22;
        ctx.fillStyle = f ? '#d7f0e0' : '#e4ebf5'; roundRect(ctx, x, y - 14, w, 30, 15); ctx.fill();
        ctx.fillStyle = f ? '#14663c' : '#6b7587'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 11, y + 1.5); ctx.textBaseline = 'alphabetic';
        x += w + 8;
      });
    }
  }

  /* =========================================================
     장면 2 · 풍화 실험대 (얼음 · 뿌리)
     바위 하나를 금(crack)을 따라 둘로 나누어 두고, 금이 벌어진 정도(w)에 따라 두 조각을
     가로줄 조각으로 옮겨 그려요. w가 한계를 넘으면 두 조각이 갈라져 떨어져요.
     ========================================================= */
  const GROUND = 500;
  const SPLIT_W = 40;                                  // 이 너비를 넘으면 바위가 쪼개져요
  function buildLabRock(seed) {
    const cx = 372, rx = 178, ry = 152;
    const ring = blobRing(cx, GROUND - ry + 8, rx, ry, 24, 0.045, seed, 0.9);
    const bb = bboxOf(ring, 16);
    const crack = makeCrack('y', cx + 12, 0.045, 10, seed + 3, bb.y);
    const parts = splitRing(ring, crack);
    if (!parts) { console.warn('실험 바위 나누기 실패'); }
    const tex = makeTex(bb, seed, PAL_ROCK_WARM);
    const full = cutSprite(tex, ring, { moss: 0.9, seed });
    const left = cutSprite(tex, parts.A, { seed: seed + 1 });
    const right = cutSprite(tex, parts.B, { seed: seed + 2 });
    const path = parts.path;
    // 얼음 결정 무늬 (금 안쪽에 그릴 짧은 선들)
    const r = rng(seed + 11), facets = [];
    for (let i = 0; i < 70; i++) facets.push({ u: r(), v: r() * 2 - 1, a: r() * Math.PI, l: 5 + r() * 12 });
    const bounds = bboxOf(parts.A, 0), boundsR = bboxOf(parts.B, 0);
    return { cx, ring, crack, path, topY: path[0].y, botY: path[path.length - 1].y, full, left, right, tex, facets, bbL: bounds, bbR: boundsR, rx, ry };
  }
  const gapW = (R, st, y) => {
    const top = R.topY, tipY = top + (R.botY - top) * st.tip;
    if (y < top || y > tipY) return 0;
    return st.w * Math.pow(1 - (y - top) / Math.max(1, tipY - top), 0.8);
  };
  function gapPoly(R, st, y0, y1, inset) {
    const Lp = [], Rp = [];
    for (let y = y0; y <= y1 + 0.01; y += 3) {
      const w = gapW(R, st, y), xc = R.crack.f(y);
      Lp.push({ x: xc - w / 2 + inset, y }); Rp.push({ x: xc + w / 2 - inset, y });
    }
    return Lp.concat(Rp.reverse());
  }
  const NEW_ICE = () => ({ R: null, w: 5, wT: 5, tip: 0.3, tipT: 0.3, water: 0, waterT: 0, frozen: 0, frozenT: 0, temp: 6, tempT: 6, night: 0,
    cycles: 0, expanded: false, split: false, splitT: 0, pour: null, press: 0, glow: 0, shake: 0, thawed: 0, freezes: 0, pours: 0, hint: 0 });
  const NEW_ROOT = () => ({ R: null, tp: 0, p: 0, pV: 0, playing: false, w: 5, tip: 0.3, split: false, splitT: 0, user: false, maxP: 0 });

  /* ----- 그리기: 바위 (금이 벌어진 것 포함) ----- */
  function drawLabRock(ctx, R, st, t) {
    const top = R.topY, tipY = top + (R.botY - top) * st.tip;
    // 땅에 드리우는 그림자
    const sp = st.split ? EZ.outCubic(clamp(st.splitT, 0, 1)) : 0, sep = st.w / 2 + 34 * sp;
    ctx.fillStyle = 'rgba(25,30,40,.2)';
    ctx.beginPath(); ctx.ellipse(R.cx - sep * 0.5, GROUND + 1, R.rx * 0.56, 8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(R.cx + sep * 0.5, GROUND + 1, R.rx * 0.56, 8, 0, 0, TAU); ctx.fill();
    if (st.split) {
      // 두 조각이 벌어지며 약간 기울었다가 자리를 잡아요
      const tilt = (Math.sin(clamp(st.splitT, 0, 1) * Math.PI) * 0.16);
      const gapMax = SPLIT_W;
      const dxL = -(gapMax / 2 + 34 * sp), dxR = gapMax / 2 + 34 * sp;
      ctx.save();
      ctx.translate(R.bbL.x + 14 + dxL, GROUND); ctx.rotate(-tilt); ctx.translate(-(R.bbL.x + 14), -GROUND);
      blit(ctx, R.left, 0, 0); ctx.restore();
      ctx.save();
      ctx.translate(R.bbR.x + R.bbR.w - 14 + dxR, GROUND); ctx.rotate(tilt); ctx.translate(-(R.bbR.x + R.bbR.w - 14), -GROUND);
      blit(ctx, R.right, 0, 0); ctx.restore();
      return;
    }
    if (st.w < 0.4 && st.tip <= 0.001) { blit(ctx, R.full); return; }
    blitRows(ctx, R.full, R.full.y, top, 0);
    blitRows(ctx, R.full, tipY, R.full.y + R.full.h, 0);
    // 금 속 (어두운 틈)
    const gp = gapPoly(R, st, top, tipY, -2.5);
    const gg = ctx.createLinearGradient(0, top, 0, tipY);
    gg.addColorStop(0, '#1a1d26'); gg.addColorStop(1, '#0c0e13');
    ctx.fillStyle = gg; polyPath(ctx, gp); ctx.fill();
    for (let y = top; y < tipY; y += 2) {
      const w = gapW(R, st, y);
      blitRows(ctx, R.left, y, Math.min(y + 2.25, tipY), -w / 2);
      blitRows(ctx, R.right, y, Math.min(y + 2.25, tipY), w / 2);
    }
    // 금 끝 반짝임
    if (st.glow > 0.02) {
      const xc = R.crack.f(tipY);
      SciSim.draw(ctx).glow(xc, tipY, 26 * st.glow + 6, '#ffe08a', 0.9 * st.glow);
    }
  }

  /* ----- 얼음 장면 ----- */
  function syncIceButtons() {
    const I = S.ice, pour = $('#pourBtn'), fz = $('#freezeBtn'), note = $('#iceNote');
    if (!I) return;
    const busy = !!I.pour;
    pour.disabled = busy || I.split || I.frozenT > 0.5;
    fz.disabled = busy;
    fz.className = 'btn btn-sm ' + (I.split ? 'btn-good' : I.frozenT > 0.5 ? 'btn-subject' : 'btn-primary');
    fz.innerHTML = I.split ? '↺ 새 바위' : I.frozenT > 0.5 ? '☀ 녹이기' : '❄ 얼리기';
    note.textContent = I.split ? '바위가 쪼개졌어요! 새 바위로 다시 해 볼 수 있어요.' : I.water < 0.5 && !busy ? '먼저 틈에 물을 부어요.' : I.frozenT > 0.5 ? '얼음이 되면서 부피가 늘어나요.' : '얼렸다 녹이기를 되풀이해 봐요.';
  }
  function pourWater() {
    if (!S.ice) resetIce();
    const I = S.ice;
    if (I.pour || I.split || I.frozenT > 0.5) return;
    Sound.click();
    I.pour = { t: 0 }; S.hintPlay = false;
    syncIceButtons();
  }
  function toggleFreeze() {
    if (!S.ice) resetIce();
    const I = S.ice;
    if (I.pour) return;
    if (I.split) { resetIce(); Sound.click(); return; }
    if (I.frozenT < 0.5) {
      if (I.water < 0.5) { I.hint = 1; const b = $('#pourBtn'); b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); SciSim.toast('먼저 💧 물 붓기로 틈에 물을 채워요', null, 1800); Sound.fail(); return; }
      I.tempT = -9; I.frozenT = 1; I.freezes++; Sound.tone(520, 0.16, 'triangle', 0.07);
    } else { I.tempT = 6; I.frozenT = 0; Sound.tone(380, 0.16, 'triangle', 0.06); }
    syncIceButtons();
  }
  function resetIce() {
    const old = S.ice, R = old && old.R;
    S.ice = NEW_ICE(); S.ice.R = R || buildLabRock(31);
    if (old) S.ice.poured = false;
    syncIceButtons();
  }
  $('#pourBtn').addEventListener('click', pourWater);
  $('#freezeBtn').addEventListener('click', toggleFreeze);

  function iceBurst(V, kind) {
    const I = S.ice, R = I.R, xc = R.crack.f(R.topY) + 0;
    if (kind === 'split') {
      dust(V.P, R.cx, GROUND - 6, 16, 'rgba(214,200,176,.6)', 160);
      for (let i = 0; i < 26; i++) {
        const a = -Math.PI * (0.1 + Math.random() * 0.8), sp = 120 + Math.random() * 240;
        V.P.emit({ x: xc, y: R.topY + 40 + Math.random() * 200, vx: Math.cos(a) * sp * 0.7, vy: Math.sin(a) * sp * 0.5, life: 0.9, size: 3 + Math.random() * 3, color: i % 2 ? '#7cc4ff' : '#e8f8ff', shape: 'circle', gravity: 700, drag: 0.5 });
      }
    } else if (kind === 'crack') {
      for (let i = 0; i < 10; i++) V.P.emit({ x: xc + (Math.random() - 0.5) * 20, y: R.topY - 2, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 90, life: 0.7, size: 1.8 + Math.random() * 2, color: ['#9a9da4', '#d7d1c6'][i % 2], shape: 'square', gravity: 520, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
    }
  }

  function updateIce(dt, t, V) {
    if (!S.ice) resetIce();
    const I = S.ice, R = I.R;
    // 온도 · 얼음 · 물 · 금
    I.temp = approach(I.temp, I.tempT, dt, RM ? 99 : 2.6);
    I.night = approach(I.night, I.temp < 0.5 ? 1 : 0, dt, RM ? 99 : 2.2);
    I.water = approach(I.water, I.waterT, dt, RM ? 99 : 3.2);
    // 얼음은 영하가 되면 얼고, 영상이 되면 녹아요
    const target = I.temp < -1 ? 1 : I.temp > 1 ? 0 : I.frozen;
    I.frozen = approach(I.frozen, target, dt, RM ? 99 : 2.4);
    I.w = approach(I.w, I.wT, dt, RM ? 99 : 5.5);
    I.tip = approach(I.tip, I.tipT, dt, RM ? 99 : 3.2);
    I.press = approach(I.press, 0, dt, 1.3);
    I.glow = approach(I.glow, 0, dt, 2.4);
    I.shake = approach(I.shake, 0, dt, 6);
    // 얼음이 다 얼면 틈을 벌려요 (한 번)
    if (I.frozen > 0.97 && !I.expanded && !I.split) {
      I.expanded = true; I.cycles++;
      I.press = 1; I.glow = 1; I.shake = 1;
      if (I.cycles >= 4) { splitIce(V); }
      else {
        I.wT = Math.min(SPLIT_W - 4, I.wT + 8); I.tipT = Math.min(0.97, I.tipT + 0.17);
        Sound.tone(210, 0.2, 'sawtooth', 0.06); Sound.tone(140, 0.28, 'triangle', 0.06, 0.05);
        iceBurst(V, 'crack');
      }
      syncIceButtons();
    }
    if (I.frozen < 0.03 && I.expanded && !I.split) { I.expanded = false; I.thawed++; syncIceButtons(); }
    // 쪼개짐 애니메이션
    if (I.split) I.splitT = Math.min(1, I.splitT + dt / 1.5);
    // 물 붓기 애니메이션
    if (I.pour) {
      const P = I.pour; P.t += dt;
      if (P.t > 0.9 && P.t < 1.9) {
        I.waterT = clamp((P.t - 0.9) / 1.0, 0, 1);
        const lip = pourLip(R, P);
        for (let k = 0; k < 2; k++) V.P.emit({ x: lip.x - 3, y: lip.y + 2, vx: -34 - Math.random() * 18, vy: 20 + Math.random() * 30, life: 0.55, size: 2.2 + Math.random() * 1.6, color: '#59b4ff', shape: 'circle', gravity: 900, drag: 0.2 });
      }
      if (P.t > 1.1 && P.t < 2.0 && Math.random() < 0.5) {
        const xc = R.crack.f(R.topY);
        V.P.emit({ x: xc + (Math.random() - 0.5) * 6, y: R.topY - 2, vx: (Math.random() - 0.5) * 70, vy: -50 - Math.random() * 40, life: 0.4, size: 1.8, color: '#9bd2ff', shape: 'circle', gravity: 600 });
      }
      if (P.t >= 2.5) { I.pour = null; I.water = Math.max(I.water, 0.98); I.waterT = 1; I.pours++; syncIceButtons(); }
    }
    if (I.hint > 0) I.hint = approach(I.hint, 0, dt, 0.6);
    // 얼음이 얼 때 눈 결정 (밤)
    if (!RM && I.night > 0.5 && Math.random() < dt * 5) V.P.emit({ x: 120 + Math.random() * 520, y: 40, vx: -8 + Math.random() * 16, vy: 40 + Math.random() * 30, life: 5, size: 1.8 + Math.random() * 1.4, color: '#ffffff', shape: 'circle', gravity: 0, drag: 0.1 });
  }
  function splitIce(V) {
    const I = S.ice;
    I.split = true; I.splitT = 0; I.waterT = 0; I.tempT = I.tempT; I.wT = SPLIT_W; I.w = SPLIT_W;
    Sound.tone(110, 0.5, 'sawtooth', 0.09); Sound.tone(70, 0.6, 'triangle', 0.1, 0.05);
    iceBurst(V, 'split');
    I.water = 0; I.frozenT = 0; I.tempT = 6; I.expanded = true;
  }
  const pourLip = (R, P) => {                        // 비커 입구(주둥이)의 세계 좌표
    const xc = R.crack.f(R.topY), t = P.t;
    const inE = EZ.outBack(clamp(t / 0.5, 0, 1)), outE = EZ.inOutCubic(clamp((t - 2.0) / 0.5, 0, 1));
    const x = mixn(xc + 330, xc + 20, inE) + outE * 320, y = mixn(R.topY - 210, R.topY - 78, inE) - outE * 150;
    const ang = -0.98 * EZ.inOutCubic(clamp((t - 0.5) / 0.4, 0, 1)) * (1 - EZ.inOutCubic(clamp((t - 1.95) / 0.3, 0, 1)));
    return { x, y, ang, level: P.t < 0.9 ? 0.78 : 0.78 - 0.7 * clamp((t - 0.9) / 1.0, 0, 1) };
  };

  function drawBeaker(ctx, R, P) {
    const lip = pourLip(R, P), bw = 62, bh = 82;
    ctx.save();
    ctx.translate(lip.x, lip.y); ctx.rotate(lip.ang);
    // 액체: 수면은 항상 수평
    const lv = lip.level;
    if (lv > 0.02) {
      ctx.save();
      roundRect(ctx, 0, 0, bw, bh - 3, 8); ctx.clip();
      const px = lip.x + Math.cos(lip.ang) * (bw / 2) - Math.sin(lip.ang) * (bh * (1 - lv)), py = lip.y + Math.sin(lip.ang) * (bw / 2) + Math.cos(lip.ang) * (bh * (1 - lv));
      ctx.rotate(-lip.ang); ctx.translate(-lip.x, -lip.y);
      const g = ctx.createLinearGradient(0, py, 0, py + 70); g.addColorStop(0, 'rgba(90,180,255,.85)'); g.addColorStop(1, 'rgba(40,130,230,.95)');
      ctx.fillStyle = g; ctx.fillRect(lip.x - 160, py, 320, 160);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(lip.x - 160, py, 320, 2.4);
      ctx.restore();
    }
    SciSim.draw(ctx).beaker(0, 0, bw, bh, { level: 0, ticks: 4, glass: '#7f93ad' });
    ctx.restore();
  }

  function drawIceInGap(ctx, R, st, t) {
    const top = R.topY, tipY = top + (R.botY - top) * st.tip;
    // 물
    const wat = clamp(st.water, 0, 1) * (1 - st.frozen);
    const ice = st.frozen;
    const yW = tipY - (tipY - top) * clamp(st.water, 0, 1);
    if (st.water > 0.01 && ice < 0.995) {
      const gp = gapPoly(R, st, Math.max(top, yW), tipY, -1.2);
      if (gp.length > 3) {
        ctx.save(); ctx.globalAlpha = 1 - ice * 0.9;
        const g = ctx.createLinearGradient(0, yW, 0, tipY); g.addColorStop(0, 'rgba(96,184,255,.95)'); g.addColorStop(1, 'rgba(34,112,215,.98)');
        ctx.fillStyle = g; polyPath(ctx, gp); ctx.fill();
        ctx.clip(); // 수면 반짝임
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(R.cx - 80, yW, 200, 2.6);
        for (let i = 0; i < 5; i++) { const yy = yW + 8 + ((t * 20 + i * 47) % Math.max(10, tipY - yW)); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(R.crack.f(yy) - 2, yy, 3, 8); }
        ctx.restore();
      }
    }
    if (ice > 0.02 && st.water > 0.2) {
      const gp = gapPoly(R, st, Math.max(top, yW), tipY, -1.2);
      if (gp.length > 3) {
        ctx.save(); ctx.globalAlpha = clamp(ice * 1.3, 0, 1);
        const g = ctx.createLinearGradient(0, yW, 0, tipY); g.addColorStop(0, '#f2fcff'); g.addColorStop(0.5, '#c8ecfb'); g.addColorStop(1, '#8fd0f0');
        ctx.fillStyle = g; polyPath(ctx, gp); ctx.fill(); ctx.clip();
        // 결정 무늬
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2;
        R.facets.forEach((f) => {
          const y = mixn(yW, tipY, f.u), xc = R.crack.f(y), w = gapW(R, st, y);
          const x = xc + f.v * w * 0.4;
          ctx.beginPath(); ctx.moveTo(x - Math.cos(f.a) * f.l * 0.5, y - Math.sin(f.a) * f.l * 0.5); ctx.lineTo(x + Math.cos(f.a) * f.l * 0.5, y + Math.sin(f.a) * f.l * 0.5); ctx.stroke();
        });
        ctx.strokeStyle = 'rgba(70,150,200,.35)';
        for (let i = 0; i < 6; i++) { const y = mixn(yW, tipY, (i + 0.5) / 6), xc = R.crack.f(y), w = gapW(R, st, y); ctx.beginPath(); ctx.moveTo(xc - w * 0.45, y); ctx.lineTo(xc + w * 0.45, y + 6); ctx.stroke(); }
        ctx.restore();
        // 부피가 늘어 입구 위로 볼록하게 솟아요
        if (st.water > 0.9) {
          const xc = R.crack.f(top), w = gapW(R, st, top + 0.5), cap = 15 * ice;
          ctx.save(); ctx.globalAlpha = clamp(ice * 1.3, 0, 1);
          const cg = ctx.createLinearGradient(0, top - cap, 0, top + 2); cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, '#bfe6f8');
          ctx.fillStyle = cg; ctx.strokeStyle = 'rgba(80,150,200,.6)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(xc - w / 2 - 1, top + 1); ctx.quadraticCurveTo(xc - w / 2 - 3, top - cap * 1.1, xc, top - cap); ctx.quadraticCurveTo(xc + w / 2 + 3, top - cap * 1.1, xc + w / 2 + 1, top + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      }
    }
    // 얼음이 벽을 미는 화살표
    if (st.press > 0.03) {
      const D = SciSim.draw(ctx);
      for (let k = 0; k < 3; k++) {
        const y = top + (tipY - top) * (0.22 + k * 0.25), xc = R.crack.f(y), w = gapW(R, st, y) / 2;
        if (w < 2.5) continue;
        const len = 24 + 16 * st.press;
        D.arrow(xc - w + 2, y, xc - w - len, y, { color: 'rgba(226,70,75,' + Math.min(1, st.press * 1.4) + ')', width: 3.4, head: 11 });
        D.arrow(xc + w - 2, y, xc + w + len, y, { color: 'rgba(226,70,75,' + Math.min(1, st.press * 1.4) + ')', width: 3.4, head: 11 });
      }
    }
  }

  function labBackdrop(ctx, light, day, t) {
    drawSky(ctx, 800, 600, day, light, t);
    drawFarHills(ctx, 800, light);
    // 땅
    const g = ctx.createLinearGradient(0, GROUND - 6, 0, 600);
    g.addColorStop(0, '#79c86b'); g.addColorStop(0.12, '#5faa56'); g.addColorStop(0.14, '#9a7753'); g.addColorStop(1, '#5d432e');
    ctx.fillStyle = g; ctx.fillRect(0, GROUND - 6, 800, 120);
    ctx.fillStyle = 'rgba(190,240,150,.85)'; ctx.fillRect(0, GROUND - 6, 800, 2.4);
    const r = rng(23); ctx.globalAlpha = 0.4;
    for (let i = 0; i < 40; i++) { const x = r() * 800, y = GROUND + 20 + r() * 70; ctx.fillStyle = r() < 0.5 ? '#c4a57f' : '#46321f'; ctx.beginPath(); ctx.arc(x, y, 1 + r() * 2.6, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  function drawIceScene(ctx, V, t) {
    if (!S.ice) resetIce();
    const I = S.ice, R = I.R;
    const day = 0.25 + 0.5 * I.night, light = lightOf(day);
    labBackdrop(ctx, light, day, t);
    ctx.save();
    if (I.shake > 0.02 && !RM) ctx.translate(Math.sin(t * 70) * 2.2 * I.shake, Math.cos(t * 83) * 1.2 * I.shake);
    drawLabRock(ctx, R, I, t);
    if (!I.split) drawIceInGap(ctx, R, I, t);
    ctx.restore();
    if (I.pour) drawBeaker(ctx, R, I.pour);
    V.P.draw(ctx);
    drawTint(ctx, 800, 600, day, light);
    // 상태 이름표 (금 위)
    if (!I.split && !I.pour) {
      const xc = R.crack.f(R.topY), lbl = I.frozen > 0.5 ? '얼음 (부피 ↑)' : I.water > 0.5 ? '물' : '바위 틈';
      const k = I.hint > 0.05 ? 1 + 0.08 * Math.sin(t * 14) : 1;
      ctx.font = 'bold 15px ' + FONT;
      pill(ctx, lbl, xc - 130, R.topY - 44, { bg: I.hint > 0.05 ? '#e2464b' : 'rgba(27,35,51,.86)', h: 28 * k, shadow: true });
      ctx.strokeStyle = 'rgba(27,35,51,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xc - 106, R.topY - 38); ctx.lineTo(xc - 12, R.topY - 4); ctx.stroke();
    }
    ctx.textBaseline = 'alphabetic';
  }

  /* ----- 카드 배치 (가로: 오른쪽 열 / 세로: 아래 판) ----- */
  function labCards(L) {
    if (!L.tall) return { a: { x: 622, y: 60, w: 168, h: 268 }, b: { x: 622, y: 338, w: 168, h: 146 }, c: { x: 622, y: 494, w: 168, h: 92 } };
    const y = L.hud.y + 10, h = L.hud.h - 20;
    return { a: { x: 10, y, w: 160, h }, b: { x: 178, y, w: 166, h }, c: { x: 352, y, w: 158, h } };
  }
  function card(ctx, r, title) {
    softShadow(ctx, r.x, r.y, r.w, r.h, 14, { blur: 12, a: 0.2 });
    ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'left';
    ctx.fillText(title, r.x + 12, r.y + 22);
  }
  function hudIce(ctx, V, t) {
    const { L } = V; if (!S.ice) return;
    const I = S.ice, C = labCards(L), D = SciSim.draw(ctx);
    // 반복 횟수
    ctx.font = fnt(L, 15);
    pill(ctx, '🔁 얼림·녹임 ' + Math.min(I.cycles, 4) + ' / 4회', 14, 24 * L.fs + 4, { align: 'left', bg: I.split ? '#14a058' : 'rgba(27,35,51,.84)', h: 34 * L.fs, pad: 12, shadow: true });
    // 온도계 카드
    if (isNew('lab')) { newRect(ctx, C.a); newMark(ctx, C.a.x + C.a.w - 30, C.a.y + 2); }
    card(ctx, C.a, '🌡️ 온도');
    const tx = C.a.x + 30, ty = C.a.y + 40, th = C.a.h - 98;
    D.thermometer(tx, ty, th, I.temp, -10, 10, { color: I.temp < 0 ? '#3b82f6' : '#e2464b', unit: '', step: 5 });
    ctx.fillStyle = I.temp < 0 ? '#2563eb' : '#dc2626'; ctx.font = '800 26px ' + DISPLAY; ctx.textAlign = 'left';
    ctx.fillText(Math.round(I.temp) + '℃', C.a.x + 92, C.a.y + 86);
    ctx.font = 'bold 14px ' + FONT; ctx.fillStyle = '#5d6879';
    ctx.fillText(I.temp < 0 ? '영하 (밤)' : '영상 (낮)', C.a.x + 92, C.a.y + 110);
    ctx.textAlign = 'center';
    ctx.fillText(I.frozen > 0.5 ? '물이 얼었어요' : I.water > 0.5 ? '물이 있어요' : '틈이 말랐어요', C.a.x + C.a.w / 2, C.a.y + C.a.h - 14);
    ctx.textAlign = 'left';
    // 부피 카드
    card(ctx, C.b, '🔍 부피 비교');
    const bx = C.b.x + 22, by = C.b.y + C.b.h - 36, bh = Math.min(104, C.b.h - 84);
    const volW = bh, volI = bh * (1 + 0.09 * clamp(I.frozen, 0, 1) * (I.water > 0.5 ? 1 : 0));
    const col = (x, h, c1, c2, label, val) => {
      const g = ctx.createLinearGradient(0, by - h, 0, by); g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; roundRect(ctx, x, by - h, 46, h, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(80,110,150,.5)'; ctx.lineWidth = 1.5; roundRect(ctx, x, by - h, 46, h, 6); ctx.stroke();
      ctx.fillStyle = '#1b2333'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.fillText(label, x + 23, by + 18);
      ctx.fillStyle = '#fff'; ctx.font = '800 15px ' + FONT; ctx.fillText(val, x + 23, by - h / 2 + 5);
    };
    col(bx, volW, '#7cc4ff', '#2f7fe0', '물', '100');
    col(bx + 66, volI, '#f4fcff', '#9bd6f2', '얼음', String(Math.round(100 + 9 * clamp(I.frozen, 0, 1) * (I.water > 0.5 ? 1 : 0))));
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(226,70,75,.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx - 4, by - volW); ctx.lineTo(bx + 116, by - volW); ctx.stroke(); ctx.setLineDash([]);
    if (I.frozen > 0.5 && I.water > 0.5) { ctx.fillStyle = '#d33a3f'; ctx.font = '800 15px ' + FONT; ctx.textAlign = 'left'; ctx.fillText('+9 %', bx + 76, by - volI - 6); }
    // 틈 너비 카드
    card(ctx, C.c, '↔️ 틈의 너비');
    gaugeBar(ctx, C.c.x + 12, C.c.y + 36, C.c.w - 24, 16, (I.w - 5) / (SPLIT_W - 5), '#e2464b');
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'left';
    ctx.fillText(I.split ? '바위가 쪼개졌어요!' : I.cycles === 0 ? '아직 좁아요' : '조금씩 벌어져요', C.c.x + 12, C.c.y + 74);
    // 안내
    if (I.water < 0.3 && !I.pour && !I.split && S.hintPlay) hintPill(ctx, L, '💧 먼저 틈에 물을 부어 보세요', L.tall ? L.sceneH - 42 : L.vh - 40);
    if (I.split) splitBanner(ctx, L, I.R, I.splitT);
  }
  function splitBanner(ctx, L, R, st) {
    const a = EZ.outBack(clamp(st * 2.2, 0, 1));
    ctx.save(); ctx.translate(R.cx + L.ox, 262); ctx.scale(a, a);
    ctx.font = '24px ' + DISPLAY;
    pill(ctx, '🎉 쪼개졌어요!', 0, 0, { bg: '#14a058', h: 44, pad: 18, shadow: true });
    ctx.restore();
  }

  /* ----- 뿌리 장면 ----- */
  const ROOT_YEARS = 30;
  function updateRoot(dt, t, V) {
    if (!S.root.R) S.root.R = buildLabRock(47);
    const Rt = S.root, R = Rt.R;
    if (Rt.playing) { Rt.tp = Math.min(1, Rt.tp + dt * 0.075); syncTime(Rt.tp); updateTimeText(); if (Rt.tp >= 1) setPlaying(false); }
    crit(Rt, 'p', Rt.tp, dt, RM ? 99 : 12);
    Rt.p = clamp(Rt.p, 0, 1);
    if (Rt.p > Rt.maxP) Rt.maxP = Rt.p;
    const g = Rt.p;
    Rt.w = 5 + 30 * sstep(0.08, 0.96, g);
    Rt.tip = 0.3 + 0.68 * sstep(0.04, 0.92, g);
    const want = g >= 0.985;
    if (want && !Rt.split) {
      Rt.split = true; Rt.splitT = 0;
      Sound.tone(110, 0.5, 'sawtooth', 0.09); Sound.tone(70, 0.6, 'triangle', 0.1, 0.05);
      const xc = R.crack.f(R.topY);
      dust(V.P, R.cx, GROUND - 6, 16, 'rgba(214,200,176,.6)', 160);
      for (let i = 0; i < 14; i++) V.P.emit({ x: xc, y: R.topY + 20 + Math.random() * 200, vx: (Math.random() - 0.5) * 240, vy: -60 - Math.random() * 120, life: 1, size: 3 + Math.random() * 3, color: ['#9a9da4', '#7d7f86', '#d7d1c6'][i % 3], shape: 'square', gravity: 600, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    } else if (!want && Rt.split && g < 0.95) { Rt.split = false; Rt.splitT = 0; }
    if (Rt.split) Rt.splitT = Math.min(1, Rt.splitT + dt / 1.5);
    // 틈이 벌어질 때 부스러기 (자라는 동안)
    if (!RM && Rt.playing && Math.random() < dt * 6 && !Rt.split) {
      const xc = R.crack.f(R.topY);
      V.P.emit({ x: xc + (Math.random() - 0.5) * Rt.w, y: R.topY, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 40, life: 0.8, size: 1.6 + Math.random() * 1.6, color: '#8a6a48', shape: 'square', gravity: 400, rot: 1, vr: 4 });
    }
  }

  // 뿌리: 금을 따라 내려가는 굵은 뿌리 + 곁뿌리
  const ROOT_SIDE = (() => { const r = rng(5), a = []; for (let i = 0; i < 9; i++) a.push({ u: 0.12 + i * 0.09 + r() * 0.04, dir: i % 2 ? 1 : -1, len: 34 + r() * 40, drop: 8 + r() * 22, seed: r() }); return a; })();
  function drawRoots(ctx, R, Rt, t) {
    const g = Rt.p, top = R.topY, tipY = top + (R.botY - top) * Rt.tip;
    const depth = (tipY - top) * 0.97 * sstep(0.0, 0.88, g);
    if (depth < 3) return;
    const th0 = 3 + 21 * Math.pow(g, 1.15);
    const pts = [];
    for (let y = top - 6; y <= top + depth; y += 4) pts.push(y);
    const thAt = (y) => Math.max(1.4, th0 * Math.pow(1 - (y - top) / Math.max(1, (tipY - top)), 0.65));
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 곁뿌리
    ROOT_SIDE.forEach((s) => {
      const gy0 = top + (tipY - top) * s.u;
      if (gy0 > top + depth) return;
      const k = sstep(0, 0.12, (top + depth - gy0) / Math.max(1, tipY - top));
      const x0 = R.crack.f(gy0), x1 = x0 + s.dir * s.len * k, y1 = gy0 + s.drop * k;
      ctx.strokeStyle = '#5a3d27'; ctx.lineWidth = Math.max(1.2, thAt(gy0) * 0.28 + 1.2);
      ctx.beginPath(); ctx.moveTo(x0, gy0); ctx.quadraticCurveTo(x0 + s.dir * s.len * 0.55 * k, gy0 + 2 * k, x1, y1); ctx.stroke();
      ctx.strokeStyle = '#9a7048'; ctx.lineWidth = Math.max(0.8, thAt(gy0) * 0.12 + 0.6);
      ctx.beginPath(); ctx.moveTo(x0, gy0 - 0.8); ctx.quadraticCurveTo(x0 + s.dir * s.len * 0.55 * k, gy0 + 1 * k, x1, y1 - 0.8); ctx.stroke();
    });
    // 굵은 뿌리 (왼쪽·오른쪽 가장자리를 따라 다각형)
    const Lp = pts.map((y) => ({ x: R.crack.f(y) - thAt(y) / 2, y })), Rp = pts.map((y) => ({ x: R.crack.f(y) + thAt(y) / 2, y })).reverse();
    const gg = ctx.createLinearGradient(R.crack.f(top) - th0, 0, R.crack.f(top) + th0, 0);
    gg.addColorStop(0, '#5a3d27'); gg.addColorStop(0.45, '#9a7048'); gg.addColorStop(1, '#4b3220');
    ctx.fillStyle = gg; polyPath(ctx, Lp.concat(Rp)); ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,8,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    // 껍질 무늬
    ctx.strokeStyle = 'rgba(40,24,10,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = top + (depth / 12) * i, y2 = y + 14;
      ctx.beginPath(); ctx.moveTo(R.crack.f(y) + (i % 2 ? -1 : 1) * thAt(y) * 0.18, y); ctx.lineTo(R.crack.f(y2) + (i % 2 ? -1 : 1) * thAt(y2) * 0.18, y2); ctx.stroke();
    }
    // 뿌리 끝 (새로 자라는 곳은 연한 색)
    const ey = top + depth, ex = R.crack.f(ey);
    ctx.fillStyle = '#e6c9a0'; ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.8, thAt(ey) / 2 + 0.8), 0, TAU); ctx.fill();
    ctx.restore();
  }
  // 바위 위에서 자라는 나무
  function drawSapling(ctx, x, y, g, t) {
    // 흙 한 줌
    const mw = 34 + 26 * g;
    const sg = ctx.createLinearGradient(0, y - 12, 0, y + 6); sg.addColorStop(0, '#7a5a3b'); sg.addColorStop(1, '#4e3822');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x - mw, y + 4); ctx.quadraticCurveTo(x - mw * 0.6, y - 14, x, y - 15); ctx.quadraticCurveTo(x + mw * 0.6, y - 14, x + mw, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6bb85d'; ctx.beginPath(); ctx.ellipse(x - mw * 0.35, y - 12, mw * 0.4, 4.2, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + mw * 0.4, y - 11, mw * 0.36, 4, 0, Math.PI, 0); ctx.fill();
    const s = 0.2 + 0.95 * Math.pow(g, 0.8);
    drawTree(ctx, x, y - 8, s, t, g < 0.1 ? { mid: '#5cc06a', light: '#9be58f' } : {});
  }
  function drawRootScene(ctx, V, t) {
    if (!S.root.R) S.root.R = buildLabRock(47);
    const Rt = S.root, R = Rt.R, day = 0.2 + (RM ? 0 : Math.sin(t * 0.05) * 0.02), light = lightOf(day);
    labBackdrop(ctx, light, day, t);
    drawLabRock(ctx, R, { w: Rt.w, tip: Rt.tip, split: Rt.split, splitT: Rt.splitT, glow: 0 }, t);
    drawRoots(ctx, R, Rt, t);
    const xc = R.crack.f(R.topY);
    drawSapling(ctx, xc, R.topY + 2, Rt.p, t);
    V.P.draw(ctx);
    drawTint(ctx, 800, 600, day, light);
    ctx.textBaseline = 'alphabetic';
  }
  function hudRoot(ctx, V, t) {
    const { L } = V; const Rt = S.root; if (!Rt.R) return;
    const C = labCards(L);
    ctx.font = fnt(L, 15);
    pill(ctx, '🌱 ' + Math.round(Rt.p * ROOT_YEARS) + '년 자랐어요', 14, 24 * L.fs + 4, { align: 'left', bg: Rt.split ? '#14a058' : 'rgba(27,35,51,.84)', h: 34 * L.fs, pad: 12, shadow: true });
    if (isNew('lab')) { newRect(ctx, C.a); newMark(ctx, C.a.x + C.a.w - 30, C.a.y + 2); }
    card(ctx, C.a, '🌳 식물의 키');
    const bx = C.a.x + 16, by = C.a.y + C.a.h - 28, bh = C.a.h - 80;
    ctx.fillStyle = 'rgba(30,50,90,.12)'; roundRect(ctx, bx, by - bh, 30, bh, 15); ctx.fill();
    const hh = Math.max(14, bh * (0.1 + 0.9 * Rt.p));
    const gr = ctx.createLinearGradient(0, by - hh, 0, by); gr.addColorStop(0, '#7fd37a'); gr.addColorStop(1, '#2f8a47');
    ctx.fillStyle = gr; roundRect(ctx, bx, by - hh, 30, hh, 15); ctx.fill();
    ctx.fillStyle = '#1b2333'; ctx.font = '800 26px ' + DISPLAY; ctx.textAlign = 'left';
    ctx.fillText(Math.round(Rt.p * ROOT_YEARS) + '년', C.a.x + 62, C.a.y + 100);
    ctx.font = 'bold 13.5px ' + FONT; ctx.fillStyle = '#5d6879';
    ctx.fillText(Rt.p < 0.2 ? '어린 싹' : Rt.p < 0.7 ? '자라는 나무' : '커다란 나무', C.a.x + 62, C.a.y + 126);
    card(ctx, C.b, '🌱 뿌리의 굵기');
    gaugeBar(ctx, C.b.x + 12, C.b.y + 38, C.b.w - 24, 16, Math.pow(Rt.p, 1.15), '#a9743f');
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'left';
    ctx.fillText(Rt.p < 0.3 ? '가늘어요' : Rt.p < 0.8 ? '점점 굵어져요' : '아주 굵어요', C.b.x + 12, C.b.y + 78);
    card(ctx, C.c, '↔️ 틈의 너비');
    gaugeBar(ctx, C.c.x + 12, C.c.y + 36, C.c.w - 24, 16, (Rt.w - 5) / (SPLIT_W - 5), '#e2464b');
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 13px ' + FONT; ctx.fillText(Rt.split ? '바위가 쪼개졌어요!' : Rt.p < 0.05 ? '아직 좁아요' : '조금씩 벌어져요', C.c.x + 12, C.c.y + 74);
    if (Rt.p < 0.03 && !Rt.user && S.hintPlay) hintPill(ctx, L, '👉 ‘식물이 자란 시간’ 막대를 밀어요', L.tall ? L.sceneH - 42 : L.vh - 40);
    if (Rt.split) splitBanner(ctx, L, Rt.R, Rt.splitT);
  }

  /* =========================================================
     장면 3 · 토양 단면 모형
     깊이(px) 규칙: 풍화 앞면 F → 부스러기 층, 표토 바닥 T, 심토 바닥 Sb (표면에서 잰 깊이)
     ========================================================= */
  const hexMix = (a, b, t) => { const A = SciSim.color.hexToRgb(a), B = SciSim.color.hexToRgb(b), f = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0'); return '#' + f(A.r, B.r) + f(A.g, B.g) + f(A.b, B.b); };
  const PF = { fx: 150, fy: 178, fw: 376, fh: 356, ox: 46, oy: -30 };
  const PF_YEARS = 30000;
  const LAYERS = [
    { key: 'top', name: '표토', long: '표토', col: '#4a3220', rim: '#7a5334' },
    { key: 'sub', name: '심토', long: '심토', col: '#b3743f', rim: '#d9a06a' },
    { key: 'deb', name: '부스러기 층', long: '암석 부스러기 층', col: '#b4a38a', rim: '#d6c8b0' },
    { key: 'rock', name: '기반암', long: '기반암', col: '#7e8189', rim: '#aeb2ba' },
  ];
  const pfDepths = (p) => {
    const T = 62 * sstep(0.34, 0.72, p), F = 234 * sstep(0.04, 0.5, p);
    const Sb = T + 76 * sstep(0.58, 0.98, p);
    return { F, T, Sb };
  };
  // 층의 위·아래 깊이 (완성된 모습, p=1)
  const FINAL = pfDepths(1);
  const LAYER_RANGE = { top: [0, FINAL.T], sub: [FINAL.T, FINAL.Sb], deb: [FINAL.Sb, FINAL.F], rock: [FINAL.F, PF.fh] };
  const NEW_PF = () => ({ p: 0, pV: 0, tp: 0, maxP: 0, playing: false, user: false, lock: false, touched: false,
    tags: LAYERS.map((l, i) => ({ key: l.key, label: l.name, slot: -1, x: 0, y: 0, xV: 0, yV: 0, drag: false, lift: 0, init: false, wrong: 0, order: i })), checked: false, tagMode: false, drops: [], hit: { deb: false, top: false, sub: false } });

  // 흙·돌 무늬 타일
  const tileSoil = () => sprite('pf-soil', 72, 72, (g) => {
    const r = rng(14);
    for (let i = 0; i < 110; i++) {
      const x = r() * 72, y = r() * 72, k = r();
      g.globalAlpha = 0.5;
      if (k < 0.55) { g.fillStyle = '#2b1c10'; g.beginPath(); g.arc(x, y, 0.8 + r() * 1.8, 0, TAU); g.fill(); }
      else if (k < 0.8) { g.fillStyle = '#8f6a45'; g.beginPath(); g.arc(x, y, 0.6 + r() * 1.3, 0, TAU); g.fill(); }
      else if (k < 0.9) { g.fillStyle = '#4a7a3a'; g.fillRect(x, y, 3.4, 1.4); }
      else { g.strokeStyle = '#6e5238'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5 + r() * 5, y + (r() - 0.5) * 5); g.stroke(); }
    }
  });
  const tileSub = () => sprite('pf-sub', 72, 72, (g) => {
    const r = rng(15);
    for (let i = 0; i < 100; i++) {
      const x = r() * 72, y = r() * 72, k = r();
      g.globalAlpha = 0.45;
      g.fillStyle = k < 0.5 ? '#8a4f25' : k < 0.8 ? '#e0b184' : '#6c3d1d';
      g.beginPath(); g.arc(x, y, 0.7 + r() * 1.7, 0, TAU); g.fill();
    }
  });
  const tileDeb = () => sprite('pf-deb', 80, 80, (g) => {
    const r = rng(16);
    for (let i = 0; i < 70; i++) {
      const x = r() * 80, y = r() * 80, s = 1.4 + r() * 4.2;
      g.globalAlpha = 0.65; g.fillStyle = ['#8e8f95', '#d8d0c0', '#6b6a6e', '#c4b79f'][i % 4];
      g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s, y - s * 0.2); g.lineTo(x + s * 0.5, y + s); g.lineTo(x - s * 0.8, y + s * 0.4); g.closePath(); g.fill();
    }
  });
  const tileRock = () => sprite('pf-rock', 90, 90, (g) => {
    const r = rng(17);
    for (let i = 0; i < 140; i++) { const x = r() * 90, y = r() * 90; g.globalAlpha = 0.3; g.fillStyle = ['#4f525a', '#b6b9c0', '#a69a8e'][i % 3]; g.fillRect(x, y, 1 + r() * 2, 1 + r()); }
    g.globalAlpha = 0.25; g.strokeStyle = '#2f3138'; g.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const y = 15 + i * 30 + r() * 8; g.beginPath(); g.moveTo(0, y); g.lineTo(90, y + (r() - 0.5) * 6); g.stroke(); }
  });
  const patFill = (ctx, tile, size, alpha) => {
    const pat = ctx.createPattern(tile, 'repeat');
    if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / SS));
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = pat; ctx.fill(); ctx.restore();
  };
  // 부스러기 조각들 (아래로 갈수록 커요)
  const DEB_FRAGS = (() => {
    const r = rng(33), a = [];
    for (let i = 0; i < 90; i++) {
      const u = r(), v = Math.pow(r(), 0.8);
      a.push({ x: 10 + u * (PF.fw - 20), v, s: 3 + v * 17 * (0.5 + r() * 0.7), rot: r() * TAU, n: 5 + Math.floor(r() * 2), shade: r(), seed: r() * 50 });
    }
    return a;
  })();
  const ROOTS = (() => {
    const r = rng(52), a = [];
    for (let i = 0; i < 13; i++) {
      const x = 30 + (i + r() * 0.7) * ((PF.fw - 60) / 13), len = 56 + r() * 94, pts = [{ x, y: 0 }];
      let cx = x, cy = 0;
      for (let k = 1; k <= 8; k++) { cx += (r() - 0.5) * 20; cy = len * (k / 8); pts.push({ x: cx, y: cy }); }
      a.push({ pts, len, br: r() < 0.6 ? { at: 3 + Math.floor(r() * 3), dir: r() < 0.5 ? -1 : 1, l: 14 + r() * 22 } : null, w: 1.2 + r() * 1.8 });
    }
    return a;
  })();
  const WORMS = [{ x: 90, d: 30, s: 1 }, { x: 250, d: 44, s: -1 }];

  const faceBound = (depth, x, amp, seed, per) => depth <= 0.3 ? 0 : depth + amp * vnoise(seed, x / per) * Math.min(1, depth / 26);

  function drawProfileFace(ctx, p, t) {
    const { fw, fh } = PF, D = pfDepths(p), step = 5;
    // 기반암
    ctx.save(); roundRect(ctx, 0, 0, fw, fh, 6); ctx.clip();
    const gb = ctx.createLinearGradient(0, 0, 0, fh); gb.addColorStop(0, '#8d9098'); gb.addColorStop(1, '#5e616a');
    ctx.fillStyle = gb; ctx.fillRect(0, 0, fw, fh);
    ctx.beginPath(); ctx.rect(0, 0, fw, fh); patFill(ctx, tileRock(), 90, 0.9);
    // 층 경계 만들기
    const poly = (depth, amp, seed, per) => {
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= fw + 0.1; x += step) ctx.lineTo(x, faceBound(depth, x, amp, seed, per));
      ctx.lineTo(fw, 0); ctx.closePath();
    };
    const edge = (depth, amp, seed, per, col) => {
      if (depth <= 0.5) return;
      ctx.beginPath();
      for (let x = 0; x <= fw + 0.1; x += step) { const y = faceBound(depth, x, amp, seed, per); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke();
    };
    // 부스러기 층
    if (D.F > 0.5) {
      poly(D.F, 15, 3, 17);
      const g = ctx.createLinearGradient(0, 0, 0, D.F); g.addColorStop(0, '#c9bba3'); g.addColorStop(1, '#9d8e78');
      ctx.fillStyle = g; ctx.fill(); patFill(ctx, tileDeb(), 80, 0.9);
      ctx.save(); poly(D.F, 15, 3, 17); ctx.clip();
      DEB_FRAGS.forEach((f) => {
        const y = f.v * D.F * 0.97;
        if (y > faceBound(D.F, f.x, 15, 3, 17) - f.s * 0.3) return;
        ctx.beginPath();
        for (let k = 0; k < f.n; k++) { const a = f.rot + (k / f.n) * TAU, rr = f.s * (0.7 + 0.3 * Math.abs(hash1(Math.floor(f.seed * 10), k))); ctx.lineTo(f.x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
        ctx.closePath();
        ctx.fillStyle = mixc('#7f8087', '#d6cdbd', f.shade); ctx.fill();
        ctx.strokeStyle = 'rgba(30,28,30,.45)'; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.restore();
      edge(D.F, 15, 3, 17, 'rgba(40,34,30,.55)');
    }
    // 심토
    if (D.Sb > 0.5) {
      poly(D.Sb, 6, 5, 52);
      const g = ctx.createLinearGradient(0, 0, 0, D.Sb); g.addColorStop(0, '#b87a46'); g.addColorStop(1, '#c99562');
      ctx.fillStyle = g; ctx.fill(); patFill(ctx, tileSub(), 72, 0.9);
      edge(D.Sb, 6, 5, 52, 'rgba(70,40,18,.5)');
    }
    // 표토
    if (D.T > 0.5) {
      poly(D.T, 5, 7, 46);
      const g = ctx.createLinearGradient(0, 0, 0, D.T); g.addColorStop(0, '#3c281a'); g.addColorStop(1, '#58402a');
      ctx.fillStyle = g; ctx.fill(); patFill(ctx, tileSoil(), 72, 0.95);
      edge(D.T, 5, 7, 46, 'rgba(25,14,6,.55)');
    }
    // 뿌리
    const rg = sstep(0.42, 0.96, p);
    if (rg > 0.01) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ROOTS.forEach((rt, i) => {
        const k = clamp(rg * 1.15 - (i % 5) * 0.04, 0, 1); if (k <= 0) return;
        const maxY = rt.len * k;
        ctx.strokeStyle = '#d2b48c'; ctx.lineWidth = rt.w; ctx.beginPath(); ctx.moveTo(rt.pts[0].x, 0);
        for (let q = 1; q < rt.pts.length; q++) { const a = rt.pts[q - 1], b = rt.pts[q]; if (b.y <= maxY) ctx.lineTo(b.x, b.y); else { const f = (maxY - a.y) / Math.max(1, b.y - a.y); ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); break; } }
        ctx.stroke();
        if (rt.br && maxY > rt.pts[rt.br.at].y) { const b = rt.pts[rt.br.at]; ctx.lineWidth = rt.w * 0.6; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(b.x + rt.br.dir * rt.br.l * 0.6, b.y + 4, b.x + rt.br.dir * rt.br.l, b.y + 12 * k); ctx.stroke(); }
      });
      ctx.restore();
    }
    // 지렁이 (표토가 생긴 뒤)
    const wk = sstep(0.62, 0.78, p);
    if (wk > 0.01 && D.T > 24) {
      WORMS.forEach((w, i) => {
        const wx = w.x + (RM ? 0 : Math.sin(t * 0.4 + i * 2) * 14), wy = Math.min(w.d, D.T - 10) + 4;
        ctx.save(); ctx.globalAlpha = wk; ctx.strokeStyle = '#e8a1ad'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let k = 0; k <= 14; k++) { const x = wx + k * 3.2 * w.s, y = wy + Math.sin(k * 0.9 + (RM ? 0 : t * 3 * w.s)) * 2.2; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); ctx.restore();
      });
    }
    // 스며드는 물질 (표토 → 심토)
    S.pf.drops.forEach((d) => {
      if (d.y > D.Sb + 2) return;
      ctx.globalAlpha = clamp(d.life * 1.4, 0, 0.9) * (1 - sstep(D.Sb - 14, D.Sb, d.y));
      ctx.fillStyle = '#f3c98b'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(d.x - 0.8, d.y - d.r * 0.7, 1.2, 1.2);
    });
    ctx.globalAlpha = 1;
    // 안쪽 그림자 (입체감)
    const gi = ctx.createLinearGradient(0, 0, 14, 0); gi.addColorStop(0, 'rgba(0,0,0,.22)'); gi.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gi; ctx.fillRect(0, 0, 14, fh);
    ctx.restore();
    ctx.strokeStyle = 'rgba(20,24,36,.55)'; ctx.lineWidth = 2; roundRect(ctx, 0, 0, fw, fh, 6); ctx.stroke();
  }

  function drawProfileBlock(ctx, p, t) {
    const { fx, fy, fw, fh, ox, oy } = PF, D = pfDepths(p);
    // 바닥 그림자
    ctx.fillStyle = 'rgba(30,50,40,.22)'; ctx.beginPath(); ctx.ellipse(fx + fw / 2 + 24, fy + fh + 14, fw * 0.62, 18, 0, 0, TAU); ctx.fill();
    // 오른쪽 면
    ctx.save(); ctx.translate(fx + fw, fy);
    const segs = [[0, D.T, '#3a271a'], [D.T, D.Sb, '#8e5a30'], [D.Sb, D.F, '#8d7e68'], [D.F, fh, '#62656c']].filter((q) => q[1] - q[0] > 0.5);
    segs.forEach((q) => {
      ctx.fillStyle = q[2]; ctx.beginPath(); ctx.moveTo(0, q[0]); ctx.lineTo(ox, q[0] + oy); ctx.lineTo(ox, q[1] + oy); ctx.lineTo(0, q[1]); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ox, oy); ctx.lineTo(ox, fh + oy); ctx.lineTo(0, fh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,24,36,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    // 윗면 (이끼 → 풀)
    const cover = sstep(0.14, 0.7, p), grass = sstep(0.4, 0.8, p);
    ctx.save(); ctx.translate(fx, fy);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(fw, 0); ctx.lineTo(fw + ox, oy); ctx.lineTo(ox, oy); ctx.closePath();
    const base = hexMix(hexMix('#9a9ca4', '#6f9a5a', cover), '#5aa653', grass);
    const gt = ctx.createLinearGradient(0, oy, 0, 0); gt.addColorStop(0, shade(base, 0.14)); gt.addColorStop(1, base);
    ctx.fillStyle = gt; ctx.fill();
    ctx.save(); ctx.clip();
    const rr = rng(63);
    for (let i = 0; i < 70; i++) {
      const u = rr(), v = rr(), x = u * fw + v * ox, y = v * oy, kk = rr();
      if (kk > 0.3 + 0.7 * cover) { ctx.fillStyle = 'rgba(60,62,70,.25)'; ctx.fillRect(x, y, 3, 1.6); continue; }
      ctx.globalAlpha = 0.5 + 0.4 * cover; ctx.fillStyle = kk < 0.5 ? '#3f8c46' : '#7bc467'; ctx.beginPath(); ctx.arc(x, y, 1.5 + rr() * 2.6 * cover, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(20,24,36,.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(fw, 0); ctx.lineTo(fw + ox, oy); ctx.lineTo(ox, oy); ctx.closePath(); ctx.stroke();
    ctx.restore();
    // 앞면
    ctx.save(); ctx.translate(fx, fy); drawProfileFace(ctx, p, t); ctx.restore();
    // 윗면의 풀·나무
    if (grass > 0.02) {
      const r2 = rng(71);
      for (let i = 0; i < 12; i++) {
        const u = r2(), v = 0.25 + r2() * 0.65, k = clamp((grass - i / 14) * 3, 0, 1); if (k <= 0) continue;
        drawTuft(ctx, fx + u * fw + v * ox, fy + v * oy + 2, 0.75 * k, i % 3 ? '#4f9f4d' : '#6bbd5b', t);
      }
    }
    const tr = sstep(0.64, 1, p);
    if (tr > 0.02) drawTree(ctx, fx + fw * 0.66 + ox * 0.55, fy + oy * 0.55 + 2, 0.12 + 0.5 * tr, t);
    if (p > 0.3) { const sh = sstep(0.34, 0.6, p); drawTuft(ctx, fx + fw * 0.2 + ox * 0.6, fy + oy * 0.6 + 2, 0.9 * sh, '#4f9f4d', t); }
  }

  function updateProfile(dt, t, V) {
    const F = S.pf, prev = F.p;
    if (F.playing) { F.tp = Math.min(1, F.tp + dt * 0.058); syncTime(F.tp); updateTimeText(); if (F.tp >= 1) setPlaying(false); }
    crit(F, 'p', F.tp, dt, RM ? 99 : 13); F.p = clamp(F.p, 0, 1);
    if (F.p > F.maxP) F.maxP = F.p;
    F.hit.deb = F.maxP >= 0.46; F.hit.top = F.maxP >= 0.7; F.hit.sub = F.maxP >= 0.96;
    const D = pfDepths(F.p);
    // 스며드는 물질
    if (F.p > 0.56 && D.T > 8 && !RM && Math.random() < dt * 14 * sstep(0.56, 0.7, F.p)) F.drops.push({ x: 14 + Math.random() * (PF.fw - 28), y: Math.random() * (D.T - 4), vy: 16 + Math.random() * 14, r: 1.6 + Math.random() * 1.4, life: 1 });
    for (let i = F.drops.length - 1; i >= 0; i--) { const d = F.drops[i]; d.y += d.vy * dt; d.life -= dt * 0.12; if (d.y > D.Sb + 6 || d.life <= 0 || F.p < 0.54) F.drops.splice(i, 1); }
    // 낙엽·빗방울 (월드 입자)
    if (!RM) {
      if (F.p > 0.05 && F.p < 0.5 && Math.random() < dt * 5) V.P.emit({ x: PF.fx + 60 + Math.random() * (PF.fw - 40), y: 90, vx: -14, vy: 160, life: 0.55, size: 1.8, color: '#7fb8f0', shape: 'circle', gravity: 500, fade: false });
      if (F.p > 0.4 && Math.random() < dt * 3) V.P.emit({ x: PF.fx + 40 + Math.random() * (PF.fw), y: 96, vx: 12 + Math.random() * 10, vy: 12, life: 1.3, size: 2.6, color: Math.random() < 0.5 ? '#6bbd5b' : '#c8a24a', shape: 'square', gravity: 40, drag: 1.2, rot: 1, vr: 3 });
    }
    // 이름표 위치 (스프링)
    const L = V.L;
    F.tags.forEach((tg, i) => {
      const home = tagHome(L, i), tgt = tg.slot >= 0 ? slotXY(L, tg.slot) : home;
      if (!tg.init) { tg.x = home.x; tg.y = home.y; tg.init = true; }
      if (!tg.drag) { springTo(tg, 'x', tgt.x, dt, 230, 17); springTo(tg, 'y', tgt.y, dt, 230, 17); } else { tg.xV = 0; tg.yV = 0; }
      tg.lift = approach(tg.lift, tg.drag ? 1 : 0, dt, 14);
      tg.wrong = approach(tg.wrong, 0, dt, 3);
    });
    F.tagMode = !!game && game.isActive && !!TAG_MISSION && game.isActive(TAG_MISSION);
  }

  /* ----- 이름표 ----- */
  let TAG_MISSION = null;
  const tagHome = (L, i) => {
    if (!L.tall) return { x: 698, y: 204 + i * 62 };
    return { x: i % 2 ? 380 : 140, y: L.hud.y + 100 + Math.floor(i / 2) * 62 };
  };
  const slotXY = (L, i) => {                          // 층 i(위에서부터) 안의 이름표 자리 (캔버스 좌표)
    const key = LAYERS[i].key, rg = LAYER_RANGE[key], y = PF.fy + (rg[0] + rg[1]) / 2 + L.oy;
    return { x: PF.fx + 74 + L.ox, y };
  };
  const tagSize = (ctx, L, label) => { ctx.font = 'bold ' + Math.round(16 * L.fs) + 'px ' + FONT; return { w: ctx.measureText(label).width + 28, h: 36 * Math.min(1.3, L.fs) }; };
  function tagAt(V, p) {
    const ctx = V.v.ctx, F = S.pf;
    for (let i = F.tags.length - 1; i >= 0; i--) {
      const tg = F.tags[i], sz = tagSize(ctx, V.L, tg.label);
      if (Math.abs(p.x - tg.x) < sz.w / 2 + 8 && Math.abs(p.y - tg.y) < sz.h / 2 + 12) return tg;
    }
    return null;
  }
  function profileHover(V, p) { return S.pf.tagMode && tagAt(V, p) ? 'grab' : null; }
  let dragTag = null, dragOff = { x: 0, y: 0 };
  function profileDown(V, p) {
    const F = S.pf; if (!F.tagMode || !game || game.phase !== 'active') return false;
    const tg = tagAt(V, p); if (!tg) return false;
    dragTag = tg; tg.drag = true; tg.flag = false; dragOff = { x: tg.x - p.x, y: tg.y - p.y };
    // 맨 위로
    F.tags.splice(F.tags.indexOf(tg), 1); F.tags.push(tg);
    F.checked = false; Sound.tone(620, 0.05, 'triangle', 0.05);
    return true;
  }
  function profileMove(V, p) { if (dragTag) { dragTag.x = p.x + dragOff.x; dragTag.y = p.y + dragOff.y; } }
  function profileUp(V, p) {
    const F = S.pf, tg = dragTag; if (!tg) return;
    dragTag = null; tg.drag = false;
    const L = V.L, depth = p.y - L.oy - PF.fy;
    const inX = p.x - L.ox > PF.fx - 24 && p.x - L.ox < PF.fx + PF.fw + PF.ox + 24;
    let target = -1;
    if (inX && depth > -4 && depth < PF.fh + 8) target = LAYERS.findIndex((l) => depth >= LAYER_RANGE[l.key][0] - 1 && depth < LAYER_RANGE[l.key][1] + 1);
    if (target < 0 && inX && depth >= PF.fh + 8) target = -1;
    const old = tg.slot;
    if (target >= 0) {
      const other = F.tags.find((q) => q !== tg && q.slot === target);
      if (other) { other.slot = old; other.wrong = 0; other.flag = false; }
      tg.slot = target; Sound.tone(780, 0.1, 'triangle', 0.08);
      const s = slotXY(L, target); V.P.burst(s.x - L.ox, s.y - L.oy, { count: 8, colors: ['#ffffff', '#fde68a', '#5eead4'], speed: 70, gravity: 0, size: 2.2, life: 0.5 });
    } else { tg.slot = -1; Sound.tone(300, 0.08, 'sine', 0.05); }
  }
  function tagVerdict() {                              // 부작용 없이 검사만
    const F = S.pf;
    const placed = F.tags.filter((t) => t.slot >= 0);
    const wrong = F.tags.filter((t) => t.slot >= 0 && LAYERS[t.slot].key !== t.key);
    return { placed: placed.length, wrong, ok: placed.length === 4 && wrong.length === 0 };
  }

  function drawProfile(ctx, V, t) {
    const F = S.pf, L = V.L;
    // 하늘 + 바닥
    const g = ctx.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, '#cfe7fb'); g.addColorStop(0.7, '#eef7ff'); g.addColorStop(1, '#e3f1e0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 600);
    cloudShape(ctx, 90 + (RM ? 0 : (t * 3) % 40), 80, 0.7, '#ffffff', 0.9); cloudShape(ctx, 590, 70, 0.6, '#ffffff', 0.85);
    const gg = ctx.createLinearGradient(0, 540, 0, 600); gg.addColorStop(0, '#b6dba0'); gg.addColorStop(1, '#8fc47a');
    ctx.fillStyle = gg; ctx.fillRect(0, 548, 800, 52);
    drawProfileBlock(ctx, F.p, t);
    V.P.draw(ctx);
    // 층 이름 표시 (이름표 미션 중에는 숨겨요)
    if (!F.tagMode) {
      const D = pfDepths(F.p);
      const items = [['top', D.T > 14, 0, D.T], ['sub', D.Sb - D.T > 14, D.T, D.Sb], ['deb', D.F - D.Sb > 14, D.Sb, D.F], ['rock', true, D.F, PF.fh]];
      items.forEach((it, i) => {
        if (!it[1]) return;
        const li = LAYERS.findIndex((l) => l.key === it[0]), lay = LAYERS[li];
        const a = F.p < 0.04 && it[0] !== 'rock' ? 0 : 1, y = PF.fy + (it[2] + it[3]) / 2;
        ctx.save(); ctx.globalAlpha = a;
        ctx.font = 'bold 15px ' + FONT;
        pill(ctx, lay.long, PF.fx + 10, y, { align: 'left', bg: 'rgba(255,255,255,.93)', color: '#1b2333', stroke: lay.rim, h: 28, shadow: true });
        ctx.restore();
      });
    }
    ctx.textBaseline = 'alphabetic';
  }

  function hudProfile(ctx, V, t) {
    const { L } = V, F = S.pf, D = pfDepths(F.p);
    ctx.font = fnt(L, 17);
    const tc = pill(ctx, '⏳ ' + (F.p < 0.01 ? '처음' : fmtYears(F.p * PF_YEARS)), 14, 24 * L.fs + 4, { align: 'left', bg: 'rgba(27,35,51,.84)', h: 34 * L.fs, pad: 12, shadow: true });
    if (isNew('profile')) newMark(ctx, tc.x + tc.w + 30, 24 * L.fs + 4);
    // 단계 표시줄
    const stages = [['① 부스러기 층', F.hit.deb], ['② 표토', F.hit.top], ['③ 심토', F.hit.sub]];
    const cur = F.p < 0.34 ? 0 : F.p < 0.58 ? 1 : 2;
    if (!L.tall) {
      let x = L.vw - 14;
      for (let i = 2; i >= 0; i--) {
        ctx.font = 'bold 14px ' + FONT;
        const r = pill(ctx, (stages[i][1] ? '✓ ' : '') + stages[i][0], x, 24 * L.fs + 4, { align: 'right', bg: stages[i][1] ? '#14a058' : (cur === i && F.p > 0.02 ? '#0ea5e9' : 'rgba(255,255,255,.92)'), color: stages[i][1] || (cur === i && F.p > 0.02) ? '#fff' : '#5d6879', h: 32, pad: 11, shadow: true });
        x = r.x - 8;
      }
    }
    // 설명 글
    const cap = F.p < 0.04 ? '단단한 기반암이 땅속 깊이 있어요.' : F.p < 0.34 ? '기반암이 풍화되어 부서지면서 암석 부스러기 층이 생겨요.' : F.p < 0.58 ? '식물이 자라고 썩은 유기물이 쌓여 검은 갈색의 표토가 생겨요.' : '표토에서 녹은 물질이 빗물에 씻겨 내려가 아래에 쌓여 심토가 생겨요.';
    if (F.tagMode) {
      // 이름표 쟁반
      const tray = L.tall ? { x: 8, y: L.hud.y + 8, w: L.vw - 16, h: L.hud.h - 16 } : { x: 604, y: 120, w: 186, h: 300 };
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.strokeStyle = 'rgba(14,165,233,.5)'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
      roundRect(ctx, tray.x, tray.y, tray.w, tray.h, 16); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#0b6b9f'; ctx.font = 'bold 16px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('🏷️ 이름표 붙이기', tray.x + tray.w / 2, tray.y + 26);
      ctx.fillStyle = '#5d6879'; ctx.font = '600 13px ' + FONT;
      ctx.fillText(L.tall ? '끌어서 알맞은 층에 놓아요' : '끌어서 알맞은 층에 놓아요', tray.x + tray.w / 2, tray.y + 46);
      // 끌고 있는 이름표가 놓일 층을 밝게
      const dg = F.tags.find((q) => q.drag);
      let hot = -1;
      if (dg) {
        const depth = dg.y - L.oy - PF.fy, inX = dg.x - L.ox > PF.fx - 24 && dg.x - L.ox < PF.fx + PF.fw + PF.ox + 24;
        if (inX && depth > -4 && depth < PF.fh + 8) hot = LAYERS.findIndex((l) => depth >= LAYER_RANGE[l.key][0] - 1 && depth < LAYER_RANGE[l.key][1] + 1);
      }
      if (hot >= 0) {
        const rg = LAYER_RANGE[LAYERS[hot].key];
        ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (0.14 + 0.1 * pulse()) + ')'; ctx.fillRect(PF.fx + L.ox, PF.fy + L.oy + rg[0], PF.fw, rg[1] - rg[0]);
        ctx.strokeStyle = 'rgba(94,234,212,.95)'; ctx.lineWidth = 3; ctx.strokeRect(PF.fx + L.ox + 1.5, PF.fy + L.oy + rg[0] + 1.5, PF.fw - 3, rg[1] - rg[0] - 3); ctx.restore();
      }
      // 자리 표시 (점선)
      LAYERS.forEach((lay, i) => {
        const s = slotXY(L, i), tg = S.pf.tags.find((q) => q.slot === i);
        if (tg) return;
        if (i === hot) SciSim.draw(ctx).ring(s.x - 14, s.y, 22, t, { color: '#5eead4', width: 3 });
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.2; ctx.fillStyle = 'rgba(255,255,255,.18)';
        const w = 118, h = 32; roundRect(ctx, s.x - w / 2 - 14, s.y - h / 2, w, h, 16); ctx.fill(); ctx.stroke(); ctx.restore();
      });
      // 이름표
      F.tags.forEach((tg) => {
        const sz = tagSize(ctx, L, tg.label), lift = tg.lift, sc = 1 + 0.08 * lift;
        const bad = tg.slot >= 0 && F.checked && LAYERS[tg.slot].key !== tg.key;
        ctx.save(); ctx.translate(tg.x + (bad && !RM ? Math.sin(t * 60) * 3 * tg.wrong : 0), tg.y - lift * 6); ctx.scale(sc, sc);
        ctx.shadowColor = 'rgba(20,40,80,' + (0.25 + 0.2 * lift) + ')'; ctx.shadowBlur = 8 + 10 * lift; ctx.shadowOffsetY = 3 + 5 * lift;
        ctx.fillStyle = '#fff'; roundRect(ctx, -sz.w / 2, -sz.h / 2, sz.w, sz.h, sz.h / 2); ctx.fill();
        ctx.shadowColor = 'transparent';
        const lay = LAYERS.find((l) => l.key === tg.key);
        ctx.lineWidth = 3; ctx.strokeStyle = bad ? '#e2464b' : tg.slot >= 0 && F.checked ? '#14a058' : lay.rim; roundRect(ctx, -sz.w / 2, -sz.h / 2, sz.w, sz.h, sz.h / 2); ctx.stroke();
        ctx.fillStyle = '#1b2333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + Math.round(16 * L.fs) + 'px ' + FONT;
        ctx.fillText(tg.label, 0, 1); ctx.restore();
      });
      ctx.textBaseline = 'alphabetic';
    } else if (!L.tall) {
      ctx.font = fnt(L, 15);
      pill(ctx, cap, 14, L.vh - 26, { align: 'left', bg: 'rgba(255,255,255,.94)', color: '#1b2333', stroke: 'rgba(14,165,233,.5)', h: 34, pad: 13, shadow: true });
    }
    if (L.tall && !F.tagMode) {
      const y0 = L.hud.y + 14;
      let x = 12, y = y0 + 16;
      stages.forEach((s, i) => {
        ctx.font = 'bold 14px ' + FONT;
        const label = (s[1] ? '✓ ' : '') + s[0], w = ctx.measureText(label).width + 24;
        ctx.fillStyle = s[1] ? '#14a058' : (cur === i && F.p > 0.02 ? '#0ea5e9' : '#e4ebf5'); roundRect(ctx, x, y - 15, w, 30, 15); ctx.fill();
        ctx.fillStyle = s[1] || (cur === i && F.p > 0.02) ? '#fff' : '#6b7587'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(label, x + 12, y + 1); ctx.textBaseline = 'alphabetic';
        x += w + 8;
      });
      ctx.font = '600 16px ' + FONT; ctx.fillStyle = '#1b2333'; ctx.textAlign = 'left';
      const lines = wrapLines(ctx, cap, L.vw - 28);
      lines.forEach((ln, i) => ctx.fillText(ln, 14, y0 + 62 + i * 24));
    }
    if (S.hintPlay && F.p < 0.02 && !F.user && !F.tagMode) hintPill(ctx, L, '👉 ‘흙이 쌓이는 세월’ 막대를 밀어요', L.tall ? L.sceneH - 42 : L.vh - 72);
  }

  /* =========================================================
     장면 4 · 비탈의 흙 (숲이 있는 비탈 vs 숲이 없는 비탈)
     =========================================================
     세로 위치는 판(패널) 높이에 대한 비율로 계산해요. 땅 윗면 ys(u) = 원래 땅 + 씻겨 간 만큼 낮아짐 */
  const LOSS_RATE = { forest: 0.009, none: 0.095, trees: 0.040, terrace: 0.032 };
  const RUNOFF = { forest: 0.12, none: 1, trees: 0.42, terrace: 0.34 };
  const SPAWN = { forest: 2, none: 34, trees: 11, terrace: 9 };
  const TITLES = { forest: '🌲 숲이 있는 비탈', none: '🪓 숲이 없는 비탈', trees: '🌳 나무를 심은 비탈', terrace: '🌾 계단식 밭' };
  const POND_Y = 0.6, T0F = 0.1, SUBF = 0.12, POND_U = 0.68;
  const syf = (u) => 0.34 + 0.36 * (0.45 * u + 0.55 * u * u * (3 - 2 * u)) + 0.085 * sstep(0.78, 1, u);
  const stairF = (u) => {
    if (u < 0.04 || u > 0.64) return syf(u);
    const i = Math.min(3, Math.floor((u - 0.04) / 0.15));
    return syf(0.04 + 0.15 * (i + 0.5)) + 0.004;
  };
  const FOREST_U = [0.07, 0.17, 0.28, 0.39, 0.5, 0.61];
  const NEW_PANEL = (kind) => ({ kind, loss: 0, lossD: 0, turb: 0, parts: [], grow: 1, terr: 0, ripple: 0, fx: [] });
  const NEW_SLOPE = () => ({
    rain: false, rainLeft: 0, rainAmt: 0, rainBare: 0, rainMethod: 0, rainTotal: 0, method: 'none', Lp: NEW_PANEL('forest'), Rp: NEW_PANEL('none'), flow: 0,
    drops: Array.from({ length: 120 }, (_, i) => ({ u: ((i * 0.6180339) % 1), v: ((i * 0.381966 + 0.13) % 1), sp: 0.9 + ((i * 7) % 10) / 14 })), splash: [], changed: false, usedMethods: {},
  });
  const panelRects = (L) => (L.tall
    ? { Lr: { x: 8, y: 8, w: 504, h: 290 }, Rr: { x: 8, y: 306, w: 504, h: 290 } }
    : { Lr: { x: 14, y: 54, w: 380, h: 430 }, Rr: { x: 406, y: 54, w: 380, h: 430 } });

  function syncSlopeButtons() {
    const Sl = S.sl; if (!Sl) return;
    Array.from($('#methodSeg').children).forEach((b) => b.classList.toggle('on', b.dataset.m === Sl.method));
    const rb = $('#rainBtn');
    rb.innerHTML = Sl.rain ? '⏹ 비 멈추기' : '☔ 비 내리기'; rb.setAttribute('aria-pressed', Sl.rain ? 'true' : 'false');
    $('#rainNote').textContent = Sl.rain ? '두 비탈에 같은 비가 내려요.' : Sl.rainTotal > 0.5 ? '방법을 바꾸고 다시 비를 내려 봐요.' : '같은 양의 비를 내려 비교해요.';
  }
  function setRain(flag) {
    const Sl = S.sl; if (!Sl) return;
    Sl.rain = !!flag; if (flag) { Sl.rainLeft = 9; S.hintPlay = false; }
    Sound.click(); syncSlopeButtons();
  }
  function puffAt(pn, us) {
    if (RM) return;
    us.forEach((u) => { for (let k = 0; k < 9; k++) pn.fx.push({ u, x: 0, y: 0, vx: (Math.random() - 0.5) * 70, vy: -50 - Math.random() * 80, t: 0, life: 0.6 + Math.random() * 0.3, s: 1.6 + Math.random() * 2.2 }); });
  }
  function setMethod(m) {
    const Sl = S.sl; if (!Sl || Sl.method === m) return;
    Sl.method = m; Sl.usedMethods[m] = true;
    const pn = Sl.Rp; pn.kind = m; pn.loss = 0; pn.parts.length = 0; Sl.rainMethod = 0; pn.turb = Math.min(pn.turb, 0.4);
    SciSim.tween(pn, { terr: m === 'terrace' ? 1 : 0 }, { duration: 1.1, ease: 'inOutCubic' });
    if (m === 'trees') { pn.grow = 0; SciSim.tween(pn, { grow: 1 }, { duration: 1.1, ease: 'outBack' }); puffAt(pn, [0.08, 0.18, 0.28, 0.38, 0.48, 0.58]); }
    if (m === 'terrace') puffAt(pn, [0.19, 0.34, 0.49, 0.64]);
    Sound.tone(m === 'none' ? 260 : 660, 0.12, 'triangle', 0.07); syncSlopeButtons();
  }
  $('#rainBtn').addEventListener('click', () => { if (!S.sl) S.sl = NEW_SLOPE(); setRain(!S.sl.rain); });
  Array.from($('#methodSeg').children).forEach((b) => b.addEventListener('click', () => { if (!S.sl) S.sl = NEW_SLOPE(); setMethod(b.dataset.m); }));

  function updateSlope(dt, t, V) {
    if (!S.sl) S.sl = NEW_SLOPE();
    const Sl = S.sl;
    Sl.rainAmt = approach(Sl.rainAmt, Sl.rain ? 1 : 0, dt, 3);
    if (Sl.rain) { Sl.rainLeft -= dt; if (Sl.rainLeft <= 0) { Sl.rain = false; syncSlopeButtons(); } }
    Sl.flow += dt;
    if (Sl.rainAmt > 0.5) { Sl.rainTotal += dt; if (Sl.Rp.kind === 'none') Sl.rainBare += dt; else Sl.rainMethod += dt; }
    [Sl.Lp, Sl.Rp].forEach((pn) => {
      const rate = LOSS_RATE[pn.kind] * Sl.rainAmt * (pn.kind === 'trees' ? (0.55 + 0.45 * clamp(pn.grow, 0, 1)) : 1);
      pn.loss = Math.min(0.95, pn.loss + rate * dt);
      pn.lossD = approach(pn.lossD, pn.loss, dt, RM ? 99 : 4);
      pn.turb = Math.min(1, pn.turb + rate * dt * 1.15); pn.turb = approach(pn.turb, 0, dt, 0.11);
      // 씻겨 내려가는 흙 알갱이
      const lam = SPAWN[pn.kind] * Sl.rainAmt * (pn.loss < 0.9 ? 1 : 0.3);
      if (!RM && Math.random() < lam * dt) pn.parts.push({ u: 0.05 + Math.random() * 0.55, spd: 0.06 + Math.random() * 0.08, dy: Math.random() * 6, s: 1.4 + Math.random() * 1.8 });
      for (let i = pn.parts.length - 1; i >= 0; i--) { const q = pn.parts[i]; q.u += q.spd * dt; if (q.u > POND_U - 0.02) pn.parts.splice(i, 1); }
      if (pn.parts.length > 160) pn.parts.splice(0, pn.parts.length - 160);
      for (let i = pn.fx.length - 1; i >= 0; i--) { const f = pn.fx[i]; f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 260 * dt; if (f.t > f.life) pn.fx.splice(i, 1); }
    });
    for (let i = Sl.splash.length - 1; i >= 0; i--) { Sl.splash[i].t += dt; if (Sl.splash[i].t > 0.3) Sl.splash.splice(i, 1); }
    if (Sl.rainAmt > 0.05) Sl.drops.forEach((d) => { d.v += dt * 1.15 * d.sp; if (d.v > 1) { d.v = -0.05 - Math.random() * 0.2; d.u = Math.random(); if (Sl.splash.length < 50 && Math.random() < 0.5) Sl.splash.push({ u: d.u, t: 0, side: Math.random() < 0.5 ? 0 : 1 }); } });
  }

  function panelTerrain(P, pn) {
    const h = P.h, w = P.w, n = Math.floor(w / 5), ys = [], yt = [], yb = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, ty = h * (pn.terr > 0.001 ? mixn(syf(u), stairF(u), pn.terr) : syf(u));
      const f = 0.75 + 0.5 * Math.sin(Math.PI * clamp(u / 0.84, 0, 1));
      ys.push(ty + h * T0F * pn.lossD * f); yt.push(ty + h * T0F); yb.push(ty + h * (T0F + SUBF));
    }
    return { n, ys, yt, yb };
  }
  const bandPath = (ctx, w, n, A, B) => {
    ctx.beginPath(); ctx.moveTo(0, A[0]);
    for (let i = 1; i <= n; i++) ctx.lineTo((i / n) * w, A[i]);
    for (let i = n; i >= 0; i--) ctx.lineTo((i / n) * w, B[i]);
    ctx.closePath();
  };

  function drawSlopePanel(ctx, P, pn, Sl, t) {
    const { w, h } = P, rainy = Sl.rainAmt, kind = pn.kind, G = panelTerrain(P, pn), n = G.n;
    softShadow(ctx, P.x, P.y, w, h, 16, { blur: 12, a: 0.22 });
    ctx.save(); ctx.translate(P.x, P.y);
    ctx.fillStyle = '#fff'; roundRect(ctx, 0, 0, w, h, 16); ctx.fill();
    roundRect(ctx, 0, 0, w, h, 16); ctx.clip();
    // 하늘
    const sk = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sk.addColorStop(0, mixc('#8ccaf5', '#7c8aa3', rainy * 0.8)); sk.addColorStop(1, mixc('#e4f4ff', '#bcc6d6', rainy * 0.7));
    ctx.fillStyle = sk; ctx.fillRect(0, 0, w, h);
    // 먼 산
    ctx.fillStyle = mixc('#a9c4e4', '#8d9bb3', rainy * 0.8);
    ctx.beginPath(); ctx.moveTo(0, h * 0.5);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, h * (0.3 + 0.1 * vnoise(9, x / 90)));
    ctx.lineTo(w, h * 0.7); ctx.lineTo(0, h * 0.7); ctx.closePath(); ctx.fill();
    // 비구름
    if (rainy > 0.02) {
      cloudShape(ctx, w * 0.14, h * 0.05, 1.05, mixc('#8f9bb4', '#69758f', rainy), 0.95 * rainy);
      cloudShape(ctx, w * 0.5, h * 0.02, 1.2, mixc('#8f9bb4', '#69758f', rainy), 0.95 * rainy);
      cloudShape(ctx, w * 0.78, h * 0.06, 0.95, mixc('#8f9bb4', '#69758f', rainy), 0.95 * rainy);
    }
    // 흙 (기반암 → 심토 → 표토): 땅 모양이 바뀔 때만 다시 그려서 캐시해 둬요
    const ckey = Math.round(pn.lossD * 300) + '|' + Math.round(pn.terr * 120) + '|' + w + 'x' + h;
    if (!pn.cache || pn.cache.key !== ckey) {
      const cv = pn.cache ? pn.cache.cv : document.createElement('canvas');
      cv.width = Math.ceil(w * SS); cv.height = Math.ceil(h * SS);
      const g = cv.getContext('2d'); g.setTransform(SS, 0, 0, SS, 0, 0);
      const bot = new Array(n + 1).fill(h + 4);
      bandPath(g, w, n, G.yb, bot);
      const gb = g.createLinearGradient(0, h * 0.5, 0, h); gb.addColorStop(0, '#8d9098'); gb.addColorStop(1, '#5f626a'); g.fillStyle = gb; g.fill(); patFill(g, tileRock(), 90, 0.85);
      bandPath(g, w, n, G.yt, G.yb);
      g.fillStyle = '#b87a46'; g.fill(); patFill(g, tileSub(), 72, 0.9);
      bandPath(g, w, n, G.ys, G.yt);
      g.fillStyle = '#4a3220'; g.fill(); patFill(g, tileSoil(), 72, 0.95);
      pn.cache = { key: ckey, cv };
    }
    ctx.drawImage(pn.cache.cv, 0, 0, w, h);
    // 윗면 풀 (숲·밭은 초록, 민둥산은 마른 흙)
    const green = kind === 'none' ? 0 : kind === 'trees' ? 0.6 + 0.4 * clamp(pn.grow, 0, 1) : 1;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 5;
    ctx.strokeStyle = mixc('#a8825a', '#5fb257', green); ctx.beginPath();
    for (let i = 0; i <= n; i++) { const x = (i / n) * w; i ? ctx.lineTo(x, G.ys[i] - 1) : ctx.moveTo(x, G.ys[i] - 1); } ctx.stroke(); ctx.restore();
    const surfAt = (u) => { const i = clamp(Math.round(u * n), 0, n); return G.ys[i]; };
    // 계단식 밭의 돌담 · 작물
    if (pn.terr > 0.6) {
      const k = sstep(0.6, 1, pn.terr);
      for (let i = 0; i < 4; i++) {
        const u0 = 0.04 + 0.15 * (i + 1), x = u0 * w, ya = surfAt(u0 - 0.004), yb2 = surfAt(u0 + 0.012);
        ctx.fillStyle = 'rgba(120,120,128,' + k + ')'; ctx.fillRect(x - 3, ya, 7, Math.max(0, yb2 - ya + 8));
        ctx.globalAlpha = k; ctx.fillStyle = '#9a9ba2'; for (let q = 0; q < 6; q++) ctx.fillRect(x - 3, ya + q * (yb2 - ya + 8) / 6 + 1, 7, 2); ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = k;
      for (let i = 0; i < 4; i++) for (let q = 0; q < 4; q++) { const uu = 0.06 + 0.15 * i + q * 0.03, x = uu * w, y = surfAt(uu) - 2; drawTuft(ctx, x, y, 0.8, '#3fa34d', t); }
      ctx.globalAlpha = 1;
    }
    // 나무와 뿌리
    const treeS = h / 540;
    const roots = (x, y, s, k) => {
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(214,184,140,.95)';
      for (let q = -3; q <= 3; q++) {
        if (!q) continue;
        ctx.lineWidth = 2 * s * 1.6; const len = (26 + Math.abs(q) * 5) * s * 1.7 * k;
        ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x + q * 6 * s, y + len * 0.6, x + q * 12 * s * k, y + len); ctx.stroke();
      }
      ctx.lineWidth = 2.6 * s * 1.6; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 1, y + 40 * s * 1.7 * k); ctx.stroke();
      ctx.restore();
    };
    if (kind === 'forest') {
      FOREST_U.forEach((u, i) => { const x = u * w, y = surfAt(u) + 2; roots(x, y, treeS, 1); });
      FOREST_U.forEach((u, i) => { const x = u * w, y = surfAt(u) + 2; if (i % 3 === 1) drawPine(ctx, x, y, treeS * 1.1, t); else drawTree(ctx, x, y, treeS * (0.95 - (i % 2) * 0.12), t); });
    } else if (kind === 'none') {
      [0.14, 0.34, 0.52].forEach((u) => {
        const x = u * w, y = surfAt(u) + 3;
        ctx.fillStyle = '#8a6141'; ctx.fillRect(x - 8 * treeS * 1.6, y - 13 * treeS * 1.6, 16 * treeS * 1.6, 15 * treeS * 1.6);
        ctx.fillStyle = '#c9a373'; ctx.beginPath(); ctx.ellipse(x, y - 13 * treeS * 1.6, 8 * treeS * 1.6, 3 * treeS * 1.6, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(90,60,30,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 13 * treeS * 1.6, 4.5 * treeS * 1.6, 1.6 * treeS * 1.6, 0, 0, TAU); ctx.stroke();
      });
      // 깊게 패인 물길
      const dl = clamp(pn.lossD * 1.2, 0, 1);
      if (dl > 0.05) { ctx.strokeStyle = 'rgba(60,36,18,' + (0.5 * dl) + ')'; ctx.lineWidth = 2.4; [0.22, 0.42].forEach((u0) => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const uu = u0 + i * 0.03, x = uu * w + Math.sin(i * 1.3) * 3, y = surfAt(uu) + 2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }); }
    } else if (kind === 'trees') {
      [0.08, 0.18, 0.28, 0.38, 0.48, 0.58].forEach((u, i) => {
        const x = u * w, y = surfAt(u) + 2, g = clamp(pn.grow, 0, 1.15);
        roots(x, y, treeS * 0.55, clamp(g, 0, 1) * 0.8);
        drawTree(ctx, x, y, Math.max(0.01, treeS * 0.56 * g), t, { mid: '#4aa85a' });
      });
    }
    // 연못 / 하천
    const xw = (() => { for (let i = 0; i <= n; i++) if (G.ys[i] > h * POND_Y) return (i / n) * w; return w; })();
    {
      const wy = h * POND_Y, tb = clamp(pn.turb, 0, 1);
      ctx.beginPath(); ctx.moveTo(xw - 2, wy); ctx.lineTo(w, wy); ctx.lineTo(w, h);
      for (let i = n; i >= 0; i--) { const x = (i / n) * w; if (x >= xw - 2) ctx.lineTo(x, Math.max(wy, G.ys[i])); }
      ctx.closePath();
      const gw = ctx.createLinearGradient(0, wy, 0, h * 0.8);
      gw.addColorStop(0, mixc(mixc('#8fd3fb', '#4fa3ea', 0.4), '#c9a06f', tb)); gw.addColorStop(1, mixc('#3b8fe0', '#8c623a', tb));
      ctx.globalAlpha = 0.92; ctx.fillStyle = gw; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = xw; x <= w; x += 6) { const y = wy + (RM ? 0 : Math.sin(t * 2 + x * 0.09) * 1.4); x === xw ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    }
    // 흐르는 물 (땅 위를 따라) + 흙 알갱이
    const run = RUNOFF[kind] * rainy;
    if (run > 0.04) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 3 + 3 * run; ctx.setLineDash([9, 15]); ctx.lineDashOffset = -Sl.flow * 70;
      ctx.strokeStyle = mixc('#8ec9f4', '#9a7048', clamp(run * 1.1, 0, 1)); ctx.globalAlpha = clamp(0.25 + 0.65 * run, 0, 0.9);
      ctx.beginPath(); for (let i = 1; i < n; i++) { const x = (i / n) * w; if (x > xw - 4) break; const y = G.ys[i] - 3; i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#7a5532';
    pn.parts.forEach((q) => { const x = q.u * w, y = surfAt(q.u) - 3 - q.dy * 0.4 + (RM ? 0 : Math.sin(t * 9 + q.u * 40) * 1); ctx.globalAlpha = 0.9 * (1 - sstep(POND_U - 0.08, POND_U - 0.02, q.u)); ctx.beginPath(); ctx.arc(x, y, q.s, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#6f4e2e';
    pn.fx.forEach((f) => { const x = f.u * w + f.x, y = surfAt(f.u) + f.y; ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.beginPath(); ctx.arc(x, y, f.s, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 빗방울 · 튀는 물
    if (Sl.rainAmt > 0.04) {
      ctx.strokeStyle = 'rgba(215,232,252,' + (0.75 * Sl.rainAmt) + ')'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath();
      Sl.drops.forEach((d) => {
        if (d.v < 0) return; const x = d.u * w - d.v * h * 0.16, y = d.v * h * 0.9;
        if (y > surfAt(clamp(x / w, 0, 1)) - 2 && x / w < 0.8) return; ctx.moveTo(x, y); ctx.lineTo(x - 2.5, y + 12);
      });
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.3;
      Sl.splash.forEach((s) => { const u = clamp(s.u * 0.8, 0, 0.8), x = u * w, y = surfAt(u) - 2, r = 3 + s.t * 22; ctx.globalAlpha = 1 - s.t / 0.3; ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 제목과 게이지
    ctx.save(); ctx.translate(P.x, P.y);
    ctx.font = 'bold 15px ' + FONT;
    const tt = pill(ctx, TITLES[kind], 10, 24, { align: 'left', bg: kind === 'forest' ? '#14a058' : kind === 'none' ? '#c2410c' : '#0ea5e9', h: 30, pad: 12, shadow: true });
    if (kind !== 'forest' && isNew('slope')) newMark(ctx, tt.x + tt.w + 28, 24);
    const gx = w - 154, gy2 = 8;
    ctx.fillStyle = 'rgba(255,255,255,.94)'; roundRect(ctx, gx, gy2, 146, 46, 12); ctx.fill();
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'left'; ctx.fillText('씻겨 간 표토', gx + 10, gy2 + 18);
    const pct = Math.round(pn.lossD * 100);
    ctx.fillStyle = pct > 35 ? '#c2410c' : pct > 12 ? '#d97706' : '#14a058'; ctx.font = '800 15px ' + FONT; ctx.textAlign = 'right'; ctx.fillText(pct + ' %', gx + 136, gy2 + 18);
    gaugeBar(ctx, gx + 10, gy2 + 28, 126, 9, pn.lossD, pct > 35 ? '#e2562a' : pct > 12 ? '#f59e0b' : '#22a35a');
    ctx.restore();
  }

  function drawSlope(ctx, V, t) {
    if (!S.sl) S.sl = NEW_SLOPE();
    const L = V.L, Sl = S.sl, R = panelRects(L);
    ctx.save(); ctx.translate(-L.ox, -L.oy);            // 세계 변환을 풀고 캔버스 좌표로 그려요
    ctx.fillStyle = '#e9f3fc'; ctx.fillRect(0, 0, L.vw, L.sceneH);
    drawSlopePanel(ctx, R.Lr, Sl.Lp, Sl, t);
    drawSlopePanel(ctx, R.Rr, Sl.Rp, Sl, t);
    ctx.restore();
  }
  function hudSlope(ctx, V, t) {
    const { L } = V, Sl = S.sl; if (!Sl) return;
    const Lp = Sl.Lp, Rp = Sl.Rp;
    let msg;
    if (Sl.rainTotal < 0.5) msg = '☔ 비 내리기를 눌러 두 비탈에 같은 비를 내려 봐요.';
    else if (Rp.kind === 'none') msg = Rp.lossD > Lp.lossD * 2 + 0.05 ? '숲이 없는 비탈에서 흙이 훨씬 많이 씻겨 내려가고, 하천이 흙탕물이 돼요.' : '비가 오는 동안 두 비탈의 흙을 비교해 보세요.';
    else if (Rp.kind === 'trees') msg = '나무뿌리가 흙을 붙잡아 흙이 덜 씻겨 가요.';
    else msg = '계단식 밭은 물이 천천히 흘러 흙이 덜 씻겨 가요.';
    if (L.tall) {
      ctx.fillStyle = '#1b2333'; ctx.font = '700 16px ' + FONT; ctx.textAlign = 'left';
      wrapLines(ctx, msg, L.vw - 28).forEach((ln, i) => ctx.fillText(ln, 14, L.hud.y + 34 + i * 24));
      ctx.fillStyle = '#5d6879'; ctx.font = '600 14px ' + FONT;
      wrapLines(ctx, '표토는 만들어지는 데 오랜 세월이 걸려요. 한 번 씻겨 가면 되돌리기 어려워요.', L.vw - 28).forEach((ln, i) => ctx.fillText(ln, 14, L.hud.y + 120 + i * 20));
    } else {
      ctx.save();
      ctx.shadowColor = 'rgba(20,40,80,.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3; ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(ctx, 14, 498, 772, 88, 14); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#1b2333'; ctx.font = '700 17px ' + FONT; ctx.textAlign = 'left';
      wrapLines(ctx, msg, 740).forEach((ln, i) => ctx.fillText(ln, 30, 530 + i * 24));
      ctx.fillStyle = '#5d6879'; ctx.font = '600 14.5px ' + FONT;
      ctx.fillText('표토는 만들어지는 데 오랜 세월이 걸리지만, 한 번 씻겨 가면 되돌리기 어려워요.', 30, 566);
    }
    if (Sl.rainTotal < 0.5 && S.hintPlay) hintPill(ctx, L, '👉 ☔ 비 내리기 버튼을 눌러요', L.tall ? L.sceneH - 30 : 478);
  }

  /* =========================================================
     컨트롤 · 장면 전환 · 포인터 · 그리기 순서 · 반복
     ========================================================= */
  const sTime = $('#sTime'), oTime = $('#oTime'), playBtn = $('#playBtn');
  const rangeTime = SciSim.bindRange(sTime, null, null, (v) => onTimeInput(v / 1000));
  const sceneSeg = $('#sceneSeg');
  const SCENE_NAMES = { mountain: ['🏔 풍화', '산 위 바위의 변화'], ice: ['❄ 얼음', '얼음 실험'], root: ['🌱 뿌리', '뿌리 실험'], profile: ['🪨 토양', '토양 단면'], slope: ['⛰ 비탈', '비탈의 흙'] };

  function timeObj() {
    if (S.scene === 'mountain') return S.mt;
    if (S.scene === 'root') return S.root;
    if (S.scene === 'profile') return S.pf;
    return null;
  }
  function syncTime(v) { rangeTime.set(Math.round(v * 1000)); }
  function onTimeInput(v) {
    const o = timeObj(); if (!o) return;
    o.tp = v; o.user = true; S.hintPlay = false;
    if (o.playing) setPlaying(false);
    if (S.scene === 'profile') S.pf.touched = true;
    updateTimeText();
  }
  function setPlaying(flag) {
    const o = timeObj(); if (!o) return;
    if (flag && o.tp >= 0.999) { o.tp = 0; if (S.scene !== 'root') o.p = Math.min(o.p, 0.001); }
    o.playing = !!flag; if (flag) { S.hintPlay = false; o.user = true; }
    playBtn.innerHTML = o.playing ? '⏸ 정지' : '▶ 재생';
    playBtn.setAttribute('aria-pressed', o.playing ? 'true' : 'false');
  }
  playBtn.addEventListener('click', () => { Sound.click(); const o = timeObj(); if (o) setPlaying(!o.playing); });

  function updateTimeText() {
    const o = timeObj(); if (!o) { oTime.textContent = ''; return; }
    if (S.scene === 'mountain') oTime.textContent = fmtYears(o.tp * 10000);
    else if (S.scene === 'root') oTime.textContent = Math.round(o.tp * 30) + '년 자랐어요';
    else oTime.textContent = o.tp < 0.01 ? '처음' : fmtYears(o.tp * 30000);
  }

  function setScene(name, instant) {
    if (S.scene === name) { syncControls(); return; }
    const old = timeObj(); if (old) old.playing = false;
    S.scene = name; S.fade = (instant || RM) ? 0 : 1;
    const o = timeObj(); if (o) syncTime(o.tp);
    syncControls();
  }
  function sceneList() {
    if (isFree()) return ['mountain', 'ice', 'root', 'profile', 'slope'];
    if (game && game.phase !== 'complete' && game.level === 1) return ['ice', 'root'];
    return [];
  }
  function syncControls() {
    const list = sceneList();
    const sig = list.join();
    if (sceneSeg.dataset.sig !== sig) {
      sceneSeg.dataset.sig = sig; sceneSeg.innerHTML = '';
      sceneSeg.classList.toggle('dense', list.length > 3);
      list.forEach((k) => {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.textContent = SCENE_NAMES[k][0];
        b.addEventListener('click', () => { Sound.click(); setScene(k); });
        sceneSeg.appendChild(b);
      });
    }
    Array.from(sceneSeg.children).forEach((b) => b.classList.toggle('on', b.dataset.k === S.scene));
    $('#sceneLabel').textContent = list.length > 3 ? '🧭 화면 고르기' : '🧪 실험 고르기';
    $('#cScene').classList.toggle('is-off', list.length === 0);
    const timeScene = S.scene === 'mountain' || S.scene === 'root' || S.scene === 'profile';
    $('#cTime').classList.toggle('is-off', !timeScene);
    $('#cIce').classList.toggle('is-off', S.scene !== 'ice');
    $('#cSlope').classList.toggle('is-off', S.scene !== 'slope');
    if (timeScene) {
      $('#timeLabel').textContent = S.scene === 'root' ? '🌱 식물이 자란 시간' : S.scene === 'profile' ? '⏳ 흙이 쌓이는 세월' : '⏳ 세월';
      $('#timeNote').textContent = S.scene === 'root' ? '뿌리가 굵어질수록 틈이 벌어져요.' : S.scene === 'profile' ? '층이 생기는 순서를 지켜봐요.' : '막대를 오른쪽으로 밀면 시간이 흘러요.';
      const o = timeObj(); syncTime(o.tp); setPlaying(o.playing); updateTimeText();
    }
    sTime.disabled = S.scene === 'profile' && !!S.pf.lock;
    if (S.scene === 'ice') syncIceButtons();
    if (S.scene === 'slope') syncSlopeButtons();
    const any = ['#cScene', '#cTime', '#cIce', '#cSlope'].some((q) => { const n = $(q); return !n.classList.contains('is-off') && !n.hidden; });
    $('#ctrlCard').hidden = !any;
  }

  /* ---------- 포인터 ---------- */
  const inRect = (p, R) => p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h;
  function attachPointer(V) {
    const { v, L } = V;
    const wp = (p) => ({ x: p.x - L.ox, y: p.y - L.oy });          // 캔버스 → 세계 좌표
    SciSim.pointer(v, {
      hover(p) {
        const w = wp(p);
        if (S.scene === 'mountain') return nearMarker(w) ? 'pointer' : null;
        if (S.scene === 'profile') return profileHover(V, p, w);
        return null;
      },
      down(p) {
        const w = wp(p);
        if (S.scene === 'mountain') { const m = nearMarker(w); if (m) { findClue(m, V); } return false; }
        if (S.scene === 'profile') return profileDown(V, p, w);
        return false;
      },
      move(p) { if (S.scene === 'profile') profileMove(V, p, wp(p)); },
      up(p) { if (S.scene === 'profile') profileUp(V, p, wp(p)); },
    });
  }
  function nearMarker(w) {
    if (S.mt.p <= 0.12) return null;
    return MARKERS.find((m) => Math.hypot(w.x - m.x, w.y - m.y) < 30) || null;
  }
  function findClue(m, V) {
    const M = S.mt;
    if (!M.clues[m.key]) { M.clues[m.key] = true; Sound.success(); V.P.burst(m.x, m.y, { count: 14, colors: ['#5eead4', '#fde68a', '#ffffff'], speed: 120, gravity: 60, size: 3 }); }
    else Sound.click();
    M.callout = { key: m.key, t0: nowS() };
    S.hintPlay = false;
  }

  /* ---------- 그리기 ---------- */
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#cfe8fb' });
    const V = { v, L, P: new SciSim.Particles() };
    attachPointer(V);
    return V;
  });
  const activeView = () => views.find((V) => V.v.canvas.offsetWidth > 0) || views[0];

  function draw(V, t) {
    const { v, L } = V, ctx = v.ctx;
    v.apply();
    ctx.fillStyle = '#e9f3fc'; ctx.fillRect(0, 0, L.vw, L.vh);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, L.sceneW, L.sceneH); ctx.clip();
    ctx.translate(L.ox, L.oy);
    if (S.scene === 'mountain') drawMountain(ctx, V, t);
    else if (S.scene === 'ice') drawIceScene(ctx, V, t);
    else if (S.scene === 'root') drawRootScene(ctx, V, t);
    else if (S.scene === 'profile') drawProfile(ctx, V, t);
    else if (S.scene === 'slope') drawSlope(ctx, V, t);
    ctx.restore();
    if (L.tall) { // 휴대폰: 아래 설명판
      const g = ctx.createLinearGradient(0, L.hud.y, 0, L.vh);
      g.addColorStop(0, '#f6faff'); g.addColorStop(1, '#e8f1fb');
      ctx.fillStyle = g; ctx.fillRect(0, L.hud.y, L.vw, L.hud.h);
      ctx.fillStyle = 'rgba(40,70,120,.14)'; ctx.fillRect(0, L.hud.y - 1, L.vw, 2);
    }
    ctx.save(); ctx.textBaseline = 'alphabetic';
    if (S.scene === 'mountain') hudMountain(ctx, V, t);
    else if (S.scene === 'ice') hudIce(ctx, V, t);
    else if (S.scene === 'root') hudRoot(ctx, V, t);
    else if (S.scene === 'profile') hudProfile(ctx, V, t);
    else if (S.scene === 'slope') hudSlope(ctx, V, t);
    ctx.restore();
    if (S.fade > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + (S.fade * 0.85) + ')'; ctx.fillRect(0, 0, L.vw, L.vh); }
  }

  function update(dt, t) {
    S.fade = approach(S.fade, 0, dt, 5.5);
    const V = activeView();
    if (S.scene === 'mountain') updateMountain(dt, t, V);
    else if (S.scene === 'ice') updateIce(dt, t, V);
    else if (S.scene === 'root') updateRoot(dt, t, V);
    else if (S.scene === 'profile') updateProfile(dt, t, V);
    else if (S.scene === 'slope') updateSlope(dt, t, V);
    V.P.update(dt);
  }
  let frameMs = 0;
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    frameMs += (performance.now() - t0 - frameMs) * 0.05;
  });

  /* =========================================================
     미션 게임 (4단계 · 미션 11개)
     ========================================================= */
  const NEW_MT = () => ({ p: 0, pV: 0, tp: 0, maxP: 0, playing: false, day: 0.1, clues: {}, callout: null, user: false, rain: 0, rainAmt: 0 });
  function resetMountain() { S.mt = NEW_MT(); S.hintPlay = true; setScene('mountain', true); syncControls(); }
  function resetLab(which) { S.root = NEW_ROOT(); resetIce(); S.hintPlay = true; setScene(which || 'ice', true); syncControls(); }
  function resetProfile(lock) { S.pf = NEW_PF(); S.pf.lock = !!lock; S.hintPlay = true; setScene('profile', true); syncControls(); }
  function resetSlope() { S.sl = NEW_SLOPE(); S.hintPlay = true; setScene('slope', true); syncSlopeButtons(); syncControls(); }
  const cluesFound = () => MARKERS.filter((m) => S.mt.clues[m.key]).length;

  /* 그림 (퀴즈·공책용 인라인 SVG) */
  const FIG = {
    profile: '<svg viewBox="0 0 300 196" width="300" role="img" aria-label="토양 단면: 위에서부터 표토, 심토, 암석 부스러기 층, 기반암">' +
      '<rect x="8" y="8" width="284" height="44" rx="6" fill="#4a3220"/><rect x="8" y="52" width="284" height="48" fill="#b3743f"/>' +
      '<rect x="8" y="100" width="284" height="48" fill="#b4a38a"/><rect x="8" y="148" width="284" height="40" rx="0" fill="#7e8189"/>' +
      '<g fill="#8e8f95" stroke="#4a4a50" stroke-width="1"><polygon points="30,116 42,110 48,122 36,128"/><polygon points="90,128 104,122 108,136 94,140"/><polygon points="170,112 184,108 190,122 176,126"/><polygon points="236,124 250,118 256,132 242,136"/><polygon points="130,108 138,104 142,114 132,116"/></g>' +
      '<g font-family="sans-serif" font-weight="800" font-size="16" text-anchor="middle"><text x="150" y="36" fill="#fff">표토</text><text x="150" y="82" fill="#fff">심토</text><text x="150" y="130" fill="#1b2333">암석 부스러기 층</text><text x="150" y="173" fill="#fff">기반암</text></g>' +
      '<rect x="8" y="8" width="284" height="180" rx="6" fill="none" stroke="#1b2333" stroke-opacity=".5" stroke-width="2"/></svg>',
    ice: '<svg viewBox="0 0 300 150" width="300" role="img" aria-label="물이 얼면 부피가 약 9퍼센트 늘어나요">' +
      '<defs><linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset="1" stop-color="#2f7fe0"/></linearGradient><linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4fcff"/><stop offset="1" stop-color="#9bd6f2"/></linearGradient></defs>' +
      '<rect x="40" y="40" width="64" height="80" rx="8" fill="url(#gw)" stroke="#5a7aa0" stroke-width="2"/><rect x="190" y="30" width="64" height="90" rx="8" fill="url(#gi)" stroke="#5a7aa0" stroke-width="2"/>' +
      '<line x1="30" y1="40" x2="270" y2="40" stroke="#e2464b" stroke-width="2" stroke-dasharray="5 4"/>' +
      '<path d="M112 80 H180" stroke="#1b2333" stroke-width="3"/><polygon points="180,72 194,80 180,88" fill="#1b2333"/><text x="146" y="70" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="middle" fill="#2563eb">얼면</text>' +
      '<g font-family="sans-serif" font-weight="800" text-anchor="middle"><text x="72" y="144" font-size="15" fill="#1b2333">물 100</text><text x="222" y="144" font-size="15" fill="#1b2333">얼음 109</text><text x="222" y="22" font-size="15" fill="#d33a3f">+ 약 9 %</text></g></svg>',
  };

  const Q = (o) => Object.assign({ type: 'quiz' }, o);
  const M_TAG = {
    title: '🏷️ 층 이름표 붙이기',
    manual: true,
    goal: '완성된 단면에서 <b>이름표 4개</b>를 끌어다 알맞은 층에 붙여요. 다 붙이면 [✔ 확인하기]를 눌러요.',
    hint: '맨 위에는 식물이 자라는 층, 맨 아래에는 단단한 바위층이 있어요. 심토는 표토 바로 아래예요.',
    setup() { resetProfile(true); const F = S.pf; F.tp = 1; F.touched = true; syncControls(); },
    check() {
      const v = tagVerdict(), F = S.pf;
      F.checked = true;
      if (v.placed < 4) return '이름표 ' + (4 - v.placed) + '개를 더 붙여 주세요. (지금 ' + v.placed + '개)';
      if (v.wrong.length) {
        const w = v.wrong[0], tips = { top: '표토는 식물이 자라고 썩은 유기물이 쌓이는 맨 위층이에요.', sub: '심토는 표토 바로 아래, 표토에서 녹은 물질이 쌓인 층이에요.', deb: '암석 부스러기 층은 기반암이 풍화되어 부서진 부스러기가 쌓인 층이에요.', rock: '기반암은 가장 아래에 있는 단단한 바위층이에요.' };
        v.wrong.forEach((t) => { if (!t.flag) { t.flag = true; t.wrong = 1; } });
        return '<b>' + w.label + '</b> 이름표의 자리가 달라요. ' + tips[w.key];
      }
      return true;
    },
    status: () => { const v = tagVerdict(); return chk(v.placed >= 4, '붙인 이름표 ' + v.placed + ' / 4'); },
    explain: '위에서부터 <b>표토 → 심토 → 암석 부스러기 층 → 기반암</b> 순서예요. 생긴 순서는 반대로, 기반암 → 부스러기 층 → 표토 → 심토예요.',
  };
  TAG_MISSION = M_TAG;

  const LEVELS = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '바위가 부서져요', short: '풍화', icon: '⛰️', phase: '관찰',
      features: ['timelapse'],
      intro: '<p class="si-q">❓ 탐구 질문: 단단한 바위가 어떻게 부드러운 흙이 될까?</p>' +
        '<p>산 위의 커다란 바위를 <b>아주 오랜 세월</b> 동안 지켜봐요. <b>세월 막대</b>를 오른쪽으로 밀면 시간이 빠르게 흘러가요.</p>',
      setup() { resetMountain(); },
      recap: '풍화는 암석이 오랜 세월에 걸쳐 잘게 부서지거나 성분이 변하는 현상이에요.',
      summary: '<ul><li>단단한 바위도 <b>오랜 세월</b> 동안 금이 가고 조각나서 점점 작은 알갱이로 부서져요.</li>' +
        '<li>암석이 부서지거나 성분이 변하는 이런 현상을 <b>풍화</b>라고 해요.</li>' +
        '<li>풍화의 예: 틈에 스며든 <b>물이 얼고 녹기</b>, 식물 <b>뿌리</b>의 성장, <b>빗물과 공기</b>에 의한 변화 (석회암 지역에서는 지하수가 석회암을 녹여 석회 동굴이 생기기도 해요).</li></ul>',
      missions: [
        {
          title: '⏳ 세월을 흘려 보내요',
          goal: '세월 막대를 끝까지 밀어 바위의 변화를 지켜보고, 반짝이는 <b>?</b> 단서 3개를 눌러 보세요.',
          hint: '막대를 오른쪽 끝(약 1만 년 뒤)까지 밀면 ? 표시가 나타나요. 하나씩 눌러서 읽어 보세요.',
          setup() { resetMountain(); },
          check: () => S.mt.maxP >= 0.97 && cluesFound() >= 3,
          hold: 0.8,
          status: () => chk(S.mt.maxP >= 0.97, '끝까지 지켜보기 ' + Math.round(Math.min(1, S.mt.maxP) * 100) + ' %') + ' · ' + chk(cluesFound() >= 3, '단서 ' + cluesFound() + ' / 3'),
          explain: '바위는 처음엔 <b>금이 가고</b>, 갈라진 조각이 굴러 떨어져 점점 <b>작은 알갱이</b>로 부서졌어요. 틈에 스며든 물, 식물 뿌리, 빗물과 공기가 바위를 서서히 부수는 단서였어요.',
        },
        Q({
          title: '📖 풍화란 무엇일까요?',
          goal: '지금까지 본 바위의 변화를 가장 잘 설명한 것은 무엇일까요?',
          choices: ['부서진 암석 조각이 물이나 바람에 실려 다른 곳으로 옮겨지는 현상', '땅속 마그마가 식어서 새로운 암석이 만들어지는 현상', '암석이 오랜 세월에 걸쳐 잘게 부서지거나 성분이 변하는 현상', '땅이 갈라지면서 산이 높이 솟아오르는 현상'],
          answer: 2,
          feedback: [
            '그건 침식·운반이에요. 풍화는 암석이 그 자리에서 부서지거나 변하는 현상이고, 조각이 옮겨지는 것은 아니에요.',
            '그건 마그마가 식어 굳는 화성암의 생성이에요. 풍화는 이미 있던 암석이 부서지는 현상이에요.',
            '',
            '산이 솟아오르는 것은 땅속에서 작용하는 큰 힘 때문이에요. 풍화는 지표에서 암석이 부서지고 변하는 일이에요.',
          ],
          explain: '<b>풍화</b>는 암석이 오랜 세월에 걸쳐 잘게 부서지거나 성분이 변하는 현상이에요. 풍화로 생긴 부스러기가 쌓여 흙의 재료가 돼요.',
        }),
      ],
    },
    /* ---------- 2단계 · 실험 ---------- */
    {
      title: '얼음과 뿌리의 힘', short: '얼음과 뿌리', icon: '❄️', phase: '실험',
      features: ['lab'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 바위가 오랜 세월에 걸쳐 부서지는 것을 봤어요. 틈 속의 물과 식물 뿌리가 단서였죠.</div>' +
        '<p>이 둘이 정말 바위를 쪼갤 수 있을까요? <b>실험</b>해 봐요. 바위 틈에 물을 붓고 <b>얼렸다 녹였다</b> 되풀이해 보고, 식물 <b>뿌리</b>가 자라는 모습도 지켜봐요.</p>',
      setup() { resetLab('ice'); },
      recap: '물이 얼면 부피가 약 9 % 늘어나 틈을 벌리고, 식물 뿌리도 자라면서 틈을 넓혀 바위를 쪼개요.',
      summary: '<div class="note-fig">' + FIG.ice + '</div><ul><li>물은 얼면 부피가 약 <b>9 %</b> 늘어나요. 틈 속 물이 <b>얼고 녹기를 되풀이</b>하면 틈이 점점 벌어져 바위가 쪼개져요.</li>' +
        '<li>식물의 <b>뿌리</b>가 틈으로 파고들어 굵어지면 틈이 넓어져 바위가 갈라져요.</li>' +
        '<li>두 경우 모두 암석이 부서지는 <b>풍화</b>예요.</li></ul>',
      missions: [
        {
          title: '❄ 얼음으로 바위 쪼개기',
          goal: '바위 틈에 물을 붓고, <b>얼리기</b>와 <b>녹이기</b>를 되풀이해서 바위를 쪼개 보세요.',
          hint: '💧 물 붓기 → ❄ 얼리기 → ☀ 녹이기를 번갈아 눌러요. 얼 때마다 틈이 조금씩 벌어져요.',
          setup() { resetLab('ice'); },
          check: () => !!S.ice && S.ice.split,
          hold: 0.6,
          status: () => { const I = S.ice; if (!I) return ''; return chk(I.pours > 0 || I.water > 0.5, '물 붓기') + ' · 얼림·녹임 <b>' + Math.min(4, I.cycles) + ' / 4</b>회 · ' + chk(I.split, '바위 쪼개기'); },
          explain: '물이 얼면 <b>부피가 약 9 % 늘어나</b> 틈의 벽을 밀어요. 얼음이 녹으면 물이 더 깊이 스며들고, 다시 얼면서 더 벌려요. 이 과정이 <b>되풀이</b>되면 바위가 쪼개져요.',
        },
        {
          title: '🌱 뿌리로 바위 쪼개기',
          goal: '식물이 자라는 시간을 늘려 <b>뿌리</b>가 바위를 쪼개는 모습을 지켜봐요.',
          hint: '‘식물이 자란 시간’ 막대를 오른쪽으로 밀거나 ▶ 재생을 눌러요.',
          setup() { resetLab('root'); },
          check: () => !!S.root && S.root.split,
          hold: 0.6,
          status: () => { const R = S.root; return chk(R.maxP >= 0.5, '뿌리가 자라는 모습 보기') + ' · 자란 시간 <b>' + Math.round(R.p * ROOT_YEARS) + ' / ' + ROOT_YEARS + '년</b> · ' + chk(R.split, '바위 쪼개기'); },
          explain: '뿌리는 바위 틈으로 파고들며 <b>점점 굵어져서</b> 틈을 넓혀요. 오랜 시간이 지나면 바위가 갈라져요. 식물도 풍화를 일으키는 원인이에요.',
        },
        Q({
          title: '🧊 물이 얼면 왜 틈이 벌어질까요?',
          goal: '실험에서 본 것을 떠올려 보세요. 틈이 벌어지는 까닭은 무엇일까요?',
          setup() { if (S.scene !== 'ice' && S.scene !== 'root') setScene('ice'); },
          choices: ['얼음이 물보다 훨씬 무거워서 틈을 누르기 때문', '물이 얼면 부피가 늘어나 틈 안쪽 벽을 밀기 때문', '추워서 바위가 줄어들어 저절로 갈라지기 때문', '얼음이 바위를 녹여서 틈을 만들기 때문'],
          answer: 1,
          feedback: [
            '얼음은 물에 뜨는 것에서 알 수 있듯이 물보다 가벼워요. 틈을 벌리는 힘은 부피가 늘어나기 때문에 생겨요.',
            '',
            '바위가 줄어드는 게 아니에요. 틈 속 물이 얼면서 부피가 커져 벽을 밀어요.',
            '얼음은 바위를 녹이지 못해요. 틈을 벌리는 것은 부피가 늘어나는 힘이에요.',
          ],
          explain: '물이 얼면 부피가 약 <b>9 %</b> 늘어나요. 그 힘이 틈 벽을 밀어 틈이 벌어져요.',
        }),
      ],
    },
    /* ---------- 3단계 · 모형 ---------- */
    {
      title: '토양이 만들어지는 순서', short: '토양 생성', icon: '🪨', phase: '모형',
      features: ['profile'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물과 뿌리가 바위를 부순다는 것을 알았어요.</div>' +
        '<p>부서진 바위 부스러기는 어떻게 <b>흙(토양)</b>이 될까요? 땅을 반으로 자른 <b>단면 모형</b>에서 세월 막대를 움직여 토양층이 쌓이는 순서를 확인해요.</p>',
      setup() { resetProfile(false); },
      recap: '기반암이 풍화되어 부스러기 층이 되고, 그 위에 표토가, 그 아래에 심토가 차례로 생겨 토양이 만들어져요.',
      summary: '<div class="note-fig">' + FIG.profile + '</div><ul><li>토양이 생기는 순서: 기반암 → <b>암석 부스러기 층</b> → <b>표토</b> → <b>심토</b></li>' +
        '<li>기반암이 풍화되어 부스러기가 쌓이고, 그 위에 식물이 자라 썩은 유기물이 쌓여 <b>표토</b>가 생겨요. 표토에서 녹은 물질이 아래로 내려가 쌓여 <b>심토</b>가 생겨요.</li>' +
        '<li>이렇게 <b>토양의 생성</b>은 오랜 세월에 걸친 <b>풍화 작용</b>의 예예요.</li></ul>',
      missions: [
        {
          title: '⏳ 토양이 쌓이는 순서 보기',
          goal: '세월 막대를 끝까지 밀어 토양층이 <b>어떤 순서로</b> 생기는지 지켜봐요.',
          hint: '막대를 천천히 오른쪽으로 밀어요. ▶ 재생을 눌러도 돼요. 층 이름이 하나씩 나타나요.',
          setup() { resetProfile(false); },
          check: () => S.pf.maxP >= 0.98,
          hold: 0.8,
          status: () => { const h = S.pf.hit; return chk(h.deb, '부스러기 층') + ' → ' + chk(h.top, '표토') + ' → ' + chk(h.sub, '심토'); },
          explain: '먼저 기반암이 풍화되어 <b>부스러기 층</b>이 생기고, 그 위에 식물이 자라 <b>표토</b>가 생겨요. 마지막으로 표토에서 녹은 물질이 아래로 내려가 쌓여 <b>심토</b>가 생겨요.',
        },
        M_TAG,
        Q({
          title: '🕒 가장 나중에 생긴 층은?',
          goal: '토양이 생기는 순서를 떠올려 보세요. 가장 <b>나중에</b> 생긴 층은 어느 것일까요?',
          figure: FIG.profile,
          setup() { if (S.scene !== 'profile') resetProfile(false); const F = S.pf; F.lock = false; F.tp = 1; syncControls(); },
          choices: ['기반암', '암석 부스러기 층', '표토', '심토'],
          answer: 3,
          feedback: [
            '기반암은 처음부터 땅속에 있던 단단한 바위예요. 풍화되는 쪽이지, 나중에 생기는 층이 아니에요.',
            '암석 부스러기 층은 기반암이 풍화되어 가장 먼저 생기는 층이에요.',
            '표토는 부스러기 위에 식물이 자라면서 생겨요. 하지만 그 뒤에 표토에서 녹은 물질이 쌓여 생기는 층이 하나 더 있어요.',
            '',
          ],
          explain: '순서는 기반암 → 암석 부스러기 층 → 표토 → <b>심토</b>예요. 심토는 표토에서 빗물에 녹은 물질이 아래로 내려가 쌓여 가장 나중에 생겨요.',
        }),
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '토양을 지켜요', short: '토양 보전', icon: '🌳', phase: '적용',
      features: ['slope'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 토양이 풍화로 아주 오랜 세월에 걸쳐 만들어진다는 것을 알았어요.</div>' +
        '<p>그런데 비가 많이 오면 이 소중한 흙이 쓸려 내려갈 수 있어요. <b>숲이 있는 비탈</b>과 <b>숲이 없는 비탈</b>에 같은 비를 내려 비교하고, 흙을 지키는 방법을 찾아봐요.</p>',
      setup() { resetSlope(); },
      recap: '표토는 만들어지는 데 오랜 세월이 걸리지만, 숲이 없으면 비에 쉽게 쓸려 가요. 나무 심기와 계단식 밭으로 흙을 지켜요.',
      summary: '<ul><li>표토가 만들어지는 데는 <b>아주 오랜 세월</b>(1 cm에 수백 년 이상)이 걸려요.</li>' +
        '<li>산림이 훼손되면 나무뿌리가 흙을 붙잡지 못해 비에 흙이 쉽게 <b>유실</b>돼요.</li>' +
        '<li>토양을 지키는 방법: <b>나무 심기</b>, <b>계단식 밭</b> 등.</li></ul>',
      missions: [
        {
          title: '☔ 같은 비, 다른 비탈',
          goal: '두 비탈에 같은 비를 내려 <b>숲이 있는 비탈</b>과 <b>숲이 없는 비탈</b>을 비교해 보세요.',
          hint: '오른쪽 위의 ☔ 비 내리기 버튼을 누르고 4초 이상 지켜봐요. 씻겨 간 표토 막대를 비교해 봐요.',
          setup() { resetSlope(); },
          check: () => !!S.sl && S.sl.rainBare >= 4,
          hold: 0.6,
          status: () => { const Sl = S.sl; return chk(Sl.rainBare >= 4, '비 내리기 ' + Math.min(4, Sl.rainBare).toFixed(1) + ' / 4초') + (Sl.rainBare >= 1 ? '<br>씻겨 간 표토: 숲 <b>' + Math.round(Sl.Lp.lossD * 100) + ' %</b> · 숲 없음 <b>' + Math.round(Sl.Rp.lossD * 100) + ' %</b>' : ''); },
          explain: '숲이 있는 비탈은 <b>나무뿌리가 흙을 붙잡고</b> 잎이 빗방울을 막아 줘서 흙이 거의 씻겨 가지 않아요. 숲이 없는 비탈은 빗물이 흙을 그대로 쓸고 내려가 <b>흙이 유실</b>돼요.',
        },
        {
          title: '🌳 흙을 지키는 방법',
          goal: '숲이 없는 비탈을 <b>나무 심기</b>나 <b>계단식 밭</b>으로 바꾸고, 비를 내려 흙이 덜 씻겨 가는지 확인해요.',
          hint: '‘그대로’ 대신 🌳 나무 심기 또는 🌾 계단식 밭을 고르고, ☔ 비 내리기를 눌러 4초 이상 지켜봐요.',
          setup() { const Sl = S.sl || NEW_SLOPE(); S.sl = Sl; setScene('slope', true); if (Sl.method !== 'none') setMethod('none'); Sl.Rp.loss = 0; Sl.Rp.lossD = 0; Sl.Rp.parts.length = 0; Sl.Rp.turb = 0; Sl.rainMethod = 0; Sl.rain = false; syncSlopeButtons(); },
          check: () => !!S.sl && S.sl.method !== 'none' && S.sl.rainMethod >= 4,
          hold: 0.6,
          status: () => { const Sl = S.sl; return chk(Sl.method !== 'none', '방법 고르기') + ' · ' + chk(Sl.rainMethod >= 4, '비 내리기 ' + Math.min(4, Sl.rainMethod).toFixed(1) + ' / 4초') + (Sl.method !== 'none' && Sl.rainMethod >= 1 ? '<br>씻겨 간 표토: <b>' + Math.round(Sl.Rp.lossD * 100) + ' %</b> (그대로일 때보다 적어요)' : ''); },
          explain: '<b>나무를 심으면</b> 뿌리가 흙을 붙잡고, <b>계단식 밭</b>은 물이 천천히 흘러서 흙이 덜 씻겨 가요. 이렇게 흙을 지키는 일을 <b>토양 보전</b>이라고 해요.',
        },
        Q({
          title: '⏳ 표토를 잃으면 왜 큰 문제일까요?',
          goal: '표토가 만들어지는 데 걸리는 시간과 연결해서 생각해 보세요.',
          setup() { if (S.scene !== 'slope') resetSlope(); },
          choices: ['표토는 며칠이면 다시 생기기 때문에 큰 문제가 아니다', '표토에는 식물이 쓸 양분이 거의 없기 때문이다', '표토는 만들어지는 데 수백 년 이상 걸려서 한번 잃으면 되찾기 어렵기 때문이다', '표토가 없어지면 바위가 더 이상 풍화되지 않기 때문이다'],
          answer: 2,
          feedback: [
            '표토는 풍화와 생물의 작용으로 아주 오랜 세월에 걸쳐 만들어져요. 며칠 만에 다시 생기지 않아요.',
            '반대예요. 표토에는 썩은 유기물이 많아서 식물이 자라기에 좋은 양분이 풍부해요.',
            '',
            '바위는 표토가 없어도 풍화돼요. 문제는 식물이 자랄 흙이 사라진다는 거예요.',
          ],
          explain: '표토는 1 cm가 만들어지는 데도 <b>수백 년 이상</b> 걸리는 소중한 흙이에요. 한 번 씻겨 가면 되찾기 어려우니 나무 심기, 계단식 밭 등으로 지켜야 해요.',
        }),
      ],
    },
  ];

  S.pf = NEW_PF(); S.root = NEW_ROOT(); S.sl = NEW_SLOPE();
  game = SciSim.game({
    simId: 'm2-weathering',
    mount: '#game',
    badge: '풍화 박사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      timelapse: '⏳ 세월 막대',
      lab: '🧪 풍화 실험대',
      profile: '🪨 토양 단면 모형',
      slope: '⛰️ 비탈 실험',
    },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart() { S.hintPlay = true; },
    onComplete() { S.hintPlay = false; syncControls(); },
    levels: LEVELS,
  });
  syncControls();

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, game: () => game, view: activeView, frameMs: () => frameMs, setScene, MT: mtGeo,
    pourWater, toggleFreeze, resetIce, syncControls, setRain, setMethod, tagHome, slotXY, PF, LAYERS, LEVELS, tagVerdict,
    client(L, x, y) { const V = views.find((q) => q.L === L) || activeView(); const r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    markerClient(key) { const V = activeView(), m = MARKERS.find((q) => q.key === key); return this.client(V.L, m.x + V.L.ox, m.y + V.L.oy); },
    tagClient(i) { const V = activeView(), t = S.pf.tags[i]; return this.client(V.L, t.x, t.y); },
    slotClient(i) { const V = activeView(), s = slotXY(V.L, i); return this.client(V.L, s.x, s.y); },
    tagByKey(key) { return S.pf.tags.findIndex((q) => q.key === key); },
  };
})();
