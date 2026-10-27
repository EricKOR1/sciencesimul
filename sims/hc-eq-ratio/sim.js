/* =========================================================
   화학 Ⅲ. 화학 평형 - 평형 농도의 규칙 [12화학03-02] (단원 3차시)
   ① 분석: 자료 읽기 (H₂ + I₂ ⇌ 2HI 네 실험의 처음 · 평형 농도, 반응한 양의 비)
   ② 탐구: 규칙 찾기 (후보 식 3개와 지수 단추 → [HI]²/([H₂][I₂]) = 25)
   ③ 설명: 식으로 쓰기 (K = [C]ᶜ[D]ᵈ/([A]ᵃ[B]ᵇ), 계수 → 지수)
   ④ 확인: 다른 반응 (N₂O₄ ⇌ 2NO₂, N₂ + 3H₂ ⇌ 2NH₃의 자료로 내 식 검증)
   몰 농도는 1 L당 몰 수로 필요한 정도만, 압력 평형 상수와 균일하지 않은 평형은 다루지 않아요.
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
  /* ---------- 자료 ---------- */
  // H₂ + I₂ ⇌ 2HI (가상의 일정한 온도 T): 실험별 처음 → 평형 농도 (mol/L)
  const EXPS = [
    { init: [0.0140, 0.0140, 0], eq: [0.0040, 0.0040, 0.0200] },
    { init: [0.0280, 0.0280, 0], eq: [0.0080, 0.0080, 0.0400] },
    { init: [0.0900, 0.0600, 0], eq: [0.0400, 0.0100, 0.1000] },
    { init: [0, 0, 0.0350], eq: [0.0050, 0.0050, 0.0250] },
  ];
  const SYS = {
    hi: { name: 'H₂ + I₂ ⇌ 2HI', sp: ['H₂', 'I₂', 'HI'], role: ['R', 'R', 'P'], coef: [1, 1, 2], data: EXPS.map((e) => e.eq), dec: 4, lab: '실험', K: 25, order: [2, 0, 1] },
    no2: { name: 'N₂O₄ ⇌ 2NO₂', sp: ['N₂O₄', 'NO₂'], role: ['R', 'P'], coef: [1, 2], data: [[0.0060, 0.0060], [0.024, 0.012], [0.150, 0.030]], dec: 3, lab: '자료', K: 0.0060, order: [1, 0] },
    nh3: { name: 'N₂ + 3H₂ ⇌ 2NH₃', sp: ['N₂', 'H₂', 'NH₃'], role: ['R', 'R', 'P'], coef: [1, 3, 2], data: [[1.0, 2.0, 2.0], [2.0, 1.0, 1.0], [0.50, 4.0, 4.0], [2.0, 4.0, 8.0]], dec: 2, lab: '자료', K: 0.50, order: [2, 0, 1] },
  };
  const CAND = [{ key: 'A', label: '[HI] ÷ [H₂]', e: [1, 0, 1] }, { key: 'B', label: '[HI] ÷ ([H₂][I₂])', e: [1, 1, 1] }, { key: 'C', label: '[HI]² ÷ ([H₂][I₂])', e: [1, 1, 2] }];
  const RX = [
    { name: '2NO₂ ⇌ N₂O₄', sp: ['NO₂', 'N₂O₄'], role: ['R', 'P'], coef: [2, 1] },
    { name: 'N₂ + 3H₂ ⇌ 2NH₃', sp: ['N₂', 'H₂', 'NH₃'], role: ['R', 'R', 'P'], coef: [1, 3, 2] },
    { name: '2SO₂ + O₂ ⇌ 2SO₃', sp: ['SO₂', 'O₂', 'SO₃'], role: ['R', 'R', 'P'], coef: [2, 1, 2] },
  ];
  const SPCOL = ['#d97706', '#d97706', '#7c3aed'];                 // 반응물 · 생성물 색
  const colOf = (role) => (role === 'P' ? '#7c3aed' : '#d97706');
  const SPL = split(0.6, 0.5);

  const S = {
    mode: 'data', t: 0, fade: 0, gate: '',
    da: { sel: 0, prog: 0, tgt: 0, seen: [false, false, false, false] },
    rl: { e: [1, 0, 1], tested: {}, pick: '' },
    wr: { rx: 0, e: [[1, 1], [1, 1, 1], [1, 1, 1]], ok: [false, false, false], fly: [], slots: {}, bub: {} },
    ot: { sys: 'no2', e: { no2: [1, 1], nh3: [1, 1, 1] }, wrongSeen: false, rightSeen: { no2: false, nh3: false } },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { data: '📋 자료 읽기', rule: '🔍 규칙 찾기', write: '✍️ 식으로 쓰기', other: '🧪 다른 반응' };

  const fV = (v) => { if (!isFinite(v)) return '-'; if (v >= 100) return String(Math.round(v)); if (v >= 10) return String(+v.toFixed(1)); return String(+v.toPrecision(3)); };
  function ruleVals(sk, e) { const s = SYS[sk]; return s.data.map((d) => { let v = 1; d.forEach((c, j) => { v *= Math.pow(c, s.role[j] === 'P' ? e[j] : -e[j]); }); return v; }); }
  function isConst(sk, e) { const s = SYS[sk]; if (!s.role.some((r, j) => r === 'P' && e[j] > 0)) return false; const v = ruleVals(sk, e); return Math.max.apply(null, v) / Math.min.apply(null, v) - 1 < 0.005; }
  const candKey = (e) => { const c = CAND.find((q) => q.e.join() === e.join()); return c ? c.key : ''; };

  /* ---------- 공통 UI ---------- */
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; buildSteppers(); updateCtl(); }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#expChips button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.da.sel); b.classList.toggle('done', S.da.seen[k]); });
    $$('#candChips button').forEach((b) => { b.classList.toggle('on', candKey(S.rl.e) === b.dataset.v); b.classList.toggle('done', !!S.rl.tested[b.dataset.v]); });
    $$('#rxChips button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.wr.rx); b.classList.toggle('done', S.wr.ok[k]); });
    $$('#sysChips button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.ot.sys));
    $('#bPlay').disabled = S.da.prog > 0.99 || S.da.tgt > 0.5;
    $('#bPlay').textContent = S.da.prog > 0.99 ? '✔ 평형에 도달했어요' : S.da.tgt > 0.5 ? '반응하는 중…' : '▶ 평형까지 보기';
    $('#expNote').textContent = S.da.sel === 3 ? '실험 4는 반대 방향, 생성물인 HI에서 출발해요.' : '단위는 mol/L예요. 일정한 온도의 닫힌 용기예요.';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  setSel('#selRule', [['', '고르세요'], ['A', CAND[0].label], ['B', CAND[1].label], ['C', CAND[2].label], ['none', '일정한 식이 없어요']]);
  $('#selRule').addEventListener('change', (e) => { S.rl.pick = e.target.value; mark2(e.target, ''); });
  ['d1', 'd3', 'kA', 'kB'].forEach((id) => $('#' + id).addEventListener('input', (e) => mark2(e.target, '')));
  EXPS.forEach((e, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = '실험 ' + (i + 1); $('#expChips').appendChild(b); b.addEventListener('click', () => { Sound.click(); daSelect(i); }); });
  CAND.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = c.key; b.textContent = c.label; $('#candChips').appendChild(b); b.addEventListener('click', () => { Sound.click(); S.rl.e = c.e.slice(); S.rl.tested[c.key] = true; buildSteppers(); updateCtl(); }); });
  RX.forEach((r, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = r.name; $('#rxChips').appendChild(b); b.addEventListener('click', () => { Sound.click(); S.wr.rx = i; buildSteppers(); updateCtl(); }); });
  [['no2', 'N₂O₄ ⇌ 2NO₂'], ['nh3', 'N₂ + 3H₂ ⇌ 2NH₃']].forEach((q) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = q[0]; b.textContent = q[1]; $('#sysChips').appendChild(b); b.addEventListener('click', () => { Sound.click(); S.ot.sys = q[0]; buildSteppers(); updateCtl(); }); });

  /* 지수 단추 (규칙 찾기 · 식으로 쓰기 · 다른 반응에서 함께 써요) */
  function curRef() {
    if (S.mode === 'rule') return { sp: SYS.hi.sp, role: SYS.hi.role, e: S.rl.e };
    if (S.mode === 'write') { const r = RX[S.wr.rx]; return { sp: r.sp, role: r.role, e: S.wr.e[S.wr.rx], coef: r.coef }; }
    const s = SYS[S.ot.sys]; return { sp: s.sp, role: s.role, e: S.ot.e[S.ot.sys] };
  }
  function buildSteppers() {
    const box = $('#stepBox'); if (!box) return; box.innerHTML = '';
    if (S.mode !== 'rule' && S.mode !== 'write' && S.mode !== 'other') return;
    const ref = curRef();
    $('#stepHead').textContent = S.mode === 'write' ? '🔧 식에 쓸 지수' : '🔧 지수를 바꿔 보기';
    const order = ref.sp.map((x, i) => i).sort((a, b) => (ref.role[a] === 'P' ? -1 : 1) - (ref.role[b] === 'P' ? -1 : 1));
    order.forEach((i) => {
      const row = document.createElement('div'); row.className = 'step-row';
      row.innerHTML = '<span class="nm">[' + ref.sp[i] + '] <small style="color:var(--muted)">' + (ref.role[i] === 'P' ? '분자' : '분모') + '</small></span>';
      const m = document.createElement('button'); m.type = 'button'; m.className = 'nudge'; m.textContent = '−'; m.setAttribute('aria-label', ref.sp[i] + ' 지수 줄이기');
      const num = document.createElement('span'); num.className = 'num'; num.textContent = ref.e[i];
      const p = document.createElement('button'); p.type = 'button'; p.className = 'nudge'; p.textContent = '+'; p.setAttribute('aria-label', ref.sp[i] + ' 지수 늘이기');
      m.disabled = ref.e[i] <= (S.mode === 'write' ? 1 : 0); p.disabled = ref.e[i] >= 4;
      m.addEventListener('click', () => setExp(i, ref.e[i] - 1)); p.addEventListener('click', () => setExp(i, ref.e[i] + 1));
      row.append(m, num, p); box.appendChild(row);
    });
  }
  function setExp(i, v) {
    const ref = curRef(); const lo = S.mode === 'write' ? 1 : 0; v = clamp(v, lo, 4); if (v === ref.e[i]) return; Sound.tick();
    ref.e[i] = v;
    if (S.mode === 'rule') { const k = candKey(S.rl.e); if (k) S.rl.tested[k] = true; }
    if (S.mode === 'write' && ref.coef[i] === v) spawnFly(S.wr.rx, i);
    if (S.mode === 'other') { const sk = S.ot.sys, e = S.ot.e[sk]; if (isConst(sk, e)) { if (e.join() === SYS[sk].coef.join()) S.ot.rightSeen[sk] = true; } if (sk === 'nh3' && e.join() === '1,2,2') S.ot.wrongSeen = true; }
    buildSteppers(); updateCtl();
  }
  function spawnFly(rx, i) { const b = S.wr.bub[i], s = S.wr.slots[i]; if (!b || !s) return; S.wr.fly.push({ i, t: 0, x0: b.x, y0: b.y, x1: s.x, y1: s.y, n: RX[rx].coef[i] }); }
  $('#bFly').addEventListener('click', () => { Sound.click(); const r = RX[S.wr.rx]; r.sp.forEach((x, i) => { S.wr.e[S.wr.rx][i] = 1; }); buildSteppers(); updateCtl(); r.sp.forEach((x, i) => { S.wr.fly.push({ i, t: -0.25 * i, x0: (S.wr.bub[i] || { x: 100 }).x, y0: (S.wr.bub[i] || { y: 60 }).y, x1: (S.wr.slots[i] || { x: 200 }).x, y1: (S.wr.slots[i] || { y: 200 }).y, n: r.coef[i], demo: true }); }); });

  /* ================= 그리기 도구: 분수 모양 식 ================= */
  // 분수: 위 = 분자 토큰 [{t, e}], 아래 = 분모 토큰. 지수 위치를 slots에 기록해요.
  function fracLayout(num, den, size) {
    ctx.save(); ctx.font = D.font(size, 800);
    const w = (arr) => arr.reduce((s, q) => s + ctx.measureText(q.t).width + (q.e ? ctx.measureText(String(q.e)).width * 0.68 + 3 : 0) + 6, 0);
    const r = { wn: w(num), wd: w(den) }; ctx.restore(); return r;
  }
  function drawFrac(cx, cy, num, den, size, o) {
    o = o || {}; const L = fracLayout(num, den, size), W = Math.max(L.wn, L.wd, 20) + 14, lineY = cy;
    const row = (arr, y, wRow) => {
      let x = cx - wRow / 2;
      arr.forEach((q) => {
        ctx.save(); ctx.font = D.font(size, 800); const tw = ctx.measureText(q.t).width; ctx.restore();
        T(x, y, q.t, size, q.col || INK, 'left', 800);
        x += tw;
        if (q.e) { const es = String(q.e); ctx.save(); ctx.font = D.font(size * 0.68, 800); const ew = ctx.measureText(es).width; ctx.restore(); T(x + 1, y - size * 0.55, es, size * 0.68, o.eCol || '#b4231f', 'left', 800); if (q.id != null && o.slots) o.slots[q.id] = { x: x + 1 + ew / 2, y: y - size * 0.55 - size * 0.25 }; x += ew + 3; }
        else if (q.id != null && o.slots) o.slots[q.id] = { x: x + 6, y: y - size * 0.8 };
        x += 6;
      });
    };
    if (!num.length) T(cx, lineY - size * 0.35, '1', size, INK, 'center', 800); else row(num, lineY - size * 0.35, L.wn);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx - W / 2, lineY); ctx.lineTo(cx + W / 2, lineY); ctx.stroke();
    if (!den.length) T(cx, lineY + size * 1.05, '1', size, INK, 'center', 800); else row(den, lineY + size * 1.05, L.wd);
    return { w: W, left: cx - W / 2 };
  }
  function tokens(sp, role, e, id0) {
    const num = [], den = [];
    sp.forEach((x, i) => { if (e[i] > 0) { const t = { t: '[' + x + ']', e: e[i] > 1 ? e[i] : 0, col: colOf(role[i]), id: id0 ? i : null }; (role[i] === 'P' ? num : den).push(t); } });
    return { num, den };
  }
  const niceMax = (mx) => { const p = Math.pow(10, Math.floor(Math.log10(mx))); const c = [1, 2, 2.5, 5, 10].map((k) => k * p).find((v) => v >= mx * 0.9999); return c || mx; };
  function barChart(r, vals, labels, constant, o) {
    o = o || {};
    const P = makePlot(r, { x0: 0, x1: 1, y0: 0, y1: niceMax(Math.max.apply(null, vals) || 1), padL: 62, padR: 12, padT: 24, padB: 38 });
    const ymax = niceMax(Math.max.apply(null, vals) || 1);
    drawAxes(P, { yticks: [0, ymax / 2, ymax], yfmt: (v) => fV(v) });
    const n = vals.length, slot = P.pw / n, bw = Math.min(64, slot * 0.58);
    vals.forEach((v, i) => {
      const x = P.px + slot * i + (slot - bw) / 2, y = P.Y(v), h = P.py + P.ph - y, ap = o.anim ? clamp(o.anim[i], 0, 1) : 1;
      D.roundRect(x, P.py + P.ph - h * ap, bw, Math.max(0.5, h * ap), Math.min(6, bw / 2)); ctx.fillStyle = constant ? '#14a058' : '#f59e0b'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 4, P.py + P.ph - h * ap + 2, 5, Math.max(0, h * ap - 4));
      T(x + bw / 2, P.py + P.ph - h * ap - 6, fV(v), 13.5, constant ? '#0b6b39' : INK, 'center', 800);
      T(x + bw / 2, P.py + P.ph + 17, labels[i], 12.5, '#3a465c', 'center', 800);
    });
    if (constant) { const y = P.Y(vals[0]); ctx.save(); ctx.strokeStyle = '#0b6b39'; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.px, y); ctx.lineTo(P.px + P.pw, y); ctx.stroke(); ctx.restore(); }
    return P;
  }
  function substLines(sk, e) {
    const s = SYS[sk], out = [];
    s.data.forEach((d, i) => {
      const nu = [], de = [];
      d.forEach((c, j) => { if (e[j] > 0) (s.role[j] === 'P' ? nu : de).push(fx(c, s.dec) + (e[j] > 1 ? SUP(e[j]) : '')); });
      const v = ruleVals(sk, e)[i];
      out.push('' + s.lab + ' ' + (i + 1) + ': ' + (nu.length ? nu.join(' × ') : '1') + (de.length ? ' / ' + (de.length > 1 ? '(' + de.join(' × ') + ')' : de[0]) : '') + ' = ' + fV(v));
    });
    return out;
  }
  /* ================= ① 자료 읽기 ================= */
  function daSelect(i) { S.da.sel = i; S.da.prog = 0; S.da.tgt = 0; updateCtl(); }
  $('#bPlay').addEventListener('click', () => { Sound.click(); S.da.tgt = 1; updateCtl(); });
  function stepDa(dt) {
    const d = S.da; if (d.tgt > 0.5) d.prog = Math.min(1, d.prog + dt / 2.2); else d.prog = 0;
    if (d.prog >= 1 && !d.seen[d.sel]) { d.seen[d.sel] = true; Sound.success(); if (!RM) parts.burst(SPL.A.x + SPL.A.w / 2, SPL.A.y + SPL.A.h * 0.35, { count: 12 }); updateCtl(); }
    if (d.prog >= 1) d.tgt = 1;
  }
  const ease2 = (p) => p * p * (3 - 2 * p);
  function drawDataA(r) {
    const ex = EXPS[S.da.sel], p = ease2(S.da.prog);
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4'); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill();
    T(r.x + 14, r.y + 26, '실험 ' + (S.da.sel + 1) + ': 처음 → 평형 (mol/L)', PHONE ? 15 : 16, INK, 'left', 800);
    T(r.x + r.w - 14, r.y + 26, S.da.sel === 3 ? 'HI에서 출발' : 'H₂ · I₂에서 출발', 13.5, MUTED, 'right', 800);
    const ym = niceMax(Math.max.apply(null, ex.init.concat(ex.eq)));
    const P = makePlot({ x: r.x + 4, y: r.y + 40, w: r.w - 8, h: r.h - 56 }, { x0: 0, x1: 1, y0: 0, y1: ym, padL: 62, padR: 14, padT: 18, padB: 52 });
    drawAxes(P, { yticks: [0, ym / 2, ym], yfmt: (v) => fx(v, 3) });
    const sp = SYS.hi.sp, n = 3, slot = P.pw / n, bw = Math.min(70, slot * 0.5);
    sp.forEach((nm, j) => {
      const x = P.px + slot * j + (slot - bw) / 2, v0 = ex.init[j], v1 = ex.eq[j], cur = v0 + (v1 - v0) * p;
      const yi = P.Y(v0); if (v0 > 0) { ctx.save(); ctx.strokeStyle = '#8895ab'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8; D.roundRect(x, yi, bw, P.py + P.ph - yi, 5); ctx.stroke(); ctx.restore(); }
      const yc = P.Y(cur), h = P.py + P.ph - yc;
      if (h > 0.4) { D.roundRect(x + 5, yc, bw - 10, h, 5); ctx.fillStyle = j === 2 ? '#7c3aed' : '#f59e0b'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 9, yc + 2, 5, Math.max(0, h - 4)); }
      T(x + bw / 2, yc - 7, fx(cur, 4), 13.5, INK, 'center', 800);
      T(x + bw / 2, P.py + P.ph + 17, nm + (j === 2 ? ' (생성물)' : ' (반응물)'), 13, INK, 'center', 800);
      T(x + bw / 2, P.py + P.ph + 34, '처음 ' + (v0 === 0 ? '0' : fx(v0, 4)), 12.5, MUTED, 'center', 800);
    });
    if (S.da.prog >= 1) D.label(r.x + r.w / 2, r.y + r.h - 8 - 6, '평형 도달: 세 농도가 더는 변하지 않아요', { bg: '#14a058', size: 12.5 });
  }
  function drawDataB(r) {
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '실험 자료 (mol/L)', 14, MUTED, 'left', 800);
    const c0 = r.x + 14, cw = (r.w - 28 - 60) / 3, y0 = r.y + 46;
    ['', 'H₂', 'I₂', 'HI'].forEach((h, j) => { if (j) T(c0 + 60 + cw * (j - 1) + cw / 2, y0, h, 13.5, INK, 'center', 800); });
    EXPS.forEach((ex, i) => {
      const y = y0 + 12 + i * 70, sel = i === S.da.sel;
      D.roundRect(r.x + 8, y, r.w - 16, 64, 10); ctx.fillStyle = sel ? 'rgba(124,58,237,.08)' : '#f6f7fb'; ctx.fill(); if (sel) { ctx.strokeStyle = VIO; ctx.lineWidth = 2; D.roundRect(r.x + 8, y, r.w - 16, 64, 10); ctx.stroke(); }
      T(c0 + 2, y + 26, '실험 ' + (i + 1), 13.5, INK, 'left', 800); T(c0 + 2, y + 50, i === 3 ? '(HI에서)' : '', 11.5, MUTED, 'left', 700);
      T(c0 + 42, y + 21, '', 11, MUTED, 'left', 700);
      [['처음', ex.init, y + 24, MUTED], ['평형', ex.eq, y + 48, INK]].forEach(([nm, arr, yy, col]) => {
        arr.forEach((v, j) => T(c0 + 60 + cw * j + cw / 2, yy, v === 0 ? '0' : fx(v, 4), 13, col, 'center', 800));
      });
      T(c0 + 56, y + 24, '', 10, MUTED, 'right', 700);
    });
    const yy = y0 + 12 + 4 * 70 + 8;
    T(r.x + 14, yy + 6, '위 줄: 처음 · 아래 줄: 평형', 12.5, MUTED, 'left', 800);
    textBlock(r.x + 14, yy + 28, r.w - 28, '처음 농도가 달라도 모두 평형에 도달했어요. 평형 농도는 서로 달라요.', 13.5, INK, 17, 800);
  }

  /* ================= ②④ 규칙 찾기 · 다른 반응 (같은 도구) ================= */
  function drawRuleA(r, sk, e, title) {
    const s = SYS[sk];
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4'); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill();
    T(r.x + 14, r.y + 26, title, PHONE ? 14.5 : 16, INK, 'left', 800);
    T(r.x + r.w - 14, r.y + 26, s.name, 14.5, VIO, 'right', 800);
    const tk = tokens(s.sp, s.role, e, false), cst = isConst(sk, e);
    panel(r.x + 10, r.y + 40, r.w - 20, PHONE ? 86 : 108, 14, '#fff');
    T(r.x + 24, r.y + 40 + (PHONE ? 50 : 62), '값 =', PHONE ? 18 : 20, MUTED, 'left', 800);
    drawFrac(r.x + r.w / 2 + 10, r.y + 40 + (PHONE ? 42 : 52), tk.num, tk.den, PHONE ? 20 : 24);
    const vals = ruleVals(sk, e), labels = s.data.map((d, i) => s.lab + ' ' + (i + 1));
    const cy0 = r.y + 40 + (PHONE ? 86 : 108) + 8;
    barChart({ x: r.x + 4, y: cy0, w: r.w - 8, h: r.h - (cy0 - r.y) - 8 }, vals, labels, cst);
    if (cst) D.label(r.x + r.w / 2, cy0 + 12, '✅ 값이 모두 같아요: ' + fV(vals[0]), { bg: '#14a058', size: 13.5 });
  }
  function drawRuleB(r, sk, e) {
    const s = SYS[sk];
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '값을 계산해 보아요 (평형 농도 대입)', 14, MUTED, 'left', 800);
    let y = r.y + 50; const mx = r.w - 28;
    // 평형 농도 표
    substLines(sk, e).forEach((ln) => { y += textBlock(r.x + 14, y, mx, ln, 13.5, INK, 17, 800) + 8; });
    const cst = isConst(sk, e);
    y += 6; textBlock(r.x + 14, y, mx, cst ? '네 값이 모두 같아요! 이 일정한 값을 <평형 상수 K>라고 해요.'.replace(/[<>]/g, '') : '값이 서로 달라요. 지수를 바꿔 보세요.', 14, cst ? '#0b6b39' : '#b4231f', 18, 800);
  }

  /* ================= ③ 식으로 쓰기 ================= */
  function stepWr(dt) {
    S.wr.fly.forEach((f) => { f.t += dt; }); S.wr.fly = S.wr.fly.filter((f) => f.t < 0.9);
  }
  function drawWriteA(r) {
    const rx = RX[S.wr.rx], e = S.wr.e[S.wr.rx];
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4'); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill();
    T(r.x + 14, r.y + 26, '반응식의 계수 → 평형 상수식의 지수', PHONE ? 14.5 : 16, INK, 'left', 800);
    // 반응식: 계수 버블 + 물질
    panel(r.x + 10, r.y + 40, r.w - 20, PHONE ? 100 : 128, 14, '#fff');
    const ry = r.y + 40 + (PHONE ? 58 : 76);
    // 폭 계산
    const items = []; rx.sp.forEach((nm, i) => items.push({ i, nm, role: rx.role[i] }));
    ctx.save(); ctx.font = D.font(PHONE ? 19 : 22, 800);
    const seg = (it) => 30 + ctx.measureText(it.nm).width + 6;
    const left = items.filter((q) => q.role === 'R'), right = items.filter((q) => q.role === 'P');
    const wL = left.reduce((s, q) => s + seg(q), 0) + (left.length - 1) * 22, wR = right.reduce((s, q) => s + seg(q), 0) + (right.length - 1) * 22;
    ctx.restore();
    const total = wL + wR + 70, sx = r.x + r.w / 2 - total / 2;
    let x = sx;
    const drawSide = (arr) => arr.forEach((q, k) => {
      if (k) { T(x - 11, ry + 7, '+', PHONE ? 19 : 22, MUTED, 'center', 800); }
      const bx = x + 13; S.wr.bub[q.i] = { x: bx, y: ry };
      D.sphere(bx, ry, 13, colOf(q.role) === '#7c3aed' ? '#8b5cf6' : '#f59e0b', { shadow: true, text: String(rx.coef[q.i]), textScale: 1.1 });
      ctx.save(); ctx.font = D.font(PHONE ? 19 : 22, 800); const tw = ctx.measureText(q.nm).width; ctx.restore();
      T(bx + 19, ry + 7, q.nm, PHONE ? 19 : 22, INK, 'left', 800); x += 30 + tw + 6 + 22;
    });
    drawSide(left); x -= 22; D.arrow(x + 6, ry - 4, x + 50, ry - 4, { color: '#7d8aa3', width: 3, head: 10 }); D.arrow(x + 50, ry + 6, x + 6, ry + 6, { color: '#7d8aa3', width: 3, head: 10 }); x += 58; drawSide(right);
    // K 식
    const tk = tokens(rx.sp, rx.role, e, true), py = r.y + 40 + (PHONE ? 100 : 128) + (PHONE ? 66 : 96);
    panel(r.x + 10, r.y + 40 + (PHONE ? 108 : 138), r.w - 20, PHONE ? r.h - 40 - 116 : 232, 14, '#fff');
    T(r.x + 26, py + 2, 'K =', PHONE ? 22 : 26, MUTED, 'left', 800);
    S.wr.slots = {};
    const fr = drawFrac(r.x + r.w / 2 + 14, py - 10, tk.num, tk.den, PHONE ? 22 : 28, { slots: S.wr.slots });
    void fr;
    // 정답이면 도장
    const okNow = e.every((v, i) => v === rx.coef[i]);
    const ny = r.y + 40 + (PHONE ? 108 : 138) + (PHONE ? r.h - 40 - 116 : 232) - 14;
    T(r.x + r.w / 2, ny, okNow ? '✅ 계수와 지수가 같아요!' : '지수를 계수와 비교해 보세요', 14.5, okNow ? '#0b6b39' : MUTED, 'center', 800);
    if (!PHONE) { T(r.x + 24, r.y + r.h - 70, '■ 생성물 → 분자 (보라색)', 14, '#7c3aed', 'left', 800); T(r.x + 24, r.y + r.h - 44, '■ 반응물 → 분모 (주황색)', 14, '#d97706', 'left', 800); T(r.x + 24, r.y + r.h - 18, '■ 계수 → 지수 (빨간색)', 14, '#b4231f', 'left', 800); }
    // 날아가는 계수
    S.wr.fly.forEach((f) => { if (f.t < 0) return; const p = easeOut(clamp(f.t / 0.7, 0, 1)), x1 = f.x0 + (f.x1 - f.x0) * p, y1 = f.y0 + (f.y1 - f.y0) * p - Math.sin(p * Math.PI) * 38; D.sphere(x1, y1, 11 - 3 * p, '#e2464b', { shadow: true, text: String(f.n), textScale: 1.1 }); if (f.t > 0.6 && f.t < 0.72 && !RM) parts.burst(f.x1, f.y1, { count: 6, speed: 60, size: 2.4, gravity: 0, colors: ['#ffd447', '#e2464b'] }); });
  }
  function drawWriteB(r) {
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '일반식', 14, MUTED, 'left', 800);
    T(r.x + r.w / 2, r.y + 62, 'aA + bB ⇌ cC + dD', PHONE ? 19 : 21, INK, 'center', 800);
    T(r.x + 24, r.y + 126, 'K =', 22, MUTED, 'left', 800);
    drawFrac(r.x + r.w / 2 + 16, r.y + 116, [{ t: '[C]', e: 'c', col: '#7c3aed' }, { t: '[D]', e: 'd', col: '#7c3aed' }], [{ t: '[A]', e: 'a', col: '#d97706' }, { t: '[B]', e: 'b', col: '#d97706' }], 22);
    let y = r.y + 188;
    y += textBlock(r.x + 14, y, r.w - 28, '• 생성물의 농도(분자) / 반응물의 농도(분모)', 13.5, INK, 17, 800) + 4;
    y += textBlock(r.x + 14, y, r.w - 28, '• 각 농도에 계수를 지수로 써요', 13.5, INK, 17, 800) + 4;
    y += textBlock(r.x + 14, y, r.w - 28, '• 기체도 몰 농도로 나타내요 (압력 평형 상수는 다루지 않아요)', 13.5, INK, 17, 800) + 4;
    textBlock(r.x + 14, y, r.w - 28, '• 반응식을 거꾸로 쓰면 분자와 분모가 바뀌어요 (역수)', 13.5, INK, 17, 800);
  }
  function fStr(sp, role, e) {
    const f = (P) => sp.map((x, i) => (role[i] === P && e[i] > 0 ? '[' + x + ']' + (e[i] > 1 ? SUP(e[i]) : '') : '')).filter(Boolean);
    const nu = f('P'), de = f('R');
    return (nu.length ? nu.join('') : '1') + (de.length ? ' ÷ ' + (de.length > 1 ? '(' + de.join('') + ')' : de[0]) : '');
  }
  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'data') {
      const ex = EXPS[S.da.sel], p = ease2(S.da.prog);
      L1 = '고른 실험'; a = '실험 ' + (S.da.sel + 1) + (S.da.sel === 3 ? ' (HI에서)' : '');
      L2 = '[H₂] · [I₂] · [HI]'; b = ex.init.map((v, j) => fx(v + (ex.eq[j] - v) * p, 4)).join(' · ');
      L3 = '평형을 확인한 실험'; c = S.da.seen.filter(Boolean).length + ' / 4';
    } else if (S.mode === 'rule' || S.mode === 'other') {
      const sk = S.mode === 'rule' ? 'hi' : S.ot.sys, e = S.mode === 'rule' ? S.rl.e : S.ot.e[sk], s = SYS[sk], v = ruleVals(sk, e);
      L1 = '시험 중인 식'; a = fStr(s.sp, s.role, e); L2 = '값 (' + s.lab + ' 순서)'; b = v.map(fV).join(' · ');
      L3 = '판정'; c = isConst(sk, e) ? '모두 같아요: ' + fV(v[0]) : '값이 달라요';
    } else {
      const rx = RX[S.wr.rx], e = S.wr.e[S.wr.rx], nOk = e.filter((v, i) => v === rx.coef[i]).length;
      L1 = '반응식'; a = rx.name; L2 = 'K 식'; b = fStr(rx.sp, rx.role, e); L3 = '계수와 같은 지수'; c = nOk + ' / ' + rx.sp.length;
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const wrOK = (k) => S.wr.e[k].every((v, i) => v === RX[k].coef[i]);
  const levels = [
    {
      title: '자료 읽기: 처음과 평형 농도', short: '자료 읽기', icon: '📋', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 출발 농도가 달라도 평형에서 어떤 숫자는 늘 같을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 평형에서는 농도가 일정하고 정반응 속도와 역반응 속도가 같다고 배웠어요. 이번에는 처음 농도를 바꾸면 평형 농도가 어떻게 달라지는지 자료로 찾아봐요.</div>' +
        '<p>농도 [A]는 <b>1 L 속 A의 몰 수</b>(mol/L)예요. 일정한 온도 T에서 <b>H₂ + I₂ ⇌ 2HI</b>의 실험 네 가지를 살펴봐요. 실험 4는 반대 방향, 생성물 HI에서 출발해요.</p>',
      features: ['data'],
      setup() { S.gate = ''; S.da.seen = [false, false, false, false]; daSelect(0); setScene('data'); },
      recap: '처음 농도가 달라도, 생성물에서 출발해도 평형에 도달해요. 평형 농도는 실험마다 달라요. 반응한 양의 비는 계수비(1 : 1 : 2)예요.',
      summary: '<ul><li>H₂ + I₂ ⇌ 2HI (일정한 온도): 네 실험 모두 평형에 도달하고, 평형 농도는 <b>실험마다 달라요</b>.</li><li>실험 4처럼 반대 방향(HI)에서 출발해도 평형에 도달해요.</li><li>반응한 양의 비는 계수비: H₂ 0.0100 감소 → I₂ 0.0100 감소 → HI <b>0.0200</b> 증가 (1 : 1 : 2).</li></ul>',
      missions: [
        {
          title: '네 실험의 평형 농도 확인하기',
          goal: '실험 1~4를 차례로 고르고 <b>▶ 평형까지 보기</b>를 눌러, 네 실험 모두 평형에 도달하는 것을 확인해요.',
          hint: '실험 단추를 누른 뒤 ▶ 평형까지 보기를 눌러요. 막대가 평형 값까지 움직이면 ✅가 돼요.',
          setup() { S.gate = ''; S.da.seen = [false, false, false, false]; daSelect(0); setScene('data'); },
          check: () => S.da.seen.every(Boolean), hold: 0.4,
          status: () => S.da.seen.map((v, i) => mark(v) + ' 실험 ' + (i + 1)).join(' &nbsp; '),
          explain: '네 실험의 평형 농도는 모두 달라요(예: 실험 1의 HI 0.0200, 실험 2의 HI 0.0400). 그래도 실험 4처럼 HI에서 출발해도 평형에 도달해요.',
        },
        {
          title: '반응한 양 계산하기', manual: true,
          goal: '실험 1에서 H₂가 <b>0.0100</b> 감소했을 때, 실험 3에서 H₂가 <b>0.0500</b> 감소했을 때 HI는 각각 얼마나 증가했을지 써요.',
          hint: '반응식 H₂ + I₂ ⇌ 2HI에서 H₂ 1몰이 반응하면 HI는 2몰이 생겨요. 계수의 비를 이용해요.',
          setup() { S.gate = 'dlt'; $('#d1').value = ''; $('#d3').value = ''; setScene('data'); updateCtl(); },
          check() {
            const a = parseNum($('#d1').value), b = parseNum($('#d3').value);
            if (isNaN(a) || isNaN(b)) return '두 칸에 숫자를 써 주세요.';
            const oa = Math.abs(a - 0.02) < 0.0003, ob = Math.abs(b - 0.1) < 0.0003;
            mark2($('#d1'), oa ? 'ok' : 'bad'); mark2($('#d3'), ob ? 'ok' : 'bad');
            return oa && ob ? true : '반응한 양의 비는 계수비 H₂ : HI = 1 : 2예요. HI는 H₂ 감소량의 2배가 증가해요.';
          },
          status: () => '실험 1: ' + ($('#d1').value || '?') + ' · 실험 3: ' + ($('#d3').value || '?'),
          explain: '계수비 H₂ : I₂ : HI = 1 : 1 : 2이므로 H₂가 0.0100 감소하면 I₂도 0.0100 감소하고 HI는 <b>0.0200</b> 증가해요. 실험 3: H₂ 0.0900 → 0.0400(−0.0500)이므로 HI는 <b>0.1000</b> 증가해요. 표의 평형 농도와 일치해요.',
        },
        {
          type: 'quiz', title: '처음 농도가 달라도 평형에 도달할까?',
          goal: '네 실험 자료로 알 수 있는 것은?',
          setup() { S.gate = ''; setScene('data'); },
          choices: ['처음 농도가 같을 때만 평형에 도달해요', '처음 농도가 달라도, 생성물(HI)에서 출발해도 평형에 도달하고, 평형 농도는 실험마다 달라요', '평형에 도달하면 모든 실험의 평형 농도가 똑같아져요', '생성물에서 출발하면 반응이 일어나지 않아요'],
          answer: 1,
          feedback: ['처음 농도가 서로 달랐던 네 실험이 모두 평형에 도달했어요.', '', '실험 1~4의 평형 농도는 서로 달랐어요. 표를 다시 보세요.', '실험 4는 HI만 넣었는데도 H₂와 I₂가 생기면서 평형에 도달했어요.'],
          explain: '출발 농도와 방향이 달라도 평형에 도달하고, 평형 농도는 <b>실험마다 달라요</b>. 그런데도 평형 농도 사이에는 어떤 규칙이 숨어 있어요. 다음 단계에서 찾아봐요.',
        },
      ],
    },
    {
      title: '규칙 찾기: 늘 같은 값이 나오는 식', short: '규칙 찾기', icon: '🔍', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 평형 농도는 실험마다 모두 달랐어요. 농도들을 계산하면 늘 같은 값이 나오는 식이 있을까요?</div>' +
        '<p>세 가지 <b>후보 식</b>에 네 실험의 평형 농도를 넣어 값을 비교해요. <b>네 막대의 높이가 같으면</b> 일정한 식이에요. 지수 단추로 직접 식을 바꿔 볼 수도 있어요.</p>',
      features: ['rule'],
      setup() { S.gate = ''; S.rl = { e: [1, 0, 1], tested: { A: true }, pick: '' }; $('#selRule').value = ''; setScene('rule'); },
      recap: '[HI]² ÷ ([H₂][I₂])의 값은 네 실험 모두 25로 같았어요. 이렇게 평형에서 일정한 값을 <b>평형 상수 K</b>라고 해요.',
      summary: '<ul><li>후보 식의 값 (실험 1 · 2 · 3 · 4): [HI]÷[H₂] = 5.0 · 5.0 · 2.5 · 5.0 (일정 ✕), [HI]÷([H₂][I₂]) = 1250 · 625 · 250 · 1000 (✕), <b>[HI]²÷([H₂][I₂]) = 25 · 25 · 25 · 25 (○)</b></li><li>같은 온도에서 평형 농도로 만든 이 값은 <b>처음 농도와 관계없이 일정</b>해요. 이 값이 <b>평형 상수 K</b>예요 (이 반응은 K = 25).</li><li>계수 2인 HI는 <b>제곱</b>해서 곱해야 일정해요.</li><li>역수 [H₂][I₂] ÷ [HI]² = 0.04도 일정해요.</li></ul>',
      missions: [
        {
          title: '후보 식 3개 모두 시험하기',
          goal: '<b>세 후보 식</b>을 각각 눌러 네 실험의 값이 같은 높이인지 확인해요.',
          hint: '후보 식 단추를 하나씩 눌러 보세요. 막대 높이가 모두 같으면 초록색이 돼요.',
          setup() { S.gate = ''; S.rl = { e: [1, 0, 1], tested: { A: true }, pick: '' }; setScene('rule'); updateCtl(); },
          check: () => CAND.every((c) => S.rl.tested[c.key]), hold: 0.4,
          status: () => CAND.map((c) => mark(S.rl.tested[c.key]) + ' ' + c.label).join('<br>'),
          explain: '[HI]÷[H₂]와 [HI]÷([H₂][I₂])는 실험마다 값이 달랐지만, <b>[HI]² ÷ ([H₂][I₂])</b>는 네 실험 모두 <b>25</b>로 같았어요.',
        },
        {
          title: '일정한 식 고르기', manual: true,
          goal: '네 실험에서 값이 <b>모두 같은</b> 식을 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '막대 높이가 같고 “값이 모두 같아요”라고 나오는 식이에요.',
          setup() { S.gate = 'pick'; $('#selRule').value = ''; S.rl.pick = ''; setScene('rule'); updateCtl(); },
          check() {
            if (!S.rl.pick) return '식을 하나 골라 주세요.';
            const ok = S.rl.pick === 'C'; mark2($('#selRule'), ok ? 'ok' : 'bad');
            return ok ? true : '그 식의 값은 실험마다 달라요. 후보 식을 눌러 막대 높이를 비교해 보세요.';
          },
          status: () => '고른 식: ' + (S.rl.pick ? (S.rl.pick === 'none' ? '일정한 식이 없어요' : CAND.find((c) => c.key === S.rl.pick).label) : '아직 없어요'),
          explain: '일정한 식은 <b>[HI]² ÷ ([H₂][I₂]) = 25</b>예요. 처음 농도가 달라도, 반대 방향(실험 4)에서 출발해도 같은 값이 나와요.',
        },
        {
          type: 'quiz', title: '일정한 값 25의 의미',
          goal: '[HI]² ÷ ([H₂][I₂]) = 25가 의미하는 것은?',
          setup() { S.gate = ''; setScene('rule'); },
          choices: ['실험 1에서만 성립하는 우연한 값이에요', '같은 온도에서는 처음 농도와 관계없이 평형에서 늘 같은 값(평형 상수 K)이에요', '반응이 25초 만에 끝난다는 뜻이에요', 'HI가 H₂보다 25배 많다는 뜻이에요'],
          answer: 1,
          feedback: ['네 실험 모두 25였어요. 우연이 아니에요.', '', '반응 시간과는 관계없는 농도에서 얻은 값이에요.', 'HI와 H₂의 농도비는 실험마다 달랐어요([HI]÷[H₂] = 5, 2.5 …).'],
          explain: '일정한 온도에서 평형 농도로 계산한 이 값은 <b>처음 농도와 관계없이 늘 같아요</b>. 이를 <b>평형 상수(K)</b>라고 해요.',
        },
      ],
    },
    {
      title: '식으로 쓰기: 계수가 지수로', short: '식으로 쓰기', icon: '✍️', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 2HI의 계수 2가 [HI]의 제곱이 되었어요. 다른 반응도 같은 규칙으로 쓸 수 있을까요?</div>' +
        '<p>일반식 <b>aA + bB ⇌ cC + dD</b>에서 평형 상수는 <b>K = [C]ᶜ[D]ᵈ ÷ ([A]ᵃ[B]ᵇ)</b>예요. <b>생성물이 분자, 반응물이 분모</b>이고 계수가 지수가 돼요. 기체도 몰 농도로 쓰고, 압력 평형 상수는 다루지 않아요.</p>',
      features: ['write'],
      setup() { S.gate = ''; S.wr = { rx: 0, e: [[1, 1], [1, 1, 1], [1, 1, 1]], ok: [false, false, false], fly: [], slots: {}, bub: {} }; setScene('write'); },
      recap: '평형 상수식은 K = (생성물 농도의 곱) ÷ (반응물 농도의 곱)이고, 각 농도에 계수를 지수로 써요. 반응식을 거꾸로 쓰면 K 식의 분자와 분모가 바뀌어요.',
      summary: '<ul><li>aA + bB ⇌ cC + dD → <b>K = [C]ᶜ[D]ᵈ ÷ ([A]ᵃ[B]ᵇ)</b> (생성물이 분자, 반응물이 분모, 계수가 지수)</li><li>2NO₂ ⇌ N₂O₄ → K = [N₂O₄] ÷ [NO₂]²</li><li>N₂ + 3H₂ ⇌ 2NH₃ → K = [NH₃]² ÷ ([N₂][H₂]³)</li><li>2SO₂ + O₂ ⇌ 2SO₃ → K = [SO₃]² ÷ ([SO₂]²[O₂])</li><li>평형 상수는 농도로만 나타내요 (압력 평형 상수는 다루지 않아요).</li></ul>',
      missions: [
        {
          title: '세 반응의 K 식 쓰기', manual: true,
          goal: '<b>세 반응식</b>마다 각 물질의 <b>지수</b>를 알맞게 정해 K 식을 완성하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '반응식의 계수가 지수가 돼요. 지수를 맞추면 계수가 지수로 날아가요. 반응식을 바꾸려면 위의 단추를 눌러요.',
          setup() { S.gate = ''; S.wr = { rx: 0, e: [[1, 1], [1, 1, 1], [1, 1, 1]], ok: [false, false, false], fly: [], slots: {}, bub: {} }; setScene('write'); updateCtl(); },
          check() {
            const bad = [0, 1, 2].filter((k) => !wrOK(k)); S.wr.ok = [0, 1, 2].map(wrOK); updateCtl();
            return bad.length ? '아직 ' + bad.map((k) => RX[k].name).join(', ') + '의 지수가 알맞지 않아요. 계수와 비교해 보세요.' : true;
          },
          status: () => RX.map((r, k) => mark(wrOK(k)) + ' ' + r.name).join('<br>'),
          explain: '<b>2NO₂ ⇌ N₂O₄</b>: K = [N₂O₄] ÷ [NO₂]² (분자 · 분모가 앞의 반응과 반대예요). <b>N₂ + 3H₂ ⇌ 2NH₃</b>: K = [NH₃]² ÷ ([N₂][H₂]³). <b>2SO₂ + O₂ ⇌ 2SO₃</b>: K = [SO₃]² ÷ ([SO₂]²[O₂]).',
        },
        {
          type: 'quiz', title: '계수 3은 몇 제곱으로?',
          goal: 'N₂ + 3H₂ ⇌ 2NH₃의 평형 상수식에서 [H₂]에 쓰는 지수는?',
          setup() { S.gate = ''; S.wr.rx = 1; setScene('write'); },
          choices: ['1제곱', '2제곱', '3제곱', '3배'],
          answer: 2,
          feedback: ['H₂의 계수가 3이므로 지수도 3이에요.', '2는 NH₃의 계수예요. 각 물질의 계수를 그 물질의 지수로 써요.', '', '배가 아니라 거듭제곱이에요: [H₂]³ = [H₂] × [H₂] × [H₂].'],
          explain: 'H₂의 계수가 3이므로 <b>[H₂]³</b>이에요. K = [NH₃]² ÷ ([N₂][H₂]³).',
        },
      ],
    },
    {
      title: '다른 반응: 내 식이 맞는지 확인', short: '다른 반응', icon: '🧪', phase: '확인',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 계수를 지수로 쓰는 K 식을 만들었어요. 이 식이 다른 반응의 평형 농도 자료에서도 일정한지 확인해요.</div>' +
        '<p><b>N₂O₄ ⇌ 2NO₂</b>(25 °C)와 <b>N₂ + 3H₂ ⇌ 2NH₃</b>(가상의 온도)의 평형 농도 자료예요. 지수를 계수와 같게 쓰면 값이 일정하고, 틀리게 쓰면 값이 달라지는 것을 눈으로 확인해요.</p>',
      features: ['other'],
      setup() { S.gate = ''; S.ot = { sys: 'no2', e: { no2: [1, 1], nh3: [1, 1, 1] }, wrongSeen: false, rightSeen: { no2: false, nh3: false } }; setScene('other'); },
      recap: '반응식의 계수를 지수로 쓴 식만 모든 자료에서 같은 값을 줘요. N₂O₄ ⇌ 2NO₂는 K = 0.0060, N₂ + 3H₂ ⇌ 2NH₃는 K = 0.50이에요.',
      summary: '<ul><li>N₂O₄ ⇌ 2NO₂ (25 °C): [NO₂]² ÷ [N₂O₄] = 0.0060 · 0.0060 · 0.0060 → <b>K = 0.0060</b></li><li>N₂ + 3H₂ ⇌ 2NH₃: [NH₃]² ÷ ([N₂][H₂]³) = 0.50 (모든 자료). [H₂]를 2제곱으로 쓰면 값이 1.0 · 0.50 · 2.0 …으로 달라져요.</li><li>그래서 평형 상수식의 지수는 <b>반응식의 계수</b>예요.</li></ul>',
      missions: [
        {
          title: '지수를 틀리게도, 맞게도 써 보기',
          goal: '<b>N₂ + 3H₂ ⇌ 2NH₃</b>를 고르고 [H₂]의 지수를 <b>2</b>로 써서 값이 달라지는 것을 본 뒤, <b>계수와 같게</b> 고쳐 값이 일정해지는 것을 확인해요.',
          hint: '반응 단추에서 N₂ + 3H₂ ⇌ 2NH₃를 고르고, [NH₃] 지수 2, [H₂] 지수 2(틀림) → 3(맞음)으로 바꿔 보세요. [N₂]는 1이에요.',
          setup() { S.gate = ''; S.ot = { sys: 'nh3', e: { no2: [1, 1], nh3: [1, 1, 1] }, wrongSeen: false, rightSeen: { no2: false, nh3: false } }; setScene('other'); updateCtl(); },
          check: () => S.ot.wrongSeen && S.ot.rightSeen.nh3, hold: 0.4,
          status: () => mark(S.ot.wrongSeen) + ' [H₂]를 2제곱으로 써 봄 &nbsp; ' + mark(S.ot.rightSeen.nh3) + ' 계수와 같게 씀',
          explain: '[H₂]를 2제곱으로 쓰면 [NH₃]²÷([N₂][H₂]²)의 값이 1.0 · 0.50 · 2.0 · 2.0처럼 자료마다 달라져요. <b>3제곱</b>으로 써야 모든 자료에서 0.50으로 같아요.',
        },
        {
          title: '두 반응의 K 구하기', manual: true,
          goal: '<b>N₂O₄ ⇌ 2NO₂</b>와 <b>N₂ + 3H₂ ⇌ 2NH₃</b>의 평형 상수 K를 구해 써요. 식은 반응식의 계수에서 정해져요.',
          hint: 'N₂O₄ ⇌ 2NO₂: [NO₂]² ÷ [N₂O₄]. N₂ + 3H₂ ⇌ 2NH₃: [NH₃]² ÷ ([N₂][H₂]³). 자료 하나만 대입해도 돼요.',
          setup() { S.gate = 'kk'; $('#kA').value = ''; $('#kB').value = ''; setScene('other'); updateCtl(); },
          check() {
            const a = parseNum($('#kA').value), b = parseNum($('#kB').value);
            if (isNaN(a) || isNaN(b)) return '두 칸에 숫자를 써 주세요.';
            const oa = Math.abs(a - 0.006) <= 0.0003, ob = Math.abs(b - 0.5) <= 0.02;
            mark2($('#kA'), oa ? 'ok' : 'bad'); mark2($('#kB'), ob ? 'ok' : 'bad');
            return oa && ob ? true : '식의 지수를 계수와 맞춘 뒤 자료 하나의 평형 농도를 대입해 보세요. (예: 0.012² ÷ 0.024)';
          },
          status: () => 'N₂O₄ ⇌ 2NO₂: ' + ($('#kA').value || '?') + ' · N₂ + 3H₂ ⇌ 2NH₃: ' + ($('#kB').value || '?'),
          explain: 'N₂O₄ ⇌ 2NO₂: 0.012² ÷ 0.024 = <b>0.0060</b>. N₂ + 3H₂ ⇌ 2NH₃: 2.0² ÷ (1.0 × 2.0³) = <b>0.50</b>. 단위는 생략해요.',
        },
        {
          type: 'quiz', title: '계수를 지수로 쓰는 까닭',
          goal: '평형 상수식에서 반응식의 계수를 지수로 쓰는 까닭을 자료로 가장 알맞게 설명한 것은?',
          setup() { S.gate = ''; setScene('other'); },
          choices: ['외우기 쉽게 정한 약속일 뿐이에요', '[H₂]를 2제곱으로 쓰면 값이 자료마다 달라지고, 계수와 같은 3제곱으로 써야 모든 자료에서 같은 값이 나오기 때문이에요', '지수는 항상 1이어야 값이 일정해져요', '반응물의 농도에는 지수를 쓰지 않아요'],
          answer: 1,
          feedback: ['약속이 아니라 자료에서 발견한 규칙이에요. 틀린 지수를 쓰면 값이 달라졌죠.', '', '지수를 모두 1로 쓰면 값이 자료마다 달라져요. 직접 해 봤죠?', '반응물은 분모에 지수와 함께 써요.'],
          explain: '계수와 같은 지수를 써야 <b>모든 자료에서 값이 같아져요</b>. 이것이 평형 농도 사이의 규칙이고, 그 일정한 값이 <b>평형 상수 K</b>예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-eq-ratio', mount: '#game', badge: '규칙 발견자', homeHref: '../../index.html#hc',
    featureLabels: { data: '📋 평형 농도 자료와 막대', rule: '🔍 후보 식 시험 · 지수 단추', write: '✍️ 계수가 지수로 날아가는 K 식', other: '🧪 다른 반응의 평형 농도 자료' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  daSelect(0); setScene('data');
  function stepAll1(dt) { stepDa(dt); stepWr(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'data') { drawDataA(SPL.A); drawDataB(SPL.B); }
    else if (S.mode === 'rule') { drawRuleA(SPL.A, 'hi', S.rl.e, '🔍 네 실험에 같은 식을 넣어요'); drawRuleB(SPL.B, 'hi', S.rl.e); }
    else if (S.mode === 'write') { drawWriteA(SPL.A); drawWriteB(SPL.B); }
    else { drawRuleA(SPL.A, S.ot.sys, S.ot.e[S.ot.sys], '🧪 다른 반응에서 확인해요'); drawRuleB(SPL.B, S.ot.sys, S.ot.e[S.ot.sys]); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SPL, SYS, RX, EXPS, get game() { return game; }, setScene, setExp, daSelect, ruleVals, isConst, buildSteppers,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
