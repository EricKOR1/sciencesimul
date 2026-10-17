/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 단백질과 아미노산 (단원 10차시)
   성취기준 [10통과1-02-05] 지각과 생명체를 구성하는 물질들이 기본 단위체의 결합을 통해서 형성된다는 것을
   규산염 광물, 단백질과 핵산의 예를 통해 설명할 수 있다.
   ① 관찰: 먹은 단백질 (소화 → 흡수 → 세포에서 새 단백질로 조립)
   ② 모형: 구슬 잇기 (아미노산 20종, 서열 수 20ⁿ)
   ③ 탐구: 모양과 기능 (접힘, 열쇠-자물쇠, 서열 바꾸기)
   ④ 적용: 낫 모양 적혈구 (아미노산 1개의 차이)
   ※ 구조식·화학식은 다루지 않고 아미노산을 색 구슬 20종으로만 나타냄
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
  const SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hsl(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const x = (v) => Math.round(255 * v).toString(16).padStart(2, '0');
    return '#' + x(f(0)) + x(f(8)) + x(f(4));
  }
  function koNum(v) {
    v = Math.round(v);
    if (v < 10000) return comma(v);
    const jo = Math.floor(v / 1e12), eok = Math.floor((v % 1e12) / 1e8), man = Math.floor((v % 1e8) / 1e4);
    let s = '';
    if (jo) s += comma(jo) + '조 ';
    if (eok) s += comma(eok) + '억 ';
    if (man) s += comma(man) + '만';
    return s.trim();
  }

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f8f4' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();

  /* ---------- 아미노산 20종 (색 구슬) ---------- */
  const AAD = [['글리신', 'G'], ['알라닌', 'A'], ['발린', 'V'], ['류신', 'L'], ['아이소류신', 'I'], ['프롤린', 'P'], ['페닐알라닌', 'F'], ['트립토판', 'W'], ['메싸이오닌', 'M'], ['세린', 'S'],
    ['트레오닌', 'T'], ['시스테인', 'C'], ['타이로신', 'Y'], ['아스파라진', 'N'], ['글루타민', 'Q'], ['아스파트산', 'D'], ['글루탐산', 'E'], ['라이신', 'K'], ['아르지닌', 'R'], ['히스티딘', 'H']];
  const AA = AAD.map((a, i) => {
    const h = ((i * 7) % 20) * 18, l = [47, 58, 69][i % 3];
    return { name: a[0], code: a[1], col: hsl(h, 70, l), tc: l >= 58 ? '#1a2433' : '#ffffff' };
  });
  const aaLabel = (t) => AA[t].name + ' (' + AA[t].code + ')';
  function bead(x, y, r, t, o) {
    o = o || {};
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha = o.alpha; }
    D.sphere(x, y, r, AA[t].col, { shadow: o.shadow !== false && r > 9, text: r >= 11 ? AA[t].code : null, textColor: AA[t].tc, textScale: 1.0, outline: o.outline });
    if (o.alpha != null) ctx.restore();
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'digest', sub: '', clock: 0, fade: 0, drag: null, hoverT: -1, lastT: -1,
    dg: { food: 'egg', p: 0, playing: false, done: false, reached: [true, false, false, false], stage: 0 },
    chain: { solved: false, shake: 0 },
    fold: { prot: 0, seq: [], sel: -1, ph: 'fold', t: 0, fit: false, fitSeen: [false, false], missSeen: false, msgT: 0, matchOK: false, matchBad: [] },
    sick: { mut: 0, t: [0, 0], maxStuck: 0, cells: [], spawn: 0, o2: 1, pop: 0, seen: [false, false] },
  };
  let game = null;

  /* ======================================================
     화면 ①: 먹은 단백질 → 아미노산 → 새 단백질
     ====================================================== */
  const NB = 12, RB = PHONE ? 8 : 11;
  const FOODS = { egg: { seed: 11, name: '달걀', cap: '달걀 속 단백질' }, tofu: { seed: 29, name: '두부', cap: '콩 단백질' } };
  let dgBeads = [], dgPerm = [], dgInv = [];
  function buildDigest(food) {
    const R = rng(FOODS[food].seed);
    dgBeads = [];
    const used = [];
    for (let i = 0; i < NB; i++) {
      let t; do { t = Math.floor(R() * 20); } while (used.slice(-3).includes(t));
      used.push(t);
      dgBeads.push({ t, u: i / (NB - 1), r: [R(), R(), R(), R(), R(), R(), R(), R()], slot: 0 });
    }
    // 새 단백질에서는 아미노산이 다른 순서로 이어져요
    const ord = []; for (let i = 0; i < NB; i++) ord.push(i);
    for (let i = NB - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    if (ord.every((v, i) => v === i)) ord.reverse();
    dgPerm = ord; dgInv = [];
    ord.forEach((s, i) => { dgBeads[i].slot = s; dgInv[s] = i; });
  }
  function zones() {
    if (!PHONE) {
      const w = (VW - 28 - 30) / 4, h = VH - 64 - 66;
      return [0, 1, 2, 3].map((k) => ({ x: 14 + k * (w + 10), y: 62, w, h }));
    }
    const w = (VW - 30) / 2, h = (VH - 62 - 66 - 10) / 2;
    const pos = [[0, 0], [1, 0], [1, 1], [0, 1]];
    return pos.map((q) => ({ x: 10 + q[0] * (w + 10), y: 62 + q[1] * (h + 10), w, h }));
  }
  function waypoints(b, Z) {
    const z0 = Z[0], z1 = Z[1], z2 = Z[2], z3 = Z[3], i = Math.round(b.u * (NB - 1)), r = b.r;
    const c0 = { x: z0.x + z0.w / 2, y: z0.y + z0.h * (PHONE ? 0.60 : 0.60) };
    const c1x = z1.x + z1.w / 2;
    const cell = { x: z3.x + z3.w / 2, y: z3.y + z3.h * 0.50, R: Math.min(z3.w * 0.46, z3.h * 0.36) };
    const W = [];
    const lr = Math.min(z0.w * 0.46, z0.h * 0.30);
    W[0] = { x: c0.x + lr * 0.60 * Math.sin(6.283 * (1.4 * b.u + 0.15)), y: c0.y + lr * 0.46 * Math.sin(6.283 * 1.9 * b.u) + (b.u - 0.5) * lr * 0.45 };
    const colTop = z1.y + (PHONE ? 70 : 84), colH = z1.h - (PHONE ? 140 : 168);
    W[1] = { x: c1x - z1.w * 0.12, y: colTop + b.u * colH };
    W[2] = { x: c1x + (r[0] - 0.5) * z1.w * 0.62, y: W[1].y + (r[1] - 0.5) * 16 };
    const gx = z2.x + z2.w / 2 + ((i % 3) - 1) * z2.w * 0.27;
    W[3] = { x: gx + (r[2] - 0.5) * 8, y: z2.y + z2.h * (0.24 + 0.18 * r[3]) };
    W[4] = { x: gx + (r[4] - 0.5) * 14, y: z2.y + z2.h * (0.68 + 0.16 * r[5]) };
    W[5] = { x: cell.x + (r[6] - 0.5) * cell.R * 1.1, y: cell.y + (r[7] - 0.5) * cell.R * 1.0 };
    const sp = Math.min(RB * 2.25, (cell.R * 1.5) / 5);
    const k = b.slot;
    W[6] = k < 6 ? { x: cell.x - sp * 2.5 + k * sp, y: cell.y - RB * 1.05 } : { x: cell.x + sp * 2.5 - (k - 6) * sp, y: cell.y + RB * 1.05 };
    const cl = k === 0 ? [0, 0] : k <= 6 ? [Math.cos((k - 1) * Math.PI / 3) * RB * 2.0, Math.sin((k - 1) * Math.PI / 3) * RB * 2.0] : [Math.cos(Math.PI / 6 + (k - 7) * Math.PI / 2.5 * 1.0 + (k > 9 ? 0 : 0)) * RB * 3.7, Math.sin(Math.PI / 6 + (k - 7) * Math.PI / 2.5) * RB * 3.7];
    W[7] = { x: cell.x + cl[0], y: cell.y + cl[1] };
    return { W, cell };
  }
  const SEG = [[0.06, 0.16, 0.5, 'u'], [0.16, 0.40, 0.75, 'u'], [0.40, 0.50, 0.5, 0], [0.50, 0.60, 0.4, 1], [0.60, 0.72, 0.5, 2], [0.72, 0.86, 0.5, 3], [0.86, 0.96, 0.3, 4]];
  function beadPos(b, p, W) {
    let x = W[0].x, y = W[0].y;
    for (let k = 0; k < SEG.length; k++) {
      const sg = SEG[k], a = sg[0], e = sg[1], s = sg[2], ord = sg[3] === 'u' ? b.u : b.r[sg[3]];
      const dur = (e - a) * (1 - s), st = a + s * (e - a) * ord;
      const q = clamp((p - st) / dur, 0, 1), f = EASE.inOutCubic(q);
      x += (W[k + 1].x - W[k].x) * f; y += (W[k + 1].y - W[k].y) * f;
    }
    return { x, y };
  }
  const STAGE_NAMES = ['① 먹은 단백질', '② 소화 (분해)', '③ 흡수', '④ 새 단백질 조립'];
  const stageOf = (p) => (p < 0.12 ? 0 : p < 0.42 ? 1 : p < 0.68 ? 2 : 3);

  function pacman(x, y, r, mouth) {
    ctx.save();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#fde68a'); g.addColorStop(0.6, '#f59e0b'); g.addColorStop(1, '#b45309');
    D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, Math.PI + mouth, Math.PI - mouth, false); ctx.closePath(); ctx.fill(); }, { blur: 6, y: 3 });
    D.sphere(x + r * 0.2, y - r * 0.5, r * 0.14, '#1b2333', { gloss: false });
    ctx.restore();
  }
  function foodIcon(cx, cy, kind, t) {
    ctx.save();
    if (kind === 'egg') {
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 40, cy + 2); ctx.bezierCurveTo(cx - 52, cy - 30, cx - 10, cy - 36, cx + 8, cy - 28); ctx.bezierCurveTo(cx + 44, cy - 30, cx + 52, cy + 4, cx + 30, cy + 22); ctx.bezierCurveTo(cx + 10, cy + 36, cx - 36, cy + 30, cx - 40, cy + 2); ctx.fill(); }, { blur: 6, y: 3 });
      D.sphere(cx, cy - 2, 15, '#fbbf24', { shadow: false });
    } else {
      D.shadow(() => { ctx.fillStyle = '#fdf3d7'; rr(cx - 34, cy - 20, 68, 44, 8).fill(); }, { blur: 6, y: 3 });
      ctx.fillStyle = '#f7e2a8'; rr(cx - 34, cy - 20, 68, 12, 8).fill();
      ctx.strokeStyle = 'rgba(180,140,60,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 34, cy + 2); ctx.lineTo(cx + 34, cy + 2); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 24); ctx.stroke();
    }
    ctx.restore();
  }

  function drawDigest(t, dt) {
    const dg = S.dg, p = dg.p, Z = zones(), st = stageOf(p);
    ctx.fillStyle = '#f3f8f4'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 30, FOODS[dg.food].name + ' 속 단백질이 우리 몸의 단백질이 되기까지', { size: PHONE ? 15 : 18, weight: 800, color: '#14532d' });
    // 구역 배경
    Z.forEach((z, k) => {
      const on = st === k && (dg.playing || dg.done || p > 0);
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(z.x, z.y, z.w, z.h, 16).fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = on ? '#16a34a' : '#d7e3da'; ctx.lineWidth = on ? 3.5 : 2; rr(z.x, z.y, z.w, z.h, 16).stroke();
      D.label(z.x + z.w / 2, z.y + 18, STAGE_NAMES[k], { bg: on ? '#16a34a' : '#94a3b8', size: PHONE ? 13 : 13.5 });
    });
    const z0 = Z[0], z1 = Z[1], z2 = Z[2], z3 = Z[3];
    // ① 음식 + 확대경
    const fy = z0.y + 58;
    foodIcon(z0.x + z0.w / 2, fy, dg.food, t);
    const lensC = { x: z0.x + z0.w / 2, y: z0.y + z0.h * 0.60 }, lensR = Math.min(z0.w * 0.46, z0.h * 0.30);
    ctx.save();
    ctx.strokeStyle = 'rgba(22,163,74,.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(z0.x + z0.w / 2 - 30, fy + 30); ctx.lineTo(lensC.x - lensR * 0.7, lensC.y - lensR * 0.72); ctx.moveTo(z0.x + z0.w / 2 + 30, fy + 30); ctx.lineTo(lensC.x + lensR * 0.7, lensC.y - lensR * 0.72); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(240,253,244,.9)'; ctx.beginPath(); ctx.arc(lensC.x, lensC.y, lensR, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    D.text(lensC.x, lensC.y - lensR - 8, '🔍 입자 모형으로 보기', { size: 12.5, weight: 800, color: '#15803d' });
    // ② 소화 효소 + 기둥
    if (p > 0.1 && p < 0.44) {
      const cu = clamp((p - 0.16) / 0.18, 0, 1);
      const colTop = z1.y + (PHONE ? 70 : 84), colH = z1.h - (PHONE ? 140 : 168);
      const ey = colTop + cu * colH - 4, ex = z1.x + z1.w / 2 - z1.w * 0.12 + 40 + (1 - smooth((p - 0.1) / 0.06)) * 50 - (1 - smooth((0.44 - p) / 0.04)) * 50;
      const mouth = 0.18 + 0.28 * Math.abs(Math.sin(t * 9));
      pacman(ex, ey, PHONE ? 22 : 26, mouth);
      D.label(ex + 4, ey + (PHONE ? 32 : 38), '소화 효소', { bg: '#b45309', size: 12.5 });
    }
    // ③ 소장 벽(융털) · 혈관
    {
      const wy = z2.y + z2.h * 0.50, th = 26, gxs = [-1, 0, 1].map((k) => z2.x + z2.w / 2 + k * z2.w * 0.27);
      D.text(z2.x + z2.w / 2, z2.y + z2.h * 0.13 + 18, '소장 속', { size: 12.5, color: '#78716c', weight: 700 });
      ctx.fillStyle = 'rgba(254,226,226,.8)'; rr(z2.x + 8, z2.y + z2.h * 0.64, z2.w - 16, z2.h * 0.28, 18).fill();
      ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 2; rr(z2.x + 8, z2.y + z2.h * 0.64, z2.w - 16, z2.h * 0.28, 18).stroke();
      D.text(z2.x + z2.w / 2, z2.y + z2.h * 0.93 + 2, '혈관 → 세포로', { size: 12.5, color: '#b91c1c', weight: 800 });
      // 벽 세포
      const n = Math.floor((z2.w - 16) / 24);
      for (let k = 0; k < n; k++) {
        const x = z2.x + 12 + k * 24 + 12;
        if (gxs.some((g) => Math.abs(x - g) < 14)) continue;
        D.sphere(x, wy, 11, '#fdba74', { gloss: false });
        ctx.fillStyle = '#c2410c'; ctx.beginPath(); ctx.arc(x, wy + 2, 3, 0, 6.283); ctx.fill();
      }
      D.text(z2.x + z2.w - 12, wy - 16, '소장 벽', { size: 11.5, align: 'right', color: '#c2410c', weight: 800 });
    }
    // ④ 세포
    const { cell } = waypoints(dgBeads[0], Z);
    {
      const g = ctx.createRadialGradient(cell.x - cell.R * 0.3, cell.y - cell.R * 0.3, 5, cell.x, cell.y, cell.R);
      g.addColorStop(0, '#fef9c3'); g.addColorStop(1, '#fde68a');
      D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cell.x, cell.y, cell.R * 1.02, cell.R * 0.88, 0, 0, 6.283); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cell.x, cell.y, cell.R * 1.02, cell.R * 0.88, 0, 0, 6.283); ctx.stroke();
      D.sphere(cell.x - cell.R * 0.5, cell.y - cell.R * 0.5, cell.R * 0.2, '#a78bfa', { gloss: false });
      D.text(cell.x, cell.y + cell.R * 0.88 + 18, '몸의 세포', { size: 12.5, color: '#92400e', weight: 800 });
    }
    // 구슬 위치
    const pos = dgBeads.map((b) => { const w = waypoints(b, Z); const q = beadPos(b, p, w.W); const wob = p < 0.06 || p >= 0.96 ? 1.5 : 0.8; return { x: q.x + Math.sin(t * 3 + b.u * 9) * wob, y: q.y + Math.cos(t * 2.6 + b.u * 7) * wob }; });
    // 원래 사슬 연결선
    for (let j = 0; j < NB - 1; j++) {
      const cutP = 0.16 + 0.18 * (dgBeads[j].u + dgBeads[j + 1].u) / 2;
      const a = 1 - smooth((p - cutP) / 0.025);
      if (a < 0.02) continue;
      ctx.strokeStyle = 'rgba(71,85,105,' + a.toFixed(2) + ')'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pos[j].x, pos[j].y); ctx.lineTo(pos[j + 1].x, pos[j + 1].y); ctx.stroke();
      if (a < 0.9 && a > 0.1 && !RM) parts.emit({ x: (pos[j].x + pos[j + 1].x) / 2, y: (pos[j].y + pos[j + 1].y) / 2, vx: 0, vy: -20, life: 0.4, size: 3, color: '#f59e0b', shape: 'star' });
    }
    // 새 사슬 연결선
    const aNew = smooth((p - 0.84) / 0.05);
    if (aNew > 0.02) {
      for (let s = 0; s < NB - 1; s++) {
        const A = pos[dgInv[s]], B = pos[dgInv[s + 1]];
        ctx.strokeStyle = 'rgba(22,101,52,' + aNew.toFixed(2) + ')'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }
    }
    // 새 단백질 후광
    if (p > 0.95) { const a = smooth((p - 0.95) / 0.05); D.glow(cell.x, cell.y, cell.R * 0.8, '#22c55e', 0.4 * a); }
    dgBeads.forEach((b, i) => bead(pos[i].x, pos[i].y, RB, b.t, { shadow: true }));
    // 설명 말풍선
    const cap = [FOODS[dg.food].cap + '는 아미노산이 길게 이어진 사슬', '소화 효소가 사슬을 끊어 아미노산 낱개로', '아미노산이 소장 벽을 지나 혈관으로', '세포가 아미노산을 새 순서로 이어 새 단백질'][st];
    D.label(VW / 2, VH - 33, cap, { bg: '#14532d', size: PHONE ? 13 : 14.5 });
    if (dg.done) { D.check(cell.x + cell.R * 0.7, cell.y - cell.R * 0.75, 15, smooth((p - 0.96) / 0.04)); }
    if (!dg.playing && p === 0) D.text(VW / 2, VH - 8, '오른쪽 ▶ 소화 장면 재생을 눌러요', { size: 12.5, color: '#64748b', weight: 700 });
  }
  function stepDigest(dt) {
    const dg = S.dg;
    if (dg.playing) {
      dg.p = Math.min(1, dg.p + dt / (RM ? 8 : 17));
      if (dg.p >= 1) { dg.playing = false; if (!dg.done) { dg.done = true; const Z = zones(); const c = waypoints(dgBeads[0], Z).cell; parts.burst(c.x, c.y, { count: 22, speed: 190, size: 4 }); Sound.success(); } updateCtl(); }
    }
    const st = stageOf(dg.p);
    if (dg.p > 0 && st !== dg.stage) { dg.stage = st; Sound.tick(); }
    for (let k = 0; k <= st; k++) if (dg.p > 0 || k === 0) dg.reached[k] = dg.p > 0 ? true : dg.reached[k];
    if (dg.p === 0) dg.stage = 0;
  }
  function setPlay() {
    const dg = S.dg;
    Sound.click();
    if (dg.done || dg.p >= 1) { dg.p = 0; dg.done = false; dg.reached = [true, false, false, false]; dg.playing = true; }
    else dg.playing = !dg.playing;
    if (dg.playing && dg.p === 0) { dg.reached = [true, false, false, false]; dg.stage = 0; }
    updateCtl();
  }
  function setFood(f) { S.dg.food = f; buildDigest(f); S.dg.p = 0; S.dg.playing = false; S.dg.done = false; S.dg.reached = [true, false, false, false]; updateCtl(); }

  /* ======================================================
     트레이: 아미노산 20종 구슬 통
     ====================================================== */
  const TR = PHONE ? { top: VH - 134, h: 122, r: 20 } : { top: VH - 62, h: 52, r: 16 };
  function trayPos(i) {
    if (!PHONE) return { x: 20 + 19 + i * 38, y: TR.top + TR.h / 2, r: TR.r };
    const row = i < 10 ? 0 : 1, col = i % 10;
    return { x: (VW - 10 * 48) / 2 + 24 + col * 48, y: TR.top + 34 + row * 54, r: TR.r };
  }
  function trayHit(p) { for (let i = 0; i < 20; i++) { const q = trayPos(i); if (Math.hypot(p.x - q.x, p.y - q.y) <= q.r + 5) return i; } return -1; }
  function drawTray(t, hint) {
    D.shadow(() => { ctx.fillStyle = '#e8f3ea'; rr(6, TR.top, VW - 12, TR.h, 14).fill(); }, { blur: 6, y: -1 });
    ctx.strokeStyle = '#bfd8c5'; ctx.lineWidth = 2; rr(6, TR.top, VW - 12, TR.h, 14).stroke();
    const sel = S.hoverT >= 0 ? S.hoverT : S.lastT;
    const msg = sel >= 0 ? '🫙 ' + aaLabel(sel) : hint || '🫙 아미노산 구슬 20종';
    D.label(VW / 2, TR.top - 14, msg, { bg: sel >= 0 ? AA[sel].col : '#14532d', color: sel >= 0 ? AA[sel].tc : '#fff', size: PHONE ? 13 : 14 });
    for (let i = 0; i < 20; i++) {
      const q = trayPos(i), hv = i === S.hoverT, dragging = S.drag && S.drag.t === i;
      bead(q.x, q.y - (hv ? 3 : 0), q.r * (hv ? 1.08 : 1), i, { alpha: dragging ? 0.4 : 1 });
    }
  }

  /* ======================================================
     화면 ②: 구슬 잇기
     ====================================================== */
  const CH = { beads: [], dl: 0, shake: 0, max: 10 };
  function chainSlot(i) {
    if (!PHONE) { const sp = 68; return { x: (VW - 10 * sp) / 2 + sp / 2 + i * sp, y: 268, r: 24, row: 0 }; }
    const sp = 88, row = Math.floor(i / 5), col = i % 5;
    return { x: (VW - 5 * sp) / 2 + sp / 2 + col * sp, y: 300 + row * 100, r: 29, row };
  }
  function addBead(t, fx, fy) {
    if (CH.beads.length >= CH.max) { CH.shake = 0.45; Sound.fail(); toast('사슬은 최대 10개까지 만들 수 있어요', 'bad', 1400); return false; }
    const n = CH.beads.length, s = chainSlot(n);
    const b = { t, x: fx, y: fy, tx: s.x, ty: s.y, pop: 0 };
    SciSim.tween(b, { pop: 1 }, { duration: 0.45, ease: 'outBack' });
    CH.beads.push(b);
    Sound.tick();
    parts.burst(s.x, s.y, { count: 6, speed: 90, size: 3, life: 0.5, colors: [AA[t].col, '#fff'] });
    updateCtl();
    return true;
  }
  function chainUndo() { if (CH.beads.length) { CH.beads.pop(); Sound.click(); updateCtl(); } }
  function chainClear() { CH.beads = []; Sound.click(); updateCtl(); }
  function stepChain(dt) {
    CH.beads.forEach((b, i) => {
      const s = chainSlot(i); b.tx = s.x; b.ty = s.y;
      if (RM) { b.x = b.tx; b.y = b.ty; } else { b.x = SciSim.approach(b.x, b.tx, dt, 12); b.y = SciSim.approach(b.y, b.ty, dt, 12); }
    });
    const tl = CH.beads.length * Math.log10(20);
    CH.dl = RM ? tl : SciSim.approach(CH.dl, tl, dt, 6);
    if (CH.shake > 0) CH.shake = Math.max(0, CH.shake - dt);
  }
  function drawChain(t) {
    ctx.fillStyle = '#f3f8f4'; ctx.fillRect(0, 0, VW, VH);
    const n = CH.beads.length;
    // 서열 수 카운터
    const cx = 16, cw = VW - 32, cy = 12, chh = PHONE ? 150 : 128;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(cx, cy, cw, chh, 16).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = n >= 3 ? '#16a34a' : '#d7e3da'; ctx.lineWidth = 2.5; rr(cx, cy, cw, chh, 16).stroke();
    D.text(VW / 2, cy + 28, n === 0 ? '구슬을 이어 붙이면 만들 수 있는 서열 수가 나타나요' : '구슬 ' + n + '개 사슬로 만들 수 있는 서열 수', { size: PHONE ? 14 : 16, weight: 800, color: '#14532d' });
    if (n > 0) {
      const settled = Math.abs(CH.dl - n * Math.log10(20)) < 0.004;
      const val = settled ? Math.pow(20, n) : Math.pow(10, CH.dl);
      D.text(VW / 2, cy + (PHONE ? 80 : 76), comma(val), { size: PHONE ? 31 : 38, weight: 800, color: '#15803d' });
      let eq = '';
      if (n === 1) eq = '20가지';
      else if (n <= 4) eq = Array(n).fill(20).join(' × ') + ' = 20' + sup(n);
      else eq = '20 × 20 × … × 20 (' + n + '번) = 20' + sup(n);
      if (n >= 6) eq += '  ≈ ' + (n === 10 ? '약 10조' : koNum(Math.pow(20, n)));
      D.text(VW / 2, cy + (PHONE ? 114 : 108), eq, { size: PHONE ? 13.5 : 15, weight: 700, color: '#475569' });
    } else {
      D.text(VW / 2, cy + 80, '20 × 20 × 20 × …', { size: PHONE ? 26 : 32, weight: 800, color: '#cbd5e1' });
    }
    // 사슬
    const sh = CH.shake > 0 ? Math.sin(CH.shake * 50) * 5 : 0;
    ctx.save(); ctx.translate(sh, 0);
    for (let i = 0; i < CH.max; i++) {
      const s = chainSlot(i);
      if (i < n) continue;
      ctx.strokeStyle = i === n ? '#16a34a' : '#c9d9cd'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      if (i === n && n < CH.max) D.ring(s.x, s.y, s.r + 4, t, { color: '#16a34a', speed: 1.1 });
      D.text(s.x, s.y + 5, String(i + 1), { size: 14, color: '#b6c8bb', weight: 800 });
    }
    // 연결선
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let i = 0; i < n - 1; i++) {
      if (chainSlot(i).row !== chainSlot(i + 1).row) continue;
      ctx.beginPath(); ctx.moveTo(CH.beads[i].x, CH.beads[i].y); ctx.lineTo(CH.beads[i + 1].x, CH.beads[i + 1].y); ctx.stroke();
    }
    CH.beads.forEach((b, i) => { const s = chainSlot(i); const sc = Math.max(0.2, b.pop); ctx.save(); ctx.translate(b.x, b.y); ctx.scale(sc, sc); bead(0, 0, s.r, b.t); ctx.restore(); });
    ctx.restore();
    // 참고 카드
    const ry = PHONE ? 500 : 340, rh = PHONE ? 100 : 100;
    ctx.fillStyle = 'rgba(255,255,255,.75)'; rr(cx, ry, cw, rh, 14).fill();
    ctx.strokeStyle = '#d7e3da'; ctx.lineWidth = 1.5; rr(cx, ry, cw, rh, 14).stroke();
    D.text(VW / 2, ry + 28, '구슬이 하나 늘 때마다 가짓수는 × 20!', { size: PHONE ? 14 : 15.5, weight: 800, color: '#15803d' });
    D.text(VW / 2, ry + 56, '실제 단백질: 인슐린 아미노산 51개 → 20' + sup(51) + ' ≈ 2×10' + sup(66) + '가지 중 하나', { size: PHONE ? 12 : 13.5, weight: 700, color: '#475569' });
    D.text(VW / 2, ry + 80, '헤모글로빈 한 사슬은 아미노산 146개예요', { size: PHONE ? 12 : 13.5, weight: 700, color: '#475569' });
    drawTray(t, '🫙 아래 구슬을 눌러 사슬에 이어 붙여요');
  }

  /* ======================================================
     화면 ③: 접힘과 기능 (열쇠–자물쇠)
     ====================================================== */
  const PROT = [
    { name: '산소 운반 단백질', seq: [2, 19, 3, 10, 5, 16, 16], key: 'o2', keyName: '산소(O₂)', col: '#ef4444', ok: '홈에 산소(O₂)가 꼭 맞아 붙잡아요' },
    { name: '항체', seq: [14, 2, 14, 3, 2, 16, 9], key: 'pathogen', keyName: '병원체', col: '#16a34a', ok: '홈에 병원체가 꼭 맞아 붙잡아요' },
  ];
  const FN = 7;
  const Pv = (t) => ((7 * t) % 20 - 9.5) * 2.4;
  function foldGeo() { return PHONE ? { cx: 232, cy: 352, R0: 100, wait: { x: 438, y: 290 }, sy: 110, sp: 62 } : { cx: 330, cy: 268, R0: 104, wait: { x: 640, y: 240 }, sy: 100, sp: 76 }; }
  function cupPos(i, seq) {
    const g = foldGeo(), phi = Math.PI - i * Math.PI / (FN - 1), r = g.R0 - Pv(seq[i]);
    return { x: g.cx + r * Math.cos(phi), y: g.cy + r * Math.sin(phi) };
  }
  function straightPos(i) { const g = foldGeo(); return { x: VW / 2 - (FN - 1) * g.sp / 2 + i * g.sp, y: g.sy + 24 }; }
  function foldMiss() { const F = S.fold, ref = PROT[F.prot].seq; return F.seq.map((t, i) => (t !== ref[i] ? i : -1)).filter((i) => i >= 0); }
  function startFold() {
    const F = S.fold; F.ph = 'fold'; F.t = 0; F.fit = foldMiss().length === 0; F.msgT = 0;
    F.key = F.key || { x: foldGeo().wait.x, y: foldGeo().wait.y, s: 0.6, sh: 0 };
  }
  function resetFold(prot) {
    const F = S.fold; F.prot = prot; F.seq = PROT[prot].seq.slice(); F.sel = -1; F.key = null; startFold();
  }
  function stepFold(dt) {
    const F = S.fold; if (!F.key) return;
    const g = foldGeo();
    F.t += dt;
    if (F.ph === 'fold' && F.t > 2.0) { F.ph = 'try'; F.t = 0; }
    else if (F.ph === 'try' && F.t > 1.15) {
      F.ph = 'done'; F.t = 0;
      if (F.fit) { F.fitSeen[F.prot] = true; parts.burst(g.cx, g.cy - 20, { count: 20, speed: 170, size: 4 }); Sound.success(); }
      else { F.missSeen = true; Sound.fail(); F.key.sh = 0.6; }
    }
    if (F.ph === 'done') F.msgT += dt;
    // 열쇠 목표
    let tx = g.wait.x, ty = g.wait.y, ts = 0.6;
    if (F.ph === 'try' || F.ph === 'done') {
      if (F.fit) { tx = g.cx; ty = g.cy; ts = 1; }
      else if (F.ph === 'try') { tx = g.cx; ty = g.cy - 92; ts = 0.95; }
      else { tx = g.wait.x; ty = g.wait.y; ts = 0.6; }
    }
    const k = F.key, rate = F.ph === 'try' ? 4 : 5;
    k.x = RM ? tx : SciSim.approach(k.x, tx, dt, rate); k.y = RM ? ty : SciSim.approach(k.y, ty, dt, rate); k.s = RM ? ts : SciSim.approach(k.s, ts, dt, rate);
    if (k.sh > 0) k.sh = Math.max(0, k.sh - dt);
  }
  function keyShape(kind, scale) {
    const F = S.fold, g = foldGeo(), ref = PROT[F.prot].seq;
    const kr = (i) => g.R0 - Pv(ref[i]) - 17.5;
    const rAt = (th) => {
      if (th <= Math.PI) {
        const f = (Math.PI - th) / (Math.PI / (FN - 1)), i0 = clamp(Math.floor(f), 0, FN - 2), u = (1 - Math.cos((f - i0) * Math.PI)) / 2;
        return lerp(kr(i0), kr(i0 + 1), u);
      }
      return lerp(kr(0), kr(FN - 1), (th - Math.PI) / Math.PI);
    };
    ctx.beginPath();
    for (let a = 0; a <= 64; a++) {
      const th = (a / 64) * Math.PI * 2, r = rAt(th), x = Math.cos(th) * r, y = Math.sin(th) * r;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    return rAt;
  }
  function drawKey(kx, ky, ks, kind, glow, shake) {
    const F = S.fold, col = PROT[F.prot].col;
    ctx.save(); ctx.translate(kx + (shake ? Math.sin(shake * 50) * 6 * Math.min(1, shake * 2) : 0), ky); ctx.scale(ks, ks);
    const rAt = keyShape(kind);
    const g = ctx.createRadialGradient(-26, -30, 8, 0, 0, 100);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, col); g.addColorStop(1, SciSim.color.shade(col, -0.35));
    D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = SciSim.color.shade(col, -0.45); ctx.lineWidth = 2.5; ctx.stroke();
    if (kind === 'pathogen') {
      ctx.fillStyle = SciSim.color.shade(col, -0.25);
      for (let a = 0; a < 7; a++) {
        const th = Math.PI + 0.35 + a * (Math.PI - 0.7) / 6, r = rAt(th);
        const x = Math.cos(th) * r, y = Math.sin(th) * r, nx = Math.cos(th), ny = Math.sin(th);
        ctx.beginPath(); ctx.moveTo(x - ny * 7, y + nx * 7); ctx.lineTo(x + nx * 15, y + ny * 15); ctx.lineTo(x + ny * 7, y - nx * 7); ctx.closePath(); ctx.fill();
      }
    }
    D.text(0, -22, PROT[F.prot].keyName, { size: 17, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.35)', strokeWidth: 3 });
    ctx.restore();
  }
  function drawFold(t) {
    const F = S.fold, g = foldGeo(), ref = PROT[F.prot].seq;
    ctx.fillStyle = '#f3f8f4'; ctx.fillRect(0, 0, VW, VH);
    if (!F.key) startFold();
    D.text(VW / 2, 26, PROT[F.prot].name + ' 사슬이 접히면 홈이 생겨요', { size: PHONE ? 15 : 18, weight: 800, color: '#14532d' });
    const miss = foldMiss();
    // 서열 표시줄 (펼친 순서)
    { const sp2 = 34, x0 = VW / 2 - (FN - 1) * sp2 / 2 + 22, y2 = 62;
      D.text(x0 - 40, y2 + 5, '서열', { size: 13.5, weight: 800, color: '#64748b' });
      F.seq.forEach((tt, i) => { bead(x0 + i * sp2, y2, 13, tt, { shadow: false, outline: miss.includes(i) ? '#e2464b' : null }); });
    }
    // 위치 계산
    const fp = clamp(F.ph === 'fold' ? F.t / 2.0 : 1, 0, 1);
    const pos = F.seq.map((tt, i) => {
      const a = straightPos(i), b = cupPos(i, F.seq);
      const f = RM ? (F.ph === 'fold' ? 1 : 1) : EASE.inOutCubic(clamp((F.t - i * 0.1) / 1.1, 0, 1)) * (F.ph === 'fold' ? 1 : 1);
      const ff = F.ph === 'fold' ? f : 1;
      const arc = Math.sin(ff * Math.PI) * (i % 2 ? 26 : -26);
      return { x: lerp(a.x, b.x, ff) + arc, y: lerp(a.y, b.y, ff) };
    });
    // 단백질 표면
    ctx.save();
    ctx.strokeStyle = 'rgba(34,197,94,.22)'; ctx.lineWidth = 50; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pos[0].x, pos[0].y);
    for (let i = 1; i < FN - 1; i++) { const mx = (pos[i].x + pos[i + 1].x) / 2, my = (pos[i].y + pos[i + 1].y) / 2; ctx.quadraticCurveTo(pos[i].x, pos[i].y, mx, my); }
    ctx.lineTo(pos[FN - 1].x, pos[FN - 1].y); ctx.stroke();
    ctx.restore();
    // 열쇠(뒤쪽) : 다 접히기 전에는 대기 위치
    const k = F.key;
    const inside = F.fit && (F.ph === 'done' || F.ph === 'try');
    if (!inside) drawKey(k.x, k.y, k.s, PROT[F.prot].key, 0, k.sh);
    // 연결선 + 구슬
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); pos.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
    if (inside) drawKey(k.x, k.y, k.s, PROT[F.prot].key, 0, 0);
    pos.forEach((q, i) => bead(q.x, q.y, 17, F.seq[i], { outline: F.sel === i ? '#1b2333' : null }));
    // 선택 · 불일치 표시
    if (F.sel >= 0) D.ring(pos[F.sel].x, pos[F.sel].y, 25, t, { color: '#2563eb', speed: 1.3, width: 3.5 });
    if (F.ph === 'done' && !F.fit) {
      miss.forEach((i) => {
        D.ring(pos[i].x, pos[i].y, 24, t, { color: '#e2464b', speed: 1.6, width: 3 });
        const gap = Pv(ref[i]) - Pv(F.seq[i]);
        D.label(pos[i].x, pos[i].y - 36, gap > 0 ? '틈' : '겹침', { bg: '#e2464b', size: 12.5 });
      });
    }
    // 번호
    if (F.ph === 'fold' || F.t < 0.4) { for (let i = 0; i < FN; i++) { const a = straightPos(i); D.text(a.x, a.y - 28, String(i + 1), { size: 12.5, color: '#94a3b8', weight: 800, alpha: 1 - fp }); } }
    // 상태 메시지
    let msg = '', bg = '#14532d';
    if (F.ph === 'fold') msg = '🧶 사슬이 서열에 따라 접히는 중…';
    else if (F.ph === 'try') msg = '🔑 ' + PROT[F.prot].keyName + '이(가) 홈에 들어가 볼게요…';
    else if (F.fit) { msg = '✅ ' + PROT[F.prot].ok; bg = '#15803d'; }
    else { msg = '⚠ 모양이 달라 ' + PROT[F.prot].keyName + '이(가) 맞물리지 않아요 → 기능 저하'; bg = '#b91c1c'; }
    D.label(PHONE ? VW / 2 : g.cx + 40, TR.top - (PHONE ? 66 : 64), msg, { bg, size: PHONE ? 12.5 : 14 });
    if (F.ph === 'done' && F.fit) D.check(g.cx + 60, g.cy - 70, 17, smooth(F.msgT / 0.5));
    // 안내
    const ins = F.sel >= 0 ? '🔄 ' + (F.sel + 1) + '번 구슬을 바꿀 구슬을 아래에서 눌러요' : '👆 접힌 사슬의 구슬을 눌러 고른 뒤 아래에서 다른 구슬을 눌러요';
    D.text(VW / 2, TR.top - (PHONE ? 40 : 38), ins, { size: PHONE ? 12 : 13.5, color: '#475569', weight: 700 });
    drawTray(t);
  }

  /* 단백질 도감 (짝짓기용) */
  const CATALOG = [
    { n: '헤모글로빈', where: '적혈구 속', fn: 1, kind: 'hb' },
    { n: '케라틴', where: '머리카락 · 손톱', fn: 2, kind: 'ke' },
    { n: '콜라겐', where: '피부 · 뼈 사이', fn: 3, kind: 'co' },
    { n: '인슐린', where: '이자에서 분비돼 혈액으로', fn: 4, kind: 'in' },
    { n: '항체', where: '혈액 속', fn: 5, kind: 'ab' },
  ];
  const FNS = ['선택해 주세요', '산소 운반', '머리카락·손톱 구성', '피부 구성', '혈당 조절', '병원체 인식'];
  function protIcon(kind, x, y, t) {
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
    if (kind === 'hb') { [[-14, -14], [14, -14], [-14, 14], [14, 14]].forEach((q, i) => D.sphere(q[0], q[1], 16, ['#ef4444', '#f97316', '#ef4444', '#f97316'][i], { shadow: false })); D.sphere(0, 0, 6, '#fde047', { gloss: false }); }
    else if (kind === 'ke') { ctx.strokeStyle = '#a16207'; ctx.lineWidth = 7; ctx.beginPath(); for (let a = 0; a <= 40; a++) { const yy = -32 + a * 1.6, xx = Math.sin(a * 0.55) * 14; a ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 4; ctx.beginPath(); for (let a = 0; a <= 40; a++) { const yy = -32 + a * 1.6, xx = Math.sin(a * 0.55 + 3.14) * 14; a ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    else if (kind === 'co') { ['#0ea5e9', '#38bdf8', '#7dd3fc'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.beginPath(); for (let a = 0; a <= 40; a++) { const yy = -32 + a * 1.6, xx = Math.sin(a * 0.4 + i * 2.1) * 12; a ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }); }
    else if (kind === 'in') { D.sphere(-10, 0, 17, '#8b5cf6', { shadow: false }); D.sphere(12, 6, 13, '#c4b5fd', { shadow: false }); }
    else { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, 2); ctx.lineTo(-22, -26); ctx.moveTo(0, 2); ctx.lineTo(22, -26); ctx.stroke(); D.sphere(-22, -26, 8, '#22c55e', { shadow: false }); D.sphere(22, -26, 8, '#22c55e', { shadow: false }); }
    ctx.restore();
  }
  function drawCatalog(t) {
    ctx.fillStyle = '#f3f8f4'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 34, '단백질 도감 : 어디에서 무슨 일을 할까요?', { size: PHONE ? 15 : 19, weight: 800, color: '#14532d' });
    const cols = PHONE ? 2 : 5, cwid = PHONE ? 244 : 148, chei = PHONE ? 190 : 330, gap = PHONE ? 12 : 8;
    const x0 = (VW - cols * cwid - (cols - 1) * gap) / 2;
    CATALOG.forEach((c, i) => {
      const col = i % cols, row = Math.floor(i / cols), x = x0 + col * (cwid + gap), y = 62 + row * (chei + 12);
      const st = S.fold.matchBad[i];
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, cwid, chei, 16).fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = S.fold.matchOK ? '#16a34a' : st ? '#e2464b' : '#d7e3da'; ctx.lineWidth = 2.5; rr(x, y, cwid, chei, 16).stroke();
      ctx.save(); ctx.translate(x + cwid / 2, y + (PHONE ? 72 : 110)); ctx.scale(PHONE ? 1 : 1.5, PHONE ? 1 : 1.5); protIcon(c.kind, 0, 0, t); ctx.restore();
      D.text(x + cwid / 2, y + chei - 74, c.n, { size: 18, weight: 800, color: '#14532d' });
      D.text(x + cwid / 2, y + chei - 48, '있는 곳', { size: 12, weight: 700, color: '#94a3b8' });
      D.text(x + cwid / 2, y + chei - 28, c.where, { size: PHONE ? 12.5 : 12.5, weight: 700, color: '#475569' });
      if (S.fold.matchOK) { D.text(x + cwid / 2, y + chei - 8, FNS[c.fn], { size: 13, weight: 800, color: '#15803d' }); }
    });
  }

  /* ======================================================
     화면 ④: 낫 모양 적혈구
     ====================================================== */
  const HB = [2, 19, 3, 10, 5, 16, 16, 17, 9, 1];
  function vesselGeo() { return PHONE ? { y: 430, h0: 50, nx: VW * 0.54, tissue: { x: VW - 84, w: 74 } } : { y: 346, h0: 48, nx: VW * 0.56, tissue: { x: VW - 88, w: 76 } }; }
  const vh = (x, G) => G.h0 - (G.h0 - 17) * Math.exp(-Math.pow((x - G.nx) / 64, 2));
  function resetFlow() { const K = S.sick; K.cells = []; K.spawn = 0; K.o2 = 1; K.maxStuck = 0; }
  function stepSick(dt) {
    const K = S.sick, G = vesselGeo(), mut = K.mut === 1;
    K.t[K.mut] += dt;
    K.spawn -= dt;
    if (K.spawn <= 0 && K.cells.length < 9) { K.cells.push({ x: -30, y: G.y + (Math.random() - 0.5) * 12, st: 0, ph: Math.random() * 6, o2: !mut }); K.spawn = 0.8; }
    const sorted = K.cells.slice().sort((a, b) => b.x - a.x);
    let stuck = 0, ahead = null;
    sorted.forEach((c) => {
      let v = 96;
      if (mut) {
        const stopX = ahead ? ahead.x - 46 : G.nx - 52;
        if (c.x >= stopX - 1 && (ahead ? ahead.stuck : true) && c.x < G.nx + 10) { c.stuck = true; c.x = Math.min(c.x, stopX); v = 0; }
        else c.stuck = false;
        if (c.stuck) { stuck++; v = 0; }
      } else c.stuck = false;
      c.x += v * dt; c.ph += dt * 3;
      if (!c.passed && c.x > G.tissue.x - 14) { c.passed = true; if (!mut) { K.pop = 1; parts.burst(G.tissue.x + 20, G.y, { count: 5, speed: 60, size: 2.5, life: 0.5, gravity: 0, colors: ['#38bdf8', '#fff'] }); } }
      ahead = c;
    });
    K.cells = K.cells.filter((c) => c.x < G.tissue.x + 8);
    K.maxStuck = Math.max(K.maxStuck, stuck);
    const targetO2 = mut ? clamp(1 - stuck * 0.2, 0.1, 1) : 1;
    K.o2 = RM ? targetO2 : SciSim.approach(K.o2, targetO2, dt, 1.2);
    K.pop = Math.max(0, K.pop - dt * 2);
    K.stuck = stuck;
  }
  function drawSickleCell(c, t) {
    const G = vesselGeo(), hh = vh(c.x, G), mut = S.sick.mut === 1;
    ctx.save(); ctx.translate(c.x, c.y + (c.stuck ? Math.sin(t * 14 + c.ph) * 0.8 : 0));
    if (!mut) {
      const sy = Math.min(1, (hh - 4) / 23), sx = 1 / Math.sqrt(Math.max(0.5, sy));
      ctx.scale(sx, sy);
      const g = ctx.createRadialGradient(-6, -6, 3, 0, 0, 24); g.addColorStop(0, '#f87171'); g.addColorStop(1, '#b91c1c');
      D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 23, 21, 0, 0, 6.283); ctx.fill(); }, { blur: 4, y: 2 });
      ctx.fillStyle = 'rgba(254,202,202,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0, 0, 6.283); ctx.fill();
    } else {
      ctx.rotate(-0.25);
      const g = ctx.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, '#dc2626'); g.addColorStop(1, '#7f1d1d');
      D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-30, -10); ctx.quadraticCurveTo(0, 26, 30, -10); ctx.quadraticCurveTo(0, 8, -30, -10); ctx.closePath(); ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = 'rgba(254,202,202,.55)'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-18 + k * 2, -5 + k * 3); ctx.quadraticCurveTo(0, 14 + k * 2, 18 - k * 2, -5 + k * 3); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawSick(t) {
    const K = S.sick, G = vesselGeo(), mut = K.mut === 1;
    ctx.fillStyle = '#f3f8f4'; ctx.fillRect(0, 0, VW, VH);
    // 헤모글로빈 사슬 띠
    const sy = 92, r = PHONE ? 16 : 18, spc = PHONE ? 44 : 50, nShow = PHONE ? 8 : 10;
    const total = nShow + 2.2, x0 = (VW - total * spc) / 2 + spc / 2;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(10, 40, VW - 20, 142, 14).fill(); }, { blur: 6, y: 2 });
    D.text(VW / 2, 62, '헤모글로빈 한 사슬 : 아미노산 146개', { size: PHONE ? 13.5 : 15.5, weight: 800, color: '#14532d' });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, sy + 8); ctx.lineTo(x0 + (nShow - 1) * spc, sy + 8); ctx.stroke();
    ctx.setLineDash([2, 8]); ctx.beginPath(); ctx.moveTo(x0 + (nShow - 1) * spc, sy + 8); ctx.lineTo(x0 + (nShow + 1.2) * spc, sy + 8); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < nShow; i++) {
      const tt = i === 5 ? (mut ? 2 : 16) : HB[i];
      const hi = i === 5, sc = hi ? 1 + 0.12 * Math.sin(t * 4) + K.popB * 0.3 : 1;
      ctx.save(); ctx.translate(x0 + i * spc, sy + 8); ctx.scale(sc, sc); bead(0, 0, r, tt); ctx.restore();
      D.text(x0 + i * spc, sy + 8 + r + 16, String(i + 1), { size: 11.5, color: hi ? '#e2464b' : '#94a3b8', weight: 800 });
    }
    bead(x0 + (nShow + 1.2) * spc, sy + 8, r, 19);
    D.text(x0 + (nShow + 1.2) * spc, sy + 8 + r + 16, '146', { size: 11.5, color: '#94a3b8', weight: 800 });
    const hx = x0 + 5 * spc;
    D.ring(hx, sy + 8, r + 7, t, { color: '#e2464b', speed: 1.1 });
    D.label(hx, 164, '6번째 : ' + (mut ? '발린 (V)' : '글루탐산 (E)'), { bg: mut ? '#b91c1c' : '#15803d', size: PHONE ? 12.5 : 13.5 });
    // 혈관
    const x1 = 14, x2 = VW - 14;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x1, G.y - vh(x1, G));
    for (let x = x1; x <= x2; x += 6) ctx.lineTo(x, G.y - vh(x, G));
    for (let x = x2; x >= x1; x -= 6) ctx.lineTo(x, G.y + vh(x, G));
    ctx.closePath();
    const vg = ctx.createLinearGradient(0, G.y - 50, 0, G.y + 50); vg.addColorStop(0, '#fecdd3'); vg.addColorStop(0.5, '#ffe4e6'); vg.addColorStop(1, '#fda4af');
    ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    D.text(G.nx, G.y - G.h0 - 14, '좁은 모세 혈관', { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#be123c' });
    // 조직
    const T = G.tissue;
    const tc = SciSim.color.mix('#cbd5e1', '#38bdf8', K.o2);
    D.shadow(() => { ctx.fillStyle = tc; rr(T.x, G.y - 62, T.w, 124, 14).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(T.x, G.y - 62, T.w, 124, 14).stroke();
    if (K.pop > 0) D.glow(T.x + T.w / 2, G.y, 50 * K.pop + 20, '#38bdf8', 0.5 * K.pop);
    D.text(T.x + T.w / 2, G.y - 70, '몸의 조직', { size: PHONE ? 12 : 13, weight: 800, color: '#334155' });
    D.text(T.x + T.w / 2, G.y + 6, Math.round(K.o2 * 100) + '%', { size: PHONE ? 17 : 19, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.3)', strokeWidth: 3 });
    D.text(T.x + T.w / 2, G.y + 26, 'O₂ 공급', { size: 11.5, weight: 700, color: '#fff', stroke: 'rgba(0,0,0,.3)', strokeWidth: 3 });
    // 적혈구
    K.cells.forEach((c) => drawSickleCell(c, t));
    // 해설
    const txt = mut ? '⚠ 변이 헤모글로빈이 서로 달라붙어 적혈구가 낫 모양으로 → 좁은 혈관이 막혀요' : '✅ 정상 적혈구는 둥글고 유연해서 좁은 혈관도 통과해 산소를 날라요';
    D.label(VW / 2, G.y + G.h0 + 54, txt, { bg: mut ? '#b91c1c' : '#15803d', size: PHONE ? 12 : 14 });
    if (mut && K.stuck >= 3) D.text(G.nx - 40, G.y + G.h0 + 22, '🚧 막힘!', { size: 16, weight: 800, color: '#b91c1c' });
    D.text(VW / 2, VH - 20, '구슬 146개 중 단 1개가 달라졌을 뿐이에요', { size: PHONE ? 12.5 : 14, color: '#475569', weight: 700 });
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { digest: '🍳 먹은 단백질', chain: '🔗 구슬 잇기', fold: '🧶 모양과 기능', sick: '🩸 낫 모양 적혈구' };
  const DEFSUB = { digest: '', chain: '', fold: 'lab', sick: '' };
  function setMode(m, sub) {
    if (S.mode !== m || (sub != null && S.sub !== sub)) S.fade = 1;
    S.mode = m; S.sub = sub != null ? sub : DEFSUB[m]; S.drag = null;
    if (m === 'fold' && !S.fold.key && S.sub === 'lab') startFold();
    updateCtl();
  }
  function ensure(m, sub) { if (S.mode !== m || (sub != null && S.sub !== sub)) setMode(m, sub); }
  function updateCtl() {
    const key = S.mode + (S.sub ? ':' + S.sub : '');
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || toks.includes(S.mode)); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#modeSeg').hidden = !(game && game.free);
    $$('#foodSeg button').forEach((b) => b.classList.toggle('on', b.dataset.f === S.dg.food));
    $$('#protSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.p === S.fold.prot));
    $$('#mutSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.m === S.sick.mut));
    const dg = S.dg;
    $('#bPlay').textContent = dg.done || dg.p >= 1 ? '↺ 다시 재생' : dg.playing ? '⏸ 잠깐 멈춤' : dg.p > 0 ? '▶ 이어서 재생' : '▶ 소화 장면 재생';
    $('#oLen').textContent = CH.beads.length + ' / ' + CH.max + '개';
  }
  function buildMatch() {
    const box = $('#matchRows'); box.innerHTML = '';
    CATALOG.forEach((c, i) => {
      const row = document.createElement('div'); row.className = 'match-row';
      row.innerHTML = '<b>' + c.n + '</b>';
      const sel = document.createElement('select'); sel.setAttribute('aria-label', c.n + '이(가) 하는 일');
      FNS.forEach((f, k) => { const o = document.createElement('option'); o.value = k; o.textContent = f; sel.appendChild(o); });
      sel.addEventListener('change', () => { sel.classList.remove('bad', 'good'); S.fold.matchBad[i] = false; Sound.click(); });
      row.appendChild(sel); box.appendChild(row);
    });
    const p = document.createElement('p'); p.className = 'ctrl-note'; p.textContent = '화면의 단백질 도감에서 "있는 곳"을 보고 하는 일을 골라요.';
    box.appendChild(p);
  }
  function matchResult() {
    const sels = $$('#matchRows select'), bad = [];
    sels.forEach((s, i) => { const v = +s.value; s.classList.remove('bad', 'good'); if (v === 0) bad.push(i); else if (v !== CATALOG[i].fn) bad.push(i); else s.classList.add('good'); });
    S.fold.matchBad = CATALOG.map((c, i) => bad.includes(i));
    sels.forEach((s, i) => { if (bad.includes(i) && +s.value !== 0) s.classList.add('bad'); });
    return bad;
  }

  $('#foodSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setFood(b.dataset.f); } });
  $('#bPlay').addEventListener('click', setPlay);
  $('#bUndo').addEventListener('click', chainUndo);
  $('#bClear').addEventListener('click', chainClear);
  $('#bSeq').addEventListener('click', () => {
    const v = parseFloat(String($('#inSeq').value).replace(/[, ]/g, ''));
    if (!isFinite(v)) { toast('숫자로 입력해요', '', 1200); return; }
    if (v === 8000) { CH.solved = true; S.chain.solved = true; Sound.success(); toast('정답! 20 × 20 × 20 = 8,000', 'good', 2000); }
    else { Sound.fail(); toast(v === 60 ? '더하기가 아니라 곱하기예요. 자리마다 20가지씩 고를 수 있어요.' : '첫째, 둘째, 셋째 구슬 자리마다 20가지씩 고를 수 있으니 20 × 20 × 20 이에요.', 'bad', 3200); }
  });
  $('#inSeq').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#bSeq').click(); });
  $('#protSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); resetFold(+b.dataset.p); updateCtl(); } });
  $('#bOrig').addEventListener('click', () => { Sound.click(); S.fold.seq = PROT[S.fold.prot].seq.slice(); S.fold.sel = -1; startFold(); });
  $('#bRefold').addEventListener('click', () => { Sound.click(); startFold(); });
  $('#mutSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sick.mut = +b.dataset.m; S.sick.seen[S.sick.mut] = true; S.sick.popB = 1; resetFlow(); updateCtl(); });
  $('#bFlow').addEventListener('click', () => { Sound.click(); resetFlow(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }

  /* ---------- 포인터 ---------- */
  function foldBeadAt(p) {
    const F = S.fold;
    for (let i = 0; i < FN; i++) {
      const a = straightPos(i), b = cupPos(i, F.seq);
      const f = F.ph === 'fold' ? EASE.inOutCubic(clamp((F.t - i * 0.1) / 1.1, 0, 1)) : 1;
      const q = { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
      if (Math.hypot(p.x - q.x, p.y - q.y) <= 24) return i;
    }
    return -1;
  }
  function dropBead(t, p, tapped) {
    if (S.mode === 'chain') {
      if (tapped || p.y < TR.top - 6) { const q = trayPos(t); addBead(t, tapped ? q.x : p.x, tapped ? q.y : p.y); }
    } else if (S.mode === 'fold' && S.sub === 'lab') {
      const F = S.fold;
      if (F.sel < 0) { showHint('먼저 접힌 사슬에서 바꿀 구슬을 눌러요', 2500); return; }
      if (!(tapped || p.y < TR.top - 6)) return;
      if (F.seq[F.sel] === t) { showHint('같은 구슬이에요. 다른 구슬을 골라요', 2200); return; }
      F.seq[F.sel] = t; Sound.tick(); startFold();
      const g = cupPos(F.sel, F.seq); parts.burst(g.x, g.y, { count: 8, speed: 90, size: 3, life: 0.5, colors: [AA[t].col, '#fff'] });
    }
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'chain' || (S.mode === 'fold' && S.sub === 'lab')) {
        const k = trayHit(p);
        if (k >= 0) { S.lastT = k; S.drag = { t: k, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true; }
        if (S.mode === 'fold') {
          const i = foldBeadAt(p);
          if (i >= 0) { S.fold.sel = S.fold.sel === i ? -1 : i; Sound.click(); return false; }
        }
      }
      return false;
    },
    move(p) { const d = S.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true; },
    up(p) { const d = S.drag; if (!d) return; S.drag = null; dropBead(d.t, p, !d.moved); },
    hover(p) {
      if (S.mode === 'chain' || (S.mode === 'fold' && S.sub === 'lab')) {
        S.hoverT = trayHit(p);
        if (S.hoverT >= 0) return 'pointer';
        if (S.mode === 'fold' && foldBeadAt(p) >= 0) return 'pointer';
      } else S.hoverT = -1;
      return 'default';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.hoverT = -1; });
  // 구슬을 눌러 고른 직후에도 이름이 보이도록 (터치)
  view.canvas.addEventListener('pointerdown', (e) => {
    if (S.mode === 'fold' && S.sub === 'lab') {
      const p = view.toLocal(e), i = foldBeadAt(p);
      if (i >= 0) S.lastT = S.fold.seq[i];
    }
  });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'digest') {
      const p = S.dg.p, st = stageOf(p);
      L1 = '지금 단계'; a = p === 0 ? '재생 전' : STAGE_NAMES[st];
      L2 = '구슬(아미노산)'; b = p < 0.30 ? '사슬로 이어짐' : p < 0.84 ? '낱개로 끊어짐' : '새 순서로 이어짐';
      L3 = '아미노산 수'; c = NB + '개 (같은 개수)';
    } else if (S.mode === 'chain') {
      const n = CH.beads.length;
      L1 = '이어 붙인 구슬'; a = n + ' / 10개';
      L2 = '가능한 서열 수'; b = n ? '20' + sup(n) + (n >= 6 ? '' : ' = ' + comma(Math.pow(20, n))) : '—';
      L3 = '아미노산 종류'; c = '20종';
    } else if (S.mode === 'fold' && S.sub === 'match') {
      L1 = '짝지은 단백질'; a = $$('#matchRows select').filter((s) => +s.value > 0).length + ' / 5';
      L2 = '단백질'; b = '아미노산 사슬'; L3 = '결정하는 것'; c = '모양 → 기능';
    } else if (S.mode === 'fold') {
      const F = S.fold, miss = foldMiss();
      L1 = '바뀐 구슬'; a = miss.length + '개';
      L2 = '접힌 모양'; b = F.ph === 'fold' ? '접히는 중' : miss.length ? '원래와 달라요' : '원래 모양';
      L3 = '열쇠 맞물림'; c = F.ph !== 'done' ? '시험 중…' : F.fit ? '꼭 맞음 ✅' : '안 맞음 ⚠';
    } else {
      const K = S.sick;
      L1 = '6번째 구슬'; a = K.mut ? '발린 (V)' : '글루탐산 (E)';
      L2 = '적혈구 모양'; b = K.mut ? '낫 모양' : '둥근 모양';
      L3 = '산소 공급'; c = Math.round(K.o2 * 100) + '%';
    }
    const key = L1 + a + L2 + b + L3 + c; if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) { setFood('egg'); S.dg.p = 0; setMode('digest'); }
    else if (li === 1) { CH.beads = []; CH.dl = 0; S.chain.solved = false; $('#inSeq').value = ''; setMode('chain', ''); }
    else if (li === 2) { S.fold.fitSeen = [false, false]; S.fold.missSeen = false; S.fold.matchOK = false; S.fold.matchBad = []; resetFold(0); buildMatch(); setMode('fold', 'lab'); }
    else { S.sick.t = [0, 0]; S.sick.seen = [false, false]; S.sick.mut = 0; S.sick.popB = 0; resetFlow(); setMode('sick', ''); }
  }
  const levels = [
    {
      title: '먹은 단백질은 어디로 갈까?', short: '먹은 단백질', icon: '🥚', phase: '관찰',
      features: ['digest'],
      intro: '<p class="si-q">❓ 탐구 질문: 고기와 두부를 먹으면 어떻게 우리 몸의 단백질이 될까? 단백질은 왜 종류가 그렇게 많을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 소화 효소가 단백질을 <b>아미노산</b>으로 분해한다고 배웠어요(중2 Ⅵ). 그 아미노산은 그 뒤에 어디로 갈까요?</div>' +
        '<p>달걀이나 두부 속 단백질이 소화되어 낱개 구슬(아미노산)이 되고, 흡수된 뒤 세포에서 <b>새 단백질로 다시 조립</b>되는 과정을 따라가 봐요. 구슬 하나가 아미노산 한 개이고, 구슬의 색은 아미노산의 종류예요.</p>',
      setup() { enterLevel(0); },
      recap: '단백질은 아미노산이 이어진 사슬이에요. 소화되면 아미노산 낱개가 되고, 세포에서 새 순서로 이어져 우리 몸의 단백질이 돼요.',
      summary: '<ul><li>단백질의 기본 단위체는 <b>아미노산</b>이에요.</li><li>먹은 단백질 → <b>소화</b>(아미노산 낱개로 분해) → <b>흡수</b>(소장 벽을 지나 혈관으로) → 세포에서 아미노산을 <b>새 순서로 이어</b> 몸의 단백질 합성.</li><li>음식 단백질과 내 몸의 단백질은 같은 20종 아미노산이 <b>다른 순서</b>로 이어진 것이에요.</li></ul>',
      missions: [
        {
          title: '소화 장면 끝까지 보기',
          goal: '<b>▶ 소화 장면 재생</b>을 눌러 먹은 단백질이 새 단백질로 조립될 때까지 지켜보세요.',
          hint: '재생 버튼을 누르고 구슬이 어떻게 변하는지 보세요. 약 17초 걸려요. 달걀과 두부를 바꿔 볼 수도 있어요.',
          setup() { ensure('digest'); },
          check: () => S.dg.done, hold: 0.3,
          status: () => ['① 사슬', '② 소화', '③ 흡수', '④ 조립'].map((s, i) => mark(i === 3 ? S.dg.done : S.dg.reached[i]) + ' ' + s).join(' · '),
          explain: '단백질은 소화 효소에 의해 기본 단위체인 <b>아미노산</b>으로 분해되고, 소장에서 흡수되어 혈관을 따라 세포로 가요. 세포에서는 이 아미노산들을 <b>새로운 순서</b>로 이어 우리 몸에 필요한 단백질을 만들어요.',
        },
        {
          type: 'quiz', title: '단백질의 기본 단위체',
          goal: '단백질이 소화될 때 최종적으로 만들어지는 <b>기본 단위체</b>는?',
          setup() { ensure('digest'); },
          choices: ['포도당', '아미노산', '지방산', '뉴클레오타이드'],
          answer: 1,
          feedback: ['포도당은 녹말 같은 탄수화물의 단위체예요.', '', '지방산은 지방을 이루는 성분이에요.', '뉴클레오타이드는 핵산(DNA)의 단위체예요. 다음 차시에서 만나요!'],
          explain: '단백질은 <b>아미노산</b>이 수십~수천 개 이어진 물질이에요. 아미노산 같은 기본 단위체가 이어져 큰 물질이 만들어지는 것은 규산염 광물(Si–O 사면체)과 같은 원리예요.',
        },
      ],
    },
    {
      title: '구슬 잇기: 20종으로 만드는 수많은 단백질', short: '구슬 잇기', icon: '🔗', phase: '모형',
      features: ['chain'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 단백질이 아미노산으로 분해되었다가 세포에서 다시 이어져 새 단백질이 되는 것을 봤어요.</div>' +
        '<p>사람 몸의 단백질을 만드는 아미노산은 <b>20종</b>이에요. 20종 구슬을 골라 사슬로 이어 보고, 구슬이 늘어날수록 만들 수 있는 <b>서열(배열 순서)</b>이 얼마나 많아지는지 세어 봐요. (아미노산이 이어진 결합은 <b>펩타이드 결합</b>이라고 불러요. 구체적인 구조식은 다루지 않아요.)</p>',
      setup() { enterLevel(1); },
      recap: '아미노산은 20종뿐이지만, 이어 붙이는 순서와 길이에 따라 만들 수 있는 사슬(단백질)은 20ⁿ가지로 엄청나게 많아요.',
      summary: '<ul><li>단백질을 이루는 아미노산은 <b>20종</b>. 아미노산이 <b>펩타이드 결합</b>으로 이어져 사슬이 돼요.</li><li>길이 n인 사슬의 서열 수 = 20ⁿ : 2개 <b>400</b>, 3개 <b>8,000</b>, 10개 약 <b>10조</b>가지.</li><li>인슐린은 아미노산 51개, 헤모글로빈 한 사슬은 146개 → 가능한 서열은 상상할 수 없이 많아요.</li><li>단백질의 종류가 많은 까닭은 아미노산의 <b>종류·배열 순서·길이</b>가 다양하기 때문이에요.</li></ul>',
      missions: [
        {
          title: '5개짜리 사슬 만들기',
          goal: '아래 20종 구슬을 눌러(또는 끌어다 놓아) <b>구슬 5개 이상</b>을 이어 붙이세요. 구슬이 늘 때 위쪽 숫자를 지켜봐요.',
          hint: '구슬 하나를 누를 때마다 사슬 끝에 이어 붙어요. 10개까지 이어 보면 가짓수가 약 10조가 돼요!',
          setup() { ensure('chain', ''); },
          check: () => CH.beads.length >= 5, hold: 0.7,
          status: () => mark(CH.beads.length >= 5) + ' 이어 붙인 구슬 ' + CH.beads.length + ' / 5개',
          explain: '구슬을 하나 더 이을 때마다 고를 수 있는 구슬이 <b>20가지</b>이므로 가능한 서열 수가 <b>20배</b>씩 늘어나요. 구슬 2개는 20×20=400가지, 5개는 20⁵=3,200,000가지예요.',
        },
        {
          title: '서열 수 계산하기',
          goal: '구슬 <b>3개</b>짜리 사슬로 만들 수 있는 서열은 모두 몇 가지일까요? 계산해서 입력해요.',
          hint: '첫째 자리 20가지 × 둘째 자리 20가지 × 셋째 자리 20가지예요.',
          setup() { ensure('chain', 'calc'); },
          check: () => S.chain.solved, hold: 0.3,
          status: () => mark(S.chain.solved) + ' 20 × 20 × 20 계산',
          explain: '자리마다 20가지를 고를 수 있으니 20×20×20 = <b>8,000가지</b>예요. 구슬을 10개로 늘리면 20¹⁰ ≈ 10조 가지! 아미노산 종류는 20가지뿐인데도 배열 순서가 다르면 서로 다른 단백질이 될 수 있어요.',
        },
        {
          type: 'quiz', title: '왜 단백질이 수없이 많을까?',
          goal: '아미노산은 20종뿐인데 단백질의 종류가 수없이 많은 까닭은?',
          setup() { ensure('chain', ''); },
          choices: ['아미노산의 종류가 계속 새로 생겨나기 때문이다', '아미노산의 종류가 같아도 배열 순서와 길이가 다양해서 서로 다른 단백질이 되기 때문이다', '단백질마다 서로 다른 원소로만 이루어져 있기 때문이다', '음식마다 20종보다 훨씬 많은 아미노산이 들어 있기 때문이다'],
          answer: 1,
          feedback: ['사람 몸의 단백질을 만드는 아미노산은 20종으로 정해져 있어요.', '', '단백질을 이루는 단위체는 모두 아미노산이에요. 다른 점은 아미노산의 배열이에요.', '음식 속 단백질도 같은 20종 아미노산으로 되어 있어요.'],
          explain: '같은 20종 구슬이라도 <b>배열 순서와 길이</b>가 달라지면 서로 다른 단백질이 돼요. 레고 블록 몇 종류로 수많은 작품을 만드는 것과 같아요.',
        },
      ],
    },
    {
      title: '모양과 기능: 서열이 모양을, 모양이 기능을 정해요', short: '모양과 기능', icon: '🧶', phase: '탐구',
      features: ['fold'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 아미노산의 배열 순서와 길이가 달라지면 서로 다른 단백질이 된다고 했어요. 배열이 다르면 단백질은 실제로 무엇이 달라질까요?</div>' +
        '<p>구슬 사슬은 가만히 있지 않고 <b>접혀서 입체 구조</b>가 돼요. 이 모양에는 특정 분자가 꼭 맞게 들어가는 <b>홈</b>이 생겨요. 서열을 하나 바꾸면 모양과 기능이 어떻게 달라지는지 시험해 봐요.</p>',
      setup() { enterLevel(2); },
      recap: '아미노산의 배열이 단백질이 접히는 모양(입체 구조)을 정하고, 그 모양이 단백질의 기능을 정해요.',
      summary: '<ul><li>아미노산 사슬은 <b>접혀서 입체 구조</b>가 돼요. 아미노산의 <b>종류와 배열 순서</b>가 접힘(모양)을 정해요.</li><li>단백질은 모양에 맞는 분자를 붙잡아요(열쇠–자물쇠): 헤모글로빈은 산소, 항체는 병원체.</li><li>서열이 바뀌면 → 모양이 달라지고 → 맞물리지 못해 <b>기능이 달라져요</b>.</li><li>기능 예: 헤모글로빈(산소 운반), 케라틴(머리카락·손톱), 콜라겐(피부), 인슐린(혈당 조절), 항체(병원체 인식).</li></ul>',
      missions: [
        {
          title: '서열 바꿔 모양 비교하기',
          goal: '① 원래 서열이 접히면 열쇠가 <b>꼭 맞는지</b> 보고, ② 사슬의 구슬을 눌러 고른 뒤 아래 구슬로 <b>한 개만 바꿔</b> 맞물리는지 비교해 보세요.',
          hint: '접힌 사슬의 구슬을 누르면 파란 고리가 생겨요. 그다음 아래 구슬 중 다른 색을 누르면 바뀌고 다시 접혀요.',
          setup() { ensure('fold', 'lab'); },
          check: () => S.fold.fitSeen.some(Boolean) && S.fold.missSeen, hold: 0.5,
          status: () => mark(S.fold.fitSeen.some(Boolean)) + ' 원래 서열: 맞물림 · ' + mark(S.fold.missSeen) + ' 바꾼 서열: 안 맞음',
          explain: '구슬 한 개가 달라지면 그 부분이 <b>튀어나오거나 들어가</b> 홈의 모양이 달라져요. 모양이 달라지면 열쇠(산소, 병원체)가 꼭 맞게 들어가지 못해요. 서열 → 모양 → 기능의 순서로 정해져요.',
        },
        {
          title: '하는 일 짝짓기',
          goal: '단백질 5가지가 <b>하는 일</b>을 골라 짝지은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '도감 카드의 "있는 곳"을 보세요. 적혈구 속 → 산소, 이자에서 분비 → 혈당, 혈액 속에서 병원체를 만나요.',
          manual: true,
          setup() { ensure('fold', 'match'); },
          check() {
            const bad = matchResult();
            if (!bad.length) { S.fold.matchOK = true; parts.burst(VW / 2, VH / 2, { count: 16, speed: 160, size: 4 }); return true; }
            const empty = $$('#matchRows select').filter((s) => +s.value === 0).length;
            if (empty) return '아직 고르지 않은 단백질이 <b>' + empty + '개</b> 있어요.';
            return bad.map((i) => '<b>' + CATALOG[i].n + '</b>').join(', ') + '의 하는 일을 다시 생각해 보세요.';
          },
          explain: '<b>헤모글로빈</b>은 산소를 운반하고, <b>케라틴</b>은 머리카락과 손톱을, <b>콜라겐</b>은 피부를 이루어요. <b>인슐린</b>은 혈당을 조절하고, <b>항체</b>는 병원체를 알아봐요. 모두 아미노산 사슬이지만 서열과 모양이 달라 하는 일이 달라요.',
        },
        {
          type: 'quiz', title: '모양이 기능을 정하는 까닭',
          goal: '항체가 <b>특정 병원체만</b> 붙잡을 수 있는 까닭은?',
          setup() { ensure('fold', 'lab'); },
          choices: ['항체의 접힌 모양이 그 병원체의 모양과 꼭 맞기 때문이다', '항체는 모든 병원체와 똑같이 달라붙기 때문이다', '항체는 아미노산이 모두 같은 종류이기 때문이다', '병원체가 항체의 모양에 맞춰 바뀌기 때문이다'],
          answer: 0,
          feedback: ['', '항체는 맞는 모양의 병원체만 붙잡아요. 그래서 병원체마다 다른 항체가 필요해요.', '항체도 여러 종류의 아미노산이 특정한 순서로 이어져 있어요.', '병원체의 모양은 항체와 상관없이 정해져 있어요. 항체가 그 모양에 맞는 거예요.'],
          explain: '단백질의 기능은 <b>입체 구조(모양)</b>에 따라 정해져요. 항체의 홈과 병원체가 열쇠–자물쇠처럼 꼭 맞을 때만 붙잡을 수 있어요.',
        },
      ],
    },
    {
      title: '낫 모양 적혈구: 아미노산 한 개의 차이', short: '낫 모양 적혈구', icon: '🩸', phase: '적용',
      features: ['sick'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 서열이 달라지면 모양이, 모양이 달라지면 기능이 달라진다고 했어요. 구슬이 <b>딱 하나</b>만 바뀌어도 그럴까요?</div>' +
        '<p>적혈구 속 <b>헤모글로빈</b> 한 사슬은 아미노산 146개로 되어 있어요. 6번째 아미노산 하나(글루탐산 → 발린)가 바뀐 사람은 적혈구가 낫 모양이 되는 <b>낫 모양 적혈구 빈혈증</b>에 걸려요. 정상과 변이를 비교해 봐요. (유전 정보가 단백질로 만들어지는 과정은 3단원에서 배워요.)</p>',
      setup() { enterLevel(3); },
      recap: '아미노산 단 한 개가 바뀌어도 단백질의 모양과 기능이 달라질 수 있어요.',
      summary: '<ul><li>헤모글로빈 한 사슬은 아미노산 <b>146개</b>. 정상은 6번째가 <b>글루탐산(E)</b>이에요.</li><li>6번째가 <b>발린(V)</b>으로 바뀌면 헤모글로빈이 서로 달라붙어 적혈구가 <b>낫 모양</b>이 되고, 좁은 혈관을 막아 산소 운반이 줄어요 (낫 모양 적혈구 빈혈증).</li><li>아미노산 <b>1개</b>의 차이도 모양과 기능을 크게 바꿀 수 있어요.</li></ul>',
      missions: [
        {
          title: '정상과 변이 비교하기',
          goal: '<b>정상</b>과 <b>변이</b> 헤모글로빈을 각각 보면서, 적혈구가 좁은 혈관을 지나는 모습을 관찰하세요. (변이는 혈관이 막힐 때까지)',
          hint: '오른쪽의 두 버튼을 번갈아 눌러요. 정상은 3초 이상, 변이는 적혈구가 3개 이상 쌓일 때까지 지켜봐요.',
          setup() { ensure('sick', ''); S.sick.seen[S.sick.mut] = true; },
          check: () => S.sick.t[0] >= 3 && S.sick.t[1] >= 3 && S.sick.maxStuck >= 3, hold: 0.4,
          status: () => mark(S.sick.t[0] >= 3) + ' 정상 관찰 · ' + mark(S.sick.t[1] >= 3 && S.sick.maxStuck >= 3) + ' 변이 관찰 (막힘 ' + Math.min(S.sick.maxStuck, 3) + '/3)',
          explain: '정상 적혈구는 <b>둥글고 유연</b>해서 좁은 혈관을 지나가요. 변이 헤모글로빈은 서로 달라붙어 적혈구가 <b>낫 모양</b>으로 굳고, 혈관이 막혀 조직에 산소가 덜 가요. 달라진 것은 사슬 146개 중 구슬 단 <b>1개</b>예요.',
        },
        {
          type: 'quiz', title: '아주 작은 변화도 기능을 바꿀까?',
          goal: '146개 중 아미노산 <b>1개</b>가 바뀌는 것만으로 단백질의 기능이 달라질 수 있을까요?',
          setup() { ensure('sick', ''); },
          choices: ['달라질 수 있다. 서열이 바뀌면 모양이 달라지고 기능도 달라질 수 있기 때문이다', '달라질 수 없다. 나머지 145개가 그대로이기 때문이다', '아미노산이 10개 이상 바뀔 때만 달라진다', '기능은 그대로이고 색깔만 달라진다'],
          answer: 0,
          feedback: ['', '낫 모양 적혈구 빈혈증이 바로 그 반례예요. 1개만 바뀌어도 기능이 크게 달라졌죠.', '낫 모양 적혈구는 단 1개의 변화로 생겨요.', '색이 아니라 단백질의 모양과 기능이 달라졌어요.'],
          explain: '단백질의 구조와 기능은 아미노산 배열에 민감해서, <b>1개</b>만 바뀌어도 기능이 달라질 수 있어요. (물론 위치에 따라 영향이 큰 경우와 작은 경우가 있어요.)',
        },
        {
          type: 'quiz', title: '낫 모양 적혈구에서 바뀐 것',
          goal: '낫 모양 적혈구 빈혈증에서 정상 헤모글로빈과 <b>달라진 것</b>은?',
          setup() { ensure('sick', ''); },
          choices: ['6번째 아미노산이 글루탐산에서 발린으로 바뀌었다', '아미노산의 종류가 20종에서 21종으로 늘었다', '사슬의 길이가 146개에서 6개로 줄었다', '헤모글로빈이 아미노산이 아닌 포도당으로 이루어졌다'],
          answer: 0,
          feedback: ['', '아미노산은 여전히 20종 중에서 골라요. 바뀐 것은 6번째 구슬의 종류예요.', '사슬 길이는 146개로 같아요.', '헤모글로빈도 아미노산이 이어진 단백질이에요.'],
          explain: '아미노산 <b>6번째 한 자리</b>가 글루탐산(E)에서 발린(V)으로 바뀌어 헤모글로빈의 모양과 성질이 달라졌어요. 그래서 적혈구 모양도 바뀌었답니다.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-protein', mount: '#game', badge: '단백질 박사', homeHref: '../../index.html#h1a',
    featureLabels: { digest: '🍳 소화 · 흡수 · 조립 장면', chain: '🫙 아미노산 구슬 20종 · 서열 수 카운터', fold: '🧶 사슬 접기 · 🔑 열쇠–자물쇠 시험', sick: '🩸 정상 / 변이 적혈구 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  buildDigest('egg'); buildMatch(); resetFlow(); S.sick.popB = 0;
  S.fold.seq = PROT[0].seq.slice();
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'digest') stepDigest(dt);
    else if (S.mode === 'chain') stepChain(dt);
    else if (S.mode === 'fold') { if (S.sub === 'lab' || !S.fold.key) stepFold(dt); }
    else if (S.mode === 'sick') { stepSick(dt); S.sick.popB = Math.max(0, S.sick.popB - dt * 2); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'digest') drawDigest(t, dt);
    else if (S.mode === 'chain') drawChain(t);
    else if (S.mode === 'fold') { if (S.sub === 'match') drawCatalog(t); else drawFold(t); }
    else drawSick(t);
    // 끌고 있는 구슬
    if (S.drag) { ctx.save(); ctx.globalAlpha = 0.95; ctx.translate(S.drag.x, S.drag.y); ctx.scale(1.2, 1.2); bead(0, 0, 18, S.drag.t); ctx.restore(); }
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, CH, PROT, VW, VH, get game() { return game; }, setMode, enterLevel, updateCtl, trayPos, chainSlot, foldGeo, cupPos, straightPos, foldMiss, startFold,
    setPlay, setFood,
    seekDigest(p) { S.dg.p = p; S.dg.playing = false; S.dg.done = p >= 1; if (p >= 1) S.dg.reached = [true, true, true, true]; updateCtl(); },
    addBeads(n) { for (let i = 0; i < n; i++) addBead(i % 20, 100, 400); },
    foldReplace(i, t) { S.fold.seq[i] = t; startFold(); },
    skipFold() { S.fold.t = 99; },
  };
})();
