/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 도체·부도체·반도체 (단원 12차시)
   성취기준 [10통과1-02-06] 지구를 구성하는 물질을 전기적 성질에 따라 구분할 수 있고, 물질의 전기적 성질을
   응용하여 일상생활과 첨단기술에서 다양한 소재로 활용됨을 인식한다.
   ① 실험: 전류 시험 (시료 10가지의 전류 측정, 3칸 분류)
   ② 모형: 자유전자 (구리 · 유리 · 규소의 입자 모형)
   ③ 탐구: 반도체 (불순물 · 온도 · 빛에 따른 전류 변화)
   ④ 적용: 소재 선택 (부품 소재 고르기, 모래 → 규소 → 칩 공정)
   ※ 에너지띠 이론과 접합 원리(다이오드, 트랜지스터 동작)는 다루지 않음
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 520 : 800, VH = PHONE ? 780 : 560;
  const RM = SciSim.reduceMotion;
  const FS = PHONE ? 1.18 : 1;
  const EASE = SciSim.ease;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rand = Math.random;
  /* 전류 값 표기 : 9.5×10⁻¹ A */
  function sci(v) {
    if (!(v > 0)) return '0 A';
    let e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
    if (m >= 9.95) { m /= 10; e++; }
    return m.toFixed(1) + '×10' + sup(e) + ' A';
  }

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f7f4ef' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();
  const BG = '#f7f4ef';

  /* ---------- 시료(물질) 자료 ---------- */
  // 시료 크기는 모두 같음. 전류 I = 3 V ÷ (전구 3 Ω + 시료 저항), 시료 저항 = 비저항 × 10⁷ (같은 크기의 가는 시료)
  const MAT = [
    { id: 'cu', name: '구리', rho: 1.7e-8 }, { id: 'fe', name: '철', rho: 1e-7 }, { id: 'al', name: '알루미늄 호일', short: '알루미늄', rho: 2.8e-8 },
    { id: 'gr', name: '연필심(흑연)', short: '연필심', rho: 1e-5 }, { id: 'si', name: '규소 조각', short: '규소', rho: 2.3e3 }, { id: 'gn', name: '화강암 조각', short: '화강암', rho: 1e8 },
    { id: 'wd', name: '건조한 나무', short: '건조 나무', rho: 1e10 }, { id: 'gl', name: '유리', rho: 1e12 }, { id: 'rb', name: '고무', rho: 1e13 }, { id: 'pl', name: '플라스틱', rho: 1e14 },
  ];
  const MID = {}; MAT.forEach((m) => { MID[m.id] = m; m.I = 3 / (3 + m.rho * 1e7); m.tier = m.I >= 1e-3 ? 0 : m.I >= 1e-12 ? 1 : 2; });
  const TIER_NAME = ['전류가 잘 흐름', '전류가 조금 흐름', '전류가 거의 안 흐름'];
  const TIER_COL = ['#16a34a', '#d97706', '#64748b'];
  const readA = (m) => (m.I >= 1e-12 ? sci(m.I) : '< 10' + sup(-12) + ' A (측정 한계 이하)');

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'test', sub: 'bench', clock: 0, fade: 0, drag: null, hover: '',
    test: { cur: null, since: 0, meas: {}, needle: 0, glowv: 0, dotPh: 0, chips: [], sorted: false, msg: '', msgT: 0, order: MAT.map((m) => m.id), place: 0 },
    model: { mat: 'cu', volt: false, n: 36, e: [], t: { cu: 0, gl: 0, si: 0 }, custom: false, cls: { cu: 0, gl: 0, si: 0 }, clsOK: false, clsBad: [], seen: { cu: false, gl: false, si: false }, phase: 0 },
    semi: { d: 0, T: 20, L: 0, e: [], rel: 1, relv: 1, doped100: false, env10: false, ph: [] },
    apply: { slots: [null, null, null, null], sel: '', partsOK: false, bad: [false, false, false, false], msg: '', msgT: 0, fab: [], fabSlots: [null, null, null, null], fabOK: false, fabT: 0, sw: [], shake: [0, 0, 0, 0] },
  };
  let game = null;

  /* ======================================================
     시료 그리기
     ====================================================== */
  function sample(id, x, y, w, h, t) {
    ctx.save(); ctx.translate(x, y);
    const r = Math.min(h / 2, 12), g = (c0, c1, c2) => { const gg = ctx.createLinearGradient(0, -h / 2, 0, h / 2); gg.addColorStop(0, c0); gg.addColorStop(0.5, c1); gg.addColorStop(1, c2); return gg; };
    const body = (fill, stroke) => { D.shadow(() => { ctx.fillStyle = fill; rr(-w / 2, -h / 2, w, h, r).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = stroke || 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; rr(-w / 2, -h / 2, w, h, r).stroke(); };
    if (id === 'cu') { body(g('#f9c9a0', '#d2733f', '#8c3f1d'), '#7c3516'); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w / 2 + 10, -h * 0.22); ctx.lineTo(w / 2 - 10, -h * 0.22); ctx.stroke(); }
    else if (id === 'fe') { body(g('#e2e8f0', '#8794a8', '#3b4658'), '#2f3947'); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * w * 0.18 - 6, -h / 2 + 3); ctx.lineTo(k * w * 0.18 + 6, h / 2 - 3); ctx.stroke(); } }
    else if (id === 'al') { body(g('#ffffff', '#cfd8e3', '#9aa7b8'), '#8793a5'); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.2; const R = rng(5); for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(-w / 2 + R() * w, -h / 2 + 2); ctx.lineTo(-w / 2 + R() * w, 0); ctx.lineTo(-w / 2 + R() * w, h / 2 - 2); ctx.stroke(); } }
    else if (id === 'gr') { body(g('#8a919c', '#3f4651', '#1f242c'), '#111827'); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w / 2 + 8, -h * 0.2); ctx.lineTo(w / 2 - 8, -h * 0.2); ctx.stroke(); }
    else if (id === 'gl') { ctx.globalAlpha = 0.92; body('rgba(186,230,253,.55)', '#7dd3fc'); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w / 2 + 10, -h * 0.2); ctx.lineTo(w / 2 - 14, -h * 0.2); ctx.stroke(); }
    else if (id === 'rb') { body(g('#4b5563', '#1f2937', '#0b1220'), '#020617'); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w / 2 + 10, -h * 0.22); ctx.lineTo(w / 2 - 10, -h * 0.22); ctx.stroke(); }
    else if (id === 'pl') { body(g('#ffffff', '#bfdbfe', '#60a5fa'), '#3b82f6'); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w / 2 + 10, -h * 0.2); ctx.lineTo(w / 2 - 14, -h * 0.2); ctx.stroke(); }
    else if (id === 'wd') { body(g('#f0c995', '#cf9a5c', '#a56f36'), '#7b4f22'); ctx.strokeStyle = 'rgba(120,70,20,.45)'; ctx.lineWidth = 1.2; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 6, k * h * 0.25); ctx.bezierCurveTo(-w * 0.2, k * h * 0.25 - 3, w * 0.2, k * h * 0.25 + 3, w / 2 - 6, k * h * 0.25); ctx.stroke(); } }
    else if (id === 'si') {
      D.shadow(() => { ctx.fillStyle = g('#94a3b8', '#475569', '#1e293b'); ctx.beginPath(); ctx.moveTo(-w / 2 + 8, -h / 2); ctx.lineTo(w / 2 - 8, -h / 2); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2 - 8, h / 2); ctx.lineTo(-w / 2 + 8, h / 2); ctx.lineTo(-w / 2, 0); ctx.closePath(); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-w * 0.2, -h / 2); ctx.lineTo(-w * 0.05, h / 2); ctx.moveTo(w * 0.15, -h / 2); ctx.lineTo(w * 0.3, h / 2); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w / 2 + 8, -h / 2); ctx.lineTo(w / 2 - 8, -h / 2); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2 - 8, h / 2); ctx.lineTo(-w / 2 + 8, h / 2); ctx.lineTo(-w / 2, 0); ctx.closePath(); ctx.stroke();
      if (t != null) D.spark(w * 0.2, -h * 0.12, 5, t + 1, '#e0f2fe');
    } else if (id === 'gn') { body(g('#f1d9d4', '#c9a9a3', '#8b7270'), '#6b5654'); const R = rng(9); for (let k = 0; k < 26; k++) { ctx.fillStyle = R() < 0.5 ? 'rgba(60,40,40,.55)' : 'rgba(255,255,255,.7)'; ctx.fillRect(-w / 2 + 4 + R() * (w - 10), -h / 2 + 3 + R() * (h - 8), 2.4, 2.4); } }
    ctx.restore();
  }

  /* ======================================================
     화면 ①-a: 전류 시험대 (전지 · 전구 · 전류계 · 시료 칸)
     ====================================================== */
  const BG0 = () => (PHONE ? { x0: 50, x1: 470, y0: 84, y1: 260, g0: 180, g1: 340, br: 22, ar: 40, bx: 0.36 } : { x0: 86, x1: 714, y0: 92, y1: 292, g0: 300, g1: 500, br: 26, ar: 50, bx: 0.36 });
  function loopPt(u, G) {
    const W = G.x1 - G.x0, H = G.y1 - G.y0, P = 2 * (W + H); let d = ((u % 1) + 1) % 1 * P;
    if (d < W) return { x: G.x0 + d, y: G.y0 };
    d -= W; if (d < H) return { x: G.x1, y: G.y0 + d };
    d -= H; if (d < W) return { x: G.x1 - d, y: G.y1 };
    d -= W; return { x: G.x0, y: G.y1 - d };
  }
  const rackPos = (i) => {
    if (!PHONE) return { x: 24 + (i % 5) * 154 + 72, y: 376 + Math.floor(i / 5) * 78 + 34, w: 140, h: 68 };
    return { x: 8 + (i % 2) * 254 + 122, y: 338 + Math.floor(i / 2) * 62 + 28, w: 244, h: 56 };
  };
  const rackMat = (i) => MAT[S.test.order.indexOf(MAT[i].id) >= 0 ? i : i];
  function curCur() { const T = S.test; return T.cur ? MID[T.cur].I : 0; }
  function placeSample(id) {
    const T = S.test; T.cur = id; T.since = 0; T.place = 0; Sound.tick();
    const G = BG0(); parts.burst((G.g0 + G.g1) / 2, G.y1, { count: 8, speed: 90, size: 3, life: 0.5, colors: ['#fde047', '#fff'] });
    SciSim.tween(T, { place: 1 }, { duration: 0.4, ease: 'outBack' });
    updateCtl();
  }
  function eject() { const T = S.test; if (T.cur) { T.cur = null; Sound.click(); } updateCtl(); }
  function stepTest(dt) {
    const T = S.test, I = curCur(), G = BG0();
    if (T.cur) { T.since += dt; if (T.since > 0.7 && !T.meas[T.cur]) { T.meas[T.cur] = true; Sound.tick(); parts.burst(G.x1, (G.y0 + G.y1) / 2, { count: 8, speed: 90, size: 3, life: 0.6, colors: ['#22c55e', '#fff'] }); updateCtl(); } }
    const target = clamp(I, 0, 1);
    T.needle = RM ? target : SciSim.approach(T.needle, target, dt, 5);
    T.glowv = RM ? target : SciSim.approach(T.glowv, target, dt, 6);
    const sp = I >= 1e-12 ? 30 + 170 * clamp((Math.log10(I) + 12) / 12, 0, 1) : 0;
    T.dotPh += sp * dt / (2 * ((G.x1 - G.x0) + (G.y1 - G.y0)));
    if (T.msgT > 0) T.msgT -= dt;
  }
  function bulb(x, y, r, glow) {
    D.glow(x, y, r * 2.4 + glow * 40, '#fde047', 0.75 * glow);
    ctx.save();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
    g.addColorStop(0, SciSim.color.mix('#f1f5f9', '#fffbe0', glow)); g.addColorStop(1, SciSim.color.mix('#cbd5e1', '#fde047', glow));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = SciSim.color.mix('#6b7280', '#f59e0b', glow); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - r * 0.4, y + r * 0.55); ctx.lineTo(x - r * 0.4, y); ctx.lineTo(x - r * 0.2, y - r * 0.2); ctx.lineTo(x, y + r * 0.1); ctx.lineTo(x + r * 0.2, y - r * 0.2); ctx.lineTo(x + r * 0.4, y); ctx.lineTo(x + r * 0.4, y + r * 0.55); ctx.stroke();
    ctx.fillStyle = '#64748b'; rr(x - r * 0.5, y + r * 0.82, r, r * 0.5, 4).fill();
    ctx.restore();
  }
  function battery(x, y, w, h) {
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(x - w / 2, y - h / 2, w, h, 8).fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = '#ef4444'; rr(x - w / 2, y - h / 2, w, h * 0.34, 8).fill(); ctx.fillStyle = '#1e293b'; rr(x - w / 2, y + h * 0.02, w, h * 0.48, 6).fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(x - w / 2, y - h / 2, w, h, 8).stroke();
    ctx.fillStyle = '#94a3b8'; rr(x - w * 0.2, y - h / 2 - 5, w * 0.4, 6, 2).fill();
    D.text(x, y - h * 0.18, '+', { size: 20, color: '#fff', weight: 800 }); D.text(x, y + h * 0.3, '3 V', { size: 15, color: '#fff', weight: 800 });
  }
  function drawBench(t) {
    const T = S.test, G = BG0(), I = curCur(), mid = (G.y0 + G.y1) / 2, gxm = (G.g0 + G.g1) / 2;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 32, '시료를 끼워 전류의 크기를 재 봐요', { size: PHONE ? 15.5 : 19, weight: 800, color: '#7c2d12' });
    // 선
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(G.g0, G.y1); ctx.lineTo(G.x0, G.y1); ctx.lineTo(G.x0, G.y0); ctx.lineTo(G.x1, G.y0); ctx.lineTo(G.x1, G.y1); ctx.lineTo(G.g1, G.y1); ctx.stroke();
    // 전류 점
    const closed = !!T.cur;
    if (closed) {
      const flow = I >= 1e-12, n = 24, a = flow ? clamp(0.5 + 0.5 * (Math.log10(I) + 12) / 12, 0.45, 1) : 0.35;
      for (let k = 0; k < n; k++) { const p = loopPt(k / n + T.dotPh, G); ctx.fillStyle = flow ? 'rgba(245,158,11,' + a + ')' : 'rgba(148,163,184,.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, flow ? 4.4 : 3.2, 0, 6.283); ctx.fill(); if (flow && I > 1e-3) { ctx.fillStyle = 'rgba(253,230,138,.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 6.283); ctx.fill(); } }
    }
    // 전구 · 전지 · 전류계
    battery(G.x0, mid, PHONE ? 34 : 42, PHONE ? 78 : 96);
    const bx = G.x0 + (G.x1 - G.x0) * 0.36;
    bulb(bx, G.y0, G.br, T.glowv);
    D.text(bx, G.y0 + G.br + 26, '전구', { size: 13, color: '#64748b', weight: 800 });
    D.dial(G.x1, mid, G.ar, T.needle, 0, 1, { label: 'A', color: '#e2464b', ticks: 2 });
    D.text(G.x1, mid - G.ar - 20, '전류계', { size: 13, color: '#64748b', weight: 800 });
    // 시료 칸
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(G.g0, G.y1, 8, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(G.g1, G.y1, 8, 0, 6.283); ctx.fill();
    D.sphere(G.g0, G.y1, 7, '#94a3b8', { gloss: false }); D.sphere(G.g1, G.y1, 7, '#94a3b8', { gloss: false });
    const sw = G.g1 - G.g0 - 14;
    if (T.cur) {
      const pl = T.place, drop = (1 - pl) * -26;
      ctx.save(); ctx.translate(0, drop); ctx.globalAlpha = clamp(pl * 3, 0, 1);
      sample(T.cur, gxm, G.y1, sw, PHONE ? 30 : 36, t); ctx.restore();
      D.text(gxm, G.y1 + 34, MID[T.cur].name, { size: 15, weight: 800, color: '#7c2d12' });
    } else {
      ctx.save(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); rr(G.g0 + 10, G.y1 - 20, sw, 40, 10).stroke(); ctx.restore();
      D.text(gxm, G.y1 + 5, '시료 칸 (비어 있음)', { size: 13.5, color: '#b45309', weight: 800 });
      D.text(gxm, G.y1 + 34, '회로가 끊겨 있어서 전류가 흐르지 않아요', { size: 12.5, color: '#94a3b8', weight: 700 });
      if (S.drag) D.ring(gxm, G.y1, 60, t, { color: '#f59e0b', speed: 1, width: 3 });
    }
    // 읽기
    const rx = G.x1, ry = mid + G.ar + 26;
    const txt = !T.cur ? '전류 0 A' : I >= 1e-12 ? 'I = ' + sci(I) : 'I < 10' + sup(-12) + ' A  (측정 한계 이하)';
    D.label(PHONE ? VW - 130 : rx - 40, ry, txt, { bg: !T.cur ? '#94a3b8' : I >= 1e-3 ? '#16a34a' : I >= 1e-12 ? '#d97706' : '#64748b', size: PHONE ? 12 : 14 });
    // 시료 선반
    const top = PHONE ? 312 : 352;
    D.text(PHONE ? 14 : 24, top + 6, '🧪 시료 10가지 (모두 같은 모양 · 같은 크기)', { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#7c2d12', align: 'left' });
    for (let i = 0; i < 10; i++) {
      const m = MAT[i], q = rackPos(i), on = T.cur === m.id, done = T.meas[m.id], hv = S.hover === m.id;
      const dragging = S.drag && S.drag.id === m.id;
      ctx.save(); ctx.globalAlpha = dragging ? 0.45 : 1;
      D.shadow(() => { ctx.fillStyle = on ? '#fff7ed' : '#fff'; rr(q.x - q.w / 2, q.y - q.h / 2 - (hv ? 2 : 0), q.w, q.h, 12).fill(); }, { blur: hv ? 9 : 5, y: 2 });
      ctx.strokeStyle = on ? '#f26b3a' : done ? '#16a34a' : '#e2d6c8'; ctx.lineWidth = on ? 3 : 2; rr(q.x - q.w / 2, q.y - q.h / 2 - (hv ? 2 : 0), q.w, q.h, 12).stroke();
      if (!PHONE) { sample(m.id, q.x, q.y - 14, 100, 20, null); D.text(q.x, q.y + 14, m.name, { size: 13.5, weight: 800, color: '#1b2333' }); D.text(q.x, q.y + 29, done ? sci(m.I >= 1e-12 ? m.I : 0).replace('0 A', '< 10⁻¹² A') : '아직 안 재 봤어요', { size: 11.5, weight: 700, color: done ? '#15803d' : '#94a3b8' }); }
      else { sample(m.id, q.x - q.w / 2 + 52, q.y, 78, 20, null); D.text(q.x - q.w / 2 + 100, q.y - 4, m.name, { size: 13.5, weight: 800, color: '#1b2333', align: 'left' }); D.text(q.x - q.w / 2 + 100, q.y + 15, done ? (m.I >= 1e-12 ? sci(m.I) : '< 10⁻¹² A') : '아직 안 재 봤어요', { size: 11.5, weight: 700, color: done ? '#15803d' : '#94a3b8', align: 'left' }); }
      if (done) D.text(q.x + q.w / 2 - 12, q.y - q.h / 2 + 16, '✓', { size: 14, weight: 800, color: '#16a34a' });
      ctx.restore();
    }
    D.text(VW / 2, VH - 8, T.cur ? '전류계 바늘과 값(A)을 읽고 다른 시료로 바꿔 봐요' : '👆 시료 카드를 누르거나 위 시료 칸으로 끌어다 놓아요', { size: PHONE ? 12 : 13.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     화면 ①-b: 전류 크기로 분류하기
     ====================================================== */
  const CHW = PHONE ? 116 : 116, CHH = 44;
  function sortGeo() {
    if (!PHONE) return { poolY: 92, cols: 5, px: (VW - 5 * 124) / 2 + 62, bins: [0, 1, 2].map((i) => ({ x: 14 + i * 262, y: 216, w: 252, h: 310 })) };
    return { poolY: 92, cols: 4, px: (VW - 4 * 126) / 2 + 63, bins: [0, 1, 2].map((i) => ({ x: 8 + i * 170, y: 272, w: 164, h: 340 })) };
  }
  function poolPos(i) { const G = sortGeo(); return { x: G.px + (i % G.cols) * (PHONE ? 126 : 124), y: G.poolY + Math.floor(i / G.cols) * 52 }; }
  function binPos(b, k) { const G = sortGeo().bins[b]; if (PHONE) return { x: G.x + G.w / 2, y: G.y + 78 + k * 50 }; return { x: G.x + 66 + (k % 2) * 122, y: G.y + 84 + Math.floor(k / 2) * 52 }; }
  function initChips() {
    const T = S.test; T.chips = MAT.map((m, i) => { const p = poolPos(i); return { id: m.id, x: p.x, y: p.y, tx: p.x, ty: p.y, bin: -1, lift: 0, bad: false, shake: 0 }; });
    T.sorted = false;
  }
  function layoutChips() {
    const T = S.test, cnt = [0, 0, 0];
    T.chips.forEach((c) => { if (c.bin < 0) { const q = poolPos(MAT.findIndex((m) => m.id === c.id)); c.tx = q.x; c.ty = q.y; } });
    T.chips.forEach((c) => { if (c.bin >= 0) { const p = binPos(c.bin, cnt[c.bin]++); c.tx = p.x; c.ty = p.y; } });
  }
  function chipDrop(c, p) {
    const G = sortGeo(); let b = -1;
    G.bins.forEach((bb, i) => { if (p.x >= bb.x && p.x <= bb.x + bb.w && p.y >= bb.y && p.y <= bb.y + bb.h) b = i; });
    if (b >= 0) { c.bin = b; Sound.tick(); c.bad = false; } else c.bin = -1;
    SciSim.tween(c, { lift: 0 }, { duration: 0.15 });
    layoutChips(); updateCtl();
  }
  function stepSort(dt) {
    S.test.chips.forEach((c) => {
      if (c.free) return;
      if (RM) { c.x = c.tx; c.y = c.ty; } else { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); }
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
    });
  }
  function drawSort(t) {
    const T = S.test, G = sortGeo();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 30, '전류의 크기를 보고 3칸으로 나눠요', { size: PHONE ? 15 : 19, weight: 800, color: '#7c2d12' });
    D.text(VW / 2, 56, '칩에 적힌 전류 값(A)을 읽고 알맞은 칸으로 끌어다 놓아요', { size: PHONE ? 12 : 13.5, weight: 700, color: '#64748b' });
    G.bins.forEach((b, i) => {
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(b.x, b.y, b.w, b.h, 16).fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = TIER_COL[i]; ctx.lineWidth = 3; rr(b.x, b.y, b.w, b.h, 16).stroke();
      ctx.fillStyle = TIER_COL[i]; rr(b.x, b.y, b.w, 40, 16).fill(); ctx.fillRect(b.x, b.y + 20, b.w, 20);
      D.text(b.x + b.w / 2, b.y + 26, TIER_NAME[i], { size: PHONE ? 13 : 15, weight: 800, color: '#fff' });
      const hint = ['≥ 10⁻³ A', '10⁻¹² A ~ 10⁻³ A', '< 10⁻¹² A'][i];
      D.text(b.x + b.w / 2, b.y + b.h - 12, hint, { size: 12, weight: 700, color: '#94a3b8' });
    });
    T.chips.forEach((c) => {
      if (S.drag && S.drag.chip === c) return;
      drawChip(c, t);
    });
    if (S.drag && S.drag.chip) drawChip(S.drag.chip, t);
    const left = T.chips.filter((c) => c.bin < 0).length;
    if (left === 10) D.text(VW / 2, 190, '👇 시료 칩을 끌어다 놓아요 (위 칸에서 아래 칸으로)', { size: PHONE ? 12 : 13.5, weight: 700, color: '#64748b' });
  }
  function drawChip(c, t) {
    const m = MID[c.id], lift = c.lift || 0, sh = c.shake > 0 ? Math.sin(c.shake * 50) * 5 : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(1 + lift * 0.08, 1 + lift * 0.08);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(-CHW / 2, -CHH / 2, CHW, CHH, 10).fill(); }, { blur: 5 + lift * 8, y: 2 + lift * 4 });
    ctx.strokeStyle = c.bad ? '#e2464b' : c.bin >= 0 ? TIER_COL[c.bin] : '#e2d6c8'; ctx.lineWidth = c.bad ? 3.5 : 2; rr(-CHW / 2, -CHH / 2, CHW, CHH, 10).stroke();
    sample(c.id, -CHW / 2 + 18, 0, 26, 12, null);
    D.text(-CHW / 2 + 36, -3, m.short || m.name, { size: 12.5, weight: 800, color: '#1b2333', align: 'left' });
    D.text(-CHW / 2 + 36, 13, S.test.meas[c.id] || game && game.free ? (m.I >= 1e-12 ? sci(m.I) : '< 10⁻¹² A') : '?', { size: 11, weight: 700, color: '#475569', align: 'left' });
    ctx.restore();
  }
  function sortCheck() {
    const T = S.test, un = T.chips.filter((c) => c.bin < 0);
    if (un.length) return '아직 칸에 놓지 않은 시료가 <b>' + un.length + '개</b> 있어요.';
    const bad = T.chips.filter((c) => c.bin !== MID[c.id].tier);
    T.chips.forEach((c) => { const isBad = bad.includes(c); if (isBad && !c.bad) c.shake = 0.5; c.bad = isBad; });
    if (bad.length) return bad.map((c) => '<b>' + (MID[c.id].short || MID[c.id].name) + '</b>').join(', ') + '의 전류 값을 다시 읽어 보세요.';
    T.sorted = true; return true;
  }

  /* ======================================================
     화면 ②: 입자 모형 (자유전자)
     ====================================================== */
  const DEFN = { cu: 36, gl: 0, si: 2 };
  const MATNAME = { cu: '구리', gl: '유리', si: '규소' };
  const KIND = { cu: '도체', gl: '부도체', si: '반도체' };
  const WIN = () => (PHONE ? { x: 28, y: 66, w: 464, h: 330, cols: 5, rows: 4 } : { x: 56, y: 72, w: 688, h: 280, cols: 8, rows: 3 });
  function atomPos(i) { const W = WIN(), c = i % W.cols, r = Math.floor(i / W.cols); return { x: W.x + (c + 0.5) * W.w / W.cols, y: W.y + (r + 0.5) * W.h / W.rows }; }
  function syncElectrons() {
    const M = S.model, W = WIN();
    while (M.e.length < M.n) M.e.push({ x: W.x + rand() * W.w, y: W.y + 14 + rand() * (W.h - 28), vx: 0, vy: 0, a: 0 });
    while (M.e.length > M.n) M.e.pop();
  }
  function setMat(id) {
    const M = S.model; M.mat = id; M.n = DEFN[id]; M.custom = false; M.e = []; syncElectrons(); M.seen[id] = true; Sound.click();
    $('#sN').value = M.n; updateSlider(); updateCtl();
  }
  function updateSlider() { const s = $('#sN'); s.style.setProperty('--pct', (+s.value / 40 * 100) + '%'); $('#oN').textContent = S.model.n + '개'; }
  function stepModel(dt) {
    const M = S.model, W = WIN(), vd = M.volt ? 78 : 0;
    M.phase += dt;
    if (M.volt) M.t[M.mat] += dt;
    M.e.forEach((e) => {
      e.vx = SciSim.approach(e.vx, vd + (rand() - 0.5) * 120, dt, 6); e.vy = SciSim.approach(e.vy, (rand() - 0.5) * 120, dt, 6);
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x > W.x + W.w - 6) { e.x = W.x + 6; } if (e.x < W.x + 6) { e.x = W.x + W.w - 6; }
      if (e.y < W.y + 10) { e.y = W.y + 10; e.vy = Math.abs(e.vy); } if (e.y > W.y + W.h - 10) { e.y = W.y + W.h - 10; e.vy = -Math.abs(e.vy); }
    });
  }
  function drawModel(t) {
    const M = S.model, W = WIN(), mat = M.mat, n = M.n;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.sub === 'cls') { drawCls(t); return; }
    D.text(VW / 2, 28, '🔍 입자 모형으로 본 ' + MATNAME[mat] + ' (' + (M.custom ? '자유전자 수를 바꾼 물질' : KIND[mat]) + ')', { size: PHONE ? 14.5 : 18, weight: 800, color: '#7c2d12' });
    // 창
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(W.x - 14, W.y - 6, W.w + 28, W.h + 12, 16).fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = '#dbeafe'; rr(W.x - 14, W.y - 6, 18, W.h + 12, 10).fill(); ctx.fillStyle = '#fee2e2'; rr(W.x + W.w - 4, W.y - 6, 18, W.h + 12, 10).fill();
    D.text(W.x - 5, W.y + W.h / 2 + 6, '−', { size: 22, weight: 800, color: '#2563eb' }); D.text(W.x + W.w + 5, W.y + W.h / 2 + 6, '+', { size: 22, weight: 800, color: '#dc2626' });
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; rr(W.x - 14, W.y - 6, W.w + 28, W.h + 12, 16).stroke();
    // 원자
    const tot = W.cols * W.rows, shift = M.volt && mat !== 'cu' ? 4 : 0;
    for (let i = 0; i < tot; i++) {
      const p = atomPos(i), jx = Math.sin(t * 5 + i * 1.7) * 1.2, jy = Math.cos(t * 4.3 + i * 2.1) * 1.2;
      if (mat === 'cu') { D.sphere(p.x + jx, p.y + jy, 18, '#f0a45d', { shadow: true }); D.text(p.x + jx, p.y + jy + 6, '+', { size: 20, weight: 800, color: '#7c2d12' }); }
      else {
        const col = mat === 'gl' ? '#93c5fd' : '#94a3b8';
        D.sphere(p.x + jx, p.y + jy, 15, col, { shadow: true });
        // 묶인 전자 (원자에 단단히 붙어 맴돌아요)
        const bound = i < tot - (mat === 'si' ? 0 : 0);
        const a = t * 3.4 + i * 1.3;
        ctx.fillStyle = 'rgba(59,130,246,.15)'; ctx.beginPath(); ctx.arc(p.x + shift, p.y, 27, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(59,130,246,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x + shift, p.y, 27, 0, 6.283); ctx.stroke();
        D.sphere(p.x + shift + Math.cos(a) * 27, p.y + Math.sin(a) * 27, 5.5, '#3b82f6', { shadow: false, gloss: false });
      }
    }
    // 자유전자
    M.e.forEach((e) => { D.glow(e.x, e.y, 13, '#60a5fa', 0.5); D.sphere(e.x, e.y, 6, '#2563eb', { shadow: false }); });
    // 설명 라벨
    const msg = mat === 'cu' ? '원자에서 떨어져 나온 자유전자가 이온 사이를 자유롭게 움직여요' : mat === 'gl' ? '전자가 모두 원자에 단단히 묶여 있어서 이동하지 못해요' : '자유전자가 아주 조금뿐이에요';
    const aby = W.y + W.h + 24;
    D.label(VW / 2, aby + 32, msg, { bg: '#7c2d12', size: PHONE ? 12 : 14 });
    // 전류 표시
    const by = aby + (PHONE ? 80 : 78), bw = PHONE ? 340 : 480, bx = VW / 2 - bw / 2;
    const frac = M.volt ? clamp(n / 40, 0, 1) : 0;
    D.text(bx - 8, by + 6, '전류', { size: 14, weight: 800, color: '#475569', align: 'right' });
    ctx.fillStyle = '#e8e2d8'; rr(bx, by - 8, bw, 22, 11).fill();
    if (frac > 0) { const gg = ctx.createLinearGradient(bx, 0, bx + bw, 0); gg.addColorStop(0, '#fde68a'); gg.addColorStop(1, '#f26b3a'); ctx.fillStyle = gg; rr(bx, by - 8, Math.max(22, bw * frac), 22, 11).fill(); }
    D.text(bx + bw + 8, by + 8, M.volt ? (n === 0 ? '0 (흐르지 않음)' : n <= 4 ? '아주 조금' : '많이') : '전압 꺼짐', { size: 13, weight: 800, color: '#475569', align: 'left' });
    // 전압 · 방향 화살표 (전자는 −극 → +극, 전류 방향은 반대)
    if (M.volt) {
      D.arrow(W.x + 20, W.y - 24, W.x + 130, W.y - 24, { color: '#2563eb', width: 3, head: 12 });
      D.text(W.x + 140, W.y - 19, '전자의 이동 (−극 → +극)', { size: PHONE ? 11 : 12.5, weight: 800, color: '#2563eb', align: 'left' });
      D.arrow(W.x + W.w - 20, aby - 4, W.x + W.w - 130, aby - 4, { color: '#dc2626', width: 3, head: 12 });
      D.text(W.x + W.w - 140, aby + 1, '전류의 방향 (+극 → −극)', { size: PHONE ? 11 : 12.5, weight: 800, color: '#dc2626', align: 'right' });
    }
    // 범례
    D.text(VW / 2, VH - 12, mat === 'cu' ? '● 파란 구슬 : 자유전자(−)    ◉ 금색 : 원자가 전자를 내놓은 이온(+)' : '● 파란 구슬 : 전자(−)    ◉ 회색 : 원자 — 고리 위의 전자는 원자에 묶여 있어요', { size: PHONE ? 10.5 : 12.5, weight: 700, color: '#64748b' });
  }
  function drawCls(t) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 30, '세 물질을 전기적 성질로 구분해요', { size: PHONE ? 15 : 19, weight: 800, color: '#7c2d12' });
    const ids = ['cu', 'gl', 'si'], cw = PHONE ? 160 : 230, gap = PHONE ? 8 : 18, x0 = (VW - 3 * cw - 2 * gap) / 2;
    ids.forEach((id, i) => {
      const x = x0 + i * (cw + gap), y = PHONE ? 70 : 76, h = PHONE ? 360 : 340, bad = S.model.clsBad[i];
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, cw, h, 16).fill(); }, { blur: 7, y: 3 });
      ctx.strokeStyle = S.model.clsOK ? '#16a34a' : bad ? '#e2464b' : '#e2d6c8'; ctx.lineWidth = 3; rr(x, y, cw, h, 16).stroke();
      sample(id, x + cw / 2, y + 50, cw - 50, 40, t);
      D.text(x + cw / 2, y + 112, MATNAME[id], { size: 20, weight: 800, color: '#1b2333' });
      D.text(x + cw / 2, y + 150, '자유전자 수 (모형)', { size: 12.5, weight: 700, color: '#64748b' });
      D.text(x + cw / 2, y + 186, DEFN[id] + '개', { size: 30, weight: 800, color: '#2563eb' });
      for (let k = 0; k < 8; k++) { const n = Math.min(DEFN[id], 36), cc = k < Math.ceil(n / 4.5) ? '#2563eb' : '#dbeafe'; D.sphere(x + cw / 2 - 49 + k * 14, y + 212, 5, cc, { shadow: false, gloss: false }); }
      D.text(x + cw / 2, y + 252, '전류 (전압을 걸 때)', { size: 12.5, weight: 700, color: '#64748b' });
      D.text(x + cw / 2, y + 282, DEFN[id] > 20 ? '많이 흘러요' : DEFN[id] === 0 ? '흐르지 않아요' : '아주 조금', { size: 16, weight: 800, color: '#7c2d12' });
      if (S.model.clsOK) D.label(x + cw / 2, y + h - 28, KIND[id], { bg: '#16a34a', size: 15 });
    });
  }

  /* ======================================================
     화면 ③: 반도체 제어 (불순물 · 온도 · 빛)
     ====================================================== */
  const DLV = [0, 1e-10, 1e-9, 1e-8, 1e-7];     // 불순물 원자 비율 (규소 원자 1개당)
  const DNAME = ['없음 (순수한 규소)', '100억 개 중 1개', '10억 개 중 1개', '1억 개 중 1개', '천만 개 중 1개'];
  const SW = () => (PHONE ? { x: 20, y: 62, w: 480, h: 306, cols: 6, rows: 4 } : { x: 36, y: 64, w: 500, h: 360, cols: 6, rows: 4 });
  function siPos(i) { const W = SW(), c = i % W.cols, r = Math.floor(i / W.cols); return { x: W.x + (c + 0.5) * W.w / W.cols, y: W.y + (r + 0.5) * W.h / W.rows }; }
  const IMP = [9, 14, 4, 19, 7];
  function semiRel() {
    const E = S.semi;
    const ni = Math.pow(2, (E.T - 20) / 10), nd = DLV[E.d] * 5e22 / 1.5e10, np = E.L / 100 * 300;
    return ni + nd + np;
  }
  function syncSemi() {
    const E = S.semi, W = SW(); E.rel = semiRel();
    // 자유전자 수는 전류 배율(로그)에 맞추고, 초록(불순물이 내놓은 전자)과 파랑(열·빛으로 생긴 전자)은 실제 기여 비율대로 나눠요
    const total = clamp(Math.round(1 + 3 * Math.log10(E.rel)), 1, 36), n = total;
    const nd = DLV[E.d] * 5e22 / 1.5e10, green = nd > 0 ? clamp(Math.round(total * nd / E.rel), 1, total) : 0;
    while (E.e.length < n) E.e.push({ x: W.x + 10 + rand() * (W.w - 20), y: W.y + 10 + rand() * (W.h - 20), vx: 0, vy: 0, imp: false });
    while (E.e.length > n) E.e.pop();
    E.e.forEach((e, i) => { e.imp = i < green; });
    // 기준 : 불순물 · 빛
    if (E.d >= 1 && E.rel >= 100 && E.T <= 40 && E.L <= 10) E.doped100 = true;
    if (E.d === 0 && E.rel >= 10 && (E.T > 20 || E.L > 0)) E.env10 = true;
  }
  function relText(r) {
    if (r < 10) return r.toFixed(1);
    if (r < 1e5) return comma(r);
    const e = Math.floor(Math.log10(r)); return (r / Math.pow(10, e)).toFixed(1) + '×10' + sup(e);
  }
  function stepSemi(dt) {
    const E = S.semi, W = SW();
    E.relv = RM ? E.rel : Math.pow(10, SciSim.approach(Math.log10(E.relv), Math.log10(E.rel), dt, 5));
    const hot = (E.T - 20) / 100;
    E.e.forEach((e) => {
      e.vx = SciSim.approach(e.vx, 46 + (rand() - 0.5) * (80 + hot * 160), dt, 6); e.vy = SciSim.approach(e.vy, (rand() - 0.5) * (80 + hot * 160), dt, 6);
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x > W.x + W.w - 8) e.x = W.x + 8; if (e.x < W.x + 8) e.x = W.x + W.w - 8;
      if (e.y < W.y + 8) { e.y = W.y + 8; e.vy = Math.abs(e.vy); } if (e.y > W.y + W.h - 8) { e.y = W.y + W.h - 8; e.vy = -Math.abs(e.vy); }
    });
    // 광자
    const nph = Math.round(E.L / 100 * 7);
    while (E.ph.length < nph) E.ph.push({ x: W.x + rand() * W.w, y: W.y - 20 - rand() * 60 });
    while (E.ph.length > nph) E.ph.pop();
    E.ph.forEach((p) => { p.x += 70 * dt * 0.35; p.y += 130 * dt; if (p.y > W.y + W.h - 20) { p.y = W.y - 10; p.x = W.x + rand() * W.w; } });
  }
  function drawSemi(t) {
    const E = S.semi, W = SW(), hot = clamp((E.T - 20) / 100, 0, 1);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(PHONE ? VW / 2 : W.x + W.w / 2, 30, '🔍 규소 결정 속 (아주 크게 확대한 모형)', { size: PHONE ? 14 : 16.5, weight: 800, color: '#7c2d12' });
    D.shadow(() => { ctx.fillStyle = SciSim.color.mix('#ffffff', '#fee2e2', hot * 0.9); rr(W.x - 6, W.y - 6, W.w + 12, W.h + 12, 16).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = SciSim.color.mix('#e2e8f0', '#ef4444', hot); ctx.lineWidth = 2 + hot * 2; rr(W.x - 6, W.y - 6, W.w + 12, W.h + 12, 16).stroke();
    // 결합선
    const tot = W.cols * W.rows; ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 3;
    for (let i = 0; i < tot; i++) { const p = siPos(i); if ((i % W.cols) < W.cols - 1) { const q = siPos(i + 1); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } if (i + W.cols < tot) { const q = siPos(i + W.cols); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } }
    // 원자 (진동은 온도에 따라 커져요)
    const amp = 0.8 + hot * 4.5;
    for (let i = 0; i < tot; i++) {
      const p = siPos(i), imp = IMP.slice(0, E.d).indexOf(i) >= 0, jx = Math.sin(t * 9 + i * 1.7) * amp, jy = Math.cos(t * 8 + i * 2.3) * amp;
      if (imp) { D.glow(p.x, p.y, 36, '#f59e0b', 0.45); D.sphere(p.x + jx, p.y + jy, 19, '#f59e0b', { shadow: true, text: '인', textColor: '#fff' }); }
      else D.sphere(p.x + jx, p.y + jy, 17, '#7c8ea8', { shadow: true, text: 'Si', textColor: '#fff', textScale: 0.85 });
    }
    // 빛
    E.ph.forEach((p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(0.35); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill(); ctx.restore(); });
    if (E.L > 0) { D.text(W.x + W.w - 8, W.y + 20, '☀ 빛', { size: 14, weight: 800, color: '#ca8a04', align: 'right' }); }
    // 자유전자
    E.e.forEach((e) => { if (e.imp) D.glow(e.x, e.y, 20, '#22c55e', 0.7); else D.glow(e.x, e.y, 13, '#60a5fa', 0.5); D.sphere(e.x, e.y, 6.5, e.imp ? '#16a34a' : '#2563eb', { shadow: false }); });
    // 불순물 비율 안내
    D.label(W.x + W.w / 2, W.y + W.h + 26, E.d ? '불순물(인): ' + DNAME[E.d] + ' (그림은 크게 과장했어요)' : '순수한 규소 : 자유전자가 거의 없어요', { bg: '#7c2d12', size: PHONE ? 11.5 : 13.5 });
    // 오른쪽 계기
    const mx = PHONE ? 20 : W.x + W.w + 36, my = PHONE ? W.y + W.h + 56 : 70, mw = PHONE ? 480 : 188;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(mx, my, mw, PHONE ? 176 : 354, 16).fill(); }, { blur: 7, y: 3 });
    ctx.strokeStyle = '#e2d6c8'; ctx.lineWidth = 2; rr(mx, my, mw, PHONE ? 176 : 354, 16).stroke();
    D.text(mx + mw / 2, my + 26, '전류의 크기', { size: 14, weight: 800, color: '#475569' }); D.text(mx + mw / 2, my + 44, '(순수 규소 20 °C = 1)', { size: 11.5, weight: 700, color: '#94a3b8' });
    const big = relText(E.relv);
    D.text(mx + mw / 2, my + (PHONE ? 90 : 84), '×' + big, { size: big.length > 9 ? 22 : PHONE ? 32 : 34, weight: 800, color: E.rel >= 100 ? '#16a34a' : '#f26b3a' });
    D.text(mx + mw / 2, my + (PHONE ? 114 : 112), E.rel >= 1e4 ? '(수만 배 이상!)' : E.rel >= 100 ? '(100배 이상)' : E.rel >= 10 ? '(10배 이상)' : '', { size: 13, weight: 800, color: '#15803d' });
    // 로그 막대
    const lx = mx + 24, lw = mw - 48, ly = my + (PHONE ? 130 : 140), lg = clamp(Math.log10(E.relv) / 7, 0, 1);
    ctx.fillStyle = '#e8e2d8'; rr(lx, ly, lw, 16, 8).fill();
    const gg = ctx.createLinearGradient(lx, 0, lx + lw, 0); gg.addColorStop(0, '#fde68a'); gg.addColorStop(1, '#ef4444'); ctx.fillStyle = gg; rr(lx, ly, Math.max(16, lw * lg), 16, 8).fill();
    ['1', '10²', '10⁴', '10⁶'].forEach((s, i) => D.text(lx + lw * (i * 2 / 7), ly + 32, s, { size: 11.5, weight: 700, color: '#94a3b8' }));
    if (!PHONE) {
      D.text(mx + mw / 2, my + 214, '자유전자(개)', { size: 12.5, weight: 800, color: '#475569' });
      D.text(mx + mw / 2, my + 248, E.e.length + '개', { size: 28, weight: 800, color: '#2563eb' });
      D.text(mx + mw / 2, my + 282, '파랑: 열·빛으로 생긴 전자', { size: 11.5, weight: 700, color: '#2563eb' });
      D.text(mx + mw / 2, my + 302, '초록: 불순물이 내놓은 전자', { size: 11.5, weight: 700, color: '#16a34a' });
      D.text(mx + mw / 2, my + 332, '→ 전류를 쉽게 조절!', { size: 13.5, weight: 800, color: '#7c2d12' });
    }
  }

  /* ======================================================
     화면 ④-a: 부품에 알맞은 소재 고르기
     ====================================================== */
  const PARTS = [
    { id: 'wire', name: '전선', need: '전류가 잘 흐르게 해요', ok: ['cu'] },
    { id: 'sheath', name: '전선 피복', need: '전류가 새지 않게 막아요', ok: ['rb', 'pl'] },
    { id: 'chip', name: '스마트폰 칩', need: '전류를 켜고 끄는 스위치', ok: ['si'] },
    { id: 'glove', name: '전기 안전 장갑', need: '전기가 몸에 안 흐르게 막아요', ok: ['rb'] },
  ];
  const TOKENS = ['cu', 'fe', 'rb', 'pl', 'si', 'gl'];
  const PCOL = { cu: '#d2733f', fe: '#64748b', rb: '#334155', pl: '#60a5fa', si: '#475569', gl: '#7dd3fc' };
  function partRect(i) { return PHONE ? { x: 10 + (i % 2) * 254, y: 56 + Math.floor(i / 2) * 216, w: 246, h: 204 } : { x: 14 + i * 196, y: 58, w: 188, h: 252 }; }
  function slotRect(i) { const p = partRect(i); return { x: p.x + 14, y: p.y + p.h - 62, w: p.w - 28, h: 50 }; }
  function tokRect(i) { return PHONE ? { x: 12 + (i % 3) * 168, y: 526 + Math.floor(i / 3) * 78, w: 160, h: 68 } : { x: 36 + i * 124, y: 398, w: 116, h: 70 }; }
  function partIcon(id, cx, cy, sc) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.lineCap = 'round';
    if (id === 'wire') { D.sphere(0, 0, 26, '#f0a45d', { shadow: true }); ctx.strokeStyle = '#8c3f1d'; ctx.lineWidth = 1.5; for (let k = 0; k < 6; k++) { const a = k * 1.047; ctx.beginPath(); ctx.arc(Math.cos(a) * 11, Math.sin(a) * 11, 8, 0, 6.3); ctx.stroke(); } ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(0, 0, 32, 0, 6.3); ctx.stroke(); }
    else if (id === 'sheath') { ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#f0a45d'; ctx.beginPath(); ctx.arc(0, 0, 21, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(0, 0, 28, 0, 6.3); ctx.stroke(); }
    else if (id === 'chip') { D.shadow(() => { ctx.fillStyle = '#1f2937'; rr(-34, -34, 68, 68, 8).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 12, -34); ctx.lineTo(k * 12, -42); ctx.moveTo(k * 12, 34); ctx.lineTo(k * 12, 42); ctx.moveTo(-34, k * 12); ctx.lineTo(-42, k * 12); ctx.moveTo(34, k * 12); ctx.lineTo(42, k * 12); ctx.stroke(); } ctx.fillStyle = '#475569'; rr(-20, -20, 40, 40, 5).fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-14, k * 10); ctx.lineTo(14, k * 10); ctx.moveTo(k * 10, -14); ctx.lineTo(k * 10, 14); ctx.stroke(); } }
    else { ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-24, 34); ctx.lineTo(-30, -2); ctx.quadraticCurveTo(-32, -14, -22, -10); ctx.lineTo(-20, 4); ctx.lineTo(-20, -30); ctx.quadraticCurveTo(-18, -38, -12, -30); ctx.lineTo(-10, -4); ctx.lineTo(-8, -38); ctx.quadraticCurveTo(-2, -44, 2, -36); ctx.lineTo(4, -4); ctx.lineTo(8, -34); ctx.quadraticCurveTo(14, -38, 16, -30); ctx.lineTo(16, 0); ctx.lineTo(22, -20); ctx.quadraticCurveTo(30, -22, 28, -12); ctx.lineTo(24, 34); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#92400e'; rr(-26, 28, 52, 12, 4).fill(); }
    ctx.restore();
  }
  function tokenDraw(id, x, y, w, h, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha = o.alpha; if (o.scale) ctx.scale(o.scale, o.scale);
    D.shadow(() => { ctx.fillStyle = o.sel ? '#fff7ed' : '#fff'; rr(-w / 2, -h / 2, w, h, 12).fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = o.sel ? '#f26b3a' : '#e2d6c8'; ctx.lineWidth = o.sel ? 3.5 : 2; rr(-w / 2, -h / 2, w, h, 12).stroke();
    if (id === 'gl' || id === 'pl' || id === 'rb' || id === 'si' || id === 'cu' || id === 'fe') sample(id, 0, -h * 0.16, w * 0.62, h * 0.28, null);
    D.text(0, h * 0.34, MID[id] ? MID[id].name.replace('(흑연)', '') : id, { size: 14.5, weight: 800, color: '#1b2333' });
    ctx.restore();
  }
  function drawParts(t) {
    const A = S.apply;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 32, '부품마다 알맞은 소재를 골라 넣어요', { size: PHONE ? 15 : 19, weight: 800, color: '#7c2d12' });
    PARTS.forEach((p, i) => {
      const r = partRect(i), s = slotRect(i), tok = A.slots[i], bad = A.bad[i];
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 16).fill(); }, { blur: 7, y: 3 });
      ctx.strokeStyle = A.partsOK ? '#16a34a' : bad ? '#e2464b' : '#e2d6c8'; ctx.lineWidth = 3; rr(r.x, r.y, r.w, r.h, 16).stroke();
      partIcon(p.id, r.x + r.w / 2, r.y + (PHONE ? 52 : 66), PHONE ? 0.85 : 1);
      D.text(r.x + r.w / 2, r.y + (PHONE ? 112 : 132), p.name, { size: PHONE ? 15.5 : 17, weight: 800, color: '#1b2333' });
      D.text(r.x + r.w / 2, r.y + (PHONE ? 132 : 154), p.need, { size: PHONE ? 11.5 : 12.5, weight: 700, color: '#64748b' });
      const hot = A.sel && !tok;
      ctx.save(); ctx.strokeStyle = bad ? '#e2464b' : hot ? '#f26b3a' : '#cbbfae'; ctx.lineWidth = hot ? 3 : 2.2; ctx.setLineDash(tok ? [] : [6, 5]); rr(s.x, s.y, s.w, s.h, 10).stroke(); ctx.restore();
      if (tok) { const sh = A.shake && A.shake[i] > 0 ? Math.sin(A.shake[i] * 50) * 4 : 0; tokenDraw(tok, s.x + s.w / 2 + sh, s.y + s.h / 2, s.w - 4, s.h - 4, { scale: 1 }); }
      else D.text(s.x + s.w / 2, s.y + s.h / 2 + 5, '재료를 여기에', { size: 13, weight: 800, color: '#b9a99a' });
      if (S.drag && S.drag.kind === 'tok' && S.drag.over === i) D.ring(s.x + s.w / 2, s.y + s.h / 2, s.h * 0.9, t, { color: '#f26b3a', speed: 1.3, width: 3 });
    });
    // 재료 트레이
    const ty = PHONE ? 508 : 372;
    D.text(PHONE ? 14 : 28, ty + (PHONE ? 6 : 0), '🧰 재료 (눌러서 고르거나 끌어다 놓아요)', { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#7c2d12', align: 'left' });
    TOKENS.forEach((id, i) => { const q = tokRect(i); tokenDraw(id, q.x + q.w / 2, q.y + q.h / 2, q.w, q.h, { sel: A.sel === id, alpha: S.drag && S.drag.id === id ? 0.45 : 1 }); });
    if (A.msgT > 0) wrapMsg(A.msg, VW / 2, PHONE ? 482 : 496, A.partsOK ? '#15803d' : '#b91c1c');
    else D.text(VW / 2, PHONE ? 482 : 502, A.partsOK ? '✅ 모두 알맞게 골랐어요!' : '', { size: 14, weight: 800, color: '#15803d' });
  }
  function wrapMsg(str, cx, y, bg) {
    const plain = str.replace(/<[^>]+>/g, '');
    ctx.save(); ctx.font = D.font(PHONE ? 12 : 13.5, 800);
    const maxW = VW - 40, words = plain.split(' '), lines = []; let line = '';
    words.forEach((w) => { const tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > maxW && line) { lines.push(line); line = w; } else line = tt; });
    lines.push(line); ctx.restore();
    lines.forEach((l, i) => D.label(cx, y + i * (PHONE ? 30 : 32), l, { bg, size: PHONE ? 12 : 13.5 }));
  }
  function partsCheck() {
    const A = S.apply, un = A.slots.filter((s) => !s).length;
    if (un) return '아직 소재를 넣지 않은 부품이 <b>' + un + '개</b> 있어요.';
    const msgs = []; const bad = [false, false, false, false];
    A.slots.forEach((tok, i) => {
      const P = PARTS[i];
      if (!P.ok.includes(tok)) {
        bad[i] = true;
        const why = {
          wire: { fe: '철도 전기가 통하지만 구리보다 비저항(1×10⁻⁷ Ω·m)이 커서 전류가 덜 흘러요. 전선에는 비저항이 더 작은 구리를 써요.', rb: '고무는 부도체라서 전류가 흐르지 못해요. 전선은 전류가 잘 흐르는 도체여야 해요.', pl: '플라스틱은 부도체라서 전류가 흐르지 못해요.', si: '규소는 반도체라서 전선으로 쓰기에는 전류가 너무 조금 흘러요.', gl: '유리는 부도체예요. 전선은 전류가 잘 흐르는 도체여야 해요.' },
          sheath: { cu: '구리는 도체라서 전류가 새어 나가요. 피복은 전류를 막는 부도체여야 해요.', fe: '철은 도체라서 전류가 새어 나가요. 피복은 부도체여야 해요.', si: '규소는 반도체라서 전류를 완전히 막지 못해요.', gl: '유리는 부도체이지만 깨지기 쉬워 구부러지는 전선에는 알맞지 않아요.' },
          chip: { cu: '구리는 전류가 너무 잘 흘러서 켜고 끄기 어려워요. 전류를 조절하기 쉬운 반도체가 필요해요.', fe: '철은 도체라서 전류를 켜고 끄는 스위치를 만들기 어려워요.', rb: '고무는 부도체라서 전류가 아예 흐르지 않아요.', pl: '플라스틱은 부도체라서 전류가 흐르지 않아요.', gl: '유리는 부도체라서 전류가 흐르지 않아요.' },
          glove: { cu: '구리는 도체라서 전기가 몸으로 흘러요! 아주 위험해요.', fe: '철은 도체라서 감전될 수 있어요.', si: '규소는 반도체라서 전기를 막기에 알맞지 않아요.', pl: '플라스틱도 부도체이지만 장갑은 손에 맞게 구부러져야 해서 고무가 알맞아요.', gl: '유리는 부도체이지만 깨지기 쉬워 장갑에는 알맞지 않아요.' },
        }[P.id][tok] || '이 부품에는 다른 소재가 더 알맞아요.';
        msgs.push('<b>' + P.name + '</b> : ' + why);
      }
    });
    bad.forEach((b, i) => { if (b && !A.bad[i]) { A.shake[i] = 0.5; } });
    A.bad = bad;
    if (msgs.length) return msgs[0];
    A.partsOK = true; return true;
  }
  function placeToken(id, i) {
    const A = S.apply; A.slots[i] = id; A.bad[i] = false; A.sel = ''; A.partsOK = false; Sound.tick();
    const s = slotRect(i); parts.burst(s.x + s.w / 2, s.y + s.h / 2, { count: 7, speed: 80, size: 3, life: 0.5, colors: ['#f26b3a', '#fff'] });
    updateCtl();
  }

  /* ======================================================
     화면 ④-b: 모래 → 규소 → 웨이퍼 → 칩
     ====================================================== */
  const FAB = [
    { id: 'sand', name: '모래', sub: '규산염 (규소 + 산소)' },
    { id: 'ingot', name: '정제한 규소', sub: '순도 높은 규소 덩어리' },
    { id: 'wafer', name: '웨이퍼', sub: '얇게 자른 둥근 판' },
    { id: 'chip', name: '반도체 칩', sub: '회로를 새긴 부품' },
  ];
  function fabSlot(i) { return PHONE ? { x: 18 + (i % 2) * 250, y: 64 + Math.floor(i / 2) * 118, w: 230, h: 104 } : { x: 14 + i * 196, y: 62, w: 184, h: 130 }; }
  function fabHome(i) { return PHONE ? { x: 18 + (i % 2) * 250 + 115, y: 340 + Math.floor(i / 2) * 84 + 36 } : { x: 14 + i * 196 + 92, y: 252 }; }
  function initFab() {
    const A = S.apply, R = rng(Date.now() % 997 + 3), ord = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    if (ord.every((v, i) => v === i)) ord.reverse();
    A.fab = ord.map((id, k) => { const h = fabHome(k); return { id, x: h.x, y: h.y, tx: h.x, ty: h.y, slot: -1, lift: 0, bad: false, shake: 0 }; });
    A.fabOK = false; A.fabT = 0; A.fabMsg = '';
  }
  function fabLayout() {
    const A = S.apply; let free = 0;
    A.fab.forEach((c) => { if (c.slot >= 0) { const s = fabSlot(c.slot); c.tx = s.x + s.w / 2; c.ty = s.y + s.h / 2 + 4; } else { const h = fabHome(free++); c.tx = h.x; c.ty = h.y; } });
  }
  function fabIcon(id, x, y, sc, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (id === 0) { ctx.fillStyle = '#e8c98e'; ctx.beginPath(); ctx.moveTo(-34, 22); ctx.quadraticCurveTo(-8, -32, 0, -28); ctx.quadraticCurveTo(14, -30, 34, 22); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#b8924d'; ctx.lineWidth = 2; ctx.stroke(); const R = rng(3); for (let k = 0; k < 30; k++) { ctx.fillStyle = R() < 0.5 ? '#c9a063' : '#f3dfb4'; ctx.fillRect(-28 + R() * 56, -18 + R() * 38 + 0, 2.5, 2.5); } }
    else if (id === 1) { D.shadow(() => { const g = ctx.createLinearGradient(-26, 0, 26, 0); g.addColorStop(0, '#94a3b8'); g.addColorStop(0.5, '#475569'); g.addColorStop(1, '#1e293b'); ctx.fillStyle = g; rr(-24, -28, 48, 56, 6).fill(); ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(0, -28, 24, 8, 0, 0, 6.3); ctx.fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, -22); ctx.lineTo(-12, 22); ctx.stroke(); }
    else if (id === 2) { const g = ctx.createRadialGradient(-8, -8, 4, 0, 0, 34); g.addColorStop(0, '#cbd5e1'); g.addColorStop(1, '#475569'); D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 32, 0, 6.3); ctx.fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = 'rgba(15,23,42,.5)'; ctx.lineWidth = 1; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(-30, k * 9); ctx.lineTo(30, k * 9); ctx.moveTo(k * 9, -30); ctx.lineTo(k * 9, 30); ctx.stroke(); } ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 32, 0, 6.3); ctx.stroke(); }
    else { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 11, -26); ctx.lineTo(k * 11, -34); ctx.moveTo(k * 11, 26); ctx.lineTo(k * 11, 34); ctx.moveTo(-26, k * 11); ctx.lineTo(-34, k * 11); ctx.moveTo(26, k * 11); ctx.lineTo(34, k * 11); ctx.stroke(); } D.shadow(() => { ctx.fillStyle = '#1f2937'; rr(-27, -27, 54, 54, 6).fill(); }, { blur: 5, y: 2 }); ctx.fillStyle = '#334155'; rr(-17, -17, 34, 34, 4).fill(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.2; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-12, k * 9); ctx.lineTo(12, k * 9); ctx.moveTo(k * 9, -12); ctx.lineTo(k * 9, 12); ctx.stroke(); } }
    ctx.restore();
  }
  function stepFab(dt) {
    const A = S.apply;
    A.fab.forEach((c) => { if (c.free) return; if (RM) { c.x = c.tx; c.y = c.ty; } else { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); } if (c.shake > 0) c.shake = Math.max(0, c.shake - dt); });
    if (A.fabOK) A.fabT += dt;
    if (A.fabOK && A.sw.length === 0) { for (let i = 0; i < 66; i++) A.sw.push({ on: rand() < 0.5, t: rand() * 2 }); }
    if (A.fabOK) A.sw.forEach((s) => { s.t -= dt; if (s.t <= 0) { s.on = !s.on; s.t = 0.4 + rand() * 1.4; } });
  }
  function fabDrop(c, p, from) {
    let k = -1;
    for (let i = 0; i < 4; i++) { const s = fabSlot(i); if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) k = i; }
    const A = S.apply;
    if (k >= 0) { const other = A.fab.find((o) => o !== c && o.slot === k); if (other) other.slot = from != null ? from : -1; c.slot = k; Sound.tick(); } else c.slot = -1;
    c.bad = false; SciSim.tween(c, { lift: 0 }, { duration: 0.15 }); A.fabOK = false; fabLayout(); updateCtl();
  }
  function fabCheck() {
    const A = S.apply, un = A.fab.filter((c) => c.slot < 0).length;
    if (un) return '아직 칸에 놓지 않은 카드가 <b>' + un + '장</b> 있어요.';
    const bad = A.fab.filter((c) => c.slot !== c.id);
    A.fab.forEach((c) => { const b = bad.includes(c); if (b && !c.bad) c.shake = 0.5; c.bad = b; });
    if (bad.length) return '순서가 맞지 않는 카드가 있어요. 모래에서 시작해 어떤 순서로 가공할지 생각해 봐요.';
    A.fabOK = true; A.fabT = 0; parts.burst(VW / 2, 200, { count: 22, speed: 200, size: 4 }); return true;
  }
  function drawFab(t) {
    const A = S.apply;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 30, '모래가 반도체 칩이 되기까지', { size: PHONE ? 15 : 19, weight: 800, color: '#7c2d12' });
    for (let i = 0; i < 4; i++) {
      const s = fabSlot(i);
      ctx.save(); ctx.strokeStyle = A.fabOK ? '#16a34a' : '#cbbfae'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); rr(s.x, s.y, s.w, s.h, 14).stroke(); ctx.restore();
      D.label(s.x + 28, s.y - 9, String(i + 1) + '단계', { bg: A.fabOK ? '#16a34a' : '#94a3b8', size: 12 });
      if (!PHONE && i < 3) D.arrow(s.x + s.w + 3, s.y + s.h / 2, s.x + s.w + 12, s.y + s.h / 2, { color: '#94a3b8', width: 3, head: 9 });
    }
    A.fab.forEach((c) => { if (S.drag && S.drag.fab === c) return; drawFabCard(c, t); });
    if (S.drag && S.drag.fab) drawFabCard(S.drag.fab, t);
    if (A.fabOK) {
      // 칩 확대
      const zy = PHONE ? 350 : 224, zh = PHONE ? 400 : 306, zx = 14, zw = VW - 28;
      D.shadow(() => { ctx.fillStyle = '#0f172a'; rr(zx, zy, zw, zh, 16).fill(); }, { blur: 8, y: 3 });
      D.text(VW / 2, zy + 30, '🔍 칩 속 : 스위치 수십억 개가 전류를 켜고 꺼요', { size: PHONE ? 13.5 : 16, weight: 800, color: '#e2e8f0' });
      const cols = 11, rows = 6, cwid = (zw - 80) / cols, rhei = (zh - 150) / rows;
      A.sw.forEach((s, k) => {
        const c = k % cols, r = Math.floor(k / cols), x = zx + 40 + c * cwid + cwid / 2, y = zy + 62 + r * rhei + rhei / 2;
        ctx.fillStyle = s.on ? '#22c55e' : '#334155'; rr(x - cwid * 0.36, y - rhei * 0.3, cwid * 0.72, rhei * 0.6, 6).fill();
        if (s.on) D.glow(x, y, cwid * 0.6, '#4ade80', 0.4);
        D.text(x, y + 5, s.on ? '1' : '0', { size: 13, weight: 800, color: s.on ? '#052e16' : '#94a3b8' });
      });
      D.text(VW / 2, zy + zh - 56, '켜짐 = 1 (전류 흐름) · 꺼짐 = 0 (전류 안 흐름)', { size: PHONE ? 12 : 14, weight: 800, color: '#cbd5e1' });
      D.text(VW / 2, zy + zh - 30, '불순물로 전류를 조절하는 반도체라서 이런 스위치를 만들 수 있어요', { size: PHONE ? 11.5 : 13, weight: 700, color: '#94a3b8' });
    } else if (A.fab.every((c) => c.slot < 0)) {
      D.text(VW / 2, PHONE ? 330 : 222, '👇 아래 카드를 위 칸에 순서대로 놓아요', { size: PHONE ? 12.5 : 14, weight: 700, color: '#64748b' });
    }
  }
  function drawFabCard(c, t) {
    const F = FAB[c.id], lift = c.lift || 0, sh = c.shake > 0 ? Math.sin(c.shake * 50) * 5 : 0, w = PHONE ? 220 : 170, h = PHONE ? 92 : 114;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(1 + lift * 0.07, 1 + lift * 0.07);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(-w / 2, -h / 2, w, h, 12).fill(); }, { blur: 5 + lift * 9, y: 2 + lift * 4 });
    ctx.strokeStyle = c.bad ? '#e2464b' : c.slot >= 0 ? '#f26b3a' : '#e2d6c8'; ctx.lineWidth = c.bad ? 3.5 : 2.5; rr(-w / 2, -h / 2, w, h, 12).stroke();
    if (PHONE) { fabIcon(c.id, -w / 2 + 38, 0, 0.7, t); D.text(-w / 2 + 78, -8, F.name, { size: 15, weight: 800, color: '#1b2333', align: 'left' }); D.text(-w / 2 + 78, 12, F.sub, { size: 11, weight: 700, color: '#64748b', align: 'left' }); }
    else { fabIcon(c.id, 0, -22, 0.85, t); D.text(0, 30, F.name, { size: 15, weight: 800, color: '#1b2333' }); D.text(0, 47, F.sub, { size: 11.5, weight: 700, color: '#64748b' }); }
    ctx.restore();
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { test: '🔌 전류 시험', model: '⚡ 자유전자 모형', semi: '🧪 반도체 제어', apply: '📱 소재 선택' };
  const DEFSUB = { test: 'bench', model: 'main', semi: '', apply: 'parts' };
  function setMode(m, sub) {
    if (S.mode !== m || (sub != null && S.sub !== sub)) S.fade = 1;
    S.mode = m; S.sub = sub != null ? sub : DEFSUB[m]; S.drag = null; S.hover = '';
    if (m === 'test' && S.sub === 'sort') layoutChips();
    updateCtl();
  }
  function ensure(m, sub) { if (S.mode !== m || (sub != null && S.sub !== sub)) setMode(m, sub); }
  function updateCtl() {
    const key = S.mode + (S.sub ? ':' + S.sub : '');
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || toks.includes(S.mode)); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#modeSeg').hidden = !(game && game.free);
    $$('#subTest button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.sub));
    $$('#subApply button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.sub));
    $$('#matSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === S.model.mat));
    $('#bVolt').textContent = S.model.volt ? '⏹ 전압 끄기' : '⚡ 전압 걸기';
    $('#bEject').hidden = S.sub !== 'bench'; $('#bEject').disabled = !S.test.cur;
    $('#testNote').textContent = S.sub === 'sort' ? '시료 칩에 적힌 전류 값을 보고 알맞은 칸으로 끌어다 놓아요.' : '시료 카드를 누르거나 회로의 빈칸으로 끌어다 놓아요. 전류계와 아래 값(A)을 읽어요.';
    updateSlider();
  }
  function buildCls() {
    const box = $('#clsRows'); box.innerHTML = '';
    ['cu', 'gl', 'si'].forEach((id, i) => {
      const row = document.createElement('div'); row.className = 'match-row'; row.innerHTML = '<b>' + MATNAME[id] + '</b>';
      const sel = document.createElement('select'); sel.setAttribute('aria-label', MATNAME[id] + '의 종류');
      ['선택해 주세요', '도체', '부도체', '반도체'].forEach((f, k) => { const o = document.createElement('option'); o.value = k; o.textContent = f; sel.appendChild(o); });
      sel.addEventListener('change', () => { sel.classList.remove('bad', 'good'); S.model.clsBad[i] = false; S.model.cls[id] = +sel.value; Sound.click(); });
      row.appendChild(sel); box.appendChild(row);
    });
  }
  $('#subTest').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); if (b.dataset.s === 'sort' && !S.test.chips.length) initChips(); setMode('test', b.dataset.s); } });
  $('#subApply').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); if (b.dataset.s === 'chip' && !S.apply.fab.length) initFab(); setMode('apply', b.dataset.s); } });
  $('#bEject').addEventListener('click', eject);
  $('#matSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMat(b.dataset.m); });
  $('#bVolt').addEventListener('click', () => { S.model.volt = !S.model.volt; Sound.click(); updateCtl(); });
  { const sN = $('#sN'); sN.addEventListener('input', () => { S.model.n = +sN.value; S.model.custom = S.model.n !== DEFN[S.model.mat]; syncElectrons(); updateSlider(); updateCtl(); }); }
  { const sD = $('#sD'), sT = $('#sT'), sL = $('#sL');
    const upd = () => { S.semi.d = +sD.value; S.semi.T = +sT.value; S.semi.L = +sL.value; $('#oD').textContent = DNAME[S.semi.d]; $('#oT').textContent = S.semi.T + ' °C'; $('#oL').textContent = S.semi.L + ' %'; [sD, sT, sL].forEach((s) => s.style.setProperty('--pct', ((+s.value - +s.min) / (+s.max - +s.min) * 100) + '%')); syncSemi(); };
    [sD, sT, sL].forEach((s) => s.addEventListener('input', upd)); window.__semiUpd = upd; upd(); }
  $('#bPartsReset').addEventListener('click', () => { Sound.click(); S.apply.slots = [null, null, null, null]; S.apply.bad = [false, false, false, false]; S.apply.sel = ''; S.apply.partsOK = false; updateCtl(); });
  $('#bFabReset').addEventListener('click', () => { Sound.click(); initFab(); });

  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }

  /* ---------- 포인터 ---------- */
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const inBox = (p, q) => Math.abs(p.x - q.x) <= q.w / 2 && Math.abs(p.y - q.y) <= q.h / 2;
  function sampleAt(p) { for (let i = 0; i < 10; i++) { if (inBox(p, rackPos(i))) return MAT[i].id; } return ''; }
  function tokenAt(p) { for (let i = 0; i < 6; i++) { const q = tokRect(i); if (inRect(p, q)) return TOKENS[i]; } return ''; }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'test' && S.sub === 'bench') { const id = sampleAt(p); if (!id) return false; S.drag = { kind: 'sample', id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true; }
      if (S.mode === 'test' && S.sub === 'sort') {
        const cs = S.test.chips; for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (Math.abs(p.x - c.x) <= CHW / 2 && Math.abs(p.y - c.y) <= CHH / 2) { c.free = true; c.bin = -1; S.drag = { kind: 'chip', chip: c, ox: p.x - c.x, oy: p.y - c.y }; cs.splice(i, 1); cs.push(c); SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click(); layoutChips(); return true; } }
        return false;
      }
      if (S.mode === 'apply' && S.sub === 'parts') {
        const id = tokenAt(p);
        if (id) { S.drag = { kind: 'tok', id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, over: -1 }; Sound.click(); return true; }
        for (let i = 0; i < 4; i++) { if (inRect(p, partRect(i))) { if (S.apply.sel) { placeToken(S.apply.sel, i); } else if (S.apply.slots[i] && inRect(p, slotRect(i))) { S.apply.slots[i] = null; S.apply.bad[i] = false; S.apply.partsOK = false; Sound.click(); updateCtl(); } return false; } }
        return false;
      }
      if (S.mode === 'apply' && S.sub === 'chip') {
        const cs = S.apply.fab; for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i], w = PHONE ? 220 : 170, h = PHONE ? 92 : 114; if (Math.abs(p.x - c.x) <= w / 2 && Math.abs(p.y - c.y) <= h / 2) { c.free = true; S.drag = { kind: 'fab', fab: c, ox: p.x - c.x, oy: p.y - c.y, from: c.slot }; if (c.slot >= 0) c.slot = -1; cs.splice(i, 1); cs.push(c); SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click(); S.apply.fabOK = false; return true; } }
      }
      return false;
    },
    move(p) {
      const d = S.drag; if (!d) return;
      if (d.kind === 'chip') { d.chip.x = p.x - d.ox; d.chip.y = p.y - d.oy; }
      else if (d.kind === 'fab') { d.fab.x = p.x - d.ox; d.fab.y = p.y - d.oy; }
      else { d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true; if (d.kind === 'tok') { d.over = -1; for (let i = 0; i < 4; i++) if (inRect(p, partRect(i))) d.over = i; } }
    },
    up(p) {
      const d = S.drag; if (!d) return; S.drag = null;
      if (d.kind === 'sample') {
        const G = BG0(); const nearGap = Math.hypot(p.x - (G.g0 + G.g1) / 2, p.y - G.y1) < 120 || p.y < G.y1 + 60;
        if (!d.moved || nearGap) placeSample(d.id);
      } else if (d.kind === 'chip') { d.chip.free = false; chipDrop(d.chip, { x: d.chip.x, y: d.chip.y }); }
      else if (d.kind === 'fab') { d.fab.free = false; fabDrop(d.fab, { x: d.fab.x, y: d.fab.y }, d.from); }
      else if (d.kind === 'tok') {
        if (!d.moved) { S.apply.sel = S.apply.sel === d.id ? '' : d.id; return; }
        for (let i = 0; i < 4; i++) if (inRect(p, partRect(i))) { placeToken(d.id, i); return; }
      }
    },
    hover(p) {
      if (S.mode === 'test' && S.sub === 'bench') { S.hover = sampleAt(p); return S.hover ? 'pointer' : 'default'; }
      if (S.mode === 'apply' && S.sub === 'parts') return tokenAt(p) ? 'pointer' : 'default';
      return 'default';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.hover = ''; });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'test') {
      const T = S.test, I = curCur(), n = Object.keys(T.meas).length;
      if (S.sub === 'sort') { L1 = '분류한 시료'; a = T.chips.filter((x) => x.bin >= 0).length + ' / 10'; L2 = '측정한 시료'; b = n + ' / 10'; L3 = '기준'; c = '전류의 크기'; }
      else { L1 = '끼운 시료'; a = T.cur ? MID[T.cur].name : '없음'; L2 = '전류'; b = !T.cur ? '0 A' : I >= 1e-12 ? sci(I) : '< 10⁻¹² A'; L3 = '측정한 시료'; c = n + ' / 10'; }
    } else if (S.mode === 'model') {
      const M = S.model;
      if (S.sub === 'cls') { L1 = '고른 종류'; a = $$('#clsRows select').filter((s) => +s.value > 0).length + ' / 3'; L2 = '구분 기준'; b = '자유전자 수'; L3 = '전류'; c = '많이 · 안 · 조금'; }
      else { L1 = '물질'; a = MATNAME[M.mat] + ' (' + KIND[M.mat] + ')'; L2 = '자유전자 수'; b = M.n + '개'; L3 = '전류'; c = !M.volt ? '전압 꺼짐' : M.n === 0 ? '흐르지 않음' : M.n <= 4 ? '아주 조금' : '많이 흐름'; }
    } else if (S.mode === 'semi') {
      const E = S.semi; L1 = '전류 배율'; a = '×' + relText(E.rel); L2 = '자유전자'; b = E.e.length + '개'; L3 = '불순물'; c = E.d ? DNAME[E.d] : '없음';
    } else if (S.sub === 'chip') { L1 = '순서를 놓은 카드'; a = S.apply.fab.filter((x) => x.slot >= 0).length + ' / 4'; L2 = '재료'; b = '모래(규산염)'; L3 = '만든 부품'; c = S.apply.fabOK ? '반도체 칩' : '—'; }
    else { const A = S.apply; L1 = '소재를 넣은 부품'; a = A.slots.filter(Boolean).length + ' / 4'; L2 = '고른 재료'; b = A.sel ? MID[A.sel].name : '—'; L3 = '재료 기준'; c = '전기적 성질'; }
    const key = L1 + a + L2 + b + L3 + c; if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) { const T = S.test; T.cur = null; T.meas = {}; T.needle = 0; T.glowv = 0; initChips(); setMode('test', 'bench'); }
    else if (li === 1) { const M = S.model; M.volt = false; M.t = { cu: 0, gl: 0, si: 0 }; M.seen = { cu: false, gl: false, si: false }; M.clsOK = false; M.clsBad = []; M.cls = { cu: 0, gl: 0, si: 0 }; buildCls(); setMode('model', 'main'); setMat('cu'); }
    else if (li === 2) { const E = S.semi; E.doped100 = false; E.env10 = false; ['sD', 'sT', 'sL'].forEach((id, i) => { $('#' + id).value = [0, 20, 0][i]; }); window.__semiUpd(); setMode('semi', ''); }
    else { const A = S.apply; A.slots = [null, null, null, null]; A.bad = [false, false, false, false]; A.shake = [0, 0, 0, 0]; A.sel = ''; A.partsOK = false; A.sw = []; initFab(); setMode('apply', 'parts'); }
  }
  const levels = [
    {
      title: '전류 시험: 물질마다 전류가 달라요', short: '전류 시험', icon: '🔌', phase: '실험',
      features: ['test'],
      intro: '<p class="si-q">❓ 탐구 질문: 구리선은 전기가 잘 통하고 유리는 안 통하는데, 반도체는 어떤 성질을 가진 물질일까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 전류의 모형(중2 Ⅶ)과 전기 회로, 광물의 특성(중2 Ⅱ)을 배웠어요. 이번에는 지구를 이루는 여러 물질에 전류가 얼마나 흐르는지 직접 시험해 봐요.</div>' +
        '<p>전지 · 전구 · 전류계로 만든 회로의 빈칸에 <b>시료 10가지</b>를 끼워 전류의 크기를 재요. 시료는 모두 같은 모양과 크기예요. 전류가 아주 작을 때는 <b>10의 거듭제곱</b>(예: 1.3×10⁻¹⁰ A)으로 나타내요.</p>',
      setup() { enterLevel(0); },
      recap: '물질에 따라 전류가 흐르는 정도가 매우 달라요. 전류가 잘 흐르는 물질이 도체예요.',
      summary: '<ul><li>같은 모양·크기의 시료를 회로에 끼워 전류를 재면 물질마다 크게 달라요.</li><li><b>전류가 잘 흐르는 물질 = 도체</b>(구리 · 철 · 알루미늄 · 흑연), <b>거의 안 흐르는 물질 = 부도체</b>(유리 · 고무 · 플라스틱 · 건조한 나무 · 화강암).</li><li><b>규소</b>는 도체와 부도체의 중간쯤으로, 전류가 아주 조금 흘러요.</li></ul>' +
        '<table class="mini"><tr><th>물질</th><th>비저항 (Ω·m)</th></tr><tr><td>구리</td><td>1.7×10⁻⁸</td></tr><tr><td>철</td><td>1×10⁻⁷</td></tr><tr><td>순수한 규소</td><td>약 2×10³</td></tr><tr><td>유리</td><td>10¹⁰ ~ 10¹⁴</td></tr><tr><td>고무</td><td>약 10¹³</td></tr></table><p style="font-size:13px;color:#64748b;margin:4px 0 0">비저항이 낮을수록 전류가 잘 흘러요.</p>',
      missions: [
        {
          title: '시료 10개 전류 측정하기',
          goal: '시료 카드를 눌러(또는 끌어다) 회로의 빈칸에 끼우고 전류를 재요. <b>10개를 모두</b> 측정하세요.',
          hint: '시료를 끼운 뒤 전류계 바늘과 전류 값이 안정될 때까지 1초쯤 기다려요. 측정이 끝나면 카드에 ✓가 생겨요.',
          setup() { ensure('test', 'bench'); },
          check: () => MAT.every((m) => S.test.meas[m.id]), hold: 0.6,
          status: () => mark(Object.keys(S.test.meas).length >= 10) + ' 측정한 시료 ' + Object.keys(S.test.meas).length + ' / 10',
          explain: '같은 모양·크기의 시료라도 물질에 따라 전류가 <b>1 A 가까이</b> 흐르는 것부터 <b>10⁻¹² A보다 작아 재지 못하는</b> 것까지 엄청나게 달랐어요. 규소는 그 중간쯤(약 10⁻¹⁰ A)이었어요.',
        },
        {
          title: '전류의 크기로 분류하기',
          goal: '측정 결과를 보고 시료 10개를 <b>잘 흐름 · 조금 흐름 · 거의 안 흐름</b> 3칸으로 나눈 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '≥ 10⁻³ A는 잘 흐름, 10⁻¹² ~ 10⁻³ A는 조금 흐름, 그보다 작으면 거의 안 흘러요. 규소는 어디일까요?',
          manual: true,
          setup() { ensure('test', 'sort'); if (!S.test.chips.length) initChips(); layoutChips(); },
          check: () => sortCheck(),
          explain: '<b>잘 흐름</b>: 구리 · 철 · 알루미늄 · 흑연(도체). <b>조금 흐름</b>: 규소(반도체). <b>거의 안 흐름</b>: 화강암 · 나무 · 유리 · 고무 · 플라스틱(부도체). 지구를 이루는 물질은 이렇게 전기적 성질로 구분할 수 있어요.',
        },
        {
          type: 'quiz', title: '전류가 잘 흐르는 물질',
          goal: '시험에서 전류가 <b>잘 흐른</b> 구리 · 철 · 알루미늄 같은 물질을 무엇이라고 할까요?',
          setup() { ensure('test', 'sort'); },
          choices: ['도체', '부도체', '반도체', '자성체'],
          answer: 0,
          feedback: ['', '부도체는 유리 · 고무처럼 전류가 거의 흐르지 않는 물질이에요.', '반도체는 도체와 부도체의 중간 성질을 가진 물질(규소 등)이에요.', '자성체는 자석에 반응하는 물질이고, 전기가 잘 통하는 것과는 다른 성질이에요.'],
          explain: '전류가 잘 흐르는 물질을 <b>도체</b>, 거의 흐르지 않는 물질을 <b>부도체</b>, 그 중간쯤인 물질을 <b>반도체</b>라고 해요.',
        },
      ],
    },
    {
      title: '자유전자: 전류가 흐르는 까닭', short: '자유전자', icon: '⚡', phase: '모형',
      features: ['model'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물질에 따라 전류가 흐르는 정도가 크게 다르다는 것을 확인했어요. 왜 그럴까요?</div>' +
        '<p>입자 모형(🔍)으로 물질 속을 들여다봐요. 전류를 나르는 것은 원자에서 떨어져 나와 <b>자유롭게 움직이는 전자(자유전자)</b>예요. 구리(도체), 유리(부도체), 규소(반도체) 속 자유전자의 수를 비교하고, 전압을 걸었을 때 어떻게 움직이는지 봐요.</p>',
      setup() { enterLevel(1); },
      recap: '도체는 자유전자가 많아 전류가 잘 흐르고, 부도체는 전자가 원자에 묶여 있어 흐르지 않으며, 반도체는 자유전자가 매우 적어요.',
      summary: '<ul><li>전류를 나르는 입자는 <b>자유전자</b>예요. 전압을 걸면 자유전자가 −극에서 +극 쪽으로 이동해요(전류 방향은 반대).</li><li><b>도체(금속)</b>: 원자 사이를 자유롭게 움직이는 자유전자가 <b>매우 많아</b> 전류가 잘 흘러요.</li><li><b>부도체</b>: 전자가 원자에 <b>단단히 묶여</b> 이동하지 못해 전류가 거의 흐르지 않아요.</li><li><b>반도체</b>: 평소에는 자유전자가 <b>매우 적어</b> 전류가 조금만 흘러요.</li></ul>',
      missions: [
        {
          title: '세 물질 모형 비교하기',
          goal: '<b>구리 · 유리 · 규소</b>를 차례로 고르고, 각각 <b>⚡ 전압을 건 채로</b> 자유전자가 어떻게 움직이는지 살펴보세요.',
          hint: '물질을 고른 뒤 ⚡ 전압 걸기를 켜요. 물질마다 약 2초씩 지켜보면 돼요.',
          setup() { ensure('model', 'main'); },
          check: () => ['cu', 'gl', 'si'].every((k) => S.model.t[k] >= 2), hold: 0.4,
          status: () => ['cu', 'gl', 'si'].map((k) => mark(S.model.t[k] >= 2) + ' ' + MATNAME[k]).join(' · '),
          explain: '<b>구리</b>는 자유전자가 많아 전압을 걸면 한 방향으로 줄지어 흘러요. <b>유리</b>는 전자가 원자에 묶여 있어서 거의 움직이지 못해요. <b>규소</b>는 자유전자가 2개뿐이라 전류가 조금만 흘러요.',
        },
        {
          title: '도체 · 부도체 · 반도체 구분하기',
          goal: '구리, 유리, 규소가 각각 <b>도체 · 부도체 · 반도체</b> 중 무엇인지 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '자유전자가 많으면 도체, 하나도 없으면 부도체, 아주 조금 있으면 반도체예요.',
          manual: true,
          setup() { ensure('model', 'cls'); },
          check() {
            const sels = $$('#clsRows select'), want = { cu: 1, gl: 2, si: 3 }; let un = 0; const bad = [];
            ['cu', 'gl', 'si'].forEach((id, i) => { const v = +sels[i].value; sels[i].classList.remove('bad', 'good'); if (!v) un++; else if (v !== want[id]) { bad.push(id); sels[i].classList.add('bad'); } else sels[i].classList.add('good'); });
            S.model.clsBad = ['cu', 'gl', 'si'].map((id) => bad.includes(id));
            if (un) return '아직 고르지 않은 물질이 <b>' + un + '개</b> 있어요.';
            if (bad.length) return bad.map((id) => '<b>' + MATNAME[id] + '</b>').join(', ') + '의 자유전자 수와 전류를 다시 비교해 봐요.';
            S.model.clsOK = true; return true;
          },
          explain: '<b>구리 = 도체</b>(자유전자 많음), <b>유리 = 부도체</b>(자유전자 없음), <b>규소 = 반도체</b>(자유전자 매우 적음)예요. 규소는 지각을 이루는 규산염 광물 속에도 들어 있는 원소예요.',
        },
        {
          type: 'quiz', title: '금속이 전기를 잘 통하는 까닭',
          goal: '구리 같은 금속이 전기를 <b>잘 통하는</b> 까닭은?',
          setup() { ensure('model', 'main'); },
          choices: ['원자 사이를 자유롭게 움직이는 자유전자가 많기 때문이다', '원자핵이 전류를 대신 날라 주기 때문이다', '금속 원자에는 전자가 하나도 없기 때문이다', '전자가 원자에 단단히 묶여 있기 때문이다'],
          answer: 0,
          feedback: ['', '전류를 나르는 것은 원자핵이 아니라 자유롭게 움직이는 전자예요.', '금속 원자에도 전자가 있어요. 그중 일부가 자유전자가 되어 움직여요.', '전자가 묶여 있으면 부도체의 성질이에요.'],
          explain: '금속은 자유전자가 많아서 전압을 걸면 자유전자가 한 방향으로 이동하며 <b>전류가 잘 흘러요</b>.',
        },
      ],
    },
    {
      title: '반도체 제어: 불순물 · 온도 · 빛', short: '반도체', icon: '🧪', phase: '탐구',
      features: ['semi'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반도체(규소)는 자유전자가 매우 적어 전류가 조금만 흐른다고 했어요. 그런데 반도체가 첨단 기술에 널리 쓰이는 까닭은 뭘까요?</div>' +
        '<p>순수한 규소는 전류가 거의 흐르지 않지만, <b>불순물</b>(예: 최외각 전자가 5개인 인)을 아주 조금 섞으면 <b>자유전자가 늘어나 전기적 성질이 크게 바뀌어요</b>. 온도를 높이거나 빛을 비춰도 전류가 늘어나요. 이 성질을 이용하면 전류를 <b>쉽게 조절</b>할 수 있어요. (접합 원리와 에너지띠는 다루지 않아요.)</p>',
      setup() { enterLevel(2); },
      recap: '반도체는 불순물을 섞거나 온도·빛을 바꾸면 자유전자 수가 달라져 전기적 성질을 쉽게 조절할 수 있어요.',
      summary: '<ul><li>순수한 규소는 자유전자가 거의 없어 전류가 약해요.</li><li><b>불순물</b>(예: 인)을 천만 개 중 1개 꼴로만 넣어도 자유전자가 늘어 전류가 <b>수만 배 이상</b> 커져요.</li><li><b>온도를 높이거나 빛을 비추면</b> 반도체의 전류도 늘어나요.</li><li>그래서 반도체는 <b>전기적 성질을 제어하기 쉬워</b> 전류를 켜고 끄는 스위치 소자의 재료가 돼요.</li></ul>',
      missions: [
        {
          title: '불순물 · 온도 · 빛으로 전류 키우기',
          goal: '① 온도 20~40 °C, 빛 없이 <b>불순물</b>만 넣어 전류를 <b>100배 이상</b>으로 키우고, ② 불순물 없이 <b>온도나 빛</b>으로 순수 규소의 전류를 <b>10배 이상</b> 키우세요.',
          hint: '불순물 슬라이더를 오른쪽으로 옮겨 보세요(매우 소량이면 충분해요). 그다음 불순물을 0으로 되돌리고 온도나 빛을 올려요.',
          setup() { ensure('semi', ''); },
          check: () => S.semi.doped100 && S.semi.env10, hold: 0.4,
          status: () => mark(S.semi.doped100) + ' 불순물로 100배 이상 · ' + mark(S.semi.env10) + ' 온도·빛으로 10배 이상 (현재 ×' + relText(S.semi.rel) + ')',
          explain: '불순물 원자 하나가 자유전자를 하나씩 내놓아서, 천만 개 중 1개만 섞어도 전류는 <b>수십만 배</b>가 돼요. 온도를 높이거나 빛을 비추어도 자유전자가 늘어나 전류가 커져요.',
        },
        {
          type: 'quiz', title: '불순물을 넣는 까닭',
          goal: '반도체에 <b>불순물을 아주 조금 넣는 목적</b>은?',
          setup() { ensure('semi', ''); },
          choices: ['전기적 성질(전류)을 쉽게 조절하기 위해서', '반도체의 색깔을 바꾸기 위해서', '반도체를 완전한 부도체로 만들기 위해서', '반도체의 무게를 늘리기 위해서'],
          answer: 0,
          feedback: ['', '불순물의 목적은 색이 아니라 전기적 성질이에요.', '불순물을 넣으면 자유전자가 늘어 전류가 오히려 커져요.', '불순물은 아주 조금만 넣어서 무게 변화는 거의 없어요.'],
          explain: '불순물을 아주 조금 넣으면 자유전자 수가 크게 달라져 <b>전기적 성질을 쉽게 제어</b>할 수 있어요. 이 성질 덕분에 반도체로 전류를 켜고 끄는 소자를 만들 수 있어요.',
        },
      ],
    },
    {
      title: '소재 선택: 첨단 기술 속 물질', short: '소재 선택', icon: '📱', phase: '적용',
      features: ['apply'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 도체는 전류가 잘 흐르고, 부도체는 안 흐르며, 반도체는 불순물 · 온도 · 빛으로 전류를 조절할 수 있다는 것을 배웠어요.</div>' +
        '<p>물질의 전기적 성질에 맞게 소재를 골라 일상생활과 첨단 기술에 활용해 봐요. 그리고 스마트폰 속 반도체 칩이 지구에서 흔한 <b>모래(규산염)</b>에서 시작된다는 것도 확인해 봐요.</p>',
      setup() { enterLevel(3); },
      recap: '도체는 전선, 부도체는 피복·절연 장갑, 반도체(규소)는 칩 소자에 쓰여요. 반도체 칩의 재료인 규소는 모래(규산염)에서 얻어요.',
      summary: '<ul><li><b>도체</b>(구리) → 전선, <b>부도체</b>(고무 · 플라스틱) → 전선 피복 · 전기 안전 장갑, <b>반도체</b>(규소) → 스마트폰 · 컴퓨터 · 인공지능 칩.</li><li>반도체 칩은 <b>스위치 소자</b>가 전류를 켜고 꺼서(1과 0) 정보를 처리해요.</li><li>재료의 흐름: <b>모래(규산염)</b> → 정제한 <b>규소</b> → <b>웨이퍼</b> → <b>반도체 칩</b>.</li><li>부도체도 <b>아주 높은 전압</b>이 걸리면 전류가 흐를 수 있어요.</li></ul>',
      missions: [
        {
          title: '부품에 알맞은 소재 고르기',
          goal: '<b>전선 · 전선 피복 · 스마트폰 칩 · 전기 안전 장갑</b> 4가지 부품에 알맞은 소재를 하나씩 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '도체는 전류를 흘려야 하는 곳에, 부도체는 전류를 막아야 하는 곳에, 반도체는 전류를 조절해야 하는 곳에 써요.',
          manual: true,
          setup() { ensure('apply', 'parts'); },
          check: () => partsCheck(),
          explain: '<b>전선</b>은 도체인 구리, <b>피복</b>과 <b>안전 장갑</b>은 전류를 막는 부도체(고무 · 플라스틱), <b>스마트폰 칩</b>은 전류를 조절하기 쉬운 반도체인 규소예요. 소재는 전기적 성질에 맞게 골라요.',
        },
        {
          title: '모래에서 칩까지 순서 맞추기',
          goal: '<b>🏭 칩 만들기</b> 화면에서 카드 4장을 <b>모래 → 규소 → 웨이퍼 → 칩</b> 순서로 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '먼저 모래에서 규소를 얻어 순도를 높이고, 얇은 판으로 자른 뒤, 회로를 새겨 칩을 만들어요.',
          manual: true,
          setup() { if (!S.apply.fab.length) initFab(); ensure('apply', 'chip'); },
          check: () => fabCheck(),
          explain: '지각을 이루는 <b>모래(규산염)</b>에서 규소를 얻어 순도를 높인 뒤 <b>웨이퍼</b>로 자르고, 그 위에 회로를 새겨 <b>반도체 칩</b>을 만들어요. 칩 속 스위치 수십억 개가 전류를 켜고 꺼서 스마트폰과 컴퓨터가 작동해요. 지구를 구성하는 물질이 첨단 기술의 재료가 되는 거예요.',
        },
        {
          type: 'quiz', title: '부도체에 대한 오개념',
          goal: '부도체에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { ensure('apply', 'parts'); },
          choices: ['아주 높은 전압이 걸리면 부도체에도 전류가 흐를 수 있다', '부도체는 어떤 상황에서도 전류가 절대 흐르지 않는다', '부도체는 자유전자가 가장 많은 물질이다', '부도체는 전압이 높을수록 전류를 더 단단히 막는다'],
          answer: 0,
          feedback: ['', '번개처럼 아주 높은 전압이 걸리면 공기나 유리 같은 부도체에도 전류가 흐를 수 있어요.', '자유전자가 가장 많은 물질은 도체예요.', '전압이 아주 높아지면 오히려 부도체도 견디지 못하고 전류가 흐를 수 있어요.'],
          explain: '부도체는 보통의 전압에서는 전류가 거의 흐르지 않지만, <b>아주 높은 전압</b>에서는 전류가 흐를 수도 있어요. 그래서 고압 전선에는 두껍고 튼튼한 절연체를 써요. 또 규소 같은 반도체는 지구를 구성하는 규산염 광물(모래)에서 얻어 첨단 소자의 재료로 쓰여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-conductor', mount: '#game', badge: '전기 박사', homeHref: '../../index.html#h1a',
    featureLabels: { test: '🔌 전류 시험 회로 · 🗂️ 분류', model: '⚡ 자유전자 입자 모형', semi: '🧪 불순물 · 온도 · 빛 슬라이더', apply: '📱 부품 소재 · 🏭 칩 공정' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initChips(); initFab(); buildCls(); syncElectrons(); syncSemi(); updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'test') { stepTest(dt); if (S.sub === 'sort') stepSort(dt); }
    else if (S.mode === 'model') stepModel(dt);
    else if (S.mode === 'semi') stepSemi(dt);
    else { const A = S.apply; if (A.shake) A.shake = A.shake.map((x) => Math.max(0, x - dt)); if (A.msgT > 0) A.msgT -= dt; if (S.sub === 'chip') stepFab(dt); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'test') { if (S.sub === 'sort') drawSort(t); else drawBench(t); }
    else if (S.mode === 'model') drawModel(t);
    else if (S.mode === 'semi') drawSemi(t);
    else { if (S.sub === 'chip') drawFab(t); else drawParts(t); }
    // 끌고 있는 것
    if (S.drag) {
      const d = S.drag;
      if (d.kind === 'sample') { ctx.save(); ctx.globalAlpha = 0.95; sample(d.id, d.x, d.y, 110, 26, t); ctx.restore(); }
      else if (d.kind === 'tok') tokenDraw(d.id, d.x, d.y, 116, 64, { scale: 1.08, sel: true });
    }
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, MAT, MID, VW, VH, get game() { return game; }, setMode, enterLevel, updateCtl, placeSample, rackPos, sortGeo, poolPos, binPos, layoutChips, setMat, tokRect, partRect, slotRect, fabSlot, fabLayout, fabDrop, fabCheck, partsCheck, placeToken, chipDrop, semiRel,
    measureAll() { MAT.forEach((m) => { S.test.meas[m.id] = true; }); },
    sortAll(right) { S.test.chips.forEach((c) => { c.bin = right === false ? (MID[c.id].tier + 1) % 3 : MID[c.id].tier; }); layoutChips(); },
    fabSolve() { S.apply.fab.forEach((c) => { c.slot = c.id; }); fabLayout(); S.apply.fab.forEach((c) => { c.x = c.tx; c.y = c.ty; }); },
    setSemi(d, T, L) { $('#sD').value = d; $('#sT').value = T; $('#sL').value = L; window.__semiUpd(); },
  };
})();
