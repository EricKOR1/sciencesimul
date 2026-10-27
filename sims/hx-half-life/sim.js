/* =========================================================
   물질과 에너지 Ⅳ. 반응 속도 - 1차 반응의 반감기 [12물에04-02]
   ① 분석: 반감기 찾기 (농도–시간 곡선에서 절반이 되는 시간 읽기)
   ② 탐구: 처음 농도를 바꿔도 일정한 반감기 + 반감기가 변하는 곡선과 분류
   ③ 예측: 남는 양 = 처음 × (1/2)ⁿ (입자 128개 모형)
   ④ 발표: 반감기 사례 (탄소 연대, 아이오딘-131, 약물, 우라늄, 식품)
   적분 속도식, ln, t₁/₂ = 0.693/k, 아레니우스 식은 쓰지 않고 자료를 읽어서 구해요.
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
  const MODE_LABEL = { read: '⌛ 농도가 절반이 되는 시간을 읽어요', cmp: '🧪 처음 농도를 바꿔도 반감기는 같을까요?', sort: '🗂 곡선의 반감기 변화 모양으로 분류해요', rem: '🎯 반감기가 지나면 얼마나 남을까요?', case: '📣 반감기가 쓰이는 사례를 발표해요' };
  const CCOL = ['#7c3aed', '#3867f4', '#0d9488'];
  const pctTxt = (v) => String(Math.round(v * 100) / 100);
  const thou = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  /* ================= 자료 =================
     1차 반응 A → B (25 °C): 반감기 40 s.  [A] = 처음 농도 × (1/2)^(경과 시간 / 반감기)
     2차 반응 곡선은 1.00 → 0.50 이 40 s, 0차 반응 곡선은 1.00 → 0.50 이 40 s 가 되도록 맞춘 대비용 자료예요. */
  const TH = 40;
  const first = (c0, th, t) => c0 * Math.pow(0.5, t / th);
  const second = (c0, t) => c0 / (1 + t / 40);
  const zeroth = (c0, t) => Math.max(0, c0 - 0.0125 * t);
  const SORTC = [
    { id: '①', kind: 'grow', fn: (t) => second(1, t), ts: [40, 120, 280], iv: [40, 80, 160], col: '#e0692f' },
    { id: '②', kind: 'shrink', fn: (t) => zeroth(1, t), ts: [40, 60, 70], iv: [40, 20, 10], col: '#0d9488' },
    { id: '③', kind: 'const', fn: (t) => first(1, TH, t), ts: [40, 80, 120], iv: [40, 40, 40], col: '#3867f4' },
  ];
  const PAT = [['const', '반감기가 일정해요 (1차 반응)', '일정해요'], ['grow', '반감기가 계속 길어져요 (2배씩)', '길어져요'], ['shrink', '반감기가 계속 짧아져요 (절반씩)', '짧아져요']];
  const RXN2 = [{ name: '반응 ①', th: 40, col: '#3867f4' }, { name: '반응 ② (k 가 ① 의 2배)', th: 20, col: '#e0692f' }];
  const NDOT = 128;                                                   // 입자 128개 = 100 %  (반감기 7번까지 개수가 정수)
  const CASES = [
    { k: 'c14', name: '탄소 연대 측정', ic: '🏺', iso: '탄소-14', th: 5730, unit: '년', tUnit: (n) => thou(n * 5730) + ' 년', sub: '나무·뼈 같은 유물과 화석',
      q: [{ n: 2, hide: 'time', a: 11460, tol: 5, lab: '유물 속 ¹⁴C 가 25 % 남았어요. 경과 시간 (년)' }, { n: 3, hide: 'time', a: 17190, tol: 5, lab: '¹⁴C 가 12.5 % 남았어요. 경과 시간 (년)' }],
      use: ['유물과 화석의 나이를 알아내요', '암석이 만들어진 시기를 알아내요', '음식물이 상한 날짜를 알아내요'], useA: 0,
      lim: ['약 5만 년보다 오래된 시료는 남은 ¹⁴C 가 너무 적어 측정하기 어려워요', '반감기가 너무 짧아서 몇 시간 안에 모두 없어져요', '유물의 크기가 커야만 측정할 수 있어요'], limA: 0 },
    { k: 'i131', name: '갑상선 질환 (아이오딘-131)', ic: '🩺', iso: '아이오딘-131', th: 8, unit: '일', tUnit: (n) => (n * 8) + ' 일', sub: '갑상선 검사와 치료',
      q: [{ n: 3, hide: 'pct', a: 12.5, tol: 0.2, lab: '24 일 후 남는 비율 (%)' }, { n: 5, hide: 'pct', a: 3.1, tol: 0.1, lab: '40 일 후 남는 비율 (%)' }],
      use: ['갑상선의 검사와 치료에 써요', '뼈의 나이를 알아내요', '지구의 나이를 알아내요'], useA: 0,
      lim: ['반감기가 짧아 오래 보관할 수 없고, 방사선 안전 관리가 필요해요', '반감기가 수십억 년이라 효과가 나타나지 않아요', '몸속에서 전혀 줄어들지 않아요'], limA: 0 },
    { k: 'drug', name: '약물 복용 간격', ic: '💊', iso: '약물 (예: 몸속 반감기 6시간)', th: 6, unit: '시간', tUnit: (n) => (n * 6) + ' 시간', sub: '약의 체내 반감기',
      q: [{ n: 4, hide: 'pct', a: 6.25, tol: 0.15, lab: '24 시간 후 몸속에 남는 비율 (%)' }, { n: 2, hide: 'pct', a: 25, tol: 0.5, lab: '12 시간 후 몸속에 남는 비율 (%)' }],
      use: ['반감기에 맞추어 복용 간격을 정해 몸속 농도를 일정하게 유지해요', '약을 한 번에 많이 먹는 시기를 정해요', '약의 색을 정해요'], useA: 0,
      lim: ['사람마다(나이, 간·신장 기능) 반감기가 달라서 같은 간격이 모두에게 맞지는 않아요', '약은 반감기가 없어요', '반감기는 항상 24 시간이에요'], limA: 0 },
    { k: 'u238', name: '우라늄 지질 연대', ic: '🪨', iso: '우라늄-238', th: 45, unit: '억 년', tUnit: (n) => (n === 0 ? '0 년' : (n * 45) + '억 년'), sub: '암석과 지구의 나이',
      q: [{ n: 2, hide: 'pct', a: 25, tol: 0.5, lab: '90억 년 후 남는 비율 (%)' }, { n: 3, hide: 'pct', a: 12.5, tol: 0.2, lab: '135억 년 후 남는 비율 (%)' }],
      use: ['암석과 지구의 나이를 알아내요', '어제 만든 음식의 신선도를 알아내요', '유물 속 종이의 나이를 몇 년 단위로 알아내요'], useA: 0,
      lim: ['반감기가 매우 길어 짧은 기간의 변화는 재기 어려워요', '반감기가 너무 짧아서 금방 없어져요', '1차 반응이 아니라서 쓸 수 없어요'], limA: 0 },
    { k: 'food', name: '식품의 보관 기한', ic: '🥗', iso: '식품 속 영양소 (가상의 예시 값, 반감기 60일)', th: 60, unit: '일', tUnit: (n) => (n * 60) + ' 일', sub: '분해되는 영양소',
      q: [{ n: 3, hide: 'pct', a: 12.5, tol: 0.2, lab: '180 일 후 남는 비율 (%)' }, { n: 2, hide: 'time', a: 120, tol: 1, lab: '25 % 가 남을 때까지 걸리는 시간 (일)' }],
      use: ['분해되는 빠르기로 보관 온도와 기한을 정해요', '식품의 색을 정해요', '반감기가 없으므로 쓸 수 없어요'], useA: 0,
      lim: ['온도와 빛 같은 조건에 따라 반감기가 달라서 예시 값은 참고용이에요', '식품은 반감기가 항상 같아요', '보관하면 오히려 늘어나요'], limA: 0 },
  ];
  const PCT = ['100', '50', '25', '12.5', '6.25', '3.1'];
  /* 정답 위치를 사례마다 다르게 */
  const place = (arr, a, pos) => { const rest = arr.filter((_, i) => i !== a); rest.splice(pos, 0, arr[a]); return rest; };
  [[0, 1], [1, 0], [2, 1], [0, 2], [1, 2]].forEach((p, i) => { const c = CASES[i]; c.use = place(c.use, c.useA, p[0]); c.useA = p[0]; c.lim = place(c.lim, c.limA, p[1]); c.limA = p[1]; });

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'read', fade: 0, lock: false, t: 0,
    rd: { sel: -1, p: 0, seen: [false, false, false], tt: 0, tk: 0, in: ['', ''], ok: [false, false], flash: 0 },
    cm: { meas: [false, false, false], p: [0, 0, 0], sel: -1 },
    st: { sel: 0, ans: [-1, -1, -1], p: 1, wrong: [false, false, false] },
    rm: { rx: 0, tt: 0, tk: 0, q: ['', '', ''], ok: [false, false, false], seenRx: [true, false] },
    cs: { sel: 0, flip: 1, in: CASES.map(() => ['', '']), ok: CASES.map(() => [false, false]), use: CASES.map(() => -1), lim: CASES.map(() => -1), done: CASES.map(() => false) },
  };
  let game = null;
  /* 입자 제거 순서 (고정된 무작위) */
  const RANK = (() => { const a = Array.from({ length: NDOT }, (_, i) => i); let s = 11; for (let i = a.length - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; })();

  /* ---------- 그래프 도구 ---------- */
  function G(o) { o.X = (t) => o.x0 + t / o.xmax * o.w; o.Y = (c) => o.y0 + o.h - c / o.ymax * o.h; return o; }
  function axesG(g) {
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x0, g.y0, g.w, g.h, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let c = 0; c <= g.ymax + 1e-6; c += g.ys) { ctx.beginPath(); ctx.moveTo(g.x0, g.Y(c)); ctx.lineTo(g.x0 + g.w, g.Y(c)); ctx.stroke(); T(g.x0 - 7, g.Y(c) + 4, g.yfmt ? g.yfmt(c) : f2(c), 12.5, MUTED, 'right', 700); }
    for (let t = 0; t <= g.xmax + 1e-6; t += g.xs) { ctx.beginPath(); ctx.moveTo(g.X(t), g.y0); ctx.lineTo(g.X(t), g.y0 + g.h); ctx.stroke(); T(g.X(t), g.y0 + g.h + 17, String(t), 12.5, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x0, g.y0 + g.h); ctx.lineTo(g.x0 + g.w, g.y0 + g.h); ctx.stroke();
    T(g.x0 + g.w, g.y0 + g.h + 35, g.xlab || '시간 t (s) →', 12.5, MUTED, 'right', 800); T(g.x0 - 8, g.y0 - 9, g.ylab || '[A] (M)', 12.5, MUTED, 'left', 800);
  }
  function curveG(g, fn, col, lw, alpha, tmax) {
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.y0 - 3, g.w, g.h + 6); ctx.clip(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = col; ctx.lineWidth = lw || 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
    const te = tmax == null ? g.xmax : tmax;
    for (let t = 0; t <= te + 1e-6; t += g.xmax / 240) { const x = g.X(t), y = g.Y(fn(t)); t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  function dash(x1, y1, x2, y2, col, w) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 1.8; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }

  /* ================= ① 반감기 읽기 ================= */
  const RD = () => S.rd;
  const gRead = () => { const L = RC.L; return G({ x0: L.x + 58, y0: L.y + 66, w: L.w - 84, h: 246, xmax: 160, ymax: 1.0, xs: 40, ys: 0.25 }); };
  const cur1 = (t) => first(1.0, TH, t);
  const RDI = [[1.0, 0.5], [0.5, 0.25], [0.25, 0.125]];
  function setRd(i) { const R = RD(); R.sel = i; R.p = 0; R.seen[i] = true; Sound.tick(); updateCtl(); }
  function checkRd() {
    const R = RD(), a = R.ok.slice();
    R.ok[0] = R.in[0] !== '' && near(parseNum(R.in[0]), 40, 1.5); R.ok[1] = R.in[1] !== '' && near(parseNum(R.in[1]), 40, 1.5);
    [0, 1].forEach((i) => { if (R.ok[i] && !a[i]) { Sound.success(); R.flash = 1; const g = gRead(); parts.burst(g.X(40 * i + 20), g.Y(0) - 20, { count: 12, speed: 110, life: 0.6, size: 3.4 }); } });
  }
  function stepRd(dt) { const R = RD(); R.p = ap2(R.p, 1, dt, 3.2); if (R.p > 0.995) R.p = 1; R.tk = ap2(R.tk, R.tt, dt, 9); if (Math.abs(R.tk - R.tt) < 0.05) R.tk = R.tt; if (R.flash > 0) R.flash = Math.max(0, R.flash - dt * 1.5); }
  function drawRead(t) {
    const L = RC.L, R = RD(), g = gRead();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '⌛ 1차 반응 A → B 의 농도–시간 곡선', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '25 °C · 처음 [A] = 1.00 M', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    axesG(g); curveG(g, cur1, PUR, 3.6);
    // 표의 점
    [0, 40, 80, 120, 160].forEach((tt) => D.sphere(g.X(tt), g.Y(cur1(tt)), 5, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.4 }));
    // 구간
    if (R.sel >= 0) {
      const i = R.sel, ta = 40 * i, tb = 40 * (i + 1), ca = RDI[i][0], cb = RDI[i][1], e = sm(R.p);
      const yA = g.Y(ca), yB = g.Y(cb), xa = g.X(ta), xb = g.X(tb), ya0 = g.Y(0);
      dash(g.x0, yA, xa, yA, AMB); dash(g.x0, yB, g.x0 + (xb - g.x0) * e, yB, AMB);
      dash(xa, yA, xa, ya0, AMB); dash(xb, yB, xb, yB + (ya0 - yB) * e, AMB);
      D.sphere(xa, yA, 5.5, AMB, { gloss: false }); if (e > 0.5) D.sphere(xb, yB, 5.5, AMB, { gloss: false });
      const bw = (xb - xa) * e; D.roundRect(xa, ya0 - 11, Math.max(bw, 1), 8, 3); ctx.fillStyle = AMB; ctx.fill();
      const okI = i < 2 && R.ok[i];
      T((xa + xb) / 2 + 2, ya0 - 18, e > 0.9 ? (okI ? 'Δt = ' + f0(tb - ta) + ' s' : 'Δt = ? s') : '', 13.5, AMB, 'center', 800, HALO);
      if (ca === 0.125) T(g.x0 + 6, yA - 6, '0.125', 12.5, AMB, 'left', 800, HALO); if (cb === 0.125) T(g.x0 + 6, yB - 6, '0.125', 12.5, AMB, 'left', 800, HALO);
    }
    // 커서
    if (R.tk > 0.01 || R.tt > 0) {
      const tk = R.tk, c = cur1(tk), x = g.X(tk), y = g.Y(c);
      dash(x, y, x, g.Y(0), SKY, 1.5); dash(g.x0, y, x, y, SKY, 1.5); D.sphere(x, y, 6, SKY, { gloss: true });
    }
    // 읽기 상자
    const by = L.y + 372;
    D.roundRect(L.x + 12, by, L.w - 24, L.h - 372 - 12, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    T(L.x + 26, by + 26, '커서: t = ' + fk(R.tk) + ' s  →  [A] = ' + c3(cur1(R.tk)) + ' M', 14, SKY, 'left', 800);
    T(L.x + 26, by + 52, '반감기 = 농도가 처음의 절반이 되는 데 걸리는 시간', 13.5, INK, 'left', 800);
    const n = R.ok.filter(Boolean).length;
    T(L.x + 26, by + 78, n === 2 ? '1.00 → 0.50 도, 0.50 → 0.25 도 모두 40 s 예요.' : '구간을 골라 걸린 시간을 읽고 조작판에 적어요. (' + n + ' / 2)', 13, n === 2 ? '#0f6b3c' : MUTED, 'left', 800);
    if (R.flash > 0) { ctx.fillStyle = 'rgba(20,160,88,' + R.flash * 0.1 + ')'; D.roundRect(L.x, L.y, L.w, L.h, 14); ctx.fill(); }
  }
  const fk = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? f0(v) : f1(v));
  const c3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
  function drawReadInfo(t) {
    const R = RC.R, rd = RD();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 농도–시간 자료', 14.5, INK, 'left', 800);
    const rh = PHONE ? 28 : 34, y0 = R.y + 38;
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 4, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    T(R.x + R.w * 0.28, y0 + rh / 2 + 1, 't (s)', 13, INK, 'center', 800); T(R.x + R.w * 0.7, y0 + rh / 2 + 1, '[A] (M)', 13, INK, 'center', 800);
    const V = ['1.00', '0.50', '0.25', '0.125', '0.0625'];
    for (let k = 0; k < 5; k++) {
      const y = y0 + rh * (k + 1), hi = rd.sel >= 0 && (k === rd.sel || k === rd.sel + 1);
      D.roundRect(R.x + 10, y, R.w - 20, rh - 4, 8); ctx.fillStyle = hi ? 'rgba(217,119,6,.14)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = hi ? AMB : '#e1dcf3'; ctx.lineWidth = hi ? 2 : 1.2; ctx.stroke();
      T(R.x + R.w * 0.28, y + rh / 2 + 1, String(40 * k), 14, INK, 'center', 800); T(R.x + R.w * 0.7, y + rh / 2 + 1, V[k], 14, hi ? AMB : INK, 'center', 800);
    }
    const y1 = y0 + rh * 6 + 6;
    if (y1 + 60 < R.y + R.h) {
      D.roundRect(R.x + 10, y1, R.w - 20, R.y + R.h - y1 - 10, 10); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
      T(R.x + 20, y1 + 22, '💡 반감기 t₁/₂', 13, PUR, 'left', 800);
      textBlock(R.x + 20, y1 + 44, R.w - 40, '반응물의 농도가 처음의 절반으로 줄어드는 데 걸리는 시간이에요. 이 반응은 25 °C 에서 40 s 예요.', 12.5, INK, 17, 700);
    }
  }

  /* ================= ② 처음 농도 바꾸기 ================= */
  const CM = () => S.cm;
  const C0S = [2.0, 1.0, 0.4];
  const gCmp = () => { const L = RC.L; return G({ x0: L.x + 58, y0: L.y + 66, w: L.w - 84, h: 272, xmax: 160, ymax: 2.0, xs: 40, ys: 0.5, yfmt: (c) => f1(c) }); };
  function measure(i) { const C = CM(); if (C.meas[i]) { C.sel = i; return; } C.meas[i] = true; C.sel = i; C.p[i] = 0; Sound.success(); const g = gCmp(); parts.burst(g.X(40), g.Y(C0S[i] / 2), { count: 12, speed: 110, life: 0.6, size: 3.4 }); updateCtl(); }
  function stepCm(dt) { const C = CM(); for (let i = 0; i < 3; i++) { C.p[i] = ap2(C.p[i], C.meas[i] ? 1 : 0, dt, 3.2); if (Math.abs(C.p[i] - (C.meas[i] ? 1 : 0)) < 0.005) C.p[i] = C.meas[i] ? 1 : 0; } }
  function drawCmp(t) {
    const L = RC.L, C = CM(), g = gCmp();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 같은 1차 반응, 처음 농도만 달라요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '25 °C · 처음 [A] = 2.00 M, 1.00 M, 0.40 M', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    axesG(g);
    C0S.forEach((c0, i) => curveG(g, (tt) => first(c0, TH, tt), CCOL[i], 3.4));
    const meas = C.meas.some(Boolean), x40 = g.X(40), y0 = g.Y(0);
    if (meas) dash(x40, g.Y(Math.max(...C0S.filter((c, i) => C.meas[i])) / 2), x40, y0, AMB, 1.8);
    C0S.forEach((c0, i) => {
      const e = sm(C.p[i]); if (e <= 0.01) return;
      const yh = g.Y(c0 / 2);
      dash(g.x0, yh, g.x0 + (x40 - g.x0) * e, yh, CCOL[i], 1.6);
      D.sphere(g.X(0), g.Y(c0), 5, CCOL[i], { gloss: false }); D.sphere(x40, yh, 5.5, CCOL[i], { gloss: e > 0.5 ? true : false });
      T(g.x0 + 6, yh - 5, f2(c0 / 2), 12, CCOL[i], 'left', 800, HALO);
    });
    if (meas) { T(x40 + 6, y0 - 8, 't½ = 40 s', 13.5, AMB, 'left', 800, HALO); }
    const by = L.y + 394;
    D.roundRect(L.x + 12, by, L.w - 24, L.h - 394 - 12, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    const n = C.meas.filter(Boolean).length;
    textBlock(L.x + 26, by + 24, L.w - 52, n < 3 ? '처음 농도마다 「반감기 측정」을 눌러요. (' + n + ' / 3) 반감기는 어떻게 달라질까요?' : '세 곡선 모두 40 s 에서 처음의 절반이 돼요. 곡선은 세로 크기만 다른 모양이에요.', 13.5, n < 3 ? INK : '#0f6b3c', 19, 800);
  }
  function drawCmpInfo(t) {
    const R = RC.R, C = CM();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 처음 농도와 반감기', 14.5, INK, 'left', 800);
    const rh = PHONE ? 34 : 40, y0 = R.y + 38;
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 4, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    T(R.x + R.w * 0.2, y0 + rh / 2, '처음 [A]', 12.5, INK, 'center', 800); T(R.x + R.w * 0.5, y0 + rh / 2, '절반', 12.5, INK, 'center', 800); T(R.x + R.w * 0.8, y0 + rh / 2, '반감기', 12.5, INK, 'center', 800);
    C0S.forEach((c0, i) => {
      const y = y0 + rh * (i + 1), m = C.meas[i];
      D.roundRect(R.x + 10, y, R.w - 20, rh - 4, 8); ctx.fillStyle = m ? 'rgba(20,160,88,.08)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = m ? GOOD : '#e1dcf3'; ctx.lineWidth = 1.3; ctx.stroke();
      T(R.x + R.w * 0.2, y + rh / 2 + 4, f2(c0) + ' M', 13.5, CCOL[i], 'center', 800); T(R.x + R.w * 0.5, y + rh / 2 + 4, m ? f2(c0 / 2) + ' M' : '?', 13.5, m ? INK : '#aab3c4', 'center', 800); T(R.x + R.w * 0.8, y + rh / 2 + 4, m ? '40 s' : '?', 14, m ? '#0f6b3c' : '#aab3c4', 'center', 800);
    });
    // 이유 설명: 농도가 절반이면 속도도 절반
    const y1 = y0 + rh * 4 + 6, hh = R.y + R.h - y1 - 10;
    D.roundRect(R.x + 10, y1, R.w - 20, hh, 10); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    T(R.x + 20, y1 + 22, '💡 왜 같을까? (1차 반응)', 13, PUR, 'left', 800);
    if (hh > 150) {
      const bw = (R.w - 60) / 3, by = y1 + 38 + (PHONE ? 0 : 6);
      [1, 0.5, 0.25].forEach((q, k) => {
        const x = R.x + 20 + k * (bw + 10), n = Math.round(q * 8);
        D.roundRect(x, by, bw, 46, 6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#c9d3e6'; ctx.lineWidth = 1.2; ctx.stroke();
        for (let d = 0; d < n; d++) D.sphere(x + 9 + (d % 4) * (bw - 18) / 3, by + 12 + Math.floor(d / 4) * 20, 4.6, '#4a7bf0', { gloss: false });
        const w = q * (bw - 4); D.roundRect(x + 2, by + 54, bw - 4, 10, 4); ctx.fillStyle = '#eceff6'; ctx.fill(); D.roundRect(x + 2, by + 54, w, 10, 4); ctx.fillStyle = '#f59e0b'; ctx.fill();
        T(x + bw / 2, by + 82, '속도 ' + (q === 1 ? '1' : q === 0.5 ? '1/2' : '1/4'), 12, INK, 'center', 800);
      });
      textBlock(R.x + 20, by + 102, R.w - 40, '속도가 농도에 비례해서(v = k[A]) 농도가 절반이면 속도도 절반이에요. 그래서 절반을 쓰는 데 걸리는 시간이 처음과 같아요.', 12.5, INK, 17, 700);
    } else textBlock(R.x + 20, y1 + 42, R.w - 40, '1차 반응은 속도가 농도에 비례해서 농도가 절반이면 속도도 절반이에요.', 12.5, INK, 17, 700);
  }

  /* ================= ② 곡선 분류 ================= */
  const ST = () => S.st;
  const gSort = () => { const L = RC.L; return G({ x0: L.x + 58, y0: L.y + 66, w: L.w - 84, h: 262, xmax: 300, ymax: 1.0, xs: 50, ys: 0.25 }); };
  const stDone = () => ST().ans.every((a, i) => a === PAT.findIndex((p) => p[0] === SORTC[i].kind));
  function setSt(i) { const Q = ST(); if (Q.sel !== i) { Q.sel = i; Q.p = 0; Sound.tick(); } updateCtl(); }
  function sortResult() {
    const Q = ST(); const bad = [];
    for (let i = 0; i < 3; i++) { if (Q.ans[i] < 0) return '곡선 ① ② ③ 을 모두 분류해요.'; if (Q.ans[i] !== PAT.findIndex((p) => p[0] === SORTC[i].kind)) bad.push(SORTC[i].id); }
    if (bad.length) return bad.join(', ') + ' 의 분류를 다시 확인해요. 농도가 절반이 되는 시간 간격이 일정한지, 길어지는지, 짧아지는지 보아요.';
    return true;
  }
  function stepSt(dt) { const Q = ST(); Q.p = ap2(Q.p, 1, dt, 3); if (Q.p > 0.995) Q.p = 1; }
  function drawSort(t) {
    const L = RC.L, Q = ST(), g = gSort();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🗂 곡선 ① ② ③ 의 반감기는 어떻게 변할까?', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '처음 1.00 M, 처음 절반까지 40 s', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    axesG(g);
    SORTC.forEach((c, i) => { if (i !== Q.sel) curveG(g, c.fn, c.col, 3, 0.32); });
    const c = SORTC[Q.sel]; curveG(g, c.fn, c.col, 4.2, 1);
    const e = sm(Q.p), y0 = g.Y(0);
    let prev = 0;
    c.ts.forEach((tt, k) => {
      const lv = Math.pow(0.5, k + 1), a = clamp(e * 3 - k, 0, 1); if (a <= 0) { prev = tt; return; }
      const xA = g.X(prev), xB = g.X(prev + (tt - prev) * a), yl = g.Y(lv);
      dash(g.x0, yl, g.X(tt) * a + g.x0 * (1 - a), yl, c.col, 1.4);
      dash(g.X(tt), g.Y(c.fn(tt)), g.X(tt), g.Y(c.fn(tt)) + (y0 - g.Y(c.fn(tt))) * a, c.col, 1.4);
      D.roundRect(xA, y0 - 12 - (k % 2) * 0, Math.max(xB - xA, 1), 8, 3); ctx.fillStyle = k % 2 ? c.col : C.shade(c.col, -0.2); ctx.fill();
      D.sphere(g.X(tt), g.Y(c.fn(tt)), 4.6, c.col, { gloss: false });
      if (a > 0.95 && g.X(tt) - xA >= 34) T((xA + g.X(tt)) / 2, y0 - 20, f0(c.iv[k]) + ' s', 12.5, c.col, 'center', 800, HALO);
      prev = tt;
    });
    // 곡선 이름표
    SORTC.forEach((q, i) => { const lx = L.x + 296 + i * 46; D.label(lx, L.y + 44, q.id, { size: 14, bg: i === Q.sel ? q.col : '#aab3c4', align: 'center' }); });
    const by = L.y + 380;
    D.roundRect(L.x + 12, by, L.w - 24, L.h - 380 - 12, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    T(L.x + 26, by + 24, '곡선 ' + c.id + ': 농도가 절반이 되는 데 걸린 시간', 13.5, c.col, 'left', 800);
    T(L.x + 26, by + 52, '1.00 → 0.50 → 0.25 → 0.125 :  ' + c.iv.map((v) => f0(v) + ' s').join('  →  '), 14, INK, 'left', 800);
    const ok = stDone();
    T(L.x + 26, by + 80, ok ? '모두 맞게 분류했어요. 1차 반응은 반감기가 일정해요.' : '세 곡선을 눌러 보고 조작판에서 분류해요.', 13, ok ? '#0f6b3c' : MUTED, 'left', 800);
  }
  function drawSortInfo(t) {
    const R = RC.R, Q = ST();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 반감기 변화 자료', 14.5, INK, 'left', 800);
    const rh = PHONE ? 52 : 70, y0 = R.y + 38;
    SORTC.forEach((c, i) => {
      const y = y0 + i * (rh + 4), sel = i === Q.sel;
      D.roundRect(R.x + 10, y, R.w - 20, rh, 10); ctx.fillStyle = sel ? 'rgba(124,58,237,.07)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? c.col : '#e1dcf3'; ctx.lineWidth = sel ? 2.2 : 1.3; ctx.stroke();
      T(R.x + 22, y + 24, '곡선 ' + c.id, 14, c.col, 'left', 800);
      T(R.x + R.w - 22, y + 24, c.iv.map((v) => f0(v)).join(' · ') + ' s', 14, INK, 'right', 800);
      const a = Q.ans[i]; T(R.x + 22, y + 48, a >= 0 ? PAT[a][1].replace(/ \(.*\)/, '') : '분류 전', 12.5, a < 0 ? '#9aa6bb' : (Q.wrong[i] ? BAD : '#0f6b3c'), 'left', 800);
    });
    const y1 = y0 + 3 * (rh + 4) + 6;
    if (y1 + 70 < R.y + R.h) textBlock(R.x + 14, y1 + 8, R.w - 28, '1차 반응은 반감기가 처음 농도와 상관없이 일정해요. 반감기가 변한다면 1차 반응이 아니에요.', 12.5, MUTED, 17, 700);
  }

  /* ================= ③ 남는 양 ================= */
  const RMX = () => S.rm;
  const rmFrac = (rx, tt) => Math.pow(0.5, tt / RXN2[rx].th);
  function stepRm(dt) { const Q = RMX(); Q.tk = ap2(Q.tk, Q.tt, dt, 9); if (Math.abs(Q.tk - Q.tt) < 0.05) Q.tk = Q.tt; }
  function setRx(i) { const Q = RMX(); if (Q.rx !== i) { Q.rx = i; Q.seenRx[i] = true; Sound.tick(); } updateCtl(); }
  function setRmT(v) { const Q = RMX(); Q.tt = clamp(Math.round(v / 5) * 5, 0, 240); updateCtl(); }
  function checkRm() {
    const Q = RMX(), a = Q.ok.slice(), tol = [0.3, 2, 1], ans = [12.5, 160, 20];
    for (let i = 0; i < 3; i++) Q.ok[i] = Q.q[i] !== '' && near(parseNum(Q.q[i]), ans[i], tol[i]);
    Q.ok.forEach((o, i) => { if (o && !a[i]) { Sound.success(); const R = RC.R; parts.burst(RC.L.x + RC.L.w / 2, RC.L.y + 250, { count: 12, speed: 120, life: 0.6, size: 3.4 }); } });
  }
  function drawRem(t) {
    const L = RC.L, Q = RMX(), fr = rmFrac(Q.rx, Q.tk), nA = NDOT * fr;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🎯 ' + RXN2[Q.rx].name + ': 입자 ' + NDOT + '개 = 처음 양 100 %', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '파랑 = 남은 A,  주황 = 변해서 생긴 B', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const cols = 16, rows = 8, gw = (L.w - 40) / cols, x0 = L.x + 20, y0 = L.y + 64, gh = 24;
    D.roundRect(L.x + 12, y0 - 8, L.w - 24, rows * gh + 16, 10); ctx.fillStyle = '#f7f9ff'; ctx.fill(); ctx.strokeStyle = '#c9d3e6'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i < NDOT; i++) {
      const r = RANK[i], aA = clamp(nA - r, 0, 1), cx = x0 + (i % cols) * gw + gw / 2, cy = y0 + Math.floor(i / cols) * gh + gh / 2;
      if (aA > 0.01) { ctx.globalAlpha = aA; D.sphere(cx, cy, 7.6, '#4a7bf0', { gloss: true }); ctx.globalAlpha = 1; }
      if (aA < 0.99) { ctx.globalAlpha = 1 - aA; D.sphere(cx, cy, 6.2, '#f59e0b', { gloss: true }); ctx.globalAlpha = 1; }
    }
    const by = y0 + rows * gh + 24;
    // 비율 막대
    D.roundRect(L.x + 14, by, L.w - 28, 22, 8); ctx.fillStyle = '#eceff6'; ctx.fill();
    const w = clamp(fr, 0, 1) * (L.w - 28); if (w > 0.5) { D.roundRect(L.x + 14, by, w, 22, 8); ctx.fillStyle = '#4a7bf0'; ctx.fill(); }
    T(L.x + 14 + 8, by + 16, 'A ' + pctTxt(fr * 100) + ' %', 13.5, w > 80 ? '#fff' : INK, 'left', 800);
    T(L.x + L.w - 22, by + 16, 'B ' + pctTxt((1 - fr) * 100) + ' %', 13.5, INK, 'right', 800);
    T(L.x + 14, by + 52, 't = ' + fk(Q.tk) + ' s', 18, INK, 'left', 800);
    T(L.x + L.w / 2 + 40, by + 52, '남은 A: ' + (Math.round(nA * 10) / 10) + '개 (' + pctTxt(fr * 100) + ' %)', 15, '#2a56c8', 'right', 800);
    const msg = '시간을 바꾸며 남는 A 의 비율을 읽어요. 처음 양의 절반씩 줄어드는 모양이에요.';
    textBlock(L.x + 14, by + 80, L.w - 28, msg, 13, MUTED, 18, 800);
  }
  function drawRemInfo(t) {
    const R = RC.R, Q = RMX();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 반감기 횟수와 남는 양', 14.5, INK, 'left', 800);
    const rh = PHONE ? 26 : 31, y0 = R.y + 38;
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 4, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    T(R.x + R.w * 0.16, y0 + rh / 2 + 1, 'n', 13, INK, 'center', 800); T(R.x + R.w * 0.42, y0 + rh / 2 + 1, '(1/2)ⁿ', 13, INK, 'center', 800); T(R.x + R.w * 0.72, y0 + rh / 2 + 1, '남는 비율', 13, INK, 'center', 800);
    for (let n = 0; n <= 6; n++) {
      const y = y0 + rh * (n + 1), v = Math.pow(0.5, n) * 100;
      D.roundRect(R.x + 10, y, R.w - 20, rh - 4, 8); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#e1dcf3'; ctx.lineWidth = 1.2; ctx.stroke();
      T(R.x + R.w * 0.16, y + rh / 2 + 1, String(n), 13.5, INK, 'center', 800); T(R.x + R.w * 0.42, y + rh / 2 + 1, n === 0 ? '1' : '1/' + Math.pow(2, n), 13.5, INK, 'center', 800); T(R.x + R.w * 0.72, y + rh / 2 + 1, pctTxt(v) + ' %', 13.5, PUR, 'center', 800);
    }
    const y1 = y0 + rh * 8 + 4;
    if (y1 + 40 < R.y + R.h) textBlock(R.x + 14, y1 + 12, R.w - 28, 'n = 경과 시간 / 반감기. 남는 양 = 처음 × (1/2)ⁿ', 12.5, INK, 17, 800);
  }

  /* ================= ④ 사례 발표 ================= */
  const CS = () => S.cs;
  const csDone = (i) => { const q = CS(); return q.ok[i][0] && q.ok[i][1] && q.use[i] === CASES[i].useA && q.lim[i] === CASES[i].limA; };
  const csN = () => CASES.filter((c, i) => csDone(i)).length;
  function setCase(i) { const q = CS(); if (q.sel !== i) { q.sel = i; q.flip = 0; Sound.tick(); } updateCtl(); }
  function checkCs() {
    const q = CS();
    CASES.forEach((c, i) => {
      [0, 1].forEach((k) => { const was = q.ok[i][k]; q.ok[i][k] = q.in[i][k] !== '' && near(parseNum(q.in[i][k]), c.q[k].a, c.q[k].tol); if (q.ok[i][k] && !was) Sound.tick(); });
      const d = csDone(i); if (d && !q.done[i]) { q.done[i] = true; Sound.success(); if (i === q.sel) parts.burst(RC.L.x + RC.L.w / 2, RC.L.y + 260, { count: 18, speed: 130, life: 0.7, size: 3.8 }); } if (!d) q.done[i] = false;
    });
  }
  function stepCs(dt) { const q = CS(); q.flip = ap2(q.flip, 1, dt, 5); if (q.flip > 0.995) q.flip = 1; }
  function drawCase(t) {
    const L = RC.L, q = CS(), cs = CASES[q.sel];
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '📣 사례 5장 중 2장 이상 골라 발표 틀을 채워요', PHONE ? 14 : 15, INK, 'left', 800);
    // 카드 줄
    const cw = (L.w - 28 - 4 * 6) / 5, cy = L.y + 40;
    CASES.forEach((c, i) => {
      const x = L.x + 14 + i * (cw + 6), sel = i === q.sel, d = csDone(i);
      const sc = sel ? sm(q.flip) : 1;
      ctx.save(); ctx.translate(x + cw / 2, cy + 33); ctx.scale(Math.max(0.05, sc), 1);
      D.roundRect(-cw / 2, -33, cw, 66, 10); ctx.fillStyle = d ? 'rgba(20,160,88,.12)' : sel ? 'rgba(124,58,237,.1)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = d ? GOOD : sel ? PUR : '#d9d0f5'; ctx.lineWidth = sel ? 2.6 : 1.5; ctx.stroke();
      T(0, -6, c.ic, 22, INK, 'center', 800);
      wrap(c.name.replace(/ \(.*\)/, ''), cw - 8, 11.5, 800).slice(0, 2).forEach((ln, k) => T(0, 14 + k * 13, ln, 11.5, INK, 'center', 800));
      ctx.restore();
      if (d) D.check(x + cw - 10, cy + 8, 7, 1);
    });
    // 상세
    const dy = cy + 82;
    D.roundRect(L.x + 12, dy, L.w - 24, L.h - (dy - L.y) - 12, 12); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#d9d0f5'; ctx.lineWidth = 1.5; ctx.stroke();
    T(L.x + 24, dy + 26, cs.ic + ' ' + cs.name, 15.5, INK, 'left', 800);
    wrap(cs.iso + ' · 반감기 ' + (cs.k === 'u238' ? '약 45억 년' : cs.k === 'c14' ? thou(cs.th) + ' 년' : cs.th + ' ' + cs.unit), L.w - 48, 12.5, 700).slice(0, 2).forEach((ln, k) => T(L.x + 24, dy + 46 + k * 16, ln, 12.5, MUTED, 'left', 700));
    // 표: n, 시간, 남는 비율 막대
    const ty = dy + 86, rh = PHONE ? 30 : 33, x0 = L.x + 24, W = L.w - 48, cn = 34, ct = W * 0.3;
    T(x0 + cn / 2, ty + 12, 'n', 12.5, MUTED, 'center', 800); T(x0 + cn + ct / 2, ty + 12, '경과 시간', 12.5, MUTED, 'center', 800); T(x0 + cn + ct + (W - cn - ct) / 2, ty + 12, '남는 비율 (%)', 12.5, MUTED, 'center', 800);
    const hideT = {}, hideP = {};
    cs.q.forEach((qq, k) => { if (!q.ok[q.sel][k]) { if (qq.hide === 'time') hideT[qq.n] = k + 1; else hideP[qq.n] = k + 1; } });
    for (let n = 0; n <= 5; n++) {
      const y = ty + 20 + n * rh, hT = hideT[n], hP = hideP[n];
      D.roundRect(x0, y, W, rh - 4, 7); ctx.fillStyle = (hT || hP) ? 'rgba(124,58,237,.07)' : '#fff'; ctx.fill(); ctx.strokeStyle = (hT || hP) ? PUR : '#e1dcf3'; ctx.lineWidth = (hT || hP) ? 1.8 : 1.1; ctx.stroke();
      T(x0 + cn / 2, y + rh / 2 + 1, String(n), 13.5, INK, 'center', 800);
      T(x0 + cn + ct / 2, y + rh / 2 + 1, hT ? '? (' + (hT === 1 ? '①' : '②') + ')' : cs.tUnit(n), 13, hT ? PUR : INK, 'center', 800);
      const bx = x0 + cn + ct + 6, bwmax = W - cn - ct - 60, v = Math.pow(0.5, n);
      if (!hP) { D.roundRect(bx, y + rh / 2 - 6, Math.max(bwmax * v, 2), 10, 4); ctx.fillStyle = '#6f8fe8'; ctx.fill(); T(bx + bwmax + 6, y + rh / 2 + 1, PCT[n], 12.5, INK, 'left', 800); }
      else { ctx.save(); ctx.strokeStyle = PUR; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4; D.roundRect(bx, y + rh / 2 - 6, bwmax, 10, 4); ctx.stroke(); ctx.restore(); T(bx + bwmax + 6, y + rh / 2 + 1, '? (' + (hP === 1 ? '①' : '②') + ')', 12.5, PUR, 'left', 800); }
    }
    const ey = ty + 20 + 6 * rh + 8;
    if (ey + 20 < L.y + L.h - 10) textBlock(L.x + 24, ey + 6, L.w - 48, '① ② 칸을 계산해서 조작판에 적고, 활용과 한계를 골라요. 남는 양 = 처음 × (1/2)ⁿ', 12.5, MUTED, 17, 700);
  }
  function drawCaseInfo(t) {
    const R = RC.R, q = CS(), n = csN();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📣 발표 틀 (사례 · 반감기 · 활용 · 한계)', 13.5, INK, 'left', 800);
    T(R.x + R.w - 14, R.y + 24, n + ' / 2', 14, n >= 2 ? GOOD : MUTED, 'right', 800);
    const rh = PHONE ? 54 : 76, y0 = R.y + 38, fit = Math.floor((R.h - 46) / (rh + 4));
    CASES.forEach((c, i) => {
      if (i >= fit) return;
      const y = y0 + i * (rh + 4), d = csDone(i), sel = i === q.sel;
      D.roundRect(R.x + 10, y, R.w - 20, rh, 10); ctx.fillStyle = d ? 'rgba(20,160,88,.09)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = d ? GOOD : sel ? PUR : '#d9d0f5'; ctx.lineWidth = sel || d ? 2 : 1.3; ctx.stroke();
      T(R.x + 20, y + 22, c.ic + ' ' + c.name.replace(/ \(.*\)/, ''), 13.5, INK, 'left', 800);
      if (d) { wrap('반감기 ' + (c.k === 'u238' ? '약 45억 년' : c.k === 'c14' ? thou(c.th) + ' 년' : c.th + ' ' + c.unit) + ' · ' + c.use[c.useA], R.w - 40, 12, 700).slice(0, PHONE ? 1 : 3).forEach((ln, k) => T(R.x + 20, y + 42 + k * 15, ln, 12, '#0f6b3c', 'left', 700)); D.check(R.x + R.w - 26, y + 18, 8, 1); }
      else T(R.x + 20, y + 44, '아직 완성하지 않았어요', 12.5, '#9aa6bb', 'left', 700);
    });
  }

  /* ================= 컨트롤 · 공통 ================= */
  const chipBtn = (txt, aria, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  function build() {
    ['1.00 → 0.50 M', '0.50 → 0.25 M', '0.25 → 0.125 M'].forEach((s, i) => $('#rdChips').appendChild(chipBtn(s, s, () => setRd(i))));
    C0S.forEach((c0, i) => $('#cmChips').appendChild(chipBtn('처음 ' + f2(c0) + ' M 반감기 측정', '처음 ' + f2(c0) + ' M', () => measure(i))));
    const sr = $('#sortRows');
    SORTC.forEach((c, i) => {
      const lab = document.createElement('span'); lab.className = 'lab'; lab.id = 'stL' + i; lab.textContent = '곡선 ' + c.id; lab.addEventListener('click', () => { Sound.click(); setSt(i); }); sr.appendChild(lab);
      const box = document.createElement('div'); box.className = 'chips tight'; box.id = 'stC' + i; sr.appendChild(box);
      PAT.forEach((p, k) => box.appendChild(chipBtn(p[2], '곡선 ' + c.id + ' ' + p[1], () => { ST().ans[i] = k; ST().wrong[i] = false; setSt(i); })));
    });
    RXN2.forEach((r, i) => $('#rmChips').appendChild(chipBtn(r.name, r.name, () => setRx(i))));
    CASES.forEach((c, i) => $('#csChips').appendChild(chipBtn(c.ic + ' ' + c.name.replace(/ \(.*\)/, ''), c.name, () => setCase(i))));
  }
  function buildCase() {
    const q = CS(), c = CASES[q.sel];
    $('#csL1').textContent = '① ' + c.q[0].lab; $('#csL2').textContent = '② ' + c.q[1].lab;
    const u = $('#csUse'), l = $('#csLim'); u.innerHTML = ''; l.innerHTML = '';
    c.use.forEach((s, i) => u.appendChild(chipBtn(s, s, () => { q.use[q.sel] = i; checkCs(); updateCtl(); if (i !== c.useA) { showHint('이 사례의 활용이 아니에요. 반감기가 이 사례에서 어떻게 쓰이는지 떠올려요.'); Sound.fail(); } })));
    c.lim.forEach((s, i) => l.appendChild(chipBtn(s, s, () => { q.lim[q.sel] = i; checkCs(); updateCtl(); if (i !== c.limA) { showHint('이 사례의 한계가 아니에요. 반감기로 알아내는 데 어떤 어려움이 있을지 생각해요.'); Sound.fail(); } })));
    $('#csUse').dataset.k = String(q.sel);
  }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.getAttribute('data-show') !== S.mode; });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const R = RD(), C = CM(), Q = ST(), M = RMX(), q = CS();
    $$('#rdChips button').forEach((b, k) => { b.classList.toggle('on', R.sel === k); b.classList.toggle('done', R.seen[k] && R.sel !== k); });
    $('#rdRange').value = String(R.tt); $('#rdRange').style.setProperty('--pct', (R.tt / 160 * 100) + '%'); $('#rdOut').textContent = R.tt + ' s'; $('#rdMinus').disabled = R.tt <= 0; $('#rdPlus').disabled = R.tt >= 160;
    ['rd1', 'rd2'].forEach((id, k) => { const inp = $('#' + id); inp.classList.toggle('ok', R.ok[k]); if (document.activeElement !== inp && inp.value !== R.in[k]) inp.value = R.in[k]; });
    $$('#cmChips button').forEach((b, k) => { b.classList.toggle('on', C.sel === k); b.classList.toggle('done', C.meas[k]); });
    SORTC.forEach((c, i) => { $('#stL' + i).classList.toggle('on', Q.sel === i); $$('#stC' + i + ' button').forEach((b, k) => { const on = Q.ans[i] === k; b.classList.toggle('on', on && !Q.wrong[i]); b.classList.toggle('no', on && Q.wrong[i]); }); });
    $$('#rmChips button').forEach((b, k) => b.classList.toggle('on', M.rx === k));
    $('#rmRange').value = String(M.tt); $('#rmRange').style.setProperty('--pct', (M.tt / 240 * 100) + '%'); $('#rmOut').textContent = M.tt + ' s'; $('#rmMinus').disabled = M.tt <= 0; $('#rmPlus').disabled = M.tt >= 240;
    ['rq1', 'rq2', 'rq3'].forEach((id, k) => { const inp = $('#' + id); inp.classList.toggle('ok', M.ok[k]); if (document.activeElement !== inp && inp.value !== M.q[k]) inp.value = M.q[k]; });
    $$('#csChips button').forEach((b, k) => { b.classList.toggle('on', q.sel === k); b.classList.toggle('done', csDone(k)); });
    if ($('#csUse').dataset.k !== String(q.sel)) buildCase();
    ['cs1', 'cs2'].forEach((id, k) => { const inp = $('#' + id); inp.classList.toggle('ok', q.ok[q.sel][k]); if (document.activeElement !== inp && inp.value !== q.in[q.sel][k]) inp.value = q.in[q.sel][k]; });
    const cc = CASES[q.sel];
    $$('#csUse button').forEach((b, k) => { const on = q.use[q.sel] === k; b.classList.toggle('on', on && k === cc.useA); b.classList.toggle('no', on && k !== cc.useA); b.style.textAlign = 'left'; b.style.borderRadius = '14px'; });
    $$('#csLim button').forEach((b, k) => { const on = q.lim[q.sel] === k; b.classList.toggle('on', on && k === cc.limA); b.classList.toggle('no', on && k !== cc.limA); b.style.textAlign = 'left'; b.style.borderRadius = '14px'; });
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#rdRange').addEventListener('input', (e) => { RD().tt = +e.target.value; updateCtl(); });
  $('#rdMinus').addEventListener('click', () => { Sound.click(); RD().tt = clamp(RD().tt - 10, 0, 160); updateCtl(); });
  $('#rdPlus').addEventListener('click', () => { Sound.click(); RD().tt = clamp(RD().tt + 10, 0, 160); updateCtl(); });
  $('#rmRange').addEventListener('input', (e) => setRmT(+e.target.value));
  $('#rmMinus').addEventListener('click', () => { Sound.click(); setRmT(RMX().tt - 5); });
  $('#rmPlus').addEventListener('click', () => { Sound.click(); setRmT(RMX().tt + 5); });
  ['rd1', 'rd2'].forEach((id, k) => {
    const inp = $('#' + id);
    inp.addEventListener('input', () => { RD().in[k] = inp.value; inp.classList.remove('bad'); checkRd(); updateCtl(); });
    inp.addEventListener('focus', () => { if (RD().sel !== k) { RD().sel = k; RD().p = 0; RD().seen[k] = true; updateCtl(); } });
    inp.addEventListener('change', () => {
      if (inp.value === '' || RD().ok[k]) return; shakeBad(inp); const v = parseNum(inp.value);
      if (near(v, 80, 1.5) || near(v, 0.5, 0.01)) showHint('절반이 되는 시각의 차이를 읽어요. 그래프의 가로 눈금은 40 s 간격이에요.');
      else showHint(k === 0 ? '곡선에서 1.00 M 일 때는 t = 0, 0.50 M 이 되는 시각은? 두 시각의 차이가 걸린 시간이에요.' : '0.50 M 이 되는 시각(40 s) 에서 0.25 M 이 되는 시각까지의 차이를 읽어요.');
    });
  });
  [['#rq1', 0, [12.5, 0.3]], ['#rq2', 1, [160, 2]], ['#rq3', 2, [20, 1]]].forEach(([id, k, ans]) => {
    const inp = $(id);
    inp.addEventListener('input', () => { RMX().q[k] = inp.value; inp.classList.remove('bad'); checkRm(); updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || RMX().ok[k]) return; shakeBad(inp); const v = parseNum(inp.value);
      if (k === 0) showHint(near(v, 0.125, 0.001) ? '비율을 % 로 적어요. 0.125 = 12.5 % 예요.' : '120 s 는 반감기 몇 번일까요? 120 / 40 = 3번이므로 100 % × (1/2)³ 이에요.');
      else if (k === 1) showHint('6.25 % = 100 % × (1/2)⁴ 이니 반감기 4번이에요. 4 × 40 s 를 계산해요.');
      else showHint('반응 ② 로 바꾸고 시간 슬라이더로 남는 A 가 50 % 가 되는 시각을 찾아요.');
    });
  });
  ['cs1', 'cs2'].forEach((id, k) => {
    const inp = $('#' + id);
    inp.addEventListener('input', () => { CS().in[CS().sel][k] = inp.value; inp.classList.remove('bad'); checkCs(); updateCtl(); });
    inp.addEventListener('change', () => {
      const q = CS(), c = CASES[q.sel]; if (inp.value === '' || q.ok[q.sel][k]) return; shakeBad(inp); const qq = c.q[k];
      showHint('n = ' + qq.n + ' 번의 반감기예요. ' + (qq.hide === 'time' ? '경과 시간 = n × 반감기 = ' + qq.n + ' × ' + (c.k === 'c14' ? thou(c.th) : c.th) + '.' : '남는 비율 = 100 % × (1/2)^' + qq.n + '.'));
    });
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'read') resetRead(); else if (S.mode === 'cmp') resetCmp(); else if (S.mode === 'sort') resetSort(); else if (S.mode === 'rem') resetRem(); else resetCase();
    updateCtl();
  });
  const resetRead = () => { const R = RD(); R.sel = -1; R.p = 0; R.seen = [false, false, false]; R.tt = 0; R.tk = 0; R.in = ['', '']; R.ok = [false, false]; R.flash = 0; ['#rd1', '#rd2'].forEach((id) => { $(id).value = ''; $(id).classList.remove('ok', 'bad'); }); };
  const resetCmp = () => { const C = CM(); C.meas = [false, false, false]; C.p = [0, 0, 0]; C.sel = -1; };
  const resetSort = () => { const Q = ST(); Q.sel = 0; Q.ans = [-1, -1, -1]; Q.wrong = [false, false, false]; Q.p = 1; };
  const resetRem = () => { const M = RMX(); M.rx = 0; M.tt = 0; M.tk = 0; M.q = ['', '', '']; M.ok = [false, false, false]; ['#rq1', '#rq2', '#rq3'].forEach((id) => { $(id).value = ''; $(id).classList.remove('ok', 'bad'); }); };
  const resetCase = () => { const q = CS(); q.in = CASES.map(() => ['', '']); q.ok = CASES.map(() => [false, false]); q.use = CASES.map(() => -1); q.lim = CASES.map(() => -1); q.done = CASES.map(() => false); q.sel = 0; q.flip = 1; ['#cs1', '#cs2'].forEach((id) => { $(id).value = ''; $(id).classList.remove('ok', 'bad'); }); $('#csUse').dataset.k = ''; };
  /* 캔버스 누르기: 사례 카드, 분류할 곡선 */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'case') { const L = RC.L, cw = (L.w - 28 - 24) / 5; for (let i = 0; i < 5; i++) { const x = L.x + 14 + i * (cw + 6); if (inRect(p, { x, y: L.y + 40, w: cw, h: 66 })) { setCase(i); return false; } } }
      if (S.mode === 'sort') { const L = RC.L; for (let i = 0; i < 3; i++) { const lx = L.x + 296 + i * 46; if (inRect(p, { x: lx - 22, y: L.y + 30, w: 44, h: 30 })) { setSt(i); return false; } } }
      return false;
    },
    hover(p) {
      if (S.mode === 'case') { const L = RC.L, cw = (L.w - 28 - 24) / 5; for (let i = 0; i < 5; i++) { const x = L.x + 14 + i * (cw + 6); if (inRect(p, { x, y: L.y + 40, w: cw, h: 66 })) return 'pointer'; } }
      if (S.mode === 'sort') { const L = RC.L; for (let i = 0; i < 3; i++) { const lx = L.x + 296 + i * 46; if (inRect(p, { x: lx - 22, y: L.y + 30, w: 44, h: 30 })) return 'pointer'; } }
      return null;
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'read') { const R = RD(); L1 = '커서 t'; a = fk(R.tk) + ' s'; L2 = '커서의 [A]'; b = c3(cur1(R.tk)) + ' M'; L3 = '읽은 구간'; c = R.ok.filter(Boolean).length + ' / 2'; }
    else if (S.mode === 'cmp') { const C = CM(); L1 = '측정한 처음 농도'; a = C.meas.filter(Boolean).length + ' / 3'; L2 = '반감기'; b = C.meas.every(Boolean) ? '모두 40 s' : C.meas.some(Boolean) ? '40 s' : '?'; L3 = '곡선 모양'; c = '1차 (반감기 일정)'; }
    else if (S.mode === 'sort') { const Q = ST(); L1 = '고른 곡선'; a = SORTC[Q.sel].id; L2 = '반감기 간격'; b = SORTC[Q.sel].iv.map((v) => f0(v)).join(' · ') + ' s'; L3 = '분류한 곡선'; c = Q.ans.filter((x) => x >= 0).length + ' / 3'; }
    else if (S.mode === 'rem') { const M = RMX(), fr = rmFrac(M.rx, M.tk); L1 = '시간 t'; a = fk(M.tk) + ' s'; L2 = '남는 A'; b = pctTxt(fr * 100) + ' %'; L3 = '생긴 B'; c = pctTxt((1 - fr) * 100) + ' %'; }
    else { const q = CS(), cc = CASES[q.sel]; L1 = '고른 사례'; a = cc.name.replace(/ \(.*\)/, ''); L2 = '완성한 사례'; b = csN() + ' / 5'; L3 = '발표 조건'; c = csN() >= 2 ? '완료' : '2장 이상'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '반감기 찾기: 농도–시간 곡선', short: '반감기 찾기', icon: '⌛', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 반응이 절반 진행되는 데 걸리는 시간이 시작할 때 양과 상관이 없는 반응이 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 농도가 줄면 반응 속도도 줄어드는 것과, 속도식 v = k[A] 인 <b>1차 반응</b>을 배웠어요. 이번에는 농도–시간 <b>자료와 곡선</b>에서 반응이 얼마나 빨리 진행되는지를 <b>시간의 눈금</b>으로 읽어 봐요.</div>' +
        '<p><b>반감기(t₁/₂)</b>는 반응물의 농도가 처음의 절반으로 줄어드는 데 걸리는 시간이에요. 곡선에서 농도가 1.00 M → 0.50 M → 0.25 M 로 줄어드는 시간 간격을 가로로 재면 돼요. 계산식을 유도하지 않고 <b>자료를 읽어서</b> 반감기를 찾아요.</p>',
      features: ['read'],
      setup() { S.lock = false; setMode('read'); },
      recap: '반감기는 농도가 절반이 되는 데 걸리는 시간이에요. 이 1차 반응은 1.00 → 0.50 도, 0.50 → 0.25 도 40 s 예요.',
      summary: '<ul><li><b>반감기 t₁/₂</b> = 반응물의 농도가 처음의 절반으로 줄어드는 데 걸리는 시간.</li><li>자료 1 (1차 반응 A → B, 25 °C): [A] = 1.00, 0.50, 0.25, 0.125, 0.0625 M (t = 0, 40, 80, 120, 160 s) → <b>t₁/₂ = 40 s</b>.</li><li>1.00 → 0.50 도, 0.50 → 0.25 도 같은 40 s 가 걸려요. 1.00 M 에서 0.25 M 까지는 반감기 2번, 80 s.</li><li>반감기는 적분 속도식을 쓰지 않고 농도–시간 자료(표·그래프)를 읽어서 구해요.</li></ul>',
      missions: [
        {
          title: '곡선에서 반감기 읽기',
          goal: '곡선에서 농도가 <b>1.00 → 0.50 M</b>, <b>0.50 → 0.25 M</b> 로 줄어드는 데 걸린 시간을 읽어 입력해요.',
          hint: '구간 칩을 누르면 주황 막대가 시간 축에 나타나요. 막대의 양 끝 눈금(0, 40, 80)의 차이가 걸린 시간이에요.',
          setup() { S.lock = true; resetRead(); setMode('read'); },
          check: () => RD().ok[0] && RD().ok[1], hold: 0.5,
          status: () => '1.00→0.50 ' + mark(RD().ok[0]) + ' &nbsp; 0.50→0.25 ' + mark(RD().ok[1]),
          explain: '1.00 M 은 t = 0, 0.50 M 은 t = 40 s, 0.25 M 은 t = 80 s 에서 만나요. 그래서 두 구간 모두 <b>40 s</b> 가 걸려요. 이 시간이 이 반응의 반감기예요.',
        },
        {
          type: 'quiz', title: '1.00 M 에서 0.25 M 까지',
          goal: '처음 [A] = 1.00 M 인 이 반응에서 0.25 M 이 될 때까지 걸리는 시간은?',
          setup() { S.lock = true; setMode('read'); RD().sel = 1; RD().seen[1] = true; },
          choices: ['40 s', '120 s', '80 s', '160 s'],
          answer: 2,
          feedback: ['40 s 는 반감기 1번(1.00 → 0.50)이에요. 0.25 M 은 한 번 더 절반이 된 값이에요.', '120 s 는 0.125 M 이 되는 시각이에요 (반감기 3번).', '', '160 s 는 0.0625 M 이 되는 시각이에요 (반감기 4번).'],
          explain: '1.00 → 0.50 (40 s) → 0.25 (40 s) 로 반감기가 <b>2번</b> 지나야 해요. 40 s × 2 = <b>80 s</b> 예요.',
        },
      ],
    },
    {
      title: '농도와 반감기: 처음 농도를 바꾸면', short: '농도와 반감기', icon: '🧪', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 처음 1.00 M 일 때 반감기가 40 s 임을 읽었어요. 처음 농도를 바꾸면 반감기도 달라질까요? 같은 반응을 처음 농도 2.00 M, 1.00 M, 0.40 M 로 해 보고, 반감기가 일정하지 않은 반응과도 비교해요.</div>' +
        '<p>1차 반응에서는 반감기가 <b>처음 농도와 관계없이 일정</b>해요. 이유(유도 없이): 속도가 농도에 비례(v = k[A])하므로 농도가 절반이 되면 속도도 절반이 돼요. 그래서 &quot;남은 양의 절반&quot;을 쓰는 데 걸리는 시간이 처음과 같아요. 반응 속도 상수 k 가 클수록 반감기는 짧아요.</p>',
      features: ['cmp', 'sort'],
      setup() { S.lock = false; setMode('cmp'); },
      recap: '1차 반응의 반감기는 처음 농도와 상관없이 일정해요. 반감기가 점점 길어지거나 짧아지는 곡선은 1차 반응이 아니에요.',
      summary: '<ul><li>1차 반응: 처음 농도가 2.00 M, 1.00 M, 0.40 M 이어도 반감기는 모두 <b>40 s</b>. 곡선은 세로 크기만 다른 같은 모양이에요.</li><li>이유: 속도가 농도에 비례 → 농도가 절반이면 속도도 절반 → 남은 양의 절반을 쓰는 데 걸리는 시간이 처음과 같아요.</li><li>반감기가 처음 농도와 상관없이 <b>일정</b>한 것은 1차 반응의 특징이에요. 속도 상수 k 가 클수록 반감기는 짧아요.</li><li>자료 비교: 2차 반응의 곡선은 반감기가 40 → 80 → 160 s 로 계속 2배씩 길어지고, 0차 반응의 곡선은 40 → 20 → 10 s 로 점점 절반씩 짧아져요 (일정하지 않아요).</li></ul>',
      missions: [
        {
          title: '처음 농도 3가지에서 반감기 재기',
          goal: '처음 농도 <b>2.00 M, 1.00 M, 0.40 M</b> 에서 각각 「반감기 측정」을 눌러 농도가 절반이 되는 시각을 읽어요.',
          hint: '조작판의 세 칩을 차례로 눌러요. 곡선마다 절반 높이의 점이 t = 40 s 에 놓이는지 확인해요.',
          setup() { S.lock = true; resetCmp(); setMode('cmp'); },
          check: () => CM().meas.every(Boolean), hold: 0.5,
          status: () => C0S.map((c, i) => f2(c) + ' M ' + mark(CM().meas[i])).join(' &nbsp; '),
          explain: '2.00 → 1.00 M, 1.00 → 0.50 M, 0.40 → 0.20 M 모두 <b>40 s</b> 만에 절반이 돼요. 처음 농도가 달라도 반감기는 같아요 (1차 반응).',
        },
        {
          title: '곡선 ① ② ③ 분류하기',
          goal: '곡선 3개의 <b>농도가 절반이 되는 시간 간격</b>을 보고 알맞은 모양으로 분류해요. 반감기가 일정하면 1차 반응이에요.',
          hint: '곡선을 눌러 간격을 확인해요. 40 → 40 → 40 s 는 일정, 40 → 80 → 160 s 는 길어짐, 40 → 20 → 10 s 는 짧아짐이에요.',
          manual: true,
          setup() { S.lock = true; resetSort(); setMode('sort'); },
          check: () => sortResult(),
          explain: '③ 은 간격이 <b>40, 40, 40 s 로 일정</b>해서 1차 반응이에요. ① 은 40, 80, 160 s 로 계속 2배씩 길어지고(2차 반응 곡선), ② 는 40, 20, 10 s 로 계속 절반씩 짧아져요(0차 반응 곡선). 반감기가 변하면 1차 반응이 아니에요.',
        },
        {
          type: 'quiz', title: '처음 농도가 크면 반감기도 길까?',
          goal: '“1차 반응의 반감기는 처음 농도가 클수록 길다.” 이 말은?',
          setup() { S.lock = true; setMode('cmp'); },
          choices: ['맞아요. 농도가 클수록 줄어들 양이 많아서 오래 걸려요', '틀려요. 처음 농도가 클수록 반감기가 짧아요', '맞아요. 처음 농도에 정확히 비례해요', '틀려요. 1차 반응의 반감기는 처음 농도와 상관없이 일정해요'],
          answer: 3,
          feedback: ['줄어들 양은 많지만 속도도 농도에 비례해 빨라서 걸리는 시간은 같아요. 2.00 → 1.00 도 40 s 였어요.', '반감기는 처음 농도와 관계없이 같아요 (세 곡선 모두 40 s).', '비례하지 않아요. 처음 농도를 바꿔도 반감기는 같아요.', ''],
          explain: '1차 반응은 속도가 농도에 비례해서 농도가 클수록 빨리 줄어요. 그래서 절반이 되는 시간은 처음 농도와 <b>관계없이 일정</b>해요.',
        },
      ],
    },
    {
      title: '남는 양: 반감기가 n 번 지나면', short: '남는 양', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 1차 반응의 반감기가 일정하다는 것을 확인했어요. 반감기가 일정하면 시간이 지난 뒤 <b>남는 양</b>을 예측할 수 있어요.</div>' +
        '<p>반감기가 n 번 지나면 남는 양은 처음의 <b>(1/2)ⁿ</b> 이에요 (n = 경과 시간 / 반감기). 반감기가 1번, 2번, 3번 지나면 50 %, 25 %, 12.5 % 가 남고, 6.25 % 는 4번이에요. 입자 128개로 남는 양을 눈으로 확인하고 문제를 풀어 봐요.</p>',
      features: ['rem'],
      setup() { S.lock = false; setMode('rem'); },
      recap: '반감기가 n 번 지나면 처음의 (1/2)ⁿ 이 남아요. k 가 큰 반응일수록 반감기가 짧아요.',
      summary: '<ul><li>남는 양 = 처음 × (1/2)ⁿ (n = 경과 시간 / 반감기). n = 1, 2, 3, 4 이면 50, 25, 12.5, 6.25 %.</li><li>반감기 40 s 인 반응: 120 s 후 n = 3 이므로 <b>12.5 %</b>, 6.25 % 가 되는 시간은 n = 4 이므로 <b>160 s</b>.</li><li>속도 상수 k 가 2배인 1차 반응은 같은 시간 동안 두 배 빠르게 줄어 반감기가 절반 (<b>약 20 s</b>) 이에요.</li><li>한 반감기가 지났다고 나머지 절반이 모두 반응하는 것은 아니에요. 남은 양의 절반이 다시 줄어요.</li></ul>',
      missions: [
        {
          title: '남은 양 문제 3개',
          goal: '시간 슬라이더로 남는 양을 읽어 <b>3문제</b>를 풀어요.',
          hint: '① 120 s 는 반감기 3번 → 100 × (1/2)³ = 12.5 %. ② 6.25 % = (1/2)⁴ 이니 4 × 40 s. ③ 「반응 ②」를 골라 남는 A 가 50 % 가 되는 시각을 찾아요.',
          setup() { S.lock = true; resetRem(); setMode('rem'); },
          check: () => RMX().ok.every(Boolean), hold: 0.5,
          status: () => '① ' + mark(RMX().ok[0]) + ' &nbsp; ② ' + mark(RMX().ok[1]) + ' &nbsp; ③ ' + mark(RMX().ok[2]),
          explain: '① 120 s 후 반감기 3번 → <b>12.5 %</b>. ② 6.25 % 는 반감기 4번 → 4 × 40 s = <b>160 s</b>. ③ k 가 2배인 반응 ② 는 반응 ① 보다 2배 빠르게 줄어 50 % 가 되는 시각이 <b>20 s</b> 예요.',
        },
        {
          type: 'quiz', title: '반감기가 지나면 나머지는?',
          goal: '“반감기가 한 번 지나고 나면 남은 절반이 모두 반응한다.” 이 말은?',
          setup() { S.lock = true; setMode('rem'); },
          choices: ['맞아요. 반감기 두 번이면 모두 없어져요', '틀려요. 반감기가 지나면 더 이상 반응하지 않아요', '틀려요. 다음 반감기 동안 남은 양의 절반만 다시 줄어요', '맞아요. 그래서 반감기는 반응이 끝나는 시간이에요'],
          answer: 2,
          feedback: ['반감기 두 번이면 처음의 1/4(25 %)이 남아요. 모두 없어지지 않아요.', '반응은 계속 일어나요. 다만 남은 양이 줄어든 만큼 속도도 느려져요.', '', '반감기는 반응이 끝나는 시간이 아니라 양이 절반이 되는 시간이에요.'],
          explain: '1차 반응에서는 남은 양의 <b>절반씩</b> 줄어요: 100 → 50 → 25 → 12.5 → 6.25 %. 몇 번이 지나도 이론적으로 0 이 되지는 않아요.',
        },
      ],
    },
    {
      title: '사례 발표: 반감기의 활용', short: '사례 발표', icon: '📣', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반감기로 남는 양을 예측했어요. 같은 규칙이 <b>방사성 동위 원소의 붕괴</b>에도 적용되고, 약물이 몸속에서 줄어드는 것에도 쓰여요. 사례를 조사해 발표 틀(사례 · 반감기 · 활용 · 한계)을 채워 봐요.</div>' +
        '<p>사례 카드 5장 중 <b>2장 이상</b>을 골라 ① 표의 빈 칸 계산, ② 활용, ③ 한계를 완성해요. 남는 양 = 처음 × (1/2)ⁿ 을 써요. 탄소-14 (5730 년), 아이오딘-131 (8 일), 우라늄-238 (약 45억 년) 처럼 반감기가 사례마다 크게 달라서 쓰임새가 달라요.</p>',
      features: ['case'],
      setup() { S.lock = false; setMode('case'); },
      recap: '반감기는 유물·암석의 나이 측정, 방사성 의약품, 약물 복용 간격처럼 다양하게 쓰이고, 사례마다 한계가 있어요.',
      summary: '<ul><li><b>탄소 연대 측정</b>: ¹⁴C 반감기 5730 년. 유물 속 ¹⁴C 가 25 % 남으면 2회 → 11460 년, 12.5 % 면 3회 → 17190 년. 약 5만 년보다 오래된 시료는 측정이 어려워요.</li><li><b>아이오딘-131</b>: 반감기 8 일. 24 일 후 12.5 %, 40 일 후 약 3.1 %. 갑상선 검사와 치료에 쓰고, 방사선 안전 관리가 필요해요.</li><li><b>약물</b> (예: 몸속 반감기 6 시간): 24 시간 후 6.25 % 가 남아요. 반감기에 맞추어 복용 간격을 정해요.</li><li><b>우라늄-238</b>: 반감기 약 45억 년. 암석과 지구의 나이를 알아내요.</li><li>방사성 동위 원소의 붕괴와 1차 화학 반응(예: H₂O₂ 분해)은 같은 규칙(일정한 반감기)을 따라요.</li></ul>',
      missions: [
        {
          title: '사례 2개 이상 완성하기',
          goal: '사례 카드를 <b>2장 이상</b> 골라 표의 빈 칸 두 개를 계산하고, <b>활용</b>과 <b>한계</b>를 알맞게 골라 완성해요.',
          hint: '카드를 고르고 ① ② 칸에 계산 결과를 적어요. 남는 비율 = 100 % × (1/2)ⁿ, 경과 시간 = n × 반감기. 그다음 활용과 한계를 골라요.',
          manual: true,
          setup() { S.lock = true; resetCase(); setMode('case'); },
          check: () => (csN() >= 2 ? true : csN() === 1 ? '한 장을 완성했어요. 사례 카드를 한 장 더 완성해요.' : '카드마다 표의 두 칸(①, ②)과 활용, 한계를 모두 맞게 채워야 해요.'),
          explain: '완성한 사례 모두 <b>남는 양 = 처음 × (1/2)ⁿ</b> 로 계산해요. 예: 탄소-14 가 25 % 남았으면 n = 2, 2 × 5730 = 11460 년. 반감기가 사례마다 달라 쓰임새와 한계가 달라요.',
        },
        {
          type: 'quiz', title: '복용 간격을 반감기에 맞추는 까닭',
          goal: '약의 복용 간격을 몸속 반감기에 맞추어 정하는 까닭은?',
          setup() { S.lock = true; setMode('case'); CS().sel = 2; },
          choices: ['약이 몸속에서 일정한 비율로 줄어서, 효과가 나는 농도가 유지되도록 다시 먹을 때를 정하기 때문이에요', '반감기가 지나면 약이 모두 없어져서 다시 먹어야 하기 때문이에요', '약은 반감기와 상관없이 하루 세 번만 먹어야 하기 때문이에요', '반감기가 길수록 약을 더 많이 먹어야 하기 때문이에요'],
          answer: 0,
          feedback: ['', '반감기가 지나면 절반이 남아요. 약이 모두 없어지는 것이 아니에요.', '약마다 몸속 반감기가 달라서 복용 간격도 달라요.', '반감기가 길면 몸속에 오래 남아서 오히려 복용 간격이 길어질 수 있어요.'],
          explain: '몸속 약의 양은 반감기마다 절반씩 줄어요. 효과가 나는 농도를 <b>유지하면서 너무 높아지지 않게</b> 반감기에 맞추어 복용 간격을 정해요.',
        },
      ],
    },
  ];

  build(); buildCase();
  game = SciSim.game({
    simId: 'hx-half-life', mount: '#game', badge: '반감기 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { read: '⌛ 반감기 읽기', cmp: '🧪 처음 농도 바꾸기', sort: '🗂 곡선 분류', rem: '🎯 남는 양', case: '📣 사례 발표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setMode('read');
  function stepAll1(dt) { S.t += dt; stepRd(dt); stepCm(dt); stepSt(dt); stepRm(dt); stepCs(dt); }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'read') { drawRead(S.t); drawReadInfo(S.t); }
    else if (S.mode === 'cmp') { drawCmp(S.t); drawCmpInfo(S.t); }
    else if (S.mode === 'sort') { drawSort(S.t); drawSortInfo(S.t); }
    else if (S.mode === 'rem') { drawRem(S.t); drawRemInfo(S.t); }
    else { drawCase(S.t); drawCaseInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, CASES, SORTC, RXN2, C0S, first, second, zeroth, setMode, setRd, measure, setSt, setRx, setRmT, setCase, sortResult, stDone, csDone, csN, gRead, gCmp, gSort, rmFrac, updateCtl, checkCs,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
