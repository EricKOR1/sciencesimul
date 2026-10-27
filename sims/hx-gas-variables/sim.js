/* =========================================================
   물질과 에너지 Ⅰ. 물질의 세 가지 상태 - 기체의 네 가지 변수 [12물에01-01]
   ① 관찰: 압력·부피 (온도·몰수 잠금, 보일 법칙, P-V · P-1/V 그래프)
   ② 실험: 온도 (압력 고정 V-T 그래프와 외삽 -273 °C → 켈빈, 부피 고정 P-T)
   ③ 탐구: 몰수 (같은 T·P에서 부피는 몰수에 비례, 기체 종류와 무관)
   ④ 설명: 하나의 식 (PV/(nT) = 0.082 = R, 세 법칙은 PV = nRT의 부분)
   T는 항상 절대 온도(K = °C + 273), R = 0.082 atm·L/(mol·K).
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 772 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4';
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
  const parseNum = (s) => { const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
  const sgn = (v) => (v < 0 ? '−' : '') + Math.abs(v);

  /* ---------- 자료 (R = 0.082 atm·L/(mol·K), T = °C + 273) ---------- */
  const R = 0.082;
  const KEL = 273;
  const NRT0 = 0.5 * R * 300;             // 12.3 atm·L (n = 0.50 mol, T = 300 K)
  const PART = 0.05;                      // 입자 한 개 = 0.05 mol
  const KINDS = {
    gen: { name: '기체', M: 28, c: '#3867f4' },
    he: { name: 'He', M: 4, c: '#f2b705' },
    n2: { name: 'N₂', M: 28, c: '#3867f4' },
    co2: { name: 'CO₂', M: 44, c: '#6b7280' },
  };
  const volOf = (n, Tk, P) => n * R * Tk / P;
  const preOf = (n, Tk, V) => n * R * Tk / V;

  /* ---------- 배치 ---------- */
  const SC = PHONE ? { x: 8, y: 50, w: 464, h: 332 } : { x: 12, y: 50, w: 420, h: 498 };
  const GR = PHONE ? { x: 8, y: 390, w: 464, h: 216 } : { x: 444, y: 50, w: 344, h: 362 };
  const TB = PHONE ? { x: 8, y: 614, w: 464, h: 150 } : { x: 444, y: 420, w: 344, h: 128 };
  const CYL = { x: SC.x + (PHONE ? 66 : 62), w: PHONE ? 150 : 134, bot: SC.y + SC.h - 28 };
  const RCx = SC.x + (PHONE ? 312 : 300), RCw = SC.x + SC.w - RCx - 6;
  const MAXH = SC.h - 106;
  const VMAX = { boyle: 15.5, charles: 17, gay: 17, mole: 50 };
  const kOf = () => MAXH / VMAX[curKey()];
  const EXT_OK = 0.97;
  const SPD = PHONE ? 90 : 118;           // 300 K의 N₂ 입자 속도 (px/초)
  const PR = PHONE ? 4.6 : 5.2;          // 입자 반지름

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'boyle', sub: { temp: 'charles' }, fade: 0, lock: false, gate: '', t: 0,
    bV: 12.3,
    ch: { C: 27, ext: false, extP: 0, kmode: false, kP: 0, kUsed: false },
    gl: { C: 27 },
    mo: { n: 0.5, kind: 'n2', kinds: {} },
    rec: { boyle: [], charles: [], gay: [], mole: [] },
    fit: { boyle: 0, charles: 0, gay: 0, mole: 0 },
    pv: { ok: false, val: NaN },
    un: { ok: [false, false, false, false], val: [NaN, NaN, NaN, NaN], banner: 0, msg: '', cards: [], drag: null, placed: 0 },
    hits: [], kick: 0, flash: [], shake: 0,
  };
  let game = null;
  const A = { V: 12.3, T: 300, P: 1, cnt: 10 };
  const MODE_LABEL = { boyle: '🖐️ 압력과 부피 (T·n 고정)', temp: '🌡️ 온도와 부피 · 압력', mole: '➕ 몰수와 부피', unify: '🧩 하나의 식' };
  const curKey = () => (S.mode === 'temp' ? S.sub.temp : S.mode === 'unify' ? 'boyle' : S.mode);

  /* 지금 화면의 상태 (표시와 검사에 쓰는 값) */
  function st() {
    const m = S.mode;
    if (m === 'temp' && S.sub.temp === 'charles') { const Tk = S.ch.C + KEL; return { n: 0.5, T: Tk, P: 1, V: volOf(0.5, Tk, 1), kind: 'gen' }; }
    if (m === 'temp') { const Tk = S.gl.C + KEL; return { n: 0.5, T: Tk, V: 12.3, P: preOf(0.5, Tk, 12.3), kind: 'gen' }; }
    if (m === 'mole') { const n = S.mo.n; return { n, T: 300, P: 1, V: volOf(n, 300, 1), kind: S.mo.kind }; }
    return { n: 0.5, T: 300, V: S.bV, P: NRT0 / S.bV, kind: 'gen' };
  }

  /* ---------- 입자 모형 ---------- */
  let PS = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  function newPart(kind, inject) {
    const th = rnd(0, TAU);
    return { x: inject ? CYL.w / 2 + rnd(-14, 14) : rnd(8, CYL.w - 8), y: inject ? 2 : rnd(8, Math.max(9, A.V * kOf() - 8)), ux: Math.cos(th), uy: inject ? Math.abs(Math.sin(th)) + 0.3 : Math.sin(th), m: rnd(0.82, 1.18), ang: rnd(0, TAU), spin: rnd(-2, 2), kind, fade: inject ? 0 : 1, dying: false };
  }
  function syncParts(instant) {
    const s = st(), target = Math.round(s.n / PART);
    const live = PS.filter((p) => !p.dying);
    if (instant) { PS = []; for (let i = 0; i < target; i++) PS.push(newPart(s.kind, false)); return; }
    live.forEach((p) => { p.kind = s.kind; });
    if (live.length > target) { for (let i = live.length - 1; i >= target; i--) live[i].dying = true; }
  }
  let injT = 0;
  function stepParts(dt) {
    const s = st(), k = kOf(), H = Math.max(10, A.V * k);
    const target = Math.round(s.n / PART);
    let live = 0; PS.forEach((p) => { if (!p.dying) live++; });
    injT -= dt;
    if (live < target && injT <= 0) { PS.push(newPart(s.kind, true)); live++; injT = S.mode === 'mole' ? 0.045 : 0.012; }
    const kf = Math.sqrt(28 / KINDS[s.kind].M);
    const spd = SPD * Math.sqrt(Math.max(A.T, 1) / 300) * kf;
    const r = PR;
    for (let i = PS.length - 1; i >= 0; i--) {
      const p = PS[i];
      if (p.dying) { p.fade -= dt * 4; if (p.fade <= 0) { PS.splice(i, 1); continue; } } else if (p.fade < 1) p.fade = Math.min(1, p.fade + dt * 5);
      const v = spd * p.m * dt;
      p.x += p.ux * v; p.y += p.uy * v; p.ang += p.spin * dt;
      if (p.x < r) { p.x = r; p.ux = Math.abs(p.ux); } else if (p.x > CYL.w - r) { p.x = CYL.w - r; p.ux = -Math.abs(p.ux); }
      if (p.y < r) { p.y = r; p.uy = Math.abs(p.uy); }
      if (p.y > H - r) { p.y = Math.max(r, H - r); if (p.uy > 0) { p.uy = -p.uy; if (!p.dying) pistonHit(p.x); } }
    }
  }
  function pistonHit(x) {
    S.hits.push(S.t);
    S.kick = Math.min(0.1, S.kick + 0.012);
    if (S.flash.length < 14) S.flash.push({ x, age: 0 });
  }
  const hitsPerSec = () => { while (S.hits.length && S.hits[0] < S.t - 2) S.hits.shift(); return Math.round(S.hits.length / 2); };

  function molDraw(kind, x, y, ang, s, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    const sp = (px, r, col) => D.sphere(px * s, 0, r * s, col, { gloss: r * s > 4 });
    if (kind === 'he') sp(0, 4.8, '#f2b705');
    else if (kind === 'n2') { sp(-3.6, 3.6, '#3867f4'); sp(3.6, 3.6, '#3867f4'); }
    else if (kind === 'co2') { sp(-6.6, 3.4, '#e2464b'); sp(0, 3.8, '#475569'); sp(6.6, 3.4, '#e2464b'); }
    else sp(0, 4.7, '#3867f4');
    ctx.restore();
  }

  /* ---------- 그리기 도구 ---------- */
  function graph(Rc, c) {
    const m = PHONE ? { l: 42, r: 10, t: 28, b: 32 } : { l: 46, r: 12, t: 30, b: 34 };
    const px = Rc.x + m.l, py = Rc.y + m.t, pw = Rc.w - m.l - m.r, ph = Rc.h - m.t - m.b;
    const gx = (x) => px + (x - c.x0) / (c.x1 - c.x0) * pw, gy = (y) => py + ph - (y - c.y0) / (c.y1 - c.y0) * ph;
    panel(Rc.x, Rc.y, Rc.w, Rc.h, 14);
    T(Rc.x + 14, Rc.y + 21, c.title, 14.5, INK, 'left', 800);
    ctx.save();
    ctx.lineWidth = 1;
    (c.xt || []).forEach((t) => { const x = gx(t.v); if (x < px - 0.5 || x > px + pw + 0.5) return; ctx.strokeStyle = 'rgba(120,130,150,' + (0.22 * (t.a == null ? 1 : t.a)) + ')'; ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + ph); ctx.stroke(); });
    (c.yt || []).forEach((t) => { const y = gy(t.v); ctx.strokeStyle = 'rgba(120,130,150,.22)'; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke(); });
    ctx.restore();
    (c.xt || []).forEach((t) => { const x = gx(t.v); if (x < px - 6 || x > px + pw + 6) return; T(x, py + ph + 16, t.s, 13, MUTED, 'center', 700, { alpha: t.a == null ? 1 : t.a }); });
    (c.yt || []).forEach((t) => { T(px - 6, gy(t.v) + 4.5, t.s, 13, MUTED, 'right', 700); });
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py - 2); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw + 2, py + ph); ctx.stroke();
    (c.xl || []).forEach((l) => T(px + pw, py + ph + 30, l.s, 13, INK, 'right', 800, { alpha: l.a == null ? 1 : l.a }));
    T(Rc.x + Rc.w - 14, Rc.y + 21, c.yl, 13, INK, 'right', 800);
    return { gx, gy, px, py, pw, ph };
  }
  function clipPlot(g, fn) { ctx.save(); ctx.beginPath(); ctx.rect(g.px - 1, g.py - 1, g.pw + 2, g.ph + 2); ctx.clip(); fn(); ctx.restore(); }
  function polyline(g, fx, fy, a, b, steps, color, w, dash) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) { const u = a + (b - a) * i / steps; const X = g.gx(fx(u)), Y = g.gy(fy(u)); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.stroke(); ctx.restore();
  }
  /* 기록한 점: 장치에서 날아와 그래프에 꽂혀요. pos(rec) → 그래프 좌표 */
  function drawPoints(g, recs, pos, color) {
    recs.forEach((r) => {
      const q = pos(r), X = g.gx(q[0]), Y = g.gy(q[1]);
      const p = RM ? 1 : clamp((S.t - r.born) / 0.7, 0, 1), e = 1 - Math.pow(1 - p, 3);
      if (p < 1) {
        const ox = r.ox, oy = r.oy, x = lerp(ox, X, e), y = lerp(oy, Y, e) - Math.sin(e * Math.PI) * 26;
        D.glow(x, y, 14, '#ffd447', 0.6); D.sphere(x, y, 6, color, { gloss: false });
      } else {
        const age = S.t - r.born - 0.7;
        if (age < 0.5 && !RM) { ctx.strokeStyle = 'rgba(124,58,237,' + (0.6 * (1 - age / 0.5)) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X, Y, 7 + age * 22, 0, TAU); ctx.stroke(); }
        D.sphere(X, Y, 6.2, color, { gloss: false, outline: '#fff', outlineWidth: 1.5 });
      }
    });
  }
  function marker(g, x, y, col) {
    const X = g.gx(x), Y = g.gy(y);
    if (X < g.px - 1 || X > g.px + g.pw + 1 || Y < g.py - 1 || Y > g.py + g.ph + 1) return;
    ctx.save(); ctx.strokeStyle = col || AMB; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(X, Y, 7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ---------- 실린더 장면 ---------- */
  function drawScene(t) {
    const s = st(), key = curKey(), k = kOf(), yB = CYL.bot, H = A.V * k;
    const lockedLid = S.mode === 'temp' && S.sub.temp === 'gay';
    panel(SC.x, SC.y, SC.w, SC.h, 14);
    // 눈금자
    const rx = CYL.x - 10;
    const major = key === 'mole' ? 10 : 5, minor = key === 'mole' ? 5 : 1;
    ctx.save(); ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(rx, yB); ctx.lineTo(rx, yB - VMAX[key] * k); ctx.stroke();
    for (let v = 0; v <= VMAX[key] + 1e-6; v += minor) {
      const y = yB - v * k, isMaj = Math.abs(v % major) < 1e-6;
      ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx - (isMaj ? 9 : 5), y); ctx.stroke();
      if (isMaj) T(rx - 12, y + 4.5, String(v), 13, MUTED, 'right', 700);
    }
    ctx.restore();
    T(rx - 12, yB - VMAX[key] * k - 12, 'L', 13, MUTED, 'right', 800);
    // 가열 장치 / 받침대
    const hot = clamp((A.T - 250) / 400, 0, 1);
    const tempScene = S.mode === 'temp';
    if (tempScene) {
      const g = ctx.createLinearGradient(CYL.x, 0, CYL.x + CYL.w, 0);
      g.addColorStop(0, C.mix('#6aa8ff', '#ff5a2a', hot)); g.addColorStop(1, C.mix('#4d8dea', '#ff7a2e', hot));
      D.glow(CYL.x + CYL.w / 2, yB + 12, 40 + hot * 50, C.mix('#6aa8ff', '#ff6a2a', hot), 0.18 + hot * 0.32);
      ctx.fillStyle = g; D.roundRect(CYL.x - 8, yB + 5, CYL.w + 16, 14, 7); ctx.fill();
      T(CYL.x + CYL.w + 14, yB + 17, '가열 장치', 13, MUTED, 'left', 700);
    } else {
      ctx.fillStyle = '#c9d2df'; D.roundRect(CYL.x - 8, yB + 5, CYL.w + 16, 12, 6); ctx.fill();
      if (S.mode === 'mole') {
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(CYL.x + CYL.w / 2 - 7, yB + 5, 14, 20);
        T(CYL.x + CYL.w / 2 + 16, yB + 22, '분자 주입구', 13, MUTED, 'left', 700);
      }
    }
    // 유리 관과 기체
    const topY = lockedLid ? yB - H : yB - MAXH - 8;
    const gasTop = yB - H;
    ctx.save();
    ctx.fillStyle = 'rgba(235,242,255,.55)'; ctx.fillRect(CYL.x, topY, CYL.w, yB - topY);
    const tint = C.mix('#dbeafe', '#ffd9c7', hot);
    const gg = ctx.createLinearGradient(0, gasTop, 0, yB); gg.addColorStop(0, tint); gg.addColorStop(1, C.mix(tint, '#ffffff', 0.35));
    ctx.fillStyle = gg; ctx.fillRect(CYL.x, gasTop, CYL.w, yB - gasTop);
    ctx.restore();
    // 입자 (피스톤 아래 상자 안에서만)
    ctx.save(); ctx.beginPath(); ctx.rect(CYL.x, gasTop, CYL.w, yB - gasTop); ctx.clip();
    PS.forEach((p) => {
      const X = CYL.x + p.x, Y = yB - p.y, spd = Math.sqrt(Math.max(A.T, 1) / 300);
      if (!RM && p.fade > 0.5) { const L = Math.min(15, 5 + 6 * spd * Math.sqrt(28 / KINDS[p.kind].M)); ctx.strokeStyle = 'rgba(70,90,150,.22)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - p.ux * L, Y + p.uy * L); ctx.stroke(); }
      molDraw(p.kind, X, Y, p.ang, S.mode === 'mole' ? 1.05 : 1.12, p.fade);
    });
    // 피스톤에 부딪히는 순간 반짝임
    S.flash.forEach((f) => { const a = 1 - f.age / 0.22; if (a > 0) { D.glow(CYL.x + f.x, gasTop + 2, 14, '#fff3b0', a * 0.9); } });
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3.2; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(CYL.x, topY); ctx.lineTo(CYL.x, yB); ctx.lineTo(CYL.x + CYL.w, yB); ctx.lineTo(CYL.x + CYL.w, topY); ctx.stroke();
    // 피스톤과 손잡이 / 추 / 고정 뚜껑
    const py = gasTop - 14;
    const pg = ctx.createLinearGradient(0, py, 0, py + 14); pg.addColorStop(0, '#e8edf5'); pg.addColorStop(1, '#8e9bb0');
    ctx.fillStyle = pg; D.roundRect(CYL.x - 3, py, CYL.w + 6, 14, 4); ctx.fill(); ctx.strokeStyle = '#6b7a92'; ctx.lineWidth = 1.5; ctx.stroke();
    if (lockedLid) {
      [CYL.x + 12, CYL.x + CYL.w - 12].forEach((bx) => D.sphere(bx, py + 7, 4.5, '#475569', { gloss: false }));
      D.label(CYL.x + CYL.w / 2, py - 14, '🔒 뚜껑 고정 (부피 일정)', { size: 13, bg: '#475569' });
    } else if (S.mode === 'boyle') {
      const hy = py - 38;
      ctx.fillStyle = '#9aa7ba'; ctx.fillRect(CYL.x + CYL.w / 2 - 3, hy, 6, py - hy);
      D.shadow(() => { D.roundRect(CYL.x + CYL.w / 2 - 26, hy - 14, 52, 22, 11); ctx.fillStyle = '#f59e0b'; ctx.fill(); }, { blur: S.drag ? 12 : 5, y: S.drag ? 5 : 2 });
      T(CYL.x + CYL.w / 2, hy + 3, '↕ 누르기', 13, '#fff', 'center', 800);
    } else {
      const wy = py - 32;
      D.shadow(() => { D.roundRect(CYL.x + 10, wy, CYL.w - 20, 32, 6); ctx.fillStyle = '#64748b'; ctx.fill(); }, { blur: 5, y: 2 });
      T(CYL.x + CYL.w / 2, wy + 21, '추 · 1.00 atm', 13.5, '#fff', 'center', 800);
    }
    // 부피 이름표와 눈금 표시
    ctx.strokeStyle = 'rgba(124,58,237,.7)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(rx, gasTop); ctx.lineTo(CYL.x, gasTop); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = PUR; ctx.beginPath(); ctx.moveTo(rx + 1, gasTop); ctx.lineTo(rx + 9, gasTop - 5); ctx.lineTo(rx + 9, gasTop + 5); ctx.closePath(); ctx.fill();
    D.label(CYL.x + CYL.w + 8, py + 7, 'V = ' + f2(s.V) + ' L', { size: 14, bg: PUR, align: 'left' });
    // 오른쪽: 압력계와 변수 표
    drawGauge(t, s);
  }
  function drawGauge(t, s) {
    const key = curKey(), cx = RCx + RCw / 2, r = Math.min(54, RCw / 2 - 4), cy = SC.y + 20 + r;
    const max = key === 'boyle' ? 8 : key === 'gay' ? 2.5 : 2, ticks = key === 'boyle' ? 4 : key === 'gay' ? 5 : 4;
    const v = clamp(A.P + S.kick * max * 0.5, 0, max);
    D.dial(cx, cy, r, v, 0, max, { label: 'atm', ticks, color: BAD });
    T(cx, cy + r + 24, 'P = ' + f2(s.P) + ' atm', 15.5, INK, 'center', 800);
    const rows = [
      ['P', f2(s.P) + ' atm', key === 'boyle' || key === 'gay' ? 'var' : 'fix'],
      ['V', f2(s.V) + ' L', key === 'boyle' ? 'ctl' : key === 'gay' ? 'fix' : 'var'],
      ['T', Math.round(s.T) + ' K', key === 'charles' || key === 'gay' ? 'ctl' : 'fix'],
      ['n', f2(s.n) + ' mol', key === 'mole' ? 'ctl' : 'fix'],
    ];
    const ic = { fix: '🔒', ctl: '🎛️', var: '📈' }, col = { fix: MUTED, ctl: PUR, var: '#0e7490' };
    const y0 = cy + r + 44, rowH = PHONE ? 28 : 29;
    rows.forEach((q, i) => {
      const y = y0 + i * rowH;
      D.roundRect(RCx, y, RCw, rowH - 4, 8); ctx.fillStyle = q[2] === 'ctl' ? 'rgba(124,58,237,.10)' : q[2] === 'var' ? 'rgba(14,116,144,.09)' : '#f4f6fa'; ctx.fill();
      T(RCx + 6, y + 17, ic[q[2]], 13, INK, 'left', 700);
      T(RCx + 25, y + 17, q[0] + ' = ' + q[1], 13.5, col[q[2]], 'left', 800);
    });
    const ly = y0 + rows.length * rowH + 6;
    if (PHONE) {
      T(RCx + 2, ly + 14, '충돌 ' + hitsPerSec() + '회/초 (2초 평균)', 13, INK, 'left', 800);
    } else {
      T(RCx + 2, ly + 12, '🔒 고정 · 🎛️ 조절', 12.5, MUTED, 'left', 700); T(RCx + 2, ly + 29, '📈 변하는 값', 12.5, MUTED, 'left', 700);
      const hy = ly + 54;
      T(RCx + 2, hy, '피스톤 충돌', 13, MUTED, 'left', 700);
      T(RCx + 2, hy + 24, hitsPerSec() + '회/초', 18, INK, 'left', 800);
      T(RCx + 2, hy + 44, '(최근 2초 평균)', 12.5, MUTED, 'left', 700);
    }
    void t;
  }

  /* ---------- 그래프 영역과 표 ---------- */
  const NUM = (n, d) => (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toString();
  function drawGraphs(t) {
    const key = curKey(), s = st();
    if (S.mode === 'boyle') {
      const h = PHONE ? GR.h : (GR.h - 8) / 2;
      const r1 = PHONE ? { x: GR.x, y: GR.y, w: GR.w / 2 - 4, h: GR.h } : { x: GR.x, y: GR.y, w: GR.w, h };
      const r2 = PHONE ? { x: GR.x + GR.w / 2 + 4, y: GR.y, w: GR.w / 2 - 4, h: GR.h } : { x: GR.x, y: GR.y + h + 8, w: GR.w, h };
      const yt = [0, 2, 4, 6].map((v) => ({ v, s: String(v) }));
      const g1 = graph(r1, { x0: 0, x1: 16, y0: 0, y1: 7, title: 'P–V 그래프', yl: 'P (atm)', xl: [{ s: 'V (L)' }], xt: [0, 4, 8, 12, 16].map((v) => ({ v, s: String(v) })), yt });
      const g2 = graph(r2, { x0: 0, x1: 0.55, y0: 0, y1: 7, title: 'P–1/V 그래프', yl: 'P (atm)', xl: [{ s: '1/V (1/L)' }], xt: [0, 0.1, 0.2, 0.3, 0.4, 0.5].map((v) => ({ v, s: v === 0 ? '0' : String(v) })), yt });
      const rec = S.rec.boyle;
      if (S.fit.boyle > 0.01) {
        clipPlot(g1, () => polyline(g1, (V) => V, (V) => NRT0 / V, 1.76, lerp(1.76, 15.5, S.fit.boyle), 80, 'rgba(124,58,237,.55)', 3));
        clipPlot(g2, () => polyline(g2, (u) => u, (u) => NRT0 * u, 0, 0.5 * S.fit.boyle, 2, 'rgba(124,58,237,.55)', 3));
      }
      drawPoints(g1, rec, (q) => [q.V, q.P], PUR); drawPoints(g2, rec, (q) => [1 / q.V, q.P], PUR);
      marker(g1, s.V, s.P); marker(g2, 1 / s.V, s.P);
      S.gpos = { g1, g2 };
    } else if (key === 'charles') {
      const ch = S.ch, kp = ch.kP;
      const x0 = lerp(-300, -273, kp), x1 = lerp(150, 177, kp);
      const xtC = [-300, -200, -100, 0, 100].map((v) => ({ v, s: sgn(v), a: 1 - kp }));
      const xtK = [0, 100, 200, 300, 400].map((v) => ({ v: v - KEL, s: String(v), a: kp }));
      const g = graph(GR, { x0, x1, y0: 0, y1: 18, title: 'V–T 그래프 (압력 1.00 atm 일정)', yl: 'V (L)', xl: [{ s: 'T (°C)', a: 1 - kp }, { s: 'T (K)', a: kp }], xt: xtC.concat(xtK), yt: [0, 6, 12, 18].map((v) => ({ v, s: String(v) })) });
      const rec = S.rec.charles;
      const vfn = (c) => 0.041 * (c + KEL);
      if (kp < 0.5) { const X0 = g.gx(0); ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X0, g.py); ctx.lineTo(X0, g.py + g.ph); ctx.stroke(); ctx.restore(); }
      if (rec.length >= 2) {
        const cs = rec.map((q) => q.C), cmin = Math.min.apply(null, cs), cmax = Math.max.apply(null, cs);
        clipPlot(g, () => {
          polyline(g, (c) => c, vfn, cmin, lerp(cmin, cmax, S.fit.charles), 2, 'rgba(124,58,237,.7)', 3.4);
          if (ch.extP > 0.001) polyline(g, (c) => c, vfn, cmin, lerp(cmin, -KEL, ch.extP), 40, 'rgba(226,70,75,.85)', 3, [7, 6]);
        });
        if (ch.extP > EXT_OK) {
          const X = g.gx(-KEL), Y = g.gy(0);
          D.glow(X, Y, 24, '#ff5a5a', 0.45); D.sphere(X, Y, 6.5, BAD, { gloss: false, outline: '#fff', outlineWidth: 1.5 });
          D.label(clamp(X + 8, g.px + 70, g.px + g.pw - 60), Y - 26, kp > 0.5 ? 'V = 0, T = 0 K' : 'V = 0, T = −273 °C', { size: 13, bg: BAD });
        }
      }
      drawPoints(g, rec, (q) => [q.C, q.V], PUR);
      marker(g, S.ch.C, s.V);
      S.gpos = { g };
    } else if (key === 'gay') {
      const g = graph(GR, { x0: 0, x1: 650, y0: 0, y1: 2.5, title: 'P–T 그래프 (부피 12.30 L 일정)', yl: 'P (atm)', xl: [{ s: 'T (K)' }], xt: [0, 100, 200, 300, 400, 500, 600].map((v) => ({ v, s: String(v) })), yt: [0, 0.5, 1, 1.5, 2, 2.5].map((v) => ({ v, s: String(v) })) });
      const rec = S.rec.gay, pfn = (Tk) => Tk / 300;
      if (rec.length >= 3) {
        const ts = rec.map((q) => q.T), tmin = Math.min.apply(null, ts), tmax = Math.max.apply(null, ts);
        clipPlot(g, () => {
          polyline(g, (x) => x, pfn, tmin, lerp(tmin, tmax, S.fit.gay), 2, 'rgba(124,58,237,.7)', 3.4);
          polyline(g, (x) => x, pfn, tmin, lerp(tmin, 0, S.fit.gay), 30, 'rgba(226,70,75,.8)', 3, [7, 6]);
        });
        if (S.fit.gay > 0.97) { D.sphere(g.gx(0), g.gy(0), 5.5, BAD, { gloss: false, outline: '#fff', outlineWidth: 1.5 }); D.label(g.gx(0) + 12, g.gy(0) - 20, '원점을 지나요', { size: 13, bg: BAD, align: 'left' }); }
      }
      drawPoints(g, rec, (q) => [q.T, q.P], PUR);
      marker(g, s.T, s.P);
      S.gpos = { g };
    } else {
      const g = graph(GR, { x0: 0, x1: 2.2, y0: 0, y1: 55, title: 'V–n 그래프 (300 K, 1.00 atm 일정)', yl: 'V (L)', xl: [{ s: 'n (mol)' }], xt: [0, 0.5, 1, 1.5, 2].map((v) => ({ v, s: String(v) })), yt: [0, 10, 20, 30, 40, 50].map((v) => ({ v, s: String(v) })) });
      const rec = S.rec.mole;
      if (rec.length >= 3) {
        const ns = rec.map((q) => q.n), nmax = Math.max.apply(null, ns);
        clipPlot(g, () => polyline(g, (x) => x, (x) => 24.6 * x, 0, nmax * S.fit.mole, 2, 'rgba(124,58,237,.7)', 3.4));
      }
      drawPoints(g, rec, (q) => [q.n, q.V], PUR);
      marker(g, s.n, s.V);
      S.gpos = { g };
    }
    void t;
  }
  function drawTable() {
    const key = curKey(), rec = S.rec[key];
    panel(TB.x, TB.y, TB.w, TB.h, 14);
    T(TB.x + 14, TB.y + 21, '📋 기록표', 14.5, INK, 'left', 800);
    T(TB.x + TB.w - 14, TB.y + 21, rec.length + ' / 6개', 13, MUTED, 'right', 700);
    const rows = key === 'boyle' ? [['P (atm)', (q) => f2(q.P)], ['V (L)', (q) => f2(q.V)], ['P × V', (q) => f1(q.P * q.V)]]
      : key === 'charles' ? [['T (°C)', (q) => String(q.C)], ['T (K)', (q) => String(q.T)], ['V (L)', (q) => f2(q.V)], ['V / T', (q) => f3(q.V / q.T)]]
        : key === 'gay' ? [['T (°C)', (q) => String(q.C)], ['T (K)', (q) => String(q.T)], ['P (atm)', (q) => f2(q.P)], ['P / T', (q) => (q.P / q.T).toFixed(4)]]
          : [['기체', (q) => KINDS[q.kind].name], ['n (mol)', (q) => f2(q.n)], ['V (L)', (q) => f2(q.V)], ['V / n', (q) => f1(q.V / q.n)]];
    const lw = PHONE ? 78 : 66, cw = (TB.w - lw - 12) / 6, rh = PHONE ? 25 : 23, y0 = TB.y + (PHONE ? 46 : 44);
    rows.forEach((rw, i) => {
      const y = y0 + i * rh;
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(124,58,237,.05)'; ctx.fillRect(TB.x + 6, y - 15, TB.w - 12, rh); }
      T(TB.x + 12, y, rw[0], 13, MUTED, 'left', 800);
      for (let j = 0; j < 6; j++) {
        const q = rec[j], x = TB.x + lw + 6 + cw * (j + 0.5);
        if (q) { const pa = RM ? 1 : clamp((S.t - q.born - 0.55) / 0.25, 0, 1); const tx = rw[1](q); T(x, y, tx, tx.length > 5 ? 11.5 : 13, i === rows.length - 1 ? '#b91c1c' : INK, 'center', 800, { alpha: pa }); }
        else T(x, y, '·', 13, '#c3ccd9', 'center', 700);
      }
    });
  }

  /* ================= ④ 하나의 식 ================= */
  const UROWS = [
    { law: '보일', P: 2.0, V: 6.15, n: 0.5, T: 300 },
    { law: '샤를', P: 1.0, V: 14.35, n: 0.5, T: 350 },
    { law: '게이뤼삭', P: 1.5, V: 12.3, n: 0.5, T: 450 },
    { law: '아보가드로', P: 1.0, V: 49.2, n: 2.0, T: 300 },
  ];
  const uVal = (q) => q.P * q.V / (q.n * q.T);
  const LAWS = [
    { id: 'boyle', name: '보일 법칙', fix: 'n, T 일정', f: 'PV = 일정' },
    { id: 'charles', name: '샤를 법칙', fix: 'n, P 일정', f: 'V/T = 일정' },
    { id: 'gay', name: '게이뤼삭 법칙', fix: 'n, V 일정', f: 'P/T = 일정' },
    { id: 'avo', name: '아보가드로 법칙', fix: 'P, T 일정', f: 'V/n = 일정' },
  ];
  const TRAY = [1, 3, 0, 2];            // 식 카드가 놓인 순서 (정답과 다르게)
  const UT = PHONE ? { x: 8, y: 50, w: 464, h: 282 } : { x: 12, y: 50, w: 776, h: 256 };
  const UC = PHONE ? { x: 8, y: 340, w: 464, h: 424 } : { x: 12, y: 314, w: 776, h: 234 };
  const slotRect = (i) => (PHONE ? { x: UC.x + 8 + (i % 2) * 232, y: UC.y + 38 + Math.floor(i / 2) * 112, w: 224, h: 104 } : { x: UC.x + 14 + i * 190, y: UC.y + 34, w: 180, h: 106 });
  const boxRect = (i) => { const s = slotRect(i); return { x: s.x + 8, y: s.y + s.h - 56, w: s.w - 16, h: 48 }; };
  const trayPos = (j) => (PHONE ? { x: UC.x + 16 + (j % 2) * 232, y: UC.y + 290 + Math.floor(j / 2) * 58, w: 208, h: 48 } : { x: UC.x + 22 + j * 190, y: UC.y + 158, w: 164, h: 48 });
  function initCards() {
    S.un.cards = TRAY.map((li, j) => { const p = trayPos(j); return { law: li, x: p.x, y: p.y, w: p.w, h: p.h, tx: p.x, ty: p.y, slot: -1, shake: 0, lift: 0 }; });
    S.un.placed = 0; S.un.msg = ''; S.un.drag = null;
  }
  function unifyAllOK() { return S.un.ok.every(Boolean); }
  const colUT = PHONE ? { lab: 0, P: 76, V: 130, n: 190, T: 236, r: 296 } : { lab: 0, P: 190, V: 290, n: 392, T: 490, r: 600 };
  function drawUnify(t) {
    const un = S.un;
    T(14, 26, '🧩 네 가지 자료를 한 식으로 묶어 봐요', PHONE ? 15 : 17, INK, 'left', 800);
    panel(UT.x, UT.y, UT.w, UT.h, 14);
    T(UT.x + 16, UT.y + 26, '📋 앞에서 모은 자료로 PV / (nT) 를 계산해요 (단위 atm·L/(mol·K))', 14.5, INK, 'left', 800);
    const hy = UT.y + 52;
    const hdr = PHONE ? ['자료', 'P (atm)', 'V (L)', 'n (mol)', 'T (K)', 'PV / (nT)'] : ['어떤 실험의 자료', 'P (atm)', 'V (L)', 'n (mol)', 'T (K)', 'PV / (nT)'];
    [colUT.lab, colUT.P, colUT.V, colUT.n, colUT.T, colUT.r].forEach((cx, i) => {
      const al = i === 0 ? 'left' : 'center', off = i === 0 ? UT.x + 16 : UT.x + 16 + cx + (PHONE ? 22 : 44);
      T(i === 5 ? UT.x + 16 + cx + (PHONE ? 50 : 70) : off, hy, hdr[i], 13, MUTED, i === 5 && PHONE ? 'center' : al, 800);
    });
    UROWS.forEach((q, i) => {
      const y = hy + 14 + i * (PHONE ? 38 : 33);
      D.roundRect(UT.x + 8, y - 4, UT.w - 16, PHONE ? 34 : 30, 10); ctx.fillStyle = un.ok[i] ? 'rgba(20,160,88,.10)' : i % 2 ? 'rgba(124,58,237,.04)' : 'rgba(124,58,237,.08)'; ctx.fill();
      T(UT.x + 16, y + (PHONE ? 19 : 17), (PHONE ? '' : (i + 1) + '. ') + q.law + (PHONE ? '' : ' 법칙의 자료'), 14, INK, 'left', 800);
      const off = PHONE ? 22 : 44;
      [['P', f2(q.P)], ['V', f2(q.V)], ['n', f2(q.n)], ['T', String(q.T)]].forEach(([c, v]) => T(UT.x + 16 + colUT[c] + off, y + (PHONE ? 19 : 17), v, 14.5, INK, 'center', 800));
      const rx = UT.x + 16 + colUT.r + (PHONE ? 50 : 70);
      if (un.ok[i]) { T(rx - 12, y + (PHONE ? 19 : 17), f3(uVal(q)), 16, '#14803f', 'center', 800); D.check(rx + 30, y + (PHONE ? 13 : 11), 9, 1, { color: GOOD }); }
      else T(rx, y + (PHONE ? 19 : 17), un.val[i] === un.val[i] ? '다시 계산해요' : '?', 14, un.val[i] === un.val[i] ? BAD : '#9aa5b6', 'center', 800);
    });
    // R 이름 붙이기
    un.banner = SciSim.approach(un.banner, unifyAllOK() ? 1 : 0, 1 / 60, 5);
    const by = UT.y + UT.h - 54;
    if (un.banner > 0.02) {
      const a = un.banner, sc = 0.9 + 0.1 * Math.min(1, a * 1.1);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(UT.x + UT.w / 2, by + 22); ctx.scale(sc, sc);
      D.shadow(() => { D.roundRect(-(UT.w / 2 - 14), -22, UT.w - 28, 46, 14); ctx.fillStyle = '#fff7d6'; ctx.fill(); }, { blur: 8, y: 2 });
      ctx.strokeStyle = '#e0a100'; ctx.lineWidth = 2.5; D.roundRect(-(UT.w / 2 - 14), -22, UT.w - 28, 46, 14); ctx.stroke();
      T(0, -1, PHONE ? '값이 모두 같아요: R = 0.082' : '값이 모두 같아요 → 기체 상수 R = 0.082 atm·L/(mol·K)', PHONE ? 14 : 16, '#92400e', 'center', 800);
      T(0, 18, 'PV / (nT) = R   →   PV = nRT', 16, '#7c3aed', 'center', 800);
      ctx.restore();
    } else T(UT.x + UT.w / 2, by + 28, '네 줄을 모두 계산하면 같은 값이 나와요', 14, '#9aa5b6', 'center', 700);
    // 법칙 카드 맞추기
    panel(UC.x, UC.y, UC.w, UC.h, 14);
    T(UC.x + 16, UC.y + 26, '🃏 법칙에 알맞은 식 카드를 끌어다 놓아요', 14.5, INK, 'left', 800);
    LAWS.forEach((lw, i) => {
      const s = slotRect(i), b = boxRect(i), done = un.cards.some((c) => c.slot === i);
      D.shadow(() => { D.roundRect(s.x, s.y, s.w, s.h, 14); ctx.fillStyle = done ? '#f1fbf5' : '#faf8ff'; ctx.fill(); }, { blur: 4, y: 1 });
      ctx.strokeStyle = done ? GOOD : '#d6c9f5'; ctx.lineWidth = done ? 2.6 : 1.6; D.roundRect(s.x, s.y, s.w, s.h, 14); ctx.stroke();
      T(s.x + 12, s.y + 24, lw.name, 15, INK, 'left', 800);
      T(s.x + 12, s.y + 44, lw.fix, 13.5, AMB, 'left', 800);
      if (!done) { ctx.save(); ctx.strokeStyle = '#b7a6ee'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; D.roundRect(b.x, b.y, b.w, b.h, 10); ctx.stroke(); ctx.restore(); }
      if (!done && un.drag && un.drag.over === i) { ctx.fillStyle = 'rgba(124,58,237,.10)'; D.roundRect(b.x, b.y, b.w, b.h, 10); ctx.fill(); }
    });
    T(UC.x + 16, UC.y + (PHONE ? 276 : 152), '식 카드 (끌어서 옮겨요)', 13, MUTED, 'left', 800);
    un.cards.forEach((c, j) => {
      void j;
      if (un.drag && un.drag.card === c) return;
      drawCard(c, false);
    });
    if (un.drag) drawCard(un.drag.card, true);
    const msg = un.msg || (un.placed === 4 ? '모두 맞췄어요! 네 법칙은 PV = nRT에서 일정하게 두는 양만 다른 것이에요.' : '일정하게 두는 양을 보고, 그 조건에서 일정한 식을 찾아요.');
    textBlock(UC.x + 16, UC.y + UC.h - 14 - (wrap(msg, UC.w - 32, 13.5, 800).length - 1) * 18, UC.w - 32, msg, 13.5, un.placed === 4 ? '#14803f' : un.msg ? BAD : MUTED, 18, 800);
    void t;
  }
  function drawCard(c, lifted) {
    const lw = LAWS[c.law], l = c.lift;
    ctx.save(); const sx = c.x + c.w / 2 + (c.shake > 0 ? Math.sin(c.shake * 40) * 4 : 0), sy = c.y + c.h / 2;
    ctx.translate(sx, sy); const sc = 1 + 0.06 * l; ctx.scale(sc, sc);
    const placed = c.slot >= 0;
    D.shadow(() => { D.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12); ctx.fillStyle = placed ? '#e6f8ee' : '#fff'; ctx.fill(); }, { blur: 4 + 12 * l, y: 2 + 6 * l });
    ctx.strokeStyle = placed ? GOOD : lifted ? PUR : '#a78bfa'; ctx.lineWidth = placed ? 2.6 : 2.2; D.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12); ctx.stroke();
    T(0, 7, lw.f, PHONE ? 17 : 18, placed ? '#14803f' : '#4c1d95', 'center', 800);
    ctx.restore();
  }
  function cardAt(p) {
    for (let i = S.un.cards.length - 1; i >= 0; i--) { const c = S.un.cards[i]; if (c.slot < 0 && p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return c; }
    return null;
  }
  function slotAt(p) { for (let i = 0; i < 4; i++) { const s = slotRect(i); if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) return i; } return -1; }
  function dropCard(c, i) {
    const un = S.un, home = trayPos(un.cards.indexOf(c));
    if (i < 0 || un.cards.some((o) => o.slot === i)) { c.tx = home.x; c.ty = home.y; return false; }
    if (c.law === i) {
      const b = boxRect(i); c.slot = i; c.tx = b.x + (b.w - c.w) / 2; c.ty = b.y;
      un.placed++; un.msg = ''; Sound.success(); parts.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 12, speed: 120, size: 3, colors: ['#ffb400', '#14a058', '#8b5cf6'] });
      return true;
    }
    c.tx = home.x; c.ty = home.y; c.shake = 0.35; Sound.fail();
    un.msg = LAWS[i].name + '은 ' + LAWS[i].fix + '으로 둔 실험이에요. 이 식은 그 조건에서 일정한 식이 아니에요. 다시 생각해 봐요.';
    return false;
  }
  function stepUnify(dt) {
    const un = S.un;
    un.cards.forEach((c) => {
      const dragging = un.drag && un.drag.card === c;
      if (!dragging) { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); }
      c.lift = SciSim.approach(c.lift, dragging ? 1 : 0, dt, 16); c.shake = Math.max(0, c.shake - dt);
    });
  }
  function resetCards() { initCards(); }
  UROWS.forEach((q, i) => {
    const inp = $('#inU' + i);
    inp.addEventListener('input', () => {
      const v = parseNum(inp.value), was = S.un.ok[i];
      S.un.val[i] = v; S.un.ok[i] = near(v, 0.082, 0.0015);
      inp.classList.remove('ok', 'bad');
      if (S.un.ok[i]) { inp.classList.add('ok'); if (!was) { Sound.success(); parts.burst(UT.x + UT.w - 80, UT.y + 78 + i * 38, { count: 10, speed: 110, size: 2.8, colors: ['#14a058', '#8b5cf6', '#ffb400'] }); } }
      else if (!isNaN(v) && inp.value.length >= 4) inp.classList.add('bad');
    });
  });
  $('#cardReset').addEventListener('click', () => { Sound.click(); resetCards(); });

  /* ================= 컨트롤 ================= */
  const cRange = () => (S.sub.temp === 'charles' ? [-23, 127] : [27, 327]);
  const cChipSet = () => (S.sub.temp === 'charles' ? [-23, 27, 77, 127] : [27, 177, 327]);
  let chipKey = '';
  function buildChips() {
    const key = S.sub.temp;
    if (chipKey !== key) {
      chipKey = key; const box = $('#cChips'); box.innerHTML = '';
      cChipSet().forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = c; b.textContent = sgn(c) + ' °C (' + (c + KEL) + ' K)'; box.appendChild(b); });
      const r = cRange(), sl = $('#sC'); sl.min = r[0]; sl.max = r[1];
    }
  }
  [1, 2, 3, 6].forEach((p) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = p; b.textContent = p + ' atm'; $('#pChips').appendChild(b); });
  [0.25, 0.5, 1, 2].forEach((n) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = n; b.textContent = n.toFixed(2) + ' mol'; $('#nChips').appendChild(b); });
  [['he', 'He (헬륨)'], ['n2', 'N₂ (질소)'], ['co2', 'CO₂']].forEach(([k, n]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = n; $('#kindChips').appendChild(b); });

  function updateCtl() {
    buildChips();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      if (on && n.hasAttribute('data-nolock')) on = !S.lock;
      n.hidden = !on;
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#tmSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.temp));
    const s = st();
    $('#oV').textContent = f2(S.bV) + ' L'; $('#sV').value = Math.round(S.bV * 20);
    $$('#pChips button').forEach((b) => b.classList.toggle('on', Math.abs(NRT0 / S.bV - +b.dataset.v) < 0.004));
    const Cn = S.sub.temp === 'charles' ? S.ch.C : S.gl.C;
    $('#oC').textContent = sgn(Cn) + ' °C (' + (Cn + KEL) + ' K)'; $('#sC').value = Cn;
    $$('#cChips button').forEach((b) => b.classList.toggle('on', +b.dataset.v === Cn));
    $('#cMinus').disabled = Cn <= cRange()[0]; $('#cPlus').disabled = Cn >= cRange()[1];
    const ext = S.ch.extP > EXT_OK;
    $('#bExt').disabled = S.rec.charles.length < 2 || S.ch.ext;
    $('#bExt').textContent = S.ch.ext ? '🔭 −273 °C까지 늘렸어요' : '🔭 직선 늘리기 (외삽)';
    $('#kScaleHead').hidden = !ext; $('#kSeg').hidden = !ext;
    $$('#kSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'k') === S.ch.kmode));
    $('#oN').textContent = f2(S.mo.n) + ' mol'; $('#sN').value = Math.round(S.mo.n / PART);
    $$('#nChips button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.v - S.mo.n) < 0.001));
    $$('#kindChips button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.mo.kind); b.classList.toggle('done', !!S.mo.kinds[b.dataset.v]); });
    $('#nMinus').disabled = S.mo.n <= 0.25 + 1e-9; $('#nPlus').disabled = S.mo.n >= 2 - 1e-9;
    $('#vMinus').disabled = S.bV <= 2 + 1e-9; $('#vPlus').disabled = S.bV >= 15 - 1e-9;
    const key = curKey(), nrec = S.rec[key].length;
    $('#recBtn').disabled = nrec >= 6;
    $('#recNote').textContent = nrec >= 6 ? '기록 칸이 가득 찼어요. 지우기를 눌러요.' : '지금의 값을 표와 그래프에 기록해요. (' + nrec + ' / 6)';
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    void s;
  }
  function setMode(m, instant) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); }
    S.mode = m; S.gpos = null;
    const s = st(); A.V = s.V; A.T = s.T; A.P = s.P;
    syncParts(true); updateCtl(); void instant;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#tmSub').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sub.temp = b.dataset.v; setMode('temp'); });

  const setBV = (v) => { S.bV = clamp(Math.round(v * 20) / 20, 2, 15); updateCtl(); };
  $('#sV').addEventListener('input', (e) => setBV(+e.target.value / 20));
  $('#vMinus').addEventListener('click', () => { Sound.tick(); setBV(S.bV - 0.05); });
  $('#vPlus').addEventListener('click', () => { Sound.tick(); setBV(S.bV + 0.05); });
  $('#pChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); setBV(NRT0 / +b.dataset.v); });
  const setC = (c) => { const r = cRange(); c = clamp(Math.round(c), r[0], r[1]); if (S.sub.temp === 'charles') S.ch.C = c; else S.gl.C = c; updateCtl(); };
  $('#sC').addEventListener('input', (e) => setC(+e.target.value));
  $('#cMinus').addEventListener('click', () => { Sound.tick(); setC((S.sub.temp === 'charles' ? S.ch.C : S.gl.C) - 1); });
  $('#cPlus').addEventListener('click', () => { Sound.tick(); setC((S.sub.temp === 'charles' ? S.ch.C : S.gl.C) + 1); });
  $('#cChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); setC(+b.dataset.v); });
  const setN = (n) => { S.mo.n = clamp(Math.round(n / PART) * PART, 0.25, 2); S.mo.n = Math.round(S.mo.n * 100) / 100; syncParts(false); updateCtl(); };
  $('#sN').addEventListener('input', (e) => setN(+e.target.value * PART));
  $('#nMinus').addEventListener('click', () => { Sound.tick(); setN(S.mo.n - PART); });
  $('#nPlus').addEventListener('click', () => { Sound.tick(); setN(S.mo.n + PART); });
  $('#nChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); setN(+b.dataset.v); });
  $('#kindChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.mo.kind = b.dataset.v; S.mo.kinds[b.dataset.v] = true; PS.forEach((p) => { p.kind = b.dataset.v; }); updateCtl(); });
  $('#bExt').addEventListener('click', () => {
    if (S.rec.charles.length < 2) { showHint('먼저 점을 2개 이상 기록해요.', 3000); return; }
    Sound.success(); S.ch.ext = true; updateCtl();
  });
  $('#kSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.ch.kmode = b.dataset.v === 'k'; if (S.ch.kmode) S.ch.kUsed = true; updateCtl(); });

  /* 기록 */
  function recordNow() {
    const key = curKey(), rec = S.rec[key], s = st();
    if (rec.length >= 6) { showHint('기록 칸이 가득 찼어요. 지우기를 눌러요.', 3000); return false; }
    const ox = CYL.x + CYL.w / 2, oy = CYL.bot - A.V * kOf() - 8;
    let q;
    if (key === 'boyle') {
      if (rec.some((r) => Math.abs(r.V - s.V) / s.V < 0.08)) { showHint('비슷한 부피를 이미 기록했어요. 피스톤을 더 움직여 봐요.', 3200); Sound.fail(); return false; }
      q = { V: s.V, P: s.P };
    } else if (key === 'charles') {
      if (rec.some((r) => Math.abs(r.C - S.ch.C) < 10)) { showHint('비슷한 온도를 이미 기록했어요. 온도를 더 바꿔 봐요.', 3200); Sound.fail(); return false; }
      q = { C: S.ch.C, T: s.T, V: s.V };
    } else if (key === 'gay') {
      if (rec.some((r) => Math.abs(r.C - S.gl.C) < 25)) { showHint('비슷한 온도를 이미 기록했어요. 온도를 더 바꿔 봐요.', 3200); Sound.fail(); return false; }
      q = { C: S.gl.C, T: s.T, P: s.P };
    } else {
      if (rec.some((r) => Math.abs(r.n - s.n) < 0.001 && r.kind === s.kind)) { showHint('같은 기체의 같은 몰수를 이미 기록했어요.', 3200); Sound.fail(); return false; }
      q = { n: s.n, V: s.V, kind: s.kind };
    }
    q.born = S.t; q.ox = ox; q.oy = oy; rec.push(q);
    Sound.tick(); updateCtl(); return true;
  }
  function clearRec(key) { key = key || curKey(); S.rec[key] = []; S.fit[key] = 0; if (key === 'charles') { S.ch.ext = false; S.ch.extP = 0; S.ch.kmode = false; S.ch.kUsed = false; S.ch.kP = 0; } updateCtl(); }
  $('#recBtn').addEventListener('click', recordNow);
  $('#clearBtn').addEventListener('click', () => { Sound.click(); clearRec(); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.mode === 'boyle') { S.bV = 12.3; clearRec('boyle'); }
    else if (S.mode === 'temp') { if (S.sub.temp === 'charles') S.ch.C = 27; else S.gl.C = 27; clearRec(); }
    else if (S.mode === 'mole') { S.mo.n = 0.5; clearRec('mole'); syncParts(false); }
    else { resetCards(); }
    updateCtl();
  });

  /* ---------- 입력 (피스톬 끌기, 카드 끌기) ---------- */
  function pistonRect() {
    const k = kOf(), gasTop = CYL.bot - A.V * k, py = gasTop - 14, hy = py - 38;
    return { x: CYL.x - 4, y: hy - 16, w: CYL.w + 8, h: py + 14 - (hy - 16) };
  }
  S.drag = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'boyle') {
        const r = pistonRect();
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { S.drag = { dy: p.y - (CYL.bot - A.V * kOf()) }; Sound.click(); return true; }
        return false;
      }
      if (S.mode === 'unify') {
        const c = cardAt(p); if (!c) return false;
        S.un.drag = { card: c, ox: p.x - c.x, oy: p.y - c.y, over: -1 }; S.un.msg = ''; Sound.click(); return true;
      }
      return false;
    },
    move(p) {
      if (S.mode === 'boyle' && S.drag) { setBV((CYL.bot - (p.y - S.drag.dy)) / kOf()); return; }
      const d = S.un.drag; if (d) { d.card.x = clamp(p.x - d.ox, 0, VW - d.card.w); d.card.y = clamp(p.y - d.oy, 0, VH - d.card.h); d.over = slotAt(p); }
    },
    up(p) {
      if (S.drag) { S.drag = null; return; }
      const d = S.un.drag; if (d) { S.un.drag = null; dropCard(d.card, slotAt(p)); }
    },
    hover(p) {
      if (S.mode === 'boyle') { const r = pistonRect(); return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h ? 'grab' : 'default'; }
      if (S.mode === 'unify') return cardAt(p) ? 'grab' : 'default';
      return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    const s = st(), key = curKey(); let L1, a, L2, b, L3, c;
    if (S.mode === 'unify') {
      L1 = '계산한 줄'; a = S.un.ok.filter(Boolean).length + ' / 4'; L2 = '기체 상수 R'; b = unifyAllOK() ? '0.082 atm·L/(mol·K)' : '아직 몰라요'; L3 = '맞춘 식 카드'; c = S.un.placed + ' / 4';
    } else if (key === 'boyle') { L1 = '압력 P'; a = f2(s.P) + ' atm'; L2 = '부피 V'; b = f2(s.V) + ' L'; L3 = 'P × V'; c = f1(s.P * s.V) + ' atm·L'; }
    else if (key === 'charles') { L1 = '온도 T'; a = sgn(S.ch.C) + ' °C = ' + s.T + ' K'; L2 = '부피 V'; b = f2(s.V) + ' L'; L3 = 'V / T'; c = f3(s.V / s.T) + ' L/K'; }
    else if (key === 'gay') { L1 = '온도 T'; a = sgn(S.gl.C) + ' °C = ' + s.T + ' K'; L2 = '압력 P'; b = f2(s.P) + ' atm'; L3 = 'P / T'; c = (s.P / s.T).toFixed(4) + ' atm/K'; }
    else { L1 = '몰수 n'; a = f2(s.n) + ' mol (' + KINDS[s.kind].name + ')'; L2 = '부피 V'; b = f2(s.V) + ' L'; L3 = 'V / n'; c = f1(s.V / s.n) + ' L/mol'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const recDone = (key, n) => S.rec[key].length >= n;
  const mole3 = () => [0.25, 1, 2].every((n) => S.rec.mole.some((q) => Math.abs(q.n - n) < 0.001));
    const molKinds = () => { const set = {}; S.rec.mole.forEach((q) => { set[q.kind] = true; }); return Object.keys(set).length; };
  const levels = [
    {
      title: '압력과 부피: 피스톤 누르기', short: '압력·부피', icon: '🖐️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 압력 · 부피 · 온도 · 몰수, 네 가지가 모두 달라지는 기체를 한 식으로 말할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 온도가 일정할 때 기체의 압력이 커지면 부피가 줄어든다는 <b>보일 법칙</b>(반비례)과, 압력이 일정할 때 온도가 오르면 부피가 커진다는 <b>샤를 법칙</b>을 배웠어요. 이제 이 관계들을 <b>숫자 자료</b>로 다시 보고 하나로 묶어 봐요.</div>' +
        '<p>먼저 <b>온도(300 K)와 몰수(0.50 mol)를 잠그고</b> 피스톤을 눌러 압력과 부피의 관계를 찾아요. 점을 4개 기록해 그래프와 표를 만들어요.</p>' +
        '<p class="ctrl-note">🥽 실제 실험에서는 보호 안경을 쓰고, 밀폐한 용기를 직접 가열하지 않아요. 이 단원은 모의실험으로 진행해요.</p>',
      features: ['boyle'],
      setup() { S.lock = false; S.gate = ''; S.bV = 12.3; clearRec('boyle'); setMode('boyle'); },
      recap: '온도와 몰수가 일정할 때 압력 P와 부피 V는 반비례하고, P × V의 값은 일정(12.3 atm·L)해요. P–V 그래프는 곡선이고 P–1/V 그래프는 원점을 지나는 직선이에요.',
      summary: '<ul><li>온도 T와 몰수 n이 일정하면 <b>P × V = 일정</b> (보일 법칙). 이 실험에서는 PV = <b>12.3 atm·L</b></li><li>P–V 그래프는 <b>곡선(반비례)</b>, P–1/V 그래프는 <b>원점을 지나는 직선</b></li><li>부피가 줄어도 분자 수와 속도는 그대로예요. 같은 벽 면적에 분자가 <b>더 자주</b> 부딪혀서 압력이 커져요.</li><li>압력 단위 atm: 1 atm = 760 mmHg ≈ 1.01×10⁵ Pa</li></ul>',
      missions: [
        {
          title: 'P–V 점 4개 기록하기',
          goal: '피스톤을 움직여 압력과 부피가 <b>서로 다른 점 4개</b>를 <b>📍 기록하기</b>로 모아요.',
          hint: '오른쪽의 압력 단추(1, 2, 3, 6 atm)를 누르거나 주황색 손잡이를 끌어 부피를 바꿔요. 비슷한 부피는 다시 기록되지 않아요.',
          setup() { S.lock = true; S.gate = ''; S.bV = 12.3; clearRec('boyle'); setMode('boyle'); },
          check: () => recDone('boyle', 4), hold: 0.5,
          status: () => '기록 ' + S.rec.boyle.length + ' / 4 ' + mark(recDone('boyle', 4)),
          explain: '부피를 줄일수록 압력이 커지는 점들이 모였어요. 점을 이으면 P–V 그래프는 <b>곡선</b>이고, 가로축을 1/V로 바꾸면 <b>원점을 지나는 직선</b>이에요. 압력이 2배가 되면 부피는 1/2배가 돼요.',
        },
        {
          title: 'P × V의 값 읽기', manual: true,
          goal: '표에서 기록한 점마다 <b>P × V</b>를 계산한 값이 모두 같아요. 그 값을 <b>atm·L</b> 단위로 쓰고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '표의 맨 아랫줄이 P × V예요. 소수 첫째 자리까지 읽어요. 모든 점에서 같은 값이어야 해요.',
          setup() { S.lock = true; S.gate = 'pv'; $('#inPV').value = ''; $('#inPV').classList.remove('ok', 'bad'); updateCtl(); },
          check() {
            const v = parseNum($('#inPV').value);
            if (isNaN(v)) return 'P × V의 값을 숫자로 써 주세요. (단위 atm·L)';
            if (near(v, 12.3, 0.15)) { $('#inPV').classList.remove('bad'); $('#inPV').classList.add('ok'); return true; }
            $('#inPV').classList.add('bad');
            if (near(v, 12.3 * 2, 0.5) || near(v, 12.3 / 2, 0.3)) return '표의 P × V 줄을 다시 읽어 보세요. 한 점의 값이에요.';
            return '표의 맨 아랫줄(P × V) 값을 읽어 보세요. 모든 점에서 같은 값이에요.';
          },
          status: () => (isNaN(parseNum($('#inPV').value)) ? '값을 써 주세요' : '쓴 값 ' + $('#inPV').value + ' atm·L ' + mark(near(parseNum($('#inPV').value), 12.3, 0.15))),
          explain: '모든 점에서 P × V = <b>12.3 atm·L</b>로 같아요. 곱이 일정하다는 것은 P와 V가 <b>반비례</b>한다는 뜻이에요. (측정에서는 오차가 1 % 정도 있을 수 있어요.)',
        },
        {
          type: 'quiz', title: '압력이 커지는 까닭',
          goal: '피스톤을 눌러 부피를 <b>1/2</b>로 줄였더니 압력이 <b>2배</b>가 됐어요. 그 까닭은?',
          setup() { S.lock = true; S.gate = ''; setMode('boyle'); },
          choices: ['부피가 줄어들면서 분자 수가 절반으로 줄었기 때문이에요', '분자의 수와 속도는 그대로인데, 같은 벽에 분자가 더 자주 부딪히기 때문이에요', '분자 하나하나가 커졌기 때문이에요', '온도가 올라서 분자가 빨라졌기 때문이에요'],
          answer: 1,
          feedback: ['부피를 줄여도 용기 안의 분자 수는 그대로예요(몰수 n이 일정). 분자가 사라지지 않아요.', '', '분자의 크기는 변하지 않아요. 변한 것은 분자가 움직일 수 있는 공간이에요.', '이 실험에서는 온도가 300 K로 잠겨 있어요. 분자의 속도는 그대로예요.'],
          explain: '분자 수와 평균 속도(온도)가 그대로일 때 부피가 1/2이 되면 같은 벽 면적에 분자가 <b>2배 더 자주</b> 부딪혀요. 그래서 압력이 2배가 되고, 곱 PV는 일정해요.',
        },
      ],
    },
    {
      title: '온도: 부피와 압력은 어떻게 변할까?', short: '온도', icon: '🌡️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온도와 몰수가 일정하면 PV가 일정함을 찾았어요. 이번에는 <b>온도</b>를 바꿔요. 먼저 <b>압력을 고정</b>하고 부피 변화를, 다음에 <b>부피를 고정</b>하고 압력 변화를 기록해요.</div>' +
        '<p>점을 이은 직선을 왼쪽으로 늘리면(<b>외삽</b>) 부피가 0이 되는 온도가 나와요. 그 온도가 <b>절대 영도(−273 °C)</b>이고, 여기서 <b>켈빈 눈금</b>이 시작돼요. <b>T(K) = t(°C) + 273</b>이에요.</p>',
      features: ['temp'],
      setup() { S.lock = false; S.gate = ''; S.sub.temp = 'charles'; S.ch.C = 27; clearRec('charles'); setMode('temp'); },
      recap: '압력이 일정하면 V ∝ T(K)이고, 부피가 일정하면 P ∝ T(K)예요. 직선을 외삽하면 −273 °C(0 K)에서 부피와 압력이 0이 돼요. 그래서 기체 법칙의 온도는 켈빈(K)으로 써요.',
      summary: '<ul><li><b>샤를 법칙</b>: n, P 일정 → <b>V/T = 일정</b> (이 실험 0.041 L/K). V–t(°C) 직선을 외삽하면 V = 0이 <b>−273 °C</b></li><li><b>게이뤼삭 법칙</b>: n, V 일정 → <b>P/T = 일정</b>. 300 K → 450 K → 600 K에서 P = 1.0 → 1.5 → 2.0 atm</li><li>절대 온도 <b>T(K) = t(°C) + 273</b>. 기체 법칙의 T는 항상 켈빈 온도</li><li>예) 27 °C(300 K) → 54 °C(327 K)에서 부피는 2배가 아니라 <b>327/300 ≈ 1.09배</b></li></ul>',
      missions: [
        {
          title: 'V–T 점 4개 기록하고 −273 °C 찾기',
          goal: '압력 1 atm 고정: 온도를 바꿔 <b>점 4개</b>를 기록하고, <b>🔭 직선 늘리기</b>로 부피가 0이 되는 곳을 찾은 뒤 <b>켈빈 눈금</b>으로 바꿔요.',
          hint: '온도 단추(−23, 27, 77, 127 °C)로 4점을 기록해요. 그다음 직선 늘리기를 누르면 점선이 −273 °C까지 뻗어요. 이어서 나타나는 가로 눈금 단추에서 켈빈을 골라요.',
          setup() { S.lock = true; S.gate = ''; S.sub.temp = 'charles'; S.ch.C = 27; clearRec('charles'); setMode('temp'); },
          check: () => recDone('charles', 4) && S.ch.extP > EXT_OK && S.ch.kUsed && S.ch.kmode, hold: 0.8,
          status: () => '기록 ' + S.rec.charles.length + ' / 4 ' + mark(recDone('charles', 4)) + ' &nbsp; 외삽 ' + mark(S.ch.extP > EXT_OK) + ' &nbsp; 켈빈 눈금 ' + mark(S.ch.kUsed && S.ch.kmode),
          explain: '압력이 일정할 때 부피는 온도(°C)에 대해 직선으로 늘어요. 직선을 늘리면 <b>−273 °C</b>에서 V = 0이에요. 이 온도를 0으로 하는 <b>켈빈 눈금</b>으로 바꾸면 그래프가 원점을 지나는 직선이 되어 <b>V/T = 일정(0.041 L/K)</b>이에요.',
        },
        {
          title: 'P–T 점 3개 기록하기',
          goal: '이번에는 <b>부피 12.3 L를 고정</b>하고 온도를 바꿔 압력이 달라지는 점 <b>3개</b>를 기록해요.',
          hint: '온도 단추(27, 177, 327 °C)를 눌러 300 K, 450 K, 600 K에서 기록해요. 압력이 어떻게 변하는지 바늘을 지켜봐요.',
          setup() { S.lock = true; S.gate = ''; S.sub.temp = 'gay'; S.gl.C = 27; clearRec('gay'); setMode('temp'); },
          check: () => recDone('gay', 3), hold: 0.5,
          status: () => '기록 ' + S.rec.gay.length + ' / 3 ' + mark(recDone('gay', 3)),
          explain: '부피가 일정할 때 온도를 300 K → 450 K → 600 K로 올리면 압력은 1.0 → 1.5 → 2.0 atm으로 <b>켈빈 온도에 비례</b>해요. 분자가 더 빠르고 센 충돌을 하기 때문이에요. 점을 이으면 원점을 지나는 직선이에요.',
        },
        {
          type: 'quiz', title: '27 °C에서 54 °C로 가열하면?',
          goal: '압력과 몰수가 일정한 기체를 <b>27 °C에서 54 °C</b>로 가열하면 부피는?',
          setup() { S.lock = true; S.gate = ''; S.sub.temp = 'charles'; setMode('temp'); },
          choices: ['27 °C의 2배가 돼요', '약 1.09배가 돼요 (300 K → 327 K)', '변하지 않아요', '약 1.5배가 돼요'],
          answer: 1,
          feedback: ['부피는 섭씨 온도에 비례하지 않아요. 켈빈 온도에 비례해요.', '', '압력이 일정하면 온도가 오를 때 부피가 커져요.', '섭씨 숫자(27, 54)가 아니라 켈빈 온도(300 K, 327 K)의 비로 구해야 해요.'],
          explain: '기체의 부피는 <b>켈빈 온도</b>에 비례해요. 27 °C = 300 K, 54 °C = 327 K이므로 부피는 327/300 ≈ <b>1.09배</b>예요. 섭씨 숫자의 비(2배)를 쓰면 안 돼요.',
        },
      ],
    },
    {
      title: '몰수: 분자를 넣어 부피 바꾸기', short: '몰수', icon: '➕', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 압력과 온도가 부피와 압력에 어떤 영향을 주는지 알았어요. 이제 마지막 변수인 <b>몰수</b>를 바꿔요. 온도(300 K)와 압력(1.00 atm)은 고정이에요.</div>' +
        '<p>분자를 넣으면 피스톤이 올라가요. <b>부피 ÷ 몰수</b>가 어떻게 되는지 보고, 기체의 <b>종류(He, N₂, CO₂)</b>를 바꿔도 같은지 확인해요. (입자 한 개 = 0.05 mol)</p>' +
        '<p>앞서 배운 <b>아보가드로 법칙</b>(같은 온도·압력에서 같은 부피에는 같은 수의 분자)을 정량으로 확인하는 거예요.</p>',
      features: ['mole'],
      setup() { S.lock = false; S.gate = ''; S.mo.n = 0.5; S.mo.kind = 'n2'; S.mo.kinds = {}; clearRec('mole'); setMode('mole'); },
      recap: '온도와 압력이 일정할 때 기체의 부피는 몰수에 비례해요(V/n = 24.6 L/mol). 기체의 종류가 달라도 같은 몰수는 같은 부피를 차지해요.',
      summary: '<ul><li><b>아보가드로 법칙</b>: T, P 일정 → <b>V/n = 일정</b>. 300 K, 1 atm에서 <b>24.6 L/mol</b></li><li>n = 0.25, 1.0, 2.0 mol → V = 6.15, 24.6, 49.2 L</li><li>기체의 부피는 분자의 종류(크기, 질량)가 아니라 <b>분자 수(몰수)</b>가 정해요.</li><li>가벼운 He는 빨리 움직이고 무거운 CO₂는 느리지만, 압력은 같아요.</li></ul>',
      missions: [
        {
          title: '몰수 0.25 · 1.0 · 2.0 mol에서 부피 기록하기',
          goal: '<b>n = 0.25, 1.0, 2.0 mol</b>에서 부피를 기록하세요. 기체 종류는 <b>2가지 이상</b> 사용해요.',
          hint: '몰수 단추를 누르거나 + 단추로 분자를 하나씩 넣어요. 기체 종류 단추로 He나 CO₂로 바꿔서도 기록해 봐요. 같은 몰수는 같은 부피예요.',
          setup() { S.lock = true; S.gate = ''; S.mo.n = 0.5; S.mo.kind = 'n2'; S.mo.kinds = { n2: true }; clearRec('mole'); setMode('mole'); },
          check: () => mole3() && molKinds() >= 2, hold: 0.6,
          status: () => '0.25 ' + mark(S.rec.mole.some((q) => Math.abs(q.n - 0.25) < 0.001)) + ' 1.0 ' + mark(S.rec.mole.some((q) => Math.abs(q.n - 1) < 0.001)) + ' 2.0 ' + mark(S.rec.mole.some((q) => Math.abs(q.n - 2) < 0.001)) + ' &nbsp; 기체 ' + molKinds() + ' / 2종',
          explain: '몰수가 2배가 되면 부피도 2배가 돼요. <b>V/n = 24.6 L/mol</b>로 일정해요(300 K, 1 atm). 기체의 종류를 바꿔도 같은 몰수의 부피는 같아요.',
        },
        {
          type: 'quiz', title: 'He 대신 CO₂를 넣으면?',
          goal: '같은 온도와 압력에서 풍선에 <b>He 대신 같은 몰수의 CO₂</b>를 넣으면 부피는?',
          setup() { S.lock = true; S.gate = ''; setMode('mole'); },
          choices: ['CO₂ 분자가 더 크고 무거워서 부피가 커져요', 'He 풍선과 부피가 같아요', 'CO₂가 무거워서 부피가 작아져요', '압력이 달라져서 알 수 없어요'],
          answer: 1,
          feedback: ['분자 자체의 크기는 분자 사이의 빈 공간에 비해 매우 작아서 부피에 거의 영향이 없어요.', '', '질량이 달라도 같은 몰수(분자 수)면 같은 부피예요.', '압력은 1.00 atm으로 같다고 했어요. 같은 조건에서 비교해요.'],
          explain: '기체의 부피는 분자의 종류가 아니라 <b>분자 수(몰수)</b>에 비례해요. 같은 T, P에서 같은 몰수는 He든 CO₂든 같은 부피를 차지해요.',
        },
      ],
    },
    {
      title: '하나의 식: 세 법칙을 묶기', short: '하나의 식', icon: '🧩', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 압력·부피(PV 일정), 온도(V/T, P/T 일정), 몰수(V/n 일정)를 모두 찾았어요. 이제 이 관계를 <b>하나의 식</b>으로 묶어요.</div>' +
        '<p>네 가지 자료에서 <b>PV / (nT)</b>를 계산해 보세요. 모두 같은 값이 나오면 그 값에 이름을 붙일 수 있어요. 그다음 각 법칙이 이 식에서 <b>어떤 양을 고정</b>한 경우인지 카드로 맞춰요.</p>',
      features: ['unify'],
      setup() { S.lock = false; S.gate = ''; S.un.ok = [false, false, false, false]; S.un.val = [NaN, NaN, NaN, NaN]; for (let i = 0; i < 4; i++) { const e = $('#inU' + i); e.value = ''; e.classList.remove('ok', 'bad'); } initCards(); setMode('unify'); },
      recap: '모든 자료에서 PV/(nT) = 0.082 atm·L/(mol·K) = R(기체 상수)예요. 그래서 PV = nRT이고, 보일 · 샤를 · 게이뤼삭 · 아보가드로 법칙은 이 식에서 일부 양을 고정한 경우예요.',
      summary: '<ul><li><b>PV/(nT) = R = 0.082 atm·L/(mol·K)</b> → <b>PV = nRT</b> (T는 켈빈)</li><li>보일: n, T 고정 → PV = nRT = 일정</li><li>샤를: n, P 고정 → V/T = nR/P = 일정</li><li>게이뤼삭: n, V 고정 → P/T = nR/V = 일정</li><li>아보가드로: P, T 고정 → V/n = RT/P = 일정</li><li>예) 1 mol, 273 K, 1 atm → V = 1 × 0.082 × 273 / 1 ≈ <b>22.4 L</b></li></ul>',
      missions: [
        {
          title: 'PV / (nT) 계산하기', manual: true,
          goal: '표의 네 줄에서 <b>PV / (nT)</b>를 각각 계산해 쓰고 <b>✔ 확인하기</b>를 눌러요. 단위는 atm·L/(mol·K)예요.',
          hint: '예) 첫 줄: (2.00 × 6.15) / (0.50 × 300) = 12.3 / 150. 온도는 이미 켈빈이에요. 소수 셋째 자리까지 써요.',
          setup() { S.lock = true; S.gate = ''; setMode('unify'); },
          check() {
            const bad = S.un.ok.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
            if (!bad.length) return true;
            const i = bad[0];
            return isNaN(S.un.val[i]) ? (i + 1) + '번 줄의 값을 써 주세요.' : (i + 1) + '번 줄을 다시 계산해 보세요. P × V를 n × T로 나눠요.';
          },
          status: () => S.un.ok.map((o, i) => (i + 1) + '번 ' + mark(o)).join(' &nbsp; '),
          explain: '네 줄 모두 PV/(nT) = <b>0.082 atm·L/(mol·K)</b>예요. 압력, 부피, 몰수, 온도가 모두 달라도 이 값은 같아요. 이 값을 <b>기체 상수 R</b>이라 하고, <b>PV = nRT</b>로 써요.',
        },
        {
          title: '법칙과 식 카드 짝짓기', manual: true,
          goal: '<b>식 카드 4장</b>을 알맞은 법칙 칸으로 끌어다 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '법칙 칸의 "일정"이라는 조건을 봐요. PV = nRT에서 일정한 양을 한쪽으로 모으면 식이 나와요. 예) n, T가 일정하면 PV = nRT도 일정이에요.',
          setup() { S.lock = true; S.gate = ''; initCards(); setMode('unify'); },
          check: () => (S.un.placed >= 4 ? true : '카드 ' + S.un.placed + ' / 4장을 맞췄어요. 남은 카드를 끌어다 놓아요.'),
          status: () => '맞춘 카드 ' + S.un.placed + ' / 4 ' + mark(S.un.placed >= 4),
          explain: '<b>보일</b>(n, T 일정): PV = nRT 가 일정. <b>샤를</b>(n, P 일정): V/T = nR/P 가 일정. <b>게이뤼삭</b>(n, V 일정): P/T = nR/V 가 일정. <b>아보가드로</b>(P, T 일정): V/n = RT/P 가 일정이에요.',
        },
        {
          type: 'quiz', title: '0 °C, 1 atm에서 기체 1 mol의 부피',
          goal: 'R = 0.082 atm·L/(mol·K)일 때, <b>1 mol, 273 K, 1 atm</b>인 기체의 부피 V = nRT / P는?',
          setup() { S.lock = true; S.gate = ''; setMode('unify'); },
          choices: ['약 22.4 L', '약 0.082 L', '약 2.24 L', '약 273 L'],
          answer: 0,
          feedback: ['', 'R 하나만 쓴 값이에요. n, T를 곱하고 P로 나눠야 해요.', '자리를 확인해 봐요. 1 × 0.082 × 273 ÷ 1을 계산해요.', '온도 값(273)을 그대로 쓴 것 같아요. R(0.082)도 곱해야 해요.'],
          explain: 'V = nRT / P = 1 × 0.082 × 273 / 1 = <b>22.4 L</b>예요. 이전 단원에서 배운 "0 °C, 1 atm에서 기체 1 mol = 22.4 L"가 이 식의 한 경우예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-gas-variables', mount: '#game', badge: '기체 법칙 달인', homeHref: '../../index.html#hx',
    featureLabels: { boyle: '🖐️ 압력과 부피', temp: '🌡️ 온도 실험', mole: '➕ 몰수 실험', unify: '🧩 하나의 식' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  S.un.cards = [];
  initCards();
  setMode('boyle');
  function stepAll1(dt) {
    const s = st();
    A.V = SciSim.approach(A.V, s.V, dt, S.drag ? 24 : 9); if (Math.abs(A.V - s.V) < 0.002) A.V = s.V;
    A.T = SciSim.approach(A.T, s.T, dt, 7); if (Math.abs(A.T - s.T) < 0.05) A.T = s.T;
    A.P = SciSim.approach(A.P, s.P, dt, 9); if (Math.abs(A.P - s.P) < 0.002) A.P = s.P;
    S.kick = Math.max(0, S.kick - dt * 0.5 - S.kick * dt * 6);
    S.flash.forEach((f) => { f.age += dt; }); S.flash = S.flash.filter((f) => f.age < 0.22);
    S.shake = Math.max(0, S.shake - dt);
    stepParts(dt);
    // 그래프에 그려지는 선의 진행
    const tf = (key, ok, rate) => { S.fit[key] = SciSim.approach(S.fit[key], ok ? 1 : 0, dt, rate || 3); if (Math.abs(S.fit[key] - (ok ? 1 : 0)) < 0.004) S.fit[key] = ok ? 1 : 0; };
    tf('boyle', S.rec.boyle.length >= 4); tf('charles', S.rec.charles.length >= 2); tf('gay', S.rec.gay.length >= 3); tf('mole', S.rec.mole.length >= 3);
    S.ch.extP = SciSim.approach(S.ch.extP, S.ch.ext ? 1 : 0, dt, 2.2); if (Math.abs(S.ch.extP - (S.ch.ext ? 1 : 0)) < 0.004) S.ch.extP = S.ch.ext ? 1 : 0;
    S.ch.kP = SciSim.approach(S.ch.kP, S.ch.kmode ? 1 : 0, dt, 4); if (Math.abs(S.ch.kP - (S.ch.kmode ? 1 : 0)) < 0.003) S.ch.kP = S.ch.kmode ? 1 : 0;
    if (S.mode === 'unify') stepUnify(dt);
  }
  let lastFree = false, lastExt = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if ((S.lock || S.gate) && game && game.phase !== 'active') { S.lock = false; S.gate = ''; updateCtl(); }
    const ex = S.ch.extP > EXT_OK; if (ex !== lastExt) { lastExt = ex; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'unify') drawUnify(t);
    else {
      T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
      drawScene(t); drawGraphs(t); drawTable();
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, A, VW, VH, CYL, SC, GR, TB, UC, UT, st, setMode, setBV, setC, setN, recordNow, clearRec, kOf, initCards, trayPos, slotRect, boxRect, dropCard, resetCards, UROWS, LAWS, TRAY, pistonRect, PS: () => PS,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
