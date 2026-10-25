/* =========================================================
   물질과 에너지 Ⅳ. 반응 속도 - 반응 속도의 표현 [12물에04-01]
   ① 실험: 센서 측정 (H₂O₂ 분해 O₂ 부피 → [H₂O₂] 표)
   ② 분석: 평균 속도(구간) → 순간 속도(접선)
   ③ 모형: 계수와 속도 (N₂ + 3H₂ → 2NH₃ 입자 모형)
   ④ 적용: 측정 설계 (반응마다 알맞은 센서·시간 간격)
   미분 표기, 적분 속도식, 속도식(다음 차시)은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 960 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4', SKY = '#0ea5e9', TEAL = '#0d9488';
  const BG = '#f3f0fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  const HALO = { stroke: 'rgba(255,255,255,.92)', strokeWidth: 3 };
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
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const f3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
  const f4 = (v) => (Math.round(v * 10000) / 10000).toFixed(4);
  const f0 = (v) => String(Math.round(v));
  const MINUS = '−';
  const sg = (v, fn) => (v < 0 ? MINUS : v > 0 ? '+' : '') + fn(Math.abs(v));
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const SUPM = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parseNum(s) {                                  // 0.0080, 8.0e-3, 8.0×10⁻³, −5.0 모두 읽어요
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + m.split('').map((c) => SUPM[c]).join(''))
      .replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([+-]?[0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  /* 속도 입력은 10⁻³ M/s 단위로 읽어요. 0.0080 처럼 M/s 로 적어도 같은 값으로 읽어요. */
  function rateIn(s) { const n = parseNum(s); if (isNaN(n)) return NaN; return Math.abs(n) > 0 && Math.abs(n) < 0.1 ? n * 1000 : n; }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;

  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { sense: '🧪 센서로 H₂O₂ 분해를 재요', avg: '📏 구간마다 평균 속도를 구해요', zoom: '🔍 구간을 줄이면 순간 속도에 가까워져요', coef: '⚗️ 계수에 따라 물질마다 변화율이 달라요', design: '📟 반응마다 알맞은 센서를 골라요' };

  /* ================= 자료 ================= */
  /* 2H₂O₂(aq) → 2H₂O(l) + O₂(g), 100 mL, 25 °C. [H₂O₂] (M) */
  const TS = [0, 20, 40, 60, 80, 100];
  const CT = [0.80, 0.64, 0.51, 0.41, 0.33, 0.26];
  const KK = -Math.log(0.8) / 20;                                       // 접선 기울기를 만들 때만 써요 (화면에는 나오지 않아요)
  const SLN = TS.map((t) => KK * 0.8 * Math.pow(0.8, t / 20));          // 각 표 점에서의 순간 속도 (M/s)
  /* 표의 점을 지나는 매끈한 곡선 (3차 에르미트): 기울기는 표 점에서의 순간 속도 */
  function cAt(t) {
    t = clamp(t, 0, 100); const i = clamp(Math.floor(t / 20), 0, 4), u = (t - TS[i]) / 20, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * CT[i] + (u3 - 2 * u2 + u) * 20 * (-SLN[i]) + (-2 * u3 + 3 * u2) * CT[i + 1] + (u3 - u2) * 20 * (-SLN[i + 1]);
  }
  function rateAt(t) {                                                   // 순간 속도 = −접선의 기울기 (M/s)
    t = clamp(t, 0, 100); const i = clamp(Math.floor(t / 20), 0, 4), u = (t - TS[i]) / 20, u2 = u * u;
    const d = (6 * u2 - 6 * u) * CT[i] + (3 * u2 - 4 * u + 1) * 20 * (-SLN[i]) + (-6 * u2 + 6 * u) * CT[i + 1] + (3 * u2 - 2 * u) * 20 * (-SLN[i + 1]);
    return -d / 20;
  }
  const avgRate = (ta, tb) => (cAt(ta) - cAt(tb)) / (tb - ta);           // 평균 속도 (M/s)
  const AVG = [0, 1, 2, 3, 4].map((i) => (CT[i] - CT[i + 1]) / 20);        // 표로 구한 5구간 평균 속도
  const VOLK = 0.100 / 2 * 24.5 * 1000;                                   // mL per (M decrease): 0.1 L × (1/2) × 24.5 L/mol
  const volAt = (t) => (CT[0] - cAt(t)) * VOLK;                           // O₂ 부피 (mL)
  const volShown = (k) => Math.round((CT[0] - CT[k]) * VOLK);             // 표에 적히는 부피 (mL)
  const concFromV = (vmL) => CT[0] - (2 * (vmL / 1000) / 24.5) / 0.100;   // 표에 적힌 부피로 되돌린 농도
  const VMAX = 700, TSPD = 8;

  /* 측정 설계 자료 */
  const SENS = [
    { k: 'gas', name: '기체 압력·부피', ic: '🧯' },
    { k: 'abs', name: '흡광도(색도)', ic: '🌈' },
    { k: 'ph', name: 'pH', ic: '🧪' },
    { k: 'cond', name: '전도도', ic: '⚡' },
    { k: 'mass', name: '질량(전자저울)', ic: '⚖️' },
  ];
  const INTV = [{ s: 1, t: '1 s' }, { s: 10, t: '10 s' }, { s: 60, t: '1 min' }, { s: 600, t: '10 min' }];
  const RXN = [
    { k: 'h2o2', name: 'H₂O₂ 분해', eq: '2H₂O₂(aq) → 2H₂O(l) + O₂(g)', note: 'KI 소량, 닫힌 플라스크에서 O₂ 가 발생해요', dur: 200, sens: ['gas'],
      why: ['O₂ 기체가 발생해 부피와 압력이 변해요', '용액의 색이 점점 진해져요', '용액의 질량이 점점 늘어나요'], wa: 0,
      sf: { abs: 'H₂O₂ 수용액은 무색이라 빛 흡수가 변하지 않아요.', ph: 'H₂O₂ 분해에서는 H⁺ 나 OH⁻ 가 거의 변하지 않아요.', cond: '이온의 수가 거의 변하지 않아요.', mass: '닫힌 플라스크에서는 기체가 빠져나가지 않아 질량이 변하지 않아요.' } },
    { k: 'mg', name: 'Mg + HCl', eq: 'Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂(g)', note: '닫힌 용기에서 H₂ 기체가 발생해요', dur: 30, sens: ['gas'],
      why: ['H₂ 기체가 발생해 부피와 압력이 늘어요', 'Mg 이 녹으면서 용액이 짙은 색이 돼요', 'H₂ 기체가 용기 안에 쌓여 질량이 늘어나요'], wa: 0,
      sf: { abs: 'MgCl₂ 수용액과 HCl 은 무색이라 흡광도가 변하지 않아요.', ph: 'H⁺ 가 줄어 pH 도 변하지만, 기체 발생을 바로 읽는 기체 센서가 더 간단해요.', cond: '이온 수 변화가 작아 H₂ 발생을 재는 것보다 불편해요.', mass: '닫힌 용기에서는 질량이 변하지 않아요.' } },
    { k: 'caco3', name: 'CaCO₃ + HCl', eq: 'CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + H₂O(l) + CO₂(g)', note: '뚜껑이 열린 플라스크를 전자저울 위에 올려요', dur: 600, sens: ['mass'],
      why: ['CO₂ 기체가 빠져나가 용기의 질량이 줄어요', '용액의 색이 변해요', 'CO₂ 가 모두 녹아 질량이 늘어나요'], wa: 0,
      sf: { gas: '뚜껑이 열려 있어 CO₂ 가 빠져나가므로 압력·부피를 재기 어려워요.', abs: 'CaCl₂ 수용액은 무색이라 흡광도가 변하지 않아요.', ph: 'HCl 이 소모되어 pH 가 변하지만, 질량 감소를 재는 것이 더 간단해요.', cond: '이온 수 변화는 있지만, 질량 감소를 재는 것이 더 간단해요.' } },
    { k: 'i2', name: 'I₂ 소모 반응', eq: 'I₂ 가 소모되는 반응 (예: 아세톤 + I₂, 산 촉매)', note: 'I₂ 용액은 갈색이고, 반응하면 색이 옅어져요', dur: 1800, sens: ['abs'],
      why: ['I₂ 는 갈색이라 농도가 줄면 빛 흡수가 줄어요', '기체가 발생해 부피가 늘어요', '용액의 질량이 눈에 띄게 줄어요'], wa: 0,
      sf: { gas: '기체가 발생하지 않아요.', ph: 'I₂ 의 농도 변화를 pH 로 재기는 어려워요.', cond: 'I₂ 는 이온이 아니라 분자라서 전도도로 재기 어려워요.', mass: '기체가 빠져나가지 않아 질량이 거의 변하지 않아요.' } },
    { k: 'neut', name: '중화 반응', eq: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)', note: '산 용액에 염기 용액을 일정하게 떨어뜨려요', dur: 300, sens: ['ph', 'cond'],
      why: ['산과 염기가 소모되어 pH 와 이온의 수가 변해요', '용액이 갈색에서 무색으로 변해요', '기체가 발생해 부피가 늘어요'], wa: 0,
      sf: { gas: '기체가 발생하지 않아요.', abs: '용액이 무색이라 빛 흡수가 변하지 않아요.', mass: '기체가 빠져나가지 않아 질량이 변하지 않아요.' } },
  ];
  /* 알맞은 까닭의 위치를 반응마다 다르게 */
  const placeW = (arr, a, pos) => { const rest = arr.filter((_, i) => i !== a); rest.splice(pos, 0, arr[a]); return rest; };
  [1, 2, 0, 2, 1].forEach((pos, i) => { RXN[i].why = placeW(RXN[i].why, RXN[i].wa, pos); RXN[i].wa = pos; });
  const pts = (r, iv) => RXN[r].dur / INTV[iv].s;
  const intvOk = (r, iv) => { const p = pts(r, iv); return p >= 8 && p <= 100; };

  /* ---------- 상태 ---------- */
  const NP = 0.0050;                                       // 입자 하나가 나타내는 농도 (M), 반응기 1.0 L
  const S = {
    mode: 'sense', fade: 0, lock: false, t: 0,
    se: { phase: 'idle', t: 0, done: false, rows: 0, inp: ['', '', '', ''], ok: [false, false, false, false], flash: 0, bub: 0 },
    av: { sel: 0, inp: ['', '', '', '', ''], ok: [false, false, false, false, false], bar: [0, 0, 0, 0, 0], pulse: 1 },
    zm: { t0: 0, di: 0, dk: 40, tan: false, in0: '', in60: '', ok0: false, ok60: false, pulse: 1, seen: { 0: true } },
    co: { phase: 'idle', t: 0, P: [], ev: [], inV: '', okV: false, stage: 'obs', cin: ['', '', ''], cok: [false, false, false], ring: [], seed: 1 },
    de: { sel: 0, safe: [false, false, false], ch: RXN.map(() => ({ s: -1, i: -1, w: -1, done: false, bad: {} })), trace: 0, msg: '' },
  };
  let game = null;
  const DT = [40, 20, 10, 5, 2, 1, 0.5];
  const fdt = (d) => (Math.abs(d - Math.round(d)) < 0.05 ? f0(d) : f1(d));

  /* ================= 그래프: 시간–농도 ================= */
  const PB = () => { const L = RC.L; return { x: L.x + 58, y: L.y + 70, w: L.w - 84, h: 286 }; };
  const GX = (t) => { const p = PB(); return p.x + t / 100 * p.w; };
  const GY = (c) => { const p = PB(); return p.y + p.h - c / 1.0 * p.h; };
  function axesCT(p) {
    ctx.fillStyle = '#fbfdff'; D.roundRect(p.x, p.y, p.w, p.h, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let c = 0; c <= 1.0001; c += 0.2) { ctx.beginPath(); ctx.moveTo(p.x, GY(c)); ctx.lineTo(p.x + p.w, GY(c)); ctx.stroke(); T(p.x - 7, GY(c) + 4, f1(c), 12.5, MUTED, 'right', 700); }
    for (let t = 0; t <= 100; t += 20) { ctx.beginPath(); ctx.moveTo(GX(t), p.y); ctx.lineTo(GX(t), p.y + p.h); ctx.stroke(); T(GX(t), p.y + p.h + 17, String(t), 12.5, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h); ctx.stroke();
    T(p.x + p.w, p.y + p.h + 35, '시간 t (s) →', 12.5, MUTED, 'right', 800); T(p.x - 8, p.y - 9, '[H₂O₂] (M)', 12.5, MUTED, 'left', 800);
  }
  function curveCT(p, tEnd) {
    ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y - 4, p.w, p.h + 8); ctx.clip();
    ctx.strokeStyle = PUR; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let t = 0; t <= tEnd + 1e-6; t += 1) { const x = GX(t), y = GY(cAt(t)); t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  function nodesCT(labels) {
    TS.forEach((t, i) => {
      D.sphere(GX(t), GY(CT[i]), 5.2, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.4 });
      if (labels) { if (i === 0) T(GX(t) + 2, GY(CT[i]) - 11, f2(CT[i]), 12.5, INK, 'center', 800, HALO); else T(GX(t) - 8, GY(CT[i]) + 19, f2(CT[i]), 12.5, INK, 'right', 800, HALO); }
    });
  }
  /* 구간 (ta → tb): 삼각형 + 시컨트 */
  function chordCT(ta, tb, a) {
    a = a || {};
    const p = PB(), xa = GX(ta), ya = GY(cAt(ta)), xb = GX(tb), yb = GY(cAt(tb)), col = a.color || AMB, tri = a.tri !== false;
    ctx.save();
    if (tri) { ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.setLineDash([]); }
    ctx.strokeStyle = col; ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.restore();
    D.sphere(xa, ya, 5, col, { gloss: false }); D.sphere(xb, yb, 5, col, { gloss: false });
    if (a.labels !== false && tri) {
      if (xb - xa > 44) T((xa + xb) / 2 + 10, ya - 8, 'Δt = ' + f0(tb - ta) + ' s', 13, col, 'center', 800, HALO);
      const dc = cAt(tb) - cAt(ta);
      T(Math.min((xa + xb) / 2 + 22, p.x + p.w - 44), ya - 27, 'Δc = ' + MINUS + f2(-dc) + ' M', 13, col, 'center', 800, HALO);
    }
  }
  /* 접선 (t0 에서) + 삼각형(가로 40 s) */
  function tangentCT(t0, tri) {
    const p = PB(), c0 = cAt(t0), s = rateAt(t0);
    ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
    ctx.strokeStyle = TEAL; ctx.lineWidth = 3; ctx.setLineDash([9, 5]);
    // 접선: c = c0 − s (t − t0)
    const yAt = (t) => GY(c0 - s * (t - t0));
    ctx.beginPath(); ctx.moveTo(GX(t0 - 30), yAt(t0 - 30)); ctx.lineTo(GX(t0 + 110), yAt(t0 + 110)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    D.sphere(GX(t0), GY(c0), 5.5, TEAL, { gloss: false });
    if (tri) {
      const run = 40, rise = s * run, xa = GX(t0), xb = GX(t0 + run), ya = GY(c0), yb = GY(c0 - rise);
      ctx.save(); ctx.strokeStyle = TEAL; ctx.lineWidth = 1.8; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.restore();
      T((xa + xb) / 2, ya - 8, 'Δt = ' + f0(run) + ' s', 13, TEAL, 'center', 800, HALO);
      T((xa + xb) / 2, ya - 27, 'Δc = ' + MINUS + f3(rise) + ' M', 13, TEAL, 'center', 800, HALO);
    }
  }

  /* ================= ① 센서 측정 ================= */
  const SE = () => S.se;
  const seT = () => (SE().phase === 'idle' ? 0 : SE().t);
  function runSense() {
    const E = SE(); if (E.phase === 'run') return;
    E.phase = 'run'; E.t = 0; E.rows = 0; E.done = false; E.inp = ['', '', '', '']; E.ok = [false, false, false, false]; clearConv(); Sound.click(); updateCtl();
  }
  function stepSense(dt) {
    const E = SE(); if (E.flash > 0) E.flash = Math.max(0, E.flash - dt * 1.5);
    if (E.phase !== 'run') return;
    E.t = Math.min(100, E.t + dt * TSPD * (RM ? 2 : 1));
    const rows = Math.min(6, Math.floor(E.t / 20 + 1e-9) + 1);
    if (rows > E.rows) { E.rows = rows; if (rows > 1) Sound.tick(); }
    // 기포
    if (!RM) { E.bub += dt * (6 + rateAt(E.t) * 2200); while (E.bub >= 1) { E.bub -= 1; const g = SG(); parts.emit({ x: g.fx + rnd(-34, 34), y: g.fy - 26, vx: rnd(-6, 6), vy: -rnd(34, 58), life: 1.0, size: rnd(2.6, 4.4), color: 'rgba(255,255,255,.9)', shape: 'bubble', fade: true }); } }
    if (E.t >= 100) { E.phase = 'done'; E.done = true; E.rows = 6; E.flash = 1; Sound.success(); updateCtl(); }
  }
  const SG = () => { const L = RC.L; return { fx: L.x + 92, fy: L.y + 236, fw: 128, fh: 140, sx: L.x + 232, sy: L.y + 82, sl: 176 }; };
  function drawSense(t) {
    const L = RC.L, E = SE(), g = SG(), tt = seT(), c = cAt(tt), v = volAt(tt), rate = E.phase === 'run' ? rateAt(tt) : 0;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 H₂O₂ 분해와 기체 부피 센서', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '2H₂O₂(aq) → 2H₂O(l) + O₂(g) · KI 소량 · 100 mL · 25 °C', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 플라스크
    D.flask(g.fx, g.fy, g.fw, g.fh, { level: 0.42, liquid: C.mix('#cfe6ff', '#fff3c9', 0.35), t });
    // H2O2 분자(점): 농도에 비례해서 사라져요
    const nDots = 34, shown = c / 0.80 * nDots;
    for (let i = 0; i < nDots; i++) {
      const a = clamp(shown - i, 0, 1); if (a <= 0.01) continue;
      const lvlTop = g.fy - (g.fh - g.fh * 0.32) * 0.42, hx = g.fx - g.fw * 0.36 + hash(i, 3) * g.fw * 0.72, hy = lvlTop + 12 + hash(i, 7) * (g.fy - lvlTop - 22);
      const w = g.fw * 0.5 * (1 - (g.fy - hy) / (g.fh * 0.7)) ; const lim = (g.fw / 2 - 14) * clamp(0.55 + (hy - lvlTop) / (g.fy - lvlTop) * 0.45, 0.45, 1);
      const px = g.fx + clamp(hx - g.fx, -lim, lim) + Math.sin(t * 1.6 + i) * 2;
      ctx.globalAlpha = a; D.sphere(px, hy + Math.cos(t * 1.3 + i * 2) * 2, 3.6, '#4a7bf0', { gloss: false }); ctx.globalAlpha = 1;
    }
    // 마개와 관
    const nx = g.fx, ntop = g.fy - g.fh - 2;
    D.roundRect(nx - 14, ntop - 4, 28, 12, 3); ctx.fillStyle = '#c9a36a'; ctx.fill(); ctx.strokeStyle = '#9b7a45'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = '#9fb2c9'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(nx, ntop - 2); ctx.lineTo(nx, g.sy); ctx.lineTo(g.sx, g.sy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx, ntop - 2); ctx.lineTo(nx, g.sy); ctx.lineTo(g.sx, g.sy); ctx.stroke();
    // 관 속 기체 흐름 점
    if (rate > 0 && !RM) { for (let k = 0; k < 7; k++) { const u = (t * 1.1 * (0.4 + rate * 90) + k / 7) % 1; const len1 = (g.sy < ntop ? ntop - g.sy : 0), tot = len1 + (g.sx - nx), d = u * tot; const px = d < len1 ? nx : nx + (d - len1), py = d < len1 ? ntop - d : g.sy; ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill(); } }
    // 주사기
    const sx = g.sx, sy = g.sy, sl = g.sl, sh = 34, pv = clamp(v, 0, VMAX) / VMAX * (sl - 12);
    D.shadow(() => { D.roundRect(sx, sy - sh / 2, sl, sh, 6); ctx.fillStyle = 'rgba(240,247,255,.95)'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(sx, sy - sh / 2, sl, sh, 6); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.fillStyle = 'rgba(190,225,255,.55)'; D.roundRect(sx + 2, sy - sh / 2 + 2, pv + 6, sh - 4, 4); ctx.fill();    // 모인 O₂
    D.roundRect(sx + pv + 4, sy - sh / 2 + 1, 10, sh - 2, 3); ctx.fillStyle = '#8b97ab'; ctx.fill();                     // 피스톤
    ctx.strokeStyle = '#8b97ab'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx + pv + 14, sy); ctx.lineTo(sx + pv + 14 + 46, sy); ctx.stroke();
    D.roundRect(sx + pv + 14 + 44, sy - 11, 7, 22, 3); ctx.fillStyle = '#6a778c'; ctx.fill();
    ctx.strokeStyle = 'rgba(70,85,110,.65)'; ctx.lineWidth = 1.2;
    for (let q = 0; q <= 7; q++) { const tx = sx + 5 + q / 7 * (sl - 17); ctx.beginPath(); ctx.moveTo(tx, sy + sh / 2); ctx.lineTo(tx, sy + sh / 2 - (q % 2 === 0 ? 8 : 5)); ctx.stroke(); }
    [0, 2, 4, 6].forEach((q) => T(sx + 5 + q / 7 * (sl - 17), sy - sh / 2 - 6, String(q * 100), 12, MUTED, 'center', 700));
    T(sx + sl - 2, sy + sh / 2 + 16, 'mL', 12, MUTED, 'right', 800);
    // 센서 상자
    const bx = L.x + 262, by = L.y + 138, bw = 150, bh = 62;
    D.shadow(() => { D.roundRect(bx, by, bw, bh, 12); ctx.fillStyle = '#eef2fa'; ctx.fill(); }, { blur: 6, y: 2 }); D.roundRect(bx, by, bw, bh, 12); ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 1.5; ctx.stroke();
    T(bx + 10, by + 20, '📟 O₂ 부피 센서', 12.5, MUTED, 'left', 800);
    T(bx + 10, by + 48, 'V = ' + f0(v) + ' mL', 20, INK, 'left', 800);
    const on = E.phase === 'run'; ctx.fillStyle = on ? (Math.sin(t * 9) > 0 ? '#22c55e' : '#86efac') : E.done ? '#22c55e' : '#9aa6bb'; ctx.beginPath(); ctx.arc(bx + bw - 16, by + 17, 5.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = on ? '#22c55e' : '#9aa6bb'; ctx.lineWidth = 2.6; ctx.setLineDash(on ? [6, 5] : []); ctx.lineDashOffset = on ? -t * 30 : 0;
    ctx.beginPath(); ctx.moveTo(sx + sl / 2, sy + sh / 2); ctx.bezierCurveTo(sx + sl / 2, sy + sh / 2 + 36, bx + bw / 2, by - 30, bx + bw / 2, by); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // 시각 표시
    D.label(g.fx, g.fy + 24, 't = ' + f0(tt) + ' s', { size: 14, bg: on ? PUR : E.done ? GOOD : '#8a95a8', align: 'center' });
    // V–t 그래프
    const gx = L.x + 54, gy = L.y + 300, gw = L.w - 78, gh = 124;
    const X = (q) => gx + q / 100 * gw, Y = (q) => gy + gh - q / VMAX * gh;
    ctx.fillStyle = '#fbfdff'; D.roundRect(gx, gy, gw, gh, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let q = 0; q <= 600; q += 200) { ctx.beginPath(); ctx.moveTo(gx, Y(q)); ctx.lineTo(gx + gw, Y(q)); ctx.stroke(); T(gx - 7, Y(q) + 4, String(q), 12, MUTED, 'right', 700); }
    for (let q = 0; q <= 100; q += 20) { ctx.beginPath(); ctx.moveTo(X(q), gy); ctx.lineTo(X(q), gy + gh); ctx.stroke(); T(X(q), gy + gh + 16, String(q), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    T(gx + gw, gy + gh + 33, '시간 t (s) →', 12, MUTED, 'right', 800); T(gx - 6, gy - 7, 'O₂ 부피 V (mL)', 12, MUTED, 'left', 800);
    if (tt > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip(); ctx.strokeStyle = SKY; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let q = 0; q <= tt + 1e-6; q += 1) { const px = X(q), py = Y(volAt(q)); q === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); ctx.restore();
      D.sphere(X(tt), Y(v), 5, '#fff', { gloss: false, outline: SKY, outlineWidth: 2.6 });
    }
    const msg = E.phase === 'idle' ? '「측정 시작」을 누르면 O₂ 부피가 시간에 따라 기록돼요.' : E.phase === 'run' ? '그래프의 기울기(= 기체가 발생하는 빠르기)가 어떻게 변하는지 지켜봐요.' : '측정이 끝났어요. 오른쪽 표의 부피를 [H₂O₂] 로 바꿔 봐요.';
    textBlock(L.x + 14, L.y + 480, L.w - 28, msg, 13, INK, 18, 800);
    if (E.flash > 0) { ctx.fillStyle = 'rgba(20,160,88,' + (E.flash * 0.1) + ')'; D.roundRect(L.x, L.y, L.w, L.h, 14); ctx.fill(); }
  }
  function drawSenseInfo(t) {
    const R = RC.R, E = SE();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 측정 기록표', 14.5, INK, 'left', 800);
    const rh = PHONE ? 26 : 29, x0 = R.x + 10, ty = R.y + 38, cw = [R.w * 0.2, R.w * 0.36, R.w * 0.44].map((q) => q), W = R.w - 20;
    const cx = [x0, x0 + cw[0], x0 + cw[0] + cw[1]];
    D.roundRect(x0, ty, W, rh, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    T(cx[0] + cw[0] / 2, ty + rh / 2 + 5, 't (s)', 12.5, INK, 'center', 800); T(cx[1] + cw[1] / 2, ty + rh / 2 + 5, 'V (mL)', 12.5, INK, 'center', 800); T(cx[2] + cw[2] / 2, ty + rh / 2 + 5, '[H₂O₂] (M)', 12.5, INK, 'center', 800);
    for (let k = 0; k < 6; k++) {
      const y = ty + rh * (k + 1) + 2, shown = k < E.rows, active = E.phase === 'run' && k === E.rows - 1;
      D.roundRect(x0, y, W, rh - 3, 7); ctx.fillStyle = shown ? (active ? 'rgba(124,58,237,.12)' : '#fbfaff') : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = shown ? '#d9d0f5' : '#e6eaf2'; ctx.lineWidth = 1.2; ctx.stroke();
      T(cx[0] + cw[0] / 2, y + rh / 2 + 3, String(TS[k]), 13.5, shown ? INK : '#aab3c4', 'center', 800);
      T(cx[1] + cw[1] / 2, y + rh / 2 + 3, shown ? f0(volShown(k)) : '—', 13.5, shown ? SKY : '#aab3c4', 'center', 800);
      let ct = '—', col = '#aab3c4';
      if (shown) { if (k <= 1) { ct = f2(CT[k]); col = INK; } else if (E.ok[k - 2]) { ct = f2(CT[k]); col = GOOD; } else { ct = '?'; col = PUR; } }
      T(cx[2] + cw[2] / 2, y + rh / 2 + 3, ct, 13.5, col, 'center', 800);
    }
    // 풀이 예
    const by = ty + rh * 7 + 12;
    D.roundRect(R.x + 10, by, R.w - 20, R.y + R.h - by - 10, 10); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    let yy = by + 20;
    T(R.x + 20, yy, '💡 20 s 의 계산 예', 13, PUR, 'left', 800); yy += 6;
    const ex = ['V = 196 mL = 0.196 L', 'n(O₂) = 0.196 / 24.5 = 0.0080 mol', 'H₂O₂ 는 O₂ 의 2배: 0.016 mol 분해', '0.016 mol / 0.100 L = 0.16 M 감소', '[H₂O₂] = 0.80 − 0.16 = 0.64 M'];
    const show = PHONE ? 4 : 5;
    ex.slice(0, show).forEach((s, i) => T(R.x + 20, yy + 20 + i * 19, s, 12.5, i === ex.length - 1 ? GOOD : INK, 'left', 800));
  }

  /* ================= ② 평균 속도 ================= */
  const AV = () => S.av;
  function checkAvg() {
    const A = AV();
    for (let i = 0; i < 5; i++) {
      const was = A.ok[i], v = rateIn(A.inp[i]);
      A.ok[i] = A.inp[i] !== '' && near(v, AVG[i] * 1000, 0.06);
      if (A.ok[i] && !was) { A.sel = i; A.pulse = 0; Sound.success(); const L = RC.L; parts.burst(GX((TS[i] + TS[i + 1]) / 2), GY((CT[i] + CT[i + 1]) / 2) - 10, { count: 12, speed: 110, life: 0.6, size: 3.4 }); }
    }
  }
  const avgDone = () => AV().ok.filter(Boolean).length;
  function drawAvg(t) {
    const L = RC.L, A = AV(), p = PB(), i = A.sel, ta = TS[i], tb = TS[i + 1];
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '📏 농도–시간 그래프에서 구간을 골라요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, 'H₂O₂ 분해 · 점은 센서 자료 (소수 둘째 자리)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    axesCT(p); curveCT(p, 100);
    // 완성한 구간은 옅게
    for (let k = 0; k < 5; k++) if (A.ok[k] && k !== i) chordCT(TS[k], TS[k + 1], { color: 'rgba(217,119,6,.5)', labels: false, tri: false });
    chordCT(ta, tb, { color: AMB });
    nodesCT(true);
    const e = sm(A.pulse), ok = A.ok[i];
    const dc = CT[i] - CT[i + 1];
    const y0 = L.y + 416;
    D.roundRect(L.x + 12, y0 - 20, L.w - 24, 86, 12); ctx.fillStyle = ok ? 'rgba(20,160,88,.08)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = ok ? GOOD : '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    T(L.x + 24, y0 + 1, ta + '~' + tb + ' s 구간', 14, AMB, 'left', 800);
    T(L.x + 24, y0 + 25, '평균 속도 = −Δ[H₂O₂] / Δt', 14, INK, 'left', 800);
    T(L.x + 24, y0 + 49, ok ? '= ' + f2(dc) + ' M / ' + f0(tb - ta) + ' s = ' + f4(AVG[i]) + ' M/s' : '= (' + f2(CT[i]) + ' − ' + f2(CT[i + 1]) + ') M / ' + f0(tb - ta) + ' s  → 직접 계산해 봐요', 14, ok ? '#0f6b3c' : MUTED, 'left', 800);
    if (e < 1 && ok) { ctx.fillStyle = 'rgba(20,160,88,' + (0.12 * (1 - e)) + ')'; D.roundRect(L.x + 12, y0 - 20, L.w - 24, 86, 12); ctx.fill(); }
  }
  function drawAvgInfo(t) {
    const R = RC.R, A = AV();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📊 구간별 평균 속도 (10⁻³ M/s)', 14, INK, 'left', 800);
    const bx = R.x + 40, bw = R.w - 62, by = R.y + 62, bh = PHONE ? 190 : 250, vmax = 10;
    ctx.fillStyle = '#fbfdff'; D.roundRect(bx, by, bw, bh, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let v = 0; v <= 10; v += 2) { const y = by + bh - v / vmax * bh; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + bw, y); ctx.stroke(); T(bx - 6, y + 4, String(v), 12, MUTED, 'right', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.stroke();
    const slot = bw / 5, w = Math.min(34, slot * 0.6);
    for (let k = 0; k < 5; k++) {
      const tg = A.ok[k] ? AVG[k] * 1000 : 0; A.bar[k] = ap2(A.bar[k], tg, 0.016, 8);
      const h = clamp(A.bar[k], 0, vmax) / vmax * bh, x = bx + slot * k + (slot - w) / 2;
      if (h > 0.5) { D.roundRect(x, by + bh - h, w, h, 4); ctx.fillStyle = k === A.sel ? AMB : '#e8b063'; ctx.fill(); }
      if (A.ok[k]) T(x + w / 2, by + bh - h - 6, f1(AVG[k] * 1000), 12.5, INK, 'center', 800, HALO);
      else T(x + w / 2, by + bh - 8, '?', 14, '#9aa6bb', 'center', 800);
      T(bx + slot * k + slot / 2, by + bh + 16, TS[k] + '~' + TS[k + 1], 12, MUTED, 'center', 700);
    }
    T(bx + bw / 2, by + bh + 34, '시간 구간 (s)', 12, MUTED, 'center', 800);
    const y = by + bh + 52;
    const n = avgDone();
    textBlock(R.x + 14, y, R.w - 28, n === 5 ? '시간이 지날수록 평균 속도가 점점 작아져요. 반응물의 농도가 줄어들기 때문이에요.' : '구간마다 계산해서 입력하면 막대가 자라요. (' + n + ' / 5)', 12.5, n === 5 ? GOOD : MUTED, 17, 800);
  }

  /* ================= ② 순간 속도 ================= */
  const ZM = () => S.zm;
  function checkTan() {
    const Z = ZM(), a = Z.ok0, b = Z.ok60;
    Z.ok0 = Z.in0 !== '' && near(rateIn(Z.in0), rateAt(0) * 1000, 0.4);
    Z.ok60 = Z.in60 !== '' && near(rateIn(Z.in60), rateAt(60) * 1000, 0.3);
    if ((Z.ok0 && !a) || (Z.ok60 && !b)) { Sound.success(); Z.pulse = 0; const t0 = Z.ok0 && !a ? 0 : 60; parts.burst(GX(t0), GY(cAt(t0)), { count: 12, speed: 110, life: 0.6, size: 3.4 }); }
  }
  function setT0(v) { const Z = ZM(); if (Z.t0 !== v) { Z.t0 = v; Sound.tick(); } updateCtl(); }
  function setDi(i) { const Z = ZM(); i = clamp(i, 0, DT.length - 1); if (Z.di !== i) { Z.di = i; Z.seen[i] = true; Sound.tick(); } updateCtl(); }
  function stepZm(dt) { const Z = ZM(); Z.dk = ap2(Z.dk, DT[Z.di], dt, 9); if (Math.abs(Z.dk - DT[Z.di]) < 0.02) Z.dk = DT[Z.di]; Z.pulse = ap2(Z.pulse, 1, dt, 2.2); if (Z.pulse > 0.995) Z.pulse = 1; }
  function drawZoom(t) {
    const L = RC.L, Z = ZM(), p = PB(), t0 = Z.t0, d = Z.dk;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔍 구간을 줄이면 시컨트가 접선에 가까워져요', PHONE ? 13.5 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '시작 시각 ' + t0 + ' s · 간격 Δt = ' + fdt(d) + ' s', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    axesCT(p); curveCT(p, 100);
    if (Z.tan) tangentCT(t0, true);
    chordCT(t0, t0 + d, { color: AMB, labels: d >= 10 && !Z.tan, tri: !Z.tan && d >= 10 });
    nodesCT(false);
    const avg = avgRate(t0, t0 + d), ins = rateAt(t0);
    const y0 = L.y + 416;
    D.roundRect(L.x + 12, y0 - 20, L.w - 24, 84, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    T(L.x + 24, y0 + 2, '평균 속도 (시컨트 기울기) = ' + f4(avg) + ' M/s', 14, AMB, 'left', 800);
    T(L.x + 24, y0 + 28, Z.tan ? '순간 속도 (접선 기울기) = ' + f4(ins) + ' M/s' : '순간 속도 (접선 기울기): 「접선 보이기」를 눌러요', 14, Z.tan ? TEAL : MUTED, 'left', 800);
    T(L.x + 24, y0 + 52, Z.tan ? '차이 = ' + f2(Math.abs(avg - ins) * 1000) + ' × 10⁻³ M/s' + (Math.abs(avg - ins) < 0.00015 ? '  (거의 같아요)' : '') : '', 13, MUTED, 'left', 800);
  }
  function drawZoomInfo(t) {
    const R = RC.R, Z = ZM(), t0 = Z.t0;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📉 Δt 를 줄일 때 평균 속도', 14, INK, 'left', 800);
    const rh = PHONE ? 30 : 34, y0 = R.y + 40;
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 4, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    T(R.x + 24, y0 + rh / 2 + 1, 'Δt (s)', 12.5, INK, 'left', 800); T(R.x + R.w - 24, y0 + rh / 2 + 1, '평균 속도 (M/s)', 12.5, INK, 'right', 800);
    DT.forEach((dd, i) => {
      const y = y0 + rh * (i + 1), cur = i === Z.di, seen = Z.seen[i] || cur;
      D.roundRect(R.x + 10, y, R.w - 20, rh - 4, 8); ctx.fillStyle = cur ? 'rgba(217,119,6,.16)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = cur ? AMB : '#e1dcf3'; ctx.lineWidth = cur ? 2 : 1.2; ctx.stroke();
      T(R.x + 24, y + rh / 2 + 1, String(dd), 14, seen ? INK : '#aab3c4', 'left', 800);
      T(R.x + R.w - 24, y + rh / 2 + 1, seen ? f4(avgRate(t0, t0 + dd)) : '—', 14, seen ? (cur ? AMB : INK) : '#aab3c4', 'right', 800);
    });
    const y = y0 + rh * (DT.length + 1) + 6;
    D.roundRect(R.x + 10, y, R.w - 20, rh - 2, 8); ctx.fillStyle = Z.tan ? 'rgba(13,148,136,.14)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = Z.tan ? TEAL : '#e1dcf3'; ctx.lineWidth = Z.tan ? 2 : 1.2; ctx.stroke();
    T(R.x + 24, y + rh / 2, 'Δt → 0 (접선)', 13.5, Z.tan ? TEAL : '#aab3c4', 'left', 800);
    T(R.x + R.w - 24, y + rh / 2, Z.tan ? f4(rateAt(t0)) : '—', 14, Z.tan ? TEAL : '#aab3c4', 'right', 800);
    if (R.y + R.h - (y + rh + 14) > 50) textBlock(R.x + 14, y + rh + 22, R.w - 28, '간격이 짧아질수록 평균 속도가 접선의 기울기(순간 속도)에 가까워져요.', 12.5, MUTED, 17, 700);
  }

  /* ================= ③ 계수와 속도 ================= */
  const CO = () => S.co;
  const RX = () => { const L = RC.L; return { x: L.x + 14, y: L.y + 56, w: L.w - 28, h: 236 }; };
  const CSPEC = { N2: { name: 'N₂', co: 1, col: '#3b6fe0' }, H2: { name: 'H₂', co: 3, col: '#9aa6bb' }, NH3: { name: 'NH₃', co: 2, col: '#e0692f' } };
  const MERGE = [1.6, 4.1, 6.6, 9.1], APP = 1.0;
  function coReset() {
    const Q = CO(); Q.phase = 'idle'; Q.t = 0; Q.ev = MERGE.map((m) => ({ m, st: 0 })); Q.ring = []; Q.P = [];
    const R = RX(); let seed = 7;
    const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const mk = (type) => { const sp = rnd(26, 46), a = rr() * TAU; return { type, x: R.x + 20 + rr() * (R.w - 40), y: R.y + 20 + rr() * (R.h - 40), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: rr() * TAU, va: (rr() - 0.5) * 2, st: 0, tx: 0, ty: 0, al: 1 }; };
    for (let i = 0; i < 8; i++) Q.P.push(mk('N2'));
    for (let i = 0; i < 24; i++) Q.P.push(mk('H2'));
  }
  const coCount = (type) => CO().P.filter((q) => q.type === type).length;
  const CO_INIT = { N2: 8, H2: 24, NH3: 0 };
  const coDelta = (type) => (coCount(type) - CO_INIT[type]) * NP;
  function runCoef() { const Q = CO(); if (Q.phase === 'run') return; coReset(); Q.phase = 'run'; Q.okV = false; Q.inV = ''; $('#cv1').value = ''; $('#cv1').classList.remove('ok', 'bad'); Sound.click(); updateCtl(); }
  function stepCoef(dt) {
    const Q = CO(), R = RX();
    Q.ring = Q.ring.filter((r) => (r.t += dt) < 0.7);
    // 입자 움직임 (반응기 벽에서 튕겨요)
    Q.P.forEach((q) => {
      if (q.st === 1) { const rem = Math.max(0.05, q.tm - Q.t); const k = Math.min(1, (RM ? 1 : dt) / rem); q.x += (q.tx - q.x) * k; q.y += (q.ty - q.y) * k; q.a += dt * 4; return; }
      if (Q.phase === 'run' || q.type === 'NH3') {
        q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt;
      } else { q.x += q.vx * dt * 0.35; q.y += q.vy * dt * 0.35; q.a += q.va * dt * 0.35; }
      const m = 11;
      if (q.x < R.x + m) { q.x = R.x + m; q.vx = Math.abs(q.vx); } else if (q.x > R.x + R.w - m) { q.x = R.x + R.w - m; q.vx = -Math.abs(q.vx); }
      if (q.y < R.y + m) { q.y = R.y + m; q.vy = Math.abs(q.vy); } else if (q.y > R.y + R.h - m) { q.y = R.y + R.h - m; q.vy = -Math.abs(q.vy); }
    });
    if (Q.phase !== 'run') return;
    Q.t = Math.min(10, Q.t + dt);
    Q.ev.forEach((e) => {
      if (e.st === 0 && Q.t >= e.m - APP) {                    // 반응할 분자 고르기: 만날 지점에서 가까운 N₂ 1개, H₂ 3개
        const mx = R.x + 60 + rnd(0, R.w - 120), my = R.y + 50 + rnd(0, R.h - 100);
        const free = (type) => Q.P.filter((q) => q.type === type && q.st === 0).sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my));
        const n = free('N2')[0], hs = free('H2').slice(0, 3);
        if (!n || hs.length < 3) { e.st = 2; return; }
        e.set = [n].concat(hs); e.set.forEach((q, i) => { q.st = 1; q.tm = e.m; q.tx = mx + (i === 0 ? 0 : Math.cos(i * 2.1) * 9); q.ty = my + (i === 0 ? 0 : Math.sin(i * 2.1) * 9); });
        e.mx = mx; e.my = my; e.st = 1;
      }
      if (e.st === 1 && Q.t >= e.m) {                         // 결합: 4개가 사라지고 NH₃ 2개가 생겨요
        Q.P = Q.P.filter((q) => e.set.indexOf(q) < 0);
        for (let k = 0; k < 2; k++) { const a = k * Math.PI + rnd(0, 1), sp = rnd(34, 48); Q.P.push({ type: 'NH3', x: e.mx, y: e.my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: rnd(0, TAU), va: rnd(-1, 1), st: 0, tx: 0, ty: 0, al: 1 }); }
        e.st = 2; Q.ring.push({ x: e.mx, y: e.my, t: 0 }); Sound.tick(); if (!RM) parts.burst(e.mx, e.my, { count: 10, speed: 90, life: 0.5, size: 3.2 });
      }
    });
    if (Q.t >= 10 && Q.ev.every((e) => e.st === 2)) { Q.phase = 'done'; Sound.success(); updateCtl(); }
  }
  function drawMol(type, x, y, a, sc, alpha) {
    sc = sc || 1; ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    const rot = (dx, dy) => [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)];
    if (type === 'N2') { const p1 = rot(-6 * sc, 0), p2 = rot(6 * sc, 0); D.sphere(p1[0], p1[1], 7 * sc, '#3b6fe0', { gloss: true }); D.sphere(p2[0], p2[1], 7 * sc, '#3b6fe0', { gloss: true }); }
    else if (type === 'H2') { const p1 = rot(-3.6 * sc, 0), p2 = rot(3.6 * sc, 0); D.sphere(p1[0], p1[1], 4.6 * sc, '#e9edf5', { gloss: true, outline: '#b8c2d4', outlineWidth: 1 }); D.sphere(p2[0], p2[1], 4.6 * sc, '#e9edf5', { gloss: true, outline: '#b8c2d4', outlineWidth: 1 }); }
    else { const hs = [rot(-8 * sc, 5 * sc), rot(8 * sc, 5 * sc), rot(0, -9 * sc)]; hs.forEach((h) => D.sphere(h[0], h[1], 4.2 * sc, '#e9edf5', { gloss: true, outline: '#b8c2d4', outlineWidth: 1 })); D.sphere(x, y, 7 * sc, '#e0692f', { gloss: true }); }
    ctx.restore();
  }
  function drawCoef(t) {
    const L = RC.L, Q = CO(), R = RX();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '⚗️ 암모니아 합성 반응기 (1.0 L 모형)', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, 'N₂ + 3H₂ → 2NH₃ · 입자 하나 = 0.0050 M', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    D.roundRect(R.x, R.y, R.w, R.h, 12); ctx.fillStyle = '#f7f9ff'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); D.roundRect(R.x, R.y, R.w, R.h, 12); ctx.clip();
    Q.ring.forEach((r) => { ctx.strokeStyle = 'rgba(224,105,47,' + (1 - r.t / 0.7) * 0.8 + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, 10 + r.t * 50, 0, TAU); ctx.stroke(); });
    // 만나러 가는 분자 연결선
    Q.ev.forEach((e) => { if (e.st === 1) e.set.forEach((q) => { ctx.strokeStyle = 'rgba(224,105,47,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(e.mx, e.my); ctx.stroke(); ctx.setLineDash([]); }); });
    Q.P.forEach((q) => drawMol(q.type, q.x, q.y, q.a, 1));
    ctx.restore();
    // 범례
    const ly = R.y + R.h + 18;
    [['N2', 'N₂'], ['H2', 'H₂'], ['NH3', 'NH₃']].forEach((s, i) => { const lx = L.x + 24 + i * 78; drawMol(s[0], lx, ly - 3, 0, 0.9); T(lx + 17, ly + 2, s[1], 13, INK, 'left', 800); });
    D.label(L.x + L.w - 14 - 78, ly - 2, 't = ' + f1(Q.t) + ' s', { size: 13.5, bg: Q.phase === 'run' ? PUR : Q.phase === 'done' ? GOOD : '#8a95a8', align: 'left' });
    // 개수 카운터
    const cy = ly + 22, cw = (L.w - 28 - 16) / 3;
    ['N2', 'H2', 'NH3'].forEach((type, i) => {
      const x = L.x + 14 + i * (cw + 8), n = coCount(type), d = n - CO_INIT[type];
      D.roundRect(x, cy, cw, 74, 12); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#d9d0f5'; ctx.lineWidth = 1.5; ctx.stroke();
      T(x + 10, cy + 20, CSPEC[type].name, 14, INK, 'left', 800);
      T(x + cw - 10, cy + 20, '지금 ' + n + '개', 13, MUTED, 'right', 800);
      T(x + cw / 2, cy + 50, (d === 0 ? '변화 0' : (d < 0 ? MINUS : '+') + Math.abs(d) + '개'), 20, d < 0 ? BLU : d > 0 ? AMB : '#aab3c4', 'center', 800);
      T(x + cw / 2, cy + 68, 'Δ[' + CSPEC[type].name + '] ' + (d === 0 ? '= 0' : '= ' + (d < 0 ? MINUS : '+') + f3(Math.abs(d) * NP) + ' M'), 12, MUTED, 'center', 700);
    });
    const my = cy + 100;
    const msg = Q.phase === 'idle' ? '「10 s 관찰」을 누르면 분자들이 부딪혀 NH₃ 가 만들어져요.' : Q.phase === 'run' ? 'N₂ 1개와 H₂ 3개가 만나면 NH₃ 2개가 돼요. 개수의 변화를 세어 봐요.' : '10 s 동안 N₂ 4개, H₂ 12개가 줄고 NH₃ 8개가 늘었어요. 비가 1 : 3 : 2 예요.';
    textBlock(L.x + 14, my, L.w - 28, msg, 13, INK, 18, 800);
  }
  function drawCoefInfo(t) {
    const R = RC.R, Q = CO(), done = Q.phase === 'done';
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 10 s 동안의 변화율', 14.5, INK, 'left', 800);
    const sp = ['N2', 'H2', 'NH3'], rowH = PHONE ? 50 : 62, y0 = R.y + 38;
    sp.forEach((type, i) => {
      const y = y0 + i * (rowH + 4), d = coDelta(type), rate = d / 10;
      D.roundRect(R.x + 10, y, R.w - 20, rowH, 10); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#d9d0f5'; ctx.lineWidth = 1.4; ctx.stroke();
      T(R.x + 22, y + 22, CSPEC[type].name + '  (계수 ' + CSPEC[type].co + ')', 13.5, INK, 'left', 800);
      T(R.x + R.w - 22, y + 22, 'Δ[' + CSPEC[type].name + '] = ' + (done ? sg(d, f3) + ' M' : '—'), 12.5, MUTED, 'right', 800);
      T(R.x + 22, y + 44, 'Δ[' + CSPEC[type].name + ']/Δt', 13, MUTED, 'left', 800);
      T(R.x + R.w - 22, y + 44, done ? sg(rate, f4) + ' M/s' : '—', 15, done ? (rate < 0 ? BLU : AMB) : '#aab3c4', 'right', 800);
    });
    const y1 = y0 + 3 * (rowH + 4) + 4;
    D.roundRect(R.x + 10, y1, R.w - 20, PHONE ? 80 : 106, 10); ctx.fillStyle = done ? 'rgba(20,160,88,.08)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = done ? GOOD : '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    T(R.x + 20, y1 + 20, '변화율 / 계수', 13, PUR, 'left', 800);
    const vals = sp.map((type) => Math.abs(coDelta(type)) / 10 / CSPEC[type].co);
    sp.forEach((type, i) => T(R.x + 20, y1 + 42 + i * (PHONE ? 0 : 19) + (PHONE ? 0 : 0), '', 12, INK, 'left', 700));
    if (PHONE) {
      T(R.x + 20, y1 + 42, done ? 'N₂: ' + f4(vals[0]) + '   H₂: ' + f4(vals[1]) + '   NH₃: ' + f4(vals[2]) : '관찰이 끝나면 계산해요', 12.5, done ? '#0f6b3c' : MUTED, 'left', 800);
      T(R.x + 20, y1 + 64, done ? '모두 같아요: v = ' + f4(vals[0]) + ' M/s' : '', 13, GOOD, 'left', 800);
    } else {
      sp.forEach((type, i) => T(R.x + 20, y1 + 42 + i * 19, CSPEC[type].name + ': ' + (done ? f4(Math.abs(coDelta(type) / 10)) + ' / ' + CSPEC[type].co + ' = ' + f4(vals[i]) : '—'), 12.5, done ? '#0f6b3c' : MUTED, 'left', 800));
      T(R.x + 20, y1 + 98, done ? '모두 같아요: v = ' + f4(vals[0]) + ' M/s' : '', 13, GOOD, 'left', 800);
    }
    let y2 = y1 + (PHONE ? 90 : 116);
    if (!PHONE) {
      T(R.x + 14, y2 + 14, '변화율의 크기 (M/s)', 12.5, MUTED, 'left', 800);
      sp.forEach((type, i) => {
        const rate = Math.abs(coDelta(type)) / 10, by = y2 + 24 + i * 22, bw0 = R.w - 100, w = done ? clamp(rate / 0.0062, 0, 1) * bw0 : 0;
        T(R.x + 14, by + 13, CSPEC[type].name, 12.5, INK, 'left', 800);
        D.roundRect(R.x + 52, by, bw0, 16, 5); ctx.fillStyle = '#eef1f8'; ctx.fill();
        if (w > 0.5) { D.roundRect(R.x + 52, by, w, 16, 5); ctx.fillStyle = type === 'NH3' ? '#e8895c' : '#6f8fe8'; ctx.fill(); }
        if (done) T(R.x + 52 + bw0 + 4, by + 13, f1(rate * 1000), 12, INK, 'left', 800);
      });
      y2 += 96;
    }
    if (y2 + 30 < R.y + R.h) textBlock(R.x + 14, y2 + 16, R.w - 28, 'v = −Δ[N₂]/Δt = −(1/3)·Δ[H₂]/Δt = (1/2)·Δ[NH₃]/Δt', 12.5, INK, 17, 800);
  }

  /* ================= ④ 측정 설계 ================= */
  const DS = () => S.de;
  const dsCh = () => DS().ch[DS().sel];
  const dsDoneN = () => DS().ch.filter((c) => c.done).length;
  const safeAll = () => DS().safe.every(Boolean);
  function dsEval() {
    const r = DS().sel, c = dsCh(), X = RXN[r], msgs = [], bad = {};
    if (c.s < 0 || c.i < 0 || c.w < 0) return { ok: false, msg: '센서, 시간 간격, 까닭을 모두 골라요.', bad };
    const sk = SENS[c.s].k;
    if (X.sens.indexOf(sk) < 0) { bad.s = true; msgs.push(X.sf[sk] || '이 반응에는 다른 센서가 더 알맞아요.'); }
    if (!intvOk(r, c.i)) { bad.i = true; const p = pts(r, c.i); msgs.push(p < 8 ? '이 반응은 약 ' + dur(X.dur) + ' 동안 일어나요. ' + INTV[c.i].t + ' 간격이면 점이 ' + f0(p) + '개뿐이라 변화를 놓쳐요.' : '이 반응은 약 ' + dur(X.dur) + ' 동안 일어나요. ' + INTV[c.i].t + ' 간격이면 점이 ' + f0(p) + '개나 되어 너무 많아요.'); }
    if (c.w !== X.wa) { bad.w = true; msgs.push('고른 까닭이 이 반응과 맞지 않아요.'); }
    if (!bad.s && !bad.i && !bad.w && !safeAll()) return { ok: false, msg: '안전 점검 세 가지(보안경, 장갑, 환기)를 모두 켜야 실험을 시작할 수 있어요.', bad };
    return { ok: msgs.length === 0, msg: msgs.join(' '), bad };
  }
  const dur = (s) => (s >= 600 ? f0(s / 60) + '분' : s >= 60 ? f0(s / 60) + '분' : f0(s) + '초');
  function dsConfirm() {
    const r = DS().sel, c = dsCh(); if (c.done) return;
    const ev = dsEval(); c.bad = ev.bad; updateCtl();
    if (ev.ok) { c.done = true; DS().trace = 0; Sound.success(); const L = RC.L; parts.burst(L.x + 150, L.y + 230, { count: 18, speed: 130, life: 0.7, size: 3.8 }); showHint('좋은 설계예요! 센서 자료가 기록돼요.', 3000); updateCtl(); }
    else { Sound.fail(); showHint(ev.msg, 6000); }
  }
  function dsPick(kind, i) {
    const c = dsCh(); if (c.done) return;
    if (kind === 's') c.s = i; else if (kind === 'i') c.i = i; else c.w = i;
    c.bad = {}; updateCtl();
  }
  function stepDs(dt) { const D2 = DS(); if (dsCh().done) D2.trace = Math.min(1, D2.trace + dt / (RM ? 0.3 : 3.2)); else D2.trace = Math.max(0, D2.trace - dt * 3); }
  /* 용기 그리기: 반응마다 */
  function drawVessel(r, cx, by, t, prog) {
    const X = RXN[r];
    if (X.k === 'h2o2' || X.k === 'i2') {
      const liq = X.k === 'i2' ? C.mix('#9a5a1c', '#f4e5c9', prog) : '#d7ecff';
      D.flask(cx, by, 120, 128, { level: 0.42, liquid: liq, t });
      if (X.k === 'h2o2' && !RM) { if (Math.random() < 0.3) parts.emit({ x: cx + rnd(-30, 30), y: by - 40, vx: rnd(-5, 5), vy: -rnd(30, 50), life: 0.9, size: rnd(2.4, 4), color: 'rgba(255,255,255,.9)', shape: 'bubble', fade: true }); }
      return { top: by - 128, mid: by - 50, w: 120, x0: cx - 60, x1: cx + 60 };
    }
    if (X.k === 'mg') {
      D.beaker(cx - 50, by - 110, 100, 110, { level: 0.55, liquid: '#e2ecf8', t });
      ctx.save(); ctx.translate(cx - 8, by - 24); ctx.rotate(-0.25); D.roundRect(-22, -4, 44, 8, 3); ctx.fillStyle = '#b8bdc7'; ctx.fill(); ctx.restore();
      if (!RM && Math.random() < 0.5) parts.emit({ x: cx + rnd(-26, 14), y: by - 26, vx: rnd(-6, 6), vy: -rnd(34, 58), life: 1.0, size: rnd(2.2, 4), color: 'rgba(255,255,255,.9)', shape: 'bubble', fade: true });
      return { top: by - 110, mid: by - 50, w: 100, x0: cx - 50, x1: cx + 50 };
    }
    if (X.k === 'caco3') {
      D.flask(cx, by - 14, 112, 118, { level: 0.4, liquid: '#e6eef8', t });
      D.roundRect(cx - 70, by - 12, 140, 14, 5); ctx.fillStyle = '#7d8aa0'; ctx.fill();
      D.roundRect(cx - 62, by - 20, 124, 9, 3); ctx.fillStyle = '#c6cdd9'; ctx.fill();
      if (!RM && Math.random() < 0.25) parts.emit({ x: cx + rnd(-6, 6), y: by - 134, vx: rnd(-14, 14), vy: -rnd(20, 36), life: 1.1, size: rnd(5, 8), color: 'rgba(150,160,180,.4)', shape: 'smoke', fade: true });
      return { top: by - 132, mid: by - 50, w: 112, x0: cx - 56, x1: cx + 56 };
    }
    // neut: 뷰렛 + 비커
    D.beaker(cx - 50, by - 92, 100, 92, { level: 0.5, liquid: C.mix('#ffd4d4', '#d8ecff', prog), t });
    D.roundRect(cx - 7, by - 168, 14, 62, 4); ctx.fillStyle = 'rgba(220,235,250,.85)'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(cx - 3, by - 104, 6, 12);
    if (!RM) { const dy = ((t * 1.3) % 1) * 38; ctx.fillStyle = 'rgba(120,170,230,.9)'; ctx.beginPath(); ctx.arc(cx, by - 92 + dy - 6, 3, 0, TAU); ctx.fill(); }
    return { top: by - 92, mid: by - 46, w: 100, x0: cx - 50, x1: cx + 50 };
  }
  function drawDesign(t) {
    const L = RC.L, Dd = DS(), r = Dd.sel, X = RXN[r], c = dsCh();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '📟 ' + X.name + ' 의 속도를 어떻게 잴까요?', PHONE ? 14 : 15, INK, 'left', 800);
    wrap(X.eq, L.w - 28, PHONE ? 11.5 : 12.5, 700).slice(0, 1).forEach((ln) => T(L.x + 14, L.y + 46, ln, PHONE ? 11.5 : 12.5, MUTED, 'left', 700));
    const prog = c.done ? (Dd.trace) : (Math.sin(t * 0.6) * 0.5 + 0.5) * 0.4;
    const cx = L.x + 112, by = L.y + 250;
    const v = drawVessel(r, cx, by, t, prog);
    // 센서 연결
    const sk = c.s >= 0 ? SENS[c.s].k : null, scx = L.x + 262, scy = L.y + 100;
    const wire = (x1, y1, x2, y2, on) => { ctx.strokeStyle = on ? '#22c55e' : '#9aa6bb'; ctx.lineWidth = 2.6; ctx.setLineDash(on ? [6, 5] : [3, 5]); ctx.lineDashOffset = on ? -t * 30 : 0; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(x1 + 60, y1, x2 - 60, y2, x2, y2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; };
    const sbox = (x, y, w, h, ic, name) => { D.shadow(() => { D.roundRect(x, y, w, h, 10); ctx.fillStyle = '#eef2fa'; ctx.fill(); }, { blur: 5, y: 2 }); D.roundRect(x, y, w, h, 10); ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 1.4; ctx.stroke(); T(x + w / 2, y + 22, ic, 18, INK, 'center', 800); T(x + w / 2, y + h - 10, name, 12, MUTED, 'center', 800); };
    const pcx = L.x + L.w - 130, pcy = L.y + 74, pcw = 116, pch = 100;
    if (sk) {
      const sx = scx - 30, sy = L.y + 222;
      if (sk === 'gas') { ctx.strokeStyle = '#9fb2c9'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(cx, v.top - 2); ctx.lineTo(cx, v.top - 28); ctx.lineTo(sx, v.top - 28); ctx.lineTo(sx, sy - 6); ctx.stroke(); sbox(sx - 40, sy - 6, 80, 54, '🧯', '기체 센서'); }
      else if (sk === 'abs') { const yb = v.mid; ctx.strokeStyle = 'rgba(255,193,7,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(v.x0 - 38, yb); ctx.lineTo(v.x1 + 28, yb); ctx.stroke(); D.roundRect(v.x0 - 52, yb - 16, 20, 32, 5); ctx.fillStyle = '#ffd966'; ctx.fill(); sbox(v.x1 + 20, yb - 14, 78, 54, '🌈', '흡광도'); }
      else if (sk === 'ph' || sk === 'cond') { const px = cx + 24; ctx.strokeStyle = '#6a778c'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, v.top - 52); ctx.lineTo(px, v.mid + 8); ctx.stroke(); ctx.lineCap = 'butt'; ctx.strokeStyle = sk === 'ph' ? '#22c55e' : '#f59e0b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px, v.mid - 4); ctx.lineTo(px, v.mid + 10); ctx.stroke(); sbox(px + 14, v.top - 70, 82, 54, sk === 'ph' ? '🧪' : '⚡', sk === 'ph' ? 'pH 센서' : '전도도'); }
      else { /* mass */ if (X.k !== 'caco3') { D.roundRect(cx - 74, by + 2, 148, 14, 5); ctx.fillStyle = '#7d8aa0'; ctx.fill(); } sbox(cx + 90, by - 52, 74, 54, '⚖️', '전자저울'); }
      // 선 → 컴퓨터
      const ex = sk === 'gas' ? sx : sk === 'abs' ? v.x1 + 20 + 78 : sk === 'mass' ? cx + 164 : cx + 24 + 14 + 82;
      const ey = sk === 'gas' ? sy + 24 : sk === 'abs' ? v.mid + 13 : sk === 'mass' ? by - 25 : v.top - 43;
      wire(ex, ey, pcx + pcw / 2, pcy + pch, c.done);
    }
    // 컴퓨터 화면
    D.shadow(() => { D.roundRect(pcx, pcy, pcw, pch, 10); ctx.fillStyle = '#26324a'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(pcx + 6, pcy + 6, pcw - 12, pch - 12, 6); ctx.fillStyle = '#e8f6ee'; ctx.fill();
    const gx = pcx + 12, gy = pcy + 12, gw = pcw - 24, gh = pch - 28;
    ctx.strokeStyle = '#9fb0c4'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    if (c.done) {
      const up = X.k === 'h2o2' || X.k === 'mg', n = Math.max(2, Math.round(Dd.trace * 40));
      const shape = (u) => (up ? (1 - Math.exp(-3 * u)) / (1 - Math.exp(-3)) : (Math.exp(-2.6 * u) - Math.exp(-2.6)) / (1 - Math.exp(-2.6)));
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let q = 0; q <= n; q++) { const u = q / 40, px = gx + u * gw, py = gy + (1 - shape(u)) * (gh - 4) + 2; q === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke();
      T(pcx + pcw / 2, pcy + pch - 6, INTV[c.i].t + ' 간격', 11.5, '#3a4a63', 'center', 800);
    } else {
      T(pcx + pcw / 2, pcy + pch / 2 + 2, sk ? '연결됨' : '센서를', 12.5, '#4b5d7e', 'center', 800); T(pcx + pcw / 2, pcy + pch / 2 + 19, sk ? '시험 측정 전' : '골라요', 12.5, '#4b5d7e', 'center', 800);
    }
    // 안전 카드
    const sy2 = L.y + 292, sw = (L.w - 28 - 16) / 3;
    [['🥽', '보안경'], ['🧤', '장갑'], ['💨', '환기']].forEach((s, i) => {
      const x = L.x + 14 + i * (sw + 8), on = Dd.safe[i];
      D.roundRect(x, sy2, sw, 42, 10); ctx.fillStyle = on ? 'rgba(20,160,88,.1)' : '#fff7ed'; ctx.fill(); ctx.strokeStyle = on ? GOOD : '#f2c27d'; ctx.lineWidth = 1.6; ctx.stroke();
      T(x + 12, sy2 + 27, s[0], 18, INK, 'left', 800); T(x + 38, sy2 + 26, s[1] + (on ? ' ✓' : ''), 13.5, on ? '#0f6b3c' : '#b45309', 'left', 800);
    });
    // 선택 요약
    const ty = sy2 + 62;
    const rows = [['센서', c.s >= 0 ? SENS[c.s].ic + ' ' + SENS[c.s].name : '—', c.bad.s], ['시간 간격', c.i >= 0 ? INTV[c.i].t + '  (측정 점 약 ' + f0(pts(r, c.i)) + '개)' : '—', c.bad.i], ['까닭', c.w >= 0 ? X.why[c.w] : '—', c.bad.w]];
    rows.forEach((q, i) => {
      const y = ty + i * 30;
      T(L.x + 16, y + 6, q[0], 13, MUTED, 'left', 800);
      const ls = wrap(q[1], L.w - 120, 13, 800); T(L.x + 100, y + 6, ls[0] + (ls.length > 1 ? '…' : ''), 13, q[2] ? BAD : c.done ? '#0f6b3c' : INK, 'left', 800);
    });
    const msg = c.done ? '✅ ' + X.note + '. 이 설계로 ' + dur(X.dur) + ' 동안의 변화를 잴 수 있어요.' : '주변 장치를 고르고 「이 설계 확인」을 눌러요. ' + X.note + '.';
    textBlock(L.x + 14, ty + 100, L.w - 28, msg, 12.5, c.done ? '#0f6b3c' : MUTED, 17, 800);
  }
  function drawDesignInfo(t) {
    const R = RC.R, Dd = DS();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🗂 반응 카드 (' + dsDoneN() + ' / 5 완성)', 14, INK, 'left', 800);
    const ch = PHONE ? 52 : 74, y0 = R.y + 38;
    RXN.forEach((X, i) => {
      const y = y0 + i * (ch + 4), sel = i === Dd.sel, c = Dd.ch[i], h = ch;
      D.roundRect(R.x + 10, y, R.w - 20, h, 10); ctx.fillStyle = c.done ? 'rgba(20,160,88,.09)' : sel ? 'rgba(124,58,237,.09)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = c.done ? GOOD : sel ? PUR : '#d9d0f5'; ctx.lineWidth = sel ? 2.4 : 1.4; ctx.stroke();
      T(R.x + 22, y + 22, X.name, 14, INK, 'left', 800);
      if (c.done) D.check(R.x + R.w - 28, y + 20, 9, 1);
      wrap(c.done ? SENS[c.s].ic + ' ' + SENS[c.s].name + ' · ' + INTV[c.i].t : X.note, R.w - 44, 12, 700).slice(0, PHONE ? 1 : 2).forEach((ln, k) => T(R.x + 22, y + 42 + k * 16, ln, 12, c.done ? '#0f6b3c' : MUTED, 'left', 700));
    });
  }

  /* ================= 컨트롤 · 공통 ================= */
  const chipBtn = (txt, aria, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const numIn = (id, ph) => { const e = document.createElement('input'); e.className = 'num-in'; e.id = id; e.type = 'text'; e.setAttribute('inputmode', 'decimal'); e.autocomplete = 'off'; if (ph) e.setAttribute('aria-label', ph); return e; };
  /* ① 변환 입력 4칸 */
  const CONVK = [2, 3, 4, 5];
  function buildRows() {
    const cb = $('#convRows');
    CONVK.forEach((k, i) => { const lab = document.createElement('span'); lab.className = 'lab'; lab.id = 'convLab' + i; lab.textContent = TS[k] + ' s 의 [H₂O₂] (M)'; cb.appendChild(lab); const inp = numIn('cn' + i, TS[k] + '초의 농도'); cb.appendChild(inp); inp.addEventListener('input', () => { SE().inp[i] = inp.value; inp.classList.remove('bad'); checkConv(i); updateCtl(); }); inp.addEventListener('change', () => convChange(i, inp)); });
    const ab = $('#avgRows');
    for (let i = 0; i < 5; i++) { const lab = document.createElement('span'); lab.className = 'lab'; lab.id = 'avLab' + i; lab.textContent = TS[i] + '~' + TS[i + 1] + ' s'; lab.addEventListener('click', () => { AV().sel = i; AV().pulse = 0; Sound.tick(); updateCtl(); }); ab.appendChild(lab); const inp = numIn('av' + i, TS[i] + '초부터 ' + TS[i + 1] + '초까지 평균 속도'); ab.appendChild(inp); inp.addEventListener('focus', () => { AV().sel = i; updateCtl(); }); inp.addEventListener('input', () => { AV().inp[i] = inp.value; inp.classList.remove('bad'); checkAvg(); updateCtl(); }); inp.addEventListener('change', () => avChange(i, inp)); }
    DT.forEach(() => {});
    [0, 60].forEach((v) => $('#t0Chips').appendChild(chipBtn(v + ' s 에서', v + '초에서 시작', () => setT0(v))));
    ['#safeChips'].forEach(() => {});
    ['🥽 보안경', '🧤 장갑', '💨 환기'].forEach((s, i) => $('#safeChips').appendChild(chipBtn(s, s, () => { DS().safe[i] = !DS().safe[i]; Sound.tick(); updateCtl(); })));
    SENS.forEach((s, i) => $('#sensChips').appendChild(chipBtn(s.ic + ' ' + s.name, s.name, () => dsPick('s', i))));
    INTV.forEach((s, i) => $('#intvChips').appendChild(chipBtn(s.t, s.t + ' 간격', () => dsPick('i', i))));
  }
  function clearConv() { for (let i = 0; i < 4; i++) { const e = $('#cn' + i); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } } }
  function checkConv(i) {
    const E = SE(), was = E.ok[i], v = parseNum(E.inp[i]);
    E.ok[i] = E.done && E.inp[i] !== '' && near(v, concFromV(volShown(CONVK[i])), 0.006);
    if (E.ok[i] && !was) { Sound.success(); const R = RC.R; parts.burst(R.x + R.w - 40, R.y + 38 + (PHONE ? 26 : 29) * (CONVK[i] + 1.5), { count: 10, speed: 100, life: 0.5, size: 3.2 }); }
  }
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  function convChange(i, inp) {
    const E = SE(); if (inp.value === '' || E.ok[i]) return; shakeBad(inp);
    const k = CONVK[i], v = parseNum(inp.value), ans = concFromV(volShown(k));
    if (!E.done) showHint('먼저 100 s 까지 측정을 마쳐요.');
    else if (near(v, volShown(k) / 1000, 0.01)) showHint('부피(L)가 아니라 [H₂O₂] (M) 를 구해요. 감소한 농도를 처음 농도 0.80 M 에서 빼요.');
    else if (near(v, CT[0] - ans, 0.01)) showHint('이 값은 줄어든 농도예요. 처음 농도 0.80 M 에서 빼야 지금의 [H₂O₂] 가 돼요.');
    else if (near(v, CT[0] - ans / 2, 0.01) || near(v, CT[0] - (CT[0] - ans) * 2, 0.02)) showHint('H₂O₂ 2 mol 이 분해될 때 O₂ 가 1 mol 생겨요. O₂ 몰수를 2배 하고 0.100 L 로 나누어요.');
    else showHint('n(O₂) = V(L) / 24.5, 줄어든 H₂O₂ = 2 × n(O₂) 이고, 농도 = 몰수 / 0.100 L 예요.');
  }
  function avChange(i, inp) {
    const A = AV(); if (inp.value === '' || A.ok[i]) return; shakeBad(inp);
    const raw = parseNum(inp.value), v = rateIn(inp.value), ans = AVG[i] * 1000;
    if (v < 0) showHint('반응 속도는 농도가 줄어든 양의 크기로 나타내서 양수예요.');
    else if (near(v, ans * 20, 0.2)) showHint('농도 변화량을 시간 20 s 로 나누어야 해요.');
    else if (near(v, (CT[i] - CT[i + 1]) * 1000, 3)) showHint('농도 변화량 ' + f2(CT[i] - CT[i + 1]) + ' M 을 20 s 로 나누어 M/s 로 구한 뒤 10⁻³ 단위로 적어요.');
    else showHint('평균 속도 = ' + f2(CT[i]) + ' − ' + f2(CT[i + 1]) + ' 를 20 s 로 나눈 값이에요. 예: 0.0080 M/s = 8.0 (×10⁻³ M/s).');
  }
  /* ③ 입력 */
  function checkCo() {
    const Q = CO(), wasV = Q.okV;
    Q.okV = Q.phase === 'done' && Q.inV !== '' && near(rateIn(Q.inV), 2.0, 0.06) && rateIn(Q.inV) > 0;
    if (Q.okV && !wasV) { Sound.success(); const L = RC.L; parts.burst(L.x + L.w / 2, L.y + 300, { count: 14, speed: 120, life: 0.6, size: 3.4 }); }
    const ans = [-15.0, -5.0, 5.0];
    for (let i = 0; i < 3; i++) { const was = Q.cok[i]; const v = rateIn(Q.cin[i]); Q.cok[i] = Q.cin[i] !== '' && near(v, ans[i], 0.06); if (Q.cok[i] && !was) Sound.tick(); }
  }
  $('#cv1').addEventListener('input', (e) => { CO().inV = e.target.value; e.target.classList.remove('bad'); checkCo(); updateCtl(); });
  $('#cv1').addEventListener('change', (e) => {
    const Q = CO(); if (e.target.value === '' || Q.okV) return; shakeBad(e.target); const v = rateIn(e.target.value);
    if (Q.phase !== 'done') showHint('먼저 「10 s 관찰」을 끝까지 봐요.');
    else if (v < 0) showHint('반응 속도 v 는 양수로 나타내요. 줄어드는 물질은 −를 붙여 변화율을 쓰고 v 는 부호를 떼요.');
    else if (near(v, 6, 0.1) || near(v, 4, 0.1)) showHint('변화율을 그 물질의 계수로 나누어요. N₂ 는 계수가 1, H₂ 는 3, NH₃ 는 2 예요.');
    else showHint('표의 N₂ 변화율 0.0020 M/s 를 계수 1 로 나누면 v 예요. 10⁻³ 단위로는 2.0 이에요.');
  });
  [['#cc1', 0], ['#cc2', 1], ['#cc3', 2]].forEach(([id, k]) => {
    const inp = $(id), ans = [-15.0, -5.0, 5.0];
    inp.addEventListener('input', () => { CO().cin[k] = inp.value; inp.classList.remove('bad'); checkCo(); updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || CO().cok[k]) return; shakeBad(inp); const v = rateIn(inp.value);
      if (k < 2 && v > 0) showHint('H₂ 와 N₂ 는 줄어드는 물질이라 변화율이 음수예요.');
      else if (k === 2 && v < 0) showHint('반응 속도 v 는 양수예요.');
      else if (k === 0 && near(Math.abs(v), 10 * 0.75, 0.1)) showHint('H₂ 는 NH₃ 와 달리 계수가 3 이에요. 변화율은 계수에 비례해요: NH₃ 2 : H₂ 3.');
      else if (k === 1 && near(Math.abs(v), 20, 0.1)) showHint('N₂ 의 계수는 NH₃ 의 절반이에요. 변화율도 NH₃ 의 절반이에요.');
      else showHint('변화율의 비는 계수비 N₂ : H₂ : NH₃ = 1 : 3 : 2 예요. v = (NH₃ 생성 속도) / 2 = 5.0.');
    });
  });
  function tanChange(inp, t0) {
    const Z = ZM(); if (inp.value === '' || (t0 === 0 ? Z.ok0 : Z.ok60)) return; shakeBad(inp); const v = rateIn(inp.value);
    if (v < 0) showHint('속도는 접선 기울기의 크기로 나타내서 양수예요.');
    else if (!Z.tan) showHint('「접선 보이기」를 누르면 삼각형에서 값을 읽을 수 있어요.');
    else showHint('접선 삼각형에서 (농도 변화량의 크기) / (시간) 이에요. 예: 0.357 M / 40 s = 0.0089 M/s → 8.9.');
  }
  $('#tn0').addEventListener('input', (e) => { ZM().in0 = e.target.value; e.target.classList.remove('bad'); checkTan(); updateCtl(); });
  $('#tn60').addEventListener('input', (e) => { ZM().in60 = e.target.value; e.target.classList.remove('bad'); checkTan(); updateCtl(); });
  $('#tn0').addEventListener('change', (e) => tanChange(e.target, 0));
  $('#tn60').addEventListener('change', (e) => tanChange(e.target, 60));
  buildRows();
  function buildWhy() {
    const box = $('#whyChips'); box.innerHTML = ''; const X = RXN[DS().sel];
    X.why.forEach((s, i) => box.appendChild(chipBtn(s, s, () => dsPick('w', i))));
  }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.getAttribute('data-show') !== S.mode; });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const E = SE(), A = AV(), Z = ZM(), Q = CO(), Dd = DS(), c = dsCh();
    // ①
    $('#bSense').textContent = E.phase === 'run' ? '⏳ 측정 중…' : E.done ? '↻ 다시 측정하기' : '▶ 측정 시작'; $('#bSense').disabled = E.phase === 'run';
    $('#convBox').style.opacity = E.done ? '' : '.55';
    for (let i = 0; i < 4; i++) { const inp = $('#cn' + i); inp.disabled = !E.done; inp.classList.toggle('ok', E.ok[i]); if (document.activeElement !== inp && inp.value !== E.inp[i]) inp.value = E.inp[i]; $('#convLab' + i).textContent = TS[CONVK[i]] + ' s (V = ' + f0(volShown(CONVK[i])) + ' mL)'; }
    $('#senseNote').textContent = E.phase === 'idle' ? '기체 부피 센서가 O₂ 부피를 재요. 100 s 측정을 8배 빠르게 보여 줘요.' : E.phase === 'run' ? '측정 중이에요. 표와 그래프가 채워져요.' : '측정 끝! 20 s 의 계산 예를 보고 나머지 [H₂O₂] 를 구해요.';
    // ②
    for (let i = 0; i < 5; i++) { const inp = $('#av' + i); inp.classList.toggle('ok', A.ok[i]); if (document.activeElement !== inp && inp.value !== A.inp[i]) inp.value = A.inp[i]; $('#avLab' + i).classList.toggle('on', A.sel === i); }
    $$('#t0Chips button').forEach((b, k) => b.classList.toggle('on', [0, 60][k] === Z.t0));
    $('#dtRange').value = String(Z.di); $('#dtOut').textContent = DT[Z.di] + ' s';
    $('#dtMinus').disabled = Z.di === 0; $('#dtPlus').disabled = Z.di === DT.length - 1;
    $('#bTan').setAttribute('aria-pressed', Z.tan ? 'true' : 'false'); $('#bTan').textContent = Z.tan ? '📐 접선 숨기기' : '📐 접선 보이기';
    ['tn0', 'tn60'].forEach((id, k) => { const inp = $('#' + id), ok = k === 0 ? Z.ok0 : Z.ok60, v = k === 0 ? Z.in0 : Z.in60; inp.classList.toggle('ok', ok); if (document.activeElement !== inp && inp.value !== v) inp.value = v; });
    // ③
    $('#bCoef').textContent = Q.phase === 'run' ? '⏳ 관찰 중…' : Q.phase === 'done' ? '↻ 다시 관찰하기' : '▶ 10 s 관찰'; $('#bCoef').disabled = Q.phase === 'run';
    $('#coefObs').hidden = S.mode !== 'coef' || Q.stage !== 'obs'; $('#coefCalc').hidden = S.mode !== 'coef' || Q.stage !== 'calc';
    $('#cv1').classList.toggle('ok', Q.okV); $('#cv1').disabled = Q.phase !== 'done';
    ['cc1', 'cc2', 'cc3'].forEach((id, k) => { const inp = $('#' + id); inp.classList.toggle('ok', Q.cok[k]); if (document.activeElement !== inp && inp.value !== Q.cin[k]) inp.value = Q.cin[k]; });
    $('#coefNote').textContent = Q.stage === 'calc' ? '반응기 관찰에서 본 비(1 : 3 : 2)를 이용해 계산해요.' : '입자 하나는 0.0050 M 이에요 (반응기 1.0 L 모형).';
    $('#bCoef').closest('.control').hidden = S.mode !== 'coef' || Q.stage === 'calc' && !game;
    // ④
    $$('#safeChips button').forEach((b, k) => b.classList.toggle('on', Dd.safe[k]));
    $$('#sensChips button').forEach((b, k) => { b.classList.toggle('on', c.s === k && !c.bad.s); b.classList.toggle('no', c.s === k && !!c.bad.s); b.disabled = c.done && c.s !== k; });
    $$('#intvChips button').forEach((b, k) => { b.classList.toggle('on', c.i === k && !c.bad.i); b.classList.toggle('no', c.i === k && !!c.bad.i); b.disabled = c.done && c.i !== k; });
    $('#dsIntv').hidden = S.mode !== 'design' || c.s < 0; $('#dsWhy').hidden = S.mode !== 'design' || c.s < 0 || c.i < 0; $('#dsGo').hidden = S.mode !== 'design' || c.s < 0 || c.i < 0 || c.w < 0;
    if ($('#whyChips').dataset.r !== String(Dd.sel)) { $('#whyChips').dataset.r = String(Dd.sel); buildWhy(); }
    $$('#whyChips button').forEach((b, k) => { b.classList.toggle('on', c.w === k && !c.bad.w); b.classList.toggle('no', c.w === k && !!c.bad.w); b.disabled = c.done && c.w !== k; b.style.textAlign = 'left'; b.style.borderRadius = '14px'; });
    $('#bDesign').textContent = c.done ? '✅ 완성한 설계' : '✔ 이 설계 확인'; $('#bDesign').disabled = c.done;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bSense').addEventListener('click', runSense);
  $('#bCoef').addEventListener('click', runCoef);
  $('#bTan').addEventListener('click', () => { Sound.click(); ZM().tan = !ZM().tan; ZM().pulse = 0; updateCtl(); });
  $('#dtRange').addEventListener('input', (e) => setDi(+e.target.value));
  $('#dtMinus').addEventListener('click', () => { Sound.click(); setDi(ZM().di - 1); });
  $('#dtPlus').addEventListener('click', () => { Sound.click(); setDi(ZM().di + 1); });
  $('#bDesign').addEventListener('click', dsConfirm);
  function resetSense() { const E = SE(); E.phase = 'idle'; E.t = 0; E.done = false; E.rows = 0; E.inp = ['', '', '', '']; E.ok = [false, false, false, false]; E.bub = 0; E.flash = 0; clearConv(); }
  function resetAvg() { const A = AV(); A.sel = 0; A.inp = ['', '', '', '', '']; A.ok = [false, false, false, false, false]; A.bar = [0, 0, 0, 0, 0]; A.pulse = 1; for (let i = 0; i < 5; i++) { $('#av' + i).value = ''; $('#av' + i).classList.remove('ok', 'bad'); } }
  function resetZoom() { const Z = ZM(); Z.t0 = 0; Z.di = 0; Z.dk = 40; Z.tan = false; Z.in0 = ''; Z.in60 = ''; Z.ok0 = false; Z.ok60 = false; Z.pulse = 1; Z.seen = { 0: true }; ['#tn0', '#tn60'].forEach((id) => { $(id).value = ''; $(id).classList.remove('ok', 'bad'); }); }
  function resetCoef() { const Q = CO(); coReset(); Q.okV = false; Q.inV = ''; Q.cin = ['', '', '']; Q.cok = [false, false, false]; Q.stage = 'obs'; ['#cv1', '#cc1', '#cc2', '#cc3'].forEach((id) => { $(id).value = ''; $(id).classList.remove('ok', 'bad'); }); }
  function resetDesign() { const Dd = DS(); Dd.sel = 0; Dd.safe = [false, false, false]; Dd.ch = RXN.map(() => ({ s: -1, i: -1, w: -1, done: false, bad: {} })); Dd.trace = 0; $('#whyChips').dataset.r = ''; }
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'sense') resetSense(); else if (S.mode === 'avg') resetAvg(); else if (S.mode === 'zoom') resetZoom(); else if (S.mode === 'coef') resetCoef(); else resetDesign();
    updateCtl();
  });
  /* 반응 카드 누르기 */
  const cardRect = (i) => { const R = RC.R, ch = PHONE ? 52 : 74; return { x: R.x + 10, y: R.y + 38 + i * (ch + 4), w: R.w - 20, h: ch }; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'design') { for (let i = 0; i < RXN.length; i++) if (inRect(p, cardRect(i))) { DS().sel = i; Sound.tick(); updateCtl(); return false; } }
      if (S.mode === 'avg') { const pb = PB(); if (inRect(p, { x: pb.x, y: pb.y, w: pb.w, h: pb.h })) { const t = (p.x - pb.x) / pb.w * 100; AV().sel = clamp(Math.floor(t / 20), 0, 4); AV().pulse = 0; Sound.tick(); updateCtl(); } }
      return false;
    },
    hover(p) {
      if (S.mode === 'design') { for (let i = 0; i < RXN.length; i++) if (inRect(p, cardRect(i))) return 'pointer'; }
      if (S.mode === 'avg') { const pb = PB(); if (inRect(p, { x: pb.x, y: pb.y, w: pb.w, h: pb.h })) return 'pointer'; }
      return null;
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'sense') { const E = SE(), tt = seT(); L1 = '시간 t'; a = f0(tt) + ' s'; L2 = 'O₂ 부피 V'; b = f0(volAt(tt)) + ' mL'; L3 = '[H₂O₂]'; c = f2(cAt(tt)) + ' M'; }
    else if (S.mode === 'avg') { const A = AV(), i = A.sel; L1 = '고른 구간'; a = TS[i] + '~' + TS[i + 1] + ' s'; L2 = 'Δ[H₂O₂]'; b = MINUS + f2(CT[i] - CT[i + 1]) + ' M'; L3 = '평균 속도'; c = A.ok[i] ? f4(AVG[i]) + ' M/s' : '?'; }
    else if (S.mode === 'zoom') { const Z = ZM(), d = Z.dk; L1 = '시간 간격 Δt'; a = fdt(d) + ' s'; L2 = '평균 속도'; b = f4(avgRate(Z.t0, Z.t0 + d)) + ' M/s'; L3 = '순간 속도'; c = Z.tan ? f4(rateAt(Z.t0)) + ' M/s' : '?'; }
    else if (S.mode === 'coef') { const Q = CO(); L1 = '관찰 시간'; a = f1(Q.t) + ' s'; L2 = '개수 (N₂ : H₂ : NH₃)'; b = coCount('N2') + ' : ' + coCount('H2') + ' : ' + coCount('NH3'); L3 = '반응 속도 v'; c = Q.phase === 'done' ? f4(Math.abs(coDelta('N2')) / 10) + ' M/s' : '?'; }
    else { const Dd = DS(), cc = dsCh(); L1 = '고른 반응'; a = RXN[Dd.sel].name; L2 = '센서'; b = cc.s >= 0 ? SENS[cc.s].name : '—'; L3 = '완성한 설계'; c = dsDoneN() + ' / 5'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const sensePre = () => { S.lock = true; resetSense(); setMode('sense'); };
  const levels = [
    {
      title: '센서로 재기: 시간–농도 자료', short: '센서 측정', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 반응이 얼마나 빠른지를 숫자로 나타내려면 무엇을 얼마 동안 재야 할까?</p>' +
        '<div class="si-link">🔗 <b>중학교와 일반선택 화학에서</b> 화학 반응식과 몰 농도(M = mol/L), 정반응과 역반응의 속도를 배웠어요. 이번에는 반응이 <b>얼마나 빨리</b> 일어나는지를 농도의 변화로 나타내 봐요.</div>' +
        '<p>화학 반응 속도는 <b>단위 시간 동안 줄어든 반응물의 농도</b>(또는 늘어난 생성물의 농도)예요. 센서로 시간에 따른 값을 재어 농도로 바꾸면 반응 속도를 구할 수 있어요. 이 차시에서는 2H₂O₂(aq) → 2H₂O(l) + O₂(g) 반응(소량의 KI 용액이 분해를 도와요, 100 mL, 25 °C)을 기체 부피 센서로 재어 봐요.</p>',
      features: ['sense'],
      setup() { S.lock = false; setMode('sense'); },
      recap: '기체 부피 센서의 값을 [H₂O₂] 로 바꾸면 시간–농도 자료를 얻고, 시간이 지날수록 농도가 줄어드는 빠르기가 느려져요.',
      summary: '<ul><li><b>반응 속도</b> = 단위 시간 동안 줄어든 반응물의 농도(또는 늘어난 생성물의 농도). 단위는 mol/(L·s) = <b>M/s</b>.</li><li>센서(기체 부피·압력, 흡광도, pH, 전도도, 질량)로 시간에 따른 값을 재어 농도로 바꾸면 반응 속도를 구할 수 있어요.</li><li>H₂O₂ 분해: [H₂O₂] = 0.80 − (2 × V<sub>O₂</sub> / 24.5) / 0.100 (V는 L). 20 s 에 O₂ 196 mL → [H₂O₂] = 0.64 M.</li><li>[H₂O₂] (M): 0 s 0.80, 20 s 0.64, 40 s 0.51, 60 s 0.41, 80 s 0.33, 100 s 0.26.</li><li>시간이 지날수록 그래프의 기울기가 완만해져요. 반응물의 농도가 줄어서 반응이 느려지기 때문이에요.</li></ul>',
      missions: [
        {
          title: '100 s 동안 측정하기',
          goal: '「측정 시작」을 눌러 H₂O₂ 분해를 <b>100 s 까지</b> 측정해요.',
          hint: '측정 시작 버튼을 누르고, 시간–부피 그래프와 오른쪽 기록표가 채워지는 것을 지켜봐요.',
          setup() { sensePre(); },
          check: () => SE().done, hold: 0.4,
          status: () => '측정 ' + mark(SE().done) + ' &nbsp; (' + f0(seT()) + ' / 100 s)',
          explain: '기체 부피 센서는 O₂ 부피를 재요. O₂ 는 H₂O₂ 가 분해되는 만큼 생기므로, 부피가 늘어나는 빠르기로 반응의 빠르기를 알 수 있어요. 처음 20 s 동안 O₂ 196 mL 가 모여요.',
        },
        {
          title: '표 채우기: 부피를 [H₂O₂] 로',
          goal: '표의 부피 V 로 <b>40~100 s 의 [H₂O₂]</b> 를 구해 조작판에 적어요.',
          hint: '[H₂O₂] = 0.80 − (2 × V(L) / 24.5) / 0.100. 예: 40 s 는 V = 355 mL = 0.355 L 이므로 n(O₂) = 0.0145 mol → 0.0290 mol / 0.100 L = 0.29 M 감소 → 0.51 M.',
          setup() { S.lock = true; setMode('sense'); const E = SE(); if (!E.done) { E.phase = 'done'; E.t = 100; E.done = true; E.rows = 6; } },
          check: () => SE().ok.every(Boolean), hold: 0.4,
          status: () => TS.slice(2).map((t, i) => t + ' s ' + mark(SE().ok[i])).join(' &nbsp; '),
          explain: '40 s: 0.51 M, 60 s: 0.41 M, 80 s: 0.33 M, 100 s: 0.26 M 이에요. O₂ 1 mol 이 생길 때 H₂O₂ 2 mol 이 분해되므로 O₂ 몰수에 2를 곱하고 용액의 부피 0.100 L 로 나누어 줄어든 농도를 구해요.',
        },
        {
          type: 'quiz', title: '그래프가 완만해지는 까닭',
          goal: '시간이 지날수록 O₂ 부피–시간 그래프의 기울기가 완만해져요. 그 까닭은?',
          setup() { S.lock = true; setMode('sense'); const E = SE(); if (!E.done) { E.phase = 'done'; E.t = 100; E.done = true; E.rows = 6; } },
          choices: ['촉매인 KI 가 반응하면서 점점 소모되기 때문이에요', '발생한 O₂ 가 다시 용액에 녹아 들어가기 때문이에요', '시간이 흐르면서 온도가 계속 내려가기 때문이에요', '반응물인 H₂O₂ 의 농도가 줄어들기 때문이에요'],
          answer: 3,
          feedback: ['KI 는 분해를 돕기만 하고 소모되지 않아요.', '발생한 O₂ 는 주사기에 모여 부피로 측정돼요. 다시 녹는 양은 무시할 수 있어요.', '이 실험은 25 °C 로 일정해요. 온도 변화가 원인이 아니에요.', ''],
          explain: '반응 속도는 반응물의 농도와 관계가 있어요. 반응이 진행되면 <b>H₂O₂ 의 농도가 줄어서</b> 단위 시간 동안 분해되는 양이 점점 작아져요. 그래서 그래프가 완만해져요.',
        },
      ],
    },
    {
      title: '평균 속도와 순간 속도', short: '평균·순간', icon: '📏', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 센서 자료로 [H₂O₂] 의 시간 변화를 얻었어요. 이제 이 그래프에서 <b>얼마나 빠르게</b> 반응이 일어나는지를 숫자로 구해 봐요.</div>' +
        '<p><b>평균 속도</b> = −Δ[H₂O₂] / Δt (시간 구간 전체의 평균). 반응물은 줄어들므로 Δ[H₂O₂] 에 −를 붙여 속도를 양수로 나타내요. <b>순간 속도</b>는 어느 한 시각의 속도로, 그 점에서 그은 <b>접선의 기울기</b>의 크기예요. 시간 간격 Δt 를 줄이면 평균 속도는 순간 속도에 가까워져요.</p>',
      features: ['avg', 'zoom'],
      setup() { S.lock = false; setMode('avg'); },
      recap: '평균 속도는 구간마다 다르고(점점 감소), 구간을 아주 짧게 하면 접선의 기울기인 순간 속도에 가까워져요.',
      summary: '<ul><li><b>평균 속도</b> = −Δ[A] / Δt. 5개 구간(20 s 간격)의 평균 속도는 0.0080, 0.0065, 0.0050, 0.0040, 0.0035 M/s 로 점점 작아져요.</li><li>반응 속도는 반응하는 동안 일정하지 않아요. 반응물의 농도가 줄어들어 점점 느려져요.</li><li><b>순간 속도</b> = 어느 한 시각의 속도 = 그 점에서 그은 <b>접선의 기울기</b>의 크기. t = 0 s 에서 약 0.0089 M/s, t = 60 s 에서 약 0.0046 M/s.</li><li>Δt 를 줄이면 평균 속도가 순간 속도에 가까워져요 (0 s 시작: Δt = 40 s 0.0073 → 1 s 0.0089 M/s).</li></ul>',
      missions: [
        {
          title: '5개 구간의 평균 속도',
          goal: '20 s 간격 <b>5개 구간</b>의 평균 속도를 구해 입력해요. 단위는 10⁻³ M/s 예요.',
          hint: '평균 속도 = (앞 시각의 농도 − 뒤 시각의 농도) / 20 s. 0~20 s: (0.80 − 0.64) / 20 = 0.0080 M/s → 8.0 (×10⁻³ M/s).',
          setup() { S.lock = true; resetAvg(); setMode('avg'); },
          check: () => avgDone() === 5, hold: 0.4,
          status: () => AV().ok.map((o, i) => TS[i] + '~' + TS[i + 1] + ' ' + mark(o)).join(' &nbsp; '),
          explain: '평균 속도는 0.0080, 0.0065, 0.0050, 0.0040, 0.0035 M/s 예요. 시간이 지날수록 <b>점점 작아져요</b>. 농도가 줄어들면 반응이 느려지기 때문이에요.',
        },
        {
          title: '접선으로 순간 속도 읽기',
          goal: '<b>t = 0 s</b> 와 <b>t = 60 s</b> 에서 접선을 보고 순간 속도를 읽어 입력해요 (×10⁻³ M/s).',
          hint: '「접선 보이기」를 누르고 시작 시각을 바꿔 가며 삼각형을 읽어요. 속도 = (농도 변화량의 크기) / (시간 변화량). 0 s: 0.357 M / 40 s ≈ 0.0089 M/s.',
          setup() { S.lock = true; resetZoom(); ZM().tan = true; setMode('zoom'); },
          check: () => ZM().ok0 && ZM().ok60, hold: 0.4,
          status: () => 't = 0 s ' + mark(ZM().ok0) + ' &nbsp; t = 60 s ' + mark(ZM().ok60),
          explain: '접선의 삼각형에서 t = 0 s 는 0.357 M / 40 s ≈ <b>0.0089 M/s</b>, t = 60 s 는 0.183 M / 40 s ≈ <b>0.0046 M/s</b> 예요. 반응이 진행되며 순간 속도도 줄어들어요.',
        },
        {
          type: 'quiz', title: '평균 속도를 순간 속도로',
          goal: '0 s 에서 시작한 구간의 평균 속도가 0 s 의 순간 속도와 거의 같아지게 하려면 어떻게 해야 할까요?',
          setup() { S.lock = true; setMode('zoom'); ZM().tan = true; },
          choices: ['시간 간격 Δt 를 아주 짧게 해요', '시간 간격 Δt 를 길게 해요', '반응 속도는 일정하므로 구간과 상관없이 같아요', '농도 변화량이 큰 구간을 골라요'],
          answer: 0,
          feedback: ['', 'Δt 가 길수록 구간 안에서 속도가 많이 변해서 평균 속도가 순간 속도와 더 달라져요.', '반응 속도는 일정하지 않아요. 농도가 줄어들면서 점점 느려져요. 그래서 구간마다 평균 속도가 달라요.', '농도 변화량이 클수록 속도가 같아지는 것이 아니에요. 구간이 짧아야 해요.'],
          explain: 'Δt 를 줄일수록 시컨트(두 점을 이은 선)가 접선에 가까워져서 <b>평균 속도 → 순간 속도</b>가 돼요. 0 s 시작에서 Δt = 40 s 는 0.0073, 20 s 는 0.0080, 1 s 는 0.0089 M/s 예요.',
        },
      ],
    },
    {
      title: '계수와 속도', short: '계수와 속도', icon: '⚗️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한 물질의 농도 변화로 반응 속도를 구했어요. 그런데 반응식에는 물질이 여러 개이고 계수도 달라요. 어느 물질로 재느냐에 따라 값이 달라질까요?</div>' +
        '<p>N₂ + 3H₂ → 2NH₃ 에서는 N₂ 1개가 줄 때 H₂ 3개가 줄고 NH₃ 2개가 늘어요. 그래서 물질마다 농도 변화율이 <b>계수비</b>(1 : 3 : 2)를 따라요. 변화율을 각자의 <b>계수로 나누면</b> 어느 물질로 재어도 같은 하나의 반응 속도 v 가 돼요.</p>',
      features: ['coef'],
      setup() { S.lock = false; setMode('coef'); },
      recap: '물질마다 농도 변화율은 계수비를 따르고, 변화율을 계수로 나누면 하나의 반응 속도 v 가 돼요.',
      summary: '<ul><li>aA → bB 에서 <b>v = −(1/a) · Δ[A]/Δt = (1/b) · Δ[B]/Δt</b>. 물질의 변화율을 그 계수로 나누면 하나의 반응 속도 v 로 나타낼 수 있어요.</li><li>N₂ + 3H₂ → 2NH₃: Δ[NH₃]/Δt = +0.0040 M/s 이면 Δ[H₂]/Δt = −0.0060 M/s, Δ[N₂]/Δt = −0.0020 M/s 이고 v = 0.0020 M/s.</li><li>변화율의 비 N₂ : H₂ : NH₃ = 1 : 3 : 2 (계수비). H₂ 의 소모 속도는 NH₃ 생성 속도의 3/2 배.</li><li>2H₂O₂ → 2H₂O + O₂ 에서 O₂ 의 생성 속도는 H₂O₂ 의 소모 속도의 1/2 배.</li></ul>',
      missions: [
        {
          title: '관찰하고 v 구하기',
          goal: '「10 s 관찰」로 분자 수의 변화를 세고, 표의 변화율을 이용해 <b>반응 속도 v</b> 를 입력해요 (×10⁻³ M/s).',
          hint: '10 s 동안 N₂ 4개 감소 = 0.0200 M → Δ[N₂]/Δt = −0.0020 M/s. N₂ 의 계수는 1 이므로 v = 0.0020 M/s → 2.0 이에요.',
          setup() { S.lock = true; resetCoef(); CO().stage = 'obs'; setMode('coef'); },
          check: () => CO().okV, hold: 0.4,
          status: () => '관찰 ' + mark(CO().phase === 'done') + ' &nbsp; v ' + mark(CO().okV),
          explain: '10 s 동안 N₂ 4개, H₂ 12개가 줄고 NH₃ 8개가 늘었어요 (입자 하나 = 0.0050 M 이므로 −0.020, −0.060, +0.040 M). 변화율은 −0.0020, −0.0060, +0.0040 M/s 이고 계수로 나누면 모두 <b>0.0020 M/s</b> 예요.',
        },
        {
          title: 'NH₃ 생성 속도에서 다른 물질로',
          goal: 'NH₃ 의 생성 속도가 <b>+0.0100 M/s</b> 일 때 Δ[H₂]/Δt, Δ[N₂]/Δt, 반응 속도 v 를 구해 입력해요 (×10⁻³ M/s).',
          hint: '계수비 N₂ : H₂ : NH₃ = 1 : 3 : 2 예요. NH₃ 는 2에 해당하는 +10.0 이니까 H₂ 는 −10.0 × 3/2, N₂ 는 −10.0 × 1/2 이고 v = 10.0 / 2 예요.',
          setup() { S.lock = true; resetCoef(); CO().stage = 'calc'; setMode('coef'); },
          check: () => CO().cok.every(Boolean), hold: 0.4,
          status: () => 'H₂ ' + mark(CO().cok[0]) + ' &nbsp; N₂ ' + mark(CO().cok[1]) + ' &nbsp; v ' + mark(CO().cok[2]),
          explain: 'Δ[H₂]/Δt = −0.0100 × 3/2 = <b>−0.0150 M/s</b>, Δ[N₂]/Δt = −0.0100 × 1/2 = <b>−0.0050 M/s</b>, v = 0.0100 / 2 = <b>0.0050 M/s</b> 예요. 줄어드는 물질의 변화율은 음수이고 v 는 양수예요.',
        },
        {
          type: 'quiz', title: 'H₂ 소모 속도와 NH₃ 생성 속도',
          goal: 'N₂ + 3H₂ → 2NH₃ 에서 H₂ 의 소모 속도는 NH₃ 의 생성 속도의 몇 배일까요?',
          setup() { S.lock = true; setMode('coef'); CO().stage = 'obs'; },
          choices: ['3배', '2/3배', '3/2배', '1배 (같아요)'],
          answer: 2,
          feedback: ['H₂ 의 계수 3 만 보면 안 돼요. NH₃ 의 계수 2 로 나눈 비를 구해야 해요.', '거꾸로 계산했어요. H₂ 쪽이 계수가 더 커서 더 빨리 줄어요.', '', '계수가 다르면 변화율도 달라요. 같은 것은 계수로 나눈 값(반응 속도 v)이에요.'],
          explain: '소모 속도 : 생성 속도 = 3 : 2 이므로 H₂ 의 소모 속도는 NH₃ 의 생성 속도의 <b>3/2배</b> 예요. 같은 이유로 2H₂O₂ → 2H₂O + O₂ 에서 O₂ 의 생성 속도는 H₂O₂ 소모 속도의 1/2 배예요.',
        },
      ],
    },
    {
      title: '측정 설계: 알맞은 센서', short: '측정 설계', icon: '📟', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반응물이나 생성물의 농도 변화로 반응 속도를 구했어요. 이제 반응마다 <b>무엇을 어떤 센서로, 얼마 간격으로</b> 재야 할지 실험을 설계해 봐요.</div>' +
        '<p>센서는 반응에서 <b>변하는 성질</b>을 읽어요. 기체가 발생하면 <b>기체 압력·부피</b>, 색이 있는 물질은 <b>흡광도</b>, 산·염기가 소모되면 <b>pH</b>, 이온 수가 변하면 <b>전도도</b>, 기체가 빠져나가면 <b>질량 감소</b>(전자저울)를 써요. 측정 간격은 반응이 걸리는 시간에 맞추어 변화를 놓치지 않게 정해요. 실험 전에는 🥽 보안경, 🧤 장갑, 💨 환기를 점검해요.</p>',
      features: ['design'],
      setup() { S.lock = false; setMode('design'); },
      recap: '반응에서 변하는 성질에 맞는 센서를 고르고, 반응이 걸리는 시간에 맞추어 측정 간격을 정해요.',
      summary: '<ul><li>기체 발생 (H₂O₂ 분해, Mg + 산) → <b>기체 압력·부피 센서</b>. 색이 있는 물질 (I₂, 과망가니즈산 이온) → <b>흡광도(색도) 센서</b>. 산·염기 소모 → <b>pH 센서</b>. 이온 수 변화 → <b>전도도 센서</b>. 기체가 빠져나가는 반응 (CaCO₃ + 2HCl) → <b>질량 감소</b>.</li><li>측정 간격: 반응이 걸리는 시간 동안 변화를 놓치지 않을 만큼 점을 얻도록 정해요 (너무 길면 변화를 놓치고, 너무 짧으면 자료가 불필요하게 많아요).</li><li>안전: 보안경과 장갑을 착용하고 환기가 잘 되는 곳에서 실험해요. 실험이 끝난 뒤 남은 물질은 화학 실험실 폐수·폐기물 처리 방법에 따라 처리해요.</li></ul>',
      missions: [
        {
          title: '반응 3개에 알맞은 센서 고르기',
          goal: '🥽 안전 점검을 마치고, 반응 <b>3개 이상</b>에 알맞은 센서·시간 간격·까닭을 골라 설계를 확인해요.',
          hint: '안전 점검 세 가지를 켠 뒤 카드에서 반응을 골라요. 기체가 나오면 기체 센서, 색이 있으면 흡광도, 열린 용기에서 기체가 빠지면 질량, 산·염기 변화는 pH 예요. 점이 10~60개쯤 되는 간격이 좋아요.',
          setup() { S.lock = true; resetDesign(); setMode('design'); },
          check: () => dsDoneN() >= 3, hold: 0.4,
          status: () => '안전 ' + mark(safeAll()) + ' &nbsp; 설계 ' + dsDoneN() + ' / 3',
          explain: 'H₂O₂ 분해와 Mg + HCl 은 기체 센서, CaCO₃ + HCl (열린 용기) 은 질량 센서, I₂ 소모 반응은 흡광도 센서, 중화 반응은 pH(또는 전도도) 센서가 알맞아요. 간격은 반응이 걸리는 시간에 맞추어 정해요.',
        },
        {
          type: 'quiz', title: '질량 센서를 쓰는 까닭',
          goal: '열린 플라스크에서 CaCO₃ + 2HCl 의 반응 속도를 전자저울(질량 센서)로 재는 까닭은?',
          setup() { S.lock = true; setMode('design'); DS().sel = 2; },
          choices: ['생성물인 CaCl₂ 가 기체여서 질량이 늘어나기 때문이에요', '용액의 색이 변해서 질량을 잴 수 있기 때문이에요', '반응이 일어나면 H⁺ 의 질량이 줄기 때문이에요', 'CO₂ 기체가 빠져나가 용기의 질량이 줄어들기 때문이에요'],
          answer: 3,
          feedback: ['CaCl₂ 는 수용액 속에 있는 이온이에요. 기체는 CO₂ 예요.', '색이 아니라 기체가 빠져나가서 생기는 질량 변화를 이용해요.', '반응 전체의 질량은 보존돼요. 빠져나간 기체의 질량만큼 용기의 질량이 줄어요.', ''],
          explain: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂ 에서 CO₂ 가 열린 용기 밖으로 빠져나가요. 그 만큼 <b>용기의 질량이 줄어들므로</b> 시간에 따른 질량 감소로 CO₂ 의 생성 속도(반응 속도)를 알 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-rate-measure', mount: '#game', badge: '반응 속도 측정가', homeHref: '../../index.html#hx',
    featureLabels: { sense: '🧪 센서 측정', avg: '📏 평균 속도', zoom: '🔍 순간 속도 (접선)', coef: '⚗️ 계수와 속도', design: '📟 측정 설계' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  coReset(); setMode('sense');
  function stepAll1(dt) { S.t += dt; stepSense(dt); stepZm(dt); stepCoef(dt); stepDs(dt); S.av.pulse = ap2(S.av.pulse, 1, dt, 2.4); }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'sense') { drawSense(S.t); drawSenseInfo(S.t); }
    else if (S.mode === 'avg') { drawAvg(S.t); drawAvgInfo(S.t); }
    else if (S.mode === 'zoom') { drawZoom(S.t); drawZoomInfo(S.t); }
    else if (S.mode === 'coef') { drawCoef(S.t); drawCoefInfo(S.t); }
    else { drawDesign(S.t); drawDesignInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, TS, CT, AVG, DT, RXN, SENS, INTV, cAt, rateAt, avgRate, volAt, volShown, concFromV, setMode, runSense, runCoef, coCount, coDelta, dsEval, dsPick, dsConfirm, cardRect, PB, GX, GY, checkAvg, checkTan, checkConv, checkCo, dsDoneN, safeAll,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
