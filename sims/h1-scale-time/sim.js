/* =========================================================
   통합과학1 Ⅰ. 과학의 기초 - 시간의 규모 (단원 2차시)
   성취기준 [10통과1-01-01] 자연을 시간과 공간에서 기술할 수 있음을 알고, 길이와 시간 측정의 현대적 방법과
   다양한 규모의 측정 사례를 조사할 수 있다.
   ① 관찰: 시간 여행 (10⁻¹⁸ s ~ 10¹⁸ s)
   ② 실험: 시계의 발전 (진자 · 수정 진동자 · 세슘 원자시계)
   ③ 분석: 옛날 시간 재기 (나이테 · 빙하 코어 · 방사성 시계)
   ④ 적용: 시간 오차의 의미 (GPS 시계 오차 · 고속 카메라)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 860 : 560;
  const RM = SciSim.reduceMotion;
  const SUPD = { '.': '·', '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  const p10 = (n) => '10' + sup(n);
  const MINUS = '−';
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  function sci(v, d) { if (v === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(v))); const m = v / Math.pow(10, e); return (+m.toFixed(d == null ? 1 : d)) + '×10' + sup(e); }

  const FS = PHONE ? 1.2 : 1;
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f4f8fd' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();

  function koNum(v) {
    const r = (x) => String(+x.toPrecision(2));
    if (v >= 1e8) return r(v / 1e8) + '억';
    if (v >= 1e4) return r(v / 1e4) + '만';
    const q = r(v); return /^\d+$/.test(q) ? q.replace(/(\d)(?=(\d{3})+$)/g, '$1,') : q;
  }
  function eqT(e) {
    const s = Math.pow(10, e);
    if (e < -15) return koNum(s * 1e18) + ' as(아토초)';
    if (e < -12) return koNum(s * 1e15) + ' fs(펨토초)';
    if (e < -9) return koNum(s * 1e12) + ' ps(피코초)';
    if (e < -6) return koNum(s * 1e9) + ' ns(나노초)';
    if (e < -3) return koNum(s * 1e6) + ' µs(마이크로초)';
    if (e < 0) return koNum(s * 1e3) + ' ms(밀리초)';
    if (e < 1.78) return koNum(s) + ' 초';
    if (e < 3.55) return koNum(s / 60) + ' 분';
    if (e < 4.94) return koNum(s / 3600) + ' 시간';
    if (e < 7.5) return koNum(s / 86400) + ' 일';
    return koNum(s / 3.156e7) + ' 년';
  }
  const pTxt = (e) => { const r = Math.round(e * 10) / 10; return Math.abs(r - Math.round(r)) < 0.05 ? p10(Math.round(r) || 0) : '10' + sup((r < 0 ? '-' : '') + Math.abs(r).toFixed(1)); };

  /* ---------- 자료: 사건 (s) ---------- */
  const EVS = [
    { id: 'electron', e: -18, name: '전자의 운동', txt: '약 10⁻¹⁸ s (아토초)', note: '아토초 레이저로 전자의 움직임을 봐요.', ans: -18 },
    { id: 'chem', e: -15, name: '화학 반응', txt: '약 10⁻¹⁵ s (펨토초)', note: '펨토초 레이저로 결합이 만들어지는 순간을 봐요.', ans: -15 },
    { id: 'light', e: Math.log10(3.3e-9), name: '빛이 1 m 가는 시간', txt: '약 3.3×10⁻⁹ s', note: '빛의 속력은 약 3×10⁸ m/s예요.' },
    { id: 'fast', e: -4, name: '고속 카메라 1프레임', txt: '약 10⁻⁴ s', note: '1초에 1만 장을 찍는 카메라예요.' },
    { id: 'blink', e: -1, name: '눈 깜빡임', txt: '약 0.1 s', note: '눈을 한 번 깜빡이는 시간이에요.' },
    { id: 'heart', e: Math.log10(0.8), name: '심장 박동', txt: '약 0.8 s', note: '1분에 70~75번 뛰어요.' },
    { id: 'day', e: Math.log10(8.64e4), name: '하루', txt: '약 8.6×10⁴ s', note: '지구가 한 바퀴 자전하는 시간이에요.' },
    { id: 'year', e: Math.log10(3.16e7), name: '1년', txt: '약 3.2×10⁷ s', note: '지구가 태양을 한 바퀴 도는 시간이에요.' },
    { id: 'life', e: Math.log10(2.5e9), name: '사람의 수명', txt: '약 2.5×10⁹ s (80년)', note: '평생이 지수로는 약 9.4예요.' },
    { id: 'civ', e: Math.log10(1.6e11), name: '인류 문명', txt: '약 1.6×10¹¹ s (5000년)', note: '문자와 도시가 생긴 뒤의 시간이에요.' },
    { id: 'dino', e: Math.log10(2e15), name: '공룡 멸종', txt: '약 2×10¹⁵ s (6600만 년 전)', note: '큰 운석이 떨어진 때예요.' },
    { id: 'earth', e: Math.log10(1.4e17), name: '지구의 나이', txt: '약 1.4×10¹⁷ s (45억 년)', note: '암석 속 방사성 원소로 알아냈어요.' },
    { id: 'universe', e: Math.log10(4.4e17), name: '우주의 나이', txt: '약 4.4×10¹⁷ s (138억 년)', note: '빅뱅 이후 흐른 시간이에요.' },
  ];
  const EV = {}; EVS.forEach((o) => { EV[o.id] = o; });
  const T_MIN = -18, T_MAX = 18;

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'trip', sub: '', clock: 0, fade: 0,
    t: 0, tt: 0, minV: false, maxV: false, seen: new Set(), infoA: 1,
    pend: { L: 0.25, ph: 0, n: 0 },
    run: { state: 'idle', p: 0, done: false, count: 0, res: null },
    tree: { n: 10, counted: new Set(), seq: [], pulse: {}, done: false },
    ice: { d: 0, td: 0, seenOK: false },
    radio: { t: 0, tt: 0, atoms: [], frac: 1 },
    gps: { us: 3, tus: 3, ok: false, zoom: 3000 },
    cam: { fps: 30, state: 'idle', u: 0, n: 0, shown: 0, max: 0, play: 0, filmN: 0 },
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));

  /* ======================================================
     사건 그림
     ====================================================== */
  const R1 = rng(3);
  const BANG = Array.from({ length: 160 }, () => ({ a: R1() * 6.283, v: 0.2 + R1() * 0.8, s: 0.8 + R1() * 1.6 }));
  function person(x, yb, h, col, o) {
    o = o || {};
    const hr = h * 0.12;
    D.shadow(() => {
      ctx.fillStyle = '#94a3b8'; rr(x - h * 0.07, yb - h * 0.34, h * 0.06, h * 0.34, 3).fill(); rr(x + h * 0.01, yb - h * 0.34, h * 0.06, h * 0.34, 3).fill();
      ctx.fillStyle = col; rr(x - h * 0.12, yb - h * 0.72, h * 0.24, h * 0.4, h * 0.05).fill();
      ctx.fillStyle = col; rr(x - h * 0.19, yb - h * 0.7, h * 0.06, h * 0.3, 3).fill(); rr(x + h * 0.13, yb - h * 0.7, h * 0.06, h * 0.3, 3).fill();
    }, { blur: h * 0.05, y: h * 0.02, color: 'rgba(0,0,0,.3)' });
    D.sphere(x, yb - h * 0.72 - hr * 0.9, hr, '#fcd9b6');
    ctx.fillStyle = o.hair || '#3b2418'; ctx.beginPath(); ctx.arc(x, yb - h * 0.72 - hr * 1.0, hr * 1.02, Math.PI, 0); ctx.fill();
    if (o.cane) { ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + h * 0.26, yb - h * 0.42); ctx.lineTo(x + h * 0.24, yb); ctx.stroke(); }
  }
  function dinoShape(x, y, s, col) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.5, s * 0.3, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s * 0.4, y - s * 0.12); ctx.lineTo(x - s * 1.05, y + s * 0.18); ctx.lineTo(x - s * 0.35, y + s * 0.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + s * 0.28, y - s * 0.18); ctx.lineTo(x + s * 0.55, y - s * 0.72); ctx.lineTo(x + s * 0.72, y - s * 0.62); ctx.lineTo(x + s * 0.5, y - s * 0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + s * 0.72, y - s * 0.7, s * 0.2, s * 0.11, 0.2, 0, 6.3); ctx.fill();
    rr(x - s * 0.22, y + s * 0.2, s * 0.14, s * 0.42, 5).fill(); rr(x + s * 0.1, y + s * 0.2, s * 0.14, s * 0.42, 5).fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s * 0.78, y - s * 0.73, s * 0.022, 0, 6.3); ctx.fill();
  }
  /* 물방울이 튀는 장면 (u: 0~1) */
  function splash(x, y, w, u, t) {
    const wl = y + w * 0.18; // 수면
    const g = ctx.createLinearGradient(0, wl, 0, y + w * 0.5); g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, '#1d6fb8');
    ctx.fillStyle = g; ctx.fillRect(x - w / 2, wl, w, y + w * 0.5 - wl);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w / 2, wl); ctx.lineTo(x + w / 2, wl); ctx.stroke();
    if (u < 0.28) {
      const k = u / 0.28, dy = y - w * 0.42 + (wl - (y - w * 0.42) - w * 0.04) * k * k;
      ctx.fillStyle = '#bae6fd'; ctx.beginPath(); ctx.moveTo(x, dy - w * 0.045); ctx.quadraticCurveTo(x + w * 0.032, dy + w * 0.005, x, dy + w * 0.03); ctx.quadraticCurveTo(x - w * 0.032, dy + w * 0.005, x, dy - w * 0.045); ctx.fill();
    } else {
      const k = clamp((u - 0.28) / 0.72, 0, 1), up = Math.sin(Math.min(1, k * 1.5) * Math.PI * 0.9) * w * 0.27, rad = w * (0.05 + 0.16 * k);
      ctx.fillStyle = 'rgba(224,242,254,.97)';
      ctx.beginPath(); ctx.moveTo(x - rad, wl);
      for (let i = 0; i <= 14; i++) { const a = i / 14, px = x - rad + 2 * rad * a, h2 = up * Math.sin(a * Math.PI) * (0.6 + 0.4 * Math.cos((a - 0.5) * 12)); ctx.lineTo(px, wl - h2); }
      ctx.lineTo(x + rad, wl); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 7; i++) { const a = -0.3 - i * 0.35, sp = w * 0.5 * k * (0.5 + (i % 3) * 0.3), dx = Math.cos(a) * sp, dy = Math.sin(a) * sp * 1.1 + w * 0.5 * k * k * 0.3; D.sphere(x + dx * (i % 2 ? 1 : -1), wl - up * 0.6 + dy, w * 0.014, '#e0f2fe', { gloss: false }); }
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 - 0.5 * k) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, wl, rad * 1.8 * (0.4 + k), rad * 0.3 * (0.4 + k), 0, 0, 6.3); ctx.stroke();
    }
  }
  const SCENE = {
    electron(x, y, w, t) {
      D.glow(x, y, w * 0.2, '#fecaca', 0.7); D.sphere(x, y, w * 0.045, '#ef4444');
      ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, w * 0.3, w * 0.15, -0.4, 0, 6.3); ctx.stroke();
      for (let i = 14; i >= 0; i--) { const a = t * 9 - i * 0.12, px = Math.cos(a) * w * 0.3, py = Math.sin(a) * w * 0.15; const c = Math.cos(-0.4), s = Math.sin(-0.4); ctx.fillStyle = 'rgba(147,197,253,' + (1 - i / 15) * 0.8 + ')'; ctx.beginPath(); ctx.arc(x + px * c - py * s, y + px * s + py * c, w * 0.02 * (1 - i / 22), 0, 6.3); ctx.fill(); }
      const a = t * 9, px = Math.cos(a) * w * 0.3, py = Math.sin(a) * w * 0.15; D.sphere(x + px * Math.cos(-0.4) - py * Math.sin(-0.4), y + px * Math.sin(-0.4) + py * Math.cos(-0.4), w * 0.03, '#60a5fa');
    },
    chem(x, y, w, t) {
      const u = (t % 4) / 4, gap = u < 0.4 ? w * (0.3 - 0.22 * (u / 0.4)) : u < 0.5 ? w * 0.08 : w * (0.1 + 0.01 * Math.sin(t * 30));
      const ax = x - gap, bx = x + gap;
      if (u >= 0.4) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = w * 0.03; ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(bx, y); ctx.stroke(); }
      D.sphere(ax, y, w * 0.075, '#f87171'); D.sphere(bx, y, w * 0.06, '#60a5fa');
      if (u > 0.38 && u < 0.55) D.glow(x, y, w * (0.15 + (u - 0.38) * 1.2), '#fde68a', 0.9 - (u - 0.38) * 4);
      D.text(x, y + w * 0.22, u < 0.4 ? 'A + B' : 'A–B 결합!', { size: 16, color: '#fef3c7', weight: 800 });
    },
    light(x, y, w, t) {
      const x0 = x - w * 0.4, x1 = x + w * 0.4;
      ctx.fillStyle = '#fde68a'; rr(x0, y - 8, x1 - x0, 16, 4).fill(); ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5;
      for (let i = 0; i <= 10; i++) { const px = x0 + (x1 - x0) * i / 10; ctx.beginPath(); ctx.moveTo(px, y - 8); ctx.lineTo(px, y - (i % 5 ? 3 : 0)); ctx.stroke(); }
      D.text(x0, y + 28, '0', { size: 14, color: '#fef3c7', weight: 800 }); D.text(x1, y + 28, '1 m', { size: 14, color: '#fef3c7', weight: 800 });
      const k = (t % 1.6) / 1.6, px = x0 + (x1 - x0) * Math.min(1, k * 1.25);
      D.glow(px, y - 30, w * 0.12, '#fff7a8', 0.95); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, y - 30, 6, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,247,168,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y - 30); ctx.lineTo(px, y - 30); ctx.stroke();
      D.text(x, y - 62, '3.3 ns', { size: 22, color: '#fff', weight: 800 });
    },
    fast(x, y, w, t) {
      const u = (t % 2.4) / 2.4;
      ctx.save(); rr(x - w * 0.32, y - w * 0.3, w * 0.64, w * 0.6, 14).clip(); splash(x, y, w * 0.64, u, t); ctx.restore();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3; rr(x - w * 0.32, y - w * 0.3, w * 0.64, w * 0.6, 14).stroke();
      D.text(x - w * 0.28, y - w * 0.34, '● REC 10000장/초', { size: 14, color: '#fca5a5', weight: 800, align: 'left' });
    },
    blink(x, y, w, t) {
      const k = (t % 2.2), cl = k < 0.24 ? Math.sin(k / 0.24 * Math.PI) : 0, ew = w * 0.3, eh = w * 0.15;
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, ew, eh, 0, 0, 6.3); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - ew, y - eh, ew * 2, eh * 2);
      D.sphere(x, y, w * 0.1, '#4a2f1b'); D.sphere(x, y, w * 0.045, '#0f172a', { gloss: false });
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x - w * 0.03, y - w * 0.03, w * 0.016, 0, 6.3); ctx.fill();
      const lid = cl * eh * 2.05; ctx.fillStyle = '#e8b896'; ctx.fillRect(x - ew, y - eh, ew * 2, lid);
      ctx.strokeStyle = '#7c4a2d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - ew, y - eh + lid); ctx.lineTo(x + ew, y - eh + lid); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#7c4a2d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, ew, eh, 0, 0, 6.3); ctx.stroke();
      for (let i = 0; i < 7; i++) { const a = -2.7 + i * 0.37, lx = x + Math.cos(a) * ew, ly = y + Math.sin(a) * eh * (1 - cl * 0.0); ctx.beginPath(); ctx.moveTo(lx, ly + lid * (i % 7 === 0 ? 0 : 0.0)); ctx.lineTo(x + Math.cos(a) * (ew + 12), y + Math.sin(a) * (eh + 12)); ctx.stroke(); }
      D.text(x, y + w * 0.27, '눈 깜빡임 ≈ 0.1 s', { size: 16, color: '#e2e8f0', weight: 800 });
    },
    heart(x, y, w, t) {
      const ph = (t % 0.8) / 0.8, sc = 1 + 0.16 * Math.max(0, Math.sin(Math.min(1, ph * 3.2) * Math.PI)) * (ph < 0.31 ? 1 : 0);
      const s = w * 0.17 * sc;
      D.glow(x, y - w * 0.05, w * 0.34 * sc, '#fb7185', 0.4);
      ctx.save(); ctx.translate(x, y - w * 0.03); ctx.scale(s / 40, s / 40); ctx.beginPath();
      ctx.moveTo(0, 30); ctx.bezierCurveTo(-60, -10, -40, -50, 0, -22); ctx.bezierCurveTo(40, -50, 60, -10, 0, 30); ctx.closePath();
      const g = ctx.createRadialGradient(-12, -16, 4, 0, 0, 56); g.addColorStop(0, '#fda4af'); g.addColorStop(1, '#e11d48'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#34d399'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const px = x - w * 0.4 + w * 0.8 * i / 120, tt = ((t - (1 - i / 120) * 1.6) % 0.8 + 0.8) % 0.8 / 0.8; let v = 0; if (tt > 0.06 && tt < 0.1) v = -0.25; else if (tt >= 0.1 && tt < 0.14) v = 1; else if (tt >= 0.14 && tt < 0.18) v = -0.35; else if (tt > 0.32 && tt < 0.42) v = 0.25 * Math.sin((tt - 0.32) / 0.1 * Math.PI); const py = y + w * 0.27 - v * w * 0.1; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    },
    day(x, y, w, t) {
      const u = (t % 8) / 8, day = Math.max(0, Math.sin(u * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5);
      ctx.save(); rr(x - w * 0.42, y - w * 0.3, w * 0.84, w * 0.6, 16).clip();
      const g = ctx.createLinearGradient(0, y - w * 0.3, 0, y + w * 0.3); g.addColorStop(0, SciSim.color.mix('#0b1030', '#60a5fa', day)); g.addColorStop(1, SciSim.color.mix('#1e2a55', '#dbeafe', day));
      ctx.fillStyle = g; ctx.fillRect(x - w, y - w, w * 2, w * 2);
      const a = u * Math.PI * 2 - Math.PI / 2, sx = x + Math.cos(a) * w * 0.34, sy = y + w * 0.2 - Math.sin(a) * w * 0.34;
      D.glow(sx, sy, w * 0.12, '#fde047', 0.8); D.sphere(sx, sy, w * 0.04, '#facc15');
      const mx = x - Math.cos(a) * w * 0.34, my = y + w * 0.2 + Math.sin(a) * w * 0.34; D.sphere(mx, my, w * 0.03, '#e2e8f0', { gloss: false });
      ctx.fillStyle = '#166534'; ctx.fillRect(x - w, y + w * 0.2, w * 2, w * 0.2);
      ctx.restore(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; rr(x - w * 0.42, y - w * 0.3, w * 0.84, w * 0.6, 16).stroke();
      D.text(x, y + w * 0.38, '자전 1바퀴 = 하루', { size: 15, color: '#e2e8f0', weight: 800 });
    },
    year(x, y, w, t) {
      D.glow(x, y, w * 0.2, '#fbbf24', 0.6); D.sphere(x, y, w * 0.05, '#fbbf24', { light: '#fff3b0' });
      ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, w * 0.32, w * 0.2, 0, 0, 6.3); ctx.stroke();
      const a = (t % 8) / 8 * 6.283 - 1.57; D.sphere(x + Math.cos(a) * w * 0.32, y + Math.sin(a) * w * 0.2, w * 0.03, '#3b82f6');
      D.text(x + w * 0.34, y + 4, '봄', { size: 14, color: '#bbf7d0', weight: 800, align: 'left' }); D.text(x, y + w * 0.25 + 14, '여름', { size: 14, color: '#fecaca', weight: 800 });
      D.text(x - w * 0.34, y + 4, '가을', { size: 14, color: '#fed7aa', weight: 800, align: 'right' }); D.text(x, y - w * 0.22 - 6, '겨울', { size: 14, color: '#bae6fd', weight: 800 });
    },
    life(x, y, w, t) {
      const ages = [['아기', 0.2, '#f9a8d4'], ['어린이', 0.4, '#60a5fa'], ['청소년', 0.6, '#34d399'], ['어른', 0.8, '#3867f4'], ['노인', 0.78, '#a78bfa']];
      const cur = Math.floor((t / 1.2) % 5);
      ages.forEach((a, i) => {
        const px = x - w * 0.36 + i * w * 0.18, h = w * 0.5 * a[1], on = i === cur;
        ctx.globalAlpha = on ? 1 : 0.35; person(px, y + w * 0.2, h, a[2], { cane: i === 4, hair: i === 4 ? '#e2e8f0' : '#3b2418' });
        D.text(px, y + w * 0.2 + 22, a[0], { size: 13, color: '#e2e8f0', weight: 800 }); ctx.globalAlpha = 1;
      });
      D.arrow(x - w * 0.4, y - w * 0.28, x + w * 0.4, y - w * 0.28, { color: '#93c5fd', width: 3 }); D.text(x, y - w * 0.32, '약 80년', { size: 16, color: '#bfdbfe', weight: 800 });
    },
    civ(x, y, w, t) {
      const gy = y + w * 0.2;
      ctx.fillStyle = '#d6b36a'; ctx.beginPath(); ctx.moveTo(x - w * 0.38, gy); ctx.lineTo(x - w * 0.22, gy - w * 0.2); ctx.lineTo(x - w * 0.06, gy); ctx.closePath(); ctx.fill();
      [[0.0, 0.18, '#64748b'], [0.07, 0.28, '#475569'], [0.14, 0.2, '#94a3b8'], [0.21, 0.34, '#334155'], [0.29, 0.24, '#64748b']].forEach(([dx, hh, c], i) => {
        ctx.fillStyle = c; ctx.fillRect(x + w * 0.04 + dx * w, gy - hh * w, w * 0.055, hh * w);
        ctx.fillStyle = 'rgba(253,230,138,' + (0.4 + 0.5 * Math.sin(t * 2 + i)) + ')'; for (let r = 0; r < 4; r++) ctx.fillRect(x + w * 0.052 + dx * w, gy - hh * w + 6 + r * 16, w * 0.012, 7);
      });
      ctx.fillStyle = '#6b7280'; ctx.fillRect(x - w * 0.4, gy, w * 0.8, 4);
      D.arrow(x - w * 0.22, y - w * 0.24, x + w * 0.2, y - w * 0.24, { color: '#fcd34d', width: 3 }); D.text(x, y - w * 0.28, '약 5000년', { size: 16, color: '#fde68a', weight: 800 });
    },
    dino(x, y, w, t) {
      const u = (t % 5) / 5, gy = y + w * 0.22;
      ctx.fillStyle = '#365314'; ctx.fillRect(x - w * 0.42, gy, w * 0.84, w * 0.06);
      const fall = smooth(u, 0.0, 0.5);
      const ax = x + w * 0.35 - fall * w * 0.3, ay = y - w * 0.36 + fall * w * 0.5;
      if (u > 0.55) ctx.globalAlpha = Math.max(0.25, 1 - (u - 0.55) * 1.6);
      dinoShape(x - w * 0.12, gy - w * 0.13, w * 0.3, '#4d7c0f'); ctx.globalAlpha = 1;
      if (u < 0.5) { ctx.strokeStyle = 'rgba(251,146,60,.6)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(ax + w * 0.2, ay - w * 0.28); ctx.lineTo(ax, ay); ctx.stroke(); D.glow(ax, ay, w * 0.1, '#fb923c', 0.9); D.sphere(ax, ay, w * 0.045, '#78350f'); }
      if (u > 0.48 && u < 0.85) { const k = (u - 0.48) / 0.37; D.glow(x + w * 0.05, gy, w * (0.1 + 0.5 * k), '#fb923c', 0.8 * (1 - k)); }
      D.text(x, y + w * 0.3, '약 6600만 년 전', { size: 15, color: '#fed7aa', weight: 800 });
    },
    earth(x, y, w, t) {
      const u = (t % 9) / 9, k = smooth(u, 0.25, 0.8), r = w * 0.2;
      D.glow(x, y, r * (1.8 - k * 0.5), SciSim.color.mix('#fb923c', '#7dd3fc', k), 0.5);
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.clip();
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, SciSim.color.mix('#fde047', '#60a5fa', k)); g.addColorStop(0.6, SciSim.color.mix('#ea580c', '#2563eb', k)); g.addColorStop(1, SciSim.color.mix('#7c2d12', '#1e3a8a', k));
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.strokeStyle = 'rgba(254,240,138,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - r + i * r * 0.4, y - r * 0.8); ctx.quadraticCurveTo(x + Math.sin(i + t) * r * 0.3, y, x - r * 0.5 + i * r * 0.3, y + r * 0.9); ctx.stroke(); }
      ctx.fillStyle = 'rgba(74,222,128,' + k + ')'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.1, r * 0.3, r * 0.2, 0.5, 0, 6.3); ctx.ellipse(x + r * 0.3, y + r * 0.3, r * 0.22, r * 0.14, -0.3, 0, 6.3); ctx.fill();
      ctx.restore();
      D.text(x, y + r + 30, u < 0.35 ? '불덩이였던 지구' : k < 0.95 ? '식어 가는 지구' : '바다가 생긴 지구', { size: 15, color: '#e2e8f0', weight: 800 });
    },
    universe(x, y, w, t) {
      const u = (t % 6) / 6, R = w * 0.4 * (0.08 + 0.92 * smooth(u, 0, 1));
      D.glow(x, y, w * 0.3 * (1.1 - u), '#fff7ed', 0.95 * (1 - u * 0.6));
      for (let i = 0; i < BANG.length; i++) { const q = BANG[i], rr0 = R * q.v; ctx.fillStyle = 'rgba(' + (i % 3 ? '199,210,254' : '253,230,138') + ',' + (0.9 - u * 0.3) + ')'; ctx.beginPath(); ctx.arc(x + Math.cos(q.a) * rr0, y + Math.sin(q.a) * rr0, q.s, 0, 6.3); ctx.fill(); }
      D.text(x, y + w * 0.32, u < 0.1 ? '빅뱅!' : '팽창하는 우주', { size: 16, color: '#e0e7ff', weight: 800 });
    },
  };
  const BG = { electron: ['#10183a', '#050816'], chem: ['#1e1b4b', '#0b0a24'], light: ['#1b2a55', '#0b1233'], fast: ['#334155', '#0f172a'], blink: ['#334155', '#111827'], heart: ['#3f1d2e', '#12060c'], day: ['#1e3a8a', '#0b1030'], year: ['#0b1030', '#050816'], life: ['#1e293b', '#0f172a'], civ: ['#1e3a5f', '#0b1426'], dino: ['#431407', '#1c0a05'], earth: ['#14103a', '#05030f'], universe: ['#12082e', '#030014'] };

  /* ======================================================
     화면 1: 시간 여행
     ====================================================== */
  const SCN = { cx: VW / 2, cy: (VH - 112) / 2 + 8, h: VH - 112 };
  function nearestEv(e) { let b = EVS[0], bd = 1e9; EVS.forEach((o) => { const d = Math.abs(o.e - e); if (d < bd) { bd = d; b = o; } }); return b; }
  function drawTrip(t) {
    const e = S.t;
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, VW, VH);
    const near = nearestEv(e), d = Math.abs(near.e - e);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, SCN.h + 4); ctx.clip();
    // 배경은 가까운 사건의 색으로 부드럽게
    const bg = BG[near.id], gr = ctx.createRadialGradient(SCN.cx, SCN.cy, 20, SCN.cx, SCN.cy, VW * 0.8); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, SCN.h + 4);
    // 지수 눈금(시간선)이 시간 눈금에 맞춰 흘러가요
    const ry = SCN.h - 34, gap = PHONE ? 46 : 58;
    ctx.fillStyle = 'rgba(15,23,42,.55)'; ctx.fillRect(0, ry - 26, VW, 52);
    ctx.strokeStyle = 'rgba(148,163,184,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(VW, ry); ctx.stroke();
    for (let k = Math.floor(S.t - VW / 2 / gap) - 1; k <= Math.ceil(S.t + VW / 2 / gap) + 1; k++) {
      if (k < T_MIN || k > T_MAX) continue;
      const px = SCN.cx + (k - S.t) * gap; ctx.strokeStyle = 'rgba(226,232,240,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, ry - 8); ctx.lineTo(px, ry + 8); ctx.stroke();
      if (k % 2 === 0) D.text(px, ry + 22, p10(k), { size: 13, color: '#cbd5e1', weight: 800 });
    }
    EVS.forEach((o) => { const px = SCN.cx + (o.e - S.t) * gap; if (px < -10 || px > VW + 10) return; D.sphere(px, ry, 6, S.seen.has(o.id) ? '#fbbf24' : '#94a3b8', { gloss: false, outline: '#0f172a', outlineWidth: 1.5 }); });
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.moveTo(SCN.cx, ry - 10); ctx.lineTo(SCN.cx - 8, ry - 25); ctx.lineTo(SCN.cx + 8, ry - 25); ctx.closePath(); ctx.fill();
    if (S.lastNear !== near.id) { S.lastNear = near.id; S.nearA = 0; }
    S.nearA = RM ? 1 : Math.min(1, (S.nearA == null ? 1 : S.nearA) + 0.04);
    const a = (1 - smooth(d, 0.9, 1.9)) * S.nearA;
    if (a > 0.02) { ctx.globalAlpha = a; SCENE[near.id](SCN.cx - 20, SCN.cy + 12, PHONE ? 440 : 450, t); ctx.globalAlpha = 1; if (a > 0.5) S.seen.add(near.id); }
    if (a < 0.9) {
      ctx.globalAlpha = 1 - a; D.text(SCN.cx, SCN.cy - 6, '⏳ 이 규모에는 이름 붙은 사건이 드물어요', { size: 17, color: '#e2e8f0', weight: 700 });
      D.text(SCN.cx, SCN.cy + 22, (near.e > e ? '길게 → ' : '← 짧게 ') + '움직이면 ' + near.name, { size: 15, color: '#93c5fd', weight: 700 }); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // HUD
    D.shadow(() => { ctx.fillStyle = 'rgba(15,23,42,.72)'; rr(12, 12, 176, 66, 16).fill(); }, { blur: 10, y: 3, color: 'rgba(0,0,0,.35)' });
    D.text(24, 62, '10', { size: 44, color: '#fff', weight: 800, align: 'left' });
    odometer(78, 34, S.t);
    D.text(146, 62, 's', { size: 28, color: '#cbd5e1', weight: 800, align: 'left' });
    const iw = PHONE ? 330 : 300, ix = VW - iw - 12, shown = d <= 1.0;
    S.infoA = SciSim.approach(S.infoA, shown ? 1 : 0.35, 0.016, 10);
    ctx.save(); ctx.globalAlpha = 0.55 + 0.45 * S.infoA;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(ix, 12, iw, 94, 16).fill(); }, { blur: 10, y: 3, color: 'rgba(0,0,0,.35)' });
    D.text(ix + 14, 40, near.name, { size: 21, color: '#1b2333', weight: 800, align: 'left' });
    D.text(ix + 14, 63, near.txt, { size: 15, color: '#3867f4', weight: 800, align: 'left' });
    D.text(ix + 14, 87, shown ? near.note : '가장 가까운 사건: ' + near.name, { size: 13, color: '#5d6879', weight: 700, align: 'left' });
    ctx.restore();
    // 시간 막대 + 지도
    const bx = 22, by = VH - 80;
    D.label(bx, by - 2, '시간 눈금 = ' + pTxt(S.t) + ' s  ≈ ' + eqT(S.t), { bg: '#1b2333', size: 14, align: 'left' });
    const mx0 = 40, mx1 = VW - 40, my = VH - 32, mp = (v) => mx0 + (v - T_MIN) / (T_MAX - T_MIN) * (mx1 - mx0);
    ctx.fillStyle = 'rgba(100,116,139,.18)'; rr(mp(-1), my - 8, mp(9.4) - mp(-1), 16, 8).fill();
    D.text((mp(-1) + mp(9.4)) / 2, my + 4.5, '사람이 느끼는 시간', { size: 13, color: '#475569', weight: 800 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx0, my); ctx.lineTo(mx1, my); ctx.stroke();
    for (let v = -15; v <= 15; v += 5) { ctx.beginPath(); ctx.moveTo(mp(v), my - 4); ctx.lineTo(mp(v), my + 4); ctx.stroke(); D.text(mp(v), my + 22, v < 0 ? MINUS + Math.abs(v) : String(v), { size: 13, color: '#5d6879', weight: 700 }); }
    EVS.forEach((o) => D.sphere(mp(o.e), my, 5.5, S.seen.has(o.id) ? '#3867f4' : '#cbd5e1', { gloss: false, outline: '#fff', outlineWidth: 1.5 }));
    const cx = mp(clamp(S.t, T_MIN, T_MAX));
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.moveTo(cx, my - 6); ctx.lineTo(cx - 8, my - 20); ctx.lineTo(cx + 8, my - 20); ctx.closePath(); ctx.fill();
    D.text(VW - 12, my + 22, '지수', { size: 13, color: '#5d6879', weight: 800, align: 'right' });
    S.mapGeom = { mx0, mx1, my };
  }
    function odometer(x, y, val) {
    ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y - 24, 66, 44); ctx.clip();
    const lh = 34, base = Math.floor(val);
    for (let k = base - 1; k <= base + 2; k++) {
      const yy = y - (k - val) * lh, a = 1 - Math.min(1, Math.abs(k - val) * 0.95); if (a <= 0.02) continue;
      D.text(x, yy + 9, (k < 0 ? MINUS : '') + Math.abs(k), { size: 28, color: '#fde68a', weight: 800, align: 'left', alpha: a });
    }
    ctx.restore();
  }

  /* ======================================================
     화면 2: 시계의 발전
     ====================================================== */
  const CLK = [
    { id: 'pend', ico: '🕰️', name: '진자시계', sub: '진자가 왔다 갔다', hz: 1, per: '약 1 s', col: '#92400e' },
    { id: 'quartz', ico: '⌚', name: '수정(석영) 시계', sub: '수정 조각이 떨림', hz: 32768, per: '약 3.1×10⁻⁵ s', col: '#0d9488' },
    { id: 'cesium', ico: '⚛️', name: '세슘 원자시계', sub: '세슘 원자가 내는 빛', hz: 9192631770, per: '약 1.1×10⁻¹⁰ s', col: '#7c3aed' },
  ];
  const ERR = { quartz: 3e-4, cesium: 6e-14 };
  const periodOf = (L) => 2 * Math.PI * Math.sqrt(L / 9.8);
  function panelRect(i) { return PHONE ? { x: 8, y: 8 + i * 284, w: 584, h: 272, wide: true } : { x: 8 + i * 264, y: 8, w: 256, h: VH - 16, wide: false }; }
  function drawClockPanel(i, t) {
    const c = CLK[i], P = panelRect(i), w = P.w, h = P.h;
    ctx.save(); ctx.translate(P.x, P.y);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(0, 0, w, h, 16).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = c.col; ctx.lineWidth = 3; rr(0, 0, w, h, 16).stroke();
    ctx.fillStyle = c.col; ctx.globalAlpha = 0.12; rr(0, 0, w, 38, 16).fill(); ctx.globalAlpha = 1;
    D.text(14, 26, c.ico + ' ' + c.name, { size: 17, color: '#1b2333', weight: 800, align: 'left' });
    const ax = P.wide ? 120 : w / 2, ay = P.wide ? 150 : 150;   // 장치 중심
    // 장치
    if (i === 0) {
      const L = S.pend.L, len = 46 + L * (P.wide ? 160 : 190), th = 0.38 * Math.cos(S.pend.ph * 6.2832), px = ax + Math.sin(th) * len, py = 56 + Math.cos(th) * len;
      ctx.fillStyle = '#78350f'; rr(ax - 34, 46, 68, 10, 4).fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, 56); ctx.lineTo(px, py); ctx.stroke();
      D.sphere(px, py, 16, '#f59e0b', { shadow: true });
      ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, 56); ctx.lineTo(ax, 56 + len + 22); ctx.stroke(); ctx.setLineDash([]);
      D.text(ax + 16, 56 + len / 2, 'L = ' + L.toFixed(2) + ' m', { size: 13, color: '#78350f', weight: 800, align: 'left' });
    } else if (i === 1) {
      const sw = Math.sin(t * 40) * 3.2;
      D.shadow(() => { ctx.fillStyle = '#5eead4'; rr(ax - 26, 120, 52, 70, 8).fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 3; rr(ax - 26, 120, 52, 70, 8).stroke();
      ctx.fillStyle = '#99f6e4'; ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 3;
      [[-1, -14], [1, 14]].forEach(([sg, dx]) => { ctx.save(); ctx.translate(ax + dx, 120); ctx.rotate(sg * sw * 0.01); rr(-7, -68, 14, 70, 5).fill(); rr(-7, -68, 14, 70, 5).stroke(); ctx.restore(); });
      ctx.strokeStyle = 'rgba(13,148,136,.45)'; ctx.lineWidth = 2; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(ax, 62, 24 + k * 14 + Math.sin(t * 40) * 1.5, -2.4, -0.74); ctx.stroke(); }
      D.text(ax, 214, '떨리는 수정 조각', { size: 13, color: '#0f766e', weight: 800 });
    } else {
      const ph = t * 6;
      D.glow(ax, ay, 78, '#c4b5fd', 0.45);
      D.sphere(ax, ay, 26, '#8b5cf6'); D.text(ax, ay + 5, 'Cs', { size: 15, color: '#fff', weight: 800 });
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let k = 0; k <= 60; k++) { const px = ax - 100 + k * (P.wide ? 3.3 : 3.3), env = Math.min(1, k / 8) * (1 - Math.max(0, (k - 52) / 8)), py = ay - 78 + Math.sin(k * 0.9 - ph * 3) * 9 * env; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      D.text(ax, ay + 58, '세슘 원자가 내는 빛의 진동', { size: 13, color: '#6d28d9', weight: 800 });
    }
    // 읽음 영역
    const o = P.wide ? { ty: 40, bx: 0, box: 22, bh: 36, t1: 76, t2: 98, bar: 112, bl: 32, res: 46, rh: 66 } : { ty: 248, bx: 0, box: 22, bh: 40, t1: 86, t2: 112, bar: 128, bl: 34, res: 52, rh: 110 };
    const tx = P.wide ? 250 : 0, ty0 = o.ty, tw = P.wide ? 322 : w;
    const cxm = tx + tw / 2, f = t % 1;
    D.text(cxm, ty0 + 12, i === 0 ? '지금까지 진자가 왕복한 횟수' : '1초 동안 진동한 횟수', { size: 14, color: '#5d6879', weight: 800 });
    ctx.fillStyle = '#0f172a'; rr(tx + 12, ty0 + o.box, tw - 24, o.bh, 10).fill();
    const cnt = i === 0 ? (S.pend.n % 1000) + ' 번' : comma(Math.floor(c.hz * f)) + ' 번';
    D.text(cxm, ty0 + o.box + o.bh * 0.7, cnt, { size: i === 2 ? 19 : 22, color: '#86efac', weight: 800 });
    D.text(cxm, ty0 + o.t1, '1초 = ' + (i === 0 ? '진자 1번 왕복' : comma(c.hz) + '번 진동'), { size: 14, color: c.col, weight: 800 });
    D.text(cxm, ty0 + o.t2, '한 번 진동하는 시간 ' + (i === 0 ? '≈ ' + periodOf(S.pend.L).toFixed(2) + ' s' : c.per), { size: 14, color: '#1b2333', weight: 800 });
    const by = ty0 + o.bar, bw = tw - 28, bx = tx + 14;
    ctx.fillStyle = '#e2e8f0'; rr(bx, by, bw, 16, 8).fill();
    ctx.strokeStyle = c.col; ctx.lineWidth = 1.2; const nt = i === 0 ? 1 : i === 1 ? 64 : 180;
    ctx.save(); rr(bx, by, bw, 16, 8).clip();
    for (let k = 0; k <= nt; k++) { const px = bx + bw * k / nt; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(px, by); ctx.lineTo(px, by + 16); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
    D.text(bx, by + o.bl, '0 s', { size: 13, color: '#5d6879', weight: 800, align: 'left' }); D.text(bx + bw, by + o.bl, '1 s', { size: 13, color: '#5d6879', weight: 800, align: 'right' });
    D.text(cxm, by + o.bl, i === 0 ? '눈금 1개' : i === 1 ? '눈금 수만 개' : '눈금 수십억 개', { size: 13, color: c.col, weight: 800 });
    const ry = by + o.res, R = S.run.res;
    if (R && S.run.state !== 'idle') {
      const show = S.run.state === 'done';
      ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(tx + 10, ry, tw - 20, o.rh, 12).fill();
      D.text(cxm, ry + 20, '1분 재어 보니', { size: 14, color: '#5d6879', weight: 800 });
      const rd = R[i];
      D.text(cxm, ry + 44, show ? rd.read : (S.run.p * 60).toFixed(2) + ' s…', { size: 18, color: '#1b2333', weight: 800 });
      if (show) {
        D.text(cxm, ry + 66, '오차 약 ' + rd.err, { size: P.wide ? 14 : 14, color: c.col, weight: 800 });
        if (!P.wide) { const lg = clamp((Math.log10(rd.errv) + 15) / 15, 0.02, 1), bw2 = (tw - 44) * lg * S.run.bar; ctx.fillStyle = c.col; rr(tx + 22, ry + 88, Math.max(3, bw2), 10, 5).fill(); }
      }
    } else {
      D.text(cxm, ry + (P.wide ? 30 : 40), '▶ 1분 재기를 눌러 보세요', { size: 14, color: '#94a3b8', weight: 700 });
    }
    ctx.restore();
  }
  function startRun() {
    if (S.run.state === 'run') return;
    const T = periodOf(S.pend.L), rd = 60 / T;
    S.run.res = [
      { read: rd.toFixed(2) + ' s', err: Math.abs(rd - 60) < 0.005 ? '0.007 s 안팎' : Math.abs(rd - 60).toFixed(2) + ' s', errv: Math.max(1e-2, Math.abs(rd - 60)) },
      { read: '59.9997 s', err: sci(ERR.quartz, 0) + ' s', errv: ERR.quartz },
      { read: '60.0000000000000 s', err: sci(ERR.cesium, 0) + ' s', errv: ERR.cesium },
    ];
    S.run.state = 'run'; S.run.p = 0; S.run.bar = 0; S.run.done = false; Sound.click();
  }
  function stepRun(dt) {
    const r = S.run; if (r.state !== 'run') { if (r.state === 'done') r.bar = SciSim.approach(r.bar, 1, dt, 3); return; }
    r.p = Math.min(1, r.p + dt / (RM ? 0.4 : 4.5));
    if (r.p >= 1) { r.state = 'done'; r.done = true; r.count++; Sound.success(); r.bar = 0; }
  }

  /* ======================================================
     화면 3: 옛날 시간 재기
     ====================================================== */
  const TREE_W = [1.0, 1.25, 0.9, 0.3, 1.1, 1.3, 0.8, 1.0, 1.2, 0.9];
  const TR = (() => { const tot = TREE_W.reduce((a, b) => a + b, 0), R = PHONE ? 190 : 200; let c = 0; return TREE_W.map((w) => { c += w; return R * c / tot; }); })();
  const TREE_C = { x: PHONE ? 300 : 300, y: PHONE ? 400 : 290 };
  function ringAt(p) {
    const d = Math.hypot(p.x - TREE_C.x, p.y - TREE_C.y); if (d > TR[TR.length - 1] + 6) return -1;
    for (let i = 0; i < TR.length; i++) if (d <= TR[i]) return i; return TR.length - 1;
  }
  function drawTree(t) {
    ctx.fillStyle = '#f7f1e3'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 34, '나무 단면의 나이테를 안쪽부터 눌러서 세어 봐요', { size: 18, color: '#4a2f1b', weight: 800 });
    const { x: cx, y: cy } = TREE_C, n = S.tree.n, Ro = TR[n - 1];
    D.shadow(() => { ctx.fillStyle = '#5b3a29'; ctx.beginPath(); ctx.arc(cx, cy, Ro + 14, 0, 6.3); ctx.fill(); }, { blur: 16, y: 6, color: 'rgba(60,30,10,.4)' });
    ctx.strokeStyle = '#3b2418'; ctx.lineWidth = 2; for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (Ro + 6), cy + Math.sin(a) * (Ro + 6)); ctx.lineTo(cx + Math.cos(a) * (Ro + 13), cy + Math.sin(a) * (Ro + 13)); ctx.stroke(); }
    for (let i = n - 1; i >= 0; i--) {
      const on = S.tree.counted.has(i), pu = S.tree.pulse[i] || 0, r = TR[i];
      const fill = i % 2 ? '#e8c590' : '#f3d9a8';
      ctx.fillStyle = on ? SciSim.color.mix(fill, '#fde047', 0.55 + 0.25 * Math.sin(pu * 8) * (pu > 0 ? 1 : 0)) : fill; ctx.beginPath();
      for (let k = 0; k <= 72; k++) { const a = k / 72 * 6.283, wob = 1 + 0.012 * Math.sin(a * 3 + i) + 0.01 * Math.sin(a * 5 - i * 2); const px = cx + Math.cos(a) * r * wob, py = cy + Math.sin(a) * r * wob; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill();
      ctx.strokeStyle = on ? '#b45309' : '#a9783f'; ctx.lineWidth = on ? 3 : 1.6; ctx.stroke();
    }
    D.sphere(cx, cy, 4, '#7c4a1e', { gloss: false });
    // 센 번호
    const order = S.tree.seq;
    order.forEach((i, k) => {
      const r = i === 0 ? TR[0] * 0.5 : (TR[i] + TR[i - 1]) / 2, a = -0.6, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      D.sphere(px, py, 11, '#b45309', { gloss: false }); D.text(px, py + 5, String(k + 1), { size: 13, color: '#fff', weight: 800 });
    });
    // 가뭄 표시
    const dr = (TR[3] + TR[2]) / 2;
    if (S.tree.counted.has(3)) { D.arrow(cx - 160, cy - 170, cx - dr * 0.7, cy - dr * 0.7, { color: '#b91c1c', width: 3 }); D.label(cx - 160, cy - 184, '가뭄이 든 해: 좁은 고리', { bg: '#fff', color: '#b91c1c', size: 14, border: '#b91c1c' }); }
    // 오른쪽 설명
    const bx = PHONE ? 20 : 560, by = PHONE ? 650 : 120;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(bx, by, PHONE ? 560 : 222, PHONE ? 130 : 210, 16).fill(); }, { blur: 8, y: 3 });
    D.text(bx + 14, by + 30, '🌳 나이테 읽기', { size: 17, color: '#4a2f1b', weight: 800, align: 'left' });
    const lines = ['고리 한 개 = 1년', '넓은 고리: 자라기 좋은 해', '좁은 고리: 가물거나 추운 해'];
    lines.forEach((ln, i) => D.text(bx + 14, by + 60 + i * 26, ln, { size: 15, color: '#3a4456', weight: 700, align: 'left' }));
    D.text(bx + 14, by + 60 + 3 * 26 + 8, '센 고리 ' + S.tree.counted.size + '개', { size: 20, color: '#b45309', weight: 800, align: 'left' });
    if (S.tree.counted.size >= n) D.label(cx, cy + Ro + 36, '나이테 ' + n + '개 = ' + n + '년 자란 나무!', { bg: '#14a058', size: 17 });
    if (S.tree.counted.size < n && !S.tree.counted.size) D.text(cx, cy + Ro + 40, '☝ 가운데(씨앗 자리)에서 바깥으로 차례로 눌러요', { size: 14, color: '#7c4a1e', weight: 700 });
  }
  function treeClick(p) {
    const i = ringAt(p); if (i < 0) return false;
    const T = S.tree; if (T.counted.has(i)) return true;
    T.counted.add(i); T.seq.push(i); T.pulse[i] = 1; Sound.tick();
    const r = i === 0 ? 4 : (TR[i] + TR[i - 1]) / 2;
    parts.burst(TREE_C.x + Math.cos(-0.6) * r, TREE_C.y + Math.sin(-0.6) * r, { count: 6, speed: 80, size: 2.5, life: 0.5, colors: ['#fbbf24', '#f59e0b'], gravity: 80 });
    return true;
  }
  const iceAge = (d) => 6 * Math.pow(d, 1.15);
  const iceDepth = (a) => Math.pow(a / 6, 1 / 1.15);
  function drawIce(t) {
    const sk = ctx.createLinearGradient(0, 0, 0, VH); sk.addColorStop(0, '#e0f2fe'); sk.addColorStop(1, '#f0f9ff'); ctx.fillStyle = sk; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 32, '빙하를 깊이 뚫을수록 더 오래된 얼음이에요', { size: 18, color: '#0c4a6e', weight: 800 });
    const d = S.ice.d, gx = PHONE ? 60 : 70, gy0 = 64, gy1 = VH - 48, gh = gy1 - gy0;
    const py = (v) => gy0 + v / 3000 * gh;
    // 빙하 단면
    ctx.fillStyle = '#bae6fd'; rr(gx - 22, gy0, 44, gh, 10).fill(); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2.5; rr(gx - 22, gy0, 44, gh, 10).stroke();
    const gg = ctx.createLinearGradient(0, gy0, 0, gy1); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(2,132,199,.45)'); ctx.fillStyle = gg; rr(gx - 22, gy0, 44, gh, 10).fill();
    [[0, '표면'], [1000, '1000 m'], [2000, '2000 m'], [3000, '3000 m']].forEach(([v, l]) => { ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx + 22, py(v)); ctx.lineTo(gx + 32, py(v)); ctx.stroke(); D.text(gx + 36, py(v) + 5, l, { size: 13, color: '#0369a1', weight: 800, align: 'left' }); });
    let lastY = -99;
    [[250, PHONE ? '산업 혁명 ~250년 전' : '산업 혁명 (약 250년 전)'], [2000, PHONE ? '로마 ~2000년 전' : '로마 제국 (약 2000년 전)'], [20000, PHONE ? '빙하기 ~2만 년 전' : '마지막 빙하기 (약 2만 년 전)']].forEach(([a, l]) => {
      const dd = iceDepth(a), y = py(dd), ly = Math.max(y, lastY + 22); lastY = ly;
      ctx.strokeStyle = 'rgba(180,83,9,.7)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx + 22, y); ctx.lineTo(gx + 70, ly); ctx.lineTo(gx + 100, ly); ctx.stroke(); ctx.setLineDash([]);
      D.text(gx + 106, ly + 5, l, { size: 13, color: '#b45309', weight: 800, align: 'left' });
    });
    // 탐침
    const y = py(d);
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.moveTo(gx - 24, y); ctx.lineTo(gx - 38, y - 9); ctx.lineTo(gx - 38, y + 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - 24, y); ctx.lineTo(gx + 24, y); ctx.stroke();
    // 확대한 코어
    const cx0 = PHONE ? 330 : 400, cw = PHONE ? 220 : 180, cy0 = 70, ch = PHONE ? 430 : 400;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(cx0, cy0, cw, ch, 14).fill(); }, { blur: 8, y: 3 });
    ctx.save(); rr(cx0 + 10, cy0 + 10, cw - 20, ch - 20, 10).clip();
    // 위에서 아래로 해마다 한 쌍의 줄무늬: 창의 가운데가 현재 깊이
    const win = 0.5, ppm = (ch - 20) / win, a0 = iceAge(d);
    const th = (iceDepth(a0 + 1) - iceDepth(a0)) || 0.1; const nPair = win / th;
    for (let k = -2; k < nPair + 2; k++) {
      const yy = cy0 + 10 + (k + ((d * 1) % th) / th * 0 + 0) * th * ppm;
      const off = (S.ice.d % th) / th;
      const y0 = cy0 + 10 + (k - off) * th * ppm;
      ctx.fillStyle = '#f0f9ff'; ctx.fillRect(cx0, y0, cw, th * ppm * 0.55); ctx.fillStyle = '#7dd3fc'; ctx.fillRect(cx0, y0 + th * ppm * 0.55, cw, th * ppm * 0.45);
    }
    const bubbles = rng(Math.floor(d / 0.3) + 1); ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.arc(cx0 + 10 + bubbles() * (cw - 20), cy0 + 10 + bubbles() * (ch - 20), 1 + bubbles() * 2, 0, 6.3); ctx.fill(); }
    ctx.restore();
    D.text(cx0 + cw / 2, cy0 + ch + 22, '확대한 얼음 (세로 약 0.5 m)', { size: 13, color: '#0369a1', weight: 800 });
    // 설명
    const tx = cx0 + cw + (PHONE ? -210 : 22);
    if (!PHONE) {
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(tx, 70, 176, 190, 14).fill(); }, { blur: 8, y: 3 });
      D.text(tx + 14, 98, '🧊 줄무늬 읽기', { size: 16, color: '#0c4a6e', weight: 800, align: 'left' });
      D.text(tx + 14, 126, '밝은 줄: 여름에 쌓인 눈', { size: 13, color: '#334155', weight: 700, align: 'left' });
      D.text(tx + 14, 148, '어두운 줄: 겨울에 쌓인 눈', { size: 13, color: '#334155', weight: 700, align: 'left' });
      D.text(tx + 14, 170, '한 쌍 = 1년', { size: 15, color: '#0369a1', weight: 800, align: 'left' });
      D.text(tx + 14, 196, '깊을수록 줄무늬가', { size: 13, color: '#334155', weight: 700, align: 'left' }); D.text(tx + 14, 216, '얇아져요 (눌려서)', { size: 13, color: '#334155', weight: 700, align: 'left' });
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(tx, 280, 176, 120, 14).fill(); }, { blur: 8, y: 3 });
      D.text(tx + 14, 308, '지금 깊이', { size: 14, color: '#5d6879', weight: 800, align: 'left' });
      D.text(tx + 14, 336, d.toFixed(0) + ' m', { size: 24, color: '#0c4a6e', weight: 800, align: 'left' });
      D.text(tx + 14, 372, '약 ' + koNum(a0) + ' 년 전', { size: 19, color: '#f26b3a', weight: 800, align: 'left' });
    } else {
      D.label(VW / 2, 560, '깊이 ' + d.toFixed(0) + ' m → 약 ' + koNum(a0) + ' 년 전', { bg: '#0c4a6e', size: 18 });
      D.text(VW / 2, 600, '한 쌍의 줄무늬(밝음+어두움) = 1년', { size: 15, color: '#334155', weight: 800 });
    }
  }
  const HALF = 45; // 억 년
  function initAtoms() { const r = rng(21); S.radio.atoms = Array.from({ length: 100 }, () => ({ u: r(), on: 1, flip: 0 })); S.radio.atoms.forEach((a, i) => { a.x = (i % 10); a.y = Math.floor(i / 10); }); }
  function drawRadio(t) {
    ctx.fillStyle = '#f6f4ff'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 32, '암석 속 방사성 원소는 시간이 지나면 다른 원소로 변해요', { size: PHONE ? 16 : 18, color: '#3b0764', weight: 800 });
    const R = S.radio, frac = Math.pow(0.5, R.t / HALF), gx = PHONE ? 60 : 40, gy = 80, cell = PHONE ? 38 : 34;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(gx - 14, gy - 14, cell * 10 + 28, cell * 10 + 28, 18).fill(); }, { blur: 10, y: 3 });
    ctx.save(); rr(gx - 14, gy - 14, cell * 10 + 28, cell * 10 + 28, 18).clip(); ctx.fillStyle = '#fef3c7'; ctx.fillRect(gx - 14, gy - 14, cell * 10 + 28, cell * 10 + 28); ctx.restore();
    R.atoms.forEach((a) => {
      const decayed = a.u > frac; const tgt = decayed ? 0 : 1;
      if (a.on !== tgt) { a.flip = a.flip || 1; }
      const px = gx + cell * (a.x + 0.5), py = gy + cell * (a.y + 0.5);
      const col = SciSim.color.mix('#f59e0b', '#8b5cf6', a.on);
      D.sphere(px, py, cell * 0.36, col);
      if (a.flip > 0) { ctx.strokeStyle = 'rgba(253,224,71,' + a.flip + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, cell * (0.4 + (1 - a.flip) * 0.6), 0, 6.3); ctx.stroke(); }
    });
    D.text(gx + cell * 5, gy + cell * 10 + 40, '🔬 암석 속 원자 100개를 확대한 모습', { size: 14, color: '#4c1d95', weight: 800 });
    // 막대
    const bx = PHONE ? 20 : 440, bw = PHONE ? 560 : 330, by = PHONE ? 560 : 96;
    const row = (y, label, v, col, meas) => {
      D.text(bx, y, label, { size: 16, color: '#1b2333', weight: 800, align: 'left' });
      ctx.fillStyle = '#e5e7eb'; rr(bx, y + 10, bw, 30, 10).fill(); ctx.fillStyle = col; rr(bx, y + 10, Math.max(4, bw * v), 30, 10).fill();
      D.text(bx + bw - 8, y + 32, Math.round(v * 100) + ' %', { size: 17, color: v > 0.85 ? '#fff' : '#1b2333', weight: 800, align: 'right' });
      if (meas != null) { const mx = bx + bw * meas; ctx.strokeStyle = '#14a058'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx, y + 4); ctx.lineTo(mx, y + 46); ctx.stroke(); }
    };
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(bx - 14, by - 30, bw + 28, 250, 18).fill(); }, { blur: 8, y: 3 });
    D.text(bx, by - 4, '🪨 분석한 암석 (측정값)', { size: 15, color: '#14a058', weight: 800, align: 'left' });
    row(by + 26, '모원소 (방사성)', frac, '#8b5cf6', 0.5);
    row(by + 96, '자원소 (붕괴 생성물)', 1 - frac, '#f59e0b', 0.5);
    D.text(bx, by + 180, '초록 선 = 분석한 암석의 비율 (50 : 50)', { size: 14, color: '#14a058', weight: 800, align: 'left' });
    D.text(bx, by + 206, '흐른 시간 ' + R.t.toFixed(1) + '억 년  ·  반감기 ' + HALF + '억 년', { size: 15, color: '#4c1d95', weight: 800, align: 'left' });
    if (Math.abs(frac - 0.5) < 0.04) D.label(gx + cell * 5, gy + cell * 10 + 72, '비율이 같아졌어요! ≈ 45억 년', { bg: '#14a058', size: 16 });
  }

  /* ======================================================
     화면 4: 시간 오차의 의미
     ====================================================== */
  const MAPR = PHONE ? { x: 20, y: 400, w: 560, h: 420 } : { x: 420, y: 60, w: 360, h: 380 };
  function drawGps(t) {
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, VW, VH);
    const G = S.gps, err = 3e8 * G.us * 1e-6;
    D.text(VW / 2, 28, '위성 시계가 1 µs 틀리면 위치는 얼마나 틀릴까?', { size: PHONE ? 16 : 18, color: '#1b2333', weight: 800 });
    // 위성-지구 장면
    const L = PHONE ? { x: 20, y: 50, w: 560, h: 330 } : { x: 14, y: 54, w: 392, h: 386 };
    ctx.save(); rr(L.x, L.y, L.w, L.h, 16).clip();
    const g = ctx.createLinearGradient(0, L.y, 0, L.y + L.h); g.addColorStop(0, '#050816'); g.addColorStop(0.75, '#15235a'); g.addColorStop(1, '#2563eb'); ctx.fillStyle = g; ctx.fillRect(L.x, L.y, L.w, L.h);
    const r = rng(5); for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + r() * 0.6) + ')'; ctx.beginPath(); ctx.arc(L.x + r() * L.w, L.y + r() * L.h * 0.7, 0.6 + r() * 1.1, 0, 6.3); ctx.fill(); }
    ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.ellipse(L.x + L.w / 2, L.y + L.h + L.h * 0.8, L.w * 0.9, L.h * 1.0, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.ellipse(L.x + L.w * 0.75, L.y + L.h * 0.98, L.w * 0.18, 12, 0, 0, 6.3); ctx.fill();
    ctx.restore();
    const sx = L.x + L.w * 0.3, sy = L.y + 66, rx = L.x + L.w * 0.5, ry = L.y + L.h - 62;
    // 신호 파면
    for (let k = 0; k < 3; k++) { const f = ((t * 0.55 + k / 3) % 1), rad = f * Math.hypot(rx - sx, ry - sy) * 1.05; ctx.strokeStyle = 'rgba(253,230,138,' + (0.7 * (1 - f)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, rad, 0.3, 1.5); ctx.stroke(); }
    D.glow(sx, sy, 50, '#fde68a', 0.5);
    D.shadow(() => { ctx.fillStyle = '#e2e8f0'; rr(sx - 18, sy - 12, 36, 24, 4).fill(); ctx.fillStyle = '#3b82f6'; rr(sx - 56, sy - 8, 34, 16, 2).fill(); rr(sx + 22, sy - 8, 34, 16, 2).fill(); }, { blur: 8, y: 3 });
    D.text(sx, sy + 40, '🛰️ GPS 위성 (원자시계)', { size: 14, color: '#fef3c7', weight: 800 });
    D.text(rx, ry + 34, '📱 내 스마트폰', { size: 14, color: '#fff', weight: 800 });
    D.sphere(rx, ry, 8, '#f26b3a');
    D.label(L.x + L.w / 2, L.y + L.h - 18, '위치 오차 = 3×10⁸ m/s × ' + G.us.toFixed(2) + ' µs', { bg: 'rgba(255,255,255,.95)', color: '#1b2333', size: PHONE ? 14 : 14 });
    // 지도
    ctx.save(); rr(MAPR.x, MAPR.y, MAPR.w, MAPR.h, 16).clip();
    ctx.fillStyle = '#ecf3e6'; ctx.fillRect(MAPR.x, MAPR.y, MAPR.w, MAPR.h);
    const span = G.zoom, ppm = MAPR.w / span, cx = MAPR.x + MAPR.w / 2, cy = MAPR.y + MAPR.h / 2;
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff';
    const block = Math.pow(10, Math.floor(Math.log10(span / 3))) ; // 도로 간격(m)
    const roadW = Math.max(2, block * 0.09 * ppm);
    ctx.lineWidth = roadW;
    for (let k = -8; k <= 8; k++) { const xx = cx + (k * block) * ppm - (cx - MAPR.x) % 1 * 0; ctx.beginPath(); ctx.moveTo(xx, MAPR.y); ctx.lineTo(xx, MAPR.y + MAPR.h); ctx.stroke(); const yy = cy + k * block * ppm; ctx.beginPath(); ctx.moveTo(MAPR.x, yy); ctx.lineTo(MAPR.x + MAPR.w, yy); ctx.stroke(); }
    // 오차 원
    const rad = err * ppm;
    ctx.fillStyle = 'rgba(226,70,75,.14)'; ctx.strokeStyle = 'rgba(226,70,75,.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, rad), 0, 6.3); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    const ea = -0.7, ex = cx + Math.cos(ea) * rad, ey = cy + Math.sin(ea) * rad;
    D.sphere(cx, cy, 9, '#3867f4'); D.text(cx, cy + 27, '실제 위치', { size: 13, color: '#1d4ed8', weight: 800 });
    if (rad > 4) { D.arrow(cx, cy, ex, ey, { color: '#e2464b', width: 3, head: 11 }); D.sphere(ex, ey, 9, '#e2464b'); D.text(ex + 12, ey - 8, '내비 위치', { size: 13, color: '#b91c1c', weight: 800, align: 'left' }); }
    ctx.restore();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; rr(MAPR.x, MAPR.y, MAPR.w, MAPR.h, 16).stroke();
    // 축척
    const bar = Math.pow(10, Math.floor(Math.log10(span * 0.4))), bpx = bar * ppm;
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(MAPR.x + 14, MAPR.y + MAPR.h - 18); ctx.lineTo(MAPR.x + 14 + bpx, MAPR.y + MAPR.h - 18); ctx.stroke();
    D.text(MAPR.x + 14, MAPR.y + MAPR.h - 28, bar >= 1000 ? (bar / 1000) + ' km' : bar + ' m', { size: 14, color: '#1b2333', weight: 800, align: 'left' });
    D.label(MAPR.x + MAPR.w - 10, MAPR.y + 22, '위치 오차 약 ' + (err >= 1000 ? (err / 1000).toFixed(1) + ' km' : Math.round(err) + ' m'), { bg: err <= 30 ? '#14a058' : '#e2464b', size: 15, align: 'right' });
    if (!PHONE) D.text(MAPR.x + MAPR.w / 2, MAPR.y + MAPR.h + 28, '🗺️ 지도 (오차가 클수록 축소해서 보여 줘요)', { size: 13, color: '#5d6879', weight: 700 });
    if (!PHONE) { D.text(L.x + L.w / 2, L.y + L.h + 28, 'GPS = 위성이 보낸 신호의 도착 시간으로 위치를 구해요', { size: 13, color: '#5d6879', weight: 700 }); }
  }
  /* 고속 카메라 */
  function startCam() {
    const C = S.cam; C.state = 'play'; C.u = 0; C.play = 0; C.n = Math.max(1, Math.round(C.fps * 0.02)); C.filmN = C.n; C.max = 0; Sound.click();
  }
  function stepCam(dt) {
    const C = S.cam; if (C.state !== 'play') return;
    C.play += dt * (RM ? 1 : 1); const idx = Math.min(C.n - 1, Math.floor(C.play * 30));
    C.shown = idx; C.u = C.n === 1 ? 0.0 : idx / (C.n - 1); C.max = Math.max(C.max, C.u);
    if (C.play * 30 >= C.n + 6) { C.state = 'done'; C.cnt = (C.cnt || 0) + 1; if (C.fps >= 10000) C.crown = true; Sound.success(); }
  }
  function drawCam(t) {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, VW, VH);
    const C = S.cam;
    D.text(VW / 2, 30, '🎥 물방울이 물에 떨어지는 약 0.02 초를 촬영해요', { size: PHONE ? 16 : 18, color: '#e2e8f0', weight: 800 });
    const px = VW / 2, py = PHONE ? 250 : 220, pw = PHONE ? 460 : 400;
    ctx.save(); rr(px - pw / 2, py - pw * 0.35, pw, pw * 0.7, 18).clip(); ctx.fillStyle = '#1e293b'; ctx.fillRect(px - pw / 2, py - pw * 0.35, pw, pw * 0.7);
    const u = C.state === 'idle' ? (t % 3 < 0.2 ? 0.0 : 0.0) : C.u; splash(px, py - pw * 0.05, pw * 0.8, C.state === 'idle' ? 0.1 : u, t); ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; rr(px - pw / 2, py - pw * 0.35, pw, pw * 0.7, 18).stroke();
    D.text(px - pw / 2 + 14, py - pw * 0.35 + 26, C.state === 'idle' ? '대기 중' : C.state === 'play' ? '▶ 재생 중' : '■ 재생 끝', { size: 14, color: '#fecaca', weight: 800, align: 'left' });
    // 필름
    const fy = py + pw * 0.35 + 26, fw = VW - 40, n = C.state === 'idle' ? Math.max(1, Math.round(C.fps * 0.02)) : C.n;
    D.text(20, fy + 4, '찍힌 사진 ' + comma(n) + '장 (0.02초 동안)', { size: 15, color: '#e2e8f0', weight: 800, align: 'left' });
    const show = Math.min(n, PHONE ? 16 : 24), cw = (fw - 8) / show;
    ctx.fillStyle = '#1e293b'; rr(20, fy + 16, fw, 58, 8).fill();
    for (let k = 0; k < show; k++) {
      const idx = n === 1 ? 0 : Math.round(k / (show - 1 || 1) * (n - 1)), on = C.state !== 'idle' && C.shown >= idx && C.state === 'play' || C.state === 'done';
      ctx.fillStyle = on ? '#7dd3fc' : '#334155'; rr(24 + k * cw, fy + 22, cw - 4, 46, 4).fill();
      if (C.state !== 'idle' && C.shown === idx && C.state === 'play') { ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; rr(24 + k * cw, fy + 22, cw - 4, 46, 4).stroke(); }
    }
    if (n > show) D.text(VW - 28, fy + 94, '… 총 ' + comma(n) + '장 중 ' + show + '장만 그렸어요', { size: 13, color: '#94a3b8', weight: 700, align: 'right' });
    const slow = C.fps / 30;
    D.label(VW / 2, fy + (PHONE ? 130 : 128), '30장/초로 재생하면 ' + (slow <= 1 ? '실제와 같은 속도' : '실제의 ' + comma(slow) + '배 느리게'), { bg: '#f26b3a', size: 16 });
    D.text(VW / 2, fy + (PHONE ? 170 : 164), C.fps >= 10000 ? '물방울이 솟아오르는 모습이 자세히 보여요!' : C.fps >= 1000 ? '조금 보이지만 아직 끊겨 보여요' : '한 장뿐이라 무슨 일이 일어나는지 알 수 없어요', { size: 15, color: '#fde68a', weight: 800 });
  }

  /* ======================================================
     입력 · 루프
     ====================================================== */
  const MODE_LABEL = { trip: '⏳ 시간 여행', clock: '⏱ 시계의 발전', old: '🌳 옛날 시간 재기', apply: '🛰️ 시간 오차의 의미' };
  const SUBS = { old: [['tree', '🌳 나이테'], ['ice', '🧊 빙하 코어'], ['radio', '☢️ 방사성 시계']], apply: [['gps', '🛰️ GPS 오차'], ['cam', '🎥 고속 카메라']] };
  const modeSeg = $('#modeSeg'), subSeg = $('#subSeg');
  function buildSub() {
    const list = SUBS[S.mode]; subSeg.innerHTML = '';
    if (!list) { subSeg.hidden = true; return; }
    list.forEach(([k, l]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.sub = k; b.textContent = l; b.className = S.sub === k ? 'on' : ''; b.addEventListener('click', () => { Sound.click(); setMode(S.mode, k); }); subSeg.appendChild(b); });
    subSeg.hidden = false;
  }
  function setMode(m, sub) {
    if (S.mode !== m || (sub && S.sub !== sub)) S.fade = 1;
    S.mode = m; S.sub = sub || (m === 'old' ? 'tree' : m === 'apply' ? 'gps' : '');
    S.drag = null; updateCtl();
  }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !(c.dataset.modes.split(' ').includes(S.mode) && (!c.dataset.sub || c.dataset.sub === S.sub)); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free);
    buildSub();
  }
  const sT = $('#sT'), oT = $('#oT'), sL = $('#sL'), oL = $('#oL'), sD = $('#sD'), oD = $('#oD'), sR = $('#sR'), oR = $('#oR'), sE = $('#sE'), oE = $('#oE');
  const b1 = SciSim.bindRange(sT, oT, (v) => pTxt(+v) + ' s', (v) => { S.tt = v; });
  SciSim.bindRange(sL, oL, (v) => (+v).toFixed(2) + ' m', (v) => { S.pend.L = v; });
  SciSim.bindRange(sD, oD, (v) => v + ' m', (v) => { S.ice.td = v; });
  SciSim.bindRange(sR, oR, (v) => (+v).toFixed(1) + '억 년', (v) => { S.radio.tt = v; });
  SciSim.bindRange(sE, oE, (v) => (+v).toFixed(2) + ' µs', (v) => { S.gps.tus = v; });
  function setT(v, instant) { S.tt = clamp(v, T_MIN, T_MAX); sT.value = S.tt; b1.refresh(); if (instant) S.t = S.tt; }
  function stepEvent(dir) {
    const cur = S.tt; let tgt = null;
    if (dir > 0) tgt = EVS.find((o) => o.e > cur + 0.15); else { for (let i = EVS.length - 1; i >= 0; i--) if (EVS[i].e < cur - 0.15) { tgt = EVS[i]; break; } }
    if (tgt) { setT(tgt.e); Sound.tick(); } else toast(dir > 0 ? '더 긴 사건은 없어요' : '더 짧은 사건은 없어요', '', 1200);
  }
  $('#bPrev').addEventListener('click', () => stepEvent(-1));
  $('#bNext').addEventListener('click', () => stepEvent(1));
  $('#bRun').addEventListener('click', startRun);
  $('#bTreeReset').addEventListener('click', () => { Sound.click(); S.tree.counted.clear(); S.tree.seq = []; S.tree.pulse = {}; });
  $('#bCam').addEventListener('click', startCam);
  $$('#fpsSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cam.fps = +b.dataset.fps; $$('#fpsSeg button').forEach((x) => x.classList.toggle('on', x === b)); $('#oF').textContent = comma(S.cam.fps) + '장/초'; S.cam.state = 'idle'; S.cam.n = Math.max(1, Math.round(S.cam.fps * 0.02)); }));
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'trip') { const g = S.mapGeom; if (g && p.y > g.my - 24 && p.y < g.my + 14 && p.x > g.mx0 - 12 && p.x < g.mx1 + 12) { S.mapDrag = true; setT(T_MIN + (p.x - g.mx0) / (g.mx1 - g.mx0) * (T_MAX - T_MIN)); return true; } return false; }
      return false;
    },
    move(p) { if (S.mapDrag) { const g = S.mapGeom; setT(T_MIN + (p.x - g.mx0) / (g.mx1 - g.mx0) * (T_MAX - T_MIN)); } },
    up() { S.mapDrag = false; },
    hover(p) { if (S.mode === 'trip') { const g = S.mapGeom; return g && p.y > g.my - 24 && p.y < g.my + 14 ? 'pointer' : 'default'; } if (S.mode === 'old' && S.sub === 'tree') return ringAt(p) >= 0 ? 'pointer' : 'default'; return 'default'; },
  });
  // 나이테는 짧게 눌러도 반응하도록 캔버스 클릭도 받음
  $('#cv').addEventListener('pointerdown', (e) => { if (S.mode === 'old' && S.sub === 'tree') treeClick(view.toLocal(e)); });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'trip') { const near = nearestEv(S.t); L1 = '시간 눈금'; a = pTxt(S.t) + ' s'; L2 = '가까운 사건'; b = near.name; L3 = '우리말로 하면'; c = eqT(S.t); }
    else if (S.mode === 'clock') { const T = periodOf(S.pend.L); L1 = '진자의 주기'; a = T.toFixed(2) + ' s'; L2 = '수정 시계 한 번 떨림'; b = '3.1×10⁻⁵ s'; L3 = '세슘 한 번 진동'; c = '1.1×10⁻¹⁰ s'; }
    else if (S.mode === 'old' && S.sub === 'tree') { L1 = '센 나이테'; a = S.tree.counted.size + ' 개'; L2 = '나무 나이'; b = S.tree.counted.size + ' 년'; L3 = ''; c = ''; }
    else if (S.mode === 'old' && S.sub === 'ice') { L1 = '깊이'; a = S.ice.d.toFixed(0) + ' m'; L2 = '얼음의 나이'; b = '약 ' + koNum(iceAge(S.ice.d)) + ' 년'; L3 = '줄무늬 한 쌍 두께'; c = ((iceDepth(iceAge(S.ice.d) + 1) - iceDepth(iceAge(S.ice.d))) * 100).toFixed(1) + ' cm'; }
    else if (S.mode === 'old') { const f = Math.pow(0.5, S.radio.t / HALF); L1 = '흐른 시간'; a = S.radio.t.toFixed(1) + '억 년'; L2 = '모원소 : 자원소'; b = Math.round(f * 100) + ' : ' + Math.round((1 - f) * 100); L3 = '분석한 암석'; c = '50 : 50'; }
    else if (S.sub === 'gps') { const err = 3e8 * S.gps.us * 1e-6; L1 = '시계 오차'; a = S.gps.us.toFixed(2) + ' µs'; L2 = '위치 오차'; b = err >= 1000 ? (err / 1000).toFixed(2) + ' km' : Math.round(err) + ' m'; L3 = '빛의 속력'; c = '3×10⁸ m/s'; }
    else { L1 = '카메라'; a = comma(S.cam.fps) + '장/초'; L2 = '찍힌 사진'; b = comma(Math.max(1, Math.round(S.cam.fps * 0.02))) + '장'; L3 = '느려진 정도'; c = S.cam.fps <= 30 ? '1배' : comma(S.cam.fps / 30) + '배'; }
    const key = L1 + a + L2 + b + L3 + c; if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3 || ' '; v3.textContent = c || ' ';
    v3.parentElement.style.visibility = L3 ? 'visible' : 'hidden';
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    if (li === 0) { S.minV = S.maxV = false; S.seen = new Set(); setMode('trip'); setT(0, true); }
    else if (li === 1) { S.pend.L = 0.6; sL.value = 0.6; $('#sL').dispatchEvent(new Event('input')); S.run.state = 'idle'; S.run.res = null; S.run.count = 0; setMode('clock'); }
    else if (li === 2) { resetOld(); setMode('old', 'tree'); }
    else { S.gps.us = S.gps.tus = 3; sE.value = 3; sE.dispatchEvent(new Event('input')); S.cam.fps = 30; S.cam.state = 'idle'; S.cam.cnt = 0; S.cam.crown = false; S.cam.n = 1; $$('#fpsSeg button').forEach((x) => x.classList.toggle('on', x.dataset.fps === '30')); $('#oF').textContent = '30장/초'; S.gps.ok = false; setMode('apply', 'gps'); }
  }
  function resetOld() { S.tree.counted.clear(); S.tree.seq = []; S.tree.pulse = {}; S.ice.d = S.ice.td = 0; sD.value = 0; sD.dispatchEvent(new Event('input')); S.radio.t = S.radio.tt = 0; sR.value = 0; sR.dispatchEvent(new Event('input')); S.oldFlags = { tree: false, ice: false, radio: false }; initAtoms(); }
  function ensure(m, sub) { if (S.mode !== m || (sub && S.sub !== sub)) setMode(m, sub); }
  const seenN = () => S.seen.size;
  const levels = [
    {
      title: '시간 여행: 아토초에서 우주의 나이까지', short: '시간 여행', icon: '⏳', phase: '관찰',
      features: ['trip'],
      intro: '<p class="si-q">❓ 탐구 질문: 가장 짧은 시간과 가장 긴 시간은 얼마일까? 우리는 시간을 얼마나 정밀하게 잴 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 길이를 10의 거듭제곱으로 나타내며 공간의 규모를 여행했어요. 이번에는 같은 방법으로 <b>시간의 규모</b>를 여행해요. (중2 Ⅷ에서 배운 우주의 나이도 만나요.)</div>' +
        '<p>시간도 <b>초(s)</b>를 기준으로 10의 거듭제곱으로 나타내요. 지수가 1 커지면 시간은 10배! 슬라이더를 돌리며 어떤 일이 얼마 만에 일어나는지 살펴봐요.</p>',
      setup() { enterLevel(0); showHint('⏳ 슬라이더를 끌어 보세요', 6000); },
      recap: '자연의 시간 규모는 아토초(10⁻¹⁸ s)에서 우주의 나이(약 10¹⁷·⁶ s)까지 지수로 약 36칸이에요. 사람이 느끼는 시간은 그중 아주 일부예요.',
      summary: '<ul><li>시간도 <b>10의 거듭제곱</b>으로 나타내요. 지수가 1 커지면 시간은 10배예요.</li><li>전자 운동 약 10⁻¹⁸ s · 화학 반응 약 10⁻¹⁵ s · 눈 깜빡임 약 0.1 s · 하루 약 8.6×10⁴ s · 우주의 나이 약 4.4×10¹⁷ s</li><li>사람이 직접 느끼는 시간(약 0.1 s ~ 100년)은 과학이 다루는 시간 규모의 <b>작은 부분</b>이에요.</li></ul>',
      missions: [
        {
          title: '가장 짧은 사건, 가장 긴 사건',
          goal: '슬라이더를 끝까지 돌려 가장 짧은 <b>전자의 운동</b>과 가장 긴 <b>우주의 나이</b>를 모두 만나 보세요.',
          hint: '맨 왼쪽(−18)과 맨 오른쪽(+18) 근처까지 끌어 봐요. ◀ ▶ 버튼으로 사건을 하나씩 넘길 수도 있어요.',
          setup() { ensure('trip'); S.minV = S.maxV = false; },
          check: () => { if (S.t <= -17.6) S.minV = true; if (S.t >= 17.4) S.maxV = true; return S.minV && S.maxV; }, hold: 0.3,
          status: () => mark(S.minV) + ' 가장 짧은 사건(전자 운동) · ' + mark(S.maxV) + ' 가장 긴 사건(우주의 나이)',
          explain: '전자의 운동은 약 <b>10⁻¹⁸ s</b>, 우주의 나이는 약 <b>4.4×10¹⁷ s</b>예요. 지수로 약 36칸이나 차이 나서 10의 거듭제곱으로 나타내야 한눈에 비교돼요.',
        },
        {
          type: 'quiz', title: '경험의 범위와 과학의 범위',
          goal: '사람이 직접 느끼는 시간은 대략 <b>0.1 s에서 100년</b>(약 10⁻¹ ~ 10⁹ s)이에요. 과학이 다루는 시간 범위와 비교한 설명으로 <b>옳은</b> 것은?',
          setup() { ensure('trip'); },
          choices: ['과학이 다루는 시간은 사람이 느끼는 시간과 거의 같다', '과학은 사람이 느끼는 시간보다 훨씬 짧은 쪽과 긴 쪽 모두를 다룬다', '과학은 사람이 느끼는 시간보다 짧은 쪽만 다룬다', '과학은 사람이 느끼는 시간보다 긴 쪽만 다룬다'],
          answer: 1,
          feedback: ['사람이 느끼는 범위는 지수 약 10칸이지만, 과학이 다루는 범위는 약 36칸이에요.', '', '우주의 나이나 지구의 나이 같은 아주 긴 시간도 과학이 다뤄요.', '화학 반응(10⁻¹⁵ s)처럼 아주 짧은 시간도 과학이 다뤄요.'],
          explain: '과학은 측정 기술을 발전시켜 <b>10⁻¹⁸ s 같은 짧은 순간부터 10¹⁷ s가 넘는 긴 시간</b>까지 경험의 범위를 넓혔어요. 짧은 쪽은 레이저·고속 카메라로, 긴 쪽은 나이테·방사성 연대 측정으로 알아내요.',
        },
      ],
    },
    {
      title: '시계의 발전: 더 잘게 나누는 진동', short: '시계의 발전', icon: '⏱', phase: '실험',
      features: ['clock'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시간이 10⁻¹⁸ s에서 10¹⁸ s까지 넓게 펼쳐져 있음을 봤어요. 그렇다면 1초는 어떻게 정밀하게 잴까요?</div>' +
        '<p>모든 시계는 <b>규칙적으로 진동하는 물체</b>를 이용해요. 진동수가 클수록 1초를 더 잘게 나눌 수 있어요. 진자 · 수정 · 세슘 원자를 비교해 봐요.</p>',
      setup() { enterLevel(1); },
      recap: '진동수가 클수록 시간을 더 잘게 나눌 수 있어 시계가 정밀해져요. 세슘 원자시계는 1초를 약 92억 번의 진동으로 정의해요.',
      summary: '<table class="mini"><tr><th>시계</th><th>1초 동안 진동</th><th>한 번의 시간</th></tr><tr><td>진자(0.25 m)</td><td>1번 왕복</td><td>약 1 s</td></tr><tr><td>수정 진동자</td><td>32 768번</td><td>약 3.1×10⁻⁵ s</td></tr><tr><td>세슘 원자</td><td>9 192 631 770번</td><td>약 1.1×10⁻¹⁰ s</td></tr></table><ul><li>진자의 주기는 길이로 정해져요. 길이 0.25 m → 약 1 s.</li><li><b>1초</b> = 세슘-133 원자가 내는 특정한 빛이 9 192 631 770번 진동하는 시간 (수천만 년에 약 1초 오차)</li></ul>',
      missions: [
        {
          title: '진자의 주기를 1초로',
          goal: '진자의 길이를 조절해 <b>주기가 1.0 s</b>(왕복 시간 1초)가 되게 맞추세요.',
          hint: '길이가 길수록 주기가 길어지니, 지금보다 짧게 해야 해요. 약 0.25 m 근처에서 찾아 봐요.',
          setup() { ensure('clock'); },
          check: () => Math.abs(periodOf(S.pend.L) - 1) <= 0.02, hold: 0.8,
          status: () => '주기 <b>' + periodOf(S.pend.L).toFixed(2) + ' s</b> (목표 1.00 s) · 길이 ' + S.pend.L.toFixed(2) + ' m',
          explain: '진자의 주기는 길이에 따라 정해져요. 길이 <b>0.25 m</b>일 때 주기가 약 <b>1.0 s</b>예요. 그래서 오래전에는 길이 0.25 m쯤 되는 진자를 시계에 썼어요.',
        },
        {
          title: '세 시계로 1분 재기',
          goal: '<b>▶ 세 시계로 1분 재기</b>를 눌러 진자 · 수정 · 세슘 시계가 1분을 얼마나 정확하게 재는지 비교해 보세요.',
          hint: '버튼을 누르고 약 5초 기다리면 세 시계의 결과가 나와요.',
          setup() { ensure('clock'); S.run.count = 0; },
          check: () => S.run.state === 'done', hold: 0.6,
          status: () => S.run.state === 'run' ? '⏳ 재는 중… ' + Math.round(S.run.p * 100) + '%' : S.run.state === 'done' ? '🏁 세 시계의 결과를 비교해 보세요' : '▶ 1분 재기를 눌러요',
          explain: '진동수가 큰 시계일수록 1초를 더 잘게 나눠서 오차가 작아요. 오차는 <b>진자 &gt; 수정 &gt; 세슘</b> 순으로 작아지고, 세슘 원자시계는 수천만 년에 약 1초만 어긋나요. (표시한 오차는 대표적인 예시 값이에요.)',
        },
        {
          type: 'quiz', title: '원자시계가 정밀한 까닭',
          goal: '세슘 원자시계가 매우 정밀한 까닭으로 가장 알맞은 것은?',
          setup() { ensure('clock'); },
          choices: ['원자의 진동은 어디서나 같고, 진동수가 매우 커서 시간을 아주 잘게 나눌 수 있다', '원자가 진자보다 커서 눈금이 잘 보인다', '세슘 원자는 온도에 따라 진동수가 크게 달라진다', '원자시계는 사람이 직접 눈으로 세기 때문이다'],
          answer: 0,
          feedback: ['', '원자는 눈에 보이지 않을 만큼 작아요. 중요한 것은 크기가 아니라 진동수예요.', '그렇다면 시계로 쓸 수 없어요. 세슘 원자의 진동수는 일정해서 기준으로 삼아요.', '원자의 진동수는 기계가 세요. 초당 약 92억 번이라 사람이 셀 수 없어요.'],
          explain: '같은 종류의 원자가 내는 빛의 진동수는 <b>어디서나 같고 변하지 않아서</b> 믿을 수 있는 기준이 돼요. 게다가 진동수가 약 92억 Hz로 매우 커서 1초를 아주 잘게 나눌 수 있어요.',
        },
      ],
    },
    {
      title: '옛날 시간 재기: 나이테에서 방사성 시계까지', short: '옛날 시간', icon: '🌳', phase: '분석',
      features: ['old'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 짧은 시간은 정밀한 시계로 쟀어요. 그렇다면 사람이 직접 보지 못한 <b>아주 오래전의 시간</b>은 어떻게 알아낼까요?</div>' +
        '<p>자연은 시간을 기록해 두어요. <b>나이테</b>와 <b>빙하의 줄무늬</b>는 해마다 한 겹씩 쌓이고, 암석 속 <b>방사성 원소</b>는 일정한 속도로 변해서 시계처럼 쓸 수 있어요.</p>',
      setup() { enterLevel(2); },
      recap: '나이테·빙하의 줄무늬는 수천~수십만 년, 암석 속 방사성 원소는 수십억 년의 시간을 알려 주는 자연의 시계예요.',
      summary: '<ul><li><b>나이테</b>: 고리 1개 = 1년. 넓은 고리는 자라기 좋은 해, 좁은 고리는 가문 해.</li><li><b>빙하 코어</b>: 줄무늬 한 쌍 = 1년. 깊을수록 오래된 얼음 (수십만 년까지).</li><li><b>방사성 연대 측정</b>: 방사성 원소는 일정한 시간(반감기)마다 절반씩 다른 원소로 변해요. 암석 속 모원소와 자원소의 비율로 나이를 알아내요. (지구 나이 약 45억 년)</li></ul>',
      missions: [
        {
          title: '나이테와 빙하 줄무늬 읽기',
          goal: '<b>나이테 10개</b>를 모두 눌러 세고, <b>빙하 코어</b>에서 <b>약 1만 년 전</b> 얼음이 있는 깊이를 찾아 보세요.',
          hint: '나이테는 가운데에서 바깥으로 차례로 눌러요. 빙하는 깊이 슬라이더를 움직이며 "얼음의 나이"를 읽어요(약 600~700 m).',
          setup() { ensure('old', 'tree'); S.oldFlags = { tree: false, ice: false, radio: false }; },
          check: () => { if (S.tree.counted.size >= S.tree.n) S.oldFlags.tree = true; const a = iceAge(S.ice.d); if (a >= 8500 && a <= 11500) S.oldFlags.ice = true; return S.oldFlags.tree && S.oldFlags.ice; }, hold: 0.4,
          status: () => mark(S.oldFlags && S.oldFlags.tree) + ' 나이테 세기 <b>' + S.tree.counted.size + ' / ' + S.tree.n + '</b> · ' + mark(S.oldFlags && S.oldFlags.ice) + ' 1만 년 전 얼음(지금 약 ' + koNum(iceAge(S.ice.d)) + '년 전)',
          explain: '나이테 10개는 이 나무가 <b>10년</b> 동안 자랐다는 뜻이에요. 빙하 코어는 약 <b>600 m</b> 깊이에서 약 1만 년 전의 얼음이 나와요. 깊이 들어갈수록 더 오래된 얼음이라서, 줄무늬를 세면 그 시대의 기후도 알 수 있어요.',
        },
        {
          title: '방사성 시계로 암석의 나이 재기',
          goal: '<b>흐른 시간</b> 슬라이더를 움직여 모원소와 자원소의 비율이 분석한 암석(<b>50 : 50</b>)과 같아지는 때를 찾으세요.',
          hint: '모원소가 절반으로 줄어드는 데 걸리는 시간이 반감기(45억 년)예요. 반감기만큼 흘렀을 때를 찾아봐요.',
          setup() { ensure('old', 'radio'); },
          check: () => Math.abs(S.radio.t - HALF) <= 4, hold: 0.8,
          status: () => '흐른 시간 <b>' + S.radio.t.toFixed(1) + '억 년</b> · 모원소 ' + Math.round(Math.pow(0.5, S.radio.t / HALF) * 100) + '% (목표 50%)',
          explain: '암석 속 모원소가 절반(50 %)으로 줄고 자원소가 절반이 되었다면 <b>반감기 1번</b>이 지난 거예요. 이 방사성 원소의 반감기는 약 45억 년이므로 암석의 나이는 <b>약 45억 년</b>이에요. 지구에서 가장 오래된 암석과 운석으로 지구 나이를 약 45억 년으로 추정해요.',
        },
        {
          type: 'quiz', title: '방사성 연대 측정의 장점',
          goal: '방사성 연대 측정으로 <b>수십억 년</b>의 시간까지 잴 수 있는 까닭은?',
          setup() { ensure('old', 'radio'); },
          choices: ['방사성 원소는 반감기가 수억~수십억 년인 것도 있어서, 아주 오래된 암석에 남은 비율을 이용할 수 있다', '방사성 원소는 해마다 한 겹씩 쌓여서 세기만 하면 된다', '암석은 나무처럼 자라기 때문이다', '방사성 원소는 시간이 지나도 전혀 변하지 않기 때문이다'],
          answer: 0,
          feedback: ['', '해마다 쌓이는 것은 나이테·빙하 줄무늬예요. 방사성 원소는 일정한 비율로 변해요.', '암석은 자라지 않아요. 암석이 만들어질 때 들어간 방사성 원소가 변해 가요.', '변하지 않는다면 시계로 쓸 수 없어요. 일정한 속도로 변하기 때문에 시계가 돼요.'],
          explain: '방사성 원소는 온도나 압력에 상관없이 <b>일정한 속도</b>로 변하고, 반감기가 아주 긴 것도 있어서 수십억 년 된 암석의 나이를 잴 수 있어요. 나이테는 수천 년, 빙하는 수십만 년까지가 한계예요.',
        },
      ],
    },
    {
      title: '시간 오차가 만드는 차이', short: '적용', icon: '🛰️', phase: '적용',
      features: ['apply'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 진동수가 큰 원자시계가 가장 정밀하다는 것과, 자연이 남긴 시계로 먼 옛날을 잰다는 것을 알았어요.</div>' +
        '<p>정밀한 시계는 어디에 쓰일까요? <b>GPS</b>는 위성의 원자시계 덕분에 내 위치를 알려 줘요. 또 <b>고속 카메라</b>는 눈 깜빡임보다 훨씬 짧은 순간을 보여 줘요.</p>',
      setup() { enterLevel(3); },
      recap: '시간 오차는 빛의 속력을 곱한 만큼 위치 오차가 돼요(1 µs → 약 300 m). 그래서 GPS에는 원자시계가 필요하고, 짧은 순간을 보려면 1초에 아주 많은 사진을 찍어요.',
      summary: '<ul><li>GPS 위치 오차 = <b>빛의 속력 × 시계 오차</b> = 3×10⁸ m/s × 1 µs ≈ <b>300 m</b></li><li>위성에는 원자시계를 써서 시계 오차를 매우 작게 해요 (수 ns 이하 → 몇 m).</li><li>고속 카메라는 1초에 수천~수만 장을 찍어 눈 깜빡임보다 짧은 순간(물방울이 튀는 약 0.02 s)을 느리게 보여 줘요.</li></ul>',
      missions: [
        {
          title: '위치 오차를 30 m 안으로',
          goal: '<b>위성 시계 오차</b>를 줄여서 내비게이션 <b>위치 오차가 30 m 이하</b>가 되게 하세요.',
          hint: '위치 오차 = 3×10⁸ m/s × 시계 오차예요. 30 m ÷ (3×10⁸ m/s) = 1×10⁻⁷ s = 0.1 µs 이하로!',
          setup() { ensure('apply', 'gps'); },
          check: () => 3e8 * S.gps.us * 1e-6 <= 30.5 && S.gps.us > 0, hold: 0.8,
          status: () => '시계 오차 <b>' + S.gps.us.toFixed(2) + ' µs</b> → 위치 오차 <b>' + (3e8 * S.gps.us * 1e-6 >= 1000 ? (3e8 * S.gps.us * 1e-6 / 1000).toFixed(1) + ' km' : Math.round(3e8 * S.gps.us * 1e-6) + ' m') + '</b>',
          explain: '1 µs(10⁻⁶ s)의 시계 오차만 있어도 빛은 300 m를 가요. 그래서 위치 오차가 <b>300 m</b>가 돼요. 30 m 이하로 맞추려면 시계 오차를 <b>0.1 µs 이하</b>로 줄여야 하죠. 위성에 정밀한 원자시계를 싣는 이유예요.',
        },
        {
          type: 'quiz', title: '원자시계와 GPS',
          goal: 'GPS 위성에 <b>원자시계</b>가 필요한 까닭은?',
          setup() { ensure('apply', 'gps'); },
          choices: ['위치 오차 = 빛의 속력 × 시간 오차이므로, 아주 작은 시간 오차도 큰 위치 오차가 되기 때문이다', '위성이 너무 무거워서 원자시계로 균형을 잡아야 하기 때문이다', '원자시계가 있으면 위성이 더 빠르게 날기 때문이다', '위성은 시계 없이 신호만 보내므로 원자시계는 필요 없다'],
          answer: 0,
          feedback: ['', '시계의 무게와 균형은 GPS와 관계없어요. 시계가 알려 주는 시각이 중요해요.', '시계는 위성의 속도에 영향을 주지 않아요.', 'GPS 신호에는 위성 시계의 시각이 담겨 있어서 시계가 매우 중요해요.'],
          explain: '빛은 1 ns(10⁻⁹ s)에 약 0.3 m를 가요. 시계가 수 ns만 틀려도 위치가 몇 m 어긋나요. 그래서 <b>수천만 년에 1초 정도만 틀리는 원자시계</b>를 써요.',
        },
        {
          title: '눈 깜빡임보다 짧은 순간 보기',
          goal: '고속 카메라를 <b>1초에 10000장</b>으로 맞추고 <b>🎬 촬영하고 재생하기</b>로 물방울이 튀는 순간을 천천히 보세요.',
          hint: '1초에 찍는 사진 수를 10000으로 바꾸고 재생 버튼을 눌러요. 재생이 끝날 때까지 기다려요(약 7초).',
          setup() { ensure('apply', 'cam'); S.cam.crown = false; },
          check: () => !!S.cam.crown, hold: 0.5,
          status: () => mark(S.cam.fps >= 10000) + ' 10000장/초 · ' + mark(!!S.cam.crown) + ' 끝까지 재생' + (S.cam.state === 'play' ? ' (' + S.cam.shown + '/' + S.cam.n + '장)' : ''),
          explain: '물방울이 튀는 시간은 약 0.02 s로 눈 깜빡임(0.1 s)보다 짧아요. 1초에 30장을 찍으면 1장뿐이라 알 수 없지만, <b>1초에 10000장</b>을 찍으면 약 200장이 찍혀서 30장/초로 재생할 때 <b>약 333배 느리게</b> 볼 수 있어요. 눈 깜빡임보다 짧은 현상은 이렇게 보아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-scale-time', mount: '#game', badge: '시간 탐험가', homeHref: '../../index.html#h1a',
    featureLabels: { trip: '⏳ 시간 눈금 슬라이더', clock: '⏱ 진자·수정·원자시계 비교', old: '🌳 나이테 · 🧊 빙하 코어 · ☢️ 방사성 시계', apply: '🛰️ GPS 시계 오차 · 🎥 고속 카메라' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initAtoms(); S.oldFlags = { tree: false, ice: false, radio: false };
  setT(0, true); updateCtl();
  let lastFree = false, lastCnt = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.t = RM ? S.tt : SciSim.approach(S.t, S.tt, dt, 5); if (Math.abs(S.t - S.tt) < 0.003) S.t = S.tt;
    S.ice.d = RM ? S.ice.td : SciSim.approach(S.ice.d, S.ice.td, dt, 8); if (Math.abs(S.ice.d - S.ice.td) < 0.3) S.ice.d = S.ice.td;
    S.radio.t = RM ? S.radio.tt : SciSim.approach(S.radio.t, S.radio.tt, dt, 8); if (Math.abs(S.radio.t - S.radio.tt) < 0.02) S.radio.t = S.radio.tt;
    S.gps.us = RM ? S.gps.tus : SciSim.approach(S.gps.us, S.gps.tus, dt, 10); if (Math.abs(S.gps.us - S.gps.tus) < 0.004) S.gps.us = S.gps.tus;
    const errm = Math.max(30, 3e8 * S.gps.us * 1e-6 * 3.3); S.gps.zoom = Math.exp(SciSim.approach(Math.log(S.gps.zoom), Math.log(errm), dt, 4));
    // 진자
    const T = periodOf(S.pend.L); const ph0 = S.pend.ph; S.pend.ph += dt / T; if (Math.floor(S.pend.ph) > Math.floor(ph0)) { S.pend.n++; if (S.mode === 'clock') Sound.tick(); }
    stepRun(dt); stepCam(dt);
    S.radio.atoms.forEach((a) => { const decayed = a.u > Math.pow(0.5, S.radio.t / HALF), tgt = decayed ? 0 : 1; if (a.on !== tgt) { a.on = tgt; a.flip = 1; } a.flip = Math.max(0, a.flip - dt * 2.2); });
    for (const k in S.tree.pulse) S.tree.pulse[k] = Math.max(0, S.tree.pulse[k] - dt * 1.5);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'trip') drawTrip(t);
    else if (S.mode === 'clock') { ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH); for (let i = 0; i < 3; i++) drawClockPanel(i, t); }
    else if (S.mode === 'old') { if (S.sub === 'tree') drawTree(t); else if (S.sub === 'ice') drawIce(t); else drawRadio(t); }
    else if (S.sub === 'gps') drawGps(t); else drawCam(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, EVS, get game() { return game; }, setT, stepEvent, setMode, enterLevel, startRun, startCam, treeClick, TREE_C, TR, ringAt,
    setL(v) { S.pend.L = v; sL.value = v; sL.dispatchEvent(new Event('input')); },
    setD(v) { sD.value = v; sD.dispatchEvent(new Event('input')); },
    setR(v) { sR.value = v; sR.dispatchEvent(new Event('input')); },
    setE(v) { sE.value = v; sE.dispatchEvent(new Event('input')); },
    setFps(v) { const b = $$('#fpsSeg button').find((x) => +x.dataset.fps === v); b.click(); },
    iceAge, periodOf,
  };
})();
