/* =========================================================
   물질과 에너지 Ⅱ. 용액의 성질 - 끓는점 오름과 어는점 내림 [12물에02-02]
   ① 실험: 끓는점 오름 (온도 센서로 설탕물을 가열하며 온도-시간 그래프를 그리고 끓는점을 읽어요)
   ② 실험: 어는점 내림 (얼음-소금 냉각조에서 냉각 곡선을 그리고 어는점을 읽어요)
   ③ 분석: K 값 찾기 (ΔT-m 그래프의 기울기 = K, 용매마다 K가 달라요)
   ④ 적용: 활용 (ΔT = K·m 으로 몰질량 구하기, 부동액, 제설제, 사례 분류)
   비휘발성 비전해질의 묽은 용액만 계산해요. 전해질은 '입자 수가 늘어난다'는 정성적 설명까지만 다루고 반트호프 인자는 쓰지 않아요.
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
  const HOT = '#ea580c', ICE = '#2f9ae8', SUGC = '#f472b6', SUGD = '#be185d';
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
  const r1 = (v) => { const x = Math.round(v * 10) / 10; return x === 0 ? 0 : x; };
  const f1 = (v) => r1(v).toFixed(1).replace('-', '−');
  const f2 = (v) => v.toFixed(2).replace('-', '−');
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const parseNum = (s) => { const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));

  /* ---------- 배치 ---------- */
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { boil: '🔥 설탕물의 끓는점을 재요', frz: '🧊 설탕물의 어는점을 재요', fit: '📈 ΔT와 몰랄 농도의 관계', ap: '🏠 ΔT = K·m 을 써 봐요' };

  /* ================= 자료 (설계 자료 그대로) ================= */
  function pchip(xs, ys) {
    const n = xs.length, h = [], d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    return (x) => {
      x = clamp(x, xs[0], xs[n - 1]); let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
      const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
    };
  }
  const WT = [0, 10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120], WP = [4.6, 9.2, 17.5, 23.8, 31.8, 55, 92.5, 149, 234, 355, 526, 760, 1075, 1489];
  const lnP = pchip(WT, WP.map(Math.log));
  const Pw = (t) => Math.exp(lnP(t));                      // 물의 증기압 (mmHg), 이전 차시의 자료와 같아요
  const ATM = 760, KG_MOL = 1000 / 18;
  const xsOfM = (m) => m / (m + KG_MOL);

  const SUG_G = [0, 34.2, 68.4, 102.6, 136.8];              // 물 200 g에 녹이는 설탕 (M = 342)
  const MOL = [0, 0.5, 1.0, 1.5, 2.0];                      // 몰랄 농도 (mol/kg)
  const TB = [100.0, 100.3, 100.5, 100.8, 101.0];           // 센서로 잰 끓는점 (°C, 1 atm)
  const TF = [0.0, -0.9, -1.9, -2.8, -3.7];                 // 센서로 잰 어는점 (°C)
  const KB = 0.51, KF = 1.86;                               // 물의 몰랄 끓는점 오름 · 어는점 내림 상수 (°C·kg/mol)
  const TMAX = 8;                                           // 그래프의 시간 축 (분)
  const SOLV = [
    { n: '물', kb: 0.51, kf: 1.86, c: '#0ea5e9' },
    { n: '벤젠', kb: 2.53, kf: 5.12, c: '#f59e0b' },
    { n: '아세트산', kb: 3.07, kf: 3.90, c: '#16a34a' },
    { n: '에탄올', kb: 1.22, kf: 1.99, c: '#8b5cf6' },
  ];
  const dTb = (i) => r1(TB[i] - TB[0]), dTf = (i) => r1(TF[0] - TF[i]);   // 표에서 읽는 값 (소수 첫째 자리)

  /* ---------- 끓는점 곡선 ---------- */
  const tbOf = (i) => 4.5 + 0.3 * MOL[i];                   // 끓기 시작하는 시각 (분)
  const evapF = (i, tau) => clamp(0.03 * (tau - tbOf(i)), 0, 0.2);   // 끓는 동안 증발한 물의 비율 (모형)
  function boilT(i, tau) {
    const Tb = TB[i], tb = tbOf(i);
    if (tau < tb) return Tb - (Tb - 22) * Math.pow(1 - tau / tb, 1.25);
    return Tb + KB * MOL[i] * (1 / (1 - evapF(i, tau)) - 1);
  }
  /* ---------- 냉각 곡선 ---------- */
  const BATH = -12, KC = 0.5, DIP = 0.7, PLAT = 3;
  const tsOf = (i) => -Math.log((TF[i] - DIP - BATH) / (20 - BATH)) / KC;       // 과냉각이 끝나는 시각
  const tkOf = (i) => tsOf(i) + 0.25;                                             // 얼기 시작해 곡선이 꺾이는 시각 = 어는점을 읽는 점
  const frzF = (i, tau) => clamp(0.05 * (tau - tkOf(i)), 0, 0.05 * PLAT);        // 지금까지 언 물의 비율 (모형)
  function frzT(i, tau) {
    const Tf = TF[i], ts = tsOf(i), tk = tkOf(i);
    if (tau < ts) return BATH + (20 - BATH) * Math.exp(-KC * tau);
    if (tau < tk) return (Tf - DIP) + DIP * sm((tau - ts) / 0.25);
    const d = tau - tk, plate = (dd) => Tf - KF * MOL[i] * (1 / (1 - 0.05 * dd) - 1);
    if (d <= PLAT) return plate(d);
    return BATH + (plate(PLAT) - BATH) * Math.exp(-(d - PLAT));
  }
  const runT = (kind, i, tau) => (kind === 'boil' ? boilT(i, tau) : frzT(i, tau));
  const kneeOf = (kind, i) => (kind === 'boil' ? tbOf(i) : tkOf(i));
  const kneeV = (kind, i) => (kind === 'boil' ? TB[i] : TF[i]);

  /* ---------- 상태 ---------- */
  const mkRun = () => ({ idx: 0, tau: 0, run: false, fast: false, done: false, cur: [], nextS: 0, hist: {}, rec: [null, null, null, null, null], ld: [false, false, false, false, false], mk: 0, heat: 0 });
  const S = {
    mode: 'boil', fade: 0, lock: false, t: 0, clk: 0,
    sub: { fit: 'boil', ap: 'calc' },
    boil: mkRun(), frz: mkRun(),
    fit: { pl: { boil: [null, null, null, null, null], frz: [null, null, null, null, null] }, line: { boil: 0, frz: 0 }, cm: 1, kv: { boil: '', frz: '' }, kok: { boil: false, frz: false }, sm: 1 },
    ap: { q: ['', ''], ok: [false, false], cards: [], sel: -1, wrong: [], drag: null },
  };
  let game = null;

  function miniWater(x, y, ang, s, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    const d = 5.2 * s;
    D.sphere(Math.cos(0.91) * d, Math.sin(0.91) * d, 2.7 * s, '#f1f5f9', { gloss: false });
    D.sphere(Math.cos(-0.91) * d, Math.sin(-0.91) * d, 2.7 * s, '#f1f5f9', { gloss: false });
    D.sphere(0, 0, 5.6 * s, '#38bdf8', { gloss: s > 0.8 });
    ctx.restore();
  }
  function sugarMol(x, y, s, alpha) {
    ctx.save(); if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    D.sphere(x, y, 8.4 * s, SUGC, { gloss: s > 0.8, outline: 'rgba(255,255,255,.65)', outlineWidth: 1 });
    ctx.restore();
  }

  /* ================= ① ② 센서 실험 ================= */
  const rgPlot = () => { const L = RC.L; return { x: L.x + 58, y: L.y + 282, w: L.w - 80, h: 146 }; };
  const RG = { boil: { y0: 96, y1: 102, yt: 1 }, frz: { y0: -6, y1: 4, yt: 2 } };
  const runCur = (kind) => { const R = S[kind]; return runT(kind, R.idx, R.tau); };
  const runState = (kind) => {
    const R = S[kind], kn = kneeOf(kind, R.idx);
    if (R.tau <= 0 && !R.run) return 'ready';
    if (R.tau < (kind === 'boil' ? kn : tsOf(R.idx))) return 'going';
    if (kind === 'frz' && R.tau < kn) return 'super';
    if (kind === 'frz' && R.tau > kn + PLAT) return 'solid';
    return 'plateau';
  };
  const canRecord = (kind) => { const R = S[kind]; return R.tau >= kneeOf(kind, R.idx) + 0.3; };

  function runReset(kind) {
    const R = S[kind];
    if (R.cur.length > 12) R.hist[R.idx] = R.cur.slice();
    R.tau = 0; R.run = false; R.done = false; R.cur = []; R.nextS = 0; R.mk = 0; R.heat = 0;
    if (kind === 'frz') frzInit(); else boilInit();
    updateCtl();
  }
  function runSelect(kind, i) { const R = S[kind]; if (R.idx === i && R.tau === 0) return; R.idx = i; runReset(kind); }
  function runToggle(kind) {
    const R = S[kind];
    if (R.done) { runReset(kind); R.run = true; updateCtl(); return; }
    R.run = !R.run; Sound.click(); updateCtl();
  }
  function recordRun(kind) {
    const R = S[kind];
    if (!canRecord(kind)) {
      showHint(kind === 'boil' ? '아직 끓지 않았어요. 곡선이 꺾여 거의 평평해질 때까지 기다린 뒤 기록해요.' : '아직 얼기 시작하지 않았어요. 온도가 내려갔다가 올라와 꺾일 때까지 기다린 뒤 기록해요.');
      Sound.fail(); return;
    }
    R.rec[R.idx] = kneeV(kind, R.idx); R.ld[R.idx] = false; R.mk = 1;
    Sound.success();
    const g = rgPlot(), sc = RG[kind];
    parts.burst(g.x + kneeOf(kind, R.idx) / TMAX * g.w, g.y + g.h - (kneeV(kind, R.idx) - sc.y0) / (sc.y1 - sc.y0) * g.h, { count: 12, speed: 120, life: 0.6, size: 3.5 });
    updateCtl();
  }
  function stepRun(kind, dt) {
    const R = S[kind];
    R.heat = ap2(R.heat, R.run ? 1 : 0, dt, 5); if (!R.run && R.heat < 0.03) R.heat = 0;
    if (!R.run) return;
    R.tau = Math.min(TMAX, R.tau + dt * (R.fast ? 3 : 1));
    while (R.nextS <= R.tau) { R.cur.push([R.nextS, runT(kind, R.idx, R.nextS)]); R.nextS += 0.05; }
    if (R.tau >= TMAX) { R.run = false; R.done = true; R.hist[R.idx] = R.cur.slice(); updateCtl(); }
  }

  /* ----- 장치 그리기 ----- */
  function sensorBox(x, y, w, h, Tv, state, tau) {
    D.shadow(() => { D.roundRect(x, y, w, h, 12); ctx.fillStyle = '#334155'; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(x + 8, y + 8, w - 16, 46, 8); ctx.fillStyle = '#d9f2d0'; ctx.fill();
    T(x + w / 2, y + 41, f1(Tv) + ' °C', 25, '#17402a', 'center', 800);
    T(x + w / 2, y + 72, '🌡️ 온도 센서', 12.5, '#cbd5e1', 'center', 800);
    T(x + w / 2, y + h + 20, '⏱ ' + tau.toFixed(1) + ' 분', 14, INK, 'center', 800);
    if (state) D.label(x + w / 2, y + h + 46, state[0], { size: 12.5, bg: state[1], align: 'center' });
  }
  /* 거품 · 김 (눈에 보이는 효과) */
  let fxAcc = 0;
  function stepFX(dt) {
    if (RM || (S.mode !== 'boil' && S.mode !== 'frz')) return;
    const L = RC.L, kind = S.mode, R = S[kind];
    fxAcc += dt;
    if (kind === 'boil') {
      const Tn = runCur('boil'), bo = R.tau >= tbOf(R.idx) ? 1 : clamp((Tn - 80) / 20, 0, 0.35);
      const bx = L.x + L.w * 0.3 - 62, by = L.y + 62;
      while (fxAcc > 0.06) {
        fxAcc -= 0.06;
        if (Math.random() < bo * 0.85) parts.emit({ x: bx + rnd(14, 110), y: by + 104, vx: rnd(-6, 6), vy: rnd(-70, -48), life: 1.0, size: rnd(2.5, 5.5), color: 'rgba(255,255,255,.9)', shape: 'bubble', fade: true });
        if (Math.random() < clamp((Tn - 88) / 12, 0, 1) * 0.4) parts.emit({ x: bx + rnd(20, 104), y: by - 4, vx: rnd(-8, 8), vy: rnd(-34, -20), life: 1.3, size: rnd(7, 12), color: 'rgba(200,215,235,.55)', shape: 'smoke', fade: true });
      }
    } else {
      const st = runState('frz');
      while (fxAcc > 0.1) {
        fxAcc -= 0.1;
        if ((st === 'plateau') && R.run && Math.random() < 0.5) parts.emit({ x: L.x + L.w * 0.3 + rnd(-14, 14), y: L.y + 98 + 30 + rnd(-10, 40), vx: rnd(-14, 14), vy: rnd(-22, -6), life: 0.7, size: rnd(2, 3.4), color: '#bfe6ff', shape: 'star', fade: true });
      }
    }
  }
  function drawBoilApp(t) {
    const L = RC.L, R = S.boil, i = R.idx, Tn = runCur('boil');
    const bx = L.x + L.w * 0.3 - 62, by = L.y + 62, bw = 124, bh = 108;
    const boiling = R.tau >= tbOf(i);
    // 받침 · 불꽃
    D.roundRect(bx - 22, by + bh + 36, bw + 44, 10, 5); ctx.fillStyle = '#64748b'; ctx.fill();
    D.roundRect(bx - 4, by + bh + 12, bw + 8, 7, 3); ctx.fillStyle = '#94a3b8'; ctx.fill();   // 삼발이
    [bx + 6, bx + bw - 6].forEach((lx) => { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx, by + bh + 18); ctx.lineTo(lx - 4 + (lx > bx + 60 ? 8 : 0), by + bh + 36); ctx.stroke(); });
    D.flame(bx + bw / 2, by + bh + 36, 34 * R.heat, t);
    // 비커 · 용액
    const liq = C.mix('#7cc4ff', '#f6a6cf', clamp(MOL[i] / 3, 0, 1));
    D.beaker(bx, by, bw, bh, { level: 0.74 - (R.cur.length ? evapF(i, R.tau) * 0.5 : 0), liquid: liq, t, wave: boiling ? 3 : 1.4, ticks: 4 });
    for (let k = 0; k < i * 5; k++) {   // 녹은 설탕 입자 (장식)
      const px = bx + 12 + ((k * 37) % 100), py = by + 40 + ((k * 53) % 58) + (RM ? 0 : Math.sin(t * 2 + k) * 2);
      D.sphere(px, py, 2.6, SUGC, { gloss: false });
    }
    T(bx + bw / 2, by - 10, i ? '🍬 설탕물 (설탕 ' + SUG_G[i] + ' g + 물 200 g)' : '💧 순수한 물 200 g', 13.5, i ? SUGD : '#0369a1', 'center', 800);
    // 센서 프로브와 선
    const px = bx + bw * 0.7, py = by + bh * 0.62;
    const sx = L.x + L.w - 150, sy = L.y + 54, sw = 136, sh = 82;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, by - 26); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, by - 26); ctx.bezierCurveTo(px, by - 50, sx - 20, sy + 70, sx, sy + 56); ctx.stroke(); ctx.lineCap = 'butt';
    D.sphere(px, py, 4.6, '#334155', { gloss: false });
    const st = !R.run && R.tau === 0 ? ['대기', '#64748b'] : R.done ? ['측정 끝', '#64748b'] : boiling ? ['끓는 중', HOT] : ['가열 중', AMB];
    sensorBox(sx, sy, sw, sh, Tn, st, R.tau);
  }
  const ICEC = [[8, 12], [34, 6], [60, 14], [88, 8], [18, 40], [50, 36], [82, 42], [104, 30], [10, 70], [40, 66], [72, 72], [100, 64], [24, 94], [58, 98], [90, 92]];
  function drawFrzApp(t) {
    const L = RC.L, R = S.frz, i = R.idx, Tn = runCur('frz'), f = frzF(i, R.tau) / (0.05 * PLAT);
    const bx = L.x + L.w * 0.3 - 66, by = L.y + 98, bw = 132, bh = 102;
    // 냉각조 (얼음 + 소금)
    D.beaker(bx, by, bw, bh, { level: 0.92, liquid: '#cfe9ff', t, wave: 0.6, glass: '#8fa3bd' });
    ctx.save(); D.roundRect(bx + 3, by + 6, bw - 6, bh - 9, 8); ctx.clip();
    ICEC.forEach((c, k) => { const x = bx + c[0] + 4, y = by + 10 + c[1] * 0.82; D.roundRect(x, y, 24, 22, 5); ctx.fillStyle = 'rgba(230,246,255,.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,170,215,.7)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x + 3, y + 3, 7, 3); });
    ctx.fillStyle = '#fff'; for (let k = 0; k < 16; k++) ctx.fillRect(bx + 8 + ((k * 47) % 112), by + 14 + ((k * 31) % 76), 2.4, 2.4);
    ctx.restore();
    // 서리
    const fr = clamp((20 - Tn) / 32, 0, 1) * 0.5;
    if (fr > 0) { ctx.save(); ctx.globalAlpha = fr; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(bx - 2, by + 6, 5, bh - 12); ctx.fillRect(bx + bw - 3, by + 6, 5, bh - 12); ctx.restore(); }
    // 시험관 (용액)
    const tx = bx + bw / 2, ty = by - 30, tw = 38, th = bh + 18;
    const liq = C.mix('#cfe9ff', '#f6a6cf', clamp(MOL[i] / 3, 0, 1));
    D.testTube(tx, ty, tw, th, { level: 0.62, liquid: liq, glass: '#7d8da6' });
    // 시험관 속 얼음 결정 (얼기 시작하면 아래에서부터)
    if (f > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(tx - tw / 2 + 2, ty + th * 0.38, tw - 4, th * 0.62 - tw / 2 + 2); ctx.clip();
      const ih = (th * 0.62) * (0.18 + 0.7 * f);
      ctx.fillStyle = 'rgba(240,250,255,.9)'; ctx.fillRect(tx - tw / 2, ty + th - tw / 2 - ih + 8, tw, ih + 20);
      ctx.strokeStyle = 'rgba(120,175,225,.8)'; ctx.lineWidth = 1.3;
      for (let k = 0; k < 6; k++) { const yy = ty + th - tw / 2 - ih + 12 + k * (ih / 6); ctx.beginPath(); ctx.moveTo(tx - 14, yy); ctx.lineTo(tx - 3, yy - 6); ctx.lineTo(tx + 6, yy + 2); ctx.lineTo(tx + 15, yy - 5); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = '#e2e8f0'; D.roundRect(tx - tw / 2 - 3, ty - 6, tw + 6, 8, 3); ctx.fill();
    T(bx + bw / 2, by + bh + 22, '🧊 얼음 + 소금 냉각조 (약 −12 °C)', 13, '#1d4f8a', 'center', 800);
    T(bx + bw / 2, ty - 14, i ? '🍬 설탕물 (설탕 ' + SUG_G[i] + ' g + 물 200 g)' : '💧 순수한 물 200 g', 13.5, i ? SUGD : '#0369a1', 'center', 800);
    // 센서
    const px = tx + 7, py = ty + th * 0.55;
    const sx = L.x + L.w - 150, sy = L.y + 54, sw = 136, sh = 82;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, ty - 24); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, ty - 24); ctx.bezierCurveTo(px + 30, ty - 40, sx - 30, sy + 70, sx, sy + 56); ctx.stroke(); ctx.lineCap = 'butt';
    D.sphere(px, py, 4.2, '#334155', { gloss: false });
    const s0 = runState('frz');
    const st = s0 === 'ready' ? ['대기', '#64748b'] : R.done ? ['측정 끝', '#64748b'] : s0 === 'going' ? ['냉각 중', ICE] : s0 === 'super' ? ['과냉각', AMB] : s0 === 'plateau' ? ['얼는 중', '#0ea5a5'] : ['거의 다 얼었어요', '#64748b'];
    sensorBox(sx, sy, sw, sh, Tn, st, R.tau);
  }

  /* ----- 온도-시간 그래프 ----- */
  function drawRunGraph(kind, t) {
    const L = RC.L, R = S[kind], g = rgPlot(), sc = RG[kind], boil = kind === 'boil', col = R.idx ? '#db2777' : '#0284c7';
    const X = (tt) => g.x + tt / TMAX * g.w, Y = (v) => g.y + g.h - (v - sc.y0) / (sc.y1 - sc.y0) * g.h;
    T(L.x + 14, L.y + 262, boil ? '🌡️ 온도–시간 그래프 (96 °C 아래는 생략하고 확대했어요)' : '🌡️ 냉각 곡선 (온도–시간 그래프)', PHONE ? 12.5 : 14, INK, 'left', 800);
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x, g.y, g.w, g.h, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let v = sc.y0; v <= sc.y1 + 1e-6; v += sc.yt) { ctx.beginPath(); ctx.moveTo(g.x, Y(v)); ctx.lineTo(g.x + g.w, Y(v)); ctx.stroke(); T(g.x - 8, Y(v) + 4, String(v).replace('-', '−'), 12, MUTED, 'right', 700); }
    for (let k = 0; k <= TMAX; k += 1) { ctx.beginPath(); ctx.moveTo(X(k), g.y); ctx.lineTo(X(k), g.y + g.h); ctx.stroke(); T(X(k), g.y + g.h + 16, String(k), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h); ctx.lineTo(g.x + g.w, g.y + g.h); ctx.stroke();
    T(g.x + g.w, g.y + g.h + 34, '경과 시간 (분) →', 12.5, MUTED, 'right', 800); T(g.x - 6, g.y - 8, '온도 (°C)', 12.5, MUTED, 'left', 800);
    ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
    // 기준선: 순수한 물의 끓는점 / 어는점
    const ref = boil ? 100 : 0;
    ctx.strokeStyle = 'rgba(71,85,105,.7)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(g.x, Y(ref)); ctx.lineTo(g.x + g.w, Y(ref)); ctx.stroke(); ctx.setLineDash([]);
    // 앞서 잰 곡선 (가는 선)
    Object.keys(R.hist).forEach((k) => {
      if (+k === R.idx && R.tau > 0) return;
      ctx.strokeStyle = +k ? 'rgba(219,39,119,.38)' : 'rgba(2,132,199,.4)'; ctx.lineWidth = 1.8; ctx.beginPath();
      R.hist[k].forEach((s, n) => { n ? ctx.lineTo(X(s[0]), Y(s[1])) : ctx.moveTo(X(s[0]), Y(s[1])); }); ctx.stroke();
    });
    // 평탄 구간 표시
    const kn = kneeOf(kind, R.idx);
    if (R.tau > kn + 0.4) {
      const t1 = Math.min(R.tau, boil ? TMAX : kn + PLAT);
      const kv = kneeV(kind, R.idx);
      ctx.fillStyle = boil ? 'rgba(234,88,12,.12)' : 'rgba(47,154,232,.14)';
      ctx.fillRect(X(kn), g.y, X(t1) - X(kn), g.h);
    }
    // 지금 측정하는 곡선
    if (R.cur.length) {
      ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
      R.cur.forEach((s, n) => { n ? ctx.lineTo(X(s[0]), Y(s[1])) : ctx.moveTo(X(s[0]), Y(s[1])); });
      ctx.lineTo(X(R.tau), Y(runCur(kind))); ctx.stroke();
    }
    ctx.restore();
    // 지금 점
    if (R.tau > 0) { const yy = clamp(Y(runCur(kind)), g.y + 2, g.y + g.h - 2); D.glow(X(R.tau), yy, 14, col, 0.5); D.sphere(X(R.tau), yy, 5, col, { gloss: false, outline: '#fff', outlineWidth: 1.6 }); }
    // 읽은 점 (꺾이는 점)
    if (R.rec[R.idx] != null && R.cur.length && R.tau >= kn) {
      const kv = kneeV(kind, R.idx), px = X(kn), py = Y(kv), pop = R.mk > 0 ? R.mk : 0;
      D.sphere(px, py, 7 + pop * 4, '#fff', { gloss: false, outline: BAD, outlineWidth: 3 });
      D.label(clamp(px + 6, g.x + 70, g.x + g.w - 70), py + (boil ? -26 : 30), (boil ? '끓는점 ' : '어는점 ') + f1(kv) + ' °C', { size: 12.5, bg: BAD, align: 'center' });
    }
    // 설명 라벨
    const st = runState(kind);
    if (R.tau > kn + 0.8 && !(kind === 'frz' && st === 'solid')) {
      const msg = R.idx === 0 ? (boil ? '평탄 구간: 끓는 동안 온도가 일정해요' : '평탄 구간: 어는 동안 온도가 일정해요') : (boil ? '서서히 상승: 물이 증발해 용액이 진해져요' : '서서히 하강: 남은 용액이 진해져요');
      D.label(g.x + g.w / 2 + (PHONE ? 0 : 6), boil ? g.y + g.h - 16 : g.y + 16, msg, { size: 12, bg: boil ? HOT : '#0e7fc0', align: 'center' });
    }
    if (!boil && st === 'super') D.label(clamp(X(R.tau) + 30, g.x + 60, g.x + g.w - 50), g.y + g.h - 18, '과냉각: 어는점보다 잠깐 더 내려가요', { size: 11.5, bg: AMB, align: 'center' });
    if (Object.keys(R.hist).some((k) => +k !== R.idx || R.tau === 0)) T(g.x + g.w - 6, boil ? g.y + 14 : g.y + g.h - 8, '가는 선: 앞서 잰 곡선', 11.5, MUTED, 'right', 700);
    T(g.x + 6, Y(ref) - 6, boil ? '순수한 물 100.0 °C' : '순수한 물 0.0 °C', 11.5, '#475569', 'left', 800);
  }

  /* ----- 오른쪽: 돋보기 + 기록표 ----- */
  const mg = { gas: [], bub: 0, sug: [], wat: [], ice: 0, nT: 0, hold: 0, key: '' };
  const MAG = () => { const R = RC.R; return { x: R.x + 10, y: R.y + 34, w: R.w - 20, h: PHONE ? 150 : 192 }; };
  function boilInit() { mg.gas = []; mg.key = ''; }
  const NICE = 15, NW = 26;
  function frzInit() {
    const m = MAG(), i = S.frz.idx, ns = [0, 1, 2, 3, 4][i];
    mg.wat = []; mg.sug = []; mg.ice = 0; mg.hold = 0;
    for (let k = 0; k < NW; k++) mg.wat.push({ x: m.x + 40 + rnd(0, m.w - 80), y: m.y + 30 + rnd(0, m.h - 100), vx: rnd(-30, 30), vy: rnd(-30, 30), ang: rnd(0, TAU), spin: rnd(-1.5, 1.5), st: 0, cell: -1 });
    for (let k = 0; k < ns; k++) mg.sug.push({ x: m.x + 40 + rnd(0, m.w - 80), y: m.y + 30 + rnd(0, m.h - 100), vx: rnd(-26, 26), vy: rnd(-26, 26) });
    mg.key = '';
  }
  const pRatio = (i, tau) => {                       // 용액의 증기압 / 외부 압력 (끓는점에서 정확히 1)
    const X = xsOfM(MOL[i]), cal = ATM / ((1 - X) * Pw(TB[i]));
    if (tau >= tbOf(i)) return 1;
    return clamp((1 - X) * Pw(boilT(i, tau)) * cal / ATM, 0, 1);
  };
  const NSL = 16;
  const SPOS = [4, 11, 2, 13];
  function stepMag(dt) {
    const m = MAG();
    if (S.mode === 'boil') {
      const R = S.boil, pr = pRatio(R.idx, R.tau), target = Math.round(pr * 11) + (pr > 0.05 ? 1 : 0), ns = R.idx;
      const dx = m.w / NSL, surfY = m.y + m.h * 0.44;
      const live = mg.gas.filter((p) => !p.dying).length;
      mg.hold -= dt;
      if (live < target && mg.hold <= 0) {
        let c = Math.floor(Math.random() * NSL), n = 0; while (SPOS.slice(0, ns).indexOf(c) >= 0 && n++ < 20) c = Math.floor(Math.random() * NSL);
        mg.gas.push({ x: m.x + dx * (c + 0.5), y: surfY - 12, vx: rnd(-14, 14), vy: rnd(-60, -34), ang: rnd(0, TAU), spin: rnd(-2, 2), fade: 0, dying: false }); mg.hold = 0.12;
      } else if (live > target && mg.hold <= 0) { const c = mg.gas.find((p) => !p.dying); if (c) { c.dying = true; mg.hold = 0.12; } }
      for (let k = mg.gas.length - 1; k >= 0; k--) {
        const p = mg.gas[k]; p.ang += p.spin * dt;
        if (p.dying) { p.fade -= dt * 3; p.y += 60 * dt; if (p.fade <= 0) mg.gas.splice(k, 1); continue; }
        p.fade = Math.min(1, p.fade + dt * 4);
        const sp = Math.hypot(p.vx, p.vy) || 1; p.vx *= 46 / sp; p.vy *= 46 / sp; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < m.x + 10) { p.x = m.x + 10; p.vx = Math.abs(p.vx); } else if (p.x > m.x + m.w - 10) { p.x = m.x + m.w - 10; p.vx = -Math.abs(p.vx); }
        if (p.y < m.y + 22) { p.y = m.y + 22; p.vy = Math.abs(p.vy); } else if (p.y > surfY - 10) { p.y = surfY - 10; p.vy = -Math.abs(p.vy); }
      }
    } else if (S.mode === 'frz') {
      const R = S.frz, i = R.idx, fr = frzF(i, R.tau) / (0.05 * PLAT);
      const nT = Math.round(fr * NICE), colsN = 3, rowsN = 5, sp = Math.min(24, (m.h - 70) / (rowsN - 0.5));
      const cellPos = (k) => { const c = Math.floor(k / rowsN), r = k % rowsN; return { x: m.x + 16 + c * sp * 0.95 + (r % 2) * sp * 0.42, y: m.y + 28 + r * sp }; };
      mg.cellPos = cellPos; mg.sp = sp;
      mg.hold -= dt;
      if (mg.ice < nT && mg.hold <= 0) {
        const cp = cellPos(mg.ice); let best = null, bd = 1e9;
        mg.wat.forEach((w) => { if (w.st === 0) { const d = Math.hypot(w.x - cp.x, w.y - cp.y); if (d < bd) { bd = d; best = w; } } });
        if (best) { best.st = 1; best.cell = mg.ice; mg.ice++; mg.hold = 0.18; }
      } else if (mg.ice > nT) { mg.wat.forEach((w) => { w.st = 0; w.cell = -1; }); mg.ice = 0; }
      const front = mg.ice ? cellPos(Math.min(NICE - 1, Math.floor((mg.ice - 1) / rowsN) * rowsN + rowsN - 1)).x + 16 : m.x + 8;
      const left = Math.max(m.x + 10, front + 6), right = m.x + m.w - 10, top = m.y + 24, bot = m.y + m.h - 62;
      const mv = (p, spd, r) => {
        const s = Math.hypot(p.vx, p.vy) || 1; p.vx *= spd / s; p.vy *= spd / s; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < left + r) { p.x = ap2(p.x, left + r, dt, 12); p.vx = Math.abs(p.vx); } else if (p.x > right - r) { p.x = right - r; p.vx = -Math.abs(p.vx); }
        if (p.y < top + r) { p.y = top + r; p.vy = Math.abs(p.vy); } else if (p.y > bot - r) { p.y = bot - r; p.vy = -Math.abs(p.vy); }
      };
      const spd = clamp(20 + (runCur('frz') + 12) * 1.3, 14, 50);
      mg.wat.forEach((w) => {
        if (w.st === 0) { w.ang += w.spin * dt; mv(w, spd, 7); }
        else if (w.st === 1) { const cp = cellPos(w.cell); w.x = ap2(w.x, cp.x, dt, 9); w.y = ap2(w.y, cp.y, dt, 9); w.ang = ap2(w.ang, 0, dt, 7); if (Math.hypot(w.x - cp.x, w.y - cp.y) < 1) { w.x = cp.x; w.y = cp.y; w.st = 2; } }
      });
      mg.sug.forEach((s) => mv(s, spd * 0.8, 9));
    }
  }
  function drawBoilMag(t) {
    const m = MAG(), R = S.boil, i = R.idx, pr = pRatio(i, R.tau), boiling = R.tau >= tbOf(i);
    const surfY = m.y + m.h * 0.44, dx = m.w / NSL, rr = Math.min(9.5, dx * 0.5 - 0.6);
    ctx.save(); D.roundRect(m.x, m.y, m.w, m.h, 12); ctx.clip();
    ctx.fillStyle = '#f5faff'; ctx.fillRect(m.x, m.y, m.w, m.h);
    const lg = ctx.createLinearGradient(0, surfY, 0, m.y + m.h); lg.addColorStop(0, 'rgba(110,190,255,.5)'); lg.addColorStop(1, 'rgba(70,140,230,.65)'); ctx.fillStyle = lg;
    ctx.fillRect(m.x, surfY, m.w, m.y + m.h - 60 - surfY);
    // 액체 입자 (표면 한 줄 + 아래 한 줄)
    for (let r = 0; r < 2; r++) for (let c = 0; c < NSL; c++) {
      const x = m.x + dx * (c + 0.5) + (r ? dx * 0.1 : -dx * 0.05), y = surfY + 6 + r * rr * 2 + (RM ? 0 : Math.sin(t * 2.2 + c + r) * 0.9);
      if (r === 0 && SPOS.slice(0, i).indexOf(c) >= 0) sugarMol(x, y, rr / 8.4 * 1.15, 1);
      else D.sphere(x, y, rr, '#38bdf8', { gloss: rr > 6 });
    }
    mg.gas.forEach((p) => miniWater(p.x, p.y, p.ang, 0.95, p.fade));
    // 끓을 때 액체 속 거품
    if (boiling && !RM) for (let k = 0; k < 3; k++) { const ph = (t * 0.9 + k * 0.33) % 1, bxx = m.x + m.w * (0.25 + 0.25 * k), byy = m.y + m.h - 70 - ph * (m.h - 70 - (surfY - m.y) + 4) * 0.8, bs = 4 + ph * 5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bxx, byy, bs, 0, TAU); ctx.stroke(); }
    ctx.restore();
    D.roundRect(m.x, m.y, m.w, m.h, 12); ctx.strokeStyle = '#b6c3dc'; ctx.lineWidth = 1.6; ctx.stroke();
    T(m.x + 10, m.y + 17, '🔍 액체 표면', 12.5, INK, 'left', 800);
    if (i) D.label(m.x + m.w - 8, m.y + 17, '설탕은 증발하지 않아요', { size: 11, bg: SUGD, align: 'right' });
    // 압력 막대
    const by = m.y + m.h - 54, bx = m.x + 12, bw = m.w - 24 - (PHONE ? 70 : 66);
    [['용액의 증기압', pr, boiling ? GOOD : SKY, Math.round(pr * ATM) + ' mmHg'], ['외부 압력(대기압)', 1, '#64748b', ATM + ' mmHg']].forEach(([lab, v, colr, txt], k) => {
      const yy = by + k * 24;
      T(bx, yy + 2, lab, 11.5, MUTED, 'left', 800);
      D.roundRect(bx, yy + 5, bw, 11, 5); ctx.fillStyle = '#e9eef7'; ctx.fill();
      ctx.save(); D.roundRect(bx, yy + 5, bw, 11, 5); ctx.clip(); ctx.fillStyle = colr; ctx.fillRect(bx, yy + 5, bw * clamp(v, 0, 1), 11); ctx.restore();
      T(bx + bw + 6, yy + 15, txt, 12, INK, 'left', 800);
    });
    if (boiling) D.label(m.x + m.w - 10, m.y + 38, '같아졌어요: 끓어요', { size: 11.5, bg: GOOD, align: 'right' });
  }
  function drawFrzMag(t) {
    const m = MAG(), R = S.frz, i = R.idx, fr = frzF(i, R.tau);
    ctx.save(); D.roundRect(m.x, m.y, m.w, m.h, 12); ctx.clip();
    ctx.fillStyle = '#eef6ff'; ctx.fillRect(m.x, m.y, m.w, m.h);
    // 액체 영역
    const lg = ctx.createLinearGradient(0, m.y, 0, m.y + m.h); lg.addColorStop(0, 'rgba(120,190,255,.28)'); lg.addColorStop(1, 'rgba(70,140,230,.4)'); ctx.fillStyle = lg; ctx.fillRect(m.x, m.y + 24, m.w, m.h - 62 - 24);
    // 얼음 격자 선
    if (mg.cellPos) {
      ctx.strokeStyle = 'rgba(120,175,225,.55)'; ctx.lineWidth = 1.6;
      mg.wat.forEach((a) => { if (a.st !== 2) return; mg.wat.forEach((b) => { if (b !== a && b.st === 2 && Math.hypot(a.x - b.x, a.y - b.y) < mg.sp * 1.15) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }); });
    }
    mg.wat.forEach((w) => miniWater(w.x, w.y, w.ang, 0.95, 1));
    mg.sug.forEach((s) => sugarMol(s.x, s.y, 1.05, 1));
    ctx.restore();
    D.roundRect(m.x, m.y, m.w, m.h, 12); ctx.strokeStyle = '#b6c3dc'; ctx.lineWidth = 1.6; ctx.stroke();
    T(m.x + 10, m.y + 17, '🔍 얼음이 생기는 모습', 12.5, INK, 'left', 800);
    const bx = m.x + 12, by = m.y + m.h - 50;
    const mrem = MOL[i] / (1 - fr);
    textBlock(bx, by - 2, m.w - 22, '얼음 결정에는 물 분자만 들어가요' + (i ? '. 설탕은 용액에 남아요.' : '.'), 11.5, '#1d4f8a', 14, 800);
    T(bx, by + 30, i ? '남은 용액 ' + MOL[i].toFixed(2) + ' m → ' + mrem.toFixed(2) + ' m (진해져요)' : '순수한 물은 얼어도 농도가 그대로예요', 11.5, i ? SUGD : MUTED, 'left', 800);
  }
  function drawRecTable(kind, x, y, w, rowH) {
    const R = S[kind], boil = kind === 'boil';
    const cx = [x + 8, x + w * 0.2, x + w * 0.35, x + w * 0.69];
    ['설탕(g)', 'm', boil ? '끓는점(°C)' : '어는점(°C)', boil ? 'ΔTb(°C)' : 'ΔTf(°C)'].forEach((h, k) => T(cx[k], y + 13, h, 11.5, MUTED, 'left', 800));
    ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x + w, y + 20); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const yy = y + 22 + i * rowH, has = R.rec[i] != null;
      if (i === R.idx) { D.roundRect(x, yy, w, rowH - 2, 6); ctx.fillStyle = 'rgba(124,58,237,.10)'; ctx.fill(); }
      const base = yy + rowH / 2 + 4.5;
      T(cx[0], base, String(SUG_G[i]), 13.5, INK, 'left', 800);
      T(cx[1], base, MOL[i].toFixed(1), 13.5, INK, 'left', 800);
      T(cx[2], base, has ? f1(R.rec[i]) + (R.ld[i] ? ' 📂' : '') : '—', 13.5, has ? (boil ? HOT : '#0e7fc0') : '#9aa6bb', 'left', 800);
      const hasD = has && R.rec[0] != null && i > 0;
      T(cx[3], base, hasD ? f1(boil ? R.rec[i] - R.rec[0] : R.rec[0] - R.rec[i]) : '—', 13.5, hasD ? BAD : '#9aa6bb', 'left', 800);
    }
    return 22 + 5 * rowH;
  }
  function drawRunInfo(kind, t) {
    const R = RC.R, boil = kind === 'boil', m = MAG();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, boil ? '🔬 끓는 모습 돋보기' : '🔬 어는 모습 돋보기', 14.5, INK, 'left', 800);
    if (boil) drawBoilMag(t); else drawFrzMag(t);
    let y = m.y + m.h + 12;
    T(R.x + 14, y + 8, '📋 기록표 (센서 자료)', 13.5, INK, 'left', 800);
    y += 14;
    y += drawRecTable(kind, R.x + 10, y, R.w - 20, PHONE ? 20 : 23) + 8;
    if (!PHONE || y + 40 < R.y + R.h) textBlock(R.x + 14, y + 8, R.w - 28, boil ? '곡선이 꺾여 평평해지는 점의 온도가 끓는점이에요. 순수한 물 100.0 °C와의 차이가 ΔTb예요.' : '온도가 내려갔다 올라와 꺾이는 점의 온도가 어는점이에요. 순수한 물 0.0 °C와의 차이가 ΔTf예요.', 12.5, MUTED, 17, 700);
  }
  function drawRun(kind, t) {
    const L = RC.L;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, kind === 'boil' ? '🔥 가열하면서 온도를 재요' : '🧊 냉각하면서 온도를 재요', PHONE ? 14 : 15, INK, 'left', 800);
    if (kind === 'boil') drawBoilApp(t); else drawFrzApp(t);
    drawRunGraph(kind, t);
  }
  function stepRunMark(dt) { ['boil', 'frz'].forEach((k) => { if (S[k].mk > 0) S[k].mk = Math.max(0, S[k].mk - dt * 2.2); }); }

  /* ================= ③ K 값 찾기 ================= */
  const fitS = () => (S.sub.fit === 'frz' ? 'frz' : 'boil');
  const fitAvail = (s, i) => S[s].rec[i] != null && S[s].rec[0] != null;
  const fitDT = (s, i) => (s === 'boil' ? r1(S.boil.rec[i] - S.boil.rec[0]) : r1(S.frz.rec[0] - S.frz.rec[i]));
  const fitLanded = (s) => S.fit.pl[s].filter((p) => p && p.t >= 1).length;
  const fitK = (s) => {                               // 원점을 지나는 직선 맞춤 (최소제곱)
    let sxy = 0, sxx = 0; S.fit.pl[s].forEach((p, i) => { if (p && p.t >= 1) { const d = fitDT(s, i); sxy += MOL[i] * d; sxx += MOL[i] * MOL[i]; } });
    return sxx ? sxy / sxx : 0;
  };
  const KRANGE = { boil: [0.46, 0.56], frz: [1.7, 2.0] };
  const KTHEORY = { boil: KB, frz: KF };
  const fitAllPlotted = () => fitLanded('boil') === 5 && fitLanded('frz') === 5;
  const fitG = () => { const L = RC.L; return { x: L.x + 62, y: L.y + 76, w: L.w - 92, h: L.h - 154, xmax: 2.2 }; };
  const fitYmax = (s) => (s === 'boil' ? 1.2 : 4.4);
  const fitPt = (s, i, d) => { const g = fitG(); return { x: g.x + MOL[i] / g.xmax * g.w, y: g.y + g.h - (d != null ? d : fitDT(s, i)) / fitYmax(s) * g.h }; };
  const fitRows = () => { const R = RC.R, rh = PHONE ? 26 : 30, y0 = R.y + 66; return Array.from({ length: 5 }, (_, i) => ({ x: R.x + 10, y: y0 + i * rh, w: R.w - 20, h: rh - 2 })); };
  function fitPlot(s, i, quiet) {
    const F = S.fit; if (F.pl[s][i]) return false;
    if (!fitAvail(s, i)) { if (!quiet) { showHint('표에 자료가 없어요. 「모둠 자료 불러오기」를 누르거나 ①②에서 직접 재요.'); Sound.fail(); } return false; }
    F.pl[s][i] = { t: 0 }; Sound.tick(); updateCtl(); return true;
  }
  function fitNext() {
    const s = fitS(), i = S.fit.pl[s].findIndex((p) => !p);
    if (i < 0) { showHint('이 그래프의 점 5개를 모두 찍었어요.'); return; }
    fitPlot(s, i);
  }
  function fitLoad() {
    let n = 0;
    ['boil', 'frz'].forEach((k) => { for (let i = 0; i < 5; i++) if (S[k].rec[i] == null) { S[k].rec[i] = kneeV(k, i); S[k].ld[i] = true; n++; } });
    if (n) { Sound.success(); showHint('모둠이 측정한 자료 ' + n + '칸을 표에 채웠어요. 📂 표시가 붙어요.'); } else showHint('표가 이미 모두 채워져 있어요.');
    updateCtl();
  }
  function stepFit(dt) {
    const F = S.fit;
    ['boil', 'frz'].forEach((s) => {
      F.pl[s].forEach((p, i) => {
        if (p && p.t < 1) { p.t = Math.min(1, p.t + dt * 2.0); if (p.t >= 1) { const q = fitPt(s, i); if (S.mode === 'fit') parts.burst(q.x, q.y, { count: 8, speed: 90, life: 0.5, size: 3 }); Sound.tick(); updateCtl(); } }
      });
      const tg = fitLanded(s) === 5 ? 1 : 0; F.line[s] = ap2(F.line[s], tg, dt, 3.2); if (tg && F.line[s] > 0.995) F.line[s] = 1; if (!tg && F.line[s] < 0.005) F.line[s] = 0;
    });
  }
  function drawFitGraph(t) {
    const L = RC.L, F = S.fit, s = fitS(), g = fitG(), boil = s === 'boil', col = boil ? HOT : '#0e7fc0';
    const X = (m) => g.x + m / g.xmax * g.w, Y = (d) => g.y + g.h - d / fitYmax(s) * g.h;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, boil ? '📈 끓는점 오름 ΔTb 와 몰랄 농도 m' : '📈 어는점 내림 ΔTf 와 몰랄 농도 m', PHONE ? 13.5 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 48, '표의 자료를 점으로 찍으면 규칙이 보여요 (ΔT = 순수한 물과의 온도 차이)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x, g.y, g.w, g.h, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    const ys = boil ? 0.2 : 1;
    for (let d = 0; d <= fitYmax(s) + 1e-6; d += ys) { ctx.beginPath(); ctx.moveTo(g.x, Y(d)); ctx.lineTo(g.x + g.w, Y(d)); ctx.stroke(); T(g.x - 8, Y(d) + 4, boil ? d.toFixed(1) : String(Math.round(d)), 12, MUTED, 'right', 700); }
    for (let m = 0; m <= 2.001; m += 0.5) { ctx.beginPath(); ctx.moveTo(X(m), g.y); ctx.lineTo(X(m), g.y + g.h); ctx.stroke(); T(X(m), g.y + g.h + 16, m.toFixed(1), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h); ctx.lineTo(g.x + g.w, g.y + g.h); ctx.stroke();
    T(g.x + g.w, g.y + g.h + 36, '몰랄 농도 m (mol/kg) →', 12.5, MUTED, 'right', 800); T(g.x - 6, g.y - 8, boil ? 'ΔTb (°C)' : 'ΔTf (°C)', 12.5, MUTED, 'left', 800);
    // 직선
    const e = sm(F.line[s]);
    if (e > 0) {
      const K = fitK(s);
      ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
      ctx.strokeStyle = BAD; ctx.lineWidth = 3; ctx.setLineDash([9, 5]); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(g.xmax * e), Y(K * g.xmax * e)); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      if (e > 0.98) {
        const cm = F.cm, dv = K * cm;
        ctx.strokeStyle = 'rgba(124,58,237,.6)'; ctx.lineWidth = 1.8; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(cm), g.y + g.h); ctx.lineTo(X(cm), Y(dv)); ctx.lineTo(g.x, Y(dv)); ctx.stroke(); ctx.setLineDash([]);
        D.sphere(X(cm), Y(dv), 6, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.6 });
        D.label(g.x + g.w - 96, g.y + g.h - 24, 'm = ' + cm.toFixed(2) + ' → ΔT = ' + dv.toFixed(2) + ' °C', { size: 12.5, bg: '#475569', align: 'center' });
        D.label(g.x + g.w / 2 - 20, g.y + 16, '원점을 지나는 직선: ΔT는 m에 비례해요', { size: 12, bg: BAD, align: 'center' });
        if (F.kok[s]) D.label(g.x + g.w / 2 - 20, g.y + 42, 'K = ' + K.toFixed(2) + ' °C·kg/mol (이론값 ' + KTHEORY[s].toFixed(2) + ')', { size: 12, bg: GOOD, align: 'center' });
      }
    }
    // 점
    F.pl[s].forEach((p, i) => {
      if (!p) return;
      const q = fitPt(s, i);
      if (p.t >= 1) { D.sphere(q.x, q.y, 7, col, { gloss: true, outline: '#fff', shadow: true }); if (i > 0) T(q.x + 10, q.y + 16, fitDT(s, i).toFixed(1), 12, INK, 'left', 800, HALO); }
      else {
        const rows = fitRows(), a = { x: rows[i].x + rows[i].w - 30, y: rows[i].y + rows[i].h / 2 }, k = sm(p.t);
        const xx = a.x + (q.x - a.x) * k, yy = a.y + (q.y - a.y) * k - Math.sin(k * Math.PI) * 40;
        D.glow(xx, yy, 16, col, 0.5); D.sphere(xx, yy, 7, col, { gloss: true, outline: '#fff' });
      }
    });
    T(L.x + L.w / 2, L.y + L.h - 10, '찍은 점 ' + fitLanded(s) + ' / 5', 13, fitLanded(s) === 5 ? GOOD : MUTED, 'center', 800);
  }
  function drawFitInfo(t) {
    const R = RC.R, s = fitS(), boil = s === 'boil', F = S.fit;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 측정 자료 → 점', 14.5, INK, 'left', 800);
    const cx = [R.x + 18, R.x + R.w * 0.2, R.x + R.w * 0.46, R.x + R.w * 0.72];
    ['m', boil ? '끓는점(°C)' : '어는점(°C)', 'ΔT(°C)', '그래프'].forEach((h, k) => T(cx[k], R.y + 56, h, 11.5, MUTED, 'left', 800));
    const rows = fitRows();
    rows.forEach((rw, i) => {
      const has = S[s].rec[i] != null, avail = fitAvail(s, i), p = F.pl[s][i], done = p && p.t >= 1;
      D.roundRect(rw.x, rw.y, rw.w, rw.h, 8); ctx.fillStyle = done ? 'rgba(20,160,88,.10)' : avail ? '#f8f5ff' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = done ? GOOD : avail ? '#cdbdf5' : '#e3e8f2'; ctx.lineWidth = 1.4; ctx.stroke();
      const b = rw.y + rw.h / 2 + 4.5;
      T(cx[0], b, MOL[i].toFixed(1), 13.5, INK, 'left', 800);
      T(cx[1], b, has ? f1(S[s].rec[i]) + (S[s].ld[i] ? '📂' : '') : '—', 13.5, has ? (boil ? HOT : '#0e7fc0') : '#9aa6bb', 'left', 800);
      T(cx[2], b, avail ? fitDT(s, i).toFixed(1) : '—', 13.5, avail ? BAD : '#9aa6bb', 'left', 800);
      T(cx[3], b, done ? '✅ 찍음' : p ? '날아가는 중' : avail ? '👆 눌러 찍기' : '자료 없음', 12, done ? GOOD : avail ? PUR : '#9aa6bb', 'left', 800);
    });
    let y = rows[4].y + rows[4].h + 20;
    const ok = F.kok[s];
    if (fitLanded(s) < 5) y += textBlock(R.x + 14, y, R.w - 28, '점을 하나씩 찍으면 어떤 규칙이 보여요. m = 0 인 점은 순수한 물이라 ΔT = 0 이에요.', 13, MUTED, 18, 700);
    else if (!ok) y += textBlock(R.x + 14, y, R.w - 28, '점들이 원점을 지나는 한 직선 위에 있어요. 왼쪽 그래프의 m 눈금으로 m = 1.00 일 때 ΔT를 읽으면 기울기 K가 돼요.', 13, INK, 18, 800);
    else {
      y += textBlock(R.x + 14, y, R.w - 28, boil ? 'ΔTb = Kb · m' : 'ΔTf = Kf · m', 18, INK, 24, 800);
      y += textBlock(R.x + 14, y + 2, R.w - 28, '기울기 K는 용매마다 정해진 값이에요. 물은 ' + (boil ? 'Kb = 0.51' : 'Kf = 1.86') + ' °C·kg/mol 이에요. 묽은 용액에서는 X용질 ≈ m / 55.5 라서 몰 분율로도 같은 비례 관계가 나와요.', 12.5, MUTED, 17, 700);
    }
  }
  /* ----- 용매 비교 ----- */
  function drawSolv(t) {
    const L = RC.L, F = S.fit, m = F.sm;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧴 같은 m, 다른 용매 (비전해질 용질)', PHONE ? 13.5 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 48, 'm = ' + m.toFixed(2) + ' mol/kg 일 때 ΔT = K · m', 13, MUTED, 'left', 800);
    const bx = L.x + 112, bw = L.w - 112 - 76, top = L.y + 70, gh = (L.h - 96) / 4, vmax = 11;
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1; for (let v = 0; v <= 10; v += 2) { ctx.beginPath(); ctx.moveTo(bx + v / vmax * bw, top - 4); ctx.lineTo(bx + v / vmax * bw, top + gh * 4); ctx.stroke(); T(bx + v / vmax * bw, top + gh * 4 + 14, String(v), 11.5, MUTED, 'center', 700); }
    T(bx + bw + 4, top + gh * 4 + 14, '°C', 11.5, MUTED, 'left', 800);
    SOLV.forEach((sv, k) => {
      const y = top + k * gh;
      T(L.x + 14, y + 20, sv.n, 15, sv.c, 'left', 800);
      T(L.x + 14, y + 38, 'Kb ' + sv.kb.toFixed(2) + ' · Kf ' + sv.kf.toFixed(2), 11, MUTED, 'left', 700);
      [['끓는점 오름', sv.kb * m, HOT], ['어는점 내림', sv.kf * m, '#2f9ae8']].forEach(([lab, v, colr], q) => {
        const yy = y + 6 + q * 24;
        D.roundRect(bx, yy, bw, 17, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
        if (v > 0) { ctx.save(); D.roundRect(bx, yy, bw, 17, 6); ctx.clip(); ctx.fillStyle = colr; ctx.fillRect(bx, yy, bw * clamp(v / vmax, 0, 1), 17); ctx.restore(); }
        T(bx + bw * clamp(v / vmax, 0, 1) + 5, yy + 13, v.toFixed(2), 12, INK, 'left', 800, HALO);
        if (PHONE) T(bx + 4, yy + 13, q ? 'ΔTf' : 'ΔTb', 10.5, '#fff', 'left', 800);
      });
    });
    [['ΔTb', HOT], ['ΔTf', '#2f9ae8']].forEach(([lab, colr], q) => { const lx = L.x + L.w - 112 + q * 54; D.roundRect(lx, L.y + 17, 12, 12, 3); ctx.fillStyle = colr; ctx.fill(); T(lx + 17, L.y + 28, lab, 12.5, INK, 'left', 800); });
  }
  function drawSolvInfo(t) {
    const R = RC.R, m = S.fit.sm;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🧪 K 값은 용매의 성질', 14.5, INK, 'left', 800);
    let y = R.y + 52;
    y += textBlock(R.x + 14, y, R.w - 28, '물에서 1.00 m 설탕물의 ΔTf는 1.86 °C, 벤젠에서 1.00 m 용액의 ΔTf는 5.12 °C 예요.', 13.5, INK, 19, 800) + 8;
    y += textBlock(R.x + 14, y, R.w - 28, '용질이 비전해질이면 용질의 종류가 달라도 같은 용매, 같은 m 에서 ΔT가 같아요. ΔT는 용질 입자의 수(몰 분율)에 따라 정해지기 때문이에요.', 13, MUTED, 18, 700) + 8;
    T(R.x + 14, y + 12, '지금 눈금 m = ' + m.toFixed(2), 13.5, PUR, 'left', 800);
    SOLV.forEach((sv, k) => { T(R.x + 14, y + 36 + k * 22, sv.n + ': ΔTf = ' + (sv.kf * m).toFixed(2) + ' °C', 13, sv.c, 'left', 800); });
  }

  /* ================= ④ 활용 ================= */
  const CARDS0 = [
    { t: '도로에 제설제를 뿌려요', a: 1, info: '제설제(염화 칼슘, 염화 나트륨)가 녹으면 이온이 많이 생겨 물의 어는점이 내려가요. 0 °C보다 낮은 온도에서도 얼음이 녹아요.' },
    { t: '얼음에 소금을 섞어 아이스크림을 얼려요', a: 1, info: '얼음에 소금을 섞으면 어는점이 내려가 0 °C보다 훨씬 낮은 온도의 냉각조가 돼요. 아이스크림 재료를 얼릴 수 있어요.' },
    { t: '냉각수에 부동액을 넣어 겨울에 얼지 않게 해요', a: 1, info: '에틸렌 글리콜을 물에 녹이면 어는점이 내려가요. 10 m 이면 ΔTf = 1.86 × 10 = 18.6 °C 예요 (이상 계산).' },
    { t: '진한 설탕 시럽은 100 °C보다 높은 온도에서 끓어요', a: 0, info: '설탕이 녹은 시럽은 끓는점이 올라가요. 졸여서 진해질수록 끓는점이 더 올라가요.' },
    { t: '소금을 넣은 물은 100 °C보다 조금 높은 온도에서 끓어요', a: 0, info: '소금(NaCl)은 이온으로 나뉘어 용질 입자 수가 늘어요. 같은 몰랄 농도의 설탕물보다 끓는점이 더 많이 올라가요.' },
    { t: '라면 국물의 끓는점은 물보다 약간 높아요', a: 0, info: '염분 약 1 % 이면 이온이 모두 약 0.34 m 라서 ΔTb = 0.51 × 0.34 ≈ 0.2 °C 예요. 차이는 아주 작아요.' },
  ];
  const BINS = [{ n: '🔥 끓는점 오름', c: HOT }, { n: '🧊 어는점 내림', c: '#2f9ae8' }];
  const cardGeo = () => {
    const L = RC.L, cw = (L.w - 40) / 2, ch = PHONE ? 50 : 48, py = L.y + 58, by = py + 3 * (ch + 8) + 22;
    return { cw, ch, pool: (k) => ({ x: L.x + 14 + (k % 2) * (cw + 12), y: py + Math.floor(k / 2) * (ch + 8) }), bins: [0, 1].map((b) => ({ x: L.x + 14 + b * (cw + 12), y: by, w: cw, h: L.y + L.h - 14 - by })), by };
  };
  function cardsInit() {
    const A = S.ap, G = cardGeo();
    A.cards = CARDS0.map((c, k) => { const p = G.pool(k); return Object.assign({}, c, { bin: -1, ord: 0, x: p.x, y: p.y, w: G.cw, h: G.ch, tx: p.x, ty: p.y, tw: G.cw, th: G.ch }); });
    A.sel = -1; A.wrong = []; A.drag = null; A.ordN = 0;
  }
  function layoutCards() {
    const A = S.ap, G = cardGeo(); A.wrong = [];
    A.cards.forEach((c, k) => {
      if (c.bin < 0) { const p = G.pool(k); c.tx = p.x; c.ty = p.y; c.tw = G.cw; c.th = G.ch; }
    });
    [0, 1].forEach((b) => {
      const list = A.cards.map((c, k) => k).filter((k) => A.cards[k].bin === b).sort((p, q) => A.cards[p].ord - A.cards[q].ord), bn = G.bins[b];
      const th = list.length <= 4 ? 40 : 32; list.forEach((k, n) => { const c = A.cards[k]; c.tx = bn.x + 6; c.ty = bn.y + 34 + n * (th + 4); c.tw = bn.w - 12; c.th = th; });
    });
  }
  function placeCard(k, b) { const A = S.ap, c = A.cards[k]; c.bin = b; c.ord = ++A.ordN; A.sel = -1; layoutCards(); Sound.tick(); updateCtl(); }
  function returnCard(k) { const A = S.ap; A.cards[k].bin = -1; A.sel = -1; layoutCards(); updateCtl(); }
  const cardsPlaced = () => S.ap.cards.filter((c) => c.bin >= 0).length;
  function cardsCheck() {
    const A = S.ap, n = cardsPlaced();
    if (n < A.cards.length) return '카드 ' + A.cards.length + '장을 모두 상자에 넣어 주세요. (지금 ' + n + '장)';
    const bad = A.cards.map((c, k) => k).filter((k) => BINS[A.cards[k].bin] && A.cards[k].a !== (A.cards[k].bin === 0 ? 0 : 1));
    A.wrong = bad;
    if (bad.length) return bad.length + '장이 알맞지 않아요. 빨간 테두리 카드를 다시 생각해 봐요. 용액의 어는점이 내려가는 일인지, 끓는점이 올라가는 일인지 구별해요.';
    return true;
  }
  function stepCards(dt) {
    S.ap.cards.forEach((c, k) => {
      if (S.ap.drag && S.ap.drag.i === k && S.ap.drag.moved) return;
      c.x = ap2(c.x, c.tx, dt, 14); c.y = ap2(c.y, c.ty, dt, 14); c.w = ap2(c.w, c.tw, dt, 14); c.h = ap2(c.h, c.th, dt, 14);
    });
  }
  function drawCard(c, k, lift) {
    const A = S.ap, sel = A.sel === k, wrongC = A.wrong.indexOf(k) >= 0;
    D.shadow(() => { D.roundRect(c.x, c.y, c.w, c.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: lift ? 14 : 5, y: lift ? 6 : 2 });
    D.roundRect(c.x, c.y, c.w, c.h, 10); ctx.strokeStyle = wrongC ? BAD : sel ? PUR : '#cfd8ea'; ctx.lineWidth = wrongC || sel ? 3 : 1.5; ctx.stroke();
    const small = c.h < 36, sz = small ? 12 : 13, lh = small ? 14 : 16;
    const ls = wrap(c.t, c.w - 16, sz, 800).slice(0, 3);
    ls.forEach((l, n) => T(c.x + 8, c.y + c.h / 2 - (ls.length - 1) * lh / 2 + n * lh + 4, l, sz, INK, 'left', 800));
  }
  function drawCards(t) {
    const L = RC.L, A = S.ap, G = cardGeo();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🃏 어떤 성질을 이용한 사례일까요?', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '카드를 끌어 알맞은 상자에 넣어요 (또는 카드를 누르고 상자를 눌러요)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    G.bins.forEach((bn, b) => {
      const hot = A.sel >= 0 || (A.drag && A.drag.moved);
      D.roundRect(bn.x, bn.y, bn.w, bn.h, 12); ctx.fillStyle = C.rgba(BINS[b].c, hot ? 0.13 : 0.07); ctx.fill(); ctx.strokeStyle = BINS[b].c; ctx.lineWidth = hot ? 2.4 : 1.6; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(bn.x + bn.w / 2, bn.y + 22, BINS[b].n, 14, BINS[b].c, 'center', 800);
    });
    A.cards.forEach((c, k) => { if (!(A.drag && A.drag.moved && A.drag.i === k)) drawCard(c, k, false); });
    if (A.drag && A.drag.moved) drawCard(A.cards[A.drag.i], A.drag.i, true);
  }
  function drawCardsInfo(t) {
    const R = RC.R, A = S.ap;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '💡 사례 설명', 14.5, INK, 'left', 800);
    let y = R.y + 52;
    const c = A.sel >= 0 ? A.cards[A.sel] : null;
    if (c) { y += textBlock(R.x + 14, y, R.w - 28, c.t, 14, PUR, 20, 800) + 8; y += textBlock(R.x + 14, y, R.w - 28, c.info, 13.5, INK, 19, 700) + 8; }
    else y += textBlock(R.x + 14, y, R.w - 28, '카드를 누르면 설명이 나와요.', 13.5, MUTED, 19, 700) + 8;
    y += 8;
    y += textBlock(R.x + 14, y, R.w - 28, '용액이 순수한 용매보다 높은 온도에서 끓는 것 = 끓는점 오름', 13, HOT, 18, 800) + 6;
    y += textBlock(R.x + 14, y, R.w - 28, '용액이 순수한 용매보다 낮은 온도에서 어는 것 = 어는점 내림', 13, '#1d6fb5', 18, 800) + 6;
    textBlock(R.x + 14, y + 4, R.w - 28, '전해질(소금 등)은 이온으로 나뉘어 용질 입자 수가 늘어나므로 같은 몰랄 농도에서도 ΔT가 더 커요.', 12.5, MUTED, 17, 700);
  }
  const CALCS = [
    { t: '① 비전해질 18.0 g을 물 200 g에 녹였더니 어는점이 0.93 °C 내려갔어요.', q: '구하는 값: 이 물질의 몰질량 M (g/mol)', steps: ['m = ΔTf / Kf = 0.93 / 1.86 = 0.50 mol/kg', 'n = m × 0.200 kg = 0.10 mol', 'M = 18.0 g / 0.10 mol = 180 g/mol'], tip: '① m 구하기  ② 몰수 n 구하기  ③ M = 질량 / n' },
    { t: '② 에틸렌 글리콜(몰질량 62 g/mol) 620 g을 물 1 kg에 녹인 부동액이에요.', q: '구하는 값: 어는점 내림 ΔTf (°C)', steps: ['n = 620 g / 62 g/mol = 10 mol', 'm = 10 mol / 1 kg = 10 mol/kg', 'ΔTf = 1.86 × 10 = 18.6 °C  (어는점 약 −18.6 °C)'], tip: '① 몰수  ② 몰랄 농도 m  ③ ΔTf = Kf · m' },
  ];
  function drawCalc(t) {
    const L = RC.L, A = S.ap;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧮 ΔT = K · m 으로 계산해요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 48, '물: Kb = 0.51, Kf = 1.86 °C·kg/mol (비전해질, 묽은 용액)', 13, MUTED, 'left', 800);
    CALCS.forEach((cd, i) => {
      const y = L.y + 66 + i * (PHONE ? 214 : 214), done = A.ok[i], h = 204;
      D.roundRect(L.x + 14, y, L.w - 28, h, 12); ctx.fillStyle = done ? 'rgba(20,160,88,.08)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = done ? GOOD : '#dbe3f3'; ctx.lineWidth = done ? 2.2 : 1.4; ctx.stroke();
      let yy = y + 22; yy += textBlock(L.x + 28, yy, L.w - 56, cd.t, PHONE ? 13 : 13.5, INK, 19, 800) + 6;
      T(L.x + 28, yy + 4, cd.q, 13.5, PUR, 'left', 800); yy += 28;
      if (done) { cd.steps.forEach((s, k) => { yy += textBlock(L.x + 28, yy, L.w - 56, s, 13.5, k === 2 ? GOOD : INK, 19, 800) + 4; }); T(L.x + L.w - 28, y + 20, '✅ 정답', 13.5, GOOD, 'right', 800); }
      else { T(L.x + 28, yy + 4, cd.tip, 13, MUTED, 'left', 700); T(L.x + 28, yy + 34, '답을 오른쪽 입력칸에 소수로 적어요', 13, PUR, 'left', 800); }
    });
  }
  function drawCalcInfo(t) {
    const R = RC.R;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📌 쓰는 식', 14.5, INK, 'left', 800);
    let y = R.y + 56;
    ['ΔTb = Kb · m', 'ΔTf = Kf · m', 'm = 용질의 몰수(mol) / 용매의 질량(kg)'].forEach((s, k) => { T(R.x + 14, y, s, k < 2 ? 17 : 13.5, INK, 'left', 800); y += k < 2 ? 28 : 30; });
    y += textBlock(R.x + 14, y, R.w - 28, '물 Kb = 0.51, Kf = 1.86 (°C·kg/mol)', 13, MUTED, 18, 800) + 12;
    y += textBlock(R.x + 14, y, R.w - 28, '❄️ 제설: NaCl 1 mol/kg 은 Na⁺, Cl⁻ 로 나뉘어 입자가 약 2 mol/kg 처럼 작용해요. 어는점 내림이 같은 몰랄 농도의 설탕물보다 약 2배(약 3.7 °C)예요.', 12.5, INK, 17, 700) + 8;
    if (!PHONE) textBlock(R.x + 14, y, R.w - 28, '전해질은 입자 수가 늘어난다는 것만 기억해요. (식에 따로 숫자를 곱하지는 않아요)', 12, MUTED, 16, 700);
  }

  /* ================= 컨트롤 · 공통 ================= */
  const kindNow = () => (S.mode === 'frz' ? 'frz' : 'boil');
  const kOk = (s) => fitLanded(s) === 5 && near(parseNum(S.fit.kv[s]), (KRANGE[s][0] + KRANGE[s][1]) / 2, (KRANGE[s][1] - KRANGE[s][0]) / 2 + 1e-9);
  const chipBox = $('#sugChips');
  SUG_G.forEach((g, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.textContent = g + ' g';
    b.setAttribute('aria-label', '설탕 ' + g + ' g, 몰랄 농도 ' + MOL[i].toFixed(1));
    b.addEventListener('click', () => { Sound.click(); runSelect(kindNow(), i); });
    chipBox.appendChild(b);
  });
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => {
      const toks = n.getAttribute('data-show').split(' ');
      n.hidden = !toks.some((tk) => { const [m, v] = tk.split(':'); return m === S.mode && (v == null || S.sub[m] === v); });
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#fitSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.fit));
    $$('#apSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.ap));
    const kind = kindNow(), R = S[kind], boil = kind === 'boil';
    $$('#sugChips button').forEach((b, i) => { b.classList.toggle('on', i === R.idx); b.classList.toggle('done', R.rec[i] != null); });
    $('#oSg').textContent = SUG_G[R.idx] + ' g → ' + MOL[R.idx].toFixed(1) + ' m';
    $('#bGo').textContent = R.done ? '↻ 다시 측정' : R.run ? '⏸ 멈춤' : R.tau > 0 ? '▶ 계속' : (boil ? '🔥 가열 시작' : '🧊 냉각 시작');
    $('#bRecR').textContent = R.rec[R.idx] != null ? '✅ 기록했어요' : (boil ? '📝 끓는점 기록' : '📝 어는점 기록');
    $('#bFast').setAttribute('aria-pressed', R.fast ? 'true' : 'false');
    $('#safeNote').textContent = boil ? '🥽 실제 실험에서는 보안경과 보호 장갑을 쓰고, 뜨거운 설탕물의 화상에 주의해요. 남은 설탕물은 교사의 안내에 따라 폐수·폐기물 기준대로 처리해요.' : '🥽 얼음–소금 냉각조는 −10 °C 이하로 아주 차가워요. 보안경과 장갑을 쓰고, 남은 용액은 교사의 안내에 따라 폐수·폐기물 기준대로 처리해요.';
    const s = fitS(), F = S.fit, nx = F.pl[s].findIndex((p) => !p);
    $('#bPlot').disabled = nx < 0; $('#bPlot').textContent = nx < 0 ? '✅ 점 5개 완성' : '📍 다음 점 찍기';
    const miss = ['boil', 'frz'].some((k) => S[k].rec.some((v) => v == null));
    $('#bLoad').disabled = !miss;
    $('#curCtl').hidden = $('#curCtl').hidden || fitLanded(s) < 5;
    $('#oCm').textContent = F.cm.toFixed(2) + ' m'; $('#sCm').value = F.cm; $('#cmMinus').disabled = F.cm <= 0; $('#cmPlus').disabled = F.cm >= 2;
    $('#kLab').textContent = (s === 'boil' ? '기울기 Kb' : '기울기 Kf') + ' (°C·kg/mol)';
    const kin = $('#kIn'); if (document.activeElement !== kin && kin.value !== F.kv[s]) kin.value = F.kv[s];
    kin.classList.toggle('ok', kOk(s)); if (!kOk(s)) kin.classList.remove('ok');
    $('#kNote').textContent = kOk(s) ? '✅ 맞아요! 이론값은 ' + KTHEORY[s].toFixed(2) + ' °C·kg/mol 이에요.' : (fitLanded(s) < 5 ? '점 5개를 모두 찍으면 직선이 그려져요.' : 'm 눈금을 1.00 m 에 맞추고 ΔT를 읽어요. 소수 둘째 자리까지 적어요.');
    $('#oSm').textContent = F.sm.toFixed(2) + ' m'; $('#sSm').value = F.sm; $('#smMinus').disabled = F.sm <= 0; $('#smPlus').disabled = F.sm >= 2;
    [$('#q1'), $('#q2')].forEach((inp, k) => { const v = S.ap.q[k]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', S.ap.ok[k] && v !== ''); if (!inp.classList.contains('ok')) inp.classList.remove('bad'); });
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); S.boil.run = false; S.frz.run = false; if (m === 'boil') boilInit(); if (m === 'frz') frzInit(); }
    S.mode = m; updateCtl();
  }
  function setSub(m, v) { S.sub[m] = v; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#fitSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('fit', b.dataset.v); }));
  $$('#apSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('ap', b.dataset.v); }));
  $('#bGo').addEventListener('click', () => runToggle(kindNow()));
  $('#bRecR').addEventListener('click', () => recordRun(kindNow()));
  $('#bFast').addEventListener('click', () => { Sound.click(); const v = !S[kindNow()].fast; S.boil.fast = v; S.frz.fast = v; updateCtl(); });
  $('#bLoad').addEventListener('click', () => { Sound.click(); fitLoad(); });
  $('#bPlot').addEventListener('click', () => fitNext());
  const setCm = (v) => { S.fit.cm = clamp(Math.round(v * 4) / 4, 0, 2); updateCtl(); };
  $('#sCm').addEventListener('input', (e) => setCm(+e.target.value));
  $('#cmMinus').addEventListener('click', () => { Sound.tick(); setCm(S.fit.cm - 0.25); });
  $('#cmPlus').addEventListener('click', () => { Sound.tick(); setCm(S.fit.cm + 0.25); });
  const setSm = (v) => { S.fit.sm = clamp(Math.round(v * 4) / 4, 0, 2); updateCtl(); };
  $('#sSm').addEventListener('input', (e) => setSm(+e.target.value));
  $('#smMinus').addEventListener('click', () => { Sound.tick(); setSm(S.fit.sm - 0.25); });
  $('#smPlus').addEventListener('click', () => { Sound.tick(); setSm(S.fit.sm + 0.25); });
  const kin = $('#kIn');
  kin.addEventListener('input', () => { const s = fitS(); S.fit.kv[s] = kin.value; const was = kin.classList.contains('ok'); kin.classList.remove('bad'); S.fit.kok[s] = kOk(s); if (S.fit.kok[s] && !was) Sound.tick(); updateCtl(); });
  kin.addEventListener('change', () => { if (kin.value !== '' && !kOk(fitS())) { kin.classList.remove('bad'); void kin.offsetWidth; kin.classList.add('bad'); Sound.fail(); } });
  const QANS = [{ v: 180, tol: 2 }, { v: 18.6, tol: 0.35 }];
  [$('#q1'), $('#q2')].forEach((inp, k) => {
    const okf = (s) => near(Math.abs(parseNum(s)), QANS[k].v, QANS[k].tol);
    inp.addEventListener('input', () => { S.ap.q[k] = inp.value; const was = S.ap.ok[k]; S.ap.ok[k] = okf(inp.value); inp.classList.remove('bad'); inp.classList.toggle('ok', S.ap.ok[k]); if (S.ap.ok[k] && !was) { Sound.tick(); updateCtl(); } });
    inp.addEventListener('change', () => { if (inp.value !== '' && !S.ap.ok[k]) { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); } });
  });
  $('#bCards').addEventListener('click', () => { Sound.click(); cardsInit(); layoutCards(); updateCtl(); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'boil' || S.mode === 'frz') { runReset(S.mode); }
    else if (S.mode === 'fit') {
      if (S.sub.fit !== 'solv') { const s = fitS(); S.fit.pl[s] = [null, null, null, null, null]; S.fit.line[s] = 0; S.fit.kv[s] = ''; S.fit.kok[s] = false; S.fit.cm = 1; } else S.fit.sm = 1;
    } else if (S.sub.ap === 'calc') { S.ap.q = ['', '']; S.ap.ok = [false, false]; } else { cardsInit(); layoutCards(); }
    updateCtl();
  });

  /* ================= 포인터 ================= */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'fit' && S.sub.fit !== 'solv') { const i = fitRows().findIndex((r) => inRect(p, r)); if (i >= 0) { fitPlot(fitS(), i); return true; } return false; }
      if (S.mode === 'ap' && S.sub.ap === 'cards') {
        const A = S.ap; let hit = -1;
        for (let k = A.cards.length - 1; k >= 0; k--) { const c = A.cards[k]; if (inRect(p, { x: c.x, y: c.y, w: c.w, h: c.h })) { hit = k; break; } }
        A.drag = { i: hit, sx: p.x, sy: p.y, moved: false, ox: 0, oy: 0 }; return true;
      }
      return false;
    },
    move(p) {
      const A = S.ap, d = A.drag; if (!d || d.i < 0) return;
      const c = A.cards[d.i], G = cardGeo();
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 7) { d.moved = true; c.w = c.tw = G.cw; c.h = c.th = G.ch; d.ox = G.cw / 2; d.oy = G.ch / 2; A.sel = -1; }
      if (d.moved) { c.x = clamp(p.x - d.ox, 2, VW - c.w - 2); c.y = clamp(p.y - d.oy, 2, VH - c.h - 2); }
    },
    up(p) {
      if (!(S.mode === 'ap' && S.sub.ap === 'cards')) return;
      const A = S.ap, d = A.drag; A.drag = null; if (!d) return;
      const G = cardGeo(), binAt = G.bins.findIndex((b) => inRect(p, b));
      if (d.i >= 0 && d.moved) { if (binAt >= 0) placeCard(d.i, binAt); else returnCard(d.i); return; }
      if (d.i >= 0) {                                   // 누르기
        const c = A.cards[d.i];
        if (A.sel >= 0 && A.sel !== d.i && c.bin >= 0 && A.cards[A.sel].bin !== c.bin) { placeCard(A.sel, c.bin); return; }
        A.sel = A.sel === d.i ? -1 : d.i; Sound.tick(); updateCtl(); return;
      }
      if (A.sel >= 0) { if (binAt >= 0) placeCard(A.sel, binAt); else if (A.cards[A.sel].bin >= 0 && p.y < G.by) returnCard(A.sel); else A.sel = -1; }
    },
    hover(p) {
      if (S.mode === 'fit' && S.sub.fit !== 'solv') return fitRows().some((r) => inRect(p, r)) ? 'pointer' : null;
      if (S.mode === 'ap' && S.sub.ap === 'cards') return S.ap.cards.some((c) => inRect(p, { x: c.x, y: c.y, w: c.w, h: c.h })) ? 'grab' : null;
      return null;
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'boil' || S.mode === 'frz') {
      const kind = S.mode, R = S[kind], boil = kind === 'boil';
      L1 = '센서 온도'; a = f1(runCur(kind)) + ' °C'; L2 = '경과 시간'; b = R.tau.toFixed(1) + ' 분';
      L3 = boil ? '기록한 끓는점' : '기록한 어는점'; c = R.rec[R.idx] != null ? f1(R.rec[R.idx]) + ' °C' + (R.idx && R.rec[0] != null ? ' (Δ ' + f1(boil ? R.rec[R.idx] - R.rec[0] : R.rec[0] - R.rec[R.idx]) + ')' : '') : '아직 없어요';
    } else if (S.mode === 'fit') {
      const F = S.fit;
      if (S.sub.fit === 'solv') { L1 = 'm'; a = F.sm.toFixed(2) + ' mol/kg'; L2 = '물 ΔTf'; b = (KF * F.sm).toFixed(2) + ' °C'; L3 = '벤젠 ΔTf'; c = (5.12 * F.sm).toFixed(2) + ' °C'; }
      else { const s = fitS(); L1 = '찍은 점 (끓는점 · 어는점)'; a = fitLanded('boil') + ' / 5 · ' + fitLanded('frz') + ' / 5'; L2 = 'm 눈금'; b = fitLanded(s) === 5 ? F.cm.toFixed(2) + ' m' : '—'; L3 = '직선의 ΔT'; c = fitLanded(s) === 5 ? (fitK(s) * F.cm).toFixed(2) + ' °C' : '—'; }
    } else if (S.sub.ap === 'calc') { L1 = '풀이'; a = '① ' + mark(S.ap.ok[0]) + ' ② ' + mark(S.ap.ok[1]); L2 = 'Kb (물)'; b = '0.51 °C·kg/mol'; L3 = 'Kf (물)'; c = '1.86 °C·kg/mol'; }
    else { L1 = '상자에 넣은 카드'; a = cardsPlaced() + ' / ' + S.ap.cards.length; L2 = '선택한 카드'; b = S.ap.sel >= 0 ? S.ap.cards[S.ap.sel].t.slice(0, 12) + '…' : '—'; L3 = '상자'; c = '끓는점 오름 · 어는점 내림'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const recBoth = (kind) => S[kind].rec[0] != null && S[kind].rec[2] != null;
  const clearRec = (kind) => { const R = S[kind]; R.rec[0] = R.rec[2] = null; R.ld[0] = R.ld[2] = false; R.hist = {}; R.idx = 0; R.fast = false; runReset(kind); };
  const recSt = (kind) => { const R = S[kind]; return '0 g ' + mark(R.rec[0] != null) + (R.rec[0] != null ? ' ' + f1(R.rec[0]) + ' °C' : '') + ' &nbsp; 68.4 g ' + mark(R.rec[2] != null) + (R.rec[2] != null ? ' ' + f1(R.rec[2]) + ' °C' : ''); };
  const levels = [
    {
      title: '끓는점 오름: 센서로 재요', short: '끓는점 오름', icon: '🔥', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 소금물이나 설탕물은 왜 순수한 물보다 높은 온도에서 끓고 낮은 온도에서 얼까? 얼마나 달라질까?</p>' +
        '<div class="si-link">🔗 <b>중학교의 끓는점 · 어는점과 앞 차시(증기압 내림, 용액의 농도 표현)에서</b> 순수한 물질은 끓는점이 일정하고, 비휘발성 용질이 녹으면 증기압이 내려간다는 것과 몰랄 농도를 배웠어요. 이번에는 온도 센서로 직접 재요.</div>' +
        '<p>물 200 g에 설탕을 녹인 용액을 가열하면서 온도 센서로 <b>온도–시간 그래프</b>를 그려요. 곡선이 꺾여 거의 평평해지는 점의 온도가 <b>끓는점</b>이에요. 설탕의 양을 바꿔 가며 끓는점을 기록해요.</p>' +
        '<p>🥽 실험할 때는 보안경과 보호 장갑을 쓰고, 뜨거운 설탕물에 화상을 입지 않게 조심해요. 남은 용액은 교사의 안내에 따라 처리해요.</p>',
      features: ['boil'],
      setup() { S.lock = false; setMode('boil'); },
      recap: '설탕물의 끓는점은 순수한 물(100.0 °C)보다 높아요. 용액의 몰랄 농도가 클수록 더 많이 올라가요.',
      summary: '<ul><li>온도 센서로 가열 곡선을 그리면, 순수한 물은 <b>100.0 °C</b>에서 평평해져요(끓는 동안 온도 일정).</li><li>설탕물은 순수한 물보다 <b>높은 온도</b>에서 끓기 시작해요. 물 200 g에 설탕 0, 34.2, 68.4, 102.6, 136.8 g(m = 0, 0.50, 1.0, 1.5, 2.0): 끓는점 100.0, 100.3, 100.5, 100.8, 101.0 °C.</li><li>끓는 동안 용매인 물이 증발해 용액이 점점 진해지므로 설탕물의 온도는 <b>서서히 올라가요</b>. 그래서 끓는점은 곡선이 꺾이는 시작점으로 읽어요.</li><li>까닭: 용액의 증기압이 낮아져서 대기압(760 mmHg)과 같아지려면 더 높은 온도가 필요해요.</li></ul>',
      missions: [
        {
          title: '순수한 물과 설탕물의 끓는점 재기',
          goal: '설탕 <b>0 g</b>(순수한 물)과 <b>68.4 g</b>(1.0 m)을 가열해서, 곡선이 꺾여 평평해지면 각각 「끓는점 기록」을 눌러요.',
          hint: '설탕 단추를 고르고 「가열 시작」을 눌러요. 약 5초 뒤 곡선이 꺾이면 「끓는점 기록」을 눌러요. 기다리기 어려우면 「빠르게」를 켜요.',
          setup() { S.lock = true; clearRec('boil'); setMode('boil'); },
          check: () => recBoth('boil'), hold: 0.4,
          status: () => recSt('boil'),
          explain: '순수한 물은 <b>100.0 °C</b>에서 일정하게 끓고(평탄 구간), 1.0 m 설탕물은 <b>100.5 °C</b>에서 끓기 시작해요. 같은 압력에서 끓는점이 <b>0.5 °C 올랐어요</b>(ΔTb = 0.5 °C).',
        },
        {
          type: 'quiz', title: '설탕물이 끓는 동안의 온도',
          goal: '설탕물은 끓는 동안에도 온도가 서서히 올라가요. 그 까닭은?',
          setup() { S.lock = true; setMode('boil'); },
          choices: ['끓는 동안 물이 증발해서 용액이 점점 진해지기 때문이에요', '끓는 동안 설탕이 분해되어 열이 나기 때문이에요', '불꽃이 점점 세지기 때문이에요', '설탕이 계속 더 녹아 들어가기 때문이에요'],
          answer: 0,
          feedback: ['', '설탕이 분해되지 않는 낮은 온도예요. 온도가 오르는 것은 농도 변화 때문이에요.', '같은 세기로 가열해도 순수한 물은 평평해요. 용액의 성질 때문이에요.', '설탕은 이미 모두 녹아 있어요. 달라지는 것은 물의 양이에요.'],
          explain: '끓는 동안 용매인 <b>물이 증발</b>하면 같은 양의 설탕이 더 적은 물에 녹아 있어요. 몰랄 농도가 커지므로 끓는점이 조금씩 올라가요. 순수한 물은 농도가 변하지 않아 온도가 일정해요.',
        },
      ],
    },
    {
      title: '어는점 내림: 냉각 곡선', short: '어는점 내림', icon: '🧊', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 설탕물의 끓는점이 순수한 물보다 높다는 것을 센서로 확인했어요. 이번에는 같은 설탕물을 <b>얼음–소금 냉각조</b>에서 식히며 어는점을 재요.</div>' +
        '<p>온도–시간 그래프에서 순수한 물은 <b>0.0 °C</b>에서 평평해져요. 설탕물은 더 낮은 온도에서 얼기 시작해요. 물은 얼기 직전에 어는점보다 조금 더 내려가는 <b>과냉각</b>이 나타날 수 있어서, <b>온도가 다시 올라와 곡선이 꺾이는 점</b>의 온도를 어는점으로 읽어요.</p>' +
        '<p>🥽 냉각조는 매우 차가워요. 보안경과 장갑을 쓰고, 남은 용액은 교사의 안내에 따라 처리해요.</p>',
      features: ['frz'],
      setup() { S.lock = false; setMode('frz'); },
      recap: '설탕물의 어는점은 순수한 물(0.0 °C)보다 낮아요. 용액의 몰랄 농도가 클수록 더 많이 내려가요.',
      summary: '<ul><li>냉각 곡선에서 순수한 물은 <b>0.0 °C</b>에서 평평해져요. 설탕물은 더 낮은 온도에서 얼기 시작하고, 어는 동안 남은 용액이 진해져서 온도가 <b>서서히 내려가요</b>.</li><li>어는점은 곡선이 꺾이는 시작점으로 읽어요(과냉각으로 잠깐 더 내려갔다 올라온 뒤).</li><li>물 200 g에 설탕 0, 34.2, 68.4, 102.6, 136.8 g: 어는점 0.0, −0.9, −1.9, −2.8, −3.7 °C.</li><li>까닭: 얼음 결정에는 물 분자만 들어가고 설탕은 용액에 남아요. 용액의 증기압이 낮아서 얼음의 증기압과 같아지는 온도가 더 낮아져요.</li></ul>',
      missions: [
        {
          title: '순수한 물과 설탕물의 어는점 재기',
          goal: '설탕 <b>0 g</b>과 <b>68.4 g</b>(1.0 m)을 냉각해서, 온도가 올라와 꺾이면 각각 「어는점 기록」을 눌러요.',
          hint: '설탕 단추를 고르고 「냉각 시작」을 눌러요. 온도가 어는점보다 잠깐 더 내려갔다 올라와 평평해지면 「어는점 기록」을 눌러요.',
          setup() { S.lock = true; clearRec('frz'); setMode('frz'); },
          check: () => recBoth('frz'), hold: 0.4,
          status: () => recSt('frz'),
          explain: '순수한 물은 <b>0.0 °C</b>에서 일정하게 얼고, 1.0 m 설탕물은 <b>−1.9 °C</b>에서 얼기 시작해요. 어는점이 <b>1.9 °C 내려갔어요</b>(ΔTf = 1.9 °C).',
        },
        {
          type: 'quiz', title: '어는점이 내려가는 까닭',
          goal: '설탕물의 어는점이 순수한 물보다 낮은 까닭으로 가장 알맞은 것은?',
          setup() { S.lock = true; setMode('frz'); },
          choices: ['설탕이 열을 내서 물을 따뜻하게 하기 때문이에요', '설탕이 얼음 결정에 섞이지 않고 용액에 남아, 용액의 증기압이 낮아지기 때문이에요', '설탕 때문에 물 분자가 모두 없어지기 때문이에요', '설탕이 얼음 결정 안으로 들어가 결정을 만들기 때문이에요'],
          answer: 1,
          feedback: ['설탕이 녹을 때 나오는 열은 아주 작아요. 어는점이 내려가는 까닭은 농도 때문이에요.', '', '물 분자는 그대로 있어요. 얼음 결정으로 들어갈 수 있는 물 분자의 비율이 줄 뿐이에요.', '얼음 결정에는 물 분자만 들어가요. 설탕은 결정 밖의 용액에 남아요.'],
          explain: '얼음 결정에는 <b>물 분자만</b> 들어가고 용질은 용액에 남아요. 용액의 증기압은 순수한 물보다 낮아서, 얼음의 증기압과 같아지는 온도(어는점)도 <b>더 낮아져요</b>.',
        },
      ],
    },
    {
      title: 'K 값 찾기: ΔT와 m의 관계', short: 'K 값 찾기', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 설탕이 많을수록 끓는점은 더 올라가고 어는점은 더 내려간다는 자료를 모았어요. 이제 변화 크기 ΔT와 <b>몰랄 농도 m</b> 사이의 관계를 그래프로 찾아요.</div>' +
        '<p>몰랄 농도 m = 용질의 몰수(mol) / 용매의 질량(kg) 이에요. 설탕 34.2 g(0.10 mol)을 물 200 g에 녹이면 m = 0.10 / 0.200 = 0.50 mol/kg 이에요. 표의 ΔT를 m에 대한 점으로 찍고, 점들이 어떤 모양을 이루는지 살펴봐요.</p>',
      features: ['fit'],
      setup() { S.lock = false; S.sub.fit = 'boil'; setMode('fit'); },
      recap: 'ΔTb = Kb · m, ΔTf = Kf · m. ΔT는 몰랄 농도에 비례하고, 비례 상수 K는 용매마다 정해진 값이에요(물: Kb = 0.51, Kf = 1.86).',
      summary: '<ul><li>ΔT–m 그래프는 <b>원점을 지나는 직선</b>이에요. ΔT는 몰랄 농도 m에 비례해요.</li><li><b>ΔTb = Kb · m</b>, <b>ΔTf = Kf · m</b>. 물의 Kb = 0.51, Kf = 1.86 °C·kg/mol (그래프 기울기).</li><li>K는 용매마다 달라요: 벤젠 Kb 2.53, Kf 5.12 / 아세트산 Kb 3.07, Kf 3.90 / 에탄올 Kb 1.22, Kf 1.99.</li><li>비전해질이면 용질의 종류와 관계없이 같은 용매, 같은 m에서 ΔT가 같아요. 묽은 용액에서 X<sub>용질</sub> ≈ m / 55.5 이므로 몰 분율로도 같은 비례 관계예요.</li></ul>',
      missions: [
        {
          title: '그래프에 점 10개 찍기',
          goal: '🔥 끓는점 오름 5개, 🧊 어는점 내림 5개를 ΔT–m 그래프에 모두 찍어요. 표가 비어 있으면 「모둠 자료 불러오기」를 눌러요.',
          hint: '표의 행을 누르거나 「다음 점 찍기」를 눌러요. 🔥와 🧊 그래프를 번갈아 눌러 두 그래프를 모두 채워요.',
          setup() { S.lock = true; S.sub.fit = 'boil'; const F = S.fit; F.pl = { boil: [null, null, null, null, null], frz: [null, null, null, null, null] }; F.line = { boil: 0, frz: 0 }; F.cm = 1; F.kv = { boil: '', frz: '' }; F.kok = { boil: false, frz: false }; setMode('fit'); },
          check: () => fitAllPlotted(), hold: 0.5,
          status: () => '🔥 ' + fitLanded('boil') + ' / 5 &nbsp; 🧊 ' + fitLanded('frz') + ' / 5',
          explain: '두 그래프 모두 점들이 <b>원점을 지나는 직선</b> 위에 놓여요. 몰랄 농도가 2배, 3배가 되면 ΔT도 2배, 3배가 돼요. 즉 ΔT는 m에 <b>비례</b>해요.',
        },
        {
          title: '기울기 K 읽기',
          goal: '직선 위에서 <b>m = 1.00</b>일 때의 ΔT를 읽어요. 🔥 Kb와 🧊 Kf를 각각 적어요. (단위 °C·kg/mol)',
          hint: 'm 눈금을 1.00 m에 맞추면 그래프에 ΔT가 나와요. 기울기 K = ΔT / m 이에요. 소수 둘째 자리까지 적어요.',
          setup() { S.lock = true; S.sub.fit = 'boil'; S.fit.cm = 1; S.fit.kv = { boil: '', frz: '' }; S.fit.kok = { boil: false, frz: false }; setMode('fit'); },
          check: () => kOk('boil') && kOk('frz'), hold: 0.4,
          status: () => 'Kb ' + mark(kOk('boil')) + ' &nbsp; Kf ' + mark(kOk('frz')) + ' &nbsp; (🔥와 🧊 화면에서 각각 적어요)',
          explain: '직선의 기울기가 비례 상수 K예요. 물의 <b>Kb ≈ 0.51</b>, <b>Kf ≈ 1.86 °C·kg/mol</b> 이에요(이론값 0.51, 1.86). 그래서 <b>ΔTb = Kb · m</b>, <b>ΔTf = Kf · m</b>.',
        },
        {
          type: 'quiz', title: '용매를 바꾸면 K는?',
          goal: '🧴 용매 비교 화면을 보고 답해요. 비전해질 용질을 녹인 <b>벤젠</b> 용액이 1.0 m 일 때, 어는점 내림 ΔTf는?',
          setup() { S.lock = true; S.sub.fit = 'solv'; S.fit.sm = 1; setMode('fit'); },
          choices: ['1.86 °C (용매가 달라도 ΔT는 같아요)', '5.12 °C', '2.53 °C', '0.51 °C'],
          answer: 1,
          feedback: ['K는 용매마다 달라요. 벤젠의 Kf는 5.12 °C·kg/mol 이에요.', '', '2.53은 벤젠의 Kb(끓는점 오름 상수)예요. 어는점 내림은 Kf를 써요.', '0.51은 물의 Kb예요. 벤젠 용액이니 벤젠의 Kf를 써야 해요.'],
          explain: 'K는 <b>용매의 고유한 값</b>이에요. 벤젠의 Kf = 5.12 °C·kg/mol 이므로 1.0 m 에서 ΔTf = 5.12 × 1.0 = <b>5.12 °C</b>예요. 같은 m이라도 용매가 다르면 ΔT가 달라요.',
        },
      ],
    },
    {
      title: '활용: 몰질량, 부동액, 제설', short: '활용', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> ΔTb = Kb · m, ΔTf = Kf · m 을 얻었어요. 이제 이 식으로 모르는 값을 구하고, 생활 속 사례를 설명해 봐요.</div>' +
        '<p>어는점 내림을 재면 몰랄 농도를 알 수 있고, 몰랄 농도에서 용질의 <b>몰질량</b>도 구할 수 있어요. 부동액, 제설제, 아이스크림 만들기도 같은 원리예요.</p>',
      features: ['ap'],
      setup() { S.lock = false; S.sub.ap = 'calc'; setMode('ap'); },
      recap: '어는점 내림과 끓는점 오름은 용질 입자 수에 따라 정해져요. 식으로 몰질량을 구하고, 제설·부동액·아이스크림·시럽 졸이기를 같은 원리로 설명할 수 있어요.',
      summary: '<ul><li><b>몰질량 구하기</b>: 비전해질 18.0 g을 물 200 g에 녹였더니 ΔTf = 0.93 °C → m = 0.93 / 1.86 = 0.50, n = 0.50 × 0.200 = 0.10 mol → M = 18.0 / 0.10 = <b>180 g/mol</b>.</li><li><b>부동액</b>: 에틸렌 글리콜(M = 62) 620 g / 물 1 kg = 10 m → ΔTf = 1.86 × 10 ≈ <b>18.6 °C</b> (이상 계산).</li><li><b>전해질</b>은 이온으로 나뉘어 용질 입자 수가 늘어요. NaCl 1 m 은 입자 약 2 m 처럼 작용해서 같은 m의 설탕물보다 어는점이 약 2배 내려가요 (약 −3.7 °C). 그래서 제설제로 써요.</li><li>얼음 + 소금 → 0 °C보다 훨씬 낮은 냉각조(아이스크림 제조). 라면 국물(염분 약 1 %)의 ΔTb는 약 0.2 °C로 아주 작아요.</li></ul>',
      missions: [
        {
          title: '몰질량과 부동액 계산',
          goal: '🧮 계산 화면의 두 문제를 풀어 답을 적어요. ① 미지 물질의 몰질량, ② 부동액의 어는점 내림 ΔTf.',
          hint: '① m = ΔTf / Kf, n = m × (물의 kg), M = 질량 / n. ② 먼저 몰수 n = 620 / 62, m = n / 1 kg, ΔTf = Kf × m.',
          setup() { S.lock = true; S.sub.ap = 'calc'; S.ap.q = ['', '']; S.ap.ok = [false, false]; setMode('ap'); },
          check: () => S.ap.ok[0] && S.ap.ok[1], hold: 0.4,
          status: () => '① ' + mark(S.ap.ok[0]) + ' &nbsp; ② ' + mark(S.ap.ok[1]),
          explain: '① m = 0.93 / 1.86 = 0.50 mol/kg, n = 0.50 × 0.200 = 0.10 mol, M = 18.0 / 0.10 = <b>180 g/mol</b>. ② n = 620 / 62 = 10 mol, m = 10 mol/kg, ΔTf = 1.86 × 10 = <b>18.6 °C</b> (어는점 약 −18.6 °C).',
        },
        {
          title: '사례 카드 분류', manual: true,
          goal: '카드 6장을 <b>끓는점 오름</b> 상자와 <b>어는점 내림</b> 상자로 나누어 넣고 「확인하기」를 눌러요.',
          hint: '용액이 순수한 물보다 더 높은 온도에서 끓는 일인지, 더 낮은 온도에서 어는(얼지 않는) 일인지 생각해요. 카드를 누르면 설명이 나와요.',
          setup() { S.lock = true; S.sub.ap = 'cards'; cardsInit(); layoutCards(); setMode('ap'); },
          check: () => cardsCheck(),
          explain: '제설제, 소금을 섞은 얼음, 부동액은 모두 <b>어는점 내림</b>을 이용해요. 진한 시럽, 소금물, 라면 국물은 <b>끓는점 오름</b>을 보여 주지만 소금 1 % 정도에서는 ΔTb가 약 0.2 °C로 아주 작아요.',
        },
        {
          type: 'quiz', title: '제설제로 소금이 더 효과적인 까닭',
          goal: '같은 몰랄 농도(1 m)의 NaCl 수용액과 설탕 수용액 중 어는점이 더 낮은 쪽은?',
          setup() { S.lock = true; S.sub.ap = 'calc'; setMode('ap'); },
          choices: ['NaCl 수용액. 이온(Na⁺, Cl⁻)으로 나뉘어 용질 입자 수가 약 2배이기 때문이에요', '설탕 수용액. 설탕 분자가 더 크기 때문이에요', '같아요. 몰랄 농도가 같으면 항상 같아요', '비교할 수 없어요'],
          answer: 0,
          feedback: ['', '분자의 크기가 아니라 용액 속 용질 입자의 수가 중요해요.', '비전해질끼리는 같지만, 전해질은 이온으로 나뉘어 입자 수가 늘어나요.', '입자 수를 세어 정성적으로 비교할 수 있어요.'],
          explain: 'NaCl 1 m 은 Na⁺ 1 m + Cl⁻ 1 m, 즉 <b>용질 입자 약 2 m</b>처럼 작용해요. 설탕은 1 m 그대로예요. 그래서 NaCl 수용액의 어는점이 더 낮아요(약 −3.7 °C 대 −1.9 °C).',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-colligative', mount: '#game', badge: '온도 센서 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { boil: '🔥 끓는점 오름 실험', frz: '🧊 어는점 내림 실험', fit: '📈 ΔT–m 그래프와 K 값', ap: '🏠 계산과 사례 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  boilInit(); frzInit(); cardsInit(); layoutCards();
  setMode('boil');
  function stepAll1(dt) {
    S.clk += dt;
    if (S.mode === 'boil') stepRun('boil', dt);
    if (S.mode === 'frz') stepRun('frz', dt);
    stepRunMark(dt); stepMag(dt); stepFX(dt); stepFit(dt); stepCards(dt);
    S.fit.kok.boil = kOk('boil'); S.fit.kok.frz = kOk('frz');
  }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'boil') { drawRun('boil', t); drawRunInfo('boil', t); }
    else if (S.mode === 'frz') { drawRun('frz', t); drawRunInfo('frz', t); }
    else if (S.mode === 'fit') { if (S.sub.fit === 'solv') { drawSolv(t); drawSolvInfo(t); } else { drawFitGraph(t); drawFitInfo(t); } }
    else if (S.sub.ap === 'calc') { drawCalc(t); drawCalcInfo(t); }
    else { drawCards(t); drawCardsInfo(t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, TB, TF, MOL, SUG_G, KB, KF, boilT, frzT, tbOf, tkOf, tsOf, pRatio, setMode, setSub, runSelect, runToggle, runReset, recordRun, canRecord, runCur, runState,
    fitPlot, fitLoad, fitK, fitLanded, fitRows, fitG, fitPt, kOk, fitNext, cardGeo, cardsInit, layoutCards, placeCard, returnCard, cardsCheck, cardsPlaced, QANS, KRANGE, mg,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
