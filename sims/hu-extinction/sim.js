/* =========================================================
   행성우주과학 Ⅲ. 은하와 우주 - 성간 소광과 티끌 (3차시)
   성취기준 [12행우03-02] 성간 소광 자료를 통해 성간 티끌의 존재를 추론하고, 성간 티끌의 특징을 설명할 수 있다.
   ① 관찰: 별 계수 (하늘 16칸의 별 수, 암흑 성운 칸, 가시광선 ↔ 적외선)
   ② 분석: 적색화 (U·B·V·R·I·K 소광 A_λ, 색 초과 E(B − V))
   ③ 적용: 거리 보정 (m − M = 5 log d − 5 + A_V)
   ④ 설명: 성간 물질 (기체 상태 5종, 티끌의 특징)
   다루지 않음: 소광 곡선의 이론(Mie 산란 계산), 편광 소광, 티끌 형성·파괴 과정. 적색화 ≠ 적색 편이.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  const f0 = (x) => String(Math.round(x));
  const fN = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const f1 = (x) => fN(x, 1), f2 = (x) => fN(x, 2), f3 = (x) => fN(x, 3);
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const clickable = (el, fn) => el.addEventListener('click', () => { Sound.click(); fn(el); });
  const sup = (n) => String(n).split('').map((c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c])).join('');
  const sci = (x, d) => { if (!(x > 0)) return '0'; let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); const dd = d == null ? 1 : d; if (+m.toFixed(dd) >= 10) { m /= 10; e += 1; } return m.toFixed(dd) + '×10' + sup(e); };
  const near = (x, v, tol) => x != null && Math.abs(x - v) <= tol;
  const nearRel = (x, v, r) => x != null && Math.abs(x - v) <= Math.abs(v) * r;
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const log10 = (x) => Math.log(Math.max(x, 1e-300)) / Math.LN10;
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  let view, ctx, D, VW, VH, FS;
  const parts = new SciSim.Particles();
  function initStage(bg, tw, th, pw, ph, fs) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? (fs || 1.25) : 1;
    view = SciSim.stage($('#cv'), { width: VW, height: VH, background: bg });
    ctx = view.ctx; D = SciSim.draw(ctx);
    const f0_ = D.font; D.font = (n, w) => f0_(Math.round(n * FS * 10) / 10, w);
  }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const shade = (c, a) => SciSim.color.shade(c, a);
  const rgba = (c, a) => SciSim.color.rgba(c, a);
  const mixc = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));
  /* D.text 짧은 호출: T(x, y, 글, 크기, 색, 정렬, 굵기, 추가옵션) */
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size: size || 14, color: color || '#26324a', align: align || 'left', weight: weight || 800 }, extra));
  const outlineT = (x, y, s, size, color, align) => T(x, y, s, size, color || '#e2e8f0', align || 'left', 800, { stroke: 'rgba(5,10,30,.75)', strokeWidth: 4 });

  /* 글자 줄바꿈 (한국어: 공백 단위, 너무 긴 단어는 글자 단위) */
  const WRAPC = new Map();
  function wrapLines(text, maxW, size, weight) {
    const ck = text + '|' + Math.round(maxW) + '|' + size + '|' + (weight || 700) + '|' + FS;
    const hit = WRAPC.get(ck); if (hit) return hit;
    const res = wrapLines0(text, maxW, size, weight);
    if (WRAPC.size > 600) WRAPC.clear();
    WRAPC.set(ck, res); return res;
  }
  function wrapLines0(text, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(text).split('\n').forEach((para, pi) => {
      if (pi > 0) { out.push(line); line = ''; }
      para.split(' ').forEach((w) => {
        const cand = line ? line + ' ' + w : w;
        if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(w).width <= maxW) { line = w; return; }
        let cur = '';
        for (const ch of w) { if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; }
        line = cur;
      });
    });
    out.push(line); ctx.restore();
    return out.filter((l, i) => l !== '' || i < out.length - 1);
  }
  /* 줄바꿈 글 그리기: 마지막 줄의 baseline y를 돌려줘요 */
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'left', alpha: o.alpha, stroke: o.stroke, strokeWidth: o.strokeWidth }));
    return y + (lines.length - 1) * lh;
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    const pf = !o.fill || /^rgba\(255,255,255/.test(o.fill) ? '#ffffff' : o.fill;
    D.shadow(() => { ctx.fillStyle = pf; rr(x, y, w, h, o.r || 14).fill(); }, { blur: 6, y: 2, color: 'rgba(20,40,80,.16)' });
    if (o.line) { ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 2; rr(x, y, w, h, o.r || 14).stroke(); }
    if (o.title) D.text(x + 12, y + 20 * FS, o.title, { size: o.tsize || 14, weight: 800, color: o.tcolor || '#334155', align: 'left' });
  }
  /* 읽음 칸 3개 */
  const rdEls = [1, 2, 3].map((i) => [$('#l' + i), $('#v' + i)]);
  let rdLast = '';
  function setReadouts(a) {
    const key = a.join('|'); if (key === rdLast) return; rdLast = key;
    for (let i = 0; i < 3; i++) { rdEls[i][0].textContent = a[i * 2]; rdEls[i][1].textContent = a[i * 2 + 1]; }
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3800); }
  /* 캔버스 위 일시 메시지 */
  const flash = { text: '', t: 0, bg: '#15803d' };
  function say(text, bad, sec) { flash.text = text; flash.t = sec || 2.8; flash.bg = bad ? '#b91c1c' : '#15803d'; }
  function drawFlash(dt, y) {
    if (flash.t <= 0) return;
    flash.t -= dt;
    const a = clamp(flash.t / 0.4, 0, 1), sz = PHONE ? 13 : 14.5;
    const lines = wrapLines(flash.text, VW - 60, sz, 800), lh = sz * FS * 1.3, h = lines.length * lh + 14;
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = flash.bg; rr(20, y, VW - 40, h, 12).fill(); }, { blur: 6, y: 2 });
    lines.forEach((l, i) => D.text(VW / 2, y + 7 + sz * FS * 0.95 + i * lh, l, { size: sz, weight: 800, color: '#fff' }));
    ctx.restore();
  }
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt ? fmt(+input.value) : v; }
  function bindSlider(input, out, fmt, cb) {
    const upd = () => { input.style.setProperty('--pct', ((input.value - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt(+input.value); };
    input.addEventListener('input', () => { upd(); cb && cb(+input.value); });
    upd();
  }
  function line(pts, color, w, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  /* 숫자 입력 읽기 / 입력 칸 표시 */
  const numOf = (id) => { const e = $('#' + id); if (!e) return null; const v = e.value.trim().replace(',', '.'); return v === '' || !isFinite(+v) ? null : +v; };
  const fbIn = (id, ok) => { const e = $('#' + id); if (!e) return; if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } };
  const clrIn = (...ids) => ids.forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } });
  /* 별밤 배경 (고정 별) */
  const STARS = [];
  (function () { let s = 12345; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 110; i++) STARS.push([r(), r(), 0.4 + r() * 1.2, r() * 6]); })();
  function spaceBg(x, y, w, h, t, top, bottom) {
    ctx.save(); rr(x, y, w, h, 0); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, top || '#0b1230'); g.addColorStop(1, bottom || '#16224a');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    STARS.forEach((s) => { ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.5 + s[3])); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s[0] * w, y + s[1] * h, s[2], 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1; ctx.restore();
  }
  /* 위치 이동하는 상태값 */
  const sm = (o, k, tgt, dt, rate) => { o[k] = approach(o[k], tgt, dt, rate || 10); return o[k]; };
  /* 숫자 굴러가기 표시용 */
  const roll = (cur, tgt, dt) => (RM ? tgt : (Math.abs(tgt - cur) < Math.abs(tgt) * 0.0005 ? tgt : cur + (tgt - cur) * (1 - Math.exp(-6 * dt))));

  /* ---------- 그래프 도우미 ---------- */
  /* 그림 상자 b={x,y,w,h}; 값 범위: x0..x1 (왼→오), y0(아래)..y1(위). 등급 축은 y0=어두운(큰 값), y1=밝은(작은 값) */
  function mkAx(b, x0, x1, y0, y1) {
    return {
      b, x0, x1, y0, y1,
      X: (v) => b.x + (v - x0) / (x1 - x0) * b.w,
      Y: (v) => b.y + b.h - (v - y0) / (y1 - y0) * b.h,
      iX: (px) => x0 + (px - b.x) / b.w * (x1 - x0),
      iY: (py) => y0 + (b.y + b.h - py) / b.h * (y1 - y0),
    };
  }
  /* 축 그리기: o = {xt:[눈금값], yt:[...], xf:(v)=>글, yf, xl:'x축 이름', yl:'y축 이름', grid:true, fill, xlab:true} */
  function drawAx(ax, o) {
    const b = ax.b; o = o || {};
    ctx.save();
    ctx.fillStyle = o.fill || '#ffffff'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.lineWidth = 1; ctx.strokeStyle = o.gridColor || 'rgba(100,116,139,.22)';
    (o.xt || []).forEach((v) => { const x = ax.X(v); if (x < b.x - 0.5 || x > b.x + b.w + 0.5) return; if (o.grid !== false) { ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke(); } });
    (o.yt || []).forEach((v) => { const y = ax.Y(v); if (y < b.y - 0.5 || y > b.y + b.h + 0.5) return; if (o.grid !== false) { ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); } });
    ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
    const ts = o.ts || 12;
    (o.xt || []).forEach((v) => { const x = ax.X(v); if (x < b.x - 0.5 || x > b.x + b.w + 0.5) return; T(x, b.y + b.h + 15 * FS, o.xf ? o.xf(v) : String(v), ts, '#475569', 'center', 700); });
    (o.yt || []).forEach((v) => { const y = ax.Y(v); if (y < b.y - 0.5 || y > b.y + b.h + 0.5) return; T(b.x - 6, y + 4, o.yf ? o.yf(v) : String(v), ts, '#475569', 'right', 700); });
    if (o.xl) T(b.x + b.w / 2, b.y + b.h + (o.xly || 32) * FS, o.xl, o.ls || 13, '#1e293b', 'center', 800);
    if (o.yl) { ctx.save(); ctx.translate(b.x - (o.ylx || 40), b.y + b.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, o.yl, o.ls || 13, '#1e293b', 'center', 800); ctx.restore(); }
  }
  /* 상자 안에서만 그리기 */
  function clipBox(b, fn) { ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); fn(); ctx.restore(); }
  /* 선형 보간 (xs 오름차순) */
  function interp(xs, ys, x) {
    if (x <= xs[0]) return ys[0] + (ys[1] - ys[0]) * (x - xs[0]) / (xs[1] - xs[0]);
    for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    const n = xs.length; return ys[n - 1] + (ys[n - 1] - ys[n - 2]) * (x - xs[n - 1]) / (xs[n - 1] - xs[n - 2]);
  }
  /* 작은 알약 단추(캔버스 안): 영역을 돌려줘요 */
  function cbtn(x, y, w, h, text, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.on ? (o.color || '#0ea5e9') : '#ffffff'; rr(x, y, w, h, h / 2).fill(); }, { blur: 4, y: 2 });
    ctx.strokeStyle = o.on ? shade(o.color || '#0ea5e9', -0.2) : (o.line || '#94a3b8'); ctx.lineWidth = 2; rr(x, y, w, h, h / 2).stroke();
    T(x + w / 2, y + h / 2 + 4.5 * Math.min(FS, 1.2), text, o.size || 13, o.on ? '#fff' : (o.tc || '#334155'), 'center', 800);
    return { x, y, w, h };
  }

  initStage('#e8eef8', 800, 620, 480, 960, 1.25);

  /* ================= 자료 ================= */
  const FIL = [
    { n: 'U', lam: 365, r: 1.56, col: '#7c3aed' }, { n: 'B', lam: 440, r: 1.32, col: '#2563eb' }, { n: 'V', lam: 550, r: 1.0, col: '#16a34a' },
    { n: 'R', lam: 700, r: 0.75, col: '#dc2626' }, { n: 'I', lam: 900, r: 0.48, col: '#b45309' }, { n: 'K', lam: 2200, r: 0.11, col: '#78350f' },
  ];
  const AV0 = 1.24, EBV0 = 0.40, BV_INT = 0.65, BV_OBS = 1.05, V_OBS = 12.0, B_OBS = 13.05, M_ABS = 4.8;
  const dNoCorr = Math.pow(10, (V_OBS - M_ABS + 5) / 5), dCorr = Math.pow(10, (V_OBS - M_ABS - AV0 + 5) / 5);
  const starRGB = [[-0.35, '#8fb0ff'], [-0.2, '#a8c0ff'], [0, '#cddbff'], [0.3, '#f4f4ff'], [0.6, '#fff1d6'], [0.8, '#ffdcaa'], [1.1, '#ffc080'], [1.4, '#ff9d5c'], [1.7, '#ff7d3e']];
  function bvCol(bv) {
    if (bv <= starRGB[0][0]) return starRGB[0][1];
    for (let i = 1; i < starRGB.length; i++) if (bv <= starRGB[i][0]) { const a = starRGB[i - 1], b = starRGB[i]; return mixc(a[1], b[1], (bv - a[0]) / (b[0] - a[0])); }
    return starRGB[starRGB.length - 1][1];
  }
  // 하늘 16칸 (4 x 4). 암흑 성운이 가리는 칸: 5, 6, 9, 10, 11
  const DARK = [5, 6, 9, 10, 11];
  const NV = [38, 45, 41, 44, 40, 3, 5, 43, 46, 2, 6, 4, 39, 42, 44, 40];          // 가시광선에서 센 별 수
  const NIR = NV.map((n, i) => (DARK.indexOf(i) >= 0 ? [36, 39, 33, 40, 35][DARK.indexOf(i)] : n));   // 적외선(K 대역)에서 센 별 수
  const CELLS = NV.map((nv, i) => {
    const r = rng(900 + i * 37), st = [];
    for (let k = 0; k < NIR[i]; k++) { let x = 0, y = 0; for (let t = 0; t < 60; t++) { x = 0.05 + r() * 0.9; y = 0.05 + r() * 0.9; if (st.every((q) => Math.hypot((q.x - x) * 1.25, q.y - y) > 0.07)) break; } st.push({ x, y, b: r() }); }
    st.sort((a, b) => b.b - a.b);       // 밝은 별부터: 가시광선에서는 앞의 NV개만 보여요
    return { i, dark: DARK.indexOf(i) >= 0, stars: st, nv, nir: NIR[i] };
  });
  const MEAN_OUT = (() => { const a = NV.filter((n, i) => DARK.indexOf(i) < 0); return a.reduce((s, x) => s + x, 0) / a.length; })();
  const MEAN_IN = DARK.reduce((s, i) => s + NV[i], 0) / DARK.length;
  const STATES = [
    { n: '차가운 중성 수소 (H I)', c: '#3b82f6', card: ['약 100 K', '약 30개/cm³', '은하 원반에 퍼진 차가운 구름'] },
    { n: '따뜻한 중성 수소', c: '#f59e0b', card: ['약 8000 K', '0.3개/cm³', '구름 사이를 채운 따뜻한 가스'] },
    { n: '분자 구름 (H₂)', c: '#8b5cf6', card: ['10~20 K', '10²~10⁶개/cm³', '별 탄생 장소'] },
    { n: '이온화 수소 (H II)', c: '#ef4444', card: ['약 10⁴ K', '10~10⁴개/cm³', '젊은 O·B 별 둘레 (오리온 대성운)'] },
    { n: '뜨거운 가스', c: '#f97316', card: ['약 10⁶ K', '0.003개/cm³', '초신성 폭발로 가열'] },
  ];
  const CSHUF = [3, 0, 4, 2, 1];

  /* ================= 상태 ================= */
  const S = {
    view: 'count', fade: 0, wl: 0, irA: 0, tool: 0,
    cnt: [CELLS.map(() => null), CELLS.map(() => null)], marks: CELLS.map(() => false), sh: CELLS.map(() => 0),
    av: AV0, meas: FIL.map(() => 0), measOn: FIL.map(() => false), pickF: -1,
    corr: 0, ph: [], spawn: 0, nB: 0, nR: 0, cloudT: 0,
    selCard: -1, slots: [-1, -1, -1, -1, -1], wrongRow: [0, 0, 0, 0, 0],
    flags: { mark: false, pickF: false, calcE: false, calcA: false, calcD: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { count: '🔭 하늘 16칸의 별 세기', redden: '🌈 별빛이 붉어지는 까닭', dist: '📏 소광을 보정한 거리', ism: '🌌 성간 물질' };
  const modeBtns = $$('#modeSeg button');
  const HIT = { cells: [], filt: [], cards: [], rows: [] };
  const dust = (() => { const r = rng(55), a = []; for (let i = 0; i < 46; i++) { const t = r() * TAU, u = Math.sqrt(r()); a.push({ x: Math.cos(t) * u, y: Math.sin(t) * u, s: 1.2 + r() * 2.6, p: r() * 6 }); } return a; })();

  /* ================= 레이아웃 ================= */
  const LYcount = () => (PHONE ? { sky: { x: 8, y: 8, w: 464, h: 470 }, tb: { x: 8, y: 486, w: 464, h: 262 }, info: { x: 8, y: 756, w: 464, h: 196 } } : { sky: { x: 10, y: 8, w: 520, h: 462 }, tb: { x: 538, y: 8, w: 252, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  const LYred = () => (PHONE ? { sc: { x: 8, y: 8, w: 464, h: 320 }, gr: { x: 8, y: 336, w: 464, h: 330 }, cd: { x: 8, y: 674, w: 464, h: 150 }, info: { x: 8, y: 832, w: 464, h: 120 } } : { sc: { x: 10, y: 8, w: 470, h: 300 }, gr: { x: 488, y: 8, w: 302, h: 300 }, cd: { x: 10, y: 316, w: 780, h: 154 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  const LYdist = () => (PHONE ? { P: { x: 8, y: 8, w: 464, h: 440 }, cd: { x: 8, y: 456, w: 464, h: 250 }, info: { x: 8, y: 714, w: 464, h: 238 } } : { P: { x: 10, y: 8, w: 780, h: 290 }, cd: { x: 10, y: 306, w: 780, h: 164 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  const LYism = () => (PHONE ? { R: { x: 8, y: 8, w: 464, h: 340 }, C: { x: 8, y: 356, w: 464, h: 330 }, info: { x: 8, y: 694, w: 464, h: 258 } } : { R: { x: 10, y: 8, w: 780, h: 296 }, C: { x: 10, y: 312, w: 780, h: 158 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  function infoBox(I, title, text, text2, ts) {
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    let yy = I.y + 24 * FS;
    T(I.x + 14, yy, title, PHONE ? 13 : 14, '#0369a1', 'left', 800);
    yy = drawWrap(I.x + 14, yy + 22 * FS, text, I.w - 28, ts || (PHONE ? 12.5 : 13.5), { color: '#334155' });
    if (text2) drawWrap(I.x + 14, yy + 24 * FS, text2, I.w - 28, ts ? ts - 0.5 : (PHONE ? 12 : 13), { color: '#64748b' });
  }

  /* ================= ① 별 계수 ================= */
  const cellN = (i, wl) => (wl === 0 ? NV[i] : NIR[i]);
  const cntDone = (i, wl) => S.cnt[wl || 0][i] && S.cnt[wl || 0][i].done;
  const countedAll = () => CELLS.every((c, i) => cntDone(i, 0));
  function startCount(i, delay) { const m = S.wl; if (S.cnt[m][i]) return; S.cnt[m][i] = { k: 0, done: false, delay: delay || 0 }; }
  function drawCount(dt, t) {
    const L = LYcount(), K = L.sky;
    S.irA = approach(S.irA, S.wl, dt, 5);
    panel(K.x, K.y, K.w, K.h, { r: 14, fill: '#0b1230' });
    T(K.x + 14, K.y + 22 * FS, S.wl === 0 ? '🔭 가시광선으로 본 하늘 (칸을 눌러 별 세기)' : '🌡 적외선(K 대역)으로 본 같은 하늘', PHONE ? 12 : 13.5, '#e2e8f0', 'left', 800);
    const gx = K.x + 10, gy = K.y + 36 * FS, gw = K.w - 20, gh = K.h - 36 * FS - 10, cw = gw / 4, ch = gh / 4;
    ctx.save(); rr(gx, gy, gw, gh, 8).clip();
    const bg = ctx.createLinearGradient(0, gy, 0, gy + gh); bg.addColorStop(0, S.wl ? '#2a1330' : '#0b1230'); bg.addColorStop(1, S.wl ? '#3b1d2a' : '#16224a');
    ctx.fillStyle = mixc(S.wl ? '#0b1230' : '#2a1330', '#0b1230', 0); ctx.fillStyle = bg; ctx.fillRect(gx, gy, gw, gh);
    const tint = S.irA; ctx.fillStyle = mixc('#0b1230', '#2a1330', tint); ctx.globalAlpha = 0.7; ctx.fillRect(gx, gy, gw, gh); ctx.globalAlpha = 1;
    HIT.cells = [];
    CELLS.forEach((c, i) => {
      const x = gx + (i % 4) * cw, y = gy + Math.floor(i / 4) * ch;
      // 암흑 성운
      if (c.dark) {
        const a = lerp(0.9, 0.16, S.irA), g = ctx.createRadialGradient(x + cw / 2, y + ch / 2, 4, x + cw / 2, y + ch / 2, cw * 0.82);
        g.addColorStop(0, 'rgba(26,16,10,' + a + ')'); g.addColorStop(0.7, 'rgba(40,26,16,' + (a * 0.8) + ')'); g.addColorStop(1, 'rgba(40,26,16,0)');
        ctx.fillStyle = g; ctx.fillRect(x - cw * 0.3, y - ch * 0.3, cw * 1.6, ch * 1.6);
      }
    });
    CELLS.forEach((c, i) => {
      const x = gx + (i % 4) * cw, y = gy + Math.floor(i / 4) * ch, cc = S.cnt[S.wl][i];
      c.stars.forEach((s, k) => {
        const extra = k >= c.nv, a = extra ? S.irA : 1; if (a < 0.02) return;
        const px = x + s.x * cw, py = y + s.y * ch, rad = 1 + s.b * 1.6, counted = cc && k < cc.k;
        ctx.globalAlpha = a; D.glow(px, py, rad * 3, extra ? '#fca5a5' : '#cbd5e1', 0.35); ctx.fillStyle = extra ? '#fecaca' : '#f1f5f9'; ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill();
        if (counted) { ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px, py, rad + 2.5, 0, TAU); ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
    });
    // 격자
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.lineWidth = 1.5;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(gx + k * cw, gy); ctx.lineTo(gx + k * cw, gy + gh); ctx.moveTo(gx, gy + k * ch); ctx.lineTo(gx + gw, gy + k * ch); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; rr(gx, gy, gw, gh, 8).stroke();
    // 센 수 · 표시
    CELLS.forEach((c, i) => {
      const x = gx + (i % 4) * cw, y = gy + Math.floor(i / 4) * ch, cc = S.cnt[S.wl][i];
      HIT.cells.push({ r: { x, y, w: cw, h: ch }, i });
      if (cc) {
        if (cc.delay > 0) { cc.delay -= dt; } else if (!cc.done) { cc.k = Math.min(cellN(i, S.wl), cc.k + dt * 48); if (cc.k >= cellN(i, S.wl)) { cc.done = true; cc.k = cellN(i, S.wl); Sound.click(); } }
        const k = Math.floor(cc.k + 1e-6);
        D.label(x + 26, y + 16, String(k), { bg: cc.done ? '#0e7490' : '#334155', size: 12.5, pad: 6 });
      }
      if (S.marks[i]) { ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3.5; ctx.setLineDash([8, 5]); rr(x + 3, y + 3, cw - 6, ch - 6, 8).stroke(); ctx.setLineDash([]); T(x + cw - 10, y + 18, '🚩', 14, '#fff', 'right', 800); }
      if (S.sh[i] > 0) { S.sh[i] = Math.max(0, S.sh[i] - dt * 2); ctx.strokeStyle = rgba('#ef4444', S.sh[i]); ctx.lineWidth = 4; rr(x + 2, y + 2, cw - 4, ch - 4, 8).stroke(); }
    });
    // 표
    const tb = L.tb; panel(tb.x, tb.y, tb.w, tb.h, { r: 14 });
    T(tb.x + 14, tb.y + 22 * FS, '칸마다 센 별의 수', PHONE ? 13 : 14, '#1e293b', 'left', 800);
    const tw = (tb.w - 28) / 4, th = PHONE ? 38 : 40;
    CELLS.forEach((c, i) => {
      const x = tb.x + 14 + (i % 4) * tw, y = tb.y + 36 * FS + Math.floor(i / 4) * (th + 4);
      const v = cntDone(i, S.wl) ? cellN(i, S.wl) : null, low = v != null && v < 15;
      ctx.fillStyle = v == null ? '#f1f5f9' : low ? '#fee2e2' : '#e0f2fe'; rr(x + 2, y, tw - 4, th, 8).fill(); ctx.strokeStyle = S.marks[i] ? '#ef4444' : v == null ? '#cbd5e1' : low ? '#f87171' : '#7dd3fc'; ctx.lineWidth = S.marks[i] ? 3 : 1.5; rr(x + 2, y, tw - 4, th, 8).stroke();
      T(x + tw / 2, y + th / 2 + 5, v == null ? '–' : String(v), 15, v == null ? '#94a3b8' : '#1e293b', 'center', 800);
    });
    let yy = tb.y + 36 * FS + 4 * (th + 4) + 18;
    const n0 = CELLS.filter((c, i) => cntDone(i, S.wl)).length;
    T(tb.x + 14, yy, '센 칸: ' + n0 + ' / 16', PHONE ? 13 : 13.5, n0 === 16 ? '#15803d' : '#475569', 'left', 800); yy += 24 * FS;
    const mk = S.marks.filter(Boolean).length;
    if (n0 === 16) {
      const out = CELLS.filter((c, i) => !S.marks[i]), inn = CELLS.filter((c, i) => S.marks[i]);
      if (mk > 0) {
        T(tb.x + 14, yy, '표시한 칸 평균: ' + f1(inn.reduce((s, c) => s + cellN(c.i, S.wl), 0) / inn.length) + '개', PHONE ? 12 : 12.5, '#b91c1c', 'left', 800); yy += 22 * FS;
        T(tb.x + 14, yy, '나머지 칸 평균: ' + f1(out.reduce((s, c) => s + cellN(c.i, S.wl), 0) / out.length) + '개', PHONE ? 12 : 12.5, '#0369a1', 'left', 800);
      } else drawWrap(tb.x + 14, yy, '유난히 적은 칸을 표시해 보세요.', tb.w - 28, 12.5, { color: '#64748b' });
    } else drawWrap(tb.x + 14, yy, '칸을 눌러 별을 세면 표가 채워져요.', tb.w - 28, 12.5, { color: '#64748b' });
    infoBox(L.info, S.wl === 0 ? '💡 어두운 띠는 별이 없는 곳일까, 가려진 곳일까?' : '💡 적외선에서는 같은 칸에 별이 더 많이 보여요', S.wl === 0 ? '하늘을 같은 크기의 칸 16개로 나눠 별을 세어 보면, 대부분은 40개 안팎인데 몇 칸은 2~6개로 아주 적어요. 은하수의 어두운 띠가 바로 이런 곳이에요.' : '파장이 긴 적외선(K 대역)은 티끌에 거의 막히지 않아요(A_K = 0.11 A_V). 같은 칸인데 별이 훨씬 많이 보이면 그곳에 별이 없는 것이 아니라 별빛이 가려진 거예요.', S.wl === 0 ? '암흑 성운(예: 석탄 자루 성운, 약 180 pc)이 뒤쪽 별빛을 가려요.' : '적외선에서도 완전히 같지는 않아요. 구름 속에 별빛을 조금은 가려요.');
  }
  function countDown(p) {
    for (const h of HIT.cells) if (inR(p, h.r)) {
      const i = h.i;
      if (S.tool === 1 && (S.flags.mark || FREE())) {
        if (!cntDone(i, S.wl) && !cntDone(i, 0) && !cntDone(i, 1)) { S.sh[i] = 1; say('먼저 별을 세어 보세요', true, 1.8); return true; }
        S.marks[i] = !S.marks[i]; Sound.click(); return true;
      }
      startCount(i, 0); Sound.click(); return true;
    }
    return false;
  }
  const darkOK = () => S.marks.every((m, i) => m === (DARK.indexOf(i) >= 0)) && countedAll();

  /* ================= ② 적색화 ================= */
  const A_of = (k) => FIL[k].r * S.av;
  const allMeas = () => S.measOn.every(Boolean);
  const ebvNow = () => (FIL[1].r - 1) * S.av;
  function drawRed(dt, t) {
    const L = LYred(), Sc = L.sc, gr = L.gr, cd = L.cd;
    // 장면
    panel(Sc.x, Sc.y, Sc.w, Sc.h, { r: 14, fill: '#0b1230' });
    T(Sc.x + 14, Sc.y + 22 * FS, '✨ 별빛 알갱이가 티끌 구름을 지나면', PHONE ? 12.5 : 13.5, '#e2e8f0', 'left', 800);
    const cy = Sc.y + Sc.h / 2 + 4, sx = Sc.x + 52, ox = Sc.x + Sc.w - 52, ccx = Sc.x + Sc.w * 0.5, cwid = Sc.w * 0.14, chh = Sc.h * 0.36;
    ctx.save(); rr(Sc.x, Sc.y, Sc.w, Sc.h, 14).clip(); spaceBg(Sc.x, Sc.y, Sc.w, Sc.h, t, '#0b1230', '#16224a');
    // 구름
    const dens = clamp(S.av / 2.5, 0, 1.2);
    const cg = ctx.createRadialGradient(ccx, cy, 4, ccx, cy, cwid * 2.2); cg.addColorStop(0, 'rgba(80,52,30,' + (0.15 + 0.6 * dens) + ')'); cg.addColorStop(1, 'rgba(80,52,30,0)');
    ctx.fillStyle = cg; ctx.fillRect(ccx - cwid * 2.4, cy - chh * 1.4, cwid * 4.8, chh * 2.8);
    S.cloudT += dt;
    dust.forEach((d) => { ctx.globalAlpha = 0.25 + 0.5 * dens; ctx.fillStyle = '#b08968'; ctx.beginPath(); ctx.arc(ccx + d.x * cwid * 1.5 + Math.sin(S.cloudT * 0.6 + d.p) * 2, cy + d.y * chh * 1.1 + Math.cos(S.cloudT * 0.5 + d.p) * 2, d.s * (PHONE ? 1.5 : 1.4), 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 광자
    S.spawn -= dt;
    const surB = Math.pow(10, -0.4 * FIL[1].r * S.av), surR = Math.pow(10, -0.4 * FIL[3].r * S.av);
    while (S.spawn <= 0) { S.spawn += 0.13; ['b', 'r'].forEach((ty, k) => S.ph.push({ ty, x: sx + 24, y: cy + (Math.random() - 0.5) * chh * 1.0, st: 0, a: 1, vy: 0, w: Math.random() * 6, dec: false })); }
    const sp = 150, x0 = ccx - cwid * 1.0, x1 = ccx + cwid * 1.0;
    for (let i = S.ph.length - 1; i >= 0; i--) {
      const p = S.ph[i];
      if (p.st === 0) { p.x += sp * dt; if (!p.dec && p.x >= x0) { p.dec = true; const sur = p.ty === 'b' ? surB : surR; if (Math.random() > sur) { p.st = Math.random() < 0.5 ? 1 : 2; p.vy = (Math.random() - 0.5) * 140; if (p.st === 1) parts.emit({ x: p.x, y: p.y, life: 0.4, size: 5, color: p.ty === 'b' ? '#93c5fd' : '#fca5a5', shape: 'circle', grow: 8 }); } }
        if (p.x >= ox - 18) { if (p.ty === 'b') S.nB++; else S.nR++; S.ph.splice(i, 1); continue; } }
      else if (p.st === 1) { p.a -= dt * 3.5; if (p.a <= 0) { S.ph.splice(i, 1); continue; } }                 // 흡수: 사라져요
      else { p.x += sp * 0.5 * dt; p.y += p.vy * dt; p.a -= dt * 1.4; if (p.a <= 0) { S.ph.splice(i, 1); continue; } }  // 산란: 옆으로 흩어져요
      ctx.globalAlpha = p.a; const col = p.ty === 'b' ? '#60a5fa' : '#f87171', yy = p.y + (p.st === 0 ? Math.sin(p.w + p.x * 0.05) * 3 : 0);
      D.glow(p.x, yy, 9, col, 0.5); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, yy, 3.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    S.nB *= Math.exp(-dt * 0.25); S.nR *= Math.exp(-dt * 0.25);
    // 별 · 관측자
    D.glow(sx, cy, 40, '#fff1d6', 0.5); D.sphere(sx, cy, 17, bvCol(BV_INT), { gloss: true });
    ctx.restore();
    T(ox, cy + 8, '🔭', 30, '#fff', 'center', 700);
    outlineT(sx, cy + 42, '별 (G2V)', 12, '#e2e8f0', 'center'); outlineT(ox, cy + 40, '관측자', 12, '#e2e8f0', 'center'); outlineT(ccx, cy - chh * 0.95, '성간 티끌 구름', PHONE ? 11.5 : 12.5, '#fcd9b0', 'center');
    // 도착 비율
    const tot = S.nB + S.nR, fb = tot > 3 ? S.nB / tot : 0.5;
    const bx = Sc.x + 14, by = Sc.y + Sc.h - 40 * FS, bw = Sc.w - 28;
    ctx.fillStyle = 'rgba(15,23,42,.8)'; rr(bx, by, bw, 26, 13).fill();
    ctx.save(); rr(bx, by, bw, 26, 13).clip(); ctx.fillStyle = '#3b82f6'; ctx.fillRect(bx, by, bw * fb, 26); ctx.fillStyle = '#ef4444'; ctx.fillRect(bx + bw * fb, by, bw * (1 - fb), 26); ctx.restore();
    T(bx + bw / 2, by + 18, '도착한 빛: 파랑 ' + f0(fb * 100) + ' % · 빨강 ' + f0((1 - fb) * 100) + ' %  (처음엔 50 % · 50 %)', PHONE ? 11 : 12.5, '#fff', 'center', 800);
    // 그래프
    panel(gr.x, gr.y, gr.w, gr.h, { r: 14 });
    T(gr.x + 14, gr.y + 22 * FS, '📉 필터마다 줄어든 밝기 A_λ (등급)', PHONE ? 12.5 : 13, '#1e293b', 'left', 800);
    const b = { x: gr.x + 46, y: gr.y + 40 * FS, w: gr.w - 46 - 14, h: gr.h - 40 * FS - 76 }, ymax = Math.max(2.5, Math.ceil(FIL[0].r * S.av * 2 + 0.2) / 2), ax = mkAx(b, 0, 6, 0, ymax);
    const yt = []; for (let v = 0; v <= ymax + 0.01; v += (ymax > 3 ? 1 : 0.5)) yt.push(v);
    drawAx(ax, { xt: [], yt, yf: (v) => fN(v, 1), yl: 'A_λ (등급)', ls: 12, ylx: 38, ts: 11 });
    HIT.filt = [];
    const slotW = b.w / 6, pts = [];
    FIL.forEach((f, k) => {
      S.meas[k] = approach(S.meas[k], S.measOn[k] ? 1 : 0, dt, 6);
      const cx = b.x + slotW * (k + 0.5), v = A_of(k) * S.meas[k], y = ax.Y(v);
      if (S.measOn[k]) { ctx.fillStyle = rgba(f.col, 0.28); ctx.fillRect(cx - slotW * 0.28, y, slotW * 0.56, b.y + b.h - y); D.sphere(cx, y, 7, f.col, { gloss: false }); T(cx, y - 11, fN(A_of(k), 2), PHONE ? 10.5 : 11.5, '#1e293b', 'center', 800); pts.push([cx, y]); }
      const r_ = { x: cx - slotW * 0.45, y: b.y + b.h + 6, w: slotW * 0.9, h: PHONE ? 46 : 42 };
      ctx.fillStyle = S.measOn[k] ? rgba(f.col, 0.18) : '#f8fafc'; rr(r_.x, r_.y, r_.w, r_.h, 8).fill(); ctx.strokeStyle = S.pickF === k ? '#f59e0b' : f.col; ctx.lineWidth = S.pickF === k ? 4 : 2; rr(r_.x, r_.y, r_.w, r_.h, 8).stroke();
      T(cx, r_.y + 18 * Math.min(FS, 1.15), f.n, 15, f.col, 'center', 800); T(cx, r_.y + 34 * Math.min(FS, 1.2), f.lam + 'nm', PHONE ? 9.5 : 10, '#64748b', 'center', 700);
      HIT.filt.push({ r: r_, k });
    });
    if (pts.length > 1) line(pts, '#f59e0b', 2.5);
    if (!S.measOn.some(Boolean)) T(b.x + b.w / 2, b.y + b.h / 2, '아래 필터를 눌러 재 보세요', 13, '#94a3b8', 'center', 800);
    // 색 초과 카드
    panel(cd.x, cd.y, cd.w, cd.h, { r: 14 });
    T(cd.x + 14, cd.y + 22 * FS, '🎨 색 초과 E(B − V) = 관측 (B − V) − 고유 (B − V)₀', PHONE ? 12 : 13.5, '#1e293b', 'left', 800);
    const yy = cd.y + 48 * FS, fz = PHONE ? 12 : 13.5;
    const ebvShow = FREE() || ebvOK();
    if (PHONE) {
      T(cd.x + 14, yy, '관측: B = ' + f2(B_OBS) + ', V = ' + f2(V_OBS) + ' → B − V = ' + f2(BV_OBS), fz, '#334155', 'left', 800);
      T(cd.x + 14, yy + 24, '고유 (G2V): (B − V)₀ = ' + f2(BV_INT), fz, '#334155', 'left', 800);
      T(cd.x + 14, yy + 50, 'E(B − V) = ' + (ebvShow ? f2(EBV0) : '?') + (ebvShow ? '   →  A_V ≈ 3.1 E = ' + f2(3.1 * EBV0) : ''), fz + 0.5, ebvShow ? '#15803d' : '#94a3b8', 'left', 800);
    } else {
      T(cd.x + 14, yy, '관측한 별: B = ' + f2(B_OBS) + ' 등급, V = ' + f2(V_OBS) + ' 등급 → 관측 B − V = ' + f2(BV_OBS), fz, '#334155', 'left', 800);
      T(cd.x + 14, yy + 28, 'G2V형 별의 고유 색지수: (B − V)₀ = ' + f2(BV_INT), fz, '#334155', 'left', 800);
      T(cd.x + 14, yy + 58, 'E(B − V) = ' + (ebvShow ? f2(EBV0) + ' 등급' : '?  (직접 계산)'), fz + 1, ebvShow ? '#15803d' : '#94a3b8', 'left', 800);
      if (ebvShow) T(cd.x + 14, yy + 84, '일반 성간 소광: A_V ≈ 3.1 E(B − V) = ' + f2(3.1 * EBV0) + ' 등급', fz, '#475569', 'left', 800);
      D.sphere(cd.x + cd.w - 130, cd.y + 70, 26, bvCol(BV_INT), { gloss: true }); D.sphere(cd.x + cd.w - 50, cd.y + 70, 26, bvCol(BV_OBS), { gloss: true });
      T(cd.x + cd.w - 130, cd.y + 118, '고유 색', 12, '#64748b', 'center', 800); T(cd.x + cd.w - 50, cd.y + 118, '관측 색', 12, '#64748b', 'center', 800);
      D.arrow(cd.x + cd.w - 100, cd.y + 70, cd.x + cd.w - 80, cd.y + 70, { color: '#94a3b8', width: 3, head: 8 });
    }
    infoBox(L.info, '💡 파장이 짧을수록 티끌에 더 많이 막혀요', 'A_U > A_B > A_V > A_R > A_I > A_K 순서로 줄어들어, 별빛은 파란 쪽이 더 많이 사라져 붉게 보여요(적색화). 이것은 별이 멀어져서 붉어지는 적색 편이(도플러 효과)와 달라요.', '이 차시의 값: A_λ / A_V = U 1.56, B 1.32, V 1.00, R 0.75, I 0.48, K 0.11.');
  }
  const ebvOK = () => near(numOf('inE'), EBV0, 0.02);
  function redDown(p) {
    for (const f of HIT.filt) if (inR(p, f.r)) {
      if (S.flags.pickF && allMeas() && S.pickMode) { S.pickF = f.k; Sound.click(); return true; }
      S.measOn[f.k] = true; Sound.click(); parts.burst(f.r.x + f.r.w / 2, f.r.y, { count: 6, speed: 70, life: 0.4, size: 2.5, colors: [FIL[f.k].col], gravity: 0 }); return true;
    }
    return false;
  }

  /* ================= ③ 거리 보정 ================= */
  const avNow = () => numOf('inAV');
  const avOK = () => near(avNow(), AV0, 0.04);
  const dcOK = () => nearRel(numOf('inDc'), dCorr, 0.05);
  function drawDist(dt, t) {
    const L = LYdist(), P = L.P;
    const avUse = FREE() && S.flags.useSlider ? S.av : (avOK() ? AV0 : 0), tgt = avUse > 0 ? 1 : 0;
    S.corr = approach(S.corr, tgt, dt, 2.2);
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '📏 같은 별, 두 가지 거리', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const b = { x: P.x + 30, y: P.y + 70 * FS, w: P.w - 60, h: PHONE ? 210 : 140 }, lo = log10(20), hi = log10(600), X = (d) => b.x + (log10(d) - lo) / (hi - lo) * b.w;
    // 하늘 배경 띠
    ctx.save(); rr(b.x, b.y, b.w, b.h, 12).clip(); const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#16224a'); ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
    // 구름
    const c0 = X(45), c1 = X(110), cg = ctx.createLinearGradient(c0, 0, c1, 0); cg.addColorStop(0, 'rgba(120,80,50,0)'); cg.addColorStop(0.5, 'rgba(120,80,50,' + (0.25 + 0.4 * clamp((avUse || AV0) / 2, 0, 1)) + ')'); cg.addColorStop(1, 'rgba(120,80,50,0)'); ctx.fillStyle = cg; ctx.fillRect(c0, b.y, c1 - c0, b.h);
    dust.forEach((d) => { ctx.globalAlpha = 0.55; ctx.fillStyle = '#b08968'; ctx.beginPath(); ctx.arc((c0 + c1) / 2 + d.x * (c1 - c0) * 0.5, b.y + b.h / 2 + d.y * b.h * 0.4, d.s * 0.9, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; rr(b.x, b.y, b.w, b.h, 12).stroke();
    outlineT((c0 + c1) / 2, b.y + 18, '티끌 구름', 12, '#fcd9b0', 'center');
    // 지구
    const my = b.y + b.h / 2; D.sphere(b.x + 14, my, 11, '#3b82f6', { gloss: true }); outlineT(b.x + 14, my + 28, '지구', 12, '#e2e8f0', 'center');
    // 실제 위치와 착각 위치
    const dTrue = dCorr, dWrong = dNoCorr, dShow = Math.pow(10, lerp(log10(dWrong), log10(dTrue), S.corr)), xs = X(dTrue), xw = X(dShow);
    D.glow(xs, my, 26, '#4ade80', 0.4); D.sphere(xs, my, 9, '#4ade80', { gloss: true }); outlineT(xs, my - 20, '실제', 12, '#bbf7d0', 'center');
    ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * (1 - S.corr); D.glow(xw, my + 20, 22, '#f87171', 0.35); D.sphere(xw, my + 20, 8, '#f87171', { gloss: true }); ctx.restore();
    outlineT(xw, my + 46, S.corr > 0.97 ? '보정한 거리' : '소광을 무시한 거리', PHONE ? 11 : 12, '#fecaca', 'center');
    D.arrow(b.x + 30, my + 20, xw - 12, my + 20, { color: 'rgba(248,113,113,.7)', width: 2, head: 9, dash: [5, 5] });
    // 눈금
    const ay = b.y + b.h + 20;
    [20, 50, 100, 200, 400].forEach((d) => { const x = X(d); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, b.y + b.h); ctx.lineTo(x, b.y + b.h + 6); ctx.stroke(); T(x, ay, d + ' pc', PHONE ? 11 : 12, '#475569', 'center', 700); });
    T(b.x + b.w / 2, ay + 18 * FS, '거리 (로그 눈금)', 12, '#64748b', 'center', 700);
    // 카드
    const cd = L.cd; panel(cd.x, cd.y, cd.w, cd.h, { r: 14 });
    const rows = [
      ['주어진 값', 'V 겉보기 등급 m = ' + f1(V_OBS) + ',  절대 등급 M = ' + f1(M_ABS) + ',  G2V 별의 E(B − V) = ' + f2(EBV0), '#475569'],
      ['① 소광 무시', 'd′ = 10^((m − M + 5)/5) = ' + f0(dNoCorr) + ' pc', '#b91c1c'],
      ['② 소광 A_V', avOK() || FREE() ? 'A_V = 3.1 × ' + f2(EBV0) + ' = ' + f2(AV0) + ' 등급 → 밝기 ' + f2(Math.pow(10, -0.4 * AV0)) + '배' : 'A_V = 3.1 × E(B − V) = ?', avOK() || FREE() ? '#15803d' : '#94a3b8'],
      ['③ 보정', dcOK() || FREE() ? 'd = 10^((m − M − A_V + 5)/5) = ' + f0(dCorr) + ' pc  (d′는 ' + f2(dNoCorr / dCorr) + '배 과대평가)' : 'd = 10^((m − M − A_V + 5)/5) = ?', dcOK() || FREE() ? '#15803d' : '#94a3b8'],
    ];
    rows.forEach((r, i) => { const y = cd.y + 26 * FS + i * (PHONE ? 52 : 34); T(cd.x + 14, y, r[0], PHONE ? 12 : 12.5, '#64748b', 'left', 800); if (PHONE) drawWrap(cd.x + 14, y + 20, r[1], cd.w - 28, 12.5, { color: r[2], weight: 800 }); else T(cd.x + 112, y, r[1], 13.5, r[2], 'left', 800); });
    infoBox(L.info, '💡 소광을 무시하면 거리를 크게 재요', '먼지가 별빛을 가려 별이 더 어둡게 보이니, 소광을 무시하면 "어두우니 더 멀다"고 착각해요. 거리 지수는 m − M = 5 log d − 5 + A_V이므로 A_V만큼 빼고 계산해야 해요.', '은하 원반의 평균 소광은 약 1 mag/kpc예요. 3 kpc 거리에서 A_V ≈ 3이면 밝기가 1/16로 줄어요(2.512³ ≈ 16).');
  }

  /* ================= ④ 성간 물질 ================= */
  const ismRows = (R) => { const rh = PHONE ? 54 : 46, y0 = R.y + 38 * FS; return STATES.map((s, i) => ({ x: R.x + 12, y: y0 + i * (rh + (PHONE ? 4 : 4)), w: R.w - 24, h: rh })); };
  const ismOK = () => S.slots.every((c, i) => c === i);
  function drawIsm(dt, t) {
    const L = LYism(), R = L.R, C = L.C;
    panel(R.x, R.y, R.w, R.h, { r: 14 });
    T(R.x + 14, R.y + 24 * FS, '🌌 성간 기체의 상태 5가지: 카드를 눌러 알맞은 줄에 넣어요', PHONE ? 12 : 14, '#1e293b', 'left', 800);
    HIT.rows = [];
    ismRows(R).forEach((r, i) => {
      const st = STATES[i], ci = S.slots[i], w0 = PHONE ? 150 : 230;
      if (S.wrongRow[i] > 0) S.wrongRow[i] = Math.max(0, S.wrongRow[i] - dt * 1.2);
      ctx.fillStyle = rgba(st.c, 0.12); rr(r.x, r.y, r.w, r.h, 10).fill(); ctx.strokeStyle = st.c; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 10).stroke();
      ctx.fillStyle = st.c; rr(r.x, r.y, w0, r.h, 10).fill();
      drawWrap(r.x + w0 / 2, r.y + r.h / 2 - (PHONE ? 6 : 0) + 5, st.n, w0 - 14, PHONE ? 12 : 13.5, { color: '#fff', weight: 800, align: 'center' });
      const sx = r.x + w0 + 8, sw = r.w - w0 - 14;
      ctx.fillStyle = ci >= 0 ? '#ffffff' : 'rgba(255,255,255,.6)'; rr(sx, r.y + 5, sw, r.h - 10, 8).fill(); ctx.strokeStyle = S.wrongRow[i] > 0 ? '#ef4444' : ci >= 0 ? st.c : '#cbd5e1'; ctx.lineWidth = S.wrongRow[i] > 0 ? 3.5 : 1.8; ctx.setLineDash(ci >= 0 ? [] : [5, 4]); rr(sx, r.y + 5, sw, r.h - 10, 8).stroke(); ctx.setLineDash([]);
      if (ci >= 0) { const c = STATES[ci].card; if (PHONE) { T(sx + 10, r.y + 22, c[0] + ' · ' + c[1], 11.5, '#1e293b', 'left', 800); T(sx + 10, r.y + 38, c[2].length > 14 ? c[2].slice(0, 13) + '…' : c[2], 10.5, '#64748b', 'left', 700); } else { T(sx + 12, r.y + 21, c[0] + '  ·  ' + c[1], 13.5, '#1e293b', 'left', 800); T(sx + 12, r.y + 38, c[2], 12, '#64748b', 'left', 700); } }
      else T(sx + sw / 2, r.y + r.h / 2 + 4, S.selCard >= 0 ? '여기에 넣기' : '카드를 놓는 곳', 12.5, '#94a3b8', 'center', 700);
      HIT.rows.push({ r: { x: sx, y: r.y, w: sw, h: r.h }, i });
    });
    panel(C.x, C.y, C.w, C.h, { r: 14 });
    T(C.x + 14, C.y + 22 * FS, '상태 카드 (온도 · 밀도 · 예)', PHONE ? 12.5 : 13.5, '#1e293b', 'left', 800);
    HIT.cards = [];
    const cols = PHONE ? 2 : 5, cw = (C.w - 24 - (cols - 1) * 8) / cols, ch = PHONE ? 88 : 104;
    CSHUF.forEach((ci, k) => {
      const x = C.x + 12 + (k % cols) * (cw + 8), y = C.y + 34 * FS + Math.floor(k / cols) * (ch + 8), used = S.slots.indexOf(ci) >= 0, sel = S.selCard === ci, c = STATES[ci].card;
      ctx.fillStyle = used ? '#e2e8f0' : '#ffffff'; D.shadow(() => rr(x, y, cw, ch, 10).fill(), { blur: used ? 2 : 5, y: used ? 1 : 2 });
      ctx.strokeStyle = sel ? '#f59e0b' : used ? '#94a3b8' : '#0ea5e9'; ctx.lineWidth = sel ? 4 : 2; rr(x, y, cw, ch, 10).stroke();
      const col = used ? '#94a3b8' : '#0f172a';
      T(x + cw / 2, y + 24, c[0], 14, col, 'center', 800); T(x + cw / 2, y + 24 + 20 * Math.min(FS, 1.15), c[1], 12.5, used ? '#94a3b8' : '#334155', 'center', 800);
      drawWrap(x + cw / 2, y + 24 + 42 * Math.min(FS, 1.15), c[2], cw - 12, PHONE ? 11 : 11.5, { color: used ? '#94a3b8' : '#64748b', weight: 700, align: 'center' });
      HIT.cards.push({ r: { x, y, w: cw, h: ch }, ci });
    });
    infoBox(L.info, '💡 성간 티끌의 특징', '성간 물질은 질량의 약 99 %가 기체(수소 약 70 %, 헬륨 약 28 %, 그 밖의 원소 약 1 %)이고, 약 1 %가 티끌이에요. 티끌은 크기가 약 0.1 μm(10⁻⁷ m)이고 규산염과 탄소로 이루어져요.', '파장이 짧은 빛을 더 많이 막아 별빛이 붉어지고(A_λ 큼), 흡수한 에너지는 적외선으로 내보내요. 그래서 은하 중심은 적외선으로 관측해요.');
  }
  function ismDown(p) {
    for (const c of HIT.cards) if (inR(p, c.r)) { const k = S.slots.indexOf(c.ci); if (k >= 0) { S.slots[k] = -1; } S.selCard = S.selCard === c.ci ? -1 : c.ci; Sound.click(); return true; }
    for (const r of HIT.rows) if (inR(p, r.r)) {
      if (S.selCard >= 0) { const old = S.slots.indexOf(S.selCard); if (old >= 0) S.slots[old] = -1; S.slots[r.i] = S.selCard; S.selCard = -1; Sound.click(); }
      else if (S.slots[r.i] >= 0) { S.slots[r.i] = -1; Sound.click(); }
      return true;
    }
    S.selCard = -1; return false;
  }

  /* ================= 입력 · 컨트롤 ================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    if (PHONE) view.canvas.style.touchAction = 'pan-y';
    updateCtl();
  }
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#toolBox').hidden = !(S.view === 'count' && (S.flags.mark || free));
    $('#pickBox').hidden = !(S.view === 'redden' && (S.flags.pickF || free) && allMeas());
    $('#calcE').hidden = !(S.view === 'redden' && (S.flags.calcE || free));
    $('#avBox').hidden = !(S.view === 'redden' && free);
    $('#calcA').hidden = !(S.view === 'dist' && (S.flags.calcA || free));
    $('#calcDc').hidden = !(S.view === 'dist' && (S.flags.calcD || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#grpWl .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.wl));
    $$('#grpTool .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.tool));
    $$('#grpFilter .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.pickF));
  }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  sl('#sAV', '#oAV', (v) => f2(v) + ' 등급', (v) => { S.av = v; });
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpWl .opt').forEach((b) => clickable(b, () => { S.wl = +b.dataset.k; updateCtl(); }));
  $$('#grpTool .opt').forEach((b) => clickable(b, () => { S.tool = +b.dataset.k; updateCtl(); }));
  $$('#grpFilter .opt').forEach((b) => clickable(b, () => { S.pickF = +b.dataset.k; updateCtl(); }));
  clickable($('#bAll'), () => { let k = 0; CELLS.forEach((c, i) => { if (!S.cnt[S.wl][i]) startCount(i, 0.1 * (k++)); }); });
  $('#inE').addEventListener('input', () => { if (ebvOK()) fbIn('inE', true); });
  $('#inAV').addEventListener('input', () => { if (avOK()) fbIn('inAV', true); });
  $('#inDc').addEventListener('input', () => { if (dcOK()) fbIn('inDc', true); });

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'count': return countDown(p);
        case 'redden': return redDown(p);
        case 'ism': return ismDown(p);
        default: return false;
      }
    },
    move() {}, up() {},
    hover(p) {
      if (S.view === 'count') return HIT.cells.some((h) => inR(p, h.r)) ? 'pointer' : '';
      if (S.view === 'redden') return HIT.filt.some((h) => inR(p, h.r)) ? 'pointer' : '';
      if (S.view === 'ism') return HIT.cards.some((h) => inR(p, h.r)) || HIT.rows.some((h) => inR(p, h.r)) ? 'pointer' : '';
      return '';
    },
  });

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '별 계수: 어두운 띠의 비밀', short: '별 계수', icon: '🔭', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 빈 공간에 가까운 우주 공간에도 별빛을 가리는 무언가가 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교와 지구과학에서</b> 성운과 은하수를 배웠어요. 은하수에는 별이 없는 듯 어두운 띠가 있어요. 하늘을 <b>같은 크기의 칸 16개</b>로 나누고 칸마다 별의 수를 세어 이 띠의 정체를 알아봐요.</div>' +
        '<p>가시광선 사진과 <b>적외선</b> 사진을 번갈아 보면서, 별이 정말 없는 것인지 가려진 것인지 따져 보세요.</p>',
      features: ['count'],
      setup() { S.wl = 0; setView('count'); },
      recap: '어두운 칸은 별이 없는 구멍이 아니라 별빛이 가려진 곳이에요: 적외선에서는 같은 칸의 별이 훨씬 많이 보여요.',
      summary: () => '<ul><li>하늘을 같은 크기의 칸으로 나눠 별을 세면 대부분의 칸은 약 ' + f0(MEAN_OUT) + '개인데, 암흑 성운이 가리는 칸은 2~6개로 아주 적어요. 은하수의 어두운 띠가 이 구름이에요.</li><li><b>적외선</b>(K 대역)으로 보면 같은 칸에 별이 훨씬 많이 보여요. 별이 없는 것이 아니라 <b>별빛이 가려진 것</b>이에요.</li><li>별빛을 가리는 것은 <b>성간 티끌</b>이에요. 이렇게 빛이 약해지는 현상을 <b>성간 소광</b>이라고 해요.</li></ul>',
      missions: [
        {
          title: '16칸의 별 세기',
          goal: '칸을 눌러 별을 세어 표를 채우세요. <b>16칸 모두</b> 세면 돼요.',
          hint: '[남은 칸 모두 세기] 단추를 눌러도 돼요. 가시광선 사진에서 세어요.',
          setup() { S.wl = 0; setView('count'); },
          check: () => countedAll(), hold: 0.5,
          status: () => mark(countedAll()) + ' 센 칸 ' + CELLS.filter((c, i) => cntDone(i, 0)).length + ' / 16',
          explain: '칸마다 별의 수가 달라요. 대부분은 38~46개인데 몇 칸은 2~6개예요. 이렇게 유난히 적은 칸이 <b>암흑 성운</b>이 별빛을 가린 곳이에요.',
        },
        {
          title: '별이 유난히 적은 칸 찾기',
          goal: '표를 보고 별의 수가 <b>유난히 적은 칸</b>을 모두 표시하세요. (🚩 표시 도구를 쓰세요)',
          hint: '2~6개처럼 다른 칸(약 40개)에 비해 아주 적은 칸이 모두 5칸 있어요.',
          setup() { S.wl = 0; S.flags.mark = true; S.tool = 1; setView('count'); },
          check: () => darkOK(), hold: 0.8,
          status: () => mark(darkOK()) + ' 표시한 칸 ' + S.marks.filter(Boolean).length + '개 (정답과 ' + (darkOK() ? '일치' : '다름') + ')',
          explain: '별의 수가 ' + NV.filter((n, i) => DARK.indexOf(i) >= 0).join('·') + '개인 5칸이 <b>암흑 성운</b> 칸이에요. 나머지 칸의 평균은 약 ' + f0(MEAN_OUT) + '개, 이 5칸의 평균은 ' + f1(MEAN_IN) + '개로 10배쯤 차이 나요.',
        },
        {
          type: 'quiz', title: '별이 없는 것이 아닌 근거',
          goal: '어두운 칸에 별이 없는 것이 아니라 <b>별빛이 가려진</b> 것이라는 근거로 알맞은 것은?',
          setup() { S.wl = 1; setView('count'); },
          choices: ['적외선으로 보면 같은 칸에서 별이 훨씬 많이 보여요', '가시광선 사진에서 그 칸이 까맣게 보여요', '그 칸의 별이 모두 사라졌기 때문이에요', '그 칸에는 별이 태어난 적이 없기 때문이에요'],
          answer: 0,
          feedback: ['', '까맣게 보이는 것만으로는 별이 없는지 가려졌는지 알 수 없어요. 다른 파장으로 확인해야 해요.', '별이 사라졌다는 증거는 없어요. 적외선에서는 별이 보이니까요.', '우주에는 별이 없는 구멍이 있다는 생각은 오개념이에요. 같은 칸에서 적외선으로 별이 보여요.'],
          explain: '적외선은 파장이 길어 티끌에 거의 막히지 않아요(소광 A_K는 A_V의 0.11배). 그래서 구름 <b>뒤쪽의 별</b>이 보여요. 이것이 가려졌다는 직접 증거예요.',
        },
      ],
    },
    {
      title: '적색화: 파장별 소광', short: '적색화', icon: '🌈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 어두운 칸은 별빛이 가려진 곳이라는 것을 알았어요. 티끌은 모든 빛을 똑같이 막을까요? 같은 별을 U·B·V·R·I·K <b>필터</b>로 관측해 밝기가 얼마나 줄었는지 재 봐요.</div>' +
        '<p>필터마다 줄어든 양 <b>A_λ</b>를 그래프로 그리면 파장이 짧을수록 많이 줄어요. 그래서 별이 붉게 보이는데, 이 <b>색 초과 E(B − V)</b> = 관측 (B − V) − 고유 (B − V)₀를 계산해 소광의 양을 알아내요.</p>',
      features: ['redden'],
      setup() { S.av = AV0; setSlider($('#sAV'), $('#oAV'), AV0, (v) => f2(v) + ' 등급'); setView('redden'); },
      recap: '티끌은 파장이 짧은 빛일수록 더 많이 막아 별빛이 붉어져요(적색화). 색 초과로 소광의 양을 알 수 있어요.',
      summary: '<ul><li>소광 A_λ(파장 λ에서 어두워진 등급)는 <b>파장이 짧을수록 커요</b>: A_λ / A_V = U 1.56, B 1.32, V 1.00, R 0.75, I 0.48, K 0.11.</li><li>파란 빛이 더 많이 사라져 별이 붉게 보이는 <b>적색화</b>. 이는 별이 멀어져 생기는 <b>적색 편이</b>(도플러 효과)와 달라요.</li><li><b>색 초과 E(B − V)</b> = 관측 (B − V) − 고유 (B − V)₀, 일반적으로 <b>A_V ≈ 3.1 E(B − V)</b>. 예) G2V 별: 1.05 − 0.65 = 0.40 → A_V = 1.24등급.</li></ul>',
      missions: [
        {
          title: '가장 많이 어두워지는 필터', manual: true,
          goal: '아래 필터 6개를 눌러 A_λ를 모두 잰 뒤, 밝기가 <b>가장 많이 줄어드는</b> 필터를 고르세요.',
          hint: '그래프에서 가장 높은 막대(가장 많이 줄어든 필터)를 찾아요. 파장이 가장 짧은 필터예요.',
          setup() { S.flags.pickF = true; S.pickMode = true; S.pickF = -1; S.measOn = FIL.map(() => false); S.meas = FIL.map(() => 0); S.av = AV0; setView('redden'); },
          check: () => { if (!allMeas()) return '필터 6개를 모두 눌러 재 보세요.'; if (S.pickF < 0) return '가장 많이 어두워지는 필터를 골라 주세요.'; return S.pickF === 0 ? true : '다시 살펴보세요. 막대가 더 높은 필터가 있어요.'; },
          explain: '<b>U 필터</b>(365 nm)에서 A_U ≈ 1.93등급으로 가장 많이 어두워져요. 파장이 길수록 줄어들어 K(2200 nm)에서는 0.14등급뿐이에요. 파란 빛이 더 많이 사라지니 별은 <b>붉게</b> 보여요.',
        },
        {
          title: 'G2V 별의 색 초과 계산',
          goal: '관측한 B − V = 1.05인 G2V 별의 고유 색지수는 0.65예요. <b>색 초과 E(B − V)</b>를 구해 입력하세요.',
          hint: 'E(B − V) = 관측 (B − V) − 고유 (B − V)₀ = 1.05 − 0.65예요.',
          setup() { S.flags.calcE = true; S.pickMode = false; S.av = AV0; setSlider($('#sAV'), $('#oAV'), AV0, (v) => f2(v) + ' 등급'); clrIn('inE'); setView('redden'); },
          check: () => ebvOK(), hold: 0.6,
          status: () => mark(ebvOK()) + ' E(B − V) = ' + ($('#inE').value.trim() || '—') + ' 등급',
          explain: 'E(B − V) = 1.05 − 0.65 = <b>0.40</b>등급이에요. 이 별은 티끌 때문에 원래보다 0.40등급 더 붉어 보여요. 소광 A_V ≈ 3.1 × 0.40 = 1.24등급이에요.',
        },
        {
          type: 'quiz', title: '적색화와 적색 편이',
          goal: '티끌 때문에 별이 붉어지는 <b>적색화</b>는 멀어지는 별빛의 <b>적색 편이</b>와 어떻게 다를까요?',
          setup() { setView('redden'); },
          choices: ['적색화는 티끌이 파란 빛을 더 많이 흡수·산란해서, 적색 편이는 도플러 효과로 파장 전체가 늘어나서 생겨요', '둘 다 별이 멀어져서 붉어지는 같은 현상이에요', '적색화는 별이 식어서, 적색 편이는 티끌 때문에 생겨요', '적색화는 스펙트럼선의 위치를 옮겨요'],
          answer: 0,
          feedback: ['', '적색 편이는 멀어지는 별에서 생기지만, 적색화는 별의 움직임과 상관없이 티끌이 있으면 생겨요.', '별이 식으면 고유 색이 변하는 것이지 적색화가 아니에요. 티끌이 원인이에요.', '스펙트럼선 위치가 옮겨지는 것은 적색 편이(도플러 효과)예요. 적색화는 밝기가 파장에 따라 다르게 줄어드는 현상이에요.'],
          explain: '<b>적색화</b>는 티끌이 파란 빛을 선택적으로 줄여서 색이 붉어지는 것이고, <b>적색 편이</b>는 도플러 효과로 모든 파장(스펙트럼선)이 길어지는 것이에요. 원인도, 쓰임도 달라요.',
        },
      ],
    },
    {
      title: '거리 보정: 소광을 빼고 계산', short: '거리 보정', icon: '📏', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 티끌 때문에 별이 어두워지는 양 A_V를 색 초과 E(B − V)에서 구했어요. 이 어두워진 만큼을 빼지 않으면 거리가 어떻게 될까요?</div>' +
        '<p>거리 지수는 <b>m − M = 5 log d − 5 + A_V</b>예요. 같은 별의 거리를 소광을 무시했을 때와 보정했을 때로 구해 비교해요. (m = 12.0, M = 4.8)</p>',
      features: ['dist'],
      setup() { clrIn('inAV', 'inDc'); S.corr = 0; setView('dist'); },
      recap: '소광을 무시하면 별이 어두워서 더 멀다고 착각해 거리를 크게 재요. 관측값을 A_V만큼 보정해야 해요.',
      summary: '<ul><li><b>m − M = 5 log d − 5 + A_V</b> → <b>d = 10^((m − M − A_V + 5)/5) pc</b>.</li><li>예) m = 12.0, M = 4.8, A_V = 1.24: 소광 무시 d′ = 275 pc, 보정 d = 156 pc → 보정 전 거리가 10^(1.24/5) = <b>1.77배 과대평가</b>.</li><li>별빛은 어두워진 양 A_V만큼 약해져요: 3 kpc에서 A_V ≈ 3등급이면 밝기 1/16, 은하 중심 방향은 A_V ≈ 30등급이라 가시광선이 10⁻¹²배예요.</li></ul>',
      missions: [
        {
          title: '소광 A_V 계산하기',
          goal: '앞에서 구한 E(B − V) = 0.40으로 <b>A_V = 3.1 × E(B − V)</b>를 계산해 입력하세요.',
          hint: '3.1 × 0.40 = 1.24등급이에요.',
          setup() { S.flags.calcA = true; setView('dist'); },
          check: () => avOK(), hold: 0.6,
          status: () => mark(avOK()) + ' A_V = ' + ($('#inAV').value.trim() || '—') + ' 등급',
          explain: 'A_V = 3.1 × 0.40 = <b>1.24등급</b>. 별빛이 티끌을 지나며 1.24등급, 즉 10^(−0.4 × 1.24) ≈ 0.32배(약 1/3)로 약해졌다는 뜻이에요.',
        },
        {
          title: '보정한 거리 계산하기',
          goal: 'm = 12.0, M = 4.8, A_V = 1.24일 때 보정한 거리 <b>d(pc)</b>를 구해 입력하세요.',
          hint: 'm − M − A_V = 12.0 − 4.8 − 1.24 = 5.96이고, d = 10^((5.96 + 5)/5) = 10^2.192 ≈ 156 pc예요.',
          setup() { S.flags.calcA = true; S.flags.calcD = true; setView('dist'); },
          check: () => avOK() && dcOK(), hold: 0.6,
          status: () => mark(avOK()) + ' A_V ' + mark(dcOK()) + ' d = ' + ($('#inDc').value.trim() || '—') + ' pc',
          explain: '소광 무시 d′ = 10^((12.0 − 4.8 + 5)/5) ≈ 275 pc, 보정한 d ≈ <b>156 pc</b>예요. 275 / 156 = 1.77이므로 소광을 무시하면 거리를 약 1.8배 크게 재요.',
        },
        {
          type: 'quiz', title: '소광을 무시하면 거리는?',
          goal: '소광을 보정하지 않고 거리를 구하면 실제 거리보다 어떻게 나올까요?',
          setup() { setView('dist'); },
          choices: ['더 크게(더 멀게) 나와요. 어두워 보이는 것을 멀어서라고 착각하기 때문이에요', '더 작게(더 가깝게) 나와요', '똑같이 나와요', '때에 따라 달라서 알 수 없어요'],
          answer: 0,
          feedback: ['', '티끌이 별빛을 가리면 별이 더 어두워져요. 어두우면 멀다고 계산하니 거리는 커져요.', 'm − M = 5 log d − 5 + A_V에서 A_V가 있는데 무시하면 d가 달라져요.', '항상 같은 방향이에요: A_V ≥ 0이므로 무시하면 과대평가돼요.'],
          explain: '실제 m − M = 5 log d − 5 + A_V인데 A_V를 무시하면 5 log d가 A_V만큼 커져요. 그래서 d는 10^(A_V/5)배 <b>과대평가</b>돼요. 그래서 관측 결과를 반드시 보정해야 해요.',
        },
      ],
    },
    {
      title: '성간 물질: 기체와 티끌', short: '성간 물질', icon: '🌌', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별빛을 가리는 티끌을 알았어요. 성간 공간에는 티끌만이 아니라 <b>기체</b>도 여러 상태로 있어요. 상태마다 온도와 밀도가 아주 달라요.</div>' +
        '<p>기체 상태 5가지를 온도·밀도·예와 짝지어 보고, 티끌의 특징을 정리해요.</p>',
      features: ['ism'],
      setup() { S.selCard = -1; setView('ism'); },
      recap: '성간 물질은 약 99 %가 기체, 약 1 %가 티끌이에요. 기체는 온도와 밀도가 다른 여러 상태로 있고, 티끌은 짧은 파장의 빛을 더 막아요.',
      summary: '<ul><li><b>성간 기체</b>(온도 | 밀도 | 예): 차가운 중성 수소 H I 약 100 K | 약 30개/cm³ · 따뜻한 중성 약 8000 K | 0.3 · <b>분자 구름 H₂</b> 10~20 K | 10²~10⁶(별 탄생 장소) · <b>이온화 수소 H II</b> 약 10⁴ K | 10~10⁴(젊은 O·B 별 둘레) · 뜨거운 가스 약 10⁶ K | 0.003(초신성 폭발로 가열).</li><li><b>성간 티끌</b>: 질량의 약 1 %, 크기 약 0.1 μm, 규산염·탄소. 파장이 짧은 빛을 더 막고 흡수한 에너지를 적외선으로 내보내요.</li><li>그래서 티끌이 많은 <b>은하 중심(A_V ≈ 30)</b>은 가시광선보다 적외선(A_K = 0.11 A_V)으로 관측해요.</li></ul>',
      missions: [
        {
          title: '기체 상태 5가지 짝짓기', manual: true,
          goal: '카드(온도·밀도·예)를 눌러 고른 뒤 알맞은 <b>상태 줄</b>을 눌러 넣고, 5개를 모두 짝지어 확인하세요.',
          hint: '온도가 가장 낮고 밀도가 가장 높은 것은 분자 구름이에요. 가장 뜨겁고 희박한 것은 뜨거운 가스예요.',
          setup() { S.selCard = -1; setView('ism'); },
          check: () => { if (S.slots.some((c) => c < 0)) return '5개를 모두 넣어 주세요.'; if (ismOK()) return true; S.slots.forEach((c, i) => { S.wrongRow[i] = c === i ? 0 : 1; }); return '틀린 줄이 있어요(빨간 테두리). 온도와 밀도를 다시 비교해 보세요.'; },
          explain: '분자 구름은 10~20 K의 아주 차갑고 빽빽한 곳(별 탄생 장소), 이온화 수소(H II)는 젊고 뜨거운 별 둘레에서 약 10⁴ K, 뜨거운 가스는 초신성 폭발로 약 10⁶ K까지 가열되지만 아주 희박해요.',
        },
        {
          type: 'quiz', title: '왜 은하 중심은 적외선으로 볼까?',
          goal: '은하 중심 방향은 소광이 A_V ≈ 30등급이에요. 은하 중심을 연구할 때 가시광선보다 <b>적외선</b>을 쓰는 까닭은?',
          setup() { setView('ism'); },
          choices: ['적외선은 티끌에 덜 가려져요 (A_K = 0.11 × 30 = 3.3등급이라 약 5 %는 보여요)', '은하 중심은 적외선만 내보내기 때문이에요', '적외선은 파장이 짧아 티끌이 더 잘 흡수하기 때문이에요', '가시광선은 은하 중심에서 나오지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '별은 가시광선도 내보내요. 가시광선이 티끌에 거의 다 막혀서(10⁻¹²배) 못 보는 거예요.', '적외선은 파장이 길어요. 파장이 길수록 티끌에 덜 막혀요.', '가시광선도 나오지만 도중에 티끌이 거의 다 가려요.'],
          explain: 'A_V = 30이면 가시광선은 10^(−0.4×30) = 10⁻¹²배로 사라져요. 적외선 K 대역은 A_K = 0.11 × 30 = 3.3등급이라 10^(−0.4×3.3) ≈ 0.05, 즉 <b>약 5 %</b>는 도달해요. 그래서 적외선으로 관측해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-extinction', mount: '#game', badge: '성간 탐정', homeHref: '../../index.html#hu',
    featureLabels: { count: '🔭 하늘 16칸 · 가시광/적외선 · 표시', redden: '🌈 빛 알갱이 · 필터 6개 · E(B − V)', dist: '📏 두 거리 비교 · A_V 보정', ism: '🌌 기체 상태 카드 · 티끌 정리' },
    onFeatures() { updateCtl(); },
    levels,
  });
  levels.forEach((lv) => { if (typeof lv.summary === 'function') lv.summary = lv.summary(); });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view;
    if (v === 'count') setReadouts(['센 칸', CELLS.filter((c, i) => cntDone(i, S.wl)).length + ' / 16', '표시한 칸', S.marks.filter(Boolean).length + '칸', '보고 있는 파장', S.wl === 0 ? '가시광선' : '적외선(K)']);
    else if (v === 'redden') { let bk = -1; FIL.forEach((f, k) => { if (S.measOn[k] && (bk < 0 || A_of(k) > A_of(bk))) bk = k; }); setReadouts(['잰 필터', S.measOn.filter(Boolean).length + ' / 6', '소광 A_V', f2(S.av) + ' 등급', '가장 큰 소광', bk < 0 ? '—' : 'A_' + FIL[bk].n + ' = ' + f2(A_of(bk)) + ' 등급']); }
    else if (v === 'dist') setReadouts(['소광 무시 거리 d′', f0(dNoCorr) + ' pc', '보정 거리 d', dcOK() || FREE() ? f0(dCorr) + ' pc' : '직접 계산', '과대평가', dcOK() || FREE() ? f2(dNoCorr / dCorr) + '배' : '?']);
    else setReadouts(['짝지은 카드', S.slots.filter((c) => c >= 0).length + ' / 5', '맞게 짝지음', S.slots.filter((c, i) => c === i).length + ' / 5', '고른 카드', S.selCard >= 0 ? STATES[S.selCard].card[0] : '—']);
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'count': drawCount(dt, t); break;
      case 'redden': drawRed(dt, t); break;
      case 'dist': drawDist(dt, t); break;
      default: drawIsm(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, CELLS, DARK, NV, NIR, FIL, HIT, dNoCorr, dCorr, startCount, countedAll, darkOK, allMeas, ismOK, STATES, CSHUF, MEAN_IN, MEAN_OUT };
})();
