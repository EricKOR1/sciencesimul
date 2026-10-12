/* =========================================================
   중3 Ⅴ. 자극과 반응 — 호르몬과 항상성 [9과20-03]
   ① [관찰] 호르몬: 내분비샘(뇌하수체·갑상샘·이자)에서 혈액으로 분비, 신경과 비교
   ② [실험] 혈당량 조절: 인슐린·글루카곤으로 70~110 mg/dL 유지
   ③ [설명] 체온 조절: 신경(혈관·떨림·땀) + 호르몬(티록신)
   ④ [분석] 호르몬과 질병: 결핍·과다, 예시 자료 해석
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const now = () => performance.now() / 1000;
  const rgba = SciSim.color.rgba, shade = SciSim.color.shade, mix = SciSim.color.mix;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const W = 800, H = 600, BG = '#eef4ef';
  const approach = SciSim.approach;
  let view = null, ctx = null, D = null;

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

  /* ---------- 그리기 도우미 ---------- */
  const font = (size, weight) => (weight || 700) + ' ' + size + 'px ' + FONT;
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(s, x, y, o) {
    o = o || {};
    let size = o.size || 14;
    ctx.font = font(size, o.weight);
    if (o.max) { while (size > (o.min || 11) && ctx.measureText(s).width > o.max) { size -= 0.5; ctx.font = font(size, o.weight); } }
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || 4; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#1b2333';
    ctx.fillText(s, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  function pill(s, x, y, o) {
    o = o || {};
    const size = o.size || 14, pad = o.pad != null ? o.pad : 10, h = o.h || size + 12;
    ctx.font = font(size, o.weight || 800);
    const w = ctx.measureText(s).width + pad * 2;
    let lx = x - w / 2;
    if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - w;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.shadow) { ctx.shadowColor = 'rgba(20,40,30,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    rr(lx, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || '#1b2333'; ctx.fill();
    ctx.restore();
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.border) { rr(lx, y - h / 2, w, h, h / 2); ctx.strokeStyle = o.border; ctx.lineWidth = o.borderW || 2; ctx.stroke(); }
    txt(s, lx + w / 2, y + 1, { size, weight: o.weight || 800, color: o.color || '#fff', align: 'center', base: 'middle' });
    ctx.restore();
    return { x: lx, y: y - h / 2, w, h };
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = 'rgba(30,60,40,.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, o.r != null ? o.r : 16); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(x, y, w, h, o.r != null ? o.r : 16); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
  }
  function lgrad(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function rgrad(x0, y0, r0, x1, y1, r1, stops) { const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function smooth(c, pts, closed) {
    const n = pts.length;
    c.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % n];
      const p0 = closed || i > 0 ? pts[(i - 1 + n) % n] : p1;
      const p3 = closed || i < n - 2 ? pts[(i + 2) % n] : p2;
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) c.closePath();
  }
  function bead(x, y, r, color, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.shadowColor = 'rgba(20,30,40,.25)'; ctx.shadowBlur = o.noShadow ? 0 : r * 0.6; ctx.shadowOffsetY = o.noShadow ? 0 : r * 0.2;
    ctx.fillStyle = rgrad(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r, [[0, shade(color, 0.6)], [0.55, color], [1, shade(color, -0.28)]]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function ring(x, y, r, color, t) {
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save(); ctx.strokeStyle = rgba(color || '#16a34a', 0.35 + a * 0.5); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r + a * 3, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function checkMark(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.lineTo(x - s * 0.1, y + s * 0.38); ctx.lineTo(x + s * 0.5, y - s * 0.35); ctx.stroke();
    ctx.restore();
  }
  const PFX = new SciSim.Particles();
  function burst(x, y, colors, n, o) { PFX.burst(x, y, Object.assign({ count: n || 18, colors: colors || ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], speed: 150, gravity: 120, size: 4 }, o || {})); }
  const shk = (v, t) => (v > 0.01 && !RM ? Math.sin(t * 60) * 7 * v : 0);
  const mark = (ok) => (ok ? '✅' : '⬜');

  /* 화면 안내 말풍선 */
  const HINT = { msg: '', t0: 0, tEnd: 0 };
  function showHint(msg, ms) { HINT.msg = msg; HINT.t0 = now(); HINT.tEnd = now() + (ms || 6000) / 1000; }
  function hideHint() { if (HINT.msg && HINT.tEnd > now()) HINT.tEnd = now(); }
  function drawHint() {
    if (!HINT.msg) return;
    const t = now();
    const a = Math.min(clamp((t - HINT.t0) / 0.35, 0, 1), clamp(1 - (t - HINT.tEnd) / 0.4, 0, 1));
    if (a <= 0.01) { if (t > HINT.tEnd + 0.5) HINT.msg = ''; return; }
    pill(HINT.msg, W / 2, H - 22 + (1 - a) * 12, { size: 15, bg: 'rgba(27,35,51,.92)', alpha: a, h: 32, pad: 14, shadow: true });
  }

  /* 줄 바꿈(띄어쓰기 기준) */
  function wrapLines(s, maxW, size, weight) {
    ctx.font = font(size, weight || 700);
    const out = []; let cur = '';
    const w = (q) => ctx.measureText(q).width;
    s.split(' ').forEach((tok) => {
      const test = cur ? cur + ' ' + tok : tok;
      if (w(test) <= maxW) { cur = test; return; }
      if (cur) { out.push(cur); cur = ''; }
      if (w(tok) <= maxW) { cur = tok; return; }
      for (const ch of tok) { if (w(cur + ch) > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
    });
    if (cur) out.push(cur);
    return out;
  }
  function para(s, x, y, maxW, size, lh, o) {
    o = o || {};
    const lines = wrapLines(s, maxW, size, o.weight);
    lines.forEach((l, i) => txt(l, x, y + i * lh, Object.assign({ size }, o)));
    return lines.length;
  }

  /* 곡선 경로(Catmull-Rom 표본) + 길이 따라 위치 구하기 */
  function PathM(keys, per, closed) {
    per = per || 12;
    const n = keys.length, pts = [], segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = closed ? keys[(i - 1 + n) % n] : keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[(i + 1) % n], p3 = closed ? keys[(i + 2) % n] : keys[Math.min(n - 1, i + 2)];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        pts.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    const last = closed ? keys[0] : keys[n - 1];
    pts.push([last[0], last[1]]);
    this.pts = pts; this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.len = this.cum[this.cum.length - 1]; this.per = per;
  }
  PathM.prototype.at = function (s) {
    s = clamp(s, 0, this.len);
    const c = this.cum; let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    const seg = c[hi] - c[lo] || 1, f = (s - c[lo]) / seg, a = this.pts[lo], b = this.pts[hi];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
  PathM.prototype.trace = function (s0, s1) {   // ctx 경로를 s0~s1 구간으로 만듦
    s0 = clamp(s0, 0, this.len); s1 = clamp(s1, 0, this.len);
    const p = this.at(s0); ctx.moveTo(p.x, p.y);
    for (let i = 0; i < this.pts.length; i++) { if (this.cum[i] > s0 && this.cum[i] < s1) ctx.lineTo(this.pts[i][0], this.pts[i][1]); }
    const q = this.at(s1); ctx.lineTo(q.x, q.y);
  };
  /* 빛나는 신호(꼬리 + 머리) */
  function drawPulse(path, s, o) {
    o = o || {};
    const col = o.color || '#7cf0ff', trail = o.trail || 110, w = o.w || 7, a0 = o.alpha != null ? o.alpha : 1;
    const N = 9, s0 = Math.max(0, s - trail);
    ctx.save();
    if (o.add) ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < N; i++) {
      const a = s0 + (s - s0) * i / N, b = s0 + (s - s0) * (i + 1) / N, k = (i + 1) / N;
      ctx.strokeStyle = rgba(col, 0.75 * k * a0); ctx.lineWidth = w * (0.35 + 0.65 * k);
      ctx.beginPath(); path.trace(a, b); ctx.stroke();
    }
    const p = path.at(s);
    D.glow(p.x, p.y, (o.r || 24), col, 0.85 * a0);
    ctx.fillStyle = rgba('#ffffff', 0.95 * a0); ctx.beginPath(); ctx.arc(p.x, p.y, w * 0.55, 0, TAU); ctx.fill();
    ctx.restore();
    return p;
  }
  const ptInPoly = (px, py, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const drawBody = {}; // placeholder

  /* =====================================================
     공통: 몸 실루엣
     ===================================================== */
  const S = { scene: 'glands' };
  function limb(x, y, w, h, ang, c1, c2) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = lgrad(0, 0, w, 0, [[0, c1], [1, c2]]); rr(-w / 2, 0, w, h, w / 2); ctx.fill();
    ctx.restore();
  }
  /* 머리 중심을 (ox, oy)로, 배율 k로 그리는 몸 */
  function drawSil(ox, oy, k, o) {
    o = o || {};
    const c1 = o.c1 || '#e9eff9', c2 = o.c2 || '#cbd8ec';
    ctx.save(); ctx.translate(ox, oy); ctx.scale(k, k);
    ctx.shadowColor = 'rgba(40,60,100,.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    limb(-54, 252, 50, 262, 0.02, c1, c2); limb(54, 252, 50, 262, -0.02, c1, c2);
    limb(-66, 72, 30, 176, 0.17, c1, c2); limb(66, 72, 30, 176, -0.17, c1, c2);
    ctx.fillStyle = lgrad(-62, 0, 62, 0, [[0, c1], [1, c2]]); rr(-62, 56, 124, 200, 34); ctx.fill();
    rr(-12, 36, 24, 30, 8); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function starShape(x, y, R, r, n, rot) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const rad = i % 2 ? r : R, a = i / (n * 2) * TAU + rot; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath();
  }
  const HCOL = { gh: '#ff8a3d', thy: '#8b5cf6', ins: '#2f7de1', glu: '#f0b400' };
  function hormoneShape(type, x, y, r, t, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    D.glow(x, y, r * 2.4, HCOL[type], 0.4);
    ctx.fillStyle = HCOL[type]; ctx.strokeStyle = shade(HCOL[type], -0.35); ctx.lineWidth = 1.5;
    if (type === 'gh') { starShape(x, y, r * 1.25, r * 0.55, 5, t * 2); ctx.fill(); ctx.stroke(); }
    else if (type === 'thy') { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a2 = t * 1.5 + i * TAU / 3; ctx.lineTo(x + Math.cos(a2) * r * 1.2, y + Math.sin(a2) * r * 1.2); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (type === 'glu') { ctx.beginPath(); ctx.moveTo(x, y - r * 1.25); ctx.lineTo(x + r * 1.05, y); ctx.lineTo(x, y + r * 1.25); ctx.lineTo(x - r * 1.05, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  /* =====================================================
     장면 1 · 내분비샘과 호르몬 (몸 실루엣 + 혈관) / 신경 vs 호르몬
     ===================================================== */
  const BODY = { ox: 232, oy: 74, k: 0.9 };
  const bp = (rx, ry) => [BODY.ox + rx * BODY.k, BODY.oy + ry * BODY.k];
  const LOOP_REL = [[0, 420], [-30, 404], [-40, 340], [-50, 260], [-56, 180], [-54, 100], [-40, 36], [-22, -22], [0, -36], [22, -22], [40, 36], [54, 100], [56, 180], [50, 260], [40, 340], [30, 404]];
  const LOOP = new PathM(LOOP_REL.map((p) => bp(p[0], p[1])), 12, true);
  const keyS = (f) => { const i = Math.floor(f), fr = f - i; const a = LOOP.cum[i * 12], b = LOOP.cum[Math.min((i + 1) * 12, LOOP.cum.length - 1)]; return a + (b - a) * fr; };
  const GLAND = {
    pit: { name: '뇌하수체', pos: bp(0, 8), hit: 34, hormones: ['gh'], entry: keyS(7), col: '#ff8a3d', label: [bp(0, 0)[0] + 112, bp(0, -4)[1]] },
    thy: { name: '갑상샘', pos: bp(0, 62), hit: 30, hormones: ['thy'], entry: keyS(6), col: '#8b5cf6', label: [bp(0, 0)[0] + 112, bp(0, 62)[1]] },
    pan: { name: '이자', pos: bp(2, 168), hit: 34, hormones: ['ins', 'glu'], entry: keyS(4), col: '#d9a400', label: [bp(0, 0)[0] + 112, bp(0, 168)[1]] },
  };
  const TARGET = {
    gh: { id: 'bones', name: '뼈·근육', pos: bp(14, 340), exit: keyS(14.2) },
    thy: { id: 'cells', name: '온몸의 세포', pos: bp(14, 226), exit: keyS(12.5) },
    ins: { id: 'liver', name: '간·세포', pos: bp(-30, 120), exit: keyS(5.3) },
    glu: { id: 'liver', name: '간', pos: bp(-30, 120), exit: keyS(5.3) },
  };
  const H_INFO = {
    pit: { title: '뇌하수체 → 성장 호르몬', body: '뼈와 근육의 생장을 촉진해서 키가 자라게 해요.', target: '표적 기관: 뼈·근육', odd: '성장기에 너무 많으면 거인증, 부족하면 소인증' },
    thy: { title: '갑상샘 → 티록신', body: '세포 호흡을 촉진해서 몸에서 열이 나게 하고 체온을 유지해요.', target: '표적 기관: 온몸의 세포', odd: '너무 많으면 갑상샘 기능 항진증, 부족하면 저하증' },
    pan: { title: '이자 → 인슐린 · 글루카곤', body: '인슐린은 혈당량을 낮추고, 글루카곤은 혈당량을 높여요.', target: '표적 기관: 간·세포', odd: '인슐린이 부족하거나 작용하지 못하면 당뇨병' },
  };
  const GN = { view: 'body', sel: null, seen: new Set(), flow: 0, hp: [], mglow: {}, gsel: { pit: 0, thy: 0, pan: 0 }, sent: { n: 0, h: 0 },
    rbc: Array.from({ length: 34 }, (_, i) => i / 34 * LOOP.len) };
  const CP = { t: -9, nS: 0, hS: 0, nDone: false, hDone: false, auto: 2.5, flex: new SciSim.Spring(0, { stiffness: 200, damping: 11 }), orgGlow: 0, hp: [] };

  function release(id) {
    const g = GLAND[id];
    if (GN.hp.length > 22) return false;
    let delay = 0;
    g.hormones.forEach((type) => {
      const tg = TARGET[type];
      const dist = ((tg.exit - g.entry) % LOOP.len + LOOP.len) % LOOP.len;
      for (let i = 0; i < 4; i++) {
        const pass = i === 3;
        GN.hp.push({ type, st: 'gland', delay: delay + i * 0.2, u: 0, x: g.pos[0], y: g.pos[1], x0: g.pos[0], y0: g.pos[1], entry: g.entry, s: g.entry, trav: 0, dist: pass ? 520 : dist, pass, t: Math.random() * 6, fade: 1, id });
      }
      delay += 0.15;
    });
    Sound.tick();
    return true;
  }
  function updateGlands(dt) {
    GN.flow += dt * 75;
    Object.keys(GLAND).forEach((k) => { GN.gsel[k] = approach(GN.gsel[k], GN.sel === k ? 1 : 0, dt, 9); });
    Object.keys(GN.mglow).forEach((k) => { GN.mglow[k] = approach(GN.mglow[k], 0, dt, 2.2); });
    GN.hp.forEach((p) => {
      if (p.delay > 0) { p.delay -= dt; return; }
      p.t += dt;
      if (p.st === 'gland') {
        p.u = Math.min(1, p.u + dt / 0.55);
        const q = LOOP.at(p.entry), e = SciSim.ease.inOutQuad(p.u);
        p.x = lerp(p.x0, q.x, e); p.y = lerp(p.y0, q.y, e);
        if (p.u >= 1) { p.st = 'flow'; p.u = 0; }
      } else if (p.st === 'flow') {
        const v = 95 * dt; p.trav += v; p.s += v;
        const q = LOOP.at(p.s % LOOP.len); p.x = q.x; p.y = q.y;
        if (!p.pass && p.trav >= p.dist) { p.st = 'branch'; p.u = 0; p.x0 = p.x; p.y0 = p.y; }
        if (p.pass && p.trav >= p.dist) p.st = 'fade';
      } else if (p.st === 'branch') {
        p.u = Math.min(1, p.u + dt / 0.55);
        const tg = TARGET[p.type], e = SciSim.ease.outCubic(p.u);
        p.x = lerp(p.x0, tg.pos[0], e); p.y = lerp(p.y0, tg.pos[1], e);
        if (p.u >= 1) { p.st = 'dock'; p.u = 0; GN.mglow[tg.id] = 1; burst(tg.pos[0], tg.pos[1], [HCOL[p.type], '#fff'], 7, { speed: 60, gravity: 0, size: 2.6, life: 0.7 }); }
      } else if (p.st === 'dock') {
        p.u += dt / 0.7; p.fade = 1 - p.u; if (p.u >= 1) p.dead = true;
      } else if (p.st === 'fade') { p.fade -= dt * 1.2; if (p.fade <= 0) p.dead = true; }
    });
    GN.hp = GN.hp.filter((p) => !p.dead);
  }
  function drawVesselLoop(t, w) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#c93b52'; ctx.lineWidth = w + 5; ctx.beginPath(); LOOP.trace(0, LOOP.len); ctx.stroke();
    ctx.strokeStyle = '#ff9aa8'; ctx.lineWidth = w; ctx.beginPath(); LOOP.trace(0, LOOP.len); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); LOOP.trace(0, LOOP.len); ctx.stroke();
    ctx.restore();
    GN.rbc.forEach((s0, i) => {
      const q = LOOP.at((s0 + GN.flow) % LOOP.len);
      ctx.fillStyle = '#c8283f'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 4.4, 3.4, q.a, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(q.x - 1, q.y - 1, 1.1, 0, TAU); ctx.fill();
    });
  }
  function drawOrgans(t) {
    // 뼈 (다리), 간, 이자, 세포
    const g = (id) => GN.mglow[id] || 0;
    ctx.save();
    [-1, 1].forEach((sg) => {
      const [bx, by] = bp(sg * 26, 300), [bx2, by2] = bp(sg * 26, 430);
      ctx.strokeStyle = '#f7f1e3'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx2, by2); ctx.stroke();
      ctx.strokeStyle = '#d9cfb8'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#f7f1e3'; [[bx, by], [bx2, by2]].forEach((q) => { ctx.beginPath(); ctx.arc(q[0] - 5, q[1], 7, 0, TAU); ctx.arc(q[0] + 5, q[1], 7, 0, TAU); ctx.fill(); });
    });
    const tb = TARGET.gh.pos; if (g('bones') > 0.02) D.glow(tb[0] - 12, tb[1] + 8, 54, '#ff8a3d', 0.7 * g('bones'));
    // 간
    const lv = TARGET.ins.pos;
    if (g('liver') > 0.02) D.glow(lv[0], lv[1], 50, '#2f7de1', 0.6 * g('liver'));
    ctx.fillStyle = lgrad(0, lv[1] - 18, 0, lv[1] + 18, [[0, '#c0714a'], [1, '#8f4a2c']]);
    ctx.beginPath(); ctx.ellipse(lv[0], lv[1], 27, 17, -0.15, 0, TAU); ctx.fill();
    txt('간', lv[0], lv[1] + 1, { size: 14, weight: 800, color: '#fff', align: 'center', base: 'middle' });
    // 이자
    const pn = GLAND.pan.pos;
    ctx.fillStyle = lgrad(0, pn[1] - 10, 0, pn[1] + 10, [[0, '#f4d35e'], [1, '#d9a400']]);
    ctx.beginPath(); ctx.ellipse(pn[0], pn[1], 32, 9, 0.08, 0, TAU); ctx.fill();
    // 세포 무리
    const cl = TARGET.thy.pos;
    if (g('cells') > 0.02) D.glow(cl[0], cl[1], 48, '#8b5cf6', 0.6 * g('cells'));
    [[0, 0, 11], [-13, 9, 9], [13, 10, 9], [3, 18, 8]].forEach((q) => bead(cl[0] + q[0], cl[1] + q[1], q[2], '#f6c6a0', { noShadow: true }));
    ctx.restore();
    // 목표 이름표
    pill('뼈·근육', TARGET.gh.pos[0] + 58, TARGET.gh.pos[1] + 24, { bg: '#64748b', size: 13, h: 24, alpha: 0.92 });
    pill('온몸의 세포', TARGET.thy.pos[0] + 66, TARGET.thy.pos[1] + 10, { bg: '#64748b', size: 13, h: 24, alpha: 0.92 });
  }
  function drawGlandsBody(t) {
    panel(14, 14, 456, 576, { r: 18, bg: '#fbfdff' });
    drawSil(BODY.ox, BODY.oy, BODY.k);
    // 뇌
    const hb = bp(0, -6);
    ctx.fillStyle = rgba('#f4a6b8', 0.9); ctx.beginPath(); ctx.ellipse(hb[0], hb[1], 34, 25, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(150,40,80,.3)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hb[0] - 22, hb[1] - 4); ctx.quadraticCurveTo(hb[0] - 8, hb[1] - 18, hb[0] + 6, hb[1] - 6); ctx.moveTo(hb[0] + 2, hb[1] + 6); ctx.quadraticCurveTo(hb[0] + 18, hb[1] - 6, hb[0] + 28, hb[1] + 2); ctx.stroke();
    drawOrgans(t);
    drawVesselLoop(t, 11);
    // 갑상샘 (나비 모양)
    const th = GLAND.thy.pos;
    ctx.save(); ctx.translate(th[0], th[1]);
    ctx.fillStyle = lgrad(0, -10, 0, 12, [[0, '#b99cf7'], [1, '#7c4fe0']]);
    [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.ellipse(sg * 11, 0, 9, 13, sg * 0.35, 0, TAU); ctx.fill(); });
    ctx.fillRect(-4, -4, 8, 10);
    ctx.restore();
    // 뇌하수체 (작은 콩)
    const pt = GLAND.pit.pos;
    ctx.fillStyle = lgrad(0, pt[1] - 6, 0, pt[1] + 6, [[0, '#ffb27a'], [1, '#f26b1d']]);
    ctx.beginPath(); ctx.ellipse(pt[0], pt[1], 8, 6.5, 0, 0, TAU); ctx.fill();
    // 선택 표시 + 이름표
    Object.keys(GLAND).forEach((k) => {
      const g = GLAND[k], h = GN.gsel[k];
      if (h > 0.02) { D.glow(g.pos[0], g.pos[1], 40, g.col, 0.55 * h); ring(g.pos[0], g.pos[1], 18 + 4 * h, g.col, t); }
      const lb = pill(g.name, g.label[0], g.label[1], { bg: g.col, size: 14.5, h: 28, shadow: true, border: h > 0.5 ? '#fff' : null });
      ctx.save(); ctx.strokeStyle = rgba(g.col, 0.8); ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(lb.x, g.label[1]); ctx.lineTo(g.pos[0] + 24, g.pos[1]); ctx.stroke(); ctx.restore();
      if (GN.seen.has(k)) checkMark(lb.x + lb.w + 10, g.label[1], 9);
    });
    // 호르몬 입자
    GN.hp.forEach((p) => { if (p.delay <= 0) hormoneShape(p.type, p.x, p.y, p.st === 'dock' ? 6 + 4 * (p.u) : 6.5, t + p.t, clamp(p.fade, 0, 1)); });
    txt('🩸 빨간 관은 혈관, 혈액이 온몸을 돌아요', 242, 560, { size: 13.5, weight: 700, color: '#8a93a3', align: 'center' });
    // 오른쪽 설명
    panel(482, 14, 304, 576, { r: 18 });
    const sel = GN.sel && H_INFO[GN.sel];
    pill('🩸 호르몬이란?', 634, 42, { bg: '#16a34a', size: 15, h: 30, pad: 14 });
    const base = ['내분비샘에서 만들어 혈액으로 내보내요.', '혈액을 따라 온몸을 돌다가 특정 기관(표적 기관)에 작용해요.', '적은 양으로 큰 효과를 내요.'];
    let yb = 84;
    base.forEach((b) => { bead(500, yb - 5, 4, '#16a34a', { noShadow: true }); yb += para(b, 512, yb, 262, 15, 19, { weight: 700, color: '#2b3445' }) * 19 + 9; });
    ctx.fillStyle = '#e3e8f0'; ctx.fillRect(498, yb, 272, 1.5);
    const y0 = yb + 34;
    if (sel) {
      const g = GLAND[GN.sel];
      pill(sel.title, 634, y0, { bg: g.col, size: 15.5, h: 32, pad: 14 });
      let y = y0 + 42;
      y += para(sel.body, 498, y, 272, 16.5, 24, { weight: 800, color: '#1b2333' }) * 24 + 10;
      y += para(sel.target, 498, y, 272, 15.5, 22, { weight: 800, color: shade(g.col, -0.25) }) * 22 + 8;
      para('⚠ ' + sel.odd, 498, y, 272, 14.5, 21, { weight: 700, color: '#8a5a1c' });
      // 호르몬 모양 범례
      let ly = 500;
      g.hormones.forEach((h, i) => { hormoneShape(h, 520, ly + i * 32, 8, t, 1); txt({ gh: '성장 호르몬', thy: '티록신', ins: '인슐린', glu: '글루카곤' }[h], 540, ly + i * 32 + 1, { size: 15, weight: 800, color: '#2b3445', base: 'middle' }); });
      txt('내보내기를 누르면 또 보여 줘요', 634, 568, { size: 12.5, weight: 700, color: '#8a93a3', align: 'center' });
    } else {
      para('내분비샘을 눌러 보세요. 뇌하수체 · 갑상샘 · 이자', 498, y0, 272, 17, 25, { weight: 800, color: '#2b3445' });
      para('살펴본 곳: ' + GN.seen.size + ' / 3', 498, y0 + 56, 272, 16, 24, { weight: 700, color: '#5d6879' });
      const tg = [['gh', '성장 호르몬'], ['thy', '티록신'], ['ins', '인슐린'], ['glu', '글루카곤']];
      tg.forEach((q, i) => { hormoneShape(q[0], 520, 420 + i * 34, 8, t, 1); txt(q[1], 542, 421 + i * 34, { size: 15, weight: 800, color: '#2b3445', base: 'middle' }); });
    }
  }

  /* ---- 신경 vs 호르몬 비교 ---- */
  const NERVE_P = new PathM([[130, 150], [220, 160], [320, 142], [430, 158], [530, 146], [610, 150]], 10);
  const BLOOD_P = new PathM([[130, 320], [230, 305], [330, 335], [430, 312], [520, 322], [590, 320]], 10);
  const ORG = [[690, 262], [696, 320], [690, 378]];
  function sendBoth() {
    if (CP.t >= 0 && CP.t < 5.2) return false;
    CP.t = 0; CP.nDone = false; CP.hDone = false; CP.hp = [];
    for (let i = 0; i < 9; i++) CP.hp.push({ k: Math.floor(i / 3), s: -i * 24, x: 0, y: 0 });
    Sound.tick();
    return true;
  }
  function updateCompare(dt) {
    CP.flex.update(dt);
    CP.orgGlow = approach(CP.orgGlow, 0, dt, 1.6);
    if (CP.t >= 0) {
      CP.t += dt;
      const nsp = 1700, ns = CP.t * nsp;
      if (!CP.nDone && ns >= NERVE_P.len + 70) { CP.nDone = true; GN.sent.n++; CP.flex.velocity = 0; CP.flex.value = 1; CP.flex.target = 0; burst(700, 150, ['#ffd166', '#fff'], 14, { speed: 110, gravity: 0, size: 3.5 }); Sound.success(); }
      const hs = CP.t * 120;
      CP.hp.forEach((p) => { p.cs = hs + p.s; });
      const done = CP.hp.every((p) => p.cs >= BLOOD_P.len + 90);
      if (!CP.hDone && done) { CP.hDone = true; GN.sent.h++; CP.orgGlow = 1; burst(ORG[1][0], ORG[1][1], ['#8b5cf6', '#fff'], 14, { speed: 90, gravity: 0, size: 3.2 }); Sound.success(); }
      if (CP.t > 7.5) CP.t = -9;
    } else { CP.auto -= dt; }
    if (CP.t < 0 && S.scene === 'glands' && GN.view === 'compare' && CP.auto < -3) { CP.auto = 0; sendBoth(); }
  }
  function drawCompare(t) {
    panel(14, 14, 772, 576, { r: 18, bg: '#fbfdff' });
    const nsp = 1700, ns = CP.t >= 0 ? CP.t * nsp : -1, hs = CP.t >= 0 ? CP.t * 120 : -1;
    // 신경 줄
    pill('⚡ 신경', 80, 66, { bg: '#e8a100', size: 17, h: 32, pad: 16 });
    pill('빠르게 · 좁은 범위로 · 짧게', 300, 66, { bg: '#fff3cf', color: '#7a5600', size: 15, h: 28, pad: 14, border: '#e8a100' });
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(232,161,0,.25)'; ctx.lineWidth = 16; ctx.beginPath(); NERVE_P.trace(0, NERVE_P.len); ctx.stroke();
    ctx.strokeStyle = '#e8a100'; ctx.lineWidth = 7; ctx.beginPath(); NERVE_P.trace(0, NERVE_P.len); ctx.stroke();
    for (let s = 24; s < NERVE_P.len - 30; s += 56) { const q = NERVE_P.at(s + 22); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.fillStyle = '#fff3c4'; rr(-20, -9, 40, 18, 9); ctx.fill(); ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
    ctx.restore();
    // 뇌 아이콘
    ctx.fillStyle = rgrad(72, 140, 4, 80, 150, 36, [[0, '#ffc2d0'], [1, '#e86a8a']]); ctx.beginPath(); ctx.ellipse(80, 150, 40, 32, 0, 0, TAU); ctx.fill();
    txt('뇌', 80, 151, { size: 17, weight: 800, color: '#fff', align: 'center', base: 'middle' });
    // 근육 아이콘
    const fl = CP.flex.value;
    ctx.fillStyle = lgrad(0, 120, 0, 180, [[0, '#ff8a8a'], [1, '#c43c3c']]); ctx.beginPath(); ctx.ellipse(700, 150, 34 * (1 - 0.2 * fl), 28 * (1 + 0.3 * fl), 0, 0, TAU); ctx.fill();
    txt('근육', 700, 151, { size: 16, weight: 800, color: '#fff', align: 'center', base: 'middle' });
    if (ns >= 0 && ns < NERVE_P.len + 80) drawPulse(NERVE_P, Math.min(ns, NERVE_P.len), { color: '#ff9d00', trail: 160, w: 9, r: 28 });
    // 호르몬 줄
    pill('🩸 호르몬', 90, 252, { bg: '#7c4fe0', size: 17, h: 32, pad: 16 });
    pill('느리게 · 넓은 범위로 · 오래', 330, 252, { bg: '#efe8ff', color: '#4b2ca8', size: 15, h: 28, pad: 14, border: '#7c4fe0' });
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#c93b52'; ctx.lineWidth = 21; ctx.beginPath(); BLOOD_P.trace(0, BLOOD_P.len); ctx.stroke();
    ctx.strokeStyle = '#ff9aa8'; ctx.lineWidth = 15; ctx.beginPath(); BLOOD_P.trace(0, BLOOD_P.len); ctx.stroke();
    ORG.forEach((o, i) => { ctx.strokeStyle = '#c93b52'; ctx.lineWidth = 15; ctx.beginPath(); const e = BLOOD_P.at(BLOOD_P.len); ctx.moveTo(e.x, e.y); ctx.quadraticCurveTo((e.x + o[0]) / 2, o[1], o[0] - 28, o[1]); ctx.stroke(); ctx.strokeStyle = '#ff9aa8'; ctx.lineWidth = 9; ctx.stroke(); });
    ctx.restore();
    for (let i = 0; i < 14; i++) { const q = BLOOD_P.at(((i * 41 + t * 60) % BLOOD_P.len)); ctx.fillStyle = '#c8283f'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 4.4, 3.4, q.a, 0, TAU); ctx.fill(); }
    // 내분비샘
    ctx.fillStyle = lgrad(0, 300, 0, 342, [[0, '#b99cf7'], [1, '#7c4fe0']]); ctx.beginPath(); ctx.ellipse(86, 320, 40, 28, 0, 0, TAU); ctx.fill();
    txt('내분비샘', 86, 321, { size: 15, weight: 800, color: '#fff', align: 'center', base: 'middle' });
    // 기관 3개 (가운데만 표적)
    ORG.forEach((o, i) => {
      const tgt = i === 1, gl = tgt ? CP.orgGlow : 0;
      if (gl > 0.02) D.glow(o[0], o[1], 56, '#8b5cf6', 0.65 * gl);
      ctx.fillStyle = tgt ? lgrad(0, o[1] - 24, 0, o[1] + 24, [[0, '#f4a6b8'], [1, '#d9607a']]) : '#d6dce8';
      ctx.beginPath(); ctx.ellipse(o[0], o[1], 28 * (tgt ? 1 + gl * 0.12 : 1), 22 * (tgt ? 1 + gl * 0.12 : 1), 0, 0, TAU); ctx.fill();
      txt(tgt ? '표적 기관' : '기관', o[0], o[1] + 1, { size: tgt ? 13 : 14, weight: 800, color: tgt ? '#fff' : '#7c8799', align: 'center', base: 'middle' });
    });
    CP.hp.forEach((p) => {
      if (p.cs == null || p.cs < 0 || CP.t < 0) return;
      let x, y;
      if (p.cs <= BLOOD_P.len) { const q = BLOOD_P.at(p.cs); x = q.x; y = q.y; }
      else { const e = BLOOD_P.at(BLOOD_P.len), o = ORG[p.k], f = clamp((p.cs - BLOOD_P.len) / 90, 0, 1); x = lerp(e.x, o[0] - 30, f); y = lerp(e.y, o[1], f); }
      hormoneShape('thy', x, y, 6, t + p.s, 1);
    });
    // 비교표
    const rows = [['전달 통로', '뉴런(신경)', '혈액'], ['전달 속도', '빠르다', '느리다'], ['작용 범위', '좁다 (특정 부위)', '넓다 (온몸)'], ['효과 지속', '짧다', '오래 간다']];
    panel(30, 432, 740, 148, { r: 14, bg: '#f6f8fb' });
    txt('⚡ 신경', 380, 456, { size: 15, weight: 800, color: '#b87800', align: 'center' });
    txt('🩸 호르몬', 590, 456, { size: 15, weight: 800, color: '#6b3fd0', align: 'center' });
    rows.forEach((r, i) => {
      const y = 486 + i * 28;
      txt(r[0], 50, y, { size: 15, weight: 800, color: '#5d6879', base: 'middle' });
      pill(r[1], 380, y, { bg: '#fff3cf', color: '#7a5600', size: 14.5, h: 24, pad: 12 });
      pill(r[2], 590, y, { bg: '#efe8ff', color: '#4b2ca8', size: 14.5, h: 24, pad: 12 });
    });
  }
  function glandsDown(p) {
    if (GN.view !== 'body') return false;
    let best = null, bd = 1e9;
    Object.keys(GLAND).forEach((k) => { const g = GLAND[k], d = Math.hypot(p.x - g.pos[0], p.y - g.pos[1]); if (d < g.hit && d < bd) { bd = d; best = k; } });
    // 이름표 눌러도 선택
    if (!best) Object.keys(GLAND).forEach((k) => { const g = GLAND[k]; if (Math.abs(p.x - g.label[0]) < 50 && Math.abs(p.y - g.label[1]) < 18) best = k; });
    if (best) { GN.sel = best; GN.seen.add(best); release(best); Sound.click(); return true; }
    GN.sel = null; return true;
  }

  /* =====================================================
     장면 2 · 혈당량 조절 게임
     ===================================================== */
  const SPEED = 4;                    // 1초 = 4분 (가상 시간)
  const GL = {
    sc: 'none', m: 0, G: 90, dispG: 90, pend: 0, running: false, hist: [], press: [], pI: 0, pG: 0, auto: false, gly: 0.5, insLv: 0, gluLv: 0,
    dots: [], hps: [], endT: 0, adj: 0, emitT: 0, lastPress: 0, maxG: 90, minG: 90, bite: 0, cellGlow: 0, hist_t: 0, done: { meal: false, exercise: false, fast: false },
  };
  const VY = 171, VX0 = 40, VX1 = 530, LIVER = [380, 240], CELL = [486, 240], PAN = [262, 76];
  const inBand = (g) => g >= 70 && g <= 110;
  const SC_NAME = { meal: '식사', exercise: '운동', fast: '공복' };
  function inRate(m) {
    if (GL.sc === 'meal') return m >= 5 && m < 35 ? 3.2 : 0;
    if (GL.sc === 'exercise') return m >= 5 && m < 30 ? -1.9 : 0;
    if (GL.sc === 'fast') return -0.30;
    return 0;
  }
  function startScenario(sc) {
    GL.sc = sc; GL.m = 0; GL.G = 90; GL.pend = 0; GL.running = true; GL.hist = [[0, 90]]; GL.press = []; GL.pI = 0; GL.pG = 0; GL.gly = 0.5; GL.hps = [];
    GL.maxG = 90; GL.minG = 90; GL.hist_t = 0; GL.endT = 0;
    if (!GL.dots.length) initDots();
    $$('#scSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === sc));
    Sound.click();
  }
  function initDots() {
    GL.dots = [];
    for (let i = 0; i < 15; i++) GL.dots.push({ x: VX0 + 12 + i * (VX1 - VX0 - 24) / 15, y: VY + (Math.random() - 0.5) * 18, st: 'flow', a: 1, u: 0, r: 5.5, ph: Math.random() * 6 });
  }
  function setAuto(on) {
    GL.auto = on;
    const b = $('#autoBtn'); if (b) { b.classList.toggle('btn-subject', on); b.innerHTML = on ? '🤖 건강한 몸의 자동 조절 : 켜짐' : '🤖 건강한 몸의 자동 조절'; }
    ['btnIns', 'btnGlu'].forEach((id) => { const e = $('#' + id); if (e) e.disabled = on; });
  }
  function pressHormone(kind) {
    if (GL.auto) { toast('건강한 몸에서는 이자가 알아서 조절해요.'); return; }
    if (!GL.running) { toast('먼저 상황(식사·운동·공복)을 골라요.'); return; }
    const pn = performance.now();
    if (pn - GL.lastPress < 110) return; GL.lastPress = pn;
    if (kind === 'ins') { GL.pend = clamp(GL.pend - 16, -64, 64); GL.pI++; emitHormone('ins', 3); }
    else { GL.pend = clamp(GL.pend + 16, -64, 64); GL.pG++; emitHormone('glu', 3); }
    GL.press.push({ m: GL.m, G: GL.G, k: kind });
    Sound.tick();
  }
  function emitHormone(type, n) {
    for (let i = 0; i < n; i++) GL.hps.push({ type, st: 'drop', delay: i * 0.15, u: 0, x: PAN[0] + (i - 1) * 14, y: PAN[1] + 20, x0: PAN[0] + (i - 1) * 14, y0: PAN[1] + 20, t: Math.random() * 6, a: 1 });
  }
  function updateGlucose(dt) {
    if (GL.running) {
      const dm = dt * SPEED; GL.m += dm;
      let dG = inRate(GL.m) * dm;
      if (!GL.auto) dG += -(GL.G - 90) * 0.004 * dm;
      else { const c = -0.25 * (GL.G - 90) * dm; dG += c; GL.gly = clamp(GL.gly - c * 0.003, 0.02, 0.98); }
      const take = GL.pend * (1 - Math.exp(-2.5 * dt)); GL.pend -= take; dG += take; GL.gly = clamp(GL.gly - take * 0.004, 0.02, 0.98);
      GL.G = clamp(GL.G + dG, 30, 230);
      GL.maxG = Math.max(GL.maxG, GL.G); GL.minG = Math.min(GL.minG, GL.G);
      GL.hist_t += dm;
      if (GL.hist_t >= 0.5) { GL.hist_t = 0; GL.hist.push([GL.m, GL.G]); }
      if (GL.m >= 120) { GL.running = false; GL.endT = now(); GL.hist.push([120, GL.G]); GL.done[GL.sc] = true; }
      // 자동 조절: 이자가 호르몬을 내보냄
      if (GL.auto) { GL.emitT -= dt; const e = GL.G - 90; if (GL.emitT <= 0 && Math.abs(e) > 5) { GL.emitT = clamp(0.9 - Math.abs(e) / 40, 0.25, 0.9); emitHormone(e > 0 ? 'ins' : 'glu', 1); } }
    } else if (GL.sc !== 'none' && GL.endT && now() - GL.endT > 4.5 && !GL.auto) {
      toast('다시 시작해요! ' + SC_NAME[GL.sc] + ' 상황을 한 번 더 해 봐요.'); startScenario(GL.sc);
    } else if (GL.sc !== 'none' && GL.endT && now() - GL.endT > 4.5 && GL.auto) { startScenario(GL.sc); }
    GL.dispG = approach(GL.dispG, GL.G, dt, 9);
    const tI = GL.auto ? clamp((GL.G - 92) / 30, 0, 1) : clamp(-GL.pend / 30, 0, 1), tG = GL.auto ? clamp((88 - GL.G) / 30, 0, 1) : clamp(GL.pend / 30, 0, 1);
    GL.insLv = approach(GL.insLv, tI, dt, 6); GL.gluLv = approach(GL.gluLv, tG, dt, 6);
    GL.cellGlow = approach(GL.cellGlow, GL.sc === 'exercise' && GL.running && GL.m >= 5 && GL.m < 30 ? 1 : 0, dt, 5);
    GL.bite = approach(GL.bite, GL.sc === 'meal' && GL.running && GL.m >= 5 && GL.m < 35 ? 1 : 0, dt, 5);
    // 포도당 알갱이
    const N = Math.round(GL.G / 6);
    GL.adj -= dt;
    const flowDots = GL.dots.filter((d) => d.st === 'flow' || d.st === 'rise').length;
    if (GL.adj <= 0) {
      GL.adj = 0.09;
      if (flowDots < N) {
        const fromLiver = GL.pend > 1 || (GL.auto && GL.G < 88);
        if (fromLiver) GL.dots.push({ x: LIVER[0] + (Math.random() - 0.5) * 30, y: LIVER[1] - 20, st: 'rise', a: 1, u: 0, r: 5.5, ph: Math.random() * 6 });
        else GL.dots.push({ x: VX0 + 6, y: VY + (Math.random() - 0.5) * 18, st: 'flow', a: 0, u: 0, r: 5.5, ph: Math.random() * 6 });
      } else if (flowDots > N) {
        const cand = GL.dots.filter((d) => d.st === 'flow' && d.x > 300 && d.x < 500);
        const d = cand[Math.floor(Math.random() * cand.length)] || GL.dots.find((q) => q.st === 'flow');
        if (d) {
          const toLiver = GL.pend < -1 || (GL.auto && GL.G > 92) ? Math.random() < 0.6 : false;
          d.st = 'sink'; d.u = 0; d.x0 = d.x; d.y0 = d.y; d.tx = toLiver ? LIVER[0] + (Math.random() - 0.5) * 30 : CELL[0] + (Math.random() - 0.5) * 20; d.ty = toLiver ? LIVER[1] - 10 : CELL[1] - 8;
        }
      }
    }
    GL.dots.forEach((d) => {
      if (d.st === 'flow') { d.x += 55 * dt; if (d.x > VX1 - 8) d.x = VX0 + 8; d.a = Math.min(1, d.a + dt * 2.5); d.y = VY + Math.sin(now() * 2 + d.ph) * 7; }
      else if (d.st === 'rise') { d.y -= 60 * dt; if (d.y <= VY) { d.st = 'flow'; } }
      else if (d.st === 'sink') { d.u += dt / 0.7; const e = SciSim.ease.inOutQuad(Math.min(1, d.u)); d.x = lerp(d.x0, d.tx, e); d.y = lerp(d.y0, d.ty, e); d.r = 5.5 * (1 - 0.6 * e); if (d.u >= 1) d.dead = true; }
    });
    GL.dots = GL.dots.filter((d) => !d.dead);
    // 호르몬 입자
    GL.hps.forEach((p) => {
      if (p.delay > 0) { p.delay -= dt; return; }
      p.t += dt;
      if (p.st === 'drop') { p.u += dt / 0.5; const e = SciSim.ease.outCubic(Math.min(1, p.u)); p.y = lerp(p.y0, VY - 4, e); if (p.u >= 1) { p.st = 'flow'; } }
      else if (p.st === 'flow') { p.x += 70 * dt; p.y = VY - 4 + Math.sin(p.t * 3) * 5; if (p.x >= LIVER[0] + (p.type === 'ins' ? 0 : 30)) { p.st = 'dock'; p.u = 0; } }
      else if (p.st === 'dock') { p.u += dt / 0.6; p.a = 1 - p.u; p.y = lerp(p.y, LIVER[1] - 30, 0.1); if (p.u >= 1) p.dead = true; }
    });
    GL.hps = GL.hps.filter((p) => !p.dead);
  }
  function drawGlucoseScene(t) {
    const G = GL.dispG, st = G > 110.5 ? 'hi' : G < 69.5 ? 'lo' : 'ok';
    // 위 왼쪽: 몸속 그림
    panel(14, 14, 548, 268, { r: 18, bg: '#fbfdff' });
    // 음식
    ctx.save(); ctx.translate(72, 74); const bs = 1 + 0.06 * Math.sin(t * 8) * GL.bite; ctx.scale(bs, bs);
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; ctx.beginPath(); ctx.ellipse(0, 6, 36, 14, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = lgrad(0, -22, 0, 12, [[0, '#fff7e0'], [1, '#f1d9a3']]); ctx.beginPath(); ctx.arc(0, 0, 22, Math.PI, 0); ctx.lineTo(22, 6); ctx.lineTo(-22, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(-8, -10, 4, 0, TAU); ctx.arc(8, -8, 4, 0, TAU); ctx.fill();
    ctx.restore();
    pill('음식', 72, 112, { bg: '#d97706', size: 13, h: 24 });
    // 혈관
    ctx.save(); rr(36, VY - 24, 500, 48, 24); ctx.fillStyle = '#ffe3e7'; ctx.fill(); ctx.strokeStyle = '#e5576b'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.5; for (let i = 0; i < 8; i++) { const x = ((i * 66 + t * 40) % 480) + 44; D.arrow(x, VY + 18, x + 16, VY + 18, { color: '#e5576b', width: 2, head: 6 }); } ctx.restore();
    pill('혈액 (혈관)', 150, VY - 38, { bg: '#e5576b', size: 13, h: 22, alpha: 0.95 });
    // 간
    ctx.fillStyle = lgrad(0, LIVER[1] - 30, 0, LIVER[1] + 30, [[0, '#c9794f'], [1, '#8f4a2c']]); ctx.beginPath(); ctx.ellipse(LIVER[0], LIVER[1] + 6, 56, 30, -0.05, 0, TAU); ctx.fill();
    txt('간', LIVER[0] - 40, LIVER[1] - 6, { size: 16, weight: 800, color: '#fff', align: 'center' });
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(LIVER[0] - 28, LIVER[1] + 6, 78, 14, 7); ctx.fill();
    ctx.fillStyle = lgrad(LIVER[0] - 28, 0, LIVER[0] + 50, 0, [[0, '#ffe08a'], [1, '#f0b400']]); rr(LIVER[0] - 28, LIVER[1] + 6, Math.max(8, 78 * GL.gly), 14, 7); ctx.fill();
    txt('글리코젠 저장', LIVER[0] + 11, LIVER[1] + 37, { size: 13, weight: 800, color: '#7a4a2c', align: 'center' });
    // 세포
    const cg = GL.cellGlow;
    if (cg > 0.02) D.glow(CELL[0], CELL[1], 56, '#ff7a1a', 0.55 * cg);
    ctx.save(); ctx.translate(CELL[0] + (cg > 0.02 && !RM ? Math.sin(t * 40) * 2 * cg : 0), CELL[1]);
    ctx.fillStyle = lgrad(0, -30, 0, 30, [[0, '#f9c7d1'], [1, '#e08096']]); ctx.beginPath(); ctx.ellipse(0, 0, 42, 30, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b84a6a'; ctx.beginPath(); ctx.arc(-4, -2, 11, 0, TAU); ctx.fill();
    ctx.restore();
    txt('세포', CELL[0], CELL[1] + 46, { size: 14, weight: 800, color: '#8a2f4d', align: 'center' });
    // 이자와 호르몬 수준
    ctx.fillStyle = lgrad(0, PAN[1] - 14, 0, PAN[1] + 14, [[0, '#f4d35e'], [1, '#d9a400']]); ctx.beginPath(); ctx.ellipse(PAN[0], PAN[1], 54, 17, 0.05, 0, TAU); ctx.fill();
    txt('이자', PAN[0], PAN[1] + 1, { size: 15, weight: 800, color: '#5c4300', align: 'center', base: 'middle' });
    [['인슐린', '#2f7de1', GL.insLv, -4], ['글루카곤', '#f0b400', GL.gluLv, 16]].forEach((q) => {
      txt(q[0], 330, PAN[1] + q[3] - 4, { size: 13, weight: 800, color: '#5d6879' });
      ctx.fillStyle = '#eef1f6'; rr(398, PAN[1] + q[3] - 15, 90, 12, 6); ctx.fill();
      if (q[2] > 0.02) { ctx.fillStyle = q[1]; rr(398, PAN[1] + q[3] - 15, Math.max(12, 90 * q[2]), 12, 6); ctx.fill(); }
    });
    // 포도당 알갱이
    GL.dots.forEach((d) => { ctx.save(); ctx.globalAlpha = clamp(d.a, 0, 1); bead(d.x, d.y, d.r, '#f5b800', { noShadow: true }); ctx.restore(); });
    GL.hps.forEach((p) => { if (p.delay <= 0) hormoneShape(p.type, p.x, p.y, 6.5, t + p.t, clamp(p.a, 0, 1)); });
    bead(448, 126, 6, '#f5b800', { noShadow: true }); txt('포도당', 458, 127, { size: 13, weight: 800, color: '#5d6879', base: 'middle' });
    hormoneShape('ins', 504, 126, 5.5, t, 1); hormoneShape('glu', 530, 126, 5.5, t, 1);
    if (GL.sc === 'none') pill('아래 단추로 상황(식사·운동·공복)을 골라요', 300, 138, { bg: 'rgba(27,35,51,.9)', size: 15, h: 32, pad: 14, shadow: true });
    if (GL.auto) pill('🤖 간뇌와 이자가 자동으로 조절해요', 300, 262, { bg: '#16a34a', size: 14, h: 26, pad: 14 });

    // 위 오른쪽: 혈당 게이지
    panel(574, 14, 212, 268, { r: 18 });
    const gy = (v) => 244 - (v - 40) / 160 * 200;
    ctx.save(); ctx.fillStyle = '#eef1f6'; rr(596, 44, 36, 200, 18); ctx.fill(); ctx.clip();
    ctx.fillStyle = 'rgba(22,163,74,.28)'; ctx.fillRect(596, gy(110), 36, gy(70) - gy(110));
    const liq = st === 'ok' ? ['#5fd38a', '#16a34a'] : st === 'hi' ? ['#ff9a8a', '#e5484d'] : ['#7fb5ff', '#2f7de1'];
    ctx.fillStyle = lgrad(0, gy(G), 0, 244, [[0, liq[0]], [1, liq[1]]]); ctx.fillRect(596, gy(clamp(G, 40, 200)), 36, 244 - gy(clamp(G, 40, 200)) + 2);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(600, gy(clamp(G, 40, 200)) + 2, 5, 40);
    ctx.restore();
    ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 2.5; rr(596, 44, 36, 200, 18); ctx.stroke();
    ctx.fillStyle = '#16a34a'; ctx.fillRect(590, gy(110) - 1, 48, 2.5); ctx.fillRect(590, gy(70) - 1, 48, 2.5);
    [[200, '#8a93a3'], [150, '#8a93a3'], [110, '#16a34a'], [70, '#16a34a'], [40, '#8a93a3']].forEach((q) => txt(String(q[0]), 646, gy(q[0]), { size: 13, weight: 800, color: q[1], base: 'middle' }));
    txt(String(Math.round(G)), 726, 112, { size: 40, weight: 800, color: st === 'ok' ? '#15803d' : st === 'hi' ? '#d03a3a' : '#2563c4', align: 'center', base: 'middle' });
    txt('mg/dL', 726, 140, { size: 14, weight: 800, color: '#5d6879', align: 'center' });
    pill(st === 'ok' ? '정상 ✓' : st === 'hi' ? '높아요 ↑' : '낮아요 ↓', 726, 176, { bg: st === 'ok' ? '#16a34a' : st === 'hi' ? '#e5484d' : '#2f7de1', size: 15, h: 30, pad: 14 });
    txt('정상 범위', 726, 220, { size: 13, weight: 800, color: '#5d6879', align: 'center' });
    txt('70 ~ 110 mg/dL', 726, 240, { size: 15, weight: 800, color: '#16a34a', align: 'center' });

    // 아래: 혈당 그래프
    panel(14, 294, 772, 296, { r: 18 });
    const X0 = 72, X1 = 766, Y0 = 560, Y1 = 346;
    const gx = (m) => X0 + (m / 120) * (X1 - X0), gv = (v) => Y0 - (v - 40) / 160 * (Y0 - Y1);
    ctx.fillStyle = 'rgba(22,163,74,.16)'; ctx.fillRect(X0, gv(110), X1 - X0, gv(70) - gv(110));
    ctx.strokeStyle = 'rgba(22,163,74,.6)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X0, gv(110)); ctx.lineTo(X1, gv(110)); ctx.moveTo(X0, gv(70)); ctx.lineTo(X1, gv(70)); ctx.stroke(); ctx.setLineDash([]);
    txt('정상 범위', X1 - 4, gv(110) - 6, { size: 13, weight: 800, color: '#15803d', align: 'right' });
    ctx.fillStyle = '#c3ccd9'; ctx.fillRect(X0, Y1 - 4, 1.5, Y0 - Y1 + 4); ctx.fillRect(X0, Y0, X1 - X0, 1.5);
    [40, 70, 110, 150, 200].forEach((v) => txt(String(v), X0 - 8, gv(v), { size: 13, weight: 700, color: '#8a93a3', align: 'right', base: 'middle' }));
    [0, 30, 60, 90, 120].forEach((m) => txt(m + '분', gx(m), Y0 + 20, { size: 13, weight: 700, color: '#8a93a3', align: 'center' }));
    txt('혈당량 (mg/dL)', 28, 322, { size: 14, weight: 800, color: '#2b3445' });
    // 상황 띠
    if (GL.sc === 'meal') { ctx.fillStyle = 'rgba(217,119,6,.18)'; ctx.fillRect(gx(5), Y1 - 30, gx(35) - gx(5), 24); txt('식사 (포도당 흡수)', (gx(5) + gx(35)) / 2, Y1 - 13, { size: 13, weight: 800, color: '#b45309', align: 'center' }); }
    if (GL.sc === 'exercise') { ctx.fillStyle = 'rgba(234,88,12,.18)'; ctx.fillRect(gx(5), Y1 - 30, gx(30) - gx(5), 24); txt('운동 (포도당 소비)', (gx(5) + gx(30)) / 2, Y1 - 13, { size: 13, weight: 800, color: '#c2410c', align: 'center' }); }
    if (GL.sc === 'fast') { ctx.fillStyle = 'rgba(100,116,139,.18)'; ctx.fillRect(gx(0), Y1 - 30, gx(120) - gx(0), 24); txt('공복 (먹지 않음)', gx(60), Y1 - 13, { size: 13, weight: 800, color: '#475569', align: 'center' }); }
    if (GL.sc === 'none') txt('상황을 고르면 혈당량 그래프가 그려져요', (X0 + X1) / 2, (Y0 + Y1) / 2, { size: 16, weight: 800, color: '#a8b0bf', align: 'center' });
    // 선
    if (GL.hist.length > 1) {
      ctx.save(); ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (let i = 1; i < GL.hist.length; i++) {
        const a = GL.hist[i - 1], b = GL.hist[i];
        ctx.strokeStyle = inBand(b[1]) ? '#16a34a' : b[1] > 110 ? '#e5484d' : '#2f7de1';
        ctx.beginPath(); ctx.moveTo(gx(a[0]), gv(a[1])); ctx.lineTo(gx(b[0]), gv(b[1])); ctx.stroke();
      }
      const h = GL.hist[GL.hist.length - 1];
      D.glow(gx(h[0]), gv(clamp(GL.G, 40, 200)), 18, st === 'ok' ? '#16a34a' : st === 'hi' ? '#e5484d' : '#2f7de1', 0.6);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = st === 'ok' ? '#16a34a' : st === 'hi' ? '#e5484d' : '#2f7de1'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(gx(GL.m), gv(clamp(GL.G, 40, 200)), 6, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
      GL.press.forEach((q) => { const x = gx(q.m), y = gv(clamp(q.G, 40, 200)); bead(x, y + (q.k === 'ins' ? -16 : 16), 8, q.k === 'ins' ? '#2f7de1' : '#f0b400', { noShadow: true }); txt(q.k === 'ins' ? '인' : '글', x, y + (q.k === 'ins' ? -15 : 17), { size: 11, weight: 800, color: '#fff', align: 'center', base: 'middle' }); });
    }
    if (GL.sc !== 'none') txt('경과 시간 ' + Math.min(120, Math.round(GL.m)) + '분', X1, 322, { size: 14, weight: 800, color: '#5d6879', align: 'right' });
    if (!GL.running && GL.sc !== 'none') { const ok = GL.auto ? (GL.maxG <= 112 && GL.minG >= 68) : false; pill(GL.auto ? (ok ? '✔ 자동 조절로 정상 범위를 지켰어요!' : '끝! 다시 시작해요') : '끝! 곧 다시 시작해요', (X0 + X1) / 2, 452, { bg: GL.auto && ok ? '#16a34a' : '#1b2333', size: 16, h: 34, pad: 16, shadow: true }); }
  }

  /* =====================================================
     장면 3 · 체온 조절
     ===================================================== */
  const TP = {
    env: 'normal', reg: true, T: 37, dispT: 37, rc: 0, rh: 0, vessel: 18, envC: 0, envH: 0, tCold: 0, tHot: 0, pick: false, picks: [], bad: {},
    hp: [], pulses: [], emit: 0, pulseT: 0, sweat: 0, glow: 0, cellG: 0, hot: 0,
  };
  const TB = { ox: 170, oy: 88, k: 0.88 };
  const tb = (rx, ry) => [TB.ox + rx * TB.k, TB.oy + ry * TB.k];
  const T_BRAIN = tb(0, 6), T_THY = tb(0, 62), T_CELL = tb(0, 160);
  const THY_P = new PathM([T_THY, tb(-16, 90), tb(10, 124), tb(0, 156)], 12);
  const NERVE_PATHS = [
    new PathM([tb(0, 14), tb(-3, 60), tb(-6, 120), tb(-30, 150), tb(-62, 190), tb(-84, 240)], 12),     // 피부 혈관(왼팔)
    new PathM([tb(0, 14), tb(2, 60), tb(4, 130), tb(-20, 215), tb(-46, 285), tb(-54, 330)], 12),           // 근육(넓적다리)
    new PathM([tb(0, 14), tb(3, 60), tb(8, 120), tb(34, 150), tb(66, 190), tb(84, 238)], 12),            // 땀샘(오른팔)
  ];
  const CHIPS = [
    { id: 'vcon', label: '혈관 수축', kind: 'n', cold: true }, { id: 'vdil', label: '혈관 확장', kind: 'n', hot: true },
    { id: 'shiv', label: '몸 떨림', kind: 'n', cold: true }, { id: 'swt', label: '땀 분비 증가', kind: 'n', hot: true },
    { id: 'thyU', label: '티록신 분비 증가', kind: 'h', cold: true }, { id: 'thyD', label: '티록신 분비 감소', kind: 'h', hot: true },
  ];
  const COLD_ANS = ['vcon', 'shiv', 'thyU'];
  const chipRect = (i) => ({ x: 510 + (i % 2) * 136, y: 360 + Math.floor(i / 2) * 58, w: 128, h: 50 });
  const ENV_LABEL = { cold: ['바깥 기온 5 °C', '#2f7de1'], normal: ['바깥 기온 22 °C', '#16a34a'], hot: ['바깥 기온 35 °C', '#e8590c'] };

  function setEnv(e) {
    if (TP.pick && e !== 'cold') return;
    TP.env = e; $$('#envSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === e)); Sound.click();
  }
  function setReg(on) {
    if (TP.pick && !on) return;
    TP.reg = on; const b = $('#btnReg'); if (b) { b.classList.toggle('btn-subject', on); b.innerHTML = on ? '🧠 간뇌 조절 : 켜짐' : '🧠 간뇌 조절 : 꺼짐'; }
  }
  function updateTemp(dt, t) {
    const env = TP.env;
    TP.envC = approach(TP.envC, env === 'cold' ? 1 : 0, dt, 3); TP.envH = approach(TP.envH, env === 'hot' ? 1 : 0, dt, 3);
    const err = 37 - TP.T;
    const tc = TP.reg ? clamp(err * 3 + (env === 'cold' ? 0.55 : 0), 0, 1) : 0;
    const th = TP.reg ? clamp(-err * 3 + (env === 'hot' ? 0.55 : 0), 0, 1) : 0;
    TP.rc = approach(TP.rc, tc, dt, 2.5); TP.rh = approach(TP.rh, th, dt, 2.5);
    const drive = env === 'cold' ? -0.09 : env === 'hot' ? 0.09 : 0;
    TP.T = clamp(TP.T + (drive + 0.15 * TP.rc - 0.15 * TP.rh) * dt, 33.5, 40.5);
    TP.dispT = approach(TP.dispT, TP.T, dt, 8);
    TP.vessel = approach(TP.vessel, 18 - 11 * TP.rc + 14 * TP.rh, dt, 3);
    if (env === 'cold' && TP.reg && TP.rc > 0.3) TP.tCold += dt;
    if (env === 'hot' && TP.reg && TP.rh > 0.3) TP.tHot += dt;
    // 신경 신호 (노랑)
    TP.pulseT -= dt;
    const lvl = Math.max(TP.rc, TP.rh);
    if (TP.pulseT <= 0 && lvl > 0.25) {
      TP.pulseT = 1.1 - lvl * 0.5;
      const want = TP.rc > TP.rh ? [0, 1] : [0, 2];
      want.forEach((i) => TP.pulses.push({ i, s: 0, sp: 260 }));
    }
    TP.pulses.forEach((p) => { p.s += p.sp * dt; if (p.s >= NERVE_PATHS[p.i].len) p.dead = true; });
    TP.pulses = TP.pulses.filter((p) => !p.dead);
    // 티록신 (보라) : 추울 때 많이, 더울 때 거의 없음
    TP.emit -= dt;
    const rate = TP.reg ? (env === 'cold' ? 0.35 : env === 'hot' ? 2.2 : 1.1) : 1.1;
    if (TP.emit <= 0) { TP.emit = rate * (TP.rc > 0.3 ? 0.55 : 1); if (!(env === 'hot' && TP.reg && TP.rh > 0.6 && Math.random() < 0.7)) TP.hp.push({ u: 0, t: Math.random() * 6 }); }
    TP.hp.forEach((p) => { p.u += dt / 1.7; p.t += dt; if (p.u >= 1) { p.dead = true; TP.cellG = Math.min(1.3, TP.cellG + 0.25); } });
    TP.hp = TP.hp.filter((p) => !p.dead);
    TP.cellG = approach(TP.cellG, 0, dt, 1.2);
    // 눈·땀 효과
    if (env === 'cold' && !RM && Math.random() < dt * 14) PFX.emit({ x: 24 + Math.random() * 300, y: 22, vx: (Math.random() - 0.5) * 20, vy: 38 + Math.random() * 30, life: 3.2, size: 2 + Math.random() * 2.4, color: '#ffffff', shape: 'circle', gravity: 4, fade: true, alpha: 0.9 });
    if (TP.rh > 0.25 && !RM && Math.random() < dt * 6 * TP.rh) PFX.emit({ x: 650 + (Math.random() - 0.5) * 6, y: 70, vx: (Math.random() - 0.5) * 14, vy: -6, life: 1.4, size: 4.2, color: '#5aa7ff', shape: 'bubble', gravity: 30, fade: true });
    TP.sweat = approach(TP.sweat, TP.rh, dt, 3);
  }
  function drawSkin(t) {
    panel(352, 14, 434, 316, { r: 18, bg: '#fbfdff' });
    ctx.save(); rr(356, 18, 426, 308, 16); ctx.clip();
    const sky = mix(mix('#f4f9ff', '#d6e8ff', TP.envC), '#ffe3c2', TP.envH);
    ctx.fillStyle = sky; ctx.fillRect(356, 18, 426, 52);
    const SY = 70;
    // 진피, 표피
    ctx.fillStyle = lgrad(0, SY, 0, 330, [[0, '#fadcd6'], [1, '#f4c4bd']]); ctx.fillRect(356, SY + 26, 426, 260);
    ctx.fillStyle = '#f1c79d'; ctx.fillRect(356, SY, 426, 26);
    ctx.fillStyle = 'rgba(160,100,60,.25)'; for (let x = 366; x < 780; x += 22) { ctx.beginPath(); ctx.arc(x, SY + 13 + Math.sin(x) * 4, 2.2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(190,110,100,.18)'; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(366 + (i * 97) % 410, SY + 40 + (i * 53) % 230, 2.4, 0, TAU); ctx.fill(); }
    txt('표피', 372, SY + 17, { size: 13, weight: 800, color: '#8a5a2c' });
    txt('진피', 372, SY + 50, { size: 13, weight: 800, color: '#a0504a' });
    // 땀샘
    const px = 656;
    ctx.save(); ctx.strokeStyle = '#c28a2c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, SY + 2); ctx.bezierCurveTo(px + 10, SY + 60, px - 10, SY + 120, px, 262); ctx.stroke();
    ctx.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.2) { const r = 6 + a * 2.6; const x = px + Math.cos(a) * r, y = 284 + Math.sin(a) * r * 0.8; a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    if (TP.sweat > 0.05) { ctx.strokeStyle = rgba('#5aa7ff', 0.4 + 0.5 * TP.sweat); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px, SY + 2 + (1 - TP.sweat) * 190); ctx.bezierCurveTo(px + 10, SY + 60, px - 10, SY + 120, px, 262); ctx.stroke(); }
    ctx.restore();
    pill('땀샘', px + 54, 292, { bg: '#b7791f', size: 13, h: 24 });
    // 피부 혈관
    const W = TP.vessel, VYc = 206;
    ctx.save(); ctx.lineCap = 'round';
    ctx.fillStyle = '#c93b52'; rr(360, VYc - W / 2 - 3, 418, W + 6, (W + 6) / 2); ctx.fill();
    ctx.fillStyle = lgrad(0, VYc - W / 2, 0, VYc + W / 2, [[0, '#ff9aa8'], [1, '#ec5f74']]); rr(360, VYc - W / 2, 418, W, W / 2); ctx.fill();
    ctx.restore();
    for (let i = 0; i < 16; i++) { const x = 364 + ((i * 29 + t * 50) % 410), y = VYc + Math.sin(i * 2 + t) * W * 0.18; ctx.fillStyle = '#c8283f'; ctx.beginPath(); ctx.ellipse(x, y, Math.min(4.6, W * 0.3), Math.min(3.4, W * 0.22), 0, 0, TAU); ctx.fill(); }
    pill('피부 혈관', 440, VYc + W / 2 + 22, { bg: '#c93b52', size: 13.5, h: 24 });
    // 열이 빠져나가는 화살표
    const hf = clamp((W - 6) / 34, 0, 1), n = 3 + Math.round(hf * 3);
    for (let i = 0; i < n; i++) {
      const x = 400 + i * (240 / (n - 1 || 1)) + (i % 2 ? 6 : -6), ph = ((t * 0.55 + i * 0.37) % 1);
      const y1 = VYc - W / 2 - 4 - ph * 36, len = 34 + hf * 40;
      ctx.save(); ctx.globalAlpha = (0.25 + hf * 0.65) * Math.sin(ph * Math.PI);
      D.arrow(x, y1, x, y1 - len, { color: '#ff7a1a', width: 3 + hf * 4, head: 9 + hf * 6 });
      ctx.restore();
    }
    pill('몸 밖으로 나가는 열', 560, 54, { bg: '#e8590c', size: 13.5, h: 24, alpha: 0.35 + 0.65 * hf });
    // 상태 문구
    const msg = TP.env === 'cold' ? (TP.reg ? '혈관이 수축해요 → 열이 덜 빠져나가요' : '간뇌 조절이 꺼졌어요!') : TP.env === 'hot' ? (TP.reg ? '혈관이 확장돼요 · 땀이 증발하며 열을 빼앗아요' : '간뇌 조절이 꺼졌어요!') : '체온이 알맞아요';
    pill(msg, 569, 312, { bg: 'rgba(27,35,51,.88)', size: 14, h: 26, pad: 12 });
    ctx.restore();
  }
  function drawThermo(t) {
    panel(352, 342, 434, 248, { r: 18 });
    const Tv = clamp(TP.dispT, 34, 40), ty = (v) => 520 - (v - 34) / 6 * 150;
    ctx.fillStyle = '#eef1f6'; rr(386, 366, 22, 158, 11); ctx.fill();
    ctx.fillStyle = 'rgba(22,163,74,.25)'; ctx.fillRect(386, ty(37.5), 22, ty(36.5) - ty(37.5));
    const col = Math.abs(TP.dispT - 37) < 0.6 ? '#e2464b' : TP.dispT < 37 ? '#2f7de1' : '#d0302c';
    ctx.save(); rr(386, 366, 22, 158, 11); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(386, ty(Tv), 22, 530 - ty(Tv)); ctx.restore();
    ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 2.5; rr(386, 366, 22, 158, 11); ctx.stroke();
    bead(397, 538, 17, col, { noShadow: true });
    [35, 36, 37, 38, 39].forEach((v) => { ctx.fillStyle = v === 37 ? '#16a34a' : '#8a93a3'; ctx.fillRect(408, ty(v) - 1, 8, 2); txt(String(v), 420, ty(v), { size: 12.5, weight: 800, color: v === 37 ? '#16a34a' : '#8a93a3', base: 'middle' }); });
    txt((Math.round(TP.dispT * 10) / 10).toFixed(1), 468, 440, { size: 30, weight: 800, color: Math.abs(TP.dispT - 37) < 0.6 ? '#1b2333' : '#d0302c', align: 'center', base: 'middle' });
    txt('°C', 468, 468, { size: 15, weight: 800, color: '#5d6879', align: 'center' });
    pill(ENV_LABEL[TP.env][0], 450, 372, { bg: ENV_LABEL[TP.env][1], size: 13, h: 24, pad: 8 });
    // 반응 칩
    CHIPS.forEach((c, i) => {
      const r = chipRect(i), lv = c.cold ? (c.id === 'thyU' ? TP.rc : TP.rc) : TP.rh;
      const lit = !TP.pick && lv > 0.3, picked = TP.pick && TP.picks.includes(c.id), bad = TP.bad[c.id];
      const sx = bad ? Math.sin(t * 60) * 3 : 0;
      ctx.save(); ctx.translate(sx, 0);
      ctx.shadowColor = 'rgba(30,60,40,.12)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
      rr(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = bad ? '#fde2e2' : picked ? '#e3f0ff' : lit ? (c.kind === 'n' ? '#fff3cf' : '#efe8ff') : '#f4f6fa'; ctx.fill();
      ctx.restore(); ctx.save(); ctx.translate(sx, 0);
      rr(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = bad ? '#e2464b' : picked ? '#2f7de1' : lit ? (c.kind === 'n' ? '#e8a100' : '#7c4fe0') : '#d9dfe9'; ctx.lineWidth = picked || lit ? 2.5 : 1.5; ctx.stroke();
      bead(r.x + 15, r.y + r.h / 2, 6, c.kind === 'n' ? '#e8a100' : '#7c4fe0', { noShadow: true });
      const ls = wrapLines(c.label, 86, 14.5);
      ls.slice(0, 2).forEach((l, k) => txt(l, r.x + 28, r.y + r.h / 2 - (Math.min(ls.length, 2) - 1) * 9 + k * 18, { size: 14.5, weight: 800, color: lit || picked ? '#1b2333' : '#6b7587', base: 'middle' }));
      if (picked) checkMark(r.x + r.w - 14, r.y + 14, 8);
      ctx.restore();
    });
    bead(520, 566, 6, '#e8a100', { noShadow: true }); txt('신경', 532, 567, { size: 14, weight: 800, color: '#5d6879', base: 'middle' });
    bead(588, 566, 6, '#7c4fe0', { noShadow: true }); txt('호르몬', 600, 567, { size: 14, weight: 800, color: '#5d6879', base: 'middle' });
    if (TP.pick) txt('추울 때 일어나는 반응 3가지를 눌러요 (' + TP.picks.length + '/3)', 569, 344, { size: 14, weight: 800, color: '#2563c4', align: 'center' });
    else if (!TP.reg) txt('⚠ 간뇌 조절이 꺼져서 체온이 계속 변해요!', 569, 344, { size: 14, weight: 800, color: '#d0302c', align: 'center' });
    else txt('간뇌가 체온 변화를 알아차리고 신경과 호르몬으로 조절해요', 569, 344, { size: 13, weight: 800, color: '#16a34a', align: 'center', max: 400 });
  }
  function drawTempScene(t) {
    // 왼쪽: 몸
    const bg = mix(mix('#fbfdff', '#dcecff', TP.envC), '#ffe8cf', TP.envH);
    panel(14, 14, 326, 576, { r: 18, bg });
    if (TP.envH > 0.05) { ctx.save(); ctx.globalAlpha = TP.envH; D.glow(296, 52, 90, '#ffb347', 0.8); D.sphere(296, 52, 24, '#ffc933', { gloss: false }); ctx.restore(); }
    const shake = !RM ? Math.sin(t * 55) * 2.2 * TP.rc : 0;
    ctx.save(); ctx.translate(shake, 0);
    drawSil(TB.ox, TB.oy, TB.k, { c1: mix('#e9eff9', '#bcd4f6', TP.envC * 0.6), c2: mix('#cbd8ec', '#9db9e6', TP.envC * 0.6) });
    // 근육(떨림)과 세포(열)
    const ml = tb(-54, 300), mr = tb(54, 300);
    ctx.fillStyle = rgba('#e5484d', 0.3 + 0.5 * TP.rc); ctx.beginPath(); ctx.ellipse(ml[0], ml[1], 12, 40, 0.02, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(mr[0], mr[1], 12, 40, -0.02, 0, TAU); ctx.fill();
    D.glow(T_CELL[0], T_CELL[1], 64, '#ff7a1a', clamp(0.1 + 0.4 * TP.rc + TP.cellG * 0.4 - 0.1 * TP.rh, 0, 0.8));
    [[0, 0, 11], [-16, 10, 9], [16, 12, 9], [2, 22, 8], [-2, -16, 8]].forEach((q) => bead(T_CELL[0] + q[0], T_CELL[1] + q[1], q[2], '#f6c6a0', { noShadow: true }));
    txt('세포', T_CELL[0], T_CELL[1] + 46, { size: 13, weight: 800, color: '#8a5a2c', align: 'center' });
    // 간뇌
    ctx.fillStyle = rgba('#f4a6b8', 0.9); ctx.beginPath(); ctx.ellipse(T_BRAIN[0], T_BRAIN[1] - 6, 30, 22, 0, 0, TAU); ctx.fill();
    const dgl = 0.5 + 0.5 * Math.sin(t * 5);
    D.glow(T_BRAIN[0], T_BRAIN[1] + 2, 28 + 4 * dgl * Math.max(TP.rc, TP.rh), '#ffd166', 0.45 + 0.4 * Math.max(TP.rc, TP.rh));
    ctx.fillStyle = '#f0a500'; ctx.beginPath(); ctx.ellipse(T_BRAIN[0], T_BRAIN[1] + 2, 9, 7, 0, 0, TAU); ctx.fill();
    // 갑상샘
    ctx.fillStyle = '#8b5cf6'; [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.ellipse(T_THY[0] + sg * 9, T_THY[1], 7, 11, sg * 0.35, 0, TAU); ctx.fill(); });
    ctx.restore();
    // 신경 길 (연한 점선) + 신호
    ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(232,161,0,.5)'; ctx.lineWidth = 2.2;
    NERVE_PATHS.forEach((p) => { ctx.beginPath(); p.trace(0, p.len); ctx.stroke(); }); ctx.restore();
    TP.pulses.forEach((p) => drawPulse(NERVE_PATHS[p.i], p.s, { color: '#ffb800', trail: 50, w: 5, r: 14 }));
    TP.hp.forEach((p) => { const q = THY_P.at(p.u * THY_P.len); hormoneShape('thy', q.x, q.y, 5, t + p.t, clamp(1.2 - p.u * 0.4, 0, 1)); });
    // 이름표
    pill('간뇌', 66, T_BRAIN[1] - 2, { bg: '#e08a00', size: 14, h: 26 });
    ctx.strokeStyle = 'rgba(224,138,0,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(90, T_BRAIN[1] - 2); ctx.lineTo(T_BRAIN[0] - 18, T_BRAIN[1] + 1); ctx.stroke();
    pill('갑상샘', 70, T_THY[1] + 4, { bg: '#7c4fe0', size: 14, h: 26 });
    ctx.strokeStyle = 'rgba(124,79,224,.8)'; ctx.beginPath(); ctx.moveTo(98, T_THY[1] + 4); ctx.lineTo(T_THY[0] - 20, T_THY[1] + 2); ctx.stroke();
    pill(ENV_LABEL[TP.env][0], 170, 32, { bg: ENV_LABEL[TP.env][1], size: 13.5, h: 26, pad: 10, shadow: true });
    pill('티록신', 100, 560, { bg: '#7c4fe0', size: 13, h: 24 }); pill('신경 신호', 220, 560, { bg: '#e8a100', size: 13, h: 24 });
    drawSkin(t); drawThermo(t);
  }
  function tempDown(p) {
    if (!TP.pick) return false;
    for (let i = 0; i < CHIPS.length; i++) {
      const r = chipRect(i);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        const id = CHIPS[i].id, k = TP.picks.indexOf(id);
        if (k >= 0) TP.picks.splice(k, 1); else TP.picks.push(id);
        TP.bad = {}; Sound.click(); return true;
      }
    }
    return false;
  }

  /* =====================================================
     장면 4 · 호르몬과 질병 (짝짓기 · 예시 자료 그래프)
     ===================================================== */
  const CARDS = [
    { id: 'giant', name: '거인증', sym: '성장기에 키가 비정상적으로 크게 자라요', ans: 'ghHi', col: '#ff8a3d' },
    { id: 'dwarf', name: '소인증', sym: '성장기에 키가 거의 자라지 못해요', ans: 'ghLo', col: '#ff8a3d' },
    { id: 'diab', name: '당뇨병', sym: '혈당량이 높고 오줌에 포도당이 섞여 나와요', ans: 'insLo', col: '#2f7de1' },
    { id: 'hyper', name: '갑상샘 기능 항진증', sym: '땀이 많이 나고 맥박이 빠르며 몸이 마르기 쉬워요', ans: 'thyHi', col: '#8b5cf6' },
    { id: 'hypo', name: '갑상샘 기능 저하증', sym: '쉽게 피곤하고 추위를 많이 타요', ans: 'thyLo', col: '#8b5cf6' },
  ];
  const CAUSES = [
    { id: 'ghHi', text: '성장기에 성장 호르몬이 너무 많이 분비돼요' },
    { id: 'ghLo', text: '성장기에 성장 호르몬이 부족하게 분비돼요' },
    { id: 'insLo', text: '인슐린이 부족하거나 제대로 작용하지 못해요' },
    { id: 'thyHi', text: '티록신이 너무 많이 분비돼요' },
    { id: 'thyLo', text: '티록신이 부족하게 분비돼요' },
  ];
  const DM = { labels: ['20대', '30대', '40대', '50대', '60대', '70대 이상'], v: [1, 2, 4, 8, 13, 18] };
  const TH = { labels: ['20대', '30대', '40대', '50대', '60대'], f: [2.5, 3.5, 4.5, 5.5, 6.0], m: [0.6, 0.8, 1.0, 1.2, 1.5] };
  const DS = { mode: 'match', pair: {}, sel: -1, bad: {}, order: [3, 0, 4, 1, 2], anim: 0, selBar: null, tAnim: 0 };
  const cardRect = (i) => ({ x: 24, y: 70 + i * 92, w: 310, h: 78 });
  const causeRect = (j) => ({ x: 466, y: 70 + j * 92, w: 310, h: 78 });
  function setDsMode(m) {
    DS.mode = m; DS.anim = 0; DS.selBar = null;
    $$('#dsSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === m));
  }
  function resetMatch() { DS.pair = {}; DS.sel = -1; DS.bad = {}; }
  function drawMatch(t) {
    panel(14, 14, 772, 576, { r: 18, bg: '#fbfdff' });
    txt('증상과 질병', 179, 46, { size: 16, weight: 800, color: '#2b3445', align: 'center' });
    txt('원인 (호르몬)', 621, 46, { size: 16, weight: 800, color: '#2b3445', align: 'center' });
    const rIdx = DS.order;           // 오른쪽 칸 j → CAUSES[rIdx[j]]
    // 선
    CARDS.forEach((c, i) => {
      const j = DS.pair[i]; if (j == null) return;
      const a = cardRect(i), b = causeRect(j), bad = DS.bad[i];
      ctx.save(); ctx.strokeStyle = bad ? '#e2464b' : '#2f7de1'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x + a.w, a.y + a.h / 2); ctx.bezierCurveTo(a.x + a.w + 60, a.y + a.h / 2, b.x - 60, b.y + b.h / 2, b.x, b.y + b.h / 2); ctx.stroke(); ctx.restore();
    });
    CARDS.forEach((c, i) => {
      const r = cardRect(i), on = DS.sel === i, paired = DS.pair[i] != null, bad = DS.bad[i];
      const sx = bad ? Math.sin(t * 60) * 3 : 0;
      ctx.save(); ctx.translate(sx, on ? -2 : 0); ctx.shadowColor = 'rgba(30,60,40,.16)'; ctx.shadowBlur = on ? 14 : 7; ctx.shadowOffsetY = on ? 6 : 2;
      rr(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = bad ? '#fde2e2' : on ? '#fff7d6' : '#fff'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(sx, on ? -2 : 0); rr(r.x, r.y, r.w, r.h, 14); ctx.strokeStyle = bad ? '#e2464b' : on ? '#f59e0b' : paired ? '#2f7de1' : '#d3dae6'; ctx.lineWidth = on || paired ? 3 : 1.5; ctx.stroke();
      rr(r.x, r.y, 8, r.h, 4); ctx.fillStyle = c.col; ctx.fill();
      txt(c.name, r.x + 22, r.y + 26, { size: 17, weight: 800, color: '#1b2333', max: r.w - 30 });
      para(c.sym, r.x + 22, r.y + 48, r.w - 34, 14, 18, { weight: 700, color: '#5d6879' });
      ctx.restore();
    });
    CAUSES.forEach((_, j) => {
      const c = CAUSES[rIdx[j]], r = causeRect(j), pairedFrom = Object.keys(DS.pair).find((k) => DS.pair[k] === j);
      ctx.save(); ctx.shadowColor = 'rgba(30,60,40,.12)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
      rr(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = pairedFrom != null ? '#eaf3ff' : DS.sel >= 0 ? '#fffdf2' : '#fff'; ctx.fill(); ctx.restore();
      rr(r.x, r.y, r.w, r.h, 14); ctx.strokeStyle = pairedFrom != null ? '#2f7de1' : DS.sel >= 0 ? '#f6c85a' : '#d3dae6'; ctx.lineWidth = pairedFrom != null ? 3 : 1.5; ctx.stroke();
      para(c.text, r.x + 16, r.y + 33 - (wrapLines(c.text, r.w - 32, 15.5).length > 1 ? 9 : 0), r.w - 32, 15.5, 22, { weight: 800, color: '#1b2333' });
    });
    txt(DS.sel >= 0 ? '이제 오른쪽에서 원인이 되는 호르몬 이상을 눌러요' : '왼쪽 증상 카드를 누르고, 알맞은 원인을 짝지어요', 400, 556, { size: 15, weight: 800, color: '#5d6879', align: 'center' });
  }
  function drawCharts(t) {
    panel(14, 14, 772, 576, { r: 18, bg: '#fbfdff' });
    const dm = DS.mode === 'dm';
    txt(dm ? '연령별 당뇨병 환자 비율' : '연령·성별 갑상샘 질환 환자 비율', 36, 52, { size: 21, weight: 800, color: '#1b2333' });
    pill('예시 자료 · 경향을 단순화한 값', 590, 46, { bg: '#f59e0b', color: '#3a2500', size: 14, h: 30, pad: 14 });
    const X0 = 96, X1 = 760, Y0 = 470, Y1 = 118, vmax = dm ? 20 : 8;
    const gy = (v) => Y0 - v / vmax * (Y0 - Y1);
    for (let v = 0; v <= vmax + 0.01; v += dm ? 5 : 2) { ctx.fillStyle = v === 0 ? '#9aa4b5' : '#e3e8f0'; ctx.fillRect(X0, gy(v), X1 - X0, v === 0 ? 2 : 1.5); txt(v + '%', X0 - 10, gy(v), { size: 14, weight: 700, color: '#8a93a3', align: 'right', base: 'middle' }); }
    txt('환자 비율 (%)', 36, 96, { size: 14, weight: 800, color: '#5d6879' });
    const ease = SciSim.ease.outCubic(clamp(DS.anim, 0, 1));
    const hit = [];
    if (dm) {
      const n = DM.v.length, gw = (X1 - X0) / n, bw = Math.min(70, gw * 0.62);
      DM.v.forEach((v, i) => {
        const cx = X0 + gw * (i + 0.5), h = (Y0 - gy(v)) * ease, sel = DS.selBar === i;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = sel ? 12 : 5; ctx.shadowOffsetY = 3;
        ctx.fillStyle = lgrad(0, Y0 - h, 0, Y0, [[0, shade('#e8590c', sel ? 0.25 : 0.1)], [1, '#e8590c']]); rr(cx - bw / 2, Y0 - h, bw, Math.max(0, h), 8); ctx.fill(); ctx.restore();
        txt(v + '%', cx, Y0 - h - 10, { size: sel ? 18 : 16, weight: 800, color: '#b4440a', align: 'center', alpha: ease });
        txt(DM.labels[i], cx, Y0 + 24, { size: 15, weight: 800, color: '#2b3445', align: 'center' });
        hit.push({ i, x: cx - bw / 2 - 6, w: bw + 12 });
      });
    } else {
      const n = TH.labels.length, gw = (X1 - X0) / n, bw = Math.min(46, gw * 0.34);
      TH.labels.forEach((lb, i) => {
        const cx = X0 + gw * (i + 0.5);
        [['f', TH.f[i], '#ec6a96', -1], ['m', TH.m[i], '#4f8cff', 1]].forEach((q) => {
          const h = (Y0 - gy(q[1])) * ease, x = cx + q[3] * (bw / 2 + 3) - bw / 2, sel = DS.selBar && DS.selBar.i === i && DS.selBar.k === q[0];
          ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = sel ? 12 : 5; ctx.shadowOffsetY = 3;
          ctx.fillStyle = lgrad(0, Y0 - h, 0, Y0, [[0, shade(q[2], sel ? 0.3 : 0.12)], [1, q[2]]]); rr(x, Y0 - h, bw, Math.max(0, h), 7); ctx.fill(); ctx.restore();
          txt(q[1] + '%', x + bw / 2, Y0 - h - 8, { size: sel ? 16 : 14, weight: 800, color: shade(q[2], -0.3), align: 'center', alpha: ease });
          hit.push({ i, k: q[0], x: x - 3, w: bw + 6 });
        });
        txt(lb, cx, Y0 + 24, { size: 15, weight: 800, color: '#2b3445', align: 'center' });
      });
      pill('여성', 640, 96, { bg: '#ec6a96', size: 14, h: 26 }); pill('남성', 700, 96, { bg: '#4f8cff', size: 14, h: 26 });
    }
    DS.hit = hit;
    txt('※ 실제 통계가 아니라 경향을 단순화한 예시 자료예요.', 36, 520, { size: 14.5, weight: 800, color: '#b4560a' });
    txt('막대를 누르면 값이 크게 보여요. 그래프를 읽고 어떤 경향이 있는지 발표해 봐요.', 36, 550, { size: 14.5, weight: 700, color: '#5d6879' });
  }
  function updateDisease(dt) { DS.anim = approach(DS.anim, 1, dt, 5); }
  function drawDisease(t) { if (DS.mode === 'match') drawMatch(t); else drawCharts(t); }
  function diseaseDown(p) {
    if (DS.mode === 'match') {
      for (let i = 0; i < CARDS.length; i++) {
        const r = cardRect(i);
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { DS.sel = DS.sel === i ? -1 : i; delete DS.bad[i]; if (DS.pair[i] != null && DS.sel === -1) { } Sound.click(); return true; }
      }
      for (let j = 0; j < CAUSES.length; j++) {
        const r = causeRect(j);
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
          const had = Object.keys(DS.pair).find((k) => DS.pair[k] === j);
          if (DS.sel >= 0) {
            if (had != null) delete DS.pair[had];
            DS.pair[DS.sel] = j; delete DS.bad[DS.sel]; DS.sel = -1; Sound.click();
          } else if (had != null) { delete DS.pair[had]; delete DS.bad[had]; DS.sel = +had; Sound.click(); }
          return true;
        }
      }
      return false;
    }
    if (!DS.hit) return false;
    const h = DS.hit.find((q) => p.x >= q.x && p.x <= q.x + q.w && p.y > 100 && p.y < 500);
    if (h) { DS.selBar = DS.mode === 'dm' ? h.i : { i: h.i, k: h.k }; Sound.click(); return true; }
    DS.selBar = null; return true;
  }

  /* =====================================================
     장면 전환 · 입력 · 단계(미션)
     ===================================================== */
  let F = new Set(), game = null;
  const SCENE_LABEL = { glands: '🩸 호르몬을 내보내는 내분비샘', glucose: '🍬 혈당량 조절 게임', temp: '🌡️ 체온 조절', disease: '📊 호르몬과 질병' };
  function setScene(name) {
    S.scene = name;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === name));
    $$('#ctrlCard .cgrp').forEach((g) => { g.hidden = g.dataset.scene !== name; });
    const ab = $('#autoBtn'); if (ab) ab.hidden = name !== 'glucose';
    $('#sceneLabel').textContent = SCENE_LABEL[name];
    hideHint();
  }
  const handlers = {
    down: (p) => {
      if (S.scene === 'glands') return glandsDown(p);
      if (S.scene === 'temp') return tempDown(p);
      if (S.scene === 'disease') return diseaseDown(p);
      return false;
    },
  };
  view = SciSim.stage($('#cv'), { width: W, height: H, background: BG });
  ctx = view.ctx; D = SciSim.draw(ctx);
  SciSim.pointer(view, handlers);
  initDots();

  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  function setGView(v) {
    GN.view = v; $$('#gvSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    $('#btnRelease').innerHTML = v === 'body' ? '🧪 호르몬 내보내기' : '📨 메시지 보내기';
    $('#gNote').textContent = v === 'body' ? '내분비샘을 눌러 호르몬이 혈액을 따라 표적 기관으로 가는 모습을 봐요.' : '같은 메시지를 신경과 호르몬으로 보내면 어떻게 다른지 비교해요.';
    if (v === 'compare') { CP.auto = -2.5; }
  }
  $$('#gvSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setGView(b.dataset.v); }));
  $('#btnRelease').addEventListener('click', () => {
    if (GN.view === 'compare') { if (!sendBoth()) toast('메시지가 가는 중이에요. 잠깐만요!'); return; }
    if (!GN.sel) { showHint('먼저 몸 그림에서 내분비샘을 눌러요', 3500); return; }
    release(GN.sel);
  });
  $$('#scSeg button').forEach((b) => b.addEventListener('click', () => startScenario(b.dataset.v)));
  $('#btnIns').addEventListener('click', () => pressHormone('ins'));
  $('#btnGlu').addEventListener('click', () => pressHormone('glu'));
  $('#autoBtn').addEventListener('click', () => { Sound.click(); setAuto(!GL.auto); if (GL.auto && GL.sc === 'none') startScenario('meal'); });
  $$('#envSeg button').forEach((b) => b.addEventListener('click', () => setEnv(b.dataset.v)));
  $('#btnReg').addEventListener('click', () => { Sound.click(); setReg(!TP.reg); });
  $$('#dsSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setDsMode(b.dataset.v); }));

  /* ---------- 퀴즈 그림 ---------- */
  const FIG_VEIN = '<svg viewBox="0 0 360 120" width="100%" role="img" aria-label="내분비샘에서 혈관으로 호르몬이 나와 표적 기관에 도착하는 그림"><rect width="360" height="120" fill="#fff"/>' +
    '<ellipse cx="50" cy="60" rx="34" ry="24" fill="#8b5cf6"/><text x="50" y="65" font-size="14" font-weight="800" fill="#fff" text-anchor="middle">내분비샘</text>' +
    '<path d="M86 60 H250" stroke="#ff9aa8" stroke-width="16" stroke-linecap="round"/><path d="M86 60 H250" stroke="#c93b52" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>' +
    '<g fill="#8b5cf6"><polygon points="110,52 118,52 114,44"/><polygon points="160,68 168,68 164,60"/><polygon points="210,52 218,52 214,44"/></g>' +
    '<ellipse cx="305" cy="60" rx="38" ry="28" fill="#e08096"/><text x="305" y="65" font-size="14" font-weight="800" fill="#fff" text-anchor="middle">표적 기관</text>' +
    '<text x="168" y="104" font-size="14" font-weight="800" fill="#c93b52" text-anchor="middle">❓ 이동하는 길</text></svg>';
  const ids = (m, id) => { m.id = id; return m; };

  /* ---------- 단계 ---------- */
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '호르몬이란 무엇일까', short: '호르몬', icon: '🩸', phase: '관찰',
      features: ['glands'],
      intro: '<p class="si-q">❓ 탐구 질문: 밥을 먹은 뒤나 오래 굶은 뒤에도 혈액 속 포도당의 양이 거의 일정한 까닭은 무엇일까?</p>' +
        '<p>몸을 일정하게 조절하는 데에는 신경뿐 아니라 <b>호르몬</b>도 필요해요. 호르몬은 <b>내분비샘</b>에서 만들어 <b>혈액</b>으로 내보내는 물질이에요.</p>' +
        '<p>혈액을 따라 온몸을 돌다가 특정 기관(<b>표적 기관</b>)에만 작용하고, <b>적은 양으로 큰 효과</b>를 내요. 먼저 내분비샘을 찾아봐요.</p>',
      setup() { setScene('glands'); setGView('body'); },
      recap: '호르몬은 <b>내분비샘</b>에서 <b>혈액</b>으로 분비되어 <b>표적 기관</b>에 작용해요. 신경보다 느리지만 넓고 오래 작용해요.',
      summary: '<ul><li><b>호르몬</b>: 내분비샘에서 만들어 혈액으로 내보내요. 혈액을 따라 온몸을 돌다가 <b>표적 기관</b>에 작용하고, 적은 양으로 큰 효과를 내요.</li>' +
        '<li><b>뇌하수체</b> → 성장 호르몬(뼈와 근육의 생장 촉진) / <b>갑상샘</b> → 티록신(세포 호흡 촉진, 체온 유지) / <b>이자</b> → 인슐린(혈당량 낮춤), 글루카곤(혈당량 높임)</li>' +
        '<li>호르몬이 부족하거나 너무 많으면 몸에 이상이 생겨요.</li>' +
        '<li><b>신경</b>: 빠르고, 좁은 범위, 짧게 작용 / <b>호르몬</b>: 느리고, 넓은 범위, 오래 작용</li></ul>',
      missions: [
        ids({
          title: '내분비샘 3곳 찾아보기',
          goal: '몸 그림에서 <b>뇌하수체, 갑상샘, 이자</b>를 눌러 어떤 호르몬이 나오는지 읽어요.',
          hint: '몸 그림에서 이름표가 붙은 곳(머리·목·배)을 눌러 보세요. 읽은 곳에는 ✔ 표시가 생겨요.',
          setup() { setScene('glands'); setGView('body'); GN.seen.clear(); GN.sel = null; showHint('🩸 몸 그림의 내분비샘을 눌러 봐요', 6000); },
          check: () => GN.seen.size >= 3, hold: 0.5,
          status: () => '살펴본 곳 <b>' + GN.seen.size + ' / 3</b> &nbsp; ' + [['pit', '뇌하수체'], ['thy', '갑상샘'], ['pan', '이자']].map((q) => mark(GN.seen.has(q[0])) + q[1]).join(' '),
          explain: '<b>뇌하수체</b>는 성장 호르몬, <b>갑상샘</b>은 티록신, <b>이자</b>는 인슐린과 글루카곤을 혈액으로 내보내요. 호르몬은 혈액을 따라 이동해 표적 기관에 작용해요.',
        }, 'explore'),
        ids({
          title: '신경과 호르몬 비교하기',
          goal: '<b>⚡ 신경 vs 호르몬</b> 화면으로 바꾸고, 신경 신호와 호르몬이 <b>각각 도착하는 모습</b>을 지켜봐요.',
          hint: '위쪽 “신경 vs 호르몬” 단추를 누르면 메시지가 저절로 출발해요. 📨 메시지 보내기를 눌러도 돼요. 어느 쪽이 먼저 도착하나요?',
          setup() { setScene('glands'); GN.sent = { n: 0, h: 0 }; setGView('compare'); },
          check: () => GN.sent.n >= 1 && GN.sent.h >= 1, hold: 0.3,
          status: () => mark(GN.sent.n >= 1) + ' 신경 신호 도착 &nbsp; ' + mark(GN.sent.h >= 1) + ' 호르몬 도착',
          explain: '신경은 <b>빠르고 좁은 범위</b>에 짧게, 호르몬은 혈액을 따라 <b>느리지만 넓은 범위</b>에 오래 작용해요. 호르몬은 온몸을 돌지만 <b>표적 기관</b>만 반응해요.',
        }, 'compare'),
        {
          type: 'quiz', title: '호르몬이 이동하는 길', figure: FIG_VEIN,
          goal: '내분비샘에서 나온 호르몬은 무엇을 따라 <b>표적 기관</b>까지 이동할까요?',
          setup() { setScene('glands'); },
          choices: ['혈액(혈관)', '신경(뉴런)', '소화관', '공기 중으로 퍼져요'],
          answer: 0,
          feedback: ['', '신경은 신호를 전달하는 길이에요. 호르몬은 뉴런을 따라 이동하지 않아요.', '소화관은 음식물이 지나가는 길이에요. 호르몬은 혈액으로 분비돼요.', '호르몬은 몸속에서 혈액에 실려 이동해요.'],
          explain: '호르몬은 내분비샘에서 <b>혈액으로 분비</b>되어 혈액을 따라 온몸을 돌고, 표적 기관에 작용해요. 그래서 신경보다 느리지만 넓은 범위에 작용해요.',
        },
      ],
    },
    /* ---------- 2단계 · 실험 ---------- */
    {
      title: '혈당량 조절 게임', short: '혈당량 조절', icon: '🍬', phase: '실험',
      features: ['glucose'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 이자가 <b>인슐린과 글루카곤</b>을 혈액으로 내보내는 것을 보았어요.</div>' +
        '<p>혈액 속 포도당의 양(<b>혈당량</b>)은 정상일 때 약 <b>70~110 mg/dL</b>로 유지돼요. 식사를 하면 올라가고, 운동하거나 굶으면 내려가요.</p>' +
        '<p><b>인슐린</b>은 혈당량을 낮추고, <b>글루카곤</b>은 혈당량을 높여요. 직접 호르몬 단추를 눌러 혈당량을 정상 범위로 되돌려 봐요.</p>',
      setup() { setScene('glucose'); setAuto(false); },
      recap: '<b>인슐린</b>은 혈당량을 낮추고 <b>글루카곤</b>은 높여서, 혈당량을 <b>70~110 mg/dL</b>로 일정하게 유지해요.',
      summary: '<ul><li>혈당량 정상 범위: 약 <b>70~110 mg/dL</b></li>' +
        '<li>식사 후 혈당량 ↑ → 이자에서 <b>인슐린</b> 분비 → 포도당이 세포로 들어가고 간에서 <b>글리코젠</b>으로 저장 → 혈당량 ↓</li>' +
        '<li>운동·공복으로 혈당량 ↓ → 이자에서 <b>글루카곤</b> 분비 → 간의 글리코젠이 포도당으로 분해 → 혈당량 ↑</li>' +
        '<li>이렇게 몸 안팎이 변해도 몸의 상태를 일정하게 유지하는 것을 <b>항상성</b>이라고 해요. 간뇌가 조절 중추예요.</li></ul>',
      missions: [
        ids({
          title: '식사 후 혈당량 낮추기',
          goal: '<b>식사</b> 후 올라간 혈당량을 <b>💉 인슐린</b>으로 낮춰서 정상 범위(70~110)에 <b>2초</b> 동안 머물러요.',
          hint: '식사가 끝나는 35분까지 혈당량이 오르는 동안 기다리지 말고 인슐린 단추를 여러 번 눌러 봐요. 너무 많이 누르면 70 아래로 내려가요.',
          setup() { setScene('glucose'); setAuto(false); startScenario('meal'); showHint('💉 혈당량이 오르면 인슐린을 눌러요', 6000); },
          check: () => GL.sc === 'meal' && !GL.auto && GL.m >= 35 && GL.pI > 0 && inBand(GL.G), hold: 2,
          status: () => '혈당량 <b>' + Math.round(GL.G) + '</b> mg/dL ' + (inBand(GL.G) ? '✅ 정상' : GL.G > 110 ? '⬆ 높아요' : '⬇ 낮아요') + ' · 인슐린 ' + GL.pI + '번 · 식사 ' + (GL.m >= 35 ? '끝' : '중'),
          explain: '식사 후에는 혈당량이 올라가요. <b>인슐린</b>이 분비되면 포도당이 세포로 들어가고 간에서 <b>글리코젠</b>으로 저장되어 혈당량이 낮아져요.',
        }, 'meal'),
        ids({
          title: '운동 후 혈당량 높이기',
          goal: '<b>운동</b> 때문에 내려간 혈당량을 <b>🍬 글루카곤</b>으로 올려서 정상 범위(70~110)에 <b>2초</b> 동안 머물러요.',
          hint: '운동하는 동안 세포가 포도당을 많이 써서 혈당량이 내려가요. 70 아래로 내려가면 글루카곤 단추를 눌러 간의 글리코젠을 분해하게 해요.',
          setup() { setScene('glucose'); setAuto(false); startScenario('exercise'); showHint('🍬 혈당량이 내려가면 글루카곤을 눌러요', 6000); },
          check: () => GL.sc === 'exercise' && !GL.auto && GL.m >= 30 && GL.pG > 0 && inBand(GL.G), hold: 2,
          status: () => '혈당량 <b>' + Math.round(GL.G) + '</b> mg/dL ' + (inBand(GL.G) ? '✅ 정상' : GL.G > 110 ? '⬆ 높아요' : '⬇ 낮아요') + ' · 글루카곤 ' + GL.pG + '번 · 운동 ' + (GL.m >= 30 ? '끝' : '중'),
          explain: '운동하면 세포가 포도당을 많이 써서 혈당량이 내려가요. <b>글루카곤</b>이 분비되면 간의 <b>글리코젠이 포도당으로 분해</b>되어 혈당량이 올라가요.',
        }, 'exercise'),
        {
          type: 'quiz', title: '건강한 몸의 자동 조절',
          goal: '화면에서 <b>건강한 몸의 자동 조절</b>이 재생돼요. 식사 후 혈당량이 올라갈 때 건강한 몸에서 일어나는 일은?',
          setup() { setScene('glucose'); setAuto(true); startScenario('meal'); },
          choices: ['이자에서 인슐린이 분비되어 혈당량이 낮아져요', '이자에서 글루카곤이 분비되어 혈당량이 더 올라가요', '간에서 글리코젠이 포도당으로 분해돼요', '아무 일도 일어나지 않고 혈당량이 계속 올라가요'],
          answer: 0,
          feedback: ['', '글루카곤은 혈당량이 낮을 때 분비되어 혈당량을 높여요. 혈당량이 높을 때는 반대로 작용하는 인슐린이 나와요.', '글리코젠 분해는 혈당량이 낮을 때 일어나요. 식사 후에는 오히려 포도당이 글리코젠으로 저장돼요.', '건강한 몸은 혈당량이 변하면 호르몬으로 바로 조절해서 일정하게 유지해요. (이것을 항상성이라고 해요.)'],
          explain: '혈당량이 올라가면 이자에서 <b>인슐린</b>이 나와 혈당량을 낮추고, 내려가면 <b>글루카곤</b>이 나와 높여요. 두 호르몬이 서로 반대로 작용하며 혈당량을 일정하게 지켜요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '체온 조절', short: '체온 조절', icon: '🌡️', phase: '설명',
      features: ['temp'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 혈당량이 호르몬으로 일정하게 유지되는 것을 보았어요.</div>' +
        '<p>체온도 추운 날이나 더운 날에 관계없이 약 <b>37 °C</b>로 유지돼요. 체온 조절의 중추는 <b>간뇌</b>예요.</p>' +
        '<p>간뇌가 체온 변화를 알아차리면 <b>신경</b>(혈관·근육·땀샘)과 <b>호르몬</b>(티록신)이 함께 작용해요. 추운 날과 더운 날을 비교해 봐요.</p>',
      setup() { setScene('temp'); TP.pick = false; setReg(true); setEnv('normal'); },
      recap: '<b>간뇌</b>가 체온 변화를 감지하면 <b>신경과 호르몬</b>이 함께 작용해 체온을 약 37 °C로 유지해요.',
      summary: '<ul><li>체온 조절 중추는 <b>간뇌</b>예요. 신경과 호르몬이 함께 몸을 최적의 상태로 유지해요.</li>' +
        '<li><b>추울 때</b>: 피부 근처 혈관 <b>수축</b>(열 방출 ↓), <b>몸 떨림</b>(열 발생 ↑), <b>티록신 분비 ↑</b>(세포 호흡 촉진)</li>' +
        '<li><b>더울 때</b>: 피부 근처 혈관 <b>확장</b>(열 방출 ↑), <b>땀 분비 ↑</b>(땀이 증발하며 열을 빼앗아요)</li>' +
        '<li>몸 안팎의 환경이 변해도 체온·혈당량 등을 일정하게 유지하는 성질을 <b>항상성</b>이라고 해요.</li></ul>',
      missions: [
        ids({
          title: '추운 날과 더운 날 비교하기',
          goal: '<b>🥶 추운 날</b>과 <b>☀️ 더운 날</b>을 각각 <b>3초 이상</b> 살펴봐요. 간뇌 조절은 켜 둔 채로요.',
          hint: '위쪽 단추로 날씨를 바꿔요. 피부 혈관의 굵기와 땀, 체온계의 숫자를 지켜보세요.',
          setup() { setScene('temp'); TP.pick = false; TP.tCold = 0; TP.tHot = 0; setReg(true); showHint('🌡️ 추운 날과 더운 날을 골라 봐요', 6000); },
          check: () => TP.tCold >= 3 && TP.tHot >= 3, hold: 0.3,
          status: () => mark(TP.tCold >= 3) + ' 추운 날 ' + Math.min(3, Math.floor(TP.tCold)) + '/3초 &nbsp; ' + mark(TP.tHot >= 3) + ' 더운 날 ' + Math.min(3, Math.floor(TP.tHot)) + '/3초',
          explain: '추울 때는 <b>혈관이 수축</b>하고 몸이 떨리고 <b>티록신</b>이 늘어요. 더울 때는 <b>혈관이 확장</b>되고 <b>땀</b>이 나요. 덕분에 체온이 약 37 °C로 유지돼요.',
        }, 'envs'),
        ids({
          title: '추울 때 일어나는 반응 고르기', manual: true,
          goal: '추운 날에 일어나는 반응 <b>3가지</b>를 오른쪽 아래 칸에서 눌러 고르고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '추울 때는 열이 몸 밖으로 덜 나가고(혈관), 열이 더 만들어져요(근육 떨림, 티록신). 노란 점은 신경, 보라 점은 호르몬이에요.',
          setup() { setScene('temp'); TP.pick = true; TP.picks = []; TP.bad = {}; setReg(true); setEnv('cold'); },
          status: () => '고른 반응: <b>' + TP.picks.length + ' / 3</b>',
          check() {
            const p = TP.picks;
            if (p.length < 3) return '아직 ' + (3 - p.length) + '가지를 더 골라야 해요.';
            const bad = p.filter((id) => !COLD_ANS.includes(id));
            if (bad.length) { TP.bad = {}; bad.forEach((id) => { TP.bad[id] = true; }); return '<b>' + bad.map((id) => CHIPS.find((c) => c.id === id).label).join(', ') + '</b>은(는) 추울 때가 아니라 더울 때(또는 반대로) 일어나는 반응이에요.'; }
            TP.bad = {};
            return true;
          },
          explain: '추울 때는 <b>혈관 수축</b>(열 방출 ↓), <b>몸 떨림</b>(열 발생 ↑), <b>티록신 분비 증가</b>(세포 호흡 촉진)가 일어나요. 혈관과 떨림은 신경, 티록신은 호르몬의 작용이에요.',
        }, 'pick'),
        {
          type: 'quiz', title: '신경과 호르몬의 협력',
          goal: '추운 날 체온을 유지하기 위해 <b>신경과 호르몬이 함께 작용하는 모습</b>으로 알맞은 것은?',
          setup() { setScene('temp'); TP.pick = false; setReg(true); setEnv('cold'); },
          choices: ['피부 혈관이 수축하고(신경), 티록신 분비가 늘어요(호르몬)', '피부 혈관이 확장되고 땀이 나요', '티록신이 줄어서 세포 호흡이 느려져요', '신경만 작용하고 호르몬은 아무 관련이 없어요'],
          answer: 0,
          feedback: ['', '혈관 확장과 땀 분비는 더울 때 일어나는 반응이에요.', '추울 때는 티록신이 늘어 세포 호흡이 활발해지고 열이 많이 나요.', '체온 조절에는 신경과 호르몬이 함께 작용해요. 티록신은 갑상샘에서 나오는 호르몬이에요.'],
          explain: '간뇌가 추위를 알아차리면 <b>신경</b>을 통해 혈관이 수축하고 몸이 떨리며, <b>호르몬</b>인 티록신이 늘어 세포 호흡이 활발해져요. 이렇게 신경과 호르몬이 협력해 체온을 일정하게 유지해요.',
        },
      ],
    },
    /* ---------- 4단계 · 분석 ---------- */
    {
      title: '호르몬과 질병', short: '호르몬과 질병', icon: '📊', phase: '분석',
      features: ['disease'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 호르몬이 몸을 알맞게 조절하는 것을 보았어요.</div>' +
        '<p>호르몬이 <b>너무 많거나 부족하면</b> 몸에 이상이 생겨요. 성장 호르몬, 인슐린, 티록신과 관련된 질병을 알아봐요.</p>' +
        '<p>그리고 질병의 <b>연령별·성별 발병 비율</b> 자료를 읽고 경향을 분석해 봐요. 이 화면의 자료는 <b>예시 자료</b>(경향을 단순화한 값)예요.</p>',
      setup() { setScene('disease'); setDsMode('match'); },
      recap: '호르몬이 <b>많거나 적으면 질병</b>이 생겨요. 자료를 읽으면 질병의 <b>연령별·성별 경향</b>을 알 수 있어요.',
      summary: '<ul><li><b>성장 호르몬</b>: 성장기에 많으면 <b>거인증</b>, 부족하면 <b>소인증</b></li>' +
        '<li><b>인슐린</b>: 부족하거나 제대로 작용하지 못하면 혈당량이 높아지는 <b>당뇨병</b></li>' +
        '<li><b>티록신</b>: 많으면 <b>갑상샘 기능 항진증</b>, 부족하면 <b>갑상샘 기능 저하증</b></li>' +
        '<li>예시 자료: 당뇨병은 나이가 많을수록 비율이 높아지고, 갑상샘 질환은 여성이 더 많은 경향이 있어요. (경향을 단순화한 예시 자료)</li></ul>',
      missions: [
        ids({
          title: '증상과 원인 짝짓기', manual: true,
          goal: '증상 카드 5장을 누르고 <b>원인이 되는 호르몬 이상</b>을 눌러 짝지어요. 다 정했으면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '거인증과 소인증은 성장 호르몬, 당뇨병은 인슐린, 갑상샘 질환은 티록신과 관련 있어요. “많다/부족하다”를 증상에서 찾아봐요.',
          setup() { setScene('disease'); setDsMode('match'); resetMatch(); },
          status: () => '짝지은 카드: <b>' + Object.keys(DS.pair).length + ' / 5</b>',
          check() {
            const n = Object.keys(DS.pair).length;
            if (n < 5) return '아직 짝짓지 않은 카드가 있어요. (' + (5 - n) + '장 남음)';
            const bad = CARDS.map((c, i) => (CAUSES[DS.order[DS.pair[i]]].id !== c.ans ? i : -1)).filter((i) => i >= 0);
            bad.forEach((i) => { DS.bad[i] = true; });
            if (bad.length) return '<b>' + bad.map((i) => CARDS[i].name).join(', ') + '</b>의 짝이 맞지 않아요. 어떤 호르몬이 너무 많은지, 부족한지 증상에서 단서를 찾아봐요.';
            DS.bad = {};
            return true;
          },
          explain: '<b>성장 호르몬</b>이 많으면 거인증, 부족하면 소인증이에요. <b>인슐린</b>이 부족하면 당뇨병, <b>티록신</b>이 많으면 항진증, 부족하면 저하증이에요.',
        }, 'dmatch'),
        {
          type: 'quiz', title: '연령별 당뇨병 자료 해석',
          goal: '화면의 <b>연령별 당뇨병</b> 그래프(예시 자료)에서 알 수 있는 경향으로 알맞은 것은?',
          setup() { setScene('disease'); setDsMode('dm'); },
          choices: ['나이가 많을수록 당뇨병 환자 비율이 높아져요', '나이가 많을수록 당뇨병 환자 비율이 낮아져요', '20대에서 당뇨병 환자 비율이 가장 높아요', '나이와 당뇨병 환자 비율은 관계가 없어요'],
          answer: 0,
          feedback: ['', '막대가 오른쪽(나이가 많은 쪽)으로 갈수록 높아지고 있어요. 그래프를 다시 읽어 봐요.', '20대의 막대가 가장 낮아요. 비율이 가장 높은 쪽은 70대 이상이에요.', '막대의 높이가 나이에 따라 뚜렷하게 달라지고 있어요. 관계가 있어 보여요.'],
          explain: '예시 자료에서 당뇨병 환자 비율은 <b>나이가 많을수록 높아져요</b>. 이런 경향을 바탕으로 건강한 식습관과 운동 같은 예방 방법을 발표해 볼 수 있어요.',
        },
        {
          type: 'quiz', title: '성별 갑상샘 질환 자료 해석',
          goal: '화면의 <b>갑상샘 질환</b> 그래프(예시 자료)에서 알 수 있는 내용으로 알맞은 것은?',
          setup() { setScene('disease'); setDsMode('th'); },
          choices: ['모든 연령대에서 갑상샘 질환은 여성이 남성보다 많아요', '모든 연령대에서 갑상샘 질환은 남성이 여성보다 많아요', '남성과 여성의 비율이 같아요', '나이가 많아지면 갑상샘 질환이 모두 사라져요'],
          answer: 0,
          feedback: ['', '분홍색(여성) 막대가 파란색(남성) 막대보다 더 높아요.', '두 막대의 높이가 서로 달라요. 어느 쪽이 더 높은지 확인해 봐요.', '나이가 많아질수록 막대가 오히려 조금 높아져요.'],
          explain: '예시 자료에서 갑상샘 질환 환자 비율은 <b>여성이 남성보다 높아요</b>. 자료를 해석할 때는 이렇게 <b>비교하고 경향</b>을 찾는 것이 중요해요.',
        },
      ],
    },
  ];

  /* ---------- 시작 ---------- */
  game = SciSim.game({
    simId: 'm3-hormones',
    mount: '#game',
    badge: '호르몬 박사',
    homeHref: '../../index.html#g3',
    featureLabels: {
      glands: '🩸 내분비샘과 혈액 모형',
      glucose: '🍬 혈당량 조절 게임',
      temp: '🌡️ 체온 조절 모형',
      disease: '📊 질병과 예시 자료',
    },
    onFeatures(set) { F = new Set(set); },
    onMissionStart() { hideHint(); TP.pick = false; },
    onComplete() { TP.pick = false; },
    levels,
  });

  window.__sim = {
    S, GN, CP, GL, TP, DS, CARDS, CAUSES, GLAND, game, setScene, setGView, release, sendBoth, startScenario, setAuto, pressHormone, setEnv, setReg, setDsMode, chipRect, cardRect, causeRect,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
  };

  SciSim.loop((dt, t) => {
    if (S.scene === 'glands') { updateGlands(dt); updateCompare(dt); }
    else if (S.scene === 'glucose') updateGlucose(dt);
    else if (S.scene === 'temp') updateTemp(dt, t);
    else updateDisease(dt);
    PFX.update(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    if (S.scene === 'glands') { if (GN.view === 'body') drawGlandsBody(t); else drawCompare(t); }
    else if (S.scene === 'glucose') drawGlucoseScene(t);
    else if (S.scene === 'temp') drawTempScene(t);
    else drawDisease(t);
    PFX.draw(ctx);
    drawHint();
  });
})();
