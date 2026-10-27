/* =========================================================
   물질과 에너지 Ⅱ. 용액의 성질 - 삼투압 [12물에02-03]
   ① 관찰: 삼투압 재기 (피스톤으로 압력을 가해 물의 순 이동이 멈추는 압력 = 삼투압, 더 크게 가하면 역삼투)
   ② 탐구: π = CRT (농도와 온도를 하나씩 바꿔 π를 기록하고, PV = nRT 와 대응시켜요)
   ③ 분석: 계산 연습 (π 계산, 단백질 몰질량, 링거액)
   ④ 적용: 역삼투 (해수 담수화 장치)
   비전해질을 기본으로 하고, 전해질은 이온으로 나뉜 입자의 총 농도로 센다는 정성적 규칙만 써요. 삼투압의 열역학 유도는 다루지 않아요.
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
  const SUGC = '#f472b6', SUGD = '#be185d', WAT = '#38bdf8';
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
        if (ctx.measureText(t).width > maxW && line.trim() && !/^[)\]}.,!?;:·…%]+$/.test(tk) && !/[(\[{]$/.test(line)) { out.push(line.trimEnd()); line = tk; } else line = t;
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
  const r2 = (v) => Math.round(v * 100) / 100;
  const f2 = (v) => r2(v).toFixed(2);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const sg1 = (v) => (Math.round(v * 10) / 10 > 0 ? '+' : '') + (Math.round(v * 10) / 10 === 0 ? '0.0' : f1(v).replace('-', '−'));
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parseNum(s) {                                // 20000, 20,000, 2.0e4, 2.0×10^4, 2.0×10⁴ 모두 읽어요
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '^' + SUP[c]).replace(/[−–]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;

  /* ---------- 배치 ---------- */
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { obs: '📏 삼투를 막는 압력을 재요', crt: '🔎 삼투압은 무엇에 비례할까?', calc: '🧮 π = CRT 계산 연습', ro: '💧 역삼투로 바닷물을 맑게 해요' };

  /* ================= 자료 ================= */
  const RGAS = 0.082, T25 = 298;                         // 기체 상수 (atm·L/(mol·K)), 25 °C
  const piOf = (c, t) => c * RGAS * t;                   // π = C R T
  const OBS_C = [0.05, 0.10, 0.20, 0.40];
  const C_TGT = [1, 2, 4, 8], T_TGT = [280, 298, 320];   // 기록할 점: C = 0.05 · 0.10 · 0.20 · 0.40 M (ci × 0.05), T = 280 · 298 · 320 K
  const PI_SEA = piOf(1.1, T25);                         // 바닷물: 이온 합계 약 1.1 M → 약 27 atm
  const M_WATER = 10.3;                                  // 1 atm ≈ 물기둥 10.3 m
  const recPi = (c, t) => r2(piOf(c, t));                // 기록하는 값 (소수 둘째 자리)

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'obs', fade: 0, lock: false, t: 0, clk: 0,
    sub: { crt: 'c', ro: 'rig' },
    obs: { ci: 1, P: 0, x: 0, rate: 0, tEq: 0, tRev: 0, acc: 0, seen: { eq: false, rev: false } },
    crt: { ci: 2, T: 298, rc: {}, rt: {}, lineC: 0, lineT: 0, pop: null },
    calc: { q: ['', '', ''], ok: [false, false, false] },
    ro: { P: 0, V: 20, prod: 0, rate: 0, acc: 0, ions: [], wat: [] },
    mt: { crt: null, ro: null },
  };
  let game = null;
  const cOfCi = (ci) => ci * 0.05;

  /* ================= ① 삼투압 재기 ================= */
  const K_OBS = 0.5, XMAX = 8;                           // 수위 변화 속도 = 0.5 cm/s × (π − P)
  const obsC = () => OBS_C[S.obs.ci], obsP = () => S.obs.P / 10, obsPi = () => piOf(obsC(), T25);
  const obsIntended = () => K_OBS * (obsPi() - obsP());
  function stepObs(dt) {
    const O = S.obs, it = obsIntended();
    let rate = it; if ((O.x >= XMAX - 1e-9 && rate > 0) || (O.x <= -XMAX + 1e-9 && rate < 0)) rate = 0;
    O.rate = rate; O.x = clamp(O.x + rate * dt, -XMAX, XMAX);
    const eqNow = Math.abs(obsP() - obsPi()) <= 0.15 && obsC() === 0.10;
    O.tEq = eqNow ? O.tEq + dt : 0; if (O.tEq >= 1.5) O.seen.eq = true;
    O.tRev = it <= -0.5 && O.x <= -2 ? O.tRev + dt : 0; if (O.tRev >= 0.8) O.seen.rev = true;
    if (!RM && S.mode === 'obs' && Math.abs(rate) > 0.05) {
      O.acc += Math.min(Math.abs(rate), 3) * 4 * dt; const g = OG();
      while (O.acc >= 1) { O.acc -= 1; const dir = rate > 0 ? 1 : -1; parts.emit({ x: g.xm - dir * 28 + rnd(-3, 3), y: rnd(g.y1 - 70, g.y1 - 10), vx: dir * rnd(60, 85), vy: 0, life: 0.55, size: 2.8, color: '#5ab8f5', fade: true }); }
    }
  }
  const OG = () => { const L = RC.L; return { x0: L.x + 34, x1: L.x + L.w - 34, y0: L.y + 140, y1: L.y + 402, xm: L.x + L.w / 2, sc: 6, base: 20 }; };
  function drawRig(g, o) {
    // o: {lvL, lvR (cm), cL, cR, solRight, P, t}
    const yOf = (cm) => g.y1 - cm * g.sc, yL = yOf(o.lvL), yR = yOf(o.lvR);
    D.roundRect(g.x0 - 4, g.y0 - 4, g.x1 - g.x0 + 8, g.y1 - g.y0 + 8, 10); ctx.fillStyle = 'rgba(244,249,255,.9)'; ctx.fill();
    [[0, yL, o.cL], [1, yR, o.cR]].forEach(([side, y, c]) => {
      const xa = side ? g.xm + 4 : g.x0, xb = side ? g.x1 : g.xm - 4;
      const col = C.mix('#8fd0ff', o.salt ? '#bde7d5' : '#f6a6cf', clamp(c / (o.salt ? 1.1 : 0.5), 0, 1) * 0.75);
      const grd = ctx.createLinearGradient(0, y, 0, g.y1); grd.addColorStop(0, C.rgba(col, 0.6)); grd.addColorStop(1, C.rgba(col, 0.9)); ctx.fillStyle = grd; ctx.fillRect(xa, y, xb - xa, g.y1 - y);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(xa, y - 1, xb - xa, 3);
      if (!o.salt) { const n = Math.round(c * 60); for (let k = 0; k < n; k++) { const px = xa + 8 + (xb - xa - 16) * hash(k, side + 2), py = y + 8 + (g.y1 - y - 16) * hash(k + 30, side + 5); D.sphere(px, py, 3.2, SUGC, { gloss: false }); } }
    });
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.2; D.roundRect(g.x0 - 4, g.y0 - 4, g.x1 - g.x0 + 8, g.y1 - g.y0 + 8, 10); ctx.stroke();
    // 반투막
    ctx.fillStyle = 'rgba(224,160,50,.9)'; ctx.fillRect(g.xm - 3, g.y0 - 2, 6, g.y1 - g.y0 + 4);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 12; k++) ctx.fillRect(g.xm - 3, g.y0 + 12 + k * ((g.y1 - g.y0 - 24) / 11), 6, 3);
    D.label(g.xm, g.y1 + 24, '반투막', { size: 13, bg: '#b7791f', align: 'center' });
    // 피스톤 (용액 쪽)
    const px = o.solRight ? g.xm + (g.x1 - g.xm) * 0.74 : g.x0 + (g.xm - g.x0) * 0.26, ya = o.solRight ? yR : yL, xa = o.solRight ? g.xm + 6 : g.x0 + 2, xb = o.solRight ? g.x1 - 2 : g.xm - 6;
    ctx.fillStyle = 'rgba(210,216,228,.6)'; ctx.fillRect(xa, g.y0, xb - xa, ya - 9 - g.y0);   // 닫힌 방(피스톤 위)
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xa, g.y0); ctx.lineTo(xb, g.y0); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.fillRect(px - 3, g.y0 - 26, 6, ya - 8 - (g.y0 - 26));
    D.roundRect(xa, ya - 9, xb - xa, 9, 3); ctx.fillStyle = '#475569'; ctx.fill();
    D.roundRect(px - 24, g.y0 - 34, 48, 10, 4); ctx.fillStyle = '#334155'; ctx.fill();
    if (o.P > 0.05) { const len = 12 + clamp(o.P, 0, 80) / 80 * 18; D.arrow(px, g.y0 - 36 - len, px, g.y0 - 36, { color: BAD, width: 4, head: 11 }); }
    D.label(px, g.y0 - 36 - (o.P > 0.05 ? 12 + clamp(o.P, 0, 80) / 80 * 18 : 0) - 14, 'P = ' + o.Ptxt, { size: 13, bg: BAD, align: 'center' });
    return { yL, yR };
  }
  function drawObs(t) {
    const L = RC.L, g = OG(), O = S.obs, P = obsP();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '📏 압력을 가해 물의 이동을 막아 봐요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '왼쪽 순수한 물 | 오른쪽 설탕 용액 (피스톤으로 압력을 가해요)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const lv = drawRig(g, { lvL: 20 - O.x, lvR: 20 + O.x, cL: 0, cR: obsC(), solRight: true, P, Ptxt: f1(P) + ' atm' });
    // 처음 수위
    const y20 = g.y1 - 20 * g.sc; ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(g.x0, y20); ctx.lineTo(g.x1, y20); ctx.stroke(); ctx.setLineDash([]);
    T(g.x0 + 8, y20 - 6, '처음 수위', 12, MUTED, 'left', 700, HALO);
    T(g.x0 + (g.xm - g.x0) / 2, g.y0 + 22, '💧 순수한 물', 13.5, '#0369a1', 'center', 800);
    T(g.xm + 12, g.y0 + 22, '🍬 설탕 ' + obsC().toFixed(2) + ' M', 13.5, SUGD, 'left', 800);
    // 압력계
    D.dial(L.x + 88, L.y + 98, 40, P, 0, 12, { label: 'atm', ticks: 2 });
    // 물의 순 이동
    const rate = O.rate;
    if (Math.abs(rate) > 0.05) { const dir = rate > 0 ? 1 : -1; D.arrow(g.xm - dir * 26, g.y1 - 38, g.xm + dir * 26, g.y1 - 38, { color: SKY, width: clamp(Math.abs(rate) * 1.6 + 2, 2, 7), head: 12 }); T(g.xm, g.y1 - 52, '물의 순 이동', 13, '#0369a1', 'center', 800, HALO); }
    else T(g.xm, g.y1 - 44, '순 이동 없음', 13, MUTED, 'center', 800, HALO);
    const atLimit = (O.x >= XMAX - 1e-9 && obsIntended() > 0) || (O.x <= -XMAX + 1e-9 && obsIntended() < 0);
    textBlock(L.x + 16, L.y + 458, L.w - 32, atLimit ? '수위가 끝까지 올라(내려)가서 더 움직이지 못해요. 압력을 바꿔 보세요.' : '압력 P가 작으면 물이 용액 쪽으로, 크면 반대로 이동해요. 수위가 멈추는 압력을 찾아요.', PHONE ? 13 : 13.5, INK, 19, 800);
  }
  function drawObsInfo(t) {
    const R = RC.R, O = S.obs, P = obsP();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 측정값', 14.5, INK, 'left', 800);
    const rows = [['용액의 농도 C', obsC().toFixed(2) + ' M', SUGD], ['온도 T', '298 K (25 °C)', INK], ['가한 압력 P', f1(P) + ' atm', BAD], ['용액 쪽 수위 변화', sg1(O.x) + ' cm', INK], ['수위 변화 속도', sg1(O.rate) + ' cm/s', O.rate > 0.05 ? SKY : O.rate < -0.05 ? '#c2410c' : GOOD]];
    rows.forEach((r, i) => { T(R.x + 14, R.y + 56 + i * 27, r[0], 13.5, r[2], 'left', 800); T(R.x + R.w - 14, R.y + 56 + i * 27, r[1], 14, r[2], 'right', 800); });
    let y = R.y + 56 + 5 * 27 + 14;
    if (O.seen.eq) { D.roundRect(R.x + 12, y - 4, R.w - 24, 62, 10); ctx.fillStyle = 'rgba(20,160,88,.09)'; ctx.fill(); ctx.strokeStyle = GOOD; ctx.lineWidth = 1.8; ctx.stroke(); T(R.x + 22, y + 18, '삼투압 π = ' + f2(obsPi()) + ' atm', 15, '#0f6b3c', 'left', 800); T(R.x + 22, y + 42, 'P = π 일 때 수위가 멈춰요', 13, INK, 'left', 800); y += 70; }
    y += textBlock(R.x + 14, y, R.w - 28, '위 칸의 「수위 변화 속도」가 0이 되는 압력을 찾아요. + 는 물이 용액 쪽으로 이동한다는 뜻이에요.', 13, MUTED, 18, 700) + 6;
    if (O.seen.rev) textBlock(R.x + 14, y, R.w - 28, '압력이 삼투압보다 크면 물이 용액에서 순수한 물 쪽으로 이동해요 (역삼투).', 13, INK, 18, 800);
  }

  /* ================= ② π = CRT ================= */
  const crtC = () => cOfCi(S.crt.ci), crtPi = (sub) => (sub === 't' ? piOf(0.10, S.crt.T) : piOf(crtC(), T25));
  const cN = () => Object.keys(S.crt.rc).length, tN = () => Object.keys(S.crt.rt).length;
  const crtDone = () => cN() === 4 && tN() === 3;
  function crtGeo(sub) { const L = RC.L; return sub === 'c' ? { x: L.x + 62, y: L.y + 74, w: L.w - 92, h: L.h - 158, xmax: 0.42, ymax: 10.5, xs: 0.1, ys: 2 } : { x: L.x + 62, y: L.y + 74, w: L.w - 92, h: L.h - 158, xmax: 340, ymax: 3.15, xs: 50, ys: 0.5 }; }
  function recCrt(sub) {
    const K = S.crt;
    if (sub === 'c') {
      if (C_TGT.indexOf(K.ci) < 0) { showHint('C = 0.05, 0.10, 0.20, 0.40 M 중 하나로 맞춘 뒤 기록해요.'); Sound.fail(); return; }
      if (K.rc[K.ci] == null) { K.rc[K.ci] = recPi(crtC(), T25); K.pop = { s: 'c', k: K.ci, t: 0 }; Sound.success(); const g = crtGeo('c'); parts.burst(g.x + crtC() / g.xmax * g.w, g.y + g.h - K.rc[K.ci] / g.ymax * g.h, { count: 10, speed: 110, life: 0.5, size: 3.4 }); }
    } else {
      if (T_TGT.indexOf(K.T) < 0) { showHint('T = 280, 298, 320 K 중 하나로 맞춘 뒤 기록해요.'); Sound.fail(); return; }
      if (K.rt[K.T] == null) { K.rt[K.T] = recPi(0.10, K.T); K.pop = { s: 't', k: K.T, t: 0 }; Sound.success(); const g = crtGeo('t'); parts.burst(g.x + K.T / g.xmax * g.w, g.y + g.h - K.rt[K.T] / g.ymax * g.h, { count: 10, speed: 110, life: 0.5, size: 3.4 }); }
    }
    updateCtl();
  }
  const slopeC = () => { let a = 0, b = 0; Object.keys(S.crt.rc).forEach((k) => { const c = cOfCi(+k); a += c * S.crt.rc[k]; b += c * c; }); return b ? a / b : 0; };
  const slopeT = () => { let a = 0, b = 0; Object.keys(S.crt.rt).forEach((k) => { a += +k * S.crt.rt[k]; b += +k * +k; }); return b ? a / b : 0; };
  function stepCrt(dt) {
    const K = S.crt; if (K.pop) { K.pop.t += dt; if (K.pop.t > 0.6) K.pop = null; }
    K.lineC = ap2(K.lineC, cN() === 4 ? 1 : 0, dt, 2.6); if (cN() === 4 && K.lineC > 0.995) K.lineC = 1;
    K.lineT = ap2(K.lineT, tN() === 3 ? 1 : 0, dt, 2.6); if (tN() === 3 && K.lineT > 0.995) K.lineT = 1;
  }
  function drawCrtGraph(t, sub) {
    const L = RC.L, K = S.crt, g = crtGeo(sub), cc = sub === 'c', X = (v) => g.x + v / g.xmax * g.w, Y = (v) => g.y + g.h - v / g.ymax * g.h;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, cc ? '📈 삼투압 π와 농도 C (T = 298 K)' : '📈 삼투압 π와 절대 온도 T (C = 0.10 M)', PHONE ? 13.5 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 48, cc ? '농도를 바꿔 가며 점을 기록해요' : '온도를 바꿔 가며 점을 기록해요 (그래프는 0 K에서 시작해요)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x, g.y, g.w, g.h, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let v = 0; v <= g.ymax + 1e-6; v += g.ys) { ctx.beginPath(); ctx.moveTo(g.x, Y(v)); ctx.lineTo(g.x + g.w, Y(v)); ctx.stroke(); T(g.x - 8, Y(v) + 4, cc ? String(v) : v.toFixed(1), 12, MUTED, 'right', 700); }
    for (let v = 0; v <= g.xmax + 1e-6; v += g.xs) { ctx.beginPath(); ctx.moveTo(X(v), g.y); ctx.lineTo(X(v), g.y + g.h); ctx.stroke(); T(X(v), g.y + g.h + 17, cc ? v.toFixed(1) : String(Math.round(v)), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h); ctx.lineTo(g.x + g.w, g.y + g.h); ctx.stroke();
    T(g.x + g.w, g.y + g.h + 36, cc ? '농도 C (mol/L) →' : '절대 온도 T (K) →', 12.5, MUTED, 'right', 800); T(g.x - 6, g.y - 8, '삼투압 π (atm)', 12.5, MUTED, 'left', 800);
    const n = cc ? cN() : tN(), full = cc ? 4 : 3, e = sm(cc ? K.lineC : K.lineT);
    if (e > 0) {
      const sl = cc ? slopeC() : slopeT();
      ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
      ctx.strokeStyle = BAD; ctx.lineWidth = 3; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(g.xmax * e), Y(sl * g.xmax * e)); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      if (e > 0.98) D.label(g.x + g.w * 0.4, g.y + 16, '원점을 지나는 직선 · 기울기 ' + (cc ? sl.toFixed(1) + ' atm·L/mol' : sl.toFixed(4) + ' atm/K'), { size: 12, bg: BAD, align: 'center' });
    }
    // 현재 눈금
    const cx = cc ? crtC() : K.T, cp = cc ? piOf(crtC(), T25) : piOf(0.10, K.T);
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(cx), g.y + g.h); ctx.lineTo(X(cx), Y(cp)); ctx.lineTo(g.x, Y(cp)); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(X(cx), Y(cp), 6, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.6 });
    D.label(clamp(X(cx) + (cc ? 64 : -64), g.x + 84, g.x + g.w - 84), Y(cp) + (cc ? 30 : 72), (cc ? 'C ' + crtC().toFixed(2) + ' M' : 'T ' + K.T + ' K') + ' → π ' + f2(cp) + ' atm', { size: 12.5, bg: '#475569', align: 'center' });
    // 기록한 점
    const rec = cc ? K.rc : K.rt;
    Object.keys(rec).forEach((k) => { const xv = cc ? cOfCi(+k) : +k, pop = K.pop && K.pop.s === sub && K.pop.k === +k ? Math.max(0, 1 - K.pop.t * 2) : 0; D.sphere(X(xv), Y(rec[k]), 7 + pop * 4, cc ? '#d97706' : '#0e7fc0', { gloss: true, outline: '#fff', shadow: true }); T(X(xv) + 10, Y(rec[k]) - 8, f2(rec[k]), 12, INK, 'left', 800, HALO); });
    T(L.x + L.w / 2, L.y + L.h - 10, '기록한 점 ' + n + ' / ' + full, 13, n === full ? GOOD : MUTED, 'center', 800);
  }
  function drawCrtInfo(t) {
    const R = RC.R, K = S.crt, sub = S.sub.crt === 't' ? 't' : 'c';
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🧪 삼투압계의 눈금', 14.5, INK, 'left', 800);
    const pv = crtPi(sub), dr = PHONE ? 46 : 52;
    D.dial(R.x + R.w / 2, R.y + 36 + dr + 8, dr, clamp(pv, 0, 10), 0, 10, { label: 'π (atm)', ticks: 5 });
    let y = R.y + 36 + dr * 2 + 36;
    T(R.x + 14, y, 'π = ' + f2(pv) + ' atm', 17, INK, 'left', 800); y += 24;
    T(R.x + 14, y, sub === 'c' ? 'C ' + crtC().toFixed(2) + ' M · T 298 K' : 'C 0.10 M · T ' + K.T + ' K (' + (K.T - 273) + ' °C)', 13, MUTED, 'left', 800); y += 22;
    const rows = sub === 'c' ? C_TGT.map((ci) => [cOfCi(ci).toFixed(2) + ' M', K.rc[ci]]) : T_TGT.map((tt) => [tt + ' K', K.rt[tt]]);
    rows.forEach((r, i) => { T(R.x + 16, y + i * 22, r[0], 13.5, INK, 'left', 800); T(R.x + R.w - 16, y + i * 22, r[1] != null ? f2(r[1]) + ' atm' : '—', 13.5, r[1] != null ? '#b45309' : '#9aa6bb', 'right', 800); });
    y += rows.length * 22 + 6;
    if (crtDone() && (!PHONE || y + 60 < R.y + R.h)) {
      D.roundRect(R.x + 12, y, R.w - 24, PHONE ? 70 : 96, 10); ctx.fillStyle = 'rgba(20,160,88,.09)'; ctx.fill(); ctx.strokeStyle = GOOD; ctx.lineWidth = 1.8; ctx.stroke();
      T(R.x + 22, y + 26, 'π = C · R · T', 19, '#0f6b3c', 'left', 800);
      T(R.x + 22, y + 48, '기울기 24.4 = RT, 0.0082 = CR', 12.5, INK, 'left', 800);
      if (!PHONE) T(R.x + 22, y + 72, 'R = 0.082 atm·L/(mol·K)', 12.5, MUTED, 'left', 800);
    } else if (!crtDone()) textBlock(R.x + 14, y + 4, R.w - 28, '농도 4점, 온도 3점을 모두 기록하면 식이 보여요.', 13, MUTED, 18, 700);
  }

  /* ================= 연결 카드 (② 식 대응, ④ 사례) ================= */
  const mkMatch = (cfg) => ({ cfg, links: cfg.left.map(() => -1), sel: null, drag: null, wrong: [] });
  function mGeo(M) {
    const L = RC.L, n = M.cfg.left.length, cw = (L.w - 28 - 70) / 2, rh = Math.min(86, (L.h - 120) / n), y0 = L.y + 76;
    return { cw, rh, left: (i) => ({ x: L.x + 14, y: y0 + i * rh, w: cw, h: rh - 10 }), right: (j) => ({ x: L.x + L.w - 14 - cw, y: y0 + j * rh, w: cw, h: rh - 10 }) };
  }
  function mHit(M, p) {
    const G = mGeo(M), n = M.cfg.left.length;
    for (let i = 0; i < n; i++) { if (inRect(p, G.left(i))) return { side: 0, i }; if (inRect(p, G.right(i))) return { side: 1, i }; }
    return null;
  }
  function mLink(M, li, rj) {
    M.links = M.links.map((v, k) => (v === rj ? -1 : v)); M.links[li] = rj; M.sel = null; M.wrong = []; Sound.tick(); updateCtl();
  }
  function mUnlink(M, side, i) { if (side === 0) M.links[i] = -1; else M.links = M.links.map((v) => (v === i ? -1 : v)); M.sel = null; M.wrong = []; updateCtl(); }
  const mLinked = (M) => M.links.filter((v) => v >= 0).length;
  function mCheck(M) {
    const n = M.cfg.left.length, k = mLinked(M);
    if (k < n) return '카드 ' + n + '쌍을 모두 이어 주세요. (지금 ' + k + '쌍)';
    M.wrong = M.links.map((v, i) => i).filter((i) => M.cfg.right[M.links[i]].of !== i);
    if (M.wrong.length) return M.wrong.length + '쌍이 알맞지 않아요. 빨간 선을 다시 생각해 봐요. ' + M.cfg.tip;
    return true;
  }
  function mReset(M) { M.links = M.links.map(() => -1); M.sel = null; M.drag = null; M.wrong = []; updateCtl(); }
  function drawMatch(M) {
    const L = RC.L, G = mGeo(M), n = M.cfg.left.length;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, M.cfg.title, PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '왼쪽 카드와 오른쪽 카드를 차례로 눌러 이어요 (끌어서 이어도 돼요)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    T(L.x + 14 + G.cw / 2, L.y + 68, M.cfg.hl, 12.5, MUTED, 'center', 800); T(L.x + L.w - 14 - G.cw / 2, L.y + 68, M.cfg.hr, 12.5, MUTED, 'center', 800);
    // 연결선
    M.links.forEach((j, i) => {
      if (j < 0) return; const a = G.left(i), b = G.right(j), wr = M.wrong.indexOf(i) >= 0;
      ctx.strokeStyle = wr ? BAD : PUR; ctx.lineWidth = wr ? 3.4 : 3; ctx.beginPath(); ctx.moveTo(a.x + a.w, a.y + a.h / 2); ctx.bezierCurveTo(a.x + a.w + 30, a.y + a.h / 2, b.x - 30, b.y + b.h / 2, b.x, b.y + b.h / 2); ctx.stroke();
    });
    if (M.drag && M.drag.moved) { const a = M.drag.side === 0 ? G.left(M.drag.i) : G.right(M.drag.i); ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(M.drag.side === 0 ? a.x + a.w : a.x, a.y + a.h / 2); ctx.lineTo(M.drag.px, M.drag.py); ctx.stroke(); ctx.setLineDash([]); }
    const card = (r, txt, sel, linked, wr, color) => {
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = linked ? '#f5f0ff' : '#fff'; ctx.fill(); }, { blur: sel ? 12 : 4, y: sel ? 5 : 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.strokeStyle = wr ? BAD : sel ? PUR : linked ? '#b9a5ee' : '#cfd8ea'; ctx.lineWidth = wr || sel ? 3 : 1.5; ctx.stroke();
      const ls = wrap(txt, r.w - 18, 13, 800).slice(0, 4);
      ls.forEach((l, k) => T(r.x + 9, r.y + r.h / 2 - (ls.length - 1) * 8 + k * 16 + 4.5, l, 13, color || INK, 'left', 800));
    };
    for (let i = 0; i < n; i++) {
      card(G.left(i), M.cfg.left[i], M.sel && M.sel.side === 0 && M.sel.i === i, M.links[i] >= 0, M.wrong.indexOf(i) >= 0, '#1d4f8a');
      const li = M.links.indexOf(i);
      card(G.right(i), M.cfg.right[i].t, M.sel && M.sel.side === 1 && M.sel.i === i, li >= 0, li >= 0 && M.wrong.indexOf(li) >= 0, '#7a1f4a');
    }
  }

  /* ================= ③ 계산 연습 ================= */
  const CALCS = [
    { t: '① 0.10 M 설탕물(비전해질)의 25 °C 삼투압 π는? (T = 298 K)', q: '구하는 값: π (atm)', steps: ['π = C · R · T', '= 0.10 × 0.082 × 298 = 2.44 atm', '(물기둥으로 약 2.44 × 10.3 = 25 m)'], tip: '① 온도를 K로 ② π = CRT에 대입' },
    { t: '② 단백질 1.0 g을 물 100 mL에 녹인 용액의 27 °C 삼투압이 0.0123 atm이에요.', q: '구하는 값: 단백질의 몰질량 M (g/mol)', steps: ['C = π / (RT) = 0.0123 / (0.082 × 300) = 5.0 × 10⁻⁴ mol/L', 'n = C × 0.100 L = 5.0 × 10⁻⁵ mol', 'M = 1.0 g / 5.0 × 10⁻⁵ mol = 2.0 × 10⁴ g/mol'], tip: '① C = π / RT ② n = C × V ③ M = 질량 / n' },
    { t: '③ 링거액(0.9 % NaCl, 0.154 M)의 37 °C(310 K) 삼투압 π는? NaCl은 Na⁺과 Cl⁻으로 나뉘어요.', q: '구하는 값: π (atm)', steps: ['이온 입자의 총 농도 = 0.154 × 2 = 0.308 mol/L', 'π = 0.308 × 0.082 × 310 = 7.8 atm', '(혈액의 삼투압 약 7.7 atm과 비슷해요 → 등장액)'], tip: '① 입자 총 농도 ② π = CRT' },
  ];
  const CQ = [{ v: 2.44, tol: 0.04 }, { v: 20000, tol: 1000 }, { v: 7.8, tol: 0.15 }];
  function drawCalc(t) {
    const L = RC.L, A = S.calc;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧮 π = CRT 로 계산해요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, 'R = 0.082 atm·L/(mol·K), T = 섭씨 온도 + 273 (K)', 12.5, MUTED, 'left', 800);
    CALCS.forEach((cd, i) => {
      const y = L.y + 58 + i * 144, done = A.ok[i], h = 136;
      D.roundRect(L.x + 12, y, L.w - 24, h, 12); ctx.fillStyle = done ? 'rgba(20,160,88,.08)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = done ? GOOD : '#dbe3f3'; ctx.lineWidth = done ? 2.2 : 1.4; ctx.stroke();
      let yy = y + 20; yy += textBlock(L.x + 24, yy, L.w - 48, cd.t, 13, INK, 17, 800) + 4;
      T(L.x + 24, yy + 6, cd.q, 13, PUR, 'left', 800); yy += 28;
      if (done) { cd.steps.forEach((s, k) => { yy += textBlock(L.x + 24, yy, L.w - 48, s, 12.5, k === 1 ? GOOD : INK, 16, 800) + 2; }); T(L.x + L.w - 24, y + 18, '✅ 정답', 13, GOOD, 'right', 800); }
      else { T(L.x + 24, yy + 2, cd.tip, 12.5, MUTED, 'left', 700); T(L.x + 24, yy + 24, (PHONE ? '답을 아래 입력칸에 적어요' : '답을 오른쪽 입력칸에 적어요'), 12.5, PUR, 'left', 800); }
    });
  }
  function drawCalcInfo(t) {
    const R = RC.R;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📌 쓰는 식과 단위', 14.5, INK, 'left', 800);
    let y = R.y + 54;
    T(R.x + 14, y, 'π = C · R · T', 19, INK, 'left', 800); y += 28;
    y += textBlock(R.x + 14, y, R.w - 28, '단위 점검: π(atm) = C(mol/L) × R(atm·L/(mol·K)) × T(K) → mol, L, K가 약분되어 atm만 남아요.', 13, INK, 18, 800) + 8;
    y += textBlock(R.x + 14, y, R.w - 28, '같은 0.10 M이면 포도당 18 g/L 와 설탕 34.2 g/L 의 π는 같아요. 입자 수가 같기 때문이에요.', 13, MUTED, 18, 700) + 8;
    if (!PHONE || y + 50 < R.y + R.h) textBlock(R.x + 14, y, R.w - 28, '전해질은 이온으로 나뉜 입자의 총 농도로 세어요. 단백질처럼 아주 큰 분자는 π를 재면 몰질량을 구할 수 있어요.', 12.5, MUTED, 17, 700);
  }

  /* ================= ④ 역삼투 ================= */
  const K_RO = 0.4, VMAX = 100;                         // 담수 생산 속도 = 0.4 mL/s × (P − π)
  const roP = () => S.ro.P;
  const roRateWanted = () => K_RO * (roP() - PI_SEA);
  function roInit() {
    const R = S.ro; R.ions = []; R.wat = [];
    const g = OG();
    for (let k = 0; k < 14; k++) R.ions.push({ x: rnd(g.x0 + 14, g.xm - 14), y: rnd(g.y1 - 130, g.y1 - 14), vx: rnd(-1, 1), vy: rnd(-1, 1), k: k % 2, fade: 1 });
  }
  function stepRo(dt) {
    const R = S.ro; let rate = roRateWanted();
    if (R.V <= 0 && rate < 0) rate = 0;                 // 담수가 다 없어지면 더 줄지 않아요
    R.rate = rate; R.V = clamp(R.V + rate * dt, 0, VMAX); if (rate > 0) R.prod += rate * dt;   // 탱크가 가득 차면 넘쳐 나가요
    const g = OG(), nTarget = 14 + Math.min(14, Math.round(R.prod / 12));
    while (R.ions.length < nTarget) R.ions.push({ x: rnd(g.xm - 60, g.xm - 14), y: rnd(g.y1 - 130, g.y1 - 14), vx: rnd(-1, 1), vy: rnd(-1, 1), k: R.ions.length % 2, fade: 0 });
    const top = g.y1 - 150 + 8, bot = g.y1 - 8, left = g.x0 + 8, right = g.xm - 10;
    R.ions.forEach((p) => { p.fade = Math.min(1, p.fade + dt * 2); const s = Math.hypot(p.vx, p.vy) || 1; p.vx /= s; p.vy /= s; p.x += p.vx * 40 * dt; p.y += p.vy * 40 * dt; if (p.x < left) { p.x = left; p.vx = Math.abs(p.vx); } else if (p.x > right) { p.x = right; p.vx = -Math.abs(p.vx); } if (p.y < top) { p.y = top; p.vy = Math.abs(p.vy); } else if (p.y > bot) { p.y = bot; p.vy = -Math.abs(p.vy); } });
    if (!RM && S.mode === 'ro' && Math.abs(rate) > 0.15) {
      R.acc += Math.min(Math.abs(rate) * 1.5, 22) * dt;
      while (R.acc >= 1) { R.acc -= 1; const dir = rate > 0 ? 1 : -1; parts.emit({ x: g.xm - dir * 30 + rnd(-3, 3), y: rnd(g.y1 - 140, g.y1 - 10), vx: dir * rnd(60, 90), vy: 0, life: 0.5, size: 3, color: '#5ab8f5', fade: true }); }
    }
  }
  function drawRo(t) {
    const L = RC.L, g = OG(), R = S.ro, P = roP();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '💧 해수 담수화 장치 (역삼투)', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '왼쪽 바닷물 | 오른쪽 담수 (바닷물은 계속 공급돼요)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const lvSea = 25, lvFresh = (14 + R.V * 1.4) / g.sc;       // 담수 수위(cm). 바닷물 수위는 일정
    const lv = drawRig(g, { lvL: lvSea, lvR: lvFresh, cL: 1.1, cR: 0, solRight: false, salt: true, P, Ptxt: Math.round(P) + ' atm' });
    // 이온
    R.ions.forEach((p) => { ctx.globalAlpha = p.fade; D.sphere(p.x, p.y, 4.2, p.k ? '#22c55e' : '#94a3b8', { gloss: false }); }); ctx.globalAlpha = 1;
    T(g.x0 + (g.xm - g.x0) / 2 + 10, g.y0 + 22, '🌊 바닷물 (약 1.1 M)', 13.5, '#0f6b3c', 'center', 800);
    T(g.xm + (g.x1 - g.xm) / 2, g.y0 + 22, '💧 담수', 13.5, '#0369a1', 'center', 800);
    // 압력계 (삼투압 부근을 초록색으로)
    D.dial(g.x1 - 12, L.y + 98, 40, P, 0, 80, { label: 'atm', ticks: 2, target: [PI_SEA - 1.5, PI_SEA + 1.5] });
    const rate = R.rate;
    if (Math.abs(rate) > 0.15) { const dir = rate > 0 ? 1 : -1; D.arrow(g.xm - dir * 26, g.y1 - 100, g.xm + dir * 26, g.y1 - 100, { color: SKY, width: clamp(Math.abs(rate) * 0.5 + 2, 2, 7), head: 12 }); T(g.xm, g.y1 - 114, dir > 0 ? '담수 생산' : '담수가 바닷물 쪽으로', 13, '#0369a1', 'center', 800, HALO); }
    const msg = P > PI_SEA + 0.3 ? '바닷물 쪽 압력이 삼투압보다 커요. 물만 막을 지나 담수가 생기고, 소금 이온은 막 앞에 남아요.' : P < PI_SEA - 0.3 ? '압력이 삼투압보다 작아서 오히려 담수가 바닷물 쪽으로 이동해요(삼투).' : '압력이 삼투압(약 27 atm)과 거의 같아서 물의 순 이동이 없어요.';
    textBlock(L.x + 16, L.y + 458, L.w - 32, msg, PHONE ? 13 : 13.5, INK, 19, 800);
  }
  function drawRoInfo(t) {
    const R = RC.R, O = S.ro, P = roP();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 장치 상태', 14.5, INK, 'left', 800);
    const d = P - PI_SEA;
    const rows = [['바닷물의 삼투압 π', f1(PI_SEA) + ' atm (약 27)', '#0f6b3c'], ['가한 압력 P', Math.round(P) + ' atm', BAD], ['P − π', (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' atm', d > 0 ? GOOD : '#c2410c'], ['담수 생산 속도', (O.rate >= 0 ? '+' : '−') + Math.abs(O.rate).toFixed(1) + ' mL/s', SKY], ['담수 생산량(누적)', Math.round(O.prod) + ' mL', INK]];
    rows.forEach((r, i) => { T(R.x + 14, R.y + 54 + i * 27, r[0], 13.5, r[2], 'left', 800); T(R.x + R.w - 14, R.y + 54 + i * 27, r[1], 14, r[2], 'right', 800); });
    let y = R.y + 54 + 5 * 27 + 12;
    y += textBlock(R.x + 14, y, R.w - 28, 'P > π 이면 역삼투: 물이 바닷물에서 담수 쪽으로 이동해요.', 13.5, INK, 19, 800) + 8;
    if (!PHONE || y + 40 < R.y + R.h) textBlock(R.x + 14, y, R.w - 28, '실제 해수 담수화 설비는 약 55~70 atm 의 높은 압력을 써요. 가정용 정수기에도 역삼투막이 쓰여요.', 12.5, MUTED, 17, 700);
  }

  /* ================= 연결 카드 자료 ================= */
  S.mt.crt = mkMatch({
    title: '🔗 PV = nRT 와 π = CRT 를 연결해요', hl: '이상 기체', hr: '삼투압', tip: '기체의 압력 P = (n/V)RT 와 삼투압 π = CRT 를 비교해요.',
    left: ['기체의 압력 P', '기체의 몰 농도 n/V', '기체 상수 R', '절대 온도 T'],
    right: [{ t: '용액의 몰 농도 C', of: 1 }, { t: '절대 온도 T (K)', of: 3 }, { t: '삼투압 π', of: 0 }, { t: '같은 값 R = 0.082 atm·L/(mol·K)', of: 2 }],
  });
  S.mt.ro = mkMatch({
    title: '🔗 역삼투가 쓰이는 사례를 연결해요', hl: '사례', hr: '설명', tip: '역삼투는 삼투압보다 큰 압력으로 물만 반대로 이동시키는 방법이에요.',
    left: ['해수 담수화 장치', '가정용 정수기', '링거액 설계', '실제 해수 담수화 설비의 압력'],
    right: [{ t: '혈액과 삼투압이 같은 0.9 % NaCl 용액으로 만들어요', of: 2 }, { t: '바닷물의 삼투압(약 27 atm)보다 큰 압력으로 담수를 얻어요', of: 0 }, { t: '삼투압보다 훨씬 큰 55~70 atm 의 압력을 써요', of: 3 }, { t: '수돗물에 압력을 걸어 이온과 불순물을 걸러 내요', of: 1 }],
  });
  const matchOf = () => (S.mode === 'crt' && S.sub.crt === 'match' ? S.mt.crt : S.mode === 'ro' && S.sub.ro === 'match' ? S.mt.ro : null);

  /* ================= 컨트롤 · 공통 ================= */
  const obsBox = $('#obsChips');
  OBS_C.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = c.toFixed(2) + ' M'; b.setAttribute('aria-label', '설탕 용액 ' + c.toFixed(2) + ' M');
    b.addEventListener('click', () => { Sound.click(); setObsC(i); }); obsBox.appendChild(b);
  });
  function setObsC(i) { if (S.obs.ci !== i) { S.obs.ci = i; S.obs.tEq = 0; S.obs.tRev = 0; } updateCtl(); }
  function setObsP(v) { S.obs.P = clamp(Math.round(v), 0, 120); updateCtl(); }
  function setCi(v) { S.crt.ci = clamp(Math.round(v), 1, 8); updateCtl(); }
  function setT(v) { S.crt.T = clamp(Math.round(v / 2) * 2, 280, 320); updateCtl(); }
  function setRoP(v) { S.ro.P = clamp(Math.round(v), 0, 80); updateCtl(); }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => {
      const toks = n.getAttribute('data-show').split(' ');
      n.hidden = !toks.some((tk) => { const [m, v] = tk.split(':'); return m === S.mode && (v == null || S.sub[m] === v); });
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#crtSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.crt));
    $$('#roSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.ro));
    $$('#obsChips button').forEach((b, i) => b.classList.toggle('on', i === S.obs.ci));
    $('#oOc').textContent = obsC().toFixed(2) + ' M';
    $('#oOp').textContent = f1(obsP()) + ' atm'; $('#sOp').value = S.obs.P; $('#opMinus').disabled = S.obs.P <= 0; $('#opPlus').disabled = S.obs.P >= 120;
    const K = S.crt;
    $('#oCc').textContent = crtC().toFixed(2) + ' M'; $('#sCc').value = K.ci; $('#ccMinus').disabled = K.ci <= 1; $('#ccPlus').disabled = K.ci >= 8;
    $('#oCt').textContent = K.T + ' K'; $('#sCt').value = K.T; $('#ctMinus').disabled = K.T <= 280; $('#ctPlus').disabled = K.T >= 320;
    const cr = K.rc[K.ci] != null, tr = K.rt[K.T] != null;
    $('#bRecC').textContent = cr ? '✅ 기록했어요' : '📝 이 점 기록하기'; $('#bRecC').disabled = C_TGT.indexOf(K.ci) < 0 || cr;
    $('#bRecT').textContent = tr ? '✅ 기록했어요' : '📝 이 점 기록하기'; $('#bRecT').disabled = T_TGT.indexOf(K.T) < 0 || tr;
    $('#oRp').textContent = Math.round(S.ro.P) + ' atm'; $('#sRp').value = S.ro.P; $('#rpMinus').disabled = S.ro.P <= 0; $('#rpPlus').disabled = S.ro.P >= 80;
    ['#q1', '#q2', '#q3'].forEach((id, k) => { const inp = $(id), v = S.calc.q[k]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', S.calc.ok[k] && v !== ''); if (!inp.classList.contains('ok')) inp.classList.remove('bad'); });
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  function setSub(m, v) { S.sub[m] = v; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#crtSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('crt', b.dataset.v); }));
  $$('#roSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('ro', b.dataset.v); }));
  $('#sOp').addEventListener('input', (e) => setObsP(+e.target.value));
  $('#opMinus').addEventListener('click', () => { Sound.tick(); setObsP(S.obs.P - 1); });
  $('#opPlus').addEventListener('click', () => { Sound.tick(); setObsP(S.obs.P + 1); });
  $('#sCc').addEventListener('input', (e) => setCi(+e.target.value));
  $('#ccMinus').addEventListener('click', () => { Sound.tick(); setCi(S.crt.ci - 1); });
  $('#ccPlus').addEventListener('click', () => { Sound.tick(); setCi(S.crt.ci + 1); });
  $('#sCt').addEventListener('input', (e) => setT(+e.target.value));
  $('#ctMinus').addEventListener('click', () => { Sound.tick(); setT(S.crt.T - 2); });
  $('#ctPlus').addEventListener('click', () => { Sound.tick(); setT(S.crt.T + 2); });
  $('#bRecC').addEventListener('click', () => { Sound.click(); recCrt('c'); });
  $('#bRecT').addEventListener('click', () => { Sound.click(); recCrt('t'); });
  $('#sRp').addEventListener('input', (e) => setRoP(+e.target.value));
  $('#rpMinus').addEventListener('click', () => { Sound.tick(); setRoP(S.ro.P - 1); });
  $('#rpPlus').addEventListener('click', () => { Sound.tick(); setRoP(S.ro.P + 1); });
  $('#bMatchC').addEventListener('click', () => { Sound.click(); mReset(S.mt.crt); });
  $('#bMatchR').addEventListener('click', () => { Sound.click(); mReset(S.mt.ro); });
  ['#q1', '#q2', '#q3'].forEach((id, k) => {
    const inp = $(id), okf = (s) => near(parseNum(s), CQ[k].v, CQ[k].tol);
    inp.addEventListener('input', () => { S.calc.q[k] = inp.value; const was = S.calc.ok[k]; S.calc.ok[k] = okf(inp.value); inp.classList.remove('bad'); inp.classList.toggle('ok', S.calc.ok[k]); if (S.calc.ok[k] && !was) { Sound.tick(); updateCtl(); } });
    inp.addEventListener('change', () => { if (inp.value !== '' && !S.calc.ok[k]) { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); } });
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'obs') { const O = S.obs; O.ci = 1; O.P = 0; O.x = 0; O.rate = 0; O.tEq = 0; O.tRev = 0; }
    else if (S.mode === 'crt') { if (S.sub.crt === 'c') { S.crt.rc = {}; S.crt.ci = 2; } else if (S.sub.crt === 't') { S.crt.rt = {}; S.crt.T = 298; } else mReset(S.mt.crt); }
    else if (S.mode === 'calc') { S.calc.q = ['', '', '']; S.calc.ok = [false, false, false]; }
    else if (S.sub.ro === 'rig') { S.ro.P = 0; S.ro.V = 20; S.ro.prod = 0; S.ro.rate = 0; roInit(); } else mReset(S.mt.ro);
    updateCtl();
  });

  /* ================= 포인터 (연결 카드) ================= */
  SciSim.pointer(view, {
    down(p) { const M = matchOf(); if (!M) return false; const h = mHit(M, p); M.drag = { hit: h, sx: p.x, sy: p.y, px: p.x, py: p.y, moved: false, side: h ? h.side : 0, i: h ? h.i : 0 }; return true; },
    move(p) { const M = matchOf(); if (!M || !M.drag || !M.drag.hit) return; const d = M.drag; d.px = p.x; d.py = p.y; if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; },
    up(p) {
      const M = matchOf(); if (!M) return; const d = M.drag; M.drag = null; if (!d) return;
      if (!d.hit) { M.sel = null; return; }
      const t = mHit(M, p), h = d.hit;
      if (d.moved) { if (t && t.side !== h.side) { if (h.side === 0) mLink(M, h.i, t.i); else mLink(M, t.i, h.i); } return; }
      if (M.sel && M.sel.side !== h.side) { if (M.sel.side === 0) mLink(M, M.sel.i, h.i); else mLink(M, h.i, M.sel.i); return; }
      M.sel = M.sel && M.sel.side === h.side && M.sel.i === h.i ? null : { side: h.side, i: h.i }; Sound.tick(); updateCtl();
    },
    hover(p) { const M = matchOf(); return M && mHit(M, p) ? 'pointer' : null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'obs') { L1 = '가한 압력 P'; a = f1(obsP()) + ' atm'; L2 = '수위 변화 속도'; b = sg1(S.obs.rate) + ' cm/s'; L3 = '용액 쪽 수위 변화'; c = sg1(S.obs.x) + ' cm'; }
    else if (S.mode === 'crt') {
      if (S.sub.crt === 'match') { const M = S.mt.crt; L1 = '이은 카드'; a = mLinked(M) + ' / ' + M.cfg.left.length; L2 = '식'; b = 'P = (n/V)RT'; L3 = '삼투압'; c = 'π = CRT'; }
      else { const sub = S.sub.crt; L1 = sub === 'c' ? '농도 C' : '온도 T'; a = sub === 'c' ? crtC().toFixed(2) + ' M' : S.crt.T + ' K'; L2 = '삼투압 π'; b = f2(crtPi(sub)) + ' atm'; L3 = '기록한 점'; c = sub === 'c' ? cN() + ' / 4' : tN() + ' / 3'; }
    } else if (S.mode === 'calc') { L1 = '풀이'; a = '① ' + mark(S.calc.ok[0]) + ' ② ' + mark(S.calc.ok[1]) + ' ③ ' + mark(S.calc.ok[2]); L2 = 'R'; b = '0.082 atm·L/(mol·K)'; L3 = 'T (K)'; c = '°C + 273'; }
    else if (S.sub.ro === 'match') { const M = S.mt.ro; L1 = '이은 카드'; a = mLinked(M) + ' / ' + M.cfg.left.length; L2 = '바닷물의 삼투압'; b = '약 27 atm'; L3 = '실제 설비'; c = '55~70 atm'; }
    else { L1 = '가한 압력 P'; a = Math.round(S.ro.P) + ' atm'; L2 = 'P − π'; b = (S.ro.P - PI_SEA >= 0 ? '+' : '−') + Math.abs(S.ro.P - PI_SEA).toFixed(1) + ' atm'; L3 = '담수 생산량'; c = Math.round(S.ro.prod) + ' mL'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '삼투압 재기: 물의 이동을 막는 압력', short: '삼투압 재기', icon: '📏', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 삼투를 멈추려면 얼마나 세게 눌러야 할까? 그 압력은 농도와 온도에 어떻게 달라질까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(삼투 현상)와 일반선택 화학(몰 농도)에서</b> 반투막을 사이에 두고 물이 농도가 낮은 쪽에서 높은 쪽으로 이동해 수위 차가 생기는 것을 보았어요. 이번에는 그 이동을 <b>압력으로 막아</b> 봐요.</div>' +
        '<p>왼쪽은 순수한 물, 오른쪽은 설탕 용액이에요. 용액 쪽 <b>피스톤</b>으로 압력 P를 가하면 물의 이동이 달라져요. 물의 순 이동이 <b>멈추는 압력</b>이 <b>삼투압</b>이에요. (처음 농도를 기준으로 한 모형이에요.)</p>',
      features: ['obs'],
      setup() { S.lock = false; setMode('obs'); },
      recap: '삼투를 막기 위해 용액 쪽에 가해야 하는 압력이 삼투압이에요. 압력을 더 크게 가하면 물이 반대로 이동해요(역삼투).',
      summary: '<ul><li><b>삼투압 π</b>: 반투막을 통한 용매의 순 이동을 막기 위해 <b>용액 쪽에 가해야 하는 압력</b>.</li><li>P < π 이면 물이 용액 쪽으로 이동(삼투), P = π 이면 순 이동이 없고, P > π 이면 물이 반대로 이동해요(<b>역삼투</b>).</li><li>0.10 M 설탕 용액의 25 °C(298 K) 삼투압은 <b>2.44 atm</b>이에요. 이는 물기둥으로 약 25 m(1 atm ≈ 10.3 m)에 해당해서, 실제 U자관으로는 수위 차를 보기 어려워 피스톤 압력으로 나타냈어요.</li></ul>',
      missions: [
        {
          title: '수위가 멈추는 압력 찾기',
          goal: '0.10 M 용액에서 압력 P를 바꿔 <b>수위 변화 속도가 0이 되는 압력</b>을 찾아 잠시 유지하고, <b>더 큰 압력</b>에서 물이 반대로 이동하는 것도 확인해요.',
          hint: '「수위 변화 속도」가 0이 되는 압력(2~3 atm 사이)을 슬라이더로 맞춰 1.5초 유지해요. 그다음 압력을 4 atm 이상으로 올리고 용액 쪽 수위가 내려가는 것을 지켜봐요.',
          setup() { S.lock = true; const O = S.obs; O.ci = 1; O.P = 0; O.x = 0; O.rate = 0; O.tEq = 0; O.tRev = 0; O.seen = { eq: false, rev: false }; setMode('obs'); },
          check: () => S.obs.seen.eq && S.obs.seen.rev, hold: 0.3,
          status: () => '① 수위가 멈추는 압력 ' + mark(S.obs.seen.eq) + (S.obs.seen.eq ? ' (' + f2(obsPi()) + ' atm)' : '') + ' &nbsp; ② 물이 반대로 이동 ' + mark(S.obs.seen.rev) + ' &nbsp; 속도 ' + sg1(S.obs.rate) + ' cm/s',
          explain: '수위 변화가 0이 되는 압력은 <b>약 2.44 atm</b>이고, 이것이 0.10 M 설탕 용액의 <b>삼투압</b>이에요. 이보다 큰 압력을 가하면 물이 용액에서 순수한 물 쪽으로 반대로 이동해요(<b>역삼투</b>).',
        },
        {
          type: 'quiz', title: '삼투압이 가리키는 압력',
          goal: '삼투압을 가장 알맞게 설명한 것은?',
          setup() { S.lock = true; setMode('obs'); },
          choices: ['삼투를 막으려고 용액 쪽에 가해야 하는 압력이에요', '순수한 물 쪽에 가해서 물을 밀어내는 압력이에요', '설탕 분자가 반투막을 밀어내는 압력이에요', '용액이 물을 끌어당기는 힘으로, 직접 가하는 압력이 아니에요'],
          answer: 0,
          feedback: ['', '용액 쪽에 가해야 물의 순 이동이 멈춰요. 순수한 물 쪽이 아니에요.', '삼투압은 분자가 막을 미는 압력이 아니라, 물의 이동을 막기 위해 가해야 하는 압력이에요.', '이 장치에서 실제로 용액 쪽에 압력을 가해 수위 변화가 멈추는 값을 재었어요.'],
          explain: '<b>삼투압</b>은 반투막을 통한 용매의 순 이동을 막기 위해 <b>용액 쪽에 가해야 하는 압력</b>이에요.',
        },
      ],
    },
    {
      title: 'π = CRT: 농도와 온도의 관계', short: 'π = CRT', icon: '🔎', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계와 이상 기체 방정식(PV = nRT)에서</b> 삼투를 멈추는 압력이 삼투압이라는 것과, 기체의 압력이 입자 수와 온도에 비례한다는 것을 배웠어요. 삼투압은 농도와 온도에 어떻게 달라질까요?</div>' +
        '<p>변수를 <b>하나씩만</b> 바꿔요. 먼저 온도를 298 K로 두고 농도를 바꾸고(📈), 다음에는 농도를 0.10 M으로 두고 온도를 바꿔요(🌡️). 점을 기록해 그래프의 규칙을 찾고, 식을 기체 방정식과 비교해요.</p>',
      features: ['crt'],
      setup() { S.lock = false; S.sub.crt = 'c'; setMode('crt'); },
      recap: '삼투압은 몰 농도와 절대 온도에 비례해요: π = CRT. 이는 기체의 P = (n/V)RT 와 같은 꼴이에요.',
      summary: '<ul><li>298 K에서 C = 0.05, 0.10, 0.20, 0.40 M → π = 1.22, 2.44, 4.89, 9.77 atm. π–C는 <b>원점을 지나는 직선</b>(기울기 RT = 24.4 atm·L/mol).</li><li>C = 0.10 M에서 T = 280, 298, 320 K → π = 2.30, 2.44, 2.62 atm. π–T는 <b>원점을 지나는 직선</b>(절대 온도 K 기준).</li><li><b>π = C · R · T</b> (C: 용질 입자의 총 몰 농도 mol/L, R = 0.082 atm·L/(mol·K), T: 절대 온도 K).</li><li>기체 P = (n/V) · R · T 와 비교: P ↔ π, n/V ↔ C, R ↔ R, T ↔ T.</li><li>섭씨 온도를 2배로 해도 π는 2배가 되지 않아요. 켈빈 온도에 비례해요.</li></ul>',
      missions: [
        {
          title: 'π–C 4점과 π–T 3점 기록하기',
          goal: '📈 농도 C = 0.05, 0.10, 0.20, 0.40 M(298 K) 4점과 🌡️ 온도 T = 280, 298, 320 K(0.10 M) 3점을 모두 기록해요.',
          hint: '슬라이더를 알맞은 값에 맞추고 「이 점 기록하기」를 눌러요. 사이 값은 기록되지 않아요. 두 화면(📈, 🌡️)을 번갈아 써요.',
          setup() { S.lock = true; S.sub.crt = 'c'; S.crt.rc = {}; S.crt.rt = {}; S.crt.ci = 2; S.crt.T = 298; setMode('crt'); },
          check: () => crtDone(), hold: 0.5,
          status: () => '📈 농도 ' + cN() + ' / 4 &nbsp; 🌡️ 온도 ' + tN() + ' / 3',
          explain: '두 그래프 모두 <b>원점을 지나는 직선</b>이에요. 농도가 2배가 되면 π도 2배, 절대 온도(K)가 커지면 π도 비례해서 커져요. 기울기는 π–C에서 <b>RT = 24.4</b>, π–T에서 <b>CR = 0.0082</b>예요.',
        },
        {
          title: '기체 방정식과 연결하기', manual: true,
          goal: '기체의 P = (n/V)RT 의 각 항을 π = CRT 의 알맞은 항과 이어 4쌍을 맞추고 「확인하기」를 눌러요.',
          hint: 'P는 압력, n/V는 단위 부피당 입자의 몰수예요. 삼투압의 식에서 C와 π가 각각 무엇인지 생각해요. R과 T는 같은 문자예요.',
          setup() { S.lock = true; S.sub.crt = 'match'; mReset(S.mt.crt); setMode('crt'); },
          check: () => mCheck(S.mt.crt),
          explain: '<b>P ↔ π</b>(삼투압), <b>n/V ↔ C</b>(용질 입자의 몰 농도), <b>R ↔ R</b>(0.082 atm·L/(mol·K)), <b>T ↔ T</b>(절대 온도). 묽은 용액의 용질 입자는 기체 입자처럼 압력을 만들어요.',
        },
        {
          type: 'quiz', title: '온도를 올리면 삼투압은?',
          goal: '0.10 M 용액을 25 °C(298 K)에서 50 °C(323 K)로 올리면 삼투압은 어떻게 될까요?',
          setup() { S.lock = true; S.sub.crt = 't'; setMode('crt'); },
          choices: ['2배가 돼요. 섭씨 온도가 2배가 되기 때문이에요', '약 1.08배가 돼요. 절대 온도가 298 K에서 323 K로 늘기 때문이에요', '변하지 않아요', '절반이 돼요'],
          answer: 1,
          feedback: ['삼투압은 섭씨 온도가 아니라 절대 온도(K)에 비례해요. 25 °C → 50 °C 는 298 K → 323 K 예요.', '', 'π = CRT 에서 T가 커지면 π도 커져요.', '온도가 오르면 π는 커져요.'],
          explain: 'π는 <b>절대 온도(K)</b>에 비례해요. 323 / 298 ≈ <b>1.08배</b>예요(2.44 → 2.64 atm). 농도를 2배로 하면 π는 2배가 돼요.',
        },
      ],
    },
    {
      title: '계산 연습: 삼투압과 몰질량', short: '계산 연습', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> π = CRT 를 얻었어요. 이제 이 식으로 삼투압을 계산하고, 거꾸로 삼투압을 재어 아주 큰 분자의 몰질량도 구해 봐요.</div>' +
        '<p>계산할 때는 온도를 K로 바꾸고, 단위 atm·L/(mol·K)가 약분되는지 확인해요. 전해질은 이온으로 나뉜 <b>입자의 총 농도</b>로 세어요.</p>',
      features: ['calc'],
      setup() { S.lock = false; setMode('calc'); },
      recap: 'π = CRT 로 삼투압을 계산하고, π를 재면 C와 몰질량을 구할 수 있어요. 전해질은 이온 입자의 총 농도를 써요.',
      summary: '<ul><li>0.10 M 설탕물, 25 °C: π = 0.10 × 0.082 × 298 = <b>2.44 atm</b> ≈ 물기둥 약 25 m. 포도당 18 g/L 와 설탕 34.2 g/L(모두 0.10 M)의 π는 같아요.</li><li>단백질 1.0 g / 100 mL, 27 °C, π = 0.0123 atm → C = 0.0123 / (0.082 × 300) = 5.0 × 10⁻⁴ M → n = 5.0 × 10⁻⁵ mol → M = <b>2.0 × 10⁴ g/mol</b>. (삼투압은 아주 큰 분자의 몰질량을 구하는 데 유리해요.)</li><li>링거액 0.9 % NaCl(0.154 M)은 입자 총 농도 0.308 M → 37 °C(310 K)에서 π = <b>7.8 atm</b> ≈ 혈액의 삼투압.</li><li>NaCl 0.10 M 은 입자 0.20 M 이라 같은 농도의 설탕 용액보다 삼투압이 약 2배예요.</li></ul>',
      missions: [
        {
          title: '삼투압과 몰질량 계산',
          goal: '🧮 세 문제를 풀어 답을 적어요. ① 설탕물의 π, ② 단백질의 몰질량, ③ 링거액의 π.',
          hint: '① 0.10 × 0.082 × 298. ② 먼저 C = π / RT, 그다음 n = C × 0.100 L, M = 1.0 g / n. ③ NaCl 0.154 M 은 입자 총 농도가 0.308 M 이고 T = 37 + 273 = 310 K.',
          setup() { S.lock = true; S.calc.q = ['', '', '']; S.calc.ok = [false, false, false]; setMode('calc'); },
          check: () => S.calc.ok[0] && S.calc.ok[1] && S.calc.ok[2], hold: 0.4,
          status: () => '① ' + mark(S.calc.ok[0]) + ' &nbsp; ② ' + mark(S.calc.ok[1]) + ' &nbsp; ③ ' + mark(S.calc.ok[2]),
          explain: '① π = 0.10 × 0.082 × 298 = <b>2.44 atm</b>. ② C = 0.0123 / (0.082 × 300) = 5.0 × 10⁻⁴ M, n = 5.0 × 10⁻⁵ mol, M = 1.0 / 5.0 × 10⁻⁵ = <b>2.0 × 10⁴ g/mol</b>. ③ π = 0.308 × 0.082 × 310 = <b>7.8 atm</b>.',
        },
        {
          type: 'quiz', title: '단위 점검',
          goal: 'π = C · R · T 에서 π는 atm, C는 mol/L, T는 K 일 때 R의 단위는?',
          setup() { S.lock = true; setMode('calc'); },
          choices: ['atm·L/(mol·K)', 'atm·mol/(L·K)', 'J/(mol·K)', 'L/(atm·mol·K)'],
          answer: 0,
          feedback: ['', 'atm·mol/(L·K)를 쓰면 π의 단위가 atm·mol²/L²이 되어 맞지 않아요.', '8.314 J/(mol·K)는 에너지 단위를 쓸 때의 R이에요. 압력 atm, 부피 L을 쓰면 0.082 atm·L/(mol·K)예요.', 'atm이 분모에 있으면 π의 단위가 맞지 않아요.'],
          explain: 'C(mol/L) × R × T(K) 가 atm이 되려면 R의 단위가 <b>atm·L/(mol·K)</b>여야 해요. mol, L, K가 약분되어 atm만 남아요.',
        },
        {
          type: 'quiz', title: '같은 몰 농도에서의 비교',
          goal: '같은 온도에서 NaCl 0.10 M 용액과 설탕 0.10 M 용액 중 삼투압이 더 큰 쪽은?',
          setup() { S.lock = true; setMode('calc'); },
          choices: ['NaCl 용액. 이온으로 나뉘어 입자의 총 농도가 0.20 M 이기 때문이에요', '설탕 용액. 분자가 더 크기 때문이에요', '같아요. 몰 농도가 같기 때문이에요', '알 수 없어요'],
          answer: 0,
          feedback: ['', '분자의 크기가 아니라 용액 속 용질 입자의 총 농도가 중요해요.', '설탕(비전해질)끼리는 같지만, NaCl은 Na⁺과 Cl⁻으로 나뉘어 입자가 2배가 돼요.', '입자의 총 농도를 비교하면 알 수 있어요.'],
          explain: '삼투압은 용질 <b>입자의 총 농도</b>로 정해져요. NaCl 0.10 M은 Na⁺ 0.10 M + Cl⁻ 0.10 M = <b>0.20 M</b> 이어서 설탕 0.10 M 의 약 2배예요.',
        },
      ],
    },
    {
      title: '역삼투: 바닷물을 맑게 해요', short: '역삼투', icon: '💧', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 용액 쪽에 삼투압보다 큰 압력을 가하면 물이 반대로 이동한다는 것을 보았어요. 이 <b>역삼투</b>로 바닷물에서 맑은 물을 얻을 수 있어요.</div>' +
        '<p>왼쪽은 바닷물(이온 합계 약 1.1 M), 오른쪽은 담수예요. 바닷물의 삼투압은 25 °C에서 π = 1.1 × 0.082 × 298 ≈ <b>27 atm</b>이에요. 바닷물 쪽 압력을 바꿔 담수가 만들어지는 때를 찾아요.</p>',
      features: ['ro'],
      setup() { S.lock = false; S.sub.ro = 'rig'; setMode('ro'); },
      recap: '바닷물에 삼투압(약 27 atm)보다 큰 압력을 가하면 물만 막을 지나 담수가 만들어지고, 소금 이온은 남아 농축돼요. 이것이 역삼투예요.',
      summary: '<ul><li>바닷물 π ≈ 1.1 × 0.082 × 298 ≈ <b>27 atm</b>. 역삼투는 이보다 <b>큰 압력</b>(실제 설비는 약 55~70 atm)이 필요해요.</li><li>P < π 이면 오히려 담수가 바닷물 쪽으로 이동해요(삼투). P > π 이면 담수가 만들어지고 소금 이온은 막 앞에 남아 농축돼요.</li><li>쓰임: 해수 담수화, 가정용 정수기(역삼투막). 링거액은 혈액과 삼투압이 같은 0.9 % NaCl 용액으로 설계해요.</li></ul>',
      missions: [
        {
          title: '담수 생산 시작하기',
          goal: '바닷물 쪽 압력을 삼투압(약 27 atm)보다 크게 올려서 <b>담수를 5 mL 이상</b> 만들어요.',
          hint: '압력 슬라이더를 27 atm보다 훨씬 크게(예: 40 atm) 올리고 잠시 기다려요. P − π 가 + 이면 담수가 만들어져요.',
          setup() { S.lock = true; S.sub.ro = 'rig'; S.ro.P = 0; S.ro.V = 20; S.ro.prod = 0; S.ro.rate = 0; roInit(); setMode('ro'); },
          check: () => S.ro.prod >= 5 && S.ro.P > PI_SEA, hold: 0.4,
          status: () => 'P ' + Math.round(S.ro.P) + ' atm (π ≈ 27) ' + mark(S.ro.P > PI_SEA) + ' &nbsp; 담수 ' + Math.round(S.ro.prod) + ' / 5 mL ' + mark(S.ro.prod >= 5),
          explain: '압력이 삼투압(약 26.9 atm)보다 커지면 물이 바닷물에서 담수 쪽으로 이동해 담수가 만들어져요. 소금 이온은 반투막을 지나지 못해 바닷물 쪽에 남아 <b>더 진해져요</b>.',
        },
        {
          title: '사례 연결하기', manual: true,
          goal: '역삼투와 삼투압이 쓰이는 사례 4가지를 알맞은 설명과 이어 「확인하기」를 눌러요.',
          hint: '해수 담수화는 바닷물의 삼투압보다 큰 압력이 필요해요. 링거액은 혈액과 삼투압이 같아야 해요. 정수기는 수돗물을 걸러요.',
          setup() { S.lock = true; S.sub.ro = 'match'; mReset(S.mt.ro); setMode('ro'); },
          check: () => mCheck(S.mt.ro),
          explain: '<b>해수 담수화 장치</b>: 바닷물의 삼투압(약 27 atm)보다 큰 압력으로 담수를 얻어요. <b>정수기</b>: 역삼투막으로 이온과 불순물을 걸러요. <b>링거액</b>: 혈액과 삼투압이 같은 0.9 % NaCl. <b>실제 설비</b>는 약 55~70 atm 을 써요.',
        },
        {
          type: 'quiz', title: '압력이 삼투압보다 작으면?',
          goal: '바닷물 쪽에 가한 압력이 바닷물의 삼투압보다 작으면 어떻게 될까요?',
          setup() { S.lock = true; S.sub.ro = 'rig'; setMode('ro'); },
          choices: ['담수가 바닷물 쪽으로 이동해요(삼투 방향)', '바닷물이 담수 쪽으로 이동해요', '소금 이온이 막을 통과해 담수가 짜게 돼요', '아무 일도 일어나지 않아요'],
          answer: 0,
          feedback: ['', '바닷물이 담수 쪽으로 가려면 P가 π보다 커야 해요.', '반투막은 압력과 상관없이 소금 이온을 통과시키지 않아요.', 'P < π 이면 물이 삼투 방향으로 이동해요. 이동이 멈추는 때는 P = π 일 때뿐이에요.'],
          explain: 'P < π 이면 삼투압이 가한 압력을 이겨서 물이 <b>담수 → 바닷물</b> 방향(삼투)으로 이동해요. 담수를 얻으려면 P > π 여야 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-osmotic-pressure', mount: '#game', badge: '삼투압 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { obs: '📏 피스톤과 압력계', crt: '🔎 π–C · π–T 그래프', calc: '🧮 계산 연습', ro: '💧 해수 담수화 장치' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  roInit();
  setMode('obs');
  function stepAll1(dt) {
    S.clk += dt;
    stepObs(dt); stepCrt(dt); stepRo(dt);
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
    if (S.mode === 'obs') { drawObs(t); drawObsInfo(t); }
    else if (S.mode === 'crt') { if (S.sub.crt === 'match') { drawMatch(S.mt.crt); drawCrtMatchInfo(); } else { drawCrtGraph(t, S.sub.crt); drawCrtInfo(t); } }
    else if (S.mode === 'calc') { drawCalc(t); drawCalcInfo(t); }
    else if (S.sub.ro === 'match') { drawMatch(S.mt.ro); drawRoInfo(t); }
    else { drawRo(t); drawRoInfo(t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });
  function drawCrtMatchInfo() {
    const R = RC.R;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📌 두 식을 나란히', 14.5, INK, 'left', 800);
    let y = R.y + 58;
    T(R.x + 14, y, '이상 기체', 13, MUTED, 'left', 800); y += 28; T(R.x + 14, y, 'P = (n/V) · R · T', 17, '#1d4f8a', 'left', 800); y += 34;
    T(R.x + 14, y, '묽은 용액의 삼투압', 13, MUTED, 'left', 800); y += 28; T(R.x + 14, y, 'π = C · R · T', 17, '#7a1f4a', 'left', 800); y += 34;
    textBlock(R.x + 14, y, R.w - 28, '녹아 있는 용질 입자가 기체 입자처럼 반투막에 압력을 만든다고 볼 수 있어요. 그래서 식이 같은 꼴이에요.', 13, INK, 19, 700);
  }

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, PI_SEA, piOf, setMode, setSub, setObsC, setObsP, setCi, setT, setRoP, recCrt, crtDone, cN, tN, obsPi, obsP, crtPi, mGeo, mHit, mLink, mCheck, mReset, mLinked, matchOf, CQ, OG, roInit,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
