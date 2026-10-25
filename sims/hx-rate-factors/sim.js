/* =========================================================
   물질과 에너지 Ⅳ. 반응 속도 - 농도·온도와 반응 속도 [12물에04-04]
   ① 실험: 농도 효과 (Na₂S₂O₃ + HCl 시계 반응, 농도–1/t 그래프)
   ② 실험: 온도 효과 (10 ~ 50 °C, 온도–시간 그래프)
   ③ 모형: 충돌로 설명 (에너지 분포 곡선, Eₐ 이상 분자의 비율, 충돌 횟수)
   ④ 적용: 생활 속 예 (농도 효과 / 온도 효과 분류)
   아레니우스 식 계산은 하지 않고, 촉매는 다음 차시에서 다뤄요.
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
  const f0 = (v) => String(Math.round(v));
  const MINUS = '−';
  const sg = (v, fn) => (v < 0 ? MINUS : v > 0 ? '+' : '') + fn(Math.abs(v));
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const SUPM = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  const SUPD = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  const sup = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  const sci = (v, d) => { if (!(v > 0)) return '0'; let e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e); let s = m.toFixed(d == null ? 1 : d); if (+s >= 10) { e += 1; s = (m / 10).toFixed(d == null ? 1 : d); } return s + '×10' + sup(e); };
  function parseNum(s) {                                  // 0.037, 3.7e-2, 3.7×10⁻², −5.0 모두 읽어요
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + m.split('').map((c) => SUPM[c]).join(''))
      .replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([+-]?[0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const nearRel = (v, a, rel) => !isNaN(v) && Math.abs(v - a) <= Math.abs(a) * rel;

  /* ---------- 그래프 도구 ---------- */
  function G(o) { o.X = (t) => o.x0 + t / o.xmax * o.w; o.Y = (c) => o.y0 + o.h - c / o.ymax * o.h; return o; }
  function axesG(g) {
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x0, g.y0, g.w, g.h, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let c = 0; c <= g.ymax + 1e-6; c += g.ys) { ctx.beginPath(); ctx.moveTo(g.x0, g.Y(c)); ctx.lineTo(g.x0 + g.w, g.Y(c)); ctx.stroke(); T(g.x0 - 7, g.Y(c) + 4, g.yfmt ? g.yfmt(c) : f2(c), 12.5, MUTED, 'right', 700); }
    for (let t = 0; t <= g.xmax + 1e-6; t += g.xs) { ctx.beginPath(); ctx.moveTo(g.X(t), g.y0); ctx.lineTo(g.X(t), g.y0 + g.h); ctx.stroke(); T(g.X(t), g.y0 + g.h + 17, g.xfmt ? g.xfmt(t) : String(t), 12.5, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x0, g.y0 + g.h); ctx.lineTo(g.x0 + g.w, g.y0 + g.h); ctx.stroke();
    T(g.x0 + g.w, g.y0 + g.h + 35, g.xlab || '', 12.5, MUTED, 'right', 800); T(g.x0 - 8, g.y0 - 9, g.ylab || '', 12.5, MUTED, 'left', 800);
  }
  function dash(x1, y1, x2, y2, col, w) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 1.8; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
  const chipBtn = (txt, aria, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  const clearInp = (ids) => ids.forEach((id) => { const e = $(id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } });
  /* 패널 안의 작은 상자 */
  function box(x, y, w, h, fill, stroke, lw, r) { D.roundRect(x, y, w, h, r == null ? 10 : r); ctx.fillStyle = fill || '#f6f7fb'; ctx.fill(); ctx.strokeStyle = stroke || '#dbe3f3'; ctx.lineWidth = lw || 1.5; ctx.stroke(); }

  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { conc: '🧪 농도를 바꿔 시계 반응을 재요', temp: '🌡️ 온도를 바꿔 시계 반응을 재요', why: '🧩 충돌로 설명해요', life: '🏠 생활 속에서 찾아요' };
  const thou = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  /* ================= 자료: Na₂S₂O₃ + 2HCl → 2NaCl + S↓ + SO₂ + H₂O (흐려지는 시계 반응) =================
     농도 실험은 30 °C, 온도 실험은 0.10 M. (0.10 M, 30 °C 에서 40 s 로 두 실험이 같은 값이에요) */
  const CONC = [{ c: 0.05, t: 80 }, { c: 0.10, t: 40 }, { c: 0.15, t: 27 }, { c: 0.20, t: 20 }];
  const TEMP = [{ T: 10, t: 160 }, { T: 20, t: 80 }, { T: 30, t: 40 }, { T: 40, t: 20 }, { T: 50, t: 10 }];
  const RUNX = 8;                                   // 모의 시간 배속 (실제 1 s = 모의 8 s)
  const S = {
    mode: 'conc', fade: 0, lock: false, t: 0,
    cc: { sel: 1, ph: 'idle', tm: 0, meas: [false, false, false, false], in: ['', '', '', ''], ok: [false, false, false, false], fly: [0, 0, 0, 0], line: 0, roll: 0 },
    tp: { sel: 2, ph: 'idle', tm: 0, meas: [false, false, false, false, false], fly: [0, 0, 0, 0, 0], line: 0 },
    wy: { Tk: 298, mul: 1, seen: {}, in: ['', ''], ok: [false, false], bar: [0, 0], curv: 0, mols: [], fx: [], flashT: 0 },
    lf: { sel: -1, cards: [], drag: -1, pulse: 1, last: -1 },
    ins: { n: 0, S: [], H: [], hits: [] },
  };
  let game = null;

  /* ---------- 입자 돋보기 (원형 창, 진짜 탄성 충돌) ---------- */
  const INS_R = 74;
  function insInit(nS) {
    const I = S.ins; I.n = nS; I.S = []; I.H = []; I.hits = [];
    const mk = (r) => { let x, y; do { x = rnd(-INS_R + r, INS_R - r); y = rnd(-INS_R + r, INS_R - r); } while (Math.hypot(x, y) > INS_R - r - 1); const a = rnd(0, TAU); return { x, y, vx: Math.cos(a), vy: Math.sin(a), r, fl: 0 }; };
    for (let i = 0; i < nS; i++) I.S.push(mk(8)); for (let i = 0; i < 10; i++) I.H.push(mk(4.6));
  }
  const insSpeed = () => { const Tc = S.mode === 'temp' ? TEMP[S.tp.sel].T : 30; return 62 * Math.sqrt((Tc + 273.15) / 303.15); };
  const speedRel = (Tc) => Math.sqrt((Tc + 273.15) / 283.15);
  function stepIns(dt) {
    const I = S.ins, v = insSpeed(), all = I.S.concat(I.H);
    all.forEach((p) => { const m = Math.hypot(p.vx, p.vy) || 1; p.vx = p.vx / m * v; p.vy = p.vy / m * v; });          // 모든 입자의 속력 = 평균 속력 (방향만 무작위)
    const sub = Math.max(1, Math.ceil(dt / 0.01)), h = dt / sub;
    for (let s = 0; s < sub; s++) {
      all.forEach((p) => {
        p.x += p.vx * h; p.y += p.vy * h; p.fl = Math.max(0, p.fl - h * 2.5);
        const d = Math.hypot(p.x, p.y), lim = INS_R - p.r;
        if (d > lim) { const nx = p.x / d, ny = p.y / d; p.x = nx * lim; p.y = ny * lim; const dp = p.vx * nx + p.vy * ny; if (dp > 0) { p.vx -= 2 * dp * nx; p.vy -= 2 * dp * ny; } }
      });
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), rr = a.r + b.r;
        if (d >= rr || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vn <= 0) continue;
        const ov = (rr - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        a.vx -= vn * nx; a.vy -= vn * ny; b.vx += vn * nx; b.vy += vn * ny;
        if ((a.r > 6) !== (b.r > 6)) { a.fl = b.fl = 1; I.hits.push(S.t); }
      }
    }
    while (I.hits.length && I.hits[0] < S.t - 5) I.hits.shift();
  }
  const insCount = () => S.ins.hits.length;
  function drawIns(cx, cy, showArrows) {
    const I = S.ins;
    ctx.save(); D.shadow(() => { ctx.beginPath(); ctx.arc(cx, cy, INS_R + 7, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 2 });
    ctx.beginPath(); ctx.arc(cx, cy, INS_R + 7, 0, TAU); ctx.strokeStyle = PUR; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, INS_R, 0, TAU); ctx.clip(); ctx.fillStyle = '#f4f8ff'; ctx.fillRect(cx - INS_R, cy - INS_R, INS_R * 2, INS_R * 2);
    I.H.forEach((p) => { D.sphere(cx + p.x, cy + p.y, p.r, '#ef4444', { gloss: false }); if (p.fl > 0) { ctx.strokeStyle = 'rgba(245,158,11,' + p.fl + ')'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(cx + p.x, cy + p.y, p.r + 6 * (1 - p.fl) + 3, 0, TAU); ctx.stroke(); } });
    I.S.forEach((p, i) => { D.sphere(cx + p.x, cy + p.y, p.r, '#3867f4', { gloss: true }); if (p.fl > 0) { ctx.strokeStyle = 'rgba(245,158,11,' + p.fl + ')'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(cx + p.x, cy + p.y, p.r + 8 * (1 - p.fl) + 3, 0, TAU); ctx.stroke(); } });
    if (showArrows) I.S.slice(0, 5).forEach((p) => { const m = Math.hypot(p.vx, p.vy) || 1, L2 = m * 0.42; D.arrow(cx + p.x, cy + p.y, cx + p.x + p.vx / m * L2, cy + p.y + p.vy / m * L2, { color: '#0d9488', width: 2.2, head: 6 }); });
    ctx.restore();
  }

  /* ---------- 시계 반응 비커 (위에서 본 모습) ---------- */
  function drawBeakerTop(cx, cy, r, turb, xvis, bath) {
    ctx.save();
    if (bath != null) { D.shadow(() => { ctx.beginPath(); ctx.arc(cx, cy, r + 15, 0, TAU); ctx.fillStyle = bath; ctx.fill(); }, { blur: 8, y: 2 }); ctx.strokeStyle = 'rgba(70,90,120,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r + 15, 0, TAU); ctx.stroke(); }
    D.shadow(() => { ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, TAU); ctx.clip();
    ctx.fillStyle = '#fffdf6'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);                         // 바닥의 종이
    ctx.strokeStyle = 'rgba(30,40,60,' + clamp(xvis, 0, 1) + ')'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 22, cy - 22); ctx.lineTo(cx + 22, cy + 22); ctx.moveTo(cx + 22, cy - 22); ctx.lineTo(cx - 22, cy + 22); ctx.stroke();
    ctx.fillStyle = 'rgba(214,224,190,' + (0.9 * clamp(turb, 0, 1)) + ')'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);                // 황 앙금으로 흐려져요
    ctx.fillStyle = 'rgba(160,205,255,.2)'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(120,150,190,.9)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r - 6, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke(); ctx.restore();
  }
  const clockPhase = (K, ref) => (K.ph === 'idle' ? 0 : Math.min(1, K.tm / ref));
  /* ================= ① 농도 효과 ================= */
  const CC = () => S.cc;
  const rate3 = (t) => (Math.round(1 / t * 10000) / 10000);           // 0.0500, 0.0370, 0.0250, 0.0125
  const fRate = (t) => { const v = rate3(t); return v >= 0.02 ? v.toFixed(3) : v.toFixed(4); };
  function ccSet(i) { const K = CC(); if (K.ph === 'run') return; K.sel = i; K.ph = K.meas[i] ? 'done' : 'idle'; K.tm = K.meas[i] ? CONC[i].t : 0; insInit(Math.round(CONC[i].c / 0.05 * 4)); Sound.tick(); updateCtl(); }
  function ccRun() { const K = CC(); if (K.ph === 'run') return; K.ph = 'run'; K.tm = 0; Sound.click(); updateCtl(); }
  function stepCc(dt) {
    const K = CC();
    if (K.ph === 'run') { K.tm = Math.min(CONC[K.sel].t, K.tm + dt * RUNX); if (K.tm >= CONC[K.sel].t) { K.ph = 'done'; K.meas[K.sel] = true; Sound.success(); const g = ccGraph(); parts.burst(RC.L.x + 140, RC.L.y + 170, { count: 10, speed: 90, life: 0.5, size: 3, colors: ['#d9e6a8', '#14a058'] }); updateCtl(); } }
    for (let i = 0; i < 4; i++) K.fly[i] = ap2(K.fly[i], K.ok[i] ? 1 : 0, dt, 4);
    K.line = ap2(K.line, K.ok.every(Boolean) ? 1 : 0, dt, 3); if (K.line > 0.995) K.line = 1;
  }
  function ccCheck() {
    const K = CC(), a = K.ok.slice();
    for (let i = 0; i < 4; i++) K.ok[i] = K.meas[i] && K.in[i] !== '' && nearRel(parseNum(K.in[i]), 1 / CONC[i].t, 0.03);
    K.ok.forEach((o, i) => { if (o && !a[i]) { Sound.success(); } });
  }
  const ccDone = () => CC().meas.every(Boolean);
  const ccPlot = () => CC().ok.every(Boolean);
  function ccGraph() { const R = RC.R, big = R.h > 440, y0 = R.y + (big ? 244 : 186); return G({ x0: R.x + 54, y0, w: R.w - 76, h: big ? 190 : 150, xmax: 0.25, ymax: 0.06, xs: 0.05, ys: 0.02, yfmt: (v) => v.toFixed(2), xfmt: (v) => v.toFixed(2), xlab: '[Na₂S₂O₃] (M) →', ylab: '' }); }
  function drawClockLeft(K, ref, label, sub, bath, thermo) {
    const L = RC.L, e = clockPhase(K, ref), cx = L.x + 124, cy = L.y + 160, r = 84;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, label, PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, sub, PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    drawBeakerTop(cx, cy + 14, r, e, 1 - e, bath);
    T(cx, cy + 14 + r + (bath != null ? 32 : 24), '비커 속 × 표시 (위에서 본 모습)', 12, MUTED, 'center', 800);
    if (thermo != null) { D.thermometer(cx + r + 30, cy - 42, 108, thermo, 0, 60, {}); T(cx + r + 30, cy + 124, f0(thermo) + ' °C', 12.5, INK, 'center', 800); }
    // 돋보기 연결선과 입자 돋보기
    const ix = L.x + L.w - 100, iy = cy + 14;
    ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx + 8, cy + 14 - 8); ctx.lineTo(ix - INS_R - 6, iy - 30); ctx.moveTo(cx + 8, cy + 14 + 8); ctx.lineTo(ix - INS_R - 6, iy + 30); ctx.stroke(); ctx.restore();
    drawIns(ix, iy, bath != null);
    T(ix, iy + INS_R + 24, '🔍 입자 돋보기', 12.5, PUR, 'center', 800);
    return { e, cx, cy: cy + 14, ix, iy };
  }
  function timerBox(K, tEnd, ph) {
    const L = RC.L, y = L.y + 308, h = L.y + L.h - y - 12;
    box(L.x + 12, y, L.w - 24, h, '#f6f7fb', '#dbe3f3', 1.5, 12);
    const tShown = K.ph === 'idle' ? 0 : K.tm;
    D.roundRect(L.x + 24, y + 12, 128, 52, 12); ctx.fillStyle = '#1f2937'; ctx.fill();
    T(L.x + 24 + 64, y + 48, (K.ph === 'done' ? f0(tEnd) : f0(tShown)) + ' s', 28, '#a7f3d0', 'center', 800);
    T(L.x + 24 + 64, y + 80, K.ph === 'run' ? '재는 중 (' + RUNX + '배속)' : K.ph === 'done' ? '× 가 안 보여요' : '시계 시작 전', 12.5, K.ph === 'done' ? '#0f6b3c' : MUTED, 'center', 800);
    return { x: L.x + 170, y: y + 12, w: L.w - 24 - 170 - 12 + 12, h };
  }
  function drawConc(t) {
    const L = RC.L, K = CC(), cd = CONC[K.sel];
    const o = drawClockLeft(K, cd.t, '🧪 Na₂S₂O₃ + 2HCl → 2NaCl + S↓ + SO₂ + H₂O', '황 앙금으로 흐려져 × 가 안 보일 때까지 시간 t (30 °C, HCl 같은 양)');
    const b = timerBox(K, cd.t);
    T(L.x + 24 + 170 - 12, L.y + 308 + 28, 'Na₂S₂O₃ ' + f2(cd.c) + ' M', 15, PUR, 'left', 800);
    T(L.x + 24 + 170 - 12, L.y + 308 + 52, '🔍 돋보기: 입자 ' + S.ins.S.length + '개 / 같은 부피', 12.5, INK, 'left', 800);
    T(L.x + 24 + 170 - 12, L.y + 308 + 74, '충돌 카운터 (최근 5 s)  ' + insCount() + ' 회', 12.5, '#b45309', 'left', 800);
    const my = L.y + 308 + 110;
    const done = K.meas.filter(Boolean).length;
    textBlock(L.x + 24, my, L.w - 48, K.ph === 'done' ? '농도가 ' + f2(cd.c) + ' M 일 때 ' + cd.t + ' s 걸렸어요. (' + done + ' / 4 측정)' : K.ph === 'run' ? '용액이 서서히 흐려져요… 돋보기 속에서는 입자가 쉴 새 없이 충돌해요.' : '농도를 고르고 「HCl 넣기」를 눌러 시간을 재요. (' + done + ' / 4 측정)', 12.5, K.ph === 'done' ? '#0f6b3c' : MUTED, 17, 800);
    T(L.x + 24, L.y + L.h - 18, '⚠ 보안경 착용, SO₂ 가 조금 나오므로 환기, 폐액은 중화 후 폐수 처리', PHONE ? 11 : 11.5, '#b45309', 'left', 800);
  }
  function drawConcInfo(t) {
    const R = RC.R, K = CC(), big = R.h > 440, rh = big ? 31 : 26, y0 = R.y + 36;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 측정 기록 (30 °C)', 14, INK, 'left', 800);
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 3, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    [['농도 (M)', 0.2], ['t (s)', 0.5], ['1/t (s⁻¹)', 0.8]].forEach(([s, f]) => T(R.x + R.w * f, y0 + rh / 2 + 2, s, 12.5, INK, 'center', 800));
    CONC.forEach((d, i) => {
      const y = y0 + rh * (i + 1), m = K.meas[i], sel = i === K.sel;
      D.roundRect(R.x + 10, y, R.w - 20, rh - 3, 8); ctx.fillStyle = sel ? 'rgba(124,58,237,.07)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#e1dcf3'; ctx.lineWidth = sel ? 2 : 1.2; ctx.stroke();
      T(R.x + R.w * 0.2, y + rh / 2 + 3, f2(d.c), 13, INK, 'center', 800); T(R.x + R.w * 0.5, y + rh / 2 + 3, m ? String(d.t) : '?', 13, m ? '#0f6b3c' : '#aab3c4', 'center', 800);
      T(R.x + R.w * 0.8, y + rh / 2 + 3, K.ok[i] ? fRate(d.t) : '?', 13, K.ok[i] ? PUR : '#aab3c4', 'center', 800);
    });
    const g = ccGraph();
    T(R.x + 14, g.y0 - 20, '그래프: 1/t (s⁻¹) – 농도', 12.5, INK, 'left', 800);
    axesG(g);
    if (K.line > 0.01) { const e = sm(K.line); ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.65)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(0.2 * e), g.Y(0.05 * e)); ctx.stroke(); ctx.restore(); }
    CONC.forEach((d, i) => {
      const e = sm(K.fly[i]); if (e <= 0.01) return;
      const sx = R.x + R.w * 0.8, sy = y0 + rh * (i + 1) + rh / 2, ex = g.X(d.c), ey = g.Y(1 / d.t);
      D.sphere(sx + (ex - sx) * e, sy + (ey - sy) * e, 5.6, PUR, { gloss: true });
    });
    if (K.line > 0.9) T(g.x0 + g.w - 4, g.Y(0.0) - 8, '원점을 지나는 직선', 12, PUR, 'right', 800, HALO);
  }

  /* ================= ② 온도 효과 ================= */
  const TP = () => S.tp;
  function tpSet(i) { const K = TP(); if (K.ph === 'run') return; K.sel = i; K.ph = K.meas[i] ? 'done' : 'idle'; K.tm = K.meas[i] ? TEMP[i].t : 0; Sound.tick(); updateCtl(); }
  function tpRun() { const K = TP(); if (K.ph === 'run') return; K.ph = 'run'; K.tm = 0; Sound.click(); updateCtl(); }
  function stepTp(dt) {
    const K = TP();
    if (K.ph === 'run') { K.tm = Math.min(TEMP[K.sel].t, K.tm + dt * RUNX); if (K.tm >= TEMP[K.sel].t) { K.ph = 'done'; K.meas[K.sel] = true; Sound.success(); parts.burst(RC.L.x + 124, RC.L.y + 174, { count: 10, speed: 90, life: 0.5, size: 3, colors: ['#d9e6a8', '#14a058'] }); updateCtl(); } }
    for (let i = 0; i < 5; i++) K.fly[i] = ap2(K.fly[i], K.meas[i] ? 1 : 0, dt, 4);
    K.line = ap2(K.line, K.meas.every(Boolean) ? 1 : 0, dt, 3); if (K.line > 0.995) K.line = 1;
  }
  const tpDone = () => TP().meas.every(Boolean);
  const bathCol = (Tc) => C.mix('#a8d4ff', '#ffb09a', clamp((Tc - 10) / 40, 0, 1));
  function drawTemp(t) {
    const L = RC.L, K = TP(), d = TEMP[K.sel];
    drawClockLeft(K, d.t, '🌡️ 같은 반응을 10 ~ 50 °C 수조에서 재요', 'Na₂S₂O₃ 0.10 M · 흐려져 × 가 안 보일 때까지 시간 t', bathCol(d.T), d.T);
    timerBox(K, d.t);
    T(L.x + 24 + 170 - 12, L.y + 308 + 28, d.T + ' °C 수조', 15, PUR, 'left', 800);
    T(L.x + 24 + 170 - 12, L.y + 308 + 52, '평균 속력 (10 °C 기준): ×' + f2(speedRel(d.T)), 12.5, INK, 'left', 800);
    T(L.x + 24 + 170 - 12, L.y + 308 + 74, '반응 속도 (10 °C 기준): ' + (K.meas[K.sel] ? '×' + f0(160 / d.t) : '?'), 12.5, '#b45309', 'left', 800);
    const done = K.meas.filter(Boolean).length;
    textBlock(L.x + 24, L.y + 308 + 110, L.w - 48, K.ph === 'done' ? d.T + ' °C 에서 ' + d.t + ' s 걸렸어요. (' + done + ' / 5 측정)' : K.ph === 'run' ? '용액이 흐려지고 있어요… 입자 화살표는 속력을 나타내요.' : '온도를 고르고 「HCl 넣기」를 눌러 시간을 재요. (' + done + ' / 5 측정)', 12.5, K.ph === 'done' ? '#0f6b3c' : MUTED, 17, 800);
    T(L.x + 24, L.y + L.h - 18, '⚠ 보안경 착용, SO₂ 가 조금 나오므로 환기, 폐액은 중화 후 폐수 처리', PHONE ? 11 : 11.5, '#b45309', 'left', 800);
  }
  function tpGraph() { const R = RC.R, big = R.h > 440, y0 = R.y + (big ? 262 : 206); return G({ x0: R.x + 54, y0, w: R.w - 76, h: big ? 172 : 128, xmax: 60, ymax: 180, xs: 10, ys: 60, yfmt: (v) => f0(v), xfmt: (v) => f0(v), xlab: '온도 (°C) →', ylab: '' }); }
  function drawTempInfo(t) {
    const R = RC.R, K = TP(), big = R.h > 440, rh = big ? 29 : 24, y0 = R.y + 34;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 측정 기록 (0.10 M)', 14, INK, 'left', 800);
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 3, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    [['온도', 0.2], ['t (s)', 0.5], ['상대 속도', 0.8]].forEach(([s, f]) => T(R.x + R.w * f, y0 + rh / 2 + 2, s, 12.5, INK, 'center', 800));
    TEMP.forEach((d, i) => {
      const y = y0 + rh * (i + 1), m = K.meas[i], sel = i === K.sel;
      D.roundRect(R.x + 10, y, R.w - 20, rh - 3, 8); ctx.fillStyle = sel ? 'rgba(124,58,237,.07)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#e1dcf3'; ctx.lineWidth = sel ? 2 : 1.2; ctx.stroke();
      T(R.x + R.w * 0.2, y + rh / 2 + 3, d.T + ' °C', 13, INK, 'center', 800); T(R.x + R.w * 0.5, y + rh / 2 + 3, m ? String(d.t) : '?', 13, m ? '#0f6b3c' : '#aab3c4', 'center', 800);
      T(R.x + R.w * 0.8, y + rh / 2 + 3, m ? '×' + f0(160 / d.t) : '?', 13, m ? PUR : '#aab3c4', 'center', 800);
    });
    const g = tpGraph();
    T(R.x + 14, g.y0 - 20, '그래프: 시간 t (s) – 온도', 12.5, INK, 'left', 800);
    axesG(g);
    const pts = TEMP.map((d, i) => ({ x: g.X(d.T), y: g.Y(d.t), on: K.meas[i], e: sm(K.fly[i]) }));
    ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.6)'; ctx.lineWidth = 2.4; ctx.beginPath(); let st = false;
    pts.forEach((p, i) => { if (i > 0 && pts[i - 1].on && p.on) { if (!st) { ctx.moveTo(pts[i - 1].x, pts[i - 1].y); st = true; } ctx.lineTo(p.x, p.y); } else st = false; }); ctx.stroke(); ctx.restore();
    pts.forEach((p, i) => { if (p.e <= 0.01) return; const sx = R.x + R.w * 0.5, sy = y0 + rh * (i + 1) + rh / 2; D.sphere(sx + (p.x - sx) * p.e, sy + (p.y - sy) * p.e, 5.6, PUR, { gloss: true }); });
    if (K.line > 0.9) T(g.x0 + g.w - 6, g.y0 + 26, '10 °C 오를 때마다 시간 1/2', 12, PUR, 'right', 800, HALO);
  }

  /* ================= ③ 충돌로 설명: 에너지 분포 ================= */
  const WY = () => S.wy;
  const KT0 = 1, EMAX_E = 11, EA = (function () {                  // Eₐ: 298 K 에서 Eₐ 이상의 비율이 정확히 3 % 가 되도록 맞춰요
    const f = (e, kt) => Math.sqrt(e) * Math.exp(-e / kt);
    const frac = (ea, kt) => { let a = 0, b = 0; for (let e = 0.0005; e < 80; e += 0.001) { const v = f(e, kt); b += v; if (e >= ea) a += v; } return a / b; };
    let lo = 1, hi = 12; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (frac(m, KT0) > 0.03) lo = m; else hi = m; } return (lo + hi) / 2;
  })();
  const ktOf = (Tk) => KT0 * (1 + 0.019 * (Tk - 298));              // 모식도: 변화를 보기 쉽게 곡선 변화를 크게 그렸어요
  const fE = (e, kt) => Math.sqrt(e) * Math.exp(-e / kt);
  const normOf = (kt) => Math.sqrt(Math.PI) / 2 * Math.pow(kt, 1.5);                  // ∫ √E e^(−E/kT) dE
  const areaCache = {};
  function areaOf(Tk) {
    if (areaCache[Tk] != null) return areaCache[Tk];
    const kt = ktOf(Tk); let a = 0, b = 0; for (let e = 0.0005; e < 80; e += 0.001) { const v = fE(e, kt); b += v; if (e >= EA) a += v; }
    return (areaCache[Tk] = a / b);
  }
  const pctOf = (Tk) => Math.round(areaOf(Tk) * 100);                  // 화면과 확인에 같은 값(정수 %)을 써요
  const collOf = (Tk, mul) => 100000 * Math.sqrt(Tk / 298) * mul;      // 충돌 횟수 (10 s, 예시)
  const effOf = (Tk, mul) => collOf(Tk, mul) * areaOf(Tk);
  const TKS = [298, 308, 318, 328];
  const YMAX_E = 2 * fE(0.5 * ktOf(298), ktOf(298)) / normOf(ktOf(298)) * 1.1;
  function wySet(Tk) { const W = WY(); if (W.Tk !== Tk) { W.Tk = Tk; Sound.tick(); } W.seen[Tk] = true; wyCheck(); updateCtl(); }
  function wyMul(m) { const W = WY(); if (W.mul !== m) { W.mul = m; Sound.tick(); } updateCtl(); }
  function wyCheck() {
    const W = WY(), a = W.ok.slice();
    W.ok[0] = W.in[0] !== '' && near(parseNum(W.in[0]), pctOf(298), 0.5); W.ok[1] = !!W.seen[308] && W.in[1] !== '' && near(parseNum(W.in[1]), pctOf(308), 0.5);
    W.ok.forEach((o, i) => { if (o && !a[i]) Sound.success(); });
  }
  const wyDone = () => WY().ok[0] && WY().ok[1];
  function wyInit() { const W = WY(); W.mols = []; W.fx = []; for (let i = 0; i < 16; i++) { const a = rnd(0, TAU); W.mols.push({ x: rnd(20, 420), y: rnd(10, 60), vx: Math.cos(a), vy: Math.sin(a), on: i < 8 }); } }
  const WIN = () => { const L = RC.L; return { x: L.x + 18, y: L.y + L.h - 78, w: L.w - 36, h: 62 }; };
  function stepWy(dt) {
    const W = WY(), w = WIN(), sp = 70 * Math.sqrt(W.Tk / 298), n = 8 * W.mul;
    W.mols.forEach((m, i) => { m.on = i < n; });
    const act = W.mols.filter((m) => m.on);
    act.forEach((m) => { const k = Math.hypot(m.vx, m.vy) || 1; m.vx = m.vx / k * sp; m.vy = m.vy / k * sp; m.x += m.vx * dt; m.y += m.vy * dt; if (m.x < 7) { m.x = 7; m.vx = Math.abs(m.vx); } if (m.x > w.w - 7) { m.x = w.w - 7; m.vx = -Math.abs(m.vx); } if (m.y < 7) { m.y = 7; m.vy = Math.abs(m.vy); } if (m.y > w.h - 7) { m.y = w.h - 7; m.vy = -Math.abs(m.vy); } });
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
      const a = act[i], b = act[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d >= 14 || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (vn <= 0) continue;
      a.vx -= vn * nx; a.vy -= vn * ny; b.vx += vn * nx; b.vy += vn * ny; const ov = (14 - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      W.fx.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0, eff: Math.random() < areaOf(W.Tk) });          // 에너지 조건을 채울 확률 = 색칠한 면적
    }
    for (let i = W.fx.length - 1; i >= 0; i--) { W.fx[i].t += dt; if (W.fx[i].t > 0.6) W.fx.splice(i, 1); }
    W.curv = ap2(W.curv, 1, dt, 3);
    const tgt = [collOf(W.Tk, W.mul), effOf(W.Tk, W.mul)];
    W.bar[0] = ap2(W.bar[0], tgt[0], dt, 5); W.bar[1] = ap2(W.bar[1], tgt[1], dt, 5);
    W.kt = ap2(W.kt == null ? ktOf(W.Tk) : W.kt, ktOf(W.Tk), dt, 6); W.mulD = ap2(W.mulD == null ? W.mul : W.mulD, W.mul, dt, 6);
    W.eaArea = ap2(W.eaArea == null ? areaOf(W.Tk) : W.eaArea, areaOf(W.Tk), dt, 6);
  }
  function drawWhy(t) {
    const L = RC.L, W = WY(), kt = W.kt == null ? ktOf(W.Tk) : W.kt, mulD = W.mulD == null ? W.mul : W.mulD;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧩 분자의 운동 에너지 분포 (모식도)', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '곡선 변화는 보기 쉽게 크게 그린 모식도예요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const g = G({ x0: L.x + 48, y0: L.y + 78, w: L.w - 66, h: 164, xmax: EMAX_E, ymax: YMAX_E, xs: 2, ys: 99 });
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x0, g.y0, g.w, g.h, 6); ctx.fill();
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x0, g.y0 + g.h); ctx.lineTo(g.x0 + g.w, g.y0 + g.h); ctx.stroke();
    T(g.x0 + g.w, g.y0 + g.h + 17, '분자의 운동 에너지 →', 12.5, MUTED, 'right', 800); T(g.x0 - 6, g.y0 - 8, '분자 수 비율', 12.5, MUTED, 'left', 800);
    const nrm = (k) => normOf(k), Y = (e, k, m) => g.Y(clamp(fE(e, k) / nrm(k) * m, 0, YMAX_E));
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.y0 - 2, g.w, g.h + 4); ctx.clip();
    // 기준 곡선 (298 K, 농도 1배)
    if (W.Tk !== 298 || W.mul !== 1) { ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); for (let e = 0.02; e <= EMAX_E; e += 0.1) { const x = g.X(e), y = Y(e, KT0, 1); e < 0.03 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]); }
    // Eₐ 오른쪽 면적
    ctx.beginPath(); ctx.moveTo(g.X(EA), g.Y(0)); for (let e = EA; e <= EMAX_E + 0.01; e += 0.1) ctx.lineTo(g.X(e), Y(e, kt, mulD)); ctx.lineTo(g.X(EMAX_E), g.Y(0)); ctx.closePath(); ctx.fillStyle = 'rgba(226,70,75,.5)'; ctx.fill(); ctx.strokeStyle = BAD; ctx.lineWidth = 2; ctx.beginPath(); for (let e = EA; e <= EMAX_E + 0.01; e += 0.1) { const x = g.X(e), y = Y(e, kt, mulD); e === EA ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    ctx.strokeStyle = BLU; ctx.lineWidth = 3.4; ctx.beginPath(); for (let e = 0.02; e <= EMAX_E; e += 0.05) { const x = g.X(e), y = Y(e, kt, mulD); e < 0.03 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = BAD; ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(g.X(EA), g.y0); ctx.lineTo(g.X(EA), g.y0 + g.h); ctx.stroke(); ctx.setLineDash([]);
    T(g.X(EA) + 5, g.y0 + 14, 'Eₐ', 13, BAD, 'left', 800, HALO);
    const pc = pctOf(W.Tk);
    D.label(g.X(Math.min(EA + 3.6, EMAX_E - 2)), g.y0 + g.h - 32, 'Eₐ 이상: ' + pc + ' %' + (W.mul === 2 ? ' (농도 2배)' : ''), { size: 12.5, bg: BAD, align: 'center' });
    T(g.x0 + g.w - 8, g.y0 + 18, W.Tk + ' K (' + (W.Tk - 273) + ' °C)', 13.5, BLU, 'right', 800);
    if (W.Tk !== 298 || W.mul !== 1) T(g.x0 + g.w - 8, g.y0 + 36, '┄ 298 K, 농도 1배 기준', 12, '#64748b', 'right', 800);
    // 반응기 전체 카운터 (예시)
    const cy = g.y0 + g.h + 34, bw = L.w - 56;
    T(L.x + 18, cy, '반응기 전체, 10 s 동안 (예시 값)', 13, INK, 'left', 800);
    const rows = [['충돌 횟수', W.bar[0], collOf(298, 1), '#6b7894', collOf(W.Tk, W.mul)], ['에너지 조건 충족', W.bar[1], effOf(298, 1), BAD, effOf(W.Tk, W.mul)]];
    rows.forEach((r, i) => {
      const y = cy + 12 + i * 34, mx = effOf(328, 2) * 1.02;
      T(L.x + 18, y + 12, r[0], 12.5, MUTED, 'left', 800);
      const full = i === 0 ? collOf(328, 2) * 1.02 : mx, x0 = L.x + 150, w = L.w - 150 - 150;
      D.roundRect(x0, y, w, 16, 7); ctx.fillStyle = '#e4e9f3'; ctx.fill();
      const ww = clamp(r[1] / full, 0, 1) * w; if (ww > 0.6) { ctx.save(); D.roundRect(x0, y, w, 16, 7); ctx.clip(); ctx.fillStyle = r[3]; ctx.fillRect(x0, y, ww, 16); ctx.restore(); }
      const base = r[2], cur = r[4], chg = (cur / base - 1) * 100;
      T(x0 + w + 8, y + 12, thou(cur) + ' 회', 12.5, INK, 'left', 800); T(L.x + L.w - 14, y + 12, (chg >= 0 ? '+' : '') + f0(chg) + ' %', 13, r[3] === BAD ? BAD : INK, 'right', 800);
    });
    // 확대 창
    const w = WIN(); box(w.x - 4, w.y - 20, w.w + 8, w.h + 24, '#f6f7fb', '#dbe3f3', 1.4, 10);
    T(w.x + 4, w.y - 6, '🔍 반응기 속: ' + (W.mul === 2 ? '입자 2배' : '입자 1배') + ' · 초록 = 에너지 조건을 채운 충돌', 12, INK, 'left', 800);
    ctx.save(); D.roundRect(w.x, w.y, w.w, w.h, 8); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(w.x, w.y, w.w, w.h);
    W.mols.forEach((m) => { if (m.on) D.sphere(w.x + m.x, w.y + m.y, 6, '#3867f4', { gloss: false }); });
    W.fx.forEach((f) => { const k = f.t / 0.6; ctx.strokeStyle = f.eff ? 'rgba(20,160,88,' + (1 - k) + ')' : 'rgba(120,130,150,' + (0.6 * (1 - k)) + ')'; ctx.lineWidth = f.eff ? 3 : 1.8; ctx.beginPath(); ctx.arc(w.x + f.x, w.y + f.y, 6 + k * (f.eff ? 16 : 9), 0, TAU); ctx.stroke(); });
    ctx.restore();
  }
  function drawWhyInfo(t) {
    const R = RC.R, W = WY();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 온도 조건과 Eₐ 이상 비율', 14, INK, 'left', 800);
    const rh = PHONE ? 30 : 36, y0 = R.y + 38;
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 4, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    [['온도', 0.2], ['충돌 수', 0.5], ['Eₐ 이상', 0.8]].forEach(([s, f]) => T(R.x + R.w * f, y0 + rh / 2 + 1, s, 12.5, INK, 'center', 800));
    TKS.forEach((Tk, i) => {
      const y = y0 + rh * (i + 1), sel = Tk === W.Tk;
      D.roundRect(R.x + 10, y, R.w - 20, rh - 4, 8); ctx.fillStyle = sel ? 'rgba(124,58,237,.07)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#e1dcf3'; ctx.lineWidth = sel ? 2 : 1.2; ctx.stroke();
      const seen = W.seen[Tk] || Tk === 298;
      T(R.x + R.w * 0.2, y + rh / 2 + 4, Tk + ' K', 13, INK, 'center', 800);
      T(R.x + R.w * 0.5, y + rh / 2 + 4, '×' + f3(Math.sqrt(Tk / 298)), 13, MUTED, 'center', 800);
      T(R.x + R.w * 0.8, y + rh / 2 + 4, seen ? pctOf(Tk) + ' %' : '?', 13.5, seen ? BAD : '#aab3c4', 'center', 800);
    });
    const y1 = y0 + rh * 5 + 4, hh = R.y + R.h - y1 - 10;
    box(R.x + 10, y1, R.w - 20, hh, '#f6f7fb', '#dbe3f3', 1.4, 10);
    T(R.x + 20, y1 + 22, '💡 왜 빨라질까?', 13, PUR, 'left', 800);
    let ty = y1 + 42;
    ['온도가 10 K 오르면 충돌 횟수는 약 2 %(평균 속력 ∝ √T)만 늘어요.', 'Eₐ 이상의 에너지를 가진 분자의 비율은 약 2배로 늘어요 (예: 3 % → 6 %).', '그래서 속도가 빨라지는 가장 큰 이유는 Eₐ 이상 분자의 비율 증가예요.', '농도가 2배면 곡선 높이(분자 수)가 2배라 면적도 2배예요.'].forEach((s) => { if (ty + 16 < y1 + hh) ty += textBlock(R.x + 20, ty, R.w - 40, '• ' + s, 12, INK, 16, 700) + 4; });
  }

  /* ================= ④ 생활 속 예: 농도 효과 / 온도 효과 분류 ================= */
  const LCARDS = [
    { ic: '🧊', name: '냉장고에 음식 보관', nm: '냉장고에\n음식 보관', ans: 1, why: '온도를 낮춰 부패 반응의 속도를 늦춰요 (온도 효과).' },
    { ic: '🍲', name: '압력솥으로 밥 짓기', nm: '압력솥으로\n밥 짓기', ans: 1, why: '압력을 높이면 끓는점이 올라가 더 뜨거운 물로 빨리 익어요 (온도 효과).' },
    { ic: '🔥', name: '산소 호흡기 속 불', nm: '산소 호흡기\n속 불', ans: 0, why: '산소 100 % 환경은 산소 농도가 높아 연소가 훨씬 격렬해요 (농도 효과).' },
    { ic: '⛰️', name: '높은 산에서 설익은 밥', nm: '높은 산에서\n설익은 밥', ans: 1, why: '기압이 낮아 끓는점이 낮아지고 물 온도가 덜 올라가 반응이 느려요 (온도 효과).' },
    { ic: '☀️', name: '여름철 음식 부패', nm: '여름철\n음식 부패', ans: 1, why: '기온이 높으면 부패 반응이 빨라져 음식이 빨리 상해요 (온도 효과).' },
    { ic: '🌬️', name: '불씨에 바람 불기', nm: '불씨에\n바람 불기', ans: 0, why: '바람이 산소를 더 공급해 산소 농도가 높아져 불이 살아나요 (농도 효과).' },
    { ic: '🌴', name: '열대·극지방 식물 성장', nm: '열대·극지방\n식물 성장', ans: 1, why: '기온이 높은 열대는 식물 속 반응이 빨라 성장이 빨라요 (온도 효과).' },
    { ic: '🌡️', name: '체온이 오르면 대사 증가', nm: '체온이 오르면\n대사 증가', ans: 1, why: '체온이 오르면 몸속 반응(대사)이 빨라져요 (온도 효과).' },
  ];
  const BINS = ['🧪 농도 효과', '🌡️ 온도 효과'];
  const LF = () => S.lf;
  const lfPoolRect = (i) => { const L = RC.L, cw = (L.w - 24 - 18) / 4; return { x: L.x + 12 + (i % 4) * (cw + 6), y: L.y + 40 + Math.floor(i / 4) * 62, w: cw, h: 56 }; };
  const lfBinRect = (k) => { const L = RC.L, bw = (L.w - 24 - 10) / 2, y = L.y + 172; return { x: L.x + 12 + k * (bw + 10), y, w: bw, h: L.y + L.h - 12 - y }; };
  function lfTarget(i) {
    const c = LF().cards[i];
    if (c.bin < 0) return lfPoolRect(i);
    const b = lfBinRect(c.bin), idx = LF().cards.filter((q) => q.bin === c.bin && q.ord < c.ord).length;
    return { x: b.x + 8, y: b.y + 36 + idx * 40, w: b.w - 16, h: 36 };
  }
  function lfInit() { const F = LF(); F.cards = LCARDS.map((c, i) => { const r = lfPoolRect(i); return { x: r.x, y: r.y, w: r.w, h: r.h, bin: -1, ord: 0, wrong: false, lift: 0 }; }); F.sel = -1; F.drag = -1; F.last = -1; F.ordN = 0; }
  function lfPlace(i, k) {
    const F = LF(), c = F.cards[i], ok = LCARDS[i].ans === k;
    c.bin = k; c.ord = ++F.ordN; c.wrong = !ok; F.last = i; F.sel = -1; F.pulse = 0;
    if (ok) { Sound.success(); const r = lfBinRect(k); parts.burst(r.x + r.w / 2, r.y + 24, { count: 8, speed: 90, life: 0.5, size: 3 }); }
    else { Sound.fail(); showHint('이 상자가 아니에요. 늘어난 것이 입자의 수(농도)인지, 에너지(온도)인지 생각해요.'); }
    updateCtl();
  }
  function lfBack(i) { const F = LF(), c = F.cards[i]; c.bin = -1; c.wrong = false; Sound.tick(); updateCtl(); }
  const lfN = () => LF().cards.filter((c, i) => c.bin >= 0 && !c.wrong).length;
  function lfResult() {
    const F = LF(), un = F.cards.filter((c) => c.bin < 0).length;
    if (un) return '아직 상자에 넣지 않은 카드가 ' + un + '장 있어요.';
    const bad = F.cards.map((c, i) => (c.wrong ? LCARDS[i].name : null)).filter(Boolean);
    return bad.length ? '다시 확인해요: ' + bad.join(', ') : true;
  }
  function stepLf(dt) {
    const F = LF(); F.pulse = ap2(F.pulse, 1, dt, 3);
    F.cards.forEach((c, i) => { if (F.drag === i) { c.lift = ap2(c.lift, 1, dt, 14); return; } const t = lfTarget(i); c.x = ap2(c.x, t.x, dt, 12); c.y = ap2(c.y, t.y, dt, 12); c.w = ap2(c.w, t.w, dt, 12); c.h = ap2(c.h, t.h, dt, 12); c.lift = ap2(c.lift, 0, dt, 12); });
  }
  function drawLfCard(i) {
    const F = LF(), c = F.cards[i], q = LCARDS[i], sel = F.sel === i, inBin = c.bin >= 0 && F.drag !== i;
    ctx.save(); const s = 1 + 0.06 * c.lift; ctx.translate(c.x + c.w / 2, c.y + c.h / 2 - 4 * c.lift); ctx.scale(s, s);
    D.shadow(() => { D.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 10); ctx.fillStyle = c.bin >= 0 ? (c.wrong ? '#fff1f1' : '#effaf3') : sel ? '#f1ebff' : '#fff'; ctx.fill(); }, { blur: 4 + 8 * c.lift, y: 1 + 4 * c.lift });
    D.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 10); ctx.strokeStyle = c.bin >= 0 ? (c.wrong ? BAD : GOOD) : sel ? PUR : '#d9d0f5'; ctx.lineWidth = sel || c.bin >= 0 ? 2.4 : 1.5; ctx.stroke();
    if (inBin) T(-c.w / 2 + 18, 5, q.ic, 17, INK, 'center', 800);
    else T(-c.w / 2 + 16, -c.h / 2 + 19, q.ic, 17, INK, 'center', 800);
    if (inBin) T(-c.w / 2 + 34, 4, q.name, 12.5, INK, 'left', 800);
    else wrap(q.nm, c.w - 8, 11.5, 800).slice(0, 2).forEach((ln, k) => T(-c.w / 2 + 7, -c.h / 2 + 35 + k * 13, ln, 11.5, INK, 'left', 800));
    if (inBin && c.wrong) T(c.w / 2 - 14, 6, '✗', 15, BAD, 'center', 800);
    ctx.restore();
  }
  function drawLife(t) {
    const L = RC.L, F = LF();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🏠 카드를 알맞은 상자로 옮겨요 (끌어서 놓거나, 카드를 누른 뒤 상자를 눌러요)', PHONE ? 11.5 : 12.5, INK, 'left', 800);
    [0, 1].forEach((k) => {
      const b = lfBinRect(k), hot = F.drag >= 0 && inRect(F.pt || { x: -9, y: -9 }, b) || (F.sel >= 0 && F.pulse < 1);
      box(b.x, b.y, b.w, b.h, k ? 'rgba(14,165,233,.07)' : 'rgba(245,158,11,.08)', hot ? PUR : (k ? '#7cc3ec' : '#e7b86b'), hot ? 3 : 2, 12);
      T(b.x + b.w / 2, b.y + 24, BINS[k], 14.5, k ? '#0b7bb0' : '#b45309', 'center', 800);
      T(b.x + b.w / 2, b.y + b.h - 10, k ? '에너지가 큰 분자의 비율 ↑' : '단위 부피 속 입자 수 ↑', 11.5, MUTED, 'center', 800);
    });
    const order = F.cards.map((c, i) => i).sort((a, b) => (F.drag === a) - (F.drag === b));
    order.forEach(drawLfCard);
  }
  function drawLifeInfo(t) {
    const R = RC.R, F = LF();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 반응 속도를 바꾸는 요인 (04-04)', 13.5, INK, 'left', 800);
    T(R.x + R.w - 14, R.y + 24, lfN() + ' / 8', 14, lfN() === 8 ? GOOD : MUTED, 'right', 800);
    let y = R.y + 36;
    const rows = [['🧪 농도 ↑', '단위 부피 속 입자 수 ↑ → 충돌 횟수 ↑ → 속도 ↑', '#b45309'], ['🌡️ 온도 ↑', 'Eₐ 이상 분자의 비율 ↑ → 유효 충돌 ↑ → 속도 ↑', '#0b7bb0'], ['🧬 촉매', '다음 차시에서 알아봐요', '#9aa6bb']];
    const rh = R.h > 440 ? 60 : 50;
    rows.forEach((r) => { box(R.x + 10, y, R.w - 20, rh, '#fbfaff', '#e1dcf3', 1.3, 10); T(R.x + 20, y + 19, r[0], 13, r[2], 'left', 800); textBlock(R.x + 20, y + 36, R.w - 40, r[1], 11.5, r[2] === '#9aa6bb' ? '#9aa6bb' : INK, 14, 700); y += rh + 6; });
    const c = F.last >= 0 ? F.cards[F.last] : null, q = c ? LCARDS[F.last] : null;
    const hh = R.h > 440 ? 92 : 70;
    box(R.x + 10, y, R.w - 20, hh, c && !c.wrong ? 'rgba(20,160,88,.08)' : '#f6f7fb', c && !c.wrong ? GOOD : '#dbe3f3', 1.5, 10);
    if (!c) textBlock(R.x + 20, y + 24, R.w - 40, '카드를 상자에 넣으면 왜 그런지 설명이 나와요.', 12, MUTED, 16, 800);
    else if (c.bin < 0) textBlock(R.x + 20, y + 24, R.w - 40, '카드를 다시 꺼냈어요.', 12, MUTED, 16, 800);
    else if (c.wrong) { T(R.x + 20, y + 22, q.ic + ' ' + q.name, 12.5, BAD, 'left', 800); textBlock(R.x + 20, y + 42, R.w - 40, '다른 상자예요. 입자 수가 늘었나, 분자의 에너지가 늘었나 생각해요.', 12, INK, 16, 700); }
    else { T(R.x + 20, y + 22, q.ic + ' ' + q.name, 12.5, '#0f6b3c', 'left', 800); textBlock(R.x + 20, y + 42, R.w - 40, q.why, 11.5, INK, 15, 700); }
    y += hh + 6;
    const ah = R.y + R.h - y - 10;
    if (ah > 54) {
      box(R.x + 10, y, R.w - 20, ah, '#fffaf0', '#f0d9a8', 1.3, 10);
      T(R.x + 20, y + 20, '💡 보조 카드: 접촉 면적', 12.5, '#b45309', 'left', 800);
      const sx = R.x + 22, sy = y + 30;
      if (ah > 90) {
        ctx.fillStyle = '#c8ccd6'; D.roundRect(sx, sy, 40, 40, 5); ctx.fill(); T(sx + 20, sy + 56, '덩어리', 11, MUTED, 'center', 700);
        for (let a = 0; a < 4; a++) for (let b2 = 0; b2 < 4; b2++) { D.roundRect(sx + 96 + a * 11, sy + b2 * 11, 9, 9, 2); ctx.fillStyle = '#c8ccd6'; ctx.fill(); } T(sx + 118, sy + 56, '가루', 11, MUTED, 'center', 700);
        textBlock(sx + 150, sy + 6, R.w - 192, '가루는 접촉 면적이 커 반응이 빨라요', 11.5, INK, 15, 700);
      } else textBlock(R.x + 20, y + 38, R.w - 40, '고체는 가루로 만들면 접촉 면적이 커져 반응이 빨라요.', 11.5, INK, 15, 700);
    }
  }

  /* ================= 컨트롤 · 공통 ================= */
  function build() {
    CONC.forEach((d, i) => $('#ccChips').appendChild(chipBtn(f2(d.c) + ' M', 'Na₂S₂O₃ ' + f2(d.c) + ' M', () => ccSet(i))));
    TEMP.forEach((d, i) => $('#tpChips').appendChild(chipBtn(d.T + ' °C', d.T + ' 도', () => tpSet(i))));
    TKS.forEach((Tk) => $('#wyChips').appendChild(chipBtn(Tk + ' K (' + (Tk - 273) + ' °C)', Tk + ' 켈빈', () => wySet(Tk))));
    [1, 2].forEach((m) => $('#wyMul').appendChild(chipBtn('농도 ' + m + '배', '농도 ' + m + '배', () => wyMul(m))));
    LCARDS.forEach((c, i) => $('#lfPick').appendChild(chipBtn(c.ic, c.name, () => { LF().sel = LF().sel === i ? -1 : i; LF().pulse = 0; updateCtl(); })));
    BINS.forEach((s, k) => $('#lfBins').appendChild(chipBtn(s, s + ' 상자에 넣기', () => { const F = LF(); if (F.sel < 0) { showHint('먼저 위의 카드를 하나 골라요.'); Sound.fail(); return; } lfPlace(F.sel, k); })));
  }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.getAttribute('data-show').split(' ').indexOf(S.mode) < 0; });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const K = CC(), P = TP(), W = WY(), F = LF();
    $$('#ccChips button').forEach((b, k) => { b.classList.toggle('on', K.sel === k); b.classList.toggle('done', K.meas[k] && K.sel !== k); b.disabled = K.ph === 'run'; });
    $('#ccRun').disabled = K.ph === 'run'; $('#ccRun').textContent = K.ph === 'run' ? '재는 중…' : K.meas[K.sel] ? '↻ 다시 재기 (HCl 넣기)' : '▶ HCl 넣기';
    ['cc0', 'cc1', 'cc2', 'cc3'].forEach((id, k) => { const inp = $('#' + id); inp.disabled = !K.meas[k]; inp.classList.toggle('ok', K.ok[k]); if (document.activeElement !== inp && inp.value !== K.in[k]) inp.value = K.in[k]; });
    $$('#tpChips button').forEach((b, k) => { b.classList.toggle('on', P.sel === k); b.classList.toggle('done', P.meas[k] && P.sel !== k); b.disabled = P.ph === 'run'; });
    $('#tpRun').disabled = P.ph === 'run'; $('#tpRun').textContent = P.ph === 'run' ? '재는 중…' : P.meas[P.sel] ? '↻ 다시 재기 (HCl 넣기)' : '▶ HCl 넣기';
    $$('#wyChips button').forEach((b, k) => { b.classList.toggle('on', W.Tk === TKS[k]); b.classList.toggle('done', !!W.seen[TKS[k]] && W.Tk !== TKS[k]); });
    $$('#wyMul button').forEach((b, k) => b.classList.toggle('on', W.mul === k + 1));
    ['wy1', 'wy2'].forEach((id, k) => { const inp = $('#' + id); inp.classList.toggle('ok', W.ok[k]); if (document.activeElement !== inp && inp.value !== W.in[k]) inp.value = W.in[k]; });
    $$('#lfPick button').forEach((b, k) => { b.classList.toggle('on', F.sel === k); b.classList.toggle('done', F.cards[k] && F.cards[k].bin >= 0 && !F.cards[k].wrong); b.classList.toggle('no', F.cards[k] && F.cards[k].bin >= 0 && F.cards[k].wrong); });
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); }
    S.mode = m;
    if (m === 'conc') insInit(Math.round(CONC[CC().sel].c / 0.05 * 4)); else if (m === 'temp') insInit(8);
    updateCtl();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#ccRun').addEventListener('click', ccRun); $('#tpRun').addEventListener('click', tpRun);
  ['cc0', 'cc1', 'cc2', 'cc3'].forEach((id, k) => {
    const inp = $('#' + id);
    inp.addEventListener('input', () => { CC().in[k] = inp.value; inp.classList.remove('bad'); ccCheck(); updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || CC().ok[k]) return; shakeBad(inp); const v = parseNum(inp.value);
      showHint(near(v, CONC[k].t, 0.5) ? '시간 t 가 아니라 1/t 예요. 1 / ' + CONC[k].t + ' 을 계산해요.' : '1/t = 1 / ' + CONC[k].t + ' s 를 계산해요. 소수 넷째 자리까지 적어도 좋아요.');
    });
  });
  ['wy1', 'wy2'].forEach((id, k) => {
    const inp = $('#' + id);
    inp.addEventListener('input', () => { WY().in[k] = inp.value; inp.classList.remove('bad'); wyCheck(); updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || WY().ok[k]) return; shakeBad(inp);
      showHint('온도 칩을 ' + TKS[k] + ' K 로 맞추고, 그래프의 빨간 「Eₐ 이상」 비율(%)을 읽어요.');
    });
  });
  const resetConc = () => { const K = CC(); K.ph = 'idle'; K.tm = 0; K.meas = [false, false, false, false]; K.in = ['', '', '', '']; K.ok = [false, false, false, false]; K.fly = [0, 0, 0, 0]; K.line = 0; K.sel = 1; clearInp(['#cc0', '#cc1', '#cc2', '#cc3']); insInit(8); };
  const resetTemp = () => { const K = TP(); K.ph = 'idle'; K.tm = 0; K.meas = [false, false, false, false, false]; K.fly = [0, 0, 0, 0, 0]; K.line = 0; K.sel = 2; insInit(8); };
  const resetWhy = () => { const W = WY(); W.Tk = 298; W.mul = 1; W.seen = {}; W.in = ['', '']; W.ok = [false, false]; clearInp(['#wy1', '#wy2']); };
  const resetLife = () => { lfInit(); };
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'conc') resetConc(); else if (S.mode === 'temp') resetTemp(); else if (S.mode === 'why') resetWhy(); else resetLife();
    updateCtl();
  });
  /* 캔버스: 카드 끌기, 눌러 고르기 */
  let dragInfo = null;
  function cardAt(p) { const F = LF(); for (let k = F.cards.length - 1; k >= 0; k--) { const c = F.cards[k]; if (inRect(p, c)) return k; } return -1; }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'life') return false;
      const i = cardAt(p); const F = LF();
      if (i < 0) { const k = [0, 1].find((q) => inRect(p, lfBinRect(q))); if (k != null && F.sel >= 0) lfPlace(F.sel, k); return false; }
      dragInfo = { i, sx: p.x, sy: p.y, ox: p.x - F.cards[i].x, oy: p.y - F.cards[i].y, moved: false };
      return true;
    },
    move(p) {
      if (!dragInfo) return; const F = LF(), c = F.cards[dragInfo.i];
      if (!dragInfo.moved && Math.hypot(p.x - dragInfo.sx, p.y - dragInfo.sy) > 7) { dragInfo.moved = true; F.drag = dragInfo.i; Sound.tick(); }
      if (dragInfo.moved) { c.x = p.x - dragInfo.ox; c.y = p.y - dragInfo.oy; F.pt = p; }
    },
    up(p) {
      if (!dragInfo) return; const F = LF(), i = dragInfo.i, c = F.cards[i], was = dragInfo.moved; dragInfo = null; F.drag = -1; F.pt = null;
      if (was) { const k = [0, 1].find((q) => inRect(p, lfBinRect(q))); if (k != null) lfPlace(i, k); else if (c.bin >= 0) lfBack(i); }
      else if (c.bin >= 0) lfBack(i); else { F.sel = F.sel === i ? -1 : i; F.pulse = 0; Sound.tick(); updateCtl(); }
    },
    hover(p) { if (S.mode === 'life' && cardAt(p) >= 0) return 'grab'; return null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'conc') { const K = CC(), d = CONC[K.sel]; L1 = '농도'; a = f2(d.c) + ' M'; L2 = '흐려진 시간 t'; b = K.meas[K.sel] ? d.t + ' s' : K.ph === 'run' ? f0(K.tm) + ' s…' : '?'; L3 = '측정한 농도'; c = K.meas.filter(Boolean).length + ' / 4'; }
    else if (S.mode === 'temp') { const K = TP(), d = TEMP[K.sel]; L1 = '온도'; a = d.T + ' °C'; L2 = '흐려진 시간 t'; b = K.meas[K.sel] ? d.t + ' s' : K.ph === 'run' ? f0(K.tm) + ' s…' : '?'; L3 = '측정한 온도'; c = K.meas.filter(Boolean).length + ' / 5'; }
    else if (S.mode === 'why') { const W = WY(); L1 = '온도'; a = W.Tk + ' K'; L2 = 'Eₐ 이상 분자'; b = pctOf(W.Tk) + ' %'; L3 = '충돌 횟수 변화'; c = (Math.sqrt(W.Tk / 298) >= 1 ? '+' : '') + f1((Math.sqrt(W.Tk / 298) - 1) * 100) + ' %'; }
    else { const F = LF(); L1 = '분류한 카드'; a = lfN() + ' / 8'; L2 = '고른 카드'; b = F.sel >= 0 ? LCARDS[F.sel].name : '없음'; L3 = '요인'; c = '농도 · 온도'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '농도 효과: 시계 반응 실험', short: '농도 효과', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 반응인데도 농도를 높이거나 온도를 올리면 왜 더 빨라질까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 반응 속도식(v = k[A]ᵐ[B]ⁿ)과 <b>유효 충돌·활성화 에너지</b>를 배웠어요. 일반선택 화학의 몰 농도(hc-molarity)도 떠올려요. 이번에는 농도를 바꾸며 실제 속도를 재어 봐요.</div>' +
        '<p><b>시계 반응</b>: Na₂S₂O₃ + 2HCl → 2NaCl + S↓ + SO₂ + H₂O. 노란 황 앙금이 생겨 용액이 흐려지고 바닥의 <b>×</b> 표시가 안 보일 때까지 걸린 시간 t 를 재요. 같은 양의 황이 생기는 데 걸린 시간이므로 속도는 <b>1/t</b> 에 비례해요. ⚠ SO₂ 가 조금 나오므로 환기, 보안경 착용, 폐액은 중화 후 폐수 처리.</p>',
      features: ['conc'],
      setup() { S.lock = false; setMode('conc'); },
      recap: '농도가 2배가 되면 흐려지는 시간은 1/2, 속도(1/t)는 2배예요. 속도는 농도에 비례해요.',
      summary: '<ul><li>시계 반응(Na₂S₂O₃ + 2HCl): 황 앙금으로 × 표시가 안 보이는 데까지 걸린 시간 t 를 재면 속도 ∝ 1/t 예요.</li><li>30 °C 에서 Na₂S₂O₃ 0.05, 0.10, 0.15, 0.20 M → t = 80, 40, 27, 20 s → 1/t = 0.0125, 0.025, 0.037, 0.050 s⁻¹ (농도에 비례, 원점을 지나는 직선). 예시 자료예요.</li><li>이유: 농도 ↑ → 단위 부피 속 입자 수 ↑ → 단위 시간당 충돌 횟수 ↑ → 유효 충돌 횟수 ↑ → 속도 ↑.</li><li>안전: SO₂ 가 소량 발생하므로 환기, 보안경 착용, 폐액은 중화 후 폐수 처리.</li></ul>',
      missions: [
        {
          title: '농도 4가지 시간 재기',
          goal: 'Na₂S₂O₃ 농도 <b>0.05, 0.10, 0.15, 0.20 M</b> 를 하나씩 고르고 「HCl 넣기」를 눌러 흐려지는 시간을 모두 재요.',
          hint: '조작판에서 농도 칩을 고르고 ▶ HCl 넣기를 눌러요. 재는 동안에는 칩이 잠겨요. 돋보기 속 입자 수와 충돌 카운터도 비교해 봐요.',
          setup() { S.lock = true; resetConc(); setMode('conc'); },
          check: () => ccDone(), hold: 0.5,
          status: () => CONC.map((d, i) => f2(d.c) + ' ' + mark(CC().meas[i])).join(' &nbsp; '),
          explain: '0.05 M → <b>80 s</b>, 0.10 M → <b>40 s</b>, 0.15 M → <b>27 s</b>, 0.20 M → <b>20 s</b> 였어요. 농도가 클수록 짧은 시간에 흐려져요 (예시 자료).',
        },
        {
          title: '1/t 를 구해 그래프에 점 찍기',
          goal: '측정한 시간마다 <b>속도의 척도 1/t (s⁻¹)</b> 를 계산해 입력해요. 맞으면 점이 그래프로 날아가요.',
          hint: '1/80 = 0.0125, 1/40 = 0.025, 1/27 ≈ 0.037, 1/20 = 0.050 이에요. 소수로 적어요.',
          setup() { S.lock = true; setMode('conc'); },
          check: () => ccPlot(), hold: 0.6,
          status: () => CONC.map((d, i) => f2(d.c) + ' ' + mark(CC().ok[i])).join(' &nbsp; '),
          explain: '점 4개가 <b>원점을 지나는 직선</b>에 놓여요. 농도가 2배, 3배가 되면 1/t(속도)도 2배, 3배 가까이 돼요 → 속도는 농도에 비례해요.',
        },
        {
          type: 'quiz', title: '농도 2배일 때 시간이 1/2인 까닭',
          goal: '농도를 2배로 하면 흐려지는 시간이 1/2이 돼요. 그 까닭은?',
          setup() { S.lock = true; setMode('conc'); },
          choices: ['농도가 2배가 되면 활성화 에너지가 절반이 되기 때문이에요', '단위 부피 속 입자 수가 2배가 되어 충돌 횟수가 늘고 반응 속도가 2배가 되기 때문이에요', '농도가 2배가 되면 온도가 2배가 되기 때문이에요', '농도가 2배가 되면 생기는 황의 양이 절반이 되기 때문이에요'],
          answer: 1,
          feedback: ['활성화 에너지는 농도로 바뀌지 않아요. 농도가 바뀌는 것은 입자의 수예요.', '', '농도를 바꿔도 온도는 같아요(모두 30 °C).', '흐려지는 데 필요한 황의 양은 모든 실험에서 같아요. 황이 생기는 속도가 2배라 시간이 1/2이 돼요.'],
          explain: '농도 ↑ → 단위 부피 속 입자 수 ↑ → 단위 시간당 <b>충돌 횟수 ↑</b> → 유효 충돌 횟수 ↑ → 속도 ↑. 같은 양의 황이 생기는 시간은 속도에 반비례해서 1/2이 돼요.',
        },
      ],
    },
    {
      title: '온도 효과: 10 °C 마다 약 2배', short: '온도 효과', icon: '🌡️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도가 높을수록 반응이 빨랐어요. 이번에는 <b>온도</b>를 바꿔요. 같은 시계 반응(Na₂S₂O₃ 0.10 M)을 10 ~ 50 °C 수조에서 재요.</div>' +
        '<p>온도가 오르면 반응은 얼마나 빨라질까요? 온도마다 흐려지는 시간을 재고 온도–시간 그래프를 완성해요. 입자 돋보기의 초록 화살표는 입자의 <b>속력</b>이에요. 속력이 얼마나 변하는지도 눈여겨봐요.</p>',
      features: ['temp'],
      setup() { S.lock = false; setMode('temp'); },
      recap: '온도가 10 °C 오를 때마다 흐려지는 시간은 약 1/2, 속도는 약 2배가 돼요. 그런데 입자의 속력은 거의 그대로예요.',
      summary: '<ul><li>0.10 M 에서 10, 20, 30, 40, 50 °C → t = 160, 80, 40, 20, 10 s. 10 °C 오를 때마다 시간이 1/2, 속도는 약 2배 (예시 자료).</li><li>온도가 오르면 평균 운동 에너지가 커지지만 입자의 평균 속력은 몇 % 만 늘어요 (10 °C → 50 °C 에서 약 7 %).</li><li>속도가 16배나 빨라지는 까닭은 다음 단계에서 <b>에너지 분포</b>로 설명해요.</li></ul>',
      missions: [
        {
          title: '온도 5가지 시간 재기',
          goal: '수조 온도 <b>10, 20, 30, 40, 50 °C</b> 에서 흐려지는 시간을 모두 재요.',
          hint: '온도 칩을 고르고 ▶ HCl 넣기를 눌러요. 온도계와 수조 색이 함께 바뀌어요.',
          setup() { S.lock = true; resetTemp(); setMode('temp'); },
          check: () => tpDone(), hold: 0.5,
          status: () => TEMP.map((d, i) => d.T + ' ' + mark(TP().meas[i])).join(' &nbsp; '),
          explain: '160, 80, 40, 20, 10 s 로 <b>10 °C 오를 때마다 시간이 1/2</b>이 되었어요. 속도로는 ×1, ×2, ×4, ×8, ×16 (예시 자료).',
        },
        {
          type: 'quiz', title: '50 °C 에서 예상되는 시간',
          goal: '같은 반응이 30 °C 에서 40 s 걸렸다면 50 °C 에서 걸리는 시간은 약 얼마일까요?',
          setup() { S.lock = true; setMode('temp'); },
          choices: ['약 20 s', '약 10 s', '약 80 s', '약 5 s'],
          answer: 1,
          feedback: ['20 s 는 40 °C 일 때예요. 50 °C 는 10 °C 가 한 번 더 올라요.', '', '온도가 오르면 시간이 짧아져요. 80 s 는 20 °C 일 때예요.', '5 s 는 10 °C 가 세 번 오를 때(60 °C)예요.'],
          explain: '30 → 40 → 50 °C 로 10 °C 가 두 번 올라 속도가 약 2 × 2 = 4배, 시간은 1/4 이에요. 40 s → 20 s → <b>약 10 s</b>.',
        },
      ],
    },
    {
      title: '충돌로 설명: 에너지 분포', short: '충돌로 설명', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 10 °C 오를 때마다 반응이 약 2배 빨라지는데 입자의 속력은 몇 % 밖에 안 늘었어요. <b>유효 충돌</b>은 Eₐ 이상의 에너지가 있어야 한다는 것(앞 차시)을 떠올려요. 단원 49(증기압)의 에너지 분포 곡선과 같은 그림이에요.</div>' +
        '<p>그래프의 가로축은 분자의 <b>운동 에너지</b>, 세로축은 분자 수의 비율이에요. 빨간 선 Eₐ 오른쪽의 <b>색칠한 면적</b>이 에너지 조건을 채우는 분자의 비율이에요. 온도를 올리면 곡선이 오른쪽으로 납작해져요. 농도를 2배로 하면 분자 수가 2배라 곡선 높이가 2배가 돼요. (곡선 변화는 보기 쉽게 크게 그린 모식도예요.)</p>',
      features: ['why'],
      setup() { S.lock = false; setMode('why'); },
      recap: '온도가 오르면 충돌 횟수는 조금만 늘지만 Eₐ 이상의 에너지를 가진 분자의 비율은 크게 늘어요. 이것이 속도 증가의 가장 큰 이유예요.',
      summary: '<ul><li>에너지 분포 곡선: 온도 ↑ → 곡선이 오른쪽으로 이동하고 납작해져 <b>Eₐ 이상인 분자의 비율</b>(면적)이 크게 늘어요.</li><li>예시(Eₐ ≈ 50 kJ/mol): 온도 10 K 상승(298 → 308 K) 시 충돌 횟수는 약 2 %(평균 속력 ∝ √T) 늘지만 Eₐ 이상 분자의 비율은 약 2배 (예: 3 % → 6 %).</li><li>온도가 올라 속도가 빨라지는 가장 큰 이유 = Eₐ 이상 분자 비율 증가 (속도 상수 k 가 커져요). 충돌 횟수 증가는 부수적이에요.</li><li>농도 ↑: 곡선 높이(분자 수)가 커져 Eₐ 이상 분자 수와 충돌 횟수가 함께 비례해서 늘어요.</li></ul>',
      missions: [
        {
          title: '+10 K 에서 Eₐ 이상 비율 읽기',
          goal: '온도를 <b>298 K</b> 와 <b>308 K</b> 로 맞춰 Eₐ 이상 분자의 비율(%)을 읽어 입력해요.',
          hint: '온도 칩을 누르면 곡선이 바뀌고 빨간 이름표에 「Eₐ 이상: ○ %」가 나와요. 두 값을 차례로 읽어요.',
          setup() { S.lock = true; resetWhy(); setMode('why'); },
          check: () => wyDone(), hold: 0.5,
          status: () => '298 K ' + mark(WY().ok[0]) + ' &nbsp; 308 K ' + mark(WY().ok[1]),
          explain: '298 K 에서 <b>3 %</b>, 308 K 에서 <b>6 %</b> 예요. 온도가 10 K 올랐을 뿐인데 Eₐ 이상 분자의 비율은 약 <b>2배</b>가 되었고 충돌 횟수는 약 1.7 % 만 늘었어요 (예시 값).',
        },
        {
          type: 'quiz', title: '온도가 오르면 빨라지는 가장 큰 이유',
          goal: '온도가 올라 반응 속도가 빨라지는 가장 큰 이유는?',
          setup() { S.lock = true; setMode('why'); },
          choices: ['분자의 충돌 횟수가 크게 늘어나기 때문이에요', 'Eₐ 이상의 에너지를 가진 분자의 비율이 크게 늘어나기 때문이에요', '활성화 에너지가 낮아지기 때문이에요', '분자의 크기가 커지기 때문이에요'],
          answer: 1,
          feedback: ['10 K 올라도 충돌 횟수는 약 2 % 만 늘어요. 속도는 약 2배가 되니 다른 이유가 더 커요.', '', '활성화 에너지는 온도로 바뀌지 않아요. 촉매가 Eₐ 를 낮춰요 (다음 차시).', '분자의 크기는 온도로 달라지지 않아요.'],
          explain: '온도가 오르면 충돌 횟수는 조금 늘지만, <b>Eₐ 이상의 에너지를 가진 분자의 비율</b>이 크게 늘어 유효 충돌이 많아져요. 그래서 속도가 빨라져요.',
        },
      ],
    },
    {
      title: '생활 속 예: 농도와 온도', short: '생활 속 예', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도 ↑ 는 입자 수(충돌 횟수), 온도 ↑ 는 Eₐ 이상 분자의 비율을 늘린다고 설명했어요. 우리 생활의 사례는 어느 쪽일까요? (촉매는 다음 차시에서 다뤄요.)</div>' +
        '<p>카드 8장을 <b>농도 효과</b> 상자와 <b>온도 효과</b> 상자로 옮겨요. 카드를 끌어서 놓거나, 카드를 누른 뒤 상자를 눌러요. 오른쪽 패널에는 세 가지 요인 정리와 보조 카드(접촉 면적)가 있어요.</p>',
      features: ['life'],
      setup() { S.lock = false; setMode('life'); },
      recap: '농도 ↑ 는 입자 수 ↑ (충돌 ↑), 온도 ↑ 는 Eₐ 이상 분자 비율 ↑ 로 반응 속도를 높여요.',
      summary: '<ul><li><b>농도 효과</b>: 산소 100 % 환경에서 불이 더 격렬해요, 불씨에 바람을 불면 산소가 공급돼 살아나요.</li><li><b>온도 효과</b>: 냉장·냉동 보관(부패 반응이 느려져요), 압력솥(끓는점 ↑ → 온도 ↑), 높은 산에서 밥이 설익음(끓는점 ↓), 더운 날 음식이 빨리 상함, 체온이 오르면 대사 증가, 열대가 식물이 빨리 자람.</li><li>정리: 농도 ↑ → 입자 밀도 ↑ → 충돌 ↑, 온도 ↑ → Eₐ 이상 분자 비율 ↑. (촉매는 Eₐ ↓ — 다음 차시.)</li><li>보조: 고체는 가루로 만들면 접촉 면적이 커져 반응이 빨라져요 (밀가루 먼지 폭발).</li></ul>',
      missions: [
        {
          title: '사례 카드 8장 분류하기',
          goal: '사례 카드 <b>8장</b>을 <b>농도 효과</b> 상자와 <b>온도 효과</b> 상자로 알맞게 옮겨요.',
          hint: '입자 수(농도)가 달라지는 사례인지, 분자의 에너지(온도)가 달라지는 사례인지 생각해요. 압력솥과 높은 산은 끓는점을 통해 온도가 달라지는 사례예요.',
          manual: true,
          setup() { S.lock = true; resetLife(); setMode('life'); },
          check: () => lfResult(),
          explain: '농도 효과: <b>산소 호흡기 속 불, 불씨에 바람 불기</b>(산소 농도 ↑). 온도 효과: 냉장고, 압력솥, 높은 산의 밥, 여름철 부패, 열대 식물, 체온 상승이에요.',
        },
        {
          type: 'quiz', title: '불씨를 부채질하는 원리',
          goal: '꺼져 가는 불씨에 부채질을 하면 불이 살아나는 까닭은?',
          setup() { S.lock = true; setMode('life'); },
          choices: ['바람이 불씨의 온도를 크게 높이기 때문이에요', '바람이 산소를 공급해 산소 농도가 높아지기 때문이에요', '바람이 활성화 에너지를 낮추기 때문이에요', '바람이 연료의 양을 늘리기 때문이에요'],
          answer: 1,
          feedback: ['부채질은 오히려 불씨를 식힐 수 있어요. 핵심은 산소의 공급이에요.', '', '활성화 에너지는 촉매가 낮춰요. 바람은 촉매가 아니에요.', '연료의 양은 그대로예요. 달라지는 것은 산소가 공급되는 정도예요.'],
          explain: '부채질은 불씨 주위에 산소를 계속 공급해 <b>산소의 농도</b>를 높여요. 농도 ↑ → 충돌 횟수 ↑ → 연소 속도 ↑ 예요.',
        },
        {
          type: 'quiz', title: '냉동실에 음식을 보관하는 이유',
          goal: '음식을 냉동실에 보관하면 오래 가는 까닭은?',
          setup() { S.lock = true; setMode('life'); },
          choices: ['온도가 낮아져 Eₐ 이상의 에너지를 가진 분자의 비율이 줄어 부패 반응이 느려지기 때문이에요', '온도가 낮아져 음식 속 분자가 모두 없어지기 때문이에요', '온도가 낮으면 반응의 활성화 에너지가 커져 영원히 반응하지 않기 때문이에요', '냉동실에서는 산소의 농도가 100 % 이기 때문이에요'],
          answer: 0,
          feedback: ['', '분자가 없어지는 것이 아니라 반응하는 분자가 줄어 속도가 느려지는 거예요.', '활성화 에너지는 온도로 바뀌지 않아요. 에너지 조건을 채우는 분자의 비율이 줄어요. 또 반응이 완전히 멈추지는 않아요.', '냉동실의 산소 농도가 높아지는 것이 아니에요.'],
          explain: '온도가 낮으면 Eₐ 이상의 에너지를 가진 분자의 비율이 크게 줄어 부패 반응이 훨씬 느려져요. 그래서 음식이 오래 보관돼요.',
        },
      ],
    },
  ];

  build();
  game = SciSim.game({
    simId: 'hx-rate-factors', mount: '#game', badge: '반응 속도 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { conc: '🧪 농도 효과', temp: '🌡️ 온도 효과', why: '🧩 충돌로 설명', life: '🏠 생활 속 예' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  lfInit(); wyInit(); insInit(8);
  setMode('conc');
  function stepAll1(dt) {
    S.t += dt; stepIns(dt); stepCc(dt); stepTp(dt); stepWy(dt); stepLf(dt);
  }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'conc') { drawConc(S.t); drawConcInfo(S.t); }
    else if (S.mode === 'temp') { drawTemp(S.t); drawTempInfo(S.t); }
    else if (S.mode === 'why') { drawWhy(S.t); drawWhyInfo(S.t); }
    else { drawLife(S.t); drawLifeInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, CONC, TEMP, LCARDS, TKS, setMode, ccSet, ccRun, tpSet, tpRun, wySet, wyMul, lfPlace, lfBack, lfPoolRect, lfBinRect, lfResult, pctOf, areaOf, collOf, effOf, EA, insCount, updateCtl, ccCheck, wyCheck, lfInit, resetLife,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
