/* =========================================================
   중2 Ⅲ. 빛과 파동 — 빛의 합성과 물체의 색  [9과10-03]
   ① [관찰] 물체의 색   흰빛이 물체에 닿아 일부만 반사(색 광선) · 반사하는 빛 고르기(바나나) · 흰색/검은색
   ② [실험] 빛의 합성   빨강·초록·파랑 조명을 스크린에 겹치기 ('lighter' 가산 혼합): 노랑·청록·자홍·흰색
   ③ [탐구] 조명과 색   색 조명 아래의 흰 셔츠·초록 잎·노란 바나나 (예측 → 확인), 무대 조명
   ④ [적용] 화면의 색   화면 확대 → 화소 → 빨강·초록·파랑 부분 화소, 밝기를 조절해 목표색 만들기
   범위: 물체의 색 = 반사하는 빛 / 빛의 삼원색(빨강·초록·파랑)의 합성. 물감(색의 삼원색)·파장 계산은 다루지 않음.
   모형: 흰빛 = 빨강+초록+파랑 빛. 물체는 세 빛 가운데 일부를 반사(1)하고 나머지는 흡수(0)한다고 단순하게 나타냄.
   화면: 태블릿용 가로 캔버스(800×580)와 휴대폰용 세로 캔버스(520×900)를 같은 장면 코드로 그림
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, fmt, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const REDUCE = !!SciSim.reduceMotion;               // 움직임 줄이기 설정
  const approach = SciSim.approach;
  const EASE = SciSim.ease;
  const rgba = SciSim.color.rgba;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const font = (px, w) => (w || 700) + ' ' + (Math.round(px * 2) / 2) + 'px ' + FONT;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rgbS = (c, a) => (a == null
    ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
    : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')');
  const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; };

  /* ---------- 색 ---------- */
  const PURE = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];              // 빛의 삼원색 (가산 혼합이 정확히 맞는 값)
  const VIVID = [[255, 70, 76], [66, 255, 122], [98, 152, 255]];     // 어두운 배경에서 잘 보이는 광선 색
  const CH_NAME = ['빨강', '초록', '파랑'];
  const CH_DOT = ['🔴', '🟢', '🔵'];
  const GELS = { white: [1, 1, 1], red: [1, 0, 0], green: [0, 1, 0], blue: [0, 0, 1] };
  const GEL_NAME = { white: '흰색', red: '빨강', green: '초록', blue: '파랑' };
  const AMB = 0.075;                                                  // 어두운 방의 희미한 주변 빛

  // 물체가 보이는 색: 반사율(0~1)×닿는 빛(0~1) → [r,g,b] 0~255
  function surf(refl, light) {
    const o = [0, 0, 0];
    for (let i = 0; i < 3; i++) o[i] = 18 + 237 * clamp(refl[i], 0, 1) * clamp(light[i] + AMB, 0, 1);
    return o;
  }
  // 색 이름 (c: [r,g,b] 0~1)
  function colorName(c) {
    const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]), d = mx - mn;
    if (mx < 0.16) return '검정';
    const s = d / mx;
    if (s < 0.2) return mx > 0.82 ? '흰색' : mx > 0.5 ? '회색' : '어두운 회색';
    let h;
    if (mx === c[0]) h = 60 * (((c[1] - c[2]) / d + 6) % 6);
    else if (mx === c[1]) h = 60 * ((c[2] - c[0]) / d + 2);
    else h = 60 * ((c[0] - c[1]) / d + 4);
    let n = '빨강';
    if (h >= 346 || h < 14) n = '빨강';
    else if (h < 40) n = '주황';
    else if (h < 68) n = '노랑';
    else if (h < 96) n = '연두';
    else if (h < 150) n = '초록';
    else if (h < 186) n = '청록';
    else if (h < 214) n = '하늘색';
    else if (h < 256) n = '파랑';
    else if (h < 292) n = '보라';
    else n = '자홍';
    if (s < 0.55 && mx > 0.8 && (n === '빨강' || n === '자홍')) n = '분홍';
    else if (mx < 0.5) n = '어두운 ' + n;
    return n;
  }
  // '…(으)로' 조사
  function withRo(name) {
    const ch = name.charCodeAt(name.length - 1) - 0xAC00;
    if (ch < 0 || ch > 11171) return name + '(으)로';
    const jong = ch % 28;
    return name + (jong === 0 || jong === 8 ? '로' : '으로');
  }
  const objName = (c) => colorName(c.map((v) => v / 255));

  /* ---------- 화면 배치: wide = 태블릿(800×580), tall = 휴대폰(520×900) ---------- */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 580, fs: 1 },
    tall: { key: 'tall', vw: 520, vh: 900, fs: 1.18 },
  };
  const BG = '#0a1020';
  const VIEWS = ['wide', 'tall'].map((key) => {
    const L = LAYOUTS[key];
    const V = { key, L, cache: {}, fx: new SciSim.Particles(), hint: $(key === 'wide' ? '#hintWide' : '#hintTall') };
    V.v = SciSim.stage($(key === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: BG, onResize: () => { V.cache = {}; } });
    V.ctx = V.v.ctx; V.D = SciSim.draw(V.ctx);
    return V;
  });
  const activeView = () => VIEWS.find((V) => V.v.canvas.offsetWidth > 0) || VIEWS[0];

  // 움직이지 않는 배경은 한 번만 그려 두고 재사용
  function cached(V, key, fn) {
    const sc = V.v.scale * V.v.dpr;
    let c = V.cache[key];
    if (!c || c.sc !== sc) {
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(V.L.vw * sc)); cv.height = Math.max(1, Math.ceil(V.L.vh * sc));
      const g = cv.getContext('2d');
      g.scale(sc, sc);
      fn(g, V.L);
      c = V.cache[key] = { cv, sc };
    }
    V.ctx.drawImage(c.cv, 0, 0, V.L.vw, V.L.vh);
  }
  function roomBg(g, L) {
    const gr = g.createLinearGradient(0, 0, 0, L.vh);
    gr.addColorStop(0, '#0b1226'); gr.addColorStop(1, '#16203f');
    g.fillStyle = gr; g.fillRect(0, 0, L.vw, L.vh);
    const vg = g.createRadialGradient(L.vw / 2, L.vh * 0.45, Math.min(L.vw, L.vh) * 0.25, L.vw / 2, L.vh * 0.45, Math.max(L.vw, L.vh) * 0.75);
    vg.addColorStop(0, 'rgba(60,80,140,.10)'); vg.addColorStop(1, 'rgba(0,0,0,.38)');
    g.fillStyle = vg; g.fillRect(0, 0, L.vw, L.vh);
  }

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'see', fade: { k: 1 }, t: 0,
    // ① 물체의 색
    lampOn: false, lampK: 0, lampU: 0.2, lampV: 0.5, lampDrag: false, lampDown: null, lampLift: 0, succ: { t0: -99, x: 0, y: 0 },
    obj: 'apple', prevObj: null, swap: { k: 1 },
    refl: [0, 1, 0],            // 바나나가 반사하는 빛 (1 반사 / 0 흡수)
    reflV: [1, 0, 0],           // 화면에 그리는 반사율 (부드럽게 따라감)
    prevRefl: [1, 0, 0],
    obs: 0, showBubble: 1,
    // ② 빛의 합성
    mix: [0, 0, 0], mixV: [0, 0, 0],
    found: { Y: false, C: false, M: false, W: false }, tok: { Y: { k: 0 }, C: { k: 0 }, M: { k: 0 }, W: { k: 0 } },
    hold: { key: '', t: 0 },
    // ③ 조명과 색
    gel: 'white', gelV: [1, 1, 1], seen: { red: 0, green: 0, blue: 0 }, ripple: 0,
    // ④ 화면의 색
    pix: [100, 100, 0], pixV: [1, 1, 0], zoomMode: 0, zoom: 0, zoomObs: 0,
    slot: 0, slotDone: [true, true, true], slotHold: 0, slotPop: [{ k: 1 }, { k: 1 }, { k: 1 }], gameOn: false, slotLive: false,
    focus: { x: 22.5, y: 9.5 }, focusT: null, meterV: 0, pickDown: false,
  };
  let game = null;
  let F = new Set();
  const on = (f) => F.has(f) || !!(game && game.free);
  const isNew = (f) => !!(game && game.isNew(f));
  const gameFlat = () => (game && game.current() ? game.current()._flat : -1);
  const missionActive = (flat) => !!game && game.phase === 'active' && gameFlat() === flat;

  /* ---------- 공통 그리기 도구 ---------- */
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function txt(ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = font(o.size || 14, o.weight || 800);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || 4; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || '#fff'; ctx.fillText(str, x, y);
    ctx.restore();
  }
  function newRing(V, R, t) {
    const { ctx, D } = V;
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = rgba('#f26b3a', 0.35 + a * 0.5); ctx.lineWidth = 4;
    D.roundRect(R.x - 5, R.y - 5, R.w + 10, R.h + 10, 18); ctx.stroke();
    D.label(R.x + R.w - 22, R.y - 3, 'NEW', { bg: '#f26b3a', size: 13 });
    ctx.restore();
  }
  // 미리 그려 둔 빛번짐 그림 (매 프레임 그라데이션을 새로 만들지 않아요)
  const GLOWS = new Map();
  function glowTex(col, r) {
    const q = Math.max(4, Math.round(r / 4) * 4);
    const c = [Math.round(col[0] / 16) * 16, Math.round(col[1] / 16) * 16, Math.round(col[2] / 16) * 16].map((v) => Math.min(255, v));
    const key = q + '|' + c.join(',');
    let t = GLOWS.get(key);
    if (!t) {
      if (GLOWS.size > 150) GLOWS.clear();
      const k = q > 90 ? 1 : 2;
      const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(q * 2 * k);
      const g = cv.getContext('2d');
      const gr = g.createRadialGradient(q * k, q * k, 0, q * k, q * k, q * k);
      gr.addColorStop(0, rgbS(c, 1)); gr.addColorStop(1, rgbS(c, 0));
      g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
      t = { cv, q }; GLOWS.set(key, t);
    }
    return t;
  }
  function drawGlow(ctx, x, y, r, col, alpha) {
    if (alpha <= 0.003) return;
    const t = glowTex(col, r);
    ctx.save(); ctx.globalAlpha *= Math.min(1, alpha); ctx.drawImage(t.cv, x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  // 블러 없이 겹쳐 그리는 가벼운 그림자 (프레임마다 그려도 느려지지 않아요)
  function softShadow(V, pathFn, o) {
    const ctx = V.ctx; o = o || {};
    const a = o.a == null ? 0.4 : o.a, dy = o.y == null ? 4 : o.y, sp = o.spread == null ? 9 : o.spread;
    ctx.save(); ctx.lineJoin = 'round'; ctx.translate(0, dy);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(0,0,0,' + (a * 0.3) + ')'; ctx.strokeStyle = 'rgba(0,0,0,' + (a * 0.22) + ')';
      pathFn(); ctx.lineWidth = sp * 2 * (1 - i / 4); ctx.stroke(); ctx.fill();
    }
    ctx.restore();
  }
  // 반짝이는 유리 같은 둥근 판 (어두운 화면 위의 안내 상자)
  function darkPanel(V, x, y, w, h, r, alpha) {
    const { ctx, D } = V;
    softShadow(V, () => D.roundRect(x, y, w, h, r || 14), { a: 0.55, y: 4, spread: 9 });
    ctx.fillStyle = 'rgba(14,22,48,' + (alpha == null ? 0.92 : alpha) + ')'; D.roundRect(x, y, w, h, r || 14); ctx.fill();
    ctx.strokeStyle = 'rgba(140,170,230,.30)'; ctx.lineWidth = 1.4; D.roundRect(x, y, w, h, r || 14); ctx.stroke();
  }

  // 스포트라이트(전등) 머리: (x, y) = 가운데, ang = 빛이 나가는 방향, tint = [r,g,b] 0~255, k = 켜진 정도
  // 반환: 빛이 나오는 입구의 좌표
  function spotLamp(V, x, y, ang, o) {
    o = o || {};
    const { ctx, D } = V;
    const k = o.k == null ? 1 : o.k, tint = o.tint || [255, 255, 255], sc = o.s || 1;
    const bl = 62 * sc, bh = 42 * sc;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const mouth = { x: x + ca * bl * 0.44, y: y + sa * bl * 0.44 };
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    softShadow(V, () => D.roundRect(-bl * 0.6, -bh / 2, bl * 0.74, bh, 8 * sc), { a: 0.6, y: 5 * sc, spread: 8 * sc });
    {
      const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
      g.addColorStop(0, '#aab6c9'); g.addColorStop(0.3, '#eef3fa'); g.addColorStop(0.62, '#b3bfd1'); g.addColorStop(1, '#6a7890');
      ctx.fillStyle = g;
      D.roundRect(-bl * 0.6, -bh / 2, bl * 0.74, bh, 8 * sc); ctx.fill();
      // 앞쪽으로 퍼지는 후드
      ctx.beginPath();
      ctx.moveTo(bl * 0.12, -bh * 0.5); ctx.lineTo(bl * 0.44, -bh * 0.66); ctx.lineTo(bl * 0.44, bh * 0.66); ctx.lineTo(bl * 0.12, bh * 0.5); ctx.closePath();
      const g2 = ctx.createLinearGradient(0, -bh * 0.66, 0, bh * 0.66);
      g2.addColorStop(0, '#8795ab'); g2.addColorStop(0.35, '#d5deeb'); g2.addColorStop(1, '#5b6a82');
      ctx.fillStyle = g2; ctx.fill();
    }
    // 방열 홈
    ctx.strokeStyle = 'rgba(40,52,76,.45)'; ctx.lineWidth = 1.6 * sc;
    for (let i = 0; i < 3; i++) { const px = -bl * 0.5 + i * 7 * sc; ctx.beginPath(); ctx.moveTo(px, -bh * 0.36); ctx.lineTo(px, bh * 0.36); ctx.stroke(); }
    // 받침 나사
    D.sphere(-bl * 0.06, 0, 6 * sc, '#8c99ae', { gloss: true });
    // 렌즈(빛이 나오는 면)
    const lx = bl * 0.44;
    const lg = ctx.createRadialGradient(lx, 0, 0, lx, 0, bh * 0.62);
    lg.addColorStop(0, rgbS([255, 255, 255], 0.35 + 0.65 * k));
    lg.addColorStop(0.5, rgbS(tint, 0.25 + 0.75 * k));
    lg.addColorStop(1, rgbS(mulC(tint, 0.35), 0.55 + 0.4 * k));
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.ellipse(lx, 0, bh * 0.15, bh * 0.62, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,40,60,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    if (k > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, mouth.x, mouth.y, 60 * sc * (0.6 + 0.4 * k), tint, 0.42 * k);
      drawGlow(ctx, mouth.x, mouth.y, 24 * sc, [255, 255, 255], 0.32 * k);
      ctx.restore();
    }
    return mouth;
  }
  function mulC(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  // 빛줄기(원뿔): 입구 (x0,y0) 반폭 w0 → 목표 (x1,y1) 반폭 w1, 'lighter'로 겹쳐 그림
  function beam(V, x0, y0, x1, y1, w0, w1, col, a0, a1) {
    const ctx = V.ctx;
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgbS(col, a0)); g.addColorStop(1, rgbS(col, a1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1);
    ctx.lineTo(x1 - nx * w1, y1 - ny * w1); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.closePath(); ctx.fill();
  }
  // 빛 알갱이(펄스): 꼬리가 있는 반짝이는 점
  function streak(ctx, x, y, ux, uy, col, a, len, r) {
    if (a <= 0.01) return;
    const g = ctx.createLinearGradient(x - ux * len, y - uy * len, x, y);
    g.addColorStop(0, rgbS(col, 0)); g.addColorStop(1, rgbS(col, a));
    ctx.strokeStyle = g; ctx.lineWidth = r * 1.15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - ux * len, y - uy * len); ctx.lineTo(x, y); ctx.stroke();
    const h = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    h.addColorStop(0, rgbS(col, a)); h.addColorStop(0.35, rgbS(col, a * 0.5)); h.addColorStop(1, rgbS(col, 0));
    ctx.fillStyle = h; circle(ctx, x, y, r * 2.5); ctx.fill();
  }
  // 꺾은선(두 구간) 위를 달리는 펄스: segs = [{a:{x,y}, b:{x,y}, col:[r,g,b], k}], 반환: 각 구간의 길이
  function pulseTrain(V, segs, t, o) {
    o = o || {};
    const ctx = V.ctx;
    const gap = o.gap || 64, speed = o.speed || 230, r = o.r || 3.4, tail = o.tail || 22;
    const lens = segs.map((s) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y));
    const total = lens.reduce((p, c) => p + c, 0);
    if (total < 4) return lens;
    const off = (t * speed) % gap;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let s = off; s < total; s += gap) {
      let acc = 0, i = 0;
      while (i < segs.length - 1 && s > acc + lens[i]) { acc += lens[i]; i++; }
      const sg = segs[i], f = clamp((s - acc) / (lens[i] || 1), 0, 1);
      const ux = (sg.b.x - sg.a.x) / (lens[i] || 1), uy = (sg.b.y - sg.a.y) / (lens[i] || 1);
      // 표면 가까이에서 살짝 밝아졌다 사라지게
      let fade = 1;
      if (i === segs.length - 1) fade *= 1 - smooth(0.75, 1, f);
      if (i === 0 && segs.length > 1 && segs[1].k < 0.05) fade *= 1 - smooth(0.9, 1, f);
      const a = sg.k * fade * (o.alpha == null ? 1 : o.alpha);
      streak(ctx, sg.a.x + (sg.b.x - sg.a.x) * f, sg.a.y + (sg.b.y - sg.a.y) * f, ux, uy, sg.col, a, tail, r);
    }
    ctx.restore();
    return lens;
  }
  // 눈 그림
  function eyeIcon(V, x, y, s, look, pupilK) {
    const { ctx } = V;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const w = 44, h = 26;
    const eyePath = () => { ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, -h * 1.7, w, 0); ctx.quadraticCurveTo(0, h * 1.7, -w, 0); ctx.closePath(); };
    softShadow(V, eyePath, { a: 0.6, y: 4, spread: 7 });
    eyePath(); ctx.fillStyle = '#f7f9fd'; ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, -h * 1.7, w, 0); ctx.quadraticCurveTo(0, h * 1.7, -w, 0); ctx.closePath(); ctx.clip();
    const ix = clamp(look.x, -1, 1) * 8, iy = clamp(look.y, -1, 1) * 5;
    const ig = ctx.createRadialGradient(ix - 4, iy - 5, 2, ix, iy, 22);
    ig.addColorStop(0, '#9ad0ff'); ig.addColorStop(0.55, '#3b82c8'); ig.addColorStop(1, '#1f4b83');
    ctx.fillStyle = ig; circle(ctx, ix, iy, 21); ctx.fill();
    const pr = lerp(11, 6.5, pupilK);
    ctx.fillStyle = '#0a1020'; circle(ctx, ix, iy, pr); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; circle(ctx, ix - 6, iy - 7, 4.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; circle(ctx, ix + 6, iy + 5, 2.2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#5b4a45'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, -h * 1.7, w, 0); ctx.quadraticCurveTo(0, h * 1.7, -w, 0); ctx.closePath(); ctx.stroke();
    // 속눈썹
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * 0.42, bx = Math.cos(a) * 30, by = -h * 1.0 + Math.sin(a) * 6; ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx + Math.cos(a) * 9, by - 4 + Math.sin(a) * 9); ctx.stroke(); }
    ctx.restore();
  }

  /* =========================================================
     장면 배치
     ========================================================= */
  const GEO = {
    see(L) {
      if (L.key === 'wide') {
        return {
          tableY: 452, obj: { x: 392, y: 392 }, objR: 62, eye: { x: 694, y: 218, s: 1 },
          lampB: { x: 44, y: 44, w: 250, h: 200 }, bubble: { x: 584, y: 124, r: 80 }, chip: { x: 694, y: 318 },
        };
      }
      return {
        tableY: 650, obj: { x: 244, y: 566 }, objR: 72, eye: { x: 420, y: 352, s: 1.1 },
        lampB: { x: 40, y: 80, w: 190, h: 250 }, bubble: { x: 388, y: 150, r: 92 }, chip: { x: 398, y: 450 },
      };
    },
    mix(L) {
      if (L.key === 'wide') {
        const cx = 592, cy = 232, rho = 98, d = 96;
        return {
          screen: { x: 410, y: 44, w: 364, h: 380 }, cx, cy, rho,
          spots: [{ x: cx - d / 2, y: cy - d * 0.29 }, { x: cx + d / 2, y: cy - d * 0.29 }, { x: cx, y: cy + d * 0.58 }],
          lamps: [{ x: 96, y: 118 }, { x: 96, y: 238 }, { x: 96, y: 358 }],
          tray: { x: 410, y: 462, w: 364, h: 92 },
        };
      }
      const cx = 260, cy = 476, rho = 124, d = 122;
      return {
        screen: { x: 22, y: 262, w: 476, h: 446 }, cx, cy, rho,
        spots: [{ x: cx - d / 2, y: cy - d * 0.29 }, { x: cx + d / 2, y: cy - d * 0.29 }, { x: cx, y: cy + d * 0.58 }],
        lamps: [{ x: 92, y: 116 }, { x: 260, y: 116 }, { x: 428, y: 116 }],
        tray: { x: 22, y: 740, w: 476, h: 130 },
      };
    },
    stage(L) {
      if (L.key === 'wide') {
        return {
          floorY: 400, lamp: { x: 400, y: 50 },
          objs: [{ x: 170, kind: 'shirt' }, { x: 400, kind: 'leaf' }, { x: 630, kind: 'banana' }],
          pedTop: 408, pedH: 70, objY: 332, tagY: 516, chipY: 548, ow: 1,
        };
      }
      return {
        floorY: 580, lamp: { x: 260, y: 62 },
        objs: [{ x: 92, kind: 'shirt' }, { x: 260, kind: 'leaf' }, { x: 428, kind: 'banana' }],
        pedTop: 590, pedH: 60, objY: 520, tagY: 700, chipY: 742, ow: 0.74,
      };
    },
    screen(L) {
      if (L.key === 'wide') {
        return {
          mon: { x: 26, y: 40, w: 436, h: 314 }, lens: { x: 616, y: 214, r: 128 },
          ladder: { x: 26, y: 428, w: 748, h: 136 }, tgt: { x: 138, y: 468, r: 40 }, mine: { x: 318, y: 468, r: 40 }, meter: { x: 480, y: 452, w: 280, h: 30 },
        };
      }
      return {
        mon: { x: 20, y: 28, w: 480, h: 344 }, lens: { x: 260, y: 600, r: 150 },
        ladder: { x: 20, y: 782, w: 480, h: 108 }, tgt: { x: 110, y: 812, r: 40 }, mine: { x: 250, y: 812, r: 40 }, meter: { x: 320, y: 790, w: 180, h: 30 },
      };
    },
  };

  /* =========================================================
     ① 물체의 색: 어두운 방, 전등, 사과/바나나, 눈, 빛 확대 돋보기
     ========================================================= */
  function seeCache(g, L) {
    roomBg(g, L);
    const G = GEO.see(L);
    // 탁자
    const tg = g.createLinearGradient(0, G.tableY, 0, L.vh);
    tg.addColorStop(0, '#26345e'); tg.addColorStop(0.12, '#1b2850'); tg.addColorStop(1, '#0e1632');
    g.fillStyle = tg; g.fillRect(0, G.tableY, L.vw, L.vh - G.tableY);
    g.fillStyle = 'rgba(160,190,255,.20)'; g.fillRect(0, G.tableY, L.vw, 2);
    g.strokeStyle = 'rgba(120,150,220,.07)'; g.lineWidth = 2;
    for (let i = 1; i < 6; i++) { const y = G.tableY + (L.vh - G.tableY) * (i / 6) ** 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(L.vw, y); g.stroke(); }
  }
  function seeLamp(G) {
    const b = G.lampB;
    return { x: b.x + S.lampU * b.w, y: b.y + S.lampV * b.h };
  }
  // 입사한 빛이 닿는 점(전등과 눈 방향의 이등분선 쪽 표면)
  function seeHit(G, lamp) {
    const o = G.obj;
    const ul = norm(lamp.x - o.x, lamp.y - o.y), ue = norm(G.eye.x - o.x, G.eye.y - o.y);
    let b = norm(ul.x + ue.x, ul.y + ue.y);
    if (Math.hypot(ul.x + ue.x, ul.y + ue.y) < 0.25) b = { x: 0, y: -1 };
    const rr = G.objR * (S.obj === 'banana' ? 0.42 : 0.93);
    return { x: o.x + b.x * rr, y: o.y + b.y * rr + (S.obj === 'banana' ? 14 : 0), nx: b.x, ny: b.y };
  }

  /* ----- 물체 그림 (반사율 × 닿는 빛으로 색을 정함) ----- */
  function drawApple(V, x, y, r, refl, light, k) {
    const { ctx } = V;
    const col = surf(refl, light), leaf = surf([0.08, 0.85, 0.12], light), stem = surf([0.45, 0.28, 0.14], light);
    const lv = clamp((light[0] + light[1] + light[2]) / 3, 0, 1);
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= k;
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.bezierCurveTo(r * 0.3, -r * 1.02, r * 1.06, -r * 0.92, r * 1.02, -r * 0.05);
      ctx.bezierCurveTo(r * 1.0, r * 0.68, r * 0.46, r * 1.02, 0, r * 0.9);
      ctx.bezierCurveTo(-r * 0.46, r * 1.02, -r * 1.0, r * 0.68, -r * 1.02, -r * 0.05);
      ctx.bezierCurveTo(-r * 1.06, -r * 0.92, -r * 0.3, -r * 1.02, 0, -r * 0.6);
      ctx.closePath();
    };
    body(); ctx.fillStyle = rgbS(col); ctx.fill();
    ctx.save(); body(); ctx.clip();
    let g = ctx.createRadialGradient(-r * 0.36, -r * 0.42, r * 0.06, -r * 0.1, -r * 0.05, r * 1.2);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.42 * lv) + ')'); g.addColorStop(0.3, 'rgba(255,255,255,' + (0.06 * lv) + ')'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = g; ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
    // 위쪽 움푹한 곳
    g = ctx.createRadialGradient(0, -r * 0.72, 0, 0, -r * 0.72, r * 0.45);
    g.addColorStop(0, 'rgba(0,0,0,.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(-r, -r * 1.2, r * 2, r * 1.0);
    ctx.restore();
    // 작은 반사광
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * lv) + ')';
    ctx.beginPath(); ctx.ellipse(-r * 0.46, -r * 0.34, r * 0.13, r * 0.26, 0.55, 0, TAU); ctx.fill();
    // 꼭지와 잎
    ctx.strokeStyle = rgbS(stem); ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.58); ctx.quadraticCurveTo(r * 0.02, -r * 0.84, r * 0.12, -r * 1.06); ctx.stroke();
    ctx.fillStyle = rgbS(leaf);
    ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.92); ctx.bezierCurveTo(r * 0.36, -r * 1.2, r * 0.74, -r * 1.12, r * 0.84, -r * 0.92); ctx.bezierCurveTo(r * 0.6, -r * 0.74, r * 0.28, -r * 0.76, r * 0.1, -r * 0.92); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(r * 0.12, -r * 0.92); ctx.quadraticCurveTo(r * 0.45, -r * 1.0, r * 0.76, -r * 0.96); ctx.stroke();
    ctx.restore();
  }
  function bananaPath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(-1.5 * r, -0.25 * r);
    ctx.bezierCurveTo(-1.0 * r, 0.95 * r, 0.7 * r, 1.05 * r, 1.5 * r, -0.55 * r);
    ctx.bezierCurveTo(0.8 * r, 0.14 * r, -0.8 * r, 0.12 * r, -1.5 * r, -0.25 * r);
    ctx.closePath();
  }
  function drawBanana(V, x, y, r, refl, light, k) {
    const { ctx } = V;
    const col = surf(refl, light), tip = surf([0.35, 0.22, 0.12], light);
    const lv = clamp((light[0] + light[1] + light[2]) / 3, 0, 1);
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= k;
    bananaPath(ctx, r); ctx.fillStyle = rgbS(col); ctx.fill();
    ctx.save(); bananaPath(ctx, r); ctx.clip();
    const g = ctx.createLinearGradient(0, -r * 0.3, 0, r * 1.0);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.36 * lv) + ')'); g.addColorStop(0.22, 'rgba(255,255,255,' + (0.05 * lv) + ')'); g.addColorStop(0.55, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = g; ctx.fillRect(-r * 2, -r * 1, r * 4, r * 2.4);
    // 바나나 능선
    ctx.strokeStyle = 'rgba(0,0,0,.20)'; ctx.lineWidth = 2;
    [0.33, 0.66].forEach((m) => {
      const o = [[-1.0, 0.95], [0.7, 1.05]], inn = [[0.8, 0.14], [-0.8, 0.12]];
      ctx.beginPath(); ctx.moveTo(-1.5 * r, -0.25 * r);
      ctx.bezierCurveTo((o[0][0] * (1 - m) + inn[1][0] * m) * r, (o[0][1] * (1 - m) + inn[1][1] * m) * r, (o[1][0] * (1 - m) + inn[0][0] * m) * r, (o[1][1] * (1 - m) + inn[0][1] * m) * r, 1.5 * r, -0.55 * r);
      ctx.stroke();
    });
    ctx.restore();
    ctx.fillStyle = rgbS(tip);
    circle(ctx, -1.5 * r, -0.25 * r, r * 0.08); ctx.fill();
    ctx.save(); ctx.translate(1.5 * r, -0.55 * r); ctx.rotate(-0.95);
    D_rr(ctx, -r * 0.05, -r * 0.2, r * 0.13, r * 0.25, r * 0.04); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function D_rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ----- 돋보기: 흰빛이 물체에 닿으면 빨강·초록·파랑 빛이 각각 반사되거나 흡수돼요 ----- */
  function drawBubble(V, G, hit, light, t) {
    const { ctx, D, L } = V;
    const B = G.bubble, r = B.r, fs = L.fs;
    const lk = S.lampK, refl = S.reflV;
    const ap = 0.55 + 0.45 * lk;                          // 전등이 꺼지면 흐리게
    ctx.save();
    ctx.globalAlpha *= ap;
    // 연결선
    const dx = B.x - hit.x, dy = B.y - hit.y, dl = Math.hypot(dx, dy) || 1;
    ctx.strokeStyle = 'rgba(190,210,255,.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(hit.x + dx / dl * 14, hit.y + dy / dl * 14); ctx.lineTo(B.x - dx / dl * (r + 6), B.y - dy / dl * (r + 6)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(190,210,255,.9)'; ctx.lineWidth = 2.4; circle(ctx, hit.x, hit.y, 13); ctx.stroke();
    // 돋보기 테
    softShadow(V, () => circle(ctx, B.x, B.y, r + 7), { a: 0.7, y: 5, spread: 10 });
    const rg = ctx.createLinearGradient(B.x - r, B.y - r, B.x + r, B.y + r);
    rg.addColorStop(0, '#f2f6fc'); rg.addColorStop(0.5, '#a3b0c4'); rg.addColorStop(1, '#5d6b84');
    ctx.fillStyle = rg; circle(ctx, B.x, B.y, r + 7); ctx.fill();
    ctx.save(); circle(ctx, B.x, B.y, r); ctx.clip();
    const bg = ctx.createRadialGradient(B.x - r * 0.3, B.y - r * 0.4, r * 0.1, B.x, B.y, r * 1.05);
    bg.addColorStop(0, '#1b2a55'); bg.addColorStop(1, '#0b1330');
    ctx.fillStyle = bg; ctx.fillRect(B.x - r, B.y - r, r * 2, r * 2);
    const P = (ux, uy) => ({ x: B.x + ux * r, y: B.y + uy * r });
    // 물체 표면(아래쪽)
    const sy = P(0, 0.4).y, scol = surf(refl, light);
    const sg = ctx.createLinearGradient(0, sy, 0, B.y + r);
    sg.addColorStop(0, rgbS(scol)); sg.addColorStop(1, rgbS(mulC(scol, 0.55)));
    ctx.fillStyle = sg; ctx.fillRect(B.x - r, sy, r * 2, r * 0.7);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * lk) + ')'; ctx.fillRect(B.x - r, sy, r * 2, 2);
    // 흰빛 = 빨강·초록·파랑 세 빛이 겹친 것. 닿는 곳에서 색마다 반사되거나 흡수돼요
    const din = norm(0.5, 0.86), perp = { x: -din.y, y: din.x };
    const imp = P(-0.12, 0.4), len = r * 1.0;
    const st = { x: imp.x - din.x * len, y: imp.y - din.y * len };
    const outDirs = [norm(0.26, -0.97), norm(0.7, -0.72), norm(0.97, -0.26)];
    const olen = r * 0.7;
    let nRefl = 0, nAbs = 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // 들어오는 빛: 세 색의 빛이 나란히 겹쳐 흰빛으로 보여요
    for (let i = 0; i < 3; i++) {
      const o = (i - 1) * 3.2;
      ctx.strokeStyle = rgbS(VIVID[i], 0.5 * lk); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(st.x + perp.x * o, st.y + perp.y * o); ctx.lineTo(imp.x + perp.x * o, imp.y + perp.y * o); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * lk) + ')';
    ctx.beginPath(); ctx.moveTo(imp.x + din.x * 1, imp.y + din.y * 1); ctx.lineTo(imp.x - din.x * 11 - din.y * 7, imp.y - din.y * 11 + din.x * 7); ctx.lineTo(imp.x - din.x * 11 + din.y * 7, imp.y - din.y * 11 - din.x * 7); ctx.closePath(); ctx.fill();
    const u = (t * 0.8) % 1;
    if (u < 0.5) { const f = u / 0.5; streak(ctx, st.x + (imp.x - st.x) * f, st.y + (imp.y - st.y) * f, din.x, din.y, [255, 255, 255], lk, 16, 3); }
    for (let i = 0; i < 3; i++) {
      const col = VIVID[i], rf = refl[i], od = outDirs[i];
      const en = { x: imp.x + od.x * olen, y: imp.y + od.y * olen };
      if (rf > 0.5) nRefl++; else nAbs++;
      if (rf > 0.02) {
        ctx.strokeStyle = rgbS(col, 0.55 * lk * rf); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(imp.x, imp.y); ctx.lineTo(en.x, en.y); ctx.stroke();
        ctx.fillStyle = rgbS(col, 0.95 * lk * rf);
        ctx.beginPath(); ctx.moveTo(en.x + od.x * 3, en.y + od.y * 3); ctx.lineTo(en.x - od.x * 8 - od.y * 6, en.y - od.y * 8 + od.x * 6); ctx.lineTo(en.x - od.x * 8 + od.y * 6, en.y - od.y * 8 - od.x * 6); ctx.closePath(); ctx.fill();
        if (u >= 0.5) { const f = (u - 0.5) / 0.5; streak(ctx, imp.x + od.x * olen * f, imp.y + od.y * olen * f, od.x, od.y, col, lk * rf * (1 - f * 0.35), 14, 2.6); }
      }
      if (rf < 0.98 && u >= 0.5 && u < 0.9) { // 흡수: 닿는 곳에서 작아지며 사라짐
        const f = (u - 0.5) / 0.4, a = (1 - f) * (1 - rf) * lk, px = imp.x + perp.x * (i - 1) * 7, py = imp.y + perp.y * (i - 1) * 7 + 2;
        ctx.fillStyle = rgbS(col, 0.6 * a); circle(ctx, px, py, 5 * (1 - f) + 2); ctx.fill();
        ctx.strokeStyle = rgbS(col, 0.55 * a); ctx.lineWidth = 1.6; circle(ctx, px, py, 4 + f * 13); ctx.stroke();
      }
    }
    ctx.restore();
    // 글자
    txt(ctx, '흰빛', st.x + 6, st.y - 12, { size: 13 * Math.min(1.2, fs), color: '#fff', halo: 'rgba(8,14,34,.9)', alpha: lk });
    if (nRefl > 0) txt(ctx, '반사', B.x, B.y - r * 0.8, { size: 13 * Math.min(1.2, fs), color: '#fff', halo: 'rgba(8,14,34,.9)', alpha: lk });
    if (nAbs > 0) txt(ctx, '흡수', B.x, B.y + r * 0.7, { size: 13 * Math.min(1.2, fs), color: '#fff', halo: 'rgba(8,14,34,.55)', alpha: Math.max(0.25, lk) });
    ctx.restore();
    // 안쪽 유리 반짝임
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(B.x, B.y, r - 6, Math.PI * 1.1, Math.PI * 1.38); ctx.stroke();
    D.label(B.x, B.y - r - 18, '🔍 빛을 확대하면', { bg: '#0d1530', color: '#dbe6ff', size: 13 * Math.min(1.15, fs), border: 'rgba(160,190,255,.45)' });
    ctx.restore();
  }

  /* ----- 장면 갱신·그리기 ----- */
  function updateSee(dt) {
    S.lampK = approach(S.lampK, S.lampOn ? 1 : 0, dt, 5);
    S.lampLift = approach(S.lampLift, S.lampDrag ? 1 : 0, dt, 14);
    const tgt = S.obj === 'apple' ? [1, 0, 0] : S.refl;
    for (let i = 0; i < 3; i++) S.reflV[i] = approach(S.reflV[i], tgt[i], dt, 9);
    if (S.lampOn && S.scene === 'see') S.obs += dt;
  }
  function drawSee(V, t, dt) {
    const { ctx, D, L } = V;
    const G = GEO.see(L);
    const lk = S.lampK, lamp = seeLamp(G);
    cached(V, 'see', seeCache);
    const hit = seeHit(G, lamp);
    const light = [lk, lk, lk];
    const o = G.obj;
    // 전등 빛이 번지는 모습 (방과 탁자가 은은하게 밝아짐)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, lamp.x, lamp.y, 320, [159, 184, 255], 0.12 * lk);
    ctx.save(); ctx.translate(o.x, G.tableY - 4); ctx.scale(1, 0.2);
    drawGlow(ctx, 0, 0, 230, [255, 255, 255], 0.34 * lk);
    ctx.restore();
    ctx.restore();
    // 그림자
    ctx.save();
    ctx.translate(o.x + (o.x - lamp.x) * 0.1, G.tableY + 2); ctx.scale(1, 0.18);
    drawGlow(ctx, 0, 0, G.objR * 1.5, [0, 0, 0], 0.5 * (0.35 + 0.65 * lk));
    ctx.restore();
    // 물체 (바뀔 때는 겹쳐서 교체)
    const sk = clamp(S.swap.k, 0, 1);
    const drawObj = (kind, refl, a, sc) => {
      if (a <= 0.01) return;
      ctx.save(); ctx.translate(o.x, G.tableY); ctx.scale(sc, sc); ctx.translate(-o.x, -G.tableY);
      if (kind === 'apple') drawApple(V, o.x, o.y, G.objR, refl, light, a);
      else drawBanana(V, o.x + 2, o.y + G.objR * 0.3, G.objR * 0.95, refl, light, a);
      ctx.restore();
    };
    if (sk < 1 && S.prevObj) drawObj(S.prevObj, S.prevRefl, 1 - sk, 1 - 0.3 * sk);
    drawObj(S.obj, S.reflV, sk, 0.7 + 0.3 * EASE.outBack(sk));

    // 빛줄기와 빛 알갱이
    const lampAng = Math.atan2(hit.y - lamp.y, hit.x - lamp.x);
    const mouth = { x: lamp.x + Math.cos(lampAng) * 27, y: lamp.y + Math.sin(lampAng) * 27 };
    const eyeV = norm(hit.x - G.eye.x, hit.y - G.eye.y);
    const eyeEnd = { x: G.eye.x + eyeV.x * 46 * G.eye.s, y: G.eye.y + eyeV.y * 46 * G.eye.s };
    const rc = [0, 1, 2].map((i) => VIVID[i]);
    const rk = (refl, i) => refl[i];
    // 반사한 빛의 색 (세 빛을 더함)
    let outCol = [0, 0, 0], outK = 0;
    for (let i = 0; i < 3; i++) { const w = S.reflV[i] * lk; outCol = [outCol[0] + rc[i][0] * w, outCol[1] + rc[i][1] * w, outCol[2] + rc[i][2] * w]; outK = Math.max(outK, w); }
    outCol = outCol.map((v) => clamp(v, 0, 255));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // 은은한 빛줄기
    if (lk > 0.02) {
      beam(V, mouth.x, mouth.y, hit.x, hit.y, 12, 7, [255, 255, 255], 0.2 * lk, 0.14 * lk);
      beam(V, hit.x, hit.y, eyeEnd.x, eyeEnd.y, 7, 5, outCol, 0.16 * lk, 0.10 * lk);
      // 사방으로 퍼지는 반사(난반사) — 눈 말고 다른 방향으로도 빛이 나가요
      [-2.55, -2.05, -0.55, -0.15, 0.4].forEach((a, i) => {
        const len = 66 + (i % 3) * 14;
        const gx = hit.x + Math.cos(a) * len, gy = hit.y + Math.sin(a) * len;
        const g = ctx.createLinearGradient(hit.x, hit.y, gx, gy);
        g.addColorStop(0, rgbS(outCol, 0.22 * lk * (outK > 0.05 ? 1 : 0))); g.addColorStop(1, rgbS(outCol, 0));
        ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hit.x, hit.y); ctx.lineTo(gx, gy); ctx.stroke();
      });
    }
    ctx.restore();
    if (lk > 0.1) {
      const lens = pulseTrain(V, [
        { a: mouth, b: hit, col: [255, 255, 255], k: lk },
        { a: hit, b: eyeEnd, col: outCol, k: Math.min(1, outK * 1.1) },
      ], t, { gap: 66, speed: 220, r: 3.6 });
      // 표면에 닿는 순간 — 흡수되는 빛은 작은 불꽃으로 사라져요
      const sp = 220, gap = 66, cross = Math.floor((t * sp - lens[0]) / gap) - Math.floor(((t - dt) * sp - lens[0]) / gap);
      if (cross > 0 && !REDUCE) {
        for (let i = 0; i < 3; i++) {
          if (S.reflV[i] < 0.5) for (let n = 0; n < 3; n++) {
            const a = Math.atan2(hit.ny, hit.nx) + (Math.random() - 0.5) * 2.2;
            V.fx.emit({ x: hit.x, y: hit.y, vx: Math.cos(a) * (30 + Math.random() * 40), vy: Math.sin(a) * (30 + Math.random() * 40), life: 0.4, size: 2.2, color: rgbS(VIVID[i]), drag: 3, gravity: 0 });
          }
        }
      }
    }
    // 전등
    const lampMouth = spotLamp(V, lamp.x, lamp.y - 6 * S.lampLift, lampAng, { k: lk, tint: [255, 250, 235], s: 1 + 0.14 * S.lampLift });
    D.label(lamp.x, lamp.y + 62, '전등', { bg: '#0d1530', color: '#dbe6ff', size: 13 * Math.min(1.2, L.fs), border: 'rgba(160,190,255,.4)' });
    if (!S.lampOn) { D.ring(lamp.x, lamp.y, 50, t, { color: '#ffd24a' }); }
    if (isNew('lamp') && S.lampOn) newRing(V, { x: lamp.x - 54, y: lamp.y - 40, w: 108, h: 100 }, t);

    // 눈과 눈에 보이는 색
    eyeIcon(V, G.eye.x, G.eye.y, G.eye.s, eyeV, lk);
    D.label(G.eye.x, G.eye.y - 54 * G.eye.s, '눈', { bg: '#0d1530', color: '#dbe6ff', size: 13 * Math.min(1.2, L.fs), border: 'rgba(160,190,255,.4)' });
    const seen = surf(S.reflV, light);
    const cw = L.key === 'wide' ? 156 : 170, ch = 46, cx0 = G.chip.x - cw / 2, cy0 = G.chip.y;
    darkPanel(V, cx0, cy0, cw, ch, 14, 0.9);
    ctx.save();
    ctx.fillStyle = rgbS(seen); circle(ctx, cx0 + 26, cy0 + ch / 2, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    if (lk > 0.5) txt(ctx, withRo(colorName(seen.map((v) => v / 255))) + ' 보여요', cx0 + 48, cy0 + ch / 2, { size: 14.5 * Math.min(1.15, L.fs), align: 'left', color: '#fff' });
    else txt(ctx, '어두워서 안 보여요', cx0 + 48, cy0 + ch / 2, { size: 13.5 * Math.min(1.15, L.fs), align: 'left', color: '#9fb0d6' });

    drawBubble(V, G, hit, light, t);
  }

  /* =========================================================
     ② 빛의 합성: 빨강·초록·파랑 조명 3개를 스크린에 겹쳐요 ('lighter' = 빛은 더해져요)
     ========================================================= */
  const MIX_COLORS = {
    Y: { name: '노랑', rgb: [255, 255, 0] }, C: { name: '청록', rgb: [0, 255, 255] },
    M: { name: '자홍', rgb: [255, 0, 255] }, W: { name: '흰색', rgb: [255, 255, 255] },
  };
  // 슬라이더 값(0~100)이 어떤 색을 만들었는지
  function classify(v) {
    const r = v[0], g = v[1], b = v[2], hi = 60, lo = 12;
    if (r >= hi && g >= hi && b >= hi && Math.max(r, g, b) - Math.min(r, g, b) <= 20) return 'W';
    if (r >= hi && g >= hi && b <= lo && Math.abs(r - g) <= 25) return 'Y';
    if (g >= hi && b >= hi && r <= lo && Math.abs(g - b) <= 25) return 'C';
    if (r >= hi && b >= hi && g <= lo && Math.abs(r - b) <= 25) return 'M';
    return null;
  }
  function mixCache(g, L) {
    roomBg(g, L);
    const G = GEO.mix(L), sc = G.screen;
    // 스크린 틀과 받침
    g.save();
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 20; g.shadowOffsetY = 6;
    g.fillStyle = '#1b2442';
    g.beginPath(); g.roundRect ? g.roundRect(sc.x - 10, sc.y - 10, sc.w + 20, sc.h + 20, 16) : g.rect(sc.x - 10, sc.y - 10, sc.w + 20, sc.h + 20);
    g.fill();
    g.restore();
    g.strokeStyle = 'rgba(160,190,255,.25)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect ? g.roundRect(sc.x - 10, sc.y - 10, sc.w + 20, sc.h + 20, 16) : g.rect(sc.x - 10, sc.y - 10, sc.w + 20, sc.h + 20);
    g.stroke();
  }
  function updateMix(dt) {
    for (let i = 0; i < 3; i++) S.mixV[i] = approach(S.mixV[i], S.mix[i] / 100, dt, 9);
    // 만든 색 찾기: 같은 색을 0.6초 이상 유지하면 '찾았어요'
    if (S.scene !== 'mix') { S.hold.key = ''; S.hold.t = 0; return; }
    const key = classify(S.mix);
    if (key && !S.found[key]) {
      if (S.hold.key === key) S.hold.t += dt; else { S.hold.key = key; S.hold.t = 0; }
      if (S.hold.t >= 0.6) {
        S.found[key] = true; S.hold.key = ''; S.hold.t = 0;
        S.tok[key].k = 0; S.tok[key].pop = true;
        SciSim.tween(S.tok[key], { k: 1 }, { duration: 0.6, ease: 'outBack' });
        Sound.tone(660, 0.12, 'triangle', 0.09); Sound.tone(880, 0.16, 'triangle', 0.09, 0.08);
        syncUI();
      }
    } else { S.hold.key = ''; S.hold.t = 0; }
  }
  function mixedColor() { return [S.mixV[0], S.mixV[1], S.mixV[2]]; }

  function drawMix(V, t, dt) {
    const { ctx, D, L } = V;
    const G = GEO.mix(L), sc = G.screen, fs = L.fs;
    cached(V, 'mix', mixCache);
    const mv = S.mixV;
    // ---- 스크린 (흰 천: 어두운 방에서는 희미하게만 보여요) ----
    ctx.save();
    D.roundRect(sc.x, sc.y, sc.w, sc.h, 8); ctx.clip();
    ctx.fillStyle = 'rgb(26,29,40)'; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
    ctx.globalCompositeOperation = 'lighter';
    // 세 조명이 만드는 원 — 빛은 더해져요
    for (let i = 0; i < 3; i++) {
      const sp = G.spots[i], a = mv[i];
      if (a < 0.005) continue;
      const rr = G.rho, c = PURE[i];
      const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rr);
      g.addColorStop(0, rgbS(c, a)); g.addColorStop(0.78, rgbS(c, a * 0.96)); g.addColorStop(0.92, rgbS(c, a * 0.5)); g.addColorStop(1, rgbS(c, 0));
      ctx.fillStyle = g; circle(ctx, sp.x, sp.y, rr); ctx.fill();
    }
    ctx.restore();
    // 스크린 가장자리 어둡게 (살짝)
    ctx.save();
    D.roundRect(sc.x, sc.y, sc.w, sc.h, 8); ctx.clip();
    const vg = ctx.createRadialGradient(G.cx, G.cy, Math.min(sc.w, sc.h) * 0.45, G.cx, G.cy, Math.max(sc.w, sc.h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)');
    ctx.fillStyle = vg; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
    ctx.restore();

    // ---- 조명 세 개: 빛줄기 + 전등 ----
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const mouths = [];
    for (let i = 0; i < 3; i++) {
      const lp = G.lamps[i], sp = G.spots[i], ang = Math.atan2(sp.y - lp.y, sp.x - lp.x);
      mouths.push({ x: lp.x + Math.cos(ang) * 28, y: lp.y + Math.sin(ang) * 28, ang });
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, L.vw, L.vh);
    { const x = sc.x - 2, y = sc.y - 2, w = sc.w + 4, h = sc.h + 4, r = 8;
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    ctx.clip('evenodd');
    for (let i = 0; i < 3; i++) {
      const sp = G.spots[i], m = mouths[i], a = mv[i];
      if (a < 0.01) continue;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      beam(V, m.x, m.y, sp.x, sp.y, 14, G.rho * 0.9, PURE[i], 0.34 * a, 0.18 * a);
      beam(V, m.x, m.y, sp.x, sp.y, 22, G.rho * 1.04, PURE[i], 0.10 * a, 0.05 * a);
      ctx.restore();
      pulseTrain(V, [{ a: m, b: sp, col: VIVID[i], k: 0.9 * a }], t, { gap: 70, speed: 210, r: 3.4, alpha: 0.9 });
    }
    ctx.restore();
    ['빨강', '초록', '파랑'].forEach((nm, i) => {
      const lp = G.lamps[i], m = mouths[i];
      spotLamp(V, lp.x, lp.y, m.ang, { k: mv[i], tint: VIVID[i], s: L.key === 'wide' ? 1 : 0.95 });
      D.label(lp.x - 6, lp.y + 40, CH_DOT[i] + ' ' + nm + ' 조명', { bg: '#0d1530', color: '#dbe6ff', size: 13 * Math.min(1.2, fs), border: 'rgba(160,190,255,.4)' });
    });
    if (isNew('mix')) newRing(V, { x: G.lamps[0].x - 60, y: G.lamps[0].y - 50, w: 124, h: G.lamps[2].y - G.lamps[0].y + 130 }, t);

    // ---- 겹친 곳의 이름표 ----
    const dd = G.rho * 0.98, lab = (key, ox, oy, cond) => {
      const al = cond;
      if (al < 0.02) return;
      txt(ctx, MIX_COLORS[key].name, G.cx + ox, G.cy + oy, { size: 15 * Math.min(1.2, fs), color: '#fff', halo: 'rgba(0,0,0,.55)', haloW: 5, alpha: al });
    };
    const mn = Math.min;
    lab('Y', 0, -dd * 0.74 + 4, smooth(0.3, 0.6, mn(mv[0], mv[1])));
    lab('C', dd * 0.64, dd * 0.38, smooth(0.3, 0.6, mn(mv[1], mv[2])));
    lab('M', -dd * 0.64, dd * 0.38, smooth(0.3, 0.6, mn(mv[0], mv[2])));
    lab('W', 0, 6, smooth(0.3, 0.6, mn(mv[0], mv[1], mv[2])));

    // ---- 찾은 색 모으기 ----
    const T = G.tray;
    darkPanel(V, T.x, T.y, T.w, T.h, 16, 0.86);
    txt(ctx, '🎯 찾은 색 ' + Object.keys(S.found).filter((k) => S.found[k]).length + ' / 4', T.x + 16, T.y + 20 * Math.min(1.3, fs), { size: 14 * Math.min(1.2, fs), align: 'left', color: '#dbe6ff' });
    const keys = ['Y', 'C', 'M', 'W'], tr = L.key === 'wide' ? 22 : 29, step = T.w / 4;
    keys.forEach((k, i) => {
      const cx = T.x + step * (i + 0.5), cy = T.y + T.h * 0.6, tk = S.tok[k], f = S.found[k];
      const sc2 = f ? (0.6 + 0.4 * clamp(tk.k, 0, 1.4)) : 1;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc2, sc2);
      if (f) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, 0, 0, tr * 2.2, MIX_COLORS[k].rgb, 0.5); ctx.restore();
        ctx.fillStyle = rgbS(MIX_COLORS[k].rgb); circle(ctx, 0, 0, tr); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.strokeStyle = '#0a1020'; ctx.lineWidth = tr * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(-tr * 0.42, 0); ctx.lineTo(-tr * 0.1, tr * 0.34); ctx.lineTo(tr * 0.46, -tr * 0.3); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.06)'; circle(ctx, 0, 0, tr); ctx.fill();
        ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(160,190,255,.5)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        txt(ctx, '?', 0, 1, { size: tr * 0.95, color: 'rgba(190,210,255,.75)' });
      }
      ctx.restore();
      txt(ctx, MIX_COLORS[k].name, cx, cy + tr + 17 * Math.min(1.25, fs), { size: 14 * Math.min(1.2, fs), color: f ? '#fff' : '#8fa3d0' });
      if (tk.pop) {
        tk.pop = false;
        if (!REDUCE) V.fx.burst(cx, cy, { count: 16, colors: [rgbS(MIX_COLORS[k].rgb), '#ffffff', '#ffd24a'], speed: 150, gravity: 80, life: 0.7 });
      }
    });
  }

  /* =========================================================
     ③ 조명과 색: 무대 위 흰 셔츠·초록 잎·노란 바나나
     ========================================================= */
  const STAGE_OBJ = {
    shirt: { name: '흰 셔츠', refl: [0.97, 0.97, 0.97], pat: [1, 1, 1] },
    leaf: { name: '초록 잎', refl: [0.06, 0.82, 0.1], pat: [0, 1, 0] },
    banana: { name: '노란 바나나', refl: [1, 0.88, 0.05], pat: [1, 1, 0] },
  };
  const gelTint = (g) => {      // 조명 색 → 눈에 보이는 광선 색
    let c = [0, 0, 0];
    for (let i = 0; i < 3; i++) c = [c[0] + VIVID[i][0] * g[i], c[1] + VIVID[i][1] * g[i], c[2] + VIVID[i][2] * g[i]];
    return c.map((v) => clamp(v, 0, 255));
  };
  function stageCache(g, L) {
    const G = GEO.stage(L);
    // 뒷벽
    const wg = g.createLinearGradient(0, 0, 0, G.floorY);
    wg.addColorStop(0, '#0a0d1d'); wg.addColorStop(1, '#161a33');
    g.fillStyle = wg; g.fillRect(0, 0, L.vw, G.floorY);
    // 커튼
    const cw = L.key === 'wide' ? 96 : 56;
    [0, L.vw - cw].forEach((x0, side) => {
      const cg = g.createLinearGradient(x0, 0, x0 + cw, 0);
      cg.addColorStop(0, side ? '#3a0f20' : '#25070f'); cg.addColorStop(0.5, '#4b1428'); cg.addColorStop(1, side ? '#25070f' : '#3a0f20');
      g.fillStyle = cg; g.fillRect(x0, 0, cw, G.floorY + 6);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
      for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x0 + cw * i / 5, 0); g.lineTo(x0 + cw * i / 5, G.floorY + 6); g.stroke(); }
    });
    g.fillStyle = '#25070f'; g.fillRect(0, 0, L.vw, 14);
    // 무대 바닥
    const fg = g.createLinearGradient(0, G.floorY, 0, L.vh);
    fg.addColorStop(0, '#3a2a22'); fg.addColorStop(1, '#17100d');
    g.fillStyle = fg; g.fillRect(0, G.floorY, L.vw, L.vh - G.floorY);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
    for (let i = 1; i < 7; i++) { const y = G.floorY + (L.vh - G.floorY) * (i / 7) ** 1.5; g.beginPath(); g.moveTo(0, y); g.lineTo(L.vw, y); g.stroke(); }
    g.fillStyle = 'rgba(255,220,180,.18)'; g.fillRect(0, G.floorY, L.vw, 2);
  }
  function drawPedestal(V, x, topY, w, h, light) {
    const { ctx } = V;
    const base = surf([0.62, 0.62, 0.66], light), top = surf([0.82, 0.82, 0.86], light);
    const bg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    bg.addColorStop(0, rgbS(mulC(base, 0.55))); bg.addColorStop(0.35, rgbS(base)); bg.addColorStop(0.55, rgbS(mulC(base, 1.1))); bg.addColorStop(1, rgbS(mulC(base, 0.4)));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(x - w / 2, topY); ctx.lineTo(x - w / 2, topY + h); ctx.ellipse(x, topY + h, w / 2, 14, 0, Math.PI, 0, true); ctx.lineTo(x + w / 2, topY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgbS(top); ctx.beginPath(); ctx.ellipse(x, topY, w / 2, 14, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, topY, w / 2 - 4, 11, 0, 0, TAU); ctx.stroke();
  }
  function drawShirt(V, x, y, s, refl, light) {
    const { ctx } = V;
    const col = surf(refl, light), lv = clamp((light[0] + light[1] + light[2]) / 3, 0, 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-24, -58); ctx.quadraticCurveTo(0, -36, 24, -58);
      ctx.lineTo(50, -50); ctx.lineTo(84, -14); ctx.lineTo(62, 8); ctx.lineTo(46, -6);
      ctx.lineTo(46, 60); ctx.lineTo(-46, 60); ctx.lineTo(-46, -6);
      ctx.lineTo(-62, 8); ctx.lineTo(-84, -14); ctx.lineTo(-50, -50); ctx.closePath();
    };
    body(); ctx.fillStyle = rgbS(col); ctx.fill();
    ctx.save(); body(); ctx.clip();
    const g = ctx.createLinearGradient(-60, -60, 60, 60);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.22 * lv) + ')'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.32)');
    ctx.fillStyle = g; ctx.fillRect(-100, -70, 200, 140);
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, 8); ctx.quadraticCurveTo(-8, 26, -22, 52); ctx.moveTo(18, 14); ctx.quadraticCurveTo(26, 30, 14, 54); ctx.stroke();
    ctx.restore();
    // 목둘레
    ctx.strokeStyle = rgbS(mulC(col, 0.7)); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-24, -58); ctx.quadraticCurveTo(0, -36, 24, -58); ctx.stroke();
    ctx.restore();
  }
  function drawLeaf(V, x, y, s, refl, light) {
    const { ctx } = V;
    const col = surf(refl, light), lv = clamp((light[0] + light[1] + light[2]) / 3, 0, 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.12);
    ctx.strokeStyle = rgbS(surf([0.2, 0.35, 0.1], light)); ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 70); ctx.quadraticCurveTo(4, 56, 0, 44); ctx.stroke();
    const body = () => {
      ctx.beginPath(); ctx.moveTo(0, 46);
      ctx.bezierCurveTo(-78, 26, -70, -52, 0, -74);
      ctx.bezierCurveTo(70, -52, 78, 26, 0, 46); ctx.closePath();
    };
    body(); ctx.fillStyle = rgbS(col); ctx.fill();
    ctx.save(); body(); ctx.clip();
    const g = ctx.createLinearGradient(-60, -60, 60, 60);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.28 * lv) + ')'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.34)');
    ctx.fillStyle = g; ctx.fillRect(-90, -90, 180, 150);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(0, -66); ctx.stroke();
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const yy = 30 - i * 24;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.quadraticCurveTo(-22, yy - 8, -(46 - i * 8), yy - 22); ctx.moveTo(0, yy); ctx.quadraticCurveTo(22, yy - 8, 46 - i * 8, yy - 22); ctx.stroke();
    }
    ctx.restore();
  }
  function stageObjs(G) { return G.objs.map((o) => Object.assign({}, o, STAGE_OBJ[o.kind])); }

  function updateStage(dt) {
    const tg = GELS[S.gel];
    for (let i = 0; i < 3; i++) S.gelV[i] = approach(S.gelV[i], tg[i], dt, 6);
    if (S.scene === 'stage' && S.seen[S.gel] != null) S.seen[S.gel] += dt;
    // 예측 퀴즈에 맞히면 조명이 빨강으로 바뀌며 결과를 보여 줘요
    if (S.revealRed && game && game.phase === 'success' && gameFlat() === 5) { S.revealRed = false; setGel('red'); }
  }
  function drawStage(V, t, dt) {
    const { ctx, D, L } = V;
    const G = GEO.stage(L), fs = L.fs;
    cached(V, 'stage', stageCache);
    const gv = S.gelV, tint = gelTint(gv);
    const gmax = Math.max(gv[0], gv[1], gv[2]);
    const lamp = G.lamp;
    // 무대 조명이 만드는 빛 원뿔과 바닥의 빛 웅덩이
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const m0 = { x: lamp.x, y: lamp.y + 30 };
    const wideHalf = L.key === 'wide' ? 360 : 250;
    beam(V, m0.x, m0.y, lamp.x, G.floorY + 90, 22, wideHalf, tint, 0.32 * gmax, 0.10 * gmax);
    beam(V, m0.x, m0.y, lamp.x, G.floorY + 90, 30, wideHalf * 1.1, tint, 0.10 * gmax, 0.03 * gmax);
    ctx.save(); ctx.translate(lamp.x, G.floorY + 70); ctx.scale(1, 0.15);
    const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, wideHalf * 0.95);
    pg.addColorStop(0, rgbS(mulC(tint, 1), 0.55 * gmax)); pg.addColorStop(0.7, rgbS(tint, 0.3 * gmax)); pg.addColorStop(1, rgbS(tint, 0));
    ctx.fillStyle = pg; circle(ctx, 0, 0, wideHalf * 0.95); ctx.fill();
    ctx.restore();
    ctx.restore();

    const objs = stageObjs(G);
    const lbl = 13 * Math.min(1.2, fs);
    // 설명 (○ ●)
    const tallL = L.key === 'tall';
    txt(ctx, '● 반사 중   ○ 닿는 빛 없음   · 흡수', tallL ? L.vw / 2 : 14, tallL ? G.chipY + 34 : 24, { size: lbl, align: tallL ? 'center' : 'left', color: '#9fb0d6' });

    objs.forEach((o, idx) => {
      const sc = G.ow;
      // 받침대 + 물체
      drawPedestal(V, o.x, G.pedTop, 124 * sc, G.pedH, gv);
      const oy = G.objY;
      if (o.kind === 'shirt') drawShirt(V, o.x, oy, 1.0 * sc * 1.05, o.refl, gv);
      else if (o.kind === 'leaf') drawLeaf(V, o.x, oy - 4, 1.0 * sc * 1.05, o.refl, gv);
      else drawBanana(V, o.x + 2, oy + 24 * sc, 60 * sc, o.refl, gv, 1);
      // 반사광의 파문 (물체가 반사한 빛의 색)
      let rc = [0, 0, 0], rk = 0;
      for (let i = 0; i < 3; i++) { const w = (o.pat[i] > 0.5 ? 1 : 0) * gv[i]; rc = [rc[0] + VIVID[i][0] * w, rc[1] + VIVID[i][1] * w, rc[2] + VIVID[i][2] * w]; rk = Math.max(rk, w); }
      rc = rc.map((v) => clamp(v, 0, 255));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (rk > 0.03) {
        for (let j = 0; j < 2; j++) {
          const u = (t * 0.55 + idx * 0.27 + j * 0.5) % 1, rr = (30 + u * 92) * sc;
          ctx.strokeStyle = rgbS(rc, 0.5 * (1 - u) * rk); ctx.lineWidth = 3.2 * sc;
          ctx.beginPath(); ctx.arc(o.x, oy + 8 * sc, rr, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
        }
      }
      ctx.restore();
      // 들어오는 빛 알갱이
      const tgt = { x: o.x, y: oy - 52 * sc };
      pulseTrain(V, [{ a: m0, b: tgt, col: tint, k: 0.95 * gmax }], t, { gap: 74, speed: 250, r: 3.2 * Math.max(0.8, sc), alpha: 0.9 });
      const sp = 250, gap = 74, len = Math.hypot(tgt.x - m0.x, tgt.y - m0.y);
      const cross = Math.floor((t * sp - len) / gap) - Math.floor(((t - dt) * sp - len) / gap);
      if (cross > 0 && !REDUCE) {
        for (let i = 0; i < 3; i++) {
          if (gv[i] > 0.5 && o.pat[i] < 0.5) for (let n = 0; n < 3; n++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
            V.fx.emit({ x: tgt.x + (Math.random() - 0.5) * 30, y: tgt.y + 4, vx: Math.cos(a) * 36, vy: Math.sin(a) * 36, life: 0.45, size: 2.3, color: rgbS(VIVID[i]), drag: 3, gravity: 0 });
          }
        }
      }
      // 이름표와 반사 표시
      D.label(o.x, G.tagY, o.name, { bg: '#0d1530', color: '#e8eefc', size: 14 * Math.min(1.2, fs), border: 'rgba(160,190,255,.4)' });
      for (let i = 0; i < 3; i++) {
        const cx = o.x + (i - 1) * 30 * Math.min(1.1, sc * 1.1 + 0.1), cy = G.chipY, rr = 9.5 * Math.min(1.2, fs);
        const can = o.pat[i] > 0.5, lit = can && gv[i] > 0.5;
        ctx.save();
        if (lit) {
          ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, cx, cy, rr * 2.4, VIVID[i], 0.55); ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = rgbS(VIVID[i]); circle(ctx, cx, cy, rr); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
        } else if (can) {
          ctx.strokeStyle = rgbS(VIVID[i], 0.9); ctx.lineWidth = 2.4; circle(ctx, cx, cy, rr); ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(160,180,220,.35)'; circle(ctx, cx, cy, 3.4); ctx.fill();
        }
        ctx.restore();
      }
    });
    // 조명 (맨 위)
    const lm = spotLamp(V, lamp.x, lamp.y, Math.PI / 2, { k: Math.max(gmax, 0.15), tint, s: 1.15 });
    D.label(lamp.x + 76, lamp.y - 2, '무대 조명: ' + GEL_NAME[S.gel], { bg: '#0d1530', color: '#e8eefc', size: 13.5 * Math.min(1.2, fs), border: 'rgba(160,190,255,.45)' });
    if (isNew('gel')) newRing(V, { x: lamp.x - 50, y: lamp.y - 44, w: 100, h: 88 }, t);
  }

  /* =========================================================
     ④ 화면의 색: 모니터 그림 → 화소 → 빨강·초록·파랑 부분 화소
     ========================================================= */
  const RW = 64, RH = 40;                                   // 그림의 화소 수 (가로×세로)
  const TARGETS = [
    { name: '주황', rgb: [100, 55, 0], what: '해' },
    { name: '하늘색', rgb: [55, 80, 90], what: '하늘' },
    { name: '연두', rgb: [60, 85, 15], what: '풀밭' },
  ];
  const SLOT_FOCUS = [{ x: 44.5, y: 9.5 }, { x: 30.5, y: 4.5 }, { x: 40.5, y: 33.5 }];
  const PIC_FOCUS = { x: 22.5, y: 9.5 };                    // 구름 가장자리: 흰색과 하늘색 화소가 함께 보임
  // 화소 종류: 0 하늘 1 해 2 풀밭 3 구름 4 벽 5 지붕 6 문 7 길 8 나무줄기 9 나뭇잎 10 창문
  const RTYPE = new Uint8Array(RW * RH);
  const FIXED = { 3: [255, 255, 255], 4: [226, 190, 140], 5: [204, 74, 62], 6: [112, 74, 52], 7: [216, 192, 152], 8: [122, 86, 58], 9: [40, 122, 52], 10: [255, 232, 140] };
  const RAST = document.createElement('canvas'); RAST.width = RW; RAST.height = RH;
  const RCTX = RAST.getContext('2d');
  const RIMG = RCTX.createImageData(RW, RH);
  const PX = RIMG.data;
  (function buildRaster() {
    const inC = (x, y, cx, cy, r) => (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = y < 27 ? 0 : 2;
      if (inC(px, py, 44.5, 9.5, 7)) t = 1;
      if (inC(px, py, 12, 9, 3.6) || inC(px, py, 15.6, 7.6, 4.6) || inC(px, py, 19.2, 9, 3.6) || (px > 12 && px < 19.5 && py > 8 && py < 12)) t = 3;
      if (inC(px, py, 30, 16, 2.7) || inC(px, py, 33, 14.7, 3.5) || inC(px, py, 36.2, 16, 2.7) || (px > 30 && px < 36 && py > 15 && py < 18.5)) t = 3;
      // 길
      if (py >= 31 && px > 14 - (py - 31) * 0.5 && px < 18 + (py - 31) * 1.1) t = 7;
      // 집
      if (px >= 10 && px < 22 && py >= 21 && py < 31) t = 4;
      if (py >= 14.5 && py < 21 && px >= 8 + (21 - py) * 0.0 && px < 24 && Math.abs(px - 16) <= (py - 14.5) * 1.25 + 0.5) t = 5;
      if (px >= 14 && px < 17 && py >= 25.5 && py < 31) t = 6;
      if ((px >= 11 && px < 13.5 && py >= 23.5 && py < 26) || (px >= 18.5 && px < 21 && py >= 23.5 && py < 26)) t = 10;
      // 나무
      if (px >= 55 && px < 57 && py >= 22 && py < 30) t = 8;
      if (inC(px, py, 56, 20.5, 5.4)) t = 9;
      RTYPE[y * RW + x] = t;
    }
  })();
  const pct2rgb = (p) => [p[0] * 2.55, p[1] * 2.55, p[2] * 2.55];
  function slotRGB(i, x, y) {
    if (S.slotDone[i]) return pct2rgb(TARGETS[i].rgb);
    if (S.slot === i && S.slotLive) return pct2rgb(S.pixV.map((v) => v * 100));
    return ((x >> 1) + (y >> 1)) & 1 ? [74, 82, 104] : [58, 64, 84];
  }
  function paintRaster() {
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      const t = RTYPE[y * RW + x];
      const c = t === 0 ? slotRGB(1, x, y) : t === 1 ? slotRGB(0, x, y) : t === 2 ? slotRGB(2, x, y) : FIXED[t];
      const k = (y * RW + x) * 4;
      PX[k] = c[0]; PX[k + 1] = c[1]; PX[k + 2] = c[2]; PX[k + 3] = 255;
    }
    RCTX.putImageData(RIMG, 0, 0);
  }
  const cellRGB = (i, j) => {
    i = clamp(Math.floor(i), 0, RW - 1); j = clamp(Math.floor(j), 0, RH - 1);
    const k = (j * RW + i) * 4; return [PX[k], PX[k + 1], PX[k + 2]];
  };
  const cellSizeOf = (z) => 10 + 108 * Math.pow(clamp(z, 0, 1), 1.8);
  const ZOOM_Z = [0, 0.4, 1];

  function screenCache(g, L) {
    g.fillStyle = '#0e1530'; g.fillRect(0, 0, L.vw, L.vh);
    const gr = g.createLinearGradient(0, 0, 0, L.vh);
    gr.addColorStop(0, '#0f1736'); gr.addColorStop(1, '#192448');
    g.fillStyle = gr; g.fillRect(0, 0, L.vw, L.vh);
    const G = GEO.screen(L), m = G.mon;
    // 모니터 받침
    const cx = m.x + m.w / 2, by = m.y + m.h;
    g.fillStyle = '#2a3558'; g.beginPath(); g.moveTo(cx - 24, by - 2); g.lineTo(cx + 24, by - 2); g.lineTo(cx + 34, by + 34); g.lineTo(cx - 34, by + 34); g.closePath(); g.fill();
    const bg = g.createLinearGradient(0, by + 30, 0, by + 44);
    bg.addColorStop(0, '#46547f'); bg.addColorStop(1, '#2a3558');
    g.fillStyle = bg;
    g.beginPath(); g.ellipse(cx, by + 38, 92, 11, 0, 0, TAU); g.fill();
    // 모니터 틀
    const Dg = SciSim.draw(g);
    Dg.shadow(() => { g.fillStyle = '#1b2442'; Dg.roundRect(m.x, m.y, m.w, m.h, 16); g.fill(); }, { blur: 18, y: 6, color: 'rgba(0,0,0,.55)' });
    const fg = g.createLinearGradient(m.x, m.y, m.x + m.w, m.y + m.h);
    fg.addColorStop(0, '#46547f'); fg.addColorStop(0.5, '#2a3558'); fg.addColorStop(1, '#1d2644');
    g.fillStyle = fg; Dg.roundRect(m.x, m.y, m.w, m.h, 16); g.fill();
    g.fillStyle = '#05080f'; Dg.roundRect(m.x + 10, m.y + 10, m.w - 20, m.h - 20, 8); g.fill();
  }
  function monScreenRect(m) { return { x: m.x + 14, y: m.y + 14, w: m.w - 28, h: (m.w - 28) / 1.6 }; }

  function updateScreen(dt) {
    for (let i = 0; i < 3; i++) S.pixV[i] = approach(S.pixV[i], S.pix[i] / 100, dt, 9);
    S.zoom = approach(S.zoom, ZOOM_Z[S.zoomMode], dt, 4.2);
    if (Math.abs(S.zoom - ZOOM_Z[S.zoomMode]) < 0.002) S.zoom = ZOOM_Z[S.zoomMode];
    const fT = S.focusT || PIC_FOCUS;
    S.focus.x = approach(S.focus.x, fT.x, dt, 5); S.focus.y = approach(S.focus.y, fT.y, dt, 5);
    if (S.scene === 'screen' && S.zoomMode === 2 && S.zoom > 0.95) S.zoomObs += dt;
    // 목표색 만들기 게임: 목표에 가까운 색을 0.8초 유지하면 그 칸이 채워져요
    if (S.scene === 'screen' && S.gameOn && S.slot < 3 && !S.slotDone[S.slot]) {
      const tg = TARGETS[S.slot].rgb, diff = Math.max(Math.abs(S.pix[0] - tg[0]), Math.abs(S.pix[1] - tg[1]), Math.abs(S.pix[2] - tg[2]));
      if (diff <= 12) S.slotHold += dt; else S.slotHold = 0;
      if (S.slotHold >= 0.8) {
        S.slotDone[S.slot] = true; S.slotHold = 0; S.slotPop[S.slot].k = 0; S.slotPop[S.slot].fx = true;
        SciSim.tween(S.slotPop[S.slot], { k: 1 }, { duration: 0.7, ease: 'outBack' });
        Sound.tone(660, 0.12, 'triangle', 0.09); Sound.tone(880, 0.16, 'triangle', 0.09, 0.08);
        if (S.slot < 2) { S.slot++; S.pix = [0, 0, 0]; setSliders(S.pix); S.focusT = SLOT_FOCUS[S.slot]; }
        else { S.focusT = SLOT_FOCUS[2]; }
        syncUI();
      }
    } else S.slotHold = 0;
  }
  function closeness() {
    if (S.slot > 2) return 1;
    const tg = TARGETS[Math.min(2, S.slot)].rgb;
    const diff = Math.max(Math.abs(S.pix[0] - tg[0]), Math.abs(S.pix[1] - tg[1]), Math.abs(S.pix[2] - tg[2]));
    return clamp(1 - diff / 60, 0, 1);
  }
  // 모니터 위 칠할 곳 표시
  function slotShape(V, sr, i) {
    const sx = (x) => sr.x + x / RW * sr.w, sy = (y) => sr.y + y / RH * sr.h;
    if (i === 0) return { kind: 'circle', x: sx(44.5), y: sy(9.5), r: 7.8 / RW * sr.w };
    if (i === 1) return { kind: 'rect', x: sx(1), y: sy(1), w: sr.w - 2 * sr.w / RW, h: sy(26) - sy(1) };
    return { kind: 'rect', x: sx(1), y: sy(27.6), w: sr.w - 2 * sr.w / RW, h: sy(39) - sy(27.6) };
  }

  function drawLens(V, G, t, alpha) {
    const { ctx, D, L } = V;
    const Lc = G.lens, r = Lc.r, fs = L.fs;
    const s = cellSizeOf(S.zoom), fx = S.focus.x, fy = S.focus.y;
    const sub = smooth(32, 64, s), grid = smooth(11, 24, s);
    ctx.save();
    ctx.globalAlpha *= alpha;
    // 확대경 테두리
    softShadow(V, () => circle(ctx, Lc.x, Lc.y, r + 10), { a: 0.8, y: 6, spread: 12 });
    const rg = ctx.createLinearGradient(Lc.x - r, Lc.y - r, Lc.x + r, Lc.y + r);
    rg.addColorStop(0, '#f2f6fc'); rg.addColorStop(0.45, '#a3b0c4'); rg.addColorStop(1, '#58667f');
    ctx.fillStyle = rg; circle(ctx, Lc.x, Lc.y, r + 10); ctx.fill();
    ctx.save(); circle(ctx, Lc.x, Lc.y, r); ctx.clip();
    ctx.fillStyle = '#05080f'; ctx.fillRect(Lc.x - r, Lc.y - r, r * 2, r * 2);
    // 화소 색 (그림을 s배로 키워서 그려요)
    ctx.imageSmoothingEnabled = false;
    {
      const ax = Math.max(0, fx - r / s), ay = Math.max(0, fy - r / s), bx = Math.min(RW, fx + r / s), by = Math.min(RH, fy + r / s);
      if (bx > ax && by > ay) ctx.drawImage(RAST, ax, ay, bx - ax, by - ay, Lc.x + (ax - fx) * s, Lc.y + (ay - fy) * s, (bx - ax) * s, (by - ay) * s);
    }
    ctx.imageSmoothingEnabled = true;
    const i0 = Math.floor(fx - r / s) - 1, i1 = Math.ceil(fx + r / s) + 1, j0 = Math.floor(fy - r / s) - 1, j1 = Math.ceil(fy + r / s) + 1;
    // 화소 사이의 검은 틈
    if (grid > 0.02) {
      ctx.strokeStyle = 'rgba(4,8,18,' + (0.55 * grid) + ')'; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) { if (i < 0 || i > RW) continue; const x = Lc.x + (i - fx) * s; ctx.moveTo(x, Lc.y - r); ctx.lineTo(x, Lc.y + r); }
      for (let j = j0; j <= j1; j++) { if (j < 0 || j > RH) continue; const y = Lc.y + (j - fy) * s; ctx.moveTo(Lc.x - r, y); ctx.lineTo(Lc.x + r, y); }
      ctx.stroke();
    }
    // 부분 화소: 화소 하나가 빨강·초록·파랑 세 부분으로 나뉘어 있어요
    if (sub > 0.01) {
      const m = s * 0.07, gap = s * 0.035, bw = (s - 2 * m - 2 * gap) / 3;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (i < 0 || j < 0 || i >= RW || j >= RH) continue;
        const x = Lc.x + (i - fx) * s, y = Lc.y + (j - fy) * s;
        if (x > Lc.x + r || x + s < Lc.x - r || y > Lc.y + r || y + s < Lc.y - r) continue;
        const c = cellRGB(i, j);
        ctx.fillStyle = 'rgba(5,8,16,' + sub + ')'; ctx.fillRect(x, y, s, s);
        for (let ch = 0; ch < 3; ch++) {
          const v = c[ch] / 255, sx = x + m + ch * (bw + gap), col = PURE[ch];
          // 꺼진 부분 화소는 어두운 유리처럼
          ctx.fillStyle = rgbS(mulC(col, 0.07), sub); ctx.fillRect(sx, y + m, bw, s - 2 * m);
          if (v < 0.01) continue;
          const g = ctx.createLinearGradient(sx, 0, sx + bw, 0);
          const lift = [Math.min(255, col[0] + 70), Math.min(255, col[1] + 70), Math.min(255, col[2] + 70)];
          g.addColorStop(0, rgbS(mulC(col, 0.7 * v), sub)); g.addColorStop(0.5, rgbS([col[0] * v + 70 * v * v, col[1] * v + 70 * v * v, col[2] * v + 70 * v * v], sub)); g.addColorStop(1, rgbS(mulC(col, 0.7 * v), sub));
          ctx.fillStyle = g; ctx.fillRect(sx, y + m, bw, s - 2 * m);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          if (v > 0.12) drawGlow(ctx, sx + bw / 2, y + s / 2, s * 0.6, VIVID[ch], 0.42 * v * sub);
          ctx.restore();
        }
      }
    }
    ctx.restore();
    // 안쪽 유리 반짝임
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(Lc.x, Lc.y, r - 7, Math.PI * 1.08, Math.PI * 1.36); ctx.stroke();
    // 이름표: 화소 1개 = 부분 화소 3개
    if (sub > 0.55) {
      const ci = Math.floor(fx), cj = Math.floor(fy);
      const x = Lc.x + (ci - fx) * s, y = Lc.y + (cj - fy) * s;
      const m = s * 0.07, gap = s * 0.035, bw = (s - 2 * m - 2 * gap) / 3;
      const a = (sub - 0.55) / 0.45, fz = 13.5 * Math.min(1.18, fs);
      ctx.save(); ctx.globalAlpha *= a;
      ['빨강', '초록', '파랑'].forEach((nm, ch) => {
        const cx = x + m + ch * (bw + gap) + bw / 2;
        txt(ctx, nm, cx, Lc.y + Math.min(r - 22, s / 2 + 20), { size: fz, color: ['#ffb0b4', '#a6f5c0', '#bcd0ff'][ch], halo: 'rgba(5,8,16,.9)', haloW: 5 });
      });
      // 화소 하나를 둘러싼 테두리
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + 0.85 * a + ')'; ctx.lineWidth = 2.4; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 14;
      D.roundRect(x - 2, y - 2, s + 4, s + 4, 6); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      D.label(Lc.x, Lc.y - Math.min(r - 24, s / 2 + 18), '화소 1개 = 부분 화소 3개', { bg: '#0d1530', color: '#e8eefc', size: fz, border: 'rgba(160,190,255,.5)' });
      ctx.restore();
    } else if (grid > 0.5) {
      D.label(Lc.x, Lc.y - r + 22, '화소 하나하나가 모여 그림이 돼요', { bg: '#0d1530', color: '#e8eefc', size: 13 * Math.min(1.2, fs), border: 'rgba(160,190,255,.5)' });
    }
    ctx.restore();
  }

  function drawScreen(V, t, dt) {
    const { ctx, D, L } = V;
    const G = GEO.screen(L), fs = L.fs;
    cached(V, 'screen', screenCache);
    paintRaster();
    const m = G.mon, sr = monScreenRect(m);
    // 모니터 화면 (그림)
    ctx.save();
    D.roundRect(sr.x, sr.y, sr.w, sr.h, 6); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(RAST, sr.x, sr.y, sr.w, sr.h);
    // 화면의 은은한 빛번짐
    const sg = ctx.createLinearGradient(sr.x, sr.y, sr.x + sr.w, sr.y + sr.h);
    sg.addColorStop(0, 'rgba(255,255,255,.10)'); sg.addColorStop(0.35, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(0,0,0,.12)');
    ctx.fillStyle = sg; ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
    ctx.restore();
    // 칠할 곳 안내 + 완성 효과
    const act = S.gameOn && S.slot < 3 && !S.slotDone[S.slot];
    for (let i = 0; i < 3; i++) {
      const sh = slotShape(V, sr, i), c = sh.kind === 'circle' ? { x: sh.x, y: sh.y } : { x: sh.x + sh.w / 2, y: sh.y + sh.h / 2 };
      if (S.slotPop[i].fx) {
        S.slotPop[i].fx = false;
        if (!REDUCE) V.fx.burst(c.x, c.y, { count: 22, colors: [rgbS(pct2rgb(TARGETS[i].rgb)), '#ffffff', '#ffd24a'], speed: 190, gravity: 100, life: 0.85 });
      }
      if (act && S.slot === i) {
        ctx.save(); ctx.strokeStyle = 'rgba(255,224,110,' + (0.65 + 0.35 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 3; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 18;
        if (sh.kind === 'circle') { circle(ctx, sh.x, sh.y, sh.r + 5); ctx.stroke(); } else { D.roundRect(sh.x, sh.y, sh.w, sh.h, 8); ctx.stroke(); }
        ctx.setLineDash([]); ctx.restore();
        D.label(sh.kind === 'circle' ? sh.x : sh.x + sh.w / 2, (sh.kind === 'circle' ? sh.y - sh.r - 18 : sh.y + 18), '여기를 ' + TARGETS[i].name + '으로! (' + TARGETS[i].what + ')', { bg: '#f26b3a', size: 13 * Math.min(1.15, fs), color: '#fff' });
      }
    }
    // 확대 고리 + 확대경
    const z = S.zoom, la = smooth(0.0, 0.12, z);
    const lens = G.lens;
    if (la > 0.01) {
      const s = cellSizeOf(z);
      const fxm = sr.x + S.focus.x / RW * sr.w, fym = sr.y + S.focus.y / RH * sr.h;
      const rr = Math.max(9, lens.r / s * (sr.w / RW));
      ctx.save(); ctx.globalAlpha *= la;
      // 고리에서 확대경까지 점선 원뿔
      const dx = lens.x - fxm, dy = lens.y - fym, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      const R1 = rr, R2 = lens.r + 10;
      if (d > Math.abs(R2 - R1) + 4) {
        const ph = Math.acos((R1 - R2) / d);
        const P = (cx, cy, rad, ang) => ({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad });
        const a1 = P(fxm, fym, R1, th + ph), a2 = P(lens.x, lens.y, R2, th + ph), b1 = P(fxm, fym, R1, th - ph), b2 = P(lens.x, lens.y, R2, th - ph);
        ctx.fillStyle = 'rgba(150,180,255,.10)';
        ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b1.x, b1.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(190,210,255,.5)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.6; circle(ctx, fxm, fym, rr); ctx.stroke();
      ctx.strokeStyle = 'rgba(30,40,70,.5)'; ctx.lineWidth = 1; circle(ctx, fxm, fym, rr + 2); ctx.stroke();
      ctx.restore();
      drawLens(V, G, t, la);
    }

    // ---- 목표색과 내 색 ----
    const tg = S.slot < 3 ? TARGETS[S.slot] : TARGETS[2];
    const showGame = S.gameOn;
    if (showGame) {
      const T = G.tgt, M = G.mine, cl = closeness();
      const myc = S.pixV.map((v) => v * 255), tc = pct2rgb(tg.rgb);
      const sw = (c, x, y, rad, label, sub2) => {
        ctx.save();
        softShadow(V, () => circle(ctx, x, y, rad), { a: 0.6, y: 4, spread: 8 });
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, x, y, rad * 1.9, c, 0.28); ctx.restore();
        ctx.fillStyle = rgbS(c); circle(ctx, x, y, rad); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.stroke();
        const hg = ctx.createRadialGradient(x - rad * 0.35, y - rad * 0.4, 2, x, y, rad);
        hg.addColorStop(0, 'rgba(255,255,255,.35)'); hg.addColorStop(0.5, 'rgba(255,255,255,0)'); hg.addColorStop(1, 'rgba(0,0,0,.25)');
        ctx.fillStyle = hg; circle(ctx, x, y, rad); ctx.fill();
        ctx.restore();
        D.label(x, y + rad + 22, label, { bg: '#0d1530', color: '#e8eefc', size: 14 * Math.min(1.2, fs), border: 'rgba(160,190,255,.4)' });
      };
      sw(tc, T.x, T.y, T.r, '목표색: ' + tg.name);
      sw(myc, M.x, M.y, M.r, '내 색: ' + colorName(S.pixV));
      txt(ctx, cl >= 0.8 ? '≈' : '≠', (T.x + M.x) / 2, T.y, { size: 34 * Math.min(1.1, fs), color: cl >= 0.8 ? '#7be495' : '#9fb0d6' });
      // 가까운 정도
      const me = G.meter;
      D.label(me.x + me.w / 2, me.y - 16, '얼마나 비슷할까요?', { bg: '#0d1530', color: '#e8eefc', size: 13.5 * Math.min(1.2, fs), border: 'rgba(160,190,255,.4)' });
      ctx.fillStyle = 'rgba(255,255,255,.1)'; D.roundRect(me.x, me.y, me.w, me.h, me.h / 2); ctx.fill();
      ctx.save(); D.roundRect(me.x, me.y, me.w, me.h, me.h / 2); ctx.clip();
      const mg = ctx.createLinearGradient(me.x, 0, me.x + me.w, 0);
      mg.addColorStop(0, '#e2464b'); mg.addColorStop(0.55, '#f5b400'); mg.addColorStop(1, '#2ecc71');
      ctx.fillStyle = mg; ctx.fillRect(me.x, me.y, me.w * (S.meterV = approach(S.meterV || 0, cl, dt, 8)), me.h);
      ctx.restore();
      txt(ctx, Math.round(cl * 100) + '%', me.x + me.w - 10, me.y + me.h / 2, { size: 14 * Math.min(1.15, fs), align: 'right', color: '#fff', halo: 'rgba(0,0,0,.5)' });
      // 완성한 칸 표시
      TARGETS.forEach((tt, i) => {
        const bx = me.x + 18 + i * (me.w - 36) / 2, by = me.y + me.h + 36;
        ctx.save();
        const done = S.slotDone[i], pk = clamp(S.slotPop[i].k, 0, 1.3);
        ctx.translate(bx, by); const sc2 = done ? 0.7 + 0.3 * pk : 1; ctx.scale(sc2, sc2);
        ctx.fillStyle = done ? rgbS(pct2rgb(tt.rgb)) : 'rgba(255,255,255,.07)'; circle(ctx, 0, 0, 15); ctx.fill();
        ctx.strokeStyle = done ? 'rgba(255,255,255,.9)' : 'rgba(160,190,255,.5)'; ctx.lineWidth = 2; if (!done) ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        if (done) D.check(0, 0, 10, 1, { color: '#14a058' });
        ctx.restore();
        txt(ctx, tt.name, bx, by + 28, { size: 13 * Math.min(1.2, fs), color: done ? '#fff' : '#8fa3d0' });
      });
    } else {
      drawLadder(V, G, t);
    }
  }
  // 확대 단계 카드: 화면 → 화소 → 부분 화소 (눌러서 확대 정도를 바꿀 수 있어요)
  const LADDER_TXT = [['화면', '그림이 보여요', '그림'], ['화소', '작은 네모가 모여 그림이 돼요', '작은 네모'], ['부분 화소', '화소 1개 = 빨강·초록·파랑', '빨강·초록·파랑']];
  function ladderCards(G) {
    const R = G.ladder, gap = G.lens.r > 140 ? 12 : 22, cw = (R.w - gap * 2) / 3;
    return [0, 1, 2].map((i) => ({ x: R.x + i * (cw + gap), y: R.y, w: cw, h: R.h }));
  }
  function drawLadder(V, G, t) {
    const { ctx, D, L } = V;
    const fs = Math.min(1.2, L.fs), tall = L.key === 'tall';
    ladderCards(G).forEach((c, i) => {
      const act = S.zoomMode === i;
      ctx.save();
      softShadow(V, () => D.roundRect(c.x, c.y, c.w, c.h, 14), { a: 0.5, y: 4, spread: 8 });
      ctx.fillStyle = act ? 'rgba(40,52,100,.95)' : 'rgba(14,22,48,.85)'; D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.fill();
      ctx.strokeStyle = act ? '#f26b3a' : 'rgba(140,170,230,.28)'; ctx.lineWidth = act ? 3 : 1.4; D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.stroke();
      // 작은 그림
      const ih = tall ? 40 : 54, cx = c.x + c.w / 2, cy = c.y + 12 + ih / 2;
      if (i === 0) {
        ctx.fillStyle = '#2a3558'; D.roundRect(cx - ih * 0.75, cy - ih / 2, ih * 1.5, ih, 5); ctx.fill();
        const g = ctx.createLinearGradient(0, cy - ih / 2, 0, cy + ih / 2); g.addColorStop(0, '#7fc4ee'); g.addColorStop(0.7, '#cfe9f7'); g.addColorStop(0.7, '#8fcf4a'); g.addColorStop(1, '#6fb53a');
        ctx.fillStyle = g; D.roundRect(cx - ih * 0.68, cy - ih / 2 + 4, ih * 1.36, ih - 10, 3); ctx.fill();
        ctx.fillStyle = '#f59a1c'; circle(ctx, cx + ih * 0.3, cy - ih * 0.1, ih * 0.14); ctx.fill();
      } else if (i === 1) {
        const cols = ['#ffffff', '#8fc9e6', '#8fc9e6', '#8fc9e6', '#ffffff', '#ffffff', '#8fc9e6', '#8fc9e6', '#8fc9e6', '#8fc9e6', '#f59a1c', '#f59a1c', '#8fc9e6', '#8fc9e6', '#f59a1c', '#f59a1c'];
        const q = ih / 4;
        cols.forEach((cc, k) => { ctx.fillStyle = cc; ctx.fillRect(cx - ih / 2 + (k % 4) * q + 0.8, cy - ih / 2 + Math.floor(k / 4) * q + 0.8, q - 1.6, q - 1.6); });
      } else {
        ctx.fillStyle = '#05080f'; D.roundRect(cx - ih / 2, cy - ih / 2, ih, ih, 5); ctx.fill();
        const bw = ih / 3 - 3;
        PURE.forEach((col, ch) => {
          const bx = cx - ih / 2 + 3 + ch * (bw + 1.5);
          const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, rgbS(mulC(col, 0.75))); g.addColorStop(0.5, rgbS([Math.min(255, col[0] + 60), Math.min(255, col[1] + 60), Math.min(255, col[2] + 60)])); g.addColorStop(1, rgbS(mulC(col, 0.75)));
          ctx.fillStyle = g; ctx.fillRect(bx, cy - ih / 2 + 3, bw, ih - 6);
        });
      }
      txt(ctx, LADDER_TXT[i][0], cx, c.y + 12 + ih + (tall ? 18 : 22), { size: (tall ? 14.5 : 16) * fs, color: act ? '#ffd9c2' : '#e8eefc' });
      txt(ctx, LADDER_TXT[i][tall ? 2 : 1], cx, c.y + 12 + ih + (tall ? 38 : 44), { size: 13 * fs, color: '#aeb9e6' });
      ctx.restore();
      if (i < 2) { // 카드 사이 화살표
        const ax = c.x + c.w + (ladderCards(G)[i + 1].x - c.x - c.w) / 2, ay = c.y + c.h / 2;
        ctx.strokeStyle = 'rgba(190,210,255,.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(ax - 5, ay - 8); ctx.lineTo(ax + 4, ay); ctx.lineTo(ax - 5, ay + 8); ctx.stroke();
      }
    });
  }

  /* =========================================================
     화면 밖(DOM) 조작과 입력
     ========================================================= */
  const press = (el, v) => el.setAttribute('aria-pressed', v ? 'true' : 'false');
  function showHint(text, ms) {
    VIEWS.forEach((V) => { V.hint.textContent = text; V.hint.classList.remove('hide'); });
    clearTimeout(showHint.t);
    showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { VIEWS.forEach((V) => V.hint.classList.add('hide')); }

  // 빨강·초록·파랑 슬라이더 (② 조명 밝기 / ④ 부분 화소 밝기)
  const sliderEls = [$('#slR'), $('#slG'), $('#slB')];
  const sliderOuts = [$('#outR'), $('#outG'), $('#outB')];
  let lastTick = 0;
  const binders = sliderEls.map((el, i) => SciSim.bindRange(el, sliderOuts[i], (v) => v + '%', (v) => {
    const arr = S.scene === 'screen' ? S.pix : S.mix;
    arr[i] = v; hideHint();
    const now = performance.now(); if (now - lastTick > 90) { lastTick = now; Sound.tick(); }
  }));
  function setSliders(arr) { binders.forEach((b, i) => b.set(arr[i])); }

  function toggleLamp() { S.lampOn = !S.lampOn; Sound.click(); hideHint(); syncUI(); }
  function setObject(kind) {
    if (S.obj === kind) return;
    S.prevObj = S.obj; S.prevRefl = S.reflV.slice();
    S.obj = kind;
    S.reflV = (kind === 'apple' ? [1, 0, 0] : S.refl.slice());
    S.swap.k = 0;
    SciSim.tween(S.swap, { k: 1 }, { duration: 0.6, ease: 'outCubic' });
  }
  function setGel(name) {
    if (S.gel !== name) { S.gel = name; }
    syncUI();
  }
  function setZoomMode(m) {
    S.zoomMode = m; S.zoomObs = 0;
    if (S.scene === 'screen') Sound.click();
    syncUI();
  }
  // 자유 탐구에서 장면을 바꿀 때 필요한 준비
  function enterScene(name) {
    if (name === 'see') { setObject('banana'); S.lampOn = true; }
    if (name === 'mix') { S.mix = [100, 100, 0]; setSliders(S.mix); }
    if (name === 'stage') { S.gel = 'white'; }
    if (name === 'screen') { screenFree(); }
    setScene(name);
  }
  function screenFree() {
    S.slotDone = [false, true, true]; S.slot = 0; S.slotLive = true; S.gameOn = false;
    S.pix = TARGETS[0].rgb.slice(); setSliders(S.pix);
    S.focusT = SLOT_FOCUS[0]; if (S.zoomMode === 0) S.zoomMode = 1;
  }
  function setScene(name) {
    if (S.scene !== name) {
      S.scene = name; S.fade.k = 0;
      SciSim.tween(S.fade, { k: 1 }, { duration: 0.45, ease: 'outCubic' });
      hideHint();
    }
    document.body.dataset.scene = name;
    if (name === 'mix') setSliders(S.mix);
    if (name === 'screen') setSliders(S.pix);
    syncUI();
  }

  $('#tgLamp').addEventListener('click', toggleLamp);
  $$('#reflRow .refl-btn').forEach((b) => b.addEventListener('click', () => {
    const ch = +b.dataset.ch;
    S.refl[ch] = S.refl[ch] ? 0 : 1; Sound.tick(); hideHint(); syncUI();
  }));
  $$('#gelGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); hideHint(); setGel(b.dataset.gel); }));
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterScene(b.dataset.scene); }));
  $$('#zoomSeg button').forEach((b) => b.addEventListener('click', () => setZoomMode(+b.dataset.zoom)));

  const SCENE_LABEL = {
    see: () => (S.obj === 'banana' ? '🍌 반사하는 빛에 따라 달라지는 물체의 색' : '🍎 어두운 방에서 물체를 보는 과정'),
    mix: () => '🔦 세 가지 조명을 스크린에 겹쳐 비춰요',
    stage: () => '🎭 무대 조명의 색에 따라 달라지는 물체의 색',
    screen: () => (S.gameOn ? '🎮 부분 화소의 밝기로 목표색 만들기' : '🖥️ 화면의 그림을 확대해요'),
  };
  const paintable = () => S.scene === 'screen' && (S.gameOn || (game && game.free && S.slotLive));
  function syncUI() {
    const free = !!(game && game.free);
    document.body.classList.toggle('free-mode', free);
    $('#sceneSeg').classList.toggle('off', !free);
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    $('#zoomSeg').classList.toggle('off', !(S.scene === 'screen' && on('zoom') && !S.gameOn));
    $$('#zoomSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.zoom === S.zoomMode));
    // 장면에 따라 조작 도구 보이기
    const showFor = { see: S.scene === 'see', mix: S.scene === 'mix' || paintable(), stage: S.scene === 'stage' };
    $$('.only-see').forEach((n) => { n.style.display = showFor.see ? '' : 'none'; });
    $$('.only-mix').forEach((n) => { n.style.display = showFor.mix ? '' : 'none'; });
    $$('.only-stage').forEach((n) => { n.style.display = showFor.stage ? '' : 'none'; });
    $('#g-reflect').style.display = (showFor.see && (S.obj === 'banana' || free)) ? '' : 'none';
    $('#g-lamp').style.display = (showFor.see && (S.obj === 'apple' || free)) ? '' : 'none';   // 화면에는 한 번에 3개 이하의 조작만
    // ① 전등 / 반사하는 빛
    const lb = $('#tgLamp'); lb.textContent = S.lampOn ? '💡 전등 끄기' : '💡 전등 켜기'; press(lb, S.lampOn);
    $$('#reflRow .refl-btn').forEach((b) => {
      const ch = +b.dataset.ch, v = !!S.refl[ch];
      press(b, v); b.querySelector('small').textContent = v ? '반사' : '흡수';
    });
    // ②④ 슬라이더 이름
    const screen = S.scene === 'screen';
    $('#mixTitle').textContent = screen ? '🔬 부분 화소의 밝기' : '🔦 조명의 밝기';
    $('#lbR').textContent = screen ? '🔴 빨강 부분 화소' : '🔴 빨강 조명';
    $('#lbG').textContent = screen ? '🟢 초록 부분 화소' : '🟢 초록 조명';
    $('#lbB').textContent = screen ? '🔵 파랑 부분 화소' : '🔵 파랑 조명';
    // ③ 조명 색
    $$('#gelGrid .mode-btn').forEach((b) => b.classList.toggle('on', b.dataset.gel === S.gel));
    $('#ctrlCard').hidden = ![...$$('#ctrlCard .grp')].some((n) => !n.hidden && n.style.display !== 'none');
    $('#sceneLabel').textContent = SCENE_LABEL[S.scene]();
    lastUI = -1;
  }

  /* ----- 아래 측정값 ----- */
  let lastUI = -1;
  const sw = (c) => '<span class="sw" style="background:' + rgbS(c) + '"></span>';
  function setRead(i, label, html) {
    const l = $('#rL' + i), v = $('#rV' + i);
    if (l.textContent !== label) l.textContent = label;
    if (v.innerHTML !== html) v.innerHTML = html;
  }
  function updateReadouts(t) {
    if (t - lastUI < 0.12) return;
    lastUI = t;
    const box4 = $('#rBox4');
    box4.style.display = S.scene === 'stage' ? '' : 'none';
    if (S.scene === 'see') {
      const lk = S.lampK > 0.5, rf = S.reflV;
      const on_ = [0, 1, 2].filter((i) => rf[i] > 0.5).map((i) => CH_DOT[i]).join(' ') || '없음';
      const off_ = [0, 1, 2].filter((i) => rf[i] <= 0.5).map((i) => CH_DOT[i]).join(' ') || '없음';
      setRead(1, '반사하는 빛', lk ? on_ : '—');
      setRead(2, '흡수하는 빛', lk ? off_ : '—');
      const seen = surf(rf, [S.lampK, S.lampK, S.lampK]);
      setRead(3, '눈에 보이는 색', lk ? sw(seen) + colorName(seen.map((v) => v / 255)) : '어두워서 안 보여요');
    } else if (S.scene === 'mix') {
      const m = S.mixV, c = m.map((v) => v * 255);
      setRead(1, '가운데에 보이는 색', sw(c) + colorName(m));
      const lamps = [0, 1, 2].filter((i) => S.mix[i] > 0).map((i) => CH_DOT[i]).join(' ') || '모두 꺼짐';
      setRead(2, '켜진 조명', lamps);
      setRead(3, '찾은 색', Object.keys(S.found).filter((k) => S.found[k]).length + ' / 4<small>가지</small>');
    } else if (S.scene === 'stage') {
      const g = S.gelV;
      setRead(1, '조명 색', sw(g.map((v) => v * 255)) + GEL_NAME[S.gel]);
      ['shirt', 'leaf', 'banana'].forEach((k, i) => {
        const o = STAGE_OBJ[k], c = surf(o.refl, g);
        setRead(i + 2, o.name, sw(c) + colorName(c.map((v) => v / 255)));
      });
    } else {
      if (S.gameOn || paintable()) {
        const tg = S.slot < 3 ? TARGETS[S.slot] : TARGETS[2];
        setRead(1, '목표색', S.gameOn ? sw(pct2rgb(tg.rgb)) + tg.name : '자유롭게 칠해요');
        setRead(2, '내 색', sw(S.pixV.map((v) => v * 255)) + colorName(S.pixV));
        setRead(3, '빨강·초록·파랑', S.pix[0] + ' · ' + S.pix[1] + ' · ' + S.pix[2] + '<small>%</small>');
      } else {
        setRead(1, '확대 정도', ['화면 전체', '화소', '부분 화소'][S.zoomMode]);
        setRead(2, '화소 하나는', '3개의 부분 화소');
        setRead(3, '화면의 화소', '수백만 개');
      }
    }
  }

  /* ----- 화면 위 입력: 전등 끌기/누르기, 화면 눌러 확대할 곳 고르기 ----- */
  function lampPos(V) { const G = GEO.see(V.L); return seeLamp(G); }
  const hitLamp = (V, p) => S.scene === 'see' && on('lamp') && Math.hypot(p.x - lampPos(V).x, p.y - lampPos(V).y) < 50;
  function hitMonitor(V, p) {
    if (S.scene !== 'screen' || !on('zoom') || S.gameOn) return false;
    const sr = monScreenRect(GEO.screen(V.L).mon);
    return p.x >= sr.x && p.x <= sr.x + sr.w && p.y >= sr.y && p.y <= sr.y + sr.h;
  }
  function focusFromPoint(V, p) {
    const sr = monScreenRect(GEO.screen(V.L).mon);
    S.focusT = { x: clamp(Math.floor((p.x - sr.x) / sr.w * RW), 2, RW - 3) + 0.5, y: clamp(Math.floor((p.y - sr.y) / sr.h * RH), 2, RH - 3) + 0.5 };
  }
  VIEWS.forEach((V) => {
    SciSim.pointer(V.v, {
      hover: (p) => (hitLamp(V, p) ? 'grab' : hitMonitor(V, p) ? 'zoom-in' : null),
      down(p) {
        if (S.scene === 'screen' && !S.gameOn && on('zoom')) {
          const cards = ladderCards(GEO.screen(V.L));
          const hit = cards.findIndex((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);
          if (hit >= 0) { setZoomMode(hit); return false; }
        }
        if (hitLamp(V, p)) { S.lampDrag = true; S.lampDown = { x: p.x, y: p.y, moved: false }; hideHint(); V.v.canvas.style.cursor = 'grabbing'; return true; }
        if (hitMonitor(V, p)) {
          S.pickDown = true; hideHint(); focusFromPoint(V, p);
          if (S.zoomMode === 0) setZoomMode(1);
          return true;
        }
        return false;
      },
      move(p) {
        if (S.lampDrag) {
          const G = GEO.see(V.L), b = G.lampB;
          if (Math.hypot(p.x - S.lampDown.x, p.y - S.lampDown.y) > 8) S.lampDown.moved = true;
          S.lampU = clamp((p.x - b.x) / b.w, 0, 1); S.lampV = clamp((p.y - b.y) / b.h, 0, 1);
        } else if (S.pickDown) focusFromPoint(V, p);
      },
      up() {
        V.v.canvas.style.cursor = '';
        if (S.lampDrag) { S.lampDrag = false; if (!S.lampDown.moved) toggleLamp(); }
        S.pickDown = false;
      },
    });
    if (V.key === 'tall') {
      // 휴대폰: 전등이나 모니터를 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
      V.v.canvas.style.touchAction = 'pan-y';
      V.v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc) { const p = V.v.toLocal(tc); if (hitLamp(V, p) || hitMonitor(V, p)) e.preventDefault(); }
      }, { passive: false });
    }
  });

  /* =========================================================
     미션
     ========================================================= */
  // 빛 화살표가 들어 있는 그림(문제 보기용 SVG)
  function arr(x1, y1, x2, y2, col, w) {
    w = w || 3;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hs = 10;
    const bx = x2 - ux * hs, by = y2 - uy * hs;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + bx.toFixed(1) + '" y2="' + by.toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<polygon points="' + x2 + ',' + y2 + ' ' + (bx - uy * 5.5).toFixed(1) + ',' + (by + ux * 5.5).toFixed(1) + ' ' + (bx + uy * 5.5).toFixed(1) + ',' + (by - ux * 5.5).toFixed(1) + '" fill="' + col + '"/>';
  }
  const SC = ['#ff4650', '#3ee07a', '#6a9bff'];
  const SVG_PAPER = (() => {
    let s = '<svg viewBox="0 0 340 168" width="100%" style="max-width:340px" role="img" aria-label="흰 종이는 빨강·초록·파랑 빛을 모두 반사하고, 검은 종이는 세 빛을 모두 흡수하는 그림" font-family="sans-serif">' +
      '<rect x="1" y="1" width="338" height="166" rx="12" fill="#0d1530"/>' +
      '<rect x="22" y="112" width="130" height="14" rx="3" fill="#f4f6fb"/><rect x="188" y="112" width="130" height="14" rx="3" fill="#222833" stroke="#5b6b8a" stroke-width="1.5"/>';
    [0, 1, 2].forEach((i) => {
      const x = 64 + i * 24, x2 = 230 + i * 24;
      s += arr(x - 40, 60, x, 111, SC[i], 3);
      s += arr(x, 111, x + [-14, 2, 22][i], 56, SC[i], 3);
      s += arr(x2 - 40, 60, x2, 111, SC[i], 3);
      s += '<circle cx="' + x2 + '" cy="114" r="5" fill="none" stroke="' + SC[i] + '" stroke-width="2" opacity=".8"/>';
    });
    s += '<text x="87" y="150" font-size="14" font-weight="700" fill="#e8eefc" text-anchor="middle">흰 종이</text>' +
      '<text x="253" y="150" font-size="14" font-weight="700" fill="#e8eefc" text-anchor="middle">검은 종이</text>' +
      '<text x="87" y="26" font-size="12.5" font-weight="700" fill="#aeb9e6" text-anchor="middle">세 빛이 모두 나와요</text>' +
      '<text x="253" y="26" font-size="12.5" font-weight="700" fill="#aeb9e6" text-anchor="middle">나오는 빛이 없어요</text></svg>';
    return s;
  })();
  const SVG_STAGE = '<svg viewBox="0 0 340 176" width="100%" style="max-width:340px" role="img" aria-label="파란 조명이 빨간 옷을 입은 배우를 비추는 무대" font-family="sans-serif">' +
    '<rect x="1" y="1" width="338" height="174" rx="12" fill="#0d1530"/>' +
    '<polygon points="160,30 180,30 262,160 78,160" fill="#6a9bff" opacity=".28"/>' +
    '<rect x="150" y="14" width="40" height="18" rx="5" fill="#9aa8bd"/><ellipse cx="170" cy="32" rx="14" ry="4" fill="#9ec0ff"/>' +
    '<circle cx="170" cy="84" r="13" fill="#f2c9a5"/>' +
    '<polygon points="154,98 186,98 206,156 134,156" fill="#e2464b"/>' +
    '<rect x="150" y="156" width="40" height="6" rx="3" fill="#3a2a22"/>' +
    '<text x="24" y="50" font-size="14" font-weight="700" fill="#9ec0ff">파란 조명</text>' +
    '<text x="232" y="132" font-size="14" font-weight="700" fill="#ff8a8e">빨간 옷</text>' +
    '<text x="170" y="176" font-size="1" fill="#0d1530">.</text></svg>';
  const SVG_PIXEL = '<svg viewBox="0 0 340 170" width="100%" style="max-width:340px" role="img" aria-label="화소 하나는 빨강, 초록, 파랑 세 부분 화소로 이루어져 있다" font-family="sans-serif">' +
    '<rect x="1" y="1" width="338" height="168" rx="12" fill="#0d1530"/>' +
    '<rect x="30" y="34" width="130" height="104" rx="6" fill="#05080f" stroke="#5b6b8a" stroke-width="1.5"/>' +
    '<rect x="38" y="42" width="34" height="88" rx="3" fill="#ff4650"/><rect x="78" y="42" width="34" height="88" rx="3" fill="#3ee07a"/><rect x="118" y="42" width="34" height="88" rx="3" fill="#6a9bff"/>' +
    '<text x="55" y="152" font-size="12.5" font-weight="700" fill="#ff9aa0" text-anchor="middle">빨강</text><text x="95" y="152" font-size="12.5" font-weight="700" fill="#8ff0b0" text-anchor="middle">초록</text><text x="135" y="152" font-size="12.5" font-weight="700" fill="#a9c3ff" text-anchor="middle">파랑</text>' +
    '<text x="95" y="24" font-size="13.5" font-weight="700" fill="#e8eefc" text-anchor="middle">화소 1개</text>' +
    '<path d="M180 86 h38" stroke="#aeb9e6" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/><path d="M214 79 l10 7 l-10 7" fill="none" stroke="#aeb9e6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="238" y="50" width="76" height="76" rx="12" fill="#ffe92e" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>' +
    '<text x="276" y="94" font-size="30" font-weight="800" fill="#7a6a00" text-anchor="middle">?</text>' +
    '<text x="276" y="146" font-size="13" font-weight="700" fill="#e8eefc" text-anchor="middle">노랗게 보이는 화소</text></svg>';

  const dotsOf = (v) => [0, 1, 2].filter((i) => v[i] > 0.5).map((i) => CH_DOT[i]).join(' ') || '없음';
  const SEEN_NEED = 1.5;
  const SLOT_HINT = [
    '주황은 <b>빨강을 가장 밝게</b>, <b>초록은 절반쯤</b> 켜고 파랑은 끈 색이에요. (빨강 100%, 초록 55%, 파랑 0%)',
    '하늘색은 파랑이 가장 밝고, 초록도 꽤 밝고, 빨강은 절반쯤인 색이에요. (빨강 55%, 초록 80%, 파랑 90%)',
    '연두는 초록이 가장 밝고, 빨강이 그 다음이고, 파랑은 조금만 켠 색이에요. (빨강 60%, 초록 85%, 파랑 15%)',
  ];

  // 미션 번호(전체 순서)에 맞게 장면 준비
  function prepMission(i) {
    S.revealRed = false;
    const tour = () => { S.slotDone = [true, true, true]; S.slot = 0; S.slotLive = false; S.gameOn = false; S.focusT = PIC_FOCUS; S.focus = S.focus || { x: PIC_FOCUS.x, y: PIC_FOCUS.y }; S.zoomObs = 0; };
    if (i === 0) {
      S.lampOn = false; S.obs = 0; S.lampU = 0.2; S.lampV = 0.5; setObject('apple'); setScene('see');
      showHint('💡 전등을 눌러 켜 보세요', 5000);
    } else if (i === 1) {
      S.refl = [0, 1, 0]; setObject('banana'); S.reflV = [0, 1, 0]; S.lampOn = true; setScene('see');
      showHint('🎨 반사하는 빛을 골라 바나나를 노랗게 익혀요', 5000);
    } else if (i === 2) {
      S.refl = [1, 1, 0]; setObject('banana'); S.lampOn = true; setScene('see');
    } else if (i === 3) {
      S.mix = [0, 0, 0]; S.found = { Y: false, C: false, M: false, W: false };
      Object.keys(S.tok).forEach((k) => { S.tok[k].k = 0; S.tok[k].pop = false; });
      S.hold = { key: '', t: 0 }; setSliders(S.mix); setScene('mix');
      showHint('🔦 슬라이더로 조명을 켜고 밝기를 바꿔 보세요', 5000);
    } else if (i === 4) {
      S.mix = [0, 100, 0]; setSliders(S.mix); setScene('mix');
    } else if (i === 5) {
      S.gel = 'white'; S.revealRed = true; setScene('stage');
    } else if (i === 6) {
      S.gel = 'white'; S.seen = { red: 0, green: 0, blue: 0 }; setScene('stage');
      showHint('🎭 아래 버튼으로 조명 색을 바꿔 보세요', 5000);
    } else if (i === 7) {
      S.gel = 'blue'; setScene('stage');
    } else if (i === 8) {
      tour(); S.zoomMode = 0; setScene('screen');
      showHint('🔍 위쪽 막대의 확대 버튼을 눌러 보세요', 5000);
    } else if (i === 9) {
      S.slotDone = [false, false, false]; S.slot = 0; S.slotLive = true; S.gameOn = true; S.slotHold = 0;
      S.pix = [0, 0, 0]; setSliders(S.pix); S.focusT = SLOT_FOCUS[0]; S.zoomMode = 2; S.zoomObs = 0;
      setScene('screen');
      showHint('🎮 슬라이더로 해의 색을 주황으로 만들어요', 5000);
    } else if (i === 10) {
      tour(); S.zoomMode = 2; setScene('screen');
    }
    syncUI();
  }

  game = SciSim.game({
    simId: 'm2-color-light',
    mount: '#game',
    badge: '빛의 마술사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      lamp: '💡 전등',
      reflect: '🎨 반사하는 빛 고르기',
      mix: '🔦 빨강·초록·파랑 조명',
      gel: '🎭 색 조명',
      screen: '🖥️ 모니터 화면',
      zoom: '🔍 화소 확대',
    },
    onFeatures(set) { F = set; syncUI(); },
    onMissionStart(m) { prepMission(m._flat); },
    levels: [
      /* ───────── STEP 1 · 물체의 색 ───────── */
      {
        title: '물체의 색: 반사하는 빛', short: '물체의 색', icon: '🍎', phase: '관찰',
        features: ['lamp', 'reflect'],
        intro: '<p class="si-q">❓ 탐구 질문: 빨간 사과는 왜 빨갛게 보일까?</p>' +
          '<p>어두운 방에서는 물체가 잘 보이지 않다가 전등을 켜면 보여요. 전등에서 나온 <b>흰빛</b>이 사과에 닿으면 어떤 일이 일어날까요?</p>' +
          '<p style="font-size:14px;color:#5d6879">흰빛에는 여러 가지 색의 빛이 섞여 있어요. 이 차시에서는 <b>빨강·초록·파랑</b> 세 가지 빛이 합쳐진 것으로 나타내요.</p>',
        setup() { prepMission(0); },
        recap: '물체는 닿은 빛 중에서 <b>어떤 색의 빛은 반사</b>하고 나머지는 <b>흡수</b>해요. 반사한 빛이 눈에 들어와 그 색으로 보여요.',
        summary: '<p><b>물체의 색</b>: 물체는 닿은 빛의 일부는 <b>반사</b>하고 나머지는 <b>흡수</b>한다. 눈에 들어온 <b>반사한 빛</b>의 색이 그 물체의 색으로 보인다.</p>' +
          '<ul><li>빨간 사과: 빨간빛은 반사하고, 초록빛·파란빛은 흡수</li><li>노란 바나나: 빨간빛과 초록빛은 반사하고, 파란빛은 흡수</li>' +
          '<li><b>흰색</b> 물체는 모든 색의 빛을 반사하고, <b>검은색</b> 물체는 모든 색의 빛을 흡수</li></ul>',
        missions: [
          {
            title: '사과가 빨갛게 보이는 과정',
            goal: '💡 전등을 켜고, 사과에 닿은 빛이 어떻게 되는지 <b>5초</b> 동안 살펴보세요.',
            hint: '아래 <b>전등 켜기</b> 버튼이나 화면의 전등을 눌러요. 🔍 돋보기에서 빨강·초록·파랑 빛이 각각 어떻게 되는지 보세요.',
            check: () => S.lampOn && S.obs >= 5,
            hold: 0.4,
            status: () => '전등 ' + mark(S.lampOn) + ' · 관찰 <b>' + fmt(Math.min(5, S.obs), 1) + ' / 5초</b>',
            explain: '흰빛이 사과에 닿으면 사과는 <b>빨간빛만 반사</b>하고 초록빛과 파란빛은 <b>흡수</b>해요. 반사된 빨간빛이 눈에 들어와서 사과가 <b>빨갛게</b> 보여요. 사과가 스스로 빨간빛을 내는 것은 아니에요.',
          },
          {
            title: '바나나를 노랗게 만들기',
            goal: '덜 익은 바나나는 <b>초록빛</b>만 반사해서 초록색이에요. 🎨 반사하는 빛을 골라 <b>노란색</b> 바나나로 익혀 보세요.',
            hint: '노란색은 <b>빨간빛과 초록빛</b>이 함께 눈에 들어올 때 보여요. 파란빛은 흡수해요.',
            check: () => S.refl[0] === 1 && S.refl[1] === 1 && S.refl[2] === 0,
            hold: 0.8,
            status: () => '반사하는 빛 ' + dotsOf(S.refl) + ' → <b>' + colorName(S.refl) + '</b>',
            explain: '바나나는 <b>빨간빛과 초록빛을 반사</b>하고 파란빛은 흡수해요. 반사한 빨간빛과 초록빛이 함께 눈에 들어와서 <b>노랗게</b> 보여요. (빛이 합쳐지는 것은 다음 단계에서 자세히 알아봐요.)',
          },
          {
            type: 'quiz',
            title: '흰색과 검은색',
            goal: '흰 종이는 하얗게, 검은 종이는 까맣게 보여요. 그 까닭으로 알맞은 것은?',
            figure: SVG_PAPER,
            choices: [
              '흰 종이는 모든 색의 빛을 반사하고, 검은 종이는 모든 색의 빛을 흡수한다',
              '흰 종이는 모든 색의 빛을 흡수하고, 검은 종이는 모든 색의 빛을 반사한다',
              '흰 종이는 스스로 흰빛을 내고, 검은 종이는 스스로 어둠을 낸다',
              '두 종이 모두 빨간빛만 반사하는데, 검은 종이가 더 어둡게 반사한다',
            ],
            answer: 0,
            feedback: [
              '',
              '반대로 생각했어요. 모든 색의 빛이 눈에 들어오면 흰색으로, 눈에 들어오는 빛이 없으면 검은색으로 보여요.',
              '종이는 스스로 빛을 내지 않아요. 전등을 끄면 흰 종이도 보이지 않아요. 눈에 들어오는 빛을 생각해 보세요.',
              '빨간빛만 반사하면 빨갛게 보여요. 흰 종이는 빨강·초록·파랑 빛을 모두 반사해요.',
            ],
            explain: '<b>흰색</b> 물체는 빨강·초록·파랑 빛을 <b>모두 반사</b>해서 눈에 모든 색의 빛이 들어와요. <b>검은색</b> 물체는 빛을 모두 <b>흡수</b>해서 눈에 들어오는 빛이 거의 없어요.',
          },
        ],
      },
      /* ───────── STEP 2 · 빛의 합성 ───────── */
      {
        title: '빛의 합성: 빛의 삼원색', short: '빛의 합성', icon: '🔦', phase: '실험',
        features: ['mix'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물체는 반사한 빛으로 색이 정해지고, 바나나는 빨간빛과 초록빛이 <b>함께</b> 눈에 들어와 노랗게 보인다는 것을 알았어요.</div>' +
          '<p>빛과 빛이 합쳐지면 어떤 색이 될까요? <b>빨강·초록·파랑</b> 조명 세 개를 스크린에 겹쳐 비춰 봐요. 이 세 가지 색의 빛을 <b>빛의 삼원색</b>이라고 해요.</p>',
        setup() { prepMission(3); },
        recap: '빛의 삼원색(빨강·초록·파랑)을 합치면 여러 가지 색을 만들 수 있어요. 세 빛을 모두 합치면 흰색이 돼요.',
        summary: '<p><b>빛의 삼원색</b>: 빨강, 초록, 파랑. 이 세 가지 색의 빛을 합쳐 여러 가지 색을 만들 수 있다. (<b>빛의 합성</b>)</p>' +
          '<ul><li>빨강 + 초록 = <b>노랑</b></li><li>초록 + 파랑 = <b>청록</b></li><li>빨강 + 파랑 = <b>자홍</b></li><li>빨강 + 초록 + 파랑 = <b>흰색</b></li>' +
          '<li>빛은 합칠수록 더 밝아지고, 각 빛의 밝기를 바꾸면 더 다양한 색이 된다.</li></ul>',
        missions: [
          {
            title: '여러 가지 색 만들기',
            goal: '조명 세 개의 밝기를 조절해 <b>노랑 · 청록 · 자홍 · 흰색</b>을 모두 만들어 보세요.',
            hint: '두 가지 조명만 같은 밝기로 켜 보세요. 세 가지를 모두 켜면 어떤 색이 될까요?',
            check: () => Object.keys(S.found).every((k) => S.found[k]),
            hold: 0.5,
            status: () => ['Y', 'C', 'M', 'W'].map((k) => MIX_COLORS[k].name + ' ' + mark(S.found[k])).join(' · '),
            explain: '<b>빨강+초록=노랑</b>, <b>초록+파랑=청록</b>, <b>빨강+파랑=자홍</b>, <b>빨강+초록+파랑=흰색</b>이에요. 서로 다른 색의 빛이 <b>함께 눈에 들어오면</b> 합쳐진 색으로 보여요.',
          },
          {
            type: 'quiz',
            title: '초록 빛에 빨간 빛을 더하면?',
            goal: '초록 조명만 켜져 있어요. 여기에 <b>빨간 조명</b>을 점점 밝게 더하면 스크린의 색은 어떻게 변할까요? (슬라이더로 직접 해 보고 답해도 좋아요!)',
            choices: ['초록 → 연두 → 노랑', '초록 → 짙은 초록 → 검정', '초록 → 청록 → 파랑', '초록 그대로 변하지 않는다'],
            answer: 0,
            feedback: [
              '',
              '빛은 물감과 달라요. 빛은 합칠수록 더 밝아져요. 슬라이더로 직접 확인해 보세요.',
              '파란빛을 더하면 청록이 돼요. 이번에는 빨간빛을 더해요.',
              '빨간빛이 더해지면 눈에 들어오는 빛이 달라져서 색도 변해요.',
            ],
            explain: '초록빛에 빨간빛이 더해지면 처음에는 <b>연두</b>로, 빨간빛이 초록빛만큼 밝아지면 <b>노랑</b>으로 보여요. 빛은 합칠수록 밝아지고, 합치는 빛의 세기에 따라 색이 달라져요.',
          },
        ],
      },
      /* ───────── STEP 3 · 조명과 색 ───────── */
      {
        title: '조명과 색', short: '조명과 색', icon: '🎭', phase: '탐구',
        features: ['gel'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물체의 색은 <b>반사하는 빛</b>으로 정해지고(1단계), 빛은 합쳐져 다른 색이 된다는 것(2단계)을 알았어요.</div>' +
          '<p>그런데 전등이 흰빛이 아니라 <b>색깔 있는 빛</b>이라면 물체는 어떤 색으로 보일까요? 무대 위의 <b>흰 셔츠, 초록 잎, 노란 바나나</b>에 색 조명을 비춰 봐요. 먼저 결과를 <b>예측</b>해 보고 확인해요.</p>',
        setup() { prepMission(5); },
        recap: '물체는 조명에 들어 있는 빛 중에서 자기가 반사하는 색의 빛만 반사해요. 그래서 조명의 색에 따라 물체의 색이 달라 보여요.',
        summary: '<p><b>조명과 물체의 색</b>: 물체는 조명에 들어 있는 빛 가운데 <b>자기가 반사하는 색의 빛</b>만 반사한다. 반사할 빛이 없으면 검게 보인다.</p>' +
          '<ul><li>빨간 조명: 흰 셔츠는 <b>빨강</b>, 초록 잎은 <b>검정</b>, 노란 바나나는 <b>빨강</b>으로 보인다.</li><li>흰색 물체는 조명의 색 그대로 보인다.</li>' +
          '<li>무대 조명처럼 조명의 색을 바꾸면 같은 물체도 다른 색으로 보인다.</li></ul>',
        missions: [
          {
            type: 'quiz',
            title: '빨간 조명 아래에서는?',
            goal: '지금은 흰 조명이에요. 조명을 <b>빨간빛</b>으로 바꾸면 <b>흰 셔츠 · 초록 잎 · 노란 바나나</b>는 각각 어떤 색으로 보일까요? 예측해 보세요.',
            choices: [
              '흰색 · 초록 · 노랑 (원래 색 그대로)',
              '빨강 · 검정 · 빨강',
              '빨강 · 초록 · 노랑',
              '빨강 · 빨강 · 빨강',
            ],
            answer: 1,
            feedback: [
              '조명이 빨간빛이면 물체에 닿는 빛은 빨간빛뿐이에요. 물체는 닿은 빛만 반사할 수 있어요.',
              '',
              '초록 잎은 초록빛을 반사하는데, 빨간 조명에는 초록빛이 없어요. 노란 바나나도 마찬가지예요.',
              '초록 잎은 빨간빛을 흡수해요. 반사할 빛이 없으면 어떻게 보일까요?',
            ],
            explain: '빨간 조명에는 빨간빛만 있어요. <b>흰 셔츠</b>와 <b>노란 바나나</b>는 빨간빛을 반사해서 <b>빨강</b>으로 보이고, <b>초록 잎</b>은 초록빛만 반사하는데 닿는 초록빛이 없어서 <b>검게</b> 보여요.',
          },
          {
            title: '조명 색을 바꿔 보기',
            goal: '무대 조명을 <b>빨강 · 초록 · 파랑</b>으로 차례로 바꿔 보며 세 물체의 색을 살펴보세요. (각각 1.5초 이상)',
            hint: '아래 버튼으로 조명 색을 바꿔요. 초록 잎이 가장 밝게 보이는 조명은 무슨 색일까요?',
            check: () => S.seen.red >= SEEN_NEED && S.seen.green >= SEEN_NEED && S.seen.blue >= SEEN_NEED,
            hold: 0.4,
            status: () => ['red', 'green', 'blue'].map((k, i) => CH_DOT[i] + ' ' + mark(S.seen[k] >= SEEN_NEED)).join(' · '),
            explain: '<b>흰 셔츠</b>는 어떤 조명에서도 조명의 색으로 보여요. <b>초록 잎</b>은 초록 조명에서만, <b>노란 바나나</b>는 빨강·초록 조명에서 밝아져요. 물체는 <b>조명에 들어 있는 빛</b> 중에서만 반사할 수 있어요.',
          },
          {
            type: 'quiz',
            title: '무대의 빨간 옷',
            goal: '무대에서 <b>빨간 옷</b>을 입은 배우에게 <b>파란 조명</b>만 비추면 옷은 어떤 색으로 보일까요?',
            figure: SVG_STAGE,
            choices: ['빨간색 그대로', '파란색', '검은색(어둡게)', '보라색'],
            answer: 2,
            feedback: [
              '빨간 옷은 빨간빛을 반사해요. 그런데 파란 조명에는 빨간빛이 없어요.',
              '파란색으로 보이려면 파란빛을 반사해야 해요. 빨간 옷은 파란빛을 흡수해요.',
              '',
              '보라색은 빨강과 파랑이 함께 눈에 들어와야 해요. 이 옷은 반사할 빨간빛이 없어요.',
            ],
            explain: '빨간 옷은 <b>빨간빛만 반사</b>하고 파란빛은 <b>흡수</b>해요. 파란 조명에는 빨간빛이 없어서 반사되는 빛이 거의 없고, 옷은 <b>검게</b> 보여요. 같은 파란 조명이라도 <b>흰옷</b>이라면 파랗게 보여요.',
          },
        ],
      },
      /* ───────── STEP 4 · 화면의 색 ───────── */
      {
        title: '화면의 색: 빛의 합성', short: '화면의 색', icon: '🖥️', phase: '적용',
        features: ['screen', 'zoom'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빨강·초록·파랑 빛을 합치면 여러 가지 색을 만들 수 있다는 것을 알았어요.</div>' +
          '<p>텔레비전, 컴퓨터, 스마트폰 같은 <b>영상 장치</b>의 화면도 이 원리로 색을 나타내요. 화면을 확대하면 아주 작은 <b>화소</b>가 보이고, 화소는 <b>빨강·초록·파랑 부분 화소</b>로 이루어져 있어요.</p>',
        setup() { prepMission(8); },
        recap: '영상 장치는 화소 속 빨강·초록·파랑 부분 화소의 밝기를 조절해 빛을 합성하고, 그렇게 다양한 색을 나타내요.',
        summary: '<p><b>영상 장치의 색</b>: 화면은 아주 작은 <b>화소</b>로 이루어져 있고, 화소 하나는 <b>빨강·초록·파랑 부분 화소</b>로 되어 있다.</p>' +
          '<ul><li>세 부분 화소의 <b>밝기</b>를 조절해 빛을 합성하면 다양한 색을 나타낼 수 있다.</li>' +
          '<li>노랑 = 빨강·초록 부분 화소가 켜짐, <b>흰색</b> = 셋 모두 켜짐, <b>검은색</b> = 셋 모두 꺼짐</li>' +
          '<li>부분 화소가 아주 작아서 멀리서 보면 세 빛이 합쳐져 한 가지 색으로 보인다.</li></ul>',
        missions: [
          {
            title: '화소 확대해 보기',
            goal: '🔍 <b>부분 화소</b>까지 확대해서 화면을 이루는 빛을 <b>3초</b> 동안 관찰하세요. 화면을 눌러 보면 다른 곳을 확대할 수 있어요.',
            hint: '위쪽 막대에서 🔍 화소 → 🔬 부분 화소 순서로 눌러요. 흰 구름과 하늘은 부분 화소가 어떻게 다를까요?',
            check: () => S.zoomMode === 2 && S.zoomObs >= 3,
            hold: 0.3,
            status: () => '부분 화소까지 확대 ' + mark(S.zoomMode === 2 && S.zoom > 0.95) + ' · 관찰 <b>' + fmt(Math.min(3, S.zoomObs), 1) + ' / 3초</b>',
            explain: '화면의 그림은 아주 작은 <b>화소</b>가 모인 거예요. 화소 하나는 <b>빨강·초록·파랑 부분 화소</b> 세 개로 이루어져 있고, 흰색 화소는 세 부분 화소가 모두 밝게 켜져 있어요.',
          },
          {
            title: '목표색 만들기',
            goal: '세 부분 화소의 밝기를 조절해 그림의 빈 곳을 <b>목표색</b>으로 채워요. <b>주황 → 하늘색 → 연두</b> 순서예요.',
            get hint() { return SLOT_HINT[Math.min(2, S.slot)]; },
            check: () => S.slotDone[0] && S.slotDone[1] && S.slotDone[2],
            hold: 0.3,
            status: () => TARGETS.map((tt, i) => tt.name + ' ' + mark(S.slotDone[i])).join(' · '),
            explain: '세 부분 화소의 밝기를 다르게 하면 <b>여러 가지 색</b>을 만들 수 있어요. 주황은 빨강을 가장 밝게, 초록을 절반쯤 켜고 파랑은 끈 색이에요. 영상 장치는 이렇게 화소마다 빛을 합성해서 그림을 나타내요.',
          },
          {
            type: 'quiz',
            title: '노란색은 어떻게?',
            goal: '화면의 화소에는 빨강·초록·파랑 부분 화소만 있고 <b>노랑</b> 부분 화소는 없어요. 그런데도 화면이 노란색을 나타낼 수 있는 까닭은?',
            figure: SVG_PIXEL,
            choices: [
              '노랑 부분 화소가 화면 뒤에 숨어 있다',
              '빨강과 초록 부분 화소를 함께 켜면 두 빛이 합쳐져 노랗게 보인다',
              '파랑 부분 화소가 노란빛을 낸다',
              '화면에 노란 물감을 칠해 두었다',
            ],
            answer: 1,
            feedback: [
              '화소에는 빨강·초록·파랑 세 가지 부분 화소뿐이에요. 그런데 어떻게 노랑이 보일까요?',
              '',
              '파랑 부분 화소는 파란빛만 내요. 노랑은 빨강과 초록이 합쳐져야 해요.',
              '화면은 물감이 아니라 빛으로 색을 나타내요. 2단계에서 노랑을 만든 방법을 떠올려 보세요.',
            ],
            explain: '<b>빨강 + 초록 = 노랑</b>이에요. 노란색을 나타낼 때는 빨강·초록 부분 화소를 켜고 파랑 부분 화소는 꺼요. 부분 화소가 아주 작아서 눈에는 빛이 합쳐져 한 가지 색으로 보여요.',
          },
        ],
      },
    ],
  });
  syncUI();

  /* =========================================================
     그리기 · 시작
     ========================================================= */
  // 미션 성공: 화면 위에 초록 체크와 불꽃
  let lastPhase = '';
  function successFx(V, t) {
    const ph = game ? game.phase : '';
    if (ph === 'success' && lastPhase === 'active') {
      S.succ = { t0: t, x: V.L.vw / 2, y: V.L.key === 'wide' ? 82 : 96 };
      if (!REDUCE) V.fx.burst(S.succ.x, S.succ.y, { count: 26, colors: ['#ffd24a', '#7be495', '#7fb2ff', '#ff8a8e', '#ffffff'], speed: 200, gravity: 120, life: 0.9 });
    }
    lastPhase = ph;
  }
  function drawSuccess(V, t) {
    const k = (t - S.succ.t0) / 1.6;
    if (k < 0 || k > 1) return;
    const { ctx, D } = V;
    const pop = EASE.outBack(clamp(k * 3, 0, 1)), fade = 1 - smooth(0.7, 1, k);
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(S.succ.x, S.succ.y); ctx.scale(pop, pop); ctx.translate(-S.succ.x, -S.succ.y);
    D.shadow(() => D.check(S.succ.x, S.succ.y, 30, clamp(k * 3.5, 0, 1)), { blur: 14, y: 3, color: 'rgba(0,0,0,.4)' });
    ctx.restore();
  }
  function drawView(V, t, dt) {
    const { ctx, L } = V;
    V.v.clear();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, L.vw, L.vh);
    const k = clamp(S.fade.k, 0, 1);
    ctx.save();
    if (k < 1) { ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 14); }
    if (S.scene === 'see') drawSee(V, t, dt);
    else if (S.scene === 'mix') drawMix(V, t, dt);
    else if (S.scene === 'stage') drawStage(V, t, dt);
    else drawScreen(V, t, dt);
    ctx.restore();
    drawSuccess(V, t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    V.fx.draw(ctx);
    ctx.restore();
    // 가장자리를 배경색과 부드럽게 이어 줌 (캔버스 둘레의 여백과 이음새가 보이지 않게)
    const E = 16;
    [[0, 0, 0, E, 0, 0, L.vw, E], [0, L.vh, 0, L.vh - E, 0, L.vh - E, L.vw, E], [0, 0, E, 0, 0, 0, E, L.vh], [L.vw, 0, L.vw - E, 0, L.vw - E, 0, E, L.vh]].forEach((a) => {
      const g = ctx.createLinearGradient(a[0], a[1], a[2], a[3]);
      g.addColorStop(0, 'rgba(10,16,32,.95)'); g.addColorStop(1, 'rgba(10,16,32,0)');
      ctx.fillStyle = g; ctx.fillRect(a[4], a[5], a[6], a[7]);
    });
  }

  // 테스트·디버그용 (화면 동작에는 영향 없음)
  window.__sim = { drawView, S, game, setScene, setSliders, setGel, setZoomMode, setObject, toggleLamp, enterScene, prepMission, VIEWS, TARGETS, classify, colorName, surf, activeView, GEO };

  const PERF = { d: [] };
  window.__perf = PERF;
  SciSim.loop((dt, t) => {
    const V = activeView();
    S.t = t;
    updateSee(dt); updateMix(dt); updateStage(dt); updateScreen(dt);
    successFx(V, t);
    V.fx.update(dt);
    const t0 = performance.now();
    drawView(V, t, dt);
    PERF.d.push(performance.now() - t0); if (PERF.d.length > 600) PERF.d.shift();
    updateReadouts(t);
  });
})();
