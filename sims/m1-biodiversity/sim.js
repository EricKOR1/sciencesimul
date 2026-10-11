/* =========================================================
   중1 Ⅱ. 생물의 구성과 다양성 — 생물다양성의 보전 [9과02-05]
   ① [관찰] 먹이 그물 놀이: 단순한 생태계(4종) vs 복잡한 생태계(10종)에서 한 종을 없애 보기
   ② [탐구] 위협 요인: 서식지 파괴 · 외래종 유입 · 남획 · 환경 오염 · 기후변화 (시나리오 → 원인)
   ③ [설명] 보전 방법: 생태 통로 · 외래종 관리 · 보호 구역 · 오염 줄이기 · 종자 은행·복원 사업 (개체 수 회복)
   ④ [적용] 실천: 개인과 사회의 실천 분류 + 나의 실천 다짐
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
     무대: 태블릿 = 가로형 800×640, 휴대폰 = 세로형 460×860
     ========================================================= */
  const LAYOUTS = { wide: { w: 800, h: 640 }, tall: { w: 460, h: 860 } };
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
  // 한 번만 그려 두는 층(layer)과 작은 그림(sprite): 매 프레임 다시 그리는 일을 줄여요
  const LAYERS = new Map(), SPR = new Map();
  function offscreen(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function layer(key, fn) {                          // 화면 전체 크기의 층
    const cv = view.canvas, k = key + '|' + cv.width + 'x' + cv.height;
    let c = LAYERS.get(k);
    if (!c) {
      c = offscreen(cv.width, cv.height);
      const g = c.getContext('2d'), s = view.scale * view.dpr; g.setTransform(s, 0, 0, s, 0, 0);
      const saved = ctx; ctx = g;
      try { fn(); } finally { ctx = saved; }
      LAYERS.set(k, c); if (LAYERS.size > 14) LAYERS.delete(LAYERS.keys().next().value);
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); ctx.restore();
  }
  function sprite(key, w, h, fn) {                   // 가상 크기 w×h (중심이 0,0)
    const s = view.scale * view.dpr, k = key + '|' + s.toFixed(3);
    let e = SPR.get(k);
    if (!e) {
      const c = offscreen(w * s, h * s), g = c.getContext('2d'); g.setTransform(s, 0, 0, s, c.width / 2, c.height / 2);
      const saved = ctx; ctx = g;
      try { fn(); } finally { ctx = saved; }
      e = { c, w, h }; SPR.set(k, e); if (SPR.size > 800) SPR.delete(SPR.keys().next().value);
    }
    return e;
  }
  const drawSpr = (e, x, y, sc) => { sc = sc || 1; ctx.drawImage(e.c, x - e.w * sc / 2, y - e.h * sc / 2, e.w * sc, e.h * sc); };
  function drawBackdrop() {
    layer('bg', () => { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eef7f1'); g.addColorStop(1, '#dcebe2'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
  }
  function panelBase(x, y, w, h, o) {                // 그림자 + 바탕 (움직이지 않는 부분)
    o = o || {};
    dropShadow(x, y, w, h, o.r || 16, 12, 3, 'rgba(30,60,40,.12)');
    rr(x, y, w, h, o.r || 16); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
  }
  function panelBorder(x, y, w, h, o) {              // 테두리만 (색이 바뀔 수 있어요)
    o = o || {};
    if (o.border) { rr(x, y, w, h, o.r || 16); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
  }
  function panel(x, y, w, h, o) { panelBase(x, y, w, h, o); panelBorder(x, y, w, h, o); }
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
  const jp = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c % 28 !== 0 ? a : b; };
  const josa = (w, a, b) => w + jp(w, a, b);
  const iyeyo = (w) => jp(w, '이에요', '예요');

  /* =========================================================
     그림 ① 위협 요인 장면 5가지 (가상 크기 160×110)
     thr: 위협이 진행된 정도(0~1), fix: 해결책이 적용된 정도(0~1), pop: 개체 수 비율(0~1)
     ========================================================= */
  const SC_W = 160, SC_H = 110;
  function emo(c, ch, x, y, size, o) {
    o = o || {};
    c.save(); c.translate(x, y); if (o.rot) c.rotate(o.rot); if (o.flip) c.scale(-1, 1); if (o.alpha != null) c.globalAlpha *= o.alpha;
    c.font = size + 'px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
    c.fillText(ch, 0, 0); c.restore();
  }
  const popN = (max, pop) => Math.max(0, Math.round(max * pop));
  function sceneHabitat(c, t, thr, fix, pop) {          // 위에서 내려다본 숲과 도로
    const tt = RM ? 0 : t, d = thr * (1 - fix);
    c.fillStyle = lgrad(c, 0, 0, 160, 110, [[0, '#9bd68d'], [1, '#6fb86a']]); c.fillRect(0, 0, SC_W, SC_H);
    const R = rng(12); c.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 16; i++) { c.beginPath(); c.arc(R() * 160, R() * 110, 6 + R() * 10, 0, TAU); c.fill(); }
    // 나무 (도로 쪽 나무는 위협이 커지면 사라져요)
    const RT = rng(7);
    for (let i = 0; i < 20; i++) {
      const x = 6 + RT() * 148, y = 8 + RT() * 94, r = 7 + RT() * 6, near = Math.abs(x - 80) < 26;
      const a = near ? 1 - Math.min(1, thr * 1.6) : 1;
      if (a <= 0.02) continue;
      c.globalAlpha = a; c.fillStyle = 'rgba(30,70,30,.25)'; c.beginPath(); c.arc(x + 2, y + 3, r, 0, TAU); c.fill();
      c.fillStyle = rgrad(c, x - r * 0.3, y - r * 0.3, 1, x, y, r, [[0, '#4fa955'], [1, '#2a7a3a']]); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.globalAlpha = 1;
    }
    // 도로
    const rw = 28 * Math.min(1, thr * 1.5);
    if (rw > 1) {
      c.fillStyle = '#6b7280'; c.fillRect(80 - rw / 2, 0, rw, SC_H); c.fillStyle = '#4b5563'; c.fillRect(80 - rw / 2 - 1.5, 0, 1.5, SC_H); c.fillRect(80 + rw / 2, 0, 1.5, SC_H);
      c.strokeStyle = '#fde68a'; c.lineWidth = 1.6; c.setLineDash([7, 6]); c.lineDashOffset = RM ? 0 : -tt * 20; c.beginPath(); c.moveTo(80, 0); c.lineTo(80, SC_H); c.stroke(); c.setLineDash([]);
      if (thr > 0.35) for (let k = 0; k < 2; k++) { const cy = ((tt * 38 * (k ? -1 : 1) + k * 57) % 130 + 130) % 130 - 10; c.fillStyle = k ? '#ef4444' : '#3b82f6'; rr2(c, 80 + (k ? 3 : -9), cy, 6, 12, 2); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(80 + (k ? 4 : -8), cy + 2, 4, 3); }
    }
    // 생태 통로 (다리)
    if (fix > 0) {
      const u = EASE.outCubic(Math.min(1, fix * 1.4)), bw = 44 * u;
      c.save(); c.globalAlpha = Math.min(1, fix * 2);
      dropShadowC(c, 80 - 22, 46, 44, 18, 6);
      c.fillStyle = lgrad(c, 0, 46, 0, 64, [[0, '#7bc96f'], [1, '#4f9d4f']]); rr2(c, 80 - bw / 2, 46, bw, 18, 7); c.fill(); c.strokeStyle = '#3d7a3d'; c.lineWidth = 1.4; c.stroke();
      c.fillStyle = '#2f7d3a'; [[-14, 55], [-5, 53], [6, 56], [15, 54]].forEach((p) => { c.beginPath(); c.arc(80 + p[0] * u, p[1], 3.4, 0, TAU); c.fill(); });
      c.restore();
    }
    // 사슴
    const n = popN(6, pop);
    for (let i = 0; i < 6; i++) {
      const left = i < 3, k = i % 3, alive = i < n;
      const bx = left ? 26 + k * 13 : 112 + k * 12, by = 28 + k * 24 + (left ? 0 : 8);
      let x = bx, y = by + (RM ? 0 : Math.sin(tt * 1.4 + i) * 1.2), a = alive ? 1 : 0.14;
      if (fix > 0.35 && alive && (i === 1 || i === 4)) { const u = (tt * 0.28 + i * 0.3) % 1; x = lerp(left ? 60 : 100, left ? 100 : 60, u); y = 55 - Math.sin(u * Math.PI) * 2; }
      emo(c, '🦌', x, y, 15, { alpha: a, flip: x > 80 });
    }
  }
  function dropShadowC(c, x, y, w, h, b) { c.save(); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = b; c.shadowOffsetY = 2; c.fillStyle = '#000'; rr2(c, x, y, w, h, 7); c.fill(); c.restore(); }
  function bullfrog(c, x, y, s, t, ph) {
    c.save(); c.translate(x, y - (RM ? 0 : Math.max(0, Math.sin(t * 3 + ph)) * 3)); c.scale(s, s);
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, 7, 11, 3, 0, 0, TAU); c.fill();
    c.fillStyle = lgrad(c, 0, -8, 0, 8, [[0, '#8f9a3a'], [1, '#5f6a22']]); c.beginPath(); c.ellipse(0, 1, 11, 8, 0, 0, TAU); c.fill();
    c.strokeStyle = '#475016'; c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(60,45,15,.5)'; [[-5, 0], [2, -3], [5, 3], [-2, 4]].forEach((p) => { c.beginPath(); c.arc(p[0], p[1], 1.9, 0, TAU); c.fill(); });
    c.fillStyle = '#d9e08a'; [-5, 5].forEach((ex) => { c.beginPath(); c.arc(ex, -7, 3.4, 0, TAU); c.fill(); c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(ex, -7, 1.5, 0, TAU); c.fill(); c.fillStyle = '#d9e08a'; });
    c.strokeStyle = '#3d4410'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, 3); c.quadraticCurveTo(0, 8, 8, 3); c.stroke();
    c.restore();
  }
  function sceneInvasive(c, t, thr, fix, pop) {          // 연못에 퍼진 외래종
    const tt = RM ? 0 : t, d = thr * (1 - fix);
    c.fillStyle = lgrad(c, 0, 0, 0, 44, [[0, '#d3ecf8'], [1, '#eef8e8']]); c.fillRect(0, 0, SC_W, SC_H);
    c.fillStyle = '#8fcf86'; c.beginPath(); c.moveTo(0, 40); c.quadraticCurveTo(40, 30, 80, 40); c.quadraticCurveTo(120, 48, 160, 36); c.lineTo(160, 52); c.lineTo(0, 52); c.fill();
    c.fillStyle = lgrad(c, 0, 44, 0, 110, [[0, '#7cc5de'], [1, '#3f93b8']]); c.fillRect(0, 44, SC_W, 66);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.2; for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 0; x <= 160; x += 6) { const y = 56 + k * 18 + Math.sin(x * 0.12 + tt * 1.4 + k) * 1.4; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
    [[28, 70, 11], [74, 86, 13], [128, 68, 11], [110, 98, 10]].forEach((p) => { c.fillStyle = '#4faa57'; c.beginPath(); c.ellipse(p[0], p[1], p[2], p[2] * 0.42, 0, 0.2, TAU - 0.2); c.lineTo(p[0], p[1]); c.fill(); });
    // 갈대
    c.strokeStyle = '#5a9a4a'; c.lineWidth = 1.6; [[8, 52], [14, 50], [150, 50], [145, 53]].forEach((p, i) => { c.beginPath(); c.moveTo(p[0], 72); c.quadraticCurveTo(p[0] + Math.sin(tt + i) * 1.5, 60, p[0] + 1, p[1] - 4); c.stroke(); });
    // 토종 개구리
    const n = popN(6, pop), pos = [[30, 66], [56, 80], [88, 68], [112, 84], [136, 74], [70, 98]];
    pos.forEach((p, i) => { emo(c, '🐸', p[0], p[1] + (RM ? 0 : Math.sin(tt * 1.8 + i) * 1.4), 14, { alpha: i < n ? 1 : 0.13 }); });
    // 외래종 (황소개구리)
    const m = Math.ceil(3 * d - 0.001), ipos = [[44, 94], [100, 74], [124, 96]];
    for (let i = 0; i < 3; i++) {
      const a = clamp(d * 3 - i, 0, 1); if (a <= 0.02) continue;
      c.save(); c.globalAlpha = a; bullfrog(c, ipos[i][0], ipos[i][1], 1.25, tt, i);
      c.restore();
    }
    void m;
    // 관리 (덫과 그물)
    if (fix > 0) {
      const u = fix;
      c.save(); c.globalAlpha = Math.min(1, u * 3) * (1 - clamp((u - 0.75) * 4, 0, 1));
      ipos.forEach((p, i) => { c.strokeStyle = '#475569'; c.lineWidth = 1.4; c.strokeRect(p[0] - 11, p[1] - 12 + (1 - EASE.outBounce(clamp(u * 2 - i * 0.2, 0, 1))) * -20, 22, 20); c.beginPath(); c.moveTo(p[0] - 11, p[1] - 12 + (1 - EASE.outBounce(clamp(u * 2 - i * 0.2, 0, 1))) * -20 + 7); c.lineTo(p[0] + 11, p[1] - 12 + (1 - EASE.outBounce(clamp(u * 2 - i * 0.2, 0, 1))) * -20 + 7); c.stroke(); });
      c.restore();
      if (u > 0.55) { c.globalAlpha = clamp((u - 0.55) * 2.5, 0, 1); emo(c, '✅', 80, 22, 18); c.globalAlpha = 1; }
    }
  }
  function sceneOverhunt(c, t, thr, fix, pop) {          // 그물로 물고기를 너무 많이 잡아요
    const tt = RM ? 0 : t;
    c.fillStyle = lgrad(c, 0, 0, 0, 40, [[0, '#cde9f7'], [1, '#e8f5fb']]); c.fillRect(0, 0, SC_W, SC_H);
    c.fillStyle = lgrad(c, 0, 34, 0, 110, [[0, '#4aa8d8'], [1, '#1f6fa8']]); c.fillRect(0, 34, SC_W, 76);
    c.fillStyle = 'rgba(255,255,255,.14)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(20 + k * 50, 34); c.lineTo(34 + k * 50, 34); c.lineTo(60 + k * 50, 110); c.lineTo(34 + k * 50, 110); c.fill(); }
    // 보호 구역
    const prot = EASE.outCubic(fix);
    if (prot > 0) {
      c.save(); c.globalAlpha = prot; c.strokeStyle = '#fde047'; c.lineWidth = 2; c.setLineDash([6, 5]); c.lineDashOffset = RM ? 0 : -tt * 14; c.beginPath(); c.ellipse(80, 76, 66, 28, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, bx = 80 + Math.cos(a) * 66, by = 76 + Math.sin(a) * 28 + (RM ? 0 : Math.sin(tt * 2 + k) * 1); c.fillStyle = k % 2 ? '#ef4444' : '#fff'; c.beginPath(); c.arc(bx, by, 3.2, 0, TAU); c.fill(); c.strokeStyle = '#334155'; c.lineWidth = 0.8; c.stroke(); }
      pill('보호 구역', 80, 56, { size: 14, bg: '#16a34a', pad: 8, h: 20 });
      c.restore();
    }
    // 물고기
    const n = popN(8, pop), R = rng(5);
    for (let i = 0; i < 8; i++) {
      const bx = 18 + R() * 124, by = 48 + R() * 56, ph = R() * 6;
      const x = bx + (RM ? 0 : Math.sin(tt * 0.8 + ph) * 8), y = by + (RM ? 0 : Math.sin(tt * 1.3 + ph) * 3);
      emo(c, '🐟', x, y, 14, { alpha: i < n ? 1 : 0.1, flip: Math.cos(tt * 0.8 + ph) > 0 });
    }
    // 배와 그물 (보호 구역이 생기면 멀리 떠나요)
    const away = EASE.inOutCubic(clamp(fix * 1.3, 0, 1)), bx = lerp(24, 112, Math.min(1, thr * 1.1)) + away * 70;
    c.save(); c.translate(bx, 34 + (RM ? 0 : Math.sin(tt * 1.6) * 1.2));
    c.fillStyle = '#f8fafc'; c.beginPath(); c.moveTo(-22, -4); c.lineTo(22, -4); c.lineTo(15, 8); c.lineTo(-17, 8); c.closePath(); c.fill(); c.strokeStyle = '#94a3b8'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#ef4444'; c.fillRect(-20, -1, 40, 3); c.fillStyle = '#e2e8f0'; rr2(c, -8, -14, 16, 10, 2); c.fill(); c.strokeStyle = '#94a3b8'; c.stroke();
    const netA = (1 - away) * Math.min(1, thr * 3);
    if (netA > 0.02) {
      c.globalAlpha = netA; c.strokeStyle = '#d6c28a'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-14, 8); c.lineTo(-30, 52); c.lineTo(8, 56); c.lineTo(12, 8); c.stroke();
      for (let k = 1; k < 6; k++) { const u = k / 6; c.beginPath(); c.moveTo(lerp(-14, 12, u), 8); c.lineTo(lerp(-30, 8, u), lerp(52, 56, u)); c.stroke(); }
      for (let k = 1; k < 5; k++) { const v = k / 5; c.beginPath(); c.moveTo(lerp(-14, -30, v), 8 + v * 44); c.lineTo(lerp(12, 8, v), 8 + v * 48); c.stroke(); }
      const caught = Math.round((1 - pop) * 6 * Math.min(1, thr * 1.2));
      for (let k = 0; k < Math.min(6, caught); k++) emo(c, '🐟', -22 + (k % 3) * 14, 28 + Math.floor(k / 3) * 12 + (RM ? 0 : Math.sin(tt * 4 + k) * 1.2), 10, { alpha: 0.9 });
      c.globalAlpha = 1;
    }
    c.restore();
  }
  function scenePollution(c, t, thr, fix, pop) {          // 공장 폐수가 강으로
    const tt = RM ? 0 : t, d = thr * (1 - fix);
    c.fillStyle = lgrad(c, 0, 0, 0, 50, [[0, lerpColor('#cde9f7', '#d9d4c8', d * 0.7)], [1, '#eef5e8']]); c.fillRect(0, 0, SC_W, SC_H);
    c.fillStyle = '#9ad08f'; c.fillRect(0, 50, SC_W, 14);
    c.fillStyle = lgrad(c, 0, 60, 0, 110, [[0, lerpColor('#6fc0e0', '#8a8a4a', d * 0.8)], [1, lerpColor('#3b8fb8', '#6a5a2a', d * 0.8)]]); c.fillRect(0, 62, SC_W, 48);
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.2; for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 0; x <= 160; x += 6) { const y = 72 + k * 14 + Math.sin(x * 0.12 + tt * 1.3 + k) * 1.4; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
    // 공장
    c.fillStyle = '#94a3b8'; rr2(c, 22, 28, 40, 34, 3); c.fill(); c.fillStyle = '#64748b'; c.fillRect(22, 28, 40, 6);
    c.fillStyle = '#e2e8f0'; for (let k = 0; k < 3; k++) c.fillRect(28 + k * 12, 40, 7, 8);
    c.fillStyle = '#78859a'; c.fillRect(52, 10, 8, 20);
    // 연기
    for (let k = 0; k < 5; k++) { const u = ((tt * 0.35 + k * 0.2) % 1), a = (1 - u) * (0.2 + 0.55 * thr * (1 - fix * 0.7)); c.fillStyle = 'rgba(' + (90 + 40 * (1 - d)) + ',' + (95 + 40 * (1 - d)) + ',' + (105 + 40 * (1 - d)) + ',' + a.toFixed(2) + ')'; c.beginPath(); c.arc(56 + u * 20 + Math.sin(u * 6 + k) * 3, 8 - u * 6, 4 + u * 8, 0, TAU); c.fill(); }
    // 폐수관과 정화 장치
    c.fillStyle = '#6b7280'; c.fillRect(60, 56, 22, 6);
    if (fix > 0) { const a = Math.min(1, fix * 2); c.globalAlpha = a; dropShadowC(c, 64, 46, 24, 20, 4); c.fillStyle = '#38bdf8'; rr2(c, 64, 46, 24, 20, 4); c.fill(); c.strokeStyle = '#0369a1'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { c.fillRect(69 + k * 6, 50, 3, 12); } c.globalAlpha = 1; }
    // 폐수
    if (thr > 0.02) {
      const spread = 20 + 90 * thr;
      const g = c.createLinearGradient(80, 0, 80 + spread, 0); g.addColorStop(0, 'rgba(110,84,36,' + (0.75 * d).toFixed(2) + ')'); g.addColorStop(1, 'rgba(110,84,36,0)');
      c.fillStyle = g; c.fillRect(80, 62, spread, 48);
      for (let k = 0; k < 6; k++) { const u = ((tt * 0.4 + k * 0.17) % 1); c.fillStyle = 'rgba(96,72,28,' + (0.7 * d * (1 - u)).toFixed(2) + ')'; c.beginPath(); c.arc(80 + u * spread * 0.9, 64 + Math.sin(u * 9 + k) * 4 + u * 12, 3 + (1 - u) * 2, 0, TAU); c.fill(); }
    }
    // 물고기
    const n = popN(6, pop), alive = [[106, 78], [126, 90], [94, 96], [138, 76], [114, 102], [82, 86]];
    alive.forEach((p, i) => { const x = p[0] + (RM ? 0 : Math.sin(tt * 0.9 + i) * 5), y = p[1] + (RM ? 0 : Math.sin(tt * 1.4 + i) * 2); if (i < n) emo(c, '🐟', x, y, 14, { flip: Math.cos(tt * 0.9 + i) > 0 }); });
    const dead = Math.min(4, Math.round(5 * (1 - pop) * Math.min(1, thr * 2)));
    for (let k = 0; k < dead; k++) { const x = [102, 120, 136, 112][k], y = 66 + (RM ? 0 : Math.sin(tt * 1.2 + k) * 1) ; emo(c, '🐟', x, y, 13, { rot: Math.PI, alpha: 0.85 }); }
  }
  function sceneClimate(c, t, thr, fix, pop) {            // 기온이 오르는 산
    const tt = RM ? 0 : t, d = thr * (1 - fix * 0.35);
    c.fillStyle = lgrad(c, 0, 0, 0, 110, [[0, lerpColor('#bfe3f7', '#ffd9a8', thr)], [1, lerpColor('#eaf6ee', '#ffe9c8', thr)]]); c.fillRect(0, 0, SC_W, SC_H);
    // 해
    const sr = 12 + thr * 4;
    c.save(); c.translate(34, 26); c.fillStyle = rgba('#fde047', 0.28); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + (RM ? 0 : tt * 0.3); c.beginPath(); c.moveTo(Math.cos(a - 0.12) * (sr + 3), Math.sin(a - 0.12) * (sr + 3)); c.lineTo(Math.cos(a) * (sr + 8 + thr * 8), Math.sin(a) * (sr + 8 + thr * 8)); c.lineTo(Math.cos(a + 0.12) * (sr + 3), Math.sin(a + 0.12) * (sr + 3)); c.fill(); }
    c.fillStyle = rgrad(c, -3, -3, 1, 0, 0, sr, [[0, '#fff7c2'], [1, lerpColor('#facc15', '#f97316', thr)]]); c.beginPath(); c.arc(0, 0, sr, 0, TAU); c.fill(); c.restore();
    // 산
    c.fillStyle = lgrad(c, 0, 30, 0, 110, [[0, '#9ca3af'], [1, '#6b7280']]); c.beginPath(); c.moveTo(20, 110); c.lineTo(78, 24); c.lineTo(104, 54); c.lineTo(122, 38); c.lineTo(160, 110); c.closePath(); c.fill();
    c.fillStyle = '#7c8a73'; c.beginPath(); c.moveTo(0, 110); c.lineTo(40, 66); c.lineTo(70, 86); c.lineTo(100, 110); c.closePath(); c.fill();
    const sn = 1 - thr * 0.85 * (1 - fix * 0.3);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(78, 24); c.lineTo(78 - 17 * sn, 24 + 28 * sn); c.lineTo(78 - 5 * sn, 24 + 22 * sn); c.lineTo(78 + 2, 24 + 30 * sn); c.lineTo(78 + 9 * sn, 24 + 21 * sn); c.lineTo(78 + 16 * sn, 24 + 27 * sn); c.closePath(); c.fill();
    // 구상나무
    const n = popN(6, pop), tp = [[58, 52], [70, 44], [86, 40], [96, 52], [64, 66], [90, 64]];
    tp.forEach((p, i) => {
      const alive = i < n, x = p[0], y = p[1];
      if (alive) { c.fillStyle = '#2f7a43'; c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x - 6, y); c.lineTo(x + 6, y); c.fill(); c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x - 7.5, y + 5); c.lineTo(x + 7.5, y + 5); c.fill(); c.fillStyle = '#6b4a2b'; c.fillRect(x - 1, y + 5, 2, 4); }
      else { c.strokeStyle = 'rgba(110,80,50,.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x, y - 8); c.moveTo(x, y - 2); c.lineTo(x - 4, y - 7); c.moveTo(x, y + 2); c.lineTo(x + 4, y - 3); c.stroke(); }
    });
    // 새싹 (복원 사업)
    if (fix > 0) { const m = Math.round(6 * fix); [[56, 80], [66, 87], [80, 80], [92, 87], [104, 78], [114, 85]].forEach((p, i) => { if (i < m) { const u = EASE.outBack(clamp(fix * 4 - i * 0.4, 0, 1)); c.save(); c.translate(p[0], p[1]); c.scale(u, u); c.strokeStyle = '#3f9d4a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -2); c.stroke(); c.fillStyle = '#6ac36b'; c.beginPath(); c.ellipse(-3, -3, 3.4, 1.8, -0.5, 0, TAU); c.ellipse(3, -3, 3.4, 1.8, 0.5, 0, TAU); c.fill(); c.restore(); } }); }
    // 종자 은행
    if (fix > 0) { c.save(); c.globalAlpha = Math.min(1, fix * 3); dropShadowC(c, 20, 76, 26, 24, 4); c.fillStyle = '#f1f5f9'; rr2(c, 20, 78, 26, 22, 3); c.fill(); c.strokeStyle = '#64748b'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = '#16a34a'; c.beginPath(); c.moveTo(18, 79); c.lineTo(33, 68); c.lineTo(48, 79); c.closePath(); c.fill(); emo(c, '🌱', 33, 90, 12); c.restore(); }
    // 온도계
    c.fillStyle = '#fff'; rr2(c, 128, 16, 9, 56, 4.5); c.fill(); c.strokeStyle = '#94a3b8'; c.lineWidth = 1; c.stroke();
    const lv = lerp(0.25, 0.92, d);
    c.fillStyle = '#ef4444'; rr2(c, 130, 16 + 52 * (1 - lv), 5, 52 * lv + 4, 2.5); c.fill(); c.beginPath(); c.arc(132.5, 76, 6, 0, TAU); c.fill(); c.strokeStyle = '#94a3b8'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(130.5, 74.5, 1.8, 0, TAU); c.fill();
  }
  const SCENES = { habitat: sceneHabitat, invasive: sceneInvasive, overhunt: sceneOverhunt, pollution: scenePollution, climate: sceneClimate };

  // 풀(생산자)·메뚜기: 먹이 그물 그림용
  function drawHopperArt(c, x, y, s, t) {
    const hop = RM ? 0 : Math.max(0, Math.sin(t * 1.4)) * 3;
    c.save(); c.translate(x, y - hop); c.scale(s, s);
    c.strokeStyle = '#4a7a2a'; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-3, 3); c.lineTo(-12, -4); c.lineTo(-18, 9); c.moveTo(2, 3); c.lineTo(-6, -2); c.lineTo(-9, 10); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(6, 5); c.lineTo(10, 12); c.moveTo(10, 3); c.lineTo(15, 10); c.stroke();
    c.fillStyle = lgrad(c, 0, -8, 0, 9, [[0, '#b2e060'], [1, '#5f9f2e']]); c.beginPath(); c.ellipse(-2, 0, 14, 6, -0.05, 0, TAU); c.fill();
    c.fillStyle = '#7bbd3d'; c.beginPath(); c.moveTo(-15, -2); c.lineTo(7, -6); c.lineTo(-6, 3); c.closePath(); c.fill();
    c.fillStyle = '#9ad84a'; c.beginPath(); c.ellipse(14, -2, 6.2, 5.2, 0.1, 0, TAU); c.fill();
    c.fillStyle = '#1b2a0f'; c.beginPath(); c.arc(16, -4, 1.6, 0, TAU); c.fill();
    c.strokeStyle = '#4a7a2a'; c.lineWidth = 1; c.beginPath(); c.moveTo(17, -6); c.quadraticCurveTo(23, -11, 28, -9); c.stroke();
    c.restore();
  }

  /* =========================================================
     자료
     ========================================================= */
  const SPC = {
    grass:  { name: '풀',     emoji: '🌿', tier: 0 },
    tree:   { name: '나무',   emoji: '🌳', tier: 0 },
    hopper: { name: '메뚜기', emoji: null, tier: 1 },
    rabbit: { name: '토끼',   emoji: '🐇', tier: 1 },
    mouse:  { name: '쥐',     emoji: '🐁', tier: 1 },
    sparrow:{ name: '참새',   emoji: '🐦', tier: 2 },
    frog:   { name: '개구리', emoji: '🐸', tier: 2 },
    snake:  { name: '뱀',     emoji: '🐍', tier: 3 },
    fox:    { name: '여우',   emoji: '🦊', tier: 3 },
    hawk:   { name: '매',     emoji: '🦅', tier: 4 },
  };
  const TIER_BG = ['#dcf6ea', '#fdecd0', '#fde7d2', '#fde1ec', '#ece5fd'];
  const ECOS = [
    {
      key: 'simple', title: '🌿 단순한 생태계', sub: '종 4가지', sp: ['grass', 'hopper', 'frog', 'snake'],
      diet: { hopper: { grass: 1 }, frog: { hopper: 1 }, snake: { frog: 1 } },
      pos: { grass: [0.13, 0.7], hopper: [0.38, 0.34], frog: [0.62, 0.7], snake: [0.87, 0.34] }, posT: { grass: [0.13, 0.62], hopper: [0.38, 0.3], frog: [0.62, 0.62], snake: [0.87, 0.3] }, bg: ['#e8f6e2', '#d3ecc8'],
    },
    {
      key: 'complex', title: '🌳 복잡한 생태계', sub: '종 10가지', sp: ['grass', 'tree', 'hopper', 'rabbit', 'mouse', 'sparrow', 'frog', 'snake', 'fox', 'hawk'],
      diet: {
        hopper: { grass: 0.6, tree: 0.4 }, rabbit: { grass: 0.8, tree: 0.2 }, mouse: { grass: 0.4, tree: 0.4, hopper: 0.2 }, sparrow: { hopper: 0.3, grass: 0.35, tree: 0.35 },
        frog: { hopper: 1 }, snake: { frog: 0.25, mouse: 0.4, sparrow: 0.15, rabbit: 0.2 }, fox: { rabbit: 0.45, mouse: 0.3, sparrow: 0.25 }, hawk: { snake: 0.25, mouse: 0.4, sparrow: 0.35 },
      },
      pos: { grass: [0.411, 0.82], tree: [0.722, 0.82], hopper: [0.256, 0.641], rabbit: [0.901, 0.641], mouse: [0.775, 0.462], sparrow: [0.382, 0.462], frog: [0.093, 0.462], snake: [0.255, 0.282], fox: [0.912, 0.282], hawk: [0.509, 0.103] },
      posT: { grass: [0.414, 0.819], tree: [0.93, 0.819], hopper: [0.216, 0.645], rabbit: [0.825, 0.645], mouse: [0.52, 0.645], sparrow: [0.408, 0.472], frog: [0.081, 0.472], snake: [0.522, 0.298], fox: [0.844, 0.298], hawk: [0.39, 0.125] }, bg: ['#e4f4dc', '#cfe8c2'],
    },
  ];
  // 먹이 그물 계산: 먹을 것이 줄면 따라서 줄고, 잡아먹는 종이 줄면 늘어요 (상대 개체 수, 처음 = 1)
  const WEB_K = { kc: 0.55, kp: 1.2, cap: 1.4, rate: 1.1 };
  ECOS.forEach((E) => {
    E.n = E.sp.length; E.idx = {}; E.sp.forEach((k, i) => { E.idx[k] = i; });
    E.diets = E.sp.map((k) => { const e = Object.entries(E.diet[k] || {}), tot = e.reduce((a, p) => a + p[1], 0); return e.map(([p, w]) => [E.idx[p], w / tot]); });
    E.P0 = new Array(E.n).fill(0); E.diets.forEach((d) => d.forEach(([j, w]) => { E.P0[j] += w; }));
    E.links = []; E.diets.forEach((d, p) => d.forEach(([j, w]) => E.links.push({ from: j, to: p, w })));
    E.x = new Array(E.n).fill(1); E.vis = new Array(E.n).fill(1); E.rem = new Array(E.n).fill(false); E.remT = new Array(E.n).fill(0); E.shake = new Array(E.n).fill(-9); E.pop = new Array(E.n).fill(-9);
    E.since = 0; E.ph = E.sp.map((k, i) => i * 1.37);
  });
  function webStep(E, dt) {
    const Pp = new Array(E.n).fill(0);
    E.diets.forEach((d, p) => d.forEach(([j, w]) => { Pp[j] += w * E.x[p]; }));
    for (let i = 0; i < E.n; i++) {
      if (E.rem[i]) { E.x[i] = 0; continue; }
      const d = E.diets[i], S = d.length ? d.reduce((a, p) => a + p[1] * E.x[p[0]], 0) : 1, k = d.length ? WEB_K.kc : WEB_K.kp;
      const target = clamp(S * (1 + k * (E.P0[i] - Pp[i])), 0, WEB_K.cap);
      E.x[i] += (target - E.x[i]) * Math.min(1, WEB_K.rate * dt);
    }
  }
  function webStats(E) {
    let aff = 0, gone = 0, worst = -1, best = -1, wv = 1, bv = 1;
    const any = E.rem.some(Boolean);
    E.sp.forEach((k, i) => {
      if (E.rem[i]) return;
      const v = E.x[i]; if (Math.abs(v - 1) > 0.2) aff++; if (v < 0.08) gone++;
      if (v < wv) { wv = v; worst = i; } if (v > bv) { bv = v; best = i; }
    });
    return { aff, gone, worst, best, wv, bv, any, total: E.n - E.rem.filter(Boolean).length };
  }
  const THREATS = [
    { key: 'habitat', name: '서식지 파괴', color: '#16a34a', soft: '#dcf6ea', story: '숲 한가운데에 큰 도로가 생겨 숲이 둘로 갈라졌어요. 사슴이 오갈 길이 막혔어요.', def: '숲·갯벌·습지처럼 생물이 사는 곳이 개발로 없어지거나 갈라지는 것', fix: '생태 통로', fixDesc: '도로 때문에 갈라진 숲을 이어 줘요', fixHow: '도로 위에 동물이 안전하게 건널 수 있는 <b>생태 통로</b>를 만들어 갈라진 숲을 이어 주었어요.' },
    { key: 'invasive', name: '외래종 유입', color: '#e0457b', soft: '#fde1ec', story: '다른 나라에서 온 황소개구리가 연못에 퍼지면서 토종 개구리가 줄었어요.', def: '원래 살지 않던 다른 지역의 생물이 들어와 토종 생물을 위협하는 것', fix: '외래종 관리', fixDesc: '더 퍼지지 않게 막고 줄여요', fixHow: '외래종이 더 퍼지지 않게 막고 이미 퍼진 것은 잡아 없애는 <b>외래종 관리</b>를 했어요.' },
    { key: 'overhunt', name: '남획', color: '#2f7fe8', soft: '#dfeafd', story: '그물로 물고기를 너무 많이 잡아서 바다의 물고기가 크게 줄었어요.', def: '생물을 필요 이상으로 너무 많이 잡는 것', fix: '보호 구역 지정', fixDesc: '잡는 것을 제한해 지켜요', fixHow: '물고기가 많은 곳을 <b>보호 구역</b>으로 정하고 그물로 잡는 것을 막았어요.' },
    { key: 'pollution', name: '환경 오염', color: '#8b5cf6', soft: '#ece5fd', story: '공장 폐수가 강으로 흘러들어 물이 더러워지고 물고기가 죽어 가요.', def: '폐수·쓰레기·오염 물질 때문에 생물이 사는 환경이 나빠지는 것', fix: '오염 줄이기', fixDesc: '폐수를 정화하고 쓰레기를 줄여요', fixHow: '폐수를 정화하는 장치를 달아 <b>오염을 줄였더니</b> 물이 맑아졌어요.' },
    { key: 'climate', name: '기후변화', color: '#e8890c', soft: '#fdecd0', story: '지구가 따뜻해져 높은 산의 구상나무가 점점 말라 죽어 가요.', def: '지구의 평균 기온이 높아져 생물이 살기 어려워지는 것', fix: '종자 은행·복원 사업', fixShort: '종자 은행·복원', fixDesc: '씨앗을 보관하고 다시 심어요', fixHow: '씨앗을 보관하는 <b>종자 은행</b>을 만들고 사라진 곳에 다시 심는 <b>복원 사업</b>을 했어요.' },
  ];
  const ACTS = [
    { id: 0, side: 0, icon: '🥤', text: '일회용품 사용 줄이기', why: '쓰레기와 오염을 줄이는 개인의 실천이에요.' },
    { id: 1, side: 0, icon: '♻️', text: '쓰레기 분리배출하기', why: '쓰레기가 자연으로 흘러가지 않게 하는 개인의 실천이에요.' },
    { id: 2, side: 0, icon: '🐢', text: '키우던 외래 동물을 함부로 버리지 않기', why: '외래종이 퍼지지 않게 하는 개인의 실천이에요.' },
    { id: 3, side: 0, icon: '🚌', text: '가까운 거리는 걷거나 대중교통 타기', why: '온실가스를 줄여 기후변화를 늦추는 개인의 실천이에요.' },
    { id: 4, side: 1, icon: '📜', text: '멸종 위기종을 보호하는 법 만들기', why: '법과 제도는 사회가 함께 하는 실천이에요.' },
    { id: 5, side: 1, icon: '🤝', text: '나라끼리 생물다양성 협약 맺기', why: '국제 협약은 여러 나라가 함께 하는 사회적 실천이에요.' },
    { id: 6, side: 1, icon: '🏞️', text: '보호 구역을 지정하고 관리하기', why: '보호 구역 지정은 나라와 지역이 하는 사회적 실천이에요.' },
    { id: 7, side: 1, icon: '🌉', text: '생태 통로를 만들고 훼손된 곳 복원하기', why: '큰 규모의 복원 사업은 사회가 함께 하는 실천이에요.' },
  ];
  const PLEDGES = [
    { icon: '🥤', text: '일회용 컵 대신 텀블러 쓰기' },
    { icon: '♻️', text: '쓰레기 분리배출 잘하기' },
    { icon: '🐢', text: '외래 생물을 함부로 버리지 않기' },
    { icon: '🚌', text: '가까운 곳은 걷거나 대중교통 타기' },
    { icon: '🔭', text: '우리 동네 생물을 관찰하고 소개하기' },
  ];

  /* =========================================================
     상태
     ========================================================= */
  const VIEW_ORDER = ['web', 'threat', 'fix', 'act'];
  const S = { scene: 'web', prevKey: null, sceneT0: -9, snapOK: false, drag: null };
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
        web: {
          eco: [0, 1].map((i) => ({ net: { x: 14 + i * 392, y: 50, w: 380, h: 300 }, bars: { x: 14 + i * 392, y: 358, w: 380, h: 120 }, stats: { x: 14 + i * 392, y: 484, w: 380, h: 40 } })),
          cap: { x: 14, y: 530, w: 772, h: 102 }, hint: { x: 400, y: 28, maxW: 700 },
        },
        panels: {
          p: [0, 1, 2, 3, 4].map((i) => ({ x: 14 + i * 156, y: 50, w: 148, h: 338 })), vertical: true,
          tray: [0, 1, 2, 3, 4].map((i) => ({ x: 14 + i * 156, y: 414, w: 148, h: 58 })),
          cap: { x: 14, y: 486, w: 772, h: 146 }, hint: { x: 400, y: 28, maxW: 700 },
        },
        act: {
          box: [{ x: 14, y: 50, w: 380, h: 244 }, { x: 406, y: 50, w: 380, h: 244 }],
          tray: (i) => ({ x: 14 + (i % 4) * 194, y: 330 + Math.floor(i / 4) * 72, w: 186, h: 64 }), trayLabelY: 320,
          cap: { x: 14, y: 482, w: 772, h: 150 }, hint: { x: 400, y: 28, maxW: 700 },
          pl: { list: { x: 14, y: 50, w: 392, h: 400 }, card: { x: 418, y: 50, w: 368, h: 400 }, cap: { x: 14, y: 466, w: 772, h: 166 } },
        },
      };
    }
    return {
      web: {
        eco: [
          { net: { x: 8, y: 44, w: 444, h: 150 }, bars: { x: 8, y: 198, w: 444, h: 100 }, stats: { x: 8, y: 302, w: 444, h: 32 } },
          { net: { x: 8, y: 340, w: 444, h: 232 }, bars: { x: 8, y: 576, w: 444, h: 110 }, stats: { x: 8, y: 690, w: 444, h: 32 } },
        ],
        cap: { x: 8, y: 728, w: 444, h: 124 }, hint: { x: 230, y: 24, maxW: 430 },
      },
      panels: {
        p: [0, 1, 2, 3, 4].map((i) => ({ x: 8, y: 44 + i * 108, w: 444, h: 104 })), vertical: false,
        tray: [0, 1, 2, 3, 4].map((i) => ({ x: 8 + (i % 2) * 226, y: 604 + Math.floor(i / 2) * 48, w: 218, h: 44 })),
        cap: { x: 8, y: 750, w: 444, h: 102 }, hint: { x: 230, y: 24, maxW: 430 },
      },
      act: {
        box: [{ x: 8, y: 44, w: 444, h: 216 }, { x: 8, y: 268, w: 444, h: 216 }],
        tray: (i) => ({ x: 8 + (i % 2) * 226, y: 510 + Math.floor(i / 2) * 58, w: 218, h: 52 }), trayLabelY: 502,
        cap: { x: 8, y: 746, w: 444, h: 106 }, hint: { x: 230, y: 24, maxW: 430 },
        pl: { list: { x: 8, y: 44, w: 444, h: 340 }, card: { x: 8, y: 392, w: 444, h: 318 }, cap: { x: 8, y: 718, w: 444, h: 134 } },
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

  /* =========================================================
     ① 먹이 그물 놀이 (단순한 생태계 vs 복잡한 생태계)
     ========================================================= */
  const WB = { cmpT: 0, maxAff: 0, tapped: 0, hov: null, done: false };
  const stateCol = (v) => (v < 0.08 ? '#9ca3af' : v < 0.5 ? '#ef4444' : v < 0.85 ? '#f59e0b' : v <= 1.15 ? '#22c55e' : '#0ea5e9');
  function nodeAt(ei, i) {
    const L = LAY.web.eco[ei].net, E = ECOS[ei], p = (TALL && E.posT ? E.posT : E.pos)[E.sp[i]];
    return { x: L.x + p[0] * L.w, y: L.y + p[1] * L.h, r: ei === 0 ? (TALL ? 25 : 31) : (TALL ? 18.5 : 21) };
  }
  function webReset(instant) {
    ECOS.forEach((E) => {
      E.rem.fill(false); E.x.fill(1); E.remT.fill(0); E.since = 0; E.shake.fill(-9);
      if (instant) E.vis.fill(1);
    });
    WB.cmpT = 0; WB.maxAff = 0; WB.done = false;
  }
  function webToggle(ei, i) {
    const E = ECOS[ei], N = nodeAt(ei, i);
    if (E.rem[i]) {
      E.rem[i] = false; E.x[i] = 0.12; E.pop[i] = now(); Sound.tone(660, 0.12, 'triangle', 0.07); Sound.tone(880, 0.14, 'triangle', 0.06, 0.09);
      burst(N.x, N.y, ['#86efac', '#fde047', '#ffffff'], 12, { speed: 110, life: 0.7, gravity: 40 });
    } else {
      E.rem[i] = true; E.x[i] = 0; E.remT[i] = 0; E.shake[i] = now(); Sound.fail(); WB.tapped++;
      burst(N.x, N.y, ['#cbd5e1', '#94a3b8', '#ffffff'], 14, { speed: 120, life: 0.8, gravity: 90, size: 3.4, shape: 'smoke' });
      E.links.forEach((l) => {                       // 연결선이 툭 끊기는 느낌
        if (l.from !== i && l.to !== i) return;
        const A = nodeAt(ei, l.from), B = nodeAt(ei, l.to);
        burst((A.x + B.x) / 2, (A.y + B.y) / 2, ['#94a3b8', '#e2e8f0', '#ffffff'], 4, { speed: 55, life: 0.45, gravity: 30, size: 2.4 });
      });
    }
    E.since = 0;
  }
  function webUpdate(dt) {
    ECOS.forEach((E) => {
      webStep(E, dt); E.since += dt;
      for (let i = 0; i < E.n; i++) { E.vis[i] = SciSim.approach(E.vis[i], E.x[i], dt, 7); if (E.rem[i]) E.remT[i] += dt; }
    });
    const A = ECOS[0], B = ECOS[1];
    let both = false;
    A.sp.forEach((k, i) => { const j = B.idx[k]; if (A.rem[i] && j != null && B.rem[j]) both = true; });
    if (both) WB.cmpT += dt;
    const st = webStats(B);
    if (st.any && B.since > 3) WB.maxAff = Math.max(WB.maxAff, st.aff);
  }
  function drawNode(E, ei, i, t) {
    const N = nodeAt(ei, i), k = E.sp[i], sp = SPC[k], v = E.vis[i], rem = E.rem[i];
    const bob = RM ? 0 : Math.sin(t * 1.4 + E.ph[i]) * 1.6, sh = now() - E.shake[i];
    const popA = E.pop[i] > 0 ? Math.max(0, 1 - (now() - E.pop[i]) / 0.5) : 0;
    let x = N.x, y = N.y + bob, r = N.r;
    if (sh < 0.5) x += Math.sin(sh * 50) * 4 * (1 - sh / 0.5);
    const sc = rem ? 0.92 : 0.8 + 0.22 * clamp(v, 0, 1.3) + popA * 0.15;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    const a = rem ? 0.4 : 1;
    ctx.globalAlpha = a;
    dropShadow(-r, -r, r * 2, r * 2, r, 9, 3, 'rgba(20,40,30,.28)');
    ctx.fillStyle = rem ? '#e5e7eb' : rgrad(ctx, -r * 0.3, -r * 0.35, 2, 0, 0, r, [[0, '#ffffff'], [1, TIER_BG[sp.tier]]]); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    // 개체 수 고리
    const col = stateCol(v), frac = rem ? 0 : clamp(v, 0, 1);
    ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(148,163,184,.3)'; ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, TAU); ctx.stroke();
    if (frac > 0.01) { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, 0, r + 3, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke(); }
    if (v > 1.12 && !rem) { ctx.strokeStyle = rgba(col, 0.35 + 0.25 * Math.sin(t * 5)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 8 + Math.sin(t * 5) * 1.5, 0, TAU); ctx.stroke(); }
    if (sp.emoji) { const sz = Math.round(r * 1.15); drawSpr(sprite('emo|' + sp.emoji + '|' + sz, sz * 1.7, sz * 1.7, () => { ctx.font = sz + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(sp.emoji, 0, 0); }), 0, r * 0.06); }
    else drawHopperArt(ctx, -r * 0.05, r * 0.14, r / 24, t);
    if (rem) { ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.6); ctx.lineTo(r * 0.6, r * 0.6); ctx.moveTo(r * 0.6, -r * 0.6); ctx.lineTo(-r * 0.6, r * 0.6); ctx.stroke(); }
    ctx.restore();
    const lab = sprite('lab|' + sp.name + '|' + (rem ? 1 : 0), 72, 26, () => { txt(sp.name, 0, 5, { size: 13, weight: 800, color: rem ? '#94a3b8' : '#334155', align: 'center', halo: 'rgba(255,255,255,.9)', haloW: 4 }); });
    drawSpr(lab, x, y + r * sc + 12);
  }
  function drawLinks(E, ei, t) {
    E.links.forEach((l, li) => {
      const A = nodeAt(ei, l.from), B = nodeAt(ei, l.to);
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const x0 = A.x + ux * (A.r + 5), y0 = A.y + uy * (A.r + 5), x1 = B.x - ux * (B.r + 8), y1 = B.y - uy * (B.r + 8);
      const vm = Math.min(E.vis[l.from], E.vis[l.to]), dead = E.rem[l.from] || E.rem[l.to];
      const a = dead ? 0.2 : clamp(0.28 + 0.4 * Math.min(vm, 1), 0.12, 0.7);
      const age = dead ? Math.min(E.rem[l.from] ? E.remT[l.from] : 9, E.rem[l.to] ? E.remT[l.to] : 9) : 9, snap = dead && !RM && age < 0.6 ? EASE.outCubic(age / 0.6) : 1;
      ctx.save(); ctx.strokeStyle = 'rgba(71,85,105,' + a.toFixed(2) + ')'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.2 + 2 * l.w * (ei ? 0.9 : 1.2); ctx.lineCap = 'round';
      if (dead) { ctx.setLineDash([4, 5]); ctx.globalAlpha = snap; }
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
      if (snap < 1) {                                // 끊어지는 순간: 가운데가 벌어지며 두 토막이 움츠러들어요
        const g = 0.12 + 0.88 * snap, h0 = 0.5 - g / 2, h1 = 0.5 + g / 2;
        ctx.globalAlpha = (1 - snap) * 0.9; ctx.strokeStyle = 'rgba(71,85,105,.75)';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, h0), lerp(y0, y1, h0)); ctx.moveTo(lerp(x0, x1, h1), lerp(y0, y1, h1)); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.globalAlpha = snap;
      }
      const ah = 6 + (ei ? 0 : 2); ctx.beginPath(); ctx.moveTo(x1 + ux * 3, y1 + uy * 3); ctx.lineTo(x1 - ux * ah - uy * ah * 0.55, y1 - uy * ah + ux * ah * 0.55); ctx.lineTo(x1 - ux * ah + uy * ah * 0.55, y1 - uy * ah - ux * ah * 0.55); ctx.closePath(); ctx.fill();
      if (!dead && !RM) { const u = (t * 0.32 + li * 0.173) % 1; ctx.fillStyle = 'rgba(245,158,11,' + (0.85 * Math.min(vm, 1)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(lerp(x0, x1, u), lerp(y0, y1, u), 2.6, 0, TAU); ctx.fill(); }
      ctx.restore();
    });
  }
  function barGeom(E, ei) {
    const R = LAY.web.eco[ei].bars;
    const x0 = R.x + 12, x1 = R.x + R.w - 12, yb = R.y + R.h - 26, yt = R.y + (TALL ? 26 : 34), slot = (x1 - x0) / E.n, bw = Math.min(TALL ? 30 : 34, slot * 0.72), u = (yb - yt) / 1.5;
    return { R, x0, x1, yb, yt, slot, bw, u };
  }
  function drawBarsFrame(E, ei) {                    // 변하지 않는 부분 (층에 한 번만 그려요)
    const { R, x0, x1, yb, u, slot } = barGeom(E, ei);
    panel(R.x, R.y, R.w, R.h, { bg: '#fff', border: '#e2e8f0', r: 16 });
    txt('개체 수 (처음 = 100)', R.x + 12, R.y + (TALL ? 17 : 20), { size: 13, weight: 800, color: '#64748b' });
    ctx.strokeStyle = '#e8edf3'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke();
    ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x0, yb - u); ctx.lineTo(x1, yb - u); ctx.stroke(); ctx.restore();
    for (let i = 0; i < E.n; i++) {
      const sp = SPC[E.sp[i]]; if (!sp.emoji) continue;
      ctx.font = (E.n > 6 ? 17 : 22) + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(sp.emoji, x0 + slot * (i + 0.5), yb + 14);
    }
  }
  function drawBars(E, ei, t) {
    const { x0, yb, slot, bw, u } = barGeom(E, ei);
    for (let i = 0; i < E.n; i++) {
      const cx = x0 + slot * (i + 0.5), v = E.vis[i], rem = E.rem[i], h = Math.max(rem ? 0 : 2, v * u * (rem ? 0 : 1) + (RM || rem ? 0 : Math.sin(t * 1.6 + E.ph[i]) * 0.012 * u));
      const col = stateCol(v);
      if (h > 0.5) { rr(cx - bw / 2, yb - h, bw, h, 6); ctx.fillStyle = lgrad(ctx, 0, yb - h, 0, yb, [[0, rgba(col, 0.95)], [1, rgba(col, 0.6)]]); ctx.fill(); }
      if (rem) { rr(cx - bw / 2, yb - u, bw, u, 6); ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]); drawSpr(sprite('lab|없음', 40, 20, () => { txt('없음', 0, 5, { size: 13, weight: 800, color: '#94a3b8', align: 'center' }); }), cx, yb - 13); }
      else { const vt = String(Math.round(v * 100)), vc = col === '#9ca3af' ? '#94a3b8' : shade(col, -0.25); drawSpr(sprite('num|' + vt + '|' + vc, 36, 20, () => { txt(vt, 0, 5, { size: 13, weight: 800, color: vc, align: 'center' }); }), cx, yb - h - 10); }
      if (!SPC[E.sp[i]].emoji) drawHopperArt(ctx, cx, yb + 15, E.n > 6 ? 0.52 : 0.68, t);
    }
  }
  function drawStats(E, ei, t) {
    const R = LAY.web.eco[ei].stats, st = webStats(E), settled = E.since > 2.4;
    if (!st.any) { pill('생물을 눌러 없애 보세요', R.x + R.w / 2, R.y + R.h / 2, { size: TALL ? 13.5 : 14.5, bg: '#e2e8f0', color: '#475569', pad: 14, h: TALL ? 28 : 32 }); return; }
    const frac = st.aff / Math.max(1, st.total), bad = frac >= 0.5;
    const col = bad ? '#dc2626' : frac >= 0.2 ? '#f59e0b' : '#16a34a';
    const p1 = pill('영향 받은 종 ' + st.aff + ' / ' + st.total, R.x + 8, R.y + R.h / 2, { size: TALL ? 13.5 : 15, align: 'left', bg: settled ? col : '#94a3b8', pad: 12, h: TALL ? 28 : 32, shadow: true });
    let nx = p1.x + p1.w + 8;
    if (st.gone > 0) { const p2 = pill('사라진 종 ' + st.gone, nx, R.y + R.h / 2, { size: TALL ? 13.5 : 15, align: 'left', bg: '#7f1d1d', pad: 12, h: TALL ? 28 : 32 }); nx += p2.w + 8; }
    if (settled) pill(bad ? '크게 흔들려요' : '비교적 안정적이에요', R.x + R.w - 8, R.y + R.h / 2, { size: TALL ? 13 : 14.5, align: 'right', bg: bad ? '#fee2e2' : '#dcfce7', color: bad ? '#b91c1c' : '#166534', pad: 11, h: TALL ? 28 : 32, border: bad ? '#fca5a5' : '#86efac', borderW: 1.5 });
  }
  function describe(E) {
    const st = webStats(E); if (!st.any) return '';
    const rn = E.sp.filter((k, i) => E.rem[i]).map((k) => SPC[k].name), rs = rn.length > 1 ? rn.join('·') + '이' : josa(rn[0], '이', '가');
    const ch = E.sp.map((k, i) => ({ k, v: E.x[i], rem: E.rem[i] })).filter((o) => !o.rem && Math.abs(o.v - 1) > 0.2).sort((a, b) => Math.abs(b.v - 1) - Math.abs(a.v - 1)).slice(0, 3);
    if (!ch.length) return rs + ' 사라져도 다른 생물은 크게 달라지지 않았어요.';
    const ph = ch.map((o) => josa(SPC[o.k].name, '은', '는') + (o.v < 0.08 ? ' 거의 사라졌' : o.v < 1 ? ' 줄었' : ' 늘었'));
    return rs + ' 사라지자 ' + ph.join('고, ') + '어요.';
  }
  function webCaption() {
    const C = LAY.web.cap;
    panelBorder(C.x, C.y, C.w, C.h, { border: WB.done ? '#86efac' : '#e2e8f0', bw: WB.done ? 2 : 1.5 });
    const fs = TALL ? 13.5 : 15.5, lh = TALL ? 19 : 22, tx = C.x + 14, mw = C.w - 28;
    const A = ECOS[0], B = ECOS[1], sa = webStats(A), sb = webStats(B);
    if (!sa.any && !sb.any) { para('생물을 눌러 없애 보세요. 막대그래프와 \'영향 받은 종\'을 두 생태계에서 비교해 봐요. 같은 생물을 없애면 비교하기 좋아요.', tx, C.y + (TALL ? 26 : 30), mw, { size: fs, weight: 800, color: '#475569', lh }); return; }
    let y = C.y + (TALL ? 22 : 26);
    [[A, sa, '단순'], [B, sb, '복잡']].forEach(([E, st, nm]) => {
      if (!st.any) return;
      const msg = E.since < 2.4 ? '변화를 지켜보는 중…' : describe(E);
      ctx.font = font(fs, 800);
      pill(nm, tx, y - 4, { size: TALL ? 12 : 13, align: 'left', bg: nm === '단순' ? '#16a34a' : '#0e93a6', pad: 8, h: TALL ? 20 : 22 });
      const h = para(msg, tx + (TALL ? 46 : 52), y, mw - (TALL ? 46 : 52), { size: fs, weight: 800, color: '#1e293b', lh });
      y += Math.max(h, lh) + (TALL ? 4 : 6);
    });
    if (WB.cmpT > 4 && sa.any && sb.any && E_common()) para('👉 같은 생물을 없애도 단순한 생태계는 ' + sa.aff + '/' + sa.total + '종, 복잡한 생태계는 ' + sb.aff + '/' + sb.total + '종이 영향을 받았어요.', tx, y + (TALL ? 2 : 2), mw, { size: fs, weight: 800, color: '#166534', lh });
  }
  function E_common() { const A = ECOS[0], B = ECOS[1]; return A.sp.some((k, i) => A.rem[i] && B.rem[B.idx[k]]); }
  function drawWebStatic() {                         // 그림판 바탕, 상자, 막대그래프 틀: 한 번만 그려 둬요
    drawBackdrop();
    { const C = LAY.web.cap; panelBase(C.x, C.y, C.w, C.h); }
    for (let ei = 0; ei < 2; ei++) {
      const E = ECOS[ei], N = LAY.web.eco[ei].net;
      dropShadow(N.x, N.y, N.w, N.h, 18, 12, 3, 'rgba(30,60,40,.14)');
      ctx.save(); rr(N.x, N.y, N.w, N.h, 18); ctx.clip();
      ctx.fillStyle = lgrad(ctx, 0, N.y, 0, N.y + N.h, [[0, E.bg[0]], [1, E.bg[1]]]); ctx.fillRect(N.x, N.y, N.w, N.h);
      const R = rng(ei + 3); ctx.fillStyle = 'rgba(255,255,255,.22)'; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(N.x + R() * N.w, N.y + R() * N.h, 14 + R() * 26, 0, TAU); ctx.fill(); }
      ctx.restore();
      rr(N.x, N.y, N.w, N.h, 18); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.stroke();
      pill(E.title, N.x + 10, N.y + 20, { size: TALL ? 13.5 : 14.5, align: 'left', bg: ei ? '#0e93a6' : '#16a34a', pad: 11, h: TALL ? 26 : 28, shadow: true });
      pill(E.sub, N.x + N.w - 10, N.y + 20, { size: TALL ? 13 : 13.5, align: 'right', bg: 'rgba(255,255,255,.92)', color: '#334155', pad: 10, h: TALL ? 24 : 26 });
      drawBarsFrame(E, ei);
    }
  }
  function drawEco(ei, t) {
    const E = ECOS[ei];
    drawLinks(E, ei, t);
    for (let i = 0; i < E.n; i++) drawNode(E, ei, i, t);
    drawBars(E, ei, t); drawStats(E, ei, t);
  }
  function drawWebScene(t) {
    layer('web', drawWebStatic);
    drawEco(0, t); drawEco(1, t); webCaption();
    if (isNew('web')) { const a = LAY.web.eco[0].net, b = LAY.web.eco[1].net; newRing({ x: a.x, y: a.y, w: b.x + b.w - a.x, h: a.h }, 18); }
  }
  function webHit(p) {
    for (let ei = 1; ei >= 0; ei--) {
      const E = ECOS[ei];
      for (let i = E.n - 1; i >= 0; i--) { const N = nodeAt(ei, i); if (Math.hypot(p.x - N.x, p.y - N.y) <= N.r + (TALL ? 10 : 8)) return { ei, i }; }
    }
    return null;
  }

  /* =========================================================
     ②③ 위협 요인 시나리오 5가지 → 원인 맞히기 / 해결책 적용 (개체 수가 줄었다가 회복돼요)
     ========================================================= */
  const SHORT = ['숲에 도로가 생긴', '황소개구리가 퍼진', '물고기를 너무 많이 잡은', '폐수가 흘러든', '기온이 오르는'];
  const PN = THREATS.map((th, i) => ({ i, thr: 0, fix: 0, fixed: false, off: i * 2.1, solT: -9, tw: null }));
  const PM = { mode: 'threat', sel: null, selPanel: null, checked: false, doneT: -9, msg: '', msgT: -9, solved: 0 };
  const CAUSE = shuffled([0, 1, 2, 3, 4], 4).map((idx, home) => mkCard({ kind: 'cause', idx, home, panel: -1, ord: 0 }));
  const FIXC = shuffled([0, 1, 2, 3, 4], 9).map((idx, home) => mkCard({ kind: 'fix', idx, home, panel: -1, ord: 0 }));
  const pcards = () => (PM.mode === 'fix' ? FIXC : CAUSE);
  const plain = (h) => h.replace(/<[^>]+>/g, '');
  const panelRect = (i) => LAY.panels.p[i];
  function panelParts(i) {
    const p = panelRect(i);
    if (LAY.panels.vertical) return { scene: { x: p.x + 4, y: p.y + 4, w: p.w - 8, h: 116 }, gauge: { x: p.x + 10, y: p.y + 128, w: p.w - 20, h: 20 }, text: { x: p.x + 10, y: p.y + 162, w: p.w - 20 }, slot: { x: p.x + 7, y: p.y + p.h - 46, w: p.w - 14, h: 38 }, lh: 17.5, fs: 13.5 };
    return { scene: { x: p.x + 4, y: p.y + 4, w: 136, h: p.h - 8 }, gauge: { x: p.x + 150, y: p.y + 6, w: p.w - 158, h: 18 }, text: { x: p.x + 150, y: p.y + 38, w: p.w - 160 }, slot: { x: p.x + 148, y: p.y + p.h - 32, w: p.w - 156, h: 28 }, lh: 15.5, fs: 13 };
  }
  const thrOf = (P) => (PM.mode === 'fix' ? 1 : P.thr), fixOf = (P) => (PM.mode === 'fix' ? P.fix : 0);
  const popOf = (P) => 1 - 0.72 * thrOf(P) * (1 - 0.93 * fixOf(P));
  function panelCardTarget(cd) {
    if (cd.panel >= 0) { const s = panelParts(cd.panel).slot; return { x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 }; }
    const idx = pcards().filter((c) => c.panel < 0 && c.home < cd.home).length; return LAY.panels.tray[idx];
  }
  function snapPanels(animate) { snapAll(CAUSE, panelCardTarget, animate); snapAll(FIXC, panelCardTarget, animate); }
  function panelAt(p) { for (let i = 0; i < 5; i++) if (inR(p, panelRect(i), 4)) return i; return -1; }
  function panelsReset(mode) {                  // 해당 단계(원인 / 해결책)를 처음 상태로
    PM.sel = null; PM.selPanel = null; PM.msg = '';
    if (mode === 'fix') { PN.forEach((P) => { if (P.tw) P.tw.cancel(); P.fix = 0; P.fixed = false; }); FIXC.forEach((c) => { c.panel = -1; c.ok = false; c.bad = -9; c.locked = false; }); PM.solved = 0; }
    else { CAUSE.forEach((c) => { c.panel = -1; c.ok = false; c.bad = -9; c.locked = false; }); PM.checked = false; }
    snapPanels(false);
  }
  function causeSolve() { CAUSE.forEach((c) => { c.panel = c.idx; c.ok = true; c.locked = true; }); PM.checked = true; PM.doneT = now() - 99; snapPanels(false); }
  function fixSolve() { FIXC.forEach((c) => { c.panel = c.idx; c.ok = true; c.locked = true; }); PN.forEach((P) => { P.fixed = true; P.fix = 1; }); PM.solved = 5; PM.doneT = now() - 99; snapPanels(false); }
  function causeAssign(cd, pi) {
    const other = CAUSE.find((o) => o !== cd && o.panel === pi);
    if (other) { other.panel = cd.panel >= 0 && cd.panel !== pi ? cd.panel : -1; other.ok = false; }
    cd.panel = pi; cd.ok = false; Sound.tick(); snapPanels(true);
  }
  function causeCheck() {
    const un = CAUSE.filter((c) => c.panel < 0).length;
    if (un) return '아직 놓지 않은 원인 카드가 ' + un + '장 있어요. 시나리오 5개에 하나씩 놓아 주세요.';
    const wrong = CAUSE.filter((c) => c.idx !== c.panel);
    if (wrong.length) {
      if (MANUAL) { const t = now(); wrong.forEach((c) => { c.bad = t; }); setTimeout(() => { wrong.forEach((c) => { c.panel = -1; }); snapPanels(true); }, 750); }
      const shown = wrong.slice(0, 2).map((c) => { const nm = THREATS[c.panel].name; return '<b>' + SHORT[c.panel] + '</b> 시나리오는 \'' + nm + '\'' + iyeyo(nm) + '. (' + THREATS[c.panel].def + ')'; }).join('<br>');
      return '빨간 카드 ' + wrong.length + '장이 알맞지 않아요. 시나리오를 다시 읽어 봐요!<br>' + shown + (wrong.length > 2 ? '<br>… 외 ' + (wrong.length - 2) + '장' : '');
    }
    if (MANUAL) {
      PM.checked = true; PM.doneT = now(); CAUSE.forEach((c, i) => { c.ok = true; c.locked = true; c.pop = now() + 0.07 * i; });
      for (let i = 0; i < 5; i++) { const s = panelParts(i).slot; burst(s.x + s.w / 2, s.y + s.h / 2, [THREATS[i].color, '#fff', '#fde047'], 10, { speed: 110, life: 0.8 }); }
      Sound.success();
    }
    return true;
  }
  function fixDrop(cd, pi) {
    const P = PN[pi];
    if (P.fixed) { cd.panel = -1; snapPanels(true); return; }
    if (cd.idx === pi) {
      cd.panel = pi; cd.ok = true; cd.locked = true; cd.pop = now(); P.fixed = true; P.solT = now(); PM.solved++; snapPanels(true);
      P.tw = SciSim.tween(P, { fix: 1 }, { duration: RM ? 0.05 : 3.0, ease: 'inOutCubic' });
      const s = panelParts(pi).scene; burst(s.x + s.w / 2, s.y + s.h * 0.5, [THREATS[pi].color, '#ffffff', '#fde047', '#86efac'], 24, { speed: 170, life: 1, gravity: 50 });
      Sound.success(); PM.msg = ''; PM.selPanel = pi;
    } else {
      cd.panel = -1; cd.bad = now(); Sound.fail(); snapPanels(true);
      PM.msg = '<b>' + THREATS[cd.idx].fix + '</b>' + jp(THREATS[cd.idx].fix, '은', '는') + ' ' + THREATS[cd.idx].fixDesc + '. \'' + THREATS[pi].name + '\' 시나리오에는 어떤 방법이 알맞을까요?'; PM.msgT = now(); PM.selPanel = null; PM.sel = cd;
    }
  }
  function panelsUpdate(dt) {
    if (PM.mode === 'threat') {
      PN.forEach((P) => {
        const u = ((now() + P.off) % 10.5) / 10.5;
        P.thr = RM ? 1 : u < 0.08 ? 0 : u < 0.42 ? EASE.inOutSine((u - 0.08) / 0.34) : u < 0.8 ? 1 : u < 0.95 ? 1 - EASE.inOutSine((u - 0.8) / 0.15) : 0;
      });
    }
  }
  function drawPanelScene(i, t) {
    const P = PN[i], th = THREATS[i], pt = panelParts(i), s = pt.scene, pop = popOf(P);
    ctx.save(); rr(s.x, s.y, s.w, s.h, 12); ctx.clip();
    const sc = Math.max(s.w / SC_W, s.h / SC_H);
    ctx.translate(s.x + s.w / 2 - SC_W * sc / 2, s.y + s.h / 2 - SC_H * sc / 2); ctx.scale(sc, sc);
    SCENES[th.key](ctx, t, thrOf(P), fixOf(P), pop);
    ctx.restore();
    // 부드러운 안쪽 테두리
    rr(s.x, s.y, s.w, s.h, 12); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function drawPanel(i, t, hot) {
    const p = panelRect(i), P = PN[i], th = THREATS[i], pt = panelParts(i), pop = popOf(P), vert = LAY.panels.vertical;
    const sel = PM.selPanel === i;
    ctx.save(); const pr = hot ? 1.012 : 1; ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.scale(pr, pr); ctx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
    if (hot) { rr(p.x - 3, p.y - 3, p.w + 6, p.h + 6, 19); ctx.fillStyle = rgba(th.color, 0.14); ctx.fill(); rr(p.x, p.y, p.w, p.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); }
    drawPanelScene(i, t);
    // 개체 수 막대
    const g = pt.gauge, col = pop > 0.8 ? '#22c55e' : pop > 0.5 ? '#f59e0b' : '#ef4444';
    txt('개체 수', g.x, g.y + g.h / 2 + 1, { size: 13, weight: 800, color: '#64748b', base: 'middle' });
    const bx = g.x + (vert ? 46 : 52), bw = g.w - (vert ? 46 : 52) - 40;
    rr(bx, g.y + 4, bw, g.h - 8, 6); ctx.fillStyle = '#e8edf3'; ctx.fill();
    rr(bx, g.y + 4, Math.max(6, bw * pop), g.h - 8, 6); ctx.fillStyle = lgrad(ctx, bx, 0, bx + bw, 0, [[0, shade(col, 0.2)], [1, col]]); ctx.fill();
    txt(Math.round(pop * 100) + '%', g.x + g.w, g.y + g.h / 2 + 1, { size: 13.5, weight: 800, color: shade(col, -0.2), align: 'right', base: 'middle' });
    // 이야기
    const showFix = PM.mode === 'fix' && P.fixed, body = showFix ? plain(th.fixHow) : th.story, tcol = showFix ? '#166534' : '#334155';
    const tmax = vert ? 6 : 3, ls = lines(body, pt.text.w, pt.fs, 800).slice(0, tmax);
    ls.forEach((ln, k) => txt(ln + (k === tmax - 1 && lines(body, pt.text.w, pt.fs, 800).length > tmax ? '…' : ''), pt.text.x, pt.text.y + k * pt.lh + (vert ? 4 : 0), { size: pt.fs, weight: 800, color: tcol }));
    // 카드 칸
    const s = pt.slot, assigned = pcards().some((c) => c.panel === i);
    if (!assigned || hot) {
      ctx.setLineDash([6, 5]); rr(s.x, s.y, s.w, s.h, 10); ctx.strokeStyle = hot ? '#16a34a' : '#b8c4d4'; ctx.lineWidth = hot ? 3 : 1.8; ctx.stroke(); ctx.setLineDash([]);
      if (hot) { rr(s.x, s.y, s.w, s.h, 10); ctx.fillStyle = 'rgba(34,197,94,.1)'; ctx.fill(); }
      if (!assigned) txt(PM.mode === 'fix' ? '해결책 카드를 여기에' : '원인 카드를 여기에', s.x + s.w / 2, s.y + s.h / 2 + 1, { size: 13, weight: 700, color: '#94a3b8', align: 'center', base: 'middle', max: s.w - 10 });
    }
    if (PM.mode === 'fix') pill(th.name, p.x + (vert ? p.w - 8 : p.w - 8), p.y + (vert ? 18 : 18), { size: 12.5, align: 'right', bg: th.color, pad: 8, h: 20, shadow: true });
    else if (PM.checked) pill(th.name, p.x + p.w - 8, p.y + 18, { size: 12.5, align: 'right', bg: th.color, pad: 8, h: 20, shadow: true });
    if (sel) { rr(p.x, p.y, p.w, p.h, 16); ctx.strokeStyle = th.color; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
  }
  function causeFace(cd, w, h) {
    const th = THREATS[cd.idx], inSlot = cd.panel >= 0;
    ctx.fillStyle = th.color; rr(6, 7, 5, h - 14, 2.5); ctx.fill();
    txt(th.name, 20, h / 2 + 1, { size: inSlot ? 14.5 : 16, weight: 800, color: th.color, base: 'middle', max: w - 28 });
  }
  function fixFace(cd, w, h) {
    const th = THREATS[cd.idx], inSlot = cd.panel >= 0;
    ctx.fillStyle = '#0e93a6'; rr(6, 7, 5, h - 14, 2.5); ctx.fill();
    const mw = w - 28 - (cd.ok ? 14 : 0), label = inSlot ? (th.fixShort || th.fix) : th.fix, size = inSlot ? 14 : 15;
    ctx.font = font(size, 800);
    if (!inSlot && ctx.measureText(label).width > mw && label.indexOf('·') > 0) {          // 긴 이름은 두 줄로
      const k = label.indexOf('·') + 1;
      txt(label.slice(0, k), 20, h / 2 - 9, { size, weight: 800, color: '#0e7490', base: 'middle', max: mw, min: 13 });
      txt(label.slice(k), 20, h / 2 + 10, { size, weight: 800, color: '#0e7490', base: 'middle', max: mw, min: 13 });
    } else txt(label, 20, h / 2 + 1, { size, weight: 800, color: '#0e7490', base: 'middle', max: mw, min: 13 });
  }
  function panelsCaption() {
    const C = LAY.panels.cap, fix = PM.mode === 'fix';
    panelBorder(C.x, C.y, C.w, C.h, { border: (fix ? PM.solved === 5 : PM.checked) ? '#86efac' : '#e2e8f0', bw: (fix ? PM.solved === 5 : PM.checked) ? 2 : 1.5 });
    const fs = TALL ? 13.5 : 15.5, lh = TALL ? 19 : 22, tx = C.x + 16, mw = C.w - 32;
    if (PM.sel && now() - PM.msgT > 0 && PM.mode === 'threat' && !PM.checked) {
      const th = THREATS[PM.sel.idx];
      pill(th.name, tx, C.y + 22, { size: 14, align: 'left', bg: th.color, pad: 11, h: 26 });
      para(th.def, tx, C.y + 52, mw, { size: fs, weight: 800, color: '#1e293b', lh });
    } else if (fix && PM.msg && now() - PM.msgT < 14) {
      para('🤔 ' + plain(PM.msg), tx, C.y + (TALL ? 26 : 30), mw, { size: fs, weight: 800, color: '#b91c1c', lh });
    } else if (fix && PM.selPanel != null && PN[PM.selPanel].fixed) {
      const th = THREATS[PM.selPanel];
      pill(th.name + ' → ' + th.fix, tx, C.y + 22, { size: 14, align: 'left', bg: '#0e93a6', pad: 11, h: 26 });
      para(plain(th.fixHow) + ' 개체 수가 다시 늘어났어요!', tx, C.y + 52, mw, { size: fs, weight: 800, color: '#166534', lh });
    } else if (fix && PM.sel) {
      const th = THREATS[PM.sel.idx];
      pill(th.fix, tx, C.y + 22, { size: 14, align: 'left', bg: '#0e93a6', pad: 11, h: 26 });
      para(th.fixDesc + '. (' + th.name + ' 같은 문제를 해결해요)', tx, C.y + 52, mw, { size: fs, weight: 800, color: '#1e293b', lh });
    } else if (fix) {
      para(PM.solved === 5 ? '🎉 다섯 가지 해결책을 모두 알맞게 적용했어요! 시나리오를 누르면 어떻게 해결했는지 볼 수 있어요.' : '시나리오마다 알맞은 해결책 카드를 끌어 놓아요. 카드를 누르면 설명이 나와요. 알맞게 놓으면 개체 수가 다시 늘어나요!', tx, C.y + (TALL ? 26 : 30), mw, { size: fs, weight: 800, color: PM.solved === 5 ? '#166534' : '#475569', lh });
    } else if (PM.checked) {
      if (PM.selPanel != null) { const th = THREATS[PM.selPanel]; pill(th.name, tx, C.y + 22, { size: 14, align: 'left', bg: th.color, pad: 11, h: 26 }); para(th.def, tx, C.y + 52, mw, { size: fs, weight: 800, color: '#1e293b', lh }); }
      else para('🎉 원인을 모두 알맞게 찾았어요! 시나리오를 누르면 위협 요인의 뜻을 볼 수 있어요.', tx, C.y + (TALL ? 26 : 30), mw, { size: fs, weight: 800, color: '#166534', lh });
    } else {
      para('시나리오를 읽고 그림의 개체 수 변화를 살펴본 뒤, 원인 카드를 알맞은 시나리오에 끌어 놓아요. 카드를 누르면 뜻이 나와요.', tx, C.y + (TALL ? 26 : 30), mw, { size: fs, weight: 800, color: '#475569', lh });
    }
  }
  function drawPanelsStatic() {                      // 시나리오 카드의 그림자·바탕과 설명 상자: 한 번만 그려 둬요
    drawBackdrop();
    for (let i = 0; i < 5; i++) { const p = panelRect(i); dropShadow(p.x, p.y, p.w, p.h, 16, 10, 3, 'rgba(30,60,40,.16)'); rr(p.x, p.y, p.w, p.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); }
    const C = LAY.panels.cap; panelBase(C.x, C.y, C.w, C.h);
  }
  function drawPanelsScene(t, fixMode) {
    layer('panels', drawPanelsStatic);
    const hot = (() => { const d = S.drag; if (!d || d.set !== 'pn' || d.px == null) return -1; return panelAt({ x: d.px, y: d.py }); })();
    for (let i = 0; i < 5; i++) drawPanel(i, t, hot === i);
    const list = pcards(), tray0 = LAY.panels.tray[0];
    if (list.some((c) => c.panel < 0)) txt(fixMode ? '🛠️ 해결책 카드 (끌어서 시나리오에 놓아요)' : '🏷️ 원인 카드 (끌어서 시나리오에 놓아요)', tray0.x + 4, tray0.y - 8, { size: 13.5, weight: 800, color: '#64748b' });
    const dragCd = S.drag && S.drag.set === 'pn' ? S.drag.card : null;
    const draw1 = (cd) => { if (cd.kind === 'cause') cardFrame(cd, t, THREATS[cd.idx].color, (w, h) => causeFace(cd, w, h), { r: 12 }); else cardFrame(cd, t, '#0e93a6', (w, h) => fixFace(cd, w, h), { r: 12 }); };
    list.forEach((cd) => { if (cd !== dragCd) draw1(cd); });
    if (dragCd) draw1(dragCd);
    panelsCaption();
    const nm = fixMode ? 'fix' : 'threat';
    if (isNew(nm)) { const a = panelRect(0), b = panelRect(4); newRing({ x: a.x, y: a.y, w: b.x + b.w - a.x, h: b.y + b.h - a.y }, 16); }
  }

  /* =========================================================
     ④ 실천: 개인 · 사회 분류 게임 + 나의 실천 다짐
     ========================================================= */
  const SIDE = [
    { name: '🙋 개인의 실천', sub: '내가 일상에서 할 수 있는 일', color: '#16a34a', soft: '#dcf6ea' },
    { name: '🏛️ 사회의 실천', sub: '나라·지역·여러 사람이 함께 하는 일', color: '#2f7fe8', soft: '#dfeafd' },
  ];
  const ACT = { mode: 'sort', cards: shuffled(ACTS.map((a) => a.id), 17).map((id, home) => mkCard({ kind: 'act', id, home, box: -1, ord: 0 })), done: false, doneT: -9, sel: null, selBox: null, ordN: 0, msg: '', msgT: -9 };
  const PL = { sel: [false, false, false, false, false], grow: 0, doneT: -9, flyT0: 0 };
  const plCount = () => PL.sel.filter(Boolean).length;
  function actSlot(bi, idx, n) {
    const B = LAY.act.box[bi], ix = B.x + 8, iy = B.y + (TALL ? 60 : 62), iw = B.w - 16, ih = B.h - (TALL ? 68 : 70), cols = 2, rows = Math.max(1, Math.ceil(n / cols)), gw = 6;
    const w = (iw - gw) / cols, h = Math.min(TALL ? 56 : 70, (ih - (rows - 1) * gw) / rows);
    return { x: ix + (idx % cols) * (w + gw), y: iy + Math.floor(idx / cols) * (h + gw), w, h };
  }
  function actTarget(cd) {
    if (cd.box >= 0) { const list = ACT.cards.filter((c) => c.box === cd.box).sort((a, b) => a.ord - b.ord); return actSlot(cd.box, list.indexOf(cd), list.length); }
    return LAY.act.tray(ACT.cards.filter((c) => c.box < 0 && c.home < cd.home).length);
  }
  function actSnap(animate) { snapAll(ACT.cards, actTarget, animate); }
  function actReset() { ACT.cards.forEach((c) => { c.box = -1; c.ok = false; c.bad = -9; }); ACT.done = false; ACT.sel = null; ACT.selBox = null; ACT.msg = ''; actSnap(false); }
  function actSolve() { ACT.cards.forEach((c) => { c.box = ACTS[c.id].side; c.ok = true; c.bad = -9; c.ord = ++ACT.ordN; }); ACT.done = true; ACT.doneT = now() - 99; actSnap(false); }
  const actBoxAt = (p) => { for (let i = 0; i < 2; i++) if (inR(p, LAY.act.box[i], 5)) return i; return -1; };
  function actAssign(cd, bi) { cd.box = bi; cd.ok = false; cd.ord = ++ACT.ordN; Sound.tick(); actSnap(true); }
  function actCheck() {
    const un = ACT.cards.filter((c) => c.box < 0).length;
    if (un) return '아직 상자에 넣지 않은 카드가 ' + un + '장 있어요. 8장을 모두 넣어 주세요.';
    const wrong = ACT.cards.filter((c) => ACTS[c.id].side !== c.box);
    if (wrong.length) {
      if (MANUAL) { const t = now(); wrong.forEach((c) => { c.bad = t; }); setTimeout(() => { wrong.forEach((c) => { c.box = -1; }); actSnap(true); }, 750); ACT.msg = ACTS[wrong[0].id].text + ': ' + ACTS[wrong[0].id].why; ACT.msgT = now(); }
      const shown = wrong.slice(0, 2).map((c) => '<b>' + ACTS[c.id].text + '</b>: ' + ACTS[c.id].why).join('<br>');
      return '빨간 카드 ' + wrong.length + '장이 알맞지 않아요. 누가 하는 일인지 생각해 봐요!<br>' + shown + (wrong.length > 2 ? '<br>… 외 ' + (wrong.length - 2) + '장' : '');
    }
    if (MANUAL) {
      ACT.done = true; ACT.doneT = now(); ACT.sel = null;
      ACT.cards.forEach((c, i) => { c.ok = true; c.pop = now() + 0.06 * i; const r = actTarget(c); burst(r.x + r.w / 2, r.y + r.h / 2, [SIDE[c.box].color, '#fff', '#fde047'], 8, { speed: 100, life: 0.7 }); });
      Sound.success();
    }
    return true;
  }
  function actFace(cd, w, h) {
    const a = ACTS[cd.id], inBox = cd.box >= 0;
    ctx.fillStyle = cd.box >= 0 ? SIDE[cd.box].color : '#94a3b8'; rr(6, 7, 5, h - 14, 2.5); ctx.fill();
    ctx.font = Math.round(h * 0.46) + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(a.icon, 28, h / 2 + 1);
    const tx = 50, mw = w - tx - 8; let fs = TALL ? 13.5 : 14.5, ls = lines(a.text, mw, fs, 800);
    while (ls.length * (fs + 4) > h - 6 && fs > 13) { fs -= 0.5; ls = lines(a.text, mw, fs, 800); }
    ls.forEach((ln, i) => txt(ln, tx, h / 2 + (i - (ls.length - 1) / 2) * (fs + 4) + 1, { size: fs, weight: 800, color: '#1e293b', base: 'middle' }));
  }
  function drawActSummary() {                       // 분류가 끝나면 빈 자리에 두 상자의 뜻을 보여 줘요
    const el = now() - ACT.doneT, L = LAY.act, y0 = L.tray(0).y - 4, y1 = TALL ? L.cap.y - 8 : L.cap.y - 14;
    const msgs = ['일상의 작은 습관이 모이면 쓰레기와 외래종, 온실가스를 줄일 수 있어요.', '법과 제도, 국제 협약, 보호 구역과 복원 사업처럼 큰 규모로 생물다양성을 지켜요.'];
    for (let i = 0; i < 2; i++) {
      const B = L.box[i], K = SIDE[i], u = EASE.outCubic(clamp((el - 0.3 - i * 0.2) / 0.55, 0, 1)); if (u <= 0.01) continue;
      const hh = TALL ? (y1 - y0 - 8) / 2 : y1 - y0, r = { x: B.x, y: TALL ? y0 + i * (hh + 8) : y0, w: B.w, h: hh };
      ctx.save(); ctx.globalAlpha = u; ctx.translate(0, (1 - u) * 14);
      dropShadow(r.x, r.y, r.w, r.h, 16, 8, 2, 'rgba(30,60,40,.14)');
      rr(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill(); rr(r.x, r.y, r.w, r.h, 16); ctx.strokeStyle = rgba(K.color, 0.55); ctx.lineWidth = 2; ctx.stroke();
      const ex = r.x + (TALL ? 34 : 44), ey = r.y + r.h / 2;
      ctx.beginPath(); ctx.arc(ex, ey, TALL ? 24 : 30, 0, TAU); ctx.fillStyle = K.soft; ctx.fill();
      emo(ctx, i ? '🏛️' : '🙋', ex, ey + 1, TALL ? 26 : 34, { alpha: 1 });
      para(msgs[i], r.x + (TALL ? 70 : 90), r.y + (TALL ? 22 : r.h / 2 - 22), r.w - (TALL ? 82 : 106), { size: TALL ? 14 : 16, weight: 800, color: '#1e293b', lh: TALL ? 20 : 24 });
      ctx.restore();
    }
  }
  function drawActStatic() {                         // 상자 바탕·이름표, 설명 상자: 한 번만 그려 둬요
    drawBackdrop();
    const L = LAY.act;
    for (let i = 0; i < 2; i++) {
      const B = L.box[i], K = SIDE[i];
      dropShadow(B.x, B.y, B.w, B.h, 18, 10, 3, 'rgba(30,60,40,.16)');
      rr(B.x, B.y, B.w, B.h, 18); ctx.fillStyle = rgba(K.soft, 0.9); ctx.fill();
      pill(K.name, B.x + 12, B.y + (TALL ? 24 : 26), { size: TALL ? 15 : 16, align: 'left', bg: K.color, pad: 12, h: TALL ? 30 : 32 });
      txt(K.sub, B.x + 14, B.y + (TALL ? 50 : 56), { size: 13, weight: 700, color: '#475569', max: B.w - 24 });
    }
    const C = L.cap; panelBase(C.x, C.y, C.w, C.h);
  }
  function drawActSort(t) {
    layer('actsort', drawActStatic);
    const L = LAY.act, hot = (() => { const d = S.drag; if (!d || d.set !== 'act' || d.px == null) return -1; return actBoxAt({ x: d.px, y: d.py }); })();
    for (let i = 0; i < 2; i++) {
      const B = L.box[i], K = SIDE[i], empty = !ACT.cards.some((c) => c.box === i);
      if (hot === i) { rr(B.x - 3, B.y - 3, B.w + 6, B.h + 6, 21); ctx.fillStyle = rgba(K.color, 0.12); ctx.fill(); }
      ctx.setLineDash(empty && !ACT.done ? [7, 5] : []); rr(B.x, B.y, B.w, B.h, 18); ctx.strokeStyle = K.color; ctx.lineWidth = hot === i || ACT.selBox === i ? 4 : 2.4; ctx.stroke(); ctx.setLineDash([]);
    }
    if (!ACT.done && ACT.cards.some((c) => c.box < 0)) txt('🃏 실천 카드 (끌어서 상자에 넣어요)', TALL ? 12 : 18, L.trayLabelY - 2, { size: 13.5, weight: 800, color: '#64748b' });
    if (ACT.done) drawActSummary();
    const dragCd = S.drag && S.drag.set === 'act' ? S.drag.card : null;
    const draw1 = (cd) => cardFrame(cd, t, cd.box >= 0 ? SIDE[cd.box].color : '#94a3b8', (w, h) => actFace(cd, w, h), { r: 12 });
    ACT.cards.forEach((cd) => { if (cd !== dragCd) draw1(cd); });
    if (dragCd) draw1(dragCd);
    // 캡션
    const C = L.cap; panelBorder(C.x, C.y, C.w, C.h, { border: ACT.done ? '#86efac' : '#e2e8f0', bw: ACT.done ? 2 : 1.5 });
    const fs = TALL ? 13.5 : 15.5, lh = TALL ? 19 : 22, tx = C.x + 16, mw = C.w - 32;
    if (ACT.selBox != null) { const K = SIDE[ACT.selBox]; pill(K.name, tx, C.y + 22, { size: 14, align: 'left', bg: K.color, pad: 11, h: 26 }); para(ACT.selBox ? '법·제도 만들기, 국제 협약, 보호 구역 지정, 복원 사업처럼 나라와 여러 사람이 함께 하는 일이에요. 큰 규모로 생물다양성을 지켜요.' : '일회용품 줄이기, 분리배출, 외래 생물 함부로 버리지 않기처럼 내가 날마다 실천할 수 있는 일이에요. 작은 실천이 모이면 큰 힘이 돼요.', tx, C.y + 52, mw, { size: fs, weight: 800, color: '#1e293b', lh }); }
    else if (ACT.sel != null && !ACT.done) { const a = ACTS[ACT.sel]; pill(a.icon + ' ' + a.text, tx, C.y + 22, { size: 13.5, align: 'left', bg: '#334155', pad: 11, h: 26 }); para('이 일은 누가 하는 일일까요? 혼자 일상에서 할 수 있는 일이면 개인, 나라나 여러 사람이 함께 해야 하면 사회예요.', tx, C.y + 52, mw, { size: fs, weight: 800, color: '#475569', lh }); }
    else if (ACT.done) para('🎉 모두 알맞게 분류했어요! 개인의 작은 실천과 사회의 큰 노력이 함께할 때 생물다양성을 잘 지킬 수 있어요. 상자를 누르면 설명이 나와요.', tx, C.y + (TALL ? 26 : 30), mw, { size: fs, weight: 800, color: '#166534', lh });
    else if (ACT.msg && now() - ACT.msgT < 12) para('🤔 ' + ACT.msg, tx, C.y + (TALL ? 26 : 30), mw, { size: fs, weight: 800, color: '#b91c1c', lh });
    else para('생물다양성을 지키는 방법 8가지를 \'개인의 실천\'과 \'사회의 실천\' 상자로 나눠 봐요. 카드를 누르면 힌트가 나와요.', tx, C.y + (TALL ? 26 : 30), mw, { size: fs, weight: 800, color: '#475569', lh });
    if (isNew('act')) { const a = L.box[0], b = L.box[1]; newRing({ x: a.x, y: a.y, w: b.x + b.w - a.x, h: Math.max(a.y + a.h, b.y + b.h) - a.y }, 18); }
  }
  /* ---------- 나의 실천 다짐 ---------- */
  function plRect(i) { const R = LAY.act.pl.list, n = 5, gap = 6, h = (R.h - 16 - gap * (n - 1)) / n; return { x: R.x + 8, y: R.y + 8 + i * (h + gap), w: R.w - 16, h }; }
  function plToggle(i) { PL.sel[i] = !PL.sel[i]; Sound.tone(520 + plCount() * 90, 0.1, 'triangle', 0.07); if (plCount() === 2 && PL.sel[i]) { PL.doneT = now(); const C = LAY.act.pl.card; burst(C.x + C.w / 2, C.y + C.h * 0.4, ['#86efac', '#fde047', '#f9a8d4', '#ffffff'], 30, { speed: 190, life: 1.1, gravity: 60 }); Sound.success(); } }
  function drawPlant(x, y, h, n, t) {              // 흙에서 자라는 식물 (n가지를 고를수록 자라요)
    const tt = RM ? 0 : t, g = PL.grow, sw = Math.sin(tt * 1.2) * 3 * g;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(80,50,20,.25)'; ctx.beginPath(); ctx.ellipse(0, 4, 54, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = lgrad(ctx, 0, -8, 0, 12, [[0, '#a9774a'], [1, '#6d4527']]); ctx.beginPath(); ctx.moveTo(-52, 6); ctx.quadraticCurveTo(0, -22, 52, 6); ctx.quadraticCurveTo(0, 16, -52, 6); ctx.fill();
    const top = -h * (0.18 + 0.82 * g);
    ctx.strokeStyle = '#3f9d4a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(sw * 0.5, top * 0.5, sw, top); ctx.stroke();
    const leaves = Math.min(6, 1 + n * 1.2);
    for (let k = 0; k < leaves; k++) {
      const u = (k + 1) / (leaves + 1), ly = top * u, lx = sw * u * u, sd = k % 2 ? 1 : -1, grow = clamp(g * 3 - k * 0.35, 0, 1) * EASE.outBack(clamp(g * 3 - k * 0.35, 0, 1) || 0);
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(sd * (0.7 + Math.sin(tt * 1.5 + k) * 0.06)); ctx.scale(sd * Math.max(0.01, grow), Math.max(0.01, grow));
      ctx.fillStyle = lgrad(ctx, 0, -6, 34, 6, [[0, '#7bd58a'], [1, '#2f9a4e']]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(10, -14, 30, -12, 40, 0); ctx.bezierCurveTo(30, 12, 10, 14, 0, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(20,80,40,.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(34, 0); ctx.stroke(); ctx.restore();
    }
    if (n >= 2) {                                    // 꽃
      const fu = EASE.outBack(clamp((now() - PL.doneT) / 0.8, 0, 1)), r = 17 * fu;
      ctx.save(); ctx.translate(sw, top - 4); ctx.rotate(tt * 0.2);
      for (let k = 0; k < 6; k++) { ctx.rotate(TAU / 6); ctx.fillStyle = k % 2 ? '#fb7185' : '#f9a8d4'; ctx.beginPath(); ctx.ellipse(0, -r * 0.95, r * 0.5, r * 0.8, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(-1, -1, r * 0.22, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  function drawPledgeStatic() {                      // 다짐 목록 상자·다짐 카드 바탕·설명 상자: 한 번만 그려 둬요
    drawBackdrop();
    const L = LAY.act.pl;
    panelBase(L.list.x, L.list.y, L.list.w, L.list.h, { bg: 'rgba(255,255,255,.7)', r: 18 });
    panelBorder(L.list.x, L.list.y, L.list.w, L.list.h, { border: '#e2e8f0', r: 18 });
    PLEDGES.forEach((pl, i) => { const r = plRect(i); dropShadow(r.x, r.y, r.w, r.h, 14, 6, 2, 'rgba(20,40,30,.12)'); });
    const C = L.card;
    dropShadow(C.x, C.y, C.w, C.h, 20, 12, 3, 'rgba(30,60,40,.16)');
    rr(C.x, C.y, C.w, C.h, 20); ctx.fillStyle = lgrad(ctx, 0, C.y, 0, C.y + C.h, [[0, '#f3fbef'], [1, '#d9f0cf']]); ctx.fill();
    ctx.save(); rr(C.x, C.y, C.w, C.h, 20); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(C.x + C.w * 0.85, C.y + 30, 34, 0, TAU); ctx.fill(); ctx.restore();
    const Cp = LAY.act.pl.cap; panelBase(Cp.x, Cp.y, Cp.w, Cp.h);
  }
  function drawPledge(t) {
    layer('pledge', drawPledgeStatic);
    const L = LAY.act.pl, n = plCount();
    // 다짐 고르기
    PLEDGES.forEach((pl, i) => {
      const r = plRect(i), on = PL.sel[i], hov = S.plHov === i;
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); const sc = on ? 1.015 : hov ? 1.02 : 1; ctx.scale(sc, sc);
      if (on) { rr(-r.w / 2 - 3, -r.h / 2 - 3, r.w + 6, r.h + 6, 17); ctx.fillStyle = 'rgba(34,197,94,.16)'; ctx.fill(); }
      rr(-r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.fillStyle = on ? '#ecfdf5' : '#fff'; ctx.fill(); rr(-r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.strokeStyle = on ? '#22c55e' : '#d6dee8'; ctx.lineWidth = on ? 3 : 1.8; ctx.stroke();
      const isz = Math.round(r.h * 0.5);
      drawSpr(sprite('emo|' + pl.icon + '|' + isz, isz * 1.7, isz * 1.7, () => { ctx.font = isz + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(pl.icon, 0, 0); }), -r.w / 2 + 28, 1);
      txt(pl.text, -r.w / 2 + 54, 1, { size: TALL ? 14 : 15.5, weight: 800, color: '#1e293b', base: 'middle', max: r.w - 54 - 52, min: 13 });
      ctx.beginPath(); ctx.arc(r.w / 2 - 24, 0, 13, 0, TAU); ctx.fillStyle = on ? '#22c55e' : '#e2e8f0'; ctx.fill(); if (on) D.check(r.w / 2 - 24, 0, 11, 1);
      ctx.restore();
    });
    // 다짐 카드
    const C = L.card;
    rr(C.x, C.y, C.w, C.h, 20); ctx.strokeStyle = n >= 2 ? '#22c55e' : '#cfe5c6'; ctx.lineWidth = n >= 2 ? 3 : 2; ctx.stroke();
    ctx.save(); rr(C.x, C.y, C.w, C.h, 20); ctx.clip();
    drawPlant(C.x + C.w / 2, C.y + C.h - (TALL ? 88 : 82), C.h - (TALL ? 148 : 144), n, t);
    // 찾아오는 생물들
    const guests = ['🦋', '🐝', '🐞', '🐦'];
    guests.forEach((g, k) => { if (n < k + 2) return; const u = RM ? 0.3 : (t * 0.22 + k * 0.27) % 1, gx = C.x + C.w * (0.2 + 0.6 * ((k * 0.37 + u) % 1)), gy = C.y + C.h * 0.28 + Math.sin(t * 1.7 + k * 2) * 12 + k * 12, a = clamp(n - k - 1, 0, 1); emo(ctx, g, gx, gy, 22, { alpha: a, flip: Math.cos(t * 1.7 + k * 2) < 0 }); });
    ctx.restore();
    txt('나의 생물다양성 실천 다짐', C.x + C.w / 2, C.y + 28, { size: TALL ? 15 : 16.5, weight: 800, color: '#166534', align: 'center' });
    const picked = PLEDGES.filter((p, i) => PL.sel[i]);
    picked.slice(0, 3).forEach((p, i) => txt(i === 2 && picked.length > 3 ? '✓ … 외 ' + (picked.length - 2) + '가지' : '✓ ' + p.text, C.x + 18, C.y + C.h - 52 + i * 17, { size: 13, weight: 800, color: '#166534', max: C.w - 36, min: 13 }));
    if (n >= 2) { const u = EASE.outBack(clamp((now() - PL.doneT) / 0.6, 0, 1)); ctx.save(); ctx.translate(C.x + C.w - 14, C.y + 62); ctx.scale(u, u); ctx.rotate(-0.08); pill('🌱 다짐 완성!', 0, 0, { size: 14, align: 'right', bg: '#16a34a', pad: 12, h: 30, shadow: true }); ctx.restore(); }
    else txt('2가지 이상 골라요 (' + n + '/2)', C.x + C.w / 2, C.y + 52, { size: 13.5, weight: 800, color: '#64748b', align: 'center' });
    const Cp = L.cap; panelBorder(Cp.x, Cp.y, Cp.w, Cp.h, { border: n >= 2 ? '#86efac' : '#e2e8f0', bw: n >= 2 ? 2 : 1.5 });
    const fs = TALL ? 13.5 : 15.5, lh = TALL ? 19 : 22;
    para(n >= 2 ? '🎉 멋진 다짐이에요! 오늘부터 작은 실천을 시작해 봐요. 다짐을 고를수록 식물이 자라고 나비, 벌 같은 생물이 찾아와요.' : '내가 앞으로 실천할 약속을 2가지 이상 골라 보세요. 약속을 고를수록 식물이 자라고, 나비와 벌 같은 생물이 찾아와요.', Cp.x + 16, Cp.y + (TALL ? 28 : 32), Cp.w - 32, { size: fs, weight: 800, color: n >= 2 ? '#166534' : '#475569', lh });
    if (isNew('act') && ACT.mode === 'pledge') newRing({ x: L.list.x, y: L.list.y, w: L.card.x + L.card.w - L.list.x, h: L.list.h }, 18);
  }
  function drawActScene(t) {
    if (ACT.mode === 'sort') drawActSort(t); else drawPledge(t);
  }

  /* =========================================================
     장면 전환 · 안내 말풍선 · 입력
     ========================================================= */
  const SCENE_LABEL = { web: '🕸️ 먹이 그물 놀이: 한 종이 사라지면?', threat: '⚠️ 생물다양성을 위협하는 원인', fix: '🛡️ 보전 방법으로 개체 수 회복하기', act: '🤝 생물다양성을 지키는 실천' };
  const SCENE_BG = 'linear-gradient(180deg,#eef7f1,#dcebe2)';
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
    if (scene === 'threat' || scene === 'fix') { PM.mode = scene; PM.sel = null; PM.selPanel = null; snapPanels(false); }
    updateSceneUI(); hideHint();
  }
  function drawView(key, t) {
    if (key === 'web') drawWebScene(t); else if (key === 'threat') drawPanelsScene(t, false); else if (key === 'fix') drawPanelsScene(t, true); else drawActScene(t);
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
    const hp = (LAY[S.scene === 'threat' || S.scene === 'fix' ? 'panels' : S.scene] || {}).hint;
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
  // 자유 탐구에서만: 장면 안의 보조 단추
  let TOPB = [];
  function topSpec() {
    if (!(game && game.free)) return [];
    if (S.scene === 'threat') return [['threset', '↺ 다시 하기']];
    if (S.scene === 'fix') return [['freset', '↺ 다시 하기']];
    if (S.scene === 'act') return ACT.mode === 'sort' ? [['areset', '↺ 다시 섞기'], ['pledge', '🌱 나의 다짐']] : [['plreset', '↺ 다시 고르기'], ['sort', '🤝 실천 분류']];
    return [];
  }
  function drawTopBtns() {
    TOPB = [];
    const spec = topSpec(); if (!spec.length) return;
    ctx.save(); ctx.font = font(13.5, 800);
    let x = W - 12;
    spec.slice().reverse().forEach(([id, label]) => { const w = ctx.measureText(label).width + 26, r = { id, label, x: x - w, y: 8, w, h: 32 }; x -= w + 8; TOPB.unshift(r); });
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
    if (id === 'threset') panelsReset('threat'); else if (id === 'freset') panelsReset('fix');
    else if (id === 'areset') actReset(); else if (id === 'pledge') ACT.mode = 'pledge'; else if (id === 'sort') ACT.mode = 'sort';
    else if (id === 'plreset') { PL.sel.fill(false); PL.grow = 0; }
    updateSceneUI();
  }
  function interactiveAt(p) {
    const sc = S.scene;
    if (sc === 'web') return !!webHit(p);
    if (sc === 'threat' || sc === 'fix') return !!cardAt(pcards(), p);
    if (sc === 'act') return ACT.mode === 'sort' ? !ACT.done && !!cardAt(ACT.cards, p) : PLEDGES.some((q, i) => inR(p, plRect(i)));
    return false;
  }
  const handlers = {
    hover(p) {
      { const tb = topAt(p); S.togHov = tb ? tb.id : null; if (tb) return 'pointer'; }
      const sc = S.scene;
      if (sc === 'web') return webHit(p) ? 'pointer' : null;
      if (sc === 'threat' || sc === 'fix') { const cd = cardAt(pcards(), p); return cd && !cd.locked ? 'grab' : cd || panelAt(p) >= 0 ? 'pointer' : null; }
      if (sc === 'act') {
        if (ACT.mode === 'pledge') { const i = PLEDGES.findIndex((q, k) => inR(p, plRect(k))); S.plHov = i >= 0 ? i : null; return i >= 0 ? 'pointer' : null; }
        const cd = cardAt(ACT.cards, p); return cd && !ACT.done ? 'grab' : cd || actBoxAt(p) >= 0 ? 'pointer' : null;
      }
      return null;
    },
    down(p) {
      hideHint();
      { const tb = topAt(p); if (tb) { topAct(tb.id); return false; } }
      const sc = S.scene;
      if (sc === 'web') { const h = webHit(p); if (h) webToggle(h.ei, h.i); return false; }
      if (sc === 'threat' || sc === 'fix') {
        const cd = cardAt(pcards(), p);
        if (cd) { PM.sel = cd; PM.msg = ''; PM.selPanel = null; PM.msgT = now(); if (!cd.locked) return dragSetup(cd, 'pn', pcards(), p); Sound.tick(); return false; }
        const pi = panelAt(p); if (pi >= 0) { PM.selPanel = PM.selPanel === pi ? null : pi; PM.sel = null; Sound.tone(520 + pi * 80, 0.1, 'triangle', 0.06); }
        return false;
      }
      if (sc === 'act') {
        if (ACT.mode === 'pledge') { for (let i = 0; i < PLEDGES.length; i++) if (inR(p, plRect(i))) { plToggle(i); break; } return false; }
        const cd = cardAt(ACT.cards, p);
        if (cd) { ACT.sel = cd.id; ACT.selBox = null; if (!ACT.done) return dragSetup(cd, 'act', ACT.cards, p); Sound.tick(); return false; }
        const bi = actBoxAt(p); if (bi >= 0) { ACT.selBox = ACT.selBox === bi ? null : bi; ACT.sel = null; Sound.tone(520 + bi * 120, 0.1, 'triangle', 0.06); }
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
      if (d.set === 'pn') {
        if (!d.moved) { snapPanels(true); return; }
        const pi = panelAt(p);
        if (pi >= 0) { if (PM.mode === 'fix') fixDrop(cd, pi); else causeAssign(cd, pi); } else { cd.panel = -1; snapPanels(true); Sound.tick(); }
        return;
      }
      if (!d.moved) { actSnap(true); return; }
      const bi = actBoxAt(p);
      if (bi >= 0) actAssign(cd, bi); else { cd.box = -1; actSnap(true); Sound.tick(); }
    },
  };

  /* =========================================================
     HTML 조작 · 상태 갱신
     ========================================================= */
  const oWeb = $('#oWeb'), btnRestore = $('#btnRestore');
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.scene); }));
  btnRestore.addEventListener('click', () => { Sound.click(); hideHint(); ECOS.forEach((E, ei) => { E.sp.forEach((k, i) => { if (E.rem[i]) webToggle(ei, i); }); }); WB.cmpT = 0; });
  function updateWebUI() {
    const a = ECOS[0].rem.filter(Boolean).length, b = ECOS[1].rem.filter(Boolean).length;
    oWeb.textContent = '없앤 생물 ' + (a + b);
    btnRestore.disabled = a + b === 0;
  }
  function updateSceneUI() {
    if (view) view.wrap.style.setProperty('--stage-bg', SCENE_BG);
    $$('#sceneSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.scene === S.scene); b.setAttribute('aria-selected', b.dataset.scene === S.scene ? 'true' : 'false'); });
    const showWeb = S.scene === 'web';
    $('#ctrlWeb').hidden = !showWeb; $('#ctrlCard').hidden = !showWeb;
    fitLabel(); updateWebUI();
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
  let uiTick = 0;
  function update(dt, t) {
    [CAUSE, FIXC, ACT.cards].forEach((list) => list.forEach((cd) => { cd.lift = SciSim.approach(cd.lift, S.drag && S.drag.card === cd ? 1 : 0, dt, 14); }));
    webUpdate(dt); panelsUpdate(dt);
    PL.grow = SciSim.approach(PL.grow, Math.min(1, plCount() / 3), dt, 3.5);
    uiTick += dt; if (uiTick > 0.15) { uiTick = 0; updateWebUI(); }
    PFX.update(dt);
  }

  /* =========================================================
     단계와 미션
     ========================================================= */
  const mark = (ok) => (ok ? '✅' : '⬜');
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '먹이 그물 놀이', short: '먹이 그물', icon: '🕸️', phase: '관찰',
      features: ['web'],
      intro: '<p class="si-q">❓ 탐구 질문: 생물 한 종이 사라지면 생태계에는 어떤 일이 생길까?</p>' +
        '<p>생물들은 서로 먹고 먹히며 <b>먹이 그물</b>처럼 연결되어 있어요. <b>단순한 생태계</b>(종 4가지)와 <b>복잡한 생태계</b>(종 10가지)에서 생물을 하나씩 없애 보며 어떤 일이 생기는지 관찰해요.</p>',
      setup() { setView('web', true); },
      recap: '종이 다양하고 먹이 그물이 복잡할수록, 한 종이 사라져도 다른 생물이 버틸 수 있어 생태계가 <b>안정</b>해요.',
      summary: '<ul><li><b>먹이 그물</b>: 여러 먹이 사슬이 서로 얽혀 그물처럼 연결된 것</li>' +
        '<li>종이 단순한 생태계에서는 한 종이 사라지면, 그 종을 먹거나 그 종에게 먹히던 종도 크게 변하거나 사라지기 쉬워요.</li>' +
        '<li>종이 다양한 생태계에서는 다른 먹이와 다른 포식자가 있어서 영향이 작아요. → 생물다양성이 높을수록 생태계가 <b>안정</b>해요.</li>' +
        '<li>풀 같은 <b>생산자</b>처럼 많은 종의 바탕이 되는 생물이 사라지면 영향이 커요.</li></ul>',
      missions: [
        {
          title: '같은 생물 없애서 비교하기',
          goal: '두 생태계에서 <b>같은 생물</b>(예: 개구리)을 눌러 없애고, 막대그래프와 \'영향 받은 종\'이 어떻게 다른지 비교해 보세요.',
          hint: '개구리·뱀·메뚜기·풀은 두 생태계에 모두 있어요. 같은 생물을 한 번씩 눌러 보고 4초쯤 지켜보세요.',
          setup() { setView('web'); webReset(true); updateSceneUI(); showHint('🐸 두 생태계에서 같은 생물을 눌러 없애 보세요', 6500); },
          check: () => WB.cmpT >= 4,
          hold: 0.5,
          status: () => '같은 생물 없애기 ' + mark(E_common()) + ' · 비교하는 시간 <b>' + Math.min(4, WB.cmpT).toFixed(1) + ' / 4초</b>',
          explain: '같은 생물이 사라졌는데, <b>단순한 생태계</b>에서는 그 생물과 먹고 먹히던 종이 모두 크게 흔들렸고 한 종은 사라지기도 했어요. 반면 <b>복잡한 생태계</b>에서는 다른 먹이와 다른 포식자가 있어서 영향을 받은 종이 적었어요.',
        },
        {
          title: '가장 큰 영향을 주는 생물 찾기',
          goal: '<b>복잡한 생태계</b>의 생물을 하나씩 없애 보면서, 없앴을 때 <b>영향 받은 종이 5종 이상</b>이 되는 생물을 찾아보세요.',
          hint: '많은 생물이 먹이로 삼는 생물을 없애면 어떻게 될까요? 풀이나 나무처럼 먹이 그물의 바탕이 되는 생물을 눌러 보세요.',
          setup() { setView('web'); webReset(false); updateSceneUI(); showHint('🌳 복잡한 생태계의 생물을 하나씩 눌러 보세요', 6500); },
          check: () => WB.maxAff >= 5,
          hold: 0.5,
          status: () => '가장 많이 영향 받은 종: <b>' + WB.maxAff + ' / 9</b>종 (5종 이상) ' + mark(WB.maxAff >= 5),
          explain: '<b>풀</b> 같은 생산자는 많은 생물의 먹이라서 사라지면 거의 모든 생물이 영향을 받아요. 종이 다양해도 먹이 그물의 바탕이 되는 생물은 특히 중요해요.',
        },
        {
          type: 'quiz',
          title: '생태계가 안정해지는 까닭',
          goal: '종이 다양한 생태계가 한 종이 사라져도 <b>덜 흔들리는</b> 까닭은?',
          setup() { setView('web'); updateSceneUI(); },
          choices: [
            '먹이 사슬이 단순할수록 한 종이 사라져도 안전하다',
            '종이 많을수록 생태계는 더 쉽게 무너진다',
            '종이 다양하면 한 종이 사라져도 다른 먹이나 다른 포식자가 있어서 영향이 작다',
            '어떤 생태계에서든 한 종이 사라지면 똑같이 크게 흔들린다',
          ],
          answer: 2,
          feedback: [
            '단순한 생태계에서는 한 종이 사라지면 다른 종도 함께 사라질 수 있어요. 앞에서 뱀이 어떻게 되었나요?',
            '반대예요. 종이 다양할수록 먹이 그물이 촘촘해서 더 안정해요.',
            '',
            '복잡한 생태계에서는 영향이 훨씬 작았어요. 두 생태계의 결과를 비교해 봐요.',
          ],
          explain: '생물다양성이 높은(종이 다양한) 생태계는 먹이 그물이 복잡해서 한 종이 사라져도 다른 종이 그 역할을 대신할 수 있어 <b>더 안정</b>해요. 이것이 생물다양성을 보전해야 하는 까닭 중 하나예요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '생물다양성을 위협하는 요인', short: '위협 요인', icon: '⚠️', phase: '탐구',
      features: ['threat'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한 종이 사라지면 생태계가 흔들릴 수 있다는 것을 알았어요.</div>' +
        '<p>그럼 생물은 왜 사라질까요? 다섯 가지 <b>시나리오</b>를 보고, 생물다양성을 위협하는 <b>원인</b>을 찾아봐요.</p>',
      setup() { setView('threat', true); },
      recap: '생물다양성을 위협하는 요인에는 <b>서식지 파괴, 외래종 유입, 남획, 환경 오염, 기후변화</b>가 있어요.',
      summary: '<ul><li><b>서식지 파괴</b>: 생물이 사는 곳이 개발로 없어지거나 갈라져요. (예: 숲에 도로)</li>' +
        '<li><b>외래종 유입</b>: 다른 지역의 생물이 들어와 토종 생물을 위협해요. (황소개구리·뉴트리아·큰입배스)</li>' +
        '<li><b>남획</b>: 생물을 필요 이상으로 너무 많이 잡아요.</li>' +
        '<li><b>환경 오염</b>: 폐수·쓰레기 등으로 생물이 사는 환경이 나빠져요.</li>' +
        '<li><b>기후변화</b>: 지구의 평균 기온이 올라 생물이 살기 어려워져요.</li></ul>',
      missions: [
        {
          title: '시나리오의 원인 맞히기',
          manual: true,
          goal: '5개의 시나리오를 읽고 알맞은 <b>원인 카드</b>를 끌어 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '그림 속 개체 수가 어떻게 줄어드는지 살펴봐요. 도로, 다른 나라에서 온 생물, 그물, 폐수, 높아지는 기온이 단서예요.',
          setup() { setView('threat'); panelsReset('threat'); showHint('🏷️ 원인 카드를 알맞은 시나리오에 끌어 놓아요', 6500); },
          status: () => '놓은 카드: <b>' + CAUSE.filter((c) => c.panel >= 0).length + ' / 5</b>',
          check() { return causeCheck(); },
          explain: '숲에 도로가 생기면 <b>서식지 파괴</b>, 황소개구리가 퍼지면 <b>외래종 유입</b>, 물고기를 너무 많이 잡으면 <b>남획</b>, 폐수가 흘러들면 <b>환경 오염</b>, 기온이 오르면 <b>기후변화</b>예요. 모두 개체 수를 줄여 생물다양성을 위협해요.',
        },
        {
          type: 'quiz',
          title: '위협 요인과 예 짝짓기',
          goal: '다음 중 위협 요인과 예가 <b>바르게</b> 짝지어진 것은?',
          setup() { setView('threat'); if (!PM.checked) causeSolve(); },
          choices: [
            '서식지 파괴 — 희귀한 물고기를 마구 잡는 것',
            '외래종 유입 — 사람이 들여온 뉴트리아가 강가에 퍼지는 것',
            '환경 오염 — 지구의 평균 기온이 올라가는 것',
            '남획 — 습지를 메워 아파트 단지를 짓는 것',
          ],
          answer: 1,
          feedback: [
            '희귀한 물고기를 마구 잡는 것은 남획이에요. 서식지 파괴는 생물이 사는 곳이 없어지거나 갈라지는 것이에요.',
            '',
            '평균 기온이 올라가는 것은 기후변화예요. 환경 오염은 폐수·쓰레기 등으로 환경이 나빠지는 것이에요.',
            '습지를 메워 아파트를 짓는 것은 서식지 파괴예요. 남획은 생물을 너무 많이 잡는 것이에요.',
          ],
          explain: '<b>외래종 유입</b>은 원래 살지 않던 지역의 생물이 들어와 토종 생물을 위협하는 것이에요. 뉴트리아는 사람이 들여온 대표적인 외래종이에요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '생물다양성을 지키는 방법', short: '보전 방법', icon: '🛡️', phase: '설명',
      features: ['fix'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 생물다양성을 위협하는 다섯 가지 원인을 알아보았어요.</div>' +
        '<p>이번에는 같은 시나리오에 <b>해결책</b>을 적용해 봐요. 알맞은 해결책을 끌어 놓으면 줄었던 개체 수가 다시 회복되는 모습을 볼 수 있어요.</p>',
      setup() { setView('fix', true); },
      recap: '원인에 알맞은 보전 방법(<b>생태 통로, 외래종 관리, 보호 구역 지정, 오염 줄이기, 종자 은행·복원 사업</b>)을 쓰면 개체 수를 회복시킬 수 있어요.',
      summary: '<ul><li><b>생태 통로</b>: 도로 때문에 갈라진 서식지를 이어 줘요. (서식지 파괴)</li>' +
        '<li><b>외래종 관리</b>: 외래종이 더 퍼지지 않게 막고 줄여요. (외래종 유입)</li>' +
        '<li><b>보호 구역 지정</b>: 중요한 서식지에서 잡는 것을 제한해요. (남획)</li>' +
        '<li><b>오염 줄이기</b>: 폐수를 정화하고 쓰레기를 줄여요. (환경 오염)</li>' +
        '<li><b>종자 은행·복원 사업</b>: 씨앗을 보관하고 사라진 곳에 다시 심어요. (기후변화·멸종 위기)</li>' +
        '<li>보전해야 하는 까닭: 생태계의 <b>안정</b>, 식량·약품 같은 <b>자원</b>, 모든 <b>생명의 소중함</b></li></ul>',
      missions: [
        {
          title: '해결책 짝 맞추기',
          goal: '해결책 카드 5장을 알맞은 시나리오에 끌어 놓아 보세요. 알맞게 놓으면 개체 수가 다시 늘어나요!',
          hint: '도로로 갈라진 숲에는 길을 이어 주는 방법, 그물로 너무 많이 잡은 바다에는 잡는 것을 제한하는 방법이 필요해요.',
          setup() { setView('fix'); panelsReset('fix'); showHint('🛠️ 해결책 카드를 시나리오에 끌어 놓아요', 6500); },
          check: () => PM.solved >= 5,
          hold: 1.0,
          status: () => '해결한 시나리오: <b>' + PM.solved + ' / 5</b> ' + mark(PM.solved >= 5),
          explain: '<b>서식지 파괴</b> → 생태 통로, <b>외래종 유입</b> → 외래종 관리, <b>남획</b> → 보호 구역 지정, <b>환경 오염</b> → 오염 줄이기, <b>기후변화</b> → 종자 은행·복원 사업이에요. (기후변화는 온실가스를 줄이는 노력도 함께 필요해요.)',
        },
        {
          type: 'quiz',
          title: '보전해야 하는 까닭',
          goal: '생물다양성을 보전해야 하는 까닭으로 <b>알맞지 않은</b> 것은?',
          setup() { setView('fix'); if (PM.solved < 5) fixSolve(); },
          choices: [
            '생태계가 안정하게 유지되도록 하려고',
            '식량·약품·목재 같은 자원을 계속 얻으려고',
            '모든 생명이 소중하고, 다음 세대에게도 물려주어야 하니까',
            '사람에게 당장 이익이 없는 생물은 사라져도 괜찮으니까',
          ],
          answer: 3,
          feedback: [
            '알맞은 까닭이에요. 먹이 그물이 복잡할수록 생태계가 안정해요. 알맞지 않은 것을 골라 보세요.',
            '알맞은 까닭이에요. 생물은 우리에게 식량과 약품 등 다양한 자원을 줘요. 알맞지 않은 것을 골라 보세요.',
            '알맞은 까닭이에요. 모든 생명을 존중하는 마음도 중요해요. 알맞지 않은 것을 골라 보세요.',
            '',
          ],
          explain: '생물다양성을 보전하는 까닭은 생태계의 <b>안정</b>, 사람에게 필요한 <b>자원</b>, 모든 <b>생명의 소중함</b> 때문이에요. 당장 이익이 없어 보이는 생물도 먹이 그물의 한 부분이라 사라지면 생태계가 흔들릴 수 있어요.',
        },
        {
          type: 'quiz',
          title: '황소개구리 문제 해결하기',
          goal: '황소개구리 때문에 토종 생물이 줄어드는 문제를 해결하는 방안으로 가장 알맞은 것은?',
          setup() { setView('fix'); if (PM.solved < 5) fixSolve(); },
          choices: [
            '황소개구리를 더 많은 연못에 풀어 준다',
            '황소개구리가 더 퍼지지 않도록 관리하고, 이미 퍼진 것은 줄인다',
            '토종 생물을 모두 잡아 동물원에서만 키운다',
            '아무것도 하지 않고 자연에 맡긴다',
          ],
          answer: 1,
          feedback: [
            '외래종을 더 퍼뜨리면 토종 생물이 더 많이 줄어들어요.',
            '',
            '생물은 원래 사는 곳에서 지키는 것이 중요해요. 서식지와 생태계를 함께 지켜야 해요.',
            '외래종은 천적이 적어 빠르게 늘 수 있어서, 사람이 관리해 주어야 해요.',
          ],
          explain: '외래종은 퍼지지 않게 막고 이미 퍼진 것은 줄이는 <b>외래종 관리</b>가 필요해요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '생물다양성 지키기 실천', short: '실천', icon: '🤝', phase: '적용',
      features: ['act'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 위협 요인과 보전 방법을 알아보았어요.</div>' +
        '<p>생물다양성을 지키는 일은 <b>개인</b>의 작은 실천과 <b>사회</b>의 큰 노력이 함께할 때 가장 큰 힘이 돼요. 지금의 필요를 채우면서도 다음 세대의 자연을 지키는 <b>지속가능한 생활</b>을 함께 찾아봐요.</p>',
      setup() { setView('act', true); ACT.mode = 'sort'; },
      recap: '생물다양성은 <b>개인의 실천</b>(일회용품 줄이기 등)과 <b>사회의 노력</b>(법·국제 협약, 보호 구역 등)이 함께할 때 잘 지킬 수 있어요.',
      summary: '<ul><li><b>개인의 실천</b>: 일회용품 줄이기, 쓰레기 분리배출, 외래 생물 함부로 버리지 않기, 걷기·대중교통 이용하기</li>' +
        '<li><b>사회의 실천</b>: 법·제도 만들기, 국제 협약, 보호 구역 지정, 생태 통로·복원 사업</li>' +
        '<li>개인과 사회가 함께 노력하는 <b>지속가능한 생활</b>이 생물다양성을 지켜요.</li></ul>',
      missions: [
        {
          title: '개인의 실천 · 사회의 실천 나누기',
          manual: true,
          goal: '생물다양성을 지키는 방법 카드 8장을 <b>개인의 실천</b>과 <b>사회의 실천</b> 상자로 나눈 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '혼자 일상에서 할 수 있으면 개인, 나라나 여러 사람이 함께 해야 하면 사회예요. 카드를 누르면 힌트가 나와요.',
          setup() { setView('act'); ACT.mode = 'sort'; actReset(); updateSceneUI(); showHint('🃏 실천 카드를 개인·사회 상자에 끌어 놓아요', 6500); },
          status: () => '넣은 카드: <b>' + ACT.cards.filter((c) => c.box >= 0).length + ' / 8</b>',
          check() { return actCheck(); },
          explain: '<b>개인의 실천</b>: 일회용품 줄이기, 분리배출, 외래 생물 함부로 버리지 않기, 걷기·대중교통 타기. <b>사회의 실천</b>: 법과 국제 협약, 보호 구역 지정, 생태 통로·복원 사업.',
        },
        {
          title: '나의 실천 다짐 고르기',
          goal: '내가 앞으로 실천할 약속을 <b>2가지 이상</b> 골라 보세요.',
          hint: '오늘부터 할 수 있는 일을 골라 봐요. 약속을 고를수록 식물이 자라고 나비와 벌이 찾아와요.',
          setup() { setView('act'); ACT.mode = 'pledge'; PL.sel.fill(false); PL.grow = 0; PL.doneT = -9; updateSceneUI(); showHint('🌱 실천하고 싶은 약속을 2가지 이상 골라요', 6500); },
          check: () => plCount() >= 2,
          hold: 0.8,
          status: () => '고른 다짐: <b>' + plCount() + ' / 2</b> ' + mark(plCount() >= 2),
          explain: '작은 실천도 모이면 큰 힘이 돼요. 일상에서 내가 할 수 있는 일을 꾸준히 실천하면 우리 동네의 생물다양성을 지킬 수 있어요.',
        },
        {
          type: 'quiz',
          title: '키우던 외래 거북은 어떻게 할까?',
          goal: '집에서 키우던 붉은귀거북이 너무 커져서 키우기 힘들어졌어요. 강에 풀어 주면 안 되는 까닭은?',
          setup() { setView('act'); ACT.mode = 'sort'; if (!ACT.done) actSolve(); updateSceneUI(); },
          choices: [
            '강에는 먹이가 없어서 바로 죽기 때문에',
            '외래종이 자연에 퍼져 토종 생물의 먹이와 살 곳을 빼앗을 수 있기 때문에',
            '거북은 물에서 살 수 없기 때문에',
            '거북을 키우는 것은 법으로 모두 금지되어 있기 때문에',
          ],
          answer: 1,
          feedback: [
            '오히려 먹이를 잘 구해 퍼질 수 있어서 문제예요. 그러면 토종 생물이 위협받아요.',
            '',
            '거북은 물에서도 살아요. 문제는 외래종이 자연에 퍼지는 것이에요.',
            '키우는 것 자체가 모두 금지된 것은 아니에요. 함부로 자연에 풀어 놓는 것이 문제예요.',
          ],
          explain: '외래종을 자연에 함부로 풀어 놓으면 토종 생물의 먹이와 살 곳을 빼앗아 생물다양성이 줄어들 수 있어요. 끝까지 책임지고 키우거나, 키우기 어려우면 알맞은 방법으로 도움을 구해야 해요.',
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
    LAY = computeLayouts();
    S.drag = null; S.snapOK = false;
    view = SciSim.stage(cv, { width: W, height: H, background: BG });
    ctx = view.ctx; D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    if (TALL) {
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => { const tc = e.touches[0]; if (tc && interactiveAt(view.toLocal(tc))) e.preventDefault(); }, { passive: false });
    }
    lineCache.clear(); SHC.clear();
    snapPanels(false); actSnap(false);
    updateSceneUI();
  }
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  webReset(true); panelsReset('threat'); panelsReset('fix'); actReset();

  game = SciSim.game({
    simId: 'm1-biodiversity',
    mount: '#game',
    badge: '생물다양성 지킴이',
    homeHref: '../../index.html#g1',
    featureLabels: {
      web: '🕸️ 먹이 그물 · 두 생태계 비교',
      threat: '⚠️ 시나리오 5가지 · 원인 카드',
      fix: '🛡️ 해결책 카드 · 개체 수 회복',
      act: '🤝 개인·사회의 실천 · 나의 다짐',
    },
    onFeatures() { updateSceneUI(); },
    onMissionStart() { hideHint(); },
    onComplete() { updateSceneUI(); },
    levels,
  });
  updateSceneUI();

  // 테스트·점검용
  window.__sim = {
    S, WB, ECOS, PN, PM, CAUSE, FIXC, ACT, PL, game, TOPB: () => TOPB, setView, LAY: () => LAY, KIND: () => KIND, THREATS, webStats, webToggle, webReset, causeSolve, fixSolve, actSolve, panelsReset, actReset, plToggle,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
    nodePoint(ei, i) { const N = nodeAt(ei, i); return this.toClient(N.x, N.y); },
    cardPoint(list, pred) { const cd = list.find(pred); return this.toClient(cd.x + cd.w / 2, cd.y + cd.h / 2); },
    panelPoint(i) { const r = panelRect(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    actBoxPoint(i) { const r = LAY.act.box[i]; return this.toClient(r.x + r.w / 2, r.y + r.h * 0.62); },
    pledgePoint(i) { const r = plRect(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
  };

  SciSim.loop((dt, t) => {
    update(dt, t);
    draw(t);
  });
})();
