/* =========================================================
   물질과 에너지 Ⅳ. 반응 속도 - 촉매와 반응 속도 [12물에04-04]
   ① 실험: 촉매 실험 (H₂O₂ 분해, 기체 부피 센서, MnO₂ 질량 확인)
   ② 모형: 에너지 도표 (Eₐ 가 낮아짐, ΔH 는 그대로) + 평형 도달 시간
   ③ 분석: 효소 (기질 특이성, 최적 온도, 변성)
   ④ 적용: 환경과 촉매 + 농도·온도·촉매 정리표
   촉매의 반응 메커니즘(중간체), 균일/불균일 촉매 분류, 미하엘리스–멘텐 식은 다루지 않아요.
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
  const MODE_LABEL = { exp: '🧪 H₂O₂ 분해에 촉매를 넣어요', en: '⛰ 촉매는 Eₐ 를 낮춰요', eq: '⚖ 평형에 빨리 도달해요', enz: '🧬 효소는 생체 촉매예요', env: '🌍 환경 문제를 촉매로 풀어요', tbl: '📋 속도를 바꾸는 세 가지 요인' };
  const thou = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const shuffle = (n, seed) => { const a = Array.from({ length: n }, (_, i) => i); let s = seed; for (let i = n - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  /* ---------- 공통 모양: 에너지 도표 곡선, 에너지 분포 ---------- */
  function mkCurve(dh, ea) {                                         // 꼭대기 높이가 정확히 Eₐ 가 되도록 맞춘 반응 경로 곡선 (반응물 수준 = 0)
    const N = 160, bump = (s) => Math.pow(Math.sin(Math.PI * s), 2), U = (s, B) => dh * sm(s) + B * bump(s);
    const pk = (B) => { let m = -1e9; for (let i = 0; i <= N; i++) m = Math.max(m, U(i / N, B)); return m; };
    let lo = 0, hi = 800; for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (pk(mid) < ea) lo = mid; else hi = mid; }
    const B = (lo + hi) / 2, arr = []; let sp = 0, mp = -1e9;
    for (let i = 0; i <= N; i++) { const v = U(i / N, B); arr.push(v); if (v > mp) { mp = v; sp = i / N; } }
    return { N, u: arr, sp };
  }
  const fE = (e, kt) => Math.sqrt(e) * Math.exp(-e / kt);
  const normOf = (kt) => Math.sqrt(Math.PI) / 2 * Math.pow(kt, 1.5);
  function fracAbove(ea, kt) { let a = 0, b = 0; for (let e = 0.005; e < 40; e += 0.01) { const v = fE(e, kt); b += v; if (e >= ea) a += v; } return a / b; }
  const EA_REF = (function () { let lo = 1, hi = 12; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fracAbove(m, 1) > 0.03) lo = m; else hi = m; } return (lo + hi) / 2; })();   // 촉매 없음(75 kJ)일 때 3 %
  const eaDraw = (ea) => EA_REF * (0.58 + 0.42 * ea / 75);                 // 모식도: Eₐ 가 낮아지면 에너지 분포의 문턱도 낮아져요
  const pctAbove = (ea) => Math.round(fracAbove(eaDraw(ea), 1) * 100);

  /* ---------- 상태 ---------- */
  const VMAX = 108, TEXP = 30, RUNX = 6;
  const CATS = [
    { name: '촉매 없음', short: '없음', v30: 0, col: '#94a3b8' },
    { name: 'KI 용액', short: 'KI', v30: 12, col: '#d97706' },
    { name: 'MnO₂ 0.50 g', short: 'MnO₂', v30: 25, col: '#334155' },
    { name: '간 조각 (카탈레이스)', short: '간 조각', v30: 45, col: '#e11d48' },
  ];
  CATS.forEach((c) => { c.k = c.v30 > 0 ? -Math.log(1 - c.v30 / VMAX) / TEXP : 0; });
  const volAt = (i, t) => VMAX * (1 - Math.exp(-CATS[i].k * t));
  const S = {
    mode: 'exp', fade: 0, lock: false, t: 0,
    ex: { sel: 0, ph: 'idle', tm: 0, done: [false, false, false, false], filt: false, filtP: 0, in: '', ok: false, pulse: 0 },
    en: { cat: false, eaD: 75, in: ['', '', ''], ok: [false, false, false], seenOn: false, seenOff: true, glow: 0, bar: 3 },
    eq: { mode: 0, ph: 'idle', tc: 0, seen: [false, false], both: false },
    ez: { sub: -1, ph: 'idle', tm: 0, x: 0, y: 0, T: 37, maxT: 37, latched: false, fit: false, seen37: false, in: '', ok: false, cooled: false, drag: -1, u: 0, tray: [0, 1, 2], prods: [], msg: '' },
    ev: { sel: 0, meth: [-1, -1, -1, -1, -1], lim: [-1, -1, -1, -1, -1], wrong: [false, false, false, false, false], parts: [], spawnT: 0, outH: 0, outS: 0, pulse: 1 },
    tb: { sel: 0, pick: [-1, -1, -1], wrong: [false, false, false] },
  };
  let game = null;

  /* ================= ① 촉매 실험: H₂O₂ 분해 + 기체 부피 센서 ================= */
  const EX = () => S.ex;
  const exVol = () => { const E = EX(); return E.ph === 'idle' ? 0 : (E.ph === 'done' ? CATS[E.sel].v30 : volAt(E.sel, E.tm)); };
  const exRate = () => { const E = EX(); return E.ph === 'run' ? VMAX * CATS[E.sel].k * Math.exp(-CATS[E.sel].k * E.tm) : 0; };
  function exSet(i) { const E = EX(); if (E.ph === 'run') return; E.sel = i; E.ph = E.done[i] ? 'done' : 'idle'; E.tm = E.done[i] ? TEXP : 0; Sound.tick(); updateCtl(); }
  function exRun() { const E = EX(); if (E.ph === 'run') return; E.ph = 'run'; E.tm = 0; Sound.click(); updateCtl(); }
  function stepEx(dt) {
    const E = EX();
    if (E.ph === 'run') {
      E.tm = Math.min(TEXP, E.tm + dt * RUNX);
      if (!RM && Math.random() < exRate() * dt * 3.2) parts.emit({ x: RC.L.x + 100 + rnd(-30, 30), y: RC.L.y + 238 - 40, vx: rnd(-6, 6), vy: -rnd(36, 60), life: 0.9, size: rnd(2.4, 4), color: 'rgba(255,255,255,.95)', shape: 'bubble', fade: true });
      if (E.tm >= TEXP) { E.ph = 'done'; E.done[E.sel] = true; Sound.success(); E.pulse = 1; updateCtl(); }
    }
    E.pulse = Math.max(0, E.pulse - dt * 1.5);
    E.filtP = ap2(E.filtP, E.filt ? 1 : 0, dt, 1.3); if (Math.abs(E.filtP - (E.filt ? 1 : 0)) < 0.004) E.filtP = E.filt ? 1 : 0;
    const was = E.ok; exCheck(); if (E.ok !== was) { if (E.ok) Sound.success(); updateCtl(); }
  }
  const exDone = () => EX().done.every(Boolean);
  function exFilter() { const E = EX(); if (!E.done[2] || E.filt) return; E.filt = true; Sound.click(); updateCtl(); }
  function exCheck() { const E = EX(); E.ok = E.filt && E.filtP >= 1 && E.in !== '' && near(parseNum(E.in), 0.5, 0.006); }
  const GR = () => { const R = RC.R, big = R.h > 440, y0 = R.y + (big ? 190 : 172); return G({ x0: R.x + 50, y0, w: R.w - 70, h: big ? 220 : 166, xmax: 30, ymax: 50, xs: 10, ys: 10, yfmt: (v) => f0(v), xfmt: (v) => f0(v), xlab: '시간 (s) →', ylab: '' }); };
  const DIM = '#cbd5e1';
  function drawFlask(cx, by, E) {
    const i = E.sel, liq = i === 1 && E.ph !== 'idle' ? '#f1e3a8' : '#d7ecff';
    D.flask(cx, by, 120, 128, { level: 0.42, liquid: liq, t: S.t });
    // 촉매 (소모되지 않아 처음과 같은 개수·크기로 그대로 있어요)
    if (i === 2) { for (let k = 0; k < 26; k++) { const a = hashN(k, 1), b = hashN(k, 2); D.sphere(cx - 34 + a * 68, by - 8 - b * 7, 3.2, '#1f2937', { gloss: false }); } }
    if (i === 3) { ctx.save(); ctx.translate(cx - 6, by - 13); ctx.rotate(-0.15); D.roundRect(-20, -9, 40, 18, 8); ctx.fillStyle = '#b4233f'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; D.roundRect(-14, -6, 20, 5, 3); ctx.fill(); ctx.restore(); }
    if (i === 1) { for (let k = 0; k < 5; k++) D.sphere(cx - 24 + k * 12, by - 16 - (k % 2) * 6, 2.6, '#c98a1a', { gloss: false }); }
  }
  const hashN = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  function drawSyringe(x0, yc, V) {
    const len = 240, ppm = len / 60, xp = x0 + clamp(V, 0, 60) * ppm;
    D.roundRect(x0, yc - 17, len + 8, 34, 6); ctx.fillStyle = 'rgba(235,243,252,.9)'; ctx.fill();
    if (V > 0.02) { D.roundRect(x0, yc - 15, xp - x0, 30, 5); ctx.fillStyle = 'rgba(180,225,200,.55)'; ctx.fill(); }
    D.roundRect(x0, yc - 17, len + 8, 34, 6); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.4; ctx.stroke();
    for (let m = 0; m <= 60; m += 10) { const x = x0 + m * ppm; ctx.strokeStyle = '#6b7894'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, yc + 17); ctx.lineTo(x, yc + 24); ctx.stroke(); T(x, yc + 38, String(m), 12.5, MUTED, 'center', 700); }
    ctx.fillStyle = '#6b7894'; ctx.fillRect(xp - 3, yc - 19, 6, 38); ctx.fillRect(xp, yc - 3, 34, 6); ctx.fillRect(xp + 32, yc - 12, 5, 24);
  }
  function drawExp(t) {
    const L = RC.L, E = EX(), c = CATS[E.sel], V = exVol(), cx = L.x + 100, by = L.y + 238;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 2H₂O₂ → 2H₂O + O₂ (3 % H₂O₂ 10 mL)', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '발생한 O₂ 부피를 기체 부피 센서(주사기)로 재요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 연결관
    ctx.save(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(cx, by - 128); ctx.lineTo(cx, L.y + 84); ctx.lineTo(L.x + 188, L.y + 84); ctx.stroke(); ctx.restore();
    drawSyringe(L.x + 188, L.y + 84, V);
    T(L.x + 188 + 120, L.y + 146, '기체 부피 센서 (mL)', 12.5, MUTED, 'center', 800);
    drawFlask(cx, by, E);
    T(cx, by + 20, '촉매: ' + c.name, 13, INK, 'center', 800);
    // 상태 상자
    const ty = by + 30, th = L.y + L.h - ty - 12;
    box(L.x + 12, ty, L.w - 24, th, '#f6f7fb', '#dbe3f3', 1.5, 12);
    D.roundRect(L.x + 24, ty + 12, 120, 50, 12); ctx.fillStyle = '#1f2937'; ctx.fill();
    T(L.x + 84, ty + 45, f0(V) + ' mL', 26, '#a7f3d0', 'center', 800);
    T(L.x + 84, ty + 80, E.ph === 'run' ? 'O₂ ' + f0(E.tm) + ' s (' + RUNX + '배속)' : E.ph === 'done' ? '30 s 동안 O₂' : '반응 시작 전', 12.5, MUTED, 'center', 800);
    T(L.x + 162, ty + 28, c.name, 14.5, c.col === '#94a3b8' ? INK : c.col, 'left', 800);
    textBlock(L.x + 162, ty + 48, L.w - 190, E.ph === 'done' ? (E.sel === 0 ? '30 s 동안 거의 변화가 없어요 (0 mL).' : '30 s 동안 O₂ ' + c.v30 + ' mL 가 발생했어요.') : '30 s 동안 발생하는 O₂ 부피를 재요. 완전히 분해되면 O₂ 약 ' + VMAX + ' mL 예요.', 12.5, E.ph === 'done' ? '#0f6b3c' : MUTED, 17, 800);
    // 여과와 저울 (MnO₂ 를 쓴 뒤)
    if (E.done[2]) {
      const bx = L.x + 24, bY = ty + 108;
      T(bx, bY - 6, '반응 뒤 MnO₂ 를 걸러 질량을 재요', 12.5, INK, 'left', 800);
      // 깔때기와 거름종이
      const fx = bx + 46, fy = bY + 8;
      ctx.save(); ctx.fillStyle = 'rgba(210,225,245,.7)'; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(fx - 34, fy); ctx.lineTo(fx + 34, fy); ctx.lineTo(fx + 5, fy + 34); ctx.lineTo(fx - 5, fy + 34); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      const ff = sm(E.filtP);
      for (let k = 0; k < 26; k++) { const a = hashN(k, 1), b = hashN(k, 2); const sx = fx - 34 + a * 68, sy = fy - 26 + (1 - ff) * 0, yy = fy - 24 + (1 - ff) * 0; const tx = fx - 14 + a * 28, ty2 = fy + 12 - b * 9; D.sphere(sx + (tx - sx) * ff, (fy - 62 + b * 20) + ((ty2 - (fy - 62 + b * 20)) * ff), 2.8, '#1f2937', { gloss: false }); }
      // 전자저울
      const sx2 = bx + 150, sy2 = bY - 2;
      D.roundRect(sx2, sy2 + 14, 120, 40, 8); ctx.fillStyle = '#cfd6e4'; ctx.fill(); D.roundRect(sx2 + 12, sy2 + 22, 96, 24, 5); ctx.fillStyle = '#1f2937'; ctx.fill();
      T(sx2 + 60, sy2 + 41, f2(0.5 * ff) + ' g', 17, '#a7f3d0', 'center', 800);
      D.roundRect(sx2 + 22, sy2 + 6, 76, 8, 3); ctx.fillStyle = '#9aa6bb'; ctx.fill();
      T(sx2 + 130, sy2 + 28, '처음 0.50 g', 12.5, MUTED, 'left', 800); T(sx2 + 130, sy2 + 46, '→ 반응 뒤 ' + (ff >= 1 ? '0.50 g' : '재는 중…'), 12.5, ff >= 1 ? '#0f6b3c' : MUTED, 'left', 800);
    }
  }
  function drawExpInfo(t) {
    const R = RC.R, E = EX(), g = GR(), big = R.h > 440, rh = big ? 30 : 25, y0 = R.y + 34;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 30 s 동안 발생한 O₂', 14, INK, 'left', 800);
    CATS.forEach((c, i) => {
      const y = y0 + rh * i, sel = i === E.sel;
      D.roundRect(R.x + 10, y, R.w - 20, rh - 3, 8); ctx.fillStyle = sel ? 'rgba(124,58,237,.07)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#e1dcf3'; ctx.lineWidth = sel ? 2 : 1.2; ctx.stroke();
      ctx.fillStyle = c.col; ctx.fillRect(R.x + 16, y + 6, 5, rh - 15);
      T(R.x + 28, y + rh / 2 + 3, c.short, 13, INK, 'left', 800);
      T(R.x + R.w - 18, y + rh / 2 + 3, E.done[i] ? c.v30 + ' mL' : '?', 13.5, E.done[i] ? '#0f6b3c' : '#aab3c4', 'right', 800);
    });
    T(R.x + 14, g.y0 - 24, '그래프: O₂ 부피 – 시간', 12.5, INK, 'left', 800);
    T(R.x + R.w - 14, g.y0 - 24, 'mL', 12.5, MUTED, 'right', 800);
    axesG(g);
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.y0 - 3, g.w, g.h + 6); ctx.clip();
    CATS.forEach((c, i) => {
      const run = E.ph === 'run' && E.sel === i, full = E.done[i], te = run ? E.tm : full ? TEXP : 0;
      if (te <= 0) return;
      ctx.strokeStyle = c.col; ctx.lineWidth = i === E.sel ? 3.6 : 2.6; ctx.globalAlpha = i === E.sel ? 1 : 0.8; ctx.beginPath();
      for (let s = 0; s <= te + 1e-6; s += 0.25) { const x = g.X(s), y = g.Y(volAt(i, s)); s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.globalAlpha = 1;
    });
    ctx.restore();
    CATS.forEach((c, i) => { if (E.done[i] && i > 0) T(g.x0 + g.w - 4, g.Y(c.v30) - 6, c.v30 + '', 12.5, c.col, 'right', 800, HALO); });
    if (E.done[0]) T(g.x0 + g.w - 4, g.Y(0) - 6, '0', 12.5, MUTED, 'right', 800, HALO);
    if (E.ph === 'run') { const c = CATS[E.sel]; D.sphere(g.X(E.tm), g.Y(volAt(E.sel, E.tm)), 5.4, c.col, { gloss: true }); }
    T(g.x0 + 6, g.y0 + 14, '↑ 완전 분해: 약 ' + VMAX + ' mL (그래프 위)', 11.5, MUTED, 'left', 700);
  }

  /* ================= ② 에너지 도표: 촉매를 켜고 끄기 ================= */
  const EN = () => S.en;
  const ENS = { dh: -196, e0: 75, e1: 50 };
  function enSet(on) { const E = EN(); if (E.cat !== on) { E.cat = on; E.glow = 1; Sound.tick(); } if (on) E.seenOn = true; enCheck(); updateCtl(); }
  function enCheck() {
    const E = EN(), a = E.ok.slice();
    E.ok[0] = E.in[0] !== '' && near(parseNum(E.in[0]), ENS.e0, 3);
    E.ok[1] = E.in[1] !== '' && E.seenOn && near(parseNum(E.in[1]), ENS.e1, 3);
    E.ok[2] = E.in[2] !== '' && E.seenOn && near(parseNum(E.in[2]), ENS.dh, 8);
    E.ok.forEach((o, i) => { if (o && !a[i]) Sound.success(); });
  }
  const enReadDone = () => EN().ok[0] && EN().ok[1] && EN().ok[2];
  function stepEn(dt) {
    const E = EN(), tg = E.cat ? ENS.e1 : ENS.e0;
    E.eaD = ap2(E.eaD, tg, dt, 5); if (Math.abs(E.eaD - tg) < 0.05) E.eaD = tg;
    E.glow = Math.max(0, E.glow - dt * 1.2);
    E.bar = ap2(E.bar, fracAbove(eaDraw(E.eaD), 1) * 100, dt, 8);
  }
  const ENG = () => { const L = RC.L; return { x: L.x + 54, y: L.y + 72, w: L.w - 74, h: 238 }; };
  const KMIN = -230, KMAX = 100, eY = (g, kj) => g.y + (KMAX - kj) / (KMAX - KMIN) * g.h, eXs = (g, s) => g.x + 70 + s * (g.w - 140);
  function drawEn(t) {
    const L = RC.L, E = EN(), g = ENG(), cv = mkCurve(ENS.dh, E.eaD), cv0 = mkCurve(ENS.dh, ENS.e0);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '⛰ 2H₂O₂ → 2H₂O + O₂ 의 에너지 도표', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '반응물 수준 = 0 kJ · 촉매를 켜고 꺼서 비교해요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x, g.y, g.w, g.h, 6); ctx.fill();
    for (let k = -230; k <= 100; k += 10) { const major = k % 50 === 0; ctx.strokeStyle = k === 0 ? '#c3cce0' : major ? '#e3e8f3' : '#f1f3f9'; ctx.lineWidth = k === 0 ? 1.4 : 1; ctx.beginPath(); ctx.moveTo(g.x, eY(g, k)); ctx.lineTo(g.x + g.w, eY(g, k)); ctx.stroke(); if (major && k >= -200) T(g.x - 6, eY(g, k) + 4, String(k), 12, MUTED, 'right', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h); ctx.stroke();
    T(g.x - 42, g.y - 6, '에너지 (kJ)', 12.5, MUTED, 'left', 800); T(g.x + g.w, g.y + g.h + 15, '반응 경로 →', 12.5, MUTED, 'right', 800);
    const x0 = eXs(g, 0), x1 = eXs(g, 1), yR = eY(g, 0), yP = eY(g, ENS.dh);
    ctx.save(); ctx.strokeStyle = '#4b5d7e'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.x + 8, yR); ctx.lineTo(x0, yR); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, yP); ctx.lineTo(g.x + g.w - 8, yP); ctx.stroke(); ctx.restore();
    T(g.x + 40, yR - 9, '반응물 2H₂O₂', 12.5, MUTED, 'center', 800, HALO); T(g.x + g.w - 56, yP + 19, '생성물 2H₂O + O₂', 12.5, MUTED, 'center', 800, HALO);
    // 촉매 없는 경로 (기준): 촉매를 켰을 때 점선으로 남겨요
    if (E.cat || E.eaD < 74.9) { ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 5]); ctx.beginPath(); for (let k = 0; k <= cv0.N; k++) { const x = eXs(g, k / cv0.N), y = eY(g, cv0.u[k]); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore(); T(eXs(g, cv0.sp) + 6, eY(g, ENS.e0) - 6, '촉매 없음', 12, '#64748b', 'left', 800, HALO); }
    ctx.save(); ctx.strokeStyle = E.cat ? TEAL : '#7c3aed'; ctx.lineWidth = 4.2; ctx.lineJoin = 'round'; ctx.beginPath(); for (let k = 0; k <= cv.N; k++) { const x = eXs(g, k / cv.N), y = eY(g, cv.u[k]); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
    const px = eXs(g, cv.sp), yT = eY(g, E.eaD);
    if (E.glow > 0) D.glow(px, yT, 40 + 18 * E.glow, '#ffd23f', 0.55 * E.glow);
    const ok = E.cat ? E.ok[1] : E.ok[0], dhOk = E.ok[2];
    D.arrow(px - 30, yR, px - 30, yT + 2, { color: PUR, width: 3.4, head: 10 });
    D.label(px - 36, yT - 14, 'Eₐ(정) = ' + (ok ? f0(E.eaD) + ' kJ' : '?'), { size: 12.5, bg: PUR, align: 'right' });
    const hx = g.x + 22; D.arrow(hx, yR + 3, hx, yP - 2, { color: '#e0692f', width: 3.4, head: 10 });
    D.label(hx + 10, (yR + yP) / 2, 'ΔH = ' + (dhOk ? ENS.dh + ' kJ' : '?'), { size: 12.5, bg: '#e0692f', align: 'left' });
    const axR = g.x + g.w - 14; dash(px, yT, axR, yT, 'rgba(100,116,139,.55)', 1.4);
    D.arrow(axR, yP, axR, yT + 2, { color: TEAL, width: 3.2, head: 10 });
    D.label(axR - 6, (yP + yT) / 2 + 20, 'Eₐ(역) = ' + (ok && dhOk ? f0(E.eaD - ENS.dh) + ' kJ' : '?'), { size: 12.5, bg: TEAL, align: 'right' });
    // 에너지 분포 (같은 온도): Eₐ 이상 비율
    const my = g.y + g.h + 26, mh = L.y + L.h - my - 10;
    box(L.x + 12, my, L.w - 24, mh, '#f6f7fb', '#dbe3f3', 1.5, 12);
    T(L.x + 24, my + 20, '같은 온도에서 에너지 분포 (모식도)', 13, INK, 'left', 800);
    const pg = G({ x0: L.x + 30, y0: my + 30, w: L.w - 64 - 130, h: mh - 44, xmax: 11, ymax: fE(0.5, 1) / normOf(1) * 1.12, xs: 99, ys: 99 });
    ctx.fillStyle = '#fff'; D.roundRect(pg.x0, pg.y0, pg.w, pg.h, 6); ctx.fill();
    const eaX = eaDraw(E.eaD), Y = (e) => pg.Y(fE(e, 1) / normOf(1));
    ctx.beginPath(); ctx.moveTo(pg.X(eaX), pg.Y(0)); for (let e = eaX; e <= 11.01; e += 0.1) ctx.lineTo(pg.X(e), Y(e)); ctx.lineTo(pg.X(11), pg.Y(0)); ctx.closePath(); ctx.fillStyle = 'rgba(226,70,75,.45)'; ctx.fill();
    ctx.strokeStyle = BLU; ctx.lineWidth = 3; ctx.beginPath(); for (let e = 0.02; e <= 11; e += 0.1) { const x = pg.X(e), y = Y(e); e < 0.03 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    ctx.strokeStyle = BAD; ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(pg.X(eaX), pg.y0); ctx.lineTo(pg.X(eaX), pg.y0 + pg.h); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pg.x0, pg.y0 + pg.h); ctx.lineTo(pg.x0 + pg.w, pg.y0 + pg.h); ctx.stroke();
    T(pg.X(eaX) + 4, pg.y0 + 13, 'Eₐ', 12.5, BAD, 'left', 800, HALO); T(pg.x0 + pg.w, pg.y0 + pg.h + 15, '분자의 운동 에너지 →', 12, MUTED, 'right', 800);
    const pc = Math.round(E.bar);
    T(L.x + L.w - 24, my + 52, 'Eₐ 이상', 12.5, MUTED, 'right', 800); T(L.x + L.w - 24, my + 82, pc + ' %', 26, BAD, 'right', 800);
    T(L.x + L.w - 24, my + 104, E.cat ? '촉매 있음 (Eₐ ' + f0(E.eaD) + ')' : '촉매 없음 (Eₐ ' + f0(E.eaD) + ')', 12, INK, 'right', 800);
  }
  const tgPct = () => pctAbove(ENS.e0) + ' → ' + pctAbove(ENS.e1);
  function drawEnInfo(t) {
    const R = RC.R, E = EN();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 도표에서 읽은 값 (kJ)', 14, INK, 'left', 800);
    const rh = PHONE ? 34 : 40, y0 = R.y + 38;
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 4, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    [['', 0.2], ['Eₐ(정)', 0.42], ['ΔH', 0.62], ['Eₐ(역)', 0.84]].forEach(([s, f]) => T(R.x + R.w * f, y0 + rh / 2 + 1, s, 12.5, INK, 'center', 800));
    [['촉매 없음', 0, ENS.e0], ['촉매 있음', 1, ENS.e1]].forEach(([nm, i, ea]) => {
      const y = y0 + rh * (i + 1), sel = (i === 1) === E.cat, eOk = E.ok[i], dOk = E.ok[2];
      D.roundRect(R.x + 10, y, R.w - 20, rh - 4, 8); ctx.fillStyle = sel ? 'rgba(124,58,237,.07)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#e1dcf3'; ctx.lineWidth = sel ? 2 : 1.2; ctx.stroke();
      T(R.x + R.w * 0.2, y + rh / 2 + 1, nm.slice(0, 5), 12, i ? TEAL : INK, 'center', 800);
      [[eOk, ea], [dOk, ENS.dh], [eOk && dOk, ea - ENS.dh]].forEach(([o, v], k) => T(R.x + R.w * [0.42, 0.62, 0.84][k], y + rh / 2 + 4, o ? String(v) : '?', 13.5, o ? '#0f6b3c' : '#aab3c4', 'center', 800));
    });
    const y1 = y0 + rh * 3 + 6, hh = R.y + R.h - y1 - 10;
    box(R.x + 10, y1, R.w - 20, hh, '#f6f7fb', '#dbe3f3', 1.4, 10);
    T(R.x + 20, y1 + 22, '💡 촉매가 하는 일', 13, PUR, 'left', 800);
    let ty = y1 + 42;
    const both = E.ok[0] && E.ok[1] && E.ok[2];
    ['촉매는 새 반응 경로를 열어 Eₐ 를 낮춰요.', both ? 'Eₐ(정) 75 → 50, Eₐ(역) 271 → 246: 정반응과 역반응이 같은 양(25 kJ)만큼 낮아져요.' : '정반응과 역반응의 Eₐ 가 함께 낮아져요.', 'ΔH 와 반응물·생성물의 에너지는 변하지 않아요. 생성되는 양과 평형의 위치도 그대로예요.', 'Eₐ 이상 분자의 비율이 커져 유효 충돌이 늘어요 (모식: ' + tgPct() + ' %).'].forEach((s) => { if (ty + 16 < y1 + hh) ty += textBlock(R.x + 20, ty, R.w - 40, '• ' + s, 12, INK, 16, 700) + 4; });
  }

  /* ================= ② 평형 그래프: A ⇌ B (촉매가 있어도 평형 농도는 그대로) ================= */
  const EQ = () => S.eq;
  const EQK = [{ kf: 0.15, kr: 0.10 }, { kf: 0.60, kr: 0.40 }];               // 촉매가 있으면 정반응·역반응 속도 상수가 모두 4배 (비 kf/kr = 1.5 는 그대로)
  const A_EQ = 0.4, EQ_T = 40;
  const aAt = (m, t) => A_EQ + (1 - A_EQ) * Math.exp(-(EQK[m].kf + EQK[m].kr) * t);
  const tEq = (m) => { for (let t = 0; t < 200; t += 0.05) if (Math.abs(aAt(m, t) - A_EQ) <= 0.02) return t; return 200; };
  function eqSet(m) { const Q = EQ(); if (Q.ph === 'run') return; Q.mode = m; Q.tc = 0; Q.ph = 'idle'; Sound.tick(); updateCtl(); }
  function eqRun() { const Q = EQ(); if (Q.ph === 'run') return; Q.ph = 'run'; Q.tc = 0; Sound.click(); updateCtl(); }
  function stepEq(dt) {
    const Q = EQ(); if (Q.ph !== 'run') return;
    Q.tc = Math.min(EQ_T, Q.tc + dt * 5);
    if (Q.tc >= EQ_T) { Q.ph = 'done'; if (Q.mode !== 1) Q.seen[0] = true; if (Q.mode !== 0) Q.seen[1] = true; Sound.success(); updateCtl(); }
  }
  const eqDone = () => EQ().seen[0] && EQ().seen[1];
  function drawEq(t) {
    const L = RC.L, Q = EQ(), g = G({ x0: L.x + 52, y0: L.y + 78, w: L.w - 76, h: 184, xmax: EQ_T, ymax: 1.0, xs: 10, ys: 0.25, yfmt: (v) => f2(v), xfmt: (v) => f0(v), xlab: '시간 (s) →', ylab: '농도 (M)' });
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '⚖ A ⇌ B : 농도–시간 그래프', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '처음 [A] = 1.00 M, [B] = 0 · 같은 온도', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    axesG(g);
    const show = Q.mode === 2 ? [0, 1] : [Q.mode], tc = Q.ph === 'idle' ? 0 : Q.tc;
    dash(g.x0, g.Y(A_EQ), g.x0 + g.w, g.Y(A_EQ), 'rgba(100,116,139,.6)', 1.6); dash(g.x0, g.Y(1 - A_EQ), g.x0 + g.w, g.Y(1 - A_EQ), 'rgba(100,116,139,.6)', 1.6);
    T(g.x0 + g.w - 4, g.Y(A_EQ) + 15, '평형 [A] = 0.40', 12, '#64748b', 'right', 800, HALO); T(g.x0 + g.w - 4, g.Y(1 - A_EQ) - 6, '평형 [B] = 0.60', 12, '#64748b', 'right', 800, HALO);
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.y0 - 3, g.w, g.h + 6); ctx.clip();
    show.forEach((m) => {
      const col = m ? TEAL : PUR;
      [[false, 3.6], [true, 2.2]].forEach(([isB, lw]) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(isB ? [4, 4] : m && Q.mode === 2 ? [8, 4] : []); ctx.beginPath();
        for (let s = 0; s <= tc + 1e-6; s += 0.2) { const a = aAt(m, s), v = isB ? 1 - a : a, x = g.X(s), y = g.Y(v); s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      });
    });
    ctx.restore();
    show.forEach((m) => { const te = tEq(m); if (tc >= te) { dash(g.X(te), g.y0, g.X(te), g.y0 + g.h, m ? TEAL : PUR, 1.8); T(g.X(te) + 4, g.y0 + 14 + (m ? 16 : 0), '평형 도달 약 ' + f0(te) + ' s', 12.5, m ? TEAL : PUR, 'left', 800, HALO); } });
    if (Q.ph !== 'idle') { ctx.strokeStyle = 'rgba(40,50,70,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(g.X(tc), g.y0); ctx.lineTo(g.X(tc), g.y0 + g.h); ctx.stroke(); }
    T(L.x + L.w - 14, L.y + 46, '실선 [A] · 점선 [B]', 12, MUTED, 'right', 800);
    // 정반응 · 역반응 속도
    const m2 = Q.mode === 2 ? 1 : Q.mode, by = g.y0 + g.h + 46, a = aAt(m2, tc), rf = EQK[m2].kf * a, rr = EQK[m2].kr * (1 - a);
    box(L.x + 12, by - 22, L.w - 24, L.y + L.h - by + 10, '#f6f7fb', '#dbe3f3', 1.5, 12);
    T(L.x + 24, by - 4, '시각 ' + f0(tc) + ' s · ' + (Q.mode === 2 ? '촉매 있음' : Q.mode ? '촉매 있음' : '촉매 없음') + '의 반응 속도', 13, INK, 'left', 800);
    [['정반응 속도', rf, PUR], ['역반응 속도', rr, '#e0692f']].forEach(([nm, v, col], i) => {
      const y = by + 8 + i * 30, x0 = L.x + 130, w = L.w - 130 - 100, full = 0.62;
      T(L.x + 24, y + 13, nm, 12.5, MUTED, 'left', 800); D.roundRect(x0, y, w, 16, 7); ctx.fillStyle = '#e4e9f3'; ctx.fill();
      const ww = clamp(v / full, 0, 1) * w; if (ww > 0.6) { ctx.save(); D.roundRect(x0, y, w, 16, 7); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x0, y, ww, 16); ctx.restore(); }
      T(x0 + w + 8, y + 13, f3(v) + ' M/s', 12.5, INK, 'left', 800);
    });
    if (by + 74 < L.y + L.h) T(L.x + 24, by + 78, Q.ph === 'done' || Math.abs(rf - rr) < 0.002 ? '평형: 정반응 속도 = 역반응 속도 (둘 다 촉매가 있으면 더 커요)' : '평형에 가까워지면 두 속도가 같아져요.', 12.5, MUTED, 'left', 800);
  }
  function drawEqInfo(t) {
    const R = RC.R, Q = EQ();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 평형에 도달하는 시간', 14, INK, 'left', 800);
    const y0 = R.y + 38;
    [['촉매 없음', 0, PUR], ['촉매 있음', 1, TEAL]].forEach(([nm, m, col], i) => {
      const y = y0 + i * 66; box(R.x + 10, y, R.w - 20, 60, '#fbfaff', col, 1.6, 10);
      T(R.x + 20, y + 22, nm, 13.5, col, 'left', 800);
      T(R.x + 20, y + 44, 'kf = ' + f2(EQK[m].kf) + ' / s, kr = ' + f2(EQK[m].kr) + ' / s', 12, MUTED, 'left', 700);
      T(R.x + R.w - 18, y + 38, '약 ' + f0(tEq(m)) + ' s', 18, col, 'right', 800);
    });
    const y1 = y0 + 138, hh = R.y + R.h - y1 - 10;
    box(R.x + 10, y1, R.w - 20, hh, '#f6f7fb', '#dbe3f3', 1.4, 10);
    T(R.x + 20, y1 + 22, '💡 평형과 촉매', 13, PUR, 'left', 800);
    let ty = y1 + 42;
    ['촉매는 정반응과 역반응을 같은 비율로 빠르게 해요.', '그래서 평형에 도달하는 시간만 짧아져요.', '평형에서의 농도(평형 위치)와 평형 상수는 그대로예요.'].forEach((s) => { if (ty + 16 < y1 + hh) ty += textBlock(R.x + 20, ty, R.w - 40, '• ' + s, 12, INK, 16, 700) + 4; });
  }

  /* ================= ③ 효소: 기질 특이성 + 최적 온도와 변성 ================= */
  const EZ = () => S.ez;
  const TD = [10, 20, 30, 37, 45, 55, 65], VD = [1.0, 2.0, 3.8, 5.0, 3.5, 0.5, 0];
  const PCH = (function () {                                       // 단조 3차 보간 (자료 점을 지나고 37 °C 에서 최대)
    const n = TD.length, h = [], d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) { h[i] = TD[i + 1] - TD[i]; d[i] = (VD[i + 1] - VD[i]) / h[i]; }
    for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    return (x) => { x = clamp(x, TD[0], TD[n - 1]); let i = 0; while (i < n - 2 && x > TD[i + 1]) i++; const t = (x - TD[i]) / h[i], t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * VD[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * VD[i + 1] + (t3 - t2) * h[i] * m[i + 1]; };
  })();
  const ezAct = () => { const Z = EZ(); return Z.latched ? 0 : Math.max(0, Math.round(PCH(Z.T) * 10) / 10); };            // 화면·확인에 같은 값(소수 첫째 자리)
  const gcAct = (Tc) => 1.0 * Math.pow(1.4, (Tc - 10) / 10);                       // 일반 촉매 (모식): 온도가 오르면 계속 빨라져요
  const SUBS = [{ nm: '기질 ①', fit: true, col: '#f59e0b' }, { nm: '기질 ②', fit: false, col: '#14b8a6' }, { nm: '기질 ③', fit: false, col: '#ec4899' }];
  const ezEnz = () => { const L = RC.L; return { x: L.x + 118, y: L.y + 130, r: 50 }; };
  const ezTray = (k) => { const L = RC.L; return { x: L.x + L.w - 62, y: L.y + 84 + k * 50 }; };
  const ezSite = () => { const e = ezEnz(); return { x: e.x + e.r - 12, y: e.y }; };
  function ezSend(k) {
    const Z = EZ(); if (Z.ph !== 'idle') return;
    const tr = ezTray(k); Z.sub = k; Z.ph = 'in'; Z.tm = 0; Z.x = tr.x; Z.y = tr.y; Z.sx = tr.x; Z.sy = tr.y; Z.msg = ''; Sound.click(); updateCtl();
  }
  function setT(v) {
    const Z = EZ(); v = clamp(Math.round(v), 10, 65); if (v === Z.T) return; Z.T = v; Z.maxT = Math.max(Z.maxT, v);
    if (v >= 65 && !Z.latched) { Z.latched = true; Z.msg = '변성됐어요! 효소의 모양이 변해 활성 부위가 맞지 않아요.'; Sound.fail(); showHint('65 °C: 효소가 변성됐어요. 식혀도 회복되지 않아요.'); }
    if (v === 37) Z.seen37 = true;
    if (Z.latched && v <= 40) Z.cooled = true;
    updateCtl();
  }
  function ezFresh() { const Z = EZ(); Z.latched = false; Z.cooled = false; Z.maxT = Z.T; Z.msg = '새 효소로 바꿨어요.'; Z.ph = 'idle'; Z.sub = -1; Sound.click(); updateCtl(); }
  const ezFit = () => EZ().fit;
  function ezCheck() { const Z = EZ(); Z.ok = Z.in !== '' && near(parseNum(Z.in), 37, 1); }
  function ezFitNow() { const Z = EZ(); return !Z.latched && Z.u < 0.8; }
  function stepEz(dt) {
    const Z = EZ(), site = ezSite();
    Z.u = ap2(Z.u, Z.latched ? 1 : sm((Z.T - 46) / 18), dt, 6); if (Math.abs(Z.u - (Z.latched ? 1 : sm((Z.T - 46) / 18))) < 0.003) Z.u = Z.latched ? 1 : sm((Z.T - 46) / 18);
    for (let i = Z.prods.length - 1; i >= 0; i--) { const p = Z.prods[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > 1.4) Z.prods.splice(i, 1); }
    if (Z.ph === 'in') {
      const tr = { x: Z.sx, y: Z.sy }; Z.tm += dt; const k = sm(Z.tm / 0.9), fit = SUBS[Z.sub].fit && ezFitNow();
      const tx = fit ? site.x : site.x + 26, ty = site.y;
      Z.x = tr.x + (tx - tr.x) * k; Z.y = tr.y + (ty - tr.y) * k;
      if (Z.tm >= 0.9) { if (fit) { Z.ph = 'dock'; Z.tm = 0; Z.dockT = Math.min(3, 0.5 / Math.max(0.15, ezAct() / 5)); Sound.tick(); } else { Z.ph = 'back'; Z.tm = 0; Z.msg = Z.latched || !ezFitNow() ? '활성 부위의 모양이 변해 기질이 맞지 않아요.' : '모양이 맞지 않아 반응하지 않아요.'; Sound.fail(); } }
    } else if (Z.ph === 'dock') {
      Z.tm += dt; Z.x = site.x; Z.y = site.y;
      if (Z.tm >= Z.dockT) { Z.ph = 'react'; Z.tm = 0; Z.fit = true; Z.msg = '반응 완료! 효소는 그대로 남아 다음 기질을 기다려요.'; Sound.success(); for (let s = -1; s <= 1; s += 2) Z.prods.push({ x: site.x - 4, y: site.y + s * 8, vx: 60, vy: s * 36, t: 0 }); if (!RM) parts.burst(site.x, site.y, { count: 10, speed: 90, life: 0.5, size: 3, colors: ['#ffd23f', '#14a058'] }); updateCtl(); }
    } else if (Z.ph === 'react') {
      Z.tm += dt; if (Z.tm >= 0.9) { Z.ph = 'idle'; Z.sub = -1; updateCtl(); }
    } else if (Z.ph === 'back') {
      Z.tm += dt; const tr = ezTray(Z.sub), k = sm(Z.tm / 0.7); Z.x = Z.x + (tr.x - Z.x) * Math.min(1, dt * 6); Z.y = Z.y + (tr.y - Z.y) * Math.min(1, dt * 6);
      if (Z.tm >= 0.8) { Z.ph = 'idle'; Z.sub = -1; updateCtl(); }
    }
  }
  function subShape(k, x, y, s, col, al) {
    ctx.save(); ctx.globalAlpha = al == null ? 1 : al; ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); if (k === 0) { ctx.moveTo(-16, 0); ctx.lineTo(12, -17); ctx.lineTo(12, 17); ctx.closePath(); } else if (k === 1) ctx.rect(-13, -13, 26, 26); else ctx.arc(0, 0, 14, 0, TAU);
    D.shadow(() => ctx.fill(), { blur: 4, y: 1 }); ctx.stroke(); ctx.restore();
  }
  function drawEnzyme(e, u, active) {
    const wob = 4.5 * u, col = C.mix('#8b5cf6', '#9ca3af', u * 0.75);
    ctx.save(); ctx.beginPath();
    for (let k = 0; k <= 72; k++) { const a = k / 72 * TAU, r = e.r + wob * Math.sin(a * 3 + 0.6) * (0.6 + 0.4 * Math.cos(a * 2)); const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); D.shadow(() => { const g = ctx.createRadialGradient(e.x - 14, e.y - 16, 6, e.x, e.y, e.r + 6); g.addColorStop(0, C.shade(col, 0.45)); g.addColorStop(1, C.shade(col, -0.15)); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
    // 활성 부위(오목한 홈): 삼각형이 변성되면 둥글게 오그라들어요
    const tip = 28 * (1 - 0.7 * u), hh = 18 * (1 - 0.45 * u), bx = e.x + e.r + 2;
    ctx.beginPath(); ctx.moveTo(bx, e.y - hh); ctx.lineTo(bx, e.y + hh); ctx.lineTo(bx - tip, e.y + (u > 0.5 ? 2 : 0)); ctx.closePath(); ctx.fillStyle = '#eef2fb'; ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,80,.35)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    T(e.x - 6, e.y + 5, '효소', 15, '#fff', 'center', 800, { stroke: 'rgba(60,30,120,.45)', strokeWidth: 3 });
    T(e.x + e.r + 6, e.y - 28, '활성 부위', 12.5, INK, 'left', 800, HALO);
  }
  const ezGr = () => { const L = RC.L; return G({ x0: L.x + 52, y0: L.y + 262, w: L.w - 76, h: PHONE ? 130 : 138, xmax: 55, ymax: 6, xs: 10, ys: 2, yfmt: (v) => f0(v), xfmt: (v) => String(v + 10), xlab: '온도 (°C) →', ylab: '' }); };
  function drawEnz(t) {
    const L = RC.L, Z = EZ(), e = ezEnz(), g = ezGr(), act = ezAct();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧬 카탈레이스 (H₂O₂ 를 분해하는 효소)', PHONE ? 14 : 15, INK, 'left', 800);
    box(L.x + 10, L.y + 36, L.w - 20, 196, '#f1f5fc', '#cfd9ec', 1.4, 12);
    drawEnzyme(e, Z.u, act > 0);
    if (Z.ph === 'dock' || Z.ph === 'react') D.glow(ezSite().x, ezSite().y, 44, '#ffd23f', Z.ph === 'dock' ? 0.45 : 0.25);
    // 기질 보관함
    T(L.x + L.w - 20, L.y + 60, '기질 (끌어서 넣어요)', 12, MUTED, 'right', 800);
    SUBS.forEach((s, k) => { const tr = ezTray(k), away = (Z.sub === k && Z.ph !== 'idle') || Z.drag === k; subShape(k, tr.x, tr.y, 1, s.col, away ? 0.25 : 1); T(tr.x - 38, tr.y + 5, s.nm, 12.5, INK, 'right', 800); });
    if (Z.drag >= 0) { subShape(Z.drag, Z.x, Z.y, 1.15, SUBS[Z.drag].col, 0.95); }
    else if (Z.sub >= 0 && Z.ph !== 'react') subShape(Z.sub, Z.x, Z.y, 1, SUBS[Z.sub].col, 1);
    Z.prods.forEach((p) => { ctx.globalAlpha = clamp(1.4 - p.t, 0, 1); D.sphere(p.x, p.y, 6.4, '#14a058', { gloss: true }); ctx.globalAlpha = 1; });
    if (Z.prods.length) T(ezSite().x + 40, ezSite().y - 34, '생성물', 12.5, '#0f6b3c', 'left', 800, HALO);
    const mc = Z.msg || '기질을 효소의 활성 부위에 넣어 봐요. 모양이 꼭 맞아야 반응해요.';
    textBlock(L.x + 22, L.y + 206, 330, mc, 12, Z.latched ? BAD : MUTED, 15, 800);
    // 온도–상대 속도
    T(L.x + 14, g.y0 - 14, '온도와 상대 속도 (카탈레이스)', 13, INK, 'left', 800);
    axesG(g);
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.y0 - 3, g.w, g.h + 6); ctx.clip();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]); ctx.beginPath(); for (let tc = 10; tc <= 65; tc += 1) { const x = g.X(tc - 10), y = g.Y(gcAct(tc)); tc === 10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = PUR; ctx.lineWidth = 3.6; ctx.beginPath(); for (let tc = 10; tc <= 65; tc += 1) { const x = g.X(tc - 10), y = g.Y(PCH(tc)); tc === 10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    ctx.restore();
    TD.forEach((tc, i) => D.sphere(g.X(tc - 10), g.Y(VD[i]), 4, '#fff', { gloss: false, outline: PUR, outlineWidth: 2 }));
    T(g.x0 + g.w - 6, g.Y(5.6), '일반 촉매 (모식, 계속 빨라져요)', 12, '#64748b', 'right', 800, HALO);
    T(g.X(37 - 10) + 8, g.Y(5.0) + 16, '효소', 12.5, PUR, 'left', 800, HALO);
    const mx = g.X(Z.T - 10), my = g.Y(act);
    dash(mx, g.y0, mx, g.y0 + g.h, SKY, 1.5); D.sphere(mx, my, 6.4, Z.latched ? BAD : SKY, { gloss: true });
    D.label(clamp(mx, g.x0 + 56, g.x0 + g.w - 56), g.y0 + g.h + 58, Z.T + ' °C · 상대 속도 ' + f1(act) + (Z.latched ? ' (변성)' : ''), { size: 12.5, bg: Z.latched ? BAD : SKY, align: 'center' });
  }
  function drawEnzInfo(t) {
    const R = RC.R, Z = EZ(), big = R.h > 440, rh = big ? 31 : 25, y0 = R.y + 36;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 카탈레이스의 상대 속도 (예시 자료)', 13.5, INK, 'left', 800);
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 3, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    T(R.x + R.w * 0.3, y0 + rh / 2 + 3, '온도 (°C)', 12.5, INK, 'center', 800); T(R.x + R.w * 0.72, y0 + rh / 2 + 3, '상대 속도', 12.5, INK, 'center', 800);
    TD.forEach((tc, i) => {
      const y = y0 + rh * (i + 1), sel = tc === Z.T, mx = VD[i] === 5.0;
      D.roundRect(R.x + 10, y, R.w - 20, rh - 3, 8); ctx.fillStyle = sel ? 'rgba(14,165,233,.12)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? SKY : '#e1dcf3'; ctx.lineWidth = sel ? 2 : 1.1; ctx.stroke();
      T(R.x + R.w * 0.3, y + rh / 2 + 3, String(tc), 13, INK, 'center', 800); T(R.x + R.w * 0.72, y + rh / 2 + 3, f1(VD[i]) + (mx ? ' (최대)' : ''), 13, VD[i] === 0 ? BAD : PUR, 'center', 800);
    });
    const y1 = y0 + rh * 8 + 4, hh = R.y + R.h - y1 - 8;
    if (hh > 60) { box(R.x + 10, y1, R.w - 20, hh, '#f6f7fb', '#dbe3f3', 1.3, 10); let ty = y1 + 20; ['기질 특이성: 모양이 맞는 기질만 반응해요.', '최적 온도(사람 약 37 °C) 이후 열에 의해 모양이 변해(변성) 활성이 급감해요.'].forEach((s) => { if (ty + 14 < y1 + hh) ty += textBlock(R.x + 18, ty, R.w - 36, '• ' + s, 11.5, INK, 15, 700) + 3; }); }
  }

  /* ================= ④ 환경과 촉매: 문제 ↔ 해결 방법 ↔ 한계 ================= */
  const PROB = [
    { ic: '🚗', name: '자동차 배기가스', desc: '배기가스 속 CO, NO, 미연소 탄화수소가 대기를 오염시켜요.', meth: '삼원 촉매 (Pt·Pd·Rh)', ms: '삼원 촉매', mdesc: '삼원 촉매(Pt, Pd, Rh): 2CO + 2NO → 2CO₂ + N₂ 등으로 유해 기체(CO, NO, 미연소 탄화수소)를 CO₂, N₂, H₂O 로 전환해요.', lim: '귀금속·촉매 독', ldesc: '귀금속은 자원이 한정돼 있고, 납 같은 촉매 독이 닿으면 효과가 떨어져요.', harm: ['#4b5563', '#7c3aed'], safe: ['#14b8a6', '#22c55e'], hl: 'CO · NO', sl: 'CO₂ · N₂', zone: 'honey' },
    { ic: '🏭', name: '폐수 속 유기물', desc: '폐수에 녹아 있는 유기물이 수질을 오염시켜요.', meth: '미생물 효소', ms: '미생물 효소', mdesc: '폐수 처리 미생물의 효소가 유기물을 분해해 CO₂, H₂O 같은 무해한 물질로 바꿔요.', lim: '온도·pH 조건', ldesc: '미생물과 효소는 온도와 pH 가 알맞을 때만 잘 작용해서 조건을 유지해야 해요.', harm: ['#a16207', '#b45309'], safe: ['#14b8a6', '#60a5fa'], hl: '유기물', sl: 'CO₂ · H₂O', zone: 'micro' },
    { ic: '👕', name: '세탁 폐수', desc: '뜨거운 물과 많은 세제로 빨래하면 에너지가 들고 폐수가 늘어요.', meth: '효소 세제', ms: '효소 세제', mdesc: '효소 세제는 낮은 온도(30 °C)에서도 단백질·지방 얼룩을 분해해 에너지와 세제를 아껴요.', lim: '고온에서 변성', ldesc: '효소는 너무 뜨거운 물(약 60 °C 이상)에서 변성돼 효과가 떨어져요.', harm: ['#eab308', '#f97316'], safe: ['#86efac', '#5eead4'], hl: '얼룩', sl: '작은 조각', zone: 'drum' },
    { ic: '🏠', name: '실내 공기 오염', desc: '실내의 휘발성 유기 화합물(VOC)이 공기를 오염시켜요.', meth: '광촉매 TiO₂', ms: '광촉매 TiO₂', mdesc: '광촉매 TiO₂ 는 빛을 받아 유기 오염 물질을 분해해요.', lim: '빛이 필요', ldesc: '빛이 닿는 표면에서만 작용하고, 빛이 없는 곳에서는 약해요.', harm: ['#f97316', '#dc2626'], safe: ['#5eead4', '#93c5fd'], hl: 'VOC', sl: 'CO₂ · H₂O', zone: 'tio2' },
    { ic: '🧴', name: '플라스틱 폐기물', desc: '분해되지 않는 플라스틱이 토양과 바다에 쌓여요.', meth: '플라스틱 분해 효소', ms: '분해 효소', mdesc: '플라스틱을 작은 조각으로 분해하는 효소가 연구되고 있어요.', lim: '아직 연구 중', ldesc: '연구 중이어서 대규모·저비용으로 쓰기는 아직 어려워요.', harm: ['#2563eb', '#1d4ed8'], safe: ['#a7f3d0', '#bae6fd'], hl: '긴 사슬', sl: '작은 조각', zone: 'enz' },
  ];
  const PM = shuffle(5, 7), PL = shuffle(5, 13);                           // 방법·한계 칩의 순서 (문제 순서와 다르게)
  const EV = () => S.ev;
  const evOk = (i) => EV().meth[i] === i && EV().lim[i] === i;
  const evN = () => PROB.filter((p, i) => evOk(i)).length;
  function evSel(i) { const V = EV(); if (V.sel !== i) { V.sel = i; V.parts = []; V.outH = 0; V.outS = 0; Sound.tick(); } updateCtl(); }
  function evPickM(k) { const V = EV(), i = V.sel; V.meth[i] = k; if (k !== i) { Sound.fail(); showHint('이 문제에는 맞지 않는 해결 방법이에요. 어떤 오염 물질을 어떻게 바꾸는지 생각해요.'); } else { Sound.success(); const r = evScene(); parts.burst(r.x + r.w * 0.5, r.y + r.h * 0.5, { count: 12, speed: 100, life: 0.6, size: 3.2 }); } V.wrong[i] = V.meth[i] !== i && V.meth[i] >= 0 || (V.lim[i] >= 0 && V.lim[i] !== i); updateCtl(); }
  function evPickL(k) { const V = EV(), i = V.sel; V.lim[i] = k; if (k !== i) { Sound.fail(); showHint('이 방법의 한계가 아니에요. 조작판의 한계 카드를 다시 살펴봐요.'); } else Sound.success(); V.wrong[i] = (V.meth[i] >= 0 && V.meth[i] !== i) || (V.lim[i] >= 0 && V.lim[i] !== i); updateCtl(); }
  function evResult() {
    const V = EV(), un = PROB.filter((p, i) => V.meth[i] < 0 || V.lim[i] < 0).length;
    if (un) return '해결 방법과 한계를 모두 고르지 않은 문제가 ' + un + '개 있어요.';
    const bad = PROB.map((p, i) => (evOk(i) ? null : p.name)).filter(Boolean);
    return bad.length ? '다시 확인해요: ' + bad.join(', ') : true;
  }
  const evScene = () => { const L = RC.L; return { x: L.x + 12, y: L.y + 38, w: L.w - 24, h: 188 }; };
  const evRow = (i) => { const L = RC.L, y0 = L.y + 236; return { x: L.x + 12, y: y0 + i * ((L.h - 244) / 5), w: L.w - 24, h: (L.h - 244) / 5 - 4 }; };
  function stepEv(dt) {
    const V = EV(), p = PROB[V.sel], s = evScene(), treated = V.meth[V.sel] === V.sel, zx = s.x + s.w * 0.4, zw = s.w * 0.2;
    V.pulse = ap2(V.pulse, 1, dt, 3);
    V.spawnT -= dt; if (V.spawnT <= 0) { V.spawnT = 0.55; V.parts.push({ x: s.x + 8, y: s.y + 36 + rnd(0, s.h - 72), k: V.parts.length % 2, c: 0, ph: rnd(0, TAU) }); }
    for (let i = V.parts.length - 1; i >= 0; i--) {
      const q = V.parts[i]; q.x += 78 * dt; q.y += Math.sin(S.t * 2 + q.ph) * 8 * dt;
      q.y = clamp(q.y, s.y + 22, s.y + s.h - 22);
      if (treated && q.x > zx + zw * 0.5) q.c = Math.min(1, q.c + dt * 2.2);
      if (q.x > s.x + s.w - 6) { if (q.c > 0.5) V.outS++; else V.outH++; V.parts.splice(i, 1); }
    }
  }
  function drawZone(style, zx, zy, zw, zh, t, treated) {
    ctx.save(); D.shadow(() => { D.roundRect(zx, zy, zw, zh, 12); ctx.fillStyle = '#e9edf5'; ctx.fill(); }, { blur: 6, y: 2 }); ctx.strokeStyle = '#9fb0cc'; ctx.lineWidth = 2.6; D.roundRect(zx, zy, zw, zh, 12); ctx.stroke();
    ctx.beginPath(); D.roundRect(zx + 3, zy + 3, zw - 6, zh - 6, 10); ctx.clip();
    if (style === 'honey') { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1.6; for (let a = 0; a < 6; a++) for (let b = 0; b < 9; b++) { const cx = zx + 8 + a * (zw / 5.2) + (b % 2) * 6, cy = zy + 10 + b * (zh / 8.4); ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + 0.52; ctx.lineTo(cx + Math.cos(an) * 6, cy + Math.sin(an) * 6); } ctx.closePath(); ctx.stroke(); } for (let k = 0; k < 14; k++) D.sphere(zx + 8 + hashN(k, 3) * (zw - 16), zy + 8 + hashN(k, 4) * (zh - 16), 3, '#d1a23a', { gloss: false }); }
    else if (style === 'micro') { for (let k = 0; k < 9; k++) { const x = zx + 8 + hashN(k, 5) * (zw - 30), y = zy + 10 + hashN(k, 6) * (zh - 24); D.roundRect(x, y, 22, 10, 5); ctx.fillStyle = '#4ade80'; ctx.fill(); D.sphere(x + 6, y + 5, 2.2, '#166534', { gloss: false }); } }
    else if (style === 'drum') { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(zx + zw / 2, zy + zh / 2, Math.min(zw, zh) / 2 - 10, 0, TAU); ctx.stroke(); for (let k = 0; k < 12; k++) D.sphere(zx + 10 + hashN(k, 7) * (zw - 20), zy + 10 + hashN(k, 8) * (zh - 20), 3.4, '#a855f7', { gloss: false }); }
    else if (style === 'tio2') { ctx.fillStyle = '#bfd8f5'; ctx.fillRect(zx + 4, zy + zh - 26, zw - 8, 16); T(zx + zw / 2, zy + zh - 14, 'TiO₂', 12.5, INK, 'center', 800); const on = !RM ? 0.5 + 0.5 * Math.sin(t * 4) : 1; ctx.strokeStyle = 'rgba(250,204,21,' + (0.5 + 0.4 * on) + ')'; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { const x = zx + 12 + k * ((zw - 24) / 3); ctx.beginPath(); ctx.moveTo(x - 5, zy + 8); ctx.lineTo(x + 5, zy + zh - 32); ctx.stroke(); } T(zx + zw / 2, zy + 22, '☀ 빛', 13, '#b45309', 'center', 800); }
    else { for (let k = 0; k < 7; k++) { const x = zx + 12 + hashN(k, 9) * (zw - 36), y = zy + 12 + hashN(k, 10) * (zh - 36); D.sphere(x + 10, y + 10, 10, '#8b5cf6', { gloss: true }); ctx.fillStyle = '#e9edf5'; ctx.beginPath(); ctx.moveTo(x + 22, y + 4); ctx.lineTo(x + 22, y + 16); ctx.lineTo(x + 15, y + 10); ctx.closePath(); ctx.fill(); } }
    ctx.restore();
    if (treated) { ctx.strokeStyle = 'rgba(20,160,88,' + (0.55 + 0.3 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 3.4; D.roundRect(zx - 2, zy - 2, zw + 4, zh + 4, 13); ctx.stroke(); }
  }
  function drawEnv(t) {
    const L = RC.L, V = EV(), p = PROB[V.sel], s = evScene(), treated = V.meth[V.sel] === V.sel;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🌍 ' + p.name + ' → 해결 방법과 한계 연결', PHONE ? 13.5 : 15, INK, 'left', 800);
    box(s.x, s.y, s.w, s.h, '#f1f5fc', '#cfd9ec', 1.4, 12);
    const zx = s.x + s.w * 0.4, zw = s.w * 0.2, zy = s.y + 28, zh = s.h - 56;
    drawZone(p.zone, zx, zy, zw, zh, t, treated);
    ctx.save(); D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.clip();
    V.parts.forEach((q) => { const col = C.mix(p.harm[q.k], p.safe[q.k], q.c); if (p.zone === 'drum' || p.zone === 'enz' && false) { } D.sphere(q.x, q.y, 9 - 2 * q.c, col, { gloss: true }); });
    ctx.restore();
    T(zx + zw / 2, s.y + 18, treated ? p.meth : '해결 방법을 고르면 나타나요', PHONE ? 11.5 : 12.5, treated ? '#0f6b3c' : '#9aa6bb', 'center', 800);
    if (!treated) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#9aa6bb'; ctx.lineWidth = 2; D.roundRect(zx, zy, zw, zh, 12); ctx.stroke(); ctx.restore(); }
    // 범례와 집계
    T(s.x + 12, s.y + s.h - 12, '● ' + p.hl + ' (오염 물질)', 12.5, '#6b7280', 'left', 800); T(s.x + s.w - 12, s.y + s.h - 12, '● ' + p.sl + ' (무해)', 12.5, '#0f6b3c', 'right', 800);
    T(s.x + s.w - 12, s.y + 20, '배출: 오염 ' + V.outH + ' · 무해 ' + V.outS, 12.5, INK, 'right', 800);
    // 문제 목록
    PROB.forEach((q, i) => {
      const r = evRow(i), sel = i === V.sel, ok = evOk(i), bad = V.wrong[i];
      box(r.x, r.y, r.w, r.h, ok ? 'rgba(20,160,88,.09)' : sel ? 'rgba(124,58,237,.08)' : '#fbfaff', ok ? GOOD : bad ? BAD : sel ? PUR : '#d9d0f5', sel ? 2.4 : 1.4, 10);
      T(r.x + 18, r.y + r.h / 2 + 7, q.ic, 20, INK, 'center', 800); T(r.x + 36, r.y + r.h / 2 + 4, q.name, 13, INK, 'left', 800);
      const m = V.meth[i] >= 0 ? PROB[V.meth[i]].ms : '방법 ?', l = V.lim[i] >= 0 ? PROB[V.lim[i]].lim : '한계 ?';
      T(r.x + r.w * 0.4, r.y + r.h / 2 + 4, m, 12.5, V.meth[i] < 0 ? '#aab3c4' : V.meth[i] === i ? '#0f6b3c' : BAD, 'left', 800);
      T(r.x + r.w - 10, r.y + r.h / 2 + 4, l + (ok ? ' ✔' : ''), 12, V.lim[i] < 0 ? '#aab3c4' : V.lim[i] === i ? '#0f6b3c' : BAD, 'right', 800);
    });
  }
  function drawEnvInfo(t) {
    const R = RC.R, V = EV(), p = PROB[V.sel];
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, p.ic + ' ' + p.name, 14, INK, 'left', 800); T(R.x + R.w - 14, R.y + 24, evN() + ' / 5', 14, evN() === 5 ? GOOD : MUTED, 'right', 800);
    let y = R.y + 38;
    y += textBlock(R.x + 16, y + 12, R.w - 32, p.desc, 12.5, INK, 17, 800) + 14;
    const ok = V.meth[V.sel] === V.sel, okL = V.lim[V.sel] === V.sel;
    box(R.x + 10, y, R.w - 20, 104, ok ? 'rgba(20,160,88,.08)' : '#f6f7fb', ok ? GOOD : '#dbe3f3', 1.5, 10);
    T(R.x + 20, y + 20, '🛠 해결 방법', 12.5, PUR, 'left', 800);
    if (ok) textBlock(R.x + 20, y + 40, R.w - 40, p.mdesc, 12, INK, 16, 700); else textBlock(R.x + 20, y + 40, R.w - 40, '알맞은 해결 방법을 고르면 설명이 나와요.', 12, '#9aa6bb', 16, 800);
    y += 112;
    box(R.x + 10, y, R.w - 20, 84, okL ? 'rgba(245,158,11,.1)' : '#f6f7fb', okL ? AMB : '#dbe3f3', 1.5, 10);
    T(R.x + 20, y + 20, '⚠ 한계', 12.5, AMB, 'left', 800);
    if (okL) textBlock(R.x + 20, y + 40, R.w - 40, p.ldesc, 12, INK, 16, 700); else textBlock(R.x + 20, y + 40, R.w - 40, '알맞은 한계 카드를 고르면 설명이 나와요.', 12, '#9aa6bb', 16, 800);
    y += 92;
    if (y + 40 < R.y + R.h) textBlock(R.x + 16, y + 6, R.w - 32, '🌱 촉매와 효소는 에너지와 자원을 아끼며 오염을 줄이는 데 쓰여요. 한계도 함께 생각해요.', 11.5, MUTED, 15, 700);
  }

  /* ================= ④ 정리표: 농도 · 온도 · 촉매 ================= */
  const TB = () => S.tb;
  const FACT = [
    { ic: '🧪', name: '농도 ↑', ex: '산소 농도가 높으면 불이 격렬해요', ans: 0 },
    { ic: '🌡️', name: '온도 ↑', ex: '냉장고에 두면 부패가 느려져요', ans: 1 },
    { ic: '🧬', name: '촉매', ex: '효소 세제, 삼원 촉매', ans: 2 },
  ];
  const RSN = ['단위 부피 속 입자 수(입자 밀도) ↑ → 충돌 횟수 ↑', 'Eₐ 이상의 에너지를 가진 분자의 비율 ↑', '활성화 에너지(Eₐ) ↓ (새 반응 경로)'];
  function tbSel(i) { const K = TB(); if (K.sel !== i) { K.sel = i; Sound.tick(); } updateCtl(); }
  function tbPick(k) { const K = TB(), i = K.sel; K.pick[i] = k; K.wrong[i] = k !== FACT[i].ans; if (K.wrong[i]) { Sound.fail(); showHint('이 요인의 이유가 아니에요. 늘어나는 것이 입자 수인지, 에너지가 큰 분자의 비율인지, 장벽의 높이인지 생각해요.'); } else Sound.success(); updateCtl(); }
  const tbN = () => TB().pick.filter((p, i) => p === FACT[i].ans).length;
  function tbResult() { const K = TB(); if (K.pick.some((p) => p < 0)) return '세 요인의 이유를 모두 골라요. (' + K.pick.filter((p) => p >= 0).length + ' / 3)'; const bad = FACT.filter((f, i) => K.pick[i] !== f.ans).map((f) => f.name); return bad.length ? '다시 확인해요: ' + bad.join(', ') : true; }
  const tbRow = (i) => { const L = RC.L; return { x: L.x + 12, y: L.y + 44 + i * 108, w: L.w - 24, h: 100 }; };
  function miniIcon(i, x, y, t) {
    ctx.save(); ctx.translate(x, y); D.roundRect(-34, -30, 68, 60, 8); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d9d0f5'; ctx.lineWidth = 1.3; ctx.stroke();
    if (i === 0) { for (let k = 0; k < 12; k++) D.sphere(-24 + (k % 4) * 16, -18 + Math.floor(k / 4) * 16, 4.4, '#3867f4', { gloss: false }); }
    else if (i === 1) { ctx.strokeStyle = BLU; ctx.lineWidth = 2.4; ctx.beginPath(); for (let e = 0; e <= 1; e += 0.04) { const xx = -26 + e * 52, yy = 22 - Math.sqrt(e) * Math.exp(-e * 3.2) * 62; e ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.strokeStyle = BAD; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(6, -24); ctx.lineTo(6, 24); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(226,70,75,.45)'; ctx.fillRect(6, 14, 20, 8); }
    else { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(-26, 16); ctx.quadraticCurveTo(0, -42, 26, 20); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = TEAL; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(-26, 16); ctx.quadraticCurveTo(0, -14, 26, 20); ctx.stroke(); D.arrow(0, -22, 0, -2, { color: TEAL, width: 2.4, head: 6 }); }
    ctx.restore();
  }
  function drawTbl(t) {
    const L = RC.L, K = TB();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '📋 반응 속도를 빠르게 하는 요인 정리표', PHONE ? 13.5 : 15, INK, 'left', 800);
    FACT.forEach((f, i) => {
      const r = tbRow(i), sel = i === K.sel, p = K.pick[i], ok = p === f.ans;
      box(r.x, r.y, r.w, r.h, ok ? 'rgba(20,160,88,.08)' : sel ? 'rgba(124,58,237,.08)' : '#fbfaff', ok ? GOOD : p >= 0 ? BAD : sel ? PUR : '#d9d0f5', sel ? 2.6 : 1.5, 12);
      T(r.x + 18, r.y + 34, f.ic, 22, INK, 'center', 800); T(r.x + 36, r.y + 31, f.name, 15, INK, 'left', 800); T(r.x + 36, r.y + 52, '→ 반응 속도 ↑', 13, '#b45309', 'left', 800);
      T(r.x + 14, r.y + 78, f.ex, 11.5, MUTED, 'left', 700);
      textBlock(r.x + 150, r.y + 28, r.w - 150 - 96, p >= 0 ? RSN[p] : '이유를 골라요 (조작판)', 13, p < 0 ? '#aab3c4' : ok ? '#0f6b3c' : BAD, 18, 800);
      if (ok) D.check(r.x + r.w - 104, r.y + r.h - 18, 8, 1);
      miniIcon(i, r.x + r.w - 44, r.y + r.h / 2, t);
    });
  }
  function drawTblInfo(t) {
    const R = RC.R;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 04-04 한눈에 정리', 14, INK, 'left', 800); T(R.x + R.w - 14, R.y + 24, tbN() + ' / 3', 14, tbN() === 3 ? GOOD : MUTED, 'right', 800);
    let y = R.y + 38;
    [['🧪 농도 ↑', '입자 밀도 ↑ → 충돌 ↑', '시계 반응: 농도 2배 → 시간 1/2'], ['🌡️ 온도 ↑', 'Eₐ 이상 분자 비율 ↑', '10 °C 마다 속도 약 2배'], ['🧬 촉매', 'Eₐ ↓ (정·역반응 모두)', 'MnO₂, 효소(최적 온도·pH)']].forEach((r) => {
      const h = R.h > 440 ? 92 : 74; if (y + h > R.y + R.h - 6) return;
      box(R.x + 10, y, R.w - 20, h, '#fbfaff', '#e1dcf3', 1.3, 10); T(R.x + 20, y + 22, r[0], 13.5, PUR, 'left', 800); T(R.x + 20, y + 43, r[1], 12.5, INK, 'left', 800); T(R.x + 20, y + 62, r[2], 12, MUTED, 'left', 700); y += h + 8;
    });
  }

  /* ================= 컨트롤 · 공통 ================= */
  function build() {
    CATS.forEach((c, i) => $('#exChips').appendChild(chipBtn(c.short, c.name, () => exSet(i))));
    [['촉매 없음', false], ['촉매 있음 (켜기)', true]].forEach(([s, v]) => $('#enTog').appendChild(chipBtn(s, s, () => enSet(v))));
    ['촉매 없음', '촉매 있음', '겹쳐 보기'].forEach((s, i) => $('#eqChips').appendChild(chipBtn(s, s, () => eqSet(i))));
    SUBS.forEach((s, k) => $('#ezSub').appendChild(chipBtn(s.nm + ' 넣기', s.nm + ' 넣기', () => ezSend(k))));
    PROB.forEach((p, i) => $('#evPick').appendChild(chipBtn(p.ic, p.name, () => evSel(i))));
    PM.forEach((k) => $('#evMeth').appendChild(chipBtn(PROB[k].meth, PROB[k].meth, () => evPickM(k))));
    PL.forEach((k) => $('#evLim').appendChild(chipBtn(PROB[k].lim, PROB[k].lim, () => evPickL(k))));
    FACT.forEach((f, i) => $('#tbRow').appendChild(chipBtn(f.ic + ' ' + f.name, f.name, () => tbSel(i))));
    RSN.forEach((s, k) => $('#tbRsn').appendChild(chipBtn(s, s, () => tbPick(k))));
  }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.getAttribute('data-show').split(' ').indexOf(S.mode) < 0; });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const E = EX(), N = EN(), Q = EQ(), Z = EZ(), V = EV(), K = TB();
    $$('#exChips button').forEach((b, k) => { b.classList.toggle('on', E.sel === k); b.classList.toggle('done', E.done[k] && E.sel !== k); b.disabled = E.ph === 'run'; });
    $('#exRun').disabled = E.ph === 'run'; $('#exRun').textContent = E.ph === 'run' ? '재는 중…' : E.done[E.sel] ? '↻ 다시 실험 (30 s)' : '▶ 실험 시작 (30 s)';
    $('#exFilt').disabled = !E.done[2] || E.filt; $('#exFilt').textContent = E.filt ? '✅ 걸러서 질량을 쟀어요' : '🧪 MnO₂ 걸러서 질량 재기';
    const mi = $('#exIn'); mi.disabled = !E.filt; mi.classList.toggle('ok', E.ok); if (document.activeElement !== mi && mi.value !== E.in) mi.value = E.in;
    $$('#enTog button').forEach((b, k) => b.classList.toggle('on', N.cat === (k === 1)));
    ['en1', 'en2', 'en3'].forEach((id, k) => { const inp = $('#' + id); inp.classList.toggle('ok', N.ok[k]); inp.disabled = k > 0 && !N.seenOn; if (document.activeElement !== inp && inp.value !== N.in[k]) inp.value = N.in[k]; });
    $$('#eqChips button').forEach((b, k) => { b.classList.toggle('on', Q.mode === k); b.disabled = Q.ph === 'run'; }); $('#eqRun').disabled = Q.ph === 'run'; $('#eqRun').textContent = Q.ph === 'run' ? '재생 중…' : '▶ 재생';
    const idle = Z.ph === 'idle';
    $$('#ezSub button').forEach((b) => { b.disabled = !idle; });
    $('#ezRange').value = String(Z.T); $('#ezRange').style.setProperty('--pct', ((Z.T - 10) / 55 * 100) + '%'); $('#ezOut').textContent = Z.T + ' °C'; $('#ezMinus').disabled = Z.T <= 10; $('#ezPlus').disabled = Z.T >= 65;
    const oi = $('#ezOpt'); oi.classList.toggle('ok', Z.ok); if (document.activeElement !== oi && oi.value !== Z.in) oi.value = Z.in;
    $$('#evPick button').forEach((b, k) => { b.classList.toggle('on', V.sel === k); b.classList.toggle('done', evOk(k) && V.sel !== k); });
    $$('#evMeth button').forEach((b, j) => { const k = PM[j], on = V.meth[V.sel] === k; b.classList.toggle('on', on && k === V.sel); b.classList.toggle('no', on && k !== V.sel); });
    $$('#evLim button').forEach((b, j) => { const k = PL[j], on = V.lim[V.sel] === k; b.classList.toggle('on', on && k === V.sel); b.classList.toggle('no', on && k !== V.sel); });
    $$('#tbRow button').forEach((b, k) => { b.classList.toggle('on', K.sel === k); b.classList.toggle('done', K.pick[k] === FACT[k].ans && K.sel !== k); });
    $$('#tbRsn button').forEach((b, k) => { const on = K.pick[K.sel] === k, ok = k === FACT[K.sel].ans; b.classList.toggle('on', on && ok); b.classList.toggle('no', on && !ok); });
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#exRun').addEventListener('click', exRun); $('#exFilt').addEventListener('click', exFilter); $('#eqRun').addEventListener('click', eqRun); $('#ezFresh').addEventListener('click', ezFresh);
  $('#exIn').addEventListener('input', (e) => { EX().in = e.target.value; e.target.classList.remove('bad'); exCheck(); updateCtl(); });
  $('#exIn').addEventListener('change', (e) => { if (e.target.value === '' || EX().ok) return; shakeBad(e.target); showHint('저울의 숫자를 읽어요. 처음 0.50 g 과 비교해 봐요.'); });
  ['en1', 'en2', 'en3'].forEach((id, k) => {
    const inp = $('#' + id);
    inp.addEventListener('input', () => { EN().in[k] = inp.value; inp.classList.remove('bad'); enCheck(); updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || EN().ok[k]) return; shakeBad(inp);
      showHint(k === 0 ? '촉매 없음 도표에서 반응물 수준(0)에서 꼭대기까지의 높이를 읽어요. 눈금은 10 kJ 마다 있어요.' : k === 1 ? '촉매를 켜고 새로 낮아진 꼭대기의 높이를 읽어요.' : 'ΔH = 생성물 수준 − 반응물 수준이에요. 아래로 내려가면 음수예요.');
    });
  });
  $('#ezOpt').addEventListener('input', (e) => { EZ().in = e.target.value; e.target.classList.remove('bad'); ezCheck(); updateCtl(); });
  $('#ezOpt').addEventListener('change', (e) => { if (e.target.value === '' || EZ().ok) return; shakeBad(e.target); showHint('온도 슬라이더를 움직여 상대 속도가 가장 큰 온도를 찾아요.'); });
  $('#ezRange').addEventListener('input', (e) => setT(+e.target.value));
  $('#ezMinus').addEventListener('click', () => { Sound.click(); setT(EZ().T - 1); });
  $('#ezPlus').addEventListener('click', () => { Sound.click(); setT(EZ().T + 1); });
  const resetExp = () => { const E = EX(); E.ph = 'idle'; E.tm = 0; E.done = [false, false, false, false]; E.filt = false; E.filtP = 0; E.in = ''; E.ok = false; E.sel = 0; $('#exIn').value = ''; $('#exIn').classList.remove('ok', 'bad'); };
  const resetEn = () => { const N = EN(); N.cat = false; N.in = ['', '', '']; N.ok = [false, false, false]; N.seenOn = false; N.eaD = 75; clearInp(['#en1', '#en2', '#en3']); };
  const resetEq = () => { const Q = EQ(); Q.mode = 0; Q.ph = 'idle'; Q.tc = 0; Q.seen = [false, false]; };
  const resetEz = () => { const Z = EZ(); Z.T = 25; Z.maxT = 25; Z.latched = false; Z.cooled = false; Z.fit = false; Z.seen37 = false; Z.in = ''; Z.ok = false; Z.ph = 'idle'; Z.sub = -1; Z.drag = -1; Z.prods = []; Z.msg = ''; Z.u = 0; $('#ezOpt').value = ''; $('#ezOpt').classList.remove('ok', 'bad'); };
  const resetEv = () => { const V = EV(); V.sel = 0; V.meth = [-1, -1, -1, -1, -1]; V.lim = [-1, -1, -1, -1, -1]; V.wrong = [false, false, false, false, false]; V.parts = []; V.outH = 0; V.outS = 0; };
  const resetTb = () => { const K = TB(); K.sel = 0; K.pick = [-1, -1, -1]; K.wrong = [false, false, false]; };
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    ({ exp: resetExp, en: resetEn, eq: resetEq, enz: resetEz, env: resetEv, tbl: resetTb })[S.mode](); updateCtl();
  });
  /* 캔버스: 기질 끌기, 문제 행 고르기 */
  let dragInfo = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'enz' && EZ().ph === 'idle') { for (let k = 0; k < 3; k++) { const tr = ezTray(k); if (Math.hypot(p.x - tr.x, p.y - tr.y) < 28) { dragInfo = { k, sx: p.x, sy: p.y, moved: false }; return true; } } }
      if (S.mode === 'env') { for (let i = 0; i < 5; i++) if (inRect(p, evRow(i))) { evSel(i); return false; } }
      return false;
    },
    move(p) { if (!dragInfo) return; const Z = EZ(); if (!dragInfo.moved && Math.hypot(p.x - dragInfo.sx, p.y - dragInfo.sy) > 7) { dragInfo.moved = true; Z.drag = dragInfo.k; } if (dragInfo.moved) { Z.x = p.x; Z.y = p.y; } },
    up(p) {
      if (!dragInfo) return; const Z = EZ(), k = dragInfo.k, was = dragInfo.moved; dragInfo = null; Z.drag = -1;
      if (!was) { ezSend(k); return; }
      const site = ezSite();
      if (Math.hypot(p.x - site.x, p.y - site.y) < 50) { Z.sub = k; Z.ph = 'in'; Z.tm = 0; Z.sx = p.x; Z.sy = p.y; Z.x = p.x; Z.y = p.y; Z.msg = ''; Sound.click(); updateCtl(); }
    },
    hover(p) { if (S.mode === 'enz') for (let k = 0; k < 3; k++) { const tr = ezTray(k); if (Math.hypot(p.x - tr.x, p.y - tr.y) < 28) return 'grab'; } if (S.mode === 'env') for (let i = 0; i < 5; i++) if (inRect(p, evRow(i))) return 'pointer'; return null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'exp') { const E = EX(); L1 = '촉매'; a = CATS[E.sel].short; L2 = 'O₂ 부피'; b = f0(exVol()) + ' mL'; L3 = '실험한 조건'; c = E.done.filter(Boolean).length + ' / 4'; }
    else if (S.mode === 'en') { const N = EN(), eaOk = N.cat ? N.ok[1] : N.ok[0], dhOk = N.ok[2]; L1 = 'Eₐ(정반응)'; a = eaOk ? (N.cat ? '50 kJ' : '75 kJ') : '?'; L2 = 'ΔH'; b = dhOk ? '−196 kJ' : '?'; L3 = 'Eₐ(역반응)'; c = eaOk && dhOk ? (N.cat ? '246 kJ' : '271 kJ') : '?'; }
    else if (S.mode === 'eq') { const Q = EQ(); L1 = '평형 [A]'; a = '0.40 M'; L2 = '평형 도달'; b = Q.mode === 2 ? '약 ' + f0(tEq(0)) + ' s / ' + f0(tEq(1)) + ' s' : '약 ' + f0(tEq(Q.mode)) + ' s'; L3 = '재생한 곡선'; c = Q.seen.filter(Boolean).length + ' / 2'; }
    else if (S.mode === 'enz') { const Z = EZ(); L1 = '온도'; a = Z.T + ' °C'; L2 = '상대 속도'; b = f1(ezAct()) + (Z.latched ? ' (변성)' : ''); L3 = '효소 상태'; c = Z.latched ? '변성됨' : Z.u > 0.3 ? '모양이 변하는 중' : '정상'; }
    else if (S.mode === 'env') { const V = EV(); L1 = '고른 문제'; a = PROB[V.sel].name; L2 = '연결 완료'; b = evN() + ' / 5'; L3 = '무해 / 오염 배출'; c = V.outS + ' / ' + V.outH; }
    else { const K = TB(); L1 = '완성한 칸'; a = tbN() + ' / 3'; L2 = '고른 요인'; b = FACT[K.sel].name; L3 = '촉매의 역할'; c = 'Eₐ 를 낮춰요'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '촉매 실험: H₂O₂ 분해', short: '촉매 실험', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 상온에서는 거의 일어나지 않던 반응이 소량의 가루나 간 조각으로 갑자기 빨라지는 까닭은 무엇일까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 농도와 온도가 반응 속도를 바꾸는 까닭을 충돌로 설명했어요. 통합과학2의 <b>효소</b>와 일반선택 화학의 암모니아 합성(촉매)도 떠올려요. 이번에는 세 번째 요인인 <b>촉매</b>를 실험해요.</div>' +
        '<p>3 % 과산화 수소수 10 mL 의 분해(2H₂O₂ → 2H₂O + O₂)에 <b>촉매 없음 · KI 용액 · MnO₂ · 간 조각</b>을 넣고 30 s 동안 발생한 O₂ 부피를 기체 부피 센서로 재요. 그리고 MnO₂ 를 걸러 질량이 변했는지 확인해요. ⚠ 보안경을 쓰고, 남은 물질은 폐수 처리 기준에 따라 버려요.</p>',
      features: ['exp'],
      setup() { S.lock = false; setMode('exp'); },
      recap: '촉매를 넣으면 O₂ 발생 속도가 빨라지지만, 촉매는 소모되지 않고 O₂ 의 총량도 같아요.',
      summary: '<ul><li><b>촉매</b>: 자신은 소모되지 않으면서 반응 속도를 빠르게 하는 물질.</li><li>3 % H₂O₂ 10 mL 에서 30 s 동안 발생한 O₂: 촉매 없음 0 mL (거의 변화 없음), KI 용액 12 mL, MnO₂ 0.50 g 25 mL, 간 조각(카탈레이스 효소) 45 mL (예시 자료).</li><li>반응 뒤 걸러 낸 MnO₂ 의 질량은 0.50 g → 0.50 g 으로 변하지 않아요 (소모되지 않음).</li><li>같은 양의 H₂O₂ 가 모두 분해되면 O₂ 는 약 108 mL 로 같아요. 촉매는 속도만 바꿔요.</li><li>안전: 보안경을 쓰고, 남은 물질은 폐수 처리 기준에 따라 처리해요.</li></ul>',
      missions: [
        {
          title: '촉매 4가지 조건 실험',
          goal: '<b>촉매 없음 · KI 용액 · MnO₂ · 간 조각</b> 네 가지를 하나씩 골라 30 s 실험을 해요.',
          hint: '촉매 칩을 고르고 ▶ 실험 시작을 눌러요. 실험하는 동안은 칩이 잠겨요. 그래프에서 기울기가 가장 가파른 것을 찾아봐요.',
          setup() { S.lock = true; resetExp(); setMode('exp'); },
          check: () => exDone(), hold: 0.5,
          status: () => CATS.map((c, i) => c.short + ' ' + mark(EX().done[i])).join(' &nbsp; '),
          explain: '30 s 동안 O₂ 는 촉매 없음 <b>0 mL</b>, KI <b>12 mL</b>, MnO₂ <b>25 mL</b>, 간 조각 <b>45 mL</b> 였어요. 촉매에 따라 반응 속도가 크게 달라요 (예시 자료).',
        },
        {
          title: '반응 뒤 MnO₂ 질량 확인',
          goal: '<b>MnO₂</b> 실험 뒤 「걸러서 질량 재기」로 저울의 값을 읽어 <b>반응 후 MnO₂ 의 질량(g)</b>을 입력해요.',
          hint: 'MnO₂ 실험을 마쳐야 버튼이 켜져요. 저울에 0.50 g 이 나타나면 그 값을 적어요. 처음 질량과 비교해요.',
          setup() { S.lock = true; const E = EX(); E.filt = false; E.filtP = 0; E.in = ''; E.ok = false; $('#exIn').value = ''; $('#exIn').classList.remove('ok', 'bad'); if (!E.done[2]) { E.sel = 2; E.ph = 'idle'; } setMode('exp'); },
          check: () => EX().ok, hold: 0.5,
          status: () => 'MnO₂ 실험 ' + mark(EX().done[2]) + ' &nbsp; 질량 ' + mark(EX().ok),
          explain: '걸러 낸 MnO₂ 는 <b>0.50 g → 0.50 g</b> 으로 질량이 그대로예요. 촉매는 반응하는 동안 <b>소모되지 않아요</b> (반응 전후에 변하지 않아요).',
        },
        {
          type: 'quiz', title: '촉매에 대한 설명으로 옳은 것은?',
          goal: '촉매에 대한 설명으로 옳은 것은?',
          setup() { S.lock = true; setMode('exp'); },
          choices: ['촉매는 반응하면서 소모되어 반응 뒤 질량이 줄어요', '촉매를 넣으면 H₂O₂ 가 모두 분해될 때 O₂ 가 더 많이 생겨요', '촉매는 소모되지 않고, 같은 양의 H₂O₂ 가 모두 분해되면 O₂ 의 총량은 같으며 속도만 달라져요', '촉매는 용액의 온도를 높여서 반응을 빠르게 해요'],
          answer: 2,
          feedback: ['MnO₂ 는 반응 뒤에도 0.50 g 이었어요. 촉매는 소모되지 않아요.', '같은 양의 H₂O₂ 가 모두 분해되면 O₂ 총량은 같아요(약 108 mL). 30 s 동안의 부피 차이는 속도 차이예요.', '', '실험에서 온도는 바꾸지 않았어요. 촉매는 온도가 아니라 Eₐ 를 낮춰요 (다음 단계).'],
          explain: '촉매는 <b>소모되지 않고</b> 반응 속도만 빠르게 해요. 생성물의 양은 처음 반응물의 양으로 정해져서 촉매를 넣어도 같아요.',
        },
      ],
    },
    {
      title: '에너지 도표: Eₐ 가 낮아져요', short: '에너지 도표', icon: '⛰', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 촉매가 반응을 빠르게 했어요. <b>앞 차시</b>에서 배운 에너지 도표(Eₐ, ΔH)와 에너지 분포 곡선으로 그 까닭을 설명해요.</div>' +
        '<p>촉매는 <b>새로운 반응 경로</b>를 열어 <b>활성화 에너지(Eₐ)</b>를 낮춰요. 그러면 Eₐ 이상의 에너지를 가진 분자의 비율이 커져 유효 충돌이 늘어요. 그런데 반응물과 생성물의 에너지, 즉 <b>ΔH</b> 도 바뀔까요? 정반응과 역반응은 어떻게 될까요? 도표에서 촉매를 켜고 꺼 봐요.</p>',
      features: ['en', 'eq'],
      setup() { S.lock = false; setMode('en'); },
      recap: '촉매는 정반응·역반응의 Eₐ 를 같은 양 낮추지만 ΔH 와 평형의 위치는 바꾸지 않고, 평형에 도달하는 시간만 짧게 해요.',
      summary: '<ul><li>촉매를 쓰면 Eₐ 가 낮아져요 (정반응 75 → 50 kJ, 역반응 271 → 246 kJ: 같은 양 낮아짐). ΔH = −196 kJ (2H₂O₂ 분해)는 변하지 않아요.</li><li>Eₐ 이상의 에너지를 가진 분자의 비율이 커져 유효 충돌이 늘어나요.</li><li>정반응과 역반응이 함께 빨라지므로 평형 상수와 평형 농도는 그대로이고, <b>평형에 도달하는 시간</b>만 짧아져요.</li></ul>',
      missions: [
        {
          title: '도표에서 Eₐ 와 ΔH 읽기',
          goal: '촉매를 켜고 꺼 가며 <b>Eₐ(촉매 없음)</b>, <b>Eₐ(촉매 있음)</b>, <b>ΔH</b> 를 읽어요. 평형 화면에서는 두 곡선을 모두 재생해요.',
          hint: '눈금은 10 kJ 마다 있어요. Eₐ 는 반응물 수준(0)에서 꼭대기까지, ΔH 는 반응물에서 생성물까지예요. 「⚖ 평형」 화면에서 촉매 없음·있음을 한 번씩 재생해요.',
          setup() { S.lock = false; resetEn(); resetEq(); setMode('en'); },
          check: () => enReadDone() && eqDone(), hold: 0.5,
          status: () => 'Eₐ(없음) ' + mark(EN().ok[0]) + ' Eₐ(있음) ' + mark(EN().ok[1]) + ' ΔH ' + mark(EN().ok[2]) + ' &nbsp; 평형 ' + mark(eqDone()),
          explain: 'Eₐ(촉매 없음) = <b>75 kJ</b>, Eₐ(촉매 있음) = <b>50 kJ</b>, ΔH = <b>−196 kJ</b>(변화 없음)예요. 역반응의 Eₐ 도 271 → 246 kJ 로 같은 양(25 kJ) 낮아져요. 평형 화면에서는 평형 농도는 같고 도달 시간만 달라졌어요.',
        },
        {
          type: 'quiz', title: '촉매와 ΔH, 평형',
          goal: '촉매를 쓰면 반응의 ΔH 와 평형 상수는 어떻게 될까요?',
          setup() { S.lock = false; setMode('eq'); },
          choices: ['ΔH 는 더 큰 음수가 되고 평형 상수는 커져요', '둘 다 변하지 않고 평형에 도달하는 시간만 짧아져요', 'ΔH 는 변하지 않지만 평형 상수는 커져요', 'ΔH 는 작아지고 평형 상수는 변하지 않아요'],
          answer: 1,
          feedback: ['촉매는 반응물·생성물의 에너지를 바꾸지 않아서 ΔH 는 그대로예요. 평형 상수도 그대로예요.', '', '정반응과 역반응이 같은 비율로 빨라지므로 평형 상수도 그대로예요 (평형 농도가 같았어요).', 'ΔH 는 반응물과 생성물의 에너지 차이라서 촉매로 바뀌지 않아요.'],
          explain: '촉매는 Eₐ 만 낮추고 <b>ΔH 와 평형 상수는 바꾸지 않아요</b>. 정반응·역반응이 함께 빨라져서 평형에 도달하는 시간만 짧아져요.',
        },
      ],
    },
    {
      title: '효소: 생체 촉매', short: '효소', icon: '🧬', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 촉매가 Eₐ 를 낮춘다는 것을 알았어요. 간 조각 속 <b>카탈레이스</b>는 H₂O₂ 를 가장 빠르게 분해했죠. 통합과학2의 효소를 이제 속도와 온도로 분석해요.</div>' +
        '<p><b>효소</b>는 생물이 만드는 촉매(생체 촉매)예요. 모양이 꼭 맞는 <b>기질</b>만 활성 부위에 맞물려 반응해요(자물쇠–열쇠 모형). 또 일반 촉매와 달리 <b>최적 온도</b>가 있고, 온도가 너무 높으면 모양이 변해(<b>변성</b>) 활성을 잃어요.</p>',
      features: ['enz'],
      setup() { S.lock = false; setMode('enz'); },
      recap: '효소는 기질 특이성과 최적 온도(사람 약 37 °C)가 있고, 높은 온도에서는 변성돼 활성을 잃어요.',
      summary: '<ul><li><b>효소</b> = 생체 촉매. <b>기질 특이성</b>: 활성 부위에 모양이 꼭 맞는 기질만 반응하고, 효소는 반응 뒤에도 그대로예요.</li><li>카탈레이스의 상대 속도: 10, 20, 30, 37, 45, 55, 65 °C → 1.0, 2.0, 3.8, 5.0(최대), 3.5, 0.5, 0 (예시 자료).</li><li>일반 촉매는 온도가 오르면 계속 빨라지지만 효소는 <b>최적 온도</b>(사람 약 37 °C) 이후 급감해요. pH 에도 최적 범위가 있어요.</li><li>높은 온도에서 모양이 변하는 것을 <b>변성</b>이라고 해요. 변성되면 식혀도 회복되지 않아요.</li></ul>',
      missions: [
        {
          title: '기질 맞춰 보고 최적 온도 찾기',
          goal: '모양이 맞는 <b>기질 ①</b>을 활성 부위에 넣어 반응시키고, 온도 슬라이더로 상대 속도가 가장 큰 <b>최적 온도(°C)</b>를 찾아 입력해요.',
          hint: '기질 ①(삼각형)을 효소의 홈으로 끌거나 「기질 ① 넣기」를 눌러요. 슬라이더를 움직여 그래프의 가장 높은 점을 찾아요.',
          setup() { S.lock = true; resetEz(); setMode('enz'); },
          check: () => EZ().fit && EZ().ok && EZ().seen37, hold: 0.5,
          status: () => '기질 반응 ' + mark(EZ().fit) + ' &nbsp; 슬라이더 ' + mark(EZ().seen37) + ' &nbsp; 최적 온도 ' + mark(EZ().ok),
          explain: '삼각형 기질 ①만 활성 부위에 맞아 반응했고 효소는 그대로 남았어요. 카탈레이스는 <b>37 °C</b> 에서 상대 속도 <b>5.0</b> 으로 가장 빨라요 (사람의 체온).',
        },
        {
          title: '변성: 식혀도 회복되지 않아요',
          goal: '온도를 <b>65 °C</b> 까지 올려 효소를 변성시킨 뒤 <b>40 °C 이하</b>로 식혀서 활성이 돌아오는지 확인해요.',
          hint: '슬라이더를 65 로 올렸다가 37 로 내려요. 상대 속도가 그대로 0 이면 확인된 거예요. 「새 효소」 버튼으로 되돌릴 수 있어요.',
          setup() { S.lock = true; const Z = EZ(); Z.latched = false; Z.cooled = false; Z.T = 37; Z.maxT = 37; Z.u = 0; setMode('enz'); },
          check: () => EZ().latched && EZ().cooled && ezAct() === 0 && EZ().T <= 40, hold: 0.6,
          status: () => '변성 ' + mark(EZ().latched) + ' &nbsp; 식힘(≤ 40 °C) ' + mark(EZ().cooled) + ' &nbsp; 상대 속도 ' + f1(ezAct()),
          explain: '65 °C 에서 효소의 모양이 변해 <b>변성</b>됐고, 37 °C 로 식혀도 활성 부위가 원래대로 돌아오지 않아 상대 속도는 <b>0</b> 그대로예요.',
        },
        {
          type: 'quiz', title: '효소는 높은 온도에서 더 빠를까?',
          goal: '“효소도 일반 촉매처럼 온도가 높을수록 계속 더 빨라진다.” 이 말은?',
          setup() { S.lock = true; setMode('enz'); },
          choices: ['맞아요. 온도가 높을수록 분자가 빨라져서 효소도 계속 빨라져요', '틀려요. 최적 온도를 넘으면 효소가 변성돼 활성이 급격히 줄어요', '맞아요. 다만 pH 가 낮을 때만 그래요', '틀려요. 효소는 온도와 상관없이 속도가 일정해요'],
          answer: 1,
          feedback: ['일반 촉매는 그렇지만 효소는 단백질이라 열에 모양이 변해요. 45 °C 이후에는 오히려 느려졌어요.', '', 'pH 와 상관없이 높은 온도에서는 효소가 변성돼요.', '효소의 속도는 10 °C 에서 1.0, 37 °C 에서 5.0 으로 온도에 따라 크게 달랐어요.'],
          explain: '효소는 <b>최적 온도</b>(사람 약 37 °C)에서 가장 빠르고, 그보다 높으면 모양이 변해(<b>변성</b>) 활성이 급감해요. 일반 촉매와 달라요.',
        },
      ],
    },
    {
      title: '환경과 촉매: 문제를 풀어요', short: '환경과 촉매', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 촉매와 효소가 Eₐ 를 낮춰 반응을 빠르게 하는 방법을 배웠어요. 이제 이것을 <b>토양·수질·대기 오염</b> 같은 환경 문제에 적용해요. (생태전환교육: 지속 가능한 지구를 위한 책임)</div>' +
        '<p>환경 문제 카드 5장마다 알맞은 <b>해결 방법</b>(삼원 촉매, 미생물 효소, 효소 세제, 광촉매, 플라스틱 분해 효소)과 그 <b>한계</b>를 골라요. 알맞게 연결하면 오염 물질이 무해한 물질로 바뀌는 모습이 나타나요. 마지막에 농도·온도·촉매를 비교하는 정리표를 완성해요.</p>',
      features: ['env', 'tbl'],
      setup() { S.lock = false; setMode('env'); },
      recap: '촉매·효소는 오염 물질을 무해한 물질로 빠르게 바꿔 환경 문제 해결에 쓰이지만, 자원·온도·pH·빛 같은 한계도 있어요.',
      summary: '<ul><li><b>자동차 삼원 촉매</b>(Pt, Pd, Rh): 2CO + 2NO → 2CO₂ + N₂ 등으로 CO, NO, 미연소 탄화수소를 CO₂, N₂, H₂O 로 전환. 한계: 귀금속 자원, 납 같은 촉매 독.</li><li><b>미생물 효소</b>: 폐수·토양 속 유기물 분해. 한계: 온도·pH 에 민감. <b>효소 세제</b>: 30 °C 에서도 얼룩 분해로 에너지·세제 절약. 한계: 고온에서 변성.</li><li><b>광촉매 TiO₂</b>: 빛을 받아 유기 오염 물질 분해. 한계: 빛 필요. <b>플라스틱 분해 효소</b>: 연구 중.</li><li>정리: 농도 ↑ → 입자 밀도 ↑ → 충돌 ↑, 온도 ↑ → Eₐ 이상 분자 비율 ↑, 촉매 → Eₐ ↓.</li></ul>',
      missions: [
        {
          title: '문제–해결 방법–한계 연결',
          goal: '환경 문제 <b>5개</b>마다 알맞은 <b>해결 방법</b>과 <b>한계</b>를 고르고 「확인하기」를 눌러요.',
          hint: '문제 카드를 누르고 조작판에서 방법과 한계를 골라요. 방법이 맞으면 가운데 장치가 켜지고 오염 물질이 무해하게 바뀌어요.',
          manual: true,
          setup() { S.lock = true; resetEv(); setMode('env'); },
          check: () => evResult(),
          explain: '배기가스 → <b>삼원 촉매</b>(귀금속·촉매 독), 폐수 유기물 → <b>미생물 효소</b>(온도·pH), 세탁 폐수 → <b>효소 세제</b>(고온 변성), 실내 공기 → <b>광촉매 TiO₂</b>(빛 필요), 플라스틱 → <b>분해 효소</b>(연구 중)예요.',
        },
        {
          title: '농도 · 온도 · 촉매 정리표',
          goal: '세 요인마다 <b>반응 속도가 빨라지는 이유</b>를 골라 정리표를 완성하고 「확인하기」를 눌러요.',
          hint: '농도는 입자 수(충돌), 온도는 Eₐ 이상 분자의 비율, 촉매는 Eₐ 의 높이와 관련 있어요. 요인 칩을 고르고 이유를 골라요.',
          manual: true,
          setup() { S.lock = true; resetTb(); setMode('tbl'); },
          check: () => tbResult(),
          explain: '농도 ↑: <b>입자 밀도 ↑ → 충돌 ↑</b>. 온도 ↑: <b>Eₐ 이상 분자 비율 ↑</b>. 촉매: <b>Eₐ ↓</b>. 세 가지 모두 유효 충돌을 늘려 반응을 빠르게 해요.',
        },
        {
          type: 'quiz', title: '삼원 촉매가 공기를 깨끗하게 하는 방식',
          goal: '자동차의 삼원 촉매가 배기가스를 깨끗하게 하는 방식은?',
          setup() { S.lock = true; setMode('env'); },
          choices: ['유해 기체를 흡수해서 촉매 안에 영원히 가둬 둬요', '유해 기체를 무해한 기체로 빠르게 전환시켜요', '배기가스의 온도를 낮춰서 유해 기체를 없애요', '유해 기체와 반응해 삼원 촉매가 모두 소모돼요'],
          answer: 1,
          feedback: ['삼원 촉매는 가두는 것이 아니라 반응(2CO + 2NO → 2CO₂ + N₂)을 빠르게 해요.', '', '온도를 낮추는 것이 아니에요. Eₐ 를 낮춰 반응 속도를 높여요.', '촉매는 소모되지 않아서 계속 쓸 수 있어요 (다만 납 같은 촉매 독에는 약해요).'],
          explain: '삼원 촉매(Pt, Pd, Rh)는 CO, NO, 미연소 탄화수소를 <b>CO₂, N₂, H₂O 같은 무해한 기체로 빠르게 전환</b>시켜요. 촉매 자신은 소모되지 않아요.',
        },
      ],
    },
  ];

  build();
  game = SciSim.game({
    simId: 'hx-catalyst', mount: '#game', badge: '촉매 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { exp: '🧪 촉매 실험', en: '⛰ 에너지 도표', eq: '⚖ 평형 그래프', enz: '🧬 효소', env: '🌍 환경 문제', tbl: '📋 정리표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  S.ez.T = 25; S.ez.maxT = 25;
  setMode('exp');
  function stepAll1(dt) { S.t += dt; stepEx(dt); stepEn(dt); stepEq(dt); stepEz(dt); stepEv(dt); const V = EV(); V.pulse = ap2(V.pulse, 1, dt, 3); }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'exp') { drawExp(S.t); drawExpInfo(S.t); }
    else if (S.mode === 'en') { drawEn(S.t); drawEnInfo(S.t); }
    else if (S.mode === 'eq') { drawEq(S.t); drawEqInfo(S.t); }
    else if (S.mode === 'enz') { drawEnz(S.t); drawEnzInfo(S.t); }
    else if (S.mode === 'env') { drawEnv(S.t); drawEnvInfo(S.t); }
    else { drawTbl(S.t); drawTblInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, CATS, PROB, FACT, PM, PL, ENS, setMode, exSet, exRun, exFilter, exCheck, enSet, enCheck, eqSet, eqRun, ezSend, setT, ezFresh, ezAct, ezCheck, ezTray, ezSite, evSel, evPickM, evPickL, evResult, tbSel, tbPick, tbResult, evRow, updateCtl, PCH, tEq, pctAbove, resetEx: resetExp, resetEz,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
