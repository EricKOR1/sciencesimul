/* =========================================================
   물질과 에너지 Ⅱ. 용액의 성질 - 용액의 농도 표현 [12물에02-02]
   ① 관찰: 농도 종류 (같은 설탕물을 질량 %, 몰 농도, 몰랄 농도, 몰 분율로 읽고 분모를 비교)
   ② 실험: 몰랄 농도 (m = 용질의 몰수 / 용매의 질량(kg), 온도를 올려도 변하지 않아요)
   ③ 모형: 몰 분율 (입자 100개 격자, X_용질 + X_용매 = 1)
   ④ 분석: 농도 변환 (질량 → 몰수 → 비의 순서로 계산)
   몰 농도 ↔ 몰랄 농도 밀도 환산 공식의 암기, ppm · ppb, 활동도는 다루지 않아요.
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
    L: PHONE ? { x: 8, y: 50, w: 464, h: 496 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 554, w: 464, h: 398 } : { x: 490, y: 50, w: 298, h: 498 },
    F: PHONE ? { x: 8, y: 50, w: 464, h: 900 } : { x: 12, y: 50, w: 776, h: 498 },
  };
  const MODE_LABEL = { kinds: '🧪 같은 용액, 네 가지 농도', molal: '⚖️ 몰랄 농도는 온도가 변해도 그대로?', frac: '🔢 입자 100개로 보는 몰 분율', conv: '🧮 농도를 서로 바꾸어 계산해요' };
  const parseNum = (s) => { const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const ap = SciSim.approach;
  const f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3), f4 = (v) => v.toFixed(4);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'kinds', fade: 0, lock: false, t: 0,
    sub: { kinds: 'beaker' },
    sol: { id: 'sug', k: 10, w: 100, T: 20, Td: 20, gsel: '', viewed: {}, hot: {} },
    link: [-1, -1, -1, -1], msel: -1, mflag: [false, false, false, false], mshake: [0, 0, 0, 0], mperm: [2, 0, 3, 1],
    frac: { k: 5, kd: 5, seenD: false, seenC: false },
    cv: { p: 0, ans: [['', ''], ['', ''], ['', '']], ok: [[false, false], [false, false], [false, false]], ord: [[], [], []], ordDone: [false, false, false], perm: [[1, 2, 0], [2, 0, 1], [1, 0, 2]], shake: 0 },
  };
  let game = null;

  /* ================= 자료와 계산 ================= */
  const MW = 18;                                           // 물 18 g/mol
  const KG_MOL = 1000 / MW;                                // 물 1 kg = 55.6 mol
  const SOL = {
    sug: { id: 'sug', nm: '설탕', fm: 'C₁₂H₂₂O₁₁', Mm: 342, col: '#f472b6', r: 9.5, tab: [[0, 0.9982], [10, 1.0381], [20, 1.0810], [30, 1.1270], [40, 1.1765], [50, 1.2296], [60, 1.2852], [70, 1.3478]] },
    glc: { id: 'glc', nm: '포도당', fm: 'C₆H₁₂O₆', Mm: 180, col: '#fb923c', r: 8, tab: [[0, 0.9982], [10, 1.0370], [20, 1.0760], [30, 1.1180], [40, 1.1630], [50, 1.2100]] },
    eth: { id: 'eth', nm: '에탄올', fm: 'C₂H₅OH', Mm: 46, col: '#f59e0b', r: 6.3, tab: [[0, 0.9982], [10, 0.9819], [20, 0.9686], [30, 0.9538], [40, 0.9352], [50, 0.9138], [60, 0.8911]] },
  };
  const RHO_WT = [[20, 0.99820], [30, 0.99565], [40, 0.99222], [50, 0.98803], [60, 0.98320], [70, 0.97777], [80, 0.97180]];
  function interp(tab, x) {
    x = clamp(x, tab[0][0], tab[tab.length - 1][0]); let i = 0; while (i < tab.length - 2 && x > tab[i + 1][0]) i++;
    const a = tab[i], b = tab[i + 1]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  const rhoW = (Tc) => interp(RHO_WT, Tc);
  function calc(id, k, w, Tc) {
    const s = SOL[id], nS = k * 0.01, mS = nS * s.Mm, mW = w, nW = mW / MW, mT = mS + mW, wp = mS / mT * 100, rho = interp(s.tab, wp), V20 = mT / rho;
    const al = 0.85 * (rhoW(20) / rhoW(Tc) - 1), V = V20 * (1 + al);       // 용액의 부피 팽창 (물의 팽창의 약 85 %)
    return { s, nS, mS, mW, nW, mT, wp, rho, V20, V, M: nS / (V / 1000), m: nS / (mW / 1000), X: nS / (nS + nW), Xw: nW / (nS + nW) };
  }
  const cur = (T0) => calc(S.sol.id, S.sol.k, S.sol.w, T0 == null ? S.sol.Td : T0);
  const GK = {
    pct: { id: 'pct', nm: '질량 퍼센트 농도', den: '용액 질량', col: '#f97316', unit: ' %', dec: 1, val: (c) => c.wp, eq: [['= 용질 질량 / ', INK], ['용액 질량', '#f97316'], [' × 100', INK]], det: (c) => c.mS.toFixed(1) + ' g / ' + c.mT.toFixed(1) + ' g × 100' },
    M: { id: 'M', nm: '몰 농도 (M)', den: '용액 부피', col: '#0d9488', unit: ' mol/L', dec: 3, val: (c) => c.M, eq: [['= 용질 몰수 / ', INK], ['용액 부피(L)', '#0d9488']], det: (c) => c.nS.toFixed(3) + ' mol / ' + (c.V / 1000).toFixed(4) + ' L' },
    m: { id: 'm', nm: '몰랄 농도 (m)', den: '용매 질량', col: '#3867f4', unit: ' mol/kg', dec: 2, val: (c) => c.m, eq: [['= 용질 몰수 / ', INK], ['용매 질량(kg)', '#3867f4']], det: (c) => c.nS.toFixed(3) + ' mol / ' + (c.mW / 1000).toFixed(3) + ' kg' },
    X: { id: 'X', nm: '몰 분율 (X_용질)', den: '전체 몰수', col: '#8b5cf6', unit: '', dec: 4, val: (c) => c.X, eq: [['= 용질 몰수 / ', INK], ['전체 몰수', '#8b5cf6']], det: (c) => c.nS.toFixed(3) + ' mol / ' + (c.nS + c.nW).toFixed(3) + ' mol' },
  };
  const GORDER = ['pct', 'M', 'm', 'X'];
  const fmtG = (id, v) => v.toFixed(GK[id].dec) + GK[id].unit;
  const gv = { pct: 0, M: 0, m: 0, X: 0 };
  const sgStr = (c) => (c.s.id === 'sug' ? '설탕' : c.s.nm);

  /* ================= 확대 입자 모형 (표본 200개) ================= */
  const NP = 200;
  const PR = PHONE ? 90 : 96;
  const PS = [];
  (function () { for (let i = 0; i < NP; i++) { const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * (PR - 10); PS.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0, k: 0, kt: 0, ang: rnd(0, TAU), pop: 0 }); } })();
  let psT = 0;
  const targetSolute = (c) => (c.nS <= 0 ? 0 : Math.max(1, Math.round(c.X * NP)));
  function stepPS(dt, c) {
    const want = targetSolute(c), have = PS.filter((p) => p.kt === 1).length;
    psT -= dt;
    if (psT <= 0 && have !== want) {
      psT = RM ? 0 : 0.045;
      if (have < want) { const cand = PS.filter((p) => p.kt === 0 && p.k < 0.2); const p = cand[Math.floor(Math.random() * cand.length)]; if (p) { p.kt = 1; p.pop = 1; } }
      else { const cand = PS.filter((p) => p.kt === 1); const p = cand[Math.floor(Math.random() * cand.length)]; if (p) p.kt = 0; }
    }
    const sp = Math.sqrt((S.sol.Td + 273) / 293) * 16, s = SOL[S.sol.id], rs = s.r;
    PS.forEach((p) => {
      p.k = ap(p.k, p.kt, dt, 6); p.pop = Math.max(0, p.pop - dt * 2.2); p.ang += dt * 0.8;
      const rr = lerp(4.4, rs, p.k), vv = p.kt ? sp * 0.55 : sp;
      p.vx += rnd(-1, 1) * 140 * dt; p.vy += rnd(-1, 1) * 140 * dt;
      const m = Math.hypot(p.vx, p.vy) || 1; p.vx *= vv / m; p.vy *= vv / m;
      p.x += p.vx * dt; p.y += p.vy * dt; p.r = rr;
    });
    for (let i = 0; i < NP; i++) for (let j = i + 1; j < NP; j++) {
      const a = PS[i], b = PS[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, mn = a.r + b.r - 0.5;
      if (d2 < mn * mn && d2 > 1e-6) { const d = Math.sqrt(d2), o = (mn - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * o; a.y -= uy * o; b.x += ux * o; b.y += uy * o; }
    }
    PS.forEach((p) => { const d = Math.hypot(p.x, p.y), lim = PR - 5 - p.r; if (d > lim) { const k = lim / d; p.x *= k; p.y *= k; const nx = p.x / lim, ny = p.y / lim, dp = p.vx * nx + p.vy * ny; if (dp > 0) { p.vx -= 2 * dp * nx; p.vy -= 2 * dp * ny; } } });
  }
  function drawZoom(cx, cy, hl) {
    const s = SOL[S.sol.id];
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, PR, 0, TAU); ctx.clip();
    const bgc = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, PR); bgc.addColorStop(0, '#f4fbff'); bgc.addColorStop(1, '#d6ebff'); ctx.fillStyle = bgc; ctx.fillRect(cx - PR, cy - PR, 2 * PR, 2 * PR);
    ctx.fillStyle = '#38bdf8'; ctx.beginPath(); PS.forEach((p) => { if (p.k < 0.5) { ctx.moveTo(cx + p.x + p.r * (1 - p.k), cy + p.y); ctx.arc(cx + p.x, cy + p.y, p.r * (1 - p.k * 0.2), 0, TAU); } }); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); PS.forEach((p) => { if (p.k < 0.5) { ctx.moveTo(cx + p.x - p.r * 0.3 + 1.1, cy + p.y - p.r * 0.35); ctx.arc(cx + p.x - p.r * 0.3, cy + p.y - p.r * 0.35, 1.1, 0, TAU); } }); ctx.fill();
    PS.forEach((p) => { if (p.k >= 0.5) { const sc = 1 + p.pop * 0.35; D.sphere(cx + p.x, cy + p.y, p.r * sc, s.col, { gloss: true, shadow: true }); } });
    if (hl) PS.forEach((p) => { if (hl === 'X' || (hl === 'm' && p.k < 0.5)) { ctx.strokeStyle = hl === 'm' ? 'rgba(56,103,244,.9)' : 'rgba(139,92,246,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx + p.x, cy + p.y, p.r + 1.8, 0, TAU); ctx.stroke(); } });
    ctx.restore();
    ctx.strokeStyle = '#6b7f9c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, PR, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, PR - 5, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke();
  }

  /* ================= ① 비커와 계기판 ================= */
  const VMAX = 600;
  function bkGeo() {
    const L = RC.L;
    return { bx: L.x + 30, by: L.y + 62, bw: 140, bh: 226, zx: L.x + L.w - PR - 14, zy: L.y + 62 + PR + 20, rx: L.x + 30 + 140 + 22, ex: L.x + 14, ey: L.y + L.h - 112 };
  }
  const niceStep = (v) => { const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * e; };
  function drawBeaker(t, c, gsel) {
    const L = RC.L, g = bkGeo(), s = c.s;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 ' + c.s.nm + ' 수용액 ' + c.mT.toFixed(1) + ' g · ' + S.sol.Td.toFixed(0) + ' °C', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    const lv = clamp(c.V / VMAX, 0, 1), tint = clamp(c.wp / 45, 0, 1);
    const liquid = C.mix('#8fd0ff', s.col, tint * 0.55);
    D.beaker(g.bx, g.by, g.bw, g.bh, { level: lv, liquid, t, ticks: 0, wave: 1.0 });
    for (let v = 0; v <= VMAX; v += 100) { const y = g.by + g.bh - g.bh * v / VMAX; ctx.fillStyle = '#7d8da6'; ctx.fillRect(g.bx + g.bw - 12, y - 0.75, 12, 1.5); if (v > 0 && v < VMAX) T(g.bx + g.bw - 16, y + 4, String(v), 11.5, MUTED, 'right', 700); }
    T(g.bx + g.bw - 6, g.by - 2, 'mL', 11.5, MUTED, 'right', 800);
    const sy = g.by + g.bh - g.bh * lv;
    // 선택한 분모 표시
    const hl = gsel;
    if (hl === 'pct') { ctx.strokeStyle = GK.pct.col; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 12; D.roundRect(g.bx - 8, sy - 4, g.bw + 16, g.by + g.bh - sy + 12, 10); ctx.stroke(); ctx.setLineDash([]); D.label(g.bx + g.bw / 2, sy - 18, '용액 질량 ' + c.mT.toFixed(1) + ' g', { size: 12.5, bg: GK.pct.col, align: 'center' }); }
    if (hl === 'M') { D.arrow(g.bx - 12, g.by + g.bh, g.bx - 12, sy, { color: GK.M.col, width: 3, head: 9 }); D.label(g.bx - 4, sy - 16, '용액 부피 ' + c.V.toFixed(1) + ' mL', { size: 12.5, bg: GK.M.col, align: 'left' }); }
    if (hl === 'm') { D.label(g.bx + g.bw / 2, g.by + g.bh + 26, '용매(물)만 ' + (c.mW) + ' g = ' + (c.mW / 1000).toFixed(3) + ' kg', { size: 12.5, bg: GK.m.col, align: 'center' }); }
    if (hl === 'X') { D.label(g.bx + g.bw / 2, g.by + g.bh + 26, '전체 몰수 ' + (c.nS + c.nW).toFixed(3) + ' mol', { size: 12.5, bg: GK.X.col, align: 'center' }); }
    // 양
    if (!hl || hl === 'pct' || hl === 'M') {
      T(g.bx + g.bw / 2, g.by + g.bh + 22, s.nm + ' ' + c.mS.toFixed(1) + ' g (' + c.nS.toFixed(2) + ' mol)', 13, INK, 'center', 800);
      T(g.bx + g.bw / 2, g.by + g.bh + 41, '물 ' + c.mW + ' g (' + c.nW.toFixed(2) + ' mol)', 13, INK, 'center', 800);
    }
    // 액면 확대 눈금 (온도에 따른 부피 변화를 크게 보여요)
    const half = c.V20 * 0.1, step = niceStep(half / 3), rh = 200, rx = g.rx + 10, ry = g.by + 8;
    const Yv = (v) => ry + rh / 2 - (v - c.V20) / half * (rh / 2);
    D.roundRect(rx, ry, 44, rh, 8); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#cbd6ea'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save(); D.roundRect(rx, ry, 44, rh, 8); ctx.clip();
    for (let v = Math.ceil((c.V20 - half) / step) * step; v <= c.V20 + half + 1e-6; v += step) { const y = Yv(v); ctx.fillStyle = '#7d8da6'; ctx.fillRect(rx + 30, y - 0.75, 14, 1.5); T(rx + 27, y + 4, String(Math.round(v * 10) / 10), 10.5, MUTED, 'right', 700); }
    ctx.fillStyle = GK.M.col; ctx.fillRect(rx, clamp(Yv(c.V), ry, ry + rh) - 1.5, 44, 3); ctx.restore();
    T(rx + 22, ry - 8, '🔍 눈금', 11.5, MUTED, 'center', 800);
    T(rx + 22, ry + rh + 16, c.V.toFixed(1), 12, GK.M.col, 'center', 800); T(rx + 22, ry + rh + 30, 'mL', 11, MUTED, 'center', 700);
    // 확대 연결선 + 입자 모형
    ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(g.bx + g.bw - 14, g.by + g.bh * 0.62); ctx.lineTo(g.zx - PR + 4, g.zy + 26); ctx.moveTo(g.bx + g.bw - 14, g.by + g.bh - 8); ctx.lineTo(g.zx - PR + 22, g.zy + PR - 18); ctx.stroke(); ctx.setLineDash([]);
    drawZoom(g.zx, g.zy, hl === 'm' || hl === 'X' ? hl : '');
    T(g.zx, g.zy + PR + 22, '🔍 입자 모형 (표본 ' + NP + '개)', 13, INK, 'center', 800);
    T(g.zx, g.zy + PR + 40, s.nm + ' ' + PS.filter((p) => p.kt === 1).length + '개 · 물 ' + PS.filter((p) => p.kt === 0).length + '개', 12.5, MUTED, 'center', 700);
    // 설명 상자
    D.roundRect(g.ex, g.ey, L.w - 28, 100, 12); ctx.fillStyle = '#f7f9ff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    let msg, col = INK;
    if (!gsel) msg = '계기판을 눌러 그 농도의 「분모」가 어디에 있는지 확인해요. 같은 용액이라도 분모가 달라서 네 값이 모두 달라요.';
    else if (gsel === 'pct') { msg = '질량 퍼센트 농도의 분모는 용액 전체의 질량(용질 + 용매)이에요. 비커 안의 모든 것을 저울에 올린 값이에요.'; col = '#c2410c'; }
    else if (gsel === 'M') { msg = '몰 농도의 분모는 용액의 부피(L)예요. 부피는 온도에 따라 변해서 몰 농도도 변해요.'; col = '#0f766e'; }
    else if (gsel === 'm') { msg = '몰랄 농도의 분모는 용매의 질량(kg)이에요. 용액 전체가 아니라 물만 재요. 질량은 온도와 상관없어요.'; col = '#2548b8'; }
    else { msg = '몰 분율의 분모는 전체 몰수(용질 + 용매)예요. 입자 수의 비율이라 단위가 없어요.'; col = '#6d28d9'; }
    textBlock(g.ex + 12, g.ey + 26, L.w - 52, msg, PHONE ? 13.5 : 14, col, 20, 800);
    if (gsel) T(g.ex + 12, g.ey + 90, '분모 = ' + GK[gsel].den, 13, col, 'left', 800);
  }
  /* 계기판 (오른쪽) */
  function gaugeRects() {
    const R = RC.R, out = [];
    if (PHONE) { const w = (R.w - 30) / 2, h = 170; GORDER.forEach((id, i) => out.push({ id, x: R.x + 10 + (i % 2) * (w + 10), y: R.y + 44 + Math.floor(i / 2) * (h + 10), w, h })); }
    else GORDER.forEach((id, i) => out.push({ id, x: R.x + 10, y: R.y + 44 + i * 112, w: R.w - 20, h: 106 }));
    return out;
  }
  function eqLine(x, y, segs, size) {
    let cx = x; ctx.save(); ctx.font = D.font(size, 800); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    segs.forEach(([tx, col]) => { ctx.fillStyle = col; ctx.fillText(tx, cx, y); cx += ctx.measureText(tx).width; }); ctx.restore();
  }
  function drawGauges(t, c) {
    const R = RC.R;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '📟 농도 계기판 (눌러 보세요)', 14.5, INK, 'left', 800);
    gaugeRects().forEach((r) => {
      const gk = GK[r.id], sel = S.sol.gsel === r.id, viewed = S.sol.viewed[r.id];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = sel ? C.rgba(gk.col, 0.1) : '#fbfcff'; ctx.fill(); }, { blur: sel ? 10 : 3, y: 2, color: sel ? C.rgba(gk.col, 0.35) : 'rgba(20,40,80,.12)' });
      ctx.strokeStyle = sel ? gk.col : '#dbe3f3'; ctx.lineWidth = sel ? 3 : 1.4; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      ctx.fillStyle = gk.col; D.roundRect(r.x + 8, r.y + 12, 5, r.h - 24, 3); ctx.fill();
      T(r.x + 22, r.y + 24, gk.nm, PHONE ? 13 : 14.5, INK, 'left', 800);
      if (viewed) T(r.x + r.w - 12, r.y + 24, '✓ 확인', 11.5, GOOD, 'right', 800);
      if (PHONE) { T(r.x + 22, r.y + 58, fmtG(r.id, gv[r.id]), 20, gk.col, 'left', 800); eqLine(r.x + 22, r.y + 84, [['= 용질 ', INK]], 12.5); eqLine(r.x + 22, r.y + 104, [[r.id === 'pct' ? '질량 / ' : '몰수 / ', INK], [gk.den + (r.id === 'M' ? '(L)' : r.id === 'm' ? '(kg)' : ''), gk.col], [r.id === 'pct' ? ' × 100' : '', INK]], 12.5); textBlock(r.x + 22, r.y + 132, r.w - 30, gk.det(c), 11.5, MUTED, 15, 700); }
      else { T(r.x + 22, r.y + 56, fmtG(r.id, gv[r.id]), 22, gk.col, 'left', 800); eqLine(r.x + 22, r.y + 80, gk.eq, 13); T(r.x + 22, r.y + 99, gk.det(c), 12, MUTED, 'left', 700); }
    });
    if (!PHONE) { /* 여분 없음 */ }
  }
  function gaugeHit(p) { const r = gaugeRects().find((q) => inRect(p, q)); return r ? r.id : null; }
  function stepSol(dt) {
    const so = S.sol; so.Td = ap(so.Td, so.T, dt, 3.2); if (Math.abs(so.Td - so.T) < 0.05) so.Td = so.T;
    const c = cur(); GORDER.forEach((id) => { gv[id] = ap(gv[id], GK[id].val(c), dt, 9); if (Math.abs(gv[id] - GK[id].val(c)) < 0.0004 * (1 + GK[id].val(c))) gv[id] = GK[id].val(c); });
    stepPS(dt, c);
  }

  /* ================= ① 분모 연결 ================= */
  const MNAME = { pct: '질량 퍼센트 농도', M: '몰 농도', m: '몰랄 농도', X: '몰 분율' };
  function mGeo() {
    const L = RC.L, w = 188, h = 58, y0 = L.y + 64, gap = 22;
    return { left: GORDER.map((id, i) => ({ id, x: L.x + 14, y: y0 + i * (h + gap), w, h })), right: S.mperm.map((pi, j) => ({ id: GORDER[pi], j, x: L.x + L.w - 14 - w, y: y0 + j * (h + gap), w, h })), y0 };
  }
  const mOK = (i) => S.link[i] >= 0 && GORDER[S.mperm[S.link[i]]] === GORDER[i];
  function mTap(p) {
    const G = mGeo(); const li = G.left.findIndex((r) => inRect(p, r)), rj = G.right.findIndex((r) => inRect(p, r));
    if (li >= 0) { if (S.link[li] >= 0 && S.msel === li) { S.link[li] = -1; S.msel = -1; } else S.msel = li; S.mflag[li] = false; Sound.tick(); return true; }
    if (rj >= 0 && S.msel >= 0) {
      for (let q = 0; q < 4; q++) if (S.link[q] === rj) { S.link[q] = -1; S.mflag[q] = false; }
      S.link[S.msel] = rj; S.mflag[S.msel] = false; S.msel = -1; Sound.tick(); return true;
    }
    return false;
  }
  function matchCheck() {
    const miss = GORDER.filter((id) => !S.sol.viewed[id]);
    if (miss.length) return '먼저 비커 화면에서 계기판 4개를 모두 눌러 분모를 확인해 봐요. (아직 ' + miss.map((id) => MNAME[id]).join(' · ') + ')';
    const un = S.link.filter((v) => v < 0).length;
    if (un) return '아직 연결하지 않은 농도가 ' + un + '개 있어요.';
    const wr = []; for (let i = 0; i < 4; i++) if (!mOK(i)) wr.push(i);
    if (wr.length) { wr.forEach((i) => { if (!S.mflag[i]) { S.mflag[i] = true; S.mshake[i] = 1; } }); return wr.length + '개가 알맞지 않아요. 빨간 선을 다시 생각해 봐요. (용액 전체? 용액의 부피? 용매만? 입자 전체?)'; }
    return true;
  }
  const mDone = () => S.link.every((v, i) => mOK(i));
  function drawMatch(t) {
    const L = RC.L, G = mGeo();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔗 농도 이름과 분모를 이어요', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '농도 이름 → 분모 순서로 눌러요', 12.5, MUTED, 'left', 700);
    G.left.forEach((r, i) => { r.sel = S.msel === i; });
    for (let i = 0; i < 4; i++) {
      if (S.link[i] < 0) continue;
      const a = G.left[i], b = G.right[S.link[i]], ok = mDone() && mOK(i), bad = S.mflag[i];
      const sx = bad ? Math.sin(S.mshake[i] * 30) * 3 * S.mshake[i] : 0;
      ctx.strokeStyle = bad ? BAD : ok ? GOOD : GK[GORDER[i]].col; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x + a.w + 2, a.y + a.h / 2); ctx.bezierCurveTo(a.x + a.w + 50, a.y + a.h / 2, b.x - 50 + sx, b.y + b.h / 2, b.x - 2, b.y + b.h / 2); ctx.stroke(); ctx.lineCap = 'butt';
    }
    G.left.forEach((r, i) => {
      const col = GK[r.id].col, sel = S.msel === i, linked = S.link[i] >= 0;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = sel ? C.rgba(col, 0.14) : '#fff'; ctx.fill(); }, { blur: sel ? 10 : 4, y: 2 });
      ctx.strokeStyle = S.mflag[i] ? BAD : sel ? col : linked ? col : '#cfd8e8'; ctx.lineWidth = sel || S.mflag[i] ? 3 : 1.8; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      T(r.x + r.w / 2, r.y + 26, MNAME[r.id], 15, INK, 'center', 800); T(r.x + r.w / 2, r.y + 45, r.id === 'pct' ? 'wt %' : r.id === 'M' ? 'mol/L' : r.id === 'm' ? 'mol/kg' : '(단위 없음)', 12.5, MUTED, 'center', 700);
    });
    G.right.forEach((r) => {
      const used = S.link.indexOf(r.j) >= 0;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = used ? '#f4f7fd' : '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = S.msel >= 0 && !used ? '#8aa0c8' : '#cfd8e8'; ctx.lineWidth = S.msel >= 0 && !used ? 2.4 : 1.8; ctx.setLineDash(S.msel >= 0 && !used ? [5, 4] : []); D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke(); ctx.setLineDash([]);
      const lab = { pct: '용액 전체의 질량', M: '용액의 부피 (L)', m: '용매의 질량 (kg)', X: '전체 몰수 (용질 + 용매)' }[r.id];
      textBlock(r.x + r.w / 2, r.y + 35, r.w - 16, lab, 14, INK, 18, 800, 'center');
    });
    if (mDone()) D.check(L.x + L.w / 2, L.y + L.h - 30, 16, 1);
    T(L.x + L.w / 2, L.y + L.h - 40, mDone() ? '' : (S.msel >= 0 ? '오른쪽에서 분모를 눌러요' : '왼쪽에서 농도 이름을 눌러요'), 13, MUTED, 'center', 800);
  }
  function drawMatchInfo(t) {
    const R = RC.R;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '📋 정의식 읽기', 14.5, INK, 'left', 800);
    GORDER.forEach((id, i) => {
      const y = R.y + 56 + i * (PHONE ? 76 : 98), gk = GK[id], pick = S.link[i] >= 0 ? GK[GORDER[S.mperm[S.link[i]]]] : null;
      T(R.x + 14, y, MNAME[id], 13.5, gk.col, 'left', 800);
      const num = id === 'pct' ? '용질 질량 / ' : '용질 몰수 / ';
      eqLine(R.x + 14, y + 22, [['= ' + num, INK], [pick ? pick.den + (pick.id === 'M' ? '(L)' : pick.id === 'm' ? '(kg)' : '') : '( ? )', pick ? (mDone() || mOK(i) ? gk.col : pick.col) : '#9aa6bb'], [id === 'pct' ? ' × 100' : '', INK]], 13.5);
      if (mDone()) T(R.x + R.w - 14, y, '✓', 16, GOOD, 'right', 800);
    });
    if (!PHONE) textBlock(R.x + 14, R.y + R.h - 58, R.w - 28, '분자는 모두 용질의 양이에요. 분모(기준이 되는 양)가 다르면 용액을 다르게 표현해요.', 12.5, MUTED, 17, 700);
  }

  /* ================= ③ 몰 분율: 입자 100개 격자 ================= */
  const FRO = (function () { const a = Array.from({ length: 100 }, (_, i) => i); let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let i = 99; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  const FCELL = Array.from({ length: 100 }, () => ({ a: 0 }));
  const frX = () => S.frac.k / 100;
  const frM = () => (S.frac.k / (100 - S.frac.k)) * KG_MOL;           // 용질 k개 + 용매 (100 − k)개를 몰수 비로 보았을 때의 몰랄 농도
  function fgeo() { const L = RC.L, cell = PHONE ? 40 : 40; return { x: L.x + (L.w - cell * 10) / 2, y: L.y + 58, cell }; }
  function stepFrac(dt) {
    const f = S.frac; f.kd = ap(f.kd, f.k, dt, 7); if (Math.abs(f.kd - f.k) < 0.01) f.kd = f.k;
    const rank = new Array(100); FRO.forEach((c, i) => { rank[c] = i; });
    FCELL.forEach((c, i) => { c.a = ap(c.a, rank[i] < f.k ? 1 : 0, dt, 10); });
    if (S.mode === 'frac') { if (f.k >= 1 && f.k <= 2) f.seenD = true; if (f.k >= 40) f.seenC = true; }
  }
  function drawFracGrid(t) {
    const L = RC.L, g = fgeo(), f = S.frac;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔬 입자 100개 중 용질 ' + f.k + '개', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    D.roundRect(g.x - 6, g.y - 6, g.cell * 10 + 12, g.cell * 10 + 12, 12); ctx.fillStyle = '#f2f9ff'; ctx.fill(); ctx.strokeStyle = '#cfe0f5'; ctx.lineWidth = 1.6; ctx.stroke();
    const sc = SOL.sug;
    for (let i = 0; i < 100; i++) {
      const cx = g.x + (i % 10) * g.cell + g.cell / 2, cy = g.y + Math.floor(i / 10) * g.cell + g.cell / 2, a = FCELL[i].a;
      const wob = RM ? 0 : Math.sin(t * 1.7 + i) * 0.8;
      if (a < 0.98) D.sphere(cx + wob, cy, lerp(11, 4, a), '#38bdf8', { gloss: false });
      if (a > 0.02) D.sphere(cx, cy, 5 + 11 * sm(a) + (a < 1 && !RM ? 3 * Math.sin(a * Math.PI) : 0), sc.col, { gloss: true, shadow: true });
    }
    T(L.x + L.w / 2, g.y + g.cell * 10 + 28, '● 용질 ' + f.k + '개    ● 용매 ' + (100 - f.k) + '개', 13, MUTED, 'center', 800);
  }
  function drawFracInfo(t) {
    const R = RC.R, f = S.frac, X = frX(), cx = R.x + R.w / 2, cy = R.y + (PHONE ? 100 : 112), rr = PHONE ? 62 : 70, th = 26;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '🍩 몰 분율 (합 = 1)', 14.5, INK, 'left', 800);
    const xd = f.kd / 100, a0 = -Math.PI / 2;
    ctx.lineWidth = th; ctx.strokeStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
    if (xd > 0.0005) { ctx.strokeStyle = SOL.sug.col; ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a0 + TAU * xd); ctx.stroke(); }
    ctx.lineWidth = 1;
    T(cx, cy - 2, 'X용질', 13, MUTED, 'center', 800); T(cx, cy + 20, X.toFixed(4), 19, SOL.sug.col, 'center', 800);
    const y0 = cy + rr + 36, lh = PHONE ? 25 : 26;
    const row = (i, lab, val, col) => { T(R.x + 16, y0 + i * lh, lab, 13.5, col || INK, 'left', 800); T(R.x + R.w - 16, y0 + i * lh, val, 14, col || INK, 'right', 800); };
    row(0, 'X용질 = ' + f.k + ' / 100', X.toFixed(4), SOL.sug.col);
    row(1, 'X용매 = ' + (100 - f.k) + ' / 100', (1 - X).toFixed(4), '#0284c7');
    row(2, 'X용질 + X용매', (X + (1 - X)).toFixed(4), GOOD);
    ctx.strokeStyle = '#e1e8f5'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(R.x + 14, y0 + 3 * lh - 12); ctx.lineTo(R.x + R.w - 14, y0 + 3 * lh - 12); ctx.stroke();
    const m = frM(), ax = m / KG_MOL, err = X > 0 ? (ax - X) / X * 100 : 0;
    T(R.x + 16, y0 + 3 * lh + 6, '같은 용액의 몰랄 농도', 12.5, MUTED, 'left', 800);
    row(4, 'm', f2(m) + ' mol/kg', '#2548b8');
    row(5, '근사 m / ' + (KG_MOL).toFixed(1), ax.toFixed(4), '#7c3aed');
    row(6, '근사의 오차', (err >= 0 ? '+' : '−') + Math.abs(err).toFixed(0) + ' %', Math.abs(err) < 5 ? GOOD : BAD);
    if (!PHONE) textBlock(R.x + 14, y0 + 7 * lh + 4, R.w - 28, '묽은 용액에서는 X ≈ m / 55.6 이지만, 진한 용액에서는 맞지 않아요. (1.00 m 수용액이면 100개 중 약 1.8개가 용질)', 12, MUTED, 16, 700);
  }

  /* ================= ④ 농도 변환 ================= */
  const PROB = [
    { t: '설탕 20 질량 % 수용액', body: '설탕 20 g과 물 80 g을 섞었어요. 설탕의 몰 질량은 342 g/mol이에요. 이 수용액의 몰랄 농도는?', rows: [['설탕', '20 g', '342 g/mol'], ['물', '80 g', '18 g/mol']], q: [{ lab: 'm (mol/kg)', v: 20 / 342 / 0.080, tol: 0.015, d: 2 }],
      steps: ['용질의 질량을 몰수로 바꿔요: 20 g / 342 g/mol = 0.0585 mol', '용매의 질량을 kg으로 바꿔요: 80 g = 0.080 kg', '몰수 / 용매 kg: 0.0585 mol / 0.080 kg = 0.73 mol/kg'], res: 'm = 0.0585 mol / 0.080 kg = 0.73 mol/kg' },
    { t: '에탄올 46 g + 물 54 g', body: '에탄올 46 g(46 g/mol)을 물 54 g(18 g/mol)에 섞었어요. 에탄올의 몰 분율과 몰랄 농도를 구해요.', rows: [['에탄올', '46 g', '46 g/mol'], ['물', '54 g', '18 g/mol']], q: [{ lab: 'X에탄올', v: 0.25, tol: 0.005, d: 2 }, { lab: 'm (mol/kg)', v: 1.0 / 0.054, tol: 0.15, d: 1 }],
      steps: ['질량을 몰수로: 에탄올 46/46 = 1.0 mol, 물 54/18 = 3.0 mol', '몰 분율: X에탄올 = 1.0 / (1.0 + 3.0) = 0.25', '몰랄 농도: 1.0 mol / 0.054 kg = 18.5 mol/kg'], res: 'X = 1.0 / 4.0 = 0.25,  m = 1.0 / 0.054 = 18.5 mol/kg' },
    { t: '포도당 0.50 mol + 물 500 g', body: '포도당 0.50 mol을 물 500 g에 녹였어요. 포도당의 몰랄 농도와 몰 분율을 구해요.', rows: [['포도당', '0.50 mol', '(몰수가 주어짐)'], ['물', '500 g', '18 g/mol']], q: [{ lab: 'm (mol/kg)', v: 1.0, tol: 0.02, d: 2 }, { lab: 'X포도당', v: 0.50 / (0.50 + 500 / 18), tol: 0.0006, d: 4 }],
      steps: ['용질은 이미 0.50 mol이고, 물 500 g = 0.500 kg이에요', '물의 몰수: 500 g / 18 g/mol = 27.8 mol', '몰랄 농도 m = 0.50 / 0.500 = 1.0, 몰 분율 X = 0.50 / (0.50 + 27.8) = 0.0177'], res: 'm = 0.50 / 0.500 = 1.0 mol/kg,  X = 0.50 / 28.3 = 0.0177' },
  ];
  const pQn = (p) => PROB[p].q.length;
  const cvSolved = (p) => S.cv.ok[p].slice(0, pQn(p)).every(Boolean);
  function cvEval(p, k, final) {
    const q = PROB[p].q[k], v = parseNum(S.cv.ans[p][k]);
    S.cv.ok[p][k] = near(v, q.v, q.tol);
    return { v, ok: S.cv.ok[p][k], bad: final && S.cv.ans[p][k] !== '' && !S.cv.ok[p][k] };
  }
  function cvGeo() {
    const L = RC.L, R = RC.R;
    const cards = PROB[S.cv.p].steps.map((_, i) => ({ i, x: R.x + 10, y: R.y + 46 + i * (PHONE ? 86 : 104), w: R.w - 20, h: PHONE ? 78 : 96 }));
    return { L, R, cards };
  }
  function cvTap(p) {
    const G = cvGeo(), c = G.cards.find((r) => inRect(p, r)); if (!c) return false;
    const pi = S.cv.p, ord = S.cv.ord[pi], perm = S.cv.perm[pi]; if (S.cv.ordDone[pi]) return true;
    const sid = perm[c.i];
    if (ord.indexOf(sid) >= 0) return true;
    if (sid === ord.length) { ord.push(sid); Sound.tick(); parts.burst(c.x + c.w - 24, c.y + 20, { count: 6, speed: 80, life: 0.4, size: 3, colors: [GOOD] }); if (ord.length === 3) { S.cv.ordDone[pi] = true; Sound.success(); } }
    else { S.cv.shake = 1; S.cv.wrongIdx = c.i; Sound.fail(); }
    return true;
  }
  function drawConv(t) {
    const L = RC.L, R = RC.R, pi = S.cv.p, P = PROB[pi], cv = S.cv;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 28, '문제 ' + (pi + 1) + '  ' + P.t, PHONE ? 14.5 : 16, INK, 'left', 800);
    let y = L.y + 52;
    y += textBlock(L.x + 14, y, L.w - 28, P.body, 14, INK, 20, 700) + 10;
    // 표
    const rh = 28, tx = L.x + 14, tw = L.w - 28;
    D.roundRect(tx, y, tw, rh * 3, 10); ctx.fillStyle = '#f7f9ff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    [['물질', '주어진 양', '몰 질량']].concat(P.rows).forEach((r, i) => { const yy = y + i * rh + 19; [0, 1, 2].forEach((k) => T(tx + 14 + k * (tw / 3), yy, r[k], 13.5, i === 0 ? MUTED : INK, 'left', 800)); });
    y += rh * 3 + 18;
    // 비커 그림
    const bx = L.x + 26, by = y, bw = 96, bh = 112, nS = pi === 0 ? 20 / 342 : pi === 1 ? 1 : 0.5, nW = pi === 0 ? 80 / 18 : pi === 1 ? 54 / 18 : 500 / 18;
    D.beaker(bx, by, bw, bh, { level: 0.72, liquid: pi === 1 ? '#fde68a' : '#f9c3e0', t, ticks: 0 });
    T(bx + bw / 2, by + bh * 0.62, pi === 0 ? '설탕물' : pi === 1 ? '에탄올' : '포도당', 13, INK, 'center', 800);
    const ix = bx + bw + 30;
    T(ix, by + 22, '용질 ' + (pi === 0 ? '20 g' : pi === 1 ? '46 g' : '0.50 mol'), 13.5, INK, 'left', 800);
    T(ix, by + 46, '용매(물) ' + (pi === 0 ? '80 g' : pi === 1 ? '54 g' : '500 g'), 13.5, INK, 'left', 800);
    T(ix, by + 70, pi === 2 ? '용질 몰수는 이미 주어졌어요' : '용질 몰수 = 질량 / 몰 질량', 12.5, MUTED, 'left', 700);
    T(ix, by + 92, '물 1 kg = 55.6 mol (18 g/mol)', 12.5, MUTED, 'left', 700);
    // 결과 영역
    const ry = by + bh + 20;
    const done = cvSolved(pi);
    D.roundRect(L.x + 14, ry, L.w - 28, L.y + L.h - ry - 12, 12); ctx.fillStyle = done ? 'rgba(20,160,88,.09)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = done ? GOOD : '#dbe3f3'; ctx.lineWidth = done ? 2.4 : 1.4; ctx.stroke();
    if (done) { T(L.x + 28, ry + 26, '✅ 정답이에요!', 15, GOOD, 'left', 800); textBlock(L.x + 28, ry + 50, L.w - 56, P.res, 13.5, INK, 19, 800); }
    else { T(L.x + 28, ry + 26, '구하는 값', 13.5, MUTED, 'left', 800); P.q.forEach((q, k) => T(L.x + 28, ry + 52 + k * 24, (cv.ok[pi][k] ? '✅ ' : '⬜ ') + q.lab + (cv.ok[pi][k] ? ' = ' + parseNum(cv.ans[pi][k]) : ' = ?'), 14, cv.ok[pi][k] ? GOOD : INK, 'left', 800)); }
    // 오른쪽: 계산 단계 카드
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '🧩 계산 단계 카드 (순서대로 눌러요)', 14, INK, 'left', 800);
    const G = cvGeo(), ord = cv.ord[pi], perm = cv.perm[pi];
    G.cards.forEach((c) => {
      const sid = perm[c.i], pos = ord.indexOf(sid), placed = pos >= 0, wrongNow = cv.shake > 0 && cv.wrongIdx === c.i;
      const sx = wrongNow ? Math.sin(cv.shake * 30) * 4 * cv.shake : 0;
      D.shadow(() => { D.roundRect(c.x + sx, c.y, c.w, c.h, 12); ctx.fillStyle = placed ? 'rgba(20,160,88,.10)' : '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = wrongNow ? BAD : placed ? GOOD : '#cfd8e8'; ctx.lineWidth = placed || wrongNow ? 2.6 : 1.6; D.roundRect(c.x + sx, c.y, c.w, c.h, 12); ctx.stroke();
      if (placed) { D.sphere(c.x + 22 + sx, c.y + 24, 13, GOOD, { gloss: false, text: String(pos + 1), textScale: 1.1 }); }
      textBlock(c.x + (placed ? 44 : 14) + sx, c.y + 24, c.w - (placed ? 56 : 28), P.steps[sid], PHONE ? 12.5 : 13, INK, PHONE ? 16 : 17.5, 800);
    });
    if (cv.ordDone[pi]) T(R.x + R.w / 2, R.y + R.h - 22, '순서를 모두 맞췄어요! 이제 답을 적어요', 13, GOOD, 'center', 800);
    else T(R.x + R.w / 2, R.y + R.h - 22, ord.length + ' / 3 · ' + ['처음 할 일', '다음 할 일', '마지막 할 일'][ord.length] + '을 눌러요', 13, MUTED, 'center', 800);
  }
  function stepConv(dt) { S.cv.shake = Math.max(0, S.cv.shake - dt * 2.2); S.mshake = S.mshake.map((v) => Math.max(0, v - dt * 2.2)); }

  /* ================= 컨트롤 · 공통 ================= */
  const solMass = () => { const s = SOL[S.sol.id]; return S.sol.k * 0.01 * s.Mm; };
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => {
      const toks = n.getAttribute('data-show').split(' ');
      n.hidden = !toks.some((tk) => { const [m, v] = tk.split(':'); return m === S.mode && (v == null || S.sub[m] === v); });
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#kdSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.kinds));
    $$('#soChips button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sol.id));
    $$('#pbChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.cv.p); b.classList.toggle('done', cvSolved(+b.dataset.v)); });
    const so = S.sol, s = SOL[so.id];
    $('#oSol').textContent = solMass().toFixed(1) + ' g (' + (so.k * 0.01).toFixed(2) + ' mol)'; $('#sSol').value = so.k; $('#solMinus').disabled = so.k <= 0; $('#solPlus').disabled = so.k >= 30;
    $('#oWat').textContent = so.w + ' g'; $('#sWat').value = so.w; $('#watMinus').disabled = so.w <= 60; $('#watPlus').disabled = so.w >= 500;
    $('#oTmp').textContent = so.T + ' °C'; $('#sTmp').value = so.T; $('#tmpMinus').disabled = so.T <= 20; $('#tmpPlus').disabled = so.T >= 80;
    $('#sSol').setAttribute('aria-label', s.nm + '의 양 (0에서 0.30 몰)');
    $('#oK').textContent = S.frac.k + '개'; $('#sK').value = S.frac.k; $('#kMinus').disabled = S.frac.k <= 0; $('#kPlus').disabled = S.frac.k >= 50;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    syncInputs();
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  function setSub(m, v) { S.sub[m] = v; updateCtl(); }
  const setK = (v) => { S.sol.k = clamp(Math.round(v), 0, 30); updateCtl(); };
  const setW = (v) => { S.sol.w = clamp(Math.round(v / 10) * 10, 60, 500); updateCtl(); };
  const setT = (v) => { S.sol.T = clamp(Math.round(v / 10) * 10, 20, 80); updateCtl(); };
  const setFK = (v) => { S.frac.k = clamp(Math.round(v), 0, 50); updateCtl(); };
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#kdSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('kinds', b.dataset.v); }));
  $$('#soChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sol.id = b.dataset.v; updateCtl(); }));
  $('#sSol').addEventListener('input', (e) => setK(+e.target.value));
  $('#solMinus').addEventListener('click', () => { Sound.tick(); setK(S.sol.k - 1); });
  $('#solPlus').addEventListener('click', () => { Sound.tick(); setK(S.sol.k + 1); });
  $('#sWat').addEventListener('input', (e) => setW(+e.target.value));
  $('#watMinus').addEventListener('click', () => { Sound.tick(); setW(S.sol.w - 10); });
  $('#watPlus').addEventListener('click', () => { Sound.tick(); setW(S.sol.w + 10); });
  $('#sTmp').addEventListener('input', (e) => setT(+e.target.value));
  $('#tmpMinus').addEventListener('click', () => { Sound.tick(); setT(S.sol.T - 10); });
  $('#tmpPlus').addEventListener('click', () => { Sound.tick(); setT(S.sol.T + 10); });
  $('#sK').addEventListener('input', (e) => setFK(+e.target.value));
  $('#kMinus').addEventListener('click', () => { Sound.tick(); setFK(S.frac.k - 1); });
  $('#kPlus').addEventListener('click', () => { Sound.tick(); setFK(S.frac.k + 1); });
  $$('#pbChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cv.p = +b.dataset.v; updateCtl(); }));
  /* 숫자 입력 */
  const in1 = $('#in1'), in2 = $('#in2');
  function syncInputs() {
    const p = S.cv.p, P = PROB[p];
    $('#lab1').textContent = P.q[0].lab; $('#lab2').textContent = P.q[1] ? P.q[1].lab : '';
    in2.hidden = $('#lab2').hidden = P.q.length < 2;
    [in1, in2].forEach((inp, k) => { const v = S.cv.ans[p][k]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', k < P.q.length && S.cv.ok[p][k] && v !== ''); if (!inp.classList.contains('ok')) inp.classList.remove('bad'); });
    $('#cvNote').textContent = S.cv.ordDone[p] ? '카드 순서를 맞췄어요. 계산한 값을 소수로 적어요.' : '먼저 오른쪽 계산 단계 카드를 순서대로 눌러 보고, 계산한 값을 소수로 적어요.';
  }
  [in1, in2].forEach((inp, k) => {
    inp.addEventListener('input', () => { const p = S.cv.p; S.cv.ans[p][k] = inp.value; const was = S.cv.ok[p][k]; cvEval(p, k, false); inp.classList.remove('bad'); inp.classList.toggle('ok', S.cv.ok[p][k]); if (S.cv.ok[p][k] && !was) { Sound.tick(); updateCtl(); } });
    inp.addEventListener('change', () => { const p = S.cv.p, r = cvEval(p, k, true); if (r.bad) { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); } });
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    const so = S.sol;
    if (S.mode === 'kinds') { if (S.sub.kinds === 'beaker') { so.id = 'sug'; so.k = 10; so.w = 100; so.T = 20; so.gsel = ''; } else { S.link = [-1, -1, -1, -1]; S.msel = -1; S.mflag = [false, false, false, false]; } }
    else if (S.mode === 'molal') { so.id = 'sug'; so.k = 10; so.w = 100; so.T = 20; }
    else if (S.mode === 'frac') S.frac.k = 5;
    else { const p = S.cv.p; S.cv.ans[p] = ['', '']; S.cv.ok[p] = [false, false]; S.cv.ord[p] = []; S.cv.ordDone[p] = false; in1.classList.remove('bad'); in2.classList.remove('bad'); }
    updateCtl();
  });

  /* ================= 포인터 ================= */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'kinds' && S.sub.kinds === 'beaker') { const id = gaugeHit(p); if (!id) return false; S.sol.gsel = S.sol.gsel === id ? '' : id; S.sol.viewed[id] = true; Sound.tick(); updateCtl(); return true; }
      if (S.mode === 'kinds') return mTap(p);
      if (S.mode === 'conv') return cvTap(p) && (updateCtl(), true);
      return false;
    },
    move() {}, up() {},
    hover(p) {
      if (S.mode === 'kinds' && S.sub.kinds === 'beaker') return gaugeHit(p) ? 'pointer' : null;
      if (S.mode === 'kinds') { const G = mGeo(); return G.left.concat(G.right).some((r) => inRect(p, r)) ? 'pointer' : null; }
      if (S.mode === 'conv') return cvGeo().cards.some((r) => inRect(p, r)) ? 'pointer' : null;
      return null;
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c; const so = S.sol, cc = cur();
    if (S.mode === 'kinds' && S.sub.kinds === 'beaker') {
      L1 = '용질 · 용매'; a = cc.mS.toFixed(1) + ' g · ' + cc.mW + ' g'; L2 = '용액 질량 · 부피'; b = cc.mT.toFixed(1) + ' g · ' + cc.V.toFixed(1) + ' mL';
      L3 = '눌러 본 농도'; c = so.gsel ? MNAME[so.gsel] + ' ' + fmtG(so.gsel, GK[so.gsel].val(cc)) : '—';
    } else if (S.mode === 'kinds') {
      const n = S.link.filter((v) => v >= 0).length; L1 = '연결한 선'; a = n + ' / 4개'; L2 = '고른 농도'; b = S.msel >= 0 ? MNAME[GORDER[S.msel]] : '—'; L3 = '분모의 뜻'; c = '용액 / 용매 / 부피 / 전체 몰수';
    } else if (S.mode === 'molal') {
      L1 = '몰랄 농도 m'; a = f2(cc.m) + ' mol/kg'; L2 = '몰 농도 M'; b = f3(cc.M) + ' mol/L'; L3 = '온도 · 용액 부피'; c = Math.round(so.Td) + ' °C · ' + cc.V.toFixed(1) + ' mL';
    } else if (S.mode === 'frac') {
      const k = S.frac.k; L1 = 'X용질'; a = f4(k / 100); L2 = 'X용매'; b = f4(1 - k / 100); L3 = '용질 : 용매 입자'; c = k + ' : ' + (100 - k);
    } else {
      const n = [0, 1, 2].filter(cvSolved).length, o = S.cv.ordDone.filter(Boolean).length; L1 = '문제'; a = (S.cv.p + 1) + '번'; L2 = '푼 문제'; b = n + ' / 3'; L3 = '카드 순서 맞춤'; c = o + ' / 3';
    }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const molalOK = () => Math.abs(cur(20).m - 1.0) < 0.005;
  const levels = [
    {
      title: '농도 종류: 같은 용액, 네 가지 값', short: '농도 종류', icon: '🧪', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 설탕물의 농도를 나타내는 방법이 왜 여러 가지일까? 온도가 변해도 변하지 않는 농도는 어느 것일까?</p>' +
        '<div class="si-link">🔗 <b>중학교와 일반선택 화학에서</b> 질량 퍼센트 농도와 몰 농도(M)를 배웠어요. 이번에는 증기압, 끓는점, 어는점을 다룰 때 쓰는 <b>몰랄 농도</b>와 <b>몰 분율</b>을 더해 네 가지를 비교해요.</div>' +
        '<p>농도는 모두 <b>(용질의 양) / (기준이 되는 양)</b>이에요. 기준, 곧 <b>분모</b>가 무엇이냐에 따라 이름과 쓰임이 달라져요. 계기판을 눌러 분모를 확인해 봐요.</p>',
      features: ['kinds'],
      setup() { S.lock = false; S.sub.kinds = 'beaker'; setMode('kinds'); },
      recap: '네 농도는 용질의 양을 서로 다른 기준(분모)으로 나눈 값이에요. 질량 %는 용액 질량, 몰 농도는 용액 부피, 몰랄 농도는 용매 질량, 몰 분율은 전체 몰수가 분모예요.',
      summary: '<ul><li>모든 농도 = (용질의 양) / (기준이 되는 양). 기준(분모)에 따라 이름이 달라요.</li><li><b>질량 퍼센트 농도</b> = 용질 질량 / <b>용액 질량</b> × 100</li><li><b>몰 농도 M</b> = 용질 몰수(mol) / <b>용액 부피(L)</b></li><li><b>몰랄 농도 m</b> = 용질 몰수(mol) / <b>용매 질량(kg)</b></li><li><b>몰 분율 X</b> = 성분의 몰수 / <b>전체 몰수</b> (단위 없음, X<sub>용질</sub> + X<sub>용매</sub> = 1)</li><li>예: 설탕 34.2 g(0.100 mol) + 물 100 g → 25.5 %, 0.82 M(20 °C), <b>1.00 m</b>, X<sub>설탕</sub> = 0.0177.</li></ul>',
      missions: [
        {
          title: '농도 이름과 분모 연결하기', manual: true,
          goal: '먼저 <b>비커 화면</b>에서 계기판 4개를 눌러 분모를 확인한 뒤, <b>🔗 분모 연결</b> 화면에서 이름과 분모를 이어 <b>✔ 확인하기</b>를 눌러요.',
          hint: '질량 %는 용액 전체의 질량, 몰 농도는 용액의 부피(L), 몰랄 농도는 용매인 물만의 질량(kg), 몰 분율은 용질과 용매를 합한 전체 몰수예요.',
          setup() { S.lock = true; S.sub.kinds = 'beaker'; S.sol.id = 'sug'; S.sol.k = 10; S.sol.w = 100; S.sol.T = 20; S.sol.gsel = ''; S.sol.viewed = {}; S.link = [-1, -1, -1, -1]; S.msel = -1; S.mflag = [false, false, false, false]; setMode('kinds'); },
          check: () => matchCheck(),
          status: () => '확인한 계기판 ' + GORDER.filter((id) => S.sol.viewed[id]).length + ' / 4 &nbsp; 연결 ' + S.link.filter((v) => v >= 0).length + ' / 4',
          explain: '<b>질량 %</b>는 용질 질량을 <b>용액 질량</b>으로, <b>몰 농도</b>는 용질 몰수를 <b>용액 부피(L)</b>로, <b>몰랄 농도</b>는 용질 몰수를 <b>용매 질량(kg)</b>으로, <b>몰 분율</b>은 성분의 몰수를 <b>전체 몰수</b>로 나눈 값이에요. 같은 설탕물(34.2 g + 물 100 g)이 25.5 %, 0.82 M, 1.00 m, 0.0177로 서로 다르게 나타나요.',
        },
        {
          type: 'quiz', title: '몰 농도와 몰랄 농도의 차이',
          goal: '몰 농도(M)와 몰랄 농도(m)의 가장 큰 차이는?',
          setup() { S.lock = true; S.sub.kinds = 'beaker'; setMode('kinds'); },
          choices: ['몰 농도의 분모는 용액의 부피(L), 몰랄 농도의 분모는 용매의 질량(kg)이에요', '몰 농도는 용질의 질량을, 몰랄 농도는 용질의 몰수를 써요', '이름만 다르고 두 값은 항상 같아요', '몰 농도의 분모는 용매의 부피(L)예요'],
          answer: 0,
          feedback: ['', '두 농도 모두 분자는 용질의 몰수예요. 다른 것은 분모예요.', '분모가 달라서 값도 달라요. 설탕 34.2 g + 물 100 g은 0.82 M이지만 1.00 m이에요.', '몰 농도의 분모는 용매가 아니라 용액 전체의 부피예요.'],
          explain: '두 농도 모두 분자는 <b>용질의 몰수</b>예요. 몰 농도는 <b>용액의 부피(L)</b>로, 몰랄 농도는 <b>용매의 질량(kg)</b>으로 나눠요. 부피는 온도에 따라 변하지만 질량은 변하지 않는다는 점이 중요해요.',
        },
      ],
    },
    {
      title: '몰랄 농도: 온도가 변해도 그대로', short: '몰랄 농도', icon: '⚖️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 몰랄 농도의 분모가 용매의 질량(kg)이라는 것을 확인했어요. 질량은 온도가 변해도 그대로이니, 몰랄 농도도 그럴까요?</div>' +
        '<p><b>m = 용질의 몰수(mol) / 용매의 질량(kg)</b>이에요. 설탕(342 g/mol) 34.2 g은 0.100 mol이에요. 설탕과 물의 양을 바꾸며 m을 읽고, 온도를 20 °C에서 80 °C로 올려 몰 농도와 비교해요.</p>',
      features: ['molal'],
      setup() { S.lock = false; S.sol.id = 'sug'; setMode('molal'); },
      recap: '몰랄 농도는 용질의 몰수와 용매의 질량만으로 정해지므로 온도가 변해도 그대로예요. 몰 농도는 용액의 부피가 늘어나는 만큼 줄어들어요.',
      summary: '<ul><li><b>m = 용질 몰수 / 용매 질량(kg)</b>. 설탕 34.2 g(0.100 mol) + 물 100 g → <b>1.00 mol/kg</b>.</li><li>용질의 몰수가 같으면 같은 m(포도당 18 g도 0.10 mol), 같은 질량이면 다른 m이에요. 물을 2배로 하면 m은 절반이 돼요.</li><li>20 °C → 80 °C: 용액의 부피가 약 2 % 늘어 <b>몰 농도(M)는 약 2 % 감소</b>해요(1.00 M → 약 0.98 M).</li><li>질량과 몰수는 온도가 변해도 그대로이므로 <b>몰랄 농도 m과 몰 분율 X는 변하지 않아요</b>.</li></ul>',
      missions: [
        {
          title: '몰랄 농도 1.00 용액 만들기',
          goal: '설탕 34.2 g(0.100 mol)을 물 100 g에 녹인 것과 같은 <b>m = 1.00 mol/kg</b> 설탕물을 만들어요.',
          hint: '설탕 0.10 mol(34.2 g)과 물 100 g이면 0.100 mol / 0.100 kg = 1.00이에요. 설탕을 2배로 하면 물도 2배로 해요.',
          setup() { S.lock = true; S.sol.id = 'sug'; S.sol.k = 5; S.sol.w = 80; S.sol.T = 20; setMode('molal'); },
          check: () => molalOK(), hold: 0.8,
          status: () => 'm = ' + f2(cur().m) + ' mol/kg ' + mark(molalOK()),
          explain: '<b>m = 0.100 mol / 0.100 kg = 1.00 mol/kg</b>예요. 물을 더 넣으면 용매의 질량이 커져 m이 작아지고(200 g이면 0.50 m), 설탕을 더 넣으면 m이 커져요. 몰수가 같다면 용질이 설탕이든 포도당이든 같은 m이에요.',
        },
        {
          title: '80 °C까지 가열하기',
          goal: '설탕 34.2 g + 물 100 g(1.00 m) 설탕물을 <b>80 °C</b>까지 가열하며 <b>몰 농도(M)</b>와 <b>몰랄 농도(m)</b>가 어떻게 달라지는지 비교해요.',
          hint: '온도 슬라이더를 오른쪽 끝(80 °C)으로 옮겨요. 비커 옆 확대 눈금에서 액면이 올라가는 것과 계기판의 M, m 값을 비교해요.',
          setup() { S.lock = true; S.sol.id = 'sug'; S.sol.k = 10; S.sol.w = 100; S.sol.T = 20; S.sol.Td = 20; setMode('molal'); },
          check: () => S.sol.T === 80 && S.sol.Td > 79.5, hold: 0.6,
          status: () => '온도 ' + Math.round(S.sol.Td) + ' °C ' + mark(S.sol.T === 80 && S.sol.Td > 79.5) + ' &nbsp; M ' + f3(cur().M) + ' · m ' + f2(cur().m),
          explain: '20 °C에서 80 °C로 가열하면 용액의 부피가 약 2 % 늘어 <b>몰 농도는 0.824 → 0.805 mol/L로 약 2 % 줄어요</b>(1.00 M이었다면 약 0.98 M). 하지만 설탕의 몰수와 물의 질량은 그대로이므로 <b>몰랄 농도는 1.00 mol/kg 그대로</b>예요.',
        },
        {
          type: 'quiz', title: '온도가 변해도 변하지 않는 농도',
          goal: '용액의 온도를 올려도 값이 변하지 않는 농도끼리 짝지은 것은?',
          setup() { S.lock = true; setMode('molal'); },
          choices: ['몰 농도, 몰랄 농도', '몰랄 농도, 몰 분율', '몰 농도, 몰 분율', '몰 농도만 변하지 않아요'],
          answer: 1,
          feedback: ['몰 농도는 분모인 용액의 부피가 온도에 따라 변하므로 값이 변해요.', '', '몰 농도는 부피 때문에 변해요. 몰 분율은 몰수의 비라서 변하지 않아요.', '반대예요. 부피를 분모로 쓰는 몰 농도만 값이 변해요.'],
          explain: '질량 퍼센트 농도, 몰랄 농도, 몰 분율은 분모가 <b>질량이나 몰수</b>라서 온도가 변해도 그대로예요. <b>몰 농도</b>만 분모인 용액의 부피가 변해서 값이 달라져요. 그래서 온도가 변하는 성질(끓는점, 어는점 등)을 다룰 때는 몰랄 농도나 몰 분율을 써요.',
        },
      ],
    },
    {
      title: '몰 분율: 입자 100개로 보기', short: '몰 분율', icon: '🔢', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질량과 몰수를 쓰는 농도는 온도가 변해도 그대로라는 것을 확인했어요. 몰 분율은 입자 <b>수의 비율</b>을 그대로 보여 주는 농도예요.</div>' +
        '<p><b>X<sub>용질</sub> = 용질의 몰수 / (용질의 몰수 + 용매의 몰수)</b>예요. 입자 100개 중 용질 입자의 개수를 바꾸며 몰 분율과 몰랄 농도를 비교해 봐요. 다음 차시의 증기압 내림에서 이 값이 중요해요.</p>',
      features: ['frac'],
      setup() { S.lock = false; setMode('frac'); },
      recap: '몰 분율은 전체 입자 중 그 성분의 비율이고, X용질 + X용매 = 1이에요. 묽은 용액에서는 X ≈ m / 55.6이지만 진한 용액에서는 맞지 않아요.',
      summary: '<ul><li><b>X = 성분의 몰수 / 전체 몰수</b>. 단위가 없고 X<sub>용질</sub> + X<sub>용매</sub> = 1이에요.</li><li>1.00 m 수용액(물 1 kg = 55.6 mol)에서 X<sub>용질</sub> = 1 / 56.6 = <b>0.0177</b>. 입자 100개 중 용질은 약 2개뿐이에요.</li><li>묽은 용액에서는 <b>X<sub>용질</sub> ≈ m / 55.6</b>(1 m → 0.0180, 0.5 m → 0.0090)이지만, 진한 용액에서는 맞지 않아요(에탄올 1 : 3 몰비: X = 0.25, m = 18.5 → m / 55.6 = 0.33).</li><li>에탄올 1 mol + 물 3 mol → X<sub>에탄올</sub> = 1 / (1 + 3) = <b>0.25</b>.</li></ul>',
      missions: [
        {
          title: '몰 분율 0.05 만들기',
          goal: '입자 100개 중 용질 입자가 <b>5개</b>가 되도록 해서 <b>X<sub>용질</sub> = 0.05</b>를 만들어요.',
          hint: '용질 입자 수 슬라이더를 5개에 맞춰요. 몰 분율은 용질 5개 / 전체 100개예요.',
          setup() { S.lock = true; S.frac.k = 15; setMode('frac'); },
          check: () => S.frac.k === 5 && S.frac.kd === 5, hold: 0.6,
          status: () => '용질 입자 ' + S.frac.k + '개 → X = ' + f4(S.frac.k / 100) + ' ' + mark(S.frac.k === 5),
          explain: '<b>X<sub>용질</sub> = 5 / 100 = 0.05</b>이고 X<sub>용매</sub> = 95 / 100 = 0.95예요. 두 값을 더하면 언제나 1이에요. 같은 용액의 몰랄 농도는 m = 5 / (95 × 0.018 kg) = 2.9 mol/kg이에요.',
        },
        {
          title: '묽은 쪽과 진한 쪽의 근사 비교',
          goal: '용질 입자를 <b>1 ~ 2개</b>(묽은 용액)와 <b>40개 이상</b>(진한 용액)으로 각각 맞추고, 근사값 m / 55.6과 실제 X를 비교해요.',
          hint: '슬라이더를 왼쪽 끝 가까이(1 ~ 2개)로 옮겨 오차를 읽고, 이어서 오른쪽(40개 이상)으로 옮겨 오차를 읽어요.',
          setup() { S.lock = true; S.frac.k = 5; S.frac.seenD = false; S.frac.seenC = false; setMode('frac'); },
          check: () => S.frac.seenD && S.frac.seenC, hold: 0.6,
          status: () => '묽은 용액(1 ~ 2개) ' + mark(S.frac.seenD) + ' &nbsp; 진한 용액(40개 이상) ' + mark(S.frac.seenC),
          explain: '묽은 용액(용질 1개: m = 0.56)에서는 m / 55.6 = 0.0101이 실제 X = 0.0100과 거의 같아요(오차 약 1 %). 하지만 진한 용액(용질 50개: m = 55.6)에서는 근사값이 1.00으로 실제 X = 0.50의 두 배예요. 분모의 용질 몰수를 무시하는 근사이기 때문이에요.',
        },
        {
          type: 'quiz', title: '에탄올과 물의 몰비 1 : 3',
          goal: '에탄올과 물을 몰비 <b>1 : 3</b>으로 섞은 용액에서 에탄올의 몰 분율은?',
          setup() { S.lock = true; setMode('frac'); },
          choices: ['1 / 3 ≈ 0.33', '1 / (1 + 3) = 0.25', '3 / (1 + 3) = 0.75', '1 / 2 = 0.50'],
          answer: 1,
          feedback: ['분모에 용매의 몰수(3)만 쓰면 안 돼요. 분모는 전체 몰수예요.', '', '0.75는 물의 몰 분율이에요. 에탄올의 몰 분율은 1 / 4예요.', '몰수가 1 : 3이므로 전체 몰수는 4예요.'],
          explain: '전체 몰수는 1 + 3 = 4 mol이므로 <b>X<sub>에탄올</sub> = 1 / 4 = 0.25</b>이고 X<sub>물</sub> = 3 / 4 = 0.75예요. 두 값의 합은 1이에요.',
        },
      ],
    },
    {
      title: '농도 변환: 질량에서 m과 X까지', short: '농도 변환', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 몰랄 농도와 몰 분율의 뜻을 확인했어요. 이제 질량이나 몰수로 주어진 용액을 두 농도로 직접 바꾸어 계산해요.</div>' +
        '<p>어떤 농도든 <b>질량 → 몰수 → 비(분모로 나누기)</b> 순서로 계산해요. 문제 3개에서 계산 단계 카드를 순서대로 누르고 답을 소수로 적어요.</p>',
      features: ['conv'],
      setup() { S.lock = false; setMode('conv'); },
      recap: '농도를 바꿀 때는 질량을 몰수로 바꾼 뒤(g / 몰 질량), 알맞은 분모(용매 kg 또는 전체 몰수)로 나누어요. 분모에 용액 질량을 쓰지 않도록 주의해요.',
      summary: '<ul><li>계산 순서: <b>질량 → 몰수(g / 몰 질량) → 비(분모로 나누기)</b>.</li><li>설탕 20 질량 %(설탕 20 g + 물 80 g): 20 / 342 = 0.0585 mol, 물 0.080 kg → <b>m = 0.73 mol/kg</b>.</li><li>에탄올 46 g + 물 54 g: 1.0 mol과 3.0 mol → <b>X = 0.25</b>, <b>m = 1.0 / 0.054 = 18.5 mol/kg</b> (진한 용액에서는 X와 m이 비례하지 않아요).</li><li>포도당 0.50 mol + 물 500 g: <b>m = 1.0</b>, X = 0.50 / (0.50 + 27.8) = <b>0.0177</b>.</li><li>몰랄 농도의 분모는 <b>용매</b>의 질량이에요. 용액의 질량을 쓰면 틀려요.</li></ul>',
      missions: [
        {
          title: '농도 변환 문제 3개',
          goal: '문제 1 ~ 3의 값을 모두 계산해서 적어요. (소수로, 오차 범위 안이면 정답이에요)',
          hint: '문제마다 오른쪽 계산 단계 카드를 먼저 순서대로 눌러 보면 계산 순서를 알 수 있어요. 몰랄 농도는 용매의 kg으로 나눠요.',
          setup() { S.lock = true; S.cv.p = 0; S.cv.ans = [['', ''], ['', ''], ['', '']]; S.cv.ok = [[false, false], [false, false], [false, false]]; S.cv.ord = [[], [], []]; S.cv.ordDone = [false, false, false]; setMode('conv'); },
          check: () => [0, 1, 2].every(cvSolved), hold: 0.4,
          status: () => '문제 1 ' + mark(cvSolved(0)) + ' &nbsp; 문제 2 ' + mark(cvSolved(1)) + ' &nbsp; 문제 3 ' + mark(cvSolved(2)),
          explain: '문제 1: 20 g / 342 g/mol = 0.0585 mol, 물 80 g = 0.080 kg → <b>m = 0.73</b>. 문제 2: 에탄올 1.0 mol, 물 3.0 mol → <b>X = 0.25</b>, <b>m = 1.0 / 0.054 = 18.5</b>. 문제 3: 포도당 0.50 mol, 물 500 g(27.8 mol) → <b>m = 1.0</b>, <b>X = 0.0177</b>.',
        },
        {
          title: '계산 단계 카드 순서 맞추기', manual: true,
          goal: '문제 1, 2, 3 각각에서 계산 단계 카드 3장을 <b>처음 할 일부터 순서대로</b> 눌러요. 모두 마치면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '순서는 ① 질량을 몰수로(또는 단위를 맞추기) → ② 분모가 될 양 구하기 → ③ 나누어 값 구하기예요. 틀린 카드를 누르면 흔들려요.',
          setup() { S.lock = true; S.cv.p = 0; setMode('conv'); },
          check() { const r = [0, 1, 2].filter((p) => !S.cv.ordDone[p]); return r.length ? '문제 ' + r.map((p) => p + 1).join(', ') + '의 계산 단계 카드를 아직 순서대로 누르지 않았어요.' : true; },
          status: () => '순서 맞춤 ' + S.cv.ordDone.filter(Boolean).length + ' / 3',
          explain: '어떤 문제든 <b>질량을 몰수로</b> 바꾸는 단계가 먼저예요. 그 다음 <b>분모(용매 kg 또는 전체 몰수)</b>를 구하고, 마지막에 나누어 값을 구해요. 이 순서를 지키면 몰랄 농도, 몰 분율, 퍼센트 농도 어떤 변환도 같은 방법으로 풀 수 있어요.',
        },
        {
          type: 'quiz', title: '틀린 계산 찾기',
          goal: '설탕 34.2 g(0.100 mol)을 물 100 g에 녹인 용액의 몰랄 농도를 구한 풀이 중 <b>틀린 것</b>은?',
          setup() { S.lock = true; setMode('conv'); },
          choices: ['m = 0.100 mol / 0.100 kg = 1.00 mol/kg', 'm = 0.100 mol / 0.1342 kg = 0.745 mol/kg (분모에 용액의 질량을 썼어요)', '0.100 mol은 34.2 g / 342 g/mol로 구했고, 분모는 물 100 g = 0.100 kg이에요', 'm = 0.100 mol / (100 / 1000 kg) = 1.00 mol/kg'],
          answer: 1,
          feedback: ['분모에 용매인 물의 질량 0.100 kg을 쓴 올바른 풀이예요.', '', '몰수와 용매 질량을 모두 올바르게 구했어요.', '100 g = 0.100 kg으로 바꿔서 쓴 올바른 풀이예요.'],
          explain: '몰랄 농도의 분모는 <b>용매의 질량</b>이에요. 용액의 질량(설탕 + 물 = 134.2 g)을 쓰면 0.745로 잘못된 값이 나와요. 올바른 값은 0.100 / 0.100 = <b>1.00 mol/kg</b>이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-concentration', mount: '#game', badge: '농도 변환 달인', homeHref: '../../index.html#hx',
    featureLabels: { kinds: '🧪 비커 · 농도 계기판', molal: '⚖️ 몰랄 농도 실험', frac: '🔢 입자 격자와 도넛 그래프', conv: '🧮 농도 변환 문제' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setMode('kinds');
  (function () { const c = cur(); GORDER.forEach((id) => { gv[id] = GK[id].val(c); }); PS.forEach((p, i) => { p.kt = i < targetSolute(c) ? 1 : 0; p.k = p.kt; }); })();
  function stepAll1(dt) {
    stepSol(dt); stepFrac(dt); stepConv(dt);
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
    const c = cur();
    if (S.mode === 'kinds') { if (S.sub.kinds === 'beaker') { drawBeaker(t, c, S.sol.gsel); drawGauges(t, c); } else { drawMatch(t); drawMatchInfo(t); } }
    else if (S.mode === 'molal') { drawBeaker(t, c, S.sol.gsel); drawGauges(t, c); }
    else if (S.mode === 'frac') { drawFracGrid(t); drawFracInfo(t); }
    else drawConv(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, SOL, GK, GORDER, PROB, PS, calc, cur, setMode, setSub, setK, setW, setT, setFK, gaugeRects, mGeo, cvGeo, matchCheck, cvSolved, cvEval, frM, frX, mDone,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
