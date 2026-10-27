/* 화학 Ⅳ. 역동적인 화학 반응 - 몰 농도 [12화학04-02]
   ① 모형: 농도 비교 (M = n/V, 퍼센트 농도와 구별) ② 분석: M 계산 (질량 → 몰수 → 몰 농도) ③ 탐구: 희석 (M V = M′V′) ④ 적용: 이온 농도
   몰랄 농도 · 용해 평형은 다루지 않아요. */
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

  const MODE_LABEL = { cmp: '🥤 농도 비교', calc: '🧮 M 계산', dil: '💧 희석', ion: '⚛️ 이온 농도' };
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };
  const BALL = 0.1;                       // 비커 그림에서 입자(●) 1개 = 0.1 mol
  const COL_SOL = '#8b5cf6';

  /* ---------- 자료 ---------- */
  const SETS = {
    same: [{ n: 2, V: 0.5, c: '#a7d3ff' }, { n: 5, V: 0.5, c: '#a7d3ff' }, { n: 3, V: 0.5, c: '#a7d3ff' }],
    diff: [{ n: 6, V: 1.0, c: '#a7d3ff' }, { n: 4, V: 0.5, c: '#a7d3ff' }, { n: 3, V: 0.25, c: '#a7d3ff' }],
  };
  const NAMES = ['A', 'B', 'C'];
  const molOf = (s) => s.n * BALL;
  const concOf = (s) => molOf(s) / s.V;
  const rankOrder = (set) => [0, 1, 2].sort((a, b) => concOf(set[b]) - concOf(set[a]));
  const CS = [
    { k: 'nacl', name: 'NaCl', MM: 58.5, mass: 11.7, V: 500, label: 'NaCl 11.7 g' },
    { k: 'naoh', name: 'NaOH', MM: 40, mass: 4.0, V: 250, label: 'NaOH 4.0 g' },
    { k: 'glu', name: '포도당', MM: 180, mass: 9.0, V: 100, label: '포도당 9.0 g' },
    { k: 'hcl', name: 'HCl', MM: 36.5, rev: true, Mc: 2.0, V: 250, label: '2.0 M HCl' },
  ];
  CS.forEach((s) => { if (!s.rev) { s.n = s.mass / s.MM; s.Vl = s.V / 1000; s.M = s.n / s.Vl; } else { s.Vl = s.V / 1000; s.n = s.Mc * s.Vl; s.mass = s.n * s.MM; } });
  const IONS = [
    { k: 'nacl', f: 'NaCl', c: 0.10, cs: '0.10', cat: ['Na⁺', 1, '#f59e0b', 13], an: ['Cl⁻', 1, '#22a06b', 15] },
    { k: 'cacl2', f: 'CaCl₂', c: 0.10, cs: '0.10', cat: ['Ca²⁺', 1, '#d946ef', 17], an: ['Cl⁻', 2, '#22a06b', 15] },
    { k: 'caoh2', f: 'Ca(OH)₂', c: 0.020, cs: '0.020', cat: ['Ca²⁺', 1, '#d946ef', 17], an: ['OH⁻', 2, '#3b82f6', 14] },
    { k: 'h2so4', f: 'H₂SO₄', c: 0.050, cs: '0.050', cat: ['H⁺', 2, '#ef4444', 11], an: ['SO₄²⁻', 1, '#eab308', 24] },
    { k: 'naoh', f: 'NaOH', c: 0.10, cs: '0.10', cat: ['Na⁺', 1, '#f59e0b', 13], an: ['OH⁻', 1, '#3b82f6', 14] },
  ];
  const ionConc = (q, which) => +(q.c * q[which][1]).toFixed(4);
  const fs2 = (x) => x.toPrecision(2);
  const DIL = { n0: 0.10, M0: 1.0, V0: 100, Vmax: 1200 };         // 1.0 M 용액 100 mL = 0.10 mol
  const dilM = (V) => DIL.n0 / (V / 1000);

  /* ---------- 상태 ---------- */
  Object.assign(S, {
    mode: 'cmp', sub: { cmp: 'diff' },
    cmp: { pred: { same: [], diff: [] }, per: false, lv: [0.5, 0.5, 0.5], perT: 0, shake: 0, sel: [null, null] },
    calc: { k: 'nacl', pop: {} },
    dil: { V: 100, Vd: 100, pulse: 0 },
    ion: { k: 'nacl', split: 0, splitT: 0, auto: 0.6, done: {} },
  });
  const cmpSet = () => SETS[S.sub.cmp];
  const cmpPred = () => S.cmp.pred[S.sub.cmp];

  /* ---------- UI 요소 ---------- */
  const calcRows = {};
  CS.forEach((s) => {
    const host = document.createElement('div'); host.dataset.samp = s.k; $('#calcRows').appendChild(host);
    const specs = s.rev
      ? [{ label: 'HCl의 몰수 n (mol)', unit: 'mol', ans: +s.n.toFixed(3), tol: 0.006 }, { label: 'HCl의 질량 (g) · 몰질량 36.5 g/mol', unit: 'g', ans: +s.mass.toFixed(2), tol: 0.06 }]
      : [{ label: s.name + '의 몰수 n (mol) · 몰질량 ' + s.MM + ' g/mol', unit: 'mol', ans: +s.n.toFixed(3), tol: 0.0006 }, { label: '용액의 부피 V (L)', unit: 'L', ans: s.Vl, tol: 0.0006 }, { label: '몰 농도 M (mol/L)', unit: 'M', ans: +s.M.toFixed(3), tol: 0.006 }];
    calcRows[s.k] = specs.map((sp) => mkRow(host, sp, (r, done) => { if (r.ok) popCalc(s.k, specs.indexOf(sp)); if (done && r.test() === false) S.calc.shake = 0.4; afterCalc(s.k); }));
  });
  const calcDone = (k) => calcRows[k].every((r) => r.ok);
  function popCalc(k, i) { S.calc.pop[k + i] = S.calc.pop[k + i] || 0.001; }
  function afterCalc(k) { if (calcDone(k)) { const g = calcGeom(); flash(g.chain.x + g.chain.w / 2, g.chain.y + g.chain.h / 2); } updateCtl(); }
  makeChips($('#cSel'), CS.map((s) => [s.k, s.label]), (v) => { S.calc.k = v; updateCtl(); });
  const ionRows = {};
  IONS.forEach((q) => {
    const host = document.createElement('div'); host.dataset.ion = q.k; $('#ionRows').appendChild(host);
    ionRows[q.k] = [
      mkRow(host, { label: q.cat[0] + '의 농도 (mol/L)', unit: 'M', ans: ionConc(q, 'cat'), tol: 0.0006 }, () => updateCtl()),
      mkRow(host, { label: q.an[0] + '의 농도 (mol/L)', unit: 'M', ans: ionConc(q, 'an'), tol: 0.0006 }, () => updateCtl()),
    ];
  });
  const ionDone = (k) => ionRows[k].every((r) => r.ok);
  makeChips($('#iSel'), IONS.map((q) => [q.k, q.c.toFixed(q.c < 0.05 ? 3 : 2).replace(/0$/, '') + ' M ' + q.f]), (v) => { S.ion.k = v; S.ion.split = 0; S.ion.splitT = 0; S.ion.auto = 0.7; updateCtl(); });
  const dilRows = [
    mkRow($('#dilRows'), { label: '① 2.0 M 용액 50 mL에 물을 더해 1000 mL로 만든 용액의 몰 농도 (M)', unit: 'M', ans: 0.10, tol: 0.0006 }, () => updateCtl()),
    mkRow($('#dilRows'), { label: '② 12 M 진한 염산 몇 mL로 1.0 M 100 mL를 만들까? (mL)', unit: 'mL', ans: 8.33, tol: 0.05 }, () => updateCtl()),
  ];

  function uiExtra() {
    syncSubsel();
    const ck = {}; CS.forEach((s) => { ck[s.k] = calcDone(s.k); });
    markChips($('#cSel'), S.calc.k, ck);
    $$('#calcRows > div').forEach((n) => { n.hidden = n.dataset.samp !== S.calc.k; });
    const ik = {}; IONS.forEach((q) => { ik[q.k] = ionDone(q.k); });
    markChips($('#iSel'), S.ion.k, ik);
    $$('#ionRows > div').forEach((n) => { n.hidden = n.dataset.ion !== S.ion.k; });
    $('#bPer').classList.toggle('on', S.cmp.per);
    $('#bPer').textContent = S.cmp.per ? '🔍 1 L당 보기: 켜짐' : '🔍 1 L당 입자 수 보기';
    $('#oDil').textContent = S.dil.V + ' mL';
    $('#sDil').value = S.dil.V;
    $('#dMinus').disabled = S.dil.V <= DIL.V0; $('#dPlus').disabled = S.dil.V >= DIL.Vmax;
    $('#bSplit').textContent = S.ion.splitT > 0.5 ? '↩ 다시 합치기' : '⚡ 이온으로 갈라지기';
  }
  $('#bPer').addEventListener('click', () => { Sound.click(); S.cmp.per = !S.cmp.per; updateCtl(); });
  $('#bCmpClr').addEventListener('click', () => { Sound.click(); S.cmp.pred[S.sub.cmp] = []; updateCtl(); });
  $('#bSplit').addEventListener('click', () => { Sound.click(); S.ion.splitT = S.ion.splitT > 0.5 ? 0 : 1; S.ion.auto = 0; updateCtl(); });
  const setDil = (v) => { S.dil.V = clamp(Math.round(v / 10) * 10, DIL.V0, DIL.Vmax); updateCtl(); };
  $('#sDil').addEventListener('input', (e) => setDil(+e.target.value));
  $('#dMinus').addEventListener('click', () => { Sound.tick(); setDil(S.dil.V - 10); });
  $('#dPlus').addEventListener('click', () => { Sound.tick(); setDil(S.dil.V + 10); });
  const selDef = [$('#selDef1'), $('#selDef2')];
  selDef.forEach((s) => s.addEventListener('change', () => { Sound.click(); s.classList.remove('bad'); }));

  /* ---------- 공통 그리기 도우미 ---------- */
  function cols2(tL, bL, tR, bR, foot) {
    const w2 = PHONE ? INFO.w - 32 : INFO.w / 2 - 28;
    const xL = INFO.x + 16, xR = PHONE ? INFO.x + 16 : INFO.x + INFO.w / 2 + 8, yR = PHONE ? INFO.y + 108 : INFO.y;
    T(xL, INFO.y + 26, tL, 15, '#b45309', 'left', 800); textBlock(xL, INFO.y + 50, w2, bL, 14, MUTED, 19, 700);
    T(xR, yR + 26, tR, 15, '#5b21b6', 'left', 800); textBlock(xR, yR + 50, w2, bR, 14, INK, 19, 800);
    if (!PHONE) { ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(INFO.x + INFO.w / 2, INFO.y + 14); ctx.lineTo(INFO.x + INFO.w / 2, INFO.y + INFO.h - 40); ctx.stroke(); }
    if (foot) textBlock(INFO.x + 16, INFO.y + INFO.h - (PHONE ? 36 : 24), INFO.w - 32, foot, 13.5, '#14803f', 18, 800);
  }

  /* ================= ① 농도 비교 ================= */
  const cmpGeom = () => {
    const bw = PHONE ? 92 : 116, bh = PHONE ? 262 : 214, by = MAIN.y + 58;
    return [0, 1, 2].map((i) => { const cx = MAIN.x + MAIN.w * (1 / 6 + i / 3); return { cx, x: cx - bw / 2, y: by, w: bw, h: bh }; });
  };
  function drawCmp(t) {
    const set = cmpSet(), pred = cmpPred(), G = cmpGeom();
    T(14, 26, S.sub.cmp === 'same' ? '🥤 부피가 같은 비커 3개' : '🥤 부피가 다른 비커 3개', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    T(MAIN.x + 14, MAIN.y + 22, '진한 비커부터 차례로 눌러 보세요', 14, MUTED, 'left', 800);
    T(MAIN.x + MAIN.w - 14, MAIN.y + 22, '● = 용질 0.1 mol', 14, COL_SOL, 'right', 800);
    set.forEach((s, i) => {
      const g = G[i];
      const ticks = [0.25, 0.5, 0.75, 1].map((f) => ({ f, long: f === 1 || f === 0.5, label: (f === 0.5 || f === 1) || !PHONE ? f.toFixed(2).replace(/0$/, '') + ' L' : '' }));
      const bk = beaker(g.x, g.y, g.w, g.h, { level: S.cmp.lv[i], color: s.c, ticks });
      // 입자 (액체 영역 안에만)
      drawBalls(bk, s.n, PHONE ? 6.5 : 7.5, COL_SOL, t, { off: i * 17 });
      // 순서 배지
      const rk = pred.indexOf(i);
      if (rk >= 0) { const by = MAIN.y + 40; D.sphere(g.cx, by, 14, rk === 0 ? '#e2464b' : rk === 1 ? '#f59e0b' : '#3b82f6', { gloss: false, text: String(rk + 1), textScale: 1.1 }); }
      else T(g.cx, MAIN.y + 45, '눌러요', 13, '#9aa5b6', 'center', 700);
      const M = concOf(s), per = s.n / s.V;
      const y0 = g.y + g.h + 24;
      T(g.cx, y0, NAMES[i] + ' · 용질 ' + fm(molOf(s), 1) + ' mol', 14, INK, 'center', 800);
      T(g.cx, y0 + 21, '용액 ' + s.V.toFixed(2) + ' L', 14, MUTED, 'center', 700);
      if (S.cmp.perT > 0.5) T(g.cx, y0 + 44, '1 L당 ' + fm(per, 0) + '개 = ' + fm(M, 1) + ' M', 14.5, '#5b21b6', 'center', 800, { alpha: sm((S.cmp.perT - 0.5) * 2) });
    });
    if (S.cmp.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + S.cmp.shake * 0.25 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    cols2('퍼센트 농도 (중학교)', '용질의 질량 / 용액의 질량 × 100\n→ 질량으로 진하기를 나타내요.', '몰 농도 M (이번 시간)', 'M = 용질의 몰수 (mol) / 용액의 부피 (L)\n단위: mol/L = M', '⚠️ 기준은 용매(물)의 부피가 아니라 용액 전체의 부피예요.');
  }
  function cmpTap(p) {
    const G = cmpGeom();
    for (let i = 0; i < 3; i++) {
      const g = G[i];
      if (p.x >= g.cx - MAIN.w / 6 + 4 && p.x <= g.cx + MAIN.w / 6 - 4 && p.y >= MAIN.y && p.y <= MAIN.y + MAIN.h) {
        const pr = cmpPred(); const at = pr.indexOf(i);
        Sound.click();
        if (at >= 0) pr.splice(at, 1); else if (pr.length < 3) pr.push(i);
        updateCtl(); return true;
      }
    }
    return false;
  }
  const cmpOK = () => { const pr = S.cmp.pred.diff, ord = rankOrder(SETS.diff); return pr.length === 3 && pr.every((v, i) => v === ord[i]); };
  function stepCmp(dt) {
    const set = cmpSet();
    S.cmp.lv = S.cmp.lv.map((v, i) => { const n = ap(v, set[i].V / 1.0, dt, 7); return Math.abs(n - set[i].V) < 0.0008 ? set[i].V : n; });
    S.cmp.perT = ap(S.cmp.perT, S.cmp.per ? 1 : 0, dt, 8); if (Math.abs(S.cmp.perT - (S.cmp.per ? 1 : 0)) < 0.01) S.cmp.perT = S.cmp.per ? 1 : 0;
    S.cmp.shake = Math.max(0, S.cmp.shake - dt);
  }

  /* ================= ② M 계산 ================= */
  function calcGeom() {
    const lens = PHONE ? { x: MAIN.x + 10, w: 150 } : { x: MAIN.x + 20, w: 230 };
    const chain = PHONE ? { x: MAIN.x + 172, y: MAIN.y + 14, w: 282, h: MAIN.h - 28 } : { x: MAIN.x + 290, y: MAIN.y + 14, w: 470, h: MAIN.h - 28 };
    return { lens, chain };
  }
  function chainBox(x, y, w, h, title, val, ok, pop, color) {
    const s = 0.92 + 0.08 * pop;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
    D.shadow(() => { D.roundRect(0, 0, w, h, 14); ctx.fillStyle = ok ? '#fff' : '#f7f3ff'; ctx.fill(); }, { blur: 7, y: 3 });
    ctx.strokeStyle = ok ? '#14a058' : PUR; ctx.lineWidth = 2.6; if (!ok) ctx.setLineDash([7, 5]); D.roundRect(0, 0, w, h, 14); ctx.stroke(); ctx.setLineDash([]);
    T(14, h / 2 + 5, title, 14, MUTED, 'left', 800);
    T(w - 14, h / 2 + 6, val, 19, ok ? color || INK : '#9aa5b6', 'right', 800);
    ctx.restore();
  }
  function drawCalc(t) {
    const s = CS.find((q) => q.k === S.calc.k), rows = calcRows[s.k], g = calcGeom();
    T(14, 26, '🧮 질량 → 몰수 → 몰 농도', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 왼쪽: 그릇 + 용질
    const bw = PHONE ? 100 : 124, bh = PHONE ? 230 : 214, bx = g.lens.x + (g.lens.w - bw) / 2 + (PHONE ? 0 : 26), by = MAIN.y + 44;
    const bk = beaker(bx, by, bw, bh, { level: 0.62, color: s.k === 'hcl' ? '#fca5a5' : '#a7d3ff', ticks: [{ f: 0.62, long: true, label: s.V + ' mL' }] });
    drawBalls(bk, s.rev ? 8 : Math.max(2, Math.round(s.n / 0.025)), 5.5, s.k === 'hcl' ? '#ef4444' : COL_SOL, t);
    T(bx + bw / 2, by + bh + 22, '용액 전체 ' + s.V + ' mL', 14, INK, 'center', 800);
    T(bx + bw / 2, by + bh + 42, '= ' + s.Vl.toFixed(3) + ' L', 14, '#b45309', 'center', 800);
    // 오른쪽: 계산 사슬
    const ch = g.chain, bh2 = 56, gap = (ch.h - 3 * bh2) / 2;
    const ys = [0, 1, 2].map((i) => ch.y + i * (bh2 + gap));
    const pop = (i) => (S.calc.pop[s.k + i] != null ? Math.min(1, S.calc.pop[s.k + i]) : rows[i].ok ? 1 : 0);
    let ttl, vals, arrows;
    if (!s.rev) {
      ttl = ['용질의 질량', '몰수 n', '몰 농도 M'];
      vals = [fm(s.mass, 1) + ' g', rows[0].ok ? fm(s.n, 3) + ' mol' : '? mol', rows[2].ok ? fm(s.M, 3) + ' mol/L' : '? mol/L'];
      arrows = ['몰질량 ' + s.MM + ' g/mol로 나눠요', '용액의 부피 ' + s.Vl.toFixed(3) + ' L로 나눠요' + (rows[1].ok || PHONE ? '' : '  (mL → L 주의!)')];
    } else {
      ttl = ['몰 농도 M', '몰수 n', '질량'];
      vals = [fm(s.Mc, 1) + ' mol/L', rows[0].ok ? fm(s.n, 2) + ' mol' : '? mol', rows[1].ok ? fm(s.mass, 2) + ' g' : '? g'];
      arrows = ['× 용액의 부피 ' + s.Vl.toFixed(3) + ' L', '× 몰질량 ' + s.MM + ' g/mol'];
    }
    const okv = s.rev ? [true, rows[0].ok, rows[1].ok] : [true, rows[0].ok, rows[2].ok];
    const popi = s.rev ? [1, pop(0), pop(1)] : [1, pop(0), pop(2)];
    [0, 1, 2].forEach((i) => chainBox(ch.x, ys[i], ch.w, bh2, ttl[i], vals[i], okv[i], i === 0 ? 1 : popi[i], i === 2 ? '#5b21b6' : INK));
    [0, 1].forEach((i) => {
      const y1 = ys[i] + bh2 + 4, y2 = ys[i + 1] - 4, ax = ch.x + 36;
      D.arrow(ax, y1, ax, y2, { color: '#b45309', width: 4 });
      T(ax + 18, (y1 + y2) / 2 + 5, arrows[i], 14, '#b45309', 'left', 800);
    });
    if (S.calc.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + S.calc.shake * 0.2 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    cols2('① 몰수 구하기', s.rev ? '몰수 n = M × V(L)\n질량 = 몰수 × 몰질량' : '몰수 n = 질량 / 몰질량', '② 몰 농도 구하기', s.rev ? '부피는 mL가 아니라 L로 바꿔 곱해요.' : 'M = n / V(L)\nV는 L 단위로!', '⚠️ 단위 환산: 1000 mL = 1 L → ' + s.V + ' mL = ' + s.Vl.toFixed(3) + ' L');
  }
  function stepCalc(dt) { Object.keys(S.calc.pop).forEach((k) => { S.calc.pop[k] = Math.min(1, S.calc.pop[k] + dt * 4); }); S.calc.shake = Math.max(0, (S.calc.shake || 0) - dt); }

  /* ================= ③ 희석 ================= */
  const VES = () => (PHONE ? { x: MAIN.x + 40, y: MAIN.y + 56, w: 190, h: 330 } : { x: MAIN.x + 50, y: MAIN.y + 40, w: 200, h: 262 });
  function drawDil(t) {
    const d = S.dil, v = VES(), M = dilM(d.V), Md = dilM(Math.max(d.Vd, 1));
    T(14, 26, '💧 물을 더해 묽히기 (1.0 M 100 mL에서 시작)', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const ticks = [200, 400, 600, 800, 1000, 1200].map((q) => ({ f: q / DIL.Vmax, long: true, label: q + ' mL' }));
    const a = 0.18 + 0.5 * clamp(Md / 1.0, 0, 1);
    const bk = beaker(v.x, v.y, v.w, v.h, { level: d.Vd / DIL.Vmax, color: '#8b5cf6', alpha: a, ticks });
    drawBalls(bk, 10, 4.6, '#6d28d9', t, { wob: 1.2 });
    T(v.x + v.w / 2, v.y + v.h + 22, '용질 ● 10개 = 0.10 mol (그대로)', 14, COL_SOL, 'center', 800);
    // 오른쪽 식
    const ex = PHONE ? MAIN.x + 255 : MAIN.x + 360, ew = PHONE ? 200 : 390;
    const bold = (x, y, s, size, c) => T(x, y, s, size, c, 'left', 800);
    bold(ex, MAIN.y + 52, '전체 부피 V′ = ' + d.V + ' mL', PHONE ? 15 : 18, INK);
    bold(ex, MAIN.y + (PHONE ? 80 : 84), '넣은 물 ' + (d.V - DIL.V0) + ' mL', PHONE ? 14.5 : 16, '#2563eb');
    bold(ex, MAIN.y + (PHONE ? 122 : 130), 'M × V = M′ × V′', PHONE ? 18 : 24, '#b45309');
    textBlock(ex, MAIN.y + (PHONE ? 152 : 164), ew, '1.0 M × 100 mL = M′ × ' + d.V + ' mL', PHONE ? 14.5 : 17, INK, 22, 800);
    bold(ex, MAIN.y + (PHONE ? 214 : 214), 'M′ = ' + M.toFixed(3) + ' M', PHONE ? 22 : 30, '#5b21b6');
    textBlock(ex, MAIN.y + (PHONE ? 244 : 248), ew, '물을 더해도 용질의 몰수는 그대로예요. 부피만 늘어 농도가 낮아져요.', 14, MUTED, 19, 700);
    if (PHONE) textBlock(ex, MAIN.y + 310, ew, '안전: 진한 산은 물에 산을 천천히 넣어 묽혀요.', 13.5, '#b4231f', 18, 800);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    cols2('희석의 규칙', '용액에 물을 더해도 용질의 몰수 n은 변하지 않아요.\nn = M × V = M′ × V′', '예) 계산해 보기', '2.0 M 50 mL → 1000 mL: M′ = 2.0 × 50 / 1000 = 0.10 M', '⚠️ 안전: 진한 산을 묽힐 때는 물에 산을 천천히 넣어요. (산에 물을 붓지 않아요.)');
  }
  function stepDil(dt) {
    const d = S.dil; const prev = d.Vd;
    d.Vd = ap(d.Vd, d.V, dt, 5); if (Math.abs(d.Vd - d.V) < 0.5) d.Vd = d.V;
    if (!RM && d.V > d.Vd + 3 && S.mode === 'dil') {
      const v = VES(), top = v.y + 5 + (v.h - 11) * (1 - d.Vd / DIL.Vmax), y0 = v.y - 6;
      if (Math.random() < dt * 22) { const dist = Math.max(10, top - y0), life = Math.sqrt(2 * dist / 520); parts.emit({ x: v.x + v.w / 2 + (Math.random() - 0.5) * 30, y: y0, vx: 0, vy: 0, life, size: 4.5, color: '#60a5fa', shape: 'circle', gravity: 520 }); }
    }
  }

  /* ================= ④ 이온 농도 ================= */
  const ionLens = () => (PHONE ? { x: MAIN.x + 322, y: MAIN.y + 196, r: 128 } : { x: MAIN.x + 520, y: MAIN.y + 160, r: 140 });
  function drawIon(t) {
    const q = IONS.find((x) => x.k === S.ion.k), L = ionLens(), sp = sm(S.ion.split), k = PHONE ? 0.8 : 1;
    T(14, 26, '⚛️ 용액 속 이온의 농도', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 왼쪽 비커 + 돋보기 선
    const bw = PHONE ? 84 : 110, bh = PHONE ? 180 : 214, bx = MAIN.x + (PHONE ? 22 : 50), by = MAIN.y + (PHONE ? 70 : 52);
    const bk = beaker(bx, by, bw, bh, { level: 0.7, color: '#a7d3ff' });
    const units = 4;
    const nc = units * q.cat[1], na = units * q.an[1];
    drawBalls(bk, Math.min(nc, 8), 4.2, q.cat[2], t, { off: 3 }); drawBalls(bk, Math.min(na, 8), 4.8, q.an[2], t, { off: 40 });
    T(bx + bw / 2, by - 12, q.cs + ' M ' + q.f, 14.5, INK, 'center', 800);
    T(bx + bw / 2, by + bh + 20, '수용액 1 L', 13.5, MUTED, 'center', 700);
    ctx.strokeStyle = 'rgba(139,92,246,.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(bx + bw + 4, by + bh * 0.4); ctx.lineTo(L.x - L.r * 0.97, L.y - L.r * 0.25); ctx.moveTo(bx + bw + 4, by + bh * 0.75); ctx.lineTo(L.x - L.r * 0.97, L.y + L.r * 0.25); ctx.stroke(); ctx.setLineDash([]);
    // 돋보기 원
    ctx.save(); ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, TAU); ctx.fillStyle = '#f7f4ff'; ctx.fill(); ctx.strokeStyle = '#cdbdf5'; ctx.lineWidth = 3; ctx.stroke(); ctx.clip();
    T(L.x, L.y - L.r + 24, '🔍 입자 모형', 14, MUTED, 'center', 800);
    const slots = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    const cen = q.cat[1] === 1 ? q.cat : q.an, sat = q.cat[1] === 1 ? q.an : q.cat, nS = sat[1];
    const rC = cen[3] * k, rS = sat[3] * k, off = rS + rC - 2 + sp * 16 * k;
    slots.forEach((sl, ui) => {
      const cx = L.x + sl[0] * 58 * k, cy = L.y + 8 + sl[1] * 38 * k;
      const wob = (a) => (RM ? 0 : Math.sin(t * 1.2 + ui * 1.7 + a) * 2.2 * sp);
      const draw = (ion, r, px, py) => D.sphere(px + wob(px), py + wob(py * 0.3 + 1), r, ion[2], { gloss: r > 6, text: ion[0], textScale: 13 / r, outline: 'rgba(255,255,255,.7)', outlineWidth: 1 });
      if (nS === 1) { draw(cen, rC, cx - off / 2, cy); draw(sat, rS, cx + off / 2, cy); }
      else {
        draw(cen, rC, cx, cy + off * 0.36);
        [-0.9, 0.9].forEach((da) => { const a = -Math.PI / 2 + da; draw(sat, rS, cx + Math.cos(a) * off, cy + off * 0.36 + Math.sin(a) * off); });
      }
    });
    ctx.restore();
    const nCat = 4 * q.cat[1], nAn = 4 * q.an[1];
    T(L.x, L.y + L.r + 22, sp > 0.5 ? '양이온 ' + nCat + '개 : 음이온 ' + nAn + '개 = ' + q.cat[1] + ' : ' + q.an[1] : '화학식 단위 4개 (이온 결합 / 강산 · 강염기)', 14, '#5b21b6', 'center', 800);
    // 표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const rh = PHONE ? 33 : 20, hy = INFO.y + (PHONE ? 22 : 20), cxs = PHONE ? [INFO.x + 14, 0, INFO.x + 170, INFO.x + 318] : [INFO.x + 20, 0, INFO.x + 400, INFO.x + 590];
    ['용액', '양이온 농도', '음이온 농도'].forEach((h, i) => T(cxs[i < 1 ? 0 : i + 1 - (PHONE ? 0 : 0)] , hy, h, 14, MUTED, 'left', 800));
    IONS.forEach((u, i) => {
      const y = hy + 12 + (i + 0.5) * rh + (PHONE ? 4 : 0) , cur = u.k === q.k;
      if (cur) { D.roundRect(INFO.x + 6, y - rh / 2 + 2, INFO.w - 12, rh - 3, 8); ctx.fillStyle = 'rgba(139,92,246,.12)'; ctx.fill(); }
      const rs = ionRows[u.k];
      T(cxs[0], y + 5, u.cs + ' M ' + u.f, 14.5, INK, 'left', 800);
      T(cxs[2], y + 5, rs[0].ok ? u.cat[0] + ' ' + fs2(ionConc(u, 'cat')) + ' M' : u.cat[0] + ' ?', 14.5, rs[0].ok ? '#14803f' : '#9aa5b6', 'left', 800);
      T(cxs[3], y + 5, rs[1].ok ? u.an[0] + ' ' + fs2(ionConc(u, 'an')) + ' M' : u.an[0] + ' ?', 14.5, rs[1].ok ? '#14803f' : '#9aa5b6', 'left', 800);
    });
    T(INFO.x + INFO.w - 14, INFO.y + INFO.h - 8, 'H₂SO₄는 모두 이온화한다고 가정해요', 12.5 + 0.5, MUTED, 'right', 700);
  }
  function stepIon(dt) {
    const o = S.ion;
    if (o.auto > 0 && S.mode === 'ion') { o.auto -= dt; if (o.auto <= 0) { o.splitT = 1; updateCtl(); } }
    o.split = ap(o.split, o.splitT, dt, 4); if (Math.abs(o.split - o.splitT) < 0.004) o.split = o.splitT;
  }
  const allIonDone = () => IONS.every((u) => ionDone(u.k));
  const doneCount = (f) => IONS.filter((u) => f(u.k)).length;

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'cmp') cmpTap(p); return false; },
    hover(p) { return S.mode === 'cmp' && cmpGeom().some((g) => Math.abs(p.x - g.cx) < MAIN.w / 6 - 4 && p.y > MAIN.y && p.y < MAIN.y + MAIN.h) ? 'pointer' : 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'cmp') {
      const set = cmpSet();
      if (S.cmp.per) setRead('A · B · C 농도', set.map((s) => fm(concOf(s), 1)).join(' · ') + ' M', '용질 몰수', set.map((s) => fm(molOf(s), 1)).join(' · ') + ' mol', '용액 부피', set.map((s) => s.V.toFixed(2)).join(' · ') + ' L');
      else setRead('A · B · C 농도', '1 L당 입자 수로 비교', '용질 몰수', set.map((s) => fm(molOf(s), 1)).join(' · ') + ' mol', '용액 부피', set.map((s) => s.V.toFixed(2)).join(' · ') + ' L');
    } else if (S.mode === 'calc') {
      const s = CS.find((q) => q.k === S.calc.k);
      setRead('시료', s.label, s.rev ? '용액' : '몰질량', s.rev ? '250 mL = 0.250 L' : s.MM + ' g/mol', s.rev ? '구하는 값' : '용액 부피', s.rev ? '몰수 · 질량' : s.V + ' mL = ' + s.Vl.toFixed(3) + ' L');
    } else if (S.mode === 'dil') {
      setRead('전체 부피 V′', S.dil.V + ' mL', '몰 농도 M′', dilM(S.dil.V).toFixed(3) + ' M', '용질의 몰수', '0.10 mol (그대로)');
    } else {
      const q = IONS.find((x) => x.k === S.ion.k);
      setRead('용액', q.cs + ' M ' + q.f, q.cat[0], fs2(ionConc(q, 'cat')) + ' M', q.an[0], fs2(ionConc(q, 'an')) + ' M');
    }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '농도 비교: 1 L 속에 몇 몰?', short: '농도 비교', icon: '🥤', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 양의 소금을 녹여도 물의 양에 따라 맛이 달라요. 진하기를 숫자로 정확히 나타내려면 어떻게 해야 할까요?</p>' +
        '<div class="si-link">🔗 <b>통합과학·중학교에서</b> 퍼센트 농도(질량 기준)와 몰(mol)을 배웠어요. 이제 <b>몰 단위</b>로 용액의 진하기를 나타내는 <b>몰 농도</b>를 알아봐요.</div>' +
        '<p>비커마다 용질 입자(●, 1개 = 0.1 mol)와 용액의 부피가 달라요. 어느 것이 더 진한지 어떻게 비교할지 생각해 봐요.</p>',
      features: ['cmp'],
      setup() { S.gate = ''; S.sub.cmp = 'same'; S.cmp.per = false; S.cmp.pred = { same: [], diff: [] }; setScene('cmp'); },
      recap: '몰 농도 M = 용질의 몰수(mol) ÷ 용액의 부피(L)예요. 단위는 mol/L(= M)이고, 기준은 용매가 아니라 용액 전체의 부피예요.',
      summary: '<ul><li><b>몰 농도(M)</b> = 용질의 몰수(mol) ÷ <b>용액</b>의 부피(L), 단위 mol/L 또는 M</li><li>퍼센트 농도는 질량 기준, 몰 농도는 <b>1 L 속에 든 몰수</b> 기준이에요.</li><li>부피가 달라도 <b>1 L당 몰수</b>로 바꾸면 비교할 수 있어요. (입자 수가 많다고 더 진한 것은 아니에요.)</li><li>1 M NaCl 용액 = NaCl 1 mol이 녹아 <b>용액 전체가 1 L</b>인 용액 (물 1 L에 녹인 것이 아니에요).</li></ul>',
      missions: [
        {
          title: '진한 순서로 늘어놓기', manual: true,
          goal: '<b>부피가 다른</b> 비커 3개를 <b>진한 비커부터</b> 차례로 눌러 순서를 매기고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '입자 수만 세면 안 돼요. <b>🔍 1 L당 입자 수 보기</b>를 눌러 같은 1 L로 맞춘 뒤 비교해요.',
          setup() { S.gate = ''; S.sub.cmp = 'diff'; S.cmp.pred.diff = []; setScene('cmp'); },
          check() {
            const pr = S.cmp.pred.diff;
            if (pr.length < 3) return '세 비커를 모두 눌러 순서를 매겨 주세요. (부피가 다른 비커 세트예요)';
            if (cmpOK()) return true;
            S.cmp.shake = 0.5;
            if (pr[0] === 0) return 'A는 입자가 가장 많지만 용액의 부피도 가장 커요. 1 L당 입자 수로 바꿔 다시 비교해 보세요.';
            return '순서가 달라요. 용질의 몰수 ÷ 용액의 부피(L)로 비교해 보세요.';
          },
          status: () => '순서 ' + S.cmp.pred.diff.length + ' / 3 &nbsp; 1 L당 보기 ' + mark(S.cmp.per),
          explain: 'A는 6개 ÷ 1.0 L = 6개/L → <b>0.6 M</b>, B는 4개 ÷ 0.5 L = 8개/L → <b>0.8 M</b>, C는 3개 ÷ 0.25 L = 12개/L → <b>1.2 M</b>이에요. 진하기는 입자 수가 아니라 <b>1 L당 몰수</b>로 정해져서 C > B > A예요.',
        },
        {
          title: '몰 농도의 정의 완성하기', manual: true,
          goal: '문장을 완성하세요. <b>몰 농도(M) = 용질의 □ ÷ □(L)</b>',
          hint: '몰 농도는 용액 1 L 속에 용질이 몇 몰 들어 있는지를 나타내요. 단위는 mol/L예요.',
          setup() { S.gate = 'def'; selDef.forEach((s) => { s.value = ''; s.classList.remove('bad'); }); setScene('cmp'); },
          check() {
            const a = selDef[0].value, b = selDef[1].value;
            if (!a || !b) return '두 칸을 모두 골라 주세요.';
            let msg = '';
            if (a !== 'mol') { msg = '용질은 질량이 아니라 <b>몰수</b>로 나타내요. (퍼센트 농도와 달라요)'; selDef[0].classList.add('bad'); }
            else selDef[0].classList.remove('bad');
            if (b !== 'sol') { msg = (msg ? msg + ' ' : '') + '나누는 부피는 <b>용액 전체</b>의 부피예요. 용매(물)나 용질의 부피가 아니에요.'; selDef[1].classList.add('bad'); }
            else selDef[1].classList.remove('bad');
            return msg || true;
          },
          status: () => '몰수 ' + mark(selDef[0].value === 'mol') + ' &nbsp; 용액의 부피 ' + mark(selDef[1].value === 'sol'),
          explain: '몰 농도 M = <b>용질의 몰수(mol) ÷ 용액의 부피(L)</b>이에요. 용질을 녹인 뒤의 <b>용액 전체의 부피</b>가 기준이라서, 물의 양만 알아서는 몰 농도를 정확히 알 수 없어요.',
        },
        {
          type: 'quiz', title: '1 M NaCl 용액 만들기',
          goal: '“1 M NaCl 용액은 <b>물 1 L</b>에 NaCl 1 mol을 녹인 것이다.” 이 설명은?',
          setup() { S.gate = ''; setScene('cmp'); },
          choices: ['맞아요. 용매인 물의 부피가 1 L이면 돼요', '틀려요. NaCl 1 mol을 녹여 용액 전체가 1 L가 되게 해야 해요', '틀려요. NaCl 1 mol은 부피가 1 L이기 때문이에요', '맞아요. 몰 농도는 용매의 양을 기준으로 해요'],
          answer: 1,
          feedback: ['물 1 L에 소금을 녹이면 용액의 부피가 1 L보다 커질 수 있어요. 기준은 <b>용액</b>의 부피예요.', '', '고체의 부피와는 관계없어요. 용질의 몰수와 용액의 부피로 정해요.', '몰 농도는 용매가 아니라 <b>용액 전체의 부피</b>를 기준으로 해요.'],
          explain: '몰 농도의 분모는 <b>용액의 부피</b>예요. 그래서 NaCl 1 mol을 먼저 약간의 물에 녹인 뒤, 전체가 1 L가 되도록 물을 채워 1 M 용액을 만들어요.',
        },
      ],
    },
    {
      title: 'M 계산: 질량 → 몰수 → 몰 농도', short: 'M 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 몰 농도는 <b>몰수 ÷ 용액의 부피(L)</b>임을 알았어요. 실제로는 질량을 달아서 용액을 만드니까 <b>질량 → 몰수 → 몰 농도</b>의 3단계로 계산해요.</div>' +
        '<p>NaCl, NaOH, 포도당 용액의 몰 농도를 구하고, 거꾸로 2.0 M HCl 250 mL에 든 HCl의 몰수와 질량도 구해요. <b>mL를 L로 바꾸는 것</b>을 잊지 마세요!</p>',
      features: ['calc'],
      setup() { S.gate = ''; S.calc.k = 'nacl'; setScene('calc'); },
      recap: '몰수 n = 질량 ÷ 몰질량, 몰 농도 M = n ÷ V(L)예요. 부피가 mL로 주어지면 1000으로 나누어 L로 바꿔요. 거꾸로 n = M × V, 질량 = n × 몰질량이에요.',
      summary: '<ul><li>① 몰수 n = 질량 ÷ 몰질량 ② 몰 농도 M = n ÷ V(L)</li><li>NaCl 11.7 g, 500 mL → 0.200 mol ÷ 0.500 L = <b>0.400 M</b></li><li>NaOH 4.0 g, 250 mL → 0.10 mol ÷ 0.250 L = <b>0.40 M</b></li><li>포도당 9.0 g, 100 mL → 0.050 mol ÷ 0.100 L = <b>0.50 M</b></li><li>거꾸로: 2.0 M HCl 250 mL → n = 2.0 × 0.250 = <b>0.50 mol</b> = 0.50 × 36.5 = <b>18.25 g</b></li><li>부피 단위 mL는 L로 바꿔요: 500 mL = 0.500 L</li></ul>',
      missions: [
        {
          title: 'NaCl · NaOH · 포도당의 몰 농도',
          goal: '세 시료마다 <b>몰수 → 부피(L) → 몰 농도</b>를 차례로 써 넣으세요.',
          hint: '몰수 = 질량 ÷ 몰질량 (NaCl 58.5, NaOH 40, 포도당 180 g/mol). 500 mL는 0.500 L로 바꿔요.',
          setup() { S.gate = ''; S.calc.k = 'nacl'; ['nacl', 'naoh', 'glu'].forEach((k) => calcRows[k].forEach((r) => r.clear())); S.calc.pop = {}; setScene('calc'); },
          check: () => ['nacl', 'naoh', 'glu'].every(calcDone), hold: 0.5,
          status: () => 'NaCl ' + mark(calcDone('nacl')) + ' NaOH ' + mark(calcDone('naoh')) + ' 포도당 ' + mark(calcDone('glu')),
          explain: 'NaCl: 11.7 ÷ 58.5 = 0.200 mol, 0.200 ÷ 0.500 = <b>0.400 M</b>. NaOH: 4.0 ÷ 40 = 0.10 mol, 0.10 ÷ 0.250 = <b>0.40 M</b>. 포도당: 9.0 ÷ 180 = 0.050 mol, 0.050 ÷ 0.100 = <b>0.50 M</b>이에요.',
        },
        {
          title: '2.0 M HCl 250 mL 속의 HCl',
          goal: '<b>2.0 M HCl 250 mL</b>에 들어 있는 HCl의 <b>몰수</b>와 <b>질량</b>을 구하세요. (HCl의 몰질량 36.5 g/mol)',
          hint: '몰수 = M × V(L) = 2.0 × 0.250이에요. 질량 = 몰수 × 36.5예요.',
          setup() { S.gate = ''; S.calc.k = 'hcl'; calcRows.hcl.forEach((r) => r.clear()); S.calc.pop = {}; setScene('calc'); },
          check: () => calcDone('hcl'), hold: 0.5,
          status: () => '몰수 ' + mark(calcRows.hcl[0].ok) + ' 질량 ' + mark(calcRows.hcl[1].ok),
          explain: 'n = 2.0 mol/L × 0.250 L = <b>0.50 mol</b>이에요. 질량은 0.50 mol × 36.5 g/mol = <b>18.25 g</b>이에요. 몰 농도의 식을 거꾸로 쓰면 n = M × V예요.',
        },
        {
          type: 'quiz', title: 'mL를 L로 바꾸는 까닭',
          goal: '500 mL 용액에 NaCl 0.200 mol이 녹아 있어요. 몰 농도를 구하는 올바른 식은?',
          setup() { S.gate = ''; S.calc.k = 'nacl'; setScene('calc'); },
          choices: ['0.200 ÷ 500 = 0.0004 이므로 0.0004 M', '0.200 mol ÷ 0.500 L = 0.400 M', '0.200 × 0.500 = 0.100 M', '0.200 ÷ 5 = 0.04 M'],
          answer: 1,
          feedback: ['500 mL를 0.500 L로 바꾸지 않았어요. 0.0004는 mol/mL 단위라서 M(mol/L)이 아니에요. (×1000 하면 0.400 M)', '', '몰 농도는 나누기예요. 곱하면 단위가 mol·L이 되어버려요.', '500 mL = 0.500 L예요. 5로 나누면 안 돼요.'],
          explain: '몰 농도의 단위는 <b>mol/L</b>이라서 부피를 <b>L</b>로 써야 해요. 500 mL = 0.500 L이므로 0.200 ÷ 0.500 = <b>0.400 M</b>이에요.',
        },
      ],
    },
    {
      title: '희석: 물을 더하면?', short: '희석', icon: '💧', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 몰 농도 = 몰수 ÷ 부피(L)로 계산했어요. 이제 용액에 <b>물을 더하면</b> 몰수와 부피 중 무엇이 변하는지 살펴봐요.</div>' +
        '<p>1.0 M 용액 100 mL에 물을 더하는 슬라이더를 움직이며, 입자 수(몰수)와 농도가 어떻게 변하는지 관찰해요. 그리고 <b>M V = M′ V′</b>로 계산해 봐요.</p>',
      features: ['dil'],
      setup() { S.gate = ''; S.dil.V = 100; setScene('dil'); },
      recap: '물을 더해도 용질의 몰수는 그대로이고 부피만 늘어 농도가 낮아져요. 그래서 M V = M′ V′가 성립해요.',
      summary: '<ul><li>희석: 물을 더해도 용질의 <b>몰수는 변하지 않아요</b>. n = M V = M′ V′</li><li>2.0 M 50 mL → 1000 mL: M′ = 2.0 × 50 ÷ 1000 = <b>0.10 M</b></li><li>12 M 진한 염산에서 1.0 M 100 mL: 12 × V = 1.0 × 100 → V = <b>8.33 mL</b></li><li>진한 산을 묽힐 때는 <b>물에 산을 천천히</b> 넣어요.</li></ul>',
      missions: [
        {
          title: '0.10 M로 묽히기',
          goal: '1.0 M 용액 100 mL에 물을 더해 <b>0.10 M</b>이 되도록 전체 부피를 맞추세요.',
          hint: 'M V = M′ V′ → 1.0 × 100 = 0.10 × V′, V′ = 1000 mL예요.',
          setup() { S.gate = ''; S.dil.V = 100; setScene('dil'); },
          check: () => Math.abs(dilM(S.dil.V) - 0.10) < 0.0006 && Math.abs(S.dil.Vd - S.dil.V) < 1, hold: 0.8,
          status: () => 'V′ = ' + S.dil.V + ' mL &nbsp; M′ = ' + dilM(S.dil.V).toFixed(3) + ' M ' + mark(Math.abs(dilM(S.dil.V) - 0.10) < 0.0006),
          explain: '용질의 몰수 1.0 × 0.100 = <b>0.10 mol</b>은 그대로예요. 0.10 M이 되려면 부피가 0.10 ÷ 0.10 = <b>1.0 L = 1000 mL</b>여야 해요. 900 mL의 물을 더한 것이에요.',
        },
        {
          title: '희석 계산하기', manual: true, 
          goal: 'M V = M′ V′로 두 문제를 계산해 쓰고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '① 2.0 × 50 = M′ × 1000. ② 12 × V = 1.0 × 100 이니까 V = 100 ÷ 12예요. 소수 둘째 자리까지 써요.',
          setup() { S.gate = 'dilcalc'; dilRows.forEach((r) => r.clear()); setScene('dil'); },
          check() {
            const bad = dilRows.map((r, i) => (r.ok ? -1 : i)).filter((i) => i >= 0);
            if (!bad.length) return true;
            const i = bad[0], v = dilRows[i].read();
            if (isNaN(v)) return (i === 0 ? '① 번' : '② 번') + ' 답을 써 주세요.';
            return i === 0 ? '① 다시 계산해 보세요. M′ = 2.0 × 50 ÷ 1000이에요.' : '② 다시 계산해 보세요. V = 1.0 × 100 ÷ 12 mL예요.';
          },
          status: () => '① ' + mark(dilRows[0].ok) + ' &nbsp; ② ' + mark(dilRows[1].ok),
          explain: '① 2.0 × 50 = M′ × 1000 → M′ = <b>0.10 M</b>. ② 12 × V = 1.0 × 100 → V = 100 ÷ 12 = <b>8.33 mL</b>. 진한 용액을 조금 덜어 물을 채우면 원하는 농도의 묽은 용액을 만들 수 있어요.',
        },
        {
          type: 'quiz', title: '물을 더하면 몰수는?',
          goal: '“용액에 물을 더하면 <b>용질의 몰수가 줄어들어</b> 농도가 낮아진다.” 이 설명은?',
          setup() { S.gate = ''; setScene('dil'); },
          choices: ['맞아요. 물이 용질을 밀어내요', '틀려요. 용질의 몰수는 그대로이고 용액의 부피가 늘어요', '틀려요. 물을 더하면 용질의 몰수가 늘어나요', '맞아요. 부피가 커지면 몰수가 부피에 비례해 줄어요'],
          answer: 1,
          feedback: ['물을 더해도 용질 입자는 사라지거나 밀려나지 않아요.', '', '용질을 더 넣지 않았으니 몰수는 늘지 않아요.', '몰수는 그대로이고, 줄어드는 것은 몰수가 아니라 농도(몰수 ÷ 부피)예요.'],
          explain: '물을 더해도 용질 입자의 수(몰수)는 <b>그대로</b>예요. 부피만 커지므로 농도 = 몰수 ÷ 부피가 작아져요. 이것이 M V = M′ V′의 의미예요.',
        },
      ],
    },
    {
      title: '이온 농도: 입자 모형으로 세기', short: '이온 농도', icon: '⚛️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 용액의 몰 농도와 희석을 배웠어요. 이온 결합 물질과 강산 · 강염기는 물에 녹으면 <b>완전히 이온으로 갈라져요</b>. 이온 하나하나의 농도는 어떻게 구할까요?</div>' +
        '<p>입자 모형에서 이온 수를 세어 이온의 몰 농도 표를 완성해요. 이 방법으로 앞으로 pH와 중화 계산에 쓸 H⁺, OH⁻의 농도를 구해요.</p>',
      features: ['ion'],
      setup() { S.gate = ''; S.ion.k = 'nacl'; S.ion.split = 0; S.ion.splitT = 0; S.ion.auto = 0.7; setScene('ion'); },
      recap: '완전히 이온화하는 물질은 이온의 몰 농도 = 화학식의 이온 수 × 용액의 몰 농도예요. 예) 0.10 M CaCl₂ → Ca²⁺ 0.10 M, Cl⁻ 0.20 M',
      summary: '<ul><li>이온 농도 = 화학식 속 이온 수 × 용액의 몰 농도 (완전히 이온화한다고 가정)</li><li>0.10 M NaCl → Na⁺ 0.10 M, Cl⁻ 0.10 M</li><li>0.10 M CaCl₂ → Ca²⁺ 0.10 M, Cl⁻ <b>0.20 M</b></li><li>0.020 M Ca(OH)₂ → Ca²⁺ 0.020 M, OH⁻ <b>0.040 M</b></li><li>0.050 M H₂SO₄ → H⁺ <b>0.10 M</b>, SO₄²⁻ 0.050 M</li><li>0.10 M NaOH → OH⁻ 0.10 M</li></ul>',
      missions: [
        {
          title: '이온 농도 표 완성하기', manual: true,
          goal: '다섯 용액마다 <b>양이온과 음이온의 몰 농도</b>를 써서 표를 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '입자 모형에서 이온 수를 세요. CaCl₂ 한 개는 Ca²⁺ 1개와 Cl⁻ 2개로 갈라지므로 Cl⁻의 농도는 용액 농도의 2배예요.',
          setup() { S.gate = ''; IONS.forEach((u) => ionRows[u.k].forEach((r) => r.clear())); setScene('ion'); },
          check() {
            if (allIonDone()) return true;
            const u = IONS.find((x) => !ionDone(x.k));
            return '아직 ' + u.cs + ' M ' + u.f + '의 이온 농도가 맞지 않아요. 입자 모형에서 이온 수를 세어 보세요.';
          },
          status: () => '맞은 용액 ' + doneCount(ionDone) + ' / 5',
          explain: '완전히 이온화하면 이온의 몰 농도 = 이온 수 × 용액의 몰 농도예요. CaCl₂ 0.10 M → Cl⁻ 0.20 M, Ca(OH)₂ 0.020 M → OH⁻ 0.040 M, H₂SO₄ 0.050 M → H⁺ 0.10 M이에요.',
        },
        {
          type: 'quiz', title: '0.020 M Ca(OH)₂의 OH⁻ 농도',
          goal: '0.020 M Ca(OH)₂ 수용액에서 <b>OH⁻의 몰 농도</b>는?',
          setup() { S.gate = ''; S.ion.k = 'caoh2'; setScene('ion'); },
          choices: ['0.020 M', '0.040 M', '0.010 M', '0.080 M'],
          answer: 1,
          feedback: ['Ca(OH)₂ 한 개는 OH⁻ 2개를 내놓아요. 용액의 농도와 같지 않아요.', '', 'Ca(OH)₂보다 OH⁻가 더 많아요. 나누지 않고 곱해요.', 'OH⁻는 2개씩이므로 2배(0.040 M)예요. 4배가 아니에요.'],
          explain: 'Ca(OH)₂ → Ca²⁺ + 2OH⁻이므로 [OH⁻] = 2 × 0.020 = <b>0.040 M</b>이에요. 이 값은 다음 차시들에서 pOH와 pH를 구할 때 써요.',
        },
      ],
    },
  ];

  setScene('cmp');        // 이어하기에서 단계의 장면을 덮어쓰지 않도록 game 만들기 전에
  game = SciSim.game({
    simId: 'hc-molarity', mount: '#game', badge: '농도 박사', homeHref: '../../index.html#hc',
    featureLabels: { cmp: '🥤 비커 농도 비교', calc: '🧮 M 계산기', dil: '💧 희석 슬라이더', ion: '⚛️ 이온 입자 모형' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  function stepAll1(dt) { stepCmp(dt); stepCalc(dt); stepDil(dt); stepIon(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'cmp') drawCmp(t); else if (S.mode === 'calc') drawCalc(t); else if (S.mode === 'dil') drawDil(t); else drawIon(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, CS, IONS, SETS, DIL, calcRows, ionRows, dilRows, selDef, get game() { return game; },
    setScene, cmpOK, cmpTap, calcDone, ionDone, dilM, rankOrder, concOf, setDil, cmpGeom,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
