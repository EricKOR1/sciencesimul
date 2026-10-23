/* =========================================================
   물질과 에너지 Ⅰ. 물질의 세 가지 상태 - 혼합 기체와 분압 [12물에01-02]
   ① 관찰: 분압의 합 (He · N₂ · O₂를 차례로 넣어 분압 막대를 쌓기, P(전체) = ΣP(성분))
   ② 탐구: 몰 분율 (P_A = X_A × P(전체), X_A = n_A / n(전체))
   ③ 분석: 분압 계산 (연결 용기, 물 위 포집 수증기압 보정, 공기와 고도)
   ④ 적용: 혼합 기체 설계 (잠수 깊이 → 전체 압력, 산소 분압 0.16 ~ 1.4 atm)
   이상 기체 혼합물을 가정해요. 용해도(헨리 법칙)와 Kp는 다루지 않아요.
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
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706';
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
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fx = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const f2 = (v) => fx(v, 2), f1 = (v) => fx(v, 1), f3 = (v) => fx(v, 3);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  /* ---------- 자료 ---------- */
  const R = 0.082, VOL = 12.3, TK = 300;
  const RTV = R * TK / VOL;                  // 2.0 atm/mol (12.3 L, 300 K)
  const PART = 0.05;
  const GK = ['he', 'n2', 'o2'];
  const G = {
    he: { f: 'He', name: '헬륨 He', M: 4, c: '#f2b705', n: 0.20, k: 1.8 },
    n2: { f: 'N₂', name: '질소 N₂', M: 28, c: '#3867f4', n: 0.30, k: 1.0 },
    o2: { f: 'O₂', name: '산소 O₂', M: 32, c: '#e2464b', n: 0.50, k: 0.92 },
  };
  const ALT = [[0, 1.0], [2, 0.78], [4, 0.61], [6, 0.47], [8, 0.36]];
  const presAt = (km) => { for (let i = 1; i < ALT.length; i++) if (km <= ALT[i][0]) { const a = ALT[i - 1], b = ALT[i], u = (km - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], u); } return ALT[ALT.length - 1][1]; };
  const AIR = [['N₂', 0.78, '#3867f4'], ['O₂', 0.21, '#e2464b'], ['Ar', 0.01, '#10b981']];
  const PVAP = 0.023;                        // 20 °C 물의 포화 증기압 (17.5 mmHg)
  const VAP_PO2 = 1.00 - PVAP;               // 0.977
  const VAP_N = VAP_PO2 * 0.50 / (R * 293);  // 0.0203 mol
  const VAP_W = VAP_N * 32;                  // 0.65 g
  const CONN = { He: { V: 2.0, P: 3.0 }, N2: { V: 6.0, P: 1.0 } };
  const CONN_P = { he: CONN.He.P * CONN.He.V / 8.0, n2: CONN.N2.P * CONN.N2.V / 8.0 };   // 0.75, 0.75
  const O2_LO = 0.16, O2_HI = 1.4, NARC = 3.2;

  /* ---------- 배치 ---------- */
  const RC = {
    two: { L: PHONE ? { x: 8, y: 50, w: 464, h: 352 } : { x: 12, y: 50, w: 384, h: 498 }, R: PHONE ? { x: 8, y: 410, w: 464, h: 340 } : { x: 404, y: 50, w: 384, h: 498 } },
    calc: { L: PHONE ? { x: 8, y: 50, w: 464, h: 800 } : { x: 12, y: 50, w: 776, h: 498 } },
    dive: { L: PHONE ? { x: 8, y: 50, w: 464, h: 380 } : { x: 12, y: 50, w: 430, h: 498 }, R: PHONE ? { x: 8, y: 438, w: 464, h: 500 } : { x: 450, y: 50, w: 338, h: 498 } },
  };
  const MODE_LABEL = { sum: '🫧 분압의 합', frac: '🎚️ 몰 분율과 분압', calc: '🧮 분압 계산', dive: '🤿 잠수용 혼합 기체 설계' };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'sum', fade: 0, lock: false, gate: '', sub: { calc: 'conn' }, t: 0,
    sum: { inj: { he: 0, n2: 0, o2: 0 }, q: { he: 0, n2: 0, o2: 0 }, nextT: 0, sumOk: false, disp: { he: 0, n2: 0, o2: 0 } },
    frac: { nO: 10, seen: {}, ok: false, disp: { he: 0, n2: 0, o2: 0 } },
    cn: { open: false, openP: 0, ok: [false, false, false] },
    vp: { ok: [false, false], t: 0 },
    air: { alt: 0 },
    dv: { depth: 40, o2: 21, dil: 'n2', anim: 40 },
    pulse: { he: 0, n2: 0, o2: 0 }, flash: [],
  };
  let game = null;

  /* ---------- 입자 ---------- */
  let PS = [];                                    // 분압의 합 · 몰 분율 용기 (좌표: 용기 안, y는 아래로)
  const BOX = PHONE ? { x: 8 + 44, y: 50 + 84, w: 200, h: 216 } : { x: 12 + 36, y: 50 + 112, w: 200, h: 250 };
  function mkP(g, x, y) { const th = rnd(0, TAU); return { g, x: x == null ? rnd(8, BOX.w - 8) : x, y: y == null ? rnd(8, BOX.h - 8) : y, ux: Math.cos(th), uy: Math.sin(th), m: rnd(0.82, 1.18), ang: rnd(0, TAU), spin: rnd(-2, 2), fade: 1, dying: false }; }
  const countOf = (g) => PS.filter((p) => p.g === g && !p.dying).length;
  function setCount(g, n) {
    let live = PS.filter((p) => p.g === g && !p.dying);
    for (let i = live.length; i < n; i++) { const p = mkP(g); p.fade = 0; PS.push(p); }
    for (let i = live.length - 1; i >= n; i--) live[i].dying = true;
  }
  const spd = (g) => (PHONE ? 62 : 80) * G[g].k;
  function stepBox(dt, w, h, bounds) {
    for (let i = PS.length - 1; i >= 0; i--) {
      const p = PS[i];
      if (p.dying) { p.fade -= dt * 4; if (p.fade <= 0) { PS.splice(i, 1); continue; } } else if (p.fade < 1) p.fade = Math.min(1, p.fade + dt * 4);
      const v = spd(p.g) * p.m * dt; p.x += p.ux * v; p.y += p.uy * v; p.ang += p.spin * dt;
      const b = bounds ? bounds(p) : [0, w], r = 5;
      let hit = false;
      if (p.x < b[0] + r) { p.x = b[0] + r; p.ux = Math.abs(p.ux); hit = true; } else if (p.x > b[1] - r) { p.x = b[1] - r; p.ux = -Math.abs(p.ux); hit = true; }
      if (p.y < r) { p.y = r; p.uy = Math.abs(p.uy); hit = true; } else if (p.y > h - r) { p.y = h - r; p.uy = -Math.abs(p.uy); hit = true; }
      if (hit && !p.dying && p.fade > 0.9) { S.pulse[p.g] = Math.min(1, S.pulse[p.g] + 0.18); if (S.flash.length < 16) S.flash.push({ g: p.g, x: p.x, y: p.y, age: 0 }); }
    }
  }
  function molDraw(g, x, y, ang, s, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    const sp = (px, r, col) => D.sphere(px * s, 0, r * s, col, { gloss: r * s > 4 });
    if (g === 'he') sp(0, 4.8, '#f2b705');
    else if (g === 'n2') { sp(-3.6, 3.6, '#3867f4'); sp(3.6, 3.6, '#3867f4'); }
    else if (g === 'o2') { sp(-4, 4, '#e2464b'); sp(4, 4, '#e2464b'); }
    else if (g === 'w') { sp(0, 3.4, '#38bdf8'); sp(-3.6, 2, '#e0f2fe'); sp(3.6, 2, '#e0f2fe'); }
    ctx.restore();
  }
  function drawBox(bx, by, bw, bh, t, opts) {
    opts = opts || {};
    ctx.fillStyle = 'rgba(235,242,255,.7)'; D.roundRect(bx, by, bw, bh, 6); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    PS.forEach((p) => molDraw(p.g, bx + p.x, by + p.y, p.ang, 1.1, p.fade));
    S.flash.forEach((f) => { const a = 1 - f.age / 0.2; if (a > 0) D.glow(bx + f.x, by + f.y, 12, G[f.g].c, a * 0.8); });
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3.4; D.roundRect(bx, by, bw, bh, 6); ctx.stroke();
    void t;
  }

  /* ================= ① ② 분압 막대 장면 ================= */
  function twoTotals() {
    const cnt = (g) => (S.mode === 'sum' ? countOf(g) : countOf(g));
    const n = {}; GK.forEach((g) => { n[g] = cnt(g) * PART; });
    return n;
  }
  function drawTwo(t) {
    const L = RC.two.L, Rr = RC.two.R, frac = S.mode === 'frac';
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 부피 12.3 L · 300 K의 용기', 14.5, INK, 'left', 800);
    // 주입 장치
    const nz = [0, 1, 2].map((i) => BOX.x + 36 + i * 64);
    if (!frac) GK.forEach((g, i) => {
      const x = nz[i], y0 = BOX.y - 26, done = S.sum.inj[g] > 0;
      ctx.fillStyle = done ? '#c8d0df' : G[g].c; D.roundRect(x - 9, y0 - 30, 18, 34, 4); ctx.fill();
      ctx.fillStyle = '#7d8da6'; ctx.fillRect(x - 4, y0 + 2, 8, 24);
      T(x, y0 - 36, G[g].f, 13.5, G[g].c, 'center', 800);
      if (S.sum.q[g] > 0 && !RM) { const ph = (t * 3) % 1; D.sphere(x, y0 + 8 + ph * 18, 3, G[g].c, { gloss: false }); }
    });
    drawBox(BOX.x, BOX.y, BOX.w, BOX.h, t);
    // 압력계
    const tot = Object.values(S.sum.disp).reduce((a, b) => a + b, 0), totF = frac ? Object.values(S.frac.disp).reduce((a, b) => a + b, 0) : tot;
    const gx = PHONE ? L.x + 360 : L.x + 322, gy = L.y + (PHONE ? 120 : 150), gr = PHONE ? 52 : 52;
    D.dial(gx, gy, gr, clamp(totF, 0, 2.5), 0, 2.5, { label: 'atm', ticks: 5, color: BAD });
    T(gx, gy + gr + 26, 'P(전체)', 13.5, MUTED, 'center', 700);
    T(gx, gy + gr + 48, f2(totF) + ' atm', 17, INK, 'center', 800);
    const ny = gy + gr + (PHONE ? 78 : 80);
    T(gx, ny, 'RT / V = 2.0 atm/mol', 12.5, MUTED, 'center', 700);
    T(gx, ny + 18, '(12.3 L, 300 K)', 12.5, MUTED, 'center', 700);
    // 입자 범례
    if (!PHONE) {
      GK.forEach((g, i) => { molDraw(g, L.x + 22, L.y + 392 + i * 30, 0, 1.2); T(L.x + 40, L.y + 397 + i * 30, G[g].name + ' ' + countOf(g) + '개 (' + f2(countOf(g) * PART) + ' mol)', 14, INK, 'left', 800); });
      T(L.x + 14, L.y + L.h - 10, '입자 1개 = 0.05 mol', 13, MUTED, 'left', 700);
    } else {
      GK.forEach((g, i) => { molDraw(g, L.x + 22 + i * 150, L.y + 322, 0, 1.2); T(L.x + 38 + i * 150, L.y + 327, G[g].f + ' ' + countOf(g) + '개', 13.5, INK, 'left', 800); });
    }
    // 막대 패널
    panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    T(Rr.x + 14, Rr.y + 26, frac ? '📊 몰 분율 X와 분압 P' : '📊 분압 막대 (atm)', 14.5, INK, 'left', 800);
    const disp = frac ? S.frac.disp : S.sum.disp;
    const ax = Rr.x + (PHONE ? 70 : 86), aw = Rr.w - (PHONE ? 70 : 86) - 90, rowH = PHONE ? 54 : 62, y0 = Rr.y + 56, sc = aw / 2.2;
    GK.forEach((g, i) => {
      const y = y0 + i * rowH, n = countOf(g) * PART, v = disp[g];
      molDraw(g, Rr.x + 26, y + 20, 0, 1.2); T(Rr.x + 42, y + 25, G[g].f, 15, G[g].c, 'left', 800);
      D.roundRect(ax, y + 8, aw, 24, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      if (v > 0.004) { ctx.save(); D.roundRect(ax, y + 8, aw, 24, 8); ctx.clip(); ctx.fillStyle = G[g].c; ctx.fillRect(ax, y + 8, Math.min(aw, v * sc), 24); ctx.restore(); if (S.pulse[g] > 0.05) D.glow(ax + Math.min(aw, v * sc), y + 20, 20, '#ffffff', S.pulse[g] * 0.8); }
      T(ax + aw + 8, y + 26, f2(v) + ' atm', 14.5, INK, 'left', 800);
      if (frac) T(ax, y + 48, 'X = ' + f2(n / (nTot() || 1)) + '  →  P = ' + f2(n / (nTot() || 1)) + ' × ' + f2(RTV * nTot()) + ' = ' + f2(n * RTV) + ' atm', 12.5, MUTED, 'left', 700);
      else T(ax, y + 48, '혼자 이 용기를 채워도 ' + f2(n * RTV) + ' atm', 12.5, MUTED, 'left', 700);
    });
    // 축
    const ay = y0 + 3 * rowH + 2;
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + aw, ay); ctx.stroke();
    [0, 0.5, 1, 1.5, 2].forEach((v) => { const x = ax + v * sc; ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, ay + 5); ctx.stroke(); T(x, ay + 20, String(v), 13, MUTED, 'center', 700); });
    // 쌓은 막대
    const sy = ay + 40;
    T(Rr.x + 14, sy + 4, '쌓으면 전체 압력', 13.5, INK, 'left', 800);
    D.roundRect(ax, sy + 14, aw, 30, 9); ctx.fillStyle = '#eef1f7'; ctx.fill();
    let acc = 0; ctx.save(); D.roundRect(ax, sy + 14, aw, 30, 9); ctx.clip();
    GK.forEach((g) => { const w = Math.min(aw - acc, disp[g] * sc); if (w > 0) { ctx.fillStyle = G[g].c; ctx.fillRect(ax + acc, sy + 14, w, 30); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(ax + acc, sy + 14, w, 30); acc += w; } });
    ctx.restore();
    T(ax + aw + 8, sy + 36, f2(totF) + ' atm', 15, '#14803f', 'left', 800);
    const parts3 = GK.map((g) => f2(disp[g])).join(' + ');
    textBlock(Rr.x + 14, sy + 70, Rr.w - 28, 'P(전체) = P(He) + P(N₂) + P(O₂)\n= ' + parts3 + ' = ' + f2(totF) + ' atm', 14, '#14803f', 22, 800);
    if (!frac) textBlock(Rr.x + 14, sy + (PHONE ? 118 : 128), Rr.w - 28, '다른 기체가 함께 있어도 한 기체의 분압은 변하지 않아요. 각 기체가 혼자서 같은 용기를 채울 때의 압력이에요.', 13.5, MUTED, 18, 700);
    else {
      const nO = S.frac.nO, X = nO / 20;
      textBlock(Rr.x + 14, sy + (PHONE ? 118 : 128), Rr.w - 28, 'P(O₂) / P(전체) = ' + f2(X * 2.0) + ' / 2.00 = ' + f2(X) + ' = X(O₂). 분압은 몰 분율에 비례해요: P(A) = X(A) × P(전체)', 13.5, '#5b21b6', 18, 800);
    }
  }
  const nTot = () => GK.reduce((a, g) => a + countOf(g) * PART, 0);

  /* ---------- ① 컨트롤 ---------- */
  GK.forEach((g) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'gbtn'; b.dataset.g = g; b.innerHTML = G[g].f + '<small>' + f2(G[g].n) + ' mol 넣기</small>'; b.style.borderColor = G[g].c; $('#injRow').appendChild(b); });
  $('#injRow').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const g = b.dataset.g;
    if (S.sum.inj[g] > 0) return; Sound.click(); S.sum.inj[g] = G[g].n; S.sum.q[g] = Math.round(G[g].n / PART); updateCtl();
  });
  function sumReset() { S.sum.inj = { he: 0, n2: 0, o2: 0 }; S.sum.q = { he: 0, n2: 0, o2: 0 }; S.sum.sumOk = false; $('#inSum').value = ''; $('#inSum').classList.remove('ok', 'bad'); PS = []; S.flash = []; updateCtl(); }
  $('#bEmpty').addEventListener('click', () => { Sound.click(); sumReset(); });
  $('#inSum').addEventListener('input', () => { const v = parseNum($('#inSum').value), inp = $('#inSum'); inp.classList.remove('ok', 'bad'); S.sum.sumOk = near(v, 2.0, 0.015); if (S.sum.sumOk) inp.classList.add('ok'); else if (!isNaN(v) && inp.value.length >= 2) inp.classList.add('bad'); });

  /* ---------- ② 컨트롤 ---------- */
  const fracCounts = (nO) => { const r = 20 - nO, he = Math.round(0.4 * r); return { he, n2: r - he, o2: nO }; };
  function setNO(n) { S.frac.nO = clamp(Math.round(n), 0, 20); S.frac.seen[S.frac.nO] = true; const c = fracCounts(S.frac.nO); GK.forEach((g) => setCount(g, c[g])); updateCtl(); }
  $('#sX').addEventListener('input', (e) => setNO(+e.target.value));
  $('#xMinus').addEventListener('click', () => { Sound.tick(); setNO(S.frac.nO - 1); });
  $('#xPlus').addEventListener('click', () => { Sound.tick(); setNO(S.frac.nO + 1); });
  [0.2, 0.5, 0.8].forEach((x) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = x; b.textContent = 'X = ' + x.toFixed(1); $('#xChips').appendChild(b); });
  $('#xChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); setNO(+b.dataset.v * 20); });
  $('#inXP').addEventListener('input', () => { const v = parseNum($('#inXP').value), inp = $('#inXP'); inp.classList.remove('ok', 'bad'); S.frac.ok = near(v, 1.0, 0.015); if (S.frac.ok) inp.classList.add('ok'); else if (!isNaN(v) && inp.value.length >= 2) inp.classList.add('bad'); });

  /* ================= ③ 분압 계산 ================= */
  const cnPS = [];
  const CN = () => { const L = RC.calc.L, w = PHONE ? 400 : 480; return { x: L.x + (L.w - w) / 2, y: L.y + (PHONE ? 140 : 118), w, h: PHONE ? 130 : 140, k: w / 8 }; };
  function cnInit() { cnPS.length = 0; for (let i = 0; i < 5; i++) { cnPS.push({ g: 'he', x: 0, y: 0, ux: 0, uy: 0, m: 1, ang: 0, spin: 0, fade: 1, home: 'L' }); cnPS.push({ g: 'n2', x: 0, y: 0, ux: 0, uy: 0, m: 1, ang: 0, spin: 0, fade: 1, home: 'R' }); } const c = CN(); cnPS.forEach((p) => { const th = rnd(0, TAU); p.ux = Math.cos(th); p.uy = Math.sin(th); p.m = rnd(0.85, 1.15); p.spin = rnd(-2, 2); p.x = p.home === 'L' ? rnd(10, 2 * c.k - 10) : rnd(2 * c.k + 10, c.w - 10); p.y = rnd(10, c.h - 10); }); }
  function stepCn(dt) {
    const c = CN(), cn = S.cn; cn.openP = SciSim.approach(cn.openP, cn.open ? 1 : 0, dt, 5); if (Math.abs(cn.openP - (cn.open ? 1 : 0)) < 0.01) cn.openP = cn.open ? 1 : 0;
    cnPS.forEach((p) => {
      const v = (PHONE ? 62 : 80) * G[p.g].k * p.m * dt; p.x += p.ux * v; p.y += p.uy * v; p.ang += p.spin * dt;
      const r = 5, wallX = 2 * c.k;
      let lo = 0, hi = c.w;
      if (!cn.open) { if (p.home === 'L') hi = wallX - 3; else lo = wallX + 3; }
      if (p.x < lo + r) { p.x = lo + r; p.ux = Math.abs(p.ux); } else if (p.x > hi - r) { p.x = hi - r; p.ux = -Math.abs(p.ux); }
      if (p.y < r) { p.y = r; p.uy = Math.abs(p.uy); } else if (p.y > c.h - r) { p.y = c.h - r; p.uy = -Math.abs(p.uy); }
    });
  }
  function drawConn(L, t) {
    const c = CN(), cn = S.cn, wallX = c.x + 2 * c.k;
    T(L.x + 16, L.y + 30, '🔗 두 용기를 연결해 밸브를 열면 (같은 온도)', 15, INK, 'left', 800);
    // 표시
    T(c.x + c.k, c.y - 52, 'He ' + f1(CONN.He.V) + ' L', 14.5, G.he.c, 'center', 800); T(c.x + c.k, c.y - 32, f1(CONN.He.P) + ' atm', 14.5, INK, 'center', 800);
    T(c.x + 5 * c.k, c.y - 52, 'N₂ ' + f1(CONN.N2.V) + ' L', 14.5, G.n2.c, 'center', 800); T(c.x + 5 * c.k, c.y - 32, f1(CONN.N2.P) + ' atm', 14.5, INK, 'center', 800);
    // 부피 눈금
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x, c.y + c.h + 14); ctx.lineTo(c.x + c.w, c.y + c.h + 14); ctx.stroke();
    for (let v = 0; v <= 8; v += 2) { ctx.beginPath(); ctx.moveTo(c.x + v * c.k, c.y + c.h + 14); ctx.lineTo(c.x + v * c.k, c.y + c.h + 20); ctx.stroke(); T(c.x + v * c.k, c.y + c.h + 36, v + ' L', 13, MUTED, 'center', 700); }
    ctx.fillStyle = 'rgba(235,242,255,.7)'; D.roundRect(c.x, c.y, c.w, c.h, 6); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip();
    cnPS.forEach((p) => molDraw(p.g, c.x + p.x, c.y + p.y, p.ang, 1.1));
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3.4; D.roundRect(c.x, c.y, c.w, c.h, 6); ctx.stroke();
    // 가운데 밸브 벽
    const open = cn.openP;
    ctx.fillStyle = '#94a3b8'; ctx.globalAlpha = 1 - open * 0.85; ctx.fillRect(wallX - 3, c.y, 6, c.h); ctx.globalAlpha = 1;
    D.sphere(wallX, c.y - 8, 10, open > 0.5 ? GOOD : BAD, { gloss: false });
    T(wallX + 16, c.y - 4, open > 0.5 ? '밸브 열림' : '밸브 닫힘', 13, open > 0.5 ? '#14803f' : BAD, 'left', 800);
    // 결과
    const ry = c.y + c.h + 48;
    if (open > 0.9) {
      const bw = c.w, by = ry + 10;
      D.roundRect(c.x, by, bw, 30, 9); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const sc = bw / 3, wHe = CONN_P.he * sc, wN = CONN_P.n2 * sc;
      ctx.save(); D.roundRect(c.x, by, bw, 30, 9); ctx.clip(); ctx.fillStyle = G.he.c; ctx.fillRect(c.x, by, wHe, 30); ctx.fillStyle = G.n2.c; ctx.fillRect(c.x + wHe, by, wN, 30); ctx.restore();
      T(c.x + wHe / 2, by + 20, 'P(He) 0.75', 13.5, '#7a5a00', 'center', 800); T(c.x + wHe + wN / 2, by + 20, 'P(N₂) 0.75', 13.5, '#fff', 'center', 800);
      T(c.x + bw - 4, by + 50, '전체 P = 1.50 atm', 14.5, '#14803f', 'right', 800);
      T(c.x, by + 50, '막대 끝 = 3.0 atm', 13, MUTED, 'left', 700);
    } else T(c.x + c.w / 2, ry + 28, '밸브를 열면 두 기체가 섞여요. 부피가 8.0 L로 커지면 압력은?', 14, '#9aa5b6', 'center', 700);
    // 계산 순서 카드
    const cy = ry + 68, cw = (c.w - 24) / 2;
    [['① 몰 분율 구하기', open > 0.9 ? 'n(He) = n(N₂) 이므로 X(He) = X(N₂) = 0.50' : 'X = n(성분) / n(전체)'], ['② × 전체 압력', open > 0.9 ? 'P(He) = 0.50 × 1.50 = 0.75 atm' : 'P(성분) = X × P(전체)']].forEach((q, i) => {
      const x = c.x + i * (cw + 24);
      D.roundRect(x, cy, cw, PHONE ? 74 : 70, 12); ctx.fillStyle = '#f7f3ff'; ctx.fill(); ctx.strokeStyle = '#d6c9f5'; ctx.lineWidth = 1.6; ctx.stroke();
      T(x + 12, cy + 24, q[0], 14.5, PUR, 'left', 800); textBlock(x + 12, cy + 44, cw - 24, q[1], 13.5, INK, 17, 700);
    });
    T(c.x + cw + 12, cy + 40, '→', 22, PUR, 'center', 800);
    textBlock(c.x, cy + (PHONE ? 98 : 90), c.w, '다른 방법: 각 기체가 8.0 L를 혼자 채울 때의 압력을 구해도 돼요. P(He) = 3.0 × 2.0 / 8.0 = 0.75 atm, P(N₂) = 1.0 × 6.0 / 8.0 = 0.75 atm.', 13.5, MUTED, 18, 700);
    void t;
  }
  const vpBub = [];
  function drawVap(L, t) {
    const vp = S.vp, x0 = L.x + 20, y0 = L.y + 60;
    T(L.x + 16, L.y + 30, '💧 물 위 포집: 모은 산소 기체의 분압', 15, INK, 'left', 800);
    // 수조와 포집병
    const tw = PHONE ? 220 : 280, th = 120, tx = x0, ty = y0 + 240, cxm = tx + tw / 2 - 30;
    ctx.fillStyle = 'rgba(120,190,255,.5)'; D.roundRect(tx, ty, tw, th, 8); ctx.fill(); ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3; D.roundRect(tx, ty, tw, th, 8); ctx.stroke();
    T(tx + 12, ty + 22, '수조 (20 °C)', 13, '#0e4f86', 'left', 800);
    const cw = 76, ch = 230, cy = ty - ch + 60;
    ctx.fillStyle = 'rgba(210,230,255,.45)'; ctx.fillRect(cxm - cw / 2, cy, cw, ch); ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3; ctx.strokeRect(cxm - cw / 2, cy, cw, ch);
    ctx.fillStyle = 'rgba(120,190,255,.5)'; ctx.fillRect(cxm - cw / 2 + 1.5, ty, cw - 3, ch - (ty - cy));
    T(cxm, cy - 8, '0.50 L', 13, '#1d4ed8', 'center', 800);
    // 기체 입자: O2 43개 + 수증기 1개 (비율 0.977 : 0.023)
    ctx.save(); ctx.beginPath(); ctx.rect(cxm - cw / 2 + 2, cy + 2, cw - 4, ty - cy - 4); ctx.clip();
    vpParts.forEach((p) => molDraw(p.g, cxm - cw / 2 + p.x, cy + p.y, p.ang, 0.8));
    ctx.restore();
    // 기포
    vpBub.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx + tw - 20, ty + th - 6); ctx.quadraticCurveTo(tx + tw - 60, ty + th - 22, cxm + 10, ty + th - 18); ctx.stroke();
    T(tx + tw - 22, ty + th + 18, 'O₂ 발생', 13, MUTED, 'right', 700);
    // 계산 패널
    const px = PHONE ? L.x + 16 : L.x + 340, py = PHONE ? L.y + 410 : L.y + 60, pw = PHONE ? L.w - 32 : 420;
    D.roundRect(px, py, pw, PHONE ? 330 : 420, 12); ctx.fillStyle = '#f8f9fc'; ctx.fill();
    T(px + 14, py + 26, '대기압 = P(O₂) + P(수증기)', 14.5, INK, 'left', 800);
    const bx = px + 14, bw = pw - 28, by = py + 40;
    D.roundRect(bx, by, bw, 30, 9); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, by, bw, 30, 9); ctx.clip();
    const wO = bw * VAP_PO2; ctx.fillStyle = G.o2.c; ctx.fillRect(bx, by, wO, 30); ctx.fillStyle = '#38bdf8'; ctx.fillRect(bx + wO, by, bw - wO, 30); ctx.restore();
    T(bx + wO / 2, by + 20, vp.ok[0] ? 'P(O₂) = 0.977' : 'P(O₂) = ?', 14, '#fff', 'center', 800);
    D.label(bx + bw - 6, by + 48, '수증기 0.023', { size: 12.5, bg: '#0284c7', align: 'right' });
    T(bx, by + 50, '전체 1.00 atm', 13, MUTED, 'left', 700);
    const ls = [
      ['① P(O₂) = 1.00 − 0.023', vp.ok[0] ? '= ' + f3(VAP_PO2) + ' atm ✅' : '= ? atm'],
      ['② n = PV / RT', '= (' + f3(VAP_PO2) + ' × 0.50) / (0.082 × 293)'],
      ['', vp.ok[1] ? '= ' + fx(VAP_N, 4) + ' mol' : '= ? mol'],
      ['③ 질량 = n × 32', vp.ok[1] ? '= ' + f2(VAP_W) + ' g ✅' : '= ? g'],
    ];
    ls.forEach((q, i) => { const y = by + 90 + i * 30; T(px + 14, y, q[0], 14, INK, 'left', 800); T(px + (q[0] ? 190 : 14), y, q[1], 14, (vp.ok[0] && i === 0) || (vp.ok[1] && i >= 2) ? '#14803f' : MUTED, 'left', 800); });
    textBlock(px + 14, by + 230, pw - 28, vp.ok[0] && vp.ok[1] ? '수증기압을 빼지 않고 계산하면 n = 1.00 × 0.50 / (0.082 × 293) = 0.0208 mol(0.666 g)이 되어 약 2.4 % 크게 나와요.' : '물 위에서 모은 기체에는 수증기가 섞여 있어요. 수증기의 분압을 빼야 O₂의 분압이 돼요.', 13.5, vp.ok[0] && vp.ok[1] ? '#b45309' : MUTED, 18, 800);
    void t;
  }
  const vpParts = [];
  function vpInit() { vpParts.length = 0; for (let i = 0; i < 44; i++) { const th = rnd(0, TAU); vpParts.push({ g: i === 0 ? 'w' : 'o2', x: rnd(6, 66), y: rnd(8, 170), ux: Math.cos(th), uy: Math.sin(th), m: rnd(0.8, 1.2), ang: rnd(0, TAU), spin: rnd(-2, 2) }); } }
  function stepVap(dt) {
    vpParts.forEach((p) => { const v = 50 * p.m * dt; p.x += p.ux * v; p.y += p.uy * v; p.ang += p.spin * dt; if (p.x < 5) { p.x = 5; p.ux = Math.abs(p.ux); } else if (p.x > 71) { p.x = 71; p.ux = -Math.abs(p.ux); } if (p.y < 5) { p.y = 5; p.uy = Math.abs(p.uy); } else if (p.y > 172) { p.y = 172; p.uy = -Math.abs(p.uy); } });
    const L = RC.calc.L, tx = L.x + 20, ty = L.y + 60 + 240, tw = PHONE ? 220 : 280, cxm = tx + tw / 2 - 30;
    if (!RM && Math.random() < dt * 4) vpBub.push({ x: tx + tw - 40 + rnd(-4, 4), y: ty + 100, r: rnd(2.5, 4), vx: -(tw - 40 - (cxm + 6)) / 1.8 });
    for (let i = vpBub.length - 1; i >= 0; i--) { const b = vpBub[i]; b.y -= 60 * dt; b.x += b.vx * dt * 0.3; if (b.y < ty + 4) vpBub.splice(i, 1); }
  }
  function drawAir(L, t) {
    const km = S.air.alt, P = presAt(km);
    T(L.x + 16, L.y + 30, '⛰️ 공기의 산소 분압은 고도에 따라?', 15, INK, 'left', 800);
    const sx = L.x + 20, sy = L.y + 56, sw = PHONE ? L.w - 40 : 340, sh = PHONE ? 240 : 420;
    const sky = ctx.createLinearGradient(0, sy, 0, sy + sh); sky.addColorStop(0, C.mix('#bfe3ff', '#274a8c', clamp(km / 10, 0, 0.6))); sky.addColorStop(1, '#eef7ff');
    ctx.fillStyle = sky; D.roundRect(sx, sy, sw, sh, 12); ctx.fill();
    ctx.fillStyle = '#7c8b6f'; ctx.beginPath(); ctx.moveTo(sx, sy + sh); ctx.lineTo(sx + sw * 0.3, sy + sh * 0.5); ctx.lineTo(sx + sw * 0.55, sy + sh * 0.7); ctx.lineTo(sx + sw * 0.8, sy + sh * 0.3); ctx.lineTo(sx + sw, sy + sh); ctx.closePath(); ctx.fill();
    const cy = sy + sh - 22 - (km / 8) * (sh - 70);
    ctx.font = D.font(34, 700); ctx.textAlign = 'center'; ctx.fillText('🧗', sx + sw * 0.5, cy);
    T(sx + sw * 0.5, cy - 44, f1(km) + ' km', 14.5, INK, 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    // 막대
    const px = PHONE ? L.x + 20 : L.x + 390, py = PHONE ? L.y + 320 : L.y + 60, pw = PHONE ? L.w - 40 : 366;
    D.roundRect(px, py, pw, PHONE ? 330 : 420, 12); ctx.fillStyle = '#f8f9fc'; ctx.fill();
    T(px + 14, py + 26, '전체 압력 ' + f2(P) + ' atm', 15, INK, 'left', 800);
    const ax = px + 70, aw = pw - 70 - 76, sc = aw / 1.0;
    AIR.forEach((a, i) => {
      const y = py + 52 + i * 56, v = P * a[1];
      T(px + 14, y + 24, a[0], 15, a[2], 'left', 800);
      D.roundRect(ax, y + 6, aw, 24, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(ax, y + 6, aw, 24, 8); ctx.clip(); ctx.fillStyle = a[2]; ctx.fillRect(ax, y + 6, Math.max(0, v * sc), 24); ctx.restore();
      T(ax + aw + 8, y + 24, f2(v) + ' atm', 14.5, INK, 'left', 800);
      T(ax, y + 46, 'X = ' + a[1].toFixed(2) + ' → ' + a[1].toFixed(2) + ' × ' + f2(P) + ' = ' + f2(v), 12.5, MUTED, 'left', 700);
    });
    const lo = P * 0.21 < 0.16;
    textBlock(px + 14, py + 232, pw - 28, '산소의 몰 분율은 0.21로 그대로이지만 전체 압력이 줄어서 산소 분압이 작아져요. ' + f1(km) + ' km에서 P(O₂) = ' + f2(P * 0.21) + ' atm' + (km >= 2 ? ' (해수면 0.21 atm의 ' + f2(P) + '배)' : '') + '.', 13.5, lo ? BAD : '#14803f', 18, 800);
    void t;
  }
  function drawCalc(t) {
    const sub = S.sub.calc, L = Object.assign({}, RC.calc.L, PHONE ? { h: { conn: 540, vap: 760, air: 680 }[sub] } : {});
    T(14, 26, MODE_LABEL.calc, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    if (sub === 'conn') drawConn(L, t); else if (sub === 'vap') drawVap(L, t); else drawAir(L, t);
  }
  ['1', '2', '3'].forEach((k, i) => $('#inC' + k).addEventListener('input', () => {
    const v = parseNum($('#inC' + k).value), inp = $('#inC' + k), ans = [CONN_P.he, CONN_P.n2, 1.5][i];
    inp.classList.remove('ok', 'bad'); S.cn.ok[i] = near(v, ans, 0.015); if (S.cn.ok[i]) { inp.classList.add('ok'); } else if (!isNaN(v) && inp.value.length >= 3) inp.classList.add('bad');
  }));
  [['1', VAP_PO2, 0.003, 0], ['2', VAP_W, 0.008, 1]].forEach(([k, ans, tol, i]) => $('#inV' + k).addEventListener('input', () => {
    const v = parseNum($('#inV' + k).value), inp = $('#inV' + k); inp.classList.remove('ok', 'bad'); S.vp.ok[i] = near(v, ans, tol); if (S.vp.ok[i]) inp.classList.add('ok'); else if (!isNaN(v) && inp.value.length >= 3) inp.classList.add('bad');
  }));
  $('#bValve').addEventListener('click', () => { Sound.click(); S.cn.open = true; updateCtl(); });
  $('#bValveR').addEventListener('click', () => { Sound.click(); S.cn.open = false; cnInit(); updateCtl(); });
  const setAlt = (v) => { S.air.alt = clamp(Math.round(v * 2) / 2, 0, 8); updateCtl(); };
  $('#sAlt').addEventListener('input', (e) => setAlt(+e.target.value));
  $('#aMinus').addEventListener('click', () => { Sound.tick(); setAlt(S.air.alt - 0.5); });
  $('#aPlus').addEventListener('click', () => { Sound.tick(); setAlt(S.air.alt + 0.5); });
  $('#clSub').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sub.calc = b.dataset.v; S.fade = 0.5; updateCtl(); });

  /* ================= ④ 혼합 기체 설계 ================= */
  const dvP = () => (10 + S.dv.depth) / 10;                               // 전체 압력 (atm)
  const dvO2 = () => S.dv.o2 * (10 + S.dv.depth) / 1000;                  // O₂ 분압
  const dvDil = () => (100 - S.dv.o2) * (10 + S.dv.depth) / 1000;         // 나머지 기체 분압
  const dvSurf = () => S.dv.o2 / 100;                                     // 수면에서의 O₂ 분압
  const dvSafe = () => dvO2() >= O2_LO && dvO2() <= O2_HI;
  const dvNarc = () => S.dv.dil === 'n2' && dvDil() >= NARC;
  function drawDive(t) {
    const L = RC.dive.L, Rr = RC.dive.R, dv = S.dv;
    T(14, 26, MODE_LABEL.dive, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    const sx = L.x + 14, sy = L.y + 14, sw = L.w - 28, sh = L.h - 28;
    const wy = sy + 44;
    ctx.save(); D.roundRect(sx, sy, sw, sh, 12); ctx.clip();
    const sg = ctx.createLinearGradient(0, sy, 0, sy + sh); sg.addColorStop(0, '#d9f0ff'); sg.addColorStop(0.1, '#7cc4ff'); sg.addColorStop(1, '#0b2d66');
    ctx.fillStyle = sg; ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(sx, wy - 2, sw, 3);
    ctx.restore();
    T(sx + 12, sy + 24, '수면 1 atm', 13.5, INK, 'left', 800);
    // 깊이 눈금 (오른쪽)
    const k = (sh - 60) / 70, rx = sx + sw - 70;
    for (let d = 0; d <= 70; d += 10) { const y = wy + d * k; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + 12, y); ctx.stroke(); T(rx + 16, y + 4.5, d + ' m', 13, '#fff', 'left', 800); T(rx - 6, y + 4.5, f1(1 + d / 10) + ' atm', 12.5, 'rgba(255,255,255,.85)', 'right', 700); }
    // 안전 깊이 표시선 (공기 21 %가 O₂ 1.4 atm이 되는 깊이 약 57 m)
    ctx.strokeStyle = 'rgba(255,214,102,.8)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; const dAir = (1.4 / 0.21 - 1) * 10; ctx.beginPath(); ctx.moveTo(sx + 14, wy + dAir * k); ctx.lineTo(rx - 56, wy + dAir * k); ctx.stroke(); ctx.setLineDash([]);
    T(sx + 14, wy + dAir * k - 6, '공기(O₂ 21 %)는 약 ' + Math.round(dAir) + ' m에서 O₂ 1.4 atm', 12.5, '#ffd666', 'left', 800);
    // 잠수부
    const dy = wy + dv.anim * k, dx = sx + (PHONE ? 150 : 150);
    ctx.font = D.font(46, 700); ctx.textAlign = 'center'; ctx.fillText('🤿', dx, dy + 14);
    if (!RM) for (let i = 0; i < 4; i++) { const ph = (t * 0.5 + i / 4) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - ph)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(dx + 26 + Math.sin(ph * 8 + i) * 5, dy - 12 - ph * 50, 2.5 + i, 0, TAU); ctx.stroke(); }
    D.label(dx + 56, dy + 4, f1(dv.depth) + ' m', { size: 13.5, bg: '#0b3a7a', align: 'left' });
    // 기체 탱크 (혼합 비율)
    const tx = sx + 20, ty = wy + 34, tw = 150, th = 26;
    D.roundRect(tx, ty, tw, th, 12); ctx.fillStyle = '#e2e8f0'; ctx.fill();
    ctx.save(); D.roundRect(tx, ty, tw, th, 12); ctx.clip(); ctx.fillStyle = G.o2.c; ctx.fillRect(tx, ty, tw * dv.o2 / 100, th); ctx.fillStyle = dv.dil === 'he' ? G.he.c : G.n2.c; ctx.fillRect(tx + tw * dv.o2 / 100, ty, tw * (100 - dv.o2) / 100, th); ctx.restore();
    T(tx + tw / 2, ty - 8, '혼합 기체 (몰 분율 = 부피 %)', 12.5, '#fff', 'center', 800);
    T(tx + 6, ty + 18, 'O₂ ' + dv.o2 + ' %', 13, '#fff', 'left', 800);
    T(tx + tw - 6, ty + 18, (dv.dil === 'he' ? 'He ' : 'N₂ ') + (100 - dv.o2) + ' %', 13, dv.dil === 'he' ? '#5a4300' : '#fff', 'right', 800);
    // 오른쪽 패널
    panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    const gx = Rr.x + Rr.w / 2, gy = Rr.y + (PHONE ? 112 : 108), gr = PHONE ? 66 : 64, po2 = dvO2();
    T(Rr.x + 14, Rr.y + 26, '🧭 산소 분압 P(O₂) = X(O₂) × P(전체)', 14, INK, 'left', 800);
    D.dial(gx, gy, gr, clamp(po2, 0, 2.4), 0, 2.4, { label: 'atm', ticks: 4, color: dvSafe() ? GOOD : BAD, target: [O2_LO, O2_HI] });
    T(gx, gy + gr + 30, f2(po2) + ' atm', 22, dvSafe() ? '#14803f' : BAD, 'center', 800);
    T(gx, gy + gr + 52, dvSafe() ? '✅ 안전 범위 (0.16 ~ 1.4)' : po2 > O2_HI ? '⚠️ 산소 독성 위험 (1.4 atm 초과)' : '⚠️ 산소 부족 (0.16 atm 미만)', 14, dvSafe() ? '#14803f' : BAD, 'center', 800);
    const ty2 = gy + gr + 80;
    const rows = [['전체 압력 P', f2(dvP()) + ' atm (1 + 깊이/10)'], ['P(O₂)', f2(dv.o2 / 100) + ' × ' + f2(dvP()) + ' = ' + f2(po2) + ' atm'], ['P(' + (dv.dil === 'he' ? 'He' : 'N₂') + ')', f2((100 - dv.o2) / 100) + ' × ' + f2(dvP()) + ' = ' + f2(dvDil()) + ' atm'], ['수면에서 P(O₂)', f2(dvSurf()) + ' atm' + (dvSurf() >= O2_LO ? '' : ' (부족)')]];
    rows.forEach((q, i) => { const y = ty2 + i * 22; T(Rr.x + 14, y, q[0], 13.5, MUTED, 'left', 800); T(Rr.x + Rr.w - 14, y, q[1], 13.5, INK, 'right', 800); });
    const ny = ty2 + rows.length * 22 + 6;
    T(Rr.x + 14, ny, dvNarc() ? '⚠️ 질소 분압 ' + f2(dvDil()) + ' atm: 질소 마취(판단력 저하) 위험 (약 3.2 atm 이상)' : dv.dil === 'he' ? '✅ 헬륨은 마취 작용이 없어 깊은 곳에 알맞아요' : '✅ 질소 분압이 낮아 마취 걱정이 적어요', 13, dvNarc() ? BAD : '#14803f', 'left', 800);
    if (!PHONE || true) {
      const cy = ny + 14;
      [['🏥 의료용 산소 100 %', 'P(O₂) = 1.00 × 1.0 = 1.00 atm (공기의 0.21 atm의 약 5배)'], ['🧗 5 km 산 위 (0.55 atm)', 'P(O₂) = 0.21 × 0.55 = 0.12 atm → 숨이 차요'], ['🎈 풍선 가스 He 100 %', '안전한 비활성 기체, 압력은 He 분압 하나뿐']].forEach((q, i) => {
        const y = cy + i * 40;
        D.roundRect(Rr.x + 12, y, Rr.w - 24, 37, 10); ctx.fillStyle = '#f7f3ff'; ctx.fill();
        T(Rr.x + 20, y + 15, q[0], 13, PUR, 'left', 800); T(Rr.x + 20, y + 31, q[1], 12.5, MUTED, 'left', 700);
      });
    }
  }
  const setDepth = (v) => { S.dv.depth = clamp(Math.round(v), 0, 70); updateCtl(); };
  const setO2 = (v) => { S.dv.o2 = clamp(Math.round(v), 10, 40); updateCtl(); };
  $('#sDep').addEventListener('input', (e) => setDepth(+e.target.value));
  $('#dMinus').addEventListener('click', () => { Sound.tick(); setDepth(S.dv.depth - 1); });
  $('#dPlus').addEventListener('click', () => { Sound.tick(); setDepth(S.dv.depth + 1); });
  $('#sO2').addEventListener('input', (e) => setO2(+e.target.value));
  $('#oMinus').addEventListener('click', () => { Sound.tick(); setO2(S.dv.o2 - 1); });
  $('#oPlus').addEventListener('click', () => { Sound.tick(); setO2(S.dv.o2 + 1); });
  [0, 10, 40, 60].forEach((d) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = d; b.textContent = d + ' m'; $('#depChips').appendChild(b); });
  $('#depChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); setDepth(+b.dataset.v); });
  $('#dilSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.dv.dil = b.dataset.v; updateCtl(); });

  /* ================= 컨트롤 · 공통 ================= */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      if (on && n.hasAttribute('data-nolock')) on = !S.lock;
      n.hidden = !on;
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#injRow button').forEach((b) => { const g = b.dataset.g, d = S.sum.inj[g] > 0; b.disabled = d; b.classList.toggle('done', d); });
    $('#oX').textContent = f2(S.frac.nO / 20); $('#sX').value = S.frac.nO;
    $('#xMinus').disabled = S.frac.nO <= 0; $('#xPlus').disabled = S.frac.nO >= 20;
    $$('#xChips button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.v * 20 - S.frac.nO) < 0.01));
    $$('#clSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.calc));
    $('#oAlt').textContent = f1(S.air.alt) + ' km'; $('#sAlt').value = S.air.alt; $('#aMinus').disabled = S.air.alt <= 0; $('#aPlus').disabled = S.air.alt >= 8;
    $('#oDep').textContent = S.dv.depth + ' m'; $('#sDep').value = S.dv.depth; $('#oO2').textContent = S.dv.o2 + ' %'; $('#sO2').value = S.dv.o2;
    $('#dMinus').disabled = S.dv.depth <= 0; $('#dPlus').disabled = S.dv.depth >= 70; $('#oMinus').disabled = S.dv.o2 <= 10; $('#oPlus').disabled = S.dv.o2 >= 40;
    $$('#depChips button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.dv.depth));
    $$('#dilSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.dv.dil));
    $('#bValve').disabled = S.cn.open;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); }
    const was = S.mode; S.mode = m;
    if (m === 'sum' && was !== 'sum') { PS = []; S.flash = []; GK.forEach((g) => { S.sum.disp[g] = 0; if (S.sum.inj[g] > 0) setCount(g, Math.round(S.sum.inj[g] / PART)); }); PS.forEach((p) => { p.fade = 1; }); }
    if (m === 'frac' && was !== 'frac') { PS = []; S.flash = []; const c = fracCounts(S.frac.nO); GK.forEach((g) => { setCount(g, c[g]); S.frac.disp[g] = 0; }); PS.forEach((p) => { p.fade = 1; }); }
    updateCtl();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.mode === 'sum') sumReset();
    else if (S.mode === 'frac') { setNO(10); S.frac.seen = {}; }
    else if (S.mode === 'calc') { if (S.sub.calc === 'conn') { S.cn.open = false; cnInit(); } else if (S.sub.calc === 'air') S.air.alt = 0; }
    else { S.dv.depth = 40; S.dv.o2 = 21; S.dv.dil = 'n2'; }
    updateCtl();
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'sum' || S.mode === 'frac') {
      const n = {}; GK.forEach((g) => { n[g] = S.mode === 'sum' ? S.sum.inj[g] : fracCounts(S.frac.nO)[g] * PART; });
      const tot = GK.reduce((s, g) => s + n[g] * RTV, 0);
      L1 = '분압 He · N₂ · O₂'; a = GK.map((g) => f2(n[g] * RTV)).join(' · ') + ' atm'; L2 = '분압의 합'; b = f2(tot) + ' atm'; L3 = S.mode === 'sum' ? '전체 압력' : 'X(O₂)'; c = S.mode === 'sum' ? f2(tot) + ' atm' : f2(S.frac.nO / 20);
    } else if (S.mode === 'calc') {
      if (S.sub.calc === 'conn') { L1 = '밸브'; a = S.cn.open ? '열림' : '닫힘'; L2 = '전체 부피'; b = '8.0 L'; L3 = '전체 압력'; c = S.cn.open ? '1.50 atm' : '—'; }
      else if (S.sub.calc === 'vap') { L1 = '대기압'; a = '1.00 atm'; L2 = '수증기압 (20 °C)'; b = '0.023 atm'; L3 = 'O₂ 분압'; c = S.vp.ok[0] ? f3(VAP_PO2) + ' atm' : '?'; }
      else { const P = presAt(S.air.alt); L1 = '고도 · 전체 압력'; a = f1(S.air.alt) + ' km · ' + f2(P) + ' atm'; L2 = 'O₂ 분압'; b = f2(P * 0.21) + ' atm'; L3 = 'N₂ 분압'; c = f2(P * 0.78) + ' atm'; }
    } else { L1 = '깊이 · 전체 압력'; a = S.dv.depth + ' m · ' + f2(dvP()) + ' atm'; L2 = 'O₂ 분압'; b = f2(dvO2()) + ' atm' + (dvSafe() ? ' ✅' : ' ⚠️'); L3 = '혼합 기체'; c = 'O₂ ' + S.dv.o2 + ' % + ' + (S.dv.dil === 'he' ? 'He' : 'N₂'); }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const injAll = () => GK.every((g) => S.sum.inj[g] > 0);
  const injDone = () => injAll() && GK.every((g) => countOf(g) === Math.round(G[g].n / PART));
  const o2Seen = () => Object.keys(S.frac.seen).length;
  const levels = [
    {
      title: '분압의 합: 기체를 차례로 넣기', short: '분압의 합', icon: '🫧', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 여러 기체가 섞여 있는 용기의 압력은 각 기체가 만드는 압력과 어떤 관계일까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 기체의 압력은 분자가 벽에 부딪혀서 생기고 PV = nRT로 구한다는 것을 배웠어요. 이번에는 <b>서로 다른 기체가 섞여 있을 때</b>를 살펴봐요. 몰질량이 다른 기체도 같은 온도에서 같은 방식으로 압력을 만들어요(이상 기체로 가정).</div>' +
        '<p>12.3 L 용기(300 K)에 <b>He → N₂ → O₂</b>를 차례로 넣어요. 각 기체가 만드는 압력 <b>분압</b>이 막대로 쌓여 전체 압력이 되는 모습을 봐요.</p>',
      features: ['sum'],
      setup() { S.lock = false; S.gate = ''; sumReset(); setMode('sum'); },
      recap: '혼합 기체의 전체 압력은 각 성분 기체의 분압을 모두 더한 것과 같아요(돌턴의 분압 법칙). 분압은 그 기체가 혼자 같은 용기를 채울 때의 압력이에요.',
      summary: '<ul><li><b>분압</b>: 혼합 기체 속 한 성분이 혼자서 같은 부피 · 온도의 용기를 채울 때 나타내는 압력 = n(성분) × RT / V</li><li><b>돌턴의 분압 법칙</b>: P(전체) = P(A) + P(B) + P(C) + …</li><li>12.3 L, 300 K에서 RT/V = 2.0 atm/mol → He 0.20 mol: <b>0.40</b>, N₂ 0.30 mol: <b>0.60</b>, O₂ 0.50 mol: <b>1.00</b> → 합 <b>2.00 atm</b></li><li>다른 기체가 있어도 한 기체의 분압은 변하지 않아요.</li></ul>',
      missions: [
        {
          title: '세 기체를 넣고 분압의 합 구하기', manual: true,
          goal: '<b>He, N₂, O₂</b>를 모두 넣은 뒤, 막대에 나온 <b>분압 세 개의 합</b>을 atm 단위로 써서 압력계의 전체 압력과 비교해요. <b>✔ 확인하기</b>를 눌러요.',
          hint: '오른쪽의 기체 단추를 눌러 세 기체를 모두 넣어요. 분압은 He 0.40, N₂ 0.60, O₂ 1.00이에요. 더한 값이 압력계의 값과 같아요.',
          setup() { S.lock = true; S.gate = 'sumin'; sumReset(); setMode('sum'); },
          check() {
            if (!injAll()) return '먼저 He, N₂, O₂를 모두 넣어 주세요.';
            if (!injDone()) return '기체가 모두 들어갈 때까지 잠깐 기다려요.';
            if (isNaN(parseNum($('#inSum').value))) return '분압의 합을 숫자로 써 주세요. (단위 atm)';
            return S.sum.sumOk ? true : '다시 더해 보세요. 0.40 + 0.60 + 1.00이에요.';
          },
          status: () => '기체 ' + GK.filter((g) => S.sum.inj[g] > 0).length + ' / 3 ' + mark(injAll()) + ' &nbsp; 합 ' + mark(S.sum.sumOk),
          explain: '분압은 He 0.40, N₂ 0.60, O₂ 1.00 atm이고 합은 <b>2.00 atm</b>이에요. 이것은 압력계가 가리키는 전체 압력과 같아요. 혼합 기체의 전체 압력은 분압의 합이에요(<b>돌턴의 분압 법칙</b>).',
        },
        {
          type: 'quiz', title: '다른 기체가 있을 때의 분압',
          goal: 'He가 들어 있는 용기에 N₂를 넣었어요. <b>N₂의 분압</b>은 He가 없을 때(N₂ 혼자 같은 용기를 채울 때)와 비교하면?',
          setup() { S.lock = true; S.gate = ''; setMode('sum'); },
          choices: ['He 때문에 더 커져요', 'He의 유무와 상관없이 같아요', 'He가 밀어내서 더 작아져요', '전체 압력과 같아져요'],
          answer: 1,
          feedback: ['He 분자가 N₂ 분자를 더 세게 치지 않아요. N₂ 분자가 벽을 치는 횟수는 변하지 않아요.', '', 'He가 N₂의 자리를 빼앗지 않아요. 기체 분자 사이의 공간은 매우 넓어요.', '전체 압력은 He와 N₂의 분압을 합한 값이에요. N₂의 분압은 그 일부예요.'],
          explain: '이상 기체 분자는 서로 영향을 주지 않아서, 각 기체는 혼자 있을 때처럼 벽을 쳐요. 그래서 <b>한 기체의 분압은 다른 기체의 유무와 상관없이</b> 그 기체가 혼자 같은 용기를 채울 때와 같아요.',
        },
      ],
    },
    {
      title: '몰 분율: 분압은 비율에 비례', short: '몰 분율', icon: '🎚️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> P(전체) = P(He) + P(N₂) + P(O₂)임을 알았어요. 이제 분압이 <b>입자의 비율(몰 분율)</b>과 어떤 관계인지 찾아봐요.</div>' +
        '<p>전체 입자 수는 <b>1.0 mol</b>로 그대로 두고 <b>산소의 몰 분율 X(O₂)</b>를 바꿔요. 몰 분율은 <b>X(A) = n(A) / n(전체)</b>이고 합은 1이에요. 분압 막대가 <b>전체 압력 × 몰 분율</b>과 같은지 확인해요.</p>',
      features: ['frac'],
      setup() { S.lock = false; S.gate = ''; S.frac.seen = {}; S.frac.ok = false; $('#inXP').value = ''; $('#inXP').classList.remove('ok', 'bad'); setMode('frac'); setNO(10); S.frac.seen = {}; },
      recap: '분압은 몰 분율에 비례해요: P(A) = X(A) × P(전체). 입자 수 비율(몰 분율)이 클수록 벽에 부딪히는 횟수가 많아 분압이 커요.',
      summary: '<ul><li><b>몰 분율</b> X(A) = n(A) / n(전체) (단위 없음, 모든 성분의 합 = 1)</li><li><b>P(A) = X(A) × P(전체)</b> (= n(A)RT/V). 이상 기체에서 부피 비 = 몰 비</li><li>전체 2.0 atm에서 X = 0.20이면 분압은 0.20 × 2.0 = <b>0.40 atm</b></li><li>입자 수가 분압의 근거: 분자가 벽을 치는 횟수에 비례해요.</li></ul>',
      missions: [
        {
          title: '산소의 몰 분율을 바꿔 보기',
          goal: '슬라이더로 <b>O₂의 몰 분율을 서로 다른 값 4가지 이상</b> 만들어 보고, 분압 막대가 어떻게 바뀌는지 살펴봐요.',
          hint: '슬라이더나 X = 0.2, 0.5, 0.8 단추를 눌러요. 산소 입자가 늘면 O₂ 막대가 길어지고 He, N₂ 막대는 짧아져요. 막대를 모두 쌓은 길이는 항상 2.00 atm이에요.',
          setup() { S.lock = true; S.gate = ''; S.frac.seen = {}; setMode('frac'); setNO(10); S.frac.seen = {}; },
          check: () => o2Seen() >= 4, hold: 0.5,
          status: () => '서로 다른 값 ' + o2Seen() + ' / 4 ' + mark(o2Seen() >= 4),
          explain: 'O₂의 몰 분율이 커질수록 O₂ 분압도 커지고, 쌓은 막대의 전체 길이는 2.00 atm으로 그대로예요. 분압은 <b>전체 압력 × 몰 분율</b>이에요.',
        },
        {
          title: 'X(O₂) = 0.50일 때 O₂ 분압 읽기', manual: true,
          goal: '<b>X(O₂) = 0.50</b>으로 맞추고, O₂의 분압을 atm 단위로 써서 <b>✔ 확인하기</b>를 눌러요.',
          hint: '몰 분율 단추 X = 0.5를 눌러요. P(O₂) = X × P(전체) = 0.50 × 2.00이에요.',
          setup() { S.lock = true; S.gate = 'fracin'; $('#inXP').value = ''; $('#inXP').classList.remove('ok', 'bad'); S.frac.ok = false; setMode('frac'); },
          check() {
            if (S.frac.nO !== 10) return '먼저 O₂의 몰 분율을 0.50으로 맞춰 주세요. (입자 10개)';
            if (isNaN(parseNum($('#inXP').value))) return 'O₂의 분압을 숫자로 써 주세요. (단위 atm)';
            return S.frac.ok ? true : '다시 계산해 보세요. P(O₂) = 0.50 × 2.00이에요.';
          },
          status: () => 'X = ' + f2(S.frac.nO / 20) + ' ' + mark(S.frac.nO === 10) + ' &nbsp; 분압 ' + mark(S.frac.ok && S.frac.nO === 10),
          explain: 'P(O₂) = X(O₂) × P(전체) = 0.50 × 2.00 = <b>1.00 atm</b>이에요. 막대에서 읽은 값과 같아요.',
        },
        {
          type: 'quiz', title: '몰 분율 0.20의 분압',
          goal: '전체 압력이 <b>2.0 atm</b>인 혼합 기체에서 어떤 기체의 몰 분율이 <b>0.20</b>이에요. 이 기체의 분압이 <b>0.40 atm</b>인 까닭은?',
          setup() { S.lock = true; S.gate = ''; setMode('frac'); },
          choices: ['P(A) = X(A) × P(전체) = 0.20 × 2.0 이기 때문이에요', '분압은 항상 전체 압력의 1/5이기 때문이에요', 'P(A) = P(전체) − X(A) = 2.0 − 0.20 이기 때문이에요', '분압은 몰 분율과 상관이 없어요'],
          answer: 0,
          feedback: ['', '몰 분율이 0.20일 때만 1/5이에요. 몰 분율이 달라지면 분압도 달라져요.', '몰 분율은 비율이에요. 전체 압력에서 빼는 것이 아니라 곱해요.', '분압은 몰 분율에 비례해요. 몰 분율이 클수록 분압도 커요.'],
          explain: '분압은 <b>P(A) = X(A) × P(전체)</b>예요. 몰 분율 0.20(전체 입자의 20 %)인 기체는 전체 압력의 20 %를 만들어서 0.20 × 2.0 = <b>0.40 atm</b>이에요.',
        },
      ],
    },
    {
      title: '분압 계산: 연결 용기와 물 위 포집', short: '분압 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> P(A) = X(A) × P(전체)를 찾았어요. 이 식으로 <b>문제 상황</b>의 분압을 계산해 봐요.</div>' +
        '<p><b>연결 용기</b>에서 밸브를 열면 부피가 커져 압력이 달라지고, <b>물 위 포집</b>에서는 수증기압을 빼야 해요. 계산 순서는 <b>① 몰 분율 구하기 → ② × 전체 압력</b>이에요. 공기와 고도의 O₂ 분압도 살펴봐요.</p>',
      features: ['calc'],
      setup() { S.lock = false; S.gate = ''; S.sub.calc = 'conn'; S.cn.open = false; cnInit(); setMode('calc'); },
      recap: '연결 용기에서는 부피가 커진 만큼 각 기체의 압력이 줄어요. 물 위 포집에서는 P(기체) = 대기압 − 수증기압을 써요. 고도가 높으면 전체 압력이 작아져 O₂ 분압도 작아져요.',
      summary: '<ul><li>연결 용기(2.0 L He 3.0 atm + 6.0 L N₂ 1.0 atm, 같은 온도): 전체 8.0 L → P(He) = 3.0 × 2.0 / 8.0 = <b>0.75</b>, P(N₂) = 1.0 × 6.0 / 8.0 = <b>0.75</b>, P(전체) = <b>1.5 atm</b>, X = 0.50씩</li><li>물 위 포집(20 °C): P(O₂) = 1.00 − 0.023 = <b>0.977 atm</b> → n = 0.0203 mol = <b>0.65 g</b>. 수증기압을 무시하면 약 2 % 크게 나와요.</li><li>공기(N₂ 78 %, O₂ 21 %, Ar 1 %): 1 atm에서 P(O₂) = 0.21 atm. 5 km(0.55 atm)에서는 약 <b>0.12 atm</b></li></ul>',
      missions: [
        {
          title: '연결 용기의 분압 계산하기',
          goal: '<b>🔓 밸브 열기</b>를 눌러 두 기체를 섞고, 섞은 뒤의 <b>P(He), P(N₂), 전체 압력</b>을 atm 단위로 써요.',
          hint: '처음 He는 2.0 L에서 3.0 atm이에요. 8.0 L로 커지면 P = 3.0 × 2.0 / 8.0이에요. N₂도 같은 방법으로 구해요. 전체 압력은 둘의 합이에요.',
          setup() { S.lock = true; S.gate = ''; S.sub.calc = 'conn'; S.cn.open = false; S.cn.ok = [false, false, false]; ['1', '2', '3'].forEach((k) => { $('#inC' + k).value = ''; $('#inC' + k).classList.remove('ok', 'bad'); }); cnInit(); setMode('calc'); },
          check: () => S.cn.open && S.cn.openP > 0.95 && S.cn.ok.every(Boolean), hold: 0.6,
          status: () => '밸브 ' + mark(S.cn.open) + ' &nbsp; He ' + mark(S.cn.ok[0]) + ' N₂ ' + mark(S.cn.ok[1]) + ' 전체 ' + mark(S.cn.ok[2]),
          explain: '온도가 같으면 기체의 압력은 부피에 반비례해서, 각 기체가 8.0 L로 퍼지면 압력은 (처음 부피 / 8.0)배가 돼요. P(He) = 3.0 × 2.0 / 8.0 = <b>0.75 atm</b>, P(N₂) = 1.0 × 6.0 / 8.0 = <b>0.75 atm</b>, 전체 <b>1.50 atm</b>. 두 기체의 몰수가 같아 X = 0.50이므로 P = 0.50 × 1.50 = 0.75예요.',
        },
        {
          title: '물 위 포집한 산소의 양', manual: true,
          goal: '물 위에서 모은 산소 <b>0.50 L</b>의 <b>O₂ 분압</b>과 <b>질량(g)</b>을 구해 쓰고 <b>✔ 확인하기</b>를 눌러요. 수증기압을 빼야 해요.',
          hint: 'P(O₂) = 1.00 − 0.023 atm이에요. n = PV/RT = P(O₂) × 0.50 / (0.082 × 293). 질량 = n × 32. 소수 셋째 자리까지 계산해요.',
          setup() { S.lock = true; S.gate = ''; S.sub.calc = 'vap'; S.vp.ok = [false, false]; ['1', '2'].forEach((k) => { $('#inV' + k).value = ''; $('#inV' + k).classList.remove('ok', 'bad'); }); vpInit(); setMode('calc'); },
          check() {
            const a = parseNum($('#inV1').value), b = parseNum($('#inV2').value);
            if (isNaN(a)) return 'O₂의 분압을 먼저 써 주세요. (대기압에서 수증기압을 빼요)';
            if (!S.vp.ok[0]) return near(a, 1.0, 0.002) ? '1.00은 대기압 전체예요. 수증기의 분압 0.023을 빼야 O₂의 분압이에요.' : '다시 계산해 보세요. 1.00 − 0.023이에요.';
            if (isNaN(b)) return '산소의 질량을 써 주세요. (g)';
            if (!S.vp.ok[1]) return near(b, 0.666, 0.006) ? '수증기압을 빼지 않은 값 같아요. 0.977 atm을 써서 다시 계산해요.' : '다시 계산해 보세요. n = PV/RT를 먼저 구하고 32를 곱해요.';
            return true;
          },
          status: () => 'P(O₂) ' + mark(S.vp.ok[0]) + ' &nbsp; 질량 ' + mark(S.vp.ok[1]),
          explain: 'P(O₂) = 1.00 − 0.023 = <b>0.977 atm</b>. n = 0.977 × 0.50 / (0.082 × 293) = <b>0.0203 mol</b>, 질량 = 0.0203 × 32 = <b>0.65 g</b>. 수증기압을 빼지 않으면 약 2.4 % 크게 계산돼요.',
        },
        {
          type: 'quiz', title: '수증기압을 빼지 않으면?',
          goal: '물 위에서 모은 기체의 양을 구할 때 <b>수증기압을 빼지 않고</b> 대기압을 그대로 쓰면 구한 기체의 양은?',
          setup() { S.lock = true; S.gate = ''; S.sub.calc = 'vap'; setMode('calc'); },
          choices: ['실제보다 크게 나와요', '실제보다 작게 나와요', '같아요', '기체의 종류에 따라 달라요'],
          answer: 0,
          feedback: ['', '대기압을 그대로 쓰면 P가 실제 분압보다 커서 n = PV/RT도 커져요.', '수증기가 섞여 있어서 O₂의 분압은 대기압보다 작아요. 같지 않아요.', '수증기압은 온도에 따라 달라지지만, 빼지 않으면 항상 크게 나와요.'],
          explain: '모은 기체에는 수증기가 섞여 있어서 O₂의 분압은 대기압보다 작아요. 대기압을 그대로 쓰면 P가 커서 n = PV/RT도 <b>실제보다 크게</b> 나와요(20 °C에서 약 2.4 %).',
        },
      ],
    },
    {
      title: '혼합 기체 설계: 잠수용 기체', short: '혼합 기체 설계', icon: '🤿', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 분압을 계산했어요. 이제 <b>생활 속 혼합 기체</b>인 잠수용 기체를 설계해 봐요.</div>' +
        '<p>깊이가 10 m 깊어질 때마다 압력이 <b>1 atm</b>씩 커져요(수면 1 atm). 전체 압력이 커지면 같은 비율의 기체도 분압이 커져요. 산소 분압은 <b>0.16 ~ 1.4 atm</b>이어야 안전해요. 너무 높으면 산소 독성, 너무 낮으면 산소 부족이에요. 또 질소 분압이 높으면(약 3.2 atm 이상) 판단력이 떨어져서 깊은 곳에서는 <b>헬륨</b>을 섞어요.</p>',
      features: ['dive'],
      setup() { S.lock = false; S.gate = ''; S.dv.depth = 40; S.dv.o2 = 21; S.dv.dil = 'n2'; S.dv.anim = 40; setMode('dive'); },
      recap: '깊이가 깊을수록 전체 압력이 커져서 같은 공기의 산소 분압도 커져요. 산소 분압을 0.16 ~ 1.4 atm에 맞추려면 깊을수록 산소 비율을 낮춰야 하고, 깊은 곳에서는 질소 대신 헬륨을 섞어요.',
      summary: '<ul><li>전체 압력 ≈ 1 + 깊이(m)/10 (atm). P(O₂) = X(O₂) × P(전체)</li><li>안전 범위: <b>0.16 ≤ P(O₂) ≤ 1.4 atm</b></li><li>40 m(5 atm): 공기(O₂ 21 %) → P(O₂) = <b>1.05 atm</b> 안전</li><li>60 m(7 atm): 공기 → <b>1.47 atm</b> (독성 위험) / O₂ 18 % 혼합 기체 → <b>1.26 atm</b> 안전, 수면에서는 0.18 atm로 아슬아슬하게 가능</li><li>헬륨을 섞는 까닭: 질소 분압이 높을 때 생기는 질소 마취를 막기 위해서예요.</li></ul>',
      missions: [
        {
          title: '40 m에서 안전한 혼합 기체',
          goal: '깊이를 <b>40 m</b>로 두고, 산소 비율을 조절해 <b>산소 분압을 0.16 ~ 1.4 atm</b>에 맞춰요.',
          hint: '지금 산소가 40 %라서 P(O₂) = 0.40 × 5.0 = 2.0 atm으로 위험해요. 산소 비율을 낮춰요. 공기(21 %)도 안전해요.',
          setup() { S.lock = true; S.gate = ''; S.dv.depth = 40; S.dv.o2 = 40; S.dv.dil = 'n2'; setMode('dive'); },
          check: () => S.dv.depth === 40 && dvSafe(), hold: 0.7,
          status: () => '깊이 ' + S.dv.depth + ' m ' + mark(S.dv.depth === 40) + ' &nbsp; P(O₂) ' + f2(dvO2()) + ' atm ' + mark(dvSafe()),
          explain: '40 m는 전체 압력 5.0 atm이에요. 공기(O₂ 21 %)는 P(O₂) = 0.21 × 5.0 = <b>1.05 atm</b>으로 안전해요. 산소 비율이 28 %를 넘으면 1.4 atm를 넘어 위험해요.',
        },
        {
          title: '60 m에서 안전한 혼합 기체',
          goal: '깊이 <b>60 m</b>에서 P(O₂)가 <b>0.16 ~ 1.4 atm</b>이고, 질소 마취가 없으며, <b>수면에서도</b> P(O₂) ≥ 0.16 atm인 혼합 기체를 만들어요.',
          hint: '공기(21 %)는 60 m에서 P(O₂) = 1.47 atm이라 위험해요. 산소 비율을 16 ~ 20 %로 하고 나머지는 헬륨으로 바꿔요. (16 % 이상이어야 수면에서 숨 쉴 수 있어요.)',
          setup() { S.lock = true; S.gate = ''; S.dv.depth = 60; S.dv.o2 = 21; S.dv.dil = 'n2'; setMode('dive'); },
          check: () => S.dv.depth === 60 && dvSafe() && !dvNarc() && dvSurf() >= O2_LO, hold: 0.7,
          status: () => '깊이 ' + S.dv.depth + ' m ' + mark(S.dv.depth === 60) + ' &nbsp; P(O₂) ' + f2(dvO2()) + ' ' + mark(dvSafe()) + ' &nbsp; 질소 마취 없음 ' + mark(!dvNarc()) + ' &nbsp; 수면 ' + f2(dvSurf()) + ' ' + mark(dvSurf() >= O2_LO),
          explain: '60 m(7 atm)에서 공기는 P(O₂) = 0.21 × 7 = <b>1.47 atm</b>으로 독성 위험이에요. O₂ 18 %이면 0.18 × 7 = <b>1.26 atm</b>으로 안전하고, 수면(1 atm)에서도 0.18 atm이라 숨 쉴 수 있어요. 질소 대신 헬륨을 섞으면 질소 마취를 막아요.',
        },
        {
          type: 'quiz', title: '깊을수록 산소 분압이 커지는 까닭',
          goal: '같은 <b>공기</b>(O₂ 21 %)를 마시는데 깊이 들어갈수록 <b>산소 분압</b>이 커지는 까닭은?',
          setup() { S.lock = true; S.gate = ''; setMode('dive'); },
          choices: ['깊을수록 공기 중 산소의 비율이 커지기 때문이에요', '깊을수록 전체 압력이 커져서 P(O₂) = X(O₂) × P(전체)도 커지기 때문이에요', '깊을수록 온도가 높아지기 때문이에요', '산소가 물에 녹아서 늘어나기 때문이에요'],
          answer: 1,
          feedback: ['공기의 조성(몰 분율 0.21)은 그대로예요. 달라지는 것은 압력이에요.', '', '이 단원에서는 온도가 일정하다고 봐요. 압력이 달라지는 것이 핵심이에요.', '분압 계산에서는 용해를 따지지 않아요. 전체 압력과 몰 분율로 구해요.'],
          explain: '몰 분율 X(O₂) = 0.21은 그대로이지만 깊이가 깊어지면 <b>전체 압력이 커져서</b> P(O₂) = 0.21 × P(전체)가 커져요. 그래서 깊은 곳에서는 산소 비율을 낮춘 혼합 기체를 써요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-partial-pressure', mount: '#game', badge: '분압 설계사', homeHref: '../../index.html#hx',
    featureLabels: { sum: '🫧 분압 막대 쌓기', frac: '🎚️ 몰 분율 슬라이더', calc: '🧮 연결 용기 · 물 위 포집 · 고도', dive: '🤿 잠수용 혼합 기체' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  cnInit(); vpInit();
  setMode('sum');
  function stepAll1(dt) {
    GK.forEach((g) => { S.pulse[g] = Math.max(0, S.pulse[g] - dt * 3); });
    S.flash.forEach((f) => { f.age += dt; }); S.flash = S.flash.filter((f) => f.age < 0.2);
    if (S.mode === 'sum' || S.mode === 'frac') {
      // 주입 대기열: 입자를 하나씩 위쪽 주입구에서 넣어요
      if (S.mode === 'sum') {
        S.sum.nextT -= dt;
        if (S.sum.nextT <= 0) {
          const g = GK.find((x) => S.sum.q[x] > 0);
          if (g) { S.sum.q[g]--; const i = GK.indexOf(g), p = mkP(g, 36 + i * 64 + rnd(-6, 6), 8); p.ux = rnd(-0.4, 0.4); p.uy = 1; p.fade = 1; PS.push(p); S.sum.nextT = RM ? 0.02 : 0.1; }
        }
      }
      stepBox(dt, BOX.w, BOX.h);
      const tgt = {}; GK.forEach((g) => { tgt[g] = countOf(g) * PART * RTV; });
      const disp = S.mode === 'sum' ? S.sum.disp : S.frac.disp;
      GK.forEach((g) => { disp[g] = SciSim.approach(disp[g], tgt[g], dt, 8); if (Math.abs(disp[g] - tgt[g]) < 0.004) disp[g] = tgt[g]; });
    }
    if (S.mode === 'calc') { stepCn(dt); stepVap(dt); }
    const dv = S.dv; dv.anim = SciSim.approach(dv.anim, dv.depth, dt, 5); if (Math.abs(dv.anim - dv.depth) < 0.05) dv.anim = dv.depth;
  }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if ((S.lock || S.gate) && game && game.phase !== 'active') { S.lock = false; S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'sum' || S.mode === 'frac') drawTwo(t); else if (S.mode === 'calc') drawCalc(t); else drawDive(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, G, GK, CONN_P, VAP_PO2, VAP_W, countOf, setNO, setMode, setAlt, setDepth, setO2, sumReset, cnInit, vpInit, dvO2, dvSafe, dvNarc, dvSurf, injDone,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
