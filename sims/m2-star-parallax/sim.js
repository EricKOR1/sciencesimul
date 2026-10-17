/* =========================================================
   중2 Ⅷ. 별과 우주 - 연주시차와 별까지의 거리  [9과15-01] 앞부분
   탐구 흐름(4단계):
   ① 관찰: 연필 시차 실험 — 보는 위치가 바뀌면 가까운 물체가 먼 배경에 대해 움직여 보인다
   ② 모형: 6개월 간격 관측 — 지구 공전 궤도 모형, 망원경 시야, 연주시차 = 시차의 1/2
   ③ 탐구: 별까지의 거리를 바꾸며 연주시차를 기록 → 반비례, 1 pc
   ④ 적용: 실제 가까운 별 4개를 연주시차로 거리 순서대로 놓기
   (식·삼각 함수·계산기는 쓰지 않는다. 거리는 비율과 표의 규칙으로만 구한다.)
   ========================================================= */
(function () {
  'use strict';
  const { $, Sound, clamp, lerp, approach, tween } = SciSim;
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const RM = SciSim.reduceMotion;
  const rgba = SciSim.color.rgba;
  const easeIO = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = SciSim.ease.outBack;

  /* ---------- 화면 배치 (wide 태블릿 / tall 휴대폰) ---------- */
  const LAYOUTS = {
    wide: { kind: 'wide', vw: 800, vh: 560, U: { x: 0, y: 0, w: 800, h: 300 }, P: { x: 0, y: 308, w: 800, h: 252 }, amp: 96,
      M: { x: 0, y: 0, w: 496, h: 560 }, Q: { x: 504, y: 10, w: 288, h: 540 } },
    tall: { kind: 'tall', vw: 520, vh: 860, U: { x: 0, y: 0, w: 520, h: 400 }, P: { x: 0, y: 408, w: 520, h: 452 }, amp: 70,
      M: { x: 0, y: 0, w: 520, h: 560 }, Q: { x: 0, y: 566, w: 520, h: 288 } },
  };
  const R_ORB = 104;                     // 공전 궤도 반지름 (그림)
  const mg = (L) => ({ cx: L.M.w / 2, sunY: 440, R: R_ORB });
  const S2_H = 250;                      // 2단계 별 S의 높이
  const hOf = (d) => 140 + 19 * (d - 1); // 3단계: 거리 d(pc)에 따른 별 S의 그림 높이

  /* ---------- 장면 · 상태 ---------- */
  const SCENES = { pencil: '✏️ 연필 실험', orbit: '🌍 공전 궤도 모형', dist: '📏 별까지의 거리', map: '🗺 가까운 별 지도' };
  const S = {
    scene: 'pencil', freeScene: null,
    // 1단계 연필
    d: 40, eye: 1, switches: 0, eyes: new Set(), nearAng: null, farAng: null, usedPencil: false,
    // 2단계 궤도
    ang: 270, angT: 270, drag: false, photos: [], spin: null, trail: null, pair: false,
    sel: null, selWrong: 0, options: false, hover: false,
    // 3단계 거리
    dist: 1, distT: 1, data: [], freshD: null, dragS: false, distMoved: false,
    // 4단계 지도
    cards: [], mapDone: false, mapT: 0, mapShown: false,
  };
  const A = {                            // 부드럽게 움직이는 값
    sEye: 1, closeL: 0, closeR: 1, dV: 40, ghost: null, flash: 0, pairA: 0, sH: S2_H, distV: 1, pV: 1, halfAng: 30,
    sceneA: 1, selShake: 0, halfA: 0,
  };
  let FEAT = new Set();
  let game = null;
  const on = (f) => (game && game.free) || FEAT.has(f);
  const level = () => (game ? game.level : 0);
  const sceneNow = () => (game && game.free && S.freeScene ? S.freeScene : ['pencil', 'orbit', 'dist', 'map'][level()]);

  const ANG_JAN = 180, ANG_JUL = 360;
  const normA = (a) => ((a % 360) + 360) % 360;
  const angDiff = (a, b) => { const d = normA(a - b); return d > 180 ? d - 360 : d; };
  const monthOf = (a) => Math.round(normA(a - 180) / 30) % 12 + 1;
  const monthFrac = (a) => normA(a - 180) / 30 + 1;
  const nearJan = (a) => Math.abs(angDiff(a, ANG_JAN)) <= 8;
  const nearJul = (a) => Math.abs(angDiff(a, ANG_JUL)) <= 8;
  const parAngle = (d) => Math.round(2 * Math.atan(3.2 / d) / DEG);
  const P_TABLE = ['', '1.00', '0.50', '0.33', '0.25', '0.20', '0.17', '0.14', '0.13', '0.11', '0.10'];
  const fmtP = (d) => P_TABLE[d] || (1 / d).toFixed(2);
  const lyOf = (d) => (d * 3.26).toFixed(1);

  const particles = new SciSim.Particles();

  /* ---------- 그리기 도우미 ---------- */
  const spriteCache = {};
  function glowSprite(color) {
    if (spriteCache[color]) return spriteCache[color];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.1, 'rgba(255,255,255,.92)');
    gr.addColorStop(0.28, rgba(color, 0.55));
    gr.addColorStop(0.62, rgba(color, 0.14));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (spriteCache[color] = c);
  }
  function flareSprite() {
    if (spriteCache.flare) return spriteCache.flare;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const h = g.createLinearGradient(0, 0, 128, 0);
    h.addColorStop(0, 'rgba(255,255,255,0)'); h.addColorStop(0.5, 'rgba(255,255,255,.95)'); h.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = h; g.fillRect(0, 62, 128, 4);
    const v = g.createLinearGradient(0, 0, 0, 128);
    v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(0.5, 'rgba(255,255,255,.95)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = v; g.fillRect(62, 0, 4, 128);
    return (spriteCache.flare = c);
  }
  /* 빛나는 별: 글로우 + (선택) 4갈래 빛살 */
  function star(ctx, x, y, r, color, o) {
    o = o || {};
    const a = o.alpha != null ? o.alpha : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    const gs = glowSprite(color || '#cfe4ff');
    const R2 = r * (o.halo || 3.2);
    ctx.drawImage(gs, x - R2, y - R2, R2 * 2, R2 * 2);
    if (o.flare) { const f = o.flare; ctx.globalAlpha = a * 0.8; ctx.drawImage(flareSprite(), x - f, y - f, f * 2, f * 2); }
    ctx.restore();
  }
  function txt(ctx, s, x, y, size, color, o) {
    o = o || {};
    ctx.save();
    ctx.font = (o.weight || 700) + ' ' + size + 'px ' + (o.font || FONT);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || 4; ctx.strokeText(s, x, y); }
    ctx.fillStyle = color || '#fff';
    if (o.maxW) ctx.fillText(s, x, y, o.maxW); else ctx.fillText(s, x, y);
    ctx.restore();
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function pill(ctx, x, y, s, o) {
    o = o || {};
    const size = o.size || 13;
    ctx.save();
    ctx.font = '800 ' + size + 'px ' + FONT;
    const tw = ctx.measureText(s).width, pad = o.pad != null ? o.pad : 9, h = size + 11;
    let lx = x - tw / 2 - pad;
    if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - tw - pad * 2;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    rr(ctx, lx, y - h / 2, tw + pad * 2, h, h / 2);
    ctx.fillStyle = o.bg || 'rgba(8,16,40,.78)'; ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(s, lx + pad, y + 1);
    ctx.restore();
    return { x: lx, y: y - h / 2, w: tw + pad * 2, h };
  }
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* 우주 배경 (한 번만 그려 두고 재사용) */
  function spaceCanvas(L) {
    if (L._space) return L._space;
    const sc = 1.5, c = document.createElement('canvas');
    c.width = Math.round(L.vw * sc); c.height = Math.round(L.vh * sc);
    const g = c.getContext('2d'); g.scale(sc, sc);
    const gr = g.createRadialGradient(L.vw * 0.5, L.vh * 0.7, 20, L.vw * 0.5, L.vh * 0.6, Math.max(L.vw, L.vh) * 0.85);
    gr.addColorStop(0, '#0f1a3c'); gr.addColorStop(1, '#050a1c');
    g.fillStyle = gr; g.fillRect(0, 0, L.vw, L.vh);
    const r = rng(L.kind === 'wide' ? 11 : 23);
    for (let i = 0; i < 150; i++) {
      const x = r() * L.vw, y = r() * L.vh, s = 0.4 + r() * 1.1;
      g.fillStyle = 'rgba(' + (200 + (r() * 55 | 0)) + ',' + (210 + (r() * 45 | 0)) + ',255,' + (0.25 + r() * 0.5).toFixed(2) + ')';
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
    L._tw = [];
    for (let i = 0; i < 26; i++) L._tw.push({ x: r() * L.vw, y: r() * L.vh, s: 1 + r() * 1.3, ph: r() * TAU, sp: 1.2 + r() * 2.2 });
    return (L._space = c);
  }
  function drawSpace(ctx, L, t) {
    ctx.drawImage(spaceCanvas(L), 0, 0, L.vw, L.vh);
    ctx.save(); ctx.fillStyle = '#dbe8ff';
    L._tw.forEach((s) => {
      ctx.globalAlpha = RM ? 0.7 : 0.6 + 0.4 * Math.sin(t * s.sp + s.ph);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, TAU); ctx.fill();
    });
    ctx.restore();
  }

  /* =========================================================
     장면 1: 연필 시차 실험
     ========================================================= */
  function landCanvas(L) {
    if (L._land) return L._land;
    const U = L.U, sc = 1.5, c = document.createElement('canvas');
    c.width = Math.round(U.w * sc); c.height = Math.round(U.h * sc);
    const g = c.getContext('2d'); g.scale(sc, sc);
    const w = U.w, h = U.h;
    const back = document.createElement('canvas'); back.width = c.width; back.height = c.height;
    const b = back.getContext('2d'); b.scale(sc, sc);
    // 하늘
    let gr = b.createLinearGradient(0, 0, 0, h * 0.7);
    gr.addColorStop(0, '#cfe6ff'); gr.addColorStop(1, '#f2f8ff');
    b.fillStyle = gr; b.fillRect(0, 0, w, h);
    // 구름
    b.fillStyle = 'rgba(255,255,255,.75)';
    [[0.2, 0.22, 90], [0.72, 0.16, 110], [0.5, 0.3, 70]].forEach((cl) => {
      for (let i = 0; i < 4; i++) { b.beginPath(); b.ellipse(w * cl[0] + (i - 1.5) * cl[2] * 0.3, h * cl[1] + (i % 2) * 5, cl[2] * 0.3, cl[2] * 0.14, 0, 0, TAU); b.fill(); }
    });
    // 산 능선 3겹
    function ridge(base, amp, color, ph, f) {
      b.fillStyle = color; b.beginPath(); b.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) b.lineTo(x, base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 2) * amp * 0.45);
      b.lineTo(w, h); b.closePath(); b.fill();
    }
    ridge(h * 0.52, 22, '#d6e2f1', 0.4, 0.011);
    ridge(h * 0.62, 24, '#b9cbe3', 2.1, 0.0085);
    // 송전탑 (위치 비교의 기준)
    const tx = w * 0.5, ty = h * 0.6 + Math.sin(tx * 0.0085 + 2.1) * 24 + Math.sin(tx * 0.0085 * 2.3 + 4.2) * 11;
    b.strokeStyle = '#7e93b4'; b.lineWidth = 2.2; b.lineCap = 'round';
    b.beginPath();
    b.moveTo(tx - 12, ty + 4); b.lineTo(tx - 4, ty - 64); b.moveTo(tx + 12, ty + 4); b.lineTo(tx + 4, ty - 64);
    b.moveTo(tx - 9, ty - 16); b.lineTo(tx + 9, ty - 40); b.moveTo(tx + 9, ty - 16); b.lineTo(tx - 9, ty - 40);
    b.moveTo(tx - 26, ty - 56); b.lineTo(tx + 26, ty - 56); b.moveTo(tx - 20, ty - 46); b.lineTo(tx + 20, ty - 46);
    b.stroke();
    ridge(h * 0.72, 18, '#9db4d4', 4.3, 0.0075);
    // 소나무 몇 그루
    b.fillStyle = '#6f89b0';
    [-0.3, -0.24, 0.27, 0.33, 0.12].forEach((o, i) => {
      const px = w * (0.5 + o), py = h * 0.72 + Math.sin(px * 0.0075 + 4.3) * 18 + Math.sin(px * 0.0075 * 2.3 + 8.6) * 8.1;
      const s = 0.9 + (i % 3) * 0.25;
      for (let k = 0; k < 3; k++) { b.beginPath(); b.moveTo(px, py - 34 * s + k * 9 * s); b.lineTo(px - (9 + k * 4) * s, py - 14 * s + k * 9 * s); b.lineTo(px + (9 + k * 4) * s, py - 14 * s + k * 9 * s); b.closePath(); b.fill(); }
      b.fillRect(px - 1.5, py - 8 * s, 3, 10 * s);
    });
    // 안개
    gr = b.createLinearGradient(0, h * 0.5, 0, h);
    gr.addColorStop(0, 'rgba(240,247,255,0)'); gr.addColorStop(1, 'rgba(210,225,245,.55)');
    b.fillStyle = gr; b.fillRect(0, h * 0.5, w, h * 0.5);
    // 피사계 심도 느낌 (한 번만 흐리게)
    try { g.filter = 'blur(1.2px)'; } catch (e) { /* 지원하지 않으면 무시 */ }
    g.drawImage(back, 0, 0, w, h);
    g.filter = 'none';
    // 나무 창틀
    const F = 20;
    function wood(x, y, ww, hh, vert) {
      const wg = vert ? g.createLinearGradient(x, 0, x + ww, 0) : g.createLinearGradient(0, y, 0, y + hh);
      wg.addColorStop(0, '#c99a62'); wg.addColorStop(0.5, '#a97842'); wg.addColorStop(1, '#8a5e33');
      g.fillStyle = wg; g.fillRect(x, y, ww, hh);
      g.strokeStyle = 'rgba(70,40,15,.18)'; g.lineWidth = 1;
      for (let i = 0; i < 6; i++) { g.beginPath(); if (vert) { const xx = x + ww * (i + 0.5) / 6; g.moveTo(xx, y); g.lineTo(xx + 2, y + hh); } else { const yy = y + hh * (i + 0.5) / 6; g.moveTo(x, yy); g.lineTo(x + ww, yy + 1.5); } g.stroke(); }
    }
    wood(0, 0, w, F, false); wood(0, h - 30, w, 30, false); wood(0, 0, F, h, true); wood(w - F, 0, F, h, true);
    // 안쪽 그림자
    const sh = (x0, y0, x1, y1, rect) => { const s2 = g.createLinearGradient(x0, y0, x1, y1); s2.addColorStop(0, 'rgba(30,20,10,.38)'); s2.addColorStop(1, 'rgba(30,20,10,0)'); g.fillStyle = s2; g.fillRect.apply(g, rect); };
    sh(0, F, 0, F + 14, [F, F, w - 2 * F, 14]); sh(F, 0, F + 14, 0, [F, F, 14, h - F - 30]); sh(w - F, 0, w - F - 14, 0, [w - F - 14, F, 14, h - F - 30]);
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(0, h - 30, w, 2);
    return (L._land = c);
  }

  function deskCanvas(L) {
    if (L._desk) return L._desk;
    const P = L.P, sc = 1.5, c = document.createElement('canvas');
    c.width = Math.round(P.w * sc); c.height = Math.round(P.h * sc);
    const g = c.getContext('2d'); g.scale(sc, sc);
    const gr = g.createLinearGradient(0, 0, 0, P.h);
    gr.addColorStop(0, '#efd6aa'); gr.addColorStop(1, '#d9b277');
    g.fillStyle = gr; g.fillRect(0, 0, P.w, P.h);
    const r = rng(5);
    for (let i = 0; i < 26; i++) {
      const y = r() * P.h; g.strokeStyle = 'rgba(120,80,30,' + (0.05 + r() * 0.08).toFixed(2) + ')'; g.lineWidth = 1 + r() * 1.5;
      g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= P.w; x += 40) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 3); g.stroke();
    }
    return (L._desk = c);
  }

  function drawPencil(ctx, x, top, len, w, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    const hw = w / 2, tipH = 16, coneH = 38, ferH = 20, eraH = 24;
    const bodyTop = top + tipH + coneH, bodyBot = top + len - ferH - eraH;
    // 부드러운 그림자
    ctx.save(); ctx.globalAlpha *= 0.18; ctx.fillStyle = '#1b2a44';
    ctx.beginPath(); ctx.ellipse(x + 8, top + len + 4, hw * 1.1, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
    // 몸통 (육각 면 3단 음영)
    const bands = [['#ffe07a', -hw, w * 0.28], ['#f5b400', -hw + w * 0.28, w * 0.44], ['#c98900', hw - w * 0.28, w * 0.28]];
    bands.forEach((bd) => { ctx.fillStyle = bd[0]; ctx.fillRect(x + bd[1], bodyTop, bd[2], bodyBot - bodyTop); });
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - hw + 3, bodyTop, 2, bodyBot - bodyTop);
    // 깎인 나무 끝
    const woodG = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
    woodG.addColorStop(0, '#f6dfb4'); woodG.addColorStop(0.55, '#e7c389'); woodG.addColorStop(1, '#bf9560');
    ctx.fillStyle = woodG;
    ctx.beginPath(); ctx.moveTo(x - hw, bodyTop); ctx.lineTo(x - 5, top + tipH); ctx.lineTo(x + 5, top + tipH); ctx.lineTo(x + hw, bodyTop); ctx.closePath(); ctx.fill();
    // 흑연 심
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath(); ctx.moveTo(x - 5, top + tipH); ctx.lineTo(x, top); ctx.lineTo(x + 5, top + tipH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - 3, top + 6, 1.5, 8);
    // 금속 꼭지 (줄무늬)
    const fg = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
    fg.addColorStop(0, '#f1f4f8'); fg.addColorStop(0.5, '#c4ccd8'); fg.addColorStop(1, '#8e98a8');
    ctx.fillStyle = fg; ctx.fillRect(x - hw, bodyBot, w, ferH);
    ctx.fillStyle = 'rgba(60,70,90,.35)';
    for (let i = 0; i < 3; i++) ctx.fillRect(x - hw, bodyBot + 4 + i * 6, w, 1.3);
    // 지우개
    const eg = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
    eg.addColorStop(0, '#ffc5d2'); eg.addColorStop(0.5, '#f5a3b5'); eg.addColorStop(1, '#d9788f');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.moveTo(x - hw, bodyBot + ferH); ctx.lineTo(x + hw, bodyBot + ferH); ctx.lineTo(x + hw, top + len - 8); ctx.quadraticCurveTo(x + hw, top + len, x, top + len); ctx.quadraticCurveTo(x - hw, top + len, x - hw, top + len - 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawEyeIcon(ctx, x, y, close, label, active) {
    const open = 1 - clamp(close, 0, 1) * 0.92;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = active ? 1 : 0.62;
    // 눈 모양
    ctx.beginPath(); ctx.moveTo(-24, 0); ctx.quadraticCurveTo(0, -22 * open, 24, 0); ctx.quadraticCurveTo(0, 22 * open, -24, 0); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = active ? '#0ea5e9' : '#475569'; ctx.lineWidth = 2.5; ctx.stroke();
    if (open > 0.35) {
      ctx.save(); ctx.clip();
      const ir = ctx.createRadialGradient(-2, -2, 1, 0, 0, 11);
      ir.addColorStop(0, '#6aa7d8'); ir.addColorStop(1, '#2b5b8a');
      ctx.fillStyle = ir; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0b1220'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(-3.5, -3.5, 2.4, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 8, 2); ctx.lineTo(i * 9.5, 9); ctx.stroke(); }
    }
    ctx.restore();
    txt(ctx, label, x, y + 36, 13, active ? '#0b5d8f' : '#475569', { weight: 800, stroke: 'rgba(255,255,255,.85)', sw: 4 });
    txt(ctx, active ? '뜬 눈' : '감은 눈', x, y + 52, 13, active ? '#0b5d8f' : '#64748b', { weight: 700, stroke: 'rgba(255,255,255,.85)', sw: 4 });
  }

  function pencilGeo(L) {
    const P = L.P, eyeY = P.y + P.h - 34, bgY = P.y + 36;
    const k = Math.min(4.2, (eyeY - bgY - 24) / 60);
    return { eyeY, bgY, k, h: 3.2 * k, cx: P.w / 2 };
  }

  function drawPencilScene(v, L, t) {
    const ctx = v.ctx, U = L.U, P = L.P, G = pencilGeo(L), D = v.D;
    // ----- 위: 눈에 보이는 모습 -----
    ctx.drawImage(landCanvas(L), U.x, U.y, U.w, U.h);
    const cx = U.w / 2, dV = A.dV;
    const penLen = Math.min(230, U.h - 82), penTop = 54;
    const px = cx + A.sEye * L.amp * (20 / dV);
    if (A.ghost && A.ghost.a > 0.01) {
      const gx = cx + A.ghost.s * L.amp * (20 / dV);
      drawPencil(ctx, gx, penTop, penLen, 26, 0.4 * A.ghost.a);
      // 움직여 보인 정도 화살표
      if (Math.abs(gx - px) > 14) {
        const ay = penTop - 8, a = A.ghost.a;
        const x1 = Math.min(gx, px), x2 = Math.max(gx, px);
        ctx.save(); ctx.globalAlpha = a;
        D.arrow(x1 + 18, ay, x2 - 18, ay, { color: '#f26b3a', width: 3.5, head: 11 });
        D.arrow(x2 - 18, ay, x1 + 18, ay, { color: '#f26b3a', width: 3.5, head: 11 });
        pill(ctx, (x1 + x2) / 2, ay + 38, '↔ 움직여 보인 정도', { bg: '#f26b3a', size: 13 });
        ctx.restore();
      }
    }
    drawPencil(ctx, px, penTop, penLen, 26);
    // 배경 설명 라벨
    pill(ctx, 34, U.h - 50, '🏔 먼 산·송전탑: 움직이지 않아요', { align: 'left', bg: 'rgba(30,50,90,.72)', size: 13 });
    // 눈 아이콘
    const ex = U.w - 96, ey = 62;
    drawEyeIcon(ctx, ex - 52, ey, A.closeL, '왼눈', S.eye > 0);
    drawEyeIcon(ctx, ex + 52, ey, A.closeR, '오른눈', S.eye < 0);
    pill(ctx, 28, 44, '👁 눈에 보이는 모습', { align: 'left', bg: 'rgba(14,50,90,.8)' });

    // ----- 아래: 위에서 본 모습 -----
    ctx.save();
    ctx.translate(P.x, P.y);
    ctx.drawImage(deskCanvas(L), 0, 0, P.w, P.h);
    ctx.restore();
    ctx.fillStyle = 'rgba(40,25,10,.28)'; ctx.fillRect(0, P.y - 2, P.w, 4);
    const pcx = G.cx, py = G.eyeY - dV * G.k, h = G.h;
    const ex1 = pcx - h, ex2 = pcx + h;             // 왼눈, 오른눈
    // 먼 배경 선
    ctx.save();
    ctx.setLineDash([10, 7]); ctx.strokeStyle = 'rgba(70,100,150,.85)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(18, G.bgY); ctx.lineTo(P.w - 18, G.bgY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#9db4d4';
    for (let i = 0; i < 9; i++) { const mx = 60 + i * (P.w - 120) / 8; ctx.beginPath(); ctx.moveTo(mx - 14, G.bgY - 2); ctx.lineTo(mx, G.bgY - 14 - (i % 3) * 3); ctx.lineTo(mx + 14, G.bgY - 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    pill(ctx, 28, P.y + 18, '🔝 위에서 본 모습', { align: 'left', bg: 'rgba(80,50,15,.78)' });
    pill(ctx, P.w - 24, G.bgY + 18, '먼 배경 (산)', { align: 'right', bg: 'rgba(40,70,120,.8)', size: 13 });
    // 시선과 부채꼴
    const hit = (ex0) => ex0 + (pcx - ex0) * (G.eyeY - G.bgY) / (G.eyeY - py);   // 배경 선과 만나는 x
    const hL = hit(ex1), hR = hit(ex2);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(pcx, py); ctx.lineTo(hL, G.bgY); ctx.lineTo(hR, G.bgY); ctx.closePath();
    ctx.fillStyle = 'rgba(242,107,58,.28)'; ctx.fill();
    // 눈 → 연필 → 배경 시선
    [[ex1, S.eye > 0, hL], [ex2, S.eye < 0, hR]].forEach((e) => {
      const openEye = e[1];
      const gr = ctx.createLinearGradient(0, G.eyeY, 0, G.bgY);
      gr.addColorStop(0, openEye ? '#1d4ed8' : 'rgba(80,60,40,.5)'); gr.addColorStop(1, openEye ? 'rgba(14,165,233,.7)' : 'rgba(80,60,40,.25)');
      ctx.strokeStyle = gr; ctx.lineWidth = openEye ? 3 : 2;
      ctx.setLineDash(openEye ? [] : [5, 6]);
      ctx.beginPath(); ctx.moveTo(e[0], G.eyeY); ctx.lineTo(e[2], G.bgY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = openEye ? '#1d4ed8' : 'rgba(110,90,70,.55)';
      ctx.beginPath(); ctx.arc(e[2], G.bgY, openEye ? 5 : 3.5, 0, TAU); ctx.fill();
    });
    ctx.restore();
    // 머리 (위에서 본 모습)
    ctx.save();
    const hg = ctx.createRadialGradient(pcx - 8, G.eyeY + 12, 4, pcx, G.eyeY + 22, h + 26);
    hg.addColorStop(0, '#f3c9a3'); hg.addColorStop(1, '#d9a47b');
    ctx.fillStyle = 'rgba(40,25,10,.2)'; ctx.beginPath(); ctx.ellipse(pcx + 4, G.eyeY + 28, h + 18, 34, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(pcx, G.eyeY + 22, h + 16, 32, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3b2a20'; ctx.beginPath(); ctx.ellipse(pcx, G.eyeY + 34, h + 15, 22, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#e8b78e'; ctx.beginPath(); ctx.moveTo(pcx - 5, G.eyeY + 2); ctx.lineTo(pcx, G.eyeY - 14); ctx.lineTo(pcx + 5, G.eyeY + 2); ctx.closePath(); ctx.fill();
    [[ex1, S.eye > 0], [ex2, S.eye < 0]].forEach((e) => {
      ctx.fillStyle = e[1] ? '#fff' : '#c79b78';
      ctx.beginPath(); ctx.ellipse(e[0], G.eyeY + 2, 6, e[1] ? 4.5 : 1.8, 0, 0, TAU); ctx.fill();
      if (e[1]) { ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(e[0], G.eyeY + 1, 2.8, 0, TAU); ctx.fill(); }
    });
    ctx.restore();
    // 연필 단면 (끌기 가능)
    const lift = 1 + 0.12 * (S.dragPencil ? 1 : 0);
    ctx.save();
    if (!RM) { const pulse = 0.5 + 0.5 * Math.sin(t * 3); ctx.strokeStyle = 'rgba(245,158,11,' + (0.25 + 0.2 * pulse).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pcx, py, 17 + pulse * 3, 0, TAU); ctx.stroke(); }
    ctx.shadowColor = 'rgba(60,35,10,.4)'; ctx.shadowBlur = S.dragPencil ? 12 : 5; ctx.shadowOffsetY = S.dragPencil ? 5 : 2;
    ctx.fillStyle = '#f5b400'; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; ctx.lineTo(pcx + Math.cos(a) * 9 * lift, py + Math.sin(a) * 9 * lift); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.arc(pcx, py, 3 * lift, 0, TAU); ctx.fill();
    // 시차 각 알약 + 부채꼴 호
    const ang = parAngle(clamp(dV, 15, 60));
    const midY = (py + G.bgY) / 2;
    pill(ctx, pcx + (hR - pcx) / 2 + 74, midY + 2, '시차 약 ' + ang + '°', { bg: '#f26b3a', size: 14, pad: 10 });
    pill(ctx, pcx - 18, py, '연필 ' + Math.round(dV) + ' cm', { align: 'right', bg: 'rgba(80,50,15,.8)', size: 13 });
    // 눈 이름
    txt(ctx, '왼눈', ex1 - 18, G.eyeY - 18, 13, S.eye > 0 ? '#0b3a8f' : '#7a5a3a', { weight: 800, stroke: 'rgba(255,248,230,.8)', sw: 3 });
    txt(ctx, '오른눈', ex2 + 22, G.eyeY - 18, 13, S.eye < 0 ? '#0b3a8f' : '#7a5a3a', { weight: 800, stroke: 'rgba(255,248,230,.8)', sw: 3 });
  }

  /* =========================================================
     장면 2·3: 공전 궤도 모형 + 망원경 시야 / 연주시차 확대계
     ========================================================= */
  const BAND_STARS = (() => { const r = rng(77), a = []; for (let i = 0; i < 30; i++) a.push({ x: r(), y: r(), s: 0.8 + r() * 1.3 }); return a; })();
  const SCOPE_STARS = [[-0.62, -0.45, 2.4], [-0.2, -0.72, 1.7], [0.5, -0.55, 2.2], [0.72, 0.05, 1.6], [0.36, 0.52, 2.6], [-0.3, 0.62, 1.9], [-0.72, 0.25, 2.1], [0.06, 0.2, 1.5], [-0.46, -0.04, 1.4], [0.22, -0.3, 1.6]];

  function earthBall(ctx, x, y, r, sunX, sunY, alpha) {
    const dx = sunX - x, dy = sunY - y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    star(ctx, x, y, r, '#4fa8ff', { halo: 2.3, alpha: 0.55 * (alpha == null ? 1 : alpha) });
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.save(); ctx.clip();
    const oc = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    oc.addColorStop(0, '#7cc4ff'); oc.addColorStop(0.55, '#2f86e6'); oc.addColorStop(1, '#174a96');
    ctx.fillStyle = oc; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.fillStyle = '#4cb36b';
    [[-0.3, -0.2, 0.42, 0.26, -0.5], [0.28, 0.32, 0.34, 0.22, 0.4], [0.12, -0.52, 0.24, 0.14, 0.1], [-0.5, 0.45, 0.2, 0.12, 0.6]].forEach((b) => {
      ctx.beginPath(); ctx.ellipse(x + b[0] * r, y + b[1] * r, b[2] * r, b[3] * r, b[4], 0, TAU); ctx.fill();
    });
    const nt = ctx.createLinearGradient(x + ux * r, y + uy * r, x - ux * r, y - uy * r);
    nt.addColorStop(0, 'rgba(255,255,255,.12)'); nt.addColorStop(0.45, 'rgba(0,0,10,.05)'); nt.addColorStop(1, 'rgba(2,6,22,.82)');
    ctx.fillStyle = nt; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
    ctx.strokeStyle = 'rgba(160,215,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  /* 망원경 접안 화면. xe = 태양 기준 지구의 x / 궤도 반지름 (−1 ~ +1) */
  function scopeView(ctx, cx, cy, r, xe, o) {
    o = o || {};
    const big = r > 60;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    const bg = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
    bg.addColorStop(0, '#12224d'); bg.addColorStop(1, '#030612');
    ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    // 배경 별 (고정)
    SCOPE_STARS.forEach((s) => {
      const bx = cx + s[0] * r, by = cy + s[1] * r;
      if (big) star(ctx, bx, by, s[2] * 1.6, '#bcd4ff', { halo: 3, alpha: 0.9 });
      ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.arc(bx, by, Math.max(0.9, s[2] * (big ? 0.7 : 0.38) * (r / 118 + 0.3)), 0, TAU); ctx.fill();
    });
    const k = 0.68 * r, syy = cy - 0.1 * r;
    if (o.ghosts) {
      o.ghosts.forEach((g) => {
        const gx = cx - k * g.xe;
        star(ctx, gx, syy, r * 0.11, g.color, { halo: 3.2, alpha: 0.95 });
        ctx.strokeStyle = g.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(gx, syy, r * 0.115, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      });
    }
    if (!o.hideS) {
      const sx = cx - k * xe;
      star(ctx, sx, syy, r * 0.1, '#d6e8ff', { halo: 3.4, flare: r * 0.5, alpha: 1 });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, syy, Math.max(2, r * 0.035), 0, TAU); ctx.fill();
      if (big) txt(ctx, 'S', sx + r * 0.14, syy - r * 0.13, 15, '#fff', { weight: 900, stroke: 'rgba(0,0,20,.8)', sw: 4 });
    }
    if (big) {
      ctx.strokeStyle = 'rgba(160,190,255,.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
      const vg = ctx.createRadialGradient(cx, cy, r * 0.62, cx, cy, r);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.7)');
      ctx.fillStyle = vg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    ctx.restore();
    // 테두리
    ctx.save();
    ctx.lineWidth = big ? 7 : 2.2;
    const rg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rg.addColorStop(0, '#c3cbdb'); rg.addColorStop(0.5, '#6b778f'); rg.addColorStop(1, '#2a3248');
    ctx.strokeStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, r + (big ? 3 : 0), 0, TAU); ctx.stroke();
    if (big) { ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }

  function qGeo(L) {
    const Q = L.Q;
    if (L.kind === 'wide') {
      const slots = []; for (let i = 0; i < 4; i++) slots.push({ x: Q.x + 42 + i * 68, y: Q.y + 408, r: 28 });
      return { eye: { x: Q.x + Q.w / 2, y: Q.y + 168, r: 112 }, capY: Q.y + 312, albumY: Q.y + 352, slots, titleY: Q.y + 26 };
    }
    const slots = [[350, 98], [450, 98], [350, 204], [450, 204]].map((s) => ({ x: Q.x + s[0], y: Q.y + s[1], r: 34 }));
    return { eye: { x: Q.x + 150, y: Q.y + 152, r: 104 }, capY: Q.y + 276, albumY: Q.y + 52, slots, titleY: Q.y + 24 };
  }
  const visPhotos = () => { const m = {}; S.photos.forEach((p) => { m[p.label] = p; }); return Object.keys(m).map((k) => m[k]).sort((a, b) => a.t - b.t).slice(-4); };
  const hasLabel = (n) => S.photos.some((p) => p.label === n);
  const earthXY = (L, ang) => { const G = mg(L); return { x: G.cx + G.R * Math.cos(ang * DEG), y: G.sunY - G.R * Math.sin(ang * DEG) }; };

  function panelBG(ctx, R, alpha) {
    ctx.save();
    rr(ctx, R.x, R.y, R.w, R.h, 16);
    ctx.fillStyle = 'rgba(255,255,255,' + (alpha || 0.05) + ')'; ctx.fill();
    ctx.strokeStyle = 'rgba(180,205,255,.2)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(R.x + 16, R.y + 0.8); ctx.lineTo(R.x + R.w - 16, R.y + 0.8); ctx.stroke();
    ctx.restore();
  }

  function drawScopePanel(v, L, t) {
    const ctx = v.ctx, Q = L.Q, g = qGeo(L), e = g.eye;
    panelBG(ctx, Q);
    pill(ctx, Q.x + 14, g.titleY, '🔭 망원경 시야', { align: 'left', bg: 'rgba(14,60,110,.85)' });
    const xe = Math.cos(S.ang * DEG);
    const pairNow = S.pair && A.pairA > 0.5;
    const ghosts = pairNow ? [{ xe: -1, color: '#7dd3fc' }, { xe: 1, color: '#f9a8d4' }] : null;
    scopeView(ctx, e.x, e.y, e.r, xe, { ghosts });
    // 셔터 플래시
    if (A.flash > 0.01) {
      ctx.save(); ctx.globalAlpha = A.flash; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill(); ctx.restore();
    }
    // 설명 라벨
    if (pairNow) {
      txt(ctx, '배경 별은 그대로,', e.x, g.capY - 8, 14, '#e2ecff', { weight: 800 });
      txt(ctx, 'S만 위치가 달라졌어요', e.x, g.capY + 12, 14, '#ffd36b', { weight: 800 });
    } else {
      pill(ctx, e.x, g.capY, '보이는 위치가 달라져요', { bg: 'rgba(20,40,90,.85)', size: 14, border: 'rgba(125,211,252,.55)' });
    }
    // 사진첩
    if (L.kind === 'wide') txt(ctx, '📸 관측 사진첩', Q.x + Q.w / 2, g.albumY, 14, '#bcd0ff', { weight: 800 });
    else txt(ctx, '📸 관측 사진첩', Q.x + 400, g.albumY - 2, 14, '#bcd0ff', { weight: 800 });
    const vp = visPhotos();
    g.slots.forEach((s, i) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(160,190,255,.3)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 2, 0, TAU); ctx.stroke(); ctx.restore();
      const p = vp[i];
      if (p && p.arrived) {
        const pop = easeBack(clamp(p.pop, 0, 1));
        ctx.save(); ctx.translate(s.x, s.y); ctx.scale(pop, pop); ctx.translate(-s.x, -s.y);
        scopeView(ctx, s.x, s.y, s.r, p.xe);
        ctx.restore();
        pill(ctx, s.x, s.y + s.r + 18, p.label + '월', { bg: p.label === 1 ? '#0ea5e9' : p.label === 7 ? '#ec4899' : '#475569', size: 13, pad: 8 });
      }
    });
    // 날아가는 사진
    S.photos.forEach((p) => {
      if (p.arrived || !p.fly) return;
      const f = p.fly, u = easeIO(clamp(f.t / f.dur, 0, 1));
      const mx = (f.from.x + f.to.x) / 2 + f.bend, my = Math.min(f.from.y, f.to.y) - 40;
      const bz = (a, c, b) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
      const x = bz(f.from.x, mx, f.to.x), y = bz(f.from.y, my, f.to.y), r = lerp(f.from.r, f.to.r, u);
      scopeView(ctx, x, y, r, p.xe);
    });
  }

  /* 연주시차 확대계 (3단계) */
  function drawGauge(v, L, t) {
    const ctx = v.ctx, Q = L.Q;
    panelBG(ctx, Q);
    pill(ctx, Q.x + 14, Q.y + 24, '🔍 연주시차 확대계', { align: 'left', bg: 'rgba(14,60,110,.85)' });
    const wide = L.kind === 'wide';
    const c = wide ? { x: Q.x + Q.w / 2, y: Q.y + 232, r: 112 } : { x: Q.x + 152, y: Q.y + 236, r: 108 };
    // 반원 각도계
    ctx.save();
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.arc(c.x, c.y, c.r, Math.PI, 0); ctx.closePath();
    const bgG = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, c.r);
    bgG.addColorStop(0, 'rgba(120,160,255,.10)'); bgG.addColorStop(1, 'rgba(120,160,255,.03)');
    ctx.fillStyle = bgG; ctx.fill();
    ctx.strokeStyle = 'rgba(170,200,255,.5)'; ctx.lineWidth = 2; ctx.stroke();
    for (let a = -90; a <= 90; a += 10) {
      const rad = (a - 90) * DEG, big = a % 30 === 0;
      ctx.strokeStyle = 'rgba(170,200,255,' + (big ? 0.7 : 0.35) + ')'; ctx.lineWidth = big ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(c.x + Math.cos(rad) * (c.r - (big ? 14 : 8)), c.y + Math.sin(rad) * (c.r - (big ? 14 : 8))); ctx.lineTo(c.x + Math.cos(rad) * c.r, c.y + Math.sin(rad) * c.r); ctx.stroke();
    }
    // 부채꼴 (위쪽을 가리키는 두 시선 사이)
    const ha = halfSp.value * DEG, rad0 = -Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.arc(c.x, c.y, c.r * 0.9, rad0 - ha, rad0 + ha); ctx.closePath();
    const fg = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, c.r * 0.9);
    fg.addColorStop(0, 'rgba(255,214,90,.95)'); fg.addColorStop(1, 'rgba(255,170,40,.45)');
    ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 2.5; ctx.stroke();
    // 가운데 점선 (태양–별)
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y - c.r * 0.9); ctx.stroke(); ctx.setLineDash([]);
    star(ctx, c.x, c.y, 8, '#ffe08a', { halo: 3.2 });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, TAU); ctx.fill();
    ctx.restore();
    txt(ctx, '연주시차', c.x, c.y - c.r - 8, 14, '#ffd36b', { weight: 800 });
    // 숫자
    const nd = Math.round(A.distV), settled = Math.abs(A.distV - nd) < 0.04;
    const pTxt = settled ? fmtP(nd) : (1 / A.distV).toFixed(2);
    const dTxt = settled ? String(nd) : A.distV.toFixed(1);
    const lyTxt = (A.distV * 3.26).toFixed(1);
    if (wide) {
      txt(ctx, pTxt + '″', Q.x + Q.w / 2, c.y + 62, 46, '#ffd36b', { weight: 900, font: '"Jua",' + FONT });
      txt(ctx, '연주시차', Q.x + Q.w / 2, c.y + 84, 14, '#bcd0ff', { weight: 700 });
      pill(ctx, Q.x + Q.w / 2, c.y + 122, '별까지의 거리  ' + dTxt + ' pc', { bg: 'rgba(14,60,110,.9)', size: 17, pad: 12, border: 'rgba(125,211,252,.5)' });
      txt(ctx, '= ' + lyTxt + '광년', Q.x + Q.w / 2, c.y + 166, 18, '#e8f0ff', { weight: 800 });
      if (nd === 1 && settled) txt(ctx, '연주시차 1″ ⇒ 1 pc(파섹)', Q.x + Q.w / 2, c.y + 202, 14, '#ffd36b', { weight: 800 });
    } else {
      const nx = Q.x + 330;
      txt(ctx, pTxt + '″', nx, Q.y + 100, 44, '#ffd36b', { weight: 900, font: '"Jua",' + FONT });
      txt(ctx, '연주시차', nx, Q.y + 122, 14, '#bcd0ff', { weight: 700 });
      pill(ctx, nx, Q.y + 160, '거리  ' + dTxt + ' pc', { bg: 'rgba(14,60,110,.9)', size: 17, pad: 12, border: 'rgba(125,211,252,.5)' });
      txt(ctx, '= ' + lyTxt + '광년', nx, Q.y + 204, 18, '#e8f0ff', { weight: 800 });
      if (nd === 1 && settled) txt(ctx, '1″ ⇒ 1 pc(파섹)', nx, Q.y + 236, 14, '#ffd36b', { weight: 800 });
    }
  }

  const halfSp = new SciSim.Spring(30, { stiffness: 120, damping: 11 });

  /* 모형: 태양·궤도·지구·별 S */
  function drawModel(v, L, t, mode) {
    const ctx = v.ctx, M = L.M, G = mg(L), cx = G.cx, sunY = G.sunY, R = G.R, D = v.D;
    const sy = sunY - A.sH, S0 = { x: cx, y: sy };
    pill(ctx, 12, 20, '⚠ 크기·거리·각도는 실제보다 매우 과장했어요', { align: 'left', bg: 'rgba(146,64,14,.92)', size: 13 });
    // 배경 별 띠
    const bandY0 = 56, bandH = 38;
    ctx.save();
    rr(ctx, 12, bandY0, M.w - 24, bandH, 10); ctx.fillStyle = 'rgba(120,160,255,.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(150,180,255,.3)'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#dbe8ff';
    BAND_STARS.forEach((b) => { ctx.globalAlpha = 0.55 + 0.4 * (RM ? 0.5 : Math.sin(t * 2 + b.x * 20)); ctx.beginPath(); ctx.arc(24 + b.x * (M.w - 48), bandY0 + 6 + b.y * (bandH - 12), b.s, 0, TAU); ctx.fill(); });
    ctx.restore();
    txt(ctx, '아주 멀리 있는 별들 (배경)', 20, bandY0 + bandH + 18, 13, '#9db4e8', { align: 'left', weight: 700 });
    const bandMidY = bandY0 + bandH / 2;
    // 궤도
    const wasOrbit = mode === 'orbit';
    ctx.save();
    ctx.strokeStyle = 'rgba(125,211,252,.5)'; ctx.lineWidth = 1.8; ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.arc(cx, sunY, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    [1, 4, 7, 10].forEach((m) => {
      const a = (180 + (m - 1) * 30) * DEG, c = Math.cos(a), s = Math.sin(a);
      ctx.strokeStyle = 'rgba(190,225,255,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + c * (R - 6), sunY - s * (R - 6)); ctx.lineTo(cx + c * (R + 6), sunY - s * (R + 6)); ctx.stroke();
      if (mode !== 'dist' && !(wasOrbit && (m === 1 || m === 7) && hasLabel(m)) && !(S.options && (m === 4 || m === 10))) txt(ctx, m + '월', cx + c * (R + (m === 1 || m === 7 ? 40 : 26)) + (m === 4 || m === 10 ? 20 : 0), sunY - s * (R + (m === 1 || m === 7 ? 40 : 26)) + 5, 13, '#bfe3ff', { weight: 800 });
    });
    ctx.restore();
    const pairShow = mode === 'dist' || S.pair;
    const pairA = mode === 'dist' ? 1 : A.pairA;
    const jan = earthXY(L, ANG_JAN), jul = earthXY(L, ANG_JUL);
    const ePos = mode === 'dist' ? jul : earthXY(L, S.ang);
    const angE = mode === 'dist' ? ANG_JUL : S.ang;
    // 시선: 지구 → 별 S → 배경 띠
    function sight(e, color, alpha) {
      const dx = S0.x - e.x, dy = S0.y - e.y;
      const f = (e.y - bandMidY) / (e.y - S0.y);
      const bx = e.x + dx * f, by = bandMidY;
      const g = ctx.createLinearGradient(e.x, e.y, bx, by);
      g.addColorStop(0, rgba(color, alpha)); g.addColorStop(0.55, rgba(color, alpha * 0.8)); g.addColorStop(1, rgba(color, alpha * 0.18));
      ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = color; ctx.globalAlpha = Math.min(1, alpha + 0.2); ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // 두 번 관측했을 때의 시선과 시차 부채꼴
    if (pairShow && pairA > 0.01) {
      ctx.save(); ctx.globalAlpha = pairA;
      sight(jan, '#7dd3fc', 0.85); sight(jul, '#f9a8d4', 0.85);
      const a1 = Math.atan2(A.sH, -R), a2 = Math.atan2(A.sH, R), rs = Math.min(86, A.sH * 0.42);
      // 시차 전체 (주황)
      if (!S.options) {
        ctx.beginPath(); ctx.moveTo(S0.x, S0.y); ctx.arc(S0.x, S0.y, rs, a1, a2, true); ctx.closePath();
        ctx.fillStyle = 'rgba(242,107,58,.38)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,150,100,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // 태양–별 점선
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(S0.x, S0.y); ctx.lineTo(cx, sunY - 20); ctx.stroke(); ctx.setLineDash([]);
      // 연주시차 (금색 반쪽)
      const hA = mode === 'dist' ? 1 : A.halfA;
      if (hA > 0.01) {
        ctx.globalAlpha = pairA * hA;
        ctx.beginPath(); ctx.moveTo(S0.x, S0.y); ctx.arc(S0.x, S0.y, rs * 1.12, Math.PI / 2, a2, true); ctx.closePath();
        ctx.fillStyle = 'rgba(255,205,60,.82)'; ctx.fill(); ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 1.8; ctx.stroke();
      }
      ctx.restore();
      if (pairA > 0.5 && !S.options) {
        pill(ctx, S0.x - rs * 0.55 - 6, S0.y + rs * 0.95, '시차', { align: 'right', bg: '#f26b3a', size: 14 });
        if ((mode === 'dist' || A.halfA > 0.5) && !S.options) pill(ctx, S0.x + rs * 0.5 + 12, S0.y + rs * 1.32, mode === 'dist' ? '연주시차' : '연주시차 = 시차의 1/2', { align: 'left', bg: '#d99a00', size: 14 });
      }
      // 1 AU
      ctx.save(); ctx.globalAlpha = pairA;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx + 20, sunY + 46); ctx.lineTo(jul.x, sunY + 46); ctx.moveTo(cx + 20, sunY + 41); ctx.lineTo(cx + 20, sunY + 51); ctx.moveTo(jul.x, sunY + 41); ctx.lineTo(jul.x, sunY + 51); ctx.stroke();
      ctx.restore();
      pill(ctx, cx + R / 2 + 26, sunY + 68, '1 AU ≈ 1억 5천만 km', { bg: 'rgba(8,16,40,.8)', size: 13, alpha: pairA });
    } else if (mode === 'orbit') {
      sight(ePos, '#9be7ff', 0.8);
    }
    // 관측한 자리의 지구 (고스트)
    if (wasOrbit) {
      const seen = {};
      S.photos.forEach((p) => { if (!seen[p.label] && p.arrived !== undefined) { seen[p.label] = 1; const e = earthXY(L, p.ang); earthBall(ctx, e.x, e.y, 11, cx, sunY, 0.38); pill(ctx, e.x + (e.x < cx ? -4 : 4), e.y + (Math.abs(e.y - sunY) < 30 ? 28 : e.y > sunY ? 26 : -26), '📸 ' + p.label + '월', { align: e.x < cx ? 'right' : 'left', bg: p.label === 1 ? '#0ea5e9' : p.label === 7 ? '#ec4899' : '#475569', size: 13 }); } });
    } else {
      earthBall(ctx, jan.x, jan.y, 11, cx, sunY, 0.4);
      pill(ctx, jan.x - 6, jan.y + 28, '1월', { align: 'right', bg: '#0ea5e9', size: 13 });
    }
    // 미션 도우미: 초록 맥동 고리
    if (S.ringHint && wasOrbit) {
      [[ANG_JAN, 1], [ANG_JUL, 7]].forEach((r) => {
        if (hasLabel(r[1])) return;
        const e = earthXY(L, r[0]), pu = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.save(); ctx.strokeStyle = 'rgba(34,197,94,' + (0.6 + 0.4 * pu).toFixed(2) + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x, e.y, 20 + pu * 5, 0, TAU); ctx.stroke(); ctx.restore();
      });
    }
    // 이동 궤적 (6개월 공전)
    if (S.trail && wasOrbit) {
      const tr = S.trail;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = tr.a; ctx.lineCap = 'round';
      const n = 22;
      for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = (i + 1) / n;
        const a0 = tr.from + (tr.cur - tr.from) * u0, a1b = tr.from + (tr.cur - tr.from) * u1;
        ctx.strokeStyle = 'rgba(120,200,255,' + (0.05 + 0.5 * u1).toFixed(2) + ')'; ctx.lineWidth = 3 + 7 * u1;
        ctx.beginPath(); ctx.arc(cx, sunY, R, -a0 * DEG, -a1b * DEG, tr.cur >= tr.from); ctx.stroke();
      }
      ctx.restore();
    }
    // 6개월 공전 카운터
    if (S.spin && wasOrbit) {
      const m0 = monthOf(S.spin.from), n = Math.min(6, Math.floor(clamp(S.spin.t / S.spin.dur, 0, 1) * 6 + 0.001));
      pill(ctx, cx, sunY - 62, m0 + '월 → … → ' + (((m0 - 1 + n) % 12) + 1) + '월', { bg: 'rgba(14,60,110,.88)', size: 14, border: 'rgba(125,211,252,.6)' });
    }
    // 태양
    const br = RM ? 1 : 1 + 0.03 * Math.sin(t * TAU / 4);
    star(ctx, cx, sunY, 18 * br, '#ffb52e', { halo: 3.6, alpha: 0.9 });
    ctx.save();
    const sg = ctx.createRadialGradient(cx - 5, sunY - 6, 2, cx, sunY, 18 * br);
    sg.addColorStop(0, '#fffbe6'); sg.addColorStop(0.6, '#ffd34d'); sg.addColorStop(1, '#ff9e2c');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, sunY, 18 * br, 0, TAU); ctx.fill(); ctx.restore();
    txt(ctx, '태양', cx, sunY - 30, 13, '#ffe9a8', { weight: 800, stroke: 'rgba(0,0,20,.7)', sw: 4 });
    // 살아 있는 지구
    if (mode === 'orbit') {
      const lift = S.drag ? 1.15 : 1;
      if (S.drag) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ePos.x + 4, ePos.y + 9, 12, 5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      earthBall(ctx, ePos.x, ePos.y - (S.drag ? 3 : 0), 11 * lift, cx, sunY, 1);
      if (!S.usedDrag && !S.spin && !RM) { const pu = 0.5 + 0.5 * Math.sin(t * 3); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 + 0.35 * pu).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ePos.x, ePos.y, 19 + pu * 5, 0, TAU); ctx.stroke(); ctx.restore(); }
      const lblUp = ePos.y >= sunY - 40;
      if (!S.options) pill(ctx, ePos.x, ePos.y + (lblUp ? -28 : 28), '🌍 지구 · ' + monthOf(S.ang) + '월', { bg: 'rgba(8,40,90,.85)', size: 13 });
    } else {
      earthBall(ctx, jul.x, jul.y, 11, cx, sunY, 1);
      pill(ctx, jul.x + 6, jul.y + 28, '7월', { align: 'left', bg: '#ec4899', size: 13 });
    }
    // 별 S
    const pu = RM ? 1 : 1 + 0.05 * Math.sin(t * 2.4);
    star(ctx, S0.x, S0.y, 14 * pu, '#cfe6ff', { halo: 3.8, flare: 64 * pu });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(S0.x, S0.y, 5.5, 0, TAU); ctx.fill();
    pill(ctx, S0.x + 22, S0.y - 22, '가까운 별 S', { align: 'left', bg: 'rgba(8,16,40,.8)', size: 13, border: 'rgba(207,230,255,.5)' });
    if (mode === 'dist') {
      if (Math.round(A.distV) === 1 && Math.abs(A.distV - 1) < 0.05) pill(ctx, S0.x + 22, S0.y + 6, '연주시차 1″ ⇒ 1 pc(파섹)', { align: 'left', bg: '#d99a00', size: 13 });
      // 끌기 안내
      if (!S.distMoved && !RM) { ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 3); D.arrow(S0.x - 36, S0.y + 14, S0.x - 36, S0.y - 22, { color: '#ffd36b', width: 3, head: 10 }); ctx.restore(); }
    }
    // 연주시차 각 고르기 (미션)
    if (S.options && mode === 'orbit') drawOptions(v, L, t, S0, jan, jul);
  }

  /* 연주시차 각 고르기: 후보 ①②③ */
  function optGeo(L) {
    const G = mg(L), sy = G.sunY - A.sH, S0 = { x: G.cx, y: sy }, jul = earthXY(L, ANG_JUL);
    const a1 = Math.atan2(A.sH, -G.R), a2 = Math.atan2(A.sH, G.R);
    return {
      S0, jul, a1, a2,
      b: [{ x: S0.x - 92, y: S0.y + 66 }, { x: S0.x + 92, y: S0.y + 66 }, { x: jul.x + 30, y: jul.y - 38 }],
    };
  }
  function drawOptions(v, L, t, S0, jan, jul) {
    const ctx = v.ctx, og = optGeo(L), G = mg(L);
    const shake = A.selShake > 0 ? Math.sin(A.selShake * 60) * 6 * A.selShake / 0.3 : 0;
    const col = (i, base) => (S.sel === i && S.selWrong > 0 ? '#ef4444' : base);
    ctx.save();
    // ① 시차 전체
    ctx.save(); if (S.sel === 0) ctx.translate(shake, 0);
    ctx.beginPath(); ctx.moveTo(S0.x, S0.y); ctx.arc(S0.x, S0.y, 120, og.a1, og.a2, true); ctx.closePath();
    ctx.fillStyle = col(0, 'rgba(242,107,58,.30)'); ctx.fill(); ctx.strokeStyle = col(0, '#f26b3a'); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    // ② 별에서 본 태양–7월 지구
    ctx.save(); if (S.sel === 1) ctx.translate(shake, 0);
    ctx.beginPath(); ctx.moveTo(S0.x, S0.y); ctx.arc(S0.x, S0.y, 88, Math.PI / 2, og.a2, true); ctx.closePath();
    ctx.fillStyle = col(1, 'rgba(255,205,60,.75)'); ctx.fill(); ctx.strokeStyle = col(1, '#ffe28a'); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    // ③ 7월 지구에서 본 태양–별
    ctx.save(); if (S.sel === 2) ctx.translate(shake, 0);
    const b1 = Math.PI, b2 = Math.atan2(S0.y - jul.y, S0.x - jul.x);
    ctx.beginPath(); ctx.moveTo(jul.x, jul.y); ctx.arc(jul.x, jul.y, 44, b2, b1, true); ctx.closePath();
    ctx.fillStyle = col(2, 'rgba(56,189,248,.6)'); ctx.fill(); ctx.strokeStyle = col(2, '#7dd3fc'); ctx.lineWidth = 2; ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(jul.x, jul.y); ctx.lineTo(S0.x, S0.y); ctx.moveTo(jul.x, jul.y); ctx.lineTo(G.cx, G.sunY); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.restore();
    // 번호 배지
    og.b.forEach((b, i) => {
      const picked = S.sel === i, wrong = picked && S.selWrong > 0, right = picked && S.pick === 1 && i === 1;
      const pu = RM ? 0 : 0.5 + 0.5 * Math.sin(t * 4 + i);
      ctx.save();
      // 연결선
      const tgt = i === 0 ? { x: S0.x + 70 * Math.cos(og.a1 - 0.05), y: S0.y + 70 * Math.sin(og.a1 - 0.05) } : i === 1 ? { x: S0.x + 54 * Math.cos((Math.PI / 2 + og.a2) / 2), y: S0.y + 54 * Math.sin((Math.PI / 2 + og.a2) / 2) } : { x: og.jul.x - 24, y: og.jul.y - 12 };
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tgt.x, tgt.y); ctx.stroke();
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      ctx.fillStyle = wrong ? '#ef4444' : right ? '#16a34a' : '#ffffff';
      ctx.beginPath(); ctx.arc(b.x, b.y, 17 + pu * 1.5, 0, TAU); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = picked ? '#fff' : '#0ea5e9'; ctx.lineWidth = 3; ctx.stroke();
      txt(ctx, ['①', '②', '③'][i], b.x, b.y + 6, 19, wrong || right ? '#fff' : '#0b3a6f', { weight: 900 });
      ctx.restore();
    });
    txt(ctx, '별에서 본 각', og.b[0].x - 4, og.b[0].y + 36, 13, '#ffcfae', { weight: 800, stroke: 'rgba(0,0,20,.7)', sw: 3 });
    txt(ctx, '별에서 본 각', og.b[1].x + 4, og.b[1].y + 36, 13, '#ffe9a8', { weight: 800, stroke: 'rgba(0,0,20,.7)', sw: 3 });
    txt(ctx, '지구에서 본 각', og.b[2].x, og.b[2].y - 26, 13, '#bdeaff', { weight: 800, stroke: 'rgba(0,0,20,.7)', sw: 3 });
  }

  /* =========================================================
     장면 4: 가까운 별 지도 (카드 놓기)
     ========================================================= */
  const MAP_STARS = [
    { id: 'prox', name: '프록시마 센타우리', con: '켄타우루스자리', p: '0.77', pc: 1.30, ly: '4.2' },
    { id: 'sirius', name: '시리우스', con: '큰개자리', p: '0.38', pc: 2.64, ly: '8.6' },
    { id: 'altair', name: '견우성 알타이르', con: '독수리자리', p: '0.19', pc: 5.13, ly: '16.7' },
    { id: 'vega', name: '직녀성 베가', con: '거문고자리', p: '0.13', pc: 7.68, ly: '25' },
  ];
  const TRAYS = [[2, 0, 3, 1], [3, 1, 0, 2], [1, 3, 2, 0], [2, 3, 1, 0], [3, 0, 1, 2]];
  function mapGeo(L) {
    if (L.kind === 'wide') {
      const xs = [27, 217, 407, 597];
      return { cw: 176, ch: 112, slots: xs.map((x) => ({ x, y: 84 })), tray: xs.map((x) => ({ x, y: 424 })), axis: { x0: 70, y: 300, pcW: 85 }, hdrY: 68, trayY: 410 };
    }
    return { cw: 236, ch: 108, slots: [{ x: 16, y: 74 }, { x: 268, y: 74 }, { x: 16, y: 188 }, { x: 268, y: 188 }], tray: [{ x: 16, y: 566 }, { x: 268, y: 566 }, { x: 16, y: 682 }, { x: 268, y: 682 }], axis: { x0: 36, y: 394, pcW: 56 }, hdrY: 62, trayY: 548 };
  }
  function initMap() {
    const perm = TRAYS[Math.floor(Math.random() * TRAYS.length)];
    S.cards = MAP_STARS.map((st, i) => ({ st, rank: i, home: perm[i], slot: -1, fx: 0, fy: 0, lift: 0, drag: false, off: null, init: false, shake: 0 }));
    S.mapDone = false; S.mapT = 0; S.mapShown = false;
  }
  function cardTarget(L, c) {
    const g = mapGeo(L), s = c.slot >= 0 ? g.slots[c.slot] : g.tray[c.home];
    return { x: s.x / L.vw, y: s.y / L.vh };
  }
  const placedCount = () => S.cards.filter((c) => c.slot >= 0).length;
  const ranksOk = () => S.cards.filter((c) => c.slot >= 0 && c.slot === c.rank).length;
  const mapSolved = () => S.cards.length === 4 && S.cards.every((c) => c.slot === c.rank);
  function autoSolve() { S.cards.forEach((c) => { c.slot = c.rank; }); S.mapDone = true; S.mapT = 5; S.mapShown = true; }

  function drawCard(ctx, L, g, c, scale, alpha) {
    const x = c.fx * L.vw, y = c.fy * L.vh, w = g.cw, h = g.ch, lf = easeOut(c.lift);
    const sc = (1 + 0.06 * lf) * (scale == null ? 1 : scale);
    const sh = c.shake > 0 ? Math.sin(c.shake * 70) * 6 * (c.shake / 0.3) : 0;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.translate(x + w / 2 + sh, y + h / 2 - 3 * lf); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
    ctx.shadowColor = 'rgba(0,10,40,' + (0.35 + 0.15 * lf).toFixed(2) + ')'; ctx.shadowBlur = 8 + 14 * lf; ctx.shadowOffsetY = 2 + 8 * lf;
    rr(ctx, 0, 0, w, h, 16);
    const gl = ctx.createLinearGradient(0, 0, 0, h);
    gl.addColorStop(0, 'rgba(150,185,255,.30)'); gl.addColorStop(1, 'rgba(60,90,170,.22)');
    ctx.fillStyle = '#0d1a3e'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = gl; ctx.fill();
    ctx.strokeStyle = c.slot >= 0 && !c.drag ? 'rgba(125,211,252,.8)' : 'rgba(190,210,255,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(14, 1); ctx.lineTo(w - 14, 1); ctx.stroke();
    // 별 아이콘 (중성 흰색)
    star(ctx, 22, 28, 7, '#dfe9ff', { halo: 3, flare: 17 });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(22, 28, 3, 0, TAU); ctx.fill();
    txt(ctx, c.st.name, 40, 34, 16, '#fff', { align: 'left', weight: 800, maxW: w - 52 });
    txt(ctx, c.st.con, 14, 58, 13, '#aac0f0', { align: 'left', weight: 700 });
    txt(ctx, '연주시차 ' + c.st.p + '″', 14, h - 16, 21, '#ffd36b', { align: 'left', weight: 900, font: '"Jua",' + FONT });
    ctx.restore();
  }

  function drawMap(v, L, t) {
    const ctx = v.ctx, g = mapGeo(L), ax = g.axis;
    pill(ctx, 12, 20, '⚠ 크기·거리·각도는 실제보다 매우 과장했어요', { align: 'left', bg: 'rgba(146,64,14,.92)', size: 13 });
    txt(ctx, S.mapDone ? '별들이 실제 거리로 날아갔어요!' : '① ~ ④ 칸에 가까운 별부터 차례로 놓아요', 16, g.hdrY, 14, '#bcd0ff', { align: 'left', weight: 800 });
    // 칸
    let near = -1;
    S.cards.forEach((c) => { if (c.drag) { let bd = 1e9; g.slots.forEach((s, i) => { const d = Math.hypot(c.fx * L.vw + g.cw / 2 - (s.x + g.cw / 2), c.fy * L.vh + g.ch / 2 - (s.y + g.ch / 2)); if (d < bd && d < Math.max(g.cw, g.ch) * 0.8) { bd = d; near = i; } }); } });
    g.slots.forEach((s, i) => {
      ctx.save();
      rr(ctx, s.x, s.y, g.cw, g.ch, 16);
      ctx.fillStyle = near === i ? 'rgba(125,211,252,.16)' : 'rgba(255,255,255,.035)'; ctx.fill();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = near === i ? '#7dd3fc' : 'rgba(150,190,255,.42)'; ctx.lineWidth = near === i ? 2.5 : 1.6; ctx.stroke(); ctx.setLineDash([]);
      txt(ctx, ['①', '②', '③', '④'][i], s.x + g.cw / 2, s.y + g.ch / 2 + 16, 46, 'rgba(160,190,255,.22)', { weight: 900 });
      if (i === 0) txt(ctx, '가장 가까움', s.x + 12, s.y + 20, 13, '#8fb0ee', { align: 'left', weight: 800 });
      if (i === 3) txt(ctx, '가장 멂', s.x + 12, s.y + 20, 13, '#8fb0ee', { align: 'left', weight: 800 });
      ctx.restore();
    });
    // 거리축
    ctx.save();
    const xEnd = ax.x0 + 8 * ax.pcW;
    ctx.strokeStyle = 'rgba(190,215,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax.x0, ax.y); ctx.lineTo(xEnd + 8, ax.y); ctx.stroke();
    for (let i = 0; i <= 8; i++) {
      const x = ax.x0 + i * ax.pcW;
      ctx.beginPath(); ctx.moveTo(x, ax.y - 6); ctx.lineTo(x, ax.y + 6); ctx.stroke();
      txt(ctx, String(i), x, ax.y + 26, 13, '#cfe0ff', { weight: 700 });
    }
    txt(ctx, 'pc', xEnd + 22, ax.y + 26, 13, '#8fb0ee', { weight: 800 });
    const ly = ax.y + 54;
    ctx.strokeStyle = 'rgba(255,211,107,.55)';
    ctx.beginPath(); ctx.moveTo(ax.x0, ly); ctx.lineTo(ax.x0 + 25 / 3.26 * ax.pcW + 8, ly); ctx.stroke();
    [0, 5, 10, 15, 20, 25].forEach((l) => { const x = ax.x0 + l / 3.26 * ax.pcW; ctx.beginPath(); ctx.moveTo(x, ly - 5); ctx.lineTo(x, ly + 5); ctx.stroke(); txt(ctx, String(l), x, ly + 24, 13, '#ffe08a', { weight: 700 }); });
    txt(ctx, '광년', ax.x0 + 25 / 3.26 * ax.pcW + 34, ly + 24, 13, '#ffd36b', { weight: 800 });
    ctx.restore();
    // 태양
    star(ctx, ax.x0, ax.y, 14, '#ffb52e', { halo: 3.8, alpha: 0.9 });
    ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(ax.x0, ax.y, 7, 0, TAU); ctx.fill();
    txt(ctx, '☀ 태양', ax.x0, ax.y - 24, 13, '#ffe9a8', { weight: 800 });
    // 카드들 (놓인 것 → 들고 있는 것 순서)
    const flying = S.mapDone;
    S.cards.forEach((c, i) => {
      const ord = c.rank;
      const p = flying ? clamp((S.mapT - ord * 0.15) / 0.9, 0, 1) : 0;
      if (p >= 1) return;
      if (p > 0) {
        const s = g.slots[c.slot >= 0 ? c.slot : c.rank];
        const x0 = s.x + g.cw / 2, y0 = s.y + g.ch / 2, x1 = ax.x0 + c.st.pc * ax.pcW, y1 = ax.y, u = easeIO(p);
        const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 40;
        const bx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1, by = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
        const cc = { fx: (bx - g.cw / 2) / L.vw, fy: (by - g.ch / 2) / L.vh, lift: 0, slot: c.slot, drag: false, shake: 0, st: c.st };
        drawCard(ctx, L, g, cc, Math.max(0.12, 1 - 0.88 * u), 1 - u * 0.9);
        star(ctx, bx, by, 6 + 10 * u, '#dfe9ff', { halo: 3.5, flare: 14 + 28 * u, alpha: u });
      } else drawCard(ctx, L, g, c);
    });
    // 날아온 별과 빛
    if (S.mapDone) {
      S.cards.forEach((c) => {
        const p = clamp((S.mapT - c.rank * 0.15) / 0.9, 0, 1);
        if (p < 1) return;
        const sx = ax.x0 + c.st.pc * ax.pcW, sy = ax.y, pu = RM ? 1 : 1 + 0.08 * Math.sin(t * 2.5 + c.rank);
        const age = S.mapT - c.rank * 0.15 - 0.9, pop = easeBack(clamp(age / 0.4, 0, 1));
        star(ctx, sx, sy, 12 * pu * pop, '#dfe9ff', { halo: 3.8, flare: 44 * pop });
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 4.5 * pop, 0, TAU); ctx.fill();
        // 달려가는 빛 알갱이 (일정한 빛의 속도)
        const dist = sx - ax.x0, spd = 120;
        for (let k = 0; k < 3; k++) {
          const ph = (((t * spd) / dist + k / 3) % 1 + 1) % 1;
          if (age < 0.3) continue;
          const lx = sx - dist * ph;
          star(ctx, lx, sy, 4.5, '#ffe08a', { halo: 3, alpha: 0.9 * Math.min(1, ph * 6, (1 - ph) * 6) });
        }
        const above = c.rank % 2 === 0 ? 1 : 1;
        txt(ctx, c.st.name, sx, sy - 58, 13, '#fff', { weight: 800, stroke: 'rgba(0,0,20,.8)', sw: 4, alpha: pop });
        pill(ctx, sx, sy - 38, '빛으로 ' + c.st.ly + '년', { bg: '#d99a00', size: 13, alpha: pop });
        void above;
      });
      if (S.mapT > 3) txt(ctx, '태양에서 가까운 순서', ax.x0 + 4 * ax.pcW, ax.y + 96, 14, '#8fb0ee', { weight: 700, alpha: clamp((S.mapT - 3) / 0.6, 0, 1) });
    }
    // 트레이 표시
    if (!S.mapDone) txt(ctx, '↓ 카드를 끌어서 칸에 놓으세요', 16, g.trayY, 14, '#bcd0ff', { align: 'left', weight: 800 });
  }

  /* =========================================================
     전체 그리기
     ========================================================= */
  function drawFrame(v, L, t) {
    const ctx = v.ctx;
    v.clear();
    ctx.save();
    ctx.globalAlpha = A.sceneA;
    if (S.scene === 'pencil') drawPencilScene(v, L, t);
    else {
      drawSpace(ctx, L, t);
      if (S.scene === 'orbit') { drawModel(v, L, t, 'orbit'); drawScopePanel(v, L, t); }
      else if (S.scene === 'dist') { drawModel(v, L, t, 'dist'); drawGauge(v, L, t); }
      else drawMap(v, L, t);
    }
    particles.draw(ctx);
    ctx.restore();
  }

  /* =========================================================
     동작: 눈 바꾸기 · 관측 · 기록 · 장면 전환
     ========================================================= */
  const eyeName = () => (S.eye > 0 ? '왼눈' : '오른눈');
  function updEyeNote() { $('#eyeNote').innerHTML = '지금 뜬 눈: <b>' + eyeName() + '</b> · <kbd>Space</kbd> 키나 위쪽 화면을 눌러도 돼요.'; }
  function switchEye() {
    if (S.scene !== 'pencil' || !on('eyes')) return;
    A.ghost = { s: A.sEye, life: RM ? 0.6 : 1.2, a: 1 };
    S.eye = -S.eye; S.switches++; S.eyes.add(S.eye);
    tween(A, { sEye: S.eye }, { duration: 0.28, ease: 'outCubic' });
    tween(A, { closeL: S.eye > 0 ? 0 : 1, closeR: S.eye > 0 ? 1 : 0 }, { duration: 0.12 });
    if (S.d <= 20) S.nearAng = parAngle(S.d);
    if (S.d >= 50) S.farAng = parAngle(S.d);
    Sound.tick(); updEyeNote();
  }
  function setPencil(d) {
    d = clamp(Math.round(d), 15, 60);
    if (d === S.d) return;
    S.d = d; S.usedPencil = true;
    sPencil.set(d);
  }
  function setEarth(a, snap) {
    S.angT = a;
    if (snap) S.ang = a;
  }
  function startSpin() {
    if (S.spin || !on('photo')) return;
    S.spin = { t: 0, from: S.ang, dur: RM ? 0.8 : 3 };
    S.trail = { from: S.ang, cur: S.ang, a: 1 };
    S.usedDrag = true; Sound.tone(520, 0.2, 'sine', 0.06);
  }
  function stepMonth(dir) {
    if (S.spin) return;
    const m = monthOf(S.angT) + dir;
    const a = 180 + (m - 1) * 30;
    S.angT = S.angT + angDiff(a, S.angT); S.usedDrag = true; Sound.tick();
  }
  function capture() {
    if (S.spin || !on('photo')) return;
    const L = curL, g = qGeo(L);
    const jan = nearJan(S.ang) || monthOf(S.ang) === 1, jul = nearJul(S.ang) || monthOf(S.ang) === 7;   // 1월·7월 표시에서 멀리 떨어진 곳을 1월·7월로 기록하지 않게 맞춰요
    const label = jan ? 1 : jul ? 7 : monthOf(S.ang);
    const ang = jan ? ANG_JAN : jul ? ANG_JUL : normA(S.ang);
    if (jan || jul) { S.ang = S.angT = ang; }
    S.photos = S.photos.filter((p) => p.label !== label);
    const p = { label, ang, xe: Math.cos(ang * DEG), t: performance.now(), arrived: false, pop: 0 };
    S.photos.push(p);
    const idx = visPhotos().indexOf(p), slot = g.slots[Math.max(0, idx)];
    p.fly = { t: 0, dur: RM ? 0.05 : 0.5, from: { x: g.eye.x, y: g.eye.y, r: g.eye.r }, to: { x: slot.x, y: slot.y, r: slot.r }, bend: (g.eye.x < slot.x ? -30 : 30) };
    A.flash = 1; Sound.tone(1500, 0.05, 'square', 0.04); Sound.tone(900, 0.08, 'square', 0.04, 0.05);
    checkPair();
  }
  function checkPair() {
    const now = hasLabel(1) && hasLabel(7);
    if (now && !S.pair) {
      S.pair = true;
      tween(A, { pairA: 1 }, { duration: 0.8, delay: 0.55, ease: 'outCubic' });
      tween(A, { halfA: 1 }, { duration: 0.8, delay: 1.7, ease: 'outCubic', onDone: () => { Sound.tone(880, 0.12, 'triangle', 0.08); } });
    } else if (!now && S.pair) { S.pair = false; A.pairA = 0; A.halfA = 0; }
  }
  function ensurePair() {
    [1, 7].forEach((n) => { if (!hasLabel(n)) { const ang = n === 1 ? ANG_JAN : ANG_JUL; S.photos.push({ label: n, ang, xe: Math.cos(ang * DEG), t: performance.now() + n, arrived: true, pop: 1 }); } });
    S.pair = true; A.pairA = 1; A.halfA = 1;
  }
  function setDist(d, fromSlider) {
    d = clamp(Math.round(d), 1, 10);
    S.dist = d; S.distT = d; S.distMoved = true;
    if (!fromSlider) sDist.set(d);
  }
  function recordDist() {
    const d = S.dist;
    if (Math.abs(A.distV - d) > 0.15) return;
    if (S.data.some((x) => x.d === d)) { SciSim.toast('이미 기록한 거리예요. 다른 거리에서 재어 보세요.', '', 1500); S.freshD = d; renderTable(); return; }
    S.data.push({ d }); S.data.sort((a, b) => a.d - b.d); S.freshD = d;
    Sound.tick(); renderTable();
    const L = curL, Q = L.Q;
    particles.burst(L.kind === 'wide' ? Q.x + Q.w / 2 : Q.x + 330, L.kind === 'wide' ? Q.y + 300 : Q.y + 110, { count: 10, colors: ['#ffd36b', '#fff4c4', '#7dd3fc'], size: 3.5, speed: 120, gravity: 120, life: 0.7 });
  }
  function renderTable() {
    const rD = $('#rowD'), rP = $('#rowP');
    rD.innerHTML = '<th>거리 (pc)</th>'; rP.innerHTML = '<th>연주시차 (″)</th>';
    if (!S.data.length) { rD.insertAdjacentHTML('beforeend', '<td class="empty">–</td>'); rP.insertAdjacentHTML('beforeend', '<td class="empty">–</td>'); }
    S.data.forEach((x) => {
      const cls = x.d === S.freshD ? ' class="fresh"' : '';
      rD.insertAdjacentHTML('beforeend', '<td' + cls + '>' + x.d + '</td>');
      rP.insertAdjacentHTML('beforeend', '<td' + cls + '>' + fmtP(x.d) + '</td>');
    });
    $('#dataN').textContent = '기록 ' + S.data.length + '개';
  }

  function resetScene() {
    const sc = S.scene;
    if (sc === 'pencil') { S.d = 40; sPencil.set(40); if (S.eye < 0) { S.eye = 1; A.sEye = 1; A.closeL = 0; A.closeR = 1; } A.ghost = null; updEyeNote(); }
    else if (sc === 'orbit') { S.photos = []; S.pair = false; A.pairA = 0; A.halfA = 0; S.ang = S.angT = 270; S.spin = null; S.trail = null; S.sel = null; S.pick = null; }
    else if (sc === 'dist') { S.data = []; S.freshD = null; setDist(1); renderTable(); }
    else if (sc === 'map') { initMap(); }
    Sound.click();
  }

  function enterScene(sc) {
    S.scene = sc;
    A.sceneA = 0; tween(A, { sceneA: 1 }, { duration: 0.35, ease: 'outCubic' });
    $('#sceneLabel').textContent = SCENES[sc];
    uiSig = '';
    if (sc === 'map' && !S.cards.length) initMap();
  }

  /* ---------- 화면 요소 연결 ---------- */
  const sPencil = SciSim.bindRange($('#sPencil'), $('#oPencil'), (v) => v + ' cm', (v) => { S.d = v; S.usedPencil = true; });
  const sDist = SciSim.bindRange($('#sDist'), $('#oDist'), (v) => v + ' pc', (v) => setDist(v, true));
  $('#eyeBtn').addEventListener('click', switchEye);
  $('#monPrev').addEventListener('click', () => stepMonth(-1));
  $('#monNext').addEventListener('click', () => stepMonth(1));
  $('#shotBtn').addEventListener('click', capture);
  $('#spinBtn').addEventListener('click', startSpin);
  $('#recBtn').addEventListener('click', recordDist);
  $('#clearBtn').addEventListener('click', () => { S.data = []; S.freshD = null; renderTable(); Sound.click(); });
  $('#resetBtn').addEventListener('click', resetScene);
  document.querySelectorAll('#sceneTabs button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.freeScene = b.getAttribute('data-scene'); }));
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.key !== ' ') return;
    const tg = e.target;
    if (tg && (tg.tagName === 'BUTTON' || tg.tagName === 'INPUT' || tg.tagName === 'A' || tg.isContentEditable)) return;
    if (S.scene === 'pencil' && on('eyes')) { e.preventDefault(); switchEye(); }
  });

  let uiSig = '', roCache = ['', '', ''];
  function syncUI() {
    const sc = S.scene, free = !!(game && game.free);
    const sig = sc + '|' + free + '|' + (S.photos.length > 0) + '|' + S.freeScene;
    if (sig !== uiSig) {
      uiSig = sig;
      const show = (id, vis) => $('#' + id).classList.toggle('is-off', !vis);
      show('cEye', sc === 'pencil'); show('cPencil', sc === 'pencil'); show('cMonth', sc === 'orbit'); show('cShot', sc === 'orbit');
      show('cDist', sc === 'dist'); show('cRec', sc === 'dist'); show('recCard', sc === 'dist');
      $('#ctrlCard').hidden = sc === 'map'; show('readouts', sc !== 'map');
      show('spinBtn', !!(S.photos.length || free));
      show('sceneTabs', free);
      document.querySelectorAll('#sceneTabs button').forEach((b) => b.classList.toggle('on', b.getAttribute('data-scene') === sc));
      $('#sceneLabel').textContent = SCENES[sc];
    }
    const ro = (i, label, html) => {
      const key = label + '|' + html, n = $('#ro' + i);
      if (roCache[i] === key) return;
      roCache[i] = key;
      n.classList.toggle('is-off', !label);
      if (label) { n.querySelector('.label').textContent = label; n.querySelector('.value').innerHTML = html; }
    };
    if (sc === 'pencil') { ro(0, '연필까지 거리', S.d + '<small>cm</small>'); ro(1, '시차 각', parAngle(S.d) + '<small>°</small>'); ro(2, '', ''); }
    else if (sc === 'orbit') { ro(0, '지구의 위치', monthOf(S.ang) + '<small>월</small>'); ro(1, '관측 사진', S.photos.length + '<small>장</small>'); ro(2, '', ''); }
    else if (sc === 'dist') { ro(0, '별까지의 거리', S.dist + '<small>pc</small>'); ro(1, '연주시차', fmtP(S.dist) + '<small>″</small>'); ro(2, '광년으로', lyOf(S.dist) + '<small>광년</small>'); }
  }

  /* ---------- 캔버스 입력 ---------- */
  let curL = LAYOUTS.wide;
  function earthHit(p, L) { const e = earthXY(L, S.ang); return Math.hypot(p.x - e.x, p.y - e.y) < 32; }
  function starHit(p, L) { const G = mg(L); return Math.hypot(p.x - G.cx, p.y - (G.sunY - A.sH)) < 38; }
  function pencilHit(p, L) { const G = pencilGeo(L); return Math.hypot(p.x - G.cx, p.y - (G.eyeY - A.dV * G.k)) < 30; }
  function optHit(p, L) { if (!S.options || S.scene !== 'orbit') return -1; const og = optGeo(L); return og.b.findIndex((b) => Math.hypot(p.x - b.x, p.y - b.y) < 28); }
  function cardAt(p, L) {
    const g = mapGeo(L);
    for (let i = S.cards.length - 1; i >= 0; i--) {
      const c = S.cards[i], x = c.fx * L.vw, y = c.fy * L.vh;
      if (p.x >= x && p.x <= x + g.cw && p.y >= y && p.y <= y + g.ch) return c;
    }
    return null;
  }
  const mapLocked = () => S.mapDone && !(game && game.free);
  function grabAt(p, L) {
    switch (S.scene) {
      case 'pencil': return on('pencil') && pencilHit(p, L);
      case 'orbit': return optHit(p, L) >= 0 || (on('orbit') && !S.options && earthHit(p, L));
      case 'dist': return on('distance') && starHit(p, L);
      case 'map': return !mapLocked() && !!cardAt(p, L);
    }
    return false;
  }
  function pickOption(i) {
    if (S.pick === 1) return;
    S.sel = i; Sound.click();
    if (i === 1) { S.pick = 1; S.selWrong = 0; Sound.tone(880, 0.12, 'triangle', 0.08); particles.burst(optGeo(curL).b[1].x, optGeo(curL).b[1].y, { count: 12, size: 3.5, colors: ['#ffd36b', '#fff4c4'] }); return; }
    S.pick = null; S.selWrong = 0.7; A.selShake = 0.3; Sound.fail();
    SciSim.toast(i === 0 ? '이 각은 6개월 간격 관측의 시차 전체예요. 연주시차는 그 절반이에요.' : '이 각은 지구에서 잰 각이에요. 연주시차는 별에서 보았을 때의 각이에요.', 'bad', 3200);
  }
  function dropCard(c, L) {
    const g = mapGeo(L), cx = c.fx * L.vw + g.cw / 2, cy = c.fy * L.vh + g.ch / 2;
    let best = -1, bd = 1e9;
    g.slots.forEach((s, i) => { const d = Math.hypot(cx - (s.x + g.cw / 2), cy - (s.y + g.ch / 2)); if (d < bd) { bd = d; best = i; } });
    const prev = c.slot;
    if (best >= 0 && bd < Math.max(g.cw, g.ch) * 0.8) {
      const other = S.cards.find((o) => o !== c && o.slot === best);
      if (other) other.slot = prev;      // 자리 바꾸기 (처음 칸이 없으면 트레이로)
      c.slot = best;
      Sound.tick();
    } else c.slot = -1;
    S.cards.forEach((x) => { x.drag = false; });
  }
  function attach(v, L) {
    SciSim.pointer(v, {
      hover(p) { return grabAt(p, L) ? 'grab' : S.scene === 'pencil' && p.y < L.U.h ? 'pointer' : null; },
      down(p) {
        curL = L;
        if (!grabAt(p, L)) return false;
        const sc = S.scene;
        if (sc === 'pencil') { S.dragPencil = true; setPencil((pencilGeo(L).eyeY - p.y) / pencilGeo(L).k); return true; }
        if (sc === 'orbit') {
          const o = optHit(p, L);
          if (o >= 0) { pickOption(o); return false; }
          if (S.spin) { S.spin = null; }
          S.drag = true; S.usedDrag = true; return true;
        }
        if (sc === 'dist') { S.dragS = true; S.distMoved = true; return true; }
        if (sc === 'map') {
          const c = cardAt(p, L);
          c.drag = true; c.off = { x: p.x - c.fx * L.vw, y: p.y - c.fy * L.vh }; c._prev = c.slot;
          S.cards.splice(S.cards.indexOf(c), 1); S.cards.push(c);
          Sound.click(); return true;
        }
        return false;
      },
      move(p) {
        const sc = S.scene;
        if (sc === 'pencil') { const G = pencilGeo(L); setPencil((G.eyeY - p.y) / G.k); }
        else if (sc === 'orbit') {
          const G = mg(L); let a = normA(Math.atan2(G.sunY - p.y, p.x - G.cx) / DEG);
          if (nearJan(a)) a = ANG_JAN; else if (nearJul(a)) a = ANG_JUL;
          S.angT = S.ang + angDiff(a, S.ang);
        } else if (sc === 'dist') {
          const G = mg(L), d = clamp(1 + ((G.sunY - p.y) - 140) / 19, 1, 10);
          S.distT = d; S.dist = Math.round(d); sDist.set(S.dist);
        } else if (sc === 'map') {
          const c = S.cards[S.cards.length - 1];
          if (c && c.drag) { c.fx = (p.x - c.off.x) / L.vw; c.fy = (p.y - c.off.y) / L.vh; }
        }
      },
      up() {
        const sc = S.scene;
        if (sc === 'pencil') S.dragPencil = false;
        else if (sc === 'orbit') S.drag = false;
        else if (sc === 'dist') { S.dragS = false; setDist(S.distT); }
        else if (sc === 'map') { const c = S.cards[S.cards.length - 1]; if (c && c.drag) dropCard(c, L); }
      },
    });
    // 위쪽 화면을 눌러도 눈 바꾸기
    v.canvas.addEventListener('click', (e) => {
      if (S.scene !== 'pencil' || !on('eyes')) return;
      const p = v.toLocal(e);
      if (p.y < L.U.h) switchEye();
    });
    if (L.kind === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc && grabAt(v.toLocal(tc), L)) e.preventDefault();
      }, { passive: false });
    }
  }
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#070d1f' });
    v.D = SciSim.draw(v.ctx);
    attach(v, L);
    return { v, L };
  });
  A.halfA = 0;

  /* ---------- 미션 도우미 ---------- */
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  function resetPencil() {
    S.d = 40; sPencil.set(40); A.dV = 40; S.eye = 1; A.sEye = 1; A.closeL = 0; A.closeR = 1;
    S.switches = 0; S.eyes = new Set([1]); S.nearAng = null; S.farAng = null; A.ghost = null; updEyeNote();
  }
  function resetOrbit() {
    S.photos = []; S.pair = false; A.pairA = 0; A.halfA = 0; S.ang = S.angT = 270; S.spin = null; S.trail = null;
    S.options = false; S.sel = null; S.pick = null; S.usedDrag = false; S.ringHint = false; A.sH = S2_H;
  }
  function resetDist() {
    S.data = []; S.freshD = null; S.dist = 1; S.distT = 1; sDist.set(1); A.distV = 1; halfSp.value = 30; halfSp.target = 30; S.distMoved = false; renderTable();
  }

  /* ---------- 퀴즈·노트용 그림 (SVG) ---------- */
  const FIG_FONT = FONT.replace(/"/g, '');
  const svgHead = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FIG_FONT + '\'>';
  const FIG = {};
  FIG.parallax = svgHead(320, 150, '가까운 물체는 시차가 크고 먼 물체는 시차가 작은 그림') +
    '<rect width="320" height="150" rx="12" fill="#0e1838"/>' +
    '<g stroke="#7dd3fc" stroke-width="2"><line x1="70" y1="136" x2="110" y2="64"/><line x1="130" y1="136" x2="110" y2="64"/></g>' +
    '<g stroke="#7dd3fc" stroke-width="2"><line x1="210" y1="136" x2="250" y2="22"/><line x1="270" y1="136" x2="250" y2="22"/></g>' +
    '<circle cx="110" cy="64" r="7" fill="#ffd36b"/><circle cx="250" cy="22" r="7" fill="#ffd36b"/>' +
    '<text x="100" y="52" text-anchor="end" font-size="14" font-weight="700" fill="#ffe9a8">가까운 물체</text>' +
    '<text x="240" y="16" text-anchor="end" font-size="14" font-weight="700" fill="#ffe9a8">먼 물체</text>' +
    '<text x="100" y="148" text-anchor="middle" font-size="13" font-weight="700" fill="#cfe0ff">시차 큼</text>' +
    '<text x="240" y="148" text-anchor="middle" font-size="13" font-weight="700" fill="#cfe0ff">시차 작음</text></svg>';
  FIG.annual = svgHead(320, 190, '지구 공전 궤도의 양쪽 끝에서 가까운 별을 볼 때 생기는 연주시차') +
    '<rect width="320" height="190" rx="12" fill="#070d24"/>' +
    '<ellipse cx="160" cy="146" rx="96" ry="30" fill="none" stroke="#7dd3fc" stroke-opacity=".55" stroke-dasharray="3 5"/>' +
    '<polygon points="160,30 64,146 256,146" fill="#f26b3a" fill-opacity=".14"/>' +
    '<g stroke="#9be7ff" stroke-width="1.6"><line x1="160" y1="30" x2="64" y2="146"/><line x1="160" y1="30" x2="256" y2="146"/></g>' +
    '<line x1="160" y1="30" x2="160" y2="146" stroke="#fff" stroke-dasharray="5 4"/>' +
    '<path d="M160,70 L160,52 M160,52" /><path d="M160,66 A36,36 0 0 0 135,57" fill="none" stroke="none"/>' +
    '<path d="M160,30 L160,74 A44,44 0 0 1 128,60 Z" fill="#fff" fill-opacity="0"/>' +
    '<path d="M160,30 L160,76 L193,68 Z" fill="#ffcc3d" fill-opacity=".9"/>' +
    '<circle cx="160" cy="146" r="12" fill="#ffc933"/><circle cx="64" cy="146" r="7" fill="#3b8fe0"/><circle cx="256" cy="146" r="7" fill="#3b8fe0"/>' +
    '<circle cx="160" cy="30" r="6" fill="#fff"/>' +
    '<text x="172" y="24" font-size="14" font-weight="700" fill="#fff">별 S</text>' +
    '<text x="160" y="176" text-anchor="middle" font-size="13" font-weight="700" fill="#ffe9a8">태양</text>' +
    '<text x="64" y="172" text-anchor="middle" font-size="13" font-weight="700" fill="#9be7ff">1월</text>' +
    '<text x="256" y="172" text-anchor="middle" font-size="13" font-weight="700" fill="#f9a8d4">7월</text>' +
    '<text x="204" y="94" font-size="13" font-weight="800" fill="#ffd36b">연주시차</text></svg>';
  FIG.table = svgHead(320, 120, '별까지의 거리와 연주시차의 관계표') +
    '<rect width="320" height="120" rx="12" fill="#0e1838"/>' +
    [['거리', '1 pc', '2 pc', '4 pc', '10 pc'], ['연주시차', '1″', '0.5″', '0.25″', '0.1″']].map((row, r) => row.map((c, i) =>
      '<text x="' + (i === 0 ? 14 : 94 + (i - 1) * 62) + '" y="' + (46 + r * 44) + '" text-anchor="' + (i === 0 ? 'start' : 'middle') + '" font-size="' + (i === 0 ? 14 : 16) + '" font-weight="800" fill="' + (i === 0 ? '#9db4e8' : r ? '#ffd36b' : '#fff') + '">' + c + '</text>').join('')).join('') +
    '<line x1="10" y1="62" x2="310" y2="62" stroke="#3a4a7a"/></svg>';

  /* ---------- 단계별 학습 ---------- */
  game = SciSim.game({
    simId: 'm2-star-parallax',
    mount: '#game',
    badge: '별 거리 측량사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      eyes: '👁 눈 바꾸기', pencil: '✏️ 연필 거리', orbit: '🌍 공전 궤도 모형', scope: '🔭 망원경 시야',
      photo: '📸 관측 기록', distance: '↕ 별까지의 거리', record: '📋 측정 기록 표', cards: '🗂 실제 별 카드',
    },
    onFeatures(set) { FEAT = set; },
    onMissionStart() { S.options = false; S.ringHint = false; },
    levels: [
      /* ---------- STEP 1 · 관찰 ---------- */
      {
        title: '보는 위치가 바뀌면', short: '시차', icon: '✏️', phase: '관찰',
        features: ['eyes', 'pencil'],
        intro: '<p class="si-q">❓ 탐구 질문: 별은 너무 멀어서 줄자로 잴 수 없어요. 천문학자들은 별까지의 거리를 어떻게 알아냈을까?</p>' +
          '<p>먼저 팔을 뻗어 연필을 세우고, 왼눈과 오른눈을 번갈아 감으며 연필이 어떻게 보이는지 관찰해 봐요.</p>',
        setup() { resetPencil(); },
        recap: '보는 위치가 바뀌면 가까운 물체가 먼 배경에 대해 움직여 보여요(시차). 가까울수록 시차가 커요.',
        summary: '<p><b>시차</b>: 관측하는 위치에 따라 물체의 방향이 달라져 보이는 각</p><ul><li>가까운 물체일수록 시차가 크다.</li><li>아주 먼 배경은 거의 움직이지 않아 비교의 기준이 된다.</li></ul><div class="note-fig">' + FIG.parallax + '</div>',
        missions: [
          {
            title: '👁 번갈아 감아 보기',
            goal: '👁 <b>눈 바꾸기</b>를 눌러 왼눈과 오른눈으로 번갈아 보세요. 연필과 먼 산을 비교해 보세요.',
            setup() { S.switches = 0; S.eyes = new Set([S.eye]); },
            check: () => S.switches >= 4 && S.eyes.size >= 2,
            hold: 0.3,
            status: () => '눈 바꾼 횟수 <b>' + Math.min(S.switches, 4) + '/4</b> · 지금 뜬 눈: <b>' + eyeName() + '</b>',
            hint: '버튼을 여러 번 누르며 연필이 먼 산에 대해 어느 쪽으로 움직여 보이는지 보세요.',
            explain: '보는 위치(왼눈 ↔ 오른눈)가 바뀌자 가까운 연필은 먼 배경에 대해 위치가 달라져 보였지만, 아주 먼 산은 그대로였어요. 관측하는 위치에 따라 물체의 방향이 달라져 보이는 각을 <b>시차</b>라고 해요.',
          },
          {
            title: '📏 가까울 때와 멀 때',
            goal: '연필을 <b>20 cm 이하</b>로 가깝게 두고 눈을 바꿔 보고, <b>50 cm 이상</b>으로 멀게 두고 눈을 바꿔 보세요.',
            setup() { S.nearAng = null; S.farAng = null; },
            check: () => S.nearAng != null && S.farAng != null,
            hold: 0.3,
            status: () => '가까울 때 ' + (S.nearAng != null ? '✅ 약 ' + S.nearAng + '°' : '⬜ —') + ' · 멀 때 ' + (S.farAng != null ? '✅ 약 ' + S.farAng + '°' : '⬜ —'),
            hint: '슬라이더로 연필을 얼굴 쪽으로 당긴 뒤 눈을 바꿔 보고, 멀리 민 뒤 다시 바꿔 보세요.',
            explain: '연필이 가까울수록 움직여 보이는 정도(시차)가 컸어요. 20 cm에서는 약 18°, 50 cm에서는 약 7°였어요.',
          },
          {
            type: 'quiz', title: '❓ 거리와 시차',
            goal: '관측 위치가 바뀔 때, 물체까지의 거리와 시차 사이의 관계로 옳은 것은?',
            choices: ['물체가 가까울수록 시차가 크다', '물체가 멀수록 시차가 크다', '물체까지의 거리와 시차는 관계가 없다', '물체가 클수록 시차가 크다'],
            answer: 0,
            feedback: [null, '연필을 멀리 두었을 때 더 많이 움직여 보였나요?', '거리를 바꾸자 움직여 보이는 정도가 달라졌어요.', '연필의 크기는 바꾸지 않았어요. 바꾼 것은 거리예요.'],
            explain: '가까운 물체일수록 시차가 크고, 먼 물체일수록 시차가 작아요. 그러니 시차를 재면 거리를 알아낼 수 있어요!',
          },
        ],
      },
      /* ---------- STEP 2 · 모형 ---------- */
      {
        title: '6개월 간격으로 별 관측하기', short: '연주시차', icon: '🌍', phase: '모형',
        features: ['orbit', 'scope', 'photo'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 보는 위치가 바뀌면 가까운 물체에 시차가 생기는 것을 관찰했어요.</div>' +
          '<p>별을 볼 때 \'두 눈\' 역할을 하는 것은 태양 주위를 공전하는 <b>지구</b>예요. 6개월이 지나면 지구는 공전 궤도의 반대편에 있어요. 같은 별을 6개월 간격으로 관측해 봐요.</p>',
        setup() { resetOrbit(); },
        recap: '6개월 간격으로 관측한 별의 시차의 1/2을 연주시차라고 해요. 연주시차는 지구가 공전하기 때문에 생겨요.',
        summary: '<p><b>연주시차</b>: 지구 공전 궤도의 양 끝(6개월 간격)에서 같은 별을 볼 때 생기는 시차의 1/2</p><ul><li>별에서 볼 때 태양과 지구가 벌어진 각</li><li>지구가 공전하기 때문에 생긴다 (지구 공전의 증거)</li><li>단위 ″(초): 1″ = 1/3600°</li></ul><div class="note-fig">' + FIG.annual + '</div>',
        missions: [
          {
            title: '📸 1월과 7월에 관측하기',
            goal: '지구를 <b>1월</b> 위치에 두고 📸 관측 기록을 누른 뒤, 6개월 뒤인 <b>7월</b> 위치에서 다시 기록하세요.',
            setup() { S.ringHint = true; },
            check: () => hasLabel(1) && hasLabel(7),
            hold: 1.2,
            status: () => chk(hasLabel(1), '1월 관측') + ' · ' + chk(hasLabel(7), '7월 관측'),
            hint: '지구를 끌어 궤도 위 1월 표시에 맞추고 📸를 누르세요. ▶ 6개월 공전 버튼으로 7월까지 옮겨도 돼요.',
            explain: '지구가 공전 궤도의 반대편으로 옮겨 가자, 가까운 별 S가 먼 배경 별들에 대해 위치가 달라져 보였어요. 두 관측 방향 사이의 각이 별 S의 시차예요.',
          },
          {
            type: 'quiz', title: '❓ 왜 달라 보였을까?',
            goal: '6개월 간격으로 관측한 별 S의 위치가 배경 별에 대해 달라져 보인 까닭은?',
            setup() { ensurePair(); },
            choices: ['지구가 태양 주위를 공전해 관측하는 위치가 달라졌기 때문', '지구가 하루에 한 바퀴씩 자전하기 때문', '별 S가 6개월 동안 실제로 움직였기 때문', '계절에 따라 별빛의 색이 바뀌기 때문'],
            answer: 0,
            feedback: [null, '자전은 하루 동안 별이 뜨고 지는 일주 운동을 만들어요. 6개월 간격으로 생기는 위치 차이는 공전 때문이에요.', '배경 별은 그대로인데 S만 달라 보였어요. 바뀐 것은 보는 위치(지구)예요.', '바뀐 것은 색이 아니라 보이는 위치예요.'],
            explain: '연주시차는 지구가 공전하기 때문에 생겨요. 그래서 연주시차는 지구가 공전한다는 증거예요. 1838년 독일의 베셀이 처음으로 별(백조자리 61)의 연주시차를 측정했어요.',
          },
          {
            title: '🔎 연주시차 각 찾기',
            goal: '모형에 표시된 각 ①, ②, ③ 가운데 <b>연주시차</b>를 찾아 탭하세요.',
            setup() {
              ensurePair(); S.spin = null; S.trail = null; S.ang = S.angT = ANG_JUL; S.sel = null; S.pick = null; S.selWrong = 0; S.options = true; A.halfA = 0;
            },
            check: () => S.pick === 1,
            hold: 0.4,
            status: () => '고른 각: <b>' + (S.sel == null ? '—' : ['①', '②', '③'][S.sel]) + '</b>',
            hint: '태양과 별을 잇는 점선이 시차를 반으로 나눠요.',
            explain: '연주시차는 시차의 1/2, 곧 별에서 볼 때 태양과 지구가 벌어진 각이에요. 실제 연주시차는 아주 작아서 ″(초) 단위를 써요. 1″는 1°의 1/3600로, 약 2 km 떨어진 곳에 있는 1 cm 크기의 물체를 볼 때의 각과 비슷해요.',
          },
        ],
      },
      /* ---------- STEP 3 · 탐구 ---------- */
      {
        title: '연주시차로 거리 구하기', short: '거리 구하기', icon: '📏', phase: '탐구',
        features: ['distance', 'record'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 6개월 간격 관측으로 연주시차를 찾았어요.</div>' +
          '<p>별까지의 거리가 달라지면 연주시차는 어떻게 될까요? 별 S를 멀리 옮기며 연주시차를 재어 기록해 봐요.</p>',
        setup() { resetDist(); },
        recap: '연주시차는 별까지의 거리에 반비례해요. 연주시차가 1″인 별까지의 거리가 1 pc이고, 연주시차가 1/2, 1/10이면 거리는 2배, 10배예요.',
        summary: '<ul><li>별까지의 거리가 멀수록 연주시차가 작다 (반비례).</li><li><b>1 pc(파섹)</b>: 연주시차가 1″인 별까지의 거리 ≈ 3.26광년 ≈ 3×10<sup>13</sup> km</li><li><b>1광년</b>: 빛이 1년 동안 가는 거리 ≈ 9.5×10<sup>12</sup> km</li><li>예) 0.5″ → 2 pc, 0.25″ → 4 pc, 0.1″ → 10 pc</li></ul><div class="note-fig">' + FIG.table + '</div>',
        missions: [
          {
            title: '📍 거리를 바꾸며 기록하기',
            goal: '별 S를 옮겨 가며 서로 다른 거리 <b>4곳 이상</b>(1 pc 포함)에서 연주시차를 📍 기록하세요.',
            check: () => S.data.length >= 4 && S.data.some((x) => x.d === 1),
            hold: 0.5,
            status: () => '기록 <b>' + Math.min(S.data.length, 4) + '/4</b> · ' + chk(S.data.some((x) => x.d === 1), '1 pc'),
            hint: '1, 2, 4, 10 pc처럼 2배·4배·10배가 되는 거리를 기록하면 규칙이 잘 보여요.',
            explain: '별이 멀어질수록 연주시차가 작아졌어요. 거리가 2배가 되면 연주시차는 1/2, 4배가 되면 1/4, 10배가 되면 1/10이 돼요. 연주시차는 별까지의 거리에 <b>반비례</b>해요.',
          },
          {
            type: 'quiz', title: '❓ 0.5″인 별',
            goal: '연주시차가 1″인 별까지의 거리를 <b>1 pc(파섹)</b>이라고 해요. 연주시차가 <b>0.5″</b>인 별까지의 거리는?',
            choices: ['0.5 pc', '1 pc', '2 pc', '5 pc'],
            answer: 2,
            feedback: ['연주시차가 작을수록 별은 가까울까요, 멀까요? 표를 보세요.', '1 pc은 연주시차가 1″일 때예요.', null, '연주시차가 1/2이 되면 거리는 몇 배가 되었나요?'],
            explain: '연주시차가 1″의 1/2이므로 거리는 1 pc의 2배인 2 pc이에요. 1 pc은 약 3.26광년(약 30조 km)이고, 1광년은 빛이 1년 동안 가는 거리(약 9조 5천억 km)예요.',
          },
          {
            type: 'quiz', title: '❓ 어느 별이 더 멀까?',
            goal: '별 A의 연주시차는 0.1″, 별 B는 0.2″예요. 옳은 것은?',
            choices: ['A가 B보다 2배 멀리 있다 (A 10 pc, B 5 pc)', 'B가 A보다 2배 멀리 있다', '두 별까지의 거리는 같다', '연주시차로는 두 별의 거리를 비교할 수 없다'],
            answer: 0,
            feedback: [null, '연주시차가 큰 별이 더 가까워요.', '연주시차가 다르면 거리도 달라요.', '연주시차가 작을수록 멀리 있다는 규칙으로 비교할 수 있어요.'],
            explain: '0.1″는 1″의 1/10이므로 A는 10 pc, 0.2″는 1/5이므로 B는 5 pc 떨어져 있어요. 연주시차가 작을수록 별이 멀리 있어요.',
          },
        ],
      },
      /* ---------- STEP 4 · 적용 ---------- */
      {
        title: '가까운 별까지의 거리', short: '가까운 별', icon: '🗺️', phase: '적용',
        features: ['cards'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 연주시차가 작을수록 별이 멀다는 것과 1 pc의 뜻을 알았어요.</div>' +
          '<p>천문학자들이 실제로 잰 연주시차로, 태양 가까이에 있는 별들까지의 거리를 비교해 봐요.</p>',
        setup() { initMap(); },
        recap: '실제로 잰 연주시차로 가까운 별까지의 거리를 비교하고 구할 수 있어요. 너무 먼 별은 연주시차가 작아 재기 어려워요.',
        summary: '<ul><li>프록시마 센타우리 0.77″ → 약 1.3 pc(4.2광년)</li><li>시리우스 0.38″ → 약 2.6 pc(8.6광년)</li><li>직녀성(베가) 0.13″ → 약 7.7 pc(25광년)</li><li>아주 먼 별은 연주시차가 너무 작아 측정하기 어렵다.</li></ul>',
        missions: [
          {
            title: '🗂 가까운 순서로 놓기', manual: true,
            goal: '연주시차를 보고 별 카드 4장을 <b>태양에서 가까운 순서</b>대로 칸 ①~④에 놓은 뒤 ✔ 확인하기를 누르세요.',
            setup() { if (!S.cards.length || S.mapDone) initMap(); },
            check() {
              const n = placedCount();
              if (n < 4) return '카드 4장을 모두 놓아 주세요.';
              if (mapSolved()) return true;
              return ranksOk() + '장이 제자리에 있어요. 연주시차가 클수록 가까워요!';
            },
            status: () => '놓은 카드 <b>' + placedCount() + '/4</b>',
            hint: '연주시차가 1″에 가까울수록 1 pc에 가까워요. 0.38″는 0.5″(2 pc)보다 작으니 2 pc보다 조금 더 멀어요.',
            explain: '프록시마 센타우리(약 1.3 pc, 4.2광년) → 시리우스(약 2.6 pc, 8.6광년) → 견우성 알타이르(약 5.1 pc, 16.7광년) → 직녀성 베가(약 7.7 pc, 25광년) 순으로 가까워요. 태양 다음으로 가까운 별도 1 pc보다 멀리 있어요!',
          },
          {
            type: 'quiz', title: '❓ 연주시차로 재기 어려운 별',
            goal: '북극성의 연주시차는 약 0.0075″로 매우 작아요. 이처럼 연주시차로 거리를 정확히 구하기 어려운 별은?',
            setup() { if (!mapSolved()) autoSolve(); },
            choices: ['너무 멀리 있어서 연주시차가 아주 작은 별', '아주 가까이 있는 별', '아주 밝게 보이는 별', '붉은색으로 보이는 별'],
            answer: 0,
            feedback: [null, '가까운 별은 연주시차가 커서 재기 쉬워요.', '밝기는 연주시차를 재는 것과 관계가 없어요.', '색은 연주시차와 관계가 없어요.'],
            explain: '별이 멀수록 연주시차가 작아져 정확히 재기 어려워요. 그래서 연주시차는 비교적 가까운 별의 거리를 구하는 데 쓰고, 아주 먼 별은 별의 밝기를 이용하는 방법 등도 함께 써요(다음 차시).',
          },
        ],
      },
    ],
  });

  /* ---------- 갱신 · 시작 ---------- */
  function update(dt, t) {
    if (game && !game.free) S.freeScene = null;
    const sc = sceneNow();
    if (sc !== S.scene) enterScene(sc);
    A.dV = approach(A.dV, S.d, dt, 14);
    if (A.ghost) { A.ghost.life -= dt; A.ghost.a = clamp(A.ghost.life / 0.4, 0, 1); if (A.ghost.life <= 0) A.ghost = null; }
    A.flash = approach(A.flash, 0, dt, 9);
    // 지구 (끌기 · 6개월 공전)
    if (S.spin) {
      const sp = S.spin; sp.t += dt;
      const u = clamp(sp.t / sp.dur, 0, 1);
      S.ang = S.angT = sp.from + 180 * easeIO(u);
      if (S.trail) S.trail.cur = S.ang;
      if (u >= 1) { S.spin = null; if (nearJan(S.ang)) S.ang = S.angT = ANG_JAN + Math.round((S.ang - ANG_JAN) / 360) * 360; }
    } else {
      const df = angDiff(S.angT, S.ang);
      if (Math.abs(df) < 0.04) S.ang = S.angT; else S.ang += df * (1 - Math.exp(-dt * (S.drag ? 26 : 12)));
      if (S.trail) { S.trail.a -= dt / 1.4; if (S.trail.a <= 0) S.trail = null; }
    }
    // 사진 날아가기
    S.photos.forEach((p) => {
      if (!p.arrived && p.fly) {
        p.fly.t += dt;
        if (p.fly.t >= p.fly.dur) {
          p.arrived = true; p.pop = 0; Sound.tick();
          particles.burst(p.fly.to.x, p.fly.to.y, { count: 8, size: 3, speed: 90, gravity: 0, life: 0.5, colors: ['#9be7ff', '#fff'] });
        }
      } else if (p.pop < 1) p.pop = Math.min(1, p.pop + dt * 3.2);
    });
    // 거리 · 부채꼴
    A.distV = approach(A.distV, S.distT, dt, S.dragS ? 26 : 11);
    halfSp.target = 30 / Math.max(1, A.distV); halfSp.update(dt);
    const shTarget = S.scene === 'dist' ? hOf(A.distV) : S2_H;
    A.sH = approach(A.sH, shTarget, dt, 9);
    if (S.selWrong > 0) S.selWrong = Math.max(0, S.selWrong - dt);
    if (A.selShake > 0) A.selShake = Math.max(0, A.selShake - dt);
    // 카드
    S.cards.forEach((c) => {
      const tg = cardTarget(curL, c);
      if (!c.init) { c.fx = tg.x; c.fy = tg.y; c.init = true; }
      else if (!c.drag) { c.fx = approach(c.fx, tg.x, dt, 14); c.fy = approach(c.fy, tg.y, dt, 14); }
      c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 14);
    });
    if (S.scene === 'map' && !S.mapDone && S.cards.length === 4 && mapSolved() && game && (game.phase === 'success' || game.free)) {
      S.mapDone = true; S.mapT = 0; Sound.tone(660, 0.2, 'triangle', 0.08);
    }
    if (S.mapDone) {
      const before = S.mapT; S.mapT += dt;
      if (before < 0.9 + 0.45 && S.mapT >= 0.9 + 0.45) { const g = mapGeo(curL); particles.burst(curL.vw / 2, g.axis.y, { count: 14, size: 3, speed: 150, gravity: 60, colors: ['#fff', '#ffd36b', '#9be7ff'] }); Sound.success(); }
    }
    particles.update(dt);
    syncUI();
  }

  renderTable();
  updEyeNote();
  SciSim.loop((dt, t) => {
    const vis = views.find((x) => x.v.canvas.offsetWidth > 0);
    if (vis) curL = vis.L;
    update(dt, t);
    views.forEach(({ v, L }) => { if (v.canvas.offsetWidth > 0) drawFrame(v, L, t); });
  });

  // 시험용 디버그 도구
  window.__sim = { S, A, game, switchEye, capture, startSpin, recordDist, setDist, setPencil, pickOption, initMap, autoSolve, mapGeo, get curL() { return curL; } };
})();
