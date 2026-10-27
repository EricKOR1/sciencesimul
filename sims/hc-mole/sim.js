/* =========================================================
   화학 Ⅰ. 화학의 언어 - 몰과 아보가드로 수 [12화학01-02]
   ① 관찰: 세기의 한계 (달걀 다스 · 물 한 방울 속 분자 수와 세는 데 걸리는 시간)
   ② 모형: 몰의 정의 (1 mol = 6.02×10²³개, 10의 거듭제곱 눈금)
   ③ 분석: 입자 수 ↔ 몰 (N = n × 6.02×10²³), 구성 입자의 몰수
   ④ 적용: 몰의 편리함 (반응식을 몰로 읽기, SI 기본량 물질량)
   입자 수 ↔ 몰까지만 다뤄요. 질량은 다음 차시, 기체 부피는 그다음 차시예요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6';
  const BG = '#f3f0fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣]|\s+|[^\s가-힣]+/g) || [];
      for (const tk of toks) {
        if (tk.trim() === '') { if (line) line += tk; continue; }
        const t = line + tk;
        if (ctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = tk; } else line = t;
      }
    });
    if (line) out.push(line.trimEnd());
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const parseNum = (s) => { const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };

  /* ---------- 숫자 표기 (화면의 모든 숫자는 이 함수들을 거쳐요) ---------- */
  const NA = 6.02e23;
  const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const supStr = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  function sciParts(x, dig) {
    if (!(x > 0)) return ['0', 0];
    let e = Math.floor(Math.log10(x)), m = +(x / Math.pow(10, e)).toPrecision(dig || 4);
    if (m >= 10) { m = +(m / 10).toPrecision(dig || 4); e++; }
    return [String(m), e];
  }
  const sci = (x, dig) => { const q = sciParts(x, dig); return q[0] + '×10' + supStr(q[1]); };
  const fmtMol = (v) => String(+v.toFixed(3));
  const timeStr = (sec) => {
    if (sec < 60) return (sec < 10 ? sec.toFixed(1) : Math.round(sec)) + '초';
    if (sec < 3600) return Math.round(sec / 60) + '분';
    if (sec < 86400) return Math.round(sec / 3600) + '시간';
    const y = sec / 31557600;
    if (y < 1) return Math.round(sec / 86400) + '일';
    if (y < 1e4) return Math.round(y).toLocaleString('ko-KR') + '년';
    if (y < 1e8) return Math.round(y / 1e4) + '만 년';
    return (Math.round(y / 1e7) / 10) + '억 년';
  };

  /* ---------- 자료 ---------- */
  const DROP_G = 0.05, M_H2O = 18, RATE = 1e8;
  const DROP_MOL = DROP_G / M_H2O, DROP_N = DROP_MOL * NA;                   // 2.78×10⁻³ mol, 1.67×10²¹개
  const DROP_SEC = DROP_N / RATE, MOL_SEC = NA / RATE;                        // 1.67×10¹³ s, 6.02×10¹⁵ s
  const EGGS = [12, 24, 36, 48, 60];
  const SUBS = [
    { id: 'h2o', f: 'H₂O', name: '물', unit: '분자', rows: [{ s: 'H', k: 2, c: '#cbd5e1', t: 'H 원자' }, { s: 'O', k: 1, c: '#e2464b', t: 'O 원자' }], word: '원자' },
    { id: 'co2', f: 'CO₂', name: '이산화 탄소', unit: '분자', rows: [{ s: 'C', k: 1, c: '#475569', t: 'C 원자' }, { s: 'O', k: 2, c: '#e2464b', t: 'O 원자' }], word: '원자' },
    { id: 'nacl', f: 'NaCl', name: '염화 나트륨', unit: '화학식 단위', rows: [{ s: 'Na⁺', k: 1, c: '#8b5cf6', t: 'Na⁺ 이온' }, { s: 'Cl⁻', k: 1, c: '#14a058', t: 'Cl⁻ 이온' }], word: '이온' },
    { id: 'nh3', f: 'NH₃', name: '암모니아', unit: '분자', rows: [{ s: 'N', k: 1, c: '#3867f4', t: 'N 원자' }, { s: 'H', k: 3, c: '#cbd5e1', t: 'H 원자' }], word: '원자' },
  ];
  const AMTS = [0.25, 0.5, 1, 2];
  const PROBS = [
    { id: 0, dir: 'toMol', who: '물 분자', N: 3.01e23, ans: 0.5 },
    { id: 1, dir: 'toN', who: '산소 분자', n: 0.5, ans: 3.01, exp: 23 },
    { id: 2, dir: 'toMol', who: '물 분자', N: 1.806e24, ans: 3.0 },
    { id: 3, dir: 'toN', who: '물 분자', n: 2, ans: 1.204, exp: 24 },
  ];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'count', t: 0, fade: 0, gate: '',
    sub: { count: 'egg', calc: 'convert' },
    eg: { n: 36, packed: false, eggs: [], tw: [], ansOK: false, shake: 0, lastAns: '' },
    dr: { run: false, t: 0, dur: 4.6, done: false, runs: 0 },
    mo: { n: 1.0, disp: 1.0, got: {}, pulse: 0 },
    cl: { prob: 0, solved: {}, shake: 0, flash: 0, fill: 0, sub: 0, amt: 2, bars: [0, 0, 0], ptq: { H: '', O: '', T: '' }, disp: 0 },
    us: { read: 0, k: 0, kd: 0, si: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { count: '🥚 세기의 한계', mol: '📦 몰의 정의', calc: '🔢 입자 수 ↔ 몰', use: '⚗️ 몰의 편리함' };
  const molN = () => Math.round(S.mo.n * 10) / 10;
  const solvedN = () => PROBS.filter((p) => S.cl.solved[p.id]).length;

  /* ---------- 공통 UI ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#ctView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.count));
    $$('#clView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.calc));
    $$('#egN button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.eg.n));
    $('#egLab').textContent = S.eg.n + '개 = □ 다스';
    $('#bPack').disabled = S.eg.packed; $('#bUnpack').disabled = !S.eg.packed;
    $('#bCount').disabled = S.dr.run;
    $$('#cvProb button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.cl.prob); b.classList.toggle('done', !!S.cl.solved[k]); });
    $$('#ptSub button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.cl.sub));
    $$('#ptAmt button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.cl.amt));
    $$('#usSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.us.read));
    $('#oMol').textContent = molN().toFixed(1) + ' mol';
    $('#sMol').value = Math.round(molN() * 10);
    $('#molMinus').disabled = molN() <= 0.1 + 1e-9; $('#molPlus').disabled = molN() >= 3 - 1e-9;
    const p = PROBS[S.cl.prob];
    $('#cvLab').textContent = p.dir === 'toMol' ? '몰수 n (mol)' : 'N (×10' + supStr(p.exp) + '개)의 □';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  EGGS.forEach((n) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = n; b.textContent = n + '개'; $('#egN').appendChild(b); });
  PROBS.forEach((p, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = '문제 ' + (k + 1); $('#cvProb').appendChild(b); });
  SUBS.forEach((s, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = s.f; $('#ptSub').appendChild(b); });
  AMTS.forEach((a) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = a; b.textContent = a + ' mol'; $('#ptAmt').appendChild(b); });

  /* ---------- 그리기 도우미 ---------- */
  const spriteCache = {};
  function sprite(key, w, h, draw) {
    let c = spriteCache[key]; if (c) return c;
    const R = 2; c = document.createElement('canvas'); c.width = Math.ceil(w * R); c.height = Math.ceil(h * R);
    const cx = c.getContext('2d'); cx.scale(R, R); cx.translate(w / 2, h / 2);
    draw(cx, SciSim.draw(cx)); c._w = w; c._h = h; spriteCache[key] = c; return c;
  }
  function drawEgg(x, y, s, a) {
    const q = Math.round(s * 20) / 20;
    const c = sprite('egg' + q, 24 * q, 28 * q, (cx) => {
      cx.scale(q, q);
      const g = cx.createRadialGradient(-3, -4, 1, 0, 0, 11); g.addColorStop(0, '#fffdf5'); g.addColorStop(1, '#f1d9a6');
      cx.fillStyle = g; cx.strokeStyle = '#d6b678'; cx.lineWidth = 1.2; cx.beginPath(); cx.ellipse(0, 0, 7.5, 9.5, 0, 0, TAU); cx.fill(); cx.stroke();
      cx.fillStyle = 'rgba(255,255,255,.7)'; cx.beginPath(); cx.ellipse(-2.6, -3.5, 2, 3.2, -0.4, 0, TAU); cx.fill();
    });
    if (a != null) ctx.globalAlpha = a;
    ctx.drawImage(c, x - c._w / 2, y - c._h / 2, c._w, c._h);
    if (a != null) ctx.globalAlpha = 1;
  }
  function molH2O(x, y, s) {
    const q = Math.round(s * 20) / 20;
    const c = sprite('h2o' + q, 32 * q, 30 * q, (cx, d) => {
      const r = 7 * q;
      d.sphere(-r * 1.15, r * 0.85, r * 0.62, '#eef1f7', { outline: '#8a95a6', outlineWidth: 1, gloss: false });
      d.sphere(r * 1.15, r * 0.85, r * 0.62, '#eef1f7', { outline: '#8a95a6', outlineWidth: 1, gloss: false });
      d.sphere(0, -r * 0.2, r, '#e2464b', { gloss: r > 6 });
    });
    ctx.drawImage(c, x - c._w / 2, y - c._h / 2, c._w, c._h);
  }
  function molPair(x, y, s, c1, c2) { const r = 6 * s; D.sphere(x - r * 0.85, y, r, c1, { gloss: r > 6 }); D.sphere(x + r * 0.85, y, r, c2 || c1, { gloss: r > 6 }); }
  const molH2 = (x, y, s) => { const r = 5 * s; D.sphere(x - r * 0.8, y, r, '#eef1f7', { outline: '#8a95a6', outlineWidth: 1, gloss: false }); D.sphere(x + r * 0.8, y, r, '#eef1f7', { outline: '#8a95a6', outlineWidth: 1, gloss: false }); };
  const molO2 = (x, y, s) => molPair(x, y, s, '#e2464b');

  /* ================= ① 세기의 한계 ================= */
  const P1 = PHONE ? { x: 8, y: 56, w: 464, h: 244 } : { x: 12, y: 58, w: 376, h: 330 };
  const P2 = PHONE ? { x: 8, y: 308, w: 464, h: 226 } : { x: 400, y: 58, w: 388, h: 330 };
  const P3 = PHONE ? { x: 8, y: 542, w: 464, h: 208 } : { x: 12, y: 400, w: 776, h: 150 };
  const BOX = PHONE ? { w: 120, h: 76, gx: 18, y0: P2.y + 46, rowGap: 26 } : { w: 112, h: 76, gx: 14, y0: P2.y + 50, rowGap: 36 };
  const boxRect = (i) => { const nb = Math.ceil(S.eg.n / 12), rows = Math.ceil(nb / 3), row = Math.floor(i / 3), col = i % 3, cnt = Math.min(3, nb - row * 3), w0 = cnt * BOX.w + (cnt - 1) * BOX.gx, th = rows * BOX.h + (rows - 1) * BOX.rowGap, y0 = P2.y + 40 + (P2.h - 40 - th) / 2 + 12; return { x: P2.x + (P2.w - w0) / 2 + col * (BOX.w + BOX.gx), y: y0 + row * (BOX.h + BOX.rowGap), w: BOX.w, h: BOX.h }; };
  const trayPos = (j) => { const cols = 10, dx = PHONE ? 42 : 34, dy = PHONE ? 34 : 40; return { x: P1.x + (P1.w - (cols - 1) * dx) / 2 + (j % cols) * dx, y: P1.y + (PHONE ? 62 : 70) + Math.floor(j / cols) * dy }; };
  const slotPos = (j) => { const b = boxRect(Math.floor(j / 12)), s = j % 12, c = s % 6, r = Math.floor(s / 6); return { x: b.x + 17 + c * ((b.w - 34) / 5), y: b.y + 28 + r * 25 }; };
  function egInit() {
    S.eg.tw.forEach((t) => t.cancel && t.cancel()); S.eg.tw = [];
    S.eg.packed = false; S.eg.eggs = [];
    for (let j = 0; j < S.eg.n; j++) { const p = trayPos(j); S.eg.eggs.push({ sx: p.x, sy: p.y, u: 0 }); }
  }
  function egPack() {
    if (S.eg.packed || S.eg.eggs.some((e) => e.u > 0)) return;
    S.eg.packed = true; Sound.click();
    S.eg.eggs.forEach((e, j) => { S.eg.tw.push(SciSim.tween(e, { u: 1 }, { duration: 0.55, ease: 'inOutCubic', delay: j * 0.05 })); });
    updateCtl();
  }
  function egUnpack() {
    if (!S.eg.packed) return;
    S.eg.tw.forEach((t) => t.cancel && t.cancel()); S.eg.tw = [];
    S.eg.eggs.forEach((e, j) => { S.eg.tw.push(SciSim.tween(e, { u: 0 }, { duration: 0.35, ease: 'outCubic', delay: (S.eg.n - 1 - j) * 0.01 })); });
    S.eg.packed = false; Sound.click(); updateCtl();
  }
  const egPackedDone = () => S.eg.packed && S.eg.eggs.length > 0 && S.eg.eggs.every((e) => e.u >= 0.999);
  const boxFull = (i) => { const es = S.eg.eggs.slice(i * 12, i * 12 + 12); return es.length === 12 && es.every((e) => e.u >= 0.999); };
  function drawEggs(t) {
    T(14, 26, '🥚 낱개로 세기 vs 묶음으로 세기', PHONE ? 15 : 17, INK, 'left', 800);
    panel(P1.x, P1.y, P1.w, P1.h, 14);
    T(P1.x + 14, P1.y + 24, '낱개 ' + S.eg.n + '개', 14, INK, 'left', 800);
    panel(P2.x, P2.y, P2.w, P2.h, 14);
    T(P2.x + 14, P2.y + 24, '다스 상자 (1다스 = 12개)', 14, INK, 'left', 800);
    const nb = Math.ceil(S.eg.n / 12);
    for (let i = 0; i < nb; i++) {
      const b = boxRect(i), full = boxFull(i);
      D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 10); ctx.fillStyle = '#d9b48a'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = '#c29666'; D.roundRect(b.x + 5, b.y + 10, b.w - 10, b.h - 16, 7); ctx.fill();
      for (let s = 0; s < 12; s++) { const c = s % 6, r = Math.floor(s / 6); ctx.fillStyle = 'rgba(80,50,20,.28)'; ctx.beginPath(); ctx.ellipse(b.x + 17 + c * ((b.w - 34) / 5), b.y + 28 + r * 25, 8, 10, 0, 0, TAU); ctx.fill(); }
      if (full) D.label(b.x + b.w / 2, b.y - 8, '1다스', { bg: '#14a058', size: 13 });
      else T(b.x + b.w / 2, b.y - 8, (S.eg.eggs.slice(i * 12, i * 12 + 12).filter((e) => e.u >= 0.999).length) + ' / 12', 13, MUTED, 'center', 800);
    }
    S.eg.eggs.forEach((e, j) => {
      const tp = slotPos(j), u = clamp(e.u, 0, 1), x = e.sx + (tp.x - e.sx) * u, y = e.sy + (tp.y - e.sy) * u - Math.sin(u * Math.PI) * 30;
      drawEgg(x, y, 1 - 0.1 * u);
    });
    // 설명 판
    panel(P3.x, P3.y, P3.w, P3.h, 14);
    const done = egPackedDone(), n = S.eg.n;
    T(P3.x + 16, P3.y + 28, '🧮 묶음으로 세면 편해요', 15, INK, 'left', 800);
    if (done) {
      T(P3.x + 16, P3.y + 62, n + '개 / 12개 = ' + (n / 12) + '다스', PHONE ? 20 : 24, '#14803f', 'left', 800);
      textBlock(P3.x + 16, P3.y + 92, P3.w - 32, '낱개로 ' + n + '번 세는 것보다 ' + (n / 12) + '다스로 세면 훨씬 간단해요. 아주 작은 원자와 분자도 이렇게 한 묶음으로 세면 어떨까요?', 14, MUTED, 19, 700);
    } else {
      textBlock(P3.x + 16, P3.y + 58, P3.w - 32, '달걀을 낱개로 세면 번거로워요. 오른쪽의 "12개씩 묶기"로 다스 상자에 담아 보세요.', 14.5, MUTED, 20, 700);
    }
  }
  function startCount() {
    if (S.dr.run) return;
    S.dr.run = true; S.dr.t = 0; S.dr.done = false; Sound.click(); updateCtl();
  }
  function stepCount(dt) {
    if (S.dr.run) {
      S.dr.t += dt;
      if (S.dr.t >= S.dr.dur || RM) { S.dr.run = false; S.dr.done = true; S.dr.runs++; S.dr.t = S.dr.dur; Sound.success(); parts.burst(PHONE ? 240 : 560, PHONE ? 330 : 190, { count: 14, speed: 140, size: 3, colors: ['#ffb400', '#8b5cf6', '#14a058'] }); updateCtl(); }
    }
    S.eg.shake = Math.max(0, S.eg.shake - dt);
  }
  const drCounted = () => (S.dr.done ? DROP_N : DROP_N * SciSim.ease.inQuad(clamp(S.dr.t / S.dr.dur, 0, 1)));
  const Q1 = PHONE ? { x: 8, y: 56, w: 464, h: 168 } : { x: 12, y: 58, w: 300, h: 330 };
  const Q2 = PHONE ? { x: 8, y: 232, w: 464, h: 262 } : { x: 324, y: 58, w: 464, h: 330 };
  const Q3 = PHONE ? { x: 8, y: 502, w: 464, h: 248 } : { x: 12, y: 400, w: 776, h: 150 };
  function drawDrop(t) {
    T(14, 26, '💧 물 한 방울 속 분자를 세어 볼까요?', PHONE ? 15 : 17, INK, 'left', 800);
    panel(Q1.x, Q1.y, Q1.w, Q1.h, 14);
    // 물방울
    const cx = Q1.x + (PHONE ? 90 : Q1.w / 2), cy = Q1.y + (PHONE ? 88 : 140), s = PHONE ? 0.9 : 1.35;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 52); g.addColorStop(0, '#e6f6ff'); g.addColorStop(1, '#5bb4f5');
    ctx.fillStyle = g; ctx.strokeStyle = '#3b8fd4'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -56); ctx.bezierCurveTo(10, -30, 40, -6, 40, 14); ctx.bezierCurveTo(40, 40, 22, 52, 0, 52); ctx.bezierCurveTo(-22, 52, -40, 40, -40, 14); ctx.bezierCurveTo(-40, -6, -10, -30, 0, -56); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-14, 8, 6, 14, 0.3, 0, TAU); ctx.fill();
    for (let i = 0; i < 10; i++) { const a = i * 2.4 + t * 0.35, rr = Math.sqrt((i + 0.5) / 10) * 26; molH2O(Math.cos(a) * rr, 16 + Math.sin(a) * rr * 0.9, 0.62); }
    ctx.restore();
    T(PHONE ? Q1.x + 190 : Q1.x + Q1.w / 2, PHONE ? Q1.y + 56 : Q1.y + 232, '물 한 방울 ≈ ' + DROP_G + ' g', 15, INK, PHONE ? 'left' : 'center', 800);
    T(PHONE ? Q1.x + 190 : Q1.x + Q1.w / 2, PHONE ? Q1.y + 84 : Q1.y + 260, 'n = ' + DROP_G + ' / ' + M_H2O + ' = ' + sci(DROP_MOL, 3) + ' mol', 14.5, MUTED, PHONE ? 'left' : 'center', 800);
    T(PHONE ? Q1.x + 190 : Q1.x + Q1.w / 2, PHONE ? Q1.y + 112 : Q1.y + 288, 'N = n × 6.02×10²³', 14.5, MUTED, PHONE ? 'left' : 'center', 800);
    T(PHONE ? Q1.x + 190 : Q1.x + Q1.w / 2, PHONE ? Q1.y + 140 : Q1.y + 314, '≈ ' + sci(DROP_N, 2) + '개', 16, '#5b21b6', PHONE ? 'left' : 'center', 800);
    // 세는 기계
    panel(Q2.x, Q2.y, Q2.w, Q2.h, 14);
    D.label(Q2.x + 14, Q2.y + 22, '분자 세기: 1초에 10⁸개 (1억 개)', { bg: PUR, size: 13, align: 'left' });
    const counted = drCounted(), sec = counted / RATE;
    const cxm = Q2.x + Q2.w / 2;
    T(cxm, Q2.y + (PHONE ? 78 : 92), S.dr.run || S.dr.done ? (S.dr.done ? sci(counted, 4) : counted < 1e7 ? Math.round(counted).toLocaleString('ko-KR') : sci(counted, 3)) + '개' : '0개', PHONE ? 26 : 32, INK, 'center', 800);
    T(cxm, Q2.y + (PHONE ? 104 : 122), '지금까지 센 분자 수', 13.5, MUTED, 'center', 800);
    T(cxm, Q2.y + (PHONE ? 142 : 166), '걸린 시간: ' + (S.dr.run || S.dr.done ? (S.dr.done ? '약 ' + timeStr(sec) : timeStr(sec)) : '0초'), PHONE ? 20 : 24, S.dr.done ? '#b45309' : INK, 'center', 800);
    // 10의 거듭제곱 눈금
    const rx = Q2.x + 24, rw = Q2.w - 48, ry = Q2.y + (PHONE ? 196 : 238);
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + rw, ry); ctx.stroke();
    for (let e = 0; e <= 24; e += 6) { const x = rx + rw * e / 24; ctx.beginPath(); ctx.moveTo(x, ry - 7); ctx.lineTo(x, ry + 7); ctx.stroke(); T(x, ry + 26, '10' + supStr(e), 13, MUTED, 'center', 800); }
    const pos = Math.log10(Math.max(counted, 1)) / 24;
    D.sphere(rx + rw * clamp(pos, 0, 1), ry, 9, PUR, { gloss: false });
    // 한 방울과 1 mol 표시
    const mk = (N, label, col, dy) => { const x = rx + rw * Math.log10(N) / 24; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, ry - 8); ctx.lineTo(x, ry - dy); ctx.stroke(); T(x, ry - dy - 6, label, 13, col, x > rx + rw * 0.8 ? 'right' : 'center', 800); };
    mk(DROP_N, '한 방울', '#0e7490', 22); mk(NA, '1 mol', '#b45309', 40);
    // 결과 판
    panel(Q3.x, Q3.y, Q3.w, Q3.h, 14);
    T(Q3.x + 16, Q3.y + 28, '⏳ 1초에 1억 개씩 센다면', 15, INK, 'left', 800);
    const done = S.dr.done;
    const line = (y, a, b, col) => { T(Q3.x + 16, y, a, PHONE ? 14 : 15, INK, 'left', 800); T(Q3.x + Q3.w - 16, y, b, PHONE ? 16 : 18, col, 'right', 800); };
    if (done) {
      line(Q3.y + (PHONE ? 62 : 62), '물 한 방울 (' + sci(DROP_N, 2) + '개)', '약 ' + timeStr(DROP_SEC), '#0e7490');
      line(Q3.y + (PHONE ? 98 : 94), '1 mol (' + sci(NA, 3) + '개)', '약 ' + timeStr(MOL_SEC), '#b45309');
      textBlock(Q3.x + 16, Q3.y + (PHONE ? 128 : 120), Q3.w - 32, '물 한 방울 속 분자만 해도 낱개로 세기 어려워요. 그래서 한 묶음으로 세는 단위가 필요해요!', 13.5, MUTED, 19, 700);
    } else textBlock(Q3.x + 16, Q3.y + 62, Q3.w - 32, S.dr.run ? '세는 중이에요… 숫자가 너무 빨리 커져요!' : '오른쪽의 "세기" 단추를 눌러 걸리는 시간을 알아봐요.', 14.5, MUTED, 20, 700);
  }

  /* ================= ② 몰의 정의 ================= */
  const MB = PHONE ? { x: 8, y: 56, w: 464, h: 340 } : { x: 12, y: 58, w: 776, h: 252 };
  const MN = PHONE ? { x: 8, y: 404, w: 464, h: 112 } : { x: 12, y: 322, w: 776, h: 64 };
  const MS = PHONE ? { x: 8, y: 524, w: 464, h: 130 } : { x: 12, y: 398, w: 776, h: 152 };
  const SLOT = PHONE ? { cw: 36, ch: 30, top: 12 } : { cw: 40, ch: 36, top: 34 };
  const crateRect = (i) => {
    const cw = SLOT.cw * 5 + 20, chh = SLOT.ch * 2 + SLOT.top + 12;
    if (PHONE) return { x: MB.x + 14, y: MB.y + 40 + i * (chh + 14), w: cw, h: chh };
    const gap = (MB.w - 24 - 3 * cw) / 2; return { x: MB.x + 12 + i * (cw + gap), y: MB.y + 62, w: cw, h: chh };
  };
  function drawMol(t) {
    const mo = S.mo, n = molN();
    T(14, 26, '📦 1 mol 상자: 6.02×10²³개가 한 묶음', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MB.x, MB.y, MB.w, MB.h, 14);
    T(MB.x + 14, MB.y + 24, '상자 하나 = 1 mol · 한 칸 = 0.1 mol = ' + sci(NA / 10, 3) + '개', 13.5, MUTED, 'left', 800);
    for (let i = 0; i < 3; i++) {
      const r = crateRect(i), fill = clamp(mo.disp * 10 - i * 10, 0, 10), full = fill >= 9.999;
      const pop = full ? 1 + (RM ? 0 : 0.04 * Math.sin(Math.min(1, mo.pulse) * Math.PI)) : 1;
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(pop, pop); ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = full ? '#fff6dd' : '#fbfaff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = full ? '#e0a100' : '#c9c1e8'; ctx.lineWidth = full ? 3 : 2; if (!full) ctx.setLineDash([6, 5]); D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke(); ctx.setLineDash([]);
      for (let q = 0; q < 10; q++) {
        const c = q % 5, rr = Math.floor(q / 5), sx = r.x + 10 + SLOT.cw * c + SLOT.cw / 2, sy = r.y + SLOT.top + SLOT.ch * rr + SLOT.ch / 2;
        const a = clamp(fill - q, 0, 1);
        ctx.fillStyle = 'rgba(139,92,246,.07)'; ctx.beginPath(); ctx.arc(sx, sy, SLOT.ch * 0.42, 0, TAU); ctx.fill();
        if (a > 0.01) { ctx.save(); ctx.globalAlpha = a; ctx.translate(sx, sy); ctx.scale(0.5 + 0.5 * a, 0.5 + 0.5 * a); ctx.translate(-sx, -sy); molH2O(sx, sy, PHONE ? 1.0 : 1.25); ctx.restore(); }
      }
      ctx.restore();
      const lx = PHONE ? r.x + r.w + 18 : r.x + r.w / 2, al = PHONE ? 'left' : 'center';
      T(lx, PHONE ? r.y + 22 : r.y + 20, (i + 1) + '번 상자', 13, MUTED, al, 800);
      const ly = PHONE ? r.y + 46 : r.y + r.h + 24;
      if (full) { T(lx, ly, '1 mol', 16, '#b45309', al, 800); T(lx, ly + 22, '× 6.02×10²³개', 14, '#b45309', al, 800); }
      else if (fill > 0.01) T(lx, ly, fmtMol(fill / 10) + ' mol', 16, '#5b21b6', al, 800);
    }
    T(MB.x + MB.w - 14, MB.y + MB.h - 12, '그림은 대표 입자만 그렸어요 (실제 개수가 아니에요)', 13, MUTED, 'right', 700);
    panel(MN.x, MN.y, MN.w, MN.h, 14);
    const N = n * NA;
    if (PHONE) {
      T(MN.x + 16, MN.y + 32, 'N = n × 6.02×10²³', 16, INK, 'left', 800);
      T(MN.x + 16, MN.y + 62, '= ' + fmtMol(n) + ' × 6.02×10²³', 16, INK, 'left', 800);
      T(MN.x + 16, MN.y + 98, '= ' + sci(N) + '개', 22, '#5b21b6', 'left', 800);
    } else {
      T(MN.x + 20, MN.y + 40, 'N = n × 6.02×10²³ = ' + fmtMol(n) + ' × 6.02×10²³ = ', 19, INK, 'left', 800);
      T(MN.x + MN.w - 20, MN.y + 42, sci(N) + '개', 26, '#5b21b6', 'right', 800);
    }
    panel(MS.x, MS.y, MS.w, MS.h, 14);
    T(MS.x + 16, MS.y + 26, '10의 거듭제곱 눈금', 14, INK, 'left', 800);
    const rx = MS.x + 40, rw = MS.w - 80, ry = MS.y + (PHONE ? 78 : 90), lo = 22, hi = 25;
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + rw, ry); ctx.stroke();
    for (let e = lo; e <= hi; e++) { const x = rx + rw * (e - lo) / (hi - lo); ctx.beginPath(); ctx.moveTo(x, ry - 8); ctx.lineTo(x, ry + 8); ctx.stroke(); T(x, ry + 30, '10' + supStr(e), 14, MUTED, 'center', 800); }
    const pe = Math.log10(Math.max(mo.disp * NA, 1)), px = rx + rw * clamp((pe - lo) / (hi - lo), 0, 1);
    D.sphere(px, ry, 10, PUR, { gloss: false });
    T(px, ry - 20, sci(mo.disp * NA), 13.5, '#5b21b6', px > rx + rw - 60 ? 'right' : px < rx + 60 ? 'left' : 'center', 800);
    if (!PHONE) T(MS.x + MS.w - 16, MS.y + 26, 'N이 10배가 되면 눈금이 한 칸 올라가요', 13.5, MUTED, 'right', 700);
  }
  function setMol(v, snd) {
    const nv = clamp(Math.round(v * 10) / 10, 0.1, 3);
    if (Math.abs(nv - S.mo.n) < 1e-9) { updateCtl(); return; }
    S.mo.n = nv; S.mo.got[String(nv)] = true;
    if (snd !== false) Sound.tick();
    if (Math.abs(nv - Math.round(nv)) < 1e-9) { S.mo.pulse = 0; SciSim.tween(S.mo, { pulse: 1 }, { duration: 0.5, ease: 'outCubic' }); }
    updateCtl();
  }
  $('#sMol').addEventListener('input', (e) => setMol(+e.target.value / 10));
  $('#molMinus').addEventListener('click', () => setMol(S.mo.n - 0.1));
  $('#molPlus').addEventListener('click', () => setMol(S.mo.n + 0.1));

  /* ================= ③ 입자 수 ↔ 몰 ================= */
  const K1 = PHONE ? { x: 8, y: 56, w: 464, h: 150 } : { x: 12, y: 58, w: 776, h: 128 };
  const K2 = PHONE ? { x: 8, y: 214, w: 464, h: 330 } : { x: 12, y: 196, w: 776, h: 196 };
  const K3 = PHONE ? { x: 8, y: 552, w: 464, h: 198 } : { x: 12, y: 402, w: 776, h: 148 };
  function drawConvert(t) {
    const cl = S.cl, p = PROBS[cl.prob], done = !!cl.solved[p.id];
    T(14, 26, '🔢 입자 수와 몰 바꾸기', PHONE ? 15 : 17, INK, 'left', 800);
    panel(K1.x, K1.y, K1.w, K1.h, 14);
    D.label(K1.x + 14, K1.y + 22, '문제 ' + (p.id + 1), { bg: PUR, size: 13, align: 'left' });
    const q = p.dir === 'toMol' ? p.who + ' ' + sci(p.N) + '개는 몇 mol일까요?' : p.who + ' ' + p.n + ' mol은 몇 개일까요?';
    textBlock(K1.x + 16, K1.y + (PHONE ? 62 : 66), K1.w - 32, q, PHONE ? 18 : 22, INK, PHONE ? 26 : 30, 800);
    T(K1.x + 16, K1.y + K1.h - 16, p.dir === 'toMol' ? 'n = N / 6.02×10²³' : 'N = n × 6.02×10²³', 14.5, '#5b21b6', 'left', 800);
    // 흐름도
    panel(K2.x, K2.y, K2.w, K2.h, 14);
    const bw = PHONE ? 170 : 250, bh = PHONE ? 84 : 100;
    const lx = PHONE ? K2.x + (K2.w - bw) / 2 : K2.x + 40, ly = PHONE ? K2.y + 20 : K2.y + 36;
    const rx2 = PHONE ? lx : K2.x + K2.w - 40 - bw, ry2 = PHONE ? K2.y + K2.h - bh - 20 : ly;
    const nBox = (x, y, label, val, known, hl) => {
      D.shadow(() => { D.roundRect(x, y, bw, bh, 16); ctx.fillStyle = known ? '#fff' : '#f7f3ff'; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = known ? '#14a058' : PUR; ctx.lineWidth = hl ? 4 : 2.6; if (!known) ctx.setLineDash([7, 5]); D.roundRect(x, y, bw, bh, 16); ctx.stroke(); ctx.setLineDash([]);
      T(x + bw / 2, y + 26, label, 14, MUTED, 'center', 800);
      T(x + bw / 2, y + bh / 2 + 24, val, val.length > 14 ? (PHONE ? 17 : 20) : (PHONE ? 22 : 26), known ? INK : '#9aa5b6', 'center', 800);
    };
    const Nval = p.dir === 'toMol' ? p.N : p.ans * Math.pow(10, p.exp), nval = p.dir === 'toMol' ? p.ans : p.n;
    const NK = p.dir === 'toMol' || done, nK = p.dir === 'toN' || done;
    if (done) cl.fill = SciSim.approach(cl.fill, 1, 1 / 60, 6); else cl.fill = 0;
    nBox(lx, ly, '입자 수 N (개)', NK ? sci(Nval) + '개' : '?', NK, false);
    nBox(rx2, ry2, '물질의 양 n (mol)', nK ? fmtMol(nval) + ' mol' : '?', nK, false);
    // 화살표
    const ax1 = PHONE ? lx + bw / 2 - 28 : lx + bw + 16, ay1 = PHONE ? ly + bh + 8 : ly + bh / 2 - 18, ax2 = PHONE ? ax1 : rx2 - 16, ay2 = PHONE ? ry2 - 8 : ay1;
    D.arrow(ax1, ay1, ax2, ay2, { color: p.dir === 'toMol' ? '#8b5cf6' : '#cdbdf5', width: 5, head: 15 });
    const bx1 = PHONE ? lx + bw / 2 + 28 : ax2, by1 = PHONE ? ry2 - 8 : ay1 + 36, bx2 = PHONE ? bx1 : ax1, by2 = PHONE ? ly + bh + 8 : by1;
    D.arrow(bx1, by1, bx2, by2, { color: p.dir === 'toN' ? '#f59e0b' : '#f5dca6', width: 5, head: 15 });
    const midx = (ax1 + ax2) / 2, midy = (ay1 + ay2) / 2;
    if (PHONE) { T(ax1 - 12, midy + 5, '/ 6.02×10²³', 14, p.dir === 'toMol' ? '#5b21b6' : '#9aa5b6', 'right', 800); T(bx1 + 12, midy + 5, '× 6.02×10²³', 14, p.dir === 'toN' ? '#b45309' : '#9aa5b6', 'left', 800); }
    else { T(midx, ay1 - 12, '/ 6.02×10²³', 15, p.dir === 'toMol' ? '#5b21b6' : '#9aa5b6', 'center', 800); T(midx, by1 + 24, '× 6.02×10²³', 15, p.dir === 'toN' ? '#b45309' : '#9aa5b6', 'center', 800); }
    if (cl.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + (cl.shake * 0.35) + ')'; D.roundRect(K2.x, K2.y, K2.w, K2.h, 14); ctx.fill(); }
    // 푼 문제 판
    panel(K3.x, K3.y, K3.w, K3.h, 14);
    T(K3.x + 16, K3.y + 28, '푼 문제 ' + solvedN() + ' / ' + PROBS.length, 15, INK, 'left', 800);
    PROBS.forEach((pp, i) => { const x = K3.x + 26 + i * 44; D.sphere(x, K3.y + 58, 15, cl.solved[pp.id] ? '#14a058' : '#d6dcea', { gloss: false, text: String(i + 1), textColor: cl.solved[pp.id] ? '#fff' : '#7b8494' }); });
    textBlock(K3.x + 16, K3.y + 98, K3.w - 32, '1 mol = 6.02×10²³개예요. 입자 수를 6.02×10²³으로 나누면 몰수, 몰수에 6.02×10²³을 곱하면 입자 수가 돼요.', 14, MUTED, 19, 700);
  }
  function cvCheck() {
    const cl = S.cl, p = PROBS[cl.prob], v = parseNum($('#cvIn').value);
    const note = $('#cvNote'), inp = $('#cvIn');
    if (isNaN(v)) { note.textContent = '숫자로 답을 써 주세요.'; Sound.fail(); return; }
    const ok = Math.abs(v - p.ans) <= Math.abs(p.ans) * 0.012;
    inp.classList.remove('ok', 'bad'); void inp.offsetWidth;
    if (ok) {
      inp.classList.add('ok');
      if (!cl.solved[p.id]) { cl.solved[p.id] = true; Sound.success(); parts.burst(PHONE ? 240 : 400, PHONE ? 380 : 270, { count: 16, speed: 150, size: 3, colors: ['#ffb400', '#14a058', '#8b5cf6'] }); }
      note.textContent = p.dir === 'toMol' ? '맞아요! ' + sci(p.N) + ' ÷ 6.02×10²³ = ' + fmtMol(p.ans) + ' mol' : '맞아요! ' + fmtMol(p.n) + ' × 6.02×10²³ = ' + sci(p.ans * Math.pow(10, p.exp)) + '개';
    } else {
      inp.classList.add('bad'); cl.shake = 0.5; Sound.fail();
      note.textContent = p.dir === 'toMol' ? '다시 계산해 보세요. 몰수 = 입자 수 ÷ 6.02×10²³이에요.' : '다시 계산해 보세요. 입자 수 = 몰수 × 6.02×10²³이에요. 지수는 이미 정해져 있어요.';
    }
    updateCtl();
  }
  $('#bCv').addEventListener('click', cvCheck);
  $('#cvIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') cvCheck(); });
  $('#cvProb').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.cl.prob = +b.dataset.v; $('#cvIn').value = ''; $('#cvIn').classList.remove('ok', 'bad'); $('#cvNote').textContent = '식에 알맞게 계산해서 답을 써요.'; updateCtl(); });

  const subOf = () => SUBS[S.cl.sub];
  const PK1 = PHONE ? { x: 8, y: 56, w: 464, h: 170 } : { x: 12, y: 58, w: 290, h: 300 };
  const PK2 = PHONE ? { x: 8, y: 234, w: 464, h: 320 } : { x: 314, y: 58, w: 474, h: 300 };
  const PK3 = PHONE ? { x: 8, y: 562, w: 464, h: 188 } : { x: 12, y: 370, w: 776, h: 180 };
  function drawParts(t) {
    const cl = S.cl, sub = subOf(), n = S.gate === 'ptq' ? 2 : cl.amt, s = S.gate === 'ptq' ? SUBS[0] : sub;
    cl.disp = SciSim.approach(cl.disp, n, 1 / 60, 8);
    T(14, 26, '⚛️ 구성 입자의 몰수', PHONE ? 15 : 17, INK, 'left', 800);
    panel(PK1.x, PK1.y, PK1.w, PK1.h, 14);
    T(PK1.x + 16, PK1.y + 28, s.name + ' ' + n + ' mol', 17, INK, 'left', 800);
    T(PK1.x + 16, PK1.y + 54, '= ' + s.unit + ' ' + sci(n * NA) + '개', 15, '#5b21b6', 'left', 800);
    const mx = PK1.x + PK1.w / 2 + (PHONE ? 100 : 0), my = PK1.y + (PHONE ? 100 : 150), sc = PHONE ? 1.6 : 2.4;
    if (s.id === 'h2o') molH2O(mx, my, sc);
    else if (s.id === 'co2') { const r = 7 * sc; D.sphere(mx - r * 1.9, my, r * 0.95, '#e2464b', { gloss: true }); D.sphere(mx, my, r, '#475569'); D.sphere(mx + r * 1.9, my, r * 0.95, '#e2464b'); }
    else if (s.id === 'nh3') { const r = 7 * sc; D.sphere(mx - r * 1.4, my + r * 1.1, r * 0.6, '#eef1f7', { outline: '#8a95a6', outlineWidth: 1, gloss: false }); D.sphere(mx + r * 1.4, my + r * 1.1, r * 0.6, '#eef1f7', { outline: '#8a95a6', outlineWidth: 1, gloss: false }); D.sphere(mx, my - r * 1.4, r * 0.6, '#eef1f7', { outline: '#8a95a6', outlineWidth: 1, gloss: false }); D.sphere(mx, my + r * 0.2, r, '#3867f4'); }
    else { D.sphere(mx - 22 * sc * 0.5, my, 12 * sc * 0.7, '#8b5cf6'); D.sphere(mx + 22 * sc * 0.5, my, 16 * sc * 0.7, '#14a058'); }
    T(mx, my + (PHONE ? 52 : 76), s.f, 18, INK, 'center', 800);
    // 막대
    panel(PK2.x, PK2.y, PK2.w, PK2.h, 14);
    T(PK2.x + 16, PK2.y + 26, '구성 ' + s.word + '의 몰수', 14.5, INK, 'left', 800);
    const MAXM = 8, bl = PK2.x + 150, bwid = PK2.w - 150 - 24, rh = PHONE ? 70 : 62;
    const rows = s.rows.map((r) => ({ t: r.t, s: r.s, c: r.c, mol: n * r.k, k: r.k }));
    const tot = rows.reduce((a, r) => a + r.mol, 0);
    rows.push({ t: s.word + ' 합계', s: '', c: '#8b5cf6', mol: tot, k: 0, total: true });
    rows.forEach((r, i) => {
      const y = PK2.y + 44 + i * rh;
      if (r.s) D.sphere(PK2.x + 30, y + 22, 15, r.c, { text: r.s.length > 2 ? r.s.slice(0, 2) : r.s, textColor: r.c === '#cbd5e1' ? '#394258' : '#fff', textScale: 0.7 }); else T(PK2.x + 30, y + 28, 'Σ', 22, '#5b21b6', 'center', 800);
      T(PK2.x + 54, y + 16, r.t, 13.5, INK, 'left', 800);
      T(PK2.x + 54, y + 36, r.total ? '' : (s.unit === '분자' ? '분자당 ' : '단위당 ') + r.k + '개', 13, MUTED, 'left', 700);
      D.roundRect(bl, y + 8, bwid, 22, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const w = bwid * clamp(r.mol / MAXM, 0, 1);
      if (w > 0.5) { ctx.save(); D.roundRect(bl, y + 8, bwid, 22, 8); ctx.clip(); ctx.fillStyle = r.total ? '#8b5cf6' : C.shade(r.c, -0.12); ctx.fillRect(bl, y + 8, w, 22); ctx.restore(); }
      T(bl + bwid - 8, y + 52, fmtMol(r.mol) + ' mol = ' + sci(r.mol * NA) + '개', 13.5, r.total ? '#5b21b6' : INK, 'right', 800);
    });
    T(PK2.x + PK2.w - 14, PK2.y + 26, '막대 끝 = ' + MAXM + ' mol', 13, MUTED, 'right', 700);
    // 결과 판
    panel(PK3.x, PK3.y, PK3.w, PK3.h, 14);
    T(PK3.x + 16, PK3.y + 28, '📐 원자(이온)의 몰수 = ' + s.unit + '의 몰수 × 한 ' + s.unit + ' 속 개수', 14.5, INK, 'left', 800);
    const eq = s.rows.map((r) => r.t.replace(' 원자', '').replace(' 이온', '') + ' ' + fmtMol(n * r.k) + ' mol').join(' + ');
    textBlock(PK3.x + 16, PK3.y + 62, PK3.w - 32, s.f + ' ' + n + ' mol 속에는 ' + eq + ' = ' + s.word + ' 합계 ' + fmtMol(tot) + ' mol (' + sci(tot * NA) + '개)이 들어 있어요.', 14.5, '#5b21b6', 20, 800);
    if (s.id === 'nacl') textBlock(PK3.x + 16, PK3.y + (PHONE ? 130 : 112), PK3.w - 32, 'NaCl은 분자가 아니라 이온이 모인 화합물이라서 "화학식 단위"로 세요. 이온 합계 ' + fmtMol(tot) + ' mol이에요.', 13.5, MUTED, 19, 700);
  }

  /* ================= ④ 몰의 편리함 ================= */
  const U1 = PHONE ? { x: 8, y: 56, w: 464, h: 98 } : { x: 12, y: 52, w: 776, h: 84 };
  const U2 = PHONE ? { x: 8, y: 162, w: 464, h: 330 } : { x: 12, y: 144, w: 776, h: 260 };
  const U3 = PHONE ? { x: 8, y: 500, w: 464, h: 200 } : { x: 12, y: 412, w: 776, h: 140 };
  const SIU = [['길이', 'm'], ['질량', 'kg'], ['시간', 's'], ['전류', 'A'], ['온도', 'K'], ['물질량', 'mol'], ['광도', 'cd']];
  function drawUse(t) {
    const us = S.us;
    us.k = SciSim.approach(us.k, us.read, 1 / 60, 5);
    T(14, 26, '⚗️ 같은 양을 더 편하게 쓰는 방법', PHONE ? 15 : 17, INK, 'left', 800);
    panel(U1.x, U1.y, U1.w, U1.h, 14);
    const hw = (U1.w - 64) / 2;
    [['입자 수로 쓰면', '물 ' + sci(2 * NA, 4) + '개'], ['몰로 쓰면', '물 2 mol']].forEach((c, i) => {
      const x = U1.x + 16 + i * (hw + 32);
      T(x, U1.y + 28, c[0], 13.5, MUTED, 'left', 800);
      T(x, U1.y + (PHONE ? 66 : 62), c[1], PHONE ? 17 : 24, i ? '#14803f' : INK, 'left', 800);
    });
    T(U1.x + U1.w / 2, U1.y + U1.h / 2 + 10, '=', 28, PUR, 'center', 800);
    panel(U2.x, U2.y, U2.w, U2.h, 14);
    T(U2.x + 16, U2.y + 30, '2H₂ + O₂ → 2H₂O', PHONE ? 20 : 22, INK, 'left', 800);
    D.label(U2.x + U2.w - 14, U2.y + 26, us.read ? '몰로 읽기' : '분자 개수로 읽기', { bg: us.read ? '#14a058' : PUR, size: 13, align: 'right' });
    const cw = (U2.w - 40) / 3, k = us.k;
    const species = [{ n: 2, name: '수소 H₂', draw: molH2 }, { n: 1, name: '산소 O₂', draw: molO2 }, { n: 2, name: '물 H₂O', draw: molH2O }];
    const bw0 = PHONE ? 120 : 150, bh0 = PHONE ? 130 : 104, bTop = U2.y + 68, bcy = bTop + bh0 / 2;
    species.forEach((sp, i) => {
      const cx = U2.x + 20 + cw * i + cw / 2;
      T(cx, U2.y + 58, sp.name, 14.5, INK, 'center', 800);
      if (k > 0.02) {
        const f = 0.8 + 0.2 * k, bw = bw0 * f, bh = bh0 * f;
        ctx.save(); ctx.globalAlpha = clamp(k * 1.3, 0, 1); ctx.strokeStyle = '#e0a100'; ctx.lineWidth = 3; ctx.fillStyle = '#fff8e1';
        D.roundRect(cx - bw / 2, bcy - bh / 2, bw, bh, 14); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      for (let q = 0; q < sp.n; q++) { const off = (q - (sp.n - 1) / 2) * (PHONE ? 40 : 52); sp.draw(cx + off, bcy + (sp.n === 2 ? (q % 2 ? 12 : -12) : 0), PHONE ? 1.5 : 1.9); }
      T(cx, bTop + bh0 + 30, (k < 0.5 ? sp.n + '개' : sp.n + ' mol'), PHONE ? 22 : 24, k < 0.5 ? '#5b21b6' : '#b45309', 'center', 800);
      T(cx, bTop + bh0 + 52, k < 0.5 ? '분자 ' + sp.n + '개' : (PHONE ? '6.02×10²³개씩 ' + sp.n + '묶음' : '6.02×10²³개씩 ' + sp.n + '묶음'), 13, MUTED, 'center', 800);
      if (i < 2) T(cx + cw / 2, bcy + 8, i === 0 ? '+' : '→', 26, PUR, 'center', 800);
    });
    T(U2.x + U2.w / 2, U2.y + U2.h - 14, k < 0.5 ? '분자 수의 비 2 : 1 : 2' : '몰수의 비 2 : 1 : 2 (분자 수의 비와 같아요)', 14.5, '#5b21b6', 'center', 800);
    panel(U3.x, U3.y, U3.w, U3.h, 14);
    T(U3.x + 16, U3.y + 28, '📏 SI 기본량 7가지 (통합과학1 기본량 표)', 14.5, INK, 'left', 800);
    const nc = PHONE ? 4 : 7, cwid = (U3.w - 28 - (nc - 1) * 8) / nc, chh = PHONE ? 44 : 50;
    SIU.forEach((q, i) => {
      const c = i % nc, r = Math.floor(i / nc), x = U3.x + 14 + c * (cwid + 8), y = U3.y + 42 + r * (chh + 8), hl = q[1] === 'mol', pulse = hl && !RM ? 1 + 0.04 * Math.sin(t * 4) : 1;
      ctx.save(); ctx.translate(x + cwid / 2, y + chh / 2); ctx.scale(pulse, pulse); ctx.translate(-(x + cwid / 2), -(y + chh / 2));
      D.roundRect(x, y, cwid, chh, 12); ctx.fillStyle = hl ? '#fff3c4' : '#f4f6fb'; ctx.fill(); ctx.strokeStyle = hl ? '#e0a100' : '#d6dcea'; ctx.lineWidth = hl ? 3 : 1.5; ctx.stroke();
      T(x + cwid / 2, y + chh / 2 - 3, q[0], 14, INK, 'center', 800); T(x + cwid / 2, y + chh / 2 + 15, q[1], 14, hl ? '#b45309' : MUTED, 'center', 800);
      ctx.restore();
    });
    const rows = Math.ceil(SIU.length / nc);
    textBlock(U3.x + 16, U3.y + 42 + rows * (chh + 8) + 20, U3.w - 32, '물질량(mol)은 물질의 양을 나타내는 기본량이에요. 몰은 계산용 숫자가 아니라 입자를 묶어서 세는 편리한 단위예요.', 14, MUTED, 19, 700);
  }
  $('#usSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.us.read = +b.dataset.v; updateCtl(); });

  /* ---------- 입력 · 버튼 ---------- */
  $('#ctView').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sub.count = b.dataset.v; S.fade = 0.5; updateCtl(); });
  $('#clView').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sub.calc = b.dataset.v; S.fade = 0.5; updateCtl(); });
  $('#egN').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.eg.n = +b.dataset.v; egInit(); $('#inDozen').value = ''; $('#inDozen').classList.remove('ok', 'bad'); updateCtl(); });
  $('#bPack').addEventListener('click', egPack);
  $('#bUnpack').addEventListener('click', egUnpack);
  $('#bCount').addEventListener('click', startCount);
  $('#ptSub').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.cl.sub = +b.dataset.v; updateCtl(); });
  $('#ptAmt').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.cl.amt = +b.dataset.v; updateCtl(); });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'count') {
      if (S.sub.count === 'egg') {
        L1 = '달걀'; a = S.eg.n + '개'; L2 = '묶음'; b = egPackedDone() ? (S.eg.n / 12) + '다스' : '아직 낱개'; L3 = '1다스'; c = '12개';
      } else {
        L1 = '한 방울 속 분자 수'; a = '≈ ' + sci(DROP_N, 2) + '개';
        L2 = '세는 데 걸린 시간'; b = S.dr.done ? '약 ' + timeStr(DROP_SEC) : S.dr.run ? timeStr(drCounted() / RATE) : '—';
        L3 = '1 mol을 세면'; c = S.dr.done ? '약 ' + timeStr(MOL_SEC) : '—';
      }
    } else if (S.mode === 'mol') {
      const n = molN();
      L1 = '물질의 양 n'; a = fmtMol(n) + ' mol'; L2 = '입자 수 N'; b = sci(n * NA) + '개'; L3 = '상자 수'; c = fmtMol(n) + '개';
    } else if (S.mode === 'calc') {
      if (S.sub.calc === 'convert') { const p = PROBS[S.cl.prob]; L1 = '고른 문제'; a = '문제 ' + (p.id + 1); L2 = '푼 문제'; b = solvedN() + ' / ' + PROBS.length; L3 = '1 mol'; c = '6.02×10²³개'; }
      else { const s = S.gate === 'ptq' ? SUBS[0] : subOf(), n = S.gate === 'ptq' ? 2 : S.cl.amt; const tot = s.rows.reduce((q, r) => q + n * r.k, 0); L1 = '물질'; a = s.f + ' ' + n + ' mol'; L2 = s.word + ' 합계'; b = fmtMol(tot) + ' mol'; L3 = s.unit + ' 수'; c = sci(n * NA) + '개'; }
    } else {
      L1 = '읽는 방법'; a = S.us.read ? '몰수의 비' : '분자 수의 비'; L2 = '계수의 비'; b = '2 : 1 : 2'; L3 = '물질량 단위'; c = 'mol';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const vals = (ids) => ids.map((id) => parseNum($(id).value));
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= (tol == null ? 1e-6 : tol);
  const levels = [
    {
      title: '세기의 한계: 너무 많은 입자', short: '세기의 한계', icon: '🥚', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 눈에 보이지 않을 만큼 작은 분자를 어떻게 "몇 개"라고 셀 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학과 중학교에서</b> 원자와 분자가 아주 작은 입자이고, 화학 반응식의 계수가 <b>입자 수의 비</b>라는 것을 배웠어요. 그런데 입자의 <b>실제 개수</b>는 얼마나 많을까요?</div>' +
        '<p>달걀은 12개씩 <b>다스</b>로 묶어 세어요. 물 한 방울 속 분자를 1초에 1억 개씩 세면 얼마나 걸리는지 알아보고, 입자도 <b>묶음</b>으로 세는 방법을 생각해 봐요.</p>',
      features: ['count'],
      setup() { S.gate = ''; S.sub.count = 'egg'; S.eg.n = 36; egInit(); $('#inDozen').value = ''; S.dr = { run: false, t: 0, dur: 4.6, done: false, runs: 0 }; setScene('count'); },
      recap: '많은 것을 셀 때는 묶음 단위로 세면 편리해요. 물 한 방울 속 분자는 약 1.7×10²¹개나 되어서, 낱개로는 도저히 셀 수 없어요.',
      summary: '<ul><li>달걀 12개 = 1다스, 종이 500장 = 1연처럼 <b>묶음 단위</b>로 세면 편해요. 달걀 36개 = 3다스</li><li>물 한 방울(약 0.05 g) 속 물 분자: 0.05 ÷ 18 = ' + sci(DROP_MOL, 3) + ' mol → 약 ' + sci(DROP_N, 2) + '개</li><li>1초에 10<sup>8</sup>개씩 세면 한 방울은 약 ' + timeStr(DROP_SEC) + ', 6.02×10²³개는 약 ' + timeStr(MOL_SEC) + '이 걸려요.</li><li>그래서 원자·분자는 아주 큰 묶음 단위로 세어야 해요.</li></ul>',
      missions: [
        {
          title: '묶음으로 세어 보기', manual: true,
          goal: '달걀 <b>36개</b>를 <b>📦 12개씩 묶고</b>, 몇 다스인지 써서 <b>✔ 확인하기</b>를 누르세요.',
          hint: '달걀 개수를 36개로 맞추고 묶기 단추를 눌러요. 36 ÷ 12를 계산해요.',
          setup() { S.gate = ''; S.sub.count = 'egg'; if (S.eg.n !== 36) { S.eg.n = 36; egInit(); } $('#inDozen').value = ''; setScene('count'); },
          check() {
            if (S.eg.n !== 36) return '달걀을 36개로 맞춰 주세요.';
            if (!egPackedDone()) return '먼저 "12개씩 묶기"로 다스 상자에 담아 보세요.';
            const v = parseNum($('#inDozen').value);
            if (isNaN(v)) return '몇 다스인지 숫자로 써 주세요.';
            if (v === 3) return true;
            return '36 ÷ 12를 다시 계산해 보세요. 상자가 몇 개 채워졌나요?';
          },
          status: () => '묶기 ' + mark(egPackedDone()) + ' &nbsp; 다스 수 쓰기 ' + mark(near(parseNum($('#inDozen').value), 3)),
          explain: '12개가 1다스이므로 36 ÷ 12 = <b>3다스</b>예요. 낱개로 36번 세는 것보다 훨씬 간단해요.',
        },
        {
          title: '물 한 방울 속 분자 세어 보기',
          goal: '<b>💧 물 한 방울</b> 화면에서 <b>⏱️ 1초에 1억 개씩 세기</b>를 눌러 걸리는 시간을 확인하세요.',
          hint: '화면 위쪽에서 "물 한 방울"을 고르고 세기 단추를 눌러요. 숫자가 올라가고 10의 거듭제곱 눈금의 점이 움직여요.',
          setup() { S.gate = ''; S.sub.count = 'drop'; S.dr = { run: false, t: 0, dur: 4.6, done: false, runs: 0 }; setScene('count'); },
          check: () => S.dr.done, hold: 0.4,
          status: () => '세기 완료 ' + mark(S.dr.done) + (S.dr.done ? ' &nbsp; 약 ' + timeStr(DROP_SEC) : ''),
          explain: '물 한 방울(0.05 g) 속에는 약 <b>' + sci(DROP_N, 2) + '개</b>의 물 분자가 있어요. 1초에 10<sup>8</sup>개씩 세면 ' + sci(DROP_N, 4) + ' ÷ 10<sup>8</sup> = ' + sci(DROP_SEC, 3) + '초, 약 <b>' + timeStr(DROP_SEC) + '</b>이 걸려요. 6.02×10²³개라면 약 ' + timeStr(MOL_SEC) + '이에요.',
        },
        {
          type: 'quiz', title: '입자를 묶어서 세는 까닭',
          goal: '원자와 분자를 낱개로 세지 않고 <b>한 묶음</b>으로 세는 까닭은?',
          setup() { S.gate = ''; setScene('count'); },
          choices: ['원자와 분자는 눈에 보여서 세기 쉽기 때문이에요', '입자의 수가 너무 많아서 낱개로 세면 불편하기 때문이에요', '원자와 분자는 한 개씩만 반응하기 때문이에요', '원자와 분자의 질량이 모두 같기 때문이에요'],
          answer: 1,
          feedback: ['원자와 분자는 눈에 보이지 않을 만큼 작아요. 그래서 더 세기 어려워요.', '', '화학 반응에는 아주 많은 입자가 함께 참여해요.', '원자와 분자의 질량은 종류마다 달라요.'],
          explain: '물 한 방울에도 약 ' + sci(DROP_N, 2) + '개의 분자가 있어요. 이렇게 입자 수가 엄청나게 많아서, 달걀을 다스로 세듯 <b>큰 묶음 단위</b>로 세는 것이 편리해요.',
        },
      ],
    },
    {
      title: '몰의 정의: 1 mol = 6.02×10²³개', short: '몰의 정의', icon: '📦', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 입자는 너무 많아서 큰 묶음으로 세어야 한다는 것을 알았어요. 그 묶음의 이름이 <b>몰(mol)</b>이에요.</div>' +
        '<p><b>1 mol = 6.02×10²³개</b>예요. 이 수를 <b>아보가드로 수</b>라고 해요. 슬라이더로 물질의 양(mol)을 바꾸며 상자 수와 입자 수가 어떻게 달라지는지 살펴봐요. 몰은 <b>개수</b>의 단위이지 질량의 단위가 아니에요.</p>',
      features: ['mol'],
      setup() { S.gate = ''; setScene('mol'); },
      recap: '1 mol은 입자 6.02×10²³개의 묶음이에요. 입자 수 N = n × 6.02×10²³이고, 몰수가 커질수록 입자 수도 같은 비율로 늘어요.',
      summary: '<ul><li><b>몰(mol)</b>: 입자를 묶어 세는 단위. <b>1 mol = 6.02×10²³개</b> (아보가드로 수)</li><li>입자 수 N = n × 6.02×10²³: 0.5 mol → ' + sci(0.5 * NA) + '개, 2 mol → ' + sci(2 * NA) + '개</li><li>몰은 <b>개수</b>의 단위예요. "1 mol = 6.02×10²³ g"은 틀린 말이에요. (질량은 다음 차시)</li></ul>',
      missions: [
        {
          title: '0.5 mol과 2 mol 만들기',
          goal: '슬라이더로 <b>0.5 mol</b>과 <b>2 mol</b>을 차례로 만들고, 입자 수를 읽어 보세요.',
          hint: '슬라이더 한 칸이 0.1 mol이에요. 0.5 mol은 5칸, 2 mol은 20칸이에요. − + 단추로 맞춰도 돼요.',
          setup() { S.mo.got = {}; setScene('mol'); },
          check: () => !!(S.mo.got['0.5'] && S.mo.got['2']) && (Math.abs(molN() - 0.5) < 1e-9 || Math.abs(molN() - 2) < 1e-9), hold: 0.6,
          status: () => '0.5 mol ' + mark(S.mo.got['0.5']) + ' &nbsp; 2 mol ' + mark(S.mo.got['2']) + ' &nbsp; 지금 ' + fmtMol(molN()) + ' mol = ' + sci(molN() * NA) + '개',
          explain: '0.5 mol은 0.5 × 6.02×10²³ = <b>' + sci(0.5 * NA) + '개</b>, 2 mol은 2 × 6.02×10²³ = <b>' + sci(2 * NA) + '개</b>예요. 몰수가 4배가 되면 입자 수도 4배가 돼요.',
        },
        {
          type: 'quiz', title: '몰에 대한 잘못된 설명',
          goal: '몰에 대한 설명 중 <b>틀린</b> 것은?',
          setup() { setScene('mol'); },
          choices: ['1 mol은 입자 6.02×10²³개의 묶음이에요', '1 mol = 6.02×10²³ g이에요', '물 1 mol과 산소 1 mol에는 분자가 같은 수만큼 들어 있어요', '2 mol의 입자 수는 1 mol의 2배예요'],
          answer: 1,
          feedback: ['맞는 설명이에요. 아보가드로 수 6.02×10²³개가 1 mol이에요.', '', '맞는 설명이에요. 몰은 개수의 단위라서 물질이 달라도 같은 몰수면 입자 수가 같아요.', '맞는 설명이에요. 입자 수는 몰수에 비례해요.'],
          explain: '몰은 <b>개수</b>의 단위이고, 6.02×10²³은 <b>개수</b>예요. 그램(g)은 질량의 단위라서 "1 mol = 6.02×10²³ g"은 틀렸어요. 1 mol의 질량은 물질마다 달라요. (다음 차시)',
        },
      ],
    },
    {
      title: '입자 수 ↔ 몰: 환산과 구성 입자', short: '입자 수↔몰', icon: '🔢', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 1 mol = 6.02×10²³개라는 것을 알았어요. 이제 입자 수와 몰수를 서로 <b>바꾸는</b> 연습을 해요.</div>' +
        '<p><b>N = n × 6.02×10²³</b>, 거꾸로 <b>n = N ÷ 6.02×10²³</b>이에요. 또 물 1 mol 속에는 H 원자 2 mol, O 원자 1 mol이 들어 있어요. 분자 속 <b>구성 입자의 몰수</b>도 구해 봐요.</p>',
      features: ['calc'],
      setup() { S.gate = ''; S.sub.calc = 'convert'; setScene('calc'); },
      recap: '입자 수와 몰수는 6.02×10²³을 곱하거나 나눠서 바꿔요. 화합물 n mol 속 원자의 몰수는 n에 분자 속 원자 수를 곱한 값이에요.',
      summary: '<ul><li>n = N ÷ 6.02×10²³: 물 분자 3.01×10²³개 → <b>0.5 mol</b>, 1.806×10²⁴개 → <b>3.0 mol</b></li><li>N = n × 6.02×10²³: 산소 0.5 mol → <b>3.01×10²³개</b>, 물 2 mol → <b>1.204×10²⁴개</b></li><li>물 1 mol 속: 분자 6.02×10²³개 = H 원자 2 mol(1.204×10²⁴개) + O 원자 1 mol → 원자 합계 3 mol(1.806×10²⁴개)</li><li>CO<sub>2</sub> 0.25 mol → 분자 1.505×10²³개, 원자 합계 0.75 mol(4.515×10²³개)</li><li>NaCl 0.5 mol → Na<sup>+</sup> 3.01×10²³개 + Cl<sup>−</sup> 3.01×10²³개 (이온 합계 1 mol)</li></ul>',
      missions: [
        {
          title: '입자 수와 몰 환산하기',
          goal: '<b>환산 계산</b>에서 문제 <b>2개 이상</b>을 풀어요. 답을 쓰고 <b>✔ 답 확인</b>을 눌러요.',
          hint: '입자 수가 주어지면 6.02×10²³으로 나누고, 몰수가 주어지면 6.02×10²³을 곱해요. 곱할 때는 지수가 정해져 있어서 앞의 수만 써요.',
          setup() { S.gate = ''; S.sub.calc = 'convert'; S.cl.solved = {}; S.cl.prob = 0; $('#cvIn').value = ''; $('#cvIn').classList.remove('ok', 'bad'); $('#cvNote').textContent = '식에 알맞게 계산해서 답을 써요.'; setScene('calc'); },
          check: () => solvedN() >= 2, hold: 0.5,
          status: () => '푼 문제 ' + solvedN() + ' / 2 &nbsp; ' + PROBS.map((p) => mark(S.cl.solved[p.id])).join(''),
          explain: '물 분자 3.01×10²³개는 3.01×10²³ ÷ 6.02×10²³ = <b>0.5 mol</b>이고, 산소 0.5 mol은 0.5 × 6.02×10²³ = <b>3.01×10²³개</b>예요. 1 mol과 비교하면 쉬워요. 3.01×10²³은 6.02×10²³의 절반이에요.',
        },
        {
          title: '물 2 mol 속 원자의 몰수', manual: true,
          goal: '<b>물(H₂O) 2 mol</b> 속 <b>H 원자</b>, <b>O 원자</b>, <b>원자 합계</b>는 각각 몇 mol일까요? 쓰고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '물 분자 1개에는 H 원자 2개, O 원자 1개가 있어요. 물 1 mol 속 H 원자는 2 mol이에요. 2 mol이면 그 2배예요.',
          setup() { S.gate = 'ptq'; S.sub.calc = 'parts'; ['#ptH', '#ptO', '#ptT'].forEach((s) => { $(s).value = ''; }); setScene('calc'); },
          check() {
            const [h, o, t] = vals(['#ptH', '#ptO', '#ptT']);
            if (isNaN(h) || isNaN(o) || isNaN(t)) return '세 칸을 모두 숫자로 써 주세요.';
            if (!near(h, 4, 0.01)) return 'H 원자는 물 분자 1개당 2개예요. 물 2 mol이면 2 × 2 = 몇 mol일까요?';
            if (!near(o, 2, 0.01)) return 'O 원자는 물 분자 1개당 1개예요. 물 2 mol이면 몇 mol일까요?';
            if (!near(t, 6, 0.01)) return '원자 합계는 H 원자와 O 원자의 몰수를 더한 값이에요.';
            return true;
          },
          status: () => { const [h, o, t] = vals(['#ptH', '#ptO', '#ptT']); return 'H ' + mark(near(h, 4, 0.01)) + ' &nbsp; O ' + mark(near(o, 2, 0.01)) + ' &nbsp; 합계 ' + mark(near(t, 6, 0.01)); },
          explain: '물 2 mol 속에는 H 원자 2 × 2 = <b>4 mol</b>, O 원자 1 × 2 = <b>2 mol</b>이 있어서 원자 합계는 <b>6 mol</b>(= 3 × 2 mol)이에요. 입자 수로는 ' + sci(6 * NA) + '개예요.',
        },
        {
          type: 'quiz', title: '이산화 탄소 0.25 mol 속 원자',
          goal: '<b>이산화 탄소(CO₂) 0.25 mol</b> 속에 들어 있는 <b>원자의 합계</b>는 몇 mol일까요?',
          setup() { S.gate = ''; S.sub.calc = 'parts'; S.cl.sub = 1; S.cl.amt = 0.25; setScene('calc'); },
          choices: ['0.25 mol', '0.50 mol', '0.75 mol', '1.5 mol'],
          answer: 2,
          feedback: ['0.25 mol은 CO₂ 분자의 몰수예요. 분자 1개에는 원자가 3개 들어 있어요.', 'C 원자만 0.25 mol이고 O 원자는 그 2배예요. 원자를 모두 더해야 해요.', '', 'CO₂ 분자 1개에는 원자가 6개가 아니라 3개 들어 있어요. CO₂ 1 mol 속에는 원자 3 mol이 있어요.'],
          explain: 'CO₂ 분자 1개에는 C 원자 1개와 O 원자 2개, 모두 3개가 있어요. 그래서 0.25 mol × 3 = <b>0.75 mol</b>이에요. 입자 수로는 ' + sci(0.75 * NA) + '개예요.',
        },
      ],
    },
    {
      title: '몰의 편리함: 몰수의 비로 읽기', short: '몰의 편리함', icon: '⚗️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 입자 수와 몰수를 서로 바꿨어요. 같은 양을 <b>몰</b>로 쓰면 무엇이 편리할까요? 중학교에서 배운 화학 반응식의 <b>계수의 비</b>도 몰로 읽을 수 있어요.</div>' +
        '<p>"물 1.204×10²⁴개"와 "물 2 mol"을 비교하고, 반응식 <b>2H₂ + O₂ → 2H₂O</b>를 몰로 읽어 봐요. 몰은 SI 기본량인 <b>물질량</b>의 단위예요.</p>',
      features: ['use'],
      setup() { S.gate = ''; S.us.read = 0; setScene('use'); },
      recap: '몰을 쓰면 아주 큰 입자 수를 간단히 나타낼 수 있고, 반응식의 계수의 비를 입자 수의 비와 몰수의 비로 똑같이 읽을 수 있어요.',
      summary: '<ul><li>"물 ' + sci(2 * NA, 4) + '개" = "물 2 mol" : 몰을 쓰면 짧고 편리해요.</li><li>2H<sub>2</sub> + O<sub>2</sub> → 2H<sub>2</sub>O: 분자 2개 : 1개 : 2개 = <b>2 mol : 1 mol : 2 mol</b> (계수의 비 = 입자 수의 비 = 몰수의 비)</li><li>수소 4 mol이 반응하면 산소 2 mol이 필요하고 물 4 mol이 생겨요.</li><li>몰(mol)은 SI 기본량인 <b>물질량</b>의 단위예요.</li></ul>',
      missions: [
        {
          title: '반응식을 몰로 읽기', manual: true,
          goal: '<b>2H₂ + O₂ → 2H₂O</b>를 몰로 읽어 빈칸을 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '화면에서 "몰로" 읽기를 눌러 보세요. 계수 2 : 1 : 2가 그대로 2 mol : 1 mol : 2 mol이 돼요. 수소 4 mol은 2 mol의 2배예요.',
          setup() { S.gate = 'usq'; S.us.read = 0; ['#usA', '#usB', '#usC', '#usD'].forEach((s) => { $(s).value = ''; }); setScene('use'); },
          check() {
            const [a, b, c, d] = vals(['#usA', '#usB', '#usC', '#usD']);
            if ([a, b, c, d].some(isNaN)) return '네 칸을 모두 숫자로 써 주세요.';
            if (!near(a, 2) || !near(b, 1) || !near(c, 2)) return '계수의 비 2 : 1 : 2가 그대로 몰수의 비예요. 수소 ? mol과 산소 ? mol이 반응해 물 ? mol이 생겨요.';
            if (!near(d, 2)) return '수소가 2 mol에서 4 mol로 2배가 되면 산소도 같은 비율로 변해요.';
            return true;
          },
          status: () => { const [a, b, c, d] = vals(['#usA', '#usB', '#usC', '#usD']); return '2 : 1 : 2 ' + mark(near(a, 2) && near(b, 1) && near(c, 2)) + ' &nbsp; 수소 4 mol → 산소 ' + mark(near(d, 2)); },
          explain: '계수의 비 2 : 1 : 2는 분자 수의 비이면서 <b>몰수의 비</b>예요. 분자 2개 : 1개 : 2개를 각각 6.02×10²³배 하면 2 mol : 1 mol : 2 mol이에요. 수소 4 mol이 반응하면 산소 <b>2 mol</b>이 필요하고 물 <b>4 mol</b>이 생겨요.',
        },
        {
          type: 'quiz', title: '몰수의 비로 쓰면 편리한 까닭',
          goal: '화학 반응에서 물질의 양을 <b>몰수의 비</b>로 나타내면 편리한 까닭은?',
          setup() { S.gate = ''; setScene('use'); },
          choices: ['반응하는 입자 수의 비와 같고, 큰 숫자를 쓰지 않아도 되기 때문이에요', '모든 물질의 질량이 같아지기 때문이에요', '반응 속도를 알 수 있기 때문이에요', '원자의 종류가 같아지기 때문이에요'],
          answer: 0,
          feedback: ['', '같은 몰수라도 물질마다 질량은 달라요. 질량은 다음 차시에서 몰질량으로 바꿔요.', '반응 속도와 몰수의 비는 관계가 없어요.', '몰수의 비는 원자의 종류를 바꾸지 않아요.'],
          explain: '반응식의 계수의 비는 <b>입자 수의 비</b>이고, 이것은 곧 <b>몰수의 비</b>예요. 몰로 나타내면 6.02×10²³ 같은 큰 수를 쓰지 않고도 반응하는 양을 간단히 비교할 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-mole', mount: '#game', badge: '몰 박사', homeHref: '../../index.html#hc',
    featureLabels: { count: '🥚 달걀 묶음 · 물 한 방울 세기', mol: '📦 1 mol 상자 · 10의 거듭제곱 눈금', calc: '🔢 입자 수↔몰 계산 · 구성 입자', use: '⚗️ 반응식 몰로 읽기 · SI 기본량' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  egInit();
  setScene(S.mode);
  function stepAll1(dt) {
    S.mo.disp = SciSim.approach(S.mo.disp, molN(), dt, 9);
    if (Math.abs(S.mo.disp - molN()) < 0.0005) S.mo.disp = molN();
    S.cl.shake = Math.max(0, S.cl.shake - dt);
    stepCount(dt);
    const pd = S.eg.packed || S.eg.eggs.some((e) => e.u > 0.001); if ($('#bPack').disabled !== pd) $('#bPack').disabled = pd;
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'count') { if (S.sub.count === 'egg') drawEggs(t); else drawDrop(t); }
    else if (S.mode === 'mol') drawMol(t);
    else if (S.mode === 'calc') { if (S.sub.calc === 'convert') drawConvert(t); else drawParts(t); }
    else drawUse(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, NA, PROBS, SUBS, DROP_N, DROP_SEC, MOL_SEC, get game() { return game; },
    setScene, setMol, egPack, egInit, startCount, cvCheck, sci, timeStr, boxRect, trayPos, slotPos,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
