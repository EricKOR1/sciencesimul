/* =========================================================
   화학 Ⅰ. 화학의 언어 - 몰질량과 질량 [12화학01-02]
   ① 탐구: 몰질량 찾기 (원자량 카드를 모아 원자량 · 분자량 · 화학식량의 합 → g/mol)
   ② 실험: 몰수만큼 달기 (가상 저울, 목표 질량 = 몰수 × 몰질량, 오차 ±0.1 g)
   ③ 분석: 질량 · 몰 · 수 (같은 18 g의 몰수 비교, 질량 → 몰 → 입자 수 3단 계산)
   ④ 적용: 계산 도전 (설탕 · 소금 · 포도당 · 물 한 스푼의 입자 수)
   원자량은 반올림 값(H 1, C 12, N 14, O 16, Na 23, S 32, Cl 35.5, Ca 40 ...)을 써요. 기체 부피는 다음 차시예요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6';
  const BG = '#f3f0fb';

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
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;

  /* ---------- 숫자 표기 ---------- */
  const NA = 6.02e23;
  const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const supStr = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  function sciParts(x, dig) {
    if (!(x > 0)) return ['0', 0];
    let e = Math.floor(Math.log10(x)), m = +(x / Math.pow(10, e)).toPrecision(dig || 4);
    if (m >= 10) { m = +(m / 10).toPrecision(dig || 4); e++; }
    return [String(m), e];
  }
  const sci = (x, dig) => { const q = sciParts(x, dig); return q[0] + '×10' + supStr(q[1]); };
  const fm = (v, d) => String(+v.toFixed(d == null ? 3 : d));                  // 끝의 0을 지운 숫자
  const f1 = (v) => v.toFixed(1);

  /* ---------- 자료 ---------- */
  const EL = {
    H: { m: 1, name: '수소', c: '#e5e7eb', tc: '#394258' }, C: { m: 12, name: '탄소', c: '#475569', tc: '#fff' }, N: { m: 14, name: '질소', c: '#3867f4', tc: '#fff' },
    O: { m: 16, name: '산소', c: '#e2464b', tc: '#fff' }, Na: { m: 23, name: '나트륨', c: '#8b5cf6', tc: '#fff' }, S: { m: 32, name: '황', c: '#eab308', tc: '#394258' },
    Cl: { m: 35.5, name: '염소', c: '#14a058', tc: '#fff' }, Ca: { m: 40, name: '칼슘', c: '#f59e0b', tc: '#fff' },
  };
  const ATOMS = ['H', 'C', 'N', 'O', 'Na', 'S', 'Cl', 'Ca'];
  const CMPS = [
    { id: 'h2o', f: 'H₂O', name: '물', comp: { H: 2, O: 1 } }, { id: 'co2', f: 'CO₂', name: '이산화 탄소', comp: { C: 1, O: 2 } },
    { id: 'nacl', f: 'NaCl', name: '염화 나트륨', comp: { Na: 1, Cl: 1 } }, { id: 'cacl2', f: 'CaCl₂', name: '염화 칼슘', comp: { Ca: 1, Cl: 2 } },
    { id: 'nh3', f: 'NH₃', name: '암모니아', comp: { N: 1, H: 3 } }, { id: 'h2so4', f: 'H₂SO₄', name: '황산', comp: { H: 2, S: 1, O: 4 } },
  ];
  CMPS.forEach((c) => { c.M = Object.keys(c.comp).reduce((s, k) => s + EL[k].m * c.comp[k], 0); });
  const WS = [
    { id: 'fe', name: '철', f: 'Fe', M: 56, unit: '원자', c: '#7b8794' }, { id: 'cu', name: '구리', f: 'Cu', M: 64, unit: '원자', c: '#d97706' },
    { id: 'h2o', name: '물', f: 'H₂O', M: 18, unit: '분자', c: '#5bb4f5' }, { id: 'nacl', name: '소금', f: 'NaCl', M: 58.5, unit: '화학식 단위', c: '#f1f5f9' },
    { id: 'caco3', name: '탄산 칼슘', f: 'CaCO₃', M: 100, unit: '화학식 단위', c: '#e2e8f0' },
  ];
  const AM = [0.25, 0.5, 1, 2];
  const RW = [{ f: 'H₂O', name: '물', M: 18 }, { f: 'Mg', name: '마그네슘', M: 24 }, { f: 'Cu', name: '구리', M: 64 }, { f: 'Fe', name: '철', M: 56 }, { f: 'NaCl', name: '소금', M: 58.5 }];
  RW.forEach((r) => { r.n = 18 / r.M; });
  const H2SO4 = { w: 49, M: 98 }; H2SO4.n = H2SO4.w / H2SO4.M; H2SO4.N = H2SO4.n * NA; H2SO4.O = H2SO4.n * 4;
  const PB = [
    { id: 0, name: '설탕 한 스푼', f: 'C₁₂H₂₂O₁₁', w: 3.42, M: 12 * EL.C.m + 22 * EL.H.m + 11 * EL.O.m, who: '설탕 분자', exp: 21, icon: '🥄', col: '#fde68a' },
    { id: 1, name: '소금 한 꼬집', f: 'NaCl', w: 0.585, M: EL.Na.m + EL.Cl.m, who: 'Na⁺ 이온', exp: 21, icon: '🧂', col: '#f1f5f9' },
    { id: 2, name: '포도당 한 알', f: 'C₆H₁₂O₆', w: 9.0, M: 6 * EL.C.m + 12 * EL.H.m + 6 * EL.O.m, who: '포도당 분자', exp: 22, icon: '🍬', col: '#fbcfe8' },
    { id: 3, name: '물 몇 방울', f: 'H₂O', w: 3.6, M: 2 * EL.H.m + EL.O.m, who: '물 분자', exp: 23, icon: '💧', col: '#bae6fd' },
  ];
  PB.forEach((p) => { p.n = p.w / p.M; p.N = p.n * NA; p.mant = p.N / Math.pow(10, p.exp); });
  const OPS = ['(고르세요)', '÷ 몰질량', '× 몰질량', '÷ 6.02×10²³', '× 6.02×10²³'];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'find', t: 0, fade: 0, gate: '', sub: { analyze: 'compare' },
    fd: { cmp: 0, tray: [], drag: null, solved: {}, stamp: 0, msg: '' },
    wg: { sub: 2, amt: 2, m: 0, disp: 0, hold: 0, rec: {}, last: '', plate: new SciSim.Spring(0, { stiffness: 260, damping: 16 }), flash: 0, tgtShown: false },
    an: { val: RW.map(() => NaN), ok: RW.map(() => false), ch: [false, false, false], bad: -1, shake: 0, fill: RW.map(() => 0) },
    ap: { prob: 0, a: {}, b: {}, solved: {}, shake: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { find: '⚛️ 몰질량 찾기', weigh: '⚖️ 저울로 달기', analyze: '📊 질량 · 몰 · 수', apply: '🧮 계산 도전' };
  const cmpOf = () => CMPS[S.fd.cmp];
  const solvedFd = () => CMPS.filter((c) => S.fd.solved[c.id]).length;
  const wsOf = () => WS[S.wg.sub];
  const tgtMass = () => AM[S.wg.amt] * wsOf().M;
  const recKey = (si, ai) => WS[si].id + '-' + AM[ai];
  const molDone = () => WS.filter((w) => S.wg.rec[w.id + '-1']).length;
  const apSolved = () => PB.filter((p) => S.ap.solved[p.id]).length;

  /* ---------- 공통 UI ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.fd.drag = null; }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#fdCmp button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.fd.cmp); b.classList.toggle('done', !!S.fd.solved[CMPS[k].id]); });
    $$('#wgSub button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.wg.sub); b.classList.toggle('done', !!S.wg.rec[WS[k].id + '-1']); });
    $$('#wgAmt button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.wg.amt); b.classList.toggle('done', !!S.wg.rec[recKey(S.wg.sub, k)]); });
    $$('#anView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.analyze));
    $$('#apProb button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.ap.prob); b.classList.toggle('done', !!S.ap.solved[k]); });
    $('#oMass').textContent = f1(S.wg.m) + ' g';
    $('#sMass').value = Math.round(S.wg.m);
    const p = PB[S.ap.prob];
    $('#apLabC').textContent = p.who + ' 수 (×10' + supStr(p.exp) + '개의 앞 수)';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  CMPS.forEach((c, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = c.f; $('#fdCmp').appendChild(b); });
  WS.forEach((w, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = w.name + ' ' + w.f; $('#wgSub').appendChild(b); });
  AM.forEach((a, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = a + ' mol'; $('#wgAmt').appendChild(b); });
  PB.forEach((p, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = p.icon + ' ' + p.name.split(' ')[0]; $('#apProb').appendChild(b); });
  ['#apOpA', '#apOpB'].forEach((id) => OPS.forEach((o, i) => { const op = document.createElement('option'); op.value = i; op.textContent = o; $(id).appendChild(op); }));

  /* ================= ① 몰질량 찾기 ================= */
  const PAL = PHONE ? { x: 8, y: 50, w: 464, h: 182 } : { x: 12, y: 50, w: 776, h: 102 };
  const TRY = PHONE ? { x: 8, y: 240, w: 464, h: 190 } : { x: 12, y: 160, w: 776, h: 150 };
  const BARP = PHONE ? { x: 8, y: 438, w: 464, h: 100 } : { x: 12, y: 318, w: 776, h: 104 };
  const INF = PHONE ? { x: 8, y: 546, w: 464, h: 204 } : { x: 12, y: 430, w: 776, h: 120 };
  const palRect = (i) => (PHONE ? { x: 14 + (i % 3) * 152, y: PAL.y + 8 + Math.floor(i / 3) * 58, w: 146, h: 52 } : { x: 20 + i * 96, y: PAL.y + 8, w: 88, h: 86 });
  const TR_IN = PHONE ? { x: 16, y: TRY.y + 36, w: 448, h: 152 } : { x: 24, y: TRY.y + 34, w: 752, h: 106 };
  const slotPos = (i) => (PHONE ? { x: 8 + 58 + (i % 4) * 116, y: TR_IN.y + 40 + Math.floor(i / 4) * 74 } : { x: 24 + 50 + i * 92, y: TR_IN.y + 53 });
  const TR = PHONE ? 25 : 28;
  const inTray = (p) => p.x >= TR_IN.x && p.x <= TR_IN.x + TR_IN.w && p.y >= TR_IN.y && p.y <= TR_IN.y + TR_IN.h;
  const trayMass = () => S.fd.tray.reduce((s, tk) => s + EL[tk.el].m, 0);
  const trayCount = () => { const o = {}; S.fd.tray.forEach((tk) => { o[tk.el] = (o[tk.el] || 0) + 1; }); return o; };
  function matches(c) {
    const t = trayCount(), ks = Object.keys(c.comp);
    return S.fd.tray.length > 0 && Object.keys(t).length === ks.length && ks.every((k) => t[k] === c.comp[k]);
  }
  function fdHint() {
    const c = cmpOf(), t = trayCount();
    if (!S.fd.tray.length) return '원자 카드를 끌어 접시에 놓아요.';
    if (matches(c)) return '✅ ' + c.f + '의 몰질량 = ' + fm(c.M) + ' g/mol';
    for (const k of Object.keys(c.comp)) { const have = t[k] || 0; if (have < c.comp[k]) return k + ' 원자가 ' + (c.comp[k] - have) + '개 더 필요해요.'; }
    for (const k of Object.keys(t)) { const need = c.comp[k] || 0; if (t[k] > need) return need ? k + ' 원자가 ' + (t[k] - need) + '개 많아요.' : k + ' 원자는 ' + c.f + '에 없어요.'; }
    return '';
  }
  function palDown(p) {
    const fd = S.fd;
    for (let i = 0; i < ATOMS.length; i++) { const r = palRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { fd.drag = { el: ATOMS[i], x: p.x, y: p.y, fromTray: false, moved: 99, sx: p.x, sy: p.y }; Sound.click(); return true; } }
    for (let i = fd.tray.length - 1; i >= 0; i--) {
      const tk = fd.tray[i];
      if (Math.hypot(p.x - tk.x, p.y - tk.y) <= TR + 6) { fd.tray.splice(i, 1); fd.drag = { el: tk.el, x: p.x, y: p.y, fromTray: true, moved: 0, sx: p.x, sy: p.y }; Sound.click(); return true; }
    }
    return false;
  }
  function palMove(p) { const d = S.fd.drag; if (!d) return; d.x = p.x; d.y = p.y; d.moved = Math.max(d.moved, Math.hypot(p.x - d.sx, p.y - d.sy)); }
  function palUp(p) {
    const fd = S.fd, d = fd.drag; if (!d) return; fd.drag = null;
    if (d.fromTray && d.moved < 8) { parts.burst(p.x, p.y, { count: 6, speed: 60, size: 2.5, colors: [EL[d.el].c, '#fff'], gravity: 0 }); updateCtl(); return; }   // 눌러서 빼기
    if (inTray(p) && fd.tray.length < 8) { const s = slotPos(fd.tray.length); fd.tray.push({ el: d.el, x: p.x, y: p.y, bw: 0 }); void s; Sound.click(); }
    else { if (inTray(p)) showHint('접시에는 원자를 8개까지 놓을 수 있어요.', 2600); parts.burst(p.x, p.y, { count: 6, speed: 60, size: 2.5, colors: [EL[d.el].c, '#fff'], gravity: 0 }); }
    updateCtl();
  }
  function atomBall(x, y, r, el, extra) { D.sphere(x, y, r, EL[el].c, Object.assign({ text: el, textColor: EL[el].tc, textScale: el.length > 1 ? 0.78 : 1.0, outline: el === 'H' ? '#9aa5b6' : undefined, outlineWidth: 1.2 }, extra || {})); }
  function drawFind(t) {
    const fd = S.fd, c = cmpOf(), tot = trayMass();
    T(14, 26, '⚛️ 원자를 모아 몰질량 구하기', PHONE ? 15 : 17, INK, 'left', 800);
    panel(PAL.x, PAL.y, PAL.w, PAL.h, 14);
    ATOMS.forEach((a, i) => {
      const r = palRect(i), hot = fd.drag && !fd.drag.fromTray && fd.drag.el === a;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = hot ? '#f3edff' : '#fff'; ctx.fill(); }, { blur: hot ? 8 : 3, y: 2 });
      ctx.strokeStyle = hot ? PUR : '#d6dcea'; ctx.lineWidth = hot ? 2.5 : 1.5; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      if (PHONE) { atomBall(r.x + 26, r.y + 26, 19, a); T(r.x + 52, r.y + 22, EL[a].name, 13, INK, 'left', 800); T(r.x + 52, r.y + 42, '원자량 ' + fm(EL[a].m), 13, '#b45309', 'left', 800); }
      else { atomBall(r.x + r.w / 2, r.y + 30, 22, a); T(r.x + r.w / 2, r.y + 66, EL[a].name, 13, INK, 'center', 800); T(r.x + r.w / 2, r.y + 82, '원자량 ' + fm(EL[a].m), 13, '#b45309', 'center', 800); }
    });
    panel(TRY.x, TRY.y, TRY.w, TRY.h, 14);
    T(TRY.x + 16, TRY.y + 26, '🥣 접시: ' + c.name + ' ' + c.f + ' 만들기', 15, INK, 'left', 800);
    D.label(TRY.x + TRY.w - 14, TRY.y + 22, c.f + '의 몰질량은?', { bg: PUR, size: 13, align: 'right' });
    ctx.strokeStyle = fd.drag ? PUR : '#c8d0df'; ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]); D.roundRect(TR_IN.x, TR_IN.y, TR_IN.w, TR_IN.h, 14); ctx.stroke(); ctx.setLineDash([]);
    if (fd.drag && inTray({ x: fd.drag.x, y: fd.drag.y })) { ctx.fillStyle = 'rgba(139,92,246,.08)'; D.roundRect(TR_IN.x, TR_IN.y, TR_IN.w, TR_IN.h, 14); ctx.fill(); }
    if (!fd.tray.length && !fd.drag) T(TR_IN.x + TR_IN.w / 2, TR_IN.y + TR_IN.h / 2 + 5, '원자 카드를 여기로 끌어 오세요', 14.5, '#9aa5b6', 'center', 800);
    fd.tray.forEach((tk, i) => { const s = slotPos(i); tk.x = SciSim.approach(tk.x, s.x, 1 / 60, 14); tk.y = SciSim.approach(tk.y, s.y, 1 / 60, 14); atomBall(tk.x, tk.y, TR, tk.el, { shadow: true }); T(tk.x, tk.y + TR + 16, fm(EL[tk.el].m), 13, '#b45309', 'center', 800); });
    // 막대: 질량의 합 (눈금 끝 = max(120, 합계))
    panel(BARP.x, BARP.y, BARP.w, BARP.h, 14);
    const bx = BARP.x + 16, bw = BARP.w - 32, by = BARP.y + 46, bhh = 30, scaleMax = Math.max(120, tot);
    T(bx, BARP.y + 28, '질량의 합 (g/mol)', 14, INK, 'left', 800);
    T(BARP.x + BARP.w - 16, BARP.y + 28, '눈금 끝 = ' + fm(scaleMax) + '', 13, MUTED, 'right', 700);
    D.roundRect(bx, by, bw, bhh, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, by, bw, bhh, 8); ctx.clip();
    let acc = 0;
    fd.tray.forEach((tk) => {
      const w = bw * EL[tk.el].m / scaleMax; tk.bw = SciSim.approach(tk.bw || 0, w, 1 / 60, 10);
      ctx.fillStyle = EL[tk.el].c; ctx.fillRect(bx + acc, by, Math.max(0, tk.bw - 1.5), bhh); acc += tk.bw;
      if (tk.bw > 22) T(bx + acc - tk.bw / 2, by + 20, tk.el, 13, EL[tk.el].tc, 'center', 800);
    });
    ctx.restore();
    for (let q = 0; q <= 4; q++) { const gx = bx + bw * q / 4; ctx.strokeStyle = 'rgba(80,90,110,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, by + bhh); ctx.lineTo(gx, by + bhh + 5); ctx.stroke(); T(gx, by + bhh + 18, fm(scaleMax * q / 4, 1), 12, MUTED, q === 0 ? 'left' : q === 4 ? 'right' : 'center', 700); }
    // 정보
    panel(INF.x, INF.y, INF.w, INF.h, 14);
    const sumTxt = fd.tray.length ? fd.tray.map((tk) => fm(EL[tk.el].m)).join(' + ') + ' = ' + fm(tot) + ' g/mol' : '합 = 0 g/mol';
    T(INF.x + 16, INF.y + 34, sumTxt, PHONE ? 18 : 22, INK, 'left', 800);
    const ok = matches(c);
    textBlock(INF.x + 16, INF.y + 64, INF.w - 32, fdHint(), 14.5, ok ? '#14803f' : '#b45309', 20, 800);
    textBlock(INF.x + 16, INF.y + (PHONE ? 110 : 90), INF.w - 32, '몰질량은 원자량(분자량·화학식량)의 숫자에 g/mol을 붙인 값이에요. 탄소 원자량 12 → 탄소 12 g이 1 mol(탄소 원자 6.02×10²³개)이에요.', 13.5, MUTED, 19, 700);
    if (ok && fd.stamp > 0) { const sc = 1 + 0.7 * (1 - fd.stamp); ctx.save(); ctx.translate(TRY.x + TRY.w - 60, TRY.y + TRY.h - 40); ctx.rotate(-0.2); ctx.scale(sc, sc); ctx.globalAlpha = clamp(fd.stamp * 1.4, 0, 1); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3.5; D.roundRect(-46, -20, 92, 40, 10); ctx.stroke(); T(0, 6, fm(c.M) + ' g/mol', 15, '#14a058', 'center', 800); ctx.restore(); }
    if (fd.drag) { atomBall(fd.drag.x, fd.drag.y - 6, TR + 3, fd.drag.el, { shadow: true }); }
  }
  let lastMatch = '';
  function stepFind(dt) {
    const fd = S.fd, c = cmpOf();
    const ok = matches(c), key = ok ? c.id : '';
    if (key && key !== lastMatch) {
      lastMatch = key; fd.stamp = 0; SciSim.tween(fd, { stamp: 1 }, { duration: 0.55, ease: 'outBack' });
      if (!fd.solved[c.id]) { fd.solved[c.id] = true; Sound.success(); parts.burst(TRY.x + TRY.w / 2, TRY.y + 80, { count: 18, speed: 160, size: 3.4, colors: ['#ffb400', '#14a058', '#8b5cf6'] }); updateCtl(); }
    }
    if (!key) lastMatch = '';
  }
  $('#fdCmp').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.fd.cmp = +b.dataset.v; S.fd.tray = []; lastMatch = ''; updateCtl(); });
  $('#bFdClear').addEventListener('click', () => { Sound.click(); S.fd.tray = []; lastMatch = ''; });

  /* ================= ② 저울로 달기 ================= */
  const SC = PHONE ? { x: 8, y: 50, w: 464, h: 300 } : { x: 12, y: 50, w: 500, h: 334 };
  const WI = PHONE ? { x: 8, y: 358, w: 464, h: 150 } : { x: 524, y: 50, w: 264, h: 334 };
  const WR = PHONE ? { x: 8, y: 516, w: 464, h: 234 } : { x: 12, y: 392, w: 776, h: 158 };
  const seeded = (() => { let s = 20240611; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const GRAINS = Array.from({ length: 70 }, () => ({ u: seeded(), v: seeded(), r: 3.6 + seeded() * 1.6 }));
  const wgReading = () => Math.round(S.wg.m * 10) / 10;
  const wgOK = () => Math.abs(wgReading() - tgtMass()) <= 0.1 + 1e-9;
  function setMass(v) { const nv = clamp(Math.round(v * 10) / 10, 0, 250); if (nv === S.wg.m) return; S.wg.m = nv; S.wg.plate.velocity += 40; updateCtl(); }
  function wgReset() { S.wg.m = 0; S.wg.hold = 0; S.wg.tgtShown = false; updateCtl(); }
  function drawPile(cx, topY, w, m, ws, t) {
    const n = Math.min(GRAINS.length, Math.ceil(Math.pow(clamp(m / 200, 0, 1), 0.6) * GRAINS.length));
    for (let i = 0; i < n; i++) {
      const g = GRAINS[i], layer = i / GRAINS.length, half = (w / 2) * (1 - 0.7 * layer), x = cx + (g.u * 2 - 1) * half, y = topY - 3 - layer * 46 - g.v * 6;
      if (ws.id === 'fe') { ctx.fillStyle = C.shade(ws.c, g.v * 0.3 - 0.1); ctx.fillRect(x - g.r, y - g.r, g.r * 2, g.r * 2); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - g.r, y - g.r, g.r * 2, 1.6); }
      else if (ws.id === 'cu') D.sphere(x, y, g.r + 0.4, ws.c, { gloss: false });
      else if (ws.id === 'nacl') { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.fillRect(x - g.r * 0.8, y - g.r * 0.8, g.r * 1.6, g.r * 1.6); ctx.strokeRect(x - g.r * 0.8, y - g.r * 0.8, g.r * 1.6, g.r * 1.6); }
      else { ctx.fillStyle = ws.c; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, g.r * 0.9, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
  }
  function drawWeigh(t) {
    const wg = S.wg, ws = wsOf(), n = AM[wg.amt], tg = tgtMass(), ok = wgOK();
    T(14, 26, '⚖️ 몰수만큼 달기', PHONE ? 15 : 17, INK, 'left', 800);
    panel(SC.x, SC.y, SC.w, SC.h, 14);
    const cx = SC.x + SC.w / 2, baseY = SC.y + SC.h - 86, plateY = baseY - 28 + wg.plate.value;
    // 저울
    D.shadow(() => { D.roundRect(cx - 140, baseY, 280, 72, 16); ctx.fillStyle = '#cfd6e4'; ctx.fill(); }, { blur: 10, y: 4 });
    ctx.fillStyle = '#394258'; D.roundRect(cx - 96, baseY + 12, 192, 46, 8); ctx.fill();
    ctx.fillStyle = wg.hold > 0.05 ? '#9cf3b6' : '#b7f5c9'; ctx.font = D.font(28, 800); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#7fffa8';
    ctx.fillText(f1(wg.disp), cx + 62, baseY + 36); ctx.textAlign = 'left'; ctx.font = D.font(16, 800); ctx.fillText('g', cx + 68, baseY + 38); ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#aeb8c9'; ctx.fillRect(cx - 6, plateY + 12, 12, baseY - plateY - 12);
    D.roundRect(cx - 120, plateY, 240, 14, 7); ctx.fillStyle = '#e6ebf5'; ctx.fill(); ctx.strokeStyle = '#9aa5b6'; ctx.lineWidth = 2; ctx.stroke();
    // 시료
    if (ws.id === 'h2o') {
      const lv = clamp(wg.disp / 250, 0, 1);
      D.beaker(cx - 44, plateY - 112, 88, 112, { level: lv * 0.92, liquid: '#5bb4f5', t, ticks: 6 });
    } else {
      D.roundRect(cx - 86, plateY - 10, 172, 10, 5); ctx.fillStyle = '#d6dcea'; ctx.fill();
      drawPile(cx, plateY - 8, 150, wg.disp, ws, t);
    }
    T(SC.x + 16, SC.y + 26, ws.name + ' ' + ws.f + ' ' + n + ' mol 달기', 15, INK, 'left', 800);
    T(SC.x + 16, SC.y + 48, '몰질량 ' + fm(ws.M) + ' g/mol', 14, '#b45309', 'left', 800);
    T(SC.x + SC.w - 16, SC.y + 26, ws.f + ' ' + ws.unit + ' ' + sci(n * NA) + '개', 14, '#5b21b6', 'right', 800);
    if (ok && wg.hold > 0) T(cx, SC.y + 90, '값을 읽는 중…', 14, '#14803f', 'center', 800);
    if (wg.tgtShown) { D.label(cx, SC.y + 86, '목표 ' + fm(tg) + ' g ✓', { bg: '#14a058', size: 14 }); }
    if (wg.flash > 0) { ctx.fillStyle = 'rgba(20,160,88,' + wg.flash * 0.18 + ')'; D.roundRect(SC.x, SC.y, SC.w, SC.h, 14); ctx.fill(); }
    // 정보 (몰질량 표)
    panel(WI.x, WI.y, WI.w, WI.h, 14);
    T(WI.x + 16, WI.y + 26, '몰질량 표 (g/mol)', 14.5, INK, 'left', 800);
    const rh = PHONE ? 22 : 40, cols = PHONE ? 2 : 1;
    WS.forEach((w, i) => {
      const c = PHONE ? i % cols : 0, r = PHONE ? Math.floor(i / cols) : i, x = WI.x + 12 + c * (WI.w / 2 - 6), y = WI.y + 40 + r * (rh + (PHONE ? 8 : 0)), sel = i === wg.sub;
      if (sel) { D.roundRect(x, y, PHONE ? WI.w / 2 - 18 : WI.w - 24, rh - 4, 8); ctx.fillStyle = 'rgba(139,92,246,.14)'; ctx.fill(); }
      T(x + 8, y + rh / 2 + 3, w.name + ' ' + w.f, PHONE ? 13.5 : 14.5, INK, 'left', 800);
      T(x + (PHONE ? WI.w / 2 - 28 : WI.w - 36), y + rh / 2 + 3, fm(w.M), PHONE ? 14 : 16, '#b45309', 'right', 800);
    });
    // 기록표
    panel(WR.x, WR.y, WR.w, WR.h, 14);
    T(WR.x + 16, WR.y + 26, '📋 달기 기록 (성공한 것만 적혀요)', 14.5, INK, 'left', 800);
    const hd = ['물질', '몰수', '질량(g)', '입자 수'], cx0 = PHONE ? [0, 0.34, 0.52, 0.72] : [0, 0.3, 0.46, 0.64];
    hd.forEach((h, i) => T(WR.x + 16 + (WR.w - 32) * cx0[i], WR.y + 50, h, 13, MUTED, 'left', 800));
    const recs = Object.keys(S.wg.rec).map((k) => S.wg.rec[k]).slice(-5);
    const rrh = PHONE ? 30 : 20;
    recs.forEach((r, i) => {
      const y = WR.y + 74 + i * rrh, hl = r.key === wg.last;
      if (hl) { D.roundRect(WR.x + 8, y - 14, WR.w - 16, rrh - 2, 6); ctx.fillStyle = 'rgba(255,212,71,.3)'; ctx.fill(); }
      T(WR.x + 16 + (WR.w - 32) * cx0[0], y, r.name + ' ' + r.f, 13.5, INK, 'left', 800);
      T(WR.x + 16 + (WR.w - 32) * cx0[1], y, r.n + ' mol', 13.5, INK, 'left', 800);
      T(WR.x + 16 + (WR.w - 32) * cx0[2], y, f1(r.m), 13.5, '#b45309', 'left', 800);
      T(WR.x + 16 + (WR.w - 32) * cx0[3], y, sci(r.n * NA, 4) + '개', 13.5, '#5b21b6', 'left', 800);
    });
    if (!recs.length) T(WR.x + 16, WR.y + 80, '물질과 몰수를 고르고 질량을 맞추면 기록돼요.', 14, '#9aa5b6', 'left', 700);
  }
  function stepWeigh(dt) {
    const wg = S.wg;
    wg.disp = SciSim.approach(wg.disp, wgReading(), dt, 12); if (Math.abs(wg.disp - wgReading()) < 0.01) wg.disp = wgReading();
    wg.plate.target = -clamp(wg.disp / 60, 0, 1) * 4; wg.plate.update(dt);
    wg.flash = Math.max(0, wg.flash - dt * 1.6);
    if (wgOK()) {
      wg.hold += dt;
      const key = recKey(wg.sub, wg.amt);
      if (wg.hold >= 0.45 && !wg.rec[key]) {
        wg.rec[key] = { key, id: wsOf().id, name: wsOf().name, f: wsOf().f, n: AM[wg.amt], m: wgReading() }; wg.last = key; wg.tgtShown = true; wg.flash = 1;
        Sound.success(); parts.burst(SC.x + SC.w / 2, SC.y + SC.h - 120, { count: 18, speed: 160, size: 3.4, colors: ['#ffb400', '#14a058', '#8b5cf6'] }); updateCtl();
      } else if (wg.rec[key]) wg.tgtShown = true;
    } else { wg.hold = 0; wg.tgtShown = false; }
  }
  $('#wgSub').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.wg.sub = +b.dataset.v; wgReset(); });
  $('#wgAmt').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.wg.amt = +b.dataset.v; wgReset(); });
  $('#sMass').addEventListener('input', (e) => setMass(+e.target.value));
  [['#mM1', -1], ['#mM01', -0.1], ['#mP01', 0.1], ['#mP1', 1]].forEach(([id, d]) => $(id).addEventListener('click', () => { Sound.tick(); setMass(S.wg.m + d); }));

  /* ================= ③ 질량 · 몰 · 수 ================= */
  const AP1 = PHONE ? { x: 8, y: 50, w: 464, h: 420 } : { x: 12, y: 50, w: 776, h: 340 };
  const AP2 = PHONE ? { x: 8, y: 478, w: 464, h: 272 } : { x: 12, y: 398, w: 776, h: 152 };
  function miniScale(x, y, ws) {
    ctx.fillStyle = '#cfd6e4'; D.roundRect(x - 26, y + 8, 52, 18, 5); ctx.fill(); ctx.fillStyle = '#e6ebf5'; D.roundRect(x - 22, y + 2, 44, 7, 3); ctx.fill();
    if (ws === 'H₂O') { ctx.fillStyle = 'rgba(91,180,245,.85)'; D.roundRect(x - 10, y - 18, 20, 20, 4); ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else { const col = { Mg: '#cbd5e1', Cu: '#d97706', Fe: '#7b8794', NaCl: '#f8fafc' }[ws] || '#aaa'; for (let i = 0; i < 9; i++) { ctx.fillStyle = col; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x - 10 + (i % 3) * 10 + (Math.floor(i / 3) % 2) * 3, y - 2 - Math.floor(i / 3) * 6, 4.2, 0, TAU); ctx.fill(); ctx.stroke(); } }
  }
  function drawCompare(t) {
    const an = S.an;
    T(14, 26, '⚖️ 같은 18 g, 몰수는 같을까?', PHONE ? 15 : 17, INK, 'left', 800);
    panel(AP1.x, AP1.y, AP1.w, AP1.h, 14);
    const rh = PHONE ? 74 : 56, y0 = AP1.y + 44;
    T(AP1.x + 16, AP1.y + 26, '모두 질량 18 g', 14.5, INK, 'left', 800);
    T(AP1.x + AP1.w - 16, AP1.y + 26, '막대 끝 = 1.2 mol', 13, MUTED, 'right', 700);
    RW.forEach((r, i) => {
      const y = y0 + i * rh, ok = an.ok[i];
      an.fill[i] = SciSim.approach(an.fill[i], ok ? 1 : 0, 1 / 60, 7);
      if (ok) { D.roundRect(AP1.x + 8, y - 4, AP1.w - 16, rh - 4, 10); ctx.fillStyle = 'rgba(20,160,88,.07)'; ctx.fill(); }
      miniScale(AP1.x + 40, y + 28, r.f); T(AP1.x + 40, y + 52, '18 g', 13, MUTED, 'center', 800);
      T(AP1.x + 84, y + 24, r.name + ' ' + r.f, 14.5, INK, 'left', 800); T(AP1.x + 84, y + 44, 'M = ' + fm(r.M) + ' g/mol', 13.5, '#b45309', 'left', 800);
      const bx = PHONE ? AP1.x + 210 : AP1.x + 290, bw = PHONE ? 130 : 330, by = y + (PHONE ? 20 : 16), bhh = 22;
      D.roundRect(bx, by, bw, bhh, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const full = bw * clamp(r.n / 1.2, 0, 1);
      ctx.strokeStyle = '#b4bfcf'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bx + full, by - 3); ctx.lineTo(bx + full, by + bhh + 3); ctx.stroke(); ctx.setLineDash([]);
      if (an.fill[i] > 0.01) { ctx.save(); D.roundRect(bx, by, bw, bhh, 8); ctx.clip(); ctx.fillStyle = '#8b5cf6'; ctx.fillRect(bx, by, full * an.fill[i], bhh); ctx.restore(); }
      if (PHONE) { T(AP1.x + AP1.w - 14, y + 28, ok ? fm(r.n, 2) + ' mol' : '? mol', 15, ok ? '#5b21b6' : '#9aa5b6', 'right', 800); if (ok) T(AP1.x + AP1.w - 14, y + 50, sci(r.n * NA, 4) + '개', 13, MUTED, 'right', 800); else if (!isNaN(an.val[i])) T(AP1.x + AP1.w - 14, y + 50, '내 값 ' + fm(an.val[i], 3), 13, '#b4231f', 'right', 800); }
      else { T(bx + bw + 14, by + 16, ok ? fm(r.n, 2) + ' mol' : '? mol', 16, ok ? '#5b21b6' : '#9aa5b6', 'left', 800); if (ok) T(bx + bw + 14, by + 36, sci(r.n * NA, 4) + '개', 13, MUTED, 'left', 800); else if (!isNaN(an.val[i])) T(bx + bw + 14, by + 36, '내 값 ' + fm(an.val[i], 3) + ' ✗', 13, '#b4231f', 'left', 800); }
    });
    panel(AP2.x, AP2.y, AP2.w, AP2.h, 14);
    T(AP2.x + 16, AP2.y + 28, '📐 몰수 n = 질량 / 몰질량', 15, INK, 'left', 800);
    textBlock(AP2.x + 16, AP2.y + 58, AP2.w - 32, '질량이 같아도 몰질량이 다르면 몰수(입자 수)가 달라요. 몰질량이 작은 물질일수록 같은 질량에 입자가 더 많아요.', 14.5, MUTED, 20, 700);
    const okN = an.ok.filter(Boolean).length;
    T(AP2.x + 16, AP2.y + AP2.h - 18, '맞힌 물질 ' + okN + ' / ' + RW.length, 14.5, okN === RW.length ? '#14803f' : INK, 'left', 800);
  }
  function drawChain(t) {
    const an = S.an, ch = an.ch;
    T(14, 26, '🔗 질량 → 몰 → 입자 수 3단 계산', PHONE ? 15 : 17, INK, 'left', 800);
    panel(AP1.x, AP1.y, AP1.w, AP1.h, 14);
    const bw = PHONE ? 200 : 188, bh = PHONE ? 78 : 88;
    const P = PHONE ? { A: [AP1.x + 24, AP1.y + 20], B: [AP1.x + 24, AP1.y + 150], Cc: [AP1.x + 24, AP1.y + 280], Dd: [AP1.x + 240, AP1.y + 150] } : { A: [AP1.x + 22, AP1.y + 52], B: [AP1.x + 294, AP1.y + 52], Cc: [AP1.x + 566, AP1.y + 52], Dd: [AP1.x + 294, AP1.y + 214] };
    const box = (p, title, val, known, hl) => {
      D.shadow(() => { D.roundRect(p[0], p[1], bw, bh, 14); ctx.fillStyle = known ? '#fff' : '#f7f3ff'; ctx.fill(); }, { blur: 7, y: 3 });
      ctx.strokeStyle = known ? '#14a058' : PUR; ctx.lineWidth = hl ? 4 : 2.4; if (!known) ctx.setLineDash([7, 5]); D.roundRect(p[0], p[1], bw, bh, 14); ctx.stroke(); ctx.setLineDash([]);
      T(p[0] + bw / 2, p[1] + 26, title, 13.5, MUTED, 'center', 800); T(p[0] + bw / 2, p[1] + bh - 22, val, val.length > 14 ? 18 : 22, known ? INK : '#9aa5b6', 'center', 800);
    };
    box(P.A, 'H₂SO₄ 질량', H2SO4.w + ' g', true, false);
    box(P.B, '① 몰수 n', ch[0] ? fm(H2SO4.n) + ' mol' : '?', ch[0], !ch[0]);
    box(P.Cc, '② 분자 수 N', ch[1] ? sci(H2SO4.N) + '개' : '?', ch[1], ch[0] && !ch[1]);
    box(P.Dd, '③ 산소 원자 (mol)', ch[2] ? fm(H2SO4.O, 1) + ' mol' : '?', ch[2], ch[1] && !ch[2]);
    const arr = (x1, y1, x2, y2, label, on, lx, ly, al) => { D.arrow(x1, y1, x2, y2, { color: on ? '#8b5cf6' : '#cdbdf5', width: 5, head: 14 }); T(lx, ly, label, 13.5, on ? '#5b21b6' : '#9aa5b6', al || 'center', 800); };
    if (PHONE) {
      arr(P.A[0] + bw / 2, P.A[1] + bh + 4, P.B[0] + bw / 2, P.B[1] - 4, '/ 98 g/mol', true, P.A[0] + bw / 2 + 14, P.A[1] + bh + 36, 'left');
      arr(P.B[0] + bw / 2, P.B[1] + bh + 4, P.Cc[0] + bw / 2, P.Cc[1] - 4, '× 6.02×10²³', ch[0], P.B[0] + bw / 2 + 14, P.B[1] + bh + 36, 'left');
      arr(P.B[0] + bw + 4, P.B[1] + bh / 2, P.Dd[0] - 4, P.Dd[1] + bh / 2, '', ch[0]); T(P.B[0] + bw + 20, P.B[1] + bh / 2 - 12, '× 4', 14, ch[0] ? '#5b21b6' : '#9aa5b6', 'left', 800);
    } else {
      arr(P.A[0] + bw + 4, P.A[1] + bh / 2, P.B[0] - 4, P.B[1] + bh / 2, '/ 98 g/mol', true, (P.A[0] + bw + P.B[0]) / 2, P.A[1] - 12);
      arr(P.B[0] + bw + 4, P.B[1] + bh / 2, P.Cc[0] - 4, P.Cc[1] + bh / 2, '× 6.02×10²³', ch[0], (P.B[0] + bw + P.Cc[0]) / 2, P.B[1] - 12);
      arr(P.B[0] + bw / 2, P.B[1] + bh + 4, P.Dd[0] + bw / 2, P.Dd[1] - 4, '× 4 (H₂SO₄ 한 분자의 O 원자 수)', ch[0], P.B[0] + bw / 2 + 14, P.B[1] + bh + 52, 'left');
    }
    if (an.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + an.shake * 0.3 + ')'; D.roundRect(AP1.x, AP1.y, AP1.w, AP1.h, 14); ctx.fill(); }
    panel(AP2.x, AP2.y, AP2.w, AP2.h, 14);
    T(AP2.x + 16, AP2.y + 28, '황산 H₂SO₄ 몰질량 = 2×1 + 32 + 4×16 = ' + fm(H2SO4.M) + ' g/mol', 14.5, INK, 'left', 800);
    textBlock(AP2.x + 16, AP2.y + 58, AP2.w - 32, 'n = w / M, N = n × 6.02×10²³ 순서로 계산해요. 그리고 H₂SO₄ 한 분자에 O 원자가 4개 있으니 산소 원자의 몰수는 n × 4예요.', 14, MUTED, 19, 700);
    T(AP2.x + 16, AP2.y + AP2.h - 16, '맞힌 단계 ' + ch.filter(Boolean).length + ' / 3', 14.5, ch.every(Boolean) ? '#14803f' : INK, 'left', 800);
  }
  function buildCmpInputs() {
    const box = $('#cmpIn'); box.innerHTML = '';
    RW.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'in-grid';
      row.innerHTML = '<span class="lab">' + r.f + ' (M = ' + fm(r.M) + ')</span><input class="num-in" id="cmp' + i + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00">';
      box.appendChild(row);
      row.querySelector('input').addEventListener('input', (e) => cmpEval(i, e.target));
    });
  }
  function cmpEval(i, inp) {
    const an = S.an, v = parseNum(inp.value), was = an.ok[i];
    an.val[i] = v; an.ok[i] = near(v, RW[i].n, 0.006);
    inp.classList.remove('ok', 'bad');
    if (an.ok[i]) { inp.classList.add('ok'); if (!was) { Sound.success(); parts.burst(AP1.x + 40, AP1.y + 44 + i * (PHONE ? 74 : 56) + 24, { count: 8, speed: 90, size: 2.6, colors: ['#14a058', '#8b5cf6', '#ffb400'] }); } }
    else if (!isNaN(v) && inp.value.length >= 3) inp.classList.add('bad');
  }
  function chainEval() {
    const an = S.an, ins = ['#chA', '#chB', '#chC'].map((s) => parseNum($(s).value)), note = $('#chNote');
    const want = [H2SO4.n, H2SO4.N / 1e23, H2SO4.O], tol = [0.006, 0.04, 0.02], msgs = ['① n = w ÷ M를 다시 계산해 보세요. 49 ÷ 98은 얼마일까요?', '② N = n × 6.02×10²³이에요. ×10²³의 앞 수만 써요.', '③ H₂SO₄ 분자 1개에는 O 원자가 4개 있어요. n × 4를 구해요.'];
    for (let i = 0; i < 3; i++) {
      if (an.ch[i]) continue;
      if (isNaN(ins[i])) { note.textContent = (i + 1) + '번 칸에 숫자를 써 주세요.'; return; }
      if (near(ins[i], want[i], tol[i])) { an.ch[i] = true; Sound.success(); parts.burst(PHONE ? 240 : 400, PHONE ? 300 : 200, { count: 12, speed: 120, size: 3, colors: ['#14a058', '#8b5cf6', '#ffb400'] }); $(['#chA', '#chB', '#chC'][i]).classList.add('ok'); }
      else { an.shake = 0.45; Sound.fail(); note.textContent = msgs[i]; $(['#chA', '#chB', '#chC'][i]).classList.add('bad'); setTimeout(() => $(['#chA', '#chB', '#chC'][i]).classList.remove('bad'), 500); return; }
    }
    note.textContent = '✅ 3단 계산을 모두 마쳤어요!';
  }
  $('#bChain').addEventListener('click', chainEval);
  $('#anView').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sub.analyze = b.dataset.v; S.fade = 0.5; updateCtl(); });

  /* ================= ④ 계산 도전 ================= */
  const AQ = PHONE ? { x: 8, y: 50, w: 464, h: 190 } : { x: 12, y: 50, w: 776, h: 150 };
  const AF = PHONE ? { x: 8, y: 248, w: 464, h: 376 } : { x: 12, y: 208, w: 776, h: 230 };
  const AR = PHONE ? { x: 8, y: 632, w: 464, h: 118 } : { x: 12, y: 446, w: 776, h: 104 };
  function drawApply(t) {
    const ap = S.ap, p = PB[ap.prob], solved = !!ap.solved[p.id], aOK = !!ap.a[p.id], bOK = !!ap.b[p.id];
    T(14, 26, '🧮 일상 속 양의 입자 수 구하기', PHONE ? 15 : 17, INK, 'left', 800);
    panel(AQ.x, AQ.y, AQ.w, AQ.h, 14);
    const bob = RM ? 0 : Math.sin(t * 2) * 3;
    D.glow(AQ.x + 66, AQ.y + AQ.h / 2, 54, p.col === '#f1f5f9' ? '#cbd5e1' : p.col, 0.6);
    T(AQ.x + 66, AQ.y + AQ.h / 2 + 22 + bob, p.icon, 56, '#000', 'center', 700);
    T(AQ.x + 128, AQ.y + 34, p.name + ' (' + p.f + ')', 18, INK, 'left', 800);
    T(AQ.x + 128, AQ.y + 62, '질량 ' + fm(p.w) + ' g', 22, '#b45309', 'left', 800);
    const pm = p.f === 'C₁₂H₂₂O₁₁' ? '12×12 + 22×1 + 11×16' : p.f === 'NaCl' ? '23 + 35.5' : p.f === 'C₆H₁₂O₆' ? '6×12 + 12×1 + 6×16' : '2×1 + 16';
    textBlock(AQ.x + 128, AQ.y + 90, AQ.w - 144, '몰질량 M = ' + pm + ' = ' + fm(p.M) + ' g/mol', 14.5, INK, 20, 800);
    textBlock(AQ.x + 128, AQ.y + (PHONE ? 140 : 118), AQ.w - 144, p.who + '는 모두 몇 개일까요? (단계: 질량 → 몰 → 수)', 14, MUTED, 19, 700);
    // 흐름
    panel(AF.x, AF.y, AF.w, AF.h, 14);
    const bw = PHONE ? 190 : 190, bh = PHONE ? 82 : 96;
    const P = PHONE ? { A: [AF.x + (AF.w - bw) / 2, AF.y + 18], B: [AF.x + (AF.w - bw) / 2, AF.y + 148], Cc: [AF.x + (AF.w - bw) / 2, AF.y + 278] } : { A: [AF.x + 24, AF.y + 56], B: [AF.x + 293, AF.y + 56], Cc: [AF.x + 562, AF.y + 56] };
    const box = (q, title, val, known) => {
      D.shadow(() => { D.roundRect(q[0], q[1], bw, bh, 14); ctx.fillStyle = known ? '#fff' : '#f7f3ff'; ctx.fill(); }, { blur: 7, y: 3 });
      ctx.strokeStyle = known ? '#14a058' : PUR; ctx.lineWidth = 2.4; if (!known) ctx.setLineDash([7, 5]); D.roundRect(q[0], q[1], bw, bh, 14); ctx.stroke(); ctx.setLineDash([]);
      T(q[0] + bw / 2, q[1] + 26, title, 13.5, MUTED, 'center', 800); T(q[0] + bw / 2, q[1] + bh - 22, val, val.length > 12 ? 19 : 23, known ? INK : '#9aa5b6', 'center', 800);
    };
    box(P.A, '질량 w', fm(p.w) + ' g', true);
    box(P.B, '몰수 n', aOK ? fm(p.n, 4) + ' mol' : '?', aOK);
    box(P.Cc, p.who + ' 수 N', bOK ? sci(p.N) + '개' : '?', bOK);
    const opA = OPS[+$('#apOpA').value], opB = OPS[+$('#apOpB').value];
    const colA = aOK ? '#14803f' : '#5b21b6', colB = bOK ? '#14803f' : '#5b21b6';
    if (PHONE) {
      D.arrow(P.A[0] + bw / 2, P.A[1] + bh + 4, P.B[0] + bw / 2, P.B[1] - 4, { color: aOK ? '#14a058' : '#8b5cf6', width: 5, head: 14 }); T(P.A[0] + bw / 2 + 16, P.A[1] + bh + 28, opA === OPS[0] ? '계산을 골라요' : opA.replace('÷', '/'), 14.5, colA, 'left', 800);
      D.arrow(P.B[0] + bw / 2, P.B[1] + bh + 4, P.Cc[0] + bw / 2, P.Cc[1] - 4, { color: bOK ? '#14a058' : '#8b5cf6', width: 5, head: 14 }); T(P.B[0] + bw / 2 + 16, P.B[1] + bh + 28, opB === OPS[0] ? '계산을 골라요' : opB.replace('÷', '/'), 14.5, colB, 'left', 800);
    } else {
      D.arrow(P.A[0] + bw + 6, P.A[1] + bh / 2, P.B[0] - 6, P.B[1] + bh / 2, { color: aOK ? '#14a058' : '#8b5cf6', width: 5, head: 14 }); T((P.A[0] + bw + P.B[0]) / 2, P.A[1] - 12, opA === OPS[0] ? '계산을 골라요' : opA.replace('÷', '/'), 14.5, colA, 'center', 800);
      D.arrow(P.B[0] + bw + 6, P.B[1] + bh / 2, P.Cc[0] - 6, P.Cc[1] + bh / 2, { color: bOK ? '#14a058' : '#8b5cf6', width: 5, head: 14 }); T((P.B[0] + bw + P.Cc[0]) / 2, P.B[1] - 12, opB === OPS[0] ? '계산을 골라요' : opB.replace('÷', '/'), 14.5, colB, 'center', 800);
    }
    if (ap.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + ap.shake * 0.3 + ')'; D.roundRect(AF.x, AF.y, AF.w, AF.h, 14); ctx.fill(); }
    if (solved) D.check(AF.x + AF.w - 36, AF.y + 34, 18, 1);
    panel(AR.x, AR.y, AR.w, AR.h, 14);
    T(AR.x + 16, AR.y + 30, '푼 문제 ' + apSolved() + ' / ' + PB.length, 15, INK, 'left', 800);
    PB.forEach((q, i) => D.sphere(AR.x + 130 + i * 40, AR.y + 25, 14, ap.solved[q.id] ? '#14a058' : '#d6dcea', { gloss: false, text: String(i + 1), textColor: ap.solved[q.id] ? '#fff' : '#7b8494' }));
    textBlock(AR.x + 16, AR.y + 62, AR.w - 32, solved ? '✅ ' + p.who + ' ' + sci(p.N) + '개! 이렇게 작은 양에도 입자는 엄청 많아요.' : '질량 / 몰질량 = 몰수, 몰수 × 6.02×10²³ = 입자 수예요.', 14.5, solved ? '#14803f' : MUTED, 20, 800);
  }
  function apCheck() {
    const ap = S.ap, p = PB[ap.prob], note = $('#apNote');
    if (!ap.a[p.id]) {
      const op = +$('#apOpA').value, v = parseNum($('#apN').value);
      if (op === 0) { note.textContent = '먼저 계산 방법을 골라요.'; Sound.fail(); return; }
      if (op !== 1) { note.textContent = '질량을 몰수로 바꿀 때는 몰질량으로 나눠요. 단위가 g ÷ (g/mol) = mol이 돼요.'; ap.shake = 0.45; Sound.fail(); return; }
      if (isNaN(v)) { note.textContent = '몰수를 숫자로 써 주세요.'; Sound.fail(); return; }
      if (!near(v, p.n, p.n * 0.012)) { note.textContent = '몰수가 달라요. ' + fm(p.w) + ' ÷ ' + fm(p.M) + '을 다시 계산해 보세요.'; ap.shake = 0.45; Sound.fail(); $('#apN').classList.add('bad'); setTimeout(() => $('#apN').classList.remove('bad'), 500); return; }
      ap.a[p.id] = true; Sound.success(); $('#apN').classList.add('ok'); parts.burst(PHONE ? 240 : 400, PHONE ? 300 : 330, { count: 12, speed: 120, size: 3, colors: ['#14a058', '#8b5cf6'] });
      note.textContent = '① 맞아요! 이제 ②를 풀어요.';
    }
    if (!ap.b[p.id]) {
      const op = +$('#apOpB').value, v = parseNum($('#apC').value);
      if (op === 0) { if (!ap.a[p.id]) return; note.textContent = '② 계산 방법을 골라요.'; return; }
      if (op !== 4) { note.textContent = '몰수를 입자 수로 바꿀 때는 6.02×10²³을 곱해요.'; ap.shake = 0.45; Sound.fail(); return; }
      if (isNaN(v)) { note.textContent = '② 입자 수의 앞 수를 써 주세요. (×10' + supStr(p.exp) + '개)'; return; }
      if (!near(v, p.mant, p.mant * 0.012)) { note.textContent = '입자 수가 달라요. ' + fm(p.n, 4) + ' × 6.02×10²³을 계산해 ×10' + supStr(p.exp) + '의 앞 수를 써요.'; ap.shake = 0.45; Sound.fail(); $('#apC').classList.add('bad'); setTimeout(() => $('#apC').classList.remove('bad'), 500); return; }
      ap.b[p.id] = true; ap.solved[p.id] = true; Sound.success(); $('#apC').classList.add('ok'); parts.burst(PHONE ? 240 : 680, PHONE ? 500 : 330, { count: 20, speed: 160, size: 3.4, colors: ['#ffb400', '#14a058', '#8b5cf6'] });
      note.textContent = '✅ ' + p.who + ' ' + sci(p.N) + '개!';
    }
    updateCtl();
  }
  $('#bAp').addEventListener('click', apCheck);
  $('#apProb').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.ap.prob = +b.dataset.v; apFormReset(); updateCtl(); });
  function apFormReset() {
    const p = PB[S.ap.prob];
    ['#apN', '#apC'].forEach((s) => { $(s).classList.remove('ok', 'bad'); });
    $('#apN').value = S.ap.a[p.id] ? fm(p.n, 4) : ''; $('#apC').value = S.ap.b[p.id] ? fm(p.mant, 4) : '';
    $('#apOpA').value = S.ap.a[p.id] ? 1 : 0; $('#apOpB').value = S.ap.b[p.id] ? 4 : 0;
    $('#apNote').textContent = S.ap.solved[p.id] ? '✅ 이미 푼 문제예요.' : '① 먼저 맞히면 ②가 열려요.';
  }
  ['#apOpA', '#apOpB'].forEach((id) => $(id).addEventListener('change', () => { Sound.click(); }));

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    down(p) { return S.mode === 'find' ? palDown(p) : false; },
    move(p) { if (S.mode === 'find') palMove(p); },
    up(p) { if (S.mode === 'find') palUp(p); },
    hover(p) { return S.mode === 'find' && ATOMS.some((a, i) => { const r = palRect(i); return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }) ? 'grab' : 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'find') {
      const cm = cmpOf();
      L1 = '만들 물질'; a = cm.name + ' ' + cm.f; L2 = '접시의 질량 합'; b = fm(trayMass()) + ' g/mol'; L3 = '찾은 몰질량'; c = solvedFd() + ' / ' + CMPS.length + '개';
    } else if (S.mode === 'weigh') {
      const ws = wsOf();
      L1 = ws.name + ' ' + ws.f + ' ' + AM[S.wg.amt] + ' mol'; a = '몰질량 ' + fm(ws.M) + ' g/mol'; L2 = '저울 눈금'; b = f1(wgReading()) + ' g'; L3 = '1 mol 달기'; c = molDone() + ' / 3가지 이상';
    } else if (S.mode === 'analyze') {
      if (S.sub.analyze === 'compare') { L1 = '맞힌 물질'; a = S.an.ok.filter(Boolean).length + ' / ' + RW.length; L2 = '같은 질량'; b = '18 g'; L3 = '몰수 공식'; c = 'n = w ÷ M'; }
      else { L1 = '맞힌 단계'; a = S.an.ch.filter(Boolean).length + ' / 3'; L2 = 'H₂SO₄ 49 g'; b = S.an.ch[0] ? fm(H2SO4.n) + ' mol' : '? mol'; L3 = '분자 수'; c = S.an.ch[1] ? sci(H2SO4.N) + '개' : '?'; }
    } else {
      const p = PB[S.ap.prob];
      L1 = '고른 문제'; a = p.name; L2 = '몰질량 · 몰수'; b = fm(p.M) + ' g/mol · ' + (S.ap.a[p.id] ? fm(p.n, 4) + ' mol' : '?'); L3 = '푼 문제'; c = apSolved() + ' / ' + PB.length;
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---- 미션 시작 때 되돌릴 상태 (이전 미션·단계에 남은 값 때문에 미션이 미리 풀려 있지 않게) ---- */
  function resetFind() { S.fd.solved = {}; S.fd.tray = []; lastMatch = ''; }
  function resetCmp() { S.an.val = RW.map(() => NaN); S.an.ok = RW.map(() => false); S.an.fill = RW.map(() => 0); RW.forEach((r, i) => { const el = $('#cmp' + i); if (el) { el.value = ''; el.classList.remove('ok', 'bad'); } }); }
  function resetChain() { S.an.ch = [false, false, false]; S.an.shake = 0; ['#chA', '#chB', '#chC'].forEach((id) => { $(id).value = ''; $(id).classList.remove('ok', 'bad'); }); $('#chNote').textContent = '① 부터 차례로 맞혀요. 황산 H₂SO₄의 몰질량은 98 g/mol이에요.'; }
  function resetApply() { S.ap.solved = {}; S.ap.a = {}; S.ap.b = {}; apFormReset(); }
  /* ================= 미션 ================= */
  const rwEx = RW.map((r) => r.f + ' ' + fm(r.n, 2) + ' mol').join(' · ');
  const levels = [
    {
      title: '몰질량 찾기: 원자량의 합', short: '몰질량 찾기', icon: '⚛️', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 1몰인데 철과 물의 질량은 왜 다를까? 몰질량은 어디서 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 1 mol = 6.02×10²³개라는 것을 배웠어요. 그런데 입자 수는 직접 셀 수 없으니, <b>저울로 잰 질량</b>에서 몰수를 알아내야 해요. <b>통합과학</b>에서 배운 <b>원자량</b>이 열쇠예요.</div>' +
        '<p>탄소 원자 6.02×10²³개(1 mol)의 질량이 <b>12 g</b>이에요. 그래서 원자량 12인 탄소의 <b>몰질량은 12 g/mol</b>이에요. 원자 카드를 모아 분자와 화합물의 몰질량을 구해 봐요.</p>',
      features: ['find'],
      setup() { S.gate = ''; resetFind(); setScene('find'); },
      recap: '몰질량(g/mol)은 물질 1 mol의 질량이에요. 원자량·분자량·화학식량의 숫자에 g/mol을 붙인 값이고, 분자와 화합물은 구성 원자의 원자량을 개수만큼 더해서 구해요.',
      summary: '<ul><li><b>몰질량</b> = 물질 1 mol의 질량 (단위 g/mol). 숫자는 원자량 · 분자량 · 화학식량과 같아요.</li><li>기준: 탄소 12 g = 1 mol (탄소 원자 6.02×10²³개)</li><li>H<sub>2</sub>O = 2×1 + 16 = <b>18</b> g/mol, CO<sub>2</sub> = 12 + 2×16 = <b>44</b> g/mol, NaCl = 23 + 35.5 = <b>58.5</b> g/mol</li><li>CaCl<sub>2</sub> = 40 + 2×35.5 = <b>111</b> g/mol (Cl이 2개이므로 2×35.5)</li></ul>',
      missions: [
        {
          title: '물 · 이산화 탄소 · 염화 나트륨의 몰질량',
          goal: '원자 카드를 접시에 모아 <b>H₂O · CO₂ · NaCl</b>을 차례로 만들고 몰질량을 구하세요.',
          hint: '화학식의 작은 숫자가 원자 개수예요. 예) H₂O는 H 2개와 O 1개. 접시의 원자를 누르면 빠져요. 위의 물질 단추로 바꿔요.',
          setup() { S.gate = ''; resetFind(); setScene('find'); },
          check: () => ['h2o', 'co2', 'nacl'].every((id) => S.fd.solved[id]), hold: 0.6,
          status: () => ['h2o', 'co2', 'nacl'].map((id) => mark(S.fd.solved[id]) + ' ' + CMPS.find((c) => c.id === id).f + (S.fd.solved[id] ? ' = ' + fm(CMPS.find((c) => c.id === id).M) + ' g/mol' : '')).join(' &nbsp; '),
          explain: '물은 <b>2×1 + 16 = 18 g/mol</b>, 이산화 탄소는 <b>12 + 2×16 = 44 g/mol</b>, 염화 나트륨은 <b>23 + 35.5 = 58.5 g/mol</b>이에요. 원자량의 숫자에 g/mol을 붙이면 몰질량이 돼요.',
        },
        {
          type: 'quiz', title: '염화 칼슘 CaCl₂의 몰질량',
          goal: '염화 칼슘 <b>CaCl₂</b>의 몰질량(Ca 40, Cl 35.5)을 구하는 식은?',
          setup() { S.gate = ''; S.fd.cmp = 3; S.fd.tray = []; lastMatch = ''; setScene('find'); },
          choices: ['40 + 35.5 = 75.5', '40 + 2 × 35.5 = 111', '2 × 40 + 35.5 = 115.5', '40 × 35.5 = 1420'],
          answer: 1,
          feedback: ['Cl 원자가 2개 들어 있어요. 화학식 CaCl₂의 아래 숫자 2를 확인해 보세요.', '', '2개인 것은 Ca가 아니라 Cl이에요.', '몰질량은 원자량을 곱하지 않고 개수만큼 더해요.'],
          explain: 'CaCl₂에는 Ca 1개와 Cl 2개가 있어서 40 + 2 × 35.5 = <b>111 g/mol</b>이에요. 화학식 속 원자의 <b>개수</b>를 곱해서 더해요.',
        },
      ],
    },
    {
      title: '몰수만큼 달기: 가상 저울', short: '몰수만큼 달기', icon: '⚖️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 몰질량은 1 mol의 질량이라는 것을 알았어요. 그러면 <b>0.5 mol</b>이나 <b>2 mol</b>은 몇 g일까요?</div>' +
        '<p>질량 <b>w = n × M</b>이에요. 물질과 몰수를 고르고 목표 질량을 <b>계산</b>해서, 약숟가락으로 덜어 저울의 눈금을 <b>±0.1 g</b> 안으로 맞춰 봐요.</p>',
      features: ['weigh'],
      setup() { S.gate = ''; S.wg.rec = {}; S.wg.last = ''; S.wg.sub = 0; S.wg.amt = 2; wgReset(); setScene('weigh'); },
      recap: '물질의 질량 w = 몰수 n × 몰질량 M이에요. 1 mol의 질량은 물질마다 달라요. 입자 하나의 질량이 다르기 때문이에요.',
      summary: '<ul><li><b>w = n × M</b>: 철 0.5 mol = 0.5 × 56 = 28 g, 구리 2 mol = 2 × 64 = 128 g, 탄산 칼슘 0.25 mol = 25 g</li><li>1 mol의 질량: 철 56 g, 물 18 g, 소금 58.5 g. <b>같은 1 mol, 다른 질량</b></li><li>1 mol에는 어떤 물질이든 입자가 6.02×10²³개 있어요. 입자 1개의 질량이 달라서 1 mol의 질량이 달라요.</li></ul>',
      missions: [
        {
          title: '서로 다른 물질 3가지의 1 mol 달기',
          goal: '<b>서로 다른 물질 3가지</b>를 각각 <b>1 mol</b>씩 달아 저울의 눈금을 목표 질량 <b>±0.1 g</b>에 맞추세요.',
          hint: '물질과 1 mol을 고르고 몰질량 표의 값을 써서 w = 1 × M을 계산해요. 슬라이더로 가까이 맞추고 ±0.1, ±1 단추로 다듬어요. 눈금이 잠시 머물면 기록돼요.',
          setup() { S.gate = ''; S.wg.rec = {}; S.wg.last = ''; S.wg.amt = 2; wgReset(); setScene('weigh'); },
          check: () => molDone() >= 3, hold: 0.4,
          status: () => '1 mol 달기 ' + molDone() + ' / 3 &nbsp; ' + WS.map((w) => (S.wg.rec[w.id + '-1'] ? '✅' + w.f : '⬜' + w.f)).join(' '),
          explain: '철 1 mol은 <b>56 g</b>, 구리는 <b>64 g</b>, 물은 <b>18 g</b>, 소금은 <b>58.5 g</b>, 탄산 칼슘은 <b>100 g</b>이에요. 모두 입자가 6.02×10²³개씩 들어 있지만 질량은 달라요.',
        },
        {
          type: 'quiz', title: '1 mol의 질량이 다른 까닭',
          goal: '같은 1 mol인데 철(56 g)과 물(18 g)의 <b>질량이 다른 까닭</b>은?',
          setup() { S.gate = ''; setScene('weigh'); },
          choices: ['철에는 입자가 더 많이 들어 있기 때문이에요', '입자 하나의 질량이 서로 다르기 때문이에요', '저울의 오차 때문이에요', '철은 고체이고 물은 액체이기 때문이에요'],
          answer: 1,
          feedback: ['1 mol에는 어떤 물질이든 입자가 6.02×10²³개로 같아요.', '', '저울의 오차는 ±0.1 g 정도로 작아서 38 g의 차이를 설명하지 못해요.', '상태가 아니라 입자의 종류가 질량을 정해요. 고체인 철과 구리도 1 mol의 질량이 달라요.'],
          explain: '1 mol에는 입자가 <b>6.02×10²³개</b>로 같지만 철 원자 1개는 물 분자 1개보다 훨씬 무거워요. 그래서 <b>1 mol의 질량(몰질량)</b>이 달라요.',
        },
      ],
    },
    {
      title: '질량 · 몰 · 수: 몰질량으로 잇기', short: '질량·몰·수', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질량 = 몰수 × 몰질량임을 확인했어요. 거꾸로 <b>질량에서 몰수</b>를 알아내고, 입자 수까지 이어 봐요.</div>' +
        '<p><b>n = w ÷ M</b>이에요. 같은 18 g이라도 물질마다 몰수가 달라요. 그리고 <b>질량 → 몰 → 입자 수</b> 순서로 3단계 계산을 해 봐요.</p>',
      features: ['analyze'],
      setup() { S.gate = ''; S.sub.analyze = 'compare'; setScene('analyze'); },
      recap: '몰질량이 다르면 같은 질량에도 몰수가 달라요. 질량을 몰수로 바꾼 뒤(÷ 몰질량) 입자 수로 바꿀 수 있어요(× 6.02×10²³).',
      summary: '<ul><li>n = w ÷ M. 18 g의 몰수: ' + rwEx + '</li><li>같은 질량이라도 몰질량이 작을수록 몰수가 커요. <b>같은 질량 ≠ 같은 몰수</b></li><li>질량 → 몰 → 입자 수: H<sub>2</sub>SO<sub>4</sub> 49 g ÷ 98 = <b>0.5 mol</b> → 분자 0.5 × 6.02×10²³ = <b>3.01×10²³개</b> → O 원자 0.5 × 4 = <b>2.0 mol</b></li></ul>',
      missions: [
        {
          title: '같은 18 g의 몰수 구하기', manual: true,
          goal: '물질 <b>5가지</b>를 각각 <b>18 g</b>씩 달았어요. 몰수를 구해 <b>소수 둘째 자리</b>까지 쓰고 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'n = 18 ÷ M이에요. 물 18 ÷ 18 = 1.00, 마그네슘 18 ÷ 24 = 0.75예요. 몰질량은 그림 옆에 있어요. 맞으면 막대가 채워져요.',
          setup() { S.gate = ''; S.sub.analyze = 'compare'; resetCmp(); setScene('analyze'); },
          check() {
            const bad = RW.filter((r, i) => !S.an.ok[i]);
            if (!bad.length) return true;
            const first = bad[0], i = RW.indexOf(first);
            return isNaN(S.an.val[i]) ? first.f + '의 몰수를 써 주세요. (' + bad.length + '칸 남았어요)' : first.f + '의 몰수를 다시 계산해 보세요. 18 ÷ ' + fm(first.M) + '이에요.';
          },
          status: () => '맞힌 물질 ' + S.an.ok.filter(Boolean).length + ' / ' + RW.length + ' &nbsp; ' + S.an.ok.map((o) => mark(o)).join(''),
          explain: '같은 18 g이라도 <b>' + rwEx + '</b>예요. 몰질량이 작은 물은 입자가 가장 많아요. 몰수는 질량을 몰질량으로 나눈 값이라서 질량만으로는 입자 수를 비교할 수 없어요.',
        },
        {
          title: '질량 → 몰 → 입자 수 3단 계산',
          goal: '<b>H₂SO₄ 49 g</b>에서 시작해 <b>몰수 → 분자 수 → 산소 원자의 몰수</b>를 차례로 구하세요.',
          hint: '① 49 ÷ 98 = 몰수. ② 몰수 × 6.02 (×10²³개). ③ 황산 분자 1개에 O 원자가 4개이므로 몰수 × 4예요.',
          setup() { S.gate = ''; S.sub.analyze = 'chain'; resetChain(); setScene('analyze'); },
          check: () => S.an.ch.every(Boolean), hold: 0.6,
          status: () => '① 몰수 ' + mark(S.an.ch[0]) + ' &nbsp; ② 분자 수 ' + mark(S.an.ch[1]) + ' &nbsp; ③ 산소 원자 ' + mark(S.an.ch[2]),
          explain: 'H₂SO₄의 몰질량은 98 g/mol이라서 49 g은 <b>0.5 mol</b>이에요. 분자 수는 0.5 × 6.02×10²³ = <b>3.01×10²³개</b>, 분자 1개에 O 원자가 4개이므로 O 원자는 0.5 × 4 = <b>2.0 mol</b>이에요.',
        },
        {
          type: 'quiz', title: '같은 질량이면 같은 몰수?',
          goal: '철 18 g과 물 18 g에 들어 있는 <b>입자 수</b>에 대한 설명으로 알맞은 것은?',
          setup() { S.gate = ''; S.sub.analyze = 'compare'; setScene('analyze'); },
          choices: ['질량이 같으므로 입자 수도 같아요', '몰질량이 작은 물이 입자 수가 더 많아요', '몰질량이 큰 철이 입자 수가 더 많아요', '입자 수는 질량으로 알 수 없어요'],
          answer: 1,
          feedback: ['같은 질량이어도 몰질량이 다르면 몰수가 달라서 입자 수도 달라요.', '', '몰수 n = w ÷ M이라서 M이 클수록 몰수가 작아요.', '질량과 몰질량을 알면 n = w ÷ M으로 입자 수를 구할 수 있어요.'],
          explain: '철 18 g은 ' + fm(18 / 56, 2) + ' mol, 물 18 g은 <b>1.00 mol</b>이에요. 몰질량이 작은 물이 몰수도, 입자 수도 더 많아요.',
        },
      ],
    },
    {
      title: '계산 도전: 일상 속 입자 수', short: '계산 도전', icon: '🧮', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질량 → 몰 → 입자 수로 이어 가는 3단계 계산을 해 봤어요. 이제 <b>일상 속 양</b>에 적용해요.</div>' +
        '<p>설탕 한 스푼, 소금 한 꼬집에는 입자가 몇 개 들어 있을까요? 문제마다 <b>계산 방법</b>을 골라 몰수를 구하고, 입자 수까지 구해 봐요.</p>',
      features: ['apply'],
      setup() { S.gate = ''; S.ap.prob = 0; resetApply(); setScene('apply'); },
      recap: '질량을 몰질량으로 나누면 몰수, 몰수에 6.02×10²³을 곱하면 입자 수예요. 작은 양에도 입자는 아주 많이 들어 있어요.',
      summary: '<ul><li>설탕 한 스푼 3.42 g (C<sub>12</sub>H<sub>22</sub>O<sub>11</sub> = 342 g/mol) → <b>0.0100 mol</b> → 분자 <b>6.02×10²¹개</b></li><li>소금 한 꼬집 0.585 g (NaCl = 58.5 g/mol) → <b>0.0100 mol</b> → Na<sup>+</sup> <b>6.02×10²¹개</b></li><li><b>몰질량</b>(g/mol)은 1 mol의 질량으로 단위가 있고, <b>화학식량</b>은 상대 질량이라 단위가 없어요. 숫자는 같아요.</li></ul>',
      missions: [
        {
          title: '설탕 · 소금 한 스푼의 입자 수',
          goal: '<b>문제 2개 이상</b>을 풀어요. ① 질량 → 몰수 ② 몰수 → 입자 수의 <b>계산 방법을 고르고</b> 값을 써서 <b>✔ 계산 확인</b>을 눌러요.',
          hint: '① 몰질량으로 나눠요(÷ 몰질량). ② 6.02×10²³을 곱해요. ×10의 지수는 이미 정해져 있어서 앞 수만 써요. 몰질량은 위의 그림에 있어요.',
          setup() { S.gate = ''; S.ap.prob = 0; resetApply(); setScene('apply'); },
          check: () => apSolved() >= 2, hold: 0.5,
          status: () => '푼 문제 ' + apSolved() + ' / 2 &nbsp; ' + PB.map((p) => mark(S.ap.solved[p.id])).join(''),
          explain: '설탕 3.42 g ÷ 342 g/mol = <b>0.0100 mol</b>, 0.0100 × 6.02×10²³ = <b>6.02×10²¹개</b>예요. 소금 0.585 g ÷ 58.5 g/mol = 0.0100 mol이라서 Na⁺도 <b>6.02×10²¹개</b>예요.',
        },
        {
          type: 'quiz', title: '몰질량과 화학식량',
          goal: '<b>몰질량</b>과 <b>화학식량</b>의 차이로 알맞은 것은?',
          setup() { S.gate = ''; setScene('apply'); },
          choices: ['몰질량은 단위가 g/mol이고, 화학식량은 상대적인 질량이라 단위가 없어요 (숫자는 같아요)', '몰질량과 화학식량은 숫자도 달라요', '몰질량은 입자 1개의 질량이에요', '화학식량은 1 mol의 질량이에요'],
          answer: 0,
          feedback: ['', 'NaCl의 화학식량은 58.5이고 몰질량은 58.5 g/mol이에요. 숫자는 같고 단위만 달라요.', '입자 1개가 아니라 입자 6.02×10²³개(1 mol)의 질량이에요.', '1 mol의 질량은 몰질량이에요. 화학식량은 단위 없는 상대 질량이에요.'],
          explain: '화학식량은 탄소-12를 기준으로 한 <b>상대 질량</b>이라 단위가 없고, 몰질량은 그 숫자에 <b>g/mol</b>을 붙인 <b>1 mol의 질량</b>이에요. 예) NaCl: 화학식량 58.5, 몰질량 58.5 g/mol.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-molar-mass', mount: '#game', badge: '몰질량 박사', homeHref: '../../index.html#hc',
    featureLabels: { find: '⚛️ 원자 카드 · 접시 · 질량 막대', weigh: '⚖️ 가상 저울 · 몰질량 표', analyze: '📊 같은 18 g 비교 · 3단 계산', apply: '🧮 일상 속 입자 수 계산' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildCmpInputs(); apFormReset();
  setScene(S.mode);
  function stepAll1(dt) {
    S.an.shake = Math.max(0, S.an.shake - dt); S.ap.shake = Math.max(0, S.ap.shake - dt);
    stepFind(dt); stepWeigh(dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'find') drawFind(t); else if (S.mode === 'weigh') drawWeigh(t); else if (S.mode === 'analyze') { if (S.sub.analyze === 'compare') drawCompare(t); else drawChain(t); } else drawApply(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, EL, CMPS, WS, RW, PB, H2SO4, ATOMS, get game() { return game; },
    setScene, palRect, slotPos, setMass, tgtMass, wgOK, matches, apCheck, chainEval, cmpEval, TR_IN, sci, fm,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
