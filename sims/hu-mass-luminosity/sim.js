/* =========================================================
   행성우주과학 Ⅱ. 태양과 별의 관측 - 질량과 광도의 관계 (6차시)
   성취기준 [12행우02-04] 쌍성의 관측 자료를 이용하여 항성의 질량을 직접적으로 구할 수 있음을 이해하고, 질량-광도 관계를 이용하여 쌍성이 아닌 별의 질량을 구할 수 있다. (질량-광도 관계)
   ① 분석: 광도 계산 (L / L☉ = 10^(0.4 (4.83 − M_V)))
   ② 분석: 관계 찾기 (log M – log L 그래프, 기울기 ≈ 3.5, L ∝ M^3.5)
   ③ 적용: 질량 구하기 (단독 별 Y, Z: 거리 지수 → 광도 → 질량)
   ④ 설명: 별의 수명 (L = M^3.5, t ≈ 10^10 M^−2.5 년, 주계열 한정)
   다루지 않음: 핵융합 모델로 3.5 유도, 질량 범위별 지수 변화의 이론, 복사 에너지 수송.
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
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
  const f3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const clickable = (el, fn) => el.addEventListener('click', () => { Sound.click(); fn(el); });

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
  /* 안내 글 상자 */
  function note(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w - 24, size, 700), lh = size * FS * 1.32, h = lines.length * lh + 14;
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, 12).stroke(); }
    lines.forEach((l, i) => D.text(x + w / 2, y + 12 + size * FS * 0.8 + i * lh, l, { size, weight: 700, color: o.color || '#334155' }));
    return h;
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
  /* 태양 */
  function sunDraw(x, y, r) { D.glow(x, y, r * 3.2, '#ffd447', 0.5); D.sphere(x, y, r, '#ffb703', { gloss: true, light: '#fff3b0', dark: '#e07b00' }); }
  /* 작은 자료 표 한 칸 글자: 가운데 정렬 */
  const tc = (x, y, s, size, color, weight) => T(x, y, s, size, color, 'center', weight);

  /* 케플러 방정식 */
  function kepE(M, e) { let E = M + e * Math.sin(M); for (let i = 0; i < 14; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
  /* ---------- 공통 도우미 2 ---------- */
  const sup = (n) => String(n).split('').map((c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c])).join('');
  const sci = (x, d) => { if (!(x > 0)) return '0'; let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); const dd = d == null ? 1 : d; if (+m.toFixed(dd) >= 10) { m /= 10; e += 1; } return m.toFixed(dd) + '×10' + sup(e); };
  const outlineT = (x, y, s, size, color, align) => T(x, y, s, size, color || '#e2e8f0', align || 'left', 800, { stroke: 'rgba(5,10,30,.75)', strokeWidth: 4 });
  const near = (x, v, tol) => x != null && Math.abs(x - v) <= tol;
  const nearRel = (x, v, r) => x != null && Math.abs(x - v) <= Math.abs(v) * r;
  const fN = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  /* 흑체 복사 느낌의 별 색 (T: K) */
  function starColor(T_) {
    const t = clamp((T_ - 2500) / (7500 - 2500), 0, 1);
    const stops = [[0, [255, 120, 60]], [0.2, [255, 165, 90]], [0.45, [255, 210, 140]], [0.65, [255, 238, 205]], [0.8, [255, 250, 240]], [1, [215, 230, 255]]];
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const a = stops[i - 1], b = stops[i], k = (t - a[0]) / (b[0] - a[0]); return 'rgb(' + a[1].map((v, j) => Math.round(v + (b[1][j] - v) * k)).join(',') + ')'; }
    return 'rgb(215,230,255)';
  }
  /* 가로 막대 하나 (눈금 안에서만): 값 v를 [0, vmax] 눈금에 */
  function hbar(x, y, w, h, v, vmax, color) {
    const ww = clamp(v / vmax, 0, 1) * w;
    ctx.fillStyle = 'rgba(100,116,139,.12)'; rr(x, y, w, h, h / 2).fill();
    if (ww > 0.5) { ctx.save(); rr(x, y, w, h, h / 2); ctx.clip(); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(color, 0.25)); g.addColorStop(1, shade(color, -0.12)); ctx.fillStyle = g; ctx.fillRect(x, y, ww, h); ctx.restore(); }
  }
  /* 위치 이동하는 상태값 (여러 개의 부드러운 값) */
  const sm = (o, k, tgt, dt, rate) => { o[k] = approach(o[k], tgt, dt, rate || 10); return o[k]; };
  /* 가운데 정렬 안내 줄 */
  function chip(x, y, text, o) { o = o || {}; return D.label(x, y, text, Object.assign({ bg: '#1e293b', color: '#fff', size: 13 }, o)); }
  /* 숫자 굴러가기 표시용 */
  const roll = (cur, tgt, dt) => (RM ? tgt : (Math.abs(tgt - cur) < Math.abs(tgt) * 0.0005 ? tgt : cur + (tgt - cur) * (1 - Math.exp(-6 * dt))));
  /* 카드 눌림 효과 있는 사각 버튼 영역 판정 */
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  /* 시드 난수 */
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  initStage('#e8eef8', 800, 620, 480, 860, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 자료 ================= */
  const MSUN_MV = 4.83;
  const Lof = (Mv) => Math.pow(10, 0.4 * (MSUN_MV - Mv));
  const DATA = [[0.5, 7.6], [0.8, 5.5], [1.0, 4.8], [1.6, 3.2], [2.5, 1.2], [4.0, -0.3], [6.3, -2.3], [10, -3.9]].map((a, i) => ({ i, M: a[0], Mv: a[1], L: Lof(a[1]), lM: Math.log10(a[0]), lL: Math.log10(Lof(a[1])) }));
  const IDX12 = 4;                                    // M_V = 1.2인 별 (2.5 M☉)
  const fit = (function () {                           // 최소제곱 기울기
    const n = DATA.length, sx = DATA.reduce((a, d) => a + d.lM, 0), sy = DATA.reduce((a, d) => a + d.lL, 0), sxx = DATA.reduce((a, d) => a + d.lM * d.lM, 0), sxy = DATA.reduce((a, d) => a + d.lM * d.lL, 0);
    return { slope: (n * sxy - sx * sy) / (n * sxx - sx * sx) };
  })();
  const SLOPE = 3.5;                                  // 그리는 직선: L = M^3.5
  const REAL = [{ n: '시리우스 A', M: 2.06, L: 23, sub: '23 L☉' }, { n: '센타우루스 알파 A', M: 1.10, L: 1.5, sub: '1.5 L☉' }];
  const WD = { n: '시리우스 B (백색 왜성)', M: 1.02, L: 0.025, T: 25000 };
  const fL = (L) => (L < 1 ? String(+L.toPrecision(2)) : L < 10 ? (L < 1.5 ? f2(L) : f1(L)) : L < 1000 ? f0(L) : comma(Math.round(L / 100) * 100));
  const fLs = (L) => (L >= 1000 ? comma(Math.round(L / 10) * 10) : fL(L));
  const lbl = (x, y, s_, size, color, align) => T(x, y, s_, size, color, align || 'left', 800, { stroke: 'rgba(255,255,255,.92)', strokeWidth: 4 });
  const sg = (x, d) => (x < 0 ? '−' : '') + fN(Math.abs(x), d);   // 부호가 있는 숫자 (− 기호)
  const STAR_Y = { Mv: -0.2 }; STAR_Y.L = Lof(STAR_Y.Mv); STAR_Y.M = Math.pow(STAR_Y.L, 1 / 3.5);
  const STAR_Z = { m: 2.0, p: 0.05 }; STAR_Z.d = 1 / STAR_Z.p; STAR_Z.Mv = STAR_Z.m + 5 - 5 * Math.log10(STAR_Z.d); STAR_Z.L = Lof(STAR_Z.Mv); STAR_Z.M = Math.pow(STAR_Z.L, 1 / 3.5);
  const lifeOf = (M) => 1e10 * Math.pow(M, -2.5);     // 수명 (년)
  const Tof = (M) => 5772 * Math.pow(M, 0.475);       // 단순화한 표면 온도 (K)
  const Rof = (M) => Math.pow(M, 0.8);                // 단순화한 반지름 (R☉)

  /* ================= 상태 ================= */
  const S = {
    view: 'calc', fade: 0, clock: 0,
    ca: { sel: -1, rev: Array(8).fill(false), pop: Array(8).fill(0), l1Ok: false },
    pl: { sel: 0, placed: Array(8).fill(false), t: Array(8).fill(0), sx: Array(8).fill(0), sy: Array(8).fill(0), miss: 0, fit: 0, fitOn: false, lin: 0, linT: 0, picks: [], slopeOk: false, real: 0 },
    ap: { sel: 0, yL: false, yM: false, zd: false, zv: false, zl: false, zm: false, gY: 0, gZ: 0 },
    lf: { M: 1, tOk: false, sm: 1, shown: 1 },
    flags: { calcL: false, tools: false, slope: false, calcT: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const CA = S.ca, PL = S.pl, AP = S.ap, LF = S.lf;
  const VIEW_LABEL = { calc: '🔢 절대 등급 → 광도', plot: '📈 log M – log L 그래프', apply: '🎯 단독 별의 질량 구하기', life: '⏳ 질량과 수명 (주계열성)' };
  const modeBtns = $$('#modeSeg button');
  const lerpN = (a, b, t) => a + (b - a) * t;
  function chkIn(id, ok) { const e = $('#' + id); if (!e) return; if (ok) fbIn(id, true); else e.classList.remove('ok', 'bad'); }
  const ptsBurst = (x, y) => parts.burst(x, y, { count: 14, speed: 140, life: 0.7, size: 4, gravity: 200 });
  function darkBox(r, t) {
    D.shadow(() => { ctx.fillStyle = '#0b1230'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(r.x, r.y, r.w, r.h, 14); ctx.clip(); spaceBg(r.x, r.y, r.w, r.h, t, '#0b1230', '#16224a');
  }
  const allPlaced = () => PL.placed.every(Boolean);
  const fillPlaced = () => { DATA.forEach((d) => { if (!PL.placed[d.i]) { PL.placed[d.i] = true; PL.t[d.i] = 1; PL.sx[d.i] = 0; PL.sy[d.i] = 0; } }); PL.sel = -1; };
  const calcAllRev = () => CA.rev.every(Boolean);
  const yDone = () => AP.yL && AP.yM, zDone = () => AP.zd && AP.zv && AP.zl && AP.zm;

  /* ---------- 로그–로그 그래프 공통 ---------- */
  function lgGeom(R) {
    const ml = PHONE ? 50 : 58, mr = 18, mt = 40 * FS, mb = 48 * FS;
    const ix = R.x + ml, iw = R.w - ml - mr, top = R.y + mt, ph = R.h - mt - mb;
    return { R, ix, iw, top, ph, X: (lm) => ix + (lm + 0.4) / 1.6 * iw, Y: (ll) => top + (4 - ll) / 6 * ph, X2: (M) => ix + M / 10.5 * iw, Y2: (L) => top + ph * (1 - L / 3300) };
  }
  const lmOf = (g, x) => (x - g.ix) / g.iw * 1.6 - 0.4, llOf = (g, y) => 4 - (y - g.top) / g.ph * 6;
  const inBox = (g, p) => p.x >= g.ix - 6 && p.x <= g.ix + g.iw + 6 && p.y >= g.top - 6 && p.y <= g.top + g.ph + 6;
  /* 두 눈금(로그/선형)을 섞어 그리는 점 위치 */
  const ptXY = (g, M, L, mix) => [lerpN(g.X(Math.log10(M)), g.X2(M), mix), lerpN(g.Y(Math.log10(L)), g.Y2(L), mix)];
  function drawLgAxes(g, mix, titleX, titleY) {
    const R = g.R;
    ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(g.ix, g.top, g.iw, g.ph, 6).fill();
    const a1 = 1 - mix, a2 = mix;
    if (a1 > 0.02) {
      ctx.save(); ctx.globalAlpha = a1;
      [-2, -1, 0, 1, 2, 3, 4].forEach((v) => { ctx.strokeStyle = v === 0 ? '#94a3b8' : 'rgba(148,163,184,.4)'; ctx.lineWidth = v === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(g.ix, g.Y(v)); ctx.lineTo(g.ix + g.iw, g.Y(v)); ctx.stroke(); T(g.ix - 6, g.Y(v) + 4, v === 4 ? '10⁴' : v === 3 ? '1000' : v === 2 ? '100' : v === 1 ? '10' : v === 0 ? '1' : v === -1 ? '0.1' : '0.01', PHONE ? 10.5 : 11.5, '#64748b', 'right', 700); });
      [[0.5, -0.301], [1, 0], [2, 0.301], [5, 0.699], [10, 1]].forEach((q) => { ctx.strokeStyle = q[0] === 1 ? '#94a3b8' : 'rgba(148,163,184,.4)'; ctx.lineWidth = q[0] === 1 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(g.X(q[1]), g.top); ctx.lineTo(g.X(q[1]), g.top + g.ph); ctx.stroke(); T(g.X(q[1]), g.top + g.ph + 15 * FS, String(q[0]), 11.5, '#64748b', 'center', 700); });
      ctx.restore();
    }
    if (a2 > 0.02) {
      ctx.save(); ctx.globalAlpha = a2;
      [0, 1000, 2000, 3000].forEach((v) => { ctx.strokeStyle = 'rgba(148,163,184,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.ix, g.Y2(v)); ctx.lineTo(g.ix + g.iw, g.Y2(v)); ctx.stroke(); T(g.ix - 6, g.Y2(v) + 4, comma(v), PHONE ? 10.5 : 11.5, '#64748b', 'right', 700); });
      [0, 2, 4, 6, 8, 10].forEach((v) => { ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.beginPath(); ctx.moveTo(g.X2(v), g.top); ctx.lineTo(g.X2(v), g.top + g.ph); ctx.stroke(); T(g.X2(v), g.top + g.ph + 15 * FS, String(v), 11.5, '#64748b', 'center', 700); });
      ctx.restore();
    }
    T(g.ix + g.iw / 2, g.top + g.ph + 33 * FS, titleX || ('질량 M (M☉, ' + (mix < 0.5 ? '로그' : '선형') + ' 눈금)'), PHONE ? 11.5 : 12.5, '#475569', 'center', 800);
    ctx.save(); ctx.translate(R.x + 13, g.top + g.ph / 2); ctx.rotate(-Math.PI / 2); T(0, 0, titleY || ('광도 L (L☉, ' + (mix < 0.5 ? '로그' : '선형') + ' 눈금)'), PHONE ? 11.5 : 12.5, '#475569', 'center', 800); ctx.restore();
  }
  function fitCurve(g, mix, prog) {                   // L = M^3.5 직선(로그) / 곡선(선형)
    const pts = [], n = 80;
    for (let i = 0; i <= n; i++) { const lm = -0.4 + 1.6 * (i / n) * prog; const M = Math.pow(10, lm), L = Math.pow(M, SLOPE); const q = ptXY(g, M, L, mix); pts.push(q); }
    return pts;
  }

  /* =========================================================
     ① 광도 계산
     ========================================================= */
  function LCa() {
    return PHONE ? { T: { x: 8, y: 8, w: 464, h: 392 }, F: { x: 8, y: 408, w: 464, h: 208 }, R: { x: 8, y: 624, w: 464, h: 228 } }
      : { T: { x: 10, y: 8, w: 470, h: 396 }, F: { x: 10, y: 412, w: 470, h: 200 }, R: { x: 488, y: 8, w: 302, h: 604 } };
  }
  const caRowRect = (i) => { const { T: Tr } = LCa(); const rh = PHONE ? 38 : 38, y0 = Tr.y + (PHONE ? 72 : 66); return { x: Tr.x + 8, y: y0 + i * (rh + 2), w: Tr.w - 16, h: rh }; };
  function revealRow(i) {
    if (i === IDX12 && !CA.l1Ok && !FREE()) { say('이 줄(M_V = 1.2)은 미션에서 직접 계산해 보세요.', true, 2.4); return; }
    if (!CA.rev[i]) { CA.rev[i] = true; CA.pop[i] = 1; const r = caRowRect(i); ptsBurst(r.x + r.w - 60, r.y + r.h / 2); Sound.click(); }
  }
  function drawCalc(dt, t) {
    const { T: Tr, F, R } = LCa();
    panel(Tr.x, Tr.y, Tr.w, Tr.h, { r: 14 });
    T(Tr.x + 14, Tr.y + 24 * FS, '📋 쌍성에서 구한 주계열성 8개', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const w = Tr.w - 24, fr = [0.1, 0.24, 0.27, 0.39]; let cx0 = Tr.x + 12; const cols = fr.map((k) => { const c = { x: cx0, w: w * k }; cx0 += w * k; return c; });
    ['', '질량 M (M☉)', '절대 등급 M_V', '광도 L (L☉)'].forEach((h, i) => T(cols[i].x + cols[i].w / 2, Tr.y + (PHONE ? 62 : 52) * (PHONE ? 1 : FS), h, PHONE ? 11.5 : 12.5, '#475569', 'center', 800));
    DATA.forEach((d, i) => {
      const r = caRowRect(i), sel = CA.sel === i; CA.pop[i] = approach(CA.pop[i], 0, dt, 4);
      ctx.fillStyle = CA.rev[i] ? '#ecfdf3' : sel ? '#fff7e0' : '#f8fafc'; rr(r.x, r.y, r.w, r.h, 9).fill();
      ctx.strokeStyle = sel ? '#f59e0b' : CA.rev[i] ? '#86efac' : '#e2e8f0'; ctx.lineWidth = sel ? 3 : 1.4; rr(r.x, r.y, r.w, r.h, 9).stroke();
      if (CA.pop[i] > 0.02) { ctx.strokeStyle = rgba('#14a058', CA.pop[i]); ctx.lineWidth = 4; rr(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 11).stroke(); }
      const cy = r.y + r.h / 2 + 5, sr = 5 + 6 * Math.pow(d.M, 0.35);
      D.sphere(cols[0].x + cols[0].w / 2, r.y + r.h / 2, Math.min(11, sr), starColor(Tof(d.M)), { gloss: false });
      T(cols[1].x + cols[1].w / 2, cy, f1(d.M), PHONE ? 13 : 14.5, '#1e293b', 'center', 800);
      T(cols[2].x + cols[2].w / 2, cy, sg(d.Mv, 1), PHONE ? 13 : 14.5, '#1e293b', 'center', 800);
      const shown = CA.rev[i] || FREE();
      const lock = i === IDX12 && !CA.l1Ok && !FREE();
      T(cols[3].x + cols[3].w / 2, cy, shown ? fL(d.L) : lock ? '미션에서 계산' : '눌러서 계산', shown ? (PHONE ? 14 : 15.5) : (PHONE ? 11.5 : 12.5), shown ? '#15803d' : '#94a3b8', 'center', 800);
    });
    // ---- 계산 과정
    panel(F.x, F.y, F.w, F.h, { r: 14 });
    T(F.x + 14, F.y + 24 * FS, '🧮 L / L☉ = 10^(0.4 × (4.83 − M_V))', PHONE ? 13 : 14.5, '#0369a1', 'left', 800);
    const d = CA.sel >= 0 ? DATA[CA.sel] : null;
    if (d && (CA.rev[d.i] || FREE())) {
      const dM = MSUN_MV - d.Mv, e = 0.4 * dM, sz = PHONE ? 13 : 14.5, ly = PHONE ? 30 : 36;
      T(F.x + 16, F.y + 56 * FS, '① 태양(4.83)과의 등급 차  ΔM = 4.83 − (' + sg(d.Mv, 1) + ') = ' + sg(dM, 2), sz, '#334155', 'left', 800);
      T(F.x + 16, F.y + 56 * FS + ly, '② 지수  0.4 × ΔM = ' + sg(e, 3), sz, '#334155', 'left', 800);
      T(F.x + 16, F.y + 56 * FS + ly * 2, '③ L = 10^(' + sg(e, 3) + ') = ' + fL(d.L) + ' L☉', sz + 1, '#15803d', 'left', 800);
      T(F.x + 16, F.y + 56 * FS + ly * 3, d.L >= 1 ? '태양보다 ' + fL(d.L) + '배 밝아요 (M = ' + f1(d.M) + ' M☉)' : '태양의 ' + fL(d.L) + '배 밝기예요 (M = ' + f1(d.M) + ' M☉)', PHONE ? 12 : 13, '#b45309', 'left', 800);
    } else drawWrap(F.x + 16, F.y + 56 * FS, d ? '이 줄은 아직 계산하지 않았어요. 줄을 다시 눌러 보세요.' : '표의 줄을 눌러 한 별씩 광도를 계산해요. 절대 등급이 5 작아질 때마다 광도는 100배가 돼요(1등급 = 2.512배).', F.w - 32, PHONE ? 13 : 14, { color: '#64748b' });
    // ---- 등급 사다리
    panel(R.x, R.y, R.w, R.h, { r: 14 });
    T(R.x + 14, R.y + 24 * FS, '📏 등급 사다리', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const ax = R.x + (PHONE ? 70 : 66), top = R.y + 44 * FS, bot = R.y + R.h - 20 * FS, Yy = (mv) => top + (mv + 5) / 15 * (bot - top);
    const gr = ctx.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, '#fde68a'); gr.addColorStop(1, '#1e293b'); ctx.fillStyle = gr; rr(ax, top, 14, bot - top, 6).fill();
    for (let mv = -5; mv <= 10; mv++) { const y = Yy(mv); ctx.strokeStyle = '#475569'; ctx.lineWidth = mv % 5 === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(ax - (mv % 5 === 0 ? 8 : 4), y); ctx.lineTo(ax, y); ctx.stroke(); if (mv % 5 === 0) T(ax - 11, y + 4, sg(mv, 0), 12, '#475569', 'right', 800); }
    T(ax + 7, top - 6, '밝음', 11, '#b45309', 'center', 800); T(ax + 7, bot + 14, '어두움', 11, '#64748b', 'center', 800);
    // 5등급 = 100배 괄호
    const bx = R.x + R.w - 26;
    const brk = (mvA, mvB, txt) => { const y1 = Yy(mvA), y2 = Yy(mvB); ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx - 8, y1); ctx.lineTo(bx, y1); ctx.lineTo(bx, y2); ctx.lineTo(bx - 8, y2); ctx.stroke(); ctx.save(); ctx.translate(bx - 7, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2); T(0, -2, txt, PHONE ? 11 : 12, '#0369a1', 'center', 800); ctx.restore(); };
    brk(MSUN_MV - 5, MSUN_MV, PHONE ? '×100' : '5등급 위 = ×100'); brk(MSUN_MV, MSUN_MV + 5, PHONE ? '×1/100' : '5등급 아래 = ×1/100');
    // 태양 · 선택한 별 표시
    let ySun = Yy(MSUN_MV), yStar = d ? Yy(d.Mv) : null;
    D.sphere(ax + 7, ySun, 8, '#ffb703', { gloss: false });
    let ysl = ySun, ystl = yStar;
    if (yStar != null && Math.abs(yStar - ySun) < 20) { if (yStar >= ySun) { ystl = ySun + 20; } else { ystl = ySun - 20; } }
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax + 14, ySun); ctx.lineTo(ax + 40, ysl); ctx.stroke(); ctx.setLineDash([]);
    T(ax + 44, ysl + 4, '태양 4.83 (L = 1)', PHONE ? 11.5 : 12.5, '#b45309', 'left', 800);
    if (d) {
      D.sphere(ax + 7, yStar, 8, starColor(Tof(d.M)), { gloss: false, outline: '#334155' });
      ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(ax + 14, yStar); ctx.lineTo(ax + 40, ystl); ctx.stroke(); ctx.setLineDash([]);
      T(ax + 44, ystl + 4, 'M_V ' + sg(d.Mv, 1) + (CA.rev[d.i] || FREE() ? ' → ' + fL(d.L) + ' L☉' : ''), PHONE ? 11.5 : 12.5, '#1e293b', 'left', 800);
    } else drawWrap(ax + 44, R.y + 70 * FS, '줄을 누르면 그 별의 자리가 사다리에 나타나요.', R.w - (ax - R.x) - 90, 12.5, { color: '#64748b' });
  }
  function caDown(p) { for (let i = 0; i < 8; i++) { if (inR(p, caRowRect(i))) { CA.sel = i; revealRow(i); updateCtl(); return false; } } return false; }

  /* =========================================================
     ② 관계 찾기 (로그–로그 그래프)
     ========================================================= */
  function LPl() { return PHONE ? { G: { x: 8, y: 8, w: 464, h: 520 }, R: { x: 8, y: 536, w: 464, h: 316 } } : { G: { x: 10, y: 8, w: 510, h: 604 }, R: { x: 528, y: 8, w: 262, h: 604 } }; }
  const plRowRect = (i) => {
    const { R } = LPl();
    if (PHONE) { const cw = (R.w - 24 - 8) / 2, ch = 58; return { x: R.x + 12 + (i % 2) * (cw + 8), y: R.y + 40 * FS + Math.floor(i / 2) * (ch + 6), w: cw, h: ch }; }
    return { x: R.x + 10, y: R.y + 44 * FS + i * 54, w: R.w - 20, h: 48 };
  };
  function plPlace(i, p) {
    const g = lgGeom(LPl().G), d = DATA[i];
    const tx = g.X(d.lM), ty = g.Y(d.lL);
    const okx = Math.abs(p.x - tx) <= g.iw * 0.095 / 1.6, oky = Math.abs(p.y - ty) <= g.ph * 0.3 / 6;
    if (okx && oky) {
      PL.placed[i] = true; PL.t[i] = 0; PL.sx[i] = p.x; PL.sy[i] = p.y; PL.miss = 0; ptsBurst(tx, ty); Sound.click();
      const nx = DATA.findIndex((q) => !PL.placed[q.i]); PL.sel = nx;
      if (nx < 0) { say('점 8개를 모두 찍었어요! 점들이 한 줄로 늘어서요.', false, 3); showHint('점이 거의 직선 위에 놓였어요.', 3000); }
      updateCtl();
    } else {
      PL.miss++; Sound.wrong && Sound.wrong();
      say(okx ? '세로 자리(log L)가 달라요. 오른쪽 표의 log L 값을 다시 확인해요.' : oky ? '가로 자리(log M)가 달라요. log M 값의 위치를 확인해요.' : '자리가 달라요. log M(가로)과 log L(세로)을 눈금에서 찾아보세요.', true, 2.6);
    }
  }
  function plSlope() {
    if (PL.picks.length < 2) return null;
    const a = DATA[PL.picks[0]], b = DATA[PL.picks[1]], lo = a.lM <= b.lM ? a : b, hi = lo === a ? b : a;
    return { lo, hi, dM: hi.lM - lo.lM, dL: hi.lL - lo.lL, s: (hi.lL - lo.lL) / (hi.lM - lo.lM) };
  }
  function drawPlot(dt, t) {
    const { G, R } = LPl(), g = lgGeom(G);
    PL.lin = approach(PL.lin, PL.linT, dt, 4); PL.fit = approach(PL.fit, PL.fitOn ? 1 : 0, dt, 2.2); PL.real = approach(PL.real, PL.fitOn ? 1 : 0, dt, 2);
    panel(G.x, G.y, G.w, G.h, { r: 14 });
    T(G.x + 14, G.y + 24 * FS, PL.linT ? '📉 같은 자료를 선형 눈금으로 그리면' : '📈 질량 – 광도 (로그 눈금 그래프)', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    drawLgAxes(g, PL.lin);
    ctx.save(); rr(g.ix, g.top, g.iw, g.ph, 6); ctx.clip();
    // 점
    if (PL.fit > 0.01) { const pts = fitCurve(g, PL.lin, PL.fit); line(pts, '#ea580c', 3.2, { alpha: 0.95 }); }
    DATA.forEach((d) => {
      if (!PL.placed[d.i]) return;
      PL.t[d.i] = approach(PL.t[d.i], 1, dt, 9);
      const q = ptXY(g, d.M, d.L, PL.lin), tt = PL.t[d.i], x = lerpN(PL.sx[d.i], q[0], tt), y = lerpN(PL.sy[d.i], q[1], tt);
      D.glow(x, y, 16, '#38bdf8', 0.4); D.sphere(x, y, 6.5, '#0ea5e9', { gloss: false, outline: '#075985', outlineWidth: 1.5 });
      if (PL.picks.includes(d.i)) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke(); }
    });
    // 실제 별 (직선에서 조금 벗어난 값)
    if (PL.real > 0.02 && PL.lin < 0.2) {
      ctx.save(); ctx.globalAlpha = PL.real * (1 - PL.lin);
      REAL.concat([{ n: WD.n, M: WD.M, L: WD.L, wd: true }]).forEach((r) => {
        const q = ptXY(g, r.M, r.L, 0); ctx.strokeStyle = r.wd ? '#7c3aed' : '#16a34a'; ctx.lineWidth = 2.4; ctx.strokeRect(q[0] - 6, q[1] - 6, 12, 12);
        lbl(q[0] + 10, q[1] + 4, r.n, PHONE ? 10.5 : 11.5, r.wd ? '#6d28d9' : '#166534', 'left');
      });
      ctx.restore();
    }
    // 정답 위치 안내 (두 번 틀리면)
    if (!allPlaced() && PL.miss >= 2 && PL.sel >= 0 && PL.lin < 0.05) { const d = DATA[PL.sel], x = g.X(d.lM), y = g.Y(d.lL); ctx.strokeStyle = rgba('#f59e0b', 0.6 + 0.4 * Math.sin(t * 6)); ctx.lineWidth = 3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    // 기울기 삼각형
    const sl = plSlope();
    if (sl && PL.lin < 0.05) {
      const x1 = g.X(sl.lo.lM), y1 = g.Y(sl.lo.lL), x2 = g.X(sl.hi.lM), y2 = g.Y(sl.hi.lL);
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.6; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    if (sl && PL.lin < 0.05) {
      const x1 = g.X(sl.lo.lM), y1 = g.Y(sl.lo.lL), x2 = g.X(sl.hi.lM), y2 = g.Y(sl.hi.lL);
      D.label((x1 + x2) / 2, y1 + 16, 'Δlog M = ' + f2(sl.dM), { bg: '#7c3aed', size: PHONE ? 11 : 12, pad: 6 });
      D.label(x2 - 6, (y1 + y2) / 2, 'Δlog L = ' + f2(sl.dL), { bg: '#7c3aed', size: PHONE ? 11 : 12, pad: 6, align: 'right' });
      D.label(g.ix + g.iw / 2, g.top + 18, '기울기 = ' + f2(sl.dL) + ' / ' + f2(sl.dM) + ' = ' + f2(sl.s), { bg: '#4c1d95', size: PHONE ? 12 : 13.5 });
    }
    if (PL.fit > 0.5 && PL.lin < 0.1) D.label(g.ix + g.iw * 0.28, g.top + g.ph * 0.78, '직선 기울기 ≈ 3.5 → L ∝ M^3.5', { bg: '#c2410c', size: PHONE ? 12 : 13.5 });
    if (PL.lin > 0.9) drawWrap(g.ix + 14, g.top + 14 + 10 * FS, '선형 눈금에서는 점이 왼쪽 아래에 몰리고 곡선이에요. 관계를 한눈에 알아보기 어려워요.', g.iw * 0.62, PHONE ? 12 : 13, { color: '#b45309', weight: 800 });
    // ---- 별 목록
    panel(R.x, R.y, R.w, R.h, { r: 14 });
    T(R.x + 14, R.y + 24 * FS, '⭐ 별 고르고 점 찍기', PHONE ? 13 : 14, '#1e293b', 'left', 800);
    DATA.forEach((d) => {
      const r = plRowRect(d.i), sel = PL.sel === d.i, done = PL.placed[d.i];
      ctx.fillStyle = done ? '#ecfdf3' : sel ? '#fff7e0' : '#f8fafc'; rr(r.x, r.y, r.w, r.h, 9).fill();
      ctx.strokeStyle = sel ? '#f59e0b' : done ? '#86efac' : '#e2e8f0'; ctx.lineWidth = sel ? 3 : 1.4; rr(r.x, r.y, r.w, r.h, 9).stroke();
      T(r.x + 10, r.y + 20 * Math.min(FS, 1.15), (done ? '● ' : '○ ') + 'M = ' + f1(d.M) + ' M☉', PHONE ? 12.5 : 13.5, done ? '#15803d' : '#1e293b', 'left', 800);
      T(r.x + 10, r.y + r.h - 9, 'log M ' + sg(d.lM, 2) + ' · log L ' + sg(d.lL, 2), PHONE ? 11 : 11.5, '#475569', 'left', 700);
    });
    if (!PHONE) { const n = PL.placed.filter(Boolean).length; T(R.x + R.w / 2, R.y + R.h - 14, '찍은 점 ' + n + ' / 8', 13.5, n === 8 ? '#15803d' : '#b45309', 'center', 800); }
  }
  function plDown(p) {
    const g = lgGeom(LPl().G);
    for (let i = 0; i < 8; i++) if (inR(p, plRowRect(i))) { if (!PL.placed[i]) { PL.sel = i; PL.miss = 0; Sound.click(); updateCtl(); } return false; }
    if (!inBox(g, p) || PL.lin > 0.3) return false;
    if (!allPlaced()) { if (PL.sel >= 0 && !PL.placed[PL.sel]) plPlace(PL.sel, p); else say('먼저 오른쪽 목록에서 아직 찍지 않은 별을 골라요.', true, 2.4); return false; }
    let best = -1, bd = 22;
    DATA.forEach((d) => { const dd = Math.hypot(p.x - g.X(d.lM), p.y - g.Y(d.lL)); if (dd < bd) { bd = dd; best = d.i; } });
    if (best >= 0) { const k = PL.picks.indexOf(best); if (k >= 0) PL.picks.splice(k, 1); else { PL.picks.push(best); if (PL.picks.length > 2) PL.picks.shift(); } Sound.click(); updateCtl(); }
    return false;
  }

  /* =========================================================
     ③ 질량 구하기
     ========================================================= */
  function LAp() { return PHONE ? { G: { x: 8, y: 8, w: 464, h: 376 }, Y: { x: 8, y: 392, w: 464, h: 152 }, Z: { x: 8, y: 552, w: 464, h: 300 } } : { G: { x: 10, y: 8, w: 470, h: 604 }, Y: { x: 488, y: 8, w: 302, h: 230 }, Z: { x: 488, y: 246, w: 302, h: 366 } }; }
  function guide(g, lL, prog, color, lblM) {            // 가로 → 세로 안내선
    const lm = lL / SLOPE, x0 = g.ix, y0 = g.Y(lL), x1 = g.X(lm), y2 = g.top + g.ph;
    const p1 = clamp(prog * 2, 0, 1), p2 = clamp(prog * 2 - 1, 0, 1);
    ctx.save(); rr(g.ix - 2, g.top - 2, g.iw + 4, g.ph + 4, 6); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerpN(x0, x1, p1), y0); ctx.stroke();
    if (p2 > 0) { ctx.beginPath(); ctx.moveTo(x1, y0); ctx.lineTo(x1, lerpN(y0, y2, p2)); ctx.stroke(); }
    ctx.setLineDash([]); ctx.restore();
    if (p1 >= 1) D.sphere(x1, y0, 7, color, { gloss: false, outline: '#fff' });
    if (p2 >= 1) { D.arrow(x1, y2 - 22, x1, y2 - 2, { color, width: 3, head: 9 }); D.label(clamp(x1, g.ix + 40, g.ix + g.iw - 40), y2 - 34, 'M ≈ ' + lblM + ' M☉', { bg: color, size: PHONE ? 12 : 13 }); }
  }
  function drawApply(dt, t) {
    const { G, Y: Yc, Z: Zc } = LAp(), g = lgGeom(G);
    AP.gY = approach(AP.gY, yDone() ? 1 : AP.yL ? 0.5 : 0, dt, 1.6); AP.gZ = approach(AP.gZ, zDone() ? 1 : AP.zl ? 0.5 : 0, dt, 1.6);
    panel(G.x, G.y, G.w, G.h, { r: 14 });
    T(G.x + 14, G.y + 24 * FS, '📈 질량-광도 관계로 질량 읽기', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    drawLgAxes(g, 0);
    ctx.save(); rr(g.ix, g.top, g.iw, g.ph, 6); ctx.clip();
    line(fitCurve(g, 0, 1), '#ea580c', 3.2);
    DATA.forEach((d) => { const q = ptXY(g, d.M, d.L, 0); D.sphere(q[0], q[1], 4.5, '#7dd3fc', { gloss: false, outline: '#0369a1', outlineWidth: 1 }); });
    ctx.restore();
    D.label(g.ix + g.iw * 0.3, g.top + g.ph * 0.8, 'L = M^3.5 (L☉, M☉)', { bg: '#c2410c', size: PHONE ? 11.5 : 12.5 });
    if (AP.yL || FREE()) guide(g, Math.log10(STAR_Y.L), AP.gY, '#7c3aed', AP.yM || FREE() ? f1(STAR_Y.M) : '?');
    if (AP.zl || FREE()) guide(g, Math.log10(STAR_Z.L), AP.gZ, '#0f766e', AP.zm || FREE() ? f1(STAR_Z.M) : '?');
    // ---- 별 Y
    const sm = PHONE ? 12 : 13.5;
    panel(Yc.x, Yc.y, Yc.w, Yc.h, { r: 14, line: AP.sel === 0 ? '#7c3aed' : null });
    T(Yc.x + 14, Yc.y + 24 * FS, '⭐ 별 Y  (단독 주계열성)', PHONE ? 13 : 14.5, '#6d28d9', 'left', 800);
    let yy = Yc.y + 50 * FS;
    const rowT = (x, y, w, lab, val, ok) => { T(x, y, lab, sm, '#475569', 'left', 800); T(x + w, y, val, sm + 1, ok ? '#15803d' : '#94a3b8', 'right', 800); };
    rowT(Yc.x + 14, yy, Yc.w - 28, '관측한 절대 등급 M_V', sg(STAR_Y.Mv, 1), true); yy += 28 * FS;
    rowT(Yc.x + 14, yy, Yc.w - 28, '광도 L = 10^(0.4 × (4.83 − M_V))', AP.yL || FREE() ? f0(STAR_Y.L) + ' L☉' : '?', AP.yL || FREE()); yy += 28 * FS;
    rowT(Yc.x + 14, yy, Yc.w - 28, '질량 M = L^(1/3.5)', AP.yM || FREE() ? f1(STAR_Y.M) + ' M☉' : '?', AP.yM || FREE());
    // ---- 별 Z
    panel(Zc.x, Zc.y, Zc.w, Zc.h, { r: 14, line: AP.sel === 1 ? '#0f766e' : null });
    T(Zc.x + 14, Zc.y + 24 * FS, '⭐ 별 Z  (m, 연주시차 p를 관측)', PHONE ? 13 : 14.5, '#0f766e', 'left', 800);
    yy = Zc.y + 50 * FS;
    rowT(Zc.x + 14, yy, Zc.w - 28, '겉보기 등급 m · 시차 p', 'm = ' + f1(STAR_Z.m) + ',  p = ' + f2(STAR_Z.p) + '″', true); yy += 30 * FS;
    const ch = [['① 거리 d = 1 / p', AP.zd, f0(STAR_Z.d) + ' pc'], ['② M_V = m + 5 − 5 log d', AP.zv, f1(STAR_Z.Mv)], ['③ 광도 L', AP.zl, f0(STAR_Z.L) + ' L☉'], ['④ 질량 M = L^(1/3.5)', AP.zm, f1(STAR_Z.M) + ' M☉']];
    const bw = Zc.w - 28, bh = PHONE ? 40 : 56;
    ch.forEach((c, i) => {
      const ok = c[1] || FREE(), y0 = yy + i * (bh + (PHONE ? 4 : 10));
      ctx.fillStyle = ok ? '#ecfdf3' : '#f1f5f9'; rr(Zc.x + 14, y0, bw, bh, 10).fill(); ctx.strokeStyle = ok ? '#86efac' : '#cbd5e1'; ctx.lineWidth = 1.5; rr(Zc.x + 14, y0, bw, bh, 10).stroke();
      T(Zc.x + 24, y0 + bh / 2 + 5, c[0], PHONE ? 11.5 : 12.5, '#334155', 'left', 800); T(Zc.x + 14 + bw - 10, y0 + bh / 2 + 5, ok ? c[2] : '?', PHONE ? 13 : 15, ok ? '#15803d' : '#94a3b8', 'right', 800);
      if (i < 3 && !PHONE) T(Zc.x + Zc.w / 2, y0 + bh + 9, '▼', 11, '#94a3b8', 'center', 800);
    });
  }

  /* =========================================================
     ④ 별의 수명
     ========================================================= */
  function LLf() { return PHONE ? { S: { x: 8, y: 8, w: 464, h: 256 }, H: { x: 8, y: 272, w: 464, h: 296 }, B: { x: 8, y: 576, w: 464, h: 276 } } : { S: { x: 10, y: 8, w: 380, h: 300 }, H: { x: 398, y: 8, w: 392, h: 300 }, B: { x: 10, y: 316, w: 780, h: 296 } }; }
  function drawLife(dt, t) {
    const { S: Sr, H, B } = LLf();
    LF.sm = approach(LF.sm, LF.M, dt, 9);
    const M = Math.abs(LF.sm - LF.M) < 0.005 ? LF.M : LF.sm, Lm = Math.pow(M, 3.5), Tm = Tof(M), Rm = Rof(M), tm = lifeOf(M);
    // ---- 별 그림
    darkBox(Sr, t);
    const cx = Sr.x + Sr.w * 0.62, cy = Sr.y + Sr.h / 2 + 8, rpx = clamp(16 + 11 * Math.sqrt(Rm), 16, 62), col = starColor(Tm);
    const glowR = rpx * (1.8 + 0.35 * Math.log10(1 + Lm));
    D.glow(cx, cy, glowR, col, 0.55); D.sphere(cx, cy, rpx, col, { gloss: false, light: '#ffffff', dark: mixc(col, '#7c2d12', 0.35) });
    const sx = Sr.x + 58, sr = clamp(16 + 11, 16, 62);
    D.glow(sx, cy, sr * 2, '#ffd447', 0.4); D.sphere(sx, cy, sr, '#ffb703', { gloss: false, light: '#fff3b0', dark: '#e07b00' });
    outlineT(sx, cy + sr + 20, '태양 (1 M☉)', 12, '#fde68a', 'center'); outlineT(cx, cy + clamp(rpx, 16, 62) + 20, f1(M) + ' M☉', 13, '#e2e8f0', 'center');
    ctx.restore();
    outlineT(Sr.x + 14, Sr.y + 24 * FS, '⭐ 질량에 따른 별 (단순화한 모형)', PHONE ? 12 : 13.5, '#e2e8f0', 'left');
    outlineT(Sr.x + Sr.w - 12, Sr.y + 44 * FS, 'R ≈ M^0.8, T = 약 ' + comma(Math.round(Tm / 100) * 100) + ' K', 11.5, '#93a4c3', 'right');
    // ---- H-R도
    panel(H.x, H.y, H.w, H.h, { r: 14 });
    T(H.x + 14, H.y + 24 * FS, '🌈 H-R도 위의 주계열', PHONE ? 13 : 14, '#1e293b', 'left', 800);
    const ix = H.x + 54, iw = H.w - 54 - 16, top = H.y + 38 * FS, ph = H.h - 38 * FS - 44 * FS;
    const HX = (T_) => ix + (Math.log10(40000) - Math.log10(T_)) / (Math.log10(40000) - Math.log10(2500)) * iw, HY = (L_) => top + (6 - Math.log10(L_)) / 8 * ph;
    ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(ix, top, iw, ph, 6).fill();
    [-2, 0, 2, 4, 6].forEach((v) => { ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ix, HY(Math.pow(10, v))); ctx.lineTo(ix + iw, HY(Math.pow(10, v))); ctx.stroke(); T(ix - 6, HY(Math.pow(10, v)) + 4, v === 0 ? '1' : v === 2 ? '100' : v === 4 ? '10⁴' : v === 6 ? '10⁶' : '0.01', 11, '#64748b', 'right', 700); });
    [30000, 10000, 6000, 4000].forEach((v) => { ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.beginPath(); ctx.moveTo(HX(v), top); ctx.lineTo(HX(v), top + ph); ctx.stroke(); T(HX(v), top + ph + 14 * FS, comma(v), 10.5, '#64748b', 'center', 700); });
    T(ix + iw / 2, top + ph + 30 * FS, '표면 온도 T (K) · 왼쪽이 뜨거워요', 11.5, '#475569', 'center', 800);
    ctx.save(); ctx.translate(H.x + 13, top + ph / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '광도 L (L☉)', 11.5, '#475569', 'center', 800); ctx.restore();
    ctx.save(); rr(ix, top, iw, ph, 6); ctx.clip();
    const ms = []; for (let i = 0; i <= 40; i++) { const mm = 0.4 * Math.pow(30 / 0.4, i / 40); ms.push([HX(Tof(mm)), HY(Math.pow(mm, 3.5))]); }
    line(ms, 'rgba(37,99,235,.55)', 9, { alpha: 0.35 }); line(ms, '#2563eb', 2.4);
    D.sphere(HX(5772), HY(1), 5, '#ffb703', { gloss: false }); lbl(HX(5772) + 8, HY(1) + 16, '태양', 11.5, '#92400e', 'left');
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.4; ctx.strokeRect(HX(WD.T) - 6, HY(WD.L) - 6, 12, 12);
    lbl(HX(WD.T) + 10, HY(WD.L) + 4, '시리우스 B (백색 왜성)', 11, '#6d28d9', 'left');
    D.glow(HX(Tm), HY(Lm), 22, col, 0.6); D.sphere(HX(Tm), HY(Lm), 7.5, col, { gloss: false, outline: '#0f172a', outlineWidth: 1.6 });
    ctx.restore();
    // ---- 막대
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '⚖ 태양과 비교 (가운데 선 = 태양, 막대 눈금은 10배씩)', PHONE ? 12 : 14, '#1e293b', 'left', 800);
    const rows = [
      ['연료 (질량) M', M, '#16a34a', f1(M) + ' M☉', '태양의 ×' + fL(M)],
      ['소모 속도 (광도) L', Lm, '#dc2626', fLs(Lm) + ' L☉', '태양의 ×' + fLs(Lm)],
      ['수명 t = 연료 / 소모', tm / 1e10, '#2563eb', sci(tm, 1) + ' 년', (tm / 1e10 >= 1 ? '태양의 ×' + fL(tm / 1e10) : '태양의 약 1/' + fL(1e10 / tm))],
    ];
    const lx = B.x + (PHONE ? 14 : 16), barX = B.x + (PHONE ? 14 : 190), barW = B.w - (PHONE ? 28 : 190 + 190), zero = barX + barW * 4 / 9, unit = barW / 9;
    rows.forEach((r, i) => {
      const y0 = B.y + (PHONE ? 52 : 52) * FS + i * (PHONE ? 66 : 70) * (PHONE ? 1 : 1);
      T(lx, y0 - (PHONE ? 6 : -16), r[0], PHONE ? 12.5 : 14, '#334155', 'left', 800);
      const by = PHONE ? y0 + 6 : y0 + 2, bh = 20, lv = clamp(Math.log10(r[1]), -4, 5), x2 = zero + lv * unit;
      ctx.fillStyle = 'rgba(100,116,139,.12)'; rr(barX, by, barW, bh, 10).fill();
      ctx.save(); rr(barX, by, barW, bh, 10); ctx.clip(); ctx.fillStyle = r[2]; ctx.fillRect(Math.min(zero, x2), by, Math.abs(x2 - zero), bh); ctx.restore();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(zero, by - 4); ctx.lineTo(zero, by + bh + 4); ctx.stroke();
      if (PHONE) T(B.x + B.w - 14, y0 - 6, r[3] + ' · ' + r[4], 11.5, '#1e293b', 'right', 800);
      else { T(barX + barW + 12, by + 10, r[3], 14, '#1e293b', 'left', 800); T(barX + barW + 12, by + 28, r[4], 12, '#64748b', 'left', 800); }
    });
    // 눈금 글자
    const lastBy = B.y + 52 * FS + 2 * (PHONE ? 66 : 70) + (PHONE ? 6 : 2), axY = lastBy + 20 + 18;
    [-4, -2, 0, 2, 4].forEach((v) => T(zero + v * unit, axY, v === 0 ? '태양 ×1' : '×' + (v < 0 ? '10' + sup(v) : comma(Math.pow(10, v))), PHONE ? 10.5 : 11.5, '#64748b', 'center', 700));
    if (!PHONE || true) T(B.x + B.w / 2, B.y + B.h - 4 * FS - (PHONE ? 4 : 0), '연료는 M배인데 소모는 M^3.5배 → 수명 ∝ M / M^3.5 = M^−2.5', PHONE ? 11.5 : 12.5, '#0369a1', 'center', 800);
  }

  /* ================= 화면 전환 · 조작 ================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    if (v === 'plot' && FREE()) fillPlaced();
    updateCtl();
  }
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcL').hidden = !(S.view === 'calc' && (S.flags.calcL || free));
    $('#plotTools').hidden = !(S.view === 'plot' && allPlaced());
    $('#calcSlope').hidden = !(S.view === 'plot' && (S.flags.slope || free) && allPlaced());
    $('#notePlot').hidden = !(S.view === 'plot' && !allPlaced());
    $('#plotNote').textContent = PL.sel >= 0 ? 'M = ' + f1(DATA[PL.sel].M) + ' M☉를 골랐어요. 그래프에서 log M = ' + sg(DATA[PL.sel].lM, 2) + ', log L = ' + sg(DATA[PL.sel].lL, 2) + '인 자리를 눌러요.' : '오른쪽 목록에서 별을 고르고, 그래프에서 (log M, log L)에 해당하는 자리를 눌러요.';
    $('#calcY').hidden = !(S.view === 'apply' && AP.sel === 0); $('#calcZ').hidden = !(S.view === 'apply' && AP.sel === 1);
    $('#calcT').hidden = !(S.view === 'life' && (S.flags.calcT || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#grpScale .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === PL.linT));
    $('#bFit').textContent = PL.fitOn ? '📏 직선 지우기' : '📏 직선 긋기';
    $$('#grpYZ .opt').forEach((b) => { const k = +b.dataset.k; b.classList.toggle('on', k === AP.sel); b.classList.toggle('done', k === 0 ? yDone() : zDone()); });
  }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  sl('#sM', '#oM', (v) => f1(v) + ' M☉', (v) => { LF.M = v; });
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpScale .opt').forEach((b) => clickable(b, () => { PL.linT = +b.dataset.k; updateCtl(); }));
  clickable($('#bFit'), () => { PL.fitOn = !PL.fitOn; updateCtl(); });
  $$('#grpYZ .opt').forEach((b) => clickable(b, () => { AP.sel = +b.dataset.k; updateCtl(); }));
  $('#inL').addEventListener('input', () => { const v = numOf('inL'); const was = CA.l1Ok; CA.l1Ok = v != null && nearRel(v, DATA[IDX12].L, 0.05); chkIn('inL', CA.l1Ok); if (CA.l1Ok && !was) { CA.rev[IDX12] = true; CA.pop[IDX12] = 1; CA.sel = IDX12; const r = caRowRect(IDX12); ptsBurst(r.x + r.w - 60, r.y + r.h / 2); } });
  $('#inSlope').addEventListener('input', () => { const v = numOf('inSlope'); PL.slopeOk = v != null && v >= 3.2 && v <= 3.8; chkIn('inSlope', PL.slopeOk); });
  const onAp = (id, key, test, bx) => $('#' + id).addEventListener('input', () => { const v = numOf(id); const was = AP[key]; AP[key] = v != null && test(v); chkIn(id, AP[key]); if (AP[key] && !was) { ptsBurst(bx[0](), bx[1]()); updateCtl(); } });
  const apPt = (i) => [() => LAp().G.x + LAp().G.w / 2, () => LAp().G.y + 120 + i * 20];
  onAp('inLY', 'yL', (v) => nearRel(v, STAR_Y.L, 0.07), apPt(0)); onAp('inMY', 'yM', (v) => near(v, STAR_Y.M, 0.25), apPt(1));
  onAp('inDZ', 'zd', (v) => near(v, STAR_Z.d, 0.6), apPt(2)); onAp('inVZ', 'zv', (v) => near(v, STAR_Z.Mv, 0.12), apPt(3));
  onAp('inLZ', 'zl', (v) => v >= 50 && v <= 58, apPt(4)); onAp('inMZ', 'zm', (v) => near(v, STAR_Z.M, 0.2), apPt(5));
  $('#inT').addEventListener('input', () => { const v = numOf('inT'); LF.tOk = v != null && v >= 25 && v <= 40; chkIn('inT', LF.tOk); });

  SciSim.pointer(view, {
    down(p) { if (S.view === 'calc') return caDown(p); if (S.view === 'plot') return plDown(p); return false; },
    move() {}, up() {},
    hover(p) {
      if (S.view === 'calc') { for (let i = 0; i < 8; i++) if (inR(p, caRowRect(i))) return 'pointer'; }
      if (S.view === 'plot') { for (let i = 0; i < 8; i++) if (inR(p, plRowRect(i))) return 'pointer'; if (inBox(lgGeom(LPl().G), p)) return 'crosshair'; }
      return '';
    },
  });

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '광도 계산: 절대 등급에서 광도로', short: '광도 계산', icon: '🔢', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 무거운 별은 얼마나 더 밝고, 쌍성이 아닌 별의 질량은 어떻게 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 쌍성으로 별의 질량을 직접 구했어요. <b>일반선택 지구과학의 H-R도</b>에서는 절대 등급(5등급 차이 = 광도 100배)으로 광도를 비교했어요. 이번에는 질량을 아는 주계열성들의 <b>절대 등급을 광도로 바꿔</b> 질량과 광도의 관계를 찾아요.</div>' +
        '<p>자료는 교육용으로 정리한 주계열 쌍성 8개의 질량 M과 절대 등급 M_V예요. 광도는 태양 광도 L☉ 단위로 <b>L / L☉ = 10^(0.4 × (4.83 − M_V))</b>(태양의 절대 등급 4.83)로 구해요.</p>',
      features: ['calc'],
      setup() { setView('calc'); },
      recap: '절대 등급이 5 작아지면 광도는 100배가 돼요. L / L☉ = 10^(0.4 × (4.83 − M_V))로 8개 별의 광도를 구했어요.',
      summary: '<ul><li><b>등급과 광도</b>: 1등급 차이 = 광도 약 2.512배, <b>5등급 차이 = 100배</b>. 등급이 작을수록 밝아요.</li><li><b>광도 계산</b>: L / L☉ = 10^(0.4 × (4.83 − M_V)). 예) M_V = 1.2 → 10^(0.4 × 3.63) = 10^1.452 ≈ <b>28 L☉</b>.</li><li>자료표(M → L): 0.5 M☉ → 0.078, 1.0 → 1.03, 2.5 → 28, 4.0 → 113, 10 → 3,100 L☉. 질량이 커질수록 광도가 훨씬 빨리 커져요.</li></ul>',
      missions: [
        {
          title: 'M_V = 1.2인 별의 광도',
          goal: '표에서 <b>M_V = 1.2</b>인 별의 광도를 <b>L = 10^(0.4 × (4.83 − M_V))</b>로 계산해 <b>L(L☉)</b>을 입력하세요.',
          hint: '4.83 − 1.2 = 3.63, 0.4 × 3.63 = 1.452예요. 10^1.452 ≈ 28이에요. (등급이 3.63 작으니 2.512^3.63 ≈ 28배)',
          setup() { CA.l1Ok = false; S.flags.calcL = true; clrIn('inL'); setView('calc'); },
          check: () => CA.l1Ok,
          hold: 0.4,
          status: () => mark(CA.l1Ok) + ' L = ' + ($('#inL').value.trim() || '—') + ' L☉',
          explain: 'L = 10^(0.4 × 3.63) = 10^1.452 ≈ <b>28 L☉</b>예요. 이 별(2.5 M☉)은 태양보다 약 28배 밝아요.',
        },
        {
          title: '나머지 별 7개의 계산 확인하기',
          goal: '표의 나머지 줄을 눌러 별마다 계산 과정과 <b>광도</b>를 확인하세요. 8개 줄이 모두 열리면 돼요.',
          hint: '줄을 누르면 오른쪽 사다리에 별의 자리가 나타나고, 아래 칸에 ΔM → 지수 → L의 세 단계가 보여요.',
          setup() { CA.l1Ok = true; CA.rev = CA.rev.map((r, i) => i === IDX12); CA.sel = -1; setView('calc'); },
          check: () => calcAllRev(),
          hold: 0.5,
          status: () => mark(calcAllRev()) + ' 확인한 별 ' + CA.rev.filter(Boolean).length + ' / 8',
          explain: '0.5 M☉는 0.078 L☉, 10 M☉는 3,100 L☉예요. 질량이 20배 차이인데 광도는 약 4만 배 차이가 나요. 다음 단계에서 이 관계를 그래프로 찾아요.',
        },
        {
          type: 'quiz', title: '절대 등급이 5 작으면?',
          goal: '두 별의 <b>절대 등급이 5 차이</b>가 나요. 등급이 5 작은 별은 광도가 몇 배일까요?',
          setup() { CA.sel = 2; setView('calc'); },
          choices: ['100배', '5배', '25배', '10배'],
          answer: 0,
          feedback: ['', '5등급 차이는 5배가 아니라 100배예요. 1등급마다 2.512배씩 곱해져서 2.512⁵ = 100이에요.', '2.512²가 아니라 2.512⁵를 계산해야 해요. 5등급이면 100배예요.', '10배는 2.5등급 차이예요. 5등급 차이는 100배예요.'],
          explain: '1등급 차이 = 2.512배이므로 5등급 차이 = 2.512⁵ = <b>100배</b>예요. 그래서 사다리에서 5칸 위로 가면 광도가 100배가 돼요.',
        },
      ],
    },
    {
      title: '관계 찾기: 로그 그래프의 직선', short: '관계 찾기', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질량이 0.5 ~ 10 M☉인 별 8개의 광도를 구했어요. 광도가 0.078 ~ 3,100 L☉로 너무 넓게 퍼져 있어서 <b>로그 눈금</b> 그래프에 그려요.</div>' +
        '<p>가로축 <b>log M</b>, 세로축 <b>log L</b>에 점 8개를 찍으면 거의 한 직선 위에 놓여요. 직선의 <b>기울기</b>가 질량-광도 관계의 지수예요. 선형 눈금과도 비교해 봐요.</p>',
      features: ['plot'],
      setup() { setView('plot'); },
      recap: '로그 그래프에서 점들이 기울기 약 3.5인 직선을 이루므로 주계열성은 L ∝ M^3.5예요.',
      summary: '<ul><li>점 8개의 (log M, log L)은 거의 한 직선 위에 놓여요. 첫 점과 끝 점의 기울기 = (3.49 − (−1.11)) / (1.00 − (−0.30)) ≈ 3.5(최소제곱으로 구하면 약 3.51).</li><li><b>L ∝ M^3.5</b>: log L = 3.5 log M + 상수. 질량이 2배이면 광도는 2^3.5 ≈ <b>11배</b>예요.</li><li>로그–로그 그래프에서 직선은 <b>거듭제곱 관계</b>라는 뜻이에요. 선형 눈금에서는 곡선이라 관계를 알아보기 어려워요.</li><li>이 식은 <b>주계열성</b>의 평균적 근사예요. 실제 관측에서 지수는 질량 범위에 따라 약 2.3 ~ 4.6으로 달라서 3.5는 한 직선으로 맞춘 평균값이에요. 시리우스 A(2.06 M☉, 23 L☉) 같은 실제 별은 조금 벗어나고, 백색 왜성(시리우스 B)은 크게 벗어나요.</li></ul>',
      missions: [
        {
          title: '점 8개 찍기',
          goal: '오른쪽 목록에서 별을 고르고 그래프에서 <b>(log M, log L)</b> 자리를 눌러 점 <b>8개</b>를 모두 찍으세요.',
          hint: '가로 눈금은 질량(0.5, 1, 2, 5, 10), 세로 눈금은 광도(0.01 ~ 10⁴)예요. 예) 1.0 M☉, 1.03 L☉는 가로 1, 세로 1 근처예요. 두 번 틀리면 알맞은 자리가 점선 원으로 나와요.',
          setup() { setView('plot'); PL.sel = DATA.findIndex((q) => !PL.placed[q.i]); updateCtl(); },
          check: () => allPlaced(),
          hold: 0.6,
          status: () => mark(allPlaced()) + ' 찍은 점 ' + PL.placed.filter(Boolean).length + ' / 8',
          explain: '점 8개가 왼쪽 아래에서 오른쪽 위로 <b>거의 한 직선</b>을 이루며 올라가요. 질량이 클수록 광도가 크다는 뜻이에요.',
        },
        {
          title: '직선의 기울기 구하기',
          goal: '그래프에서 <b>점 두 개</b>를 눌러 기울기 삼각형을 만들고, <b>기울기 = Δlog L / Δlog M</b>을 입력하세요. (멀리 떨어진 두 점이 좋아요)',
          hint: '첫 점(0.5 M☉)과 끝 점(10 M☉)을 누르면 Δlog M = 1.30, Δlog L = 4.60이에요. 4.60 / 1.30 ≈ 3.5예요. "직선 긋기"로 직선을 확인할 수 있어요.',
          setup() { fillPlaced(); S.flags.slope = true; PL.picks = []; PL.slopeOk = false; clrIn('inSlope'); setView('plot'); },
          check: () => PL.picks.length === 2 && PL.slopeOk,
          hold: 0.5,
          status: () => mark(PL.picks.length === 2) + ' 점 ' + PL.picks.length + ' / 2 선택 &nbsp; ' + mark(PL.slopeOk) + ' 기울기 = ' + ($('#inSlope').value.trim() || '—'),
          explain: '기울기는 약 <b>3.5</b>예요. log L = 3.5 log M + 상수이므로 <b>L ∝ M^3.5</b>예요. 질량이 2배이면 광도는 2^3.5 ≈ 11배가 돼요.',
        },
        {
          type: 'quiz', title: '직선이 알려 주는 것',
          goal: '로그–로그 그래프에서 점들이 <b>기울기 3.5의 직선</b>을 이루는 것은 무엇을 뜻할까요?',
          setup() { fillPlaced(); setView('plot'); },
          choices: ['L이 M의 거듭제곱 관계(L ∝ M^3.5)라는 뜻이에요', '질량이 3.5배가 되면 광도도 3.5배가 된다는 뜻이에요', '질량과 광도 사이에 아무 관계가 없다는 뜻이에요', '광도가 질량에 일차식으로 늘어난다는 뜻이에요'],
          answer: 0,
          feedback: ['', '기울기 3.5는 지수예요. 질량이 2배이면 광도는 2배가 아니라 2^3.5 ≈ 11배가 돼요.', '점들이 한 직선에 놓이는 것은 뚜렷한 관계가 있다는 뜻이에요.', '선형 눈금에서 직선이면 일차식이지만, 로그–로그 직선은 log L = 3.5 log M + 상수, 즉 거듭제곱 관계예요.'],
          explain: '두 축이 모두 로그이므로 직선은 log L = 3.5 × log M + 상수를 뜻하고, 이것이 <b>L ∝ M^3.5</b>예요. 질량이 3.5배가 되면 광도는 3.5^3.5 ≈ 80배가 돼요.',
        },
      ],
    },
    {
      title: '질량 구하기: 쌍성이 아닌 별', short: '질량 구하기', icon: '🎯', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 주계열성이면 L = M^3.5라는 관계를 찾았어요. 그러면 <b>쌍성이 아닌 별</b>도 광도만 알면 질량을 거꾸로 구할 수 있어요. 광도는 <b>앞 차시들에서 배운 거리 지수(m − M = 5 log d − 5)</b>로 구해요.</div>' +
        '<p>별 Y는 절대 등급을 알고, 별 Z는 겉보기 등급과 연주시차를 관측했어요. 두 별 모두 주계열성이라고 가정하고 <b>M = L^(1/3.5)</b>로 질량을 구해요.</p>',
      features: ['apply'],
      setup() { setView('apply'); },
      recap: '광도를 알면 M = L^(1/3.5)로 쌍성이 아닌 주계열성의 질량을 구할 수 있어요. 거리를 모르면 시차로 거리부터 구해요.',
      summary: '<ul><li><b>별 Y</b>(M_V = −0.2): L = 10^(0.4 × 5.03) ≈ <b>103 L☉</b> → M = 103^(1/3.5) ≈ <b>3.8 M☉</b>.</li><li><b>별 Z</b>(m = 2.0, p = 0.05″): d = 1 / p = <b>20 pc</b> → M_V = m + 5 − 5 log d ≈ <b>0.5</b> → L ≈ <b>54 L☉</b> → M ≈ <b>3.1 M☉</b>.</li><li>순서: (시차 → 거리) → 절대 등급 → 광도 → 질량. 질량-광도 관계는 <b>주계열성에만</b> 맞아요. 거성이나 백색 왜성에는 쓸 수 없어요.</li></ul>',
      missions: [
        {
          title: '별 Y의 질량',
          goal: '별 Y는 <b>M_V = −0.2</b>인 주계열성이에요. <b>① 광도 L</b>을 구하고 <b>② 질량 M</b>(M☉)을 입력하세요.',
          hint: 'L = 10^(0.4 × (4.83 − (−0.2))) = 10^(0.4 × 5.03) = 10^2.012 ≈ 103 L☉예요. M = L^(1/3.5) = 103^0.286 ≈ 3.8 M☉예요. 그래프에서 L = 103에서 직선까지 가로로, 거기서 아래로 읽어도 돼요.',
          setup() { AP.sel = 0; AP.yL = false; AP.yM = false; clrIn('inLY', 'inMY'); setView('apply'); },
          check: () => yDone(),
          hold: 0.5,
          status: () => mark(AP.yL) + ' L = ' + ($('#inLY').value.trim() || '—') + ' L☉ &nbsp; ' + mark(AP.yM) + ' M = ' + ($('#inMY').value.trim() || '—') + ' M☉',
          explain: 'L ≈ <b>103 L☉</b>, M = 103^(1/3.5) ≈ <b>3.8 M☉</b>예요. 그래프에서도 L = 103에서 직선을 만나는 가로 눈금이 3.8 근처예요.',
        },
        {
          title: '별 Z: 거리에서 질량까지', manual: true,
          goal: '별 Z는 <b>m = 2.0, p = 0.05″</b>예요. 아래 순서로 <b>① 거리 d ② M_V ③ 광도 L ④ 질량 M</b>을 모두 입력하고 확인하세요.',
          hint: '① d = 1 / 0.05 = 20 pc ② M_V = 2.0 + 5 − 5 log 20 ≈ 0.5 ③ L = 10^(0.4 × (4.83 − 0.5)) ≈ 54 L☉ ④ M = 54^(1/3.5) ≈ 3.1 M☉',
          setup() { AP.sel = 1; AP.zd = AP.zv = AP.zl = AP.zm = false; clrIn('inDZ', 'inVZ', 'inLZ', 'inMZ'); setView('apply'); },
          check() {
            if (zDone()) return true;
            const miss = [!AP.zd && '① 거리 d', !AP.zv && '② 절대 등급 M_V', !AP.zl && '③ 광도 L', !AP.zm && '④ 질량 M'].filter(Boolean);
            return '아직 알맞지 않은 칸이 있어요: ' + miss.join(', ') + '. 앞 칸의 값을 이어서 써 보세요.';
          },
          status: () => mark(AP.zd) + ' d &nbsp; ' + mark(AP.zv) + ' M_V &nbsp; ' + mark(AP.zl) + ' L &nbsp; ' + mark(AP.zm) + ' M',
          explain: 'd = 20 pc → M_V ≈ <b>0.5</b> → L ≈ <b>54 L☉</b> → M ≈ <b>3.1 M☉</b>이에요. 거리 지수와 질량-광도 관계를 이어서 쓴 거예요.',
        },
        {
          type: 'quiz', title: '왜 쌍성이 아닌 별의 질량도 구할 수 있을까?',
          goal: '질량-광도 관계를 쓰면 <b>쌍성이 아닌 별</b>의 질량도 구할 수 있어요. 그 까닭과 조건으로 알맞은 것은?',
          setup() { setView('apply'); },
          choices: ['주계열성은 광도에서 질량을 거꾸로 구할 수 있어요. 단, 주계열성에만 쓸 수 있어요', '모든 별은 질량과 광도가 같기 때문이에요', '별의 색만 보면 질량이 바로 나오기 때문이에요', '관계가 거성과 백색 왜성에도 똑같이 맞기 때문이에요'],
          answer: 0,
          feedback: ['', '별마다 질량과 광도는 달라요. 주계열성에서 L = M^3.5라는 관계가 있을 뿐이에요.', '색(온도)만으로는 질량이 나오지 않아요. 광도가 있어야 관계식으로 질량을 거꾸로 구해요.', '거성과 백색 왜성은 이 관계에서 벗어나요. 시리우스 B는 1.02 M☉인데 관계식의 L = 1.07 L☉보다 훨씬 어두운 0.025 L☉예요.'],
          explain: '주계열성은 L = M^3.5이므로 <b>M = L^(1/3.5)</b>로 질량을 구할 수 있어요. 하지만 <b>주계열성에만</b> 해당돼요. 백색 왜성이나 거성에 쓰면 틀려요.',
        },
      ],
    },
    {
      title: '별의 수명: 무거울수록 짧아요', short: '별의 수명', icon: '⏳', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 주계열성의 광도는 L = M^3.5라는 것을 알았어요. <b>일반선택 지구과학에서</b> 주계열 수명이 질량/광도(M / L)에 비례한다고 배웠어요. 두 식을 합쳐 질량에 따른 수명을 구해요.</div>' +
        '<p>연료의 양은 질량 M에 비례하고 소모 속도는 광도 L이에요. 그래서 수명은 <b>t ≈ 10¹⁰년 × M / L = 10¹⁰ M^−2.5 년</b>(태양 약 100억 년)이에요. 슬라이더로 질량을 바꿔 크기·색·H-R도 위 자리와 수명을 살펴봐요.</p>',
      features: ['life'],
      setup() { setView('life'); },
      recap: '질량이 클수록 광도는 M^3.5로 급증해 연료를 빨리 써서 수명은 M^−2.5로 짧아져요. 백색 왜성은 이 관계에서 벗어나요.',
      summary: '<ul><li><b>L = M^3.5, t ≈ 10¹⁰ × M / L = 10¹⁰ M^−2.5 년</b>. 질량이 2배이면 광도 약 <b>11배</b>, 수명은 약 <b>1/5.7</b>이에요.</li><li>수명: 0.5 M☉ 5.7×10¹⁰년, 1 M☉ 1.0×10¹⁰년, 2 M☉ 1.8×10⁹년, 5 M☉ 1.8×10⁸년, <b>10 M☉ 3.2×10⁷년</b>, 20 M☉ 5.6×10⁶년.</li><li>연료는 질량에 <b>비례</b>해서 늘지만 소모(광도)는 <b>M^3.5</b>로 훨씬 빨리 늘어서 무거운 별일수록 수명이 짧아요.</li><li>백색 왜성인 시리우스 B(1.02 M☉)는 주계열 관계로는 1.07 L☉여야 하지만 실제는 0.025 L☉예요. 이 관계는 <b>주계열성</b>에만 맞아요. (그림의 반지름과 온도는 단순화한 모형이에요.)</li></ul>',
      missions: [
        {
          title: '10 M☉ 별의 수명',
          goal: '질량 슬라이더를 <b>10 M☉</b>에 맞추고, 이 별의 수명을 <b>백만 년</b> 단위로 계산해 입력하세요.',
          hint: 't = 10¹⁰ × 10^−2.5 = 10¹⁰ / 316 ≈ 3.2×10⁷년 = 약 32백만 년이에요. (L = 10^3.5 ≈ 3,160 L☉이고 연료는 10배이므로 10 / 3160 = 1/316배)',
          setup() { S.flags.calcT = true; LF.tOk = false; clrIn('inT'); setView('life'); },
          check: () => LF.tOk && Math.abs(LF.M - 10) <= 0.25,
          hold: 0.6,
          status: () => mark(Math.abs(LF.M - 10) <= 0.25) + ' 질량 ' + f1(LF.M) + ' M☉ &nbsp; ' + mark(LF.tOk) + ' 수명 = ' + ($('#inT').value.trim() || '—') + ' 백만 년',
          explain: 't = 10¹⁰ × 10^−2.5 ≈ 3.2×10⁷년, 즉 약 <b>3천만 년</b>이에요. 태양 수명의 300분의 1밖에 안 돼요.',
        },
        {
          type: 'quiz', title: '무거운 별의 수명이 짧은 까닭',
          goal: '질량이 큰 별이 연료를 더 많이 가졌는데도 <b>수명이 짧은</b> 까닭은?',
          setup() { setView('life'); },
          choices: ['연료는 M배로 늘지만 소모(광도)는 M^3.5배로 훨씬 빨리 늘어서 더 빨리 써 버려요', '연료가 많으니 오래 살아요', '무거운 별은 온도가 낮아 에너지를 천천히 써요', '무거운 별은 처음부터 연료가 적어요'],
          answer: 0,
          feedback: ['', '연료가 많은 것은 맞지만 소모가 그보다 훨씬 더 빨리 늘어요. 수명 = 연료 / 소모 ∝ M / M^3.5예요.', '무거운 별은 온도가 높고 광도가 매우 커서 에너지를 빨리 써요.', '무거운 별은 연료(질량)가 오히려 많아요. 문제는 소모 속도예요.'],
          explain: '수명 ∝ 연료 / 소모 = M / M^3.5 = <b>M^−2.5</b>예요. 10 M☉ 별은 연료가 10배지만 3,160배 빨리 써서 수명이 1/316배가 돼요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-mass-luminosity', mount: '#game', badge: '질량-광도 탐정', homeHref: '../../index.html#hu',
    featureLabels: { calc: '🔢 광도 계산표 · 등급 사다리', plot: '📈 로그 그래프 · 기울기 삼각형', apply: '🎯 단독 별 Y, Z · 읽기 안내선', life: '⏳ 질량 슬라이더 · H-R도 · 수명 막대' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view, free = FREE();
    if (v === 'calc') { const d = CA.sel >= 0 ? DATA[CA.sel] : null; setReadouts(['고른 별', d ? f1(d.M) + ' M☉ (M_V ' + sg(d.Mv, 1) + ')' : '—', '광도 L', d && (CA.rev[d.i] || free) ? fL(d.L) + ' L☉' : '?', '확인한 별', CA.rev.filter(Boolean).length + ' / 8']); }
    else if (v === 'plot') { const sl_ = plSlope(); setReadouts(['찍은 점', PL.placed.filter(Boolean).length + ' / 8', '고른 두 점의 기울기', sl_ ? f2(sl_.s) : '—', '관계', PL.fitOn ? 'L ∝ M^3.5' : '?']); }
    else if (v === 'apply') setReadouts(['별 Y의 질량', yDone() || free ? f1(STAR_Y.M) + ' M☉' : '?', '별 Z의 질량', zDone() || free ? f1(STAR_Z.M) + ' M☉' : '?', '쓰는 관계', 'M = L^(1/3.5)']);
    else setReadouts(['질량 M', f1(LF.M) + ' M☉', '광도 L = M^3.5', fLs(Math.pow(LF.M, 3.5)) + ' L☉', '수명 t', sci(lifeOf(LF.M), 1) + ' 년']);
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; if (lastFree && S.view === 'plot') fillPlaced(); updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'calc': drawCalc(dt, t); break;
      case 'plot': drawPlot(dt, t); break;
      case 'apply': drawApply(dt, t); break;
      default: drawLife(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, DATA, STAR_Y, STAR_Z, CA, PL, AP, LF, lgGeom, LPl, LAp, LLf, LCa, caRowRect, plRowRect, plSlope, lifeOf, fit };
})();
