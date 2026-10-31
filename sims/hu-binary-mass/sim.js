/* =========================================================
   행성우주과학 Ⅱ. 태양과 별의 관측 - 쌍성으로 질량 재기 (5차시)
   성취기준 [12행우02-04] 쌍성의 관측 자료를 이용하여 항성의 질량을 직접적으로 구할 수 있음을 이해하고, 질량-광도 관계를 이용하여 쌍성이 아닌 별의 질량을 구할 수 있다. (쌍성으로 질량 재기)
   ① 관찰: 쌍성 관측 (시각쌍성의 상대 궤도, 주기 P, 각거리 긴반지름 a″, 질량 중심)
   ② 분석: 총질량 (a = a″ / p, M₁ + M₂ = a³ / P²)
   ③ 분석: 개별 질량 (M₁ a₁ = M₂ a₂, 질량 중심의 위치)
   ④ 적용: 자료표 (쌍성 4개의 총질량, 이상적 조건의 한계)
   다루지 않음: 경사각 보정 계산, 분광 쌍성의 질량 하한(sin³i), 식쌍성 광도 곡선 해석, 이심률이 큰 궤도의 세부.
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
  const ECC = 0.6;                                   // 시리우스 상대 궤도의 이심률 (단순화한 값)
  const SIR = { P: 50.1, aa: 7.5, p: 0.3792, MA: 2.06, MB: 1.02, tot: 3.08 };
  SIR.a = SIR.aa / SIR.p;                            // 19.78 AU
  SIR.Mk = Math.pow(SIR.a, 3) / (SIR.P * SIR.P);     // 3.08 M☉ (케플러 제3법칙)
  SIR.a1 = SIR.a * SIR.MB / SIR.tot;                 // A에서 질량 중심까지 6.55 AU
  SIR.a2 = SIR.a * SIR.MA / SIR.tot;                 // B에서 질량 중심까지 13.23 AU
  SIR.fA = SIR.MB / SIR.tot;                         // 상대 위치 벡터 중 A가 움직이는 몫
  const CMD = [
    { id: 'sir', name: '시리우스 A–B', n1: 'A', n2: 'B', P: 50.1, a: SIR.a, a1: SIR.a1, a2: SIR.a2, tot: SIR.Mk, M1: SIR.MA, M2: SIR.MB, fmt: f2, maxR: 13.6, bar: 5 },
    { id: 'x', name: '연습 쌍성 X', n1: '별 1', n2: '별 2', P: 20, a: 10, a1: 4, a2: 6, tot: 2.5, M1: 1.5, M2: 1.0, fmt: f1, maxR: 6.3, bar: 2 },
    { id: 'exp', name: '질량 비 실험', n1: 'A', n2: 'B', P: 50.1, a: SIR.a, tot: SIR.Mk, fmt: f2, maxR: 18.5, bar: 5 },
  ];
  const BIN = [
    { n: '시리우스 A–B', sn: '시리우스', P: 50.1, aa: 7.50, p: 0.3792, pt: '50.1' },
    { n: '센타우루스 알파 A–B', sn: '센타우루스 α', P: 79.9, aa: 17.57, p: 0.7472, pt: '79.9' },
    { n: '프로키온 A–B', sn: '프로키온', P: 40.8, aa: 4.29, p: 0.2860, pt: '40.8' },
    { n: '백조자리 61 A–B', sn: '백조자리 61', P: 678, aa: 24.5, p: 0.2860, pt: '678' },
  ];
  BIN.forEach((b) => { b.a = b.aa / b.p; b.M = Math.pow(b.a, 3) / (b.P * b.P); });
  const M0S = Math.pow(19.8, 3) / (50.1 * 50.1);     // 슬라이더 기준값의 질량 합

  /* ================= 상태 ================= */
  const S = {
    view: 'sky', fade: 0, clock: 0,
    sk: { t: 0, play: !RM, mode: 0, mix: 0, pOk: false, aOk: false },
    tt: { aOk: false, mOk: false, a: 19.8, P: 50.1, prog: 0, boxM: 0 },
    cm: { sel: 0, ph: 0.6, mA: 2.06, a1: SIR.a1, a2: SIR.a2, sc: 11, ok: false, okX: false, tilt: 0, tv: 0, wob: 0 },
    tb: { sel: 0, aOk: [false, false, false, false], mOk: [false, false, false, false], done: [false, false, false, false], pop: [0, 0, 0, 0], inc: 0, saved: 0 },
    flags: { calcSky: false, calcTotal: false, box: false, calcCm: false, expCm: false, calcTb: false, tilt: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const SK = S.sk, TT = S.tt, CM = S.cm, TB = S.tb;
  const VIEW_LABEL = { sky: '🔭 시각쌍성 시리우스 A–B', total: '⚖ 총질량: M₁ + M₂ = a³ / P²', cm: '⚖ 질량 중심으로 질량 나누기', table: '📋 쌍성 자료표' };
  const modeBtns = $$('#modeSeg button');
  const lerpN = (a, b, t) => a + (b - a) * t;
  const clearIn = (...ids) => clrIn(...ids);
  /* 입력 검사: 맞으면 초록 칸, 아니면 표시 해제 */
  function chkIn(id, ok) { const e = $('#' + id); if (!e) return; if (ok) fbIn(id, true); else e.classList.remove('ok', 'bad'); }
  const ptsBurst = (x, y) => parts.burst(x, y, { count: 14, speed: 140, life: 0.7, size: 4, gravity: 200 });
  /* 어두운 우주 상자: 호출 뒤 ctx.restore() 필요 */
  function darkBox(r, t) {
    D.shadow(() => { ctx.fillStyle = '#0b1230'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(r.x, r.y, r.w, r.h, 14); ctx.clip(); spaceBg(r.x, r.y, r.w, r.h, t, '#0b1230', '#16224a');
  }
  const AUtxt = (x) => f1(x) + ' AU';

  /* 케플러 궤도: B의 A에 대한 상대 위치 (각초, 위쪽이 +y). 가까운 점이 위쪽 */
  function relPos(t) {
    const Mm = ((((t / SIR.P) % 1) + 1) % 1) * TAU, E = kepE(Mm, ECC);
    const nu = 2 * Math.atan2(Math.sqrt(1 + ECC) * Math.sin(E / 2), Math.sqrt(1 - ECC) * Math.cos(E / 2));
    const r = SIR.aa * (1 - ECC * Math.cos(E));
    return { x: -r * Math.sin(nu), y: r * Math.cos(nu), r };
  }
  const sepAt = (t) => relPos(t).r;
  function orbitPts(k, n) {            // 상대 궤도를 k배한 점들 (k: 별이 차지하는 몫)
    const pts = [];
    for (let i = 0; i <= n; i++) { const nu = (i / n) * TAU, r = SIR.aa * (1 - ECC * ECC) / (1 + ECC * Math.cos(nu)); pts.push([-k * r * Math.sin(nu), k * r * Math.cos(nu)]); }
    return pts;
  }

  /* =========================================================
     ① 쌍성 관측
     ========================================================= */
  function LSk() {
    return PHONE ? { C: { x: 8, y: 8, w: 464, h: 450 }, G: { x: 8, y: 466, w: 464, h: 200 }, I: { x: 8, y: 674, w: 464, h: 178 } }
      : { C: { x: 10, y: 8, w: 470, h: 604 }, G: { x: 488, y: 8, w: 302, h: 300 }, I: { x: 488, y: 316, w: 302, h: 296 } };
  }
  function skGeom() {
    const { C } = LSk(), top = C.y + 40 * FS, ah = C.h - 40 * FS - 26 * FS, aw = C.w;
    const s = Math.min(ah / 15.8, (aw - 50) / 12.8), ox = C.x + C.w / 2;
    return { C, s, ox, top, ah, oyA: top + (ah - 15 * s) / 2 + 3 * s, oyC: top + (ah - 12 * s) / 2 + 4 * s };
  }
  function skPos(t, m, g) {
    const q = relPos(t), oy = lerpN(g.oyA, g.oyC, m);
    return {
      q, oy,
      A: { x: g.ox + g.s * (-m * SIR.fA * q.x), y: oy - g.s * (-m * SIR.fA * q.y) },
      B: { x: g.ox + g.s * ((1 - m * SIR.fA) * q.x), y: oy - g.s * ((1 - m * SIR.fA) * q.y) },
    };
  }
  function skGraph() {
    const { G } = LSk(), ix = G.x + 44, iw = G.w - 44 - 14, top = G.y + 38 * FS, ph = G.h - 38 * FS - 36 * FS;
    return { G, ix, iw, top, ph, X: (t) => ix + t / 100 * iw, Y: (v) => top + ph * (1 - v / 13) };
  }
  function drawSky(dt, t) {
    SK.mix = approach(SK.mix, SK.mode, dt, 6);
    if (SK.play && !RM) { SK.t += dt * 10; if (SK.t >= 100) SK.t -= 100; syncSlider(); }
    const g = skGeom(), C = g.C, m = SK.mix, P = skPos(SK.t, m, g), ox = g.ox, oy = P.oy;
    // ---- 하늘 영상
    darkBox(C, t);
    // 고리: 중심에서 각거리 눈금 (2″ 간격)
    for (let k = 1; k <= 6; k++) {
      ctx.strokeStyle = 'rgba(148,163,184,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, oy, k * 2 * g.s, 0, TAU); ctx.stroke();
      outlineT(ox + 5, oy + k * 2 * g.s + 4, k * 2 + '″', 11.5, '#93a4c3', 'left');
    }
    ctx.strokeStyle = 'rgba(148,163,184,.22)'; ctx.beginPath(); ctx.moveTo(ox, C.y + 30); ctx.lineTo(ox, C.y + C.h - 10); ctx.moveTo(C.x + 10, oy); ctx.lineTo(C.x + C.w - 10, oy); ctx.stroke();
    // 궤도 길
    const toS = (p) => [ox + g.s * p[0], oy - g.s * p[1]];
    const pathB = orbitPts(1 - m * SIR.fA, 120).map(toS);
    ctx.setLineDash([5, 6]); line(pathB, 'rgba(147,197,253,.55)', 1.6); ctx.setLineDash([]);
    if (m > 0.04) { ctx.save(); ctx.globalAlpha = Math.min(1, m * 1.4); ctx.setLineDash([5, 6]); line(orbitPts(-m * SIR.fA, 120).map(toS), 'rgba(253,224,71,.6)', 1.6); ctx.setLineDash([]); ctx.restore(); }
    // 지난 한 바퀴의 자취
    const tail = Math.min(SK.t, SIR.P), n = 70, trB = [], trA = [];
    for (let i = 0; i <= n; i++) { const tt = SK.t - tail + tail * i / n, pp = skPos(tt, m, g); trB.push([pp.B.x, pp.B.y]); trA.push([pp.A.x, pp.A.y]); }
    if (tail > 0.2) { line(trB, 'rgba(125,211,252,.95)', 2.6); if (m > 0.04) line(trA, 'rgba(253,224,71,.9)', 2.6, { alpha: Math.min(1, m * 1.4) }); }
    // 출발 위치 표시
    const p0 = skPos(0, m, g);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p0.B.x, p0.B.y, 10, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    outlineT(p0.B.x + 14, p0.B.y - 6, '출발 (0년)', 11.5, '#e2e8f0', 'left');
    // A–B 연결선과 질량 중심
    if (m > 0.04) {
      ctx.save(); ctx.globalAlpha = Math.min(1, m * 1.4); ctx.setLineDash([3, 5]); line([[P.A.x, P.A.y], [P.B.x, P.B.y]], 'rgba(226,232,240,.55)', 1.5); ctx.setLineDash([]);
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox - 7, oy); ctx.lineTo(ox + 7, oy); ctx.moveTo(ox, oy - 7); ctx.lineTo(ox, oy + 7); ctx.stroke();
      outlineT(ox + 10, oy - 9, '질량 중심', 12, '#f8fafc', 'left'); ctx.restore();
    }
    // 별
    D.glow(P.B.x, P.B.y, 22, '#93c5fd', 0.55); D.sphere(P.B.x, P.B.y, 6, '#cfe0ff', { gloss: false, light: '#ffffff', dark: '#8aa8e8' });
    outlineT(P.B.x + 9, P.B.y + 18, 'B', 14, '#bfdbfe', 'left');
    D.glow(P.A.x, P.A.y, 46, '#dbeafe', 0.7); D.sphere(P.A.x, P.A.y, 12, '#eef4ff', { gloss: true, light: '#ffffff', dark: '#9db8ee' });
    outlineT(P.A.x + 15, P.A.y + 5, 'A', 15, '#ffffff', 'left');
    if (m < 0.5) outlineT(ox - 14, oy - 18, '여기가 A (가운데)', 11, '#93a4c3', 'right');
    ctx.restore();
    outlineT(C.x + 14, C.y + 24 * FS, '🔭 ' + (SK.mode ? '질량 중심을 가운데 두고 본 두 별' : 'A를 가운데 두고 본 B (상대 궤도)'), PHONE ? 12 : 13.5, '#e2e8f0', 'left');
    outlineT(C.x + C.w - 12, C.y + C.h - 10 * FS, '고리 = 가운데에서의 각거리 (2″마다)', 11, '#93a4c3', 'right');
    outlineT(C.x + 14, C.y + C.h - 10 * FS, f1(SK.t) + '년', PHONE ? 13 : 14.5, '#fde68a', 'left');
    // ---- 각거리 그래프
    const gg = skGraph(), G = gg.G;
    panel(G.x, G.y, G.w, G.h, { r: 14 });
    T(G.x + 14, G.y + 24 * FS, '📈 두 별 사이 각거리 (시간에 따라)', PHONE ? 12.5 : 13.5, '#1e293b', 'left', 800);
    ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(gg.ix, gg.top, gg.iw, gg.ph, 6).fill();
    [0, 3, 6, 9, 12].forEach((v) => { ctx.strokeStyle = 'rgba(148,163,184,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gg.ix, gg.Y(v)); ctx.lineTo(gg.ix + gg.iw, gg.Y(v)); ctx.stroke(); T(gg.ix - 6, gg.Y(v) + 4, v + '″', 11.5, '#64748b', 'right', 700); });
    [0, 20, 40, 60, 80, 100].forEach((v) => { ctx.strokeStyle = 'rgba(148,163,184,.35)'; ctx.beginPath(); ctx.moveTo(gg.X(v), gg.top); ctx.lineTo(gg.X(v), gg.top + gg.ph); ctx.stroke(); T(gg.X(v), gg.top + gg.ph + 15 * FS, String(v), 11.5, '#64748b', 'center', 700); });
    T(gg.ix + gg.iw / 2, gg.top + gg.ph + 30 * FS, '경과 시간 (년)', 11.5, '#64748b', 'center', 700);
    const cp = []; for (let i = 0; i <= 200; i++) { const tt = i * 0.5; cp.push([gg.X(tt), gg.Y(sepAt(tt))]); }
    line(cp, '#2563eb', 2.6);
    const cx = gg.X(SK.t); ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, gg.top); ctx.lineTo(cx, gg.top + gg.ph); ctx.stroke();
    D.sphere(cx, gg.Y(sepAt(SK.t)), 6, '#f59e0b', { gloss: false });
    // ---- 읽을 값
    const I = LSk().I;
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    T(I.x + 14, I.y + 24 * FS, '📐 읽을 값', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const solvedP = SK.pOk || FREE(), solvedA = SK.aOk || FREE();
    let yy = I.y + 50 * FS;
    T(I.x + 14, yy, '주기 P (처음 자리로 돌아오는 시간)', PHONE ? 12 : 13, '#475569', 'left', 800); T(I.x + I.w - 14, yy + 22 * FS, solvedP ? f1(SIR.P) + ' 년' : '?', 16, solvedP ? '#15803d' : '#94a3b8', 'right', 800);
    yy += 50 * FS;
    T(I.x + 14, yy, '각거리 긴반지름 a″ (긴 지름의 절반)', PHONE ? 12 : 13, '#475569', 'left', 800); T(I.x + I.w - 14, yy + 22 * FS, solvedA ? f2(SIR.aa) + '″' : '?', 16, solvedA ? '#15803d' : '#94a3b8', 'right', 800);
    if (!PHONE) drawWrap(I.x + 14, I.y + I.h - 62 * FS, '궤도면이 시선에 수직인 이상적인 쌍성이에요. 그래프나 시간 슬라이더를 움직여 보세요.', I.w - 28, 12.5, { color: '#b45309', weight: 800 });
  }
  function skDown(p) { const g = skGraph(); if (p.x >= g.ix - 8 && p.x <= g.ix + g.iw + 8 && p.y >= g.G.y && p.y <= g.G.y + g.G.h) { skMove(p); return true; } return false; }
  function skMove(p) { const g = skGraph(); SK.t = clamp(Math.round((p.x - g.ix) / g.iw * 100 * 10) / 10, 0, 100); SK.play = false; syncSlider(); updateCtl(); }
  function syncSlider() { const s = $('#sT'); s.value = SK.t; s.style.setProperty('--pct', SK.t + '%'); $('#oT').textContent = f1(SK.t) + '년'; }

  /* =========================================================
     ② 총질량: a = a″ / p, M₁ + M₂ = a³ / P²
     ========================================================= */
  function LTt() {
    return PHONE ? { R: { x: 8, y: 8, w: 464, h: 262 }, F: { x: 8, y: 278, w: 464, h: 286 }, B: { x: 8, y: 572, w: 464, h: 280 } }
      : { R: { x: 10, y: 8, w: 780, h: 252 }, F: { x: 10, y: 268, w: 400, h: 344 }, B: { x: 418, y: 268, w: 372, h: 344 } };
  }
  const ttSand = () => ({ M: Math.pow(TT.a, 3) / (TT.P * TT.P) });
  function sunIcons(x, y, M, r, maxN) {
    const nFull = Math.floor(Math.min(M, maxN) + 1e-9), fr = M >= maxN ? 0 : M - nFull;
    for (let i = 0; i < nFull; i++) { D.glow(x + i * (r * 2.3), y, r * 1.9, '#ffd447', 0.5); D.sphere(x + i * (r * 2.3), y, r, '#ffb703', { gloss: true, light: '#fff3b0', dark: '#e07b00' }); }
    if (fr > 0.02) { const rr_ = Math.max(2.5, r * Math.sqrt(fr)); D.sphere(x + nFull * (r * 2.3), y, rr_, '#ffb703', { gloss: false, light: '#fff3b0', dark: '#e07b00' }); }
  }
  function drawTotal(dt, t) {
    const { R, F, B } = LTt();
    TT.prog = approach(TT.prog, 1, dt, 0.9);
    // ---- 눈금자
    panel(R.x, R.y, R.w, R.h, { r: 14 });
    T(R.x + 14, R.y + 24 * FS, PHONE ? '📏 하늘의 각을 AU로 (p = 1 AU가 차지하는 각)' : '📏 하늘의 각을 AU로: 연주시차 p는 1 AU가 하늘에서 차지하는 각이에요', PHONE ? 11 : 13.5, '#1e293b', 'left', 800);
    const bx = R.x + 22, bw = R.w - 44, by = R.y + (PHONE ? 72 : 92) * FS, bh = 40, unit = bw * SIR.p / SIR.aa, nU = SIR.a;
    // a″ 괄호
    ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx, by - 18); ctx.lineTo(bx, by - 8); ctx.moveTo(bx, by - 13); ctx.lineTo(bx + bw, by - 13); ctx.moveTo(bx + bw, by - 18); ctx.lineTo(bx + bw, by - 8); ctx.stroke();
    T(bx + bw / 2, by - 22, '하늘에서 잰 긴반지름 a″ = ' + f2(SIR.aa) + '″', PHONE ? 12.5 : 14, '#0369a1', 'center', 800);
    // 칸
    const shown = TT.prog * nU;
    ctx.save(); rr(bx, by, bw, bh, 8); ctx.clip();
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(bx, by, bw, bh);
    for (let k = 0; k < Math.ceil(nU); k++) {
      const w1 = Math.min(unit, bw - k * unit), fillw = Math.min(clamp(shown - k, 0, 1) * unit, w1);
      ctx.fillStyle = k % 2 ? '#7dd3fc' : '#38bdf8'; if (k === 0) ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx + k * unit, by, fillw, bh);
    }
    ctx.restore();
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; rr(bx, by, bw, bh, 8).stroke();
    for (let k = 1; k < Math.ceil(nU); k++) { const x = bx + k * unit; if (x > bx + bw - 1) break; ctx.strokeStyle = 'rgba(15,23,42,.55)'; ctx.lineWidth = k % 5 === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x, by + (k % 5 === 0 ? 0 : bh * 0.45)); ctx.lineTo(x, by + bh); ctx.stroke(); if (k % 5 === 0 && shown >= k) T(x, by + bh + 16 * FS, k + ' AU', 11.5, '#334155', 'center', 800); }
    // 첫 칸 = p = 1 AU
    D.sphere(bx + unit * 0.5, by + bh / 2, Math.min(9, unit * 0.34), '#ffb703', { gloss: false });
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + unit * 0.5, by + bh + 4); ctx.lineTo(bx + unit * 0.5, by + bh + 22 * FS + 6); ctx.stroke();
    T(bx + 4, by + bh + 40 * FS, '첫 칸 = p = ' + f4(SIR.p) + '″ ↔ 1 AU', PHONE ? 11.5 : 13, '#b45309', 'left', 800);
    // 계산 식
    const a_ok = TT.aOk || FREE();
    const fy = R.y + R.h - 36 * FS;
    T(R.x + R.w / 2, fy, 'a = a″ / p = ' + f2(SIR.aa) + ' / ' + f4(SIR.p) + ' = ' + (a_ok ? f1(SIR.a) + ' AU' : '? AU'), PHONE ? 15 : 18, a_ok ? '#15803d' : '#334155', 'center', 800);
    T(R.x + R.w / 2, fy + 20 * FS, PHONE ? 'a″ 안에 p가 몇 번 들어가는지가 AU 길이예요.' : 'p 한 칸이 1 AU이므로, a″ 안에 p가 몇 번 들어가는지가 AU 단위의 길이예요.', PHONE ? 11 : 12.5, '#64748b', 'center', 700);
    // ---- 케플러 제3법칙
    panel(F.x, F.y, F.w, F.h, { r: 14 });
    T(F.x + 14, F.y + 24 * FS, '📘 케플러 제3법칙을 쌍성에', 14.5, '#1e293b', 'left', 800);
    T(F.x + F.w / 2, F.y + 62 * FS, 'M₁ + M₂ = a³ / P²', PHONE ? 22 : 26, '#0369a1', 'center', 800);
    T(F.x + F.w / 2, F.y + 84 * FS, '(a: AU, P: 년, 질량: 태양 질량 M☉)', 12, '#64748b', 'center', 700);
    const m_ok = TT.mOk || FREE();
    const rows = [
      ['긴반지름 a', a_ok ? f1(SIR.a) + ' AU' : '?', a_ok],
      ['a³', a_ok ? sci(Math.pow(SIR.a, 3), 1) : '?', a_ok],
      ['주기 P = ' + f1(SIR.P) + '년  →  P²', f0(SIR.P * SIR.P), true],
      ['M₁ + M₂ = a³ / P²', m_ok ? f2(SIR.Mk) + ' M☉' : '?', m_ok],
    ];
    let yy = F.y + (PHONE ? 124 : 118 * FS);
    rows.forEach((r, i) => { T(F.x + 16, yy, r[0], PHONE ? 12.5 : 14, '#475569', 'left', 800); T(F.x + F.w - 16, yy, r[1], PHONE ? 14 : 16, r[2] ? (i === 3 ? '#15803d' : '#1e293b') : '#94a3b8', 'right', 800); yy += PHONE ? 27 : 32 * FS; });
    ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(F.x + 14, yy - 14); ctx.lineTo(F.x + F.w - 14, yy - 14); ctx.stroke(); ctx.setLineDash([]);
    drawWrap(F.x + 16, yy + 6, PHONE ? '확인: 지구–태양(a = 1, P = 1)이면 1³/1² = 1 M☉' : '확인: 지구–태양 a = 1 AU, P = 1년이면 1³ / 1² = 1 M☉ (태양 질량)이에요.', F.w - 32, 12.5, { color: '#0f766e', weight: 800 });
    if (m_ok) { sunIcons(F.x + 26, F.y + F.h - (PHONE ? 24 : 30 * FS), SIR.Mk, PHONE ? 10 : 11, 5); T(F.x + F.w - 16, F.y + F.h - (PHONE ? 18 : 25 * FS), '태양 약 ' + f1(SIR.Mk) + '개 질량', 12.5, '#b45309', 'right', 800); }
    // ---- 슬라이더 실험
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '🎚 a와 P를 바꿔 보기', 14.5, '#1e293b', 'left', 800);
    if (S.flags.box || FREE()) {
      const sd = ttSand(), ratio = sd.M / M0S;
      const r2 = [['a', f1(TT.a) + ' AU'], ['a³', sci(Math.pow(TT.a, 3), 2)], ['P', f1(TT.P) + ' 년'], ['P²', f0(TT.P * TT.P)]];
      let y2 = B.y + (PHONE ? 62 : 54 * FS);
      r2.forEach((r) => { T(B.x + 16, y2, r[0], 13.5, '#475569', 'left', 800); T(B.x + B.w - 16, y2, r[1], 14.5, '#1e293b', 'right', 800); y2 += PHONE ? 28 : 26 * FS; });
      T(B.x + 16, y2 + 6, 'M₁ + M₂', 14, '#475569', 'left', 800); T(B.x + B.w - 16, y2 + 6, f1(sd.M) + ' M☉', 18, '#15803d', 'right', 800);
      D.label(B.x + B.w / 2, y2 + (PHONE ? 36 : 36 * FS), '처음(시리우스 값)의 ' + f1(ratio) + '배', { bg: '#0369a1', size: PHONE ? 12.5 : 13.5 });
      sunIcons(B.x + 26, B.y + B.h - (PHONE ? 46 : 34 * FS), sd.M, 10, 8);
      if (sd.M > 8) T(B.x + B.w - 14, B.y + B.h - (PHONE ? 14 : 12 * FS), '(태양 그림은 8개까지만 그려요)', 11, '#64748b', 'right', 700);
    } else drawWrap(B.x + 16, B.y + 60 * FS, 'a와 P를 바꿔 총질량이 어떻게 변하는지 알아보는 슬라이더 실험이에요. 세 번째 미션에서 열려요.', B.w - 32, 13.5, { color: '#64748b' });
  }
  const f4 = (x) => (Math.round(x * 10000) / 10000).toFixed(4);

  /* =========================================================
     ③ 개별 질량: 질량 중심 시소
     ========================================================= */
  function LCm() {
    return PHONE ? { O: { x: 8, y: 8, w: 464, h: 356 }, W: { x: 8, y: 372, w: 464, h: 232 }, F: { x: 8, y: 612, w: 464, h: 240 } }
      : { O: { x: 10, y: 8, w: 470, h: 402 }, W: { x: 488, y: 8, w: 302, h: 402 }, F: { x: 10, y: 418, w: 780, h: 194 } };
  }
  function cmData() {
    const d = CMD[CM.sel];
    if (CM.sel === 2) { const tot = SIR.Mk, M1 = CM.mA, M2 = tot - CM.mA; return Object.assign({}, d, { M1, M2, a1: SIR.a * M2 / tot, a2: SIR.a * M1 / tot }); }
    return d;
  }
  const cmSolved = () => (CM.sel === 0 ? CM.ok : CM.sel === 1 ? CM.okX : false) || FREE() || CM.sel === 2;
  const mR = (M) => 5 + 7 * Math.pow(M, 0.6);
  function drawCm(dt, t) {
    const { O, W, F } = LCm(), d = cmData(), solved = cmSolved();
    CM.ph += dt * TAU / (RM ? 1e9 : 9);
    CM.a1 = approach(CM.a1, d.a1, dt, 7); CM.a2 = approach(CM.a2, d.a2, dt, 7);
    const Rpx = Math.min(O.w, O.h) / 2 - 38 * FS;
    CM.sc = approach(CM.sc, Rpx / d.maxR, dt, 6);
    const s = CM.sc, cx = O.x + O.w / 2, cy = O.y + O.h / 2 + 4;
    // ---- 궤도
    darkBox(O, t);
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.setLineDash([5, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, CM.a1 * s, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, CM.a2 * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const ph = CM.ph, bx = cx + CM.a2 * s * Math.cos(ph), by = cy - CM.a2 * s * Math.sin(ph), ax = cx - CM.a1 * s * Math.cos(ph), ay = cy + CM.a1 * s * Math.sin(ph);
    line([[ax, ay], [cx, cy]], '#f59e0b', 3.5); line([[cx, cy], [bx, by]], '#38bdf8', 3.5);
    D.label(O.x + O.w - 12, O.y + O.h - 50, 'a₁ = ' + d.fmt(d.a1) + ' AU  (' + d.n1 + ' → 질량 중심)', { bg: '#b45309', size: PHONE ? 11.5 : 12.5, pad: 7, align: 'right' });
    D.label(O.x + O.w - 12, O.y + O.h - 24, 'a₂ = ' + d.fmt(d.a2) + ' AU  (질량 중심 → ' + d.n2 + ')', { bg: '#0369a1', size: PHONE ? 11.5 : 12.5, pad: 7, align: 'right' });
    const M1 = d.M1, M2 = d.M2, r1 = mR(M1), r2 = mR(M2);
    D.glow(ax, ay, r1 * 2.6, '#fde047', 0.45); D.sphere(ax, ay, r1, '#fbbf24', { gloss: true, light: '#fff3b0', dark: '#d97706' });
    D.glow(bx, by, r2 * 2.4, '#93c5fd', 0.45); D.sphere(bx, by, r2, '#93c5fd', { gloss: true, light: '#ffffff', dark: '#3b82f6' });
    outlineT(ax, ay + 4, d.n1, 12, '#451a03', 'center'); outlineT(bx, by + 4, d.n2, 12, '#0c2a5b', 'center');
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();
    outlineT(cx + 10, cy + 20, '질량 중심', 12, '#f8fafc', 'left');
    // 축척 막대
    const bl = d.bar * s; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(O.x + 16, O.y + O.h - 26); ctx.lineTo(O.x + 16 + bl, O.y + O.h - 26); ctx.moveTo(O.x + 16, O.y + O.h - 31); ctx.lineTo(O.x + 16, O.y + O.h - 21); ctx.moveTo(O.x + 16 + bl, O.y + O.h - 31); ctx.lineTo(O.x + 16 + bl, O.y + O.h - 21); ctx.stroke();
    outlineT(O.x + 16 + bl + 8, O.y + O.h - 21, d.bar + ' AU', 12, '#e2e8f0', 'left');
    ctx.restore();
    outlineT(O.x + 14, O.y + 24 * FS, '🌌 ' + d.name + ': 질량 중심 둘레를 도는 두 별 (위에서 본 모습)', PHONE ? 11.5 : 13, '#e2e8f0', 'left');
    outlineT(O.x + O.w - 12, O.y + 42 * FS, '원 궤도로 단순화했어요', 11, '#93a4c3', 'right');
    // ---- 시소
    panel(W.x, W.y, W.w, W.h, { r: 14 });
    T(W.x + 14, W.y + 24 * FS, '⚖ 질량 중심 = 받침점', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const Lb = W.w - 80, sx0 = W.x + 40, sy = W.y + (PHONE ? 78 : W.h * 0.42), sw = Lb / d.a, px = sx0 + CM.a1 * sw;
    CM.wob *= Math.exp(-3 * dt); const tilt = Math.sin(t * 9) * CM.wob;
    ctx.save(); ctx.translate(px, sy); ctx.rotate(tilt); ctx.translate(-px, -sy);
    D.shadow(() => { ctx.fillStyle = '#a16207'; rr(sx0 - 10, sy - 5, Lb + 20, 10, 5).fill(); }, { blur: 4, y: 2 });
    const wy = (rad) => sy - 5 - rad;
    D.sphere(sx0, wy(r1), r1, '#fbbf24', { gloss: true, light: '#fff3b0', dark: '#d97706' }); D.sphere(sx0 + Lb, wy(r2), r2, '#93c5fd', { gloss: true, light: '#ffffff', dark: '#3b82f6' });
    T(sx0, wy(r1) + 4, d.n1, 11.5, '#451a03', 'center', 800); T(sx0 + Lb, wy(r2) + 4, d.n2, 11.5, '#0c2a5b', 'center', 800);
    ctx.restore();
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(px, sy + 5); ctx.lineTo(px - 18, sy + 44); ctx.lineTo(px + 18, sy + 44); ctx.closePath(); ctx.fill();
    // a1, a2 화살표
    D.arrow(px - 3, sy + (PHONE ? 46 : 62), sx0, sy + (PHONE ? 46 : 62), { color: '#b45309', width: 2.5, head: 8 }); D.arrow(px + 3, sy + (PHONE ? 46 : 62), sx0 + Lb, sy + (PHONE ? 46 : 62), { color: '#0369a1', width: 2.5, head: 8 });
    T((px + sx0) / 2, sy + (PHONE ? 68 : 82), 'a₁ ' + d.fmt(d.a1), 12.5, '#b45309', 'center', 800); T((px + sx0 + Lb) / 2, sy + (PHONE ? 68 : 82), 'a₂ ' + d.fmt(d.a2), 12.5, '#0369a1', 'center', 800);
    const ms1 = solved ? f2(M1) : '?', ms2 = solved ? f2(M2) : '?';
    T(W.x + W.w / 2, W.y + W.h - 52 * FS, 'M₁ a₁ = M₂ a₂', PHONE ? 15 : 17, '#0369a1', 'center', 800);
    T(W.x + W.w / 2, W.y + W.h - 22 * FS, 'M(' + d.n1 + ') = ' + ms1 + ' M☉,  M(' + d.n2 + ') = ' + ms2 + ' M☉', PHONE ? 12 : 13.5, solved ? '#15803d' : '#64748b', 'center', 800);
    // ---- 계산 흐름
    panel(F.x, F.y, F.w, F.h, { r: 14 });
    T(F.x + 14, F.y + 24 * FS, '🧮 질량을 나누는 순서', 14.5, '#1e293b', 'left', 800);
    const boxes = PHONE ? [[F.x + 10, F.y + 38, F.w - 20, 62], [F.x + 10, F.y + 106, F.w - 20, 62], [F.x + 10, F.y + 174, F.w - 20, 60]] : [[F.x + 12, F.y + 40, 244, 138], [F.x + 268, F.y + 40, 244, 138], [F.x + 524, F.y + 40, 244, 138]];
    const totTxt = CM.sel === 1 && !solved ? '?' : f2(d.tot) + ' M☉';
    const items = [
      ['① 총질량', 'M₁ + M₂ = a³ / P²', (CM.sel === 1 ? '10³ / 20² = ' : (CM.sel === 0 ? 'a = ' + f1(SIR.a) + ', P = ' + f1(SIR.P) + ' → ' : 'a = ' + f1(SIR.a) + ', P = ' + f1(SIR.P) + ' → ')) + totTxt],
      ['② 질량의 비', 'M₁ : M₂ = a₂ : a₁', d.fmt(d.a2) + ' : ' + d.fmt(d.a1) + '  ≈  ' + f2(d.a2 / d.a1) + ' : 1'],
      ['③ 나누기', 'M₁ = M합 × a₂ / a,  M₂ = M합 × a₁ / a', solved ? 'M₁ = ' + f2(M1) + ',  M₂ = ' + f2(M2) + ' M☉' : 'M₁ = ?,  M₂ = ?'],
    ];
    boxes.forEach((b, i) => {
      ctx.fillStyle = i === 2 && solved ? '#ecfdf3' : '#f1f5f9'; rr(b[0], b[1], b[2], b[3], 12).fill(); ctx.strokeStyle = i === 2 && solved ? '#86efac' : '#cbd5e1'; ctx.lineWidth = 1.5; rr(b[0], b[1], b[2], b[3], 12).stroke();
      T(b[0] + 12, b[1] + 22 * FS, items[i][0], PHONE ? 13 : 14, '#0369a1', 'left', 800);
      if (PHONE) { T(b[0] + b[2] - 12, b[1] + 22 * FS, items[i][1], 11.5, '#475569', 'right', 800); T(b[0] + 12, b[1] + b[3] - 12 * FS, items[i][2], 12.5, '#1e293b', 'left', 800); }
      else { drawWrap(b[0] + 12, b[1] + 46 * FS, items[i][1], b[2] - 24, 13, { color: '#475569', weight: 800 }); drawWrap(b[0] + 12, b[1] + 96 * FS, items[i][2], b[2] - 24, 13.5, { color: i === 2 && solved ? '#15803d' : '#1e293b', weight: 800 }); }
    });
    if (!PHONE) { T(F.x + 262, F.y + 114, '→', 22, '#94a3b8', 'center', 800); T(F.x + 518, F.y + 114, '→', 22, '#94a3b8', 'center', 800); }
  }

  /* =========================================================
     ④ 자료표 + 이상적 조건의 한계
     ========================================================= */
  function LTb() {
    return PHONE ? { T: { x: 8, y: 8, w: 464, h: 346 }, Q: { x: 8, y: 362, w: 464, h: 490 } } : { T: { x: 10, y: 8, w: 780, h: 316 }, Q: { x: 10, y: 332, w: 780, h: 280 } };
  }
  function tbCols(Tr) {
    const w = Tr.w - 24, f = PHONE ? [0.26, 0.12, 0.14, 0.17, 0.14, 0.17] : [0.26, 0.11, 0.13, 0.14, 0.17, 0.19];
    let x = Tr.x + 12; return f.map((k) => { const c = { x, w: w * k }; x += w * k; return c; });
  }
  const tbRowRect = (i) => { const { T: Tr } = LTb(), rh = PHONE ? 48 : 46, y0 = Tr.y + 78 * FS; return { x: Tr.x + 8, y: y0 + i * (rh + 4), w: Tr.w - 16, h: rh }; };
  function drawTable(dt, t) {
    const { T: Tr, Q } = LTb(), cols = tbCols(Tr);
    panel(Tr.x, Tr.y, Tr.w, Tr.h, { r: 14 });
    T(Tr.x + 14, Tr.y + 24 * FS, '📋 쌍성 자료표: a = a″ / p,  M₁ + M₂ = a³ / P²', PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    const heads = ['쌍성', 'P (년)', 'a″ (″)', 'p (″)', 'a (AU)', 'M합 (M☉)'];
    heads.forEach((h, i) => T(cols[i].x + cols[i].w / 2, Tr.y + 62 * FS, h, PHONE ? 11.5 : 13, '#475569', 'center', 800));
    BIN.forEach((b, i) => {
      const rr_ = tbRowRect(i), sel = TB.sel === i, done = TB.done[i];
      TB.pop[i] = approach(TB.pop[i], 0, dt, 5);
      ctx.fillStyle = done ? '#ecfdf3' : sel ? '#fff7e0' : '#f8fafc'; rr(rr_.x, rr_.y, rr_.w, rr_.h, 10).fill();
      ctx.strokeStyle = done ? '#86efac' : sel ? '#f59e0b' : '#e2e8f0'; ctx.lineWidth = sel ? 3 : 1.5; rr(rr_.x, rr_.y, rr_.w, rr_.h, 10).stroke();
      if (TB.pop[i] > 0.02) { ctx.strokeStyle = rgba('#14a058', TB.pop[i]); ctx.lineWidth = 5; rr(rr_.x - 3, rr_.y - 3, rr_.w + 6, rr_.h + 6, 12).stroke(); }
      const cy = rr_.y + rr_.h / 2 + 5;
      T(cols[0].x + 4, cy, PHONE ? b.sn : b.n, PHONE ? 12 : 13.5, '#1e293b', 'left', 800);
      T(cols[1].x + cols[1].w / 2, cy, b.pt, PHONE ? 12.5 : 14, '#334155', 'center', 700);
      T(cols[2].x + cols[2].w / 2, cy, f2(b.aa), PHONE ? 12.5 : 14, '#334155', 'center', 700);
      T(cols[3].x + cols[3].w / 2, cy, f4(b.p), PHONE ? 12 : 14, '#334155', 'center', 700);
      const aShow = TB.aOk[i] || FREE(), mShow = TB.mOk[i] || FREE();
      T(cols[4].x + cols[4].w / 2, cy, aShow ? f1(b.a) : '?', PHONE ? 13 : 15, aShow ? '#15803d' : sel ? '#b45309' : '#94a3b8', 'center', 800);
      T(cols[5].x + cols[5].w / 2, cy, mShow ? f2(b.M) : '?', PHONE ? 13 : 15, mShow ? '#15803d' : sel ? '#b45309' : '#94a3b8', 'center', 800);
      if (done) D.check(rr_.x + rr_.w - 16, rr_.y + 14, 9, 1);
    });
    const allDone = TB.done.every(Boolean);
    drawWrap(Tr.x + 14, Tr.y + Tr.h - 24 * FS, allDone || FREE() ? '📥 질량 자료를 모두 얻었어요. 이 값들은 다음 차시 질량-광도 관계의 바탕이 돼요.' : '표의 줄을 눌러 고르고 a(AU)와 M합(M☉)을 입력하세요.', Tr.w - 28, PHONE ? 12 : 13, { color: allDone ? '#15803d' : '#b45309', weight: 800 });
    // ---- 기울어진 궤도
    panel(Q.x, Q.y, Q.w, Q.h, { r: 14 });
    T(Q.x + 14, Q.y + 24 * FS, '📐 이상적인 조건의 한계: 궤도면이 기울어지면?', PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    const inc = TB.inc * DEG, cs = Math.cos(inc), bsm = SIR.aa * Math.sqrt(1 - ECC * ECC);
    const app = Math.max(SIR.aa * cs, bsm), mWrong = SIR.Mk * Math.pow(app / SIR.aa, 3);
    const dgw = PHONE ? Q.w - 20 : 360, dgh = PHONE ? 200 : Q.h - 50, dx = Q.x + 10, dy = Q.y + 38 * FS;
    ctx.fillStyle = '#0b1230'; rr(dx, dy, dgw, dgh, 12).fill();
    ctx.save(); rr(dx, dy, dgw, dgh, 12); ctx.clip(); spaceBg(dx, dy, dgw, dgh, t, '#0b1230', '#16224a');
    const sQ = Math.min((dgh - 24) / 15, (dgw - 24) / 12.5), ox = dx + dgw / 2, oy = dy + 12 + 3 * sQ + (dgh - 24 - 15 * sQ) / 2;
    const tr = (p) => [ox + sQ * p[0], oy - sQ * p[1]];
    ctx.setLineDash([5, 5]); line(orbitPts(1, 120).map(tr), 'rgba(148,163,184,.8)', 1.6); ctx.setLineDash([]);
    line(orbitPts(1, 120).map((p) => tr([p[0], p[1] * cs])), '#38bdf8', 2.8);
    const qB = relPos(SK.t + t * 8 % 100), bxy = tr([qB.x, qB.y * cs]);
    D.glow(ox, oy, 30, '#dbeafe', 0.7); D.sphere(ox, oy, 8, '#eef4ff', { gloss: true, light: '#fff', dark: '#9db8ee' }); D.sphere(bxy[0], bxy[1], 4.5, '#cfe0ff', { gloss: false });
    outlineT(dx + 8, dy + 18, '회색 점선: 실제 궤도 · 파란 선: 하늘에 보이는 궤도', 11, '#cbd5e1', 'left');
    ctx.restore();
    const tx = PHONE ? Q.x + 14 : dx + dgw + 18, tw = PHONE ? Q.w - 28 : Q.w - dgw - 40;
    let ty = PHONE ? dy + dgh + 24 * FS : Q.y + 58 * FS;
    const rowsQ = [['기울기 i', f0(TB.inc) + '°'], ['실제 긴반지름 a″', f2(SIR.aa) + '″'], ['보이는 궤도의 긴반지름', f2(app) + '″'], ['이 값으로 구한 질량', f2(mWrong) + ' M☉'], ['실제 총질량', f2(SIR.Mk) + ' M☉']];
    rowsQ.forEach((r, i) => { T(tx, ty, r[0], PHONE ? 12.5 : 13.5, '#475569', 'left', 800); T(tx + tw, ty, r[1], PHONE ? 14 : 15, i === 3 && TB.inc > 0 ? '#c2410c' : '#1e293b', 'right', 800); ty += (PHONE ? 21 : 28) * FS; });
    drawWrap(tx, ty + 6, TB.inc === 0 ? 'i = 0°: 궤도면이 시선에 수직이라 보이는 모양이 실제 궤도예요. 슬라이더로 기울여 보세요.' : '기울어지면 보이는 궤도가 찌그러져 긴반지름이 실제보다 작게 보여서, 그 값으로 구한 질량도 작게 나와요.', tw, PHONE ? 12 : 12.5, { color: '#b45309', weight: 800 });
  }
  function tbDown(p) { for (let i = 0; i < 4; i++) { const r = tbRowRect(i); if (inR(p, r)) { selRow(i); return false; } } return false; }
  function selRow(i) {
    TB.sel = i; clrIn('inTa', 'inTM'); const b = BIN[i];
    if (TB.aOk[i]) { $('#inTa').value = f1(b.a); fbIn('inTa', true); } if (TB.mOk[i]) { $('#inTM').value = f2(b.M); fbIn('inTM', true); }
    updateCtl();
  }

  /* ================= 화면 전환 · 조작 ================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); if (v === 'total') TT.prog = 0; if (v === 'cm') CM.wob = 0.06; }
    updateCtl();
  }
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcSky').hidden = !(S.view === 'sky' && (S.flags.calcSky || free));
    $('#calcTotal').hidden = !(S.view === 'total' && (S.flags.calcTotal || free));
    $('#boxTotal').hidden = !(S.view === 'total' && (S.flags.box || free));
    $('#noteTotal').hidden = !(S.view === 'total' && !(S.flags.calcTotal || free));
    $('#calcCm').hidden = !(S.view === 'cm' && (S.flags.calcCm || free) && CM.sel !== 2);
    $('#expCm').hidden = !(S.view === 'cm' && (S.flags.expCm || free) && CM.sel === 2);
    $('#bExp').hidden = !(S.flags.expCm || free);
    $('#calcTb').hidden = !(S.view === 'table' && (S.flags.calcTb || free));
    $('#tiltTb').hidden = !(S.view === 'table' && (S.flags.tilt || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $('#bPlay').textContent = SK.play ? '⏸ 멈추기' : '▶ 재생';
    $$('#grpFrame .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === SK.mode));
    $$('#grpCm .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === CM.sel));
    $$('#grpRow .opt').forEach((b) => { const k = +b.dataset.k; b.classList.toggle('on', k === TB.sel); b.classList.toggle('done', TB.done[k]); });
    const d = CMD[CM.sel];
    $('#lbM1').textContent = CM.sel === 1 ? 'M₁ (M☉)  별 1' : 'M_A (M☉)'; $('#lbM2').textContent = CM.sel === 1 ? 'M₂ (M☉)  별 2' : 'M_B (M☉)';
    $('#inM1').placeholder = '숫자 입력'; $('#inM2').placeholder = '숫자 입력';
  }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  sl('#sT', '#oT', (v) => f1(v) + '년', (v) => { SK.t = v; SK.play = false; updateCtl(); });
  sl('#sSa', '#oSa', (v) => f1(v) + ' AU', (v) => { TT.a = v; });
  sl('#sSp', '#oSp', (v) => f1(v) + '년', (v) => { TT.P = v; });
  sl('#sQ', '#oQ', (v) => f2(v) + ' M☉', (v) => { CM.mA = v; CM.wob = 0.05; });
  sl('#sInc', '#oInc', (v) => f0(v) + '°', (v) => { TB.inc = v; });
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  clickable($('#bPlay'), () => { SK.play = !SK.play; updateCtl(); });
  $$('#grpFrame .opt').forEach((b) => clickable(b, () => { SK.mode = +b.dataset.k; updateCtl(); }));
  $$('#grpCm .opt').forEach((b) => clickable(b, () => { CM.sel = +b.dataset.k; CM.wob = 0.06; clrIn('inM1', 'inM2'); updateCtl(); }));
  $$('#grpRow .opt').forEach((b) => clickable(b, () => selRow(+b.dataset.k)));
  /* 입력 칸 검사 */
  $('#inP').addEventListener('input', () => { const v = numOf('inP'); SK.pOk = v != null && near(v, SIR.P, 1.3); chkIn('inP', SK.pOk); });
  $('#inAa').addEventListener('input', () => { const v = numOf('inAa'); SK.aOk = v != null && near(v, SIR.aa, 0.3); chkIn('inAa', SK.aOk); });
  $('#inA').addEventListener('input', () => { const v = numOf('inA'); const was = TT.aOk; TT.aOk = v != null && nearRel(v, SIR.a, 0.02); chkIn('inA', TT.aOk); if (TT.aOk && !was) ptsBurst(VW / 2, LTt().R.y + 150); });
  $('#inMt').addEventListener('input', () => { const v = numOf('inMt'); const was = TT.mOk; TT.mOk = v != null && nearRel(v, SIR.Mk, 0.04); chkIn('inMt', TT.mOk); if (TT.mOk && !was) { const F = LTt().F; ptsBurst(F.x + F.w / 2, F.y + F.h - 40); } });
  const cm1 = () => { const d = CMD[CM.sel]; const v = numOf('inM1'), w = numOf('inM2'); return { v, w, d }; };
  function cmCheck() {
    const { v, w, d } = cm1();
    const tolA = CM.sel === 0 ? 0.1 : 0.08, tolB = CM.sel === 0 ? 0.08 : 0.08;
    const ok1 = v != null && near(v, d.M1, tolA), ok2 = w != null && near(w, d.M2, tolB);
    chkIn('inM1', ok1); chkIn('inM2', ok2);
    const was = CM.sel === 0 ? CM.ok : CM.okX;
    if (CM.sel === 0) CM.ok = ok1 && ok2; else if (CM.sel === 1) CM.okX = ok1 && ok2;
    if (ok1 && ok2 && !was) ptsBurst(LCm().W.x + LCm().W.w / 2, LCm().W.y + 150);
  }
  $('#inM1').addEventListener('input', cmCheck); $('#inM2').addEventListener('input', cmCheck);
  function tbCheck() {
    const i = TB.sel, b = BIN[i]; if (TB.done[i]) return;
    const a = numOf('inTa'), M = numOf('inTM');
    TB.aOk[i] = a != null && nearRel(a, b.a, 0.015); TB.mOk[i] = M != null && nearRel(M, b.M, 0.05);
    chkIn('inTa', TB.aOk[i]); chkIn('inTM', TB.mOk[i]);
    if (TB.aOk[i] && TB.mOk[i]) {
      TB.done[i] = true; TB.pop[i] = 1; const r = tbRowRect(i); ptsBurst(r.x + r.w / 2, r.y + r.h / 2); Sound.success();
      const nxt = [0, 1, 2, 3].find((k) => !TB.done[k]);
      if (nxt != null) setTimeout(() => { if (S.view === 'table' && TB.done[TB.sel]) selRow(nxt); }, 900); else updateCtl();
    } else updateCtl();
  }
  $('#inTa').addEventListener('input', tbCheck); $('#inTM').addEventListener('input', tbCheck);

  SciSim.pointer(view, {
    down(p) { if (S.view === 'sky') return skDown(p); if (S.view === 'table') return tbDown(p); return false; },
    move(p) { if (S.view === 'sky') skMove(p); },
    up() {},
    hover(p) {
      if (S.view === 'sky') { const g = skGraph(); return p.x > g.ix && p.x < g.ix + g.iw && p.y > g.G.y && p.y < g.G.y + g.G.h ? 'ew-resize' : ''; }
      if (S.view === 'table') { for (let i = 0; i < 4; i++) if (inR(p, tbRowRect(i))) return 'pointer'; }
      return '';
    },
  });

  /* ================= 미션 ================= */
  const skPick = () => SK.pOk && SK.aOk;
  const levels = [
    {
      title: '쌍성 관측: 서로의 둘레를 도는 두 별', short: '쌍성 관측', icon: '🔭', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 별을 저울에 올릴 수 없는데, 별의 질량을 어떻게 잴까?</p>' +
        '<div class="si-link">🔗 <b>이 단원 앞 차시에서</b> 연주시차로 별까지의 거리(d = 1 / p)를 구했고, <b>Ⅰ단원에서</b> 케플러 제3법칙(T² = a³ / M)을 배웠어요. 이 둘을 합치면 <b>서로의 둘레를 도는 두 별</b>의 질량을 직접 구할 수 있어요.</div>' +
        '<p>밝은 시리우스 A 곁에는 어두운 B가 있어서 약 50년에 한 바퀴씩 서로의 둘레를 돌아요. 망원경 영상을 연도별로 보며 <b>주기 P</b>와 궤도의 크기인 <b>각거리 긴반지름 a″</b>를 읽어 봐요. (이상적인 조건: 궤도면이 시선에 수직인 시각쌍성만 다뤄요.)</p>',
      features: ['sky'],
      setup() { setView('sky'); },
      recap: '쌍성의 두 별은 공통 질량 중심 둘레를 돌아요. 영상에서 주기 P와 각거리 긴반지름 a″를 읽을 수 있어요.',
      summary: '<ul><li><b>시각쌍성</b>: 망원경으로 두 별이 따로 보이는 쌍성. 여러 해에 걸쳐 영상을 찍으면 B가 A 둘레를 도는 <b>상대 궤도</b>(타원)가 그려져요.</li><li><b>주기 P</b>는 처음 자리로 돌아오는 시간, <b>긴반지름 a″</b>는 가장 가까울 때와 가장 멀 때 각거리 합의 절반이에요. 시리우스 A–B는 P = 50.1년, a″ = 7.50″예요.</li><li>두 별은 <b>공통 질량 중심</b> 둘레를 돌아요. 무거운 별은 질량 중심 가까이에서 작은 궤도를, 가벼운 별은 큰 궤도를 돌아요(큰 별도 움직여요).</li><li>이 차시는 <b>이상적인 조건</b>(궤도면이 시선에 수직)에서만 계산해요.</li></ul>',
      missions: [
        {
          title: '주기와 긴반지름 읽기',
          goal: '영상을 재생하거나 시간을 움직여 <b>주기 P(년)</b>와 상대 궤도의 <b>각거리 긴반지름 a″(″)</b>를 읽어 입력하세요.',
          hint: 'P: 각거리 그래프에서 처음 가장 작았던 때(0년)와 다음번에 가장 작은 때의 간격이에요. a″: 그래프의 가장 작은 값과 가장 큰 값을 더하면 긴지름이고, 그 절반이 긴반지름이에요.',
          setup() { SK.pOk = false; SK.aOk = false; S.flags.calcSky = true; clrIn('inP', 'inAa'); SK.mode = 0; SK.t = 0; SK.play = !RM; syncSlider(); setView('sky'); },
          check: () => skPick(),
          hold: 0.5,
          status: () => mark(SK.pOk) + ' P = ' + ($('#inP').value.trim() || '—') + ' 년 &nbsp; ' + mark(SK.aOk) + ' a″ = ' + ($('#inAa').value.trim() || '—') + ' ″',
          explain: 'P ≈ <b>50년</b>(50.1년), a″ ≈ <b>7.5″</b>예요. 가장 가까운 3″와 가장 먼 12″를 더한 15″가 긴지름이라 긴반지름은 7.5″예요. 이 각거리를 AU로 바꾸는 것은 다음 단계에서 해요.',
        },
        {
          type: 'quiz', title: '무거운 별은 가만히 있을까?',
          goal: '시리우스 A는 B보다 무거워요. 두 별의 움직임을 바르게 설명한 것은?',
          setup() { SK.mode = 1; setView('sky'); },
          choices: ['두 별 모두 공통 질량 중심 둘레를 돌아요. 무거운 A는 작은 궤도를, 가벼운 B는 큰 궤도를 돌아요', '무거운 A는 가만히 있고 가벼운 B만 A 둘레를 돌아요', '가벼운 B가 가만히 있고 A가 B 둘레를 돌아요', 'A와 B는 서로 끌어당기지 않아서 각자 직선으로 움직여요'],
          answer: 0,
          feedback: ['', '"A 기준" 화면은 A를 가운데 고정해서 본 것일 뿐이에요. "질량 중심 기준"으로 보면 A도 작은 궤도를 도는 게 보여요.', '가벼운 별이 움직이지 않는 게 아니라, 두 별 모두 질량 중심 둘레를 돌아요.', '두 별은 서로의 중력으로 묶여 있어서 질량 중심 둘레를 돌아요.'],
          explain: '두 별은 서로를 중력으로 끌어당기며 <b>공통 질량 중심</b> 둘레를 돌아요. 질량 중심은 무거운 A 쪽에 가까워서 A의 궤도는 작고 B의 궤도는 커요.',
        },
      ],
    },
    {
      title: '총질량: 케플러 제3법칙으로', short: '총질량', icon: '⚖️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시리우스의 주기 P = 50.1년과 각거리 긴반지름 a″ = 7.50″를 읽었어요. 이제 <b>연주시차</b> p = 0.3792″로 이 각을 AU로 바꾸고 케플러 제3법칙에 넣어요.</div>' +
        '<p>지구–태양은 a = 1 AU, P = 1년이고 질량은 1 M☉(태양 질량)예요. 쌍성도 같은 법칙을 따라 <b>두 별의 질량 합</b>은 <b>M₁ + M₂ = a³ / P²</b>(a: AU, P: 년, 질량: M☉)이에요.</p>',
      features: ['total'],
      setup() { setView('total'); },
      recap: 'a(AU) = a″ / p로 길이를 구하고 M₁ + M₂ = a³ / P²에 넣으면 두 별의 질량 합을 태양 질량 단위로 얻어요.',
      summary: '<ul><li><b>각 → 길이</b>: a(AU) = a″ / p. 연주시차 p는 1 AU가 하늘에서 차지하는 각이라서 a″ 안에 p가 몇 번 들어가는지가 AU 길이예요. 시리우스: 7.50 / 0.3792 = <b>19.8 AU</b>.</li><li><b>케플러 제3법칙(쌍성)</b>: M₁ + M₂ = a³ / P² (a: AU, P: 년, M: M☉). 시리우스: 19.8³ / 50.1² ≈ <b>3.1 M☉</b>(알려진 값 약 3.1).</li><li>질량 합은 <b>a의 세제곱</b>에 비례하고 <b>P의 제곱</b>에 반비례해요. 주기가 같을 때 a가 2배이면 질량 합은 8배예요.</li><li>지구–태양(a = 1, P = 1)을 넣으면 1 M☉이 되어 태양 질량이 기준이에요.</li></ul>',
      missions: [
        {
          title: '각거리를 AU로 바꾸기',
          goal: '긴반지름 a″ = 7.50″를 연주시차 p = 0.3792″로 바꿔 <b>a(AU)</b>를 입력하세요.',
          hint: 'a = a″ / p = 7.50 / 0.3792 ≈ 19.8 AU예요. 눈금자에서 첫 칸(p)이 1 AU이니 7.50″ 안에 p가 몇 번 들어가는지와 같아요.',
          setup() { TT.aOk = false; TT.mOk = false; S.flags.calcTotal = true; clrIn('inA', 'inMt'); setView('total'); },
          check: () => TT.aOk,
          hold: 0.4,
          status: () => mark(TT.aOk) + ' a = ' + ($('#inA').value.trim() || '—') + ' AU',
          explain: 'a = 7.50″ / 0.3792″ ≈ <b>19.8 AU</b>예요. 해왕성 궤도(30 AU)보다 안쪽 크기이고, 거리는 d = 1 / p = 2.64 pc예요.',
        },
        {
          title: '두 별의 질량 합 구하기',
          goal: 'a ≈ 19.8 AU, P = 50.1년을 넣어 <b>M₁ + M₂ = a³ / P²</b>(M☉)을 입력하세요.',
          hint: '19.8³ ≈ 7.8×10³(7762), 50.1² ≈ 2510이에요. 7762를 2510으로 나누면 약 3.1이에요.',
          setup() { S.flags.calcTotal = true; TT.aOk = true; $('#inA').value = f1(SIR.a); fbIn('inA', true); TT.mOk = false; clrIn('inMt'); setView('total'); },
          check: () => TT.mOk,
          hold: 0.4,
          status: () => mark(TT.aOk) + ' a 구함 &nbsp; ' + mark(TT.mOk) + ' M합 = ' + ($('#inMt').value.trim() || '—') + ' M☉',
          explain: 'M₁ + M₂ = 19.8³ / 50.1² ≈ <b>3.1 M☉</b>이에요(정확한 a를 쓰면 3.08, 19.8로 반올림하면 3.09). 태양 3개가 넘는 질량이에요.',
        },
        {
          type: 'quiz', title: 'a가 2배이면 질량 합은?',
          goal: '주기 P는 그대로이고 긴반지름 a만 2배가 되면 두 별의 질량 합은 몇 배가 될까요? (슬라이더로 확인해 보세요)',
          setup() { S.flags.box = true; TT.a = 19.8; TT.P = 50.1; setSlider($('#sSa'), $('#oSa'), 19.8, (v) => f1(v) + ' AU'); setSlider($('#sSp'), $('#oSp'), 50.1, (v) => f1(v) + '년'); setView('total'); },
          choices: ['8배 (a의 세제곱에 비례)', '2배', '4배', '16배'],
          answer: 0,
          feedback: ['', '질량 합은 a에 비례하는 것이 아니라 a³에 비례해요. 슬라이더에서 a를 2배(39.6 AU)로 해 보세요.', '4배는 a²에 비례할 때예요. 질량 합은 a³에 비례해요.', '16배는 a⁴일 때예요. 질량 합은 a³ / P²이에요.'],
          explain: 'M₁ + M₂ = a³ / P²이라 a가 2배이면 질량 합은 2³ = <b>8배</b>예요. 반대로 a가 같을 때 P가 2배이면 질량 합은 1/4배가 돼요.',
        },
      ],
    },
    {
      title: '개별 질량: 질량 중심으로 나누기', short: '개별 질량', icon: '⚖', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시리우스 A–B의 질량 합이 약 3.1 M☉임을 구했어요. 그런데 <b>A와 B 각각</b>은 몇 M☉일까요? 두 별은 질량 중심 둘레를 돌고, 질량 중심은 무거운 별 쪽에 가까워요.</div>' +
        '<p>질량 중심에서 두 별까지의 거리를 a₁, a₂라고 하면 <b>M₁ a₁ = M₂ a₂</b>, 즉 <b>M₁ : M₂ = a₂ : a₁</b>이에요. (a = a₁ + a₂) 이 비로 총질량을 나누면 각 별의 질량이 나와요. 궤도는 원으로 단순화해서 그려요.</p>',
      features: ['cm'],
      setup() { setView('cm'); },
      recap: '질량 중심에서 각 별까지의 거리는 질량에 반비례해요(M₁ a₁ = M₂ a₂). 총질량을 그 비로 나누면 각 별의 질량이에요.',
      summary: '<ul><li><b>질량 중심</b>: M₁ a₁ = M₂ a₂. 질량 중심은 <b>무거운 별 쪽</b>에 가까워서 무거운 별의 궤도가 작아요.</li><li>시리우스: 질량 중심에서 A까지 6.55 AU, B까지 13.23 AU(약 1 : 2)이므로 M_A : M_B ≈ 2 : 1. 총질량 3.08 M☉를 나누면 <b>M_A ≈ 2.06 M☉, M_B ≈ 1.02 M☉</b>(B는 백색 왜성).</li><li>연습 쌍성 X: P = 20년, a = 10 AU → M합 = 10³ / 20² = 2.5 M☉. a₁ = 4 AU, a₂ = 6 AU → M₁ : M₂ = 6 : 4 → <b>M₁ = 1.5, M₂ = 1.0 M☉</b>.</li><li>순서: ① 총질량 a³ / P² → ② 거리의 비 a₂ : a₁ → ③ 총질량을 그 비로 나누기.</li></ul>',
      missions: [
        {
          title: '시리우스 A와 B의 질량',
          goal: '질량 중심에서 A까지 <b>6.55 AU</b>, B까지 <b>13.23 AU</b>예요. 총질량 3.08 M☉를 나눠 <b>M_A</b>와 <b>M_B</b>(M☉)를 입력하세요.',
          hint: 'M_A : M_B = a₂ : a₁ = 13.23 : 6.55 ≈ 2 : 1이에요. M_A = 3.08 × 13.23 / 19.78 ≈ 2.06, M_B = 3.08 × 6.55 / 19.78 ≈ 1.02예요. (A가 질량 중심에 더 가까우니 더 무거워요.)',
          setup() { CM.sel = 0; CM.ok = false; S.flags.calcCm = true; clrIn('inM1', 'inM2'); setView('cm'); },
          check: () => CM.ok,
          hold: 0.5,
          status: () => mark(CM.ok) + ' M_A = ' + ($('#inM1').value.trim() || '—') + ', M_B = ' + ($('#inM2').value.trim() || '—') + ' M☉',
          explain: 'M_A ≈ <b>2.06 M☉</b>, M_B ≈ <b>1.02 M☉</b>예요(합 3.08). A가 질량 중심에 2배 가까우니 2배 무거워요. B는 질량이 태양과 비슷하지만 백색 왜성이라 아주 작아요.',
        },
        {
          title: '연습 쌍성 X의 질량 나누기', manual: true,
          goal: 'X는 P = 20년, a = 10 AU이고 질량 중심에서 별 1까지 a₁ = 4 AU, 별 2까지 a₂ = 6 AU예요. 총질량을 구한 뒤 <b>M₁, M₂</b>(M☉)를 입력하고 확인하세요.',
          hint: '① M합 = 10³ / 20² = 1000 / 400 = 2.5 M☉ ② M₁ : M₂ = a₂ : a₁ = 6 : 4 = 3 : 2 ③ M₁ = 2.5 × 3/5 = 1.5, M₂ = 2.5 × 2/5 = 1.0 (거리가 짧은 별 1이 더 무거워요.)',
          setup() { CM.sel = 1; CM.okX = false; S.flags.calcCm = true; clrIn('inM1', 'inM2'); setView('cm'); },
          check() {
            if (CM.okX) return true;
            if (numOf('inM1') == null || numOf('inM2') == null) return 'M₁과 M₂를 모두 입력해 주세요.';
            return '아직 알맞지 않아요. 먼저 M합 = a³ / P²을 구하고, M₁ : M₂ = a₂ : a₁ = 6 : 4로 나눠 보세요.';
          },
          status: () => mark(CM.okX) + ' M₁ = ' + ($('#inM1').value.trim() || '—') + ', M₂ = ' + ($('#inM2').value.trim() || '—') + ' M☉',
          explain: 'M합 = 10³ / 20² = <b>2.5 M☉</b>, 거리의 비 6 : 4에서 <b>M₁ = 1.5, M₂ = 1.0 M☉</b>예요. 질량 중심에 더 가까운 별 1이 더 무거워요.',
        },
        {
          type: 'quiz', title: '질량 중심은 어느 쪽에 가까울까?',
          goal: '두 별의 질량 합을 일정하게 두고 별 A의 질량 슬라이더를 움직여 보세요. 질량 중심은 어느 별 쪽에 더 가까운가요?',
          setup() { CM.sel = 2; S.flags.expCm = true; setSlider($('#sQ'), $('#oQ'), 2.05, (v) => f2(v) + ' M☉'); CM.mA = 2.05; setView('cm'); },
          choices: ['더 무거운 별 쪽에 가까워요', '더 가벼운 별 쪽에 가까워요', '항상 두 별의 한가운데에 있어요', '더 밝은 별 쪽에 가까워요'],
          answer: 0,
          feedback: ['', 'M₁ a₁ = M₂ a₂이므로 무거운 별의 거리 a가 작아요. 가벼운 쪽이 아니라 무거운 쪽이에요.', '두 별의 질량이 같을 때만 한가운데예요. 슬라이더를 움직이면 받침점(질량 중심)이 이동해요.', '질량 중심은 밝기가 아니라 질량으로 정해져요.'],
          explain: 'M₁ a₁ = M₂ a₂에서 질량이 클수록 질량 중심까지의 거리가 짧아요. 시소의 받침점이 <b>무거운 쪽</b>에 가까운 것과 같아요.',
        },
      ],
    },
    {
      title: '자료표: 쌍성 4개의 질량', short: '자료표', icon: '📋', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 각거리 → AU → 총질량 → 개별 질량의 순서를 익혔어요. 이번에는 같은 방법을 <b>실제 쌍성 4개</b>에 적용해 자료표를 채워요.</div>' +
        '<p>쌍성마다 P, a″, 시차 p가 달라요. 질량을 구해 두면 다음 차시에서 <b>질량-광도 관계</b>를 찾는 데 써요. 마지막으로 이상적인 조건(경사각 0°)이 아니면 어떤 문제가 생기는지 알아봐요.</p>',
      features: ['table'],
      setup() { setView('table'); },
      recap: '같은 방법으로 쌍성 4개의 질량 합을 구했어요. 궤도면이 기울어져 있으면 경사각을 보정해야 정확한 질량을 얻어요.',
      summary: '<ul><li>자료표(a = a″ / p, M합 = a³ / P²): 시리우스 A–B <b>3.08 M☉</b>, 센타우루스 알파 A–B <b>2.04 M☉</b>, 프로키온 A–B <b>2.03 M☉</b>, 백조자리 61 <b>1.37 M☉</b>.</li><li>별의 질량은 쌍성에서만 <b>직접</b> 잴 수 있어요. 구한 질량은 다음 차시의 질량-광도 관계의 자료가 돼요.</li><li><b>한계</b>: 궤도면이 시선과 비스듬하면 하늘에 보이는 궤도가 찌그러져요. 보이는 긴반지름은 실제보다 커질 수 없어서, 보이는 값을 그대로 쓰면 질량을 작게 구하기 쉬워요. 실제로는 <b>경사각을 보정</b>해요(이번 차시는 다루지 않아요).</li></ul>',
      missions: [
        {
          title: '쌍성 4개의 표 완성하기', manual: true,
          goal: '표에서 쌍성을 하나씩 골라 <b>a(AU)</b>와 <b>M합(M☉)</b>을 계산해 입력하세요. 4개를 모두 채우고 확인을 누르세요.',
          hint: 'a = a″ / p, M합 = a³ / P². 센타우루스 알파: a = 17.57 / 0.7472 ≈ 23.5 AU, M합 ≈ 23.5³ / 79.9² ≈ 2.0 M☉예요. 칸이 맞으면 초록색이 돼요.',
          setup() { S.flags.calcTb = true; selRow(TB.done.findIndex((d) => !d) >= 0 ? TB.done.findIndex((d) => !d) : 0); setView('table'); },
          check() { const n = TB.done.filter(Boolean).length; return n === 4 ? true : '아직 ' + (4 - n) + '개 쌍성이 남았어요. 줄을 눌러 골라서 a와 M합을 입력해 주세요.'; },
          status: () => mark(TB.done.every(Boolean)) + ' 완성한 쌍성 ' + TB.done.filter(Boolean).length + ' / 4',
          explain: '시리우스 <b>3.08</b>, 센타우루스 알파 <b>2.04</b>, 프로키온 <b>2.03</b>, 백조자리 61 <b>1.37</b> M☉예요. 주기가 678년이나 되는 백조자리 61은 관측이 오래 걸렸어요.',
        },
        {
          type: 'quiz', title: '궤도면이 기울어져 있다면?',
          goal: '쌍성의 궤도면이 시선에 수직이 아니라 비스듬하다면, 하늘에 보이는 궤도를 그대로 써서 구한 질량은 어떨까요? (기울기 슬라이더를 움직여 보세요)',
          setup() { S.flags.tilt = true; TB.inc = 0; setSlider($('#sInc'), $('#oInc'), 0, (v) => f0(v) + '°'); setView('table'); },
          choices: ['보이는 긴반지름이 실제보다 작아져서 질량을 작게 구하기 쉬워요', '보이는 긴반지름이 커져서 질량을 크게 구해요', '기울어져도 보이는 궤도는 그대로라 질량은 변하지 않아요', '주기 P가 짧아져서 질량을 크게 구해요'],
          answer: 0,
          feedback: ['', '기울어진 궤도를 하늘에 비추면 한쪽 방향이 줄어들어 보이므로 긴반지름이 실제보다 커질 수는 없어요.', '궤도면이 기울면 보이는 궤도는 찌그러져요. 슬라이더에서 파란 선이 변하는 걸 보세요.', '주기 P는 시간이라 기울기와 상관없이 같아요. 달라지는 것은 보이는 각거리예요.'],
          explain: '비스듬하면 보이는 궤도가 찌그러져 긴반지름이 <b>실제보다 작게</b> 보여요. 질량 합은 a³에 비례해서 더 작게 구하기 쉬워요. 그래서 실제 관측에서는 <b>경사각을 보정</b>해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-binary-mass', mount: '#game', badge: '별 저울 박사', homeHref: '../../index.html#hu',
    featureLabels: { sky: '🔭 쌍성 관측 영상 · 각거리 그래프', total: '⚖ 각거리 눈금자 · 총질량 계산', cm: '⚖ 질량 중심 시소 · 질량 나누기', table: '📋 쌍성 자료표 · 기울기 실험' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view, free = FREE();
    if (v === 'sky') setReadouts(['경과 시간', f1(SK.t) + '년', '두 별 사이 각거리', f2(sepAt(SK.t)) + '″', '보는 기준', SK.mode ? '질량 중심' : 'A 기준']);
    else if (v === 'total') setReadouts(['긴반지름 a', TT.aOk || free ? f1(SIR.a) + ' AU' : '?', 'P²', f0(SIR.P * SIR.P) + ' 년²', '질량 합 M₁ + M₂', TT.mOk || free ? f2(SIR.Mk) + ' M☉' : '?']);
    else if (v === 'cm') { const d = cmData(); setReadouts(['고른 쌍성', d.name, '질량의 비 M₁ : M₂', f2(d.a2 / d.a1) + ' : 1', '질량 합', CM.sel === 1 && !(CM.okX || free) ? '?' : f2(d.tot) + ' M☉']); }
    else setReadouts(['고른 쌍성', BIN[TB.sel].sn, '완성한 쌍성', TB.done.filter(Boolean).length + ' / 4', '기울기 i', f0(TB.inc) + '°']);
  }

  /* ================= 루프 ================= */
  updateCtl(); syncSlider();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'sky': drawSky(dt, t); break;
      case 'total': drawTotal(dt, t); break;
      case 'cm': drawCm(dt, t); break;
      default: drawTable(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, SIR, BIN, CMD, SK, TT, CM, TB, skGraph, skGeom, tbRowRect, selRow, cmData, relPos, sepAt, LSk, LTt, LCm, LTb };
})();
