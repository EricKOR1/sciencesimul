/* =========================================================
   물질과 에너지 Ⅲ. 화학 변화의 자발성 - 연료의 효율 비교 [12물에03-01]
   ① 분석: 질량당 열량 (몰당 연소 ΔH 를 몰질량으로 나누어 kJ/g 계산)
   ② 분석: 부피당 열량 (기체 몰 부피 24.5 L/mol, 액체는 밀도로 kJ/mL, 같은 부피 탱크 비교)
   ③ 실험: 연소 실험 (알코올 램프, 물 200 g, 열 이용률 40 % 가정, q = cmΔT)
   ④ 적용: 연료 선택 (용도별 질량·부피 기준, CO₂ 발생량 비교)
   실제 연료는 혼합물이므로 휘발유는 옥탄, 석탄은 탄소로 단순화해요. 열효율 이론·연료 전지는 다루지 않아요.

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
  function parseNum(s) {                                // 20000, 20,000, +92, −54, 2.0e4, 2.0×10^4 모두 읽어요
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '^' + SUP[c]).replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  /* 계수 표기: 0.5 → ½, 1.5 → 1½ */
  const FR = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  const CF = (c) => { if (c === 1) return ''; const w = Math.floor(c + 1e-9), f = Math.round((c - w) * 100) / 100; return (w ? String(w) : '') + (f ? FR[f] || String(f) : ''); };
  const fmtC = (c) => CF(Math.abs(c));

  /* ---------- 배치 ---------- */
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { mass: '⚖️ 같은 질량으로 바꿔 비교해요', vol: '🛢️ 같은 부피로 바꿔 비교해요', burn: '🔥 연료를 태워 물을 데워 봐요', pick: '🎯 용도에 맞는 연료를 골라요' };
  const fk = (v) => (v >= 100 ? f0(v) : f1(v));
  const clip = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ================= 자료 ================= */
  const FU = [
    { k: 'H2', name: '수소', f: 'H₂(g)', M: 2, dH: 286, col: '#38bdf8', co2: 0 },
    { k: 'CH4', name: '메테인', f: 'CH₄(g)', M: 16, dH: 890, col: '#f59e0b', co2: 1 },
    { k: 'EtOH', name: '에탄올', f: 'C₂H₅OH(l)', M: 46, dH: 1367, col: '#a78bfa', co2: 2 },
    { k: 'Oct', name: '옥탄', f: 'C₈H₁₈(l)', M: 114, dH: 5471, col: '#64748b', co2: 8 },
    { k: 'C', name: '탄소(석탄)', f: 'C(s)', M: 12, dH: 394, col: '#374151', co2: 1 },
  ];
  FU.forEach((f) => { f.kg = f.dH / f.M; f.co2k = f.co2 / (f.dH / 1000); });
  const FUk = (k) => FU.filter((f) => f.k === k)[0];
  const KJG_MAX = 150, KJM_MAX = 5471;
  /* 부피당: 기체는 25 °C, 1 atm 에서 24.5 L/mol, 액체는 밀도 */
  const VO = [
    { k: 'H2g', name: '수소 기체', sub: '25 °C, 1 atm', gas: true, ed: 286 / 24.5 / 1000, ng: 5, col: '#38bdf8', txt: '11.7 kJ/L' },
    { k: 'CH4g', name: '메테인 기체', sub: '25 °C, 1 atm', gas: true, ed: 890 / 24.5 / 1000, ng: 16, col: '#f59e0b', txt: '36.3 kJ/L' },
    { k: 'H2c', name: '압축 수소', sub: '700 atm', gas: true, ed: 0.039 * 143, ng: 70, col: '#38bdf8', txt: '5.6 kJ/mL' },
    { k: 'H2l', name: '액체 수소', sub: '−253 °C', gas: false, ed: 0.0708 * 143, col: '#7dd3fc', txt: '10.1 kJ/mL' },
    { k: 'EtOH', name: '에탄올', sub: '액체 0.789 g/mL', gas: false, ed: (1367 / 46) * 0.789, col: '#c4b5fd', txt: '23.4 kJ/mL' },
    { k: 'Oct', name: '옥탄', sub: '액체 0.703 g/mL', gas: false, ed: (5471 / 114) * 0.703, col: '#94a3b8', txt: '33.7 kJ/mL' },
  ];
  const TANK_L = 50;
  const tankMJ = (o) => o.ed * TANK_L;                 // kJ/mL × 50 000 mL = kJ → ÷ 1000 = MJ
  const MJ_MAX = tankMJ(VO[5]);
  const fmj = (v) => (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : f0(v));
  const fpc = (v) => (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : f0(v));
  /* 연소 실험 */
  const CW = 4.18, WM = 200, UTIL = 0.40, T0B = 20.0;
  const BF = [
    { k: 'EtOH', name: '에탄올', f: 'C₂H₅OH', Q: 29.7, dT: 14.2, col: '#c4b5fd' },
    { k: 'MeOH', name: '메탄올', f: 'CH₃OH', Q: 22.7, dT: 10.9, col: '#f9a8d4' },
    { k: 'Oct', name: '옥탄', f: 'C₈H₁₈', Q: 48.0, dT: 23.0, col: '#94a3b8' },
  ];
  BF.forEach((b) => { b.theory = b.Q / (WM / 1000 * CW); b.qw = WM * CW * b.dT / 1000; b.eff = b.qw / b.Q * 100; });
  const T_BURN = 60, T_BEND = 120, B_SPEED = 20, B_COOL = 0.004;
  const burnT = (i, tt) => { const b = BF[i]; if (tt <= T_BURN) return T0B + b.dT * sm(tt / T_BURN); return T0B + b.dT - B_COOL * (tt - T_BURN); };
  /* 용도별 선택 */
  const PK = [
    { k: 'H2l', name: '액체 수소', kg: 143, v: '10.1 kJ/mL', co2: 0, store: '−253 °C 로 액화해 보관해야 해요 (매우 낮은 온도)' },
    { k: 'H2c', name: '압축 수소(700 atm)', kg: 143, v: '5.6 kJ/mL', co2: 0, store: '아주 튼튼한 고압 용기가 필요해요' },
    { k: 'CH4', name: '메테인(천연가스)', kg: 55.6, v: '36.3 kJ/L(기체)', co2: 1.12, store: '기체여서 압축하거나 액화해야 해요' },
    { k: 'EtOH', name: '에탄올', kg: 29.7, v: '23.4 kJ/mL', co2: 1.46, store: '액체라 보관과 운반이 쉬워요. 식물에서 얻을 수 있어요' },
    { k: 'Oct', name: '옥탄(휘발유)', kg: 48.0, v: '33.7 kJ/mL', co2: 1.46, store: '액체라 보관과 운반이 쉬워요. 석유에서 얻어요' },
    { k: 'C', name: '탄소(석탄)', kg: 32.8, v: '—', co2: 2.54, store: '고체여서 다루기 불편하고 재가 남아요' },
  ];
  const PKk = (k) => PK.filter((p) => p.k === k)[0];
  const PU = [
    { name: '휴대용 화덕', icon: '⛺', need: '등산 가방에 넣어 짊어지고 다녀요. 가벼울수록 좋아요. (상온에서 다루기 쉬운 액체·고체 연료만 후보예요)', crit: 'm', cands: ['EtOH', 'Oct', 'C'], best: 'Oct' },
    { name: '승용차', icon: '🚗', need: '연료 탱크의 크기가 정해져 있어요. 같은 부피에 열량이 클수록 멀리 가요.', crit: 'v', cands: ['H2c', 'EtOH', 'Oct'], best: 'Oct' },
    { name: '로켓', icon: '🚀', need: '발사할 때 연료의 무게가 가장 큰 부담이에요. 같은 질량에서 열량이 클수록 좋아요.', crit: 'm', cands: ['H2l', 'CH4', 'Oct'], best: 'H2l' },
  ];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'mass', fade: 0, lock: false, t: 0,
    ms: { q: ['', '', '', '', ''], ok: [false, false, false, false, false], bar: [0, 0, 0, 0, 0] },
    vol: { sel: 5, fill: 1, seen: {}, q: ['', '', ''], ok: [false, false, false], gas: [], pulse: 1 },
    bn: { sel: 0, phase: 'idle', t: 0, done: [false, false, false], solved: [false, false, false], q: '', e: '', okq: false, oke: false, flash: 0, ok: 0 },
    pk: { cs: 0, crit: [null, null, null], fuel: [null, null, null], msg: '', bad: false, done: false },
  };
  let game = null;
  const msN = () => S.ms.ok.filter((x) => x).length;
  const volN = () => Object.keys(S.vol.seen).length;

  /* ================= ① 질량당 열량 ================= */
  const MQT = (i) => Math.max(0.6, FU[i].kg * 0.015);
  function stepMass(dt) { S.ms.bar.forEach((b, i) => { S.ms.bar[i] = ap2(b, S.ms.ok[i] ? 1 : 0, dt, 4); if (Math.abs(S.ms.bar[i] - (S.ms.ok[i] ? 1 : 0)) < 0.003) S.ms.bar[i] = S.ms.ok[i] ? 1 : 0; }); }
  function drawMass(t) {
    const L = RC.L, M = S.ms;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '⚖️ 연료 카드 5장: 몰당 → 질량당', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '|ΔH| (kJ/mol) 를 몰질량 M (g/mol) 으로 나누어 1 g 당 열량을 구해요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const rh = 74, bx = L.x + 146, bw = L.w - 146 - 20;
    FU.forEach((f, i) => {
      const y = L.y + 62 + i * (rh + 2), ok = M.ok[i];
      D.roundRect(L.x + 10, y, L.w - 20, rh, 12); ctx.fillStyle = ok ? 'rgba(20,160,88,.07)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = ok ? GOOD : '#dbe3f3'; ctx.lineWidth = ok ? 2 : 1.4; ctx.stroke();
      D.sphere(L.x + 28, y + 24, 9, f.col, { gloss: true });
      T(L.x + 44, y + 28, f.name, 14.5, INK, 'left', 800);
      T(L.x + 22, y + 48, f.f, 12.5, MUTED, 'left', 800);
      T(L.x + 22, y + 66, 'M = ' + f.M + ' g/mol', 12, MUTED, 'left', 700);
      // 몰당 막대 (축척: 5471 kJ/mol)
      T(bx, y + 17, '몰당 ' + MINUS + f.dH + ' kJ/mol', 12, MUTED, 'left', 800);
      ctx.fillStyle = '#e9edf5'; D.roundRect(bx, y + 22, bw, 10, 5); ctx.fill();
      ctx.fillStyle = '#8fa3c7'; D.roundRect(bx, y + 22, Math.max(0.5, bw * f.dH / KJM_MAX), 10, 5); ctx.fill();
      // 질량당 막대 (축척: 150 kJ/g)
      T(bx, y + 52, ok ? '질량당 ' + fk(f.kg) + ' kJ/g' : '질량당 ? kJ/g', 12.5, ok ? '#0f6b3c' : PUR, 'left', 800);
      ctx.fillStyle = '#e9edf5'; D.roundRect(bx, y + 57, bw, 11, 5.5); ctx.fill();
      const w = bw * f.kg / KJG_MAX * sm(M.bar[i]);
      if (w > 0.5) { ctx.fillStyle = f.col; D.roundRect(bx, y + 57, w, 11, 5.5); ctx.fill(); }
      if (!ok) { ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4; D.roundRect(bx, y + 57, bw, 11, 5.5); ctx.stroke(); ctx.restore(); }
    });
    T(L.x + L.w - 14, L.y + L.h - 10, '막대 눈금: 몰당 0~5471 kJ/mol, 질량당 0~150 kJ/g (서로 다른 눈금)', 11.5, MUTED, 'right', 700);
  }
  function drawMassInfo(t) {
    const R = RC.R, M = S.ms, n = msN();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🏁 질량당 열량 순위', 14.5, INK, 'left', 800);
    const done = FU.map((f, i) => ({ f, i })).filter((o) => M.ok[o.i]).sort((a, b) => b.f.kg - a.f.kg);
    let y = R.y + 52;
    if (!done.length) y += textBlock(R.x + 14, y, R.w - 28, '왼쪽 카드의 몰당 열량을 몰질량으로 나누어 조작판에 적으면 순위가 쌓여요.', 13, MUTED, 18, 700) + 8;
    done.forEach((o, k) => { T(R.x + 14, y + k * 24, (k + 1) + '위  ' + o.f.name, 13.5, INK, 'left', 800); T(R.x + R.w - 14, y + k * 24, fk(o.f.kg) + ' kJ/g', 14, '#0f6b3c', 'right', 800); });
    y += done.length * 24 + 10;
    T(R.x + 14, y, '계산한 연료 ' + n + ' / 5', 13, n === 5 ? GOOD : MUTED, 'left', 800); y += 22;
    if (n === 5) {
      D.roundRect(R.x + 10, y, R.w - 20, PHONE ? 104 : 150, 10); ctx.fillStyle = 'rgba(20,160,88,.09)'; ctx.fill(); ctx.strokeStyle = GOOD; ctx.lineWidth = 1.6; ctx.stroke();
      textBlock(R.x + 20, y + 22, R.w - 40, '몰당으로는 옥탄이 5471 kJ/mol 로 가장 크지만, 질량당으로는 수소가 143 kJ/g 으로 압도적이에요. 어떤 단위로 나누느냐에 따라 순위가 바뀌어요.', 12.5, '#0f6b3c', 17, 800);
    } else if (!PHONE || y + 60 < R.y + R.h) {
      textBlock(R.x + 14, y + 2, R.w - 28, '예: 수소 286 kJ/mol 을 M = 2 g/mol 로 나누면 143 kJ/g 이에요. 실제 휘발유와 석탄은 혼합물이라 옥탄과 탄소로 단순화했어요.', 12.5, MUTED, 17, 700);
    }
  }

  /* ================= ② 부피당 열량 ================= */
  const VT = () => { const L = RC.L; return { x: L.x + 28, y: L.y + 96, w: 214, h: 168 }; };
  const VS = () => VO[S.vol.sel];
  function stepVol(dt) {
    const V = S.vol, o = VS();
    V.fill = ap2(V.fill, 1, dt, 2.2); if (V.fill > 0.995) V.fill = 1;
    V.pulse = ap2(V.pulse, 1, dt, 3); if (V.pulse > 0.995) V.pulse = 1;
    const tk = VT(), want = o.gas ? o.ng : 0;
    while (V.gas.length < want) V.gas.push({ x: tk.x + 14 + Math.random() * (tk.w - 28), y: tk.y + 14 + Math.random() * (tk.h - 28), vx: rnd(-60, 60), vy: rnd(-60, 60) });
    while (V.gas.length > want) V.gas.pop();
    const sp = o.gas ? 1 : 0;
    V.gas.forEach((p) => {
      p.x += p.vx * dt * sp; p.y += p.vy * dt * sp;
      if (p.x < tk.x + 8) { p.x = tk.x + 8; p.vx = Math.abs(p.vx); } else if (p.x > tk.x + tk.w - 8) { p.x = tk.x + tk.w - 8; p.vx = -Math.abs(p.vx); }
      if (p.y < tk.y + 8) { p.y = tk.y + 8; p.vy = Math.abs(p.vy); } else if (p.y > tk.y + tk.h - 8) { p.y = tk.y + tk.h - 8; p.vy = -Math.abs(p.vy); }
    });
  }
  function setVol(i) { const V = S.vol; if (V.sel !== i) { V.sel = i; V.fill = 0; V.pulse = 0; V.gas = []; } V.seen[i] = true; Sound.tick(); updateCtl(); }
  function drawVol(t) {
    const L = RC.L, V = S.vol, o = VS(), tk = VT(), E = tankMJ(o);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🛢️ 같은 크기의 연료 탱크(50 L)에 실어 봐요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '조작판에서 연료를 바꿔 가며 실린 열량을 비교해요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 탱크
    D.shadow(() => { D.roundRect(tk.x - 4, tk.y - 4, tk.w + 8, tk.h + 8, 18); ctx.fillStyle = '#eef2f8'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); D.roundRect(tk.x, tk.y, tk.w, tk.h, 14); ctx.clip();
    ctx.fillStyle = '#f8fafd'; ctx.fillRect(tk.x, tk.y, tk.w, tk.h);
    if (!o.gas) {
      const lvl = sm(V.fill), ly = tk.y + tk.h * (1 - lvl);
      const gr = ctx.createLinearGradient(0, ly, 0, tk.y + tk.h); gr.addColorStop(0, C.rgba(o.col, 0.65)); gr.addColorStop(1, C.rgba(o.col, 0.95));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(tk.x, tk.y + tk.h);
      for (let i = 0; i <= 20; i++) ctx.lineTo(tk.x + tk.w * i / 20, ly + Math.sin(t * 2.5 + i * 0.7) * 1.8);
      ctx.lineTo(tk.x + tk.w, tk.y + tk.h); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = C.rgba(o.col, 0.08 + Math.min(0.22, o.ng / 70 * 0.22)); ctx.fillRect(tk.x, tk.y, tk.w, tk.h);
      V.gas.forEach((p) => D.sphere(p.x, p.y, 5, o.col, { gloss: false }));
    }
    ctx.restore();
    D.roundRect(tk.x, tk.y, tk.w, tk.h, 14); ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3.5; ctx.stroke();
    D.roundRect(tk.x + tk.w - 52, tk.y - 16, 30, 12, 4); ctx.fillStyle = '#7d8da6'; ctx.fill();
    D.label(tk.x + tk.w / 2, tk.y + tk.h / 2, '탱크 50 L', { size: 13, bg: 'rgba(38,50,74,.78)', align: 'center' });
    T(tk.x + tk.w / 2, tk.y + tk.h + 22, o.name + ' (' + o.sub + ')', 13.5, INK, 'center', 800);
    if (o.gas) T(tk.x + tk.w / 2, tk.y + tk.h + 40, '입자 수는 개념도예요 (압력이 클수록 많이 들어가요)', 11.5, MUTED, 'center', 700);
    // 오른쪽 수치
    const px = tk.x + tk.w + 28, pw = L.x + L.w - 16 - px;
    T(px, tk.y + 16, '부피당 열량', 12.5, MUTED, 'left', 800);
    T(px, tk.y + 46, o.txt, 22, INK, 'left', 800);
    T(px, tk.y + 72, o.gas && o.k !== 'H2c' ? '= 1 mol 당 |ΔH| / 24.5 L' : o.k === 'H2c' ? '= 0.039 g/mL × 143 kJ/g' : o.k === 'H2l' ? '= 0.0708 g/mL × 143 kJ/g' : '= kJ/g × 밀도', 12, MUTED, 'left', 700);
    T(px, tk.y + 106, '탱크에 실린 열량', 12.5, MUTED, 'left', 800);
    T(px, tk.y + 138, fmj(E) + ' MJ', 24, '#0f6b3c', 'left', 800);
    // 열량 눈금 막대 (축척: 옥탄 1687 MJ)
    const gx = L.x + 28, gy = L.y + 330, gw = L.w - 56;
    T(gx, gy - 12, '탱크에 실린 열량 (눈금 끝 = 옥탄 ' + f0(MJ_MAX) + ' MJ)', 12.5, INK, 'left', 800);
    ctx.fillStyle = '#e9edf5'; D.roundRect(gx, gy, gw, 22, 11); ctx.fill();
    const w = gw * E / MJ_MAX * sm(V.pulse);
    if (w > 0.4) { ctx.fillStyle = o.col; D.roundRect(gx, gy, Math.max(w, Math.min(22, w)), 22, 11); ctx.fill(); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.4; D.roundRect(gx, gy, gw, 22, 11); ctx.stroke();
    T(gx + gw, gy + 42, '옥탄 탱크의 ' + fpc(E / MJ_MAX * 100) + ' %', 14, o.k === 'Oct' ? GOOD : INK, 'right', 800);
    T(gx, gy + 42, o.gas && o.ng < 20 ? '기체는 부피가 커서 열량이 아주 작아요' : '', 12.5, BAD, 'left', 800);
    textBlock(L.x + 16, L.y + 424, L.w - 32, volMsg(o), 13, INK, 18, 800);
  }
  function volMsg(o) {
    if (o.k === 'H2g') return '수소는 질량당 열량이 가장 큰데도, 1 atm 기체는 부피당 열량이 매우 작아요. 같은 탱크에 실린 열량이 옥탄 탱크의 약 0.03 % 예요.';
    if (o.k === 'CH4g') return '메테인 기체도 1 atm 에서는 부피당 열량이 작아요. 그래서 천연가스는 압축하거나 액화해서 써요.';
    if (o.k === 'H2c') return '700 atm 으로 압축하면 부피당 열량이 크게 늘지만, 그래도 옥탄의 약 1/6 이에요.';
    if (o.k === 'H2l') return '액체 수소는 −253 °C 로 식혀야 해요. 부피당 열량은 옥탄의 약 30 % 예요.';
    if (o.k === 'EtOH') return '에탄올은 같은 부피로 옥탄의 약 70 % 의 열량을 실어요.';
    return '옥탄(휘발유)은 같은 부피에 가장 많은 열량을 실어요. 그래서 자동차 연료로 널리 써요.';
  }
  function drawVolInfo(t) {
    const R = RC.R, V = S.vol;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📊 같은 50 L 탱크에 실리는 열량', 13.5, INK, 'left', 800);
    const rh = PHONE ? 46 : 54, bx = R.x + 14, bw = R.w - 28;
    VO.forEach((o, i) => {
      const y = R.y + 40 + i * rh, sel = i === V.sel, E = tankMJ(o);
      if (sel) { D.roundRect(R.x + 6, y - 3, R.w - 12, rh - 2, 8); ctx.fillStyle = 'rgba(124,58,237,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 1.6; ctx.stroke(); }
      T(bx, y + 13, o.name + (o.k === 'H2c' ? ' 700 atm' : ''), 13, sel ? PUR : INK, 'left', 800);
      T(bx + bw, y + 13, o.txt + ' · ' + fmj(E) + ' MJ', 12, MUTED, 'right', 800);
      ctx.fillStyle = '#e9edf5'; D.roundRect(bx, y + 21, bw, 12, 6); ctx.fill();
      const w = bw * E / MJ_MAX; if (w > 0.4) { ctx.fillStyle = o.col; D.roundRect(bx, y + 21, Math.max(w, Math.min(12, w)), 12, 6); ctx.fill(); }
    });
    const yb = R.y + 40 + VO.length * rh + 8;
    if (!PHONE || yb + 40 < R.y + R.h) textBlock(R.x + 14, yb + 4, R.w - 28, '막대는 모두 같은 눈금이에요. 1 atm 기체의 막대는 너무 짧아서 보이지 않아요. (1 kJ/mL = 1000 kJ/L)', 12, MUTED, 16, 700);
    T(R.x + 14, R.y + R.h - 12, '살펴본 연료 ' + volN() + ' / 6', 13, volN() === 6 ? GOOD : MUTED, 'left', 800);
  }

  /* ================= ③ 연소 실험 ================= */
  const BS = () => S.bn;
  const bfSel = () => BF[BS().sel];
  const bnDone = () => BS().done[BS().sel];
  const bnTime = () => { const B = BS(); return B.phase === 'run' ? B.t : bnDone() ? T_BEND : 0; };
  function bnCheck() {
    const B = BS(), b = bfSel(), d = bnDone();
    B.okq = d && B.q !== '' && near(parseNum(B.q), b.qw, 0.25);
    B.oke = d && B.e !== '' && near(parseNum(B.e), b.eff, 2);
    if (B.okq && B.oke && !B.solved[B.sel]) { B.solved[B.sel] = true; Sound.success(); B.flash = 1; parts.burst(RC.L.x + 330, RC.L.y + 200, { count: 14, speed: 120, life: 0.6, size: 3.6 }); }
  }
  function bnClear() { const B = BS(); B.q = ''; B.e = ''; B.okq = false; B.oke = false; ['#bq', '#be'].forEach((id) => { const n = $(id); n.value = ''; n.classList.remove('ok', 'bad'); }); }
  function bnStop() { const B = BS(); B.phase = 'idle'; B.t = 0; }
  function setBurn(i) { const B = BS(); if (B.sel !== i || B.phase === 'run') { B.sel = i; bnStop(); bnClear(); } updateCtl(); bnCheck(); }
  function runBurn() { const B = BS(); if (B.phase === 'run') return; B.phase = 'run'; B.t = 0; B.done[B.sel] = false; bnClear(); Sound.click(); updateCtl(); }
  function stepBurn(dt) {
    const B = BS(); if (B.flash > 0) B.flash = Math.max(0, B.flash - dt * 1.4);
    if (B.phase !== 'run') return;
    B.t = Math.min(T_BEND, B.t + dt * B_SPEED * (RM ? 3 : 1));
    if (!RM && S.mode === 'burn' && B.t < T_BURN && Math.random() < dt * 14) parts.emit({ x: BG0().cx + rnd(-8, 8), y: BG0().by - 10, vx: rnd(-10, 10), vy: -rnd(30, 55), life: 1.1, size: 6, color: 'rgba(120,120,130,.45)', shape: 'smoke', fade: true });
    if (B.t >= T_BEND) { B.phase = 'done'; B.done[B.sel] = true; Sound.tick(); updateCtl(); bnCheck(); }
  }
  const BG0 = () => { const L = RC.L; return { x: L.x + 56, y: L.y + 76, w: 132, h: 112, cx: L.x + 122, by: L.y + 246 }; };
  function drawBurn(t) {
    const L = RC.L, B = BS(), b = bfSel(), g = BG0(), td = bnTime(), Tn = burnT(B.sel, td), p = sm(clip(td / T_BURN, 0, 1));
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔥 알코올 램프로 물 200 g 을 데워요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, b.name + ' ' + b.f + ' 1.00 g 을 모두 태우고 물의 온도 변화를 재요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 삼발이
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g.x - 14, g.y + g.h + 8); ctx.lineTo(g.x + g.w + 14, g.y + g.h + 8); ctx.moveTo(g.x - 4, g.y + g.h + 8); ctx.lineTo(g.x - 14, g.by + 44); ctx.moveTo(g.x + g.w + 4, g.y + g.h + 8); ctx.lineTo(g.x + g.w + 14, g.by + 44); ctx.stroke();
    // 물이 든 비커
    const liq = C.mix('#a9d6ff', '#ffd3a0', clip((Tn - T0B) / 25, 0, 1));
    D.beaker(g.x, g.y, g.w, g.h, { level: 0.72, liquid: liq, t, wave: 1.3, ticks: 4 });
    T(g.cx, g.y + g.h - 12, '물 200 g', 12.5, '#1d4f8a', 'center', 800);
    D.thermometer(g.x + g.w * 0.74, g.y - 26, 96, Tn, 15, 50, { ticks: false, color: Tn > T0B + 0.3 ? HOT : COLD });
    // 램프
    const lx = g.cx - 36, ly = g.by + 4, lw = 72, lh = 44, remain = 1 - p;
    D.shadow(() => { D.roundRect(lx, ly, lw, lh, 14); ctx.fillStyle = 'rgba(210,228,245,.55)'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.save(); D.roundRect(lx, ly, lw, lh, 14); ctx.clip(); ctx.fillStyle = C.rgba(b.col, 0.85); ctx.fillRect(lx, ly + lh - lh * 0.86 * remain, lw, lh * 0.86 * remain + 2); ctx.restore();
    D.roundRect(lx, ly, lw, lh, 14); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.fillStyle = '#d6d0c4'; ctx.fillRect(g.cx - 7, ly - 14, 14, 16); ctx.fillStyle = '#7a6a4f'; ctx.fillRect(g.cx - 2, ly - 20, 4, 8);
    if (B.phase === 'run' && td < T_BURN) { const sz = 50 * (0.45 + 0.55 * Math.sin(Math.PI * clip(td / T_BURN, 0, 1))); D.flame(g.cx, ly - 20, sz, t); }
    T(g.cx, ly + lh + 18, '연료 ' + (1.0 * remain).toFixed(2) + ' g', 12.5, INK, 'center', 800);
    // 에너지 흐름 그림
    const fx = L.x + 232, fw = L.w - 232 - 14, Q = b.Q, qw = b.qw;
    D.roundRect(fx, L.y + 70, fw, 40, 10); ctx.fillStyle = '#fff6e8'; ctx.fill(); ctx.strokeStyle = '#f1c88a'; ctx.lineWidth = 1.6; ctx.stroke();
    T(fx + fw / 2, L.y + 87, '연료 1.00 g 의 연소열', 12, AMB, 'center', 800); T(fx + fw / 2, L.y + 104, Q.toFixed(1) + ' kJ', 14, INK, 'center', 800);
    const act = B.phase === 'run' && td < T_BURN ? 1 : bnDone() ? 0.7 : 0.25, hw = fw / 2;
    D.arrow(fx + hw * 0.5, L.y + 114, fx + hw * 0.5, L.y + 154, { color: GOOD, width: 4 + 10 * UTIL, head: 14, alpha: act });
    D.arrow(fx + hw * 1.5, L.y + 114, fx + hw * 1.5, L.y + 154, { color: BAD, width: 4 + 10 * (1 - UTIL), head: 14, alpha: act, dash: [6, 5] });
    D.roundRect(fx, L.y + 160, hw - 4, 62, 10); ctx.fillStyle = 'rgba(20,160,88,.08)'; ctx.fill(); ctx.strokeStyle = GOOD; ctx.lineWidth = 1.6; ctx.stroke();
    T(fx + hw / 2 - 2, L.y + 179, '물이 얻은 열', 12, '#0f6b3c', 'center', 800); T(fx + hw / 2 - 2, L.y + 200, bnDone() ? qw.toFixed(1) + ' kJ' : '?', 15, '#0f6b3c', 'center', 800); T(fx + hw / 2 - 2, L.y + 216, '약 40 %', 11.5, MUTED, 'center', 800);
    D.roundRect(fx + hw + 4, L.y + 160, hw - 4, 62, 10); ctx.fillStyle = 'rgba(226,70,75,.07)'; ctx.fill(); ctx.strokeStyle = BAD; ctx.lineWidth = 1.6; ctx.stroke();
    T(fx + hw * 1.5 + 2, L.y + 179, '주위로 손실', 12, '#b02a30', 'center', 800); T(fx + hw * 1.5 + 2, L.y + 200, bnDone() ? (Q - qw).toFixed(1) + ' kJ' : '?', 15, '#b02a30', 'center', 800); T(fx + hw * 1.5 + 2, L.y + 216, '약 60 %', 11.5, MUTED, 'center', 800);
    T(fx + fw / 2, L.y + 246, '열 이용률 40 % 로 가정해요', 12, MUTED, 'center', 700);
    T(fx + fw / 2, L.y + 266, '현재 ' + f1(Tn) + ' °C (ΔT ' + sgn(Tn - T0B, 1) + ')', 14, INK, 'center', 800);
    // 그래프
    const gx = L.x + 54, gy = L.y + 340, gw = L.w - 74, gh = 90, ymin = 20, ymax = 50;
    const X = (tt) => gx + tt / T_BEND * gw, Y = (v) => gy + gh - (v - ymin) / (ymax - ymin) * gh;
    ctx.fillStyle = '#fbfdff'; D.roundRect(gx, gy, gw, gh, 6); ctx.fill(); ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let v = ymin; v <= ymax; v += 10) { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); T(gx - 7, Y(v) + 4, String(v), 12, MUTED, 'right', 700); }
    for (let tt = 0; tt <= T_BEND; tt += 30) { ctx.beginPath(); ctx.moveTo(X(tt), gy); ctx.lineTo(X(tt), gy + gh); ctx.stroke(); T(X(tt), gy + gh + 15, String(tt), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    T(gx + gw, gy + gh + 31, '시간 t (초) →', 12.5, MUTED, 'right', 800); T(gx - 6, gy - 7, '물의 온도 (°C)', 12.5, MUTED, 'left', 800);
    if (td > 0) {
      ctx.strokeStyle = HOT; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let tt = 0; tt <= td + 1e-6; tt += 1) { const px = X(tt), py = Y(burnT(B.sel, tt)); tt === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke(); D.sphere(X(td), Y(burnT(B.sel, td)), 5, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.6 });
    }
    if (bnDone()) {
      const yA = Y(T0B), yB = Y(T0B + b.dT), xp = X(T_BURN);
      ctx.save(); ctx.strokeStyle = 'rgba(38,50,74,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, yA); ctx.lineTo(xp + 50, yA); ctx.moveTo(xp - 8, yB); ctx.lineTo(xp + 50, yB); ctx.stroke(); ctx.restore();
      D.arrow(xp + 40, yA, xp + 40, yB + 2, { color: PUR, width: 3, head: 9 }); D.arrow(xp + 40, yB, xp + 40, yA - 2, { color: PUR, width: 3, head: 9 });
      D.label(xp + 50, (yA + yB) / 2, 'ΔT = +' + f1(b.dT) + ' °C', { size: 12.5, bg: PUR, align: 'left' });
    }
    textBlock(L.x + 14, L.y + L.h - 22, L.w - 28, B.phase === 'run' ? '연료가 타는 동안 물의 온도가 올라가요.' : bnDone() ? '이론값(100 % 이용)보다 훨씬 작게 올랐어요. 열이 주위로 새어 나갔기 때문이에요.' : '「불 붙이기」를 누르면 1.00 g 이 모두 타요.', 12.5, INK, 17, 800);
    if (B.flash > 0) { ctx.fillStyle = 'rgba(20,160,88,' + (B.flash * 0.12) + ')'; D.roundRect(L.x, L.y, L.w, L.h, 14); ctx.fill(); }
  }
  function drawBurnInfo(t) {
    const R = RC.R, B = BS(), b = bfSel(), d = bnDone();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 세 연료 비교 (1.00 g)', 14, INK, 'left', 800);
    const x1 = R.x + R.w - 150, x2 = R.x + R.w - 84, x3 = R.x + R.w - 12;
    T(x1, R.y + 48, '이론 ΔT', 12, MUTED, 'center', 800); T(x2, R.y + 48, '측정 ΔT', 12, MUTED, 'center', 800); T(x3, R.y + 48, '이용률', 12, MUTED, 'right', 800);
    BF.forEach((f, i) => {
      const y = R.y + 74 + i * 30, sel = i === B.sel, dn = B.done[i];
      if (sel) { D.roundRect(R.x + 6, y - 17, R.w - 12, 26, 8); ctx.fillStyle = 'rgba(124,58,237,.08)'; ctx.fill(); }
      T(R.x + 14, y, f.name, 13.5, sel ? PUR : INK, 'left', 800);
      T(x1, y, f1(f.theory) + ' °C', 12.5, MUTED, 'center', 800);
      T(x2, y, dn ? '+' + f1(f.dT) + ' °C' : '—', 12.5, dn ? HOT : '#9aa6bb', 'center', 800);
      T(x3, y, dn ? f0(f.eff) + ' %' : '—', 13, dn ? '#0f6b3c' : '#9aa6bb', 'right', 800);
    });
    let y = R.y + 74 + 3 * 30 + 10;
    D.roundRect(R.x + 10, y, R.w - 20, 96, 10); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    T(R.x + 20, y + 20, '이론 ΔT = Q / (c · m)', 13, INK, 'left', 800);
    T(R.x + 20, y + 42, '= ' + b.Q.toFixed(1) + ' kJ / (4.18 J/(g·°C) × 200 g)', 12, MUTED, 'left', 700);
    T(R.x + 20, y + 62, '= ' + b.Q.toFixed(1) + ' kJ / 0.836 kJ/°C = ' + f1(b.theory) + ' °C', 12, MUTED, 'left', 700);
    T(R.x + 20, y + 84, '(연소열 전부가 물에 전달될 때)', 12, MUTED, 'left', 700);
    y += 108;
    if (d && B.okq && B.oke) { textBlock(R.x + 14, y + 6, R.w - 28, '이용률 = q / Q = ' + b.qw.toFixed(1) + ' / ' + b.Q.toFixed(1) + ' ≈ ' + f0(b.eff) + ' %. 열 손실, 불완전 연소, 증발 때문에 이론값보다 작아요.', 12.5, '#0f6b3c', 17, 800); }
    else if (!PHONE || y + 40 < R.y + R.h) textBlock(R.x + 14, y + 6, R.w - 28, d ? '측정한 ΔT 로 물이 얻은 열 q 와 열 이용률을 구해 조작판에 적어요.' : '불을 붙여 측정하면 이 표가 채워져요.', 12.5, MUTED, 17, 700);
  }

  /* ================= ④ 연료 선택 ================= */
  const PS = () => S.pk;
  const pkCase = () => PU[PS().cs];
  const pkDone = () => !!game && game.phase !== 'active' && pkCheck() === true;
  function setCase(i) { PS().cs = i; buildPick(); updateCtl(); }
  function setCrit(c) { const P = PS(); P.crit[P.cs] = c; P.msg = ''; Sound.tick(); updateCtl(); }
  function setFuel(k) { const P = PS(); P.fuel[P.cs] = k; P.msg = ''; Sound.tick(); updateCtl(); }
  function pkCheck() {
    const P = PS();
    for (let i = 0; i < 3; i++) {
      const u = PU[i];
      if (!P.crit[i] || !P.fuel[i]) return '「' + u.name + '」의 기준과 연료를 모두 골라 주세요.';
      if (P.crit[i] !== u.crit) return '「' + u.name + '」: ' + (u.crit === 'm' ? '연료의 질량이 중요하니 질량당 열량을 기준으로 해요.' : '탱크의 부피가 정해져 있으니 부피당 열량을 기준으로 해요.');
      if (P.fuel[i] !== u.best) return '「' + u.name + '」: 후보 중 ' + (u.crit === 'm' ? '질량당' : '부피당') + ' 열량이 가장 큰 연료를 골라요. 표의 값을 비교해 봐요.';
    }
    return true;
  }
  function buildPick() {
    const u = pkCase(), box = $('#pickChips'); box.innerHTML = '';
    u.cands.forEach((k) => box.appendChild(chipBtn(PKk(k).name, PKk(k).name, () => setFuel(k))));
  }
  function drawPick(t) {
    const L = RC.L, P = PS(), u = pkCase(), cs = P.cs;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🎯 용도에 맞는 연료를 골라요', PHONE ? 14 : 15, INK, 'left', 800);
    D.roundRect(L.x + 12, L.y + 38, L.w - 24, 78, 12); ctx.fillStyle = '#f3efff'; ctx.fill(); ctx.strokeStyle = 'rgba(124,58,237,.4)'; ctx.lineWidth = 1.6; ctx.stroke();
    T(L.x + 24, L.y + 62, u.icon + ' ' + u.name, 16, PUR, 'left', 800);
    textBlock(L.x + 24, L.y + 82, L.w - 48, u.need, 12.5, INK, 17, 700);
    // 표
    const cn = L.x + 14, c1 = L.x + 252, c2 = L.x + 372, c3 = L.x + L.w - 14, y0 = L.y + 136;
    const crit = P.crit[cs];
    if (crit === 'm') { D.roundRect(c1 - 64, y0 - 16, 70, 214, 8); ctx.fillStyle = 'rgba(124,58,237,.08)'; ctx.fill(); }
    if (crit === 'v') { D.roundRect(c2 - 104, y0 - 16, 110, 214, 8); ctx.fillStyle = 'rgba(124,58,237,.08)'; ctx.fill(); }
    T(cn, y0, '연료', 12.5, MUTED, 'left', 800); T(c1, y0, '질량당 (kJ/g)', 12.5, MUTED, 'right', 800); T(c2, y0, '부피당', 12.5, MUTED, 'right', 800); T(c3, y0, 'CO₂ (mol)*', 12.5, MUTED, 'right', 800);
    PK.forEach((f, i) => {
      const y = y0 + 12 + i * 31, cand = u.cands.indexOf(f.k) >= 0, chosen = P.fuel[cs] === f.k;
      ctx.globalAlpha = cand ? 1 : 0.4;
      D.roundRect(L.x + 10, y, L.w - 20, 28, 8); ctx.fillStyle = chosen ? 'rgba(124,58,237,.14)' : cand ? '#fbfcff' : '#f3f5f9'; ctx.fill(); ctx.strokeStyle = chosen ? PUR : '#e1e7f2'; ctx.lineWidth = chosen ? 2.4 : 1.2; ctx.stroke();
      T(cn + 4, y + 19, (chosen ? '✔ ' : '') + f.name, 13, chosen ? PUR : INK, 'left', 800);
      T(c1, y + 19, fk(f.kg), 13.5, INK, 'right', 800); T(c2, y + 19, f.v, 12.5, INK, 'right', 800); T(c3, y + 19, f.co2 === 0 ? '0' : f.co2.toFixed(2), 13.5, f.co2 === 0 ? GOOD : INK, 'right', 800);
      ctx.globalAlpha = 1;
    });
    T(L.x + 16, y0 + 12 + 6 * 31 + 14, '* 같은 열량 1000 kJ 을 얻을 때 생기는 이산화 탄소의 몰수', 11.5, MUTED, 'left', 700);
    // 선택한 연료 설명
    const f = P.fuel[cs] ? PKk(P.fuel[cs]) : null, yb = y0 + 12 + 6 * 31 + 30;
    D.roundRect(L.x + 12, yb, L.w - 24, L.h - (yb - L.y) - 12, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    if (f) {
      T(L.x + 24, yb + 22, f.name, 14, PUR, 'left', 800);
      let yy = yb + 42; yy += textBlock(L.x + 24, yy, L.w - 48, '보관: ' + f.store, 12.5, INK, 17, 700);
      if (f.k === 'EtOH') textBlock(L.x + 24, yy + 2, L.w - 48, '식물이 자라며 흡수한 CO₂ 가 순환하지만, 재배와 증류에도 에너지가 들어요.', 12.5, MUTED, 17, 700);
      else if (f.co2 === 0) textBlock(L.x + 24, yy + 2, L.w - 48, '연소할 때 CO₂ 가 나오지 않아요. 다만 수소를 어떻게 만드느냐에 따라 전체 CO₂ 가 달라져요.', 12.5, MUTED, 17, 700);
    } else textBlock(L.x + 24, yb + 26, L.w - 48, '조작판에서 기준과 연료를 골라요. 후보는 밝게 표시돼요.', 12.5, MUTED, 17, 700);
  }
  function drawPickInfo(t) {
    const R = RC.R, P = PS();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📝 종합 판단표', 14.5, INK, 'left', 800);
    PU.forEach((u, i) => {
      const y = R.y + 40 + i * 92, cur = i === P.cs, f = P.fuel[i] ? PKk(P.fuel[i]) : null;
      D.roundRect(R.x + 8, y, R.w - 16, 86, 10); ctx.fillStyle = cur ? 'rgba(124,58,237,.07)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = cur ? PUR : '#dbe3f3'; ctx.lineWidth = cur ? 2 : 1.3; ctx.stroke();
      T(R.x + 18, y + 22, u.icon + ' ' + u.name, 14, INK, 'left', 800);
      T(R.x + 18, y + 44, '기준: ' + (P.crit[i] === 'm' ? '질량당 열량' : P.crit[i] === 'v' ? '부피당 열량' : '?'), 12.5, P.crit[i] ? '#1d4f8a' : '#9aa6bb', 'left', 800);
      T(R.x + 18, y + 64, '연료: ' + (f ? f.name : '?'), 12.5, f ? PUR : '#9aa6bb', 'left', 800);
      if (pkDone()) D.check(R.x + R.w - 28, y + 24, 11, 1);
    });
    const y = R.y + 40 + 3 * 92 + 4;
    if (!PHONE || y + 30 < R.y + R.h) textBlock(R.x + 14, y + 8, R.w - 28, pkDone() ? '용도마다 중요한 기준이 달라서 가장 알맞은 연료도 달라져요.' : '용도마다 중요한 기준이 달라요. 세 용도를 모두 고르고 확인해요.', 12.5, MUTED, 17, 700);
  }

  /* ================= 컨트롤 · 공통 ================= */
  const chipBtn = (txt, aria, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  VO.forEach((o, i) => $('#volChips').appendChild(chipBtn(o.name + (o.k === 'H2c' ? ' (700 atm)' : ''), o.name, () => setVol(i))));
  BF.forEach((b, i) => $('#burnChips').appendChild(chipBtn(b.name, b.name, () => setBurn(i))));
  PU.forEach((u, i) => $('#useChips').appendChild(chipBtn(u.icon + ' ' + u.name, u.name, () => setCase(i))));
  FU.forEach((f, i) => {
    const g = $('#msGrid'), lab = document.createElement('span'), inp = document.createElement('input');
    lab.className = 'lab'; lab.textContent = f.name + ' ' + f.f.replace(/\(.\)/, '') + ' (M = ' + f.M + ')';
    inp.className = 'num-in'; inp.id = 'ms' + i; inp.type = 'text'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.setAttribute('aria-label', f.name + ' 질량당 열량 kJ/g');
    g.append(lab, inp);
    inp.addEventListener('input', () => { const M = S.ms, was = M.ok[i]; M.q[i] = inp.value; M.ok[i] = near(parseNum(inp.value), f.kg, MQT(i)); inp.classList.remove('bad'); if (M.ok[i] && !was) { Sound.success(); parts.burst(RC.L.x + 150, RC.L.y + 100 + i * 76, { count: 10, speed: 110, life: 0.5, size: 3.4 }); } updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || S.ms.ok[i]) return; shakeBad(inp); const v = parseNum(inp.value);
      showHint(near(v, f.dH, 1) ? 'kJ/mol 을 그대로 적었어요. 몰질량 ' + f.M + ' g/mol 로 나누어야 kJ/g 이 돼요.' : near(v, f.kg * f.M * 0 + f.dH * f.M, 5) ? '몰질량을 곱하지 말고 나누어요.' : '|ΔH| = ' + f.dH + ' kJ/mol 을 M = ' + f.M + ' g/mol 로 나누어 보세요.');
    });
  });
  ['#vq1', '#vq2', '#vq3'].forEach((id, k) => {
    const inp = $(id), tg = [286 / 24.5, FUk('EtOH').kg * 0.789, FUk('Oct').kg * 0.703], tol = [0.3, 0.4, 0.5];
    inp.addEventListener('input', () => { const V = S.vol, was = V.ok[k]; V.q[k] = inp.value; V.ok[k] = near(parseNum(inp.value), tg[k], tol[k]); inp.classList.remove('bad'); if (V.ok[k] && !was) Sound.success(); updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || S.vol.ok[k]) return; shakeBad(inp); const v = parseNum(inp.value);
      showHint(k === 0 ? (near(v, 286, 3) ? '286 kJ 은 1 mol 의 열이에요. 1 mol 은 24.5 L 이니 24.5 로 나누어요.' : '286 kJ/mol 을 24.5 L/mol 로 나누면 kJ/L 이에요.') : (near(v, FUk(k === 1 ? 'EtOH' : 'Oct').kg, 0.5) ? '질량당 열량(kJ/g)에 밀도(g/mL)를 곱해야 kJ/mL 이 돼요.' : 'kJ/g × 밀도(g/mL) = kJ/mL 이에요.'));
    });
  });
  $('#bq').addEventListener('input', (e) => { BS().q = e.target.value; e.target.classList.remove('bad'); const w = BS().okq; bnCheck(); if (BS().okq && !w) Sound.tick(); updateCtl(); });
  $('#be').addEventListener('input', (e) => { BS().e = e.target.value; e.target.classList.remove('bad'); const w = BS().oke; bnCheck(); if (BS().oke && !w) Sound.tick(); updateCtl(); });
  $('#bq').addEventListener('change', (e) => {
    if (e.target.value === '' || BS().okq) return; shakeBad(e.target); const v = parseNum(e.target.value), b = bfSel();
    showHint(!bnDone() ? '먼저 불을 붙여 측정을 마쳐요.' : near(v, b.qw * 1000, 400) ? 'kJ 단위로 적어요. 1 kJ = 1000 J 이에요.' : 'q = 4.18 × 200 × ΔT (J) 를 kJ 로 바꿔요. ΔT 는 ' + f1(b.dT) + ' °C 예요.');
  });
  $('#be').addEventListener('change', (e) => {
    if (e.target.value === '' || BS().oke) return; shakeBad(e.target); const b = bfSel();
    showHint(!bnDone() ? '먼저 불을 붙여 측정을 마쳐요.' : '이용률 = 물이 얻은 열 q ' + b.qw.toFixed(1) + ' kJ / 연소열 ' + b.Q.toFixed(1) + ' kJ × 100 (%) 이에요.');
  });
  $('#bBurn').addEventListener('click', runBurn);
  $('#bCritM').addEventListener('click', () => setCrit('m'));
  $('#bCritV').addEventListener('click', () => setCrit('v'));
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.getAttribute('data-show') !== S.mode; });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    FU.forEach((f, i) => { const inp = $('#ms' + i), v = S.ms.q[i]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', S.ms.ok[i] && v !== ''); });
    $$('#volChips button').forEach((b, i) => { b.classList.toggle('on', i === S.vol.sel); b.classList.toggle('done', !!S.vol.seen[i]); });
    ['#vq1', '#vq2', '#vq3'].forEach((id, k) => { const inp = $(id), v = S.vol.q[k]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', S.vol.ok[k] && v !== ''); });
    const B = BS();
    $$('#burnChips button').forEach((b, i) => { b.classList.toggle('on', i === B.sel); b.classList.toggle('done', B.done[i]); });
    $('#bBurn').textContent = B.phase === 'run' ? '⏳ 타는 중…' : bnDone() ? '↻ 다시 태우기' : '🔥 불 붙이기'; $('#bBurn').disabled = B.phase === 'run';
    $('#bq').classList.toggle('ok', B.okq); $('#be').classList.toggle('ok', B.oke);
    const P = PS();
    $$('#useChips button').forEach((b, i) => { b.classList.toggle('on', i === P.cs); b.classList.toggle('done', !!(P.crit[i] && P.fuel[i])); });
    $('#bCritM').setAttribute('aria-pressed', P.crit[P.cs] === 'm' ? 'true' : 'false'); $('#bCritV').setAttribute('aria-pressed', P.crit[P.cs] === 'v' ? 'true' : 'false');
    $$('#pickChips button').forEach((b, i) => b.classList.toggle('on', pkCase().cands[i] === P.fuel[P.cs]));
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; if (m === 'vol') S.vol.seen[S.vol.sel] = true; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'mass') { S.ms.q = ['', '', '', '', '']; S.ms.ok = [false, false, false, false, false]; S.ms.bar = [0, 0, 0, 0, 0]; }
    else if (S.mode === 'vol') { S.vol.q = ['', '', '']; S.vol.ok = [false, false, false]; S.vol.seen = {}; S.vol.seen[S.vol.sel] = true; S.vol.fill = 0; S.vol.pulse = 0; }
    else if (S.mode === 'burn') { const B = BS(); bnStop(); B.done = [false, false, false]; B.solved = [false, false, false]; bnClear(); }
    else { S.pk.crit = [null, null, null]; S.pk.fuel = [null, null, null]; S.pk.msg = ''; S.pk.done = false; }
    updateCtl();
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'mass') { L1 = '계산한 연료'; a = msN() + ' / 5'; L2 = '질량당 1위'; b = msN() ? FU.filter((f, i) => S.ms.ok[i]).sort((x, y) => y.kg - x.kg)[0].name : '—'; L3 = '단위'; c = 'kJ/g'; }
    else if (S.mode === 'vol') { const o = VS(); L1 = '고른 연료'; a = o.name; L2 = '부피당 열량'; b = o.txt; L3 = '50 L 탱크'; c = fmj(tankMJ(o)) + ' MJ'; }
    else if (S.mode === 'burn') { const B = BS(), b0 = bfSel(); L1 = '물의 온도'; a = f1(burnT(B.sel, bnTime())) + ' °C'; L2 = '측정 ΔT'; b = bnDone() ? '+' + f1(b0.dT) + ' °C' : '—'; L3 = '실험한 연료'; c = B.done.filter((x) => x).length + ' / 3'; }
    else { const P = PS(); L1 = '고른 용도'; a = pkCase().name; L2 = '기준'; b = P.crit[P.cs] === 'm' ? '질량당' : P.crit[P.cs] === 'v' ? '부피당' : '—'; L3 = '고른 연료'; c = P.fuel[P.cs] ? PKk(P.fuel[P.cs]).name : '—'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '질량당 열량: kJ/mol 을 kJ/g 으로', short: '질량당 열량', icon: '⚖️', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 수소, 에탄올, 휘발유 중 어느 연료가 가장 “효율적”일까? 기준에 따라 순위가 달라질까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(엔탈피와 열화학 반응식)에서</b> 연소 반응의 ΔH 를 kJ/mol 로 나타냈어요. 연료를 공정하게 비교하려면 <b>같은 질량</b>이나 <b>같은 부피</b>당 열량으로 바꿔야 해요.</div>' +
        '<p>대체 연료인 <b>수소와 에탄올</b>, 화석 연료인 <b>메테인, 옥탄(휘발유의 대표), 탄소(석탄의 대표)</b>를 비교해요. 실제 연료는 혼합물이지만 대표 물질로 단순화했어요. 먼저 몰당 연소 ΔH 를 몰질량으로 나누어 <b>단위 질량(1 g)당 열량</b>을 구해요.</p>',
      features: ['mass'],
      setup() { S.lock = false; setMode('mass'); },
      recap: '질량당 열량 = |ΔH| / 몰질량. 몰당으로는 옥탄이 크지만 질량당으로는 수소가 가장 커요.',
      summary: '<ul><li>연소 ΔH(생성물 H₂O(l))와 몰질량 M 으로 <b>질량당 열량 = |ΔH| / M</b> 을 구해요.</li><li>수소 286/2 = <b>143 kJ/g</b>, 메테인 890/16 = <b>55.6</b>, 옥탄 5471/114 = <b>48.0</b>, 탄소 394/12 = <b>32.8</b>, 에탄올 1367/46 = <b>29.7 kJ/g</b>.</li><li>몰당으로는 옥탄(5471 kJ/mol)이 가장 크지만 질량당으로는 수소가 압도적이에요. 몰당 값이 크다고 질량당 값도 큰 것은 아니에요.</li></ul>',
      missions: [
        {
          title: '5개 연료의 kJ/g 계산하기',
          goal: '연료 카드 5장의 몰당 열량을 몰질량으로 나누어 <b>질량당 열량(kJ/g)</b>을 조작판에 적어요.',
          hint: '|ΔH| (kJ/mol) / M (g/mol) = kJ/g. 수소는 286 / 2 = 143 이에요. 소수 첫째 자리까지 적어요.',
          setup() { S.lock = true; setMode('mass'); },
          check: () => msN() === 5, hold: 0.4,
          status: () => FU.map((f, i) => f.name + ' ' + mark(S.ms.ok[i])).join(' &nbsp; '),
          explain: '수소 <b>143</b>, 메테인 <b>55.6</b>, 옥탄 <b>48.0</b>, 탄소 <b>32.8</b>, 에탄올 <b>29.7</b> kJ/g 이에요. 질량당 열량은 수소가 압도적으로 커요.',
        },
        {
          type: 'quiz', title: '몰당 열량이 크면 질량당도 클까?',
          goal: '“몰당 연소 ΔH 의 크기가 큰 연료는 질량당 열량도 크다.” 이 말은?',
          setup() { S.lock = true; setMode('mass'); },
          choices: ['맞아요. 몰당 열량이 클수록 질량당 열량도 항상 커요', '틀려요. 몰질량이 달라서 질량당으로 바꾸면 순위가 달라질 수 있어요', '맞아요. 몰질량은 열량에 영향을 주지 않아요', '틀려요. 질량당 열량은 몰당 열량과 아무 관계가 없어요'],
          answer: 1,
          feedback: ['옥탄은 몰당 열량이 가장 크지만 질량당으로는 수소보다 훨씬 작아요.', '', '몰질량이 클수록 같은 질량 속의 몰수가 적어서 질량당 열량이 작아져요.', '관계가 있어요. 질량당 열량 = 몰당 열량 / 몰질량이에요.'],
          explain: '질량당 열량 = 몰당 열량 / <b>몰질량</b> 이라서 몰질량에 따라 순위가 달라져요. 옥탄은 몰당으로 최대(5471 kJ/mol)지만 몰질량이 114 라서 질량당으로는 수소(143 kJ/g)에 크게 못 미쳐요.',
        },
      ],
    },
    {
      title: '부피당 열량: 같은 탱크에 실리는 열량', short: '부피당 열량', icon: '🛢️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수소가 질량당 열량이 가장 크다는 것을 알았어요. 그런데 자동차 연료 탱크에는 <b>부피</b>의 제한이 있어요. 이번에는 같은 부피당 열량을 비교해요.</div>' +
        '<p>기체는 25 °C, 1 atm 에서 1 mol 이 <b>24.5 L</b> 이므로 kJ/mol 을 24.5 로 나누어 kJ/L 를 구하고, 액체는 질량당 열량에 <b>밀도</b>를 곱해 kJ/mL 를 구해요. 압축 수소와 액체 수소도 함께 비교해요.</p>',
      features: ['vol'],
      setup() { S.lock = false; setMode('vol'); },
      recap: '기체는 24.5 L/mol, 액체는 밀도로 바꿔 부피당 열량을 구해요. 수소는 부피당 열량이 작아 압축·액화가 필요해요.',
      summary: '<ul><li>기체(25 °C, 1 atm): 수소 286/24.5 ≈ <b>11.7 kJ/L</b>, 메테인 890/24.5 ≈ <b>36.3 kJ/L</b>.</li><li>액체: 에탄올 29.7 × 0.789 ≈ <b>23.4 kJ/mL</b>, 옥탄 48.0 × 0.703 ≈ <b>33.7 kJ/mL</b>. (1 kJ/mL = 1000 kJ/L)</li><li>수소는 압축(700 atm, 약 5.6 kJ/mL)하거나 액화(약 10.1 kJ/mL)해야 하지만 그래도 옥탄보다 작아요. 50 L 탱크에는 옥탄이 약 1687 MJ, 700 atm 수소가 약 279 MJ 를 실어요.</li><li>그래서 수소는 질량당 열량이 가장 커도 자동차 연료로 쓰기 어려워요.</li></ul>',
      missions: [
        {
          title: '부피당 열량 계산하기',
          goal: '수소 기체의 kJ/L, 에탄올과 옥탄의 kJ/mL 를 계산해 조작판에 적어요.',
          hint: '수소: 286 kJ/mol / 24.5 L/mol. 에탄올: 29.7 kJ/g × 0.789 g/mL. 옥탄: 48.0 kJ/g × 0.703 g/mL.',
          setup() { S.lock = true; setMode('vol'); },
          check: () => S.vol.ok[0] && S.vol.ok[1] && S.vol.ok[2], hold: 0.4,
          status: () => '① ' + mark(S.vol.ok[0]) + ' &nbsp; ② ' + mark(S.vol.ok[1]) + ' &nbsp; ③ ' + mark(S.vol.ok[2]),
          explain: '수소 286 / 24.5 ≈ <b>11.7 kJ/L</b>, 에탄올 29.7 × 0.789 ≈ <b>23.4 kJ/mL</b>, 옥탄 48.0 × 0.703 ≈ <b>33.7 kJ/mL</b> 예요. 기체는 같은 부피에 든 입자 수가 적어서 부피당 열량이 작아요.',
        },
        {
          title: '여섯 가지 연료를 탱크에 실어 보기',
          goal: '조작판에서 연료 <b>여섯 가지를 모두 한 번씩</b> 탱크에 실어 열량을 살펴봐요.',
          hint: '「탱크에 실을 연료」 칩을 하나씩 눌러 봐요. 눌러 본 연료에는 표시가 생겨요.',
          setup() { S.lock = true; S.vol.seen = {}; S.vol.seen[S.vol.sel] = true; setMode('vol'); },
          check: () => volN() === 6, hold: 0.5,
          status: () => '살펴본 연료 ' + volN() + ' / 6',
          explain: '같은 50 L 탱크라도 옥탄은 약 1687 MJ, 에탄올은 약 1172 MJ, 액체 수소는 약 506 MJ, 700 atm 수소는 약 279 MJ 이고 1 atm 기체는 2 MJ 도 안 돼요. <b>같은 부피</b>에 실리는 열량은 연료의 상태에 따라 크게 달라요.',
        },
        {
          type: 'quiz', title: '수소가 자동차 연료로 어려운 까닭',
          goal: '수소는 질량당 열량이 가장 큰데도 자동차 연료로 쓰기 어려워요. 그 까닭은?',
          setup() { S.lock = true; setMode('vol'); },
          choices: ['수소는 연소할 때 열이 나오지 않기 때문이에요', '수소는 몰당 열량이 너무 작기 때문이에요', '수소는 연소하면 이산화 탄소가 많이 나오기 때문이에요', '부피당 열량이 작아서 같은 탱크에 실리는 열량이 적고, 압축이나 액화가 필요하기 때문이에요'],
          answer: 3,
          feedback: ['수소의 연소 ΔH 는 −286 kJ/mol 로 열이 나와요.', '질량당 열량이 가장 큰 연료예요. 문제는 부피예요.', '수소는 연소해도 CO₂ 가 나오지 않아요.', ''],
          explain: '수소는 가벼워서 질량당 열량은 최대지만, 기체 상태에서는 <b>부피당 열량이 매우 작아요</b>(11.7 kJ/L). 그래서 700 atm 으로 압축하거나 −253 °C 로 액화해야 하는데, 그래도 옥탄보다 부피당 열량이 작아요.',
        },
      ],
    },
    {
      title: '연소 실험: 연료로 물 데우기', short: '연소 실험', icon: '🔥', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 연료의 열량을 계산으로 비교했어요. 이번에는 알코올 램프로 직접 태워 물을 데우며 q = c·m·ΔT 로 열량을 확인하고, 이론값과 비교해요.</div>' +
        '<p>연료 1.00 g 을 태워 물 200 g 의 온도 변화를 재요. 연소열의 일부만 물에 전달된다고 보고 <b>열 이용률 40 %</b> 로 가정해요. 이론 ΔT 는 연소열 전부가 물에 전달될 때의 값이에요.</p>',
      features: ['burn'],
      setup() { S.lock = false; setMode('burn'); },
      recap: '실제로 물이 얻은 열은 연소열보다 작아요. 열 이용률 = 물이 얻은 열 / 연소열 × 100.',
      summary: '<ul><li>연소 실험: 연료 1.00 g, 물 200 g, 처음 20.0 °C. 물이 얻은 열 <b>q = c·m·ΔT</b> (c = 4.18 J/(g·°C)).</li><li>에탄올 ΔT = +14.2 °C → q ≈ 11.9 kJ, 메탄올 +10.9 °C → 9.1 kJ, 옥탄 +23.0 °C → 19.2 kJ.</li><li>이론 ΔT(전부 전달): 에탄올 35.5, 메탄올 27.2, 옥탄 57.4 °C. 측정값은 항상 이론값보다 작아요.</li><li><b>열 이용률</b> = q / 연소열 ≈ 40 % (에탄올: 11.9 / 29.7). 열 손실, 불완전 연소, 증발 등이 원인이에요.</li></ul>',
      missions: [
        {
          title: '세 연료 태워 보기',
          goal: '에탄올, 메탄올, 옥탄을 <b>1.00 g 씩 모두</b> 태워 물의 온도 변화를 확인해요.',
          hint: '연료 칩을 고르고 「불 붙이기」를 눌러요. 그래프가 끝까지 그려지면 측정이 끝나요. 세 연료를 모두 해요.',
          setup() { S.lock = true; const B = BS(); bnStop(); B.done = [false, false, false]; B.solved = [false, false, false]; bnClear(); B.sel = 0; setMode('burn'); },
          check: () => BS().done.every((x) => x), hold: 0.4,
          status: () => BF.map((b, i) => b.name + ' ' + mark(BS().done[i])).join(' &nbsp; '),
          explain: '같은 1.00 g 이라도 연료마다 연소열이 달라서 ΔT 가 달라요: 에탄올 +14.2 °C, 메탄올 +10.9 °C, 옥탄 +23.0 °C. 질량당 열량이 클수록(옥탄 48.0 &gt; 에탄올 29.7 &gt; 메탄올 22.7 kJ/g) 물이 더 많이 올라요.',
        },
        {
          title: '에탄올의 열 이용률 구하기',
          goal: '에탄올 실험에서 물이 얻은 열 q (kJ)와 <b>열 이용률(%)</b>을 구해 적어요.',
          hint: '에탄올 ΔT = 14.2 °C. q = 4.18 × 200 × 14.2 (J) 를 kJ 로 바꿔요. 이용률 = q / 29.7 × 100.',
          setup() { S.lock = true; BS().sel = 0; bnStop(); bnClear(); setMode('burn'); bnCheck(); },
          check: () => BS().solved[0], hold: 0.4,
          status: () => '에탄올 ' + mark(BS().sel === 0 && bnDone()) + ' &nbsp; q ' + mark(BS().sel === 0 && BS().okq) + ' &nbsp; 이용률 ' + mark(BS().sel === 0 && BS().oke),
          explain: 'q = 4.18 × 200 × 14.2 ≈ 11870 J ≈ <b>11.9 kJ</b>, 이용률 = 11.9 / 29.7 × 100 ≈ <b>40 %</b> (이론 ΔT 35.5 °C 의 40 % 가 14.2 °C 예요).',
        },
        {
          type: 'quiz', title: '측정값이 이론값보다 작은 까닭',
          goal: '실험에서 물의 ΔT 가 이론값보다 항상 작게 나와요. 그 까닭으로 알맞은 것은?',
          setup() { S.lock = true; setMode('burn'); },
          choices: ['연소열의 일부가 주위로 빠져나가고 불완전 연소와 증발도 있어서 물이 얻는 열이 작아요', '연료가 연소하면서 열을 흡수하기 때문이에요', '에너지가 사라져 없어지기 때문이에요', '물의 비열이 4.18 이 아니기 때문이에요'],
          answer: 0,
          feedback: ['', '연소는 열을 내놓는 반응이에요. 흡수가 아니라 방출이에요.', '에너지는 사라지지 않고 주위의 공기와 용기로 전달돼요.', '물의 비열은 4.18 J/(g·°C) 가 맞아요. 이론값 계산에도 같은 값을 썼어요.'],
          explain: '연소열 전부가 물에 전달되지 않아요. 일부는 <b>공기와 용기로 손실</b>되고 불완전 연소와 증발도 있어서 물이 얻은 열은 연소열보다 작아요. 에너지는 사라진 것이 아니라 주위로 옮겨 간 거예요.',
        },
      ],
    },
    {
      title: '연료 선택: 용도에 맞는 판단', short: '연료 선택', icon: '🎯', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 질량당 열량, 부피당 열량, 실제 이용률을 살펴봤어요. 이제 이 자료로 용도에 알맞은 연료를 판단해 봐요.</div>' +
        '<p>용도마다 가장 중요한 기준이 달라요. 휴대용 화덕과 로켓은 <b>질량</b>, 승용차는 <b>부피</b>가 중요해요. 같은 열량을 얻을 때 생기는 <b>CO₂</b>와 보관 편의도 함께 보고 종합 판단표를 완성해요.</p>',
      features: ['pick'],
      setup() { S.lock = false; setMode('pick'); buildPick(); },
      recap: '용도에 따라 중요한 기준(질량당 또는 부피당)이 다르므로 알맞은 연료도 달라져요. CO₂ 발생량과 보관 편의도 함께 따져요.',
      summary: '<ul><li>질량이 중요한 용도(휴대용 화덕, 로켓)는 <b>질량당 열량</b>, 부피가 정해진 용도(승용차)는 <b>부피당 열량</b>으로 비교해요.</li><li>휴대용 화덕(액체·고체 중): 옥탄 48.0 kJ/g. 승용차: 옥탄 33.7 kJ/mL (압축 수소 5.6, 에탄올 23.4). 로켓: 수소 143 kJ/g.</li><li>1000 kJ 을 얻을 때 CO₂ (mol): 석탄 2.54 &gt; 에탄올·옥탄 1.46 &gt; 메테인 1.12 &gt; 수소 0. 수소는 연소할 때 CO₂ 가 없지만 수소를 만드는 방법에 따라 전체 CO₂ 는 달라져요.</li><li>에탄올은 식물이 흡수한 CO₂ 가 순환하지만 재배·증류에도 에너지가 들어요. 연료의 “효율”은 기준에 따라 달라요.</li></ul>',
      missions: [
        {
          title: '용도별 연료 고르기', manual: true,
          goal: '세 용도마다 <b>가장 중요한 기준</b>과 <b>알맞은 연료</b>를 골라 종합 판단표를 완성하고 확인해요.',
          hint: '휴대용 화덕과 로켓은 질량, 승용차는 부피가 중요해요. 표에서 후보 연료의 해당 열량을 비교해요.',
          setup() { S.lock = true; const P = PS(); P.crit = [null, null, null]; P.fuel = [null, null, null]; P.msg = ''; P.done = false; P.cs = 0; buildPick(); setMode('pick'); },
          check: () => pkCheck(),
          explain: '<b>휴대용 화덕</b>은 질량당 열량이 큰 옥탄(48.0 kJ/g), <b>승용차</b>는 부피당 열량이 큰 옥탄(33.7 kJ/mL), <b>로켓</b>은 질량당 열량이 가장 큰 수소(143 kJ/g)예요. 같은 연료라도 용도와 기준에 따라 선택이 달라져요.',
        },
        {
          type: 'quiz', title: '같은 열량에서 CO₂ 가 가장 적은 연료',
          goal: '같은 열량을 얻을 때 연소로 생기는 이산화 탄소가 가장 적은 연료는?',
          setup() { S.lock = true; setMode('pick'); },
          choices: ['석탄(탄소)', '옥탄(휘발유)', '수소. 단, 수소를 어떻게 만드느냐에 따라 전체 배출량은 달라져요', '에탄올. 연소할 때 CO₂ 가 나오지 않아요'],
          answer: 2,
          feedback: ['탄소는 1000 kJ 당 CO₂ 2.54 mol 로 가장 많아요.', '옥탄은 1000 kJ 당 CO₂ 1.46 mol 이에요.', '', '에탄올도 연소할 때 CO₂ 가 나와요(1000 kJ 당 1.46 mol). 다만 식물이 흡수한 CO₂ 가 순환해요.'],
          explain: '수소는 연소 생성물이 물뿐이라 <b>연소 시 CO₂ 가 0</b> 이에요. 하지만 수소를 화석 연료에서 만들면 그 과정에서 CO₂ 가 나오므로 생산 방법까지 따져 봐야 해요.',
        },
        {
          type: 'quiz', title: '에탄올을 대체 연료로 쓴다면',
          goal: '에탄올을 휘발유 대신 쓸 때의 설명으로 알맞은 것은?',
          setup() { S.lock = true; setMode('pick'); },
          choices: ['같은 부피에서 옥탄보다 열량이 커요', '식물이 자라며 CO₂ 를 흡수하므로 순환하지만, 재배와 증류에도 에너지가 들고 질량당·부피당 열량은 옥탄보다 작아요', '연소할 때 이산화 탄소가 전혀 나오지 않아요', '질량당 열량이 모든 연료 중 가장 커요'],
          answer: 1,
          feedback: ['에탄올 23.4 kJ/mL 는 옥탄 33.7 kJ/mL 보다 작아요.', '', '에탄올도 연소하면 CO₂ 가 나와요.', '질량당 열량은 29.7 kJ/g 으로 다섯 연료 중 가장 작아요.'],
          explain: '에탄올은 옥탄보다 질량당(29.7 vs 48.0 kJ/g)·부피당(23.4 vs 33.7 kJ/mL) 열량이 작아요. 식물이 흡수한 CO₂ 로 순환한다는 장점이 있지만 재배와 증류에 에너지가 들어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-fuel-enthalpy', mount: '#game', badge: '연료 분석가', homeHref: '../../index.html#hx',
    featureLabels: { mass: '⚖️ 질량당 열량 막대', vol: '🛢️ 같은 부피 탱크', burn: '🔥 연소 실험 장치', pick: '🎯 용도별 연료 선택' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildPick(); setMode('mass');
  function stepAll1(dt) { S.t += dt; stepMass(dt); stepVol(dt); stepBurn(dt); }
  let lastFree = false;
  SciSim.loop((dt) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'mass') { drawMass(S.t); drawMassInfo(S.t); }
    else if (S.mode === 'vol') { drawVol(S.t); drawVolInfo(S.t); }
    else if (S.mode === 'burn') { drawBurn(S.t); drawBurnInfo(S.t); }
    else { drawPick(S.t); drawPickInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, FU, VO, BF, PU, PK, setMode, setVol, setBurn, runBurn, bnCheck, setCase, setCrit, setFuel, pkCheck, msN, volN, buildPick,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
