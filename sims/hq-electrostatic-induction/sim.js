/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 정전기 유도와 분극 (단원 3차시)
   성취기준 [12전자01-02] 정전기 유도와 유전분극을 설명하고, 일상생활에서 적용되는 예를 찾을 수 있다.
   ① 관찰: 정전기 유도 (금속 막대 속 자유전자의 이동, 전하량 보존)
   ② 실험: 유도 대전 (검전기 + 접지), 정전 차폐 (도체 상자 속 E = 0)
   ③ 모형: 유전 분극 (종이 조각, 극성·무극성 분자, 유전 상수 κ, 축전기 C = κC₀)
   ④ 적용: 생활 속 적용 (사례 분류, 정전식 터치스크린)
   분극 벡터, 유전율 ε의 단위 계산, 이미지 전하법, 압전·강유전체는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
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
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function sceneBg() {
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#eaf1fb'); g.addColorStop(1, '#f7f9fd');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function lbl(x, y, text, o) {
    o = o || {}; const size = o.size || (PHONE ? 12 : 13), pad = o.pad != null ? o.pad : 8;
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
  const g3 = (x) => String(parseFloat((x * (1 + 1e-12)).toPrecision(3)));
  const sgn = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
  const fe = (v, d) => (Math.abs(v) < 0.05 ? '0' : sgn(v) + Math.abs(v).toFixed(d == null ? 1 : d));
  const POS = '#e2464b', NEG = '#2f6df6', COL_F = '#f26b3a';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const seeded = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ---------- 숫자 입력 · 선택 상자 ---------- */
  function makeNum(host, q, pre, unit, noExp) {
    const row = document.createElement('div'); row.className = 'numrow';
    const exps = []; for (let e = -3; e <= 6; e++) exps.push('<option value="' + e + '"' + (e === 0 ? ' selected' : '') + '>10' + sup(e) + '</option>');
    row.innerHTML = '<div class="q">' + q + '</div><span class="pre">' + pre + '</span>' +
      '<input class="num-in" type="number" step="any" inputmode="decimal" aria-label="' + q.replace(/<[^>]+>/g, '') + ' 계수">' +
      (noExp ? '' : '<span class="pre">×</span><select class="num-in" aria-label="10의 거듭제곱">' + exps.join('') + '</select>') + '<span class="unit">' + unit + '</span>';
    host.appendChild(row);
    const inp = row.querySelector('input'), sel = row.querySelector('select');
    const nodes = sel ? [inp, sel] : [inp];
    const h = {
      row, inp, sel, st: null,
      val() { const s = inp.value.trim().replace(',', '.'); if (s === '' || isNaN(+s)) return NaN; return +s * (sel ? Math.pow(10, +sel.value) : 1); },
      clear() { inp.value = ''; if (sel) sel.value = '0'; nodes.forEach((n) => n.classList.remove('ok', 'bad')); h.st = null; },
      mark(ok) { if (h.st === ok) return; h.st = ok; nodes.forEach((n) => { n.classList.remove('ok', 'bad'); if (ok === false) { void n.offsetWidth; n.classList.add('bad'); } else if (ok) n.classList.add('ok'); }); },
    };
    nodes.forEach((n) => n.addEventListener('input', () => { h.st = null; nodes.forEach((m) => m.classList.remove('ok', 'bad')); }));
    return h;
  }
  function numOK(h, target, tol) { const v = h.val(); if (isNaN(v)) return null; return Math.abs(v - target) <= tol * Math.abs(target); }
  function makeSelects(host, rules, store, okStore) {
    const sels = [];
    rules.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + r[0] + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r[0].replace(/<[^>]+>/g, ''));
      sel.innerHTML = '<option value="">— 고르기 —</option>' + r[1].map((o, j) => '<option value="' + (j + 1) + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { store[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okStore[i]; Sound.click(); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    return sels;
  }
  function selMark(sel, i, ok, okStore) { if (okStore[i] === ok) return; okStore[i] = ok; sel.classList.remove('ok', 'bad'); if (ok) sel.classList.add('ok'); else { void sel.offsetWidth; sel.classList.add('bad'); } }
  function resetSels(sels, store, okStore) { Object.keys(store).forEach((k) => delete store[k]); Object.keys(okStore).forEach((k) => delete okStore[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  function checkSel(rules, store, ok, sels, msg) {
    const miss = rules.filter((r, i) => !store[i]).length; if (miss) return '아직 고르지 않은 문제가 ' + miss + '개 있어요.';
    let bad = 0; rules.forEach((r, i) => { const o = +store[i] - 1 === r[2]; if (!o) bad++; selMark(sels[i], i, o, ok); });
    return bad ? msg : true;
  }
  function checkNum(h, target, tol, hintMsg) { const ok = numOK(h, target, tol); if (ok === null) return '값을 입력해 주세요.'; h.mark(ok); return ok ? true : hintMsg; }

  /* ---------- 상태 ---------- */
  const NE = 24, NI = 12;                                  // 전자 24개, 막대 하나당 양이온 12개
  const S = {
    mode: 'induce', t: 0, fade: 0, gate: '',
    ind: { sign: 1, bx: 0, sep: 0, sepGoal: false, els: [], flags: {}, tw: null, twB: null, drag: false, dOff: 0, sA: 0, sB: 0 },
    sc: { sub: 'scope', sign: -1, xt: 0, grounded: false, Qt: 0, Ql: 0, Qd: 0, leaf: 0, flags: {}, grSigma: 0, drag: false, dOff: 0, tw: null, box: 'metal', ind: 1, probe: { x: 0, y: 0 }, pdrag: false, flow: [] },
    de: { sub: 'paper', stage: 0, stF: 0, k: 1, kd: 1, mol: 'polar', conn: true, switchT: 0, Q: 1, Qd: 1, order: [], tw: null },
    ap: { sub: 'cards', cards: [], drag: null, touch: { x: 0, y: 0, glove: 'bare', drag: false, ripples: [] }, dropN: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { induce: '🎈 정전기 유도', electro: '🔌 유도 대전', dielec: '🧻 유전 분극', apply: '🏠 생활 속 적용' };
  const curSub = () => (S.mode === 'electro' ? S.sc.sub : S.mode === 'dielec' ? S.de.sub : S.mode === 'apply' ? S.ap.sub : '');

  /* ================= ① 정전기 유도 ================= */
  const G1 = PHONE ? { ax0: 168, rw: 92, rh: 38, sepMax: 70, y: 232, bR: 26, bx0: 44, SR: 90, es: 9, bars: { y: 402, sc: 10, cx: 240 }, panelY: 320 }
    : { ax0: 250, rw: 150, rh: 44, sepMax: 110, y: 240, bR: 36, bx0: 62, SR: 150, es: 12, bars: { y: 420, sc: 15, cx: 400 }, panelY: 350 };
  G1.bx1 = G1.ax0 - 14 - G1.bR;
  const rodA = () => ({ x0: G1.ax0, x1: G1.ax0 + G1.rw });
  const rodB = () => { const x0 = G1.ax0 + G1.rw + 2 + S.ind.sep * G1.sepMax; return { x0, x1: x0 + G1.rw }; };
  const sOf = (gap) => Math.pow(clamp(1 - (gap - 14) / G1.SR, 0, 1), 2);
  const gJ = (u, p, sg) => (sg > 0 ? Math.pow(u, p) : 1 - Math.pow(1 - u, p));
  function calcS() {
    const f = S.ind, A = rodA(), B = rodB();
    f.sA = sOf(A.x0 - (f.bx + G1.bR)); f.sB = sOf(B.x0 - (f.bx + G1.bR));
  }
  function initInd() {
    const f = S.ind; if (f.tw) f.tw.cancel(); if (f.twB) f.twB.cancel(); f.tw = f.twB = null;
    f.bx = G1.bx0; f.sep = 0; f.sepGoal = false; f.flags = {}; f.drag = false;
    f.els = []; for (let k = 0; k < NE; k++) f.els.push({ u: (k + 0.5) / NE, rod: 'J', v: 0, x: 0, y: 0, seed: k * 1.7 + 0.3 });
    calcS(); f.els.forEach((e) => { e.x = elTarget(e).x; e.y = elTarget(e).y; });
  }
  function elTarget(e) {
    const f = S.ind, A = rodA(), B = rodB(), k = f.els.indexOf(e), sg = f.sign, row = (k % 3) - 1;
    let x;
    if (e.rod === 'J') { const L = B.x1 - A.x0 - 16; x = A.x0 + 8 + L * gJ(e.u, 1 + 2.2 * f.sA, sg); }
    else { const R = e.rod === 'A' ? A : B, s = e.rod === 'A' ? f.sA : f.sB; x = R.x0 + 8 + (G1.rw - 16) * gJ(e.v, 1 + 2.2 * s, sg); }
    return { x, y: G1.y + row * (G1.es - 1) };
  }
  function counts() {
    const f = S.ind; let nA = 0;
    if (!f.sepGoal) f.els.forEach((e) => { if (gJ(e.u, 1 + 2.2 * f.sA, f.sign) < 0.5) nA++; });
    else f.els.forEach((e) => { if (e.rod === 'A') nA++; });
    return { QA: NI - nA, QB: NI - (NE - nA), nA };
  }
  function toggleSep() {
    const f = S.ind; if (f.tw) return;
    if (!f.sepGoal) {
      const cn = counts().nA;
      const byU = f.els.slice().sort((a, b) => gJ(a.u, 1 + 2.2 * f.sA, f.sign) - gJ(b.u, 1 + 2.2 * f.sA, f.sign));
      byU.forEach((e, i) => { e.rod = i < cn ? 'A' : 'B'; e.v = ((i < cn ? i : i - cn) + 0.5) / (i < cn ? cn : NE - cn); });
      f.sepGoal = true; Sound.click();
      if (f.sA > 0.5) f.flags.sep = true;
      f.tw = SciSim.tween(f, { sep: 1 }, { duration: RM ? 0.01 : 0.9, ease: 'outBack', onDone: () => { f.tw = null; updateCtl(); } });
    } else {
      const byX = f.els.slice().sort((a, b) => a.x - b.x);
      byX.forEach((e, i) => { e.rod = 'J'; e.u = (i + 0.5) / NE; });
      f.sepGoal = false; Sound.click();
      f.tw = SciSim.tween(f, { sep: 0 }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic', onDone: () => { f.tw = null; updateCtl(); } });
    }
    updateCtl();
  }
  $('#bSep').addEventListener('click', toggleSep);
  $('#bFar').addEventListener('click', () => { Sound.click(); const f = S.ind; if (f.twB) f.twB.cancel(); f.twB = SciSim.tween(f, { bx: G1.bx0 }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic', onDone: () => { f.twB = null; } }); });
  $$('#bodySeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ind.sign = +b.dataset.v; updateCtl(); }));
  function stepInd(dt) {
    const f = S.ind; calcS();
    f.els.forEach((e) => { const t = elTarget(e); e.x += (t.x - e.x) * (1 - Math.exp(-9 * dt)); e.y += (t.y - e.y) * (1 - Math.exp(-9 * dt)); });
    if (f.sA > 0.5) f.flags.near = true;
    const q = counts(); if (f.sepGoal && !f.tw && f.sep > 0.99 && f.sA < 0.05 && Math.abs(q.QA) >= 4) f.flags.far = true;
  }
  const bodyPix = () => ({ x: S.ind.bx, y: G1.y });
  function drawInd() {
    sceneBg(); const f = S.ind, A = rodA(), B = rodB(), q = counts();
    T(14, 26, '🎈 대전체를 가까이 하면 금속 막대 속 전자는?', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 받침과 책상
    ctx.fillStyle = '#d9e1ee'; ctx.fillRect(10, G1.y + G1.rh / 2 + 36, VW - 20, 6);
    [A, B].forEach((R) => { [R.x0 + 14, R.x1 - 26].forEach((x) => { D.roundRect(x, G1.y + G1.rh / 2, 12, 36, 3); ctx.fillStyle = '#b8e0f0'; ctx.fill(); }); });
    T(10 + 4, G1.y + G1.rh / 2 + 56, '플라스틱 받침 (전하가 새지 않아요)', PHONE ? 11 : 12.5, '#516079', 'left', 700);
    // 막대
    [[A, 'A', q.QA], [B, 'B', q.QB]].forEach((a) => {
      const R = a[0]; const g = ctx.createLinearGradient(0, G1.y - G1.rh / 2, 0, G1.y + G1.rh / 2); g.addColorStop(0, '#f1f5f9'); g.addColorStop(0.5, '#cbd5e1'); g.addColorStop(1, '#94a3b8');
      D.shadow(() => { D.roundRect(R.x0, G1.y - G1.rh / 2, G1.rw, G1.rh, 12); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; D.roundRect(R.x0, G1.y - G1.rh / 2, G1.rw, G1.rh, 12); ctx.stroke();
      T((R.x0 + R.x1) / 2, G1.y - G1.rh / 2 - 8, '금속 막대 ' + a[1], PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    });
    // 양이온 (고정)
    [A, B].forEach((R) => { for (let i = 0; i < NI; i++) { const c = i % 6, r = (i / 6) | 0; T(R.x0 + (c + 0.5) * G1.rw / 6, G1.y + (r ? 1 : -1) * G1.es * 0.9 + 4, '+', PHONE ? 11 : 13, 'rgba(226,70,75,.75)', 'center', 800); } });
    // 전자
    f.els.forEach((e, i) => {
      const jx = RM ? 0 : Math.sin(S.t * 3 + e.seed) * 1.1, jy = RM ? 0 : Math.cos(S.t * 2.6 + e.seed * 1.3) * 1.1;
      D.sphere(e.x + jx, e.y + jy, PHONE ? 4.4 : 5.4, '#2f6df6', { gloss: false, text: '−', textScale: 1.5 });
    });
    // 대전체
    const bp = bodyPix(), bcol = f.sign > 0 ? POS : NEG;
    D.glow(bp.x, bp.y, G1.bR * 2.2, bcol, 0.35); D.sphere(bp.x, bp.y, G1.bR, bcol, { shadow: true, text: f.sign > 0 ? '+' : '−' });
    if (f.drag) D.ring(bp.x, bp.y, G1.bR + 6, S.t, { color: '#f26b3a', width: 2 });
    T(bp.x, bp.y - G1.bR - 10, '대전체', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    if (!f.flags.near && !f.drag && S.t > 1.5) { D.arrow(bp.x + G1.bR + 34, bp.y + G1.bR + 28, bp.x + G1.bR + 6, bp.y + 6, { color: COL_F, width: 3 }); }
    // 끌림 화살표
    if (f.sA > 0.15 && !f.sepGoal) { T((A.x0 + B.x1) / 2, G1.y - G1.rh / 2 - 30, f.sign > 0 ? '전자가 대전체 쪽으로 끌려와요' : '전자가 대전체에게 밀려 멀어져요', PHONE ? 12 : 14, '#9a3412', 'center', 800); }
    drawBars(q);
  }
  function drawBars(q) {
    const f = S.ind, y0 = G1.panelY, w = VW - 24, h = VH - y0 - 8, bs = G1.bars;
    panel(12, y0, w, h, 14);
    T(26, y0 + 24, '전하 분포 (e = 전자 1개의 전하량)', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    T(26, y0 + 44, 'Q = (양이온 수 − 전자 수) × e', PHONE ? 11.5 : 13, '#516079', 'left', 700);
    const rows = [['막대 A', q.QA, bs.y], ['막대 B', q.QB, bs.y + (PHONE ? 54 : 56)]];
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bs.cx, bs.y - 26); ctx.lineTo(bs.cx, bs.y + (PHONE ? 80 : 84)); ctx.stroke();
    T(bs.cx, bs.y - 32, '0', 12, '#516079', 'center', 800);
    rows.forEach((r) => {
      const len = r[1] * bs.sc, y = r[2];
      T(bs.cx - 12 * bs.sc - 8, y + 5, r[0], PHONE ? 12.5 : 14, '#26324a', 'right', 800);
      D.roundRect(bs.cx - 12 * bs.sc, y - 14, 24 * bs.sc, 28, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      if (Math.abs(len) > 0.5) { ctx.fillStyle = r[1] > 0 ? 'rgba(226,70,75,.85)' : 'rgba(47,109,246,.85)'; ctx.fillRect(Math.min(bs.cx, bs.cx + len), y - 14, Math.abs(len), 28); }
      T(bs.cx + 12 * bs.sc + 10, y + 5, fe(r[1], 0) + ' e' + (r[1] ? '' : ' (중성)'), PHONE ? 12.5 : 14, r[1] > 0 ? '#9f1d22' : r[1] < 0 ? '#1d4ed8' : '#516079', 'left', 800);
    });
    T(26, y0 + h - 14, '두 막대 전체: ' + fe(q.QA + q.QB, 0) + ' e' + (q.QA + q.QB === 0 ? ' → 합은 0 (전하량 보존)' : ''), PHONE ? 12.5 : 14, '#0b7a41', 'left', 800);
  }
  function indDown(p) {
    const f = S.ind, bp = bodyPix();
    if (Math.hypot(p.x - bp.x, p.y - bp.y) <= G1.bR + 14) { if (f.twB) { f.twB.cancel(); f.twB = null; } f.drag = true; f.dOff = bp.x - p.x; Sound.click(); return true; }
    return false;
  }
  function indMove(p) { const f = S.ind; if (f.drag) f.bx = clamp(p.x + f.dOff, G1.bx0, G1.bx1); }

  /* ================= ② 유도 대전 : 검전기 · 정전 차폐 ================= */
  const SP = PHONE ? { cx: 214, dy: 236, dw: 38, jx: 154, jy: 318, jw: 120, jh: 142, py: 352, ll: 62, rodL: 108, near: 214 + 38 + 22, far: 214 + 38 + 22 + 92, gx: 70, gy: 548, panelY: 470 }
    : { cx: 400, dy: 232, dw: 50, jx: 330, jy: 300, jw: 140, jh: 170, py: 345, ll: 80, rodL: 150, near: 400 + 50 + 22, far: 400 + 50 + 22 + 146, gx: 262, gy: 506, panelY: 0 };
  const KQ = 6;
  const scS = () => Math.pow(clamp(1 - (S.sc.xt - SP.near) / (SP.far - SP.near), 0, 1), 2);
  function initScope() { const s = S.sc; if (s.tw) s.tw.cancel(); s.tw = null; s.xt = SP.far; s.grounded = false; s.Qt = 0; s.Ql = 0; s.Qd = 0; s.leaf = 0; s.flags = {}; s.grSigma = 0; s.drag = false; s.flow = []; }
  function stepScope(dt) {
    const s = S.sc, sv = scS();
    if (s.grounded) { const tg = -s.sign * KQ * sv, old = s.Qt; s.Qt = SciSim.approach(s.Qt, tg, dt, 3); const dq = s.Qt - old; if (Math.abs(dq) > 0.002 && !RM && Math.random() < 0.6) s.flow.push({ t: 0, dir: dq > 0 ? 1 : -1 }); }
    s.Ql = s.Qt / 2 + s.sign * (KQ / 2) * sv; s.Qd = s.Qt - s.Ql;
    const tl = 38 * Math.min(1, Math.abs(s.Ql) / 3); s.leaf = SciSim.approach(s.leaf, tl, dt, 8);
    for (let i = s.flow.length - 1; i >= 0; i--) { s.flow[i].t += dt * 1.6; if (s.flow[i].t >= 1) s.flow.splice(i, 1); }
    const fl = s.flags;
    if (sv > 0.4) fl.near = true;
    if (fl.near && s.grounded && sv > 0.4 && !fl.gnd) { fl.gnd = true; s.grSigma = s.sign; }
    if (fl.gnd && !s.grounded && !fl.ungnd && sv > 0.3) fl.ungnd = true;
    if (fl.ungnd && sv < 0.05) fl.far = true;
    S.sc.ind = SciSim.approach(S.sc.ind, S.sc.box === 'metal' ? 1 : 0, dt, 4);
  }
  const scopeDone = () => { const s = S.sc; return !!s.flags.far && !s.grounded && Math.abs(s.Qt) >= 2.5 && Math.sign(s.Qt) === -s.grSigma; };
  function toggleGnd() { const s = S.sc; s.grounded = !s.grounded; Sound.click(); if (!s.grounded) s.flow = []; updateCtl(); }
  $('#bGnd').addEventListener('click', toggleGnd);
  $('#bRodAway').addEventListener('click', () => { Sound.click(); const s = S.sc; if (s.tw) s.tw.cancel(); s.tw = SciSim.tween(s, { xt: SP.far }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic', onDone: () => { s.tw = null; } }); });
  $$('#rodSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sc.sign = +b.dataset.v; updateCtl(); }));
  $$('#sub2Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sc.sub = b.dataset.v; S.fade = 0.7; updateCtl(); }));
  $$('#boxSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sc.box = b.dataset.v; updateCtl(); }));
  function symbols(n, sign, pts) {
    const k = Math.round(n); for (let i = 0; i < k && i < pts.length; i++) { const p = pts[i], w = RM ? 0 : Math.sin(S.t * 3 + i) * 1; T(p[0], p[1] + 4 + w, sign > 0 ? '+' : '−', PHONE ? 13 : 16, sign > 0 ? '#c1272d' : '#1d4ed8', 'center', 800); }
  }
  function drawScope() {
    const s = S.sc, sv = scS(), cx = SP.cx, th = s.leaf * DEG;
    T(14, 26, '🔌 검전기: 막대를 닿지 않게 가까이 해요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 접지선
    const wy = SP.dy, wx0 = cx - SP.dw, wx1 = SP.gx;
    ctx.strokeStyle = s.grounded ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.setLineDash(s.grounded ? [] : [3, 7]);
    ctx.beginPath(); ctx.moveTo(wx0 - 4, wy); ctx.lineTo(wx1, wy); ctx.lineTo(wx1, SP.gy - 10); ctx.stroke(); ctx.setLineDash([]);
    // 접지 기호
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; [[26, 0], [18, 7], [9, 14]].forEach((a) => { ctx.beginPath(); ctx.moveTo(wx1 - a[0], SP.gy - 10 + a[1]); ctx.lineTo(wx1 + a[0], SP.gy - 10 + a[1]); ctx.stroke(); });
    T(wx1, SP.gy + 22, '땅 (접지)', PHONE ? 12 : 13.5, '#475569', 'center', 800);
    T(wx0 - (PHONE ? 6 : 10), wy - 16, s.grounded ? '🖐 접지됨' : '☝ 접지 안 함', PHONE ? 12 : 14, s.grounded ? '#9a3412' : '#516079', 'right', 800);
    s.flow.forEach((fo) => { const a = wx0 - 4 - wx1, b = SP.gy - 10 - wy, d = (fo.dir > 0 ? fo.t : 1 - fo.t) * (a + b); let x, y; if (d < a) { x = wx0 - 4 - d; y = wy; } else { x = wx1; y = wy + (d - a); } D.sphere(x, y, 4, '#2f6df6', { gloss: false }); });
    // 유리병
    ctx.save(); ctx.fillStyle = 'rgba(190,225,245,.22)'; D.roundRect(SP.jx, SP.jy, SP.jw, SP.jh, 16); ctx.fill(); ctx.strokeStyle = 'rgba(100,140,170,.65)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    // 막대·금속판·금박
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, SP.dy + 6); ctx.lineTo(cx, SP.py); ctx.stroke();
    const lx = cx - Math.sin(th) * SP.ll, rx = cx + Math.sin(th) * SP.ll, ly = SP.py + Math.cos(th) * SP.ll;
    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, SP.py); ctx.lineTo(lx, ly); ctx.moveTo(cx, SP.py); ctx.lineTo(rx, ly); ctx.stroke();
    D.shadow(() => { ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(cx, SP.dy, SP.dw, PHONE ? 8 : 10, 0, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, SP.dy, SP.dw, PHONE ? 8 : 10, 0, 0, TAU); ctx.stroke();
    T(cx + SP.dw + 10, SP.dy - 18, '금속판', PHONE ? 12 : 13, '#26324a', 'left', 800); T(cx + SP.jw / 2 + 8, SP.py + 22, '금박', PHONE ? 12 : 13, '#26324a', 'left', 800);
    // 전하 기호
    const dpts = []; for (let i = 0; i < 8; i++) dpts.push([cx - SP.dw + 14 + i * (2 * SP.dw - 28) / 7, SP.dy - (i % 2 ? 6 : 14) - (PHONE ? 2 : 4)]);
    symbols(Math.abs(s.Qd), Math.sign(s.Qd), dpts);
    const lpts = []; for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1, f = 0.35 + 0.55 * ((i >> 1) / 3.5); lpts.push([cx + side * (Math.sin(th) * SP.ll * f + (side * 9)), SP.py + Math.cos(th) * SP.ll * f]); }
    symbols(Math.abs(s.Ql), Math.sign(s.Ql), lpts);
    // 막대 (대전체)
    const ry = SP.dy, rx0 = s.xt, ccol = s.sign > 0 ? POS : NEG;
    D.shadow(() => { D.roundRect(rx0, ry - 14, SP.rodL, 28, 14); ctx.fillStyle = ccol; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(rx0 + SP.rodL, ry - 9, 40, 18, 8); ctx.fillStyle = '#9aa5b8'; ctx.fill();
    for (let i = 0; i < 4; i++) T(rx0 + 18 + i * (SP.rodL - 30) / 3, ry + 6, s.sign > 0 ? '+' : '−', 16, '#fff', 'center', 800);
    T(rx0 + SP.rodL / 2, ry - 24, '대전된 막대 (' + (s.sign > 0 ? '+' : '−') + ')', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    if (s.drag) D.ring(rx0 + SP.rodL / 2, ry, 22, S.t, { color: '#f26b3a', width: 2 });
    if (!s.flags.near && !s.drag && S.t > 1.5) D.arrow(rx0 + SP.rodL * 0.6, ry + 44, rx0 + SP.rodL * 0.6 - 18, ry + 20, { color: COL_F, width: 3 });
    // 안내 패널
    const px = PHONE ? 12 : 14, py = PHONE ? 54 : 62, pw = PHONE ? VW - 24 : 292, ph = PHONE ? 100 : 160;
    panel(px, py, pw, ph, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = py + 24;
    T(px + 12, y, '지금 전하 상태', sz + 0.5, '#1e40af', 'left', 800);
    y += lh; T(px + 12, y, '금속판 ' + fe(s.Qd) + ' e · 금박 ' + fe(s.Ql) + ' e', sz, '#26324a', 'left', 800);
    y += lh; T(px + 12, y, '검전기 전체 Qt = ' + fe(s.Qt) + ' e' + (Math.abs(s.Qt) < 0.05 ? ' (중성)' : ''), sz, '#9a3412', 'left', 800);
    if (!PHONE) { y += lh; T(px + 12, y, '금박이 벌어진 각 ' + Math.round(s.leaf * 2) + '°', sz, '#26324a', 'left', 800); y += lh; T(px + 12, y, s.grounded ? '접지: 전자가 땅으로/에서 이동해요' : '접지 안 함: 전체 전하 변화 없음', sz - 1, '#516079', 'left', 700); }
  }
  function drawShield() {
    const s = S.sc, plastic = s.box === 'plastic';
    T(14, 26, '📦 정전 차폐: 큰 전기장 속의 상자', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const bx0 = PHONE ? 130 : 270, bx1 = PHONE ? 350 : 530, by0 = PHONE ? 210 : 200, by1 = PHONE ? 390 : 400, wt = 14, E0 = 1.0e4;
    const rows = []; for (let y = (PHONE ? 100 : 110); y < (PHONE ? 470 : 490); y += (PHONE ? 54 : 58)) rows.push(y);
    // 바깥 전기장 화살표 (→)
    rows.forEach((y, ri) => {
      const inBox = y > by0 + 4 && y < by1 - 4, off = RM ? 0 : (S.t * 40 + ri * 17) % 40;
      for (let x = 24 - 40 + off; x < VW - 24; x += 40) {
        if (inBox && !plastic && x + 24 > bx0 - 2 && x < bx1 + 2) continue;        // 금속 상자: 안쪽에는 전기장이 없어요
        if (x < 14) continue;
        D.arrow(x, y, x + 24, y, { color: 'rgba(37,99,235,.55)', width: 2.4, head: 8 });
      }
    });
    // 상자
    const mc = s.ind;
    ctx.save();
    if (plastic) { ctx.fillStyle = 'rgba(250,215,150,.35)'; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0); }
    else { ctx.fillStyle = 'rgba(203,213,225,.25)'; ctx.fillRect(bx0 + wt, by0 + wt, bx1 - bx0 - 2 * wt, by1 - by0 - 2 * wt); }
    ctx.restore();
    const wallCol = plastic ? '#e0b060' : '#94a3b8';
    D.roundRect(bx0, by0, bx1 - bx0, by1 - by0, 10); ctx.strokeStyle = wallCol; ctx.lineWidth = wt; ctx.stroke();
    T((bx0 + bx1) / 2, by0 - 14, plastic ? '플라스틱(절연체) 상자' : '금속 상자 (도체)', PHONE ? 13 : 15, '#26324a', 'center', 800);
    T((bx0 + bx1) / 2, (by0 + by1) / 2 + 60, '🧍', 34, '#000', 'center', 700);
    // 안쪽 전기장 (플라스틱은 그대로, 금속은 0)
    // 금속 표면의 유도 전하
    if (!plastic || mc > 0.02) {
      const n = 7, a = clamp(mc, 0, 1);
      for (let i = 0; i < n; i++) {
        const y = by0 + 26 + i * (by1 - by0 - 52) / (n - 1);
        ctx.globalAlpha = a; T(bx0 - 14, y + 5, '−', 18, '#1d4ed8', 'center', 800); T(bx1 + 14, y + 5, '+', 18, '#c1272d', 'center', 800); ctx.globalAlpha = 1;
      }
    }
    if (!plastic) lbl((bx0 + bx1) / 2, (by0 + by1) / 2 - 30, '상자 속 E = 0', { bg: '#16a34a', color: '#fff', size: PHONE ? 13 : 15 });
    else lbl((bx0 + bx1) / 2, (by0 + by1) / 2 - 30, '전기장이 그대로 통과', { bg: '#f59e0b', color: '#fff', size: PHONE ? 12 : 14 });
    // 탐침
    const pr = s.probe;
    D.shadow(() => { ctx.strokeStyle = '#26324a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pr.x - 11, pr.y); ctx.lineTo(pr.x + 11, pr.y); ctx.moveTo(pr.x, pr.y - 11); ctx.lineTo(pr.x, pr.y + 11); ctx.stroke(); }, { blur: 4, y: 1 });
    const inside = pr.x > bx0 + wt && pr.x < bx1 - wt && pr.y > by0 + wt && pr.y < by1 - wt, E = inside && !plastic ? 0 : E0;
    lbl(pr.x, pr.y - 22, 'E = ' + (E ? sci(E) + ' N/C' : '0'), { bg: '#26324a', color: '#fff', size: PHONE ? 12 : 13.5 });
    if (s.pdrag) D.ring(pr.x, pr.y, 16, S.t, { color: '#f26b3a', width: 2 });
    T(14, VH - 14, '바깥 전기장 E₀ = ' + sci(E0) + ' N/C (→)   ' + (plastic ? '절연체 상자는 전기장을 막지 못해요' : '금속 표면의 유도 전하가 안쪽 전기장을 상쇄해요'), PHONE ? 11.5 : 13.5, '#516079', 'left', 800);
    s.shield = { bx0, bx1, by0, by1, wt, E0 };
  }
  const shieldE = () => { const s = S.sc, sh = s.shield || { bx0: 0, bx1: 0, by0: 0, by1: 0, wt: 0, E0: 1e4 }, pr = s.probe; const inside = pr.x > sh.bx0 + sh.wt && pr.x < sh.bx1 - sh.wt && pr.y > sh.by0 + sh.wt && pr.y < sh.by1 - sh.wt; return { inside, E: inside && s.box === 'metal' ? 0 : sh.E0 }; };
  function scDown(p) {
    const s = S.sc;
    if (s.sub === 'scope') {
      if (p.x >= s.xt - 8 && p.x <= s.xt + SP.rodL + 46 && Math.abs(p.y - SP.dy) <= 26) { if (s.tw) { s.tw.cancel(); s.tw = null; } s.drag = true; s.dOff = s.xt - p.x; Sound.click(); return true; }
      return false;
    }
    if (Math.hypot(p.x - s.probe.x, p.y - s.probe.y) <= 30) { s.pdrag = true; Sound.click(); return true; }
    return false;
  }
  function scMove(p) { const s = S.sc; if (s.drag) s.xt = clamp(p.x + s.dOff, SP.near, SP.far); else if (s.pdrag) { s.probe.x = clamp(p.x, 20, VW - 20); s.probe.y = clamp(p.y, 60, VH - 40); } }

  /* ================= ③ 유전 분극 ================= */
  const SEQ = ['종이 속 분자가 막대의 전기장에 반응해 한 방향으로 정렬돼요 (분극)', '종이 표면에 분극 전하가 나타나요: 막대 쪽은 (+), 먼 쪽은 (−)', '가까운 쪽의 인력이 먼 쪽의 반발력보다 커서 알짜힘이 막대 쪽이에요', '종이 조각이 막대 쪽으로 끌려와 붙어요'];
  const SEQ_ORDER = [2, 0, 3, 1];
  const seqBtns = [];
  (function () {
    const host = $('#seqHost');
    SEQ_ORDER.forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.textContent = SEQ[k]; b.addEventListener('click', () => seqClick(k, b)); host.appendChild(b); seqBtns.push(b); });
  })();
  function seqClick(k, b) {
    const d = S.de; if (d.stage >= 4 || b.classList.contains('done')) return;
    if (k === d.stage) { d.stage++; b.classList.add('done'); b.textContent = ['①', '②', '③', '④'][k] + ' ' + SEQ[k]; Sound.success(); const pp = paperPos(); parts.burst(pp.x, pp.y, { count: 8, speed: 90, life: 0.5, size: 3 }); }
    else { Sound.fail(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 450); showHint(d.stage === 0 ? '가장 먼저 일어나는 일을 골라 보세요. 막대가 가까이 오면 분자부터 반응해요.' : '순서가 달라요. ' + (d.stage) + '번째까지는 맞았어요. 다음에 일어나는 일을 골라요.'); }
    updateCtl();
  }
  function seqReset() { const d = S.de; d.stage = 0; seqBtns.forEach((b) => { b.classList.remove('done', 'shake'); b.textContent = SEQ[+b.dataset.k]; }); updateCtl(); }
  $('#bSeqReset').addEventListener('click', () => { Sound.click(); seqReset(); });
  $$('#sub3Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.de.sub = b.dataset.v; S.fade = 0.7; updateCtl(); }));
  $$('#molSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.de.mol = b.dataset.v; updateCtl(); }));
  $$('#capSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setConn(b.dataset.v === 'conn'); }));
  function setKappa(k) { const d = S.de; d.k = clamp(Math.round(k), 1, 80); updateCtl(); }
  $('#sK').addEventListener('input', (e) => { setKappa(+e.target.value); Sound.tick(); });
  $('#sKM').addEventListener('click', () => { Sound.click(); setKappa(S.de.k - 1); });
  $('#sKP').addEventListener('click', () => { Sound.click(); setKappa(S.de.k + 1); });
  function setConn(conn) {
    const d = S.de; if (d.conn === conn) return;
    d.conn = conn; Sound.click();
    if (!conn && d.k !== 1) { if (d.tw) d.tw.cancel(); d.tw = SciSim.tween(d, { k: 1 }, { duration: RM ? 0.01 : 0.6, ease: 'outCubic', onDone: () => { d.tw = null; updateCtl(); } }); showHint('κ = 1(진공)일 때 충전한 상태로 전지를 떼어요: Q = 1.0 nC가 그대로 남아요.'); }
    updateCtl();
  }
  const capVals = () => { const d = S.de, k = Math.round(d.k), C0 = 100, Q0 = 1.0, V0 = 10; return { k, C: k * C0, Q: d.conn ? k * Q0 : Q0, V: d.conn ? V0 : V0 / k, Ein: (d.conn ? V0 : V0 / k) / 1.0e-3 }; };
  const PAPER = PHONE ? { rodY: 150, rx0: 140, rx1: 340, px: 240, base: 410, pw: 170, ph: 28 } : { rodY: 160, rx0: 290, rx1: 510, px: 400, base: 410, pw: 220, ph: 30 };
  const paperPos = () => { const d = S.de, rise = clamp(d.stF - 3, 0, 1), e = rise * rise * (3 - 2 * rise), top = PAPER.rodY + 13 + PAPER.ph / 2 + 1; return { x: PAPER.px, y: PAPER.base + (top - PAPER.base) * e }; };
  function stepDielec(dt) {
    const d = S.de; d.stF = SciSim.approach(d.stF, d.stage, dt, RM ? 60 : 2.4);
    d.kd = SciSim.approach(d.kd, d.k, dt, 10);
    const cv = capVals(); d.Qd = SciSim.approach(d.Qd, cv.Q, dt, 6);
    d.switchT = SciSim.approach(d.switchT, d.conn ? 0 : 1, dt, 9);
  }
  function dipole(x, y, ang, len, col) {
    const c = Math.cos(ang), s = Math.sin(ang), h = len / 2;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - c * h, y - s * h); ctx.lineTo(x + c * h, y + s * h); ctx.stroke();
    D.sphere(x - c * h, y - s * h, len * 0.3, NEG, { gloss: false }); D.sphere(x + c * h, y + s * h, len * 0.3, POS, { gloss: false });
  }
  function drawPaper() {
    const d = S.de, st = d.stF, pp = paperPos(), P = PAPER;
    T(14, 26, '🧻 막대를 종이 조각에 가까이 하면', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 책상
    ctx.fillStyle = '#d9c7a5'; ctx.fillRect(10, P.base + P.ph / 2 + 2, VW - 20, 8);
    // 막대 (−)
    D.shadow(() => { D.roundRect(P.rx0, P.rodY - 13, P.rx1 - P.rx0, 26, 13); ctx.fillStyle = NEG; ctx.fill(); }, { blur: 8, y: 3 });
    for (let i = 0; i < 6; i++) T(P.rx0 + 20 + i * (P.rx1 - P.rx0 - 40) / 5, P.rodY + 6, '−', 17, '#fff', 'center', 800);
    T(P.rx0 - 10, P.rodY + 5, '대전된 막대 (−)', PHONE ? 12 : 13.5, '#26324a', 'right', 800);
    // 종이 조각
    const x0 = pp.x - P.pw / 2, y0 = pp.y - P.ph / 2;
    D.shadow(() => { D.roundRect(x0, y0, P.pw, P.ph, 5); ctx.fillStyle = '#fffdf4'; ctx.fill(); }, { blur: 6, y: 2 }); ctx.strokeStyle = '#cbbf9c'; ctx.lineWidth = 2; D.roundRect(x0, y0, P.pw, P.ph, 5); ctx.stroke();
    const al = clamp(st, 0, 1), nM = 8;
    for (let i = 0; i < nM; i++) {
      const mx = x0 + (i + 0.5) * P.pw / nM, ph0 = (seeded(i + 3) - 0.5) * TAU, wob = RM ? 0 : Math.sin(S.t * 1.4 + i) * 0.35 * (1 - al);
      const ang = (ph0 * (1 - al) + (-Math.PI / 2) * al) + wob;   // 정렬되면 (+) 끝이 위(막대 쪽)
      dipole(mx, pp.y, ang, P.ph * 0.62, 0);
    }
    T(pp.x, pp.y + P.ph / 2 + 22, '종이 조각 (절연체) — 분자를 확대해서 그렸어요', PHONE ? 11.5 : 13, '#516079', 'center', 700);
    // 표면 분극 전하
    const sa = clamp(st - 1, 0, 1);
    if (sa > 0.02) { ctx.globalAlpha = sa; for (let i = 0; i < 7; i++) { const sx = x0 + 14 + i * (P.pw - 28) / 6; T(sx, y0 - 4, '+', 17, '#c1272d', 'center', 800); T(sx, y0 + P.ph + 17, '−', 17, '#1d4ed8', 'center', 800); } ctx.globalAlpha = 1; }
    // 힘 화살표
    const fa = clamp(st - 2, 0, 1) * (st < 3.02 ? 1 : 1 - clamp((st - 3), 0, 1));
    if (fa > 0.02) {
      ctx.globalAlpha = fa;
      D.arrow(pp.x - P.pw / 2 + 24, y0 - 6, pp.x - P.pw / 2 + 24, y0 - 6 - 58, { color: COL_F, width: 6, head: 14 }); lbl(pp.x - P.pw / 2 + 24 + 80, y0 - 34, '가까운 (+): 인력 큼', { color: '#9a3412', border: '#f6b08a', size: PHONE ? 11 : 12.5 });
      D.arrow(pp.x + P.pw / 2 - 24, y0 + P.ph + 6, pp.x + P.pw / 2 - 24, y0 + P.ph + 6 + 26, { color: '#94a3b8', width: 4, head: 10 }); lbl(pp.x + P.pw / 2 - 24 - 74, y0 + P.ph + 40, '먼 (−): 반발력 작음', { color: '#475569', border: '#cbd5e1', size: PHONE ? 11 : 12.5 });
      ctx.globalAlpha = 1;
    }
    // 설명
    const cap = ['아직 아무 일도 없어요. 막대가 종이에 다가와요 (닿지 않아요).', '① 분자들이 막대의 전기장에 맞춰 (+) 끝이 위로 향해 정렬돼요.', '② 종이 윗면(막대 쪽)에 (+), 아랫면에 (−) 분극 전하가 나타나요.', '③ 가까운 (+)가 받는 인력이 먼 (−)가 받는 반발력보다 커요.', '④ 알짜힘이 위쪽이라 종이가 끌려와 막대에 붙었어요!'][Math.min(4, Math.round(d.stage))];
    panel(12, PHONE ? 470 : 476, VW - 24, PHONE ? 62 : 72, 14);
    textBlock(26, (PHONE ? 470 : 476) + 26, VW - 52, cap, PHONE ? 13 : 15, '#26324a', PHONE ? 20 : 22, 800);
    if (d.stage === 0 && S.t > 1) T(VW - 14, 26, '오른쪽에서 일어나는 순서대로 눌러요 →', PHONE ? 11 : 13, '#9a3412', 'right', 800);
  }
  function drawMol() {
    const d = S.de, a = clamp(1 - 1 / d.kd, 0, 1), k = d.kd;
    T(14, 26, '🧪 유전체 속 분자가 전기장에 반응해요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const pl = PHONE ? { xL: 44, xR: 436 } : { xL: 110, xR: 690 }, y0 = PHONE ? 90 : 90, y1 = PHONE ? 440 : 440;
    const sl = PHONE ? { x0: 150, x1: 330 } : { x0: 270, x1: 530 }, sy0 = y0 + 20, sy1 = y1 - 20;
    // 판
    D.roundRect(pl.xL - 8, y0, 14, y1 - y0, 5); ctx.fillStyle = '#e2574c'; ctx.fill(); D.roundRect(pl.xR - 6, y0, 14, y1 - y0, 5); ctx.fillStyle = '#2f6df6'; ctx.fill();
    for (let i = 0; i < 6; i++) { T(pl.xL - 18, y0 + 30 + i * (y1 - y0 - 40) / 5, '+', 18, '#c1272d', 'center', 800); T(pl.xR + 20, y0 + 30 + i * (y1 - y0 - 40) / 5, '−', 18, '#1d4ed8', 'center', 800); }
    T(pl.xL, y0 - 8, '(+)판', 13, '#9a3412', 'center', 800); T(pl.xR, y0 - 8, '(−)판', 13, '#1e40af', 'center', 800);
    // 슬래브
    D.roundRect(sl.x0, sy0, sl.x1 - sl.x0, sy1 - sy0, 10); ctx.fillStyle = 'rgba(253,230,170,.45)'; ctx.fill(); ctx.strokeStyle = '#d6b25e'; ctx.lineWidth = 2.5; ctx.stroke();
    T((sl.x0 + sl.x1) / 2, sy0 - 8, '절연체 (κ = ' + Math.round(d.k) + ')', PHONE ? 12 : 14, '#8a6a1f', 'center', 800);
    const cols = PHONE ? 4 : 5, rowsN = PHONE ? 6 : 6;
    for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
      const mx = sl.x0 + (c + 0.5) * (sl.x1 - sl.x0) / cols, my = sy0 + (r + 0.5) * (sy1 - sy0) / rowsN, i = r * cols + c;
      if (d.mol === 'polar') {
        const ph0 = (seeded(i + 11) - 0.5) * TAU, wob = RM ? 0 : Math.sin(S.t * 1.6 + i) * 0.4 * (1 - a), ang = ph0 * (1 - a) + wob;
        const R = PHONE ? 7 : 9, rh = PHONE ? 4 : 5, c0 = Math.cos(ang), s0 = Math.sin(ang);
        [-1, 1].forEach((sd) => { const aa = ang + sd * 0.9, hx = mx + Math.cos(aa) * R * 1.3, hy = my + Math.sin(aa) * R * 1.3; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(hx, hy); ctx.stroke(); D.sphere(hx, hy, rh, POS, { gloss: false }); });
        D.sphere(mx - c0 * 1, my - s0 * 1, R, NEG, { gloss: false });
      } else {
        const R = PHONE ? 13 : 17, dl = a * (PHONE ? 6 : 9), wob = RM ? 0 : Math.sin(S.t * 2 + i) * 0.8 * (1 - a);
        ctx.fillStyle = 'rgba(47,109,246,.28)'; ctx.beginPath(); ctx.arc(mx - dl + wob, my, R, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(47,109,246,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        D.sphere(mx, my, PHONE ? 4 : 5, POS, { gloss: false });
      }
    }
    // 표면 분극 전하 (개수 = 8a)
    const nS = Math.round(8 * a);
    for (let i = 0; i < nS; i++) { const yy = sy0 + 14 + i * (sy1 - sy0 - 28) / 7; T(sl.x0 - 12, yy + 5, '−', 16, '#1d4ed8', 'center', 800); T(sl.x1 + 12, yy + 5, '+', 16, '#c1272d', 'center', 800); }
    // 전기장 화살표 (바깥 E₀ = 길이 L0, 안쪽 E₀/κ)
    const L0 = PHONE ? 52 : 88;
    [0.28, 0.5, 0.72].forEach((f) => {
      const y = sy0 + f * (sy1 - sy0);
      D.arrow(pl.xL + 14, y, pl.xL + 14 + L0, y, { color: '#2563eb', width: 4.5, head: 11 }); D.arrow(sl.x1 + 26, y, sl.x1 + 26 + L0, y, { color: '#2563eb', width: 4.5, head: 11 });
      const Li = L0 / k; if (Li >= 5) D.arrow(sl.x0 + 8, y - 0, sl.x0 + 8 + Math.min(Li, sl.x1 - sl.x0 - 16), y, { color: '#16a34a', width: 3.5, head: Math.min(10, Li * 0.7) });
    });
    T((pl.xL + sl.x0) / 2 + 10, sy1 + 22, 'E₀', 14, '#1e40af', 'center', 800);
    T((sl.x0 + sl.x1) / 2, sy1 + 22, '안쪽 E = E₀/κ = ' + (100 / k < 10 ? (100 / k).toFixed(1) : Math.round(100 / k)) + ' %' + (L0 / k < 5 ? ' (거의 0)' : ''), PHONE ? 12 : 14, '#0b7a41', 'center', 800);
    panel(12, PHONE ? 482 : 476, VW - 24, PHONE ? 76 : 72, 14);
    textBlock(26, (PHONE ? 482 : 476) + 24, VW - 52, d.mol === 'polar' ? '극성 분자(물)는 전기장 방향으로 회전하며 정렬해요. κ가 클수록 더 잘 정렬되어 표면 분극 전하가 많아지고 안쪽 전기장이 줄어요.' : '무극성 분자는 전자 구름이 (+)판 쪽으로 조금 이동해 쌍극자가 돼요. κ가 클수록 많이 치우쳐 분극 전하가 늘고 안쪽 전기장이 줄어요.', PHONE ? 12.5 : 14, '#26324a', PHONE ? 19 : 21, 800);
  }
  function drawCap() {
    const d = S.de, cv = capVals(), k = d.kd, Qn = Math.round(clamp(4 * d.Qd / 1.0, 4, 36));
    T(14, 26, '🔋 평행판 축전기 (C₀ = 100 pF, 10 V, Q₀ = 1.0 nC)', PHONE ? 13 : 17, '#26324a', 'left', 800);
    const L = PHONE ? { bx: 56, pxL: 188, pxR: 296, top: 130, bot: 330 } : { bx: 110, pxL: 290, pxR: 480, top: 130, bot: 360 };
    const wy1 = L.top + 16, wy2 = L.bot + 56;
    // 판
    D.roundRect(L.pxL - 7, L.top, 14, L.bot - L.top, 4); ctx.fillStyle = '#64748b'; ctx.fill(); D.roundRect(L.pxR - 7, L.top, 14, L.bot - L.top, 4); ctx.fillStyle = '#64748b'; ctx.fill();
    // 유전체
    if (k > 1.02) { const cc = C.mix('#fef3c7', '#f59e0b', clamp(Math.log(k) / Math.log(80), 0, 1) * 0.8); ctx.fillStyle = C.rgba(cc, 0.85); ctx.fillRect(L.pxL + 8, L.top + 4, L.pxR - L.pxL - 16, L.bot - L.top - 8); T((L.pxL + L.pxR) / 2, (L.top + L.bot) / 2, 'κ = ' + Math.round(d.k), PHONE ? 16 : 20, '#7c4a03', 'center', 800); }
    else T((L.pxL + L.pxR) / 2, (L.top + L.bot) / 2, '진공 (κ = 1)', PHONE ? 13 : 16, '#516079', 'center', 800);
    // 극판 전하 (Q에 비례, 최대 36개까지만 그려요)
    for (let i = 0; i < Qn; i++) { const y = L.top + 14 + i * (L.bot - L.top - 28) / Math.max(1, Qn - 1); T(L.pxL + 22, y + 5, '+', PHONE ? 13 : 15, '#c1272d', 'center', 800); T(L.pxR - 22, y + 5, '−', PHONE ? 13 : 15, '#1d4ed8', 'center', 800); }
    // 유전체 표면 분극 전하
    const a = clamp(1 - 1 / k, 0, 1), nS = Math.round(6 * a);
    for (let i = 0; i < nS; i++) { const y = L.top + 30 + i * (L.bot - L.top - 60) / 5; T(L.pxL + 12 + (PHONE ? 12 : 18), y + 5, '−', 11, '#1d4ed8', 'center', 800); T(L.pxR - 12 - (PHONE ? 12 : 18), y + 5, '+', 11, '#c1272d', 'center', 800); }
    // 회로선과 전지
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const swx = (L.bx + L.pxL) / 2, sw = d.switchT;
    ctx.beginPath(); ctx.moveTo(L.bx, L.top + 70); ctx.lineTo(L.bx, wy1); ctx.lineTo(swx - 20, wy1); ctx.moveTo(swx + 20, wy1); ctx.lineTo(L.pxL - 7, wy1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L.bx, L.top + 86); ctx.lineTo(L.bx, wy2); ctx.lineTo(L.pxR, wy2); ctx.lineTo(L.pxR, L.bot - 2); ctx.stroke();
    // 스위치 칼날
    const ang = -sw * 0.8; ctx.beginPath(); ctx.moveTo(swx - 20, wy1); ctx.lineTo(swx - 20 + Math.cos(ang) * 40, wy1 + Math.sin(ang) * 40); ctx.stroke(); D.sphere(swx - 20, wy1, 4, '#334155', { gloss: false }); D.sphere(swx + 20, wy1, 4, '#334155', { gloss: false });
    // 전지 기호
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(L.bx - 20, L.top + 70); ctx.lineTo(L.bx + 20, L.top + 70); ctx.stroke(); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(L.bx - 11, L.top + 86); ctx.lineTo(L.bx + 11, L.top + 86); ctx.stroke(); ctx.lineWidth = 3.5;
    T(L.bx - 30, L.top + 76, '10 V', 13, '#334155', 'right', 800); T(L.bx + 28, L.top + 66, '+', 16, '#c1272d', 'left', 800);
    T(swx, wy1 - 16, d.conn ? '전지 연결' : '전지 분리', 13, d.conn ? '#0b7a41' : '#9a3412', 'center', 800);
    // 표
    const tx = PHONE ? 12 : 540, ty = PHONE ? 440 : 70, tw = PHONE ? VW - 24 : VW - 540 - 12, th = PHONE ? 252 : 360;
    panel(tx, ty, tw, th, 14);
    const sz = PHONE ? 14 : 15, lh = PHONE ? 28 : 32; let y = ty + 30;
    T(tx + 14, y, d.conn ? '전지를 연결한 채' : '전지를 뗀 채 (Q 고정)', sz + 1, '#1e40af', 'left', 800);
    const msk = S.gate === 'num3';
    const rows = [['κ', String(cv.k), '#26324a'], ['전기 용량 C = κC₀', msk ? '?' : cv.C + ' pF', '#9a3412'], ['전하 Q', g3(cv.Q) + ' nC', '#c1272d'], ['전압 V', g3(cv.V) + ' V', '#1d4ed8'], ['안쪽 E = V/d', sci(cv.Ein) + ' V/m', '#0b7a41']];
    rows.forEach((r) => { y += lh; T(tx + 14, y, r[0], sz - 1, '#516079', 'left', 800); T(tx + tw - 14, y, r[1], sz, r[2], 'right', 800); });
    y += lh + 6; textBlock(tx + 14, y, tw - 28, d.conn ? '전지가 전압을 10 V로 유지하므로 C가 κ배가 되면 Q도 κ배가 돼요.' : 'Q가 그대로이고 C가 κ배가 되므로 V = Q/C는 1/κ배, 안쪽 E도 1/κ배가 돼요.', PHONE ? 12.5 : 13.5, '#0b7a41', PHONE ? 18 : 20, 800);
    if (Qn >= 36) T(L.pxL + 6, L.bot + 18, '※ 기호는 36개까지만 그려요 (실제 Q: ' + g3(cv.Q) + ' nC)', PHONE ? 11 : 12.5, '#516079', 'left', 700);
  }
  function drawDielec() { sceneBg(); const sb = S.de.sub; if (sb === 'paper') drawPaper(); else if (sb === 'mol') drawMol(); else drawCap(); }

  /* ================= ④ 생활 속 적용 ================= */
  const CARDS = [
    ['🖐', '터치스크린', '손가락(도체)이 전극에 다가가면 전하가 이동해 전극의 정전 용량이 변해요', 0],
    ['🎨', '정전 도장', '접지된 금속 물체에는 페인트 입자와 반대 부호의 전하가 유도돼 입자가 끌려와요', 0],
    ['🍲', '전자레인지', '방향이 계속 바뀌는 전기장에 물 분자(극성)가 회전하며 마찰열이 나요', 1],
    ['🧹', '정전기 청소포', '대전된 천이 절연체인 먼지 · 머리카락을 분극시켜 끌어당겨요', 1],
    ['🚗', '번개 속 자동차', '금속 차체 안쪽의 전기장은 0이라서 번개가 쳐도 안전해요', 2],
    ['📦', '금속 기기 케이스', '금속 케이스가 바깥 전기장이 안쪽 정밀 부품에 미치지 못하게 막아요', 2],
  ];
  const BINS = ['정전기 유도', '유전 분극', '정전 차폐'];
  const BIN_COL = ['#e0f2fe', '#fef3c7', '#dcfce7'];
  const AP = PHONE ? { bin: { y: 56, h: 210, w: 148, gap: 8, x0: 10 }, card: { w: 228, h: 122, x0: 10, y0: 278, gx: 10, gy: 8 }, chip: { w: 134, h: 26, sp: 28 } }
    : { bin: { y: 54, h: 240, w: 250, gap: 11, x0: 14 }, card: { w: 250, h: 104, x0: 14, y0: 310, gx: 11, gy: 10 }, chip: { w: 226, h: 30, sp: 33 } };
  const binRect = (i) => ({ x: AP.bin.x0 + i * (AP.bin.w + AP.bin.gap), y: AP.bin.y, w: AP.bin.w, h: AP.bin.h });
  const cardHome = (i) => { const per = PHONE ? 2 : 3, c = i % per, r = (i / per) | 0; return { x: AP.card.x0 + c * (AP.card.w + AP.card.gx) + AP.card.w / 2, y: AP.card.y0 + r * (AP.card.h + AP.card.gy) + AP.card.h / 2 }; };
  function initCards() {
    S.ap.cards = CARDS.map((c, i) => { const h = cardHome(i); return { i, emoji: c[0], title: c[1], clue: c[2], ans: c[3], bin: null, x: h.x, y: h.y, sz: 1, drag: false, order: 0, shake: 0, bad: false, dx: 0, dy: 0 }; });
    S.ap.drag = null; S.ap.dropN = 0;
  }
  function cardTarget(c) {
    if (c.drag) return null;
    if (c.bin == null) { const h = cardHome(c.i); return { x: h.x, y: h.y, sz: 1 }; }
    const r = binRect(c.bin), mates = S.ap.cards.filter((o) => o.bin === c.bin).sort((a, b) => a.order - b.order), idx = mates.indexOf(c);
    return { x: r.x + r.w / 2, y: r.y + 54 + idx * AP.chip.sp, sz: 0 };
  }
  function stepCards(dt) {
    S.ap.cards.forEach((c) => {
      const t = cardTarget(c);
      if (t) { c.x = SciSim.approach(c.x, t.x, dt, 14); c.y = SciSim.approach(c.y, t.y, dt, 14); c.sz = SciSim.approach(c.sz, t.sz, dt, 12); }
      else c.sz = SciSim.approach(c.sz, 1, dt, 14);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2.5);
    });
  }
  function drawCard(c) {
    const full = AP.card, lw = full.w, lh = full.h, w = AP.chip.w + (lw - AP.chip.w) * c.sz, h = AP.chip.h + (lh - AP.chip.h) * c.sz;
    const sx = c.shake ? Math.sin(c.shake * 40) * 5 * c.shake : 0, x = c.x - w / 2 + sx, y = c.y - h / 2;
    D.shadow(() => { D.roundRect(x, y, w, h, c.sz > 0.5 ? 14 : 10); ctx.fillStyle = c.bad ? '#fde9e9' : '#fff'; ctx.fill(); }, { blur: c.drag ? 16 : 6, y: c.drag ? 8 : 2 });
    ctx.strokeStyle = c.bad ? '#e2464b' : c.drag ? '#f26b3a' : '#dde4ef'; ctx.lineWidth = c.drag || c.bad ? 3 : 1.5; D.roundRect(x, y, w, h, c.sz > 0.5 ? 14 : 10); ctx.stroke();
    if (c.sz > 0.5) {
      T(x + 12, y + 28, c.emoji + ' ' + c.title, PHONE ? 14.5 : 16, '#26324a', 'left', 800);
      textBlock(x + 12, y + 50, w - 24, c.clue, PHONE ? 12 : 12.5, '#516079', PHONE ? 16 : 16.5, 700);
    } else T(x + 8, y + h / 2 + 5, c.emoji + ' ' + c.title, PHONE ? 12.5 : 14, '#26324a', 'left', 800);
  }
  function drawCards() {
    sceneBg();
    T(14, 26, '🗂 생활 속 사례를 원리별로 분류해요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    BINS.forEach((b, i) => {
      const r = binRect(i);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = BIN_COL[i]; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke(); ctx.setLineDash([]);
      T(r.x + r.w / 2, r.y + 26, b, PHONE ? 14.5 : 16.5, '#26324a', 'center', 800);
      T(r.x + r.w / 2, r.y + 44, ['도체 속 전하 이동', '절연체 분자의 정렬', '도체 속 E = 0'][i], PHONE ? 11 : 12.5, '#516079', 'center', 700);
    });
    const order = S.ap.cards.slice().sort((a, b) => (a.drag ? 1 : 0) - (b.drag ? 1 : 0));
    order.forEach(drawCard);
    const placed = S.ap.cards.filter((c) => c.bin != null).length;
    if (placed === 0 && S.t > 1.5) T(VW / 2, AP.card.y0 - 8, '카드를 위의 칸으로 끌어 올려요 ↑', PHONE ? 12 : 14, '#9a3412', 'center', 800);
  }
  const TS = PHONE ? { x0: 40, x1: 440, y0: 130, y1: 350, cols: 7, rows: 5, sg: 48 } : { x0: 110, x1: 690, y0: 120, y1: 400, cols: 7, rows: 5, sg: 66 };
  const GLOVE = { bare: { dc: 3.0, name: '맨손', col: '#f0c8a0' }, cond: { dc: 2.6, name: '도체 장갑', col: '#7aa7d8' }, plain: { dc: 0.2, name: '일반 장갑 (절연체)', col: '#9aa5b8' } };
  const nodePos = (c, r) => ({ x: TS.x0 + (c + 0.5) * (TS.x1 - TS.x0) / TS.cols, y: TS.y0 + (r + 0.5) * (TS.y1 - TS.y0) / TS.rows });
  function touchRead() {
    const t = S.ap.touch, g = GLOVE[t.glove]; let best = null;
    for (let r = 0; r < TS.rows; r++) for (let c = 0; c < TS.cols; c++) { const p = nodePos(c, r), d = Math.hypot(p.x - t.x, p.y - t.y), dc = g.dc * Math.exp(-Math.pow(d / TS.sg, 2)); if (!best || dc > best.dc) best = { c, r, dc }; }
    return best;
  }
  $$('#sub4Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ap.sub = b.dataset.v; S.fade = 0.7; updateCtl(); }));
  $$('#gloveSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ap.touch.glove = b.dataset.v; S.ap.touch.seen = S.ap.touch.seen || {}; S.ap.touch.seen[b.dataset.v] = true; updateCtl(); }));
  function drawTouch() {
    sceneBg(); const t = S.ap.touch, g = GLOVE[t.glove], rd = touchRead();
    T(14, 26, '🖐 정전식 터치스크린: 전극 사이의 정전 용량 변화', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    panel(TS.x0 - 22, TS.y0 - 22, TS.x1 - TS.x0 + 44, TS.y1 - TS.y0 + 44, 18, '#1e293b');
    // 전극 격자
    ctx.lineWidth = 3;
    for (let c = 0; c < TS.cols; c++) { const x = nodePos(c, 0).x; ctx.strokeStyle = 'rgba(96,165,250,.7)'; ctx.beginPath(); ctx.moveTo(x, TS.y0 - 10); ctx.lineTo(x, TS.y1 + 10); ctx.stroke(); }
    for (let r = 0; r < TS.rows; r++) { const y = nodePos(0, r).y; ctx.strokeStyle = 'rgba(251,146,60,.7)'; ctx.beginPath(); ctx.moveTo(TS.x0 - 10, y); ctx.lineTo(TS.x1 + 10, y); ctx.stroke(); }
    // 교점의 정전 용량 변화
    for (let r = 0; r < TS.rows; r++) for (let c = 0; c < TS.cols; c++) {
      const p = nodePos(c, r), d = Math.hypot(p.x - t.x, p.y - t.y), dc = g.dc * Math.exp(-Math.pow(d / TS.sg, 2)), a = clamp(dc / 3, 0, 1);
      D.sphere(p.x, p.y, 4 + a * 9, a > 0.05 ? C.mix('#fde68a', '#ef4444', a) : '#475569', { gloss: false });
      if (dc >= 0.1) T(p.x, p.y - 12 - a * 6, dc.toFixed(1), PHONE ? 10.5 : 11.5, '#fef3c7', 'center', 800);
    }
    // 읽은 위치
    if (rd.dc >= 0.5) { const p = nodePos(rd.c, rd.r); D.ring(p.x, p.y, 18, S.t, { color: '#34d399', width: 3 }); }
    // 손가락
    const tr = t.ripples; for (let i = tr.length - 1; i >= 0; i--) { const rp = tr[i]; rp.t += 0.02; if (rp.t > 1) { tr.splice(i, 1); continue; } ctx.strokeStyle = 'rgba(52,211,153,' + (0.6 * (1 - rp.t)) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(rp.x, rp.y, 20 + rp.t * 60, 0, TAU); ctx.stroke(); }
    D.shadow(() => { ctx.fillStyle = g.col; ctx.beginPath(); ctx.arc(t.x, t.y, PHONE ? 20 : 26, 0, TAU); ctx.fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = t.glove === 'plain' ? '#475569' : '#fff'; ctx.lineWidth = t.glove === 'plain' ? 6 : 2; ctx.beginPath(); ctx.arc(t.x, t.y, PHONE ? 20 : 26, 0, TAU); ctx.stroke();
    if (t.glove === 'cond') { ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(t.x, t.y, 6 + i * 4, 0, TAU * 0.7); ctx.stroke(); } }
    T(t.x, t.y + 5, t.glove === 'plain' ? '🧤' : '👆', PHONE ? 18 : 24, '#000', 'center', 700);
    if (t.drag) D.ring(t.x, t.y, 32, S.t, { color: '#34d399', width: 2 });
    // 설명
    const py = PHONE ? 380 : 428, ph = VH - py - 8; panel(12, py, VW - 24, ph, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = py + 26;
    T(26, y, '손가락: ' + g.name, sz + 1, '#1e40af', 'left', 800);
    y += lh; T(26, y, rd.dc >= 0.5 ? '터치 위치: 열 ' + (rd.c + 1) + ', 행 ' + (rd.r + 1) + '  (ΔC = ' + rd.dc.toFixed(1) + ' pF)' : '터치를 인식하지 못해요  (ΔC 최대 ' + rd.dc.toFixed(1) + ' pF)', sz, rd.dc >= 0.5 ? '#0b7a41' : '#b91c1c', 'left', 800);
    y += lh; y += textBlock(26, y, VW - 52, t.glove === 'plain' ? '절연체 장갑이 손가락과 전극 사이에 전하의 이동(정전기 유도)을 막아 정전 용량이 거의 변하지 않아요.' : '손가락(도체)이 가까워지면 전극과 손가락 사이에서 전하가 이동해 교점 근처의 정전 용량이 수 pF 달라져요. 변화가 가장 큰 교점이 터치 위치예요.', sz - 0.5, '#26324a', lh - 2, 800);
  }
  function drawApply() { if (S.ap.sub === 'cards') drawCards(); else drawTouch(); }
  function apDown(p) {
    const a = S.ap;
    if (a.sub === 'cards') {
      const order = a.cards.slice().reverse();
      for (const c of order) {
        const w = AP.chip.w + (AP.card.w - AP.chip.w) * c.sz, h = AP.chip.h + (AP.card.h - AP.chip.h) * c.sz;
        if (Math.abs(p.x - c.x) <= w / 2 && Math.abs(p.y - c.y) <= h / 2) { c.drag = true; c.dx = c.x - p.x; c.dy = c.y - p.y; a.drag = c; c.bin = null; a.cards.splice(a.cards.indexOf(c), 1); a.cards.push(c); Sound.click(); return true; }
      }
      return false;
    }
    const t = a.touch;
    if (p.x >= TS.x0 - 22 && p.x <= TS.x1 + 22 && p.y >= TS.y0 - 22 && p.y <= TS.y1 + 22) { t.drag = true; t.x = clamp(p.x, TS.x0 - 10, TS.x1 + 10); t.y = clamp(p.y, TS.y0 - 10, TS.y1 + 10); Sound.click(); return true; }
    return false;
  }
  function apMove(p) {
    const a = S.ap;
    if (a.sub === 'cards' && a.drag) { a.drag.x = clamp(p.x + a.drag.dx, 20, VW - 20); a.drag.y = clamp(p.y + a.drag.dy, 20, VH - 20); }
    else if (a.sub === 'touch' && a.touch.drag) { const t = a.touch; t.x = clamp(p.x, TS.x0 - 10, TS.x1 + 10); t.y = clamp(p.y, TS.y0 - 10, TS.y1 + 10); if (GLOVE[t.glove].dc >= 0.5 && Math.random() < 0.12) t.ripples.push({ x: t.x, y: t.y, t: 0 }); }
  }
  function apUp(p) {
    const a = S.ap;
    if (a.drag) {
      const c = a.drag; c.drag = false; a.drag = null; let hit = -1;
      for (let i = 0; i < 3; i++) { const r = binRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) hit = i; }
      const prev = c.bin;
      if (hit >= 0 && S.ap.cards.filter((o) => o.bin === hit).length < 6) { c.bin = hit; c.order = ++a.dropN; c.bad = false; Sound.success(); parts.burst(c.x, c.y, { count: 6, speed: 80, life: 0.45, size: 3 }); }
      else { c.bin = null; if (hit >= 0) showHint('이 칸은 가득 찼어요.'); }
      void prev;
    }
    a.touch.drag = false;
  }

  /* ================= 포인터 ================= */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'induce') return indDown(p);
      if (S.mode === 'electro') return scDown(p);
      if (S.mode === 'apply') return apDown(p);
      return false;
    },
    move(p) { if (S.mode === 'induce') indMove(p); else if (S.mode === 'electro') scMove(p); else if (S.mode === 'apply') apMove(p); },
    up(p) { S.ind.drag = false; S.sc.drag = false; S.sc.pdrag = false; if (S.mode === 'apply') apUp(p); },
    hover(p) {
      if (S.mode === 'induce') { const bp = bodyPix(); return Math.hypot(p.x - bp.x, p.y - bp.y) <= G1.bR + 14 ? 'grab' : 'default'; }
      if (S.mode === 'electro') { const s = S.sc; if (s.sub === 'scope') return p.x >= s.xt - 8 && p.x <= s.xt + SP.rodL + 46 && Math.abs(p.y - SP.dy) <= 26 ? 'grab' : 'default'; return Math.hypot(p.x - s.probe.x, p.y - s.probe.y) <= 30 ? 'grab' : 'default'; }
      if (S.mode === 'apply') return 'grab';
      return 'default';
    },
  });

  /* ================= 공통 UI ================= */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.ind.drag = false; S.sc.drag = false; S.sc.pdrag = false; if (S.ap.drag) { S.ap.drag.drag = false; S.ap.drag = null; } S.ap.touch.drag = false; }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    const sub = curSub();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(sub) >= 0;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#bodySeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.ind.sign));
    $('#bSep').textContent = S.ind.sepGoal ? '🔗 막대 붙이기' : '✂ 막대 떼기'; $('#bSep').disabled = !!S.ind.tw;
    $$('#sub2Seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sc.sub));
    $$('#rodSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.sc.sign));
    $$('#boxSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sc.box));
    $('#bGnd').textContent = S.sc.grounded ? '⏏ 접지 해제' : '🖐 손가락으로 접지';
    $$('#sub3Seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.de.sub));
    $$('#molSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.de.mol));
    $$('#capSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'conn') === S.de.conn));
    setRange('sK', Math.round(S.de.k), 1, 80, (v) => 'κ = ' + v);
    $('#sKM').disabled = S.de.k <= 1; $('#sKP').disabled = S.de.k >= 80;
    seqBtns.forEach((b) => { b.disabled = S.de.stage >= 4 && !b.classList.contains('done'); });
    $$('#sub4Seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.ap.sub));
    $$('#gloveSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.ap.touch.glove));
  }
  function setRange(id, v, mn, mx, fmt) {
    const s = $('#' + id); if (!s) return;
    if (Math.abs(+s.value - v) > 1e-9) s.value = v;
    s.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%');
    const o = s.parentElement.parentElement.querySelector('output'); if (o) o.textContent = fmt(v);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  function readouts() {
    let a, b, c;
    if (S.mode === 'induce') { const q = counts(); a = ['막대 A의 전하', fe(q.QA, 0) + ' e' + (q.QA ? '' : ' (중성)')]; b = ['막대 B의 전하', fe(q.QB, 0) + ' e' + (q.QB ? '' : ' (중성)')]; c = ['A + B 전체', fe(q.QA + q.QB, 0) + ' e' + (q.QA + q.QB === 0 ? ' (보존)' : '')]; }
    else if (S.mode === 'electro') {
      const s = S.sc;
      if (s.sub === 'scope') { a = ['검전기 전체 Qt', fe(s.Qt) + ' e']; b = ['금속판 · 금박', fe(s.Qd) + ' · ' + fe(s.Ql) + ' e']; c = ['금박이 벌어진 각', Math.round(s.leaf * 2) + '°']; }
      else { const r = shieldE(); a = ['탐침 위치', r.inside ? '상자 속' : '상자 밖']; b = ['탐침의 전기장 E', r.E ? sci(r.E) + ' N/C' : '0']; c = ['상자', s.box === 'metal' ? '금속 (E = 0)' : '플라스틱 (통과)']; }
    }
    else if (S.mode === 'dielec') {
      const d = S.de, cv = capVals();
      if (d.sub === 'paper') { a = ['진행', Math.round(d.stage) + ' / 4 단계']; b = ['막대', '(−) 대전체']; c = ['종이 조각', d.stage >= 4 ? '끌려와 붙음' : d.stage >= 2 ? '분극됨' : '중성']; }
      else if (d.sub === 'mol') { const a2 = 1 - 1 / d.k; a = ['유전 상수 κ', String(Math.round(d.k))]; b = ['안쪽 전기장 E/E₀', g3(100 / Math.round(d.k)) + ' %']; c = ['표면 분극 전하', '8개 중 ' + Math.round(8 * (1 - 1 / d.kd)) + '개']; }
      else { a = ['전기 용량 C', S.gate === 'num3' ? '?' : cv.C + ' pF']; b = ['전하 Q', g3(cv.Q) + ' nC']; c = ['전압 V', g3(cv.V) + ' V']; }
    }
    else {
      const ap = S.ap;
      if (ap.sub === 'cards') { const n = ap.cards.filter((x) => x.bin != null).length; a = ['분류한 카드', n + ' / 6']; b = ['정전기 유도 칸', ap.cards.filter((x) => x.bin === 0).length + '장']; c = ['유전 분극 · 차폐 칸', ap.cards.filter((x) => x.bin === 1).length + ' · ' + ap.cards.filter((x) => x.bin === 2).length + '장']; }
      else { const rd = touchRead(); a = ['손가락', GLOVE[ap.touch.glove].name]; b = ['ΔC 최대', rd.dc.toFixed(1) + ' pF']; c = ['터치 위치', rd.dc >= 0.5 ? '열 ' + (rd.c + 1) + ', 행 ' + (rd.r + 1) : '인식 못 함']; }
    }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ================= 미션 ================= */
  const M1R = [['(+) 대전체를 막대 A에 가까이 하면 자유전자는?', ['대전체 쪽(A쪽)으로 이동해요', '대전체 반대쪽(B쪽)으로 이동해요', '이동하지 않아요'], 0], ['(−) 대전체를 가까이 하면 자유전자는?', ['대전체 쪽(A쪽)으로 이동해요', '대전체 반대쪽(B쪽)으로 이동해요', '이동하지 않아요'], 1], ['(+) 대전체를 가까이 한 채 막대를 떼고 대전체를 치우면 막대 A의 전하는?', ['(+)로 대전돼요', '(−)로 대전돼요', '중성이에요'], 1]];
  const m1Store = {}, m1Ok = {}, m1Sels = makeSelects($('#selHost1'), M1R, m1Store, m1Ok);
  const ORD = ['막대를 검전기에 닿지 않게 가까이 한다', '손가락으로 접지한다', '접지를 푼다 (손가락을 뗀다)', '막대를 멀리 치운다'];
  const M2R = [0, 1, 2, 3].map((i) => [(i + 1) + '번째로 할 일', ORD, i]);
  const m2Store = {}, m2Ok = {}, m2Sels = makeSelects($('#selHost2'), M2R, m2Store, m2Ok);
  const num3 = makeNum($('#num3Host'), '<b>C₀ = 100 pF</b>인 평행판 축전기에 <b>κ = 4</b>인 유전체를 판 사이에 가득 채우면 전기 용량 C는?', 'C =', 'pF', true);
  const MS = {};

  const levels = [
    {
      title: '정전기 유도: 도체 속 전하의 이동', short: '정전기 유도', icon: '🎈', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 어떻게 건드리지도 않았는데 가벼운 종이 조각이 막대에 끌려올까?</p>' +
        '<div class="si-link">🔗 <b>중학교</b>에서 정전기 유도를 전자의 이동으로 설명했고, <b>통합과학</b>에서 금속에는 자유롭게 움직이는 자유전자가 있다고 배웠어요. 이번에는 전기장(장)의 관점에서 도체와 절연체가 전하 가까이에서 어떻게 반응하는지 살펴봐요.</div>' +
        '<p>맞닿은 두 금속 막대 근처에 대전체를 가져가면 막대 속 <b>자유전자</b>가 움직여요. 대전체를 막대에 닿지 않게 가까이 한 채 막대를 떼어 놓았다가 대전체를 치우면 어떤 일이 일어나는지 관찰해요.</p>',
      features: ['induce'],
      setup() { S.gate = ''; initInd(); S.ind.sign = 1; resetSels(m1Sels, m1Store, m1Ok); setScene('induce'); },
      recap: '대전체를 가까이 하면 도체 속 자유전자가 이동해 가까운 쪽에는 반대 부호, 먼 쪽에는 같은 부호의 전하가 나타나요. 전하가 새로 생기는 것이 아니라 옮겨 가는 것이라서 전체 전하량은 변하지 않아요.',
      summary: '<ul><li><b>정전기 유도</b>: 대전체를 도체에 가까이 하면 자유전자가 이동해, 대전체에 가까운 쪽에는 <b>반대 부호</b>, 먼 쪽에는 <b>같은 부호</b>의 전하가 나타나요.</li><li>(+) 대전체 → 전자가 대전체 쪽으로, (−) 대전체 → 전자가 반대쪽으로 이동해요. 이때 대전체와 도체는 <b>닿지 않아요</b>.</li><li>대전체를 가까이 한 채 두 막대를 떼어 놓고 대전체를 치우면 두 막대는 서로 <b>반대 부호</b>로 대전된 채 남아요.</li><li>전하는 이동할 뿐 새로 생기지 않아서 <b>전체 전하량은 일정(보존)</b>해요.</li></ul>',
      missions: [
        {
          title: '막대를 떼고 부호 확인하기',
          goal: '대전체를 막대 A에 <b>닿지 않게 가까이</b> 가져간 뒤 <b>✂ 막대 떼기</b>를 누르고, 대전체를 멀리 치워 두 막대에 남은 전하의 부호를 확인하세요.',
          hint: '대전체를 끌어 막대 A 쪽으로 가까이 가져가면 전자가 움직여요. 가까이 둔 채로 ✂를 누르고, 그다음 ⏪ 대전체 치우기를 눌러요.',
          setup() { S.gate = ''; initInd(); setScene('induce'); },
          check: () => !!S.ind.flags.far,
          hold: 0.8,
          status: () => mark(!!S.ind.flags.near) + ' 가까이 &nbsp; ' + mark(!!S.ind.flags.sep) + ' 막대 떼기 &nbsp; ' + mark(!!S.ind.flags.far) + ' 대전체 치움 (A ' + fe(counts().QA, 0) + ' e · B ' + fe(counts().QB, 0) + ' e)',
          explain: '대전체가 (+)일 때 자유전자는 대전체 쪽으로 이동해 막대 A쪽은 전자가 많아져 (−), B쪽은 전자가 부족해져 (+)가 돼요. 이 상태에서 막대를 떼면 이동한 전자가 돌아오지 못하므로 대전체를 치워도 A는 (−), B는 (+)로 남아요. 늘어난 전자 수와 줄어든 전자 수가 같아서 두 막대 전체의 전하는 0이에요.',
        },
        {
          title: '전자의 이동 방향 맞히기', manual: true,
          goal: '실험에서 본 전자의 이동을 떠올려 세 문제의 답을 고른 뒤 <b>✔ 확인하기</b>를 누르세요. (대전체를 (−)로 바꿔서 직접 확인해도 돼요.)',
          hint: '(+) 대전체는 전자를 끌어당기고, (−) 대전체는 전자를 밀어내요. 전자가 많아진 쪽은 (−), 부족해진 쪽은 (+)예요.',
          setup() { S.gate = 'm1'; resetSels(m1Sels, m1Store, m1Ok); setScene('induce'); updateCtl(); },
          check: () => checkSel(M1R, m1Store, m1Ok, m1Sels, '빨간 칸을 다시 골라 보세요. (+)는 전자를 끌어당기고 (−)는 밀어내요. 전자가 모인 쪽이 (−)가 돼요.'),
          status: () => '고른 문제 ' + M1R.filter((r, i) => m1Store[i]).length + ' / ' + M1R.length,
          explain: '(+) 대전체는 자유전자를 <b>끌어당겨</b> 대전체 쪽으로, (−) 대전체는 자유전자를 <b>밀어내</b> 반대쪽으로 이동시켜요. (+) 대전체를 가까이 한 채 떼면 가까웠던 A는 전자가 늘어 <b>(−)</b>로 대전돼요.',
        },
        {
          type: 'quiz', title: '전체 전하량은 변할까?',
          goal: '정전기 유도가 일어나는 동안 두 막대 전체의 전하량은 어떻게 될까요?',
          setup() { S.gate = ''; setScene('induce'); },
          choices: ['변하지 않아요. 전자가 이동해 부호가 나뉘어 나타날 뿐이에요', '전하가 새로 생겨서 늘어나요', '대전체의 전하가 막대로 옮겨 가서 막대 전체가 대전돼요', '대전체가 가까울수록 줄어들어요'],
          answer: 0,
          feedback: ['', '전하는 새로 생기지 않아요. 한쪽에 전자가 늘어난 만큼 다른 쪽에서 줄었어요. 화면의 A + B 합을 보세요.', '대전체는 막대에 닿지 않았어요. 전하가 옮겨 가는 것이 아니라 막대 속의 전자가 이동하는 거예요. 합은 0이에요.', '대전체의 거리와 상관없이 전체 전하량은 일정해요(전하량 보존).'],
          explain: '정전기 유도에서는 도체 속 전자가 <b>이동</b>할 뿐이에요. 한쪽에서 늘어난 전자 수가 다른 쪽에서 줄어든 전자 수와 같으므로 전체 전하량은 <b>그대로(보존)</b>예요. 그래서 막대 A(−)와 B(+)의 전하량 크기가 같아요.',
        },
      ],
    },
    {
      title: '유도 대전과 정전 차폐', short: '유도 대전', icon: '🔌', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대전체를 가까이 하면 도체 속 전자가 이동해 반대 부호가 나뉘는 것을 봤어요. 이번에는 <b>접지</b>를 이용해 도체를 대전체와 반대 부호로 대전시켜 봐요(<b>유도 대전</b>).</div>' +
        '<p><b>검전기</b>의 금속판에 막대를 닿지 않게 가까이 하면 금박이 벌어져요. 접지하면 어떻게 될까요? 손가락을 떼고 막대를 치우면? 또 <b>속이 빈 금속 상자</b>를 큰 전기장 속에 넣으면 상자 속 전기장은 어떻게 될지(<b>정전 차폐</b>) 살펴봐요.</p>',
      features: ['electro'],
      setup() { S.gate = ''; initScope(); S.sc.sign = -1; S.sc.sub = 'scope'; S.sc.box = 'metal'; resetSels(m2Sels, m2Store, m2Ok); setScene('electro'); },
      recap: '접지한 도체에 막대를 가까이 했다가 접지를 풀고 막대를 치우면 막대와 반대 부호로 대전돼요(유도 대전). 속이 빈 금속 상자 속의 전기장은 0이에요(정전 차폐).',
      summary: '<ul><li><b>검전기</b>: (−) 막대를 닿지 않게 가까이 하면 금속판은 (+), 금박은 (−)가 되어 금박이 벌어져요. 막대를 멀리 하면 금박은 다시 오므라들어요(접촉하지 않았으므로 중성).</li><li><b>유도 대전</b>: 막대를 가까이 한 채 ① 접지 → 금박이 오므라듦(전자가 땅으로 빠져나감) ② 접지를 풀고 ③ 막대를 치우면 검전기가 막대와 <b>반대 부호</b>((+))로 대전되어 금박이 벌어져요.</li><li><b>정전 차폐</b>: 정전기 평형에서 도체 <b>내부의 전기장은 0</b>이에요. 속이 빈 금속 상자 속은 바깥 전기장의 영향을 받지 않아요.</li><li>🏭 번개가 칠 때 자동차 안이 안전한 까닭, 엘리베이터 속에서 휴대폰 신호가 약해지는 까닭, 정밀 기기의 금속 케이스가 모두 정전 차폐예요.</li></ul>',
      missions: [
        {
          title: '반대 부호 검전기 만들기',
          goal: '(−) 막대로 검전기를 막대와 <b>반대 부호</b>인 (+)로 대전시키세요. 막대를 가까이 → 접지 → 접지 해제 → 막대 치우기 순서로 해요.',
          hint: '막대를 금속판 가까이(닿지 않게) 가져간 채로 🖐 접지 버튼을 누르고, 금박이 오므라들면 접지를 풀어요. 그다음 막대를 치우면 금박이 다시 벌어져요.',
          setup() { S.gate = ''; initScope(); S.sc.sub = 'scope'; S.sc.sign = -1; setScene('electro'); },
          check: scopeDone,
          hold: 1.0,
          status: () => { const f = S.sc.flags; return mark(!!f.near) + ' 가까이 &nbsp; ' + mark(!!f.gnd) + ' 접지 &nbsp; ' + mark(!!f.ungnd) + ' 접지 해제 &nbsp; ' + mark(!!f.far) + ' 막대 치움 &nbsp; (Qt = ' + fe(S.sc.Qt) + ' e)'; },
          explain: '(−) 막대를 가까이 하면 전자가 금박 쪽으로 밀려나고, <b>접지</b>하면 그 전자가 땅으로 빠져나가 검전기에는 (+)만 남아요(금박이 오므라듦). 접지를 풀고 막대를 치우면 남은 (+)가 금속판과 금박에 퍼져 금박이 다시 벌어져요. 이렇게 막대와 <b>반대 부호</b>로 대전시키는 것을 유도 대전이라고 해요.',
        },
        {
          title: '유도 대전 순서 정렬하기', manual: true,
          goal: '검전기를 반대 부호로 대전시키는 네 동작을 <b>일어나는 순서대로</b> 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '막대가 가까이 있어야 전자가 움직이고, 접지는 막대가 가까이 있는 동안 해요. 접지를 푼 다음에 막대를 치워야 전하가 남아요.',
          setup() { S.gate = 'm2'; S.sc.sub = 'scope'; resetSels(m2Sels, m2Store, m2Ok); setScene('electro'); updateCtl(); },
          check: () => checkSel(M2R, m2Store, m2Ok, m2Sels, '순서를 다시 생각해 보세요. 먼저 막대를 가까이, 그다음 접지, 접지를 풀고, 마지막으로 막대를 치워요.'),
          status: () => '고른 순서 ' + M2R.filter((r, i) => m2Store[i]).length + ' / ' + M2R.length,
          explain: '<b>① 막대를 가까이 → ② 접지 → ③ 접지 해제 → ④ 막대 치우기</b> 순서예요. 접지를 먼저 풀면 전자가 땅으로 빠져나가지 못하고, 막대를 먼저 치우면 이동한 전자가 도로 돌아와 중성이 돼요.',
        },
        {
          type: 'quiz', title: '자동차 안은 왜 안전할까?',
          goal: '달리는 자동차 안에 있으면 번개를 맞아도 비교적 안전한 까닭은? (📦 정전 차폐 장면에서 금속 상자 속 E를 재 보세요)',
          setup() { S.gate = ''; S.sc.sub = 'shield'; S.sc.box = 'metal'; S.sc.probe.x = VW / 2; S.sc.probe.y = PHONE ? 290 : 300; setScene('electro'); },
          choices: ['금속 차체가 정전 차폐 역할을 해서 안쪽의 전기장이 0이고, 전하는 바깥 표면으로만 흐르기 때문이에요', '자동차 타이어가 고무라서 전기가 절대 통하지 않기 때문이에요', '자동차가 움직이고 있으면 전기장이 생기지 않기 때문이에요', '금속은 전기를 통하지 않아서 번개를 막기 때문이에요'],
          answer: 0,
          feedback: ['', '타이어의 고무가 도움이 된다는 말은 흔한 오해예요. 번개는 공기도 뚫을 만큼 강해요. 금속 차체가 안쪽의 전기장을 0으로 만드는 것이 핵심이에요.', '움직임과 상관없이 금속 차체가 전기장을 차폐해요.', '금속은 전기를 잘 통하는 도체예요. 그래서 전하가 바깥 표면에 퍼져 안쪽 전기장이 0이 돼요.'],
          explain: '속이 빈 금속 차체는 도체라서 번개의 전하가 <b>바깥 표면으로만</b> 퍼지고, 정전기 평형에서 도체 <b>내부의 전기장은 0</b>이에요(<b>정전 차폐</b>). 같은 이유로 엘리베이터 속에서 휴대폰 신호가 약해지고, 정밀 기기에 금속 케이스를 써요.',
        },
      ],
    },
    {
      title: '유전 분극: 절연체의 반응', short: '유전 분극', icon: '🧻', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 도체 속에서는 자유전자가 이동해 전기장이 0이 되는 것을 봤어요. 그런데 <b>절연체</b>에는 자유전자가 없어요. 절연체는 전기장에 어떻게 반응할까요?</div>' +
        '<p>절연체 속의 <b>분자</b>가 전기장에서 쌍극자로 정렬돼요. 극성 분자(물)는 <b>회전·정렬</b>하고, 무극성 분자는 전자 구름이 조금 <b>이동</b>해요. 이것이 <b>유전 분극</b>이에요. 표면에 분극 전하가 나타나서 안쪽의 전기장이 줄어들고(E = E₀/κ), 축전기에 넣으면 전기 용량이 κ배가 돼요. 🏭 전자레인지·콘덴서가 이 원리를 써요.</p>',
      features: ['dielec'],
      setup() { S.gate = ''; const d = S.de; if (d.tw) d.tw.cancel(); d.tw = null; d.sub = 'paper'; d.k = 1; d.kd = 1; d.conn = true; d.mol = 'polar'; d.Qd = 1; seqReset(); num3.clear(); setScene('dielec'); },
      recap: '절연체는 전기장에서 분자가 쌍극자로 정렬(유전 분극)되어 표면에 분극 전하가 나타나고, 안쪽 전기장이 E₀/κ로 줄어요. 축전기에 유전체를 채우면 C = κC₀가 돼요.',
      summary: '<ul><li><b>유전 분극</b>: 절연체를 전기장에 놓으면 분자가 쌍극자로 정렬해요. 극성 분자(물)는 <b>회전·정렬</b>, 무극성 분자는 <b>전자 구름이 이동</b>해요. 표면에는 막대 쪽에 반대 부호, 먼 쪽에 같은 부호의 <b>분극 전하</b>가 나타나요.</li><li>종이 조각이 막대에 끌려오는 까닭: 분극으로 가까운 쪽에 반대 부호가 생겨 <b>가까운 쪽 인력이 먼 쪽 반발력보다 커요</b>.</li><li>유전체 안의 전기장은 <b>E = E₀/κ</b>로 줄어요. κ(유전 상수): 진공 1, 종이 약 3, 유리 약 5, 물 약 80.</li><li>축전기에 유전체를 가득 채우면 <b>C = κC₀</b>. 예) C₀ = 100 pF, κ = 4 → 400 pF. 전지를 연결한 채면 Q가 4배(4.0 nC), 전지를 뗀 채면 Q는 1.0 nC 그대로이고 V가 1/4(2.5 V)로 줄어요.</li></ul>',
      missions: [
        {
          title: '종이 조각이 끌려오는 과정',
          goal: '오른쪽의 네 문장을 종이 조각이 끌려오는 과정에 맞는 <b>순서대로</b> 누르세요. 맞게 누르면 장면이 진행돼요.',
          hint: '막대가 다가오면 가장 먼저 분자가 반응해요. 그다음 표면에 전하가 나타나고, 힘이 생기고, 마지막으로 종이가 움직여요.',
          setup() { S.gate = ''; S.de.sub = 'paper'; seqReset(); setScene('dielec'); },
          check: () => S.de.stage >= 4 && S.de.stF > 3.97,
          hold: 0.8,
          status: () => seqBtns.map((b) => mark(b.classList.contains('done'))).join(' ') + ' &nbsp; (' + Math.round(S.de.stage) + ' / 4 단계)',
          explain: '<b>① 분자 정렬(분극) → ② 표면 분극 전하(막대 쪽 (+), 먼 쪽 (−)) → ③ 가까운 쪽 인력 > 먼 쪽 반발력 → ④ 끌려와 붙음</b> 순서예요. 종이는 절연체라서 전자가 이동하지는 않지만 분자 하나하나가 분극되어 이런 힘이 생겨요.',
        },
        {
          title: 'C = κC₀ 계산하기', manual: true,
          goal: '<b>C₀ = 100 pF</b>인 평행판 축전기에 <b>κ = 4</b>인 유전체를 가득 채웠어요. 전기 용량 C를 계산해 입력하세요.',
          hint: '유전체를 가득 채우면 전기 용량은 κ배가 돼요: C = κC₀.',
          setup() { S.gate = 'num3'; S.de.sub = 'cap'; S.de.conn = true; S.de.k = 4; S.de.kd = 4; num3.clear(); setScene('dielec'); updateCtl(); },
          check: () => checkNum(num3, 400, 0.02, '다시 계산해 보세요. C = κC₀ = 4 × 100 pF 이에요. 단위가 pF임을 확인해요.'),
          status: () => 'κ = 4, C₀ = 100 pF &nbsp; (C 값은 숨겨 두었어요)',
          explain: 'C = κC₀ = 4 × 100 pF = <b>400 pF</b>이에요. 유전체 안에서 전기장이 1/4로 줄어 같은 전하를 더 낮은 전압에 저장할 수 있어서 전기 용량이 κ배가 돼요.',
        },
        {
          type: 'quiz', title: '전지를 뗀 뒤 유전체를 넣으면?',
          goal: '10 V로 충전(Q = 1.0 nC)한 뒤 <b>전지를 떼고</b> κ = 4인 유전체를 가득 채우면 극판 사이의 전압은? (🔋 축전기 장면에서 확인해 보세요)',
          setup() { S.gate = ''; S.de.sub = 'cap'; S.de.conn = true; S.de.k = 1; S.de.kd = 1; setScene('dielec'); },
          choices: ['10 V 그대로예요. 절연체는 전기장에 아무 영향도 줄 수 없어요', '40 V로 커져요', '2.5 V로 줄어요', '0 V가 돼요'],
          answer: 2,
          feedback: ['절연체도 분극이 일어나서 안쪽 전기장을 줄여요. 영향이 없다는 것은 오개념이에요.', '전기 용량이 κ배로 커지고 Q가 그대로이면 V = Q/C는 작아져요.', '', 'Q가 그대로 남아 있으므로 V는 0이 되지 않아요.'],
          explain: '전지를 뗀 채라서 전하는 <b>Q = 1.0 nC 그대로</b>예요. 유전체를 넣으면 C가 4배(400 pF)가 되므로 V = Q/C = 1.0 nC / 400 pF = <b>2.5 V</b>예요. 분극 전하가 안쪽 전기장을 1/4로 줄이기 때문이에요(E = E₀/κ).',
        },
      ],
    },
    {
      title: '생활 속 적용: 터치스크린과 차폐', short: '생활 속 적용', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 도체의 정전기 유도, 정전 차폐, 절연체의 유전 분극을 배웠어요. 이 원리들이 우리 주변 기술에 어떻게 쓰일까요?</div>' +
        '<p>여섯 가지 사례 카드를 <b>정전기 유도 / 유전 분극 / 정전 차폐</b>로 분류해요. 그다음 <b>정전식 터치스크린</b>에서 손가락이 전극의 정전 용량을 바꾸는 모습을 보며, 장갑을 끼면 왜 반응하지 않는지 알아봐요.</p>',
      features: ['apply'],
      setup() { S.gate = ''; S.ap.sub = 'cards'; initCards(); S.ap.touch.x = (TS.x0 + TS.x1) / 2; S.ap.touch.y = (TS.y0 + TS.y1) / 2; S.ap.touch.glove = 'bare'; S.ap.touch.seen = {}; setScene('apply'); },
      recap: '터치스크린과 정전 도장은 도체의 정전기 유도, 전자레인지와 정전기 청소포는 유전 분극, 자동차 차체와 금속 케이스는 정전 차폐를 이용해요.',
      summary: '<ul><li><b>정전기 유도</b>의 이용: 정전식 터치스크린(손가락이 전극 가까이 오면 전하가 이동해 <b>정전 용량이 수 pF 변하는</b> 위치를 읽음), 정전 도장(접지된 금속에 반대 전하가 유도돼 대전된 페인트 입자가 끌려와요).</li><li><b>유전 분극</b>의 이용: 전자레인지(2.45 GHz로 방향이 바뀌는 전기장에 물 분자가 계속 회전하며 열이 나요), 정전기 청소포(절연체인 먼지를 분극시켜 끌어당김).</li><li><b>정전 차폐</b>의 이용: 번개 칠 때 자동차 안, 엘리베이터 속 휴대폰 신호 약화, 정밀 기기의 금속 케이스.</li><li>정전식 터치스크린은 <b>도체</b>(맨손, 도체 장갑)만 인식해요. 일반 장갑(절연체)은 전하의 이동을 막아 반응하지 않아요.</li><li>🏭 복사기·레이저 프린터·전기 집진기도 대전된 입자와 정전기력을 이용하는 기술이에요.</li></ul>',
      missions: [
        {
          title: '사례 분류하기', manual: true,
          goal: '여섯 장의 카드를 <b>정전기 유도 · 유전 분극 · 정전 차폐</b> 중 알맞은 칸에 끌어다 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '도체 속에서 전하가 움직이면 정전기 유도, 절연체(분자)가 정렬하면 유전 분극, 금속 안쪽에서 전기장이 0이면 정전 차폐예요.',
          setup() { S.gate = ''; S.ap.sub = 'cards'; initCards(); setScene('apply'); },
          check: () => {
            const cs = S.ap.cards, un = cs.filter((c) => c.bin == null).length; if (un) return '아직 분류하지 않은 카드가 ' + un + '장 있어요.';
            let bad = 0; cs.forEach((c) => { const w = c.bin !== c.ans; if (w) bad++; if (w && !c.bad) { c.shake = 1; } c.bad = w; });
            return bad ? bad + '장이 알맞지 않은 칸에 있어요. 빨간 카드의 설명을 다시 읽어 보세요.' : true;
          },
          status: () => '분류한 카드 ' + S.ap.cards.filter((c) => c.bin != null).length + ' / 6',
          explain: '<b>정전기 유도</b>: 터치스크린(손가락 도체), 정전 도장(접지된 금속). <b>유전 분극</b>: 전자레인지(물 분자 회전), 정전기 청소포(먼지 분극). <b>정전 차폐</b>: 번개 속 자동차, 금속 기기 케이스.',
        },
        {
          type: 'quiz', title: '장갑을 끼면 왜 안 될까?',
          goal: '정전식 터치스크린이 <b>일반 장갑</b>을 낀 손은 인식하지 못하는 까닭은? (🖐 터치스크린 장면에서 확인해 보세요)',
          setup() { S.gate = ''; S.ap.sub = 'touch'; setScene('apply'); },
          choices: ['절연체인 장갑이 손가락과 전극 사이의 전하 이동(정전기 유도)을 막아 정전 용량이 거의 변하지 않기 때문이에요', '장갑이 손가락의 열을 막기 때문이에요', '장갑을 끼면 손가락이 화면에 닿지 못하기 때문이에요', '정전식 화면은 압력으로 터치를 인식하기 때문이에요'],
          answer: 0,
          feedback: ['', '정전식 터치스크린은 열을 감지하지 않아요. 전극의 정전 용량 변화를 읽어요.', '장갑을 끼고도 화면에 닿을 수는 있어요. 인식이 안 되는 것은 전기적인 이유 때문이에요.', '압력을 읽는 것은 저항막 방식이에요. 정전식은 손가락(도체)이 일으키는 정전 용량의 변화를 읽어요.'],
          explain: '정전식 터치스크린은 손가락(<b>도체</b>)이 전극에 가까워질 때 전하가 이동해 생기는 <b>정전 용량의 변화(수 pF)</b>를 읽어요. 절연체인 일반 장갑은 이 전하의 이동을 막아 거의 변화가 없고, <b>도체 실이 들어간 장갑</b>은 인식돼요. 참고로 전자레인지에서 얼음보다 물이 더 잘 데워지는 것도 같은 맥락이에요(얼음에서는 분자가 고정되어 회전하기 어려워요).',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));

  game = SciSim.game({
    simId: 'hq-electrostatic-induction', mount: '#game', badge: '정전기 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { induce: '🎈 금속 막대 · 전자 입자 · 전하 분포 그래프', electro: '🔌 검전기 · 접지 · 금속 상자', dielec: '🧻 종이 조각 · 분자 모형 · 축전기', apply: '🏠 사례 카드 · 터치스크린' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  initInd(); initScope(); initCards();
  S.sc.probe.x = VW / 2; S.sc.probe.y = PHONE ? 290 : 300;
  S.ap.touch.x = (TS.x0 + TS.x1) / 2; S.ap.touch.y = (TS.y0 + TS.y1) / 2;
  updateCtl();
  function stepAll1(dt) {
    if (S.mode === 'induce') stepInd(dt);
    else if (S.mode === 'electro') stepScope(dt);
    else if (S.mode === 'dielec') stepDielec(dt);
    else if (S.mode === 'apply') stepCards(dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    if (S.mode === 'induce') drawInd();
    else if (S.mode === 'electro') { sceneBg(); if (S.sc.sub === 'scope') drawScope(); else drawShield(); }
    else if (S.mode === 'dielec') drawDielec(); else drawApply();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, G1, SP, AP, TS, PAPER, M1R, M2R, CARDS, num3, m1Sels, m2Sels, MS, GLOVE,
    get game() { return game; }, setScene, counts, toggleSep, scS, scopeDone, seqClick, seqReset, capVals, touchRead, binRect, cardHome, setKappa, setConn, initInd, initScope, bodyPix, updateCtl, seqBtns, shieldE,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
