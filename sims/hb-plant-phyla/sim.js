/* =========================================================
   고등학교 생명과학 Ⅲ. 생명의 연속성과 다양성 - 식물의 분류군 (단원 39, 7차시)
   성취기준 [12생과03-05] 동물과 식물 분류군의 특징을 문 수준에서 이해하고, 생물의 유연관계를 계통수로 나타낼 수 있다. (식물 부분)
   ① 관찰: 식물의 몸 (가상 정원, 확대경, 형질 체크리스트)  ② 탐구: 이분 검색표  ③ 설명: 4개 문의 특징  ④ 적용: 식물도감
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const BGCOL = '#eef6ea';
  /* ---------- 공통 도구 (kit) ---------- */
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const ease = SciSim.ease;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* 한글 조사: 받침 있으면 첫째, 없으면 둘째 */
  function josa(word, pair) {
    const w = String(word), c = w.charCodeAt(w.length - 1);
    let batchim;
    if (c >= 0xAC00 && c <= 0xD7A3) batchim = (c - 0xAC00) % 28 !== 0;
    else batchim = '013678'.indexOf(w[w.length - 1]) >= 0;
    const ab = pair.split('/');
    if (pair === '으로/로') { const rieul = c >= 0xAC00 && (c - 0xAC00) % 28 === 8; return batchim && !rieul ? '으로' : '로'; }
    return batchim ? ab[0] : ab[1];
  }
  const withJosa = (w, p) => w + josa(w, p);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BGCOL });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill, o) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); if (o && o.stroke) { D.roundRect(x, y, w, h, r || 14); ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); } }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const inRect = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  /* 글자 크기를 줄여 상자 폭에 맞춰요 (최소 13) */
  function fitText(str, maxW, size, weight, minSize) {
    ctx.save();
    let s = size;
    ctx.font = D.font(s, weight || 800);
    while (ctx.measureText(str).width > maxW && s > (minSize || 13)) { s -= 0.5; ctx.font = D.font(s, weight || 800); }
    ctx.restore(); return s;
  }
  /* 칩 (둥근 알약) 그리기: 폭은 글자에 맞춤 */
  function chip(x, y, str, o) {
    o = o || {};
    const size = o.size || 13;
    ctx.save(); ctx.font = D.font(size, o.weight || 800);
    const w = Math.max(o.minW || 0, ctx.measureText(str).width + (o.pad != null ? o.pad : 10) * 2), h = o.h || size + 10;
    ctx.restore();
    const lx = o.align === 'center' ? x - w / 2 : x;
    D.roundRect(lx, y - h / 2, w, h, h / 2); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = o.lw || 1.5; ctx.stroke(); }
    T(lx + w / 2, y + size * 0.36, str, size, o.color || '#1b2333', 'center', o.weight || 800);
    return { x: lx, y: y - h / 2, w, h };
  }
  /* 카드(전체 라운드 사각형) + 가운데 글자 */
  function box(r, str, o) {
    o = o || {};
    D.roundRect(r.x, r.y, r.w, r.h, o.r != null ? o.r : 10);
    ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
    if (str != null && str !== '') {
      const sz = fitText(str, r.w - 8, o.size || 14, o.weight || 800, o.minSize || 12.5);
      T(r.x + r.w / 2, r.y + r.h / 2 + sz * 0.36, str, sz, o.color || '#1b2333', 'center', o.weight || 800);
    }
  }
  /* 곡선 점 */
  function cPts(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    return out;
  }
  function polyline(pts, close) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); }
  function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }

  /* ---------- 드래그 토큰 ---------- */
  /* items: {id, x, y, w, h, hx, hy, lift, ...}  cfg: {drawItem(item, t), canGrab(item), drop(item, p) -> {x,y,slot}|null, tap(item, p), moved(item)} */
  function Tokens(cfg) {
    const T_ = { items: [], drag: null, cfg };
    T_.add = (it) => { it.lift = 0; it.x = it.hx; it.y = it.hy; it.sx = 0; it.sy = 0; T_.items.push(it); return it; };
    T_.hit = (p) => { for (let i = T_.items.length - 1; i >= 0; i--) { const it = T_.items[i]; if ((!cfg.canGrab || cfg.canGrab(it)) && inRect(p, { x: it.x - it.w / 2, y: it.y - it.h / 2, w: it.w, h: it.h }, 4)) return it; } return null; };
    T_.down = (p) => {
      const it = T_.hit(p); if (!it) return false;
      T_.items.splice(T_.items.indexOf(it), 1); T_.items.push(it);
      T_.drag = { it, ox: it.x - p.x, oy: it.y - p.y, x0: p.x, y0: p.y, moved: false };
      SciSim.tween(it, { lift: 1 }, { duration: 0.12, ease: 'outCubic' });
      return true;
    };
    T_.move = (p) => {
      const d = T_.drag; if (!d) return;
      if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) > 6) d.moved = true;
      if (d.moved) { d.it.x = p.x + d.ox; d.it.y = p.y + d.oy; }
    };
    T_.up = (p) => {
      const d = T_.drag; if (!d) return; T_.drag = null;
      const it = d.it;
      SciSim.tween(it, { lift: 0 }, { duration: 0.18, ease: 'outCubic' });
      if (!d.moved) { it.x = it.hx; it.y = it.hy; if (it.at) { it.x = it.at.x; it.y = it.at.y; } cfg.tap && cfg.tap(it, p); return; }
      const r = cfg.drop ? cfg.drop(it, p) : null;
      if (r) { it.at = { x: r.x, y: r.y }; SciSim.tween(it, { x: r.x, y: r.y }, { duration: 0.28, ease: 'outBack' }); }
      else { it.at = null; SciSim.tween(it, { x: it.hx, y: it.hy }, { duration: 0.3, ease: 'outCubic' }); }
    };
    return T_;
  }
  /* =========================================================
     자료: 가상 정원 식물 8종 (문 수준 분류)
     ========================================================= */
  const PH = [
    { k: 'bryo', n: '선태식물문', short: '선태식물', col: '#4f9d3a', soft: '#e3f3da' },
    { k: 'fern', n: '양치식물문', short: '양치식물', col: '#0f9d8a', soft: '#d9f3ee' },
    { k: 'gym', n: '겉씨식물문', short: '겉씨식물', col: '#b4690e', soft: '#fbead2' },
    { k: 'ang', n: '속씨식물문', short: '속씨식물', col: '#d6336c', soft: '#fde4ee' },
  ];
  // vasc: 관다발, seed: 종자, ovary: 씨방 (1 있음 / 0 없음)
  const PL = [
    { n: '우산이끼', ph: 0, vasc: 0, seed: 0, ovary: 0, hab: '습하고 그늘진 바위·땅', cm: '2~3 cm', see: '헛뿌리 · 엽상체' },
    { n: '솔이끼', ph: 0, vasc: 0, seed: 0, ovary: 0, hab: '습한 숲 바닥·나무 밑동', cm: '3~10 cm', see: '포자낭 · 포자' },
    { n: '고사리', ph: 1, vasc: 1, seed: 0, ovary: 0, hab: '습한 숲속과 산기슭', cm: '40~100 cm', see: '관다발 · 포자낭군' },
    { n: '소나무', ph: 2, vasc: 1, seed: 1, ovary: 0, hab: '산등성이와 메마른 산', cm: '20 m 이상', see: '솔방울 · 드러난 밑씨' },
    { n: '은행나무', ph: 2, vasc: 1, seed: 1, ovary: 0, hab: '숲과 가로수, 정원', cm: '20 m 이상', see: '드러난 종자' },
    { n: '벼', ph: 3, vasc: 1, seed: 1, ovary: 1, hab: '논과 물이 있는 밭', cm: '약 1 m', see: '작은 꽃 · 씨방' },
    { n: '민들레', ph: 3, vasc: 1, seed: 1, ovary: 1, hab: '길가와 풀밭', cm: '10~30 cm', see: '꽃 · 씨방' },
    { n: '장미', ph: 3, vasc: 1, seed: 1, ovary: 1, hab: '정원과 울타리', cm: '1~2 m', see: '꽃 · 씨방 · 열매' },
  ];
  const NP = PL.length;
  const TR = [{ k: 'vasc', n: '관다발', label: '관다발' }, { k: 'seed', n: '종자', label: '종자' }, { k: 'ovary', n: '씨방', label: '씨방' }];
  const trueOf = (i, k) => PL[i][k];
  const HAB_BAD = ['깊은 바닷속', '사막의 모래 언덕', '물이 전혀 없는 빙하 위'];
  const HAB_OPTS = PL.map((p, i) => { const arr = [p.hab, HAB_BAD[i % 3], HAB_BAD[(i + 1) % 3]]; const sh = [(i) % 3, (i + 1) % 3, (i + 2) % 3]; return sh.map((j) => arr[j]); });

  /* =========================================================
     식물 그림 (밑동 중앙이 원점, 위쪽이 -y, 높이 약 100)
     ========================================================= */
  function leafShape(len, wid) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -wid, len, 0); ctx.quadraticCurveTo(len * 0.5, wid, 0, 0); ctx.closePath(); }
  function frond(ang, len, curl, col1, col2, nLeaf) {
    ctx.save(); ctx.rotate(ang);
    const ex = curl * len, ey = -len * 0.82;
    const pts = [];
    for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push([2 * (1 - u) * u * (ex * 0.3) + u * u * ex, 2 * (1 - u) * u * (-len * 0.95) + u * u * ey]); }
    ctx.strokeStyle = col1; ctx.lineWidth = 2; polyline(pts); ctx.stroke();
    for (let k = 2; k <= nLeaf + 1; k++) {
      const u = k / (nLeaf + 1.4), idx = Math.min(15, Math.floor(u * 16)), p = pts[idx], q = pts[idx + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const sz = (1 - u * 0.75) * len * 0.26;
      for (const sd of [-1, 1]) { ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a + sd * 1.1); ctx.fillStyle = k % 2 ? col1 : col2; leafShape(sz, sz * 0.32); ctx.fill(); ctx.restore(); }
    }
    ctx.restore();
  }
  function fan(x, y, r, rot, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, -Math.PI * 0.82, -Math.PI * 0.18); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.9); ctx.stroke(); ctx.restore(); }
  function sprite(i, x, y, sc, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    const sw = RM || o.still ? 0 : Math.sin((t || 0) * 1.5 + i * 1.3) * 0.045;
    ctx.rotate(sw);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (i === 0) {          // 우산이끼
      ctx.fillStyle = '#2b7a30'; ell(0, -4, 40, 9); ctx.fill();
      ctx.fillStyle = '#3d9a42'; ell(-8, -9, 26, 7); ctx.fill(); ell(22, -8, 14, 5); ctx.fill();
      for (const dx of [-14, 17]) {
        ctx.strokeStyle = '#78ad4f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx, -8); ctx.lineTo(dx, -42); ctx.stroke();
        ctx.fillStyle = '#9ccc4a'; ell(dx, -46, 15, 5.5); ctx.fill();
        ctx.strokeStyle = '#7aa83a'; ctx.lineWidth = 1.6; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(dx + k * 6, -44); ctx.lineTo(dx + k * 7, -38); ctx.stroke(); }
      }
    } else if (i === 1) {   // 솔이끼
      ctx.fillStyle = '#2f7d36'; ell(0, -5, 38, 9); ctx.fill();
      const rr = mulberry(11);
      for (let k = 0; k < 26; k++) { const bx = -34 + rr() * 68, h = 8 + rr() * 16; ctx.strokeStyle = k % 2 ? '#3f9a45' : '#2a7430'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, -3); ctx.lineTo(bx + (rr() - 0.5) * 4, -3 - h); ctx.stroke(); for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(bx, -3 - h * (0.4 + s * 0.2)); ctx.lineTo(bx + 4, -3 - h * (0.5 + s * 0.2)); ctx.stroke(); } }
      for (const [dx, hh] of [[-16, 54], [4, 64], [22, 48]]) {
        ctx.strokeStyle = '#b08a5b'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(dx, -8); ctx.quadraticCurveTo(dx + 4, -hh * 0.6, dx + 2, -hh); ctx.stroke();
        ctx.fillStyle = '#8d5a2b'; ell(dx + 2, -hh - 6, 4.4, 8, 0.15); ctx.fill();
        ctx.fillStyle = '#c8a06a'; ell(dx + 2, -hh - 13, 3, 2.6); ctx.fill();
      }
    } else if (i === 2) {   // 고사리
      frond(-0.9, 66, -0.55, '#2e8b3d', '#43a047', 8); frond(0.9, 66, 0.55, '#2e8b3d', '#43a047', 8);
      frond(-0.45, 82, -0.3, '#37954a', '#4caf50', 10); frond(0.45, 82, 0.3, '#37954a', '#4caf50', 10); frond(0, 92, 0.15, '#2e8b3d', '#52b356', 11);
      ctx.fillStyle = '#6d4c2f'; ell(0, -2, 10, 4); ctx.fill();
    } else if (i === 3) {   // 소나무
      ctx.fillStyle = '#7a4e2d'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(3, -86); ctx.lineTo(-3, -86); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7a4e2d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-22, -38); ctx.moveTo(0, -50); ctx.lineTo(24, -58); ctx.moveTo(0, -68); ctx.lineTo(-14, -76); ctx.stroke();
      const cl = [[-24, -40, 24, 10], [26, -60, 24, 10], [-14, -78, 21, 9], [0, -94, 14, 8], [-2, -58, 18, 8]];
      cl.forEach(([cx, cy, rx, ry], k) => { ctx.fillStyle = k % 2 ? '#2c6b3a' : '#357a43'; ell(cx, cy, rx, ry); ctx.fill(); ctx.strokeStyle = '#5aa45c'; ctx.lineWidth = 1.1; for (let s = -4; s <= 4; s++) { ctx.beginPath(); ctx.moveTo(cx + s * rx / 4.5, cy); ctx.lineTo(cx + s * rx / 4.5 + 2, cy - ry * 0.9); ctx.stroke(); } });
      ctx.fillStyle = '#8d5a2b'; ell(-30, -30, 4, 6.5, 0.4); ctx.fill(); ell(32, -50, 4, 6.5, -0.4); ctx.fill();
    } else if (i === 4) {   // 은행나무
      ctx.fillStyle = '#8b6a46'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(3, -50); ctx.lineTo(-3, -50); ctx.closePath(); ctx.fill();
      const rr = mulberry(4);
      for (let k = 0; k < 34; k++) { const a = rr() * TAU, rad = Math.sqrt(rr()); fan(Math.cos(a) * 34 * rad, -72 + Math.sin(a) * 28 * rad, 10 + rr() * 3, (rr() - 0.5) * 1.4, k % 3 === 0 ? '#c9d84a' : k % 3 === 1 ? '#a8c93e' : '#d7de5a'); }
      ctx.fillStyle = '#e8a93a'; for (const [bx, by] of [[-18, -60], [14, -52], [24, -76], [-6, -84]]) { ctx.beginPath(); ctx.arc(bx, by, 3.6, 0, TAU); ctx.fill(); }
    } else if (i === 5) {   // 벼
      const bl = [[-0.5, 78, -0.32], [-0.2, 88, -0.18], [0.15, 92, 0.2], [0.45, 80, 0.35], [0.05, 70, -0.05]];
      bl.forEach(([a, len, cv], k) => { ctx.save(); ctx.rotate(a); ctx.strokeStyle = k % 2 ? '#5aa83a' : '#46912f'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(cv * len * 0.6, -len * 0.7, cv * len * 1.15, -len * 0.82); ctx.stroke(); ctx.restore(); });
      ctx.strokeStyle = '#7fae43'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(4, -70, 16, -80); ctx.quadraticCurveTo(34, -82, 36, -60); ctx.stroke();
      ctx.fillStyle = '#e1b94a'; for (let k = 0; k < 11; k++) { const u = k / 10, px = 16 + 20 * Math.sin(u * 1.6) + 0, py = -80 + u * 24 * 1.0; ell(px + (k % 2 ? 2.5 : -2.5), py, 2.4, 4.2, 0.4); ctx.fill(); }
    } else if (i === 6) {   // 민들레
      const rr = mulberry(8);
      for (let k = 0; k < 8; k++) { const a = -0.3 - k * 0.36 + (k > 3 ? 0.4 : 0), lx = Math.cos(a) * 34, ly = Math.sin(a) * 9; ctx.save(); ctx.translate(0, -2); ctx.rotate(Math.PI * (k / 7) * 0.0 + (k - 3.5) * 0.4); ctx.fillStyle = k % 2 ? '#4a9a3b' : '#3d8a30'; ctx.beginPath(); ctx.moveTo(0, 0); for (let z = 1; z <= 5; z++) { ctx.lineTo(z * 7 + 2, -(z % 2 ? 6 : 2)); } ctx.lineTo(37, 0); for (let z = 5; z >= 1; z--) { ctx.lineTo(z * 7 + 2, (z % 2 ? 6 : 2) * 0.6); } ctx.closePath(); ctx.scale(1, 0.45); ctx.fill(); ctx.restore(); }
      ctx.strokeStyle = '#7bb04a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(3, -40, 4, -72); ctx.stroke();
      ctx.fillStyle = '#f2b705'; for (let k = 0; k < 18; k++) { ctx.save(); ctx.translate(4, -78); ctx.rotate(k * TAU / 18); ell(0, -10, 2.8, 8); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#ffd321'; for (let k = 0; k < 14; k++) { ctx.save(); ctx.translate(4, -78); ctx.rotate(k * TAU / 14 + 0.2); ell(0, -7, 2.8, 6.5); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#e29a00'; ctx.beginPath(); ctx.arc(4, -78, 3.5, 0, TAU); ctx.fill();
    } else {                // 장미
      ctx.strokeStyle = '#4f7a34'; ctx.lineWidth = 2.6; for (const dx of [-14, 0, 15]) { ctx.beginPath(); ctx.moveTo(dx * 0.3, 0); ctx.lineTo(dx, -55); ctx.stroke(); }
      const rr = mulberry(21);
      for (let k = 0; k < 22; k++) { const lx = -34 + rr() * 68, ly = -18 - rr() * 52; ctx.save(); ctx.translate(lx, ly); ctx.rotate((rr() - 0.5) * 2.6); ctx.fillStyle = k % 2 ? '#2f8a3a' : '#3fa04a'; leafShape(15, 6); ctx.fill(); ctx.restore(); }
      for (const [fx, fy, r] of [[-20, -66, 11], [14, -78, 12], [28, -48, 9.5]]) { ctx.fillStyle = '#c2185b'; ctx.beginPath(); ctx.arc(fx, fy, r, 0, TAU); ctx.fill(); ctx.fillStyle = '#e0407f'; ctx.beginPath(); ctx.arc(fx - 1, fy - 1, r * 0.72, 0, TAU); ctx.fill(); ctx.strokeStyle = '#a3124a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(fx, fy, r * 0.42, 0.4, 4.6); ctx.stroke(); ctx.beginPath(); ctx.arc(fx + 1, fy, r * 0.2, 2, 6.6); ctx.stroke(); }
    }
    ctx.restore();
  }
  const SPRITE_H = [62, 76, 88, 102, 104, 92, 82, 84];

  /* 확대(렌즈) 그림: (0,0)이 중심, 반지름 약 100 기준 */
  const LENS_LABELS = [];
  function lensLabel(x, y, s, col) { LENS_LABELS.push({ x, y, s, col }); }
  function detail(i, t) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const wob = RM ? 0 : 1;
    if (i === 0) {          // 우산이끼: 세포층 + 헛뿌리
      ctx.fillStyle = '#c8a77a'; ctx.fillRect(-110, 44, 220, 70);
      ctx.fillStyle = '#a98456'; for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(-95 + k * 15 + (k % 3) * 3, 60 + (k * 7) % 40, 3.2, 0, TAU); ctx.fill(); }
      for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) { ctx.fillStyle = (r + c) % 2 ? '#4aa84f' : '#5bb85a'; D.roundRect(-72 + c * 16, -4 + r * 14, 15, 13, 4); ctx.fill(); ctx.fillStyle = '#2f7d34'; ctx.beginPath(); ctx.arc(-65 + c * 16, 2 + r * 14, 2.3, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#efe3c8'; ctx.lineWidth = 1.6;
      for (let k = 0; k < 7; k++) { const bx = -58 + k * 19; ctx.beginPath(); ctx.moveTo(bx, 38); ctx.quadraticCurveTo(bx + (k % 2 ? 9 : -9), 56, bx + (k % 2 ? -4 : 5), 80); ctx.stroke(); }
      // 물 입자가 헛뿌리에서 세포로 이동
      for (let k = 0; k < 7; k++) { const u = (((t || 0) * 0.35 + k / 7) % 1), bx = -58 + k * 19; ctx.fillStyle = 'rgba(56,150,255,.85)'; ctx.beginPath(); ctx.arc(bx + (k % 2 ? 4 : -4) * (1 - u), 82 - u * 56, 2.8, 0, TAU); ctx.fill(); }
      lensLabel(10, 72, '헛뿌리', '#7a5b2e'); lensLabel(0, -30, '관다발 없음', '#2b7a30');
    } else if (i === 1) {   // 솔이끼: 포자낭과 포자
      ctx.strokeStyle = '#b08a5b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, 100); ctx.quadraticCurveTo(10, 50, 2, -6); ctx.stroke();
      ctx.save(); ctx.translate(2, -30); ctx.rotate(0.12);
      ctx.fillStyle = '#8d5a2b'; ell(0, 0, 22, 30); ctx.fill();
      ctx.fillStyle = '#a8722f'; ell(-6, -6, 10, 16); ctx.fill();
      ctx.fillStyle = '#c8a06a'; ctx.beginPath(); ctx.ellipse(0, -28, 14, 7, 0, 0, TAU); ctx.fill();
      ctx.restore();
      const rr = mulberry(3);
      for (let k = 0; k < 16; k++) { const u = (((t || 0) * 0.28 + k / 16) % 1); const ang = -Math.PI / 2 + (rr() - 0.5) * 1.5; const dist = 18 + u * 62; ctx.fillStyle = 'rgba(210,150,40,' + (1 - u) + ')'; ctx.beginPath(); ctx.arc(2 + Math.cos(ang) * dist * 0.8 + wob * Math.sin((t || 0) * 2 + k) * 2, -52 + Math.sin(ang) * dist, 2.8, 0, TAU); ctx.fill(); }
      lensLabel(-48, -10, '포자낭', '#8d5a2b'); lensLabel(46, -78, '포자', '#b27a12');
    } else if (i === 2) {   // 고사리: 포자낭군 + 관다발 단면
      ctx.save(); ctx.translate(34, -18); ctx.rotate(-0.35); ctx.fillStyle = '#3e9a4c'; leafShape(104, 36); ctx.fill(); ctx.strokeStyle = '#2d7a3a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(104, 0); ctx.stroke();
      for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) { ctx.fillStyle = '#8d5a2b'; ctx.beginPath(); ctx.arc(18 + k * 13, sd * 12, 3.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#b57d3c'; ctx.beginPath(); ctx.arc(17 + k * 13, sd * 12 - 1, 1.6, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#f2e8c9'; ctx.beginPath(); ctx.arc(-46, 24, 48, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7aa83a'; ctx.lineWidth = 5; ctx.stroke();
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3, bx = -46 + Math.cos(a) * 26, by = 24 + Math.sin(a) * 26; ctx.fillStyle = '#2f80e0'; ctx.beginPath(); ctx.arc(bx, by, 7.5, Math.PI, TAU); ctx.fill(); ctx.fillStyle = '#f08a24'; ctx.beginPath(); ctx.arc(bx, by, 7.5, 0, Math.PI); ctx.fill(); }
      ctx.fillStyle = '#8bc34a'; ctx.beginPath(); ctx.arc(-46, 24, 7, 0, TAU); ctx.fill();
      lensLabel(-46, 82, '관다발 단면', '#1f6fc4'); lensLabel(50, 52, '포자낭군', '#8d5a2b');
    } else if (i === 3) {   // 소나무: 솔방울 단면
      ctx.fillStyle = '#6b4423'; D.roundRect(-9, -90, 18, 180, 6); ctx.fill();
      for (let k = 0; k < 7; k++) for (const sd of [-1, 1]) {
        const y0 = -70 + k * 22;
        ctx.save(); ctx.translate(sd * 8, y0); ctx.rotate(sd * -0.35);
        ctx.fillStyle = k % 2 ? '#a0693a' : '#8d5a2b'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(sd * 62, -8); ctx.lineTo(sd * 70, 0); ctx.lineTo(sd * 62, 8); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f5e7a1'; ctx.strokeStyle = '#c9b45a'; ctx.lineWidth = 1; for (const q of [24, 44]) { ell(sd * q, -9.5, 6.5, 4); ctx.fill(); ctx.stroke(); }
        ctx.restore();
      }
      lensLabel(-52, 62, '밑씨', '#a37b00'); lensLabel(54, -70, '씨방 없음', '#b4690e'); lensLabel(52, 86, '비늘 겉에 드러남', '#7a4e2d');
    } else if (i === 4) {   // 은행나무: 종자
      ctx.fillStyle = '#e8b93a'; ctx.beginPath(); ctx.arc(0, 4, 62, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c28f12'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(-22, -26, 22, 9, -0.6); ctx.fill();
      ctx.fillStyle = '#f2e3bd'; ell(0, 4, 42, 50); ctx.fill(); ctx.strokeStyle = '#b79c64'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#e9edc4'; ell(0, 6, 28, 36); ctx.fill();
      ctx.fillStyle = '#8bc34a'; ell(0, 14, 9, 14); ctx.fill();
      lensLabel(0, -78, '종자 (열매가 아니에요)', '#7a5a00'); lensLabel(0, 84, '씨방 없이 드러나 자란 종자', '#b4690e');
    } else if (i === 5) {   // 벼: 작은 꽃과 씨방
      ctx.fillStyle = '#9ccf5a'; ctx.beginPath(); ctx.moveTo(-34, 70); ctx.quadraticCurveTo(-60, 0, -14, -52); ctx.quadraticCurveTo(-18, 8, 6, 70); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7fb83f'; ctx.beginPath(); ctx.moveTo(34, 70); ctx.quadraticCurveTo(60, 0, 14, -52); ctx.quadraticCurveTo(18, 8, -6, 70); ctx.closePath(); ctx.fill();
      for (const sd of [-1, 1]) for (const [dx, dy] of [[30, 6], [44, 22], [20, 28]]) { ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sd * dx * 0.3, 40); ctx.lineTo(sd * dx, dy - 18); ctx.stroke(); ctx.fillStyle = '#f2c230'; ell(sd * dx, dy - 22, 4.5, 8.5, sd * 0.2); ctx.fill(); }
      ctx.fillStyle = '#d6ec9c'; ell(0, 26, 15, 22); ctx.fill(); ctx.strokeStyle = '#6a9a2d'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#f7fbe2'; ell(0, 28, 6, 8); ctx.fill();
      ctx.strokeStyle = '#8f6bb5'; ctx.lineWidth = 2; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 3, 6); ctx.quadraticCurveTo(sd * 20, -16, sd * 8, -36); ctx.stroke(); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(sd * (10 + k), -10 - k * 6); ctx.lineTo(sd * (18 + k), -14 - k * 6); ctx.stroke(); } }
      lensLabel(-2, 78, '씨방(밑씨가 안에 있음)', '#4d7a1c'); lensLabel(54, -62, '작은 꽃', '#a37b00');
    } else if (i === 6) {   // 민들레: 작은 꽃 한 송이(씨방)
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.4;
      for (let k = -9; k <= 9; k++) { ctx.beginPath(); ctx.moveTo(k * 1.2, 10); ctx.lineTo(k * 7, -52 + Math.abs(k) * 1.6); ctx.stroke(); }
      ctx.fillStyle = '#ffd321'; ctx.beginPath(); ctx.moveTo(-6, 12); ctx.quadraticCurveTo(-8, -30, 10, -46); ctx.quadraticCurveTo(22, -36, 8, 12); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d99a00'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#b9d88a'; ell(0, 46, 17, 34); ctx.fill(); ctx.strokeStyle = '#5f8a2a'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = '#f7fbe2'; ell(0, 50, 7, 10); ctx.fill(); ctx.strokeStyle = '#a3b87a'; ctx.lineWidth = 1; ctx.stroke();
      lensLabel(40, 54, '씨방', '#4d7a1c'); lensLabel(-46, -60, '갓털', '#667085'); lensLabel(-44, 6, '꽃잎', '#b78103');
    } else {                // 장미: 꽃 단면
      ctx.fillStyle = '#d63a7b'; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.bezierCurveTo(-70, -10, -78, -76, -30, -84); ctx.bezierCurveTo(-50, -54, -32, -26, -6, -4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.bezierCurveTo(70, -10, 78, -76, 30, -84); ctx.bezierCurveTo(50, -54, 32, -26, 6, -4); ctx.fill();
      ctx.fillStyle = '#e8629a'; ctx.beginPath(); ctx.moveTo(-3, -6); ctx.bezierCurveTo(-34, -16, -34, -60, -4, -74); ctx.bezierCurveTo(-10, -48, -8, -26, -3, -6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(3, -6); ctx.bezierCurveTo(34, -16, 34, -60, 4, -74); ctx.bezierCurveTo(10, -48, 8, -26, 3, -6); ctx.fill();
      ctx.strokeStyle = '#f2b705'; ctx.lineWidth = 1.8; for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(sd * (6 + k * 4), 0); ctx.lineTo(sd * (14 + k * 8), -34 - k * 4); ctx.stroke(); ctx.fillStyle = '#f2b705'; ctx.beginPath(); ctx.arc(sd * (14 + k * 8), -36 - k * 4, 2.8, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#4a9a3b'; ctx.beginPath(); ctx.moveTo(-44, 6); ctx.quadraticCurveTo(-42, 70, 0, 92); ctx.quadraticCurveTo(42, 70, 44, 6); ctx.quadraticCurveTo(0, 18, -44, 6); ctx.fill();
      ctx.fillStyle = '#e9f5c9'; ctx.beginPath(); ctx.moveTo(-34, 14); ctx.quadraticCurveTo(-30, 58, 0, 74); ctx.quadraticCurveTo(30, 58, 34, 14); ctx.quadraticCurveTo(0, 24, -34, 14); ctx.fill();
      ctx.fillStyle = '#cfe59a'; ctx.strokeStyle = '#6a9a2d'; ctx.lineWidth = 2;
      for (const [ox, oy] of [[-14, 34], [14, 34], [0, 48], [-18, 52], [18, 52]]) { ell(ox, oy, 8, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff7d0'; ell(ox, oy + 1, 3, 4); ctx.fill(); ctx.fillStyle = '#cfe59a'; }
      lensLabel(-2, 90, '씨방 안의 밑씨', '#4d7a1c'); lensLabel(58, -56, '꽃잎', '#c2185b');
    }
  }
  /* =========================================================
     상태
     ========================================================= */
  const S = { mode: 'garden', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const qIdx = (n) => PL.findIndex((p) => p.n === n);

  /* ---------- 레이아웃 ---------- */
  const G = L({ x: 20, y: 46, w: 760, h: 196 }, { x: 10, y: 46, w: 460, h: 150 });
  const LP = L({ x: 20, y: 254, w: 276, h: 286 }, { x: 10, y: 204, w: 460, h: 184 });
  const TP = L({ x: 306, y: 254, w: 474, h: 286 }, { x: 10, y: 396, w: 460, h: 236 });
  const T_ROW = L(30, 24);
  const cellW = G.w / NP;
  const plantX = (i) => G.x + (i + 0.5) * cellW;
  const plantBase = G.y + G.h - L(34, 30);
  const SPR = L(1.1, 0.72);

  /* ---------- 1단계: 정원 관찰 + 체크리스트 ---------- */
  function resetGarden() {
    S.gd = { sel: 0, zoomK: 0, viewed: {}, chk: PL.map(() => [null, null, null]), bad: PL.map(() => [false, false, false]), tried: false, bounce: 0, zoomFrom: 0 };
    LENS_LABELS.length = 0;
  }
  function selectPlant(i, fromTray) {
    const g = S.gd; if (!g) return;
    g.sel = i; g.zoomK = 0; g.bounce = 1;
    SciSim.tween(g, { zoomK: 1 }, { duration: RM ? 0.01 : 0.6, ease: 'outCubic', onDone: () => { if (S.gd === g && g.sel === i) { g.viewed[i] = true; updateCtl(); } } });
    SciSim.tween(g, { bounce: 0 }, { duration: RM ? 0.01 : 0.5, ease: 'outBounce' });
    Sound.click(); updateCtl();
  }
  function setChk(i, k, v) { const g = S.gd; g.chk[i][k] = v; g.bad[i][k] = false; Sound.tick(); updateCtl(); }
  const chkFilled = () => S.gd.chk.reduce((a, r) => a + r.filter((v) => v != null).length, 0);
  const chkRight = () => S.gd.chk.reduce((a, r, i) => a + r.filter((v, k) => v != null && v === PL[i][TR[k].k]).length, 0);
  function drawLens(cx, cy, r, i, k, t, base) {
    LENS_LABELS.length = 0;
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#f7fbf2'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, TAU); ctx.clip();
    const g2 = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); g2.addColorStop(0, '#ffffff'); g2.addColorStop(1, '#e6f1de'); ctx.fillStyle = g2; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.translate(cx, cy); const s = r / 100 * (0.55 + 0.45 * k); ctx.scale(s, s); ctx.globalAlpha = clamp(k * 1.4, 0, 1);
    detail(i, t);
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4, 0, 1);
    const sf = r / 100 * (0.55 + 0.45 * k);
    LENS_LABELS.forEach((lb) => D.label(cx + lb.x * sf, cy + lb.y * sf, lb.s, { bg: 'rgba(255,255,255,.95)', color: lb.col || '#1b2333', size: 13, border: lb.col || '#94a3b8', pad: 7 }));
    ctx.restore();
  }
  function drawGarden(dt, t) {
    const g = S.gd;
    bgFill('#e8f5e2', '#f1f8ea');
    T(G.x, 30, '🌿 가상 정원: 식물을 눌러 확대해 봐요', L(18, 15.5), '#14532d', 'left', 800);
    // 정원
    ctx.save(); D.roundRect(G.x, G.y, G.w, G.h, 16); ctx.clip();
    const sky = ctx.createLinearGradient(0, G.y, 0, G.y + G.h); sky.addColorStop(0, '#cfeaff'); sky.addColorStop(0.62, '#eaf7ff'); sky.addColorStop(0.62, '#a9d98a'); sky.addColorStop(1, '#86c36b');
    ctx.fillStyle = sky; ctx.fillRect(G.x, G.y, G.w, G.h);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; const cl = (t * 6) % (G.w + 120);
    ell(G.x + ((cl + 80) % (G.w + 120)) - 60, G.y + 28, 44, 12); ctx.fill(); ell(G.x + ((cl + 400) % (G.w + 120)) - 60, G.y + 46, 36, 10); ctx.fill();
    // 땅 질감
    const rr = mulberry(9); ctx.strokeStyle = 'rgba(60,130,50,.25)'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 120; k++) { const x = G.x + rr() * G.w, y = G.y + G.h * 0.62 + rr() * G.h * 0.38; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 6); ctx.stroke(); }
    for (let i = 0; i < NP; i++) {
      const x = plantX(i), sel = g.sel === i;
      if (sel) { ctx.fillStyle = 'rgba(255,255,255,.35)'; D.roundRect(x - cellW / 2 + 3, G.y + 6, cellW - 6, G.h - 12, 12); ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.fillStyle = 'rgba(30,70,30,.18)'; ell(x, plantBase + 3, 26 * SPR, 5 * SPR); ctx.fill();
      sprite(i, x, plantBase - (sel ? g.bounce * 8 : 0), SPR * (sel ? 1.06 : 1), t);
      chip(x, G.y + G.h - 14, PL[i].n, { align: 'center', size: 13, bg: sel ? '#16a34a' : 'rgba(255,255,255,.88)', color: sel ? '#fff' : '#1b2333', pad: 6, h: 22 });
      if (g.viewed[i]) T(x + cellW / 2 - 12, G.y + 22, '✔', 14, '#16a34a', 'center', 800);
    }
    ctx.restore();
    D.roundRect(G.x, G.y, G.w, G.h, 16); ctx.strokeStyle = '#5a8f45'; ctx.lineWidth = 3; ctx.stroke();
    // 렌즈 패널
    panel(LP.x, LP.y, LP.w, LP.h, 16);
    const lr = L(100, 78), lcx = PHONE ? LP.x + 100 : LP.x + LP.w / 2, lcy = LP.y + (PHONE ? 94 : 116);
    // 확대 연결선
    if (g.zoomK < 1 && !RM) { ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(22,163,74,' + (1 - g.zoomK) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(plantX(g.sel), plantBase - 30); ctx.lineTo(lcx, lcy - lr); ctx.stroke(); ctx.restore(); }
    drawLens(lcx, lcy, lr, g.sel, g.zoomK, t);
    const p = PL[g.sel];
    if (!PHONE) {
      T(LP.x + LP.w / 2, LP.y + 238, '🔍 ' + p.n + ' · ' + p.see, 15, '#14532d', 'center', 800);
      T(LP.x + LP.w / 2, LP.y + 258, '키 ' + p.cm + ' · ' + p.hab, 13, '#475569', 'center', 700, {});
    } else {
      const tx = LP.x + 196;
      T(tx, LP.y + 40, '🔍 ' + p.n, 17, '#14532d', 'left', 800);
      textBlock(tx, LP.y + 66, LP.w - 206, p.see, 14, '#14532d', 18, 800);
      textBlock(tx, LP.y + 108, LP.w - 206, '키 ' + p.cm, 13.5, '#475569', 18, 700);
      textBlock(tx, LP.y + 130, LP.w - 206, p.hab, 13.5, '#475569', 18, 700);
    }
    drawChkTable(t);
  }
  function chkRect(i, k) { // 체크표의 칸(i: 식물, k: 0~2)
    const nameW = TP.w * 0.34, cw = (TP.w - nameW) / 3;
    return { x: TP.x + nameW + k * cw, y: TP.y + T_ROW * (i + 1), w: cw, h: T_ROW };
  }
  function drawChkTable(t) {
    const g = S.gd;
    panel(TP.x, TP.y, TP.w, TP.h, 16);
    const nameW = TP.w * 0.34, cw = (TP.w - nameW) / 3;
    ctx.fillStyle = '#eaf5e4'; D.roundRect(TP.x, TP.y, TP.w, T_ROW, 14); ctx.fill();
    T(TP.x + 14, TP.y + T_ROW / 2 + 5, '식물', 13.5, '#14532d', 'left', 800);
    for (let k = 0; k < 3; k++) T(TP.x + nameW + (k + 0.5) * cw, TP.y + T_ROW / 2 + 5, TR[k].n, 13.5, '#14532d', 'center', 800);
    for (let i = 0; i < NP; i++) {
      const y = TP.y + T_ROW * (i + 1), sel = g.sel === i;
      if (sel) { ctx.fillStyle = 'rgba(22,163,74,.12)'; ctx.fillRect(TP.x + 2, y, TP.w - 4, T_ROW); }
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(TP.x + 8, y); ctx.lineTo(TP.x + TP.w - 8, y); ctx.stroke();
      T(TP.x + 14, y + T_ROW / 2 + 5, PL[i].n, 14, sel ? '#0b6b39' : '#1b2333', 'left', 800);
      for (let k = 0; k < 3; k++) {
        const r = chkRect(i, k), v = g.chk[i][k], cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        if (g.bad[i][k]) { D.roundRect(r.x + 8, r.y + 3, r.w - 16, r.h - 6, 8); ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2.2; ctx.stroke(); }
        if (v == null) T(cx, cy + 5, '?', 15, '#cbd5e1', 'center', 800);
        else if (v) { D.sphere(cx, cy, 9, '#22a04a', { gloss: false }); T(cx, cy + 4.5, 'O', 12.5, '#fff', 'center', 800); }
        else { D.sphere(cx, cy, 9, '#94a3b8', { gloss: false }); T(cx, cy + 4.5, 'X', 12.5, '#fff', 'center', 800); }
      }
    }
  }
  function gardenDown(p) {
    if (inRect(p, G)) { const i = clamp(Math.floor((p.x - G.x) / cellW), 0, NP - 1); selectPlant(i); return false; }
    if (inRect(p, TP)) {
      const row = Math.floor((p.y - TP.y) / T_ROW) - 1;
      if (row >= 0 && row < NP) {
        const nameW = TP.w * 0.34, cw = (TP.w - nameW) / 3, col = Math.floor((p.x - TP.x - nameW) / cw);
        if (col >= 0 && col < 3 && game && game.has('chk')) {
          const cur = S.gd.chk[row][col]; setChk(row, col, cur == null ? 1 : cur === 1 ? 0 : null);
          S.gd.sel = row; if (!S.gd.viewed[row]) selectPlant(row); updateCtl();
        } else selectPlant(row);
      }
    }
    return false;
  }

  /* ---------- 2단계: 이분 검색표 ---------- */
  const KEYQ = [
    { t: 'vasc', q: '관다발이 있나요?', short: '관다발?' },
    { t: 'seed', q: '종자(씨)를 만드나요?', short: '종자?' },
    { t: 'ovary', q: '씨방이 밑씨를 싸고 있나요?', short: '씨방?' },
  ];
  const BIN_OF = [[0, 1], [1, 2], [2, 3]];     // [아니오 → 문, 예 → 다음 질문 또는 문]
  const factText = (i, t) => { const tr = TR.find((x) => x.k === t); const v = PL[i][t]; return withJosa(PL[i].n, '은/는') + ' ' + tr.n + josa(tr.n, '이/가') + ' ' + (v ? '있어요' : '없어요') + '.'; };
  function keyGeo() {
    if (!PHONE) {
      const q = [{ x: 16, y: 78, w: 196, h: 48 }, { x: 252, y: 78, w: 196, h: 48 }, { x: 488, y: 78, w: 196, h: 48 }];
      const bin = [{ x: 16, y: 150, w: 196, h: 124 }, { x: 252, y: 150, w: 196, h: 124 }, { x: 488, y: 150, w: 196, h: 124 }, { x: 706, y: 78, w: 78, h: 196 }];
      const tray = PL.map((p, i) => ({ x: 20 + i * 95, y: 292, w: 88, h: 66 }));
      return { q, bin, tray, yes: { x: 200, y: 438, w: 190, h: 52 }, no: { x: 410, y: 438, w: 190, h: 52 }, txtY: 392, trailY: 416, cols: [1, 1, 1, 1] };
    }
    const q = [{ x: 10, y: 66, w: 196, h: 44 }, { x: 10, y: 158, w: 196, h: 44 }, { x: 10, y: 250, w: 196, h: 44 }];
    const bin = [{ x: 268, y: 50, w: 202, h: 78 }, { x: 268, y: 142, w: 202, h: 78 }, { x: 268, y: 234, w: 202, h: 78 }, { x: 10, y: 330, w: 196, h: 78 }];
    const tray = PL.map((p, i) => ({ x: 10 + (i % 4) * 115, y: 424 + Math.floor(i / 4) * 52, w: 110, h: 46 }));
    return { q, bin, tray, yes: { x: 20, y: 580, w: 200, h: 48 }, no: { x: 250, y: 580, w: 200, h: 48 }, txtY: 540, trailY: 562, cols: [3, 3, 3, 3] };
  }
  const KG = keyGeo();
  function resetKey() {
    S.key = { cur: null, done: {}, bins: [[], [], [], []], miss: 0, trail: [], shake: 0, pop: {} };
  }
  function keyStand(node) { const r = KG.q[node]; return { x: r.x + r.w / 2, y: r.y - 8 }; }
  function binSlot(b, n) { // b번째 문 상자의 n번째 칩 위치
    const r = KG.bin[b], cols = PHONE ? 3 : (b === 3 ? 1 : 2), cw = (r.w - 10) / cols;
    return { x: r.x + 5 + (n % cols) * cw, y: r.y + 30 + Math.floor(n / cols) * 32, w: cw - 4, h: 28 };
  }
  function pickPlant(i) {
    const K = S.key; if (!K || K.done[i] != null) return;
    if (K.cur && K.cur.busy) return;
    const tr = KG.tray[i], st = keyStand(0);
    K.cur = { i, node: 0, x: tr.x + tr.w / 2, y: tr.y + tr.h / 2, busy: true, sc: 1 };
    K.trail = [];
    const c = K.cur;
    SciSim.tween(c, { x: st.x, y: st.y }, { duration: RM ? 0.01 : 0.5, ease: 'outBack', onDone: () => { c.busy = false; updateCtl(); } });
    Sound.click(); hideHint(); updateCtl();
  }
  function keyAnswer(yes) {
    const K = S.key, c = K && K.cur; if (!c || c.busy) return;
    const q = KEYQ[c.node], truth = !!PL[c.i][q.t];
    if (yes !== truth) {
      K.miss++; Sound.fail(); K.shake = 1; SciSim.tween(K, { shake: 0 }, { duration: 0.4, ease: 'outCubic' });
      showHint(factText(c.i, q.t) + ' 그래서 "' + (truth ? '예' : '아니오') + '"를 골라요.', 5200); updateCtl(); return;
    }
    hideHint(); Sound.success();
    K.trail.push(KEYQ[c.node].short + ' ' + (yes ? '예' : '아니오'));
    c.busy = true;
    let toBin = -1, nextNode = -1;
    if (!yes) toBin = BIN_OF[c.node][0]; else if (c.node < 2) nextNode = c.node + 1; else toBin = BIN_OF[2][1];
    if (nextNode >= 0) {
      const st = keyStand(nextNode); c.node = nextNode;
      SciSim.tween(c, { x: st.x, y: st.y }, { duration: RM ? 0.01 : 0.55, ease: 'outCubic', onDone: () => { c.busy = false; updateCtl(); } });
    } else {
      const slot = binSlot(toBin, K.bins[toBin].length);
      const ph = PL[c.i].ph;
      SciSim.tween(c, { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 }, { duration: RM ? 0.01 : 0.65, ease: 'outBack', onDone: () => {
        if (S.key !== K) return;
        K.bins[toBin].push(c.i); K.done[c.i] = toBin; K.pop[c.i] = 0; SciSim.tween(K.pop, { [c.i]: 1 }, { duration: 0.4, ease: 'outBack' });
        if (K.cur === c) K.cur = null;
        parts.burst(slot.x + slot.w / 2, slot.y + slot.h / 2, { count: 12, colors: [PH[toBin].col, '#fde68a', '#fff'], speed: 90, size: 3, life: 0.6, gravity: 60 });
        updateCtl();
      } });
    }
    updateCtl();
  }
  const keyDoneN = () => Object.keys(S.key.done).length;
  function plantCard(i, r, o) {
    o = o || {};
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = o.bg || '#fff'; ctx.fill(); }, { blur: o.sel ? 10 : 5, y: o.sel ? 4 : 2 });
    if (o.border) { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.strokeStyle = o.border; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (r.w > r.h * 1.6) {
      sprite(i, r.x + 26, r.y + r.h / 2 + Math.min(0.36, (r.h - 14) / SPRITE_H[i]) * SPRITE_H[i] * 0.5, Math.min(0.36, (r.h - 14) / SPRITE_H[i]), 0, { still: true });
      T(r.x + 54, r.y + r.h / 2 + 5, PL[i].n, fitText(PL[i].n, r.w - 60, 14, 800, 12.5), '#1b2333', 'left', 800);
    } else {
      sprite(i, r.x + r.w / 2, r.y + r.h - 24, Math.min(0.62, 36 / SPRITE_H[i] * 1.1), 0, { still: true });
      T(r.x + r.w / 2, r.y + r.h - 7, PL[i].n, 13, '#1b2333', 'center', 800);
    }
    ctx.restore();
  }
  function drawKey(dt, t) {
    const K = S.key;
    bgFill('#eef6ea', '#f3f8ee');
    T(L(16, 12), 30, '🔑 이분 검색표: 질문에 답하며 문을 찾아요', L(18, 15.5), '#14532d', 'left', 800);
    // 화살표와 질문
    for (let n = 0; n < 3; n++) {
      const r = KG.q[n];
      const next = n < 2 ? KG.q[n + 1] : KG.bin[3];
      if (!PHONE) {
        D.arrow(r.x + r.w + 2, r.y + r.h / 2, next.x - 4, next.y + (n < 2 ? next.h / 2 : 30), { color: '#16a34a', width: 3, head: 11 });
        D.label((r.x + r.w + next.x) / 2, r.y + r.h / 2 - 15, '예', { bg: '#16a34a', size: 13 });
        D.arrow(r.x + r.w / 2, r.y + r.h + 2, r.x + r.w / 2, KG.bin[n].y - 2, { color: '#dc2626', width: 3, head: 11 });
        D.label(r.x + r.w / 2 + 34, r.y + r.h + 13, '아니오', { bg: '#dc2626', size: 13 });
      } else {
        const nr = n < 2 ? KG.q[n + 1] : KG.bin[3];
        D.arrow(r.x + r.w / 2, r.y + r.h + 2, nr.x + nr.w / 2, nr.y - 2, { color: '#16a34a', width: 3, head: 10 });
        D.label(r.x + r.w / 2 + 28, r.y + r.h + 22, '예', { bg: '#16a34a', size: 13 });
        D.arrow(r.x + r.w + 2, r.y + r.h / 2, KG.bin[n].x - 4, KG.bin[n].y + KG.bin[n].h / 2, { color: '#dc2626', width: 3, head: 10 });
        D.label((r.x + r.w + KG.bin[n].x) / 2, r.y + r.h / 2 - 15, '아니오', { bg: '#dc2626', size: 13 });
      }
      const active = K.cur && K.cur.node === n;
      D.shadow(() => box(r, '', { bg: active ? '#fef9c3' : '#fff', border: active ? '#eab308' : '#16a34a', lw: active ? 3 : 2, r: 12 }), { blur: active ? 12 : 6, y: 3 });
      T(r.x + 14, r.y + r.h / 2 + 5, (n + 1) + '', 16, '#16a34a', 'center', 800);
      T(r.x + 26, r.y + r.h / 2 + 5, KEYQ[n].q, fitText(KEYQ[n].q, r.w - 34, 14.5, 800, 12.5), '#1b2333', 'left', 800);
    }
    // 문 상자
    for (let b = 0; b < 4; b++) {
      const r = KG.bin[b], ph = PH[b];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = ph.soft; ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = ph.col; ctx.lineWidth = 2.2; ctx.stroke();
      T(r.x + r.w / 2, r.y + 21, ph.n, fitText(ph.n, r.w - 10, 14.5, 800, 12.5), ph.col, 'center', 800);
      K.bins[b].forEach((pi, n) => { const s = binSlot(b, n), pp = K.pop[pi] == null ? 1 : K.pop[pi]; ctx.save(); ctx.translate(s.x + s.w / 2, s.y + s.h / 2); ctx.scale(0.6 + 0.4 * pp, 0.6 + 0.4 * pp); box({ x: -s.w / 2, y: -s.h / 2, w: s.w, h: s.h }, PL[pi].n, { bg: '#fff', border: ph.col, lw: 1.6, size: 13, r: 14, color: '#1b2333' }); ctx.restore(); });
    }
    // 카드 쟁반
    for (let i = 0; i < NP; i++) {
      const r = KG.tray[i], done = K.done[i] != null, cur = K.cur && K.cur.i === i;
      if (cur) { ctx.fillStyle = 'rgba(0,0,0,.06)'; D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill(); T(r.x + r.w / 2, r.y + r.h / 2 + 5, '…', 20, '#94a3b8', 'center', 800); continue; }
      plantCard(i, r, { alpha: done ? 0.4 : 1, border: done ? PH[K.done[i]].col : null, bg: done ? '#f1f5f9' : '#fff' });
      if (done) T(r.x + r.w - 12, r.y + 16, '✔', 14, '#16a34a', 'center', 800);
    }
    // 질문 영역
    const c = K.cur;
    if (!c) {
      const left = NP - keyDoneN();
      T(VW / 2, KG.txtY, left ? '👆 위의 식물 카드를 눌러 검색표를 따라가 보세요' : '🎉 8종을 모두 4개의 문으로 나눴어요!', L(17, 15.5), left ? '#475569' : '#0b6b39', 'center', 800);
    }
    if (c) {
      const q = KEYQ[c.node];
      T(VW / 2, KG.txtY, PL[c.i].n + ' · ' + (c.node + 1) + '번 질문: ' + q.q, L(17, 15.5), '#1b2333', 'center', 800);
      T(VW / 2, KG.trailY + (PHONE ? 0 : 4), K.trail.length ? '지나온 길: ' + K.trail.join(' → ') : '아직 지나온 길이 없어요', 13.5, '#64748b', 'center', 700);
    }
    const can = !!(c && !c.busy);
    box(KG.yes, '예  (있어요)', { bg: can ? '#16a34a' : '#cbd5e1', color: '#fff', size: 16, r: 14 });
    box(KG.no, '아니오  (없어요)', { bg: can ? '#dc2626' : '#cbd5e1', color: '#fff', size: 16, r: 14 });
    // 움직이는 카드(토큰)
    if (c) {
      const w = L(96, 92), h = 34, off = K.shake * Math.sin(K.shake * 40) * 6;
      D.shadow(() => { D.roundRect(c.x - w / 2 + off, c.y - h / 2, w, h, 17); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 12, y: 5 });
      D.roundRect(c.x - w / 2 + off, c.y - h / 2, w, h, 17); ctx.strokeStyle = K.shake > 0.05 ? '#dc2626' : '#16a34a'; ctx.lineWidth = 2.5; ctx.stroke();
      sprite(c.i, c.x - w / 2 + 18 + off, c.y + 12, Math.min(0.28, 24 / SPRITE_H[c.i] * 1.0), 0, { still: true });
      T(c.x + 10 + off, c.y + 5, PL[c.i].n, 14, '#1b2333', 'center', 800);
    }
  }
  function keyDown(p) {
    for (let i = 0; i < NP; i++) if (inRect(p, KG.tray[i])) { pickPlant(i); return false; }
    if (inRect(p, KG.yes)) { keyAnswer(true); return false; }
    if (inRect(p, KG.no)) { keyAnswer(false); return false; }
    return false;
  }

  /* ---------- 2단계 후반: 검색표 질문 순서 비교 ---------- */
  const TALL = [0, 0, 1, 1, 1, 1, 0, 1];      // 키가 30 cm보다 큰가?
  const attrOf = (t, i) => (t === 'tall' ? TALL[i] : PL[i][t]);
  const QSHORT = { vasc: '관다발이 있나요?', seed: '종자가 있나요?', ovary: '씨방이 있나요?', tall: '키가 30 cm보다 큰가요?' };
  const LF = null;
  const KOPT = [
    { id: 'A', name: '관다발 → 종자 → 씨방', root: { t: 'vasc', n: LF, y: { t: 'seed', n: LF, y: { t: 'ovary', n: LF, y: LF } } } },
    { id: 'B', name: '종자 → (관다발 / 씨방)', root: { t: 'seed', n: { t: 'vasc', n: LF, y: LF }, y: { t: 'ovary', n: LF, y: LF } } },
    { id: 'C', name: '씨방 → 종자 → 관다발', root: { t: 'ovary', n: { t: 'seed', n: { t: 'vasc', n: LF, y: LF }, y: LF }, y: LF } },
    { id: 'D', name: '키가 30 cm보다 큰가요?', root: { t: 'tall', n: LF, y: LF } },
  ];
  function evalKey(root) {
    const leaves = [], nodes = [];
    function walk(node, members, depth, parent, side) {
      if (!node) { const lf = { members, depth }; leaves.push(lf); return { leaf: lf }; }
      const yes = members.filter((i) => attrOf(node.t, i)), no = members.filter((i) => !attrOf(node.t, i));
      const nd = { t: node.t, depth, parent, side, kids: [] };
      nodes.push(nd);
      const kn = walk(node.n, no, depth + 1, nd, '아니오'); const ky = walk(node.y, yes, depth + 1, nd, '예');
      nd.kids = [kn, ky]; return { node: nd };
    }
    const top = walk(root, PL.map((p, i) => i), 0, null, '');
    const pure = leaves.every((lf) => lf.members.length === 0 || lf.members.every((i) => PL[i].ph === PL[lf.members[0]].ph));
    const phs = {}; let split = false;
    leaves.forEach((lf, k) => lf.members.forEach((i) => { if (phs[PL[i].ph] != null && phs[PL[i].ph] !== k) split = true; phs[PL[i].ph] = k; }));
    const real = leaves.filter((lf) => lf.members.length);
    return { top, leaves: real, nodes, ok: pure && !split && Object.keys(phs).length === 4, maxQ: Math.max.apply(null, real.map((lf) => lf.depth)) };
  }
  const KEVAL = KOPT.map((o) => evalKey(o.root));
  function resetKo() { S.ko = { opt: 0, seen: { 0: true }, k: 1 }; }
  function setKo(o) { S.ko.opt = o; S.ko.seen[o] = true; S.ko.k = 0; SciSim.tween(S.ko, { k: 1 }, { duration: RM ? 0.01 : 0.5, ease: 'outCubic' }); Sound.click(); updateCtl(); }
  function drawKorder(dt, t) {
    const o = KOPT[S.ko.opt], ev = KEVAL[S.ko.opt], k = S.ko.k;
    bgFill('#eef6ea', '#f3f8ee');
    T(L(16, 12), 30, '🔀 검색표 ' + o.id + ': ' + o.name, L(18, 15.5), '#14532d', 'left', 800);
    const nLeaf = ev.leaves.length, m = L(14, 8), lw = Math.min(L(206, 224), (VW - m * 2) / nLeaf - 8);
    const lx = (idx) => m + (idx + 0.5) * (VW - m * 2) / nLeaf;
    const stepY = L(58, 52), y0 = L(84, 78), leafY = L(274, 262), leafH = L(112, 118);
    // 리프 좌표 → 부모 좌표 계산
    let leafIdx = 0;
    function place(n) {
      if (n.leaf) { n.leaf.x = lx(leafIdx++); n.leaf.y = leafY; return n.leaf.x; }
      const xs = n.node.kids.map(place); n.node.x = (xs[0] + xs[xs.length - 1]) / 2; n.node.y = y0 + n.node.depth * stepY; return n.node.x;
    }
    place(ev.top);
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5, 0, 1);
    function edges(n) {
      if (n.leaf) return;
      n.node.kids.forEach((kd, idx) => {
        const cx = kd.leaf ? kd.leaf.x : kd.node.x, cy = kd.leaf ? leafY : kd.node.y;
        const col = idx === 0 ? '#dc2626' : '#16a34a';
        ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(n.node.x, n.node.y + 17); ctx.lineTo(cx, cy - (kd.leaf ? 2 : 17)); ctx.stroke();
        D.label((n.node.x * 0.45 + cx * 0.55), (n.node.y + 17) * 0.5 + (cy - 17) * 0.5, idx === 0 ? '아니오' : '예', { bg: col, size: 13, pad: 6 });
        edges(kd);
      });
    }
    edges(ev.top);
    ev.nodes.forEach((nd) => { const q = QSHORT[nd.t], w = Math.min(L(176, 168), fitText(q, 400, 14, 800) * 0 + ctx.measureText(q).width + 16); box({ x: nd.x - L(88, 84), y: nd.y - 17, w: L(176, 168), h: 34 }, q, { bg: '#fff', border: '#16a34a', lw: 2, size: 14, r: 12 }); });
    ev.leaves.forEach((lf) => {
      const pure = lf.members.every((i) => PL[i].ph === PL[lf.members[0]].ph), ph = PH[PL[lf.members[0]].ph];
      const r = { x: lf.x - lw / 2, y: leafY, w: lw, h: leafH };
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = pure ? ph.soft : '#fee2e2'; ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = pure ? ph.col : '#dc2626'; ctx.lineWidth = 2.2; ctx.stroke();
      T(lf.x, r.y + 20, pure ? ph.n : '문이 섞였어요 ✘', fitText(pure ? ph.n : '문이 섞였어요 ✘', lw - 10, 14.5, 800, 12.5), pure ? ph.col : '#dc2626', 'center', 800);
      textBlock(r.x + 8, r.y + 42, lw - 16, lf.members.map((i) => PL[i].n).join(', '), 13.5, '#1b2333', 17, 700);
      T(lf.x, r.y + r.h - 8, lf.depth + '번 질문 뒤', 12.5, '#64748b', 'center', 700);
    });
    ctx.restore();
    // 결과 요약
    const ry = L(410, 400);
    panel(L(40, 12), ry, VW - L(80, 24), L(116, 160), 14);
    const x0 = L(60, 28);
    T(x0, ry + 30, (ev.ok ? '✅' : '❌') + ' 4개의 문을 정확히 나누었나요?  ' + (ev.ok ? '네, 같은 문끼리 모였어요' : '아니요, 같은 문이 섞이거나 나뉘었어요'), L(16, 14.5), ev.ok ? '#0b6b39' : '#b91c1c', 'left', 800);
    T(x0, ry + 58, '📏 가장 긴 경로: ' + ev.maxQ + '번 질문', L(16, 14.5), '#1b2333', 'left', 800);
    textBlock(x0, ry + 84, VW - L(120, 56), ev.ok ? (ev.maxQ <= 2 ? '모든 식물이 2번의 질문만으로 문을 찾아요. 가장 짧은 검색표예요.' : '정확하지만 어떤 식물은 3번을 물어야 해요. 더 짧은 순서가 있을지 비교해 봐요.') : '크기처럼 문과 상관없는 기준은 같은 문의 식물을 갈라놓거나 다른 문을 섞어요.', L(14.5, 13.5), '#475569', 19, 700);
  }

  /* ---------- 3단계: 문 비교표 ---------- */
  const TCOLS = [{ n: '번식 구조', k: 'repro' }, { n: '관다발', k: 'vasc' }, { n: '종자', k: 'seed' }, { n: '씨방', k: 'ovary' }];
  const TANS = [[0, 0, 0, 0], [0, 1, 0, 0], [1, 1, 1, 0], [1, 1, 1, 1]];   // repro: 0 포자 / 1 종자
  const REP = ['선태류: 우산이끼 · 솔이끼', '고사리', '소나무 · 은행나무', '벼 · 민들레 · 장미'];
  const REP_S = ['우산이끼·솔이끼', '고사리', '소나무·은행나무', '벼·민들레·장미'];
  function resetTbl() { S.tbl = { v: [0, 1, 2, 3].map(() => [null, null, null, null]), bad: [0, 1, 2, 3].map(() => [false, false, false, false]), k: 0, sec: 0, secSeen: false }; }
  const TB = L({ x: 20, y: 46, w: 760, h: 244 }, { x: 10, y: 44, w: 460, h: 290 });
  const TB_HEAD = L(38, 36), TB_ROW = L(50, 62);
  const tbCol0 = L(250, 150);
  function tbCell(r, c) { const cw = (TB.w - tbCol0) / 4; return { x: TB.x + tbCol0 + c * cw, y: TB.y + TB_HEAD + r * TB_ROW, w: cw, h: TB_ROW }; }
  const tblFilled = () => S.tbl.v.reduce((a, r) => a + r.filter((x) => x != null).length, 0);
  const tblRight = () => S.tbl.v.reduce((a, r, i) => a + r.filter((x, c) => x != null && x === TANS[i][c]).length, 0);
  function drawTbl(dt, t) {
    const B = S.tbl;
    bgFill('#eef6ea', '#f3f8ee');
    panel(TB.x, TB.y, TB.w, TB.h, 14);
    ctx.fillStyle = '#eaf5e4'; D.roundRect(TB.x, TB.y, TB.w, TB_HEAD, 12); ctx.fill();
    T(TB.x + 14, TB.y + TB_HEAD / 2 + 5, PHONE ? '문 · 대표 식물' : '문 (대표 식물)', 14, '#14532d', 'left', 800);
    TCOLS.forEach((c, ci) => { const r = tbCell(0, ci); T(r.x + r.w / 2, TB.y + TB_HEAD / 2 + 5, c.n, 14, '#14532d', 'center', 800); });
    for (let r = 0; r < 4; r++) {
      const y = TB.y + TB_HEAD + r * TB_ROW, ph = PH[r];
      const rowOk = B.v[r].every((x, c) => x === TANS[r][c]);
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(TB.x + 8, y); ctx.lineTo(TB.x + TB.w - 8, y); ctx.stroke();
      if (rowOk) { ctx.fillStyle = 'rgba(34,160,74,.10)'; ctx.fillRect(TB.x + 3, y + 1, TB.w - 6, TB_ROW - 1); }
      ctx.fillStyle = ph.col; D.roundRect(TB.x + 8, y + 6, 5, TB_ROW - 12, 3); ctx.fill();
      T(TB.x + 22, y + TB_ROW / 2 - (PHONE ? 4 : 2), ph.n, L(15.5, 14.5), ph.col, 'left', 800);
      T(TB.x + 22, y + TB_ROW / 2 + (PHONE ? 15 : 17), PHONE ? REP_S[r] : REP[r], L(13.5, 12.5), '#475569', 'left', 700);
      for (let c = 0; c < 4; c++) {
        const cr = tbCell(r, c), v = B.v[r][c], cx = cr.x + cr.w / 2, cy = cr.y + cr.h / 2;
        if (B.bad[r][c]) { D.roundRect(cr.x + 6, cr.y + 6, cr.w - 12, cr.h - 12, 10); ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2.4; ctx.stroke(); }
        else { D.roundRect(cr.x + 6, cr.y + 6, cr.w - 12, cr.h - 12, 10); ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
        if (v == null) T(cx, cy + 6, '?', 18, '#cbd5e1', 'center', 800);
        else if (c === 0) chip(cx, cy, v ? '종자' : '포자', { align: 'center', bg: v ? '#fbead2' : '#e3f3da', color: v ? '#b4690e' : '#2f7d32', border: v ? '#b4690e' : '#4f9d3a', size: 14, pad: 9, h: 28 });
        else if (v) { D.sphere(cx, cy, 12, '#22a04a', { gloss: false }); T(cx, cy + 5, 'O', 15, '#fff', 'center', 800); }
        else { D.sphere(cx, cy, 12, '#94a3b8', { gloss: false }); T(cx, cy + 5, 'X', 15, '#fff', 'center', 800); }
      }
    }
    // 파생 형질 쌓이는 순서
    const by = TB.y + TB.h + L(14, 12), bh = L(150, 150);
    panel(TB.x, by, TB.w, bh, 14, '#fff');
    const done = tblRight() === 16;
    if (done) B.k = SciSim.approach(B.k, 1, dt, 3); else B.k = SciSim.approach(B.k, 0, dt, 8);
    T(TB.x + 14, by + 26, '🧬 새로 생긴 형질이 쌓이는 순서', 15, '#14532d', 'left', 800);
    if (!done) { T(TB.x + TB.w / 2, by + bh / 2 + 14, '표를 모두 맞게 채우면 순서가 나타나요', L(15, 14), '#94a3b8', 'center', 800); return; }
    const stages = [{ n: PH[0].short, f: '' }, { n: PH[1].short, f: '+ 관다발' }, { n: PH[2].short, f: '+ 종자' }, { n: PH[3].short, f: '+ 씨방(꽃)' }];
    const sw = (TB.w - 40) / 4;
    for (let s = 0; s < 4; s++) {
      const a = clamp(B.k * 4 - s, 0, 1); if (a <= 0) continue;
      const x = TB.x + 20 + s * sw;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 8);
      ctx.fillStyle = PH[s].soft; ctx.strokeStyle = PH[s].col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, by + 42); ctx.lineTo(x + sw - 16, by + 42); ctx.lineTo(x + sw - 4, by + 42 + 30); ctx.lineTo(x + sw - 16, by + 42 + 60); ctx.lineTo(x, by + 42 + 60); ctx.lineTo(x + 12, by + 42 + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
      T(x + sw / 2 - 2, by + 42 + 36, PH[s].short, L(15, 13.5), PH[s].col, 'center', 800);
      if (stages[s].f) T(x + sw / 2 - 2, by + 42 + 84, stages[s].f, L(14.5, 13), '#1b2333', 'center', 800);
      ctx.restore();
    }
    T(TB.x + TB.w / 2, by + bh - 8, '관다발 → 종자 → 씨방(꽃) 순서로 새 형질이 더해졌어요', 13, '#475569', 'center', 700);
  }
  function tblDown(p) {
    const B = S.tbl;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (inRect(p, tbCell(r, c))) {
        const cur = B.v[r][c]; B.v[r][c] = cur == null ? 0 : cur === 0 ? 1 : null; B.bad[r][c] = false; Sound.tick(); updateCtl(); return false;
      }
    }
    return false;
  }

  /* ---------- 3단계: 겉씨 / 속씨 단면 비교 ---------- */
  const SC = L({ x: 20, y: 46, w: 760, h: 440 }, { x: 10, y: 44, w: 460, h: 560 });
  function drawSec(dt, t) {
    const tt = S.tbl.sec;
    bgFill('#eef6ea', '#f3f8ee');
    T(L(20, 12), 30, '🔬 같은 시간이 지나면: 밑씨는 어디서 종자가 될까?', L(17, 14.5), '#14532d', 'left', 800);
    const pw = L(372, 456), ph = L(380, 262);
    const P1 = { x: L(20, 12), y: L(48, 44), w: pw, h: ph }, P2 = { x: L(408, 12), y: L(48, 44 + ph + 12), w: pw, h: ph };
    [[P1, '겉씨식물 · 소나무 솔방울 비늘', PH[2]], [P2, '속씨식물 · 장미 꽃과 열매', PH[3]]].forEach(([P, ttl, phh]) => {
      panel(P.x, P.y, P.w, P.h, 14, phh.soft, { stroke: phh.col, lw: 2 });
      T(P.x + P.w / 2, P.y + 26, ttl, L(15.5, 14.5), phh.col, 'center', 800);
    });
    // 소나무: 비늘 위의 밑씨 → 종자(날개 달림), 계속 드러나 있음
    ctx.save(); ctx.translate(P1.x + P1.w / 2, P1.y + ph * 0.42);
    const sc1 = PHONE ? 0.95 : 1.35; ctx.scale(sc1, sc1);
    ctx.fillStyle = '#5a3a1c'; D.roundRect(-128, -62, 26, 124, 8); ctx.fill();
    ctx.fillStyle = '#8d5a2b'; ctx.beginPath(); ctx.moveTo(-104, -16); ctx.lineTo(70, -26); ctx.quadraticCurveTo(112, -14, 112, 0); ctx.quadraticCurveTo(112, 14, 70, 26); ctx.lineTo(-104, 18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-90, -4); ctx.lineTo(90, -8); ctx.moveTo(-90, 8); ctx.lineTo(90, 10); ctx.stroke();
    for (const q of [-52, 18]) {
      ctx.save(); ctx.translate(q, -26);
      if (tt < 0.55) { ctx.fillStyle = '#f5e7a1'; ctx.strokeStyle = '#c9b45a'; ctx.lineWidth = 1.5; ell(0, -9, 17, 10); ctx.fill(); ctx.stroke(); }
      else { const a = smooth((tt - 0.55) / 0.45); ctx.fillStyle = 'rgba(214,184,140,' + (0.95 * a) + ')'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.quadraticCurveTo(-30 * a, -34 * a, -14 * a, -52 * a); ctx.quadraticCurveTo(12 * a, -34 * a, 8, -14); ctx.fill(); ctx.fillStyle = '#7a4e22'; ell(0, -11, 8 + 6 * a, 9 + 3 * a); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
    const lb1y = P1.y + (PHONE ? P1.h - 66 : P1.h - 84);
    chip(P1.x + P1.w / 2, lb1y, tt < 0.55 ? '밑씨가 비늘 겉에 드러나 있어요' : '종자도 비늘 위에 드러난 채예요', { align: 'center', size: L(14.5, 13.5), bg: '#fff', border: PH[2].col, color: PH[2].col, pad: 12, h: 30 });
    T(P1.x + P1.w / 2, lb1y + 30, '씨방이 없어서 열매가 되지 않아요', L(14, 13), '#475569', 'center', 700);
    // 장미: 씨방이 밑씨를 둘러싸고 있다가 열매로 자람
    ctx.save(); ctx.translate(P2.x + P2.w / 2, P2.y + 160 * (ph / 380) + (PHONE ? 4 : 0)); ctx.scale(PHONE ? 0.8 : 1, PHONE ? 0.8 : 1);
    const gw = 1 + 0.5 * tt, a1 = 1 - smooth(tt * 1.4);
    if (a1 > 0.01) { ctx.globalAlpha = a1; ctx.fillStyle = '#d63a7b'; ctx.beginPath(); ctx.moveTo(-8, -14); ctx.bezierCurveTo(-92, -20, -100, -100, -40, -112); ctx.bezierCurveTo(-64, -72, -42, -40, -8, -14); ctx.fill(); ctx.beginPath(); ctx.moveTo(8, -14); ctx.bezierCurveTo(92, -20, 100, -100, 40, -112); ctx.bezierCurveTo(64, -72, 42, -40, 8, -14); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.save(); ctx.scale(gw, gw);
    const fr = tt, bodyCol = SciSim.color.mix('#4a9a3b', '#d6264b', smooth(fr));
    ctx.fillStyle = bodyCol; ctx.beginPath(); ctx.moveTo(-48, 0); ctx.quadraticCurveTo(-44, 80, 0, 100); ctx.quadraticCurveTo(44, 80, 48, 0); ctx.quadraticCurveTo(0, 16, -48, 0); ctx.fill();
    ctx.fillStyle = SciSim.color.mix('#e9f5c9', '#f6c6cf', smooth(fr)); ctx.beginPath(); ctx.moveTo(-36, 10); ctx.quadraticCurveTo(-32, 66, 0, 82); ctx.quadraticCurveTo(32, 66, 36, 10); ctx.quadraticCurveTo(0, 22, -36, 10); ctx.fill();
    for (const [ox, oy] of [[-16, 38], [16, 38], [0, 56], [-20, 58], [20, 58]]) { ctx.fillStyle = tt < 0.55 ? '#fff7d0' : '#8a5a2b'; ctx.strokeStyle = '#6a9a2d'; ctx.lineWidth = 1.4; ell(ox, oy, 7 + 2 * smooth(tt), 8 + 2 * smooth(tt)); ctx.fill(); ctx.stroke(); }
    ctx.restore(); ctx.restore();
    const lb2y = P2.y + P2.h - (PHONE ? 66 : 84);
    chip(P2.x + P2.w / 2, lb2y, tt < 0.55 ? '씨방이 밑씨를 둘러싸고 있어요' : '씨방이 열매가 되고 종자는 열매 속에 있어요', { align: 'center', size: L(14.5, 13.5), bg: '#fff', border: PH[3].col, color: PH[3].col, pad: 12, h: 30 });
    T(P2.x + P2.w / 2, lb2y + 30, tt < 0.55 ? '(꽃가루받이 전: 밑씨는 씨방 안)' : '(꽃가루받이 뒤: 씨방 → 열매, 밑씨 → 종자)', L(14, 13), '#475569', 'center', 700);
  }

  /* ---------- 4단계: 식물도감 ---------- */
  const EVID = [
    { id: 'v1', t: '관다발이 있다', k: 'vasc', v: 1, ok: true }, { id: 'v0', t: '관다발이 없다', k: 'vasc', v: 0, ok: true },
    { id: 's1', t: '종자를 만든다', k: 'seed', v: 1, ok: true }, { id: 's0', t: '종자 없이 포자로 번식한다', k: 'seed', v: 0, ok: true },
    { id: 'o1', t: '씨방이 있다', k: 'ovary', v: 1, ok: true }, { id: 'o0', t: '씨방이 없다', k: 'ovary', v: 0, ok: true },
    { id: 'h', t: '키가 작다', ok: false }, { id: 'c', t: '잎이 초록색이다', ok: false },
  ];
  const REQ = [['v0'], ['v1', 's0'], ['s1', 'o0'], ['o1']];
  function evTrue(i, e) { return e.ok && PL[i][e.k] === e.v; }
  function cardCheck(i) {      // 문자열: 틀린 까닭 / true: 맞음
    const c = S.book.cards[i], p = PL[i];
    if (!c.hab) return '서식지를 골라 주세요.';
    if (c.hab !== p.hab) return '서식지가 ' + p.n + '의 실제 사는 곳과 달라요.';
    if (c.ph == null) return '소속 문을 골라 주세요.';
    if (c.ph !== p.ph) return withJosa(p.n, '은/는') + ' ' + PH[c.ph].n + '이 아니에요. 형질 검색표를 다시 따라가 보세요.';
    if (c.ev.length < 2) return '근거 형질을 2개 골라 주세요.';
    for (const id of c.ev) {
      const e = EVID.find((x) => x.id === id);
      if (!e.ok) return '"' + e.t + '"는 문을 나누는 기준이 아니에요. 크기나 색 말고 관다발·종자·씨방 같은 형질을 골라요.';
      if (!evTrue(i, e)) return '"' + e.t + '"는 ' + p.n + '에 맞지 않아요.';
    }
    const need = REQ[p.ph].filter((id) => !c.ev.includes(id));
    if (need.length) { const ne = EVID.find((x) => x.id === need[0]); return '선택한 근거만으로는 ' + PH[p.ph].n + '을 정할 수 없어요. "' + ne.t + '"처럼 문을 가르는 결정적 형질이 필요해요.'; }
    return true;
  }
  function resetBook() {
    S.book = { sel: 0, cards: PL.map(() => ({ hab: '', ph: null, ev: [], saved: false, flip: 1 })), view: 'card', gal: 0, galK: 0, msg: '' };
    S.grp = { sel: -1, ph: PL.map((p, i) => (i === 5 ? 2 : p.ph)), pos: PL.map(() => null), tapped: false, moves: 0 };
  }
  const BK = L({ x: 20, y: 100, w: 760, h: 446 }, { x: 10, y: 128, w: 460, h: 500 });
  function tabRect(i) { const w = L(90, 112), h = L(34, 38); return PHONE ? { x: 10 + (i % 4) * 116, y: 40 + Math.floor(i / 4) * 44, w, h } : { x: 20 + i * 95, y: 44, w, h }; }
  function galPos(i, grouped) {      // 갤러리 카드 위치
    const colW = L(180, 112), cw = L(168, 106), ch = L(70, 56);
    const idxs = PL.map((p, j) => j).filter((j) => PL[j].ph === PL[i].ph), n = idxs.indexOf(i);
    const gp = { x: BK.x + (PL[i].ph) * (colW + L(10, 4)) + L(4, 0), y: BK.y + 56 + n * (ch + 8), w: cw, h: ch };
    const mix = { x: BK.x + (i % 4) * (colW + L(10, 4)) + L(4, 0), y: BK.y + 56 + Math.floor(i / 4) * (ch + 8), w: cw, h: ch };
    const k = grouped;
    return { x: lerp(mix.x, gp.x, k), y: lerp(mix.y, gp.y, k), w: gp.w, h: gp.h };
  }
  const savedN = () => S.book.cards.filter((c) => c.saved).length;
  function drawBook(dt, t) {
    const B = S.book;
    bgFill('#fbf6e9', '#f7f1e0');
    // 탭
    for (let i = 0; i < NP; i++) {
      const r = tabRect(i), c = B.cards[i], sel = B.sel === i && B.view === 'card';
      box(r, PL[i].n + (c.saved ? ' ✔' : ''), { bg: sel ? '#16a34a' : c.saved ? '#dcfce7' : '#fff', color: sel ? '#fff' : '#1b2333', border: sel ? '#0b6b39' : c.saved ? '#16a34a' : '#d6d3c4', lw: 2, size: 14, r: 12 });
    }
    if (B.view === 'gallery') { drawGallery(dt, t); return; }
    // 도감 쪽
    const i = B.sel, c = B.cards[i], p = PL[i];
    const fl = c.flip, sx = Math.max(0.02, Math.abs(fl));
    ctx.save(); ctx.translate(BK.x + BK.w / 2, BK.y + BK.h / 2); ctx.scale(sx, 1); ctx.translate(-(BK.x + BK.w / 2), -(BK.y + BK.h / 2));
    D.shadow(() => { D.roundRect(BK.x, BK.y, BK.w, BK.h, 18); ctx.fillStyle = '#fffdf5'; ctx.fill(); }, { blur: 14, y: 5 });
    D.roundRect(BK.x, BK.y, BK.w, BK.h, 18); ctx.strokeStyle = c.saved ? '#16a34a' : '#d9cfae'; ctx.lineWidth = c.saved ? 3.5 : 2.5; ctx.stroke();
    const half = PHONE ? 0 : BK.w * 0.4;
    if (!PHONE) { ctx.strokeStyle = '#e7dfc3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(BK.x + half, BK.y + 16); ctx.lineTo(BK.x + half, BK.y + BK.h - 16); ctx.stroke(); }
    // 그림
    const px = PHONE ? BK.x + BK.w / 2 : BK.x + half / 2, py = PHONE ? BK.y + 170 : BK.y + BK.h / 2 + 90;
    ctx.fillStyle = '#e8f3dc'; D.roundRect(PHONE ? BK.x + 14 : BK.x + 16, BK.y + 14, PHONE ? BK.w - 28 : half - 32, PHONE ? 190 : BK.h - 28, 14); ctx.fill();
    sprite(i, px, py, PHONE ? 1.4 : 1.9, t);
    if (c.saved) { ctx.save(); ctx.translate(PHONE ? BK.x + BK.w - 56 : BK.x + half - 52, BK.y + 54); ctx.rotate(-0.22); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; D.roundRect(-34, -16, 68, 32, 8); ctx.stroke(); T(0, 6, '저장됨', 16, '#16a34a', 'center', 800); ctx.restore(); }
    // 글
    const tx = PHONE ? BK.x + 20 : BK.x + half + 24, tw = PHONE ? BK.w - 40 : BK.w - half - 48;
    let ty = PHONE ? BK.y + 230 : BK.y + 52;
    T(tx, ty, '🌱 ' + p.n, L(26, 22), '#14532d', 'left', 800); ty += L(40, 34);
    const row = (lab, val, ph) => {
      T(tx, ty, lab, 13.5, '#8a7f55', 'left', 800);
      if (val) { const s = fitText(val, tw, L(17, 15.5), 800, 13.5); T(tx, ty + L(24, 22), val, s, ph != null ? PH[ph].col : '#1b2333', 'left', 800); }
      else T(tx, ty + L(24, 22), '— ' + L('오른쪽', '아래') + ' 패널에서 골라요 —', L(15, 14), '#c7bfa0', 'left', 700);
      ty += L(62, 54);
    };
    row('서식지', c.hab); row('소속 문', c.ph != null ? PH[c.ph].n : '', c.ph);
    T(tx, ty, '근거 형질 (2개)', 13.5, '#8a7f55', 'left', 800);
    c.ev.forEach((id, k) => { const e = EVID.find((x) => x.id === id); chip(tx, ty + 28 + k * 38, e.t, { size: L(15, 14), bg: '#fff', border: '#16a34a', color: '#0b6b39', pad: 12, h: 30 }); });
    if (!c.ev.length) T(tx, ty + L(30, 26), '— ' + L('오른쪽', '아래') + ' 패널에서 골라요 —', L(15, 14), '#c7bfa0', 'left', 700);
    ctx.restore();
    if (B.msg) { T(VW / 2, VH - 12, B.msg, 14, '#b91c1c', 'center', 800); }
  }
  function drawGallery(dt, t) {
    const B = S.book;
    if (!PHONE) T(20, BK.y - 6, '📚 우리 정원 식물도감: 문별로 모아 봤어요', 17, '#14532d', 'left', 800);
    const colW = L(180, 112);
    for (let ph = 0; ph < 4; ph++) {
      const x = BK.x + ph * (colW + L(10, 4)), op = clamp(B.galK * 1.5, 0, 1);
      ctx.save(); ctx.globalAlpha = op; box({ x: x + L(4, 0), y: BK.y + 8, w: L(168, 106), h: 36 }, PH[ph].n, { bg: PH[ph].col, color: '#fff', size: 14.5, r: 12 }); ctx.restore();
    }
    for (let i = 0; i < NP; i++) {
      const gp = galPos(i, B.galK), ph = PH[PL[i].ph];
      plantCard(i, gp, { border: ph.col });
    }
  }
  function bookDown(p) {
    const B = S.book;
    for (let i = 0; i < NP; i++) if (inRect(p, tabRect(i))) { if (B.view === 'gallery') B.view = 'card'; B.sel = i; Sound.click(); updateCtl(); return false; }
    return false;
  }
  function saveCard() {
    const B = S.book, i = B.sel, c = B.cards[i];
    const r = cardCheck(i);
    if (r !== true) { B.msg = r; Sound.fail(); showHint(r, 6000); updateCtl(); return; }
    B.msg = ''; hideHint();
    if (c.saved) return;
    c.saved = true; Sound.success();
    c.flip = 1; SciSim.tween(c, { flip: -1 }, { duration: RM ? 0.01 : 0.5, ease: 'inOutSine', onDone: () => { c.flip = 1; } });
    // 뒤집는 중간에 내용이 바뀌는 것처럼 보이도록 짧게 크기만 변화
    parts.burst(BK.x + BK.w / 2, BK.y + BK.h / 2, { count: 24, colors: ['#22c55e', '#fde68a', '#fff'], speed: 160, size: 4, life: 0.8, gravity: 80 });
    if (savedN() === NP) {
      setTimeout(() => { if (S.book !== B) return; B.view = 'gallery'; B.galK = 0; SciSim.tween(B, { galK: 1 }, { duration: RM ? 0.01 : 1.0, ease: 'inOutCubic' }); updateCtl(); }, RM ? 0 : 700);
    }
    updateCtl();
  }

  /* ---------- 4단계: 모둠 도감 ---------- */
  const GRP_PH = PL.map((p, i) => (i === 5 ? 2 : p.ph));        // 모둠 도감에 적힌 문 (벼가 잘못 적힘)
  const GRP_EV = ['헛뿌리가 있고 관다발이 없다', '포자낭에서 포자를 만든다', '관다발이 있고 포자로 번식한다', '밑씨가 드러난 종자를 만든다', '밑씨가 드러난 종자를 만든다', '꽃이 눈에 잘 안 띄고 종자를 만든다', '꽃이 피고 씨방이 있다', '꽃이 피고 씨방이 있다'];
  const GCH = L(70, 56), GCW = L(168, 106), GCOL = L(180, 112);
  const grpInfoY = () => BK.y + 56 + 3 * (GCH + 8) + 10;
  function grpTarget(i) {
    const G2 = S.grp, ph = G2.ph[i], idxs = PL.map((p, j) => j).filter((j) => G2.ph[j] === ph), n = idxs.indexOf(i);
    const avail = grpInfoY() - 8 - (BK.y + 56), step = idxs.length <= 3 ? GCH + 8 : Math.max(18, (avail - GCH) / (idxs.length - 1));
    return { x: BK.x + ph * (GCOL + L(10, 4)) + L(4, 0), y: BK.y + 56 + n * step };
  }
  function drawGroup(dt, t) {
    const G2 = S.grp;
    bgFill('#fbf6e9', '#f7f1e0');
    T(L(20, 12), 30, '👥 모둠 도감: 잘못 분류된 카드를 찾아요', L(17, 14.5), '#14532d', 'left', 800);
    T(L(20, 12), L(60, 58), '카드를 눌러 근거를 읽고, ' + L('오른쪽', '아래') + ' 패널에서 알맞은 문으로 옮겨요', L(14.5, 13.5), '#64748b', 'left', 700);
    for (let ph = 0; ph < 4; ph++) { const x = BK.x + ph * (GCOL + L(10, 4)); box({ x: x + L(4, 0), y: BK.y + 8, w: GCW, h: 36 }, PH[ph].n, { bg: PH[ph].col, color: '#fff', size: 14.5, r: 12 }); }
    const order = PL.map((p, i) => i).sort((a, b) => (a === G2.sel) - (b === G2.sel));
    order.forEach((i) => {
      const tg = grpTarget(i);
      if (!G2.pos[i]) G2.pos[i] = { x: tg.x, y: tg.y };
      G2.pos[i].x = SciSim.approach(G2.pos[i].x, tg.x, dt, 9); G2.pos[i].y = SciSim.approach(G2.pos[i].y, tg.y, dt, 9);
      const gp = { x: G2.pos[i].x, y: G2.pos[i].y, w: GCW, h: GCH }, sel = G2.sel === i;
      plantCard(i, gp, { border: sel ? '#eab308' : PH[G2.ph[i]].col, sel });
      if (sel) D.ring(gp.x + gp.w / 2, gp.y + gp.h / 2, Math.max(gp.w, gp.h) * 0.58, t, { color: '#eab308', width: 3 });
    });
    const iy = grpInfoY();
    panel(L(20, 10), iy, VW - L(40, 20), VH - iy - 10, 14, '#fff');
    if (G2.sel < 0) textBlock(L(36, 24), iy + 32, VW - L(72, 48), '카드를 눌러 모둠원이 적은 근거 형질을 확인해요. 내 도감과 비교해 잘못 분류된 카드를 찾아봐요.', L(15, 14), '#475569', 20, 700);
    else { const i = G2.sel; textBlock(L(36, 24), iy + 30, VW - L(72, 48), '모둠원이 적은 ' + PL[i].n + ': ' + PH[GRP_PH[i]].n + ' · 근거 "' + GRP_EV[i] + '"' + (G2.ph[i] !== GRP_PH[i] ? '\n(지금은 ' + PH[G2.ph[i]].n + ' 칸으로 옮겼어요)' : ''), L(15, 14), '#1b2333', 20, 800); }
  }
  function groupDown(p) {
    const G2 = S.grp;
    for (let i = NP - 1; i >= 0; i--) { const pp = G2.pos[i]; if (pp && inRect(p, { x: pp.x, y: pp.y, w: GCW, h: GCH })) { G2.sel = i; G2.tapped = true; Sound.click(); updateCtl(); return false; } }
    return false;
  }
  function grpMove(ph) {
    const G2 = S.grp; if (G2.sel < 0) return;
    G2.ph[G2.sel] = ph; G2.moves++; Sound.click(); updateCtl();
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_LABEL = { garden: '🌿 가상 정원: 식물 관찰', key: '🔑 이분 검색표', korder: '🔀 검색표 질문 순서', tbl: '📋 4개 문의 특징', sec: '🔬 겉씨 · 속씨 단면', book: '📖 식물도감 쓰기', group: '👥 모둠 도감 비교' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function chkWrong() { const out = []; S.gd.chk.forEach((r, i) => r.forEach((v, k) => { if (v != null && v !== PL[i][TR[k].k]) out.push([i, k]); })); return out; }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    const g = S.gd;
    if (g) {
      $('#gdName').textContent = '🌿 ' + PL[g.sel].n + ' · 형질 입력';
      $$('#ctrlCard [data-trait]').forEach((seg) => { const k = +seg.dataset.trait; $$('button', seg).forEach((b) => { b.classList.toggle('on', g.chk[g.sel][k] === +b.dataset.v); }); });
      $('#gdNote').innerHTML = game && game.has('chk') ? '입력한 칸 <b>' + chkFilled() + ' / 24</b> · 표의 칸을 눌러도 O / X를 바꿀 수 있어요.' : '식물을 눌러 확대경으로 구조를 살펴봐요. 관찰한 식물 <b>' + Object.keys(g.viewed).length + ' / 8</b>';
    }
    const K = S.key;
    if (K) {
      const can = !!(K.cur && !K.cur.busy);
      $('#bYes').disabled = !can; $('#bNo').disabled = !can;
      $('#keyNote').innerHTML = K.cur ? '<b>' + PL[K.cur.i].n + '</b> · ' + (K.cur.node + 1) + '번 질문: ' + KEYQ[K.cur.node].q : keyDoneN() === NP ? '🎉 모두 분류했어요. 다시 해 보려면 처음부터를 눌러요.' : '캔버스 아래 식물 카드를 눌러 시작해요.';
    }
    if (S.ko) { $$('#koGrid button').forEach((b) => { const o = +b.dataset.o; b.classList.toggle('on', S.ko.opt === o); b.classList.toggle('ok', !!S.ko.seen[o] && S.ko.opt !== o); }); $('#koNote').innerHTML = '살펴본 검색표 <b>' + Object.keys(S.ko.seen).length + ' / 4</b> · 문이 섞이지 않고, 가장 짧은 검색표를 찾아요.'; }
    if (S.tbl) { $('#tblNote').innerHTML = '채운 칸 <b>' + tblFilled() + ' / 16</b> · 맞은 칸 <b>' + tblRight() + ' / 16</b><br>칸을 누를 때마다 ? → 포자(X) → 종자(O)처럼 바뀌어요.'; $('#sSec').style.setProperty('--pct', (S.tbl.sec * 100) + '%'); $('#oSec').textContent = S.tbl.sec < 0.05 ? '꽃가루받이 전' : S.tbl.sec > 0.95 ? '씨가 다 익음' : Math.round(S.tbl.sec * 100) + ' %'; }
    const B = S.book;
    if (B) {
      const c = B.cards[B.sel];
      $('#bkName').textContent = '📖 ' + PL[B.sel].n + ' 도감 카드';
      $('#selHab').value = c.hab; $('#selPh').value = c.ph == null ? '' : String(c.ph);
      $$('#evGrid button').forEach((b) => b.classList.toggle('on', c.ev.indexOf(b.dataset.id) >= 0));
      $('#bSave').disabled = c.saved; $('#bSave').textContent = c.saved ? '✅ 저장했어요' : '📖 도감에 저장';
      $('#bGal').hidden = savedN() < NP;
      $('#bkNote').innerHTML = '저장한 카드 <b>' + savedN() + ' / 8</b> · 근거 형질 <b>' + c.ev.length + ' / 2</b>';
    }
    const G2 = S.grp;
    if (G2) {
      $('#grpName').textContent = G2.sel < 0 ? '카드를 먼저 눌러요' : '🌿 ' + PL[G2.sel].n + ' 카드의 문';
      $('#grpSel').disabled = G2.sel < 0; $('#grpSel').value = G2.sel < 0 ? '' : String(G2.ph[G2.sel]);
      $('#grpNote').innerHTML = '옮긴 횟수 <b>' + G2.moves + '번</b> · 맞게 놓인 카드 <b>' + G2.ph.filter((p, i) => p === PL[i].ph).length + ' / 8</b>';
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#ctrlCard [data-trait]').forEach((seg) => $$('button', seg).forEach((b) => b.addEventListener('click', () => { const k = +seg.dataset.trait, g = S.gd; setChk(g.sel, k, +b.dataset.v); if (!g.viewed[g.sel]) { g.viewed[g.sel] = true; } })));
  $('#bYes').addEventListener('click', () => keyAnswer(true));
  $('#bNo').addEventListener('click', () => keyAnswer(false));
  $('#bKeyReset').addEventListener('click', () => { Sound.click(); resetKey(); hideHint(); updateCtl(); });
  $$('#koGrid button').forEach((b) => b.addEventListener('click', () => setKo(+b.dataset.o)));
  $('#bTblClear').addEventListener('click', () => { Sound.click(); resetTbl(); updateCtl(); });
  $('#sSec').addEventListener('input', (e) => { S.tbl.sec = +e.target.value / 100; S.tbl.secSeen = true; Sound.tick(); updateCtl(); });
  (function buildBookCtl() {
    const sp = $('#selPh'); sp.innerHTML = '<option value="">— 문 고르기 —</option>' + PH.map((p, i) => '<option value="' + i + '">' + p.n + '</option>').join('');
    const gs = $('#grpSel'); gs.innerHTML = '<option value="">— 문 고르기 —</option>' + PH.map((p, i) => '<option value="' + i + '">' + p.n + '</option>').join('');
    const eg = $('#evGrid'); EVID.forEach((e) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = e.id; b.textContent = e.t; eg.appendChild(b); b.addEventListener('click', () => { const c = S.book.cards[S.book.sel]; if (c.saved) return; const at = c.ev.indexOf(e.id); if (at >= 0) c.ev.splice(at, 1); else { if (c.ev.length >= 2) { showHint('근거 형질은 2개까지 고를 수 있어요. 하나를 먼저 해제해요.', 2800); return; } c.ev.push(e.id); } Sound.tick(); S.book.msg = ''; updateCtl(); }); });
  })();
  function refreshHab() {
    const B = S.book, i = B.sel, s = $('#selHab');
    s.innerHTML = '<option value="">— 서식지 고르기 —</option>' + HAB_OPTS[i].map((h) => '<option value="' + h + '">' + h + '</option>').join('');
  }
  $('#selHab').addEventListener('change', (e) => { const c = S.book.cards[S.book.sel]; if (!c.saved) c.hab = e.target.value; else e.target.value = c.hab; S.book.msg = ''; Sound.click(); updateCtl(); });
  $('#selPh').addEventListener('change', (e) => { const c = S.book.cards[S.book.sel]; if (!c.saved) c.ph = e.target.value === '' ? null : +e.target.value; else e.target.value = String(c.ph); S.book.msg = ''; Sound.click(); updateCtl(); });
  $('#bSave').addEventListener('click', saveCard);
  $('#bPrev').addEventListener('click', () => { const B = S.book; B.view = 'card'; B.sel = (B.sel + NP - 1) % NP; refreshHab(); Sound.click(); updateCtl(); });
  $('#bNext').addEventListener('click', () => { const B = S.book; B.view = 'card'; B.sel = (B.sel + 1) % NP; refreshHab(); Sound.click(); updateCtl(); });
  $('#bGal').addEventListener('click', () => { const B = S.book; B.view = B.view === 'gallery' ? 'card' : 'gallery'; if (B.view === 'gallery') { B.galK = 0; SciSim.tween(B, { galK: 1 }, { duration: RM ? 0.01 : 0.9, ease: 'inOutCubic' }); } Sound.click(); updateCtl(); });
  $('#grpSel').addEventListener('change', (e) => { if (e.target.value !== '') grpMove(+e.target.value); });

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'garden') return gardenDown(p); if (S.mode === 'key') return keyDown(p); if (S.mode === 'tbl') return tblDown(p); if (S.mode === 'book') return bookDown(p); if (S.mode === 'group') return groupDown(p); return false; },
    hover(p) {
      if (S.mode === 'garden') return inRect(p, G) || inRect(p, TP) ? 'pointer' : 'default';
      if (S.mode === 'key') { if (KG.tray.some((r) => inRect(p, r)) || inRect(p, KG.yes) || inRect(p, KG.no)) return 'pointer'; return 'default'; }
      if (S.mode === 'tbl') return 'pointer';
      return 'default';
    },
  });
  let rlast = '';
  function readouts() {
    let a1, a2, a3, b1, b2, b3;
    const m = S.mode;
    if (m === 'garden') { a1 = '선택한 식물'; b1 = PL[S.gd.sel].n; a2 = '관찰한 식물'; b2 = Object.keys(S.gd.viewed).length + ' / 8'; a3 = '체크리스트'; b3 = game && game.has('chk') ? chkFilled() + ' / 24칸' : '—'; }
    else if (m === 'key') { a1 = '분류한 식물'; b1 = keyDoneN() + ' / 8'; a2 = '틀린 답'; b2 = S.key.miss + '번'; a3 = '지금 질문'; b3 = S.key.cur ? (S.key.cur.node + 1) + '번' : '—'; }
    else if (m === 'korder') { const ev = KEVAL[S.ko.opt]; a1 = '검색표'; b1 = KOPT[S.ko.opt].id; a2 = '4개 문을 정확히'; b2 = ev.ok ? '나눔 ✔' : '못 나눔 ✘'; a3 = '가장 긴 경로'; b3 = ev.maxQ + '번 질문'; }
    else if (m === 'tbl') { a1 = '채운 칸'; b1 = tblFilled() + ' / 16'; a2 = '맞은 칸'; b2 = tblRight() + ' / 16'; a3 = '형질 순서'; b3 = tblRight() === 16 ? '관다발→종자→씨방' : '—'; }
    else if (m === 'sec') { const tt = S.tbl.sec; a1 = '경과'; b1 = Math.round(tt * 100) + ' %'; a2 = '소나무: 밑씨·종자'; b2 = '비늘 겉에 드러남'; a3 = '장미: 밑씨·종자'; b3 = tt < 0.55 ? '씨방 속 (밑씨)' : '열매 속 (종자)'; }
    else if (m === 'book') { const c = S.book.cards[S.book.sel]; a1 = '저장한 카드'; b1 = savedN() + ' / 8'; a2 = '선택한 식물'; b2 = PL[S.book.sel].n; a3 = '근거 형질'; b3 = c.ev.length + ' / 2'; }
    else { a1 = '선택한 카드'; b1 = S.grp.sel < 0 ? '—' : PL[S.grp.sel].n; a2 = '옮긴 횟수'; b2 = S.grp.moves + '번'; a3 = '맞게 놓인 카드'; b3 = S.grp.ph.filter((p, i) => p === PL[i].ph).length + ' / 8'; }
    const kS = [a1, b1, a2, b2, a3, b3].join('|');
    if (kS === rlast) return; rlast = kS;
    l1.textContent = a1; v1.textContent = b1; l2.textContent = a2; v2.textContent = b2; l3.textContent = a3; v3.textContent = b3;
  }

  /* =========================================================
     미션
     ========================================================= */
  const nameList = (arr) => arr.map((i) => PL[i].n).join(', ');
  const levels = [
    {
      title: '정원의 식물 관찰', short: '식물의 몸', icon: '🌿', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 생김새가 아주 다른 식물들을 몇 가지 기준만으로 나눌 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교 \'생물의 분류\'에서</b> 생물을 분류하는 기준과 식물의 특징을 배웠어요. 이번에는 식물을 <b>문(門) 수준</b>에서 나눠 보아요.</div>' +
        '<p><b>가상 정원</b>의 식물 8종(우산이끼, 솔이끼, 고사리, 소나무, 은행나무, 벼, 민들레, 장미)을 확대해 보고 <b>관다발 · 종자 · 씨방</b> 세 가지 형질이 있는지 표에 정리해요.</p>',
      features: ['garden', 'chk'],
      setup() { resetGarden(); setMode('garden'); selectPlant(0); },
      recap: '식물은 관다발, 종자, 씨방 같은 형질이 있는지로 나눌 수 있어요. 관다발이 없는 이끼는 물과 양분을 멀리 보내지 못해 키가 작아요.',
      summary: '<ul><li>식물의 <b>분류 형질</b>: <b>관다발</b>(물과 양분의 이동 통로), <b>종자</b>(씨), <b>씨방</b>(밑씨를 싸는 구조)</li><li>이끼(우산이끼, 솔이끼)는 관다발이 없고 <b>헛뿌리</b>로 물을 흡수하며 <b>포자</b>로 번식해요.</li><li>고사리는 관다발이 있지만 종자 없이 포자로 번식해요.</li><li>소나무·은행나무는 종자가 있지만 씨방이 없고, 벼·민들레·장미는 씨방이 있어요. (벼는 꽃이 작아 눈에 잘 띄지 않아요.)</li></ul>',
      missions: [
        {
          title: '가상 정원 8종 관찰하기', goal: '정원의 식물을 한 종씩 눌러 확대경으로 구조를 살펴봐요.',
          check: () => Object.keys(S.gd.viewed).length === NP, hold: 0.4,
          status: () => '👀 ' + PL.map((p, i) => mark(S.gd.viewed[i]) + p.n).join(' '),
          hint: '아직 보지 않은 식물을 정원에서 눌러 보세요. 확대경이 따라와요.',
          setup() { setMode('garden'); },
          explain: '식물마다 뿌리·줄기·잎뿐 아니라 <b>포자낭, 솔방울, 꽃</b>처럼 번식에 쓰는 구조가 달라요. 이런 구조의 있고 없음이 분류의 기준(형질)이 돼요.',
        },
        {
          title: '형질 체크리스트 채우기', goal: '확대한 모습을 근거로 8종의 관다발 · 종자 · 씨방 유무를 표에 채워요. 다 채우고 확인해요.', manual: true,
          hint: '확대경에 보이는 구조를 떠올려 보세요. 소나무는 밑씨가 비늘 겉에 드러나 있고, 장미는 씨방이 밑씨를 싸고 있어요.',
          setup() { setMode('garden'); },
          check() {
            const g = S.gd, miss = 24 - chkFilled();
            g.bad.forEach((r) => r.fill(false));
            if (miss) return '아직 비어 있는 칸이 ' + miss + '개 있어요. 8종 모두 세 가지 형질을 채워요.';
            const w = chkWrong();
            if (w.length) { w.forEach(([i, k]) => { g.bad[i][k] = true; }); const [i, k] = w[0]; return '빨간 칸 ' + w.length + '개를 다시 살펴봐요. 예를 들어 ' + PL[i].n + '의' + ' ' + TR[k].n + ' 칸이에요.'; }
            return true;
          },
          explain: '이끼는 <b>관다발 · 종자 · 씨방이 모두 없고</b>, 고사리는 <b>관다발만</b> 있어요. 소나무와 은행나무는 <b>관다발과 종자</b>가 있지만 씨방은 없고, 벼 · 민들레 · 장미는 <b>세 가지 모두</b> 있어요.',
        },
        {
          type: 'quiz', title: '이끼의 키가 작은 까닭은?', goal: '이끼류는 보통 키가 수 센티미터에 불과해요. 그 까닭으로 가장 알맞은 것은?',
          setup() { setMode('garden'); },
          choices: ['관다발이 없어 물과 양분을 몸 전체로 멀리 운반하기 어렵기 때문이다', '종자를 만들지 못하기 때문이다', '씨방이 없어 열매를 맺지 못하기 때문이다', '엽록체가 없어 광합성을 하지 못하기 때문이다'],
          answer: 0,
          feedback: ['', '고사리도 종자를 만들지 않지만 키가 크게 자라요. 종자 유무는 키와 직접 관계가 없어요.', '씨방 유무는 번식과 관련 있어요. 몸의 크기와는 직접 관계가 없어요.', '이끼도 엽록체가 있어 광합성을 해요.'],
          explain: '관다발은 물과 양분이 이동하는 통로예요. 관다발이 없는 이끼는 헛뿌리로 흡수한 물이 세포를 따라 조금씩 퍼져야 해서 크게 자라기 어려워요. 그래서 <b>습하고 그늘진 곳에서 낮게</b> 살아요.',
        },
      ],
    },
    {
      title: '형질 검색표', short: '형질 검색표', icon: '🔑', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 8종의 관다발 · 종자 · 씨방 유무를 표로 정리했어요. 이 세 가지 질문을 차례로 던지는 <b>이분 검색표</b>로 4개의 문을 찾아봐요.</div>' +
        '<p>식물 카드를 하나 골라 <b>예 / 아니오</b>로 답하며 검색표를 따라가요. 질문 순서를 바꾸면 검색표가 어떻게 달라지는지도 비교해요.</p>',
      features: ['key', 'korder'],
      setup() { resetKey(); resetKo(); setMode('key'); },
      recap: '관다발 → 종자 → 씨방 순서로 질문하면 선태식물, 양치식물, 겉씨식물, 속씨식물의 4개 문으로 나뉘어요.',
      summary: '<ul><li><b>이분 검색표</b>: 예 / 아니오로 답하며 생물을 분류하는 방법이에요.</li><li>관다발이 없으면 <b>선태식물문</b>, 관다발만 있고 종자가 없으면 <b>양치식물문</b>, 종자는 있고 씨방이 없으면 <b>겉씨식물문</b>, 씨방까지 있으면 <b>속씨식물문</b>이에요.</li><li>질문 순서가 달라도 문을 정확히 나눌 수 있지만, 길이는 달라질 수 있어요. 키처럼 문과 상관없는 기준은 문을 섞어 놓아요.</li></ul>',
      missions: [
        {
          title: '검색표로 8종 분류하기', goal: '식물 카드를 눌러 질문에 답하며 알맞은 문 상자에 모두 넣어요.',
          check: () => keyDoneN() === NP, hold: 0.4,
          status: () => '🔑 ' + PH.map((p, b) => p.short + ' ' + S.key.bins[b].length).join(' · ') + ' · 틀린 답 ' + S.key.miss + '번',
          hint: '관다발이 없다면 1번 질문에서 "아니오"로 가요. 계속 "예"이면 다음 질문으로 넘어가요.',
          setup() { setMode('key'); },
          explain: '검색표는 한 번에 하나씩 <b>형질의 유무</b>를 물어 가능성을 줄여 가요. 관다발이 있는 식물만 2번 질문으로, 종자가 있는 식물만 3번 질문으로 넘어가므로 형질이 쌓이는 순서(관다발 → 종자 → 씨방)와 같아요.',
        },
        {
          title: '가장 알맞은 검색표 고르기', goal: '질문 순서가 다른 검색표 4가지를 모두 살펴보고, 4개 문을 정확히 나누면서 가장 긴 경로가 2번 질문 이하인 검색표를 골라 확인해요.', manual: true,
          hint: '검색표를 눌러 바꿔 가며 결과를 비교해 보세요. "가장 긴 경로"는 식물 중 가장 많은 질문을 거치는 경우예요.',
          setup() { setMode('korder'); },
          check() {
            const seen = Object.keys(S.ko.seen).length;
            if (seen < 4) return '검색표 4가지를 모두 살펴본 뒤에 골라요. (지금 ' + seen + ' / 4)';
            const ev = KEVAL[S.ko.opt];
            if (!ev.ok) return '이 검색표는 같은 문이 섞이거나 갈라져요. 키는 문을 나누는 기준이 아니에요.';
            if (ev.maxQ > 2) return '이 검색표도 4개 문을 정확히 나누지만 가장 긴 경로가 ' + ev.maxQ + '번 질문이에요. 더 짧은 검색표를 찾아봐요.';
            return true;
          },
          explain: '종자를 먼저 물으면 모든 식물이 <b>2번 질문</b>으로 문을 찾아요. 질문 순서가 달라도 4개 문은 정확히 나뉘지만 경로의 길이는 달라져요. 반면 <b>키가 크다 / 작다</b>는 같은 문의 식물을 갈라놓아서 분류 기준이 될 수 없어요.',
        },
      ],
    },
    {
      title: '4개 문의 특징', short: '문의 특징', icon: '💡', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 검색표로 식물을 4개의 문으로 나눴어요. 이제 각 문의 <b>번식 구조와 형질</b>을 표로 정리하고, 겉씨식물과 속씨식물의 차이를 단면으로 확인해요.</div>' +
        '<p>표의 칸을 눌러 <b>번식 구조(포자 / 종자)</b>와 관다발 · 종자 · 씨방의 유무를 채우면, 새 형질이 쌓이는 순서가 나타나요.</p>',
      features: ['tbl', 'sec'],
      setup() { resetTbl(); setMode('tbl'); },
      recap: '식물은 관다발 → 종자 → 씨방(꽃) 순서로 새 형질이 더해져 왔고, 겉씨식물은 밑씨가 드러나 있고 속씨식물은 씨방이 밑씨를 싸고 있어요.',
      summary: '<table class="mini"><tr><th>문</th><th>번식 구조</th><th>관다발</th><th>종자</th><th>씨방</th></tr><tr><td>선태식물</td><td>포자</td><td>X</td><td>X</td><td>X</td></tr><tr><td>양치식물</td><td>포자</td><td>O</td><td>X</td><td>X</td></tr><tr><td>겉씨식물</td><td>종자</td><td>O</td><td>O</td><td>X</td></tr><tr><td>속씨식물</td><td>종자</td><td>O</td><td>O</td><td>O</td></tr></table><ul><li>겉씨식물: 밑씨가 겉에 드러나 있고 <b>솔방울은 열매가 아니에요</b>.</li><li>속씨식물: 씨방이 밑씨를 싸고 있다가 <b>열매</b>가 돼요(종자는 열매 속).</li></ul>',
      missions: [
        {
          title: '4개 문의 비교표 채우기', goal: '표의 칸을 눌러 4개 문의 번식 구조와 관다발 · 종자 · 씨방 유무를 채워요. 다 채우고 확인해요.', manual: true,
          hint: '앞에서 만든 8종 체크리스트를 문별로 묶어 보세요. 포자로 번식하는 식물은 종자를 만들지 않아요.',
          setup() { setMode('tbl'); },
          check() {
            const B = S.tbl, miss = 16 - tblFilled();
            B.bad.forEach((r) => r.fill(false));
            if (miss) return '아직 비어 있는 칸이 ' + miss + '개 있어요.';
            let n = 0; B.v.forEach((r, i) => r.forEach((x, c) => { if (x !== TANS[i][c]) { B.bad[i][c] = true; n++; } }));
            if (n) return '빨간 칸 ' + n + '개를 다시 살펴봐요. 형질은 관다발 → 종자 → 씨방 순서로 쌓여요.';
            return true;
          },
          explain: '선태식물과 양치식물은 <b>포자</b>로, 겉씨식물과 속씨식물은 <b>종자</b>로 번식해요. 관다발은 양치식물부터, 종자는 겉씨식물부터, 씨방은 속씨식물에서 새로 생긴 형질이에요.',
        },
        {
          type: 'quiz', title: '솔방울은 열매일까?', goal: '단면을 보며 생각해 봐요. 소나무의 솔방울에 대한 설명으로 옳은 것은?',
          setup() { setMode('sec'); },
          choices: ['열매이다. 씨(종자)가 들어 있기 때문이다', '열매가 아니다. 씨방이 없고 밑씨가 비늘 위에 드러나 있다', '열매이다. 소나무도 꽃이 피는 속씨식물이기 때문이다', '열매가 아니다. 소나무는 포자로 번식하기 때문이다'],
          answer: 1,
          feedback: ['열매는 씨방이 자란 것이에요. 씨가 들어 있다고 모두 열매는 아니에요.', '', '소나무는 속씨식물이 아니라 겉씨식물이에요. 씨방이 없어요.', '소나무는 종자로 번식해요. 포자로 번식하는 것은 선태·양치식물이에요.'],
          explain: '열매는 <b>씨방이 자란 것</b>이에요. 소나무에는 씨방이 없어 밑씨가 솔방울 비늘 위에 그대로 드러난 채 종자가 돼요. 속씨식물은 씨방이 밑씨를 싸고 있다가 열매가 되고, 종자는 열매 속에 있어요.',
        },
        {
          type: 'quiz', title: '포자와 종자의 차이는?', goal: '포자와 종자에 대한 설명으로 옳은 것은?',
          setup() { setMode('tbl'); },
          choices: ['포자는 보통 한 개의 세포로 이루어져 있고, 종자는 어린 식물(배)과 양분이 종피에 싸여 있다', '포자는 꽃에서, 종자는 포자낭에서 만든다', '포자가 자라 곧바로 꽃이 핀다', '포자와 종자는 구조가 같고 부르는 이름만 다르다'],
          answer: 0,
          feedback: ['', '꽃은 속씨식물의 번식 기관이고 포자는 포자낭에서 만들어요. 반대로 알고 있어요.', '포자는 발아해 새 식물체로 자라요. 곧바로 꽃이 피지는 않아요.', '포자는 대개 세포 하나이고, 종자는 배와 양분, 종피를 갖춘 더 복잡한 구조예요.'],
          explain: '<b>종자</b>는 어린 식물(배)과 저장 양분이 단단한 종피에 싸여 있어 건조한 환경에서도 견디기 쉬워요. 포자는 대개 한 개의 세포로 되어 있고 양분이 거의 없어 <b>습한 곳</b>에서 발아해요.',
        },
      ],
    },
    {
      title: '나만의 식물도감', short: '식물도감', icon: '📖', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 4개 문의 특징을 정리했어요. 이제 가상 정원의 식물 8종으로 <b>식물도감</b>을 만들고, 모둠의 도감과 비교해요.</div>' +
        '<p>식물마다 <b>서식지, 소속 문, 근거 형질 2개</b>를 골라 도감 카드를 저장해요. 모두 저장하면 문별로 정리된 도감이 나타나요. (정원은 가상이며 사진이나 위치 정보는 사용하지 않아요.)</p>',
      features: ['book', 'group'],
      setup() { resetBook(); refreshHab(); setMode('book'); },
      recap: '식물도감은 크기나 색이 아니라 관다발 · 종자 · 씨방 같은 형질을 근거로 문을 정해 정리해요.',
      summary: '<ul><li>도감 카드: <b>이름 · 서식지 · 소속 문 · 근거 형질</b></li><li>근거 형질은 문을 가를 수 있는 형질(관다발 · 종자 · 씨방)이어야 해요. 키와 잎 색은 문을 나누는 기준이 아니에요.</li><li>벼처럼 꽃이 작아 눈에 잘 띄지 않아도 <b>씨방이 있으면 속씨식물</b>이에요.</li></ul>',
      missions: [
        {
          title: '식물도감 카드 8장 만들기', goal: '식물마다 서식지, 소속 문, 근거 형질 2개를 골라 저장해요. 8장을 모두 저장해요.',
          check: () => savedN() === NP, hold: 0.5,
          status: () => '📖 저장한 카드 ' + savedN() + ' / 8 · ' + S.book.cards.map((c, i) => mark(c.saved) + PL[i].n).join(' '),
          hint: '근거 형질은 문을 가르는 형질을 골라요. 예를 들어 고사리는 "관다발이 있다"와 "종자 없이 포자로 번식한다"가 결정적이에요.',
          setup() { setMode('book'); },
          explain: '문을 정하는 <b>근거 형질</b>은 검색표의 질문과 같아요. 선태식물은 관다발이 없고, 양치식물은 관다발이 있으나 종자가 없고, 겉씨식물은 종자가 있으나 씨방이 없고, 속씨식물은 씨방이 있어요.',
        },
        {
          title: '모둠 도감의 잘못 찾기', goal: '모둠의 도감에서 잘못 분류된 카드를 찾아, 알맞은 문으로 옮긴 뒤 확인해요.', manual: true,
          hint: '카드를 눌러 모둠원이 적은 근거를 읽고, 내 도감의 체크리스트와 비교해 보세요.',
          setup() { setMode('group'); },
          check() {
            const G2 = S.grp, bad = G2.ph.map((p, i) => (p === PL[i].ph ? -1 : i)).filter((i) => i >= 0);
            if (!G2.tapped) return '먼저 카드를 눌러 모둠원이 적은 근거를 읽어 보세요.';
            if (bad.length) return '아직 잘못 놓인 카드가 ' + bad.length + '장 있어요. 근거 형질이 알맞은 문의 특징과 맞는지 살펴보세요.';
            if (G2.moves === 0) return '모둠 도감에 잘못된 카드가 있어요. 카드를 옮겨 바로잡아 주세요.';
            return true;
          },
          explain: '벼는 꽃이 작고 눈에 잘 띄지 않아서 겉씨식물로 잘못 분류하기 쉬워요. 하지만 벼의 작은 꽃에는 <b>씨방</b>이 있고 씨방이 열매(낟알)가 되므로 <b>속씨식물</b>이에요. 눈에 띄는 모습이 아니라 형질로 판단해야 해요.',
        },
        {
          type: 'quiz', title: '식물 분류의 공통 기준은?', goal: '식물을 문 수준에서 나누는 기준으로 가장 알맞은 것은?',
          setup() { setMode('book'); },
          choices: ['키가 큰지 작은지', '사는 곳이 물가인지 산인지', '관다발 · 종자 · 씨방 같은 형질의 유무', '잎이 초록색인지 아닌지'],
          answer: 2,
          feedback: ['키는 같은 문 안에서도 크게 달라요. 소나무와 민들레는 키가 달라도 서로 다른 문이고, 민들레와 벼는 키가 달라도 같은 문이에요.', '사는 곳은 환경에 따라 달라지는 특성이라 분류 기준으로 쓰기 어려워요.', '', '대부분의 식물은 잎이 초록색이라서 문을 나누지 못해요.'],
          explain: '모든 식물에 적용할 수 있고 뚜렷하게 구별되는 <b>형질의 유무</b>가 분류 기준이 돼요. 관다발 → 종자 → 씨방은 식물이 진화하며 차례로 생긴 형질이라 계통수를 그릴 때도 쓰여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-plant-phyla', mount: '#game', badge: '식물도감 작가', homeHref: '../../index.html#hb',
    featureLabels: { garden: '🌿 가상 정원 · 확대경', chk: '📋 형질 체크리스트', key: '🔑 이분 검색표', korder: '🔀 검색표 질문 순서 비교', tbl: '📋 4개 문 비교표', sec: '🔬 겉씨 · 속씨 단면', book: '📖 도감 카드 쓰기 · 갤러리', group: '👥 모둠 도감 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetGarden(); resetKey(); resetKo(); resetTbl(); resetBook(); refreshHab();
  selectPlant(0);
  setMode('garden');
  let lastFree = false, lastMode = '', lastLv = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && (game.free !== lastFree || game.level !== lastLv)) { lastFree = game.free; lastLv = game.level; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    switch (S.mode) {
      case 'garden': drawGarden(dt, t); break;
      case 'key': drawKey(dt, t); break;
      case 'korder': drawKorder(dt, t); break;
      case 'tbl': drawTbl(dt, t); break;
      case 'sec': drawSec(dt, t); break;
      case 'book': drawBook(dt, t); break;
      default: drawGroup(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(240,247,236,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, PL, PH, TR, KG, KEVAL, KOPT, EVID, TANS, REQ, HAB_OPTS, selectPlant, setChk, pickPlant, keyAnswer, saveCard, cardCheck, grpMove, grpTarget, tabRect, tbCell, chkRect, plantX, G, TP, BK, setKo, galPos,
    fillChk() { PL.forEach((p, i) => TR.forEach((tr, k) => { S.gd.chk[i][k] = p[tr.k]; })); S.gd.bad.forEach((r) => r.fill(false)); updateCtl(); },
  };
})();
