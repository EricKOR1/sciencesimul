/* =========================================================
   화학 Ⅲ. 화학 평형 - 되돌릴 수 있는 반응 [12화학03-01] (단원 1차시)
   ① 관찰: 되돌리는 변화 (CuSO₄·5H₂O 가열 · 물 첨가, 염화 코발트 종이)
   ② 탐구: 양방향 화살표 (2NO₂ ⇌ N₂O₄, 정반응 · 역반응, ⇌ 표기)
   ③ 분석: 분류하기 (가역 · 비가역 카드, 콜라 병과 닫힌 용기)
   ④ 예측: 멈춘 걸까? (N₂O₄의 색–시간 기록, 예측 선택)
   평형 상태의 설명(속도 · 농도)은 다음 차시 '동적 평형'에서 다뤄요.
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
  // 색–시간 자료 (N₂O₄ 0.030 mol/L만 넣은 밀봉 플라스크, 일정한 온도): [NO₂] mol/L
  const WT_T = [0, 10, 20, 30, 40, 50, 60], WT_NO2 = [0, 0.0070, 0.0100, 0.0114, 0.0120, 0.0120, 0.0120];
  const WT_END = 0.0120, WT_SPEED = 6;                 // 평형 농도, 화면 1초 = 실험 6초
  const wtNO2 = makeCurve(WT_T, WT_NO2);
  const CARDS = [
    { id: 'cu', name: 'CuSO₄·5H₂O', sub: '가열 ↔ 물 첨가', icon: '🔵', rev: true },
    { id: 'no2', name: 'NO₂와 N₂O₄', sub: '온도에 따라 색 변화', icon: '🟤', rev: true },
    { id: 'co2', name: '탄산음료 속 CO₂', sub: '뚜껑을 닫은 병', icon: '🥤', rev: true },
    { id: 'nh3', name: '암모니아 합성', sub: 'N₂와 H₂에서 NH₃', icon: '🏭', rev: true },
    { id: 'h2o', name: '물의 증발·응결', sub: '밀폐된 용기 속', icon: '💧', rev: true },
    { id: 'ch4', name: '메테인 연소', sub: '가스레인지의 불꽃', icon: '🔥', rev: false },
    { id: 'egg', name: '달걀 삶기', sub: '삶은 달걀은 그대로', icon: '🥚', rev: false },
    { id: 'paper', name: '종이 태우기', sub: '재와 연기가 남아요', icon: '📄', rev: false },
    { id: 'rust', name: '철이 녹슬기', sub: 'Fe가 Fe₂O₃로', icon: '🔩', rev: false },
    { id: 'fw', name: '폭죽 터뜨리기', sub: '빛과 열을 내며', icon: '🎆', rev: false },
  ];
  const BATH = { room: { T: 25, c: 0.32, name: '실온' }, hot: { T: 80, c: 0.72, name: '뜨거운 물' }, ice: { T: 0, c: 0.16, name: '얼음물' } };
  const COLA_N = 30, COLA_HALF = 15;

  const SPL = split(0.6, 0.5);
  /* ---------- 상태 ---------- */
  const S = {
    mode: 'heat', t: 0, fade: 0, gate: '',
    cu: { sys: 'cu', hydr: 1, act: null, rt: 0, white: false, heats: 0, waters: 0, mx: 0, my: 0 },
    co: { w: 0, dir: 0, place: 'dry', mv: { p: 1, x0: 0, x1: 0 }, cyc: 0, wetSeen: false, backSeen: false },
    ar: { bath: 'room', fl: { p: 1, x0: 0.5, x1: 0.5 }, c: 0.32, temp: 25, log: [], lastDc: 0, named: false, ok: false, sel: { fwd: '', bwd: '', sym: '' }, flashF: 0, flashB: 0 },
    so: { sub: 'sort', loc: CARDS.map(() => -1), order: [[], []], sel: -1, drag: null, flagged: {}, checked: false, pos: [], pointer: null },
    cl: { cap: true, opened: false, mols: [], t: 0, evD: 0, evE: 0, rD: 0, rE: 0, capAnim: { p: 0 }, minTot: COLA_N, closedAfter: 0 },
    wt: { run: false, ts: 0, done: false, pts: [], pred: '' },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { heat: '🔵 되돌리는 변화', arrow: '🔁 양방향 화살표', sort: '🗂 분류하기', wait: '⏱ 멈춘 걸까?' };

  /* ---------- 공통 UI ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sys')) on = S.cu.sys === n.getAttribute('data-sys');
      if (on && n.hasAttribute('data-sub')) on = S.so.sub === n.getAttribute('data-sub');
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#sysSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.cu.sys));
    $$('#subSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.so.sub));
    const cu = S.cu, busy = !!cu.act;
    $('#bHeat').disabled = busy || cu.hydr < 0.02;
    $('#bWater').disabled = busy || cu.hydr > 0.98;
    $('#cuNote').textContent = busy ? (cu.act.type === 'heat' ? '가열하는 중…' : '물을 떨어뜨리는 중…') : cu.hydr < 0.02 ? '흰색 가루가 되었어요. 이제 물을 떨어뜨려 보세요.' : cu.hydr > 0.98 ? '파란 가루를 가열하면 어떻게 될까요?' : '변하는 중이에요.';
    $('#bDry').disabled = S.co.place === 'dry' && S.co.mv.p >= 1; $('#bWet').disabled = S.co.place === 'wet' && S.co.mv.p >= 1;
    const a = S.ar, moving = a.fl.p < 1;
    $('#bHot').disabled = moving || a.bath === 'hot'; $('#bIce').disabled = moving || a.bath === 'ice'; $('#bRoom').disabled = moving || a.bath === 'room';
    $('#bCap').textContent = S.cl.cap ? '🔓 뚜껑 열기' : '🔒 뚜껑 닫기';
    $('#colaNote').textContent = S.cl.cap ? '닫힌 병 속에서는 기체 CO₂와 녹은 CO₂가 오가요.' : '뚜껑을 열면 기체가 병 밖으로 나가요. 다시 닫을 수도 있어요.';
    const sel = S.so.sel;
    $('#selName').textContent = sel >= 0 ? CARDS[sel].icon + ' ' + CARDS[sel].name : '카드를 눌러 보세요';
    $('#bToRev').disabled = sel < 0 || S.so.loc[sel] === 0; $('#bToIrr').disabled = sel < 0 || S.so.loc[sel] === 1;
    $('#bStart').disabled = S.wt.run; $('#bStart').textContent = S.wt.done ? '✔ 기록 완료' : S.wt.run ? '기록하는 중…' : S.wt.ts > 0 ? '▶ 이어서 기록' : '▶ 실험 시작'; if (S.wt.done) $('#bStart').disabled = true;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#sysSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cu.sys = b.dataset.v; S.fade = 1; updateCtl(); }));
  $$('#subSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.so.sub = b.dataset.v; S.fade = 1; updateCtl(); }));
  setSel('#selFwd', [['', '고르세요'], ['정반응', '정반응'], ['역반응', '역반응']]);
  setSel('#selBwd', [['', '고르세요'], ['정반응', '정반응'], ['역반응', '역반응']]);
  setSel('#selSym', [['', '고르세요'], ['→', '→ (한쪽 화살표)'], ['⇌', '⇌ (양방향 화살표)'], ['←', '← (거꾸로 한쪽)']]);
  setSel('#selPred', [['', '고르세요'], ['stop', '멈췄다'], ['go', '계속된다']]);
  ['Fwd', 'Bwd', 'Sym'].forEach((k) => $('#sel' + k).addEventListener('change', (e) => { S.ar.sel[k.toLowerCase()] = e.target.value; mark2(e.target, ''); }));
  $('#selPred').addEventListener('change', (e) => { S.wt.pred = e.target.value; mark2(e.target, ''); });

  /* ================= ① 되돌리는 변화 ================= */
  const CU_HEAT = 3.4, CU_WATER = 2.8;
  function cuColor(h) { return C.mix('#f2f4f8', '#2a78dc', clamp(h, 0, 1)); }
  function resetCu() { Object.assign(S.cu, { hydr: 1, act: null, rt: 0, white: false, heats: 0, waters: 0 }); }
  function resetCo() { Object.assign(S.co, { w: 0, dir: 0, place: 'dry', cyc: 0, wetSeen: false, backSeen: false }); const x = coGeom(SPL.A).lx; S.co.mv.x0 = S.co.mv.x1 = x; S.co.mv.p = 1; SciSim.tween(S.co.mv, { p: 1 }, { duration: 0.001 }); }
  function cuHeat() { const c = S.cu; if (c.act || c.hydr < 0.02) return; Sound.click(); c.act = { type: 'heat', t: 0, dur: CU_HEAT, from: c.hydr }; updateCtl(); }
  function cuWater() { const c = S.cu; if (c.act || c.hydr > 0.98) return; Sound.click(); c.act = { type: 'water', t: 0, dur: CU_WATER, from: c.hydr }; updateCtl(); }
  $('#bHeat').addEventListener('click', cuHeat); $('#bWater').addEventListener('click', cuWater);
  function stepCu(dt) {
    const c = S.cu;
    const a = c.act; if (!a) return;
    a.t += dt; const p = clamp(a.t / a.dur, 0, 1);
    if (a.type === 'heat') {
      c.hydr = a.from * (1 - p * p * (3 - 2 * p));
      if (!RM && Math.random() < dt * 40) parts.emit({ x: (c.mx || 0) + rnd(-8, 8), y: (c.my || 0) - 6, vx: rnd(-8, 8), vy: -rnd(30, 50), life: 1.1, size: rnd(7, 12), color: 'rgba(235,240,248,.9)', shape: 'smoke', gravity: -10, drag: 0.8 });
    } else {
      const q = clamp((a.t - 0.5) / (a.dur - 0.5), 0, 1);
      c.hydr = a.from + (1 - a.from) * q * q * (3 - 2 * q);
    }
    if (p >= 1) {
      if (a.type === 'heat') { c.hydr = 0; c.white = true; c.heats++; }
      else { c.hydr = 1; c.waters++; if (c.white) { c.rt++; c.white = false; } }
      c.act = null; Sound.success(); updateCtl();
      cuBurst = 0.01;
    }
  }
  let cuBurst = 0;
  function cuGeom(r) {
    const tableY = r.y + r.h - Math.max(44, r.h * 0.085);
    const cx = r.x + r.w * 0.5, lampH = Math.min(56, r.h * 0.1), wickY = tableY - lampH - 6, flameH = Math.min(58, r.h * 0.1);
    const tubeBot = wickY - flameH - 6, tubeLen = Math.min(250, r.h * 0.46);
    return { cx, tableY, lampH, wickY, flameH, tubeW: 56, tubeBot, tubeLen, tubeTop: tubeBot - tubeLen };
  }
  const CRYST = []; for (let i = 0; i < 46; i++) CRYST.push({ u: Math.random(), v: Math.random(), s: rnd(0.6, 1.25), a: Math.random() * 3 });
  function drawCuA(r) {
    const g = cuGeom(r), c = S.cu, a = c.act, t = S.t;
    // 실험대
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4');
    D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = '#c9d1e2'; ctx.fillRect(r.x, g.tableY, r.w, r.y + r.h - g.tableY);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(r.x, g.tableY, r.w, 3);
    T(r.x + 14, r.y + 26, '🧪 CuSO₄·5H₂O (황산 구리 수화물)', 16, INK, 'left', 800);
    // 스탠드
    const rodX = g.cx - 110;
    ctx.fillStyle = '#9aa5b8'; ctx.fillRect(rodX - 4, g.tubeTop - 20, 8, g.tableY - g.tubeTop + 20);
    D.roundRect(rodX - 34, g.tableY - 8, 68, 10, 4); ctx.fillStyle = '#7a8599'; ctx.fill();
    const armY = g.tubeTop + g.tubeLen * 0.28;
    ctx.fillStyle = '#7a8599'; ctx.fillRect(rodX, armY - 4, g.cx - g.tubeW / 2 - rodX, 8);
    D.roundRect(g.cx - g.tubeW / 2 - 6, armY - 9, g.tubeW + 12, 18, 6); ctx.fillStyle = '#5d6879'; ctx.fill();
    // 알코올 램프
    const lw = 62, ly = g.tableY - g.lampH;
    D.shadow(() => { D.roundRect(g.cx - lw / 2, ly, lw, g.lampH, 14); ctx.fillStyle = '#9fc7e6'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = 'rgba(255,214,140,.85)'; D.roundRect(g.cx - lw / 2 + 4, ly + g.lampH * 0.35, lw - 8, g.lampH * 0.6, 10); ctx.fill();
    ctx.strokeStyle = '#6f8faa'; ctx.lineWidth = 2; D.roundRect(g.cx - lw / 2, ly, lw, g.lampH, 14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(g.cx - lw / 2 + 8, ly + 6, 5, g.lampH - 14);
    ctx.fillStyle = '#6b7488'; ctx.fillRect(g.cx - 10, ly - 8, 20, 9); ctx.fillStyle = '#3a3f4b'; ctx.fillRect(g.cx - 2, ly - 12, 4, 6);
    // 시험관의 시약 (유리 뒤)
    const col = cuColor(c.hydr), tw = g.tubeW, th = g.tubeLen, bx = g.cx - tw / 2;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(bx, g.tubeTop); ctx.lineTo(bx, g.tubeBot - tw / 2); ctx.arc(g.cx, g.tubeBot - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(bx + tw, g.tubeTop); ctx.closePath(); ctx.clip();
    const pileH = th * 0.17, topY = g.tubeBot - pileH;
    ctx.fillStyle = col; ctx.fillRect(bx, topY + 4, tw, pileH);
    CRYST.forEach((q) => {
      const x = bx + 4 + q.u * (tw - 8), y = topY - 2 + q.v * (pileH - 2), s = 5 * q.s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(q.a);
      ctx.beginPath(); ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s * 0.8, -s); ctx.lineTo(s, s * 0.7); ctx.lineTo(-s * 0.7, s); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    });
    // 벽면 물방울: 빠져나간 물
    for (let i = 0; i < 10; i++) {
      const al = clamp((1 - c.hydr) * 10 - i, 0, 1); if (al <= 0) continue;
      const side = i % 2 ? 1 : -1, y = g.tubeTop + 16 + (i * 0.075) * th, x = g.cx + side * (tw / 2 - 5 - (i % 3) * 1.5), rr = 2.2 + 1.3 * al;
      ctx.globalAlpha = 0.9 * al; ctx.fillStyle = '#bfe0ff'; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.35, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    // 열이 나요 (물을 넣을 때)
    if (a && a.type === 'water') { const q = clamp(Math.sin(clamp((a.t - 0.5) / (a.dur - 0.5), 0, 1) * Math.PI), 0, 1); D.glow(g.cx, topY, 46, '#ff7a3d', 0.55 * q); }
    ctx.restore();
    // 유리
    D.testTube(g.cx, g.tubeTop, tw, th, { level: 0 });
    // 불꽃
    if (a && a.type === 'heat') { const env = Math.min(1, a.t / 0.3, (a.dur - a.t) / 0.3 + 0.2); D.flame(g.cx, g.wickY, g.flameH * clamp(env, 0.1, 1), t); }
    // 입구의 김
    c.mx = g.cx; c.my = g.tubeTop;
    // 스포이트와 물방울
    const dx = g.cx, tipY = g.tubeTop - 34;
    const squeeze = a && a.type === 'water' ? 1 : 0;
    ctx.save(); ctx.translate(dx, 0);
    D.roundRect(-11, tipY - 52, 22, 36 - squeeze * 4, 11); ctx.fillStyle = '#c4553d'; ctx.fill();
    ctx.fillStyle = 'rgba(190,225,245,.85)'; ctx.fillRect(-6, tipY - 20, 12, 22); ctx.beginPath(); ctx.moveTo(-6, tipY + 2); ctx.lineTo(0, tipY + 16); ctx.lineTo(6, tipY + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 1.5; ctx.strokeRect(-6, tipY - 20, 12, 22);
    ctx.restore();
    if (a && a.type === 'water') {
      const top = g.tubeBot - g.tubeLen * 0.17 - 4;
      for (let i = 0; i < 6; i++) {
        const loc = (a.t - 0.1 - i * 0.32) / 0.38; if (loc < 0 || loc > 1) continue;
        const y = tipY + 16 + (top - tipY - 16) * loc * loc; ctx.fillStyle = 'rgba(120,190,255,.95)'; ctx.beginPath(); ctx.ellipse(g.cx, y, 3.2, 4.6, 0, 0, TAU); ctx.fill();
        if (loc > 0.93 && !RM && !a['s' + i]) { a['s' + i] = 1; parts.burst(g.cx, top, { count: 5, speed: 60, size: 2, colors: ['#9fd0ff', '#ffffff'], gravity: 160 }); }
      }
    }
    if (a && a.type === 'water') { const q = clamp(Math.sin(clamp((a.t - 0.5) / (a.dur - 0.5), 0, 1) * Math.PI), 0, 1); if (q > 0.05) { D.label(g.cx + g.tubeW / 2 + 52, g.tubeBot - 40, '🔥 열이 나와요', { bg: 'rgba(226,70,75,.92)', size: 13 }); } }
    if (a && a.type === 'heat') D.label(g.cx + g.tubeW / 2 + 54, g.tubeTop + 28, '💧 물방울이 생겨요', { bg: 'rgba(56,103,244,.9)', size: 13, align: 'center' });
    // 색 이름표
    const nm = c.hydr > 0.85 ? '파란색' : c.hydr < 0.15 ? '흰색' : '변하는 중';
    D.label(g.cx - g.tubeW / 2 - 64, g.tubeBot - 20, nm, { bg: c.hydr > 0.5 ? '#2a78dc' : '#8a95a6', size: 14 });
    if (cuBurst > 0) { cuBurst = 0; const col2 = c.hydr > 0.5 ? ['#2a78dc', '#9fd0ff', '#ffffff'] : ['#ffffff', '#cfd6e4', '#ffd447']; parts.burst(g.cx, g.tubeBot - 20, { count: 16, speed: 120, colors: col2 }); }
  }
  /* 결정 속 물 분자 모형 (확대) */
  function drawCrystal(r) {
    const c = S.cu, cx = r.x + r.w / 2, cy = r.y + r.h / 2 + 6, R = Math.min(r.w, r.h) * 0.44;
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    D.label(r.x + r.w / 2, r.y + 18, '🔍 입자 모형으로 보기', { bg: 'rgba(124,58,237,.1)', color: '#5b21b6', size: 13 });
    const bs = R * 0.34, col = cuColor(c.hydr);
    D.roundRect(cx - bs, cy - bs, bs * 2, bs * 2, 10); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(cx - bs + 8, cy - bs + 8, bs * 0.9, 5);
    T(cx, cy + 5, 'CuSO₄', 14, c.hydr > 0.5 ? '#fff' : INK, 'center', 800);
    const ang = [-2.2, -0.7, 0.55, 1.75, 2.9];
    for (let i = 0; i < 5; i++) {
      const p = clamp(c.hydr * 5 - i, 0, 1), dir = ang[i];
      const home = bs + R * 0.26, far = R * 1.02 + (i % 2) * 6;
      const d = home + (far - home) * (1 - p) * (1 - p);
      const hx = cx + Math.cos(dir) * d, hy = cy + Math.sin(dir) * d - (1 - p) * 8 * Math.sin(S.t * 2 + i);
      const x = clamp(hx, r.x + 16, r.x + r.w - 16), y = clamp(hy, r.y + 36, r.y + r.h - 14);
      if (p > 0.5) { ctx.strokeStyle = 'rgba(56,103,244,.45)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx + Math.cos(dir) * bs * 1.15, cy + Math.sin(dir) * bs * 1.15); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]); }
      drawH2O(x, y, R * 0.13, dir + Math.PI / 2 + S.t * (p < 1 ? 1.4 : 0), 0.45 + 0.55 * Math.max(p, 0.2));
    }
    const nAt = Math.round(c.hydr * 5);
    T(r.x + r.w / 2, r.y + r.h - 12, '결정에 붙은 물 분자 ' + nAt + '개 / 5개', 13.5, INK, 'center', 800);
  }
  function eqArrows(cx, y, len, topLab, botLab, litF, litB) {
    // 세로 배치: 왼쪽 ↓ = 위 줄의 물질이 아래 줄의 물질로, 오른쪽 ↑ = 그 반대
    const cF = litF > 0.05 ? C.mix('#9aa5b8', '#e2464b', clamp(litF, 0, 1)) : '#9aa5b8', cB = litB > 0.05 ? C.mix('#9aa5b8', '#3867f4', clamp(litB, 0, 1)) : '#9aa5b8';
    D.arrow(cx - 13, y, cx - 13, y + len, { color: cF, width: 3 + 2 * clamp(litF, 0, 1), head: 12 });
    D.arrow(cx + 13, y + len, cx + 13, y, { color: cB, width: 3 + 2 * clamp(litB, 0, 1), head: 12 });
    if (topLab) T(cx - 26, y + len / 2 + 5, topLab, 13.5, litF > 0.05 ? '#b4231f' : MUTED, 'right', 800);
    if (botLab) T(cx + 26, y + len / 2 + 5, botLab, 13.5, litB > 0.05 ? '#1d3fb8' : MUTED, 'left', 800);
  }
  function drawCuB(r) {
    const c = S.cu, a = c.act;
    const wide = r.w > 420;
    const ir = wide ? { x: r.x, y: r.y, w: Math.round(r.w * 0.5) - 4, h: r.h } : { x: r.x, y: r.y + r.h * 0.4, w: r.w, h: r.h * 0.6 };
    const er = wide ? { x: r.x + ir.w + 8, y: r.y, w: r.w - ir.w - 8, h: r.h } : { x: r.x, y: r.y, w: r.w, h: r.h * 0.4 - 6 };
    panel(er.x, er.y, er.w, er.h, 14, '#fff');
    T(er.x + 14, er.y + 24, '반응식', 14, MUTED, 'left', 800);
    const cxm = er.x + er.w / 2;
    const row = (y, label, col, sub) => { D.roundRect(er.x + 12, y - 15, er.w - 24, 30, 15); ctx.fillStyle = col + '22'; ctx.fill(); T(cxm, y + 6, label, 15, INK, 'center', 800); void sub; };
    row(er.y + 56, 'CuSO₄·5H₂O (파란색)', '#2a78dc');
    eqArrows(cxm, er.y + 76, 52, '가열', '물 첨가', a && a.type === 'heat' ? 1 : 0, a && a.type === 'water' ? 1 : 0);
    row(er.y + 154, 'CuSO₄ (흰색) + 5H₂O', '#8a95a6');
    const ty = er.y + 186;
    textBlock(er.x + 14, ty, er.w - 28, wide ? '같은 물질로 두 방향의 변화가 모두 일어나요.' : '같은 물질로 두 방향의 변화가 모두 일어나요.', 13.5, INK, 17, 800);
    drawCrystal(ir);
  }
  /* ----- 염화 코발트 종이 ----- */
  function coGeom(r) {
    const jw = Math.min(150, r.w * 0.3), jh = Math.min(240, r.h * 0.5), baseY = r.y + r.h - Math.max(44, r.h * 0.1);
    const lx = r.x + r.w * 0.27, rx = r.x + r.w * 0.73;
    return { jw, jh, baseY, lx, rx, topY: baseY - jh, rodY: r.y + 56 };
  }
  function drawCoA(r) {
    const g = coGeom(r), co = S.co, t = S.t;
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4');
    D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = '#c9d1e2'; ctx.fillRect(r.x, g.baseY, r.w, r.y + r.h - g.baseY); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(r.x, g.baseY, r.w, 3);
    T(r.x + 14, r.y + 26, '📄 염화 코발트 종이 (습도 지시)', 16, INK, 'left', 800);
    // 막대
    ctx.fillStyle = '#9aa5b8'; ctx.fillRect(r.x + 24, g.rodY - 4, r.w - 48, 6);
    // 두 병
    [[g.lx, 'dry', '마른 공기', '#eaf3ff'], [g.rx, 'wet', '습한 공기', '#dff1ff']].forEach(([x, k, nm, tint]) => {
      const x0 = x - g.jw / 2;
      D.roundRect(x0, g.topY, g.jw, g.jh, 14); ctx.fillStyle = tint; ctx.fill();
      ctx.save(); D.roundRect(x0, g.topY, g.jw, g.jh, 14); ctx.clip();
      if (k === 'dry') { for (let i = 0; i < 40; i++) { const bx = x0 + 10 + ((i * 37) % 100) / 100 * (g.jw - 20), by = g.baseY - 8 - Math.floor(i / 8) * 9 - ((i * 13) % 5); atom(bx, by, 4.2, '#f5f7fb'); } }
      else {
        ctx.fillStyle = 'rgba(100,170,240,.55)'; ctx.fillRect(x0, g.baseY - 26, g.jw, 26); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x0, g.baseY - 27, g.jw, 2);
        for (let i = 0; i < 9; i++) { const ph = (t * 0.35 + i / 9) % 1, bx = x0 + 12 + ((i * 53) % 100) / 100 * (g.jw - 24), by = g.baseY - 30 - ph * (g.jh - 50); drawH2O(bx, by, 6.5, ph * 6 + i, 0.25 + 0.5 * Math.sin(ph * Math.PI)); }
      }
      ctx.restore();
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 - 6, g.topY); ctx.lineTo(x0, g.topY + 4); ctx.lineTo(x0, g.baseY - 8); ctx.quadraticCurveTo(x0, g.baseY, x0 + 10, g.baseY); ctx.lineTo(x0 + g.jw - 10, g.baseY); ctx.quadraticCurveTo(x0 + g.jw, g.baseY, x0 + g.jw, g.baseY - 8); ctx.lineTo(x0 + g.jw, g.topY + 4); ctx.lineTo(x0 + g.jw + 6, g.topY); ctx.stroke();
      D.label(x, g.baseY + 24, nm, { bg: k === 'dry' ? '#7a8599' : '#3b82c4', size: 13.5 });
    });
    // 종이 (막대에 매달려요: 들어 올렸다가 옮겨 넣어요)
    const mv = co.mv, e = clamp(mv.p, 0, 1);
    const xa = mv.x0, xb = mv.x1, sx = xa + (xb - xa) * e;
    const sh = 100;
    const up = Math.sin(e * Math.PI) * 55;
    const topPaper = g.topY + 34 - up, sw = 34;
    ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, g.rodY); ctx.lineTo(sx, topPaper); ctx.stroke();
    D.shadow(() => { D.roundRect(sx - sw / 2, topPaper, sw, sh, 4); ctx.fillStyle = C.mix('#3b6fd8', '#ec7fa0', clamp(co.w, 0, 1)); ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(sx - sw / 2 + 4, topPaper + 5, 5, sh - 10);
    D.roundRect(sx - 8, topPaper - 8, 16, 12, 3); ctx.fillStyle = '#5d6879'; ctx.fill();
    const nm = co.w < 0.15 ? '푸른색' : co.w > 0.85 ? '붉은색' : '변하는 중';
    D.label(sx, topPaper + sh + 18, nm, { bg: co.w > 0.5 ? '#d9507a' : '#3b6fd8', size: 13 });
  }
  function coMove(place) {
    const co = S.co; if (co.place === place && co.mv.p >= 1) return;
    Sound.click();
    const g = coGeom(SPL.A), e = clamp(co.mv.p, 0, 1), curX = co.mv.x0 + (co.mv.x1 - co.mv.x0) * e;
    co.mv.x0 = curX; co.mv.x1 = place === 'dry' ? g.lx : g.rx; co.mv.p = 0; co.place = place;
    SciSim.tween(co.mv, { p: 1 }, { duration: 0.9, ease: 'inOutQuad', onDone: () => updateCtl() }); updateCtl();
  }
  $('#bDry').addEventListener('click', () => coMove('dry')); $('#bWet').addEventListener('click', () => coMove('wet'));
  function stepCo(dt) {
    const co = S.co, inJar = co.mv.p >= 0.85, target = co.place === 'wet' ? 1 : 0;
    const was = co.w;
    if (inJar) co.w = SciSim.approach(co.w, target, dt, 1.3);
    co.dir = co.w - was;
    if (co.w > 0.9 && !co.wetSeen) co.wetSeen = true;
    if (co.w < 0.1 && co.wetSeen && co.place === 'dry' && !co.backSeen) { co.backSeen = true; co.cyc++; }
    if (co.w > 0.9) co.backSeen = false;
  }
  function drawCoB(r) {
    const co = S.co;
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '반응식', 14, MUTED, 'left', 800);
    const cxm = r.x + r.w / 2;
    const row = (y, label, col) => { D.roundRect(r.x + 12, y - 15, r.w - 24, 30, 15); ctx.fillStyle = col + '22'; ctx.fill(); T(cxm, y + 6, label, 14.5, INK, 'center', 800); };
    row(r.y + 56, 'CoCl₂ (푸른색) + 6H₂O', '#3b6fd8');
    eqArrows(cxm, r.y + 76, 52, '수분 흡수', '수분 방출', co.dir > 0.002 ? 1 : 0, co.dir < -0.002 ? 1 : 0);
    row(r.y + 154, 'CoCl₂·6H₂O (붉은색)', '#d9507a');
    textBlock(r.x + 14, r.y + 186, r.w - 28, '습도에 따라 색이 오가요. 그래서 습도 지시 종이로 써요.', 13.5, INK, 17, 800);
  }
  /* ================= ② 양방향 화살표 ================= */
  function arGeom(r) {
    const tableY = r.y + r.h - Math.max(38, r.h * 0.085);
    const bw = Math.min(158, r.w * 0.32), bh = Math.min(232, r.h * 0.43), fw = Math.min(118, r.w * 0.24), fh = Math.min(168, bh * 0.82);
    const hotX = r.x + r.w * 0.2, iceX = r.x + r.w * 0.8, midX = r.x + r.w * 0.5;
    return { tableY, bw, bh, fw, fh, hotX, iceX, midX, bTop: tableY - bh, liq: tableY - bh * 0.72 };
  }
  function arPos(r, bath) { const g = arGeom(r); return bath === 'hot' ? { x: g.hotX, y: g.tableY - 14 } : bath === 'ice' ? { x: g.iceX, y: g.tableY - 14 } : { x: g.midX, y: g.tableY - 4 }; }
  function arDip(bath) {
    const a = S.ar; if (a.bath === bath && a.fl.p >= 1) return;
    Sound.click();
    const e = clamp(a.fl.p, 0, 1), cur = { x: a.fl.x0 + (a.fl.x1 - a.fl.x0) * e, y: a.fl.y0 + (a.fl.y1 - a.fl.y0) * e };
    const to = arPos(SPL.A, bath);
    Object.assign(a.fl, { x0: cur.x, y0: cur.y, x1: to.x, y1: to.y, p: 0 }); a.bath = bath;
    SciSim.tween(a.fl, { p: 1 }, { duration: 1.0, ease: 'inOutQuad', onDone: () => { updateCtl(); } }); updateCtl();
  }
  function resetAr() {
    const a = S.ar; a.bath = 'room'; a.c = BATH.room.c; a.temp = 25; a.log = []; a.dcs = 0; a.flashF = 0; a.flashB = 0; a.named = false; a.ok = false; a.sel = { fwd: '', bwd: '', sym: '' };
    const p = arPos(SPL.A, 'room'); Object.assign(a.fl, { x0: p.x, y0: p.y, x1: p.x, y1: p.y, p: 1 }); SciSim.tween(a.fl, { p: 1 }, { duration: 0.001 });
    ['Fwd', 'Bwd', 'Sym'].forEach((k) => { const e = $('#sel' + k); e.value = ''; mark2(e, ''); });
  }
  $('#bHot').addEventListener('click', () => arDip('hot')); $('#bIce').addEventListener('click', () => arDip('ice')); $('#bRoom').addEventListener('click', () => arDip('room'));
  function stepAr(dt) {
    const a = S.ar, tgt = BATH[a.bath], before = a.c;
    if (a.fl.p >= 0.7) a.c = SciSim.approach(a.c, tgt.c, dt, 1.1);
    if (a.fl.p >= 0.5) a.temp = SciSim.approach(a.temp, tgt.T, dt, 0.7);
    const dc = dt > 0 ? (a.c - before) / dt : 0;
    a.dcs = SciSim.approach(a.dcs || 0, dc, dt, 8);
    a.flashF = SciSim.approach(a.flashF, a.dcs < -0.012 ? 1 : 0, dt, 9); a.flashB = SciSim.approach(a.flashB, a.dcs > 0.012 ? 1 : 0, dt, 9);
    if (a.fl.p >= 1 && (a.bath === 'hot' || a.bath === 'ice') && Math.abs(a.c - tgt.c) < 0.02 && a.log[a.log.length - 1] !== a.bath) {
      a.log.push(a.bath); Sound.tick(); if (!RM) { const p = arPos(SPL.A, a.bath); parts.burst(p.x, p.y - 70, { count: 10, speed: 90, colors: a.bath === 'hot' ? ['#a65a2a', '#e2464b', '#ffd447'] : ['#9fd0ff', '#ffffff'] }); }
    }
  }
  function drawBeaker(x, bottom, w, h, liq, tint, label, labelBg) {
    const x0 = x - w / 2, top = bottom - h;
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, bottom - 10); ctx.quadraticCurveTo(x0, bottom, x0 + 10, bottom); ctx.lineTo(x0 + w - 10, bottom); ctx.quadraticCurveTo(x0 + w, bottom, x0 + w, bottom - 10); ctx.lineTo(x0 + w, top); ctx.closePath(); ctx.clip();
    const g = ctx.createLinearGradient(0, liq, 0, bottom); g.addColorStop(0, C.rgba(tint, 0.55)); g.addColorStop(1, C.rgba(tint, 0.82));
    ctx.fillStyle = g; ctx.fillRect(x0, liq, w, bottom - liq); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x0, liq - 1, w, 3);
    ctx.restore();
  }
  function drawBeakerGlass(x, bottom, w, h) {
    const x0 = x - w / 2, top = bottom - h;
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x0 - 6, top); ctx.lineTo(x0, top + 4); ctx.lineTo(x0, bottom - 10); ctx.quadraticCurveTo(x0, bottom, x0 + 10, bottom); ctx.lineTo(x0 + w - 10, bottom); ctx.quadraticCurveTo(x0 + w, bottom, x0 + w, bottom - 10); ctx.lineTo(x0 + w, top + 4); ctx.lineTo(x0 + w + 6, top); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0 + 8, top + 14); ctx.lineTo(x0 + 8, bottom - 16); ctx.stroke();
  }
  function drawArA(r) {
    const g = arGeom(r), a = S.ar, t = S.t;
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4');
    D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = '#c9d1e2'; ctx.fillRect(r.x, g.tableY, r.w, r.y + r.h - g.tableY); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(r.x, g.tableY, r.w, 3);
    T(r.x + 14, r.y + 26, '🧪 밀봉한 NO₂ / N₂O₄ 플라스크 (모의)', 16, INK, 'left', 800);
    drawBeaker(g.hotX, g.tableY, g.bw, g.bh, g.liq, '#ff9a57');
    drawBeaker(g.iceX, g.tableY, g.bw, g.bh, g.liq, '#7cc4ff');
    // 얼음
    for (let i = 0; i < 4; i++) { const ix = g.iceX - g.bw * 0.32 + i * g.bw * 0.2, iy = g.liq + 4 + Math.sin(t * 1.3 + i * 1.7) * 2 - (i % 2) * 5; ctx.save(); ctx.translate(ix, iy); ctx.rotate(0.3 * (i - 1.5) * 0.3); D.roundRect(-11, -11, 22, 22, 4); ctx.fillStyle = 'rgba(235,248,255,.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,180,225,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
    // 김
    if (!RM) for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = 0.45 * (1 - ph); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); const sx = g.hotX - 26 + i * 26, sy = g.liq - 6 - ph * 40; ctx.moveTo(sx, sy + 12); ctx.quadraticCurveTo(sx + 7, sy + 5, sx, sy); ctx.quadraticCurveTo(sx - 7, sy - 5, sx, sy - 12); ctx.stroke(); ctx.globalAlpha = 1; }
    // 플라스크
    const e = clamp(a.fl.p, 0, 1), fx = a.fl.x0 + (a.fl.x1 - a.fl.x0) * e, fy = a.fl.y0 + (a.fl.y1 - a.fl.y0) * e - Math.sin(e * Math.PI) * 58;
    drawFlask(fx, fy, g.fw, g.fh, a.c, true);
    // 물에 잠긴 부분을 살짝 덮기
    [[g.hotX, '#ff9a57'], [g.iceX, '#7cc4ff']].forEach(([bx, tint]) => { if (Math.abs(fx - bx) < g.bw / 2) { ctx.save(); ctx.beginPath(); ctx.rect(bx - g.bw / 2, g.liq, g.bw, g.tableY - g.liq); ctx.clip(); FL_SHELL(fx, fy, g.fw, g.fh); ctx.closePath(); ctx.fillStyle = C.rgba(tint, 0.2); ctx.fill(); ctx.restore(); } });
    drawBeakerGlass(g.hotX, g.tableY, g.bw, g.bh); drawBeakerGlass(g.iceX, g.tableY, g.bw, g.bh);
    D.label(g.hotX, g.tableY + 24, '뜨거운 물 80 °C', { bg: '#e2701f', size: 13 }); D.label(g.iceX, g.tableY + 24, '얼음물 0 °C', { bg: '#2a8bd6', size: 13 });
    // 온도계 느낌의 표시
    D.label(g.midX, g.tableY + 24, '플라스크 ' + Math.round(a.temp) + ' °C', { bg: '#5d6879', size: 13 });
  }
  function drawArB(r) {
    const a = S.ar, wide = r.w > 420;
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '반응식', 14, MUTED, 'left', 800);
    const eqy = r.y + 78;
    const lx = r.x + r.w * 0.2, rx = r.x + r.w * 0.8, cx = r.x + r.w / 2;
    D.roundRect(lx - 44, eqy - 22, 88, 44, 12); ctx.fillStyle = 'rgba(166,90,42,.22)'; ctx.fill(); T(lx, eqy + 6, '2NO₂', 20, INK, 'center', 800);
    D.roundRect(rx - 44, eqy - 22, 88, 44, 12); ctx.fillStyle = 'rgba(160,170,190,.18)'; ctx.fill(); T(rx, eqy + 6, 'N₂O₄', 20, INK, 'center', 800);
    T(lx, eqy + 40, '붉은 갈색 기체', 13, BRN, 'center', 800); T(rx, eqy + 40, '무색 기체', 13, MUTED, 'center', 800);
    const sym = a.named ? '⇌' : a.sel.sym, litF = a.flashF, litB = a.flashB;
    const cF = litF > 0.05 ? C.mix('#9aa5b8', '#e2464b', litF) : '#7d8aa3', cB = litB > 0.05 ? C.mix('#9aa5b8', '#3867f4', litB) : '#7d8aa3';
    const aw = Math.max(50, rx - lx - 100), ax = cx - aw / 2;
    if (sym === '') T(cx, eqy + 8, '?', 24, MUTED, 'center', 800);
    else {
      if (sym === '→' || sym === '⇌') D.arrow(ax, sym === '⇌' ? eqy - 6 : eqy, ax + aw, sym === '⇌' ? eqy - 6 : eqy, { color: cF, width: 3 + 2 * litF, head: 12 });
      if (sym === '←' || sym === '⇌') D.arrow(ax + aw, sym === '⇌' ? eqy + 8 : eqy, ax, sym === '⇌' ? eqy + 8 : eqy, { color: cB, width: 3 + 2 * litB, head: 12 });
    }
    T(cx, eqy - 22, a.named ? '정반응' : '오른쪽으로', 13, litF > 0.05 ? '#b4231f' : MUTED, 'center', 800); T(cx, eqy + 30, a.named ? '역반응' : '왼쪽으로', 13, litB > 0.05 ? '#1d3fb8' : MUTED, 'center', 800);
    // 갈색 비율 막대
    const by = eqy + 66, bw = r.w - 40;
    T(r.x + 20, by - 6, 'NO₂ 비율 (갈색의 진하기)', 13.5, INK, 'left', 800); T(r.x + r.w - 20, by - 6, Math.round(a.c * 100) + ' %', 14, BRN, 'right', 800);
    D.roundRect(r.x + 20, by, bw, 14, 7); ctx.fillStyle = '#eef0f6'; ctx.fill();
    ctx.save(); D.roundRect(r.x + 20, by, bw, 14, 7); ctx.clip(); ctx.fillStyle = C.mix('#e8c9a8', '#8a4a1c', clamp(a.c, 0, 1)); ctx.fillRect(r.x + 20, by, bw * clamp(a.c, 0, 1), 14); ctx.restore();
    // 설명
    let yy = by + 40;
    const msg = a.dcs > 0.012 ? '색이 진해져요: N₂O₄ → 2NO₂ (← 방향) 반응이 더 많이 일어나요.' : a.dcs < -0.012 ? '색이 옅어져요: 2NO₂ → N₂O₄ (→ 방향) 반응이 더 많이 일어나요.' : '뜨거운 물과 얼음물에 번갈아 담가 보세요.';
    yy += textBlock(r.x + 16, yy, r.w - 32, msg, 14, INK, 18, 800) + 8;
    if (a.log.length) {
      T(r.x + 16, yy + 6, '기록', 13, MUTED, 'left', 800); yy += 14;
      a.log.slice(-4).forEach((k, i) => { T(r.x + 16, yy + 16 + i * 20, (k === 'hot' ? '🔥 뜨거운 물 → 색이 진해졌어요' : '🧊 얼음물 → 색이 옅어졌어요'), 13.5, INK, 'left', 800); });
    }
  }

  /* ================= ③ 분류하기: 카드 + 콜라 병 ================= */
  const CWt = PHONE ? 226 : 176, CHt = PHONE ? 36 : 50, CWb = PHONE ? 208 : 170, CHb = PHONE ? 34 : 48;
  const TRAY = { x0: PHONE ? 10 : 33, y0: PHONE ? 40 : 38, cols: PHONE ? 2 : 4, px: PHONE ? 236 : 186, py: PHONE ? 42 : 60 };
  const BOXY = PHONE ? 258 : 232, BOXH = PHONE ? 434 : 318, BOXW = PHONE ? 228 : 380;
  const BOXES = [{ x: PHONE ? 8 : 12, y: BOXY, w: BOXW, h: BOXH, name: '🔁 가역 반응', col: '#14a058' }, { x: PHONE ? 244 : 408, y: BOXY, w: BOXW, h: BOXH, name: '➡ 비가역 반응', col: '#e2464b' }];
  function trayPos(k) { return { x: TRAY.x0 + (k % TRAY.cols) * TRAY.px + CWt / 2, y: TRAY.y0 + Math.floor(k / TRAY.cols) * TRAY.py + CHt / 2 }; }
  function boxPos(b, i) { const B = BOXES[b]; const col = PHONE ? 0 : i % 2, row = PHONE ? i : Math.floor(i / 2); return { x: B.x + (PHONE ? 10 : 12) + col * 176 + CWb / 2, y: B.y + 38 + row * (PHONE ? 40 : 55) + CHb / 2 }; }
  function targetOf(k) { const b = S.so.loc[k]; return b < 0 ? trayPos(k) : boxPos(b, S.so.order[b].indexOf(k)); }
  function soPlace(k, b) {
    const s = S.so; if (s.loc[k] >= 0) s.order[s.loc[k]].splice(s.order[s.loc[k]].indexOf(k), 1);
    s.loc[k] = b; if (b >= 0) s.order[b].push(k); delete s.flagged[k]; s.checked = false; updateCtl();
  }
  function soReset() { const s = S.so; s.loc = CARDS.map(() => -1); s.order = [[], []]; s.sel = -1; s.drag = null; s.flagged = {}; s.checked = false; s.pos = CARDS.map((c, k) => Object.assign({}, trayPos(k))); }
  function soCardAt(p) {
    let best = -1, bd = 1e9; const s = S.so;
    CARDS.forEach((c, k) => { const q = s.pos[k], w = s.loc[k] < 0 ? CWt : CWb, h = s.loc[k] < 0 ? CHt : CHb; if (Math.abs(p.x - q.x) <= w / 2 && Math.abs(p.y - q.y) <= h / 2) { const d = Math.hypot(p.x - q.x, p.y - q.y); if (d < bd) { bd = d; best = k; } } });
    return best;
  }
  function soBoxAt(p) { for (let b = 0; b < 2; b++) { const B = BOXES[b]; if (p.x >= B.x && p.x <= B.x + B.w && p.y >= B.y && p.y <= B.y + B.h) return b; } return -1; }
  function soDown(p) {
    if (S.mode !== 'sort' || S.so.sub !== 'sort') return false;
    const k = soCardAt(p); if (k < 0) return false;
    const q = S.so.pos[k]; S.so.drag = { k, ox: q.x - p.x, oy: q.y - p.y, moved: false, sx: p.x, sy: p.y }; S.so.sel = k; Sound.click(); updateCtl(); return true;
  }
  function soMove(p) {
    const d = S.so.drag; if (!d) return;
    S.so.pointer = p;
    if (Math.hypot(p.x - d.sx, p.y - d.sy) > 6) d.moved = true;
    if (d.moved) { const q = S.so.pos[d.k]; q.x = clamp(p.x + d.ox, 20, VW - 20); q.y = clamp(p.y + d.oy, 20, VH - 20); }
  }
  function soUp(p) {
    const d = S.so.drag; if (!d) return; S.so.drag = null; S.so.pointer = null;
    if (!d.moved) return;
    const b = soBoxAt(p);
    if (b >= 0) { if (S.so.loc[d.k] !== b) { soPlace(d.k, b); parts.burst(S.so.pos[d.k].x, S.so.pos[d.k].y, { count: 6, speed: 70, size: 2.4, gravity: 0, colors: [BOXES[b].col, '#ffd447'] }); } }
    else if (S.so.loc[d.k] >= 0) soPlace(d.k, -1);
    updateCtl();
  }
  $('#bToRev').addEventListener('click', () => { if (S.so.sel >= 0) { Sound.click(); soPlace(S.so.sel, 0); } });
  $('#bToIrr').addEventListener('click', () => { if (S.so.sel >= 0) { Sound.click(); soPlace(S.so.sel, 1); } });
  $('#bSortClear').addEventListener('click', () => { Sound.click(); CARDS.forEach((c, k) => { if (S.so.loc[k] >= 0) soPlace(k, -1); }); S.so.sel = -1; updateCtl(); });
  function stepSort(dt) { CARDS.forEach((c, k) => { if (S.so.drag && S.so.drag.moved && S.so.drag.k === k) return; const t = targetOf(k), q = S.so.pos[k]; q.x = SciSim.approach(q.x, t.x, dt, 14); q.y = SciSim.approach(q.y, t.y, dt, 14); }); }
  function drawCard(k, lift) {
    const c = CARDS[k], q = S.so.pos[k], inBox = S.so.loc[k] >= 0, w = inBox ? CWb : CWt, h = inBox ? CHb : CHt, flag = S.so.flagged[k], sel = S.so.sel === k;
    D.shadow(() => { D.roundRect(q.x - w / 2, q.y - h / 2, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: lift ? 14 : 4, y: lift ? 7 : 2 });
    ctx.strokeStyle = flag ? BAD : sel ? VIO : lift ? VIO : '#d6dcea'; ctx.lineWidth = flag || sel || lift ? 3 : 1.5; D.roundRect(q.x - w / 2, q.y - h / 2, w, h, 10); ctx.stroke();
    if (flag) { ctx.fillStyle = 'rgba(226,70,75,.08)'; D.roundRect(q.x - w / 2, q.y - h / 2, w, h, 10); ctx.fill(); }
    T(q.x - w / 2 + 18, q.y + 7, c.icon, PHONE ? 17 : 22, '#000', 'center', 700);
    if (PHONE) T(q.x - w / 2 + 36, q.y + 5, c.name, 13, INK, 'left', 800);
    else { T(q.x - w / 2 + 36, q.y - 3, c.name, 14.5, INK, 'left', 800); T(q.x - w / 2 + 36, q.y + 15, c.sub, 12, MUTED, 'left', 700); }
  }
  function drawSort() {
    T(14, 24, '🃏 카드를 끌어서 알맞은 상자에 넣어요', PHONE ? 15 : 17, INK, 'left', 800);
    CARDS.forEach((c, k) => { if (S.so.loc[k] < 0) { const t = trayPos(k); ctx.strokeStyle = '#d0d7e6'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); D.roundRect(t.x - CWt / 2, t.y - CHt / 2, CWt, CHt, 10); ctx.stroke(); ctx.setLineDash([]); } });
    BOXES.forEach((B, b) => {
      const hot = S.so.drag && S.so.drag.moved && soBoxAt({ x: S.so.pointer ? S.so.pointer.x : -1, y: S.so.pointer ? S.so.pointer.y : -1 }) === b;
      panel(B.x, B.y, B.w, B.h, 14, hot ? C.mix('#ffffff', B.col, 0.1) : '#fff');
      ctx.strokeStyle = B.col; ctx.lineWidth = hot ? 3.5 : 2; ctx.setLineDash([7, 5]); D.roundRect(B.x + 3, B.y + 3, B.w - 6, B.h - 6, 12); ctx.stroke(); ctx.setLineDash([]);
      T(B.x + 14, B.y + 26, B.name, PHONE ? 15 : 16.5, B.col === '#14a058' ? '#0b6b39' : '#b4231f', 'left', 800);
      T(B.x + B.w - 14, B.y + 26, S.so.order[b].length + '장', 13.5, MUTED, 'right', 800);
    });
    CARDS.forEach((c, k) => { if (!(S.so.drag && S.so.drag.moved && S.so.drag.k === k)) drawCard(k, false); });
    if (S.so.drag && S.so.drag.moved) drawCard(S.so.drag.k, true);
  }
  /* ---------- 콜라 병: 기체 CO₂ ⇌ 녹은 CO₂ ---------- */
  const BT = { nw: 46, bw: 150, capH: 14, neckEnd: 92, shEnd: 142, bodyEnd: 392, surf: 162, rr: 26, S: 7 };
  function halfW(y) {
    if (y < BT.capH) return 0;
    if (y < BT.neckEnd) return BT.nw / 2;
    if (y < BT.shEnd) return BT.nw / 2 + (BT.bw / 2 - BT.nw / 2) * (y - BT.neckEnd) / (BT.shEnd - BT.neckEnd);
    if (y < BT.bodyEnd - BT.rr) return BT.bw / 2;
    const d = y - (BT.bodyEnd - BT.rr); return BT.bw / 2 - BT.rr + Math.sqrt(Math.max(0, BT.rr * BT.rr - d * d));
  }
  function colaReset() {
    const c = S.cl; c.cap = true; c.opened = false; c.mols = []; c.lost = 0; c.evD = 0; c.evE = 0; c.rD = 0; c.rE = 0; c.closedAfter = 0; c.fiz = 0; c.exits = [];
    for (let i = 0; i < COLA_N; i++) {
      const gas = i < 10; let x, y, k = 0;
      do { y = gas ? rnd(BT.capH + 10, BT.surf - 8) : rnd(BT.surf + 12, BT.bodyEnd - 30); x = rnd(-BT.bw / 2, BT.bw / 2); } while (Math.abs(x) > halfW(y) - 9 && k++ < 40);
      const a = Math.random() * TAU, sp = gas ? 70 : 30;
      c.mols.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, gas, ang: Math.random() * TAU, av: rnd(-2, 2) });
    }
    c.capAnim.p = 0; SciSim.tween(c.capAnim, { p: 0 }, { duration: 0.001 });
  }
  function colaToggle() {
    const c = S.cl; Sound.click(); c.cap = !c.cap;
    if (!c.cap) { c.opened = true; c.closedAfter = 0; }
    SciSim.tween(c.capAnim, { p: c.cap ? 0 : 1 }, { duration: 0.5, ease: 'outBack' });
    if (!c.cap && !RM) c.fiz = 1.2;
    updateCtl();
  }
  $('#bCap').addEventListener('click', colaToggle); $('#bColaReset').addEventListener('click', () => { Sound.click(); colaReset(); updateCtl(); });
  const colaCount = () => { let g = 0, d = 0; S.cl.mols.forEach((m) => { if (m.gas) g++; else d++; }); return { g, d, tot: g + d }; };
  function stepCola(dt) {
    const c = S.cl, open = !c.cap, ke = 0.15, kd = 0.3, r = BT.S * 0.9;
    c.fiz = Math.max(0, c.fiz - dt);
    c.mols.forEach((m) => {
      // 기체 ↔ 녹음 전환 (뚜껑이 열려 있든 닫혀 있든 늘 일어나요)
      if (!m.trans) {
        if (m.gas) { if (m.y < BT.surf - 14 && Math.random() < kd * (open ? 0.35 : 1) * dt) { m.gas = false; m.trans = 'down'; c.evD += 1; m.vy = 50; } }
        else if (m.y > BT.surf + 14 && Math.random() < ke * (open ? 1.6 : 1) * dt) { m.gas = true; m.trans = 'up'; c.evE += 1; m.vy = -60; }
      }
      // 방향이 조금씩 바뀌고 빠르기는 거의 일정해요
      const sp = m.gas ? 70 : 32, j = rnd(-1.6, 1.6) * dt, cs = Math.cos(j), sn = Math.sin(j);
      let vx = m.vx * cs - m.vy * sn, vy = m.vx * sn + m.vy * cs;
      if (m.gas && open && !m.trans) { const dx = -m.x, dy = BT.capH - 12 - m.y, dl = Math.hypot(dx, dy) || 1, q = Math.min(1, 1.6 * dt); vx += (dx / dl * 70 - vx) * q; vy += (dy / dl * 70 - vy) * q; }
      if (m.trans === 'up') vy = -Math.abs(vy); else if (m.trans === 'down') vy = Math.abs(vy);
      const l = Math.hypot(vx, vy) || 1, k = Math.min(1, 2.5 * dt), ns = l + (sp - l) * k; vx *= ns / l; vy *= ns / l; m.vx = vx; m.vy = vy;
      let nx = m.x + vx * dt, ny = m.y + vy * dt;
      if (ny > BT.bodyEnd - r) { m.vy = -Math.abs(m.vy); ny = m.y; }
      { const hw = Math.max(0, halfW(Math.max(ny, BT.capH + 0.01)) - r); if (Math.abs(nx) > hw) { const sg = nx < 0 ? -1 : 1; nx = sg * hw; m.vx = -sg * Math.abs(m.vx); } }
      if (m.gas) {
        if (ny < BT.capH + r) { if (!(open && Math.abs(nx) < BT.nw / 2 - r * 0.5)) { m.vy = Math.abs(m.vy); ny = m.y; } }
        if (!m.trans && ny > BT.surf - r) { m.vy = -Math.abs(m.vy); ny = m.y; }
      } else if (!m.trans && ny < BT.surf + r) { m.vy = Math.abs(m.vy); ny = m.y; }
      m.x = nx; m.y = ny; m.ang += m.av * dt;
      if (m.trans === 'up' && m.y < BT.surf - r) m.trans = null;
      if (m.trans === 'down' && m.y > BT.surf + r) m.trans = null;
      if (open && m.gas && m.y < BT.capH - 1) m.out = true;
    });
    const gone = c.mols.filter((m) => m.out);
    if (gone.length) { gone.forEach((m) => { c.exits.push({ x: m.x, y: m.y, age: 0, vx: m.vx * 0.3 }); c.lost++; }); c.mols = c.mols.filter((m) => !m.out); }
    c.exits.forEach((q) => { q.age += dt; q.y -= 70 * dt; q.x += q.vx * dt; }); c.exits = c.exits.filter((q) => q.age < 0.8);
    // 초당 전환 횟수의 평균 (화살표 굵기)
    c.rD = SciSim.approach(c.rD, c.evD / Math.max(dt, 0.001), dt, 0.8); c.rE = SciSim.approach(c.rE, c.evE / Math.max(dt, 0.001), dt, 0.8); c.evD = 0; c.evE = 0;
    // 입자가 절반 이하로 줄어든 채로 뚜껑이 닫혀 있는 시간
    const cc = colaCount(), tot = cc.tot; c.minTot = Math.min(c.minTot, tot);
    if (c.cap && c.opened && tot <= COLA_HALF) c.closedAfter += dt; else if (!c.cap) c.closedAfter = 0;
    // 병을 열었을 때의 기포
    if (open && !RM && Math.random() < dt * (6 + cc.d * 0.4)) { const o = c.org; if (o) parts.emit({ x: o.x + rnd(-BT.nw * 0.35, BT.nw * 0.35) * o.k, y: o.y - 2, vx: rnd(-14, 14), vy: -rnd(30, 70), life: 0.9, size: rnd(2, 4), color: '#ffffff', shape: 'bubble', gravity: -6, drag: 0.4 }); }
  }
  function bottleGeom(r) {
    const k = Math.min(1, (r.h - 70) / 405, (r.w * 0.78) / BT.bw), ox = r.x + r.w / 2, oy = r.y + (r.h - 405 * k) / 2 + 6 * k;
    return { k, ox, oy };
  }
  function bottlePath() {
    ctx.beginPath(); ctx.moveTo(-BT.nw / 2, BT.capH); ctx.lineTo(-BT.nw / 2, BT.neckEnd); ctx.lineTo(-BT.bw / 2, BT.shEnd); ctx.lineTo(-BT.bw / 2, BT.bodyEnd - BT.rr); ctx.quadraticCurveTo(-BT.bw / 2, BT.bodyEnd, -BT.bw / 2 + BT.rr, BT.bodyEnd); ctx.lineTo(BT.bw / 2 - BT.rr, BT.bodyEnd); ctx.quadraticCurveTo(BT.bw / 2, BT.bodyEnd, BT.bw / 2, BT.bodyEnd - BT.rr); ctx.lineTo(BT.bw / 2, BT.shEnd); ctx.lineTo(BT.nw / 2, BT.neckEnd); ctx.lineTo(BT.nw / 2, BT.capH);
  }
  function drawCO2(x, y, s, ang, dis, a) {
    const dx = Math.cos(ang) * s * 1.15, dy = Math.sin(ang) * s * 1.15;
    if (dis) { ctx.strokeStyle = 'rgba(40,110,220,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, s * 1.9, 0, TAU); ctx.stroke(); }
    ctx.save(); if (a != null) ctx.globalAlpha = a; ctx.strokeStyle = '#6b7488'; ctx.lineWidth = Math.max(1.5, s * 0.22); ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke(); ctx.restore();
    atom(x - dx, y - dy, s * 0.62, '#e2464b', a); atom(x + dx, y + dy, s * 0.62, '#e2464b', a); atom(x, y, s * 0.68, '#4b5563', a);
  }
  function drawColaA(r) {
    const c = S.cl, g = bottleGeom(r), cp = colaCount();
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4'); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill();
    T(r.x + 14, r.y + 26, '🥤 탄산음료 병 (대표 CO₂ 입자 ' + COLA_N + '개)', 16, INK, 'left', 800);
    c.org = { x: g.ox, y: g.oy + BT.capH * g.k, k: g.k };
    ctx.save(); ctx.translate(g.ox, g.oy); ctx.scale(g.k, g.k);
    // 음료
    ctx.save(); bottlePath(); ctx.closePath(); ctx.clip();
    const lg = ctx.createLinearGradient(0, BT.surf, 0, BT.bodyEnd); lg.addColorStop(0, 'rgba(236,190,96,.78)'); lg.addColorStop(1, 'rgba(196,140,50,.9)');
    ctx.fillStyle = lg; ctx.fillRect(-BT.bw, BT.surf, BT.bw * 2, BT.bodyEnd - BT.surf);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(-BT.bw / 2, BT.surf); for (let i = 0; i <= 16; i++) ctx.lineTo(-BT.bw / 2 + BT.bw * i / 16, BT.surf + Math.sin(S.t * 2.2 + i) * 1.4); ctx.lineTo(BT.bw / 2, BT.surf + 4); ctx.lineTo(-BT.bw / 2, BT.surf + 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    // 입자
    c.mols.forEach((m) => drawCO2(m.x, m.y, BT.S, m.ang, !m.gas));
    c.exits.forEach((q) => drawCO2(q.x, q.y, BT.S, q.age * 4, false, 1 - q.age / 0.8));
    // 유리
    bottlePath(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-BT.bw / 2 + 10, BT.shEnd + 24); ctx.lineTo(-BT.bw / 2 + 10, BT.bodyEnd - 40); ctx.stroke();
    // 뚜껑
    const e = clamp(c.capAnim.p, 0, 1);
    ctx.save(); ctx.translate(BT.nw * 1.6 * e, -e * 22 + (c.cap ? 0 : 0)); ctx.rotate(e * 0.7);
    D.roundRect(-BT.nw / 2 - 5, -2, BT.nw + 10, BT.capH + 2, 4); ctx.fillStyle = '#d6424a'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-BT.nw / 2, 1, BT.nw - 6, 3);
    ctx.restore();
    ctx.restore();
    // 범례
    const ly = r.y + r.h - 28;
    drawCO2(r.x + 26, ly, 5, 0.3, false); T(r.x + 44, ly + 5, '기체 CO₂', 13, INK, 'left', 800);
    drawCO2(r.x + 126, ly, 5, 0.3, true); T(r.x + 148, ly + 5, '녹은 CO₂', 13, INK, 'left', 800);
    void cp;
  }
  function drawColaB(r) {
    const c = S.cl, cp = colaCount();
    panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '병 속 CO₂ 입자', 14, MUTED, 'left', 800);
    T(r.x + 14, r.y + 62, cp.tot + ' / ' + COLA_N + '개', 30, cp.tot <= COLA_HALF ? '#b4231f' : INK, 'left', 800);
    T(r.x + 14, r.y + 88, '기체 ' + cp.g + '개 · 녹은 것 ' + cp.d + '개 · 날아간 것 ' + c.lost + '개', 13.5, INK, 'left', 800);
    const cxm = r.x + r.w / 2, y0 = r.y + 116;
    const row = (y, label, col) => { D.roundRect(r.x + 12, y - 15, r.w - 24, 30, 15); ctx.fillStyle = col + '22'; ctx.fill(); T(cxm, y + 6, label, 14.5, INK, 'center', 800); };
    row(y0, 'CO₂(g) + H₂O(l)  기체', '#4b5563');
    const wF = 3 + Math.min(7, c.rD * 1.1), wB = 3 + Math.min(7, c.rE * 1.1);
    D.arrow(cxm - 14, y0 + 24, cxm - 14, y0 + 78, { color: '#3867f4', width: wF, head: 12 }); D.arrow(cxm + 14, y0 + 78, cxm + 14, y0 + 24, { color: '#e2464b', width: wB, head: 12 });
    T(cxm - 28, y0 + 56, '녹아요', 13.5, '#1d3fb8', 'right', 800); T(cxm + 28, y0 + 56, '빠져나와요', 13.5, '#b4231f', 'left', 800);
    row(y0 + 100, 'H₂CO₃(aq)  녹은 상태', '#2a78dc');
    const msg = c.cap ? '닫힌 병: 두 방향이 모두 일어나서 입자 수가 그대로예요.' : '열린 병: 나간 기체는 돌아오지 못해서 계속 줄어요.';
    textBlock(r.x + 14, y0 + 144, r.w - 28, msg, 14, INK, 18, 800);
  }

  /* ================= ④ 멈춘 걸까? ================= */
  const wtNow = () => wtNO2(S.wt.ts);
  function wtStart() { if (S.wt.run || S.wt.done) return; Sound.click(); S.wt.run = true; updateCtl(); }
  function wtReset() { Object.assign(S.wt, { run: false, ts: 0, done: false, pts: [] }); S.wt.pts.push([0, 0]); updateCtl(); }
  $('#bStart').addEventListener('click', wtStart); $('#bAgain').addEventListener('click', () => { Sound.click(); wtReset(); });
  function stepWt(dt) {
    const w = S.wt; if (!w.run) return;
    w.ts = Math.min(60, w.ts + dt * WT_SPEED);
    const last = w.pts[w.pts.length - 1][0]; if (w.ts - last >= 0.5 || w.ts >= 60) w.pts.push([w.ts, wtNow()]);
    if (w.ts >= 60) { w.run = false; w.done = true; Sound.success(); updateCtl(); if (!RM) parts.burst(SPL.A.x + SPL.A.w / 2, SPL.A.y + SPL.A.h * 0.3, { count: 14, colors: ['#a65a2a', '#ffd447', '#ffffff'] }); }
  }
  function drawWaitA(r) {
    const w = S.wt, bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg.addColorStop(0, '#eef2fb'); bg.addColorStop(1, '#e3e8f4'); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = bg; ctx.fill();
    T(r.x + 14, r.y + 26, '🧪 N₂O₄만 넣은 밀봉 플라스크', 16, INK, 'left', 800);
    const tableY = r.y + r.h - Math.max(46, r.h * 0.1); ctx.fillStyle = '#c9d1e2'; ctx.fillRect(r.x, tableY, r.w, r.y + r.h - tableY); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(r.x, tableY, r.w, 3);
    const fw = Math.min(190, r.w * 0.4), fh = Math.min(260, r.h * 0.6), cx = r.x + r.w / 2, by = tableY - 4;
    const gas = wtNow() / WT_END;
    drawFlask(cx, by, fw, fh, gas, true);
    D.label(cx, by - fh * 0.38, w.ts <= 0 ? '무색' : gas < 0.9 ? '색이 진해져요' : '색이 일정해요', { bg: gas > 0.6 ? '#8a4a1c' : '#7a8599', size: 14 });
    // 시계
    const ccx = r.x + r.w - 62, ccy = r.y + 70;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ccx, ccy, 34, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8895ab'; ctx.lineWidth = 3; ctx.stroke();
    const ang = (w.ts / 60) * TAU - Math.PI / 2; ctx.strokeStyle = BAD; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.lineTo(ccx + Math.cos(ang) * 24, ccy + Math.sin(ang) * 24); ctx.stroke();
    T(ccx, ccy + 54, Math.floor(w.ts) + ' 초', 15, INK, 'center', 800);
    // 색 견본
    T(r.x + 18, tableY + 26, '색의 진하기', 13.5, MUTED, 'left', 800);
    D.roundRect(r.x + 110, tableY + 12, r.w - 130, 16, 8); ctx.fillStyle = '#eef0f6'; ctx.fill();
    ctx.save(); D.roundRect(r.x + 110, tableY + 12, r.w - 130, 16, 8); ctx.clip(); ctx.fillStyle = C.mix('#e8c9a8', '#8a4a1c', clamp(gas, 0, 1)); ctx.fillRect(r.x + 110, tableY + 12, (r.w - 130) * clamp(gas, 0, 1), 16); ctx.restore();
  }
  function drawWaitB(r) {
    const w = S.wt; panel(r.x, r.y, r.w, r.h, 14, '#fff');
    T(r.x + 14, r.y + 24, '색–시간 그래프 (NO₂ 농도)', 14, MUTED, 'left', 800);
    const gr = { x: r.x + 4, y: r.y + 36, w: r.w - 8, h: r.h - 120 };
    const P = makePlot(gr, { x0: 0, x1: 60, y0: 0, y1: 0.014, padL: 58, padR: 14, padT: 10, padB: 36 });
    drawAxes(P, { xticks: [0, 10, 20, 30, 40, 50, 60], yticks: [0, 0.004, 0.008, 0.012], yfmt: (v) => v.toFixed(3), xlabel: '시간 (초)', ylabel: '[NO₂] mol/L' });
    ctx.save(); ctx.strokeStyle = 'rgba(226,70,75,.5)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(P.px, P.Y(WT_END)); ctx.lineTo(P.px + P.pw, P.Y(WT_END)); ctx.stroke(); ctx.restore();
    polyline(P, w.pts, BRN, 3.5);
    if (w.ts > 0 || w.pts.length) { const q = w.pts[w.pts.length - 1]; atom(P.X(q[0]), P.Y(q[1]), 6, '#a65a2a'); }
    const msg = w.done ? '약 40초부터 색이 더 이상 변하지 않아요. 반응도 멈춘 걸까요?' : w.ts > 0 ? '색이 점점 진해지고 있어요…' : '▶ 실험 시작을 누르면 색이 변하는 모습을 기록해요.';
    textBlock(r.x + 16, r.y + r.h - 70, r.w - 32, msg, 14, INK, 18, 800);
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'heat' && S.cu.sys === 'cu') {
      const cu = S.cu;
      L1 = '시약의 색'; a = cu.hydr > 0.85 ? '파란색' : cu.hydr < 0.15 ? '흰색' : '변하는 중';
      L2 = '결정에 붙은 물 분자'; b = Math.round(cu.hydr * 5) + '개 / 5개';
      L3 = '왕복 횟수'; c = cu.rt + '번';
    } else if (S.mode === 'heat') {
      const co = S.co; L1 = '종이의 색'; a = co.w < 0.15 ? '푸른색' : co.w > 0.85 ? '붉은색' : '변하는 중';
      L2 = '종이를 둔 곳'; b = co.mv.p < 1 ? '옮기는 중' : co.place === 'dry' ? '마른 공기' : '습한 공기';
      L3 = '색이 바뀐 횟수'; c = co.cyc + '번';
    } else if (S.mode === 'arrow') {
      const ar = S.ar; L1 = '플라스크 온도'; a = Math.round(ar.temp) + ' °C';
      L2 = 'NO₂ 비율'; b = Math.round(ar.c * 100) + ' %';
      L3 = '담근 곳'; c = ar.fl.p < 1 ? '옮기는 중' : BATH[ar.bath].name;
    } else if (S.mode === 'sort' && S.so.sub === 'sort') {
      const n0 = S.so.order[0].length, n1 = S.so.order[1].length; L1 = '상자에 넣은 카드'; a = (n0 + n1) + ' / ' + CARDS.length + '장'; L2 = '가역 반응 상자'; b = n0 + '장'; L3 = '비가역 반응 상자'; c = n1 + '장';
    } else if (S.mode === 'sort') {
      const cp = colaCount(); L1 = '병 속 CO₂ 입자'; a = cp.tot + ' / ' + COLA_N + '개'; L2 = '기체 · 녹은 것'; b = cp.g + '개 · ' + cp.d + '개'; L3 = '뚜껑'; c = S.cl.cap ? '닫힘' : '열림';
    } else {
      const w = S.wt; L1 = '실험 시간'; a = Math.floor(w.ts) + ' 초'; L2 = '[NO₂] 농도'; b = fx(wtNow(), 4) + ' mol/L'; L3 = '색의 상태'; c = w.ts <= 0 ? '무색' : w.ts >= 40 ? '일정해요' : '진해지는 중';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  /* ================= 미션 ================= */
  const cuColorName = () => (S.cu.hydr > 0.85 ? '파란색' : S.cu.hydr < 0.15 ? '흰색' : '변하는 중');
  const levels = [
    {
      title: '되돌리는 변화: 파란색 ⇄ 흰색', short: '되돌리는 변화', icon: '🔵', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 화학 반응은 한 번 일어나면 되돌릴 수 없을까? 되돌릴 수 있는 반응은 무엇이 다를까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 화학 반응은 원자의 배열이 바뀌어 새로운 물질이 생기는 변화이고, 반응 전후에 원자의 종류와 수가 같다고 배웠어요. 이번에는 생성물에서 <b>처음 물질로 되돌아오는</b> 반응을 만나 봐요.</div>' +
        '<p>파란색 <b>황산 구리 수화물(CuSO₄·5H₂O)</b>을 가열하고 물을 떨어뜨리며 색이 어떻게 오가는지 관찰해요. 🔍 입자 모형으로 결정 속 물 분자도 살펴봐요.</p>' +
        '<div class="si-link">🛡️ <b>안전</b> 보안경을 쓰고, 가열하는 시험관의 입구는 사람이 없는 쪽으로 향해요. 실험이 끝난 시약은 선생님 안내에 따라 폐기물로 처리해요.</div>',
      features: ['heat', 'cobalt'],
      setup() { S.gate = ''; resetCu(); resetCo(); S.cu.sys = 'cu'; setScene('heat'); },
      recap: '파란 가루는 가열하면 흰색이 되고, 물을 넣으면 다시 파란색이 되었어요. 같은 물질로 두 방향의 변화가 모두 일어나는 반응을 <b>가역 반응</b>이라고 해요.',
      summary: '<ul><li>CuSO₄·5H₂O(파란색) → <b>가열</b> → CuSO₄(흰색) + 5H₂O: 결정 속 물이 빠져나가요.</li><li>CuSO₄(흰색)에 <b>물</b>을 넣으면 다시 CuSO₄·5H₂O(파란색)이 돼요 (열이 나와요).</li><li>염화 코발트 종이: 마르면 푸른색, 수분을 흡수하면 붉은색 → 습도 지시 종이로 써요.</li><li>이렇게 같은 물질로 <b>두 방향의 변화</b>가 모두 일어나는 반응을 <b>가역 반응</b>이라고 해요. 반응 전후에 원자의 종류와 수는 그대로예요.</li></ul>',
      missions: [
        {
          title: '가열하고 물 넣기, 두 번 왕복',
          goal: '<b>🔥 가열하기</b>로 파란 가루를 흰색으로 바꾸고, <b>💧 물 떨어뜨리기</b>로 다시 파란색으로 되돌려요. 이 <b>왕복을 2번</b> 해 보세요.',
          hint: '가열이 끝나 가루가 흰색이 되면 물을 떨어뜨리세요. 파란색으로 돌아오면 왕복 1번이에요.',
          setup() { S.gate = ''; resetCu(); S.cu.sys = 'cu'; setScene('heat'); },
          check: () => S.cu.rt >= 2 && !S.cu.act, hold: 0.4,
          status: () => '왕복 ' + S.cu.rt + ' / 2번 · 지금 색: ' + cuColorName(),
          explain: '파란 CuSO₄·5H₂O를 가열하면 결정 속 물이 빠져나가 <b>흰색 CuSO₄</b>가 되고, 시험관 벽에 물방울이 맺혀요. 흰색 가루에 물을 떨어뜨리면 물이 다시 결합해 <b>파란색 CuSO₄·5H₂O</b>가 돼요. 반응 전후에 원자의 종류와 수는 변하지 않았고, 같은 물질로 <b>두 방향</b>의 변화가 모두 가능했어요.',
        },
        {
          type: 'quiz', title: '왜 다시 파란색이 되었을까?',
          goal: '흰색 가루에 물을 떨어뜨렸더니 파란색으로 돌아왔어요. 이 현상을 가장 알맞게 설명한 것은?',
          setup() { S.gate = ''; setScene('heat'); },
          choices: ['물이 전혀 다른 새로운 물질로 바뀌어서 처음 물질과 관계가 없어요', '가열로 생긴 CuSO₄와 물이 다시 결합해 처음 물질인 CuSO₄·5H₂O가 생겼어요', '흰색 가루에 파란색 물감이 묻은 거예요', '가열하면 물질이 사라졌다가 물을 부으면 저절로 다시 생겨요'],
          answer: 1,
          feedback: ['물은 흰색 CuSO₄와 결합해서 처음 물질을 만들었어요. 입자 모형에서 물 분자가 다시 붙는 모습을 봐요.', '', '색소가 묻은 게 아니라 물질이 바뀐 거예요. 입자 모형에서 결정 속 물 분자 수가 달라졌죠.', '물질이 사라지지 않아요. 가열하면 물이 빠져나온 것이고, 다시 결합하는 거예요.'],
          explain: '가열하면 CuSO₄·5H₂O → CuSO₄ + 5H₂O, 물을 넣으면 CuSO₄ + 5H₂O → CuSO₄·5H₂O로 <b>반대 방향</b>의 반응이 일어나요. 이렇게 같은 물질로 두 방향의 반응이 모두 일어날 수 있는 것이 <b>가역 반응</b>의 특징이에요.',
        },
      ],
    },
    {
      title: '양방향 화살표: 정반응과 역반응', short: '양방향 화살표', icon: '🔁', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 황산 구리가 가열(한 방향)과 물 첨가(반대 방향)로 오갔어요. 이번에는 <b>온도</b>만 바꾸어 두 방향을 오가는 기체 반응을 살펴봐요.</div>' +
        '<p>밀봉한 플라스크 속에 <b>2NO₂ ⇌ N₂O₄</b>가 들어 있어요. NO₂는 붉은 갈색, N₂O₄는 무색이에요. 반응식에서 <b>왼쪽 → 오른쪽</b>으로 진행하는 반응을 <b>정반응</b>, <b>오른쪽 → 왼쪽</b>으로 진행하는 반응을 <b>역반응</b>이라고 해요.</p>' +
        '<div class="si-link">🛡️ <b>안전</b> NO₂는 유독 기체라서 교실에서는 모의실험으로만 해요. 실제로 뜨거운 물을 다룰 때는 보안경과 장갑을 껴요.</div>',
      features: ['arrow'],
      setup() { S.gate = ''; resetAr(); setScene('arrow'); },
      recap: '온도에 따라 갈색이 진해지고 옅어져요. 한 플라스크에서 정반응과 역반응이 모두 일어날 수 있어서 <b>⇌</b>로 나타내요.',
      summary: '<ul><li>2NO₂(붉은 갈색) ⇌ N₂O₄(무색)</li><li><b>정반응</b>: 반응식의 왼쪽 → 오른쪽 (2NO₂ → N₂O₄), <b>역반응</b>: 오른쪽 → 왼쪽 (N₂O₄ → 2NO₂)</li><li>뜨거운 물에 넣으면 갈색이 진해지고(역반응이 더 일어남), 얼음물에 넣으면 옅어져요(정반응이 더 일어남).</li><li>두 방향이 모두 일어날 수 있는 반응은 <b>⇌</b>로 나타내요. 한 방향으로만 진행하는 반응은 →로 나타내요.</li></ul>',
      missions: [
        {
          title: '뜨거운 물과 얼음물에 번갈아 담그기',
          goal: '플라스크를 <b>뜨거운 물과 얼음물에 번갈아</b> 담그며 색이 진해졌다 옅어졌다 하는 것을 <b>4번</b> 확인해요.',
          hint: '🔥 뜨거운 물 → 🧊 얼음물 → 🔥 → 🧊 순서로 담가요. 색이 다 변할 때까지 기다려야 한 번으로 기록돼요.',
          setup() { S.gate = ''; resetAr(); setScene('arrow'); },
          check: () => S.ar.log.length >= 4, hold: 0.4,
          status: () => '번갈아 담근 횟수 ' + S.ar.log.length + ' / 4 ' + (S.ar.log.length ? '(' + S.ar.log.map((k) => (k === 'hot' ? '🔥' : '🧊')).join(' → ') + ')' : ''),
          explain: '뜨거운 물에서는 갈색이 진해지고(N₂O₄ → 2NO₂), 얼음물에서는 옅어져요(2NO₂ → N₂O₄). 같은 플라스크 안에서 <b>정반응과 역반응이 모두 일어날 수 있고</b>, 온도에 따라 어느 쪽이 더 많이 일어날지가 달라져요.',
        },
        {
          title: '반응식 표기 완성하기', manual: true,
          goal: '선택 상자에서 <b>정반응 · 역반응</b>의 이름과 두 방향이 모두 일어나는 반응식의 <b>화살표</b>를 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '정반응은 반응식의 왼쪽 → 오른쪽, 역반응은 오른쪽 → 왼쪽이에요. 두 방향이 모두 일어나면 양방향 화살표를 써요.',
          setup() { S.gate = 'notation'; setScene('arrow'); updateCtl(); },
          check() {
            const s = S.ar.sel, want = { fwd: '정반응', bwd: '역반응', sym: '⇌' }, ids = { fwd: '#selFwd', bwd: '#selBwd', sym: '#selSym' };
            if (!s.fwd || !s.bwd || !s.sym) return '세 곳을 모두 골라 주세요.';
            let bad = 0; Object.keys(want).forEach((k) => { const el = $(ids[k]); if (s[k] === want[k]) mark2(el, 'ok'); else { bad++; if (!el.classList.contains('bad')) shake(el); } });
            if (bad) return bad + '곳이 틀렸어요. 정반응은 왼쪽 → 오른쪽, 역반응은 오른쪽 → 왼쪽이에요.';
            S.ar.named = true; return true;
          },
          status: () => '2NO₂ ' + (S.ar.sel.sym || '?') + ' N₂O₄',
          explain: '왼쪽 → 오른쪽(2NO₂ → N₂O₄)은 <b>정반응</b>, 오른쪽 → 왼쪽(N₂O₄ → 2NO₂)은 <b>역반응</b>이에요. 두 방향의 반응이 모두 일어날 수 있는 가역 반응은 양방향 화살표 <b>⇌</b>로 나타내요.',
        },
        {
          type: 'quiz', title: '→ 와 ⇌ 의 차이',
          goal: '반응식 A → B와 A ⇌ B의 차이로 알맞은 것은?',
          setup() { S.gate = ''; setScene('arrow'); },
          choices: ['→는 느린 반응, ⇌는 빠른 반응을 나타내요', '→는 한쪽 방향으로만 진행함을, ⇌는 정반응과 역반응이 모두 일어날 수 있음을 나타내요', '→는 발열 반응, ⇌는 흡열 반응을 나타내요', '→는 기체 반응, ⇌는 액체 반응을 나타내요'],
          answer: 1,
          feedback: ['화살표의 모양은 반응이 빠른지 느린지가 아니라, 어느 방향으로 일어나는지를 나타내요.', '', '발열과 흡열은 열의 출입이에요. 화살표는 반응이 일어나는 방향을 나타내요.', '반응물의 상태와는 관계없어요. 반응이 진행하는 방향을 나타내는 기호예요.'],
          explain: '<b>→</b>는 반응이 한쪽 방향(정반응)으로만 진행한다는 뜻이고, <b>⇌</b>는 정반응과 역반응이 모두 일어날 수 있다는 뜻이에요.',
        },
      ],
    },
    {
      title: '분류하기: 가역 반응과 비가역 반응', short: '분류하기', icon: '🗂', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 정반응과 역반응이 모두 일어날 수 있으면 ⇌로 나타낸다고 배웠어요. 그런데 우리 주변의 모든 반응이 되돌아올까요?</div>' +
        '<p>카드 10장을 <b>가역 반응</b>(정반응과 역반응이 모두 일어날 수 있는 반응)과 <b>비가역 반응</b>(생성물이 거의 되돌아오지 않고 한 방향으로만 진행하는 반응)으로 나누어 봐요. 그다음 🥤 콜라 병으로 <b>닫힌 용기</b>가 왜 중요한지 확인해요.</p>',
      features: ['sort', 'cola'],
      setup() { S.gate = ''; soReset(); colaReset(); S.so.sub = 'sort'; setScene('sort'); },
      recap: '가역 반응도 <b>닫힌 용기</b>에서만 두 방향이 모두 일어나요. 열린 용기에서는 생성물이 빠져나가 한쪽으로만 진행해요.',
      summary: '<ul><li><b>가역 반응</b>: CuSO₄·5H₂O의 가열 · 물 첨가, 2NO₂ ⇌ N₂O₄, 탄산음료 속 CO₂, 암모니아 합성(N₂ + 3H₂ ⇌ 2NH₃), 물의 증발 · 응결(물리 변화)</li><li><b>비가역 반응</b>: 메테인 연소, 달걀 삶기, 종이 연소, 철이 녹슬기, 폭죽 — 생성물이 처음 물질로 돌아가지 않아요.</li><li><b>닫힌 용기(계)</b>에서는 물질이 드나들지 못해 가역 반응의 두 방향이 모두 일어나요. 열린 용기에서는 생성물(기체)이 빠져나가 한쪽으로만 진행해요.</li></ul>',
      missions: [
        {
          title: '카드 10장 분류하기', manual: true,
          goal: '카드를 끌어서 <b>가역 반응</b> 상자와 <b>비가역 반응</b> 상자에 넣고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '카드를 눌러 고른 뒤 단추로 상자에 넣을 수도 있어요. 물질이 다시 처음으로 돌아올 수 있는지 생각해 보세요.',
          setup() { S.gate = ''; S.so.sub = 'sort'; setScene('sort'); updateCtl(); },
          check() {
            const s = S.so, n = CARDS.filter((c, k) => s.loc[k] < 0).length;
            if (n > 0) return '아직 상자에 넣지 않은 카드가 ' + n + '장 있어요.';
            const wrong = CARDS.map((c, k) => k).filter((k) => (s.loc[k] === 0) !== CARDS[k].rev);
            CARDS.forEach((c, k) => { if (wrong.indexOf(k) >= 0) { if (!s.flagged[k]) { s.flagged[k] = true; } } else delete s.flagged[k]; });
            if (wrong.length) return wrong.length + '장이 잘못 들어갔어요. 빨간 테두리 카드를 다시 생각해 보세요.';
            return true;
          },
          status: () => '상자에 넣은 카드 ' + (S.so.order[0].length + S.so.order[1].length) + ' / ' + CARDS.length + '장',
          explain: '<b>가역</b>: 황산 구리 수화물, NO₂/N₂O₄, 탄산음료 속 CO₂, 암모니아 합성, 물의 증발 · 응결(물리 변화의 가역 과정). <b>비가역</b>: 연소, 달걀 삶기, 녹슬기, 폭죽처럼 생성물이 처음 물질로 거의 되돌아오지 않는 반응. (엄밀히는 모든 반응이 이론상 역반응을 가지지만, 되돌아오는 양이 거의 없으면 비가역 반응으로 다뤄요.)',
        },
        {
          title: '콜라 병 열고 닫기',
          goal: '🥤 병의 <b>뚜껑을 열어</b> CO₂ 입자가 <b>절반(15개) 이하</b>로 줄면 다시 <b>닫아</b> 보세요. 닫은 뒤에도 입자가 돌아오지 않는지 지켜봐요.',
          hint: '뚜껑을 열면 기체 CO₂가 병 입구로 빠져나가요. 입자 수가 15개 이하가 될 때까지 기다린 뒤 뚜껑 닫기를 누르세요.',
          setup() { S.gate = ''; colaReset(); S.so.sub = 'cola'; setScene('sort'); updateCtl(); },
          check: () => S.cl.cap && S.cl.opened && colaCount().tot <= COLA_HALF && S.cl.closedAfter >= 1.5, hold: 0.3,
          status: () => mark(S.cl.opened) + ' 열기 &nbsp; ' + mark(colaCount().tot <= COLA_HALF) + ' 입자 ' + colaCount().tot + '개 (≤ 15) &nbsp; ' + mark(S.cl.cap && S.cl.opened) + ' 다시 닫기',
          explain: '병을 열면 기체 CO₂가 밖으로 나가요. 뚜껑을 다시 닫아도 <b>나간 기체는 돌아오지 않아서</b> 입자 수가 처음(' + COLA_N + '개)으로 돌아가지 않아요. 닫힌 병 속에서는 기체 ⇌ 녹은 CO₂가 오가며 입자 수가 그대로예요.',
        },
        {
          type: 'quiz', title: '열린 용기에서 한쪽으로만 진행하는 까닭',
          goal: 'CO₂(g) + H₂O(l) ⇌ H₂CO₃(aq)는 가역 반응인데, 뚜껑을 연 탄산음료는 김이 빠지기만 해요. 그 까닭은?',
          setup() { S.gate = ''; S.so.sub = 'cola'; setScene('sort'); updateCtl(); },
          choices: ['뚜껑을 열면 이 반응이 비가역 반응으로 바뀌어요', '열린 용기에서는 기체가 밖으로 빠져나가 역반응이 일어날 수 없어서 한쪽으로만 진행해요', '기체는 물에 전혀 녹지 않아요', '병 속의 온도가 계속 낮아져요'],
          answer: 1,
          feedback: ['반응의 성질이 바뀌는 것이 아니에요. 용기가 열려서 물질이 빠져나가는 조건이 달라진 거예요.', '', '닫힌 병에서는 CO₂가 녹아 있었잖아요. 기체도 물에 녹을 수 있어요.', '온도가 아니라 기체가 병 밖으로 나가는 것이 원인이에요.'],
          explain: '가역 반응도 <b>닫힌 용기</b>에서만 정반응과 역반응이 모두 일어날 수 있어요. 열린 용기에서는 생성물(CO₂ 기체)이 밖으로 빠져나가 되돌아오지 못하므로, 겉보기에는 한쪽으로만 진행해요.',
        },
      ],
    },
    {
      title: '멈춘 걸까?: 색이 더 이상 변하지 않을 때', short: '멈춘 걸까?', icon: '⏱', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 가역 반응은 닫힌 용기에서 두 방향이 모두 일어날 수 있다고 알았어요. 이제 N₂O₄만 넣은 밀봉 플라스크의 색이 시간에 따라 어떻게 변하는지 기록해요.</div>' +
        '<p>무색의 N₂O₄는 분해해서 갈색의 NO₂가 돼요. 갈색이 진해지다가 <b>더 이상 변하지 않는 때</b>가 오면, 반응이 멈춘 걸까요? 먼저 <b>내 예측</b>을 기록하고, 확인은 다음 차시에서 해요.</p>',
      features: ['wait'],
      setup() { S.gate = ''; wtReset(); setScene('wait'); },
      recap: '색(거시적인 모습)이 변하지 않는다고 해서 반응이 멈췄다고 단정할 수 없어요. 그 까닭은 다음 차시 <b>동적 평형</b>에서 입자 모형으로 확인해요.',
      summary: '<ul><li>N₂O₄만 넣은 닫힌 플라스크: 무색 → 갈색이 점점 진해지다가 약 40초 뒤부터 <b>색이 더 이상 변하지 않아요</b> (NO₂ 농도 약 0.012 mol/L).</li><li>색이 변하지 않는 것은 <b>겉으로 보이는 모습(거시적)</b>이에요. 반응이 멈췄는지는 색만으로 알 수 없어요.</li><li>다음 차시에서 이 상태를 <b>화학 평형</b>이라 부르고, 입자 수준에서 무슨 일이 일어나는지 확인해요.</li></ul>',
      missions: [
        {
          title: '색이 변하는 모습 기록하기',
          goal: '<b>▶ 실험 시작</b>을 눌러 색–시간 그래프를 <b>60초</b>까지 기록해요. 색이 더 이상 변하지 않는 때를 찾아보세요.',
          hint: '▶ 실험 시작을 누르면 그래프가 저절로 그려져요. 시간은 실제보다 빨리 흘러요.',
          setup() { S.gate = ''; wtReset(); setScene('wait'); updateCtl(); },
          check: () => S.wt.done, hold: 0.4,
          status: () => '기록한 시간 ' + Math.floor(S.wt.ts) + ' / 60초',
          explain: '무색의 N₂O₄가 분해하면서 NO₂(갈색)가 늘어나 색이 진해져요. 약 <b>40초</b>부터는 [NO₂]가 0.012 mol/L로 일정해서 색이 더 이상 변하지 않아요.',
        },
        {
          title: '내 예측 기록하기', manual: true,
          goal: '그래프의 끝을 보세요. 색이 더 이상 변하지 않을 때 반응은 <b>멈춘 걸까요, 계속되는 걸까요?</b> 예측을 고르고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '맞고 틀리는 것은 상관없어요. 지금 생각하는 것을 고르면 돼요.',
          setup() { S.gate = 'pred'; setScene('wait'); updateCtl(); },
          check: () => (S.wt.pred ? true : '예측을 먼저 골라 주세요.'),
          status: () => '내 예측: ' + (S.wt.pred === 'stop' ? '멈췄다' : S.wt.pred === 'go' ? '계속된다' : '아직 고르지 않았어요'),
          explain: '예측을 기록했어요. 어느 쪽이든 좋아요. 이 예측이 맞는지는 다음 차시 <b>동적 평형</b>에서 입자 모형으로 확인해 봐요.',
        },
        {
          type: 'quiz', title: '색이 변하지 않으면 반응이 멈춘 걸까?',
          goal: '색이 더 이상 변하지 않는다는 사실만으로 반응이 멈췄다고 단정할 수 있을까요?',
          setup() { S.gate = ''; setScene('wait'); },
          choices: ['네, 색이 변하지 않으면 반응이 멈춘 거예요', '아니요, 겉으로 변화가 없어도 정반응과 역반응이 같은 속도로 계속될 수 있어서 색만으로는 알 수 없어요', '아니요, 색이 변하지 않으면 반응은 한 번도 일어난 적이 없어요', '네, 가역 반응은 언제나 색이 변해야 해요'],
          answer: 1,
          feedback: ['색은 눈에 보이는 거시적인 모습일 뿐이에요. 입자 수준에서는 다를 수 있어요.', '', '색이 진해졌다가 일정해졌으니 반응은 분명히 일어났어요.', '색의 변화는 반응의 종류와 관계없이 가역 반응의 필수 조건이 아니에요.'],
          explain: '농도나 색처럼 눈에 보이는 <b>거시적인 성질</b>이 변하지 않는 것만으로는 반응이 멈췄다고 말할 수 없어요. 다음 차시에서 정반응과 역반응이 <b>같은 속도로 계속</b>되는 <b>동적 평형</b>을 입자 모형으로 확인해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-reversible', mount: '#game', badge: '가역 반응 탐정', homeHref: '../../index.html#hc',
    featureLabels: { heat: '🔵 황산 구리 가열 · 물 첨가 + 입자 모형', cobalt: '📄 염화 코발트 종이', arrow: '🔁 온도를 바꾸는 밀봉 플라스크', sort: '🗂 가역 · 비가역 카드 상자', cola: '🥤 콜라 병 뚜껑', wait: '⏱ 색–시간 그래프 기록' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetCu(); resetCo(); resetAr(); soReset(); colaReset(); wtReset();
  SciSim.pointer(view, {
    down(p) { return soDown(p); },
    move(p) { soMove(p); },
    up(p) { soUp(p); },
    hover(p) { return S.mode === 'sort' && S.so.sub === 'sort' && soCardAt(p) >= 0 ? 'grab' : 'default'; },
  });
  setScene('heat');
  function stepAll1(dt) {
    stepCu(dt); stepCo(dt); stepAr(dt); stepWt(dt); stepCola(dt); if (S.mode === 'sort') stepSort(dt);
  }
  let lastFree = false, lastMode = '', lastBusy = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    const busy = [!!S.cu.act, S.co.mv.p < 1, S.ar.fl.p < 1, S.wt.run, S.wt.done, S.cl.cap].join('');
    if (busy !== lastBusy) { lastBusy = busy; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'heat') { if (S.cu.sys === 'cu') { drawCuA(SPL.A); drawCuB(SPL.B); } else { drawCoA(SPL.A); drawCoB(SPL.B); } }
    else if (S.mode === 'arrow') { drawArA(SPL.A); drawArB(SPL.B); }
    else if (S.mode === 'sort') { if (S.so.sub === 'sort') drawSort(); else { drawColaA(SPL.A); drawColaB(SPL.B); } }
    else { drawWaitA(SPL.A); drawWaitB(SPL.B); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SPL, CARDS, BOXES, TRAY, get game() { return game; },
    cuHeat, cuWater, coMove, arDip, soPlace, soReset, colaToggle, colaReset, colaCount, wtStart, wtReset, trayPos, boxPos, setScene, WT_NO2, wtNO2,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
