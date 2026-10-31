/* =========================================================
   행성우주과학 Ⅲ. 은하와 우주 - 성단의 C-M도 (1차시)
   성취기준 [12행우03-01] 성단의 C-M도를 이용하여 성단의 나이와 거리를 비교하고, 맥동변광성의 주기-광도 관계를 이용하여 우리은하의 구조와 규모를 추론할 수 있다. (성단: C-M도·거리·나이)
   ① 관찰: C-M도 (산개/구상 성단 분류, 성단 A의 별을 재어 C-M도 그리기)
   ② 분석: 맞추기 (표준 주계열 판 밀기 → m − M = 5 log d − 5)
   ③ 분석: 성단 나이 (전향점 → M_V → L → 질량 → t = 10^10 × M^(-2.5))
   ④ 확인: 성단 비교 (네 성단의 전향점 높이순 나이, 거리·나이 표)
   다루지 않음: 금속 함량에 따른 주계열 이동, 이중성에 의한 퍼짐, 적색 거성 가지의 내부 구조, 성간 소광(다음다음 차시에서 보정).
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
  // 표준 주계열 (B − V | M_V)
  const MSB = [-0.30, -0.20, 0.00, 0.30, 0.65, 0.82, 1.15, 1.40, 1.60];
  const MSM = [-2.5, -1.1, 0.6, 2.8, 4.8, 5.9, 7.5, 8.9, 10.4];
  const msM = (bv) => interp(MSB, MSM, bv);
  const msBV = (M) => clamp(interp(MSM, MSB, M), -0.34, 1.7);
  // 성단 4개 (합성 C-M도: 실제 성단을 단순화)
  const CL = [
    { k: 'A', kind: '산개 성단', like: '플레이아데스형', mM: 5.7, toM: -2.2, age: 1.0e8, ageTxt: '약 1.0×10⁸ 년', n: 62, rg: 0, col: '#38bdf8', cnt: '별 수백 개', place: '은하 원반', dTxt: '138 pc' },
    { k: 'B', kind: '산개 성단', like: '히아데스형', mM: 3.4, toM: 0.6, age: 6e8, ageTxt: '약 6×10⁸ 년', n: 70, rg: 0, col: '#4ade80', cnt: '별 수백 개', place: '은하 원반', dTxt: '48 pc' },
    { k: 'C', kind: '산개 성단', like: 'M67형', mM: 9.7, toM: 3.4, age: 4e9, ageTxt: '약 4×10⁹ 년', n: 80, rg: 12, col: '#fb923c', cnt: '별 천 개 안팎', place: '은하 원반', dTxt: '871 pc' },
    { k: 'D', kind: '구상 성단', like: '구상 성단형', mM: 14.3, toM: 5.1, age: 1.2e10, ageTxt: '약 1.2×10¹⁰ 년', n: 112, rg: 18, col: '#f472b6', cnt: '별 수십만 개', place: '은하 헤일로', dTxt: '7.2 kpc' },
  ];
  const TOPT = { A: 0, B: 1, C: 2, D: 3 };
  const AXLO = (c) => c.mM - 4, AXHI = (c) => c.mM + 12;      // 겉보기 등급 축 범위 (위 = 밝음)
  const starRGB = [[-0.35, '#8fb0ff'], [-0.2, '#a8c0ff'], [0, '#cddbff'], [0.3, '#f4f4ff'], [0.6, '#fff1d6'], [0.8, '#ffdcaa'], [1.1, '#ffc080'], [1.4, '#ff9d5c'], [1.7, '#ff7d3e']];
  function bvCol(bv) {
    if (bv <= starRGB[0][0]) return starRGB[0][1];
    for (let i = 1; i < starRGB.length; i++) if (bv <= starRGB[i][0]) { const a = starRGB[i - 1], b = starRGB[i]; return mixc(a[1], b[1], (bv - a[0]) / (b[0] - a[0])); }
    return starRGB[starRGB.length - 1][1];
  }
  function genCluster(c, seed) {
    const r = rng(seed), st = [];
    c.d = Math.pow(10, (c.mM + 5) / 5); c.toBV = msBV(c.toM); c.toMv = c.toM + c.mM;
    c.toL = Math.pow(10, 0.4 * (4.83 - c.toM)); c.toMass = Math.pow(c.toL, 1 / 3.5); c.tCalc = 1e10 * Math.pow(c.toMass, -2.5);
    st.push({ M: c.toM, bv: c.toBV, m: c.toMv, to: true });
    const nms = c.n - c.rg - 1;
    for (let i = 0; i < nms; i++) {
      const x = Math.pow(r(), 0.6), M = c.toM + 0.15 + x * (8.6 - c.toM - 0.15);
      const bv = clamp(msBV(M) + gauss(r) * 0.02, -0.34, 1.7), m = Math.max(c.toMv + 0.05, M + c.mM + gauss(r) * 0.06);
      st.push({ M: m - c.mM, bv, m });
    }
    const rise = c.toM - (c.k === 'C' ? -1.2 : -2.4);
    for (let i = 0; i < c.rg; i++) {
      const s = (i + 0.5) / c.rg * 0.9 + 0.08 * r(), q = 1 - Math.pow(1 - s, 2.2);
      const bv = clamp(lerp(c.toBV + 0.05, 1.42, q) + gauss(r) * 0.025, -0.3, 1.7), M = c.toM - 0.3 - (rise - 0.3) * Math.pow(s, 1.6) + gauss(r) * 0.05;
      st.push({ M, bv, m: M + c.mM, rg: true });
    }
    // 사진 위치 (정규화 좌표, 최소 간격)
    st.forEach((s, i) => {
      for (let tries = 0; tries < 250; tries++) {
        const px = gauss(r) * 0.36, py = gauss(r) * 0.36;
        if (Math.hypot(px, py) > 0.94) continue;
        if (st.some((o, j) => j < i && o.px != null && Math.hypot(o.px - px, o.py - py) < 0.052)) continue;
        s.px = px; s.py = py; break;
      }
      if (s.px == null) { s.px = (r() - 0.5) * 1.6; s.py = (r() - 0.5) * 1.6; }
    });
    c.stars = st;
    c.msStars = st.filter((s) => !s.rg && !s.to && s.M > c.toM + 1);
  }
  CL.forEach((c, i) => genCluster(c, 777 + i * 131));
  const A = CL[0];

  // 사진 4장 (분류용). n: 그린 별 수 (산개) / 구상은 일부만 그림
  const PHOTOS = [
    { id: '①', type: 1, cnt: '별 수십만 개', note: '일부만 그렸어요', seed: 11 },
    { id: '②', type: 0, cnt: '별 80개', note: '', seed: 22, n: 80 },
    { id: '③', type: 0, cnt: '별 120개', note: '', seed: 33, n: 120 },
    { id: '④', type: 1, cnt: '별 수만 개', note: '일부만 그렸어요', seed: 44 },
  ];
  function makeField(p) {
    const cv = document.createElement('canvas'); const Z = 360; cv.width = cv.height = Z;
    const g = cv.getContext('2d'), r = rng(p.seed * 7919), c = Z / 2;
    const bg = g.createRadialGradient(c, c, 10, c, c, c); bg.addColorStop(0, '#12183a'); bg.addColorStop(1, '#05081c'); g.fillStyle = bg; g.fillRect(0, 0, Z, Z);
    const dot = (x, y, rad, col, a) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); g.globalAlpha = 1; };
    for (let i = 0; i < 40; i++) dot(r() * Z, r() * Z, 0.5 + r() * 0.5, '#cbd5e1', 0.35);   // 배경 별
    if (p.type === 0) {
      const placed = [];
      for (let i = 0; i < p.n; i++) {
        let x = 0, y = 0;
        for (let t = 0; t < 40; t++) { x = gauss(r) * 0.4; y = gauss(r) * 0.4; if (Math.hypot(x, y) < 0.95 && placed.every((q) => Math.hypot(q[0] - x, q[1] - y) > 0.045)) break; }
        placed.push([x, y]);
        const bright = Math.pow(r(), 2.2), bv = r() < 0.12 ? 0.9 + r() * 0.4 : -0.25 + r() * 0.8;
        const rad = 1.1 + bright * 3.4, col = bvCol(bv);
        g.save(); g.shadowColor = col; g.shadowBlur = 4 + bright * 8; dot(c + x * c * 0.95, c + y * c * 0.95, rad, col, 0.95); g.restore();
      }
    } else {
      const core = g.createRadialGradient(c, c, 2, c, c, c * 0.55); core.addColorStop(0, 'rgba(255,225,170,.85)'); core.addColorStop(0.35, 'rgba(255,200,140,.35)'); core.addColorStop(1, 'rgba(255,200,140,0)');
      g.fillStyle = core; g.fillRect(0, 0, Z, Z);
      const n = p.id === '①' ? 2600 : 1500;
      for (let i = 0; i < n; i++) {
        let rad = 0.2 / Math.sqrt(Math.pow(Math.max(r(), 0.002), -2 / 3) - 1); if (rad > 0.98) { i--; continue; }
        const a = r() * TAU, bv = 0.65 + r() * 0.5;
        const big = r() < 0.012, col = big ? '#ff9d5c' : bvCol(bv);
        dot(c + Math.cos(a) * rad * c * 0.97, c + Math.sin(a) * rad * c * 0.97, big ? 2.1 : 0.7 + r() * 0.7, col, big ? 0.95 : 0.8);
      }
    }
    return cv;
  }
  PHOTOS.forEach((p) => { p.cv = makeField(p); });

  // 나이 변화 모형용 별 (살리 IMF)
  const AGEST = (function () {
    const r = rng(4242), a = 0.55, b = 7.0, e = -1.35, out = [];
    for (let i = 0; i < 110; i++) {
      const M = Math.pow(Math.pow(a, e) + r() * (Math.pow(b, e) - Math.pow(a, e)), 1 / e);
      const Mv = 4.83 - 8.75 * log10(M);
      out.push({ M, Mv, bv: msBV(Mv) + gauss(r) * 0.015, tms: 1e10 * Math.pow(M, -2.5), j: r() });
    }
    return out;
  })();
  const toMvAt = (t) => 4.83 + 3.5 * log10(t / 1e10);        // 나이 t(년)에서 전향점의 M_V
  const toMassAt = (t) => Math.pow(t / 1e10, -0.4);
  const massRound = (t) => Math.pow(Math.pow(10, 0.4 * (4.83 - Math.round(toMvAt(t) * 10) / 10)), 1 / 3.5);   // 화면에 보이는 M_V(소수 첫째 자리)로 계산한 질량
  const ageTxt = (t) => sci(t, t < 1e9 ? 1 : 1) + ' 년';

  /* ================= 상태 ================= */
  const S = {
    view: 'photo', fade: 0, clus: 0,
    photo: [null, null, null, null], phWrong: [0, 0, 0, 0],
    meas: A.stars.map(() => null), measQ: [],          // 측정한 별: {t, delay}
    off: 2.0, offDrag: null, glow: 0,
    toDone: [false, false, false, false], reveal: [0, 0, 0, 0], miss: null,
    ageLog: 8.0, ageTgt: 8.0,
    order: [], rowSel: -1, dOk: [false, false, false, false],
    flags: { calcD: false, pickClus: false, calcAge: false, calcCmp: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { photo: '📸 성단 사진 분류', cmd: '🌟 성단 A의 C-M도', fit: '📏 표준 주계열 맞추기', age: '⏳ 전향점으로 나이 구하기', aging: '🕰 성단이 나이를 먹으면', compare: '📋 네 성단 비교' };
  const modeBtns = $$('#modeSeg button');
  const curC = () => CL[S.clus];

  /* ================= 레이아웃 ================= */
  function LYphoto() { return PHONE ? { x: 8, y: 36, w: 464, cw: 464, ch: 196, gap: 8, cols: 1 } : { x: 10, y: 38, w: 780, cw: 385, ch: 270, gap: 10, cols: 2 }; }
  function LYcmd() { return PHONE ? { photo: { x: 8, y: 8, w: 464, h: 290 }, P: { x: 8, y: 306, w: 464, h: 470 }, info: { x: 8, y: 784, w: 464, h: 168 } } : { photo: { x: 10, y: 8, w: 300, h: 372 }, stat: { x: 10, y: 388, w: 300, h: 82 }, P: { x: 320, y: 8, w: 470, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } }; }
  function LYfit() { return PHONE ? { P: { x: 8, y: 8, w: 464, h: 520 }, card: { x: 8, y: 536, w: 464, h: 200 }, info: { x: 8, y: 744, w: 464, h: 208 } } : { P: { x: 10, y: 8, w: 510, h: 462 }, card: { x: 528, y: 8, w: 262, h: 462 }, info: { x: 10, y: 478, w: 780, h: 134 } }; }
  function LYcmp() { return PHONE ? { P: { x: 8, y: 8, w: 464, h: 380 }, tb: { x: 8, y: 396, w: 464, h: 380 }, ord: { x: 8, y: 784, w: 464, h: 64 }, info: { x: 8, y: 856, w: 464, h: 96 } } : { P: { x: 10, y: 8, w: 440, h: 462 }, tb: { x: 458, y: 8, w: 332, h: 462 }, ord: { x: 10, y: 478, w: 780, h: 60 }, info: { x: 10, y: 546, w: 780, h: 66 } }; }
  function plotBox(P, rightPad) { const lp = PHONE ? 60 : 52, tp = PHONE ? 40 : 36, bp = PHONE ? 66 : 54; return { x: P.x + lp, y: P.y + tp, w: P.w - lp - 12 - (rightPad || 0), h: P.h - tp - bp }; }
  const XT = [-0.2, 0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6];
  function cAxes(P, c, rightPad) {
    const b = plotBox(P, rightPad), ax = mkAx(b, -0.4, 1.8, AXHI(c), AXLO(c));
    const yt = []; for (let v = Math.ceil(AXLO(c)); v <= AXHI(c); v += 2) yt.push(v);
    return { ax, yt };
  }
  const STAR_R = () => (PHONE ? 3.7 : 4.2);
  function drawFrame(P, title) {
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 23 * FS, title, PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
  }
  function plotBg(ax, yt, o) {
    drawAx(ax, Object.assign({ xt: XT, yt, xf: (v) => fN(v, 1), yf: (v) => String(v), fill: '#0b1230', gridColor: 'rgba(148,163,184,.16)', ts: PHONE ? 11 : 11.5 }, o));
  }
  function dotStar(x, y, s, a, rad) {
    const col = bvCol(s.bv);
    ctx.globalAlpha = a == null ? 1 : a;
    D.glow(x, y, (rad || STAR_R()) * 2.4, col, 0.35);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rad || STAR_R(), 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,.7)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const HIT = { photoBtns: [], photoStars: [], plate: null, plot: null, legend: [], rows: [], toTry: null };

  /* ================= ① 사진 분류 ================= */
  const PHB = ['산개 성단', '구상 성단'];
  function drawPhoto(dt, t) {
    const L = LYphoto();
    T(L.x + 4, 22 * FS, '📸 별의 수와 모양을 보고 산개 성단과 구상 성단으로 나눠요', PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    HIT.photoBtns = [];
    PHOTOS.forEach((p, i) => {
      const col = i % L.cols, row = Math.floor(i / L.cols), x = L.x + col * (L.cw + L.gap), y = L.y + row * (L.ch + L.gap);
      panel(x, y, L.cw, L.ch, { r: 14 });
      const s = L.ch - 20, fx = x + 10, fy = y + 10;
      ctx.save(); rr(fx, fy, s, s, 10).clip(); ctx.drawImage(p.cv, fx, fy, s, s); ctx.restore();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; rr(fx, fy, s, s, 10).stroke();
      const tx = fx + s + 14, tw = x + L.cw - tx - 10;
      T(tx, y + 32 * FS, '사진 ' + p.id, 17, '#1e293b', 'left', 800);
      T(tx, y + 54 * FS, p.cnt, 13.5, '#475569', 'left', 800);
      if (p.note) T(tx, y + 72 * FS, '(' + p.note + ')', 12, '#94a3b8', 'left', 700);
      const bh = PHONE ? 44 : 40, by0 = y + L.ch - 20 - bh * 2 - 8;
      for (let k = 0; k < 2; k++) {
        const on = S.photo[i] === k, wrong = on && S.phWrong[i] > 0;
        const r_ = cbtn(tx, by0 + k * (bh + 8), tw, bh, PHB[k], { on, color: wrong ? '#dc2626' : '#0ea5e9', size: 13.5 });
        HIT.photoBtns.push({ r: r_, i, k });
      }
      if (S.phWrong[i] > 0) S.phWrong[i] = Math.max(0, S.phWrong[i] - dt * 0.8);
    });
  }
  function photoDown(p) {
    for (const b of HIT.photoBtns) if (inR(p, b.r)) { S.photo[b.i] = b.k; Sound.click(); return true; }
    return false;
  }
  const photoWrongList = () => PHOTOS.map((p, i) => (S.photo[i] !== p.type ? p.id : null)).filter(Boolean);
  const photoDone = () => S.photo.every((v) => v != null);

  /* ================= ② C-M도 그리기 ================= */
  const measCount = () => S.meas.filter((m) => m && m.t >= 1).length;
  function measure(i) {
    if (S.meas[i]) return;
    S.meas[i] = { t: 0, delay: 0 }; Sound.click();
  }
  function autoMeasure(n) {
    const left = []; S.meas.forEach((m, i) => { if (!m) left.push(i); });
    left.sort((a, b) => (a * 7919) % 97 - (b * 7919) % 97);
    left.slice(0, n).forEach((i, k) => { S.meas[i] = { t: 0, delay: k * 0.12 }; });
  }
  function drawCmd(dt, t) {
    const L = LYcmd(), ph = L.photo, c = A;
    // 사진
    panel(ph.x, ph.y, ph.w, ph.h, { r: 14, fill: '#05081c' });
    T(ph.x + 14, ph.y + 22 * FS, '🔭 성단 A (별을 눌러 재기)', PHONE ? 12.5 : 13.5, '#e2e8f0', 'left', 800);
    const dia = Math.min(ph.w - 16, ph.h - 40 * FS - 6), pcx = ph.x + ph.w / 2, pcy = ph.y + 32 * FS + (ph.h - 32 * FS) / 2, sc = dia / 2;
    ctx.save(); ctx.beginPath(); ctx.arc(pcx, pcy, sc, 0, TAU); ctx.clip();
    const bg = ctx.createRadialGradient(pcx, pcy, 4, pcx, pcy, sc); bg.addColorStop(0, '#12183a'); bg.addColorStop(1, '#05081c'); ctx.fillStyle = bg; ctx.fillRect(pcx - sc, pcy - sc, dia, dia);
    HIT.photoStars = [];
    c.stars.forEach((s, i) => {
      const x = pcx + s.px * sc * 0.98, y = pcy + s.py * sc * 0.98, rad = clamp(1.3 + (13.5 - s.m) * 0.33, 1.3, 5.2), col = bvCol(s.bv), done = S.meas[i];
      D.glow(x, y, rad * 3, col, 0.4); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      if (done) { ctx.strokeStyle = rgba('#22d3ee', 0.9 * (done.t < 1 ? 1 : 0.6)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, rad + 3, 0, TAU); ctx.stroke(); }
      HIT.photoStars.push({ i, x, y, r: Math.max(rad + 7, 10) });
    });
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pcx, pcy, sc, 0, TAU); ctx.stroke();
    // C-M도
    const P = L.P, { ax, yt } = cAxes(P, c);
    drawFrame(P, '🌟 C-M도: 색지수 B − V와 겉보기 등급 m_V');
    plotBg(ax, yt, { xl: '색지수 B − V   (← 파랑·고온     빨강·저온 →)', yl: '겉보기 등급 m_V   (위쪽이 밝아요)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 40 });
    HIT.plot = ax.b;
    clipBox(ax.b, () => {
      c.stars.forEach((s, i) => {
        const m = S.meas[i]; if (!m) return;
        if (m.delay > 0) { m.delay -= dt; return; }
        m.t = Math.min(1, m.t + dt / 0.75);
        const e = SciSim.ease.outCubic(m.t), hx = pcx + s.px * sc * 0.98, hy = pcy + s.py * sc * 0.98, tx = ax.X(s.bv), ty = ax.Y(s.m);
        const x = lerp(hx, tx, e), y = lerp(hy, ty, e) - Math.sin(Math.PI * e) * 36;
        if (m.t >= 1 && !m.landed) { m.landed = true; if (!RM) parts.burst(tx, ty, { count: 3, speed: 40, life: 0.4, size: 2.2, colors: [bvCol(s.bv)], gravity: 0 }); }
        dotStar(x, y, s, 1, m.t < 1 ? STAR_R() * (1.5 - 0.5 * e) : STAR_R());
      });
    });
    // 안내 문구
    const n = measCount();
    if (n === 0) T(ax.b.x + ax.b.w / 2, ax.b.y + ax.b.h / 2, '← 사진의 별을 눌러 보세요', 14, '#94a3b8', 'center', 800);
    // 정보
    const I = L.info;
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    let yy = I.y + 24 * FS;
    T(I.x + 14, yy, '💡 같은 성단의 별은 같은 거리에 있어요', 14, '#0369a1', 'left', 800);
    yy = drawWrap(I.x + 14, yy + 22 * FS, '성단 안의 별은 우리로부터 거의 같은 거리에 있어서 m_V의 차이가 곧 절대 등급의 차이예요. 그래서 겉보기 등급만으로 그려도 H-R도처럼 왼쪽 위에서 오른쪽 아래로 이어지는 주계열 띠가 나타나요.', I.w - 28, PHONE ? 12.5 : 13.5, { color: '#334155' });
    if (L.stat) {
      const st = L.stat; panel(st.x, st.y, st.w, st.h, { r: 14 });
      T(st.x + 14, st.y + 26 * FS, '측정한 별: ' + n + ' / ' + c.stars.length + '개', 15, n >= 20 ? '#15803d' : '#1e293b', 'left', 800);
      hbar(st.x + 14, st.y + 40 * FS, st.w - 28, 12, n, c.stars.length, '#0ea5e9');
      T(st.x + 14, st.y + 74 * FS, n >= 20 ? '20개 이상 모았어요!' : '20개 이상 재 보세요', 12.5, '#64748b', 'left', 700);
    } else {
      T(I.x + I.w - 14, I.y + I.h - 12, '측정 ' + n + ' / ' + c.stars.length + '개', 13, n >= 20 ? '#15803d' : '#64748b', 'right', 800);
    }
  }
  function hbar(x, y, w, h, v, vmax, color) {
    const ww = clamp(v / vmax, 0, 1) * w;
    ctx.fillStyle = 'rgba(100,116,139,.15)'; rr(x, y, w, h, h / 2).fill();
    if (ww > 0.5) { ctx.save(); rr(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y, ww, h); ctx.restore(); }
  }
  function cmdDown(p) {
    for (const s of HIT.photoStars) if (Math.hypot(p.x - s.x, p.y - s.y) <= s.r && !S.meas[s.i]) { measure(s.i); return true; }
    return false;
  }

  /* ================= ③ 주계열 맞추기 ================= */
  function fitSigma(c) {
    let s = 0; c.msStars.forEach((q) => { const d = q.m - (msM(q.bv) + S.off); s += d * d; });
    return Math.sqrt(s / c.msStars.length);
  }
  const fitNear = () => Math.abs(S.off - curC().mM) <= 0.15;
  function drawFit(dt, t) {
    const L = LYfit(), c = curC(), P = L.P, { ax, yt } = cAxes(P, c, PHONE ? 44 : 50);
    drawFrame(P, '📏 표준 주계열(투명 판)을 밀어 ' + c.k + '의 주계열에 겹쳐요');
    plotBg(ax, yt, { xl: '색지수 B − V   (← 파랑·고온     빨강·저온 →)', yl: '겉보기 등급 m_V   (위쪽이 밝아요)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 40 });
    HIT.plot = ax.b;
    S.glow = approach(S.glow, fitNear() ? 1 : 0, dt, 8);
    clipBox(ax.b, () => {
      // 판 (띠) → 별 → 판의 중심선
      const pts = []; for (let M = -2.5; M <= 10.41; M += 0.2) pts.push([ax.X(msBV(M)), ax.Y(M + S.off)]);
      line(pts, rgba('#fbbf24', 0.2 + 0.2 * S.glow), PHONE ? 14 : 16);
      c.stars.forEach((s) => dotStar(ax.X(s.bv), ax.Y(s.m), s, 1));
      line(pts, rgba('#fbbf24', 0.9), 2.2, { dash: [7, 5] });
      if (S.glow > 0.02) line(pts, rgba('#ffffff', 0.5 * S.glow), 1.4);
    });
    // 판의 M_V 눈금 (판과 함께 움직여요)
    const rx = ax.b.x + ax.b.w + 4;
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, ax.b.y); ctx.lineTo(rx, ax.b.y + ax.b.h); ctx.stroke();
    for (let M = -4; M <= 12; M += 2) {
      const y = ax.Y(M + S.off); if (y < ax.b.y + 4 || y > ax.b.y + ax.b.h - 4) continue;
      ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + 6, y); ctx.stroke(); T(rx + 8, y + 4, String(M), PHONE ? 10.5 : 11.5, '#b45309', 'left', 800);
    }
    T(rx + 2, ax.b.y - 8, 'M_V', PHONE ? 11 : 12, '#b45309', 'left', 800);
    T(rx + 2, ax.b.y - 8 - 14 * FS, '판', PHONE ? 11 : 12, '#b45309', 'left', 800);
    // 겹침 표시
    if (S.glow > 0.05) {
      const ym = ax.Y(4.8 + S.off), xm = ax.X(0.65);
      ctx.save(); ctx.globalAlpha = S.glow; D.ring(xm, ym, 22, t, { color: '#fde047', width: 3, speed: 1.1 }); ctx.restore();
      D.label(clamp(xm, ax.b.x + 60, ax.b.x + ax.b.w - 60), clamp(ym - 34, ax.b.y + 16, ax.b.y + ax.b.h - 16), '겹쳤어요!', { bg: '#16a34a', size: 13 });
    }
    // 옆 카드
    const cd = L.card; panel(cd.x, cd.y, cd.w, cd.h, { r: 14 });
    let yy = cd.y + 24 * FS;
    T(cd.x + 14, yy, '🧮 맞춤 결과', 14.5, '#1e293b', 'left', 800);
    yy += 28 * FS;
    T(cd.x + 14, yy, '판을 민 양 = m − M', 12.5, '#475569', 'left', 800); yy += 26 * FS;
    T(cd.x + cd.w / 2, yy, f1(S.off), 30, fitNear() ? '#15803d' : '#b45309', 'center', 800); yy += 22 * FS;
    T(cd.x + cd.w / 2, yy, '등급', 12.5, '#64748b', 'center', 700); yy += 24 * FS;
    T(cd.x + 14, yy, '맞춤 오차 σ = ' + f2(fitSigma(c)) + ' 등급', 13, '#475569', 'left', 800); yy += 24 * FS;
    drawWrap(cd.x + 14, yy, fitNear() ? '판과 별들이 잘 겹쳐요.' : '판을 위아래로 밀어 보세요.', cd.w - 28, 12.5, { color: fitNear() ? '#15803d' : '#64748b', weight: 800 });
    // 정보
    const I = L.info; panel(I.x, I.y, I.w, I.h, { r: 14 });
    yy = I.y + 24 * FS;
    T(I.x + 14, yy, '💡 표준 주계열은 M_V를 아는 기준 띠예요', 14, '#0369a1', 'left', 800);
    yy = drawWrap(I.x + 14, yy + 22 * FS, '판의 눈금(M_V)과 성단의 눈금(m_V)이 어긋난 만큼이 m − M이에요. 그러면 5 log d − 5 = m − M에서 거리를 구해요: d = 10^((m − M + 5) / 5) pc.', I.w - 28, PHONE ? 12.5 : 13.5, { color: '#334155' });
    drawWrap(I.x + 14, yy + 24 * FS, '성간 소광은 아직 무시해요 (뒤의 차시에서 보정). 예) m − M = 10이면 d = 10^3 = 1000 pc.', I.w - 28, PHONE ? 12 : 12.5, { color: '#64748b' });
  }
  function fitDown(p) {
    if (!HIT.plot || !inR(p, { x: HIT.plot.x - 8, y: HIT.plot.y - 8, w: HIT.plot.w + 16, h: HIT.plot.h + 16 })) return false;
    S.offDrag = { y: p.y, off: S.off }; return true;
  }
  function fitMove(p) {
    if (!S.offDrag || !HIT.plot) return;
    const c = curC(), per = HIT.plot.h / (AXHI(c) - AXLO(c));
    S.off = clamp(Math.round((S.offDrag.off + (p.y - S.offDrag.y) / per) * 10) / 10, 0, 16);
    setSlider($('#sMM'), $('#oMM'), S.off, (v) => f1(v));
  }

  /* ================= ④ 전향점과 나이 ================= */
  function drawAge(dt, t) {
    const L = LYfit(), c = curC(), P = L.P, { ax, yt } = cAxes(P, c);
    drawFrame(P, '⏳ ' + c.k + '의 C-M도: 주계열이 끝나는 곳(전향점)을 눌러요');
    plotBg(ax, yt, { xl: '색지수 B − V   (← 파랑·고온     빨강·저온 →)', yl: '겉보기 등급 m_V   (위쪽이 밝아요)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 40 });
    HIT.plot = ax.b;
    const ci = S.clus, done = S.toDone[ci];
    S.reveal[ci] = approach(S.reveal[ci], done ? 3 : 0, dt, 1.4);
    clipBox(ax.b, () => {
      c.stars.forEach((s) => dotStar(ax.X(s.bv), ax.Y(s.m), s, 1));
    });
    const tx = ax.X(c.toBV), ty = ax.Y(c.toMv);
    if (done) {
      const k = SciSim.ease.outBack(clamp(S.reveal[ci], 0, 1));
      D.dashedLine(ax.b.x, ty, tx, ty, { color: '#fde047', width: 1.6, dash: [5, 5] });
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, 14 * k, 0, TAU); ctx.stroke();
      D.label(clamp(tx + 66, ax.b.x + 56, ax.b.x + ax.b.w - 56), ty + 22, '전향점', { bg: '#ca8a04', size: 13 });
      T(tx + 20, ty - 12, 'm_V = ' + f1(c.toMv), 12.5, '#fde047', 'left', 800, { stroke: 'rgba(5,10,30,.8)', strokeWidth: 3 });
    }
    if (S.miss && S.miss.t > 0) { S.miss.t -= dt; ctx.save(); ctx.globalAlpha = clamp(S.miss.t / 0.5, 0, 1); ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(S.miss.x, S.miss.y, 16 + (1 - S.miss.t) * 8, 0, TAU); ctx.stroke(); ctx.restore(); }
    // 계산 카드
    const cd = L.card; panel(cd.x, cd.y, cd.w, cd.h, { r: 14 });
    let yy = cd.y + 24 * FS, rv = S.reveal[ci];
    T(cd.x + 14, yy, '🧮 전향점에서 나이까지', 14.5, '#1e293b', 'left', 800); yy += 26 * FS;
    const show = FREE() || done, lh = (PHONE ? 25 : 28) * FS, fz = PHONE ? 12.5 : 12.5;
    const row = (k, txt, val, ok) => {
      const a = clamp(rv - k + 1, 0, 1);
      ctx.save(); ctx.globalAlpha = done ? a : 0.35;
      T(cd.x + 14, yy, txt, fz, '#475569', 'left', 800); T(cd.x + cd.w - 14, yy, val, fz + 1, ok ? '#15803d' : '#1e293b', 'right', 800); ctx.restore();
      yy += lh;
    };
    row(0, '전향점 m_V', done ? f1(c.toMv) : '?', false);
    row(1, 'M_V = m_V − (m − M)', done ? f1(c.toM) : '?', false);
    row(2, 'L = 10^(0.4(4.83 − M_V))', done ? (c.toL >= 100 ? f0(c.toL) : c.toL >= 10 ? f1(c.toL) : f2(c.toL)) + ' L☉' : '?', false);
    const mOk = showM(ci), tOk = showT(ci);
    row(3, '질량 M = L^(1/3.5)', mOk ? f1(c.toMass) + ' M☉' : '직접 계산', mOk);
    row(3, '수명 t = 10¹⁰ × M^(−2.5)', tOk ? c.ageTxt.replace('약 ', '≈ ') : '직접 계산', tOk);
    if (!done) drawWrap(cd.x + 14, yy + 2, '먼저 C-M도에서 전향점을 눌러요.', cd.w - 28, 12.5, { color: '#64748b', weight: 800 });
    else if (PHONE === false) drawWrap(cd.x + 14, yy + 2, 'm − M = ' + f1(c.mM) + ' (앞에서 구한 값)', cd.w - 28, 12, { color: '#64748b' });
    // 정보
    const I = L.info; panel(I.x, I.y, I.w, I.h, { r: 14 });
    yy = I.y + 24 * FS;
    T(I.x + 14, yy, '💡 전향점: 주계열을 막 떠나기 시작하는 별', 14, '#0369a1', 'left', 800);
    yy = drawWrap(I.x + 14, yy + 22 * FS, '성단의 별은 한꺼번에 태어났어요. 무거운 별일수록 연료를 빨리 써서 먼저 주계열을 떠나요. 지금 막 떠나는 별의 질량을 알면 그 별의 수명 = 성단의 나이예요. 질량-광도 관계 L = M^3.5, 수명 t = 10¹⁰ × M^(−2.5) 년(태양 = 10¹⁰ 년)을 써요.', I.w - 28, PHONE ? 12 : 13.5, { color: '#334155' });
    if (S.clus >= 0 && done) drawWrap(I.x + 14, yy + 24 * FS, c.k + ': ' + c.kind + ' (' + c.like + ') — 전향점 M_V = ' + f1(c.toM) + ', 나이 ' + c.ageTxt + '.', I.w - 28, PHONE ? 12 : 13, { color: '#0f766e', weight: 800 });
  }
  const showM = (ci) => FREE() || S.mOk[ci], showT = (ci) => FREE() || S.tOk[ci];
  S.mOk = [false, false, false, false]; S.tOk = [false, false, false, false];
  function ageDown(p) {
    if (!HIT.plot || !inR(p, HIT.plot)) return false;
    const c = curC(), ax = cAxes(LYfit().P, c).ax, tx = ax.X(c.toBV), ty = ax.Y(c.toMv);
    if (S.toDone[S.clus]) return true;
    if (Math.hypot(p.x - tx, p.y - ty) <= (PHONE ? 30 : 26)) {
      S.toDone[S.clus] = true; S.reveal[S.clus] = 0; parts.burst(tx, ty, { count: 14, speed: 120, life: 0.7, size: 3.4, colors: ['#fde047', '#fbbf24', '#ffffff'], gravity: 80 });
      say('전향점을 찾았어요! m_V = ' + f1(c.toMv), false, 2.4);
      S.flags.pickClus = S.flags.pickClus || S.clus === 0; updateCtl();
      ['inM', 'inT'].forEach((id) => { const e = $('#' + id); if (e && e.value.trim()) e.dispatchEvent(new Event('input')); });
    } else {
      S.miss = { x: p.x, y: p.y, t: 0.6 }; say('주계열이 끝나는(위쪽 끝) 별을 찾아 보세요', true, 2.2);
    }
    return true;
  }

  /* ================= 나이를 먹는 성단 ================= */
  function agePos(s, t) {
    const ratio = t / s.tms;
    if (ratio < 1) return { bv: s.bv, Mv: s.Mv, a: 1, ph: 0 };
    const f = clamp((ratio - 1) / 0.7, 0, 1), q = smooth(f);
    const a = ratio < 1.7 ? 1 : clamp(1 - (ratio - 1.7) / 0.35, 0, 1);
    return { bv: lerp(s.bv, 1.36, Math.pow(q, 0.7)), Mv: s.Mv - 3.2 * q, a, ph: 1 };
  }
  function drawAging(dt, t) {
    const L = LYfit(), P = L.P, b = plotBox(P);
    S.ageLog = approach(S.ageLog, S.ageTgt, dt, 4);
    const tyr = Math.pow(10, S.ageLog), ax = mkAx(b, -0.4, 1.8, 11.5, -6.5), yt = [-6, -4, -2, 0, 2, 4, 6, 8, 10];
    drawFrame(P, '🕰 한꺼번에 태어난 별들이 나이를 먹으면');
    plotBg(ax, yt, { xl: '색지수 B − V   (← 파랑·고온     빨강·저온 →)', yl: '절대 등급 M_V   (위쪽이 밝아요)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 40 });
    const pts = []; for (let M = -2.5; M <= 10.41; M += 0.3) pts.push([ax.X(msBV(M)), ax.Y(M)]);
    line(pts, 'rgba(148,163,184,.4)', 2, { dash: [5, 5] });
    let onMS = 0, giant = 0;
    clipBox(ax.b, () => {
      AGEST.forEach((s) => {
        const q = agePos(s, tyr); if (q.a <= 0.01) return;
        if (q.ph === 0) onMS++; else giant++;
        dotStar(ax.X(q.bv), ax.Y(q.Mv), { bv: q.ph ? 1.2 : s.bv }, q.a, STAR_R() * (q.ph ? 1.35 : 1));
      });
      const tm = toMvAt(tyr), ty = ax.Y(tm);
      D.dashedLine(ax.b.x, ty, ax.b.x + ax.b.w, ty, { color: '#fde047', width: 1.6, dash: [6, 5] });
    });
    const tm = toMvAt(tyr);
    D.label(ax.b.x + ax.b.w - 80, clamp(ax.Y(tm) - 14, ax.b.y + 14, ax.b.y + ax.b.h - 14), '전향점 M_V = ' + f1(tm), { bg: '#ca8a04', size: 12.5 });
    // 카드
    const cd = L.card; panel(cd.x, cd.y, cd.w, cd.h, { r: 14 });
    let yy = cd.y + 24 * FS;
    T(cd.x + 14, yy, '⏱ 성단의 나이', 14.5, '#1e293b', 'left', 800); yy += 34 * FS;
    T(cd.x + cd.w / 2, yy, sci(tyr, 1) + ' 년', PHONE ? 22 : 24, '#b45309', 'center', 800); yy += 28 * FS;
    T(cd.x + 14, yy, '전향점의 질량', 12.5, '#475569', 'left', 800); T(cd.x + cd.w - 14, yy, f1(massRound(tyr)) + ' M☉', 13, '#1e293b', 'right', 800); yy += 24 * FS;
    T(cd.x + 14, yy, '전향점의 M_V', 12.5, '#475569', 'left', 800); T(cd.x + cd.w - 14, yy, f1(tm), 13, '#1e293b', 'right', 800); yy += 24 * FS;
    T(cd.x + 14, yy, '주계열 별', 12.5, '#475569', 'left', 800); T(cd.x + cd.w - 14, yy, onMS + '개', 13, '#1e293b', 'right', 800); yy += 24 * FS;
    T(cd.x + 14, yy, '거성 단계의 별', 12.5, '#475569', 'left', 800); T(cd.x + cd.w - 14, yy, giant + '개', 13, '#1e293b', 'right', 800);
    const I = L.info; panel(I.x, I.y, I.w, I.h, { r: 14 });
    yy = I.y + 24 * FS;
    T(I.x + 14, yy, '💡 위쪽(푸른) 별부터 주계열을 떠나요', 14, '#0369a1', 'left', 800);
    yy = drawWrap(I.x + 14, yy + 22 * FS, '질량이 큰 별은 광도가 매우 커서 수명이 짧아요(t = 10¹⁰ × M^(−2.5) 년). 나이가 늘수록 전향점이 아래로 내려오고, 떠난 별은 붉은 거성 쪽으로 옮겨 가요.', I.w - 28, PHONE ? 12 : 13.5, { color: '#334155' });
    drawWrap(I.x + 14, yy + 24 * FS, '거성이 된 뒤의 별은 어두운 잔해가 되어 이 그림에서는 사라지게 그렸어요. 거성 단계의 모양은 대략적인 그림이에요.', I.w - 28, PHONE ? 11.5 : 12.5, { color: '#64748b' });
  }

  /* ================= ⑤ 성단 비교 ================= */
  const cmpRow = (i) => { const L = LYcmp(), tb = L.tb, hh = 34, rh = (tb.h - hh - 8) / 4; return { x: tb.x + 8, y: tb.y + hh + i * rh, w: tb.w - 16, h: rh - 4 }; };
  function drawCompare(dt, t) {
    const L = LYcmp(), P = L.P, b = plotBox(P), ax = mkAx(b, -0.4, 1.8, 11.5, -6.5), yt = [-6, -4, -2, 0, 2, 4, 6, 8, 10];
    drawFrame(P, '📋 네 성단을 한 그림에 (절대 등급 M_V = m_V − (m − M))');
    plotBg(ax, yt, { xl: '색지수 B − V   (← 파랑·고온     빨강·저온 →)', yl: '절대 등급 M_V   (위쪽이 밝아요)', ls: PHONE ? 12 : 13, ylx: PHONE ? 46 : 40 });
    const pts = []; for (let M = -2.5; M <= 10.41; M += 0.3) pts.push([ax.X(msBV(M)), ax.Y(M)]);
    line(pts, 'rgba(148,163,184,.35)', 2, { dash: [5, 5] });
    clipBox(ax.b, () => {
      CL.forEach((c, ci) => {
        const dim = S.rowSel >= 0 && S.rowSel !== ci ? 0.35 : 0.95;
        c.stars.forEach((s) => { ctx.globalAlpha = dim; ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(ax.X(s.bv), ax.Y(s.M), PHONE ? 3 : 3.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; });
      });
      CL.forEach((c, ci) => {
        const y = ax.Y(c.toM);
        D.dashedLine(ax.b.x, y, ax.X(c.toBV), y, { color: rgba(c.col, 0.7), width: 1.4, dash: [4, 5] });
        ctx.strokeStyle = c.col; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ax.X(c.toBV), y, 8, 0, TAU); ctx.stroke();
        T(ax.b.x + 5 + (ci % 2) * 0, y - 4, c.k + '  M_V = ' + f1(c.toM), 11.5, c.col, 'left', 800, { stroke: 'rgba(5,10,30,.8)', strokeWidth: 3 });
      });
    });
    // 범례: 눌러서 순서 정하기
    HIT.legend = [];
    const lh = PHONE ? 40 : 30, lw = (ax.b.w - 12 - 3 * 6) / 4, y = ax.b.y + ax.b.h - lh - 6;
    CL.forEach((c, ci) => {
      const lx = ax.b.x + 6 + ci * (lw + 6), pos = S.order.indexOf(ci);
      ctx.fillStyle = 'rgba(11,18,48,.92)'; rr(lx, y, lw, lh, lh / 2).fill();
      ctx.strokeStyle = c.col; ctx.lineWidth = pos >= 0 ? 3.5 : 2; rr(lx, y, lw, lh, lh / 2).stroke();
      ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(lx + 16, y + lh / 2, 6, 0, TAU); ctx.fill();
      T(lx + 28, y + lh / 2 + 4.5, c.k + (pos >= 0 ? ' · ' + (pos + 1) + '번째' : ''), PHONE ? 11.5 : 12.5, '#f1f5f9', 'left', 800);
      HIT.legend.push({ r: { x: lx, y, w: lw, h: lh }, ci });
    });
    // 표
    const tb = L.tb; panel(tb.x, tb.y, tb.w, tb.h, { r: 14 });
    T(tb.x + 14, tb.y + 22 * FS, '거리·나이 표 (성단을 눌러 선택)', PHONE ? 12.5 : 13.5, '#1e293b', 'left', 800);
    HIT.rows = [];
    CL.forEach((c, i) => {
      const r = cmpRow(i), sel = S.rowSel === i, ok = S.dOk[i];
      ctx.fillStyle = sel ? rgba(c.col, 0.18) : '#f8fafc'; rr(r.x, r.y, r.w, r.h, 10).fill();
      ctx.strokeStyle = sel ? c.col : ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = sel ? 3 : 1.6; rr(r.x, r.y, r.w, r.h, 10).stroke();
      ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(r.x + 16, r.y + 18 * Math.min(FS, 1.15), 7, 0, TAU); ctx.fill();
      const sz = PHONE ? 12 : 13, ly = r.h / 3.2;
      T(r.x + 30, r.y + 22 * Math.min(FS, 1.15), c.k + ' · ' + c.kind + ' · ' + c.place, sz + 0.5, '#1e293b', 'left', 800);
      T(r.x + 12, r.y + 22 * Math.min(FS, 1.15) + ly, c.cnt + ' · m − M = ' + f1(c.mM), sz, '#475569', 'left', 700);
      T(r.x + 12, r.y + 22 * Math.min(FS, 1.15) + ly * 2, ok || FREE() ? 'd = ' + c.dTxt + ' · ' + c.ageTxt : 'd = ? pc', sz, ok || FREE() ? '#15803d' : '#94a3b8', 'left', 800);
      if (ok) D.check(r.x + r.w - 20, r.y + r.h - 20, 10, 1);
      HIT.rows.push({ r, i });
    });
    // 순서 띠
    const o = L.ord; panel(o.x, o.y, o.w, o.h, { r: 14 });
    if (PHONE) { T(o.x + 14, o.y + 26, '나이 순서', 13, '#1e293b', 'left', 800); T(o.x + 14, o.y + 48, '(젊음 → 늙음)', 11.5, '#64748b', 'left', 700); } else T(o.x + 14, o.y + 22, '나이 순서 (젊음 → 늙음)', 13, '#1e293b', 'left', 800);
    const sw = (o.w - 28 - (PHONE ? 150 : 200)) / 4;
    for (let k = 0; k < 4; k++) {
      const x = o.x + (PHONE ? 150 : 200) + k * sw, ci = S.order[k];
      ctx.fillStyle = ci != null ? rgba(CL[ci].col, 0.25) : '#f1f5f9'; rr(x, o.y + 8, sw - 6, o.h - 16, 10).fill();
      ctx.strokeStyle = ci != null ? CL[ci].col : '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash(ci != null ? [] : [5, 4]); rr(x, o.y + 8, sw - 6, o.h - 16, 10).stroke(); ctx.setLineDash([]);
      T(x + (sw - 6) / 2, o.y + o.h / 2 + 5, ci != null ? CL[ci].k : String(k + 1), 15, ci != null ? '#1e293b' : '#94a3b8', 'center', 800);
    }
    HIT.orderSlots = { x: o.x + (PHONE ? 150 : 200), y: o.y, w: sw * 4, h: o.h, sw };
    const I = L.info; panel(I.x, I.y, I.w, I.h, { r: 14 });
    drawWrap(I.x + 14, I.y + 22 * FS, '전향점이 낮을수록 질량이 작은 별까지 주계열에 남아 있으니 성단이 늙었어요. 산개 성단은 은하 원반의 젊은 별 무리(푸른 별 많음), 구상 성단은 헤일로의 늙은 별 무리(붉은 별 많음)예요.', I.w - 28, PHONE ? 11.5 : 13.5, { color: '#334155' });
  }
  function compareDown(p) {
    for (const l of HIT.legend) if (inR(p, l.r)) {
      const k = S.order.indexOf(l.ci);
      if (k >= 0) S.order.splice(k, 1); else if (S.order.length < 4) S.order.push(l.ci);
      Sound.click(); return true;
    }
    for (const r of HIT.rows) if (inR(p, r.r)) { selectRow(r.i); Sound.click(); return true; }
    const o = HIT.orderSlots;
    if (o && inR(p, o)) { const k = Math.floor((p.x - o.x) / o.sw); if (k >= 0 && k < S.order.length) { S.order.splice(k, 1); Sound.click(); } return true; }
    return false;
  }
  function selectRow(i) {
    S.rowSel = i; clrIn('inDc'); $('#inDc').dataset.ci = i; updateCtl();
  }

  /* ================= 입력 · 컨트롤 ================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    if (PHONE) view.canvas.style.touchAction = v === 'fit' ? 'none' : 'pan-y';
    updateCtl();
  }
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcD').hidden = !(S.view === 'fit' && (S.flags.calcD || free));
    $('#pickClus').hidden = !((S.view === 'fit' && free) || (S.view === 'age' && (S.flags.pickClus || free)));
    $('#calcAge').hidden = !(S.view === 'age' && (S.flags.calcAge || free));
    $('#calcCmp').hidden = !(S.view === 'compare' && (S.flags.calcCmp || free) && S.rowSel >= 0 && !S.dOk[S.rowSel]);
    $('#cmpPick').hidden = !(S.view === 'compare' && S.rowSel < 0);
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $('#lbD').textContent = '성단 ' + curC().k;
    $('#cmpNote').textContent = S.flags.calcCmp || free ? '표에서 성단 칸을 눌러 고른 뒤 거리 d를 입력해요. 그림의 A·B·C·D 단추는 젊은 성단부터 눌러 나이 순서를 정할 때 써요.' : '그림의 A·B·C·D 단추를 젊은 성단부터 차례로 눌러 나이 순서를 정해요. 표의 칸을 누르면 그 성단이 강조돼요.';
    $$('#grpClus .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.clus));
    if (S.rowSel >= 0) { const c = CL[S.rowSel]; $('#cmpWho').textContent = c.k + '의 거리 d (pc)'; }
  }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  sl('#sMM', '#oMM', (v) => f1(v), (v) => { S.off = v; });
  const ageFmt = (v) => sci(Math.pow(10, v), 1) + ' 년';
  sl('#sAge', '#oAge', ageFmt, (v) => { S.ageLog = v; S.ageTgt = v; });
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpClus .opt').forEach((b) => clickable(b, () => { S.clus = +b.dataset.k; clrIn('inD', 'inM', 'inT'); if (S.view === 'fit') { S.off = Math.min(S.off, 16); } updateCtl(); }));
  $$('#grpAgeJump .opt').forEach((b) => clickable(b, () => { const v = Math.log10(CL[+b.dataset.k].age); S.ageTgt = v; setSlider($('#sAge'), $('#oAge'), v, ageFmt); }));
  clickable($('#bAuto'), () => { autoMeasure(10); });
  const inCheck = (id, v, rel) => { const x = numOf(id); return nearRel(x, v, rel); };
  const dOkNow = () => inCheck('inD', A.d, 0.07);
  $('#inD').addEventListener('input', () => { if (inCheck('inD', curC().d, 0.07)) fbIn('inD', true); });
  $('#inM').addEventListener('input', () => { const c = curC(); if (nearRel(numOf('inM'), c.toMass, 0.06) && S.toDone[S.clus]) { S.mOk[S.clus] = true; fbIn('inM', true); } });
  $('#inT').addEventListener('input', () => { const c = curC(), x = numOf('inT'); if (x != null && nearRel(x * 1e8, c.age, 0.12) && S.toDone[S.clus]) { S.tOk[S.clus] = true; fbIn('inT', true); } });
  $('#inDc').addEventListener('input', () => {
    const i = S.rowSel; if (i < 0) return; const c = CL[i];
    if (nearRel(numOf('inDc'), c.d, 0.07)) { S.dOk[i] = true; fbIn('inDc', true); say(c.k + ' 거리 d = ' + c.dTxt + '. 전향점으로 나이도 알 수 있어요: ' + c.ageTxt, false, 3); updateCtl(); }
  });
  $$('#grpPickRow .opt').forEach((b) => clickable(b, () => selectRow(+b.dataset.k)));

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'photo': return photoDown(p);
        case 'cmd': return cmdDown(p);
        case 'fit': return fitDown(p);
        case 'age': return ageDown(p);
        case 'compare': return compareDown(p);
        default: return false;
      }
    },
    move(p) { if (S.view === 'fit') fitMove(p); },
    up() { S.offDrag = null; },
    hover(p) {
      if (S.view === 'photo') return HIT.photoBtns.some((b) => inR(p, b.r)) ? 'pointer' : '';
      if (S.view === 'cmd') return HIT.photoStars.some((s) => Math.hypot(p.x - s.x, p.y - s.y) <= s.r && !S.meas[s.i]) ? 'pointer' : '';
      if (S.view === 'fit') return HIT.plot && inR(p, HIT.plot) ? 'ns-resize' : '';
      if (S.view === 'age') return HIT.plot && inR(p, HIT.plot) ? 'crosshair' : '';
      if (S.view === 'compare') return HIT.legend.some((l) => inR(p, l.r)) || HIT.rows.some((r) => inR(p, r.r)) ? 'pointer' : '';
      return '';
    },
  });

  /* ================= 미션 ================= */
  const orderOK = () => S.order.length === 4 && S.order.every((v, i) => v === i);
  const levels = [
    {
      title: 'C-M도: 성단 별의 색과 밝기', short: 'C-M도', icon: '🌟', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 별 무리의 색과 밝기 그림만으로 성단까지의 거리와 나이를 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교·지구과학에서</b> 산개 성단과 구상 성단, 그리고 H-R도(세로축: 절대 등급)를 배웠어요. 이번에는 성단의 별을 하나씩 재서 <b>색지수 B − V</b>와 <b>겉보기 등급 m_V</b>로 <b>C-M도(색-등급도)</b>를 그려요.</div>' +
        '<p>같은 성단의 별은 거의 같은 시기에 태어났고 우리와 거의 같은 거리에 있어요. 먼저 성단 사진 4장을 산개/구상으로 나눠 보고, 성단 A의 별을 재어 C-M도를 그려 보세요. (성간 소광은 아직 무시해요.)</p>',
      features: ['photo', 'cmd'],
      setup() { setView('photo'); },
      recap: 'C-M도는 성단 별의 색지수(가로)와 등급(세로)을 그린 그림이에요. 같은 거리의 별이라 m_V로 그려도 주계열 띠가 나타나요.',
      summary: '<ul><li><b>산개 성단</b>: 별 수십~수천 개, 불규칙한 모양, 은하 원반에 있고 젊은 별(푸른색)이 많아요. <b>구상 성단</b>: 별 수만~수백만 개, 공 모양, 은하 헤일로에 있고 늙은 별(붉은색)이 많아요.</li><li><b>C-M도</b>: 가로 색지수 B − V(왼쪽이 파랑·고온), 세로 등급(위쪽이 밝음). 성단의 별은 거의 같은 거리에 있어 <b>겉보기 등급 m_V</b>로 그려도 H-R도처럼 주계열이 나타나요.</li><li>성단의 별은 <b>같은 시기에 태어나고 같은 거리</b>에 있어 거리와 나이를 비교하기에 좋아요.</li></ul>',
      missions: [
        {
          title: '성단 사진 분류하기', manual: true,
          goal: '사진 4장을 별의 수와 모양을 보고 <b>산개 성단</b>과 <b>구상 성단</b>으로 나눈 뒤 확인하세요.',
          hint: '산개 성단은 별이 수십~수천 개로 듬성듬성 모여 있고, 구상 성단은 수만~수백만 개가 공 모양으로 빽빽해요.',
          setup() { setView('photo'); },
          check: () => { if (!photoDone()) return '네 장 모두 분류해 주세요.'; const w = photoWrongList(); if (!w.length) return true; w.forEach((id) => { const i = PHOTOS.findIndex((p) => p.id === id); S.phWrong[i] = 1; }); return '사진 ' + w.join('·') + '을(를) 다시 살펴보세요. 별의 수와 모양을 비교해 보세요.'; },
          explain: '사진 ②·③은 별이 100개 안팎으로 듬성듬성한 <b>산개 성단</b>, 사진 ①·④는 별이 수만~수십만 개 모여 공 모양인 <b>구상 성단</b>이에요. 산개 성단은 은하 원반에, 구상 성단은 헤일로에 있어요.',
        },
        {
          title: '성단 A의 C-M도 그리기',
          goal: '성단 A 사진에서 별을 눌러 B − V와 m_V를 재고, <b>20개 이상</b> C-M도에 찍으세요.',
          hint: '밝은 별부터 눌러도 좋고, [별 10개 자동 측정] 단추를 눌러도 돼요.',
          setup() { setView('cmd'); },
          check: () => measCount() >= 20, hold: 0.6,
          status: () => mark(measCount() >= 20) + ' 측정한 별 ' + measCount() + ' / 20개',
          explain: '별을 20개 이상 찍으면 왼쪽 위(푸르고 밝음)에서 오른쪽 아래(붉고 어두움)로 이어지는 <b>주계열 띠</b>가 보여요. 이 모양은 H-R도와 같아요.',
        },
        {
          type: 'quiz', title: '겉보기 등급으로 그려도 되는 까닭',
          goal: '성단 A의 C-M도를 <b>겉보기 등급 m_V</b>로 그려도 주계열 띠 모양이 H-R도와 같은 까닭은?',
          setup() { setView('cmd'); },
          choices: ['성단의 별은 우리로부터 거의 같은 거리에 있어서, m_V의 차이가 곧 절대 등급의 차이이기 때문이에요', '성단의 별은 모두 실제 밝기가 같기 때문이에요', '겉보기 등급과 절대 등급은 언제나 같은 값이기 때문이에요', '성단의 별은 모두 같은 색이기 때문이에요'],
          answer: 0,
          feedback: ['', '별마다 밝기(광도)가 달라서 주계열 띠가 생겨요. 같은 것은 거리예요.', '겉보기 등급은 거리에 따라 달라지는 값이에요. 같은 거리일 때만 차이가 같아져요.', '별마다 색이 달라서(B − V가 달라서) 가로로 퍼진 띠가 되어요.'],
          explain: 'm − M = 5 log d − 5에서 d가 모두 같으면 m − M도 모두 같아요. 그래서 m_V의 차이는 M_V의 차이와 같고, 그림의 <b>모양은 H-R도와 같되 위아래로 m − M만큼 옮겨진</b> 것이에요.',
        },
      ],
    },
    {
      title: '주계열 맞추기: 성단까지의 거리', short: '맞추기', icon: '📏', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 성단 A의 C-M도는 m_V로 그렸는데도 H-R도 같은 주계열 띠가 나왔어요. 이 띠를 절대 등급을 아는 <b>표준 주계열</b>과 비교하면 거리를 알 수 있어요.</div>' +
        '<p>표준 주계열(M_V)을 투명한 판처럼 위아래로 밀어 성단의 주계열과 겹쳐 보세요. 판을 민 양이 <b>m − M</b>이에요. 거리 지수 <b>m − M = 5 log d − 5</b>(d: pc)로 거리를 계산해요.</p>',
      features: ['fit'],
      setup() { S.off = 2.0; S.clus = 0; setSlider($('#sMM'), $('#oMM'), 2.0, (v) => f1(v)); setView('fit'); },
      recap: '표준 주계열을 성단의 주계열에 겹친 만큼이 m − M이고, d = 10^((m − M + 5)/5) pc로 거리를 구해요.',
      summary: '<ul><li><b>주계열 맞추기</b>: 표준 주계열(M_V를 아는 기준 띠)을 성단의 주계열(m_V)에 겹치도록 위아래로 옮겨요. 옮긴 양 = <b>m − M</b>(거리 지수).</li><li><b>m − M = 5 log d − 5</b> → <b>d = 10^((m − M + 5)/5) pc</b>. 성단 A는 m − M = 5.7이므로 d = 10^2.14 ≈ <b>138 pc</b>.</li><li>시차로 잴 수 없는 먼 성단에도 쓸 수 있어요(별의 절대 등급을 표준 주계열로 알기 때문). 성간 소광은 무시한 값이에요.</li></ul>',
      missions: [
        {
          title: '표준 주계열 판으로 m − M 읽기',
          goal: '표준 주계열 판을 위아래로 밀어(그림을 끌거나 슬라이더) 성단 A의 주계열과 겹치고, <b>m − M</b>을 읽으세요.',
          hint: '판이 별들 위에 포개지면 "겹쳤어요!"가 나타나요. 그때의 m − M을 읽어요.',
          setup() { S.clus = 0; setView('fit'); },
          check: () => Math.abs(S.off - A.mM) <= 0.2, hold: 0.8,
          status: () => mark(Math.abs(S.off - A.mM) <= 0.2) + ' 판을 민 양 m − M = ' + f1(S.off) + ' 등급',
          explain: '판을 <b>5.7등급</b> 밀었을 때 표준 주계열과 성단 A의 주계열이 겹쳐요. 성단의 별이 표준 주계열보다 5.7등급 어둡게 보인다는 뜻이에요: <b>m − M = 5.7</b>.',
        },
        {
          title: '성단 A까지의 거리 계산하기',
          goal: '맞춘 값으로 <b>d = 10^((m − M + 5)/5)</b>를 계산해 pc 단위로 입력하세요.',
          hint: 'm − M = 5.7이면 (5.7 + 5)/5 = 2.14이고, 10^2.14 ≈ 138이에요.',
          setup() { S.clus = 0; S.flags.calcD = true; clrIn('inD'); setView('fit'); },
          check: () => Math.abs(S.off - A.mM) <= 0.25 && dOkNow(), hold: 0.6,
          status: () => mark(Math.abs(S.off - A.mM) <= 0.25) + ' 판 맞추기 &nbsp; ' + mark(dOkNow()) + ' d = ' + ($('#inD').value.trim() || '—') + ' pc',
          explain: 'm − M = 5 log d − 5 → log d = (5.7 + 5)/5 = 2.14 → <b>d ≈ 138 pc</b> (약 450광년). 성단 A는 플레이아데스와 비슷한 산개 성단이에요.',
        },
        {
          type: 'quiz', title: '왜 주계열 맞추기를 쓸까?',
          goal: '주계열 맞추기는 연주 시차로 잴 수 없는 <b>먼 성단</b>의 거리를 구하는 데 쓰여요. 그 까닭은?',
          setup() { setView('fit'); },
          choices: ['표준 주계열로 별의 절대 등급을 알 수 있어, 겉보기 등급과 비교해 거리 지수 m − M을 구할 수 있기 때문이에요', '성단 속 모든 별의 연주 시차를 하나씩 재면 되기 때문이에요', '성단이 멀수록 주계열이 더 밝아지기 때문이에요', '표준 주계열은 성단의 거리에 따라 모양이 달라지기 때문이에요'],
          answer: 0,
          feedback: ['', '먼 성단의 별은 시차가 너무 작아서 직접 잴 수 없어요. 그래서 다른 방법이 필요해요.', '별의 실제 밝기는 거리와 상관없어요. 멀어지면 어둡게 보일 뿐이에요.', '표준 주계열은 절대 등급의 기준이라 거리와 상관없이 같은 모양이에요. 위아래로 옮기기만 해요.'],
          explain: '같은 색(B − V)의 주계열 별은 거의 같은 절대 등급을 가져요. 그래서 표준 주계열의 M_V와 성단의 m_V를 비교하면 <b>m − M</b>, 즉 거리를 알 수 있어요.',
        },
      ],
    },
    {
      title: '전향점: 성단의 나이', short: '성단 나이', icon: '⏳', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 성단 A까지의 거리(m − M = 5.7)를 구했어요. 이제 같은 C-M도에서 주계열이 끝나는 곳, <b>전향점</b>으로 성단의 <b>나이</b>를 구해요.</div>' +
        '<p>전향점의 m_V에서 m − M을 빼면 절대 등급 M_V → 광도 L = 10^(0.4(4.83 − M_V)) → 질량 M = L^(1/3.5) → 수명 t = 10¹⁰ × M^(−2.5)년이에요. 이 수명이 곧 성단의 나이예요.</p>',
      features: ['age'],
      setup() { S.clus = 0; setView('age'); },
      recap: '전향점의 M_V로 질량과 수명을 구하면 성단의 나이가 나와요. 무거운 별이 먼저 떠나므로 늙은 성단일수록 전향점이 낮아요.',
      summary: () => '<ul><li><b>전향점</b>: 성단의 주계열이 끝나는(별이 막 주계열을 떠나는) 곳. 성단이 늙을수록 전향점이 아래(어두운 쪽)로 내려와요.</li><li>계산 순서: M_V = m_V − (m − M) → <b>L = 10^(0.4(4.83 − M_V))</b> → <b>M = L^(1/3.5)</b> → <b>t = 10¹⁰ × M^(−2.5) 년</b>. 성단 A: M_V = −2.2 → L ≈ 649 L☉ → M ≈ 6.4 M☉ → t ≈ <b>1.0×10⁸ 년</b>.</li><li>' + CL.map((c) => c.k + ' ' + c.ageTxt.replace('약 ', '')).join(' · ') + '. 성단의 별은 한꺼번에 태어나므로 무거운 별부터 주계열을 떠나요.</li></ul>',
      missions: [
        {
          title: '전향점의 질량 구하기',
          goal: '성단 A의 C-M도에서 <b>전향점</b>을 눌러 찾고, 그 별의 질량(M☉)을 계산해 입력하세요.',
          hint: '전향점은 주계열의 위쪽 끝(가장 푸르고 밝은 별)이에요. M_V = −2.2이면 L ≈ 649, M = 649^(1/3.5) ≈ 6.4예요.',
          setup() { S.clus = 0; S.flags.calcAge = true; S.toDone[0] = false; S.reveal[0] = 0; S.mOk[0] = false; S.tOk[0] = false; clrIn('inM', 'inT'); setView('age'); },
          check: () => S.toDone[0] && S.mOk[0], hold: 0.6,
          status: () => mark(S.toDone[0]) + ' 전향점 찾기 &nbsp; ' + mark(S.mOk[0]) + ' M = ' + ($('#inM').value.trim() || '—') + ' M☉',
          explain: '전향점의 m_V = 3.5, m − M = 5.7 → M_V = −2.2. L = 10^(0.4 × (4.83 + 2.2)) ≈ 649 L☉이고 M = 649^(1/3.5) ≈ <b>6.4 M☉</b>이에요. 태양보다 6배 넘게 무거운 푸른 별이에요.',
        },
        {
          title: '성단 A의 나이 계산하기', manual: true,
          goal: '<b>t = 10¹⁰ × M^(−2.5)</b>(년)로 성단 A의 나이를 <b>억 년</b> 단위로 입력하고 확인하세요.',
          hint: '6.4^(−2.5) = 1/6.4^2.5 ≈ 0.0097이므로 t ≈ 9.7×10⁷년 ≈ 1.0억 년이에요.',
          setup() { S.clus = 0; S.flags.calcAge = true; S.tOk[0] = false; clrIn('inT'); setView('age'); },
          check: () => { if (!S.toDone[0]) return '먼저 전향점을 찾아 눌러요.'; const x = numOf('inT'); if (x == null) return '나이를 억 년 단위로 입력해 주세요.'; if (nearRel(x * 1e8, A.age, 0.12)) { S.tOk[0] = true; return true; } return x > 2 ? '너무 커요. 6.4^2.5가 약 100이라는 점을 써 보세요.' : '10¹⁰ × 6.4^(−2.5)를 다시 계산해 보세요.'; },
          explain: 't = 10¹⁰ × 6.4^(−2.5) ≈ 9.7×10⁷ ≈ <b>1.0×10⁸ 년</b>(약 1억 년)이에요. 태양(10¹⁰ 년)보다 훨씬 짧게 살아서 이 성단은 아주 젊어요.',
        },
        {
          type: 'quiz', title: '무거운 별이 먼저 떠나는 까닭',
          goal: '성단의 별들은 한꺼번에 태어났는데 <b>무거운 별부터</b> 주계열을 떠나는 까닭은?',
          setup() { setView('aging'); },
          choices: ['무거운 별은 광도가 매우 커서 연료를 빨리 써 버려 수명이 짧기 때문이에요', '무거운 별은 태어난 시기가 가장 이르기 때문이에요', '성단에 있는 별은 나이가 제각각이기 때문이에요', '무거운 별은 연료가 적어서 금방 다 타 버리기 때문이에요'],
          answer: 0,
          feedback: ['', '성단의 별은 거의 같은 시기에 태어났어요. 수명이 달라서 떠나는 때가 달라요.', '성단은 한 번에 만들어진 별 무리라서 별들의 나이가 거의 같아요(그래서 성단의 나이를 하나로 말해요).', '무거운 별은 연료도 많지만 훨씬 더 빨리 태워서 수명이 짧아요(L ∝ M^3.5).'],
          explain: '수명은 (연료 ∝ M) ÷ (연소율 ∝ L ∝ M^3.5)에 비례해서 <b>t ∝ M^(−2.5)</b>이에요. 무거운 별일수록 수명이 짧아 먼저 주계열을 떠나고, 시간이 지날수록 전향점이 내려와요.',
        },
      ],
    },
    {
      title: '성단 비교: 거리와 나이 표', short: '성단 비교', icon: '📋', phase: '확인',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한 성단의 거리와 나이를 구했어요. 이제 성단 4개의 C-M도를 한 화면에 겹쳐 놓고 전향점 높이로 <b>나이를 비교</b>하고, <b>거리·나이 표</b>를 완성해요.</div>' +
        '<p>성단마다 m − M이 달라서 m_V로는 겹쳐 비교할 수 없어요. 각 성단의 m − M을 빼서 <b>절대 등급 M_V</b>로 맞추면 주계열이 겹치고 전향점의 높이 차이가 한눈에 보여요.</p>',
      features: ['compare'],
      setup() { S.order = []; S.rowSel = -1; setView('compare'); },
      recap: '전향점이 높을수록 젊은 성단이에요. 산개 성단은 젊고 은하 원반에, 구상 성단은 늙고 헤일로에 있어요.',
      summary: () => '<ul><li>' + CL.map((c) => '성단 ' + c.k + '(' + c.kind + '): m − M = ' + f1(c.mM) + ' → d = ' + c.dTxt + ', 전향점 M_V = ' + f1(c.toM) + ', 나이 ' + c.ageTxt).join('<br>') + '</li><li>전향점이 높을수록(M_V가 작을수록) 젊은 성단이에요. 늙은 성단에는 전향점 위쪽에 <b>적색 거성</b>이 나타나요.</li><li>산개 성단: 별 수십~수천 개, 은하 원반, 젊은 별 많음. 구상 성단: 별 수만~수백만 개, 헤일로, 늙은 별 많음.</li></ul>',
      missions: [
        {
          title: '나이순으로 세우기', manual: true,
          goal: '전향점이 낮을수록 늙은 성단이에요. 그림 속 <b>A·B·C·D</b> 단추를 <b>젊은 성단부터</b> 차례로 누르세요.',
          hint: '전향점이 가장 높은(M_V가 가장 작은) 성단이 가장 젊어요: A의 전향점이 가장 높아요.',
          setup() { S.order = []; S.rowSel = -1; setView('compare'); },
          check: () => { if (S.order.length < 4) return '네 성단을 모두 눌러 순서를 정해 주세요.'; if (orderOK()) return true; return '전향점이 더 높은 성단이 더 젊어요. 순서를 다시 살펴보세요.'; },
          explain: '전향점의 M_V는 A −2.2 < B 0.6 < C 3.4 < D 5.1 순서예요(작을수록 높음). 그래서 나이는 <b>A &lt; B &lt; C &lt; D</b>: 1억 년 &lt; 6억 년 &lt; 40억 년 &lt; 120억 년이에요.',
        },
        {
          title: '거리 표 완성하기',
          goal: '표에서 성단을 눌러 선택하고, 그 성단의 m − M으로 <b>거리 d(pc)</b>를 계산해 <b>4개 모두</b> 입력하세요.',
          hint: 'd = 10^((m − M + 5)/5): A 138, B 48, C 871, D 약 7240 pc예요.',
          setup() { S.flags.calcCmp = true; S.rowSel = -1; S.dOk = [false, false, false, false]; clrIn('inDc'); setView('compare'); },
          check: () => S.dOk.every(Boolean), hold: 0.6,
          status: () => CL.map((c, i) => mark(S.dOk[i]) + ' ' + c.k).join(' &nbsp; '),
          explain: '거리는 A 138 pc, B 48 pc, C 871 pc, D 약 7.2 kpc예요. 구상 성단 D는 훨씬 멀리, 은하 헤일로에 있어요. 거리와 나이는 상관이 없어요. B는 A보다 가깝지만 더 늙었어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-cluster-cmd', mount: '#game', badge: '성단 탐사가', homeHref: '../../index.html#hu',
    featureLabels: { photo: '📸 성단 사진 · 분류', cmd: '🌟 별 재기 · C-M도', fit: '📏 표준 주계열 판 · m − M', age: '⏳ 전향점 · 나이 계산', compare: '📋 네 성단 겹치기 · 표' },
    onFeatures() { updateCtl(); },
    levels,
  });
  levels.forEach((lv) => { if (typeof lv.summary === 'function') lv.summary = lv.summary(); });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view, c = curC();
    if (v === 'photo') setReadouts(['분류한 사진', S.photo.filter((x) => x != null).length + ' / 4', '산개 성단으로 고름', S.photo.filter((x) => x === 0).length + '장', '구상 성단으로 고름', S.photo.filter((x) => x === 1).length + '장']);
    else if (v === 'cmd') { const ms = A.stars.filter((s, i) => S.meas[i] && S.meas[i].t >= 1); setReadouts(['측정한 별', ms.length + ' / ' + A.stars.length + '개', '가장 밝은 별 m_V', ms.length ? f1(Math.min(...ms.map((s) => s.m))) : '—', '가장 푸른 별 B − V', ms.length ? f2(Math.min(...ms.map((s) => s.bv))) : '—']); }
    else if (v === 'fit') setReadouts(['판을 민 양 m − M', f1(S.off) + ' 등급', '맞춤 오차 σ', f2(fitSigma(c)) + ' 등급', '성단 ' + c.k + '의 거리', FREE() || (S.flags.calcD && dOkNow() && c === A) ? c.dTxt : '직접 계산']);
    else if (v === 'age') setReadouts(['성단 ' + c.k + '의 m − M', f1(c.mM), '전향점 M_V', S.toDone[S.clus] ? f1(c.toM) : '?', '성단 나이', showT(S.clus) ? c.ageTxt : '?']);
    else if (v === 'aging') { const tyr = Math.pow(10, S.ageLog); setReadouts(['성단의 나이', sci(tyr, 1) + ' 년', '전향점의 질량', f1(massRound(tyr)) + ' M☉', '전향점 M_V', f1(toMvAt(tyr))]); }
    else setReadouts(['정한 순서', S.order.map((i) => CL[i].k).join(' → ') || '—', '완성한 거리 칸', S.dOk.filter(Boolean).length + ' / 4', '선택한 성단', S.rowSel >= 0 ? CL[S.rowSel].k : '—']);
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'photo': drawPhoto(dt, t); break;
      case 'cmd': drawCmd(dt, t); break;
      case 'fit': drawFit(dt, t); break;
      case 'age': drawAge(dt, t); break;
      case 'aging': drawAging(dt, t); break;
      default: drawCompare(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, CL, A, PHOTOS, HIT, measure, autoMeasure, measCount, cAxes, LYcmd, LYfit, LYcmp, cmpRow, fitSigma, toMvAt, selectRow, photoWrongList };
})();
