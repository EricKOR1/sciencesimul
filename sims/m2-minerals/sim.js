/* =========================================================
   중2 Ⅱ. 지권의 변화 - 광물의 특성  [9과09-02]
   탐구 흐름(4단계):
   ① 관찰: 광물 표본의 겉보기 색 관찰 → 색만으로는 구별하기 어려움(금·황동석·황철석, 석영·방해석)
   ② 실험: 조흔판에 긁어 조흔색 확인 (금: 노란색, 황동석: 녹흑색, 황철석: 검은색)
   ③ 실험: 굳기(석영으로 방해석 긁기) · 묽은 염산(방해석에서 거품) · 자성(자철석에 클립)
   ④ 적용: 이름 모를 광물 3개 감정, 광물·암석의 활용과 유한한 자원
   범위: 광물의 특성은 색, 조흔색, 굳기, 염산 반응, 자성만 다루고, 굳기는 방해석과 석영만 비교
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
  const FRAME = '#0d1626';

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
     광물 자료
     ========================================================= */
  const MINERALS = [
    { id: 'gold', name: '금', color: '노란색', streak: '노란색', streakCol: '#e8b800', swatch: '#e6b422', kind: 'gold', yaw: 0.5, pitch: 0.42, hint: '황금빛으로 반짝여요.' },
    { id: 'chalco', name: '황동석', color: '노란색', streak: '녹흑색', streakCol: '#25382c', swatch: '#cfa83a', kind: 'chalco', yaw: 0.9, pitch: 0.4, hint: '놋쇠 같은 노란색이에요.' },
    { id: 'pyrite', name: '황철석', color: '노란색', streak: '검은색', streakCol: '#1b1b1f', swatch: '#d6bf55', kind: 'pyrite', yaw: 0.6, pitch: 0.38, hint: '정육면체 모양 결정이 많아요.' },
    { id: 'quartz', name: '석영', color: '투명한 흰색', streak: '흰색', streakCol: '#f1f1ec', swatch: '#e4eff7', kind: 'quartz', yaw: 0.4, pitch: 0.18, hint: '유리처럼 맑고 투명해요.' },
    { id: 'calcite', name: '방해석', color: '투명한 흰색', streak: '흰색', streakCol: '#f1efe6', swatch: '#efeadf', kind: 'calcite', yaw: 1.0, pitch: 0.55, acid: true, hint: '마름모꼴로 쪼개져요.' },
    { id: 'magnetite', name: '자철석', color: '검은색', streak: '검은색', streakCol: '#19191e', swatch: '#2b2d35', kind: 'magnetite', yaw: 0.5, pitch: 0.35, mag: true, hint: '팔면체 결정이 모여 있어요.' },
    { id: 'feldspar', name: '장석', color: '흰색·분홍색', swatch: '#e8c9c0', kind: 'feldspar', yaw: 0.6, pitch: 0.4 },
    { id: 'granite', name: '화강암', color: '밝은 회색', swatch: '#cfc8c2', kind: 'granite', yaw: 0.6, pitch: 0.4 },
  ];
  const MN = {}; MINERALS.forEach((m) => (MN[m.id] = m));
  const SHELF = ['gold', 'chalco', 'pyrite', 'quartz', 'calcite', 'magnetite'];

  /* =========================================================
     3차원 표본 만들기 (면이 보이는 다면체) · 그리기
     ========================================================= */
  function vnorm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function icoMesh(sub) {
    const t = (1 + Math.sqrt(5)) / 2;
    let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(vnorm);
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let s = 0; s < sub; s++) {
      const cache = {}, NF = [];
      const mid = (a, b) => {
        const k = a < b ? a + '_' + b : b + '_' + a;
        if (cache[k] != null) return cache[k];
        V.push(vnorm([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2])); return (cache[k] = V.length - 1);
      };
      F.forEach((f) => { const a = mid(f[0], f[1]), b = mid(f[1], f[2]), c = mid(f[2], f[0]); NF.push([f[0], a, c], [f[1], b, a], [f[2], c, b], [a, b, c]); });
      F = NF;
    }
    return { V, F };
  }
  function eulerRot(v, rx, ry, rz) {
    let [x, y, z] = v, c, s, t;
    c = Math.cos(rx); s = Math.sin(rx); t = y * c - z * s; z = y * s + z * c; y = t;
    c = Math.cos(ry); s = Math.sin(ry); t = x * c + z * s; z = -x * s + z * c; x = t;
    c = Math.cos(rz); s = Math.sin(rz); t = x * c - y * s; y = x * s + y * c; x = t;
    return [x, y, z];
  }
  // 한 덩어리(볼록 입체) 더하기
  function addSolid(M, V, F, o) {
    o = o || {};
    const sc = o.scale || [1, 1, 1], rot = o.rot || [0, 0, 0], pos = o.pos || [0, 0, 0], base = M.V.length, si = M.centers.length;
    const tv = V.map((v) => { const r = eulerRot([v[0] * sc[0], v[1] * sc[1], v[2] * sc[2]], rot[0], rot[1], rot[2]); return [r[0] + pos[0], r[1] + pos[1], r[2] + pos[2]]; });
    tv.forEach((v) => M.V.push(v));
    const cen = [0, 0, 0]; tv.forEach((v) => { cen[0] += v[0]; cen[1] += v[1]; cen[2] += v[2]; }); cen[0] /= tv.length; cen[1] /= tv.length; cen[2] /= tv.length;
    if (o.center) { cen[0] = o.center[0] + pos[0]; cen[1] = o.center[1] + pos[1]; cen[2] = o.center[2] + pos[2]; }
    M.centers.push(cen);
    F.forEach((f) => M.F.push({ idx: f.map((i) => i + base), solid: si, quad: f.length === 4 }));
  }
  function cubeGeom() {
    const V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    const F = [[4, 5, 6, 7], [1, 0, 3, 2], [5, 1, 2, 6], [0, 4, 7, 3], [7, 6, 2, 3], [0, 1, 5, 4]];
    return { V, F };
  }
  function octaGeom() {
    const V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const F = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
    return { V, F };
  }
  function prismGeom(r, h, tip) {
    const V = [], F = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; V.push([Math.cos(a) * r, -h / 2, Math.sin(a) * r]); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; V.push([Math.cos(a) * r, h / 2, Math.sin(a) * r]); }
    V.push([0, h / 2 + tip, 0]);
    for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; F.push([i, j, 6 + j, 6 + i]); F.push([6 + i, 6 + j, 12]); }
    F.push([5, 4, 3, 2, 1, 0]);
    return { V, F };
  }
  function rhombGeom(theta) {
    const a = [0, 1, 2].map((i) => { const ph = i / 3 * TAU; return [Math.sin(theta) * Math.cos(ph), Math.cos(theta), Math.sin(theta) * Math.sin(ph)]; });
    const V = [], idx = (s) => s[0] * 4 + s[1] * 2 + s[2];
    for (let s0 = 0; s0 < 2; s0++) for (let s1 = 0; s1 < 2; s1++) for (let s2 = 0; s2 < 2; s2++) V.push([a[0][0] * s0 + a[1][0] * s1 + a[2][0] * s2 - (a[0][0] + a[1][0] + a[2][0]) / 2, a[0][1] * s0 + a[1][1] * s1 + a[2][1] * s2 - (a[0][1] + a[1][1] + a[2][1]) / 2, a[0][2] * s0 + a[1][2] * s1 + a[2][2] * s2 - (a[0][2] + a[1][2] + a[2][2]) / 2]);
    const F = [];
    [[0, 1, 2], [0, 2, 1], [1, 2, 0]].forEach((p) => {
      for (let k = 0; k < 2; k++) {
        const base = [0, 0, 0]; base[p[2]] = k;
        const A = base.slice(), B = base.slice(), C = base.slice(), D = base.slice();
        B[p[0]] = 1; C[p[0]] = 1; C[p[1]] = 1; D[p[1]] = 1;
        F.push([idx(A), idx(B), idx(C), idx(D)]);
      }
    });
    return { V, F };
  }
  // 울퉁불퉁한 덩어리 (사인 무늬로 변형한 구)
  function lumpGeom(seed, sub, amp, freq, sc) {
    const r = rng(seed), g = icoMesh(sub), K = [];
    for (let i = 0; i < 7; i++) { const d = vnorm([r() - 0.5, r() - 0.5, r() - 0.5]), f = freq * (0.6 + r() * 0.9); K.push({ d, f, p: r() * TAU, a: amp * (0.5 + r() * 0.7) }); }
    const V = g.V.map((v) => {
      let rr = 1; K.forEach((k) => { rr += k.a * Math.sin((v[0] * k.d[0] + v[1] * k.d[1] + v[2] * k.d[2]) * k.f + k.p); });
      return [v[0] * rr * sc[0], v[1] * rr * sc[1], v[2] * rr * sc[2]];
    });
    return { V, F: g.F };
  }
  function finalizeMesh(M, rscale, smoothN) {
    let R = 0; M.V.forEach((v) => { R = Math.max(R, Math.hypot(v[0], v[1], v[2])); });
    const k = (rscale || 1) / R;
    M.V = M.V.map((v) => [v[0] * k, v[1] * k, v[2] * k]);
    M.centers = M.centers.map((c) => [c[0] * k, c[1] * k, c[2] * k]);
    M.F.forEach((f, fi) => {
      const a = M.V[f.idx[0]], b = M.V[f.idx[1]], c = M.V[f.idx[2]];
      let n = vnorm([(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]);
      let cx = 0, cy = 0, cz = 0; f.idx.forEach((i) => { cx += M.V[i][0]; cy += M.V[i][1]; cz += M.V[i][2]; }); const nn = f.idx.length; cx /= nn; cy /= nn; cz /= nn;
      const cen = M.centers[f.solid];
      if (n[0] * (cx - cen[0]) + n[1] * (cy - cen[1]) + n[2] * (cz - cen[2]) < 0) n = [-n[0], -n[1], -n[2]];
      f.n = n; f.c = [cx, cy, cz]; f.h = hash2(fi, 7, 31);
      f.t = vnoise(cx * 2.3 + 5, cy * 2.3 + cz * 1.7, 9);   // 얼룩(녹슬음 무늬)용
    });
    if (smoothN) {
      const vn = M.V.map(() => [0, 0, 0]);
      M.F.forEach((f) => f.idx.forEach((i) => { vn[i][0] += f.n[0]; vn[i][1] += f.n[1]; vn[i][2] += f.n[2]; }));
      M.F.forEach((f) => { let a = 0, b = 0, c = 0; f.idx.forEach((i) => { a += vn[i][0]; b += vn[i][1]; c += vn[i][2]; }); f.n = vnorm([a, b, c]); });
    }
    M.px = new Float32Array(M.V.length); M.py = new Float32Array(M.V.length); M.pz = new Float32Array(M.V.length);
    M.fz = new Float32Array(M.F.length); M.fnz = new Float32Array(M.F.length); M.fnx = new Float32Array(M.F.length); M.fny = new Float32Array(M.F.length);
    M.order = M.F.map((f, i) => i);
    // 가루 무늬(화강암) 점
    M.dots = null;
    return M;
  }
  const meshes = {};
  function getMesh(id, lod) {
    const key = id + (lod ? '_lo' : '');
    if (meshes[key]) return meshes[key];
    const M = { V: [], F: [], centers: [] }, sub = lod ? 1 : 2;
    const d2r = DEG;
    if (id === 'gold') {
      let g = lumpGeom(11, sub, 0.17, 3.4, [1.18, 0.78, 0.96]); addSolid(M, g.V, g.F, { rot: [0.2, 0.5, 0.1] });
      g = lumpGeom(5, sub, 0.15, 3.8, [0.5, 0.36, 0.44]); addSolid(M, g.V, g.F, { pos: [0.95, -0.28, 0.2], rot: [0.4, 1, 0] });
      g = lumpGeom(8, 1, 0.12, 3, [0.28, 0.22, 0.26]); addSolid(M, g.V, g.F, { pos: [-0.85, -0.38, 0.4] });
    } else if (id === 'chalco') {
      let g = lumpGeom(23, sub, 0.15, 5.2, [1.1, 0.8, 0.95]); addSolid(M, g.V, g.F, { rot: [0.3, 0.2, 0.3] });
      g = lumpGeom(29, sub, 0.15, 5.6, [0.55, 0.42, 0.5]); addSolid(M, g.V, g.F, { pos: [0.9, -0.2, 0.3], rot: [0.5, 0.2, 0] });
    } else if (id === 'pyrite') {
      const c = cubeGeom();
      addSolid(M, c.V, c.F, { scale: [0.62, 0.62, 0.62], rot: [20 * d2r, 25 * d2r, 5 * d2r] });
      addSolid(M, c.V, c.F, { scale: [0.42, 0.42, 0.42], rot: [-15 * d2r, 50 * d2r, 10 * d2r], pos: [0.8, -0.2, 0.22] });
      addSolid(M, c.V, c.F, { scale: [0.34, 0.34, 0.34], rot: [30 * d2r, 10 * d2r, 40 * d2r], pos: [-0.66, -0.3, 0.38] });
      addSolid(M, c.V, c.F, { scale: [0.25, 0.25, 0.25], rot: [10 * d2r, 35 * d2r, 20 * d2r], pos: [0.18, -0.5, 0.72] });
    } else if (id === 'quartz') {
      let p = prismGeom(0.34, 1.5, 0.42); addSolid(M, p.V, p.F, { rot: [0.05, 0.3, -0.1] });
      p = prismGeom(0.26, 1.15, 0.34); addSolid(M, p.V, p.F, { rot: [0.1, 0.9, 0.42], pos: [-0.56, -0.18, 0.12] });
      p = prismGeom(0.22, 0.95, 0.28); addSolid(M, p.V, p.F, { rot: [-0.1, 0.2, -0.5], pos: [0.55, -0.28, 0.16] });
      p = prismGeom(0.15, 0.6, 0.2); addSolid(M, p.V, p.F, { rot: [0.3, 0.4, 0.15], pos: [0.12, -0.55, 0.52] });
    } else if (id === 'calcite') {
      const r = rhombGeom(40 * d2r);
      addSolid(M, r.V, r.F, { scale: [0.8, 0.8, 0.8], rot: [0.5, 0.3, 0.9] });
      addSolid(M, r.V, r.F, { scale: [0.46, 0.46, 0.46], rot: [0.9, 1.2, 0.2], pos: [0.78, -0.3, 0.26] });
    } else if (id === 'magnetite') {
      const o = octaGeom();
      addSolid(M, o.V, o.F, { scale: [0.66, 0.66, 0.66], rot: [18 * d2r, 30 * d2r, 8 * d2r] });
      addSolid(M, o.V, o.F, { scale: [0.42, 0.42, 0.42], rot: [-20 * d2r, 12 * d2r, 24 * d2r], pos: [0.78, -0.24, 0.2] });
      addSolid(M, o.V, o.F, { scale: [0.33, 0.33, 0.33], rot: [10 * d2r, 50 * d2r, 12 * d2r], pos: [-0.68, -0.3, 0.34] });
      addSolid(M, o.V, o.F, { scale: [0.22, 0.22, 0.22], rot: [30 * d2r, 20 * d2r, 40 * d2r], pos: [0.16, -0.5, 0.7] });
    } else if (id === 'feldspar') {
      const c = cubeGeom();
      addSolid(M, c.V, c.F, { scale: [0.78, 0.52, 0.6], rot: [10 * d2r, 28 * d2r, 4 * d2r] });
      addSolid(M, c.V, c.F, { scale: [0.4, 0.3, 0.36], rot: [-12 * d2r, 50 * d2r, 10 * d2r], pos: [0.78, -0.2, 0.3] });
    } else if (id === 'granite') {
      const g = lumpGeom(41, lod ? 1 : 2, 0.07, 2.6, [1.15, 0.78, 0.9]); addSolid(M, g.V, g.F, { rot: [0.2, 0.4, 0.1] });
    }
    finalizeMesh(M, 1, id === 'gold' || id === 'chalco' || id === 'granite');
    meshes[key] = M;
    return M;
  }
  const LIGHT = vnorm([-0.45, 0.62, 0.64]), HALF = vnorm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
  const METAL = {
    gold: { dark: [70, 42, 2], base: [226, 168, 18], light: [255, 238, 132], pow: 26, k: 1, j: 0.05, smooth: true },
    chalco: { dark: [70, 52, 16], base: [190, 150, 48], light: [238, 210, 112], pow: 20, k: 0.55, j: 0.1, tarnish: true, smooth: true },
    pyrite: { dark: [96, 84, 28], base: [210, 188, 72], light: [252, 240, 156], pow: 40, k: 1, j: 0.1, striate: true },
    magnetite: { dark: [10, 11, 16], base: [54, 58, 70], light: [168, 176, 196], pow: 46, k: 0.95, j: 0.14 },
    feldspar: { dark: [150, 108, 100], base: [232, 196, 186], light: [255, 240, 232], pow: 14, k: 0.18, j: 0.14, cleave: true },
    granite: { dark: [112, 106, 104], base: [196, 188, 184], light: [238, 232, 228], pow: 10, k: 0.1, j: 0.06, speckle: true, smooth: true },
  };
  const GLASS = {
    quartz: { tint: [214, 238, 255], shadow: [96, 132, 170], a: 0.3, edge: 'rgba(255,255,255,.8)' },
    calcite: { tint: [255, 250, 236], shadow: [138, 140, 138], a: 0.5, edge: 'rgba(255,252,238,.85)', cleave: true },
  };
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  const rgbs = (c) => 'rgb(' + (c[0] < 0 ? 0 : c[0] > 255 ? 255 : c[0] | 0) + ',' + (c[1] < 0 ? 0 : c[1] > 255 ? 255 : c[1] | 0) + ',' + (c[2] < 0 ? 0 : c[2] > 255 ? 255 : c[2] | 0) + ')';
  // 표본 그리기: (cx, cy)=가운데, s=반지름(px), rot={yaw,pitch}. 반환: 화면 윤곽(볼록 껍질)
  function drawSpecimen(ctx, id, cx, cy, s, rot, o) {
    o = o || {};
    const mn = MN[id], M = getMesh(id, s < 56), kind = mn.kind;
    const cyw = Math.cos(rot.yaw), syw = Math.sin(rot.yaw), cp = Math.cos(rot.pitch), sp = Math.sin(rot.pitch);
    const { V, F, px, py, pz, fz, fnx, fny, fnz, order } = M;
    for (let i = 0; i < V.length; i++) {
      const v = V[i], x1 = v[0] * cyw + v[2] * syw, z1 = -v[0] * syw + v[2] * cyw, y2 = v[1] * cp - z1 * sp, z2 = v[1] * sp + z1 * cp;
      px[i] = cx + x1 * s; py[i] = cy - y2 * s; pz[i] = z2;
    }
    for (let i = 0; i < F.length; i++) {
      const n = F[i].n, x1 = n[0] * cyw + n[2] * syw, z1 = -n[0] * syw + n[2] * cyw, y2 = n[1] * cp - z1 * sp, z2 = n[1] * sp + z1 * cp;
      fnx[i] = x1; fny[i] = y2; fnz[i] = z2;
      const c = F[i].idx; let d = 0; for (let k = 0; k < c.length; k++) d += pz[c[k]]; fz[i] = d / c.length;
    }
    order.sort((a, b) => fz[a] - fz[b]);
    const metal = METAL[kind], glass = GLASS[kind];
    const path = (f) => { const c = f.idx; ctx.beginPath(); ctx.moveTo(px[c[0]], py[c[0]]); for (let k = 1; k < c.length; k++) ctx.lineTo(px[c[k]], py[c[k]]); ctx.closePath(); };
    ctx.save();
    ctx.lineJoin = 'round';
    if (glass) {
      // 뒷면(안쪽)을 먼저, 은은하게
      for (let oi = 0; oi < order.length; oi++) {
        const i = order[oi]; if (fnz[i] > 0.02) continue;
        const f = F[i]; path(f);
        ctx.fillStyle = 'rgba(' + glass.tint[0] + ',' + glass.tint[1] + ',' + glass.tint[2] + ',' + (0.08 + 0.04 * f.h) + ')'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; ctx.stroke();
      }
      for (let oi = 0; oi < order.length; oi++) {
        const i = order[oi]; if (fnz[i] <= 0.02) continue;
        const f = F[i], nx = fnx[i], ny = fny[i], nz = fnz[i];
        const diff = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
        const sh = nx * HALF[0] + ny * HALF[1] + nz * HALF[2], spec = sh > 0 ? Math.pow(sh, 44) : 0;
        const gc = mix3(glass.shadow, glass.tint, Math.min(1, diff * 1.25)), a = glass.a * (0.75 + 0.45 * f.h) + 0.22 * diff;
        path(f); ctx.fillStyle = 'rgba(' + (gc[0] | 0) + ',' + (gc[1] | 0) + ',' + (gc[2] | 0) + ',' + Math.min(0.94, a) + ')'; ctx.fill();
        // 면 안쪽의 빛 번짐
        if (diff > 0.15 || spec > 0.05) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.85, 0.16 * diff + spec * 0.9) + ')'; ctx.fill(); }
        if (glass.cleave && f.quad && nz > 0.15) {
          const c = f.idx; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
          for (let q = 1; q <= 2; q++) {
            const t = q * 0.26, i0 = c[0], i1 = c[1], i2 = c[2], i3 = c[3];
            ctx.beginPath(); ctx.moveTo(px[i0] + (px[i3] - px[i0]) * t, py[i0] + (py[i3] - py[i0]) * t); ctx.lineTo(px[i1] + (px[i2] - px[i1]) * t, py[i1] + (py[i2] - py[i1]) * t); ctx.stroke();
          }
        }
        ctx.strokeStyle = glass.edge; ctx.lineWidth = 1.3; path(f); ctx.stroke();
      }
    } else {
      const st = metal || METAL.granite;
      let baseG = null;
      if (st.smooth) {
        // 부드러운 바탕 밝기 (구 모양 빛) 위에 면별 밝기를 겹쳐 울퉁불퉁함을 표현
        baseG = ctx.createRadialGradient(cx - s * 0.34, cy - s * 0.4, s * 0.05, cx - s * 0.1, cy - s * 0.1, s * 1.45);
        baseG.addColorStop(0, rgbs(st.light)); baseG.addColorStop(0.3, rgbs(mix3(st.light, st.base, 0.55))); baseG.addColorStop(0.62, rgbs(st.base)); baseG.addColorStop(1, rgbs(st.dark));
        const allP = new Path2D();
        for (let oi = 0; oi < order.length; oi++) {
          const i = order[oi]; if (fnz[i] <= 0) continue;
          const c = F[i].idx; allP.moveTo(px[c[0]], py[c[0]]); for (let k = 1; k < c.length; k++) allP.lineTo(px[c[k]], py[c[k]]); allP.closePath();
        }
        ctx.fillStyle = baseG; ctx.fill(allP); ctx.strokeStyle = baseG; ctx.lineWidth = 0.7; ctx.stroke(allP);
      }
      // 같은 색의 면은 한꺼번에 칠해서 그리기 횟수를 줄여요 (울퉁불퉁한 덩어리용)
      const buckets = baseG ? new Map() : null, dotP = baseG && st.speckle ? [new Path2D(), new Path2D(), new Path2D()] : null;
      for (let oi = 0; oi < order.length; oi++) {
        const i = order[oi]; if (fnz[i] <= 0) continue;
        const f = F[i], nx = fnx[i], ny = fny[i], nz = fnz[i];
        const diff = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
        const env = 0.5 + 0.5 * ny;
        let k = 0.1 + 0.62 * diff + 0.22 * env;
        k *= 1 - st.j / 2 + st.j * f.h;
        let c = k < 0.5 ? mix3(st.dark, st.base, k * 2) : mix3(st.base, st.light, Math.min(1, (k - 0.5) * 2));
        if (st.tarnish && f.t > 0.54) {
          const q = Math.min(1, (f.t - 0.54) * 3), hue = f.t > 0.66 ? [150, 70, 196] : f.t > 0.58 ? [52, 118, 206] : [58, 176, 170];
          c = mix3(c, hue, q * 0.72);
        }
        const sh = nx * HALF[0] + ny * HALF[1] + nz * HALF[2];
        if (sh > 0) { const sp2 = Math.pow(sh, st.pow) * st.k; c = [c[0] + (255 - c[0]) * sp2, c[1] + (252 - c[1]) * sp2, c[2] + (240 - c[2]) * sp2]; }
        if (baseG) {
          const kc = ((c[0] > 255 ? 255 : c[0] < 0 ? 0 : c[0]) >> 4) << 8 | ((c[1] > 255 ? 255 : c[1] < 0 ? 0 : c[1]) >> 4) << 4 | ((c[2] > 255 ? 255 : c[2] < 0 ? 0 : c[2]) >> 4);
          let b = buckets.get(kc); if (!b) { b = { col: rgbs(c), p: new Path2D() }; buckets.set(kc, b); }
          const cc2 = f.idx; b.p.moveTo(px[cc2[0]], py[cc2[0]]); for (let k = 1; k < cc2.length; k++) b.p.lineTo(px[cc2[k]], py[cc2[k]]); b.p.closePath();
        }
        else { path(f); ctx.fillStyle = rgbs(c); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.8; ctx.stroke(); }
        if (st.striate && f.quad && nz > 0.2) {
          const cc = f.idx; ctx.strokeStyle = 'rgba(60,46,6,.34)'; ctx.lineWidth = 1;
          for (let q = 1; q <= 4; q++) {
            const t = q / 5, i0 = cc[0], i1 = cc[1], i2 = cc[2], i3 = cc[3];
            ctx.beginPath(); ctx.moveTo(px[i0] + (px[i3] - px[i0]) * t, py[i0] + (py[i3] - py[i0]) * t); ctx.lineTo(px[i1] + (px[i2] - px[i1]) * t, py[i1] + (py[i2] - py[i1]) * t); ctx.stroke();
          }
        }
        if (st.cleave && f.quad && nz > 0.2) {
          const cc = f.idx; ctx.strokeStyle = 'rgba(120,70,60,.22)'; ctx.lineWidth = 1;
          for (let q = 1; q <= 2; q++) {
            const t = q / 3, i0 = cc[0], i1 = cc[1], i2 = cc[2], i3 = cc[3];
            ctx.beginPath(); ctx.moveTo(px[i0] + (px[i1] - px[i0]) * t, py[i0] + (py[i1] - py[i0]) * t); ctx.lineTo(px[i3] + (px[i2] - px[i3]) * t, py[i3] + (py[i2] - py[i3]) * t); ctx.stroke();
          }
        }
        if (dotP && nz > 0.1) {
          const cc = f.idx, r = rng(i * 131 + 7);
          const x0 = px[cc[0]], y0 = py[cc[0]], x1 = px[cc[1]], y1 = py[cc[1]], x2 = px[cc[2]], y2 = py[cc[2]];
          const nd = s > 56 ? 5 : 2;
          for (let d = 0; d < nd; d++) {
            let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
            const dx = x0 + (x1 - x0) * u + (x2 - x0) * v, dy = y0 + (y1 - y0) * u + (y2 - y0) * v, q = r(), rr = (0.8 + r() * 1.6) * Math.max(0.5, s / 90);
            const dp = dotP[q < 0.4 ? 0 : q < 0.7 ? 1 : 2]; dp.moveTo(dx + rr, dy); dp.arc(dx, dy, rr, 0, TAU);
          }
        }
        if (nz > 0.3 && !st.speckle && !st.smooth) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 + 0.18 * diff) + ')'; ctx.lineWidth = 0.9; path(f); ctx.stroke(); }
      }
      if (buckets) { ctx.globalAlpha = 0.42; buckets.forEach((b) => { ctx.fillStyle = b.col; ctx.fill(b.p); }); ctx.globalAlpha = 1; }
      if (dotP) { ctx.fillStyle = 'rgba(30,28,30,.7)'; ctx.fill(dotP[0]); ctx.fillStyle = 'rgba(255,250,246,.7)'; ctx.fill(dotP[1]); ctx.fillStyle = 'rgba(214,150,138,.7)'; ctx.fill(dotP[2]); }
    }
    ctx.restore();
    if (o.hull) return convexHull(M, order);
    return null;
  }
  function convexHull(M, order) {
    const pts = [];
    for (let i = 0; i < M.px.length; i++) pts.push([M.px[i], M.py[i]]);
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    pts.forEach((p) => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop();
    return lo.concat(up);
  }

  /* =========================================================
     화면 배치 · 상태 · 실험대 그리기
     ========================================================= */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 640, fs: 1 },
    tall: { key: 'tall', vw: 520, vh: 846, fs: 1.2 },
  };
  const S = {
    scene: 'shelf',           // shelf | blind | streak | tests | lab | uses
    // 1단계
    sel: 'gold', seen: new Set(), rot: { gold: { yaw: 0.5, pitch: 0.42 } }, rotDrag: null, blindRot: [0.5, 0.9, 0.6], hoverCard: null,
    // 2단계: 조흔판
    strokes: [], streakDone: {}, plateStamp: 0, held: null, spec: {}, hoverPlate: false,
    // 3단계: 시험
    scratch: { calcite: [], quartz: [] }, res: { scratch: false, reverse: false, acid: false, mag: false }, acidTried: {}, magTried: {}, fizz: null, drops: [],
    clip: { x: 0, y: 0, vx: 0, vy: 0, held: false, attached: null, ang: -0.4, home: true },
    dropper: { x: 0, y: 0, vx: 0, vy: 0, held: false, squeeze: 0, home: true },
    rub: null, tipText: null,
    // 4단계
    lab: { map: { A: 'chalco', B: 'calcite', C: 'magnetite' }, names: {}, obs: { A: {}, B: {}, C: {} }, menu: null }, table: false,
    useSlots: {}, useSel: null, useDrag: null, flagUse: new Set(), useShake: {},
    fade: 1, stamp: null, lastPhase: '',
  };
  let game = null;
  let FEAT = new Set();
  const isFree = () => !!(game && game.free);

  function frameOf(L, trayH) {
    if (L.key === 'wide') return { M: { x: 12, y: 12, w: 776, h: L.vh - 24 - trayH }, T: { x: 12, y: L.vh - 12 - trayH + 10, w: 776, h: trayH - 10 } };
    return { M: { x: 10, y: 10, w: 500, h: L.vh - 20 - trayH }, T: { x: 10, y: L.vh - 10 - trayH + 10, w: 500, h: trayH - 10 } };
  }
  // 실험대 바닥 (어두운 남색 + 위쪽 조명)
  function benchPanel(ctx, P, t) {
    roundRect(ctx, P.x, P.y, P.w, P.h, 16);
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, '#2a3a58'); g.addColorStop(0.55, '#1a2740'); g.addColorStop(1, '#121b30');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); roundRect(ctx, P.x, P.y, P.w, P.h, 16); ctx.clip();
    const sp = ctx.createRadialGradient(P.x + P.w * 0.3, P.y + P.h * 0.05, 10, P.x + P.w * 0.3, P.y + P.h * 0.05, P.w * 0.8);
    sp.addColorStop(0, 'rgba(255,244,214,.20)'); sp.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = sp; ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.restore();
    roundRect(ctx, P.x, P.y, P.w, P.h, 16); ctx.strokeStyle = 'rgba(170,196,240,.28)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // 표본 받침 (돌림판)
  function pedestal(ctx, x, y, w, o) {
    o = o || {};
    const h = w * 0.2;
    ctx.save();
    const sh = ctx.createRadialGradient(x, y + h * 0.5, w * 0.1, x, y + h * 0.5, w * 0.62);
    sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(x, y + h * 0.5, w * 0.62, h * 0.9, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
    g.addColorStop(0, '#31425f'); g.addColorStop(0.45, '#5a6f96'); g.addColorStop(1, '#2a3955');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + h * 0.28, w / 2, h / 2, 0, 0, Math.PI); ctx.lineTo(x - w / 2, y); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, TAU);
    const tg = ctx.createRadialGradient(x - w * 0.15, y - h * 0.15, 2, x, y, w / 2);
    tg.addColorStop(0, o.lit || '#8ea4cc'); tg.addColorStop(1, '#3a4d72');
    ctx.fillStyle = tg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }

  /* ---- 표본을 한 번만 그려 두었다가 쓰는 그림 창고 (움직이지 않는 표본은 가볍게) ---- */
  const sprites = new Map();
  function spriteOf(V, id, s, rot) {
    const res = Math.max(1, (V.v.scale || 1) * (V.v.dpr || 1));
    const yq = Math.round(rot.yaw * 20), pq = Math.round(rot.pitch * 20);
    const key = V.L.key + '|' + id + '|' + Math.round(s) + '|' + yq + '|' + pq + '|' + res.toFixed(2);
    let sp = sprites.get(key);
    if (sp) return sp;
    if (sprites.size > 120) sprites.clear();
    const pad = 1.7, size = Math.ceil(s * pad * 2 * res);
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d');
    c.scale(res, res);
    const hull = drawSpecimen(c, id, s * pad, s * pad, s, { yaw: yq / 20, pitch: pq / 20 }, { hull: true });
    sp = { cv, pad, res, hull: hull.map((q) => [q[0] - s * pad, q[1] - s * pad]) };
    sprites.set(key, sp);
    return sp;
  }
  function drawSpec(V, id, cx, cy, s, rot, o) {
    o = o || {};
    const ctx = V.ctx;
    if (o.live) return drawSpecimen(ctx, id, cx, cy, s, rot, o);
    const sp = spriteOf(V, id, s, rot), half = s * sp.pad;
    ctx.drawImage(sp.cv, cx - half, cy - half, half * 2, half * 2);
    return null;
  }
  // 계속 돌아가는 표본: 초당 30번만 새로 그리고 그 사이에는 그림을 재사용해요
  const liveCache = {};
  function drawSpecLive(V, key, id, cx, cy, s, rot, fastNow) {
    const res = Math.max(1, (V.v.scale || 1) * (V.v.dpr || 1)), k = V.L.key + key, pad = 1.7;
    let e = liveCache[k];
    const size = Math.ceil(s * pad * 2 * res);
    if (!e || e.id !== id || e.s !== s || e.res !== res) {
      const cv = document.createElement('canvas'); cv.width = cv.height = size;
      e = liveCache[k] = { cv, c: cv.getContext('2d'), id, s, res, t: -1e9, yaw: NaN, pitch: NaN };
    }
    const now = performance.now();
    if ((e.yaw !== rot.yaw || e.pitch !== rot.pitch) && (fastNow || now - e.t >= 30)) {
      e.c.setTransform(1, 0, 0, 1, 0, 0); e.c.clearRect(0, 0, size, size); e.c.scale(res, res);
      drawSpecimen(e.c, id, s * pad, s * pad, s, rot);
      e.t = now; e.yaw = rot.yaw; e.pitch = rot.pitch;
    }
    const half = s * pad;
    V.ctx.drawImage(e.cv, cx - half, cy - half, half * 2, half * 2);
  }
  function specShadow(ctx, x, y, s, a) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 2, x, y, s * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,' + (0.5 * (a == null ? 1 : a)) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * 1.05, s * 0.26, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     1단계 화면: 표본 진열대 · 색만 보고 맞혀 보기
     ========================================================= */
  function shelfGeo(L) {
    if (L.key === 'wide') {
      const cards = SHELF.map((id, i) => ({ id, x: 498 + (i % 2) * 150, y: 24 + Math.floor(i / 2) * 200, w: 140, h: 190 }));
      return { M: { x: 12, y: 12, w: 776, h: 616 }, vx: 247, vplat: 484, vcx: 247, vcy: 396, vs: 140, cards };
    }
    const cards = SHELF.map((id, i) => ({ id, x: 10 + (i % 3) * 170, y: 452 + Math.floor(i / 3) * 192, w: 160, h: 182 }));
    return { M: { x: 10, y: 10, w: 500, h: 826 }, vx: 260, vplat: 372, vcx: 260, vcy: 304, vs: 112, cards };
  }
  function rotOf(id) { if (!S.rot[id]) S.rot[id] = { yaw: MN[id].yaw, pitch: MN[id].pitch }; return S.rot[id]; }
  function colorChip(ctx, L, x, y, mn, o) {
    o = o || {};
    ctx.save();
    ctx.font = fnt(L, o.size || 15, 'bold');
    const label = '겉보기 색', tw = ctx.measureText(mn.color).width, lw = ctx.measureText(label).width;
    const w = 14 + lw + 14 + 26 + tw + 14, h = 32 * L.fs;
    roundRect(ctx, x, y - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(232,239,255,.8)'; ctx.fillText(label, x + 14, y + 0.5);
    ctx.fillStyle = mn.swatch; ctx.beginPath(); ctx.arc(x + 14 + lw + 22, y, 9 * L.fs, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(mn.color, x + 14 + lw + 40, y + 0.5);
    ctx.restore();
    return w;
  }
  function drawShelf(V, t) {
    const ctx = V.ctx, L = V.L, G = shelfGeo(L), fs = L.fs, wide = L.key === 'wide';
    benchPanel(ctx, G.M, t);
    const mn = MN[S.sel], rot = rotOf(S.sel);
    // 위에서 내려오는 빛줄기
    ctx.save();
    const cone = ctx.createLinearGradient(0, G.M.y, 0, G.vplat);
    cone.addColorStop(0, 'rgba(255,246,220,.0)'); cone.addColorStop(1, 'rgba(255,246,220,.13)');
    ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(G.vx - 40, G.M.y + 4); ctx.lineTo(G.vx + 40, G.M.y + 4); ctx.lineTo(G.vx + 170 * fs, G.vplat); ctx.lineTo(G.vx - 170 * fs, G.vplat); ctx.closePath(); ctx.fill();
    ctx.restore();
    pedestal(ctx, G.vx, G.vplat, 300 * fs * (wide ? 1 : 0.85));
    specShadow(ctx, G.vx, G.vplat + 2, G.vs * 0.78);
    drawSpecLive(V, 'viewer', S.sel, G.vx, G.vcy, G.vs, rot, !!S.rotDrag);
    // 반짝임
    const sp = (Math.sin(t * 2.2) * 0.5 + 0.5);
    if (!RM && (mn.kind === 'gold' || mn.kind === 'pyrite' || mn.kind === 'quartz' || mn.kind === 'calcite' || mn.kind === 'chalco')) SciSim.draw(ctx).spark(G.vx - G.vs * 0.42, G.vcy - G.vs * 0.48, 8 + 6 * sp, t, 'rgba(255,252,230,.95)');
    // 이름과 겉보기 색
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = dfnt(L, 40); ctx.fillStyle = '#fff'; ctx.fillText(mn.name, G.M.x + 28, G.M.y + 46 * fs);
    colorChip(ctx, L, G.M.x + 28, G.M.y + 92 * fs, mn);
    ctx.font = fnt(L, 14.5, '600'); ctx.fillStyle = 'rgba(232,239,255,.8)';
    ctx.fillText('표본을 끌어서 돌려 보세요', G.M.x + 28, G.M.y + 128 * fs);
    // 오른쪽(또는 아래) 표본 카드
    G.cards.forEach((c) => {
      const m = MN[c.id], sel = S.sel === c.id, seen = S.seen.has(c.id) || isFree(), hov = S.hoverCard === c.id;
      const lift = sel ? -3 : hov ? -2 : 0;
      ctx.save();
      roundRect(ctx, c.x, c.y + lift, c.w, c.h, 14);
      ctx.fillStyle = sel ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)'; ctx.fill();
      ctx.strokeStyle = sel ? '#5eead4' : 'rgba(255,255,255,.2)'; ctx.lineWidth = sel ? 3 : 1.4; ctx.stroke();
      const cs = c.w * 0.33;
      pedestal(ctx, c.x + c.w / 2, c.y + lift + c.h * 0.56, c.w * 0.74);
      drawSpec(V, c.id, c.x + c.w / 2, c.y + lift + c.h * 0.56 - cs * 0.6, cs, { yaw: m.yaw, pitch: m.pitch });
      ctx.font = dfnt(L, 22); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m.name, c.x + c.w / 2, c.y + lift + c.h - 40 * fs);
      ctx.fillStyle = m.swatch; ctx.beginPath(); ctx.arc(c.x + 22, c.y + lift + c.h - 16 * fs, 7 * fs, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.font = fnt(L, 12.5, '700'); ctx.fillStyle = 'rgba(232,239,255,.85)'; ctx.textAlign = 'left'; ctx.fillText(m.color, c.x + 34, c.y + lift + c.h - 15 * fs);
      if (seen) { ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(c.x + c.w - 16, c.y + lift + 16, 11, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c.x + c.w - 21, c.y + lift + 16); ctx.lineTo(c.x + c.w - 17, c.y + lift + 20); ctx.lineTo(c.x + c.w - 10.5, c.y + lift + 12); ctx.stroke(); }
      ctx.restore();
    });
  }

  function blindGeo(L) {
    if (L.key === 'wide') return { M: { x: 12, y: 12, w: 776, h: 616 }, slots: [160, 400, 640].map((x) => ({ x, plat: 420, cy: 322, s: 100 })), labY: 168, swY: 508, swW: 170 };
    return { M: { x: 10, y: 10, w: 500, h: 826 }, slots: [92, 260, 428].map((x) => ({ x, plat: 360, cy: 292, s: 62 })), labY: 220, swY: 440, swW: 150 };
  }
  const BLIND = ['pyrite', 'gold', 'chalco'];
  function drawBlind(V, t) {
    const ctx = V.ctx, L = V.L, G = blindGeo(L), fs = L.fs, wide = L.key === 'wide';
    benchPanel(ctx, G.M, t);
    pill(ctx, '금 · 황동석 · 황철석이 하나씩 섞여 있어요', G.M.x + G.M.w / 2, G.M.y + 34 * fs, { font: fnt(L, 15, 'bold'), bg: 'rgba(8,16,40,.82)', h: 30 * fs, pad: 14, stroke: 'rgba(160,190,255,.35)' });
    pill(ctx, '색만 보고 어느 것이 금인지 알 수 있을까요?', G.M.x + G.M.w / 2, G.M.y + 74 * fs, { font: fnt(L, 14.5, 'bold'), bg: 'rgba(255,255,255,.12)', h: 28 * fs, pad: 14 });
    BLIND.forEach((id, i) => {
      const sl = G.slots[i], m = MN[id];
      ctx.save();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sl.x, G.labY, 25 * fs, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1f2a44'; ctx.font = dfnt(L, 30); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ABC'[i], sl.x, G.labY + 2);
      pedestal(ctx, sl.x, sl.plat, sl.s * 2.1);
      specShadow(ctx, sl.x, sl.plat + 2, sl.s * 0.8);
      drawSpecLive(V, 'blind' + i, id, sl.x, sl.cy, sl.s, { yaw: S.blindRot[i], pitch: m.pitch }, false);
      // 겉보기 색 견본
      roundRect(ctx, sl.x - G.swW / 2, G.swY - 18 * fs, G.swW, 36 * fs, 10); ctx.fillStyle = m.swatch; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = 'rgba(232,239,255,.85)'; ctx.fillText('겉보기 색: 노란색', sl.x, G.swY + 36 * fs);
      ctx.restore();
    });
    // 세 색이 거의 같다는 표시
    const a = G.slots[0].x, b = G.slots[2].x, y = G.swY - 40 * fs;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y); ctx.stroke(); ctx.setLineDash([]);
    pill(ctx, '≈ 세 광물의 색이 거의 같아요', (a + b) / 2, y, { font: fnt(L, 13.5, 'bold'), bg: 'rgba(245,158,11,.92)', h: 26 * fs, pad: 12 });
    ctx.restore();
  }

  /* =========================================================
     2단계 화면: 조흔판에 긁어 가루 색 보기
     ========================================================= */
  function streakGeo(L) {
    if (L.key === 'wide') {
      const docks = SHELF.slice(0, 3).map((id, i) => ({ id, x: 510, y: 84 + i * 174, w: 278, h: 164 }));
      return { M: { x: 12, y: 12, w: 776, h: 616 }, plate: { x: 34, y: 150, w: 452, h: 290 }, docks, legend: { x: 34, y: 462, w: 452, h: 154 }, s: 50 };
    }
    const docks = SHELF.slice(0, 3).map((id, i) => ({ id, x: 10 + i * 170, y: 640, w: 160, h: 190 }));
    return { M: { x: 10, y: 10, w: 500, h: 826 }, plate: { x: 24, y: 96, w: 472, h: 300 }, docks, legend: { x: 24, y: 410, w: 472, h: 214 }, s: 50 };
  }
  function ensurePlate(V, G) {
    const P = G.plate, res = Math.max(1, (V.v.scale || 1) * (V.v.dpr || 1));
    if (!V.plate || V.plate.res !== res || V.plate.key !== P.w + 'x' + P.h) {
      const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(P.w * res); c.height = Math.ceil(P.h * res); return c; };
      V.plate = { res, key: P.w + 'x' + P.h, base: mk(), streak: mk(), stamp: -1 };
      const c = V.plate.base.getContext('2d'); c.scale(res, res);
      // 흰 도자기 판
      roundRect(c, 0, 0, P.w, P.h, 16);
      const g = c.createLinearGradient(0, 0, P.w, P.h); g.addColorStop(0, '#fffdf8'); g.addColorStop(0.6, '#f1ebdd'); g.addColorStop(1, '#e3dccb');
      c.fillStyle = g; c.fill();
      c.save(); roundRect(c, 0, 0, P.w, P.h, 16); c.clip();
      const r = rng(77);
      for (let i = 0; i < 900; i++) { c.fillStyle = 'rgba(' + (120 + r() * 60 | 0) + ',' + (110 + r() * 50 | 0) + ',' + (90 + r() * 50 | 0) + ',' + (0.06 + r() * 0.12) + ')'; c.fillRect(r() * P.w, r() * P.h, 1 + r() * 1.4, 1 + r() * 1.4); }
      const hl = c.createLinearGradient(0, 0, 0, 40); hl.addColorStop(0, 'rgba(255,255,255,.7)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = hl; c.fillRect(0, 0, P.w, 40);
      c.restore();
      roundRect(c, 1.5, 1.5, P.w - 3, P.h - 3, 15); c.strokeStyle = 'rgba(120,100,70,.35)'; c.lineWidth = 3; c.stroke();
      roundRect(c, 10, 10, P.w - 20, P.h - 20, 10); c.strokeStyle = 'rgba(120,100,70,.14)'; c.lineWidth = 1.2; c.stroke();
    }
    if (V.plate.stamp !== S.plateStamp) { redrawStreaks(V, G); V.plate.stamp = S.plateStamp; }
  }
  function drawStreakSeg(V, G, sid, a, b, seed) {
    const P = G.plate, c = V.plate.streak.getContext('2d'), mn = MN[sid];
    c.setTransform(V.plate.res, 0, 0, V.plate.res, 0, 0);
    const x1 = a[0] * P.w, y1 = a[1] * P.h, x2 = b[0] * P.w, y2 = b[1] * P.h, len = Math.hypot(x2 - x1, y2 - y1);
    c.lineCap = 'round';
    c.strokeStyle = rgba(mn.streakCol, 0.86); c.lineWidth = 8.5; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = rgba(mn.streakCol, 0.35); c.lineWidth = 13; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    const r = rng(seed), n = Math.ceil(len / 1.6) + 1, nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
    for (let i = 0; i < n; i++) {
      const u = r(), off = (r() - 0.5) * 17, rr = 0.5 + r() * 1.5;
      c.fillStyle = rgba(mn.streakCol, 0.25 + r() * 0.5);
      c.beginPath(); c.arc(x1 + (x2 - x1) * u + nx * off, y1 + (y2 - y1) * u + ny * off, rr, 0, TAU); c.fill();
    }
  }
  function redrawStreaks(V, G) {
    const c = V.plate.streak.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, V.plate.streak.width, V.plate.streak.height);
    S.strokes.forEach((st, si) => { for (let i = 1; i < st.pts.length; i++) drawStreakSeg(V, G, st.id, st.pts[i - 1], st.pts[i], si * 5000 + i); });
  }
  const legendItems = () => SHELF.slice(0, 3);
  function drawStreak(V, t) {
    const ctx = V.ctx, L = V.L, G = streakGeo(L), fs = L.fs, wide = L.key === 'wide';
    benchPanel(ctx, G.M, t);
    ensurePlate(V, G);
    const P = G.plate;
    pill(ctx, S.held ? '판 위를 눌러 긋듯이 끌어 보세요' : '광물을 끌어서 조흔판 위를 긁어 보세요', G.M.x + G.M.w / 2, G.M.y + 30 * fs, { font: fnt(L, 14.5, 'bold'), bg: 'rgba(8,16,40,.82)', h: 28 * fs, pad: 14, stroke: 'rgba(160,190,255,.35)' });
    // 조흔판
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10;
    roundRect(ctx, P.x, P.y, P.w, P.h, 16); ctx.fillStyle = '#d8d0bd'; ctx.fill();
    ctx.restore();
    ctx.drawImage(V.plate.base, P.x, P.y, P.w, P.h);
    ctx.drawImage(V.plate.streak, P.x, P.y, P.w, P.h);
    ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = 'rgba(110,90,60,.55)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('조흔판 (흰색 도자기 판)', P.x + 20, P.y + P.h - 20 * fs);
    // 긁은 줄 이름표
    legendItems().forEach((id) => {
      const strokes = S.strokes.filter((s) => s.id === id && s.pts.length > 2);
      if (!strokes.length) return;
      const st = strokes[strokes.length - 1], mid = st.pts[Math.floor(st.pts.length / 2)];
      pill(ctx, MN[id].name, P.x + mid[0] * P.w, P.y + mid[1] * P.h - 18 * fs, { font: fnt(L, 13, 'bold'), bg: 'rgba(31,42,68,.88)', h: 22 * fs, pad: 9 });
    });
    // 기록
    const Lg = G.legend;
    roundRect(ctx, Lg.x, Lg.y, Lg.w, Lg.h, 14); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.font = dfnt(L, 19); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('📋 조흔색 기록', Lg.x + 16, Lg.y + 26 * fs);
    legendItems().forEach((id, i) => {
      const m = MN[id], done = !!S.streakDone[id], ry = Lg.y + (wide ? 62 : 66) * fs + i * (wide ? 34 : 40) * fs;
      ctx.font = fnt(L, 15, 'bold'); ctx.fillStyle = '#e8efff'; ctx.textAlign = 'left'; ctx.fillText(m.name, Lg.x + 18, ry);
      ctx.fillStyle = 'rgba(232,239,255,.55)'; ctx.fillText('→', Lg.x + 18 + 66 * fs, ry);
      if (done) {
        roundRect(ctx, Lg.x + 18 + 92 * fs, ry - 12 * fs, 44 * fs, 24 * fs, 6); ctx.fillStyle = '#f6f2e8'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.stroke();
        roundRect(ctx, Lg.x + 18 + 96 * fs, ry - 8 * fs, 36 * fs, 16 * fs, 4); ctx.fillStyle = m.streakCol; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold'); ctx.fillText('조흔색 ' + m.streak, Lg.x + 18 + 148 * fs, ry);
      } else { ctx.fillStyle = 'rgba(232,239,255,.45)'; ctx.font = fnt(L, 14, '600'); ctx.fillText('아직 긁지 않았어요', Lg.x + 18 + 92 * fs, ry); }
    });
    // 표본 받침(보관함)
    G.docks.forEach((d) => {
      const m = MN[d.id], sp = S.spec[d.id], isHeld = S.held && S.held.id === d.id;
      ctx.save();
      roundRect(ctx, d.x, d.y, d.w, d.h, 14); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = S.streakDone[d.id] ? 'rgba(52,211,153,.8)' : 'rgba(255,255,255,.2)'; ctx.lineWidth = S.streakDone[d.id] ? 2.6 : 1.4; ctx.stroke();
      const px = d.x + (wide ? 92 : d.w / 2), py = d.y + (wide ? d.h * 0.7 : d.h * 0.52);
      pedestal(ctx, px, py, wide ? 128 : 112);
      ctx.font = dfnt(L, 23); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
      if (wide) { ctx.textAlign = 'left'; ctx.fillText(m.name, d.x + 168, d.y + 40 * fs); ctx.font = fnt(L, 13.5, '700'); ctx.fillStyle = 'rgba(232,239,255,.8)'; ctx.fillText('겉보기 색', d.x + 168, d.y + 76 * fs); ctx.fillStyle = m.swatch; ctx.beginPath(); ctx.arc(d.x + 176, d.y + 104 * fs, 8 * fs, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText(m.color, d.x + 192, d.y + 105 * fs); }
      else { ctx.textAlign = 'center'; ctx.fillText(m.name, d.x + d.w / 2, d.y + d.h - 28 * fs); ctx.font = fnt(L, 12.5, '700'); ctx.fillStyle = 'rgba(232,239,255,.8)'; ctx.fillText('색: ' + m.color, d.x + d.w / 2, d.y + d.h - 10 * fs); }
      ctx.restore();
      if (!isHeld) {
        const home = specHome(G, d, wide);
        specShadow(ctx, px, py + 2, G.s * 0.8);
        const q = sp || home;
        drawSpec(V, d.id, q.x, q.y, G.s, { yaw: m.yaw, pitch: m.pitch });
      }
    });
    // 들고 있는 표본
    if (S.held) {
      const h = S.held, m = MN[h.id], s = G.s * 1.25, onP = h.onPlate;
      specShadow(ctx, h.x + (onP ? 6 : 14), h.y + (onP ? 14 : 44), s * (onP ? 0.7 : 0.9), onP ? 0.8 : 0.55);
      drawSpec(V, h.id, h.x, h.y - s * 0.55, s, { yaw: m.yaw + 0.5, pitch: m.pitch + 0.1 }, { live: true });
    }
  }
  function specHome(G, d, wide) { return { x: d.x + (wide ? 92 : d.w / 2), y: (wide ? d.y + d.h * 0.7 : d.y + d.h * 0.52) - G.s * 0.8 }; }

  /* =========================================================
     화면 만들기 · 입력 (1~2단계)
     ========================================================= */
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage(document.querySelector(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: FRAME });
    return { v, L, ctx: v.ctx, fx: [], P: new SciSim.Particles(), D: SciSim.draw(v.ctx), dt: 0.016, plate: null };
  });
  const activeView = () => views.find((V) => V.v.canvas.offsetWidth > 0) || views[0];
  const inRect = (p, r, pad) => p.x >= r.x - (pad || 0) && p.x <= r.x + r.w + (pad || 0) && p.y >= r.y - (pad || 0) && p.y <= r.y + r.h + (pad || 0);
  function tip(text) { S.tipText = { text, t0: nowS() }; }
  function setScene(sc) {
    if (S.scene !== sc) { S.scene = sc; S.fade = 0; if (RM) S.fade = 1; else SciSim.tween(S, { fade: 1 }, { duration: 0.5, ease: 'outCubic' }); }
    syncControls();
  }
  function syncControls() {
    const cr = $('#cReset'), ct = $('#cTable'), cc = $('#ctrlCard');
    const showR = S.scene === 'streak' || S.scene === 'tests' || S.scene === 'lab', showT = S.scene === 'lab';
    if (cr) cr.classList.toggle('is-off', !showR);
    if (ct) ct.classList.toggle('is-off', !showT);
    if (cc) cc.classList.toggle('is-off', !showR && !showT);
    const rb = $('#resetBtn'), rn = $('#resetNote'), tb = $('#tableBtn');
    if (rb) rb.textContent = S.scene === 'streak' ? '🧽 조흔판 닦기' : S.scene === 'tests' ? '↺ 시험 다시 하기' : '↺ 기록 지우기';
    if (rn) rn.textContent = S.scene === 'streak' ? '긁은 줄을 지우고 다시 긁을 수 있어요.' : S.scene === 'tests' ? '흠집과 시험 기록을 지우고 처음부터 해 봐요.' : S.scene === 'lab' ? '시험 기록을 모두 지우고 다시 조사해요.' : '';
    if (tb) { tb.classList.toggle('on-state', S.table); tb.setAttribute('aria-pressed', S.table ? 'true' : 'false'); tb.textContent = S.table ? '📋 광물 특성표 닫기' : '📋 광물 특성표 보기'; }
  }
  function resetPlate() { S.strokes = []; S.streakDone = {}; S.plateStamp++; S.held = null; S.spec = {}; }
  function resetTests() { S.scratch = { calcite: [], quartz: [] }; S.res = { scratch: false, reverse: false, acid: false, mag: false }; S.acidTried = {}; S.magTried = {}; S.fizz = null; S.drops = []; S.clip.attached = null; S.clip.held = false; S.clip.home = true; S.dropper.held = false; S.dropper.home = true; S.rub = null; }
  function resetLab() { S.lab.names = {}; S.lab.obs = { A: {}, B: {}, C: {} }; S.lab.menu = null; S.strokes = []; S.plateStamp++; S.clip.attached = null; S.clip.home = true; S.dropper.home = true; S.drops = []; S.fizz = null; }
  const rbtn = $('#resetBtn');
  if (rbtn) rbtn.addEventListener('click', () => { Sound.click(); if (S.scene === 'streak') resetPlate(); else if (S.scene === 'tests') resetTests(); else if (S.scene === 'lab') resetLab(); });
  const tbtn = $('#tableBtn');
  if (tbtn) tbtn.addEventListener('click', () => { Sound.click(); S.table = !S.table; syncControls(); });

  function hitShelf(G, p) {
    for (let i = 0; i < G.cards.length; i++) if (inRect(p, G.cards[i])) return { type: 'card', id: G.cards[i].id };
    if (Math.hypot(p.x - G.vx, p.y - G.vcy) < G.vs * 1.45) return { type: 'viewer' };
    return null;
  }
  function selectMineral(V, id) {
    S.sel = id; const first = !S.seen.has(id); S.seen.add(id);
    Sound.tone(first ? 880 : 640, 0.09, 'triangle', 0.07);
    if (first) { const G = shelfGeo(V.L), c = G.cards.find((q) => q.id === id); if (c) { ringFx(V, c.x + c.w / 2, c.y + c.h / 2, 40, '#34d399'); V.P.burst(G.vx, G.vcy, { count: 12, colors: ['#ffe9a8', '#ffffff', '#7bd3ff'], speed: 130, gravity: 40, size: 3, life: 0.8 }); } }
  }
  function attachPointer(V) {
    const { v, L } = V;
    let drag = null;
    SciSim.pointer(v, {
      hover(p) {
        if (S.scene === 'shelf') { const h = hitShelf(shelfGeo(L), p); S.hoverCard = h && h.type === 'card' ? h.id : null; return h ? (h.type === 'card' ? 'pointer' : 'grab') : null; }
        if (S.scene === 'blind') { const G = blindGeo(L); return G.slots.some((sl) => Math.hypot(p.x - sl.x, p.y - sl.cy) < sl.s * 1.3) ? 'grab' : null; }
        if (S.scene === 'streak') { const G = streakGeo(L); return G.docks.some((d) => Math.hypot(p.x - specHome(G, d, L.key === 'wide').x, p.y - specHome(G, d, L.key === 'wide').y) < G.s * 1.3) ? 'grab' : null; }
        return sceneHover(V, p);
      },
      down(p) {
        if (S.scene === 'shelf') {
          const G = shelfGeo(L), h = hitShelf(G, p);
          if (!h) return false;
          if (h.type === 'card') { selectMineral(V, h.id); return false; }
          drag = { kind: 'rot', x: p.x, y: p.y, id: S.sel }; S.rotDrag = true; return true;
        }
        if (S.scene === 'blind') {
          const G = blindGeo(L);
          for (let i = 0; i < G.slots.length; i++) if (Math.hypot(p.x - G.slots[i].x, p.y - G.slots[i].cy) < G.slots[i].s * 1.3) { drag = { kind: 'brot', i, x: p.x }; return true; }
          return false;
        }
        if (S.scene === 'streak') {
          const G = streakGeo(L), wide = L.key === 'wide';
          for (let i = 0; i < G.docks.length; i++) {
            const d = G.docks[i], h = specHome(G, d, wide), sp = S.spec[d.id] || h;
            if (Math.hypot(p.x - sp.x, p.y - sp.y) < G.s * 1.35) { S.held = { id: d.id, x: p.x, y: p.y, onPlate: false, len: 0, stroke: null }; delete S.spec[d.id]; drag = { kind: 'held' }; Sound.tick(); return true; }
          }
          return false;
        }
        const r = sceneDown(V, p); if (r) drag = r; return !!r;
      },
      move(p) {
        if (!drag) return;
        if (drag.kind === 'rot') { const r = rotOf(drag.id); r.yaw += (p.x - drag.x) * 0.012; r.pitch = clamp(r.pitch + (p.y - drag.y) * 0.01, -0.25, 1.15); drag.x = p.x; drag.y = p.y; }
        else if (drag.kind === 'brot') { S.blindRot[drag.i] += (p.x - drag.x) * 0.014; drag.x = p.x; }
        else if (drag.kind === 'held') moveHeld(V, p);
        else sceneMove(V, drag, p);
      },
      up(p) {
        if (!drag) return;
        if (drag.kind === 'rot') S.rotDrag = false;
        else if (drag.kind === 'held') dropHeld(V, p);
        else sceneUp(V, drag, p);
        drag = null;
      },
    });
    if (L.key === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0]; if (!tc) return;
        const p = v.toLocal(tc);
        if (drag || sceneBlocks(V, p)) e.preventDefault();
        else if (S.scene === 'shelf') { if (hitShelf(shelfGeo(L), p)) e.preventDefault(); }
        else if (S.scene === 'blind') { const G = blindGeo(L); if (G.slots.some((sl) => Math.hypot(p.x - sl.x, p.y - sl.cy) < sl.s * 1.3)) e.preventDefault(); }
        else if (S.scene === 'streak') { const G = streakGeo(L), wide = false; if (G.docks.some((d) => { const h = specHome(G, d, wide); return Math.hypot(p.x - h.x, p.y - h.y) < G.s * 1.35; }) || inRect(p, G.plate)) e.preventDefault(); }
      }, { passive: false });
    }
  }
  function moveHeld(V, p) {
    const h = S.held; if (!h) return;
    const L = V.L, G = streakGeo(L), P = G.plate, mn = MN[h.id];
    h.x = p.x; h.y = p.y;
    const inP = S.scene === 'streak' ? (p.x > P.x + 6 && p.x < P.x + P.w - 6 && p.y > P.y + 6 && p.y < P.y + P.h - 6) : sceneHeldOnPlate(V, p);
    h.onPlate = inP;
    if (!inP) { h.stroke = null; return; }
    const PP = S.scene === 'streak' ? P : labPlate(V.L);
    const u = (p.x - PP.x) / PP.w, w = (p.y - PP.y) / PP.h;
    if (!h.stroke) { h.stroke = { id: h.id, letter: h.letter, pts: [[u, w]] }; S.strokes.push(h.stroke); }
    else {
      const last = h.stroke.pts[h.stroke.pts.length - 1], d = Math.hypot((u - last[0]) * PP.w, (w - last[1]) * PP.h);
      if (d > 2.5) {
        h.stroke.pts.push([u, w]); h.len += d;
        if (V.plate) { const GG = S.scene === 'streak' ? G : { plate: PP }; drawStreakSeg(V, GG, h.id, last, [u, w], S.strokes.indexOf(h.stroke) * 5000 + h.stroke.pts.length); S.plateStamp++; V.plate.stamp = S.plateStamp; }
        for (let i = 0; i < 2; i++) V.P.emit({ x: p.x + (Math.random() - 0.5) * 6, y: p.y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 50, vy: -10 - Math.random() * 40, life: 0.5, size: 1.2 + Math.random() * 1.2, color: mn.streakCol === '#f1f1ec' ? '#ddd8c8' : mn.streakCol, gravity: 160, shape: 'square', drag: 1 });
        if (Math.random() < 0.2) Sound.tone(260 + Math.random() * 80, 0.04, 'sawtooth', 0.012);
      }
    }
  }
  function dropHeld(V, p) {
    const h = S.held; if (!h) return;
    if (S.scene === 'streak' && h.len >= 90 && !S.streakDone[h.id]) {
      S.streakDone[h.id] = true; Sound.tone(880, 0.12, 'triangle', 0.08); Sound.tone(1180, 0.14, 'triangle', 0.07, 0.08);
      ringFx(V, h.x, h.y, 26, MN[h.id].streakCol === '#f1f1ec' ? '#ffffff' : '#ffd36b');
    }
    if (S.scene === 'lab') {
      labRecordStreak(V, h);
      if (Math.hypot(h.x - h.x0, h.y - h.y0) < 8 && !h.stroke && h.len === 0) { S.lab.menu = { letter: h.letter }; Sound.tick(); }
    } else S.spec[h.id] = { x: h.x, y: h.y - 62, vx: 0, vy: 0 };
    S.held = null;
  }
  // 아래 장면(시험 · 감정 · 쓰임)에서 채울 입력 처리 (3~4단계)
  views.forEach(attachPointer);

  /* =========================================================
     움직임 · 그리기 순서
     ========================================================= */
  function update(dt, t) {
    if (!RM && !S.rotDrag) { const r = rotOf(S.sel); r.yaw += dt * 0.45; }
    if (!RM) { for (let i = 0; i < 3; i++) S.blindRot[i] += dt * (0.25 + i * 0.05); }
    Object.keys(S.spec).forEach((id) => {
      const G = streakGeo(activeView().L), d = G.docks.find((q) => q.id === id); if (!d) return;
      const h = specHome(G, d, activeView().L.key === 'wide'), o = S.spec[id];
      springTo(o, h.x, h.y, dt, 220, 19);
      if (Math.hypot(o.x - h.x, o.y - h.y) < 0.6 && Math.hypot(o.vx, o.vy) < 4) delete S.spec[id];
    });
    updateScene(dt, t);
    watchPhase();
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) { V.dt = dt; V.P.update(dt); } });
  }
  function draw(V, t) {
    const ctx = V.ctx, L = V.L;
    V.v.apply();
    ctx.fillStyle = FRAME; ctx.fillRect(0, 0, L.vw, L.vh);
    ctx.textBaseline = 'alphabetic';
    const slide = (1 - S.fade) * 16;
    if (slide > 0.2) { ctx.save(); ctx.translate(0, slide); }
    if (S.scene === 'shelf') drawShelf(V, t);
    else if (S.scene === 'blind') drawBlind(V, t);
    else if (S.scene === 'streak') drawStreak(V, t);
    else drawScene2(V, t);
    if (slide > 0.2) ctx.restore();
    V.P.draw(ctx); drawFx(ctx, V);
    if (S.stamp) {
      const k = (nowS() - S.stamp.t0) / 1.6;
      if (k >= 1) S.stamp = null;
      else { const sz = 46 * (0.6 + 0.4 * EZ.outBack(Math.min(1, k * 3.5))); ctx.save(); ctx.globalAlpha = 1 - smooth(0.7, 1, k); V.D.check(L.vw / 2, L.vh / 2 - 10, sz, clamp(k * 3, 0, 1)); ctx.restore(); }
    }
    if (S.fade < 0.999) { ctx.globalAlpha = 1 - S.fade; ctx.fillStyle = FRAME; ctx.fillRect(0, 0, L.vw, L.vh); ctx.globalAlpha = 1; }
  }
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
     미션
     ========================================================= */
  const USES = [
    { id: 'quartz', item: 'quartz', label: '석영', use: '유리·반도체', emoji: '🪟' },
    { id: 'feldspar', item: 'feldspar', label: '장석', use: '도자기', emoji: '🏺' },
    { id: 'magnetite', item: 'magnetite', label: '자철석', use: '철을 만드는 재료', emoji: '🔩' },
    { id: 'granite', item: 'granite', label: '화강암', use: '건축 자재', emoji: '🏛️' },
  ];
  const labTested = () => ['A', 'B', 'C'].filter((l) => Object.keys(S.lab.obs[l]).length > 0).length;
  function shuffleLab() {
    const ids = ['chalco', 'calcite', 'magnetite'], r = rng((Date.now() / 1000) | 0), a = ids.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    S.lab.map = { A: a[0], B: a[1], C: a[2] };
  }

  game = SciSim.game({
    simId: 'm2-minerals',
    mount: '#game',
    badge: '광물 감정사',
    homeHref: '../../index.html#g2',
    featureLabels: { reset: '🧽 조흔판 닦기', table: '📋 광물 특성표' },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart() { S.tipText = null; S.lab.menu = null; },
    onComplete() { setScene('lab'); S.table = false; syncControls(); },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '광물의 겉보기 색', short: '겉보기 색', icon: '👀', phase: '관찰',
        features: [],
        intro: '<p class="si-q">❓ 탐구 질문: 겉모습이 비슷한 광물을 어떻게 구별할 수 있을까?</p>' +
          '<p><b>광물</b>은 암석을 이루는 알갱이예요. 먼저 광물 표본 <b>6가지</b>를 눈으로 관찰해요. 표본을 하나씩 눌러 <b>겉보기 색</b>을 살펴봐요.</p>',
        setup() { setScene('shelf'); S.seen = new Set(); S.sel = 'gold'; },
        recap: '금·황동석·황철석은 모두 <b>노란색</b>, 석영·방해석은 <b>투명한 흰색</b>이라서 <b>겉보기 색만으로는</b> 구별하기 어려워요.',
        summary: '<ul><li><b>광물</b>은 자연에서 생기는 고체 물질로, <b>암석을 이루는 알갱이</b>예요.</li>' +
          '<li>금·황동석·황철석은 모두 <b>노란색</b>, 석영·방해석은 <b>투명한 흰색</b>이에요.</li>' +
          '<li>겉보기 색이 같거나 비슷한 광물이 많아서, <b>색만으로는</b> 광물을 구별하기 어려워요.</li></ul>',
        missions: [
          {
            title: '🔍 광물 표본 관찰하기',
            goal: '표본 카드 <b>6개</b>를 모두 눌러서 <b>겉보기 색</b>을 관찰해 보세요.',
            hint: '카드를 누르면 큰 화면에서 표본을 볼 수 있어요. 화면을 끌어서 여러 방향으로 돌려 봐요.',
            setup() { setScene('shelf'); },
            check: () => S.seen.size >= 6,
            hold: 0.5,
            status: () => SHELF.map((id) => chk(S.seen.has(id), MN[id].name)).join(' · '),
            explain: '금·황동석·황철석은 모두 <b>노란색</b>이고, 석영과 방해석은 <b>투명한 흰색</b>이에요. 겉보기 색이 같거나 비슷한 광물이 많아요.',
          },
          {
            type: 'quiz', title: '🤔 색만으로 구별해 볼까?',
            goal: '표본 A, B, C는 <b>금·황동석·황철석</b>이 하나씩이에요. <b>색만 보고</b> 어느 것이 금인지 알 수 있을까요?',
            setup() { setScene('blind'); },
            choices: ['가장 반짝이는 A가 금이다', '가장 노랗게 보이는 B가 금이다', '가장 커 보이는 C가 금이다', '세 광물의 색이 거의 같아서 색만으로는 구별하기 어렵다'],
            answer: 3,
            feedback: [
              '반짝임은 비슷해서 믿을 수 없어요. 황철석도 금처럼 반짝여 \'가짜 금\'이라고 불러요.',
              '노란 정도는 비슷하고, 보는 각도와 빛에 따라 달라 보여요.',
              '크기는 광물을 구별하는 특성이 아니에요.',
              '',
            ],
            explain: '금·황동석·황철석은 겉보기 색이 모두 <b>노란색</b>이라 색만으로는 구별하기 어려워요. 다른 특성이 더 필요해요!',
          },
        ],
      },
      /* ---------- 2단계 · 실험 ---------- */
      {
        title: '조흔색', short: '조흔색', icon: '🧪', phase: '실험',
        features: ['ctrl', 'reset'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 금·황동석·황철석은 겉보기 색이 모두 노란색이라 구별하기 어려웠어요.</div>' +
          '<p>광물을 <b>조흔판</b>(흰색 도자기 판)에 긁으면 <b>가루</b>의 색이 나타나요. 이 색을 <b>조흔색</b>이라고 해요. 직접 긁어서 비교해 봐요.</p>',
        setup() { setScene('streak'); resetPlate(); },
        recap: '광물 <b>가루의 색(조흔색)</b>은 겉보기 색이 같아도 광물마다 달라서, 광물을 구별하는 데 쓰여요.',
        summary: '<ul><li><b>조흔색</b>은 광물을 조흔판에 긁었을 때 나타나는 <b>가루의 색</b>이에요.</li>' +
          '<li>금: <b>노란색</b> · 황동석: <b>녹흑색</b> · 황철석: <b>검은색</b></li>' +
          '<li>겉보기 색이 모두 노란색이어도 <b>조흔색은 달라서</b> 구별할 수 있어요.</li></ul>',
        missions: [
          {
            title: '🧪 조흔판에 긁기',
            goal: '세 광물을 <b>하나씩 끌어서</b> 조흔판 위에 길게 긁어 보세요. 가루의 색을 비교해요.',
            hint: '광물을 누른 채 조흔판 위에서 옆으로 길게 끌어 보세요. 줄이 생기면 성공이에요.',
            setup() { setScene('streak'); },
            check: () => SHELF.slice(0, 3).every((id) => S.streakDone[id]),
            hold: 0.5,
            status: () => SHELF.slice(0, 3).map((id) => chk(!!S.streakDone[id], MN[id].name + (S.streakDone[id] ? ': ' + MN[id].streak : ''))).join(' · '),
            explain: '조흔색은 광물 <b>가루의 색</b>이에요. 금은 <b>노란색</b>, 황동석은 <b>녹흑색</b>(초록빛이 도는 검은색), 황철석은 <b>검은색</b>이에요. 겉보기 색은 같아도 조흔색은 달라요!',
          },
          {
            type: 'quiz', title: '🔎 어떻게 구별할까?',
            goal: '금·황동석·황철석은 겉보기 색이 모두 노란색이에요. 이 셋을 구별하는 데 가장 도움이 되는 방법은 무엇일까요?',
            setup() { setScene('streak'); },
            choices: ['더 오래, 더 가까이서 쳐다본다', '조흔판에 긁어서 가루의 색을 비교한다', '크기를 재어 본다', '손으로 만져서 온도를 비교한다'],
            answer: 1,
            feedback: [
              '오래 본다고 색이 달라 보이지는 않아요. 겉보기 색이 같으니 다른 특성이 필요해요.',
              '',
              '같은 광물도 크기는 제각각이에요. 크기는 광물의 특성이 아니에요.',
              '온도는 주변 환경에 따라 달라져서 광물을 구별하는 기준이 되지 못해요.',
            ],
            explain: '겉보기 색이 같아도 <b>조흔색</b>은 달라요. 조흔판에 긁어서 가루의 색을 비교하면 구별할 수 있어요.',
          },
          {
            type: 'quiz', title: '⚫ 가루가 검은색인 광물',
            goal: '노란색으로 보이는 광물을 조흔판에 긁었더니 <b>검은색</b> 가루가 나왔어요. 이 광물은 무엇일까요?',
            setup() { setScene('streak'); },
            choices: ['금', '황동석', '황철석', '석영'],
            answer: 2,
            feedback: [
              '금의 조흔색은 <b>노란색</b>이에요. 금은 가루도 노랗게 나와요.',
              '황동석의 조흔색은 <b>녹흑색</b>(초록빛이 도는 검은색)이에요. 검은색과는 달라요.',
              '',
              '석영은 노란색이 아니라 투명한 흰색 광물이에요.',
            ],
            explain: '<b>황철석</b>은 노란색으로 보이지만 조흔색은 <b>검은색</b>이에요. 금(노란색)이나 황동석(녹흑색)과 구별돼요.',
          },
        ],
      },
      /* ---------- 3단계 · 실험 ---------- */
      {
        title: '굳기·염산 반응·자성', short: '굳기·반응·자성', icon: '🧲', phase: '실험',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 조흔색으로 노란색 광물을 구별했어요. 광물에는 <b>또 다른 특성</b>도 있어요.</div>' +
          '<p><b>굳기</b>(석영으로 방해석 긁기), <b>묽은 염산 반응</b>, <b>자성</b>(클립 붙이기)을 직접 시험해 봐요.</p>',
        setup() { setScene('tests'); resetTests(); },
        recap: '광물은 <b>굳기</b>(석영이 방해석보다 단단), <b>염산 반응</b>(방해석에서 거품), <b>자성</b>(자철석에 클립이 붙음)으로도 구별해요.',
        summary: '<ul><li><b>굳기</b>: 석영으로 방해석을 긁으면 방해석에 <b>흠집</b>이 나요. 석영이 방해석보다 <b>더 단단</b>해요.</li>' +
          '<li><b>염산 반응</b>: 방해석에 묽은 염산을 떨어뜨리면 <b>거품</b>(이산화 탄소 기체)이 생겨요. 석영·자철석은 반응이 없어요.</li>' +
          '<li><b>자성</b>: 자철석에는 클립이 <b>붙어요</b>.</li></ul>',
        missions: [
          {
            title: '🛠️ 세 가지 시험',
            goal: '석영으로 방해석을 긁고, 방해석에 묽은 염산을 떨어뜨리고, 자철석에 클립을 가까이 가져가 보세요.',
            hint: '석영을 끌어서 방해석 위에서 문질러요. 염산 병과 클립도 끌어서 표본 위로 가져가요.',
            setup() { setScene('tests'); },
            check: () => S.res.scratch && S.res.acid && S.res.mag,
            hold: 0.6,
            status: () => [chk(S.res.scratch, '굳기'), chk(S.res.acid, '염산 반응'), chk(S.res.mag, '자성')].join(' · '),
            explain: '석영으로 방해석을 긁으면 방해석에 <b>흠집</b>이 나요 → 석영이 더 단단해요. 방해석에 <b>묽은 염산</b>을 떨어뜨리면 <b>거품</b>이 생기고, <b>자철석</b>에는 <b>클립이 붙어요</b>.',
          },
          {
            type: 'quiz', title: '💪 어느 쪽이 더 단단할까?',
            goal: '석영으로 방해석을 긁으면 방해석에 <b>흠집</b>이 생기고, 방해석으로 석영을 긁으면 <b>흠집이 생기지 않아요</b>. 더 단단한 광물은?',
            setup() { setScene('tests'); },
            choices: ['석영', '방해석', '둘의 굳기가 같다', '알 수 없다'],
            answer: 0,
            feedback: [
              '',
              '긁혀서 흠집이 난 쪽이 더 무른 광물이에요. 방해석이 석영에 긁혔지요?',
              '굳기가 같다면 서로 흠집이 나지 않아요. 한쪽에만 흠집이 났어요.',
              '서로 긁어 보면 어느 쪽이 더 단단한지 알 수 있어요.',
            ],
            explain: '단단한 광물이 무른 광물을 긁어서 <b>흠집</b>을 내요. 석영이 방해석에 흠집을 냈으므로 <b>석영이 더 단단</b>해요.',
          },
          {
            type: 'quiz', title: '🧪 시험 결과 짝짓기',
            goal: '시험 결과에 알맞은 광물을 차례로 고른 것은? <b>① 묽은 염산에서 거품이 생긴다 ② 클립이 붙는다</b>',
            setup() { setScene('tests'); },
            choices: ['① 석영 ② 방해석', '① 방해석 ② 자철석', '① 자철석 ② 석영', '① 방해석 ② 석영'],
            answer: 1,
            feedback: [
              '석영은 염산에서 거품이 생기지 않고, 방해석에도 클립이 붙지 않아요.',
              '',
              '자철석은 염산에서 거품이 생기지 않아요. 거품이 나는 쪽은 방해석이에요.',
              '석영에는 클립이 붙지 않아요. 클립이 붙는 광물은 자성이 있는 자철석이에요.',
            ],
            explain: '<b>방해석</b>은 묽은 염산에서 거품이 생기고, <b>자철석</b>은 자성이 있어 클립이 붙어요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '광물 감정과 자원', short: '광물 감정', icon: '🧐', phase: '적용',
        features: ['table'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 색·조흔색·굳기·염산 반응·자성으로 광물을 구별하는 방법을 배웠어요.</div>' +
          '<p>이제 <b>이름 모를 광물 3개</b>를 시험 도구로 감정해 봐요. 암석을 이루는 대표 광물(<b>조암 광물</b>: 장석·석영·흑운모·각섬석·휘석·감람석) 중에서는 <b>장석</b>이 가장 많아요.</p>',
        setup() { setScene('lab'); shuffleLab(); resetLab(); S.table = false; syncControls(); },
        recap: '광물은 여러 <b>특성을 시험</b>해서 감정하고, 광물과 암석은 다양하게 쓰이지만 <b>한정된 자원</b>이라 아껴 써야 해요.',
        summary: '<ul><li>조흔판·염산·클립 같은 도구로 시험한 결과를 <b>특성표</b>와 비교하면 광물의 이름을 알아낼 수 있어요.</li>' +
          '<li>석영 → <b>유리·반도체</b>, 장석 → <b>도자기</b>, 자철석 → <b>철을 만드는 재료</b>, 화강암 → <b>건축 자재</b>로 쓰여요.</li>' +
          '<li>조암 광물(암석을 이루는 대표 광물) 중 <b>장석</b>이 가장 많아요.</li>' +
          '<li>광물과 암석은 한 번 쓰면 다시 만들어지기까지 아주 오래 걸리는 <b>한정된 자원</b>이에요. 아껴 쓰고 재활용해야 해요.</li></ul>',
        missions: [
          {
            title: '🕵️ 이름 모를 광물 감정하기', manual: true,
            goal: '광물 A·B·C를 <b>시험 도구</b>(조흔판·염산·클립)로 조사하고, <b>특성표</b>와 비교해 이름을 맞혀 보세요.',
            hint: '노란색은 조흔판, 흰색 결정은 염산, 검은색은 클립으로 시험해 보세요. 광물을 누르면 이름을 고를 수 있어요.',
            setup() { setScene('lab'); S.lab.menu = null; },
            status: () => ['A', 'B', 'C'].map((l) => chk(!!S.lab.names[l], l + (S.lab.names[l] ? ': ' + MN[S.lab.names[l]].name : ''))).join(' · '),
            check() {
              const L = S.lab, letters = ['A', 'B', 'C'];
              const miss = letters.filter((l) => !L.names[l]);
              if (miss.length) return '아직 이름을 고르지 않은 광물이 있어요 (' + miss.join(', ') + '). 광물을 눌러 이름을 골라요.';
              const wrong = letters.filter((l) => L.names[l] !== L.map[l]);
              const now = new Set(wrong);
              now.forEach((l) => { if (!S.flagLab || !S.flagLab.has(l)) S.labShake = Object.assign(S.labShake || {}, { [l]: nowS() }); });
              S.flagLab = now;
              if (wrong.length) return '이름이 맞지 않는 광물이 있어요 (' + wrong.join(', ') + '). 시험 결과를 특성표와 다시 비교해 봐요.';
              const untested = letters.filter((l) => !Object.keys(L.obs[l]).length);
              if (untested.length) return '이름은 맞아요! 하지만 ' + untested.join(', ') + '는 시험을 하지 않았어요. 시험 도구로 직접 확인해 보세요.';
              return true;
            },
            explain: '조흔판으로 <b>황동석</b>(녹흑색 가루), 염산으로 <b>방해석</b>(거품), 클립으로 <b>자철석</b>(붙음)을 알아낼 수 있어요. 이렇게 <b>여러 특성을 시험</b>해서 광물을 감정해요.',
          },
          {
            title: '🏭 광물과 암석의 쓰임', manual: true,
            goal: '<b>석영·장석·자철석·화강암</b>이 쓰이는 곳을 카드에서 골라 알맞은 칸에 놓아 보세요.',
            hint: '유리와 반도체에는 석영, 도자기 원료로는 장석, 철을 만드는 재료로는 자철석, 건물을 짓는 데는 단단한 화강암을 써요.',
            setup() { setScene('uses'); S.useSlots = {}; S.useSel = null; S.flagUse = new Set(); },
            status: () => USES.map((u) => chk(!!S.useSlots[u.id], u.label)).join(' · '),
            check() {
              const un = USES.filter((u) => !S.useSlots[u.id]);
              if (un.length) return '아직 카드를 놓지 않은 광물이 있어요: ' + un.map((u) => u.label).join(', ');
              const wrong = USES.filter((u) => S.useSlots[u.id] !== u.id), now = new Set(wrong.map((u) => S.useSlots[u.id]));
              wrong.forEach((u) => { if (!S.flagUse.has(S.useSlots[u.id])) S.useShake[u.id] = nowS(); });
              S.flagUse = now;
              if (wrong.length) return '쓰임이 맞지 않는 짝이 있어요 (' + wrong.map((u) => u.label).join(', ') + '). 각 광물의 특성을 떠올려 봐요.';
              return true;
            },
            explain: '<b>석영</b>은 유리와 반도체, <b>장석</b>은 도자기, <b>자철석</b>은 철을 만드는 재료, <b>화강암</b>은 단단해서 건축 자재로 쓰여요.',
          },
          {
            type: 'quiz', title: '♻️ 소중한 자원',
            goal: '광물과 암석 자원에 대한 생각으로 가장 알맞은 것은 무엇일까요?',
            setup() { setScene('uses'); },
            choices: ['땅속에 아주 많아서 아무리 써도 없어지지 않는다', '한 번 쓰면 다시 만들어지기까지 아주 오래 걸리므로 아껴 쓰고 재활용해야 한다', '필요하면 금방 다시 만들어 낼 수 있다', '광물은 쓸모가 없는 돌멩이에 불과하다'],
            answer: 1,
            feedback: [
              '많아 보여도 쓰면 줄어들어요. 광물과 암석은 한정된 자원이에요.',
              '',
              '광물이 만들어지려면 아주 오랜 시간이 걸려요. 금방 다시 만들 수 없어요.',
              '광물과 암석은 건물, 전자 제품, 도자기 등 우리 생활 곳곳에 쓰여요.',
            ],
            explain: '광물과 암석은 쓰고 나면 다시 만들어지기까지 <b>아주 오랜 시간</b>이 걸리는 <b>한정된 자원</b>이에요. 그래서 아껴 쓰고 재활용해야 해요.',
          },
        ],
      },
    ],
  });
  syncControls();

  /* =========================================================
     실행
     ========================================================= */
  SciSim.loop((dt, t) => {
    try {
      update(dt, t);
      views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    } catch (e) { console.error(e); }
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, MINERALS, SHELF, USES, game: () => game, view: activeView, setScene,
    client(x, y) { const V = activeView(), r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    shelfCard(id) { const V = activeView(), c = shelfGeo(V.L).cards.find((q) => q.id === id); return this.client(c.x + c.w / 2, c.y + c.h / 2); },
    shelfViewer() { const V = activeView(), G = shelfGeo(V.L); return this.client(G.vx, G.vcy); },
    blindSlot(i) { const V = activeView(), sl = blindGeo(V.L).slots[i]; return this.client(sl.x, sl.cy); },
    dockSpec(id) { const V = activeView(), G = streakGeo(V.L), d = G.docks.find((q) => q.id === id), h = specHome(G, d, V.L.key === 'wide'); return this.client(h.x, h.y); },
    platePt(u, w) { const V = activeView(), P = streakGeo(V.L).plate; return this.client(P.x + P.w * u, P.y + P.h * w); },
    ready: () => true,
    pedClient(key) { const V = activeView(), t = targetsOf(V.L).find((q) => q.key === key); return this.client(t.x, t.y); },
    pipClient() { const V = activeView(), G = geoNow(V.L), ph = pipHome(G); return this.client(ph.x - 15, ph.y - 54); },
    clipClient() { const V = activeView(), G = geoNow(V.L); return this.client(G.clip.x, G.clip.y); },
    nameBtn(letter) { const V = activeView(), G = labGeo(V.L), p = G.peds.find((q) => q.letter === letter); return this.client(p.x, G.nameY); },
    menuItem(id) { const V = activeView(), G = labGeo(V.L), M = nameMenuGeo(G, V.L), it = M.items.find((q) => q.id === id); return this.client(it.x + it.w / 2, it.y + it.h / 2); },
    labPlatePt(u, w) { const V = activeView(), P = labGeo(V.L).plate; return this.client(P.x + P.w * u, P.y + P.h * w); },
    useCard(id) { const V = activeView(), c = V.cards[id]; return this.client(c.x, c.y); },
    useSlot(id) { const V = activeView(), it = usesGeo(V.L).items.find((q) => q.id === id), s = it.slot; return this.client(s.x + s.w / 2, s.y + s.h / 2); },
    setLabMap(m) { S.lab.map = m; },
    drawSpecimen,
    bench(n) { const V = activeView(); const t0 = performance.now(); for (let i = 0; i < n; i++) { draw(V, nowS()); V.ctx.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / n; },
  };

  /* =========================================================
     3단계 화면: 굳기 · 염산 반응 · 자성 시험대
     ========================================================= */
  const TEST_IDS = ['quartz', 'calcite', 'magnetite'];
  function testsGeo(L) {
    if (L.key === 'wide') {
      return {
        M: { x: 12, y: 12, w: 776, h: 616 },
        peds: [160, 400, 640].map((x, i) => ({ id: TEST_IDS[i], x, plat: 312, cy: 250, s: 96 })),
        dropper: { x: 112, y: 556, label: '묽은 염산' }, clip: { x: 300, y: 548, label: '클립' }, trayR: { x: 34, y: 416, w: 380, h: 196 },
        rec: { x: 430, y: 408, w: 346, h: 206 },
      };
    }
    return {
      M: { x: 10, y: 10, w: 500, h: 826 },
      peds: [90, 260, 430].map((x, i) => ({ id: TEST_IDS[i], x, plat: 262, cy: 216, s: 58 })),
      dropper: { x: 122, y: 460, label: '묽은 염산' }, clip: { x: 372, y: 452, label: '클립' }, trayR: { x: 24, y: 350, w: 472, h: 190 },
      rec: { x: 24, y: 556, w: 472, h: 262 },
    };
  }
  const pedOf = (G, id) => G.peds.find((q) => q.id === id);
  function drawPipette(ctx, x, y, ang, sq, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const sc = o.scale || 1; ctx.scale(sc, sc);
    // 유리관
    const gl = ctx.createLinearGradient(-6, 0, 6, 0); gl.addColorStop(0, 'rgba(255,255,255,.75)'); gl.addColorStop(0.3, 'rgba(200,230,255,.35)'); gl.addColorStop(1, 'rgba(150,190,230,.55)');
    ctx.beginPath(); ctx.moveTo(-1.8, 0); ctx.lineTo(-5, -26); ctx.lineTo(-5, -74); ctx.lineTo(5, -74); ctx.lineTo(5, -26); ctx.lineTo(1.8, 0); ctx.closePath();
    ctx.fillStyle = gl; ctx.fill(); ctx.strokeStyle = 'rgba(210,235,255,.9)'; ctx.lineWidth = 1.4; ctx.stroke();
    // 액체
    ctx.beginPath(); ctx.moveTo(-1.5, -1); ctx.lineTo(-4.2, -26); ctx.lineTo(-4.2, -44); ctx.lineTo(4.2, -44); ctx.lineTo(4.2, -26); ctx.lineTo(1.5, -1); ctx.closePath();
    ctx.fillStyle = 'rgba(120,214,255,.75)'; ctx.fill();
    // 고무 마개
    const bh = 40 * (1 - 0.25 * sq), bw = 22 * (1 + 0.18 * sq);
    const bg = ctx.createRadialGradient(-5, -80 - bh * 0.5, 2, 0, -78 - bh / 2, bh * 0.8); bg.addColorStop(0, '#e86a6a'); bg.addColorStop(1, '#8e1f26');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -76 - bh / 2, bw / 2, bh / 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3b2a2a'; roundRect(ctx, -8, -80, 16, 8, 3); ctx.fill();
    ctx.restore();
  }
  function drawBottle(ctx, x, y, label, L) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 34, 34, 8, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0); g.addColorStop(0, '#5b3a1c'); g.addColorStop(0.35, '#a8702e'); g.addColorStop(1, '#4a2e14');
    roundRect(ctx, x - 26, y - 24, 52, 58, 12); ctx.fillStyle = g; ctx.fill();
    roundRect(ctx, x - 11, y - 38, 22, 18, 5); ctx.fillStyle = g; ctx.fill();
    roundRect(ctx, x - 17, y - 8, 34, 28, 4); ctx.fillStyle = '#f7f3e8'; ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.font = fnt(L, 12, '800'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HCl', x, y + 2);
    ctx.fillStyle = '#333'; ctx.font = fnt(L, 9, '700'); ctx.fillText('묽은 염산', x, y + 13);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; roundRect(ctx, x - 22, y - 18, 5, 40, 3); ctx.fill();
    ctx.restore();
  }
  function drawClipShape(ctx, x, y, ang, sc) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc || 1, sc || 1);
    ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const g = ctx.createLinearGradient(-9, -18, 9, 18); g.addColorStop(0, '#f2f6fb'); g.addColorStop(0.5, '#aab6c6'); g.addColorStop(1, '#7c8797');
    ctx.strokeStyle = g;
    ctx.beginPath(); ctx.moveTo(-3.5, 14); ctx.lineTo(-3.5, -9); ctx.arc(0, -9, 3.5, Math.PI, 0); ctx.lineTo(3.5, 12); ctx.arc(0, 12, 3.5, 0, Math.PI * 0.5, false); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 11); ctx.lineTo(-8, -14); ctx.arc(-3.5, -14, 4.5, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 11); ctx.arc(-3.5, 11, 4.5, Math.PI, Math.PI * 0.45, true); ctx.stroke();
    ctx.restore();
  }
  function hullPath(ctx, hull, cx, cy) { ctx.beginPath(); hull.forEach((q, i) => { if (i) ctx.lineTo(cx + q[0], cy + q[1]); else ctx.moveTo(cx + q[0], cy + q[1]); }); ctx.closePath(); }
  function drawTests(V, t) {
    const ctx = V.ctx, L = V.L, G = testsGeo(L), fs = L.fs, wide = L.key === 'wide';
    benchPanel(ctx, G.M, t);
    const msg = S.tipText && nowS() - S.tipText.t0 < 3.4 ? S.tipText.text : (S.held ? '시험할 표본 위에서 문질러 보세요' : '표본이나 도구를 끌어서 시험해 보세요');
    pill(ctx, msg, G.M.x + G.M.w / 2, G.M.y + 30 * fs, { font: fnt(L, 14.5, 'bold'), bg: 'rgba(8,16,40,.84)', h: 28 * fs, pad: 14, stroke: 'rgba(160,190,255,.35)' });
    // 표본
    G.peds.forEach((p) => {
      const m = MN[p.id], held = S.held && S.held.id === p.id, rot = { yaw: m.yaw, pitch: m.pitch };
      pedestal(ctx, p.x, p.plat, p.s * 2.15);
      if (held) { ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(p.x, p.plat, p.s * 0.8, p.s * 0.17, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      else {
        specShadow(ctx, p.x, p.plat + 2, p.s * 0.8);
        drawSpec(V, p.id, p.x, p.cy, p.s, rot);
        // 흠집
        const sc = S.scratch[p.id];
        if (sc && sc.length) {
          const spr = spriteOf(V, p.id, p.s, rot);
          ctx.save(); hullPath(ctx, spr.hull, p.x, p.cy); ctx.clip();
          sc.forEach((st) => {
            if (st.length < 2) return;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(30,34,44,.55)'; ctx.lineWidth = 3.4; ctx.beginPath(); st.forEach((q, i) => { const X = p.x + q[0] * p.s + 1, Y = p.cy + q[1] * p.s + 1; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.7; ctx.beginPath(); st.forEach((q, i) => { const X = p.x + q[0] * p.s, Y = p.cy + q[1] * p.s; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke();
          });
          ctx.restore();
        }
      }
      pill(ctx, m.name, p.x, p.plat + 34 * fs, { font: fnt(L, 16, 'bold'), bg: 'rgba(255,255,255,.14)', h: 26 * fs, pad: 12 });
      // 시험 완료 표시
      const done = (p.id === 'calcite' && (S.res.scratch || S.res.acid)) || (p.id === 'magnetite' && S.res.mag);
      if (done) { ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(p.x + p.s * 1.05, p.plat - p.s * 1.35, 12, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x + p.s * 1.05 - 5, p.plat - p.s * 1.35); ctx.lineTo(p.x + p.s * 1.05 - 1, p.plat - p.s * 1.35 + 4); ctx.lineTo(p.x + p.s * 1.05 + 6, p.plat - p.s * 1.35 - 4); ctx.stroke(); }
    });
    // 거품
    if (S.fizz && nowS() - S.fizz.t0 < 4) {
      const k = nowS() - S.fizz.t0, a = 1 - smooth(2.6, 4, k);
      ctx.save(); ctx.globalAlpha = a;
      for (let i = 0; i < 16; i++) { const r = rng(i * 17 + 3), ox = (r() - 0.5) * 70, oy = (r() - 0.5) * 22, rr = 3 + r() * 5 + Math.sin(k * 6 + i) * 0.8; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(S.fizz.x + ox, S.fizz.y + oy, rr, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(190,225,255,.85)'; ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.restore();
    }
    // 방울
    S.drops.forEach((d) => { const k = clamp((nowS() - d.t0) / d.dur, 0, 1), e = k * k, x = d.x0 + (d.x1 - d.x0) * e, y = d.y0 + (d.y1 - d.y0) * e; if (k < 1) { ctx.fillStyle = 'rgba(140,224,255,.95)'; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.moveTo(x - 3.6, y - 1); ctx.lineTo(x, y - 11); ctx.lineTo(x + 3.6, y - 1); ctx.fill(); } });
    // 도구 쟁반
    const tr = G.trayR;
    roundRect(ctx, tr.x, tr.y, tr.w, tr.h, 14); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.font = fnt(L, 13.5, '800'); ctx.fillStyle = 'rgba(232,239,255,.75)'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('🧰 시험 도구', tr.x + tr.w - 14, tr.y + 20 * fs);
    // 스포이트 병 + 스포이트
    const dk = G.dropper, dp = S.dropper;
    drawBottle(ctx, dk.x + 4, dk.y + 8, '', L);
    if (dp.home && !dp.held) drawPipette(ctx, dk.x - 8, dk.y - 6, -0.28, 0, { scale: 0.9 });
    // 클립
    const ck = G.clip, cl = S.clip;
    if (cl.home && !cl.held && !cl.attached) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(ck.x + 3, ck.y + 26, 12, 4, 0, 0, TAU); ctx.fill(); drawClipShape(ctx, ck.x, ck.y, -0.5, 1.7); }
    pill(ctx, ck.label, ck.x, tr.y + tr.h - 18 * fs, { font: fnt(L, 13, 'bold'), bg: 'rgba(255,255,255,.12)', h: 22 * fs, pad: 9 });
    // 관찰 기록
    drawRecord(V, G, t);
    // 들고 있는 것들 (맨 위)
    if (S.held && (S.scene === 'tests')) {
      const h = S.held, m = MN[h.id], s = pedOf(G, h.id).s;
      specShadow(ctx, h.x + 8, h.y + 30, s * 0.7, 0.6);
      drawSpec(V, h.id, h.x, h.y - s * 0.55, s, { yaw: m.yaw, pitch: m.pitch }, { live: true });
      circle(ctx, h.x, h.y, 4); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    }
    if (dp.held || !dp.home) drawPipette(ctx, dp.x, dp.y, -0.35, dp.squeeze, { scale: 1.05 });
    if (cl.held || !cl.home || cl.attached) drawClipShape(ctx, cl.x, cl.y, cl.ang, 1.8);
  }
  function drawRecord(V, G, t) {
    const ctx = V.ctx, L = V.L, R = G.rec, fs = L.fs, wide = L.key === 'wide';
    roundRect(ctx, R.x, R.y, R.w, R.h, 14); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = dfnt(L, 19); ctx.fillStyle = '#fff'; ctx.fillText('📋 관찰 기록', R.x + 16, R.y + 24 * fs);
    const rowH = (R.h - 44 * fs) / 3;
    const rows = [
      { k: '굳기', ok: S.res.scratch, t1: S.res.scratch ? '석영이 방해석에 흠집을 내요' : '석영으로 방해석을 긁어 봐요', t2: S.res.scratch ? (S.res.reverse ? '방해석은 석영에 흠집을 못 내요' : '→ 석영이 더 단단해요') : '' },
      { k: '염산 반응', ok: S.res.acid, t1: S.res.acid ? '방해석에서 거품이 생겨요' : '방해석에 묽은 염산을 떨어뜨려 봐요', t2: S.res.acid ? (Object.keys(S.acidTried).length ? (S.acidTried.quartz ? '석영' : '') + (S.acidTried.quartz && S.acidTried.magnetite ? '·' : '') + (S.acidTried.magnetite ? '자철석' : '') + ': 거품 없음' : '') : '' },
      { k: '자성', ok: S.res.mag, t1: S.res.mag ? '자철석에 클립이 붙어요' : '자철석에 클립을 가까이 가져가요', t2: S.res.mag ? (Object.keys(S.magTried).length ? (S.magTried.quartz ? '석영' : '') + (S.magTried.quartz && S.magTried.calcite ? '·' : '') + (S.magTried.calcite ? '방해석' : '') + ': 붙지 않아요' : '') : '' },
    ];
    rows.forEach((r, i) => {
      const y = R.y + 40 * fs + i * rowH;
      ctx.fillStyle = r.ok ? 'rgba(34,197,94,.18)' : 'rgba(255,255,255,.05)'; roundRect(ctx, R.x + 10, y, R.w - 20, rowH - 6, 10); ctx.fill();
      ctx.fillStyle = r.ok ? '#22c55e' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(R.x + 30, y + (rowH - 6) / 2, 11, 0, TAU); ctx.fill();
      if (r.ok) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(R.x + 25, y + (rowH - 6) / 2); ctx.lineTo(R.x + 29, y + (rowH - 6) / 2 + 4); ctx.lineTo(R.x + 36, y + (rowH - 6) / 2 - 4); ctx.stroke(); }
      ctx.textAlign = 'left'; ctx.fillStyle = '#ffe9b8'; ctx.font = fnt(L, 14, '800'); ctx.fillText(r.k, R.x + 50, y + (rowH - 6) * (r.t2 ? 0.28 : 0.3));
      ctx.fillStyle = r.ok ? '#fff' : 'rgba(232,239,255,.62)'; ctx.font = fnt(L, 13, '700');
      ctx.fillText(r.t1, R.x + 50 + 74 * fs, y + (rowH - 6) * (r.t2 ? 0.28 : 0.3));
      if (r.t2) { ctx.fillStyle = 'rgba(232,239,255,.8)'; ctx.font = fnt(L, 12.5, '600'); ctx.fillText(r.t2, R.x + 50, y + (rowH - 6) * 0.72); }
    });
  }

  /* =========================================================
     4단계 화면: 이름 모를 광물 감정실 · 광물 특성표
     ========================================================= */
  function labGeo(L) {
    if (L.key === 'wide') {
      return {
        M: { x: 12, y: 12, w: 776, h: 616 },
        peds: ['A', 'B', 'C'].map((letter, i) => ({ letter, x: 150 + i * 250, plat: 262, cy: 214, s: 72, labY: 86 })),
        chipY: 318, nameY: 440, plate: { x: 38, y: 490, w: 292, h: 120 },
        dropper: { x: 424, y: 578, label: '묽은 염산' }, clip: { x: 540, y: 566, label: '클립' }, trayR: { x: 24, y: 472, w: 560, h: 148 },
        note: { x: 596, y: 470, w: 180, h: 150 },
      };
    }
    return {
      M: { x: 10, y: 10, w: 500, h: 826 },
      peds: ['A', 'B', 'C'].map((letter, i) => ({ letter, x: 90 + i * 170, plat: 232, cy: 188, s: 54, labY: 76 })),
      chipY: 290, nameY: 410, plate: { x: 24, y: 470, w: 472, h: 150 },
      dropper: { x: 130, y: 726, label: '묽은 염산' }, clip: { x: 380, y: 720, label: '클립' }, trayR: { x: 24, y: 636, w: 472, h: 186 },
      note: null,
    };
  }
  function labPlate(L) { return labGeo(L).plate; }
  function labRecordStreak(V, h) {
    if (h.len >= 60 && h.letter) {
      const o = S.lab.obs[h.letter];
      if (!o.streak) { Sound.tone(880, 0.1, 'triangle', 0.08); ringFx(V, h.x, h.y, 24, '#ffd36b'); }
      o.streak = MN[h.id].streak;
    }
  }
  function drawLab(V, t) {
    const ctx = V.ctx, L = V.L, G = labGeo(L), fs = L.fs, wide = L.key === 'wide';
    benchPanel(ctx, G.M, t);
    ensurePlate(V, { plate: G.plate });
    const msg = S.tipText && nowS() - S.tipText.t0 < 3.4 ? S.tipText.text : '시험 도구로 A·B·C를 조사해 이름을 맞혀 보세요';
    pill(ctx, msg, G.M.x + G.M.w / 2, G.M.y + 28 * fs, { font: fnt(L, 14.5, 'bold'), bg: 'rgba(8,16,40,.84)', h: 28 * fs, pad: 14, stroke: 'rgba(160,190,255,.35)' });
    const tgs = targetsOf(L);
    G.peds.forEach((p, i) => {
      const id = S.lab.map[p.letter], m = MN[id], held = S.held && S.held.letter === p.letter;
      ctx.save();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.labY + 12, 21 * fs, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1f2a44'; ctx.font = dfnt(L, 26); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.letter, p.x, p.labY + 14);
      ctx.restore();
      pedestal(ctx, p.x, p.plat, p.s * 2.2);
      if (held) { ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(p.x, p.plat, p.s * 0.8, p.s * 0.17, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      else { specShadow(ctx, p.x, p.plat + 2, p.s * 0.8); drawSpec(V, id, p.x, p.cy, p.s, { yaw: m.yaw, pitch: m.pitch }); }
      // 시험 기록 칩
      const o = S.lab.obs[p.letter], rows = [
        ['조흔색', o.streak ? o.streak : null, o.streak ? MN[id].streakCol : null],
        [wide ? '염산 반응' : '염산', o.acid ? (o.acid === 'yes' ? '거품 있음' : '거품 없음') : null, null],
        ['자성', o.mag ? (o.mag === 'yes' ? (wide ? '클립이 붙음' : '붙음') : (wide ? '붙지 않음' : '안 붙음')) : null, null],
      ];
      rows.forEach((r, k) => {
        const y = G.chipY + k * 30 * fs, w = wide ? 214 : 160;
        roundRect(ctx, p.x - w / 2, y - 12 * fs, w, 25 * fs, 12 * fs);
        ctx.fillStyle = r[1] ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.05)'; ctx.fill(); ctx.strokeStyle = r[1] ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.15)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.font = fnt(L, wide ? 12.5 : 11.5, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(232,239,255,.7)'; ctx.fillText(r[0], p.x - w / 2 + 10, y + 1);
        ctx.fillStyle = r[1] ? '#fff' : 'rgba(232,239,255,.35)'; ctx.textAlign = 'right';
        if (r[2]) { ctx.fillStyle = r[2]; ctx.beginPath(); ctx.arc(p.x + w / 2 - 10 - ctx.measureText(r[1]).width - 10, y, 6 * fs, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#fff'; }
        ctx.fillText(r[1] || (wide ? '아직 시험 안 함' : '시험 전'), p.x + w / 2 - 10, y + 1);
      });
      // 이름 고르기 버튼
      const nm = S.lab.names[p.letter], bw = wide ? 190 : 150, bh = 34 * fs, by = G.nameY;
      let sh = 0; if (S.labShake && S.labShake[p.letter]) { const k = (nowS() - S.labShake[p.letter]) / 0.45; if (k < 1) sh = k; }
      const bad = S.flagLab && S.flagLab.has(p.letter);
      ctx.save(); if (sh) ctx.translate(Math.sin(sh * 40) * 5 * (1 - sh), 0);
      roundRect(ctx, p.x - bw / 2, by - bh / 2, bw, bh, bh / 2); ctx.fillStyle = nm ? (bad ? 'rgba(239,68,68,.85)' : '#0e9fd3') : 'rgba(255,255,255,.12)'; ctx.fill();
      ctx.strokeStyle = nm ? '#fff' : 'rgba(94,234,212,.9)'; ctx.lineWidth = nm ? 2 : 2.4; if (!nm) { ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 12; } ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(nm ? MN[nm].name + ' ▾' : '👆 이름 고르기', p.x, by + 1);
      ctx.restore();
    });
    // 도구 쟁반
    const tr = G.trayR;
    roundRect(ctx, tr.x, tr.y, tr.w, tr.h, 14); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.3; ctx.stroke();
    
    // 조흔판
    const P = G.plate;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 7; roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.fillStyle = '#d8d0bd'; ctx.fill(); ctx.restore();
    ctx.drawImage(V.plate.base, P.x, P.y, P.w, P.h); ctx.drawImage(V.plate.streak, P.x, P.y, P.w, P.h);
    ctx.font = fnt(L, 12, 'bold'); ctx.fillStyle = 'rgba(110,90,60,.55)'; ctx.textAlign = 'left'; ctx.fillText('조흔판', P.x + 14, P.y + P.h - 14 * fs);
    S.strokes.forEach((st) => { if (st.pts.length > 3 && st.letter) { const mid = st.pts[Math.floor(st.pts.length / 2)]; pill(ctx, st.letter, P.x + mid[0] * P.w, P.y + mid[1] * P.h - 14 * fs, { font: fnt(L, 12.5, 'bold'), bg: 'rgba(31,42,68,.88)', h: 20 * fs, pad: 8 }); } });
    // 스포이트 · 클립
    const dk = G.dropper, dp = S.dropper, ck = G.clip, cl = S.clip;
    drawBottle(ctx, dk.x + 4, dk.y + 8, '', L);
    if (dp.home && !dp.held) drawPipette(ctx, dk.x - 8, dk.y - 6, -0.28, 0, { scale: 0.9 });
    if (cl.home && !cl.held && !cl.attached) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(ck.x + 3, ck.y + 26, 12, 4, 0, 0, TAU); ctx.fill(); drawClipShape(ctx, ck.x, ck.y, -0.5, 1.7); }
    pill(ctx, ck.label, ck.x, tr.y + tr.h - 16 * fs, { font: fnt(L, 13, 'bold'), bg: 'rgba(255,255,255,.12)', h: 22 * fs, pad: 9 });
    if (G.note) {
      const n = G.note; roundRect(ctx, n.x, n.y, n.w, n.h, 14); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = '#ffe9b8'; ctx.font = fnt(L, 13.5, '800'); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const lines = ['조흔판: 광물을 끌어 긋기', '염산: 스포이트를 광물 위로', '클립: 광물 가까이로'];
      lines.forEach((ln, i) => { ctx.fillStyle = i ? 'rgba(232,239,255,.85)' : '#ffe9b8'; ctx.font = fnt(L, 13, i ? '600' : '800'); ctx.fillText(ln, n.x + 12, n.y + 30 * fs + i * 30 * fs); });
    }
    // 들고 있는 것
    if (S.held && S.scene === 'lab') {
      const h = S.held, m = MN[h.id], s = G.peds[0].s * 1.2;
      specShadow(ctx, h.x + (h.onPlate ? 6 : 14), h.y + (h.onPlate ? 12 : 40), s * 0.8, 0.6);
      drawSpec(V, h.id, h.x, h.y - s * 0.55, s, { yaw: m.yaw + 0.5, pitch: m.pitch + 0.1 }, { live: true });
    }
    drawHeldTools(V, G);
    drawFizzAndDrops(V, tgs);
    // 이름 고르기 메뉴
    if (S.lab.menu) drawNameMenu(V, G);
    if (S.table) drawTable(V, G.M);
  }
  function drawHeldTools(V, G) {
    const ctx = V.ctx, dp = S.dropper, cl = S.clip;
    if (dp.held || !dp.home) drawPipette(ctx, dp.x, dp.y, -0.35, dp.squeeze, { scale: 1.05 });
    if (cl.held || !cl.home || cl.attached) drawClipShape(ctx, cl.x, cl.y, cl.ang, 1.8);
  }
  function drawFizzAndDrops(V, tgs) {
    const ctx = V.ctx;
    if (S.fizz && nowS() - S.fizz.t0 < 4) {
      const k = nowS() - S.fizz.t0, a = 1 - smooth(2.6, 4, k);
      ctx.save(); ctx.globalAlpha = a;
      for (let i = 0; i < 16; i++) { const r = rng(i * 17 + 3), ox = (r() - 0.5) * 70, oy = (r() - 0.5) * 22, rr = 3 + r() * 5 + Math.sin(k * 6 + i) * 0.8; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(S.fizz.x + ox, S.fizz.y + oy, rr, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(190,225,255,.85)'; ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.restore();
    }
    S.drops.forEach((d) => { const k = clamp((nowS() - d.t0) / d.dur, 0, 1), e = k * k, x = d.x0 + (d.x1 - d.x0) * e, y = d.y0 + (d.y1 - d.y0) * e; if (k < 1) { ctx.fillStyle = 'rgba(140,224,255,.95)'; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.moveTo(x - 3.6, y - 1); ctx.lineTo(x, y - 11); ctx.lineTo(x + 3.6, y - 1); ctx.fill(); } });
  }
  function nameMenuGeo(G, L) {
    const m = S.lab.menu, p = G.peds.find((q) => q.letter === m.letter), fs = L.fs;
    const cols = 2, bw = 92 * fs, bh = 36 * fs, gap = 6, rows = 3, w = cols * bw + (cols + 1) * gap, h = rows * bh + (rows + 1) * gap + 24 * fs;
    let x = clamp(p.x - w / 2, G.M.x + 6, G.M.x + G.M.w - w - 6), y = G.nameY - 24 * fs - h;
    if (y < G.M.y + 50) y = G.nameY + 26 * fs;
    const items = SHELF.map((id, i) => ({ id, x: x + gap + (i % cols) * (bw + gap), y: y + 24 * fs + gap + Math.floor(i / cols) * (bh + gap), w: bw, h: bh }));
    return { x, y, w, h, items };
  }
  function drawNameMenu(V, G) {
    const ctx = V.ctx, L = V.L, M = nameMenuGeo(G, L), fs = L.fs;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    roundRect(ctx, M.x, M.y, M.w, M.h, 14); ctx.fillStyle = 'rgba(18,28,52,.97)'; ctx.fill(); ctx.restore();
    roundRect(ctx, M.x, M.y, M.w, M.h, 14); ctx.strokeStyle = 'rgba(160,190,255,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(232,239,255,.8)'; ctx.font = fnt(L, 13, '800'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(S.lab.menu.letter + '의 이름은?', M.x + M.w / 2, M.y + 16 * fs);
    M.items.forEach((it) => {
      const sel = S.lab.names[S.lab.menu.letter] === it.id;
      roundRect(ctx, it.x, it.y, it.w, it.h, 10); ctx.fillStyle = sel ? '#0e9fd3' : 'rgba(255,255,255,.1)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold'); ctx.fillText(MN[it.id].name, it.x + it.w / 2, it.y + it.h / 2 + 1);
    });
  }
  // 광물 특성표 (겉보기 색 · 조흔색 · 염산 반응 · 자성)
  function drawTable(V, M) {
    const ctx = V.ctx, L = V.L, fs = L.fs, wide = L.key === 'wide';
    const x = M.x + 14, y = M.y + 54 * fs, w = M.w - 28, rowH = (wide ? 56 : 58) * fs, hh = 38 * fs;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    roundRect(ctx, x, y, w, hh + rowH * 6 + 40 * fs, 16); ctx.fillStyle = 'rgba(14,22,44,.97)'; ctx.fill(); ctx.restore();
    roundRect(ctx, x, y, w, hh + rowH * 6 + 40 * fs, 16); ctx.strokeStyle = 'rgba(160,190,255,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
    const cols = wide ? [0.14, 0.27, 0.24, 0.19, 0.16] : [0.17, 0.27, 0.22, 0.19, 0.15];
    let cx = x; const xs = cols.map((c) => { const v = cx; cx += c * w; return v; });
    const heads = ['광물', '겉보기 색', '조흔색', '염산 반응', '자성'];
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    heads.forEach((h, i) => { ctx.fillStyle = '#ffe9b8'; ctx.font = fnt(L, wide ? 15 : 13, '800'); ctx.fillText(h, xs[i] + 12, y + hh / 2); });
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 10, y + hh); ctx.lineTo(x + w - 10, y + hh); ctx.stroke();
    SHELF.forEach((id, r) => {
      const m = MN[id], ry = y + hh + r * rowH + rowH / 2;
      if (r % 2) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(x + 6, ry - rowH / 2, w - 12, rowH); }
      ctx.fillStyle = '#fff'; ctx.font = dfnt(L, wide ? 20 : 17); ctx.fillText(m.name, xs[0] + 12, ry);
      // 색 칸들
      ctx.font = fnt(L, wide ? 14 : 11.5, '700');
      ctx.fillStyle = m.swatch; ctx.beginPath(); ctx.arc(xs[1] + 18, ry, 8 * fs, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#e8efff'; ctx.fillText(m.color.replace('투명한 ', '투명 '), xs[1] + 32, ry);
      ctx.fillStyle = m.streakCol; ctx.beginPath(); ctx.arc(xs[2] + 18, ry, 8 * fs, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#e8efff'; ctx.fillText(m.streak, xs[2] + 32, ry);
      ctx.fillStyle = m.acid ? '#7fe3ff' : 'rgba(232,239,255,.5)'; ctx.fillText(m.acid ? '거품이 생겨요' : '반응 없음', xs[3] + 12, ry);
      ctx.fillStyle = m.mag ? '#ffd36b' : 'rgba(232,239,255,.5)'; ctx.fillText(m.mag ? '클립이 붙어요' : '붙지 않아요', xs[4] + 12, ry);
    });
    ctx.fillStyle = 'rgba(232,239,255,.85)'; ctx.font = fnt(L, wide ? 14 : 12, '700'); ctx.textAlign = 'left';
    ctx.fillText('굳기: 석영이 방해석보다 단단해요 (방해석에는 흠집이 나요)', x + 16, y + hh + rowH * 6 + 22 * fs);
    ctx.restore();
  }

  /* =========================================================
     시험 도구 (스포이트 · 클립 · 문질러 긁기): 3단계 시험대 · 4단계 감정실 공통
     ========================================================= */
  const pipHome = (G) => ({ x: G.dropper.x - 8, y: G.dropper.y - 6 });
  const geoNow = (L) => (S.scene === 'tests' ? testsGeo(L) : labGeo(L));
  function targetsOf(L) {
    if (S.scene === 'tests') return testsGeo(L).peds.map((p) => ({ key: p.id, id: p.id, x: p.x, y: p.cy, s: p.s, plat: p.plat }));
    return labGeo(L).peds.map((p) => ({ key: p.letter, id: S.lab.map[p.letter], letter: p.letter, x: p.x, y: p.cy, s: p.s, plat: p.plat }));
  }
  const specAt = (L, p, r) => targetsOf(L).find((t) => Math.hypot(p.x - t.x, p.y - t.y) < t.s * (r || 1.05)) || null;
  const labelOf = (tg) => (tg.letter ? tg.letter : MN[tg.id].name);
  function recordAcid(tg, yes) {
    if (S.scene === 'tests') { if (yes) S.res.acid = true; else S.acidTried[tg.id] = true; }
    else S.lab.obs[tg.letter].acid = yes ? 'yes' : 'no';
  }
  function recordMag(tg, yes) {
    if (S.scene === 'tests') { if (yes) S.res.mag = true; else S.magTried[tg.id] = true; }
    else S.lab.obs[tg.letter].mag = yes ? 'yes' : 'no';
  }
  function startDrop(V, p, tg) {
    S.drops.push({ x0: p.x, y0: p.y + 2, x1: tg.x + (Math.random() - 0.5) * 14, y1: tg.y - tg.s * 0.12, t0: nowS(), dur: 0.3, tg });
    S.dropper.squeeze = 1; Sound.tone(520, 0.05, 'sine', 0.05);
  }
  function landDrop(V, d) {
    const tg = d.tg, yes = !!MN[tg.id].acid;
    recordAcid(tg, yes);
    if (yes) {
      S.fizz = { x: tg.x, y: tg.y - tg.s * 0.1, t0: nowS(), acc: 0 };
      Sound.tone(1500, 0.05, 'square', 0.02); Sound.tone(1900, 0.06, 'square', 0.018, 0.06);
      tip(S.scene === 'tests' ? '방해석에서 거품이 생겼어요!' : labelOf(tg) + '에서 거품이 생겼어요!');
      ringFx(V, tg.x, tg.y - tg.s * 0.1, 20, '#7fe3ff');
    } else {
      ringFx(V, d.x1, d.y1, 12, '#7fb7ff');
      tip(labelOf(tg) + '에서는 거품이 생기지 않아요');
    }
  }
  function rubMove(V, p) {
    const G = testsGeo(V.L), h = S.held, other = h.id === 'quartz' ? 'calcite' : h.id === 'calcite' ? 'quartz' : null;
    if (!other) return;
    const tg = pedOf(G, other), d = Math.hypot(p.x - tg.x, p.y - tg.cy);
    if (d < tg.s * 0.95) {
      if (h.lx != null) {
        const mv = Math.hypot(p.x - h.lx, p.y - h.ly);
        if (mv > 2) {
          h.rub = (h.rub || 0) + mv;
          if (h.id === 'quartz') {
            if (!h.stroke) { h.stroke = []; S.scratch.calcite.push(h.stroke); }
            h.stroke.push([(p.x - tg.x) / tg.s, (p.y - tg.cy) / tg.s]);
            for (let i = 0; i < 2; i++) V.P.emit({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 60, vy: -20 + Math.random() * 20, life: 0.55, size: 1.2 + Math.random() * 1.4, color: '#f4f2e8', gravity: 220, shape: 'square' });
            if (h.rub > 70 && !S.res.scratch) { S.res.scratch = true; Sound.tone(880, 0.1, 'triangle', 0.08); Sound.tone(1175, 0.12, 'triangle', 0.07, 0.07); ringFx(V, tg.x, tg.cy, tg.s * 0.8, '#34d399'); tip('방해석에 흠집이 생겼어요! 석영이 더 단단해요'); }
          } else {
            V.P.emit({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 30, vy: -10, life: 0.4, size: 1.1, color: '#e9e6da', gravity: 150, shape: 'square' });
            if (h.rub > 70 && !S.res.reverse) { S.res.reverse = true; Sound.tone(420, 0.1, 'triangle', 0.06); tip('방해석으로는 석영에 흠집이 나지 않아요'); }
          }
          if (Math.random() < 0.25) Sound.tone(200 + Math.random() * 60, 0.04, 'sawtooth', 0.012);
        }
      }
      h.lx = p.x; h.ly = p.y;
    } else { h.lx = null; h.stroke = null; }
  }
  function sceneHover(V, p) {
    const L = V.L;
    if (S.scene === 'tests' || S.scene === 'lab') {
      const G = geoNow(L), ph = pipHome(G);
      if (Math.hypot(p.x - (ph.x - 15), p.y - (ph.y - 54)) < 48 || Math.hypot(p.x - G.clip.x, p.y - G.clip.y) < 36) return 'grab';
      if (specAt(L, p, 1.05)) return S.scene === 'tests' ? 'grab' : 'pointer';
      return null;
    }
    if (S.scene === 'uses') { const G = usesGeo(L); return cardAtU(V, p) ? 'grab' : null; }
    return null;
  }
  function sceneBlocks(V, p) {
    const L = V.L;
    if (S.scene === 'tests' || S.scene === 'lab') {
      const G = geoNow(L), ph = pipHome(G);
      return !!(S.lab.menu || S.dropper.held || S.clip.held || specAt(L, p, 1.1) || Math.hypot(p.x - (ph.x - 15), p.y - (ph.y - 54)) < 50 || Math.hypot(p.x - G.clip.x, p.y - G.clip.y) < 40 || (S.scene === 'lab' && (inRect(p, G.plate) || G.peds.some((q) => Math.abs(p.x - q.x) < 100 && Math.abs(p.y - G.nameY) < 24))));
    }
    if (S.scene === 'uses') return !!cardAtU(V, p) || usesGeo(L).items.some((it) => inRect(p, it.slot));
    return false;
  }
  function sceneHeldOnPlate(V, p) { const P = labPlate(V.L); return p.x > P.x + 6 && p.x < P.x + P.w - 6 && p.y > P.y + 6 && p.y < P.y + P.h - 6; }
  function sceneDown(V, p) {
    const L = V.L;
    if (S.scene === 'tests' || S.scene === 'lab') {
      const G = geoNow(L), ph = pipHome(G), dp = S.dropper, cl = S.clip;
      if (S.scene === 'lab' && S.lab.menu) {
        const M = nameMenuGeo(G, L), it = M.items.find((q) => inRect(p, q));
        if (it) {
          const letter = S.lab.menu.letter; S.lab.names[letter] = it.id; if (S.flagLab) S.flagLab.delete(letter);
          Sound.tone(700, 0.08, 'triangle', 0.07); const pd = G.peds.find((q) => q.letter === letter); ringFx(V, pd.x, G.nameY, 36, '#5eead4');
        }
        S.lab.menu = null; return null;
      }
      if (!dp.held && (dp.home ? Math.hypot(p.x - (ph.x - 15), p.y - (ph.y - 54)) < 50 : Math.hypot(p.x - dp.x, p.y - (dp.y - 54)) < 50)) {
        dp.held = true; dp.home = false; dp.ret = false; dp.x = p.x; dp.y = p.y; dp.vx = dp.vy = 0; Sound.tick(); return { kind: 'dropper' };
      }
      const cp = cl.home && !cl.attached ? { x: G.clip.x, y: G.clip.y } : { x: cl.x, y: cl.y };
      if (!cl.held && Math.hypot(p.x - cp.x, p.y - cp.y) < 38) {
        if (cl.home) { cl.x = G.clip.x; cl.y = G.clip.y; }
        cl.held = true; cl.home = false; cl.ret = false; cl.attached = null; cl.px = p.x; cl.py = p.y; cl.vx = cl.vy = 0; Sound.tick(); return { kind: 'clip' };
      }
      if (S.scene === 'tests') {
        const tg = specAt(L, p, 1.05);
        if (tg && (tg.id === 'quartz' || tg.id === 'calcite')) { S.held = { id: tg.id, x: p.x, y: p.y, lx: null, ly: null, rub: 0, stroke: null }; Sound.tick(); return { kind: 'tspec' }; }
        if (tg) { tip(MN[tg.id].name + ': 겉보기 색은 ' + MN[tg.id].color + '이에요'); return null; }
        return null;
      }
      // 감정실: 이름 버튼 · 표본
      for (let i = 0; i < G.peds.length; i++) { const q = G.peds[i], bw = (L.key === 'wide' ? 190 : 150) / 2; if (Math.abs(p.x - q.x) < bw && Math.abs(p.y - G.nameY) < 22 * L.fs) { S.lab.menu = { letter: q.letter }; Sound.tick(); return null; } }
      const tg = specAt(L, p, 1.1);
      if (tg) { S.held = { id: tg.id, letter: tg.letter, x: p.x, y: p.y, x0: p.x, y0: p.y, onPlate: false, len: 0, stroke: null }; Sound.tick(); return { kind: 'held' }; }
      return null;
    }
    if (S.scene === 'uses') {
      const G = usesGeo(L), cid = cardAtU(V, p);
      if (cid) { const c = V.cards[cid]; S.useDrag = { id: cid, x: c.x, y: c.y, gx: p.x - c.x, gy: p.y - c.y, x0: p.x, y0: p.y, moved: false }; Sound.tick(); return { kind: 'ucard' }; }
      const it = G.items.find((q) => inRect(p, q.slot));
      if (it && S.useSel) { placeUse(V, S.useSel, it.id); S.useSel = null; return null; }
      return null;
    }
    return null;
  }
  function sceneMove(V, drag, p) {
    const L = V.L;
    if (drag.kind === 'dropper') { S.dropper.x = p.x; S.dropper.y = p.y; }
    else if (drag.kind === 'clip') { S.clip.px = p.x; S.clip.py = p.y; }
    else if (drag.kind === 'tspec' && S.held) { S.held.x = p.x; S.held.y = p.y; rubMove(V, p); }
    else if (drag.kind === 'ucard' && S.useDrag) {
      const d = S.useDrag; d.x = p.x - d.gx; d.y = p.y - d.gy;
      if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) > 8) d.moved = true;
      const it = usesGeo(L).items.find((q) => inRect(p, q.slot, 6)); d.over = it ? it.id : null;
    }
  }
  function sceneUp(V, drag, p) {
    const L = V.L;
    if (drag.kind === 'dropper') {
      const dp = S.dropper; dp.held = false;
      const tg = specAt(L, p, 1.1);
      if (tg) { startDrop(V, p, tg); dp.hold = nowS() + 0.55; }
      dp.ret = true;
    } else if (drag.kind === 'clip') {
      const cl = S.clip; cl.held = false;
      if (!cl.attached) {
        cl.ret = true;
        const tg = specAt(L, p, 1.0);
        if (tg && tg.id !== 'magnetite') { recordMag(tg, false); tip(labelOf(tg) + '에는 클립이 붙지 않아요'); }
      }
    } else if (drag.kind === 'tspec') {
      if (S.held) ringFx(V, S.held.x, S.held.y, 14, 'rgba(255,255,255,.8)');
      S.held = null;
    } else if (drag.kind === 'ucard' && S.useDrag) {
      const d = S.useDrag; S.useDrag = null;
      const G = usesGeo(L), it = G.items.find((q) => inRect(p, q.slot, 6));
      if (d.moved) { if (it) placeUse(V, d.id, it.id); else { const prev = Object.keys(S.useSlots).find((k) => S.useSlots[k] === d.id); if (prev) delete S.useSlots[prev]; } }
      else { if (it) placeUse(V, d.id, it.id); else S.useSel = S.useSel === d.id ? null : d.id; }
    }
  }
  function updateScene(dt, t) {
    if (S.scene !== 'tests' && S.scene !== 'lab') return;
    const V = activeView(), L = V.L, G = geoNow(L), dp = S.dropper, cl = S.clip, now = nowS();
    // 스포이트 돌아가기
    if (!dp.held && dp.ret && now >= (dp.hold || 0)) {
      const ph = pipHome(G); springTo(dp, ph.x, ph.y, dt, 190, 20);
      if (Math.hypot(dp.x - ph.x, dp.y - ph.y) < 3 && Math.hypot(dp.vx, dp.vy) < 12) { dp.home = true; dp.ret = false; }
    }
    if (dp.squeeze > 0) dp.squeeze = Math.max(0, dp.squeeze - dt * 3);
    // 방울이 닿으면
    for (let i = S.drops.length - 1; i >= 0; i--) { const d = S.drops[i]; if (now - d.t0 >= d.dur) { S.drops.splice(i, 1); landDrop(V, d); } }
    // 거품
    if (S.fizz && now - S.fizz.t0 < 3.4) {
      S.fizz.acc += dt * 42;
      while (S.fizz.acc >= 1) {
        S.fizz.acc -= 1;
        V.P.emit({ x: S.fizz.x + (Math.random() - 0.5) * 60, y: S.fizz.y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 26, vy: -40 - Math.random() * 60, life: 0.7 + Math.random() * 0.6, size: 2 + Math.random() * 3.6, color: '#d8f0ff', shape: 'bubble', gravity: -20, drag: 0.4 });
      }
      if (Math.random() < dt * 14) Sound.tone(1600 + Math.random() * 900, 0.03, 'square', 0.012);
    }
    // 클립: 자석에 끌려가요
    const mgT = targetsOf(L).find((q) => MN[q.id].mag);
    const ap = mgT ? { x: mgT.x - mgT.s * 0.66, y: mgT.y - mgT.s * 0.08 } : null;
    if (cl.held && mgT) {
      const px = cl.px != null ? cl.px : cl.x, py = cl.py != null ? cl.py : cl.y, d = Math.hypot(px - mgT.x, py - mgT.y);
      const w = smooth(mgT.s * 2.5, mgT.s * 1.05, d);
      let tx = px + (ap.x - px) * w * w, ty = py + (ap.y - py) * w * w;
      let ang = -0.45 + (Math.atan2(mgT.y - ty, mgT.x - tx) + 0.45 - Math.PI / 2 + 0.3) * 0.0 + (-0.2 - (-0.45)) * w;
      if (!cl.attached && d < mgT.s * 1.08) {
        cl.attached = mgT.key; recordMag(mgT, true); Sound.tone(300, 0.07, 'square', 0.05); Sound.tone(620, 0.1, 'triangle', 0.08, 0.05);
        ringFx(V, ap.x, ap.y, 22, '#ffd36b'); V.P.burst(ap.x, ap.y, { count: 8, colors: ['#ffd36b', '#ffffff'], speed: 90, gravity: 60, size: 2.5, life: 0.6 });
        tip(S.scene === 'tests' ? '자철석에 클립이 붙었어요!' : labelOf(mgT) + '에 클립이 붙었어요!');
      }
      if (cl.attached) { tx = ap.x; ty = ap.y; ang = -0.2 + Math.sin(t * 3) * 0.04; if (d > mgT.s * 2.3) cl.attached = null; }
      cl.x = approach(cl.x, tx, dt, 24); cl.y = approach(cl.y, ty, dt, 24); cl.ang = approach(cl.ang, ang, dt, 12);
      // 자석이 아닌 표본 위에서 잠깐 머무르면 안내
      const o = targetsOf(L).find((q) => !MN[q.id].mag && Math.hypot(px - q.x, py - q.y) < q.s * 1.0);
      if (o) { if (!cl.near || cl.near.key !== o.key) cl.near = { key: o.key, t0: now }; else if (now - cl.near.t0 > 0.8 && !cl.near.done) { cl.near.done = true; recordMag(o, false); tip(labelOf(o) + '에는 클립이 붙지 않아요'); } } else cl.near = null;
    } else if (!cl.held && cl.attached && ap) {
      cl.x = approach(cl.x, ap.x, dt, 14); cl.y = approach(cl.y, ap.y, dt, 14); cl.ang = -0.2 + Math.sin(t * 2.4) * 0.05;
    } else if (!cl.held && cl.ret) {
      springTo(cl, G.clip.x, G.clip.y, dt, 190, 20); cl.ang = approach(cl.ang, -0.5, dt, 8);
      if (Math.hypot(cl.x - G.clip.x, cl.y - G.clip.y) < 3 && Math.hypot(cl.vx, cl.vy) < 12) { cl.home = true; cl.ret = false; }
    }
  }

  /* =========================================================
     4단계 화면: 광물과 암석의 쓰임 짝짓기
     ========================================================= */
  const USE_ORDER = ['magnetite', 'granite', 'feldspar', 'quartz'];
  function usesGeo(L) {
    const wide = L.key === 'wide';
    const items = USES.map((u, i) => wide
      ? { id: u.id, x: 28, y: 92 + i * 128, w: 420, h: 112, slot: { x: 28 + 226, y: 92 + i * 128 + 18, w: 180, h: 76 } }
      : { id: u.id, x: 20, y: 70 + i * 106, w: 480, h: 96, slot: { x: 20 + 250, y: 70 + i * 106 + 10, w: 214, h: 76 } });
    const cards = USE_ORDER.map((id, i) => wide
      ? { id, x: 470 + (i % 2) * 160, y: 92 + Math.floor(i / 2) * 192, w: 150, h: 180 }
      : { id, x: 20 + (i % 2) * 244, y: 514 + Math.floor(i / 2) * 150, w: 236, h: 140 });
    return { M: wide ? { x: 12, y: 12, w: 776, h: 616 } : { x: 10, y: 10, w: 500, h: 826 }, items, cards };
  }
  function useTarget(V, G, id) {
    const home = G.cards.find((c) => c.id === id);
    if (S.useDrag && S.useDrag.id === id) return { x: S.useDrag.x, y: S.useDrag.y, w: home.w * 1.06, h: home.h * 1.06, drag: true };
    const slotOf = Object.keys(S.useSlots).find((k) => S.useSlots[k] === id);
    if (slotOf) { const it = G.items.find((q) => q.id === slotOf), s = it.slot; return { x: s.x + s.w / 2, y: s.y + s.h / 2, w: s.w - 8, h: s.h - 8 }; }
    return { x: home.x + home.w / 2, y: home.y + home.h / 2, w: home.w, h: home.h };
  }
  function cardAtU(V, p) {
    const ids = USE_ORDER.slice().reverse();
    for (let i = 0; i < ids.length; i++) { const c = V.cards && V.cards[ids[i]]; if (c && Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return ids[i]; }
    return null;
  }
  function placeUse(V, cardId, itemId) {
    const prev = Object.keys(S.useSlots).find((k) => S.useSlots[k] === cardId), old = S.useSlots[itemId];
    if (prev) delete S.useSlots[prev];
    S.useSlots[itemId] = cardId;
    if (old && old !== cardId && prev) S.useSlots[prev] = old;
    S.flagUse.delete(cardId); if (old) S.flagUse.delete(old);
    Sound.tone(700, 0.08, 'triangle', 0.07);
    const G = usesGeo(V.L), it = G.items.find((q) => q.id === itemId), s = it.slot; ringFx(V, s.x + s.w / 2, s.y + s.h / 2, 30, '#5eead4');
  }
  function drawUses(V, t) {
    const ctx = V.ctx, L = V.L, G = usesGeo(L), fs = L.fs, wide = L.key === 'wide', dt = V.dt || 0.016;
    if (!V.cards) V.cards = {};
    benchPanel(ctx, G.M, t);
    pill(ctx, S.tipText && nowS() - S.tipText.t0 < 3 ? S.tipText.text : '카드를 끌어서 알맞은 칸에 놓아요', G.M.x + G.M.w / 2, G.M.y + 30 * fs, { font: fnt(L, 14.5, 'bold'), bg: 'rgba(8,16,40,.84)', h: 28 * fs, pad: 14, stroke: 'rgba(160,190,255,.35)' });
    G.items.forEach((it) => {
      const u = USES.find((q) => q.id === it.id), m = MN[it.id], filled = S.useSlots[it.id];
      let sh = 0; if (S.useShake[it.id]) { const k = (nowS() - S.useShake[it.id]) / 0.45; if (k < 1) sh = k; }
      ctx.save(); if (sh) ctx.translate(Math.sin(sh * 40) * 5 * (1 - sh), 0);
      roundRect(ctx, it.x, it.y, it.w, it.h, 14); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.3; ctx.stroke();
      const sp = wide ? 36 : 32;
      pedestal(ctx, it.x + 62, it.y + it.h * 0.72, 92);
      specShadow(ctx, it.x + 62, it.y + it.h * 0.72 + 2, sp * 0.8);
      drawSpec(V, it.id, it.x + 62, it.y + it.h * 0.72 - sp * 0.62, sp, { yaw: m.yaw, pitch: m.pitch });
      ctx.fillStyle = '#fff'; ctx.font = dfnt(L, 24); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(u.label, it.x + 122, it.y + it.h * 0.38);
      ctx.font = fnt(L, 12.5, '700'); ctx.fillStyle = 'rgba(232,239,255,.7)'; ctx.fillText(it.id === 'granite' ? '(암석)' : it.id === 'magnetite' ? '(광물)' : '(조암 광물)', it.x + 122, it.y + it.h * 0.68);
      const s = it.slot, over = S.useDrag && S.useDrag.over === it.id;
      if (!filled) {
        roundRect(ctx, s.x, s.y, s.w, s.h, 12); ctx.fillStyle = over ? 'rgba(120,220,255,.28)' : 'rgba(255,255,255,.06)'; ctx.fill();
        ctx.setLineDash([6, 5]); ctx.lineDashOffset = -nowS() * 10; ctx.strokeStyle = over ? '#7fe3ff' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
        ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = 'rgba(232,239,255,.65)'; ctx.textAlign = 'center'; ctx.fillText('쓰임 카드를 놓아요', s.x + s.w / 2, s.y + s.h / 2);
      }
      ctx.restore();
    });
    // 카드
    const ids = USE_ORDER.slice().sort((a, b) => (S.useDrag && S.useDrag.id === a ? 1 : 0) - (S.useDrag && S.useDrag.id === b ? 1 : 0));
    USE_ORDER.forEach((id) => { const h = G.cards.find((c) => c.id === id); roundRect(ctx, h.x, h.y, h.w, h.h, 14); ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fill(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]); });
    USE_ORDER.forEach((id) => {
      const tg = useTarget(V, G, id); let c = V.cards[id];
      if (!c) { const h = G.cards.find((q) => q.id === id); c = V.cards[id] = { x: h.x + h.w / 2, y: h.y + h.h / 2, vx: 0, vy: 0, w: h.w, h: h.h }; }
      if (tg.drag) { c.x = approach(c.x, tg.x, dt, 40); c.y = approach(c.y, tg.y, dt, 40); c.vx = c.vy = 0; } else springTo(c, tg.x, tg.y, dt, 230, 20);
      c.w = approach(c.w, tg.w, dt, 15); c.h = approach(c.h, tg.h, dt, 15);
    });
    ids.forEach((id) => {
      const c = V.cards[id], u = USES.find((q) => q.id === id), drag = S.useDrag && S.useDrag.id === id, sel = S.useSel === id;
      const slotOf = Object.keys(S.useSlots).find((k) => S.useSlots[k] === id), bad = S.flagUse.has(id) && !!slotOf;
      let sh = 0; if (slotOf && S.useShake[slotOf]) { const k = (nowS() - S.useShake[slotOf]) / 0.45; if (k < 1) sh = k; }
      ctx.save(); if (sh) ctx.translate(Math.sin(sh * 40) * 5 * (1 - sh), 0);
      ctx.shadowColor = 'rgba(0,0,0,' + (drag ? 0.5 : 0.3) + ')'; ctx.shadowBlur = drag ? 20 : 8; ctx.shadowOffsetY = drag ? 10 : 3;
      roundRect(ctx, c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 14); ctx.fillStyle = '#f4f7ff'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = bad ? '#ef4444' : sel ? '#38bdf8' : '#c6d3ee'; ctx.lineWidth = bad || sel ? 3.2 : 1.5; ctx.stroke();
      const small = c.h < 100;
      ctx.textAlign = small ? 'left' : 'center'; ctx.textBaseline = 'middle';
      ctx.font = Math.round((small ? 30 : 46) * fs) + 'px ' + FONT; ctx.fillStyle = '#1f2a44';
      if (small) { ctx.fillText(u.emoji, c.x - c.w / 2 + 12, c.y); ctx.font = fnt(L, 14.5, '800'); drawWrapped(ctx, u.use, c.x - c.w / 2 + 12 + 40 * fs, c.y - (u.use.length > 8 ? 9 : 0), c.w - 62 * fs, 18 * fs, 2); }
      else { ctx.fillText(u.emoji, c.x, c.y - c.h * 0.17); ctx.font = fnt(L, 16, '800'); ctx.textAlign = 'center'; drawWrapped(ctx, u.use, c.x, c.y + c.h * 0.22, c.w - 16, 20 * fs, 2); }
      ctx.restore();
    });
  }
  function drawScene2(V, t) {
    if (S.scene === 'tests') drawTests(V, t);
    else if (S.scene === 'lab') drawLab(V, t);
    else if (S.scene === 'uses') drawUses(V, t);
  }
})();
