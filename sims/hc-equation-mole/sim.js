/* =========================================================
   화학 Ⅰ. 화학의 언어 - 반응식과 몰수비 [12화학01-03]
   ① 모형: 반응식 쓰기 (계수 맞추기 복습 · 상태 기호 s, l, g, aq)
   ② 탐구: 계수비 = 몰수비 (입자 2 : 1 : 2 → 2 mol : 1 mol : 2 mol)
   ③ 설명: 질량으로 읽기 (몰수 × 몰질량 → 질량비 ≠ 계수비, 질량 보존)
   ④ 적용: 반응식 읽기 (몰 문장 · 질량 검산)
   산화·환원 반응식의 전자 균형, 이온 반응식은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#1b2333', MUTED = '#5d6879', VIO = '#7c3aed', AMB = '#d97706', GOOD = '#14a058', BAD = '#e2464b';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f4f1fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = [], W = (t) => ctx.measureText(t).width;
    str.split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        const t = line ? line + ' ' + w : w;
        if (W(t) <= maxW || !line) line = t; else { out.push(line); line = w; }
        if (W(line) > maxW) { let cur = ''; for (const ch of line) { if (W(cur + ch) > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; } line = cur; }
      });
      out.push(line);
    });
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const fT = (v) => String(+(+v).toFixed(2));                    // 소수 둘째 자리까지, 끝의 0은 생략
  const parseNum = (s) => { const fr = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(String(s)); if (fr && +fr[2] !== 0) return +fr[1] / +fr[2]; const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const FOR = (k) => k.replace(/\d/g, (d) => SUBD[+d]);
  const STN = { s: '고체', l: '액체', g: '기체', aq: '수용액' };

  /* ---------- 화학 자료 (원자량은 반올림 값) ---------- */
  const AW = { H: 1, C: 12, N: 14, O: 16, Al: 27, Cl: 35.5, Fe: 56 };
  const COMP = {
    H2: { H: 2 }, O2: { O: 2 }, H2O: { H: 2, O: 1 }, N2: { N: 2 }, NH3: { N: 1, H: 3 }, CH4: { C: 1, H: 4 }, CO2: { C: 1, O: 2 },
    C3H8: { C: 3, H: 8 }, Al: { Al: 1 }, HCl: { H: 1, Cl: 1 }, AlCl3: { Al: 1, Cl: 3 },
    C2H5OH: { C: 2, H: 6, O: 1 }, C6H12O6: { C: 6, H: 12, O: 6 }, Fe: { Fe: 1 }, Fe2O3: { Fe: 2, O: 3 },
  };
  const MM = (k) => Object.keys(COMP[k]).reduce((s, e) => s + COMP[k][e] * AW[e], 0);   // 몰질량 (g/mol)
  const EL = {
    H: { c: '#f1f5f9', r: 0.62, o: '#94a3b8' }, C: { c: '#475569', r: 0.95 }, O: { c: '#ef4444', r: 0.9 }, N: { c: '#3b82f6', r: 0.9 },
    Al: { c: '#a8b5c7', r: 1.15 }, Cl: { c: '#22c55e', r: 1.1 }, Fe: { c: '#b45309', r: 1.1 },
  };
  const GEO = {
    H2: [['H', -0.7, 0], ['H', 0.7, 0]],
    O2: [['O', -0.95, 0], ['O', 0.95, 0]],
    H2O: [['O', 0, -0.35], ['H', -1.05, 0.55], ['H', 1.05, 0.55]],
    CH4: [['C', 0, 0], ['H', -1.2, -1.1], ['H', 1.2, -1.1], ['H', -1.2, 1.1], ['H', 1.2, 1.1]],
    CO2: [['O', -2, 0], ['C', 0, 0], ['O', 2, 0]],
    C3H8: [['C', -1.9, 0], ['C', 0, 0], ['C', 1.9, 0], ['H', -1.9, -1.5], ['H', -1.9, 1.5], ['H', -3.1, 0], ['H', 1.9, -1.5], ['H', 1.9, 1.5], ['H', 3.1, 0], ['H', 0, -1.5], ['H', 0, 1.5]],
    Al: [['Al', 0, 0]],
    HCl: [['H', -0.95, 0], ['Cl', 0.55, 0]],
    AlCl3: [['Al', 0, 0], ['Cl', 0, -2.0], ['Cl', -1.75, 1.0], ['Cl', 1.75, 1.0]],
  };
  const geoBox = {};
  Object.keys(GEO).forEach((k) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    GEO[k].forEach(([e, x, y]) => { const r = EL[e].r; x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); });
    geoBox[k] = { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  });
  function drawMol(k, cx, cy, R, alpha, sc) {
    const g = GEO[k], b = geoBox[k], s = sc || 1;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    const ox = cx - b.cx * R * s, oy = cy - b.cy * R * s;
    ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = Math.max(2, R * 0.28 * s); ctx.lineCap = 'round';
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const d = Math.hypot(g[i][1] - g[j][1], g[i][2] - g[j][2]);
      if (d < (EL[g[i][0]].r + EL[g[j][0]].r) * 1.25) { ctx.beginPath(); ctx.moveTo(ox + g[i][1] * R * s, oy + g[i][2] * R * s); ctx.lineTo(ox + g[j][1] * R * s, oy + g[j][2] * R * s); ctx.stroke(); }
    }
    g.forEach(([e, x, y]) => D.sphere(ox + x * R * s, oy + y * R * s, EL[e].r * R * s, EL[e].c, { outline: EL[e].o, outlineWidth: 1 }));
    ctx.restore();
  }

  /* ---------- 상태 ---------- */
  const mode2step = { balance: 0, mol: 1, mass: 2, read: 3 };
  const BAL = [
    { id: 'ch4', icon: '🔥', name: '메테인 연소', L: [['CH4', 'g'], ['O2', 'g']], R: [['CO2', 'g'], ['H2O', 'l']], c: [1, 2, 1, 2] },
    { id: 'c3h8', icon: '🍳', name: '프로판 연소', L: [['C3H8', 'g'], ['O2', 'g']], R: [['CO2', 'g'], ['H2O', 'l']], c: [1, 5, 3, 4] },
    { id: 'al', icon: '🧪', name: '알루미늄과 염산', L: [['Al', 's'], ['HCl', 'aq']], R: [['AlCl3', 'aq'], ['H2', 'g']], c: [2, 6, 2, 3] },
  ];
  BAL.forEach((r) => { r.sp = r.L.concat(r.R).map((x, i) => ({ k: x[0], st: x[1], c: r.c[i], side: i < 2 ? 0 : 1 })); });
  // ③ 질량으로 읽기 · ④ 반응식 읽기에서 쓰는 반응식 (계수 · 상태 기호 포함)
  const MASS = [
    { id: 'h2o', name: '수소 연소', sp: [['H2', 2, 'g', 0], ['O2', 1, 'g', 0], ['H2O', 2, 'l', 1]] },
    { id: 'nh3', name: '암모니아 합성', sp: [['N2', 1, 'g', 0], ['H2', 3, 'g', 0], ['NH3', 2, 'g', 1]] },
    { id: 'ch4', name: '메테인 연소', sp: [['CH4', 1, 'g', 0], ['O2', 2, 'g', 0], ['CO2', 1, 'g', 1], ['H2O', 2, 'l', 1]] },
  ];
  const READ = [
    { id: 'etoh', name: '에탄올 연소', icon: '🔥', ctx: '알코올 램프', sp: [['C2H5OH', 1, 'l', 0], ['O2', 3, 'g', 0], ['CO2', 2, 'g', 1], ['H2O', 3, 'l', 1]],
      sent: ['에탄올 1 mol이 완전히 연소하면 CO₂ ', ' mol과 H₂O ', ' mol이 생성돼요.'], ans: [2, 3], blank: [2, 3], sentDone: '에탄올 1 mol이 연소하면 CO₂ 2 mol과 H₂O 3 mol이 생성돼요.' },
    { id: 'glu', name: '포도당 연소', icon: '🍬', ctx: '세포 호흡', sp: [['C6H12O6', 1, 's', 0], ['O2', 6, 'g', 0], ['CO2', 6, 'g', 1], ['H2O', 6, 'l', 1]],
      sent: ['포도당 1 mol이 반응하면 CO₂ ', ' mol과 H₂O ', ' mol이 생성돼요.'], ans: [6, 6], blank: [2, 3], sentDone: '포도당 1 mol이 반응하면 CO₂ 6 mol과 H₂O 6 mol이 생성돼요.' },
    { id: 'fe', name: '철 녹슬기', icon: '🔩', ctx: '철의 부식', sp: [['Fe', 4, 's', 0], ['O2', 3, 'g', 0], ['Fe2O3', 2, 's', 1]],
      sent: ['철 1 mol이 녹슬면 산소 O₂ ', ' mol이 쓰이고 Fe₂O₃ ', ' mol이 생성돼요.'], ans: [0.75, 0.5], blank: [1, 2], sentDone: '철 1 mol이 녹슬면 O₂ 0.75 mol이 쓰이고 Fe₂O₃ 0.5 mol이 생성돼요.' },
  ];
  const spText = (s) => FOR(s[0]) + '(' + s[2] + ')';
  function spEqItems(rx) {
    const out = [];
    rx.sp.forEach((s, j) => {
      if (j > 0) out.push(s[3] === 1 && rx.sp[j - 1][3] === 0 ? { t: '  →  ', color: VIO } : { t: '  +  ', color: MUTED });
      out.push({ t: s[1] > 1 ? s[1] + ' ' : '', color: BAD }); out.push({ t: spText(s), color: INK });
    });
    return out;
  }
  const sideSum = (rx, side) => rx.sp.filter((s) => s[3] === side).reduce((a, s) => a + s[1] * MM(s[0]), 0);
  const ratioOf = (arr) => { const g = arr.reduce((a, b) => gcd(a, b)); return arr.map((v) => v / g); };

  const tws = [];
  function tw(o, to, opts) { const h = SciSim.tween(o, to, opts); tws.push(h); if (tws.length > 60) tws.splice(0, 30); return h; }
  const S = {
    mode: 'balance', t: 0, fade: 0, gate: '',
    b: { sel: 0, eq: BAL.map(() => ({ c: [1, 1, 1, 1], st: ['', '', '', ''] })), anim: null, flash: 0, pop: 0, shake: 0, axis: 8, bars: {}, ran: false },
    m: { x: 0, vx: 0, pack: 0, packOn: false, maxX: 0, shake: 0, ok: false },
    q: { sel: 0, filled: MASS.map((r) => r.sp.map(() => 0)), anim: MASS.map((r) => r.sp.map(() => ({ p: 0 }))), beam: new SciSim.Spring(0, { stiffness: 120, damping: 9 }), shake: 0, inShake: {} },
    r: { sel: 0, sub: 'sent', sent: READ.map(() => false), chk: READ.map(() => false), beam: new SciSim.Spring(0, { stiffness: 120, damping: 9 }), put: READ.map(() => ({ p: 0 })), cardsOn: { v: 0 } },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { balance: '🧩 반응식 쓰기', mol: '📦 계수비 = 몰수비', mass: '⚖️ 질량으로 읽기', read: '📖 반응식 읽기' };
  const RX_HEAD = { balance: '🧪 반응 고르기', mass: '⚖️ 반응 고르기', read: '📖 반응 고르기' };

  /* ---------- 공통 UI ---------- */
  function cancelAnims() { S.b.anim = null; parts.clear(); }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; cancelAnims(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    buildChips(); buildRows(); updateCtl();
  }
  function curSel() { return S.mode === 'balance' ? S.b.sel : S.mode === 'mass' ? S.q.sel : S.r.sel; }
  function buildChips() {
    const box = $('#rxChips'); box.innerHTML = '';
    const list = S.mode === 'balance' ? BAL : S.mode === 'mass' ? MASS : READ;
    $('#rxHead').textContent = RX_HEAD[S.mode] || '';
    list.forEach((rx, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = (rx.icon ? rx.icon + ' ' : '') + rx.name;
      b.addEventListener('click', () => {
        Sound.click(); cancelAnims();
        if (S.mode === 'balance') S.b.sel = i; else if (S.mode === 'mass') S.q.sel = i; else S.r.sel = i;
        buildRows(); updateCtl();
      });
      box.appendChild(b);
    });
  }
  function eqDone(i) { const e = S.b.eq[i], r = BAL[i]; return e.c.every((c, j) => c === r.c[j]) && e.st.every((s, j) => s === r.sp[j].st); }
  function massComplete(i) { return S.q.filled[i].every((v) => v > 0); }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-sub')) on = S.r.sub === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#rxChips button').forEach((b) => {
      const i = +b.dataset.v; b.classList.toggle('on', i === curSel());
      const done = S.mode === 'balance' ? eqDone(i) : S.mode === 'mass' ? massComplete(i) : (S.r.sent[i] && S.r.chk[i]);
      b.classList.toggle('done', !!done);
    });
    $$('#subSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.r.sub));
    $('#bPack').classList.toggle('btn-primary', !S.m.packOn);
    $('#bPack').textContent = S.m.packOn ? '↩ 낱개로 되돌리기' : '📦 몰 상자로 묶기';
    $('#xMinus').disabled = S.m.x <= 0; $('#xPlus').disabled = S.m.x >= 6;
    refreshCoefRows();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 행(계수 · 질량 입력 · 문장) 만들기 ---------- */
  function buildRows() {
    const cr = $('#coefRows'); cr.innerHTML = '';
    const r = BAL[S.b.sel];
    r.sp.forEach((s, j) => {
      const row = document.createElement('div'); row.className = 'coef-row'; row.dataset.j = j;
      row.innerHTML = '<span class="nm">' + (s.side ? '→ ' : '') + FOR(s.k) + '</span><button class="nudge" type="button" data-d="-1" aria-label="계수 줄이기">−</button><span class="num">1</span><button class="nudge" type="button" data-d="1" aria-label="계수 늘리기">+</button><button class="st-btn" type="button" aria-label="상태 기호">(?)</button>';
      row.querySelectorAll('.nudge').forEach((b) => b.addEventListener('click', () => changeCoef(j, +b.dataset.d)));
      row.querySelector('.st-btn').addEventListener('click', () => cycleState(j));
      cr.appendChild(row);
    });
    const mr = $('#massRows'); mr.innerHTML = '';
    MASS[S.q.sel].sp.forEach((s, j) => {
      const row = document.createElement('div'); row.className = 'in-row';
      row.innerHTML = '<label for="mi' + j + '">' + FOR(s[0]) + ' ' + s[1] + ' mol의 질량</label><input id="mi' + j + '" data-j="' + j + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0"><span class="u">g</span>';
      mr.appendChild(row);
      const inp = row.querySelector('input');
      if (S.q.filled[S.q.sel][j] > 0) { inp.value = fT(s[1] * MM(s[0])); inp.classList.add('ok'); inp.disabled = true; }
      inp.addEventListener('input', () => inp.classList.remove('bad'));
    });
    const sb = $('#sentBox'); sb.innerHTML = '';
    const rx = READ[S.r.sel];
    rx.sent.forEach((txt, i) => {
      const sp = document.createElement('span'); sp.textContent = txt; sb.appendChild(sp);
      if (i < rx.ans.length) {
        const inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.dataset.i = i; inp.setAttribute('aria-label', '몰수 ' + (i + 1));
        if (S.r.sent[S.r.sel]) { inp.value = fT(rx.ans[i]); inp.classList.add('ok'); inp.disabled = true; }
        inp.addEventListener('input', () => inp.classList.remove('bad'));
        sb.appendChild(inp);
      }
    });
    ['m1In', 'm2In'].forEach((id, i) => {
      const e = $('#' + id); const done = S.r.chk[S.r.sel];
      e.value = done ? fT(sideSum(rx, i)) : ''; e.disabled = !!done; e.classList.toggle('ok', !!done); e.classList.remove('bad');
    });
    $('#bSent').disabled = !!S.r.sent[S.r.sel]; $('#bChk').disabled = !!S.r.chk[S.r.sel];
    $('#bFill').disabled = massComplete(S.q.sel);
    S.r.cardsOn.v = 0; tw(S.r.cardsOn, { v: 1 }, { duration: 0.9, ease: 'linear' });
  }
  function refreshCoefRows() {
    const eq = S.b.eq[S.b.sel], r = BAL[S.b.sel];
    $$('#coefRows .coef-row').forEach((row) => {
      const j = +row.dataset.j;
      row.querySelector('.num').textContent = eq.c[j];
      const sb = row.querySelector('.st-btn');
      sb.textContent = eq.st[j] ? '(' + eq.st[j] + ')' : '(?)';
      sb.classList.toggle('set', !!eq.st[j]); sb.classList.toggle('okst', !!eq.st[j] && eq.st[j] === r.sp[j].st);
      const nd = row.querySelectorAll('.nudge'); nd[0].disabled = eq.c[j] <= 1; nd[1].disabled = eq.c[j] >= 9;
    });
  }
  function changeCoef(j, d) {
    const eq = S.b.eq[S.b.sel], v = clamp(eq.c[j] + d, 1, 9);
    if (v === eq.c[j]) return;
    Sound.click(); eq.c[j] = v; S.b.anim = null; S.b.ran = false; afterEdit();
  }
  const ST_ORDER = ['', 's', 'l', 'g', 'aq'];
  function cycleState(j) {
    const eq = S.b.eq[S.b.sel]; Sound.click();
    eq.st[j] = ST_ORDER[(ST_ORDER.indexOf(eq.st[j]) + 1) % ST_ORDER.length];
    afterEdit();
  }
  let lastDone = BAL.map(() => false);
  function afterEdit() {
    updateCtl();
    const i = S.b.sel;
    if (eqDone(i) && !lastDone[i]) {
      lastDone[i] = true; Sound.success(); S.b.flash = 1;
      const cx = PHONE ? VW / 2 : VW / 2; parts.burst(cx, PHONE ? 245 : 190, { count: 22, speed: 170, size: 3.5, colors: ['#8b5cf6', '#14a058', '#ffb400', '#3867f4'] });
    }
    lastDone[i] = eqDone(i);
  }
  $('#bCoefReset').addEventListener('click', () => { Sound.click(); const eq = S.b.eq[S.b.sel]; eq.c = [1, 1, 1, 1]; eq.st = ['', '', '', '']; S.b.anim = null; S.b.ran = false; afterEdit(); });
  $('#bReact').addEventListener('click', startReact);

  /* ================= ① 반응식 쓰기 ================= */
  const counts = (r, c, side) => {
    const o = {};
    r.sp.forEach((s, j) => { if (s.side === side) Object.keys(COMP[s.k]).forEach((e) => { o[e] = (o[e] || 0) + COMP[s.k][e] * c[j]; }); });
    return o;
  };
  const elemsOf = (r) => { const o = []; r.sp.forEach((s) => Object.keys(COMP[s.k]).forEach((e) => { if (o.indexOf(e) < 0) o.push(e); })); return o; };
  function balInfo(i) {
    const r = BAL[i ?? S.b.sel], eq = S.b.eq[i ?? S.b.sel];
    const a = counts(r, eq.c, 0), b = counts(r, eq.c, 1), els = elemsOf(r);
    const same = els.every((e) => (a[e] || 0) === (b[e] || 0));
    const g = eq.c.reduce((x, y) => gcd(x, y));
    return { r, eq, a, b, els, same, simplest: g === 1, bad: els.filter((e) => (a[e] || 0) !== (b[e] || 0)) };
  }
  const LAY = (() => {
    if (PHONE) return { eqY: 24, L: { x: 8, y: 44, w: 464, h: 196 }, R: { x: 8, y: 250, w: 464, h: 196 }, B: { x: 8, y: 456, w: 464, h: 236 }, ax: 240, ay: 245 };
    return { eqY: 28, L: { x: 8, y: 50, w: 360, h: 274 }, R: { x: 432, y: 50, w: 360, h: 274 }, B: { x: 8, y: 334, w: 784, h: 218 }, ax: 400, ay: 187 };
  })();
  function fitR(items, rect) {
    const bandH = (rect.h - 36) / items.length;
    let R = 17;
    while (R > 3.5) {
      const ok = items.every((it) => {
        const g = geoBox[it.k], cw = g.w * R + 10, ch = g.h * R + 10, cols = Math.max(1, Math.floor((rect.w - 16) / cw)), rows = Math.ceil(it.n / cols);
        return rows * ch <= bandH - 24;
      });
      if (ok) break; R -= 0.5;
    }
    return R;
  }
  function sideLayout(items, rect, R) {
    const bandH = (rect.h - 36) / items.length, out = [];
    items.forEach((it, bi) => {
      const g = geoBox[it.k], cw = g.w * R + 10, ch = g.h * R + 10, cols = Math.max(1, Math.floor((rect.w - 16) / cw)), rows = Math.ceil(it.n / cols);
      const top = rect.y + 34 + bi * bandH, free = bandH - 24 - rows * ch, pos = [];
      for (let i = 0; i < it.n; i++) {
        const row = Math.floor(i / cols), col = i % cols, cnt = Math.min(cols, it.n - row * cols);
        pos.push({ x: rect.x + rect.w / 2 - (cnt * cw) / 2 + col * cw + cw / 2, y: top + 24 + free / 2 + row * ch + ch / 2 });
      }
      out.push({ it, pos, top, bandH });
    });
    return out;
  }
  function layoutBal() {
    const { r, eq } = balInfo();
    const Li = r.sp.filter((s) => s.side === 0).map((s) => ({ k: s.k, n: eq.c[r.sp.indexOf(s)], j: r.sp.indexOf(s) }));
    const Ri = r.sp.filter((s) => s.side === 1).map((s) => ({ k: s.k, n: eq.c[r.sp.indexOf(s)], j: r.sp.indexOf(s) }));
    const R = Math.min(fitR(Li, LAY.L), fitR(Ri, LAY.R));
    return { R, L: sideLayout(Li, LAY.L, R), Rr: sideLayout(Ri, LAY.R, R) };
  }
  function drawEqLine(cx, y, items, size, maxW) {
    // items: [{t, color}]  한 줄로 이어 쓰기
    ctx.save();
    let sz = size, tot = 0;
    for (let k = 0; k < 6; k++) {
      ctx.font = D.font(sz, 800); tot = items.reduce((a, it) => a + ctx.measureText(it.t).width, 0);
      if (tot <= maxW) break; sz -= 1.5;
    }
    let x = cx - tot / 2; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    items.forEach((it) => { ctx.fillStyle = it.color; ctx.fillText(it.t, x, y); x += ctx.measureText(it.t).width; });
    ctx.restore();
  }
  function eqItems(r, c, st, faintOne) {
    const out = [];
    r.sp.forEach((s, j) => {
      if (j === 2) out.push({ t: '  →  ', color: VIO });
      else if (j > 0) out.push({ t: '  +  ', color: MUTED });
      const n = c[j];
      out.push({ t: n > 1 ? n + ' ' : '', color: BAD });
      out.push({ t: FOR(s.k), color: INK });
      out.push({ t: st[j] ? '(' + st[j] + ')' : '(?)', color: st[j] ? (faintOne ? INK : '#5b6b88') : '#e0a800' });
    });
    return out;
  }
  function startReact() {
    const bi = balInfo(), b = S.b;
    if (b.anim) return;
    if (!bi.same) {
      Sound.fail(); b.shake = 0.45;
      showHint('원자 수가 달라서 반응이 일어날 수 없어요: ' + bi.bad.join(', ') + ' 원자 수를 맞춰요.', 4200); return;
    }
    Sound.click();
    const lay = layoutBal(), atoms = { L: [], R: [] };
    lay.L.forEach((band) => band.pos.forEach((p, mi) => GEO[band.it.k].forEach(([e, x, y]) => atoms.L.push({ e, x: p.x + (x - geoBox[band.it.k].cx) * lay.R, y: p.y + (y - geoBox[band.it.k].cy) * lay.R, r: EL[e].r * lay.R, k: band.it.k, m: band.it.j + '_' + mi }))));
    lay.Rr.forEach((band) => band.pos.forEach((p, mi) => GEO[band.it.k].forEach(([e, x, y]) => atoms.R.push({ e, x: p.x + (x - geoBox[band.it.k].cx) * lay.R, y: p.y + (y - geoBox[band.it.k].cy) * lay.R, r: EL[e].r * lay.R, k: band.it.k, m: band.it.j + '_' + mi }))));
    const fly = [];
    Object.keys(AW).forEach((e) => {
      const a = atoms.L.filter((q) => q.e === e).sort((p, q) => p.y - q.y || p.x - q.x), c = atoms.R.filter((q) => q.e === e).sort((p, q) => p.y - q.y || p.x - q.x);
      a.forEach((q, i) => { if (c[i]) fly.push({ e, from: q, to: c[i], bump: ((i * 7) % 5 - 2) * 9 }); });
    });
    b.anim = { t: 0, dur: RM ? 0.01 : 2.8, fly, R: lay.R };
  }
  function stepBalance(dt) {
    const b = S.b, bi = balInfo();
    b.flash = Math.max(0, b.flash - dt * 0.8); b.pop = RM ? 0 : SciSim.approach(b.pop, 0, dt, 3.2); b.shake = Math.max(0, b.shake - dt);
    const mx = Math.max(1, ...bi.els.map((e) => Math.max(bi.a[e] || 0, bi.b[e] || 0)));
    const nice = [8, 12, 16, 24, 36, 48, 72].find((v) => v >= mx) || mx;
    b.axis = RM ? nice : SciSim.approach(b.axis, nice, dt, 7);
    bi.els.forEach((e) => {
      const o = b.bars[e] || (b.bars[e] = { a: 0, b: 0 });
      o.a = RM ? bi.a[e] || 0 : SciSim.approach(o.a, bi.a[e] || 0, dt, 9); o.b = RM ? bi.b[e] || 0 : SciSim.approach(o.b, bi.b[e] || 0, dt, 9);
    });
    if (b.anim) {
      b.anim.t += dt;
      if (b.anim.t >= b.anim.dur) {
        b.anim = null; b.flash = 1; b.pop = 1; Sound.success();
        const c = LAY.R; parts.burst(c.x + c.w / 2, c.y + c.h / 2, { count: 20, speed: 150, size: 3.2, colors: ['#8b5cf6', '#f59e0b', '#14a058', '#3867f4'] });
      }
    }
  }
  function drawBalance() {
    const bi = balInfo(), { r, eq } = bi, b = S.b, lay = layoutBal(), an = b.anim, tt = an ? an.t / an.dur : 1;
    drawEqLine(VW / 2, LAY.eqY, eqItems(r, eq.c, eq.st), PHONE ? 17 : 22, VW - 20);
    const leftA = an ? (tt < 0.8 ? 1 - 0.82 * SciSim.ease.inOutQuad(clamp(tt / 0.2, 0, 1)) : 0.18 + 0.82 * clamp((tt - 0.85) / 0.15, 0, 1)) : 1;
    const rightA = an ? (tt < 0.8 ? 0.18 : 0.18 + 0.82 * clamp((tt - 0.8) / 0.2, 0, 1)) : 1;
    [['반응물', LAY.L, lay.L, VIO, leftA, 1], ['생성물', LAY.R, lay.Rr, AMB, rightA, 1 + 0.22 * b.pop]].forEach(([title, rect, bands, col, alpha, sc]) => {
      panel(rect.x, rect.y, rect.w, rect.h, 14);
      D.label(rect.x + 12, rect.y + 20, title, { bg: col, size: 13, align: 'left' });
      bands.forEach((band, bi2) => {
        const j = band.it.j, st = eq.st[j];
        if (bi2 > 0) { ctx.strokeStyle = '#e8e4f3'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rect.x + 12, band.top - 2); ctx.lineTo(rect.x + rect.w - 12, band.top - 2); ctx.stroke(); }
        T(rect.x + 14, band.top + 16, FOR(band.it.k) + (st ? '(' + st + ')' : '') + '  × ' + band.it.n, 14, INK, 'left', 800);
        band.pos.forEach((p) => drawMol(band.it.k, p.x, p.y, lay.R, alpha, sc));
      });
    });
    // 날아가는 원자
    if (an) {
      const e1 = SciSim.ease.inOutCubic(clamp((tt - 0.2) / 0.6, 0, 1));
      an.fly.forEach((f, i) => {
        const jig = tt < 0.2 ? Math.sin(S.t * 40 + i) * 2.2 * (tt / 0.2) : 0;
        const x = f.from.x + (f.to.x - f.from.x) * e1 + jig, y = f.from.y + (f.to.y - f.from.y) * e1 + Math.sin(Math.PI * e1) * f.bump + jig * 0.7;
        D.sphere(x, y, f.from.r, EL[f.e].c, { outline: EL[f.e].o, outlineWidth: 1 });
      });
      if (tt > 0.2 && tt < 0.8) T(LAY.ax, LAY.ay - 34, '원자가 재배열', 13, VIO, 'center', 800);
    }
    // 가운데 화살표
    const ok = bi.same, shx = b.shake > 0 ? Math.sin(S.t * 60) * 4 : 0, ac = ok ? GOOD : '#9aa3b5';
    ctx.save(); ctx.translate(shx, 0);
    if (PHONE) {
      ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(LAY.ax, LAY.ay, 15, 0, TAU); ctx.fill(); T(LAY.ax, LAY.ay + 6, ok ? '▼' : '✖', 15, '#fff', 'center', 800);
    } else {
      D.arrow(LAY.ax - 26, LAY.ay, LAY.ax + 26, LAY.ay, { color: ac, width: 6, head: 18 });
      T(LAY.ax, LAY.ay - 18, ok ? '균형 ✔' : '균형 ✖', 14, ac, 'center', 800);
    }
    ctx.restore();
    if (b.flash > 0.02) {
      const k = b.flash; ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.2);
      D.check(LAY.ax, LAY.ay + (PHONE ? 0 : 34), 16 + 4 * (1 - k), 1); ctx.restore();
      if (!PHONE) T(LAY.ax, LAY.ay + 70, '완성!', 14, GOOD, 'center', 800, { alpha: Math.min(1, k * 1.5) });
    }
    // 원자 수 막대
    const B = LAY.B; panel(B.x, B.y, B.w, B.h, 14);
    T(B.x + 14, B.y + 24, '원자 수 비교', 14.5, INK, 'left', 800);
    D.roundRect(B.x + B.w - (PHONE ? 196 : 214), B.y + 12, 12, 12, 3); ctx.fillStyle = '#8b5cf6'; ctx.fill(); T(B.x + B.w - (PHONE ? 178 : 196), B.y + 23, '반응물 쪽', 12.5, MUTED, 'left', 800);
    D.roundRect(B.x + B.w - 96, B.y + 12, 12, 12, 3); ctx.fillStyle = '#f59e0b'; ctx.fill(); T(B.x + B.w - 78, B.y + 23, '생성물 쪽', 12.5, MUTED, 'left', 800);
    const sw = PHONE ? 0 : 262, areaW = B.w - 28 - sw, rows = bi.els.length, rowH = Math.min(54, (B.h - (PHONE ? 76 : 50)) / rows);
    const y0 = B.y + (PHONE ? 70 : 44), x0 = B.x + 52, barW = areaW - 80;
    bi.els.forEach((e, i) => {
      const o = b.bars[e] || { a: 0, b: 0 }, ry = y0 + i * rowH, eqE = (bi.a[e] || 0) === (bi.b[e] || 0);
      if (eqE) { D.roundRect(B.x + 8, ry - 2, areaW + 12, rowH - 2, 10); ctx.fillStyle = 'rgba(20,160,88,.10)'; ctx.fill(); }
      D.sphere(B.x + 28, ry + rowH / 2 - 2, 14, EL[e].c, { outline: EL[e].o, outlineWidth: 1, text: e, textColor: e === 'H' ? '#475569' : '#fff', textScale: 0.9 });
      [[o.a, '#8b5cf6', 0], [o.b, '#f59e0b', 1]].forEach(([v, col, k]) => {
        const w = clamp(v / b.axis, 0, 1) * barW, yy = ry + 4 + k * 17;
        ctx.fillStyle = '#eef0f6'; D.roundRect(x0, yy, barW, 13, 6); ctx.fill();
        if (w > 0.5) { ctx.fillStyle = eqE ? GOOD : col; D.roundRect(x0, yy, Math.max(w, 6), 13, 6); ctx.fill(); }
        T(x0 + Math.max(w, 6) + 8, yy + 11, String(k ? bi.b[e] || 0 : bi.a[e] || 0), 13.5, eqE ? '#0b7a41' : INK, 'left', 800);
      });
      T(x0 + barW + 40, ry + rowH / 2 + 5, eqE ? '=' : '≠', 18, eqE ? GOOD : BAD, 'left', 800);
    });
    const stN = eq.st.filter(Boolean).length;
    if (PHONE) {
      T(B.x + 14, B.y + 50, (bi.same ? '⚖️ 원자 수가 같아요' : '⚠️ ' + bi.bad.join(' · ') + ' 원자 수가 달라요') + ' · 상태 기호 ' + stN + '/4', 13, bi.same ? '#0b7a41' : '#b4231f', 'left', 800);
    } else {
      const sx = B.x + B.w - 258, sy = B.y + 40, sh = B.h - 52;
      D.roundRect(sx, sy, 246, sh, 12); ctx.fillStyle = bi.same ? 'rgba(20,160,88,.10)' : 'rgba(226,70,75,.08)'; ctx.fill();
      let yy = sy + 24;
      yy += textBlock(sx + 12, yy, 222, bi.same ? '⚖️ 양쪽의 원자 수가 같아요!' : '⚠️ ' + bi.bad.join(' · ') + ' 원자 수가 달라요', 14, bi.same ? '#0b7a41' : '#b4231f', 18, 800) + 6;
      if (bi.same && !bi.simplest) yy += textBlock(sx + 12, yy, 222, '계수를 가장 작은 정수비로 줄여 보세요.', 13, '#9a3412', 17, 800) + 6;
      else if (bi.same) yy += textBlock(sx + 12, yy, 222, '가장 간단한 정수비예요.', 13, MUTED, 17, 800) + 6;
      textBlock(sx + 12, yy, 222, '상태 기호를 붙인 물질 ' + stN + ' / 4 (25 °C, 1기압 기준)', 13, MUTED, 17, 800);
    }
  }

  /* ================= ② 계수비 = 몰수비 ================= */
  const N0 = { H2: 6, O2: 3 };                                   // 처음 양 (mol)
  const LAYM = PHONE ? { top: { x: 8, y: 46, w: 464, h: 200 }, bot: { x: 8, y: 254, w: 464, h: 438 }, cx: [80, 240, 400], R: 9 }
    : { top: { x: 8, y: 46, w: 784, h: 178 }, bot: { x: 8, y: 232, w: 784, h: 320 }, cx: [150, 400, 650], R: 15 };
  const mAmt = (x) => ({ cH2: x, cO2: x / 2, fW: x, rH2: N0.H2 - x, rO2: N0.O2 - x / 2 });
  function setX(v) {
    v = clamp(Math.round(v * 2) / 2, 0, 6);
    S.m.x = v; S.m.maxX = Math.max(S.m.maxX, v);
    $('#xRange').value = v; $('#xOut').textContent = fT(v) + ' mol';
    $('#xRange').style.setProperty('--pct', (v / 6) * 100 + '%');
    updateCtl();
  }
  $('#xRange').addEventListener('input', () => { setX(+$('#xRange').value); Sound.click(); });
  $('#xMinus').addEventListener('click', () => { setX(S.m.x - 0.5); Sound.click(); });
  $('#xPlus').addEventListener('click', () => { setX(S.m.x + 0.5); Sound.click(); });
  $('#bPack').addEventListener('click', () => {
    Sound.click(); S.m.packOn = !S.m.packOn;
    tw(S.m, { pack: S.m.packOn ? 1 : 0 }, { duration: 0.8, ease: 'outCubic' });
    if (S.m.packOn) { const L = LAYM.top; parts.burst(L.x + L.w / 2, L.y + L.h * 0.55, { count: 14, speed: 120, size: 3, colors: ['#8b5cf6', '#c4b5fd', '#ffb400'] }); }
    updateCtl();
  });
  function stepMol(dt) {
    const m = S.m; m.vx = RM ? m.x : SciSim.approach(m.vx, m.x, dt, 8); m.shake = Math.max(0, m.shake - dt);
  }
  function drawMol2() {
    const m = S.m, pk = clamp(m.pack, 0, 1), Lt = LAYM.top, Lb = LAYM.bot, R = LAYM.R, a = mAmt(m.x), av = mAmt(m.vx);
    drawEqLine(VW / 2, PHONE ? 26 : 28, [{ t: '2 H₂(g)', color: INK }, { t: '  +  ', color: MUTED }, { t: 'O₂(g)', color: INK }, { t: '  →  ', color: VIO }, { t: '2 H₂O(l)', color: INK }], PHONE ? 19 : 22, VW - 20);
    panel(Lt.x, Lt.y, Lt.w, Lt.h, 14);
    T(Lt.x + Lt.w / 2, Lt.y + 24, '입자 수의 비  2 : 1 : 2', 15.5, INK, 'center', 800, { alpha: 1 - pk });
    T(Lt.x + Lt.w / 2, Lt.y + 24, '몰수의 비  2 mol : 1 mol : 2 mol', 15.5, VIO, 'center', 800, { alpha: pk });
    if (pk > 0.02) { ctx.save(); ctx.globalAlpha = pk; D.label(Lt.x + Lt.w / 2, Lt.y + 50, '상자 1개 = 6.02×10²³개 = 1 mol', { bg: '#ede9fe', color: '#5b21b6', size: 12.5 }); ctx.restore(); }
    const groups = [{ k: 'H2', n: 2 }, { k: 'O2', n: 1 }, { k: 'H2O', n: 2 }], cy = Lt.y + Lt.h * 0.58;
    groups.forEach((g, gi) => {
      const b = geoBox[g.k], bw = b.w * R + 12 + pk * 18, bh = b.h * R + 12 + pk * 24, gap = 10, tot = g.n * bw + (g.n - 1) * gap;
      for (let i = 0; i < g.n; i++) {
        const bx = LAYM.cx[gi] - tot / 2 + i * (bw + gap) + bw / 2;
        if (pk > 0.01) {
          ctx.save(); ctx.globalAlpha = pk; D.roundRect(bx - bw / 2, cy - bh / 2 - 4, bw, bh, 12); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill();
          ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
          T(bx, cy + bh / 2 - 10, '1 mol', 12.5, '#5b21b6', 'center', 800, { alpha: pk });
        }
        drawMol(g.k, bx, cy - pk * 10, R, 1, 1);
      }
      T(LAYM.cx[gi], Lt.y + Lt.h - 14, g.n + '개', 14, INK, 'center', 800, { alpha: 1 - pk });
      T(LAYM.cx[gi], Lt.y + Lt.h - 14, g.n + ' mol', 14, VIO, 'center', 800, { alpha: pk });
    });
    T((LAYM.cx[0] + LAYM.cx[1]) / 2, cy + 5, '+', 22, MUTED, 'center', 800);
    T((LAYM.cx[1] + LAYM.cx[2]) / 2, cy + 5, '→', 24, VIO, 'center', 800);
    // 진행도에 따른 몰수
    panel(Lb.x, Lb.y, Lb.w, Lb.h, 14);
    T(Lb.x + 14, Lb.y + 24, '반응이 진행되면 (눈금: mol)', 15, INK, 'left', 800);
    T(Lb.x + Lb.w - 14, Lb.y + 24, '처음 H₂ ' + N0.H2 + ' · O₂ ' + N0.O2 + ' mol', 13, MUTED, 'right', 800);
    const x0 = Lb.x + (PHONE ? 14 : 96), barW = Lb.w - (PHONE ? 28 : 120), u = barW / 6, top = Lb.y + 62, rowH = Math.min(PHONE ? 100 : 80, (Lb.h - 120) / 3);
    for (let v = 0; v <= 6; v++) {
      ctx.strokeStyle = v === 0 ? '#9aa3b5' : '#e6e8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + v * u, top - 6); ctx.lineTo(x0 + v * u, top + rowH * 3 - 8); ctx.stroke();
      T(x0 + v * u, top - 12, String(v), 12.5, MUTED, 'center', 800);
    }
    const rows = [
      { nm: 'H₂', cl: '#8b5cf6', init: N0.H2, rem: av.rH2, used: a.cH2, rem0: a.rH2 },
      { nm: 'O₂', cl: '#8b5cf6', init: N0.O2, rem: av.rO2, used: a.cO2, rem0: a.rO2 },
      { nm: 'H₂O', cl: '#f59e0b', init: 6, form: av.fW, formed: a.fW },
    ];
    rows.forEach((r, i) => {
      const ry = top + i * rowH, by = ry + (PHONE ? 22 : 8), bh = 26;
      if (PHONE) T(x0, ry + 14, r.nm + (r.formed != null ? ' (생성물)' : ' (반응물)'), 14, INK, 'left', 800); else T(Lb.x + 14, by + 19, r.nm, 17, INK, 'left', 800);
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#b7bdd0'; ctx.lineWidth = 1.5; D.roundRect(x0, by, r.init * u, bh, 7); ctx.stroke(); ctx.restore();
      if (r.formed == null) {
        const w = clamp(r.rem, 0, r.init) * u, uw = clamp(r.init - r.rem, 0, r.init) * u;
        if (w > 0.5) { ctx.fillStyle = r.cl; D.roundRect(x0, by, Math.max(w, 7), bh, 7); ctx.fill(); }
        if (uw > 0.5) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#c4b5fd'; D.roundRect(x0 + w, by, uw, bh, 5); ctx.fill(); ctx.restore(); }
        T(x0, by + bh + 17, '반응한 양 ' + fT(r.used) + ' mol  ·  남은 양 ' + fT(r.rem0) + ' mol', 14, INK, 'left', 800);
      } else {
        const w = clamp(r.form, 0, 6) * u;
        if (w > 0.5) { ctx.fillStyle = r.cl; D.roundRect(x0, by, Math.max(w, 7), bh, 7); ctx.fill(); }
        T(x0, by + bh + 17, '생긴 양 ' + fT(r.formed) + ' mol', 14, INK, 'left', 800);
      }
    });
    const ry = Lb.y + Lb.h - (PHONE ? 52 : 30);
    D.roundRect(Lb.x + 10, ry - 20, Lb.w - 20, PHONE ? 46 : 32, 10); ctx.fillStyle = m.x > 0 ? 'rgba(20,160,88,.12)' : '#f1f2f8'; ctx.fill();
    if (m.x > 0) {
      const rr = ratioOf([m.x * 4, m.x * 2, m.x * 4]), s1 = '변한 양  H₂ : O₂ : H₂O = ' + fT(a.cH2) + ' : ' + fT(a.cO2) + ' : ' + fT(a.fW), s2 = '= ' + rr.join(' : ') + '  (계수비와 같아요)';
      if (PHONE) { T(Lb.x + 20, ry - 3, s1, 13, INK, 'left', 800); T(Lb.x + 20, ry + 17, s2, 13.5, '#0b7a41', 'left', 800); }
      else { T(Lb.x + 22, ry + 1, s1, 14.5, INK, 'left', 800); T(Lb.x + Lb.w - 22, ry + 1, s2, 14.5, '#0b7a41', 'right', 800); }
    } else T(Lb.x + 22, ry + (PHONE ? 8 : 1), '슬라이더를 움직여 반응을 진행시켜 봐요.', 14, MUTED, 'left', 800);
  }

  /* ================= 공통: 저울 그리기 ================= */
  // blocks: [{label, mass, color, show}] · 접시에 쌓이는 블록
  function drawBeam(cx, py, half, ang, left, right, opt) {
    opt = opt || {};
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const lx = cx - half * ca, ly = py - half * sa, rx = cx + half * ca, ry = py + half * sa, drop = opt.drop || 46, pw = opt.pw || 150, ph = opt.ph || 70;
    // 받침대
    ctx.fillStyle = '#9aa3b5'; ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(cx - 26, py + opt.stand); ctx.lineTo(cx + 26, py + opt.stand); ctx.closePath(); ctx.fill();
    D.roundRect(cx - 50, py + opt.stand - 4, 100, 10, 5); ctx.fillStyle = '#7b8499'; ctx.fill();
    // 막대
    D.shadow(() => { ctx.strokeStyle = '#5b667d'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke(); }, { blur: 6, y: 3 });
    D.sphere(cx, py, 8, '#5b667d', { gloss: true });
    [[lx, ly, left, opt.leftLabel], [rx, ry, right, opt.rightLabel]].forEach(([ex, ey, blocks, lab]) => {
      ctx.strokeStyle = '#8b95aa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - pw / 2 + 8, ey + drop); ctx.moveTo(ex, ey); ctx.lineTo(ex + pw / 2 - 8, ey + drop); ctx.stroke();
      D.roundRect(ex - pw / 2, ey + drop, pw, 8, 4); ctx.fillStyle = '#7b8499'; ctx.fill();
      let by = ey + drop - 2;
      blocks.forEach((b) => {
        if (b.p <= 0.01) return;
        const bh = 24, bw = pw - 22, yy = by - bh - (1 - b.p) * 40;
        ctx.save(); ctx.globalAlpha = Math.min(1, b.p * 1.5);
        D.roundRect(ex - bw / 2, yy, bw, bh, 7); ctx.fillStyle = b.color; ctx.fill();
        T(ex, yy + 17, b.label, 13, '#fff', 'center', 800); ctx.restore();
        by -= bh + 2;
      });
      if (lab) T(ex, ey + drop + 26, lab, 14.5, INK, 'center', 800);
    });
    return { lx, ly, rx, ry };
  }
  const SP_COL = ['#8b5cf6', '#6d9bf0', '#f59e0b', '#ec7a52'];

  /* ================= ③ 질량으로 읽기 ================= */
  const LAYQ = PHONE ? { tb: { x: 8, y: 46, w: 464, h: 232 }, rt: { x: 8, y: 286, w: 464, h: 96 }, bm: { x: 8, y: 390, w: 464, h: 302 } }
    : { tb: { x: 8, y: 46, w: 784, h: 250 }, rt: { x: 8, y: 304, w: 784, h: 60 }, bm: { x: 8, y: 372, w: 784, h: 180 } };
  function massInfo(i) {
    const rx = MASS[i ?? S.q.sel], masses = rx.sp.map((s) => s[1] * MM(s[0])), done = massComplete(i ?? S.q.sel);
    return { rx, masses, done, coefs: rx.sp.map((s) => s[1]), m0: sideSum(rx, 0), m1: sideSum(rx, 1) };
  }
  $('#bFill').addEventListener('click', () => {
    const i = S.q.sel, mi = massInfo(i), q = S.q; let any = false, wrong = 0, fresh = 0, msg = '';
    mi.rx.sp.forEach((s, j) => {
      if (q.filled[i][j]) return;
      const inp = $('#mi' + j), raw = inp.value.trim(); if (!raw) return;
      any = true; const v = parseNum(raw), ans = mi.masses[j];
      if (!isNaN(v) && Math.abs(v - ans) <= 0.05) {
        q.filled[i][j] = ans; inp.classList.remove('bad'); inp.classList.add('ok'); inp.disabled = true; fresh++;
        tw(q.anim[i][j], { p: 1 }, { duration: 0.9, ease: 'outCubic' });
      } else {
        wrong++; inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad');
        if (!msg) msg = Math.abs(v - MM(s[0])) < 0.05 && s[1] > 1 ? '몰질량(' + fT(MM(s[0])) + ' g/mol)에 몰수 ' + s[1] + ' mol도 곱해야 해요.' : '질량 = 몰수 × 몰질량이에요. ' + FOR(s[0]) + '의 몰질량은 ' + fT(MM(s[0])) + ' g/mol이에요.';
      }
    });
    if (!any) { Sound.fail(); showHint('질량을 계산해서 칸에 써 주세요.', 3000); return; }
    if (wrong) { Sound.fail(); showHint(msg, 4600); } else if (fresh) Sound.success();
    if (massComplete(i)) {
      q.beam.value = i % 2 ? -0.1 : 0.1; q.beam.velocity = 0; q.beam.target = 0;
      const B = LAYQ.bm; parts.burst(B.x + B.w / 2, B.y + 40, { count: 22, speed: 170, size: 3.5, colors: ['#8b5cf6', '#14a058', '#ffb400', '#3867f4'] });
    }
    updateCtl();
  });
  function drawMass() {
    const mi = massInfo(), { rx } = mi, q = S.q, i = q.sel;
    drawEqLine(VW / 2, PHONE ? 26 : 28, spEqItems(rx), PHONE ? 17 : 22, VW - 20);
    const tb = LAYQ.tb; panel(tb.x, tb.y, tb.w, tb.h, 14);
    const cx = [0.03, 0.34, 0.54, 0.76].map((f) => tb.x + tb.w * f), hy = tb.y + 26;
    ['물질', '몰수 (계수)', '× 몰질량', '= 질량'].forEach((h, k) => T(cx[k], hy, h, PHONE ? 13 : 14.5, MUTED, 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tb.x + 10, hy + 9); ctx.lineTo(tb.x + tb.w - 10, hy + 9); ctx.stroke();
    const n = rx.sp.length, rowH = Math.min(PHONE ? 44 : 50, (tb.h - 50) / n);
    rx.sp.forEach((s, j) => {
      const ry = hy + 14 + j * rowH, mid = ry + rowH / 2 + 5, cell = q.anim[i][j], filled = q.filled[i][j] > 0, M = MM(s[0]);
      if (s[3] === 1 && j > 0 && rx.sp[j - 1][3] === 0) { ctx.strokeStyle = '#c4b5fd'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tb.x + 12, ry - 2); ctx.lineTo(tb.x + tb.w - 12, ry - 2); ctx.stroke(); ctx.setLineDash([]); }
      D.roundRect(cx[0] - 4, ry + 4, 8, rowH - 8, 4); ctx.fillStyle = s[3] ? '#f59e0b' : '#8b5cf6'; ctx.fill();
      T(cx[0] + 12, mid, spText(s), PHONE ? 15 : 17, INK, 'left', 800);
      T(cx[1], mid, s[1] + ' mol', PHONE ? 15 : 17, INK, 'left', 800);
      T(cx[2], mid, fT(M) + ' g/mol', PHONE ? 15 : 17, INK, 'left', 800);
      const mw = PHONE ? 84 : 120;
      if (filled) {
        const v = q.filled[i][j] * clamp(cell.p, 0, 1);
        D.roundRect(cx[3] - 6, ry + 5, mw, rowH - 10, 9); ctx.fillStyle = 'rgba(20,160,88,.13)'; ctx.fill();
        T(cx[3] + 4, mid, fT(Math.round(v * 100) / 100) + ' g', PHONE ? 16 : 18, '#0b7a41', 'left', 800);
        if (cell.p > 0 && cell.p < 0.7) {
          const k = SciSim.ease.inOutCubic(cell.p / 0.7);
          ctx.save(); ctx.globalAlpha = 1 - Math.pow(k, 4);
          D.label(cx[2] + (cx[3] - cx[2]) * k + 34, ry + rowH / 2, s[1] + ' × ' + fT(M), { bg: '#8b5cf6', size: 12.5 }); ctx.restore();
        }
      } else {
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#b7bdd0'; ctx.lineWidth = 1.5; D.roundRect(cx[3] - 6, ry + 5, mw, rowH - 10, 9); ctx.stroke(); ctx.restore();
        T(cx[3] + 4, mid, '?', 18, '#98a2b3', 'center', 800, { align: 'left' });
      }
    });
    // 계수비 vs 질량비
    const rt = LAYQ.rt; panel(rt.x, rt.y, rt.w, rt.h, 14);
    const cr = rx.sp.map((s) => s[1]).join(' : '), mr = mi.done ? ratioOf(mi.masses.map((v) => Math.round(v))).join(' : ') : '';
    if (PHONE) {
      T(rt.x + 14, rt.y + 28, '계수비 = 몰수비   ' + cr, 15, VIO, 'left', 800);
      T(rt.x + 14, rt.y + 58, '질량비   ' + (mi.done ? mr : '표를 모두 채우면 나와요'), 15, mi.done ? '#9a3412' : MUTED, 'left', 800);
      if (mi.done) T(rt.x + 14, rt.y + 82, '계수비와 달라요 (≠)', 14, BAD, 'left', 800);
    } else {
      T(rt.x + 16, rt.y + 36, '계수비 = 몰수비   ' + cr, 17, VIO, 'left', 800);
      T(rt.x + 330, rt.y + 36, '질량비   ' + (mi.done ? mr : '표를 모두 채우면 나와요'), 17, mi.done ? '#9a3412' : MUTED, 'left', 800);
      if (mi.done) T(rt.x + rt.w - 16, rt.y + 36, '계수비와 달라요 (≠)', 16, BAD, 'right', 800);
    }
    // 저울
    const bm = LAYQ.bm; panel(bm.x, bm.y, bm.w, bm.h, 14);
    T(bm.x + 14, bm.y + 24, '반응 전후 질량의 합', 14.5, INK, 'left', 800);
    const blocks = (side) => rx.sp.map((s, j) => ({ s, j })).filter((o) => o.s[3] === side).map((o) => ({ label: spText(o.s) + ' ' + fT(q.filled[i][o.j]) + ' g', color: SP_COL[o.j % 4], p: q.filled[i][o.j] > 0 ? clamp(q.anim[i][o.j].p * 1.4 - 0.2, 0, 1) : 0 }));
    const half = PHONE ? 150 : 250, pw = PHONE ? 132 : 170, py = bm.y + (PHONE ? 92 : 50), stand = PHONE ? 150 : 96;
    drawBeam(bm.x + bm.w / 2, py, half, q.beam.value, blocks(0), blocks(1), { pw, drop: 66, stand, leftLabel: '반응물 합 ' + (mi.done ? fT(mi.m0) + ' g' : '?'), rightLabel: '생성물 합 ' + (mi.done ? fT(mi.m1) + ' g' : '?') });
    if (mi.done) D.label(bm.x + bm.w - 14, bm.y + 20, '질량 보존  ' + fT(mi.m0) + ' g = ' + fT(mi.m1) + ' g  ✔', { bg: '#14a058', size: 14, align: 'right' });
  }
  function stepMass(dt) { S.q.beam.update(dt); }

  /* ================= ④ 반응식 읽기 ================= */
  const LAYR = PHONE ? { bx: { x: 8, y: 46, w: 464, h: 214 }, bm: { x: 8, y: 268, w: 464, h: 424 } } : { bx: { x: 8, y: 46, w: 784, h: 242 }, bm: { x: 8, y: 296, w: 784, h: 256 } };
  function readGroups(rx) {
    const out = [], cnt = [0, 0];
    rx.sp.forEach((s, j) => {
      const k = cnt[s[3]]++;
      if (PHONE) out.push({ j, s, gx: 14 + s[3] * 236, gy: LAYR.bx.y + 34 + k * 88, bs: 28, gap: 4 });
      else out.push({ j, s, gx: 20 + s[3] * 404 + k * 192, gy: LAYR.bx.y + 50, bs: 36, gap: 5 });
    });
    return out;
  }
  $('#bSent').addEventListener('click', () => {
    const i = S.r.sel, rx = READ[i]; if (S.r.sent[i]) return;
    const inputs = $$('#sentBox input'); let all = true, msg = '';
    inputs.forEach((inp, k) => {
      const v = parseNum(inp.value), ok = !isNaN(v) && Math.abs(v - rx.ans[k]) < 0.005;
      inp.classList.remove('bad', 'ok'); if (ok) inp.classList.add('ok'); else { all = false; void inp.offsetWidth; inp.classList.add('bad'); if (!msg) msg = '계수비로 구해요: ' + FOR(rx.sp[0][0]) + ' : ' + FOR(rx.sp[rx.blank[k]][0]) + ' = ' + rx.sp[0][1] + ' : ' + rx.sp[rx.blank[k]][1] + ' 이므로, ' + FOR(rx.sp[0][0]) + ' 1 mol당 몇 mol일까요?'; }
    });
    if (!all) { Sound.fail(); showHint(msg, 5200); return; }
    S.r.sent[i] = true; Sound.success(); inputs.forEach((inp) => { inp.disabled = true; });
    $('#bSent').disabled = true; const bx = LAYR.bx; parts.burst(bx.x + bx.w / 2, bx.y + 100, { count: 20, speed: 160, size: 3.4, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
    updateCtl();
  });
  $('#bChk').addEventListener('click', () => {
    const i = S.r.sel, rx = READ[i]; if (S.r.chk[i]) return;
    const a = [parseNum($('#m1In').value), parseNum($('#m2In').value)], ans = [sideSum(rx, 0), sideSum(rx, 1)]; let all = true;
    ['m1In', 'm2In'].forEach((id, k) => {
      const e = $('#' + id), ok = !isNaN(a[k]) && Math.abs(a[k] - ans[k]) <= 0.05;
      e.classList.remove('bad', 'ok'); if (ok) e.classList.add('ok'); else { all = false; void e.offsetWidth; e.classList.add('bad'); }
    });
    if (!all) { Sound.fail(); showHint('각 물질의 질량 = 계수(몰수) × 몰질량이에요. 반응물끼리, 생성물끼리 더해요.', 4800); return; }
    S.r.chk[i] = true; Sound.success(); ['m1In', 'm2In'].forEach((id) => { $('#' + id).disabled = true; });
    $('#bChk').disabled = true;
    S.r.beam.value = i % 2 ? -0.1 : 0.1; S.r.beam.velocity = 0; S.r.beam.target = 0;
    tw(S.r.put[i], { p: 1 }, { duration: 1.3, ease: 'outCubic' });
    updateCtl();
  });
  $$('#subSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.r.sub = b.dataset.v; updateCtl(); }));
  function stepRead(dt) { S.r.beam.update(dt); }
  function drawRead() {
    const i = S.r.sel, rx = READ[i], r = S.r, done = r.chk[i], bx = LAYR.bx, bm = LAYR.bm;
    drawEqLine(VW / 2, PHONE ? 26 : 28, spEqItems(rx), PHONE ? 17 : 22, VW - 20);
    panel(bx.x, bx.y, bx.w, bx.h, 14);
    D.label(bx.x + 12, bx.y + 18, '반응물', { bg: VIO, size: 12.5, align: 'left' });
    D.label(PHONE ? bx.x + 248 : bx.x + 416, bx.y + 18, '생성물', { bg: AMB, size: 12.5, align: 'left' });
    if (PHONE) { D.dashedLine(bx.x + 238, bx.y + 34, bx.x + 238, bx.y + bx.h - 12, { color: '#c4b5fd', width: 2 }); T(bx.x + bx.w - 12, bx.y + 18, '□ 1개 = 1 mol', 12.5, MUTED, 'right', 800); }
    else D.arrow(bx.x + bx.w / 2 - 14, bx.y + 120, bx.x + bx.w / 2 + 14, bx.y + 120, { color: VIO, width: 5, head: 14 });
    const grp = readGroups(rx);
    grp.forEach((g) => {
      const n = g.s[1], M = MM(g.s[0]), cols = Math.min(n, 3);
      const px = g.gx, py = g.gy;
      D.label(px + 4, py + 11, spText(g.s), { bg: SP_COL[g.j % 4], size: 13, align: 'left' });
      const gx0 = PHONE ? px + 112 : px + 4, gy0 = PHONE ? py + 4 : py + 32;
      for (let b = 0; b < n; b++) {
        const col = b % cols, row = Math.floor(b / cols), k = SciSim.ease.outBack(clamp(r.cardsOn.v * (n + 2) - b, 0, 1)) || 0;
        const bw = g.bs + (PHONE ? 4 : 6), bh = g.bs, x = gx0 + col * (bw + g.gap), y = gy0 + row * (bh + g.gap);
        ctx.save(); ctx.translate(x + bw / 2, y + bh / 2); ctx.scale(k, k);
        D.shadow(() => { D.roundRect(-bw / 2, -bh / 2, bw, bh, 8); ctx.fillStyle = '#f3efff'; ctx.fill(); }, { blur: 5, y: 2 });
        ctx.strokeStyle = SP_COL[g.j % 4]; ctx.lineWidth = 2; D.roundRect(-bw / 2, -bh / 2, bw, bh, 8); ctx.stroke();
        T(0, 5, PHONE ? '1' : '1 mol', PHONE ? 13 : 12, '#4c1d95', 'center', 800);
        ctx.restore();
      }
      const cy2 = PHONE ? py + 44 : py + 32 + (Math.ceil(n / 3)) * (g.bs + g.gap) + 14, cx2 = PHONE ? px + 4 : px + 4;
      T(cx2, cy2, fT(n) + ' mol', PHONE ? 14 : 15.5, INK, 'left', 800);
      T(cx2, cy2 + (PHONE ? 17 : 19), '× ' + fT(M) + ' g/mol', PHONE ? 13 : 14, MUTED, 'left', 800);
      if (done) T(cx2, cy2 + (PHONE ? 34 : 38), '= ' + fT(n * M) + ' g', PHONE ? 14 : 15.5, '#0b7a41', 'left', 800);
    });
    // 저울
    panel(bm.x, bm.y, bm.w, bm.h, 14);
    T(bm.x + 14, bm.y + 24, '⚖️ 질량 검산', 14.5, INK, 'left', 800);
    if (r.sent[i]) {
      const ls = wrap('📝 ' + rx.sentDone, bm.w - 28, PHONE ? 13.5 : 15, 800);
      ls.forEach((l, k) => T(bm.x + 14, bm.y + 48 + k * 20, l, PHONE ? 13.5 : 15, '#0b7a41', 'left', 800));
    } else T(bm.x + 14, bm.y + 48, '왼쪽 입력칸으로 몰 문장을 만들어 봐요.', 13.5, MUTED, 'left', 800);
    const blocks = (side) => { let idx = 0; return rx.sp.map((s, j) => ({ s, j })).filter((o) => o.s[3] === side).map((o) => ({ label: spText(o.s) + ' ' + fT(o.s[1] * MM(o.s[0])) + ' g', color: SP_COL[o.j % 4], p: clamp(r.put[i].p * 1.6 - (idx++) * 0.3, 0, 1) })); };
    const half = PHONE ? 150 : 250, pw = PHONE ? 134 : 176, py2 = bm.y + (PHONE ? 150 : 112), stand = PHONE ? 190 : 118;
    drawBeam(bm.x + bm.w / 2, py2, half, r.beam.value, blocks(0), blocks(1), { pw, drop: 66, stand, leftLabel: '반응물 합 ' + (done ? fT(sideSum(rx, 0)) + ' g' : '?'), rightLabel: '생성물 합 ' + (done ? fT(sideSum(rx, 1)) + ' g' : '?') });
    if (done) D.label(bm.x + bm.w - 14, bm.y + 20, '질량 보존  ' + fT(sideSum(rx, 0)) + ' g = ' + fT(sideSum(rx, 1)) + ' g  ✔', { bg: '#14a058', size: 14, align: 'right' });
  }

  /* ---------- 장면 초기화 ---------- */
  function snapTweens() {
    tws.forEach((h) => h.cancel()); tws.length = 0;
    S.m.pack = S.m.packOn ? 1 : 0; S.r.cardsOn.v = 1;
    S.q.anim.forEach((row, i) => row.forEach((c, j) => { c.p = S.q.filled[i][j] > 0 ? 1 : 0; }));
    S.r.put.forEach((c, i) => { c.p = S.r.chk[i] ? 1 : 0; });
  }
  function resetBal() { snapTweens(); S.b.eq.forEach((e) => { e.c = [1, 1, 1, 1]; e.st = ['', '', '', '']; }); lastDone = BAL.map(() => false); S.b.sel = 0; S.b.anim = null; S.b.ran = false; S.b.flash = 0; S.b.pop = 0; }
  function resetMol() { snapTweens(); S.m.packOn = false; S.m.pack = 0; S.m.maxX = 0; setX(0); S.m.vx = 0; }
  function resetMass() { snapTweens(); S.q.sel = 0; S.q.filled = MASS.map((r) => r.sp.map(() => 0)); S.q.anim.forEach((row) => row.forEach((c) => { c.p = 0; })); S.q.beam.value = 0; S.q.beam.target = 0; S.q.beam.velocity = 0; }
  function resetRead() { snapTweens(); S.r.sel = 0; S.r.sub = 'sent'; S.r.sent = READ.map(() => false); S.r.chk = READ.map(() => false); S.r.put.forEach((c) => { c.p = 0; }); S.r.beam.value = 0; S.r.beam.target = 0; S.r.beam.velocity = 0; }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'balance') {
      const bi = balInfo(), eq = bi.eq;
      L1 = '고른 반응'; a = bi.r.name;
      L2 = '원자 수 (왼쪽 : 오른쪽)'; b = bi.els.map((e) => e + ' ' + (bi.a[e] || 0) + ' : ' + (bi.b[e] || 0)).join(' · ');
      L3 = '판정'; c = eqDone(S.b.sel) ? '✅ 완성!' : bi.same ? (bi.simplest ? '균형 ✔ · 상태 기호 확인' : '균형 ✔ · 계수를 줄여요') : '⬜ 원자 수가 달라요';
    } else if (S.mode === 'mol') {
      const a2 = mAmt(S.m.x);
      L1 = '반응한 H₂'; a = fT(a2.cH2) + ' mol';
      L2 = '반응한 O₂'; b = fT(a2.cO2) + ' mol';
      L3 = '생긴 H₂O'; c = fT(a2.fW) + ' mol';
    } else if (S.mode === 'mass') {
      const mi = massInfo();
      L1 = '계수비 = 몰수비'; a = mi.coefs.join(' : ');
      L2 = '질량비'; b = mi.done ? ratioOf(mi.masses.map((v) => Math.round(v))).join(' : ') : '표를 채워요';
      L3 = '질량의 합'; c = mi.done ? fT(mi.m0) + ' g → ' + fT(mi.m1) + ' g' : '?';
    } else {
      const rx = READ[S.r.sel];
      L1 = '고른 반응'; a = rx.name + ' (' + rx.ctx + ')';
      L2 = '몰 문장'; b = S.r.sent[S.r.sel] ? '✅ 완성' : '⬜ 입력 중';
      L3 = '질량 보존'; c = S.r.chk[S.r.sel] ? fT(sideSum(rx, 0)) + ' g = ' + fT(sideSum(rx, 1)) + ' g ✔' : '⬜ 검산 전';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const eqStr = (i) => { const r = BAL[i]; return r.sp.map((s, j) => (j === 2 ? '→ ' : j ? '+ ' : '') + (r.c[j] > 1 ? r.c[j] + ' ' : '') + FOR(s.k) + '(' + s.st + ')').join(' '); };
  const doneCount = (arr) => arr.filter(Boolean).length;
  const mA = mAmt(4);                                                // 수소 4 mol이 반응할 때
  const mq = MASS.map((_, i) => massInfo(i));
  const rd = READ.map((rx) => ({ m0: sideSum(rx, 0), m1: sideSum(rx, 1) }));
  const rr = (arr) => ratioOf(arr).join(' : ');
  const levels = [
    {
      title: '반응식 쓰기: 계수와 상태 기호', short: '반응식 쓰기', icon: '🧩', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 반응식 속 숫자 2, 1, 2는 \'몇 개\'의 비일까, \'몇 g\'의 비일까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 반응식의 계수를 맞추고, 계수의 비가 <b>분자 수의 비</b>라는 것을 배웠어요. 이번에는 그 비가 <b>몰수의 비</b>이고 <b>질량의 비와는 다르다</b>는 것을 확인해요.</div>' +
        '<p>먼저 1분 복습! 화학식은 그대로 두고 <b>계수만</b> 바꿔서 양쪽의 원자 수를 같게 맞춰요. 새로 배울 것은 물질의 상태를 나타내는 <b>상태 기호</b>예요: (s) 고체 · (l) 액체 · (g) 기체 · (aq) 수용액.</p>',
      features: ['balance'],
      setup() { S.gate = ''; resetBal(); setScene('balance'); updateCtl(); },
      recap: '반응식은 화학식은 그대로 두고 계수만 바꿔 양쪽의 원자 수를 같게 맞춰요. 물질 옆에 상태 기호 (s) (l) (g) (aq)를 붙여 상태까지 나타내요.',
      summary: '<ul><li>화학 반응식: 반응물 → 생성물을 화학식과 <b>계수</b>로 나타내요. 양쪽의 원자 수가 같아야 해요(질량 보존).</li><li>계수는 가장 작은 정수비로 쓰고, <b>화학식은 바꾸지 않아요</b>(H₂O를 H₂O₂로 바꾸면 다른 물질).</li><li>상태 기호: (s) 고체, (l) 액체, (g) 기체, (aq) 수용액.</li><li>' + [0, 1, 2].map(eqStr).join('<br>') + '</li></ul>',
      missions: [
        {
          title: '3개의 반응식 완성하기',
          goal: '<b>메테인 · 프로판 · 알루미늄과 염산</b> 반응식의 계수를 맞추고 <b>상태 기호</b>도 붙이세요. (25 °C, 1기압에서의 상태)',
          hint: '메테인: C 1개는 CO₂ 1개, H 4개는 H₂O 2개가 되고, 그러면 O는 4개라서 O₂는 2개예요. 물은 25 °C에서 액체(l)예요.',
          setup() { S.gate = ''; setScene('balance'); },
          check: () => BAL.every((_, i) => eqDone(i)),
          hold: 0.6,
          status: () => BAL.map((r, i) => mark(eqDone(i)) + ' ' + r.name).join(' &nbsp; '),
          explain: '완성한 반응식은 <b>' + [0, 1, 2].map(eqStr).join(' / ') + '</b>예요. 계수는 가장 작은 정수비로 쓰고, 이 반응식에서 물은 25 °C에서 액체(l), 염산과 염화 알루미늄 용액은 수용액(aq)이에요.',
        },
        {
          type: 'quiz', title: '화학식은 바꿀 수 있을까?',
          goal: 'H₂ + O₂ → H₂O에서 산소 원자 수를 맞추려고 H₂O를 <b>H₂O₂</b>로 고쳐 쓰면 왜 안 될까요?',
          setup() { S.gate = ''; setScene('balance'); },
          choices: ['고쳐 써도 되지만 약속상 쓰지 않아요', 'H₂O₂는 과산화 수소라는 다른 물질이라서, 화학식은 두고 계수만 바꿔야 해요', '이미 원자 수가 같아졌기 때문이에요', '생성물에는 계수를 쓸 수 없기 때문이에요'],
          answer: 1,
          feedback: ['약속이 아니에요. 화학식이 달라지면 물질 자체가 달라져요.', '', '계수를 맞추기 전에는 양쪽의 산소 원자 수가 달라요.', '생성물에도 2 H₂O처럼 계수를 쓸 수 있어요.'],
          explain: '화학식은 <b>물질의 정체</b>를 나타내요. H₂O(물)를 H₂O₂(과산화 수소)로 바꾸면 다른 물질의 반응식이 돼요. 그래서 원자 수를 맞출 때는 화학식은 두고 <b>계수만</b> 바꿔요: 2H₂ + O₂ → 2H₂O.',
        },
      ],
    },
    {
      title: '계수비 = 몰수비', short: '계수비=몰수비', icon: '📦', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 2H₂ + O₂ → 2H₂O처럼 계수를 맞춘 반응식을 썼어요. 계수 2 : 1 : 2는 분자 <b>2개 : 1개 : 2개</b>를 뜻해요.</div>' +
        '<p>분자 수를 한 묶음(1 mol = 6.02×10²³개)씩 <b>몰 상자</b>로 묶으면 2 : 1 : 2는 <b>2 mol : 1 mol : 2 mol</b>이 되고, 비는 그대로예요. 반응이 진행되면 세 물질의 양이 어떻게 변하는지 슬라이더로 확인해요.</p>',
      features: ['mol'],
      setup() { S.gate = ''; resetMol(); setScene('mol'); updateCtl(); },
      recap: '반응식의 계수비는 입자 수의 비이면서 몰수의 비예요. 반응이 진행될 때 반응한 양과 생긴 양은 항상 계수비를 따라요.',
      summary: '<ul><li>계수비 = 반응하는 <b>입자 수의 비</b> = <b>몰수의 비</b>. 입자를 6.02×10²³개씩 묶어도 비는 변하지 않아요.</li><li>2H₂ + O₂ → 2H₂O: H₂ ' + fT(mA.cH2) + ' mol이 반응하면 O₂ ' + fT(mA.cO2) + ' mol이 반응하고 H₂O ' + fT(mA.fW) + ' mol이 생겨요 (' + fT(mA.cH2) + ' : ' + fT(mA.cO2) + ' : ' + fT(mA.fW) + ' = 2 : 1 : 2).</li><li>같은 온도 · 압력의 기체끼리라면 계수비 = 부피비이기도 해요(액체인 물은 제외).</li></ul>',
      missions: [
        {
          title: '몰 상자로 묶고 진행시키기',
          goal: '<b>📦 몰 상자로 묶기</b>를 누르고, 슬라이더로 반응한 H₂를 <b>2 mol 이상</b>으로 움직여 보세요.',
          hint: '먼저 📦 단추로 분자를 몰 상자로 묶은 다음, 슬라이더나 + 단추로 반응한 수소의 몰수를 늘려요.',
          setup() { S.gate = ''; setScene('mol'); },
          check: () => S.m.packOn && S.m.pack > 0.98 && S.m.maxX >= 2,
          hold: 0.5,
          status: () => mark(S.m.packOn && S.m.pack > 0.98) + ' 몰 상자로 묶기 &nbsp; ' + mark(S.m.maxX >= 2) + ' 반응한 H₂ 2 mol 이상',
          explain: '분자 2개 : 1개 : 2개를 한 묶음(6.02×10²³개)씩 상자에 담으면 <b>2 mol : 1 mol : 2 mol</b>이에요. 상자의 수는 늘어났지만 비 2 : 1 : 2는 그대로예요. 반응이 진행되어도 세 물질의 변한 양은 늘 이 비를 따라요.',
        },
        {
          title: '수소 4 mol이 반응하면?', manual: true,
          goal: '슬라이더를 <b>4 mol</b>에 맞추고, 반응한 <b>O₂</b>와 생긴 <b>H₂O</b>의 몰수를 쓴 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '계수비 H₂ : O₂ : H₂O = 2 : 1 : 2예요. H₂가 4 mol이면 O₂는 그 절반이에요.',
          setup() { S.gate = 'read'; $('#o2In').value = ''; $('#wIn').value = ''; setScene('mol'); updateCtl(); },
          check() {
            if (S.m.x !== 4) return '슬라이더를 4 mol에 맞춰 주세요. (지금은 ' + fT(S.m.x) + ' mol)';
            const o = parseNum($('#o2In').value), w = parseNum($('#wIn').value);
            if (isNaN(o) || isNaN(w)) return '반응한 O₂와 생긴 H₂O의 몰수를 모두 써 주세요.';
            if (Math.abs(o - mA.cO2) > 0.005) return 'O₂는 H₂의 절반만 반응해요. 계수비 2 : 1을 떠올려 보세요.';
            if (Math.abs(w - mA.fW) > 0.005) return 'H₂O의 계수는 H₂와 같은 2예요. 반응한 H₂와 같은 몰수가 생겨요.';
            return true;
          },
          explain: 'H₂ : O₂ : H₂O = 2 : 1 : 2이므로 H₂ ' + fT(mA.cH2) + ' mol이 반응하면 O₂는 <b>' + fT(mA.cO2) + ' mol</b> 반응하고 H₂O는 <b>' + fT(mA.fW) + ' mol</b> 생겨요. 슬라이더를 어디에 두어도 세 양의 비는 2 : 1 : 2예요.',
        },
        {
          type: 'quiz', title: '계수비가 나타내는 것',
          goal: '2H₂ + O₂ → 2H₂O에서 계수의 비 <b>2 : 1 : 2</b>가 나타내는 것은?',
          setup() { S.gate = ''; setScene('mol'); },
          choices: ['반응하는 물질의 질량의 비', '반응하는 입자 수의 비이자 몰수의 비', '세 물질의 부피의 비 (모두)', '원자량의 비'],
          answer: 1,
          feedback: ['질량의 비는 계수비와 달라요. 다음 단계에서 확인해요.', '', '기체끼리는 부피비도 계수비이지만, 생성된 물은 액체라서 부피비로 볼 수 없어요.', '원자량은 원자의 상대적인 질량이라서 반응식의 계수와는 관계가 없어요.'],
          explain: '계수비는 <b>입자 수의 비</b>이고, 입자를 몰 단위로 묶어도 비가 같으므로 <b>몰수의 비</b>이기도 해요. 질량의 비가 아니라는 점은 다음 단계에서 몰질량을 곱해 확인해요.',
        },
      ],
    },
    {
      title: '질량으로 읽기: 질량비 ≠ 계수비', short: '질량으로 읽기', icon: '⚖️', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 계수비가 몰수의 비라는 것을 알았어요. 그럼 <b>질량</b>은 어떻게 될까요? 질량 = 몰수 × <b>몰질량</b>이에요.</div>' +
        '<p>반응식 아래에 몰질량을 곱한 표를 완성해 봐요. 물질마다 1 mol의 질량이 다르므로 질량의 비는 계수비와 달라질 거예요. 그래도 반응 전후 <b>질량의 합</b>은 같아요.</p>',
      features: ['mass'],
      setup() { S.gate = ''; resetMass(); setScene('mass'); updateCtl(); },
      recap: '질량 = 몰수 × 몰질량이라서 질량비는 계수비와 달라요. 그래도 반응 전후 질량의 합은 같아요(질량 보존).',
      summary: '<ul><li>질량 = 몰수 × 몰질량. 물질마다 몰질량이 달라서 <b>질량비 ≠ 계수비</b>예요.</li><li>2H₂ + O₂ → 2H₂O: (2×2) : (1×32) : (2×18) = ' + mq[0].masses.join(' : ') + ' → 질량비 ' + rr(mq[0].masses) + ' (계수비 2 : 1 : 2)</li><li>N₂ + 3H₂ → 2NH₃: ' + mq[1].masses.join(' : ') + ' (질량비 ' + rr(mq[1].masses) + ', 계수비 1 : 3 : 2)</li><li>CH₄ + 2O₂ → CO₂ + 2H₂O: ' + mq[2].masses.join(' + ') + ' → 반응물 ' + fT(mq[2].m0) + ' g, 생성물 ' + fT(mq[2].m1) + ' g</li><li>반응 전후 질량의 합은 같아요. 몰질량으로 몰수를 구하면 양적 관계를 쉽게 해석할 수 있어요.</li></ul>',
      missions: [
        {
          title: '질량 표 2개 완성하기', manual: true,
          goal: '반응 <b>3개 중 2개</b>를 골라, 몰수 × 몰질량으로 각 물질의 <b>질량</b>을 구해 표를 완성하세요. 끝나면 <b>✔ 확인하기</b>를 누르세요.',
          hint: '수소 연소: H₂ 2 mol × 2 g/mol = 4 g, O₂ 1 mol × 32 g/mol = 32 g, H₂O 2 mol × 18 g/mol = 36 g이에요.',
          setup() { S.gate = ''; setScene('mass'); },
          check() { const n = MASS.filter((_, i) => massComplete(i)).length; return n >= 2 ? true : '표를 ' + (2 - n) + '개 더 완성해야 해요. (완성한 표 ' + n + ' / 2)'; },
          status: () => MASS.map((r, i) => mark(massComplete(i)) + ' ' + r.name).join(' &nbsp; '),
          explain: '수소 연소는 ' + mq[0].masses.join(' : ') + '(질량비 ' + rr(mq[0].masses) + '), 암모니아 합성은 ' + mq[1].masses.join(' : ') + '(질량비 ' + rr(mq[1].masses) + ')예요. 계수비 2 : 1 : 2, 1 : 3 : 2와 달라요. 하지만 반응물의 합과 생성물의 합은 ' + fT(mq[0].m0) + ' g, ' + fT(mq[1].m0) + ' g으로 같아요.',
        },
        {
          type: 'quiz', title: '계수비 1 : 3 : 2면 질량비도?',
          goal: 'N₂ + 3H₂ → 2NH₃의 계수비는 1 : 3 : 2예요. 그러면 질량비도 <b>1 : 3 : 2</b>일까요?',
          setup() { S.gate = ''; setScene('mass'); },
          choices: ['맞아요. 계수비는 곧 질량비예요', '아니에요. 질량 = 몰수 × 몰질량이라서 질량비는 28 : 6 : 34예요', '아니에요. 반응 전후에 질량이 달라지기 때문이에요', '맞아요. 분자 수의 비가 1 : 3 : 2이기 때문이에요'],
          answer: 1,
          feedback: ['계수비는 몰수의 비이고, 질량은 여기에 몰질량을 곱해야 해요. 표의 질량비를 확인해 보세요.', '', '반응 전후의 질량 합은 같아요(질량 보존). 질량비가 다른 이유는 몰질량이 다르기 때문이에요.', '분자 수의 비는 맞지만, 분자 한 개의 질량이 물질마다 달라서 질량비는 달라요.'],
          explain: '몰수의 비 1 : 3 : 2에 몰질량 N₂ 28, H₂ 2, NH₃ 17을 곱하면 28 : 6 : 34(= 14 : 3 : 17)예요. 계수비는 <b>몰수의 비</b>이고 질량비가 아니에요. 그래서 질량을 다룰 때는 반드시 <b>몰질량으로 몰수로 바꿔서</b> 해석해요.',
        },
      ],
    },
    {
      title: '반응식 읽기: 몰 문장과 검산', short: '반응식 읽기', icon: '📖', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 계수비는 몰수의 비이고, 질량은 몰질량을 곱해야 한다는 것을 알았어요. 이제 새로운 반응식을 <b>몰 문장</b>으로 읽어 봐요.</div>' +
        '<p>에탄올 연소(알코올 램프), 포도당 연소(세포 호흡), 철이 녹스는 반응을 "<b>1 mol의 ○○가 반응하면 □□ mol의 △△가 생성돼요</b>"로 읽고, 질량으로 <b>검산</b>해서 반응 전후 질량이 같은지 확인해요.</p>',
      features: ['read'],
      setup() { S.gate = ''; resetRead(); setScene('read'); updateCtl(); },
      recap: '반응식의 계수는 몰수의 비로 읽어요. 각 물질의 질량을 몰수 × 몰질량으로 구해 더하면 반응 전후 질량이 같음을 검산할 수 있어요.',
      summary: '<ul><li>반응식은 <b>몰 문장</b>으로 읽어요: ' + READ.map((rx) => rx.sentDone).join(' ') + '</li><li>검산: 에탄올 연소 ' + fT(rd[0].m0) + ' g → ' + fT(rd[0].m1) + ' g, 포도당 연소 ' + fT(rd[1].m0) + ' g → ' + fT(rd[1].m1) + ' g, 철 녹슬기 ' + fT(rd[2].m0) + ' g → ' + fT(rd[2].m1) + ' g.</li><li>철이 녹슬 때 철 4 mol이 반응하면 산소 3 mol이 필요해요(4 : 3).</li><li>계수비 = 몰수비, 질량은 몰수 × 몰질량 → 이 두 가지로 모든 반응의 양적 관계를 읽을 수 있어요.</li></ul>',
      missions: [
        {
          title: '3개의 몰 문장 만들기',
          goal: '에탄올 · 포도당 · 철 반응식을 읽고, <b>1 mol 기준</b> 몰 문장의 빈칸을 모두 채워 <b>✔ 문장 확인</b>을 누르세요.',
          hint: '계수비를 이용해요. 예를 들어 C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O에서 에탄올 1 mol이면 CO₂는 2 mol이에요. 철은 4 mol일 때 O₂ 3 mol이므로 1 mol일 때는 4로 나눠요.',
          setup() { S.gate = ''; S.r.sub = 'sent'; setScene('read'); updateCtl(); },
          check: () => READ.every((_, i) => S.r.sent[i]),
          hold: 0.5,
          status: () => READ.map((r, i) => mark(S.r.sent[i]) + ' ' + r.name).join(' &nbsp; '),
          explain: READ.map((rx) => rx.sentDone).join(' ') + ' 모두 계수의 비를 몰수의 비로 읽은 것이에요.',
        },
        {
          title: '질량 보존 검산하기',
          goal: '<b>2개 이상</b>의 반응에서 반응물과 생성물의 <b>질량의 합</b>(계수 × 몰질량의 합)을 구해 저울에 올려 보세요.',
          hint: '에탄올 연소: 반응물 46 + 3×32 = 142 g, 생성물 2×44 + 3×18 = 142 g이에요. 몰질량은 저울 위쪽 칸에 적혀 있어요.',
          setup() { S.gate = ''; S.r.sub = 'chk'; S.r.chk = READ.map(() => false); S.r.put.forEach((c) => { c.p = 0; }); S.r.beam.value = 0; S.r.beam.target = 0; S.r.beam.velocity = 0; setScene('read'); updateCtl(); },
          check: () => doneCount(S.r.chk) >= 2,
          hold: 0.8,
          status: () => READ.map((r, i) => mark(S.r.chk[i]) + ' ' + r.name).join(' &nbsp; '),
          explain: '에탄올 연소 ' + fT(rd[0].m0) + ' g → ' + fT(rd[0].m1) + ' g, 포도당 연소 ' + fT(rd[1].m0) + ' g → ' + fT(rd[1].m1) + ' g, 철 녹슬기 ' + fT(rd[2].m0) + ' g → ' + fT(rd[2].m1) + ' g으로 모두 같아요. 계수가 맞는 반응식은 반응 전후 질량이 보존돼요.',
        },
        {
          type: 'quiz', title: '철이 녹슬 때 필요한 산소',
          goal: '4Fe + 3O₂ → 2Fe₂O₃에서 철 <b>4 mol</b>이 모두 반응하면 필요한 산소(O₂)는 몇 mol일까요?',
          setup() { S.gate = ''; S.r.sel = 2; setScene('read'); updateCtl(); },
          choices: ['2 mol', '3 mol', '4 mol', '7 mol'],
          answer: 1,
          feedback: ['2는 Fe₂O₃의 계수예요. O₂의 계수를 확인해 보세요.', '', '철과 산소의 몰수가 같다고 생각했나요? 계수비는 Fe : O₂ = 4 : 3이에요.', '계수를 더하면 안 돼요. 몰수의 비는 계수비 그대로예요.'],
          explain: 'Fe : O₂ = 4 : 3이므로 철 4 mol에는 산소 <b>3 mol</b>이 필요해요. 질량으로는 철 ' + fT(4 * MM('Fe')) + ' g과 산소 ' + fT(3 * MM('O2')) + ' g이고, 이 둘을 합한 ' + fT(rd[2].m0) + ' g이 Fe₂O₃ 2 mol의 질량 ' + fT(2 * MM('Fe2O3')) + ' g과 같아요.',
        },
      ],
    },
  ];

  game = null;
  game = SciSim.game({
    simId: 'hc-equation-mole', mount: '#game', badge: '반응식 박사', homeHref: '../../index.html#hc',
    featureLabels: { balance: '🧩 계수 입력기 · 원자 수 막대', mol: '📦 몰 상자 · 진행도 슬라이더', mass: '⚖️ 몰질량 표 · 저울', read: '📖 몰 문장 · 질량 검산' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setX(0);
  setScene(S.mode);
  buildRows(); updateCtl();
  function stepAll(dt) {
    if (S.mode === 'balance') stepBalance(dt); else if (S.mode === 'mol') stepMol(dt); else if (S.mode === 'mass') stepMass(dt); else stepRead(dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#f4f1fb'; ctx.fillRect(0, 0, VW, VH);
    stepAll(dt);
    if (S.mode === 'balance') drawBalance(); else if (S.mode === 'mol') drawMol2(); else if (S.mode === 'mass') drawMass(); else drawRead();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, BAL, MASS, READ, LAY, LAYM, LAYQ, LAYR, get game() { return game; },
    setScene, setX, eqDone, balInfo, startReact, massInfo, readGroups, MM, sideSum, mAmt,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll(0.02); parts.update(0.02); } },
  };
})();
