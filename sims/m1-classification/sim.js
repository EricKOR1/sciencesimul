/* =========================================================
   중1 Ⅱ. 생물의 구성과 다양성 — 종과 생물의 분류 [9과02-04]
   ① [관찰] 종의 뜻: 짝짓기 실험 (말×당나귀 → 노새 / 진돗개×삽살개 → 강아지)
   ② [탐구] 분류 단계: 종 < 속 < 과 < 목 < 강 < 문 < 계 (호랑이 예, 상자가 겹겹이 커져요)
   ③ [설명] 5계의 분류 기준: 검색표(핵막 → 광합성 → 세포벽 → 조직·기관)와 기준 카드
   ④ [적용] 계 분류 게임: 생물 카드 10장을 5계 상자에 끌어 넣기
   ※ 범위: 종은 생물학적 종 개념만, 분류 체계는 5계(원핵생물계·원생생물계·균계·식물계·동물계)만 다뤄요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const EASE = SciSim.ease;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const EMOJI_FONT = '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif';
  const now = () => performance.now() / 1000;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // 고정 시드 난수 (그림이 매번 같도록)
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, seed) {
    const R = rng(seed), a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    if (a.every((v, i) => v === arr[i])) a.push(a.shift());
    return a;
  }

  /* =========================================================
     무대: 태블릿 = 가로형 800×640, 휴대폰 = 세로형 460×800
     ========================================================= */
  const LAYOUTS = { wide: { w: 800, h: 640 }, tall: { w: 460, h: 800 } };
  const BG = '#eef4ef';
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  let view = null, ctx = null, D = null, W = 800, H = 640, TALL = false, KIND = '';
  let LAY = null;

  /* =========================================================
     그리기 도우미
     ========================================================= */
  const font = (size, weight) => (weight || 700) + ' ' + size + 'px ' + FONT;
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function rr2(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function txt(s, x, y, o) {
    o = o || {};
    let size = o.size || 14;
    ctx.font = font(size, o.weight);
    if (o.max) {
      while (size > (o.min || 11) && ctx.measureText(s).width > o.max) { size -= 0.5; ctx.font = font(size, o.weight); }
    }
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || 4; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#1b2333';
    ctx.fillText(s, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  const lineCache = new Map();
  function lines(s, maxW, size, weight) {
    const key = s + '|' + maxW + '|' + size + '|' + (weight || 700);
    let out = lineCache.get(key);
    if (out) return out;
    ctx.save();
    ctx.font = font(size, weight);
    out = [];
    s.split('\n').forEach((par) => {
      let cur = '';
      par.split(' ').forEach((w) => {
        const tryS = cur ? cur + ' ' + w : w;
        if (ctx.measureText(tryS).width <= maxW) { cur = tryS; return; }
        if (cur) out.push(cur);
        cur = w;
        while (ctx.measureText(cur).width > maxW && cur.length > 1) {
          let k = cur.length - 1;
          while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
          out.push(cur.slice(0, k)); cur = cur.slice(k);
        }
      });
      if (cur) out.push(cur);
    });
    ctx.restore();
    lineCache.set(key, out);
    return out;
  }
  function para(s, x, y, maxW, o) {
    o = o || {};
    const size = o.size || 14, lh = o.lh || Math.round(size * 1.38);
    const ls = lines(s, maxW, size, o.weight);
    ls.forEach((ln, i) => txt(ln, x, y + i * lh, { size, weight: o.weight, color: o.color, align: o.align, base: o.base }));
    return ls.length * lh;
  }
  function pill(s, x, y, o) {
    o = o || {};
    const size = o.size || 14, pad = o.pad != null ? o.pad : 10, h = o.h || size + 12;
    ctx.font = font(size, o.weight || 800);
    const w = ctx.measureText(s).width + pad * 2;
    let lx = x - w / 2;
    if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - w;
    ctx.save();
    if (o.shadow) { ctx.shadowColor = 'rgba(20,40,30,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    rr(lx, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || '#1b2333'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(lx, y - h / 2, w, h, h / 2); ctx.strokeStyle = o.border; ctx.lineWidth = o.borderW || 2; ctx.stroke(); }
    txt(s, lx + w / 2, y + 1, { size, weight: o.weight || 800, color: o.color || '#fff', align: 'center', base: 'middle' });
    return { x: lx, y: y - h / 2, w, h };
  }
  function newRing(r, rad) {
    const a = 0.5 + 0.5 * Math.sin(now() * 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(22,163,74,' + (0.35 + a * 0.5).toFixed(2) + ')'; ctx.lineWidth = 4;
    rr(r.x - 6, r.y - 6, r.w + 12, r.h + 12, (rad || 14) + 6); ctx.stroke();
    const tx = Math.min(r.x + r.w - 44, W - 56), ty = Math.max(r.y - 17, 3);
    ctx.fillStyle = '#16a34a'; rr(tx, ty, 50, 22, 11); ctx.fill();
    ctx.restore();
    txt('NEW', tx + 25, ty + 12, { size: 13, weight: 800, color: '#fff', align: 'center', base: 'middle' });
  }
  // 부드러운 그림자: 한 번만 만들어 두었다가 붙여요 (매 프레임 번짐 계산을 피해요)
  const SHC = new Map();
  function dropShadow(x, y, w, h, r, blur, oy, col) {
    const key = Math.round(w) + 'x' + Math.round(h) + '/' + r + '/' + blur + '/' + col;
    let e = SHC.get(key);
    if (!e) {
      const pad = Math.ceil(blur * 2) + 4, c = document.createElement('canvas');
      c.width = Math.ceil(w) + pad * 2; c.height = Math.ceil(h) + pad * 2;
      const g = c.getContext('2d'), rad = Math.max(0, Math.min(r, w / 2, h / 2)), rx = pad - 9000, ry = pad;
      g.shadowColor = col; g.shadowBlur = blur; g.shadowOffsetX = 9000; g.fillStyle = '#000';
      g.beginPath(); g.moveTo(rx + rad, ry); g.arcTo(rx + w, ry, rx + w, ry + h, rad); g.arcTo(rx + w, ry + h, rx, ry + h, rad); g.arcTo(rx, ry + h, rx, ry, rad); g.arcTo(rx, ry, rx + w, ry, rad); g.closePath(); g.fill();
      e = { c, pad }; SHC.set(key, e);
      if (SHC.size > 80) SHC.delete(SHC.keys().next().value);
    }
    ctx.drawImage(e.c, x - e.pad, y - e.pad + oy);
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    dropShadow(x, y, w, h, o.r || 16, 12, 3, 'rgba(30,60,40,.12)');
    ctx.save();
    rr(x, y, w, h, o.r || 16); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(x, y, w, h, o.r || 16); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
  }
  const inR = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const PFX = new SciSim.Particles();
  function burst(x, y, colors, n, o) { PFX.burst(x, y, Object.assign({ count: n || 18, colors: colors || ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], speed: 150, gravity: 120, size: 4 }, o || {})); }
  const rgba = SciSim.color.rgba;
  function lgrad(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function rgrad(c, x0, y0, r0, x1, y1, r1, stops) { const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function lerpColor(a, b, t) {
    const A = SciSim.color.hexToRgb(a), B = SciSim.color.hexToRgb(b);
    const f = (x, y) => Math.round(x + (y - x) * t);
    return 'rgb(' + f(A.r, B.r) + ',' + f(A.g, B.g) + ',' + f(A.b, B.b) + ')';
  }
  const shade = SciSim.color.shade;
  function heart(c, x, y, s, col, o) {
    o = o || {};
    c.save(); c.translate(x, y); c.rotate(o.rot || 0); c.scale(s, s);
    c.globalAlpha *= o.alpha != null ? o.alpha : 1;
    c.beginPath(); c.moveTo(0, 0.9); c.bezierCurveTo(-1.4, -0.1, -1.0, -1.1, 0, -0.45); c.bezierCurveTo(1.0, -1.1, 1.4, -0.1, 0, 0.9); c.closePath();
    c.fillStyle = o.broken ? '#aab4c0' : lgrad(c, 0, -1, 0, 1, [[0, shade(col, 0.35)], [1, col]]); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 0.08; c.stroke();
    if (!o.broken) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-0.5, -0.4, 0.22, 0.13, -0.6, 0, TAU); c.fill(); }
    else { c.strokeStyle = '#fff'; c.lineWidth = 0.12; c.beginPath(); c.moveTo(0, -0.45); c.lineTo(0.18, -0.1); c.lineTo(-0.15, 0.2); c.lineTo(0.05, 0.9); c.stroke(); }
    c.restore();
  }

  /* =========================================================
     그림 ① 네발 동물 (옆모습, 오른쪽을 봐요) — 말·당나귀·노새·진돗개·삽살개·강아지
     (0,0)이 발 밑 가운데예요. 호출하는 쪽에서 translate/scale 해요.
     ========================================================= */
  const QUAD = {
    horse:    { kind: 'equid', body: ['#e2a468', '#b4703a'], belly: '#f0cfa6', mane: '#3d2616', hoof: '#33261c', leg: 46, rx: 50, ry: 25, neck: 1.0, ear: 11, head: 1.0, tail: 'flow', muzzle: '#f3e0c6', blaze: true },
    donkey:   { kind: 'equid', body: ['#c9c3ba', '#938d85'], belly: '#f1ece2', mane: '#55504b', hoof: '#3a322c', leg: 38, rx: 44, ry: 23, neck: 0.82, ear: 27, head: 1.06, tail: 'rope', muzzle: '#f5f0e7', cross: true },
    mule:     { kind: 'equid', body: ['#b9a28f', '#826c5b'], belly: '#e0d1be', mane: '#46372d', hoof: '#33261c', leg: 43, rx: 47, ry: 24, neck: 0.92, ear: 19, head: 1.03, tail: 'tuft', muzzle: '#e4d5c1' },
    jindo:    { kind: 'dog', fur: ['#f0c07e', '#c98d45'], belly: '#fff3dc', leg: 21, ear: 'point', tail: 'curl', size: 1 },
    sapsaree: { kind: 'dog', fur: ['#b4c3d0', '#74879b'], belly: '#dbe5ec', leg: 18, ear: 'hide', tail: 'plume', size: 1.06, shag: 1 },
    puppy:    { kind: 'dog', fur: ['#e0bd8e', '#b3885a'], belly: '#fdf0dc', leg: 17, ear: 'flop', tail: 'wag', size: 0.92, shag: 0.4 },
  };
  function earShape(c, bx, by, len, tilt, col, inner) {
    c.save(); c.translate(bx, by); c.rotate(tilt);
    c.fillStyle = col; c.beginPath(); c.moveTo(-4.6, 1); c.bezierCurveTo(-5.5, -len * 0.5, -2.5, -len * 0.95, 0.6, -len); c.bezierCurveTo(4.2, -len * 0.8, 5.4, -len * 0.3, 4.6, 1); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(60,40,25,.35)'; c.lineWidth = 0.9; c.stroke();
    c.fillStyle = inner; c.beginPath(); c.moveTo(-2.2, 0); c.bezierCurveTo(-2.8, -len * 0.45, -1, -len * 0.8, 0.4, -len * 0.86); c.bezierCurveTo(2, -len * 0.7, 2.6, -len * 0.3, 2.2, 0); c.closePath(); c.fill();
    c.restore();
  }
  function blinkOf(t, ph) { const b = (t * 0.8 + ph) % 4.4; return b > 4.2 ? Math.sin((b - 4.2) / 0.2 * Math.PI) : 0; }
  function drawEquid(c, P, t, o) {
    const ag = o.age == null ? 1 : o.age, ph = o.ph || 0, tt = RM ? 0 : t;
    const hs = lerp(1.3, 1, ag), lgs = lerp(1.2, 1, ag), sc = lerp(0.66, 1, ag);
    c.save(); c.scale(sc, sc);
    const leg = P.leg * lgs, rx = P.rx, ry = P.ry, wk = o.walk || 0, wp = o.wph || 0;
    const br = Math.sin(tt * 1.8 + ph) * 0.012;
    const by = -(leg + ry * 0.78), top = by + ry * 0.55, L = -top;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.fillStyle = 'rgba(30,45,20,.22)'; c.beginPath(); c.ellipse(2, 1.5, rx * 1.12, 6.5, 0, 0, TAU); c.fill();
    const bodyG = lgrad(c, 0, by - ry, 0, by + ry, [[0, P.body[0]], [1, P.body[1]]]);
    const drawLeg = (x, phase, far) => {
      const ang = Math.sin(wp + phase) * 0.5 * wk;
      c.save(); c.translate(x, top); c.rotate(ang);
      c.fillStyle = far ? shade(P.body[1], -0.18) : lgrad(c, 0, 0, 0, L, [[0, P.body[1]], [1, shade(P.body[1], -0.1)]]);
      c.beginPath(); c.moveTo(-6.0, 0); c.lineTo(6.0, 0); c.quadraticCurveTo(5.6, L * 0.3, 4.2, L * 0.5); c.lineTo(4.0, L * 0.56); c.lineTo(3.0, L - 6); c.lineTo(4.4, L - 3.6); c.lineTo(-4.4, L - 3.6); c.lineTo(-3.0, L - 6); c.lineTo(-4.0, L * 0.56); c.lineTo(-4.2, L * 0.5); c.quadraticCurveTo(-5.6, L * 0.3, -6.0, 0); c.closePath(); c.fill();
      c.fillStyle = P.hoof; rr2(c, -4.8, L - 5.2, 9.6, 5.8, 2.4); c.fill();
      c.restore();
    };
    drawLeg(-rx * 0.58, 0, true); drawLeg(rx * 0.6, Math.PI, true);
    // 꼬리
    const T0 = { x: -rx * 0.86, y: by - ry * 0.4 }, sw = Math.sin(tt * 1.7 + ph) * 3.4 + (wk ? Math.sin(wp) * 2 : 0);
    if (P.tail === 'flow') {
      c.fillStyle = lgrad(c, 0, T0.y, 0, T0.y + 62, [[0, P.mane], [1, shade(P.mane, 0.25)]]);
      c.beginPath(); c.moveTo(T0.x + 2, T0.y - 3); c.bezierCurveTo(T0.x - 16, T0.y + 4, T0.x - 24 + sw, T0.y + 30, T0.x - 18 + sw * 1.4, T0.y + 60);
      c.bezierCurveTo(T0.x - 11 + sw, T0.y + 42, T0.x - 5, T0.y + 22, T0.x + 6, T0.y + 8); c.closePath(); c.fill();
    } else {
      const len = P.tail === 'rope' ? 38 : 44;
      c.strokeStyle = shade(P.body[1], -0.1); c.lineWidth = 4.2;
      c.beginPath(); c.moveTo(T0.x + 1, T0.y); c.bezierCurveTo(T0.x - 8, T0.y + 8, T0.x - 10 + sw * 0.6, T0.y + len * 0.5, T0.x - 7 + sw, T0.y + len); c.stroke();
      c.fillStyle = P.mane; c.beginPath(); c.ellipse(T0.x - 7 + sw, T0.y + len + 4, P.tail === 'rope' ? 4 : 5.2, P.tail === 'rope' ? 8 : 10, sw * 0.03, 0, TAU); c.fill();
    }
    // 목
    const na = -1.0, Ln = 44 * P.neck * lerp(0.9, 1, ag), N0 = { x: rx * 0.52, y: by - ry * 0.3 };
    const N1 = { x: N0.x + Math.cos(na) * Ln, y: N0.y + Math.sin(na) * Ln + (RM ? 0 : Math.sin(tt * 1.3 + ph) * 0.8) };
    const pxn = -Math.sin(na), pyn = Math.cos(na), w0 = 25, w1 = 15;
    c.fillStyle = bodyG; c.strokeStyle = bodyG; c.lineWidth = 4;
    c.beginPath(); c.moveTo(N0.x + pxn * w0 / 2, N0.y + pyn * w0 / 2); c.lineTo(N1.x + pxn * w1 / 2, N1.y + pyn * w1 / 2); c.lineTo(N1.x - pxn * w1 / 2, N1.y - pyn * w1 / 2); c.lineTo(N0.x - pxn * w0 / 2, N0.y - pyn * w0 / 2); c.closePath(); c.fill(); c.stroke();
    // 몸통
    c.fillStyle = bodyG;
    c.beginPath(); c.ellipse(0, by, rx * 0.86 * (1 + br), ry * (1 + br * 1.5), 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(-rx * 0.5, by - 1, ry * 1.06, ry * 1.04, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(rx * 0.5, by - 1, ry * 1.02, ry * 1.02, 0, 0, TAU); c.fill();
    c.fillStyle = rgba(P.belly, 0.55); c.beginPath(); c.ellipse(rx * 0.04, by + ry * 0.62, rx * 0.62, ry * 0.38, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-rx * 0.1, by - ry * 0.55, rx * 0.5, ry * 0.2, -0.04, 0, TAU); c.fill();
    if (P.cross) {
      c.strokeStyle = 'rgba(70,64,60,.5)'; c.lineWidth = 2.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-rx * 0.72, by - ry * 0.78); c.quadraticCurveTo(0, by - ry * 0.98, rx * 0.46, by - ry * 0.9); c.stroke();
      c.beginPath(); c.moveTo(rx * 0.42, by - ry * 0.86); c.quadraticCurveTo(rx * 0.46, by - ry * 0.3, rx * 0.4, by + ry * 0.1); c.stroke();
    }
    // 갈기
    const cx0 = N0.x - pxn * w0 / 2, cy0 = N0.y - pyn * w0 / 2, cx1 = N1.x - pxn * w1 / 2, cy1 = N1.y - pyn * w1 / 2;
    c.strokeStyle = P.mane; c.fillStyle = P.mane;
    if (P.ear > 22) {                                          // 당나귀: 짧고 꼿꼿한 갈기
      c.lineWidth = 4.6; c.beginPath(); c.moveTo(cx0 - pxn * 1, cy0 - pyn * 1); c.lineTo(cx1 - pxn * 2.4, cy1 - pyn * 2.4); c.stroke();
      c.lineWidth = 2.2; for (let i = 1; i < 8; i++) { const u = i / 8, qx = lerp(cx0, cx1, u), qy = lerp(cy0, cy1, u); c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx - pxn * 7.5, qy - pyn * 7.5 + 1); c.stroke(); }
    } else {                                                   // 말·노새: 부드럽게 흐르는 갈기
      c.lineWidth = 7; c.beginPath(); c.moveTo(cx0 - pxn * 2, cy0 - pyn * 2 + 2); c.lineTo(cx1 - pxn * 2, cy1 - pyn * 2 + 1); c.stroke();
      c.lineWidth = 3.6;
      for (let i = 0; i < 6; i++) {
        const u = i / 5, qx = lerp(cx0, cx1, u) - pxn * 3, qy = lerp(cy0, cy1, u) - pyn * 3, wv = RM ? 0 : Math.sin(tt * 2.2 + i * 0.9) * 1.6;
        c.beginPath(); c.moveTo(qx, qy); c.quadraticCurveTo(qx - 8 + wv, qy + 2, qx - 11 + wv * 1.4, qy + 11 - u * 3); c.stroke();
      }
    }
    // 머리
    const ang = 0.88, Lh = 36 * P.head * hs;
    c.save(); c.translate(N1.x + 1.5, N1.y + 1); c.rotate(ang + (RM ? 0 : Math.sin(tt * 1.1 + ph) * 0.03 + (o.nod || 0)));
    const hg = lgrad(c, 0, -12, 0, 12, [[0, P.body[0]], [1, P.body[1]]]);
    c.fillStyle = hg; c.strokeStyle = 'rgba(60,40,25,.25)'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(Lh * 0.3, 0, Lh * 0.46, 11.6 * Math.sqrt(hs), 0, 0, TAU); c.fill();
    c.fillStyle = P.muzzle; c.beginPath(); c.ellipse(Lh * 0.8, 1, Lh * 0.27, 8.8, 0, 0, TAU); c.fill();
    c.fillStyle = hg; c.beginPath(); c.ellipse(Lh * 0.58, 0.4, Lh * 0.22, 9.6, 0, 0, TAU); c.fill();
    if (P.blaze) { c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(Lh * 0.5, -3.2, Lh * 0.34, 2.1, 0.08, 0, TAU); c.fill(); }
    const bl = blinkOf(tt, ph);
    c.fillStyle = '#2a1d14'; c.beginPath(); c.ellipse(Lh * 0.27, -3.6, 2.7, 3.1 * (1 - bl * 0.9) + 0.3, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(Lh * 0.27 + 0.9, -4.5, 0.9 * (1 - bl), 0, TAU); c.fill();
    c.fillStyle = 'rgba(60,30,20,.7)'; c.beginPath(); c.ellipse(Lh * 0.96, -1.2, 1.5, 2.2, 0.3, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(70,40,25,.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(Lh * 0.99, 4.6); c.quadraticCurveTo(Lh * 0.8, 6.8, Lh * 0.68, 5.4); c.stroke();
    c.fillStyle = 'rgba(255,150,150,.25)'; c.beginPath(); c.ellipse(Lh * 0.42, 4.5, 5, 3, 0, 0, TAU); c.fill();
    c.restore();
    // 귀 (세계 좌표)
    const ex = N1.x - 1, ey = N1.y - 5, et = o.earFlick ? Math.sin(tt * 18) * 0.12 : 0;
    earShape(c, ex - 3, ey + 1, P.ear * 0.95, -0.28 + et - (P.ear > 22 ? 0.18 : 0), shade(P.body[1], -0.12), '#e9b2a6');
    earShape(c, ex + 3, ey, P.ear, 0.06 + et * 1.2 + (P.ear > 22 ? 0.12 : 0), P.body[0], '#f3c2b6');
    // 앞다리(가까운 쪽)
    drawLeg(-rx * 0.46, Math.PI, false); drawLeg(rx * 0.72, 0, false);
    c.restore();
  }
  function furTufts(c, rx, ry, cy, n, len, col, seed, down) {          // 부드러운 털 뭉치 (동글동글 겹쳐요)
    const R = rng(seed); c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R() * 0.1, px = Math.cos(a) * rx, py = cy + Math.sin(a) * ry, nl = len * (0.7 + R() * 0.6);
      const dn = down && Math.sin(a) > 0.2;
      c.beginPath();
      if (dn) c.ellipse(px, py + nl * 0.45, 3.3 + R() * 1.2, nl * 0.85, (R() - 0.5) * 0.25, 0, TAU);
      else c.ellipse(px + Math.cos(a) * nl * 0.3, py + Math.sin(a) * nl * 0.3, 3.8 + R() * 1.4, 3.8 + R() * 1.4, 0, 0, TAU);
      c.fill();
    }
  }
  function drawDog(c, P, t, o) {
    const ag = o.age == null ? 1 : o.age, ph = o.ph || 0, tt = RM ? 0 : t;
    const sc = lerp(0.62, 1, ag) * P.size, hs = lerp(1.28, 1, ag), lgs = lerp(1.1, 1, ag);
    c.save(); c.scale(sc, sc);
    const leg = P.leg * lgs, rx = 34, ry = 20, wk = o.walk || 0, wp = o.wph || 0, br = Math.sin(tt * 2.4 + ph) * 0.014;
    const by = -(leg + ry * 0.74), top = by + ry * 0.5, L = -top, shag = P.shag || 0;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.fillStyle = 'rgba(30,45,20,.22)'; c.beginPath(); c.ellipse(2, 1.5, rx * 1.1, 5.5, 0, 0, TAU); c.fill();
    const fg = lgrad(c, 0, by - ry, 0, by + ry, [[0, P.fur[0]], [1, P.fur[1]]]);
    const drawLeg = (x, phase, far) => {
      const ang = Math.sin(wp + phase) * 0.55 * wk;
      c.save(); c.translate(x, top); c.rotate(ang);
      c.fillStyle = far ? shade(P.fur[1], -0.15) : fg;
      rr2(c, -5.6, -2, 11.2, L + 2, 5); c.fill();
      c.fillStyle = far ? shade(P.belly, -0.2) : P.belly; c.beginPath(); c.ellipse(0.8, L - 1.5, 7.2, 4.4, 0, 0, TAU); c.fill();
      if (shag > 0.7) { c.fillStyle = far ? shade(P.fur[1], -0.12) : P.fur[0]; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(-4 + k * 4.2, L - 3, 3.1, 6.5 + (k % 2) * 1.5, 0, 0, TAU); c.fill(); } }
      c.restore();
    };
    drawLeg(-rx * 0.58, 0, true); drawLeg(rx * 0.6, Math.PI, true);
    // 꼬리
    const T0 = { x: -rx * 0.86, y: by - ry * 0.25 };
    c.save(); c.translate(T0.x, T0.y);
    if (P.tail === 'curl') {
      c.rotate(RM ? 0 : Math.sin(tt * 2 + ph) * 0.05);
      c.strokeStyle = P.fur[1]; c.lineWidth = 10; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-14, -6, -18, -28, -2, -32); c.bezierCurveTo(6, -33, 10, -26, 6, -20); c.stroke();
      c.strokeStyle = P.fur[0]; c.lineWidth = 6; c.stroke();
    } else if (P.tail === 'plume') {
      c.rotate(RM ? 0 : Math.sin(tt * 1.6 + ph) * 0.07);
      c.fillStyle = P.fur[1]; c.beginPath(); c.moveTo(2, 4); c.bezierCurveTo(-14, -2, -26, -16, -24, -30); c.bezierCurveTo(-18, -26, -10, -26, -6, -30); c.bezierCurveTo(-2, -22, 6, -14, 8, -4); c.closePath(); c.fill();
      c.fillStyle = P.fur[0]; for (let k = 0; k < 7; k++) { const u = k / 6; c.beginPath(); c.arc(lerp(-4, -22, u), lerp(-4, -27, u) + (k % 2) * 3, 5.5, 0, TAU); c.fill(); }
    } else {
      c.rotate(-0.9 + (RM ? 0 : Math.sin(tt * 13 + ph) * 0.45 * (o.wag == null ? 1 : o.wag)));
      c.fillStyle = P.fur[1]; rr2(c, -14, -4, 18, 8, 4); c.fill();
    }
    c.restore();
    // 몸통
    c.fillStyle = fg;
    c.beginPath(); c.ellipse(0, by, rx * 0.84 * (1 + br), ry * (1 + br * 1.5), 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(-rx * 0.5, by - 1, ry * 1.0, ry * 1.02, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(rx * 0.52, by - 1, ry * 0.98, ry * 1.0, 0, 0, TAU); c.fill();
    if (shag > 0.7) { furTufts(c, rx * 0.98, ry * 1.04, by, 26, 8 * shag + 2, P.fur[1], 77, true); furTufts(c, rx * 0.9, ry * 0.96, by + 1, 20, 7 * shag + 1, P.fur[0], 78, true); }
    c.fillStyle = rgba(P.belly, 0.7); c.beginPath(); c.ellipse(rx * 0.2, by + ry * 0.58, rx * 0.55, ry * 0.4, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(-rx * 0.1, by - ry * 0.55, rx * 0.5, ry * 0.2, -0.04, 0, TAU); c.fill();
    // 머리
    const Hc = { x: rx * 0.98, y: by - ry * 0.98 + (RM ? 0 : Math.sin(tt * 1.7 + ph) * 0.8) }, R = 15.4 * hs;
    c.save(); c.translate(Hc.x, Hc.y); c.rotate((o.nod || 0));
    if (P.ear === 'point') {
      c.fillStyle = shade(P.fur[1], -0.12); c.beginPath(); c.moveTo(-10, -7 * hs); c.lineTo(-7, -23 * hs); c.lineTo(2, -11 * hs); c.closePath(); c.fill();
    } else if (P.ear === 'flop') {
      c.fillStyle = shade(P.fur[1], -0.12); c.save(); c.translate(-6, -8 * hs); c.rotate(0.4 + (RM ? 0 : Math.sin(tt * 2.4 + ph) * 0.05)); c.beginPath(); c.ellipse(0, 8 * hs, 6.4 * hs, 11 * hs, 0, 0, TAU); c.fill(); c.restore();
    }
    c.fillStyle = lgrad(c, 0, -R, 0, R, [[0, P.fur[0]], [1, P.fur[1]]]); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    if (shag > 0.7) furTufts(c, R * 0.95, R * 0.95, 0, 14, 4, P.fur[1], 91, false);
    if (P.ear === 'point') {
      c.fillStyle = P.fur[0]; c.beginPath(); c.moveTo(-1, -10 * hs); c.lineTo(5, -24 * hs); c.lineTo(11, -8 * hs); c.closePath(); c.fill();
      c.fillStyle = '#f3b9a8'; c.beginPath(); c.moveTo(3.4, -11 * hs); c.lineTo(5.4, -19 * hs); c.lineTo(8, -10 * hs); c.closePath(); c.fill();
    } else if (P.ear === 'flop') {
      c.fillStyle = P.fur[0]; c.save(); c.translate(3, -9 * hs); c.rotate(0.35 + (RM ? 0 : Math.sin(tt * 2.4 + ph + 1) * 0.05)); c.beginPath(); c.ellipse(0, 8 * hs, 6.4 * hs, 11 * hs, 0, 0, TAU); c.fill(); c.restore();
    }
    // 주둥이
    c.fillStyle = P.belly; c.beginPath(); c.ellipse(R * 0.78, R * 0.34, R * 0.62, R * 0.42, 0.1, 0, TAU); c.fill();
    c.fillStyle = '#2f2420'; c.beginPath(); c.ellipse(R * 1.28, R * 0.16, 3.6, 2.8, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(R * 1.3, R * 0.1, 0.9, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(60,40,30,.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(R * 1.28, R * 0.28); c.lineTo(R * 1.24, R * 0.5); c.quadraticCurveTo(R * 1.0, R * 0.68, R * 0.82, R * 0.52); c.stroke();
    if (ph || true) { c.fillStyle = '#ff8fa3'; c.beginPath(); c.ellipse(R * 0.96, R * 0.64 + 1, 3, 2.4 + (o.pant ? Math.abs(Math.sin(tt * 9)) * 2 : 0), 0.2, 0, TAU); c.fill(); }
    if (P.ear === 'hide') {                                  // 삽살개: 눈을 덮는 긴 털 (눈은 털 사이로 살짝)
      const bl2 = blinkOf(tt, ph), sw2 = RM ? 0 : Math.sin(tt * 1.8) * 0.6;
      c.fillStyle = shade(P.fur[1], -0.05);
      c.beginPath(); c.ellipse(-R * 0.55, R * 0.15, 4.6, R * 0.78, 0.12, 0, TAU); c.fill();           // 늘어진 귀 털
      c.fillStyle = '#2a1d14'; c.beginPath(); c.ellipse(R * 0.5, -R * 0.1, 2.2, 2.5 * (1 - bl2 * 0.9) + 0.3, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(R * 0.5 + 0.8, -R * 0.1 - 0.9, 0.8 * (1 - bl2), 0, TAU); c.fill();
      for (let k = 0; k < 7; k++) {                              // 이마 털 (길게 흘러내려요)
        const sx = -R * 0.5 + k * (R * 1.12 / 6) + (k > 4 ? 1.5 : 0), len = R * (0.7 + (k % 3) * 0.1);
        c.fillStyle = k % 2 ? P.fur[0] : shade(P.fur[0], 0.12);
        c.beginPath(); c.ellipse(sx + sw2 * (k % 2 ? 1 : -1), -R * 0.08 + len * 0.28, 3.6, len * 0.62, (k - 3) * 0.05, 0, TAU); c.fill();
      }
      c.fillStyle = P.fur[0]; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(R * 0.62 + k * 3.6, R * 0.92 + (k % 2) * 1.5, 2.9, 6.4 + (k % 2) * 2, 0.1, 0, TAU); c.fill(); }
    } else {
      const bl = blinkOf(tt, ph);
      c.fillStyle = '#2a1d14'; c.beginPath(); c.ellipse(R * 0.42, -R * 0.2, 2.6, 3 * (1 - bl * 0.9) + 0.3, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(R * 0.42 + 0.9, -R * 0.2 - 1, 0.9 * (1 - bl), 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,150,150,.28)'; c.beginPath(); c.ellipse(R * 0.3, R * 0.36, 4.2, 2.6, 0, 0, TAU); c.fill();
    }
    c.restore();
    drawLeg(-rx * 0.46, Math.PI, false); drawLeg(rx * 0.7, 0, false);
    c.restore();
  }
  function drawQuad(c, name, t, o) {
    o = o || {};
    const P = QUAD[name];
    if (P.kind === 'equid') drawEquid(c, P, t, o); else drawDog(c, P, t, o);
  }

  /* =========================================================
     그림 ② 생물 10가지 (80×80 안에 중심이 (0,0)이 되게)
     ========================================================= */
  const ORG_ART = {
    ecoli(c, t) {
      const tt = RM ? 0 : t;
      c.save(); c.translate(6, 0); c.rotate(-0.38 + Math.sin(tt * 0.7) * 0.06);
      c.strokeStyle = '#8a63b8'; c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let k = 0; k < 3; k++) { c.beginPath(); const y0 = (k - 1) * 4.5; c.moveTo(-23, y0 * 0.7); for (let i = 1; i <= 8; i++) c.lineTo(-23 - i * 2.6, y0 + (k - 1) * i * 0.7 + Math.sin(i * 0.9 - tt * 7 + k * 2) * (0.8 + i * 0.32)); c.stroke(); }
      const R = rng(11); c.strokeStyle = 'rgba(138,99,184,.6)'; c.lineWidth = 1;
      for (let i = 0; i < 30; i++) { const a = (i / 30) * TAU, px = Math.cos(a) * 25, py = Math.sin(a) * 13.5, nx = Math.cos(a) / 25, ny = Math.sin(a) / 13.5, nl = Math.hypot(nx, ny), l = 3.5 + R() * 3.5; c.beginPath(); c.moveTo(px, py); c.lineTo(px + nx / nl * l, py + ny / nl * l + Math.sin(tt * 3 + i) * 0.6); c.stroke(); }
      c.fillStyle = lgrad(c, -24, -13, 24, 13, [[0, '#e4cff7'], [1, '#a577d6']]); rr2(c, -24, -12.5, 48, 25, 12.5); c.fill();
      c.strokeStyle = '#7c52b0'; c.lineWidth = 1.8; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; rr2(c, -21.5, -10, 43, 20, 10); c.stroke();
      c.strokeStyle = '#e39a2c'; c.lineWidth = 1.7; c.beginPath();
      const R2 = rng(5); let px = -12, py = 0; c.moveTo(px, py);
      for (let i = 0; i < 16; i++) { const nx = -12 + (i / 15) * 24 + (R2() - 0.5) * 5, ny = (R2() - 0.5) * 12; c.quadraticCurveTo((px + nx) / 2 + (R2() - 0.5) * 8, (py + ny) / 2 + (R2() - 0.5) * 8, nx, ny); px = nx; py = ny; }
      c.stroke();
      c.fillStyle = 'rgba(90,50,140,.55)'; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(-17 + R2() * 34, -8 + R2() * 16, 1.1, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-6, -7.5, 10, 2.6, 0, 0, TAU); c.fill();
      c.restore();
    },
    paramecium(c, t) {
      const tt = RM ? 0 : t;
      c.save(); c.rotate(-0.42 + Math.sin(tt * 0.6) * 0.09);
      const R = rng(3);
      c.strokeStyle = 'rgba(80,120,170,.7)'; c.lineWidth = 1;
      for (let i = 0; i < 46; i++) { const a = (i / 46) * TAU, px = Math.cos(a) * 34.5, py = Math.sin(a) * 15.8, nl = Math.hypot(Math.cos(a) / 34.5, Math.sin(a) / 15.8), l = 4.2 + Math.sin(tt * 14 + i * 1.3) * 1.2; c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) / 34.5 / nl * l, py + Math.sin(a) / 15.8 / nl * l); c.stroke(); }
      c.beginPath(); c.moveTo(-34, 0); c.bezierCurveTo(-34, -13, -2, -19, 20, -15.5); c.bezierCurveTo(34, -12.5, 38, -4, 36, 2); c.bezierCurveTo(33, 12, 10, 18, -12, 15.5); c.bezierCurveTo(-28, 13.5, -34, 8, -34, 0); c.closePath();
      c.fillStyle = lgrad(c, 0, -18, 0, 18, [[0, 'rgba(196,225,250,.96)'], [1, 'rgba(126,174,220,.96)']]); c.fill();
      c.strokeStyle = '#5f90c0'; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = 'rgba(70,105,150,.5)'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-27, -7); c.quadraticCurveTo(-12, -1, 4, 3); c.stroke();
      c.fillStyle = '#6b4ea0'; c.beginPath(); c.ellipse(8, -2, 9, 5.4, 0.35, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(6, -4, 4.4, 1.6, 0.35, 0, TAU); c.fill();
      c.fillStyle = '#8f78c8'; c.beginPath(); c.arc(-2, 6, 1.9, 0, TAU); c.fill();
      [[-24.5, 4], [24, -1.5]].forEach((p, k) => { const s = 1 + 0.28 * Math.sin(tt * 2.2 + k * 2); c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(p[0], p[1], 3.2 * s, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1; for (let j = 0; j < 6; j++) { const a = j / 6 * TAU; c.beginPath(); c.moveTo(p[0] + Math.cos(a) * 3.6 * s, p[1] + Math.sin(a) * 3.6 * s); c.lineTo(p[0] + Math.cos(a) * 6.6, p[1] + Math.sin(a) * 6.6); c.stroke(); } });
      c.fillStyle = '#a8d77f'; c.beginPath(); c.arc(-12, 8, 2.8, 0, TAU); c.fill(); c.fillStyle = '#e8c36a'; c.beginPath(); c.arc(17, 7.5, 2.4, 0, TAU); c.fill(); c.fillStyle = '#9fd0a0'; c.beginPath(); c.arc(-4, -9, 2.1, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-4, -12, 14, 2.4, 0.05, 0, TAU); c.fill();
      c.restore();
    },
    wakame(c, t) {
      const tt = RM ? 0 : t;
      c.fillStyle = 'rgba(120,190,225,.22)'; c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.fill();
      c.fillStyle = '#8f949b'; [[-12, 37, 9, 4.5], [3, 38.5, 10, 4.8], [15, 36, 8, 4]].forEach((r) => { c.beginPath(); c.ellipse(r[0], r[1], r[2], r[3], 0, 0, TAU); c.fill(); });
      c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-2, 35, 9, 2, 0, 0, TAU); c.fill();
      const frond = (bx, ang, len, wid, ph, dark) => {
        c.save(); c.translate(bx, 35); c.rotate(ang + (RM ? 0 : Math.sin(tt * 1.0 + ph) * 0.05));
        const bot = -6, top = -len;
        const mid = (y) => Math.sin((y - bot) * 0.085 + tt * 0.9 + ph) * 4.5 * (1 - (y - bot) / top * 0.0);
        const half = (y) => { const u = (y - bot) / (top - bot); return (2 + wid * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1)), 0.75)) * (1 + 0.12 * Math.sin(y * 0.75 + tt * 1.6 + ph)); };
        c.fillStyle = '#6b5a2b'; c.beginPath(); c.moveTo(-2.4, 2); c.lineTo(2.4, 2); c.lineTo(1.8, bot - 4); c.lineTo(-1.8, bot - 4); c.closePath(); c.fill();
        c.beginPath();
        for (let y = bot; y >= top; y -= 2) c.lineTo(mid(y) - half(y), y);
        for (let y = top; y <= bot; y += 2) c.lineTo(mid(y) + half(y), y);
        c.closePath();
        c.fillStyle = lgrad(c, -14, top, 14, bot, dark ? [[0, '#7c8a2e'], [1, '#3b4812']] : [[0, '#a2ae3f'], [0.5, '#6f7d27'], [1, '#475514']]); c.fill();
        c.strokeStyle = '#2e390c'; c.lineWidth = 1.3; c.lineJoin = 'round'; c.stroke();
        c.strokeStyle = 'rgba(222,232,130,.8)'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); for (let y = bot; y >= top + 1; y -= 2) c.lineTo(mid(y), y); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1; c.beginPath(); for (let y = bot - 4; y >= top + 6; y -= 2) c.lineTo(mid(y) - half(y) * 0.55, y); c.stroke();
        c.restore();
      };
      frond(-12, -0.42, 50, 8.5, 1.3, true); frond(13, 0.4, 54, 9, 2.4, true); frond(0, 0.0, 70, 12.5, 0, false);
      if (!RM) for (let i = 0; i < 4; i++) { const u = (tt * 0.22 + i * 0.26) % 1; c.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - u)).toFixed(2) + ')'; c.lineWidth = 1.2; c.beginPath(); c.arc(-26 + i * 17 + Math.sin(u * 8 + i) * 3, 30 - u * 62, 2 + i % 2, 0, TAU); c.stroke(); }
    },
    penicillium(c, t) {
      const tt = RM ? 0 : t;
      c.fillStyle = lgrad(c, 0, -32, 0, 34, [[0, '#f6dfae'], [1, '#e6bf7c']]);
      c.beginPath(); c.moveTo(-30, 33); c.lineTo(-30, -2); c.bezierCurveTo(-40, -8, -40, -30, -20, -30); c.bezierCurveTo(-12, -39, 12, -39, 20, -30); c.bezierCurveTo(40, -30, 40, -8, 30, -2); c.lineTo(30, 33); c.closePath(); c.fill();
      c.strokeStyle = '#b9863f'; c.lineWidth = 3.6; c.lineJoin = 'round'; c.stroke();
      c.fillStyle = 'rgba(255,248,225,.5)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(-20 + (i * 37 % 40), -20 + (i * 53 % 46), 1.4, 0, TAU); c.fill(); }
      const R = rng(21);
      [[-6, -10, 14], [13, 8, 11], [-14, 14, 8.5]].forEach((m, mi) => {
        const g = rgrad(c, m[0], m[1], 1, m[0], m[1], m[2], [[0, '#c9efe4'], [0.45, '#5fb6a5'], [0.85, '#2f8b7d'], [1, 'rgba(47,139,125,0)']]);
        c.fillStyle = g; c.beginPath(); c.arc(m[0], m[1], m[2], 0, TAU); c.fill();
        c.fillStyle = 'rgba(244,255,251,.95)';
        for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, rr0 = m[2] * (0.92 + R() * 0.16); c.beginPath(); c.arc(m[0] + Math.cos(a) * rr0, m[1] + Math.sin(a) * rr0, 1.5 + R() * 1.4, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(30,100,90,.7)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(m[0] + (R() - 0.5) * m[2] * 1.2, m[1] + (R() - 0.5) * m[2] * 1.2, 0.9 + R() * 0.8, 0, TAU); c.fill(); }
      });
      if (!RM) for (let i = 0; i < 4; i++) { const u = (tt * 0.25 + i * 0.27) % 1; c.fillStyle = 'rgba(90,185,165,' + (0.7 * (1 - u)).toFixed(2) + ')'; c.beginPath(); c.arc(-8 + i * 7 + Math.sin(u * 7 + i) * 3, -14 - u * 22, 1.8, 0, TAU); c.fill(); }
    },
    shiitake(c, t) {
      const tt = RM ? 0 : t;
      c.save(); c.translate(0, 0); c.rotate(Math.sin(tt * 0.9) * 0.025);
      c.fillStyle = lgrad(c, -6, 0, 8, 0, [[0, '#f6ead3'], [1, '#d7bf94']]);
      c.beginPath(); c.moveTo(-6, 2); c.bezierCurveTo(-7, 14, -3, 28, -6, 37); c.lineTo(7, 37); c.bezierCurveTo(4, 26, 7, 14, 6, 2); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(120,90,50,.4)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#e3cda4'; c.beginPath(); c.ellipse(0, 3, 33, 8, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(140,100,60,.45)'; c.lineWidth = 0.9; for (let i = -14; i <= 14; i++) { c.beginPath(); c.moveTo(i * 2.1, 2); c.lineTo(i * 2.1 * 0.9, 9 - Math.abs(i) * 0.12); c.stroke(); }
      const cap = new Path2D(); cap.moveTo(-35, 3); cap.bezierCurveTo(-36, -20, -16, -33, 0, -33); cap.bezierCurveTo(16, -33, 36, -20, 35, 3); cap.bezierCurveTo(20, 9, -20, 9, -35, 3); cap.closePath();
      c.fillStyle = rgrad(c, -10, -16, 3, 0, -4, 42, [[0, '#c98a54'], [0.55, '#8a5128'], [1, '#5d3015']]); c.fill(cap);
      c.save(); c.clip(cap);
      c.fillStyle = 'rgba(247,236,214,.78)'; const R = rng(8);
      for (let i = 0; i < 22; i++) { const px = (R() - 0.5) * 60, py = -26 + R() * 28, w = 3 + R() * 6; c.beginPath(); c.moveTo(px, py - w * 0.5); c.lineTo(px + w, py); c.lineTo(px + w * 0.2, py + w * 0.6); c.lineTo(px - w * 0.7, py + w * 0.1); c.closePath(); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(-12, -22, 13, 5, -0.4, 0, TAU); c.fill();
      c.restore();
      c.strokeStyle = '#4a2610'; c.lineWidth = 1.4; c.stroke(cap);
      c.restore();
      if (!RM) for (let i = 0; i < 4; i++) { const u = (tt * 0.3 + i * 0.25) % 1; c.fillStyle = 'rgba(255,255,255,' + (0.8 * (1 - u)).toFixed(2) + ')'; c.beginPath(); c.arc(-14 + i * 9 + Math.sin(u * 6 + i) * 3, 8 + u * 26, 1.5, 0, TAU); c.fill(); }
    },
    yeast(c, t) {
      const tt = RM ? 0 : t;
      const cells = [{ x: -11, y: 6, rx: 15.5, ry: 12.5, r: 0.3 }, { x: 13, y: -3, rx: 14, ry: 11.5, r: -0.5 }, { x: 4, y: 20, rx: 12.5, ry: 10.5, r: 0.8 }, { x: -17, y: -16, rx: 11, ry: 9.5, r: -0.2 }];
      cells.forEach((cl, i) => {
        const bud = 4.5 + 4.2 * (0.5 + 0.5 * Math.sin(tt * 0.9 + i * 1.7)), ba = [-0.9, 2.1, 0.4, -2.3][i];
        const bx = cl.x + Math.cos(ba) * (cl.rx + bud * 0.55), by = cl.y + Math.sin(ba) * (cl.ry + bud * 0.55);
        c.fillStyle = rgrad(c, bx - 1, by - 1, 1, bx, by, bud, [[0, '#f8ebba'], [1, '#d8b65e']]); c.beginPath(); c.arc(bx, by, bud, 0, TAU); c.fill(); c.strokeStyle = '#a98230'; c.lineWidth = 1.2; c.stroke();
        c.save(); c.translate(cl.x, cl.y); c.rotate(cl.r);
        c.fillStyle = rgrad(c, -4, -4, 1, 0, 0, cl.rx * 1.1, [[0, '#fbf0c6'], [0.6, '#e9ce7e'], [1, '#c9a24a']]); c.beginPath(); c.ellipse(0, 0, cl.rx, cl.ry, 0, 0, TAU); c.fill(); c.strokeStyle = '#a98230'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-cl.rx * 0.28, -cl.ry * 0.3, cl.rx * 0.34, cl.ry * 0.2, -0.4, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,252,235,.85)'; c.beginPath(); c.ellipse(cl.rx * 0.28, cl.ry * 0.12, cl.rx * 0.3, cl.ry * 0.34, 0, 0, TAU); c.fill();
        c.fillStyle = '#8b6bb5'; c.beginPath(); c.arc(-cl.rx * 0.22, cl.ry * 0.14, 2.4, 0, TAU); c.fill();
        c.restore();
      });
    },
    fern(c, t) {
      const tt = RM ? 0 : t;
      c.save(); c.translate(0, 36); c.rotate(Math.sin(tt * 1.0) * 0.03);
      const P0 = { x: -4, y: 0 }, P1 = { x: -26, y: -38 }, P2 = { x: 22, y: -68 };
      const at = (u) => ({ x: (1 - u) * (1 - u) * P0.x + 2 * (1 - u) * u * P1.x + u * u * P2.x, y: (1 - u) * (1 - u) * P0.y + 2 * (1 - u) * u * P1.y + u * u * P2.y });
      const tg = (u) => { const dx = 2 * (1 - u) * (P1.x - P0.x) + 2 * u * (P2.x - P1.x), dy = 2 * (1 - u) * (P1.y - P0.y) + 2 * u * (P2.y - P1.y), l = Math.hypot(dx, dy); return { x: dx / l, y: dy / l }; };
      c.strokeStyle = '#2f7a38'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 20; i++) { const p = at(i / 20); if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); } c.stroke();
      const N = 12;
      for (let i = 1; i <= N; i++) {
        const u = i / (N + 1), p = at(u), d = tg(u), len = 17 * (1 - u * 0.78) + 3, wob = RM ? 0 : Math.sin(tt * 1.6 + i * 0.5) * 0.05;
        [-1, 1].forEach((sd) => {
          const nx = -d.y * sd, ny = d.x * sd, ang = Math.atan2(ny, nx) - sd * 0.5 + wob;
          c.save(); c.translate(p.x, p.y); c.rotate(ang);
          c.fillStyle = lgrad(c, 0, -4, len, 4, [[0, lerpColor('#3f9d46', '#8fd35a', u)], [1, lerpColor('#2d7a35', '#6fb94b', u)]]);
          c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(len * 0.25, -len * 0.26, len * 0.8, -len * 0.2, len, 0); c.bezierCurveTo(len * 0.8, len * 0.22, len * 0.25, len * 0.26, 0, 0); c.fill();
          c.strokeStyle = 'rgba(20,70,25,.45)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, 0); c.lineTo(len * 0.92, 0); c.stroke();
          c.restore();
        });
      }
      c.strokeStyle = '#7fc050'; c.lineWidth = 2.4; c.beginPath(); for (let k = 0; k <= 30; k++) { const a = k * 0.34, r = 1.2 + k * 0.28; const px = 22 + Math.cos(a) * r * 0.9 + 4, py = -64 + Math.sin(a) * r * 0.9 - 8; if (k === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.stroke();
      c.restore();
    },
    pine(c, t) {
      const tt = RM ? 0 : t, sw = Math.sin(tt * 1.0) * 1.2;
      c.fillStyle = lgrad(c, -7, 0, 7, 0, [[0, '#c0794a'], [1, '#7c4425']]);
      c.beginPath(); c.moveTo(-5, 38); c.bezierCurveTo(-1, 24, -9, 10, -3, -4); c.bezierCurveTo(-1, -14, -4, -22, -1, -32); c.lineTo(4, -32); c.bezierCurveTo(7, -22, 4, -12, 7, -3); c.bezierCurveTo(12, 10, 4, 24, 6.5, 38); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(70,35,15,.5)'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-3 + (i % 2) * 2, 34 - i * 11); c.lineTo(1.5 + (i % 2) * 2, 29 - i * 11); c.stroke(); }
      c.strokeStyle = '#8d5330'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(2, 10); c.quadraticCurveTo(-12, 8, -22, -2); c.moveTo(2, -6); c.quadraticCurveTo(14, -6, 24, -14); c.stroke();
      const R = rng(9);
      const clump = (cx, cy, rx, ry, k) => {
        c.fillStyle = rgrad(c, cx - rx * 0.3, cy - ry * 0.6, 2, cx, cy, rx * 1.1, [[0, '#58a85f'], [0.6, '#2f7a42'], [1, '#1f5632']]);
        c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.fill();
        for (let i = 0; i < 46; i++) {
          const a = R() * TAU, px = cx + Math.cos(a) * rx * (0.55 + R() * 0.45), py = cy + Math.sin(a) * ry * (0.55 + R() * 0.45), l = 4 + R() * 5, ga = a + (R() - 0.5) * 0.6;
          c.strokeStyle = R() < 0.5 ? 'rgba(170,230,150,.75)' : 'rgba(25,80,40,.75)'; c.lineWidth = 0.9;
          c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(ga) * l * 0.9, py + Math.sin(ga) * l * 0.55 - 1); c.stroke();
        }
      };
      clump(-18 + sw * 0.5, -3, 16, 7.5, 0); clump(20 + sw * 0.8, -12, 16, 7.5, 1); clump(-6 + sw, -20, 17, 8, 2); clump(8 + sw * 1.2, -33, 12.5, 6.5, 3);
      c.save(); c.translate(-23 + sw * 0.4, 8); c.fillStyle = '#8c5b2c'; c.beginPath(); c.ellipse(0, 3, 4.4, 6.8, 0.1, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(50,25,5,.6)'; c.lineWidth = 0.8; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0, -1 + k * 3, 3.6, 0.15, Math.PI - 0.15); c.stroke(); }
      c.restore();
    },
    jellyfish(c, t) {
      const tt = RM ? 0 : t, p = 0.5 + 0.5 * Math.sin(tt * 2.3), bob = RM ? 0 : Math.sin(tt * 1.15) * 2.2;
      const bw = 27 * (1 + 0.09 * (1 - p)), bh = 22 * (1 + 0.14 * p);
      c.save(); c.translate(0, bob - 6);
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(236,150,200,.7)'; c.lineWidth = 1.5;
      for (let k = 0; k < 9; k++) { const x0 = -bw * 0.85 + k * (bw * 1.7 / 8); c.beginPath(); c.moveTo(x0, 4); for (let i = 1; i <= 12; i++) c.lineTo(x0 + Math.sin(i * 0.7 - tt * 3 + k) * (1.6 + i * 0.18), 4 + i * 3.3 + (1 - p) * i * 0.3); c.stroke(); }
      c.strokeStyle = 'rgba(232,121,169,.6)'; c.lineWidth = 4;
      for (let k = 0; k < 3; k++) { const x0 = (k - 1) * 7; c.beginPath(); c.moveTo(x0, 2); for (let i = 1; i <= 8; i++) c.lineTo(x0 + Math.sin(i * 0.8 - tt * 3.4 + k * 2) * (2 + i * 0.35), 2 + i * 3.3); c.stroke(); }
      c.beginPath(); c.moveTo(-bw, 2); c.bezierCurveTo(-bw, -bh * 1.5, bw, -bh * 1.5, bw, 2);
      const sc = 7; for (let i = 0; i < sc; i++) { const x1 = bw - (i + 1) * (bw * 2 / sc), xm = bw - (i + 0.5) * (bw * 2 / sc); c.quadraticCurveTo(xm, 9 + (i % 2) * 1.5, x1, 2); }
      c.closePath();
      c.fillStyle = rgrad(c, -6, -bh * 0.7, 2, 0, -2, bw * 1.2, [[0, 'rgba(255,214,236,.94)'], [0.6, 'rgba(228,176,236,.86)'], [1, 'rgba(176,150,238,.82)']]); c.fill();
      c.strokeStyle = 'rgba(174,112,206,.85)'; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = 'rgba(190,120,200,.35)'; c.lineWidth = 1.2; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * 3, 0); c.quadraticCurveTo(k * 7, -bh * 0.75, k * 8.5, -bh * 1.05 + Math.abs(k) * 2.6); c.stroke(); }
      c.fillStyle = 'rgba(236,110,160,.55)'; [[-8, -8], [8, -8], [-3, -12], [3, -12]].forEach((q) => { c.beginPath(); c.arc(q[0], q[1] * (bh / 22), 3.1, 0, TAU); c.fill(); });
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-11, -bh * 0.78, 8.5, 3.4, -0.5, 0, TAU); c.fill();
      c.restore();
    },
    sparrow(c, t, o) {
      o = o || {};
      const tt = RM ? 0 : t, hop = RM ? 0 : Math.max(0, Math.sin(tt * 2.6)) * 3, pk = o.peck || 0;
      c.save(); c.translate(0, 4 - hop);
      c.fillStyle = 'rgba(30,40,20,.2)'; c.beginPath(); c.ellipse(0, 33 + hop, 17, 3.4, 0, 0, TAU); c.fill();
      c.strokeStyle = '#a77a55'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-3, 22); c.lineTo(-3, 32 + hop); c.moveTo(-3, 32 + hop); c.lineTo(-8, 33 + hop); c.moveTo(-3, 32 + hop); c.lineTo(1, 33 + hop); c.moveTo(5, 22); c.lineTo(5, 32 + hop); c.moveTo(5, 32 + hop); c.lineTo(0, 33 + hop); c.moveTo(5, 32 + hop); c.lineTo(9, 33 + hop); c.stroke();
      c.fillStyle = '#6b4a2d'; c.beginPath(); c.moveTo(-14, 6); c.lineTo(-33, 12 + hop * 0.3); c.lineTo(-31, 19); c.lineTo(-12, 17); c.closePath(); c.fill();
      c.fillStyle = lgrad(c, 0, -14, 0, 28, [[0, '#9a6a3f'], [0.55, '#b88c5d'], [1, '#efe2cb']]); c.beginPath(); c.ellipse(0, 8, 21, 17, 0.12, 0, TAU); c.fill();
      c.fillStyle = '#7a4f2c'; c.beginPath(); c.ellipse(-6, 6, 14, 9, -0.3, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(40,25,10,.55)'; c.lineWidth = 1.4; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-14 + i * 4.5, 0); c.lineTo(-11 + i * 4.5, 9); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(-9, 2); c.quadraticCurveTo(-3, -1, 4, 3); c.lineTo(3, 5); c.quadraticCurveTo(-3, 2, -9, 5); c.closePath(); c.fill();
      c.save(); c.translate(11 + pk * 4, -12 + pk * 5);
      c.fillStyle = '#e5d7c0'; c.beginPath(); c.arc(0, 0, 11.5, 0, TAU); c.fill();
      c.fillStyle = '#8a4b24'; c.beginPath(); c.arc(0, 0, 11.5, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(8, -3); c.quadraticCurveTo(0, -5, -9, -2); c.closePath(); c.fill();
      c.fillStyle = '#fbf7ee'; c.beginPath(); c.ellipse(1, 3.4, 7.6, 5.4, 0.1, 0, TAU); c.fill();
      c.fillStyle = '#2b2522'; c.beginPath(); c.ellipse(1.5, 4.8, 3.2, 2.6, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(-1.6, 3.6, 1.7, 0, TAU); c.fill();
      c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(4.4, -1.3, 1.9, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(4.9, -1.9, 0.65, 0, TAU); c.fill();
      c.fillStyle = '#5b4636'; c.beginPath(); c.moveTo(10.5, -0.5); c.lineTo(18, 2.2); c.lineTo(10.2, 4.6); c.closePath(); c.fill();
      c.restore();
      c.restore();
    },
  };
  function drawOrg(c, key, x, y, s, t, o) {
    c.save(); c.translate(x, y); c.scale(s / 40, s / 40);
    ORG_ART[key](c, t, o);
    c.restore();
  }

  /* =========================================================
     자료: 5계와 생물 10가지
     ========================================================= */
  const KING = [
    { key: 'prok', name: '원핵생물계', color: '#0e93a6', soft: '#d9f3f6', emb: 'ecoli', feat: '핵막이 없는 단세포 생물', short: '핵막 없음 · 단세포', ex: '대장균 같은 세균' },
    { key: 'prot', name: '원생생물계', color: '#e8890c', soft: '#fdecd0', emb: 'paramecium', feat: '핵막은 있지만 조직·기관이 발달하지 않은 생물', short: '핵막 있음 · 조직·기관 미발달', ex: '짚신벌레, 아메바, 미역·김·다시마' },
    { key: 'fung', name: '균계', color: '#8b5cf6', soft: '#ece5fd', emb: 'shiitake', feat: '광합성을 못 하고 세포벽이 있으며, 대부분 균사로 이루어진 생물', short: '광합성 X · 세포벽 O · 균사', ex: '곰팡이, 버섯, 효모' },
    { key: 'plant', name: '식물계', color: '#12a06a', soft: '#dcf6ea', emb: 'fern', feat: '광합성을 하고 뿌리·줄기·잎 같은 기관이 발달한 다세포 생물', short: '광합성 O · 뿌리·줄기·잎', ex: '고사리, 소나무' },
    { key: 'anim', name: '동물계', color: '#e0457b', soft: '#fde1ec', emb: 'sparrow', feat: '광합성을 못 하고 세포벽이 없으며, 조직이 발달한 다세포 생물', short: '광합성 X · 세포벽 X · 조직 발달', ex: '해파리, 참새' },
  ];
  // 생물마다: nuc 핵막, photo 광합성, wall 세포벽, organs 뿌리·줄기·잎, tissue 조직이 발달한 다세포
  const ORGS = {
    ecoli:      { name: '대장균',   king: 0, nuc: false, photo: false, wall: true,  organs: false, tissue: false, body: '단세포 (세균)', why: '핵막이 없는 단세포 생물(세균)이에요.' },
    paramecium: { name: '짚신벌레', king: 1, nuc: true,  photo: false, wall: false, organs: false, tissue: false, body: '단세포', why: '핵막은 있지만 단세포라서 조직·기관이 없어요. 광합성도 못 하고 세포벽도 없어요.' },
    wakame:     { name: '미역',     king: 1, nuc: true,  photo: true,  wall: true,  organs: false, tissue: false, body: '뿌리·줄기·잎 구분 없음', why: '광합성은 하지만 뿌리·줄기·잎 같은 기관이 발달하지 않았어요. (식물계 아님)' },
    penicillium:{ name: '푸른곰팡이', king: 2, nuc: true, photo: false, wall: true,  organs: false, tissue: false, body: '균사로 된 몸', why: '광합성을 못 하고 세포벽이 있으며 균사로 이루어져 있어요.' },
    shiitake:   { name: '표고버섯', king: 2, nuc: true,  photo: false, wall: true,  organs: false, tissue: false, body: '균사로 된 몸', why: '버섯은 식물이 아니에요! 광합성을 못 하고 세포벽이 있으며 균사로 이루어져 있어요.' },
    yeast:      { name: '효모',     king: 2, nuc: true,  photo: false, wall: true,  organs: false, tissue: false, body: '단세포', why: '단세포이지만 광합성을 못 하고 세포벽이 있어서 균계예요.' },
    fern:       { name: '고사리',   king: 3, nuc: true,  photo: true,  wall: true,  organs: true,  tissue: true,  body: '뿌리·줄기·잎 있음', why: '광합성을 하고 뿌리·줄기·잎 같은 기관이 발달했어요.' },
    pine:       { name: '소나무',   king: 3, nuc: true,  photo: true,  wall: true,  organs: true,  tissue: true,  body: '뿌리·줄기·잎 있음', why: '광합성을 하고 뿌리·줄기·잎 같은 기관이 발달했어요.' },
    jellyfish:  { name: '해파리',   king: 4, nuc: true,  photo: false, wall: false, organs: false, tissue: true,  body: '조직이 발달한 다세포', why: '광합성을 못 하고 세포벽이 없으며, 조직이 발달한 다세포 생물이에요.' },
    sparrow:    { name: '참새',     king: 4, nuc: true,  photo: false, wall: false, organs: false, tissue: true,  body: '조직·기관이 발달한 다세포', why: '광합성을 못 하고 세포벽이 없으며, 조직과 기관이 발달한 다세포 생물이에요.' },
  };
  const ORG_KEYS = Object.keys(ORGS);
  const KEY_QS = {                    // 이분 검색표: 질문 → 예/아니오 → 다음 질문 또는 결과(계)
    q1: { text: '핵막이 있나요?', yes: 'q2', no: 'k0', test: (o) => o.nuc, chip: 0 },
    q2: { text: '광합성을 하나요?', yes: 'q3', no: 'q4', test: (o) => o.photo, chip: 1 },
    q3: { text: '뿌리·줄기·잎이 발달했나요?', yes: 'k3', no: 'k1a', test: (o) => o.organs, chip: 3 },
    q4: { text: '세포벽이 있나요?', yes: 'k2', no: 'q5', test: (o) => o.wall, chip: 2 },
    q5: { text: '조직이 발달한 다세포 생물인가요?', yes: 'k4', no: 'k1b', test: (o) => o.tissue, chip: 3 },
  };
  const KEY_LEAF = { k0: 0, k1a: 1, k1b: 1, k2: 2, k3: 3, k4: 4 };
  // 어떤 생물이 검색표에서 지나는 길: [[질문, 답], ...] → 결과
  function keyPath(orgKey) {
    const o = ORGS[orgKey], steps = []; let node = 'q1';
    while (KEY_QS[node]) { const q = KEY_QS[node], ans = q.test(o); steps.push([node, ans]); node = ans ? q.yes : q.no; }
    return { steps, leaf: node };
  }
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c % 28 !== 0 ? a : b); };
  // 질문에서 알아야 할 특징 (피드백용)
  function keyHint(q, orgKey) {
    const o = ORGS[orgKey], nm = josa(o.name, '은', '는');
    if (q === 'q1') return o.nuc ? nm + ' 핵막이 있어요. 그래서 "예"예요.' : nm + ' 핵막이 없어요. 그래서 "아니오"예요.';
    if (q === 'q2') return o.photo ? nm + ' 광합성을 해요. 그래서 "예"예요.' : nm + ' 광합성을 못 해요. 그래서 "아니오"예요.';
    if (q === 'q3') return o.organs ? nm + ' 뿌리·줄기·잎이 발달했어요. 그래서 "예"예요.' : nm + ' 뿌리·줄기·잎이 발달하지 않았어요. 그래서 "아니오"예요.';
    if (q === 'q4') return o.wall ? nm + ' 세포벽이 있어요. 그래서 "예"예요.' : nm + ' 세포벽이 없어요. 그래서 "아니오"예요.';
    return o.tissue ? nm + ' 조직이 발달한 다세포 생물이에요. 그래서 "예"예요.' : nm + ' 단세포라서 조직이 발달하지 않았어요. 그래서 "아니오"예요.';
  }
  const FEAT_CARDS = [      // 기준 카드: 계 상자에 끌어 놓아요
    { king: 0, text: '핵막이 없는 단세포 생물' },
    { king: 1, text: '핵막은 있지만 조직·기관이 발달하지 않은 생물' },
    { king: 2, text: '광합성을 못 하고 세포벽이 있으며 균사로 이루어진 것이 많은 생물' },
    { king: 3, text: '광합성을 하고 뿌리·줄기·잎 같은 기관이 발달한 다세포 생물' },
    { king: 4, text: '광합성을 못 하고 세포벽이 없으며 조직이 발달한 다세포 생물' },
  ];
  const RANKS = [
    { n: '종', taxon: '호랑이', color: '#12a06a', soft: '#dcf6ea', mem: [], slots: [] },
    { n: '속', taxon: '표범속', color: '#2f7fe8', soft: '#dfeafd', mem: [['🦁', '사자'], ['🐆', '표범']], slots: [[-0.405, -0.13], [0.405, 0.13]] },
    { n: '과', taxon: '고양잇과', color: '#8b5cf6', soft: '#ece5fd', mem: [['🐱', '고양이'], ['…', '그 밖의 고양이류']], slots: [[0.04, -0.415], [0.04, 0.415]] },
    { n: '목', taxon: '식육목', color: '#e8890c', soft: '#fdecd0', mem: [['🐕', '개'], ['🐺', '늑대'], ['🐻', '곰'], ['🦊', '여우']], slots: [[-0.405, -0.16], [-0.405, 0.16], [0.405, -0.16], [0.405, 0.16]] },
    { n: '강', taxon: '포유강', color: '#e0457b', soft: '#fde1ec', mem: [['🐰', '토끼'], ['🐄', '소'], ['🐳', '고래'], ['🦇', '박쥐'], ['🧑', '사람'], ['🐘', '코끼리']], slots: [[-0.2, -0.415], [0.2, -0.415], [-0.2, 0.415], [0.2, 0.415], [-0.405, 0.0], [0.405, 0.0]] },
    { n: '문', taxon: '척삭동물문', color: '#0e93a6', soft: '#d9f3f6', mem: [['🐦', '참새'], ['🐍', '뱀'], ['🐸', '개구리'], ['🐟', '물고기'], ['🐢', '거북']], slots: [[0.02, -0.415], [-0.23, 0.415], [0.23, 0.415], [-0.405, 0.04], [0.405, 0.04]] },
    { n: '계', taxon: '동물계', color: '#4f46e5', soft: '#e3e2fb', mem: [['🦋', '나비'], ['🐝', '꿀벌'], ['🐌', '달팽이'], ['🦀', '게'], ['🐙', '문어']], slots: [[-0.1, -0.415], [0.26, -0.415], [-0.25, 0.415], [0.1, 0.415], [0.405, 0.06]] },
  ];
  const RANK_CUM = RANKS.map((r, i) => 1 + RANKS.slice(1, i + 1).reduce((n, q) => n + q.mem.filter((m) => m[0] !== '…').length, 0));      // 호랑이 + 그 상자에 든 예시 생물 수

  /* =========================================================
     상태
     ========================================================= */
  const VIEW_ORDER = ['sp', 'ranks', 'key', 'sort'];
  const S = { scene: 'sp', prevKey: null, sceneT0: -9, snapOK: false, drag: null };
  let game = null;
  const isNew = (f) => !!(game && game.isNew(f));
  let MANUAL = false;
  $('#game').addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('.mission-actions .btn-primary')) { MANUAL = true; setTimeout(() => { MANUAL = false; }, 0); }
  }, true);

  /* =========================================================
     배치 (태블릿 가로형 / 휴대폰 세로형)
     ========================================================= */
  function computeLayouts() {
    if (!TALL) {
      return {
        sp: {
          arena: { x: 14, y: 50, w: 772, h: 322 }, base: 270, homeA: 150, homeB: 622, mid: 386, sc: 1.05,
          table: { x: 14, y: 384, w: 772, h: 248 },
          hint: { x: 400, y: 28, maxW: 700 },
        },
        ranks: {
          area: { x: 14, y: 50, w: 640, h: 512 }, chain: { x: 664, y: 50, w: 122, h: 512 },
          cap: { x: 14, y: 572, w: 772, h: 60 }, capOrder: { x: 14, y: 560, w: 772, h: 72 },
          slot: { x0: 14, y: 120, w: 100, h: 118, gap: 12 }, tray: { x0: 14, y: 300, w: 100, h: 118, gap: 12 },
          hint: { x: 400, y: 28, maxW: 700 },
        },
        key: {
          tree: { x: 14, y: 50, w: 772, h: 418 }, rows: [36, 112, 188, 264, 366], leafH: 46, leafW: 120, nodeH: 46,
          strip: { x: 14, y: 478, w: 772, h: 154 },
          card: { x: 14, y: 478, w: 470, h: 154 }, pick: { x: 492, y: 478, w: 294, h: 154 },
          hint: { x: 400, y: 28, maxW: 750 },
        },
        board: {
          bx: 14, by: 50, bw: 148, bh: 236, bgap: 8,
          trayOrg: { x: 14, y: [316, 424], w: 148, h: 100, gap: 8, cols: 5 },
          trayFeat: { x: 14, y: [316], w: 148, h: 170, gap: 8, cols: 5 },
          capOrg: { x: 14, y: 534, w: 772, h: 98 }, capFeat: { x: 14, y: 496, w: 772, h: 136 },
          hint: { x: 400, y: 28, maxW: 700 },
        },
      };
    }
    return {
      sp: {
        arena: { x: 8, y: 44, w: 444, h: 352 }, base: 296, homeA: 84, homeB: 360, mid: 222, sc: 0.7,
        table: { x: 8, y: 404, w: 444, h: 388 },
        hint: { x: 230, y: 24, maxW: 430 },
      },
      ranks: {
        area: { x: 8, y: 104, w: 444, h: 500 }, chain: { x: 8, y: 44, w: 444, h: 52 },
        cap: { x: 8, y: 612, w: 444, h: 180 }, capOrder: { x: 8, y: 490, w: 444, h: 130 },
        slot: { x0: 8, y: 60, w: 216, h: 54, gap: 6 }, tray: { x0: 236, y: 60, w: 216, h: 54, gap: 6 },
        hint: { x: 230, y: 24, maxW: 430 },
      },
      key: {
        tree: { x: 8, y: 44, w: 444, h: 444 }, rows: [34, 118, 202, 286, 392], leafH: 42, leafW: 70, nodeH: 46,
        strip: { x: 8, y: 496, w: 444, h: 268 },
        card: { x: 8, y: 496, w: 444, h: 158 }, pick: { x: 8, y: 662, w: 444, h: 102 },
        hint: { x: 230, y: 24, maxW: 430 },
      },
      board: {
        bx: 8, by: 44, bw: 444, bh: 70, bgap: 6,
        trayOrg: { x: 8, y: [446, 548], w: 84, h: 96, gap: 6, cols: 5 },
        trayFeat: { x: 8, y: [438], w: 444, h: 44, gap: 4, cols: 1 },
        capOrg: { x: 8, y: 654, w: 444, h: 138 }, capFeat: { x: 8, y: 676, w: 444, h: 116 },
        hint: { x: 230, y: 24, maxW: 430 },
      },
    };
  }

  /* =========================================================
     카드 끌어 놓기 (공통)
     ========================================================= */
  function mkCard(o) { return Object.assign({ x: 0, y: 0, w: 100, h: 50, lift: 0, bad: -9, ok: false, tw: null }, o); }
  function moveCard(cd, r, animate) {
    if (cd.tw) cd.tw.cancel();
    if (animate && !RM) { cd.tw = SciSim.tween(cd, { x: r.x, y: r.y, w: r.w, h: r.h }, { duration: 0.42, ease: 'outBack' }); }
    else { cd.x = r.x; cd.y = r.y; cd.w = r.w; cd.h = r.h; }
  }
  function cardAt(list, p) { for (let i = list.length - 1; i >= 0; i--) if (inR(p, list[i], 4)) return list[i]; return null; }
  function raise(list, cd) { list.splice(list.indexOf(cd), 1); list.push(cd); }
  function snapAll(list, targetFn, animate) { list.forEach((cd) => moveCard(cd, targetFn(cd), animate)); }
  function cardFrame(cd, t, accent, fn, o) {
    o = o || {};
    const lift = cd.lift, sc = 1 + 0.06 * lift;
    let shake = 0;
    const ba = t - cd.bad;
    if (ba < 0.55) shake = Math.sin(ba * 42) * 7 * (1 - ba / 0.55);
    const pop = cd.pop != null ? Math.max(0, now() - cd.pop) : 9;
    const bump = pop < 0.5 ? Math.sin(pop / 0.5 * Math.PI) * 0.08 : 0;
    const rad = o.r != null ? o.r : 14;
    ctx.save();
    ctx.translate(cd.x + cd.w / 2 + shake, cd.y + cd.h / 2 - lift * 4);
    ctx.scale(sc + bump, sc + bump);
    const lq = Math.round(lift * 4) / 4;
    dropShadow(-cd.w / 2, -cd.h / 2, cd.w, cd.h, rad, 6 + lq * 16, 2 + lq * 7, 'rgba(20,40,30,' + (0.16 + lq * 0.14).toFixed(2) + ')');
    rr(-cd.w / 2, -cd.h / 2, cd.w, cd.h, rad); ctx.fillStyle = cd.ok ? '#f3fdf6' : (o.bg || '#fff'); ctx.fill();
    const bad = ba < 1.2;
    rr(-cd.w / 2, -cd.h / 2, cd.w, cd.h, rad);
    ctx.strokeStyle = bad ? '#ef4444' : cd.ok ? '#22c55e' : accent || '#c9d4e2'; ctx.lineWidth = bad || cd.ok ? 3 : 2; ctx.stroke();
    ctx.save(); ctx.translate(-cd.w / 2, -cd.h / 2); fn(cd.w, cd.h); ctx.restore();
    if (cd.ok && !o.noCheck) D.check(cd.w / 2 - 12, -cd.h / 2 + 12, 8, 1);
    ctx.restore();
  }
  function dragSetup(cd, set, list, p) {
    if (cd.tw) cd.tw.cancel();
    S.drag = { card: cd, set, list, dx: p.x - cd.x, dy: p.y - cd.y, sx: p.x, sy: p.y, px: p.x, py: p.y, moved: false };
    raise(list, cd); cd.ok = false;
    Sound.click();
    return true;
  }
  // 말풍선 (꼬리가 아래를 가리켜요)
  function bubble(s, x, y, o) {
    o = o || {};
    const size = o.size || 15, a = o.alpha != null ? o.alpha : 1, sc = o.scale != null ? o.scale : 1;
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.font = font(size, 800);
    const tw = ctx.measureText(s).width, w = tw + 26, h = size + 18;
    dropShadow(-w / 2, -h - 10, w, h, 14, 8, 2, 'rgba(20,30,40,.2)');
    rr(-w / 2, -h - 10, w, h, 14); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    rr(-w / 2, -h - 10, w, h, 14); ctx.strokeStyle = o.border || '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = o.bg || '#fff'; ctx.beginPath(); ctx.moveTo(-7, -11); ctx.lineTo(0, -1); ctx.lineTo(7, -11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = o.border || '#cbd5e1'; ctx.beginPath(); ctx.moveTo(-7, -10.5); ctx.lineTo(0, -1); ctx.lineTo(7, -10.5); ctx.stroke();
    txt(s, 0, -h / 2 - 9, { size, weight: 800, color: o.color || '#334155', align: 'center', base: 'middle' });
    ctx.restore();
  }

  /* =========================================================
     ① 종의 뜻: 짝짓기 실험
     ========================================================= */
  const EXPS = [
    { a: 'horse', b: 'donkey', c: 'mule', an: '말', bn: '당나귀', asx: '♀', bsx: '♂', cn: '노새', fertile: false, same: false,
      ask: '말(♀)과 당나귀(♂)를 짝짓기 시켜 볼까요?', note1: '태어난 노새가 자라서 새끼를 낳을 수 있는지 시험해 봐요.', line1: '말과 당나귀가 짝짓기해서 노새가 태어났어요.', line2: '노새끼리는 새끼를 낳지 못해요. 생식 능력이 없어요.', verdict: '다른 종', repro: '새끼를 낳지 못해요' },
    { a: 'jindo', b: 'sapsaree', c: 'puppy', an: '진돗개', bn: '삽살개', asx: '♂', bsx: '♀', cn: '강아지', fertile: true, same: true,
      ask: '진돗개(♂)와 삽살개(♀)를 짝짓기 시켜 볼까요?', note1: '태어난 강아지가 자라서 새끼를 낳을 수 있는지 시험해 봐요.', line1: '진돗개와 삽살개가 짝짓기해서 강아지가 태어났어요.', line2: '자란 강아지끼리 짝짓기하니 새끼가 태어났어요. 생식 능력이 있어요.', verdict: '같은 종', repro: '새끼를 낳아요' },
  ];
  const SP_T = { walkIn: 1.5, love0: 1.7, love1: 3.3, spark: 3.3, childIn: 0.65, back0: 3.7, back1: 5.0, end1: 5.3, grow: 1.1, heart2: 1.4, res: 2.6, stamp: 3.9, end2: 4.8 };
  const SP = { sel: 0, run: [0, 1].map(() => ({ ph: 0, t0: -99, t1: -99, nh: 0, fired: {}, recT: -99 })), rec: [false, false], hearts: [], label: '' };
  function spReset(i) { const r = SP.run[i]; r.ph = 0; r.t0 = r.t1 = -99; r.nh = 0; r.fired = {}; }
  function spStartMating(i) { spReset(i); const r = SP.run[i]; r.ph = 1; r.t0 = now(); r.nh = SP_T.love0; Sound.click(); }
  function spStartBreed(i) { const r = SP.run[i]; if (r.ph !== 1) return; r.ph = 2; r.t1 = now(); r.nh = SP_T.heart2; r.fired = {}; Sound.click(); }
  const spT1 = (i) => now() - SP.run[i].t0, spT2 = (i) => now() - SP.run[i].t1;
  function spBusy(i) { const r = SP.run[i]; return (r.ph === 1 && spT1(i) < SP_T.end1) || (r.ph === 2 && spT2(i) < SP_T.end2); }
  function spBtnState() {
    const i = SP.sel, r = SP.run[i];
    if (r.ph === 0) return { label: '💞 짝짓기 시키기', dis: false, act: 'mate' };
    if (r.ph === 1) return spBusy(i) ? { label: '💞 짝짓기 중…', dis: true, act: '' } : { label: '🔁 자손끼리 짝짓기', dis: false, act: 'breed' };
    return spBusy(i) ? { label: '🔁 번식 시험 중…', dis: true, act: '' } : { label: '↺ 처음부터 다시 보기', dis: false, act: 'again' };
  }
  function spAct() {
    const b = spBtnState(); if (b.dis) return;
    hideHint();
    if (b.act === 'mate' || b.act === 'again') spStartMating(SP.sel); else if (b.act === 'breed') spStartBreed(SP.sel);
    updateSpUI();
  }
  // 동물을 누르면 폴짝 뛰며 소리를 내요
  const SP_SND = { horse: [[620, 0.1, 0], [820, 0.12, 0.09], [560, 0.18, 0.2]], donkey: [[420, 0.16, 0], [640, 0.16, 0.18], [420, 0.16, 0.36], [640, 0.2, 0.54]], mule: [[480, 0.14, 0], [700, 0.14, 0.16], [480, 0.14, 0.32]], jindo: [[320, 0.07, 0], [270, 0.1, 0.1]], sapsaree: [[240, 0.09, 0], [210, 0.12, 0.12]], puppy: [[640, 0.05, 0], [560, 0.07, 0.09]] };
  SP.poke = {}; SP.hits = [];
  function spPoke(h) {
    SP.poke[h.id] = now();
    const seq = SP_SND[h.name], type = QUAD[h.name].kind === 'equid' ? 'sawtooth' : 'square';
    seq.forEach((n) => Sound.tone(n[0], n[1], type, 0.035, n[2]));
    burst(h.x + h.w / 2, h.y + h.h * 0.15, ['#fde047', '#ffffff', '#ff7aa2'], 7, { speed: 80, life: 0.55, gravity: 30, size: 3 });
  }
  const spHop = (id) => { const u = (now() - (SP.poke[id] != null ? SP.poke[id] : -9)) / 0.6; return u >= 0 && u < 1 ? Math.sin(u * Math.PI) * 15 * (1 - u * 0.4) : 0; };
  function spHitAt(p) { for (let i = SP.hits.length - 1; i >= 0; i--) if (inR(p, SP.hits[i], 6)) return SP.hits[i]; return null; }
  function spSelect(i) { if (SP.sel === i) return; SP.sel = i; SP.hearts.length = 0; Sound.click(); updateSpUI(); }
  const spDone = () => SP.rec[0] && SP.rec[1];
  // 이어하기용: 두 실험을 모두 끝낸 모습으로
  function spSolve() { [0, 1].forEach((i) => { const r = SP.run[i]; r.ph = 2; r.t0 = now() - 99; r.t1 = now() - 99; r.fired = { spark: 1, res: 1, stamp: 1 }; r.recT = now() - 99; SP.rec[i] = true; }); SP.hearts.length = 0; updateSpUI(); }
  function spFullReset() { [0, 1].forEach((i) => { spReset(i); SP.rec[i] = false; }); SP.hearts.length = 0; SP.sel = 0; updateSpUI(); }
  function spUpdate(dt) {
    SP.run.forEach((r, i) => {
      if (r.ph === 0) return;
      const G = LAY.sp, base = G.base;
      if (r.ph >= 1) {
        const T = spT1(i);
        if (r.ph === 1 && T >= SP_T.love0 && T < SP_T.love1 && T >= r.nh) { r.nh += 0.26; if (i === SP.sel) SP.hearts.push({ x: G.mid + (Math.random() - 0.5) * 40, y: base - 120, vx: (Math.random() - 0.5) * 24, vy: -42 - Math.random() * 20, age: 0, life: 1.7, size: 11 + Math.random() * 8, col: ['#ff5c8a', '#ff7aa2', '#f43f5e'][Math.floor(Math.random() * 3)], broken: false }); }
        if (T >= SP_T.spark && !r.fired.spark) { r.fired.spark = 1; if (i === SP.sel) { const A = LAY.sp.arena; burst(A.x + G.mid, A.y + base - 50, ['#fde047', '#ffffff', '#ff7aa2', '#86efac'], 22, { speed: 150, life: 0.9, gravity: 40 }); } Sound.tone(660, 0.12, 'triangle', 0.07); Sound.tone(880, 0.16, 'triangle', 0.06, 0.1); }
      }
      if (r.ph === 2) {
        const T = spT2(i), E = EXPS[i];
        if (T >= SP_T.heart2 && T < SP_T.res && T >= r.nh) { r.nh += 0.28; if (i === SP.sel) SP.hearts.push({ x: G.mid + (Math.random() - 0.5) * 60, y: base - 118, vx: (Math.random() - 0.5) * 20, vy: -38 - Math.random() * 18, age: 0, life: 1.6, size: 10 + Math.random() * 7, col: ['#ff5c8a', '#ff7aa2', '#f43f5e'][Math.floor(Math.random() * 3)], broken: false }); }
        if (T >= SP_T.res && !r.fired.res) {
          r.fired.res = 1;
          if (i === SP.sel) {
            const A = LAY.sp.arena;
            if (E.fertile) { burst(A.x + G.mid, A.y + base - 40, ['#fde047', '#ff7aa2', '#ffffff', '#86efac'], 26, { speed: 170, life: 1, gravity: 60 }); Sound.success(); }
            else { burst(A.x + G.mid, A.y + base - 90, ['#94a3b8', '#cbd5e1', '#64748b'], 16, { speed: 90, life: 0.9, gravity: 160 }); Sound.fail(); for (let k = 0; k < 4; k++) SP.hearts.push({ x: G.mid + (k - 1.5) * 18, y: base - 118, vx: (k - 1.5) * 16, vy: -10, age: 0, life: 1.4, size: 11, col: '#94a3b8', broken: true, g: 120 }); }
          }
        }
        if (T >= SP_T.stamp && !r.fired.stamp) { r.fired.stamp = 1; SP.rec[i] = true; r.recT = now(); if (i === SP.sel) Sound.tone(520, 0.16, 'triangle', 0.08); }
      }
    });
    for (let k = SP.hearts.length - 1; k >= 0; k--) {
      const h = SP.hearts[k]; h.age += dt;
      if (h.age >= h.life) { SP.hearts.splice(k, 1); continue; }
      h.vy += (h.g || 0) * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.vx *= Math.exp(-0.6 * dt);
    }
  }

  function drawMeadow(c, w, h, base, t) {
    const tt = RM ? 0 : t;
    c.fillStyle = lgrad(c, 0, 0, 0, base, [[0, '#d5ecfa'], [1, '#f4faee']]); c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.85)';
    [[0.18, 0.12, 34], [0.62, 0.08, 28], [0.86, 0.2, 22]].forEach((cl, i) => { const x = ((cl[0] * w + tt * (5 + i * 3)) % (w + 160)) - 80; c.beginPath(); c.ellipse(x, h * cl[1] + 18, cl[2], cl[2] * 0.36, 0, 0, TAU); c.ellipse(x + cl[2] * 0.6, h * cl[1] + 12, cl[2] * 0.62, cl[2] * 0.34, 0, 0, TAU); c.ellipse(x - cl[2] * 0.5, h * cl[1] + 20, cl[2] * 0.5, cl[2] * 0.28, 0, 0, TAU); c.fill(); });
    c.fillStyle = lgrad(c, 0, base - 120, 0, base, [[0, '#a9d8a0'], [1, '#8fc78a']]);
    c.beginPath(); c.moveTo(0, base - 10); c.bezierCurveTo(w * 0.15, base - 70, w * 0.32, base - 80, w * 0.5, base - 40); c.bezierCurveTo(w * 0.68, base - 8, w * 0.84, base - 80, w, base - 50); c.lineTo(w, base + 10); c.lineTo(0, base + 10); c.closePath(); c.fill();
    c.fillStyle = lgrad(c, 0, base - 30, 0, h, [[0, '#8bd081'], [1, '#5fae5a']]); c.fillRect(0, base - 16, w, h - base + 16);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(w * 0.5, base - 14, w * 0.6, 8, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(40,120,50,.45)'; c.lineWidth = 1.7; c.lineCap = 'round';
    const R = rng(33);
    for (let i = 0; i < 46; i++) { const x = R() * w, y = base - 10 + R() * (h - base + 6), sw = RM ? 0 : Math.sin(tt * 1.3 + i) * 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + sw, y - 6, x + sw * 1.5 + (i % 2 ? 3 : -3), y - 12 - (i % 4)); c.stroke(); }
    ['#f9a8d4', '#fde68a', '#ffffff', '#fdba74'].forEach((col, ci) => { c.fillStyle = col; for (let i = 0; i < 6; i++) { const x = R() * w, y = base + 4 + R() * (h - base - 8); c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(x, y, 0.9, 0, TAU); c.fill(); c.fillStyle = col; } });
  }
  function quadAt(name, x, y, sc, face, t, o) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc * face, sc); drawQuad(ctx, name, t, o || {}); ctx.restore();
  }
  const sp01 = (T, a, b) => clamp((T - a) / (b - a), 0, 1);
  function drawSpArena(t) {
    const G = LAY.sp, A = G.arena, i = SP.sel, E = EXPS[i], r = SP.run[i], sc = G.sc, base = G.base;
    dropShadow(A.x, A.y, A.w, A.h, 18, 12, 3, 'rgba(30,60,40,.16)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 18); ctx.clip(); ctx.translate(A.x, A.y);
    drawMeadow(ctx, A.w, A.h, base, t);
    // 초기 상태
    let xa = G.homeA, xb = G.homeB, fa = 1, fb = -1, wkA = 0, wkB = 0, wph = t * 9, nod = 0;
    let childAlpha = 0, childX = G.mid, childAge = 0.1, childFace = 1, childScale = 1, childWalk = 0, partnerX = 0, partnerOn = false, pups = 0;
    let T = 0, T2 = 0;
    const meet = G.mid - (TALL ? 44 : 64), meetB = G.mid + (TALL ? 44 : 64);
    if (r.ph >= 1) {
      T = r.ph === 1 ? spT1(i) : 99;
      const u1 = EASE.inOutCubic(sp01(T, 0, SP_T.walkIn)), u2 = EASE.inOutCubic(sp01(T, SP_T.back0, SP_T.back1));
      if (T < SP_T.back0) { xa = lerp(G.homeA, meet, u1); xb = lerp(G.homeB, meetB, u1); wkA = wkB = 1 - sp01(T, SP_T.walkIn - 0.25, SP_T.walkIn); }
      else if (T < SP_T.back1) { xa = lerp(meet, G.homeA, u2); xb = lerp(meetB, G.homeB, u2); fa = -1; fb = 1; wkA = wkB = 1 - sp01(T, SP_T.back1 - 0.2, SP_T.back1); }
      else { xa = G.homeA; xb = G.homeB; }
      if (T >= SP_T.love0 && T < SP_T.back0) nod = Math.sin(T * 6) * 0.05;
      const ca = EASE.outBack(sp01(T, SP_T.spark, SP_T.spark + SP_T.childIn));
      childAlpha = clamp(ca * 2, 0, 1); childScale = Math.max(0.01, ca);
      if (r.ph === 2) {
        T2 = spT2(i);
        childAlpha = 1; childScale = 1;
        const g = EASE.outCubic(sp01(T2, 0, SP_T.grow)), mv = EASE.inOutCubic(sp01(T2, 0.1, 1.2));
        childAge = lerp(0.1, 1, g); childX = lerp(G.mid, G.mid - (TALL ? 52 : 84), mv); childWalk = (mv > 0 && mv < 1) ? 1 : 0;
        partnerOn = true; const pm = EASE.inOutCubic(sp01(T2, 0.25, 1.4)); partnerX = lerp(A.w + 90, G.mid + (TALL ? 52 : 84), pm);
        pups = E.fertile ? 3 : 0;
      } else childAge = 0.1;
    }
    // 부모
    SP.hits = [];
    const reg = (id, name, x, size, kind) => { const w = (kind === 'equid' ? 150 : 96) * size, h = (kind === 'equid' ? 140 : 86) * size; SP.hits.push({ id, name, x: A.x + x - w / 2 - (kind === 'equid' ? 0 : 0), y: A.y + base - h, w, h }); };
    quadAt(E.a, xa, base - spHop('a'), sc, fa, t, { ph: 0.3, walk: wkA, wph, nod: fa > 0 ? nod : 0 });
    quadAt(E.b, xb, base - spHop('b'), sc, fb, t, { ph: 1.7, walk: wkB, wph: wph + 1.5, nod: fb < 0 ? nod : 0 });
    reg('a', E.a, xa, sc, QUAD[E.a].kind); reg('b', E.b, xb, sc, QUAD[E.b].kind);
    const tagY = base - (TALL ? 120 : 150) * (sc / 1.05) - 8;
    pill(E.an + ' ' + E.asx, xa + 10 * sc * fa, tagY + (r.ph >= 1 && T < SP_T.back0 ? Math.sin(t * 5) * 1.5 : 0), { size: 14, bg: E.asx === '♀' ? '#e0457b' : '#2f7fe8', pad: 10, h: 24 });
    pill(E.bn + ' ' + E.bsx, xb - 10 * sc * (fb < 0 ? 1 : -1) * 1, tagY, { size: 14, bg: E.bsx === '♀' ? '#e0457b' : '#2f7fe8', pad: 10, h: 24 });
    // 자손
    if (r.ph >= 1 && childAlpha > 0.02) {
      ctx.save(); ctx.globalAlpha *= childAlpha;
      const cs = sc * (E.c === 'mule' ? 1.0 : 1.08) * childScale;
      quadAt(E.c, childX, base - spHop('c'), cs, 1, t, { age: childAge, ph: 2.2, walk: childWalk, wph, wag: 1 });
      ctx.restore();
      if (childAlpha > 0.6) reg('c', E.c, childX, cs * lerp(0.7, 1, childAge), QUAD[E.c].kind);
      if (r.ph === 1 && T > SP_T.spark + 0.5) { ctx.save(); ctx.globalAlpha *= clamp((T - SP_T.spark - 0.5) / 0.4, 0, 1); pill('자손: ' + E.cn, childX, base - (TALL ? 86 : 108) * (sc / 1.05) - (E.c === 'mule' ? 6 : 0), { size: 14, bg: '#12a06a', pad: 11, h: 26, shadow: true }); ctx.restore(); }
    }
    if (partnerOn) { quadAt(E.c, partnerX, base - spHop('p'), sc * (E.c === 'mule' ? 1.0 : 1.08), -1, t, { age: 1, ph: 3.1, walk: partnerX > G.mid + (TALL ? 52 : 84) + 2 ? 1 : 0, wph: wph + 2 }); reg('p', E.c, partnerX, sc * (E.c === 'mule' ? 1.0 : 1.08), QUAD[E.c].kind); }
    if (pups) for (let k = 0; k < pups; k++) {
      const u = EASE.outBack(sp01(T2, SP_T.res + k * 0.15, SP_T.res + 0.65 + k * 0.15));
      if (u > 0.01) { const hop = RM ? 0 : Math.abs(Math.sin(t * 5 + k * 1.7)) * 7 * sp01(T2, SP_T.res + 0.7, SP_T.res + 1.0); quadAt('puppy', G.mid + (k - 1) * (TALL ? 28 : 40), base + 8 - hop, sc * 0.62 * u, k % 2 ? -1 : 1, t, { age: 0.12, ph: k * 1.3, wag: 1 }); }
    }
    // 하트
    SP.hearts.forEach((h) => { const a = h.age / h.life, al = a < 0.15 ? a / 0.15 : 1 - Math.max(0, (a - 0.6) / 0.4); heart(ctx, h.x, h.y, h.size, h.col, { alpha: clamp(al, 0, 1), rot: Math.sin(h.age * 5 + h.x) * 0.25, broken: h.broken }); });
    // 말풍선
    if (r.ph === 2) {
      if (E.fertile) { const u = EASE.outBack(sp01(T2, SP_T.res + 0.15, SP_T.res + 0.7)); bubble('✓ 새끼를 낳아요', G.mid, base - (TALL ? 146 : 190), { scale: u, alpha: clamp(u * 2, 0, 1), border: '#22c55e', color: '#15803d', bg: '#f0fdf4' }); }
      else { const u = EASE.outBack(sp01(T2, SP_T.res + 0.1, SP_T.res + 0.65)); bubble('✗ 새끼를 낳지 못해요', G.mid, base - (TALL ? 150 : 190), { scale: u, alpha: clamp(u * 2, 0, 1), border: '#ef4444', color: '#b91c1c', bg: '#fef2f2' }); }
      // 판정 도장
      const su = EASE.outBack(sp01(T2, SP_T.stamp, SP_T.stamp + 0.5));
      if (su > 0.01) {
        ctx.save(); ctx.translate(A.w - (TALL ? 74 : 100), TALL ? 72 : 46); ctx.rotate(-0.12); ctx.scale(su, su);
        const col = E.same ? '#16a34a' : '#dc2626';
        rr(-56, -22, 112, 44, 12); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.stroke();
        rr(-51, -17, 102, 34, 8); ctx.lineWidth = 1.4; ctx.stroke();
        txt(E.verdict, 0, 1, { size: 21, weight: 800, color: col, align: 'center', base: 'middle' });
        ctx.restore();
      }
    }
    // 안내 문구
    let msg = '';
    if (r.ph === 0) msg = E.ask;
    else if (r.ph === 1) msg = T > SP_T.spark + 0.6 ? E.line1 : '';
    else if (T2 > SP_T.res + 0.5) msg = E.line2;
    else if (T2 > 0.3) msg = '자란 ' + E.cn + '끼리 짝짓기를 시켜 봐요.';
    if (msg) { const a = r.ph === 0 ? 1 : 1; ctx.save(); ctx.globalAlpha *= a; pill(msg, A.w / 2, TALL ? 22 : 24, { size: TALL ? 13.5 : 15, bg: 'rgba(255,255,255,.92)', color: '#334155', pad: 14, h: TALL ? 28 : 32, shadow: true }); ctx.restore(); }
    ctx.restore();
    rr(A.x, A.y, A.w, A.h, 18); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.stroke();
  }
  function miniQuad(name, x, y, s, face, t, o) { quadAt(name, x, y, s, face || 1, t, Object.assign({ ph: 0 }, o || {})); }
  function drawSpTable(t) {
    const G = LAY.sp, Tb = G.table;
    panel(Tb.x, Tb.y, Tb.w, Tb.h, { bg: '#fff', border: '#e2e8f0', r: 18 });
    pill('📋 실험 결과 기록표', Tb.x + 14, Tb.y + (TALL ? 20 : 22), { size: 14, align: 'left', bg: '#dcfce7', color: '#166534', pad: 12, h: 28 });
    const rowsY = [], ts = TALL ? 0.34 : 0.3;
    if (!TALL) {
      const cB = Tb.x + 14, cP = Tb.x + 56, cN = Tb.x + 196, cC = Tb.x + 336, cR = Tb.x + 480, cV = Tb.x + 706;
      [['실험', cB], ['짝짓기한 두 생물', cP], ['태어난 자손', cC], ['자손의 번식', cR], ['결론', cV - 22]].forEach((h) => txt(h[0], h[1], Tb.y + 58, { size: 13.5, weight: 800, color: '#64748b' }));
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Tb.x + 12, Tb.y + 66); ctx.lineTo(Tb.x + Tb.w - 12, Tb.y + 66); ctx.stroke();
      EXPS.forEach((E, i) => {
        const y = Tb.y + 70 + i * 66, cy = y + 33, done = SP.rec[i], a = done ? clamp((now() - SP.run[i].recT) / 0.5, 0, 1) : 0, pop = EASE.outBack(a);
        ctx.fillStyle = i === SP.sel ? 'rgba(220,252,231,.55)' : 'rgba(0,0,0,0)'; rr(Tb.x + 8, y + 3, Tb.w - 16, 60, 12); ctx.fill();
        ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(cB + 14, cy, 14, 0, TAU); ctx.fill(); txt(String(i + 1), cB + 14, cy + 1, { size: 15, weight: 800, color: '#fff', align: 'center', base: 'middle' });
        miniQuad(E.a, cP + 24, cy + 24, 0.36, 1, t, { ph: 0 }); miniQuad(E.b, cP + 98, cy + 24, 0.36, -1, t, { ph: 1 });
        txt('×', cP + 61, cy + 6, { size: 20, weight: 800, color: '#94a3b8', align: 'center' });
        txt(E.an + ' × ' + E.bn, cN, cy + 5, { size: 15, weight: 800, color: '#334155', max: 128, min: 12 });
        if (done) {
          ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - pop) * 8);
          miniQuad(E.c, cC + 22, cy + 24, 0.4, 1, t, { age: 1, ph: 2 }); txt(E.cn, cC + 62, cy + 5, { size: 15.5, weight: 800, color: '#334155' });
          txt(E.fertile ? '✓' : '✗', cR + 8, cy + 8, { size: 22, weight: 800, color: E.fertile ? '#16a34a' : '#dc2626', align: 'center' });
          txt(E.repro, cR + 26, cy + 5, { size: 14, weight: 800, color: E.fertile ? '#15803d' : '#b91c1c', max: 130, min: 11 });
          pill(E.verdict, cV, cy, { size: 15, bg: E.same ? '#16a34a' : '#dc2626', pad: 12, h: 30 });
          ctx.restore();
        } else {
          txt('?', cC + 40, cy + 6, { size: 22, weight: 800, color: '#cbd5e1', align: 'center' }); txt('?', cR + 40, cy + 6, { size: 22, weight: 800, color: '#cbd5e1', align: 'center' }); txt('?', cV, cy + 6, { size: 22, weight: 800, color: '#cbd5e1', align: 'center' });
        }
      });
      const y = Tb.y + 70 + 2 * 66 + 2;
      if (spDone()) {
        const a = clamp((now() - Math.max(SP.run[0].recT, SP.run[1].recT) - 0.3) / 0.5, 0, 1);
        ctx.save(); ctx.globalAlpha = a; rr(Tb.x + 12, y, Tb.w - 24, Tb.h - (y - Tb.y) - 10, 12); ctx.fillStyle = '#ecfdf5'; ctx.fill(); ctx.strokeStyle = '#86efac'; ctx.lineWidth = 2; ctx.stroke();
        txt('💡 생물학적 종', Tb.x + 26, y + 22, { size: 14, weight: 800, color: '#15803d' });
        para('자연 상태에서 짝짓기하여 생식 능력이 있는 자손을 낳을 수 있는 생물 무리', Tb.x + 26, y + 44, Tb.w - 52, { size: 16, weight: 800, color: '#14532d', lh: 21 });
        ctx.restore();
      } else txt('두 실험을 모두 해 보면 종을 나누는 기준을 알 수 있어요.', Tb.x + Tb.w / 2, y + 26, { size: 14.5, weight: 700, color: '#94a3b8', align: 'center' });
    } else {
      EXPS.forEach((E, i) => {
        const y = Tb.y + 42 + i * 128, done = SP.rec[i], a = done ? clamp((now() - SP.run[i].recT) / 0.5, 0, 1) : 0;
        ctx.fillStyle = i === SP.sel ? 'rgba(220,252,231,.6)' : '#f8fafc'; rr(Tb.x + 8, y, Tb.w - 16, 120, 14); ctx.fill();
        ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(Tb.x + 26, y + 20, 12, 0, TAU); ctx.fill(); txt(String(i + 1), Tb.x + 26, y + 21, { size: 14, weight: 800, color: '#fff', align: 'center', base: 'middle' });
        miniQuad(E.a, Tb.x + 74, y + 70, 0.3, 1, t, { ph: 0 }); txt('×', Tb.x + 118, y + 62, { size: 18, weight: 800, color: '#94a3b8', align: 'center' }); miniQuad(E.b, Tb.x + 160, y + 70, 0.3, -1, t, { ph: 1 });
        txt(E.an + ' × ' + E.bn, Tb.x + 52, y + 98, { size: 14, weight: 800, color: '#334155', max: 130 });
        txt('→', Tb.x + 214, y + 62, { size: 20, weight: 800, color: '#94a3b8', align: 'center' });
        if (done) {
          ctx.save(); ctx.globalAlpha = a;
          miniQuad(E.c, Tb.x + 262, y + 70, 0.34, 1, t, { age: 1, ph: 2 }); txt(E.cn, Tb.x + 262, y + 98, { size: 14, weight: 800, color: '#334155', align: 'center' });
          txt(E.fertile ? '✓' : '✗', Tb.x + 322, y + 56, { size: 20, weight: 800, color: E.fertile ? '#16a34a' : '#dc2626', align: 'center' });
          para(E.repro, Tb.x + 336, y + 52, 100, { size: 13, weight: 800, color: E.fertile ? '#15803d' : '#b91c1c', lh: 15 });
          pill(E.verdict, Tb.x + Tb.w - 62, y + 22, { size: 14, bg: E.same ? '#16a34a' : '#dc2626', pad: 11, h: 26 });
          ctx.restore();
        } else { txt('결과 ?', Tb.x + 330, y + 66, { size: 16, weight: 800, color: '#cbd5e1', align: 'center' }); }
      });
      const y = Tb.y + 42 + 2 * 128 + 2;
      if (spDone()) {
        const a = clamp((now() - Math.max(SP.run[0].recT, SP.run[1].recT) - 0.3) / 0.5, 0, 1);
        ctx.save(); ctx.globalAlpha = a; rr(Tb.x + 8, y, Tb.w - 16, Tb.y + Tb.h - y - 8, 12); ctx.fillStyle = '#ecfdf5'; ctx.fill(); ctx.strokeStyle = '#86efac'; ctx.lineWidth = 2; ctx.stroke();
        txt('💡 생물학적 종', Tb.x + 20, y + 18, { size: 13, weight: 800, color: '#15803d' });
        para('자연 상태에서 짝짓기하여 생식 능력이 있는 자손을 낳을 수 있는 생물 무리', Tb.x + 20, y + 38, Tb.w - 40, { size: 14, weight: 800, color: '#14532d', lh: 18 });
        ctx.restore();
      }
    }
  }
  function drawSpScene(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eef7f1'); g.addColorStop(1, '#dcebe2'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawSpArena(t); drawSpTable(t);
    if (isNew('species')) { const A = LAY.sp.arena; newRing({ x: A.x, y: A.y, w: A.w, h: A.h }, 18); }
  }

  /* =========================================================
     ② 분류 단계: 호랑이가 속한 상자가 점점 커져요 + 순서 맞추기
     ========================================================= */
  const RK_F = 0.65;                                    // 안쪽 상자는 바깥 상자의 65%
  const RK_CAP = [
    '종 · 호랑이 — 가장 작은 단계예요. 호랑이 한 종만 들어 있어요.',
    '속 · 표범속 — 호랑이는 사자, 표범과 같은 속이에요.',
    '과 · 고양잇과 — 표범속에 고양이 같은 생물이 더해져요.',
    '목 · 식육목 — 개, 늑대, 곰, 여우처럼 더 넓은 무리가 돼요.',
    '강 · 포유강 — 새끼에게 젖을 먹이는 동물 무리예요.',
    '문 · 척삭동물문 — 새, 뱀, 개구리, 물고기까지 들어와요.',
    '계 · 동물계 — 달팽이, 곤충, 게까지 모든 동물이 들어 있어요. 가장 큰 단계예요.',
  ];
  const RK = { mode: 'explore', sp: new SciSim.Spring(0, { stiffness: 80, damping: 15 }), uT: 0, maxL: 0, cards: [], done: false, doneT: -9, autoT: -9, arrived: 0, lastBurst: 0 };
  RK.cards = shuffled([0, 1, 2, 3, 4, 5, 6], 5).map((idx, home) => mkCard({ idx, home, slot: -1 }));
  const rkSlot = (i) => { const s = LAY.ranks.slot; return TALL ? { x: s.x0, y: s.y + i * (s.h + s.gap), w: s.w, h: s.h } : { x: s.x0 + i * (s.w + s.gap), y: s.y, w: s.w, h: s.h }; };
  const rkTray = (i) => { const s = LAY.ranks.tray; return TALL ? { x: s.x0, y: s.y + i * (s.h + s.gap), w: s.w, h: s.h } : { x: s.x0 + i * (s.w + s.gap), y: s.y, w: s.w, h: s.h }; };
  function rkTarget(cd) {
    if (cd.slot >= 0) { const r = rkSlot(cd.slot); return { x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - 6 }; }
    return rkTray(cd.home);
  }
  function rkSnap(animate) { snapAll(RK.cards, rkTarget, animate); }
  function rkSlotAt(p) { for (let i = 0; i < 7; i++) if (inR(p, rkSlot(i), 8)) return i; return -1; }
  function rkResetOrder() { RK.cards.forEach((c) => { c.slot = -1; c.ok = false; c.bad = -9; }); RK.done = false; rkSnap(false); }
  function rkSolveOrder() { RK.cards.forEach((c) => { c.slot = c.idx; c.ok = true; c.bad = -9; }); RK.done = true; RK.doneT = now() - 99; rkSnap(false); }
  function rkPlace(cd, slot) {
    const other = RK.cards.find((o) => o !== cd && o.slot === slot);
    if (other) { other.slot = cd.slot >= 0 && cd.slot !== slot ? cd.slot : -1; other.ok = false; }
    cd.slot = slot; cd.ok = false; Sound.tick(); rkSnap(true);
  }
  function rkCheck() {
    const empty = RK.cards.filter((c) => c.slot < 0).length;
    if (empty) return '아직 놓지 않은 카드가 ' + empty + '장 있어요. 7장을 모두 칸에 놓아 주세요.';
    const wrong = RK.cards.filter((c) => c.slot !== c.idx);
    if (wrong.length) {
      if (MANUAL) {
        const t = now(); wrong.forEach((c) => { c.bad = t; });
        setTimeout(() => { wrong.forEach((c) => { c.slot = -1; }); rkSnap(true); }, 650);
      }
      return '빨간 카드 ' + wrong.length + '장이 알맞지 않아요. 호랑이 상자가 커지던 순서를 떠올려 보세요. (작은 단계 → 큰 단계)';
    }
    if (MANUAL) {
      RK.done = true; RK.doneT = now(); RK.cards.forEach((c, i) => { c.ok = true; c.pop = now() + 0.05 * c.idx; });
      Sound.tone(660, 0.12, 'triangle', 0.08);
      RK.cards.forEach((c) => { const r = rkSlot(c.idx); burst(r.x + r.w / 2, r.y + r.h / 2, [RANKS[c.idx].color, '#fff', '#fde047'], 8, { speed: 100, life: 0.7 }); });
      setTimeout(() => rkPlayAuto(), 1300);
    }
    return true;
  }
  // 순서를 맞추면 상자가 한 단계씩 커지는 모습을 보여 줘요
  function rkPlayAuto() {
    if (S.scene !== 'ranks' || RK.mode !== 'order' || !RK.done) return;
    RK.mode = 'explore'; RK.uT = 0; RK.sp.value = 0; RK.sp.velocity = 0; RK.sp.target = 0; RK.arrived = 0; RK.autoT = now() + (RM ? 0 : 0.5); RK.maxL = Math.max(RK.maxL, 0);
    updateSceneUI();
  }
  function rkSetLevel(L, user) {
    L = clamp(Math.round(L), 0, 6);
    if (user && !(game && game.free)) L = Math.min(L, RK.maxL + 1);
    if (L === RK.uT) return;
    const up = L > RK.uT; RK.uT = L; RK.sp.target = L; RK.autoT = -9;
    if (up) Sound.tone(440 + L * 70, 0.14, 'triangle', 0.07); else Sound.tick();
    if (L > RK.maxL) RK.maxL = L;
    updateRanksUI();
  }
  function rkUpdate(dt) {
    if (RK.autoT > -1 && now() >= RK.autoT && RK.mode === 'explore') {
      const k = Math.floor((now() - RK.autoT) / (RM ? 0.3 : 1.05));
      const L = clamp(k, 0, 6);
      if (L !== RK.uT) { RK.uT = L; RK.sp.target = L; if (L > RK.maxL) RK.maxL = L; Sound.tone(440 + L * 70, 0.14, 'triangle', 0.07); updateRanksUI(); }
      if (L >= 6 && now() - RK.autoT > 6 * 1.05 + 0.5) RK.autoT = -9;
    }
    RK.sp.update(dt);
    // 도착하면 반짝
    const u = RK.sp.value, L = RK.uT;
    if (Math.abs(u - L) < 0.04 && RK.arrived !== L + 1) {
      RK.arrived = L + 1;
      if (L > 0 && S.scene === 'ranks' && RK.mode === 'explore') { const A = LAY.ranks.area; burst(A.x + A.w / 2, A.y + A.h / 2, [RANKS[L].color, '#ffffff', '#fde047'], 16, { speed: 210, life: 0.9, gravity: 40 }); }
    }
  }
  function rkLabel(x, y, k, size, alpha) {
    const R = RANKS[k];
    ctx.save(); ctx.globalAlpha *= alpha;
    pill(R.n + ' · ' + R.taxon, x, y, { size: size, align: 'left', bg: R.color, color: '#fff', pad: 10, h: size + 12, shadow: true });
    ctx.restore();
  }
  function drawRankTile(cx, cy, ts, m, R, alpha, sc) {
    if (alpha <= 0.01 || ts < 8) return;
    const s = sc * ts, w = s, h = s * 1.06;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy);
    const dash = m[0] === '…';
    dropShadow(-w / 2, -h / 2, w, h, w * 0.2, 6, 2, 'rgba(20,40,30,.16)');
    rr(-w / 2, -h / 2, w, h, w * 0.2); ctx.fillStyle = lgrad(ctx, 0, -h / 2, 0, h / 2, [[0, '#ffffff'], [1, lerpColor('#ffffff', R.color, 0.16)]]); ctx.fill();
    rr(-w / 2, -h / 2, w, h, w * 0.2); ctx.strokeStyle = R.color; ctx.lineWidth = Math.max(1, w * 0.03); if (dash) ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = (dash ? '800 ' : '') + Math.round(w * 0.5) + 'px ' + (dash ? FONT : EMOJI_FONT);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = dash ? R.color : '#000';
    ctx.fillText(m[0], 0, -h * 0.13);
    if (w >= 46) txt(m[1], 0, h * 0.34, { size: Math.min(13.5, w * 0.225), weight: 800, color: '#334155', align: 'center', base: 'middle', max: w - 6, min: 9 });
    ctx.restore();
  }
  function drawRanksExplore(t) {
    const G = LAY.ranks, A = G.area, u = clamp(RK.sp.value, 0, 6);
    dropShadow(A.x, A.y, A.w, A.h, 20, 12, 3, 'rgba(30,60,40,.14)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 20); ctx.clip();
    ctx.fillStyle = '#fbfdfb'; ctx.fillRect(A.x, A.y, A.w, A.h);
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2, bw = A.w - 16, bh = A.h - 16, kmax = Math.min(6, Math.ceil(u - 1e-6));
    for (let k = kmax; k >= 0; k--) {
      const s = Math.pow(RK_F, u - k), w = bw * s, h = bh * s, R = RANKS[k];
      if (w < 6) continue;
      const rad = clamp(22 * s, 3, 26);
      rr(cx - w / 2, cy - h / 2, w, h, rad); ctx.fillStyle = rgba(R.soft, 0.92); ctx.fill();
      rr(cx - w / 2, cy - h / 2, w, h, rad); ctx.strokeStyle = R.color; ctx.lineWidth = clamp(3.2 * Math.sqrt(s), 1.4, 3.4); ctx.stroke();
      // 새로 들어온 생물 (이 상자에서 더해진 것)
      const rev = clamp(u - (k - 1), 0, 1), ts = 62 * s;
      R.mem.forEach((m, j) => {
        const pos = R.slots[j]; if (!pos) return;
        const pr = EASE.outBack(clamp(rev * 1.7 - j * 0.14, 0, 1));
        drawRankTile(cx + pos[0] * w, cy + pos[1] * h, ts, m, R, clamp(rev * 3, 0, 1), pr);
      });
      // 이름표
      const gap = (h - h * RK_F) / 2;
      if (k >= Math.round(u) - 2 && gap >= 30 && k > 0 || k === Math.round(u)) rkLabel(cx - w / 2 + 12, cy - h / 2 + 22, k, 14.5, clamp((gap - 24) / 12, 0, 1));
    }
    // 주인공 호랑이
    const s0 = Math.pow(RK_F, u), hs = Math.max(26, 124 * s0), bob = RM ? 0 : Math.sin(t * 2) * 2 * Math.min(1, s0 * 3);
    if (u > 0.4) { const pr = 0.5 + 0.5 * Math.sin(t * 4); ctx.strokeStyle = rgba('#12a06a', 0.5 + 0.4 * pr); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy + bob, hs * 0.66 + pr * 2 + 2, 0, TAU); ctx.stroke(); }
    ctx.font = Math.round(hs) + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText('🐯', cx, cy + bob);
    if (hs > 70) pill('호랑이', cx, cy + hs * 0.72 + 8, { size: 14, bg: '#12a06a', pad: 12, h: 26, shadow: true });
    else if (u > 0.5 && u < 5.6) pill('호랑이', cx, cy - hs * 0.82 - 4, { size: 13, bg: '#12a06a', pad: 8, h: 22 });
    ctx.restore();
    rr(A.x, A.y, A.w, A.h, 20); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.stroke();
    drawRankChain();
    // 설명
    const C = G.cap, Lv = clamp(Math.round(u), 0, 6);
    panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: '#e2e8f0' });
    para(RK_CAP[Lv], C.x + 16, C.y + (TALL ? 30 : 25), C.w - (TALL ? 32 : 190), { size: TALL ? 15 : 16, weight: 800, color: '#1e293b', lh: TALL ? 22 : 22 });
    const cnt = RANK_CUM[Lv], cp = pill('예시 생물 ' + cnt + '가지', TALL ? C.x + 16 : C.x + C.w - 14, TALL ? C.y + C.h - 28 : C.y + C.h / 2, { size: 15, align: TALL ? 'left' : 'right', bg: RANKS[Lv].color, pad: 14, h: 32, shadow: true });
    void cp;
    if (isNew('ranks')) newRing({ x: A.x, y: A.y, w: A.w, h: A.h }, 20);
  }
  function chipRect(k) {            // 사슬 칩 k (0=종 … 6=계)
    const G = LAY.ranks, C = G.chain;
    if (TALL) { const w = (C.w - 6 * 6) / 7; return { x: C.x + k * (w + 6), y: C.y + 4, w, h: C.h - 8 }; }
    const h = (C.h - 6 * 8) / 7; return { x: C.x, y: C.y + (6 - k) * (h + 8), w: C.w, h };
  }
  function drawRankChain() {
    const u = clamp(RK.sp.value, 0, 6), cur = Math.round(u);
    for (let k = 0; k < 7; k++) {
      const r = chipRect(k), R = RANKS[k], on = k === cur, fr = !!(game && game.free), vis = fr || k <= RK.maxL, nextOK = !fr && k === RK.maxL + 1;
      const pr = on ? 1 + 0.02 * Math.sin(now() * 6) : 1;
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(pr, pr);
      dropShadow(-r.w / 2, -r.h / 2, r.w, r.h, 12, on ? 12 : 6, 2, on ? rgba(R.color, 0.4) : 'rgba(20,40,30,.12)');
      rr(-r.w / 2, -r.h / 2, r.w, r.h, 12); ctx.fillStyle = on ? R.color : vis ? '#fff' : '#f3f5f8'; ctx.fill();
      rr(-r.w / 2, -r.h / 2, r.w, r.h, 12); ctx.strokeStyle = vis || on ? R.color : '#d5dce6'; ctx.lineWidth = on ? 3 : 2; if (!vis && !on) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      if (TALL) { txt(R.n, 0, 1, { size: 22, weight: 800, color: on ? '#fff' : vis ? R.color : '#a5b0bf', align: 'center', base: 'middle' }); }
      else {
        txt(R.n, -r.w / 2 + 28, 1, { size: 26, weight: 800, color: on ? '#fff' : vis ? R.color : '#a5b0bf', align: 'center', base: 'middle' });
        txt(vis || on ? R.taxon : '?', 14, 1, { size: 14, weight: 800, color: on ? '#fff' : vis ? '#334155' : '#a5b0bf', align: 'center', base: 'middle', max: r.w - 62 });
      }
      if (nextOK && !on) { ctx.strokeStyle = rgba(R.color, 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(now() * 5))); ctx.lineWidth = 3; rr(-r.w / 2 - 3, -r.h / 2 - 3, r.w + 6, r.h + 6, 15); ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawRankCard(cd, w, h) {
    const R = RANKS[cd.idx];
    if (!TALL) {
      ctx.fillStyle = R.color; rr(0, 0, w, 7, 4); ctx.fill();
      txt(R.n, w / 2, h * 0.5, { size: 38, weight: 800, color: R.color, align: 'center', base: 'middle' });
      txt(R.taxon, w / 2, h - 18, { size: 14, weight: 800, color: '#475569', align: 'center', base: 'middle', max: w - 12 });
    } else {
      ctx.fillStyle = R.color; rr(6, 8, 6, h - 16, 3); ctx.fill();
      txt(R.n, 36, h / 2 + 1, { size: 26, weight: 800, color: R.color, align: 'center', base: 'middle' });
      txt(R.taxon, 62, h / 2 + 1, { size: 15, weight: 800, color: '#475569', base: 'middle', max: w - 90 });
    }
  }
  function drawRanksOrder(t) {
    const G = LAY.ranks;
    pill('📦 작은 단계 → 큰 단계 순서로 놓아요', TALL ? 8 : 16, TALL ? 28 : 34, { size: TALL ? 13.5 : 15, align: 'left', bg: '#dcfce7', color: '#166534', pad: 12 });
    const hot = (() => { const d = S.drag; if (!d || d.set !== 'rk' || d.px == null) return -1; return rkSlotAt({ x: d.px, y: d.py }); })();
    if (!TALL) {
      const s0 = rkSlot(0), s6 = rkSlot(6), y = s0.y - 16;
      ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.setLineDash([2, 8]); ctx.beginPath(); ctx.moveTo(s0.x + 6, y); ctx.lineTo(s6.x + s6.w - 14, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(s6.x + s6.w + 2, y); ctx.lineTo(s6.x + s6.w - 14, y - 8); ctx.lineTo(s6.x + s6.w - 14, y + 8); ctx.closePath(); ctx.fill(); ctx.restore();
      txt('가장 작은 단계', s0.x + 4, y - 10, { size: 13.5, weight: 800, color: '#64748b' }); txt('가장 큰 단계', s6.x + s6.w, y - 10, { size: 13.5, weight: 800, color: '#64748b', align: 'right' });
    }
    for (let i = 0; i < 7; i++) {
      const r = rkSlot(i), taken = RK.cards.some((c) => c.slot === i);
      ctx.save();
      if (RK.done) { const a = clamp((now() - RK.doneT - i * 0.1) / 0.4, 0, 1); rr(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = 'rgba(34,197,94,' + (0.1 * a).toFixed(3) + ')'; ctx.fill(); }
      if (!taken || hot === i) { ctx.setLineDash([7, 6]); ctx.strokeStyle = hot === i ? '#16a34a' : '#b8c4d4'; ctx.lineWidth = hot === i ? 3 : 1.8; rr(r.x, r.y, r.w, r.h, 14); ctx.stroke(); ctx.setLineDash([]); }
      if (hot === i) { ctx.fillStyle = 'rgba(34,197,94,.1)'; rr(r.x, r.y, r.w, r.h, 14); ctx.fill(); }
      ctx.restore();
      if (!taken) txt(String(i + 1), TALL ? r.x + 24 : r.x + r.w / 2, r.y + r.h / 2 + 2, { size: TALL ? 24 : 40, weight: 800, color: '#cbd5e1', align: 'center', base: 'middle' });
    }
    if (!RK.done && !RK.cards.every((c) => c.slot >= 0)) txt('🃏 카드 (섞여 있어요)', TALL ? 236 : 16, TALL ? 52 : rkTray(0).y - 12, { size: 13.5, weight: 800, color: '#64748b' });
    const dragCd = S.drag && S.drag.set === 'rk' ? S.drag.card : null;
    RK.cards.forEach((cd) => { if (cd !== dragCd) cardFrame(cd, t, RANKS[cd.idx].color, (w, h) => drawRankCard(cd, w, h)); });
    if (dragCd) cardFrame(dragCd, t, RANKS[dragCd.idx].color, (w, h) => drawRankCard(dragCd, w, h));
    const C = G.capOrder;
    panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: RK.done ? '#86efac' : '#e2e8f0', bw: RK.done ? 2 : 1.5 });
    if (!RK.done) para('💡 호랑이를 담은 상자가 점점 커지던 순서를 떠올려 봐요. 가장 작은 단계는 호랑이 한 종만 있는 "종"이에요.', C.x + 16, C.y + (TALL ? 30 : 26), C.w - 32, { size: TALL ? 14.5 : 16, weight: 800, color: '#475569', lh: 22 });
    else para('종 < 속 < 과 < 목 < 강 < 문 < 계 — 오른쪽(아래)으로 갈수록 더 많은 생물을 포함하는 큰 단계예요.', C.x + 16, C.y + (TALL ? 30 : 26), C.w - 32, { size: TALL ? 14.5 : 16, weight: 800, color: '#166534', lh: 22 });
  }
  function drawRanksScene(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eef7f1'); g.addColorStop(1, '#dcebe2'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (RK.mode === 'order') drawRanksOrder(t); else drawRanksExplore(t);
    if (isNew('ranks') && RK.mode === 'order') { const a = rkSlot(0), b = rkSlot(6); newRing({ x: a.x, y: a.y, w: b.x + b.w - a.x, h: b.y + b.h - a.y }, 14); }
  }

  /* =========================================================
     ③ 5계의 분류 기준: 이분 검색표 (생물이 길을 따라 내려가요)
     ========================================================= */
  const KY = { org: 'ecoli', node: 'q1', st: 'ask', tok: { x: 0, y: 0, lift: 0 }, trail: [], leaf: null, done: {}, shakeT: -9, leafT: {}, mode: 'flow', nDone: 0, hov: null, last: null, pulse: 0 };
  const KEY_ORDER = ['ecoli', 'shiitake', 'paramecium', 'fern', 'jellyfish', 'wakame', 'penicillium', 'yeast', 'pine', 'sparrow'];
  const keyNodeW = { q1: 140, q2: 150, q3: 150, q4: 150, q5: 170 };
  let keyGeomCache = null, keyGeomKey = '';
  function keyGeom() {
    const L = LAY.key, T = L.tree, key = KIND + '|' + T.x + T.w;
    if (keyGeomCache && keyGeomKey === key) return keyGeomCache;
    const lx = (i) => T.x + (i + 0.5) * T.w / 6, y = (r) => T.y + L.rows[r], N = {};
    const leaf = (id, i) => { N[id] = { id, leaf: true, x: lx(i), y: y(4), w: L.leafW, h: L.leafH, king: KEY_LEAF[id] }; };
    leaf('k0', 0); leaf('k3', 1); leaf('k1a', 2); leaf('k2', 3); leaf('k4', 4); leaf('k1b', 5);
    const q = (id, x, r) => { N[id] = { id, leaf: false, x, y: y(r), w: Math.min(keyNodeW[id] * (TALL ? 0.94 : 1), TALL ? 142 : 999), h: L.nodeH }; };
    q('q3', (N.k3.x + N.k1a.x) / 2, 2); q('q5', (N.k4.x + N.k1b.x) / 2, 3); q('q4', (N.k2.x + N.q5.x) / 2, 2); q('q2', (N.q3.x + N.q4.x) / 2, 1); q('q1', (N.k0.x + N.q2.x) / 2, 0);
    keyGeomCache = N; keyGeomKey = key; return N;
  }
  function keyEdge(a, b) {            // 위 노드 아래 가운데 → 아래 노드 위 가운데 (꺾인 선)
    const N = keyGeom(), A = N[a], B = N[b], x0 = A.x, y0 = A.y + A.h / 2, x1 = B.x, y1 = B.y - B.h / 2;
    return { x0, y0, x1, y1, my: y0 + (TALL ? 14 : 16) };
  }
  function keyEdgePath(c, e) {
    c.beginPath(); c.moveTo(e.x0, e.y0);
    if (Math.abs(e.x1 - e.x0) < 2) { c.lineTo(e.x1, e.y1); return; }
    const dir = Math.sign(e.x1 - e.x0), r = Math.min(12, Math.abs(e.x1 - e.x0) / 2, (e.y1 - e.my) * 0.9, (e.my - e.y0) * 0.9);
    c.lineTo(e.x0, e.my - r); c.quadraticCurveTo(e.x0, e.my, e.x0 + dir * r, e.my); c.lineTo(e.x1 - dir * r, e.my); c.quadraticCurveTo(e.x1, e.my, e.x1, e.my + r); c.lineTo(e.x1, e.y1);
  }
  function keyTokPos(node) {
    const N = keyGeom(), n = N[node];
    return { x: n.x, y: n.y - n.h / 2 - (n.leaf ? 20 : 24) };
  }
  function keyReset(org, instant) {
    KY.org = org; KY.node = 'q1'; KY.st = 'ask'; KY.trail = []; KY.leaf = null;
    const p = keyTokPos('q1'); if (KY.tw) KY.tw.cancel();
    if (instant || RM) { KY.tok.x = p.x; KY.tok.y = p.y; KY.tok.lift = 0; } else { KY.tok.lift = 0; KY.tok.x = keyGeom().q1.x + 60; KY.tok.y = p.y - 40; KY.tw = SciSim.tween(KY.tok, { x: p.x, y: p.y }, { duration: 0.6, ease: 'outBack' }); }
    KY.last = null;
  }
  function keySolveSome(n) {          // 이어하기용: n가지를 분류한 모습으로
    KY.done = {}; KEY_ORDER.slice(0, n).forEach((k) => { KY.done[k] = true; }); KY.nDone = n;
    keyReset(KEY_ORDER[Math.min(n, KEY_ORDER.length - 1)], true);
  }
  function keyNextOrg() { const k = KEY_ORDER.find((o) => !KY.done[o] && o !== KY.org) || KEY_ORDER.find((o) => o !== KY.org); keyReset(k); Sound.click(); }
  function keyAnswer(ans) {
    if (KY.st !== 'ask') return;
    const q = KEY_QS[KY.node], o = ORGS[KY.org], truth = !!q.test(o);
    if (!!ans !== truth) {
      KY.shakeT = now(); Sound.fail(); showHint('🤔 ' + keyHint(KY.node, KY.org), 6500);
      return;
    }
    const next = ans ? q.yes : q.no, cur = KY.node;
    KY.trail.push(cur + '>' + next); KY.st = 'move'; Sound.tone(520 + KY.trail.length * 80, 0.1, 'triangle', 0.07);
    const p = keyTokPos(next); if (KY.tw) KY.tw.cancel();
    const sx = KY.tok.x, sy = KY.tok.y;
    const prog = { v: 0 };
    KY.tw = SciSim.tween(prog, { v: 1 }, { duration: RM ? 0.01 : 0.75, ease: 'inOutCubic', onUpdate: () => { KY.tok.x = lerp(sx, p.x, prog.v); KY.tok.y = lerp(sy, p.y, prog.v); KY.tok.lift = Math.sin(prog.v * Math.PI) * 14; }, onDone: () => { KY.tok.x = p.x; KY.tok.y = p.y; KY.tok.lift = 0; keyArrive(next); } });
    hideHint();
  }
  function keyArrive(next) {
    if (KEY_QS[next]) { KY.node = next; KY.st = 'ask'; return; }
    KY.node = next; KY.st = 'done'; KY.leaf = next;
    const k = KEY_LEAF[next], K = KING[k], N = keyGeom(), n = N[next];
    KY.leafT[next] = now(); KY.pulse = now();
    if (!KY.done[KY.org]) { KY.done[KY.org] = true; KY.nDone = Object.keys(KY.done).length; }
    burst(n.x, n.y, [K.color, '#ffffff', '#fde047'], 22, { speed: 190, life: 0.9, gravity: 60 });
    Sound.success();
    showHint('✅ ' + josa(ORGS[KY.org].name, '은', '는') + ' ' + K.name + '예요!  ' + ORGS[KY.org].why, 7000);
  }
  function keyHitTest(p) {
    const L = LAY.key;
    // 질문 노드의 예/아니오
    if (KY.mode === 'flow' && KY.st === 'ask') {
      const q = KEY_QS[KY.node], N = keyGeom();
      for (const ans of [true, false]) {
        const c = keyPillPos(KY.node, ans), r = { x: c.x - 38, y: c.y - 22, w: 76, h: 44 };
        if (inR(p, r, 6)) return { kind: 'ans', ans };
      }
      void q; void N;
    }
    // 다음 생물
    if (KY.mode === 'flow' && KY.st === 'done') { const r = nextBtnRect(); if (inR(p, r, 6)) return { kind: 'next' }; }
    // 고르개
    for (let i = 0; i < KEY_ORDER.length; i++) { const r = pickRect(i); if (inR(p, r, 3)) return { kind: 'pick', i }; }
    return null;
  }
  function keyPillPos(node, ans) {
    const q = KEY_QS[node], to = ans ? q.yes : q.no, e = keyEdge(node, to);
    return { x: e.x1, y: e.my };
  }
  function pickRect(i) {
    const L = LAY.key, P = L.pick;
    if (!TALL) { const col = i % 5, row = Math.floor(i / 5); return { x: P.x + 8 + col * 57, y: P.y + 30 + row * 64, w: 44, h: 44 }; }
    return { x: P.x + 4 + i * 44, y: P.y + 40, w: 42, h: 46 };
  }
  function nextBtnRect() { const C = LAY.key.card; return TALL ? { x: C.x + C.w - 138, y: C.y + C.h - 42, w: 128, h: 34 } : { x: C.x + C.w - 150, y: C.y + C.h - 44, w: 138, h: 36 }; }
  const FEAT_LAB = ['핵막', '광합성', '세포벽', '몸'];
  function featVal(o, k) { return k === 0 ? (o.nuc ? '있음' : '없음') : k === 1 ? (o.photo ? '함' : '못 함') : k === 2 ? (o.wall ? '있음' : '없음') : o.body; }
  function drawKeyTree(t) {
    const L = LAY.key, T = L.tree, N = keyGeom();
    panel(T.x, T.y, T.w, T.h, { bg: '#fff', border: '#e2e8f0', r: 18 });
    // 간선
    const edges = []; Object.keys(KEY_QS).forEach((id) => { edges.push([id, KEY_QS[id].yes, true]); edges.push([id, KEY_QS[id].no, false]); });
    edges.forEach(([a, b, yes]) => {
      const e = keyEdge(a, b), on = KY.trail.indexOf(a + '>' + b) >= 0;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = on ? '#22c55e' : '#c3cfdd'; ctx.lineWidth = on ? 5 : 3;
      if (on) { ctx.shadowColor = 'rgba(34,197,94,.4)'; ctx.shadowBlur = 8; }
      keyEdgePath(ctx, e); ctx.stroke();
      ctx.restore();
    });
    // 예/아니오 표시
    Object.keys(KEY_QS).forEach((id) => {
      [true, false].forEach((ans) => {
        const c = keyPillPos(id, ans), active = KY.mode === 'flow' && KY.st === 'ask' && KY.node === id;
        const to = ans ? KEY_QS[id].yes : KEY_QS[id].no, taken = KY.trail.indexOf(id + '>' + to) >= 0;
        const pr = active ? 1 + 0.05 * Math.sin(t * 6) : 1, hov = active && KY.hov && KY.hov.kind === 'ans' && KY.hov.ans === ans;
        ctx.save(); ctx.translate(c.x, c.y); ctx.scale(pr * (hov ? 1.08 : 1), pr * (hov ? 1.08 : 1));
        const col = ans ? '#16a34a' : '#dc2626';
        if (active) dropShadow(-32, -14, 64, 28, 14, 8, 2, 'rgba(20,40,30,.28)');
        rr(-(active ? 32 : 24), active ? -(TALL ? 13 : 15) : -10, active ? 64 : 48, active ? (TALL ? 26 : 30) : 20, active ? 15 : 10);
        ctx.fillStyle = taken ? col : active ? col : '#eef2f7'; ctx.fill();
        txt(ans ? '예' : '아니오', 0, 1, { size: active ? 15.5 : 13, weight: 800, color: taken || active ? '#fff' : '#94a3b8', align: 'center', base: 'middle' });
        ctx.restore();
      });
    });
    // 노드
    Object.keys(N).forEach((id) => {
      const n = N[id];
      if (n.leaf) {
        const K = KING[n.king], ft = KY.leafT[id], fl = ft != null ? clamp((now() - ft) / 0.8, 0, 1) : 1, on = KY.leaf === id;
        const pr = on ? 1 + 0.06 * Math.sin(Math.min(1, (now() - ft) / 0.5) * Math.PI) + 0.012 * Math.sin(t * 5) : 1;
        ctx.save(); ctx.translate(n.x, n.y); ctx.scale(pr, pr);
        dropShadow(-n.w / 2, -n.h / 2, n.w, n.h, 14, on ? 14 : 8, 3, on ? rgba(K.color, 0.45) : 'rgba(20,40,30,.14)');
        rr(-n.w / 2, -n.h / 2, n.w, n.h, 14); ctx.fillStyle = on ? K.color : K.soft; ctx.fill();
        rr(-n.w / 2, -n.h / 2, n.w, n.h, 14); ctx.strokeStyle = K.color; ctx.lineWidth = on ? 3.5 : 2.2; ctx.stroke();
        if (!TALL) { drawOrg(ctx, K.emb, -n.w / 2 + 22, 0, 15, t, {}); txt(K.name, 12, 1, { size: 15, weight: 800, color: on ? '#fff' : K.color, align: 'center', base: 'middle', max: n.w - 52 }); }
        else { txt(K.name, 0, 1, { size: 13, weight: 800, color: on ? '#fff' : K.color, align: 'center', base: 'middle', max: n.w - 6 }); }
        ctx.restore();
        void fl;
      } else {
        const act = KY.mode === 'flow' && KY.st === 'ask' && KY.node === id, pr = act ? 1 + 0.025 * Math.sin(t * 5) : 1;
        let sx = 0; if (act && now() - KY.shakeT < 0.5) sx = Math.sin((now() - KY.shakeT) * 46) * 6 * (1 - (now() - KY.shakeT) / 0.5);
        ctx.save(); ctx.translate(n.x + sx, n.y); ctx.scale(pr, pr);
        dropShadow(-n.w / 2, -n.h / 2, n.w, n.h, 14, act ? 14 : 8, 3, act ? 'rgba(59,130,246,.4)' : 'rgba(20,40,30,.14)');
        rr(-n.w / 2, -n.h / 2, n.w, n.h, 14); ctx.fillStyle = act ? '#eff6ff' : '#fff'; ctx.fill();
        rr(-n.w / 2, -n.h / 2, n.w, n.h, 14); ctx.strokeStyle = act ? '#3b82f6' : '#cbd5e1'; ctx.lineWidth = act ? 3 : 2; ctx.stroke();
        const q = KEY_QS[id], ls = q.text.indexOf('\n') >= 0 ? q.text.split('\n') : lines(q.text, n.w - 14, TALL ? 13 : 14.5, 800);
        const fs = TALL ? 13 : 14.5, lh = fs + 3;
        ls.forEach((ln, i) => txt(ln, 0, (i - (ls.length - 1) / 2) * lh + 1, { size: fs, weight: 800, color: act ? '#1d4ed8' : '#334155', align: 'center', base: 'middle', max: n.w - 10, min: 11 }));
        ctx.restore();
      }
    });
  }
  function drawKeyToken(t) {
    if (KY.mode !== 'flow') return;
    const o = ORGS[KY.org], x = KY.tok.x, y = KY.tok.y - KY.tok.lift, r = TALL ? 22 : 26, bob = RM || KY.st === 'move' ? 0 : Math.sin(t * 3) * 2;
    ctx.save(); ctx.translate(x, y + bob);
    dropShadow(-r, -r, r * 2, r * 2, r, 10, 4, 'rgba(20,30,40,.3)');
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, TAU); ctx.clip(); ctx.fillStyle = rgrad(ctx, 0, 0, 2, 0, 0, r, [[0, '#ffffff'], [1, '#e8f0ea']]); ctx.fillRect(-r, -r, r * 2, r * 2); drawOrg(ctx, KY.org, 0, 0, r * 0.95, t, {}); ctx.restore();
    ctx.strokeStyle = KING[o.king].color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function drawKeyStrip(t) {
    const L = LAY.key, C = L.card, P = L.pick, o = ORGS[KY.org], K = KING[o.king];
    panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: '#e2e8f0', r: 18 });
    // 큰 그림
    const br = TALL ? 36 : 42, bx = C.x + (TALL ? 52 : 66), by = C.y + (TALL ? 62 : 64);
    ctx.save(); ctx.fillStyle = rgrad(ctx, bx, by, 4, bx, by, br + 6, [[0, '#ffffff'], [1, '#e1ece4']]); ctx.beginPath(); ctx.arc(bx, by, br + 4, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(20,60,40,.12)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, br + 3, 0, TAU); ctx.clip(); drawOrg(ctx, KY.org, bx, by + 2, br * 0.96, t, {}); ctx.restore();
    pill(o.name, bx, C.y + (TALL ? 118 : 128), { size: TALL ? 14.5 : 15.5, bg: '#334155', pad: 12, h: TALL ? 26 : 26 });
    // 특징 칩 (2×2)
    const act = KY.mode === 'flow' && KY.st === 'ask' ? KEY_QS[KY.node].chip : -1;
    const cw = TALL ? 334 : 160, ch = TALL ? 30 : 40, x0 = C.x + (TALL ? 104 : 140), y0 = C.y + (TALL ? 12 : 14), vgap = TALL ? 4 : 6, hgap = 8;
    for (let k = 0; k < 4; k++) {
      const rx = TALL ? x0 : x0 + (k % 2) * (cw + hgap), ry = TALL ? y0 + k * (ch + vgap) : y0 + Math.floor(k / 2) * (ch + vgap);
      const hl = act === k, pr = hl ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
      rr(rx, ry, cw, ch, 11); ctx.fillStyle = hl ? '#eff6ff' : '#f6f8fb'; ctx.fill();
      rr(rx, ry, cw, ch, 11); ctx.strokeStyle = hl ? 'rgba(59,130,246,' + (0.55 + 0.45 * pr).toFixed(2) + ')' : '#e2e8f0'; ctx.lineWidth = hl ? 3 : 1.5; ctx.stroke();
      const val = featVal(o, k), ok = k === 0 ? o.nuc : k === 1 ? o.photo : k === 2 ? o.wall : null;
      if (TALL) {
        txt(FEAT_LAB[k], rx + 12, ry + ch / 2 + 1, { size: 13.5, weight: 800, color: '#64748b', base: 'middle' });
        txt(val, rx + 76, ry + ch / 2 + 1, { size: 14, weight: 800, color: ok === null ? '#1e293b' : ok ? '#15803d' : '#b45309', base: 'middle', max: 220, min: 11 });
      } else {
        txt(FEAT_LAB[k], rx + 10, ry + 15, { size: 13, weight: 800, color: '#64748b' });
        txt(val, rx + 10, ry + 33, { size: 15, weight: 800, color: ok === null ? '#1e293b' : ok ? '#15803d' : '#b45309', max: cw - 44, min: 11 });
      }
      if (ok !== null) { const bx = rx + cw - 17, by = ry + ch / 2; ctx.fillStyle = ok ? '#22c55e' : '#f59e0b'; ctx.beginPath(); ctx.arc(bx, by, 8, 0, TAU); ctx.fill(); txt(ok ? '✓' : '✗', bx, by + 1, { size: 12, weight: 800, color: '#fff', align: 'center', base: 'middle' }); }
    }
    // 상태 줄 / 다음 생물
    if (KY.st === 'done') {
      const r = nextBtnRect(), hov = KY.hov && KY.hov.kind === 'next';
      dropShadow(r.x, r.y, r.w, r.h, 18, 8, 2, 'rgba(20,40,30,.25)');
      rr(r.x, r.y, r.w, r.h, 18); ctx.fillStyle = hov ? '#15803d' : '#16a34a'; ctx.fill();
      txt('다음 생물 ▶', r.x + r.w / 2, r.y + r.h / 2 + 1, { size: 15, weight: 800, color: '#fff', align: 'center', base: 'middle' });
      pill('→ ' + K.name, C.x + (TALL ? 200 : 236), C.y + C.h - (TALL ? 25 : 26), { size: TALL ? 14 : 15.5, bg: K.color, pad: 13, h: 30, shadow: true });
    } else if (!TALL) txt('질문에 맞는 "예"/"아니오"를 눌러 길을 따라가요', C.x + 140, C.y + C.h - 16, { size: 13.5, weight: 700, color: '#64748b' });
    // 고르개
    panel(P.x, P.y, P.w, P.h, { bg: '#fff', border: '#e2e8f0', r: 18 });
    txt('🔎 분류해 볼 생물을 골라요  (' + KY.nDone + '/10)', P.x + 14, P.y + (TALL ? 24 : 24), { size: 13.5, weight: 800, color: '#475569' });
    KEY_ORDER.forEach((k, i) => {
      const r = pickRect(i), sel = KY.org === k, dn = !!KY.done[k], hov = KY.hov && KY.hov.kind === 'pick' && KY.hov.i === i;
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); const pr = sel ? 1.06 : hov ? 1.05 : 1; ctx.scale(pr, pr);
      rr(-r.w / 2, -r.h / 2, r.w, r.h, 12); ctx.fillStyle = sel ? '#ecfdf5' : '#f6f8fb'; ctx.fill();
      rr(-r.w / 2, -r.h / 2, r.w, r.h, 12); ctx.strokeStyle = sel ? '#22c55e' : '#d9e1ea'; ctx.lineWidth = sel ? 3 : 1.5; ctx.stroke();
      ctx.save(); rr(-r.w / 2 + 2, -r.h / 2 + 2, r.w - 4, r.h - 4, 10); ctx.clip(); drawOrg(ctx, k, 0, TALL ? 0 : 0, Math.min(r.w, r.h) * 0.46, t, {}); ctx.restore();
      if (dn) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(r.w / 2 - 6, -r.h / 2 + 6, 8.5, 0, TAU); ctx.fill(); txt('✓', r.w / 2 - 6, -r.h / 2 + 7, { size: 11, weight: 800, color: '#fff', align: 'center', base: 'middle' }); }
      ctx.restore();
      if (!TALL) txt(ORGS[k].name, r.x + r.w / 2, r.y + r.h + 13, { size: 13, weight: 800, color: sel ? '#15803d' : '#64748b', align: 'center', max: 56, min: 10.5 });
    });
  }
  function drawKeyScene(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eef7f1'); g.addColorStop(1, '#dcebe2'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (KY.mode === 'match') { drawBoardScene(BF, t); return; }
    drawKeyTree(t); drawKeyToken(t); drawKeyStrip(t);
    if (isNew('key')) { const T = LAY.key.tree; newRing({ x: T.x, y: T.y, w: T.w, h: T.h }, 18); }
  }

  /* =========================================================
     카드 → 5계 상자 (기준 카드 맞추기 / 계 분류 게임)
     ========================================================= */
  function makeBoard(mode) {
    const B = { mode, cards: [], done: false, doneT: -9, sel: null, selBox: null, ordN: 0, msg: '', msgT: -9 };
    if (mode === 'org') B.cards = shuffled(ORG_KEYS, 14).map((k, home) => mkCard({ kind: 'org', key: k, home, box: -1, ord: 0, ph: home * 0.9 }));
    else B.cards = shuffled([0, 1, 2, 3, 4], 6).map((ki, home) => mkCard({ kind: 'feat', king: ki, home, box: -1, ord: 0, text: FEAT_CARDS[ki].text, ph: home }));
    return B;
  }
  const BF = makeBoard('feat'), BO = makeBoard('org');
  const cardKing = (c) => (c.kind === 'org' ? ORGS[c.key].king : c.king);
  function boxRect(i) { const L = LAY.board; return TALL ? { x: L.bx, y: L.by + i * (L.bh + L.bgap), w: L.bw, h: L.bh } : { x: L.bx + i * (L.bw + L.bgap), y: L.by, w: L.bw, h: L.bh }; }
  function trayRect(B, home) {            // home = 트레이 안에서의 순서 (상자에 넣은 카드는 건너뛰고 앞으로 당겨져요)
    const L = LAY.board, T = B.mode === 'org' ? L.trayOrg : L.trayFeat;
    if (B.mode === 'feat' && T.cols === 1) return { x: T.x, y: T.y[0] + home * (T.h + T.gap), w: T.w, h: T.h };
    const col = home % T.cols, row = Math.floor(home / T.cols);
    return { x: T.x + col * (T.w + T.gap), y: T.y[Math.min(row, T.y.length - 1)], w: T.w, h: T.h };
  }
  function boxSlot(B, bi, idx, n) {
    const R = boxRect(bi), feat = B.mode === 'feat', gw = 4;
    if (!TALL) {
      const ix = R.x + 6, iy = R.y + 48, iw = R.w - 12, ih = R.h - 54;
      if (feat) return { x: ix, y: iy, w: iw, h: ih };
      const cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), w = (iw - (cols - 1) * gw) / cols, h = Math.min(92, (ih - (rows - 1) * gw) / rows);
      return { x: ix + (idx % cols) * (w + gw), y: iy + Math.floor(idx / cols) * (h + gw), w, h };
    }
    const ix = R.x + 106, iy = R.y + 4, iw = R.w - 110, ih = R.h - 8;
    if (feat) return { x: ix, y: iy, w: iw, h: ih };
    const per = 5, rows = Math.ceil(n / per), w = Math.min(66, (iw - (per - 1) * gw) / per), h = rows === 1 ? ih : (ih - gw) / 2;
    return { x: ix + (idx % per) * (w + gw), y: iy + Math.floor(idx / per) * (h + gw), w, h };
  }
  function boardTarget(B, cd) {
    if (cd.box >= 0) { const list = B.cards.filter((c) => c.box === cd.box).sort((a, b) => a.ord - b.ord); return boxSlot(B, cd.box, list.indexOf(cd), list.length); }
    return trayRect(B, B.cards.filter((c) => c.box < 0 && c.home < cd.home).length);
  }
  function snapBoard(B, animate) { snapAll(B.cards, (cd) => boardTarget(B, cd), animate); }
  function boardReset(B) { B.cards.forEach((c) => { c.box = -1; c.ok = false; c.bad = -9; }); B.done = false; B.sel = null; B.selBox = null; B.msg = ''; snapBoard(B, false); }
  function boardSolve(B) { B.cards.forEach((c) => { c.box = cardKing(c); c.ok = true; c.bad = -9; c.ord = ++B.ordN; }); B.done = true; B.doneT = now() - 99; snapBoard(B, false); }
  function boardBoxAt(p) { for (let i = 0; i < 5; i++) if (inR(p, boxRect(i), 5)) return i; return -1; }
  function boardAssign(B, cd, bi) {
    if (B.mode === 'feat') { const occ = B.cards.find((c) => c !== cd && c.box === bi); if (occ) { occ.box = -1; occ.ok = false; } }
    cd.box = bi; cd.ok = false; cd.ord = ++B.ordN; Sound.tick(); snapBoard(B, true);
  }
  function boardCheck(B) {
    const un = B.cards.filter((c) => c.box < 0).length;
    if (un) return '아직 상자에 넣지 않은 카드가 ' + un + '장 있어요. 모든 카드를 상자에 넣어 주세요.';
    const wrong = B.cards.filter((c) => cardKing(c) !== c.box);
    if (wrong.length) {
      if (MANUAL) {
        const t = now(); wrong.forEach((c) => { c.bad = t; }); B.msg = '';
        setTimeout(() => { wrong.forEach((c) => { c.box = -1; }); snapBoard(B, true); }, 750);
        if (B.mode === 'org') { const w0 = wrong[0]; B.msg = ORGS[w0.key].name + ': ' + ORGS[w0.key].why; B.msgT = now(); }
      }
      if (B.mode === 'org') {
        const shown = wrong.slice(0, 2).map((c) => '<b>' + ORGS[c.key].name + '</b>: ' + ORGS[c.key].why).join('<br>');
        return '빨간 카드 ' + wrong.length + '장이 알맞지 않아요. 다시 생각해 봐요!<br>' + shown + (wrong.length > 2 ? '<br>… 외 ' + (wrong.length - 2) + '장' : '');
      }
      return '빨간 카드 ' + wrong.length + '장이 알맞지 않아요. 앞에서 본 검색표의 질문(핵막 → 광합성 → 세포벽 → 조직·기관)을 떠올려 보세요.';
    }
    if (MANUAL) {
      B.done = true; B.doneT = now(); B.sel = null;
      B.cards.forEach((c, i) => { c.ok = true; c.pop = now() + 0.06 * i; const r = boardTarget(B, c); burst(r.x + r.w / 2, r.y + r.h / 2, [KING[c.box].color, '#fff', '#fde047'], 8, { speed: 100, life: 0.7 }); });
      Sound.success();
    }
    return true;
  }
  function featFace(cd, w, h) {
    const padL = TALL ? 24 : 12, mw = w - padL - 12;
    let fs = TALL ? 14.5 : 15.5, ls = [], lh = fs + 5;
    for (; fs >= 11; fs -= 0.5) { ls = lines(cd.text, mw, fs, 800); lh = fs + 5; if (ls.length * lh <= h - 12) break; }
    if (TALL) { ctx.fillStyle = '#94a3b8'; rr(8, 8, 5, h - 16, 2.5); ctx.fill(); }
    ls.forEach((ln, i) => txt(ln, TALL ? padL : w / 2, h / 2 + (i - (ls.length - 1) / 2) * lh + 1, { size: fs, weight: 800, color: '#1e293b', align: TALL ? 'left' : 'center', base: 'middle' }));
  }
  function orgFace(cd, w, h, t) {
    const o = ORGS[cd.key], small = !TALL && h < 96 || TALL && w < 80;
    const nameH = TALL ? 0 : 22, artH = h - nameH - 4;
    const cx = w / 2, cy = (TALL ? h * 0.42 : 4 + artH / 2), r = Math.min(w, artH) / 2 - 2;
    ctx.fillStyle = rgrad(ctx, cx, cy, 2, cx, cy, r + 4, [[0, '#ffffff'], [1, KING[o.king].soft]]); ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, TAU); ctx.clip(); drawOrg(ctx, cd.key, cx, cy + 1, (r + 2) * 0.98, t + (cd.ph || 0), {}); ctx.restore();
    txt(o.name, cx, h - (TALL ? 9 : 13), { size: TALL ? 13 : (w > 100 ? 15.5 : 13), weight: 800, color: '#1e293b', align: 'center', base: 'middle', max: w - 4, min: 10.5 });
    void small;
  }
  function drawBox(B, i, t, hot) {
    const R = boxRect(i), K = KING[i], empty = !B.cards.some((c) => c.box === i), sel = B.selBox === i;
    const pr = hot ? 1.015 : 1;
    ctx.save(); ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(pr, pr); ctx.translate(-R.w / 2, -R.h / 2);
    dropShadow(0, 0, R.w, R.h, 16, hot ? 16 : 10, 3, hot ? rgba(K.color, 0.4) : 'rgba(30,60,40,.16)');
    rr(0, 0, R.w, R.h, 16); ctx.fillStyle = hot ? rgba(K.soft, 1) : rgba(K.soft, 0.85); ctx.fill();
    ctx.setLineDash(empty && !B.done ? [7, 5] : []); rr(0, 0, R.w, R.h, 16); ctx.strokeStyle = K.color; ctx.lineWidth = hot || sel ? 4 : 2.4; ctx.stroke(); ctx.setLineDash([]);
    if (!TALL) {
      pill(K.name, 10, 22, { size: 14.5, align: 'left', bg: K.color, pad: 10, h: 28 });
      if (empty) { ctx.save(); ctx.globalAlpha = 0.35; drawOrg(ctx, K.emb, R.w / 2, R.h * 0.6, 36, t, {}); ctx.restore(); }
    } else {
      txt(K.name, 12, 20, { size: 15, weight: 800, color: K.color, max: 92 });
      ctx.save(); ctx.globalAlpha = empty ? 0.9 : 0.6; drawOrg(ctx, K.emb, 30, 48, 17, t, {}); ctx.restore();
    }
    ctx.restore();
  }
  function drawBoardSummary(B, t) {              // 다 맞히면 빈 자리에 5계의 특징이 차례로 나타나요
    if (!B.done) return;
    const L = LAY.board, T = B.mode === 'org' ? L.trayOrg : L.trayFeat;
    for (let i = 0; i < 5; i++) {
      const K = KING[i], R = boxRect(i), a = clamp((now() - B.doneT - 0.55 - i * 0.12) / 0.45, 0, 1);
      if (a <= 0) continue;
      const e = EASE.outCubic(a);
      ctx.save(); ctx.globalAlpha = a;
      if (!TALL) {
        const x = R.x, y = T.y[0] + (1 - e) * 16, w = R.w, h = 176;
        dropShadow(x, y, w, h, 14, 8, 2, 'rgba(30,60,40,.14)');
        rr(x, y, w, h, 14); ctx.fillStyle = '#fff'; ctx.fill();
        rr(x, y, w, h, 14); ctx.strokeStyle = K.color; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = K.color; rr(x, y, w, 7, 4); ctx.fill();
        txt(K.name + '의 특징', x + 12, y + 28, { size: 14, weight: 800, color: K.color, max: w - 20 });
        const hh = para(K.feat, x + 12, y + 50, w - 24, { size: 14, weight: 800, color: '#1e293b', lh: 19 });
        para('예) ' + K.ex, x + 12, y + 50 + hh + 8, w - 24, { size: 13, weight: 700, color: '#64748b', lh: 17 });
      } else {
        const y = T.y[0] + i * 41 + (1 - e) * 10, x = 8, w = 444, h = 37;
        rr(x, y, w, h, 11); ctx.fillStyle = rgba(K.soft, 0.9); ctx.fill();
        rr(x, y, w, h, 11); ctx.strokeStyle = K.color; ctx.lineWidth = 1.8; ctx.stroke();
        txt(K.name, x + 10, y + h / 2 + 1, { size: 13.5, weight: 800, color: K.color, base: 'middle', max: 82 });
        txt(K.short, x + 98, y + h / 2 + 1, { size: 13.5, weight: 800, color: '#334155', base: 'middle', max: w - 106, min: 11 });
      }
      ctx.restore();
    }
  }
  function boardCaption(B, t) {
    const L = LAY.board, C = B.mode === 'org' ? L.capOrg : L.capFeat;
    panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: B.done ? '#86efac' : '#e2e8f0', bw: B.done ? 2 : 1.5 });
    const fs = TALL ? 14 : 15.5, lh = TALL ? 20 : 22, tx = C.x + 16, mw = C.w - 32;
    if (B.selBox != null) {
      const K = KING[B.selBox];
      pill(K.name, tx, C.y + 22, { size: 14, align: 'left', bg: K.color, pad: 11, h: 26 });
      para(K.feat + ' (예: ' + K.ex + ')', tx, C.y + 52, mw, { size: fs, weight: 800, color: '#1e293b', lh });
    } else if (B.sel && B.mode === 'org') {
      const o = ORGS[B.sel];
      pill(o.name, tx, C.y + 22, { size: 14, align: 'left', bg: '#334155', pad: 11, h: 26 });
      para('핵막 ' + (o.nuc ? '있음' : '없음') + ' · 광합성 ' + (o.photo ? '함' : '못 함') + ' · 세포벽 ' + (o.wall ? '있음' : '없음') + ' · 몸: ' + o.body, tx, C.y + 52, mw, { size: fs, weight: 800, color: '#1e293b', lh });
    } else if (B.done) {
      para(B.mode === 'org' ? '🎉 10가지 생물을 5계로 모두 분류했어요! 상자를 누르면 그 계의 특징을 볼 수 있어요.' : '🎉 기준 카드를 모두 알맞게 놓았어요! 상자를 누르면 그 계의 특징을 볼 수 있어요.', tx, C.y + 30, mw, { size: fs, weight: 800, color: '#166534', lh });
    } else if (B.msg && now() - B.msgT < 12) {
      para('🤔 ' + B.msg, tx, C.y + 30, mw, { size: fs, weight: 800, color: '#b91c1c', lh });
    } else if (B.mode === 'org') {
      para('생물 카드를 알맞은 계의 상자에 끌어 넣어요. 카드를 누르면 그 생물의 특징(핵막·광합성·세포벽·몸)을 볼 수 있어요.', tx, C.y + 30, mw, { size: fs, weight: 800, color: '#475569', lh });
    } else {
      para('기준 카드를 읽고, 그 특징을 가진 생물이 속하는 계의 상자에 끌어 놓아요. (검색표의 질문을 떠올려 봐요)', tx, C.y + 30, mw, { size: fs, weight: 800, color: '#475569', lh });
    }
  }
  function drawBoardScene(B, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eef7f1'); g.addColorStop(1, '#dcebe2'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const hot = (() => { const d = S.drag; if (!d || d.set !== B.mode || d.px == null) return -1; return boardBoxAt({ x: d.px, y: d.py }); })();
    for (let i = 0; i < 5; i++) drawBox(B, i, t, hot === i);
    if (!B.done && B.cards.some((c) => c.box < 0)) { const T = B.mode === 'org' ? LAY.board.trayOrg : LAY.board.trayFeat; txt(B.mode === 'org' ? '🧫 생물 카드 (끌어서 상자에 넣어요)' : '🃏 기준 카드 (끌어서 상자에 넣어요)', TALL ? 12 : T.x + 4, T.y[0] - 10, { size: 13.5, weight: 800, color: '#64748b' }); }
    const dragCd = S.drag && S.drag.set === B.mode ? S.drag.card : null;
    const draw1 = (cd) => {
      if (cd.kind === 'org') cardFrame(cd, t, KING[ORGS[cd.key].king].color, (w, h) => orgFace(cd, w, h, t), { r: cd.box >= 0 ? 12 : 14 });
      else cardFrame(cd, t, '#94a3b8', (w, h) => featFace(cd, w, h), { r: 14 });
    };
    B.cards.forEach((cd) => { if (cd !== dragCd) draw1(cd); });
    if (dragCd) draw1(dragCd);
    drawBoardSummary(B, t);
    boardCaption(B, t);
    const newName = B.mode === 'org' ? 'sort' : 'key';
    if (isNew(newName)) { const a = boxRect(0), b = boxRect(4); newRing({ x: a.x, y: a.y, w: b.x + b.w - a.x, h: b.y + b.h - a.y }, 16); }
  }
  function drawSortScene(t) { drawBoardScene(BO, t); }

  /* =========================================================
     장면 전환 · 안내 말풍선 · 입력
     ========================================================= */
  const SCENE_LABEL = { sp: '🧬 짝짓기 실험으로 종의 뜻 알아보기', ranks: '📦 호랑이의 분류 단계', key: '🌳 5계를 나누는 검색표', sort: '🗂️ 생물을 5계로 분류하기' };
  const SCENE_BG = { sp: 'linear-gradient(180deg,#eef7f1,#dcebe2)', ranks: 'linear-gradient(180deg,#eef7f1,#dcebe2)', key: 'linear-gradient(180deg,#eef7f1,#dcebe2)', sort: 'linear-gradient(180deg,#eef7f1,#dcebe2)' };
  let snapCv = null;
  function setView(scene, instant) {
    if (S.scene === scene) { updateSceneUI(); return; }
    if (!instant && !RM && view && view.canvas.width > 2) {
      if (!snapCv) snapCv = document.createElement('canvas');
      snapCv.width = view.canvas.width; snapCv.height = view.canvas.height;
      snapCv.getContext('2d').drawImage(view.canvas, 0, 0);
      S.snapOK = true;
    } else S.snapOK = false;
    S.prevKey = S.scene; S.scene = scene; S.sceneT0 = now(); S.drag = null;
    updateSceneUI(); hideHint();
  }
  function drawView(key, t) {
    if (key === 'sp') drawSpScene(t); else if (key === 'ranks') drawRanksScene(t); else if (key === 'key') drawKeyScene(t); else drawSortScene(t);
  }
  function draw(t) {
    view.clear(BG);
    const key = S.scene;
    const p = S.snapOK ? clamp((now() - S.sceneT0) / 0.75, 0, 1) : 1;
    if (p < 1) {
      const fwd = VIEW_ORDER.indexOf(key) > VIEW_ORDER.indexOf(S.prevKey);
      const e = EASE.inOutCubic(p);
      const s1 = fwd ? 0.84 + 0.16 * EASE.outCubic(p) : 1.1 - 0.1 * EASE.outCubic(p);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s1, s1); ctx.translate(-W / 2, -H / 2); drawView(key, t); ctx.restore();
      const s0 = fwd ? 1 + 1.5 * e : 1 - 0.18 * e;
      ctx.save(); ctx.globalAlpha = 1 - EASE.inQuad(p); ctx.translate(W / 2, H / 2); ctx.scale(s0, s0); ctx.translate(-W / 2, -H / 2); ctx.drawImage(snapCv, 0, 0, W, H); ctx.restore();
    } else { drawView(key, t); drawTopBtns(); drawHint(); }
    PFX.draw(ctx);
  }
  const HINT = { msg: '', t0: 0, tEnd: 0 };
  function showHint(msg, ms) { HINT.msg = msg; HINT.t0 = now(); HINT.tEnd = now() + (ms || 6000) / 1000; }
  function hideHint() { if (HINT.msg && HINT.tEnd > now()) HINT.tEnd = now(); }
  function drawHint() {
    if (!HINT.msg) return;
    const hp = (LAY[S.scene === 'sort' ? 'board' : S.scene] || {}).hint;
    if (!hp) return;
    const t = now(), inA = clamp((t - HINT.t0) / 0.35, 0, 1), a = Math.min(inA, clamp(1 - (t - HINT.tEnd) / 0.4, 0, 1));
    if (a <= 0.01) { if (t > HINT.tEnd + 0.5) HINT.msg = ''; return; }
    const size = 14, padX = 14, lh = 19, ls = lines(HINT.msg, hp.maxW - padX * 2, size, 800);
    ctx.save(); ctx.font = font(size, 800);
    let tw = 0; ls.forEach((ln) => { tw = Math.max(tw, ctx.measureText(ln).width); });
    const w = tw + padX * 2, h = ls.length * lh + 10, x = hp.x - w / 2, y = hp.y - h / 2 + (1 - EASE.outCubic(inA)) * 8 + (ls.length > 1 ? 4 : 0);
    ctx.globalAlpha = a; ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, Math.min(h / 2, 18)); ctx.fillStyle = 'rgba(27,35,51,.92)'; ctx.fill(); ctx.shadowColor = 'transparent';
    ls.forEach((ln, i) => txt(ln, x + w / 2, y + 5 + lh / 2 + i * lh, { size, weight: 800, color: '#fff', align: 'center', base: 'middle' }));
    ctx.restore();
  }
  // 자유 탐구에서만: 장면 안의 보조 단추 (검색표 ↔ 기준 카드 바꾸기, 다시 섞기 ...)
  let TOPB = [];
  function topSpec() {
    if (!(game && game.free)) return [];
    if (S.scene === 'key') return KY.mode === 'flow' ? [['tog', '🃏 기준 카드로 보기']] : [['reset', '↺ 다시 하기'], ['tog', '🌳 검색표로 보기']];
    if (S.scene === 'sort') return [['reset', '↺ 다시 섞기']];
    if (S.scene === 'ranks') return RK.mode === 'explore' ? [['rkorder', '🃏 순서 카드 게임']] : [['rkreset', '↺ 다시 섞기'], ['rkexplore', '📦 상자 보기']];
    return [];
  }
  function drawTopBtns() {
    TOPB = [];
    const spec = topSpec(); if (!spec.length) return;
    ctx.save(); ctx.font = font(13.5, 800);
    let x = W - 12;
    spec.slice().reverse().forEach(([id, label]) => {
      const w = ctx.measureText(label).width + 26, r = { id, label, x: x - w, y: 8, w, h: 32 };
      x -= w + 8; TOPB.unshift(r);
    });
    ctx.restore();
    TOPB.forEach((r) => {
      const hov = S.togHov === r.id;
      dropShadow(r.x, r.y, r.w, r.h, 16, 6, 2, 'rgba(20,40,30,.18)');
      rr(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = hov ? '#e2e8f0' : '#fff'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke();
      txt(r.label, r.x + r.w / 2, r.y + r.h / 2 + 1, { size: 13.5, weight: 800, color: '#475569', align: 'center', base: 'middle' });
    });
  }
  const topAt = (p) => TOPB.find((r) => inR(p, r, 4)) || null;
  function topAct(id) {
    Sound.click();
    if (id === 'tog') { KY.mode = KY.mode === 'flow' ? 'match' : 'flow'; if (KY.mode === 'match' && !BF.done) boardReset(BF); }
    else if (id === 'reset') { if (S.scene === 'sort') boardReset(BO); else boardReset(BF); }
    else if (id === 'rkorder') { RK.mode = 'order'; if (!RK.done) rkResetOrder(); }
    else if (id === 'rkexplore') { RK.mode = 'explore'; }
    else if (id === 'rkreset') { rkResetOrder(); }
    updateSceneUI();
  }
  function interactiveAt(p) {
    const sc = S.scene;
    if (sc === 'ranks') return RK.mode === 'order' ? !RK.done && !!cardAt(RK.cards, p) : inR(p, LAY.ranks.area) || [0, 1, 2, 3, 4, 5, 6].some((k) => inR(p, chipRect(k)));
    if (sc === 'key') return KY.mode === 'match' ? !!cardAt(BF.cards, p) : !!keyHitTest(p);
    if (sc === 'sort') return !!cardAt(BO.cards, p);
    return false;
  }
  const BOARD_OF = () => (S.scene === 'sort' ? BO : (S.scene === 'key' && KY.mode === 'match' ? BF : null));
  const handlers = {
    hover(p) {
      { const tb = topAt(p); S.togHov = tb ? tb.id : null; if (tb) return 'pointer'; }
      const B = BOARD_OF();
      if (B) { const cd = cardAt(B.cards, p); return cd && !B.done ? 'grab' : cd || boardBoxAt(p) >= 0 ? 'pointer' : null; }
      if (S.scene === 'sp') return spHitAt(p) ? 'pointer' : null;
      if (S.scene === 'ranks') { if (RK.mode === 'order') return cardAt(RK.cards, p) && !RK.done ? 'grab' : null; return interactiveAt(p) ? 'pointer' : null; }
      if (S.scene === 'key') { KY.hov = keyHitTest(p); return KY.hov || S.togHov ? 'pointer' : null; }
      return null;
    },
    down(p) {
      hideHint();
      { const tb = topAt(p); if (tb) { topAct(tb.id); return false; } }
      if (S.scene === 'sp') { const h = spHitAt(p); if (h) spPoke(h); return false; }
      const B = BOARD_OF();
      if (B) {
        const cd = cardAt(B.cards, p);
        if (cd) { if (cd.kind === 'org') B.sel = cd.key; B.selBox = null; if (!B.done) return dragSetup(cd, B.mode, B.cards, p); Sound.tick(); return false; }
        const bi = boardBoxAt(p); if (bi >= 0) { B.selBox = B.selBox === bi ? null : bi; B.sel = null; Sound.tone(520 + bi * 90, 0.1, 'triangle', 0.06); }
        return false;
      }
      if (S.scene === 'ranks') {
        if (RK.mode === 'order') { const cd = cardAt(RK.cards, p); if (cd && !RK.done) return dragSetup(cd, 'rk', RK.cards, p); return false; }
        for (let k = 0; k < 7; k++) if (inR(p, chipRect(k))) { rkSetLevel(k, true); return false; }
        if (inR(p, LAY.ranks.area)) rkSetLevel(RK.uT + 1, true);
        return false;
      }
      if (S.scene === 'key' && KY.mode === 'flow') {
        const h = keyHitTest(p);
        if (h) {
          if (h.kind === 'ans') keyAnswer(h.ans); else if (h.kind === 'next') keyNextOrg(); else if (h.kind === 'pick') { if (KEY_ORDER[h.i] !== KY.org) { keyReset(KEY_ORDER[h.i]); Sound.click(); } }
        }
        return false;
      }
      return false;
    },
    move(p) {
      const d = S.drag; if (!d) return;
      d.card.x = p.x - d.dx; d.card.y = p.y - d.dy; d.px = p.x; d.py = p.y;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 6) d.moved = true;
    },
    up(p) {
      const d = S.drag; if (!d) return;
      S.drag = null;
      const cd = d.card;
      if (d.set === 'rk') { const s = rkSlotAt(p); if (s >= 0) rkPlace(cd, s); else { cd.slot = -1; rkSnap(true); if (d.moved) Sound.tick(); } return; }
      const B = d.set === 'org' ? BO : BF;
      if (!d.moved) { snapBoard(B, true); return; }
      const bi = boardBoxAt(p);
      if (bi >= 0) boardAssign(B, cd, bi); else { cd.box = -1; snapBoard(B, true); Sound.tick(); }
    },
  };

  /* =========================================================
     HTML 조작 · 상태 갱신
     ========================================================= */
  const btnMate = $('#btnMate'), oSp = $('#oSp'), spNote = $('#spNote'), oRk = $('#oRk'), btnRkUp = $('#btnRkUp'), btnRkDown = $('#btnRkDown');
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.scene); }));
  $$('#expSeg button').forEach((b) => b.addEventListener('click', () => { spSelect(+b.dataset.exp); }));
  btnMate.addEventListener('click', () => { spAct(); });
  btnRkUp.addEventListener('click', () => { Sound.click(); hideHint(); rkSetLevel(RK.uT + 1, true); });
  btnRkDown.addEventListener('click', () => { Sound.click(); hideHint(); rkSetLevel(RK.uT - 1, true); });
  function updateSpUI() {
    const b = spBtnState();
    if (b.label !== SP.label) { SP.label = b.label; btnMate.textContent = b.label; }
    btnMate.disabled = b.dis;
    $$('#expSeg button').forEach((el) => { const on = +el.dataset.exp === SP.sel; el.classList.toggle('on', on); el.setAttribute('aria-selected', on ? 'true' : 'false'); });
    oSp.textContent = (SP.sel === 0 ? '① ' : '② ') + EXPS[SP.sel].an + ' × ' + EXPS[SP.sel].bn;
    const r = SP.run[SP.sel];
    spNote.textContent = r.ph === 0 ? '짝짓기를 시키면 자손이 태어나요. 그 자손이 새끼를 낳는지도 확인해 봐요.' : r.ph === 1 ? EXPS[SP.sel].note1 : '결과가 기록표에 쌓여요. 다른 실험도 해 보세요.';
  }
  function updateRanksUI() {
    const L = RK.uT;
    oRk.textContent = RANKS[L].n + ' · ' + RANKS[L].taxon;
    btnRkUp.disabled = L >= 6; btnRkDown.disabled = L <= 0;
  }
  function updateSceneUI() {
    if (view) view.wrap.style.setProperty('--stage-bg', SCENE_BG[S.scene]);
    $$('#sceneSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.scene === S.scene); b.setAttribute('aria-selected', b.dataset.scene === S.scene ? 'true' : 'false'); });
    const showSp = S.scene === 'sp', showRk = S.scene === 'ranks' && RK.mode === 'explore';
    $('#ctrlSp').hidden = !showSp; $('#ctrlRk').hidden = !showRk;
    $('#ctrlCard').hidden = !(showSp || showRk);
    fitLabel();
  }
  function fitLabel() {
    const lab = $('#sceneLabel'), seg = $('#sceneSeg'), bar = lab.parentElement;
    lab.hidden = false; lab.textContent = SCENE_LABEL[S.scene];
    if (seg && !seg.hidden) {
      const free = bar.clientWidth - seg.offsetWidth - 36;
      if (lab.scrollWidth + 8 > free) lab.hidden = true;
    }
  }
  window.addEventListener('resize', fitLabel);
  let spTick = 0;
  function update(dt, t) {
    [RK.cards, BF.cards, BO.cards].forEach((list) => list.forEach((cd) => { cd.lift = SciSim.approach(cd.lift, S.drag && S.drag.card === cd ? 1 : 0, dt, 14); }));
    spUpdate(dt); rkUpdate(dt);
    spTick += dt; if (spTick > 0.12) { spTick = 0; updateSpUI(); }
    PFX.update(dt);
  }

  /* =========================================================
     단계와 미션
     ========================================================= */
  const mark = (ok) => (ok ? '✅' : '⬜');
  function rkReset() { RK.maxL = 0; RK.uT = 0; RK.sp.value = 0; RK.sp.target = 0; RK.sp.velocity = 0; RK.autoT = -9; RK.arrived = 0; updateRanksUI(); }
  function rkInstant(L) { RK.uT = L; RK.sp.value = L; RK.sp.target = L; RK.sp.velocity = 0; RK.maxL = Math.max(RK.maxL, L); RK.autoT = -9; RK.arrived = L + 1; updateRanksUI(); }
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '종의 뜻 알아보기', short: '종의 뜻', icon: '🧬', phase: '관찰',
      features: ['species'],
      intro: '<p class="si-q">❓ 탐구 질문: 지구의 수많은 생물을 어떻게 정리할 수 있을까?</p>' +
        '<p>생물을 정리하려면 먼저 <b>"같은 종류의 생물"</b>이 무엇인지 정해야 해요. 두 쌍의 동물로 짝짓기 실험을 하고, <b>종</b>의 뜻을 알아봐요.</p>',
      setup() { setView('sp', true); },
      recap: '<b>종</b>은 자연 상태에서 짝짓기하여 <b>생식 능력이 있는 자손</b>을 낳을 수 있는 생물 무리예요.',
      summary: '<ul><li><b>생물학적 종</b>: 자연 상태에서 짝짓기하여 <b>생식 능력이 있는 자손</b>을 낳을 수 있는 생물 무리</li>' +
        '<li>말 × 당나귀 → 노새(생식 능력 없음) → <b>서로 다른 종</b></li>' +
        '<li>진돗개 × 삽살개 → 강아지(생식 능력 있음) → <b>같은 종</b></li>' +
        '<li>생김새가 비슷하다고 같은 종은 아니고, 생김새가 달라도 같은 종일 수 있어요.</li></ul>',
      missions: [
        {
          title: '짝짓기 실험 두 번 해 보기',
          goal: '<b>실험 ①</b>(말 × 당나귀)과 <b>실험 ②</b>(진돗개 × 삽살개)를 해 보세요. 짝짓기로 자손이 태어나면, 그 자손끼리도 짝짓기를 시켜 새끼를 낳는지 살펴봐요.',
          hint: '💞 단추로 짝짓기를 시키고, 자손이 태어나면 🔁 단추로 자손끼리 짝짓기를 시켜 보세요. 실험은 위쪽 단추로 바꿀 수 있어요.',
          setup() { setView('sp'); spFullReset(); showHint('💞 짝짓기 시키기 단추를 눌러 보세요', 6500); },
          check: () => spDone(),
          hold: 0.6,
          status: () => '① ' + mark(SP.rec[0]) + ' 말 × 당나귀 · ② ' + mark(SP.rec[1]) + ' 진돗개 × 삽살개',
          explain: '말과 당나귀 사이에서 태어난 <b>노새</b>는 새끼를 낳지 못해요(생식 능력이 없음). 그래서 말과 당나귀는 <b>서로 다른 종</b>이에요. 진돗개와 삽살개 사이에서 태어난 <b>강아지</b>는 자라서 새끼를 낳을 수 있어요(생식 능력이 있음). 그래서 <b>같은 종</b>이에요.',
        },
        {
          type: 'quiz',
          title: '종을 나누는 기준',
          goal: '<b>생물학적 종</b>의 뜻으로 옳은 것은?',
          setup() { setView('sp'); if (!spDone()) spSolve(); },
          choices: [
            '생김새와 크기가 비슷한 생물의 무리',
            '자연 상태에서 짝짓기하여 생식 능력이 있는 자손을 낳을 수 있는 생물의 무리',
            '같은 장소에 모여 사는 생물의 무리',
            '짝짓기를 해서 자손이 태어나기만 하면 같은 종이다',
          ],
          answer: 1,
          feedback: [
            '말과 당나귀는 생김새가 비슷해도 서로 다른 종이에요. 반대로 진돗개와 삽살개는 생김새가 많이 달라도 같은 종이에요.',
            '',
            '사는 곳이 같다고 같은 종은 아니에요. 종은 짝짓기와 자손의 생식 능력으로 나눠요.',
            '노새처럼 자손이 태어나도, 그 자손이 새끼를 낳지 못하면 두 생물은 서로 다른 종이에요.',
          ],
          explain: '종은 <b>자연 상태에서 짝짓기하여 생식 능력이 있는 자손</b>을 낳을 수 있는 생물 무리예요. 생김새로 나누는 것이 아니에요.',
        },
        {
          type: 'quiz',
          title: '같은 종일까, 다른 종일까?',
          goal: '<b>푸들</b>과 <b>치와와</b>는 크기와 생김새가 많이 달라요. 그런데 둘 사이에서 태어난 강아지가 자라서 새끼를 낳을 수 있다면, 푸들과 치와와는?',
          setup() { setView('sp'); if (!spDone()) spSolve(); },
          choices: [
            '같은 종이다 — 생식 능력이 있는 자손을 낳을 수 있으니까',
            '다른 종이다 — 크기와 생김새가 많이 다르니까',
            '다른 종이다 — 품종 이름이 서로 다르니까',
            '알 수 없다 — 사진을 더 봐야 한다',
          ],
          answer: 0,
          feedback: [
            '',
            '생김새와 크기는 종을 나누는 기준이 아니에요. 진돗개와 삽살개를 떠올려 보세요.',
            '이름이 달라도 생식 능력이 있는 자손을 낳으면 같은 종이에요.',
            '생김새가 아니라 자손의 생식 능력으로 판단해요. 문제에 이미 단서가 있어요!',
          ],
          explain: '둘 사이에서 태어난 자손이 <b>생식 능력</b>이 있으므로 푸들과 치와와는 <b>같은 종</b>이에요. 생김새가 크게 달라도 종을 나누는 기준은 변하지 않아요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '분류 단계 쌓아 보기', short: '분류 단계', icon: '📦', phase: '탐구',
      features: ['ranks'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 종끼리는 생식 능력이 있는 자손을 낳을 수 있다는 것을 알았어요.</div>' +
        '<p>지구에는 종이 아주 많아요. 비슷한 종을 묶어 점점 더 큰 무리로 정리한 것이 <b>분류 단계</b>예요. <b>호랑이</b>가 들어 있는 상자를 하나씩 키우면서 분류 단계를 알아봐요.</p>',
      setup() { setView('ranks', true); },
      recap: '분류 단계는 <b>종 &lt; 속 &lt; 과 &lt; 목 &lt; 강 &lt; 문 &lt; 계</b> 순서로 커지고, 가장 큰 단계인 <b>계</b>에 가장 많은 생물이 들어 있어요.',
      summary: '<ul><li>분류 단계: <b>종 &lt; 속 &lt; 과 &lt; 목 &lt; 강 &lt; 문 &lt; 계</b> (작은 단계 → 큰 단계)</li>' +
        '<li>호랑이: 호랑이(종) · 표범속 · 고양잇과 · 식육목 · 포유강 · 척삭동물문 · 동물계</li>' +
        '<li>단계가 커질수록 더 많은 종류의 생물이 포함돼요. 가장 큰 단계는 <b>계</b>예요.</li></ul>',
      missions: [
        {
          title: '호랑이의 분류 단계 올라가기',
          goal: '<b>⬆ 넓히기</b> 단추를 눌러 호랑이가 들어 있는 상자를 <b>계</b>까지 한 단계씩 넓혀 보세요.',
          hint: '⬆ 넓히기를 누를 때마다 더 큰 상자가 나타나고 새로운 생물이 들어와요. 오른쪽 단계 칩을 눌러도 돼요.',
          setup() { setView('ranks'); RK.mode = 'explore'; rkReset(); updateSceneUI(); showHint('⬆ 넓히기 단추로 상자를 키워 보세요', 6500); },
          check: () => RK.maxL >= 6 && RK.uT >= 6 && Math.abs(RK.sp.value - 6) < 0.15,
          hold: 0.8,
          status: () => '올라간 단계: <b>' + RK.maxL + ' / 6</b> ' + mark(RK.maxL >= 6 && RK.uT >= 6),
          explain: '호랑이는 <b>종(호랑이) → 속(표범속) → 과(고양잇과) → 목(식육목) → 강(포유강) → 문(척삭동물문) → 계(동물계)</b> 순서로 점점 더 넓은 무리에 속해요.',
        },
        {
          title: '분류 단계 순서 맞추기',
          manual: true,
          goal: '카드 7장을 <b>작은 단계 → 큰 단계</b> 순서로 칸에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '호랑이 상자가 커지던 순서를 떠올려 봐요. 가장 작은 단계는 호랑이 한 종뿐인 "종", 가장 큰 단계는 "계"예요.',
          setup() { setView('ranks'); RK.mode = 'order'; rkResetOrder(); rkInstant(0); updateSceneUI(); showHint('🃏 카드를 끌어 순서대로 놓아요', 6500); },
          status: () => '놓은 카드: <b>' + RK.cards.filter((c) => c.slot >= 0).length + ' / 7</b>',
          check() { return rkCheck(); },
          explain: '분류 단계는 <b>종 &lt; 속 &lt; 과 &lt; 목 &lt; 강 &lt; 문 &lt; 계</b>예요. 단계가 올라갈수록 비슷한 생물들이 더 넓게 묶여요.',
        },
        {
          type: 'quiz',
          title: '가장 많은 생물을 포함하는 단계',
          goal: '호랑이 상자에서 <b>가장 많은 생물</b>을 포함하는 분류 단계는?',
          setup() { setView('ranks'); RK.mode = 'explore'; rkInstant(6); updateSceneUI(); },
          choices: ['종', '과', '문', '계'],
          answer: 3,
          feedback: [
            '종은 가장 작은 단계예요. 호랑이 한 종만 들어 있었어요.',
            '과보다 더 큰 단계(목·강·문·계)가 있어요.',
            '문보다 한 단계 더 큰 상자가 있어요. 가장 바깥 상자를 떠올려 보세요.',
            '',
          ],
          explain: '단계가 클수록 더 많은 생물이 들어가요. 가장 큰 단계인 <b>계</b>(동물계)에는 호랑이뿐 아니라 새, 물고기, 곤충 같은 모든 동물이 들어 있어요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '5계로 나누는 기준', short: '5계 기준', icon: '🌳', phase: '설명',
      features: ['key'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 가장 큰 분류 단계가 <b>계</b>라는 것을 알았어요.</div>' +
        '<p>생물을 <b>5개의 계</b>(원핵생물계·원생생물계·균계·식물계·동물계)로 나누려면 어떤 기준이 필요할까요? <b>검색표</b>의 질문에 답하면서 생물이 어느 계로 가는지 따라가 봐요.</p>',
      setup() { setView('key', true); KY.mode = 'flow'; },
      recap: '5계는 <b>핵막 → 광합성 → 세포벽 → 조직·기관</b> 같은 기준으로 나눠요. 버섯은 식물이 아니라 <b>균계</b>예요.',
      summary: '<ul><li><b>5계</b>: 원핵생물계 · 원생생물계 · 균계 · 식물계 · 동물계</li>' +
        '<li>분류 기준: <b>핵막</b> 유무 → <b>광합성</b> 여부 → <b>세포벽</b> 유무 → <b>조직·기관</b> 발달</li>' +
        '<li>원핵생물계(핵막 없음: 대장균) · 원생생물계(조직·기관이 발달하지 않음: 짚신벌레, 미역) · 균계(광합성 못 함, 세포벽 있음: 곰팡이·버섯·효모)</li>' +
        '<li>식물계(광합성, 뿌리·줄기·잎: 고사리, 소나무) · 동물계(광합성 못 함, 세포벽 없음, 조직 발달: 해파리, 참새)</li>' +
        '<li>버섯은 식물이 아니라 <b>균계</b>예요.</li></ul>',
      missions: [
        {
          title: '검색표로 생물 분류하기',
          goal: '생물의 특징을 보고 검색표의 질문에 <b>예/아니오</b>로 답해서 길을 따라가세요. <b>3가지 생물</b>을 분류해 보세요.',
          hint: '파란 테두리 칸이 지금 질문에서 살펴볼 특징이에요. 특징을 보고 "예" 또는 "아니오"를 눌러요.',
          setup() { setView('key'); KY.mode = 'flow'; KY.done = {}; KY.nDone = 0; KY.leafT = {}; keyReset('ecoli'); updateSceneUI(); showHint('질문에 "예" 또는 "아니오"를 눌러 길을 따라가요', 6500); },
          check: () => KY.nDone >= 3,
          hold: 0.7,
          status: () => '분류한 생물: <b>' + KY.nDone + ' / 3</b> ' + mark(KY.nDone >= 3),
          explain: '검색표는 <b>핵막이 있나요? → 광합성을 하나요? → 세포벽이 있나요? → 조직이 발달했나요?</b> 같은 질문으로 생물을 가르는 길이에요. 질문에 답하면 그 생물이 속한 계가 나와요.',
        },
        {
          title: '기준 카드 맞추기',
          manual: true,
          goal: '5장의 <b>기준 카드</b>를 그 특징을 가진 계의 상자에 끌어 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '핵막이 없으면 원핵생물계, 광합성을 하고 뿌리·줄기·잎이 있으면 식물계예요. 광합성을 못 할 땐 세포벽이 있는지 따져 봐요.',
          setup() { setView('key'); KY.mode = 'match'; boardReset(BF); updateSceneUI(); showHint('🃏 기준 카드를 알맞은 계의 상자에 끌어 놓아요', 6500); },
          status: () => '넣은 카드: <b>' + BF.cards.filter((c) => c.box >= 0).length + ' / 5</b>',
          check() { return boardCheck(BF); },
          explain: '<b>원핵생물계</b>: 핵막 없음 · <b>원생생물계</b>: 핵막은 있지만 조직·기관 미발달 · <b>균계</b>: 광합성 X, 세포벽 O, 균사 · <b>식물계</b>: 광합성, 뿌리·줄기·잎 · <b>동물계</b>: 광합성 X, 세포벽 X, 조직 발달',
        },
        {
          type: 'quiz',
          title: '표고버섯은 어느 계일까?',
          goal: '표고버섯은 나무에서 자라요. <b>표고버섯</b>은 어느 계에 속할까요?',
          setup() { setView('key'); KY.mode = 'flow'; if (KY.nDone < 3) keySolveSome(3); keyReset('shiitake', true); updateSceneUI(); },
          choices: [
            '식물계 — 나무에서 자라니까',
            '균계 — 광합성을 못 하고 세포벽이 있으며 균사로 이루어져 있으니까',
            '동물계 — 광합성을 못 하니까',
            '원생생물계 — 몸이 단순하니까',
          ],
          answer: 1,
          feedback: [
            '자라는 곳이 아니라 특징으로 나눠요. 버섯은 광합성을 하지 못하고 뿌리·줄기·잎도 없어서 식물이 아니에요.',
            '',
            '동물은 세포벽이 없어요. 표고버섯은 세포벽이 있어서 동물계가 아니에요.',
            '버섯은 균사로 이루어지고 광합성을 못 하며 세포벽이 있어서 균계로 분류해요.',
          ],
          explain: '검색표를 따라가 보면 표고버섯은 <b>핵막 있음 → 광합성 못 함 → 세포벽 있음</b>이라서 <b>균계</b>예요. 버섯, 곰팡이, 효모가 모두 균계예요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '생물을 5계로 분류하기', short: '계 분류', icon: '🗂️', phase: '적용',
      features: ['sort'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> <b>핵막 → 광합성 → 세포벽 → 조직·기관</b> 순서로 5계를 나누는 기준을 배웠어요.</div>' +
        '<p>이제 여러 생물을 직접 5계로 분류해 봐요. 생물 카드 <b>10장</b>을 알맞은 계의 상자에 끌어 넣어 보세요. 헷갈리면 카드를 눌러 특징을 살펴봐요.</p>',
      setup() { setView('sort', true); },
      recap: '생물은 겉모습이나 사는 곳이 아니라 <b>특징(분류 기준)</b>에 따라 5계로 분류해요.',
      summary: '<ul><li>생물을 계 수준에서 분류할 때는 <b>핵막 → 광합성 → 세포벽 → 조직·기관</b> 순서로 확인해요.</li>' +
        '<li>대장균=원핵생물계 · 짚신벌레, 미역=원생생물계 · 푸른곰팡이, 표고버섯, 효모=균계 · 고사리, 소나무=식물계 · 해파리, 참새=동물계</li>' +
        '<li>단세포인지, 움직이는지, 사는 곳이 어디인지만으로 계를 나누지 않아요.</li></ul>',
      missions: [
        {
          title: '5계 분류 게임',
          manual: true,
          goal: '생물 카드 <b>10장</b>을 알맞은 계의 상자에 끌어 넣고 <b>✔ 확인하기</b>를 누르세요. 카드를 누르면 특징이 보여요.',
          hint: '카드를 누르면 핵막·광합성·세포벽·몸의 특징이 나와요. 핵막 → 광합성 → 세포벽 순서로 따져 봐요. 미역과 효모, 버섯을 조심하세요!',
          setup() { setView('sort'); boardReset(BO); updateSceneUI(); showHint('🧫 생물 카드를 끌어 5계 상자에 넣어요', 6500); },
          status: () => '넣은 카드: <b>' + BO.cards.filter((c) => c.box >= 0).length + ' / 10</b>',
          check() { return boardCheck(BO); },
          explain: '<b>대장균</b>은 핵막이 없어서 원핵생물계, <b>짚신벌레·미역</b>은 조직·기관이 발달하지 않아 원생생물계, <b>푸른곰팡이·표고버섯·효모</b>는 광합성을 못 하고 세포벽이 있어 균계, <b>고사리·소나무</b>는 식물계, <b>해파리·참새</b>는 동물계예요.',
        },
        {
          type: 'quiz',
          title: '같은 계끼리 짝짓기',
          goal: '다음 중 <b>같은 계</b>에 속하는 생물끼리 짝지은 것은?',
          setup() { setView('sort'); if (!BO.done) boardSolve(BO); updateSceneUI(); },
          choices: [
            '짚신벌레와 해파리 — 둘 다 움직이니까',
            '푸른곰팡이와 효모 — 둘 다 광합성을 못 하고 세포벽이 있으니까',
            '미역과 소나무 — 둘 다 광합성을 하니까',
            '대장균과 효모 — 둘 다 단세포이니까',
          ],
          answer: 1,
          feedback: [
            '짚신벌레는 원생생물계, 해파리는 동물계예요. 움직이는 것만으로 계를 나누지 않아요.',
            '',
            '미역은 원생생물계, 소나무는 식물계예요. 소나무는 뿌리·줄기·잎이 발달했지만 미역은 그렇지 않아요.',
            '대장균은 핵막이 없는 원핵생물계, 효모는 핵막이 있는 균계예요. 핵막이 있는지부터 따져 봐요.',
          ],
          explain: '푸른곰팡이와 효모는 <b>광합성을 못 하고 세포벽이 있어서</b> 같은 균계예요. 단세포인지, 움직이는지만 보지 말고 <b>핵막 → 광합성 → 세포벽 → 조직·기관</b> 기준을 차례로 확인해요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작
     ========================================================= */
  function buildStage() {
    const kind = mq && mq.matches ? 'tall' : 'wide';
    if (kind === KIND) return;
    let cv = $('#cv');
    if (view) {
      const fresh = document.createElement('canvas');
      fresh.id = 'cv'; fresh.setAttribute('aria-label', cv.getAttribute('aria-label') || '');
      cv.replaceWith(fresh); cv = fresh;
    }
    KIND = kind; TALL = kind === 'tall';
    W = LAYOUTS[kind].w; H = LAYOUTS[kind].h;
    LAY = computeLayouts(); keyGeomCache = null;
    S.drag = null; S.snapOK = false;
    view = SciSim.stage(cv, { width: W, height: H, background: BG });
    ctx = view.ctx; D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    if (TALL) {
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => { const tc = e.touches[0]; if (tc && interactiveAt(view.toLocal(tc))) e.preventDefault(); }, { passive: false });
    }
    lineCache.clear(); SHC.clear();
    rkSnap(false); snapBoard(BF, false); snapBoard(BO, false);
    if (KY.org) { const p = keyTokPos(KY.node); KY.tok.x = p.x; KY.tok.y = p.y; }
    updateSceneUI();
  }
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  keyReset('ecoli', true);
  boardReset(BF); boardReset(BO); rkResetOrder(); updateSpUI(); updateRanksUI();

  game = SciSim.game({
    simId: 'm1-classification',
    mount: '#game',
    badge: '분류 박사',
    homeHref: '../../index.html#g1',
    featureLabels: {
      species: '🧪 짝짓기 실험 · 기록표',
      ranks: '📦 호랑이의 분류 단계 상자',
      key: '🌳 5계 검색표 · 기준 카드',
      sort: '🗂️ 5계 상자 · 생물 카드 10장',
    },
    onFeatures() { updateSceneUI(); },
    onMissionStart() { hideHint(); },
    onComplete() { KY.mode = 'flow'; updateSceneUI(); },
    levels,
  });
  updateSceneUI();

  // 테스트·점검용
  window.__sim = {
    S, SP, RK, KY, BF, BO, game, setView, LAY: () => LAY, KIND: () => KIND, EXPS, KING, ORGS, KEY_ORDER, RANKS,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
    cardPoint(list, pred) { const cd = list.find(pred); return this.toClient(cd.x + cd.w / 2, cd.y + cd.h / 2); },
    boxPoint(i) { const r = boxRect(i); return this.toClient(r.x + r.w / 2, r.y + r.h * (TALL ? 0.5 : 0.62)); },
    rkSlotPoint(i) { const r = rkSlot(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    chipPoint(k) { const r = chipRect(k); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    ansPoint(ans) { const c = keyPillPos(KY.node, ans); return this.toClient(c.x, c.y); },
    pickPoint(i) { const r = pickRect(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    nextPoint() { const r = nextBtnRect(); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    spSolve, spFullReset, rkSetLevel, rkInstant, rkSolveOrder, keySolveSome, keyReset, keyAnswer, boardSolve, boardReset, keyPath, drawQuad, drawOrg, rkPlayAuto,
  };

  SciSim.loop((dt, t) => {
    update(dt, t);
    draw(t);
  });
})();
