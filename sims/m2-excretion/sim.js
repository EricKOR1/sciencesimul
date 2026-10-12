/* =========================================================
   중2 Ⅵ. 동물과 에너지 — 배설계와 오줌의 생성 [9과13-04]
   ① [관찰] 노폐물: 영양소가 분해될 때 생기는 노폐물을 폐·간·콩팥으로 분류
   ② [탐구] 콩팥 구조: 배설계 → 콩팥 단면 → 네프론 (사구체·보먼주머니·세뇨관)
   ③ [모형] 오줌 생성: 여과(필터 구멍 크기) · 재흡수 · 분비를 네프론 모형으로
   ④ [적용] 모식도: 여과·재흡수·분비 화살표를 모식도에 배치
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const EASE = SciSim.ease;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const now = () => performance.now() / 1000;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const W = 800, H = 600;
  const BG = '#eef4f1';
  let view = null, ctx = null, D = null;

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
  function panel(x, y, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = 'rgba(30,60,40,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, o.r || 16); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(x, y, w, h, o.r || 16); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
  }
  const inR = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const inC = (p, c, pad) => Math.hypot(p.x - c.x, p.y - c.y) <= c.r + (pad || 0);
  const PFX = new SciSim.Particles();
  function burst(x, y, colors, n, o) { PFX.burst(x, y, Object.assign({ count: n || 18, colors: colors || ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], speed: 150, gravity: 120, size: 4 }, o || {})); }
  const rgba = SciSim.color.rgba;
  const shade = SciSim.color.shade;
  const mix = SciSim.color.mix;
  function lgrad(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function rgrad(c, x0, y0, r0, x1, y1, r1, stops) { const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
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
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* ---------- 경로(폴리라인) ---------- */
  function densify(pts, step) {
    const out = [], n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      const k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    out.push(pts[n - 1].slice());
    return out;
  }
  class Path {
    constructor(pts) {
      this.p = pts; this.cum = [0];
      for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      this.len = this.cum[this.cum.length - 1];
    }
    idx(s) {
      const c = this.cum; let lo = 0, hi = c.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
      return lo;
    }
    at(s, o) {
      o = o || {};
      s = clamp(s, 0, this.len);
      const i = this.idx(s), a = this.p[i], b = this.p[Math.min(i + 1, this.p.length - 1)];
      const seg = this.cum[Math.min(i + 1, this.cum.length - 1)] - this.cum[i];
      const t = seg > 0 ? (s - this.cum[i]) / seg : 0;
      o.x = a[0] + (b[0] - a[0]) * t; o.y = a[1] + (b[1] - a[1]) * t;
      o.a = Math.atan2(b[1] - a[1], b[0] - a[0]);
      return o;
    }
    stroke(c, from, to) {
      const i0 = from == null ? 0 : this.idx(from), i1 = to == null ? this.p.length - 1 : Math.min(this.p.length - 1, this.idx(to) + 1);
      c.beginPath();
      c.moveTo(this.p[i0][0], this.p[i0][1]);
      for (let i = i0 + 1; i <= i1; i++) c.lineTo(this.p[i][0], this.p[i][1]);
    }
  }

  /* =========================================================
     네프론 기하 (가상 좌표 800×600)
     ========================================================= */
  const CAPS = { cx: 250, cy: 150, rx: 140, ry: 105 };      // 보먼주머니
  const WALL_Y = 224;                                         // 여과막(사구체 모세 혈관 벽) 높이
  const GAPS = [210, 250, 290];                               // 여과막 구멍 중심
  const TW = 24;                                              // 관 굵기

  // 세뇨관(중심선)
  const tubePts = [[250, 255], [250, 288]];
  for (let y = 298; y <= 470; y += 9) {
    const k = (y - 298) / 172, e = Math.min(1, k * 7, (1 - k) * 7);
    tubePts.push([250 + 13 * e * Math.sin(k * TAU * 1.9), y]);
  }
  tubePts.push([250, 488], [262, 518], [308, 542], [392, 551], [472, 541], [528, 517], [554, 472], [556, 420], [556, 372], [568, 336], [606, 320], [650, 330], [684, 364], [696, 420], [697, 470], [697, 496]);
  const TUBE = new Path(densify(tubePts, 5));
  const U_PROX0 = TUBE.cum[TUBE.p.findIndex((p) => p[1] >= 300)];
  const U_PROX1 = TUBE.cum[TUBE.p.findIndex((p) => p[1] >= 468)];
  const U_BOT0 = U_PROX1 + 10;
  const U_ASC0 = TUBE.cum[TUBE.p.findIndex((p, i) => i > 40 && p[0] > 540 && p[1] <= 480 && TUBE.p[i - 1][1] > 480)] || U_BOT0 + 200;
  const U_CAP1 = TUBE.cum[TUBE.p.findIndex((p, i) => i > 40 && p[0] > 540 && p[1] <= 376)];
  const U_END = TUBE.len;

  // 혈액 경로: 들세동맥 → 사구체 → 날세동맥 → 세뇨관 주변 모세 혈관 → 정맥
  const bloodA = densify([[18, 40], [110, 46], [186, 64], [168, 108], [196, 160], [216, 200], [250, 208], [284, 200], [304, 160], [332, 108], [314, 64], [400, 52], [486, 100], [484, 196], [404, 268], [326, 296]], 5);
  function capillaryPoint(u, off) {
    const a = TUBE.at(Math.max(0, u - 45)), b = TUBE.at(Math.min(TUBE.len, u + 45)), c = TUBE.at(u);
    const tx = b.x - a.x, ty = b.y - a.y, L = Math.hypot(tx, ty) || 1;
    return [c.x + (ty / L) * off, c.y - (tx / L) * off];
  }
  const CAP_OFF = 34;
  const capPts = [], capU = [];
  { // 세뇨관 바깥(안쪽 공간 쪽)을 따라가는 모세 혈관
    for (let u = U_PROX0 - 8; u <= U_CAP1; u += 7) {
      const p = capillaryPoint(u, CAP_OFF);
      capPts.push(p); capU.push(u);
    }
  }
  const bloodAll = (function () {
    const a = bloodA.slice(0, -1);
    const first = capPts[0];
    const pts = a.concat([[ (a[a.length - 1][0] + first[0]) / 2, (a[a.length - 1][1] + first[1]) / 2 ]]);
    const joined = pts.concat(capPts);
    const lastCap = capPts[capPts.length - 1];
    const tail = [[lastCap[0], lastCap[1]], [lastCap[0] - 2, lastCap[1] - 40], [536, 282], [588, 202], [668, 118], [760, 70], [830, 52]];
    return joined.concat(densify(tail, 5).slice(1));
  })();
  const BLOOD = new Path(bloodAll);
  const S_FILTER = (function () { let best = 0, bd = 1e9; BLOOD.p.forEach((p, i) => { const c = BLOOD.cum[i]; if (c < 150 || c > 520) return; const d = Math.hypot(p[0] - 250, p[1] - 208); if (d < bd) { bd = d; best = c; } }); return best; })();
  const capCum = [];
  { let acc = 0; for (let i = 0; i < capPts.length; i++) { if (i) acc += Math.hypot(capPts[i][0] - capPts[i - 1][0], capPts[i][1] - capPts[i - 1][1]); capCum.push(acc); } }
  const S_CAP_START = BLOOD.cum[bloodA.length];
  function sOfU(u) { // 세뇨관 위치 u → 혈액 경로 위치 s
    let lo = 0, hi = capU.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (capU[m] <= u) lo = m; else hi = m; }
    const t = (u - capU[lo]) / Math.max(1e-6, capU[hi] - capU[lo]);
    return S_CAP_START + capCum[lo] + (capCum[hi] - capCum[lo]) * clamp(t, 0, 1);
  }
  function uOfS(s) {
    const d = s - S_CAP_START;
    if (d <= 0) return capU[0];
    let lo = 0, hi = capCum.length - 1;
    if (d >= capCum[hi]) return capU[hi];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (capCum[m] <= d) lo = m; else hi = m; }
    const t = (d - capCum[lo]) / Math.max(1e-6, capCum[hi] - capCum[lo]);
    return capU[lo] + (capU[hi] - capU[lo]) * t;
  }
  const URETER = new Path([[697, 494], [697, 540]]);

  /* 입자 종류 (색 · 크기 · 모양) — 크기(반지름)가 여과 여부를 정해요 */
  const TYPES = {
    rbc:   { name: '적혈구',   r: 10,  color: '#dc2626', shape: 'disc', big: true,  w: 13 },
    prot:  { name: '단백질',   r: 8,   color: '#8b5cf6', shape: 'blob', big: true,  w: 13 },
    water: { name: '물',       r: 3,   color: '#38bdf8', shape: 'dot',  big: false, w: 30 },
    gluc:  { name: '포도당',   r: 4.6, color: '#f59e0b', shape: 'hex',  big: false, w: 11 },
    amino: { name: '아미노산', r: 4.0, color: '#22c55e', shape: 'dia',  big: false, w: 9 },
    salt:  { name: '무기염류', r: 3.5, color: '#e2e8f0', shape: 'dot',  big: false, w: 13, edge: '#64748b' },
    urea:  { name: '요소',     r: 3.6, color: '#92400e', shape: 'dot',  big: false, w: 11 },
  };
  const TKEYS = Object.keys(TYPES);
  const SMALL = TKEYS.filter((k) => !TYPES[k].big);
  const BIGK = TKEYS.filter((k) => TYPES[k].big);
  const TOTALW = TKEYS.reduce((a, k) => a + TYPES[k].w, 0);
  const poreOf = (v) => 2 + v * 0.11;             // 슬라이더 0~100 → 구멍 반지름 2~13
  const PORE_LO = 4.9, PORE_HI = 7.9;              // 알맞은 범위: 포도당(4.6)은 통과, 단백질(8)은 못 통과

  /* =========================================================
     상태
     ========================================================= */
  const S = {
    scene: 'waste', sceneT: 1, prevScene: null,
    view: 'sys', viewMix: 1, prevView: null, visited: new Set(['sys']),
    found: new Set(), focus: null, msg: '', msgT: 0, msgKind: 'info',
    pore: 90, poreDraw: poreOf(90), reabs: true, reabsDraw: 1,
    modelStage: 0,               // 0: 여과만, 1: 재흡수·분비까지
    parts: [], spawnT: 0, bladder: 0.12, bladderDraw: 0.12, voidT: 0,
    stat: { passed: {}, blocked: {}, urine: {} }, statT: 0, leakT: -99, stuckT: -99,
    offTime: 0, onAfterOff: 0, everOff: false,
    diagram: { cards: [], placed: [null, null, null], drag: null, done: false, pulse: 0 },
    t: 0,
  };
  function resetStats() { S.stat = { passed: {}, blocked: {}, urine: {} }; TKEYS.forEach((k) => { S.stat.passed[k] = 0; S.stat.blocked[k] = 0; S.stat.urine[k] = 0; }); }
  resetStats();
  const PFX = new SciSim.Particles();
  function burst(x, y, colors, n, o) { PFX.burst(x, y, Object.assign({ count: n || 18, colors: colors || ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], speed: 150, gravity: 120, size: 4 }, o || {})); }
  function say(text, kind) { S.msg = text; S.msgT = 4.2; S.msgKind = kind || 'info'; }
  let F = new Set();
  let game = null;
  const has = (n) => (game ? game.has(n) : F.has(n));

  /* =========================================================
     네프론 시뮬레이션: 혈액 → 여과 → 세뇨관 → 재흡수·분비 → 오줌
     ========================================================= */
  function approach(c, t, dt, r) { return RM ? t : SciSim.approach(c, t, dt, r); }
  function pickType() {
    let r = Math.random() * TOTALW;
    for (const k of TKEYS) { r -= TYPES[k].w; if (r <= 0) return k; }
    return 'water';
  }
  function mkPart(type, st) {
    const T = TYPES[type];
    return { type, T, st: st || 'blood', s: 0, u: 0, x: 0, y: 0, v: 88 + Math.random() * 22, tried: false, reU: null, secS: null,
      mv: null, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 2, wob: 0, ph: Math.random() * TAU };
  }
  function spawnBlood(initial) {
    const p = mkPart(pickType(), 'blood');
    p.s = initial != null ? initial : 0;
    if (p.type === 'urea' && Math.random() < 0.55) p.secS = sOfU(U_ASC0 + 25 + Math.random() * (U_CAP1 - U_ASC0 - 55));
    BLOOD.at(p.s, p);
    S.parts.push(p);
  }
  function setMove(p, x1, y1, dur, ease, then) {
    p.mv = { x0: p.x, y0: p.y, x1, y1, k: 0, dur: RM ? 0.01 : dur, ease: ease || EASE.inOutQuad, then };
    p.st = 'mv';
  }
  function reabsTrigger(type) {
    const r = Math.random();
    if (type === 'gluc' || type === 'amino') return U_PROX0 + 25 + Math.random() * (U_PROX1 - U_PROX0 - 50);
    if (type === 'water' || type === 'salt') {
      const pa = type === 'water' ? 0.55 : 0.5, pb = type === 'water' ? 0.30 : 0.36;
      if (r < pa) return U_PROX0 + 25 + Math.random() * (U_PROX1 - U_PROX0 - 50);
      if (r < pa + pb) return U_BOT0 + Math.random() * (U_ASC0 - U_BOT0 + 60);
    }
    return null;
  }
  function enterTubule(p) {
    p.st = 'tube'; p.u = 0; p.reU = reabsTrigger(p.type); p.v = 78 + Math.random() * 14;
    TUBE.at(0, p);
  }
  function startFilterAttempt(p) {
    let gx = GAPS[0];
    GAPS.forEach((g) => { if (Math.abs(g - p.x) < Math.abs(gx - p.x)) gx = g; });
    p.sSave = p.s;
    setMove(p, gx, WALL_Y - 9, 0.26, EASE.outCubic, () => {
      const pass = p.T.r <= S.poreDraw + 0.05;
      if (pass) {
        S.stat.passed[p.type]++;
        if (p.T.big) S.leakT = S.t;
        setMove(p, gx, WALL_Y + 32, 0.34, EASE.inOutQuad, () => {
          setMove(p, 250 + (Math.random() - 0.5) * 8, 256, 0.55, EASE.inOutQuad, () => enterTubule(p));
        });
      } else {
        S.stat.blocked[p.type]++;
        if (!p.T.big) S.stuckT = S.t;
        p.wob = 0.35;
        const back = p.sSave + 14;
        PFX.emit({ x: gx, y: WALL_Y - 16, vy: -22, life: 0.7, size: 6, color: '#ef4444', shape: 'star' });
        p.holdT = 0.18;
        p.mv = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, k: 0, dur: 0.2, ease: EASE.linear, then() {
          const bp = BLOOD.at(back);
          setMove(p, bp.x, bp.y, 0.32, EASE.outCubic, () => { p.st = 'blood'; p.s = back; });
        } };
        p.st = 'mv';
      }
    });
  }
  function startCross(p, dir) {
    const u = dir === 'reabs' ? p.u : uOfS(p.s);
    const T = TUBE.at(u), cp = capillaryPoint(u, CAP_OFF);
    const from = dir === 'reabs' ? { x: T.x, y: T.y } : { x: cp[0], y: cp[1] };
    const to = dir === 'reabs' ? { x: cp[0], y: cp[1] } : { x: T.x, y: T.y };
    p.x = from.x; p.y = from.y;
    setMove(p, to.x, to.y, 0.6, EASE.inOutQuad, () => {
      if (dir === 'reabs') { p.st = 'blood'; p.s = sOfU(u); p.tried = true; p.secS = null; }
      else { p.st = 'tube'; p.u = u; p.reU = null; p.v = 78 + Math.random() * 14; }
    });
    S.pulseAt = S.pulseAt || {};
    S.pulseAt[dir] = S.t;
  }

  function updateNeph(dt) {
    S.t += dt;
    S.poreDraw = approach(S.poreDraw, poreOf(S.pore), dt, 10);
    S.reabsDraw = approach(S.reabsDraw, S.reabs ? 1 : 0, dt, 8);
    S.spawnT -= dt;
    if (S.spawnT <= 0 && S.parts.length < 150) { S.spawnT += 0.36; spawnBlood(); }
    const P = S.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.rot += p.vr * dt;
      if (p.wob > 0) p.wob = Math.max(0, p.wob - dt);
      if (p.st === 'blood') {
        p.s += p.v * dt;
        BLOOD.at(p.s, p);
        if (!p.tried && p.s >= S_FILTER) {
          p.tried = true;
          if (Math.random() < 0.62) startFilterAttempt(p);
        }
        if (p.secS != null && p.s >= p.secS) {
          const go = S.reabs; p.secS = null;
          if (go) startCross(p, 'secrete');
        }
        if (p.s >= BLOOD.len && p.st === 'blood') P.splice(i, 1);
      } else if (p.st === 'mv') {
        const m = p.mv;
        m.k += dt / m.dur;
        const e = m.ease(Math.min(1, m.k));
        p.x = m.x0 + (m.x1 - m.x0) * e; p.y = m.y0 + (m.y1 - m.y0) * e;
        if (m.k >= 1) { p.mv = null; m.then && m.then(); }
      } else if (p.st === 'tube') {
        p.u += p.v * dt;
        TUBE.at(p.u, p);
        if (p.reU != null && p.u >= p.reU && S.reabs) { p.reU = null; startCross(p, 'reabs'); }
        else if (p.u >= U_END - 2) {
          S.stat.urine[p.type]++;
          p.st = 'urine'; p.u = 0;
        }
      } else if (p.st === 'urine') {
        p.u += 70 * dt;
        URETER.at(p.u, p);
        if (p.u >= URETER.len) {
          S.bladder = S.bladder + (p.type === 'water' ? 0.006 : 0.012);
          P.splice(i, 1);
        }
      }
    }
    S.bladderDraw = approach(S.bladderDraw, Math.min(1, S.bladder), dt, 3);
    if (S.bladder >= 1.02) { S.bladder = 0.1; PFX.burst(697, 580, { count: 10, colors: ['#fde047', '#facc15'], speed: 60, gravity: 200, size: 3 }); }
  }
  function resetNeph(prewarm) {
    S.parts.length = 0; S.spawnT = 0; resetStats();
    if (prewarm) { for (let i = 0; i < 170; i++) updateNeph(0.05); S.t = 0; resetStats(); }
  }
  function filterOK() {
    const smallPassed = SMALL.every((k) => S.stat.passed[k] >= 1);
    const bigBlocked = BIGK.every((k) => S.stat.blocked[k] >= 1) && BIGK.every((k) => S.stat.passed[k] === 0);
    return S.poreDraw >= PORE_LO && S.poreDraw <= PORE_HI && smallPassed && bigBlocked;
  }

  /* =========================================================
     그리기: 네프론
     ========================================================= */
  let nephCache = null;
  function paintNephStatic(c) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    // 보먼주머니 안쪽 공간
    c.beginPath(); c.ellipse(CAPS.cx, CAPS.cy, CAPS.rx, CAPS.ry, 0, 0, TAU);
    c.fillStyle = lgrad(c, 0, CAPS.cy - CAPS.ry, 0, CAPS.cy + CAPS.ry, [[0, '#fffbe6'], [1, '#fff0b8']]); c.fill();
    c.strokeStyle = '#d3a04a'; c.lineWidth = 11; c.stroke();
    c.strokeStyle = '#f6dfa0'; c.lineWidth = 6; c.stroke();
    // 세뇨관 (깔때기 + 관)
    c.beginPath(); c.moveTo(670, 458); c.lineTo(724, 458); c.lineTo(712, 502); c.lineTo(682, 502); c.closePath();
    c.fillStyle = '#fff3c9'; c.fill(); c.strokeStyle = '#d3a04a'; c.lineWidth = 4; c.stroke();
    URETER.stroke(c); c.strokeStyle = '#d3a04a'; c.lineWidth = 14; c.stroke(); c.strokeStyle = '#fff3c9'; c.lineWidth = 8; c.stroke();
    TUBE.stroke(c); c.strokeStyle = '#c2893a'; c.lineWidth = TW + 6; c.stroke();
    TUBE.stroke(c); c.strokeStyle = '#f3dca0'; c.lineWidth = TW; c.stroke();
    TUBE.stroke(c); c.strokeStyle = '#fffaf0'; c.lineWidth = TW - 8; c.stroke();
    c.beginPath(); c.arc(250, 254, 9, 0, TAU); c.fillStyle = '#fff5cf'; c.fill();
    // 사구체를 이루는 장식용 모세 혈관 고리
    [[250, 138, 66, 38, 0.25], [250, 146, 46, 56, -0.2]].forEach((e) => {
      c.beginPath(); c.ellipse(e[0], e[1], e[2], e[3], e[4], 0, TAU);
      c.strokeStyle = 'rgba(190,60,80,.55)'; c.lineWidth = 17; c.stroke();
      c.strokeStyle = 'rgba(254,214,220,.9)'; c.lineWidth = 12; c.stroke();
    });
    // 혈관 (들세동맥 → 사구체 → 날세동맥 → 모세 혈관 → 정맥)
    BLOOD.stroke(c); c.strokeStyle = '#be3b4d'; c.lineWidth = 29; c.stroke();
    BLOOD.stroke(c); c.strokeStyle = '#fde0e4'; c.lineWidth = 24; c.stroke();
    BLOOD.stroke(c); c.strokeStyle = '#fff2f3'; c.lineWidth = 15; c.stroke();
  }
  function nephBG() {
    const sc = view.scale * view.dpr;
    if (nephCache && Math.abs(nephCache.sc - sc) < 1e-3) return nephCache.cv;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(W * sc); cv.height = Math.ceil(H * sc);
    const c = cv.getContext('2d');
    c.setTransform(sc, 0, 0, sc, 0, 0);
    paintNephStatic(c);
    nephCache = { sc, cv };
    return cv;
  }

  function drawFilterWall(pore, a) {
    const gw = pore * 2, y = WALL_Y;
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    const edges = [170];
    GAPS.forEach((g) => { edges.push(g - gw / 2, g + gw / 2); });
    edges.push(330);
    for (let i = 0; i < edges.length; i += 2) {
      const x0 = edges[i], x1 = edges[i + 1];
      if (x1 - x0 < 1.5) continue;
      rr(x0, y - 5, x1 - x0, 10, 5);
      ctx.fillStyle = lgrad(ctx, 0, y - 5, 0, y + 5, [[0, '#2dd4bf'], [1, '#0f766e']]); ctx.fill();
      ctx.strokeStyle = '#115e59'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }

  function pathPoly(n, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
  }
  function drawPart(p, alpha) {
    const T = p.T; let x = p.x, y = p.y;
    if (p.wob > 0) x += Math.sin(p.wob * 60) * 2.5 * (p.wob / 0.35);
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    const r = T.r;
    if (T.shape === 'dot') {
      const g = rgrad(ctx, -r * 0.35, -r * 0.4, r * 0.1, 0, 0, r, [[0, shade(T.color, 0.5)], [0.6, T.color], [1, shade(T.color, -0.3)]]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      if (T.edge) { ctx.strokeStyle = T.edge; ctx.lineWidth = 1.2; ctx.stroke(); }
    } else if (T.shape === 'hex') {
      ctx.rotate(p.rot * 0.3); pathPoly(6, r * 1.15, 0.3);
      ctx.fillStyle = rgrad(ctx, -r * 0.3, -r * 0.3, 1, 0, 0, r * 1.2, [[0, '#fde68a'], [0.6, T.color], [1, shade(T.color, -0.3)]]); ctx.fill();
      ctx.strokeStyle = shade(T.color, -0.4); ctx.lineWidth = 1.2; ctx.stroke();
    } else if (T.shape === 'dia') {
      ctx.rotate(p.rot * 0.3 + 0.78); rr(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.3);
      ctx.fillStyle = rgrad(ctx, -r * 0.3, -r * 0.3, 1, 0, 0, r * 1.2, [[0, '#bbf7d0'], [0.6, T.color], [1, shade(T.color, -0.35)]]); ctx.fill();
      ctx.strokeStyle = shade(T.color, -0.45); ctx.lineWidth = 1.2; ctx.stroke();
    } else if (T.shape === 'disc') {
      ctx.rotate(Math.sin(p.rot * 0.5) * 0.5);
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.86, 0, 0, TAU);
      ctx.fillStyle = rgrad(ctx, -r * 0.3, -r * 0.3, 1, 0, 0, r, [[0, '#ef4444'], [1, '#991b1b']]); ctx.fill();
      ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 0.36, 0, 0, TAU); ctx.fillStyle = 'rgba(127,29,29,.45)'; ctx.fill();
    } else if (T.shape === 'blob') {
      ctx.rotate(p.rot * 0.2);
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU, rad = r * (0.86 + 0.2 * Math.sin(i * 2.3 + p.ph));
        const bx = Math.cos(a) * rad, by = Math.sin(a) * rad;
        i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by);
      }
      ctx.closePath();
      ctx.fillStyle = rgrad(ctx, -r * 0.3, -r * 0.3, 1, 0, 0, r, [[0, '#c4b5fd'], [0.6, T.color], [1, '#5b21b6']]); ctx.fill();
      ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 1.3; ctx.lineJoin = 'round'; ctx.stroke();
    }
    ctx.restore();
  }
  function drawParts(alpha) {
    for (let i = 0; i < S.parts.length; i++) drawPart(S.parts[i], alpha);
  }

  function drawBladder(x, y, r, level, t, label) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(80,60,20,.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 1.05);
    ctx.bezierCurveTo(-r * 0.2, -r * 0.9, -r * 1.05, -r * 0.7, -r * 1.0, r * 0.1);
    ctx.bezierCurveTo(-r * 0.95, r * 0.95, r * 0.95, r * 0.95, r * 1.0, r * 0.1);
    ctx.bezierCurveTo(r * 1.05, -r * 0.7, r * 0.2, -r * 0.9, r * 0.3, -r * 1.05);
    ctx.closePath();
    ctx.fillStyle = '#fde8e3'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save(); ctx.clip();
    const top = r * 0.95 - (r * 1.9) * clamp(level, 0, 1) * 0.92;
    ctx.fillStyle = lgrad(ctx, 0, top, 0, r, [[0, '#fde047'], [1, '#f59e0b']]);
    ctx.beginPath(); ctx.moveTo(-r * 1.2, r * 1.2);
    for (let px = -r * 1.2; px <= r * 1.2; px += 4) ctx.lineTo(px, top + Math.sin(px * 0.12 + t * 2.4) * 1.8);
    ctx.lineTo(r * 1.2, r * 1.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 1.05);
    ctx.bezierCurveTo(-r * 0.2, -r * 0.9, -r * 1.05, -r * 0.7, -r * 1.0, r * 0.1);
    ctx.bezierCurveTo(-r * 0.95, r * 0.95, r * 0.95, r * 0.95, r * 1.0, r * 0.1);
    ctx.bezierCurveTo(r * 1.05, -r * 0.7, r * 0.2, -r * 0.9, r * 0.3, -r * 1.05);
    ctx.closePath();
    ctx.strokeStyle = '#c0705f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.2, r * 0.12, r * 0.3, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // 지점 표시(? 표시) — 눌러서 이름과 하는 일을 확인
  const HOT = {
    sec: [
      { id: 'cortex', name: '겉질', desc: '콩팥의 바깥쪽 층이에요. 사구체와 보먼주머니가 있어요.', x: 428, y: 150, dx: 0, dy: -26 },
      { id: 'medulla', name: '속질', desc: '안쪽 층이에요. 세뇨관이 지나가고, 만들어진 오줌이 모여 깔때기로 가요.', x: 372, y: 322, dx: 0, dy: -26 },
      { id: 'pelvis', name: '콩팥 깔때기', desc: '오줌이 모이는 빈 공간이에요. 여기서 오줌관으로 빠져나가요.', x: 262, y: 300, dx: 4, dy: 34 },
    ],
    neph: [
      { id: 'glom', name: '사구체', desc: '모세 혈관이 실뭉치처럼 뭉친 곳이에요. 여기서 혈액이 걸러져요.', x: 250, y: 132, dx: 0, dy: -24 },
      { id: 'bowman', name: '보먼주머니', desc: '사구체를 감싼 주머니예요. 걸러진 물질이 먼저 이곳에 모여요.', x: 378, y: 168, dx: 54, dy: 0 },
      { id: 'tubule', name: '세뇨관', desc: '보먼주머니에 이어진 가늘고 긴 관이에요. 물질이 되돌아가거나 더해져요.', x: 0, y: 0, dx: -62, dy: 0 },
    ],
  };
  { const p = TUBE.at(U_PROX0 + 108); HOT.neph[2].x = p.x; HOT.neph[2].y = p.y; }
  function hotList() { return S.scene === 'kidney' ? (S.view === 'sec' ? HOT.sec : S.view === 'neph' ? HOT.neph : []) : []; }
  function drawHotspots(t) {
    hotList().forEach((h) => {
      const found = S.found.has(h.id);
      if (!found) {
        const a = 0.5 + 0.5 * Math.sin(t * 5 + h.x);
        D.ring(h.x, h.y, 14, t, { color: '#16a34a' });
        ctx.save(); ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(h.x, h.y, 11 + a, 0, TAU); ctx.fill();
        ctx.restore();
        txt('?', h.x, h.y + 1, { size: 16, weight: 800, color: '#fff', align: 'center', base: 'middle' });
      } else {
        D.check(h.x, h.y, 11, 1);
        const lx = h.x + h.dx, ly = h.y + h.dy;
        pill(h.name, lx, ly, { size: 15, bg: S.focus === h.id ? '#15803d' : '#1b2333', shadow: true });
      }
    });
  }
  function hotAt(p) {
    return hotList().find((h) => Math.hypot(p.x - h.x, p.y - h.y) <= 30);
  }
  function infoCard(x, y, w, h) {
    const hs = hotList();
    panel(x, y, w, h, { r: 14 });
    const f = hs.find((q) => q.id === S.focus);
    txt('📛 ' + S.found.size + ' / 6 찾았어요', x + 14, y + 24, { size: 14, weight: 800, color: '#15803d' });
    if (f && S.found.has(f.id)) {
      txt(f.name, x + 14, y + 52, { size: 19, weight: 800, color: '#1b2333' });
      para(f.desc, x + 14, y + 76, w - 28, { size: 14, color: '#374151', lh: 20 });
    } else {
      para('? 표시를 눌러서 이름과 하는 일을 알아봐요.', x + 14, y + 52, w - 28, { size: 14, color: '#6b7280', lh: 20 });
    }
  }

  /* ---------- 장면: 네프론 (구조·모형·모식도 공용) ---------- */
  function drawNeph(t, mode) {
    ctx.drawImage(nephBG(), 0, 0, W, H);
    // 구역 표시(색 띠)
    if (mode !== 'struct') {
      const zones = [
        { a: U_PROX0, b: U_PROX1, c: 'rgba(34,197,94,.13)' },
      ];
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      zones.forEach((z) => { TUBE.stroke(ctx, z.a, z.b); ctx.strokeStyle = z.c; ctx.lineWidth = 78; ctx.stroke(); });
      ctx.restore();
    }
    drawFilterWall(mode === 'struct' ? Math.min(S.poreDraw, 6.4) : S.poreDraw, mode === 'diagram' ? 0.85 : 1);
    // 방광
    drawBladder(697, 566, 31, S.bladderDraw, t);
    txt('방광', 740, 586, { size: 13, weight: 800, color: '#7c4a2d' });
    txt('콩팥 깔때기', 628, 484, { size: 13, weight: 800, color: '#92621f', align: 'center' });
    if (mode !== 'diagram') drawParts(1);
    // 이름표 (구조 장면에서는 눌러서 확인)
    if (mode === 'struct') {
      txt('모세 혈관', 436, 214, { size: 13, weight: 800, color: '#9f1239', halo: 'rgba(255,255,255,.85)', align: 'center' });
    }
  }

  /* =========================================================
     장면: 배설계 (sys)
     ========================================================= */
  const SYS = {
    kL: { x: 168, y: 198 }, kR: { x: 372, y: 198 }, bl: { x: 270, y: 452, r: 50 },
    drops: [], dropT: 0, bladder: 0.3, focus: null,
  };
  const ureterL = new Path(densify([[196, 238], [214, 290], [244, 350], [258, 404]], 4));
  const ureterR = new Path(densify([[344, 238], [326, 290], [296, 350], [282, 404]], 4));
  const SYS_ROWS = [
    { id: 'kidney', name: '콩팥', desc: '혈액 속 노폐물을 걸러 오줌을 만들어요.', y: 130, lx: 138, ly: 198 },
    { id: 'ureter', name: '오줌관', desc: '오줌을 방광으로 보내는 가는 관이에요.', y: 238, lx: 214, ly: 300 },
    { id: 'bladder', name: '방광', desc: '만들어진 오줌을 잠시 모아 두어요.', y: 346, lx: 222, ly: 452 },
    { id: 'urethra', name: '요도', desc: '오줌이 몸 밖으로 나가는 길이에요.', y: 454, lx: 270, ly: 540 },
  ];
  function drawKidneyShape(cx, cy, w, h, flip, hl) {
    const s = flip ? -1 : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w * 0.6, -h / 2, w * 0.62, -h * 0.1, w * 0.5, h * 0.2);
    ctx.bezierCurveTo(w * 0.42, h * 0.52, w * 0.1, h * 0.52, -w * 0.12, h * 0.46);
    ctx.bezierCurveTo(-w * 0.52, h * 0.38, -w * 0.4, h * 0.1, -w * 0.18, 0.02 * h);
    ctx.bezierCurveTo(-w * 0.52, -h * 0.06, -w * 0.5, -h / 2, 0, -h / 2);
    ctx.closePath();
    ctx.shadowColor = 'rgba(90,20,20,.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.fillStyle = lgrad(ctx, -w / 2, -h / 2, w / 2, h / 2, [[0, '#e0675d'], [0.6, '#c2413a'], [1, '#8f2a2a']]); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = hl ? '#fde047' : '#7f2222'; ctx.lineWidth = hl ? 5 : 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(w * 0.12, -h * 0.28, w * 0.1, h * 0.14, 0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawSys(t, dt) {
    panel(14, 48, 772, 538, { r: 20, bg: 'rgba(255,255,255,.7)' });
    // 몸 윤곽(연하게)
    ctx.save();
    ctx.beginPath(); rr(120, 70, 300, 440, 120); ctx.fillStyle = 'rgba(253,230,215,.55)'; ctx.fill();
    ctx.restore();
    // 대동맥·대정맥
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(262, 92); ctx.lineTo(262, 340); ctx.stroke();
    ctx.strokeStyle = '#3b82f6'; ctx.beginPath(); ctx.moveTo(282, 92); ctx.lineTo(282, 340); ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(262, 188); ctx.lineTo(206, 196); ctx.moveTo(262, 188); ctx.lineTo(334, 196); ctx.stroke();
    ctx.strokeStyle = '#3b82f6'; ctx.beginPath(); ctx.moveTo(282, 206); ctx.lineTo(206, 212); ctx.moveTo(282, 206); ctx.lineTo(334, 212); ctx.stroke();
    ctx.restore();
    txt('대동맥', 262, 84, { size: 12.5, weight: 800, color: '#b91c1c', align: 'center' });
    txt('대정맥', 288, 106, { size: 12.5, weight: 800, color: '#1d4ed8', align: 'left', halo: 'rgba(255,255,255,.8)' });
    // 오줌관
    [ureterL, ureterR].forEach((u) => {
      u.stroke(ctx); ctx.lineCap = 'round'; ctx.strokeStyle = SYS.focus === 'ureter' ? '#fde047' : '#c9a24b'; ctx.lineWidth = 15; ctx.stroke();
      u.stroke(ctx); ctx.strokeStyle = '#fff1c1'; ctx.lineWidth = 9; ctx.stroke();
    });
    // 오줌 방울
    SYS.dropT -= dt;
    if (SYS.dropT <= 0) { SYS.dropT = 0.85; SYS.drops.push({ p: Math.random() < 0.5 ? ureterL : ureterR, s: 0 }); }
    for (let i = SYS.drops.length - 1; i >= 0; i--) {
      const d = SYS.drops[i]; d.s += 62 * dt;
      if (d.s >= d.p.len) { SYS.bladder = Math.min(0.92, SYS.bladder + 0.012); SYS.drops.splice(i, 1); continue; }
      const q = d.p.at(d.s);
      D.sphere(q.x, q.y, 4.5, '#f59e0b', { gloss: false });
    }
    SYS.bladder = Math.max(0.28, SYS.bladder - dt * 0.004);
    // 요도
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(270, 500); ctx.lineTo(270, 566);
    ctx.strokeStyle = SYS.focus === 'urethra' ? '#fde047' : '#c9a24b'; ctx.lineWidth = 15; ctx.stroke();
    ctx.strokeStyle = '#fff1c1'; ctx.lineWidth = 9; ctx.stroke(); ctx.restore();
    D.arrow(270, 548, 270, 580, { color: '#d97706', width: 4, head: 12 });
    if (SYS.drops.length || t % 4 < 2) {
      const k = (t * 0.9) % 1;
      if (k < 1) D.sphere(270, 520 + k * 46, 3.8, '#f59e0b', { gloss: false });
    }
    // 콩팥
    drawKidneyShape(SYS.kL.x, SYS.kL.y, 84, 140, true, SYS.focus === 'kidney');
    drawKidneyShape(SYS.kR.x, SYS.kR.y, 84, 140, false, SYS.focus === 'kidney');
    // 방광
    drawBladder(SYS.bl.x, SYS.bl.y, SYS.bl.r, SYS.bladder, t);
    // 이름표
    SYS_ROWS.forEach((r) => {
      const hl = SYS.focus === r.id;
      const px = 66;
      ctx.save(); ctx.strokeStyle = 'rgba(27,35,51,.45)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px + 30, r.ly); ctx.lineTo(r.lx, r.ly); ctx.stroke(); ctx.restore();
      pill(r.name, px, r.ly, { size: 16, bg: hl ? '#15803d' : '#1b2333', shadow: true });
    });
    // 오른쪽 설명 목록
    SYS_ROWS.forEach((r, i) => {
      const x = 468, y = 76 + i * 118, hl = SYS.focus === r.id;
      panel(x, y, 302, 104, { r: 14, bg: hl ? '#ecfdf3' : '#fff', border: hl ? '#16a34a' : null, bw: 2.5 });
      txt((i + 1) + '. ' + r.name, x + 16, y + 34, { size: 19, weight: 800, color: '#1b2333' });
      para(r.desc, x + 16, y + 60, 270, { size: 14.5, color: '#374151', lh: 21 });
    });
    // 확대 안내
    const a = 0.5 + 0.5 * Math.sin(t * 4);
    [SYS.kL, SYS.kR].forEach((k) => { D.ring(k.x, k.y, 58, t + (k === SYS.kR ? 0.3 : 0), { color: '#16a34a' }); });
    pill('콩팥을 눌러 안을 들여다봐요 🔍', 270, 62, { size: 14, bg: rgba('#16a34a', 0.92), shadow: true });
    ctx.globalAlpha = 1;
  }

  /* =========================================================
     장면: 콩팥 단면 (sec)
     ========================================================= */
  const KC = { x: 318, y: 300 };
  const outerPts = [[318, 78], [392, 96], [446, 158], [462, 262], [446, 368], [398, 452], [326, 510], [250, 514], [196, 470], [182, 410], [200, 360], [230, 318], [236, 290], [226, 252], [196, 214], [180, 160], [208, 112], [256, 84]];
  const PC = { x: 268, y: 300 };
  function rayToInner(deg) {
    const a = deg * Math.PI / 180, ex = KC.x + 8, ey = KC.y + 4, rx = 134, ry = 196;
    let d = 30;
    for (; d < 400; d += 2) {
      const x = PC.x + Math.cos(a) * d, y = PC.y + Math.sin(a) * d;
      if (((x - ex) / rx) ** 2 + ((y - ey) / ry) ** 2 >= 1) break;
    }
    return d;
  }
  const PYR = [-112, -76, -40, -4, 32, 68, 104].map((deg) => {
    const a = deg * Math.PI / 180, base = rayToInner(deg);
    return { a, deg, apex: [PC.x + Math.cos(a) * 52, PC.y + Math.sin(a) * 52], bc: [PC.x + Math.cos(a) * base, PC.y + Math.sin(a) * base], nx: -Math.sin(a), ny: Math.cos(a) };
  });
  function drawSection(t) {
    ctx.save();
    // 오줌관
    ctx.lineCap = 'round';
    const ur = new Path(densify([[236, 322], [204, 380], [186, 470], [180, 560]], 4));
    ur.stroke(ctx); ctx.strokeStyle = '#c9a24b'; ctx.lineWidth = 20; ctx.stroke();
    ur.stroke(ctx); ctx.strokeStyle = '#fff1c1'; ctx.lineWidth = 13; ctx.stroke();
    // 대동맥·대정맥 쪽에서 들어오는 혈관 (콩팥 동맥·정맥)
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(236, 272); ctx.lineTo(120, 252); ctx.stroke();
    ctx.strokeStyle = '#3b82f6'; ctx.beginPath(); ctx.moveTo(234, 336); ctx.lineTo(120, 350); ctx.stroke();
    ctx.restore();
    txt('콩팥 동맥', 120, 240, { size: 13, weight: 800, color: '#b91c1c' });
    txt('콩팥 정맥', 120, 372, { size: 13, weight: 800, color: '#1d4ed8' });
    txt('오줌관', 154, 548, { size: 14, weight: 800, color: '#92621f', align: 'center' });
    // 콩팥 겉(겉질)
    ctx.save();
    ctx.shadowColor = 'rgba(90,20,20,.28)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    ctx.beginPath(); smooth(ctx, outerPts, true);
    ctx.fillStyle = lgrad(ctx, 190, 80, 460, 510, [[0, '#e07d5a'], [0.55, '#c75a3e'], [1, '#9c3a2b']]); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#7e2b20'; ctx.lineWidth = 3; ctx.stroke();
    // 겉질의 작은 점(네프론 단위)
    ctx.clip();
    ctx.fillStyle = 'rgba(255,230,210,.35)';
    for (let i = 0; i < 70; i++) {
      const a = i * 2.399, rad = 150 + (i % 7) * 7;
      const x = KC.x + 12 + Math.cos(a) * rad * 0.82, y = KC.y + Math.sin(a) * rad * 1.22;
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
    }
    // 속질(피라미드)
    PYR.forEach((p) => {
      const hw = 38;
      const b1 = [p.bc[0] + p.nx * hw, p.bc[1] + p.ny * hw], b2 = [p.bc[0] - p.nx * hw, p.bc[1] - p.ny * hw];
      const bo = [p.bc[0] + Math.cos(p.a) * 18, p.bc[1] + Math.sin(p.a) * 18];
      ctx.beginPath(); ctx.moveTo(p.apex[0], p.apex[1]); ctx.lineTo(b1[0], b1[1]);
      ctx.quadraticCurveTo(bo[0], bo[1], b2[0], b2[1]); ctx.closePath();
      ctx.fillStyle = lgrad(ctx, p.apex[0], p.apex[1], p.bc[0], p.bc[1], [[0, '#fecaca'], [1, '#f2766f']]); ctx.fill();
      ctx.strokeStyle = '#a63a33'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(160,50,50,.35)'; ctx.lineWidth = 1.5;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath(); ctx.moveTo(p.apex[0] + p.nx * k * 2, p.apex[1] + p.ny * k * 2);
        ctx.lineTo(p.bc[0] + p.nx * k * 14, p.bc[1] + p.ny * k * 14); ctx.stroke();
      }
    });
    // 콩팥 깔때기
    ctx.beginPath(); ctx.ellipse(PC.x, PC.y, 40, 52, 0, 0, TAU);
    ctx.fillStyle = lgrad(ctx, PC.x - 30, PC.y - 40, PC.x + 30, PC.y + 40, [[0, '#fff8d8'], [1, '#f9e29a']]); ctx.fill();
    ctx.strokeStyle = '#c9a24b'; ctx.lineWidth = 2.5; ctx.stroke();
    PYR.forEach((p) => {
      ctx.beginPath(); ctx.moveTo(PC.x + Math.cos(p.a) * 36, PC.y + Math.sin(p.a) * 36); ctx.lineTo(p.apex[0] + Math.cos(p.a) * 3, p.apex[1] + Math.sin(p.a) * 3);
      ctx.strokeStyle = '#f9e29a'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke();
    });
    ctx.restore();
    // 오줌 흐름(작은 방울)
    const k = (t * 0.55) % 1;
    ctx.save();
    ctx.globalAlpha = 0.9;
    D.sphere(236 - 24 * k, 322 + 40 * k, 4, '#f59e0b', { gloss: false });
    D.sphere(236 - 24 * ((k + 0.5) % 1), 322 + 40 * ((k + 0.5) % 1), 4, '#f59e0b', { gloss: false });
    ctx.restore();
    // 네프론 확대 렌즈
    const lens = { x: 414, y: 236 };
    ctx.save();
    const pulse = 1 + 0.06 * Math.sin(t * 5);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(lens.x, lens.y, 20 * pulse, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lens.x, lens.y, 20 * pulse, 0, TAU); ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(lens.x + 20, lens.y - 6); ctx.lineTo(556, 160); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 네프론 미니 그림
    const ix = 556, iy = 92, iw = 224, ih = 168;
    panel(ix, iy - 6, iw, ih + 44, { r: 16, border: '#16a34a', bw: 2.5 });
    ctx.drawImage(nephBG(), ix + 6, iy + 14, iw - 12, (iw - 12) * H / W);
    txt('🔍 네프론 (확대)', ix + iw / 2, iy + 10, { size: 15, weight: 800, color: '#15803d', align: 'center' });
    txt('눌러서 자세히 보기', ix + iw / 2, iy + ih + 24, { size: 13, weight: 800, color: '#6b7280', align: 'center' });
    ctx.save(); ctx.beginPath(); ctx.arc(lens.x, lens.y, 4, 0, TAU); ctx.fillStyle = '#16a34a'; ctx.fill(); ctx.restore();
    infoCard(556, 306, 224, 170);
    txt('네프론은 겉질에서 속질까지 길게 이어져 있어요.', 556, 502, { size: 13, weight: 700, color: '#4b5563' });
  }

  /* =========================================================
     장면: 노폐물 (waste)
     ========================================================= */
  const CH = {
    co2:   { id: 'co2',   label: '이산화 탄소', color: '#6b7280', sym: 'CO₂', slot: [84, 448] },
    water: { id: 'water', label: '물',          color: '#38bdf8', sym: 'H₂O', slot: [244, 448] },
    nh3:   { id: 'nh3',   label: '암모니아',    color: '#84cc16', sym: 'NH₃', slot: [84, 494] },
    urea:  { id: 'urea',  label: '요소',        color: '#b45309', sym: '요소', slot: [244, 494] },
  };
  const NUT = {
    carb: { name: '탄수화물', eq: '탄수화물 → 이산화 탄소 + 물', out: ['co2', 'water'], color: '#f59e0b' },
    fat:  { name: '지방',     eq: '지방 → 이산화 탄소 + 물', out: ['co2', 'water'], color: '#eab308' },
    prot: { name: '단백질',   eq: '단백질 → 이산화 탄소 + 물 + 암모니아', out: ['co2', 'water', 'nh3'], color: '#10b981' },
  };
  const WS = {
    nut: null, seen: new Set(), anim: null, orbs: [], drag: null, drops: [], dropT: 0, bladder: 0.1, bladderDraw: 0.1, lungT: 0,
    chips: {}, tags: {}, cellGlow: 0, convert: null,
  };
  Object.keys(CH).forEach((k) => { WS.chips[k] = { id: k, visible: false, x: CH[k].slot[0], y: CH[k].slot[1], sc: 0, placed: null, shake: 0, fly: null, lift: 0 }; });
  const CELL = { x: 172, y: 192, R: 90 };
  const ZONES = {
    lung:   { x: 466, y: 100, w: 200, h: 116, name: '폐' },
    liver:  { x: 446, y: 226, w: 132, h: 76, name: '간' },
    kidney: { x: 466, y: 306, w: 200, h: 80, name: '콩팥' },
  };
  const ZC = (z) => ({ x: ZONES[z].x + ZONES[z].w / 2, y: ZONES[z].y + ZONES[z].h / 2 });
  const RULES = {
    co2: { lung: true },
    water: { kidney: true, lung: true },
    nh3: { liver: true },
    urea: { kidney: true },
  };
  const WRONG = {
    co2: { kidney: '이산화 탄소는 기체예요. 폐에서 날숨으로 나가요.', liver: '간은 암모니아를 요소로 바꾸는 곳이에요. 이산화 탄소는 폐로 보내요.' },
    water: { liver: '물은 콩팥에서 오줌이 되어 나가요. 간은 아니에요.' },
    nh3: { lung: '암모니아는 해로워서 바로 내보내지 못해요. 먼저 간으로 보내 요소로 바꿔요.', kidney: '암모니아는 먼저 간에서 요소로 바뀐 뒤에 콩팥으로 가요.' },
    urea: { lung: '요소는 폐가 아니라 콩팥에서 걸러져 오줌으로 나가요.', liver: '요소는 이미 간에서 만들어졌어요. 콩팥으로 보내요.' },
  };
  function zoneAt(x, y) {
    for (const k in ZONES) { const z = ZONES[k]; if (x >= z.x - 8 && x <= z.x + z.w + 8 && y >= z.y - 8 && y <= z.y + z.h + 8) return k; }
    return null;
  }
  function startBreak(kind) {
    if (WS.anim) return false;
    WS.nut = kind; WS.seen.add(kind);
    WS.anim = { kind, t: 0, emitted: false };
    Sound.click();
    return true;
  }
  function popChip(id) {
    const c = WS.chips[id];
    if (c.visible || c.placed) { return; }
    c.visible = true; c.sc = 0; c.x = CH[id].slot[0]; c.y = CH[id].slot[1];
    burst(c.x, c.y, [CH[id].color, '#fff'], 10, { speed: 90, size: 3 });
  }
  function ensureChips() { ['co2', 'water', 'nh3'].forEach((k) => { const c = WS.chips[k]; if (!c.placed) { c.visible = true; c.sc = Math.max(c.sc, 0.01); } }); }
  function placeChip(c, zone) {
    c.placed = zone; c.lift = 0;
    const z = ZC(zone);
    c.fly = { x0: c.x, y0: c.y, x1: z.x, y1: z.y, k: 0, dur: 0.45 };
    Sound.success();
  }
  function arrivedChip(c) {
    const zone = c.placed, z = ZC(zone);
    burst(z.x, z.y, [CH[c.id].color, '#fff', '#fde047'], 14, { speed: 110 });
    if (c.id === 'co2') { WS.tags.lung = (WS.tags.lung || []).filter((s) => s.indexOf('이산화') < 0).concat(['이산화 탄소 → 날숨']); WS.lungT = 0; }
    else if (c.id === 'water') { WS.tags[zone] = (WS.tags[zone] || []).concat([zone === 'lung' ? '물 → 수증기(날숨)' : '물 → 오줌']); }
    else if (c.id === 'nh3') { WS.convert = { t: 0, from: z }; WS.tags.liver = ['암모니아 → 요소']; }
    else if (c.id === 'urea') { WS.tags.kidney = (WS.tags.kidney || []).concat(['요소 → 오줌']); }
    if (c.id === 'water' && zone === 'kidney' || c.id === 'urea') WS.dropT = 0;
  }
  function updateWaste(dt, t) {
    // 분해 애니메이션
    const A = WS.anim;
    WS.cellGlow = approach(WS.cellGlow, A && A.t > 0.8 && A.t < 2.4 ? 1 : 0, dt, 6);
    if (A) {
      A.t += dt;
      if (A.t > 1.9 && !A.emitted) {
        A.emitted = true;
        NUT[A.kind].out.forEach((id, i) => {
          const c = WS.chips[id], tx = CH[id].slot[0], ty = CH[id].slot[1];
          WS.orbs.push({ id, x0: CELL.x + (i - 1) * 16, y0: CELL.y, x1: tx, y1: ty, k: -i * 0.12, dur: 0.85 });
        });
      }
      if (A.t > 3.0) WS.anim = null;
    }
    for (let i = WS.orbs.length - 1; i >= 0; i--) {
      const o = WS.orbs[i]; o.k += dt / o.dur;
      if (o.k >= 1) { popChip(o.id); WS.orbs.splice(i, 1); }
    }
    Object.values(WS.chips).forEach((c) => {
      const d = WS.drag && WS.drag.chip === c;
      const targetSc = c.visible && !c.placed ? (d ? 1.12 : 1) : 0;
      c.sc = approach(c.sc, targetSc, dt, 12);
      c.lift = approach(c.lift, d ? 1 : 0, dt, 14);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      if (c.fly) {
        c.fly.k += dt / c.fly.dur;
        const e = EASE.inOutQuad(Math.min(1, c.fly.k));
        c.x = c.fly.x0 + (c.fly.x1 - c.fly.x0) * e; c.y = c.fly.y0 + (c.fly.y1 - c.fly.y0) * e;
        if (c.fly.k >= 1) { c.fly = null; arrivedChip(c); }
      } else if (!d && c.visible && !c.placed) {
        c.x = approach(c.x, CH[c.id].slot[0], dt, 10); c.y = approach(c.y, CH[c.id].slot[1], dt, 10);
      }
    });
    // 간에서 암모니아 → 요소
    if (WS.convert) {
      WS.convert.t += dt;
      if (WS.convert.t > 1.0 && !WS.convert.done) {
        WS.convert.done = true;
        const z = WS.convert.from;
        WS.orbs.push({ id: 'urea', x0: z.x, y0: z.y, x1: CH.urea.slot[0], y1: CH.urea.slot[1], k: 0, dur: 0.9 });
        burst(z.x, z.y, ['#b45309', '#fde047'], 12, { speed: 90 });
        Sound.success();
      }
      if (WS.convert.t > 1.6) WS.convert = null;
    }
    // 폐: 날숨 기체
    if (WS.tags.lung && WS.tags.lung.some((s) => s.indexOf('이산화') >= 0)) {
      WS.lungT -= dt;
      if (WS.lungT <= 0 && !RM) { WS.lungT = 0.55; PFX.emit({ x: 566 + (Math.random() - 0.5) * 18, y: 104, vx: (Math.random() - 0.5) * 16, vy: -42, life: 1.5, size: 4.2, color: '#6b7280', shape: 'smoke', fade: true, grow: 3 }); }
    }
    // 콩팥 → 방광 오줌
    const kid = (WS.tags.kidney || []).length;
    WS.dropT -= dt;
    if (kid && WS.dropT <= 0) {
      WS.dropT = 0.7; WS.drops.push({ p: Math.random() < 0.5 ? WP.L : WP.R, s: 0 });
    }
    for (let i = WS.drops.length - 1; i >= 0; i--) {
      const d = WS.drops[i]; d.s += 64 * dt;
      if (d.s >= d.p.len) { WS.bladder = Math.min(0.95, WS.bladder + 0.045); WS.drops.splice(i, 1); }
    }
    WS.bladderDraw = approach(WS.bladderDraw, WS.bladder, dt, 4);
  }
  const WP = { L: new Path(densify([[516, 356], [532, 392], [552, 424]], 4)), R: new Path(densify([[616, 356], [600, 392], [580, 424]], 4)) };

  function drawChip(c, alpha) {
    const d = CH[c.id];
    const w = 140, h = 40;
    ctx.save();
    ctx.globalAlpha = (alpha == null ? 1 : alpha);
    const sc = c.sc * (1 + c.lift * 0.04);
    ctx.translate(c.x + (c.shake > 0 ? Math.sin(c.shake * 60) * 4 : 0), c.y - c.lift * 6);
    ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(20,40,30,' + (0.2 + c.lift * 0.15).toFixed(2) + ')'; ctx.shadowBlur = 8 + c.lift * 10; ctx.shadowOffsetY = 3 + c.lift * 6;
    rr(-w / 2, -h / 2, w, h, 14); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = d.color; ctx.lineWidth = 2.5; ctx.stroke();
    D.sphere(-w / 2 + 22, 0, 15, d.color, { text: d.sym, textScale: d.sym.length > 3 ? 0.62 : 0.72 });
    txt(d.label, -w / 2 + 44, 1, { size: 15, weight: 800, color: '#1b2333', base: 'middle', max: 90, min: 12 });
    ctx.restore();
  }

  // 영양소 분자 그림: beads [dx, dy, r, color]
  function moleculeBeads(kind) {
    const b = [];
    if (kind === 'carb') {
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.push([Math.cos(a) * 20, Math.sin(a) * 20, 8, i % 2 ? '#f59e0b' : '#fbbf24']); }
      b.push([0, 0, 6, '#fde68a']);
    } else if (kind === 'fat') {
      b.push([-26, 0, 10, '#eab308']);
      for (let r = 0; r < 3; r++) for (let i = 1; i <= 3; i++) b.push([-26 + i * 15, (r - 1) * 17 + (i % 2 ? -3 : 3), 5.4, r === 1 ? '#fde047' : '#facc15']);
    } else {
      const cols = ['#10b981', '#34d399', '#06b6d4', '#8b5cf6', '#22c55e', '#14b8a6', '#a78bfa'];
      for (let i = 0; i < 7; i++) b.push([-45 + i * 15, Math.sin(i * 1.1) * 12, 8, cols[i]]);
    }
    return b;
  }
  function drawMolecule(kind, x, y, sc, a, br) {
    const beads = moleculeBeads(kind);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc);
    if (br < 0.4) {
      ctx.strokeStyle = 'rgba(120,80,20,' + (0.6 * (1 - br / 0.4)).toFixed(2) + ')'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 1; i < beads.length; i++) {
        if (kind === 'carb' && i === beads.length - 1) { for (let k = 0; k < 6; k++) { ctx.moveTo(0, 0); ctx.lineTo(beads[k][0], beads[k][1]); } break; }
        if (kind === 'fat' && i > 1 && (i - 1) % 3 === 1) { ctx.moveTo(beads[0][0], beads[0][1]); }
        if (kind === 'fat' && i === 1) ctx.moveTo(beads[0][0], beads[0][1]);
        ctx.lineTo(beads[i][0], beads[i][1]);
      }
      ctx.stroke();
    }
    beads.forEach((q, i) => {
      const ang = Math.atan2(q[1] + 0.001, q[0] + 0.001 + (i % 3) * 3);
      const sp = br * (26 + (i % 4) * 8);
      D.sphere(q[0] + Math.cos(ang) * sp, q[1] + Math.sin(ang) * sp, q[2] * (1 - br * 0.5), q[3], { gloss: q[2] > 6 });
    });
    ctx.restore();
  }
  function drawCellScene(t) {
    panel(14, 52, 316, 276, { r: 18 });
    pill('🔬 세포 속', 80, 76, { size: 14, bg: '#be185d' });
    // 세포
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * TAU, r = CELL.R * (1 + 0.03 * Math.sin(3 * a + t * 0.9) + 0.02 * Math.sin(5 * a - t * 1.1));
      const x = CELL.x + Math.cos(a) * r * 1.08, y = CELL.y + Math.sin(a) * r * 0.94;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.shadowColor = 'rgba(190,50,110,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = rgrad(ctx, CELL.x - 30, CELL.y - 36, 10, CELL.x, CELL.y, CELL.R * 1.1, [[0, '#fff0f7'], [1, '#f9bad8']]); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#d4679e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    D.sphere(CELL.x + 28, CELL.y - 40, 22, '#c4b5fd', { shadow: true });
    D.sphere(CELL.x + 32, CELL.y - 44, 7, '#7c3aed', { gloss: false });
    // 미토콘드리아
    [[CELL.x + 40, CELL.y + 40, -0.4], [CELL.x - 62, CELL.y + 28, 0.5]].forEach((m, i) => {
      ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(m[2]);
      if (i === 0 && WS.cellGlow > 0.02) D.glow(0, 0, 50, '#fde047', 0.75 * WS.cellGlow);
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 15, 0, 0, TAU);
      ctx.fillStyle = lgrad(ctx, 0, -15, 0, 15, [[0, '#fdba74'], [1, '#f97316']]); ctx.fill();
      ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = -18; k <= 18; k += 9) { ctx.moveTo(k, -9); ctx.quadraticCurveTo(k + 4, 0, k, 9); }
      ctx.stroke(); ctx.restore();
    });
    txt('미토콘드리아', CELL.x + 72, CELL.y + 78, { size: 12.5, weight: 800, color: '#9a3412', align: 'center', halo: 'rgba(255,240,247,.9)' });
    // 분자
    const A = WS.anim;
    if (A) {
      const t1 = A.t;
      if (t1 < 0.9) {
        const k = EASE.outCubic(t1 / 0.9);
        drawMolecule(A.kind, lerp(46, CELL.x - 18, k), lerp(106, CELL.y + 8, k), 1, 1, 0);
      } else if (t1 < 1.9) {
        const br = EASE.outCubic((t1 - 0.9) / 1.0);
        drawMolecule(A.kind, CELL.x - 18, CELL.y + 8, 1, 1 - br * 0.6, br);
        if (!RM && Math.random() < 0.3) PFX.emit({ x: CELL.x + 40, y: CELL.y + 40, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 40, life: 0.7, size: 3, color: '#fde047', shape: 'star' });
      }
    } else if (!WS.nut) {
      txt('아래에서 영양소를 골라 보세요', CELL.x, CELL.y + 4, { size: 14, weight: 800, color: '#a0527c', align: 'center' });
    }
    // 분해 식
    panel(14, 336, 316, 46, { r: 14 });
    const eq = WS.nut ? NUT[WS.nut].eq : '영양소 → 노폐물';
    txt(eq, 172, 365, { size: 15, weight: 800, color: WS.nut ? NUT[WS.nut].color === '#eab308' ? '#a16207' : '#1b2333' : '#9ca3af', align: 'center', max: 296, min: 12 });
    // 노폐물 상자
    panel(14, 392, 316, 130, { r: 16, bg: '#fffdf5', border: '#e6d9a8', bw: 2 });
    txt('🧺 노폐물 상자 — 끌어서 알맞은 곳으로!', 172, 413, { size: 13.5, weight: 800, color: '#7c5a14', align: 'center', max: 296 });
    Object.keys(CH).forEach((k) => {
      const s = CH[k].slot;
      ctx.save(); ctx.strokeStyle = 'rgba(180,150,60,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      rr(s[0] - 70, s[1] - 20, 140, 40, 14); ctx.stroke(); ctx.restore();
    });
    // 날아가는 구슬
    WS.orbs.forEach((o) => {
      if (o.k < 0) return;
      const e = EASE.inOutQuad(Math.min(1, o.k));
      const x = lerp(o.x0, o.x1, e), y = lerp(o.y0, o.y1, e) - Math.sin(e * Math.PI) * 30;
      D.sphere(x, y, 10, CH[o.id].color, { shadow: true });
    });
    // 칩
    Object.values(WS.chips).forEach((c) => { if (c.sc > 0.02 && !(WS.drag && WS.drag.chip === c)) drawChip(c); });
  }

  function drawBodyScene(t, dt) {
    panel(346, 52, 440, 534, { r: 18 });
    pill('🧍 우리 몸', 396, 76, { size: 14, bg: '#0e7490' });
    const dragging = !!WS.drag;
    // 몸통
    ctx.save();
    rr(461, 96, 210, 458, 98); ctx.fillStyle = lgrad(ctx, 461, 96, 671, 554, [[0, '#fdebdc'], [1, '#f6d3bb']]); ctx.fill();
    ctx.strokeStyle = '#e1b69b'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    // 기관: 기관·폐
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#f3a5b5'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(566, 98); ctx.lineTo(566, 150); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(566, 150); ctx.lineTo(534, 170); ctx.moveTo(566, 150); ctx.lineTo(598, 170); ctx.stroke();
    ctx.restore();
    [[518, 160, -1], [614, 160, 1]].forEach((l) => {
      ctx.save(); ctx.translate(l[0], l[1]); ctx.scale(l[2], 1);
      ctx.beginPath(); ctx.moveTo(-6, -46); ctx.bezierCurveTo(-48, -40, -44, 40, -10, 52); ctx.bezierCurveTo(8, 56, 14, 20, 12, -10); ctx.bezierCurveTo(10, -34, 4, -46, -6, -46); ctx.closePath();
      ctx.fillStyle = lgrad(ctx, -40, -40, 20, 50, [[0, '#fbb6c4'], [1, '#ec7f98']]); ctx.fill();
      ctx.strokeStyle = '#c75371'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(190,70,100,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, -16); ctx.lineTo(-18, 6); ctx.moveTo(8, 6); ctx.lineTo(-14, 24); ctx.stroke();
      ctx.restore();
    });
    D.sphere(566, 206, 15, '#ef4444', { shadow: true });
    // 간
    ctx.save(); ctx.translate(510, 262); ctx.rotate(-0.12);
    ctx.beginPath(); ctx.moveTo(-58, -8); ctx.bezierCurveTo(-52, -34, 30, -36, 60, -14); ctx.bezierCurveTo(52, 20, 0, 34, -40, 24); ctx.bezierCurveTo(-54, 20, -60, 6, -58, -8); ctx.closePath();
    ctx.fillStyle = lgrad(ctx, 0, -34, 0, 34, [[0, '#c2542d'], [1, '#8f3318']]); ctx.fill(); ctx.strokeStyle = '#6b230f'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(-14, -14, 20, 6, -0.1, 0, TAU); ctx.fill();
    ctx.restore();
    // 콩팥·오줌관·방광
    ctx.save(); ctx.lineCap = 'round';
    [WP.L, WP.R].forEach((p) => { p.stroke(ctx); ctx.strokeStyle = '#c9a24b'; ctx.lineWidth = 9; ctx.stroke(); p.stroke(ctx); ctx.strokeStyle = '#fff1c1'; ctx.lineWidth = 5; ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(566, 478); ctx.lineTo(566, 548); ctx.strokeStyle = '#c9a24b'; ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = '#fff1c1'; ctx.lineWidth = 5; ctx.stroke();
    ctx.restore();
    drawKidneyShape(502, 340, 50, 76, true, false);
    drawKidneyShape(630, 340, 50, 76, false, false);
    drawBladder(566, 452, 28, WS.bladderDraw, t);
    WS.drops.forEach((d) => { const q = d.p.at(d.s); D.sphere(q.x, q.y, 3.6, '#f59e0b', { gloss: false }); });
    // 이름표
    const labels = [['폐', 728, 150, 'lung'], ['간', 398, 262, 'liver'], ['콩팥', 728, 330, 'kidney']];
    labels.forEach((l) => {
      const hot = dragging && zoneAt(WS.drag.chip.x, WS.drag.chip.y) === l[3];
      pill(l[0], l[1], l[2], { size: 16, bg: hot ? '#15803d' : '#1b2333', shadow: true });
    });
    pill('방광', 728, 452, { size: 14, bg: '#6b7280' });
    pill('요도 → 오줌', 566, 566, { size: 12.5, bg: '#b45309', pad: 8 });
    // 결과 표시
    function tagList(zone, x, y, align) {
      (WS.tags[zone] || []).forEach((s, i) => { pill(s, x, y + i * 28, { size: 12.5, bg: '#ecfdf3', color: '#166534', border: '#16a34a', borderW: 1.5, pad: 7, align: align || 'center' }); });
    }
    tagList('lung', 726, 182);
    tagList('liver', 398, 292);
    tagList('kidney', 726, 360);
    if ((WS.tags.lung || []).length) D.arrow(566, 100, 566, 66, { color: '#6b7280', width: 4, head: 11 });
    // 간 변환 효과
    if (WS.convert) {
      const k = WS.convert.t;
      D.glow(510, 262, 50 + Math.sin(k * 12) * 6, '#fde047', 0.55);
      txt('암모니아 → 요소', 510, 306, { size: 13, weight: 800, color: '#7c2d12', align: 'center', halo: '#fff' });
    }
    // 놓을 곳 표시
    if (dragging) {
      const hover = zoneAt(WS.drag.chip.x, WS.drag.chip.y);
      Object.keys(ZONES).forEach((k) => {
        const z = ZONES[k];
        ctx.save();
        ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 20;
        ctx.strokeStyle = hover === k ? '#16a34a' : 'rgba(22,163,74,.55)'; ctx.lineWidth = hover === k ? 4 : 2.5;
        ctx.fillStyle = hover === k ? 'rgba(22,163,74,.18)' : 'rgba(22,163,74,.06)';
        rr(z.x, z.y, z.w, z.h, 18); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
    }
  }
  function drawWaste(t, dt) {
    drawCellScene(t);
    drawBodyScene(t, dt);
    if (WS.drag) drawChip(WS.drag.chip);
  }

  /* =========================================================
     장면: 오줌 생성 (model) — 필터 구멍·재흡수 조절
     ========================================================= */
  function legendPanel(x, y, w, h) {
    panel(x, y, w, h, { r: 14 });
    txt('입자 안내', x + 12, y + 22, { size: 13.5, weight: 800, color: '#374151' });
    TKEYS.forEach((k, i) => {
      const T = TYPES[k], yy = y + 44 + i * 20.5;
      drawPart({ T, x: x + 22, y: yy, rot: 0.3, ph: i, wob: 0 }, 1);
      txt(T.name, x + 42, yy + 1, { size: 13.5, weight: 800, color: '#1b2333', base: 'middle' });
      txt(T.big ? '큰 입자' : '작은 입자', x + w - 10, yy + 1, { size: 12, weight: 700, color: '#6b7280', align: 'right', base: 'middle' });
    });
  }
  function urinePanel(x, y, w, h) {
    panel(x, y, w, h, { r: 14 });
    txt('🧪 오줌 검사', x + 12, y + 22, { size: 13.5, weight: 800, color: '#374151' });
    ['gluc', 'amino', 'prot', 'rbc', 'urea'].forEach((k, i) => {
      const n = S.stat.urine[k] | 0, yy = y + 44 + i * 18.5, bad = k !== 'urea' && n > 0;
      txt(TYPES[k].name, x + 14, yy, { size: 13, weight: 700, color: '#1b2333', base: 'middle' });
      txt(n + '개', x + w - 12, yy, { size: 13, weight: 800, color: bad ? '#dc2626' : n > 0 ? '#92400e' : '#9ca3af', align: 'right', base: 'middle' });
    });
  }
  function drawModel(t) {
    drawNeph(t, 'model');
    pill('① 여과', 86, 244, { size: 14, bg: '#2563eb', shadow: true });
    D.arrow(126, 240, 166, 228, { color: '#2563eb', width: 3, head: 9 });
    if (S.modelStage >= 1 || (game && game.free)) {
      pill('② 재흡수', 150, 384, { size: 14, bg: '#16a34a', shadow: true });
      D.arrow(194, 384, 222, 384, { color: '#16a34a', width: 3, head: 9 });
      pill('③ 분비', 632, 436, { size: 14, bg: '#c026d3', shadow: true });
      D.arrow(590, 436, 570, 436, { color: '#c026d3', width: 3, head: 9 });
      const rp = S.pulseAt && S.pulseAt.reabs != null ? 1 - clamp((S.t - S.pulseAt.reabs) / 0.7, 0, 1) : 0;
      if (rp > 0) D.glow(150, 384, 40 * rp + 20, '#22c55e', 0.5 * rp);
    }
    legendPanel(320, 290, 176, 190);
    urinePanel(634, 190, 150, 118);
    const leak = S.t - S.leakT < 3, stuck = S.t - S.stuckT < 3;
    if (leak) pill('⚠️ 큰 입자가 새어 나가요!', 112, 290, { size: 13.5, bg: '#dc2626', shadow: true });
    else if (stuck) pill('⚠️ 작은 입자도 못 지나가요', 118, 290, { size: 13.5, bg: '#d97706', shadow: true });
    else if (filterOK()) pill('✨ 알맞게 걸러져요', 100, 290, { size: 13.5, bg: '#15803d', shadow: true });
    if (!S.reabs) pill('재흡수 꺼짐!', 150, 412, { size: 13.5, bg: '#6b7280' });
  }

  /* =========================================================
     장면: 모식도 (diagram) — 화살표 카드 배치
     ========================================================= */
  const DG = {
    slots: [
      { x: 250, y: 226, label: '사구체 → 보먼주머니', lx: 86, ly: 268, dir: [250, 200, 250, 250], name: '사구체 ↓ 보먼주머니' },
      { x: 270, y: 384, label: '세뇨관 → 모세 혈관', lx: 410, ly: 384, dir: [252, 384, 290, 384], name: '' },
      { x: 539, y: 438, label: '모세 혈관 → 세뇨관', lx: 424, ly: 438, dir: [522, 438, 560, 438], name: '' },
    ],
    cards: [
      { id: 'filter', label: '여과', color: '#2563eb', hx: 102, hy: 366 },
      { id: 'reabs', label: '재흡수', color: '#16a34a', hx: 102, hy: 430 },
      { id: 'secrete', label: '분비', color: '#c026d3', hx: 102, hy: 494 },
    ],
  };
  DG.cards.forEach((c) => { c.x = c.hx; c.y = c.hy; c.slot = null; c.lift = 0; c.sc = 1; c.drag = false; });
  const SLOT_ANSWER = ['filter', 'reabs', 'secrete'];
  function diagramState() { return DG.slots.map((s, i) => { const c = DG.cards.find((q) => q.slot === i); return c ? c.id : null; }); }
  function diagramCorrect() { const st = diagramState(); return st.every((id, i) => id === SLOT_ANSWER[i]); }
  function updateDiagram(dt) {
    DG.cards.forEach((c) => {
      c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 14);
      if (!c.drag) {
        const tx = c.slot != null ? DG.slots[c.slot].x : c.hx, ty = c.slot != null ? DG.slots[c.slot].y : c.hy;
        c.x = approach(c.x, tx, dt, 12); c.y = approach(c.y, ty, dt, 12);
      }
    });
    const ok = diagramCorrect();
    if (ok && !DG.done) { DG.done = true; DG.doneT = 0; DG.slots.forEach((s) => burst(s.x, s.y, ['#2563eb', '#16a34a', '#c026d3', '#fde047'], 14, { speed: 120 })); Sound.success(); }
    if (!ok) DG.done = false;
    if (DG.done) DG.doneT += dt;
  }
  function drawCard(c, big) {
    const w = 142, h = 48;
    const inSlot = c.slot != null && !c.drag;
    const cw = inSlot ? 92 : w, chh = inSlot ? 34 : h;
    ctx.save();
    ctx.translate(c.x, c.y - c.lift * 6);
    const s = 1 + c.lift * 0.06; ctx.scale(s, s);
    ctx.shadowColor = 'rgba(20,40,30,' + (0.22 + c.lift * 0.15).toFixed(2) + ')'; ctx.shadowBlur = 8 + c.lift * 10; ctx.shadowOffsetY = 3 + c.lift * 6;
    rr(-cw / 2, -chh / 2, cw, chh, 14); ctx.fillStyle = c.color; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,255,255,.22)'; rr(-cw / 2 + 3, -chh / 2 + 3, cw - 6, chh / 2 - 2, 10); ctx.fill();
    txt(c.label, 0, 1, { size: inSlot ? 16 : 19, weight: 800, color: '#fff', align: 'center', base: 'middle' });
    ctx.restore();
  }
  function drawDiagram(t) {
    drawNeph(t, 'diagram');
    // 카드 보관함
    panel(14, 300, 176, 286, { r: 16 });
    txt('🧩 화살표 카드', 102, 326, { size: 14.5, weight: 800, color: '#374151', align: 'center' });
    txt('알맞은 자리에 끌어다 놓아요', 102, 346, { size: 12.5, weight: 700, color: '#6b7280', align: 'center' });
    DG.cards.forEach((c) => { ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; rr(c.hx - 71, c.hy - 24, 142, 48, 14); ctx.stroke(); ctx.restore(); });
    const dragCard = DG.cards.find((c) => c.drag);
    const answerIds = DG.done;
    DG.slots.forEach((s, i) => {
      const filled = DG.cards.find((c) => c.slot === i);
      const col = answerIds ? DG.cards.find((c) => c.id === SLOT_ANSWER[i]).color : '#64748b';
      const pulse = DG.done ? 1 : 0.55 + 0.25 * Math.sin(t * 4 + i);
      D.arrow(s.dir[0], s.dir[1], s.dir[2], s.dir[3], { color: col, width: DG.done ? 5 : 4, head: 12, alpha: DG.done ? 1 : 0.7 });
      pill(s.label, s.lx, s.ly, { size: 13, bg: '#fff', color: '#1b2333', border: col, borderW: 2, shadow: true });
      if (!filled) D.ring(s.x, s.y, 24, t + i * 0.3, { color: dragCard ? '#16a34a' : '#f59e0b' });
      if (DG.done) {
        for (let k = 0; k < 3; k++) {
          const q = ((t * 0.9 + k / 3) % 1);
          D.sphere(lerp(s.dir[0], s.dir[2], q), lerp(s.dir[1], s.dir[3], q), 4.5, col, { gloss: false });
        }
      }
    });
    DG.cards.forEach((c) => { if (!c.drag) drawCard(c); });
    if (dragCard) drawCard(dragCard);
    if (DG.done) {
      D.check(402, 330, 22, clamp(DG.doneT / 0.5, 0, 1));
      pill('모식도 완성!', 470, 330, { size: 15, bg: '#15803d', shadow: true });
    }
  }

  /* =========================================================
     장면 전환 · 화면 구성
     ========================================================= */
  const SCENE_LABEL = {
    waste: '🧪 노폐물은 어디로 갈까?',
    kidney: { sys: '🫘 배설계 — 오줌이 만들어져 나가는 길', sec: '🫘 콩팥 단면 — 겉질 · 속질 · 콩팥 깔때기', neph: '🫘 네프론 — 사구체 · 보먼주머니 · 세뇨관' },
    model: '💧 네프론 모형 — 여과 · 재흡수 · 분비',
    diagram: '📝 오줌 생성 모식도 완성하기',
  };
  const VIEW_ORDER = ['sys', 'sec', 'neph'];
  let sceneBtns = [], viewBtns = [], nutBtns = [], reabsBtns = [];
  function updateUI() {
    const sc = S.scene;
    $('#sceneLabel').textContent = sc === 'kidney' ? SCENE_LABEL.kidney[S.view] : SCENE_LABEL[sc];
    sceneBtns.forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    viewBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    nutBtns.forEach((b) => b.classList.toggle('on', b.dataset.nut === WS.nut));
    reabsBtns.forEach((b) => b.classList.toggle('on', (b.dataset.reabs === '1') === S.reabs));
    const free = game && game.free;
    const show = { waste: sc === 'waste', kidney: sc === 'kidney', model: sc === 'model' };
    let any = false;
    $$('#ctrlCard [data-ctl]').forEach((n) => {
      let on = show[n.dataset.ctl];
      if (n.id === 'ctlReabs') on = on && (S.modelStage >= 1 || free);
      n.hidden = !on; if (on) any = true;
    });
    $('#ctrlCard').hidden = !any;
  }
  function setScene(name, o) {
    o = o || {};
    if (name === S.scene && !o.force) { updateUI(); return; }
    S.scene = name; S.sceneT = 0;
    if (!RM) SciSim.tween(S, { sceneT: 1 }, { duration: 0.5, ease: 'outCubic' }); else S.sceneT = 1;
    if (name === 'model') {
      if (o.reset) { S.pore = 90; S.reabs = true; S.modelStage = 0; S.offTime = 0; S.onAfterOff = 0; S.everOff = false; syncControls(); }
      resetNeph(true);
    }
    if (name === 'kidney' && S.view === 'neph') { S.pore = 40; S.reabs = true; syncControls(); resetNeph(true); }
    if (name === 'diagram') resetNeph(true);
    updateUI();
  }
  function setView(v, fromTap) {
    if (v === S.view) return;
    S.prevView = S.view; S.view = v; S.viewMix = 0;
    S.visited.add(v);
    if (!RM) SciSim.tween(S, { viewMix: 1 }, { duration: 0.55, ease: 'inOutCubic' }); else S.viewMix = 1;
    if (v === 'neph') { S.pore = 40; S.reabs = true; syncControls(); resetNeph(true); }
    Sound.click();
    updateUI();
  }
  function syncControls() {
    const el = $('#sPore'); if (!el) return;
    el.value = S.pore; poreRange.refresh();
    updateUI();
  }

  /* =========================================================
     갱신 · 그리기 루프
     ========================================================= */
  const needNeph = () => S.scene === 'model' || S.scene === 'diagram' || (S.scene === 'kidney' && (S.view === 'neph' || S.prevView === 'neph' && S.viewMix < 1));
  function update(dt, t) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.scene === 'waste') updateWaste(dt, t);
    if (needNeph()) updateNeph(dt);
    if (S.scene === 'diagram') updateDiagram(dt);
    PFX.update(dt);
    // 재흡수 끄기 관찰 시간
    if (S.scene === 'model') {
      if (!S.reabs) { S.offTime += dt; S.everOff = true; S.onAfterOff = 0; }
      else if (S.everOff) S.onAfterOff += dt;
    }
  }
  function drawView(v, t, dt, live) {
    if (v === 'sys') drawSys(t, live ? dt : 0);
    else if (v === 'sec') drawSection(t);
    else { drawNeph(t, 'struct'); }
  }
  function draw(t, dt) {
    view.clear(BG);
    ctx.save();
    // 바탕
    if (S.scene === 'kidney' || S.scene === 'model' || S.scene === 'diagram') panel(6, 6, 788, 588, { r: 22, bg: 'rgba(255,255,255,.6)' });
    const k = clamp(S.sceneT, 0, 1);
    ctx.globalAlpha = k;
    const sc = 1 + (1 - k) * 0.03;
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    if (S.scene === 'waste') drawWaste(t, dt);
    else if (S.scene === 'kidney') {
      if (S.viewMix < 1 && S.prevView) {
        const m = S.viewMix, zin = VIEW_ORDER.indexOf(S.view) > VIEW_ORDER.indexOf(S.prevView);
        ctx.save(); ctx.globalAlpha = k * (1 - m);
        const s1 = zin ? 1 + m * 0.35 : 1 - m * 0.25;
        ctx.translate(W / 2, H / 2); ctx.scale(s1, s1); ctx.translate(-W / 2, -H / 2);
        drawView(S.prevView, t, 0, false);
        ctx.restore();
        ctx.save(); ctx.globalAlpha = k * m;
        const s2 = zin ? 0.8 + m * 0.2 : 1.25 - m * 0.25;
        ctx.translate(W / 2, H / 2); ctx.scale(s2, s2); ctx.translate(-W / 2, -H / 2);
        drawView(S.view, t, dt, true);
        ctx.restore();
      } else {
        drawView(S.view, t, dt, true);
        drawHotspots(t);
      }
    }
    else if (S.scene === 'model') drawModel(t);
    else drawDiagram(t);
    ctx.restore();
    PFX.draw(ctx);
    // 안내 말풍선
    if (S.msgT > 0) {
      const a = Math.min(1, S.msgT / 0.4);
      ctx.save(); ctx.globalAlpha = a;
      const lines2 = lines(S.msg, 560, 15, 800);
      const hh = lines2.length * 22 + 16;
      const y0 = S.scene === 'waste' ? 534 : 548;
      rr(W / 2 - 290, y0 - hh / 2 - 8, 580, hh + 8, 14);
      ctx.fillStyle = S.msgKind === 'bad' ? '#7f1d1d' : '#14532d'; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12; ctx.fill();
      ctx.shadowColor = 'transparent';
      lines2.forEach((ln, i) => txt(ln, W / 2, y0 - hh / 2 + 14 + i * 22, { size: 15, weight: 800, color: '#fff', align: 'center', base: 'middle' }));
      ctx.restore();
    }
  }

  /* =========================================================
     입력
     ========================================================= */
  function tapTarget(p) {
    const h = hotAt(p);
    if (h) return { kind: 'hot', h };
    if (S.view === 'sys') {
      for (const k of [SYS.kL, SYS.kR]) if (Math.hypot(p.x - k.x, p.y - k.y) < 74) return { kind: 'kidney' };
      if (Math.hypot(p.x - SYS.bl.x, p.y - SYS.bl.y) < 56) return { kind: 'focus', id: 'bladder' };
      if (p.x > 252 && p.x < 288 && p.y > 498 && p.y < 584) return { kind: 'focus', id: 'urethra' };
      for (const u of [ureterL, ureterR]) { for (let s = 0; s < u.len; s += 12) { const q = u.at(s); if (Math.hypot(p.x - q.x, p.y - q.y) < 18) return { kind: 'focus', id: 'ureter' }; } }
      for (let i = 0; i < 4; i++) { const y = 76 + i * 118; if (p.x >= 468 && p.x <= 770 && p.y >= y && p.y <= y + 104) return { kind: 'focus', id: SYS_ROWS[i].id }; }
    } else if (S.view === 'sec') {
      if (Math.hypot(p.x - 414, p.y - 236) < 30) return { kind: 'zoom' };
      if (p.x >= 556 && p.x <= 780 && p.y >= 86 && p.y <= 298) return { kind: 'zoom' };
    }
    return null;
  }
  function revealHot(h) {
    if (!S.found.has(h.id)) {
      S.found.add(h.id);
      Sound.success();
      burst(h.x, h.y, ['#22c55e', '#facc15', '#fff'], 14, { speed: 110 });
    } else Sound.click();
    S.focus = h.id;
  }
  const handlers = {
    down(p) {
      if (S.scene === 'waste') {
        const cs = Object.values(WS.chips).filter((c) => c.visible && !c.placed && !c.fly && c.sc > 0.5);
        for (let i = cs.length - 1; i >= 0; i--) {
          const c = cs[i];
          if (Math.abs(p.x - c.x) <= 74 && Math.abs(p.y - c.y) <= 26) { WS.drag = { chip: c, ox: c.x - p.x, oy: c.y - p.y }; Sound.click(); return true; }
        }
        return false;
      }
      if (S.scene === 'diagram') {
        for (let i = DG.cards.length - 1; i >= 0; i--) {
          const c = DG.cards[i], w = c.slot != null ? 52 : 74, h = c.slot != null ? 20 : 26;
          if (Math.abs(p.x - c.x) <= w && Math.abs(p.y - c.y) <= h) { c.drag = true; DG.dragOff = { ox: c.x - p.x, oy: c.y - p.y }; Sound.click(); DG.cards.splice(i, 1); DG.cards.push(c); return true; }
        }
        return false;
      }
      if (S.scene === 'kidney' && S.viewMix >= 1) {
        const tg = tapTarget(p);
        if (tg) { S.tap = { tg, x: p.x, y: p.y }; return true; }
      }
      return false;
    },
    move(p) {
      if (WS.drag) { const c = WS.drag.chip; c.x = clamp(p.x + WS.drag.ox, 20, W - 20); c.y = clamp(p.y + WS.drag.oy, 20, H - 20); }
      const dc = DG.cards.find((c) => c.drag);
      if (dc) { dc.x = clamp(p.x + DG.dragOff.ox, 20, W - 20); dc.y = clamp(p.y + DG.dragOff.oy, 20, H - 20); }
    },
    up(p) {
      if (WS.drag) {
        const c = WS.drag.chip; WS.drag = null;
        const z = zoneAt(c.x, c.y);
        if (z && RULES[c.id][z]) placeChip(c, z);
        else if (z) { c.shake = 0.4; Sound.fail(); say((WRONG[c.id] && WRONG[c.id][z]) || '여기가 아니에요. 다시 생각해 봐요.', 'bad'); }
        return;
      }
      const dc = DG.cards.find((c) => c.drag);
      if (dc) {
        dc.drag = false;
        let best = -1, bd = 56;
        DG.slots.forEach((s, i) => { const d = Math.hypot(dc.x - s.x, dc.y - s.y); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) {
          const other = DG.cards.find((c) => c !== dc && c.slot === best);
          if (other) other.slot = dc.slot;
          dc.slot = best;
          burst(DG.slots[best].x, DG.slots[best].y, [dc.color, '#fff'], 8, { speed: 70, size: 3 });
        } else dc.slot = null;
        Sound.click();
        return;
      }
      if (S.tap) {
        const tp = S.tap; S.tap = null;
        if (Math.hypot(p.x - tp.x, p.y - tp.y) > 14) return;
        const tg = tp.tg;
        if (tg.kind === 'hot') revealHot(tg.h);
        else if (tg.kind === 'kidney') { SYS.focus = 'kidney'; Sound.click(); setView('sec'); }
        else if (tg.kind === 'zoom') setView('neph');
        else if (tg.kind === 'focus') { SYS.focus = tg.id; Sound.click(); }
      }
    },
    hover(p) {
      if (S.scene === 'waste') {
        const c = Object.values(WS.chips).find((q) => q.visible && !q.placed && Math.abs(p.x - q.x) <= 74 && Math.abs(p.y - q.y) <= 26);
        return c ? 'grab' : null;
      }
      if (S.scene === 'diagram') return DG.cards.find((c) => Math.abs(p.x - c.x) <= 74 && Math.abs(p.y - c.y) <= 26) ? 'grab' : null;
      if (S.scene === 'kidney') return tapTarget(p) ? 'pointer' : null;
      return null;
    },
  };

  /* =========================================================
     컨트롤 연결
     ========================================================= */
  sceneBtns = $$('#sceneSeg button');
  viewBtns = $$('#viewSeg button');
  nutBtns = $$('#nutSeg button');
  reabsBtns = $$('#reabsSeg button');
  sceneBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, b.dataset.scene === 'diagram' ? { force: false } : {}); if (b.dataset.scene === 'diagram') { S.pore = 40; S.reabs = true; syncControls(); } }));
  viewBtns.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  nutBtns.forEach((b) => b.addEventListener('click', () => { if (!startBreak(b.dataset.nut)) say('분해가 끝날 때까지 잠깐 기다려요!', 'info'); updateUI(); }));
  reabsBtns.forEach((b) => b.addEventListener('click', () => {
    const on = b.dataset.reabs === '1';
    if (on === S.reabs) return;
    S.reabs = on; Sound.click(); resetStats(); updateUI();
  }));
  const poreRange = SciSim.bindRange($('#sPore'), $('#oPore'), (v) => (poreOf(v) * 2).toFixed(1), (v) => { S.pore = v; resetStats(); });
  $('#sPore').addEventListener('pointerdown', () => { resetStats(); });

  /* =========================================================
     차시 구성
     ========================================================= */
  const mark = (b) => (b ? '✅' : '⬜');
  const NUT_ORDER = ['carb', 'fat', 'prot'];

  const levels = [
    /* ---------------- STEP 1 ---------------- */
    {
      title: '영양소가 분해되면 노폐물이 생겨요', short: '노폐물', icon: '🧪', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 몸속 노폐물은 어떻게 오줌이 되어 나갈까?</p>' +
        '<p>먹은 영양소는 세포에서 분해되어 에너지를 내요. 이때 몸에 필요 없는 물질, 즉 <b>노폐물</b>도 함께 생겨요.</p>' +
        '<p>어떤 노폐물이 생기는지 살펴보고, 몸의 어느 기관으로 보내야 하는지 알아봐요.</p>',
      features: ['waste'],
      setup() { setScene('waste'); },
      recap: '탄수화물·지방은 이산화 탄소와 물로, 단백질은 이산화 탄소·물·암모니아로 분해돼요. 이산화 탄소는 폐로, 암모니아는 간에서 요소로 바뀐 뒤 콩팥으로 가요.',
      summary: '<ul><li>탄수화물·지방 → <b>이산화 탄소 + 물</b></li><li>단백질 → 이산화 탄소 + 물 + <b>암모니아</b> (질소가 들어 있어요)</li>' +
        '<li>이산화 탄소는 <b>폐</b>에서 날숨으로 나가요.</li><li>암모니아는 해로워서 <b>간</b>에서 덜 해로운 <b>요소</b>로 바뀌어요.</li>' +
        '<li>물과 요소는 <b>콩팥</b>에서 오줌이 되어 나가요.</li></ul>',
      missions: [
        {
          title: '세 영양소가 분해되는 모습 보기',
          goal: '탄수화물, 지방, 단백질을 하나씩 골라 세포 속에서 분해되는 모습을 지켜봐요.',
          hint: '아래 영양소 버튼을 눌러 보세요. 분해가 끝나면 노폐물이 상자에 나타나요.',
          hold: 0.6,
          status: () => NUT_ORDER.map((k) => mark(WS.seen.has(k)) + ' ' + NUT[k].name).join(' · '),
          check: () => NUT_ORDER.every((k) => WS.seen.has(k)) && !WS.anim,
          explain: '영양소가 세포에서 분해될 때 <b>탄수화물과 지방</b>에서는 이산화 탄소와 물이, <b>단백질</b>에서는 이산화 탄소와 물 외에 <b>암모니아</b>도 생겨요. 단백질에는 탄수화물·지방에 없는 질소가 들어 있기 때문이에요.',
        },
        {
          title: '노폐물을 알맞은 기관으로 보내기',
          goal: '노폐물 상자의 카드를 끌어서 폐, 간, 콩팥으로 보내요. 암모니아는 두 번 거쳐야 해요!',
          hint: '이산화 탄소는 폐로, 물은 콩팥으로 보내요. 암모니아는 간에서 요소로 바뀌니 요소를 다시 콩팥으로 보내요.',
          manual: true,
          setup() { ensureChips(); },
          status: () => mark(!!WS.chips.co2.placed) + ' 이산화 탄소 · ' + mark(!!WS.chips.water.placed) + ' 물 · ' + mark(!!WS.chips.nh3.placed) + ' 암모니아 · ' + mark(!!WS.chips.urea.placed) + ' 요소',
          check: () => {
            const c = WS.chips;
            if (!c.co2.placed) return '이산화 탄소를 아직 보내지 않았어요. 어느 기관으로 나갈까요?';
            if (!c.water.placed) return '물을 아직 보내지 않았어요. 콩팥으로 보내 볼까요?';
            if (!c.nh3.placed) return '암모니아를 아직 보내지 않았어요. 해로운 암모니아는 어디서 바뀔까요?';
            if (!c.urea.placed || c.urea.fly) return '간에서 만들어진 요소를 콩팥으로 보내 주세요.';
            return true;
          },
          explain: '<b>이산화 탄소</b>는 폐에서 날숨으로 나가요. 단백질 분해로 생긴 <b>암모니아</b>는 해로워서 <b>간</b>에서 독성이 약한 <b>요소</b>로 바뀐 뒤 혈액을 따라 콩팥으로 가고, <b>물</b>과 함께 <b>오줌</b>이 되어 나가요.',
        },
        {
          title: '퀴즈: 단백질에서만 생기는 노폐물',
          goal: '탄수화물·지방에서는 생기지 않고 단백질이 분해될 때만 생기는 노폐물은 무엇일까요?',
          choices: ['이산화 탄소', '물', '암모니아', '포도당'],
          answer: 2,
          feedback: ['이산화 탄소는 탄수화물·지방에서도 생겨요.', '물은 탄수화물·지방이 분해될 때도 생겨요.', null, '포도당은 노폐물이 아니라 에너지원으로 쓰이는 영양소예요.'],
          explain: '단백질에는 <b>질소</b>가 들어 있어서 분해되면 질소를 포함한 <b>암모니아</b>가 생겨요. 암모니아는 간에서 요소로 바뀌어 콩팥으로 가요.',
        },
      ],
    },
    /* ---------------- STEP 2 ---------------- */
    {
      title: '콩팥의 구조와 네프론', short: '콩팥 구조', icon: '🫘', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물과 요소가 콩팥으로 가서 오줌이 되는 것을 봤어요.</div>' +
        '<p>콩팥 안은 어떻게 생겼을까요? 배설계 → 콩팥 단면 → <b>네프론</b> 순서로 확대하며 살펴봐요.</p>',
      features: ['kidney'],
      setup() { S.view = 'sys'; S.prevView = null; S.viewMix = 1; SYS.focus = null; setScene('kidney', { force: true }); },
      recap: '배설계는 콩팥·오줌관·방광·요도로 이루어져요. 콩팥의 오줌 만드는 단위가 네프론(사구체+보먼주머니+세뇨관)이에요.',
      summary: '<ul><li><b>배설계</b>: 콩팥 → 오줌관 → 방광 → 요도</li><li><b>콩팥</b>: 겉질(바깥) · 속질(안쪽) · 콩팥 깔때기(오줌이 모이는 곳)</li>' +
        '<li><b>네프론</b> = 사구체 + 보먼주머니 + 세뇨관 (오줌을 만드는 단위)</li><li>사구체는 모세 혈관이 뭉친 공 모양, 보먼주머니는 그것을 감싼 주머니예요.</li></ul>',
      missions: [
        {
          title: '배설계에서 네프론까지 확대하기',
          goal: '배설계, 콩팥 단면, 네프론을 모두 살펴봐요.',
          hint: '아래 버튼을 누르거나, 그림에서 반짝이는 콩팥과 렌즈를 눌러 확대해 보세요.',
          hold: 0.8,
          status: () => mark(S.visited.has('sys')) + ' 배설계 · ' + mark(S.visited.has('sec')) + ' 콩팥 단면 · ' + mark(S.visited.has('neph')) + ' 네프론',
          check: () => S.visited.has('sys') && S.visited.has('sec') && S.visited.has('neph') && S.viewMix >= 1,
          explain: '콩팥은 배설계의 중심 기관이에요. 콩팥을 자르면 겉질·속질·콩팥 깔때기가 보이고, 더 확대하면 오줌을 만드는 작은 단위인 <b>네프론</b>이 보여요.',
        },
        {
          title: '이름표 6개 찾기',
          goal: '콩팥 단면과 네프론에서 ? 표시를 눌러 부분의 이름과 하는 일을 확인해요.',
          hint: '콩팥 단면에서 3개(겉질·속질·콩팥 깔때기), 네프론에서 3개(사구체·보먼주머니·세뇨관)를 찾아요.',
          hold: 0.6,
          setup() { if (S.view === 'sys') setView('sec'); },
          status: () => ['cortex', 'medulla', 'pelvis', 'glom', 'bowman', 'tubule'].map((k) => mark(S.found.has(k))).join(' ') + ' <b>' + S.found.size + ' / 6</b>',
          check: () => S.found.size >= 6,
          explain: '<b>겉질</b>에는 사구체와 보먼주머니가, <b>속질</b>에는 세뇨관의 일부가 있어요. 만들어진 오줌은 <b>콩팥 깔때기</b>에 모였다가 오줌관으로 나가요.',
        },
        {
          title: '퀴즈: 네프론은 무엇으로 이루어질까?',
          goal: '네프론을 이루는 세 부분을 모두 고른 것은?',
          choices: ['사구체, 보먼주머니, 세뇨관', '사구체, 보먼주머니, 콩팥 깔때기', '겉질, 속질, 세뇨관', '방광, 오줌관, 요도'],
          answer: 0,
          feedback: [null, '콩팥 깔때기는 오줌이 모이는 곳으로 네프론에 속하지 않아요.', '겉질·속질은 콩팥을 이루는 층이에요. 네프론은 그 속에 들어 있는 단위예요.', '방광·오줌관·요도는 오줌이 지나가는 배설 기관이에요.'],
          explain: '<b>네프론 = 사구체 + 보먼주머니 + 세뇨관</b>이에요. 한쪽 콩팥에는 이런 네프론이 약 100만 개나 들어 있어요.',
        },
      ],
    },
    /* ---------------- STEP 3 ---------------- */
    {
      title: '여과 · 재흡수 · 분비로 오줌 만들기', short: '오줌 생성', icon: '💧', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 네프론이 사구체·보먼주머니·세뇨관으로 이루어진 것을 알았어요.</div>' +
        '<p>네프론 모형에 혈액을 흘려 보내요. 오줌은 <b>① 여과 → ② 재흡수 → ③ 분비</b>를 거쳐 만들어져요.</p>',
      features: ['model'],
      setup() { setScene('model', { reset: true }); },
      recap: '사구체에서 크기가 작은 물질이 보먼주머니로 여과되고, 세뇨관에서 포도당·아미노산 전부와 물·무기염류 대부분이 재흡수돼요. 일부 노폐물은 분비돼요.',
      summary: '<ul><li><b>여과</b>: 사구체 → 보먼주머니. 크기가 작은 물(물·포도당·아미노산·무기염류·요소)만 걸러지고, 적혈구·단백질 같은 큰 물질은 남아요.</li>' +
        '<li><b>재흡수</b>: 세뇨관 → 모세 혈관. 포도당·아미노산은 전부, 물·무기염류는 대부분 되돌아가요.</li><li><b>분비</b>: 모세 혈관 → 세뇨관. 혈액의 노폐물 일부가 세뇨관으로 더해져요.</li>' +
        '<li>세뇨관에 남은 것이 <b>오줌</b>이 되어 콩팥 깔때기 → 오줌관 → 방광으로 가요.</li></ul>',
      missions: [
        {
          title: '사구체 필터 구멍 크기 맞추기',
          goal: '구멍 크기를 조절해서 작은 입자는 통과시키고, 적혈구와 단백질은 혈액에 남게 해요.',
          hint: '구멍이 너무 크면 큰 입자가 새고, 너무 작으면 포도당 같은 작은 입자도 못 지나가요. 천천히 움직여 보세요.',
          hold: 1.0,
          status: () => mark(SMALL.every((k) => S.stat.passed[k] >= 1)) + ' 작은 입자 5종 걸러짐 · ' + mark(BIGK.every((k) => S.stat.blocked[k] >= 1) && BIGK.every((k) => S.stat.passed[k] === 0)) + ' 큰 입자는 남음',
          check: () => filterOK(),
          explain: '사구체의 모세 혈관 벽에는 작은 구멍이 있어서 <b>크기가 작은 물질</b>(물·포도당·아미노산·무기염류·요소)만 보먼주머니로 <b>여과</b>돼요. <b>적혈구와 단백질</b>은 구멍보다 커서 혈액에 남아요.',
        },
        {
          title: '재흡수를 껐다 켜 보기',
          goal: '"재흡수"를 끄고 3초 넘게 오줌 검사 결과를 본 뒤, 다시 켜 보세요.',
          hint: '오른쪽의 "끄기"를 누르면 오줌 검사에 포도당과 아미노산이 쌓여요. 그 뒤 "켜기"를 눌러요.',
          hold: 0.5,
          setup() { S.modelStage = 1; S.pore = 40; S.reabs = true; S.offTime = 0; S.onAfterOff = 0; S.everOff = false; resetStats(); syncControls(); },
          status: () => mark(S.offTime >= 3) + ' 끄고 3초 관찰 · ' + mark(S.offTime >= 3 && S.reabs && S.onAfterOff >= 1.5) + ' 다시 켜기',
          check: () => S.offTime >= 3 && S.reabs && S.onAfterOff >= 1.5,
          explain: '<b>재흡수</b>가 꺼지면 걸러진 포도당·아미노산·물이 그대로 오줌이 돼요. 정상일 때는 <b>세뇨관 → 모세 혈관</b>으로 되돌아가요. 또 혈액에 남은 노폐물 일부는 <b>분비</b>되어 모세 혈관 → 세뇨관으로 이동해요.',
        },
        {
          title: '퀴즈: 오줌에 포도당이 없는 까닭',
          goal: '건강한 사람의 오줌에는 포도당이 거의 없어요. 그 까닭은?',
          choices: ['포도당은 입자가 커서 사구체에서 여과되지 않아서', '여과된 포도당이 세뇨관에서 모두 재흡수되어서', '방광에서 포도당이 분해되어서', '간에서 포도당이 요소로 바뀌어서'],
          answer: 1,
          feedback: ['포도당은 작은 입자라서 사구체에서 여과돼요. 큰 것은 적혈구와 단백질이에요.', null, '방광은 오줌을 모아 두기만 해요. 오줌 성분이 바뀌는 곳은 아니에요.', '요소는 암모니아에서 만들어져요. 포도당과는 관계가 없어요.'],
          explain: '포도당은 작아서 사구체에서 <b>여과</b>되지만, 세뇨관에서 <b>전부 재흡수</b>되어 혈액으로 돌아가요. 그래서 건강한 사람의 오줌에는 포도당이 없어요.',
        },
      ],
    },
    /* ---------------- STEP 4 ---------------- */
    {
      title: '오줌 생성 모식도 그리기', short: '모식도', icon: '📝', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 여과·재흡수·분비가 어디서 어느 방향으로 일어나는지 모형으로 확인했어요.</div>' +
        '<p>배운 내용을 한 장의 <b>모식도</b>로 정리해요. 화살표 카드를 알맞은 자리에 놓아 완성해 보세요.</p>',
      features: ['diagram'],
      setup() { S.pore = 40; S.reabs = true; syncControls(); setScene('diagram', { force: true }); },
      recap: '여과(사구체→보먼주머니), 재흡수(세뇨관→모세 혈관), 분비(모세 혈관→세뇨관)를 거쳐 만든 오줌은 콩팥→오줌관→방광→요도 순으로 나가요.',
      summary: '<ul><li><b>여과</b>: 사구체 → 보먼주머니</li><li><b>재흡수</b>: 세뇨관 → 모세 혈관</li><li><b>분비</b>: 모세 혈관 → 세뇨관</li>' +
        '<li>오줌의 배설 경로: <b>콩팥 → 오줌관 → 방광 → 요도 → 몸 밖</b></li></ul>',
      missions: [
        {
          title: '여과 · 재흡수 · 분비 모식도 완성하기',
          goal: '세 장의 화살표 카드를 모식도의 알맞은 자리에 끌어다 놓아요.',
          hint: '자리마다 "어디에서 어디로" 이동하는지 적혀 있어요. 이동 방향을 보고 이름을 골라요.',
          manual: true,
          status: () => diagramState().map((id, i) => mark(id != null) + ' ' + (i + 1) + '번 자리').join(' · '),
          check: () => {
            const st = diagramState();
            if (st.some((x) => x == null)) return '아직 비어 있는 자리가 있어요. 카드 3장을 모두 놓아 주세요.';
            const wrong = st.map((id, i) => (id === SLOT_ANSWER[i] ? 0 : i + 1)).filter(Boolean);
            if (wrong.length) return wrong.join('번, ') + '번 자리를 다시 확인해 봐요. 이동 방향을 보고 이름을 떠올려요.';
            return true;
          },
          explain: '<b>여과</b>는 사구체에서 보먼주머니로, <b>재흡수</b>는 세뇨관에서 모세 혈관으로, <b>분비</b>는 모세 혈관에서 세뇨관으로 물질이 이동하는 과정이에요.',
        },
        {
          title: '퀴즈: 오줌이 나가는 길',
          goal: '콩팥에서 만들어진 오줌이 몸 밖으로 나가는 순서로 옳은 것은?',
          choices: ['콩팥 → 오줌관 → 방광 → 요도', '콩팥 → 방광 → 오줌관 → 요도', '방광 → 콩팥 → 오줌관 → 요도', '콩팥 → 요도 → 방광 → 오줌관'],
          answer: 0,
          feedback: [null, '오줌관은 콩팥과 방광을 이어 줘요. 방광보다 앞에 있어요.', '오줌은 콩팥에서 만들어져요. 방광은 모아 두는 곳이에요.', '요도는 방광 다음에 있는, 몸 밖으로 나가는 길이에요.'],
          explain: '오줌은 <b>콩팥(생성) → 오줌관(이동) → 방광(저장) → 요도(배출)</b> 순으로 몸 밖으로 나가요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작
     ========================================================= */
  const cv = $('#cv');
  view = SciSim.stage(cv, { width: W, height: H, background: BG, onResize() { nephCache = null; } });
  ctx = view.ctx;
  D = SciSim.draw(ctx);
  SciSim.pointer(view, handlers);

  game = SciSim.game({
    simId: 'm2-excretion',
    mount: '#game',
    badge: '배설 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      waste: '🍽️ 영양소 분해 · 노폐물 상자',
      kidney: '🫘 배설계 · 콩팥 · 네프론 확대',
      model: '🔬 필터 구멍 · 재흡수 스위치',
      diagram: '📝 화살표 카드 · 모식도',
    },
    onFeatures(set) { F = new Set(set); updateUI(); },
    onMissionStart() { S.msgT = 0; updateUI(); },
    onComplete() { updateUI(); },
    levels,
  });
  updateUI();
  resetNeph(true);

  window.__sim = {
    S, WS, DG, CH, ZONES, SYS, HOT, game, setScene, setView, startBreak, placeChip, ensureChips, TYPES, filterOK, update, ZC,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
    chipPoint(id) { const c = WS.chips[id]; return this.toClient(c.x, c.y); },
    zonePoint(z) { const c = ZC(z); return this.toClient(c.x, c.y); },
    cardPoint(id) { const c = DG.cards.find((q) => q.id === id); return this.toClient(c.x, c.y); },
    slotPoint(i) { return this.toClient(DG.slots[i].x, DG.slots[i].y); },
    hotPoint(id) { const h = HOT.sec.concat(HOT.neph).find((q) => q.id === id); return this.toClient(h.x, h.y); },
    lensPoint() { return this.toClient(414, 236); },
    kidneyPoint() { return this.toClient(SYS.kL.x, SYS.kL.y); },
  };

  let tPrev = 0;
  SciSim.loop((dt, t) => {
    update(dt, t);
    draw(t, dt);
  });
})();
