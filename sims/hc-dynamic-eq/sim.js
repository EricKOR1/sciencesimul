/* =========================================================
   화학 Ⅲ. 화학 평형 - 동적 평형 [12화학03-01] (단원 2차시)
   ① 관찰: 농도 일정 (N₂O₄만 / NO₂만 출발, 같은 평형 농도)
   ② 모형: 분자 세기 (입자 100개, 초당 정반응 · 역반응 횟수)
   ③ 분석: 속도 그래프 (두 속도가 만나는 때, 닫힌 용기 · 일정한 온도)
   ④ 설명: 동적 평형 (표지 원자 추적, 포화 용액 · 증발 · 화학 평형 짝짓기)
   반응 속도식 · 속도 상수는 다루지 않고 입자 수를 센 '횟수/초'로 속도를 나타내요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#1b2333', MUTED = '#5d6879', VIO = '#7c3aed', AMB = '#d97706', GOOD = '#14a058', BAD = '#e2464b', BLU = '#3867f4', BRN = '#a65a2a';
  const BGC = '#f4f1fb';
  const rnd = (a, b) => a + Math.random() * (b - a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BGC });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
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
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const parseNum = (s) => {
    let t = String(s).trim().replace(/,/g, '.').replace(/\s+/g, '');
    const fr = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(t); if (fr && +fr[2] !== 0) return +fr[1] / +fr[2];
    const sc = /^(\d+(?:\.\d+)?)(?:[x×*]10\^?|e)([+\-−]?\d+)$/i.exec(t.replace('−', '-')); if (sc) return +sc[1] * Math.pow(10, +sc[2].replace('−', '-'));
    t = t.replace(/[^0-9.\-+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  };
  const SUBD = '₀₁₂₃₄₅₆₇₈₉', SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const FOR = (k) => k.replace(/\d/g, (d) => SUBD[+d]);
  const SUP = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  const fx = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const fT = (v, d) => String(+(+v).toFixed(d == null ? 4 : d));        // 끝의 0을 생략한 소수
  const sci = (v, d) => { if (!isFinite(v) || v === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(v)) + 1e-12), m = v / Math.pow(10, e); return (+m.toFixed(d == null ? 1 : d)) + '×10' + SUP(e); };
  // 평형 상수 값 표시: 0.001 ~ 999 는 소수 / 그 밖은 과학적 표기, 유효 숫자 2개
  function fK(k) {
    if (!isFinite(k)) return '-';
    if (k >= 100) return sci(k, 1);
    if (k >= 10) return String(+k.toPrecision(2));
    if (k >= 0.01) return String(+k.toPrecision(2));
    return String(+k.toPrecision(2));
  }
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* 화면을 A(왼쪽 · 위)와 B(오른쪽 · 아래)로 나누기 */
  function split(fx0, fy0) {
    if (!PHONE) { const wA = Math.round(VW * fx0); return { A: { x: 8, y: 8, w: wA - 12, h: VH - 16 }, B: { x: wA + 4, y: 8, w: VW - wA - 12, h: VH - 16 } }; }
    const hA = Math.round(VH * fy0); return { A: { x: 8, y: 8, w: VW - 16, h: hA - 12 }, B: { x: 8, y: hA + 4, w: VW - 16, h: VH - hA - 12 } };
  }
  /* 그래프 틀: 값 → 화면 좌표, 값은 그려지는 범위 안으로 묶어요 */
  function makePlot(r, o) {
    const padL = o.padL != null ? o.padL : 46, padR = o.padR != null ? o.padR : 14, padT = o.padT != null ? o.padT : 14, padB = o.padB != null ? o.padB : 34;
    const px = r.x + padL, py = r.y + padT, pw = r.w - padL - padR, ph = r.h - padT - padB;
    const P = { px, py, pw, ph, x0: o.x0, x1: o.x1, y0: o.y0, y1: o.y1 };
    P.X = (v) => px + clamp((v - o.x0) / (o.x1 - o.x0), 0, 1) * pw;
    P.Y = (v) => py + ph - clamp((v - o.y0) / (o.y1 - o.y0), 0, 1) * ph;
    P.vx = (sx) => o.x0 + clamp((sx - px) / pw, 0, 1) * (o.x1 - o.x0);
    return P;
  }
  function drawAxes(P, o) {
    ctx.save();
    ctx.fillStyle = '#fff'; D.roundRect(P.px, P.py, P.pw, P.ph, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(120,135,160,.28)'; ctx.lineWidth = 1;
    (o.yticks || []).forEach((v) => { const y = P.Y(v); ctx.beginPath(); ctx.moveTo(P.px, y); ctx.lineTo(P.px + P.pw, y); ctx.stroke(); T(P.px - 6, y + 4.5, (o.yfmt ? o.yfmt(v) : String(v)), 12.5, '#3a465c', 'right', 800); });
    (o.xticks || []).forEach((v) => { const x = P.X(v); ctx.beginPath(); ctx.moveTo(x, P.py); ctx.lineTo(x, P.py + P.ph); ctx.stroke(); T(x, P.py + P.ph + 17, (o.xfmt ? o.xfmt(v) : String(v)), 12.5, '#3a465c', 'center', 800); });
    ctx.strokeStyle = '#8895ab'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(P.px, P.py); ctx.lineTo(P.px, P.py + P.ph); ctx.lineTo(P.px + P.pw, P.py + P.ph); ctx.stroke();
    if (o.xlabel) T(P.px + P.pw, P.py + P.ph + 31, o.xlabel, 12.5, MUTED, 'right', 800);
    if (o.ylabel) T(P.px - 4, P.py - 4, o.ylabel, 12.5, MUTED, 'left', 800);
    ctx.restore();
  }
  function polyline(P, pts, color, w, dash) {
    if (pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); pts.forEach((p, i) => { const x = P.X(p[0]), y = P.Y(p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
  }

  /* 구 모양 원자: 미리 그려 둔 그림을 재사용해 많은 입자도 가볍게 그려요 */
  const spriteCache = {};
  function sprite(color, r) {
    const rq = Math.max(2, Math.round(r * 2) / 2), key = color + '|' + rq;
    let c = spriteCache[key];
    if (!c) {
      const k = 4, s = Math.ceil(rq * 2 * k) + 2;
      c = document.createElement('canvas'); c.width = c.height = s;
      const g = c.getContext('2d'), cx = s / 2, R = rq * k;
      const gr = g.createRadialGradient(cx - R * 0.35, cx - R * 0.4, R * 0.1, cx, cx, R);
      gr.addColorStop(0, C.shade(color, 0.55)); gr.addColorStop(0.55, color); gr.addColorStop(1, C.shade(color, -0.35));
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(cx - R * 0.35, cx - R * 0.45, R * 0.32, R * 0.18, -0.6, 0, TAU); g.fill();
      c.rq = rq; c.k = k; spriteCache[key] = c;
    }
    return c;
  }
  function atom(x, y, r, color, a) {
    const c = sprite(color, r), d = c.width / c.k;
    if (a != null && a < 1) { ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.drawImage(c, x - d / 2, y - d / 2, d, d); ctx.restore(); }
    else ctx.drawImage(c, x - d / 2, y - d / 2, d, d);
  }
  const COL_N = '#3b6cf0', COL_O = '#b9c3d6', COL_TAG = '#ff1f3d';
  /* NO₂ 분자 (굽은 모양): 가운데 N, 양쪽 O */
  function drawNO2(x, y, s, ang, tag, a, scale) {
    const k = scale == null ? 1 : scale; s *= k;
    const o1 = [x + Math.cos(ang + 1.17) * s * 1.05, y + Math.sin(ang + 1.17) * s * 1.05], o2 = [x + Math.cos(ang - 1.17) * s * 1.05, y + Math.sin(ang - 1.17) * s * 1.05];
    ctx.save(); if (a != null) ctx.globalAlpha = a; ctx.strokeStyle = '#7d8aa3'; ctx.lineWidth = Math.max(1.5, s * 0.22); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(o1[0], o1[1]); ctx.lineTo(x, y); ctx.lineTo(o2[0], o2[1]); ctx.stroke(); ctx.restore();
    atom(o1[0], o1[1], s * 0.5, COL_O, a); atom(o2[0], o2[1], s * 0.5, COL_O, a);
    if (tag) { D.glow(x, y, s * 1.5, COL_TAG, 0.55 * (a == null ? 1 : a)); }
    atom(x, y, s * 0.62, tag ? COL_TAG : COL_N, a);
  }
  /* N₂O₄ 분자: 두 개의 N이 이어지고 각 N에 O 두 개 */
  function drawN2O4(x, y, s, ang, tags, a, scale) {
    const k = scale == null ? 1 : scale; s *= k;
    const ca = Math.cos(ang), sa = Math.sin(ang), P = (lx, ly) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
    const n1 = P(-0.55 * s, 0), n2 = P(0.55 * s, 0), os = [P(-1.08 * s, -0.72 * s), P(-1.08 * s, 0.72 * s), P(1.08 * s, -0.72 * s), P(1.08 * s, 0.72 * s)];
    ctx.save(); if (a != null) ctx.globalAlpha = a; ctx.strokeStyle = '#7d8aa3'; ctx.lineWidth = Math.max(1.5, s * 0.22); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(n1[0], n1[1]); ctx.lineTo(n2[0], n2[1]);
    [[n1, os[0]], [n1, os[1]], [n2, os[2]], [n2, os[3]]].forEach((b) => { ctx.moveTo(b[0][0], b[0][1]); ctx.lineTo(b[1][0], b[1][1]); }); ctx.stroke(); ctx.restore();
    os.forEach((o) => atom(o[0], o[1], s * 0.5, COL_O, a));
    [[n1, tags && tags[0]], [n2, tags && tags[1]]].forEach((n) => { if (n[1]) D.glow(n[0][0], n[0][1], s * 1.5, COL_TAG, 0.55 * (a == null ? 1 : a)); atom(n[0][0], n[0][1], s * 0.62, n[1] ? COL_TAG : COL_N, a); });
  }
  /* 물 분자 H₂O: O 하나와 H 둘 */
  function drawH2O(x, y, s, ang, a) {
    const h1 = [x + Math.cos(ang + 0.92) * s * 0.95, y + Math.sin(ang + 0.92) * s * 0.95], h2 = [x + Math.cos(ang - 0.92) * s * 0.95, y + Math.sin(ang - 0.92) * s * 0.95];
    ctx.save(); if (a != null) ctx.globalAlpha = a; ctx.strokeStyle = '#9fb3cf'; ctx.lineWidth = Math.max(1.2, s * 0.2); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(h1[0], h1[1]); ctx.lineTo(x, y); ctx.lineTo(h2[0], h2[1]); ctx.stroke(); ctx.restore();
    atom(h1[0], h1[1], s * 0.38, '#ffffff', a); atom(h2[0], h2[1], s * 0.38, '#ffffff', a); atom(x, y, s * 0.58, '#e2464b', a);
  }
  /* 인터랙션 도우미 */
  function setSel(sel, opts, val) { const e = $(sel); if (!e) return; e.innerHTML = ''; opts.forEach((o) => { const op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; e.appendChild(op); }); if (val != null) e.value = val; }
  function mark2(el, state) { el.classList.remove('ok', 'bad'); if (state) el.classList.add(state); }
  function shake(el) { el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); }

  /* 단조 3차 보간: 자료 점을 모두 지나고 값이 출렁이지 않아요 */
  function makeCurve(xs, ys) {
    const n = xs.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
    }
    return (t) => {
      t = clamp(t, xs[0], xs[n - 1]); let k = 0; while (k < n - 2 && t > xs[k + 1]) k++;
      const h = xs[k + 1] - xs[k], u = (t - xs[k]) / h, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * ys[k] + (u3 - 2 * u2 + u) * h * m[k] + (-2 * u3 + 3 * u2) * ys[k + 1] + (u3 - u2) * h * m[k + 1];
    };
  }

  const FL_SHELL = (cx, by, w, h) => {            // 삼각 플라스크 모양
    const neckW = w * 0.28, neckH = h * 0.32;
    ctx.beginPath(); ctx.moveTo(cx - neckW / 2, by - h); ctx.lineTo(cx - neckW / 2, by - h + neckH); ctx.lineTo(cx - w / 2, by - 8); ctx.quadraticCurveTo(cx - w / 2, by, cx - w / 2 + 10, by);
    ctx.lineTo(cx + w / 2 - 10, by); ctx.quadraticCurveTo(cx + w / 2, by, cx + w / 2, by - 8); ctx.lineTo(cx + neckW / 2, by - h + neckH); ctx.lineTo(cx + neckW / 2, by - h);
  };
  /* 기체가 든 밀봉 플라스크: gas = 갈색 진하기(0~1) */
  function drawFlask(cx, by, w, h, gas, sealed) {
    const neckW = w * 0.28, alpha = 0.04 + 0.76 * clamp(gas, 0, 1);
    D.shadow(() => { FL_SHELL(cx, by, w, h); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }, { blur: 6, y: 3, color: 'rgba(20,40,80,.14)' });
    ctx.save(); FL_SHELL(cx, by, w, h); ctx.closePath(); ctx.clip();
    const gr = ctx.createLinearGradient(cx - w / 2, by - h, cx + w / 2, by); gr.addColorStop(0, 'rgba(190,100,40,' + alpha.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(120,55,15,' + Math.min(0.95, alpha + 0.08).toFixed(3) + ')');
    ctx.fillStyle = gr; ctx.fillRect(cx - w, by - h, w * 2, h + 2); ctx.restore();
    FL_SHELL(cx, by, w, h); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - neckW / 2 + 5, by - h * 0.62); ctx.lineTo(cx - w / 2 + 12, by - 14); ctx.stroke();
    if (sealed) { D.roundRect(cx - neckW / 2 - 4, by - h - 12, neckW + 8, 16, 4); ctx.fillStyle = '#7a8599'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(cx - neckW / 2, by - h - 10, neckW - 4, 3); }
  }
  /* =========================================================
     입자 상자: N₂O₄ ⇌ 2NO₂ 모형 (대표 입자). 좌표는 상자 안의 비율(0~1).
     - 상태는 순반응 진행량 F(연속값). 화면의 분자 수는 N0 − done, M0 + 2·done (done = round(F))
     - 반응 속도: 분해(N₂O₄ → 2NO₂) Rf = a·n, 결합(2NO₂ → N₂O₄) Rr = b·m²  (회/초, 가상 단위)
     - 분해와 결합 장면은 속도에 맞게 계속 일어나요 (평형에서도 짝으로 계속).
     ========================================================= */
  function makeBox(cfg) {
    const B = {
      a: cfg.a, b: cfg.b, N0: cfg.N0, M0: cfg.M0, F: 0, done: 0, accF: 0, accR: 0, t: 0, mols: [], ghosts: [], exits: [],
      lid: !!cfg.lid, lidOpen: false, hops: 0, gate: { c: 0.5, w: 0.3 }, evF: 0, evR: 0, evFcount: 0, evRcount: 0, seq: 0, hist: [], histT: 0,
    };
    const sp = (k) => (k === 'D' ? 0.17 : 0.26);
    function mk(k, u, v, extra) {
      const a = Math.random() * TAU;
      const m = Object.assign({ id: ++B.seq, k, u, v, vu: Math.cos(a) * sp(k), vv: Math.sin(a) * sp(k), ang: Math.random() * TAU, av: rnd(-1.5, 1.5), born: B.t, flash: 0, grow: 1, tag: false, tags: [false, false], trail: [] }, extra || {});
      B.mols.push(m); return m;
    }
    B.mk = mk;
    B.count = () => { let n = 0, m = 0; B.mols.forEach((o) => { if (o.k === 'D') n++; else m++; }); B.nD = n; B.nM = m; };
    B.reset = function (c) {
      Object.assign(B, { a: c.a != null ? c.a : B.a, b: c.b != null ? c.b : B.b, N0: c.N0, M0: c.M0, F: 0, done: 0, accF: 0, accR: 0, t: 0, ghosts: [], exits: [], hops: 0, evF: 0, evR: 0, evFcount: 0, evRcount: 0, hist: [], histT: 0, lidOpen: false, rt: 0 });
      B.mols = [];
      for (let i = 0; i < B.N0; i++) mk('D', rnd(0.08, 0.92), rnd(0.08, 0.92));
      for (let i = 0; i < B.M0; i++) mk('M', rnd(0.08, 0.92), rnd(0.08, 0.92));
      B.count();
    };
    /* 지금 이 순간의 상태(화면의 분자 수로 계산한 속도) */
    B.rates = () => ({ Rf: B.a * B.nD, Rr: B.b * B.nM * B.nM });
    B.rebase = function (newA, newB) { B.count(); B.N0 = B.nD; B.M0 = B.nM; B.F = 0; B.done = 0; B.accF = 0; B.accR = 0; if (newA != null) B.a = newA; if (newB != null) B.b = newB; };
    B.eq = () => { const r = B.rates(); return Math.abs(r.Rf - r.Rr) < 0.05; };
    function pickD() { const c = B.mols.filter((o) => o.k === 'D'); if (!c.length) return null; const old = c.filter((o) => B.t - o.born > 0.5); const l = old.length ? old : c; return l[Math.floor(Math.random() * l.length)]; }
    function dissoc() {
      const d = pickD(); if (!d) return false;
      B.mols.splice(B.mols.indexOf(d), 1);
      const dx = Math.cos(d.ang) * 0.03, dy = Math.sin(d.ang) * 0.03;
      const swap = Math.random() < 0.5, t = swap ? [d.tags[1], d.tags[0]] : d.tags;
      const m1 = mk('M', clamp(d.u - dx, 0.04, 0.96), clamp(d.v - dy, 0.04, 0.96), { tag: t[0], flash: 1, vu: -Math.cos(d.ang) * 0.3, vv: -Math.sin(d.ang) * 0.3, trail: t[0] ? d.trail.slice() : [] });
      const m2 = mk('M', clamp(d.u + dx, 0.04, 0.96), clamp(d.v + dy, 0.04, 0.96), { tag: t[1], flash: 1, vu: Math.cos(d.ang) * 0.3, vv: Math.sin(d.ang) * 0.3, trail: t[1] ? d.trail.slice() : [] });
      if (m1.tag) B.hops++; if (m2.tag) B.hops++;
      B.done++; B.evF = 1; B.evFcount++; B.count(); return true;
    }
    function assoc() {
      const ms = B.mols.filter((o) => o.k === 'M'); if (ms.length < 2) return false;
      const old = ms.filter((o) => B.t - o.born > 0.5), pool = old.length >= 2 ? old : ms;
      const m1 = pool[Math.floor(Math.random() * pool.length)];
      let m2 = null, bd = 9; pool.forEach((o) => { if (o !== m1) { const d = Math.hypot(o.u - m1.u, o.v - m1.v); if (d < bd) { bd = d; m2 = o; } } });
      if (!m2) return false;
      const u = (m1.u + m2.u) / 2, v = (m1.v + m2.v) / 2;
      B.mols.splice(B.mols.indexOf(m1), 1); B.mols.splice(B.mols.indexOf(m2), 1);
      B.ghosts.push({ k: 'M', u: m1.u, v: m1.v, tu: u, tv: v, ang: m1.ang, tag: m1.tag, p: 0 }, { k: 'M', u: m2.u, v: m2.v, tu: u, tv: v, ang: m2.ang, tag: m2.tag, p: 0 });
      const d = mk('D', u, v, { tags: [m1.tag, m2.tag], flash: 1, grow: 0.2, trail: (m1.tag ? m1.trail : m2.tag ? m2.trail : []) });
      if (m1.tag) B.hops++; if (m2.tag) B.hops++;
      B.done--; B.evR = 1; B.evRcount++; B.count(); return true;
    }
    B.dissoc = dissoc; B.assoc = assoc;
    B.tagStart = function (n) {
      B.mols.forEach((o) => { o.tag = false; o.tags = [false, false]; o.trail = []; });
      const ds = B.mols.filter((o) => o.k === 'D'); for (let i = ds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ds[i], ds[j]] = [ds[j], ds[i]]; }
      ds.slice(0, n).forEach((o) => { o.tags[Math.random() < 0.5 ? 0 : 1] = true; });
      B.hops = 0;
    };
    B.tagCount = () => { let inD = 0, inM = 0; B.mols.forEach((o) => { if (o.k === 'D') inD += (o.tags[0] ? 1 : 0) + (o.tags[1] ? 1 : 0); else if (o.tag) inM++; }); return { inD, inM }; };
    B.step = function (dt, running, tagOn) {
      B.t += dt;
      const g = B.gate;
      B.mols.forEach((o) => {
        // 부드러운 방향 변화와 일정한 빠르기
        const j = (RM ? 0.4 : 1.2) * dt, c = Math.cos(rnd(-j, j)), s = Math.sin(rnd(-j, j));
        const vu = o.vu * c - o.vv * s, vv = o.vu * s + o.vv * c, sc = sp(o.k) / (Math.hypot(vu, vv) || 1);
        o.vu = vu * sc; o.vv = vv * sc;
        o.u += o.vu * dt; o.v += o.vv * dt; o.ang += o.av * dt;
        const m = 0.045;
        if (o.u < m) { o.u = m; o.vu = Math.abs(o.vu); } else if (o.u > 1 - m) { o.u = 1 - m; o.vu = -Math.abs(o.vu); }
        if (o.v > 1 - m) { o.v = 1 - m; o.vv = -Math.abs(o.vv); }
        if (o.v < m) {
          if (B.lidOpen && Math.abs(o.u - g.c) < g.w / 2 - 0.02) { B.exits.push({ k: o.k, u: o.u, v: 0, vu: o.vu * 0.4, vv: -0.6, ang: o.ang, tags: o.tags.slice(), tag: o.tag, age: 0 }); if (o.k === 'D') B.N0--; else B.M0--; o.gone = true; }
          else { o.v = m; o.vv = Math.abs(o.vv); }
        }
        if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 2.4);
        if (o.grow < 1) o.grow = Math.min(1, o.grow + dt * 4);
        if (tagOn && (o.tag || o.tags[0] || o.tags[1])) { o.trail.push([o.u, o.v]); if (o.trail.length > 26) o.trail.shift(); } else if (o.trail.length) o.trail.length = 0;
      });
      B.mols = B.mols.filter((o) => !o.gone);
      B.ghosts.forEach((q) => { q.p += dt * 4; }); B.ghosts = B.ghosts.filter((q) => q.p < 1);
      B.exits.forEach((q) => { q.age += dt; q.u += q.vu * dt; q.v += q.vv * dt; }); B.exits = B.exits.filter((q) => q.age < 0.9);
      B.evF = Math.max(0, B.evF - dt * 3); B.evR = Math.max(0, B.evR - dt * 3);
      B.count();
      if (running) {
        B.rt += dt;
        // 연속 상태 F를 조금씩 나누어 적분
        const n = Math.max(1, Math.ceil(dt / 0.005)), h = dt / n;
        for (let i = 0; i < n; i++) {
          const nn = Math.max(0, B.N0 - B.F), mm = Math.max(0, B.M0 + 2 * B.F), Rf = B.a * nn, Rr = B.b * mm * mm;
          B.F += (Rf - Rr) * h; B.accF += Rf * h; B.accR += Rr * h;
        }
        const f = Math.floor(B.accF), r = Math.floor(B.accR); B.accF -= f; B.accR -= r;
        for (let i = 0; i < Math.max(f, r); i++) { if (i < f) dissoc(); if (i < r) assoc(); }
        let guard = 0;
        while (B.done < Math.round(B.F) && guard++ < 40) { if (!dissoc()) break; }
        while (B.done > Math.round(B.F) && guard++ < 80) { if (!assoc()) break; }
        B.histT += dt;
        if (B.histT >= 0.05) { B.histT = 0; B.hist.push({ t: B.rt, Rf: B.a * Math.max(0, B.N0 - B.F), Rr: B.b * Math.pow(Math.max(0, B.M0 + 2 * B.F), 2), n: B.nD, m: B.nM, nC: Math.max(0, B.N0 - B.F), mC: Math.max(0, B.M0 + 2 * B.F) }); if (B.hist.length > 4000) B.hist.shift(); }
      }
    };
    /* 그리기: 상자 영역 r = {x, y, w, h}. 크기는 가로 기준으로 정해요 */
    B.draw = function (r, o) {
      o = o || {};
      const s = o.s || r.w * 0.034;
      // 용기
      const tint = clamp(B.nM / (o.maxM || 120), 0, 1);
      ctx.save();
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#fbfcfe'; ctx.fill(); }, { blur: 8, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = 'rgba(166,90,42,' + (0.62 * tint).toFixed(3) + ')'; ctx.fill();
      ctx.restore();
      ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.clip();
      const X = (u) => r.x + u * r.w, Y = (v) => r.y + v * r.h;
      // 표지 원자 꼬리
      if (o.tagOn) B.mols.forEach((m) => { if (m.trail.length > 2 && (m.tag || m.tags[0] || m.tags[1])) { ctx.strokeStyle = 'rgba(255,31,61,.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); m.trail.forEach((p, i) => { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.stroke(); } });
      B.ghosts.forEach((q) => { const e = easeOut(q.p); drawNO2(X(q.u + (q.tu - q.u) * e), Y(q.v + (q.tv - q.v) * e), s, q.ang, o.tagOn && q.tag, 1 - q.p, 1); });
      B.mols.forEach((m) => {
        const x = X(m.u), y = Y(m.v), sc = m.grow;
        if (m.flash > 0.02) D.glow(x, y, s * 3.2, '#ffd447', 0.75 * m.flash);
        if (m.k === 'D') drawN2O4(x, y, s, m.ang, o.tagOn ? m.tags : null, null, sc); else drawNO2(x, y, s, m.ang, o.tagOn && m.tag, null, sc);
      });
      ctx.restore();
      // 유리 테두리와 마개(또는 열린 입구)
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      if (B.lid) {
        const gx0 = r.x + (B.gate.c - B.gate.w / 2) * r.w, gw = B.gate.w * r.w;
        ctx.fillStyle = B.lidOpen ? '#fbfcfe' : '#9aa5b8';
        if (B.lidOpen) { ctx.save(); ctx.fillStyle = BGC; ctx.fillRect(gx0, r.y - 5, gw, 10); ctx.restore(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx0, r.y - 14); ctx.lineTo(gx0, r.y); ctx.moveTo(gx0 + gw, r.y - 14); ctx.lineTo(gx0 + gw, r.y); ctx.stroke(); }
        else { D.roundRect(gx0, r.y - 9, gw, 12, 4); ctx.fillStyle = '#7a8599'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(gx0 + 4, r.y - 7, gw - 8, 3); }
        B.exits.forEach((q) => { const a = 1 - q.age / 0.9; const x = X(q.u), y = r.y - 6 - q.age * 70; if (q.k === 'D') drawN2O4(x, y, s, q.ang, null, a); else drawNO2(x, y, s, q.ang, false, a); });
      }
    };
    B.reset(cfg);
    return B;
  }
  /* ---------- 자료 (일정한 온도, 밀봉 용기) ---------- */
  const T6 = [0, 10, 20, 30, 40, 50, 60];
  const DA_N = [0.0300, 0.0265, 0.0250, 0.0243, 0.0240, 0.0240, 0.0240], DA_M = [0, 0.0070, 0.0100, 0.0114, 0.0120, 0.0120, 0.0120];    // ㉠ N₂O₄ 0.030 mol/L만
  const DB_N = [0, 0.0205, 0.0230, 0.0237, 0.0240, 0.0240, 0.0240], DB_M = [0.0600, 0.0190, 0.0140, 0.0126, 0.0120, 0.0120, 0.0120];    // ㉡ NO₂ 0.060 mol/L만
  const cAN = makeCurve(T6, DA_N), cAM = makeCurve(T6, DA_M), cBN = makeCurve(T6, DB_N), cBM = makeCurve(T6, DB_M);
  const EQ_N = 0.024, EQ_M = 0.012, SPEED = 6;
  const PU = 0.0003;                                   // 모형 입자 1개 = 0.0003 mol/L (100개 = 0.030 mol/L)
  const KA = 0.1, KB = 0.005;                          // 정반응 속도 = 0.1 × N₂O₄ 수, 역반응 속도 = 0.005 × (NO₂ 수)²   (회/초, 가상 단위)
  const T_END = 12;                                    // 속도 그래프의 모형 시간 (초)
  const MATCH = ['용해 속도 = 석출 속도', '증발 속도 = 응결 속도', '정반응 속도 = 역반응 속도'];

  const SPL = split(0.6, 0.5);
  const S = {
    mode: 'conc', t: 0, fade: 0, gate: '',
    cc: { A: { ts: 0, run: false }, B: { ts: 0, run: false }, cur: -1, ptsA: [], ptsB: [] },
    md: { run: false, eqT: 0, stamp: 0 },
    rt: { run: false, done: false, marker: -1, openRun: false, triedOpen: false, drag: false },
    tg: { sel: ['', '', ''] },
    cond: { cl: '', te: '' },
  };
  let game = null;
  const BX = makeBox({ N0: 100, M0: 0, a: KA, b: KB, lid: true });
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { conc: '📈 농도 일정', model: '🧩 분자 세기', rate: '📊 속도 그래프', tag: '🔴 동적 평형' };

  function resetModel() { BX.reset({ N0: 100, M0: 0 }); BX.lidOpen = false; S.md.run = false; S.md.eqT = 0; S.md.stamp = 0; }
  function resetRate() { BX.reset({ N0: 100, M0: 0 }); BX.lidOpen = false; Object.assign(S.rt, { run: false, done: false, marker: -1, openRun: false }); }
  function resetTag() { BX.reset({ N0: 80, M0: 40 }); BX.lidOpen = false; BX.tagStart(5); }
  function resetConc() { S.cc.A = { ts: 0, run: false }; S.cc.B = { ts: 0, run: false }; S.cc.ptsA = []; S.cc.ptsB = []; S.cc.cur = -1; }
  function setScene(mode) {
    if (S.mode !== mode) {
      S.fade = 1; parts.clear();
      if (mode === 'model') resetModel(); else if (mode === 'rate') resetRate(); else if (mode === 'tag') resetTag();
    }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#bRunA').disabled = S.cc.A.run; $('#bRunB').disabled = S.cc.B.run;
    $('#bRunA').textContent = S.cc.A.ts >= 60 ? '✔ ㉠ 기록함' : S.cc.A.run ? '기록하는 중…' : '▶ ㉠ N₂O₄만';
    $('#bRunB').textContent = S.cc.B.ts >= 60 ? '✔ ㉡ 기록함' : S.cc.B.run ? '기록하는 중…' : '▶ ㉡ NO₂만';
    const run = S.mode === 'rate' ? S.rt.run : S.md.run;
    $('#bGo').disabled = run || (S.mode === 'rate' && S.rt.done);
    $('#bGo').textContent = run ? '반응하는 중…' : S.mode === 'rate' && S.rt.done ? '✔ 기록 완료' : '▶ 반응 시작';
    $('#bLid').textContent = BX.lidOpen ? '🔒 뚜껑 닫기' : '🔓 뚜껑 열기';
    $('#goNote').textContent = S.mode === 'rate' ? '그래프는 모형 시간 ' + T_END + '초까지 그려져요. 뚜껑을 열고 닫으며 비교해 보세요.' : 'N₂O₄ 100개로 시작해요. 모형의 시간은 실제보다 빨리 흘러요.';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  setSel('#selCl', [['', '고르세요'], ['closed', '닫힌 용기'], ['open', '열린 용기']]);
  setSel('#selTe', [['', '고르세요'], ['const', '일정한 온도'], ['vary', '온도가 계속 변함']]);
  [0, 1, 2].forEach((i) => { setSel('#mt' + i, [['', '고르세요']].concat(MATCH.map((m, k) => [String(k), m]))); $('#mt' + i).addEventListener('change', (e) => { S.tg.sel[i] = e.target.value; mark2(e.target, ''); }); });
  $('#selCl').addEventListener('change', (e) => { S.cond.cl = e.target.value; mark2(e.target, ''); });
  $('#selTe').addEventListener('change', (e) => { S.cond.te = e.target.value; mark2(e.target, ''); });
  ['eqN', 'eqM'].forEach((id) => $('#' + id).addEventListener('input', (e) => mark2(e.target, '')));

  /* ================= ① 농도 일정 ================= */
  function ccRun(k) { const r = S.cc[k]; if (r.run || r.ts >= 60) return; Sound.click(); r.run = true; if (!(k === 'A' ? S.cc.ptsA : S.cc.ptsB).length) (k === 'A' ? S.cc.ptsA : S.cc.ptsB).push(0); updateCtl(); }
  $('#bRunA').addEventListener('click', () => ccRun('A')); $('#bRunB').addEventListener('click', () => ccRun('B'));
  $('#bClr').addEventListener('click', () => { Sound.click(); resetConc(); updateCtl(); });
  function stepCc(dt) {
    ['A', 'B'].forEach((k) => {
      const r = S.cc[k]; if (!r.run) return;
      r.ts = Math.min(60, r.ts + dt * SPEED); const arr = k === 'A' ? S.cc.ptsA : S.cc.ptsB;
      if (r.ts - arr[arr.length - 1] >= 0.5 || r.ts >= 60) arr.push(r.ts);
      if (r.ts >= 60) { r.run = false; Sound.success(); updateCtl(); if (!RM) parts.burst(SPL.A.x + SPL.A.w * (k === 'A' ? 0.28 : 0.72), SPL.A.y + SPL.A.h * 0.35, { count: 12, colors: ['#a65a2a', '#3867f4', '#ffd447'] }); }
    });
  }
  const valAt = (k, t) => (k === 'A' ? { n: cAN(t), m: cAM(t) } : { n: cBN(t), m: cBM(t) });
  function drawConcA(r) {
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4'); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill();
    T(r.x + 14, r.y + 26, '🧪 일정한 온도의 밀봉 플라스크 두 개', PHONE ? 15 : 16, INK, 'left', 800);
    const tableY = r.y + r.h - Math.max(60, r.h * 0.17); ctx.fillStyle = '#c9d1e2'; ctx.fillRect(r.x, tableY, r.w, r.y + r.h - tableY); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(r.x, tableY, r.w, 3);
    const fw = Math.min(150, r.w * 0.3), fh = Math.min(210, r.h * 0.42);
    [['A', r.x + r.w * 0.27, '㉠ N₂O₄ 0.030 mol/L만', cAM], ['B', r.x + r.w * 0.73, '㉡ NO₂ 0.060 mol/L만', cBM]].forEach(([k, cx, name, cur]) => {
      const ts = S.cc[k].ts, v = valAt(k, ts), gas = v.m / 0.06;
      drawFlask(cx, tableY - 4, fw, fh, gas, true);
      T(cx, tableY + 22, name, PHONE ? 13 : 14, INK, 'center', 800);
      T(cx, tableY + 42, 't = ' + Math.floor(ts) + ' 초', 14, MUTED, 'center', 800);
      T(cx, tableY + 62, '[N₂O₄] ' + fx(v.n, 4), 13, '#1d3fb8', 'center', 800);
      T(cx, tableY + 80, '[NO₂] ' + fx(v.m, 4), 13, BRN, 'center', 800);
      void cur;
    });
    const doneBoth = S.cc.A.ts >= 60 && S.cc.B.ts >= 60;
    if (doneBoth) D.label(r.x + r.w / 2, r.y + 60, '같은 색, 같은 농도로 모여요!', { bg: '#14a058', size: 14 });
  }
  function concPlot(r) { return makePlot({ x: r.x, y: r.y + 62, w: r.w, h: r.h - 112 }, { x0: 0, x1: 60, y0: 0, y1: 0.064, padL: 56, padR: 14, padT: 6, padB: 36 }); }
  function drawConcB(r) {
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '시간–농도 그래프', 14, MUTED, 'left', 800);
    // 범례
    const lg = [['#3867f4', '[N₂O₄]', false], ['#a65a2a', '[NO₂]', false], ['#3867f4', '㉡', true], ['#a65a2a', '㉡', true]];
    ctx.save(); ctx.lineWidth = 3;
    [['#3867f4', '[N₂O₄]'], ['#a65a2a', '[NO₂]']].forEach((l, i) => { const x = r.x + 14 + i * 92; ctx.strokeStyle = l[0]; ctx.beginPath(); ctx.moveTo(x, r.y + 44); ctx.lineTo(x + 22, r.y + 44); ctx.stroke(); T(x + 27, r.y + 49, l[1], 12.5, INK, 'left', 800); });
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#6b7488'; ctx.beginPath(); ctx.moveTo(r.x + r.w - 142, r.y + 44); ctx.lineTo(r.x + r.w - 120, r.y + 44); ctx.stroke(); ctx.restore();
    T(r.x + r.w - 114, r.y + 49, '㉡ (점선)', 12.5, INK, 'left', 800);
    void lg;
    const P = concPlot(r);
    drawAxes(P, { xticks: [0, 10, 20, 30, 40, 50, 60], yticks: [0, 0.02, 0.04, 0.06], yfmt: (v) => v.toFixed(2), xlabel: '시간 (초)', ylabel: 'mol/L' });
    const both = S.cc.A.ts >= 60 && S.cc.B.ts >= 60;
    if (both) { ctx.save(); ctx.strokeStyle = 'rgba(20,160,88,.7)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; [EQ_N, EQ_M].forEach((v) => { ctx.beginPath(); ctx.moveTo(P.px, P.Y(v)); ctx.lineTo(P.px + P.pw, P.Y(v)); ctx.stroke(); }); ctx.restore(); T(P.px + P.pw - 4, P.Y(EQ_N) - 5, '0.024', 12.5, '#0b6b39', 'right', 800); T(P.px + P.pw - 4, P.Y(EQ_M) + 15, '0.012', 12.5, '#0b6b39', 'right', 800); }
    const ser = (arr, f, col, dash) => polyline(P, arr.map((t) => [t, f(t)]), col, 3.2, dash);
    ser(S.cc.ptsA, cAN, '#3867f4'); ser(S.cc.ptsA, cAM, '#a65a2a'); ser(S.cc.ptsB, cBN, '#3867f4', [6, 5]); ser(S.cc.ptsB, cBM, '#a65a2a', [6, 5]);
    [['A', cAN, cAM], ['B', cBN, cBM]].forEach(([k, fn, fm]) => { const ts = S.cc[k].ts; if (ts > 0 || S.cc[k].run) { atom(P.X(ts), P.Y(fn(ts)), 5.5, '#3867f4'); atom(P.X(ts), P.Y(fm(ts)), 5.5, '#a65a2a'); } });
    // 읽기 선
    const cu = S.cc.cur;
    if (cu >= 0) {
      const x = P.X(cu); ctx.save(); ctx.strokeStyle = 'rgba(27,35,51,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, P.py); ctx.lineTo(x, P.py + P.ph); ctx.stroke(); ctx.restore();
      const lines = ['t = ' + fx(cu, 0) + ' 초']; [['A', cAN, cAM, '㉠'], ['B', cBN, cBM, '㉡']].forEach(([k, fn, fm, nm]) => { if (S.cc[k].ts >= cu && (S.cc[k].ts > 0)) lines.push(nm + ' N₂O₄ ' + fx(fn(cu), 4) + ' · NO₂ ' + fx(fm(cu), 4)); });
      const bw = PHONE ? 232 : 214, bx = clamp(x + 8, P.px + 2, P.px + P.pw - bw - 2), by = P.py + P.ph * 0.36;
      D.roundRect(bx, by, bw, 20 + lines.length * 17, 8); ctx.fillStyle = 'rgba(27,35,51,.9)'; ctx.fill(); lines.forEach((l, i) => T(bx + 8, by + 17 + i * 17, l, 12.5, '#fff', 'left', 800));
    } else if (S.cc.A.ts > 0 || S.cc.B.ts > 0) T(P.px + P.pw / 2, P.py + P.ph * 0.5, '그래프를 눌러 농도를 읽어요', 13.5, MUTED, 'center', 800, { alpha: 0.8 });
    const msg = both ? '출발 물질이 달라도 40초 뒤에는 [N₂O₄] 0.024, [NO₂] 0.012 mol/L로 일정해져요.' : '▶ ㉠, ▶ ㉡ 을 눌러 두 가지 출발을 기록해요.';
    textBlock(r.x + 14, r.y + r.h - 40, r.w - 28, msg, 13.5, INK, 17, 800);
  }
  /* ================= ② 분자 세기 / ③ 속도 그래프 / ④ 동적 평형: 공통 ================= */
  function bgPanel(r) { const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4'); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill(); }
  function legend(x, y, tag) {
    drawNO2(x + 6, y, 4.5, 0, false); T(x + 24, y + 5, 'NO₂', 13, INK, 'left', 800);
    drawN2O4(x + 82, y, 4.5, 0, null); T(x + 104, y + 5, 'N₂O₄', 13, INK, 'left', 800);
    if (tag) { atom(x + 168, y, 5.5, COL_TAG); T(x + 178, y + 5, '표시한 N', 13, INK, 'left', 800); }
    else { atom(x + 168, y, 4.5, COL_N); T(x + 177, y + 5, 'N', 13, INK, 'left', 800); atom(x + 202, y, 4.2, COL_O); T(x + 211, y + 5, 'O', 13, INK, 'left', 800); }
  }
  const eqShow = () => BX.eq();
  function stepMol(dt) {
    const run = S.mode === 'rate' ? S.rt.run : S.mode === 'model' ? S.md.run : S.mode === 'tag';
    BX.step(dt, run, S.mode === 'tag');
    if (S.mode === 'model') { S.md.eqT = eqShow() && S.md.run ? S.md.eqT + dt : 0; S.md.stamp = SciSim.approach(S.md.stamp, S.md.eqT > 1.0 ? 1 : 0, dt, 6); }
    if (S.mode === 'rate' && S.rt.run) {
      if (BX.lidOpen) S.rt.openRun = true;
      if (S.rt.openRun && BX.rt >= 6) S.rt.triedOpen = true;
      if (BX.rt >= T_END) { S.rt.run = false; S.rt.done = true; if (S.rt.openRun) S.rt.triedOpen = true; Sound.success(); updateCtl(); }
    }
  }
  function goRun() { Sound.click(); if (S.mode === 'rate') { if (S.rt.done) return; S.rt.run = true; if (BX.lidOpen) S.rt.openRun = true; } else S.md.run = true; updateCtl(); }
  $('#bGo').addEventListener('click', goRun);
  $('#bBack').addEventListener('click', () => { Sound.click(); if (S.mode === 'rate') resetRate(); else resetModel(); updateCtl(); });
  $('#bLid').addEventListener('click', () => { Sound.click(); BX.lidOpen = !BX.lidOpen; if (BX.lidOpen && S.rt.run) S.rt.openRun = true; if (BX.lidOpen && !S.rt.run && BX.rt === 0) S.rt.openRun = true; if (!BX.lidOpen && !S.rt.run && BX.rt === 0) S.rt.openRun = false; updateCtl(); });
  $('#bTagNew').addEventListener('click', () => { Sound.click(); BX.tagStart(5); });

  /* ----- ② 분자 세기 ----- */
  const conc = (n) => fx(n * PU, 4);
  function bar(x, y, w, h, f, col, label, val) {
    T(x, y - 6, label, 13.5, INK, 'left', 800); T(x + w, y - 6, val, 13.5, col, 'right', 800);
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#eef0f6'; ctx.fill();
    ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(f, 0, 1), h); ctx.restore();
  }
  function drawModelA(r) {
    bgPanel(r);
    T(r.x + 14, r.y + 26, '🔍 밀폐 용기 속 입자 모형 (대표 입자 100개)', PHONE ? 14.5 : 16, INK, 'left', 800);
    const br = { x: r.x + 12, y: r.y + 42, w: r.w - 24, h: r.h - 82 };
    BX.draw(br, { s: Math.max(6.5, br.w * 0.021), tagOn: false, maxM: 90 });
    legend(r.x + 18, r.y + r.h - 20, false);
    T(r.x + r.w - 14, r.y + r.h - 15, 'N₂O₄ ' + BX.nD + '개 · NO₂ ' + BX.nM + '개', 14, INK, 'right', 800);
  }
  function arrowPair(cx, y, w, litF, litB, labF, labB) {
    const cF = C.mix('#9aa5b8', '#e2464b', clamp(litF, 0, 1)), cB = C.mix('#9aa5b8', '#3867f4', clamp(litB, 0, 1));
    D.arrow(cx - w / 2, y - 6, cx + w / 2, y - 6, { color: cF, width: 3 + 2.5 * litF, head: 12 }); D.arrow(cx + w / 2, y + 8, cx - w / 2, y + 8, { color: cB, width: 3 + 2.5 * litB, head: 12 });
    if (labF) T(cx, y - 18, labF, 13, litF > 0.3 ? '#b4231f' : MUTED, 'center', 800); if (labB) T(cx, y + 28, labB, 13, litB > 0.3 ? '#1d3fb8' : MUTED, 'center', 800);
  }
  function drawModelB(r) {
    const rt = BX.rates(), eq = eqShow();
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, 'N₂O₄ ⇌ 2NO₂', 15, INK, 'left', 800);
    T(r.x + r.w - 14, r.y + 24, '모형 시간 ' + fx(BX.rt, 1) + ' 초', 13.5, MUTED, 'right', 800);
    const bx = r.x + 16, bw = r.w - 32;
    bar(bx, r.y + 62, bw, 13, BX.nD / 100, '#3867f4', 'N₂O₄ 분자', BX.nD + '개');
    bar(bx, r.y + 100, bw, 13, BX.nM / 100, BRN, 'NO₂ 분자', BX.nM + '개');
    T(bx, r.y + 138, '초당 반응 횟수 (가상 단위)', 13, MUTED, 'left', 800);
    bar(bx, r.y + 168, bw, 15, rt.Rf / 10, '#e2464b', '정반응 N₂O₄ → 2NO₂', fx(rt.Rf, 1) + ' 회/초');
    bar(bx, r.y + 208, bw, 15, rt.Rr / 10, '#3867f4', '역반응 2NO₂ → N₂O₄', fx(rt.Rr, 1) + ' 회/초');
    arrowPair(r.x + r.w / 2, r.y + 262, 90, BX.evF, BX.evR, '정반응', '역반응');
    const msg = !S.md.run && BX.rt === 0 ? '▶ 반응 시작을 눌러 보세요. 처음에는 N₂O₄만 있어서 역반응이 일어나지 않아요.' : eq ? '정반응 속도 = 역반응 속도 (' + fx(rt.Rf, 1) + ' = ' + fx(rt.Rr, 1) + ')' : rt.Rf > rt.Rr ? '정반응이 더 많아서 NO₂가 늘어나고 있어요.' : '역반응이 더 많아요.';
    textBlock(r.x + 16, r.y + 306, r.w - 32, msg, 14, eq ? '#0b6b39' : INK, 18, 800);
    if (S.md.stamp > 0.02) { ctx.save(); ctx.translate(r.x + r.w - 62, r.y + r.h - 56); ctx.rotate(-0.2); const sc = 0.6 + 0.4 * S.md.stamp; ctx.scale(sc, sc); ctx.globalAlpha = S.md.stamp; ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3; D.roundRect(-44, -20, 88, 40, 10); ctx.stroke(); T(0, 7, '⚖️ 평형', 18, '#0b6b39', 'center', 800); ctx.restore(); }
  }

  /* ----- ③ 속도 그래프 ----- */
  function rateLayout() {
    const A = SPL.A, boxH = PHONE ? 118 : 196;
    return { box: { x: A.x + 12, y: A.y + 34, w: A.w - 24, h: boxH }, rate: { x: A.x, y: A.y + 34 + boxH + 6, w: A.w, h: A.h - 34 - boxH - 6 } };
  }
  function ratePlot() { return makePlot(rateLayout().rate, { x0: 0, x1: T_END, y0: 0, y1: 12, padL: 40, padR: 14, padT: 26, padB: 34 }); }
  function histAt(t) { const h = BX.hist; if (!h.length) return null; let b = h[0], bd = 1e9; h.forEach((q) => { const d = Math.abs(q.t - t); if (d < bd) { bd = d; b = q; } }); return b; }
  function tStar() { const h = BX.hist; for (let i = 0; i < h.length; i++) if (Math.abs(h[i].Rf - h[i].Rr) < 0.3 && h[i].t > 0.5) return h[i].t; return null; }
  function drawRateA(r) {
    const L = rateLayout();
    bgPanel(r);
    T(r.x + 14, r.y + 25, '🔍 입자 모형' + (BX.lidOpen ? ' (뚜껑 열림)' : ' (닫힌 용기)'), PHONE ? 14.5 : 16, INK, 'left', 800);
    BX.draw({ x: L.box.x, y: L.box.y + 8, w: L.box.w, h: L.box.h - 8 }, { s: Math.max(5, L.box.w * (PHONE ? 0.016 : 0.0165)), tagOn: false, maxM: 90 });
    // 속도 그래프
    const R = L.rate; panel(R.x + 8, R.y, R.w - 16, R.h, 12, '#fff');
    const P = ratePlot();
    T(R.x + 18, R.y + 20, '시간–속도 그래프 (회/초)', 13.5, MUTED, 'left', 800);
    drawAxes(P, { xticks: [0, 2, 4, 6, 8, 10, 12], yticks: [0, 4, 8, 12], xlabel: '모형 시간 (초)' });
    const h = BX.hist, pf = h.map((q) => [q.t, q.Rf]), pr = h.map((q) => [q.t, q.Rr]);
    polyline(P, pf, '#e2464b', 3.2); polyline(P, pr, '#3867f4', 3.2);
    if (h.length) { const q = h[h.length - 1]; atom(P.X(q.t), P.Y(q.Rf), 5, '#e2464b'); atom(P.X(q.t), P.Y(q.Rr), 5, '#3867f4'); }
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(P.px + P.pw - 150, R.y + 17); ctx.lineTo(P.px + P.pw - 130, R.y + 17); ctx.stroke(); ctx.strokeStyle = '#3867f4'; ctx.beginPath(); ctx.moveTo(P.px + P.pw - 74, R.y + 17); ctx.lineTo(P.px + P.pw - 54, R.y + 17); ctx.stroke(); ctx.restore();
    T(P.px + P.pw - 126, R.y + 21, '정반응', 12.5, INK, 'left', 800); T(P.px + P.pw - 50, R.y + 21, '역반응', 12.5, INK, 'left', 800);
    const m = S.rt.marker;
    if (m >= 0) {
      const x = P.X(m); ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, P.py); ctx.lineTo(x, P.py + P.ph); ctx.stroke(); ctx.restore();
      const q = histAt(m); if (q) { D.label(clamp(x, P.px + 70, P.px + P.pw - 70), P.py + P.ph * 0.5, 't = ' + fx(m, 1) + '초 · 차 ' + fx(Math.abs(q.Rf - q.Rr), 1), { bg: '#7c3aed', size: 12.5 }); }
    } else if (h.length > 20 && S.rt.done && !S.rt.openRun) T(P.px + P.pw / 2, P.py + P.ph * 0.56, '두 선이 만나는 곳을 눌러 표시해요', 13, MUTED, 'center', 800);
  }
  function drawRateB(r) {
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '시간–농도 그래프', 14, MUTED, 'left', 800);
    const P = makePlot({ x: r.x, y: r.y + 52, w: r.w, h: r.h - 150 }, { x0: 0, x1: T_END, y0: 0, y1: 0.032, padL: 56, padR: 14, padT: 6, padB: 36 });
    drawAxes(P, { xticks: [0, 2, 4, 6, 8, 10, 12], yticks: [0, 0.008, 0.016, 0.024, 0.032], yfmt: (v) => v.toFixed(3), xlabel: '모형 시간 (초)', ylabel: 'mol/L' });
    const h = BX.hist;
    polyline(P, h.map((q) => [q.t, q.nC * PU]), '#3867f4', 3.2); polyline(P, h.map((q) => [q.t, q.mC * PU]), BRN, 3.2);
    if (h.length) { const q = h[h.length - 1]; atom(P.X(q.t), P.Y(q.nC * PU), 5, '#3867f4'); atom(P.X(q.t), P.Y(q.mC * PU), 5, BRN); }
    T(P.px + P.pw - 4, P.py + 14, '[N₂O₄]', 12.5, '#1d3fb8', 'right', 800); T(P.px + P.pw - 4, P.py + 30, '[NO₂]', 12.5, BRN, 'right', 800);
    const ts = tStar();
    if (ts != null && !S.rt.openRun) { const x = P.X(ts); ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.6)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, P.py); ctx.lineTo(x, P.py + P.ph); ctx.stroke(); ctx.restore(); T(x + 5, P.py + P.ph - 8, '속도가 같아진 때', 12.5, '#5b21b6', 'left', 800); }
    const msg = S.rt.openRun && (S.rt.done || BX.rt > 3) ? '뚜껑을 열었더니 NO₂가 새어 나가 농도가 계속 변하고, 두 속도도 같아지지 못해요.' : ts != null ? '두 속도가 같아진 뒤부터 농도가 일정해요.' : S.rt.run ? '정반응은 줄고 역반응은 늘어요…' : '▶ 반응 시작으로 기록해요.';
    textBlock(r.x + 14, r.y + r.h - 82, r.w - 28, msg, 13.5, INK, 17, 800);
  }

  /* ----- ④ 동적 평형 ----- */
  function drawTagA(r) {
    bgPanel(r);
    T(r.x + 14, r.y + 26, '🔴 표시한 N 원자 5개를 따라가 보아요', PHONE ? 14.5 : 16, INK, 'left', 800);
    const br = { x: r.x + 12, y: r.y + 42, w: r.w - 24, h: r.h - 82 };
    BX.draw(br, { s: Math.max(6.5, br.w * 0.021), tagOn: true, maxM: 90 });
    legend(r.x + 18, r.y + r.h - 20, true);
    T(r.x + r.w - 14, r.y + r.h - 15, 'N₂O₄ ' + BX.nD + '개 · NO₂ ' + BX.nM + '개', 14, INK, 'right', 800);
  }
  function drawTagB(r) {
    const tc = BX.tagCount(), rt = BX.rates();
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '겉으로는 변화가 없어요', 14.5, INK, 'left', 800);
    T(r.x + 14, r.y + 48, 'N₂O₄ ' + BX.nD + '개 · NO₂ ' + BX.nM + '개 (일정)', 14, '#0b6b39', 'left', 800);
    T(r.x + 14, r.y + 70, '정반응 ' + fx(rt.Rf, 1) + ' = 역반응 ' + fx(rt.Rr, 1) + ' 회/초', 13.5, '#0b6b39', 'left', 800);
    D.roundRect(r.x + 12, r.y + 82, r.w - 24, 1.5, 1); ctx.fillStyle = '#e1e5ef'; ctx.fill();
    T(r.x + 14, r.y + 106, '속에서는 계속 일어나요', 14.5, '#b4231f', 'left', 800);
    T(r.x + 14, r.y + 130, '빨간 N: N₂O₄ 속 ' + tc.inD + '개 · NO₂ 속 ' + tc.inM + '개', 14, INK, 'left', 800);
    T(r.x + 14, r.y + 152, '분자를 옮겨 다닌 횟수: ' + BX.hops + '번', 14, INK, 'left', 800);
    // 비슷한 평형들 (겉으로 보이는 모습)
    const y0 = r.y + 184; T(r.x + 14, y0, '겉으로 보이는 모습 (거시적)', 13, MUTED, 'left', 800);
    [['🧂', '포화 용액', '고체의 양이 일정해요'], ['🫙', '밀폐된 병 속의 물', '수면의 높이가 일정해요'], ['🧪', 'N₂O₄ ⇌ 2NO₂', '색과 농도가 일정해요']].forEach((q, i) => {
      const y = y0 + 14 + i * 40; D.roundRect(r.x + 12, y, r.w - 24, 34, 10); ctx.fillStyle = '#f3f5fa'; ctx.fill();
      T(r.x + 26, y + 23, q[0], 18, '#000', 'center', 700); T(r.x + 44, y + 15, q[1], 13.5, INK, 'left', 800); T(r.x + 44, y + 30, q[2], 12.5, MUTED, 'left', 700);
      const pu = 0.5 + 0.5 * Math.sin(S.t * 5 + i); D.arrow(r.x + r.w - 52, y + 14, r.x + r.w - 26, y + 14, { color: C.mix('#9aa5b8', '#e2464b', pu), width: 2.5, head: 8 }); D.arrow(r.x + r.w - 26, y + 22, r.x + r.w - 52, y + 22, { color: C.mix('#9aa5b8', '#3867f4', 1 - pu), width: 2.5, head: 8 });
    });
  }

  /* ----- 그래프 위의 포인터 ----- */
  function plotHit(p) {
    if (S.mode === 'conc') { const P = concPlot(SPL.B); if (p.x >= P.px - 4 && p.x <= P.px + P.pw + 4 && p.y >= P.py - 4 && p.y <= P.py + P.ph + 4) return { k: 'conc', t: Math.round(P.vx(p.x)) }; }
    if (S.mode === 'rate') { const P = ratePlot(); if (BX.hist.length > 5 && p.x >= P.px - 4 && p.x <= P.px + P.pw + 4 && p.y >= P.py - 4 && p.y <= P.py + P.ph + 4) { const tmax = BX.hist[BX.hist.length - 1].t; return { k: 'rate', t: Math.round(clamp(P.vx(p.x), 0, tmax) * 10) / 10 }; } }
    return null;
  }
  function ptDown(p) { const h = plotHit(p); if (!h) return false; if (h.k === 'conc') S.cc.cur = h.t; else { S.rt.marker = h.t; S.rt.drag = true; Sound.tick(); } return true; }
  function ptMove(p) { const h = plotHit(p); if (!h) return; if (h.k === 'conc') S.cc.cur = h.t; else S.rt.marker = h.t; }
  function ptUp() { S.rt.drag = false; }
  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    const rt = BX.rates();
    if (S.mode === 'conc') {
      const A = valAt('A', S.cc.A.ts), B = valAt('B', S.cc.B.ts);
      L1 = '㉠ [N₂O₄] · [NO₂]'; a = fx(A.n, 4) + ' · ' + fx(A.m, 4); L2 = '㉡ [N₂O₄] · [NO₂]'; b = fx(B.n, 4) + ' · ' + fx(B.m, 4);
      L3 = '상태'; c = S.cc.A.ts >= 60 && S.cc.B.ts >= 60 ? '같은 농도로 일정' : S.cc.A.run || S.cc.B.run ? '기록하는 중' : '기록 전';
    } else if (S.mode === 'model') {
      L1 = 'N₂O₄ · NO₂ 분자'; a = BX.nD + '개 · ' + BX.nM + '개'; L2 = '정반응 · 역반응 (회/초)'; b = fx(rt.Rf, 1) + ' · ' + fx(rt.Rr, 1);
      L3 = '상태'; c = S.md.run ? (eqShow() ? '평형: 두 속도가 같아요' : '진행 중') : '시작 전';
    } else if (S.mode === 'rate') {
      L1 = '모형 시간'; a = fx(BX.rt, 1) + ' 초'; L2 = '정반응 · 역반응 (회/초)'; b = fx(rt.Rf, 1) + ' · ' + fx(rt.Rr, 1); L3 = '용기'; c = BX.lidOpen ? '열림 (NO₂ 유출)' : '닫힘';
    } else {
      const tc = BX.tagCount();
      L1 = '빨간 N: N₂O₄ 속 · NO₂ 속'; a = tc.inD + '개 · ' + tc.inM + '개'; L2 = '분자를 옮겨 다닌 횟수'; b = BX.hops + '번'; L3 = '정반응 · 역반응 (회/초)'; c = fx(rt.Rf, 1) + ' · ' + fx(rt.Rr, 1);
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const bothDone = () => S.cc.A.ts >= 60 && S.cc.B.ts >= 60;
  const levels = [
    {
      title: '농도 일정: 출발이 달라도 같은 곳으로', short: '농도 일정', icon: '📈', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 색이 변하지 않는 평형 상태에서 반응은 정말 멈춘 걸까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 닫힌 용기에 N₂O₄만 넣으면 갈색이 진해지다가 약 40초 뒤부터 변하지 않았어요. 이번에는 <b>출발 물질을 바꾸어</b> 농도가 어떻게 변하는지 정확히 기록해요.</div>' +
        '<p>일정한 온도의 밀봉 플라스크에 <b>㉠ N₂O₄ 0.030 mol/L만</b>, <b>㉡ NO₂ 0.060 mol/L만</b> 넣은 두 실험을 해요. (NO₂는 유독 기체라서 모의실험이에요.) 질소 원자 수는 같아요: 2 × 0.030 = 0.060.</p>',
      features: ['conc'],
      setup() { S.gate = ''; resetConc(); setScene('conc'); },
      recap: '출발 물질이 달라도 일정한 온도의 닫힌 용기에서는 같은 농도에 도달하고, 그 뒤에는 농도가 변하지 않아요. 평형에서 [N₂O₄] 0.024, [NO₂] 0.012 mol/L로 두 농도가 같지는 않아요.',
      summary: '<ul><li>닫힌 용기 · 일정한 온도에서 N₂O₄ ⇌ 2NO₂: ㉠ N₂O₄만으로 시작해도, ㉡ NO₂만으로 시작해도 약 40초 뒤 같은 상태에 도달해요.</li><li>이 <b>화학 평형 상태</b>에서는 색 · 농도(압력)가 변하지 않고, <b>반응물과 생성물이 함께 있어요</b>.</li><li>평형 농도: <b>[N₂O₄] = ' + EQ_N + ' mol/L, [NO₂] = ' + EQ_M + ' mol/L</b> — 같지 않고 일정할 뿐이에요.</li></ul>',
      missions: [
        {
          title: '두 가지 출발 모두 기록하기',
          goal: '<b>▶ ㉠ N₂O₄만</b>과 <b>▶ ㉡ NO₂만</b>을 눌러 두 실험을 <b>60초</b>까지 기록해요.',
          hint: '두 단추를 모두 누르면 두 그래프가 함께 그려져요. 한꺼번에 눌러도 돼요.',
          setup() { S.gate = ''; resetConc(); setScene('conc'); },
          check: () => bothDone(), hold: 0.4,
          status: () => mark(S.cc.A.ts >= 60) + ' ㉠ ' + Math.floor(S.cc.A.ts) + '초 &nbsp; ' + mark(S.cc.B.ts >= 60) + ' ㉡ ' + Math.floor(S.cc.B.ts) + '초',
          explain: '㉠은 N₂O₄가 줄고 NO₂가 늘고, ㉡은 NO₂가 줄고 N₂O₄가 늘어요. 반대 방향에서 출발했는데도 <b>같은 농도</b>로 모여서, 그 뒤로는 변하지 않아요.',
        },
        {
          title: '평형 농도 읽기', manual: true,
          goal: '40초 이후 일정해진 <b>[N₂O₄]</b>와 <b>[NO₂]</b>(mol/L)를 그래프에서 읽어 써요. 그래프를 누르면 값이 보여요.',
          hint: '그래프에서 40초 근처를 눌러 값을 읽어요. 수평으로 일정해진 부분이에요.',
          setup() { S.gate = 'read'; $('#eqN').value = ''; $('#eqM').value = ''; setScene('conc'); updateCtl(); },
          check() {
            if (!bothDone()) return '먼저 두 실험을 끝까지 기록해 주세요.';
            const n = parseNum($('#eqN').value), m = parseNum($('#eqM').value);
            if (isNaN(n) || isNaN(m)) return '두 칸에 숫자를 써 주세요.';
            const okN = Math.abs(n - EQ_N) <= 0.0006, okM = Math.abs(m - EQ_M) <= 0.0006;
            mark2($('#eqN'), okN ? 'ok' : 'bad'); mark2($('#eqM'), okM ? 'ok' : 'bad');
            if (okN && okM) return true;
            if (Math.abs(n - EQ_M) <= 0.0006 && Math.abs(m - EQ_N) <= 0.0006) return 'N₂O₄와 NO₂가 바뀌었어요. 처음에 N₂O₄가 많았던 쪽(파란 선)을 살펴보세요.';
            return '40초 이후 선이 수평으로 일정해진 값을 읽어 보세요.';
          },
          status: () => '[N₂O₄] ' + ($('#eqN').value || '?') + ' · [NO₂] ' + ($('#eqM').value || '?'),
          explain: '평형에서 <b>[N₂O₄] = ' + EQ_N + ' mol/L, [NO₂] = ' + EQ_M + ' mol/L</b>예요. 두 출발 모두 같은 값이고, 질소 원자 수도 보존돼요: 2 × ' + EQ_N + ' + ' + EQ_M + ' = 0.060.',
        },
        {
          type: 'quiz', title: '평형에서 두 농도는 같을까?',
          goal: '평형 상태에서 [N₂O₄]와 [NO₂]에 대한 설명으로 옳은 것은?',
          setup() { S.gate = ''; setScene('conc'); },
          choices: ['두 농도가 같아지는 상태가 평형이에요', '농도가 변하지 않을 뿐, 두 농도가 같지는 않아요 (0.024와 0.012)', '출발 물질에 따라 평형 농도가 달라져요', '평형에서는 NO₂가 모두 사라져요'],
          answer: 1,
          feedback: ['평형 농도는 0.024와 0.012로 서로 달라요. “일정함”과 “같음”은 다른 말이에요.', '', '㉠과 ㉡ 모두 같은 농도에 도달했어요. 일정한 온도의 닫힌 용기라면 출발이 달라도 같아요.', '그래프에서 [NO₂]는 0이 되지 않고 0.012에서 일정했어요.'],
          explain: '평형에서는 농도가 <b>변하지 않을 뿐</b> 같아지는 것은 아니에요. 반응물과 생성물이 <b>함께 존재</b>하고, 출발 방향이 달라도 같은 평형 상태에 도달해요.',
        },
      ],
    },
    {
      title: '분자 세기: 정반응과 역반응의 횟수', short: '분자 세기', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도가 일정해지는 것을 확인했어요. 입자 수준에서는 어떤 일이 일어날까요?</div>' +
        '<p>이번에는 <b>N₂O₄ ⇌ 2NO₂</b>로 써요. 왼쪽 → 오른쪽(N₂O₄ → 2NO₂)이 <b>정반응</b>, 오른쪽 → 왼쪽(2NO₂ → N₂O₄)이 <b>역반응</b>이에요. 대표 입자 100개로 시작해 <b>초당 일어나는 반응 횟수</b>(가상 단위)를 세어요. 반응 속도는 이렇게 횟수로만 나타내요.</p>',
      features: ['model'],
      setup() { S.gate = ''; resetModel(); setScene('model'); },
      recap: '처음에는 정반응만 많다가, NO₂가 늘면서 역반응도 늘어 어느 순간 두 횟수가 같아져요. 이때 분자 수는 N₂O₄ 80개 · NO₂ 40개로 일정해요.',
      summary: '<ul><li>N₂O₄ 100개로 시작: 정반응 10회/초, 역반응 0회/초.</li><li>NO₂가 늘수록 역반응이 늘고, N₂O₄가 줄수록 정반응이 줄어요.</li><li>평형: N₂O₄ 80개 · NO₂ 40개에서 <b>정반응 8회/초 = 역반응 8회/초</b> — 분자 수가 일정해요. 모형의 시간은 실제보다 빠르게 흘러요.</li></ul>',
      missions: [
        {
          title: '평형에 도달할 때까지 지켜보기',
          goal: '<b>▶ 반응 시작</b>을 누르고 <b>정반응 횟수</b>와 <b>역반응 횟수</b>가 같아질 때까지 지켜보세요.',
          hint: 'N₂O₄가 80개, NO₂가 40개가 되고 두 속도가 같아지면 “평형” 도장이 찍혀요.',
          setup() { S.gate = ''; resetModel(); setScene('model'); updateCtl(); },
          check: () => S.md.eqT >= 1.2, hold: 0.4,
          status: () => { const r = BX.rates(); return '정반응 ' + fx(r.Rf, 1) + ' 회/초 ' + (eqShow() ? '=' : '≠') + ' 역반응 ' + fx(r.Rr, 1) + ' 회/초'; },
          explain: '시작 때는 N₂O₄뿐이라 정반응(10회/초)만 일어나요. NO₂가 늘면 역반응이 늘고 N₂O₄가 줄어 정반응은 줄어요. 마침내 <b>정반응 8회/초 = 역반응 8회/초</b>가 되면 N₂O₄ 80개, NO₂ 40개로 개수가 더 변하지 않아요.',
        },
        {
          type: 'quiz', title: '평형에서 N₂O₄는 생기지도 사라지지도 않을까?',
          goal: '평형(N₂O₄ 80개 · NO₂ 40개)에서 N₂O₄ 분자에 대한 설명으로 옳은 것은?',
          setup() { S.gate = ''; setScene('model'); },
          choices: ['모든 반응이 멈추어서 분자가 그대로예요', '정반응으로 사라지는 만큼 역반응으로 생겨서 개수가 일정해 보여요', '분자 수가 일정하면 반응하는 분자도 없어요', '역반응만 계속 일어나서 N₂O₄가 생겨요'],
          answer: 1,
          feedback: ['화면의 분자들을 보세요. 평형에서도 합쳐지고 쪼개지는 장면이 계속 보여요.', '', '분자 수가 일정한 것은 반응이 멈춰서가 아니라, 생기는 수와 사라지는 수가 같아서예요.', '정반응도 같은 횟수만큼 일어나서 서로 상쇄돼요.'],
          explain: '평형에서도 N₂O₄는 <b>사라지는 만큼 다시 생겨요</b>(8회/초씩). 분자 하나하나는 계속 바뀌지만, 전체 개수는 변하지 않아요.',
        },
      ],
    },
    {
      title: '속도 그래프: 두 속도가 만나는 때', short: '속도 그래프', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 평형에서 정반응 횟수와 역반응 횟수가 같다는 것을 봤어요. 이제 시간에 따른 <b>속도 그래프</b>와 농도 그래프를 나란히 비교해요.</div>' +
        '<p>정반응 속도는 반응물이 줄어 <b>감소</b>하고, 역반응 속도는 생성물이 늘어 <b>증가</b>해요. 두 곡선이 만나는 시점부터 농도가 일정해져요. 그리고 용기의 <b>뚜껑</b>을 열면 어떻게 될까요?</p>',
      features: ['rate'],
      setup() { S.gate = ''; resetRate(); S.rt.triedOpen = false; setScene('rate'); },
      recap: '정반응 속도는 줄고 역반응 속도는 늘다가 같아지는 때부터 농도가 일정해져요. 평형은 닫힌 용기 · 일정한 온도에서만 이루어져요.',
      summary: '<ul><li>시간–속도 그래프: 정반응 속도 ↓, 역반응 속도 ↑ → 두 곡선이 만나는 때부터 <b>평형</b>.</li><li>같은 때부터 시간–농도 그래프의 [N₂O₄], [NO₂]가 <b>일정</b>해요.</li><li>평형이 되려면 <b>닫힌 용기</b>(NO₂가 새어 나가지 않음)와 <b>일정한 온도</b>가 필요해요. 온도가 달라지면 평형 농도가 달라질 수 있어요.</li><li>평형에서 정반응 속도 = 역반응 속도이고, 둘 다 <b>0이 아니에요</b>.</li></ul>',
      missions: [
        {
          title: '두 속도가 만나는 점 표시하기',
          goal: '<b>▶ 반응 시작</b>으로 닫힌 용기의 반응을 끝까지 기록한 뒤, 정반응과 역반응 선이 <b>만나는 곳</b>을 속도 그래프에서 눌러 표시해요.',
          hint: '뚜껑을 닫은 채로 기록하세요. 빨간 선과 파란 선이 하나로 겹치기 시작하는 곳을 누르면 돼요.',
          setup() { S.gate = ''; resetRate(); setScene('rate'); updateCtl(); },
          check() {
            const ts = tStar(), m = S.rt.marker; if (ts == null || m < 0 || S.rt.openRun) return false;
            const q = histAt(m); return !!q && Math.abs(m - ts) <= 1.5 && Math.abs(q.Rf - q.Rr) <= 0.5;
          }, hold: 0.4,
          status: () => mark(S.rt.done && !S.rt.openRun) + ' 닫힌 용기로 기록 &nbsp; ' + mark(S.rt.marker >= 0) + ' 표시' + (S.rt.marker >= 0 ? ' (t = ' + fx(S.rt.marker, 1) + '초)' : ''),
          explain: '정반응 속도는 N₂O₄가 줄면서 <b>감소</b>하고, 역반응 속도는 NO₂가 늘면서 <b>증가</b>해요. 두 곡선이 만난 때(약 5초)부터 N₂O₄와 NO₂의 농도가 더 이상 변하지 않아요.',
        },
        {
          title: '평형이 되는 조건 고르기', manual: true,
          goal: '<b>↺ 다시</b> → <b>🔓 뚜껑 열기</b> → <b>▶ 반응 시작</b>으로 열린 용기도 실험해 보고, 평형이 되는 <b>용기와 온도 조건</b>을 골라요.',
          hint: '열린 용기에서는 NO₂가 새어 나가 농도가 계속 변해요. 뚜껑을 연 채로 6초 이상 지켜보세요.',
          setup() { S.gate = 'cond'; $('#selCl').value = ''; $('#selTe').value = ''; S.cond = { cl: '', te: '' }; setScene('rate'); updateCtl(); },
          check() {
            if (!S.rt.triedOpen) return '먼저 ↺ 다시 → 🔓 뚜껑 열기 → ▶ 반응 시작으로 열린 용기를 6초 이상 실험해 보세요.';
            if (!S.cond.cl || !S.cond.te) return '두 곳을 모두 골라 주세요.';
            const a = S.cond.cl === 'closed', b = S.cond.te === 'const';
            mark2($('#selCl'), a ? 'ok' : 'bad'); mark2($('#selTe'), b ? 'ok' : 'bad');
            return a && b ? true : (!a ? '열린 용기에서는 NO₂가 빠져나가 평형이 되지 못했어요.' : '온도가 변하면 평형 농도도 달라질 수 있어요.');
          },
          status: () => mark(S.rt.triedOpen) + ' 열린 용기 실험 &nbsp; 용기: ' + (S.cond.cl === 'closed' ? '닫힘' : S.cond.cl === 'open' ? '열림' : '?') + ' · 온도: ' + (S.cond.te === 'const' ? '일정' : S.cond.te === 'vary' ? '변함' : '?'),
          explain: '평형은 <b>닫힌 용기</b>에서 <b>일정한 온도</b>일 때 이루어져요. 열린 용기에서는 NO₂가 새어 나가 농도가 계속 달라지고 두 속도도 같아지지 못해요. 온도를 바꾸면 평형 농도가 달라질 수 있다는 것은 뒤에서 살펴봐요.',
        },
        {
          type: 'quiz', title: '평형에서 정반응 속도는 0일까?',
          goal: '평형 상태에서 정반응 속도에 대해 옳게 말한 것은?',
          setup() { S.gate = ''; setScene('rate'); },
          choices: ['평형에서는 정반응이 멈추어 속도가 0이에요', '정반응 속도와 역반응 속도가 같을 뿐, 둘 다 0이 아니에요', '정반응 속도가 역반응 속도보다 항상 커요', '역반응이 멈춘 상태가 평형이에요'],
          answer: 1,
          feedback: ['속도 그래프에서 평형 이후에도 두 선은 0이 아니라 8회/초 높이에서 이어져요.', '', '평형에서는 두 속도가 같아요. 정반응이 더 크면 NO₂가 계속 늘어나요.', '역반응도 정반응과 같은 속도로 계속돼요.'],
          explain: '평형에서는 <b>정반응 속도 = 역반응 속도</b>이고, 이 값은 0이 아니에요(그래프에서 8회/초). 그래서 농도는 일정해도 반응은 계속되는 거예요.',
        },
      ],
    },
    {
      title: '동적 평형: 계속되는 반응', short: '동적 평형', icon: '🔴', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 평형에서도 정반응과 역반응이 같은 속도로 계속된다고 알았어요. 눈으로 확인해 볼까요?</div>' +
        '<p>평형 상태(N₂O₄ 80개 · NO₂ 40개)에서 N 원자 5개에 <b>빨간 표시</b>를 했어요. 겉으로는 분자 수가 그대로이지만, 빨간 원자가 N₂O₄와 NO₂ 사이를 <b>오가는지</b> 따라가 봐요. 겉으로 변화가 없는 <b>거시적 평형</b>과 입자 수준에서 계속되는 <b>동적 평형</b>을 구분해요.</p>',
      features: ['tag'],
      setup() { S.gate = ''; resetTag(); setScene('tag'); },
      recap: '평형은 정지한 상태가 아니에요. 겉으로는 농도가 일정해도, 입자 수준에서는 정반응과 역반응이 같은 속도로 계속되는 <b>동적 평형</b>이에요.',
      summary: '<ul><li><b>거시적</b>으로는 색 · 농도 · 압력이 일정해요. <b>미시적</b>으로는 정반응과 역반응이 같은 속도로 계속돼요.</li><li>표지한 N 원자는 평형에서도 N₂O₄ ↔ NO₂ 사이를 계속 오가요.</li><li>다른 동적 평형: 포화 용액(용해 속도 = 석출 속도), 밀폐된 병 속의 물(증발 속도 = 응결 속도), 화학 평형(정반응 속도 = 역반응 속도).</li><li>화학 평형 상태의 특징: 닫힌 계 · 일정한 온도, 농도 일정, 반응물과 생성물 공존, <b>정반응 속도 = 역반응 속도(≠ 0)</b>.</li></ul>',
      missions: [
        {
          title: '빨간 원자 따라가기',
          goal: '평형 상태에서 빨간 N 원자가 N₂O₄와 NO₂ 사이를 <b>3번 이상</b> 오가는 것을 지켜보세요.',
          hint: '빨간 꼬리가 있는 분자를 눈으로 따라가요. 쪼개지거나 합쳐질 때마다 횟수가 늘어요.',
          setup() { S.gate = ''; resetTag(); setScene('tag'); updateCtl(); },
          check: () => BX.hops >= 3, hold: 0.4,
          status: () => '오간 횟수 ' + BX.hops + ' / 3번 &nbsp; (분자 수: N₂O₄ ' + BX.nD + '개 · NO₂ ' + BX.nM + '개)',
          explain: '분자 수(80개, 40개)는 그대로인데 빨간 원자는 N₂O₄와 NO₂를 <b>계속 오가요</b>. 정반응과 역반응이 같은 속도로 계속 일어나기 때문이에요.',
        },
        {
          title: '같아지는 두 속도 짝짓기', manual: true,
          goal: '겉으로는 변화가 없는 세 가지 평형 사례마다, 입자 수준에서 <b>같아지는 두 속도</b>를 짝지어 <b>✔ 확인하기</b>를 눌러요.',
          hint: '포화 용액은 녹고 석출되고, 병 속의 물은 증발하고 응결돼요. 화학 평형은 정반응과 역반응이에요.',
          setup() { S.gate = 'match'; S.tg.sel = ['', '', '']; [0, 1, 2].forEach((i) => { $('#mt' + i).value = ''; mark2($('#mt' + i), ''); }); setScene('tag'); updateCtl(); },
          check() {
            const s = S.tg.sel; if (s.some((v) => v === '')) return '세 곳을 모두 골라 주세요.';
            let bad = 0; s.forEach((v, i) => { const el = $('#mt' + i); if (+v === i) mark2(el, 'ok'); else { bad++; if (!el.classList.contains('bad')) shake(el); } });
            return bad ? bad + '곳이 알맞지 않아요. 용해와 석출, 증발과 응결, 정반응과 역반응을 생각해 보세요.' : true;
          },
          status: () => '고른 짝 ' + S.tg.sel.filter((v) => v !== '').length + ' / 3',
          explain: '<b>포화 용액</b>은 용해 속도 = 석출 속도, <b>밀폐된 병 속의 물</b>은 증발 속도 = 응결 속도, <b>화학 평형</b>은 정반응 속도 = 역반응 속도예요. 모두 겉으로는 변화가 없지만 입자 수준에서는 반대 방향의 두 과정이 같은 속도로 계속되는 <b>동적 평형</b>이에요.',
        },
        {
          type: 'quiz', title: '“평형 상태는 정지한 상태다”가 틀린 까닭',
          goal: '“화학 평형 상태에서는 반응이 멈춘다”는 말이 틀린 까닭은?',
          setup() { S.gate = ''; setScene('tag'); },
          choices: ['평형에서는 색과 농도가 계속 변해서', '입자 수준에서는 정반응과 역반응이 같은 속도로 계속 일어나서', '온도가 계속 올라가서', '시간이 지나면 새로운 물질이 계속 쌓여서'],
          answer: 1,
          feedback: ['평형에서는 색과 농도가 일정해요. 달라지는 것은 입자 수준의 모습이에요.', '', '온도는 일정해야 평형이 이루어져요.', '평형에서는 물질의 양이 일정해요. 쌓이지 않아요.'],
          explain: '평형에서는 <b>겉으로 보이는(거시적) 성질은 일정</b>하지만, 입자 수준에서는 정반응과 역반응이 <b>같은 속도로 계속</b>돼요. 그래서 “정지”가 아니라 <b>동적 평형</b>이라고 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-dynamic-eq', mount: '#game', badge: '평형 탐험가', homeHref: '../../index.html#hc',
    featureLabels: { conc: '📈 두 출발의 시간–농도 그래프', model: '🧩 입자 모형 + 초당 반응 횟수', rate: '📊 시간–속도 그래프 · 용기 뚜껑', tag: '🔴 표지 원자 추적' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetConc(); resetModel();
  SciSim.pointer(view, {
    down(p) { return ptDown(p); }, move(p) { ptMove(p); }, up() { ptUp(); },
    hover(p) { return plotHit(p) ? 'crosshair' : 'default'; },
  });
  setScene('conc');
  function stepAll1(dt) { stepCc(dt); stepMol(dt); }
  let lastFree = false, lastMode = '', lastBusy = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    const busy = [S.cc.A.run, S.cc.B.run, S.md.run, S.rt.run, S.rt.done, BX.lidOpen].join('');
    if (busy !== lastBusy) { lastBusy = busy; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'conc') { drawConcA(SPL.A); drawConcB(SPL.B); }
    else if (S.mode === 'model') { drawModelA(SPL.A); drawModelB(SPL.B); }
    else if (S.mode === 'rate') { drawRateA(SPL.A); drawRateB(SPL.B); }
    else { drawTagA(SPL.A); drawTagB(SPL.B); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, BX, VW, VH, SPL, get game() { return game; }, ccRun, goRun, resetModel, resetRate, resetTag, setScene, ratePlot, concPlot, tStar, histAt, cAN, cAM, cBN, cBM,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
