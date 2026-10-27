/* 화학 Ⅳ. 역동적인 화학 반응 - pH와 희석 [12화학04-01]
   ① 관찰: 지수 척도 (보통 눈금 vs 로그 눈금) ② 분석: pH 계산 (pH = −log[H⁺], pOH, pH + pOH = 14) ③ 탐구: 희석 그래프 (강산 · 강염기 10배 희석)
   ④ 적용: 생활 속 pH (눈금 위 배치, 지시약). 약산 · 약염기, 완충 용액, 적정 곡선은 다루지 않아요. 모든 계산은 25 °C. */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6', BG = '#f3f0fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣]|\s+|[^\s가-힣]+/g) || [];
      for (const tk of toks) {
        if (tk.trim() === '') { if (line) line += tk; continue; }
        const t = line + tk;
        if (ctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = tk; } else line = t;
      }
    });
    if (line) out.push(line.trimEnd());
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ap = SciSim.approach;

  /* ---------- 숫자 표기 ---------- */
  const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const supStr = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  function sciParts(x, dig) {
    if (!(x > 0)) return ['0', 0];
    let e = Math.floor(Math.log10(x) + 1e-9), m = +(x / Math.pow(10, e)).toPrecision(dig || 2);
    if (m >= 10) { m = +(m / 10).toPrecision(dig || 2); e++; }
    return [m.toFixed(Math.max(0, (dig || 2) - 1)), e];
  }
  const sci = (x, dig) => { const q = sciParts(x, dig); return q[0] + '×10' + supStr(q[1]); };
  const fm = (v, d) => String(+v.toFixed(d == null ? 3 : d));
  const f1 = (v) => v.toFixed(1);
  const f2 = (v) => v.toFixed(2);
  const MINUS = '−';

  /* ---------- 상태 (공통) ---------- */
  const S = { mode: '', sub: {}, gate: '', fade: 0, t: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setRead(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    const tb = $('#tbLabel'); if (tb && typeof MODE_LABEL !== 'undefined') tb.textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = n.getAttribute('data-gate').split(' ').indexOf(S.gate) >= 0;
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (typeof uiExtra === 'function') uiExtra();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  /* 보기 전환 단추: <div class="segmented" data-subsel="모드"> <button data-v="..."> */
  $$('[data-subsel]').forEach((box) => box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; Sound.click();
    S.sub[box.dataset.subsel] = b.dataset.v; S.fade = 0.5;
    $$('button', box).forEach((x) => x.classList.toggle('on', x === b));
    updateCtl();
  }));
  function syncSubsel() { $$('[data-subsel]').forEach((box) => $$('button', box).forEach((x) => x.classList.toggle('on', S.sub[box.dataset.subsel] === x.dataset.v))); }

  /* ---------- 입력 칸 (십진수 / 과학적 표기) ---------- */
  function mkRow(host, sp, onChange) {
    const w = document.createElement('div'); w.className = sp.sci ? 'sci-line' : 'row-line';
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = sp.label; w.appendChild(lab);
    const box = document.createElement('div'); box.className = sp.sci ? 'sci-in' : 'in-wrap'; w.appendChild(box);
    const mk = (cls, ph, mode) => { const i = document.createElement('input'); i.type = 'text'; i.className = 'num-in ' + (cls || ''); i.inputMode = mode || 'decimal'; i.autocomplete = 'off'; i.placeholder = ph || ''; return i; };
    const r = { sp, el: w, ok: false };
    if (sp.sci) {
      r.c = mk('c', '1.0'); r.e = mk('e', '지수', 'text');
      const x = document.createElement('span'); x.className = 'x'; x.textContent = '×10';
      const u = document.createElement('span'); u.className = 'x'; u.textContent = sp.unit || '';
      box.append(r.c, x, r.e, u); r.ins = [r.c, r.e];
    } else {
      r.i = mk('', sp.ph || '0'); box.appendChild(r.i);
      if (sp.unit) { const u = document.createElement('span'); u.className = 'unit'; u.textContent = sp.unit; box.appendChild(u); }
      r.ins = [r.i];
    }
    r.read = () => (sp.sci ? (() => { const c = parseNum(r.c.value), e = parseNum(r.e.value); return isNaN(c) || isNaN(e) ? NaN : c * Math.pow(10, e); })() : parseNum(r.i.value));
    r.test = () => { const v = r.read(); if (isNaN(v)) return null; return sp.sci ? Math.abs(v / sp.ans - 1) <= (sp.rel || 0.03) : near(v, sp.ans, sp.tol); };
    r.paint = (showBad) => {
      const t = r.test(); r.ok = t === true;
      r.ins.forEach((i) => { i.classList.toggle('ok', t === true); if (t !== false) i.classList.remove('bad'); else if (showBad) i.classList.add('bad'); });
    };
    r.clear = () => { r.ins.forEach((i) => { i.value = ''; i.classList.remove('ok', 'bad'); }); r.ok = false; };
    r.setAns = () => { if (sp.sci) { const q = sciParts(sp.ans, 2); r.c.value = q[0]; r.e.value = q[1]; } else r.i.value = sp.show != null ? sp.show : String(sp.ans); r.paint(false); };
    r.ins.forEach((i) => {
      i.addEventListener('input', () => { const was = r.ok; r.paint(false); if (r.ok && !was) Sound.tick(); onChange && onChange(r, false); });
      i.addEventListener('change', () => { r.paint(true); onChange && onChange(r, true); });
    });
    host.appendChild(w);
    return r;
  }
  function numIn(el) { return parseNum(el.value); }

  /* ---------- 눈금 있는 비커 (유리) : 안쪽 기하를 돌려줌 ---------- */
  function beaker(x, y, w, h, o) {
    o = o || {};
    const ix = x + 5, iw = w - 10, iy = y + 5, ih = h - 11;
    const level = clamp(o.level == null ? 0 : o.level, 0, 1), ly = iy + ih * (1 - level);
    const rad = Math.min(14, w * 0.15);
    const path = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph - r); ctx.quadraticCurveTo(px, py + ph, px + r, py + ph); ctx.lineTo(px + pw - r, py + ph); ctx.quadraticCurveTo(px + pw, py + ph, px + pw, py + ph - r); ctx.lineTo(px + pw, py); };
    // 유리 바닥 · 그림자
    D.shadow(() => { path(x, y, w, h, rad); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = 'rgba(235,244,255,.75)'; ctx.fill(); }, { blur: 9, y: 4 });
    // 액체
    if (level > 0.002) {
      ctx.save(); path(ix, iy, iw, ih, Math.max(4, rad - 4)); ctx.closePath(); ctx.clip();
      const g = ctx.createLinearGradient(0, ly, 0, iy + ih);
      const c = o.color || '#9bc8ff'; g.addColorStop(0, C.rgba(c, o.alpha != null ? o.alpha : 0.62)); g.addColorStop(1, C.rgba(C.shade(c, -0.18), Math.min(0.95, (o.alpha != null ? o.alpha : 0.62) + 0.18)));
      ctx.fillStyle = g; ctx.fillRect(ix, ly, iw, iy + ih - ly);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(ix, ly, iw, 2.5);
      ctx.restore();
    }
    // 눈금
    (o.ticks || []).forEach((tk) => {
      const ty = iy + ih * (1 - tk.f);
      ctx.strokeStyle = 'rgba(70,90,120,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + w - 2, ty); ctx.lineTo(x + w - (tk.long ? 20 : 12), ty); ctx.stroke();
      if (tk.label) T(x + w + 5, ty + 4.5, tk.label, 13, MUTED, 'left', 700);
    });
    // 유리 테두리 · 반사광
    ctx.strokeStyle = 'rgba(70,100,140,.7)'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; path(x, y, w, h, rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.lineTo(x + 9, y + h - rad - 8); ctx.stroke();
    return { x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih, level };
  }
  /* 액체 안에 갇힌 입자 : 정규화 좌표(u, v)를 현재 액체 영역에 펼쳐 놓아요 (영역 밖으로 나가지 않음) */
  const r2 = (i) => [((i + 1) * 0.7548776662466927) % 1, ((i + 1) * 0.5698402909980532) % 1];
  function ballPos(g, i, r, wob, t) {
    const pad = r + 3, q = r2(i);
    const x0 = g.ix + pad, x1 = g.ix + g.iw - pad, y0 = g.ly + pad, y1 = g.bottom - pad;
    const px = x1 > x0 ? x0 + q[0] * (x1 - x0) : (g.ix + g.iw / 2), py = y1 > y0 ? y0 + q[1] * (y1 - y0) : (g.ly + g.bottom) / 2;
    const k = RM ? 0 : (wob == null ? 1.6 : wob);
    return [px + Math.sin(t * 1.3 + i * 1.9) * k, py + Math.cos(t * 1.1 + i * 2.3) * k];
  }
  function drawBalls(g, n, r, color, t, o) {
    o = o || {};
    for (let i = 0; i < n; i++) { const p = ballPos(g, (o.off || 0) + i, r, o.wob, t); D.sphere(p[0], p[1], r, color, { gloss: r > 5 }); }
  }
  function flash(x, y, colors) { parts.burst(x, y, { count: 16, speed: 150, size: 3.2, colors: colors || ['#ffb400', '#14a058', '#8b5cf6'] }); }
  function makeChips(box, items, onPick) {
    box.innerHTML = '';
    items.forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = label; b.addEventListener('click', () => { Sound.click(); onPick(v); }); box.appendChild(b); });
  }
  function markChips(box, cur, doneMap) { $$('button', box).forEach((b) => { b.classList.toggle('on', b.dataset.v === String(cur)); b.classList.toggle('done', !!(doneMap && doneMap[b.dataset.v])); }); }
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  const MODE_LABEL = { exp: '📏 지수 척도', calc: '🧮 pH 계산', dil: '📈 희석 그래프', life: '🍋 생활 속 pH' };
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };
  const KW = 1.0e-14;
  const e10 = (e) => Math.pow(10, e);
  const sciTxt = (x) => sci(x, 2);
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2d = (x) => Math.round(x * 100) / 100;
  const PH_STOPS = [[0, '#ef4444'], [3, '#f97316'], [5.5, '#facc15'], [7, '#4ade80'], [9, '#38bdf8'], [12, '#6366f1'], [14, '#8b5cf6']];
  function phStrip(x, y, w, h, o) {
    o = o || {};
    const g = ctx.createLinearGradient(x, 0, x + w, 0); PH_STOPS.forEach(([p, c]) => g.addColorStop(p / 14, c));
    D.roundRect(x, y, w, h, o.r != null ? o.r : 8); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(40,50,80,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function phTicks(x, y, w, every, size) {
    ctx.strokeStyle = 'rgba(40,50,80,.55)'; ctx.lineWidth = 1.4;
    for (let p = 0; p <= 14; p++) { const px = x + w * p / 14; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + 6); ctx.stroke(); if (p % every === 0) T(px, y + 6 + (size || 13) + 3, String(p), size || 13, INK, 'center', 800); }
  }

  /* ---------- 자료 ---------- */
  const PS = [
    { k: 'h1', name: '0.010 M HCl', short: '0.010 M HCl', kind: 'acid', c: 0.010, h: 0.010, work: ['[H⁺] = 1.0×10⁻² M', 'pH = −log(1.0×10⁻²) = 2'] },
    { k: 'h2', name: '0.0020 M HCl', short: '0.0020 M HCl', kind: 'acid', c: 0.0020, h: 0.0020, work: ['[H⁺] = 2.0×10⁻³ M', 'pH = 3 − log 2 = 3 − 0.30 = 2.70'] },
    { k: 'h3', name: '0.050 M HCl', short: '0.050 M HCl', kind: 'acid', c: 0.050, h: 0.050, work: ['[H⁺] = 5.0×10⁻² M', 'pH = 2 − log 5 = 2 − 0.70 = 1.30'] },
    { k: 'n1', name: '0.0010 M NaOH', short: '0.0010 M NaOH', kind: 'base', c: 0.0010, oh: 0.0010, work: ['[OH⁻] = 1.0×10⁻³ M → pOH = 3', 'pH = 14 − 3 = 11'] },
    { k: 'ca', name: '0.020 M Ca(OH)₂', short: '0.020 M Ca(OH)₂', kind: 'base', c: 0.020, oh: 0.040, work: ['[OH⁻] = 2 × 0.020 = 0.040 M', 'pOH = 2 − log 4 = 2 − 0.60 = 1.40', 'pH = 14 − 1.40 = 12.60'] },
  ];
  PS.forEach((q) => {
    if (q.kind === 'acid') { q.pH = r2d(-Math.log10(q.h)); }
    else { q.pOH = r2d(-Math.log10(q.oh)); q.pH = r2d(14 - q.pOH); }
  });
  const dilPH = (sub, i) => { const c = e10(-(i + 1)), x = (c + Math.sqrt(c * c + 4 * KW)) / 2, p = -Math.log10(x); return sub === 'hcl' ? r1(p) : r1(14 - p); };     // 측정값 (소수 첫째 자리)
  const dilConc = (i) => e10(-(i + 1));
  const LIFE = [
    { k: 'gastric', name: '위액', ic: '🫃', lo: 1.5, hi: 2.0 }, { k: 'lemon', name: '레몬즙', ic: '🍋', lo: 2, hi: 2 }, { k: 'vinegar', name: '식초', ic: '🍶', lo: 2.5, hi: 3 },
    { k: 'coffee', name: '커피', ic: '☕', lo: 5, hi: 5 }, { k: 'water', name: '순수한 물', ic: '💧', lo: 7, hi: 7 }, { k: 'blood', name: '혈액', ic: '🩸', lo: 7.4, hi: 7.4 },
    { k: 'sea', name: '바닷물', ic: '🌊', lo: 8.1, hi: 8.1 }, { k: 'soap', name: '비누', ic: '🧼', lo: 9, hi: 10 }, { k: 'cleaner', name: '세정제', ic: '🧴', lo: 12, hi: 13 },
  ];
  const LTOL = 0.5;
  const lifeRep = (q) => (q.lo + q.hi) / 2;

  /* ---------- 상태 ---------- */
  Object.assign(S, {
    mode: 'exp', sub: {},
    ex: { pH: 7, log: 0, logT: 0, seen: {}, moved: false },
    pc: { k: 'h1', fly: {}, shake: 0, pH: 7 },
    dp: { sub: 'hcl', rec: { hcl: [], naoh: [] }, step: { hcl: 0, naoh: 0 }, act: null, pop: {}, meter: 1.0, bottleA: 1, bottleT: 1, tubeA: 0, pip: { x: 0, y: 0, fill: 0 }, shake: 0, sel: { acid: '', base: '' }, sw: 0 },
    lf: { items: LIFE.map((q, i) => ({ q, pH: null, x: 0, y: 0, tx: 0, ty: 0, s: 1, init: false })), drag: null, shake: 0, cmpOpen: false },
  });

  /* ================= ① 지수 척도 ================= */
  const exGeom = () => ({ x0: MAIN.x + (PHONE ? 70 : 78), x1: MAIN.x + MAIN.w - (PHONE ? 108 : 150), y0: MAIN.y + (PHONE ? 70 : 62), rh: PHONE ? 25.4 : 20.4 });
  function drawExp(t) {
    const g = exGeom(), ex = S.ex, mix = sm(ex.log), W = g.x1 - g.x0;
    T(14, 26, mix < 0.5 ? '📏 [H⁺]를 보통 눈금(선형)으로 그리면?' : '📏 로그 눈금(pH)으로 바꾸면 한눈에 보여요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    T(MAIN.x + 14, MAIN.y + 26, mix < 0.5 ? '막대 끝 = 0.1 M (pH 1)' : '막대 길이 = 14 + log[H⁺] (막대 끝 = 10⁻¹ M)', 13.5, MUTED, 'left', 800);
    T(MAIN.x + MAIN.w - 14, MAIN.y + 26, mix < 0.5 ? '보통 눈금' : '로그 눈금', 14.5, '#5b21b6', 'right', 800);
    for (let p = 1; p <= 13; p++) {
      const y = g.y0 + (p - 1) * g.rh, h = Math.max(10, g.rh - 6), c = e10(-p), cur = p === ex.pH;
      if (cur) { D.roundRect(MAIN.x + 6, y - 3, MAIN.w - 12, g.rh, 7); ctx.fillStyle = 'rgba(139,92,246,.13)'; ctx.fill(); ctx.strokeStyle = PUR; ctx.lineWidth = 1.8; ctx.stroke(); }
      T(MAIN.x + 14, y + h - 1, 'pH ' + p, 13.5, cur ? '#5b21b6' : INK, 'left', 800);
      D.roundRect(g.x0, y, W, h, 4); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const lin = c / 0.1, lg = (14 - p) / 13, len = W * (lin + (lg - lin) * mix);
      if (len >= 0.4) { ctx.save(); D.roundRect(g.x0, y, W, h, 4); ctx.clip(); ctx.fillStyle = cur ? '#ef6a4a' : '#f59e8c'; ctx.fillRect(g.x0, y, len, h); ctx.restore(); }
      T(g.x1 + 8, y + h - 1, sciTxt(c) + ' M', 13.5, cur ? '#5b21b6' : MUTED, 'left', cur ? 800 : 700);
      if (mix < 0.5 && lin * W < 0.4) T(g.x0 + 6, y + h - 1.5, '너무 짧아서 안 보여요', 12.5, '#9aa5b6', 'left', 700, { alpha: 1 - mix * 2 });
    }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, 'pH = −log[H⁺]  (예: [H⁺] = 1.0×10⁻⁴ M → pH = 4)', 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, '선택한 pH ' + ex.pH + ': [H⁺] = ' + sciTxt(e10(-ex.pH)) + ' M\npH가 1 커지면 [H⁺]는 1/10이 돼요. pH 3과 pH 6은 [H⁺]가 1000배 차이예요.', 14.5, INK, 21, 700);
  }
  function stepExp(dt) { const e = S.ex; e.log = ap(e.log, e.logT, dt, 5); if (Math.abs(e.log - e.logT) < 0.004) e.log = e.logT; }

  /* ================= ② pH 계산 ================= */
  const pcRows = {};
  function drawCalc(t) {
    const q = PS.find((x) => x.k === S.pc.k), rows = pcRows[q.k], done = rows.every((r) => r.ok);
    T(14, 26, '🧮 [H⁺] ↔ pH ↔ pOH ↔ [OH⁻] 계산', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 비커 + 시료
    const bw = PHONE ? 84 : 96, bh = PHONE ? 116 : 140, bx = MAIN.x + (PHONE ? 20 : 28), by = MAIN.y + (PHONE ? 38 : 40);
    const bk = beaker(bx, by, bw, bh, { level: 0.7, color: q.kind === 'acid' ? '#fecaca' : '#bfdbfe', alpha: 0.75 });
    drawBalls(bk, 6, 5, q.kind === 'acid' ? '#ef6a4a' : '#3b82f6', t, { off: 3 });
    T(bx + bw / 2, by + bh + 20, q.name, PHONE ? 13 : 14, INK, 'center', 800);
    // 계산 카드
    const cx = PHONE ? MAIN.x + 124 : MAIN.x + 150, cw = MAIN.x + MAIN.w - cx - 12, cy = MAIN.y + 12, ch = PHONE ? 176 : 190;
    D.roundRect(cx, cy, cw, ch, 12); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.strokeStyle = '#d9c98a'; ctx.lineWidth = 2.2; ctx.stroke();
    T(cx + 12, cy + 26, q.kind === 'acid' ? '강산: [H⁺] = 산의 농도' : '강염기: [OH⁻]로 pOH → pH', 14.5, '#8a6d00', 'left', 800);
    const fly = S.pc.fly[q.k] || 0, lines = done ? q.work : ['풀이는 정답을 쓰면 나타나요'];
    lines.forEach((l, i) => { const ap2 = done ? sm(clamp(fly * 3 - i * 0.6, 0, 1)) : 1; T(cx + 14 + (done ? (1 - ap2) * 60 : 0), cy + 58 + i * (PHONE ? 28 : 31), l, PHONE ? 14.5 : 17, done ? '#5b21b6' : '#9aa5b6', 'left', 800, { alpha: ap2 }); });
    textBlock(cx + 12, cy + ch - (PHONE ? 38 : 34), cw - 24, '로그 값: log 2 ≈ 0.30 · log 4 ≈ 0.60 · log 5 ≈ 0.70', 13.5, MUTED, 17, 700);
    // pH 눈금
    const sx = MAIN.x + 28, sw = MAIN.w - 56, sy = MAIN.y + MAIN.h - (PHONE ? 100 : 94);
    T(sx, sy - 16, '산성', 14, '#b91c1c', 'left', 800); T(sx + sw, sy - 16, '염기성', 14, '#4f46e5', 'right', 800); T(sx + sw * 0.5, sy - 16, '중성 (pH 7)', 14, '#14803f', 'center', 800);
    phStrip(sx, sy, sw, 26); phTicks(sx, sy + 28, sw, PHONE ? 2 : 1);
    const mp = S.pc.pH, mx = sx + sw * clamp(mp, 0, 14) / 14;
    ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.moveTo(mx, sy - 2); ctx.lineTo(mx - 9, sy - 14); ctx.lineTo(mx + 9, sy - 14); ctx.closePath(); ctx.fill();
    if (done) T(mx, sy - 20, 'pH ' + q.pH.toFixed(2), 14.5, '#26324a', mx < sx + 60 ? 'left' : mx > sx + sw - 60 ? 'right' : 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    if (S.pc.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + S.pc.shake * 0.2 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, 'pH = −log[H⁺] · pOH = −log[OH⁻] · pH + pOH = 14 (25 °C)', 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, '[H⁺] = 10^(−pH)이에요. 염기는 [OH⁻]에서 pOH를 먼저 구한 뒤 pH = 14 − pOH로 바꿔요.\n칸을 벗어나면 채점돼요. 소수 둘째 자리까지 써요.', 14.5, INK, 21, 700);
  }
  function stepCalc(dt) {
    const q = PS.find((x) => x.k === S.pc.k), done = pcRows[q.k].every((r) => r.ok);
    S.pc.pH = ap(S.pc.pH, done ? q.pH : 7, dt, 5);
    PS.forEach((p) => { const d = pcRows[p.k].every((r) => r.ok); S.pc.fly[p.k] = ap(S.pc.fly[p.k] || 0, d ? 1 : 0, dt, 3); if (d && S.pc.fly[p.k] > 0.99) S.pc.fly[p.k] = 1; });
    S.pc.shake = Math.max(0, S.pc.shake - dt);
  }
  /* ================= ③ 희석 그래프 ================= */
  const DA = PHONE ? { x: MAIN.x + 8, y: MAIN.y + 6, w: 448, h: 172 } : { x: MAIN.x + 10, y: MAIN.y + 10, w: 316, h: 238 };
  const DG = PHONE ? { x: MAIN.x + 8, y: MAIN.y + 184, w: 448, h: 234 } : { x: MAIN.x + 336, y: MAIN.y + 10, w: 430, h: 238 };
  const DT = PHONE ? { x: INFO.x + 8, y: INFO.y + 8, w: INFO.w - 16, h: 214 } : { x: MAIN.x + 10, y: MAIN.y + 256, w: 756, h: 80 };
  const SUBS = { hcl: { name: 'HCl', col: '#ef6a4a', liq: '#f87171' }, naoh: { name: 'NaOH', col: '#3b82f6', liq: '#60a5fa' } };
  const dsc = PHONE ? 0.82 : 1;
  const dBase = () => DA.y + DA.h - 30;
  const dBot = () => ({ x: DA.x + DA.w * (PHONE ? 0.2 : 0.3) }), dTube = () => ({ x: DA.x + DA.w * (PHONE ? 0.8 : 0.78) }), dRest = () => ({ x: DA.x + DA.w * 0.52, y: dBase() - 2 });
  const curSub = () => S.dp.sub, curStep = () => S.dp.step[S.dp.sub];
  const dpDone = (sub, n) => { for (let i = 0; i < n; i++) if (S.dp.rec[sub][i] == null) return false; return true; };
  const dpCount = (sub) => S.dp.rec[sub].filter((v) => v != null).length;
  const concA = (i) => 0.14 + 0.5 * (1 - i / 7.5);
  function dpSwitch(sub) { const d = S.dp; if (d.act) return; d.sub = sub; d.meterT = dilPH(sub, d.step[sub]); d.bottleT = concA(d.step[sub]); }
  function dpDilute() {
    const d = S.dp, sub = d.sub; if (d.act || d.step[sub] >= 7) return;
    if (d.rec[sub][d.step[sub]] == null) { d.shake = 0.4; Sound.fail(); showHint('먼저 📋 기록하기로 지금 용액의 pH를 표에 적어요.', 3200); return; }
    d.act = { t: 0, d: 2.6, sub, from: d.step[sub] }; Sound.click(); updateCtl();
  }
  function dpRecord() {
    const d = S.dp, sub = d.sub, i = d.step[sub]; if (d.act || d.rec[sub][i] != null) return;
    d.rec[sub][i] = dilPH(sub, i); d.pop[sub + i] = 0.001; Sound.success(); updateCtl();
  }
  function dpClear() { const d = S.dp; d.act = null; d.tubeA = 0; d.rec = { hcl: [], naoh: [] }; d.step = { hcl: 0, naoh: 0 }; d.pop = {}; dpSwitch(d.sub); updateCtl(); }
  function stepDp(dt) {
    const d = S.dp, a = d.act, s = dsc, base = dBase(), rest = dRest(), bx = dBot().x, tx = dTube().x;
    const hov = base - 96 * s, inY = base - 40 * s;
    if (!d.init) { d.init = true; d.meter = dilPH(d.sub, 0); d.meterT = d.meter; d.bottleA = concA(0); d.bottleT = d.bottleA; d.pip = { x: rest.x, y: rest.y, fill: 0 }; }
    if (a) {
      a.t += dt; const p = clamp(a.t / a.d, 0, 1), P = d.pip, seg = (u0, u1) => sm(clamp((p - u0) / (u1 - u0), 0, 1)), mv = (A, B, k) => ({ x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k });
      const hB = { x: bx, y: hov }, iB = { x: bx, y: inY }, hT = { x: tx, y: hov };
      let q;
      if (p < 0.12) q = mv(rest, hB, seg(0, 0.12)); else if (p < 0.25) q = mv(hB, iB, seg(0.12, 0.25)); else if (p < 0.38) q = iB; else if (p < 0.5) q = mv(iB, hB, seg(0.38, 0.5));
      else if (p < 0.68) q = mv(hB, hT, seg(0.5, 0.68)); else if (p < 0.82) q = hT; else q = mv(hT, rest, seg(0.82, 1));
      P.x = q.x; P.y = q.y; P.fill = seg(0.25, 0.38) * (1 - seg(0.68, 0.82));
      d.tubeT = p > 0.7 && p < 0.9 ? concA(a.from + 1) : 0; d.tubeA = ap(d.tubeA || 0, d.tubeT, dt, 8);
      if (a.t >= a.d) { d.act = null; d.step[a.sub] = a.from + 1; d.tubeA = 0; d.meterT = dilPH(a.sub, a.from + 1); d.bottleT = concA(a.from + 1); updateCtl(); }
    } else { d.pip.x = ap(d.pip.x, rest.x, dt, 8); d.pip.y = ap(d.pip.y, rest.y, dt, 8); d.pip.fill = ap(d.pip.fill, 0, dt, 8); d.tubeA = ap(d.tubeA || 0, 0, dt, 8); }
    d.meter = ap(d.meter, d.meterT == null ? d.meter : d.meterT, dt, 6); if (d.meterT != null && Math.abs(d.meter - d.meterT) < 0.005) d.meter = d.meterT;
    d.bottleA = ap(d.bottleA, d.bottleT, dt, 6);
    Object.keys(d.pop).forEach((k) => { d.pop[k] = Math.min(1, d.pop[k] + dt * 3.2); });
    d.shake = Math.max(0, d.shake - dt);
  }
  function drawDil(t) {
    const d = S.dp, sub = d.sub, S0 = SUBS[sub], s = dsc, base = dBase();
    T(14, 26, '📈 10배씩 묽히며 pH를 재고 그래프로 나타내요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // ---- 실험 장치
    D.roundRect(DA.x, DA.y, DA.w, DA.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const bx = dBot().x, tx = dTube().x, i = d.step[sub], conc = dilConc(i);
    // pH 측정기 표시창
    const mx = DA.x + 10, my = DA.y + 8, mw = PHONE ? 118 : 138, mh = 40;
    D.shadow(() => { D.roundRect(mx, my, mw, mh, 8); ctx.fillStyle = '#1f2937'; ctx.fill(); }, { blur: 5, y: 2 });
    T(mx + 10, my + 25, 'pH', 14, '#9ca3af', 'left', 800); T(mx + mw - 10, my + 28, d.meter.toFixed(1), 22, '#4ade80', 'right', 800);
    // 병
    const liqCol = S0.liq;
    ctx.save(); ctx.translate(bx, base); ctx.scale(s, s);
    D.shadow(() => { D.roundRect(-37, -62, 74, 62, 12); ctx.fillStyle = 'rgba(240,245,255,.85)'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.save(); D.roundRect(-37, -62, 74, 62, 12); ctx.clip(); ctx.fillStyle = C.rgba(liqCol, d.bottleA); ctx.fillRect(-37, -50, 74, 50); ctx.restore();
    ctx.strokeStyle = 'rgba(70,100,140,.75)'; ctx.lineWidth = 2.6; D.roundRect(-37, -62, 74, 62, 12); ctx.stroke(); D.roundRect(-12, -84, 24, 24, 4); ctx.fillStyle = 'rgba(235,244,255,.9)'; ctx.fill(); ctx.stroke();
    // 측정 막대 (프로브)
    if (!d.act) { ctx.strokeStyle = '#475569'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(14, -84); ctx.lineTo(14, -14); ctx.stroke(); }
    ctx.restore();
    if (!d.act) { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(mx + mw - 20, my + mh); ctx.quadraticCurveTo(mx + mw + 10, base - 120 * s, bx + 14 * s, base - 84 * s); ctx.stroke(); }
    T(bx, base + 19, sciTxt(conc) + ' M ' + S0.name, 13.5, INK, 'center', 800);
    // 시험관 (증류수 9 mL)
    ctx.save(); ctx.translate(tx, base); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(240,245,255,.8)'; ctx.beginPath(); ctx.moveTo(-17, -88); ctx.lineTo(-17, -17); ctx.arc(0, -17, 17, Math.PI, 0, true); ctx.lineTo(17, -88); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.moveTo(-17, -88); ctx.lineTo(-17, -17); ctx.arc(0, -17, 17, Math.PI, 0, true); ctx.lineTo(17, -88); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(147,197,253,.4)'; ctx.fillRect(-17, -64, 34, 70); ctx.fillStyle = C.rgba(liqCol, d.tubeA || 0); ctx.fillRect(-17, -64, 34, 70); ctx.restore();
    ctx.strokeStyle = 'rgba(70,100,140,.75)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-17, -88); ctx.lineTo(-17, -17); ctx.arc(0, -17, 17, Math.PI, 0, true); ctx.lineTo(17, -88); ctx.stroke();
    ctx.restore();
    T(tx, base + 19, '증류수 9 mL', 13.5, INK, 'center', 800);
    // 1 mL 피펫
    const P = d.pip;
    ctx.save(); ctx.translate(P.x, P.y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(235,244,255,.95)'; ctx.strokeStyle = '#52627d'; ctx.lineWidth = 2;
    D.roundRect(-3.5, -62, 7, 58, 3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3.5, -4); ctx.lineTo(0, 0); ctx.lineTo(3.5, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -44, 8, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (P.fill > 0.01) { ctx.fillStyle = C.rgba(liqCol, 0.85); ctx.fillRect(-2.4, -P.fill * 34, 4.8, P.fill * 34); }
    ctx.restore();
    T(dRest().x, base - 76 * s, '1 mL 피펫', 13.5, MUTED, 'center', 800);
    // ---- 그래프
    D.roundRect(DG.x, DG.y, DG.w, DG.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const px0 = DG.x + 40, px1 = DG.x + DG.w - 16, py0 = DG.y + 26, py1 = DG.y + DG.h - 38, pw = px1 - px0, ph = py1 - py0;
    const X = (x) => px0 + (x - 0.5) / 8 * pw, Y = (y) => py1 - y / 14 * ph;
    T(DG.x + 12, DG.y + 18, 'pH − (−log 몰 농도) 그래프', 14, INK, 'left', 800);
    ctx.strokeStyle = '#e5e9f2'; ctx.lineWidth = 1.2;
    for (let y = 0; y <= 14; y += 2) { ctx.beginPath(); ctx.moveTo(px0, Y(y)); ctx.lineTo(px1, Y(y)); ctx.stroke(); T(px0 - 6, Y(y) + 4.5, String(y), 13, MUTED, 'right', 700); }
    for (let x = 1; x <= 8; x++) { ctx.beginPath(); ctx.moveTo(X(x), py0); ctx.lineTo(X(x), py1); ctx.stroke(); T(X(x), py1 + 16, String(x), 13, MUTED, 'center', 700); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px0, py0 - 4); ctx.lineTo(px0, py1); ctx.lineTo(px1, py1); ctx.stroke();
    T((px0 + px1) / 2, DG.y + DG.h - 6, '−log (몰 농도)  =  1은 0.1 M, 8은 1.0×10⁻⁸ M', 13, MUTED, 'center', 700);
    ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#6d28d9'; ctx.beginPath(); ctx.moveTo(px0, Y(7)); ctx.lineTo(px1, Y(7)); ctx.stroke(); T(px1 - 4, Y(7) - 5, 'pH 7', 13, '#6d28d9', 'right', 800);
    ctx.strokeStyle = 'rgba(239,106,74,.5)'; ctx.beginPath(); ctx.moveTo(X(0.5), Y(0.5)); ctx.lineTo(X(8.5), Y(8.5 > 14 ? 14 : 8.5)); ctx.stroke();
    ctx.strokeStyle = 'rgba(59,130,246,.5)'; ctx.beginPath(); ctx.moveTo(X(0.5), Y(13.5)); ctx.lineTo(X(8.5), Y(5.5)); ctx.stroke(); ctx.setLineDash([]);
    ['hcl', 'naoh'].forEach((sb) => {
      const pts = []; d.rec[sb].forEach((v, k) => { if (v != null) pts.push([X(k + 1), Y(v), k]); });
      if (pts.length > 1) { ctx.strokeStyle = SUBS[sb].col; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((q, n) => (n ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
      pts.forEach((q) => { const pp = d.pop[sb + q[2]] == null ? 1 : d.pop[sb + q[2]], r = 6 * SciSim.ease.outBack(clamp(pp, 0, 1)); if (sb === 'hcl') D.sphere(q[0], q[1], Math.max(0.1, r), SUBS[sb].col, { gloss: false, outline: '#fff', outlineWidth: 1.5 }); else { ctx.fillStyle = SUBS[sb].col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; const rr = Math.max(0.1, r); ctx.fillRect(q[0] - rr, q[1] - rr, rr * 2, rr * 2); ctx.strokeRect(q[0] - rr, q[1] - rr, rr * 2, rr * 2); } });
    });
    T(px1 - 126, py0 + 14, '● HCl', 13.5, SUBS.hcl.col, 'left', 800); T(px1 - 66, py0 + 14, '■ NaOH', 13.5, SUBS.naoh.col, 'left', 800);
    if (dpDone('hcl', 8)) T(X(5.2), Y(11.2), '10⁻⁷ M 이후 pH 7에 접근해요', 13, '#6d28d9', 'center', 800);
    // ---- 표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const tb = DT;
    if (!PHONE) { D.roundRect(tb.x, tb.y, tb.w, tb.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke(); }
    const colW = PHONE ? 0 : (tb.w - 96) / 8, rh = PHONE ? 22 : 24;
    if (!PHONE) {
      T(tb.x + 10, tb.y + 20, '몰 농도 (M)', 13, MUTED, 'left', 800); T(tb.x + 10, tb.y + 20 + rh, 'HCl의 pH', 13.5, SUBS.hcl.col, 'left', 800); T(tb.x + 10, tb.y + 20 + 2 * rh, 'NaOH의 pH', 13.5, SUBS.naoh.col, 'left', 800);
      for (let k = 0; k < 8; k++) {
        const cx = tb.x + 96 + colW * (k + 0.5);
        if (k === d.step[sub]) { D.roundRect(cx - colW / 2 + 2, tb.y + 4, colW - 4, tb.h - 8, 6); ctx.fillStyle = 'rgba(139,92,246,.12)'; ctx.fill(); }
        T(cx, tb.y + 20, '10' + supStr(-(k + 1)), 13.5, INK, 'center', 800);
        ['hcl', 'naoh'].forEach((sb, n) => { const v = d.rec[sb][k]; T(cx, tb.y + 20 + (n + 1) * rh, v != null ? v.toFixed(1) : '—', 14, v != null ? INK : '#c0c8d6', 'center', 800); });
      }
    } else {
      T(tb.x + 10, tb.y + 16, '몰 농도 (M)', 13, MUTED, 'left', 800); T(tb.x + 190, tb.y + 16, 'HCl pH', 13.5, SUBS.hcl.col, 'center', 800); T(tb.x + 320, tb.y + 16, 'NaOH pH', 13.5, SUBS.naoh.col, 'center', 800);
      for (let k = 0; k < 8; k++) {
        const y = tb.y + 20 + (k + 0.5) * rh + 6;
        if (k === d.step[sub]) { D.roundRect(tb.x + 4, y - rh / 2 - 2, tb.w - 8, rh, 6); ctx.fillStyle = 'rgba(139,92,246,.12)'; ctx.fill(); }
        T(tb.x + 10, y + 4, '10' + supStr(-(k + 1)), 13.5, INK, 'left', 800);
        ['hcl', 'naoh'].forEach((sb, n) => { const v = d.rec[sb][k]; T(tb.x + (n ? 320 : 190), y + 4, v != null ? v.toFixed(1) : '—', 14, v != null ? INK : '#c0c8d6', 'center', 800); });
      }
    }
    if (PHONE) {
      const iy = INFO.y + 8; D.roundRect(DT.x, DT.y, DT.w, DT.h, 10); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
      textBlock(INFO.x + 16, INFO.y + 238, INFO.w - 32, '10배 희석 = 피펫 1 mL + 증류수 9 mL', 13.5, MUTED, 17, 700);
    } else {
      T(INFO.x + 16, INFO.y + 26, '10배 희석(피펫 1 mL + 증류수 9 mL)을 반복하고, 값을 기록해요', 15, '#5b21b6', 'left', 800);
      textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, '강산 HCl은 10배 묽힐 때마다 pH가 1씩 커지고, 강염기 NaOH는 1씩 작아져요(7에 가까워져요). 아주 묽어지면(10⁻⁷ M 이하) 물의 자동 이온화로 생기는 H⁺ · OH⁻ 1.0×10⁻⁷ M를 무시할 수 없어서, 산을 아무리 묽혀도 pH 7을 넘지 않아요. (정확한 값: 10⁻⁷ M → 6.79, 10⁻⁸ M → 6.98, 표에는 소수 첫째 자리로 적어요.)', 14, INK, 20, 700);
    }
    if (d.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + d.shake * 0.2 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
  }
  /* ================= ④ 생활 속 pH ================= */
  const LG = () => {
    const x0 = MAIN.x + (PHONE ? 44 : 50), x1 = MAIN.x + MAIN.w - (PHONE ? 16 : 24), r = (v) => MAIN.y + v;
    return PHONE ? { x0, x1, tagTop: r(40), lanes: 5, ruler: r(196), numbers: r(224), btb: r(252), pp: r(274), trayTop: r(304), zoneTop: r(34), zoneBot: r(294), cols: 3, tw: 148, th: 34, tgap: 4 }
      : { x0, x1, tagTop: r(44), lanes: 4, ruler: r(170), numbers: r(198), btb: r(226), pp: r(248), trayTop: r(276), zoneTop: r(38), zoneBot: r(268), cols: 9, tw: 78, th: 58, tgap: 5 };
  };
  const lifeX = (g, pH) => g.x0 + (g.x1 - g.x0) * clamp(pH, 0, 14) / 14;
  const traySlot = (g, i) => (PHONE ? { x: MAIN.x + 8 + (i % 3) * (g.tw + 6) + g.tw / 2, y: g.trayTop + Math.floor(i / 3) * (g.th + g.tgap) + g.th / 2 } : { x: MAIN.x + 8 + i * (g.tw + g.tgap) + g.tw / 2, y: g.trayTop + g.th / 2 });
  function lifeTargets(dt, snap) {
    const L = S.lf, g = LG();
    const placed = L.items.filter((it) => it.pH != null && it !== L.drag).sort((a, b) => a.pH - b.pH);
    L.items.forEach((it, idx) => {
      let tx, ty, sc = 1;
      if (it === L.drag) { tx = L.drag.px; ty = L.drag.py; sc = 1.12; }
      else if (it.pH != null) { const lane = placed.indexOf(it) % g.lanes; tx = lifeX(g, it.pH); ty = g.tagTop + 15 + lane * 30; }
      else { const sl = traySlot(g, idx); tx = sl.x; ty = sl.y; }
      if (!it.init || snap) { it.x = tx; it.y = ty; it.init = true; }
      it.x = ap(it.x, tx, dt, it === L.drag ? 40 : 14); it.y = ap(it.y, ty, dt, it === L.drag ? 40 : 14); it.s = ap(it.s, sc, dt, 14);
      if (it.pop != null) { it.pop = Math.min(1, it.pop + dt * 3.5); if (it.pop >= 1) it.pop = null; }
    });
  }
  const lifeOk = (it) => it.pH != null && it.pH >= it.q.lo - LTOL - 1e-9 && it.pH <= it.q.hi + LTOL + 1e-9;
  const lifePlaced = () => S.lf.items.filter((it) => it.pH != null).length;
  const lifeGood = () => S.lf.items.filter(lifeOk).length;
  function tagRect(it) { ctx.save(); ctx.font = D.font(13.5, 800); const w = ctx.measureText(it.q.name).width + 40; ctx.restore(); return { x: it.x - w / 2, y: it.y - 13, w, h: 26 }; }
  function drawItem(it, tray) {
    const sc = it.s * (it.pop != null ? 1 + 0.25 * Math.sin(it.pop * Math.PI) : 1);
    ctx.save(); ctx.translate(it.x, it.y); ctx.scale(sc, sc);
    const g = LG();
    if (tray) {
      const w = g.tw, h = g.th;
      D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: it === S.lf.drag ? 12 : 5, y: it === S.lf.drag ? 6 : 2 });
      ctx.strokeStyle = '#d7dce8'; ctx.lineWidth = 1.6; D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.stroke();
      if (PHONE) { T(-w / 2 + 22, 8, it.q.ic, 20, INK, 'center', 700); T(-w / 2 + 40, 5, it.q.name, 13.5, INK, 'left', 800); }
      else { T(0, -4, it.q.ic, 24, INK, 'center', 700); T(0, 18, it.q.name, 13.5, INK, 'center', 800); }
    } else {
      ctx.font = D.font(13.5, 800); const w = ctx.measureText(it.q.name).width + 40;
      D.shadow(() => { D.roundRect(-w / 2, -13, w, 26, 13); ctx.fillStyle = lifeOk(it) ? '#ffffff' : '#fff5f5'; ctx.fill(); }, { blur: it === S.lf.drag ? 12 : 4, y: it === S.lf.drag ? 6 : 2 });
      ctx.strokeStyle = it === S.lf.drag ? PUR : lifeOk(it) ? '#9aa8c4' : '#e2646b'; ctx.lineWidth = 1.8; D.roundRect(-w / 2, -13, w, 26, 13); ctx.stroke();
      T(-w / 2 + 16, 6, it.q.ic, 15, INK, 'center', 700); T(-w / 2 + 28, 5, it.q.name, 13.5, INK, 'left', 800);
    }
    ctx.restore();
  }
  function drawLife(t) {
    const g = LG(), L = S.lf, W = g.x1 - g.x0;
    T(14, 26, '🍋 생활 속 물질을 pH 눈금에 놓아요', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    T(MAIN.x + 14, MAIN.y + 24, '아래 물질을 끌어다 pH 눈금 근처에 놓으세요 (' + lifePlaced() + ' / 9)', 13.5, MUTED, 'left', 800);
    // 눈금
    phStrip(g.x0, g.ruler, W, 26); phTicks(g.x0, g.ruler + 28, W, 1, 13);
    T(g.x0 - 6, g.ruler + 18, 'pH', 14, INK, 'right', 800);
    // 지시약
    const bt = [[0, 6, '#facc15', 'BTB: 노란색'], [6, 7.6, '#4ade80', '초록'], [7.6, 14, '#3b82f6', '파란색']];
    bt.forEach(([a, b, c, lab]) => { ctx.fillStyle = c; ctx.fillRect(lifeX(g, a), g.btb, lifeX(g, b) - lifeX(g, a), 18); T((lifeX(g, a) + lifeX(g, b)) / 2, g.btb + 14, lab, 12.5 + 0.5, a === 7.6 ? '#fff' : INK, 'center', 800); });
    T(g.x0 - 6, g.btb + 14, 'BTB', 13, MUTED, 'right', 800); T(g.x0 - 6, g.pp + 14, 'PP', 13, MUTED, 'right', 800);
    ctx.fillStyle = '#fff'; ctx.fillRect(g.x0, g.pp, lifeX(g, 8.3) - g.x0, 18); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.2; ctx.strokeRect(g.x0, g.pp, W, 18);
    const gp = ctx.createLinearGradient(lifeX(g, 8.3), 0, lifeX(g, 10), 0); gp.addColorStop(0, '#ffffff'); gp.addColorStop(1, '#e11d74'); ctx.fillStyle = gp; ctx.fillRect(lifeX(g, 8.3), g.pp, lifeX(g, 10) - lifeX(g, 8.3), 18); ctx.fillStyle = '#e11d74'; ctx.fillRect(lifeX(g, 10), g.pp, g.x1 - lifeX(g, 10), 18);
    T(lifeX(g, 4.1), g.pp + 14, '페놀프탈레인: 무색', 12.5 + 0.5, INK, 'center', 800); T(lifeX(g, 12), g.pp + 14, '붉은색', 12.5 + 0.5, '#fff', 'center', 800);
    // 배치된 태그의 연결선
    L.items.forEach((it) => { if (it.pH != null && it !== L.drag) { ctx.strokeStyle = 'rgba(70,90,130,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(lifeX(g, it.pH), it.y + 13); ctx.lineTo(lifeX(g, it.pH), g.ruler); ctx.stroke(); D.sphere(lifeX(g, it.pH), g.ruler, 3.6, lifeOk(it) ? '#26324a' : '#e2464b', { gloss: false }); } });
    // 트레이
    D.roundRect(MAIN.x + 4, g.trayTop - 6, MAIN.w - 8, PHONE ? 3 * (g.th + g.tgap) + 4 : g.th + 12, 10); ctx.fillStyle = '#f4f1fc'; ctx.fill();
    L.items.forEach((it) => { if (it.pH == null && it !== L.drag) drawItem(it, true); });
    L.items.forEach((it) => { if (it.pH != null && it !== L.drag) drawItem(it, false); });
    if (L.drag) {
      const dz = inDrop(L.drag.px, L.drag.py);
      if (dz) { const ph = dropPH(L.drag.px), x = lifeX(g, ph); ctx.strokeStyle = PUR; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x, g.tagTop); ctx.lineTo(x, g.pp + 18); ctx.stroke(); ctx.setLineDash([]); D.label(x, g.tagTop - 4, 'pH ' + ph.toFixed(1), { bg: '#5b21b6', size: 13.5 }); }
      drawItem(L.drag.it, false);
    }
    if (L.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + L.shake * 0.2 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    if (S.gate === 'cmp' || S.lf.cmpOpen) {
      const row = cmpRow, ok = row.ok, y = INFO.y;
      T(INFO.x + 16, y + 26, '레몬즙(pH 2)과 순수한 물(pH 7)의 [H⁺] 비교', 15, '#b45309', 'left', 800);
      T(INFO.x + 16, y + 56, '🍋 pH 2 → [H⁺] = ' + sciTxt(e10(-2)) + ' M', 14.5, INK, 'left', 800);
      T(INFO.x + 16, y + 82, '💧 pH 7 → [H⁺] = ' + sciTxt(e10(-7)) + ' M', 14.5, INK, 'left', 800);
      T(INFO.x + 16, y + 112, ok ? '레몬즙의 [H⁺] / 물의 [H⁺] = ' + sciTxt(e10(-2) / e10(-7)) + ' = 10⁵배' : 'pH가 5 차이 나면 [H⁺]는 몇 배 차이일까요?', 14.5, ok ? '#14803f' : MUTED, 'left', 800);
    } else {
      T(INFO.x + 16, INFO.y + 26, 'pH가 1 작을수록 [H⁺]는 10배 커요', 15, '#5b21b6', 'left', 800);
      textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, 'BTB 용액은 pH 6.0 이하에서 노란색, 6.0~7.6에서 초록색, 7.6 이상에서 파란색이에요. 페놀프탈레인은 pH 8.3 정도부터 붉어져요. 물질을 pH 눈금에 놓으면 지시약 색과 연결해 볼 수 있어요.', 14, INK, 20, 700);
    }
  }
  function inDrop(px, py) { const g = LG(); return px >= g.x0 - 14 && px <= g.x1 + 14 && py >= g.zoneTop && py <= g.zoneBot; }
  const dropPH = (px) => { const g = LG(); return clamp(Math.round((px - g.x0) / (g.x1 - g.x0) * 140) / 10, 0, 14); };
  function lifeHit(p) {
    const L = S.lf, g = LG();
    for (let i = L.items.length - 1; i >= 0; i--) {
      const it = L.items[i];
      if (it.pH != null) { const r = tagRect(it); if (pointInRect(p, { x: r.x - 4, y: r.y - 4, w: r.w + 8, h: r.h + 8 })) return it; }
    }
    for (let i = L.items.length - 1; i >= 0; i--) { const it = L.items[i]; if (it.pH == null && Math.abs(p.x - it.x) <= g.tw / 2 && Math.abs(p.y - it.y) <= g.th / 2) return it; }
    return null;
  }
  function stepLife(dt) { lifeTargets(dt); S.lf.shake = Math.max(0, S.lf.shake - dt); }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'life') return false;
      const it = lifeHit(p); if (!it) return false;
      S.lf.drag = { it, px: p.x, py: p.y }; Sound.click(); return true;
    },
    move(p) { const d = S.lf.drag; if (d) { d.px = p.x; d.py = p.y; } },
    up(p) {
      const d = S.lf.drag; if (!d) return; S.lf.drag = null; const it = d.it;
      if (inDrop(p.x, p.y)) { it.pH = dropPH(p.x); it.pop = 0.001; Sound.success(); if (lifeOk(it)) { const g = LG(); flash(lifeX(g, it.pH), g.ruler, ['#14a058', '#ffb400', '#8b5cf6']); } }
      else { it.pH = null; Sound.tick(); }
      updateCtl();
    },
    hover(p) { return S.mode === 'life' && lifeHit(p) ? 'grab' : 'default'; },
  });

  /* ---------- UI 요소 ---------- */
  PS.forEach((q) => {
    const host = document.createElement('div'); host.dataset.ps = q.k; $('#pcRows').appendChild(host);
    const cb = (r, done) => { if (done && r.test() === false) S.pc.shake = 0.4; updateCtl(); };
    const specs = q.kind === 'acid' ? [{ label: q.name + '의 pH', ans: q.pH, tol: 0.015, ph: '0.00' }]
      : q.k === 'ca' ? [{ label: '[OH⁻] (mol/L) = 2 × 0.020', ans: q.oh, tol: 0.0006, ph: '0.000' }, { label: 'pOH', ans: q.pOH, tol: 0.015, ph: '0.00' }, { label: 'pH', ans: q.pH, tol: 0.015, ph: '0.00' }]
        : [{ label: 'pOH', ans: q.pOH, tol: 0.015, ph: '0.00' }, { label: 'pH', ans: q.pH, tol: 0.015, ph: '0.00' }];
    pcRows[q.k] = specs.map((sp) => mkRow(host, sp, cb));
  });
  makeChips($('#pSel'), PS.map((q) => [q.k, q.short]), (v) => { S.pc.k = v; updateCtl(); });
  makeChips($('#dSub'), [['hcl', '● 강산 HCl'], ['naoh', '■ 강염기 NaOH']], (v) => { dpSwitch(v); updateCtl(); });
  const cmpRow = mkRow($('#cmpRow'), { label: '[H⁺]의 비 (레몬즙 ÷ 순수한 물)', sci: true, ans: 1e5, rel: 0.05, unit: '배' }, () => updateCtl());
  const pcDone = (k) => pcRows[k].every((r) => r.ok);
  const selI = [$('#selInt1'), $('#selInt2')];
  selI.forEach((s) => s.addEventListener('change', () => { Sound.click(); s.classList.remove('bad'); }));
  function uiExtra() {
    const pk = {}; PS.forEach((q) => { pk[q.k] = pcDone(q.k); });
    markChips($('#pSel'), S.pc.k, pk); $$('#pcRows > div').forEach((n) => { n.hidden = n.dataset.ps !== S.pc.k; });
    markChips($('#dSub'), S.dp.sub);
    $('#oPH').textContent = 'pH ' + S.ex.pH + ' · [H⁺] = ' + sciTxt(e10(-S.ex.pH)) + ' M'; $('#sPH').value = S.ex.pH;
    $('#pMinus').disabled = S.ex.pH <= 1; $('#pPlus').disabled = S.ex.pH >= 13;
    $('#bLog').textContent = S.ex.logT ? '↩ 보통 눈금으로 돌리기' : '📏 로그 눈금(pH)으로 바꾸기'; $('#bLog').classList.toggle('btn-primary', !S.ex.logT);
    const d = S.dp, i = d.step[d.sub];
    $('#bDilute').disabled = !!d.act || i >= 7; $('#bRecord').disabled = !!d.act || d.rec[d.sub][i] != null;
    $('#bDilute').textContent = i >= 7 ? '💧 마지막 용액이에요' : '💧 10배 희석하기'; $('#bRecord').textContent = d.rec[d.sub][i] != null ? '✅ 기록했어요' : '📋 기록하기 (' + dilPH(d.sub, i).toFixed(1) + ')';
  }
  function setPH(v) { S.ex.pH = clamp(Math.round(v), 1, 13); S.ex.moved = true; updateCtl(); }
  $('#sPH').addEventListener('input', (e) => setPH(+e.target.value));
  $('#pMinus').addEventListener('click', () => { Sound.tick(); setPH(S.ex.pH - 1); });
  $('#pPlus').addEventListener('click', () => { Sound.tick(); setPH(S.ex.pH + 1); });
  $('#bLog').addEventListener('click', () => { Sound.click(); S.ex.logT = S.ex.logT ? 0 : 1; updateCtl(); });
  $('#bDilute').addEventListener('click', dpDilute); $('#bRecord').addEventListener('click', dpRecord);
  $('#bDpClr').addEventListener('click', () => { Sound.click(); dpClear(); });

  function readouts() {
    if (S.mode === 'exp') { const p = S.ex.pH; setRead('pH', String(p), '[H⁺]', sciTxt(e10(-p)) + ' M', '눈금', S.ex.logT ? '로그 눈금' : '보통 눈금'); }
    else if (S.mode === 'calc') { const q = PS.find((x) => x.k === S.pc.k), ok = pcDone(q.k); setRead('용액', q.name, q.kind === 'acid' ? '[H⁺]' : '[OH⁻]', sciTxt(q.kind === 'acid' ? q.h : q.oh) + ' M', 'pH', ok ? q.pH.toFixed(2) : '?'); }
    else if (S.mode === 'dil') { const d = S.dp, i = d.step[d.sub]; setRead('시료', SUBS[d.sub].name + ' ' + sciTxt(dilConc(i)) + ' M', '측정한 pH', dilPH(d.sub, i).toFixed(1), '기록한 점', 'HCl ' + dpCount('hcl') + ' · NaOH ' + dpCount('naoh')); }
    else setRead('배치한 물질', lifePlaced() + ' / 9', '알맞은 위치', lifeGood() + ' / 9', '[H⁺] 비 (pH 2 : pH 7)', '10⁵배');
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '지수 척도: 너무 넓은 [H⁺]', short: '지수 척도', icon: '📏', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: pH가 1 차이 나면 산성의 세기는 얼마나 다를까? 산을 계속 묽히면 염기성이 될까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> Kw = [H⁺][OH⁻] = 1.0×10⁻¹⁴를 배웠고, <b>앞의 몰 농도 차시</b>에서 H⁺, OH⁻ 농도를 구하는 법을 익혔어요. 그런데 [H⁺]는 10⁻¹ M에서 10⁻¹³ M까지 너무 넓게 변해요.</div>' +
        '<p>[H⁺]를 보통 눈금으로 그리면 어떻게 될까요? 로그 눈금으로 바꾼 값이 바로 <b>pH = −log[H⁺]</b>예요.</p>',
      features: ['exp'],
      setup() { S.gate = ''; S.ex.pH = 7; S.ex.logT = 0; S.ex.moved = false; setScene('exp'); },
      recap: 'pH = −log[H⁺]이고, [H⁺] = 10^(−pH)예요. pH가 1 커지면 [H⁺]는 1/10이 돼요. 넓게 변하는 [H⁺]를 로그로 바꿔 한눈에 볼 수 있어요.',
      summary: '<ul><li>[H⁺]는 10⁻¹ ~ 10⁻¹³ M로 변해서 보통 눈금으로는 대부분 안 보여요 → <b>로그 눈금</b>이 필요해요.</li><li><b>pH = −log[H⁺]</b>, [H⁺] = 10^(−pH)</li><li>[H⁺] = 1.0×10⁻⁴ M → pH 4</li><li>pH 1 차이 = [H⁺] 10배 차이, pH 3과 pH 6은 [H⁺]가 <b>1000배</b> 차이</li></ul>',
      missions: [
        {
          title: '[H⁺] = 10⁻⁴ M 만들기',
          goal: '“📏 로그 눈금(pH)으로 바꾸기”를 누르고, pH 슬라이더로 <b>[H⁺] = 1.0×10⁻⁴ M</b>이 되게 하세요.',
          hint: '[H⁺] = 10^(−pH)이므로 10⁻⁴ M이면 pH = 4예요. 슬라이더를 4에 맞춰요.',
          setup() { S.gate = ''; S.ex.pH = 7; S.ex.logT = 0; setScene('exp'); },
          check: () => S.ex.pH === 4 && S.ex.logT === 1 && S.ex.log > 0.98, hold: 0.8,
          status: () => 'pH ' + S.ex.pH + ' ' + mark(S.ex.pH === 4) + ' &nbsp; 로그 눈금 ' + mark(S.ex.logT === 1),
          explain: '[H⁺] = 1.0×10⁻⁴ M이면 pH = −log(10⁻⁴) = <b>4</b>예요. 보통 눈금에서는 pH 4의 막대가 너무 짧아 보이지 않았지만, 로그 눈금에서는 모든 pH를 한눈에 비교할 수 있어요.',
        },
        {
          type: 'quiz', title: 'pH 3과 pH 6의 [H⁺] 차이',
          goal: 'pH 3인 용액과 pH 6인 용액의 <b>[H⁺]는 몇 배</b> 차이일까요?',
          setup() { S.gate = ''; S.ex.logT = 1; setScene('exp'); },
          choices: ['3배', '30배', '1000배', '10⁶배'],
          answer: 2,
          feedback: ['pH는 로그 값이라서 3 차이는 3배가 아니라 10³배예요.', '10배가 3번이면 10³ = 1000배예요.', '', '[H⁺]는 10⁻³ M와 10⁻⁶ M이에요. 차이는 10⁶이 아니라 10³이에요.'],
          explain: 'pH 3은 [H⁺] = 10⁻³ M, pH 6은 10⁻⁶ M이에요. 비는 10⁻³ ÷ 10⁻⁶ = 10³ = <b>1000배</b>예요. pH가 1 달라질 때마다 10배씩 달라져요.',
        },
      ],
    },
    {
      title: 'pH 계산: 로그로 바꾸기', short: 'pH 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> pH = −log[H⁺]임을 알았어요. 이제 실제 용액의 pH를 계산해요. 강산 HCl과 강염기 NaOH는 완전히 이온화한다고 가정해요(아레니우스 정의).</div>' +
        '<p>HCl 3가지의 pH를 구하고, 염기는 [OH⁻] → pOH → pH 순서로 바꿔요. Ca(OH)₂는 몰 농도 차시에서 구한 [OH⁻] = 2 × 농도를 써요. 로그 값 log 2 ≈ 0.30, log 5 ≈ 0.70을 쓸 수 있어요.</div>',
      features: ['calc'],
      setup() { S.gate = ''; S.pc.k = 'h1'; setScene('calc'); },
      recap: '산: pH = −log[H⁺]. 염기: pOH = −log[OH⁻], pH = 14 − pOH. 예) 0.0020 M HCl → pH = 3 − log 2 = 2.70, 0.020 M Ca(OH)₂ → [OH⁻] = 0.040 M → pH 12.60',
      summary: '<ul><li>0.010 M HCl → pH <b>2</b>; 0.0020 M HCl → 3 − log 2 = <b>2.70</b>; 0.050 M HCl → 2 − log 5 = <b>1.30</b></li><li>0.0010 M NaOH → pOH 3 → pH <b>11</b></li><li>0.020 M Ca(OH)₂ → [OH⁻] = 0.040 M → pOH = 2 − log 4 = 1.40 → pH <b>12.60</b></li><li>pH + pOH = 14 (25 °C), pH &lt; 7 산성, pH = 7 중성, pH &gt; 7 염기성</li></ul>',
      missions: [
        {
          title: '강산 HCl의 pH 3문제',
          goal: '0.010 M, 0.0020 M, 0.050 M <b>HCl</b>의 pH를 구해 소수 둘째 자리까지 쓰세요.',
          hint: '[H⁺] = 산의 농도예요. 0.0020 M = 2.0×10⁻³ → pH = 3 − log 2 = 3 − 0.30. 0.050 M = 5.0×10⁻² → pH = 2 − log 5 = 2 − 0.70이에요.',
          setup() { S.gate = ''; S.pc.k = 'h1'; ['h1', 'h2', 'h3'].forEach((k) => pcRows[k].forEach((r) => r.clear())); setScene('calc'); },
          check: () => ['h1', 'h2', 'h3'].every(pcDone), hold: 0.5,
          status: () => '0.010 M ' + mark(pcDone('h1')) + ' 0.0020 M ' + mark(pcDone('h2')) + ' 0.050 M ' + mark(pcDone('h3')),
          explain: '0.010 M HCl: [H⁺] = 10⁻² → pH <b>2.00</b>. 0.0020 M: [H⁺] = 2.0×10⁻³ → pH = 3 − log 2 = 3 − 0.30 = <b>2.70</b>. 0.050 M: [H⁺] = 5.0×10⁻² → pH = 2 − log 5 = 2 − 0.70 = <b>1.30</b>이에요.',
        },
        {
          title: '강염기의 pOH와 pH',
          goal: '<b>0.0010 M NaOH</b>와 <b>0.020 M Ca(OH)₂</b>의 pOH와 pH를 구하세요.',
          hint: 'NaOH는 [OH⁻] = 10⁻³ → pOH 3, pH = 14 − 3. Ca(OH)₂는 OH⁻가 2개라서 [OH⁻] = 2 × 0.020 = 0.040 M, pOH = 2 − log 4 = 2 − 0.60이에요.',
          setup() { S.gate = ''; S.pc.k = 'n1'; ['n1', 'ca'].forEach((k) => pcRows[k].forEach((r) => r.clear())); setScene('calc'); },
          check: () => pcDone('n1') && pcDone('ca'), hold: 0.5,
          status: () => 'NaOH ' + mark(pcDone('n1')) + ' Ca(OH)₂ ' + mark(pcDone('ca')),
          explain: 'NaOH: pOH = 3, pH = 14 − 3 = <b>11</b>. Ca(OH)₂: [OH⁻] = 0.040 M, pOH = 2 − log 4 = 1.40, pH = 14 − 1.40 = <b>12.60</b>이에요. 이온 농도는 몰 농도 차시에서 배운 방법으로 구했어요.',
        },
        {
          type: 'quiz', title: 'pH 7보다 작으면 산성인 까닭',
          goal: 'pH가 7보다 작은 용액이 <b>산성</b>인 까닭은? (25 °C)',
          setup() { S.gate = ''; setScene('calc'); },
          choices: ['pH 숫자가 작으면 물질의 양이 적기 때문이에요', 'pH < 7이면 [H⁺]가 1.0×10⁻⁷ M보다 커서 [H⁺] > [OH⁻]이기 때문이에요', 'pH가 7보다 작으면 OH⁻가 없기 때문이에요', 'pH는 온도와 관계없이 항상 7보다 작으면 산성이기 때문이에요'],
          answer: 1,
          feedback: ['pH는 양이 아니라 [H⁺]의 로그 값이에요.', '', '산성에도 OH⁻가 아주 조금 있어요(Kw 규칙).', '이 기준(pH 7)은 25 °C 기준이에요. 기준은 [H⁺]와 [OH⁻]의 비교예요.'],
          explain: 'pH &lt; 7이면 [H⁺] &gt; 1.0×10⁻⁷ M이고 Kw 때문에 [OH⁻] &lt; 1.0×10⁻⁷ M이에요. 즉 <b>[H⁺] &gt; [OH⁻]</b>라서 산성이에요.',
        },
      ],
    },
    {
      title: '희석 그래프: 묽힐수록 pH는?', short: '희석 그래프', icon: '📈', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도에서 pH를 계산했어요. 이번에는 <b>강산과 강염기를 10배씩 묽히며</b> 실제 pH 자료를 모아 그래프로 나타내고 해석해요.</div>' +
        '<p>0.1 M HCl과 0.1 M NaOH를 피펫 1 mL + 증류수 9 mL로 10배씩 묽히며 pH 측정기 값을 표에 기록해요. 그래프의 가로축은 −log(몰 농도), 세로축은 pH예요.</p>',
      features: ['dil'],
      setup() { S.gate = ''; dpClear(); S.dp.sub = 'hcl'; dpSwitch('hcl'); setScene('dil'); },
      recap: '10배 묽힐 때마다 강산의 pH는 1씩 커지고 강염기의 pH는 1씩 작아져요. 그래프는 처음엔 기울기 1의 직선이지만 10⁻⁷ M 이후로는 물의 자동 이온화 때문에 pH 7에 접근해요.',
      summary: '<ul><li>HCl: 10⁻¹ ~ 10⁻⁶ M에서 pH 1.0 · 2.0 · 3.0 · 4.0 · 5.0 · 6.0 (−log 농도와 같아요), 10⁻⁷ M에서 6.8, 10⁻⁸ M에서 7.0</li><li>NaOH: 10⁻¹ ~ 10⁻⁴ M에서 pH 13.0 · 12.0 · 11.0 · 10.0</li><li>10배 희석 → 강산 pH <b>+1</b>, 강염기 pH <b>−1</b> (7을 향해)</li><li>아주 묽은 산(10⁻⁸ M HCl)도 <b>pH 7을 넘지 않아요</b>: 물의 자동 이온화로 생기는 H⁺ 1.0×10⁻⁷ M를 무시할 수 없기 때문이에요.</li></ul>',
      missions: [
        {
          title: '희석하며 pH 기록하고 그래프 그리기',
          goal: '<b>HCl 8점</b>(10⁻¹ ~ 10⁻⁸ M)과 <b>NaOH 4점</b>(10⁻¹ ~ 10⁻⁴ M)의 pH를 기록해 그래프에 나타내세요.',
          hint: '“💧 10배 희석하기”로 한 단계 묽히고 “📋 기록하기”를 눌러요. 처음 0.1 M도 기록해야 해요. 용액은 단추 위에서 HCl과 NaOH를 바꿔 선택해요.',
          setup() { S.gate = ''; setScene('dil'); },
          check: () => dpDone('hcl', 8) && dpDone('naoh', 4), hold: 0.5,
          status: () => 'HCl ' + dpCount('hcl') + ' / 8 ' + mark(dpDone('hcl', 8)) + ' &nbsp; NaOH ' + dpCount('naoh') + ' / 4 ' + mark(dpDone('naoh', 4)),
          explain: 'HCl은 pH 1.0, 2.0, … 6.0까지 −log(농도)와 같고 직선을 이루다가 10⁻⁷ M에서 6.8, 10⁻⁸ M에서 7.0으로 휘어요. NaOH는 13.0, 12.0, 11.0, 10.0으로 내려가요. 두 곡선은 pH 7을 중심으로 대칭이에요.',
        },
        {
          title: '희석 자료 해석하기', manual: true,
          goal: '문장을 완성하고 <b>✔ 확인하기</b>를 누르세요. 10배 희석할 때마다 <b>강산의 pH는 □</b>, <b>강염기의 pH는 □</b>.',
          hint: '표에서 HCl은 1.0 → 2.0 → 3.0으로, NaOH는 13.0 → 12.0 → 11.0으로 변했어요.',
          setup() { S.gate = 'interp'; selI.forEach((s) => { s.value = ''; s.classList.remove('bad'); }); setScene('dil'); },
          check() {
            const a = selI[0].value, b = selI[1].value; if (!a || !b) return '두 칸을 모두 골라 주세요.';
            let m = '';
            if (a !== 'up') { selI[0].classList.add('bad'); m = '강산을 묽히면 [H⁺]가 1/10이 되어 pH는 커져요.'; } else selI[0].classList.remove('bad');
            if (b !== 'down') { selI[1].classList.add('bad'); m += (m ? ' ' : '') + '강염기를 묽히면 [OH⁻]가 1/10이 되어 pOH는 1 커지고 pH는 1 작아져요.'; } else selI[1].classList.remove('bad');
            return m || true;
          },
          status: () => '강산 ' + mark(selI[0].value === 'up') + ' 강염기 ' + mark(selI[1].value === 'down'),
          explain: '강산은 10배 묽힐 때 [H⁺]가 1/10이 되어 pH가 <b>1 증가</b>하고, 강염기는 [OH⁻]가 1/10이 되어 pOH가 1 커지므로 pH가 <b>1 감소</b>해요. 둘 다 pH 7에 가까워져요.',
        },
        {
          type: 'quiz', title: '10⁻⁸ M 염산의 pH는 8일까?',
          goal: '10⁻⁸ M HCl의 pH가 계산대로 <b>8이 아니라 7에 가까운</b> 까닭은?',
          setup() { S.gate = ''; setScene('dil'); },
          choices: ['HCl이 물에서 이온화하지 않기 때문이에요', '물의 자동 이온화로 생기는 H⁺ 1.0×10⁻⁷ M를 무시할 수 없기 때문이에요', 'pH는 8보다 클 수 없기 때문이에요', '측정기의 오차 때문이에요'],
          answer: 1,
          feedback: ['HCl은 강산이라 모두 이온화해요.', '', 'pH 8은 염기성인데, 산을 넣고서 염기성이 될 수는 없어요.', '오차가 아니라 물의 H⁺ 때문이에요.'],
          explain: '10⁻⁸ M HCl에서 HCl이 내는 H⁺(10⁻⁸ M)는 물에서 오는 H⁺(10⁻⁷ M)보다 작아서 무시할 수 없어요. 실제 [H⁺] ≈ 1.05×10⁻⁷ M → pH ≈ 6.98로 <b>7을 넘지 않아요</b>.',
        },
      ],
    },
    {
      title: '생활 속 pH: 눈금에 놓아 보기', short: '생활 속 pH', icon: '🍋', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 묽힐수록 pH가 7에 가까워지는 것을 봤어요. 이제 우리 주변의 물질을 pH 눈금에 놓고 <b>[H⁺]의 크기</b>를 비교해요.</div>' +
        '<p>위액, 레몬즙, 식초, 커피, 물, 혈액, 바닷물, 비누, 세정제를 끌어서 알맞은 pH에 놓아 보세요. BTB와 페놀프탈레인 지시약의 색 변화와도 연결해 봐요.</p>',
      features: ['life'],
      setup() { S.gate = ''; S.lf.cmpOpen = false; setScene('life'); },
      recap: 'pH가 2 작으면 [H⁺]는 10²배, 5 작으면 10⁵배 커요. 생활 속 물질은 위액(pH 약 2)에서 세정제(pH 12~13)까지 넓게 퍼져 있어요.',
      summary: '<ul><li>위액 pH 1.5~2, 레몬즙 2, 식초 2.5~3, 커피 5, 순수한 물 7, 혈액 7.4, 바닷물 8.1, 비누 9~10, 세정제 12~13 (대략)</li><li>레몬즙(pH 2)과 물(pH 7)의 [H⁺] 비: 10⁻² ÷ 10⁻⁷ = <b>10⁵배</b></li><li>pH 5인 커피는 pH 7인 물보다 [H⁺]가 <b>100배</b> 커요.</li><li>BTB: 노랑(산성) · 초록(중성) · 파랑(염기성), 페놀프탈레인: 무색 → 붉은색(염기성)</li></ul>',
      missions: [
        {
          title: '물질을 pH 눈금에 놓기', manual: true,
          goal: '아홉 물질을 끌어서 알맞은 pH 위치에 놓고 <b>✔ 확인하기</b>를 누르세요. (눈금 근처 영역에 놓아요)',
          hint: '산성(pH 7보다 작음): 위액, 레몬즙, 식초, 커피. 중성 근처: 물, 혈액. 염기성: 바닷물, 비누, 세정제. 위액 ≈ 2, 커피 ≈ 5, 비누 ≈ 9~10, 세정제 ≈ 12~13이에요.',
          setup() { S.gate = ''; S.lf.items.forEach((it) => { it.pH = null; }); S.lf.drag = null; setScene('life'); },
          check() {
            const L = S.lf; if (lifePlaced() < 9) return '아직 눈금에 놓지 않은 물질이 있어요. (' + lifePlaced() + ' / 9)';
            const bad = L.items.filter((it) => !lifeOk(it)); if (!bad.length) return true;
            L.shake = 0.4; const it = bad[0];
            return it.q.name + '의 위치를 다시 생각해 보세요. ' + (lifeRep(it.q) < 6 ? '산성이라서 pH 7보다 훨씬 작아요.' : lifeRep(it.q) > 8 ? '염기성이라서 pH 7보다 커요.' : '중성에 가까워요.');
          },
          status: () => '놓은 물질 ' + lifePlaced() + ' / 9 &nbsp; 알맞은 위치 ' + lifeGood() + ' / 9',
          explain: '위액 약 2, 레몬즙 2, 식초 2.5~3, 커피 5, 순수한 물 7, 혈액 7.4, 바닷물 8.1, 비누 9~10, 세정제 12~13이에요. 산성인 물질은 BTB가 노랗고, 염기성인 물질은 BTB가 파랗고 페놀프탈레인이 붉어져요.',
        },
        {
          title: '레몬즙과 물의 [H⁺] 비교',
          goal: '레몬즙(pH 2)의 [H⁺]는 순수한 물(pH 7)의 <b>몇 배</b>인지 쓰세요.',
          hint: 'pH 2 → [H⁺] = 10⁻² M, pH 7 → 10⁻⁷ M예요. 10⁻² ÷ 10⁻⁷ = 10⁵이니까 앞 칸에 1, 지수 칸에 5를 써요.',
          setup() { S.gate = 'cmp'; S.lf.cmpOpen = true; cmpRow.clear(); setScene('life'); },
          check: () => cmpRow.ok, hold: 0.5,
          status: () => '비교 계산 ' + mark(cmpRow.ok),
          explain: 'pH 차이가 5이므로 [H⁺]는 10⁵배 달라요. 10⁻² ÷ 10⁻⁷ = <b>10⁵ = 100000배</b>예요. 그래서 pH 숫자의 작은 차이가 [H⁺]의 큰 차이를 뜻해요.',
        },
        {
          type: 'quiz', title: '커피(pH 5)와 물(pH 7)',
          goal: '“pH 5인 커피는 pH 7인 물보다 [H⁺]가 <b>100배</b> 크다.” 이 설명은?',
          setup() { S.gate = ''; setScene('life'); },
          choices: ['맞아요. pH가 2 작아서 [H⁺]는 10² = 100배 커요', '틀려요. pH가 2 차이라서 2배예요', '틀려요. [H⁺]는 pH가 클수록 커요', '맞아요. 그런데 이유는 pH가 5배 작아서예요'],
          answer: 0,
          feedback: ['', 'pH는 로그 값이라서 pH 1 차이가 10배예요. 2 차이는 100배예요.', 'pH가 작을수록 [H⁺]가 커요 (pH = −log[H⁺]).', '5배가 아니라 pH 차이 2에 대한 10²배예요.'],
          explain: '[H⁺]는 커피 10⁻⁵ M, 물 10⁻⁷ M이에요. 비는 10⁻⁵ ÷ 10⁻⁷ = 10² = <b>100배</b>예요. pH 차이 1당 10배, 2당 100배예요.',
        },
      ],
    },
  ];

  setScene('exp');
  game = SciSim.game({
    simId: 'hc-ph', mount: '#game', badge: 'pH 박사', homeHref: '../../index.html#hc',
    featureLabels: { exp: '📏 지수 → 로그 눈금', calc: '🧮 pH 계산기', dil: '📈 희석 · 기록 · 그래프', life: '🍋 생활 속 pH 눈금' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  S.lf.items.forEach((it) => { it.init = false; });
  function stepAll1(dt) { stepExp(dt); stepCalc(dt); stepDp(dt); stepLife(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'exp') drawExp(t); else if (S.mode === 'calc') drawCalc(t); else if (S.mode === 'dil') drawDil(t); else drawLife(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PS, LIFE, pcRows, cmpRow, selI, LG, lifeX, traySlot, lifeOk, lifePlaced, dilPH, dpDilute, dpRecord, dpClear, dpDone, dpCount, dpSwitch, setPH, get game() { return game; },
    setScene, pcDone, lifeHit,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
