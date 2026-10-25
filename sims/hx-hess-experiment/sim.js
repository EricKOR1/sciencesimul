/* =========================================================
   물질과 에너지 Ⅲ. 화학 변화의 자발성 - 중화 반응과 헤스 법칙 [12물에03-02]
   ① 계획: 세 반응(NaOH(s)의 용해 ΔH₁, NaOH(s)+HCl(aq) ΔH₂, 용액끼리의 중화 ΔH₃)을 엔탈피 도표로 연결해 가설 · 통제 변인 · 안전
   ② 실험: 컵 열량계로 세 반응의 온도–시간 그래프를 얻고 냉각 구간을 외삽해 ΔT 를 보정
   ③ 분석: q = c·m·ΔT, n, ΔH = −q/n 계산과 막대 비교 (ΔH₁ + ΔH₃ 와 ΔH₂)
   ④ 결론: 모둠 4개의 ΔH₂ 점도표, 오차 범위 해석, 오차의 원인
   열량계 열용량의 정밀 보정, 이온 활동도는 다루지 않아요. 용액의 밀도 1.0 g/mL, 비열 4.18 J/(g·°C)로 가정해요.
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
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4', SKY = '#0ea5e9';
  const HOT = '#e2553b', COLD = '#2f7fd8';
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
  const f0 = (v) => String(Math.round(v));
  const MINUS = '−';
  const sgn = (v, d) => { const r = Math.round(Math.abs(v) * Math.pow(10, d || 0)) / Math.pow(10, d || 0); const s = r === 0 ? '' : v < 0 ? MINUS : '+'; return s + r.toFixed(d || 0); };
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parseNum(s) {
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '^' + SUP[c]).replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const chipBtn = (txt, aria, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  function bar(x0, x1, y, col, w) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore(); }
  function dline(x0, y0, x1, y1, col, w) { ctx.save(); ctx.strokeStyle = col || 'rgba(100,116,139,.5)'; ctx.lineWidth = w || 1.4; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore(); }
  function stamp(cx, cy, txt, p, col) {           // p: 0~1 진행. 도장
    const sc = 1 + Math.max(0, 0.35 - p) * 2.4;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.2); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, p * 6);
    ctx.font = D.font(22, 800); const w = ctx.measureText(txt).width + 26;
    D.roundRect(-w / 2, -21, w, 42, 10); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = col || GOOD; ctx.lineWidth = 4; ctx.stroke(); T(0, 8, txt, 22, col || GOOD, 'center', 800); ctx.restore();
  }

  const MODE_LABEL = { plan: '📝 세 반응을 연결해 실험을 계획해요', measure: '🌡️ 컵 열량계로 세 반응의 온도를 재요', calc: '🧮 측정값으로 ΔH 를 계산해요', concl: '🔍 헤스 법칙이 성립하는지 판단해요' };

  /* ================= 자료 ================= */
  const CW = 4.18, T0 = 22.0, M_NAOH = 40.0;
  const T_MIX = 30, T_END = 150, T_SPEED = 18, SLOPE = 0.02, DEV = 0.2;     // 냉각 기울기 °C/초, 읽은 최고점이 외삽값보다 0.2 °C 낮음
  const RXN = [
    { k: 'dis', sym: 'ΔH₁', name: 'NaOH(s)의 용해', short: '용해', eq: 'NaOH(s) → Na⁺(aq) + OH⁻(aq)', reag: 'NaOH(s) 2.0 g + 물 100 g', m: 102, n: 0.050, dTc: 4.9, theory: -44, solid: true, ymin: 20, ymax: 30, nline: 'n = 2.0 g / 40.0 g/mol = 0.050 mol', dish: 'NaOH(s) 2.0 g' },
    { k: 'dir', sym: 'ΔH₂', name: 'NaOH(s)와 HCl(aq)의 반응', short: '직접 반응', eq: 'NaOH(s) + H⁺(aq) + Cl⁻(aq) → Na⁺(aq) + Cl⁻(aq) + H₂O(l)', reag: 'NaOH(s) 2.0 g + 0.50 M HCl 100 mL', m: 102, n: 0.050, dTc: 11.4, theory: -102, solid: true, ymin: 20, ymax: 36, nline: 'n = 2.0 g / 40.0 g/mol = 0.050 mol', nline2: 'HCl: 0.50 M × 0.100 L = 0.050 mol (같은 양)', dish: 'NaOH(s) 2.0 g' },
    { k: 'neu', sym: 'ΔH₃', name: '용액끼리의 중화 반응', short: '중화', eq: 'Na⁺(aq) + OH⁻(aq) + H⁺(aq) + Cl⁻(aq) → Na⁺(aq) + Cl⁻(aq) + H₂O(l)', reag: '1.0 M NaOH 50 mL + 1.0 M HCl 50 mL', m: 100, n: 0.050, dTc: 6.5, theory: -57, solid: false, ymin: 20, ymax: 32, nline: 'n = 1.0 mol/L × 0.050 L = 0.050 mol', nline2: 'HCl: 1.0 M × 0.050 L = 0.050 mol (같은 양)', dish: '1.0 M NaOH 50 mL' },
  ];
  RXN.forEach((r) => {                                    // 온도 곡선: 읽은 최고점 = 외삽값 − 0.2 °C 가 되도록 시간 상수를 정해요
    const f = (u) => u * (1 + Math.log(r.dTc / u)) - DEV;
    let lo = 1e-6, hi = r.dTc;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) hi = mid; else lo = mid; }
    r.tau = (lo + hi) / 2 / SLOPE; r.xpk = r.tau * Math.log(r.dTc / (SLOPE * r.tau));
    r.dTo = r.dTc - DEV; r.Tpk = T0 + r.dTo; r.Tex = T0 + r.dTc;
  });
  const tempAt = (r, t) => (t < T_MIX ? T0 : T0 + r.dTc - SLOPE * (t - T_MIX) - r.dTc * Math.exp(-(t - T_MIX) / r.tau));
  const exLine = (r, t) => T0 + r.dTc - SLOPE * (t - T_MIX);                              // 냉각 구간을 연장한 직선
  const qJ = (i) => RXN[i].m * CW * RXN[i].dTc;
  const qkJ = (i) => qJ(i) / 1000;
  const DH = RXN.map((r, i) => -qkJ(i) / r.n);
  const DHr = DH.map((v) => Math.round(v * 10) / 10);                                    // −41.8, −97.2, −54.3
  const SUM = Math.round((DHr[0] + DHr[2]) * 10) / 10;                                   // −96.1
  const DIFF = Math.round(Math.abs(DHr[1] - SUM) * 10) / 10;                              // 1.1
  const PCT = DIFF / Math.abs(DHr[1]) * 100;                                              // 약 1 %
  const GRP = [DHr[1], -95.0, -99.5, -93.8];
  const GMEAN = Math.round(GRP.reduce((a, b) => a + b, 0) / 4 * 10) / 10;               // −96.4
  const GLO = Math.min.apply(null, GRP), GHI = Math.max.apply(null, GRP);
  const pctTh = (i) => Math.abs(DHr[i] - RXN[i].theory) / Math.abs(RXN[i].theory) * 100;

  const HYP = ['ΔH₁ + ΔH₃', 'ΔH₁ − ΔH₃', 'ΔH₃ − ΔH₁', 'ΔH₁ × ΔH₃'];
  const HYP_FB = ['', 'ΔH 는 경로를 따라 더해요. 빼는 식은 도표의 계단과 맞지 않아요.', 'ΔH 는 경로를 따라 더해요. 두 단계의 ΔH 를 빼는 것이 아니에요.', 'ΔH 의 합이 같다는 것이 헤스 법칙이에요. 곱하지 않아요.'];
  const CARDS = [
    { t: '처음 온도를 모두 같게 맞춘다 (22.0 °C)', ok: true },
    { t: 'NaOH 와 HCl 의 양을 같은 몰수(0.050 mol)로 한다', ok: true },
    { t: '같은 컵에 뚜껑을 덮고, 용액의 질량과 온도를 기록한다', ok: true },
    { t: '보안경과 장갑을 끼고 NaOH(s)를 다룬다', ok: true },
    { t: 'ΔH₂ 를 잴 때는 NaOH(s)를 미리 물에 녹여 둔다', ok: false, fb: 'ΔH₂ 는 고체 NaOH 가 HCl 과 바로 반응할 때의 열이에요. 미리 녹이면 ΔH₁ 이 섞여서 따로 잴 수 없어요.' },
    { t: 'NaOH(s)를 저울 위에 오래 올려 두고 천천히 단다', ok: false, fb: 'NaOH(s)는 공기 중의 수분을 빨아들여서 질량이 변해요. 빨리 달아야 해요.' },
  ];
  const VD = [
    { t: '차이 1.1 kJ/mol(약 1 %)이 모둠 사이의 흩어짐(약 6 kJ/mol) 안에 있어요. 오차 범위에서 헤스 법칙이 성립해요.', ok: true },
    { t: '두 값이 정확히 같지 않으므로 헤스 법칙이 성립하지 않아요.', fb: '실제 측정에는 항상 오차가 있어요. 값이 정확히 같은지가 아니라 차이가 오차 범위 안인지를 따져요.' },
    { t: '한 번 잰 값만으로는 성립하는지 알 수 없어요. 두 값이 같아질 때까지 다시 재야 해요.', fb: '모둠 4개의 흩어짐(오차 폭)과 비교하면 판단할 수 있어요. 같아질 때까지 재는 것이 아니라 오차 범위와 비교해요.' },
  ];
  const CAUSE = [
    { t: '컵 밖으로 열이 일부 빠져나가요', ok: true },
    { t: 'NaOH(s)가 수분을 빨아들여 질량이 실제 NaOH 보다 커요', ok: true },
    { t: '헤스 법칙이 실제로는 성립하지 않아요', fb: '헤스 법칙은 성립해요. 값이 작은 까닭은 측정 방법의 한계에서 찾아야 해요.' },
    { t: 'NaOH 와 HCl 이 반응하면서 에너지가 사라져요', fb: '에너지는 사라지지 않아요. 일부가 컵 밖으로 나가 ΔT 에 반영되지 않을 뿐이에요.' },
    { t: '처음 온도를 22.0 °C 로 같게 맞췄어요', fb: '처음 온도를 같게 맞추는 것은 오차를 줄이는 방법이에요. 오차의 원인이 아니에요.' },
  ];
  const NCARD = CARDS.length;

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'plan', sub: 'hyp', fade: 0, lock: false, t: 0,
    pl: { hyp: -1, cards: CARDS.map(() => false), hi: -1, pulse: 0 },
    me: { sel: 0, phase: 'idle', t: 0, done: [false, false, false], ex: [0, 0, 0], exOn: [false, false, false], spawned: false, flash: 0 },
    ca: { sel: 0, q: ['', '', ''], n: ['', '', ''], h: ['', '', ''], okq: [false, false, false], okn: [false, false, false], okh: [false, false, false], solved: [false, false, false], bar: [0, 0, 0], flash: 0 },
    cl: { vd: -1, causes: CAUSE.map(() => false), dots: 0, stamp: 0 },
  };
  let game = null;

  /* ================= ① 실험 계획 ================= */
  const hiOf = () => (S.pl.hi >= 0 ? S.pl.hi : -1);
  function setHi(i) { S.pl.hi = S.pl.hi === i ? -1 : i; S.pl.pulse = 0; Sound.tick(); }
  function drawMini(x, y, w, h, r, t) {                                    // 카드 안의 작은 비커 그림
    const col = r.k === 'dir' ? '#e6ecf6' : r.k === 'dis' ? '#dbeeff' : '#dff0ff';
    D.beaker(x, y + 10, w, h - 10, { level: 0.6, liquid: col, t, wave: 1 });
    if (r.solid) for (let k = 0; k < 5; k++) D.sphere(x + 8 + hash(k, 3) * (w - 16), y + h - 12 - hash(k, 7) * 6, 3.2, '#f4f6fa', { gloss: false, outline: '#b5bccb', outlineWidth: 0.8 });
    else { D.roundRect(x - 12, y - 4, 20, 26, 5); ctx.fillStyle = 'rgba(190,220,250,.85)'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 1.6; ctx.stroke(); }
  }
  function drawPlan(t) {
    const L = RC.L, ch = Math.floor((L.h - 70 - 16) / 3);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '📝 재어 볼 세 가지 반응', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '카드를 누르면 오른쪽 도표에서 그 반응이 강조돼요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    RXN.forEach((r, i) => {
      const y = L.y + 60 + i * (ch + 8), x = L.x + 12, w = L.w - 24, hi = S.pl.hi === i;
      D.roundRect(x, y, w, ch, 12); ctx.fillStyle = hi ? 'rgba(124,58,237,.07)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = hi ? PUR : '#dbe3f3'; ctx.lineWidth = hi ? 2.6 : 1.5; ctx.stroke();
      D.sphere(x + 26, y + 28, 15, i === 1 ? AMB : PUR, { text: String(i + 1), shadow: true });
      T(x + 50, y + 26, r.name, PHONE ? 13.5 : 14.5, INK, 'left', 800);
      T(x + 50, y + 44, r.sym + ' 을 재요', 13, i === 1 ? AMB : PUR, 'left', 800);
      textBlock(x + 14, y + 66, w - 100, r.eq, PHONE ? 12 : 12.5, INK, 17, 700);
      T(x + 14, y + ch - 12, '시약: ' + r.reag, PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
      drawMini(x + w - 62, y + 22, 44, ch - 52, r, t);
    });
  }
  function drawPlanInfo(t) {
    const R = RC.R, P = S.pl;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📊 세 반응의 엔탈피 도표', 14, INK, 'left', 800);
    T(R.x + 14, R.y + 42, '(개념도: 높이는 실제 크기가 아니에요)', 12, MUTED, 'left', 700);
    const r = { x: R.x + 20, y: R.y + 52, w: R.w - 30, h: R.h - 150 };
    const span = r.h - 90, yA = r.y + 56, yB = yA + span * 0.43, yC = yA + span, bw = Math.min(74, (r.w - 70) / 3);
    const xA = r.x + 4, xB = r.x + (r.w - bw) / 2 - 6, xC = r.x + r.w - 34 - bw, xr = r.x + r.w - 6;
    D.arrow(r.x - 2, r.y + r.h - 8, r.x - 2, r.y + 8, { color: '#8a95a8', width: 2, head: 8 });
    T(r.x + 4, r.y + 14, '엔탈피 H', 12, MUTED, 'left', 800);
    const hl = (i) => P.hi === i, one = P.hyp === 0;
    const colOf = (i) => (hl(i) ? PUR : one ? (i === 1 ? AMB : PUR) : '#7d8aa0');
    const wOf = (i) => (hl(i) ? 4.4 : 3.2);
    dline(xA + bw, yA, xr, yA); dline(xA + bw / 2, yB, xB, yB); dline(xB + bw / 2, yC, xC, yC); dline(xB + bw, yC, xr, yC);
    [[xA, yA, ['NaOH(s)', '+ HCl(aq)']], [xB, yB, ['NaOH(aq)', '+ HCl(aq)']], [xC, yC, ['NaCl(aq)', '+ H₂O(l)']]].forEach((b) => {
      bar(b[0], b[0] + bw, b[1], '#4b5d7e');
      b[2].forEach((s, k) => T(b[0] + bw / 2, b[1] - 24 + k * 14, s, 12, INK, 'center', 800, HALO));
    });
    const xa = xA + bw / 2, xb = xB + bw / 2, xd = xr - 4;
    D.arrow(xa, yA + 2, xa, yB - 3, { color: colOf(0), width: wOf(0), head: 10 });
    D.arrow(xb, yB + 2, xb, yC - 3, { color: colOf(2), width: wOf(2), head: 10 });
    D.arrow(xd, yA + 2, xd, yC - 3, { color: colOf(1), width: wOf(1), head: 10 });
    D.label(xa + 6, (yA + yB) / 2, 'ΔH₁', { size: 13, bg: colOf(0), align: 'left' });
    D.label(xb + 6, (yB + yC) / 2, 'ΔH₃', { size: 13, bg: colOf(2), align: 'left' });
    D.label(xd - 6, (yA + yC) / 2 - 40, 'ΔH₂', { size: 13, bg: colOf(1), align: 'right' });
    // 가설 문장
    const by = R.y + R.h - 86;
    D.roundRect(R.x + 10, by, R.w - 20, 76, 12); ctx.fillStyle = one ? 'rgba(124,58,237,.09)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = one ? PUR : '#dbe3f3'; ctx.lineWidth = one ? 2 : 1.5; ctx.stroke();
    T(R.x + 20, by + 22, '💭 내 가설', 12.5, MUTED, 'left', 800);
    T(R.x + 20, by + 46, 'ΔH₂ = ' + (P.hyp >= 0 ? HYP[P.hyp] : '?'), 17, P.hyp < 0 ? '#9aa6bb' : one ? PUR : BAD, 'left', 800);
    T(R.x + 20, by + 66, one ? '바로 가는 길 = 두 단계로 가는 길' : P.hyp > 0 ? '도표의 계단과 비교해 봐요' : '아래 조작판에서 가설을 골라요', 12, MUTED, 'left', 700);
  }

  /* ================= ② 온도 측정 ================= */
  const ME = () => S.me;
  const mSel = () => RXN[ME().sel];
  const mDone = (i) => ME().done[i == null ? ME().sel : i];
  const mTime = () => { const K = ME(); return K.phase === 'run' ? K.t : K.done[K.sel] ? T_END : 0; };
  const CUP = () => { const L = RC.L; return { x: L.x + 38, y: L.y + 118, w: 150, h: 122, cx: L.x + 113 }; };
  function meStop() { const K = ME(); K.phase = 'idle'; K.t = 0; K.spawned = false; }
  function setMe(i) { const K = ME(); if (K.sel !== i || K.phase === 'run') { K.sel = i; meStop(); } updateCtl(); }
  function runMe() {
    const K = ME(); if (K.phase === 'run') return;
    K.phase = 'run'; K.t = 0; K.spawned = false; K.done[K.sel] = false; K.exOn[K.sel] = false; K.ex[K.sel] = 0;
    Sound.click(); updateCtl();
  }
  function doEx() {
    const K = ME(), i = K.sel;
    if (!K.done[i] || K.exOn[i]) { if (!K.done[i]) { showHint('먼저 측정을 마쳐요.'); Sound.fail(); } return; }
    K.exOn[i] = true; Sound.tick(); updateCtl();
  }
  function stepMe(dt) {
    const K = ME(); if (K.flash > 0) K.flash = Math.max(0, K.flash - dt * 1.4);
    for (let i = 0; i < 3; i++) { const tg = K.exOn[i] ? 1 : 0; K.ex[i] = ap2(K.ex[i], tg, dt, 2.6); if (Math.abs(K.ex[i] - tg) < 0.004) K.ex[i] = tg; }
    if (K.phase !== 'run') return;
    K.t = Math.min(T_END, K.t + dt * T_SPEED * (RM ? 3 : 1));
    if (!K.spawned && K.t >= T_MIX) {
      K.spawned = true; Sound.tick();
      const g = CUP(), r = mSel();
      for (let i = 0; i < 18; i++) parts.emit({ x: g.cx - 40 + rnd(-8, 8), y: g.y - 36 - rnd(0, 20), vx: rnd(5, 24), vy: rnd(60, 130), life: 0.55, size: r.solid ? 3.6 : 3, color: r.solid ? '#f1f3f8' : '#a8cdf5', gravity: 320, fade: false });
    }
    if (K.t >= T_END) { K.phase = 'done'; K.done[K.sel] = true; K.flash = 1; Sound.success(); updateCtl(); }
  }
  function drawCup(t, td, Tn) {
    const g = CUP(), K = ME(), r = mSel(), x0 = g.x, y0 = g.y, wTop = g.w, wBot = g.w - 34, hh = g.h, wall = 11;
    const heat = clamp((Tn - T0) / 12, 0, 1);
    const liq = C.mix(r.solid ? (r.k === 'dir' ? '#e6ecf6' : '#d6e9fb') : '#dcecfb', '#ffcf9a', heat);
    const cupPath = (inset) => { ctx.beginPath(); ctx.moveTo(x0 + inset, y0); ctx.lineTo(x0 + wTop - inset, y0); ctx.lineTo(x0 + (wTop + wBot) / 2 - inset, y0 + hh); ctx.lineTo(x0 + (wTop - wBot) / 2 + inset, y0 + hh); ctx.closePath(); };
    D.shadow(() => { cupPath(0); ctx.fillStyle = '#f4f1ea'; ctx.fill(); }, { blur: 10, y: 4 });
    cupPath(0); ctx.strokeStyle = '#c9c3b4'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); cupPath(wall); ctx.clip();
    const ly = y0 + hh * 0.34, gr = ctx.createLinearGradient(0, ly, 0, y0 + hh); gr.addColorStop(0, C.rgba(liq, 0.78)); gr.addColorStop(1, C.rgba(liq, 0.95));
    ctx.fillStyle = '#fbfaf6'; ctx.fillRect(x0, y0, wTop, hh);
    ctx.fillStyle = gr; ctx.fillRect(x0, ly + (RM ? 0 : Math.sin(t * 3) * 1.2), wTop, hh);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x0, ly - 1, wTop, 3);
    // 고체 알갱이는 녹으면서 작아져요
    if (r.solid && td >= T_MIX) { const p = clamp((td - T_MIX - 1) / 12, 0, 1); for (let k = 0; k < 9; k++) { const a = 1 - clamp(p * 1.5 - k * 0.05, 0, 1); if (a <= 0.02) continue; ctx.globalAlpha = a; D.sphere(x0 + 34 + hash(k, 5) * (wBot - 34), y0 + hh - 16 - hash(k + 9, 2) * 8, 4.4, '#f4f6fa', { gloss: false, outline: '#b5bccb', outlineWidth: 0.8 }); ctx.globalAlpha = 1; } }
    ctx.restore();
    cupPath(wall); ctx.strokeStyle = 'rgba(160,150,130,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    const sx = g.cx - 4 + (K.phase === 'run' && td > T_MIX && !RM ? Math.sin(t * 9) * 8 : 0);
    ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, y0 - 46); ctx.lineTo(sx, y0 + hh - 22); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(sx, y0 + hh - 26, 11, 5, 0, 0, TAU); ctx.stroke();
    // 뚜껑
    D.shadow(() => { D.roundRect(x0 - 8, y0 - 9, wTop + 16, 10, 4); ctx.fillStyle = '#e9e4d6'; ctx.fill(); }, { blur: 5, y: 2 });
    D.roundRect(x0 - 8, y0 - 9, wTop + 16, 10, 4); ctx.strokeStyle = '#b9b2a0'; ctx.lineWidth = 1.6; ctx.stroke();
    D.thermometer(g.cx + 38, y0 - 54, 112, Tn, r.ymin, r.ymax, { ticks: false, color: Tn > T0 + 0.05 ? HOT : COLD });
    // 시약 접시: 섞을 때 기울어져 쏟아요
    const p = K.phase === 'run' || mDone() ? clamp((td - (T_MIX - 3)) / 5, 0, 1) : 0, dx = g.cx - 66, dy = y0 - 62;
    const fade = mDone() && K.phase !== 'run' ? 0 : 1 - clamp((td - T_MIX - 8) / 4, 0, 1);
    if (fade > 0.01) {
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(dx, dy); ctx.rotate(-0.95 * sm(p));
      D.roundRect(-26, -12, 52, 24, 5); ctx.fillStyle = r.solid ? '#eef0f5' : 'rgba(190,220,250,.9)'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; ctx.stroke();
      if (p < 0.9) { if (r.solid) for (let k = 0; k < 4; k++) D.sphere(-15 + k * 10, -7, 3.6, '#fff', { gloss: false, outline: '#b5bccb', outlineWidth: 0.8 }); }
      ctx.restore(); ctx.globalAlpha = 1;
      if (K.phase !== 'run' || td < T_MIX - 3) T(dx, dy - 20, r.dish, 12, MUTED, 'center', 800, HALO);
    }
  }
  function drawMeGraph(td) {
    const L = RC.L, K = ME(), i = K.sel, r = mSel(), gx = L.x + 54, gy = L.y + 286, gw = L.w - 74, gh = 134;
    const X = (tt) => gx + tt / T_END * gw, Y = (v) => gy + gh - (clamp(v, r.ymin, r.ymax) - r.ymin) / (r.ymax - r.ymin) * gh;
    ctx.fillStyle = '#fbfdff'; D.roundRect(gx, gy, gw, gh, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let v = r.ymin; v <= r.ymax + 1e-6; v += 2) { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); if ((v - r.ymin) % 4 === 0) T(gx - 7, Y(v) + 4, String(v), 12, MUTED, 'right', 700); }
    for (let tt = 0; tt <= T_END + 1e-6; tt += 30) { ctx.beginPath(); ctx.moveTo(X(tt), gy); ctx.lineTo(X(tt), gy + gh); ctx.stroke(); T(X(tt), gy + gh + 16, String(tt), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    T(gx + gw, gy + gh + 33, '시간 t (초) →', 12.5, MUTED, 'right', 800); T(gx - 6, gy - 7, '온도 (°C)', 12.5, MUTED, 'left', 800);
    dline(X(T_MIX), gy, X(T_MIX), gy + gh, 'rgba(124,58,237,.5)', 1.5);
    T(X(T_MIX) - 4, gy + 13, '섞음', 12, PUR, 'right', 800);
    if (td > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
      ctx.strokeStyle = HOT; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let tt = 0; tt <= td + 1e-6; tt += 1) { const px = X(tt), py = Y(tempAt(r, tt)); tt === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke(); ctx.restore();
      D.sphere(X(td), Y(tempAt(r, td)), 5, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.6 });
    }
    if (mDone(i)) {
      const tp = T_MIX + r.xpk;
      dline(gx, Y(T0), X(T_MIX + 52), Y(T0), 'rgba(38,50,74,.5)', 1.4);
      D.sphere(X(tp), Y(r.Tpk), 4.5, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.2 });
      T(X(tp) + 8, Y(r.Tpk) + 16, '읽은 최고 ' + f1(r.Tpk) + ' °C', 12, PUR, 'left', 800, HALO);
      const e = K.ex[i];
      if (e > 0.001) {                                               // 냉각 구간을 섞은 시각까지 거꾸로 연장 (점선)
        const tEnd = T_END - (T_END - T_MIX) * sm(e);
        ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip(); ctx.strokeStyle = AMB; ctx.lineWidth = 2.6; ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.moveTo(X(T_END), Y(exLine(r, T_END))); ctx.lineTo(X(tEnd), Y(exLine(r, tEnd))); ctx.stroke(); ctx.restore();
        if (e > 0.98) {
          const yE = Y(r.Tex), yP = Y(r.Tpk);
          D.sphere(X(T_MIX), yE, 5.5, AMB, { gloss: false, outline: '#fff', outlineWidth: 1.6 });
          D.arrow(X(T_MIX) - 12, Y(T0), X(T_MIX) - 12, yE + 3, { color: PUR, width: 3, head: 8 });
          D.label(X(T_MIX) + 12, (yE + Y(T0)) / 2 - 14, '외삽 ΔT = ' + f1(r.dTc) + ' °C', { size: 12.5, bg: AMB, align: 'left' });
          void yP;
        }
      }
    }
  }
  function drawMe(t) {
    const L = RC.L, K = ME(), r = mSel(), td = mTime(), Tn = tempAt(r, td);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 컵 열량계 (스타이로폼 컵 + 뚜껑 + 온도 센서)', PHONE ? 13 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, r.sym + ' · ' + r.reag, PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    drawCup(t, td, Tn);
    const bx = L.x + 250, by = L.y + 84;
    D.roundRect(bx, by, L.w - 250 - 14, 146, 12); ctx.fillStyle = '#f3f6fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    T(bx + 12, by + 24, '🌡️ 온도 센서', 13, MUTED, 'left', 800);
    T(bx + 12, by + 62, f1(Tn) + ' °C', 30, INK, 'left', 800);
    T(bx + 12, by + 88, 't = ' + f0(td) + ' 초', 14, MUTED, 'left', 800);
    const stTxt = K.phase === 'run' ? (td < T_MIX ? '처음 온도를 재는 중' : '반응 중') : mDone() ? '측정 끝' : '대기 중';
    D.label(bx + 12, by + 116, stTxt, { size: 12.5, bg: K.phase === 'run' ? PUR : mDone() ? GOOD : '#8a95a8', align: 'left' });
    drawMeGraph(td);
    const msg = !mDone() ? (K.phase === 'run' ? '섞은 뒤 온도가 오르고, 곧 서서히 내려가요. 그래프를 지켜봐요.' : '「측정 시작」을 누르면 30초 동안 처음 온도를 잰 뒤 시약을 섞어요.')
      : K.exOn[K.sel] ? '냉각 구간을 섞은 시각(30초)까지 연장하면 열 손실이 없었을 때의 ΔT 를 알 수 있어요.' : '최고점은 열이 빠져나가기 시작한 뒤의 값이에요. 「외삽선 그리기」로 보정해요.';
    textBlock(L.x + 14, L.y + 468, L.w - 28, msg, 13, INK, 18, 800);
    if (K.flash > 0) { ctx.fillStyle = 'rgba(20,160,88,' + (K.flash * 0.12) + ')'; D.roundRect(L.x, L.y, L.w, L.h, 14); ctx.fill(); }
  }
  function drawMeInfo(t) {
    const R = RC.R, K = ME();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 측정 기록', 14.5, INK, 'left', 800);
    // 표 머리
    const cols = PHONE ? [R.x + 14, R.x + 150, R.x + 232, R.x + 318, R.x + 398] : [R.x + 12, R.x + 104, R.x + 158, R.x + 212, R.x + 270];
    const hd = ['반응', 'm (g)', 'T₀', '최고', 'ΔT'];
    D.roundRect(R.x + 8, R.y + 38, R.w - 16, 26, 8); ctx.fillStyle = '#eef1f8'; ctx.fill();
    hd.forEach((s, k) => T(cols[k] + (k ? 0 : 0), R.y + 56, s, 12.5, MUTED, k === 0 ? 'left' : 'center', 800, null));
    // 가운데 정렬용 보정: 숫자열은 중심 좌표
    const cx = (k) => (k === 0 ? cols[0] : cols[k] + (PHONE ? 0 : 0));
    RXN.forEach((r, i) => {
      const y = R.y + 92 + i * 38, d = K.done[i], ex = K.exOn[i] && K.ex[i] > 0.9, sel = i === K.sel;
      if (sel) { D.roundRect(R.x + 8, y - 20, R.w - 16, 34, 8); ctx.fillStyle = 'rgba(124,58,237,.08)'; ctx.fill(); }
      T(cx(0), y, r.sym, 14, INK, 'left', 800);
      T(cols[1], y, d ? String(r.m) : '—', 13.5, d ? INK : '#9aa6bb', 'center', 800);
      T(cols[2], y, d ? f1(T0) : '—', 13.5, d ? INK : '#9aa6bb', 'center', 800);
      T(cols[3], y, d ? f1(r.Tpk) : '—', 13.5, d ? INK : '#9aa6bb', 'center', 800);
      T(cols[4], y, ex ? f1(r.dTc) : d ? '?' : '—', 13.5, ex ? PUR : '#9aa6bb', 'center', 800);
    });
    let y = R.y + 92 + 3 * 38 + 4;
    const i = K.sel, r = RXN[i], d = K.done[i], ex = K.exOn[i] && K.ex[i] > 0.9;
    D.roundRect(R.x + 10, y, R.w - 20, 120, 10); ctx.fillStyle = ex ? 'rgba(217,119,6,.08)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = ex ? 'rgba(217,119,6,.55)' : '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    T(R.x + 20, y + 22, r.sym + ' 의 온도 변화', 13.5, INK, 'left', 800);
    T(R.x + 20, y + 46, '읽은 값  ΔT = ' + (d ? f1(r.Tpk) + ' − ' + f1(T0) + ' = ' + f1(r.dTo) + ' °C' : '—'), 13, d ? INK : '#9aa6bb', 'left', 800);
    T(R.x + 20, y + 70, '외삽한 값  ΔT = ' + (ex ? f1(r.Tex) + ' − ' + f1(T0) + ' = ' + f1(r.dTc) + ' °C' : '—'), 13, ex ? AMB : '#9aa6bb', 'left', 800);
    textBlock(R.x + 20, y + 94, R.w - 40, ex ? '외삽한 값이 ' + f1(DEV) + ' °C 더 커요. 이 값을 계산에 써요.' : d ? '외삽선을 그려 ΔT 를 보정해요.' : '측정을 마치면 값이 채워져요.', 12.5, MUTED, 16, 700);
    y += 134;
    const by = R.y + R.h - 90;
    if (y + 20 < by) {
      D.roundRect(R.x + 10, by, R.w - 20, 80, 10); ctx.fillStyle = 'rgba(217,119,6,.09)'; ctx.fill(); ctx.strokeStyle = 'rgba(217,119,6,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
      T(R.x + 20, by + 20, '🥽 안전과 폐기', 13, AMB, 'left', 800);
      textBlock(R.x + 20, by + 38, R.w - 40, 'NaOH 는 부식성이에요. 보안경과 장갑을 쓰고, 남은 용액은 중화한 뒤 교사의 안내대로 폐수 처리해요.', 12, INK, 16, 700);
    }
  }

  /* ================= ③ ΔH 계산 ================= */
  const CA = () => S.ca;
  const caAll = () => CA().solved.every((v) => v);
  function caCheck() {
    const A = CA(), i = A.sel;
    const was = A.solved[i];
    A.okq[i] = A.q[i] !== '' && near(parseNum(A.q[i]), qkJ(i), 0.03);
    A.okn[i] = A.n[i] !== '' && near(parseNum(A.n[i]), RXN[i].n, 0.0006);
    A.okh[i] = A.h[i] !== '' && near(parseNum(A.h[i]), DH[i], 0.6);
    A.solved[i] = A.okq[i] && A.okn[i] && A.okh[i];
    if (A.solved[i] && !was) { Sound.success(); A.flash = 1; const L = RC.L; parts.burst(L.x + L.w / 2, L.y + 150, { count: 16, speed: 140, life: 0.7, size: 3.8 }); }
  }
  function setCa(i) {
    const A = CA(); A.sel = i; Sound.tick();
    $('#cq').value = A.q[i]; $('#cn').value = A.n[i]; $('#ch').value = A.h[i];
    ['#cq', '#cn', '#ch'].forEach((id) => $(id).classList.remove('bad'));
    updateCtl();
  }
  function stepCa(dt) {
    const A = CA(); if (A.flash > 0) A.flash = Math.max(0, A.flash - dt * 1.4);
    for (let i = 0; i < 3; i++) { const tg = A.solved[i] ? 1 : 0; A.bar[i] = ap2(A.bar[i], tg, dt, 3); if (Math.abs(A.bar[i] - tg) < 0.003) A.bar[i] = tg; }
  }
  function drawStepBox(x, y, w, h, ok, head, lines) {
    D.roundRect(x, y, w, h, 12); ctx.fillStyle = ok ? 'rgba(20,160,88,.07)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = ok ? GOOD : '#dbe3f3'; ctx.lineWidth = ok ? 2 : 1.5; ctx.stroke();
    T(x + 12, y + 22, head, 13.5, ok ? '#0f6b3c' : INK, 'left', 800);
    lines.forEach((ln, k) => T(x + 12, y + 44 + k * 21, ln[0], 13.5, ok ? ln[1] || '#0f6b3c' : MUTED, 'left', 800));
    if (ok) D.check(x + w - 20, y + 20, 10, 1);
  }
  function drawCalc(t) {
    const L = RC.L, A = CA(), i = A.sel, r = RXN[i];
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧮 ' + r.sym + ' 구하기 · ' + r.name, PHONE ? 13.5 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '측정 기록: 용액 ' + r.m + ' g · 처음 ' + f1(T0) + ' °C · 외삽한 ΔT = ' + f1(r.dTc) + ' °C', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const x = L.x + 12, w = L.w - 24, qk = qkJ(i);
    drawStepBox(x, L.y + 60, w, 92, A.okq[i], '① 용액이 얻은 열  q = c · m · ΔT', [
      ['= 4.18 × ' + r.m + ' × ' + f1(r.dTc) + (A.okq[i] ? ' = ' + f0(qJ(i)) + ' J' : ''), A.okq[i] ? '#0f6b3c' : MUTED],
      [A.okq[i] ? '= ' + qk.toFixed(2) + ' kJ' : '= ? kJ', A.okq[i] ? '#0f6b3c' : '#9aa6bb']]);
    drawStepBox(x, L.y + 162, w, 70, A.okn[i], '② 반응한 NaOH 의 양  n', [[A.okn[i] ? r.nline : 'n = ? mol', A.okn[i] ? '#0f6b3c' : '#9aa6bb']].concat(A.okn[i] && r.nline2 ? [[r.nline2, '#0f6b3c']] : []));
    drawStepBox(x, L.y + 242, w, 92, A.okh[i], '③ 반응의 엔탈피 변화  ΔH = −q / n', [
      [A.okh[i] ? '= −(' + qk.toFixed(2) + ' kJ) / ' + r.n.toFixed(3) + ' mol' : '= −q / n', A.okh[i] ? '#0f6b3c' : MUTED],
      [A.okh[i] ? '= ' + sgn(DHr[i], 1) + ' kJ/mol' : '= ? kJ/mol', A.okh[i] ? HOT : '#9aa6bb']]);
    const by = L.y + 346;
    if (A.solved[i]) {
      D.roundRect(x, by, w, 88, 12); ctx.fillStyle = 'rgba(124,58,237,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      T(x + 12, by + 22, '이론값 ' + sgn(r.theory, 0) + ' kJ/mol 과 비교', 13.5, PUR, 'left', 800);
      T(x + 12, by + 46, '차이 ' + f1(pctTh(i)) + ' %  (측정값의 크기가 조금 작아요)', 13.5, INK, 'left', 800);
      textBlock(x + 12, by + 66, w - 24, '열이 일부 컵 밖으로 빠져나가 ΔT 가 실제보다 작게 측정되기 때문이에요.', 12.5, MUTED, 16, 700);
    } else {
      textBlock(x + 4, by + 16, w - 8, 'ΔT 가 양수이면 용액이 열을 얻었어요(q > 0). 반응은 그 열을 내놓았으니 ΔH 는 음수예요. 오른쪽 조작판에 세 값을 적어요.', 13, MUTED, 18, 700);
    }
    T(L.x + 14, L.y + L.h - 18, 'ΔH 를 구한 반응 ' + A.solved.filter((v) => v).length + ' / 3', 13, caAll() ? GOOD : MUTED, 'left', 800);
    if (A.flash > 0) { ctx.fillStyle = 'rgba(20,160,88,' + (A.flash * 0.12) + ')'; D.roundRect(L.x, L.y, L.w, L.h, 14); ctx.fill(); }
  }
  function drawCalcInfo(t) {
    const R = RC.R, A = CA();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📊 ΔH₁ + ΔH₃ 와 ΔH₂', 14, INK, 'left', 800);
    T(R.x + 14, R.y + 42, '막대는 0 에서 아래로 길어져요 (kJ/mol)', 12, MUTED, 'left', 700);
    const top = R.y + 70, bot = R.y + R.h - 96, VM = -110, Y = (v) => top + (v / VM) * (bot - top);
    const ax = R.x + 52, aw = R.w - 64;
    ctx.strokeStyle = '#eef1f7'; ctx.lineWidth = 1;
    for (let v = 0; v >= VM + 1e-6; v -= 20) { ctx.beginPath(); ctx.moveTo(ax, Y(v)); ctx.lineTo(ax + aw, Y(v)); ctx.stroke(); T(ax - 6, Y(v) + 4, v === 0 ? '0' : MINUS + Math.abs(v), 12, MUTED, 'right', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(ax, top - 6); ctx.lineTo(ax, bot); ctx.stroke();
    const bw = Math.min(62, aw * 0.27), x1 = ax + aw * 0.2 - bw / 2 + 6, x2 = ax + aw * 0.66 - bw / 2;
    const b1 = A.bar[0], b3 = A.bar[2], b2 = A.bar[1];
    const seg = (x, v0, v1, col) => { if (Math.abs(v1 - v0) < 0.05) return; const ya = Y(v0), yb = Y(v1); D.roundRect(x, Math.min(ya, yb), bw, Math.abs(yb - ya), 3); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.stroke(); };
    const e1 = DHr[0] * b1, e3 = DHr[2] * b3;
    seg(x1, 0, e1, 'rgba(124,58,237,.78)'); seg(x1, e1, e1 + e3, 'rgba(56,103,244,.78)');
    seg(x2, 0, DHr[1] * b2, 'rgba(217,119,6,.82)');
    if (b1 > 0.9) T(x1 + bw / 2, Y(DHr[0] / 2) + 5, 'ΔH₁', 12.5, '#fff', 'center', 800);
    if (b3 > 0.9) T(x1 + bw / 2, Y(DHr[0] + DHr[2] / 2) + 5, 'ΔH₃', 12.5, '#fff', 'center', 800);
    if (b2 > 0.9) T(x2 + bw / 2, Y(DHr[1] / 2) + 5, 'ΔH₂', 12.5, '#fff', 'center', 800);
    const sumShown = b1 > 0.9 && b3 > 0.9;
    T(x1 + bw / 2, bot + 20, 'ΔH₁ + ΔH₃', 12.5, INK, 'center', 800);
    T(x2 + bw / 2, bot + 20, 'ΔH₂', 12.5, INK, 'center', 800);
    if (sumShown) { T(x1 + bw / 2, Y(SUM) + 18, sgn(SUM, 1), 13, PUR, 'center', 800, HALO); dline(x1, Y(SUM), x2 + bw + 6, Y(SUM), PUR, 1.6); }
    if (b2 > 0.9) T(x2 + bw / 2, Y(DHr[1]) + 18, sgn(DHr[1], 1), 13, AMB, 'center', 800, HALO);
    if (sumShown && b2 > 0.9) {
      const ya = Y(SUM), yb = Y(DHr[1]), xb = x2 + bw + 8;
      ctx.strokeStyle = BAD; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(xb - 5, ya); ctx.lineTo(xb, ya); ctx.lineTo(xb, yb); ctx.lineTo(xb - 5, yb); ctx.stroke();
      T(R.x + R.w - 8, Math.max(ya, yb) + 16, '차이 ' + f1(DIFF), 12.5, BAD, 'right', 800, HALO);
    }
    const msg = caAll() ? '차이 ' + f1(DIFF) + ' kJ/mol (' + '약 ' + f0(PCT) + ' %). 거의 같아요! 다음 단계에서 이 차이가 오차 범위 안인지 따져 봐요.' : '세 반응의 ΔH 를 구하면 막대가 채워져요.';
    textBlock(R.x + 14, R.y + R.h - 62, R.w - 28, msg, 12.5, caAll() ? '#0f6b3c' : MUTED, 17, 800);
  }

  /* ================= ④ 결론·오차 ================= */
  const CL = () => S.cl;
  const vdOk = () => CL().vd >= 0 && !!VD[CL().vd].ok;
  const causeSet = () => CAUSE.map((c, i) => (CL().causes[i] ? i : -1)).filter((i) => i >= 0);
  function stepCl(dt) {
    const K = CL(); K.dots = ap2(K.dots, 1, dt, 1.5); if (K.dots > 0.995) K.dots = 1;
    if (K.stamp > 0) K.stamp = Math.max(0, K.stamp - dt);
  }
  function pickVd(i) {
    const K = CL(); K.vd = i; Sound.tick();
    if (VD[i].ok) { K.stamp = 1.1; Sound.success(); parts.burst(RC.L.x + RC.L.w / 2, RC.L.y + 250, { count: 20, speed: 170, life: 0.8, size: 4 }); }
    updateCtl();
  }
  function toggleCause(i) { const K = CL(); K.causes[i] = !K.causes[i]; Sound.tick(); updateCtl(); }
  function drawConcl(t) {
    const L = RC.L, K = CL();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔍 네 모둠이 잰 ΔH₂ (kJ/mol)', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '같은 방법으로 잰 값도 모둠마다 조금씩 달라요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const px = L.x + 28, pw = L.w - 56, py = L.y + 70, ph = 262, lo = -102, hi = -90;
    const X = (v) => px + (v - lo) / (hi - lo) * pw;
    D.roundRect(px - 10, py, pw + 20, ph, 10); ctx.fillStyle = '#fbfdff'; ctx.fill();
    // 눈금
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let v = lo; v <= hi + 1e-6; v += 2) { ctx.beginPath(); ctx.moveTo(X(v), py + 8); ctx.lineTo(X(v), py + ph - 30); ctx.stroke(); T(X(v), py + ph - 12, (v < 0 ? MINUS : '') + Math.abs(v), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(px - 4, py + ph - 30); ctx.lineTo(px + pw + 6, py + ph - 30); ctx.stroke();
    // 흩어짐 띠
    const bandA = clamp(K.dots * 1.2 - 0.2, 0, 1);
    if (bandA > 0) { ctx.globalAlpha = bandA; D.roundRect(X(GLO), py + 8, X(GHI) - X(GLO), ph - 38, 8); ctx.fillStyle = 'rgba(124,58,237,.10)'; ctx.fill(); ctx.globalAlpha = 1;
      if (bandA > 0.8) { T((X(GLO) + X(GHI)) / 2, py + 24, '흩어짐 ' + f1(GHI - GLO) + ' kJ/mol', 12.5, PUR, 'center', 800); } }
    // ΔH₁ + ΔH₃ 선
    dline(X(SUM), py + 36, X(SUM), py + ph - 30, AMB, 2.4);
    T(X(SUM), py + 48, 'ΔH₁ + ΔH₃ = ' + sgn(SUM, 1), 12.5, AMB, 'center', 800, HALO);
    // 점
    const names = ['1모둠 (우리)', '2모둠', '3모둠', '4모둠'];
    GRP.forEach((v, i) => {
      const y = py + 84 + i * 40, p = sm(clamp(K.dots * 1.6 - i * 0.18, 0, 1));
      if (p <= 0) return;
      const yy = y - (1 - p) * 50;
      ctx.globalAlpha = p; dline(px, y + 14, X(v), y + 14, 'rgba(100,116,139,.25)', 1);
      D.sphere(X(v), yy, 10, i === 0 ? PUR : '#4b5d7e', { shadow: true });
      T(X(v), yy - 17, sgn(v, 1), 12.5, INK, 'center', 800, HALO);
      ctx.globalAlpha = 1;
      T(px, y + 6, names[i], 12, i === 0 ? PUR : MUTED, 'left', 800, HALO);
    });
    // 평균·차이 안내
    const by = L.y + 346;
    D.roundRect(L.x + 12, by, L.w - 24, L.h - 346 - 12, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    T(L.x + 26, by + 24, '네 모둠 평균  ' + sgn(GMEAN, 1) + ' kJ/mol', 13.5, INK, 'left', 800);
    T(L.x + 26, by + 46, '우리 모둠: ΔH₁ + ΔH₃ = ' + sgn(SUM, 1) + ',  ΔH₂ = ' + sgn(DHr[1], 1), 13.5, INK, 'left', 800);
    textBlock(L.x + 26, by + 68, L.w - 52, '두 값의 차이 ' + f1(DIFF) + ' kJ/mol 과 모둠 사이의 흩어짐 ' + f1(GHI - GLO) + ' kJ/mol 을 비교해 봐요.', 12.5, MUTED, 16, 700);
    if (K.stamp > 0) stamp(L.x + L.w - 100, L.y + 130, '성립!', 1 - K.stamp / 1.1, GOOD);
    else if (vdOk()) stamp(L.x + L.w - 100, L.y + 130, '성립!', 1, GOOD);
  }
  function drawConclInfo(t) {
    const R = RC.R, K = CL();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📝 결과 정리', 14.5, INK, 'left', 800);
    const rows = [['ΔH₁ (용해)', sgn(DHr[0], 1)], ['ΔH₃ (중화)', sgn(DHr[2], 1)], ['ΔH₁ + ΔH₃', sgn(SUM, 1)], ['ΔH₂ (직접)', sgn(DHr[1], 1)], ['차이', f1(DIFF) + ' (약 ' + f0(PCT) + ' %)']];
    rows.forEach((r, i) => { const hot = i === 2 || i === 3; T(R.x + 14, R.y + 54 + i * 24, r[0], 13.5, hot ? AMB : INK, 'left', 800); T(R.x + R.w - 14, R.y + 54 + i * 24, r[1], 14, hot ? AMB : INK, 'right', 800); });
    ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(R.x + 12, R.y + 54 + 2 * 24 - 18); ctx.lineTo(R.x + R.w - 12, R.y + 54 + 2 * 24 - 18); ctx.stroke();
    const y = R.y + 54 + 5 * 24 + 6;
    const lines = ['개선하는 방법', '• 뚜껑과 단열을 잘해 열 손실을 줄여요.', '• 반응 열이 더 큰 양(더 많은 몰수)으로 재면 ΔT 가 커서 상대 오차가 줄어요.', '• NaOH(s)를 빨리 달고, 여러 번 재어 평균을 내요.'];
    let yy = y; D.roundRect(R.x + 10, yy, R.w - 20, Math.min(R.h - (yy - R.y) - 12, 170), 10); ctx.fillStyle = vdOk() ? 'rgba(20,160,88,.07)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = vdOk() ? GOOD : '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    T(R.x + 20, yy + 22, lines[0], 13.5, vdOk() ? '#0f6b3c' : MUTED, 'left', 800); yy += 46;
    if (vdOk()) { for (let k = 1; k < lines.length; k++) yy += textBlock(R.x + 20, yy, R.w - 40, lines[k], 12.5, INK, 16, 700) + 6; }
    else textBlock(R.x + 20, yy, R.w - 40, '결과를 판정하면 오차를 줄이는 방법이 나타나요.', 12.5, '#9aa6bb', 16, 700);
  }

  /* ================= 조작판 ================= */
  const setSub = (s) => { S.sub = s; updateCtl(); };
  function buildCtl() {
    HYP.forEach((h, i) => $('#hypChips').appendChild(chipBtn(h, '가설 ' + h, () => { S.pl.hyp = i; S.pl.pulse = 0; updateCtl(); })));
    RXN.forEach((r, i) => { $('#msChips').appendChild(chipBtn(r.sym + ' ' + r.name, r.name, () => setMe(i))); $('#caChips').appendChild(chipBtn(r.sym + ' ' + r.name, r.name, () => setCa(i))); });
    CARDS.forEach((c, i) => { const b = chipBtn(c.t, c.t, () => { S.pl.cards[i] = !S.pl.cards[i]; updateCtl(); }, 'opt'); b.dataset.i = i; $('#ctlList').appendChild(b); });
    VD.forEach((v, i) => { const b = chipBtn(v.t, v.t, () => pickVd(i), 'opt'); b.dataset.i = i; $('#vdList').appendChild(b); });
    CAUSE.forEach((c, i) => { const b = chipBtn(c.t, c.t, () => toggleCause(i), 'opt'); b.dataset.i = i; $('#csList').appendChild(b); });
  }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => {
      let show = n.getAttribute('data-show') === S.mode;
      const sub = n.getAttribute('data-sub');
      if (show && sub && S.lock && S.sub !== sub) show = false;
      n.hidden = !show;
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#hypChips button').forEach((b, k) => b.classList.toggle('on', S.pl.hyp === k));
    $('#hypShow').textContent = S.pl.hyp >= 0 ? HYP[S.pl.hyp] : '□';
    $$('#ctlList .opt').forEach((b, k) => b.classList.toggle('on', S.pl.cards[k]));
    const K = ME();
    $$('#msChips button').forEach((b, k) => { b.classList.toggle('on', k === K.sel); b.classList.toggle('done', K.done[k]); });
    $('#bMsRun').textContent = K.phase === 'run' ? '⏳ 측정 중…' : K.done[K.sel] ? '↻ 다시 측정' : '▶ 측정 시작'; $('#bMsRun').disabled = K.phase === 'run';
    $('#bMsEx').disabled = !K.done[K.sel] || K.exOn[K.sel]; $('#bMsEx').textContent = K.exOn[K.sel] ? '✔ 외삽 완료' : '📐 외삽선 그리기';
    $('#msNote').textContent = '완성한 측정 ' + K.done.filter((v) => v).length + ' / 3 · 외삽한 측정 ' + K.exOn.filter((v) => v).length + ' / 3';
    const A = CA();
    $$('#caChips button').forEach((b, k) => { b.classList.toggle('on', k === A.sel); b.classList.toggle('done', A.solved[k]); });
    [['#cq', 'okq'], ['#cn', 'okn'], ['#ch', 'okh']].forEach(([id, key]) => { const inp = $(id); inp.classList.toggle('ok', A[key][A.sel]); });
    $$('#vdList .opt').forEach((b, k) => { const on = CL().vd === k; b.classList.toggle('ok', on && !!VD[k].ok); b.classList.toggle('no', on && !VD[k].ok); });
    $$('#csList .opt').forEach((b, k) => b.classList.toggle('on', CL().causes[k]));
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); if (m === 'concl') CL().dots = 0; } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bMsRun').addEventListener('click', runMe);
  $('#bMsEx').addEventListener('click', doEx);
  $('#cq').addEventListener('input', (e) => { const A = CA(); A.q[A.sel] = e.target.value; e.target.classList.remove('bad'); const w = A.okq[A.sel]; caCheck(); if (A.okq[A.sel] && !w) Sound.tick(); updateCtl(); });
  $('#cn').addEventListener('input', (e) => { const A = CA(); A.n[A.sel] = e.target.value; e.target.classList.remove('bad'); const w = A.okn[A.sel]; caCheck(); if (A.okn[A.sel] && !w) Sound.tick(); updateCtl(); });
  $('#ch').addEventListener('input', (e) => { const A = CA(); A.h[A.sel] = e.target.value; e.target.classList.remove('bad'); const w = A.okh[A.sel]; caCheck(); if (A.okh[A.sel] && !w) Sound.tick(); updateCtl(); });
  $('#cq').addEventListener('change', (e) => {
    const A = CA(), i = A.sel, v = parseNum(e.target.value); if (e.target.value === '' || A.okq[i]) return; shakeBad(e.target);
    if (near(Math.abs(v), qJ(i), 40)) showHint('kJ 단위로 적어요. 1 kJ = 1000 J 이에요.');
    else if (near(Math.abs(v), RXN[i].m * CW * RXN[i].dTo / 1000, 0.03)) showHint('읽은 최고점이 아니라 외삽으로 보정한 ΔT (' + f1(RXN[i].dTc) + ' °C)를 써요.');
    else showHint('q = 4.18 × ' + RXN[i].m + ' × ΔT 를 J 로 구한 뒤 kJ 로 바꿔요.');
  });
  $('#cn').addEventListener('change', (e) => {
    const A = CA(), i = A.sel; if (e.target.value === '' || A.okn[i]) return; shakeBad(e.target);
    showHint(i === 2 ? 'n = 몰 농도 × 부피(L) = 1.0 mol/L × 0.050 L 예요.' : 'NaOH 2.0 g 은 몇 mol 일까요? n = 질량 / 몰질량 = 2.0 / 40.0 이에요.');
  });
  $('#ch').addEventListener('change', (e) => {
    const A = CA(), i = A.sel, v = parseNum(e.target.value); if (e.target.value === '' || A.okh[i]) return; shakeBad(e.target);
    if (near(v, -DH[i], 0.6)) showHint('부호를 확인해요. 용액의 온도가 올랐으니 반응은 열을 내놓았어요. 발열이므로 ΔH < 0 이에요.');
    else if (near(Math.abs(v), qkJ(i), 0.1)) showHint('q 를 n 으로 나눠야 kJ/mol 이 돼요. ΔH = −q / n 이에요.');
    else showHint('ΔH = −q / n 이에요. q = ' + qkJ(i).toFixed(2) + ' kJ, n = ' + RXN[i].n.toFixed(3) + ' mol 을 써요.');
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'plan') { S.pl.hyp = -1; S.pl.cards = CARDS.map(() => false); S.pl.hi = -1; }
    else if (S.mode === 'measure') { meStop(); const K = ME(); K.done = [false, false, false]; K.exOn = [false, false, false]; K.ex = [0, 0, 0]; }
    else if (S.mode === 'calc') { const A = CA(); A.q = ['', '', '']; A.n = ['', '', '']; A.h = ['', '', '']; A.okq = [false, false, false]; A.okn = [false, false, false]; A.okh = [false, false, false]; A.solved = [false, false, false]; A.bar = [0, 0, 0]; $('#cq').value = ''; $('#cn').value = ''; $('#ch').value = ''; }
    else { const K = CL(); K.vd = -1; K.causes = CAUSE.map(() => false); K.dots = 0; K.stamp = 0; }
    updateCtl();
  });
  /* 카드 누르기 (실험 계획) */
  const cardRect = (i) => { const L = RC.L, ch = Math.floor((L.h - 70 - 16) / 3); return { x: L.x + 12, y: L.y + 60 + i * (ch + 8), w: L.w - 24, h: ch }; };
  SciSim.pointer(view, {
    down(p) { if (S.mode !== 'plan') return false; for (let i = 0; i < 3; i++) if (inRect(p, cardRect(i))) { setHi(i); break; } return false; },
    hover(p) { if (S.mode !== 'plan') return null; for (let i = 0; i < 3; i++) if (inRect(p, cardRect(i))) return 'pointer'; return null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'plan') { L1 = '내 가설'; a = S.pl.hyp >= 0 ? 'ΔH₂ = ' + HYP[S.pl.hyp] : '—'; L2 = '고른 준비'; b = S.pl.cards.filter((v) => v).length + ' / ' + NCARD; L3 = '재어 볼 반응'; c = '3가지'; }
    else if (S.mode === 'measure') { const K = ME(), r = mSel(), td = mTime(); L1 = '온도'; a = f1(tempAt(r, td)) + ' °C'; L2 = 'ΔT (읽은 값 → 외삽)'; b = K.done[K.sel] ? f1(r.dTo) + (K.exOn[K.sel] && K.ex[K.sel] > 0.9 ? ' → ' + f1(r.dTc) : '') + ' °C' : '—'; L3 = '측정한 반응'; c = K.done.filter((v) => v).length + ' / 3'; }
    else if (S.mode === 'calc') { const A = CA(), i = A.sel; L1 = '고른 반응'; a = RXN[i].sym + ' ' + RXN[i].short; L2 = 'ΔH'; b = A.okh[i] ? sgn(DHr[i], 1) + ' kJ/mol' : '?'; L3 = 'ΔH 를 구한 반응'; c = A.solved.filter((v) => v).length + ' / 3'; }
    else { L1 = 'ΔH₁ + ΔH₃'; a = sgn(SUM, 1) + ' kJ/mol'; L2 = 'ΔH₂'; b = sgn(DHr[1], 1) + ' kJ/mol'; L3 = '차이'; c = f1(DIFF) + ' kJ/mol'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const resetPl = () => { S.pl.hyp = -1; S.pl.cards = CARDS.map(() => false); S.pl.hi = -1; };
  const resetMe = () => { meStop(); const K = ME(); K.done = [false, false, false]; K.exOn = [false, false, false]; K.ex = [0, 0, 0]; K.sel = 0; };
  const resetCa = () => { const A = CA(); A.q = ['', '', '']; A.n = ['', '', '']; A.h = ['', '', '']; A.okq = [false, false, false]; A.okn = [false, false, false]; A.okh = [false, false, false]; A.solved = [false, false, false]; A.bar = [0, 0, 0]; A.sel = 0; $('#cq').value = ''; $('#cn').value = ''; $('#ch').value = ''; };
  const resetCl = () => { const K = CL(); K.vd = -1; K.causes = CAUSE.map(() => false); K.dots = 0; K.stamp = 0; };
  const levels = [
    {
      title: '실험 계획: 세 반응 연결하기', short: '실험 계획', icon: '📝', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 세 가지 서로 다른 반응의 열을 따로 재면 헤스 법칙이 정말 맞을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 헤스 법칙(반응 경로가 달라도 ΔH 의 합은 같다)과 컵 열량계로 ΔH 를 구하는 방법(q = c·m·ΔT, ΔH = −q / n)을 배웠어요. 이번에는 실제 실험 자료로 헤스 법칙을 확인해요.</div>' +
        '<p>고체 수산화 나트륨 NaOH(s)와 염산 HCl(aq)이 반응하는 길은 두 가지예요. ① <b>바로</b> 반응시키기(ΔH₂) ② 먼저 물에 <b>녹이고</b>(ΔH₁) 용액끼리 <b>중화</b>시키기(ΔH₃). 헤스 법칙이 맞다면 두 길의 ΔH 는 같아야 해요. 먼저 가설을 세우고 실험을 계획해요.</p>' +
        '<p>🥽 <b>안전</b>: NaOH(s)는 피부와 눈을 상하게 하는 부식성 물질이에요. 보안경과 장갑을 쓰고, 남은 용액은 교사의 안내대로 처리해요.</p>',
      features: ['plan'],
      setup() { S.lock = false; setMode('plan'); },
      recap: '바로 가는 길과 두 단계로 가는 길의 ΔH 가 같을 것이라는 가설(ΔH₂ = ΔH₁ + ΔH₃)을 세우고, 조건을 통제하는 실험을 계획했어요.',
      summary: '<ul><li><b>세 반응</b>: ① NaOH(s) → Na⁺(aq) + OH⁻(aq) (ΔH₁) ② NaOH(s) + H⁺(aq) + Cl⁻(aq) → Na⁺(aq) + Cl⁻(aq) + H₂O(l) (ΔH₂) ③ Na⁺(aq) + OH⁻(aq) + H⁺(aq) + Cl⁻(aq) → Na⁺(aq) + Cl⁻(aq) + H₂O(l) (ΔH₃, 중화).</li><li><b>가설</b>: ① 과 ③ 을 차례로 거친 결과가 ② 와 같으므로 <b>ΔH₂ = ΔH₁ + ΔH₃</b>.</li><li><b>통제 변인</b>: 처음 온도, 반응하는 물질의 몰수(0.050 mol), 같은 컵·뚜껑, 용액의 질량 기록.</li><li><b>안전</b>: NaOH(s)는 부식성이라 보안경과 장갑을 쓰고, 습기를 빨아들이므로 빨리 달아요. 폐액은 중화한 뒤 폐수로 처리해요.</li></ul>',
      missions: [
        {
          title: '가설 세우기',
          goal: '도표를 보고 ΔH₂ 를 ΔH₁ 과 ΔH₃ 로 나타내는 <b>가설 문장</b>을 완성해요.',
          hint: '도표에서 위쪽 출발점과 아래쪽 도착점이 같아요. 바로 내려가는 길(ΔH₂)과 두 계단으로 내려가는 길(ΔH₁ 다음 ΔH₃)을 비교해요. 카드를 눌러 각 반응을 확인해요.',
          manual: true,
          setup() { S.lock = true; resetPl(); setMode('plan'); setSub('hyp'); },
          check: () => (S.pl.hyp < 0 ? '아래 조작판에서 가설을 골라 문장을 완성해요.' : S.pl.hyp === 0 ? true : HYP_FB[S.pl.hyp]),
          explain: '헤스 법칙에 따라 바로 가는 길의 ΔH₂ 는 두 단계를 거치는 길의 ΔH 의 합과 같을 거예요. 가설: <b>ΔH₂ = ΔH₁ + ΔH₃</b>.',
        },
        {
          title: '통제 변인과 안전 점검',
          goal: '세 반응을 <b>공정하게 비교</b>하기 위한 준비와 안전 수칙을 모두 골라요.',
          hint: '비교하려면 처음 온도와 반응하는 양이 같아야 해요. 열 손실을 줄이는 것도 생각해요. NaOH(s)는 부식성이에요.',
          manual: true,
          setup() { S.lock = true; setMode('plan'); setSub('ctl'); },
          check: () => {
            const sel = S.pl.cards;
            if (sel.every((v) => !v)) return '알맞은 준비를 모두 골라요.';
            const w = CARDS.findIndex((c, i) => sel[i] && !c.ok); if (w >= 0) return CARDS[w].fb;
            if (CARDS.some((c, i) => c.ok && !sel[i])) return '빠진 준비가 있어요. 처음 온도, 반응하는 양, 열 손실, 안전을 모두 생각해 봐요.';
            return true;
          },
          explain: '처음 온도와 몰수(0.050 mol)를 같게 하고, 같은 컵과 뚜껑으로 열 손실을 줄이며, 용액의 질량을 기록해요. NaOH(s)는 부식성이므로 보안경과 장갑이 필요해요. ΔH₂ 는 고체가 바로 반응하는 열이라 미리 녹이면 안 되고, 습기를 빨아들이므로 빨리 달아야 해요.',
        },
        {
          type: 'quiz', title: 'NaOH(s)를 공기 중에 오래 두면?',
          goal: '실험에서 NaOH(s)를 저울 위에 오래 두면 안 되는 까닭은?',
          setup() { S.lock = true; setMode('plan'); },
          choices: ['NaOH 가 공기 중에서 저절로 폭발하기 때문이에요', '수분을 빨아들여 질량이 실제 NaOH 보다 커져서 몰수를 잘못 구하게 돼요', '온도가 올라서 처음 온도가 달라지기 때문이에요', 'HCl 과 반응하지 못하게 되기 때문이에요'],
          answer: 1,
          feedback: ['폭발하지는 않아요. 다만 부식성이 있어 조심해야 해요.', '', '질량을 잴 때의 온도 변화는 크지 않아요. 문제는 질량이에요.', 'NaOH 는 수분을 흡수해도 HCl 과 반응해요. 문제는 질량이 달라지는 것이에요.'],
          explain: 'NaOH(s)는 공기 중의 수분을 빨아들여요(조해성). 잰 질량 중 일부가 물이라서 실제 NaOH 의 몰수는 계산한 n 보다 작아요. 그러면 ΔH = −q / n 의 크기가 <b>실제보다 작게</b> 계산돼요.',
        },
      ],
    },
    {
      title: '온도 측정: 컵 열량계로 재기', short: '온도 측정', icon: '🌡️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 반응을 같은 조건으로 재기로 계획했어요. 이제 컵 열량계로 차례로 측정해요.</div>' +
        '<p>시약을 섞으면 온도가 올랐다가 곧 서서히 내려가요. 열이 컵 밖으로 조금씩 빠져나가기 때문이에요. 그래서 그래프의 최고점은 열 손실이 없을 때의 값보다 조금 낮아요. <b>냉각 구간의 직선을 섞은 시각까지 연장(외삽)</b>하면 열 손실이 없을 때의 ΔT 를 어림할 수 있어요.</p>',
      features: ['measure'],
      setup() { S.lock = false; setMode('measure'); },
      recap: '온도–시간 그래프에서 냉각 구간을 섞은 시각까지 연장(외삽)해 열 손실을 보정한 ΔT 를 얻었어요.',
      summary: '<ul><li>컵 열량계(스타이로폼 컵 + 뚜껑 + 온도 센서)로 처음 온도 22.0 °C 에서 시작해 온도–시간 그래프를 얻어요.</li><li>읽은 최고점은 열이 빠져나가기 시작한 뒤의 값이라 조금 낮아요. <b>냉각 구간을 섞은 시각까지 외삽</b>하면 ΔT 가 약 0.2 °C 더 커요.</li><li>측정값: ① 용해 ΔT = 4.9 °C (용액 102 g) ② 직접 반응 ΔT = 11.4 °C (102 g) ③ 중화 ΔT = 6.5 °C (100 g).</li></ul>',
      missions: [
        {
          title: '세 반응 측정하기',
          goal: '세 반응(ΔH₁, ΔH₂, ΔH₃)을 하나씩 골라 <b>측정을 끝까지</b> 해요.',
          hint: '반응을 고르고 「측정 시작」을 눌러요. 30초 뒤 시약이 섞이고 온도 그래프가 올라가요. 측정이 끝나면 다음 반응으로 넘어가요.',
          setup() { S.lock = true; resetMe(); setMode('measure'); },
          check: () => ME().done.every((v) => v), hold: 0.4,
          status: () => RXN.map((r, i) => r.sym + ' ' + mark(ME().done[i])).join(' &nbsp; '),
          explain: '세 반응 모두 온도가 올랐어요(발열). 읽은 최고 온도는 ① 26.7 °C ② 33.2 °C ③ 28.3 °C 예요. ΔH₂ 의 온도 변화가 가장 커요.',
        },
        {
          title: '외삽으로 ΔT 보정하기',
          goal: '세 측정 모두 <b>외삽선</b>을 그려 열 손실을 보정한 ΔT 를 확인해요.',
          hint: '반응을 고르고 「외삽선 그리기」를 눌러요. 측정을 아직 안 한 반응은 먼저 측정을 해요.',
          setup() { S.lock = true; setMode('measure'); },
          check: () => ME().exOn.every((v) => v) && ME().ex.every((v) => v > 0.9), hold: 0.4,
          status: () => '측정 ' + ME().done.map(mark).join('') + ' &nbsp; 외삽 ' + ME().exOn.map((v, i) => mark(v && ME().ex[i] > 0.9)).join(''),
          explain: '외삽한 ΔT 는 ① 4.9 °C ② 11.4 °C ③ 6.5 °C 로, 읽은 값보다 각각 0.2 °C 커요. 이 값이 열 손실이 없을 때의 온도 변화에 더 가까워요.',
        },
        {
          type: 'quiz', title: '온도가 서서히 내려가는 까닭',
          goal: '반응이 끝난 뒤 온도가 서서히 내려가는 까닭은?',
          setup() { S.lock = true; setMode('measure'); },
          choices: ['반응이 거꾸로 일어나서 흡열이 되기 때문이에요', '용액에서 열이 컵 밖의 주위로 조금씩 빠져나가기 때문이에요', '온도 센서가 시간이 지나면 고장 나기 때문이에요', '반응이 끝나면 에너지가 저절로 사라지기 때문이에요'],
          answer: 1,
          feedback: ['생성물이 반응물로 돌아가지 않아요. 반응은 이미 끝났어요.', '', '센서 응답 시간은 오차에 영향을 주지만 서서히 내려가는 까닭은 아니에요.', '에너지는 사라지지 않아요. 열의 형태로 주위로 옮겨 가요.'],
          explain: '컵이 완전히 단열되지는 않아서 용액의 열이 주위로 빠져나가요. 그래서 온도가 서서히 내려가고, 최고점도 열 손실이 없을 때보다 낮게 읽혀요.',
        },
      ],
    },
    {
      title: 'ΔH 계산: q, n, ΔH', short: 'ΔH 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 반응의 ΔT 를 외삽으로 보정했어요. 이제 중학교의 열량 공식 <b>Q = cmΔT</b> 와 앞 차시의 <b>ΔH = −q / n</b> 으로 세 반응의 ΔH 를 구해요.</div>' +
        '<p>용액이 얻은 열 <b>q = c·m·ΔT</b> (c = 4.18 J/(g·°C), 용액의 밀도 1.0 g/mL 로 가정), 반응한 NaOH 의 몰수 <b>n</b>, 그리고 <b>ΔH = −q / n</b> 의 순서로 계산해요. 용액의 온도가 올랐으므로 반응은 열을 내놓았고 ΔH 는 음수예요.</p>',
      features: ['calc'],
      setup() { S.lock = false; setMode('calc'); },
      recap: '세 반응의 ΔH 를 구했고, ΔH₁ + ΔH₃ 가 ΔH₂ 와 거의 같았어요.',
      summary: '<ul><li><b>q = c·m·ΔT</b>, <b>ΔH = −q / n</b> (c = 4.18 J/(g·°C)).</li><li>① 용해: q = 4.18 × 102 × 4.9 ≈ 2089 J ≈ 2.09 kJ, n = 0.050 mol → <b>ΔH₁ ≈ −41.8 kJ/mol</b>.</li><li>② 직접 반응: q = 4.18 × 102 × 11.4 ≈ 4861 J ≈ 4.86 kJ → <b>ΔH₂ ≈ −97.2 kJ/mol</b>.</li><li>③ 중화: q = 4.18 × 100 × 6.5 = 2717 J ≈ 2.72 kJ → <b>ΔH₃ ≈ −54.3 kJ/mol</b>.</li><li>ΔH₁ + ΔH₃ = −41.8 + (−54.3) = <b>−96.1 kJ/mol</b> 로 ΔH₂ = −97.2 kJ/mol 와 1.1 kJ/mol 차이예요. 이론값(−44, −102, −57 kJ/mol)보다 크기가 약 5 % 작아요.</li></ul>',
      missions: [
        {
          title: '세 반응의 ΔH 구하기',
          goal: '세 반응 각각에서 q (kJ), n (mol), ΔH (kJ/mol)를 계산해 적어요.',
          hint: '반응을 고르고 ① q = 4.18 × m × ΔT (J → kJ) ② n = 질량 / 40.0 (또는 몰 농도 × 부피) ③ ΔH = −q / n 을 차례로 구해요. ΔT 는 외삽한 값이에요.',
          setup() { S.lock = true; resetCa(); setMode('calc'); },
          check: () => caAll(), hold: 0.4,
          status: () => RXN.map((r, i) => r.sym + ' ' + mark(CA().solved[i])).join(' &nbsp; '),
          explain: 'ΔH₁ = −2.09 / 0.050 ≈ <b>−41.8</b>, ΔH₂ = −4.86 / 0.050 ≈ <b>−97.2</b>, ΔH₃ = −2.72 / 0.050 ≈ <b>−54.3</b> kJ/mol 이에요. ΔH₁ + ΔH₃ = −96.1 kJ/mol 은 ΔH₂ 와 거의 같아요.',
        },
        {
          type: 'quiz', title: '부호 실수 찾기',
          goal: '한 학생이 NaOH(s)의 용해에서 q = +2.09 kJ 을 구하고 ΔH₁ = 2.09 / 0.050 = <b>+41.8 kJ/mol</b> 이라고 적었어요. 무엇이 잘못일까요?',
          setup() { S.lock = true; setMode('calc'); },
          choices: ['q 를 J 로 바꾸지 않았어요', 'q 는 용액이 얻은 열이에요. 반응은 그 열을 내놓았으므로 ΔH = −q / n 이어서 부호가 음수예요', 'n 을 곱하지 않고 나눴어요', '용해는 흡열이어서 +41.8 이 맞아요'],
          answer: 1,
          feedback: ['kJ 로 구한 값을 kJ/mol 로 나눈 것은 단위가 맞아요. 문제는 부호예요.', '', 'ΔH 는 mol 당 값이라서 n 으로 나누는 것이 맞아요.', '용액의 온도가 올랐다는 것은 반응이 열을 내놓았다는 뜻이에요. 발열이므로 ΔH < 0 이에요.'],
          explain: '용액의 온도가 올랐으니 q > 0 (용액이 열을 얻음)이에요. 이 열은 반응이 내놓은 것이므로 <b>ΔH = −q / n = −41.8 kJ/mol</b> 로 음수예요.',
        },
      ],
    },
    {
      title: '결론과 오차: 헤스 법칙 확인', short: '결론·오차', icon: '🔍', phase: '확인',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> ΔH₁ + ΔH₃ = −96.1 kJ/mol, ΔH₂ = −97.2 kJ/mol 를 얻었어요. 두 값이 정확히 같지는 않아요. 이 차이를 어떻게 해석할까요?</div>' +
        '<p>실험에는 늘 <b>오차</b>가 있어요. 그래서 “정확히 같은가”가 아니라 <b>차이가 오차 범위 안인가</b>로 판단해요. 같은 방법으로 잰 네 모둠의 ΔH₂ 가 얼마나 흩어지는지 오차 범위를 알아보고, 오차의 원인도 찾아요.</p>',
      features: ['concl'],
      setup() { S.lock = false; setMode('concl'); },
      recap: '두 길의 ΔH 차이(약 1 %)가 오차 범위 안이므로 헤스 법칙이 성립한다고 볼 수 있어요. 열 손실 등이 오차의 원인이에요.',
      summary: '<ul><li>ΔH₁ + ΔH₃ = −96.1 kJ/mol, ΔH₂ = −97.2 kJ/mol → 차이 <b>1.1 kJ/mol (약 1 %)</b>.</li><li>네 모둠이 잰 ΔH₂ 는 −99.5 ~ −93.8 kJ/mol 로 약 6 kJ/mol 흩어져요. 차이가 이 <b>오차 범위 안</b>이므로 헤스 법칙이 성립한다고 볼 수 있어요.</li><li><b>오차의 원인</b>: 컵 밖으로 빠져나가는 열(측정값이 작아져요), NaOH(s)가 흡수한 수분(질량이 실제보다 커요), 센서 응답 시간, 처음 온도 차이, 용액의 밀도·비열을 물과 같다고 가정한 것 등. 세 측정값의 크기가 이론값(−44, −102, −57 kJ/mol)보다 약 5 % 작은 것도 이 때문이에요.</li><li><b>유용성</b>: 직접 재기 어려운 반응의 ΔH 도 재기 쉬운 반응의 ΔH 를 조합해 구할 수 있어요.</li></ul>',
      missions: [
        {
          title: '결과 판정하기',
          goal: '점도표를 보고 헤스 법칙이 성립하는지 <b>근거와 함께</b> 판정해요.',
          hint: '두 값의 차이 1.1 kJ/mol 을 네 모둠이 잰 ΔH₂ 의 흩어짐과 비교해 봐요. 노란 점선이 ΔH₁ + ΔH₃ 예요.',
          manual: true,
          setup() { S.lock = true; resetCl(); setMode('concl'); setSub('verdict'); },
          check: () => (CL().vd < 0 ? '조작판에서 판정을 골라요.' : vdOk() ? true : VD[CL().vd].fb),
          explain: '두 길의 차이는 1.1 kJ/mol (약 1 %)이고, 네 모둠이 같은 방법으로 잰 ΔH₂ 도 약 6 kJ/mol 흩어져요. 차이가 <b>오차 범위 안</b>이므로 헤스 법칙이 성립한다고 판단해요.',
        },
        {
          title: '오차의 원인 찾기',
          goal: '세 측정값의 크기가 모두 이론값보다 작아요. 그 <b>원인 2개</b>를 골라요.',
          hint: 'ΔT 가 실제보다 작게 측정되거나, 계산에 쓴 n 이 실제보다 크면 |ΔH| 가 작게 나와요.',
          manual: true,
          setup() { S.lock = true; setMode('concl'); setSub('cause'); },
          check: () => {
            const sel = causeSet();
            if (!sel.length) return '원인 두 가지를 골라요.';
            const w = sel.find((i) => !CAUSE[i].ok); if (w != null) return CAUSE[w].fb;
            return sel.length < 2 ? '원인이 하나 더 있어요.' : true;
          },
          explain: '컵 밖으로 열이 빠져나가면 ΔT 가 작게 측정돼요. NaOH(s)가 수분을 흡수하면 실제 NaOH 의 몰수가 계산한 n 보다 작아서 |ΔH| 가 작게 계산돼요. 둘 다 측정값의 크기를 줄이는 방향이에요.',
        },
        {
          type: 'quiz', title: '1.1 kJ/mol 차이의 해석',
          goal: '측정한 ΔH₁ + ΔH₃ (−96.1)와 ΔH₂ (−97.2)는 이론값보다 모두 약 5 % 작고 서로 1.1 kJ/mol 달라요. 알맞은 해석은?',
          setup() { S.lock = true; setMode('concl'); setSub('verdict'); },
          choices: ['헤스 법칙이 틀렸다는 증거예요', '세 측정 모두 열 손실 등으로 ΔT 가 조금씩 작게 측정되고 오차가 측정마다 달라서 작은 차이가 생겨요', 'ΔH₂ 가 틀린 값이니 버리고 ΔH₁ + ΔH₃ 만 쓰면 돼요', '이온이 합쳐질 때 에너지가 사라지기 때문이에요'],
          answer: 1,
          feedback: ['차이가 오차 범위 안이고 크기가 모두 이론값에 가까워요. 법칙이 틀렸다는 증거가 아니에요.', '', '어느 한 값만 틀린 것이 아니라 세 측정 모두에 비슷한 오차가 있어요. 값을 골라서 버리면 안 돼요.', '에너지는 사라지지 않아요. 일부가 컵 밖으로 나가 측정에 잡히지 않을 뿐이에요.'],
          explain: '세 측정에 모두 비슷한 열 손실이 있어서 크기가 이론값보다 약 5 % 작고, 측정마다 오차가 달라 1.1 kJ/mol 정도 어긋나요. 이 차이는 오차 범위 안이므로 <b>헤스 법칙은 성립</b>해요. 이렇게 재기 쉬운 반응들의 ΔH 를 조합해 직접 재기 어려운 반응의 ΔH 를 구할 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-hess-experiment', mount: '#game', badge: '헤스 법칙 실험가', homeHref: '../../index.html#hx',
    featureLabels: { plan: '📝 실험 계획', measure: '🌡️ 컵 열량계 측정', calc: '🧮 ΔH 계산', concl: '🔍 결론·오차' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildCtl(); setMode('plan');
  function stepAll1(dt) { S.t += dt; stepMe(dt); stepCa(dt); stepCl(dt); if (S.pl.pulse < 1) S.pl.pulse = Math.min(1, S.pl.pulse + dt * 2); }
  let lastFree = false;
  SciSim.loop((dt) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'plan') { drawPlan(S.t); drawPlanInfo(S.t); }
    else if (S.mode === 'measure') { drawMe(S.t); drawMeInfo(S.t); }
    else if (S.mode === 'calc') { drawCalc(S.t); drawCalcInfo(S.t); }
    else { drawConcl(S.t); drawConclInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, RXN, DH, DHr, SUM, DIFF, GRP, CARDS, CAUSE, VD, HYP, qkJ, qJ, tempAt, setMode, setSub, setMe, runMe, doEx, setCa, caCheck, pickVd, toggleCause, setHi,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
