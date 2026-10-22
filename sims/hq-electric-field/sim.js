/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 점전하의 전기장 (단원 1차시)
   성취기준 [12전자01-01] 전하 주위의 전기장을 정량적으로 구하고, 전기력선과 등전위면으로부터 전기장의 세기와 방향을 추리할 수 있다.
   ① 관찰: 전기력 (쿨롱 법칙 F = k q1 q2 / r², 표 만들기)
   ② 모형: 전기장 (시험 전하 q′, E = F/q′ = kq/r², F = q′E)
   ③ 탐구: 거리 관계 (E–r 그래프, E·r² 일정)
   ④ 적용: 전기장의 합 (벡터 합, E = 0인 점, 잉크젯 프린터)
   전기력선·등전위면은 다음 차시, 연속 전하 분포·가우스 법칙은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function sceneBg(y1) {
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);          // 매 프레임 전체를 다시 칠해요 (그림자가 쌓이지 않게)
    const g = ctx.createLinearGradient(0, 0, 0, y1 || VH); g.addColorStop(0, '#eaf1fb'); g.addColorStop(1, '#f7f9fd');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, y1 || VH);
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  /* 라벨: 화면 밖으로 나가지 않게 가운데 x를 조절해서 그려요 */
  function lbl(x, y, text, o) {
    o = o || {}; const size = o.size || (PHONE ? 12 : 13), pad = 8;
    ctx.save(); ctx.font = D.font(size, 800); const w = ctx.measureText(text).width + pad * 2; ctx.restore();
    const cx = clamp(x, 4 + w / 2, VW - 4 - w / 2);
    return D.label(cx, y, text, Object.assign({ bg: 'rgba(255,255,255,.95)', size }, o));
  }
  const SUPM = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  const sup = (n) => String(n).replace(/[0-9-]/g, (c) => SUPM[c]);
  function sci(x, d) {
    if (!x || !isFinite(x)) return '0';
    d = d == null ? 1 : d;
    const sg = x < 0 ? '−' : ''; x = Math.abs(x) * (1 + 1e-12);
    let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    m = Number(m.toFixed(d)); if (m >= 10) { m /= 10; e++; }
    return sg + m.toFixed(d) + '×10' + sup(e);
  }
  const f3 = (x) => (x >= 1000 || (x > 0 && x < 0.001) ? sci(x, 2) : (x * (1 + 1e-12)).toPrecision(3));                // 세 자리 유효숫자 (표·판독기·본문 모두 같은 규칙)
  const POS = '#e2464b', NEG = '#2f6df6', COL_E = '#2563eb', COL_F = '#f26b3a', COL_S = '#7c3aed', COL_E2 = '#0d9488';
  const sgnStr = (v) => (v > 0 ? '+' : '−');

  /* ---------- 물리 상수 · 배치 ---------- */
  const K = 9.0e9;                                       // N·m²/C²
  const Fcalc = (qa, qb, r) => K * (qa * 1e-6) * (qb * 1e-6) / (r * r);   // 전하량은 μC
  // ① 전기력
  const AX0 = PHONE ? 70 : 150, PXM = PHONE ? 300 : 500;
  const AY = PHONE ? 132 : 142, YA = PHONE ? 84 : 84, YB = PHONE ? 180 : 200;
  const rcOf = PHONE ? (q) => 5 + 1.4 * q : (q) => 8 + 2.6 * q;
  const ALEN = (F) => (PHONE ? 15 + 17 * Math.log10(F / 1e-3) : 22 + 24 * Math.log10(F / 1e-3));   // 힘의 크기를 로그 눈금으로 줄여 그린 길이
  const ROWS = [[2, 2, 0.2], [2, 2, 0.4], [2, 2, 0.8], [0.5, 2, 0.4], [1, 2, 0.4], [4, 2, 0.4]].map((r) => ({ qa: r[0], qb: r[1], r: r[2], F: null, flash: 0 }));
  const TB_Y = PHONE ? 308 : 326, TB_H = PHONE ? 36 : 28, TB_RH = PHONE ? 38 : 30;
  // ② 전기장
  const R2 = { y0: 44, y1: PHONE ? 420 : 372, cx: VW / 2, pxm: PHONE ? 200 : 330 };
  R2.cy = (R2.y0 + R2.y1) / 2 + (PHONE ? 6 : 2);
  const RINGS = [0.15, 0.3, 0.6];
  const QR2 = PHONE ? 10 : 16, PR2 = PHONE ? 8 : 11;
  const E_LPX = PHONE ? 38 : 62, E_LMAX = PHONE ? 110 : 170;      // 1.0×10⁵ N/C당 화살표 길이, 최대 길이
  // ③ 그래프
  const G = PHONE ? { x0: 56, x1: 456, y0: 66, y1: 256 } : { x0: 76, x1: 504, y0: 68, y1: 300 };
  const GEMAX = 20;                                         // 세로축 최대 (×10⁵ N/C)
  const GQ = { 1: '#e2464b', 2: '#8b5cf6', '-1': '#2f6df6' };
  const ST = PHONE ? { x0: 50, sc: 360, y: 552, top: 468 } : { x0: 70, sc: 600, y: 440, top: 350 };   // 아래 측정 줄
  // ④ 전기장 합
  const SPX = PHONE ? 320 : 400;
  const SO = PHONE ? { x: 144, y: 290 } : { x: 242, y: 330 };
  const SPN_Y = PHONE ? 440 : 426;
  const sx = (x) => SO.x + x * SPX, sy = (y) => SO.y - y * SPX;
  const seScale = () => (S.f4.pre === 'a' ? (PHONE ? 16 : 30) : (PHONE ? 60 : 88));     // 1.0×10⁵ N/C당 화살표 길이(px)
  const SE_LMAX = PHONE ? 100 : 150;
  const PRE = {
    a: { ch: [{ x: 0, y: 0, q: 2e-6 }, { x: 0.6, y: 0, q: 8e-6 }] },
    b: { ch: [{ x: -0.3, y: 0, q: 2e-6 }, { x: 0.3, y: 0, q: 2e-6 }], P: { x: 0, y: 0.4 } },
    c: { ch: [{ x: -0.3, y: 0, q: 2e-6 }, { x: 0.3, y: 0, q: -2e-6 }], P: { x: 0, y: 0.4 } },
  };
  const INK = PHONE ? { xs: 36, xi: 150, xo: 290, xp: 420, yc: 300, gap: 64, du: 5 } : { xs: 60, xi: 250, xo: 450, xp: 700, yc: 230, gap: 108, du: 8 };
  function evec(c, P) {
    const dx = P.x - c.x, dy = P.y - c.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2), E = K * Math.abs(c.q) / r2, s = Math.sign(c.q);
    return { x: s * E * dx / r, y: s * E * dy / r, m: E, r };
  }
  function netAt(pre, P) {
    const vs = PRE[pre].ch.map((c) => evec(c, P));
    return { vs, x: vs[0].x + vs[1].x, y: vs[0].y + vs[1].y };
  }
  function dirWord(v) {
    if (Math.hypot(v.x, v.y) < 1e3) return '없음 (0)';
    return Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? '오른쪽(+x)' : '왼쪽(−x)') : (v.y > 0 ? '위쪽(+y)' : '아래쪽(−y)');
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'force', t: 0, fade: 0, gate: '',
    f1: { qa: 2, qb: 3, r: 0.3, la: 0, lb: 0, drag: false, hov: false, done: false, seenDrag: false },
    f2: { q: 1, qp: 2, has: true, px: 0, py: 0, fly: 1, flyFrom: { x: 0, y: 0 }, drag: false, pulse: 0, la: 0, lf: 0, log: { x: -999, y: -999, seen: {} }, ghostT: 0, tw: null },
    f3: { q: 1, r: 0.3, pts: { 1: [], 2: [], '-1': [] }, curveT: { 1: 0, 2: 0, '-1': 0 }, shown: false, firstDone: false },
    f4: { pre: 'a', px: 0.3, sumT: 1, tw: null, drag: false, ink: { q: 1, drops: [], dots: [] }, seenZero: false, seenPre: { a: true } },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { force: '⚡ 전기력', field: '🧭 전기장', graph: '📈 거리 관계', sum: '➕ 전기장 합' };
  const round2 = (v) => Math.round(v * 100) / 100;

  /* ---------- 숫자 입력 상자 (계수 × 10의 거듭제곱) ---------- */
  function makeNum(host, q, pre, unit, defExp) {
    const row = document.createElement('div'); row.className = 'numrow';
    const exps = []; for (let e = -12; e <= 12; e++) exps.push('<option value="' + e + '"' + (e === (defExp || 0) ? ' selected' : '') + '>10' + sup(e) + '</option>');
    row.innerHTML = '<div class="q">' + q + '</div><span class="pre">' + pre + '</span>' +
      '<input class="num-in" type="number" step="any" inputmode="decimal" aria-label="' + q.replace(/<[^>]+>/g, '') + ' 계수">' +
      '<span class="pre">×</span><select class="num-in" aria-label="10의 거듭제곱">' + exps.join('') + '</select><span class="unit">' + unit + '</span>';
    host.appendChild(row);
    const inp = row.querySelector('input'), sel = row.querySelector('select');
    const h = {
      row, inp, sel, st: null,
      val() { const s = inp.value.trim().replace(',', '.'); if (s === '' || isNaN(+s)) return NaN; return +s * Math.pow(10, +sel.value); },
      clear() { inp.value = ''; sel.value = String(defExp || 0); inp.classList.remove('ok', 'bad'); sel.classList.remove('ok', 'bad'); h.st = null; },
      mark(ok) {
        if (h.st === ok) return; h.st = ok;
        [inp, sel].forEach((n) => { n.classList.remove('ok', 'bad'); if (ok === false) { void n.offsetWidth; n.classList.add('bad'); } else if (ok) n.classList.add('ok'); });
      },
    };
    [inp, sel].forEach((n) => n.addEventListener('input', () => { h.st = null; inp.classList.remove('ok', 'bad'); sel.classList.remove('ok', 'bad'); }));
    return h;
  }
  function numOK(h, target, tol) {
    const v = h.val();
    if (isNaN(v)) return null;
    return Math.abs(v - target) <= tol * Math.abs(target);
  }

  /* ================= 공통 UI ================= */
  function setScene(mode) {
    if (S.mode !== mode) {
      S.fade = 1; parts.clear();
      if (S.f2.tw) { S.f2.tw.cancel(); S.f2.tw = null; }
      if (S.f4.tw) { S.f4.tw.cancel(); S.f4.tw = null; }
      S.f1.drag = false; S.f2.drag = false; S.f4.drag = false;
      S.f4.ink.drops.length = 0;
    }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'sum') startSum(S.f4.pre);
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) { const sub = n.getAttribute('data-sub'), p = S.f4.pre; on = sub === 'bc' ? (p === 'b' || p === 'c') : sub === p; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const f1 = S.f1;
    setRange('sQa', f1.qa, 0.5, 5, (v) => v.toFixed(1) + ' μC'); setRange('sQb', f1.qb, 0.5, 5, (v) => v.toFixed(1) + ' μC');
    setRange('sR', f1.r, 0.1, 1, (v) => v.toFixed(2) + ' m');
    $('#sQaM').disabled = f1.qa <= 0.5; $('#sQaP').disabled = f1.qa >= 5; $('#sQbM').disabled = f1.qb <= 0.5; $('#sQbP').disabled = f1.qb >= 5;
    $('#sRM').disabled = f1.r <= 0.1 + 1e-9; $('#sRP').disabled = f1.r >= 1 - 1e-9;
    const f2 = S.f2;
    $$('#qSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === f2.q));
    $$('#qpSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === f2.qp));
    $('#bGhost').textContent = f2.has ? '👻 시험 전하 치우기' : '🟡 시험 전하 다시 놓기';
    const f3 = S.f3;
    $$('#gqSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === f3.q));
    setRange('sG', f3.r, 0.1, 1, (v) => v.toFixed(2) + ' m');
    $('#sGM').disabled = f3.r <= 0.1 + 1e-9; $('#sGP').disabled = f3.r >= 1 - 1e-9;
    const f4 = S.f4;
    $$('#preSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === f4.pre));
    $$('#inkSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === f4.ink.q));
    const sp = $('#sPx'); if (Math.abs(+sp.value - f4.px) > 1e-6) sp.value = f4.px;
    sp.style.setProperty('--pct', ((f4.px + 0.35) / 1.3 * 100) + '%'); $('#oPx').textContent = f4.px.toFixed(2) + ' m';
    $('#pxM').disabled = f4.px <= -0.35 + 1e-9; $('#pxP').disabled = f4.px >= 0.95 - 1e-9;
    $('#bGhost').disabled = false;
  }
  function setRange(id, v, mn, mx, fmt) {
    const s = $('#' + id); if (!s) return;
    if (Math.abs(+s.value - v) > 1e-9) s.value = v;
    s.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%');
    const o = s.parentElement.parentElement.querySelector('output'); if (o) o.textContent = fmt(v);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function bindSlider(id, get, set, step, mn, mx) {
    const s = $('#' + id);
    s.addEventListener('input', () => { set(+s.value); updateCtl(); Sound.tick(); });
    $('#' + id + 'M').addEventListener('click', () => { Sound.click(); set(clamp(Math.round((get() - step) * 1000) / 1000, mn, mx)); updateCtl(); });
    $('#' + id + 'P').addEventListener('click', () => { Sound.click(); set(clamp(Math.round((get() + step) * 1000) / 1000, mn, mx)); updateCtl(); });
  }
  const q1 = (v) => Math.round(v * 10) / 10;
  bindSlider('sQa', () => S.f1.qa, (v) => { S.f1.qa = q1(v); }, 0.5, 0.5, 5);
  bindSlider('sQb', () => S.f1.qb, (v) => { S.f1.qb = q1(v); }, 0.5, 0.5, 5);
  bindSlider('sR', () => S.f1.r, (v) => { S.f1.r = round2(v); }, 0.05, 0.1, 1);
  bindSlider('sG', () => S.f3.r, (v) => { S.f3.r = round2(v); }, 0.05, 0.1, 1);

  /* ================= ① 전기력 ================= */
  const masked1 = () => S.gate === 'num1';
  const curF = () => Fcalc(S.f1.qa, S.f1.qb, S.f1.r);
  function rowMatch(i) { const w = ROWS[i], f = S.f1; return Math.abs(f.qa - w.qa) < 1e-6 && Math.abs(f.qb - w.qb) < 1e-6 && Math.abs(f.r - w.r) < 1e-6; }
  const activeRow = () => ROWS.findIndex((w, i) => rowMatch(i));
  const rowsDone = () => ROWS.filter((w) => w.F != null).length;
  function resetRows() { ROWS.forEach((w) => { w.F = null; w.flash = 0; }); S.f1.done = false; }
  function recordRow() {
    const i = activeRow();
    if (i < 0) { showHint('표의 한 줄과 같은 값(A, B, 거리)으로 맞춘 뒤 기록해요.'); Sound.fail(); return; }
    if (ROWS[i].F != null) { showHint('이 줄은 이미 기록했어요. 다른 줄을 채워 보세요.'); return; }
    ROWS[i].F = Fcalc(ROWS[i].qa, ROWS[i].qb, ROWS[i].r); ROWS[i].flash = 1; Sound.success();
    const y = TB_Y + TB_H + i * TB_RH + TB_RH / 2;
    parts.burst(PHONE ? 380 : 700, y, { count: 10, speed: 120, life: 0.6, size: 3 });
    if (rowsDone() === ROWS.length) S.f1.done = true;
  }
  $('#bRec').addEventListener('click', () => { Sound.click(); recordRow(); });
  const xAB = () => ({ a: AX0, b: AX0 + S.f1.r * PXM });
  function stepForce(dt) {
    const f = S.f1, F = curF(), L = ALEN(F), x = xAB();
    f.la = SciSim.approach(f.la, -L, dt, 12); f.lb = SciSim.approach(f.lb, L, dt, 12);
    ROWS.forEach((w) => { if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 1.4); });
  }
  function drawForce() {
    sceneBg(PHONE ? 300 : 318);
    const f = S.f1, x = xAB(), F = curF(), mk = masked1();
    T(14, 26, '⚡ 두 전하 사이에 작용하는 전기력', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 44 : 47, '전하 B를 끌거나 슬라이더로 값을 바꿔요 (화살표는 로그 눈금으로 줄여 그렸어요)', PHONE ? 11.5 : 13, '#5a6679', 'left', 700);
    ctx.save(); ctx.strokeStyle = 'rgba(120,135,160,.4)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(14, AY); ctx.lineTo(VW - 14, AY); ctx.stroke(); ctx.restore();
    const ra = rcOf(f.qa), rb = rcOf(f.qb);
    // 힘 화살표 (반발: A는 왼쪽, B는 오른쪽)
    ctx.strokeStyle = 'rgba(242,107,58,.5)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(x.a, AY - ra); ctx.lineTo(x.a, YA); ctx.moveTo(x.b, AY + rb); ctx.lineTo(x.b, YB); ctx.stroke(); ctx.setLineDash([]);
    const ftxt = mk ? '?' : f3(F) + ' N';
    D.arrow(x.a, YA, x.a + f.la, YA, { color: COL_F, width: 5, head: 13 });
    D.arrow(x.b, YB, x.b + f.lb, YB, { color: COL_F, width: 5, head: 13 });
    lbl(x.a + f.la / 2, YA - 17, 'A가 받는 힘 ' + ftxt, { color: '#9a3412', border: '#f6b08a' });
    lbl(x.b + f.lb / 2, YB + 18, 'B가 받는 힘 ' + ftxt, { color: '#9a3412', border: '#f6b08a' });
    D.sphere(x.a, AY, ra, POS, { shadow: true, text: '+' });
    D.sphere(x.b, AY, rb, POS, { shadow: !f.drag, text: '+' });
    if (f.drag) { ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x.b, AY, rb + 5, 0, TAU); ctx.stroke(); ctx.restore(); }
    T(x.a, AY - ra - 6, 'A ' + f.qa.toFixed(1) + ' μC', PHONE ? 11.5 : 13, '#26324a', 'center', 800);
    T(x.b, AY - rb - 6, 'B ' + f.qb.toFixed(1) + ' μC', PHONE ? 11.5 : 13, '#26324a', 'center', 800);
    // 거리 자
    const ry = PHONE ? 214 : 236;
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x.a, ry); ctx.lineTo(AX0 + PXM, ry); ctx.stroke();
    for (let u = 0; u <= 10; u++) { const xx = AX0 + u * PXM / 10; ctx.beginPath(); ctx.moveTo(xx, ry - (u % 5 ? 4 : 7)); ctx.lineTo(xx, ry + (u % 5 ? 4 : 7)); ctx.stroke(); }
    [0, 0.5, 1].forEach((u) => T(AX0 + u * PXM, ry + 22, u.toFixed(u === 0.5 ? 1 : 0) + ' m', PHONE ? 11 : 12, '#516079', 'center', 700));
    ctx.strokeStyle = COL_F; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x.a, ry); ctx.lineTo(x.b, ry); ctx.stroke();
    D.sphere(x.b, ry, 6, COL_F, { gloss: false });
    lbl((x.a + x.b) / 2, ry - 18, 'r = ' + f.r.toFixed(2) + ' m', { bg: '#516079', color: '#fff' });
    if (!f.hov && !f.seenDrag && S.t > 1.2) { D.arrow(x.b + rb + 34, AY + 34, x.b + rb + 8, AY + 8, { color: COL_F, width: 3 }); }
    // 식 알림 띠
    const sy0 = PHONE ? 246 : 270, sh = PHONE ? 50 : 44;
    D.roundRect(12, sy0, VW - 24, sh, 12); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    if (S.f1.done || (game && game.free)) {
      T(24, sy0 + (PHONE ? 20 : 19), 'F = k·qA·qB / r²', PHONE ? 15 : 17, '#9a3412', 'left', 800);
      const sub = '= (9.0×10⁹)(' + sci(f.qa * 1e-6) + ')(' + sci(f.qb * 1e-6) + ') / (' + f.r.toFixed(2) + ')²' + (mk ? ' = ?' : ' = ' + f3(F) + ' N');
      T(24, sy0 + (PHONE ? 41 : 37), sub, PHONE ? 11.5 : 13.5, '#26324a', 'left', 800);
    } else {
      textBlock(24, sy0 + 20, VW - 48, '💭 떨어져 있는 전하들이 어떻게 힘을 주고받을까요? 먼저 전하량과 거리를 바꾸며 힘의 규칙을 찾아요. 답은 2단계에서 알아봐요.', PHONE ? 12 : 13.5, '#26324a', PHONE ? 16 : 17, 800);
    }
    drawTable();
  }
  function drawTable() {
    const x0 = 12, w = VW - 24, ai = activeRow(), n = rowsDone();
    panel(x0, TB_Y - 4, w, TB_H + 6 * TB_RH + 10, 14);
    const cols = PHONE ? [0.08, 0.3, 0.52, 0.74, 1.0] : [0.06, 0.22, 0.38, 0.54, 0.80];
    const hs = ['', 'A (μC)', 'B (μC)', 'r (m)', 'F (N)'];
    const cx = (i) => x0 + w * ((i === 0 ? 0 : cols[i - 1]) + cols[i]) / 2;
    hs.forEach((h, i) => { if (i === 0) T(cx(0), TB_Y + TB_H / 2 + 5, '줄', PHONE ? 12 : 13, '#5a6679', 'center', 800); else T(cx(i), TB_Y + TB_H / 2 + 5, h, PHONE ? 12.5 : 14, '#26324a', 'center', 800); });
    T(x0 + w - 12, TB_Y + TB_H / 2 + 5, '기록 ' + n + ' / 6', PHONE ? 12 : 13, n === 6 ? '#0b7a41' : '#9a3412', 'right', 800);
    ROWS.forEach((r, i) => {
      const y = TB_Y + TB_H + i * TB_RH;
      D.roundRect(x0 + 6, y + 2, w - 12, TB_RH - 4, 8);
      ctx.fillStyle = r.F != null ? C.mix('#e2f6eb', '#ffffff', 1 - r.flash) : i === ai ? '#fff4dc' : (i % 2 ? '#f7f9fd' : '#eef2fa'); ctx.fill();
      if (i === ai && r.F == null) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); }
      const ty = y + TB_RH / 2 + 5, sz = PHONE ? 13.5 : 15;
      T(cx(0), ty, String(i + 1), sz, '#5a6679', 'center', 800);
      T(cx(1), ty, r.qa.toFixed(1), sz, '#26324a', 'center', 800); T(cx(2), ty, r.qb.toFixed(1), sz, '#26324a', 'center', 800); T(cx(3), ty, r.r.toFixed(2), sz, '#26324a', 'center', 800);
      if (r.F != null) T(cx(4), ty, f3(r.F), sz, '#0b7a41', 'center', 800); else T(cx(4), ty, i === ai ? '← 기록하기' : '—', PHONE ? 12 : 13.5, i === ai ? '#9a3412' : '#9aa5b8', 'center', 800);
    });
  }

  /* ================= ② 전기장 ================= */
  const masked2 = () => S.gate === 'num2';
  const rpxOf = (r) => r * R2.pxm;
  function f2Geo() {
    const f = S.f2, dx = f.px - R2.cx, dy = f.py - R2.cy, rpx = Math.max(1e-6, Math.hypot(dx, dy));
    const r = Math.max(0.1, round2(rpx / R2.pxm));
    const q = f.q * 1e-6, E = K * Math.abs(q) / (r * r), s = Math.sign(q);
    const ux = s * dx / rpx, uy = s * dy / rpx;               // 전기장 방향 (단위 벡터)
    const qp = f.qp * 1e-9, F = Math.abs(qp) * E;
    return { dx, dy, rpx, r, q, E, ux, uy, qp, F, sF: Math.sign(qp) };
  }
  function placeProbe(x, y, fly) {
    const f = S.f2;
    let dx = x - R2.cx, dy = y - R2.cy, d = Math.hypot(dx, dy);
    if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
    let rp = Math.max(d, 0.1 * R2.pxm);
    for (const g of RINGS) { if (Math.abs(rp - g * R2.pxm) < 8) rp = g * R2.pxm; }
    let nx = R2.cx + dx / d * rp, ny = R2.cy + dy / d * rp;
    nx = clamp(nx, PR2 + 4, VW - PR2 - 4); ny = clamp(ny, R2.y0 + PR2 + 4, R2.y1 - PR2 - 4);
    // 가장자리로 밀려난 뒤에도 최소 거리를 지켜요
    const d2 = Math.hypot(nx - R2.cx, ny - R2.cy);
    if (d2 < 0.1 * R2.pxm - 1e-6) { nx = R2.cx + (nx - R2.cx) / d2 * 0.1 * R2.pxm; ny = R2.cy + (ny - R2.cy) / d2 * 0.1 * R2.pxm; }
    f.px = nx; f.py = ny;
  }
  function flyIn() { const f = S.f2; f.flyFrom = { x: 26, y: R2.y1 - 26 }; f.fly = 0; if (f.tw) f.tw.cancel(); f.tw = SciSim.tween(f, { fly: 1 }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic', onDone: () => { f.tw = null; } }); }
  function setQp(v) { const f = S.f2; f.qp = v; f.pulse = 1; if (!f.has) { f.has = true; flyIn(); } updateCtl(); }
  function setQ2(v) { S.f2.q = v; S.f2.pulse = 0.6; updateCtl(); }
  $$('#qSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setQ2(+b.dataset.v); }));
  $$('#qpSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setQp(+b.dataset.v); }));
  $('#bGhost').addEventListener('click', () => { Sound.click(); const f = S.f2; if (f.has) { f.has = false; f.ghostT = 0; } else { f.has = true; flyIn(); } updateCtl(); });
  function resetField(pos) {
    const f = S.f2; f.has = true; f.log = { x: -999, y: -999, seen: {} };
    const p = pos || { x: R2.cx + 0.3 * R2.pxm, y: R2.cy };
    placeProbe(p.x, p.y); f.la = 0; f.lf = 0; f.drag = false; flyIn();
  }
  function stepField(dt) {
    const f = S.f2, g = f2Geo();
    f.pulse = Math.max(0, f.pulse - dt * 2.2); f.ghostT += dt;
    const LE = Math.min(E_LMAX, g.E / 1e5 * E_LPX);
    f.la = SciSim.approach(f.la, LE, dt, 10);
    const full = Math.abs(g.qp * 1e9) * g.E / 1e5 * E_LPX;
    let lf = Math.min(E_LMAX, full);
    if (g.sF < 0) lf = Math.min(lf, Math.max(8, g.rpx - QR2 - PR2 - 10));
    f.lf = SciSim.approach(f.lf, f.has && f.fly > 0.98 ? lf : 0, dt, 10);
    // 같은 점에서 시험 전하만 바꿔 본 기록
    const lg = f.log;
    if (Math.hypot(f.px - lg.x, f.py - lg.y) > 2) { f.log = { x: f.px, y: f.py, seen: {} }; }
    if (f.has && !f.drag && f.fly > 0.98 && !(f.qp < 0)) f.log.seen[f.qp] = g.F / Math.abs(g.qp);
  }
  function mapArrows(R) {
    const stepPx = PHONE ? 44 : 48, f = S.f2, q = f.q * 1e-6, s = Math.sign(q);
    ctx.save(); ctx.beginPath(); ctx.rect(0, R.y0, VW, R.y1 - R.y0); ctx.clip();
    for (let y = R.y0 + stepPx / 2; y < R.y1; y += stepPx) {
      for (let x = stepPx / 2; x < VW; x += stepPx) {
        const dx = x - R.cx, dy = y - R.cy, d = Math.hypot(dx, dy);
        if (d < QR2 + 16) continue;
        const r = d / R.pxm, E = K * Math.abs(q) / (r * r), w = clamp((Math.log10(E) - 3.6) / 2.4, 0, 1);
        const ux = s * dx / d, uy = s * dy / d, a = 0.22 + 0.5 * w, L = 11;
        const wave = RM ? 1 : 0.8 + 0.2 * Math.sin(S.t * 2.2 - d / 38);
        ctx.strokeStyle = 'rgba(37,99,235,' + (a * wave).toFixed(3) + ')'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1 + 3.2 * w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - ux * L, y - uy * L); ctx.lineTo(x + ux * L - ux * 5, y + uy * L - uy * 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + ux * L, y + uy * L); ctx.lineTo(x + ux * (L - 8) - uy * (3 + 2 * w), y + uy * (L - 8) + ux * (3 + 2 * w)); ctx.lineTo(x + ux * (L - 8) + uy * (3 + 2 * w), y + uy * (L - 8) - ux * (3 + 2 * w)); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }
  function probeSphere(x, y, a) {
    const f = S.f2, sc = 1 + f.pulse * 0.25 + (f.drag ? 0.12 : 0);
    ctx.save(); ctx.globalAlpha = a; D.sphere(x, y, PR2 * sc, f.qp > 0 ? POS : NEG, { shadow: true, text: f.qp > 0 ? '+' : '−' });
    ctx.restore();
  }
  function drawField() {
    sceneBg(R2.y1 + 6);
    const f = S.f2, g = f2Geo(), R = R2;
    T(14, 26, '🧭 전하 q 주변의 전기장 — 시험 전하 q′를 끌어다 놓아요', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    // 지도 영역
    ctx.save(); ctx.beginPath(); ctx.rect(0, R.y0, VW, R.y1 - R.y0); ctx.clip();
    mapArrows(R);
    RINGS.forEach((rr) => {
      ctx.strokeStyle = 'rgba(100,116,139,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.arc(R.cx, R.cy, rr * R.pxm, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.restore();
    RINGS.forEach((rr) => {
      const a = -0.62, lx = R.cx + Math.cos(a) * rr * R.pxm, ly = R.cy + Math.sin(a) * rr * R.pxm;
      if (ly > R.y0 + 10) D.label(lx, ly, rr.toFixed(2) + ' m', { bg: 'rgba(100,116,139,.85)', size: PHONE ? 11 : 12, pad: 6 });
    });
    // 중심 전하
    D.glow(R.cx, R.cy, QR2 * 3, f.q > 0 ? POS : NEG, 0.35);
    D.sphere(R.cx, R.cy, QR2, f.q > 0 ? POS : NEG, { shadow: true, text: f.q > 0 ? '+' : '−' });
    T(R.cx, R.cy + QR2 + (PHONE ? 15 : 17), 'q = ' + (f.q > 0 ? '+' : '−') + '1.0 μC', PHONE ? 12 : 14, '#26324a', 'center', 800);
    // 시험 전하와 화살표
    let px = f.px, py = f.py;
    if (f.fly < 1) { const e = f.fly; px = f.flyFrom.x + (f.px - f.flyFrom.x) * e; py = f.flyFrom.y + (f.py - f.flyFrom.y) * e - Math.sin(e * Math.PI) * 40; }
    const nx = -g.uy, ny = g.ux;                        // 화살표 옆으로 비켜 그리기용 수직 벡터
    const inFlight = f.fly < 0.98;
    // E 화살표 (그 자리의 전기장: 시험 전하가 없어도 그려요)
    if (!inFlight) {
      const sx0 = f.px + g.ux * (PR2 + 5) + nx * -9, sy0 = f.py + g.uy * (PR2 + 5) + ny * -9;
      const clampE = g.E / 1e5 * E_LPX > E_LMAX + 0.5;
      D.arrow(sx0, sy0, sx0 + g.ux * f.la, sy0 + g.uy * f.la, { color: COL_E, width: 5, head: 13, dash: f.has ? null : [8, 6] });
      if (clampE) T(sx0 + g.ux * (f.la + 12), sy0 + g.uy * (f.la + 12) + 5, '≫', 16, COL_E, 'center', 800);
      lbl(sx0 + g.ux * f.la / 2 + nx * -20, sy0 + g.uy * f.la / 2 + ny * -20, 'E = ' + sci(g.E) + ' N/C', { color: '#1e40af', border: '#93b4f8' });
    }
    if (f.has) {
      if (!inFlight) {
        const sx1 = f.px + g.sF * g.ux * (PR2 + 5) + nx * 9, sy1 = f.py + g.sF * g.uy * (PR2 + 5) + ny * 9;
        D.arrow(sx1, sy1, sx1 + g.sF * g.ux * f.lf, sy1 + g.sF * g.uy * f.lf, { color: COL_F, width: 5, head: 13 });
        const full = Math.abs(g.qp * 1e9) * g.E / 1e5 * E_LPX;
        if (g.sF > 0 && full > E_LMAX + 0.5) T(sx1 + g.ux * (f.lf + 12), sy1 + g.uy * (f.lf + 12) + 5, '≫', 16, COL_F, 'center', 800);
        lbl(sx1 + g.sF * g.ux * f.lf / 2 + nx * 20, sy1 + g.sF * g.uy * f.lf / 2 + ny * 20, 'F = ' + (masked2() ? '?' : sci(g.F) + ' N'), { color: '#9a3412', border: '#f6b08a' });
      }
      probeSphere(px, py, 1);
      if (!inFlight) T(f.px, f.py + PR2 + (PHONE ? 14 : 16), "q′ = " + (f.qp > 0 ? '+' : '−') + Math.abs(f.qp) + ' nC', PHONE ? 11.5 : 13, '#26324a', 'center', 800);
    } else {
      ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.8)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.px, f.py, PR2, 0, TAU); ctx.stroke(); ctx.restore();
      T(f.px, f.py + PR2 + 16, '시험 전하 없음', PHONE ? 11.5 : 13, '#516079', 'center', 800);
    }
    if (f.has && !f.drag && !S.seenProbe && S.t > 1.6 && f.fly > 0.98 && !masked2()) { D.arrow(f.px + 44, f.py - 44, f.px + 12, f.py - 12, { color: COL_F, width: 3 }); T(f.px + 46, f.py - 52, '끌어 보세요', 13, '#9a3412', 'center', 800); }
    drawFieldPanel(g);
  }
  function drawFieldPanel(g) {
    const f = S.f2, R = R2, y = R.y1 + 12;
    const ph = VH - y - 8, mk = masked2();
    const cells = PHONE ? [[12, y, VW - 24, (ph - 16) / 3], [12, y + (ph - 16) / 3 + 8, VW - 24, (ph - 16) / 3], [12, y + 2 * (ph - 16) / 3 + 16, VW - 24, (ph - 16) / 3]]
      : [[12, y, 250, ph], [275, y, 250, ph], [538, y, 250, ph]];
    cells.forEach((c) => panel(c[0], c[1], c[2], c[3], 14));
    const sz = PHONE ? 12 : 14.5, lh = PHONE ? 16 : 24, rs = g.r.toFixed(2), qs = sci(g.q), dirW = (f.q > 0 ? '바깥쪽' : '안쪽');
    // 칸 1
    let c = cells[0], x = c[0] + 12, yy = c[1] + (PHONE ? 20 : 24);
    T(x, yy, '① 전하 q가 만든 전기장', sz + 0.5, '#1e40af', 'left', 800);
    T(x, yy + lh, 'E = k|q| / r²', sz + 1, '#26324a', 'left', 800);
    T(x, yy + 2 * lh, '= (9.0×10⁹)(' + sci(Math.abs(g.q)) + ') / (' + rs + ')²', sz, '#26324a', 'left', 700);
    T(x, yy + 3 * lh, '= ' + sci(g.E) + ' N/C, ' + dirW + ' 방향', sz, '#1e40af', 'left', 800);
    // 칸 2
    c = cells[1]; x = c[0] + 12; yy = c[1] + (PHONE ? 20 : 24);
    T(x, yy, '② 시험 전하가 받는 힘', sz + 0.5, '#9a3412', 'left', 800);
    if (f.has) {
      T(x, yy + lh, 'F = q′E', sz + 1, '#26324a', 'left', 800);
      T(x, yy + 2 * lh, '= (' + sci(Math.abs(g.qp)) + ')(' + sci(g.E) + ')', sz, '#26324a', 'left', 700);
      T(x, yy + 3 * lh, '= ' + (mk ? '?' : sci(g.F) + ' N') + ', ' + (g.sF * (f.q > 0 ? 1 : -1) > 0 ? '바깥쪽' : '안쪽') + ' 방향', sz, '#9a3412', 'left', 800);
    } else {
      textBlock(x, yy + lh, c[2] - 24, '시험 전하를 치웠어요. 힘은 없지만 파란 전기장 화살표는 그 자리에 그대로예요!', sz, '#26324a', lh, 700);
    }
    // 칸 3
    c = cells[2]; x = c[0] + 12; yy = c[1] + (PHONE ? 20 : 24);
    T(x, yy, '③ 힘 / 시험 전하', sz + 0.5, '#0b7a41', 'left', 800);
    if (f.has) {
      T(x, yy + lh, 'F / q′ = ' + (mk ? '?' : sci(g.F / Math.abs(g.qp)) + ' N/C'), sz + 1, '#26324a', 'left', 800);
      textBlock(x, yy + 2 * lh, c[2] - 24, 'q′를 바꿔도 값이 같으면 → 그 자리의 전기장 E예요.', sz, '#0b7a41', lh, 800);
    } else {
      textBlock(x, yy + lh, c[2] - 24, '전기장은 전하 q가 공간에 만들어 둔 성질이에요.', sz, '#0b7a41', lh, 800);
    }
  }
  function fieldDown(p) {
    const f = S.f2;
    if (S.gate === 'num2') return false;
    if (p.y < R2.y0 || p.y > R2.y1) return false;
    if (Math.hypot(p.x - R2.cx, p.y - R2.cy) < QR2 + 4) return false;
    S.seenProbe = true;
    const near = Math.hypot(p.x - f.px, p.y - f.py) <= 34;
    if (!f.has) { f.has = true; flyIn(); updateCtl(); }
    f.drag = true; if (f.tw) { f.tw.cancel(); f.tw = null; f.fly = 1; }
    if (!near) { placeProbe(p.x, p.y); f.pulse = 0.5; }
    Sound.click(); return true;
  }
  function fieldMove(p) { if (S.f2.drag) placeProbe(p.x, p.y); }
  function fieldUp() { S.f2.drag = false; }
  function fieldHover(p) { const f = S.f2; if (S.gate === 'num2') return 'default'; return Math.hypot(p.x - f.px, p.y - f.py) <= 30 ? 'grab' : 'default'; }

  /* ================= ③ 거리 관계 (그래프) ================= */
  const masked3 = () => S.gate === 'num3';
  const gx = (r) => G.x0 + r * (G.x1 - G.x0), gy = (E) => G.y1 - E / GEMAX * (G.y1 - G.y0);       // E는 ×10⁵ N/C
  const Eof = (q, r) => K * Math.abs(q) * 1e-6 / (r * r);
  const pinsOf = (q) => S.f3.pts[q];
  const shownPins = (q) => pinsOf(q).filter((p) => !(masked3() && Math.abs(p.r - 0.15) < 1e-6));
  function pinPoint() {
    const f = S.f3, arr = pinsOf(f.q);
    if (arr.some((p) => Math.abs(p.r - f.r) < 1e-6)) { showHint('이 위치(' + f.r.toFixed(2) + ' m)는 이미 찍었어요. 다른 위치에서 찍어 보세요.'); return; }
    arr.push({ r: f.r, E: Eof(f.q, f.r), drop: 0 });
    arr[arr.length - 1].tw = SciSim.tween(arr[arr.length - 1], { drop: 1 }, { duration: RM ? 0.01 : 0.6, ease: 'outBounce' });
    Sound.success();
    parts.burst(gx(f.r), gy(Eof(f.q, f.r) / 1e5), { count: 8, speed: 90, life: 0.5, size: 3, colors: [GQ[f.q]] });
    if (!f.firstDone && f.q === 1 && arr.length >= 5) f.firstDone = true;
  }
  $('#bPin').addEventListener('click', () => { Sound.click(); pinPoint(); });
  $$('#gqSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.f3.q = +b.dataset.v; updateCtl(); }));
  function stepGraph(dt) {
    const f = S.f3;
    Object.keys(f.curveT).forEach((k) => {
      const want = (pinsOf(k).length >= 5 || (f.firstDone && pinsOf(k).length >= 1)) ? 1 : 0;
      f.curveT[k] = RM ? want : SciSim.approach(f.curveT[k], want, dt, 1.6);
    });
  }
  function drawGraph() {
    sceneBg(); const f = S.f3, col = GQ[f.q], mk = masked3();
    T(14, 26, '📈 거리에 따른 전기장의 세기', PHONE ? 15 : 17, '#26324a', 'left', 800);
    panel(G.x0 - 64, G.y0 - 34, G.x1 - G.x0 + 80, G.y1 - G.y0 + 74, 14);
    // 격자·축
    ctx.lineWidth = 1;
    for (let v = 0; v <= GEMAX; v += 5) { ctx.strokeStyle = v === 0 ? '#516079' : 'rgba(120,135,160,.3)'; ctx.beginPath(); ctx.moveTo(G.x0, gy(v)); ctx.lineTo(G.x1, gy(v)); ctx.stroke(); T(G.x0 - 8, gy(v) + 4, String(v), PHONE ? 11 : 12.5, '#516079', 'right', 700); }
    for (let i = 0; i <= 10; i++) { const r = i / 10; ctx.strokeStyle = i === 0 ? '#516079' : 'rgba(120,135,160,.22)'; ctx.beginPath(); ctx.moveTo(gx(r), G.y0); ctx.lineTo(gx(r), G.y1); ctx.stroke(); if (i % 2 === 0) T(gx(r), G.y1 + 16, r.toFixed(1), PHONE ? 11 : 12.5, '#516079', 'center', 700); }
    T((G.x0 + G.x1) / 2, G.y1 + 34, 'r (m)', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    T(G.x0 - 50, G.y0 - 14, 'E (×10⁵ N/C)', PHONE ? 11.5 : 13, '#26324a', 'left', 800);
    // 곡선 (점이 5개 모이면 이어져요)
    ['1', '2', '-1'].forEach((k) => {
      const t = f.curveT[k]; if (t < 0.01) return;
      const q = +k; ctx.save(); ctx.beginPath(); ctx.rect(G.x0 - 2, G.y0 - 2, (G.x1 - G.x0 + 4), G.y1 - G.y0 + 4); ctx.clip();
      ctx.strokeStyle = GQ[k]; ctx.lineWidth = k === '-1' ? 3 : 4; ctx.globalAlpha = 0.85; ctx.lineCap = 'round'; if (k === '-1') ctx.setLineDash([9, 7]);
      ctx.beginPath(); const rEnd = 0.1 + 0.9 * t; let first = true;
      for (let r = 0.1; r <= rEnd + 1e-9; r += 0.005) { const E = Eof(q, r) / 1e5; if (first) { ctx.moveTo(gx(r), gy(E)); first = false; } else ctx.lineTo(gx(r), gy(E)); }
      ctx.stroke(); ctx.restore();
    });
    // 찍은 점
    ['1', '2', '-1'].forEach((k) => {
      shownPins(k).forEach((p) => {
        const y = gy(p.E / 1e5) - (1 - p.drop) * 46;
        ctx.save(); ctx.globalAlpha = clamp(p.drop * 3, 0, 1); D.sphere(gx(p.r), y, PHONE ? 5.5 : 6.5, GQ[k], { outline: '#fff', outlineWidth: 2, gloss: false }); ctx.restore();
      });
    });
    // 지금 측정 위치 (속이 빈 점)
    { const E = Eof(f.q, f.r) / 1e5;
      ctx.save(); ctx.strokeStyle = 'rgba(38,50,74,.55)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx(f.r), G.y1); ctx.lineTo(gx(f.r), gy(E)); ctx.stroke(); ctx.setLineDash([]);
      if (!mk) { ctx.beginPath(); ctx.moveTo(G.x0, gy(E)); ctx.lineTo(gx(f.r), gy(E)); ctx.stroke(); }
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx(f.r), mk ? G.y1 : gy(E), 7 + Math.sin(S.t * 5) * 1.2, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // 범례
    const lgx = G.x1 - (PHONE ? 130 : 150), lgy = G.y0 + 10;
    [['1', '+1 μC'], ['2', '+2 μC'], ['-1', '−1 μC (점선: 크기는 같고 방향만 반대)']].forEach((a, i) => {
      if (a[0] === '-1' && f.curveT['-1'] < 0.05 && !pinsOf('-1').length) return;
      if (a[0] === '2' && f.curveT['2'] < 0.05 && !pinsOf('2').length) return;
      ctx.fillStyle = GQ[a[0]]; ctx.beginPath(); ctx.arc(lgx, lgy + i * 18 + 2, 5, 0, TAU); ctx.fill();
      T(lgx + 10, lgy + i * 18 + 6, a[0] === '-1' ? '−1 μC' : a[1], PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
    });
    drawGraphTable(); drawStrip();
  }
  function drawGraphTable() {
    const f = S.f3, rows = shownPins(f.q).slice().sort((a, b) => a.r - b.r);
    const x = PHONE ? 12 : 524, y = PHONE ? G.y1 + 52 : 40, w = PHONE ? VW - 24 : VW - 524 - 12, h = PHONE ? 152 : 300 - 40 + 30 + 16;
    panel(x, y, w, h, 14);
    T(x + 12, y + 22, '기록표 (q = ' + sgnStr(f.q) + Math.abs(f.q) + ' μC)', PHONE ? 13 : 14, '#26324a', 'left', 800);
    const cols = [0.2, 0.58, 0.95].map((c) => x + w * c);
    T(cols[0], y + 44, 'r (m)', PHONE ? 11.5 : 12.5, '#516079', 'center', 800); T(cols[1], y + 44, 'E (×10⁵)', PHONE ? 11.5 : 12.5, '#516079', 'center', 800); T(cols[2], y + 44, 'E·r² (×10³)', PHONE ? 11.5 : 12.5, '#516079', 'right', 800);
    const rh = PHONE ? 17 : 25, max = PHONE ? 5 : 8;
    const vis = rows.slice(0, max);
    vis.forEach((p, i) => {
      const yy = y + 62 + i * rh;
      T(cols[0], yy, p.r.toFixed(2), PHONE ? 12 : 13.5, '#26324a', 'center', 800);
      T(cols[1], yy, f3(p.E / 1e5), PHONE ? 12 : 13.5, '#26324a', 'center', 800);
      T(cols[2], yy, f3(p.E * p.r * p.r / 1e3), PHONE ? 12 : 13.5, '#0b7a41', 'right', 800);
    });
    if (rows.length > max) T(x + w / 2, y + 62 + max * rh, '… ' + (rows.length - max) + '개 더', 12, '#516079', 'center', 700);
    if (!rows.length) T(x + w / 2, y + 74, '📌 점을 찍으면 여기에 쌓여요', PHONE ? 12 : 13, '#9aa5b8', 'center', 800);
    else if (rows.length >= 3) T(x + w - 12, y + h - 12, 'E·r²는 늘 같아요', PHONE ? 12 : 13, '#0b7a41', 'right', 800);
  }
  function drawStrip() {
    const f = S.f3, y = ST.y, x0 = ST.x0, mk = masked3();
    const top = ST.top; panel(12, top, VW - 24, PHONE ? 170 : 196, 14);
    T(26, top + 24, '측정 위치 (전하에서 r만큼 떨어진 곳)', PHONE ? 13 : 14, '#26324a', 'left', 800);
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + ST.sc, y); ctx.stroke();
    for (let u = 0; u <= 10; u++) { const xx = x0 + u * ST.sc / 10; ctx.beginPath(); ctx.moveTo(xx, y - (u % 5 ? 4 : 7)); ctx.lineTo(xx, y + (u % 5 ? 4 : 7)); ctx.stroke(); }
    [0, 0.5, 1].forEach((u) => T(x0 + u * ST.sc, y + 26, u.toFixed(u === 0.5 ? 1 : 0) + ' m', PHONE ? 11 : 12, '#516079', 'center', 700));
    const xp = x0 + f.r * ST.sc, col = f.q > 0 ? POS : NEG;
    D.glow(x0, y, 40, col, 0.35); D.sphere(x0, y, PHONE ? 11 : 15, col, { shadow: true, text: f.q > 0 ? '+' : '−' });
    T(x0, y - (PHONE ? 20 : 26), 'q = ' + sgnStr(f.q) + Math.abs(f.q) + ' μC', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    D.sphere(xp, y, 7, '#ffb400', { shadow: true });
    // E 화살표 (1.0×10⁵ N/C = 길이 단위)
    const Es = Eof(f.q, f.r), unit = PHONE ? 20 : 34, maxL = PHONE ? 100 : 150;
    let L = Math.min(maxL, Es / 1e5 * unit); const dir = f.q > 0 ? 1 : -1;
    if (dir < 0) L = Math.min(L, Math.max(10, xp - x0 - (PHONE ? 11 : 15) - 12));
    const ay = y - (PHONE ? 46 : 52);
    ctx.strokeStyle = 'rgba(37,99,235,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(xp, y - 8); ctx.lineTo(xp, ay); ctx.stroke(); ctx.setLineDash([]);
    if (!mk) {
      D.arrow(xp, ay, xp + dir * L, ay, { color: COL_E, width: 5, head: 12 });
      if (Es / 1e5 * unit > maxL + 0.5 && dir > 0) T(xp + L + 12, ay + 5, '≫', 16, COL_E, 'center', 800);
    }
    lbl(xp + dir * L / 2, ay - 18, 'E = ' + (mk ? '?' : sci(Es) + ' N/C'), { color: '#1e40af', border: '#93b4f8' });
    T(26, top + (PHONE ? 150 : 176), mk ? '식을 떠올려 보세요: E·r²가 일정해요.' : 'E·r² = ' + f3(Es * f.r * f.r) + ' N·m²/C = kq', PHONE ? 12.5 : 14, '#0b7a41', 'left', 800);
  }

  /* ================= ④ 전기장의 합 ================= */
  const masked4 = () => S.gate === 'num4';
  function startSum(p) {
    const f = S.f4; f.pre = p; f.seenPre[p] = true;
    if (f.tw) { f.tw.cancel(); f.tw = null; }
    if (p === 'b' || p === 'c') { f.sumT = 0; f.tw = SciSim.tween(f, { sumT: 1 }, { duration: RM ? 0.01 : 2.2, delay: RM ? 0 : 0.2, ease: 'inOutQuad', onDone: () => { f.tw = null; } }); }
    else f.sumT = 1;
    f.drag = false; f.ink.drops.length = 0;
    updateCtl();
  }
  $$('#preSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); startSum(b.dataset.v); }));
  $('#bSum').addEventListener('click', () => { Sound.click(); startSum(S.f4.pre); });
  function setPx(v) { v = Math.round(clamp(v, -0.35, 0.95) * 100) / 100; const f = S.f4; let x = v; PRE.a.ch.forEach((c) => { if (Math.abs(x - c.x) < 0.05) x = c.x + (f.px >= c.x ? 1 : -1) * 0.05; }); f.px = Math.round(x * 100) / 100; updateCtl(); }
  $('#sPx').addEventListener('input', (e) => { setPx(+e.target.value); Sound.tick(); });
  $('#pxM').addEventListener('click', () => { Sound.click(); setPx(S.f4.px - 0.01); });
  $('#pxP').addEventListener('click', () => { Sound.click(); setPx(S.f4.px + 0.01); });
  $$('#inkSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.f4.ink.q = +b.dataset.v; updateCtl(); }));
  const inkY = (x, q) => {   // 방울의 높이 변화 (위쪽이 +): 판 안에서는 포물선, 나오면 직선
    const I = INK, L = I.xo - I.xi, a = I.du * q / (L * L);
    if (x <= I.xi) return 0;
    if (x <= I.xo) return a * (x - I.xi) * (x - I.xi);
    return a * L * L + 2 * a * L * (x - I.xo);
  };
  $('#bInk').addEventListener('click', () => { Sound.click(); const k = S.f4.ink; if (k.drops.length > 3) return; k.drops.push({ x: INK.xs, q: k.q }); });
  $('#bInkClr').addEventListener('click', () => { Sound.click(); S.f4.ink.dots.length = 0; });
  function Pnow() { const f = S.f4; return f.pre === 'a' ? { x: f.px, y: 0 } : f.pre === 'd' ? { x: 0, y: 0 } : PRE[f.pre].P; }
  function stepSum(dt) {
    const f = S.f4, k = f.ink;
    if (f.pre === 'a') { const n = netAt('a', Pnow()); if (Math.abs(f.px - 0.2) < 0.005 && Math.hypot(n.x, n.y) < 1e3 && !f.zeroT) { f.zeroT = 1; parts.burst(sx(0.2), sy(0), { count: 16, speed: 140, life: 0.7, size: 4 }); Sound.success(); } if (Math.abs(f.px - 0.2) >= 0.005) f.zeroT = 0; }
    for (let i = k.drops.length - 1; i >= 0; i--) {
      const d = k.drops[i]; d.x += 300 * dt;
      if (d.x >= INK.xp) { if (k.dots.length > 40) k.dots.shift(); k.dots.push({ y: INK.yc - inkY(INK.xp, d.q), q: d.q, born: S.t }); k.drops.splice(i, 1); parts.burst(INK.xp, INK.yc - inkY(INK.xp, d.q), { count: 6, speed: 60, life: 0.4, size: 2.5, colors: ['#26324a'] }); }
    }
  }
  function drawArrowV(P, v, color, o) {
    o = o || {};
    const m = Math.hypot(v.x, v.y); if (m < 1e3) return { clamped: false, len: 0 };
    const raw = m / 1e5 * seScale(), len = Math.min(SE_LMAX, raw);
    const x1 = o.x != null ? o.x : sx(P.x), y1 = o.y != null ? o.y : sy(P.y), ux = v.x / m, uy = -v.y / m;
    D.arrow(x1, y1, x1 + ux * len, y1 + uy * len, { color, width: o.w || 4, head: 12, dash: o.dash, alpha: o.alpha });
    return { clamped: raw > SE_LMAX + 0.5, len, tx: x1 + ux * len, ty: y1 + uy * len, ux, uy };
  }
  function drawSum() {
    const f = S.f4;
    if (f.pre === 'd') { drawInk(); return; }
    sceneBg(SPN_Y);
    const pre = f.pre, P = Pnow(), net = netAt(pre, P), mk = masked4();
    T(14, 26, '➕ 여러 전하의 전기장은 벡터로 더해요', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 44 : 46, pre === 'a' ? '점 P를 x축 위에서 옮겨 E합이 0인 곳을 찾아요' : '점 P(0, 0.40 m)에서 E₁과 E₂를 더해요', PHONE ? 11.5 : 13, '#5a6679', 'left', 700);
    // 격자
    ctx.save(); ctx.beginPath(); ctx.rect(0, 52, VW, SPN_Y - 56); ctx.clip();
    ctx.lineWidth = 1;
    for (let x = -0.6; x <= 1.4; x += 0.1) { ctx.strokeStyle = Math.abs(x) < 1e-6 ? 'rgba(81,96,121,.5)' : 'rgba(120,135,160,.2)'; ctx.beginPath(); ctx.moveTo(sx(x), 52); ctx.lineTo(sx(x), SPN_Y); ctx.stroke(); }
    for (let y = -0.3; y <= 0.9; y += 0.1) { ctx.strokeStyle = Math.abs(y) < 1e-6 ? 'rgba(81,96,121,.7)' : 'rgba(120,135,160,.2)'; ctx.beginPath(); ctx.moveTo(0, sy(y)); ctx.lineTo(VW, sy(y)); ctx.stroke(); }
    ctx.restore();
    for (let x = -0.4; x <= 1.0; x += 0.2) if (sx(x) > 10 && sx(x) < VW - 24) T(sx(x), SPN_Y - 8, round2(x).toFixed(1), PHONE ? 10.5 : 12, '#516079', 'center', 700);
    T(VW - 14, SPN_Y - 8, 'x (m)', PHONE ? 11 : 12.5, '#516079', 'right', 700);
    // 전하
    PRE[pre].ch.forEach((c, i) => {
      const r = (PHONE ? 6 : 8) + (PHONE ? 2 : 3) * Math.sqrt(Math.abs(c.q) * 1e6);
      D.glow(sx(c.x), sy(c.y), r * 2.6, c.q > 0 ? POS : NEG, 0.3);
      D.sphere(sx(c.x), sy(c.y), r, c.q > 0 ? POS : NEG, { shadow: true, text: c.q > 0 ? '+' : '−' });
      T(sx(c.x), sy(c.y) + r + (PHONE ? 14 : 17), (c.q > 0 ? '+' : '−') + Math.abs(c.q) * 1e6 + ' μC', PHONE ? 11.5 : 13, '#26324a', 'center', 800);
    });
    // 점 P
    const px = sx(P.x), py = sy(P.y);
    D.ring(px, py, 10, S.t, { color: '#16a34a', width: 3 });
    D.sphere(px, py, 5, '#16a34a', { gloss: false });
    T(px + (pre === 'a' ? 0 : 14), py + (pre === 'a' ? 28 : 4), 'P', 14, '#0b7a41', pre === 'a' ? 'center' : 'left', 800);
    // 벡터
    const v1 = net.vs[0], v2 = net.vs[1], t = f.sumT;
    if (pre === 'a') {
      const off = 12;
      const a1 = drawArrowV(P, v1, COL_E, { y: py - off, x: px, w: 4 });
      const a2 = drawArrowV(P, v2, COL_E2, { y: py - off - 12, x: px, w: 4 });
      const an = drawArrowV(P, net, COL_S, { y: py + 44, x: px, w: 6 });
      if (a1.len) lbl(px + a1.ux * a1.len / 2, py - off - 36, 'E₁ ' + sci(v1.m), { color: '#1e40af', border: '#93b4f8', size: PHONE ? 11 : 12.5 });
      if (a2.len) lbl(px + a2.ux * a2.len / 2, py - off - 58, 'E₂ ' + sci(v2.m), { color: '#0f766e', border: '#7dd3cb', size: PHONE ? 11 : 12.5 });
      if (an.len) lbl(px + an.ux * an.len / 2, py + 72, 'E합 ' + sci(Math.hypot(net.x, net.y)), { color: '#5b21b6', border: '#c4b5fd', size: PHONE ? 11 : 12.5 });
      else lbl(px, py + 56, 'E합 = 0', { bg: '#16a34a', color: '#fff', size: PHONE ? 12 : 14 });
      if (f.zeroT) D.check(px, py - 60, 14, 1);
    } else {
      const s1 = drawArrowV(P, v1, COL_E, { w: 4 });
      const s2 = drawArrowV(P, v2, COL_E2, { w: 4 });
      if (s1.len && s2.len) {
        const k2 = clamp((t - 0.35) / 0.4, 0, 1), k3 = clamp((t - 0.75) / 0.25, 0, 1);
        const ox2 = s2.tx - px, oy2 = s2.ty - py, ox1 = s1.tx - px, oy1 = s1.ty - py;
        // 평행사변형: E₁, E₂의 점선 복사본이 반대편 꼭짓점으로 미끄러져 와요
        if (k2 > 0) {
          ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
          ctx.strokeStyle = 'rgba(37,99,235,.7)'; ctx.beginPath(); ctx.moveTo(px + ox2 * k2, py + oy2 * k2); ctx.lineTo(px + ox2 * k2 + ox1, py + oy2 * k2 + oy1); ctx.stroke();
          ctx.strokeStyle = 'rgba(13,148,136,.7)'; ctx.beginPath(); ctx.moveTo(px + ox1 * k2, py + oy1 * k2); ctx.lineTo(px + ox1 * k2 + ox2, py + oy1 * k2 + oy2); ctx.stroke(); ctx.restore();
        }
        const m = Math.hypot(net.x, net.y), len = Math.min(SE_LMAX, m / 1e5 * seScale()) * k3;
        const ux = net.x / m, uy = -net.y / m;
        if (k3 > 0 && m > 1e3) D.arrow(px, py, px + ux * len, py + uy * len, { color: COL_S, width: 7, head: 15 });
        const sz = PHONE ? 11 : 12.5;
        lbl(s1.tx + s1.ux * 36 + 0, s1.ty + s1.uy * 12, 'E₁', { color: '#1e40af', border: '#93b4f8', size: sz, pad: 6 });
        lbl(s2.tx + s2.ux * 36, s2.ty + s2.uy * 12, 'E₂', { color: '#0f766e', border: '#7dd3cb', size: sz, pad: 6 });
        if (k3 > 0.95 && m > 1e3) lbl(px + ux * (len + 52), py + uy * (len + 16), 'E합 ' + (mk ? '?' : sci(m, 2)), { color: '#5b21b6', border: '#c4b5fd', size: sz });
      }
    }
    drawSumPanel(net, v1, v2);
  }
  function drawSumPanel(net, v1, v2) {
    const f = S.f4, y = SPN_Y, h = VH - y - 8, mk = masked4(), pre = f.pre, m = Math.hypot(net.x, net.y);
    panel(12, y, VW - 24, h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22, x = 26;
    const lines = [];
    if (pre === 'a') {
      lines.push(['P의 위치 x = ' + f.px.toFixed(2) + ' m (왼쪽 전하 2 μC까지 ' + v1.r.toFixed(2) + ' m, 오른쪽 전하 8 μC까지 ' + v2.r.toFixed(2) + ' m)', '#26324a']);
      lines.push(['E₁ = k(2 μC)/r₁² = ' + sci(v1.m) + ' N/C (' + dirWord(v1) + ')', '#1e40af']);
      lines.push(['E₂ = k(8 μC)/r₂² = ' + sci(v2.m) + ' N/C (' + dirWord(v2) + ')', '#0f766e']);
      lines.push([m < 1e3 ? 'E합 = 0 → 두 전기장이 크기는 같고 방향이 반대로 상쇄돼요!' : 'E합 = ' + sci(m) + ' N/C (' + dirWord(net) + ')', m < 1e3 ? '#0b7a41' : '#5b21b6']);
    } else {
      lines.push(['E₁ = k(2 μC)/(0.50 m)² = ' + sci(v1.m) + ' N/C, 방향 ' + (v1.x > 0 ? '오른쪽 위' : '왼쪽 위'), '#1e40af']);
      lines.push(['E₂ = ' + sci(v2.m) + ' N/C, 방향 ' + (pre === 'b' ? (v2.x > 0 ? '오른쪽 위' : '왼쪽 위') : '오른쪽 아래 (−전하 쪽)'), '#0f766e']);
      lines.push(['x, y 성분을 따로 더해요. ' + (pre === 'b' ? 'x 성분은 서로 상쇄, y 성분만 남아요.' : 'y 성분은 서로 상쇄, x 성분만 남아요.'), '#26324a']);
      lines.push(['E합 = ' + (mk ? '?' : sci(m, 2) + ' N/C, ' + dirWord(net)), '#5b21b6']);
    }
    lines.forEach((l, i) => { const ls = wrap(l[0], VW - 56, sz, 800); T(x, y + 26 + i * lh + (PHONE && ls.length > 1 ? 0 : 0), ls[0], sz, l[1], 'left', 800); if (ls.length > 1) T(x, y + 26 + i * lh + lh * 0.9, ls.slice(1).join(''), sz, l[1], 'left', 800); });
  }
  function drawInk() {
    sceneBg(); const f = S.f4, k = f.ink, I = INK;
    T(14, 26, '🖨️ 쓰임: 잉크젯 프린터 — 전기장이 방울을 휘게 해요', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 44 : 46, '대전된 잉크 방울이 판 사이의 전기장에서 힘 F = qE를 받아 휘어요', PHONE ? 11.5 : 13, '#5a6679', 'left', 700);
    const yt = I.yc - I.gap / 2, yb = I.yc + I.gap / 2;
    // 전기장 화살표 (+판 → −판, 아래쪽)
    for (let x = I.xi + 20; x < I.xo; x += 40) {
      const ph = RM ? 0 : (S.t * 0.8 + x / 200) % 1;
      D.arrow(x, yt + 12, x, yb - 12, { color: 'rgba(37,99,235,.38)', width: 2.5, head: 9, alpha: 0.55 + 0.35 * Math.sin(ph * TAU) });
    }
    D.roundRect(I.xi, yt - 12, I.xo - I.xi, 12, 4); ctx.fillStyle = '#e2574c'; ctx.fill(); T((I.xi + I.xo) / 2, yt - 16, '(+)판', 13, '#9a3412', 'center', 800);
    D.roundRect(I.xi, yb, I.xo - I.xi, 12, 4); ctx.fillStyle = '#2f6df6'; ctx.fill(); T((I.xi + I.xo) / 2, yb + 28, '(−)판', 13, '#1e40af', 'center', 800);
    lbl((I.xi + I.xo) / 2, I.yc, 'E ↓', { color: '#1e40af', border: '#93b4f8' });
    // 노즐 · 종이
    D.roundRect(I.xs - 40, I.yc - 22, 38, 44, 8); ctx.fillStyle = '#64748b'; ctx.fill(); T(I.xs - 21, I.yc + 5, '노즐', 12, '#fff', 'center', 800);
    D.roundRect(I.xp, I.yc - (PHONE ? 130 : 150), 16, PHONE ? 260 : 300, 4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); T(I.xp + 8, I.yc - (PHONE ? 136 : 158), '종이', 13, '#516079', 'center', 800);
    k.dots.forEach((d) => { D.sphere(I.xp + 8, d.y, 4, '#26324a', { gloss: false }); });
    // 날아가는 방울
    k.drops.forEach((d) => { const y = I.yc - inkY(d.x, d.q); D.sphere(d.x, y, 5.5, d.q ? '#2f6df6' : '#475569', { shadow: true }); });
    // 패널
    const py0 = PHONE ? 470 : 405, ph = VH - py0 - 8;
    panel(12, py0, VW - 24, ph, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22;
    T(26, py0 + 26, '방울의 전하량 −' + k.q + ' 단위 → ' + (k.q ? '위쪽 (+)판 쪽으로 휘어요' : '곧게 나아가요 (힘 = 0)'), sz, '#26324a', 'left', 800);
    T(26, py0 + 26 + lh, '힘 F = qE ∝ q → 전하량이 클수록 더 많이 휘어요', sz, '#9a3412', 'left', 800);
    textBlock(26, py0 + 26 + 2 * lh, VW - 56, '전하량을 바꿔 가며 쏘면 종이 위의 점 높이가 달라져요. 이렇게 점의 위치를 조절해 글자와 그림을 인쇄해요.', sz, '#0b7a41', lh, 800);
    T(26, py0 + ph - 14, '(방울은 (−)로 대전되어 (+)판 쪽으로 힘을 받아요)', PHONE ? 11.5 : 12.5, '#516079', 'left', 700);
  }
  function sumDown(p) {
    const f = S.f4;
    if (f.pre !== 'a' || S.gate === 'num4') return false;
    if (Math.abs(p.y - sy(0)) > 60 || Math.abs(p.x - sx(f.px)) > 40) return false;
    f.drag = true; Sound.click(); return true;
  }
  function sumMove(p) { if (S.f4.drag) setPx((p.x - SO.x) / SPX); }

  /* ================= 포인터 ================= */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'force') {
        if (S.gate === 'num1') return false;
        const x = xAB(), rb = rcOf(S.f1.qb);
        if (Math.abs(p.x - x.b) <= rb + 16 && Math.abs(p.y - AY) <= rb + 24) { S.f1.drag = true; S.f1.seenDrag = true; Sound.click(); return true; }
        return false;
      }
      if (S.mode === 'field') return fieldDown(p);
      if (S.mode === 'sum') return sumDown(p);
      return false;
    },
    move(p) {
      if (S.mode === 'force') { if (S.f1.drag) { S.f1.r = clamp(Math.round((p.x - AX0) / PXM * 20) / 20, 0.1, 1); updateCtl(); } }
      else if (S.mode === 'field') fieldMove(p);
      else if (S.mode === 'sum') sumMove(p);
    },
    up() { S.f1.drag = false; S.f2.drag = false; S.f4.drag = false; },
    hover(p) {
      if (S.mode === 'force') { const x = xAB(), rb = rcOf(S.f1.qb); S.f1.hov = S.gate !== 'num1' && Math.abs(p.x - x.b) <= rb + 16 && Math.abs(p.y - AY) <= rb + 24; return S.f1.hov ? 'grab' : 'default'; }
      if (S.mode === 'field') return fieldHover(p);
      if (S.mode === 'sum') return S.f4.pre === 'a' && Math.abs(p.y - sy(0)) < 60 && Math.abs(p.x - sx(S.f4.px)) < 40 ? 'grab' : 'default';
      return 'default';
    },
  });

  /* ================= 판독기 ================= */
  function readouts() {
    let a, b, c;
    if (S.mode === 'force') {
      const f = S.f1; a = ['두 전하', 'A ' + f.qa.toFixed(1) + ' μC · B ' + f.qb.toFixed(1) + ' μC']; b = ['거리 r', f.r.toFixed(2) + ' m']; c = ['전기력 F', masked1() ? '?' : f3(curF()) + ' N'];
    } else if (S.mode === 'field') {
      const g = f2Geo(), f = S.f2; a = ['거리 r', g.r.toFixed(2) + ' m']; b = ['전기장 E = k|q|/r²', sci(g.E) + ' N/C']; c = f.has ? ["힘 F = q′E", masked2() ? '?' : sci(g.F) + ' N'] : ['시험 전하', '없음 (E는 그대로)'];
    } else if (S.mode === 'graph') {
      const f = S.f3, E = Eof(f.q, f.r); a = ['거리 r', f.r.toFixed(2) + ' m']; b = ['전기장 E', masked3() ? '?' : sci(E) + ' N/C']; c = ['E × r²', masked3() ? '?' : f3(E * f.r * f.r) + ' N·m²/C'];
    } else {
      const f = S.f4, P = Pnow();
      if (f.pre === 'd') { a = ['방울의 전하', '−' + f.ink.q + ' 단위']; b = ['힘 F = qE', f.ink.q ? '전하량에 비례' : '0']; c = ['휘는 방향', f.ink.q ? '(+)판 쪽' : '곧게']; }
      else {
        const n = netAt(f.pre, P), m = Math.hypot(n.x, n.y);
        if (f.pre === 'a') { a = ['점 P의 위치', 'x = ' + f.px.toFixed(2) + ' m']; b = ['E₁ · E₂', sci(n.vs[0].m) + ' · ' + sci(n.vs[1].m)]; c = ['E합 (오른쪽이 +)', m < 1e3 ? '0' : sci(n.x) + ' N/C']; }
        else { a = ['E₁', sci(n.vs[0].m) + ' N/C']; b = ['E₂', sci(n.vs[1].m) + ' N/C']; c = ['E합', masked4() ? '?' : sci(m, 2) + ' N/C ' + dirWord(n)]; }
      }
    }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ================= 미션 ================= */
  const num1 = makeNum($('#num1Host'), '<b>A = +2.0 μC, B = +3.0 μC, r = 0.30 m</b> 일 때 두 전하가 서로 받는 힘 F는? (식으로 계산해요)', 'F =', 'N', 0);
  const num2 = makeNum($('#num2Host'), '<b>q = +1.0 μC</b>이 만든 전기장 속, <b>r = 0.30 m</b>인 점에 <b>q′ = +2.0 nC</b>을 놓았을 때 받는 힘 F는?', 'F =', 'N', 0);
  const num3 = makeNum($('#num3Host'), '<b>q = +1 μC</b>, <b>r = 0.15 m</b>에서 전기장 E는? (측정하지 않고 예측해요)', 'E =', 'N/C', 0);
  const num4h = $('#num4Host');
  const num4b = makeNum(num4h, '<b>(b)</b> 두 (+2 μC) 전하, 점 P(0, 0.40 m)에서 E합의 크기와 방향은?', 'E합 =', 'N/C', 0);
  const dir4b = document.createElement('select'); dir4b.className = 'sel-in'; dir4b.setAttribute('aria-label', '(b)의 방향');
  const num4c = makeNum(num4h, '<b>(c)</b> (+2 μC)와 (−2 μC) 한 쌍, 점 P(0, 0.40 m)에서 E합의 크기와 방향은?', 'E합 =', 'N/C', 0);
  const dir4c = dir4b.cloneNode(false); dir4c.setAttribute('aria-label', '(c)의 방향');
  const DIRS = ['위쪽 (+y)', '아래쪽 (−y)', '오른쪽 (+x)', '왼쪽 (−x)'];
  [dir4b, dir4c].forEach((d) => { d.innerHTML = '<option value="">— 방향 —</option>' + DIRS.map((t, i) => '<option value="' + (i + 1) + '">' + t + '</option>').join(''); });
  num4b.row.appendChild(dir4b); num4c.row.appendChild(dir4c);
  [dir4b, dir4c].forEach((d) => d.addEventListener('change', () => { d.classList.remove('ok', 'bad'); Sound.click(); }));
  const T4 = { b: netAt('b', PRE.b.P), c: netAt('c', PRE.c.P) };
  const T4m = { b: Math.hypot(T4.b.x, T4.b.y), c: Math.hypot(T4.c.x, T4.c.y) };

  function checkNum(h, target, tol, hintMsg) {
    const ok = numOK(h, target, tol);
    if (ok === null) return '값을 입력해 주세요.';
    h.mark(ok);
    return ok ? true : hintMsg;
  }
  function check4() {
    const mb = numOK(num4b, T4m.b, 0.05), mc = numOK(num4c, T4m.c, 0.05);
    if (mb === null || mc === null || !dir4b.value || !dir4c.value) return '(b)와 (c)의 크기와 방향을 모두 입력해 주세요.';
    const db = +dir4b.value === 1, dc = +dir4c.value === 3;
    num4b.mark(mb); num4c.mark(mc);
    [[dir4b, db], [dir4c, dc]].forEach((a) => { a[0].classList.remove('ok', 'bad'); a[0].classList.add(a[1] ? 'ok' : 'bad'); });
    if (mb && mc && db && dc) return true;
    const msgs = [];
    if (!mb || !db) msgs.push('(b)');
    if (!mc || !dc) msgs.push('(c)');
    return msgs.join('와 ') + '를 다시 확인해 보세요. 각 전하의 E는 7.2×10⁴ N/C, P에서 각 전하까지 0.50 m이고 x, y 성분을 따로 더해요 (cos 값은 0.6, 0.8).';
  }

  const f2log = () => S.f2.log.seen;
  const levels = [
    {
      title: '전기력: 쿨롱 법칙', short: '전기력', icon: '⚡', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 전하는 서로 떨어져 있는데, 힘은 어떻게 전해질까?</p>' +
        '<div class="si-link">🔗 <b>물리학</b>에서 전기장을 시험 전하가 받는 힘의 방향·상대 크기 화살표 지도로 살펴봤고, <b>통합과학·중학교</b>에서 같은 부호는 밀고 다른 부호는 당기는 전기력을 배웠어요.</div>' +
        '<p>이번 차시에서는 처음으로 전기력과 전기장을 <b>숫자와 식</b>으로 구해요. 먼저 전하량과 거리를 바꾸며 두 전하가 서로 받는 힘 F를 읽고, 표를 만들어 규칙을 찾아봐요. 두 힘은 크기가 같고 방향이 반대예요.</p>',
      features: ['force'],
      setup() { S.gate = ''; Object.assign(S.f1, { qa: 2, qb: 2, r: 0.5 }); resetRows(); setScene('force'); },
      recap: '두 점전하 사이의 전기력은 F = kq₁q₂/r²이에요. 거리가 2배가 되면 힘은 1/4, 전하량이 2배가 되면 힘은 2배예요. 두 전하는 크기가 같고 방향이 반대인 힘을 서로 주고받아요.',
      summary: '<ul><li>두 점전하 사이의 <b>전기력(쿨롱 법칙)</b>: <b>F = k·q₁q₂ / r²</b> (k = 9.0×10⁹ N·m²/C²)</li><li>F는 전하량의 곱에 <b>비례</b>하고, 거리의 <b>제곱에 반비례</b>해요. 거리 2배 → 힘 1/4, 거리 3배 → 힘 1/9.</li><li>두 전하가 받는 힘은 <b>크기가 같고 방향이 반대</b>예요. 같은 부호는 서로 밀고(반발력), 다른 부호는 서로 당겨요(인력).</li><li>예) +2 μC와 +3 μC가 0.30 m 떨어져 있으면 F = <b>0.600 N</b>(반발력).</li></ul>',
      missions: [
        {
          title: '표 6칸 채우기',
          goal: '표의 한 줄과 같은 값(A, B, 거리)으로 맞추고 <b>📋 표에 기록하기</b>를 눌러 힘 F를 채우세요. 여섯 줄을 모두 채워요.',
          hint: '줄이 노란색으로 바뀌면 값이 맞은 거예요. 거리 슬라이더 옆 −, + 버튼으로 0.05 m씩 조절해요.',
          setup() { S.gate = ''; setScene('force'); updateCtl(); },
          check: () => rowsDone() === ROWS.length,
          hold: 0.6,
          status: () => ROWS.map((r, i) => mark(r.F != null) + (i + 1)).join(' &nbsp; ') + ' &nbsp; (' + rowsDone() + ' / 6)',
          explain: '1~3번 줄: 거리를 0.20 m → 0.40 m → 0.80 m로 2배씩 늘리면 F는 ' + f3(Fcalc(2, 2, 0.2)) + ' N → ' + f3(Fcalc(2, 2, 0.4)) + ' N → ' + f3(Fcalc(2, 2, 0.8)) + ' N으로 <b>매번 1/4</b>이 돼요. 4~5번 줄: A의 전하량을 0.5 μC → 1.0 μC로 2배 하면 F도 ' + f3(Fcalc(0.5, 2, 0.4)) + ' N → ' + f3(Fcalc(1, 2, 0.4)) + ' N으로 <b>2배</b>가 돼요. 그래서 F ∝ q₁q₂/r² 이고, 비례 상수가 <b>k = 9.0×10⁹ N·m²/C²</b>예요.',
        },
        {
          title: '식으로 힘 예측하기', manual: true,
          goal: 'A = +2.0 μC, B = +3.0 μC가 0.30 m 떨어져 있어요. <b>F = kq₁q₂/r²</b>으로 힘을 계산해 입력하세요. (k = 9.0×10⁹ N·m²/C²)',
          hint: 'μ(마이크로)는 10⁻⁶이에요. 2.0 μC = 2.0×10⁻⁶ C, 3.0 μC = 3.0×10⁻⁶ C로 바꿔서 대입해요.',
          setup() { S.gate = 'num1'; Object.assign(S.f1, { qa: 2, qb: 3, r: 0.3 }); num1.clear(); setScene('force'); updateCtl(); },
          check: () => checkNum(num1, 0.6, 0.03, '아직 달라요. 전하량을 쿨롱(C) 단위로 바꾸고(1 μC = 10⁻⁶ C) F = 9.0×10⁹ × q₁ × q₂ / r²을 다시 계산해 보세요.'),
          status: () => '식: F = k q₁ q₂ / r² &nbsp; (화면의 F는 숨겨 두었어요)',
          explain: 'F = (9.0×10⁹)(2.0×10⁻⁶)(3.0×10⁻⁶) / (0.30)² = 5.4×10⁻² / 0.090 = <b>0.600 N</b>이에요. 같은 부호이므로 서로 <b>밀어내는</b> 힘이고, A와 B가 받는 힘의 크기는 같아요.',
        },
        {
          type: 'quiz', title: '거리를 3배로 하면?',
          goal: '두 전하 사이의 거리를 <b>3배</b>로 늘리면 두 전하 사이의 힘은 처음의 몇 배가 될까요?',
          setup() { S.gate = ''; setScene('force'); updateCtl(); },
          choices: ['3배', '1/3배', '9배', '1/9배'],
          answer: 3,
          feedback: ['멀어지는데 힘이 커질 수는 없어요. 표에서 거리가 2배가 될 때 힘이 어떻게 변했는지 떠올려 보세요.', '거리에 반비례(1/r)가 아니에요. 거리가 2배일 때 힘이 1/2이 아니라 1/4이었죠? 거리의 제곱에 반비례해요.', '거리가 멀어지면 힘은 작아져요.', ''],
          explain: 'F ∝ 1/r²이므로 거리가 3배가 되면 힘은 1/3² = <b>1/9</b>배가 돼요. 거리 2배 → 1/4, 거리 3배 → 1/9, 거리 4배 → 1/16처럼 거리의 <b>제곱</b>에 반비례해요.',
        },
      ],
    },
    {
      title: '전기장: 전하가 만드는 공간', short: '전기장', icon: '🧭', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 떨어진 두 전하가 F = kq₁q₂/r²의 힘을 주고받는 것을 알았어요. 그런데 접촉하지 않았는데 힘은 어떻게 전해질까요?</div>' +
        '<p>전하 q는 주변 공간에 <b>전기장 E</b>를 만들어요. 그 공간에 놓인 다른 전하 q′는 전기장에서 <b>F = q′E</b>의 힘을 받아요. 즉 두 전하가 직접 밀고 당기는 것이 아니라, <b>장이 상호작용을 전달</b>해요. 시험 전하 q′(작은 +전하)를 곳곳에 놓고 E = F/q′를 확인해 봐요.</p>',
      features: ['field'],
      setup() { S.gate = ''; S.f2.q = 1; S.f2.qp = 1; setScene('field'); resetField(); },
      recap: '전하 q는 공간에 전기장 E = kq/r²을 만들고, 그 자리의 전하 q′는 F = q′E의 힘을 받아요. E = F/q′는 q′와 상관없는 그 자리의 성질이에요.',
      summary: '<ul><li>전하 q가 <b>주변 공간에 전기장 E</b>를 만들고, 그곳에 놓인 다른 전하 q′가 <b>F = q′E</b>의 힘을 받아요. 장이 상호작용을 전달해요.</li><li>점전하의 전기장: <b>E = kq / r²</b> (단위 N/C). 방향은 (+)전하에서 <b>멀어지는</b> 쪽, (−)전하에서는 <b>향하는</b> 쪽이에요.</li><li>E = F/q′는 시험 전하의 크기와 상관없어요. 시험 전하를 <b>치워도</b> 그 자리의 전기장은 그대로 있어요.</li><li>예) +1 μC에서 0.30 m → E = 1.0×10⁵ N/C. 그 자리의 +2 nC은 F = <b>2.0×10⁻⁴ N</b>. (q′가 (−)이면 힘은 반대 방향)</li></ul>',
      missions: [
        {
          title: '같은 점에서 q′ 바꿔 보기',
          goal: '시험 전하를 한 점에 놓고 <b>q′ = +1 nC, +2 nC, +3 nC</b>로 차례로 바꾸세요. F가 변해도 <b>F/q′</b>가 같은지 확인해요.',
          hint: '시험 전하를 끌어 놓은 뒤에는 움직이지 말고 오른쪽의 q′ 버튼만 차례로 눌러요.',
          setup() { S.gate = ''; S.f2.q = 1; S.f2.qp = 1; setScene('field'); resetField(); },
          check: () => { const s = f2log(); return s[1] != null && s[2] != null && s[3] != null; },
          hold: 0.6,
          status: () => { const s = f2log(); return [1, 2, 3].map((v) => mark(s[v] != null) + ' +' + v + ' nC' + (s[v] != null ? ' → F/q′ = ' + sci(s[v]) : '')).join(' &nbsp; '); },
          explain: 'q′를 2배, 3배로 하면 힘 F도 2배, 3배가 되지만 <b>F/q′는 그대로</b>예요. 이 값이 그 자리의 전기장 E예요. E는 시험 전하의 크기와 상관없이 전하 q가 공간에 만들어 둔 성질이고, 식으로는 E = F/q′ = kq/r²이에요.',
        },
        {
          title: 'E로 힘 계산하기', manual: true,
          goal: 'q = +1.0 μC에서 <b>r = 0.30 m</b>인 점(고리 위)에 <b>q′ = +2.0 nC</b>을 놓았어요. 받는 힘 F를 계산해 입력하세요.',
          hint: '먼저 화면에서 E를 읽고(또는 E = kq/r²), F = q′E에 대입해요. 2.0 nC = 2.0×10⁻⁹ C.',
          setup() { S.gate = 'num2'; S.f2.q = 1; S.f2.qp = 2; num2.clear(); setScene('field'); resetField({ x: R2.cx + 0.3 * R2.pxm, y: R2.cy }); },
          check: () => checkNum(num2, 2.0e-4, 0.03, '다시 계산해 보세요. E = kq/r² = 1.0×10⁵ N/C를 먼저 구하고, F = q′E = (2.0×10⁻⁹ C)(E)를 계산해요. 10의 거듭제곱도 확인해요.'),
          status: () => 'E = ' + sci(K * 1e-6 / 0.09) + ' N/C &nbsp; (힘 F는 숨겨 두었어요)',
          explain: 'E = kq/r² = (9.0×10⁹)(1.0×10⁻⁶) / (0.30)² = <b>1.0×10⁵ N/C</b>이에요. 그 자리의 +2.0 nC은 F = q′E = (2.0×10⁻⁹)(1.0×10⁵) = <b>2.0×10⁻⁴ N</b>의 힘을 받고, 방향은 전하에서 멀어지는 쪽이에요.',
        },
        {
          type: 'quiz', title: '시험 전하를 치우면?',
          goal: '시험 전하를 치우면 그 점의 전기장은 어떻게 될까요? (👻 버튼으로 직접 확인해 보세요)',
          setup() { S.gate = ''; S.f2.q = 1; setScene('field'); },
          choices: ['사라져요. 전기장은 힘을 받는 전하가 있을 때만 있어요', '전하 q가 만든 전기장이 그 자리에 그대로 있어요', '전기장은 두 전하 사이에만 존재해요', '절반으로 줄어들어요'],
          answer: 1,
          feedback: ['시험 전하는 전기장을 확인하는 도구일 뿐이에요. 👻 버튼으로 치워도 파란 화살표가 남았죠?', '', '전기장은 전하 주위의 공간 어디에나 있어요. 지도에서 전하 바깥에도 화살표가 있었죠?', '시험 전하는 전기장 E = kq/r²에 들어 있지 않아요. 치워도 값이 변하지 않아요.'],
          explain: '전기장은 전하 q가 주변 공간에 만든 성질이라서 시험 전하를 <b>치워도 그대로</b> 있어요. 시험 전하는 그 자리에 E가 있는지 확인하는 도구예요. 시험 전하를 놓으면 비로소 F = q′E의 힘이 나타나요.',
        },
      ],
    },
    {
      title: '거리 관계: E ∝ 1/r²', short: '거리 관계', icon: '📈', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전기장 E = kq/r²을 알았어요. 이 식이 말하는 모양을 직접 그래프로 확인해 봐요.</div>' +
        '<p>전하 q 둘레에서 거리 r을 바꿔 가며 전기장 E를 <b>측정</b>하고, 점을 찍어 E–r 그래프를 만들어요. 표의 <b>E × r²</b> 값에 주목해요. 전하량 q를 바꾸면 곡선이 어떻게 달라질까요?</p>',
      features: ['graph'],
      setup() { S.gate = ''; const f = S.f3; f.q = 1; f.r = 0.3; ['1', '2', '-1'].forEach((k) => { f.pts[k].forEach((p) => p.tw && p.tw.cancel()); f.pts[k] = []; f.curveT[k] = 0; }); f.firstDone = false; f.shown = false; setScene('graph'); },
      recap: '점전하의 전기장은 거리의 제곱에 반비례해요(E ∝ 1/r²). E × r² = kq는 일정하고, 전하량이 2배이면 곡선도 2배 높아져요. (−)전하는 크기가 같고 방향만 반대예요.',
      summary: '<ul><li>점전하의 전기장은 거리의 <b>제곱에 반비례</b>해요: E ∝ 1/r². 거리 2배 → E는 1/4, 거리가 1/2 → E는 4배.</li><li>E–r 그래프는 가까운 곳에서 <b>급격히 커지는 곡선</b>이에요. <b>E × r² = kq</b>는 늘 일정해요.</li><li>전하량 q가 2배이면 같은 r에서 E도 2배예요. (−)전하의 E는 크기가 같고 <b>방향만 반대</b>예요.</li><li>예) +1 μC: r = 0.10 m → 9.0×10⁵ N/C, 0.15 m → <b>4.0×10⁵</b>, 0.30 m → 1.0×10⁵, 0.60 m → 2.5×10⁴ N/C.</li></ul>',
      missions: [
        {
          title: 'E–r 그래프 만들기',
          goal: 'q = +1 μC에서 서로 다른 <b>다섯 곳</b>의 r을 골라 <b>📌 점 찍기</b>를 누르세요. 점이 모이면 곡선이 이어져요.',
          hint: '슬라이더로 r을 정하고 📌을 눌러요. 가까운 곳(0.1~0.3 m)과 먼 곳(0.5, 1.0 m)을 섞어 찍으면 모양이 잘 보여요.',
          setup() { S.gate = ''; S.f3.q = 1; setScene('graph'); },
          check: () => S.f3.firstDone,
          hold: 1.2,
          status: () => mark(pinsOf(1).length >= 5) + ' q = +1 μC 점 ' + Math.min(5, pinsOf(1).length) + ' / 5개',
          explain: '찍은 점들은 거리가 멀어질수록 E가 <b>급격히 줄어드는 곡선</b>이 돼요. 표에서 E × r²를 보면 모두 <b>9.0×10³ N·m²/C</b>(= kq)로 같아요. 그래서 E = kq/r², 즉 E는 r²에 반비례해요.',
        },
        {
          title: '0.15 m에서의 E 예측하기', manual: true,
          goal: 'E × r²가 일정하다는 것을 이용해, q = +1 μC에서 <b>r = 0.15 m</b>의 전기장 E를 구해 입력하세요.',
          hint: 'E = (E × r²) / r² = 9.0×10³ / (0.15)². 거리가 0.30 m의 절반이면 E는 몇 배일까요?',
          setup() { S.gate = 'num3'; S.f3.q = 1; S.f3.r = 0.15; num3.clear(); setScene('graph'); updateCtl(); },
          check: () => checkNum(num3, 4.0e5, 0.03, '다시 계산해 보세요. r = 0.15 m는 0.30 m의 절반이므로 E는 0.30 m(1.0×10⁵ N/C)의 4배예요. 10의 거듭제곱도 확인해요.'),
          status: () => 'E × r² = 9.0×10³ N·m²/C, r = 0.15 m &nbsp; (E 값은 숨겨 두었어요)',
          explain: 'E = kq/r² = (9.0×10⁹)(1.0×10⁻⁶) / (0.15)² = <b>4.0×10⁵ N/C</b>이에요. r이 0.30 m의 절반이 되었으니 E는 (1/2)⁻² = <b>4배</b>예요.',
        },
        {
          type: 'quiz', title: '거리가 2배가 되면?',
          goal: '점전하로부터의 거리 r이 <b>2배</b>가 되면 전기장의 세기 E는 몇 배가 될까요?',
          setup() { S.gate = ''; S.f3.r = 0.3; setScene('graph'); },
          choices: ['2배', '1/2배', '4배', '1/4배'],
          answer: 3,
          feedback: ['멀어지면 전기장은 약해져요. 그래프에서 오른쪽으로 갈수록 E가 어떻게 되나요?', '반비례이긴 하지만 거리의 1제곱이 아니라 제곱이에요. r = 0.30 m와 0.60 m의 값(1.0×10⁵ → 2.5×10⁴)을 비교해 보세요.', '거리가 2배가 되면 E는 작아져요.', ''],
          explain: 'E = kq/r²에서 r이 2배가 되면 E는 1/2² = <b>1/4</b>배가 돼요. 0.30 m에서 1.0×10⁵ N/C이던 E가 0.60 m에서 <b>2.5×10⁴ N/C</b>가 되는 것과 같아요.',
        },
      ],
    },
    {
      title: '전기장의 합: 벡터로 더하기', short: '전기장 합', icon: '➕', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 점전하 하나가 만드는 전기장 E = kq/r²을 구했어요. 전하가 여러 개이면 어떻게 될까요?</div>' +
        '<p>각 전하가 만드는 전기장을 따로 구해 <b>벡터로 더하면</b> 돼요(중첩). 화살표 두 개를 <b>평행사변형</b>으로 합성해요. 이렇게 전기장을 조절하는 기술이 <b>잉크젯 프린터</b> 등에 쓰여요.</p>',
      features: ['sum'],
      setup() { S.gate = ''; S.f4.px = 0.3; S.f4.seenPre = { a: true }; setScene('sum'); startSum('a'); },
      recap: '여러 전하의 전기장은 각 전하의 전기장을 벡터로 더해요. 같은 부호의 두 전하 사이에는 E = 0인 점이 있을 수 있지만, 다른 부호 사이에는 없어요.',
      summary: '<ul><li>여러 전하가 만드는 전기장은 각 전하의 전기장을 <b>벡터로 더한</b> 것이에요(<b>중첩</b>). 화살표를 평행사변형으로 합성하거나 x, y 성분을 따로 더해요.</li><li>(a) +2 μC와 +8 μC가 0.60 m 떨어져 있으면 E = 0인 점은 두 전하 사이 +2 μC에서 <b>0.20 m</b> 지점이에요. (r₁ : r₂ = 1 : 2, 각각 4.5×10⁵ N/C가 서로 상쇄)</li><li>(b) +2 μC 두 개, P(0, 0.40 m): 각 E = 7.2×10⁴ N/C, x 성분은 상쇄 → <b>1.15×10⁵ N/C 위쪽</b>.</li><li>(c) +2 μC와 −2 μC: y 성분이 상쇄, x 성분이 더해져 <b>8.64×10⁴ N/C</b>, (−)전하 쪽(+x)이에요.</li><li>🏭 잉크젯 프린터는 대전된 잉크 방울이 전기장에서 받는 힘 F = qE로 휘는 정도를 조절해 글자를 찍어요.</li></ul>',
      missions: [
        {
          title: 'E합이 0인 점 찾기',
          goal: '(a) 배치에서 점 P를 옮겨 두 전기장이 상쇄되어 <b>E합 = 0</b>이 되는 곳을 찾으세요.',
          hint: 'E₁(왼쪽 전하 2 μC)과 E₂(오른쪽 전하 8 μC)의 길이가 같아지는 곳이에요. 전하량이 작은 쪽에 더 가까운 곳이에요. ◀ ▶ 버튼으로 0.01 m씩 조절해요.',
          setup() { S.gate = ''; S.f4.px = 0.3; setScene('sum'); startSum('a'); setPx(0.3); },
          check: () => S.f4.pre === 'a' && Math.abs(S.f4.px - 0.2) < 0.005,
          hold: 0.8,
          status: () => mark(S.f4.pre === 'a' && Math.abs(S.f4.px - 0.2) < 0.005) + ' P의 위치 x = ' + S.f4.px.toFixed(2) + ' m &nbsp; E합 = ' + (() => { const n = netAt('a', { x: S.f4.px, y: 0 }); const m = Math.hypot(n.x, n.y); return m < 1e3 ? '0' : sci(m) + ' N/C'; })(),
          explain: '두 전기장의 크기가 같아지려면 k·2/r₁² = k·8/r₂², 즉 r₂ = 2r₁이에요. 전하 사이 0.60 m를 1 : 2로 나누면 +2 μC에서 <b>0.20 m</b>, +8 μC에서 0.40 m인 점이에요. 이때 E₁ = E₂ = <b>4.5×10⁵ N/C</b>이고 방향이 반대라서 E합 = 0이에요.',
        },
        {
          title: '합성 화살표 입력하기', manual: true,
          goal: '(b), (c) 배치에서 점 P(0, 0.40 m)의 <b>E합</b>의 크기와 방향을 구해 입력하세요. (▶ 벡터 더하기로 평행사변형을 관찰해요)',
          hint: '각 전하까지 거리는 0.50 m이므로 E₁ = E₂ = 7.2×10⁴ N/C예요. 합의 크기 = 2 × 7.2×10⁴ × (성분 비). (b)는 y 성분 0.8, (c)는 x 성분 0.6이에요.',
          setup() { S.gate = 'num4'; num4b.clear(); num4c.clear(); dir4b.value = ''; dir4c.value = ''; dir4b.className = dir4c.className = 'sel-in'; setScene('sum'); startSum('b'); },
          check: check4,
          status: () => '(b) ' + mark(numOK(num4b, T4m.b, 0.05) === true && +dir4b.value === 1) + ' &nbsp; (c) ' + mark(numOK(num4c, T4m.c, 0.05) === true && +dir4c.value === 3) + ' &nbsp; (값은 숨겨 두었어요)',
          explain: '(b) 두 전기장의 x 성분은 상쇄되고 y 성분만 남아 E합 = 2 × 7.2×10⁴ × 0.8 = <b>1.15×10⁵ N/C, 위쪽</b>이에요. (c) (−)전하의 전기장은 전하 쪽을 향하므로 y 성분이 상쇄되고 x 성분이 더해져 E합 = 2 × 7.2×10⁴ × 0.6 = <b>8.64×10⁴ N/C</b>, (−)전하 쪽(+x)이에요.',
        },
        {
          type: 'quiz', title: 'E = 0인 점이 있을까?',
          goal: '두 점전하가 만드는 전기장에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { S.gate = ''; setScene('sum'); },
          choices: ['같은 부호의 두 전하 사이에는 E = 0인 점이 있을 수 있지만, 다른 부호의 두 전하 사이에서는 두 전기장이 같은 방향이라 0이 될 수 없어요', '다른 부호의 두 전하 사이에도 E = 0인 점이 한 곳 있어요', '전하가 하나뿐일 때도 아주 멀리 가면 E가 정확히 0이 되는 점이 있어요', '같은 부호의 두 전하 사이에서 E = 0이 되려면 두 전하량이 같아야만 해요'],
          answer: 0,
          feedback: ['', '다른 부호의 두 전하 사이에서는 (+)에서 멀어지는 방향과 (−)를 향하는 방향이 같아서 두 전기장이 서로 더해져요. 상쇄되지 않아요.', '멀어질수록 E = kq/r²은 계속 작아지지만 정확히 0은 되지 않아요. 한 전하만 있으면 E = 0인 점이 없어요.', '전하량이 달라도 가까운 쪽에서 약하고 먼 쪽에서 강해 균형이 되는 점이 있어요. 방금 찾은 (a)가 그런 경우예요.'],
          explain: '같은 부호의 두 전하 사이에서는 두 전기장이 서로 <b>반대 방향</b>이라 상쇄될 수 있어요(전하량이 다르면 작은 쪽에 가까운 점). 다른 부호 사이에서는 두 전기장이 <b>같은 방향</b>이라 더해지기만 해서 0이 될 수 없어요. 전하가 하나뿐이면 어디서나 E = kq/r² ≠ 0이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-electric-field', mount: '#game', badge: '전기장 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { force: '⚡ 두 점전하 · 전기력 표', field: '🧭 전기장 지도 · 시험 전하', graph: '📈 E–r 그래프', sum: '➕ 전기장의 합 · 잉크젯' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetField(); updateCtl();
  function stepAll1(dt) {
    if (S.mode === 'force') stepForce(dt);
    else if (S.mode === 'field') stepField(dt);
    else if (S.mode === 'graph') stepGraph(dt);
    else stepSum(dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    if (S.mode === 'force') drawForce(); else if (S.mode === 'field') drawField(); else if (S.mode === 'graph') drawGraph(); else drawSum();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, ROWS, R2, G, ST, SO, SPX, INK, AX0, PXM, AY, K, PRE, sx, sy, gx, gy, num1, num2, num3, num4b, num4c, dir4b, dir4c, T4m,
    get game() { return game; }, setScene, startSum, setPx, placeProbe, recordRow, pinPoint, f2Geo, f2log, netAt, xAB, Eof, resetField, setQp, setQ2, check4,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
