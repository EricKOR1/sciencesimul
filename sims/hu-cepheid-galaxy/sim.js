/* =========================================================
   행성우주과학 Ⅲ. 은하와 우주 - 세페이드와 우리은하 (2차시)
   성취기준 [12행우03-01] 성단의 C-M도를 이용하여 성단의 나이와 거리를 비교하고, 맥동변광성의 주기-광도 관계를 이용하여 우리은하의 구조와 규모를 추론할 수 있다. (맥동 변광성: 주기-광도 관계·우리은하의 구조와 규모)
   ① 관찰: 주기-광도 (광도 곡선에서 주기 읽기, 소마젤란 은하 세페이드의 m–log P 직선)
   ② 분석: 거리 계산 (P → M_V = −2.8 log P − 1.4 → m − M → d)
   ③ 탐구: 성단 지도 (구상 성단 24개의 거리로 지도 그리기, 평균 위치로 은하 중심 찾기)
   ④ 적용: 은하 규모 (지름 30 kpc, 빛 통과 시간, 거리 사다리)
   다루지 않음: 맥동 기작, 세페이드 Ⅰ·Ⅱ형·거문고자리 RR형의 관계 차이, 정확한 보정 상수, 은하 중심 블랙홀, 성간 소광(다음 차시에서 보정).
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
  const PLM = (P) => -2.8 * log10(P) - 1.4;                               // 주기-광도 관계 (단순 모형)
  const dKpcOf = (P, m) => Math.pow(10, (m - PLM(P) + 5) / 5) / 1000;
  const SMC = [[2, 17.2], [5, 16.1], [10, 15.3], [30, 13.9], [100, 12.5]];   // 소마젤란 은하 세페이드 (P[일], m)
  const SMC_MU = 19.5;
  // 구상 성단 24개 [ℓ°, b°, P(일), m]
  const GCD = [[346, -17, 9.6, 9.3], [358, 38, 5.8, 10], [335, 1, 16.8, 9.2], [74, 61, 7.4, 10.6], [17, -17, 14.7, 9.9], [95, 22, 22.7, 9.5], [11, -26, 4.2, 11.6], [346, 3, 31.5, 9.2], [13, -18, 10.8, 10.5], [353, -20, 13, 10.3], [315, 20, 28.3, 9.4], [10, -9, 7, 11.1], [344, 51, 19.5, 9.9], [349, -2, 13.4, 10.4], [316, -15, 36.6, 9.2], [21, -7, 10.4, 10.9], [5, -8, 23.9, 10.1], [356, -14, 16.8, 10.6], [319, 39, 34.4, 9.8], [38, 51, 11.8, 11.2], [350, -6, 24.7, 10.4], [337, -11, 48.3, 9.6], [17, 34, 43.3, 10.4], [353, -19, 67.5, 10.2]];
  const GC = GCD.map((g, i) => {
    const d = dKpcOf(g[2], g[3]), l = g[0] * DEG, b = g[1] * DEG;
    return { i, l: g[0], b: g[1], P: g[2], m: g[3], d, x: d * Math.cos(b) * Math.cos(l), y: d * Math.cos(b) * Math.sin(l), z: d * Math.sin(b) };
  });
  const MEAN = { x: GC.reduce((s, g) => s + g.x, 0) / GC.length, y: GC.reduce((s, g) => s + g.y, 0) / GC.length, z: GC.reduce((s, g) => s + g.z, 0) / GC.length };
  MEAN.r = Math.hypot(MEAN.x, MEAN.y, MEAN.z); MEAN.l = (Math.atan2(MEAN.y, MEAN.x) / DEG + 360) % 360;
  const RMAX = Math.max(...GC.map((g) => Math.hypot(g.x - MEAN.x, g.y - MEAN.y, g.z - MEAN.z)));
  const dTxt = (d) => f1(d) + ' kpc';
  const LAD = [
    { n: '연주 시차', reach: '수 kpc까지', kpc: 5 },
    { n: '주계열 맞추기', reach: '수십 kpc', kpc: 50 },
    { n: '세페이드 변광성', reach: '수십 Mpc', kpc: 3e4 },
    { n: '초신성 (최대 광도가 거의 같음)', reach: '수 Gpc', kpc: 3e6 },
    { n: '적색 편이 · 허블-르메트르 법칙', reach: '수천 Mpc 이상', kpc: 1e7 },
  ];
  const LSHUF = [3, 0, 4, 2, 1];
  // δ 세페우스자리: 주기 5.37일, V = 3.5 ~ 4.4
  const DCEP = { P: 5.37, vmax: 3.5, vmin: 4.4 };
  function lcF(t) {            // 0(가장 어두움) ~ 1(가장 밝음), 빠르게 밝아지고 천천히 어두워짐
    const ph = ((t / DCEP.P) % 1 + 1) % 1;
    return ph < 0.2 ? 0.5 * (1 - Math.cos(Math.PI * ph / 0.2)) : 0.5 * (1 + Math.cos(Math.PI * (ph - 0.2) / 0.8));
  }
  const lcMag = (t) => DCEP.vmin - (DCEP.vmin - DCEP.vmax) * lcF(t);
  const PEAKS = [0, 1, 2, 3].map((k) => 0.2 * DCEP.P + k * DCEP.P).filter((t) => t <= 16);
  const GYR = 2 * Math.PI * 8.0 * 3.0857e16 / 230 / 3.156e7;     // 태양의 공전 주기 (년)
  const LT30 = 30 * 3261.6;                                         // 지름 30 kpc (광년)

  /* ================= 상태 ================= */
  const S = {
    view: 'curve', fade: 0,
    t1: 2.0, t2: 9.0, lcDrag: null, lcGlow: 0,
    smc: SMC.map(() => null), y1: 14.0, y2: 14.0, hDrag: null, fitGlow: 0, sh: 0,
    lp: 0.73, m: 8.0,
    sel: -1, done: GC.map(() => false), manual: [], fly: GC.map(() => null), mapMode: 0, mk: { x: 4, y: 5, set: false, drag: false, tw: null }, mkGlow: 0, rGlow: 0,
    ang: 0, beam: 0, ladOrder: [], ladBar: 0,
    flags: { calcM: false, calcD: false, calcG: false, calcL: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { curve: '💓 세페이드의 광도 곡선', smc: '📈 소마젤란 은하의 세페이드', calc: '🧮 주기에서 거리까지', map: '🗺 구상 성단 지도', scale: '🌌 우리은하의 규모', ladder: '🪜 거리 사다리' };
  const modeBtns = $$('#modeSeg button');
  const HIT = { lc: null, smcBox: null, handles: [], chips: [], mapBox: null, ladCards: [], ladSlots: [], mapAx: null };
  const lpCur = () => S.lp, Pcur = () => Math.pow(10, S.lp);
  const dCur = () => dKpcOf(Pcur(), S.m);

  /* ================= 레이아웃 ================= */
  const LYcurve = () => (PHONE ? { P: { x: 8, y: 8, w: 464, h: 560 }, info: { x: 8, y: 576, w: 464, h: 220 } } : { P: { x: 10, y: 8, w: 780, h: 380 }, info: { x: 10, y: 396, w: 780, h: 216 } });
  const LYsmc = () => (PHONE ? { lst: { x: 8, y: 8, w: 464, h: 128 }, P: { x: 8, y: 144, w: 464, h: 520 }, info: { x: 8, y: 672, w: 464, h: 200 } } : { lst: { x: 10, y: 8, w: 206, h: 462 }, P: { x: 224, y: 8, w: 566, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  const LYcalc = () => (PHONE ? { G: { x: 8, y: 8, w: 464, h: 360 }, F: { x: 8, y: 376, w: 464, h: 410 }, info: { x: 8, y: 794, w: 464, h: 160 } } : { G: { x: 10, y: 8, w: 420, h: 462 }, F: { x: 438, y: 8, w: 352, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  const LYmap = () => (PHONE ? { M: { x: 8, y: 8, w: 464, h: 434 }, C: { x: 8, y: 450, w: 464, h: 336 }, info: { x: 8, y: 792, w: 464, h: 164 } } : { M: { x: 10, y: 8, w: 520, h: 462 }, C: { x: 538, y: 8, w: 252, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  const LYscale = () => (PHONE ? { G: { x: 8, y: 8, w: 464, h: 470 }, F: { x: 8, y: 486, w: 464, h: 280 }, info: { x: 8, y: 774, w: 464, h: 180 } } : { G: { x: 10, y: 8, w: 480, h: 462 }, F: { x: 498, y: 8, w: 292, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  const LYlad = () => (PHONE ? { L: { x: 8, y: 8, w: 464, h: 430 }, C: { x: 8, y: 446, w: 464, h: 290 }, info: { x: 8, y: 744, w: 464, h: 200 } } : { L: { x: 10, y: 8, w: 780, h: 330 }, C: { x: 10, y: 346, w: 780, h: 124 }, info: { x: 10, y: 478, w: 780, h: 134 } });
  function infoBox(I, title, text, text2, ts) {
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    let yy = I.y + 24 * FS;
    T(I.x + 14, yy, title, PHONE ? 13 : 14, '#0369a1', 'left', 800);
    yy = drawWrap(I.x + 14, yy + 22 * FS, text, I.w - 28, ts || (PHONE ? 12.5 : 13.5), { color: '#334155' });
    if (text2) drawWrap(I.x + 14, yy + 24 * FS, text2, I.w - 28, ts ? ts - 0.5 : (PHONE ? 12 : 13), { color: '#64748b' });
  }
  const dk = (c, a) => ({ c, a });

  /* ================= ① 광도 곡선 ================= */
  function lcBox(P) { return PHONE ? { x: P.x + 56, y: P.y + 190, w: P.w - 56 - 14, h: P.h - 190 - 84 } : { x: P.x + 312, y: P.y + 44, w: P.w - 312 - 18, h: P.h - 44 - 78 }; }
  const lcAx = (P) => mkAx(lcBox(P), 0, 16, 4.7, 3.3);
  function drawStar(cx, cy, f, t) {
    const r = 22 + 10 * f;
    D.glow(cx, cy, r * 3.2, '#ffe9a8', 0.25 + 0.5 * f);
    D.sphere(cx, cy, r, mixc('#ffcf6e', '#fff8dc', f), { gloss: false, light: '#ffffff', dark: '#e0961e' });
    ctx.save(); ctx.globalAlpha = 0.55 * f; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r + 8 + 6 * Math.sin(t * 5), 0, TAU); ctx.stroke(); ctx.restore();
  }
  function drawCurve(dt, t) {
    const L = LYcurve(), P = L.P, ax = lcAx(P), b = ax.b, tt = (t * 1.6) % 16, f = lcF(tt), mag = lcMag(tt);
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '💓 δ 세페우스자리: 부풀었다 줄어드는 별', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    // 별 모양
    const sx = PHONE ? P.x + P.w / 2 : P.x + 130, sy = PHONE ? P.y + 110 : P.y + 150;
    ctx.save(); rr(PHONE ? P.x + 14 : P.x + 14, PHONE ? P.y + 40 : P.y + 44, PHONE ? P.w - 28 : 232, PHONE ? 140 : 214, 12).clip();
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#16224a'); ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
    drawStar(sx, sy, f, t); ctx.restore();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; rr(PHONE ? P.x + 14 : P.x + 14, PHONE ? P.y + 40 : P.y + 44, PHONE ? P.w - 28 : 232, PHONE ? 140 : 214, 12).stroke();
    outlineT(PHONE ? P.x + 24 : P.x + 24, PHONE ? P.y + 164 : P.y + 238, '지금 V = ' + f2(mag) + ' 등급', PHONE ? 12 : 13, '#e2e8f0', 'left');
    // 광도 곡선
    drawAx(ax, { xt: [0, 2, 4, 6, 8, 10, 12, 14, 16], yt: [3.5, 3.75, 4, 4.25, 4.5], xf: (v) => String(v), yf: (v) => fN(v, 2), xl: '시간 (일)', yl: '밝기 V (등급, 위쪽이 밝음)', ls: PHONE ? 12 : 13, ylx: PHONE ? 48 : 46, ts: PHONE ? 10.5 : 11.5 });
    const pts = []; for (let x = 0; x <= 16.001; x += 0.1) pts.push([ax.X(x), ax.Y(lcMag(x))]);
    clipBox(b, () => line(pts, '#d97706', 3));
    // 지금 시각 표시
    const nx = ax.X(tt), ny = ax.Y(mag);
    D.dashedLine(nx, b.y, nx, b.y + b.h, { color: 'rgba(100,116,139,.5)', width: 1.4, dash: [4, 5] });
    D.sphere(nx, ny, 6, '#f59e0b', { gloss: false });
    // 주기 표시 막대
    HIT.lc = { ax };
    const t1 = S.t1, t2 = S.t2, x1 = ax.X(t1), x2 = ax.X(t2);
    S.lcGlow = approach(S.lcGlow, lcOK() ? 1 : 0, dt, 8);
    ctx.fillStyle = rgba('#0ea5e9', 0.12 + 0.1 * S.lcGlow); ctx.fillRect(Math.min(x1, x2), b.y, Math.abs(x2 - x1), b.h);
    [[x1, '1'], [x2, '2']].forEach(([x, n]) => {
      ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke();
      ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.moveTo(x - 11, b.y - 2); ctx.lineTo(x + 11, b.y - 2); ctx.lineTo(x, b.y + 14); ctx.closePath(); ctx.fill();
    });
    const my = b.y + b.h - 18;
    D.arrow(Math.min(x1, x2) + 2, my, Math.max(x1, x2) - 2, my, { color: '#0284c7', width: 2.5, head: 10 });
    D.label((x1 + x2) / 2, my - 18, '주기 P = ' + f1(Math.abs(t2 - t1)) + ' 일', { bg: lcOK() ? '#16a34a' : '#0369a1', size: 13 });
    if (S.lcGlow > 0.05) { ctx.save(); ctx.globalAlpha = S.lcGlow; PEAKS.slice(0, 3).forEach((pk) => D.ring(ax.X(pk), ax.Y(DCEP.vmax), 10, t, { color: '#22c55e', width: 2, speed: 1 })); ctx.restore(); }
    infoBox(L.info, '💡 맥동 변광성: 밝기가 일정한 주기로 변해요', '세페이드 변광성은 별이 부풀었다 줄어들며 밝기가 규칙적으로 변해요. 이웃한 두 최대 밝기 사이의 시간이 주기 P예요. δ 세페우스자리는 P가 약 5.4일이에요.', '파란 막대 두 개를 끌어 이웃한 두 밝은 봉우리에 맞추면 P를 읽을 수 있어요. 맥동이 생기는 원리는 다루지 않아요.');
  }
  const lcNearPeak = (t) => PEAKS.some((p) => Math.abs(t - p) <= 0.6);
  const lcOK = () => lcNearPeak(S.t1) && lcNearPeak(S.t2) && Math.abs(Math.abs(S.t2 - S.t1) - DCEP.P) <= 0.4;
  function curveDown(p) {
    const ax = HIT.lc && HIT.lc.ax; if (!ax) return false;
    if (!inR(p, { x: ax.b.x - 14, y: ax.b.y - 16, w: ax.b.w + 28, h: ax.b.h + 32 })) return false;
    const d1 = Math.abs(p.x - ax.X(S.t1)), d2 = Math.abs(p.x - ax.X(S.t2));
    S.lcDrag = d1 <= d2 ? 1 : 2; curveMove(p); return true;
  }
  function curveMove(p) {
    if (!S.lcDrag) return; const ax = HIT.lc.ax; let t = clamp(ax.iX(p.x), 0, 16);
    const pk = PEAKS.find((q) => Math.abs(q - t) <= 0.3); if (pk != null) t = pk;
    if (S.lcDrag === 1) S.t1 = Math.round(t * 100) / 100; else S.t2 = Math.round(t * 100) / 100;
  }

  /* ================= ② SMC 점 찍기 ================= */
  const smcAx = (P) => { const b = { x: P.x + (PHONE ? 62 : 56), y: P.y + 54, w: P.w - (PHONE ? 62 : 56) - (PHONE ? 54 : 62), h: P.h - 54 - (PHONE ? 66 : 58) }; return mkAx(b, 0.2, 2.2, 18.2, 11.4); };
  const smcPlaced = () => S.smc.filter(Boolean).length;
  const smcLineM = (lg) => S.y1 + (S.y2 - S.y1) * (lg - 0.2) / 2;
  const smcFitOK = () => smcPlaced() === 5 && SMC.every((s, i) => Math.abs(smcLineM(log10(s[0])) - s[1]) <= 0.3);
  function drawSmc(dt, t) {
    const L = LYsmc(), P = L.P, ax = smcAx(P), b = ax.b, n = smcPlaced();
    // 목록
    const l = L.lst; panel(l.x, l.y, l.w, l.h, { r: 14 });
    T(l.x + 14, l.y + 24 * FS, '관측한 세페이드', PHONE ? 13 : 14, '#1e293b', 'left', 800);
    SMC.forEach((s, i) => {
      const done = !!S.smc[i];
      let x, y, w, h;
      if (PHONE) { w = (l.w - 28 - 4 * 6) / 5; h = 62; x = l.x + 14 + i * (w + 6); y = l.y + 40 * FS + 4; } else { x = l.x + 12; w = l.w - 24; h = 66; y = l.y + 42 * FS + i * (h + 8); }
      ctx.fillStyle = done ? '#dcfce7' : '#f8fafc'; rr(x, y, w, h, 10).fill(); ctx.strokeStyle = done ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; rr(x, y, w, h, 10).stroke();
      T(x + w / 2, y + (PHONE ? 20 : 26), 'P = ' + s[0] + '일', PHONE ? 11.5 : 14, '#1e293b', 'center', 800);
      T(x + w / 2, y + (PHONE ? 40 : 48), 'm = ' + f1(s[1]), PHONE ? 11.5 : 14, '#475569', 'center', 800);
      if (done) D.check(x + w - 12, y + 12, 8, 1);
    });
    // 그래프
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '📈 겉보기 등급 m과 log P (소마젤란 은하)', PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
    S.fitGlow = approach(S.fitGlow, smcFitOK() ? 1 : 0, dt, 6);
    drawAx(ax, { xt: [0.5, 1, 1.5, 2], yt: [12, 13, 14, 15, 16, 17, 18], xf: (v) => String(v), yf: (v) => String(v), xl: 'log P  (P: 일)', yl: '겉보기 등급 m (위쪽이 밝음)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 42 });
    // P 눈금 (보조)
    [[2, 0.301], [5, 0.699], [10, 1], [30, 1.477], [100, 2]].forEach(([p, lg]) => { T(ax.X(lg), b.y - 5, p + '일', PHONE ? 9.5 : 10.5, '#94a3b8', 'center', 700); });
    HIT.smcBox = b; HIT.handles = [];
    if (n === 5 || FREE()) {
      const nx1 = ax.X(0.2), ny1 = ax.Y(S.y1), nx2 = ax.X(2.2), ny2 = ax.Y(S.y2);
      clipBox(b, () => line([[nx1, ny1], [nx2, ny2]], S.fitGlow > 0.5 ? '#16a34a' : '#f59e0b', 3.5));
      [[nx1, ny1, 1], [nx2, ny2, 2]].forEach(([x, y, k]) => { D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); }, { blur: 4, y: 2 }); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke(); HIT.handles.push({ x, y, k }); });
    }
    SMC.forEach((s, i) => {
      const o = S.smc[i]; if (!o) return; o.t = Math.min(1, o.t + dt / 0.4);
      const x = ax.X(log10(s[0])), y = ax.Y(s[1]), k = SciSim.ease.outBack(o.t);
      D.sphere(x, y, 8 * k, '#0ea5e9', { gloss: true });
      T(x + 12, y - 8, s[0] + '일', PHONE ? 10.5 : 11.5, '#0369a1', 'left', 800);
    });
    if (n === 0) T(b.x + b.w / 2, b.y + b.h / 2, '왼쪽 목록의 (P, m)을 그래프에 찍어요', 13.5, '#94a3b8', 'center', 800);
    if (n === 5 && !smcFitOK()) T(b.x + b.w / 2, b.y + 20, '두 동그라미를 끌어 직선을 점들에 맞춰요', 13, '#b45309', 'center', 800);
    if (S.fitGlow > 0.02 || FREE()) {
      const a = FREE() ? 1 : S.fitGlow;
      ctx.save(); ctx.globalAlpha = a;
      const rx = b.x + b.w + 6; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, b.y); ctx.lineTo(rx, b.y + b.h); ctx.stroke();
      for (let M = -7; M <= -1; M += 1) { const y = ax.Y(M + SMC_MU); if (y < b.y || y > b.y + b.h) continue; ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + 5, y); ctx.stroke(); T(rx + 7, y + 4, String(M), PHONE ? 10 : 11, '#15803d', 'left', 800); }
      T(rx + 2, b.y - 6 - 14 * FS, '절대 등급', PHONE ? 9.5 : 11, '#15803d', 'left', 800); T(rx + 2, b.y - 6, 'M', PHONE ? 10 : 11, '#15803d', 'left', 800);
      ctx.restore();
    }
    const slope = (S.y2 - S.y1) / 2;
    infoBox(L.info, smcFitOK() ? '✅ 직선이 맞았어요: 주기가 길수록 더 밝아요' : '💡 같은 거리의 세페이드는 겉보기 등급 차이 = 절대 등급 차이', smcFitOK() ? 'm = 18.1 − 2.8 log P → 절대 등급 M = m − 19.5 = −2.8 log P − 1.4 (P: 일). 이것이 리비트가 발견한 주기-광도 관계예요(단순 모형).' : '소마젤란 은하의 세페이드는 모두 거의 같은 거리(약 62 kpc, 거리 지수 19.5)에 있어요. 그러니 m의 차이는 M의 차이예요. 점이 직선으로 늘어서면 주기와 실제 밝기가 관계있다는 뜻이에요.', n === 5 ? '현재 직선의 기울기: ' + f1(slope) + ' 등급 / (log P 1 증가)' : '점을 찍으면 점이 나타나요: 가로는 log P, 세로는 m이에요.');
  }
  function smcDown(p) {
    const ax = smcAx(LYsmc().P);
    for (const h of HIT.handles) if (Math.hypot(p.x - h.x, p.y - h.y) <= 20) { S.hDrag = h.k; return true; }
    if (!inR(p, ax.b)) return false;
    const lg = ax.iX(p.x), m = ax.iY(p.y); let best = -1, bd = 9;
    SMC.forEach((s, i) => { if (S.smc[i]) return; const d = Math.hypot((lg - log10(s[0])) / 0.13, (m - s[1]) / 0.5); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd <= 1) { S.smc[best] = { t: 0 }; Sound.click(); parts.burst(ax.X(log10(SMC[best][0])), ax.Y(SMC[best][1]), { count: 8, speed: 80, life: 0.5, size: 3, gravity: 0 }); return true; }
    say('그 자리에는 점이 없어요. 목록의 P와 m을 다시 확인해요', true, 2.2); return true;
  }
  function smcMove(p) {
    if (!S.hDrag) return; const ax = smcAx(LYsmc().P), m = clamp(Math.round(ax.iY(p.y) * 20) / 20, 10, 19);
    if (S.hDrag === 1) S.y1 = m; else S.y2 = m;
  }

  /* ================= ③ 주기에서 거리까지 ================= */
  const mOkNow = () => near(numOf('inM'), PLM(Pcur()), 0.15);
  const dOkNow = () => nearRel(numOf('inDk'), dCur(), 0.05);
  function drawCalc(dt, t) {
    const L = LYcalc(), G = L.G, F = L.F;
    panel(G.x, G.y, G.w, G.h, { r: 14 });
    T(G.x + 14, G.y + 24 * FS, '📈 주기-광도 관계 (M_V = −2.8 log P − 1.4)', PHONE ? 12.5 : 13.5, '#1e293b', 'left', 800);
    const b = { x: G.x + (PHONE ? 62 : 56), y: G.y + 54, w: G.w - (PHONE ? 62 : 56) - 18, h: G.h - 54 - (PHONE ? 66 : 58) }, ax = mkAx(b, 0.3, 2.0, -0.5, -8.5);
    drawAx(ax, { xt: [0.5, 1, 1.5, 2], yt: [-1, -2, -3, -4, -5, -6, -7, -8], xf: (v) => String(v), yf: (v) => String(v), xl: 'log P  (P: 일)', yl: '절대 등급 M_V (위쪽이 밝음)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 42 });
    [[2, 0.301], [5, 0.699], [10, 1], [30, 1.477], [100, 2]].forEach(([p, lg]) => { if (lg >= 0.3) T(ax.X(lg), b.y - 5, p + '일', PHONE ? 9.5 : 10.5, '#94a3b8', 'center', 800); });
    clipBox(b, () => line([[ax.X(0.3), ax.Y(PLM(Math.pow(10, 0.3)))], [ax.X(2), ax.Y(PLM(100))]], '#f59e0b', 3.5));
    const lp = clamp(S.lp, 0.3, 2.0), px = ax.X(lp), py = ax.Y(PLM(Pcur()));
    D.dashedLine(px, py, px, b.y + b.h, { color: '#0ea5e9', width: 1.6 }); D.dashedLine(b.x, py, px, py, { color: '#0ea5e9', width: 1.6 });
    D.sphere(px, py, 9, '#0ea5e9', { gloss: true });
    D.label(clamp(px + 56, b.x + 70, b.x + b.w - 56), clamp(py - 24, b.y + 14, b.y + b.h - 14), 'M_V ' + (mOkNow() || FREE() ? '= ' + f1(PLM(Pcur())) : '= ?'), { bg: '#0369a1', size: 12.5 });
    // 흐름
    panel(F.x, F.y, F.w, F.h, { r: 14 });
    T(F.x + 14, F.y + 24 * FS, '🔗 네 걸음 계산', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const mok = mOkNow() || FREE(), dok = dOkNow() || FREE(), Mv = PLM(Pcur()), mmv = S.m - Mv;
    const items = [
      ['① 주기 P', f1(Pcur()) + ' 일', true, '#0ea5e9'],
      ['② 절대 등급 M_V = −2.8 log P − 1.4', mok ? f1(Mv) + ' 등급' : '?', mok, '#8b5cf6'],
      ['③ 거리 지수 m − M  (m = ' + f1(S.m) + ')', mok ? f1(mmv) : '?', mok, '#f59e0b'],
      ['④ 거리 d = 10^((m − M + 5)/5)', dok ? f1(dCur()) + ' kpc' : '?', dok, '#16a34a'],
    ];
    const bh = (F.h - 46 * FS - 14) / 4;
    items.forEach((it, i) => {
      const y = F.y + 40 * FS + i * bh, on = it[2];
      ctx.fillStyle = on ? rgba(it[3], 0.14) : '#f1f5f9'; rr(F.x + 12, y, F.w - 24, bh - 12, 12).fill(); ctx.strokeStyle = on ? it[3] : '#cbd5e1'; ctx.lineWidth = 2; rr(F.x + 12, y, F.w - 24, bh - 12, 12).stroke();
      T(F.x + 24, y + 22 * Math.min(FS, 1.15), it[0], PHONE ? 12 : 13, '#475569', 'left', 800);
      T(F.x + F.w / 2, y + bh - 22 - (PHONE ? 4 : 0), it[1], PHONE ? 20 : 22, on ? '#1e293b' : '#94a3b8', 'center', 800);
      if (i < 3) { ctx.fillStyle = '#94a3b8'; ctx.beginPath(); const cx = F.x + F.w / 2, cy = y + bh - 12; ctx.moveTo(cx - 8, cy - 1); ctx.lineTo(cx + 8, cy - 1); ctx.lineTo(cx, cy + 6); ctx.closePath(); ctx.fill(); }
    });
    infoBox(L.info, '💡 주기를 알면 절대 등급을 알 수 있어요', '세페이드의 주기 P를 재면 주기-광도 관계에서 절대 등급 M_V를 알고, 관측한 겉보기 등급 m과 비교해 거리 지수 m − M = 5 log d − 5로 거리를 구해요(성간 소광은 무시). 예) P = 3일 → M = −2.7, P = 30일 → M = −5.5.', 'P 20일은 P 10일보다 약 0.8등급 더 밝은 별이에요.');
  }

  /* ================= ④ 성단 지도 ================= */
  const mapGeom = (P, mode) => { const b = { x: P.x + 40, y: P.y + 36, w: P.w - 40 - 14, h: P.h - 36 - 40 }, sc = Math.min(b.w / 33, b.h / 24), cx = b.x + b.w / 2, cy = b.y + b.h / 2; return { b, sc, X: (x) => cx + (x - 11.5) * sc, Y: (y) => cy - y * sc, iX: (px) => 11.5 + (px - cx) / sc, iY: (py) => (cy - py) / sc }; };
  const mapCoord = (g) => (S.mapMode === 0 ? [g.x, g.y] : [g.x, g.z]);
  function chipRect(i) { const L = LYmap().C; if (PHONE) { const cols = 6, w = (L.w - 24 - (cols - 1) * 6) / cols, h = 44; return { x: L.x + 12 + (i % cols) * (w + 6), y: L.y + 40 + Math.floor(i / cols) * (h + 6), w, h }; } const cols = 4, w = (L.w - 24 - (cols - 1) * 6) / cols, h = 40; return { x: L.x + 12 + (i % cols) * (w + 6), y: L.y + 40 + Math.floor(i / cols) * (h + 6), w, h }; }
  const mapCount = () => S.done.filter(Boolean).length;
  function mkDist() { return Math.hypot(S.mk.x - MEAN.x, S.mk.y - MEAN.y); }
  const mapOK = () => mapCount() === 24 && S.mk.set && mkDist() <= 1.0;
  function drawMap(dt, t) {
    const L = LYmap(), M = L.M, g = mapGeom(M), b = g.b;
    panel(M.x, M.y, M.w, M.h, { r: 14 });
    T(M.x + 14, M.y + 24 * FS, S.mapMode === 0 ? '🗺 위에서 본 지도 (태양이 가운데 기준점)' : '🗺 옆에서 본 지도 (x–z)', PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
    ctx.save(); rr(b.x, b.y, b.w, b.h, 8).clip();
    const bg = ctx.createRadialGradient(g.X(MEAN.x), g.Y(0), 10, g.X(MEAN.x), g.Y(0), b.w * 0.6); bg.addColorStop(0, '#16224a'); bg.addColorStop(1, '#070c22'); ctx.fillStyle = bg; ctx.fillRect(b.x, b.y, b.w, b.h);
    // 거리 고리 (태양 기준)
    ctx.strokeStyle = 'rgba(148,163,184,.28)'; ctx.lineWidth = 1;
    [5, 10, 15, 20, 25].forEach((r) => { ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), r * g.sc, 0, TAU); ctx.stroke(); if (g.X(r) < b.x + b.w) T(g.X(r) + 3, g.Y(0) + 13, r + ' kpc', PHONE ? 9.5 : 10.5, 'rgba(203,213,225,.8)', 'left', 700); });
    ctx.strokeStyle = 'rgba(148,163,184,.35)'; ctx.beginPath(); ctx.moveTo(b.x, g.Y(0)); ctx.lineTo(b.x + b.w, g.Y(0)); ctx.stroke();
    // 은하 중심 (찾았을 때)
    S.rGlow = approach(S.rGlow, mapOK() || (FREE() && mapCount() === 24) ? 1 : 0, dt, 3);
    if (S.mapMode === 0 && S.rGlow > 0.02) { ctx.strokeStyle = rgba('#fde047', 0.8 * S.rGlow); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.X(MEAN.x), g.Y(MEAN.y), RMAX * g.sc * S.rGlow, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    // 점
    GC.forEach((c, i) => {
      const f = S.fly[i]; if (!f) return;
      f.t = Math.min(1, f.t + dt / 0.8 * (f.delay > 0 ? 0 : 1)); if (f.delay > 0) { f.delay -= dt; return; }
      const [mx, my] = mapCoord(c), tx = g.X(mx), ty = g.Y(my), r_ = chipRect(i), e = SciSim.ease.outCubic(f.t);
      const x = lerp(r_.x + r_.w / 2, tx, e), y = lerp(r_.y + r_.h / 2, ty, e) - Math.sin(Math.PI * e) * 30;
      ctx.globalAlpha = 1; D.glow(x, y, 9, '#67e8f9', 0.5); ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.arc(x, y, PHONE ? 4.4 : 4.8, 0, TAU); ctx.fill(); ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 1; ctx.stroke();
      if (f.t >= 1 && !f.landed) { f.landed = true; S.done[i] = true; }
    });
    // 평균 위치 표시
    if (S.mk.set && S.mapMode === 0) {
      const mx = g.X(S.mk.x), my = g.Y(S.mk.y); S.mkGlow = approach(S.mkGlow, mapOK() ? 1 : 0, dt, 6);
      ctx.strokeStyle = mapOK() ? '#4ade80' : '#fde047'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx - 16, my); ctx.lineTo(mx + 16, my); ctx.moveTo(mx, my - 16); ctx.lineTo(mx, my + 16); ctx.stroke(); ctx.beginPath(); ctx.arc(mx, my, 9, 0, TAU); ctx.stroke();
      if (S.mkGlow > 0.05) { ctx.save(); ctx.globalAlpha = S.mkGlow; D.ring(mx, my, 24, t, { color: '#4ade80', width: 3 }); ctx.restore(); }
    }
    // 태양
    D.glow(g.X(0), g.Y(0), 22, '#ffd447', 0.6); D.sphere(g.X(0), g.Y(0), 7, '#ffb703', { gloss: false });
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; rr(b.x, b.y, b.w, b.h, 8).stroke();
    outlineT(g.X(0) + 10, g.Y(0) - 10, '태양', PHONE ? 11 : 12, '#fde68a', 'left');
    outlineT(b.x + b.w - 8, g.Y(0) - 8, 'ℓ = 0° (궁수자리 방향) →', PHONE ? 10.5 : 11.5, '#cbd5e1', 'right');
    if (S.mk.set && S.mapMode === 0) outlineT(b.x + 8, b.y + b.h - 10, '표시한 중심: 태양에서 ' + f1(Math.hypot(S.mk.x, S.mk.y)) + ' kpc, ℓ = ' + f0((Math.atan2(S.mk.y, S.mk.x) / DEG + 360) % 360) + '°', PHONE ? 11 : 12.5, '#fde047', 'left');
    if (mapCount() === 0 && S.mapMode === 0) outlineT(b.x + b.w / 2, b.y + b.h / 2 - 40, '오른쪽 번호 단추에서 성단을 골라 거리를 계산해요', PHONE ? 11.5 : 13, '#cbd5e1', 'center');
    // 성단 단추
    const C = L.C; panel(C.x, C.y, C.w, C.h, { r: 14 });
    T(C.x + 14, C.y + 24 * FS, '구상 성단 24개  (' + mapCount() + ' / 24 계산)', PHONE ? 12.5 : 13.5, '#1e293b', 'left', 800);
    HIT.chips = [];
    GC.forEach((c, i) => {
      const r = chipRect(i), sel = S.sel === i, ok = S.done[i] || (S.fly[i] != null);
      ctx.fillStyle = ok ? '#dcfce7' : sel ? '#e0f2fe' : '#f8fafc'; rr(r.x, r.y, r.w, r.h, 9).fill(); ctx.strokeStyle = sel ? '#0284c7' : ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = sel ? 3 : 1.6; rr(r.x, r.y, r.w, r.h, 9).stroke();
      T(r.x + r.w / 2, r.y + r.h / 2 + 5, String(i + 1), 14, ok ? '#166534' : '#334155', 'center', 800);
      HIT.chips.push({ r, i });
    });
    // 선택한 성단 카드
    const cy = chipRect(23).y + chipRect(23).h + 12;
    if (S.sel >= 0) {
      const c = GC[S.sel], showD = S.done[S.sel] || FREE();
      T(C.x + 14, cy + 14, '성단 ' + (S.sel + 1) + ': ℓ = ' + c.l + '°, b = ' + c.b + '°', PHONE ? 12 : 12.5, '#1e293b', 'left', 800);
      T(C.x + 14, cy + 14 + 21 * FS, '세페이드 P = ' + f1(c.P) + '일, m = ' + f1(c.m), PHONE ? 12 : 12.5, '#475569', 'left', 800);
      T(C.x + 14, cy + 14 + 42 * FS, '→ M = ' + f1(PLM(c.P)) + ', m − M = ' + f1(c.m - PLM(c.P)), PHONE ? 12 : 12.5, '#475569', 'left', 800);
      T(C.x + 14, cy + 14 + 63 * FS, showD ? 'd = ' + dTxt(c.d) : 'd = ? kpc (직접 계산)', PHONE ? 13 : 13.5, showD ? '#15803d' : '#94a3b8', 'left', 800);
    } else drawWrap(C.x + 14, cy + 16, '번호를 눌러 성단을 고르고, 거리 d(kpc)를 계산해 입력해요.', C.w - 28, 12.5, { color: '#64748b' });
    infoBox(L.info, '💡 구상 성단의 중심 = 우리은하의 중심', '샤플리는 구상 성단 속 변광성으로 거리를 재어 지도를 그렸어요. 성단은 태양이 아니라 궁수자리 쪽의 한 점을 중심으로 공 모양으로 퍼져 있어요. 그 점이 은하의 중심이고 태양은 중심에서 약 8 kpc 떨어져 있어요.', mapCount() === 24 ? '표시한 십자가가 점들의 평균 위치(공의 중심)에 오도록 끌어 놓아요. 평균 위치의 거리: 약 ' + f1(MEAN.r) + ' kpc.' : '성단 3개를 직접 계산하면 나머지는 모둠 표로 불러올 수 있어요.');
  }
  function mapDown(p) {
    for (const c of HIT.chips) if (inR(p, c.r)) { S.sel = c.i; clrIn('inDk2'); $('#inDk2').dataset.i = c.i; Sound.click(); updateCtl(); return true; }
    const g = mapGeom(LYmap().M);
    if (S.mapMode === 0 && inR(p, g.b) && (mapCount() >= 10 || FREE())) { S.mk.set = true; S.mk.drag = true; S.mk.x = g.iX(p.x); S.mk.y = g.iY(p.y); return true; }
    return false;
  }
  function mapMove(p) { if (!S.mk.drag) return; const g = mapGeom(LYmap().M); S.mk.x = clamp(g.iX(p.x), -5, 28); S.mk.y = clamp(g.iY(p.y), -12, 12); }
  function flyIn(i, delay) { if (S.fly[i]) return; S.fly[i] = { t: 0, delay: delay || 0 }; }
  function fillTeam() { let k = 0; GC.forEach((c, i) => { if (!S.fly[i]) flyIn(i, (k++) * 0.07); }); }

  /* ================= ⑤ 은하 규모 ================= */
  function drawScale(dt, t) {
    const L = LYscale(), G = L.G, F = L.F;
    panel(G.x, G.y, G.w, G.h, { r: 14, fill: '#0b1230' });
    T(G.x + 14, G.y + 24 * FS, '🌌 위에서 본 우리은하 (지름 약 30 kpc)', PHONE ? 12.5 : 14, '#e2e8f0', 'left', 800);
    const cx = G.x + G.w / 2, cy = G.y + G.h / 2 + 8, sc = Math.min((G.w - 36) / 30, (G.h - 90) / 30);
    ctx.save(); rr(G.x, G.y, G.w, G.h, 14).clip(); spaceBg(G.x, G.y, G.w, G.h, t, '#0b1230', '#16224a');
    D.glow(cx, cy, 15 * sc, '#6d83c9', 0.28);
    // 나선팔
    for (let a = 0; a < 2; a++) { const pts = []; for (let th = 0.4; th < 5.6; th += 0.1) { const r = 1.2 + th * 2.4, ang = th + a * Math.PI; pts.push([cx + Math.cos(ang) * r * sc, cy + Math.sin(ang) * r * sc * 0.999]); } line(pts, 'rgba(165,180,252,.45)', Math.max(4, sc * 1.4)); }
    D.glow(cx, cy, 4 * sc, '#ffe9a8', 0.9);
    ctx.strokeStyle = 'rgba(203,213,225,.7)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, 15 * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // 태양 궤도
    ctx.strokeStyle = 'rgba(253,230,138,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, 8 * sc, 0, TAU); ctx.stroke();
    S.ang += dt * (RM ? 0 : 0.55); const sa = S.ang, sx = cx + Math.cos(sa) * 8 * sc, sy = cy - Math.sin(sa) * 8 * sc;
    D.glow(sx, sy, 16, '#ffd447', 0.7); D.sphere(sx, sy, 5.5, '#ffb703', { gloss: false });
    D.arrow(sx, sy, sx - Math.sin(sa) * 30, sy - Math.cos(sa) * 30, { color: '#fde047', width: 2.4, head: 9 });
    // 빛 한 줄기
    S.beam = (S.beam + dt * (RM ? 0 : 0.16)) % 1.3; const bt = Math.min(1, S.beam), bx = cx - 15 * sc + 30 * sc * bt;
    D.arrow(cx - 15 * sc, cy + 15 * sc * 0.0 - 0 + 1, cx + 15 * sc, cy + 1, { color: 'rgba(125,211,252,.55)', width: 2, head: 10, dash: [4, 6] });
    D.glow(bx, cy + 1, 12, '#7dd3fc', 0.9); ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(bx, cy + 1, 3.6, 0, TAU); ctx.fill();
    ctx.restore();
    outlineT(cx, cy + 15 * sc + 22, '← 지름 30 kpc →', PHONE ? 12 : 13, '#e2e8f0', 'center');
    outlineT(cx + 6, cy - 8, '은하 중심', PHONE ? 11 : 12, '#fde68a', 'left');
    outlineT(cx + 8 * sc * 0.5, cy + 8 * sc + 16, '태양: 중심에서 8 kpc', PHONE ? 10.5 : 11.5, '#fde68a', 'center');
    // 계산 카드
    panel(F.x, F.y, F.w, F.h, { r: 14 });
    T(F.x + 14, F.y + 24 * FS, '🧮 은하의 크기와 시간', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    let yy = F.y + 52 * FS; const fs_ = PHONE ? 12.5 : 13, show = FREE() || lightOK();
    T(F.x + 14, yy, '지름 30 kpc = ' + comma(LT30) + ' 광년', fs_, '#475569', 'left', 800); yy += 28 * FS;
    T(F.x + 14, yy, '빛이 가로지르는 시간', fs_, '#475569', 'left', 800); yy += 24 * FS;
    T(F.x + F.w - 14, yy, show ? '약 ' + f1(LT30 / 1e4) + '만 년' : '직접 계산', 16, show ? '#15803d' : '#94a3b8', 'right', 800); yy += 34 * FS;
    T(F.x + 14, yy, '태양의 공전 (v = 230 km/s, R = 8.0 kpc)', fs_ - 0.5, '#475569', 'left', 800); yy += 24 * FS;
    T(F.x + 14, yy, 'P = 2πR / v', fs_, '#475569', 'left', 800); T(F.x + F.w - 14, yy, '약 ' + sci(GYR, 1) + ' 년', 16, '#1e293b', 'right', 800); yy += 30 * FS;
    drawWrap(F.x + 14, yy, '빛이 은하를 한 번 가로지르는 동안 태양은 한 바퀴의 약 ' + f2(LT30 / GYR * 100) + ' %밖에 돌지 못해요.', F.w - 28, PHONE ? 12 : 12.5, { color: '#64748b' });
    infoBox(L.info, '💡 우리은하는 지름 약 30 kpc, 태양은 중심에서 약 8 kpc', '구상 성단 분포의 지름이 약 30 kpc예요. 1 kpc ≈ 3262광년이므로 지름은 약 9.8만 광년이고, 빛이 가로지르는 데 약 10만 년이 걸려요. 태양은 중심과 가장자리의 중간쯤에서 약 2.1×10⁸년에 한 바퀴를 돌아요.', '초록 점선은 은하 원반의 크기, 노란 고리는 태양의 궤도예요(그림은 모형).');
  }
  const lightOK = () => { const x = numOf('inLt'); return x != null && x >= 9 && x <= 10.8; };

  /* ================= ⑥ 거리 사다리 ================= */
  const ladOK = () => S.ladOrder.length === 5 && S.ladOrder.every((v, i) => v === i);
  const ladRows = (L) => { const rh = (L.h - 50) / 5; return [0, 1, 2, 3, 4].map((k) => ({ x: L.x + 12 + k * (PHONE ? 8 : 16), y: L.y + L.h - 8 - (k + 1) * rh + 4, w: L.w - 24 - k * (PHONE ? 8 : 16), h: rh - 8 })); };
  function drawLadder(dt, t) {
    const L = LYlad(), P = L.L, rows = ladRows(P), okL = ladOK() || FREE();
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '🪜 가까운 곳부터 아래에서 위로: 어떤 방법이 어디까지 잴까?', PHONE ? 12 : 14, '#1e293b', 'left', 800);
    S.ladBar = approach(S.ladBar, okL ? 1 : 0, dt, 2.5);
    HIT.ladSlots = [];
    rows.forEach((r, k) => {
      const ci = S.ladOrder[k], c = ci != null ? LAD[ci] : null;
      ctx.fillStyle = c ? '#e0f2fe' : '#f8fafc'; rr(r.x, r.y, r.w, r.h, 10).fill(); ctx.strokeStyle = c ? '#0284c7' : '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash(c ? [] : [5, 4]); rr(r.x, r.y, r.w, r.h, 10).stroke(); ctx.setLineDash([]);
      const nw = PHONE ? 176 : 250;
      T(r.x + 12, r.y + r.h / 2 + 5, c ? c.n : (k + 1) + '번째 단계', PHONE ? 12 : 13.5, c ? '#0f172a' : '#94a3b8', 'left', 800);
      if (c && okL) {
        const bx = r.x + nw + 8, bw = r.w - nw - 20, lg = (log10(c.kpc) + 3) / 10, w = bw * lg * S.ladBar;
        ctx.fillStyle = rgba('#0ea5e9', 0.75); rr(bx, r.y + r.h / 2 - 8, Math.max(0, w), 16, 8).fill();
        if (S.ladBar > 0.9) T(bx + Math.max(0, w) - 4, r.y + r.h / 2 - 12, c.reach, PHONE ? 10.5 : 11.5, '#0369a1', 'right', 800);
      }
      HIT.ladSlots.push({ r, k });
    });
    if (okL) T(P.x + P.w - 14, P.y + 24 * FS, '막대 길이: 잴 수 있는 거리 (로그 눈금)', PHONE ? 10 : 11.5, '#64748b', 'right', 700);
    // 카드
    const C = L.C; panel(C.x, C.y, C.w, C.h, { r: 14 });
    T(C.x + 14, C.y + 22 * FS, '방법 카드 (눌러서 쌓아요, 다시 누르면 빼요)', PHONE ? 12 : 13, '#1e293b', 'left', 800);
    HIT.ladCards = [];
    const cols = PHONE ? 2 : 5, cw = (C.w - 24 - (cols - 1) * 8) / cols, ch = PHONE ? 66 : 70;
    LSHUF.forEach((ci, k) => {
      const x = C.x + 12 + (k % cols) * (cw + 8), y = C.y + 36 * FS + Math.floor(k / cols) * (ch + 8), used = S.ladOrder.indexOf(ci);
      ctx.fillStyle = used >= 0 ? '#e2e8f0' : '#ffffff'; D.shadow(() => rr(x, y, cw, ch, 10).fill(), { blur: used >= 0 ? 2 : 5, y: used >= 0 ? 1 : 2 });
      ctx.strokeStyle = used >= 0 ? '#94a3b8' : '#0ea5e9'; ctx.lineWidth = 2; rr(x, y, cw, ch, 10).stroke();
      drawWrap(x + cw / 2, y + 24, LAD[ci].n, cw - 14, PHONE ? 12 : 12.5, { color: used >= 0 ? '#94a3b8' : '#0f172a', weight: 800, align: 'center' });
      if (used >= 0) T(x + cw - 12, y + 16, String(used + 1), 12, '#64748b', 'right', 800);
      HIT.ladCards.push({ r: { x, y, w: cw, h: ch }, ci });
    });
    infoBox(L.info, '💡 거리 규모에 따라 쓰는 방법이 달라요', '각 방법은 잴 수 있는 거리에 한계가 있어요. 시차로는 먼 별의 각이 너무 작고, 별의 밝기를 이용하는 방법은 별이 보이는 거리까지만 쓸 수 있어요. 그래서 가까운 방법으로 먼 방법을 보정하며 사다리처럼 이어 써요.', '카드 순서: 시차 → 주계열 맞추기 → 세페이드 → 초신성 → 적색 편이.');
  }
  function ladDown(p) {
    for (const c of HIT.ladCards) if (inR(p, c.r)) { const k = S.ladOrder.indexOf(c.ci); if (k >= 0) S.ladOrder.splice(k, 1); else S.ladOrder.push(c.ci); Sound.click(); return true; }
    for (const s of HIT.ladSlots) if (inR(p, s.r)) { if (s.k < S.ladOrder.length) { S.ladOrder.splice(s.k, 1); Sound.click(); } return true; }
    return false;
  }

  /* ================= 입력 · 컨트롤 ================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    if (PHONE) view.canvas.style.touchAction = (v === 'curve' || v === 'smc' || v === 'map') ? 'none' : 'pan-y';
    updateCtl();
  }
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcM').hidden = !(S.view === 'calc' && (S.flags.calcM || free));
    $('#calcDk').hidden = !(S.view === 'calc' && (S.flags.calcD || free));
    $('#calcG').hidden = !(S.view === 'map' && (S.flags.calcG || free) && S.sel >= 0 && !S.done[S.sel] && !S.fly[S.sel]);
    $('#teamBox').hidden = !(S.view === 'map' && (S.flags.calcG || free));
    $('#calcL').hidden = !(S.view === 'scale' && (S.flags.calcL || free));
    $('#bTeam').disabled = !(S.manual.length >= 3 || free);
    $('#bMean').disabled = !(mapCount() === 24);
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#grpMap .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.mapMode));
    if (S.sel >= 0) $('#gWho').textContent = '성단 ' + (S.sel + 1) + '의 거리 d (kpc)';
  }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  sl('#sLP', '#oLP', (v) => f1(Math.pow(10, v)) + ' 일', (v) => { S.lp = v; });
  sl('#sMm', '#oMm', (v) => f1(v), (v) => { S.m = v; });
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpMap .opt').forEach((b) => clickable(b, () => { S.mapMode = +b.dataset.k; updateCtl(); }));
  clickable($('#bTeam'), () => { if (S.manual.length >= 3 || FREE()) { fillTeam(); updateCtl(); } });
  clickable($('#bMean'), () => {
    if (mapCount() < 24) return;
    S.mk.set = true; S.mapMode = 0; updateCtl();
    SciSim.tween(S.mk, { x: MEAN.x, y: MEAN.y }, { duration: 1.1, ease: 'inOutCubic' });
  });
  $('#inM').addEventListener('input', () => { if (mOkNow()) fbIn('inM', true); });
  $('#inDk').addEventListener('input', () => { if (dOkNow()) fbIn('inDk', true); });
  $('#inDk2').addEventListener('input', () => {
    const i = S.sel; if (i < 0 || S.fly[i]) return;
    if (nearRel(numOf('inDk2'), GC[i].d, 0.04)) { if (S.manual.indexOf(i) < 0) S.manual.push(i); fbIn('inDk2', true); flyIn(i, 0); say('성단 ' + (i + 1) + ': d = ' + dTxt(GC[i].d) + '. 지도에 찍혀요!', false, 2.2); updateCtl(); }
  });
  $('#inLt').addEventListener('input', () => { if (lightOK()) fbIn('inLt', true); });

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'curve': return curveDown(p);
        case 'smc': return smcDown(p);
        case 'map': return mapDown(p);
        case 'ladder': return ladDown(p);
        default: return false;
      }
    },
    move(p) { if (S.view === 'curve') curveMove(p); else if (S.view === 'smc') smcMove(p); else if (S.view === 'map') mapMove(p); },
    up() { S.lcDrag = null; S.hDrag = null; S.mk.drag = false; },
    hover(p) {
      if (S.view === 'curve') return HIT.lc && inR(p, HIT.lc.ax.b) ? 'ew-resize' : '';
      if (S.view === 'smc') return HIT.handles.some((h) => Math.hypot(p.x - h.x, p.y - h.y) <= 20) ? 'ns-resize' : (HIT.smcBox && inR(p, HIT.smcBox) ? 'crosshair' : '');
      if (S.view === 'map') return HIT.chips.some((c) => inR(p, c.r)) ? 'pointer' : '';
      if (S.view === 'ladder') return HIT.ladCards.some((c) => inR(p, c.r)) || HIT.ladSlots.some((s) => inR(p, s.r)) ? 'pointer' : '';
      return '';
    },
  });

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '주기-광도 관계: 리비트의 발견', short: '주기-광도', icon: '💓', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 태양은 은하의 중심에 있을까? 맥동하는 별로 우리은하의 크기를 잴 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시와 지구과학에서</b> 거리 지수 m − M = 5 log d − 5와 별의 밝기를 배웠어요. 이번에는 <b>밝기가 규칙적으로 변하는 세페이드 변광성</b>의 <b>주기 P</b>를 재어 별의 실제 밝기(절대 등급)를 알아내요.</div>' +
        '<p>먼저 δ 세페우스자리의 광도 곡선에서 주기를 읽고, 리비트처럼 소마젤란 은하의 세페이드 5개를 (log P, m) 그래프에 찍어 보세요. (성간 소광은 아직 무시해요.)</p>',
      features: ['curve', 'smc'],
      setup() { setView('curve'); },
      recap: '세페이드는 주기가 길수록 실제로 더 밝아요. 같은 거리의 별들은 m 차이가 곧 M 차이이므로 직선 관계가 보여요.',
      summary: '<ul><li><b>세페이드 변광성</b>은 부풀었다 줄어들며 밝기가 규칙적으로 변하는 <b>맥동 변광성</b>이에요. δ 세페우스자리의 주기는 약 5.4일이에요.</li><li>리비트는 <b>소마젤란 은하</b>의 세페이드가 모두 거의 같은 거리에 있어 <b>m 대 log P가 직선</b>임을 발견했어요: 주기가 길수록 실제로 밝아요.</li><li>이 차시의 단순 모형: <b>M_V = −2.8 log P − 1.4</b> (P: 일). 실제로는 세페이드의 종류에 따라 조금씩 달라요.</li></ul>',
      missions: [
        {
          title: '광도 곡선에서 주기 읽기',
          goal: '파란 막대 두 개를 끌어 <b>이웃한 두 최대 밝기</b>에 맞추고, 주기 P(일)를 읽으세요.',
          hint: '밝기가 가장 클 때(그래프의 가장 높은 봉우리)가 최대예요. 이웃한 봉우리 사이의 시간이 약 5.4일이에요.',
          setup() { S.t1 = 2.0; S.t2 = 9.0; setView('curve'); },
          check: () => lcOK(), hold: 0.8,
          status: () => mark(lcNearPeak(S.t1) && lcNearPeak(S.t2)) + ' 두 봉우리에 맞추기 &nbsp; ' + mark(lcOK()) + ' P = ' + f1(Math.abs(S.t2 - S.t1)) + ' 일',
          explain: '이웃한 봉우리 사이의 시간이 <b>P ≈ 5.4일</b>이에요. 주기는 별마다 일정해서 시간이 지나도 같은 값이에요.',
        },
        {
          title: '소마젤란 은하의 세페이드 그래프',
          goal: '왼쪽 목록의 (P, m) 5개를 그래프에 찍고, 점들을 지나는 <b>직선</b>을 맞추세요.',
          hint: '가로 눈금은 log P예요: P = 10일이면 log P = 1, P = 100일이면 2예요. 직선 양 끝의 동그라미를 위아래로 끌어요.',
          setup() { setView('smc'); },
          check: () => smcFitOK(), hold: 0.8,
          status: () => mark(smcPlaced() === 5) + ' 점 ' + smcPlaced() + ' / 5개 &nbsp; ' + mark(smcFitOK()) + ' 직선 맞추기',
          explain: '점이 <b>오른쪽 아래에서 왼쪽 위로 직선</b>으로 늘어서요: log P가 클수록(주기가 길수록) m이 작아(밝아)요. 같은 거리의 별들이니 <b>실제로도 더 밝다</b>는 뜻이에요: 기울기 약 −2.8.',
        },
        {
          type: 'quiz', title: '주기가 긴 세페이드가 더 밝은 까닭',
          goal: '주기가 긴 세페이드가 <b>실제로 더 밝다</b>고 말할 수 있는 근거는?',
          setup() { setView('smc'); },
          choices: ['같은 거리(소마젤란 은하)에 있는 세페이드들에서 주기가 길수록 m이 작았기 때문이에요', '어느 세페이드든 밝게 보이면 주기가 길기 때문이에요', '주기가 긴 세페이드는 항상 더 가까이 있기 때문이에요', '주기가 길수록 별이 더 작아서 밝기 때문이에요'],
          answer: 0,
          feedback: ['', '거리가 다르면 성립하지 않아요. 가까운 어두운 별도 밝게 보일 수 있어요. 같은 거리의 별끼리 비교해야 해요.', '거리와 주기는 관계가 없어요. 소마젤란 은하의 별은 모두 같은 거리인데도 주기에 따라 밝기가 달랐어요.', '별의 크기가 아니라 같은 거리에서 잰 밝기 차이가 근거예요.'],
          explain: '모두 같은 거리이므로 m의 차이는 <b>M의 차이</b>예요. 그래서 "주기가 길수록 실제로 더 밝다"는 <b>주기-광도 관계</b>를 얻어요.',
        },
      ],
    },
    {
      title: '거리 계산: 주기에서 거리까지', short: '거리 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세페이드의 주기와 절대 등급 사이의 관계 <b>M_V = −2.8 log P − 1.4</b>를 얻었어요. 이제 주기를 재면 <b>멀리 있는 세페이드의 거리</b>를 구할 수 있어요.</div>' +
        '<p>네 걸음이에요: ① 주기 P → ② 절대 등급 M → ③ 거리 지수 m − M → ④ 거리 d. 마지막 식은 m − M = 5 log d − 5, 즉 d = 10^((m − M + 5)/5) pc예요.</p>',
      features: ['calc'],
      setup() { setSlider($('#sLP'), $('#oLP'), 1, (v) => f1(Math.pow(10, v)) + ' 일'); S.lp = 1; setView('calc'); },
      recap: '주기 → 절대 등급 → 거리 지수 → 거리. 주기 10일, m = 10.3인 세페이드는 약 7.9 kpc 떨어져 있어요.',
      summary: '<ul><li>계산 순서: <b>P → M_V = −2.8 log P − 1.4 → m − M → d = 10^((m − M + 5)/5) pc</b>.</li><li>예) P = 10일 → M = −4.2. m = 10.3이면 m − M = 14.5 → d = 10^3.9 ≈ <b>7.9 kpc</b>.</li><li>주기가 20일이면 10일보다 M이 약 0.8등급 작은(더 밝은) 별이에요. 세페이드는 매우 밝아서(M = −2~−6) 먼 곳에서도 보여요.</li></ul>',
      missions: [
        {
          title: '절대 등급 구하기',
          goal: '주기 <b>P = 10일</b>인 세페이드의 절대 등급 <b>M_V</b>를 계산해 입력하세요.',
          hint: 'log 10 = 1이므로 M = −2.8 × 1 − 1.4 = −4.2예요.',
          setup() { S.flags.calcM = true; S.lp = 1; S.m = 10.3; setSlider($('#sLP'), $('#oLP'), 1, (v) => f1(Math.pow(10, v)) + ' 일'); setSlider($('#sMm'), $('#oMm'), 10.3, (v) => f1(v)); clrIn('inM', 'inDk'); setView('calc'); },
          check: () => Math.abs(S.lp - 1) <= 0.011 && mOkNow(), hold: 0.6,
          status: () => mark(Math.abs(S.lp - 1) <= 0.011) + ' P = ' + f1(Pcur()) + '일 &nbsp; ' + mark(mOkNow()) + ' M_V = ' + ($('#inM').value.trim() || '—'),
          explain: 'M_V = −2.8 × log 10 − 1.4 = <b>−4.2</b>등급이에요. 태양(M = 4.8)보다 약 9등급 밝아서 태양의 약 4000배예요.',
        },
        {
          title: '세페이드까지의 거리 구하기',
          goal: '겉보기 등급이 <b>m = 10.3</b>이면 거리 <b>d</b>는 몇 kpc인지 계산해 입력하세요.',
          hint: 'm − M = 10.3 − (−4.2) = 14.5이고, d = 10^((14.5 + 5)/5) = 10^3.9 ≈ 7900 pc = 7.9 kpc예요.',
          setup() { S.flags.calcM = true; S.flags.calcD = true; S.lp = 1; S.m = 10.3; setSlider($('#sLP'), $('#oLP'), 1, (v) => f1(Math.pow(10, v)) + ' 일'); setSlider($('#sMm'), $('#oMm'), 10.3, (v) => f1(v)); clrIn('inDk'); setView('calc'); },
          check: () => Math.abs(S.lp - 1) <= 0.011 && Math.abs(S.m - 10.3) <= 0.06 && mOkNow() && dOkNow(), hold: 0.6,
          status: () => mark(Math.abs(S.m - 10.3) <= 0.06) + ' m = ' + f1(S.m) + ' &nbsp; ' + mark(dOkNow()) + ' d = ' + ($('#inDk').value.trim() || '—') + ' kpc',
          explain: 'm − M = 14.5 → 5 log d − 5 = 14.5 → log d = 3.9 → <b>d ≈ 7.9 kpc</b>(약 2.6만 광년)예요.',
        },
        {
          type: 'quiz', title: '주기 20일과 10일의 밝기 차이',
          goal: '주기가 <b>20일</b>인 세페이드는 10일인 세페이드보다 절대 등급이 얼마나 다를까요?',
          setup() { setView('calc'); },
          choices: ['약 0.8등급 더 밝아요 (M이 약 0.8 작아요)', '약 0.8등급 더 어두워요 (M이 약 0.8 커요)', '약 2배(약 0.75등급) 어두워요', '밝기가 같아요'],
          answer: 0,
          feedback: ['', '주기가 길수록 더 밝아요. 그래서 M이 더 작아요(등급이 작을수록 밝아요).', '주기가 길수록 밝아요. 방향을 다시 생각해 보세요.', '주기-광도 관계에서 주기가 다르면 절대 등급도 달라요.'],
          explain: 'M(20일) = −2.8 × 1.301 − 1.4 = −5.0, M(10일) = −4.2이므로 차이는 0.84 ≈ <b>0.8등급</b>이에요(2.8 × log 2 = 0.84). 주기가 2배면 약 2.1배 밝아요.',
        },
      ],
    },
    {
      title: '성단 지도: 은하의 중심 찾기', short: '성단 지도', icon: '🗺', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세페이드의 주기와 겉보기 등급으로 거리를 구했어요. 샤플리는 <b>구상 성단</b>의 세페이드형 변광성으로 성단 24개까지의 거리를 재서 지도를 그렸어요.</div>' +
        '<p>성단마다 방향(ℓ: 궁수자리 방향이 0°, b: 은하면에서 위·아래)과 P, m이 주어져요. 거리 d를 계산해 위에서 본 지도에 찍고, 점들이 모인 공의 <b>중심</b>을 찾아보세요. (성간 소광은 무시해요.)</p>',
      features: ['map'],
      setup() { S.mapMode = 0; setView('map'); },
      recap: '구상 성단은 태양이 아니라 궁수자리 쪽 약 8 kpc 거리의 한 점을 중심으로 퍼져 있어요. 그 점이 은하 중심이에요.',
      summary: () => '<ul><li>구상 성단의 거리 d를 방향 (ℓ, b)와 함께 쓰면 위치 x = d cos b cos ℓ, y = d cos b sin ℓ, z = d sin b로 지도에 찍을 수 있어요.</li><li>구상 성단 24개는 <b>태양이 아니라 궁수자리 쪽 한 점</b>(평균 위치: 태양에서 약 ' + f1(MEAN.r) + ' kpc, ℓ ≈ ' + f0(MEAN.l > 180 ? MEAN.l - 360 : MEAN.l) + '°)을 중심으로 공 모양으로 퍼져 있어요. 분포의 지름은 약 30 kpc예요.</li><li>이 중심이 우리은하의 중심이므로 <b>태양은 은하 중심이 아니에요</b>. 중심에서 약 8 kpc 떨어져 있어요(샤플리의 결론).</li></ul>',
      missions: [
        {
          title: '구상 성단 3개의 거리 직접 계산',
          goal: '번호를 눌러 구상 성단을 고르고, P와 m으로 거리 d(kpc)를 계산해 입력해요. <b>3개</b>를 직접 계산하세요.',
          hint: 'M = −2.8 log P − 1.4 → m − M → d = 10^((m − M + 5)/5) pc. 예) 1번: M = −4.2 정도, m − M ≈ 13.5 → 약 5 kpc예요.',
          setup() { S.flags.calcG = true; setView('map'); },
          check: () => S.manual.length >= 3, hold: 0.5,
          status: () => mark(S.manual.length >= 3) + ' 직접 계산한 성단 ' + S.manual.length + ' / 3개',
          explain: '세 성단 모두 같은 과정을 거쳐요: P → M → m − M → d. 거리는 대체로 5~22 kpc이고, 계산한 점이 지도에 찍혀요.',
        },
        {
          title: '성단 분포의 중심 찾기',
          goal: '나머지 성단을 모둠 표로 불러온 뒤, 점들이 이루는 공의 <b>중심</b>에 십자가를 끌어 놓으세요.',
          hint: '[📐 평균 위치 계산]을 누르면 십자가가 점들의 평균 위치로 움직여요. 중심은 태양에서 약 8 kpc, ℓ ≈ 0°(궁수자리) 쪽이에요.',
          setup() { S.flags.calcG = true; S.mapMode = 0; setView('map'); },
          check: () => mapOK(), hold: 0.8,
          status: () => mark(mapCount() === 24) + ' 성단 ' + mapCount() + ' / 24 &nbsp; ' + mark(mapOK()) + ' 중심 표시' + (S.mk.set ? ' (오차 ' + f1(mkDist()) + ' kpc)' : ''),
          explain: '점들의 평균 위치는 태양에서 약 <b>' + '8.5 kpc</b>(약 8 kpc), 방향 ℓ ≈ 0°예요. 24개의 성단이 이 점 둘레에 공 모양으로 퍼져 있어요(중심에서 최대 약 15 kpc).',
        },
        {
          type: 'quiz', title: '성단 분포의 중심이 뜻하는 것',
          goal: '구상 성단들이 태양 둘레가 아니라 <b>궁수자리 쪽 한 점</b>을 중심으로 분포한다는 것은 무엇을 뜻할까요?',
          setup() { setView('map'); },
          choices: ['태양은 우리은하의 중심에 있지 않고, 중심은 궁수자리 방향 약 8 kpc 거리에 있어요', '태양이 은하의 중심에 있어요', '구상 성단은 궁수자리에만 생겨요', '궁수자리 쪽 성단은 거리를 잘못 쟀어요'],
          answer: 0,
          feedback: ['', '태양이 중심이라면 성단이 태양 둘레에 고르게 퍼져 보였을 거예요.', '구상 성단은 은하의 헤일로 전체에 있는데, 우리가 사는 곳이 중심에서 벗어나 있어서 한쪽에 몰려 보이는 거예요.', '24개 성단의 위치가 한 점 둘레로 일관되게 모이므로 오류가 아니에요.'],
          explain: '공 모양 분포의 중심은 <b>은하의 중심</b>이에요. 중심이 궁수자리 방향 약 8 kpc 거리라면 태양은 중심이 아니에요. 샤플리는 이렇게 태양의 위치가 중심에서 벗어났음을 밝혔어요.',
        },
      ],
    },
    {
      title: '은하 규모: 크기·시간·거리 사다리', short: '은하 규모', icon: '🌌', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 성단 지도로 은하 중심의 위치와 분포의 지름(약 30 kpc)을 알았어요. 이제 그 크기를 시간으로 바꿔 느껴 보고, 거리를 재는 방법들을 <b>거리 사다리</b>로 정리해요.</div>' +
        '<p>1 kpc는 약 3262광년이에요. 지름 30 kpc를 빛이 가로지르는 데 걸리는 시간을 계산하고, 시차에서 적색 편이까지 거리 재기 방법의 순서를 맞춰 보세요.</p>',
      features: ['scale'],
      setup() { setView('scale'); },
      recap: '우리은하의 지름은 약 30 kpc(약 10만 광년)이고 태양은 중심에서 약 8 kpc에 있어요. 거리 사다리는 가까운 방법으로 먼 방법을 보정해 이어져요.',
      summary: '<ul><li>우리은하의 지름 약 <b>30 kpc ≈ 9.8만 광년</b>: 빛이 가로지르는 데 약 <b>10만 년</b>. 태양은 중심에서 약 <b>8 kpc</b>, 속력 230 km/s로 약 <b>2.1×10⁸ 년</b>에 한 바퀴를 돌아요.</li><li><b>거리 사다리</b>: 연주 시차(수 kpc) → 주계열 맞추기(수십 kpc) → 세페이드(수십 Mpc) → 초신성(수 Gpc) → 적색 편이와 허블-르메트르 법칙(수천 Mpc 이상).</li><li>거리 규모에 따라 방법이 달라요: 각 방법은 잴 수 있는 거리에 한계가 있고, 아래 단계의 방법으로 보정돼요.</li></ul>',
      missions: [
        {
          title: '빛이 은하를 가로지르는 시간',
          goal: '지름 <b>30 kpc</b>를 빛이 가로지르는 데 걸리는 시간을 <b>만 년</b> 단위로 계산해 입력하세요.',
          hint: '1 kpc ≈ 3262광년이므로 30 kpc ≈ 97,860광년이에요. 빛은 1년에 1광년을 가니까 약 9.8만 년이에요.',
          setup() { S.flags.calcL = true; clrIn('inLt'); setView('scale'); },
          check: () => lightOK(), hold: 0.6,
          status: () => mark(lightOK()) + ' 가로지르는 시간 = ' + ($('#inLt').value.trim() || '—') + ' 만 년',
          explain: '30 kpc ≈ 9.8×10⁴ 광년이라 빛이 가로지르는 데 <b>약 10만 년</b>이 걸려요. 인류 역사(약 1만 년)의 10배예요. 태양이 은하를 한 바퀴 도는 시간(2.1×10⁸ 년)의 약 0.05 %예요.',
        },
        {
          title: '거리 사다리 순서 맞추기', manual: true,
          goal: '잴 수 있는 거리가 <b>가까운 방법부터</b> 카드를 아래에서 위로 쌓으세요.',
          hint: '시차 → 주계열 맞추기 → 세페이드 → 초신성 → 적색 편이 순서예요.',
          setup() { S.ladOrder = []; setView('ladder'); },
          check: () => { if (S.ladOrder.length < 5) return '다섯 장을 모두 쌓아 주세요.'; if (ladOK()) return true; return '잴 수 있는 거리가 더 짧은 방법이 아래에 와요. 순서를 다시 살펴보세요.'; },
          explain: '시차(수 kpc) → 주계열 맞추기(수십 kpc) → 세페이드(수십 Mpc) → 초신성(수 Gpc) → 적색 편이(수천 Mpc 이상)예요. 방법마다 <b>유효한 거리 범위가 다르고</b>, 가까운 방법으로 먼 방법을 보정해서 사다리처럼 이어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-cepheid-galaxy', mount: '#game', badge: '은하 측량사', homeHref: '../../index.html#hu',
    featureLabels: { curve: '💓 광도 곡선 · 주기 막대', smc: '📈 SMC 점 찍기 · 직선 맞추기', calc: '🧮 네 걸음 계산기', map: '🗺 성단 지도 · 평균 위치', scale: '🌌 은하 규모 · 빛의 시간', ladder: '🪜 거리 사다리 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });
  levels.forEach((lv) => { if (typeof lv.summary === 'function') lv.summary = lv.summary(); });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view;
    if (v === 'curve') setReadouts(['고른 두 막대 사이', f1(Math.abs(S.t2 - S.t1)) + ' 일', '실제 주기(δ Cep)', f1(DCEP.P) + ' 일', '이웃한 봉우리에 맞춤', lcOK() ? '맞았어요' : '아직']);
    else if (v === 'smc') setReadouts(['찍은 점', smcPlaced() + ' / 5', '직선의 기울기', f1((S.y2 - S.y1) / 2) + ' 등급/dex', 'SMC 거리 지수', smcFitOK() || FREE() ? f1(SMC_MU) : '?']);
    else if (v === 'calc') setReadouts(['주기 P', f1(Pcur()) + ' 일', '겉보기 등급 m', f1(S.m), '거리 d', dOkNow() || FREE() ? f1(dCur()) + ' kpc' : '직접 계산']);
    else if (v === 'map') setReadouts(['계산한 성단', mapCount() + ' / 24', '직접 계산', S.manual.length + ' / 3', '십자가 위치', S.mk.set ? f1(Math.hypot(S.mk.x, S.mk.y)) + ' kpc' : '—']);
    else if (v === 'scale') setReadouts(['은하 지름', '약 30 kpc', '태양의 위치', '중심에서 약 8 kpc', '태양의 공전 주기', '약 ' + sci(GYR, 1) + ' 년']);
    else setReadouts(['쌓은 카드', S.ladOrder.length + ' / 5', '맨 아래 단계', S.ladOrder.length ? LAD[S.ladOrder[0]].n : '—', '맨 위 단계', S.ladOrder.length === 5 ? LAD[S.ladOrder[4]].n : '—']);
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'curve': drawCurve(dt, t); break;
      case 'smc': drawSmc(dt, t); break;
      case 'calc': drawCalc(dt, t); break;
      case 'map': drawMap(dt, t); updateCtlSoft(); break;
      case 'scale': drawScale(dt, t); break;
      default: drawLadder(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });
  let lastMapSig = '';
  function updateCtlSoft() { const sig = S.sel + '|' + S.done.filter(Boolean).length + '|' + S.manual.length + '|' + S.fly.filter(Boolean).length; if (sig !== lastMapSig) { lastMapSig = sig; updateCtl(); } }

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, GC, MEAN, RMAX, HIT, PLM, SMC, LAD, LSHUF, lcAx, LYcurve, LYsmc, LYmap, mapGeom, chipRect, smcAx, flyIn, fillTeam, lcOK, smcFitOK, mapOK };
})();
