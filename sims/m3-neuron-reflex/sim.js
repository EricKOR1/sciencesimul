/* =========================================================
   중3 Ⅴ. 자극과 반응 — 뉴런과 신경계, 반응 [9과20-02]
   ① [관찰] 뉴런: 가지 돌기 · 신경 세포체 · 축삭 돌기, 감각–연합–운동 뉴런
   ② [모형] 신경계: 중추 신경계(대뇌·소뇌·간뇌·중간뇌·연수·척수)와 말초 신경계
   ③ [실험] 의식적 반응: 자 잡기로 반응 시간 측정
   ④ [탐구] 무조건 반사: 무릎 반사 · 경로와 속도 비교
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
     장면 1 · 뉴런
     ===================================================== */
  const S = { scene: 'neuron' };
  const NV = {
    view: 'one', pulses: [], deliv1: 0, delivC: 0, types: new Set(), sel: null, hl: {}, lit: [0, 0, 0],
    muscle: new SciSim.Spring(0, { stiffness: 220, damping: 12 }), arrive: 0, nuc: 0, neurons: null, one: null,
  };
  const NV_INFO = {
    dend: ['가지 돌기', '다른 뉴런이나 감각 기관에서 오는 자극을 받아들이는 부분이에요. 나뭇가지처럼 갈라져 있어요.'],
    soma: ['신경 세포체', '핵이 있고 뉴런의 생명 활동이 일어나는 부분이에요. 가지 돌기가 받은 자극이 이곳을 지나가요.'],
    axon: ['축삭 돌기', '자극을 다른 뉴런이나 근육으로 전달하는 긴 부분이에요. 신호는 가지 돌기 → 축삭 돌기 끝, 한 방향으로만 가요.'],
    term: ['축삭 돌기 끝', '다음 뉴런이나 근육에 신호를 넘겨 주는 곳이에요. 신호는 이곳에서 거꾸로 되돌아가지 않아요.'],
    sens: ['감각 뉴런', '피부·눈 같은 감각 기관이 받아들인 자극을 중추 신경계(뇌·척수)로 전달해요.'],
    assoc: ['연합 뉴런', '뇌와 척수를 이루고 있어요. 전달받은 자극을 판단하고 명령을 내려요.'],
    motor: ['운동 뉴런', '중추 신경계가 내린 명령을 근육 같은 반응 기관으로 전달해요.'],
  };
  const NV_COL = { sens: '#5aa2ff', assoc: '#b58bff', motor: '#ffab4a' };

  function branch(list, x, y, ang, len, w, depth, r) {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    list.push([x, y, x2, y2, w]);
    let chain = [[x, y], [x2, y2]];
    if (depth > 0) {
      const c1 = branch(list, x2, y2, ang + 0.35 + r() * 0.3, len * 0.74, w * 0.72, depth - 1, r);
      branch(list, x2, y2, ang - 0.35 - r() * 0.3, len * 0.74, w * 0.72, depth - 1, r);
      chain = chain.concat(c1.slice(1));
    }
    return chain;
  }
  function mkNeuron(o) {
    const r = rng(o.seed), dend = []; let chain = null;
    o.roots.forEach((ro, i) => {
      const a = ro[0], sx = o.soma[0] + Math.cos(a) * o.soma[2] * 0.85, sy = o.soma[1] + Math.sin(a) * o.soma[2] * 0.85;
      const c = branch(dend, sx, sy, a, ro[1], o.dw || 5, o.depth == null ? 2 : o.depth, r);
      if (i === 0) chain = c;
    });
    const axon = new PathM(o.axon, 10), myelin = [];
    for (let s = 26; s < axon.len - 36; s += 58) myelin.push(axon.at(s + 22));
    const end = o.axon[o.axon.length - 1];
    const blob = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, k = 1 + (r() - 0.5) * 0.16; blob.push([o.soma[0] + Math.cos(a) * o.soma[2] * k, o.soma[1] + Math.sin(a) * o.soma[2] * k]); }
    return Object.assign({}, o, { dend, chain, axon, myelin, end, blob, w: o.w || 9 });
  }
  function initNeurons() {
    NV.one = mkNeuron({ seed: 11, col: '#78a6ff', soma: [215, 250, 42], roots: [[Math.PI, 64], [Math.PI + 0.8, 54], [Math.PI - 0.8, 54]], dw: 6, depth: 2,
      axon: [[256, 250], [330, 258], [420, 244], [510, 254], [590, 248], [640, 250]], term: [[698, 208], [706, 250], [698, 292]], w: 9 });
    NV.neurons = [
      mkNeuron({ seed: 21, col: NV_COL.sens, soma: [152, 318, 22], roots: [[Math.PI, 58], [Math.PI + 0.7, 40], [Math.PI - 0.7, 40]], dw: 4, depth: 2, w: 6,
        axon: [[174, 320], [228, 334], [282, 326], [322, 318]], term: [[336, 318]] }),
      mkNeuron({ seed: 22, col: NV_COL.assoc, soma: [412, 296, 26], roots: [[Math.PI, 40], [Math.PI + 0.8, 34], [Math.PI - 0.8, 34]], dw: 4, depth: 2, w: 6,
        axon: [[438, 290], [472, 262], [508, 268], [536, 262]], term: [[550, 262]] }),
      mkNeuron({ seed: 23, col: NV_COL.motor, soma: [600, 252, 24], roots: [[Math.PI, 26], [Math.PI + 0.9, 22], [Math.PI - 0.9, 22]], dw: 4, depth: 1, w: 6,
        axon: [[624, 256], [660, 270], [694, 298], [726, 312]], term: [[734, 312]] }),
    ];
    // 하나의 뉴런 위를 지나는 신호 경로
    const o = NV.one, k1 = o.chain.slice().reverse().map((p) => p.slice());
    k1.push([o.soma[0], o.soma[1]]); o.axon.pts.length && o.axon.pts.filter((p, i) => i % 10 === 0).forEach((p) => k1.push(p));
    k1.push([o.term[1][0], o.term[1][1]]);
    NV.pathOne = new PathM(k1, 8);
    NV.tipOne = k1[0];
    // 연결된 뉴런 위의 신호 경로 (경계 길이를 기록)
    const keys = [], bounds = [];
    NV.neurons.forEach((n) => {
      const a = keys.length, ch = n.chain.slice().reverse();
      ch.forEach((p) => keys.push(p.slice()));
      keys.push([n.soma[0], n.soma[1]]);
      n.axon.pts.filter((p, i) => i % 10 === 0).forEach((p) => keys.push(p));
      keys.push([n.term[0][0], n.term[0][1]]);
      bounds.push([a, keys.length - 1]);
    });
    NV.pathChain = new PathM(keys, 8);
    NV.bounds = bounds.map((b) => [NV.pathChain.cum[b[0] * 8], NV.pathChain.cum[b[1] * 8]]);
    NV.tipChain = keys[0];
  }
  initNeurons();

  function fireStim() {
    if (NV.pulses.length) return false;
    const chain = NV.view === 'chain';
    NV.pulses.push({ path: chain ? NV.pathChain : NV.pathOne, s: 0, speed: chain ? 300 : 280, chain, gap: [false, false], tr: 0 });
    Sound.tick();
    return true;
  }
  function updateNeuron(dt) {
    NV.pulses.forEach((p) => {
      const prev = p.s; p.s += p.speed * dt;
      if (p.chain) {
        for (let i = 1; i < 3; i++) {
          const g = NV.bounds[i][0] - 6;
          if (prev < g && p.s >= g) {
            const q = p.path.at(g); PFX.burst(q.x, q.y, { count: 9, colors: ['#ffe27a', '#fff3b0'], speed: 55, gravity: 0, size: 2.6, life: 0.8, shape: 'circle' });
          }
        }
      }
      if (p.s >= p.path.len) {
        p.done = true;
        const q = p.path.at(p.path.len);
        if (p.chain) { NV.delivC++; NV.muscle.velocity = 0; NV.muscle.value = 1; NV.muscle.target = 0; burst(q.x + 18, q.y, ['#ffab4a', '#ffe27a', '#fff'], 14, { speed: 110, gravity: 0, size: 3.5 }); NV.arrive = now(); }
        else { NV.deliv1++; burst(q.x + 6, q.y, ['#ffe27a', '#fff3b0', '#ffffff'], 16, { speed: 90, gravity: 0, size: 3, life: 0.9 }); NV.arrive = now(); }
        Sound.success();
      }
    });
    NV.pulses = NV.pulses.filter((p) => !p.done);
    NV.muscle.update(dt);
    // 켜진 정도 (신호가 지나가면 뉴런이 밝아짐)
    const pc = NV.pulses[0];
    for (let i = 0; i < 3; i++) {
      let target = 0;
      if (pc && pc.chain) { const b = NV.bounds[i], s = pc.s; target = smoothstep(b[0] - 14, b[0] + 30, s) * (1 - smoothstep(b[1] + 10, b[1] + 150, s)); }
      else if (pc && i === 0) { const s = pc.s; target = smoothstep(0, 60, s) * (1 - smoothstep(pc.path.len - 40, pc.path.len + 100, s)); }
      NV.lit[i] = approach(NV.lit[i], target, dt, 12);
    }
    const keys = Object.keys(NV_INFO);
    keys.forEach((k) => { NV.hl[k] = approach(NV.hl[k] || 0, NV.sel === k ? 1 : 0, dt, 10); });
  }

  function drawNeuronShape(n, lit, t, hlKeys) {
    const lit1 = clamp(lit, 0, 1), col = n.col, bright = mix(col, '#ffffff', lit1 * 0.65);
    const hd = hlKeys.dend, hs = hlKeys.soma, ha = hlKeys.axon, ht = hlKeys.term;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 가지 돌기
    ctx.strokeStyle = rgba(col, 0.18 + lit1 * 0.3 + hd * 0.4); 
    n.dend.forEach((s) => { ctx.lineWidth = s[4] + 6; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); });
    ctx.strokeStyle = hd > 0.02 ? mix(bright, '#ffffff', hd * 0.6) : bright;
    n.dend.forEach((s) => { ctx.lineWidth = s[4]; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); });
    // 축삭 돌기
    ctx.strokeStyle = rgba(col, 0.2 + lit1 * 0.3 + ha * 0.4); ctx.lineWidth = n.w + 8; ctx.beginPath(); n.axon.trace(0, n.axon.len); ctx.stroke();
    ctx.strokeStyle = ha > 0.02 ? mix(bright, '#ffffff', ha * 0.6) : bright; ctx.lineWidth = n.w; ctx.beginPath(); n.axon.trace(0, n.axon.len); ctx.stroke();
    // 말이집
    n.myelin.forEach((m) => {
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a);
      const hw = n.w > 7 ? 24 : 19, hh = n.w > 7 ? 11 : 8;
      ctx.fillStyle = lgrad(0, -hh, 0, hh, [[0, '#fff6d2'], [0.55, '#f1d98d'], [1, '#d6b765']]);
      rr(-hw, -hh, hw * 2, hh * 2, hh); ctx.fill();
      ctx.strokeStyle = rgba('#7a5c10', 0.35); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    });
    // 축삭 돌기 끝
    const ex = n.end[0], ey = n.end[1];
    n.term.forEach((tp) => {
      ctx.strokeStyle = rgba(col, 0.25 + ht * 0.4); ctx.lineWidth = n.w * 0.7 + 6; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo((ex + tp[0]) / 2, ey + (tp[1] - ey) * 0.2, tp[0] - (n.w > 7 ? 8 : 5), tp[1]); ctx.stroke();
      ctx.strokeStyle = bright; ctx.lineWidth = n.w * 0.7; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo((ex + tp[0]) / 2, ey + (tp[1] - ey) * 0.2, tp[0] - (n.w > 7 ? 8 : 5), tp[1]); ctx.stroke();
      const br = n.w > 7 ? 9 : 6.5;
      bead(tp[0], tp[1], br, mix(col, '#ffffff', 0.3 + lit1 * 0.5 + ht * 0.3), { noShadow: true });
    });
    // 신경 세포체
    const [sx, sy, sr] = n.soma;
    D.glow(sx, sy, sr * 2.1, col, 0.22 + lit1 * 0.5 + hs * 0.3);
    ctx.beginPath(); smooth(ctx, n.blob, true);
    ctx.fillStyle = rgrad(sx - sr * 0.35, sy - sr * 0.4, sr * 0.1, sx, sy, sr * 1.1, [[0, mix(col, '#ffffff', 0.62 + lit1 * 0.3)], [0.6, mix(col, '#ffffff', lit1 * 0.5)], [1, shade(col, -0.35)]]);
    ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.35 + hs * 0.6); ctx.lineWidth = 1.6 + hs * 2; ctx.stroke();
    // 핵
    const nr = sr * 0.42;
    ctx.fillStyle = rgrad(sx - nr * 0.9, sy - nr * 0.2, 1, sx - nr * 0.7, sy, nr * 1.2, [[0, shade(col, 0.25)], [1, shade(col, -0.6)]]);
    ctx.beginPath(); ctx.arc(sx - sr * 0.12, sy, nr, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.5); ctx.beginPath(); ctx.arc(sx - sr * 0.2, sy - nr * 0.3, nr * 0.28, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawNeuronScene(t) {
    // 현미경 화면 같은 어두운 판
    ctx.save();
    ctx.shadowColor = 'rgba(20,30,70,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    rr(14, 14, 772, 442, 18); ctx.fillStyle = lgrad(0, 14, 0, 456, [[0, '#1d2c52'], [1, '#0f1a38']]); ctx.fill();
    ctx.restore();
    ctx.save(); rr(14, 14, 772, 442, 18); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let gx = 40; gx < 800; gx += 44) for (let gy = 40; gy < 460; gy += 44) { ctx.beginPath(); ctx.arc(gx, gy, 1.4, 0, TAU); ctx.fill(); }
    const hl = (k) => NV.hl[k] || 0;
    if (NV.view === 'one') {
      const n = NV.one;
      drawNeuronShape(n, NV.lit[0], t, { dend: hl('dend'), soma: hl('soma'), axon: hl('axon'), term: hl('term') });
      // 방향 화살표
      ctx.save(); ctx.globalAlpha = 0.5;
      D.arrow(150, 408, 650, 408, { color: '#cfe0ff', width: 3, head: 12, dash: [8, 8] });
      ctx.restore();
      txt('신호가 가는 방향 (한 방향)', 400, 394, { size: 14, weight: 800, color: '#cfe0ff', align: 'center' });
      // 자극 표시
      const tip = NV.tipOne, pulse = 0.5 + 0.5 * Math.sin(t * 5);
      if (!NV.pulses.length) { D.glow(tip[0], tip[1], 20 + pulse * 6, '#ffd166', 0.55); }
      pill('가지 돌기', 108, 168, { bg: '#2d4a86', color: '#fff', size: 14, border: 'rgba(255,255,255,.35)' });
      pill('신경 세포체', 215, 178, { bg: '#2d4a86', color: '#fff', size: 14, border: 'rgba(255,255,255,.35)' });
      pill('핵', 262, 302, { bg: '#2d4a86', color: '#fff', size: 14, border: 'rgba(255,255,255,.35)' });
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(250, 296); ctx.lineTo(220, 262); ctx.stroke();
      pill('축삭 돌기', 450, 196, { bg: '#2d4a86', color: '#fff', size: 14, border: 'rgba(255,255,255,.35)' });
      pill('축삭 돌기 끝', 690, 168, { bg: '#2d4a86', color: '#fff', size: 14, border: 'rgba(255,255,255,.35)' });
      pill('말이집', 520, 296, { bg: '#7a5c10', color: '#fff', size: 13, border: 'rgba(255,255,255,.3)' });
      if (!NV.pulses.length && now() - NV.arrive > 1.2) pill('⚡ 자극 주기를 눌러요', 112, 330, { bg: '#ffd166', color: '#4a3500', size: 14, alpha: 0.7 + 0.3 * pulse });
    } else {
      // 중추 신경계 상자
      ctx.fillStyle = 'rgba(181,139,255,.10)'; rr(333, 128, 318, 288, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(181,139,255,.55)'; ctx.setLineDash([7, 6]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      txt('중추 신경계 (뇌·척수)', 492, 152, { size: 14, weight: 800, color: '#d9c4ff', align: 'center' });
      NV.neurons.forEach((n, i) => drawNeuronShape(n, NV.lit[i], t, { dend: hl(['sens', 'assoc', 'motor'][i]) * 0.7, soma: hl(['sens', 'assoc', 'motor'][i]), axon: hl(['sens', 'assoc', 'motor'][i]), term: hl(['sens', 'assoc', 'motor'][i]) * 0.7 }));
      // 자극 (뜨거운 것에 닿음)
      D.flame(44, 338, 26, t);
      pill('자극', 58, 276, { bg: '#e2464b', color: '#fff', size: 14 });
      pill('감각 뉴런', 152, 262, { bg: '#2d5fa8', color: '#fff', size: 14 });
      pill('연합 뉴런', 412, 232, { bg: '#6c47b8', color: '#fff', size: 14 });
      pill('운동 뉴런', 600, 196, { bg: '#b86d12', color: '#fff', size: 14 });
      // 근육
      const c = NV.muscle.value, mx = 758, my = 312;
      ctx.save(); ctx.translate(mx, my);
      ctx.fillStyle = lgrad(0, -26, 0, 26, [[0, '#ff8a8a'], [1, '#c43c3c']]);
      ctx.beginPath(); ctx.ellipse(0, 0, 21 * (1 - 0.22 * c), 22 * (1 + 0.3 * c), 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 7, -18); ctx.lineTo(k * 7, 18); ctx.stroke(); }
      ctx.restore();
      pill('근육', 754, 262, { bg: '#a02f2f', color: '#fff', size: 14 });
      if (!NV.pulses.length && now() - NV.arrive > 1.2) { const pulse = 0.5 + 0.5 * Math.sin(t * 5); D.glow(NV.tipChain[0], NV.tipChain[1], 20 + pulse * 6, '#ffd166', 0.55); }
    }
    NV.pulses.forEach((p) => {
      drawPulse(p.path, p.s, { color: '#8ff6ff', add: true, trail: 120, w: p.chain ? 6 : 8, r: p.chain ? 26 : 32 });
    });
    ctx.restore();
    // 설명 카드
    panel(14, 468, 772, 124, { r: 18 });
    const sel = NV.sel && NV_INFO[NV.sel];
    if (sel) {
      const col = NV_COL[NV.sel] || '#78a6ff';
      pill(sel[0], 30, 492, { align: 'left', bg: shade(col, -0.25), size: 16, h: 30 });
      para(sel[1], 30, 526, 740, 17, 25, { color: '#2b3445', weight: 700 });
    } else {
      txt(NV.view === 'one' ? '뉴런의 부분을 눌러 보세요' : '세 종류의 뉴런을 눌러 보세요', 30, 498, { size: 17, weight: 800, color: '#2b3445' });
      para(NV.view === 'one' ? '⚡ 자극 주기를 누르면 신호가 가지 돌기에서 출발해 신경 세포체를 지나 축삭 돌기 끝까지 한 방향으로 가요.' : '감각 뉴런 → 연합 뉴런 → 운동 뉴런 순서로 신호가 이어져 근육까지 전달돼요. 뉴런 사이에는 아주 작은 틈이 있어요.', 30, 530, 740, 16, 24, { color: '#5d6879', weight: 700 });
    }
    if (NV.view === 'chain') {
      let cx = 742;
      ['motor', 'assoc', 'sens'].forEach((k) => { ctx.save(); ctx.globalAlpha = NV.types.has(k) ? 1 : 0.28; bead(cx, 498, 9, NV_COL[k], { noShadow: true }); ctx.restore(); cx -= 26; });
    }
  }
  function neuronDown(p) {
    if (p.y > 456) return false;
    if (NV.view === 'one') {
      const o = NV.one, [sx, sy, sr] = o.soma;
      let k = null;
      if (Math.hypot(p.x - sx, p.y - sy) < sr + 12) k = 'soma';
      else if (p.x < sx - sr + 4 && p.x > 40 && Math.abs(p.y - sy) < 95) k = 'dend';
      else if (p.x > 628 && p.x < 760 && Math.abs(p.y - 250) < 70) k = 'term';
      else if (p.x > sx + sr && p.x <= 628 && Math.abs(p.y - 252) < 44) k = 'axon';
      if (k) { NV.sel = NV.sel === k ? null : k; Sound.click(); return true; }
      NV.sel = null; return true;
    }
    const cs = [[200, 325, 100, 'sens'], [440, 285, 88, 'assoc'], [650, 276, 92, 'motor']];
    let best = null, bd = 1e9;
    cs.forEach((c) => { const d = Math.hypot(p.x - c[0], p.y - c[1]); if (d < c[2] && d < bd) { bd = d; best = c[3]; } });
    if (best) { NV.sel = NV.sel === best ? null : best; NV.types.add(best); Sound.click(); }
    else NV.sel = null;
    return true;
  }

  /* =====================================================
     장면 2 · 신경계 (중추 신경계와 말초 신경계)
     ===================================================== */
  const BR = { ox: 392, oy: 40, k: 1.22 };
  const REGIONS = {
    cerebrum: { name: '대뇌', col: '#f4a6b8', deep: '#e86a8a', poly: [[18, 140], [12, 100], [34, 58], [78, 28], [135, 14], [195, 18], [245, 38], [280, 78], [290, 122], [272, 160], [236, 172], [214, 160], [190, 166], [165, 148], [138, 156], [112, 166], [78, 172], [44, 166]], lab: [90, 82],
      info: '감각을 느끼고 기억·판단·상상을 하는 곳이에요. 생각해서 움직이는 의식적인 행동을 명령해요.', ex: '예) 문제 풀기, 공을 보고 던지기' },
    cerebellum: { name: '소뇌', col: '#9bdcb2', deep: '#31b36a', poly: [[196, 184], [240, 176], [276, 190], [284, 214], [262, 240], [226, 248], [196, 232], [186, 208]], lab: [236, 214],
      info: '몸의 균형을 잡고 근육 운동을 알맞게 조절해요.', ex: '예) 자전거 타기, 한 발로 서기' },
    diencephalon: { name: '간뇌', col: '#ffd98a', deep: '#f0a500', poly: [[112, 118], [152, 112], [176, 128], [174, 152], [150, 166], [120, 164], [104, 142]], lab: [140, 140],
      info: '체온, 혈당량 같은 몸 안의 상태를 일정하게 유지하는 조절 중추예요.', ex: '예) 추우면 체온 유지, 혈당량 조절' },
    midbrain: { name: '중간뇌', col: '#9bd2f2', deep: '#2f93d6', poly: [[124, 172], [168, 170], [177, 190], [167, 208], [132, 208], [120, 190]], lab: [148, 190],
      info: '눈의 움직임과 동공의 크기를 조절해요.', ex: '예) 밝은 곳에서 동공이 작아지기' },
    medulla: { name: '연수', col: '#cfb2f5', deep: '#8b5cf6', poly: [[132, 214], [168, 212], [177, 238], [173, 266], [141, 266], [130, 240]], lab: [152, 240],
      info: '심장 박동, 호흡, 소화 운동을 조절해요. 기침·재채기·하품 같은 반사의 중추이기도 해요.', ex: '예) 자는 동안에도 심장이 뛰고 숨 쉬기' },
    cord: { name: '척수', col: '#ffc9a3', deep: '#ef6c3e', poly: [[143, 272], [171, 272], [175, 300], [173, 332], [143, 332], [139, 300]], lab: [157, 302],
      info: '뇌와 온몸 사이에서 신호가 지나다니는 통로예요. 무릎 반사·회피 반사의 중추이기도 해요.', ex: '예) 무릎을 치면 다리가 올라가기' },
  };
  const R_ORDER = ['diencephalon', 'midbrain', 'medulla', 'cerebellum', 'cord', 'cerebrum'];
  const R_DRAW = ['cerebrum', 'cerebellum', 'cord', 'medulla', 'midbrain', 'diencephalon'];
  const NS = { sel: null, seen: new Set(), hl: {}, match: { on: false, cur: 0, assign: [], flag: {}, checkedOk: false }, periph: 0 };
  const MATCH = [
    { q: '자전거를 타면서 넘어지지 않게 균형 잡기', a: 'cerebellum' },
    { q: '추울 때도 체온을 일정하게 유지하기', a: 'diencephalon' },
    { q: '밝은 곳에 나가면 동공이 작아지기', a: 'midbrain' },
    { q: '잠을 자는 동안에도 심장이 뛰기', a: 'medulla' },
    { q: '수학 문제를 풀며 생각하기', a: 'cerebrum' },
  ];
  const NS_PERIPH = '말초 신경계: 감각 신경과 운동 신경이 온몸에 퍼져 중추 신경계와 몸 곳곳을 이어 줘요. (심장·소화 기관을 조절하는 자율 신경도 있어요.)';
  // 몸 그림의 말초 신경 (척수에서 팔다리로)
  const NERVES = [
    [[165, 135], [150, 160], [112, 200], [92, 262]], [[165, 135], [182, 160], [220, 200], [240, 262]],
    [[165, 270], [150, 330], [146, 390], [144, 438]], [[165, 270], [181, 330], [185, 390], [187, 438]],
  ].map((k) => new PathM(k, 14));

  function regionAt(p) {
    const x = (p.x - BR.ox) / BR.k, y = (p.y - BR.oy) / BR.k;
    for (const id of R_ORDER) if (ptInPoly(x, y, REGIONS[id].poly)) return id;
    return null;
  }
  function nervousDown(p) {
    if (p.y > 470) {
      // 짝짓기 상황 탭
      if (NS.match.on && p.y > 474) {
        for (let i = 0; i < MATCH.length; i++) { const x0 = 30 + i * 150; if (p.x >= x0 && p.x < x0 + 142 && p.y < 520) { NS.match.cur = i; Sound.click(); return true; } }
      }
      return false;
    }
    let id = regionAt(p);
    if (!id && p.x < 330) {
      if (p.y > 100 && p.y < 285 && Math.abs(p.x - 165) < 14) id = 'cord';
      else if (p.y < 100 && Math.hypot(p.x - 165, p.y - 62) < 36) id = 'cerebrum';
      else if ((Math.hypot(p.x - 92, p.y - 262) < 34) || (Math.hypot(p.x - 240, p.y - 262) < 34) || (Math.hypot(p.x - 144, p.y - 430) < 30) || (Math.hypot(p.x - 187, p.y - 430) < 30)) id = 'periph';
    }
    if (!id) { if (!NS.match.on) NS.sel = null; return true; }
    if (NS.match.on) {
      if (id === 'periph') return true;
      const m = NS.match;
      m.assign[m.cur] = id; delete m.flag[m.cur];
      const nx = [0, 1, 2, 3, 4].map((k) => (m.cur + 1 + k) % 5).find((k) => !m.assign[k]);
      if (nx != null) m.cur = nx;
      Sound.click();
      return true;
    }
    if (id === 'periph') { NS.sel = 'periph'; Sound.click(); return true; }
    NS.sel = NS.sel === id ? null : id; if (NS.sel) NS.seen.add(NS.sel);
    Sound.click();
    return true;
  }
  function updateNervous(dt) {
    R_ORDER.forEach((id) => { NS.hl[id] = approach(NS.hl[id] || 0, NS.sel === id ? 1 : 0, dt, 9); });
    NS.periph = approach(NS.periph, NS.sel === 'periph' ? 1 : 0, dt, 9);
  }
  function limb(x, y, w, h, ang, c1, c2) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = lgrad(0, 0, w, 0, [[0, c1], [1, c2]]); rr(-w / 2, 0, w, h, w / 2); ctx.fill();
    ctx.restore();
  }
  function drawBodySil() {
    const c1 = '#e6edf8', c2 = '#c9d6ea';
    ctx.save(); ctx.shadowColor = 'rgba(40,60,100,.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    limb(145, 268, 36, 175, 0.02, c1, c2); limb(185, 268, 36, 175, -0.02, c1, c2);
    limb(108, 118, 28, 150, 0.2, c1, c2); limb(222, 118, 28, 150, -0.2, c1, c2);
    ctx.fillStyle = lgrad(110, 0, 220, 0, [[0, c1], [1, c2]]); rr(112, 100, 106, 182, 32); ctx.fill();
    rr(156, 88, 18, 26, 8); ctx.fill();
    ctx.beginPath(); ctx.arc(165, 62, 36, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawNervousScene(t) {
    // 왼쪽: 몸 전체
    panel(14, 14, 318, 446, { r: 18, bg: '#f9fbff' });
    drawBodySil();
    // 말초 신경 + 오가는 신호
    ctx.save(); ctx.lineCap = 'round';
    NERVES.forEach((pth, i) => {
      ctx.strokeStyle = rgba('#14a39a', 0.28 + NS.periph * 0.4); ctx.lineWidth = 9; ctx.beginPath(); pth.trace(0, pth.len); ctx.stroke();
      ctx.strokeStyle = '#14a39a'; ctx.lineWidth = 3.5 + NS.periph * 2; ctx.beginPath(); pth.trace(0, pth.len); ctx.stroke();
      if (!RM) {
        const sp = 120, per = pth.len + 40;
        const s1 = (t * sp + i * 70) % per, s2 = (t * sp * 0.9 + i * 31 + 90) % per;
        if (s1 < pth.len) drawPulse(pth, pth.len - s1, { color: '#5aa2ff', trail: 34, w: 4, r: 10, alpha: 0.95 });
        if (s2 < pth.len) drawPulse(pth, s2, { color: '#ffab4a', trail: 34, w: 4, r: 10, alpha: 0.95 });
      }
    });
    // 중추 신경계 (뇌 + 척수)
    ctx.strokeStyle = '#ef6c3e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(165, 96); ctx.lineTo(165, 286); ctx.stroke();
    ctx.fillStyle = rgrad(155, 50, 3, 165, 58, 28, [[0, '#ffb08a'], [1, '#e8590c']]);
    ctx.beginPath(); ctx.ellipse(165, 57, 27, 22, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,30,0,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(150, 52); ctx.quadraticCurveTo(160, 44, 168, 54); ctx.moveTo(165, 66); ctx.quadraticCurveTo(175, 58, 183, 64); ctx.stroke();
    ctx.restore();
    pill('중추 신경계', 276, 330, { bg: '#e8590c', size: 14, h: 28 });
    pill('말초 신경계', 276, 366, { bg: '#0f8a82', size: 14, h: 28 });
    txt('감각 신경 →', 276, 402, { size: 13, weight: 800, color: '#2f6fd0', align: 'center' });
    txt('← 운동 신경', 276, 420, { size: 13, weight: 800, color: '#c97a14', align: 'center' });
    // 확대선
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(90,100,120,.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(165, 60, 34, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(196, 42); ctx.lineTo(BR.ox + 14 * BR.k, BR.oy + 14 * BR.k); ctx.moveTo(190, 86); ctx.lineTo(BR.ox + 20 * BR.k, BR.oy + 140 * BR.k); ctx.stroke();
    ctx.restore();
    if (NS.sel === 'periph' || NS.periph > 0.02) { ctx.save(); ctx.globalAlpha = NS.periph; ring(92, 262, 20, '#14a39a', t); ring(240, 262, 20, '#14a39a', t); ctx.restore(); }

    // 오른쪽: 뇌 확대 + 척수
    panel(342, 14, 444, 446, { r: 18, bg: '#fffdf8' });
    ctx.save(); ctx.translate(BR.ox, BR.oy); ctx.scale(BR.k, BR.k);
    R_DRAW.forEach((id) => {
      const R = REGIONS[id], h = NS.hl[id] || 0;
      ctx.save();
      if (h > 0.02) { ctx.shadowColor = rgba(R.deep, 0.65 * h); ctx.shadowBlur = 14 * h; }
      ctx.beginPath(); smooth(ctx, R.poly, true);
      ctx.fillStyle = mix(R.col, R.deep, h * 0.75); ctx.fill();
      ctx.restore();
      ctx.beginPath(); smooth(ctx, R.poly, true);
      ctx.strokeStyle = rgba(shade(R.deep, -0.2), 0.55 + h * 0.4); ctx.lineWidth = (1.6 + h * 1.6) / BR.k * 1.2; ctx.stroke();
      if (id === 'cerebrum') {
        ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(150,40,80,.28)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        [[40, 100, 80, 70, 120, 84], [90, 128, 130, 104, 168, 116], [150, 54, 185, 76, 226, 62], [200, 100, 236, 118, 262, 96], [60, 56, 100, 46, 140, 52], [190, 140, 220, 130, 250, 142]].forEach((q) => {
          ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.quadraticCurveTo(q[2], q[3], q[4], q[5]); ctx.stroke();
        });
        ctx.restore();
      }
      if (id === 'cerebellum') {
        ctx.save(); ctx.beginPath(); smooth(ctx, R.poly, true); ctx.clip(); ctx.strokeStyle = 'rgba(20,100,60,.3)'; ctx.lineWidth = 2;
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(190, 196 + k * 11); ctx.quadraticCurveTo(235, 190 + k * 11, 284, 200 + k * 11); ctx.stroke(); }
        ctx.restore();
      }
    });
    ctx.restore();
    R_ORDER.forEach((id) => {
      const R = REGIONS[id], h = NS.hl[id] || 0;
      const x = BR.ox + R.lab[0] * BR.k, y = BR.oy + R.lab[1] * BR.k;
      txt(R.name, x, y, { size: id === 'cerebrum' ? 19 : 15, weight: 800, color: h > 0.5 ? '#fff' : '#1b2333', align: 'center', base: 'middle', halo: h > 0.5 ? rgba(R.deep, 0.9) : 'rgba(255,255,255,.55)', haloW: 3 });
      if (NS.seen.has(id) && !NS.match.on) checkMark(x + (id === 'cerebrum' ? 34 : 24), y - (id === 'cerebrum' ? 14 : 12), 8);
      if (NS.sel === id && !NS.match.on) ring(x, y, id === 'cerebrum' ? 34 : 24, R.deep, t);
    });
    txt('↓ 몸 쪽으로', BR.ox + 188 * BR.k, BR.oy + 322 * BR.k, { size: 13, weight: 700, color: '#8a93a3' });
    // 짝짓기 배지
    if (NS.match.on) {
      NS.match.assign.forEach((id, i) => {
        if (!id) return;
        const R = REGIONS[id], same = NS.match.assign.slice(0, i).filter((q) => q === id).length;
        const x = BR.ox + R.lab[0] * BR.k - 18 + same * 22, y = BR.oy + R.lab[1] * BR.k + 24 + (id === 'cerebrum' ? 12 : 0);
        const bad = NS.match.flag[i];
        const sx = bad ? Math.sin(t * 60) * 3 : 0;
        bead(x + sx, y, 11, bad ? '#e2464b' : i === NS.match.cur ? '#f59e0b' : '#3b82f6');
        txt(String(i + 1), x + sx, y + 1, { size: 14, weight: 800, color: '#fff', align: 'center', base: 'middle' });
      });
    }

    // 아래 카드
    panel(14, 472, 772, 120, { r: 18 });
    if (NS.match.on) {
      const m = NS.match;
      for (let i = 0; i < MATCH.length; i++) {
        const x0 = 30 + i * 150, on = i === m.cur, got = !!m.assign[i];
        ctx.save();
        rr(x0, 484, 142, 34, 17); ctx.fillStyle = on ? '#16a34a' : got ? '#e3f4e8' : '#f1f4f8'; ctx.fill();
        if (!on) { ctx.strokeStyle = got ? '#16a34a' : '#d3dae6'; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.restore();
        txt('상황 ' + (i + 1) + (got ? ' · ' + REGIONS[m.assign[i]].name : ''), x0 + 71, 502, { size: 14.5, weight: 800, color: on ? '#fff' : '#2b3445', align: 'center', base: 'middle' });
      }
      txt('상황 ' + (m.cur + 1) + ': ' + MATCH[m.cur].q, 30, 548, { size: 19, weight: 800, color: '#1b2333', max: 740 });
      txt('이 일을 맡은 뇌의 부분을 오른쪽 그림에서 눌러요.', 30, 576, { size: 15, weight: 700, color: '#5d6879' });
    } else if (NS.sel === 'periph') {
      pill('말초 신경계', 30, 496, { align: 'left', bg: '#0f8a82', size: 16, h: 30 });
      para(NS_PERIPH, 30, 534, 740, 17, 25, { color: '#2b3445' });
    } else if (NS.sel) {
      const R = REGIONS[NS.sel];
      pill(R.name, 30, 496, { align: 'left', bg: shade(R.deep, -0.15), size: 16, h: 30 });
      txt(R.ex, 130, 497, { size: 15, weight: 700, color: '#5d6879', base: 'middle' });
      para(R.info, 30, 538, 740, 17, 25, { color: '#2b3445' });
    } else {
      txt('뇌의 부분과 척수를 눌러 보세요', 30, 500, { size: 17, weight: 800, color: '#2b3445' });
      para('살펴본 곳: ' + NS.seen.size + ' / 6  (대뇌 · 소뇌 · 간뇌 · 중간뇌 · 연수 · 척수)', 30, 534, 740, 16, 24, { color: '#5d6879' });
      txt('손·발의 신경을 누르면 말초 신경계도 볼 수 있어요.', 30, 568, { size: 14, weight: 700, color: '#8a93a3' });
    }
  }

  /* =====================================================
     장면 3 · 자 잡기 (의식적 반응 시간 측정)
     ===================================================== */
  const TAB = [[0, 0], [0.10, 5], [0.14, 10], [0.17, 15], [0.20, 20], [0.23, 25], [0.25, 30]];
  function distOf(t) {           // 반응 시간(초) → 자가 떨어진 거리(cm) : 환산표 사이를 이어서 구함
    if (t <= 0) return 0;
    if (t <= 0.10) return 5 * (t / 0.10) * (t / 0.10);
    for (let i = 2; i < TAB.length; i++) if (t <= TAB[i][0]) { const a = TAB[i - 1], b = TAB[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
    return 30 * (t / 0.25) * (t / 0.25);
  }
  const RU = {
    st: 'idle', t0: 0, tRel: 0, d: 0, trials: [], msg: '', gapS: new SciSim.Spring(26, { stiffness: 260, damping: 20 }), gapH: new SciSim.Spring(0, { stiffness: 200, damping: 16 }),
    rp: -1, pop: 0, shake: 0, lastTe: 0, nearRow: -1,
  };
  const RU_NODES = [['눈 (감각 기관)', '#5aa2ff'], ['감각 신경', '#5aa2ff'], ['대뇌 (판단·명령)', '#e86a8a'], ['운동 신경', '#ffab4a'], ['손가락 근육', '#d9534f']];
  const RY0 = 380, RX = 200, RPX = 6;      // 자의 0 cm 끝 위치, 가운데 x, cm 당 픽셀
  const lastTrials = () => RU.trials.slice(-3);     // 기록표에 보이는 최근 3회
  const avgMs = () => { const a = lastTrials(); return a.length ? Math.round(a.reduce((x, b) => x + b.ms, 0) / a.length) : 0; };

  function startDrop() {
    if (RU.st === 'wait' || RU.st === 'fall') return;
    RU.st = 'wait'; RU.d = 0; RU.tRel = performance.now() + 1500 + Math.random() * 2200; RU.msg = ''; RU.rp = -1;
    RU.gapS.target = 26; RU.gapH.target = 0; syncRulerUI(); Sound.click();
  }
  function doCatch(ts) {
    if (RU.st === 'wait') {
      RU.st = 'early'; RU.msg = '너무 일찍 잡았어요! 자가 떨어지는 것을 본 뒤에 잡아야 해요.'; RU.shake = 1; Sound.fail(); syncRulerUI(); return;
    }
    if (RU.st !== 'fall') return;
    const te = ((ts || performance.now()) - RU.t0) / 1000;
    if (distOf(te) >= 50) { RU.st = 'miss'; RU.d = Math.max(RU.d, 50); RU.msg = '놓쳤어요! 자가 떨어지는 것을 보는 순간 바로 잡아요.'; RU.shake = 1; Sound.fail(); syncRulerUI(); return; }
    if (te < 0.09) { RU.st = 'early'; RU.msg = '짐작해서 잡았나 봐요. 자가 떨어지는 것을 본 뒤에 잡아야 해요.'; RU.shake = 1; Sound.fail(); syncRulerUI(); return; }
    RU.lastTe = te; RU.d = distOf(te); RU.st = 'caught'; RU.gapS.target = 0;
    const tr = { ms: Math.round(te * 1000), cm: Math.round(RU.d) };
    RU.trials.push(tr); RU.pop = 1; RU.rp = now();
    RU.msg = '내 반응 시간 ' + tr.ms + ' ms · 자가 ' + tr.cm + ' cm 떨어졌을 때 잡았어요';
    RU.nearRow = nearestTab(RU.d);
    burst(RX + 80, RY0 - 10, ['#facc15', '#5aa2ff', '#22c55e'], 16, { speed: 130, gravity: 200 });
    Sound.success(); syncRulerUI();
  }
  function nearestTab(cm) { let b = 1, bd = 1e9; for (let i = 1; i < TAB.length; i++) { const d = Math.abs(TAB[i][1] - cm); if (d < bd) { bd = d; b = i; } } return b; }
  function syncRulerUI() {
    const b = $('#btnDrop');
    if (!b) return;
    const busy = RU.st === 'wait' || RU.st === 'fall';
    b.disabled = busy;
    b.innerHTML = RU.st === 'idle' ? '▶ 자 떨어뜨리기' : busy ? '👀 자를 잘 보세요…' : '↻ 다시 하기';
    $('#btnCatch').disabled = !busy;
  }
  function updateRuler(dt) {
    const pm = performance.now();
    if (RU.st === 'wait' && pm >= RU.tRel) { RU.st = 'fall'; RU.t0 = pm; RU.gapH.target = 28; }
    if (RU.st === 'fall') {
      const te = (pm - RU.t0) / 1000; RU.d = distOf(te);
      if (RU.d >= 50) { RU.st = 'miss'; RU.msg = '놓쳤어요! 자가 떨어지는 것을 보는 순간 바로 잡아요.'; RU.shake = 1; Sound.fail(); syncRulerUI(); }
    }
    if (RU.st === 'miss') RU.d += 220 * dt;
    RU.gapS.update(dt); RU.gapH.update(dt);
    RU.pop = approach(RU.pop, 0, dt, 4); RU.shake = approach(RU.shake, 0, dt, 5);
  }
  function drawFinger(x, y, dir, len, gap, col) {   // dir: -1 왼쪽에서, +1 오른쪽에서 들어오는 손가락
    const x0 = x + dir * (30 + gap);
    ctx.save();
    ctx.shadowColor = 'rgba(80,40,20,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = lgrad(0, y - 12, 0, y + 12, [[0, shade(col, 0.2)], [1, shade(col, -0.12)]]);
    rr(dir < 0 ? x0 - len : x0, y - 12, len, 24, 12); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x0 - dir * 3, y - 2, 6, 4, 0, 0, TAU); ctx.fill();
  }
  function drawRulerScene(t) {
    panel(14, 14, 414, 446, { r: 18, bg: '#fbfdff' });
    const sx = RU.shake > 0.02 ? shk(RU.shake, t) : 0;
    // 자
    const bottom = RY0 + RU.d * RPX, topY = bottom - 50 * RPX;
    ctx.save(); ctx.translate(sx, 0); rr(18, 18, 406, 438, 16); ctx.clip();
    ctx.save(); ctx.shadowColor = 'rgba(80,60,20,.3)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
    ctx.fillStyle = lgrad(RX - 30, 0, RX + 30, 0, [[0, '#ffe8a3'], [0.5, '#fff2c4'], [1, '#f2d27a']]); rr(RX - 30, topY, 60, 50 * RPX, 5); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#8a6a1c'; ctx.fillStyle = '#6b4f10'; ctx.lineWidth = 1.4;
    for (let c = 0; c <= 50; c++) {
      const y = bottom - c * RPX, len = c % 10 === 0 ? 22 : c % 5 === 0 ? 15 : 8;
      ctx.beginPath(); ctx.moveTo(RX - 30, y); ctx.lineTo(RX - 30 + len, y); ctx.stroke();
      if (c % 5 === 0 && c > 0) txt(String(c), RX + 8, y, { size: 13, weight: 800, color: '#6b4f10', base: 'middle' });
    }
    txt('cm', RX + 8, bottom + 14, { size: 12, weight: 700, color: '#6b4f10' });
    ctx.restore();
    // 도우미 손 (위)
    const gh = RU.gapH.value;
    ctx.save(); ctx.translate(sx, 0);
    drawFinger(RX, 82, -1, 90, gh, '#f3c7a3'); drawFinger(RX, 82, 1, 90, gh, '#f3c7a3');
    pill('친구의 손', RX - 130, 44, { bg: '#64748b', size: 13, h: 24 });
    // 내 손가락 (아래)
    const gs = RU.gapS.value;
    drawFinger(RX, RY0, -1, 100, gs, '#f6bfa0'); drawFinger(RX, RY0, 1, 100, gs, '#f6bfa0');
    pill('내 손가락', RX - 130, RY0 + 34, { bg: '#16a34a', size: 13, h: 24 });
    if (RU.st === 'caught') {
      pill(Math.round(RU.d) + ' cm', RX + 98, RY0 - 26, { bg: '#16a34a', size: 17, h: 30, shadow: true });
      D.arrow(RX + 98, RY0 - 10, RX + 38, RY0 - 2, { color: '#16a34a', width: 3, head: 10 });
    }
    if (RU.st === 'wait') {
      const dots = '.'.repeat(1 + Math.floor(t * 2.5) % 3);
      pill('준비' + dots, RX + 110, 150, { bg: '#f59e0b', size: 17, h: 32 });
    }
    if (RU.st === 'fall') {
      const on = Math.floor(t * 10) % 2 === 0;
      pill('지금!', RX + 110, 150, { bg: on ? '#e2464b' : '#b91c1c', size: 22, h: 40, pad: 16 });
    }
    ctx.restore();

    // 오른쪽: 측정 기록
    panel(440, 14, 346, 232, { r: 18 });
    txt('📋 측정 기록', 458, 42, { size: 17, weight: 800, color: '#1b2333' });
    ['회', '반응 시간', '떨어진 거리'].forEach((h, i) => txt(h, [478, 598, 716][i], 70, { size: 13, weight: 800, color: '#8a93a3', align: 'center' }));
    const shown = lastTrials(), base = RU.trials.length - shown.length;
    for (let i = 0; i < 3; i++) {
      const y = 82 + i * 38, tr = shown[i], isNew = tr && i === shown.length - 1 && RU.pop > 0.02;
      ctx.save(); ctx.translate(613, y + 16); const sc = 1 + (isNew ? RU.pop * 0.08 : 0); ctx.scale(sc, sc);
      rr(-163, -16, 326, 32, 12); ctx.fillStyle = tr ? (isNew ? '#d7f5e0' : '#eaf6ee') : '#f4f6fa'; ctx.fill();
      ctx.restore();
      txt((base + i + 1) + '회', 478, y + 22, { size: 15, weight: 800, color: '#2b3445', align: 'center' });
      txt(tr ? tr.ms + ' ms' : '–', 598, y + 22, { size: 17, weight: 800, color: tr ? '#16803c' : '#a8b0bf', align: 'center' });
      txt(tr ? tr.cm + ' cm' : '–', 716, y + 22, { size: 17, weight: 800, color: tr ? '#2b3445' : '#a8b0bf', align: 'center' });
    }
    ctx.fillStyle = '#e3e8f0'; ctx.fillRect(458, 198, 310, 1.5);
    txt('평균', 478, 226, { size: 15, weight: 800, color: '#2b3445', align: 'center' });
    txt(RU.trials.length >= 3 ? avgMs() + ' ms' : RU.trials.length ? avgMs() + ' ms (잠정)' : '–', 598, 226, { size: 18, weight: 800, color: '#e8590c', align: 'center' });
    if (RU.trials.length > 3) txt('(최근 3회 평균)', 716, 226, { size: 12.5, weight: 700, color: '#8a93a3', align: 'center' });

    // 오른쪽 아래: 신호가 지나간 길
    panel(440, 258, 346, 202, { r: 18 });
    txt('🧠 신호가 지나간 길', 458, 284, { size: 16, weight: 800, color: '#1b2333' });
    const rp = RU.rp >= 0 ? now() - RU.rp : -1, starts = [0.1, 0.65, 1.15, 2.25, 2.8];
    RU_NODES.forEach((nd, i) => {
      const y = 306 + i * 34, lit = rp >= 0 ? smoothstep(starts[i], starts[i] + 0.25, rp) : 0;
      const cur = rp >= 0 && rp >= starts[i] && (i === 4 || rp < starts[i + 1]);
      if (i < 4) {
        const nextLit = rp >= 0 ? smoothstep(starts[i + 1], starts[i + 1] + 0.2, rp) : 0;
        ctx.strokeStyle = nextLit > 0.5 ? nd[1] : '#cfd6e2'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(613, y + 11); ctx.lineTo(613, y + 23); ctx.stroke();
        if (rp >= starts[i] + 0.2 && rp < starts[i + 1] + 0.1) { const f = clamp((rp - starts[i] - 0.2) / (starts[i + 1] - starts[i] - 0.1), 0, 1); D.glow(613, y + 11 + f * 12, 9, nd[1], 0.9); }
      }
      ctx.save();
      if (lit > 0.01) { ctx.shadowColor = rgba(nd[1], 0.8 * lit); ctx.shadowBlur = 14 * lit; }
      rr(523, y - 11, 180, 24, 12); ctx.fillStyle = lit > 0.5 ? nd[1] : '#eef1f6'; ctx.fill();
      ctx.restore();
      txt(nd[0], 613, y + 2, { size: 14.5, weight: 800, color: lit > 0.5 ? '#fff' : '#6b7587', align: 'center', base: 'middle' });
      if (i === 2 && cur) txt('판단 중…', 710, y + 2, { size: 13, weight: 800, color: '#e86a8a', base: 'middle' });
    });

    // 아래 줄: 안내 · 환산표
    panel(14, 472, 772, 120, { r: 18 });
    let line = '';
    if (RU.st === 'idle') line = '▶ 자 떨어뜨리기를 누르고, 자가 떨어지는 순간 화면을 탭(또는 🤏 잡기)해요.';
    else if (RU.st === 'wait') line = '집중! 친구가 자를 놓는 순간을 기다려요…';
    else if (RU.st === 'fall') line = '지금 잡아요!';
    else line = RU.msg;
    txt(line, 30, 504, { size: 18, weight: 800, color: RU.st === 'caught' ? '#16803c' : RU.st === 'early' || RU.st === 'miss' ? '#c0392b' : '#2b3445', max: 740 });
    txt('환산표: 자를 잡은 거리 → 반응 시간', 30, 534, { size: 13.5, weight: 800, color: '#8a93a3' });
    for (let i = 1; i < TAB.length; i++) {
      const x = 30 + (i - 1) * 122, hit = RU.st === 'caught' && RU.nearRow === i;
      rr(x, 544, 114, 36, 10); ctx.fillStyle = hit ? '#d7f5e0' : '#f1f4f8'; ctx.fill();
      if (hit) { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.stroke(); }
      txt(TAB[i][1] + ' cm → ' + TAB[i][0].toFixed(2) + '초', x + 57, 563, { size: 14, weight: 800, color: '#2b3445', align: 'center', base: 'middle' });
    }
  }

  /* =====================================================
     장면 4 · 무조건 반사 (척수·연수·중간뇌가 중추)
     ===================================================== */
  const K_SLOW = 14;           // 느린 화면 배율 (반사 0.05초 → 0.7초)
  const REFLEX_T = 0.05, CONS_DEF = 0.20;
  const RFM = {
    knee: { name: '무릎 반사', icon: '🦵', center: '척수', cpos: [152, 322], col: '#ef6c3e',
      path: [[326, 316], [272, 312], [212, 314], [158, 320], [154, 326], [204, 334], [256, 328]], cord: 4,
      brain: [[154, 322], [152, 262], [150, 200], [154, 150], [166, 118], [176, 96]],
      stages: ['무릎 아래 힘줄이 망치에 맞아 자극을 받아요', '감각 신경이 자극을 척수로 전달해요', '척수가 대뇌를 거치지 않고 바로 명령을 내려요', '운동 신경이 명령을 넓적다리 근육으로 전달해요', '근육이 수축해 다리가 올라가요'],
      note: '무릎 반사는 약 0.05초 이내로 일어나요.', fast: '약 0.05초' },
    hot: { name: '뜨거운 냄비', icon: '🔥', center: '척수', cpos: [154, 226], col: '#ef6c3e',
      path: [[304, 242], [262, 246], [222, 246], [190, 238], [156, 226], [156, 232], [176, 232], [192, 220]], cord: 4,
      brain: [[156, 226], [152, 190], [152, 150], [160, 122], [176, 98]],
      stages: ['손이 뜨거운 냄비에 닿아 자극을 받아요', '감각 신경이 자극을 척수로 전달해요', '척수가 대뇌를 거치지 않고 바로 명령을 내려요', '운동 신경이 명령을 팔 근육으로 전달해요', '팔 근육이 수축해 손을 확 떼요'],
      note: '뜨겁다고 느끼기도 전에 손을 떼요. 몸이 다치지 않게 보호해요.', fast: '반사' },
    sneeze: { name: '재채기', icon: '🤧', center: '연수', cpos: [162, 138], col: '#8b5cf6',
      path: [[214, 108], [196, 120], [172, 130], [162, 138], [164, 150], [172, 180], [180, 212]], cord: 3,
      brain: [[162, 138], [166, 118], [176, 98]],
      stages: ['콧속이 먼지에 자극을 받아요', '감각 신경이 자극을 연수로 전달해요', '연수가 대뇌를 거치지 않고 바로 명령을 내려요', '운동 신경이 명령을 가슴 근육으로 전달해요', '가슴 근육이 수축해 숨을 세게 내뿜어요'],
      note: '기침·재채기·하품의 중추는 연수예요.', fast: '반사' },
    pupil: { name: '동공 반사', icon: '👁️', center: '중간뇌', cpos: [170, 110], col: '#2f93d6',
      path: [[200, 94], [188, 100], [174, 108], [170, 112], [178, 98], [194, 88]], cord: 3,
      brain: [[170, 112], [172, 100], [176, 94]],
      stages: ['눈이 밝은 빛 자극을 받아요', '감각 신경이 자극을 중간뇌로 전달해요', '중간뇌가 대뇌를 거치지 않고 바로 명령을 내려요', '운동 신경이 명령을 눈(홍채)의 근육으로 전달해요', '동공이 작아져 눈으로 들어오는 빛의 양이 줄어요'],
      note: '동공의 크기는 중간뇌가 조절해요.', fast: '반사' },
  };
  Object.keys(RFM).forEach((k) => { const m = RFM[k]; m.P = new PathM(m.path, 10); m.B = new PathM(m.brain, 10); m.cordS = m.P.cum[m.cord * 10]; });
  const T_STIM = 0.5;
  const RF = {
    mode: 'knee', t: -1, ran: new Set(), kick: new SciSim.Spring(0, { stiffness: 180, damping: 10 }), arm: new SciSim.Spring(-0.1, { stiffness: 200, damping: 13 }),
    head: new SciSim.Spring(0, { stiffness: 160, damping: 11 }), hammer: 4.1, pupil: 22, light: 0, fired: false, felt: false, muscle: 0, flash: 0,
    order: false, picks: [], chips: [], bad: {}, shuf: null, dust: [],
  };
  const ORDER_CHIPS = [{ id: 'sens', label: '감각 신경' }, { id: 'cord', label: '척수' }, { id: 'motor', label: '운동 신경' }, { id: 'musc', label: '넓적다리 근육' }, { id: 'cerebrum', label: '대뇌' }];
  const ORDER_ANS = ['sens', 'cord', 'motor', 'musc'];
  function initOrder() {
    RF.picks = []; RF.bad = {};
    const r = rng(5), a = ORDER_CHIPS.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    RF.chips = a;
  }
  initOrder();
  function runReflex() {
    if (RF.order) return;
    RF.t = 0; RF.fired = false; RF.felt = false; RF.hit = false; RF.ran.add(RF.mode); RF.hammer = 4.1; RF.light = 0; RF.pupil = 22; RF.dust = [];
    RF.flash = 0; Sound.click();
  }
  function setReflexMode(m) {
    if (RF.order) return;
    RF.mode = m; RF.t = -1; RF.fired = false; RF.felt = false; RF.hit = false; RF.kick.target = 0; RF.arm.target = -0.1; RF.head.target = 0; RF.pupil = 22; RF.light = 0; RF.hammer = 4.1;
    $$('#rfSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === m));
  }
  const consT = () => (RU.trials.length ? avgMs() / 1000 : CONS_DEF);

  function updateReflex(dt) {
    const M = RFM[RF.mode];
    if (RF.t >= 0) {
      RF.t += dt;
      const ts = RF.t - T_STIM;
      if (RF.mode === 'knee') {
        // 망치 휘두르기 (중력처럼 점점 빨라짐)
        const f = clamp(RF.t / T_STIM, 0, 1); RF.hammer = RF.t < T_STIM ? lerp(4.1, 2.32, f * f * f) : lerp(2.32, 3.4, smoothstep(T_STIM, T_STIM + 0.5, RF.t));
        if (!RF.hit && RF.t >= T_STIM) { RF.hit = true; RF.flash = 1; burst(332, 322, ['#fff', '#ffd166'], 10, { speed: 90, gravity: 0, size: 3 }); Sound.tick(); }
      } else if (RF.mode === 'pupil') {
        RF.light = approach(RF.light, 1, dt, 6);
        if (!RF.hit && RF.t >= T_STIM) { RF.hit = true; RF.flash = 1; }
      } else if (!RF.hit && RF.t >= T_STIM) { RF.hit = true; RF.flash = 1; if (RF.mode === 'hot') Sound.tick(); }
      // 반사 완료 시 반응 동작
      if (!RF.fired && ts >= REFLEX_T * K_SLOW) {
        RF.fired = true;
        if (RF.mode === 'knee') { RF.kick.target = 0.62; setTimeout(() => { RF.kick.target = 0; }, 420); }
        else if (RF.mode === 'hot') { RF.arm.target = -1.25; setTimeout(() => { RF.arm.target = -0.1; }, 1100); }
        else if (RF.mode === 'sneeze') {
          RF.head.target = 0.28; setTimeout(() => { RF.head.target = 0; }, 450);
          for (let i = 0; i < 16; i++) PFX.emit({ x: 222, y: 112, vx: 140 + Math.random() * 190, vy: -50 + Math.random() * 100, life: 0.8, size: 2.5 + Math.random() * 2.5, color: 'rgba(130,190,255,.95)', gravity: 140, drag: 1.2, shape: 'bubble' });
          Sound.tick();
        }
        burst(M.cpos[0], M.cpos[1], [M.col, '#fff', '#ffd166'], 8, { speed: 70, gravity: 0, size: 3 });
      }
      if (RF.mode === 'pupil') RF.pupil = approach(RF.pupil, ts >= REFLEX_T * K_SLOW ? 9 : 22, dt, 7);
      if (!RF.felt && ts >= REFLEX_T * K_SLOW * 2.2) { RF.felt = true; }
      if (RF.t > T_STIM + consT() * K_SLOW + 1.6) { RF.t = -2; RF.light = RF.mode === 'pupil' ? 1 : 0; }   // 끝난 뒤에는 마지막 장면 유지
    }
    RF.kick.update(dt); RF.arm.update(dt); RF.head.update(dt);
    RF.flash = approach(RF.flash, 0, dt, 4);
    if (RF.mode === 'pupil' && RF.t === -1) RF.pupil = approach(RF.pupil, 22, dt, 5);
    if (RF.mode === 'sneeze' && !RF.dust.length) for (let i = 0; i < 7; i++) RF.dust.push({ a: Math.random() * TAU, r: 20 + Math.random() * 40, s: 0.6 + Math.random() });
  }

  function drawReflexScene(t) {
    const M = RFM[RF.mode], run = RF.t >= 0 || RF.t === -2, rt = RF.t === -2 ? 99 : RF.t, ts = rt - T_STIM;
    panel(14, 14, 500, 410, { r: 18, bg: '#fbfdff' });
    ctx.save(); rr(18, 18, 492, 402, 16); ctx.clip();
    // 벤치
    ctx.fillStyle = '#d9b48a'; rr(110, 348, 205, 16, 6); ctx.fill();
    ctx.fillStyle = '#b8936a'; rr(130, 364, 16, 56, 4); ctx.fill(); rr(280, 364, 16, 56, 4); ctx.fill();
    ctx.fillStyle = lgrad(0, 0, 0, 1, [[0, '#d9b48a'], [1, '#d9b48a']]);
    const skin = '#f6d3b8', skinD = '#e8b895', shirt = '#7fb0ff', pants = '#6b7fa8';
    // 몸통
    ctx.save(); ctx.shadowColor = 'rgba(40,60,100,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = lgrad(140, 0, 198, 0, [[0, shade(shirt, 0.15)], [1, shade(shirt, -0.12)]]); rr(138, 150, 62, 182, 28); ctx.fill();
    ctx.restore();
    // 넓적다리
    ctx.fillStyle = lgrad(0, 300, 0, 346, [[0, shade(pants, 0.12)], [1, shade(pants, -0.15)]]); rr(160, 300, 168, 46, 23); ctx.fill();
    // 넓적다리 근육 (수축)
    const mAct = (RF.mode === 'knee' && run) ? smoothstep(REFLEX_T * K_SLOW, REFLEX_T * K_SLOW + 0.25, ts) * (1 - smoothstep(REFLEX_T * K_SLOW + 0.4, REFLEX_T * K_SLOW + 0.9, ts)) : 0;
    ctx.fillStyle = rgba('#e5484d', 0.35 + 0.4 * mAct); ctx.beginPath(); ctx.ellipse(262, 322, 44 - 8 * mAct, 14 + 5 * mAct, 0, 0, TAU); ctx.fill();
    // 아래 다리 (무릎 관절에서 회전)
    ctx.save(); ctx.translate(322, 322); ctx.rotate(-RF.kick.value);
    ctx.fillStyle = lgrad(-20, 0, 20, 0, [[0, shade(skin, 0.1)], [1, skinD]]); rr(-19, -14, 38, 124, 19); ctx.fill();
    ctx.fillStyle = '#4b5d85'; rr(-17, 90, 62, 24, 12); ctx.fill();
    ctx.restore();
    ctx.fillStyle = skinD; ctx.beginPath(); ctx.arc(322, 322, 20, 0, TAU); ctx.fill();
    ctx.fillStyle = lgrad(0, 302, 0, 342, [[0, shade(skin, 0.12)], [1, skinD]]); ctx.beginPath(); ctx.arc(322, 322, 19, 0, TAU); ctx.fill();
    // 팔
    const E = [206, 250], ang = RF.arm.value;
    ctx.save(); ctx.strokeStyle = shirt; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(172, 184); ctx.lineTo(E[0], E[1]); ctx.stroke();
    const hand = [E[0] + Math.cos(ang) * 98, E[1] + Math.sin(ang) * 98];
    ctx.strokeStyle = skin; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(hand[0], hand[1]); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hand[0] + Math.cos(ang) * 8, hand[1] + Math.sin(ang) * 8, 14, 0, TAU); ctx.fill();
    ctx.restore();
    const bic = (RF.mode === 'hot' && run) ? smoothstep(REFLEX_T * K_SLOW, REFLEX_T * K_SLOW + 0.25, ts) : 0;
    ctx.fillStyle = rgba('#e5484d', 0.25 + 0.5 * bic * (RF.arm.value < -0.5 ? 1 : 0.5)); ctx.beginPath(); ctx.ellipse(190, 216, 9 + 4 * bic, 22, 0.5, 0, TAU); ctx.fill();
    // 머리 (목 관절 기준 회전)
    ctx.save(); ctx.translate(176, 138); ctx.rotate(RF.head.value); ctx.translate(-176, -138);
    ctx.fillStyle = skin; rr(166, 118, 22, 40, 10); ctx.fill();
    ctx.fillStyle = lgrad(140, 60, 214, 140, [[0, shade(skin, 0.12)], [1, skinD]]); ctx.beginPath(); ctx.arc(178, 98, 40, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(214, 98); ctx.quadraticCurveTo(228, 106, 214, 114); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3a30'; ctx.beginPath(); ctx.arc(172, 92, 40, Math.PI * 0.98, Math.PI * 1.9); ctx.lineTo(176, 92); ctx.closePath(); ctx.fill();
    // 뇌 (투명하게 비침)
    const brainA = 0.9;
    ctx.fillStyle = rgba('#f4a6b8', brainA); ctx.beginPath(); ctx.ellipse(176, 86, 29, 21, -0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(150,40,80,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(158, 84); ctx.quadraticCurveTo(170, 74, 180, 84); ctx.moveTo(172, 92); ctx.quadraticCurveTo(186, 84, 196, 90); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(199, 96, 6, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b3445'; ctx.beginPath(); ctx.arc(200.5, 96, 3 + (RF.mode === 'pupil' ? (RF.pupil - 22) * 0.04 : 0), 0, TAU); ctx.fill();
    ctx.restore();
    // 척수, 소뇌/뇌줄기 표시
    ctx.strokeStyle = '#ef6c3e'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(158, 118); ctx.quadraticCurveTo(150, 140, 152, 180); ctx.lineTo(152, 334); ctx.stroke();
    // 중추 표시
    if (run || RF.t === -1) {
      const act = run ? smoothstep(T_STIM + 0.1, T_STIM + 0.5, rt) : 0.0;
      D.glow(M.cpos[0], M.cpos[1], 24 + 6 * Math.sin(t * 6) * act, M.col, 0.25 + act * 0.55);
    }
    ctx.restore();
    // 레이블
    pill(M.center, 74, M.cpos[1] - 4, { bg: M.col, size: 14, h: 26 });
    ctx.strokeStyle = rgba(M.col, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(100, M.cpos[1] - 4); ctx.lineTo(M.cpos[0] - 12, M.cpos[1]); ctx.stroke();
    const felt = RF.felt && run;
    pill('대뇌', 74, 62, { bg: felt ? '#e86a8a' : '#94a3b8', size: 14, h: 26 });
    ctx.strokeStyle = 'rgba(148,163,184,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(98, 64); ctx.lineTo(148, 82); ctx.stroke();
    if (run && !felt) txt('거치지 않아요', 80, 84, { size: 13, weight: 800, color: '#7c8799', align: 'center' });
    if (felt) txt('느낌이 와요!', 74, 84, { size: 12.5, weight: 800, color: '#d9466f', align: 'center' });

    // 자극 도구 (망치 · 냄비 · 먼지 · 빛)
    if (RF.mode === 'knee') {
      const pv = [432, 222], L = 124, a = RF.hammer, hx = pv[0] + Math.cos(a) * L, hy = pv[1] + Math.sin(a) * L;
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#a97c50'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(pv[0] - Math.cos(a) * 36, pv[1] - Math.sin(a) * 36); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.translate(hx, hy); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = lgrad(-12, 0, 12, 0, [[0, '#ff9a9a'], [1, '#c43c3c']]); rr(-24, -11, 48, 22, 9); ctx.fill();
      ctx.restore();
      if (RF.flash > 0.02) D.glow(332, 322, 34, '#ffd166', RF.flash * 0.9);
      if (!run) pill('🔨 실행하기를 누르면 무릎 아래를 쳐요', 330, 400, { bg: '#1b2333', size: 14, alpha: 0.9 });
    } else if (RF.mode === 'hot') {
      ctx.save();
      const heat = run ? smoothstep(T_STIM - 0.1, T_STIM, rt) : 0.4;
      D.glow(348, 246, 56, '#ff5a36', 0.35 + heat * 0.35);
      ctx.fillStyle = lgrad(0, 232, 0, 268, [[0, '#4b5563'], [1, '#1f2937']]); rr(322, 232, 56, 36, 8); ctx.fill();
      ctx.fillStyle = '#374151'; rr(378, 242, 26, 8, 4); ctx.fill();
      ctx.fillStyle = '#ff7043'; rr(326, 266, 48, 5, 2); ctx.fill();
      ctx.restore();
      D.flame(348, 292, 22, t);
      for (let i = 0; i < 3; i++) { const f = (t * 0.5 + i / 3) % 1; ctx.strokeStyle = rgba('#fff', (1 - f) * 0.7); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(332 + i * 16, 226 - f * 30); ctx.quadraticCurveTo(338 + i * 16, 216 - f * 30, 332 + i * 16, 206 - f * 30); ctx.stroke(); }
      pill('뜨거워!', 350, 196, { bg: '#e2464b', size: 14, h: 26, alpha: 0.9 });
    } else if (RF.mode === 'sneeze') {
      RF.dust.forEach((d) => {
        const ph = t * d.s + d.a * 3, dx = 270 + Math.cos(ph) * d.r + Math.sin(ph * 1.7) * 12, dy = 108 + Math.sin(ph * 1.3) * d.r * 0.6;
        const toward = run ? smoothstep(0, T_STIM, rt) : 0;
        bead(lerp(dx, 226, toward * 0.9), lerp(dy, 108, toward * 0.9), 3.4, '#b6a48a', { noShadow: true, alpha: 0.9 });
      });
      pill('먼지', 304, 70, { bg: '#8a7860', size: 13, h: 24 });
    } else if (RF.mode === 'pupil') {
      // 눈 확대
      const cx = 390, cy = 150, R = 62;
      D.glow(cx + 40, 56, 60 + RF.light * 24, '#fff3b0', 0.4 * RF.light + 0.1);
      ctx.save(); ctx.strokeStyle = 'rgba(90,100,120,.5)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(204, 90); ctx.lineTo(cx - R + 6, cy - 24); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = rgrad(cx - 8, cy - 8, 4, cx, cy, 40, [[0, '#7bb6ee'], [0.7, '#3b78b8'], [1, '#26507e']]); ctx.beginPath(); ctx.arc(cx, cy, 40, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0d1424'; ctx.beginPath(); ctx.arc(cx, cy, RF.pupil, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(cx - 12, cy - 12, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c3cbd9'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      pill('동공', cx, cy + R + 22, { bg: '#2f93d6', size: 14, h: 26 });
      // 손전등
      ctx.save(); ctx.translate(462, 40); ctx.rotate(2.3);
      ctx.fillStyle = '#4b5563'; rr(-14, -10, 54, 20, 6); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(-24, -20); ctx.lineTo(-24, 20); ctx.lineTo(-14, 14); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (RF.light > 0.02) { ctx.save(); ctx.globalAlpha = RF.light * 0.35; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.moveTo(444, 48); ctx.lineTo(cx + 40, cy - 40); ctx.lineTo(cx + 24, cy + 52); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    // 신호(펄스)
    if (run) {
      const sEnd = M.P.len, spd = sEnd / (REFLEX_T * K_SLOW), s = clamp(ts * spd, 0, sEnd);
      if (ts > 0 && ts < REFLEX_T * K_SLOW + 0.35) {
        const col = s < M.cordS ? '#4f8cff' : '#ff9d2e';
        ctx.save(); ctx.strokeStyle = rgba('#4f8cff', 0.28); ctx.lineWidth = 7; ctx.beginPath(); M.P.trace(0, Math.min(s, M.cordS)); ctx.stroke();
        ctx.strokeStyle = rgba('#ff9d2e', 0.28); ctx.beginPath(); M.P.trace(M.cordS, Math.max(s, M.cordS)); ctx.stroke(); ctx.restore();
        drawPulse(M.P, s, { color: col, trail: 70, w: 7, r: 20 });
      }
      // 대뇌로 가는 느낌 신호 (뒤따라서 천천히)
      const tb = ts - (M.cordS / spd);
      if (tb > 0) {
        const bs = clamp(tb / 1.1 * M.B.len, 0, M.B.len);
        if (tb < 1.5) drawPulse(M.B, bs, { color: '#c4b5fd', trail: 60, w: 5, r: 14, alpha: 0.9 });
      }
    }
    if (RF.mode === 'knee' && !run) { /* 정지 상태 신경 표시 */ ctx.strokeStyle = 'rgba(79,140,255,.35)'; ctx.lineWidth = 4; ctx.beginPath(); M.P.trace(0, M.cordS); ctx.stroke(); ctx.strokeStyle = 'rgba(255,157,46,.35)'; ctx.beginPath(); M.P.trace(M.cordS, M.P.len); ctx.stroke(); }
    else if (!run) { ctx.strokeStyle = 'rgba(79,140,255,.35)'; ctx.lineWidth = 4; ctx.beginPath(); M.P.trace(0, M.cordS); ctx.stroke(); ctx.strokeStyle = 'rgba(255,157,46,.35)'; ctx.beginPath(); M.P.trace(M.cordS, M.P.len); ctx.stroke(); }

    // 오른쪽 카드: 경로 단계 (또는 순서 맞추기)
    panel(526, 14, 260, 410, { r: 18 });
    if (RF.order) drawOrderPanel(t);
    else {
      pill(M.icon + ' ' + M.name, 656, 40, { bg: M.col, size: 16, h: 30, pad: 14 });
      const frac = run ? clamp(ts * (1 / (REFLEX_T * K_SLOW)), 0, 1) : 0, thr = [0, 0.08, 0.5, 0.62, 1];
      M.stages.forEach((s, i) => {
        const y = 78 + i * 68, lit = run && ts >= 0 ? (i === 0 ? 1 : smoothstep(thr[i] - 0.04, thr[i] + 0.02, frac) * (i === 4 ? (RF.fired ? 1 : 0) : 1)) : (run ? (i === 0 ? smoothstep(0, T_STIM, rt) : 0) : 0);
        ctx.save();
        rr(538, y, 236, 60, 12); ctx.fillStyle = lit > 0.5 ? rgba(M.col, 0.14) : '#f4f6fa'; ctx.fill();
        if (lit > 0.5) { ctx.strokeStyle = rgba(M.col, 0.7); ctx.lineWidth = 2; ctx.stroke(); }
        ctx.restore();
        bead(558, y + 30, 11, lit > 0.5 ? M.col : '#cfd6e2', { noShadow: true });
        txt(String(i + 1), 558, y + 31, { size: 14, weight: 800, color: '#fff', align: 'center', base: 'middle' });
        const ls = wrapLines(s, 190, 14);
        ls.slice(0, 3).forEach((l, k) => txt(l, 576, y + 30 - (Math.min(ls.length, 3) - 1) * 9 + k * 18, { size: 14, weight: 700, color: lit > 0.5 ? '#1b2333' : '#7c8799', base: 'middle' }));
      });
    }

    // 아래: 반응 시간 막대 비교
    panel(14, 436, 772, 156, { r: 18 });
    const cons = consT(), dom = Math.max(0.30, cons + 0.06), X0 = 214, BW = 540, px = BW / dom;
    txt('⏱ 반응 시간 비교 (느린 화면)', 30, 462, { size: 15, weight: 800, color: '#2b3445' });
    const tau = RF.t === -2 ? 99 : RF.t >= 0 ? Math.max(0, (RF.t - T_STIM) / K_SLOW) : 0;
    const rows = [
      { y: 482, label: M.name + (RF.mode === 'knee' ? '' : ' (반사)'), sub: '대뇌를 거치지 않아요', v: REFLEX_T, col: M.col, val: RF.mode === 'knee' ? '약 0.05초' : '아주 빠름' },
      { y: 530, label: '의식적 반응 (자 잡기)', sub: '대뇌를 거쳐요', v: cons, col: '#e8890c', val: (RU.trials.length ? '내 평균 ' + (cons).toFixed(2) + '초' : '예시 ' + cons.toFixed(2) + '초') },
    ];
    rows.forEach((r) => {
      txt(r.label, 30, r.y + 12, { size: 14.5, weight: 800, color: '#1b2333', max: 176 });
      txt(r.sub, 30, r.y + 30, { size: 13, weight: 700, color: '#8a93a3', max: 176, min: 11 });
      ctx.fillStyle = '#eef1f6'; rr(X0, r.y, BW, 24, 12); ctx.fill();
      const w = Math.max(0, Math.min(tau, r.v)) * px;
      if (w > 1) { ctx.fillStyle = lgrad(X0, 0, X0 + w, 0, [[0, shade(r.col, 0.2)], [1, r.col]]); rr(X0, r.y, Math.max(w, 24), 24, 12); ctx.fill(); }
      if (tau >= r.v) txt(r.val, X0 + r.v * px + 8, r.y + 12, { size: 14, weight: 800, color: r.col === M.col ? shade(M.col, -0.2) : '#b8650a', base: 'middle' });
      else if (!run) txt(r.val, X0 + r.v * px + 8, r.y + 12, { size: 14, weight: 700, color: '#a8b0bf', base: 'middle' });
    });
    for (let v = 0; v <= dom + 1e-6; v += 0.1) {
      const x = X0 + v * px; ctx.fillStyle = '#c3cbd9'; ctx.fillRect(x, 572, 1.5, 6);
      txt(v === 0 ? '0' : v.toFixed(1) + '초', x, 589, { size: 12, weight: 700, color: '#8a93a3', align: 'center' });
    }
  }
  function orderChipRect(i) { return { x: 538, y: 112 + i * 54, w: 236, h: 42 }; }
  function drawOrderPanel(t) {
    pill('🧩 무릎 반사 경로 순서', 656, 40, { bg: '#ef6c3e', size: 15, h: 30, pad: 12 });
    para('시작: 무릎 아래 힘줄이 자극을 받아요', 540, 76, 232, 14, 18, { weight: 800, color: '#2b3445' });
    RF.chips.forEach((c, i) => {
      const r = orderChipRect(i), k = RF.picks.indexOf(c.id), on = k >= 0, bad = RF.bad[c.id];
      const sx = bad ? Math.sin(t * 60) * 3 : 0;
      ctx.save(); ctx.translate(sx, 0);
      ctx.shadowColor = 'rgba(30,60,40,.15)'; ctx.shadowBlur = on ? 4 : 8; ctx.shadowOffsetY = on ? 1 : 3;
      rr(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = bad ? '#fde2e2' : on ? '#fff0e8' : '#fff'; ctx.fill();
      ctx.restore(); ctx.save(); ctx.translate(sx, 0);
      rr(r.x, r.y, r.w, r.h, 14); ctx.strokeStyle = bad ? '#e2464b' : on ? '#ef6c3e' : '#d3dae6'; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke();
      txt(c.label, r.x + 58, r.y + r.h / 2 + 1, { size: 17, weight: 800, color: '#1b2333', base: 'middle' });
      if (on) { bead(r.x + 28, r.y + r.h / 2, 13, '#ef6c3e', { noShadow: true }); txt(String(k + 1), r.x + 28, r.y + r.h / 2 + 1, { size: 15, weight: 800, color: '#fff', align: 'center', base: 'middle' }); }
      else { ctx.strokeStyle = '#cfd6e2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x + 28, r.y + r.h / 2, 12, 0, TAU); ctx.stroke(); }
      ctx.restore();
    });
    txt('끝: 다리가 올라가요', 656, 398, { size: 14, weight: 800, color: '#2b3445', align: 'center' });
  }
  function reflexDown(p) {
    if (RF.order && p.x > 526) {
      for (let i = 0; i < RF.chips.length; i++) {
        const r = orderChipRect(i);
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
          const id = RF.chips[i].id, k = RF.picks.indexOf(id);
          if (k >= 0) RF.picks.splice(k); else RF.picks.push(id);
          RF.bad = {}; Sound.click(); return true;
        }
      }
    }
    return false;
  }

  /* =====================================================
     장면 전환 · 입력 · 단계(미션)
     ===================================================== */
  let F = new Set(), game = null;
  const SCENE_LABEL = { neuron: '🧬 뉴런의 구조와 신호', nervous: '🧠 중추 신경계와 말초 신경계', ruler: '📏 자 잡기 : 의식적 반응', reflex: '🦵 무조건 반사' };
  function setScene(name) {
    S.scene = name;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === name));
    $$('#ctrlCard .cgrp').forEach((g) => { g.hidden = g.dataset.scene !== name; });
    $('#sceneLabel').textContent = SCENE_LABEL[name];
    if (name === 'ruler') syncRulerUI();
    hideHint();
  }
  const handlers = {
    down: (p, e) => {
      if (S.scene === 'neuron') return neuronDown(p);
      if (S.scene === 'nervous') return nervousDown(p);
      if (S.scene === 'ruler') { if (p.y < 466) { doCatch(e && e.timeStamp); return true; } return false; }
      return reflexDown(p);
    },
  };
  view = SciSim.stage($('#cv'), { width: W, height: H, background: BG });
  ctx = view.ctx; D = SciSim.draw(ctx);
  SciSim.pointer(view, handlers);

  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  function setNvView(v) {
    NV.view = v; NV.pulses = []; NV.sel = null;
    $$('#nvSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    $('#nvNote').textContent = v === 'one' ? '뉴런의 각 부분을 눌러 이름과 하는 일을 읽어 봐요.' : '세 뉴런을 눌러 역할을 읽고, 자극을 주어 신호가 이어지는 모습을 봐요.';
  }
  $$('#nvSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setNvView(b.dataset.v); }));
  $('#btnStim').addEventListener('click', () => { fireStim(); });
  $('#btnDrop').addEventListener('click', startDrop);
  const catchBtn = $('#btnCatch');
  catchBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); doCatch(e.timeStamp); });
  catchBtn.addEventListener('click', (e) => { if (e.detail === 0) doCatch(performance.now()); });   // 키보드 접근
  $$('#rfSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setReflexMode(b.dataset.v); }));
  $('#btnRun').addEventListener('click', runReflex);
  function setOrderMode(on) {
    RF.order = on;
    $$('#rfSeg button').forEach((b) => { b.disabled = on && b.dataset.v !== 'knee'; });
    $('#btnRun').disabled = on;
    if (on) { RF.mode = 'knee'; RF.t = -1; RF.fired = false; RF.hit = false; RF.hammer = 4.1; RF.kick.target = 0; $$('#rfSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'knee')); initOrder(); }
  }

  /* ---------- 퀴즈 그림 ---------- */
  const FIG_NEURON = '<svg viewBox="0 0 360 150" width="100%" role="img" aria-label="뉴런 그림: 왼쪽 ㉠, 가운데 둥근 ㉡, 긴 오른쪽 ㉢"><rect width="360" height="150" fill="#1d2c52"/>' +
    '<g stroke="#8fb4ff" stroke-width="5" stroke-linecap="round" fill="none"><path d="M18 52 L44 70 L64 78 M18 100 L44 84 L64 78 M12 76 L64 78"/><path d="M22 36 L36 54 M22 120 L38 100" stroke-width="3"/></g>' +
    '<circle cx="92" cy="78" r="28" fill="#78a6ff" stroke="#fff" stroke-width="2"/><circle cx="88" cy="78" r="11" fill="#2b4a8f"/>' +
    '<path d="M120 78 H322" stroke="#8fb4ff" stroke-width="6" stroke-linecap="round"/>' +
    '<g fill="#f1d98d" stroke="#8a6a1c" stroke-width="1"><rect x="140" y="68" width="40" height="20" rx="10"/><rect x="190" y="68" width="40" height="20" rx="10"/><rect x="240" y="68" width="40" height="20" rx="10"/></g>' +
    '<g stroke="#8fb4ff" stroke-width="4" stroke-linecap="round" fill="none"><path d="M322 78 L342 58 M322 78 L346 78 M322 78 L342 98"/></g><g fill="#cfe0ff"><circle cx="344" cy="56" r="5"/><circle cx="350" cy="78" r="5"/><circle cx="344" cy="100" r="5"/></g>' +
    '<g font-size="22" font-weight="800" fill="#ffd166" text-anchor="middle"><text x="34" y="30">㉠</text><text x="92" y="130">㉡</text><text x="210" y="50">㉢</text></g></svg>';

  /* ---------- 단계 ---------- */
  const ids = (m, id) => { m.id = id; return m; };
  const REGION_NAMES = ['대뇌', '소뇌', '간뇌', '중간뇌', '연수', '척수'];
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '뉴런의 구조와 신호 전달', short: '뉴런', icon: '🧬', phase: '관찰',
      features: ['neuron'],
      intro: '<p class="si-q">❓ 탐구 질문: 뜨거운 냄비에 손이 닿으면 ‘뜨겁다’고 생각하기도 전에 손을 떼는 까닭은 무엇일까?</p>' +
        '<p>이 질문에 답하려면 몸속에서 <b>신호</b>가 어떻게 전달되는지 알아야 해요. 신호를 전달하는 세포가 바로 <b>뉴런(신경 세포)</b>이에요.</p>' +
        '<p>뉴런은 <b>가지 돌기, 신경 세포체, 축삭 돌기</b>로 이루어져 있고, 신호는 한 방향으로만 가요. 먼저 뉴런 하나를 관찰해요.</p>',
      setup() { setScene('neuron'); setNvView('one'); },
      recap: '뉴런은 <b>가지 돌기</b>로 자극을 받고 <b>축삭 돌기</b>로 전달해요. 신호는 <b>한 방향</b>으로만 가요.',
      summary: '<ul><li><b>뉴런(신경 세포)</b>은 <b>신경 세포체</b>(핵이 있어요), <b>가지 돌기</b>, <b>축삭 돌기</b>로 이루어져 있어요.</li>' +
        '<li><b>가지 돌기</b>는 자극을 받아들이고, <b>축삭 돌기</b>는 자극을 다른 뉴런이나 기관으로 전달해요.</li>' +
        '<li>신호는 가지 돌기 → 신경 세포체 → 축삭 돌기 끝, <b>한 방향</b>으로만 전달돼요.</li>' +
        '<li><b>감각 뉴런</b>은 감각 기관의 자극을 중추로, <b>연합 뉴런</b>은 뇌·척수에서 판단하고 명령을, <b>운동 뉴런</b>은 명령을 근육으로 전달해요.</li></ul>',
      missions: [
        ids({
          title: '신호를 끝까지 전달하기',
          goal: '<b>⚡ 자극 주기</b>를 눌러 신호가 가지 돌기에서 축삭 돌기 끝까지 가는 모습을 <b>2번</b> 관찰해요.',
          hint: '오른쪽 위 노란 단추를 눌러요. 반짝이는 신호가 어느 방향으로 움직이는지 지켜봐요.',
          setup() { setScene('neuron'); setNvView('one'); NV.deliv1 = 0; showHint('⚡ 자극 주기를 눌러 신호를 보내요', 6000); },
          check: () => NV.deliv1 >= 2, hold: 0.2,
          status: () => '끝까지 전달된 신호: <b>' + Math.min(NV.deliv1, 2) + ' / 2</b>번',
          explain: '신호는 <b>가지 돌기 → 신경 세포체 → 축삭 돌기 → 축삭 돌기 끝</b> 방향으로만 가요. 축삭 돌기 끝에서 다음 뉴런이나 근육에 신호를 넘겨 줘요.',
        }, 'pulse'),
        ids({
          title: '세 종류의 뉴런 연결하기',
          goal: '<b>🔗 뉴런 연결</b>로 바꾸고 자극을 줘서 <b>근육까지</b> 신호를 전달해요. 세 뉴런을 눌러 하는 일도 읽어 봐요.',
          hint: '“뉴런 연결” 단추를 누르고 ⚡ 자극 주기를 눌러요. 감각·연합·운동 뉴런을 각각 눌러 보세요.',
          setup() { setScene('neuron'); NV.delivC = 0; NV.types.clear(); showHint('🔗 뉴런 연결로 바꿔 보세요', 6000); },
          check: () => NV.delivC >= 1 && NV.types.size >= 3, hold: 0.2,
          status: () => mark(NV.delivC >= 1) + ' 근육까지 전달 &nbsp; ' + mark(NV.types.size >= 3) + ' 세 뉴런 읽기 (' + NV.types.size + '/3)',
          explain: '자극은 <b>감각 뉴런 → 연합 뉴런 → 운동 뉴런 → 근육</b> 순서로 전달돼요. 연합 뉴런은 뇌와 척수에 있어요.',
        }, 'chain'),
        {
          type: 'quiz', title: '자극을 받아들이는 부분', figure: FIG_NEURON,
          goal: '그림의 ㉠~㉢ 중에서 <b>다른 뉴런이나 감각 기관의 자극을 받아들이는 부분</b>은 어디일까요?',
          setup() { setScene('neuron'); },
          choices: ['㉠', '㉡', '㉢', '세 부분이 모두 똑같이 자극을 받아들여요'],
          answer: 0,
          feedback: ['', '㉡은 핵이 있는 신경 세포체예요. 뉴런의 생명 활동이 일어나는 곳이고, 자극을 받아들이는 곳은 아니에요.', '㉢은 축삭 돌기예요. 자극을 다른 뉴런이나 근육으로 내보내는 쪽이에요.', '신호는 한 방향으로만 가요. 받아들이는 곳(가지 돌기)과 내보내는 곳(축삭 돌기)이 달라요.'],
          explain: '자극은 <b>㉠ 가지 돌기</b>가 받아들여요. 그다음 <b>신경 세포체(㉡)</b>를 지나 <b>축삭 돌기(㉢)</b>를 따라 전달돼요.',
        },
      ],
    },
    /* ---------- 2단계 · 모형 ---------- */
    {
      title: '중추 신경계와 말초 신경계', short: '신경계', icon: '🧠', phase: '모형',
      features: ['nervous'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 감각 뉴런 → 연합 뉴런 → 운동 뉴런으로 신호가 이어지는 것을 보았어요.</div>' +
        '<p>연합 뉴런이 모여 있는 <b>뇌와 척수</b>를 <b>중추 신경계</b>라고 해요. 중추 신경계와 온몸을 이어 주는 감각 신경과 운동 신경은 <b>말초 신경계</b>예요.</p>' +
        '<p>뇌는 <b>대뇌, 소뇌, 간뇌, 중간뇌, 연수</b>로 이루어져 있어요. 각 부분이 하는 일이 서로 달라요.</p>',
      setup() { setScene('nervous'); NS.match.on = false; },
      recap: '<b>중추 신경계</b>(뇌·척수)가 판단하고 명령하며, <b>말초 신경계</b>가 몸과 이어 줘요.',
      summary: '<ul><li><b>중추 신경계</b>: 뇌와 척수. <b>말초 신경계</b>: 감각 신경과 운동 신경.</li>' +
        '<li><b>대뇌</b>: 감각·기억·판단, 의식적 행동 명령 / <b>소뇌</b>: 몸의 균형, 근육 운동 조절 / <b>간뇌</b>: 체온·혈당량 등 조절 / <b>중간뇌</b>: 눈의 움직임, 동공 크기 조절 / <b>연수</b>: 심장 박동·호흡·소화 운동 조절</li>' +
        '<li><b>척수</b>: 뇌와 몸 사이 신호의 통로, 무릎 반사 같은 반사의 중추</li></ul>',
      missions: [
        ids({
          title: '뇌의 부분 살펴보기',
          goal: '대뇌, 소뇌, 간뇌, 중간뇌, 연수, 척수를 <b>모두 눌러서</b> 하는 일을 읽어요.',
          hint: '오른쪽 뇌 그림의 색칠된 부분과 아래쪽 척수를 하나씩 눌러 보세요. 읽은 곳에는 ✔ 표시가 생겨요.',
          setup() { setScene('nervous'); NS.match.on = false; NS.seen.clear(); NS.sel = null; showHint('🧠 뇌의 부분을 하나씩 눌러 봐요', 6000); },
          check: () => NS.seen.size >= 6, hold: 0.3,
          status: () => '살펴본 곳 <b>' + NS.seen.size + ' / 6</b> &nbsp; ' + [['cerebrum', '대뇌'], ['cerebellum', '소뇌'], ['diencephalon', '간뇌'], ['midbrain', '중간뇌'], ['medulla', '연수'], ['cord', '척수']].map((q) => mark(NS.seen.has(q[0])) + q[1]).join(' '),
          explain: '뇌는 부분마다 하는 일이 달라요. <b>대뇌</b>는 생각과 판단, <b>소뇌</b>는 균형, <b>간뇌</b>는 체온 같은 몸 상태 조절, <b>중간뇌</b>는 동공, <b>연수</b>는 심장 박동과 호흡을 맡아요.',
        }, 'explore'),
        ids({
          title: '상황과 뇌의 부분 짝짓기', manual: true,
          goal: '상황 5개를 읽고, 그 일을 맡은 뇌의 부분을 눌러 짝지어요. 다 정했으면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '소뇌는 균형, 간뇌는 체온, 중간뇌는 동공, 연수는 심장 박동과 호흡, 대뇌는 생각과 판단이에요.',
          setup() { setScene('nervous'); NS.match.on = true; NS.match.cur = 0; NS.match.assign = []; NS.match.flag = {}; NS.sel = null; },
          status: () => '정한 상황: <b>' + NS.match.assign.filter(Boolean).length + ' / 5</b>',
          check() {
            const m = NS.match, n = m.assign.filter(Boolean).length;
            if (n < 5) return '아직 정하지 않은 상황이 있어요. (' + (5 - n) + '개 남음)';
            const bad = MATCH.map((q, i) => (m.assign[i] !== q.a ? i : -1)).filter((i) => i >= 0);
            bad.forEach((i) => { if (!m.flag[i]) m.flag[i] = true; });
            if (bad.length) return '<b>상황 ' + bad.map((i) => i + 1).join(', ') + '</b>번의 짝이 맞지 않아요. 뇌의 부분이 하는 일을 다시 읽어 봐요.';
            return true;
          },
          explain: '<b>균형 → 소뇌, 체온 → 간뇌, 동공 → 중간뇌, 심장 박동 → 연수, 문제 풀기 → 대뇌</b>예요.',
        }, 'match'),
        {
          type: 'quiz', title: '중추 신경계와 말초 신경계',
          goal: '다음 중 <b>중추 신경계에 속하지 않는 것</b>은 무엇일까요?',
          setup() { setScene('nervous'); NS.match.on = false; },
          choices: ['대뇌', '척수', '연수', '감각 신경'],
          answer: 3,
          feedback: ['대뇌는 뇌의 일부이니 중추 신경계예요.', '척수는 뇌와 함께 중추 신경계를 이루어요.', '연수는 뇌의 일부이니 중추 신경계예요.', ''],
          explain: '<b>감각 신경</b>은 온몸에 퍼져 있는 <b>말초 신경계</b>예요. 뇌와 척수만 중추 신경계에 속해요.',
        },
      ],
    },
    /* ---------- 3단계 · 실험 ---------- */
    {
      title: '자 잡기로 반응 시간 재기', short: '의식적 반응', icon: '📏', phase: '실험',
      features: ['ruler'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 생각하고 판단하는 곳이 <b>대뇌</b>라는 것을 알았어요.</div>' +
        '<p>눈으로 본 것을 판단해서 몸을 움직이는 일을 <b>의식적 반응</b>이라고 해요. 자가 떨어지는 것을 보고 잡을 때까지 걸리는 시간을 직접 재 봐요.</p>' +
        '<p>자가 떨어진 <b>거리</b>가 길수록 반응 시간도 길어요.</p>',
      setup() { setScene('ruler'); },
      recap: '의식적 반응은 <b>자극 → 감각 기관 → 감각 신경 → 대뇌 → 운동 신경 → 근육</b>의 길을 따라 일어나요.',
      summary: '<ul><li><b>의식적 반응</b>의 경로: 자극 → 감각 기관 → 감각 신경 → <b>대뇌</b>(판단·명령) → 운동 신경 → 근육</li>' +
        '<li>자 잡기 실험: 자가 떨어진 거리가 길수록 반응 시간이 길어요. 사람마다, 때마다 조금씩 달라요.</li>' +
        '<li>반응 시간은 대략 0.2초 안팎이에요. (5 cm 0.10초, 10 cm 0.14초, 20 cm 0.20초, 30 cm 0.25초)</li></ul>',
      missions: [
        ids({
          title: '반응 시간 3번 재기',
          goal: '친구가 놓은 자가 떨어지는 순간 <b>화면을 탭</b>해서 잡아요. <b>3번</b> 재서 평균을 구해요.',
          hint: '▶ 자 떨어뜨리기를 누르고 자를 계속 보세요. 떨어지기 전에 누르면 다시 해야 해요. 자가 움직이기 시작하면 바로 탭!',
          setup() { setScene('ruler'); RU.trials = []; RU.st = 'idle'; RU.d = 0; RU.rp = -1; RU.gapS.target = 26; RU.gapH.target = 0; syncRulerUI(); },
          check: () => RU.trials.length >= 3, hold: 0.3,
          status: () => '측정 <b>' + Math.min(RU.trials.length, 3) + ' / 3</b>번' + (RU.trials.length ? ' · 평균 <b>' + avgMs() + ' ms</b>' : ''),
          explain: '평균 반응 시간은 <b>' + '약 0.2초</b>(200 ms) 안팎이에요. 자가 멀리 떨어진 뒤에 잡을수록 반응 시간이 길어요. 이 시간 동안 신호가 눈에서 대뇌를 거쳐 손가락 근육까지 전달돼요.',
        }, 'trials'),
        {
          type: 'quiz', title: '의식적 반응의 경로',
          goal: '자가 떨어지는 것을 보고 손가락으로 잡을 때, 신호가 지나가는 길로 알맞은 것은?',
          setup() { setScene('ruler'); },
          choices: ['눈 → 감각 신경 → 대뇌 → 운동 신경 → 손가락 근육', '눈 → 감각 신경 → 척수 → 운동 신경 → 손가락 근육', '눈 → 운동 신경 → 대뇌 → 감각 신경 → 손가락 근육', '대뇌 → 눈 → 감각 신경 → 운동 신경 → 손가락 근육'],
          answer: 0,
          feedback: ['', '척수만 거치면 대뇌의 판단 없이 일어나는 반사의 경로예요. 자 잡기는 보고 판단해서 잡는 의식적 반응이에요.', '신호는 감각 신경으로 들어가 대뇌에서 판단한 뒤 운동 신경으로 나와요. 순서가 거꾸로예요.', '자극은 감각 기관(눈)에서 시작해요. 대뇌가 먼저 시작하는 것이 아니에요.'],
          explain: '의식적 반응은 <b>눈(감각 기관) → 감각 신경 → 대뇌(판단·명령) → 운동 신경 → 근육</b> 순서로 일어나요. 대뇌에서 판단하는 시간이 걸려요.',
        },
      ],
    },
    /* ---------- 4단계 · 탐구 ---------- */
    {
      title: '무조건 반사와 속도 비교', short: '무조건 반사', icon: '🦵', phase: '탐구',
      features: ['reflex'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 의식적 반응에는 약 0.2초가 걸리는 것을 내 손으로 쟀어요.</div>' +
        '<p>그런데 무릎 아래를 톡 치면 생각하기도 전에 다리가 올라가요. 이런 반응을 <b>무조건 반사</b>라고 해요. 신호가 <b>대뇌를 거치지 않고</b> 척수·연수·중간뇌에서 바로 명령이 나가기 때문이에요.</p>' +
        '<p>처음 던진 질문 “뜨거운 냄비에서 손을 떼는 까닭”의 답도 곧 찾을 수 있어요.</p>',
      setup() { setScene('reflex'); setOrderMode(false); },
      recap: '<b>무조건 반사</b>는 대뇌를 거치지 않아 <b>빠르게</b> 일어나고, 위험으로부터 몸을 보호해요.',
      summary: '<ul><li><b>무조건 반사</b>의 경로: 자극 → 감각 기관 → 감각 신경 → <b>척수·연수·중간뇌</b> → 운동 신경 → 근육 (대뇌를 거치지 않아요)</li>' +
        '<li>무릎 반사·회피 반사(뜨거운 것에서 손 떼기)는 <b>척수</b>, 재채기·기침·하품은 <b>연수</b>, 동공 반사는 <b>중간뇌</b>가 중추예요.</li>' +
        '<li>무릎 반사는 약 0.05초 이내로, 의식적 반응(약 0.2초)보다 훨씬 빨라요. 위험으로부터 몸을 빠르게 보호해요.</li></ul>',
      missions: [
        ids({
          title: '네 가지 반사 모두 살펴보기',
          goal: '무릎 반사, 뜨거운 냄비, 재채기, 동공 반사를 <b>모두 실행</b>해서 신호의 길과 막대 그래프를 비교해요.',
          hint: '위쪽 단추로 반사를 고르고 ▶ 실행하기를 눌러요. 반사가 끝나는 동안 아래 막대에서 의식적 반응은 아직 한참 가고 있어요.',
          setup() { setScene('reflex'); setOrderMode(false); RF.ran.clear(); showHint('🦵 반사를 골라 ▶ 실행하기를 눌러요', 6000); },
          check: () => RF.ran.size >= 4, hold: 0.8,
          status: () => ['knee', 'hot', 'sneeze', 'pupil'].map((k) => mark(RF.ran.has(k)) + RFM[k].name).join(' &nbsp; '),
          explain: '네 가지 모두 대뇌를 거치지 않아요. <b>무릎 반사·회피 반사는 척수, 재채기는 연수, 동공 반사는 중간뇌</b>가 중추라서 반응이 빠르고 몸을 보호해요.',
        }, 'reflexes'),
        ids({
          title: '무릎 반사 경로 순서 맞추기', manual: true,
          goal: '카드를 <b>신호가 지나가는 순서대로</b> 눌러요. 경로에 들어가지 않는 카드는 누르지 않아요. 다 골랐으면 <b>✔ 확인하기</b>!',
          hint: '감각 신경으로 들어간 신호는 중추(척수)에서 바로 명령으로 바뀌어 운동 신경으로 나가요. 무릎 반사에서 쉬어 가는 카드가 하나 있어요.',
          setup() { setScene('reflex'); setOrderMode(true); },
          status: () => '고른 카드: <b>' + RF.picks.length + '</b>장',
          check() {
            const p = RF.picks;
            if (p.includes('cerebrum')) { RF.bad = { cerebrum: true }; return '<b>대뇌</b>는 무릎 반사의 경로에 들어가지 않아요. 무릎 반사는 척수가 중추라서 대뇌를 거치지 않아요.'; }
            if (p.length < ORDER_ANS.length) return '아직 카드를 다 고르지 않았어요. 시작(무릎 힘줄)에서 끝(다리가 올라감)까지 순서대로 눌러요.';
            const wrong = p.findIndex((id, i) => id !== ORDER_ANS[i]);
            if (wrong >= 0) { RF.bad = { [p[wrong]]: true }; return '<b>' + (wrong + 1) + '번째</b> 카드의 순서가 맞지 않아요. 자극이 들어가는 길(감각)과 명령이 나오는 길(운동)을 생각해 봐요.'; }
            RF.bad = {};
            return true;
          },
          explain: '무릎 반사의 경로는 <b>무릎 힘줄(감각 기관) → 감각 신경 → 척수 → 운동 신경 → 넓적다리 근육</b>이에요. <b>대뇌를 거치지 않아요.</b>',
        }, 'order'),
        {
          type: 'quiz', title: '반사가 빠른 까닭',
          goal: '뜨거운 냄비에 손이 닿으면 ‘뜨겁다’고 생각하기도 전에 손을 떼요. 이렇게 빠른 까닭은 무엇일까요?',
          setup() { setScene('reflex'); setOrderMode(false); },
          choices: ['신호가 대뇌를 거치지 않고 척수에서 바로 명령이 나가기 때문에', '손의 근육이 다른 근육보다 훨씬 힘이 세기 때문에', '대뇌가 순식간에 판단을 끝내기 때문에', '감각 신경이 없어도 반응이 일어나기 때문에'],
          answer: 0,
          feedback: ['', '근육의 힘이 아니라 신호가 지나가는 길이 짧아서 빠른 거예요.', '반사는 대뇌의 판단을 거치지 않아요. 판단하지 않아서 빠른 거예요.', '반사에도 감각 신경(자극 전달)과 운동 신경(명령 전달)이 모두 필요해요.'],
          explain: '반사는 <b>대뇌를 거치지 않고 척수(또는 연수·중간뇌)에서 바로 명령</b>이 나가서 매우 빨라요. 덕분에 위험으로부터 몸을 재빨리 보호할 수 있어요. 뜨겁다는 느낌은 신호가 대뇌에 도착한 뒤에야 들어요.',
        },
      ],
    },
  ];

  /* ---------- 시작 ---------- */
  game = SciSim.game({
    simId: 'm3-neuron-reflex',
    mount: '#game',
    badge: '신경계 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      neuron: '🧬 뉴런 모형',
      nervous: '🧠 신경계 지도',
      ruler: '📏 자 잡기 실험',
      reflex: '🦵 반사 경로 모형',
    },
    onFeatures(set) { F = new Set(set); },
    onMissionStart() { hideHint(); },
    onComplete() { NS.match.on = false; setOrderMode(false); },
    levels,
  });

  window.__sim = {
    S, NV, NS, RU, RF, RFM, MATCH, REGIONS, game, setScene, setNvView, fireStim, startDrop, doCatch, runReflex, setReflexMode, distOf, avgMs, orderChipRect,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
    regionP(id) { const R = REGIONS[id]; return this.toClient(BR.ox + R.lab[0] * BR.k, BR.oy + R.lab[1] * BR.k - 4); },
  };

  SciSim.loop((dt, t) => {
    if (S.scene === 'neuron') updateNeuron(dt);
    else if (S.scene === 'nervous') updateNervous(dt);
    else if (S.scene === 'ruler') updateRuler(dt);
    else updateReflex(dt);
    PFX.update(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    if (S.scene === 'neuron') drawNeuronScene(t);
    else if (S.scene === 'nervous') drawNervousScene(t);
    else if (S.scene === 'ruler') drawRulerScene(t);
    else drawReflexScene(t);
    PFX.draw(ctx);
    drawHint();
  });
})();
