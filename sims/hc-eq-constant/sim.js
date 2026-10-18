/* =========================================================
   화학 Ⅲ. 화학 평형 - 평형 상수 [12화학03-02] (단원 4차시)
   ① 분석: 농도 변화표 (처음 · 변화 · 평형, 변화량의 비 = 계수비, K 계산)
   ② 설명: K의 크기 (K ≫ 1 · K ≪ 1, 같은 K 다른 속도)
   ③ 탐구: 온도와 K (처음 농도 · 부피는 K 그대로, 온도가 바뀌면 K 변화)
   ④ 적용: K 뒤집기 (K′ = 1/K)
   평형 농도를 K로부터 구하는 일반적인 이차 방정식 풀이와 압력 평형 상수는 다루지 않아요.
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
  // 농도 변화표 예제 (mol/L): 처음, 평형 농도에서 변화 = 평형 − 처음
  const EX = [
    { id: '①', name: 'N₂O₄ ⇌ 2NO₂ (25 °C)', sp: ['N₂O₄', 'NO₂'], role: ['R', 'P'], coef: [1, 2], init: [0.030, 0], eq: [0.024, 0.012], giv: 0, dec: 3 },
    { id: '②', name: 'H₂ + I₂ ⇌ 2HI', sp: ['H₂', 'I₂', 'HI'], role: ['R', 'R', 'P'], coef: [1, 1, 2], init: [0.0140, 0.0140, 0], eq: [0.0040, 0.0040, 0.0200], giv: 2, dec: 4 },
    { id: '③', name: '2SO₂ + O₂ ⇌ 2SO₃', sp: ['SO₂', 'O₂', 'SO₃'], role: ['R', 'R', 'P'], coef: [2, 1, 2], init: [0.40, 0.20, 0], eq: [0.20, 0.10, 0.20], giv: 2, dec: 2 },
    { id: '④', name: 'N₂ + 3H₂ ⇌ 2NH₃', sp: ['N₂', 'H₂', 'NH₃'], role: ['R', 'R', 'P'], coef: [1, 3, 2], init: [1.0, 3.0, 0], eq: [0.80, 2.40, 0.40], giv: 2, dec: 2 },
  ];
  EX.forEach((e) => { e.delta = e.eq.map((v, i) => r6(v - e.init[i])); let k = 1; e.eq.forEach((c, i) => { k *= Math.pow(c, e.role[i] === 'P' ? e.coef[i] : -e.coef[i]); }); e.K = k; });
  const tolOf = (e) => 0.5 * Math.pow(10, -e.dec) + 1e-9;
  const SG = (v, dec) => (v > 0 ? '+' : v < 0 ? '−' : '') + fx(Math.abs(v), dec);
  const KF = (k) => (k >= 100 || k < 0.001 ? sci(k, 1) : k.toPrecision(2));            // K 표시: 0.0060, 10, 25, 0.50, 1.7×10² …
  const KDISP = (e) => (e.K > 0.01 && e.K < 0.02 ? sci(e.K, 1) : KF(e.K));
  // 두 번째 장면: A ⇌ B 모형 (처음 [A] = 1.0 mol/L)
  const KEXP = [-3, -2, -1, 0, 1, 2, 3];
  const kVal = (x) => Math.pow(10, x);
  const comp = (K) => ({ A: 1 / (1 + K), B: K / (1 + K) });
  const KFMT = (x) => (x < 0 ? '10' + SUP(x) : x === 0 ? '1' : x === 1 ? '10' : '10' + SUP(x));
  const KNUM = (x) => (x < 0 ? String(+(Math.pow(10, x)).toFixed(3)) : String(Math.pow(10, x)));
  const SPD = { A: { lam: 0.5, name: '빠른 반응' }, B: { lam: 0.1, name: '느린 반응' } };  // 두 반응 모두 K = 4: [B]eq = 0.80 mol/L
  const SP_K = 4, SP_EQ = SP_K / (1 + SP_K), SP_T = 40;
  const t95 = (lam) => Math.log(20) / lam;
  // 온도와 K: N₂O₄ ⇌ 2NO₂ (흡열 반응)
  const KT = { 25: 0.0060, 100: 0.50 };
  function eqOf(c0, K) { const x = (-K + Math.sqrt(K * K + 16 * K * c0)) / 8; return { n: c0 - x, m: 2 * x }; }
  const C0S = [{ id: 'a', lab: '0.030', c: 0.030 }, { id: 'b', lab: '0.060', c: 0.060 }, { id: 'c', lab: '0.090', c: 0.090 }, { id: 'v', lab: '0.030에서 부피 ½', c: 0.060 }];
  // K 뒤집기
  const FP = [
    { fw: 'N₂O₄ ⇌ 2NO₂', bw: '2NO₂ ⇌ N₂O₄', K: 0.0060, fwF: '[NO₂]² ÷ [N₂O₄]', bwF: '[N₂O₄] ÷ [NO₂]²', fwT: 'N₂O₄', bwT: 'NO₂' },
    { fw: 'H₂ + I₂ ⇌ 2HI', bw: '2HI ⇌ H₂ + I₂', K: 25, fwF: '[HI]² ÷ ([H₂][I₂])', bwF: '[H₂][I₂] ÷ [HI]²', fwT: 'HI', bwT: 'H₂·I₂' },
    { fw: '2SO₂ + O₂ ⇌ 2SO₃', bw: '2SO₃ ⇌ 2SO₂ + O₂', K: 10, fwF: '[SO₃]² ÷ ([SO₂]²[O₂])', bwF: '([SO₂]²[O₂]) ÷ [SO₃]²', fwT: 'SO₃', bwT: 'SO₂·O₂' },
  ];
  const SPL = split(0.6, 0.5);

  const S = {
    mode: 'ice', t: 0, fade: 0, gate: '',
    ic: { ex: 0, vals: EX.map(() => ({})), ok: EX.map(() => ({})), prog: 0, tgt: 0, seen: false },
    sz: { sub: 'slider', exp: 0, kv: new SciSim.Spring(0, { stiffness: 150, damping: 16 }), seenProd: false, seenReact: false, seenRxn: false, sp: { run: false, t: 0, done: { A: -1, B: -1 } }, rxnAnim: 0 },
    tp: { c0: 'a', T: 25, run: false, prog: 0, recs: [], temp: 25, kd: 0.0060, flash: 0 },
    fl: { i: 0, flip: [0, 0, 0], ph: [0, 0, 0], seen: [false, false, false] },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { ice: '📋 농도 변화표', size: '📏 K의 크기', temp: '🌡 온도와 K', flip: '🔄 K 뒤집기' };
  const bgPanel = (r) => { const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4'); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill(); };
  const niceMax = (mx) => { const p = Math.pow(10, Math.floor(Math.log10(mx))); const c = [1, 2, 2.5, 5, 10].map((k) => k * p).find((v) => v >= mx * 0.9999); return c || mx; };

  /* ---------- 공통 UI ---------- */
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl(); }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = S.sz.sub === n.getAttribute('data-sub');
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#exChips button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.ic.ex); b.classList.toggle('done', iceDone(k)); });
    $$('#subSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sz.sub));
    $$('#c0Chips button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.tp.c0); b.classList.toggle('done', S.tp.recs.some((r) => r.c0 === b.dataset.v)); });
    $$('#tSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.tp.T));
    $$('#fpChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.fl.i); b.classList.toggle('done', S.fl.seen[+b.dataset.v]); });
    $('#kMinus').disabled = S.sz.exp <= -3; $('#kPlus').disabled = S.sz.exp >= 3;
    $('#kOut').textContent = 'K = ' + KNUM(S.sz.exp);
    $('#bIcePlay').disabled = S.ic.tgt > 0.5 && S.ic.prog < 1; $('#bIcePlay').textContent = S.ic.prog >= 1 ? '↺ 다시 보기' : S.ic.tgt > 0.5 ? '진행 중…' : '▶ 평형까지 보기';
    const sp = S.sz.sp; $('#bSpRun').disabled = sp.run || sp.t >= SP_T; $('#bSpRun').textContent = sp.run ? '반응하는 중…' : sp.t >= SP_T ? '✔ 기록 완료' : '▶ 두 반응 시작';
    const tp = S.tp; $('#bTRun').disabled = tp.run; $('#bTRun').textContent = tp.run ? '반응하는 중…' : '▶ 평형까지';
    $('#bTRec').disabled = tp.run || tp.prog < 1 || tp.recs.some((r) => r.c0 === tp.c0 && r.T === tp.T);
    $('#bTClear').disabled = !tp.recs.length;
    $('#bFlip').textContent = S.fl.flip[S.fl.i] ? '🔄 처음 반응식으로' : '🔄 반응식 뒤집기';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#subSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sz.sub = b.dataset.v; S.fade = 1; if (b.dataset.v === 'rxn') S.sz.seenRxn = true; S.sz.rxnAnim = 0; updateCtl(); }));
  EX.forEach((e, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = e.id + ' ' + e.name.replace(/ \(.*\)/, ''); $('#exChips').appendChild(b); b.addEventListener('click', () => { Sound.click(); iceSelect(i); }); });
  C0S.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = c.id; b.textContent = c.lab + (c.id === 'v' ? '' : ' mol/L'); $('#c0Chips').appendChild(b); b.addEventListener('click', () => { Sound.click(); tpPick(c.id, S.tp.T); }); });
  $$('#tSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); tpPick(S.tp.c0, +b.dataset.v); }));
  FP.forEach((f, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = f.fw; $('#fpChips').appendChild(b); b.addEventListener('click', () => { Sound.click(); S.fl.i = i; updateCtl(); }); });
  $('#kMinus').addEventListener('click', () => kSet(S.sz.exp - 1)); $('#kPlus').addEventListener('click', () => kSet(S.sz.exp + 1));
  $('#kRange').addEventListener('input', (e) => kSet(+e.target.value));
  ['kp1', 'kp2'].forEach((id) => $('#' + id).addEventListener('input', (e) => mark2(e.target, '')));

  /* ================= ① 농도 변화표 ================= */
  const cellKey = (kind, i) => kind + i;
  function cellExpected(e, key) { const k = key[0], i = +key.slice(1); return k === 'd' ? e.delta[i] : e.eq[i]; }
  function cellOK(ei, key) { const e = EX[ei], v = parseNum(S.ic.vals[ei][key]); if (isNaN(v) || S.ic.vals[ei][key] == null || String(S.ic.vals[ei][key]).trim() === '') return false; return Math.abs(v - cellExpected(e, key)) <= tolOf(e); }
  function kOK(ei) { const v = parseNum(S.ic.vals[ei].K), e = EX[ei]; return !isNaN(v) && v > 0 && Math.abs(v - e.K) <= e.K * 0.04; }
  const needCells = (e) => { const c = []; e.sp.forEach((s, i) => { c.push(cellKey('d', i)); if (i !== e.giv) c.push(cellKey('e', i)); }); return c; };
  function iceDone(ei) { const e = EX[ei]; return needCells(e).every((k) => cellOK(ei, k)) && kOK(ei); }
  function iceSelect(i) { S.ic.ex = i; S.ic.prog = 0; S.ic.tgt = 0; buildIce(); updateCtl(); }
  function buildIce() {
    const box = $('#iceBox'); box.innerHTML = ''; const ei = S.ic.ex, e = EX[ei];
    let h = '<table class="ice"><thead><tr><th></th><th>처음</th><th>변화</th><th>평형</th></tr></thead><tbody>';
    e.sp.forEach((s, i) => {
      h += '<tr><td class="nm">' + s + '</td><td class="giv">' + fx(e.init[i], e.dec) + '</td><td><input data-k="d' + i + '" type="text" inputmode="decimal" autocomplete="off" aria-label="' + s + ' 변화"></td>';
      h += i === e.giv ? '<td class="giv">' + fx(e.eq[i], e.dec) + '</td>' : '<td><input data-k="e' + i + '" type="text" inputmode="decimal" autocomplete="off" aria-label="' + s + ' 평형"></td>';
      h += '</tr>';
    });
    h += '</tbody></table><div class="k-row"><span>K =</span><input data-k="K" type="text" inputmode="decimal" autocomplete="off" aria-label="평형 상수 K" placeholder="계산해서 써요"></div>';
    box.innerHTML = h;
    box.querySelectorAll('input').forEach((inp) => {
      const k = inp.dataset.k; if (S.ic.vals[ei][k] != null) inp.value = S.ic.vals[ei][k];
      if (k !== 'K' ? cellOK(ei, k) : kOK(ei)) inp.classList.add('ok');
      inp.addEventListener('input', () => { S.ic.vals[ei][k] = inp.value; mark2(inp, ''); });
      inp.addEventListener('change', () => { const ok = k === 'K' ? kOK(ei) : cellOK(ei, k); mark2(inp, ok ? 'ok' : ''); if (ok) Sound.tick(); updateCtl(); });
    });
  }
  function iceCheckCells(ei) {
    const e = EX[ei], inputs = $('#iceBox').querySelectorAll('input'); let bad = 0, empty = 0;
    if (ei !== S.ic.ex) return;
    inputs.forEach((inp) => {
      const k = inp.dataset.k, val = (S.ic.vals[ei][k] || '').trim(); if (!val) { empty++; return; }
      const ok = k === 'K' ? kOK(ei) : cellOK(ei, k);
      if (ok) mark2(inp, 'ok'); else { bad++; if (!inp.classList.contains('bad')) shake(inp); }
    });
    void e; return { bad, empty };
  }
  $('#bIceChk').addEventListener('click', () => { Sound.click(); const r = iceCheckCells(S.ic.ex); if (r && r.empty) showHint('빈 칸이 ' + r.empty + '개 있어요.', 2500); else if (r && r.bad) showHint(r.bad + '칸을 다시 확인해 보세요. 변화량은 계수비예요.', 3200); else showHint('모두 맞아요!', 2000); updateCtl(); });
  $('#bIcePlay').addEventListener('click', () => { Sound.click(); if (S.ic.prog >= 1) { S.ic.prog = 0; S.ic.tgt = 0; } S.ic.tgt = 1; updateCtl(); });
  function stepIce(dt) { const c = S.ic; if (c.tgt > 0.5 && c.prog < 1) { c.prog = Math.min(1, c.prog + dt / 2.4); if (c.prog >= 1) { c.seen = true; updateCtl(); } } }
  const ease2 = (p) => p * p * (3 - 2 * p);
  function drawIceA(r) {
    const e = EX[S.ic.ex], p = ease2(S.ic.prog);
    bgPanel(r);
    T(r.x + 14, r.y + 26, e.id + ' ' + e.name + ' — 처음 → 평형 (mol/L)', PHONE ? 14 : 15.5, INK, 'left', 800);
    const ym = niceMax(Math.max.apply(null, e.init.concat(e.eq)));
    const P = makePlot({ x: r.x + 4, y: r.y + 40, w: r.w - 8, h: r.h - 56 }, { x0: 0, x1: 1, y0: 0, y1: ym, padL: 62, padR: 14, padT: 22, padB: 54 });
    drawAxes(P, { yticks: [0, ym / 2, ym], yfmt: (v) => fx(v, e.dec) });
    const n = e.sp.length, slot = P.pw / n, bw = Math.min(70, slot * 0.5);
    e.sp.forEach((nm, j) => {
      const x = P.px + slot * j + (slot - bw) / 2, v0 = e.init[j], v1 = e.eq[j], cur = v0 + (v1 - v0) * p, col = e.role[j] === 'P' ? '#7c3aed' : '#f59e0b';
      const yi = P.Y(v0); if (v0 > 0) { ctx.save(); ctx.strokeStyle = '#8895ab'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8; D.roundRect(x, yi, bw, P.py + P.ph - yi, 5); ctx.stroke(); ctx.restore(); }
      const yc = P.Y(cur), h = P.py + P.ph - yc;
      if (h > 0.4) { D.roundRect(x + 5, yc, bw - 10, h, 5); ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 9, yc + 2, 5, Math.max(0, h - 4)); }
      T(x + bw / 2, yc - 7, fx(cur, e.dec), 13.5, INK, 'center', 800);
      T(x + bw / 2, P.py + P.ph + 17, nm, 13.5, INK, 'center', 800);
      T(x + bw / 2, P.py + P.ph + 34, '변화 ' + SG(r6((cur - v0)), e.dec), 12.5, v1 - v0 < 0 ? '#b4231f' : '#0b6b39', 'center', 800);
      T(x + bw / 2, P.py + P.ph + 49, '계수 ' + e.coef[j], 12, MUTED, 'center', 700);
    });
  }
  function drawIceB(r) {
    const ei = S.ic.ex, e = EX[ei];
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '농도 변화표', 14, MUTED, 'left', 800);
    const c0 = r.x + 14, cw = (r.w - 28 - 62) / 3, y0 = r.y + 46;
    ['처음', '변화', '평형'].forEach((h, j) => T(c0 + 62 + cw * j + cw / 2, y0, h, 13.5, INK, 'center', 800));
    e.sp.forEach((s, i) => {
      const y = y0 + 8 + i * 40; D.roundRect(r.x + 8, y, r.w - 16, 34, 8); ctx.fillStyle = '#f6f7fb'; ctx.fill();
      T(c0 + 2, y + 23, s, 14, e.role[i] === 'P' ? '#6d28d9' : '#b45309', 'left', 800);
      T(c0 + 62 + cw / 2, y + 23, fx(e.init[i], e.dec), 13.5, INK, 'center', 800);
      const dOK = cellOK(ei, cellKey('d', i)), eOK = i === e.giv || cellOK(ei, cellKey('e', i));
      T(c0 + 62 + cw * 1.5, y + 23, dOK ? SG(e.delta[i], e.dec) : '?', 13.5, dOK ? (e.delta[i] < 0 ? '#b4231f' : '#0b6b39') : MUTED, 'center', 800);
      T(c0 + 62 + cw * 2.5, y + 23, eOK ? fx(e.eq[i], e.dec) : '?', 13.5, eOK ? INK : MUTED, 'center', 800);
    });
    let y = y0 + 8 + e.sp.length * 40 + 14;
    // K 식 계산
    const allEq = e.sp.every((s, i) => i === e.giv || cellOK(ei, cellKey('e', i)));
    T(r.x + 14, y, '평형 상수식', 13, MUTED, 'left', 800); y += 8;
    const tk = [], dn = []; e.sp.forEach((s, i) => { const t = { t: '[' + s + ']', e: e.coef[i] > 1 ? e.coef[i] : 0 }; (e.role[i] === 'P' ? tk : dn).push(t); });
    const frac = (arr) => arr.map((q) => q.t + (q.e ? SUP(q.e) : '')).join('');
    y += textBlock(r.x + 14, y + 14, r.w - 28, 'K = ' + frac(tk) + ' ÷ ' + (dn.length > 1 ? '(' + frac(dn) + ')' : frac(dn)), 14.5, INK, 18, 800) + 6;
    if (allEq) {
      const num = [], den = []; e.sp.forEach((s, i) => { const t = fx(e.eq[i], e.dec) + (e.coef[i] > 1 ? SUP(e.coef[i]) : ''); (e.role[i] === 'P' ? num : den).push(t); });
      y += textBlock(r.x + 14, y + 14, r.w - 28, '= ' + num.join(' × ') + ' ÷ ' + (den.length > 1 ? '(' + den.join(' × ') + ')' : den[0]), 13.5, INK, 17, 800) + 6;
      if (kOK(ei)) textBlock(r.x + 14, y + 14, r.w - 28, '= ' + KDISP(e) + '  ✅', 18, '#0b6b39', 22, 800);
      else T(r.x + 14, y + 20, '계산해서 K를 써 보세요', 13.5, MUTED, 'left', 800);
    } else T(r.x + 14, y + 20, '표의 ? 칸을 채우면 식에 값이 들어가요', 13.5, MUTED, 'left', 800);
    T(r.x + 14, r.y + r.h - 18, '변화량의 비 = 계수비 (' + e.coef.join(' : ') + ')', 13.5, VIO, 'left', 800);
  }
  /* ================= ② K의 크기 ================= */
  function kSet(x) { x = clamp(Math.round(x), -3, 3); if (x === S.sz.exp) return; Sound.tick(); S.sz.exp = x; S.sz.kv.target = x; $('#kRange').value = x; const c = comp(kVal(x)); if (c.B >= 0.9) S.sz.seenProd = true; if (c.A >= 0.9) S.sz.seenReact = true; updateCtl(); }
  function stepSize(dt) {
    S.sz.kv.update(dt);
    const sp = S.sz.sp;
    if (sp.run) { sp.t = Math.min(SP_T, sp.t + dt * 4); ['A', 'B'].forEach((k) => { if (sp.done[k] < 0 && sp.t >= t95(SPD[k].lam)) { sp.done[k] = t95(SPD[k].lam); Sound.tick(); } }); if (sp.t >= SP_T) { sp.run = false; Sound.success(); updateCtl(); } }
    S.sz.rxnAnim = Math.min(1, S.sz.rxnAnim + dt / 1.2);
  }
  function spReset() { Object.assign(S.sz.sp, { run: false, t: 0, done: { A: -1, B: -1 } }); updateCtl(); }
  $('#bSpRun').addEventListener('click', () => { Sound.click(); S.sz.sp.run = true; updateCtl(); });
  $('#bSpAgain').addEventListener('click', () => { Sound.click(); spReset(); });
  const bConc = (k, t) => SP_EQ * (1 - Math.exp(-SPD[k].lam * t));
  // 입자 점 (A는 주황, B는 보라): 개수가 조성에 따라 정해져요
  const DOTS = []; for (let i = 0; i < 48; i++) DOTS.push({ a: Math.random() * 6, b: Math.random() * 6, fx: rnd(0.4, 1.1), fy: rnd(0.4, 1.1), ox: Math.random(), oy: Math.random() });
  function dotBox(r, nB) {
    panel(r.x, r.y, r.w, r.h, 12, '#fff'); ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.clip();
    DOTS.forEach((d, i) => { const x = r.x + 10 + (0.5 + 0.5 * Math.sin(S.t * d.fx + d.a)) * (r.w - 20), y = r.y + 10 + (0.5 + 0.5 * Math.sin(S.t * d.fy + d.b)) * (r.h - 20); atom(x, y, 6, i < nB ? '#8b5cf6' : '#f59e0b'); });
    ctx.restore(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
  }
  function drawSizeSlider(r) {
    const xk = clamp(S.sz.kv.value, -3, 3), K = Math.pow(10, xk), c = comp(K);
    T(r.x + 14, r.y + 26, 'A ⇌ B 의 평형 조성 (처음 [A] = 1.0 mol/L)', PHONE ? 14 : 15.5, INK, 'left', 800);
    T(r.x + r.w - 14, r.y + 26, 'K = ' + (Math.abs(xk - Math.round(xk)) < 0.02 ? KNUM(Math.round(xk)) : fx(K, K < 1 ? 3 : 1)), 15, VIO, 'right', 800);
    const P = makePlot({ x: r.x + 4, y: r.y + 40, w: r.w * (PHONE ? 0.52 : 0.56), h: r.h - 56 }, { x0: 0, x1: 1, y0: 0, y1: 1, padL: 50, padR: 8, padT: 20, padB: 40 });
    drawAxes(P, { yticks: [0, 0.5, 1], yfmt: (v) => fx(v, 1) });
    [['A', c.A, '#f59e0b', '반응물 A'], ['B', c.B, '#8b5cf6', '생성물 B']].forEach(([k, v, col, nm], i) => {
      const bw = Math.min(54, P.pw * 0.32), x = P.px + P.pw * (0.27 + 0.46 * i) - bw / 2, y = P.Y(v), h = P.py + P.ph - y;
      D.roundRect(x, y, bw, Math.max(0.5, h), 6); ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 5, y + 2, 6, Math.max(0, h - 4));
      T(x + bw / 2, y - 6, fx(v, 3), 13.5, INK, 'center', 800); T(x + bw / 2, P.py + P.ph + 17, nm, 13, INK, 'center', 800);
      T(x + bw / 2, P.py + P.ph + 33, fx(v * 100, 1) + ' %', 12.5, MUTED, 'center', 800);
    });
    const bx = { x: r.x + r.w * (PHONE ? 0.58 : 0.62), y: r.y + 52, w: r.w * (PHONE ? 0.38 : 0.34), h: Math.min(r.h - 120, 250) };
    T(bx.x + bx.w / 2, bx.y - 8, '🔍 입자 모형 (48개)', 12.5, MUTED, 'center', 800);
    dotBox(bx, Math.round(48 * c.B));
    const msg = c.B >= 0.9 ? '생성물 B가 90 % 이상: K가 1보다 훨씬 커요' : c.A >= 0.9 ? '반응물 A가 90 % 이상: K가 1보다 훨씬 작아요' : '두 물질이 모두 꽤 있어요 (K가 1 근처)';
    textBlock(bx.x - 4, bx.y + bx.h + 22, bx.w + 8, msg, 13, INK, 16, 800);
  }
  function drawSizeRxn(r) {
    T(r.x + 14, r.y + 26, '세 반응의 K와 평형 (이 예제에서)', PHONE ? 14 : 15.5, INK, 'left', 800);
    const items = [{ e: EX[0], k: 0.0060, s: 0, lab: '반응한 N₂O₄' }, { e: EX[2], k: 10, s: 0, lab: '반응한 SO₂' }, { e: EX[1], k: 25, s: 0, lab: '반응한 H₂' }];
    items.forEach((q) => { q.f = r6(-q.e.delta[0]) / q.e.init[0]; });
    // 로그 눈금자
    const ry = r.y + 92, rx0 = r.x + 40, rw = r.w - 80;
    D.roundRect(rx0, ry, rw, 10, 5); const g = ctx.createLinearGradient(rx0, 0, rx0 + rw, 0); g.addColorStop(0, '#f59e0b'); g.addColorStop(0.5, '#e5e7ef'); g.addColorStop(1, '#8b5cf6'); ctx.fillStyle = g; ctx.fill();
    [-3, -2, -1, 0, 1, 2, 3].forEach((x) => { const px = rx0 + (x + 3) / 6 * rw; ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, ry + 10); ctx.lineTo(px, ry + 16); ctx.stroke(); T(px, ry + 31, KFMT(x), 12.5, INK, 'center', 800); });
    T(rx0 - 20, ry + 52, '← 반응물이 많아요', 12.5, '#b45309', 'left', 800); T(rx0 + rw + 20, ry + 52, '생성물이 많아요 →', 12.5, '#6d28d9', 'right', 800);
    const anim = easeOut(S.sz.rxnAnim);
    items.forEach((q, i) => {
      const lx = Math.log10(q.k), px = rx0 + (clamp(lx, -3, 3) + 3) / 6 * rw, y0 = ry + 10;
      const cols = ['#e2464b', '#3867f4', '#14a058'];
      ctx.strokeStyle = cols[i]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, y0 - 20 * anim); ctx.lineTo(px, y0 + 4); ctx.stroke(); atom(px, y0 - 22 * anim - 2, 6.5, cols[i]);
    });
    // 카드 3개
    const cw = (r.w - 28 - 16) / 3, cy = ry + 70;
    items.forEach((q, i) => {
      const x = r.x + 14 + i * (cw + 8), h = Math.min(r.h - (cy - r.y) - 12, 220); panel(x, cy, cw, h, 12, '#fff');
      T(x + cw / 2, cy + 22, q.e.id + ' ' + q.e.name.replace(/ \(.*\)/, ''), PHONE ? 11.5 : 12.5, INK, 'center', 800);
      T(x + cw / 2, cy + 46, 'K = ' + KF(q.k), 16, VIO, 'center', 800);
      const bx = x + 12, bw = cw - 24, by = cy + 84; T(x + cw / 2, by - 8, q.lab, 12.5, MUTED, 'center', 800);
      D.roundRect(bx, by, bw, 16, 8); ctx.fillStyle = '#eef0f6'; ctx.fill(); ctx.save(); D.roundRect(bx, by, bw, 16, 8); ctx.clip(); ctx.fillStyle = i === 0 ? '#f59e0b' : '#8b5cf6'; ctx.fillRect(bx, by, bw * q.f * anim, 16); ctx.restore();
      T(x + cw / 2, by + 36, fx(q.f * 100 * anim, 1) + ' %', 15, INK, 'center', 800);
      textBlock(x + 8, by + 58, cw - 16, q.k < 1 ? '반응물이 더 많이 남아요' : '생성물 쪽으로 많이 진행해요', 12.5, INK, 15, 800);
    });
  }
  function drawSizeSpeed(r) {
    T(r.x + 14, r.y + 26, '같은 K = ' + SP_K + ', 다른 속도 (A ⇌ B, 처음 [A] = 1.0)', PHONE ? 14 : 15.5, INK, 'left', 800);
    const sp = S.sz.sp, P = makePlot({ x: r.x + 4, y: r.y + 40, w: r.w - 8, h: r.h - 190 }, { x0: 0, x1: SP_T, y0: 0, y1: 1, padL: 54, padR: 14, padT: 10, padB: 36 });
    drawAxes(P, { xticks: [0, 10, 20, 30, 40], yticks: [0, 0.4, 0.8], yfmt: (v) => fx(v, 1), xlabel: '모형 시간 (초)', ylabel: '[B]' });
    ctx.save(); ctx.strokeStyle = 'rgba(20,160,88,.6)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(P.px, P.Y(SP_EQ)); ctx.lineTo(P.px + P.pw, P.Y(SP_EQ)); ctx.stroke(); ctx.restore(); T(P.px + P.pw - 4, P.Y(SP_EQ) - 5, '평형 [B] = ' + fx(SP_EQ, 2), 12.5, '#0b6b39', 'right', 800);
    const cols = { A: '#e2464b', B: '#3867f4' };
    ['A', 'B'].forEach((k) => {
      const pts = []; for (let t = 0; t <= sp.t + 1e-9; t += 0.5) pts.push([t, bConc(k, t)]); if (sp.t > 0) pts.push([sp.t, bConc(k, sp.t)]); polyline(P, pts, cols[k], 3.4);
      if (sp.t > 0) atom(P.X(sp.t), P.Y(bConc(k, sp.t)), 5.5, cols[k]);
      if (sp.done[k] >= 0) { const x = P.X(sp.done[k]); ctx.save(); ctx.strokeStyle = cols[k]; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, P.py + P.ph); ctx.lineTo(x, P.Y(SP_EQ * 0.95)); ctx.stroke(); ctx.restore(); D.label(clamp(x, P.px + 50, P.px + P.pw - 50), P.py + P.ph - 14, fx(sp.done[k], 1) + '초', { bg: cols[k], size: 12.5 }); }
    });
    // 플라스크 두 개
    const fy = r.y + r.h - 22, fw = Math.min(80, r.w * 0.16), fh = 96;
    ['A', 'B'].forEach((k, i) => {
      const cx = r.x + r.w * (0.27 + 0.46 * i), v = bConc(k, sp.t);
      drawFlask(cx, fy, fw, fh, v / SP_EQ * 0.8, false);
      T(cx, fy - fh - 8, SPD[k].name + ' (' + (k === 'A' ? '촉매 있음' : '촉매 없음') + ')', 13, cols[k], 'center', 800);
      T(cx + fw * 0.85, fy - 40, '[B] ' + fx(v, 2), 13, INK, 'left', 800);
    });
  }
  function drawSizeA(r) {
    bgPanel(r);
    if (S.sz.sub === 'slider') drawSizeSlider(r); else if (S.sz.sub === 'rxn') drawSizeRxn(r); else drawSizeSpeed(r);
  }
  function drawSizeB(r) {
    panel(r.x, r.y, r.w, r.h, 14, '#fff'); T(r.x + 14, r.y + 24, 'K가 말해 주는 것', 14, MUTED, 'left', 800);
    let y = r.y + 52; const mx = r.w - 28;
    ['• K ≫ 1: 평형에서 <생성물>이 많아요', '• K ≪ 1: 평형에서 <반응물>이 많아요', '• K는 평형 조성의 지표예요', '• 반응이 얼마나 빠른지는 알려 주지 않아요'].forEach((s) => { y += textBlock(r.x + 14, y, mx, s.replace(/[<>]/g, ''), 14, INK, 18, 800) + 8; });
    if (S.sz.sub === 'speed') {
      y += 6; T(r.x + 14, y + 6, '평형에 가까워지는 시간', 13, MUTED, 'left', 800); y += 22;
      ['A', 'B'].forEach((k) => { const d = S.sz.sp.done[k]; T(r.x + 14, y + 4, SPD[k].name + ': ' + (d >= 0 ? fx(d, 1) + ' 초' : '?'), 14.5, k === 'A' ? '#b4231f' : '#1d3fb8', 'left', 800); y += 24; });
      textBlock(r.x + 14, y + 6, mx, '두 반응의 K는 같고 평형 조성(B 80 %)도 같아요.', 13.5, INK, 17, 800);
    } else if (S.sz.sub === 'slider') {
      const c = comp(kVal(S.sz.exp)); y += 6; T(r.x + 14, y + 6, '지금 K = ' + KNUM(S.sz.exp), 14.5, VIO, 'left', 800); y += 26;
      T(r.x + 14, y + 4, '반응물 A ' + fx(c.A * 100, 1) + ' % · 생성물 B ' + fx(c.B * 100, 1) + ' %', 14, INK, 'left', 800);
    }
  }

  /* ================= ③ 온도와 K ================= */
  const tpEff = () => C0S.find((c) => c.id === S.tp.c0).c;
  const tpEq = () => eqOf(tpEff(), KT[S.tp.T]);
  const r4 = (v) => Math.round(v * 1e4) / 1e4;
  function tpPick(c0, T) { if (S.tp.run) return; S.tp.c0 = c0; S.tp.T = T; S.tp.prog = 0; updateCtl(); }
  $('#bTRun').addEventListener('click', () => { if (S.tp.run) return; Sound.click(); S.tp.prog = 0; S.tp.run = true; updateCtl(); });
  $('#bTRec').addEventListener('click', () => {
    const tp = S.tp; if (tp.run || tp.prog < 1 || tp.recs.some((r) => r.c0 === tp.c0 && r.T === tp.T)) return; Sound.success();
    const e = tpEq(), n = r4(e.n), m = r4(e.m); tp.recs.push({ c0: tp.c0, T: tp.T, c: tpEff(), n, m, K: m * m / n }); tp.flash = 1;
    if (!RM) parts.burst(SPL.B.x + SPL.B.w / 2, SPL.B.y + 90 + tp.recs.length * 24, { count: 10, colors: ['#8b5cf6', '#ffd447'] }); updateCtl();
  });
  $('#bTClear').addEventListener('click', () => { Sound.click(); S.tp.recs = []; updateCtl(); });
  function stepTemp(dt) {
    const tp = S.tp; tp.temp = SciSim.approach(tp.temp, tp.T, dt, 2.2); tp.flash = Math.max(0, tp.flash - dt * 2);
    if (tp.run) { tp.prog = Math.min(1, tp.prog + dt / 2.6); if (tp.prog >= 1) { tp.run = false; Sound.tick(); updateCtl(); } }
  }
  function drawTempA(r) {
    const tp = S.tp, e = tpEq(), p = ease2(tp.prog), c = tpEff(), n = c + (e.n - c) * p, m = e.m * p;
    bgPanel(r);
    T(r.x + 14, r.y + 26, 'N₂O₄ ⇌ 2NO₂ (흡열 반응)  처음 [N₂O₄] = ' + fx(c, 3) + ' mol/L', PHONE ? 13.5 : 15, INK, 'left', 800);
    const tableY = r.y + r.h - Math.max(50, r.h * 0.12); ctx.fillStyle = '#c9d1e2'; ctx.fillRect(r.x, tableY, r.w, r.y + r.h - tableY); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(r.x, tableY, r.w, 3);
    const cx = r.x + r.w * 0.4, fw = Math.min(170, r.w * 0.36), fh = Math.min(230, r.h * 0.5);
    // 열판 / 얼음
    if (tp.T === 100) { D.roundRect(cx - fw * 0.65, tableY - 14, fw * 1.3, 14, 5); ctx.fillStyle = '#e2464b'; ctx.fill(); D.glow(cx, tableY - 10, fw * 0.9, '#ff7a3d', 0.45); } else { D.roundRect(cx - fw * 0.65, tableY - 14, fw * 1.3, 14, 5); ctx.fillStyle = '#8fb8dd'; ctx.fill(); }
    drawFlask(cx, tableY - 14, fw, fh, m / 0.12, true);
    // 온도계
    const tx = r.x + r.w * 0.82, ty0 = r.y + 70, th = Math.min(250, r.h * 0.55);
    D.roundRect(tx - 9, ty0, 18, th, 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
    const hf = clamp(tp.temp / 100, 0.04, 1); D.roundRect(tx - 5, ty0 + th - (th - 10) * hf - 4, 10, (th - 10) * hf, 5); ctx.fillStyle = tp.T === 100 ? '#e2464b' : '#3867f4'; ctx.fill();
    [0, 25, 50, 75, 100].forEach((t) => { const y = ty0 + th - 4 - (th - 10) * (t / 100); ctx.fillStyle = '#5d6879'; ctx.fillRect(tx + 11, y, 6, 1.5); T(tx + 22, y + 4, String(t), 11.5, MUTED, 'left', 700); });
    D.label(tx, ty0 - 16, Math.round(tp.temp) + ' °C', { bg: tp.T === 100 ? '#e2464b' : '#2a8bd6', size: 13.5 });
    T(cx, tableY + 24, '[N₂O₄] ' + fx(n, 4) + '   [NO₂] ' + fx(m, 4) + ' mol/L', PHONE ? 13 : 14, INK, 'center', 800);
    if (tp.prog >= 1) D.label(cx, r.y + 60, '평형!  K = ' + fK2(r4(m) * r4(m) / r4(n)), { bg: '#8b5cf6', size: 14 });
  }
  const fK2 = (k) => KF(k);
  function drawTempB(r) {
    const tp = S.tp; panel(r.x, r.y, r.w, r.h, 14, '#fff'); T(r.x + 14, r.y + 24, '📏 K 기록표', 14, MUTED, 'left', 800);
    const c0 = r.x + 10, cols = [42, 58, 62, 62, 60].map((w) => w * (r.w - 20) / 284), y0 = r.y + 48; let x = c0;
    ['온도', '처음 N₂O₄', '평형 N₂O₄', '평형 NO₂', 'K'].forEach((h, j) => { T(x + cols[j] / 2, y0, h, PHONE ? 11.5 : 12, MUTED, 'center', 800); x += cols[j]; });
    tp.recs.forEach((q, i) => {
      const y = y0 + 12 + i * 26; D.roundRect(r.x + 8, y, r.w - 16, 23, 7); ctx.fillStyle = q.T === 100 ? 'rgba(226,70,75,.10)' : 'rgba(56,103,244,.08)'; ctx.fill();
      let xx = c0; [q.T + '°C', fx(q.c, 3), fx(q.n, 4), fx(q.m, 4), fK2(q.K)].forEach((s, j) => { T(xx + cols[j] / 2, y + 17, s, PHONE ? 12 : 12.5, j === 4 ? '#6d28d9' : INK, 'center', 800); xx += cols[j]; });
    });
    const yy = y0 + 12 + Math.max(tp.recs.length, 4) * 26 + 10;
    const k25 = tp.recs.filter((q) => q.T === 25), k100 = tp.recs.filter((q) => q.T === 100);
    let y = yy;
    y += textBlock(r.x + 14, y + 8, r.w - 28, k25.length ? '25 °C: 처음 농도가 달라도 K = ' + fK2(k25[0].K) + (k25.length > 1 ? ' (같아요)' : '') : '25 °C에서 처음 농도를 바꿔 K를 기록해 봐요.', 13.5, INK, 17, 800) + 8;
    y += textBlock(r.x + 14, y + 8, r.w - 28, k100.length ? '100 °C: K = ' + fK2(k100[0].K) + (k25.length ? '  (25 °C의 약 ' + Math.round(k100[0].K / k25[0].K) + '배)' : '') : '온도를 100 °C로 올려도 기록해 봐요.', 13.5, INK, 17, 800) + 8;
    textBlock(r.x + 14, y + 8, r.w - 28, 'K는 온도에 따라서만 변해요.', 13.5, VIO, 17, 800);
  }

  /* ================= ④ K 뒤집기 ================= */
  $('#bFlip').addEventListener('click', () => { Sound.click(); const i = S.fl.i; S.fl.flip[i] = S.fl.flip[i] ? 0 : 1; if (S.fl.flip[i]) S.fl.seen[i] = true; updateCtl(); });
  function stepFlip(dt) { for (let i = 0; i < 3; i++) S.fl.ph[i] = SciSim.approach(S.fl.ph[i], S.fl.flip[i], dt, 7); S.fl.mk = SciSim.approach(S.fl.mk == null ? 0 : S.fl.mk, Math.log10((S.fl.flip[S.fl.i] ? 1 / FP[S.fl.i].K : FP[S.fl.i].K)), dt, 6); }
  function drawFlipA(r) {
    const i = S.fl.i, f = FP[i], ph = S.fl.ph[i], back = ph > 0.5, sx = Math.max(0.03, Math.abs(Math.cos(ph * Math.PI)));
    bgPanel(r);
    T(r.x + 14, r.y + 26, '정반응의 K와 역반응의 K′', PHONE ? 14.5 : 16, INK, 'left', 800);
    const cw = Math.min(r.w - 40, 380), chh = PHONE ? 160 : 210, cx = r.x + r.w / 2, cy = r.y + 46 + chh / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1);
    D.shadow(() => { D.roundRect(-cw / 2, -chh / 2, cw, chh, 18); ctx.fillStyle = back ? '#f3e8ff' : '#fff7e0'; ctx.fill(); }, { blur: 14, y: 6 });
    ctx.strokeStyle = back ? '#8b5cf6' : '#f59e0b'; ctx.lineWidth = 3; D.roundRect(-cw / 2, -chh / 2, cw, chh, 18); ctx.stroke();
    const K = back ? 1 / f.K : f.K;
    T(0, -chh / 2 + 34, back ? '역반응' : '정반응', 15, back ? '#6d28d9' : '#b45309', 'center', 800);
    T(0, -chh / 2 + 70, back ? f.bw : f.fw, PHONE ? 20 : 24, INK, 'center', 800);
    T(0, -chh / 2 + 100, 'K' + (back ? '′' : '') + ' = ' + (back ? f.bwF : f.fwF), PHONE ? 13.5 : 15, MUTED, 'center', 800);
    T(0, chh / 2 - 30, (back ? 'K′ = ' : 'K = ') + KF(K), PHONE ? 26 : 32, back ? '#6d28d9' : '#b45309', 'center', 800);
    ctx.restore();
    // 어느 쪽이 많은가
    const ry = cy + chh / 2 + 52, rx0 = r.x + 40, rw = r.w - 80;
    D.roundRect(rx0, ry, rw, 10, 5); const g = ctx.createLinearGradient(rx0, 0, rx0 + rw, 0); g.addColorStop(0, '#f59e0b'); g.addColorStop(0.5, '#e5e7ef'); g.addColorStop(1, '#8b5cf6'); ctx.fillStyle = g; ctx.fill();
    [-3, -2, -1, 0, 1, 2, 3].forEach((x) => { const px = rx0 + (x + 3) / 6 * rw; ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, ry + 10); ctx.lineTo(px, ry + 15); ctx.stroke(); T(px, ry + 30, KFMT(x), 12, INK, 'center', 800); });
    const mk = clamp(S.fl.mk || 0, -3, 3), mx = rx0 + (mk + 3) / 6 * rw; atom(mx, ry + 5, 9, '#ff1f3d');
    T(rx0, ry - 10, '← 반응물이 많아요', 12.5, '#b45309', 'left', 800); T(rx0 + rw, ry - 10, '생성물이 많아요 →', 12.5, '#6d28d9', 'right', 800);
    const Kc = S.fl.flip[i] ? 1 / f.K : f.K, side = S.fl.flip[i] ? f.bwT : f.fwT;
    void side;
    textBlock(r.x + 20, ry + 54, r.w - 40, 'K' + (S.fl.flip[i] ? '′' : '') + ' = ' + KF(Kc) + (Kc < 1 ? ' < 1 → 평형에서 반응물이 더 많아요' : ' > 1 → 평형에서 생성물이 더 많아요'), 14, Kc < 1 ? '#b45309' : '#6d28d9', 18, 800);
  }
  function drawFlipB(r) {
    panel(r.x, r.y, r.w, r.h, 14, '#fff'); T(r.x + 14, r.y + 24, '정반응 ↔ 역반응', 14, MUTED, 'left', 800);
    FP.forEach((f, i) => {
      const y = r.y + 42 + i * 82, sel = i === S.fl.i; D.roundRect(r.x + 8, y, r.w - 16, 74, 12); ctx.fillStyle = sel ? 'rgba(124,58,237,.08)' : '#f6f7fb'; ctx.fill(); if (sel) { ctx.strokeStyle = VIO; ctx.lineWidth = 2; D.roundRect(r.x + 8, y, r.w - 16, 74, 12); ctx.stroke(); }
      T(r.x + 18, y + 22, f.fw, 14, INK, 'left', 800); T(r.x + r.w - 18, y + 22, 'K = ' + KF(f.K), 14, '#b45309', 'right', 800);
      T(r.x + 18, y + 46, f.bw, 14, INK, 'left', 800); T(r.x + r.w - 18, y + 46, S.fl.seen[i] ? 'K′ = ' + KF(1 / f.K) : "K′ = ?", 14, S.fl.seen[i] ? '#6d28d9' : MUTED, 'right', 800);
      T(r.x + 18, y + 66, S.fl.seen[i] ? '1 ÷ ' + KF(f.K) + ' = ' + KF(1 / f.K) : '뒤집어 보면 알 수 있어요', 12.5, MUTED, 'left', 800);
    });
    textBlock(r.x + 14, r.y + 42 + 3 * 82 + 10, r.w - 28, '반응식을 거꾸로 쓰면 K′ = 1 ÷ K예요.', 14.5, VIO, 18, 800);
  }
  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const filled = (ei) => needCells(EX[ei]).filter((k) => cellOK(ei, k)).length;
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'ice') {
      const e = EX[S.ic.ex]; L1 = '예제'; a = e.id + ' ' + e.name.replace(/ \(.*\)/, ''); L2 = '맞게 채운 칸'; b = filled(S.ic.ex) + ' / ' + needCells(e).length; L3 = '평형 상수 K'; c = kOK(S.ic.ex) ? KDISP(e) : '계산해 보세요';
    } else if (S.mode === 'size') {
      if (S.sz.sub === 'speed') { const sp = S.sz.sp; L1 = '모형 시간'; a = fx(sp.t, 1) + ' 초'; L2 = '빠른 · 느린 반응의 [B]'; b = fx(bConc('A', sp.t), 2) + ' · ' + fx(bConc('B', sp.t), 2); L3 = '평형 도착'; c = (sp.done.A >= 0 ? fx(sp.done.A, 1) : '?') + ' · ' + (sp.done.B >= 0 ? fx(sp.done.B, 1) : '?') + ' 초'; }
      else { const cc = comp(kVal(S.sz.exp)); L1 = '평형 상수 K'; a = KNUM(S.sz.exp); L2 = '평형 [A] · [B]'; b = fx(cc.A, 3) + ' · ' + fx(cc.B, 3); L3 = '많은 쪽'; c = cc.B >= 0.9 ? '생성물 B' : cc.A >= 0.9 ? '반응물 A' : '비슷해요'; }
    } else if (S.mode === 'temp') {
      const tp = S.tp, e = tpEq(); L1 = '온도'; a = tp.T + ' °C'; L2 = '평형 [N₂O₄] · [NO₂]'; b = tp.prog >= 1 ? fx(e.n, 4) + ' · ' + fx(e.m, 4) : '평형 전'; L3 = '기록한 K'; c = tp.recs.length ? tp.recs.map((q) => fK2(q.K)).join(' · ') : '없음';
    } else {
      const i = S.fl.i, f = FP[i], bw = S.fl.flip[i]; L1 = bw ? '역반응' : '정반응'; a = bw ? f.bw : f.fw; L2 = bw ? 'K′' : 'K'; b = KF(bw ? 1 / f.K : f.K); L3 = '평형에서 많은 쪽'; c = (bw ? 1 / f.K : f.K) < 1 ? '반응물' : '생성물';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const recAt = (T) => S.tp.recs.filter((q) => q.T === T);
  function iceCheck(ei) {
    if (S.ic.ex !== ei) return '예제 ' + EX[ei].id + '을(를) 먼저 골라 주세요.';
    const r = iceCheckCells(ei);
    if (iceDone(ei)) return true;
    if (r && r.empty) return '빈 칸이 ' + r.empty + '개 있어요.';
    return '표시된 칸을 다시 생각해 보세요. 변화량의 비는 계수비이고, 평형 = 처음 + 변화예요.';
  }
  const levels = [
    {
      title: '농도 변화표: 처음 · 변화 · 평형', short: '농도 변화표', icon: '📋', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 평형 상수 K는 어떻게 구할까? 처음 농도만 알아도 구할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 평형 농도로 계산한 일정한 값이 평형 상수 K라고 배웠어요. 이번에는 <b>처음 · 변화 · 평형</b> 세 줄 표로 평형 농도를 정리해서 K를 구해요.</div>' +
        '<p>변화량의 비는 <b>계수비</b>예요. 줄어드는 물질은 −, 늘어나는 물질은 +로 쓰고, <b>평형 = 처음 + 변화</b>예요. 평형 농도 하나만 알면 나머지를 표로 알아낼 수 있어요. 단위는 mol/L(생략)예요.</p>',
      features: ['ice'],
      setup() { S.gate = ''; S.ic.vals = EX.map(() => ({})); iceSelect(0); setScene('ice'); },
      recap: '농도 변화표에서 변화량은 계수비에 따라 −와 +로 정해지고, 평형 = 처음 + 변화예요. 평형 농도를 K 식에 넣으면 K를 구해요.',
      summary: '<ul><li><b>① N₂O₄ ⇌ 2NO₂</b>: 변화 −0.006, +0.012 → 평형 0.024, 0.012 → K = 0.012² ÷ 0.024 = <b>0.0060</b></li><li><b>② H₂ + I₂ ⇌ 2HI</b>: 변화 −0.0100, −0.0100, +0.0200 → 평형 0.0040, 0.0040, 0.0200 → K = <b>25</b></li><li><b>③ 2SO₂ + O₂ ⇌ 2SO₃</b>: 변화 −0.20, −0.10, +0.20 → 평형 0.20, 0.10, 0.20 → K = 0.20² ÷ (0.20² × 0.10) = <b>10</b></li><li><b>④ N₂ + 3H₂ ⇌ 2NH₃</b>: 변화 −0.20, −0.60, +0.40 → 평형 0.80, 2.40, 0.40 → K ≈ <b>1.4×10⁻²</b></li><li>변화량의 비 = 계수비 (예: 2SO₂ : O₂ : 2SO₃ = 0.20 : 0.10 : 0.20)</li></ul>',
      missions: [
        {
          title: '예제 ①: N₂O₄ ⇌ 2NO₂', manual: true,
          goal: '처음 N₂O₄ 0.030, NO₂ 0이고 평형에서 N₂O₄가 0.024예요. <b>표의 빈 칸</b>을 채우고 <b>K</b>를 구해 <b>✔ 확인하기</b>를 눌러요.',
          hint: 'N₂O₄가 0.006 줄었으면 계수비 1 : 2에 따라 NO₂는 0.012 늘어요. K = [NO₂]² ÷ [N₂O₄]예요.',
          setup() { S.gate = ''; iceSelect(0); setScene('ice'); updateCtl(); },
          check: () => iceCheck(0),
          status: () => '맞게 채운 칸 ' + filled(0) + ' / ' + needCells(EX[0]).length + ' · K ' + (kOK(0) ? '✅' : '⬜'),
          explain: 'N₂O₄ 0.030 → 0.024: 변화 <b>−0.006</b>. 계수비 1 : 2이므로 NO₂는 <b>+0.012</b>, 평형 0.012. K = 0.012² ÷ 0.024 = <b>0.0060</b>.',
        },
        {
          title: '예제 ③: 2SO₂ + O₂ ⇌ 2SO₃', manual: true,
          goal: '처음 SO₂ 0.40, O₂ 0.20, SO₃ 0이고 평형에서 SO₃가 0.20이에요. <b>표</b>를 채우고 <b>K</b>를 구해요.',
          hint: 'SO₃가 0.20 늘면 SO₂는 0.20, O₂는 0.10 줄어요. K = [SO₃]² ÷ ([SO₂]²[O₂])예요.',
          setup() { S.gate = ''; iceSelect(2); setScene('ice'); updateCtl(); },
          check: () => iceCheck(2),
          status: () => '맞게 채운 칸 ' + filled(2) + ' / ' + needCells(EX[2]).length + ' · K ' + (kOK(2) ? '✅' : '⬜'),
          explain: '변화량의 비 = 계수비 2 : 1 : 2이므로 SO₂ <b>−0.20</b>, O₂ <b>−0.10</b>, SO₃ <b>+0.20</b>. 평형 0.20, 0.10, 0.20. K = 0.20² ÷ (0.20² × 0.10) = <b>10</b>.',
        },
        {
          type: 'quiz', title: '변화량의 비가 계수비인 까닭',
          goal: '2SO₂ + O₂ ⇌ 2SO₃에서 SO₂가 0.20 mol/L 감소했어요. 이때 O₂는 얼마나 감소했을까요?',
          setup() { S.gate = ''; setScene('ice'); },
          choices: ['0.20 (SO₂와 같아요)', '0.10 (계수비 2 : 1이라서 절반이에요)', '0.40', '0.05'],
          answer: 1,
          feedback: ['각 물질이 반응한 양은 계수에 비례해요. O₂의 계수는 SO₂의 절반이에요.', '', 'O₂의 계수가 더 작아서 변화량도 더 작아요.', '2 : 1이면 절반이에요. 4 : 1이 아니에요.'],
          explain: '반응식의 계수는 반응하는 입자 수의 비예요. 그래서 변화량도 <b>계수비</b>(SO₂ : O₂ = 2 : 1)가 되어 −0.20 : −0.10이에요.',
        },
      ],
    },
    {
      title: 'K의 크기: 평형은 어느 쪽에?', short: 'K의 크기', icon: '📏', phase: '설명',
      intro: '<p class="si-q">❓ 탐구 질문: 평형 상수가 크다는 것은 무슨 뜻일까? 반응이 빠르다는 뜻일까?</p>' +
        '<div class="si-link">🔗 <b>앞 단계에서</b> 반응마다 K가 0.0060, 10, 25로 달랐어요. K의 크기는 평형이 어느 쪽에 치우쳐 있는지를 알려 줄까요?</div>' +
        '<p>K 값을 10⁻³부터 10³까지 바꾸어 평형 조성을 살펴보고, K가 같은데 반응의 빠르기가 다른 두 반응도 비교해요.</p>',
      features: ['size'],
      setup() { S.gate = ''; S.sz.sub = 'slider'; S.sz.exp = 0; S.sz.kv.value = 0; S.sz.kv.target = 0; $('#kRange').value = 0; Object.assign(S.sz, { seenProd: false, seenReact: false, seenRxn: false }); spReset(); setScene('size'); },
      recap: 'K가 1보다 훨씬 크면 평형에서 생성물이 많고, 1보다 훨씬 작으면 반응물이 많아요. K는 평형 조성의 지표일 뿐 반응의 빠르기와는 별개예요.',
      summary: '<ul><li><b>K ≫ 1</b>: 평형에서 생성물이 많아요. <b>K ≪ 1</b>: 평형에서 반응물이 많아요.</li><li>A ⇌ B (처음 [A] = 1.0): K = 10이면 B 약 91 %, K = 0.1이면 A 약 91 %, K = 1이면 50 : 50.</li><li>이 단원의 예: N₂O₄ ⇌ 2NO₂ (K = 0.0060, 반응물이 더 많이 남음), H₂ + I₂ ⇌ 2HI (K = 25, HI가 많음).</li><li>K는 <b>반응 속도와 무관</b>해요. K가 같아도 평형에 도달하는 데 걸리는 시간은 달라질 수 있어요.</li></ul>',
      missions: [
        {
          title: 'K를 바꾸어 평형 조성 맞추기',
          goal: '<b>🎚 K 바꾸기</b>로 <b>생성물 B가 90 % 이상</b>인 평형과 <b>반응물 A가 90 % 이상</b>인 평형을 모두 만들고, <b>⚖️ 세 반응</b> 장면도 한 번 열어 보세요.',
          hint: 'K = 10일 때 B가 약 91 %, K = 0.1일 때 A가 약 91 %예요. 장면 단추로 ⚖️ 세 반응을 열어요.',
          setup() { S.gate = ''; S.sz.sub = 'slider'; Object.assign(S.sz, { seenProd: false, seenReact: false, seenRxn: false }); setScene('size'); updateCtl(); },
          check: () => S.sz.seenProd && S.sz.seenReact && S.sz.seenRxn, hold: 0.4,
          status: () => mark(S.sz.seenProd) + ' B가 90 % 이상 &nbsp; ' + mark(S.sz.seenReact) + ' A가 90 % 이상 &nbsp; ' + mark(S.sz.seenRxn) + ' 세 반응 보기',
          explain: 'K = 10일 때 평형에서 B는 10 ÷ 11 ≈ <b>91 %</b>, K = 0.1일 때 A가 <b>91 %</b>예요. K가 1보다 훨씬 크면 생성물, 훨씬 작으면 반응물이 많아요.',
        },
        {
          title: 'K가 같은데 속도는 다른 두 반응',
          goal: '<b>⏱ 속도와 K</b> 장면에서 <b>▶ 두 반응 시작</b>을 눌러 끝까지 지켜보세요. 두 반응의 K는 같아요.',
          hint: '빠른 반응과 느린 반응이 같은 평형 [B]에 도달하는 시간을 비교해요.',
          setup() { S.gate = ''; S.sz.sub = 'speed'; spReset(); setScene('size'); updateCtl(); },
          check: () => S.sz.sp.t >= SP_T, hold: 0.5,
          status: () => '모형 시간 ' + fx(S.sz.sp.t, 0) + ' / ' + SP_T + '초',
          explain: '두 반응 모두 K = 4라서 평형 [B]가 0.80 mol/L로 같지만, 빠른 반응은 약 ' + fx(t95(SPD.A.lam), 1) + '초, 느린 반응은 약 ' + fx(t95(SPD.B.lam), 1) + '초 만에 평형에 가까워졌어요. K는 속도와 무관해요.',
        },
        {
          type: 'quiz', title: 'K가 크면 반응이 빠를까?',
          goal: '평형 상수 K에 대해 옳은 것은?',
          setup() { S.gate = ''; S.sz.sub = 'speed'; setScene('size'); updateCtl(); },
          choices: ['K가 클수록 평형에 빨리 도달해요', 'K는 평형 조성을 알려 줄 뿐 속도와는 별개예요', 'K가 크면 정반응 속도가 항상 커요', 'K가 크면 반응이 일어나지 않아요'],
          answer: 1,
          feedback: ['방금 K가 같은 두 반응은 도달 시간이 달랐어요. K와 속도는 별개예요.', '', '평형에서 정반응 속도와 역반응 속도는 같아요. K는 속도의 크기를 알려 주지 않아요.', 'K가 크면 평형에서 생성물이 많다는 뜻이에요.'],
          explain: 'K는 <b>평형 조성의 지표</b>이고 <b>반응 속도와 무관</b>해요. 평형에 도달하는 시간은 촉매 등 다른 조건에 따라 달라질 수 있어요.',
        },
      ],
    },
    {
      title: '온도와 K: K를 바꾸는 유일한 조건', short: '온도와 K', icon: '🌡', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 어떤 조건을 바꾸면 K가 달라질까? 처음 농도? 부피? 온도?</p>' +
        '<div class="si-link">🔗 <b>앞 단계에서</b> K가 평형 조성의 지표라는 것을 알았어요. N₂O₄ ⇌ 2NO₂는 열을 흡수하는(흡열) 반응이에요. 처음 농도와 온도를 바꿔 가며 K를 직접 구해 봐요.</div>' +
        '<p>밀봉한 플라스크(모의실험)에서 처음 N₂O₄ 농도를 바꾸거나 <b>부피를 절반</b>으로 줄이고(농도 2배), 온도를 25 °C에서 100 °C로 올려요. 🛡️ NO₂는 유독 기체라서 모의실험으로만 해요. 뜨거운 판을 만질 때는 장갑을 껴요.</p>',
      features: ['temp'],
      setup() { S.gate = ''; Object.assign(S.tp, { c0: 'a', T: 25, run: false, prog: 0, recs: [], temp: 25 }); setScene('temp'); },
      recap: '처음 농도나 부피(압력)를 바꾸어도 같은 온도에서 K는 그대로예요. 온도가 바뀔 때만 K가 달라져요 (이 흡열 반응은 온도가 오르면 K가 커져요).',
      summary: '<ul><li>25 °C에서 N₂O₄ ⇌ 2NO₂: 처음 N₂O₄ 0.030, 0.060, 0.090 mol/L 모두 <b>K = 0.0060</b> (평형 농도는 달라요).</li><li>부피를 절반으로 줄이면(농도 2배) 평형 농도는 달라지지만 <b>K는 그대로</b>예요. 압력과 농도는 K를 바꾸지 않아요.</li><li>100 °C에서는 <b>K ≈ 0.50</b>으로 커지고 플라스크 색이 진해져요. 흡열 반응은 온도가 오르면 K가 커져요.</li><li><b>K를 바꾸는 조건은 온도뿐</b>이에요 (촉매도 K를 바꾸지 못해요).</li></ul>',
      missions: [
        {
          title: '처음 농도를 바꾸어 K 구하기',
          goal: '<b>25 °C</b>에서 처음 N₂O₄ 농도 <b>0.030 · 0.060 · 0.090</b>을 각각 <b>▶ 평형까지</b> 보낸 뒤 <b>📏 K 기록</b>을 눌러요.',
          hint: '농도 단추를 고르고 25 °C에서 ▶ 평형까지 → 📏 K 기록 순서로 해요. 세 번 반복해요.',
          setup() { S.gate = ''; Object.assign(S.tp, { c0: 'a', T: 25, run: false, prog: 0, recs: [], temp: 25 }); setScene('temp'); updateCtl(); },
          check: () => ['a', 'b', 'c'].every((id) => recAt(25).some((q) => q.c0 === id)), hold: 0.4,
          status: () => ['a', 'b', 'c'].map((id) => mark(recAt(25).some((q) => q.c0 === id)) + ' ' + C0S.find((c) => c.id === id).lab).join(' &nbsp; ') + ' &nbsp; (기록 ' + recAt(25).length + '개)',
          explain: '처음 농도가 0.030, 0.060, 0.090일 때 평형 농도는 서로 달라도 [NO₂]² ÷ [N₂O₄]는 모두 <b>0.0060</b>이에요. 부피를 절반으로 줄이는 것은 농도를 2배로 하는 것과 같아서(0.030 → 0.060) K는 그대로예요.',
        },
        {
          title: '온도를 올려 K 구하기',
          goal: '온도를 <b>100 °C</b>로 올리고 같은 방법으로 <b>K를 기록</b>해요. 25 °C의 K와 비교해 보세요.',
          hint: '온도 단추에서 🔥 100 °C를 고르고 ▶ 평형까지 → 📏 K 기록을 눌러요.',
          setup() { S.gate = ''; setScene('temp'); updateCtl(); },
          check: () => recAt(25).length >= 1 && recAt(100).length >= 1, hold: 0.4,
          status: () => mark(recAt(25).length >= 1) + ' 25 °C 기록 &nbsp; ' + mark(recAt(100).length >= 1) + ' 100 °C 기록',
          explain: '100 °C에서 K는 약 <b>0.50</b>으로 25 °C의 0.0060보다 훨씬 커요. N₂O₄ ⇌ 2NO₂는 흡열 반응이라 온도를 올리면 K가 커지고 평형이 NO₂ 쪽에 더 치우쳐서 갈색이 진해져요.',
        },
        {
          type: 'quiz', title: 'K를 변화시키는 조건',
          goal: '같은 반응에서 평형 상수 K를 바꾸는 조건은?',
          setup() { S.gate = ''; setScene('temp'); },
          choices: ['처음 농도', '용기의 부피(압력)', '온도', '촉매'],
          answer: 2,
          feedback: ['처음 농도가 달라도 25 °C의 K는 모두 0.0060이었어요.', '부피를 줄이면 농도가 달라지지만 K는 그대로예요.', '', '촉매는 속도를 높일 뿐 K를 바꾸지 못해요.'],
          explain: 'K는 <b>온도에만</b> 의존해요. 농도 · 압력(부피) · 촉매를 바꾸어도 K는 변하지 않아요.',
        },
      ],
    },
    {
      title: 'K 뒤집기: 정반응과 역반응의 K', short: 'K 뒤집기', icon: '🔄', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> K는 온도로만 달라진다고 했어요. 같은 온도에서 반응식을 <b>거꾸로</b> 쓰면 K는 어떻게 될까요?</div>' +
        '<p>정반응의 K와 역반응의 K′는 <b>서로 역수</b>예요: <b>K′ = 1 ÷ K</b>. 카드를 뒤집어 확인하고, K 값만 보고 평형에서 어느 쪽이 많은지 판단해요.</p>',
      features: ['flip'],
      setup() { S.gate = ''; S.fl = { i: 0, flip: [0, 0, 0], ph: [0, 0, 0], seen: [false, false, false], mk: Math.log10(FP[0].K) }; setScene('flip'); },
      recap: '반응식을 거꾸로 쓰면 K′ = 1 ÷ K예요. K가 1보다 크면 평형에서 생성물이 많고, 작으면 반응물이 많아요.',
      summary: '<ul><li>N₂O₄ ⇌ 2NO₂: K = 0.0060 → 2NO₂ ⇌ N₂O₄: K′ = 1 ÷ 0.0060 ≈ <b>1.7×10²</b></li><li>H₂ + I₂ ⇌ 2HI: K = 25 → 2HI ⇌ H₂ + I₂: K′ = 1 ÷ 25 = <b>0.040</b></li><li>정반응의 K가 1보다 크면 그 역반응의 K′는 1보다 작아요. K′ < 1이면 평형에서 (그 반응식의) 반응물이 많아요.</li></ul>',
      missions: [
        {
          title: '역반응의 K′ 구하기', manual: true,
          goal: '<b>2NO₂ ⇌ N₂O₄</b>(정반응 K = 0.0060)와 <b>2HI ⇌ H₂ + I₂</b>(정반응 K = 25)의 <b>K′</b>를 구해 써요.',
          hint: 'K′ = 1 ÷ K예요. 1 ÷ 0.0060은 약 167, 1 ÷ 25는 0.04예요. 카드를 뒤집어 확인해도 돼요.',
          setup() { S.gate = 'kp'; $('#kp1').value = ''; $('#kp2').value = ''; setScene('flip'); updateCtl(); },
          check() {
            const a = parseNum($('#kp1').value), b = parseNum($('#kp2').value);
            if (isNaN(a) || isNaN(b)) return '두 칸에 숫자를 써 주세요. (예: 1.7×10^2, 0.04)';
            const oa = Math.abs(a - 1 / 0.006) <= (1 / 0.006) * 0.03, ob = Math.abs(b - 0.04) <= 0.04 * 0.03;
            mark2($('#kp1'), oa ? 'ok' : 'bad'); mark2($('#kp2'), ob ? 'ok' : 'bad');
            return oa && ob ? true : 'K′ = 1 ÷ K예요. 정반응의 K를 거꾸로 나눠 보세요.';
          },
          status: () => 'K′: ' + ($('#kp1').value || '?') + ' · ' + ($('#kp2').value || '?'),
          explain: '2NO₂ ⇌ N₂O₄: K′ = [N₂O₄] ÷ [NO₂]² = 1 ÷ 0.0060 ≈ <b>1.7×10²</b>. 2HI ⇌ H₂ + I₂: K′ = ([H₂][I₂]) ÷ [HI]² = 1 ÷ 25 = <b>0.040</b>. 반응식을 거꾸로 쓰면 K의 분자와 분모가 바뀌므로 K는 <b>역수</b>가 돼요.',
        },
        {
          type: 'quiz', title: 'K = 25인 반응의 역반응',
          goal: 'H₂ + I₂ ⇌ 2HI의 K는 25예요. 역반응 2HI ⇌ H₂ + I₂에 대해 옳은 것은?',
          setup() { S.gate = ''; S.fl.i = 1; setScene('flip'); updateCtl(); },
          choices: ['K′ = 25이므로 H₂와 I₂가 많아요', 'K′ = 0.040이므로 평형에서 반응물인 HI가 많아요', 'K′ = −25예요', 'K′ = 625예요'],
          answer: 1,
          feedback: ['역반응의 K′는 K의 역수예요. 같은 값이 아니에요.', '', 'K는 음수가 될 수 없어요.', '제곱이 아니라 역수(1 ÷ K)예요.'],
          explain: 'K′ = 1 ÷ 25 = 0.040 < 1이므로 2HI ⇌ H₂ + I₂의 평형에서는 반응물인 <b>HI가 많아요</b>. 같은 평형을 반대쪽에서 본 것이라 H₂ + I₂ ⇌ 2HI에서는 HI(생성물)가 많은 것과 일치해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-eq-constant', mount: '#game', badge: '평형 상수 박사', homeHref: '../../index.html#hc',
    featureLabels: { ice: '📋 처음 · 변화 · 평형 표와 막대', size: '📏 K 슬라이더 · 세 반응 · 속도와 K', temp: '🌡 온도를 바꾸는 플라스크와 K 기록표', flip: '🔄 정반응 ↔ 역반응 K 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildIce(); S.fl.mk = Math.log10(FP[0].K);
  setScene('ice');
  function stepAll1(dt) { stepIce(dt); stepSize(dt); stepTemp(dt); stepFlip(dt); }
  let lastFree = false, lastMode = '', lastBusy = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    const busy = [S.ic.tgt, S.sz.sp.run, S.tp.run].join('');
    if (busy !== lastBusy) { lastBusy = busy; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'ice') { drawIceA(SPL.A); drawIceB(SPL.B); }
    else if (S.mode === 'size') { drawSizeA(SPL.A); drawSizeB(SPL.B); }
    else if (S.mode === 'temp') { drawTempA(SPL.A); drawTempB(SPL.B); }
    else { drawFlipA(SPL.A); drawFlipB(SPL.B); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SPL, EX, FP, KT, eqOf, get game() { return game; }, setScene, iceSelect, kSet, tpPick, comp,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
