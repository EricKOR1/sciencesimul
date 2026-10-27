/* =========================================================
   통합과학1 Ⅰ. 과학의 기초 - 공간의 규모 (단원 1차시)
   성취기준 [10통과1-01-01] 자연을 시간과 공간에서 기술할 수 있음을 알고, 길이와 시간 측정의 현대적 방법과
   다양한 규모의 측정 사례를 조사할 수 있다.
   ① 관찰: 줌 여행 (양성자 10⁻¹⁵ m ~ 관측 가능한 우주 10²⁷ m)
   ② 탐구: 규모 비교 (카드 12장을 지수 눈금자에)
   ③ 분석: 미시·거시 비교표
   ④ 적용: 측정 도구 (도구–대상 짝짓기, 레이저 거리 계산, 과학의 한계)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 860 : 560;
  const RM = SciSim.reduceMotion;
  const REF = PHONE ? 170 : 200;                       // 눈금 막대의 화면 길이(px)
  const SUPD = { '.': '·', '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  const p10 = (n) => '10' + sup(n);
  const MINUS = '−';
  const sgn = (n) => (n < 0 ? MINUS + Math.abs(n) : String(n));
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- 자료: 길이 (m) ---------- */
  const OBJ = [
    { id: 'proton', name: '양성자', short: '양성자', m: 1e-15, txt: '약 1×10⁻¹⁵ m', note: '원자핵을 이루는 입자예요.', ans: -15 },
    { id: 'hatom', name: '수소 원자', short: '수소 원자', m: 1e-10, txt: '약 1×10⁻¹⁰ m', note: '핵 둘레를 전자 구름이 감싸요.', ans: -10 },
    { id: 'dna', name: 'DNA의 폭', short: 'DNA 폭', m: 2e-9, txt: '약 2×10⁻⁹ m', note: '이중 나선의 지름이에요.', ans: -9 },
    { id: 'virus', name: '바이러스', short: '바이러스', m: 1e-7, txt: '약 1×10⁻⁷ m', note: '전자 현미경으로 볼 수 있어요.', ans: -7 },
    { id: 'rbc', name: '적혈구', short: '적혈구', m: 7e-6, txt: '약 7×10⁻⁶ m', note: '광학 현미경으로 볼 수 있어요.', ans: -5 },
    { id: 'hair', name: '머리카락 굵기', short: '머리카락', m: 1e-4, txt: '약 1×10⁻⁴ m', note: '맨눈으로 겨우 보이는 크기예요.', ans: -4 },
    { id: 'ant', name: '개미', short: '개미', m: 5e-3, txt: '약 5×10⁻³ m', note: '몸길이 5 mm 정도예요.', ans: -2 },
    { id: 'human', name: '사람 키', short: '사람 키', m: 1.7, txt: '약 1.7 m', note: '우리가 몸으로 느끼는 크기예요.', ans: 0 },
    { id: 'everest', name: '에베레스트산 높이', short: '에베레스트산', m: 8.8e3, txt: '약 8.8×10³ m', note: '지구에서 가장 높은 산이에요.', ans: 4 },
    { id: 'earth', name: '지구 지름', short: '지구', m: 1.3e7, txt: '약 1.3×10⁷ m', note: '약 1만 3천 km예요.', ans: 7 },
    { id: 'sun', name: '태양 지름', short: '태양', m: 1.4e9, txt: '약 1.4×10⁹ m', note: '지구 지름의 약 109배예요.', ans: 9 },
    { id: 'esdist', name: '지구–태양 거리', short: '지구–태양', m: 1.5e11, txt: '약 1.5×10¹¹ m', note: '빛이 약 8분 20초 걸려요.', ans: 11 },
    { id: 'proxima', name: '가장 가까운 별까지', short: '프록시마', m: 4e16, txt: '약 4×10¹⁶ m (4.2광년)', note: '프록시마 센타우리까지 거리예요.', ans: 17 },
    { id: 'milkyway', name: '우리은하 지름', short: '우리은하', m: 9.5e20, txt: '약 9.5×10²⁰ m (10만 광년)', note: '태양계는 은하 안쪽에 있어요.', ans: 21 },
    { id: 'universe', name: '관측 가능한 우주', short: '관측 가능한 우주', m: 9e26, txt: '약 9×10²⁶ m (930억 광년)', note: '빛이 우리에게 도달한 범위예요.', ans: 27 },
  ];
  OBJ.forEach((o) => { o.le = Math.log10(o.m); });
  const OB = {}; OBJ.forEach((o) => { OB[o.id] = o; });
  const E_MIN = -15, E_MAX = 27;

  /* 눈금 막대 길이를 알기 쉬운 말로 */
  function koNum(v) {
    const r = (x) => { const s = +x.toPrecision(2); return String(s); };
    const w = +v.toPrecision(2);   // 반올림한 값으로 단위를 정해요
    if (w >= 1e8) return r(v / 1e8) + '억';
    if (w >= 1e4) return r(v / 1e4) + '만';
    const q = r(v); return /^\d+$/.test(q) ? q.replace(/(\d)(?=(\d{3})+$)/g, '$1,') : q;
  }
  function eq(e) {
    const m = Math.pow(10, e);
    if (e < -12) return koNum(m * 1e15) + ' fm';
    if (e < -9) return koNum(m * 1e12) + ' pm';
    if (e < -6) return koNum(m * 1e9) + ' nm';
    if (e < -3) return koNum(m * 1e6) + ' µm';
    if (e < -2) return koNum(m * 1e3) + ' mm';
    if (e < 0) return koNum(m * 100) + ' cm';
    if (e < 3) return koNum(m) + ' m';
    if (e < 10.5) return koNum(m / 1e3) + ' km';
    if (e < 15) return koNum(m / 1.496e11) + ' 천문단위';
    return koNum(m / 9.461e15) + ' 광년';
  }
  const eNice = (e) => { const r = Math.round(e * 10) / 10; return (r < 0 ? MINUS : '') + Math.abs(r).toFixed(Math.abs(r - Math.round(r)) < 0.05 ? 0 : 1); };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'zoom', sub: 'match', clock: 0, fade: 0,
    e: 0, te: 0, seen: new Set(), minV: false, maxV: false, nearId: 'human', infoA: 1,
    cards: [], placeVer: 0, revealCards: 0, lastCard: null,
    cells: [], chips: [], tableOK: 0,
    slots: [], tcards: [], reveal: 0, toolsOK: false,
    laser: { state: 'idle', p: 0, t: 0, shown: false },
    drag: null, pop: [],
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f4f8fd' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FS = PHONE ? 1.2 : 1;
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const font = (n, w) => D.font(n, w || 700);
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };

  /* ======================================================
     그림: 물체 아이콘 (S = 특징 길이를 화면 픽셀로 나타낸 값, mini = 카드용 작은 그림)
     ====================================================== */
  const R1 = rng(7);
  const HCLOUD = Array.from({ length: 60 }, () => ({ a: R1() * 6.28, r: Math.sqrt(-2 * Math.log(1 - R1() * 0.97)) * 0.2, w: (R1() - 0.5) * 1.6, ph: R1() * 6 }));
  const R2 = rng(11);
  const MW = Array.from({ length: 620 }, () => {
    const arm = Math.floor(R2() * 4), r = Math.pow(R2(), 0.75) * 0.48 + 0.03;
    const th = arm * Math.PI / 2 + r * 9 + (R2() - 0.5) * (0.9 - r);
    return { r, th, s: 0.5 + R2() * 1.3, c: R2() };
  });
  const R3 = rng(23);
  const WEB = Array.from({ length: 360 }, () => { const a = R3() * 6.28, r = Math.sqrt(R3()) * 0.47; return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: 0.5 + R3() * 1.4 }; });
  const ICON = {
    proton(x, y, s, t) {
      D.glow(x, y, s * 0.85, '#ff6b6b', 0.4);
      D.sphere(x, y, s * 0.34, '#ef4444');
      const cols = ['#fbbf24', '#34d399', '#60a5fa'];
      for (let i = 0; i < 3; i++) { const a = t * 0.9 + i * 2.094; D.sphere(x + Math.cos(a) * s * 0.12, y + Math.sin(a) * s * 0.12, s * 0.085, cols[i], { gloss: false }); }
    },
    hatom(x, y, s, t, mini) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.52);
      g.addColorStop(0, 'rgba(96,165,250,.55)'); g.addColorStop(0.6, 'rgba(96,165,250,.22)'); g.addColorStop(1, 'rgba(96,165,250,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 0.52, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(191,219,254,.95)';
      const n = mini ? 22 : 60;
      for (let i = 0; i < n; i++) { const q = HCLOUD[i], a = q.a + t * q.w, rr = q.r * s * (0.9 + 0.12 * Math.sin(t * 3 + q.ph)); ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, Math.max(0.9, s * 0.008), 0, 6.3); ctx.fill(); }
      D.sphere(x, y, Math.max(2.4, s * 0.012), '#ef4444', { gloss: false });
    },
    dna(x, y, s, t, mini) {
      const len = mini ? s * 1.1 : s * 3.4, n = mini ? 16 : 46, A = s * 0.42, lw = Math.max(1.6, s * 0.1);
      const xs = (i) => x - len / 2 + len * i / n;
      for (let i = 0; i <= n; i += 1) {
        const ph = i * (mini ? 0.9 : 0.55) + t * 0.7, y1 = y + Math.sin(ph) * A, y2 = y - Math.sin(ph) * A;
        if (i % 2 === 0) { ctx.strokeStyle = ['#34d399', '#fbbf24', '#f472b6', '#a78bfa'][(i / 2) % 4]; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.moveTo(xs(i), y1); ctx.lineTo(xs(i), y2); ctx.stroke(); }
      }
      [1, -1].forEach((sg, k) => {
        ctx.strokeStyle = k ? '#f59e0b' : '#3867f4'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
        for (let i = 0; i <= n * 3; i++) { const u = i / 3, ph = u * (mini ? 0.9 : 0.55) + t * 0.7; const px = xs(u), py = y + sg * Math.sin(ph) * A; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      });
    },
    virus(x, y, s, t) {
      const r = s * 0.3, n = 22;
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.283 + t * 0.15, x1 = x + Math.cos(a) * r, y1 = y + Math.sin(a) * r, x2 = x + Math.cos(a) * (r + s * 0.15), y2 = y + Math.sin(a) * (r + s * 0.15);
        ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = Math.max(1.2, s * 0.025); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        D.sphere(x2, y2, Math.max(1.5, s * 0.04), '#f43f5e', { gloss: false });
      }
      D.sphere(x, y, r, '#a78bfa');
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(1, s * 0.015); ctx.beginPath();
      for (let i = 0; i < 40; i++) { const a = i * 0.9 + t * 0.4, rr = r * (0.2 + 0.5 * ((i % 7) / 7)); const px = x + Math.cos(a) * rr, py = y + Math.sin(a * 1.3) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    },
    rbc(x, y, s, t, mini) {
      const cell = (cx, cy, d, rot) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
        const g = ctx.createRadialGradient(0, 0, d * 0.1, 0, 0, d * 0.5);
        g.addColorStop(0, '#9f1d1d'); g.addColorStop(0.45, '#d9363e'); g.addColorStop(0.85, '#ef5350'); g.addColorStop(1, '#b91c1c');
        D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, d * 0.5, d * 0.46, 0, 0, 6.3); ctx.fill(); }, { blur: d * 0.1, y: d * 0.04 });
        ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-d * 0.18, -d * 0.2, d * 0.14, d * 0.07, -0.6, 0, 6.3); ctx.fill();
        ctx.restore();
      };
      if (!mini) { cell(x - s * 0.95, y + s * 0.15, s * 0.9, 0.5 + Math.sin(t * 0.6) * 0.1); cell(x + s * 0.9, y - s * 0.2, s * 0.95, -0.4); }
      cell(x, y, s, Math.sin(t * 0.5) * 0.15);
    },
    hair(x, y, s, t, mini) {
      const th = mini ? s * 0.34 : s, L = mini ? s : VW * 2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.1);
      const g = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
      g.addColorStop(0, '#6b4a2f'); g.addColorStop(0.3, '#8a6240'); g.addColorStop(0.55, '#4a2f1b'); g.addColorStop(1, '#2f1c0f');
      ctx.fillStyle = g; rr(-L / 2, -th / 2, L, th, th * 0.45).fill();
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = Math.max(1, th * 0.05); ctx.beginPath(); ctx.moveTo(-L / 2, -th * 0.25); ctx.lineTo(L / 2, -th * 0.25); ctx.stroke();
      if (!mini) { ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, th * 0.03); for (let px = -L / 2; px < L / 2; px += th * 0.75) { ctx.beginPath(); ctx.moveTo(px, -th * 0.4); ctx.quadraticCurveTo(px + th * 0.2, 0, px, th * 0.4); ctx.stroke(); } }
      ctx.restore();
    },
    ant(x, y, s, t) {
      const c = '#5b3a29';
      ctx.strokeStyle = '#3b2418'; ctx.lineWidth = Math.max(1.4, s * 0.018); ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) for (const sg of [-1, 1]) {
        const bx = x + s * (0.12 - i * 0.07), sw = Math.sin(t * 9 + i * 2 + (sg > 0 ? 1.5 : 0)) * s * 0.03;
        ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + sw + s * (0.05 - i * 0.07), y + sg * s * 0.15); ctx.lineTo(bx + sw + s * (0.1 - i * 0.12), y + sg * s * 0.26); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x + s * 0.36, y - s * 0.02); ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.16, x + s * 0.47, y - s * 0.3); ctx.moveTo(x + s * 0.36, y + s * 0.02); ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.16, x + s * 0.47, y + s * 0.3); ctx.stroke();
      const ell = (cx, rx, ry) => { const g = ctx.createRadialGradient(cx - rx * 0.3, y - ry * 0.4, ry * 0.1, cx, y, rx); g.addColorStop(0, '#9a6b4e'); g.addColorStop(1, c); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, y, rx, ry, 0, 0, 6.3); ctx.fill(); };
      D.shadow(() => { ell(x - s * 0.27, s * 0.2, s * 0.14); ell(x + s * 0.08, s * 0.1, s * 0.08); ell(x + s * 0.36, s * 0.09, s * 0.08); }, { blur: s * 0.05, y: s * 0.03 });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s * 0.4, y - s * 0.03, s * 0.016, 0, 6.3); ctx.fill();
    },
    human(x, y, s, t) {
      const top = y - s / 2, b = Math.sin(t * 2) * s * 0.004;
      D.shadow(() => {
        ctx.fillStyle = '#94a3b8'; rr(x - s * 0.085, y + s * 0.02, s * 0.075, s * 0.48, s * 0.03).fill(); rr(x + s * 0.01, y + s * 0.02, s * 0.075, s * 0.48, s * 0.03).fill();
        ctx.fillStyle = '#3867f4'; rr(x - s * 0.13, top + s * 0.17 + b, s * 0.26, s * 0.33, s * 0.05).fill();
        ctx.fillStyle = '#3867f4'; rr(x - s * 0.2, top + s * 0.19 + b, s * 0.07, s * 0.3, s * 0.03).fill(); rr(x + s * 0.13, top + s * 0.19 + b, s * 0.07, s * 0.3, s * 0.03).fill();
      }, { blur: s * 0.04, y: s * 0.02 });
      D.sphere(x, top + s * 0.075 + b, s * 0.07, '#fcd9b6');
      ctx.fillStyle = '#3b2418'; ctx.beginPath(); ctx.arc(x, top + s * 0.062 + b, s * 0.07, Math.PI, 0); ctx.fill();
    },
    everest(x, y, s, t) {
      const b = y + s / 2, h = s;
      const sky = ctx.createLinearGradient(0, y - s, 0, b); sky.addColorStop(0, 'rgba(147,197,253,.0)'); sky.addColorStop(1, 'rgba(147,197,253,.0)');
      D.shadow(() => {
        ctx.fillStyle = '#7c8aa0'; ctx.beginPath(); ctx.moveTo(x - s * 1.0, b); ctx.lineTo(x - s * 0.55, b - h * 0.55); ctx.lineTo(x - s * 0.3, b - h * 0.4); ctx.lineTo(x - s * 0.02, b - h); ctx.lineTo(x + s * 0.28, b - h * 0.5); ctx.lineTo(x + s * 0.5, b - h * 0.62); ctx.lineTo(x + s * 1.0, b); ctx.closePath(); ctx.fill();
      }, { blur: s * 0.05, y: s * 0.02 });
      ctx.fillStyle = '#5b6b82'; ctx.beginPath(); ctx.moveTo(x - s * 0.02, b - h); ctx.lineTo(x + s * 0.28, b - h * 0.5); ctx.lineTo(x + s * 0.5, b - h * 0.62); ctx.lineTo(x + s * 1.0, b); ctx.lineTo(x + s * 0.12, b); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(x - s * 0.02, b - h); ctx.lineTo(x - s * 0.17, b - h * 0.78); ctx.lineTo(x - s * 0.08, b - h * 0.8); ctx.lineTo(x - s * 0.02, b - h * 0.7); ctx.lineTo(x + s * 0.07, b - h * 0.8); ctx.lineTo(x + s * 0.13, b - h * 0.76); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - s * 0.55, b - h * 0.55); ctx.lineTo(x - s * 0.64, b - h * 0.42); ctx.lineTo(x - s * 0.55, b - h * 0.45); ctx.lineTo(x - s * 0.47, b - h * 0.44); ctx.closePath(); ctx.fill();
    },
    earth(x, y, s, t) {
      D.glow(x, y, s * 0.72, '#7dd3fc', 0.35);
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, s / 2, 0, 6.3); ctx.clip();
      const g = ctx.createRadialGradient(x - s * 0.18, y - s * 0.2, s * 0.05, x, y, s / 2); g.addColorStop(0, '#60a5fa'); g.addColorStop(0.6, '#2563eb'); g.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = g; ctx.fillRect(x - s, y - s, s * 2, s * 2);
      ctx.fillStyle = '#4ade80';
      const off = ((t * 0.02) % 1) * s * 1.3;
      for (let k = -1; k <= 1; k++) {
        const ox = x + k * s * 1.3 + off - s * 0.2;
        ctx.beginPath(); ctx.ellipse(ox - s * 0.18, y - s * 0.12, s * 0.17, s * 0.1, 0.5, 0, 6.3); ctx.ellipse(ox + s * 0.1, y + s * 0.12, s * 0.12, s * 0.18, -0.3, 0, 6.3); ctx.ellipse(ox + s * 0.25, y - s * 0.22, s * 0.09, s * 0.06, 0, 0, 6.3); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.46, s * 0.2, s * 0.06, 0, 0, 6.3); ctx.fill();
      const sh = ctx.createRadialGradient(x - s * 0.25, y - s * 0.25, s * 0.2, x + s * 0.1, y + s * 0.1, s * 0.62); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,10,40,.55)');
      ctx.fillStyle = sh; ctx.fillRect(x - s, y - s, s * 2, s * 2);
      ctx.restore();
    },
    sun(x, y, s, t) {
      D.glow(x, y, s * 1.0, '#ffb300', 0.5);
      D.sphere(x, y, s / 2, '#ffb300', { light: '#fff3b0', dark: '#e65100' });
      ctx.fillStyle = 'rgba(190,80,0,.28)';
      for (let i = 0; i < 12; i++) { const a = i * 2.4 + t * 0.05, r = s * (0.08 + (i % 4) * 0.08); ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, s * 0.025, 0, 6.3); ctx.fill(); }
    },
    esdist(x, y, s, t, mini) {
      const xs = x - s / 2, xe = x + s / 2;
      D.glow(xs, y, mini ? s * 0.25 : 40, '#ffb300', 0.6); D.sphere(xs, y, mini ? 5 : 9, '#ffb300', { light: '#fff3b0' });
      D.dashedLine(xs + 10, y, xe - 6, y, { color: '#cbd5e1', width: mini ? 1.5 : 2, offset: t * 12 });
      D.sphere(xe, y, mini ? 3 : 4.5, '#3b82f6', { gloss: false });
      if (!mini) { const k = (t * 0.5) % 1; ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(xs + 12 + (xe - xs - 18) * k, y, 3, 0, 6.3); ctx.fill(); }
    },
    proxima(x, y, s, t, mini) {
      const xs = x - s / 2, xe = x + s / 2;
      D.glow(xs, y, 34, '#ffb300', 0.6); D.sphere(xs, y, mini ? 4 : 8, '#ffb300', { light: '#fff3b0' });
      D.dashedLine(xs + 10, y, xe - 8, y, { color: '#94a3b8', width: 2, offset: t * 12 });
      D.glow(xe, y, 28, '#f87171', 0.6); D.sphere(xe, y, mini ? 3 : 6, '#ef4444', { gloss: false });
    },
    milkyway(x, y, s, t) {
      D.glow(x, y, s * 0.55, '#fde68a', 0.4);
      const rot = t * 0.04;
      for (let i = 0; i < MW.length; i++) {
        const q = MW[i], th = q.th + rot, px = x + Math.cos(th) * q.r * s, py = y + Math.sin(th) * q.r * s * 0.82;
        ctx.fillStyle = q.c < 0.25 ? 'rgba(253,230,138,.95)' : q.c < 0.7 ? 'rgba(191,219,254,.9)' : 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.8, q.s * s * 0.0055), 0, 6.3); ctx.fill();
      }
      D.glow(x, y, s * 0.16, '#fff1b0', 0.9);
      const th = 1.0 + rot, sx = x + Math.cos(th) * s * 0.3, sy = y + Math.sin(th) * s * 0.3 * 0.82;
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, Math.max(4, s * 0.025), 0, 6.3); ctx.stroke();
    },
    universe(x, y, s, t) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, s / 2, 0, 6.3); ctx.clip();
      const g = ctx.createRadialGradient(x, y, 0, x, y, s / 2); g.addColorStop(0, '#312e81'); g.addColorStop(1, '#0f0b2e');
      ctx.fillStyle = g; ctx.fillRect(x - s, y - s, s * 2, s * 2);
      for (let i = 0; i < WEB.length; i++) { const q = WEB[i]; ctx.fillStyle = i % 5 ? 'rgba(199,210,254,.85)' : 'rgba(253,230,138,.9)'; ctx.beginPath(); ctx.arc(x + q.x * s * 1.04, y + q.y * s * 1.04, q.s * Math.max(0.8, s * 0.003), 0, 6.3); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(165,180,252,.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(x, y, s / 2, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
      D.sphere(x, y, Math.max(3, s * 0.012), '#fbbf24', { gloss: false });
      if (s > 90) D.text(x, y - s * 0.03 - 8, '우리', { size: 14, color: '#fde68a', weight: 800 });
    },
  };
  function drawIcon(id, x, y, s, t, mini) { ICON[id](x, y, s, t, mini); }

  /* ======================================================
     화면 1: 줌 여행
     ====================================================== */
  const DUST = (() => { const r = rng(5); return Array.from({ length: 2600 }, () => ({ a: r() * 6.283, p: Math.pow(10, -17 + r() * 46), c: r() })); })();
  const SCN = { cx: VW / 2, cy: (VH - 112) / 2 + 8, h: VH - 112 };
  function drawZoom(t) {
    const e = S.e;
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, SCN.h + 4); ctx.clip();
    const bg = ctx.createRadialGradient(SCN.cx, SCN.cy, 20, SCN.cx, SCN.cy, VW * 0.8); bg.addColorStop(0, '#1b2a55'); bg.addColorStop(1, '#050816');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, SCN.h + 4);
    // 먼지(줌 느낌)
    const k = Math.pow(10, -e) * REF * 0.5;
    ctx.fillStyle = '#9db7ff';
    for (let i = 0; i < DUST.length; i++) {
      const q = DUST[i], r = q.p * k;
      if (r < 14 || r > 520) continue;
      const al = smooth(r, 14, 60) * (1 - smooth(r, 330, 520)) * 0.75;
      ctx.globalAlpha = al; const px = SCN.cx + Math.cos(q.a) * r * 1.5, py = SCN.cy + Math.sin(q.a) * r;
      if (px < -4 || px > VW + 4 || py < -4 || py > SCN.h + 4) continue;
      ctx.beginPath(); ctx.arc(px, py, 0.9 + q.c * 1.6 + r * 0.004, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 물체
    OBJ.forEach((o) => {
      const s = REF * Math.pow(10, o.le - e);
      if (!(s > 7 && s < 620)) return;
      const a = smooth(s, 9, 60) * (1 - smooth(s, 300, 600));
      if (a < 0.01) return;
      ctx.globalAlpha = a; drawIcon(o.id, SCN.cx, SCN.cy, s, t, false);
      ctx.globalAlpha = 1;
      if (a > 0.5) S.seen.add(o.id);
    });
    // 수소 원자 안쪽(핵) 설명
    const hs = REF * Math.pow(10, OB.hatom.le - e);
    if (hs > 70 && hs < 520) {
      const a = smooth(hs, 70, 130) * (1 - smooth(hs, 330, 520));
      ctx.globalAlpha = a; D.arrow(SCN.cx + hs * 0.3, SCN.cy - hs * 0.26, SCN.cx + 6, SCN.cy - 5, { color: '#fecaca', width: 2, head: 10 });
      D.label(SCN.cx + hs * 0.3 + 4, SCN.cy - hs * 0.26 - 4, '원자핵 (원자의 약 10만분의 1)', { bg: 'rgba(15,23,42,.8)', color: '#fecaca', size: 13, align: 'left' });
      ctx.globalAlpha = 1;
    }
    // 빈 공간 안내
    const near = nearest(e);
    const dist = Math.abs(near.le - e);
    if (dist > 1.5) {
      const nx = OBJ.filter((o) => o.le > e)[0], pv = OBJ.filter((o) => o.le < e).pop();
      D.text(SCN.cx, SCN.cy - 8, '아직 이름 붙은 물체가 없는 규모예요', { size: 17, color: 'rgba(226,232,240,.9)', weight: 700 });
      if (e < -10.5 && e > -14.5) D.text(SCN.cx, SCN.cy + 20, '원자 속은 대부분 텅 빈 공간이에요', { size: 15, color: 'rgba(147,197,253,.95)', weight: 700 });
      else D.text(SCN.cx, SCN.cy + 20, (e - near.le > 0 ? '← 작게 ' : '크게 → ') + '줌 해 보세요', { size: 15, color: 'rgba(147,197,253,.95)', weight: 700 });
    }
    ctx.restore();
    zoomHUD(t, near);
  }
  function nearest(e) { let b = OBJ[0], bd = 1e9; OBJ.forEach((o) => { const d = Math.abs(o.le - e); if (d < bd) { bd = d; b = o; } }); return b; }
  function odometer(x, y, val) {
    ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y - 24, 66, 44); ctx.clip();
    const lh = 34, base = Math.floor(val);
    for (let k = base - 1; k <= base + 2; k++) {
      const yy = y - (k - val) * lh, a = 1 - Math.min(1, Math.abs(k - val) * 0.95);
      if (a <= 0.02) continue;
      D.text(x, yy + 9, (k < 0 ? MINUS : '') + Math.abs(k), { size: 28, color: '#fde68a', weight: 800, align: 'left', alpha: a });
    }
    ctx.restore();
  }
  function zoomHUD(t, near) {
    // 왼쪽 위: 10^지수 m
    D.shadow(() => { ctx.fillStyle = 'rgba(15,23,42,.72)'; rr(12, 12, 176, 66, 16).fill(); }, { blur: 10, y: 3, color: 'rgba(0,0,0,.35)' });
    D.text(24, 62, '10', { size: 44, color: '#fff', weight: 800, align: 'left' });
    odometer(78, 34, S.e);
    D.text(146, 62, 'm', { size: 28, color: '#cbd5e1', weight: 800, align: 'left' });
    // 오른쪽 위: 지금 보이는 것
    const iw = PHONE ? 330 : 288, ix = VW - iw - 12, d = Math.abs(near.le - S.e), shown = d <= 1.4;
    S.infoA = SciSim.approach(S.infoA, shown ? 1 : 0.35, 0.016, 10);
    ctx.save(); ctx.globalAlpha = 0.55 + 0.45 * S.infoA;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(ix, 12, iw, 94, 16).fill(); }, { blur: 10, y: 3, color: 'rgba(0,0,0,.35)' });
    D.text(ix + 14, 40, near.name, { size: 21, color: '#1b2333', weight: 800, align: 'left' });
    D.text(ix + 14, 63, near.txt, { size: 15, color: '#3867f4', weight: 800, align: 'left' });
    D.text(ix + 14, 87, shown ? near.note : '가장 가까운 장면: ' + near.short, { size: 13, color: '#5d6879', weight: 700, align: 'left' });
    ctx.restore();
    // 눈금 막대
    const by = VH - 82, bx = 22;
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + REF, by); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by - 8); ctx.lineTo(bx, by + 8); ctx.moveTo(bx + REF, by - 8); ctx.lineTo(bx + REF, by + 8); ctx.stroke();
    ctx.lineWidth = 1.5; for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(bx + REF * i / 10, by); ctx.lineTo(bx + REF * i / 10, by - (i === 5 ? 8 : 5)); ctx.stroke(); }
    D.label(bx + REF + 14, by - 1, '= ' + p10Real(S.e) + ' m  ≈ ' + eq(S.e), { bg: '#1b2333', size: 14, align: 'left' });
    // 미니맵
    const mx0 = 40, mx1 = VW - 40, my = VH - 32, mp = (v) => mx0 + (v - E_MIN) / (E_MAX - E_MIN) * (mx1 - mx0);
    ctx.fillStyle = 'rgba(100,116,139,.18)'; rr(mp(-4), my - 8, mp(4) - mp(-4), 16, 8).fill();
    D.text((mp(-4) + mp(4)) / 2, my + 4.5, '맨눈·몸의 범위', { size: 13, color: '#475569', weight: 800 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx0, my); ctx.lineTo(mx1, my); ctx.stroke();
    for (let v = -15; v <= 25; v += 5) { ctx.beginPath(); ctx.moveTo(mp(v), my - 4); ctx.lineTo(mp(v), my + 4); ctx.stroke(); D.text(mp(v), my + 22, sgn(v), { size: 13, color: '#5d6879', weight: 700 }); }
    OBJ.forEach((o) => { const seen = S.seen.has(o.id); D.sphere(mp(o.le), my, 5.5, seen ? '#3867f4' : '#cbd5e1', { gloss: false, outline: '#fff', outlineWidth: 1.5 }); });
    const cx = mp(clamp(S.e, E_MIN, E_MAX));
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.moveTo(cx, my - 6); ctx.lineTo(cx - 8, my - 20); ctx.lineTo(cx + 8, my - 20); ctx.closePath(); ctx.fill();
    D.text(VW - 12, my + 22, '지수', { size: 13, color: '#5d6879', weight: 800, align: 'right' });
    S.mapGeom = { mx0, mx1, my };
  }
  function p10Real(e) { const r = Math.round(e * 10) / 10; return Math.abs(r - Math.round(r)) < 0.05 ? p10(Math.round(r) || 0) : '10' + sup((r < 0 ? '-' : '') + Math.abs(r).toFixed(1)); }

  /* ======================================================
     끌어 놓기 공통
     ====================================================== */
  function pickItem(p, list) {
    for (let i = list.length - 1; i >= 0; i--) { const c = list[i]; if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; }
    return null;
  }
  function cardBox(c, o) {
    o = o || {};
    const lift = c.lift || 0, sc = 1 + lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * Math.min(1, c.shake * 3) : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 7, color: 'rgba(30,45,80,' + (0.16 + lift * 0.12) + ')' });
    ctx.strokeStyle = o.stroke || '#cbd5e1'; ctx.lineWidth = o.sw || 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).stroke();
    return () => ctx.restore();
  }
  function dragStart(c, p, list) {
    S.drag = { c, ox: p.x - c.x, oy: p.y - c.y };
    const i = list.indexOf(c); if (i >= 0) { list.splice(i, 1); list.push(c); }
    SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click();
    c.tw && c.tw.cancel && c.tw.cancel(); c.free = true;
  }
  function flyTo(c, x, y, after) {
    c.free = false; c.tx = x; c.ty = y;
    SciSim.tween(c, { lift: 0 }, { duration: 0.25 });
    if (after) after();
  }
  function stepItems(list, dt) {
    list.forEach((c) => {
      if (c.free) return;
      if (RM) { c.x = c.tx; c.y = c.ty; } else { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); }
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
    });
  }

  /* ======================================================
     화면 2: 규모 비교 (지수 눈금자)
     ====================================================== */
  const EA = -16, EB = 28;
  const RL = PHONE ? { x0: 24, x1: VW - 24, y: 392, trayY: 506, cw: 116, ch: 46 } : { x0: 32, x1: VW - 32, y: 340, trayY: 428, cw: 112, ch: 42 };
  const exX = (k) => RL.x0 + (k - EA) / (EB - EA) * (RL.x1 - RL.x0);
  const xToK = (x) => Math.round(EA + (x - RL.x0) / (RL.x1 - RL.x0) * (EB - EA));
  const TRAY_IDS = ['sun', 'dna', 'ant', 'milkyway', 'hatom', 'everest', 'rbc', 'esdist', 'proton', 'hair', 'earth', 'virus'];
  const CARD_W = PHONE ? 180 : 122, CARD_H = PHONE ? 52 : 54;
  function cardHome(i) {
    if (PHONE) return { x: 14 + CARD_W / 2 + (i % 3) * (CARD_W + 6) + 0, y: RL.trayY + 30 + Math.floor(i / 3) * (CARD_H + 8) };
    return { x: 10 + 65 + (i % 6) * 130, y: RL.trayY + 34 + Math.floor(i / 6) * (CARD_H + 8) };
  }
  function initCards() {
    S.cards = TRAY_IDS.map((id, i) => {
      const o = OB[id], h = cardHome(i);
      return { id, o, kind: 'card', name: o.name, short: o.short, ans: o.ans, k: null, x: h.x, y: h.y, tx: h.x, ty: h.y, hx: h.x, hy: h.y, w: CARD_W, h: CARD_H, lift: 0, shake: 0, bad: -1, ver: 0, free: false, lane: 0 };
    });
    S.revealCards = 0; S.lastCard = null;
  }
  function layoutChips() {
    const placed = S.cards.filter((c) => c.k != null && !(S.drag && S.drag.c === c)).sort((a, b) => a.k - b.k || a.ver - b.ver);
    const lanes = [], CW = RL.cw, CH = RL.ch;
    placed.forEach((c) => {
      const cx = clamp(exX(c.k), CW / 2 + 4, VW - CW / 2 - 4), l0 = cx - CW / 2 - 4, r0 = cx + CW / 2 + 4;
      let l = 0; for (; ; l++) { if (!lanes[l]) lanes[l] = []; if (lanes[l].every((r) => r0 <= r[0] || l0 >= r[1])) break; }
      lanes[l].push([l0, r0]);
      c.w = CW; c.h = CH; c.lane = l;
    });
    // 카드가 한곳에 많이 쌓여도 화면 밖으로 나가지 않게 줄 간격을 줄여요
    const step = Math.min(CH + 6, (RL.y - 26 - CH / 2 - 78) / Math.max(1, lanes.length - 1));
    placed.forEach((c) => { c.tx = clamp(exX(c.k), CW / 2 + 4, VW - CW / 2 - 4); c.ty = RL.y - 26 - CH / 2 - c.lane * step; });
  }
  function cardDrop(c, p) {
    S.drag = null;
    if (p.y < RL.trayY - 8) {
      c.k = clamp(xToK(p.x), -15, 27); c.ver = ++S.placeVer; c.bad = -1; c.w = RL.cw; c.h = RL.ch; S.lastCard = c;
      Sound.tick(); layoutChips(); flyTo(c, c.tx, c.ty);
      parts.burst(exX(c.k), RL.y, { count: 8, colors: ['#64748b', '#94a3b8', '#3867f4'], speed: 70, life: 0.5, size: 2.5, gravity: 120 });
    } else {
      c.k = null; c.w = CARD_W; c.h = CARD_H; flyTo(c, c.hx, c.hy); layoutChips();
    }
  }
  const multTxt = (k) => (k > 0 ? '사람의 ' + p10(k) + '배' : k === 0 ? '사람과 비슷해요' : '사람의 1/' + p10(-k));
  function drawCards(t) {
    ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 30, '카드를 지수 눈금자의 알맞은 곳에 놓아요', { size: PHONE ? 17 : 19, color: '#1b2333', weight: 800 });
    D.text(VW / 2, 52, '눈금 한 칸 = 10배 · 사람 키(약 1.7 m)는 지수 0 근처', { size: 14, color: '#5d6879', weight: 700 });
    // 맨눈 범위
    ctx.fillStyle = 'rgba(100,116,139,.12)'; rr(exX(-4), RL.y - 10, exX(4) - exX(-4), 20, 8).fill();
    // 눈금자
    ctx.fillStyle = '#fff'; D.shadow(() => rr(RL.x0 - 14, RL.y - 8, RL.x1 - RL.x0 + 28, 16, 8).fill(), { blur: 6, y: 2 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
    for (let k = -15; k <= 27; k++) { const x = exX(k), big = k % 5 === 0; ctx.beginPath(); ctx.moveTo(x, RL.y - (big ? 8 : 4)); ctx.lineTo(x, RL.y + (big ? 8 : 4)); ctx.stroke(); }
    for (let k = -15; k <= 25; k += 5) D.text(exX(k), RL.y + 28, p10(k), { size: 13, color: '#3a4456', weight: 800 });
    // 사람 기준점
    const hx = exX(Math.log10(1.7));
    ctx.fillStyle = '#3867f4'; ctx.beginPath(); ctx.moveTo(hx, RL.y + 11); ctx.lineTo(hx - 6, RL.y + 21); ctx.lineTo(hx + 6, RL.y + 21); ctx.closePath(); ctx.fill();
    D.label(hx, RL.y + 46, '사람 키 1.7 m', { bg: '#3867f4', size: 13 });
    D.text(exX(EA) + 4, RL.y - 16, '← 작아요', { size: 13, color: '#64748b', weight: 800, align: 'left' });
    D.text(exX(EB) - 4, RL.y - 16, '커요 →', { size: 13, color: '#64748b', weight: 800, align: 'right' });
    // 드래그 중 가이드
    if (S.drag && S.drag.c.kind === 'card' && S.drag.c.y < RL.trayY - 8) {
      const k = clamp(xToK(S.drag.c.x), -15, 27), x = exX(k);
      ctx.strokeStyle = 'rgba(56,103,244,.5)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x, RL.y); ctx.stroke(); ctx.setLineDash([]);
      D.label(x, RL.y + 46 + 28, p10(k) + ' m → ' + multTxt(k), { bg: '#1b2333', size: 14 });
    }
    // 정답 위치 (성공 후)
    if (S.revealCards > 0.01) {
      ctx.globalAlpha = S.revealCards;
      S.cards.forEach((c) => { const x = exX(Math.log10(c.o.m)); ctx.fillStyle = '#14a058'; ctx.beginPath(); ctx.moveTo(x, RL.y); ctx.lineTo(x - 5, RL.y + 8); ctx.lineTo(x + 5, RL.y + 8); ctx.closePath(); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
    // 놓인 카드의 줄기
    S.cards.forEach((c) => { if (c.k == null) return; const x = exX(c.k); ctx.strokeStyle = c.bad === c.ver ? '#e2464b' : '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, RL.y); ctx.lineTo(x, c.y + c.h / 2); ctx.stroke(); });
    // 트레이 배경
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(6, RL.trayY - 4, VW - 12, VH - RL.trayY - 2, 14).fill();
    S.cards.forEach((c) => drawCard(c, t));
    // 마지막 놓은 카드 설명
    if (S.lastCard && S.lastCard.k != null && !(S.drag)) { /* 읽음 칸에서 보여 줌 */ }
  }
  function drawCard(c, t) {
    const end = cardBox(c, { stroke: c.bad === c.ver && c.k != null ? '#e2464b' : S.revealCards > 0.5 ? '#14a058' : '#cbd5e1' });
    if (c.k != null) {
      D.text(0, -5, c.short, { size: 14, color: '#1b2333', weight: 800 });
      D.text(0, 13, c.k === 0 ? '10⁰ 근처' : multTxt(c.k).replace('사람의 ', '×'), { size: 13, color: '#3867f4', weight: 800 });
    } else {
      ctx.save(); ctx.beginPath(); ctx.rect(-c.w / 2 + 6, -c.h / 2 + 6, 40, c.h - 12); ctx.clip();
      drawIcon(c.id, -c.w / 2 + 26, 0, 30, S.clock, true); ctx.restore();
      const lines = c.name.length > 7 ? splitName(c.name) : [c.name];
      lines.forEach((ln, i) => D.text(-c.w / 2 + 50, (lines.length === 1 ? 5 : i * 16 - 3), ln, { size: 14, color: '#1b2333', weight: 800, align: 'left' }));
    }
    end();
  }
  function splitName(n) { const sp = n.indexOf(' '); if (sp > 0) return [n.slice(0, sp), n.slice(sp + 1)]; const m = Math.ceil(n.length / 2); return [n.slice(0, m), n.slice(m)]; }

  /* ======================================================
     화면 3: 미시·거시 비교표
     ====================================================== */
  const TB = PHONE
    ? { px: 8, py: 8, pw: 284, ph: 206, ty: 228, th: 34, rh: 54, lx: 8, lw: 112, c0: 126, cw: 232, c1: 362, trayY: 500, chW: 280, chH: 50 }
    : { px: 8, py: 8, pw: 384, ph: 160, ty: 178, th: 32, rh: 46, lx: 12, lw: 150, c0: 168, cw: 296, c1: 470, trayY: 410, chW: 188, chH: 44 };
  const ROWS = [
    { name: '🔍 관찰 도구', micro: '전자 현미경', macro: '망원경' },
    { name: PHONE ? '📐 길이 단위' : '📐 쓰는 길이 단위', micro: 'nm (나노미터)', macro: '천문단위·광년' },
    { name: PHONE ? '⚡ 작용하는 힘' : '⚡ 주로 작용하는 힘', micro: '전기력', macro: '중력' },
    { name: '👁 눈으로 보임', micro: '직접 볼 수 없음', macro: '일부는 직접 볼 수 있음' },
  ];
  function initTable() {
    S.cells = [];
    ROWS.forEach((r, i) => [0, 1].forEach((col) => {
      S.cells.push({ row: i, col, w: PHONE ? 232 : 296, h: TB.rh - 8, x: PHONE ? (col ? 362 : 126) : (col ? 470 : 168), y: TB.ty + TB.th + i * TB.rh + TB.rh / 2, chip: null });
    }));
    const items = [];
    ROWS.forEach((r, i) => { items.push({ text: r.micro, row: i, col: 0 }); items.push({ text: r.macro, row: i, col: 1 }); });
    const order = [3, 6, 0, 5, 2, 7, 4, 1];
    S.chips = order.map((idx, n) => {
      const it = items[idx], hx = chipHome(n);
      return { kind: 'chip', text: it.text, row: it.row, col: it.col, x: hx.x, y: hx.y, tx: hx.x, ty: hx.y, hx: hx.x, hy: hx.y, w: TB.chW, h: TB.chH, lift: 0, shake: 0, free: false, cell: null, bad: false };
    });
    S.tableOK = 0;
  }
  function chipHome(n) {
    if (PHONE) return { x: 10 + TB.chW / 2 + (n % 2) * (TB.chW + 10) + 0, y: TB.trayY + 32 + Math.floor(n / 2) * (TB.chH + 8) };
    return { x: 10 + TB.chW / 2 + (n % 4) * (TB.chW + 8), y: TB.trayY + 34 + Math.floor(n / 4) * (TB.chH + 8) };
  }
  function cellAt(p) { return S.cells.find((c) => Math.abs(p.x - c.x - c.w / 2) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2 + 4); }
  function chipDrop(ch, p) {
    S.drag = null;
    const cell = cellAt({ x: p.x, y: p.y });
    if (cell) {
      const other = cell.chip && cell.chip !== ch ? cell.chip : null;
      if (ch.cell) ch.cell.chip = null;
      if (other) { other.cell = null; if (ch.cell) { other.cell = ch.cell; ch.cell.chip = other; flyTo(other, ch.cell.x + ch.cell.w / 2, ch.cell.y); } else flyTo(other, other.hx, other.hy); other.bad = false; other.w = other.cell ? other.cell.w - 8 : TB.chW; }
      cell.chip = ch; ch.cell = cell; ch.w = cell.w - 8; ch.h = cell.h - 6; ch.bad = false;
      Sound.tick(); flyTo(ch, cell.x + cell.w / 2, cell.y);
    } else {
      if (ch.cell) ch.cell.chip = null; ch.cell = null; ch.w = TB.chW; ch.h = TB.chH; ch.bad = false; flyTo(ch, ch.hx, ch.hy);
    }
  }
  const tableDone = () => S.cells.every((c) => c.chip && c.chip.row === c.row && c.chip.col === c.col);
  function drawTable(t) {
    ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH);
    // 위쪽 그림 두 장
    const pw = TB.pw, mx = TB.px, gx = VW - TB.px - pw;
    [[mx, 0], [gx, 1]].forEach(([x, k]) => {
      ctx.save();
      D.shadow(() => { ctx.fillStyle = k ? '#0b1030' : '#0f1c3f'; rr(x, TB.py, pw, TB.ph, 16).fill(); }, { blur: 8, y: 3 });
      rr(x, TB.py, pw, TB.ph, 16).clip();
      if (k === 0) microScene(x, TB.py, pw, TB.ph, t); else macroScene(x, TB.py, pw, TB.ph, t);
      ctx.restore();
    });
    // 표
    const colx = [TB.c0, TB.c1];
    ctx.fillStyle = '#1b2333'; rr(TB.lx, TB.ty, VW - TB.lx * 2, TB.th, 10).fill();
    D.text(TB.lx + TB.lw / 2 + 4, TB.ty + TB.th / 2 + 5, '구분', { size: 14, color: '#fff', weight: 800 });
    D.text(colx[0] + (PHONE ? 116 : 148), TB.ty + TB.th / 2 + 5, '미시세계 (원자·분자)', { size: PHONE ? 13 : 15, color: '#93c5fd', weight: 800 });
    D.text(colx[1] + (PHONE ? 116 : 148), TB.ty + TB.th / 2 + 5, '거시세계 (행성·은하)', { size: PHONE ? 13 : 15, color: '#fcd34d', weight: 800 });
    ROWS.forEach((r, i) => {
      const y = TB.ty + TB.th + i * TB.rh;
      ctx.fillStyle = i % 2 ? '#fff' : '#f8fafc'; ctx.fillRect(TB.lx, y, VW - TB.lx * 2, TB.rh);
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.strokeRect(TB.lx, y, VW - TB.lx * 2, TB.rh);
      D.text(TB.lx + 8, y + TB.rh / 2 + 5, r.name, { size: PHONE ? 12 : 14, color: '#1b2333', weight: 800, align: 'left' });
    });
    S.cells.forEach((c) => {
      const empty = !c.chip;
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = empty ? '#94a3b8' : 'rgba(0,0,0,0)'; ctx.lineWidth = 2; ctx.fillStyle = empty ? 'rgba(148,163,184,.1)' : 'rgba(0,0,0,0)';
      rr(c.x, c.y - c.h / 2, c.w, c.h, 10).fill(); rr(c.x, c.y - c.h / 2, c.w, c.h, 10).stroke(); ctx.restore();
      if (empty) D.text(c.x + c.w / 2, c.y + 5, '여기에 놓기', { size: 13, color: '#94a3b8', weight: 700 });
    });
    if (S.drag && S.drag.c.kind === 'chip') { const cell = cellAt(S.drag.c); if (cell) { ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 3; rr(cell.x, cell.y - cell.h / 2, cell.w, cell.h, 10).stroke(); } }
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(6, TB.trayY - 4, VW - 12, VH - TB.trayY - 2, 14).fill();
    S.chips.forEach((c) => {
      const end = cardBox(c, { stroke: c.bad ? '#e2464b' : S.tableOK > 0.5 ? '#14a058' : c.cell ? (c.col ? '#f59e0b' : '#3b82f6') : '#cbd5e1', fill: c.cell ? (c.col ? '#fffbeb' : '#eff6ff') : '#fff', sw: c.cell ? 2.5 : 2 });
      D.text(0, 5, c.text, { size: 15, color: '#1b2333', weight: 800 });
      end();
    });
  }
  function microScene(x, y, w, h, t) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#12224d'); g.addColorStop(1, '#0a1230'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const cols = PHONE ? 7 : 8, rows = PHONE ? 4 : 4, gx = w / (cols + 0.5), gy = (h - 40) / (rows + 0.3);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const px = x + gx * (c + 0.8) + (r % 2) * gx * 0.0, py = y + 38 + gy * (r + 0.6);
      const jx = Math.sin(t * 3 + c * 1.7 + r) * 1.8, jy = Math.cos(t * 2.6 + r * 1.3 + c) * 1.8;
      D.glow(px + jx, py + jy, gx * 0.5, (r + c) % 2 ? '#60a5fa' : '#f87171', 0.28);
      D.sphere(px + jx, py + jy, gx * 0.23, (r + c) % 2 ? '#60a5fa' : '#f87171');
    }
    D.text(x + 14, y + 26, '원자·분자의 세계', { size: 16, color: '#bfdbfe', weight: 800, align: 'left' });
    D.text(x + w - 12, y + 26, '≈ ' + p10(-10) + ' m', { size: 14, color: '#93c5fd', weight: 800, align: 'right' });
  }
  function macroScene(x, y, w, h, t) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#0b1030'); g.addColorStop(1, '#14103a'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const r = rng(3); for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * r()) + ')'; ctx.beginPath(); ctx.arc(x + r() * w, y + 36 + r() * (h - 36), 0.6 + r() * 1.1, 0, 6.3); ctx.fill(); }
    const cx = x + w * 0.38, cy = y + h * 0.58;
    D.glow(cx, cy, 70, '#ffb300', 0.5); D.sphere(cx, cy, 18, '#ffb300', { light: '#fff3b0' });
    [[44, 4, '#60a5fa', 0.9], [78, 5.5, '#4ade80', 0.6], [110, 7, '#f87171', 0.4], [150, 9, '#fbbf24', 0.25]].forEach(([rx, pr, col, sp], i) => {
      ctx.strokeStyle = 'rgba(148,163,184,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, rx, rx * 0.5, -0.2, 0, 6.3); ctx.stroke();
      const a = t * sp + i * 1.7; const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * rx * 0.5;
      const rot = -0.2, qx = cx + (px - cx) * Math.cos(rot) - (py - cy) * Math.sin(rot), qy = cy + (px - cx) * Math.sin(rot) + (py - cy) * Math.cos(rot);
      D.sphere(qx, qy, pr, col);
    });
    D.text(x + 14, y + 26, '행성·은하의 세계', { size: 16, color: '#fde68a', weight: 800, align: 'left' });
    D.text(x + w - 12, y + 26, '≈ ' + p10(7) + ' ~ ' + p10(21) + ' m', { size: 14, color: '#fcd34d', weight: 800, align: 'right' });
    ICON.milkyway(x + w * 0.85, y + h * 0.66, 70, t);
  }

  /* ======================================================
     화면 4: 측정 도구
     ====================================================== */
  const TOOLS = [
    { id: 'em', name: '전자 현미경', ico: '⚛️', lo: -10, hi: -7, col: '#7c3aed' },
    { id: 'om', name: '광학 현미경', ico: '🔬', lo: -7, hi: -3, col: '#2563eb' },
    { id: 'ruler', name: '자·줄자', ico: '📏', lo: -3, hi: 1, col: '#0d9488' },
    { id: 'radar', name: '레이더', ico: '📡', lo: 1, hi: 5, col: '#ea580c' },
    { id: 'laser', name: '레이저', ico: '🔦', lo: 6, hi: 9.5, col: '#dc2626' },
    { id: 'para', name: '연주시차', ico: '⭐', lo: 15, hi: 19, col: '#ca8a04' },
  ];
  const TARGETS = [
    { tool: 'em', text: '원자의 크기', val: '10⁻¹⁰ m', k: -10 },
    { tool: 'om', text: PHONE ? '적혈구 크기' : '적혈구의 크기', val: '7×10⁻⁶ m', k: -5.15 },
    { tool: 'ruler', text: '책상의 길이', val: '약 1 m', k: 0 },
    { tool: 'radar', text: PHONE ? '비행기까지' : '하늘 위 비행기까지', val: '약 10⁴ m', k: 4 },
    { tool: 'laser', text: PHONE ? '달까지 거리' : '달까지의 거리', val: '3.8×10⁸ m', k: 8.58 },
    { tool: 'para', text: '가까운 별까지', val: '4×10¹⁶ m', k: 16.6 },
  ];
  const TL = PHONE ? { a: -11.5, b: 20, x0: 26, x1: VW - 26, y: 360, trayY: 560, sw: 140, sh: 62 } : { a: -11.5, b: 20, x0: 36, x1: VW - 36, y: 290, trayY: 440, sw: 140, sh: 60 };
  const tkX = (k) => TL.x0 + (k - TL.a) / (TL.b - TL.a) * (TL.x1 - TL.x0);
  const TC_W = PHONE ? 180 : 122, TC_H = PHONE ? 52 : 56;
  function tcHome(i) {
    if (PHONE) return { x: 14 + TC_W / 2 + (i % 3) * (TC_W + 6), y: TL.trayY + 34 + Math.floor(i / 3) * (TC_H + 10) };
    return { x: 10 + 65 + i * 130, y: TL.trayY + 40 };
  }
  function initTools() {
    S.slots = TARGETS.map((tg, i) => {
      const x = clamp(tkX(tg.k), TL.sw / 2 + 6, VW - TL.sw / 2 - 6), lane = i % 2;
      return Object.assign({}, tg, { i, x, y: TL.y - 34 - TL.sh / 2 - lane * (TL.sh + 12), w: TL.sw, h: TL.sh, card: null, lane });
    });
    const order = [3, 0, 5, 2, 4, 1];
    S.tcards = order.map((ti, n) => {
      const tl = TOOLS[ti], h = tcHome(n);
      return { kind: 'tool', tool: tl, id: tl.id, name: tl.name, ico: tl.ico, x: h.x, y: h.y, tx: h.x, ty: h.y, hx: h.x, hy: h.y, w: TC_W, h: TC_H, lift: 0, shake: 0, free: false, slot: null, bad: false };
    });
    S.reveal = 0; S.toolsOK = false;
  }
  function slotAt(p) { return S.slots.find((s) => Math.abs(p.x - s.x) <= s.w / 2 + 4 && Math.abs(p.y - s.y) <= s.h / 2 + 4); }
  function toolDrop(c, p) {
    S.drag = null;
    const sl = slotAt(p);
    if (sl) {
      const other = sl.card && sl.card !== c ? sl.card : null;
      if (c.slot) c.slot.card = null;
      if (other) { other.slot = null; if (c.slot) { other.slot = c.slot; c.slot.card = other; flyTo(other, c.slot.x, c.slot.y + 8); } else flyTo(other, other.hx, other.hy); other.bad = false; other.w = other.slot ? sl.w - 14 : TC_W; other.h = other.slot ? 34 : TC_H; }
      sl.card = c; c.slot = sl; c.bad = false; c.w = sl.w - 14; c.h = 34;
      Sound.tick(); flyTo(c, sl.x, sl.y + 11);
    } else {
      if (c.slot) c.slot.card = null; c.slot = null; c.w = TC_W; c.h = TC_H; c.bad = false; flyTo(c, c.hx, c.hy);
    }
  }
  function drawTools(t) {
    ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 28, '재려는 대상에 알맞은 측정 도구를 놓아요', { size: PHONE ? 17 : 19, color: '#1b2333', weight: 800 });
    // 눈금자
    ctx.fillStyle = '#fff'; D.shadow(() => rr(TL.x0 - 12, TL.y - 7, TL.x1 - TL.x0 + 24, 14, 7).fill(), { blur: 6, y: 2 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
    for (let k = -11; k <= 20; k++) { const x = tkX(k), big = k % 5 === 0; ctx.beginPath(); ctx.moveTo(x, TL.y - (big ? 7 : 3)); ctx.lineTo(x, TL.y + (big ? 7 : 3)); ctx.stroke(); if (big) D.text(x, TL.y + 24, p10(k), { size: 13, color: '#3a4456', weight: 800 }); }
    D.text(TL.x1, TL.y + 24 + 18, 'm', { size: 13, color: '#64748b', weight: 800, align: 'right' });
    // 슬롯
    S.slots.forEach((s) => {
      const hit = S.drag && S.drag.c.kind === 'tool' && slotAt(S.drag.c) === s;
      ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(tkX(s.k), TL.y); ctx.lineTo(s.x, s.y + s.h / 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = hit ? '#e0e9ff' : '#fff'; ctx.strokeStyle = hit ? '#3867f4' : (S.toolsOK ? '#14a058' : '#94a3b8'); ctx.lineWidth = hit ? 3 : 2; ctx.setLineDash(s.card ? [] : [6, 5]);
      rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).fill(); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.setLineDash([]);
      D.text(s.x, s.y - s.h / 2 + 18, s.text, { size: 14, color: '#1b2333', weight: 800 });
      if (!s.card) D.text(s.x, s.y + 14, s.val, { size: 13, color: '#3867f4', weight: 800 });
      else D.text(s.x, s.y - s.h / 2 + 33, s.val, { size: 12.5, color: '#3867f4', weight: 800 });
      ctx.fillStyle = '#3867f4'; ctx.beginPath(); ctx.arc(tkX(s.k), TL.y, 4.5, 0, 6.3); ctx.fill();
    });
    // 측정 가능 범위 (성공 후)
    if (S.reveal > 0.01) {
      const rowsY = TL.y + 46;
      const bars = TOOLS.map((tl, i) => ({ tl, row: i % 2 }));
      D.text(TL.x0, rowsY - 4, '각 도구로 잴 수 있는 길이', { size: 13, color: '#5d6879', weight: 800, align: 'left' });
      const hy = rowsY + 6 + 2 * 28;
      bars.forEach(({ tl, row }) => {
        const y = rowsY + 10 + row * 28, a = clamp(S.reveal * 1.2 - (TOOLS.indexOf(tl)) * 0.12, 0, 1);
        const x0 = tkX(tl.lo), x1 = tkX(tl.lo + (tl.hi - tl.lo) * a);
        ctx.fillStyle = tl.col; rr(x0, y, Math.max(2, x1 - x0), 12, 6).fill();
        ctx.globalAlpha = a; D.text(x0, y + 26, tl.name, { size: 13, color: tl.col, weight: 800, align: 'left' }); ctx.globalAlpha = 1;
      });
      ctx.globalAlpha = S.reveal; ctx.fillStyle = 'rgba(100,116,139,.55)'; rr(tkX(-4), hy + 16, tkX(4) - tkX(-4), 12, 6).fill();
      D.text((tkX(-4) + tkX(4)) / 2, hy + 44, '사람의 몸·맨눈', { size: 13, color: '#475569', weight: 800 }); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(6, TL.trayY - 4, VW - 12, VH - TL.trayY - 2, 14).fill();
    S.tcards.forEach((c) => {
      const end = cardBox(c, { stroke: c.bad ? '#e2464b' : S.toolsOK ? '#14a058' : c.slot ? '#3867f4' : '#cbd5e1' });
      if (c.slot) D.text(0, 5, c.ico + ' ' + c.name, { size: 14, color: '#1b2333', weight: 800 });
      else { D.text(-c.w / 2 + 26, 8, c.ico, { size: 22, weight: 700 }); D.text(-c.w / 2 + 46, 5, c.name, { size: 14, color: '#1b2333', weight: 800, align: 'left' }); }
      end();
    });
  }
  const toolsDone = () => S.slots.every((s) => s.card && s.card.id === s.tool);

  /* 레이저 */
  const LZ = { ex: 120, mx: VW - 110, y: PHONE ? 330 : 250 };
  function fireLaser() {
    const L = S.laser; if (L.state === 'go' || L.state === 'back') return;
    L.state = 'go'; L.p = 0; L.t = 0; L.shown = false; Sound.click();
  }
  function stepLaser(dt) {
    const L = S.laser;
    if (L.state === 'go' || L.state === 'back') {
      const dur = RM ? 0.3 : 3.2;
      L.p += dt / dur * 2; L.t = Math.min(2.56, L.p / 2 * 2.56);
      if (L.p >= 1 && L.state === 'go') { L.state = 'back'; parts.burst(LZ.mx - 40, LZ.y, { count: 10, colors: ['#fde68a', '#fff', '#fca5a5'], speed: 90, life: 0.6, size: 3, gravity: 0 }); Sound.tick(); }
      if (L.p >= 2) { L.p = 2; L.t = 2.56; L.state = 'done'; L.shown = true; Sound.success(); }
    }
  }
  function drawLaser(t) {
    const sk = ctx.createLinearGradient(0, 0, 0, VH); sk.addColorStop(0, '#050816'); sk.addColorStop(1, '#0f1b45'); ctx.fillStyle = sk; ctx.fillRect(0, 0, VW, VH);
    const r = rng(9); for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.6 * r()) + ')'; ctx.beginPath(); ctx.arc(r() * VW, r() * VH, 0.5 + r() * 1.2, 0, 6.3); ctx.fill(); }
    ICON.earth(LZ.ex, LZ.y, 120, t);
    D.sphere(LZ.mx, LZ.y, 34, '#cbd5e1', { light: '#f1f5f9', dark: '#64748b' });
    ctx.fillStyle = 'rgba(100,116,139,.45)'; [[-10, -8, 7], [8, 6, 9], [-6, 12, 5]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(LZ.mx + dx, LZ.y + dy, rr, 0, 6.3); ctx.fill(); });
    D.text(LZ.ex, LZ.y + 82, '지구', { size: 15, color: '#e2e8f0', weight: 800 });
    D.text(LZ.mx, LZ.y + 56, '달 (반사경)', { size: 15, color: '#e2e8f0', weight: 800 });
    D.text(VW / 2, LZ.y - 70, '※ 그림에서 지구–달 거리는 실제 비율이 아니에요', { size: 13, color: '#94a3b8', weight: 700 });
    const L = S.laser, x0 = LZ.ex + 64, x1 = LZ.mx - 40;
    D.dashedLine(x0, LZ.y, x1, LZ.y, { color: 'rgba(148,163,184,.5)', width: 2, offset: t * 14 });
    if (L.state === 'go' || L.state === 'back') {
      const q = L.state === 'go' ? L.p : 2 - L.p, px = x0 + (x1 - x0) * clamp(q, 0, 1);
      D.glow(px, LZ.y, 36, L.state === 'go' ? '#fb7185' : '#fde68a', 0.9); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, LZ.y, 5, 0, 6.3); ctx.fill();
      ctx.strokeStyle = L.state === 'go' ? 'rgba(251,113,133,.8)' : 'rgba(253,230,138,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.state === 'go' ? x0 : x1, LZ.y); ctx.lineTo(px, LZ.y); ctx.stroke();
    }
    // 시계
    const cw = 190, cx = VW / 2 - cw / 2, cy = LZ.y + (PHONE ? 110 : 96);
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(cx, cy, cw, 74, 16).fill(); }, { blur: 10, y: 3, color: 'rgba(0,0,0,.4)' });
    D.text(cx + cw / 2, cy + 24, '레이저가 왕복한 시간', { size: 14, color: '#5d6879', weight: 800 });
    D.text(cx + cw / 2, cy + 58, L.t.toFixed(2) + ' s', { size: 32, color: L.state === 'done' ? '#14a058' : '#1b2333', weight: 800 });
    D.text(VW / 2, cy + 104, '빛의 속력  c = 3.0×10⁸ m/s', { size: 17, color: '#fde68a', weight: 800 });
    if (L.shown) {
      D.label(VW / 2, cy + 140, '거리 = c × 시간 / 2 = 3.0×10⁸ × 2.56 / 2', { bg: 'rgba(255,255,255,.95)', color: '#1b2333', size: 15 });
      D.text(VW / 2, cy + 172, '(왕복이라서 2로 나눠요)', { size: 14, color: '#cbd5e1', weight: 700 });
    } else D.text(VW / 2, cy + 134, S.laser.state === 'idle' ? '🔦 레이저를 쏘아 왕복 시간을 재 보세요' : '⏱ 측정 중…', { size: 16, color: '#bfdbfe', weight: 800 });
  }

  /* ======================================================
     장면 전환 · 입력 · 루프
     ====================================================== */
  function setMode(m, sub) {
    if (S.mode !== m) { S.fade = 1; }
    S.mode = m; if (sub) S.sub = sub;
    S.drag = null;
    updateCtl();
  }
  const MODE_LABEL = { zoom: '🔭 줌 여행', cards: '📏 규모 비교', table: '🔬 미시·거시', tools: '🧰 측정 도구' };
  const sExp = $('#sExp'), oExp = $('#oExp'), modeSeg = $('#modeSeg');
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode] + (S.mode === 'tools' ? (S.sub === 'laser' ? ' · 레이저 거리 측정' : ' · 도구 짝짓기') : '');
    $$('#ctrlCard .control').forEach((c) => {
      const ok = c.dataset.modes.split(' ').includes(S.mode) && (!c.dataset.sub || c.dataset.sub === S.sub);
      c.hidden = !ok;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free);
  }
  function setExp(v, instant) {
    S.te = clamp(v, E_MIN, E_MAX); sExp.value = S.te; sbind.refresh();
    if (instant) S.e = S.te;
  }
  const sbind = SciSim.bindRange(sExp, oExp, (v) => p10Real(+v) + ' m', (v) => { S.te = v; });
  function stepScene(dir) {
    const cur = S.te; let tgt = null;
    if (dir > 0) tgt = OBJ.find((o) => o.le > cur + 0.15); else { for (let i = OBJ.length - 1; i >= 0; i--) if (OBJ[i].le < cur - 0.15) { tgt = OBJ[i]; break; } }
    if (tgt) { setExp(tgt.le, false); Sound.tick(); } else toast(dir > 0 ? '더 큰 장면은 없어요' : '더 작은 장면은 없어요', '', 1200);
  }
  $('#bPrev').addEventListener('click', () => stepScene(-1));
  $('#bNext').addEventListener('click', () => stepScene(1));
  $('#bResetCards').addEventListener('click', () => { Sound.click(); initCards(); });
  $('#bResetTable').addEventListener('click', () => { Sound.click(); initTable(); });
  $('#bResetTools').addEventListener('click', () => { Sound.click(); initTools(); });
  $('#bFire').addEventListener('click', fireLaser);
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode, b.dataset.mode === 'tools' ? 'match' : null); }));
  $('#inDist').addEventListener('input', () => { S.distVal = $('#inDist').value; });

  let hintTimer = null;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000);
  }

  const activeList = () => (S.mode === 'cards' ? S.cards : S.mode === 'table' ? S.chips : S.mode === 'tools' && S.sub === 'match' ? S.tcards : null);
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'zoom') {
        const g = S.mapGeom; if (g && p.y > g.my - 24 && p.y < g.my + 14 && p.x > g.mx0 - 12 && p.x < g.mx1 + 12) { S.mapDrag = true; setExp(E_MIN + (p.x - g.mx0) / (g.mx1 - g.mx0) * (E_MAX - E_MIN)); return true; }
        return false;
      }
      const list = activeList(); if (!list) return false;
      const c = pickItem(p, list); if (!c) return false;
      dragStart(c, p, list);
      if (c.kind === 'card' && c.k != null) { c.k = null; c.w = CARD_W; c.h = CARD_H; layoutChips(); }
      if (c.kind === 'chip' && c.cell) { c.cell.chip = null; c.cell = null; c.w = TB.chW; c.h = TB.chH; }
      if (c.kind === 'tool' && c.slot) { c.slot.card = null; c.slot = null; c.w = TC_W; c.h = TC_H; }
      return true;
    },
    move(p) {
      if (S.mapDrag) { const g = S.mapGeom; setExp(E_MIN + (p.x - g.mx0) / (g.mx1 - g.mx0) * (E_MAX - E_MIN)); return; }
      const d = S.drag; if (!d) return;
      d.c.x = p.x - d.ox; d.c.y = p.y - d.oy;
    },
    up(p) {
      if (S.mapDrag) { S.mapDrag = false; return; }
      const d = S.drag; if (!d) return;
      const c = d.c; c.x = p.x - d.ox; c.y = p.y - d.oy;
      if (c.kind === 'card') cardDrop(c, { x: c.x, y: c.y });
      else if (c.kind === 'chip') chipDrop(c, { x: c.x, y: c.y });
      else toolDrop(c, { x: c.x, y: c.y });
    },
    hover(p) { if (S.mode === 'zoom') { const g = S.mapGeom; return g && p.y > g.my - 24 && p.y < g.my + 14 ? 'pointer' : 'default'; } const l = activeList(); return l && pickItem(p, l) ? 'grab' : 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'zoom') {
      const near = nearest(S.e);
      L1 = '눈금 막대 길이'; a = p10Real(S.e) + ' m'; L2 = '가장 가까운 장면'; b = near.name; L3 = '우리말로 하면'; c = eq(S.e);
    } else if (S.mode === 'cards') {
      const placed = S.cards.filter((x) => x.k != null).length, lc = S.lastCard;
      L1 = '놓은 카드'; a = placed + ' / 12'; L2 = '마지막으로 놓은 것'; b = lc && lc.k != null ? lc.name : '—'; L3 = '사람 키와 비교'; c = lc && lc.k != null ? '약 ' + multTxt(lc.k) : '—';
    } else if (S.mode === 'table') {
      const f = S.cells.filter((x) => x.chip).length;
      L1 = '채운 칸'; a = f + ' / 8'; L2 = '미시세계'; b = '원자 ≈ ' + p10(-10) + ' m'; L3 = '거시세계'; c = '은하 ≈ ' + p10(21) + ' m';
    } else if (S.sub === 'match') {
      const f = S.slots.filter((x) => x.card).length;
      L1 = '짝지은 도구'; a = f + ' / 6'; L2 = '1 m의 정의'; b = '빛이 진공에서 1/299 792 458초 동안 간 거리'; L3 = '';  c = '';
    } else {
      L1 = '왕복 시간'; a = S.laser.t.toFixed(2) + ' s'; L2 = '빛의 속력'; b = '3.0×10⁸ m/s'; L3 = '입력한 거리'; c = $('#inDist').value ? $('#inDist').value + '×10⁸ m' : '—';
    }
    const key = L1 + a + L2 + b + L3 + c;
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3 || ' '; v3.textContent = c || ' ';
    v3.parentElement.style.visibility = L3 ? 'visible' : 'hidden';
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    if (li > 0) { const h = $('#stageHint'); if (h) h.classList.add('hide'); }
    if (li === 0) { setMode('zoom'); S.minV = S.maxV = false; S.seen = new Set(); setExp(0, true); }
    else if (li === 1) { initCards(); setMode('cards'); layoutChips(); }
    else if (li === 2) { initTable(); setMode('table'); }
    else { initTools(); S.laser = { state: 'idle', p: 0, t: 0, shown: false }; $('#inDist').value = ''; setMode('tools', 'match'); }
  }
  function ensure(m, sub) {
    if (S.mode !== m || (sub && S.sub !== sub)) { if (m === 'cards' && !S.cards.length) initCards(); if (m === 'table' && !S.cells.length) initTable(); if (m === 'tools' && !S.slots.length) initTools(); setMode(m, sub); if (m === 'cards') layoutChips(); }
  }
  const seenN = () => S.seen.size;
  const levels = [
    {
      title: '줌 여행: 양성자에서 우주까지', short: '줌 여행', icon: '🔭', phase: '관찰',
      features: ['zoom'],
      intro: '<p class="si-q">❓ 탐구 질문: 가장 짧은 거리와 가장 긴 거리는 얼마일까? 우리는 어디까지 볼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 원자의 구조(중2 Ⅳ)와 별까지의 거리·팽창하는 우주(중2 Ⅷ)를 배웠어요. 아주 작은 원자와 아주 큰 우주를 한 눈금에 담아 봐요.</div>' +
        '<p>길이를 <b>10의 거듭제곱(지수)</b>으로 나타내면 아주 작은 것부터 아주 큰 것까지 한 눈금으로 비교할 수 있어요. 지수가 <b>1 커지면 길이는 10배</b>가 돼요.</p>' +
        '<p>사람 키(10⁰ m)에서 출발해 슬라이더를 돌리며 <b>줌 여행</b>을 떠나요!</p>',
      setup() { enterLevel(0); showHint('🔭 슬라이더를 끌어 보세요', 6000); },
      recap: '자연의 공간 규모는 양성자(약 10⁻¹⁵ m)에서 관측 가능한 우주(약 10²⁷ m)까지 지수로 약 42칸이나 돼요.',
      summary: '<ul><li>자연은 <b>시간과 공간</b>에서 기술해요. 공간의 크기는 <b>10의 거듭제곱</b>으로 나타내요.</li><li>지수가 <b>1 커지면 길이는 10배</b>, 3 커지면 1000배예요.</li><li>양성자 약 10⁻¹⁵ m → 사람 키 약 10⁰ m → 관측 가능한 우주 약 10²⁷ m: 지수로 약 <b>42</b> 차이나는 규모예요.</li><li>원자 속은 대부분 <b>빈 공간</b>이에요. (핵은 원자의 약 10만분의 1)</li></ul>',
      missions: [
        {
          title: '가장 작은 곳, 가장 큰 곳',
          goal: '슬라이더를 끝까지 돌려 <b>양성자</b>(가장 작은 규모)와 <b>관측 가능한 우주</b>(가장 큰 규모)를 모두 만나 보세요.',
          hint: '슬라이더를 맨 왼쪽(−15)과 맨 오른쪽(+27)까지 끌어 봐요. ◀ ▶ 버튼으로 장면을 하나씩 넘길 수도 있어요.',
          setup() { ensure('zoom'); S.minV = S.maxV = false; },
          check: () => { if (S.e <= -14.6) S.minV = true; if (S.e >= 26.6) S.maxV = true; return S.minV && S.maxV; }, hold: 0.3,
          status: () => mark(S.minV) + ' 가장 작은 곳(양성자) · ' + mark(S.maxV) + ' 가장 큰 곳(우주)',
          explain: '양성자는 약 <b>10⁻¹⁵ m</b>, 관측 가능한 우주는 약 <b>10²⁷ m</b>예요. 지수로 무려 42칸 차이라서, 한 눈금에 담으려면 10의 거듭제곱으로 나타내야 해요.',
        },
        {
          title: '장면 도감 채우기',
          goal: '줌 여행을 하며 <b>서로 다른 장면 8개</b>를 선명하게 만나 보세요. 아래 지도의 파란 점이 만난 장면이에요.',
          hint: '<b>다음 장면 ▶</b> 버튼을 누르면 다음 물체로 부드럽게 이동해요.',
          setup() { ensure('zoom'); S.seen = new Set(); },
          check: () => seenN() >= 8, hold: 0.3,
          status: () => '만난 장면 <b>' + seenN() + ' / 8</b> (전체 15장면)',
          explain: '원자 → 세포 → 사람 → 지구 → 태양계 → 은하로 갈수록 지수가 커져요. 사람은 <b>10⁻⁴ ~ 10⁴ m</b> 정도의 규모에서 몸으로 느끼며 살아가요.',
        },
        {
          type: 'quiz', title: '지수와 맨눈',
          goal: '지수가 <b>3</b> 커지면 길이는 <b>1000배</b>가 돼요. 그렇다면 <b>10⁻³ m</b>(1 mm)와 <b>10³ m</b>(1 km)는 사람이 맨눈으로 볼 수 있을까요?',
          setup() { ensure('zoom'); },
          choices: ['10⁻³ m는 볼 수 있지만 10³ m는 볼 수 없다', '둘 다 맨눈으로 볼 수 있다', '10⁻³ m는 볼 수 없고 10³ m만 볼 수 있다', '둘 다 맨눈으로 볼 수 없다'],
          answer: 1,
          feedback: ['1 km는 멀리 있는 산이나 건물의 크기와 거리로 우리 눈에 충분히 보여요.', '', '1 mm는 모래알이나 개미 정도라서 맨눈으로 볼 수 있어요.', '개미(약 5 mm)도, 눈앞의 1 km 거리도 우리는 볼 수 있어요.'],
          explain: '1 mm(10⁻³ m)는 모래알 크기, 1 km(10³ m)는 걸어서 약 12분 거리라서 모두 맨눈으로 볼 수 있어요. 맨눈이 닿는 범위를 넘어서는 세계(원자, 은하)를 보려면 <b>측정 도구</b>가 필요해요.',
        },
      ],
    },
    {
      title: '규모 비교: 지수 눈금자에 놓기', short: '규모 비교', icon: '📏', phase: '탐구',
      features: ['cards'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 양성자부터 우주까지 지수로 약 42칸의 규모를 여행했어요. 지수가 1 커지면 길이는 10배였죠.</div>' +
        '<p>이번에는 <b>물체 카드 12장</b>을 지수 눈금자에 직접 놓아 봐요. 눈금자에서 사람 키(약 10⁰ m)를 기준으로 얼마나 작고 큰지 비교할 수 있어요. <b>지수가 ±1</b> 정도 틀려도 괜찮아요.</p>',
      setup() { enterLevel(1); },
      recap: '크기를 지수로 어림하면 사람 키의 몇 배, 몇 분의 1인지 바로 비교할 수 있어요. 원자는 사람 키의 약 10¹⁰분의 1이에요.',
      summary: '<table class="mini"><tr><th>대상</th><th>길이 (m)</th></tr><tr><td>수소 원자</td><td>10⁻¹⁰</td></tr><tr><td>적혈구</td><td>7×10⁻⁶</td></tr><tr><td>사람 키</td><td>1.7</td></tr><tr><td>지구 지름</td><td>1.3×10⁷</td></tr><tr><td>지구–태양 거리</td><td>1.5×10¹¹</td></tr><tr><td>우리은하 지름</td><td>9.5×10²⁰</td></tr></table><ul><li>두 대상의 비 = 지수의 <b>차이</b>로 어림해요. (원자 ↔ 사람: 지수 차 약 10)</li></ul>',
      missions: [
        {
          title: '카드 12장 놓기',
          goal: '카드 <b>12장</b>을 지수 눈금자의 알맞은 곳에 모두 놓고 <b>✔ 확인하기</b>를 누르세요. (지수 ±1 오차는 괜찮아요)',
          hint: '맨눈으로 겨우 보이는 머리카락 굵기가 약 10⁻⁴ m예요. 지구 지름은 약 1만 km(10⁷ m)쯤이에요.',
          manual: true,
          setup() { ensure('cards'); },
          check() {
            const un = S.cards.filter((c) => c.k == null);
            if (un.length) return '아직 눈금자에 놓지 않은 카드가 <b>' + un.length + '장</b> 있어요.';
            const bad = S.cards.filter((c) => Math.abs(c.k - c.ans) > 1);
            bad.forEach((c) => { if (c.bad !== c.ver) { c.bad = c.ver; c.shake = 0.5; } });
            if (bad.length) return bad.map((c) => '<b>' + c.short + '</b>(' + (c.k > c.ans ? '더 작은' : '더 큰') + ' 쪽)').join(', ') + ' 카드의 위치를 다시 생각해 보세요.';
            S.cards.forEach((c) => { c.bad = -1; });
            if (!S.revealCards) { SciSim.tween(S, { revealCards: 1 }, { duration: 0.8 }); S.cards.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '초록 삼각형이 실제 위치예요. 가장 작은 양성자(10⁻¹⁵ m)부터 우리은하(10²¹ m)까지 지수로 36칸이나 퍼져 있어요. 사람 키는 그 한가운데쯤에 있어요.',
        },
        {
          type: 'quiz', title: '원자와 사람',
          goal: '수소 원자(약 10⁻¹⁰ m)는 사람 키(약 1.7 m)의 약 몇 분의 1일까요?',
          setup() { ensure('cards'); },
          choices: ['약 10⁴분의 1 (1만분의 1)', '약 10⁷분의 1 (1000만분의 1)', '약 10¹⁰분의 1 (100억분의 1)', '약 10²⁰분의 1'],
          answer: 2,
          feedback: ['1만 배 차이는 머리카락 굵기(10⁻⁴ m)와 사람 키 정도의 차이예요.', '지수가 7만큼 차이 나는 것은 바이러스(10⁻⁷ m)와 사람 키 정도예요.', '', '지수 차이는 10 정도예요. 20이면 양성자보다도 훨씬 작은 규모가 돼요.'],
          explain: '10⁻¹⁰ m ÷ 1.7 m ≈ 6×10⁻¹¹, 즉 지수로 약 10 작아서 사람 키의 약 <b>100억분의 1</b>이에요. 원자를 한 줄로 약 170억 개 늘어놓아야 사람 키(1.7 m)가 돼요.',
        },
        {
          type: 'quiz', title: '지구와 태양',
          goal: '지구–태양 거리(1.5×10¹¹ m)는 지구 지름(1.3×10⁷ m)의 약 몇 배일까요?',
          setup() { ensure('cards'); },
          choices: ['약 100배', '약 1만 배', '약 100만 배', '약 1억 배'],
          answer: 1,
          feedback: ['지수의 차이를 보세요. 11 − 7 = 4이므로 100배(지수 2)보다 훨씬 커요.', '', '지수 차이가 4이므로 10⁴배예요. 10⁶배라면 지수가 6 차이 나야 해요.', '1억 배는 지수 차이가 8이에요. 여기서는 11 − 7 = 4예요.'],
          explain: '지수의 차이 11 − 7 = 4이므로 약 <b>10⁴배(1만 배)</b>예요. 두 크기를 비교할 때는 나눗셈 대신 <b>지수를 빼면</b> 쉽게 어림할 수 있어요.',
        },
      ],
    },
    {
      title: '미시세계와 거시세계 비교', short: '미시·거시', icon: '🔬', phase: '분석',
      features: ['table'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원자(약 10⁻¹⁰ m)와 은하(약 10²¹ m)가 지수로 31칸이나 떨어져 있다는 것을 확인했어요.</div>' +
        '<p>원자·분자의 <b>미시세계</b>와 행성·은하의 <b>거시세계</b>는 크기뿐 아니라 <b>관찰 도구, 쓰는 단위, 작용하는 힘</b>도 달라요. 카드를 끌어 <b>비교표</b>를 완성해 봐요.</p>',
      setup() { enterLevel(2); },
      recap: '미시세계는 전자 현미경·nm·전기력, 거시세계는 망원경·광년·중력이 중심이에요.',
      summary: '<table class="mini"><tr><th></th><th>미시세계</th><th>거시세계</th></tr><tr><th>관찰 도구</th><td>전자 현미경</td><td>망원경</td></tr><tr><th>길이 단위</th><td>nm</td><td>천문단위·광년</td></tr><tr><th>주된 힘</th><td>전기력</td><td>중력</td></tr><tr><th>눈으로</th><td>직접 안 보임</td><td>일부는 보임</td></tr></table><ul><li>원자 안은 대부분 <b>빈 공간</b>이에요. (핵은 원자의 약 10만분의 1)</li><li>은하 사이는 빛으로도 오래 걸리는 아주 먼 거리예요.</li></ul>',
      missions: [
        {
          title: '비교표 완성하기',
          goal: '카드 <b>8장</b>을 미시세계(왼쪽)와 거시세계(오른쪽) 칸에 알맞게 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '원자를 이루는 입자 사이에는 전기력이, 행성과 별 사이에는 중력이 주로 작용해요.',
          manual: true,
          setup() { ensure('table'); },
          check() {
            const un = S.cells.filter((c) => !c.chip).length;
            if (un) return '아직 빈칸이 <b>' + un + '칸</b> 남았어요.';
            const bad = S.cells.filter((c) => c.chip.row !== c.row || c.chip.col !== c.col);
            bad.forEach((c) => { if (!c.chip.bad) { c.chip.bad = true; c.chip.shake = 0.5; } });
            if (bad.length) return '<b>' + bad.length + '칸</b>이 잘못 놓였어요. 빨간 테두리 카드를 다시 생각해 보세요. (같은 줄의 두 카드가 서로 바뀐 것은 아닌지 살펴봐요)';
            S.chips.forEach((c) => { c.bad = false; });
            if (!S.tableOK) { SciSim.tween(S, { tableOK: 1 }, { duration: 0.6 }); S.chips.forEach((c) => parts.burst(c.x, c.y, { count: 5, speed: 80, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '미시세계는 <b>전자 현미경</b>으로 보고 <b>nm</b> 단위를 쓰며 <b>전기력</b>이 중요해요. 거시세계는 <b>망원경</b>으로 보고 <b>천문단위·광년</b>을 쓰며 <b>중력</b>이 천체의 운동을 결정해요. 행성이나 달처럼 일부는 맨눈으로도 볼 수 있어요.',
        },
        {
          type: 'quiz', title: '비어 있는 세계',
          goal: '미시·거시 규모에 대해 <b>옳은</b> 설명은 어느 것일까요?',
          setup() { ensure('table'); },
          choices: ['원자핵은 원자 크기의 약 10만분의 1이라서, 원자 안은 대부분 빈 공간이다.', '원자는 꽉 찬 공이라서 안에 빈 공간이 거의 없다.', '은하와 은하 사이는 가까워서 빛이 금방 도달한다.', '미시세계에서는 천체 운동을 설명하는 중력이 가장 중요하다.'],
          answer: 0,
          feedback: ['', '원자(10⁻¹⁰ m) 안의 핵(10⁻¹⁵ m)은 아주 작아서 원자 대부분은 빈 공간이에요.', '가장 가까운 별까지만 해도 빛이 4.2년 걸려요. 은하 사이는 훨씬 멀어요.', '원자 규모에서는 전기력이 중요하고, 중력은 거시세계의 천체 운동에서 중요해요.'],
          explain: '핵(약 10⁻¹⁵ m)과 원자(약 10⁻¹⁰ m)는 지수가 5 차이 → 지름이 약 <b>10만배</b>예요. 그래서 원자는 대부분 빈 공간이에요. 반대로 거시세계는 빛으로도 몇 년, 몇 만 년씩 걸리는 먼 거리가 흔해요.',
        },
      ],
    },
    {
      title: '측정 도구로 넓혀 온 경험 범위', short: '측정 도구', icon: '🧰', phase: '적용',
      features: ['tools'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 미시세계는 전자 현미경, 거시세계는 망원경으로 본다는 것을 알았어요. 한 가지 도구로는 모든 규모를 잴 수 없어요.</div>' +
        '<p>과학자들은 더 작고 더 먼 곳을 재기 위해 새로운 <b>측정 방법</b>을 발명해 왔어요. 도구를 짝지어 보고, <b>레이저로 달까지의 거리</b>도 직접 구해 봐요.</p>',
      setup() { enterLevel(3); },
      recap: '도구가 발전하면서 길이 측정의 범위가 넓어졌어요. 하지만 관측 가능한 우주 너머는 아직 빛이 도달하지 못해 알 수 없어요.',
      summary: '<ul><li><b>전자 현미경</b> 10⁻¹⁰~10⁻⁷ m · <b>광학 현미경</b> 10⁻⁷~10⁻³ m · <b>자</b> 10⁻³~10¹ m · <b>레이더</b> · <b>레이저</b> · <b>연주시차</b>(별까지 거리)</li><li>레이저 거리 측정: <span class="formula">거리 = 빛의 속력 × 왕복 시간 ÷ 2</span> (달까지 약 3.8×10⁸ m)</li><li>1 m의 정의: 빛이 진공에서 1/299 792 458초 동안 간 거리</li><li>관측 가능한 우주 밖은 <b>빛이 아직 도달하지 못해</b> 알 수 없어요. 이것이 과학(관측)의 한계예요.</li></ul>',
      missions: [
        {
          title: '대상에 알맞은 도구',
          goal: '도구 카드 <b>6장</b>을 재려는 대상에 짝지어 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '아주 작은 원자는 전자 현미경, 책상은 자, 가까운 별까지는 지구가 태양 둘레를 돌며 생기는 시차를 이용해요.',
          manual: true,
          setup() { ensure('tools', 'match'); },
          check() {
            const un = S.slots.filter((s) => !s.card).length;
            if (un) return '아직 도구가 없는 칸이 <b>' + un + '칸</b> 있어요.';
            const bad = S.slots.filter((s) => s.card.id !== s.tool);
            bad.forEach((s) => { if (!s.card.bad) { s.card.bad = true; s.card.shake = 0.5; } });
            if (bad.length) return bad.map((s) => '<b>' + s.text + '</b>').join(', ') + '에는 다른 도구가 더 알맞아요.';
            S.tcards.forEach((c) => { c.bad = false; });
            if (!S.toolsOK) { S.toolsOK = true; SciSim.tween(S, { reveal: 1 }, { duration: 1.4, ease: 'outCubic' }); }
            return true;
          },
          explain: '아래 막대는 각 도구로 잴 수 있는 길이예요. 맨눈과 몸으로 잴 수 있는 범위(회색)는 좁지만, 도구를 이어 붙여 <b>10⁻¹⁰ m부터 10¹⁹ m까지</b> 경험 범위를 넓혔어요.',
        },
        {
          title: '레이저로 달까지 거리 구하기',
          goal: '<b>🔦 레이저 쏘기</b>로 왕복 시간을 재고, <b>거리 = 빛의 속력 × 시간 ÷ 2</b>로 지구–달 거리를 <b>×10⁸ m</b> 단위로 적으세요.',
          hint: '빛의 속력은 3.0×10⁸ m/s, 왕복 시간은 2.56 s예요. 가는 데만 걸린 시간은 왕복의 절반이에요.',
          manual: true,
          setup() { ensure('tools', 'laser'); showHint('🔦 레이저를 쏘아 왕복 시간을 재요', 6000); },
          check() {
            if (S.laser.state !== 'done') return '먼저 <b>🔦 레이저 쏘기</b>로 왕복 시간을 재 보세요.';
            const raw = $('#inDist').value.trim();
            if (!raw) return '계산한 거리를 입력칸에 적어 주세요. (×10⁸ m 단위)';
            const v = parseFloat(raw.replace(',', '.'));
            if (!isFinite(v)) return '숫자로 적어 주세요.';
            if (v >= 3.7 && v <= 3.95) return true;
            if (v > 7 && v < 8.3) return '왕복 시간 2.56 s는 갔다 오는 시간이에요. <b>2로 나누어야</b> 한쪽 거리가 돼요.';
            if (v > 0.3 && v < 0.5) return '계산이 조금 어긋났어요. 3.0×10⁸ × 2.56 ÷ 2 를 다시 계산해 보세요.';
            return '3.0 × 2.56 ÷ 2 를 계산해서 ×10⁸ m 단위로 적어 보세요.';
          },
          explain: '거리 = 3.0×10⁸ m/s × 2.56 s ÷ 2 ≈ <b>3.8×10⁸ m</b>(약 38만 km)예요. 레이저가 달의 반사경에 부딪혀 돌아오는 시간을 재면 달까지의 거리를 아주 정밀하게 알 수 있어요.',
        },
        {
          type: 'quiz', title: '관측 가능한 우주의 바깥',
          goal: '관측 가능한 우주(약 10²⁷ m)의 <b>바깥</b>을 우리가 아직 모르는 까닭은 무엇일까요?',
          setup() { ensure('tools', 'match'); },
          choices: ['우주가 그곳에서 끝나서 아무것도 없기 때문이다', '그곳에서 출발한 빛이 아직 지구에 도달하지 못했기 때문이다', '그곳은 너무 어두워서 별이 하나도 없기 때문이다', '아직 아무도 그쪽으로 망원경을 향해 보지 않았기 때문이다'],
          answer: 1,
          feedback: ['우주가 끝난다고 말할 수는 없어요. 우리가 볼 수 있는 한계일 뿐이에요.', '', '어두워서가 아니라, 빛이 도달하지 못해서 볼 수 없는 거예요.', '망원경을 어디로 향해도 빛이 도착하지 않은 곳은 볼 수 없어요.'],
          explain: '우주의 나이가 약 138억 년이라서, 그보다 먼 곳에서 출발한 빛은 아직 우리에게 오지 못했어요. 그래서 <b>관측 가능한 우주</b>까지만 알 수 있어요. 측정과 관찰의 한계를 인정하는 것도 과학의 모습이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-scale-space', mount: '#game', badge: '규모 탐험가', homeHref: '../../index.html#h1a',
    featureLabels: { zoom: '🔭 줌 슬라이더', cards: '📏 지수 눈금자 · 물체 카드', table: '🔬 미시·거시 비교표', tools: '🧰 측정 도구 카드 · 🔦 레이저 거리 측정' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initCards(); initTable(); initTools();
  setExp(0, true); updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 상태 진행
    S.e = RM ? S.te : SciSim.approach(S.e, S.te, dt, 5);
    if (Math.abs(S.e - S.te) < 0.003) S.e = S.te;
    sExp.value = S.te;
    oExp.textContent = p10Real(S.te) + ' m';
    stepItems(S.cards, dt); stepItems(S.chips, dt); stepItems(S.tcards, dt);
    stepLaser(dt); parts.update(dt);
    // 그리기
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'zoom') drawZoom(t);
    else if (S.mode === 'cards') drawCards(t);
    else if (S.mode === 'table') drawTable(t);
    else if (S.sub === 'laser') drawLaser(t);
    else drawTools(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, OBJ, setExp, stepScene, setMode, enterLevel, fireLaser,
    placeCards(right) { S.cards.forEach((c, i) => { c.k = right ? c.ans : (i % 2 ? c.ans + 3 : c.ans); c.ver = ++S.placeVer; c.bad = -1; c.w = RL.cw; c.h = RL.ch; }); layoutChips(); S.cards.forEach((c) => { c.x = c.tx; c.y = c.ty; }); },
    fillTable(right) { S.chips.forEach((ch) => { const cell = S.cells.find((c) => c.row === ch.row && c.col === (right === false ? 1 - ch.col : ch.col)); if (!cell) return; if (cell.chip) cell.chip.cell = null; cell.chip = ch; ch.cell = cell; ch.x = ch.tx = cell.x + cell.w / 2; ch.y = ch.ty = cell.y; ch.w = cell.w - 8; ch.h = cell.h - 6; }); },
    fillTools(right) { S.slots.forEach((s) => { s.card = null; }); S.tcards.forEach((c, i) => { const s = S.slots.find((x) => x.tool === c.id); const t2 = right === false ? S.slots[(S.slots.indexOf(s) + 1) % 6] : s; t2.card = c; c.slot = t2; c.x = c.tx = t2.x; c.y = c.ty = t2.y + 11; c.w = t2.w - 14; c.h = 34; }); },
    dropTool(id, k) { const c = S.tcards.find((x) => x.id === id); const s = S.slots[k]; toolDrop(c, { x: s.x, y: s.y }); },
    layoutChips, dropCard(i, k) { const c = S.cards[i]; S.drag = { c }; cardDrop(c, { x: exX(k), y: RL.y - 100 }); },
  };
})();
