/* =========================================================
   행성우주과학 Ⅲ. 은하와 우주 - 은하 회전 곡선 (4차시)
   성취기준 [12행우03-03] 은하의 회전 속도 곡선을 이용하여 질량 분포를 이해하고 은하에 빛을 내지 않는 물질의 존재를 추론할 수 있다.
   ① 분석: 회전 곡선 (태양계 v ∝ r^(−1/2) vs 우리은하의 평평한 곡선)
   ② 분석: 안쪽 질량 (M(<r) = r v² / G, G = 4.30×10⁻⁶ kpc (km/s)² / M☉)
   ③ 예측: 빛의 질량 (별+가스의 누적 질량과 v_빛, 어긋나는 반지름, 보이지 않는 질량 비율)
   ④ 모형: 암흑 물질 (ρ ∝ r⁻² 헤일로, 우리은하·M31·NGC 3198의 공통 특징)
   다루지 않음: 암흑 물질의 정체(입자 후보), 우주의 구성 성분 비율, 중력 렌즈, 수정 중력 이론, 은하 형성 시뮬레이션.
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
  const numOf = (id) => { const e = $('#' + id); if (!e) return null; const v = e.value.trim().replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'); return v === '' || !isFinite(+v) ? null : +v; };
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
  const G = 4.30e-6;                                   // kpc (km/s)² / M☉
  const PLN = [
    { n: '수성', r: 0.387, rt: '0.39', v: 47.9, c: '#94a3b8' }, { n: '지구', r: 1.0, rt: '1.00', v: 29.8, c: '#3b82f6' },
    { n: '목성', r: 5.2, rt: '5.20', v: 13.1, c: '#f59e0b' }, { n: '해왕성', r: 30.07, rt: '30.1', v: 5.4, c: '#38bdf8' },
  ];
  const MW = { n: '우리은하', R: [2, 4, 6, 8, 12, 16, 20, 25, 30], V: [190, 205, 215, 220, 222, 220, 215, 210, 205], col: '#2563eb' };
  const GALS = [
    MW,
    { n: '안드로메다(M31)', R: [5, 10, 15, 20, 30], V: [230, 250, 250, 245, 240], col: '#7c3aed', r0: 10 },
    { n: 'NGC 3198', R: [3, 5, 10, 20, 30], V: [120, 140, 150, 150, 150], col: '#0d9488', r0: 10 },
  ];
  const Mdyn = (r, v) => r * v * v / G;
  const Mlight = (r) => 5e10 * (1 - (1 + r / 3) * Math.exp(-r / 3));
  const vLight = (r) => Math.sqrt(G * Mlight(r) / r);
  const vObs = (g, r) => interp(g.R, g.V, r);
  MW.M = MW.R.map((r, i) => Mdyn(r, MW.V[i])); MW.ML = MW.R.map((r) => Mlight(r)); MW.VL = MW.R.map((r) => vLight(r)); MW.inv = MW.R.map((r, i) => 1 - MW.ML[i] / MW.M[i]);
  const u10 = (m) => m / 1e10;
  const vModel = (r, mh) => Math.sqrt(G * (Mlight(r) + mh * 1e11 * r / 30) / r);
  const haloDev = (mh) => Math.max(...MW.R.map((r, i) => (r >= 12 ? Math.abs(vModel(r, mh) - MW.V[i]) : 0)));
  const haloOK = (mh) => haloDev(mh) <= 10;
  const OPTS = [
    '바깥으로 가도 회전 속도가 거의 일정(평평)해요. 어디서나 빛을 내지 않는 물질이 필요해요',
    '바깥으로 갈수록 회전 속도가 케플러 법칙처럼 줄어들어요',
    '세 은하의 최대 회전 속도가 모두 같아요',
    '바깥쪽 별은 회전하지 않고 안쪽 별만 돌아요',
  ];

  /* ================= 상태 ================= */
  const S = {
    view: 'solar', fade: 0,
    pl: PLN.map(() => null), fitOn: 0,
    rot: 0, kep: 0, ri: 3, rMark: -1, gal: 0, mh: 0, visited: [true, false, false], pick: -1, sh: 0,
    flags: { slope: false, calc1: false, calc2: false, pct: false, common: false, halo: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { solar: '🪐 태양계의 회전 곡선', rot: '🎡 우리은하의 회전', mass: '⚖ 안쪽 질량 M(<r)', light: '💡 빛으로 센 질량', halo: '🌫 암흑 물질 헤일로' };
  const modeBtns = $$('#modeSeg button');
  const HIT = { plot: null, rows: [], g1: null, g2: null };
  const placedN = () => S.pl.filter(Boolean).length;
  const slopeOK = () => near(numOf('inSl'), -0.5, 0.07);
  const gal = () => GALS[S.gal];

  /* ================= 레이아웃 ================= */
  const LYsolar = () => (PHONE ? { lst: { x: 8, y: 8, w: 464, h: 128 }, P: { x: 8, y: 144, w: 464, h: 520 }, info: { x: 8, y: 672, w: 464, h: 220 } } : { lst: { x: 10, y: 8, w: 206, h: 462 }, P: { x: 224, y: 8, w: 566, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  const LYdisc = () => (PHONE ? { A: { x: 8, y: 8, w: 464, h: 372 }, B: { x: 8, y: 388, w: 464, h: 360 }, info: { x: 8, y: 756, w: 464, h: 196 } } : { A: { x: 10, y: 8, w: 342, h: 462 }, B: { x: 360, y: 8, w: 430, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  const LYtwo = () => (PHONE ? { A: { x: 8, y: 8, w: 464, h: 372 }, B: { x: 8, y: 388, w: 464, h: 360 }, info: { x: 8, y: 756, w: 464, h: 196 } } : { A: { x: 10, y: 8, w: 386, h: 462 }, B: { x: 404, y: 8, w: 386, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  function infoBox(I, title, text, text2, ts) {
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    let yy = I.y + 24 * FS;
    T(I.x + 14, yy, title, PHONE ? 13 : 14, '#0369a1', 'left', 800);
    yy = drawWrap(I.x + 14, yy + 22 * FS, text, I.w - 28, ts || (PHONE ? 12.5 : 13.5), { color: '#334155' });
    if (text2) drawWrap(I.x + 14, yy + 24 * FS, text2, I.w - 28, ts ? ts - 0.5 : (PHONE ? 12 : 13), { color: '#64748b' });
  }
  const plotBoxOf = (P, lp, tp, bp, rp) => ({ x: P.x + lp, y: P.y + tp, w: P.w - lp - (rp || 16), h: P.h - tp - bp });

  /* ================= ① 태양계 로그 그래프 ================= */
  const solAx = (P) => mkAx(plotBoxOf(P, PHONE ? 62 : 58, 54, PHONE ? 66 : 58, PHONE ? 20 : 24), -0.7, 1.7, 0.4, 1.85);   // x: log r(AU), y: log v
  const solPos = (p) => ({ lx: log10(p.r), ly: log10(p.v) });
  function drawSolar(dt, t) {
    const L = LYsolar(), P = L.P, ax = solAx(P), b = ax.b, n = placedN();
    const l = L.lst; panel(l.x, l.y, l.w, l.h, { r: 14 });
    T(l.x + 14, l.y + 24 * FS, '행성의 (r, v)', PHONE ? 13 : 14, '#1e293b', 'left', 800);
    PLN.forEach((p, i) => {
      const done = !!S.pl[i]; let x, y, w, h;
      if (PHONE) { w = (l.w - 28 - 3 * 6) / 4; h = 76; x = l.x + 14 + i * (w + 6); y = l.y + 40 * FS + 2; } else { x = l.x + 12; w = l.w - 24; h = 84; y = l.y + 42 * FS + i * (h + 8); }
      ctx.fillStyle = done ? '#dcfce7' : '#f8fafc'; rr(x, y, w, h, 10).fill(); ctx.strokeStyle = done ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; rr(x, y, w, h, 10).stroke();
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x + 14, y + 16, 6, 0, TAU); ctx.fill();
      T(x + 26, y + 21, p.n, PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
      T(x + w / 2, y + (PHONE ? 44 : 46), 'r = ' + p.rt + ' AU', PHONE ? 11 : 13, '#475569', 'center', 800);
      T(x + w / 2, y + (PHONE ? 64 : 68), 'v = ' + f1(p.v) + ' km/s', PHONE ? 11 : 13, '#475569', 'center', 800);
      if (done) D.check(x + w - 12, y + 12, 8, 1);
    });
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '🪐 태양 둘레의 공전 속도 v와 거리 r (로그-로그)', PHONE ? 12 : 14, '#1e293b', 'left', 800);
    const xv = [0.3, 1, 3, 10, 30], yv = [3, 5, 10, 20, 50];
    drawAx(ax, { xt: xv.map(log10), yt: yv.map(log10), xf: (v) => String(Math.round(Math.pow(10, v) * 10) / 10), yf: (v) => String(Math.round(Math.pow(10, v))), xl: '태양에서의 거리 r (AU)', yl: '공전 속도 v (km/s)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 42 });
    HIT.plot = b;
    S.fitOn = approach(S.fitOn, slopeOK() && n === 4 ? 1 : 0, dt, 3);
    if (S.fitOn > 0.02) { clipBox(b, () => { const p1 = [ax.X(-0.7), ax.Y(log10(29.8) + 0.5 * 0.7)], p2 = [ax.X(1.7), ax.Y(log10(29.8) - 0.5 * 1.7)]; line([p1, [p1[0] + (p2[0] - p1[0]) * S.fitOn, p1[1] + (p2[1] - p1[1]) * S.fitOn]], '#f59e0b', 3, { dash: [8, 6] }); }); T(b.x + b.w - 8, b.y + 24, 'v ∝ r^(−1/2) (기울기 −0.5)', PHONE ? 11.5 : 13, '#b45309', 'right', 800); }
    PLN.forEach((p, i) => { const o = S.pl[i]; if (!o) return; o.t = Math.min(1, o.t + dt / 0.4); const q = solPos(p), x = ax.X(q.lx), y = ax.Y(q.ly); D.sphere(x, y, 9 * SciSim.ease.outBack(o.t), p.c, { gloss: true }); T(x + 13, y - 7, p.n, PHONE ? 11 : 12, '#1e293b', 'left', 800); });
    if (n === 0) T(b.x + b.w / 2, b.y + b.h / 2, '왼쪽 목록의 (r, v)를 그래프에 찍어요', 13.5, '#94a3b8', 'center', 800);
    infoBox(L.info, n === 4 && slopeOK() ? '✅ 기울기 −0.5: v ∝ r^(−1/2)' : '💡 질량이 중심에 모여 있으면 멀수록 느려져요 (케플러)', n === 4 && slopeOK() ? '태양계는 질량의 대부분이 태양에 모여 있어서, 멀리 있는 행성일수록 v = √(GM/r)로 느리게 돌아요: r이 100배면 v는 1/10이에요.' : '수성은 47.9 km/s, 해왕성은 5.4 km/s로 돌아요. 로그-로그 그래프에서 점들이 직선으로 놓이면 v가 r의 거듭제곱에 비례한다는 뜻이고, 기울기가 지수예요.', n === 4 ? '기울기 = (log v₂ − log v₁) / (log r₂ − log r₁). 두 점을 골라 계산해 보세요.' : '점을 찍으면 가로는 log r, 세로는 log v 눈금이에요.');
  }
  function solarDown(p) {
    const ax = solAx(LYsolar().P); if (!inR(p, ax.b)) return false;
    const lx = ax.iX(p.x), ly = ax.iY(p.y); let best = -1, bd = 9;
    PLN.forEach((q, i) => { if (S.pl[i]) return; const s = solPos(q), d = Math.hypot((lx - s.lx) / 0.14, (ly - s.ly) / 0.1); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd <= 1) { S.pl[best] = { t: 0 }; Sound.click(); const s = solPos(PLN[best]); parts.burst(ax.X(s.lx), ax.Y(s.ly), { count: 8, speed: 80, life: 0.5, size: 3, gravity: 0 }); updateCtl(); return true; }
    say('그 자리에는 점이 없어요. 목록의 r과 v를 확인해요', true, 2.2); return true;
  }

  /* ================= 은하 원반 그림 ================= */
  function drawDisc(A, g, o) {
    o = o || {};
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 8 * FS, R = Math.min(A.w, A.h - 56 * FS) / 2 - 8, sc = R / 32;
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip(); spaceBg(A.x, A.y, A.w, A.h, SciSim.time(), '#0b1230', '#16224a');
    // 헤일로 안개
    if (o.halo > 0.01) { const hg = ctx.createRadialGradient(cx, cy, 5, cx, cy, R * 1.12); hg.addColorStop(0, 'rgba(167,139,250,' + 0.55 * o.halo + ')'); hg.addColorStop(0.25, 'rgba(139,92,246,' + 0.38 * o.halo + ')'); hg.addColorStop(0.6, 'rgba(124,58,237,' + 0.2 * o.halo + ')'); hg.addColorStop(1, 'rgba(124,58,237,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, TAU); ctx.fill(); }
    D.glow(cx, cy, R * 0.9, '#6d83c9', 0.22);
    for (let a = 0; a < 2; a++) { const pts = []; for (let th = 0.3; th < 5.4; th += 0.1) { const r = 0.9 + th * 5.4, ang = th + a * Math.PI; pts.push([cx + Math.cos(ang) * r * sc, cy + Math.sin(ang) * r * sc]); } line(pts, 'rgba(165,180,252,.28)', Math.max(5, sc * 4)); }
    D.glow(cx, cy, 6 * sc, '#ffe9a8', 0.85);
    if (o.enc != null) { ctx.fillStyle = 'rgba(250,204,21,.16)'; ctx.beginPath(); ctx.arc(cx, cy, o.enc * sc, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, o.enc * sc, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(203,213,225,.45)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1; [10, 20, 30].forEach((r) => { ctx.beginPath(); ctx.arc(cx, cy, r * sc, 0, TAU); ctx.stroke(); }); ctx.setLineDash([]);
    ctx.restore();
    [10, 20, 30].forEach((r) => outlineT(cx + r * sc * 0.72 + 2, cy - r * sc * 0.72 - 2, r + ' kpc', PHONE ? 10 : 11, '#cbd5e1', 'left'));
    return { cx, cy, sc };
  }
  function ringDots(A, g, geo, vfn, o) {
    o = o || {};
    g.R.forEach((r, i) => {
      const v = vfn(r, i), om = v / r * 0.0075;
      const base = S.rot * om + i * 1.3;
      for (let k = 0; k < 3; k++) {
        const ang = base + k * TAU / 3, x = geo.cx + Math.cos(ang) * r * geo.sc, y = geo.cy + Math.sin(ang) * r * geo.sc;
        D.glow(x, y, 8, '#fde68a', 0.5); ctx.fillStyle = '#fff7d6'; ctx.beginPath(); ctx.arc(x, y, PHONE ? 3.4 : 3, 0, TAU); ctx.fill();
        if (k === 0) { const len = v / 220 * (PHONE ? 38 : 34); D.arrow(x, y, x - Math.sin(ang) * len, y + Math.cos(ang) * len, { color: o.col || '#4ade80', width: 2.4, head: 8 }); }
      }
    });
  }
  const keplerV = (r) => 220 * Math.sqrt(8 / r);

  /* ================= ② 우리은하 회전 ================= */
  function curveGraph(B, g, o) {
    o = o || {};
    const b = plotBoxOf(B, PHONE ? 62 : 56, 46, PHONE ? 66 : 58, 16), ax = mkAx(b, 0, 32, 0, 300);
    drawAx(ax, { xt: [0, 5, 10, 15, 20, 25, 30], yt: [0, 50, 100, 150, 200, 250, 300], xl: '은하 중심에서의 거리 r (kpc)', yl: '회전 속도 v (km/s)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 42, ts: PHONE ? 11 : 12 });
    return ax;
  }
  function drawRot(dt, t) {
    const L = LYdisc(), A = L.A, B = L.B;
    S.rot += dt; S.kep = approach(S.kep, S.kepT || 0, dt, 5);
    panel(A.x, A.y, A.w, A.h, { r: 14, fill: '#0b1230' });
    const geo = drawDisc(A, MW);
    ringDots(A, MW, geo, (r, i) => lerp(MW.V[i], keplerV(r), S.kep), { col: S.kep > 0.5 ? '#f87171' : '#4ade80' });
    T(A.x + 14, A.y + 22 * FS, S.kep > 0.5 ? '🎡 질량이 중심에 모여 있다면 (케플러)' : '🎡 우리은하의 회전 (화살표 길이 = 속력)', PHONE ? 12 : 13, '#e2e8f0', 'left', 800, { stroke: 'rgba(5,10,30,.7)', strokeWidth: 3 });
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '📈 우리은하의 회전 속도 곡선', PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
    const ax = curveGraph(B, MW), b = ax.b;
    clipBox(b, () => { const kp = []; for (let r = 4; r <= 32; r += 0.5) kp.push([ax.X(r), ax.Y(keplerV(r))]); line(kp, 'rgba(239,68,68,' + (0.35 + 0.65 * S.kep) + ')', 2.5, { dash: [7, 6] }); });
    line(MW.R.map((r, i) => [ax.X(r), ax.Y(MW.V[i])]), '#2563eb', 3.5);
    MW.R.forEach((r, i) => D.sphere(ax.X(r), ax.Y(MW.V[i]), 5.5, '#2563eb', { gloss: false }));
    D.sphere(ax.X(8), ax.Y(220), 8, '#f59e0b', { gloss: true }); T(ax.X(8) + 10, ax.Y(220) - 14, '태양', 12, '#b45309', 'left', 800);
    T(b.x + b.w - 6, ax.Y(keplerV(30)) - 8, '케플러 예상 (점선)', PHONE ? 10.5 : 11.5, '#dc2626', 'right', 800);
    T(b.x + b.w - 6, ax.Y(205) - 12, '관측 (평평)', PHONE ? 10.5 : 11.5, '#1d4ed8', 'right', 800);
    infoBox(L.info, '💡 우리은하는 바깥에서도 느려지지 않아요', '태양계처럼 질량이 중심에 모여 있다면 v가 r^(−1/2)로 줄어야 해요(점선: r = 30 kpc에서 약 ' + f0(keplerV(30)) + ' km/s). 그런데 관측한 회전 속도는 30 kpc까지 약 205~222 km/s로 거의 평평해요.', '왼쪽 그림의 점은 별(또는 가스)이고 화살표는 속도예요. [케플러라면] 단추로 비교해 보세요.');
  }

  /* ================= ③ 안쪽 질량 ================= */
  function drawMass(dt, t) {
    const L = LYtwo(), A = L.A, B = L.B, i = S.ri, r = MW.R[i], v = MW.V[i];
    S.rot += dt;
    panel(A.x, A.y, A.w, A.h, { r: 14, fill: '#0b1230' });
    const geo = drawDisc(A, MW, { enc: r });
    ringDots(A, MW, geo, (rr_, k) => MW.V[k], { col: '#4ade80' });
    outlineT(A.x + 14, A.y + 22 * FS, '⚖ 반지름 r 안쪽의 질량 M(<r)', PHONE ? 12 : 13, '#e2e8f0', 'left');
    const ex = geo.cx + r * geo.sc; D.label(clamp(ex, A.x + 70, A.x + A.w - 70), geo.cy + (PHONE ? 22 : 20), 'r = ' + r + ' kpc', { bg: '#ca8a04', size: 12.5 });
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '📊 안쪽 질량 M(<r) = r v² / G (×10¹⁰ M☉)', PHONE ? 12 : 13.5, '#1e293b', 'left', 800);
    const b = plotBoxOf(B, PHONE ? 62 : 56, 46, PHONE ? 66 : 58, 16), ax = mkAx(b, 0, 32, 0, 32);
    drawAx(ax, { xt: [0, 5, 10, 15, 20, 25, 30], yt: [0, 5, 10, 15, 20, 25, 30], xl: '반지름 r (kpc)', yl: '안쪽 질량 (×10¹⁰ M☉)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 42, ts: PHONE ? 11 : 12 });
    const known = (k) => k <= i;
    clipBox(b, () => { const pts = MW.R.map((q, k) => [ax.X(q), ax.Y(u10(MW.M[k]))]).filter((q, k) => known(k)); if (pts.length > 1) line(pts, '#f59e0b', 3.5); MW.R.forEach((q, k) => { if (known(k)) { ctx.fillStyle = '#fbbf24'; ctx.fillRect(ax.X(q) - 5 * (PHONE ? 1 : 0.9), ax.Y(u10(MW.M[k])), 10 * (PHONE ? 1 : 0.9), b.y + b.h - ax.Y(u10(MW.M[k]))); } }); });
    MW.R.forEach((q, k) => { if (known(k)) D.sphere(ax.X(q), ax.Y(u10(MW.M[k])), 5.5, '#d97706', { gloss: false }); });
    D.ring(ax.X(r), ax.Y(u10(MW.M[i])), 12, t, { color: '#16a34a', width: 2.5 });
    const sh = mShow(i) || FREE();
    D.label(clamp(ax.X(r) - 70, b.x + 78, b.x + b.w - 70), clamp(ax.Y(u10(MW.M[i])) - 26, b.y + 14, b.y + b.h - 14), 'M(<' + r + ' kpc) ' + (sh ? '= ' + f1(u10(MW.M[i])) : '= ?'), { bg: '#92400e', size: 12 });
    infoBox(L.info, '💡 원 궤도 가정: 구심력 = 중력', 'v² / r = G M(<r) / r² 에서 M(<r) = r v² / G예요(구 대칭 가정). r은 kpc, v는 km/s이면 G = 4.30×10⁻⁶ kpc (km/s)² / M☉예요. r = ' + r + ' kpc, v = ' + v + ' km/s → M = ' + (sh ? f1(u10(MW.M[i])) + '×10¹⁰ M☉' : '직접 계산') + '.', '슬라이더로 r을 키우면 안쪽 질량이 계속 쌓여요. 속도가 거의 같은데도 M이 커지는 것이 핵심이에요(r이 2배면 M도 약 2배).');
  }
  const mShow = (i) => (S.flags.calc1 && S.ri === 3 && nearRel(numOf('inMd'), u10(MW.M[3]), 0.06) && i === 3) || (S.flags.calc2 && S.ri === 8 && nearRel(numOf('inMd'), u10(MW.M[8]), 0.06) && i === 8);

  /* ================= ④ 빛의 질량 ================= */
  const rIdxOfX = (rv) => { let bi = 0; MW.R.forEach((q, k) => { if (Math.abs(q - rv) < Math.abs(MW.R[bi] - rv)) bi = k; }); return bi; };
  function drawLight(dt, t) {
    const L = LYtwo(), A = L.A, B = L.B, k = S.ri;
    panel(A.x, A.y, A.w, A.h, { r: 14 });
    T(A.x + 14, A.y + 24 * FS, '📊 누적 질량: 속도로 센 것과 빛으로 센 것 (×10¹⁰ M☉)', PHONE ? 11.5 : 13, '#1e293b', 'left', 800);
    const b1 = plotBoxOf(A, PHONE ? 62 : 56, 46, PHONE ? 66 : 58, 16), ax1 = mkAx(b1, 0, 32, 0, 32);
    drawAx(ax1, { xt: [0, 5, 10, 15, 20, 25, 30], yt: [0, 5, 10, 15, 20, 25, 30], xl: '반지름 r (kpc)', yl: '안쪽 질량 (×10¹⁰ M☉)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 42, ts: PHONE ? 11 : 12 });
    const dyn = MW.R.map((q, i) => [ax1.X(q), ax1.Y(u10(MW.M[i]))]), lig = []; for (let q = 0.5; q <= 30.01; q += 0.5) lig.push([ax1.X(q), ax1.Y(u10(Mlight(q)))]);
    clipBox(b1, () => {
      ctx.fillStyle = 'rgba(139,92,246,.22)'; ctx.beginPath(); dyn.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let q = 30; q >= 2; q -= 0.5) ctx.lineTo(ax1.X(q), ax1.Y(u10(Mlight(q)))); ctx.closePath(); ctx.fill();
      line(lig, '#eab308', 3.5); line(dyn, '#2563eb', 3.5);
    });
    MW.R.forEach((q, i) => D.sphere(ax1.X(q), ax1.Y(u10(MW.M[i])), 5, '#2563eb', { gloss: false }));
    T(b1.x + b1.w - 8, ax1.Y(u10(MW.M[8])) - 8, '속도로 센 질량', PHONE ? 10.5 : 11.5, '#1d4ed8', 'right', 800); T(b1.x + b1.w - 8, ax1.Y(u10(Mlight(30))) + 18, '빛으로 센 질량', PHONE ? 10.5 : 11.5, '#a16207', 'right', 800);
    D.dashedLine(ax1.X(MW.R[k]), b1.y, ax1.X(MW.R[k]), b1.y + b1.h, { color: '#16a34a', width: 1.8, dash: [5, 5] });
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '🚀 회전 속도: 관측 vs 빛의 질량으로 예상', PHONE ? 12 : 13.5, '#1e293b', 'left', 800);
    const b2 = plotBoxOf(B, PHONE ? 62 : 56, 46, PHONE ? 66 : 58, 16), ax2 = mkAx(b2, 0, 32, 0, 300);
    drawAx(ax2, { xt: [0, 5, 10, 15, 20, 25, 30], yt: [0, 50, 100, 150, 200, 250, 300], xl: '반지름 r (kpc) — 눌러서 반지름을 골라요', yl: '회전 속도 v (km/s)', ls: PHONE ? 11.5 : 13, ylx: PHONE ? 46 : 42, ts: PHONE ? 11 : 12 });
    HIT.g1 = ax1; HIT.g2 = ax2;
    const obs = [], vl = []; for (let q = 2; q <= 30.01; q += 0.5) { obs.push([ax2.X(q), ax2.Y(vObs(MW, q))]); vl.push([ax2.X(q), ax2.Y(vLight(q))]); }
    clipBox(b2, () => { ctx.fillStyle = 'rgba(139,92,246,.22)'; ctx.beginPath(); obs.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let j = vl.length - 1; j >= 0; j--) ctx.lineTo(vl[j][0], vl[j][1]); ctx.closePath(); ctx.fill(); line(vl, '#eab308', 3.5); line(obs, '#2563eb', 3.5); });
    MW.R.forEach((q, i) => { D.sphere(ax2.X(q), ax2.Y(MW.V[i]), 4.8, '#2563eb', { gloss: false }); });
    T(b2.x + b2.w - 8, ax2.Y(214) - 10, '관측', PHONE ? 11 : 12, '#1d4ed8', 'right', 800); T(b2.x + b2.w - 8, ax2.Y(vLight(30)) - 10, '빛의 질량으로 예상', PHONE ? 10.5 : 11.5, '#a16207', 'right', 800);
    D.dashedLine(ax2.X(MW.R[k]), b2.y, ax2.X(MW.R[k]), b2.y + b2.h, { color: '#16a34a', width: 1.8, dash: [5, 5] });
    if (S.rMark >= 0) { const x = ax2.X(S.rMark); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, b2.y); ctx.lineTo(x, b2.y + b2.h); ctx.stroke(); D.label(clamp(x, b2.x + 50, b2.x + b2.w - 50), b2.y + 16, '고른 r = ' + f1(S.rMark) + ' kpc', { bg: '#b45309', size: 12 }); }
    const rk = MW.R[k];
    infoBox(L.info, '💡 r = ' + rk + ' kpc: 관측 ' + MW.V[k] + ' km/s, 빛으로 예상 ' + f0(MW.VL[k]) + ' km/s', 'M(<' + rk + ') = ' + f1(u10(MW.M[k])) + '×10¹⁰, 빛으로 센 질량 ' + f1(u10(MW.ML[k])) + '×10¹⁰ M☉ → 보이지 않는 질량은 ' + f0(MW.inv[k] * 100) + ' %예요.', '별과 가스의 질량 합 5×10¹⁰ M☉가 반지름 3 kpc 원반으로 분포한다는 모형으로 빛의 질량을 계산했어요.');
  }
  function lightDown(p) {
    if (HIT.g2 && inR(p, HIT.g2.b)) { S.rMark = clamp(HIT.g2.iX(p.x), 0, 32); S.ri = rIdxOfX(S.rMark); Sound.click(); return true; }
    if (HIT.g1 && inR(p, HIT.g1.b)) { S.ri = rIdxOfX(HIT.g1.iX(p.x)); Sound.click(); return true; }
    return false;
  }
  const pctOK = () => near(numOf('inPc'), MW.inv[8] * 100, 2.2);

  /* ================= ⑤ 암흑 물질 헤일로 ================= */
  function drawHalo(dt, t) {
    const L = LYdisc(), A = L.A, B = L.B, g = gal(), isMW = S.gal === 0;
    S.rot += dt;
    S.halA = approach(S.halA || 0, isMW ? S.mh / 2.4 : 1, dt, 4);
    panel(A.x, A.y, A.w, A.h, { r: 14, fill: '#0b1230' });
    const geo = drawDisc(A, g, { halo: clamp(S.halA * 0.9, 0, 1.2) });
    ringDots(A, g, geo, (r, i) => g.V[i], { col: '#4ade80' });
    outlineT(A.x + 14, A.y + 22 * FS, '🌫 ' + g.n + ': 은하를 감싼 암흑 물질 헤일로', PHONE ? 11.5 : 13, '#e2e8f0', 'left');
    if (isMW) outlineT(A.x + 14, A.y + A.h - 14, '헤일로 질량(30 kpc 안쪽) = ' + f1(S.mh) + '×10¹¹ M☉', PHONE ? 11 : 12.5, '#ddd6fe', 'left');
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '📈 ' + g.n + '의 회전 속도 곡선', PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
    const ax = curveGraph(B, g), b = ax.b;
    if (isMW) {
      const vl = [], vm = []; for (let q = 2; q <= 30.01; q += 0.5) { vl.push([ax.X(q), ax.Y(vLight(q))]); vm.push([ax.X(q), ax.Y(vModel(q, S.mh))]); }
      clipBox(b, () => { line(vl, '#eab308', 2.8, { dash: [6, 5] }); line(vm, haloOK(S.mh) ? '#16a34a' : '#8b5cf6', 4); });
      MW.R.forEach((q, i) => D.sphere(ax.X(q), ax.Y(MW.V[i]), 5.5, '#2563eb', { gloss: false }));
      T(b.x + b.w - 8, ax.Y(vLight(30)) - 8, '별+가스만', PHONE ? 10.5 : 11.5, '#a16207', 'right', 800); T(b.x + b.w - 8, ax.Y(vModel(30, S.mh)) - 10, '별+가스+헤일로', PHONE ? 10.5 : 11.5, '#6d28d9', 'right', 800); T(b.x + 8, b.y + 18, '● 관측', PHONE ? 11 : 12, '#1d4ed8', 'left', 800);
    } else {
      clipBox(b, () => { const kp = []; for (let q = g.r0; q <= 32; q += 0.5) kp.push([ax.X(q), ax.Y(g.V[g.R.indexOf(g.r0)] * Math.sqrt(g.r0 / q))]); line(kp, 'rgba(239,68,68,.9)', 2.5, { dash: [7, 6] }); });
      line(g.R.map((q, i) => [ax.X(q), ax.Y(g.V[i])]), g.col, 3.5); g.R.forEach((q, i) => D.sphere(ax.X(q), ax.Y(g.V[i]), 5.5, g.col, { gloss: false }));
      T(b.x + b.w - 8, ax.Y(g.V[g.V.length - 1]) - 12, '관측 (평평)', PHONE ? 10.5 : 11.5, g.col, 'right', 800); T(b.x + b.w - 8, ax.Y(g.V[g.R.indexOf(g.r0)] * Math.sqrt(g.r0 / 30)) - 8, '케플러 예상 (점선)', PHONE ? 10.5 : 11.5, '#dc2626', 'right', 800);
    }
    const fit = isMW ? haloDev(S.mh) : 0;
    if (isMW) infoBox(L.info, haloOK(S.mh) ? '✅ 곡선이 관측에 맞았어요' : '💡 헤일로 질량 슬라이더를 움직여 곡선을 관측 점에 맞춰요', '헤일로는 밀도 ρ ∝ r⁻²라서 M_헤일로(<r) ∝ r 이고, v = √(GM/r)에서 바깥에서도 v가 일정해져요. 12 kpc 이상에서 모형과 관측의 차이: 최대 ' + f0(fit) + ' km/s' + (haloOK(S.mh) ? ' (10 이하!).' : ' (10 이하로 줄여요).'), haloOK(S.mh) ? '안쪽(r < 8 kpc)은 별 원반·팽대부의 영향이 커서 이 단순 모형과 조금 달라요. 30 kpc 안쪽 전체 질량 약 2.9×10¹¹ M☉ 중 빛으로 센 질량은 5×10¹⁰ M☉(약 17 %)예요.' : '30 kpc 안쪽 질량은 별+가스 5×10¹⁰ M☉에 헤일로 ' + f1(S.mh) + '×10¹¹ M☉를 더한 값이에요.');
    else infoBox(L.info, '💡 ' + g.n + '도 바깥에서 속도가 평평해요', '점선은 질량이 안쪽에 모여 있을 때(케플러) 예상되는 속도예요. 관측은 r = 30 kpc에서도 ' + g.V[g.V.length - 1] + ' km/s로 거의 줄지 않아요.', '세 은하(우리은하, M31, NGC 3198)를 모두 살펴보고 공통점을 찾아보세요.');
  }

  /* ================= 입력 · 컨트롤 ================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    if (PHONE) view.canvas.style.touchAction = v === 'solar' || v === 'light' ? 'none' : 'pan-y';
    updateCtl();
  }
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcSl').hidden = !(S.view === 'solar' && (S.flags.slope || free) && placedN() === 4);
    $('#slNote').hidden = !(S.view === 'solar' && !((S.flags.slope || free) && placedN() === 4));
    $('#calcMd').hidden = !(S.view === 'mass' && (S.flags.calc1 || S.flags.calc2 || free));
    $('#calcPc').hidden = !(S.view === 'light' && (S.flags.pct || free));
    $('#haloBox').hidden = !(S.view === 'halo' && S.gal === 0);
    $('#commonBox').hidden = !(S.view === 'halo' && (S.flags.common || free) && S.visited.every(Boolean));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#grpKep .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === (S.kepT || 0)));
    $$('#grpGal .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.gal));
    $$('#grpCommon .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.pick));
    $('#oRi').textContent = 'r = ' + MW.R[S.ri] + ' kpc, v = ' + MW.V[S.ri] + ' km/s';
  }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  sl('#sRi', '#oRi0', (v) => MW.R[v] + ' kpc', (v) => { S.ri = v; updateCtl(); });
  sl('#sMh', '#oMh', (v) => f1(v) + '×10¹¹ M☉', (v) => { S.mh = v; });
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpKep .opt').forEach((b) => clickable(b, () => { S.kepT = +b.dataset.k; updateCtl(); }));
  $$('#grpGal .opt').forEach((b) => clickable(b, () => { S.gal = +b.dataset.k; S.visited[S.gal] = true; updateCtl(); }));
  $$('#grpCommon .opt').forEach((b) => clickable(b, () => { S.pick = +b.dataset.k; updateCtl(); }));
  ['inSl'].forEach((id) => $('#' + id).addEventListener('input', () => { if (slopeOK()) fbIn(id, true); updateCtl(); }));
  $('#inMd').addEventListener('input', () => { const i = S.ri; if (nearRel(numOf('inMd'), u10(MW.M[i]), 0.06)) fbIn('inMd', true); });
  $('#inPc').addEventListener('input', () => { if (pctOK()) fbIn('inPc', true); });
  OPTS.forEach((t_, i) => { const g = $('#grpCommon'); const e = document.createElement('button'); e.type = 'button'; e.className = 'opt left'; e.dataset.k = i; e.textContent = t_; g.appendChild(e); clickable(e, () => { S.pick = i; updateCtl(); }); });
  $('#grpCommon').style.gridTemplateColumns = '1fr';

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'solar': return solarDown(p);
        case 'light': return lightDown(p);
        default: return false;
      }
    },
    move() {}, up() {},
    hover(p) {
      if (S.view === 'solar') return HIT.plot && inR(p, HIT.plot) ? 'crosshair' : '';
      if (S.view === 'light') return (HIT.g2 && inR(p, HIT.g2.b)) || (HIT.g1 && inR(p, HIT.g1.b)) ? 'pointer' : '';
      return '';
    },
  });

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '회전 곡선: 케플러 vs 평평한 곡선', short: '회전 곡선', icon: '🎡', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 은하는 보이는 별의 질량만큼만 무게가 나갈까?</p>' +
        '<div class="si-link">🔗 <b>역학과 에너지와 앞 차시에서</b> 원운동의 구심력이 중력이라는 것(M = rv² / G)과 케플러 법칙을 배웠어요. 태양계에서는 멀리 있는 행성일수록 느리게 돌아요. 은하에서도 그럴까요?</div>' +
        '<p>먼저 태양계 행성 4개의 (r, v)를 로그-로그 그래프에 찍어 v ∝ r^(−1/2)를 확인하고, 우리은하의 회전 속도 곡선과 비교해 보세요.</p>',
      features: ['solar', 'rot'],
      setup() { setView('solar'); },
      recap: '질량이 중심에 모여 있으면 v ∝ r^(−1/2)로 줄어요. 우리은하는 바깥에서도 평평해서 바깥쪽에도 질량이 계속 있다는 뜻이에요.',
      summary: '<ul><li>태양계: 질량이 태양에 모여 있어 <b>v ∝ r^(−1/2)</b> (수성 47.9 → 지구 29.8 → 목성 13.1 → 해왕성 5.4 km/s). 로그-로그 그래프의 기울기 −0.5.</li><li>우리은하의 <b>회전 속도 곡선</b>은 바깥(30 kpc)에서도 약 205~220 km/s로 <b>거의 평평</b>해요. 케플러대로면 30 kpc에서 약 114 km/s여야 해요.</li><li>속도가 줄지 않는다는 것은 <b>바깥쪽에도 질량이 계속 쌓여 있다</b>는 뜻이에요.</li></ul>',
      missions: [
        {
          title: '태양계 행성의 (r, v)와 기울기', manual: true,
          goal: '행성 4개의 (r, v)를 그래프에 찍은 뒤, 점들의 <b>기울기</b>(log v 대 log r)를 구해 입력하고 확인하세요.',
          hint: '수성과 해왕성의 점으로 (log 5.4 − log 47.9) / (log 30.1 − log 0.387) = (0.732 − 1.680) / (1.479 + 0.412) ≈ −0.50이에요.',
          setup() { S.flags.slope = true; setView('solar'); },
          check: () => { if (placedN() < 4) return '행성 4개를 모두 그래프에 찍어 주세요.'; const x = numOf('inSl'); if (x == null) return '기울기를 입력해 주세요.'; return slopeOK() ? true : (x > 0 ? '속도가 줄어드니 기울기는 음수예요.' : '두 점으로 (log v₂ − log v₁) / (log r₂ − log r₁)을 다시 계산해 보세요.'); },
          explain: '기울기는 약 <b>−0.5</b>예요: v ∝ r^(−1/2). 질량 대부분이 중심(태양)에 모여 있으면 v = √(GM/r)이라 거리가 100배 멀어질 때 속도는 1/10이 돼요.',
        },
        {
          type: 'quiz', title: '평평한 회전 곡선이 뜻하는 것',
          goal: '우리은하는 바깥에서도 회전 속도가 줄지 않고 <b>평평</b>해요. 이것이 뜻하는 것은?',
          setup() { S.kepT = 0; setView('rot'); },
          choices: ['바깥쪽에도 질량이 계속 쌓여 있어요', '은하 바깥은 별이 없어서 빠르게 돌아요', '바깥쪽 별은 중력을 받지 않아요', '은하 중심의 질량이 바깥으로 갈수록 커져요'],
          answer: 0,
          feedback: ['', '별이 없다고 빨리 도는 것이 아니에요. 속도를 정하는 것은 안쪽에 있는 질량이에요(v = √(GM/r)).', '바깥 별도 안쪽 질량의 중력을 받아 원운동을 해요. 평평하게 돈다는 것이 중력을 받는 증거예요.', '중심 질량은 변하지 않아요. 바깥으로 갈수록 그 안쪽에 포함되는 질량이 커진다는 뜻이에요.'],
          explain: 'v = √(G M(&lt;r) / r)가 r이 커져도 일정하려면 M(&lt;r)이 r에 비례해 늘어나야 해요. 즉 <b>바깥쪽에도 질량이 계속 쌓여 있다</b>는 뜻이에요. 눈에 보이는 별은 바깥에서 거의 없는데도요.',
        },
      ],
    },
    {
      title: '안쪽 질량: M = r v² / G', short: '안쪽 질량', icon: '⚖', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 회전 속도가 바깥에서도 평평하다는 것을 알았어요. 속도와 반지름으로 반지름 r <b>안쪽</b>에 있는 질량을 계산할 수 있어요: 구심력 = 중력.</div>' +
        '<p><b>M(&lt;r) = r v² / G</b> (G = 4.30×10⁻⁶ kpc (km/s)² / M☉, r: kpc, v: km/s)로 우리은하의 안쪽 질량을 구하고 r에 따라 어떻게 커지는지 살펴봐요.</p>',
      features: ['mass'],
      setup() { S.ri = 3; setSlider($('#sRi'), $('#oRi0'), 3, (v) => MW.R[v] + ' kpc'); setView('mass'); },
      recap: '속도가 거의 일정한데도 안쪽 질량 M(&lt;r)은 r에 따라 계속 커져요: 태양 안쪽 약 9.0×10¹⁰, 30 kpc 안쪽 약 2.9×10¹¹ M☉.',
      summary: '<ul><li><b>M(&lt;r) = r v² / G</b> (원 궤도, 구 대칭 가정, hm-kepler-gravity의 M = rv²/G와 같은 식).</li><li>우리은하: r = 8 kpc(태양), v = 220 km/s → M ≈ <b>9.0×10¹⁰ M☉</b>. r = 30 kpc, v = 205 km/s → M ≈ <b>2.9×10¹¹ M☉</b>.</li><li>v가 일정하면 <b>M(&lt;r)은 r에 비례</b>(r이 2배 → M도 2배)해요. 바깥으로 갈수록 안쪽 질량이 계속 쌓여요.</li></ul>',
      missions: [
        {
          title: '태양 위치 안쪽의 질량',
          goal: '슬라이더를 <b>r = 8 kpc</b>(v = 220 km/s)에 맞추고 M(&lt;r)을 <b>×10¹⁰ M☉ 단위</b>로 계산해 입력하세요.',
          hint: 'M = r v² / G = 8 × 220² / (4.30×10⁻⁶) = 387200 / 4.30×10⁻⁶ ≈ 9.0×10¹⁰ M☉ → 입력할 값은 9.0예요.',
          setup() { S.flags.calc1 = true; S.flags.calc2 = false; S.ri = 3; setSlider($('#sRi'), $('#oRi0'), 3, (v) => MW.R[v] + ' kpc'); clrIn('inMd'); setView('mass'); },
          check: () => S.ri === 3 && nearRel(numOf('inMd'), u10(MW.M[3]), 0.06), hold: 0.6,
          status: () => mark(S.ri === 3) + ' r = ' + MW.R[S.ri] + ' kpc &nbsp; ' + mark(S.ri === 3 && nearRel(numOf('inMd'), u10(MW.M[3]), 0.06)) + ' M = ' + ($('#inMd').value.trim() || '—') + '×10¹⁰ M☉',
          explain: 'M(&lt;8 kpc) = 8 × 220² / (4.30×10⁻⁶) ≈ <b>9.0×10¹⁰ M☉</b>. 태양보다 900억 배 무거운 질량이 태양 궤도 안쪽에 있어요.',
        },
        {
          title: '30 kpc 안쪽의 질량',
          goal: '슬라이더를 <b>r = 30 kpc</b>(v = 205 km/s)로 옮기고 M(&lt;r)을 <b>×10¹⁰ M☉ 단위</b>로 계산해 입력하세요.',
          hint: 'M = 30 × 205² / (4.30×10⁻⁶) ≈ 2.9×10¹¹ M☉ → 입력값은 약 29예요.',
          setup() { S.flags.calc1 = false; S.flags.calc2 = true; S.ri = 3; setSlider($('#sRi'), $('#oRi0'), 3, (v) => MW.R[v] + ' kpc'); clrIn('inMd'); setView('mass'); },
          check: () => S.ri === 8 && nearRel(numOf('inMd'), u10(MW.M[8]), 0.06), hold: 0.6,
          status: () => mark(S.ri === 8) + ' r = ' + MW.R[S.ri] + ' kpc &nbsp; ' + mark(S.ri === 8 && nearRel(numOf('inMd'), u10(MW.M[8]), 0.06)) + ' M = ' + ($('#inMd').value.trim() || '—') + '×10¹⁰ M☉',
          explain: 'M(&lt;30 kpc) = 30 × 205² / (4.30×10⁻⁶) ≈ <b>2.9×10¹¹ M☉</b>. 8 kpc 안쪽(9.0×10¹⁰)의 3배가 넘어요: 바깥 영역에도 질량이 많이 있어요.',
        },
        {
          type: 'quiz', title: 'r이 2배, v가 같다면',
          goal: '회전 속도 v가 같을 때 반지름 r이 <b>2배</b>가 되면 안쪽 질량 M(&lt;r)은 몇 배가 될까요?',
          setup() { setView('mass'); },
          choices: ['2배 (M = r v² / G에서 v가 같으므로 r에 비례해요)', '4배', '1/2배', '변하지 않아요'],
          answer: 0,
          feedback: ['', 'r²에 비례하는 것은 v가 아니라 다른 식이에요. M = r v² / G에서 r은 1제곱이에요.', 'r이 커지면 안쪽에 더 많은 질량이 포함돼요. 줄어들지 않아요.', 'v가 같아도 r이 커지면 M은 달라져요: M ∝ r.'],
          explain: 'M(&lt;r) = r v² / G에서 v가 같다면 M은 r에 비례해요(<b>2배</b>). 그래서 평평한 회전 곡선은 M(&lt;r) ∝ r, 즉 바깥으로 갈수록 질량이 일정한 비율로 쌓인다는 뜻이에요.',
        },
      ],
    },
    {
      title: '빛의 질량: 보이는 것만큼일까?', short: '빛의 질량', icon: '💡', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 회전 속도로 안쪽 질량 M(&lt;r)을 구했어요. 이제 별과 가스의 <b>빛(광도)</b>으로 센 질량과 비교해 봐요. 같을까요?</div>' +
        '<p>빛으로 센 질량(별+가스 합 5×10¹⁰ M☉, 반지름 3 kpc 원반)으로 예상한 회전 속도 v_빛 = √(G M_빛 / r)를 관측 곡선과 겹쳐 보고, 어긋나는 반지름과 보이지 않는 질량의 비율을 구해요.</p>',
      features: ['light'],
      setup() { S.ri = 3; S.rMark = -1; setView('light'); },
      recap: '빛으로 센 질량은 r > 10 kpc에서 거의 일정해서 v_빛이 줄어요. 관측은 평평하므로 바깥에는 빛을 내지 않는 질량이 있어요(30 kpc 안쪽 약 83 %).',
      summary: '<ul><li>빛으로 센 질량(별+가스)은 r > 10 kpc에서 약 5×10¹⁰ M☉로 거의 일정 → 예상 속도 v_빛는 케플러처럼 줄어요(30 kpc에서 85 km/s). 관측은 205~220 km/s로 평평해요.</li><li>30 kpc 안쪽: 속도로 센 질량 2.9×10¹¹ M☉, 빛으로 센 질량 5.0×10¹⁰ M☉ → 보이지 않는 질량 약 <b>83 %</b>(빛으로 센 것은 약 17 %).</li><li>두 질량이 일치하지 않는다는 사실에서 <b>빛을 내지 않는 물질</b>(암흑 물질)이 있다고 추론해요.</li></ul>',
      missions: [
        {
          title: '곡선이 크게 벌어지는 반지름', manual: true,
          goal: '오른쪽 속도 그래프에서 <b>빛의 질량으로 예상한 속도(노랑)</b>가 줄어들어 관측(파랑)과 크게 벌어지는 반지름을 눌러 표시하세요.',
          hint: '노란 곡선은 약 6 kpc에서 가장 높고 8 kpc부터 계속 내려가요. 약 8~10 kpc 근처를 눌러 보세요.',
          setup() { S.rMark = -1; setView('light'); },
          check: () => { if (S.rMark < 0) return '속도 그래프를 눌러 반지름을 표시해 주세요.'; return S.rMark >= 7 && S.rMark <= 12 ? true : (S.rMark < 7 ? '아직 노랑과 파랑 곡선이 크게 벌어지기 전이에요. 더 바깥을 눌러 보세요.' : '더 안쪽이에요. 노란 곡선이 내려가기 시작하는 곳을 눌러 보세요.'); },
          explain: '노란 곡선(v_빛)은 약 6 kpc에서 최대 146 km/s를 찍고 <b>8 kpc 이후 계속 줄어요</b>(12 kpc에서 128, 30 kpc에서 85 km/s). 관측은 220 km/s 근처로 평평하니 8~10 kpc 이후부터 차이가 뚜렷해요.',
        },
        {
          title: '30 kpc에서 보이지 않는 질량의 비율',
          goal: 'r = 30 kpc에서 속도로 센 질량 2.9×10¹¹ M☉ 중 빛으로 센 질량은 5.0×10¹⁰ M☉예요. <b>보이지 않는 질량의 비율(%)</b>을 구해 입력하세요.',
          hint: '(29.3 − 5.0) / 29.3 = 0.83 → 약 83 %예요.',
          setup() { S.flags.pct = true; S.ri = 8; clrIn('inPc'); setView('light'); },
          check: () => pctOK(), hold: 0.6,
          status: () => mark(pctOK()) + ' 보이지 않는 질량 = ' + ($('#inPc').value.trim() || '—') + ' %',
          explain: '보이지 않는 질량의 비율 = (2.93×10¹¹ − 5.0×10¹⁰) / 2.93×10¹¹ ≈ <b>83 %</b>. 은하 질량의 대부분이 빛을 내지 않아요(빛으로 센 질량은 약 17 %).',
        },
        {
          type: 'quiz', title: '빛의 질량으로 바깥 속도를 설명 못 하는 까닭',
          goal: '별과 가스의 빛으로 센 질량만으로는 바깥쪽의 <b>회전 속도</b>를 설명하지 못해요. 그 까닭은?',
          setup() { setView('light'); },
          choices: ['빛을 내지 않는 물질이 중력으로 바깥쪽 별을 당기고 있기 때문이에요', '바깥쪽 별이 안쪽보다 무겁기 때문이에요', '관측이 잘못되어 속도가 실제보다 빠르게 나왔기 때문이에요', '은하가 팽창하면서 바깥쪽이 빨라졌기 때문이에요'],
          answer: 0,
          feedback: ['', '별 하나의 질량이 아니라 그 안쪽에 있는 전체 질량이 속도를 정해요.', '세 은하의 관측이 모두 같은 경향이라 오류로 보기 어려워요.', '은하 하나의 회전은 우주 팽창이 아니라 은하 안의 중력으로 정해져요.'],
          explain: '속도는 안쪽 전체 질량이 정해요. 빛으로 센 질량(약 17 %)만으로는 낮은 v_빛가 나오는데 관측이 훨씬 빠르니, <b>빛을 내지 않지만 중력을 주는 물질</b>이 더 있다고 추론해요.',
        },
      ],
    },
    {
      title: '암흑 물질: 헤일로 모형', short: '암흑 물질', icon: '🌫', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛으로 센 질량이 은하 질량의 약 17 %뿐이라는 것을 알았어요. 나머지 보이지 않는 질량이 은하를 <b>구 모양으로 감싸고</b> 있다면 평평한 곡선을 설명할 수 있을까요?</div>' +
        '<p>밀도가 ρ ∝ r⁻²인 헤일로를 더하면 M_헤일로(&lt;r)은 r에 비례하므로 v = √(GM/r)이 일정해져요. 헤일로 질량을 조절해 우리은하의 곡선을 관측에 맞추고, M31과 NGC 3198도 확인해 보세요.</p>',
      features: ['halo'],
      setup() { S.gal = 0; S.mh = 0; S.halA = 0; setSlider($('#sMh'), $('#oMh'), 0, (v) => f1(v) + '×10¹¹ M☉'); setView('halo'); },
      recap: '헤일로(ρ ∝ r⁻²)를 더하면 바깥에서도 곡선이 평평해져요. 세 은하 모두 평평하므로 어디서나 빛을 내지 않는 물질이 필요해요.',
      summary: '<ul><li><b>암흑 물질 헤일로</b>: ρ ∝ r⁻² → M(&lt;r) ∝ r → v = √(GM/r) = 일정. 우리은하는 30 kpc 안쪽 헤일로 약 2.4×10¹¹ M☉(전체 약 2.9×10¹¹ M☉)를 더하면 12 kpc 이상의 곡선이 관측에 맞아요.</li><li>우리은하·M31(230~250 km/s)·NGC 3198(약 150 km/s)은 모두 <b>바깥에서 속도가 평평</b>해요. 어디서나 빛을 내지 않는 물질이 필요하다는 뜻이에요.</li><li><b>암흑 물질</b>은 빛(전자기파)을 내지 않아 직접 보이지 않지만 <b>중력으로 존재를 추론</b>해요. 정체는 아직 밝혀지지 않았어요(이 차시에서는 다루지 않아요).</li></ul>',
      missions: [
        {
          title: '헤일로를 더해 곡선 맞추기',
          goal: '슬라이더로 <b>헤일로 질량</b>을 키워 모형 곡선(보라)이 관측 점에 맞도록 하세요. 12 kpc 이상에서 차이가 10 km/s 이하이면 돼요.',
          hint: '30 kpc 안쪽 헤일로가 약 2.4×10¹¹ M☉일 때 가장 잘 맞아요. 슬라이더를 2.2~2.6 부근에 놓아 보세요.',
          setup() { S.gal = 0; S.flags.halo = true; setView('halo'); },
          check: () => S.gal === 0 && haloOK(S.mh), hold: 0.8,
          status: () => mark(haloOK(S.mh)) + ' 헤일로 ' + f1(S.mh) + '×10¹¹ M☉ · 12 kpc 이상 최대 차이 ' + f0(haloDev(S.mh)) + ' km/s',
          explain: '헤일로 <b>약 2.4×10¹¹ M☉</b>(전체 질량의 약 83 %)를 더하면 12 kpc 이상의 곡선이 관측에 3 km/s 안으로 맞아요. 헤일로가 없으면(0) 바깥에서 85 km/s까지 떨어져요.',
        },
        {
          title: '세 은하의 공통 특징', manual: true,
          goal: '우리은하·안드로메다(M31)·NGC 3198의 곡선을 모두 살펴보고, <b>공통 특징</b>을 골라 확인하세요.',
          hint: '각 은하의 파란 곡선이 바깥에서 어떻게 되는지, 빨간 점선(케플러 예상)과 비교해 보세요.',
          setup() { S.flags.common = true; S.visited = [S.gal === 0, S.gal === 1, S.gal === 2]; S.pick = -1; setView('halo'); },
          check: () => { if (!S.visited.every(Boolean)) return '세 은하를 모두 눌러 곡선을 살펴보세요.'; if (S.pick < 0) return '공통 특징을 골라 주세요.'; return S.pick === 0 ? true : '다시 비교해 보세요. 세 은하의 파란 곡선 모양이 비슷해요.'; },
          explain: '세 은하 모두 바깥에서 속도가 <b>거의 일정(평평)</b>해요: 케플러 예상(점선)처럼 줄어들지 않아요. 어디서나 보이는 별과 가스만으로는 설명이 안 되고, 빛을 내지 않는 물질이 필요해요.',
        },
        {
          type: 'quiz', title: '"암흑 물질"이라는 이름의 뜻',
          goal: '암흑 물질이라는 이름은 무엇을 뜻할까요?',
          setup() { setView('halo'); },
          choices: ['빛(전자기파)을 내지 않아 직접 보이지 않지만 중력으로 존재를 추론하는 물질이에요', '어두운 별이 많이 모인 것이고 정체가 이미 밝혀졌어요', '검은색이라서 이름이 그래요', '빛은 내지만 너무 멀어서 안 보이는 물질이에요'],
          answer: 0,
          feedback: ['', '어두운 별(갈색 왜성 등)만으로는 부족하고, 정체는 아직 확정되지 않았어요.', '색과는 상관이 없어요. 빛을 내지 않는다는 뜻이에요.', '멀어서 안 보이는 것이 아니라 은하 안에 있으면서도 빛을 내지 않아요.'],
          explain: '<b>암흑 물질</b>은 전자기파를 내지 않아 직접 볼 수 없고, <b>중력의 효과(회전 속도 등)</b>로만 존재를 추론해요. 정체(어떤 물질인지)는 이 차시에서 다루지 않아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-rotation-curve', mount: '#game', badge: '은하 질량 탐정', homeHref: '../../index.html#hu',
    featureLabels: { solar: '🪐 태양계 로그 그래프', rot: '🎡 은하 회전 · 케플러 비교', mass: '⚖ 안쪽 질량 계산기', light: '💡 빛의 질량 vs 속도 질량', halo: '🌫 헤일로 슬라이더 · 세 은하' },
    onFeatures() { updateCtl(); },
    levels,
  });
  levels.forEach((lv) => { if (typeof lv.summary === 'function') lv.summary = lv.summary(); });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view, k = S.ri;
    if (v === 'solar') setReadouts(['찍은 점', placedN() + ' / 4', '입력한 기울기', numOf('inSl') != null ? f2(numOf('inSl')) : '—', '실제 기울기', slopeOK() || FREE() ? '−0.50' : '직접 계산']);
    else if (v === 'rot') setReadouts(['태양 위치(8 kpc)의 속도', '220 km/s', '30 kpc의 관측 속도', '205 km/s', '30 kpc의 케플러 예상', f0(keplerV(30)) + ' km/s']);
    else if (v === 'mass') setReadouts(['반지름 r', MW.R[k] + ' kpc', '회전 속도 v', MW.V[k] + ' km/s', '안쪽 질량 M(<r)', mShow(k) || FREE() ? f1(u10(MW.M[k])) + '×10¹⁰ M☉' : '직접 계산']);
    else if (v === 'light') setReadouts(['반지름 r', MW.R[k] + ' kpc', '관측 v / 빛으로 예상 v', MW.V[k] + ' / ' + f0(MW.VL[k]) + ' km/s', '보이지 않는 질량', pctOK() || FREE() || k !== 8 ? f0(MW.inv[k] * 100) + ' %' : '직접 계산']);
    else { const g = gal(); setReadouts(['고른 은하', g.n, '바깥(30 kpc)의 관측 속도', g.V[g.V.length - 1] + ' km/s', S.gal === 0 ? '헤일로 질량' : '살펴본 은하', S.gal === 0 ? f1(S.mh) + '×10¹¹ M☉' : S.visited.filter(Boolean).length + ' / 3']); }
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'solar': drawSolar(dt, t); break;
      case 'rot': drawRot(dt, t); break;
      case 'mass': drawMass(dt, t); break;
      case 'light': drawLight(dt, t); break;
      default: drawHalo(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, MW, GALS, PLN, HIT, solAx, LYsolar, LYtwo, Mdyn, Mlight, haloOK, haloDev, vModel, OPTS, pctOK, slopeOK };
})();
