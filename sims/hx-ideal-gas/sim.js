/* =========================================================
   물질과 에너지 Ⅰ. 물질의 세 가지 상태 - 이상 기체 방정식 [12물에01-01]
   ① 예측: 식 다루기 (PV = nRT 계산기, °C → K, mL → L)
   ② 탐구: 실험 설계 (몰질량 M = wRT/(PV)에 필요한 측정 · 장치 고르기)
   ③ 실험: 기체 확인 (미지 기체 A · B · C의 질량 → 몰질량 → 이름, 오차 실험)
   ④ 적용: 근사의 한계 (에어백 37 L, 고도 풍선, 고압·저온에서 실제 기체의 편차 - 정성)
   R = 0.082 atm·L/(mol·K), T(K) = °C + 273. 반데르발스 식과 압축 인자 계산은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 950 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4';
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
  const parseNum = (s) => { const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fx = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const f2 = (v) => fx(v, 2), f1 = (v) => fx(v, 1);
  const sgn = (v) => (v < 0 ? '−' : '') + Math.abs(v);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  const R = 0.082, KEL = 273;

  /* ---------- 입자 상자 ---------- */
  function mkGas(n) { return { ps: [], n: n || 0 }; }
  function syncGas(g, n, w, h, circ) {
    while (g.ps.length < n) { const th = rnd(0, TAU); g.ps.push({ x: circ ? rnd(-circ, circ) : rnd(8, Math.max(9, w - 8)), y: circ ? rnd(-circ, circ) : rnd(8, Math.max(9, h - 8)), ux: Math.cos(th), uy: Math.sin(th), m: rnd(0.8, 1.2) }); }
    if (g.ps.length > n) g.ps.length = n;
  }
  function stepGasRect(g, dt, w, h, spd, r) {
    g.ps.forEach((p) => {
      const v = spd * p.m * dt; p.x += p.ux * v; p.y += p.uy * v;
      if (p.x < r) { p.x = r; p.ux = Math.abs(p.ux); } else if (p.x > w - r) { p.x = w - r; p.ux = -Math.abs(p.ux); }
      if (p.y < r) { p.y = r; p.uy = Math.abs(p.uy); } else if (p.y > h - r) { p.y = Math.max(r, h - r); p.uy = -Math.abs(p.uy); }
    });
  }
  function stepGasCirc(g, dt, R0, spd, r) {            // 중심 (0, 0), 반지름 R0인 원 안
    g.ps.forEach((p) => {
      const v = spd * p.m * dt; p.x += p.ux * v; p.y += p.uy * v;
      const d = Math.hypot(p.x, p.y), lim = R0 - r;
      if (d > lim) {
        const nx = p.x / d, ny = p.y / d; p.x = nx * lim; p.y = ny * lim;
        const dot = p.ux * nx + p.uy * ny; if (dot > 0) { p.ux -= 2 * dot * nx; p.uy -= 2 * dot * ny; }
      }
    });
  }
  const spdOf = (Tk) => (PHONE ? 70 : 90) * Math.sqrt(Math.max(Tk, 1) / 300);
  function dot(x, y, r, col, alpha) { if (alpha != null) { ctx.save(); ctx.globalAlpha = alpha; } D.sphere(x, y, r, col, { gloss: r > 4 }); if (alpha != null) ctx.restore(); }

  /* ================= 자료 ================= */
  const PROBS = [
    { unk: 'n', unit: 'mol', text: '압력 2.0 atm, 부피 6150 mL, 온도 27 °C인 기체의 몰수 n은 몇 mol일까요?', exp: { P: 2.0, V: 6.15, T: 300 }, ans: 0.5, mist: { T: 27, V: 6150 }, state: { n: 0.5, T: 300, P: 2.0, V: 6.15 } },
    { unk: 'P', unit: 'atm', text: '2.0 mol의 기체가 12.3 L 용기에 300 K로 들어 있어요. 압력 P는 몇 atm일까요?', exp: { n: 2.0, V: 12.3, T: 300 }, ans: 4.0, mist: {}, state: { n: 2.0, T: 300, P: 4.0, V: 12.3 } },
    { unk: 'V', unit: 'L', text: '0.50 mol의 기체를 1.0 atm으로 유지하며 27 °C에서 127 °C로 가열해요. 가열한 뒤의 부피 V는 몇 L일까요?', exp: { P: 1.0, n: 0.5, T: 400 }, ans: 16.4, mist: { T: 127 }, state: { n: 0.5, T: 400, P: 1.0, V: 16.4 }, before: 12.3 },
  ];
  const TILES = [['P', '압력 P', 'atm'], ['V', '부피 V', 'L'], ['n', '몰수 n', 'mol'], ['T', '온도 T', 'K']];
  const GASES = {
    A: { w: 0.88, M: 44, id: 'co2', c: '#a855f7', wTxt: '0.88' },
    B: { w: 0.33, M: 16, id: 'ch4', c: '#f59e0b', wTxt: '0.33' },
    C: { w: 0.040, M: 2, id: 'h2', c: '#10b981', wTxt: '0.040' },
  };
  const FLASK_V = 0.5, FLASK_T = 300, FLASK_P = 1.0;
  const mExact = (g, Tk) => GASES[g].w * R * (Tk == null ? FLASK_T : Tk) / (FLASK_P * FLASK_V);
  const CAND = [
    { id: 'h2', f: 'H₂', M: 2 }, { id: 'he', f: 'He', M: 4 }, { id: 'ch4', f: 'CH₄', M: 16 },
    { id: 'n2', f: 'N₂', M: 28 }, { id: 'o2', f: 'O₂', M: 32 }, { id: 'ar', f: 'Ar', M: 40 },
    { id: 'co2', f: 'CO₂', M: 44 }, { id: 'n2o', f: 'N₂O', M: 44 }, { id: 'c4h10', f: 'C₄H₁₀', M: 58 },
  ];
  const Z25 = [[0, 1.0], [1, 0.99], [5, 0.97], [10, 0.94], [20, 0.88], [30, 0.80], [40, 0.71], [50, 0.60]];
  const Z100 = [[0, 1.0], [1, 0.997], [10, 0.97], [20, 0.945], [30, 0.92], [40, 0.89], [50, 0.86]];
  const zAt = (tab, p) => { for (let i = 1; i < tab.length; i++) if (p <= tab[i][0]) { const a = tab[i - 1], b = tab[i], u = (p - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], u); } return tab[tab.length - 1][1]; };
  const ALT = [[0, 1.0], [2, 0.78], [4, 0.61], [6, 0.47], [8, 0.36], [10, 0.26], [12, 0.19]];
  const presAt = (km) => { for (let i = 1; i < ALT.length; i++) if (km <= ALT[i][0]) { const a = ALT[i - 1], b = ALT[i], u = (km - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], u); } return ALT[ALT.length - 1][1]; };
  const BURST_V = 60;
  const BAG_V = 1.5 * R * 300 / 1.0;       // 36.9 L

  /* ---------- 배치 ---------- */
  const RC = {
    calc: { L: PHONE ? { x: 8, y: 50, w: 464, h: 520 } : { x: 12, y: 50, w: 476, h: 498 }, R: PHONE ? { x: 8, y: 578, w: 464, h: 296 } : { x: 496, y: 50, w: 292, h: 498 } },
    design: { L: PHONE ? { x: 8, y: 50, w: 464, h: 504 } : { x: 12, y: 50, w: 388, h: 498 }, R: PHONE ? { x: 8, y: 562, w: 464, h: 376 } : { x: 408, y: 50, w: 380, h: 498 } },
    ident: { L: PHONE ? { x: 8, y: 50, w: 464, h: 470 } : { x: 12, y: 50, w: 484, h: 498 }, R: PHONE ? { x: 8, y: 528, w: 464, h: 410 } : { x: 504, y: 50, w: 284, h: 498 } },
    limit: { L: PHONE ? { x: 8, y: 50, w: 464, h: 826 } : { x: 12, y: 50, w: 776, h: 498 } },
  };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'calc', fade: 0, lock: false, gate: '', t: 0, sub: { limit: 'bag' },
    calc: { prob: 0, solved: [false, false, false], roll: 0, modelOn: 0, flags: {}, st: {}, res: NaN, ok3: false },
    des: { meas: {}, parts: {}, msg: '', anim: {}, formula: 0 },
    id: { gas: 'A', w: {}, wShow: {}, mTyped: {}, mok: {}, test: { A: {}, B: {}, C: {} }, ident: {}, err: 0, errUsed: false, errOk: false, msg: '', shake: 0, cardShake: {}, tube: { gas: 'A', kind: '', t0: -9 }, lift: {}, sel: null },
    lim: { bagOk: false, fired: false, firedT: -9, firedP: 0, bagVal: NaN, alt: 0, burst: false, burstT: -9, zP: 1, zT: 25, zMax: { 25: 1, 100: 1 }, balloonV: 24.6 },
  };
  let game = null;
  const MODE_LABEL = { calc: '🧮 PV = nRT 계산기', design: '📐 몰질량을 재는 실험 설계', ident: '🔬 미지 기체 A · B · C 확인', limit: '📉 이상 기체 방정식의 쓰임과 한계' };

  /* ================= ① 식 다루기 ================= */
  const MODEL_A = { V: 12.3, T: 300 };
  const modelGas = mkGas(10);
  const inEl = (k) => $('#in' + k.toUpperCase());
  function inVal(k) { const e = inEl(k); return e ? parseNum(e.value) : NaN; }
  function calcEval() {
    const c = S.calc, pr = PROBS[c.prob];
    const given = ['P', 'V', 'n', 'T'].filter((k) => k !== pr.unk);
    const st = {}; let allFilled = true, allOk = true;
    given.forEach((k) => {
      const v = inVal(k), raw = inEl(k).value.trim();
      if (raw === '' || isNaN(v)) { st[k] = ''; allFilled = false; allOk = false; return; }
      const ex = pr.exp[k];
      if (Math.abs(v - ex) / ex <= 0.005) st[k] = 'ok';
      else if (pr.mist[k] != null && Math.abs(v - pr.mist[k]) < 1e-9) { st[k] = 'mist'; allOk = false; }
      else { st[k] = 'bad'; allOk = false; }
    });
    c.st = st;
    let res = NaN;
    if (allFilled && given.every((k) => inVal(k) > 0)) {
      const P = inVal('P'), V = inVal('V'), n = inVal('n'), Tk = inVal('T');
      res = pr.unk === 'n' ? P * V / (R * Tk) : pr.unk === 'P' ? n * R * Tk / V : n * R * Tk / P;
    }
    c.res = res;
    given.forEach((k) => { const e = inEl(k); e.classList.remove('ok', 'bad'); if (st[k] === 'ok') e.classList.add('ok'); else if (st[k] === 'mist' || st[k] === 'bad') e.classList.add('bad'); });
    const un = inEl(pr.unk); un.value = isNaN(res) ? '' : (pr.unk === 'n' ? f2(res) : pr.unk === 'P' ? f2(res) : f2(res));
    un.classList.toggle('ok', allOk && !isNaN(res));
    if (allOk && !c.solved[c.prob]) { c.solved[c.prob] = true; Sound.success(); const L0 = RC.calc.R; parts.burst(L0.x + L0.w / 2, L0.y + 120, { count: 16, speed: 150, size: 3.2, colors: ['#ffb400', '#14a058', '#8b5cf6'] }); }
    c.ok3 = allOk;
    updateCtl();
  }
  function calcSetProb(i) {
    S.calc.prob = i; S.calc.roll = 0; S.calc.res = NaN; S.calc.st = {};
    ['P', 'V', 'n', 'T'].forEach((k) => { const e = inEl(k); e.value = ''; e.classList.remove('ok', 'bad'); e.readOnly = false; e.disabled = false; });
    const u = inEl(PROBS[i].unk); u.readOnly = true; u.placeholder = '계산 결과';
    ['P', 'V', 'n', 'T'].forEach((k) => { if (k !== PROBS[i].unk) inEl(k).placeholder = '0'; });
    updateCtl();
  }
  ['P', 'V', 'n', 'T'].forEach((k) => inEl(k).addEventListener('input', calcEval));
  PROBS.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = ['①', '②', '③'][i] + ' ' + { n: 'n 구하기', P: 'P 구하기', V: '가열 후 V' }[p.unk]; $('#prChips').appendChild(b); });
  $('#prChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); calcSetProb(+b.dataset.v); });

  function drawTileRow(L, y, pr, c) {
    const gap = 8, tw = (L.w - 28 - gap * 3) / 4;
    TILES.forEach((tl, i) => {
      const k = tl[0], x = L.x + 14 + i * (tw + gap), unk = k === pr.unk;
      const stt = c.st[k];
      D.shadow(() => { D.roundRect(x, y, tw, 78, 12); ctx.fillStyle = unk ? '#fff7d6' : '#fff'; ctx.fill(); }, { blur: 4, y: 1 });
      ctx.strokeStyle = unk ? '#e0a100' : stt === 'ok' ? GOOD : stt === 'bad' || stt === 'mist' ? BAD : '#d6c9f5'; ctx.lineWidth = unk || stt ? 2.6 : 1.6; D.roundRect(x, y, tw, 78, 12); ctx.stroke();
      T(x + tw / 2, y + 20, tl[1], 13.5, MUTED, 'center', 800);
      let v = '—', col = '#b3bccb';
      if (unk) { v = isNaN(c.res) ? '?' : f2(c.roll); col = isNaN(c.res) ? '#b3bccb' : (c.ok3 ? '#14803f' : BAD); }
      else if (inEl(k).value.trim() !== '') { v = inEl(k).value.trim().slice(0, 7); col = stt === 'ok' ? '#14803f' : BAD; }
      T(x + tw / 2, y + 50, v, v.length > 5 ? 18 : 21, col, 'center', 800);
      T(x + tw / 2, y + 70, tl[2], 13, MUTED, 'center', 700);
    });
  }
  function drawCalc(t) {
    const L = RC.calc.L, Rr = RC.calc.R, c = S.calc, pr = PROBS[c.prob];
    T(14, 26, MODE_LABEL.calc, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    // 문제 카드
    D.roundRect(L.x + 14, L.y + 12, L.w - 28, 90, 12); ctx.fillStyle = '#f5f0ff'; ctx.fill();
    D.label(L.x + 62, L.y + 28, '문제 ' + ['①', '②', '③'][c.prob], { size: 13, bg: PUR });
    if (c.solved[c.prob]) D.check(L.x + L.w - 34, L.y + 28, 11, 1, { color: GOOD });
    textBlock(L.x + 26, L.y + 56, L.w - 52, pr.text, 15, INK, 21, 800);
    // 식
    D.roundRect(L.x + 14, L.y + 110, L.w - 28, 40, 12); ctx.fillStyle = '#fff7d6'; ctx.fill(); ctx.strokeStyle = '#e0a100'; ctx.lineWidth = 2; ctx.stroke();
    T(L.x + L.w / 2, L.y + 136, 'PV = nRT   (R = 0.082 atm·L/(mol·K))', 16, '#92400e', 'center', 800);
    drawTileRow(L, L.y + 160, pr, c);
    // 계산 과정
    const ry = L.y + 248;
    D.roundRect(L.x + 14, ry, L.w - 28, 104, 12); ctx.fillStyle = '#f8f9fc'; ctx.fill();
    const g = (k) => { const e = inEl(k).value.trim(); return e === '' ? '?' : e; };
    const fm = pr.unk === 'n' ? ['n = PV / RT', '= (' + g('P') + ' × ' + g('V') + ') / (0.082 × ' + g('T') + ')']
      : pr.unk === 'P' ? ['P = nRT / V', '= (' + g('n') + ' × 0.082 × ' + g('T') + ') / ' + g('V')]
        : ['V = nRT / P', '= (' + g('n') + ' × 0.082 × ' + g('T') + ') / ' + g('P')];
    T(L.x + 26, ry + 26, '구하는 값: ' + fm[0], 14.5, INK, 'left', 800);
    T(L.x + 26, ry + 52, fm[1], 15, MUTED, 'left', 800);
    if (!isNaN(c.res)) {
      const okc = c.ok3;
      T(L.x + 26, ry + 82, '= ' + f2(c.roll) + ' ' + pr.unit + (okc ? '  ✅' : '  (정답과 달라요)'), 17, okc ? '#14803f' : BAD, 'left', 800);
      if (!okc) { const ratio = c.res / pr.ans; T(L.x + L.w - 26, ry + 82, '정답의 약 ' + (ratio >= 1 ? (ratio >= 10 ? Math.round(ratio) : f1(ratio)) + '배' : '1/' + Math.round(1 / ratio)), 14.5, BAD, 'right', 800); }
    } else T(L.x + 26, ry + 82, '값을 모두 넣으면 결과가 나와요', 14, '#9aa5b6', 'left', 700);
    // 자주 하는 실수
    const my = ry + 114, mw = (L.w - 36) / 2;
    [['T', '⚠️ °C를 그대로 쓰면', '27 °C를 27로 쓰면 27 K로 계산돼요. 켈빈은 °C + 273이에요.', 'T'], ['V', '⚠️ mL를 그대로 쓰면', '6150 mL를 6150으로 쓰면 6150 L예요. 1 L = 1000 mL!', 'V']].forEach((q, i) => {
      const x = L.x + 14 + i * (mw + 8), hit = c.st[q[3]] === 'mist';
      D.roundRect(x, my, mw, PHONE ? 126 : 120, 12); ctx.fillStyle = hit ? '#fff0f0' : '#faf8ff'; ctx.fill(); ctx.strokeStyle = hit ? BAD : '#d6c9f5'; ctx.lineWidth = hit ? 3 : 1.6; ctx.stroke();
      T(x + 12, my + 24, q[1], 14.5, hit ? BAD : INK, 'left', 800);
      textBlock(x + 12, my + 48, mw - 24, q[2], 13.5, MUTED, 18, 700);
      if (hit) T(x + 12, my + (PHONE ? 114 : 108), '← 지금 이렇게 넣었어요!', 13.5, BAD, 'left', 800);
    });
    // 모형
    drawModel(Rr, t, pr, c);
  }
  function drawModel(Rr, t, pr, c) {
    panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    T(Rr.x + 14, Rr.y + 26, '🔬 상태 모형 (계산하면 나타나요)', 14.5, INK, 'left', 800);
    const on = c.modelOn;
    if (on < 0.02) { T(Rr.x + Rr.w / 2, Rr.y + Rr.h / 2, '?', 70, '#d3d9e6', 'center', 800); return; }
    const st = pr.state, k = (Rr.h - 160) / 17, cw = PHONE ? 130 : 112, cx0 = Rr.x + (PHONE ? 110 : 60), yB = Rr.y + Rr.h - 34;
    ctx.save(); ctx.globalAlpha = on;
    const H = MODEL_A.V * k, hot = clamp((MODEL_A.T - 250) / 200, 0, 1);
    // 눈금
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx0 - 8, yB); ctx.lineTo(cx0 - 8, yB - 17 * k); ctx.stroke();
    for (let v = 0; v <= 15; v += 5) { const y = yB - v * k; ctx.beginPath(); ctx.moveTo(cx0 - 8, y); ctx.lineTo(cx0 - 16, y); ctx.stroke(); T(cx0 - 19, y + 4.5, String(v), 13, MUTED, 'right', 700); }
    T(cx0 - 19, yB - 17 * k - 8, 'L', 13, MUTED, 'right', 800);
    const gasTop = yB - H;
    ctx.fillStyle = 'rgba(235,242,255,.55)'; ctx.fillRect(cx0, yB - 17 * k, cw, 17 * k);
    ctx.fillStyle = C.mix('#dbeafe', '#ffd9c7', hot); ctx.fillRect(cx0, gasTop, cw, yB - gasTop);
    ctx.save(); ctx.beginPath(); ctx.rect(cx0, gasTop, cw, yB - gasTop); ctx.clip();
    modelGas.ps.forEach((p) => { if (p.y < H) dot(cx0 + p.x, yB - p.y, PHONE ? 4.2 : 4.8, '#3867f4'); });
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx0, yB - 17 * k); ctx.lineTo(cx0, yB); ctx.lineTo(cx0 + cw, yB); ctx.lineTo(cx0 + cw, yB - 17 * k); ctx.stroke();
    const py = gasTop - 12;
    const pg = ctx.createLinearGradient(0, py, 0, py + 12); pg.addColorStop(0, '#e8edf5'); pg.addColorStop(1, '#8e9bb0'); ctx.fillStyle = pg; D.roundRect(cx0 - 3, py, cw + 6, 12, 4); ctx.fill();
    D.shadow(() => { D.roundRect(cx0 + 8, py - 30, cw - 16, 30, 6); ctx.fillStyle = '#64748b'; ctx.fill(); }, { blur: 4, y: 2 });
    T(cx0 + cw / 2, py - 10, 'P = ' + f2(st.P) + ' atm', 13, '#fff', 'center', 800);
    if (pr.before) { ctx.strokeStyle = 'rgba(100,116,139,.7)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; const by = yB - pr.before * k; ctx.beginPath(); ctx.moveTo(cx0 - 8, by); ctx.lineTo(cx0 + cw + 6, by); ctx.stroke(); ctx.setLineDash([]); T(cx0 + cw + 8, by + 4.5, '가열 전 12.3 L', 13, MUTED, 'left', 700); }
    D.label(cx0 + cw + 8, py + 6, 'V = ' + f2(st.V) + ' L', { size: 13.5, bg: PUR, align: 'left' });
    const tx = cx0 + cw + 10, ty = Rr.y + 54;
    T(tx, ty + 80, 'T = ' + Math.round(st.T) + ' K', 14.5, hot > 0.5 ? BAD : INK, 'left', 800);
    T(tx, ty + 100, '(' + (st.T - KEL) + ' °C)', 13.5, MUTED, 'left', 700);
    T(tx, ty + 128, 'n = ' + f2(st.n) + ' mol', 14.5, INK, 'left', 800);
    T(tx, ty + 148, '(입자 ' + Math.round(st.n / 0.05) + '개)', 13.5, MUTED, 'left', 700);
    ctx.restore();
  }

  /* ================= ② 실험 설계 ================= */
  const MEAS = [
    { id: 'w', t: '⚖️ 기체의 질량 w (전자저울, g)', need: true },
    { id: 'V', t: '📏 기체의 부피 V (플라스크 눈금, L)', need: true },
    { id: 'T', t: '🌡️ 기체의 온도 T (온도계, °C → K)', need: true },
    { id: 'P', t: '🧭 기체의 압력 P (압력계 · 기압, atm)', need: true },
    { id: 'col', t: '🎨 기체의 색깔', need: false },
    { id: 'time', t: '🕒 측정한 시각', need: false },
    { id: 'cnt', t: '🔢 분자 수를 하나하나 세기', need: false },
  ];
  const PARTS = [
    { id: 'flask', t: '🧪 부피를 아는 플라스크', need: true },
    { id: 'bal', t: '⚖️ 전자저울', need: true },
    { id: 'therm', t: '🌡️ 온도계', need: true },
    { id: 'gauge', t: '🧭 압력계', need: true },
    { id: 'cork', t: '🔘 마개 (뚜껑)', need: true },
    { id: 'syr', t: '💉 주사기 (기체 넣기)', need: false },
    { id: 'burn', t: '🔥 가열 장치', need: false, bad: true },
  ];
  const mRect = (i) => { const L = RC.design.L, h = 36, st = 40; return { x: L.x + 14, y: L.y + 160 + i * st, w: L.w - 28, h }; };
  const pRect = (i) => { const Rr = RC.design.R, w = (Rr.w - 28 - 8) / 2, h = PHONE ? 38 : 48, st = PHONE ? 44 : 56; return { x: Rr.x + 14 + (i % 2) * (w + 8), y: Rr.y + (PHONE ? 198 : 272) + Math.floor(i / 2) * st, w, h }; };
  function drawDesign(t) {
    const L = RC.design.L, Rr = RC.design.R, d = S.des;
    T(14, 26, MODE_LABEL.design, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🎯 알아낼 것: 기체의 종류 → 몰질량 M', 14.5, INK, 'left', 800);
    const lines = [['① 몰질량 = 질량 / 몰수', 'M = w / n'], ['② 몰수는 PV = nRT에서', 'n = PV / RT'], ['③ 합치면', 'M = wRT / (PV)']];
    lines.forEach((q, i) => {
      const a = i < 2 ? 1 : 0.28 + 0.72 * d.formula, y = L.y + 52 + i * 30;
      ctx.save(); ctx.globalAlpha = a;
      T(L.x + 18, y, q[0], 13.5, MUTED, 'left', 800);
      T(L.x + L.w - 18, y, q[1], i === 2 ? 18 : 15.5, i === 2 ? '#92400e' : PUR, 'right', 800);
      if (i === 2) { ctx.strokeStyle = '#e0a100'; ctx.lineWidth = 2; D.roundRect(L.x + 12, y - 22, L.w - 24, 32, 10); ctx.stroke(); }
      ctx.restore();
    });
    T(L.x + 14, L.y + 146, '측정할 것을 눌러 골라요 (꼭 필요한 것만)', 13.5, INK, 'left', 800);
    MEAS.forEach((m, i) => {
      const r = mRect(i), on = !!d.meas[m.id];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 11); ctx.fillStyle = on ? '#f1ebff' : '#fff'; ctx.fill(); }, { blur: 3, y: 1 });
      ctx.strokeStyle = on ? PUR : '#d6dcea'; ctx.lineWidth = on ? 3 : 1.6; D.roundRect(r.x, r.y, r.w, r.h, 11); ctx.stroke();
      T(r.x + 12, r.y + r.h / 2 + 5, m.t, PHONE ? 13.5 : 14.5, INK, 'left', 800);
      if (on) D.check(r.x + r.w - 20, r.y + r.h / 2, 10, 1, { color: PUR });
    });
    // 장치
    panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    T(Rr.x + 14, Rr.y + 26, '🧰 장치 꾸리기 (부품을 눌러 올려요)', 14.5, INK, 'left', 800);
    drawBench(Rr, t);
    PARTS.forEach((p, i) => {
      const r = pRect(i), on = !!d.parts[p.id];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 11); ctx.fillStyle = on ? (p.bad ? '#fff0f0' : '#f1ebff') : '#fff'; ctx.fill(); }, { blur: 3, y: 1 });
      ctx.strokeStyle = on ? (p.bad ? BAD : PUR) : '#d6dcea'; ctx.lineWidth = on ? 3 : 1.6; D.roundRect(r.x, r.y, r.w, r.h, 11); ctx.stroke();
      const ls = wrap(p.t, r.w - 14, 13.5, 800);
      ls.forEach((l, j) => T(r.x + 8, r.y + r.h / 2 + 5 + (j - (ls.length - 1) / 2) * 17, l, 13.5, INK, 'left', 800));
    });
    const msg = d.msg; if (msg) textBlock(L.x + 14, L.y + 160 + 7 * 40 + 14, L.w - 28, msg, 13.5, d.ok ? '#14803f' : BAD, 17, 800);
  }
  function drawBench(Rr, t) {
    const d = S.des, y0 = Rr.y + (PHONE ? 148 : 236);
    const bxc = Rr.x + (PHONE ? 235 : 205), gxc = Rr.x + (PHONE ? 56 : 46), sxc = Rr.x + (PHONE ? 130 : 118), txc = Rr.x + Rr.w - (PHONE ? 62 : 50);
    D.roundRect(Rr.x + 14, y0, Rr.w - 28, 12, 5); ctx.fillStyle = '#b8a07a'; ctx.fill();
    ctx.fillStyle = '#9c8662'; ctx.fillRect(Rr.x + 26, y0 + 12, 8, 14); ctx.fillRect(Rr.x + Rr.w - 34, y0 + 12, 8, 14);
    const A = (id) => d.anim[id] || 0;
    const sc = PHONE ? 0.72 : 1;
    if (A('bal') > 0.02) { const a = sm(A('bal')); ctx.save(); ctx.globalAlpha = a; ctx.translate(bxc, y0); ctx.scale(sc, sc * (0.8 + 0.2 * a));
      D.shadow(() => { D.roundRect(-60, -22, 120, 22, 6); ctx.fillStyle = '#cbd5e1'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.fillStyle = '#334155'; D.roundRect(-44, -17, 54, 13, 3); ctx.fill(); T(-17, -7, d.parts.flask ? '0.88' : '0.00', 12, '#86efac', 'center', 800);
      ctx.fillStyle = '#94a3b8'; D.roundRect(-30, -28, 60, 6, 3); ctx.fill(); ctx.restore(); }
    if (A('flask') > 0.02) { const a = sm(A('flask')), by = y0 - (d.parts.bal ? 28 * sc : 0); ctx.save(); ctx.globalAlpha = a; ctx.translate(bxc, by); ctx.scale(sc, sc * (0.85 + 0.15 * a));
      ctx.fillStyle = 'rgba(190,215,255,.45)'; ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(0, -38, 38, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillRect(-9, -96, 18, 30); ctx.strokeRect(-9, -96, 18, 30);
      T(0, -34, '0.500 L', 13, '#1d4ed8', 'center', 800);
      if (d.parts.cork) { ctx.fillStyle = '#c08a4b'; D.roundRect(-12, -106, 24, 14, 3); ctx.fill(); }
      ctx.restore(); }
    else if (A('cork') > 0.02) { ctx.save(); ctx.globalAlpha = sm(A('cork')); ctx.fillStyle = '#c08a4b'; D.roundRect(bxc - 12, y0 - 18, 24, 14, 3); ctx.fill(); ctx.restore(); }
    if (A('therm') > 0.02) { const a = sm(A('therm')); ctx.save(); ctx.globalAlpha = a; ctx.translate(txc, y0); ctx.scale(sc, sc);
      D.thermometer(0, -92, 70, 27, 0, 50, { ticks: false }); ctx.restore(); T(txc, y0 + 22, '27 °C', 13, MUTED, 'center', 700, { alpha: a }); }
    if (A('gauge') > 0.02) { const a = sm(A('gauge')); ctx.save(); ctx.globalAlpha = a; D.dial(gxc, y0 - 46 * sc, 32 * sc, 1.0, 0, 2, { ticks: 2, color: BAD }); ctx.restore(); T(gxc, y0 + 22, '1.00 atm', 13, MUTED, 'center', 700, { alpha: a }); }
    if (A('syr') > 0.02) { const a = sm(A('syr')); ctx.save(); ctx.globalAlpha = a; const sy = y0 - 12; ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 2; D.roundRect(sxc - 24, sy - 7, 40, 14, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#94a3b8'; ctx.fillRect(sxc - 34, sy - 2, 10, 4); ctx.fillRect(sxc + 16, sy - 1.5, 12, 3); ctx.restore(); }
    if (A('burn') > 0.02) { const a = sm(A('burn')); ctx.save(); ctx.globalAlpha = a; D.flame(bxc, y0 - 2, 26 * a, t); ctx.restore(); D.label(bxc, y0 - 124 * sc, '⚠️ 밀폐 용기를 가열하면 위험해요', { size: 13, bg: BAD }); }
  }
  function mTap(p) {
    const d = S.des;
    for (let i = 0; i < MEAS.length; i++) { const r = mRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { d.meas[MEAS[i].id] = !d.meas[MEAS[i].id]; d.msg = ''; Sound.click(); return true; } }
    for (let i = 0; i < PARTS.length; i++) { const r = pRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { d.parts[PARTS[i].id] = !d.parts[PARTS[i].id]; d.msg = ''; Sound.click(); return true; } }
    return false;
  }
  function desCheck() {
    const d = S.des, sel = MEAS.filter((m) => d.meas[m.id]), partsSel = PARTS.filter((p) => d.parts[p.id]);
    if (!sel.length) return '측정할 것을 먼저 골라 주세요.';
    const wrongM = sel.filter((m) => !m.need), missM = MEAS.filter((m) => m.need && !d.meas[m.id]);
    if (wrongM.length) return '"' + wrongM[0].t.replace(/^\S+\s/, '') + '"은 몰질량을 구하는 데 필요하지 않아요. M = wRT/(PV)에 들어가는 양만 골라요.';
    if (missM.length) return 'M = wRT/(PV)에 들어가는 양 중 빠진 것이 있어요. (필요한 측정 4개)';
    if (d.parts.burn) return '밀폐한 용기를 가열하면 압력이 올라가 위험해요. 가열 장치는 빼고, 상온에서 측정해요.';
    const missP = PARTS.filter((p) => p.need && !d.parts[p.id]);
    if (missP.length) return '장치 부품이 부족해요. 빠진 것: ' + missP.map((p) => p.t.replace(/^\S+\s/, '')).join(', ') + '.';
    void partsSel; return true;
  }
  $('#desReset').addEventListener('click', () => { Sound.click(); S.des.meas = {}; S.des.parts = {}; S.des.msg = ''; });

  /* ================= ③ 기체 확인 ================= */
  const flaskPos = (i) => { const L = RC.ident.L; return PHONE ? { cx: L.x + 80 + i * 152, cy: L.y + 150 } : { cx: L.x + 82 + i * 160, cy: L.y + 172 }; };
  const candRect = (i) => { const Rr = RC.ident.R, w = (Rr.w - 28 - 16) / 3, h = PHONE ? 56 : 62; return { x: Rr.x + 14 + (i % 3) * (w + 8), y: Rr.y + (PHONE ? 46 : 46) + Math.floor(i / 3) * (h + 8), w, h }; };
  const gasList = ['A', 'B', 'C'];
  const flaskGas = gasList.map(() => mkGas(10));
  const nearestM = (g) => { const ex = mExact(g, 300); return CAND.reduce((a, c) => (Math.abs(c.M - ex) < Math.abs(a.M - ex) ? c : a)).M; };
  const idHL = (g) => { const v = S.id.mTyped[g]; if (v == null) return () => false; return (M) => Math.abs(M - v) <= 1.5; };
  function drawFlask(i, t) {
    const g = gasList[i], gi = GASES[g], q = flaskPos(i), sel = S.id.gas === g, R0 = 46;
    if (sel) { ctx.fillStyle = 'rgba(124,58,237,.08)'; D.roundRect(q.cx - 70, q.cy - 112, 140, 270, 14); ctx.fill(); ctx.strokeStyle = PUR; ctx.lineWidth = 2.4; ctx.setLineDash([6, 5]); D.roundRect(q.cx - 70, q.cy - 112, 140, 270, 14); ctx.stroke(); ctx.setLineDash([]); }
    T(q.cx, q.cy - 86, '기체 ' + g, 17, INK, 'center', 800);
    // 병
    ctx.fillStyle = 'rgba(190,215,255,.32)'; ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3;
    ctx.fillRect(q.cx - 9, q.cy - R0 - 24, 18, 30); ctx.strokeRect(q.cx - 9, q.cy - R0 - 24, 18, 30);
    ctx.beginPath(); ctx.arc(q.cx, q.cy, R0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c08a4b'; D.roundRect(q.cx - 12, q.cy - R0 - 34, 24, 13, 3); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(q.cx, q.cy, R0 - 2, 0, TAU); ctx.clip();
    flaskGas[i].ps.forEach((p) => dot(q.cx + p.x, q.cy + p.y, 5, gi.c));
    ctx.restore();
    // 저울
    const by = q.cy + R0 + 12;
    D.shadow(() => { D.roundRect(q.cx - 58, by, 116, 40, 8); ctx.fillStyle = '#cbd5e1'; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.fillStyle = '#1f2937'; D.roundRect(q.cx - 46, by + 8, 92, 24, 5); ctx.fill();
    const wv = S.id.wShow[g], has = S.id.w[g] != null;
    T(q.cx, by + 26, has ? (g === 'C' ? fx(wv || 0, 3) : fx(wv || 0, 2)) + ' g' : '— g', 16, has ? '#86efac' : '#64748b', 'center', 800);
    if (S.id.ident[g]) D.check(q.cx + 52, q.cy - 56, 12, 1, { color: GOOD });
  }
  function drawIdentL(t) {
    const L = RC.ident.L, s = S.id, g = s.gas;
    panel(L.x, L.y, L.w, L.h, 14);
    gasList.forEach((_, i) => drawFlask(i, t));
    const y1 = L.y + (PHONE ? 290 : 318);
    T(L.x + L.w / 2, y1 - 8, '세 플라스크: 0.500 L · 27 °C(300 K) · 1.00 atm · 분자 수는 모두 같아요', PHONE ? 12.5 : 13.5, MUTED, 'center', 700);
    // 계산 패널
    const py = y1 + 6, ph = L.y + L.h - py - 10;
    D.roundRect(L.x + 12, py, L.w - 24, ph, 12); ctx.fillStyle = '#f8f9fc'; ctx.fill();
    const has = s.w[g] != null, Tr = FLASK_T + s.err;
    T(L.x + 24, py + 26, '⚖️ 기체 ' + g + '의 몰질량 M = wRT / (PV)', 14.5, INK, 'left', 800);
    if (!has) { T(L.x + 24, py + 58, '먼저 ⚖️ 질량 재기를 눌러 w를 알아내요.', 14, '#9aa5b6', 'left', 700); return; }
    const wT = GASES[g].wTxt;
    T(L.x + 24, py + 54, '= (' + wT + ' × 0.082 × ' + (s.err ? Tr + '' : '300') + ') / (1.00 × 0.500)', 15, MUTED, 'left', 800);
    if (s.err) T(L.x + L.w - 24, py + 54, '온도계가 ' + sgn(s.err) + ' °C 틀림', 13.5, BAD, 'right', 800);
    const typed = s.mTyped[g];
    if (s.mok[g]) { T(L.x + 24, py + 86, '= ' + f1(mExact(g, 300)) + ' g/mol  (가장 가까운 후보: ' + nearestM(g) + ') ✅', 16, '#14803f', 'left', 800); }
    else T(L.x + 24, py + 86, '= ? g/mol   (계산해서 오른쪽 아래 칸에 써요)', 14, '#9aa5b6', 'left', 700);
    if (s.err && S.gate === 'err') {
      const ma = mExact('A', 300), mb = mExact('A', Tr);
      T(L.x + 24, py + 114, '정확한 T = 300 K → M = ' + f1(ma), 14, INK, 'left', 800);
      T(L.x + 24, py + 138, '틀린 T = ' + Tr + ' K → M = ' + f1(mb) + '  (' + (mb >= ma ? '+' : '−') + fx(Math.abs(mb - ma) / ma * 100, 1) + ' %)', 14, BAD, 'left', 800);
    } else if (s.msg) textBlock(L.x + 24, py + 116, L.w - 48, s.msg, 13.5, s.msgGood ? '#14803f' : BAD, 18, 800);
    void typed;
  }
  function drawIdentR(t) {
    const Rr = RC.ident.R, s = S.id, g = s.gas;
    panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    T(Rr.x + 14, Rr.y + 28, '후보 기체 카드 (몰질량 g/mol)', 14, INK, 'left', 800);
    const hl = idHL(g), okTyped = s.mok[g];
    CAND.forEach((cd, i) => {
      const r = candRect(i), on = okTyped && hl(cd.M), lift = s.lift[cd.id] || 0, sh = (s.cardShake[cd.id] || 0) > 0 ? Math.sin(S.t * 50) * 4 : 0, picked = s.ident[g] && cd.id === GASES[g].id;
      ctx.save(); ctx.translate(sh, -lift * 8);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 11); ctx.fillStyle = picked ? '#e6f8ee' : on ? '#fff7d6' : '#fff'; ctx.fill(); }, { blur: 3 + lift * 8, y: 1 + lift * 4 });
      ctx.strokeStyle = picked ? GOOD : on ? '#e0a100' : '#d6dcea'; ctx.lineWidth = on || picked ? 3 : 1.6; D.roundRect(r.x, r.y, r.w, r.h, 11); ctx.stroke();
      ctx.globalAlpha = okTyped && !on ? 0.45 : 1;
      T(r.x + r.w / 2, r.y + r.h / 2 - 2, cd.f, 17, INK, 'center', 800);
      T(r.x + r.w / 2, r.y + r.h / 2 + 18, cd.M + '', 14, on ? '#92400e' : MUTED, 'center', 800);
      ctx.restore();
    });
    // 보조 시험
    const ty = Rr.y + (PHONE ? 46 + 3 * 64 + 12 : 46 + 3 * 70 + 14);
    T(Rr.x + 14, ty + 14, '🧪 보조 시험 (기체 ' + g + ')', 14, INK, 'left', 800);
    const th = Rr.y + Rr.h - ty - 26;
    D.roundRect(Rr.x + 12, ty + 22, Rr.w - 24, th, 12); ctx.fillStyle = '#f8f9fc'; ctx.fill();
    const tb = s.tube, p = clamp((S.t - tb.t0) / 1.8, 0, 1), cxT = Rr.x + Rr.w / 2 - (PHONE ? 90 : 56), yT = ty + 22 + th - 14;
    if (tb.kind === 'lime') {
      const cloud = tb.gas === 'A' ? sm(p) : 0;
      ctx.fillStyle = 'rgba(200,230,255,.5)'; ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3; D.roundRect(cxT - 22, yT - 100, 44, 100, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(' + Math.round(lerp(170, 245, cloud)) + ',' + Math.round(lerp(215, 245, cloud)) + ',255,' + lerp(0.55, 0.92, cloud) + ')'; ctx.fillRect(cxT - 19, yT - 62, 38, 59);
      if (!RM && p < 1) for (let q = 0; q < 3; q++) { const ph = (S.t * 1.2 + q / 3) % 1; dot(cxT + Math.sin(ph * 9 + q) * 6, yT - 6 - ph * 56, 3, '#fff', 0.8); }
      T(cxT + 40, yT - 54, tb.gas === 'A' ? (cloud > 0.6 ? '뿌옇게 흐려져요' : '기체를 넣는 중') : '변화 없음', 13.5, tb.gas === 'A' ? '#6d28d9' : MUTED, 'left', 800);
      T(cxT + 40, yT - 34, '석회수', 13, MUTED, 'left', 700);
    } else if (tb.kind === 'splint') {
      const k = tb.gas === 'A' ? 1 - sm(p) : tb.gas === 'B' ? 0.6 + 0.4 * sm(p) : 1;
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cxT - 30, yT - 10); ctx.lineTo(cxT + 40, yT - 52); ctx.stroke();
      if (k > 0.04) D.flame(cxT + 40, yT - 52, 38 * k, S.t); else if (!RM) { dot(cxT + 40, yT - 62, 5, '#94a3b8', 0.5); }
      T(cxT + 62, yT - 40, tb.gas === 'A' ? (p > 0.7 ? '불꽃이 꺼져요' : '기체 속으로') : tb.gas === 'B' ? '불꽃이 타올라요' : '펑 소리가 나며 타요', 13.5, tb.gas === 'A' ? '#6d28d9' : MUTED, 'left', 800);
    } else T(Rr.x + Rr.w / 2, ty + 22 + th / 2 + 5, '아래 단추로 시험해요', 13.5, '#9aa5b6', 'center', 700);
    void t;
  }
  function candTap(p) {
    const s = S.id, g = s.gas;
    for (let i = 0; i < CAND.length; i++) {
      const r = candRect(i); if (!(p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)) continue;
      const cd = CAND[i]; Sound.click();
      if (s.w[g] == null) { s.msg = '먼저 질량을 재요.'; s.msgGood = false; return true; }
      if (!s.mok[g]) { s.msg = '먼저 M을 계산해서 써 넣어요.'; s.msgGood = false; return true; }
      const wrongShake = (m) => { s.msg = m; s.msgGood = false; s.cardShake[cd.id] = 0.4; Sound.fail(); };
      if (!idHL(g)(cd.M)) { wrongShake('그 카드의 몰질량(' + cd.M + ')은 계산한 값과 달라요.'); return true; }
      const same = CAND.filter((c2) => idHL(g)(c2.M));
      const tests = s.test[g];
      if (same.length > 1 && !(tests.lime || tests.splint)) { wrongShake('후보가 둘이에요(몰질량이 같아요). 🧪 석회수 시험이나 🔥 불씨 막대로 구별해요.'); return true; }
      if (cd.id === GASES[g].id) { s.ident[g] = true; s.msg = '기체 ' + g + '는 ' + cd.f + '예요! ✅'; s.msgGood = true; Sound.success(); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 14, speed: 140, size: 3, colors: ['#ffb400', '#14a058', '#8b5cf6'] }); }
      else wrongShake(cd.f === 'N₂O' ? '석회수를 흐리게 하고 불꽃을 꺼요. N₂O는 그렇지 않아요(오히려 불꽃을 더 타게 해요).' : cd.f + '가 아니에요. 보조 시험 결과를 다시 봐요.');
      return true;
    }
    return false;
  }
  gasList.forEach((g) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = g; b.textContent = '기체 ' + g; $('#gasChips').appendChild(b); });
  [[-5, '−5 °C 낮게'], [0, '정확하게'], [5, '+5 °C 높게']].forEach(([v, n]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = n; $('#errChips').appendChild(b); });
  function selGas(g) { S.id.gas = g; S.id.msg = ''; $('#inM').value = S.id.mTyped[g] != null ? S.id.mTyped[g] : ''; $('#inM').classList.toggle('ok', !!S.id.mok[g]); $('#inM').classList.remove('bad'); updateCtl(); }
  $('#gasChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); selGas(b.dataset.v); });
  $('#bWeigh').addEventListener('click', () => { Sound.click(); const g = S.id.gas; S.id.w[g] = GASES[g].w; S.id.wShow[g] = 0; S.id.msg = ''; updateCtl(); });
  $('#inM').addEventListener('input', () => {
    const g = S.id.gas, v = parseNum($('#inM').value), inp = $('#inM');
    inp.classList.remove('ok', 'bad');
    if (S.id.w[g] == null) { if (inp.value.length) showHint('먼저 ⚖️ 질량 재기를 눌러요.', 2500); return; }
    const ex = mExact(g, 300), tol = Math.max(0.5, ex * 0.035);
    if (near(v, ex, tol)) { inp.classList.add('ok'); if (!S.id.mok[g]) { S.id.mok[g] = true; Sound.success(); } S.id.mTyped[g] = v; S.id.msg = ''; }
    else { S.id.mok[g] = false; S.id.mTyped[g] = null; if (!isNaN(v) && inp.value.length >= 1 && ('' + v).length >= (ex < 10 ? 3 : 2)) inp.classList.add('bad'); }
  });
  function runTest(kind) { const g = S.id.gas; S.id.test[g][kind] = true; S.id.tube = { gas: g, kind, t0: S.t }; Sound.click(); }
  $('#bLime').addEventListener('click', () => runTest('lime'));
  $('#bSplint').addEventListener('click', () => runTest('splint'));
  $('#errChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.id.err = +b.dataset.v; if (S.id.err !== 0) S.id.errUsed = true; updateCtl(); });
  $('#inE').addEventListener('input', () => { const v = parseNum($('#inE').value), inp = $('#inE'); inp.classList.remove('ok', 'bad'); S.id.errOk = near(v, 5 / 300 * 100, 0.5); if (S.id.errOk) inp.classList.add('ok'); else if (!isNaN(v) && inp.value.length >= 2) inp.classList.add('bad'); });

  /* ================= ④ 근사의 한계 ================= */
  const bagGas = mkGas(30), balGas = mkGas(20), realGas = mkGas(10);
  function drawLimit(t) {
    const L = RC.limit.L, sub = S.sub.limit;
    T(14, 26, MODE_LABEL.limit, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    if (sub === 'bag') drawBag(L, t); else if (sub === 'balloon') drawBalloon(L, t); else drawReal(L, t);
  }
  function bagR(V) { return (PHONE ? 17 : 21) * Math.cbrt(Math.max(V, 0)); }
  function drawBag(L, t) {
    const lm = S.lim, w = PHONE ? L.w : 388, lx = L.x + 16;
    T(lx, L.y + 30, '💥 자동차 에어백: 아자이드화 소듐(NaN₃)의 분해', 15, INK, 'left', 800);
    const steps = ['2NaN₃ → 2Na + 3N₂', 'NaN₃ 65 g = 1 mol → N₂ 1.5 mol', '조건: 27 °C = 300 K, 1.00 atm', 'V = nRT / P'];
    steps.forEach((q, i) => T(lx + 4, L.y + 64 + i * 28, q, 14.5, i === 3 ? PUR : MUTED, 'left', 800));
    const fv = 'V = (1.5 × 0.082 × 300) / 1.00';
    T(lx + 4, L.y + 64 + 4 * 28, '= ' + (lm.bagOk ? f1(BAG_V) + ' ≈ 37 L ✅' : '?  (오른쪽 칸에 계산해서 써요)'), 15, lm.bagOk ? '#14803f' : '#9aa5b6', 'left', 800);
    T(lx + 4, L.y + 64 + 5 * 28 + 4, fv, 13.5, MUTED, 'left', 700);
    if (lm.fired) { const cmp = '내가 쓴 값 ' + (isNaN(lm.bagVal) ? '—' : fx(lm.bagVal, 1)) + ' L / 실제 ' + f1(BAG_V) + ' L'; textBlock(lx + 4, L.y + 64 + 6 * 28 + 10, w - 20, '에어백이 순식간에 약 37 L로 부풀어요. ' + cmp + ' (고체가 분해해 기체가 생겨서 압력이 아니라 부피가 커져요.)', 13.5, '#14803f', 18, 800); }
    // 장면
    const sx = PHONE ? L.x + L.w / 2 : L.x + 560, sy = PHONE ? L.y + 560 : L.y + 330, wheelR = PHONE ? 70 : 84;
    ctx.fillStyle = '#e8edf5'; D.roundRect(PHONE ? L.x + 20 : L.x + 400, PHONE ? L.y + 330 : L.y + 64, PHONE ? L.w - 40 : 364, PHONE ? 440 : 410, 14); ctx.fill();
    // 핸들
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(sx, sy, wheelR, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(sx, sy, wheelR * 0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(sx - wheelR, sy); ctx.lineTo(sx + wheelR, sy); ctx.stroke();
    T(sx, sy + wheelR + 30, 'NaN₃ 65 g (1 mol)', 13.5, MUTED, 'center', 700);
    // 에어백
    const e = lm.fired ? (RM ? 1 : Math.min(1, (S.t - lm.firedT) / 0.5)) : 0;
    lm.firedP = SciSim.approach(lm.firedP, lm.fired ? 1 : 0, 1 / 60, 14);
    const rr = bagR(BAG_V) * clamp(lm.fired ? SciSim.ease.outBack(e) : 0, 0, 1.12);
    if (rr > 2) {
      const cy = sy - wheelR * 0.2 - rr * 0.35;
      const g = ctx.createRadialGradient(sx - rr * 0.3, cy - rr * 0.3, rr * 0.1, sx, cy, rr); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cbd5e1');
      D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, cy, rr, 0, TAU); ctx.fill(); }, { blur: 12, y: 4 });
      ctx.save(); ctx.beginPath(); ctx.arc(sx, cy, rr - 2, 0, TAU); ctx.clip();
      bagGas.ps.forEach((q) => dot(sx + q.x, cy + q.y, 4, '#3867f4', 0.9)); ctx.restore();
      T(sx, cy + 5, f1(BAG_V * clamp(rr / bagR(BAG_V), 0, 1) ** 3) + ' L', 17, INK, 'center', 800);
    }
  }
  function drawBalloon(L, t) {
    const lm = S.lim, p = presAt(lm.alt), V = 24.6 / p;
    T(L.x + 16, L.y + 30, '🎈 헬륨 풍선이 올라가면? (n = 1.0 mol, 27 °C로 가정)', 15, INK, 'left', 800);
    const cx = PHONE ? L.x + L.w / 2 : L.x + 480, cy = PHONE ? L.y + 280 : L.y + 250, k = PHONE ? 15 : 19;
    ctx.fillStyle = C.mix('#bfe3ff', '#1e3a8a', clamp(lm.alt / 14, 0, 0.85)); D.roundRect(PHONE ? L.x + 16 : L.x + 340, PHONE ? L.y + 50 : L.y + 50, PHONE ? L.w - 32 : 420, PHONE ? 440 : 440, 14); ctx.fill();
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, k * Math.cbrt(BURST_V), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    T(cx, cy - k * Math.cbrt(BURST_V) - 8, '터지는 한계 ' + BURST_V + ' L', 13.5, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.35)', strokeWidth: 3 });
    const vShow = lm.balloonV;
    if (!lm.burst) {
      const r = k * Math.cbrt(vShow);
      const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05); g.addColorStop(0, '#ffe08a'); g.addColorStop(0.6, '#f59e0b'); g.addColorStop(1, '#b45309');
      D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); }, { blur: 10, y: 4 });
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, TAU); ctx.clip(); balGas.ps.forEach((q) => dot(cx + q.x * r / 60, cy + q.y * r / 60, 4, '#fff', 0.95)); ctx.restore();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx, cy + r); ctx.lineTo(cx, cy + r + 40); ctx.stroke();
      T(cx, cy + 5, f1(V) + ' L', 18, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.35)', strokeWidth: 3 });
    } else {
      T(cx, cy, '💥 펑!', 40, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.4)', strokeWidth: 4 });
      T(cx, cy + 40, '고도를 낮추면 새 풍선이 떠요', 14, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.35)', strokeWidth: 3 });
    }
    // 표
    const tx = L.x + 16, ty = PHONE ? L.y + 508 : L.y + 66;
    T(tx, ty, '고도(km) · 외부 압력(atm) · 풍선 부피(L)', 13.5, INK, 'left', 800);
    ALT.forEach((q, i) => {
      const y = ty + 28 + i * (PHONE ? 28 : 32), on = Math.abs(lm.alt - q[0]) < 0.01, vv = 24.6 / q[1];
      if (on) { ctx.fillStyle = 'rgba(124,58,237,.1)'; D.roundRect(tx - 4, y - 18, PHONE ? L.w - 24 : 300, 26, 8); ctx.fill(); }
      T(tx + 8, y, q[0] + ' km', 14, INK, 'left', 800); T(tx + 100, y, f2(q[1]) + ' atm', 14, INK, 'left', 800); T(tx + 200, y, f1(vv) + ' L', 14, vv > BURST_V ? BAD : INK, 'left', 800);
    });
    textBlock(tx, ty + 28 + 7 * (PHONE ? 28 : 32) + 8, PHONE ? L.w - 32 : 300, '온도와 몰수가 같으면 V = nRT / P이므로 외부 압력이 작아질수록 부피가 커져요. 압력이 0.5 atm이면 부피는 2배예요.', 13.5, MUTED, 18, 700);
    T(PHONE ? L.x + 16 : tx, PHONE ? L.y + 500 : L.y + L.h - 18, '지금: ' + f1(lm.alt) + ' km, 압력 ' + f2(p) + ' atm, 부피 ' + f1(V) + ' L', 14.5, lm.burst ? BAD : PUR, 'left', 800);
    void t;
  }
  function drawReal(L, t) {
    const lm = S.lim;
    T(L.x + 16, L.y + 30, '📉 PV / (nRT)로 이상 기체와 비교하기 (CO₂, 정성적)', 15, INK, 'left', 800);
    const gx0 = L.x + (PHONE ? 54 : 62), gy0 = L.y + 60, gw = PHONE ? L.w - 74 : 450, gh = PHONE ? 330 : 360;
    const X = (p) => gx0 + (p / 50) * gw, Y = (z) => gy0 + gh - (z - 0.5) / 0.6 * gh;
    D.roundRect(gx0 - 6, gy0 - 8, gw + 18, gh + 16, 10); ctx.fillStyle = '#fbfcff'; ctx.fill();
    [0.6, 0.7, 0.8, 0.9, 1.0, 1.1].forEach((z) => { ctx.strokeStyle = 'rgba(120,130,150,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, Y(z)); ctx.lineTo(gx0 + gw, Y(z)); ctx.stroke(); T(gx0 - 8, Y(z) + 4.5, f1(z), 13, MUTED, 'right', 700); });
    [0, 10, 20, 30, 40, 50].forEach((p) => { ctx.strokeStyle = 'rgba(120,130,150,.18)'; ctx.beginPath(); ctx.moveTo(X(p), gy0); ctx.lineTo(X(p), gy0 + gh); ctx.stroke(); T(X(p), gy0 + gh + 18, String(p), 13, MUTED, 'center', 700); });
    T(gx0 + gw, gy0 + gh + 36, '압력 P (atm)', 13, INK, 'right', 800); T(gx0 - 44, gy0 - 14, 'PV / nRT', 13, INK, 'left', 800);
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(X(0), Y(1)); ctx.lineTo(X(50), Y(1)); ctx.stroke(); ctx.setLineDash([]);
    T(X(50) - 4, Y(1) - 8, '이상 기체 = 1.0', 13.5, '#15803d', 'right', 800);
    [[Z25, PUR, '25 °C'], [Z100, AMB, '100 °C']].forEach(([tab, col, nm]) => {
      ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.beginPath(); tab.forEach((q, i) => { const x = X(q[0]), y = Y(q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
      T(X(12), Y(zAt(tab, 12)) + (nm === '25 °C' ? 24 : -10), 'CO₂ ' + nm, 13.5, col, 'left', 800);
    });
    const tab = lm.zT === 25 ? Z25 : Z100, z = zAt(tab, lm.zP), col = lm.zT === 25 ? PUR : AMB;
    ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(lm.zP), gy0 + gh); ctx.lineTo(X(lm.zP), Y(z)); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(X(lm.zP), Y(z), 8, col, { gloss: false, outline: '#fff', outlineWidth: 2 });
    D.label(clamp(X(lm.zP), gx0 + 70, gx0 + gw - 60), Y(z) - 22, lm.zP + ' atm, ' + lm.zT + ' °C: ' + f2(z), { size: 13.5, bg: col });
    // 입자 밀도 상자
    const bx = PHONE ? L.x + 16 : L.x + 560, by = PHONE ? L.y + 450 : L.y + 70, bw = PHONE ? 160 : 190, bh = PHONE ? 160 : 190;
    D.roundRect(bx, by, bw, bh, 10); ctx.fillStyle = '#eef4ff'; ctx.fill(); ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip(); const sc2 = bw / 190; realGas.ps.forEach((q) => dot(bx + q.x * sc2, by + q.y * sc2, 4.6, '#3867f4')); ctx.restore();
    T(bx + bw / 2, by + bh + 20, '같은 부피 속 분자 (압력 ' + lm.zP + ' atm)', 13, MUTED, 'center', 700);
    const tx = PHONE ? L.x + 16 : L.x + 560, ty = PHONE ? L.y + 656 : L.y + 316;
    textBlock(tx, ty, PHONE ? L.w - 32 : 206, lm.zP >= 30 ? '고압: 분자가 서로 가까워 분자 자신의 부피와 분자 사이의 끌어당기는 힘 때문에 이상 기체에서 벗어나요.' : '저압(1 atm 근처): 분자 사이가 멀어 이상 기체로 거의 맞아요. 일상 조건에서는 충분히 정확해요.', 13.5, lm.zP >= 30 ? BAD : '#14803f', 18, 800);
    textBlock(tx, ty + (PHONE ? 76 : 100), PHONE ? L.w - 32 : 206, lm.zT === 100 ? '온도가 높으면 같은 압력에서도 이상 기체에 더 가까워요.' : '온도가 낮으면 편차가 더 커요. 고온 · 저압일 때 가장 잘 맞아요.', 13.5, MUTED, 18, 700);
    void t;
  }
  function limitReset() { const lm = S.lim; lm.fired = false; lm.firedP = 0; lm.bagOk = false; lm.bagVal = NaN; $('#inB').value = ''; $('#inB').classList.remove('ok', 'bad'); updateCtl(); }
  $('#inB').addEventListener('input', () => { const v = parseNum($('#inB').value), inp = $('#inB'); S.lim.bagVal = v; S.lim.bagOk = near(v, BAG_V, 0.5); inp.classList.remove('ok', 'bad'); if (S.lim.bagOk) { inp.classList.add('ok'); } else if (!isNaN(v) && inp.value.length >= 2) inp.classList.add('bad'); });
  $('#bFire').addEventListener('click', () => {
    if (!S.lim.bagOk) { showHint('먼저 부피를 계산해서 바르게 써요. 1.5 mol, 300 K, 1 atm이에요.', 3500); Sound.fail(); return; }
    Sound.success(); S.lim.fired = true; S.lim.firedT = S.t; const L = RC.limit.L; parts.burst(PHONE ? L.x + L.w / 2 : L.x + 560, PHONE ? L.y + 560 : L.y + 320, { count: 26, speed: 220, size: 3.4, colors: ['#e2e8f0', '#3867f4', '#ffb400'] }); updateCtl();
  });
  $('#bFireR').addEventListener('click', () => { Sound.click(); limitReset(); });
  const setAlt = (v) => { S.lim.alt = clamp(Math.round(v * 2) / 2, 0, 12); updateCtl(); };
  $('#sAlt').addEventListener('input', (e) => setAlt(+e.target.value));
  $('#aMinus').addEventListener('click', () => { Sound.tick(); setAlt(S.lim.alt - 0.5); });
  $('#aPlus').addEventListener('click', () => { Sound.tick(); setAlt(S.lim.alt + 0.5); });
  const setZP = (v) => { S.lim.zP = clamp(Math.round(v), 1, 50); S.lim.zMax[S.lim.zT] = Math.max(S.lim.zMax[S.lim.zT], S.lim.zP); updateCtl(); };
  $('#sZP').addEventListener('input', (e) => setZP(+e.target.value));
  $('#zMinus').addEventListener('click', () => { Sound.tick(); setZP(S.lim.zP - 1); });
  $('#zPlus').addEventListener('click', () => { Sound.tick(); setZP(S.lim.zP + 1); });
  $('#zTSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.lim.zT = +b.dataset.v; S.lim.zMax[S.lim.zT] = Math.max(S.lim.zMax[S.lim.zT], S.lim.zP); updateCtl(); });
  $('#lmSub').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sub.limit = b.dataset.v; S.fade = 0.5; updateCtl(); });

  /* ================= 컨트롤 · 공통 ================= */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#prChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.calc.prob); b.classList.toggle('done', !!S.calc.solved[+b.dataset.v]); });
    $$('#gasChips button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.id.gas); b.classList.toggle('done', !!S.id.ident[b.dataset.v]); });
    $$('#errChips button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.id.err));
    $$('#lmSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.limit));
    $$('#zTSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.lim.zT));
    $('#mLab').textContent = '기체 ' + S.id.gas + '의 M';
    $('#oAlt').textContent = f1(S.lim.alt) + ' km'; $('#sAlt').value = S.lim.alt;
    $('#oZP').textContent = S.lim.zP + ' atm'; $('#sZP').value = S.lim.zP;
    $('#aMinus').disabled = S.lim.alt <= 0; $('#aPlus').disabled = S.lim.alt >= 12; $('#zMinus').disabled = S.lim.zP <= 1; $('#zPlus').disabled = S.lim.zP >= 50;
    $('#bWeigh').textContent = S.id.w[S.id.gas] != null ? '⚖️ 다시 재기' : '⚖️ 질량 재기';
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); }
    S.mode = m; updateCtl();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.mode === 'calc') calcSetProb(S.calc.prob);
    else if (S.mode === 'design') { S.des.meas = {}; S.des.parts = {}; S.des.msg = ''; }
    else if (S.mode === 'ident') { const g = S.id.gas; S.id.w[g] = null; S.id.wShow[g] = 0; S.id.mok[g] = false; S.id.mTyped[g] = null; S.id.test[g] = {}; S.id.ident[g] = false; S.id.msg = ''; $('#inM').value = ''; $('#inM').classList.remove('ok', 'bad'); }
    else if (S.sub.limit === 'bag') limitReset(); else if (S.sub.limit === 'balloon') { S.lim.alt = 0; S.lim.burst = false; } else { S.lim.zP = 1; S.lim.zT = 25; }
    updateCtl();
  });

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'design') { mTap(p); return false; }
      if (S.mode === 'ident') {
        if (candTap(p)) return false;
        gasList.forEach((g, i) => { const q = flaskPos(i); if (Math.abs(p.x - q.cx) < 64 && p.y > q.cy - 100 && p.y < q.cy + 110) { Sound.click(); selGas(g); } });
        return false;
      }
      return false;
    },
    hover(p) {
      if (S.mode === 'design') { for (let i = 0; i < MEAS.length; i++) { const r = mRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'pointer'; } for (let i = 0; i < PARTS.length; i++) { const r = pRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'pointer'; } }
      if (S.mode === 'ident') { for (let i = 0; i < CAND.length; i++) { const r = candRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'pointer'; } }
      return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'calc') { const pr = PROBS[S.calc.prob]; L1 = '문제'; a = ['①', '②', '③'][S.calc.prob] + ' ' + pr.unk + ' 구하기'; L2 = '식'; b = 'PV = nRT'; L3 = '구한 값'; c = S.calc.ok3 ? f2(S.calc.res) + ' ' + pr.unit : '아직'; }
    else if (S.mode === 'design') { L1 = '고른 측정'; a = MEAS.filter((m) => S.des.meas[m.id]).length + '개'; L2 = '고른 부품'; b = PARTS.filter((m) => S.des.parts[m.id]).length + '개'; L3 = '몰질량 식'; c = 'M = wRT / (PV)'; }
    else if (S.mode === 'ident') { const g = S.id.gas; L1 = '기체 ' + g + '의 질량 w'; a = S.id.w[g] != null ? GASES[g].wTxt + ' g' : '아직'; L2 = '몰질량 M'; b = S.id.mok[g] ? f1(mExact(g, 300)) + ' g/mol' : '?'; L3 = '확인한 기체'; c = gasList.filter((x) => S.id.ident[x]).length + ' / 3'; }
    else if (S.sub.limit === 'bag') { L1 = 'N₂ 몰수'; a = '1.5 mol'; L2 = '부피 (27 °C, 1 atm)'; b = S.lim.bagOk ? f1(BAG_V) + ' L' : '?'; L3 = '점화'; c = S.lim.fired ? '완료' : '아직'; }
    else if (S.sub.limit === 'balloon') { const p = presAt(S.lim.alt); L1 = '고도 · 압력'; a = f1(S.lim.alt) + ' km · ' + f2(p) + ' atm'; L2 = '풍선 부피'; b = f1(24.6 / p) + ' L'; L3 = '터지는 한계'; c = BURST_V + ' L'; }
    else { const z = zAt(S.lim.zT === 25 ? Z25 : Z100, S.lim.zP); L1 = '압력 · 온도'; a = S.lim.zP + ' atm · ' + S.lim.zT + ' °C'; L2 = 'PV / nRT'; b = f2(z); L3 = '이상 기체'; c = '1.00'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const identAll = () => gasList.every((g) => S.id.ident[g]);
  const levels = [
    {
      title: '식 다루기: PV = nRT 계산', short: '식 다루기', icon: '🧮', phase: '예측',
      intro: '<p class="si-q">❓ 탐구 질문: 상자 속 정체를 알 수 없는 기체가 무엇인지, 저울과 온도계와 압력계만으로 알아낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 압력 · 부피 · 온도 · 몰수가 <b>PV = nRT</b> 한 식으로 묶인다는 것을 알았어요(R = 0.082 atm·L/(mol·K)). 통합과학 · 화학에서 배운 <b>0 °C, 1 atm에서 기체 1 mol = 22.4 L</b>도 이 식의 한 경우예요.</div>' +
        '<p>이번 차시는 식을 <b>계산 도구</b>로 써요. 네 값 중 세 개를 알면 나머지 하나를 구할 수 있어요. 단위를 식에 맞게 바꾸는 것이 열쇠예요: <b>T는 켈빈(K), V는 L, P는 atm</b>.</p>',
      features: ['calc'],
      setup() { S.lock = false; S.gate = ''; calcSetProb(0); setMode('calc'); },
      recap: '세 값을 알면 PV = nRT로 나머지 하나를 구해요. 계산할 때는 T를 켈빈(°C + 273), V를 L, P를 atm으로 바꿔서 넣어요.',
      summary: '<ul><li><b>PV = nRT</b>, R = 0.082 atm·L/(mol·K), T(K) = t(°C) + 273</li><li>변형: n = PV / RT, P = nRT / V, V = nRT / P</li><li>예) 2.0 atm, 6.15 L, 300 K → n = <b>0.50 mol</b> / 2.0 mol, 12.3 L, 300 K → P = <b>4.0 atm</b> / 0.50 mol, 1.0 atm, 127 °C(400 K) → V = <b>16.4 L</b></li><li>자주 하는 실수: °C를 그대로 대입, mL를 그대로 대입 → 결과가 크게 틀려요.</li></ul>',
      missions: [
        {
          title: '몰수 n과 압력 P 구하기',
          goal: '문제 <b>①(n 구하기)</b>과 <b>②(P 구하기)</b>의 값을 계산기에 알맞은 단위로 넣어 결과를 구하세요.',
          hint: '문제 ①은 단위를 바꿔야 해요: 6150 mL = 6.15 L, 27 °C = 300 K. 구하는 칸은 비워 두면 결과가 나와요.',
          setup() { S.lock = true; S.gate = ''; S.calc.solved = [false, false, false]; calcSetProb(0); setMode('calc'); },
          check: () => S.calc.solved[0] && S.calc.solved[1], hold: 0.5,
          status: () => '① n ' + mark(S.calc.solved[0]) + ' &nbsp; ② P ' + mark(S.calc.solved[1]),
          explain: '① n = PV/RT = (2.0 × 6.15) / (0.082 × 300) = <b>0.50 mol</b>. ② P = nRT/V = (2.0 × 0.082 × 300) / 12.3 = <b>4.0 atm</b>. 압력은 atm, 부피는 L, 온도는 K로 맞춰야 R = 0.082를 쓸 수 있어요.',
        },
        {
          title: '가열한 뒤의 부피 구하기',
          goal: '문제 <b>③</b>: 압력이 일정할 때 27 °C에서 <b>127 °C</b>로 가열한 뒤의 부피를 구하세요.',
          hint: '온도는 켈빈으로 바꿔요: 127 + 273 = 400 K. 몰수 0.5, 압력 1.0을 넣고 V 칸은 비워요.',
          setup() { S.lock = true; S.gate = ''; calcSetProb(2); setMode('calc'); },
          check: () => S.calc.solved[2], hold: 0.5,
          status: () => '③ V ' + mark(S.calc.solved[2]),
          explain: 'V = nRT/P = (0.50 × 0.082 × 400) / 1.0 = <b>16.4 L</b>예요. 27 °C(300 K)에서는 12.3 L였고, 온도가 400 K/300 K ≈ 1.33배가 되어 부피도 약 1.33배가 됐어요.',
        },
        {
          type: 'quiz', title: '°C를 그대로 대입하면?',
          goal: '온도 <b>27 °C</b>를 켈빈으로 바꾸지 않고 <b>27</b>을 그대로 식에 넣으면 결과는?',
          setup() { S.lock = true; S.gate = ''; setMode('calc'); },
          choices: ['거의 같아요 (약 1 % 차이)', '약 11배나 틀려요 (300 / 27)', '정확히 2배 틀려요', '단위만 바뀌고 값은 같아요'],
          answer: 1,
          feedback: ['27과 300은 완전히 다른 값이에요. 차이가 아주 커요.', '', '비율은 300 / 27 ≈ 11이에요.', 'T가 달라지면 n이나 V의 계산값이 달라져요.'],
          explain: '27 °C는 300 K이에요. 27을 그대로 쓰면 T가 300 대신 27이 되어 구한 값이 <b>300/27 ≈ 11배</b> 틀려요. 기체의 법칙에서는 항상 <b>켈빈 온도</b>를 써요.',
        },
      ],
    },
    {
      title: '실험 설계: 몰질량을 재려면?', short: '실험 설계', icon: '📐', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> PV = nRT로 n, P, V를 구했어요. 이제 식을 <b>거꾸로</b> 써서 기체의 종류를 알아내는 실험을 설계해요.</div>' +
        '<p>기체의 종류는 <b>몰질량 M</b>(g/mol)으로 알 수 있어요. M = 질량 / 몰수이고 몰수는 n = PV/RT이므로 <b>M = wRT / (PV)</b>예요. 이 식에 들어가는 양만 측정하면 돼요.</p>' +
        '<p class="ctrl-note">🥽 실제 실험에서는 보안경을 쓰고, 밀폐한 용기를 가열하지 않아요. 남은 기체와 시약은 교사의 안내에 따라 처리해요.</p>',
      features: ['design'],
      setup() { S.lock = false; S.gate = ''; S.des.meas = {}; S.des.parts = {}; S.des.msg = ''; S.des.anim = {}; S.des.formula = 0; setMode('design'); },
      recap: '몰질량 M = wRT / (PV)이므로 기체의 질량 w, 온도 T, 압력 P, 부피 V를 재요. 부피를 모르면 밀도 d로 M = dRT / P를 써요.',
      summary: '<ul><li>기체의 종류 확인 → <b>몰질량 M</b> 측정: <b>M = wRT / (PV)</b> (w: 질량 g)</li><li>필요한 측정 4가지: 질량 w(전자저울), 온도 T(온도계, K로 변환), 압력 P(압력계 · 기압), 부피 V(부피를 아는 플라스크)</li><li>밀도 d = w / V를 알면 <b>M = dRT / P</b></li><li>안전: 보안경, 밀폐 용기 가열 금지, 폐기물은 교사 안내에 따라 처리</li></ul>',
      missions: [
        {
          title: '꼭 필요한 측정과 장치 고르기', manual: true,
          goal: 'M = wRT/(PV)에 필요한 <b>측정 4가지</b>와 <b>장치 부품</b>을 카드에서 골라요. 필요 없는 것은 고르지 않아요. 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '식에 나오는 양만 재요: w, V, T, P. 부품은 부피를 아는 플라스크, 전자저울, 온도계, 압력계, 마개가 필요해요. 밀폐 용기는 가열하지 않아요.',
          setup() { S.lock = true; S.gate = ''; S.des.meas = {}; S.des.parts = {}; S.des.msg = ''; setMode('design'); },
          check() { const r = desCheck(); S.des.ok = r === true; S.des.msg = r === true ? '실험 설계가 알맞아요! 플라스크에 기체를 채워 질량 · 온도 · 압력을 재요.' : r; return r; },
          status: () => '측정 ' + MEAS.filter((m) => S.des.meas[m.id]).length + '개 · 부품 ' + PARTS.filter((m) => S.des.parts[m.id]).length + '개 선택',
          explain: 'M = wRT/(PV)에는 <b>질량 w, 온도 T, 압력 P, 부피 V</b>가 들어가요. 색깔이나 측정 시각은 필요 없고, 분자 수는 직접 셀 수 없어요. 장치는 <b>부피를 아는 플라스크 + 마개 + 전자저울 + 온도계 + 압력계</b>가 필요해요.',
        },
        {
          type: 'quiz', title: '부피를 모를 때',
          goal: '플라스크의 부피를 정확히 모를 때, 기체의 <b>밀도 d</b>(g/L)를 알면 몰질량을 구할 수 있어요. 어떤 식일까요?',
          setup() { S.lock = true; S.gate = ''; setMode('design'); },
          choices: ['M = d / (RT)', 'M = dRT / P', 'M = dP / (RT)', 'M = d × T × P'],
          answer: 1,
          feedback: ['단위를 확인해 봐요. M = wRT/(PV)에서 w/V = d를 넣으면 어떤 식이 되나요?', '', 'P가 분모에 와야 해요. M = (w/V) × RT/P이에요.', 'R가 빠졌고 P는 분모에 있어야 해요.'],
          explain: 'M = wRT/(PV)에서 w/V = d이므로 <b>M = dRT / P</b>예요. 부피를 몰라도 밀도 d를 알면 몰질량을 구할 수 있어요. (예: CO₂ 밀도 1.80 g/L → M = 1.80 × 0.082 × 300 / 1.0 = 44)',
        },
      ],
    },
    {
      title: '기체 확인: 몰질량으로 정체 밝히기', short: '기체 확인', icon: '🔬', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> M = wRT/(PV)로 몰질량을 재는 실험을 설계했어요. 이제 가상 실험대에서 <b>미지 기체 A · B · C</b>를 확인해요.</div>' +
        '<p>세 플라스크는 모두 <b>0.500 L, 27 °C(300 K), 1.00 atm</b>이에요. 질량 w를 재서 M을 계산하고 후보 카드와 맞춰 봐요. 몰질량이 같은 후보가 둘이면 <b>보조 시험</b>으로 구별해요. 저울 값은 빈 플라스크의 질량을 뺀 기체의 질량이에요.</p>',
      features: ['ident'],
      setup() { S.lock = false; S.gate = ''; identReset(); setMode('ident'); },
      recap: '질량 w로 M = wRT/(PV)를 계산하면 기체의 후보를 줄일 수 있어요. 몰질량이 같은 기체는 몰질량만으로 구별할 수 없어서 보조 시험이 필요해요.',
      summary: '<ul><li>0.500 L, 27 °C, 1.00 atm: A 0.88 g → M = <b>43.3 ≈ 44</b>, B 0.33 g → <b>16.2 ≈ 16</b>(CH₄), C 0.040 g → <b>1.97 ≈ 2</b>(H₂)</li><li>M = 44는 CO₂와 N₂O 둘 다 가능 → 석회수가 뿌옇게 흐려지고 불꽃이 꺼지면 <b>CO₂</b>. <b>M이 같다고 같은 물질은 아니에요.</b></li><li>오차 요인: 온도 읽기(±1 °C → M ±0.3 %), 부피 눈금, 부력 보정, 남은 공기와 섞임, 압력 가정</li></ul>',
      missions: [
        {
          title: '기체 A · B · C 확인하기',
          goal: '세 기체의 <b>질량을 재고</b> M을 계산해 쓴 뒤, 알맞은 <b>후보 카드</b>를 눌러 정체를 밝혀요. A는 <b>보조 시험</b>이 필요해요.',
          hint: 'M = wRT/(PV): w × 0.082 × 300 / (1.00 × 0.500). 소수 첫째 자리까지 쓰면 돼요. A는 몰질량이 같은 후보가 둘이니 🧪 석회수 시험을 해 봐요.',
          setup() { S.lock = true; S.gate = ''; identReset(); setMode('ident'); },
          check: () => identAll(), hold: 0.6,
          status: () => 'A ' + mark(S.id.ident.A) + ' B ' + mark(S.id.ident.B) + ' C ' + mark(S.id.ident.C),
          explain: 'A: M = 0.88 × 0.082 × 300 / 0.500 = 43.3 ≈ 44 → CO₂ 또는 N₂O, 석회수 시험에서 흐려져 <b>CO₂</b>. B: 16.2 → <b>CH₄</b>. C: 1.97 → <b>H₂</b>. 같은 부피 · 온도 · 압력에서 분자 수는 같으니 질량 차이는 분자 하나의 질량 차이예요.',
        },
        {
          title: '온도계가 5 °C 틀리면?', manual: true,
          goal: '기체 A를 잴 때 온도계를 <b>+5 °C 높게</b> 읽으면 구한 M이 <b>약 몇 %</b> 달라질까요? 단추로 확인하고 쓴 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: 'M은 T에 비례해요. 300 K에서 305 K로 5 K 커졌으니 (305 − 300) / 300 × 100 이에요. 소수 첫째 자리까지.',
          setup() { S.lock = true; S.gate = 'err'; S.id.gas = 'A'; S.id.w.A = GASES.A.w; S.id.wShow.A = GASES.A.w; S.id.err = 0; S.id.errUsed = false; S.id.errOk = false; $('#inE').value = ''; $('#inE').classList.remove('ok', 'bad'); updateCtl(); setMode('ident'); },
          check() {
            if (!S.id.errUsed) return '먼저 온도계 읽기에서 "+5 °C 높게"를 눌러 M이 어떻게 달라지는지 봐요.';
            if (isNaN(parseNum($('#inE').value))) return '달라지는 비율(%)을 숫자로 써 주세요.';
            if (!S.id.errOk) return '다시 계산해 봐요. M은 T에 비례하므로 5 / 300 × 100 이에요.';
            return true;
          },
          status: () => '단추 확인 ' + mark(S.id.errUsed) + ' &nbsp; 비율 ' + mark(S.id.errOk),
          explain: 'M = wRT/(PV)는 T에 비례해서 T를 5 K 틀리게 읽으면 M이 5/300 ≈ <b>1.7 %</b> 달라져요(43.3 → 44.0). 온도 ±1 °C는 약 ±0.3 %예요. 작은 오차지만 44 근처에서는 CO₂ 판정을 바꾸지 않아요.',
        },
        {
          type: 'quiz', title: '몰질량이 같은 두 기체',
          goal: 'CO₂와 N₂O는 몰질량이 같아요(44). 두 기체를 구별하려면?',
          setup() { S.lock = true; S.gate = ''; setMode('ident'); },
          choices: ['몰질량이 같으니 같은 물질이에요', '석회수 반응이나 불꽃 시험 같은 보조 시험을 해요', '질량을 더 정확히 재면 돼요', '압력을 높여서 몰질량을 바꿔요'],
          answer: 1,
          feedback: ['몰질량이 같아도 화학식이 다르면 다른 물질이에요. 성질이 달라요.', '', '몰질량 자체가 같아서 아무리 정확히 재도 구별되지 않아요.', '몰질량은 물질의 고유한 값이라 압력으로 바뀌지 않아요.'],
          explain: '몰질량은 <b>후보를 줄이는 단서</b>일 뿐이에요. CO₂는 석회수를 뿌옇게 하고 불꽃을 꺼요. N₂O는 그렇지 않아요. 몰질량이 같다고 같은 물질은 아니에요.',
        },
      ],
    },
    {
      title: '근사의 한계: 쓰임과 한계', short: '근사의 한계', icon: '📉', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 이상 기체 방정식으로 몰질량까지 구했어요. 이 식을 <b>생활에 적용</b>하고, 어떤 조건에서 <b>근사</b>가 어긋나는지도 살펴봐요.</div>' +
        '<p>① <b>에어백</b>이 부푸는 부피를 계산하고, ② 풍선이 올라가면 부피가 커지는 것을 보고, ③ 실제 기체(CO₂)가 <b>고압 · 저온</b>에서 이상 기체에서 벗어나는 모습을 그래프로 봐요.</p>',
      features: ['limit'],
      setup() { S.lock = false; S.gate = ''; S.sub.limit = 'bag'; limitReset(); setMode('limit'); },
      recap: '이상 기체 방정식은 일상 조건(1 atm 근처)에서 충분히 잘 맞는 근사예요. 분자 부피와 분자 사이의 인력 때문에 고압 · 저온에서는 실제 기체가 이상 기체에서 벗어나요.',
      summary: '<ul><li>에어백: NaN₃ 65 g(1 mol) → N₂ 1.5 mol → 27 °C, 1 atm에서 V = 1.5 × 0.082 × 300 / 1 = <b>36.9 ≈ 37 L</b></li><li>풍선: n, T 일정이면 V = nRT/P → 외부 압력이 작아지면 부피가 커져요(터질 수 있어요).</li><li>실제 기체는 <b>PV/nRT ≈ 1</b>이면 이상적. CO₂ 25 °C에서 1 atm ≈ 0.99, 50 atm에서는 크게 줄어요 (분자 자신의 부피와 분자 사이의 인력).</li><li>이상 기체에 가장 가까운 조건: <b>고온 · 저압</b></li></ul>',
      missions: [
        {
          title: '에어백이 부푸는 부피 구하기',
          goal: 'NaN₃ 65 g에서 생긴 질소 <b>1.5 mol</b>의 부피를 27 °C, 1 atm에서 계산해 쓰고 <b>💥 점화</b>를 눌러요.',
          hint: 'V = nRT / P = 1.5 × 0.082 × 300 / 1.00. 온도는 이미 켈빈으로 바꿔요(27 °C = 300 K). 소수 첫째 자리까지.',
          setup() { S.lock = true; S.gate = ''; S.sub.limit = 'bag'; limitReset(); setMode('limit'); },
          check: () => S.lim.bagOk && S.lim.fired, hold: 0.8,
          status: () => '계산 ' + mark(S.lim.bagOk) + ' &nbsp; 점화 ' + mark(S.lim.fired),
          explain: 'V = nRT/P = 1.5 × 0.082 × 300 / 1.00 = <b>36.9 ≈ 37 L</b>예요. 작은 알약 같은 고체 65 g이 순식간에 약 37 L의 질소 기체가 돼 에어백을 부풀려요.',
        },
        {
          title: '고압에서 이상 기체와 비교하기',
          goal: '<b>실제 기체</b> 화면에서 CO₂의 압력을 <b>50 atm</b>까지 올려 25 °C와 100 °C의 PV/nRT를 비교해요.',
          hint: '아래 탭에서 "실제 기체"를 고르고 압력을 50 atm으로 올려요. 25 °C와 100 °C 두 온도에서 모두 확인해요. 이상 기체는 1.0이에요.',
          setup() { S.lock = true; S.gate = ''; S.sub.limit = 'real'; S.lim.zP = 1; S.lim.zT = 25; S.lim.zMax = { 25: 1, 100: 1 }; setMode('limit'); },
          check: () => S.lim.zMax[25] >= 50 && S.lim.zMax[100] >= 50, hold: 0.5,
          status: () => '25 °C 50 atm ' + mark(S.lim.zMax[25] >= 50) + ' &nbsp; 100 °C 50 atm ' + mark(S.lim.zMax[100] >= 50) + ' &nbsp; 지금 ' + f2(zAt(S.lim.zT === 25 ? Z25 : Z100, S.lim.zP)),
          explain: 'CO₂의 PV/nRT는 25 °C에서 1 atm 약 0.99, 50 atm에서 약 0.60이에요. 100 °C에서는 50 atm에서도 약 0.86으로 이상 기체에 더 가까워요. 고압 · 저온일수록 분자 부피와 분자 사이의 인력이 중요해져요.',
        },
        {
          type: 'quiz', title: '이상 기체 방정식이 잘 맞는 조건',
          goal: '실제 기체가 이상 기체 방정식에 <b>가장 잘 맞는</b> 조건은?',
          setup() { S.lock = true; S.gate = ''; S.sub.limit = 'real'; setMode('limit'); },
          choices: ['저온 · 고압', '고온 · 저압', '저온 · 저압', '고온 · 고압'],
          answer: 1,
          feedback: ['저온 · 고압에서는 분자 사이가 가까워져 인력과 분자 부피를 무시할 수 없어요.', '', '저온에서는 분자 사이의 인력이 상대적으로 커져요.', '고압에서는 분자 사이가 가까워져 부피 효과가 커져요.'],
          explain: '<b>고온 · 저압</b>에서는 분자가 빠르고 서로 멀어서, 분자 자신의 부피와 분자 사이의 인력을 무시해도 돼요. 일상 조건(1 atm 부근)에서는 이상 기체 방정식으로 충분히 계산할 수 있어요.',
        },
      ],
    },
  ];
  function identReset() {
    const s = S.id; s.gas = 'A'; s.w = {}; s.wShow = {}; s.mTyped = {}; s.mok = {}; s.test = { A: {}, B: {}, C: {} }; s.ident = {}; s.err = 0; s.errUsed = false; s.errOk = false; s.msg = ''; s.tube = { gas: 'A', kind: '', t0: -9 };
    $('#inM').value = ''; $('#inM').classList.remove('ok', 'bad'); updateCtl();
  }

  game = SciSim.game({
    simId: 'hx-ideal-gas', mount: '#game', badge: '기체 계산 달인', homeHref: '../../index.html#hx',
    featureLabels: { calc: '🧮 PV = nRT 계산기', design: '📐 몰질량 실험 설계', ident: '🔬 미지 기체 확인', limit: '📉 에어백 · 실제 기체' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  calcSetProb(0);
  setMode('calc');
  const ALL_ANIM = ['flask', 'bal', 'therm', 'gauge', 'cork', 'syr', 'burn'];
  function stepAll1(dt) {
    const c = S.calc;
    if (isNaN(c.res)) { c.roll = 0; c.rollTo = NaN; }
    else {
      if (c.rollTo !== c.res) { c.rollFrom = c.roll; c.rollTo = c.res; c.rollT = 0; }
      c.rollT = Math.min(1, c.rollT + dt / 0.5); c.roll = lerp(c.rollFrom, c.rollTo, sm(RM ? 1 : c.rollT));
    }
    c.modelOn = SciSim.approach(c.modelOn, c.solved[c.prob] ? 1 : 0, dt, 5);
    const ms = PROBS[c.prob].state;
    MODEL_A.V = SciSim.approach(MODEL_A.V, c.solved[c.prob] ? ms.V : 12.3, dt, 7); MODEL_A.T = SciSim.approach(MODEL_A.T, ms.T, dt, 6);
    syncGas(modelGas, Math.round(ms.n / 0.05), PHONE ? 130 : 112, 100);
    stepGasRect(modelGas, dt, PHONE ? 130 : 112, Math.max(10, MODEL_A.V * ((RC.calc.R.h - 160) / 17)), spdOf(MODEL_A.T), 5);
    // 기체 확인
    const s = S.id;
    gasList.forEach((g, i) => { syncGas(flaskGas[i], 10, 0, 0, 28); stepGasCirc(flaskGas[i], dt, 46, spdOf(FLASK_T), 5); });
    gasList.forEach((g) => { if (s.w[g] != null) s.wShow[g] = SciSim.approach(s.wShow[g] || 0, s.w[g], dt, 7); });
    CAND.forEach((cd) => { const on = s.mok[s.gas] && idHL(s.gas)(cd.M); s.lift[cd.id] = SciSim.approach(s.lift[cd.id] || 0, on ? 1 : 0, dt, 9); if (s.cardShake[cd.id] > 0) s.cardShake[cd.id] -= dt; });
    // 설계
    ALL_ANIM.forEach((id) => { const on = !!S.des.parts[id]; S.des.anim[id] = SciSim.approach(S.des.anim[id] || 0, on ? 1 : 0, dt, 9); });
    const allMeas = MEAS.filter((m) => m.need).every((m) => S.des.meas[m.id]) && !MEAS.some((m) => !m.need && S.des.meas[m.id]);
    S.des.formula = SciSim.approach(S.des.formula, allMeas ? 1 : 0.0, dt, 6);
    // 근사의 한계
    const lm = S.lim;
    const p = presAt(lm.alt), Vt = 24.6 / p;
    if (!lm.burst) { lm.balloonV = SciSim.approach(lm.balloonV, Math.min(Vt, 90), dt, 6); if (lm.balloonV > BURST_V) { lm.burst = true; lm.burstT = S.t; Sound.fail(); const L = RC.limit.L; parts.burst(PHONE ? L.x + L.w / 2 : L.x + 480, PHONE ? L.y + 280 : L.y + 250, { count: 26, speed: 220, size: 3.6, colors: ['#f59e0b', '#fff', '#e2464b'] }); } }
    else if (Vt <= BURST_V - 2) { lm.burst = false; lm.balloonV = Vt; }
    syncGas(balGas, 20, 0, 0, 40); stepGasCirc(balGas, dt, 56, spdOf(300), 4);
    syncGas(bagGas, 30, 0, 0, 20); stepGasCirc(bagGas, dt, Math.max(8, bagR(BAG_V) - 4), 220, 4);
    const nreal = Math.round(2 + lm.zP * 0.76); syncGas(realGas, nreal, 190, 190); stepGasRect(realGas, dt, 190, 190, spdOf(lm.zT + KEL), 5);
  }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if ((S.lock || S.gate) && game && game.phase !== 'active') { S.lock = false; S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'calc') drawCalc(t);
    else if (S.mode === 'design') drawDesign(t);
    else if (S.mode === 'ident') { T(14, 26, MODE_LABEL.ident, PHONE ? 15 : 17, INK, 'left', 800); drawIdentL(t); drawIdentR(t); }
    else drawLimit(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, PROBS, GASES, CAND, MEAS, PARTS, BAG_V, mRect, pRect, candRect, flaskPos, calcSetProb, setMode, selGas, desCheck, runTest, setAlt, setZP, limitReset, identReset, zAt, Z25, Z100,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
