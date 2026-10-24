/* =========================================================
   물질과 에너지 Ⅱ. 용액의 성질 - 증기압 내림 [12물에02-02]
   ① 관찰: 증기압 비교 (밀폐 용기 두 개: 순수한 물과 설탕물, 마노미터로 증기압 읽기)
   ② 모형: 표면 모형 (설탕은 증발하지 않고 표면 자리를 차지해요: 증발 속도 = 응축 속도가 되는 증기 농도가 낮아져요)
   ③ 분석: 몰 분율 관계 (P = X_물 · P°, ΔP = X_설탕 · P°)
   ④ 예측: 곡선 이동 (용액의 증기압 곡선이 아래로 이동 → 끓는점 오름, 어는점 내림은 정성적으로만)
   휘발성 용질, 라울 법칙에서 벗어나는 용액, 화학 퍼텐셜은 다루지 않아요.
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
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const sgn = (v) => (v < 0 ? '−' : '') + Math.abs(v);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const rad = (d) => d * Math.PI / 180;
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1; const t = clamp(((p.x - a[0]) * dx + (p.y - a[1]) * dy) / l2, 0, 1); return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy)); };
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------- 배치 ---------- */
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { cmp: '🧪 같은 온도, 물과 설탕물의 증기압', surf: '🔬 액체 표면에서 일어나는 일', law: '📐 증기압과 물의 몰 분율', curve: '📈 증기압 곡선은 어디로 움직일까?' };
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const ap = SciSim.approach;
  const f2 = (v) => v.toFixed(2);
  const fP = (v) => (v < 100 ? v.toFixed(1) : String(Math.round(v)));

  /* ================= 자료 ================= */
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
  const Pw = (t) => Math.exp(lnP(t));                      // 물의 증기압 P° (mmHg), 증기압과 끓는점 차시의 자료와 같아요
  const P25 = 23.8, ATM = 760, KG_MOL = 1000 / 18;
  const xsOfM = (m) => m / (m + KG_MOL);                    // 몰랄 농도 m → X_용질 (물 1 kg = 55.6 mol)
  const Psol = (t, m) => (1 - xsOfM(m)) * Pw(t);
  function solveT(f, lo, hi) { for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; } return (lo + hi) / 2; }
  const Tboil = (m) => solveT((t) => Psol(t, m) - ATM, 90, 110);           // 760 mmHg가 되는 온도
  /* 어는점 쪽 (0 °C 근처, 얼음의 증기압과 물의 증기압: 지수 근사) */
  const P0T = 4.58, A_ICE = 0.0823, A_LIQ = 0.0727;
  const Pice = (t) => P0T * Math.exp(A_ICE * t), Pliq = (t) => P0T * Math.exp(A_LIQ * t), PsolF = (t, m) => (1 - xsOfM(m)) * Pliq(t);
  const Tfreeze = (m) => Math.log(1 - xsOfM(m)) / (A_ICE - A_LIQ);             // 얼음과 용액의 증기압이 같아지는 온도

  /* ---------- 상태 ---------- */
  const mkUnit = () => ({ gas: [], Pd: 0, exch: 0, spawnT: 0, absT: 0, eqT: 0, eq: false, evT: [], coT: [], pulse: 0 });
  const S = {
    mode: 'cmp', fade: 0, lock: false, t: 0, clk: 0,
    sub: { law: 'rec', curve: 'boil' },
    cmp: { s: 5, u: [mkUnit(), mkUnit()] },
    surf: { j: 0, u: mkUnit(), seen: {}, flash: [] },
    law: { xw: 100, rec: {}, q: ['', ''], ok: [false, false] },
    cur: { m: 1, cB: 100, cF: -1, fB: {}, fF: {}, drag: false },
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
  const SUGC = '#f472b6';

  /* ================= ① 증기압 비교: 밀폐 용기 두 개 ================= */
  const U_MM = 1.2, MMPX = 4.4;                    // 기체 분자 1개 ≈ 1.2 mmHg, 마노미터 1 mmHg = 4.4 px
  const SLOT = []; (function () { const cols = 15, rows = 8; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) SLOT.push({ x: 6 + c * 7.4 + (r % 2) * 3.7, y: 4 + r * 7.4 }); })();
  const LQ = (function () { const a = Array.from({ length: SLOT.length }, (_, i) => i); let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  const Peq = (i) => (i === 0 ? P25 : P25 * (100 - S.cmp.s) / 100);
  const dispP = (i) => +Peq(i).toFixed(1);                     // 화면에 보이는 증기압 (소수 첫째 자리)
  function cmpGeo(i) {
    const L = RC.L, ux = L.x + 6 + i * (L.w / 2), vw = 118, vh = 176, vy = L.y + 98;
    return { ux, vx: ux + 12, vy, vw, vh, surfY: vy + vh - 64, mTop: vy + 30, mBot: vy + 190, base: vy + 114, ml: ux + 12 + vw + 26, mr: ux + 12 + vw + 56 };
  }
  function unitReset(u) { u.gas = []; u.Pd = 0; u.exch = 0; u.spawnT = 0; u.absT = 0; u.eqT = 0; u.eq = false; u.evT = []; u.coT = []; u.pulse = 0; }
  function cmpRestart() { S.cmp.u.forEach(unitReset); updateCtl(); }
  function stepUnit(u, i, g, dt, peq) {
    u.Pd = ap(u.Pd, peq, dt, 0.9); if (Math.abs(u.Pd - peq) < 0.004 * peq) u.Pd = peq;
    const target = Math.round(u.Pd / U_MM);
    let live = u.gas.filter((p) => !p.ab).length;
    u.spawnT -= dt; u.absT -= dt;
    const surf = g.surfY - g.vy;
    if (live < target && u.spawnT <= 0) {
      const x = rnd(12, g.vw - 12), th = rnd(-2.5, -0.65), sp = rnd(40, 64);
      u.gas.push({ x, y: surf - 6, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, ab: false, fade: 0, ang: rnd(0, TAU), spin: rnd(-2, 2) }); u.evT.push(S.clk); u.spawnT = 0.07; live++; u.pulse = 1;
    } else if (live > target && u.absT <= 0) {
      const cand = u.gas.filter((p) => !p.ab); if (cand.length) { cand.sort((a, b) => b.y - a.y); cand[0].ab = true; u.coT.push(S.clk); u.absT = 0.07; }
    }
    if (live >= 1 && Math.abs(live - target) <= 1) {                // 평형: 증발과 응축이 같은 속도로 계속
      u.exch += (0.8 + 0.2 * target) * dt;
      while (u.exch >= 1) { u.exch -= 1; const cand = u.gas.filter((p) => !p.ab); if (cand.length) { cand[Math.floor(Math.random() * cand.length)].ab = true; u.coT.push(S.clk); const x = rnd(12, g.vw - 12), th = rnd(-2.5, -0.65), sp = rnd(40, 64); u.gas.push({ x, y: surf - 6, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, ab: false, fade: 0, ang: rnd(0, TAU), spin: rnd(-2, 2) }); u.evT.push(S.clk); } }
    }
    for (let k = u.gas.length - 1; k >= 0; k--) {
      const p = u.gas[k]; p.fade = Math.min(1, p.fade + dt * 5); p.ang += p.spin * dt;
      if (p.ab) { p.y += 110 * dt; p.vx = 0; if (p.y >= surf - 2) u.gas.splice(k, 1); continue; }
      const sp = Math.hypot(p.vx, p.vy) || 1, want = 56; p.vx *= want / sp; p.vy *= want / sp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 8) { p.x = 8; p.vx = Math.abs(p.vx); } else if (p.x > g.vw - 8) { p.x = g.vw - 8; p.vx = -Math.abs(p.vx); }
      if (p.y < 8) { p.y = 8; p.vy = Math.abs(p.vy); } else if (p.y > surf - 6) { p.y = surf - 6; p.vy = -Math.abs(p.vy); }
    }
    u.evT = u.evT.filter((t0) => S.clk - t0 < 3); u.coT = u.coT.filter((t0) => S.clk - t0 < 3);
    const live2 = u.gas.filter((p) => !p.ab).length;
    const ok = Math.abs(u.Pd - peq) < 1e-6 && Math.abs(live2 - target) <= 1;
    u.eqT = ok ? u.eqT + dt : 0; const eqNew = u.eqT > 1.2; if (eqNew !== u.eq) { u.eq = eqNew; updateCtl(); }
    u.pulse = Math.max(0, u.pulse - dt * 4);
  }
  function stepCmp(dt) { S.cmp.u.forEach((u, i) => stepUnit(u, i, cmpGeo(i), dt, Peq(i))); }
  const cmpEq = () => S.cmp.u.every((u) => u.eq);
  function drawUnit(i, t) {
    const L = RC.L, u = S.cmp.u[i], g = cmpGeo(i), s = S.cmp.s, sugar = i === 1;
    // 항온 수조
    D.roundRect(g.vx - 10, g.vy - 6, g.vw + 20, g.vh + 18, 14); ctx.fillStyle = '#d7ebff'; ctx.fill(); ctx.strokeStyle = '#9db4d6'; ctx.lineWidth = 2; ctx.stroke();
    T(g.vx + g.vw / 2, g.vy + g.vh + 24, '25 °C 항온 수조', 12, '#4a5b78', 'center', 800);
    // 용기
    ctx.fillStyle = 'rgba(244,249,255,.95)'; D.roundRect(g.vx, g.vy, g.vw, g.vh, 8); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(g.vx, g.vy, g.vw, g.vh); ctx.clip();
    const sy = g.surfY;
    const lg = ctx.createLinearGradient(0, sy, 0, g.vy + g.vh); lg.addColorStop(0, 'rgba(100,190,255,.5)'); lg.addColorStop(1, 'rgba(60,140,230,.7)'); ctx.fillStyle = lg; ctx.fillRect(g.vx, sy, g.vw, g.vy + g.vh - sy);
    // 액체 입자 (물 100개, 오른쪽은 일부가 설탕)
    ctx.fillStyle = '#38bdf8'; ctx.beginPath();
    for (let k = sugar ? s : 0; k < 100; k++) { const sl = SLOT[LQ[k]], x = g.vx + sl.x + (RM ? 0 : Math.sin(t * 2.5 + k) * 0.7), y = g.vy + g.vh - sl.y - Math.cos(t * 2.2 + k) * (RM ? 0 : 0.6); ctx.moveTo(x + 3.6, y); ctx.arc(x, y, 3.6, 0, TAU); }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath();
    for (let k = sugar ? s : 0; k < 100; k++) { const sl = SLOT[LQ[k]], x = g.vx + sl.x, y = g.vy + g.vh - sl.y; ctx.moveTo(x - 1 + 0.9, y - 1.2); ctx.arc(x - 1, y - 1.2, 0.9, 0, TAU); }
    ctx.fill();
    if (sugar) for (let k = 0; k < s; k++) { const sl = SLOT[LQ[k]]; D.sphere(g.vx + sl.x, g.vy + g.vh - sl.y, 5.6, SUGC, { gloss: false, outline: 'rgba(255,255,255,.6)', outlineWidth: 1 }); }
    // 증기
    u.gas.forEach((p) => miniWater(g.vx + p.x, g.vy + p.y, p.ang, 0.8, p.fade));
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3.4; D.roundRect(g.vx, g.vy, g.vw, g.vh, 8); ctx.stroke();
    D.roundRect(g.vx - 4, g.vy - 9, g.vw + 8, 11, 5); ctx.fillStyle = '#94a3b8'; ctx.fill();
    // 배관과 마노미터
    const pipeY = g.mTop; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.vx + g.vw, pipeY); ctx.lineTo(g.ml, pipeY); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; const mx = (g.ml + g.mr) / 2;
    ctx.beginPath(); ctx.moveTo(g.ml - 7, g.mTop); ctx.lineTo(g.ml - 7, g.mBot); ctx.arc(mx, g.mBot, (g.mr - g.ml) / 2 + 7, Math.PI, 0, true); ctx.lineTo(g.mr + 7, g.mTop); ctx.stroke();
    const dh = clamp(u.Pd, 0, 27) * MMPX, yL = g.base + dh / 2, yR = g.base - dh / 2;
    ctx.fillStyle = '#9aa3b2'; ctx.fillRect(g.ml - 5, yL, 10, g.mBot - yL); ctx.fillRect(g.mr - 5, yR, 10, g.mBot - yR);
    ctx.beginPath(); ctx.arc(mx, g.mBot, (g.mr - g.ml) / 2 + 5, Math.PI, 0, true); ctx.arc(mx, g.mBot, (g.mr - g.ml) / 2 - 5, 0, Math.PI, false); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(g.ml - 3, yL, 2, 5); ctx.fillRect(g.mr - 3, yR, 2, 5);
    ctx.fillStyle = 'rgba(180,190,210,.35)'; ctx.fillRect(g.mr - 5, g.mTop, 10, yR - g.mTop);
    T(g.mr, g.mTop - 6, '진공', 12, MUTED, 'center', 700);
    if (dh > 6) { D.arrow(g.mr + 18, yL, g.mr + 18, yR, { color: BAD, width: 2.4, head: 8 }); }
    D.label((g.ml + g.mr) / 2 + 4, g.mTop - 32, fP(u.Pd) + ' mmHg', { size: 13, bg: '#0b3a7a', align: 'center', pad: 7 });
    T((g.ml + g.mr) / 2 + 6, g.mBot + 26, '마노미터', 12, INK, 'center', 800);
    // 이름
    T(g.ux + 14 + g.vw / 2 - 12, L.y + 70, sugar ? '🍬 설탕물 (설탕 ' + s + '개 / 100개)' : '💧 순수한 물', PHONE ? 13 : 14, sugar ? '#be185d' : '#0369a1', 'center', 800);
  }
  function drawCmp(t) {
    const L = RC.L;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 뚜껑을 닫은 용기 두 개 (공기는 뺐어요)', PHONE ? 13 : 14.5, INK, 'left', 800);
    drawUnit(0, t); drawUnit(1, t);
    // 비교 막대
    const by = L.y + 372, bw = L.w - 150, bx = L.x + 100;
    T(L.x + 16, by - 14, '증기압 비교 (같은 눈금, mmHg)', 13, MUTED, 'left', 800);
    [0, 1].forEach((i) => {
      const u = S.cmp.u[i], yy = by + i * 30, col = i ? '#be185d' : '#0369a1';
      T(L.x + 16, yy + 16, i ? '설탕물' : '순수한 물', 13.5, col, 'left', 800);
      D.roundRect(bx, yy + 2, bw, 18, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(bx, yy + 2, bw, 18, 8); ctx.clip(); ctx.fillStyle = i ? SUGC : '#38bdf8'; ctx.fillRect(bx, yy + 2, bw * clamp(u.Pd / 25, 0, 1), 18); ctx.restore();
      T(bx + bw + 8, yy + 16, fP(u.Pd), 13.5, INK, 'left', 800);
    });
    const both = cmpEq();
    const dP = +(dispP(0) - dispP(1)).toFixed(1);
    textBlock(L.x + 16, by + 76, L.w - 32, both ? (S.cmp.s === 0 ? '둘 다 순수한 물이라 같아요. 설탕을 넣어 보세요.' : '평형이 되었어요. 설탕물의 증기압이 ' + dP.toFixed(1) + ' mmHg 더 낮아요 (' + fP(dispP(0)) + ' → ' + fP(dispP(1)) + ').') : '증발과 응축이 같아질 때까지 기다려요. 마노미터의 수은 기둥이 일정해지면 평형이에요.', PHONE ? 13 : 13.5, both ? (S.cmp.s ? '#be185d' : MUTED) : MUTED, 19, 800);
  }
  function drawCmpInfo(t) {
    const R = RC.R, s = S.cmp.s;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '📋 읽어 보기', 14.5, INK, 'left', 800);
    const rows = [['25 °C 순수한 물', fP(P25) + ' mmHg', '#0369a1'], ['25 °C 설탕물', fP(dispP(1)) + ' mmHg', '#be185d'], ['증기압 내림 ΔP', (+(dispP(0) - dispP(1)).toFixed(1)).toFixed(1) + ' mmHg', BAD]];
    rows.forEach((r, i) => { const y = R.y + 56 + i * 30; T(R.x + 16, y, r[0], 13.5, r[2], 'left', 800); T(R.x + R.w - 16, y, r[1], 14.5, r[2], 'right', 800); });
    let y = R.y + 56 + 3 * 30 + 12;
    y += textBlock(R.x + 14, y, R.w - 28, '용질이 녹은 용액의 증기압은 같은 온도의 순수한 용매보다 낮아요.', 14, INK, 20, 800) + 10;
    y += textBlock(R.x + 14, y, R.w - 28, '설탕(자당)은 휘발하지 않는 용질이에요. 설탕이 더 많이 녹을수록(' + s + '개 → 더 많이) 증기압이 더 내려가는지 슬라이더로 확인해요.', 13.5, MUTED, 19, 700);
  }
  function stepUnitsRates() {}

  /* ================= ② 표면 모형: 증발 · 응축 ================= */
  const NS = 20, KE = 0.45, KC = 0.45;
  const SRANK = (function () { const out = []; let s = 5; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let k = 0; k < 4; k++) { const a = Array.from({ length: NS }, (_, i) => i); for (let i = NS - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } const rk = new Array(NS); a.forEach((c, i) => { rk[c] = i; }); out.push(rk); } return out; })();
  const isSugar = (row, c) => SRANK[row][c] < S.surf.j;
  const sfGeo = () => { const L = RC.L, w = L.w - 32; return { x: L.x + 16, y: L.y + 56, w, dx: w / NS, ys: L.y + (PHONE ? 270 : 282), rowH: 22, zoneH: PHONE ? 214 : 226 }; };
  const sfW = () => NS - S.surf.j;                 // 표면의 물 분자 수 (증발할 수 있는 자리)
  function surfRestart() { const u = S.surf.u; u.gas = []; u.evT = []; u.coT = []; u.evAcc = 0; u.coAcc = 0; u.eqT = 0; u.eq = false; S.surf.flash = []; updateCtl(); }
  function stepSurf(dt) {
    const sf = S.surf, u = sf.u, g = sfGeo();
    u.evAcc = (u.evAcc || 0) + KE * sfW() * dt;
    const live = () => u.gas.filter((p) => !p.ab).length;
    while (u.evAcc >= 1) {
      u.evAcc -= 1;
      const cs = []; for (let c = 0; c < NS; c++) if (!isSugar(0, c)) cs.push(c);
      if (cs.length) { const c = cs[Math.floor(Math.random() * cs.length)], x = g.x + g.dx * (c + 0.5), th = rnd(-2.2, -0.9), sp = rnd(34, 58); u.gas.push({ x, y: g.ys - 14, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, ab: false, ang: rnd(0, TAU), spin: rnd(-2, 2), fade: 0 }); u.evT.push(S.clk); sf.flash.push({ x, y: g.ys, t: 0, c: SKY, up: true }); }
    }
    u.coAcc = (u.coAcc || 0) + KC * live() * dt;
    while (u.coAcc >= 1) {
      u.coAcc -= 1;
      const cand = u.gas.filter((p) => !p.ab); if (cand.length) { cand.sort((a, b) => b.y - a.y); cand[Math.floor(Math.random() * Math.min(3, cand.length))].ab = true; u.coT.push(S.clk); }
    }
    const top = g.y + 12, bot = g.ys - 16;
    for (let k = u.gas.length - 1; k >= 0; k--) {
      const p = u.gas[k]; p.fade = Math.min(1, p.fade + dt * 6); p.ang += p.spin * dt;
      if (p.ab) { p.y += 150 * dt; p.vx = 0; if (p.y >= g.ys - 12) { sf.flash.push({ x: p.x, y: g.ys, t: 0, c: GOOD, up: false }); u.gas.splice(k, 1); } continue; }
      const sp = Math.hypot(p.vx, p.vy) || 1, want = 46; p.vx *= want / sp; p.vy *= want / sp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < g.x + 10) { p.x = g.x + 10; p.vx = Math.abs(p.vx); } else if (p.x > g.x + g.w - 10) { p.x = g.x + g.w - 10; p.vx = -Math.abs(p.vx); }
      if (p.y < top) { p.y = top; p.vy = Math.abs(p.vy); } else if (p.y > bot) { p.y = bot; p.vy = -Math.abs(p.vy); }
    }
    sf.flash.forEach((f) => { f.t += dt * 2.6; }); sf.flash = sf.flash.filter((f) => f.t < 1);
    u.evT = u.evT.filter((t0) => S.clk - t0 < 3); u.coT = u.coT.filter((t0) => S.clk - t0 < 3);
    const n = live(), ok = Math.abs(n - sfW()) <= 1 && u.evT.length > 0;
    u.eqT = ok ? u.eqT + dt : 0; const e2 = u.eqT > 1.5; if (e2 !== u.eq) { u.eq = e2; updateCtl(); }
    if (u.eq) { if (sf.j === 0) sf.seen.pure = true; if (sf.j >= 4) sf.seen.sugar = true; }
  }
  const sfRate = (arr) => arr.length / 3;
  function drawSurface(t) {
    const L = RC.L, sf = S.surf, g = sfGeo(), u = sf.u;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔍 액체 표면을 확대해서 봐요', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    // 영역
    D.roundRect(g.x, g.y, g.w, g.zoneH, 10); ctx.fillStyle = '#f5faff'; ctx.fill();
    const lh = g.rowH * 4 + 14, ly = g.ys - g.rowH / 2 - 4;
    ctx.save(); D.roundRect(g.x, ly, g.w, L.y + L.h - ly - 16, 10); ctx.clip();
    const lg = ctx.createLinearGradient(0, ly, 0, ly + lh + 30); lg.addColorStop(0, 'rgba(110,190,255,.45)'); lg.addColorStop(1, 'rgba(70,140,230,.6)'); ctx.fillStyle = lg; ctx.fillRect(g.x, ly, g.w, L.y + L.h - ly);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, ly); ctx.lineTo(g.x + g.w, ly); ctx.stroke();
    T(g.x + 10, g.y + 18, '증기 (기체)', 13, MUTED, 'left', 800);
    T(g.x + 10, ly + lh + 36, '액체', 13, '#1e5aa8', 'left', 800);
    // 액체 입자 (4줄), 표면 줄이 맨 위
    let firstSugar = null;
    for (let r = 0; r < 4; r++) for (let c = 0; c < NS; c++) {
      const x = g.x + g.dx * (c + 0.5) + (r % 2 ? g.dx * 0.12 : -g.dx * 0.06), y = g.ys + r * g.rowH + (RM ? 0 : Math.sin(t * 2 + c + r) * 0.8);
      if (isSugar(r, c)) { D.sphere(x, y, 11, SUGC, { gloss: true, shadow: r === 0 }); if (r === 0 && !firstSugar) firstSugar = [x, y]; }
      else D.sphere(x, y, 8.6, '#38bdf8', { gloss: r < 2 });
    }
    // 증기 분자
    u.gas.forEach((p) => miniWater(p.x, p.y, p.ang, 1.15, p.fade));
    // 사건 표시
    sf.flash.forEach((f) => { ctx.strokeStyle = C.rgba(f.c, 1 - f.t); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(f.x, g.ys - 4 - (f.up ? f.t * 10 : 0), 8 + f.t * 12, 0, TAU); ctx.stroke(); });
    if (firstSugar) { D.label(firstSugar[0], g.ys - 30, '설탕: 증발 안 해요', { size: 11.5, bg: '#be185d', align: 'center' }); }
    T(L.x + L.w / 2, L.y + L.h - 20, '표면의 ' + NS + '자리 중 물 분자 ' + sfW() + '개 · 설탕 ' + sf.j + '개 → X물 = ' + (sfW() / NS).toFixed(2), 13, INK, 'center', 800);
  }
  function drawSurfInfo(t) {
    const R = RC.R, sf = S.surf, u = sf.u, live = u.gas.filter((p) => !p.ab).length, W = sfW();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '⚖️ 증발 · 응축 속도 (개/초)', 14.5, INK, 'left', 800);
    const bx = R.x + 112, bw = R.w - 112 - 66;
    [['↑ 증발', sfRate(u.evT), SKY], ['↓ 응축', sfRate(u.coT), GOOD]].forEach(([lab, v, col], i) => {
      const y = R.y + 48 + i * 36;
      T(R.x + 14, y + 17, lab, 14, col, 'left', 800);
      D.roundRect(bx, y + 3, bw, 20, 9); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(bx, y + 3, bw, 20, 9); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(bx, y + 3, bw * clamp(v / 12, 0, 1), 20); ctx.restore();
      T(bx + bw + 8, y + 18, v.toFixed(1), 13.5, INK, 'left', 800);
    });
    const rows = [['표면의 물 분자 W', W + ' / ' + NS], ['증기 분자 수 n', String(live)], ['X물 = W / ' + NS, (W / NS).toFixed(2)]];
    rows.forEach((r, i) => { const y = R.y + 140 + i * 26; T(R.x + 14, y, r[0], 13.5, INK, 'left', 800); T(R.x + R.w - 14, y, r[1], 14, INK, 'right', 800); });
    const eqTxt = u.eq ? '평형: 증발 속도 = 응축 속도' : '평형 이전: 증기가 늘어나는 중';
    D.label(R.x + R.w / 2, R.y + 232, eqTxt, { size: 13, bg: u.eq ? GOOD : '#64748b', align: 'center' });
    let y = R.y + 262;
    y += textBlock(R.x + 14, y, R.w - 28, '증발 속도는 표면의 물 분자 수에 비례해요. 설탕이 자리를 차지하면 증발이 줄어요.', 13.5, INK, 19, 800) + 8;
    y += textBlock(R.x + 14, y, R.w - 28, '응축 속도는 증기 분자 수에 비례해요. 그래서 증기가 더 적은 곳에서 두 속도가 같아져요 = 증기압 내림.', 13.5, MUTED, 19, 700);
  }

  /* ================= ③ 몰 분율 관계 ================= */
  const XTARGET = [100, 98, 95, 90, 80];
  const lawP = (xw) => +(P25 * xw / 100).toFixed(1);              // 기록되는 증기압 (소수 첫째 자리)
  const lawCount = () => XTARGET.filter((x) => S.law.rec[x] != null).length;
  const lawSlope = () => { let sxy = 0, sxx = 0; XTARGET.forEach((x) => { const v = S.law.rec[x]; if (v != null) { sxy += x / 100 * v; sxx += (x / 100) * (x / 100); } }); return sxx ? sxy / sxx : 0; };
  function recPoint() {
    const l = S.law, x = l.xw;
    if (XTARGET.indexOf(x) < 0) { showHint('X물을 1.00, 0.98, 0.95, 0.90, 0.80 중 하나로 맞춘 뒤 기록해요.'); Sound.fail(); return; }
    if (l.rec[x] == null) { l.rec[x] = lawP(x); Sound.success(); const g = lawPlot(); parts.burst(g.X(x / 100), g.Y(l.rec[x]), { count: 10, speed: 110, life: 0.5, size: 3.5 }); l.pop = { x, t: 0 }; l.last = x; }
    updateCtl();
  }
  const lawPlot = () => {
    const L = RC.L, r = { x: L.x + 62, y: L.y + 84, w: L.w - 90, h: L.h - 170 };
    return { r, X: (v) => r.x + v * r.w, Y: (p) => r.y + r.h - p / 25 * r.h };
  };
  function drawLawGraph(t) {
    const L = RC.L, l = S.law, G = lawPlot(), r = G.r;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '📈 설탕물의 증기압 (25 °C)', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '점을 하나씩 기록하면 규칙이 보여요', 13, MUTED, 'left', 700);
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    [0, 5, 10, 15, 20, 25].forEach((p) => { ctx.beginPath(); ctx.moveTo(r.x, G.Y(p)); ctx.lineTo(r.x + r.w, G.Y(p)); ctx.stroke(); T(r.x - 8, G.Y(p) + 4, String(p), 12.5, MUTED, 'right', 700); });
    [0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach((x) => { ctx.beginPath(); ctx.moveTo(G.X(x), r.y); ctx.lineTo(G.X(x), r.y + r.h); ctx.stroke(); T(G.X(x), r.y + r.h + 17, x.toFixed(1), 12.5, MUTED, 'center', 700); });
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.h); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.stroke();
    T(r.x + r.w, r.y + r.h + 36, 'X물 (물의 몰 분율) →', 13, MUTED, 'right', 800); T(r.x - 6, r.y - 10, '증기압 (mmHg)', 12.5, MUTED, 'left', 800);
    // 직선 (점 5개를 모두 기록하면 나타나요)
    const n = lawCount();
    if (n === 5) {
      const sl = lawSlope(); const e = sm(l.lineT || 0);
      ctx.strokeStyle = BAD; ctx.lineWidth = 3; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(G.X(0), G.Y(0)); ctx.lineTo(G.X(e), G.Y(sl * e)); ctx.stroke(); ctx.setLineDash([]);
      if (e > 0.98) { D.label(G.X(0.42), G.Y(sl * 0.42) - 26, '원점을 지나는 직선 · 기울기 ' + sl.toFixed(1) + ' mmHg', { size: 12.5, bg: BAD, align: 'center' }); D.sphere(G.X(0), G.Y(0), 4.5, BAD, { gloss: false }); }
    }
    // 현재 슬라이더 위치
    const xw = l.xw / 100, pv = lawP(l.xw);
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(G.X(xw), r.y + r.h); ctx.lineTo(G.X(xw), G.Y(pv)); ctx.lineTo(r.x, G.Y(pv)); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(G.X(xw), G.Y(pv), 6, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.6 });
    D.label(clamp(G.X(xw) + 60, r.x + 70, r.x + r.w - 70), G.Y(pv) + 30, 'X물 ' + xw.toFixed(2) + ' → P ' + fP(pv), { size: 12.5, bg: '#475569', align: 'center' });
    // 기록한 점
    XTARGET.forEach((x) => { const v = l.rec[x]; if (v == null) return; const pop = l.pop && l.pop.x === x ? Math.max(0, 1 - l.pop.t * 2.2) : 0; D.sphere(G.X(x / 100), G.Y(v), 7 + pop * 4, SUGC, { gloss: true, outline: '#fff', shadow: true }); if (l.last === x) T(G.X(x / 100) - 12, G.Y(v) + 18, fP(v), 12.5, INK, 'right', 800, HALO); });
    T(L.x + L.w / 2, L.y + L.h - 14, '기록한 점 ' + n + ' / 5', 13, n === 5 ? GOOD : MUTED, 'center', 800);
  }
  function drawLawTable(t) {
    const R = RC.R, l = S.law;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '📋 기록표 (25 °C)', 14.5, INK, 'left', 800);
    const cx = [R.x + 14, R.x + 82, R.x + 150, R.x + 224], hy = R.y + 56;
    ['X물', 'P (mmHg)', 'ΔP = P° − P', 'X설탕 × P°'].forEach((h, i) => T(cx[i] + (i ? 0 : 0), hy, h, 11.5, MUTED, 'left', 800));
    ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(R.x + 12, hy + 8); ctx.lineTo(R.x + R.w - 12, hy + 8); ctx.stroke();
    XTARGET.forEach((x, i) => {
      const y = hy + 30 + i * 28, v = l.rec[x], has = v != null;
      T(cx[0], y, (x / 100).toFixed(2), 14, has ? INK : '#9aa6bb', 'left', 800);
      T(cx[1], y, has ? fP(v) : '—', 14, has ? '#be185d' : '#9aa6bb', 'left', 800);
      T(cx[2], y, has ? (P25 - v).toFixed(1) : '—', 14, has ? BAD : '#9aa6bb', 'left', 800);
      T(cx[3], y, has ? (+((1 - x / 100) * P25).toFixed(1)).toFixed(1) : '—', 14, has ? INK : '#9aa6bb', 'left', 800);
    });
    let y = hy + 30 + 5 * 28 + 10;
    if (lawCount() === 5) {
      D.roundRect(R.x + 12, y - 6, R.w - 24, PHONE ? 96 : 126, 10); ctx.fillStyle = 'rgba(20,160,88,.09)'; ctx.fill(); ctx.strokeStyle = GOOD; ctx.lineWidth = 1.8; ctx.stroke();
      T(R.x + 24, y + 16, '기울기 = ' + lawSlope().toFixed(1) + ' mmHg = P°', 12.5, '#0f6b3c', 'left', 800);
      T(R.x + 24, y + 42, 'P = X물 · P°', 18, INK, 'left', 800);
      T(R.x + 24, y + 70, 'ΔP = P° − P = X설탕 · P°', 15.5, BAD, 'left', 800);
      if (!PHONE) textBlock(R.x + 24, y + 94, R.w - 48, '증기압 내림은 용질의 몰 분율에 비례해요. 용질의 종류와는 관계없어요.', 12.5, MUTED, 17, 700);
    } else textBlock(R.x + 14, y + 6, R.w - 28, 'X물이 줄어들수록 증기압이 일정하게 줄어드는 것 같아요. 5개를 모두 기록하면 식이 보여요.', 13.5, MUTED, 19, 700);
  }
  function drawLawCalc(t) {
    const L = RC.L, l = S.law;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧮 라울 법칙으로 계산해요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 48, 'P = X용매 · P°   (P° = 순수한 용매의 증기압)', 13.5, MUTED, 'left', 800);
    const cards = [
      { t: '① 100 °C, X설탕 = 0.05인 수용액', a: 'P° = 760 mmHg (100 °C)', b: 'X물 = 1 − 0.05 = 0.95', c: 'P = 0.95 × 760 = 722 mmHg' },
      { t: '② 설탕 1 mol + 물 9 mol, 25 °C', a: 'P° = 23.8 mmHg (25 °C)', b: 'X물 = 9 / (1 + 9) = 0.90', c: 'P = 0.90 × 23.8 = 21.4 mmHg' },
    ];
    cards.forEach((cd, i) => {
      const y = L.y + 66 + i * (PHONE ? 196 : 206), done = l.ok[i];
      D.roundRect(L.x + 14, y, L.w - 28, PHONE ? 186 : 196, 12); ctx.fillStyle = done ? 'rgba(20,160,88,.08)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = done ? GOOD : '#dbe3f3'; ctx.lineWidth = done ? 2.2 : 1.4; ctx.stroke();
      T(L.x + 28, y + 28, cd.t, 15, INK, 'left', 800);
      if (done) { [cd.a, cd.b, cd.c].forEach((s, k) => T(L.x + 28, y + 62 + k * 30, s, 14.5, k === 2 ? GOOD : INK, 'left', 800)); T(L.x + L.w - 28, y + 28, '✅ 정답', 13.5, GOOD, 'right', 800); }
      else { T(L.x + 28, y + 62, '구하는 값: 이 용액의 증기압 P (mmHg)', 14, MUTED, 'left', 800); T(L.x + 28, y + 92, '① X물 구하기  ② P° 찾기  ③ P = X물 · P°', 13.5, MUTED, 'left', 700); T(L.x + 28, y + 128, '답을 오른쪽 입력칸에 소수로 적어요', 13.5, '#7c3aed', 'left', 800); }
    });
  }
  function stepLaw(dt) { const l = S.law; if (l.pop) { l.pop.t += dt; if (l.pop.t > 0.6) l.pop = null; } l.lineT = ap(l.lineT || 0, lawCount() === 5 ? 1 : 0, dt, 2.4); if (lawCount() === 5 && l.lineT > 0.995) l.lineT = 1; }

  /* ================= ④ 곡선 이동 ================= */
  const CRNG = { boil: { x0: 98, x1: 103, y0: 690, y1: 850, step: 0.05 }, freeze: { x0: -6, x1: 1, y0: 2.0, y1: 5.0, step: 0.05 } };
  const crPlot = () => { const L = RC.L, r = { x: L.x + 66, y: L.y + 80, w: L.w - 90, h: L.h - 156 }, g = CRNG[S.sub.curve]; return { r, g, X: (v) => r.x + (v - g.x0) / (g.x1 - g.x0) * r.w, Y: (p) => r.y + r.h - (p - g.y0) / (g.y1 - g.y0) * r.h }; };
  const curT = () => (S.sub.curve === 'boil' ? S.cur.cB : S.cur.cF);
  const Tw0 = () => Tboil(0), Tf0 = 0;
  const Tsol = () => (S.sub.curve === 'boil' ? Tboil(S.cur.m) : Tfreeze(S.cur.m));
  const Twat = () => (S.sub.curve === 'boil' ? Tw0() : Tf0);
  function setCur(v) {
    const g = CRNG[S.sub.curve]; v = clamp(Math.round(v / g.step) * g.step, g.x0, g.x1);
    if (S.sub.curve === 'boil') S.cur.cB = +v.toFixed(2); else S.cur.cF = +v.toFixed(2);
    updateCtl();
  }
  function stepCurve(dt) {
    const c = S.cur;
    if (S.mode !== 'curve') return;
    if (S.sub.curve === 'boil') { if (Math.abs(c.cB - Tw0()) <= 0.12) c.fB.water = true; if (c.m >= 0.25 && Math.abs(c.cB - Tboil(c.m)) <= 0.12) c.fB.sol = c.m; }
    else { if (Math.abs(c.cF - Tf0) <= 0.12) c.fF.water = true; if (c.m >= 0.25 && Math.abs(c.cF - Tfreeze(c.m)) <= 0.12) c.fF.sol = c.m; }
  }
  const T2 = (v) => v.toFixed(2).replace('-', '−');
  const T1 = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('-', '−');
  function drawCurve(t) {
    const L = RC.L, G = crPlot(), r = G.r, g = G.g, c = S.cur, boil = S.sub.curve === 'boil';
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, boil ? '🔥 외부 압력 760 mmHg에서의 끓는점 (🔍 확대)' : '🧊 얼음의 증기압과 만나는 온도 = 어는점 (🔍 확대)', PHONE ? 12.5 : 14.5, INK, 'left', 800);
    T(L.x + 14, L.y + 46, boil ? '곡선이 점선(760 mmHg)과 만나는 온도를 찾아요' : '용액의 곡선이 얼음의 곡선과 만나는 온도를 찾아요', 12.5, MUTED, 'left', 700);
    ctx.fillStyle = '#fbfdff'; D.roundRect(r.x, r.y, r.w, r.h, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    const pstep = boil ? 40 : 0.5;
    for (let p = Math.ceil(g.y0 / pstep) * pstep; p <= g.y1 + 1e-6; p += pstep) { ctx.beginPath(); ctx.moveTo(r.x, G.Y(p)); ctx.lineTo(r.x + r.w, G.Y(p)); ctx.stroke(); T(r.x - 8, G.Y(p) + 4, boil ? String(Math.round(p)) : p.toFixed(1), 12, MUTED, 'right', 700); }
    for (let x = Math.ceil(g.x0); x <= g.x1 + 1e-6; x += 1) { ctx.beginPath(); ctx.moveTo(G.X(x), r.y); ctx.lineTo(G.X(x), r.y + r.h); ctx.stroke(); T(G.X(x), r.y + r.h + 17, String(x).replace('-', '−'), 12.5, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.h); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.stroke();
    T(r.x + r.w, r.y + r.h + 36, '온도 (°C) →', 13, MUTED, 'right', 800); T(r.x - 6, r.y - 10, '증기압 (mmHg)', 12.5, MUTED, 'left', 800);
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    const curve = (f, col, w, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); for (let i = 0; i <= 120; i++) { const x = g.x0 + (g.x1 - g.x0) * i / 120, y = f(x); if (i) ctx.lineTo(G.X(x), G.Y(y)); else ctx.moveTo(G.X(x), G.Y(y)); } ctx.stroke(); ctx.setLineDash([]); };
    if (boil) {
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(r.x, G.Y(ATM)); ctx.lineTo(r.x + r.w, G.Y(ATM)); ctx.stroke(); ctx.setLineDash([]);
      curve((x) => Pw(x), '#0ea5e9', 3.4);
      if (c.m > 0) curve((x) => Psol(x, c.m), SUGC, 3.4);
      // 교점
      const tw = Tw0(), ts = Tboil(c.m);
      [[tw, '#0ea5e9'], [ts, SUGC]].forEach(([tt, col], i) => { if (i && c.m <= 0) return; ctx.strokeStyle = C.rgba(col, 0.9); ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(G.X(tt), G.Y(ATM)); ctx.lineTo(G.X(tt), r.y + r.h); ctx.stroke(); ctx.setLineDash([]); D.sphere(G.X(tt), G.Y(ATM), 6.5, col, { gloss: true, outline: '#fff' }); });
    } else {
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, G.X(0) - r.x, r.h); ctx.clip(); curve((x) => Pice(x), '#64748b', 3.2); ctx.restore();
      curve((x) => Pliq(x), '#0ea5e9', 3.4);
      if (c.m > 0) curve((x) => PsolF(x, c.m), SUGC, 3.4);
      const ts = Tfreeze(c.m);
      [[Tf0, '#0ea5e9'], [ts, SUGC]].forEach(([tt, col], i) => { if (i && c.m <= 0) return; const yy = i ? PsolF(tt, c.m) : Pliq(tt); ctx.strokeStyle = C.rgba(col, 0.9); ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(G.X(tt), G.Y(yy)); ctx.lineTo(G.X(tt), r.y + r.h); ctx.stroke(); ctx.setLineDash([]); D.sphere(G.X(tt), G.Y(yy), 6.5, col, { gloss: true, outline: '#fff' }); });
    }
    // 눈금 (커서)
    const ct = curT(); ctx.strokeStyle = PUR; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(G.X(ct), r.y); ctx.lineTo(G.X(ct), r.y + r.h); ctx.stroke();
    const pw = boil ? Pw(ct) : Pliq(ct), ps = boil ? Psol(ct, c.m) : PsolF(ct, c.m), pi = Pice(ct);
    D.sphere(G.X(ct), G.Y(pw), 5.5, '#0ea5e9', { gloss: false, outline: '#fff' }); if (c.m > 0) D.sphere(G.X(ct), G.Y(ps), 5.5, SUGC, { gloss: false, outline: '#fff' }); if (!boil) D.sphere(G.X(ct), G.Y(pi), 5.5, '#64748b', { gloss: false, outline: '#fff' });
    ctx.restore();
    // 라벨
    if (boil) {
      T(r.x + r.w - 6, G.Y(ATM) - 8, '760 mmHg (1 atm)', 12.5, '#475569', 'right', 800);
      T(G.X(102.9), G.Y(Pw(102.9)) - 12, '물', 13.5, '#0369a1', 'right', 800, HALO);
      if (c.m > 0) T(G.X(102.9), G.Y(Psol(102.9, c.m)) + 24, '설탕물', 13.5, '#be185d', 'right', 800, HALO);
      const tw = Tw0(), ts = Tboil(c.m);
      D.label(G.X(tw), r.y + r.h - 16, '물 ' + T1(tw) + ' °C', { size: 12, bg: '#0ea5e9', align: 'center' });
      if (c.m > 0) D.label(clamp(G.X(ts) + (ts - tw < 0.45 ? 34 : 0), r.x + 50, r.x + r.w - 60), r.y + r.h - 42, '설탕물 ' + T1(ts) + ' °C', { size: 12, bg: '#db2777', align: 'center' });
    } else {
      T(G.X(-5.9), G.Y(Pice(-5.9)) + 22, '얼음', 13.5, '#475569', 'left', 800, HALO); T(G.X(-5.9), G.Y(Pliq(-5.9)) - 12, '물(액체)', 13.5, '#0369a1', 'left', 800, HALO);
      if (c.m > 0) T(G.X(0.95), G.Y(PsolF(0.95, c.m)) + 24, '설탕물', 13.5, '#be185d', 'right', 800, HALO);
      const ts = Tfreeze(c.m);
      D.label(G.X(Tf0) + 6, r.y + r.h - 16, '물 0 °C', { size: 12, bg: '#0ea5e9', align: 'left' });
      if (c.m > 0) D.label(G.X(ts), r.y + r.h - 42, '설탕물 ' + T1(ts) + ' °C', { size: 12, bg: '#db2777', align: 'center' });
    }
  }
  function drawCurveInfo(t) {
    const R = RC.R, c = S.cur, boil = S.sub.curve === 'boil', ct = curT();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, boil ? '🗺️ 전체 곡선 속의 위치 (mmHg)' : '🧪 눈금에서 읽은 값', 14.5, INK, 'left', 800);
    let y = R.y + (boil ? 40 : 60);
    if (boil) {
      // 전체 그림 (0 ~ 120 °C) 과 확대한 부분
      const ix = R.x + 40, iy = y + 8, iw = R.w - 58, ih = PHONE ? 110 : 120;
      D.roundRect(ix, iy, iw, ih, 6); ctx.fillStyle = '#fbfdff'; ctx.fill(); ctx.strokeStyle = '#cfd8e8'; ctx.lineWidth = 1.2; ctx.stroke();
      const X = (v) => ix + v / 120 * iw, Y = (p) => iy + ih - p / 1600 * ih;
      ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.4; ctx.beginPath(); for (let i = 0; i <= 60; i++) { const x = i * 2; i ? ctx.lineTo(X(x), Y(Pw(x))) : ctx.moveTo(X(x), Y(Pw(x))); } ctx.stroke();
      if (c.m > 0) { ctx.strokeStyle = SUGC; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 60; i++) { const x = i * 2; i ? ctx.lineTo(X(x), Y(Psol(x, c.m))) : ctx.moveTo(X(x), Y(Psol(x, c.m))); } ctx.stroke(); }
      ctx.strokeStyle = BAD; ctx.lineWidth = 2; D.roundRect(X(98) - 4, Y(850) - 3, X(103) - X(98) + 8, Y(690) - Y(850) + 6, 3); ctx.stroke();
      T(X(98) - 6, Y(850) - 8, '확대한 부분', 11.5, BAD, 'right', 800);
      T(ix - 4, iy + 10, '1600', 10.5, MUTED, 'right', 700); T(ix - 4, iy + ih, '0', 10.5, MUTED, 'right', 700);
      T(ix, iy + ih + 14, '0', 10.5, MUTED, 'left', 700); T(ix + iw, iy + ih + 14, '120 °C', 10.5, MUTED, 'right', 700);
      y = iy + ih + 34;
    }
    const pw = boil ? Pw(ct) : Pliq(ct), ps = boil ? Psol(ct, c.m) : PsolF(ct, c.m);
    const rows = boil ? [['눈금 온도', T2(ct) + ' °C', INK], ['물의 증기압', fP(pw) + ' mmHg', '#0369a1'], ['설탕물의 증기압', fP(ps) + ' mmHg', '#be185d'], ['차이 ΔP', (+(+fP(pw) - +fP(ps)).toFixed(1)).toFixed(1) + ' mmHg', BAD]]
      : [['눈금 온도', T2(ct) + ' °C', INK], ['얼음의 증기압', Pice(ct).toFixed(2) + ' mmHg', '#475569'], ['물(액체)의 증기압', pw.toFixed(2) + ' mmHg', '#0369a1'], ['설탕물의 증기압', ps.toFixed(2) + ' mmHg', '#be185d']];
    rows.forEach((r, i) => { T(R.x + 14, y + i * 24, r[0], 13, r[2], 'left', 800); T(R.x + R.w - 14, y + i * 24, r[1], 13.5, r[2], 'right', 800); });
    y += rows.length * 24 + 8;
    if (boil) {
      const tw = +T1(Tw0()).replace('−', '-'), ts = +T1(Tboil(c.m)).replace('−', '-');
      textBlock(R.x + 14, y, R.w - 28, c.m > 0 ? '설탕물의 곡선이 아래에 있어서 760 mmHg에 닿으려면 더 높은 온도가 필요해요. 끓는점이 ' + (+(ts - tw).toFixed(1)).toFixed(1) + ' °C 올라요. (정량은 다음 차시)' : '몰랄 농도를 올려 보세요. 설탕을 녹이면 곡선이 아래로 내려가요.', 13, INK, 18, 800);
    } else {
      const ts = Tfreeze(c.m);
      textBlock(R.x + 14, y, R.w - 28, c.m > 0 ? '설탕물의 증기압 곡선이 아래로 내려가면 얼음의 곡선과 더 낮은 온도(약 ' + T1(ts) + ' °C)에서 만나요. 어는점이 내려가요. (정량은 다음 차시)' : '몰랄 농도를 올려 보세요. 순수한 물은 0 °C에서 얼음과 만나요.', 13, INK, 18, 800);
    }
  }

  /* ================= 컨트롤 · 공통 ================= */
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => {
      const toks = n.getAttribute('data-show').split(' ');
      n.hidden = !toks.some((tk) => { const [m, v] = tk.split(':'); return m === S.mode && (v == null || S.sub[m] === v); });
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#lawSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.law));
    $$('#crSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.curve));
    const s = S.cmp.s; $('#oSug').textContent = s + '개 (' + (s / 100).toFixed(2) + ')'; $('#sSug').value = s; $('#sugMinus').disabled = s <= 0; $('#sugPlus').disabled = s >= 20;
    const j = S.surf.j; $('#oJ').textContent = j + '개 (' + (j * 5) + ' %)'; $('#sJ').value = j; $('#jMinus').disabled = j <= 0; $('#jPlus').disabled = j >= 8;
    const l = S.law; $('#oXw').textContent = (l.xw / 100).toFixed(2); $('#sXw').value = l.xw; $('#xwMinus').disabled = l.xw <= 80; $('#xwPlus').disabled = l.xw >= 100;
    $('#bRec').disabled = XTARGET.indexOf(l.xw) < 0 || l.rec[l.xw] != null; $('#bRec').textContent = l.rec[l.xw] != null ? '✅ 기록했어요' : '📝 이 점 기록하기';
    const c = S.cur, g = CRNG[S.sub.curve], cv = curT();
    $('#oMc').textContent = c.m.toFixed(2) + ' m'; $('#sMc').value = c.m; $('#mcMinus').disabled = c.m <= 0; $('#mcPlus').disabled = c.m >= 3;
    const sc = $('#sCu'); if (sc.min !== String(g.x0)) { sc.min = g.x0; sc.max = g.x1; }
    sc.value = cv; $('#oCu').textContent = cv.toFixed(2).replace('-', '−') + ' °C'; $('#cuMinus').disabled = cv <= g.x0 + 1e-9; $('#cuPlus').disabled = cv >= g.x1 - 1e-9;
    [$('#q1'), $('#q2')].forEach((inp, k) => { const v = S.law.q[k]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', S.law.ok[k] && v !== ''); if (!inp.classList.contains('ok')) inp.classList.remove('bad'); });
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  function setSub(m, v) { S.sub[m] = v; updateCtl(); }
  const setS = (v) => { S.cmp.s = clamp(Math.round(v), 0, 20); updateCtl(); };
  const setJ = (v) => { S.surf.j = clamp(Math.round(v), 0, 8); updateCtl(); };
  const setXw = (v) => { S.law.xw = clamp(Math.round(v), 80, 100); updateCtl(); };
  const setM = (v) => { S.cur.m = clamp(Math.round(v * 4) / 4, 0, 3); updateCtl(); };
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#lawSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('law', b.dataset.v); }));
  $$('#crSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('curve', b.dataset.v); }));
  $('#sSug').addEventListener('input', (e) => setS(+e.target.value));
  $('#sugMinus').addEventListener('click', () => { Sound.tick(); setS(S.cmp.s - 1); });
  $('#sugPlus').addEventListener('click', () => { Sound.tick(); setS(S.cmp.s + 1); });
  $('#bRestart1').addEventListener('click', () => { Sound.click(); cmpRestart(); });
  $('#sJ').addEventListener('input', (e) => setJ(+e.target.value));
  $('#jMinus').addEventListener('click', () => { Sound.tick(); setJ(S.surf.j - 1); });
  $('#jPlus').addEventListener('click', () => { Sound.tick(); setJ(S.surf.j + 1); });
  $('#bRestart2').addEventListener('click', () => { Sound.click(); surfRestart(); });
  $('#sXw').addEventListener('input', (e) => setXw(+e.target.value));
  $('#xwMinus').addEventListener('click', () => { Sound.tick(); setXw(S.law.xw - 1); });
  $('#xwPlus').addEventListener('click', () => { Sound.tick(); setXw(S.law.xw + 1); });
  $('#bRec').addEventListener('click', () => { Sound.click(); recPoint(); });
  $('#sMc').addEventListener('input', (e) => setM(+e.target.value));
  $('#mcMinus').addEventListener('click', () => { Sound.tick(); setM(S.cur.m - 0.25); });
  $('#mcPlus').addEventListener('click', () => { Sound.tick(); setM(S.cur.m + 0.25); });
  $('#sCu').addEventListener('input', (e) => setCur(+e.target.value));
  $('#cuMinus').addEventListener('click', () => { Sound.tick(); setCur(curT() - CRNG[S.sub.curve].step * 2); });
  $('#cuPlus').addEventListener('click', () => { Sound.tick(); setCur(curT() + CRNG[S.sub.curve].step * 2); });
  const QANS = [{ v: 0.95 * ATM, tol: 1.5 }, { v: 0.9 * P25, tol: 0.15 }];
  [$('#q1'), $('#q2')].forEach((inp, k) => {
    inp.addEventListener('input', () => { S.law.q[k] = inp.value; const was = S.law.ok[k]; S.law.ok[k] = near(parseNum(inp.value), QANS[k].v, QANS[k].tol); inp.classList.remove('bad'); inp.classList.toggle('ok', S.law.ok[k]); if (S.law.ok[k] && !was) { Sound.tick(); updateCtl(); } });
    inp.addEventListener('change', () => { if (inp.value !== '' && !S.law.ok[k]) { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); } });
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'cmp') { S.cmp.s = 5; cmpRestart(); }
    else if (S.mode === 'surf') { S.surf.j = 0; surfRestart(); }
    else if (S.mode === 'law') { S.law.xw = 100; if (S.sub.law === 'rec') S.law.rec = {}; else { S.law.q = ['', '']; S.law.ok = [false, false]; } }
    else { S.cur.m = 1; if (S.sub.curve === 'boil') { S.cur.cB = 100; S.cur.fB = {}; } else { S.cur.cF = -1; S.cur.fF = {}; } }
    updateCtl();
  });

  /* ================= 포인터 ================= */
  function dragCur(p) { const G = crPlot(), g = G.g; setCur(g.x0 + (clamp(p.x, G.r.x, G.r.x + G.r.w) - G.r.x) / G.r.w * (g.x1 - g.x0)); }
  let dragging = false;
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'curve') { const G = crPlot(); if (inRect(p, { x: G.r.x - 10, y: G.r.y - 10, w: G.r.w + 20, h: G.r.h + 30 })) { dragging = true; dragCur(p); return true; } } return false; },
    move(p) { if (dragging) dragCur(p); },
    up() { dragging = false; },
    hover(p) { if (S.mode === 'curve') { const G = crPlot(); return inRect(p, G.r) ? 'ew-resize' : null; } return null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'cmp') { L1 = '순수한 물'; a = fP(S.cmp.u[0].Pd) + ' mmHg' + (S.cmp.u[0].eq ? ' (평형)' : ''); L2 = '설탕물'; b = fP(S.cmp.u[1].Pd) + ' mmHg' + (S.cmp.u[1].eq ? ' (평형)' : ''); L3 = '증기압 내림 ΔP'; c = (S.cmp.u[0].Pd - S.cmp.u[1].Pd).toFixed(1) + ' mmHg'; }
    else if (S.mode === 'surf') { const u = S.surf.u; L1 = '↑ 증발 속도'; a = sfRate(u.evT).toFixed(1) + ' 개/초'; L2 = '↓ 응축 속도'; b = sfRate(u.coT).toFixed(1) + ' 개/초'; L3 = '증기 분자 수'; c = u.gas.filter((p) => !p.ab).length + '개' + (u.eq ? ' (평형)' : ''); }
    else if (S.mode === 'law') { const x = S.law.xw / 100; L1 = 'X물 (X설탕)'; a = x.toFixed(2) + ' (' + (1 - x).toFixed(2) + ')'; L2 = 'P = X물 · 23.8'; b = fP(lawP(S.law.xw)) + ' mmHg'; L3 = '기록한 점'; c = lawCount() + ' / 5'; }
    else {
      const cu = S.cur, boil = S.sub.curve === 'boil', ct = curT(); L1 = '눈금 온도'; a = T2(ct) + ' °C'; L2 = boil ? '물 · 설탕물 증기압' : '얼음 · 설탕물 증기압';
      b = boil ? fP(Pw(ct)) + ' · ' + fP(Psol(ct, cu.m)) + ' mmHg' : Pice(ct).toFixed(2) + ' · ' + PsolF(ct, cu.m).toFixed(2) + ' mmHg';
      L3 = '찾은 교점'; c = (boil ? (cu.fB.water ? 1 : 0) + (cu.fB.sol ? 1 : 0) : (cu.fF.water ? 1 : 0) + (cu.fF.sol ? 1 : 0)) + ' / 2';
    }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const boilOK = () => S.cur.m === 1 && S.cur.fB.water && S.cur.fB.sol === 1;
  const freezeOK = () => S.cur.m === 1 && S.cur.fF.water && S.cur.fF.sol === 1;
  const levels = [
    {
      title: '증기압 비교: 순수한 물과 설탕물', short: '증기압 비교', icon: '🧪', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 소금이나 설탕을 녹인 물은 순수한 물보다 왜 천천히 마를까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(증기압과 끓는점)와 중학교에서</b> 밀폐 용기에서 증발과 응축이 같아진 동적 평형의 압력이 증기압이라는 것을 배웠어요. 이번에는 설탕처럼 <b>증발하지 않는 용질</b>이 녹으면 증기압이 어떻게 달라지는지 비교해요.</div>' +
        '<p>25 °C 항온 수조 속 밀폐 용기 두 개에 <b>순수한 물</b>과 <b>설탕물</b>이 있어요. 평형에 이르면 마노미터의 수은 기둥 높이 차로 증기압을 읽어요. 설탕의 양을 바꾸며 변화의 방향을 확인해요.</p>',
      features: ['cmp'],
      setup() { S.lock = false; setMode('cmp'); },
      recap: '비휘발성 용질이 녹은 용액의 증기압은 같은 온도의 순수한 용매보다 낮아요. 용질이 많을수록 더 낮아져요.',
      summary: '<ul><li>25 °C 순수한 물의 증기압: <b>23.8 mmHg</b>. 설탕을 녹이면 같은 온도에서도 증기압이 <b>더 낮아져요</b>(물 입자 100개 중 설탕 5개: 22.6 mmHg).</li><li>설탕이 많을수록 증기압 내림이 커요(설탕 10개: 21.4, 20개: 19.0 mmHg).</li><li>이것을 <b>증기압 내림</b>이라고 해요. 소금이나 설탕물이 순수한 물보다 천천히 마르는 까닭이에요.</li></ul>',
      missions: [
        {
          title: '평형까지 기다리기',
          goal: '25 °C에서 순수한 물과 설탕물(설탕 5개 / 100개)이 모두 <b>동적 평형</b>에 이르게 하고, 두 마노미터의 값을 비교해요. (약 7초)',
          hint: '용기 속 증기 분자가 늘다가 일정해지고, 마노미터의 수은 높이 차가 더 이상 변하지 않으면 평형이에요. 설탕물 쪽 값이 더 작은지 읽어요.',
          setup() { S.lock = true; S.cmp.s = 5; cmpRestart(); setMode('cmp'); },
          check: () => S.cmp.s === 5 && cmpEq(), hold: 0.6,
          status: () => '순수한 물 ' + mark(S.cmp.u[0].eq) + ' ' + fP(S.cmp.u[0].Pd) + ' &nbsp; 설탕물 ' + mark(S.cmp.u[1].eq) + ' ' + fP(S.cmp.u[1].Pd) + ' mmHg',
          explain: '평형에서 순수한 물은 <b>23.8 mmHg</b>, 설탕물(물 입자 100개 중 설탕 5개)은 <b>22.6 mmHg</b>예요. 같은 25 °C인데 설탕물의 증기압이 <b>1.2 mmHg 더 낮아요</b>. 설탕이 녹으면 증기압이 내려가요.',
        },
        {
          title: '설탕을 더 넣어 보기',
          goal: '설탕 입자를 <b>10개 이상</b>으로 늘리고 다시 평형에 이르러, 증기압이 더 낮아지는지 확인해요.',
          hint: '설탕 슬라이더를 10개 이상으로 옮기고 잠시 기다려요. 두 마노미터가 모두 일정해지면 평형이에요.',
          setup() { S.lock = true; S.cmp.s = 5; setMode('cmp'); },
          check: () => S.cmp.s >= 10 && cmpEq(), hold: 0.6,
          status: () => '설탕 ' + S.cmp.s + '개 ' + mark(S.cmp.s >= 10) + ' &nbsp; 평형 ' + mark(cmpEq()) + ' &nbsp; 설탕물 ' + fP(S.cmp.u[1].Pd) + ' mmHg',
          explain: '설탕이 10개이면 증기압은 <b>21.4 mmHg</b>, 20개이면 <b>19.0 mmHg</b>로 설탕이 많을수록 증기압이 더 낮아져요.',
        },
        {
          type: 'quiz', title: '증기압이 더 낮은 쪽',
          goal: '같은 온도에서 순수한 물과 설탕물 중 증기압이 더 낮은 쪽은?',
          setup() { S.lock = true; setMode('cmp'); },
          choices: ['순수한 물', '설탕을 녹인 물(용액)', '두 용기가 같아요', '용기의 크기에 따라 달라요'],
          answer: 1,
          feedback: ['순수한 물의 증기압이 더 커요. 설탕이 녹으면 증기압이 내려가요.', '', '마노미터의 값이 달라요. 설탕이 녹으면 증기압이 낮아져요.', '증기압은 용기의 크기가 아니라 온도와 용액의 조성으로 정해져요.'],
          explain: '비휘발성 용질이 녹은 용액의 증기압은 같은 온도의 순수한 용매보다 <b>낮아요</b>. 용기의 크기와는 관계가 없어요.',
        },
      ],
    },
    {
      title: '표면 모형: 증발이 줄어드는 까닭', short: '표면 모형', icon: '🔬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 설탕물의 증기압이 순수한 물보다 낮다는 것을 보았어요. 그 까닭을 액체 <b>표면의 입자</b> 수준에서 살펴봐요.</div>' +
        '<p>증발은 표면의 물 분자가 떨어져 나가는 일이고, 응축은 증기 분자가 액체로 돌아오는 일이에요. 설탕 분자는 <b>증발하지 않고(비휘발성)</b> 표면의 자리를 차지해요. 설탕의 비율을 바꾸며 평형이 어떻게 달라지는지 봐요.</p>',
      features: ['surf'],
      setup() { S.lock = false; setMode('surf'); },
      recap: '표면의 물 분자가 줄면 증발 속도가 줄어요. 응축 속도는 증기 분자 수에 비례하므로, 두 속도가 같아지는 증기 분자 수가 줄어요. 이것이 증기압 내림이에요.',
      summary: '<ul><li><b>증발 속도</b>는 표면에 있는 <b>물 분자의 수</b>(= X<sub>물</sub>)에 비례해요. 설탕(비휘발성)은 증발하지 않고 표면 자리만 차지해요.</li><li><b>응축 속도</b>는 증기 분자 수(증기압)에 비례해요.</li><li>평형: 증발 속도 = 응축 속도. 설탕이 있으면 증발이 줄어서 더 <b>적은 증기 분자</b>에서 평형이 되므로 증기압이 낮아져요.</li><li>예: 표면의 20자리 중 물이 20개 → 증발 9.0개/초, 물이 16개(설탕 20 %) → 7.2개/초 (모형의 값).</li></ul>',
      missions: [
        {
          title: '표면 비율을 바꾸며 증발 속도 읽기',
          goal: '표면의 설탕이 <b>0개</b>일 때와 <b>4개 이상(20 % 이상)</b>일 때 각각 평형에 이르게 하고, 평형에서의 증발 속도를 읽어요. (평형까지 약 8초)',
          hint: '평형이 되면 ↑ 증발과 ↓ 응축 막대가 같아져요. 설탕 0개에서 평형을 본 뒤 슬라이더를 4개 이상으로 옮겨 다시 기다려요.',
          setup() { S.lock = true; S.surf.j = 0; S.surf.seen = {}; surfRestart(); setMode('surf'); },
          check: () => !!(S.surf.seen.pure && S.surf.seen.sugar), hold: 0.4,
          status: () => '설탕 없음 평형 ' + mark(S.surf.seen.pure) + ' &nbsp; 설탕 4개 이상 평형 ' + mark(S.surf.seen.sugar) + ' &nbsp; 증발 ' + sfRate(S.surf.u.evT).toFixed(1) + '개/초',
          explain: '설탕이 없을 때 표면의 물 분자 20개가 모두 증발할 수 있어 평형의 증발 속도가 <b>9.0개/초</b>예요. 설탕이 4개(20 %)이면 물 분자가 16개라서 증발 속도가 <b>7.2개/초</b>로 줄고, 응축 속도도 이 값과 같아지는 더 적은 증기 분자 수에서 평형이 돼요.',
        },
        {
          type: 'quiz', title: '증기압이 낮아지는 까닭',
          goal: '설탕물의 증기압이 낮아지는 까닭으로 가장 알맞은 것은?',
          setup() { S.lock = true; setMode('surf'); },
          choices: ['설탕 분자도 증발해서 증기가 늘어나기 때문이에요', '설탕은 증발하지 않고 표면 자리를 차지해서 물의 증발이 줄기 때문이에요', '설탕이 물 분자를 모두 붙잡아 움직이지 못하게 하기 때문이에요', '설탕이 응축을 막기 때문이에요'],
          answer: 1,
          feedback: ['설탕은 비휘발성이라 증발하지 않아요. 증기는 대부분 물 분자예요.', '', '설탕은 일부 자리를 차지할 뿐이에요. 표면의 나머지 물 분자는 그대로 증발해요.', '응축은 증기 분자가 액체에 닿으면 일어나요. 설탕이 응축을 막는 것이 아니에요.'],
          explain: '비휘발성 용질(설탕)은 증발하지 않고 표면의 자리만 차지해서 단위 시간에 증발하는 물 분자가 줄어요. 응축 속도는 증기 분자 수에 비례하므로 증발 = 응축이 되는 증기 분자 수가 줄어 <b>증기압이 낮아져요</b>.',
        },
      ],
    },
    {
      title: '몰 분율 관계: 라울 법칙', short: '몰 분율 관계', icon: '📐', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계와 앞 차시(용액의 농도 표현)에서</b> 증발 속도가 표면의 물 분자 비율에 비례하고, 몰 분율이 입자 수의 비율이라는 것을 배웠어요. 이제 증기압과 <b>물의 몰 분율</b>의 관계를 식으로 만들어요.</div>' +
        '<p>설탕물의 증기압을 X<sub>물</sub> = 1.00, 0.98, 0.95, 0.90, 0.80에서 기록하고 그래프로 나타내요. 규칙이 보이면 식으로 쓰고 계산 문제를 풀어요. (이상 용액, 묽은 용액을 가정해요.)</p>',
      features: ['law'],
      setup() { S.lock = false; S.sub.law = 'rec'; setMode('law'); },
      recap: '증기압은 물의 몰 분율에 비례해요: P = X물 · P°. 증기압 내림 ΔP = P° − P = X설탕 · P°. 용질의 종류가 아니라 몰 분율만 중요해요.',
      summary: '<ul><li><b>라울 법칙</b>: P<sub>용액</sub> = X<sub>용매</sub> · P°<sub>용매</sub> (비휘발성 용질의 묽은 용액).</li><li><b>증기압 내림</b>: ΔP = P° − P = X<sub>용질</sub> · P°.</li><li>25 °C(P° = 23.8 mmHg): X물 1.00, 0.98, 0.95, 0.90, 0.80 → P = 23.8, 23.3, 22.6, 21.4, 19.0 mmHg. 원점을 지나는 직선이고 기울기가 P°예요.</li><li>X<sub>설탕</sub> = 0.05인 100 °C 수용액: 0.95 × 760 = <b>722 mmHg</b>. 설탕 1 mol + 물 9 mol(25 °C): 0.90 × 23.8 = <b>21.4 mmHg</b>.</li><li>몰 분율이 같으면 용질의 종류(설탕, 포도당)에 관계없이 증기압이 같아요.</li></ul>',
      missions: [
        {
          title: '증기압 점 5개 기록하기',
          goal: '25 °C 설탕물의 증기압을 <b>X물 = 1.00, 0.98, 0.95, 0.90, 0.80</b>에서 모두 기록해요. 5개를 모으면 규칙이 보여요.',
          hint: '슬라이더를 X물 = 1.00에 맞추고 「이 점 기록하기」를 눌러요. 0.98, 0.95, 0.90, 0.80도 같은 방법으로 해요. 사이 값은 기록되지 않아요.',
          setup() { S.lock = true; S.sub.law = 'rec'; S.law.rec = {}; S.law.xw = 100; setMode('law'); },
          check: () => lawCount() === 5, hold: 0.4,
          status: () => '기록한 점 ' + lawCount() + ' / 5 &nbsp; ' + XTARGET.map((x) => mark(S.law.rec[x] != null)).join(''),
          explain: '기록한 점은 원점을 지나는 <b>직선</b>이에요. 기울기는 <b>P° = 23.8 mmHg</b>이므로 <b>P = X물 · P°</b>예요. 증기압 내림은 ΔP = P° − P = (1 − X물) · P° = <b>X설탕 · P°</b>이에요.',
        },
        {
          title: '라울 법칙으로 계산하기',
          goal: '🧮 계산 화면에서 두 문제의 증기압을 구해 적어요. ① X설탕 = 0.05인 100 °C 수용액, ② 설탕 1 mol + 물 9 mol의 25 °C 수용액',
          hint: 'P = X물 · P°에서 먼저 X물을 구해요. ① X물 = 1 − 0.05, P° = 760 mmHg. ② X물 = 9 / (1 + 9), P° = 23.8 mmHg.',
          setup() { S.lock = true; S.sub.law = 'calc'; S.law.q = ['', '']; S.law.ok = [false, false]; setMode('law'); },
          check: () => S.law.ok[0] && S.law.ok[1], hold: 0.4,
          status: () => '① ' + mark(S.law.ok[0]) + ' &nbsp; ② ' + mark(S.law.ok[1]),
          explain: '① X물 = 0.95이므로 P = 0.95 × 760 = <b>722 mmHg</b>(증기압 내림 38 mmHg). ② X물 = 9 / 10 = 0.90이므로 P = 0.90 × 23.8 = <b>21.4 mmHg</b>.',
        },
        {
          type: 'quiz', title: '설탕물과 포도당물',
          goal: '25 °C에서 <b>물 입자 100개 중 설탕 5개</b>인 용액과 <b>물 입자 100개 중 포도당 5개</b>인 용액의 증기압을 비교하면?',
          setup() { S.lock = true; S.sub.law = 'rec'; setMode('law'); },
          choices: ['둘이 같아요. X물이 같기 때문이에요(22.6 mmHg)', '설탕물이 더 낮아요. 설탕의 질량이 더 크기 때문이에요', '포도당물이 더 낮아요', '용질의 질량이 같을 때만 같아요'],
          answer: 0,
          feedback: ['', '증기압은 용질의 질량이 아니라 입자 수의 비율(몰 분율)로 정해져요.', '증기압 내림은 X용질로 정해져요. 입자 5개가 같으면 같아요.', '질량이 같아도 몰 질량이 달라서 몰수와 몰 분율이 달라요. 중요한 것은 몰 분율이에요.'],
          explain: 'P = X물 · P°에서 증기압은 <b>물의 몰 분율</b>만으로 정해져요. 두 용액 모두 X물 = 0.95이므로 P = 0.95 × 23.8 = <b>22.6 mmHg</b>로 같아요. 용질의 종류나 질량은 상관없어요.',
        },
      ],
    },
    {
      title: '곡선 이동: 끓는점과 어는점으로', short: '곡선 이동', icon: '📈', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계와 앞 차시(증기압과 끓는점)에서</b> 용액의 증기압은 P = X물 · P°로 항상 순수한 물보다 낮다는 것, 외부 압력과 증기압이 같아지는 온도가 끓는점이라는 것을 배웠어요. 증기압 곡선 전체가 아래로 내려가면 끓는점은 어떻게 될까요?</div>' +
        '<p>물과 설탕물의 증기압 곡선을 같은 그래프에 그려요. 760 mmHg(1 atm) 점선과 만나는 온도가 끓는점이에요. 설탕물의 곡선이 아래에 있으면 어떻게 되는지 읽어요. (정량적인 계산은 다음 차시에서 해요.)</p>',
      features: ['curve'],
      setup() { S.lock = false; S.sub.curve = 'boil'; setMode('curve'); },
      recap: '용액의 증기압 곡선은 순수한 용매보다 항상 아래에 있어요. 그래서 760 mmHg에 닿으려면 더 높은 온도가 필요해 끓는점이 올라가고(끓는점 오름), 얼음의 곡선과는 더 낮은 온도에서 만나 어는점이 내려가요(어는점 내림).',
      summary: '<ul><li>1 m 설탕물: 25 °C에서 P = 23.8 × 0.9823 = <b>23.4 mmHg</b>(ΔP = 0.42), 100 °C에서 P = 760 × 0.9823 = <b>746.6 mmHg</b>(ΔP = 13.4).</li><li>용액의 증기압 곡선은 같은 온도에서 물보다 <b>항상 아래</b>에 있어요.</li><li>그래서 760 mmHg에 닿는 온도가 높아져요: 물 100.0 °C → 1 m 설탕물 약 <b>100.5 °C</b>(끓는점 오름).</li><li>얼음의 증기압 곡선과 만나는 온도는 낮아져요: 물 0 °C → 1 m 설탕물 약 <b>−1.9 °C</b>(어는점 내림). 정량적인 계산은 다음 차시에서 해요.</li><li>바닷물이 담수보다 천천히 증발하고, 설탕에 절인 과일이 오래 가는 것도 증기압 내림 때문이에요.</li></ul>',
      missions: [
        {
          title: '760 mmHg에서 두 곡선의 차이 읽기',
          goal: '몰랄 농도 <b>1.00 m</b> 설탕물에서 눈금 온도를 움직여, <b>물</b>의 곡선과 <b>설탕물</b>의 곡선이 각각 760 mmHg 점선과 만나는 온도를 찾아요.',
          hint: '그래프를 끌거나 눈금 온도 슬라이더로 맞춰요. 물은 100 °C 부근에서 점선과 만나요. 설탕물은 그보다 조금 더 오른쪽(높은 온도)이에요. 점 근처에 눈금을 두면 찾은 것으로 표시돼요.',
          setup() { S.lock = true; S.sub.curve = 'boil'; S.cur.m = 1; S.cur.cB = 99; S.cur.fB = {}; setMode('curve'); },
          check: () => boilOK(), hold: 0.4,
          status: () => '물의 교점 ' + mark(S.cur.fB.water) + ' &nbsp; 설탕물의 교점 ' + mark(S.cur.fB.sol === 1) + ' &nbsp; (1.00 m)',
          explain: '물은 <b>100.0 °C</b>에서 760 mmHg가 되고, 1 m 설탕물은 곡선이 아래에 있어서 약 <b>100.5 °C</b>가 되어야 760 mmHg에 닿아요. 곡선이 아래로 내려가면 끓는점이 <b>올라가요</b>(끓는점 오름).',
        },
        {
          title: '어는점 쪽도 살펴보기',
          goal: '<b>🧊 어는점 쪽</b>으로 바꿔 1.00 m 설탕물에서 눈금 온도를 움직이며, 물과 설탕물이 각각 <b>얼음의 곡선</b>과 만나는 온도를 찾아요.',
          hint: '🧊 어는점 쪽 단추를 누르고 눈금을 움직여요. 물은 0 °C에서 얼음의 곡선과 만나요. 설탕물의 곡선은 더 낮은 온도(왼쪽)에서 만나요.',
          setup() { S.lock = true; S.sub.curve = 'freeze'; S.cur.m = 1; S.cur.cF = 0.8; S.cur.fF = {}; setMode('curve'); },
          check: () => freezeOK(), hold: 0.4,
          status: () => '물 ' + mark(S.cur.fF.water) + ' &nbsp; 설탕물 ' + mark(S.cur.fF.sol === 1) + ' &nbsp; (1.00 m)',
          explain: '물은 <b>0 °C</b>에서 얼음의 증기압 곡선과 만나요. 설탕물은 곡선이 아래로 내려가 있어서 약 <b>−1.9 °C</b>에서 만나요. 그래서 설탕물의 어는점은 물보다 낮아요(어는점 내림).',
        },
        {
          type: 'quiz', title: '증기압 내림과 끓는점',
          goal: '용액의 증기압 곡선이 순수한 용매보다 아래에 있을 때, 용액의 <b>끓는점</b>은 순수한 용매에 비해 어떻게 될까요?',
          setup() { S.lock = true; S.sub.curve = 'boil'; setMode('curve'); },
          choices: ['더 높아져요. 외부 압력과 같아지려면 더 높은 온도가 필요하기 때문이에요', '더 낮아져요. 증기압이 낮기 때문이에요', '변하지 않아요', '끓지 않아요'],
          answer: 0,
          feedback: ['', '증기압이 낮아서 같은 온도에서는 760 mmHg에 못 닿아요. 더 높은 온도에서 끓어요.', '곡선의 위치가 달라져서 760 mmHg와 만나는 온도도 달라져요.', '더 높은 온도에서 끓어요. 끓지 않는 것이 아니에요.'],
          explain: '용액의 곡선이 아래에 있으면 같은 온도에서 증기압이 더 낮아요. 증기압이 외부 압력(760 mmHg)과 같아져야 끓으므로 <b>더 높은 온도</b>가 필요해요. 이것이 끓는점 오름이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-vapor-lowering', mount: '#game', badge: '증기압 내림 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { cmp: '🧪 밀폐 용기와 마노미터', surf: '🔬 표면 입자 모형', law: '📐 P–X물 그래프와 계산', curve: '📈 증기압 곡선' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  surfRestart(); cmpRestart();
  setMode('cmp');
  function stepAll1(dt) {
    S.clk += dt;
    if (S.mode === 'cmp') stepCmp(dt);
    if (S.mode === 'surf') stepSurf(dt);
    stepLaw(dt); stepCurve(dt);
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
    if (S.mode === 'cmp') { drawCmp(t); drawCmpInfo(t); }
    else if (S.mode === 'surf') { drawSurface(t); drawSurfInfo(t); }
    else if (S.mode === 'law') { if (S.sub.law === 'rec') drawLawGraph(t); else drawLawCalc(t); drawLawTable(t); }
    else { drawCurve(t); drawCurveInfo(t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, XTARGET, Pw, Psol, Tboil, Tfreeze, Pice, Pliq, PsolF, xsOfM, setMode, setSub, setS, setJ, setXw, setM, setCur, cmpGeo, crPlot, lawPlot, cmpEq, recPoint, lawCount, lawSlope, sfW, curT, QANS, dispP,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
