/* =========================================================
   물리학 Ⅱ. 전기와 자기 - 축전기와 센서 (단원 4차시)
   성취기준 [12물리02-03] 축전기에서 전기 에너지를 저장하는 원리가 각종 센서와 전기 신호 입력 장치 등 실생활 제품에서 활용됨을 설명할 수 있다.
   ① 실험: 충전과 방전 (전류는 줄고 전압은 늘어요, 방전하면 전구가 순간 켜졌다 꺼져요)
   ② 모형: 전하 분리 (전지가 전자를 한 판에서 다른 판으로 옮겨요)
   ③ 탐구: 에너지 저장과 순간 방출 (충전 전압, LED, AED · 카메라 플래시)
   ④ 적용: 센서 (터치스크린 · 콘덴서 마이크 · 가속도 센서)
   축전기의 전기 용량(C = Q / V), 연결, 유전체는 다루지 않아요 (화면과 문구에도 쓰지 않아요).
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 730 : 560;
  const SH = PHONE ? 340 : 330;                 // 위쪽 장면 높이 (아래는 자료 영역)
  const PY = SH + 10, PH = VH - PY - 10;         // 자료 영역
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);

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
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  function sceneBg() {
    const g = ctx.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#eaf1fb'); g.addColorStop(1, '#f7f9fd');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, SH);
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const fmtN = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const f1 = (v) => fmtN(v, 1);
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const POS = '#e2464b', NEG = '#2f6df6';

  /* ---------- 물리 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const V_BAT = 6;                          // ① ② 전지 전압 (V)
  const KIND = 0.015;                       // 축전기의 성질을 하나의 수로 묶은 모형 상수 (화면에는 나오지 않아요): 시간 상수 = 저항 × KIND
  const R_CH = 80, R_DIS = 100, R_FAST = 30; // 충전 저항, 방전(전구·LED) 저항, ③의 빠른 충전 저항 (Ω)
  const TAU_C = R_CH * KIND, TAU_D = R_DIS * KIND, TAU_F = R_FAST * KIND;   // 1.2 s, 1.5 s, 0.45 s
  const I_GAUGE = 80, V_GAUGE = 8;          // 전류계(mA), 전압계(V) 눈금 끝
  const T_WIN = 8;                          // 그래프의 시간 폭 (초)
  const FULL = 0.95;                        // '충전이 끝났다'고 보는 비율
  const I_TH = 10;                          // LED가 켜지는 최소 전류 (mA)
  const T_BAT = 7.5;                        // ③ 비교: 전지로 같은 전하를 내보내는 시간 (초)
  const K_MAX = 4, N_EL = 8;                // ② 판 하나의 전자 수(중성일 때)와 옮겨지는 전자 수의 최댓값
  const AED_J = 150, AED_MS = 5, AED_CH = 10;   // AED: 150 J을 5 ms에 방출, 충전 10 s
  const AED_KW = AED_J / (AED_MS / 1000) / 1000; // 30 kW
  const FLASH_V = 300, FLASH_MS = 1;

  /* ---------- 축전기 모형 (충전 / 방전 / 열림) ---------- */
  function makeCap(v0, tauC, rC, rD) {
    return { v0, tauC, rC, rD, V: 0, I: 0, mode: 'open', t: 0, hc: [], hd: [], acc: 0 };
  }
  function capStep(c, dt) {
    if (c.mode === 'charge') { c.V = c.v0 + (c.V - c.v0) * Math.exp(-dt / c.tauC); c.I = (c.v0 - c.V) / c.rC * 1000; }
    else if (c.mode === 'discharge') { c.V *= Math.exp(-dt / TAU_D); c.I = c.V / c.rD * 1000; }
    else c.I = 0;
    if (c.V < 1e-4) c.V = 0;
    if (c.mode === 'charge' || c.mode === 'discharge') {
      c.t += dt; c.acc += dt;
      const arr = c.mode === 'charge' ? c.hc : c.hd;
      while (c.acc >= 0.05) { c.acc -= 0.05; if (c.t <= T_WIN) arr.push({ t: c.t, I: c.I, V: c.V }); }
    }
  }
  function capSetMode(c, m) {
    if (c.mode === m) return;
    c.mode = m; c.t = 0; c.acc = 0;
    if (m === 'charge') c.hc = [{ t: 0, I: (c.v0 - c.V) / c.rC * 1000, V: c.V }];
    if (m === 'discharge') c.hd = [{ t: 0, I: c.V / c.rD * 1000, V: c.V }];
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'cc', t: 0, fade: 0, gate: '',
    cc: Object.assign(makeCap(V_BAT, TAU_C, R_CH, R_DIS), { flags: {}, seg: {}, bulb: 0 }),
    sp: Object.assign(makeCap(V_BAT, TAU_C, R_CH, R_DIS), { kc: 0, fly: [], lbTop: '', lbBot: '', order: {}, orderOK: {}, flags: {} }),
    en: Object.assign(makeCap(9, TAU_F, R_FAST, R_DIS), { vSel: 6, rec: {}, led: 0, onT: 0, wasOn: false, phase: 'idle' }),
    sn: { sub: 'touch', glove: 0, fx: 0, fy: 0, drag: false, tIdx: 0, hold: 0, done: 0, sig: [], det: null, ld: 0.65, pc: 1, ph: 0, tilt: 0, mass: 0, cards: {}, cardOK: {}, wave: [], seenSub: {} },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { cc: '🔋 충·방전', sp: '🔍 전하 분리', en: '⚡ 에너지 저장', sn: '📲 센서' };

  /* ---------- 공통 UI ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = n.getAttribute('data-gate-off').split(',').indexOf(S.gate) < 0;
      if (on && n.hasAttribute('data-sub')) on = S.sn.sub === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#swSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.cc.mode));
    $$('#spSeg button, #spSeg2 button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sp.mode));
    $$('#evSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.en.vSel); b.disabled = S.en.phase !== 'idle'; });
    $('#bEnCharge').disabled = S.en.phase === 'charging' || S.en.phase === 'discharging' || S.en.phase === 'ready';
    $('#bEnDis').disabled = S.en.phase !== 'ready';
    $$('#snSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sn.sub));
    $$('#gvSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.sn.glove));
    $$('#ldSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.sn.ld));
    $$('#pcSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.sn.pc));
    const st = $('#sTilt'); if (+st.value !== S.sn.tilt) st.value = S.sn.tilt;
    st.style.setProperty('--pct', ((S.sn.tilt + 10) / 20 * 100) + '%'); $('#oTilt').textContent = (S.sn.tilt > 0 ? '+' : S.sn.tilt < 0 ? '−' : '') + Math.abs(S.sn.tilt);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  function makeSelects(host, rules, store, okStore) {
    const sels = [];
    rules.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + r[0] + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r[0]);
      sel.innerHTML = '<option value="">— 고르기 —</option>' + r[1].map((o, j) => '<option value="' + (j + 1) + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { store[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okStore[i]; Sound.click(); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    return sels;
  }
  function checkSelects(rules, store, okStore, sels, hintMsg) {
    const miss = rules.filter((r, i) => !store[i]);
    if (miss.length) return '아직 고르지 않은 문장이 ' + miss.length + '개 있어요.';
    let bad = 0;
    rules.forEach((r, i) => {
      const ok = +store[i] - 1 === r[2];
      if (!ok) bad++;
      if (!ok && okStore[i] !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
      if (ok) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
      okStore[i] = ok;
    });
    return bad ? hintMsg : true;
  }
  function resetSelects(sels, store, okStore) { Object.keys(store).forEach((k) => delete store[k]); Object.keys(okStore).forEach((k) => delete okStore[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  // ② 충전 과정 순서 정하기: 네 문장을 순서대로 고르기
  const STEPS_TXT = ['전지가 한 판의 전자를 다른 판으로 옮겨요', '한 판은 (+), 다른 판은 (−)가 되고 판 사이에 전기장과 전위차가 생겨요', '축전기의 전위차가 전지 전압과 같아지면 전자가 더 이상 이동하지 않아요', '전류가 0이 돼요'];
  const ORDER_RULES = [1, 2, 3, 4].map((n) => [n + '번째로 일어나는 일은?', STEPS_TXT, n - 1]);
  const orderSel = makeSelects($('#orderRows'), ORDER_RULES, S.sp.order, S.sp.orderOK);
  // ④ 센서와 원리 연결하기
  const PRINC = ['손가락이 가까워지면 전극에 모인 전하가 달라지는 위치를 읽어요', '소리로 진동판이 움직여 판 사이 거리가 변하면 전하가 드나들며 전류 신호가 생겨요', '가속하면 안의 질량이 움직여 판 사이 거리가 변하고 모이는 전하가 달라져요'];
  const CARD_RULES = [['👆 터치스크린은', PRINC, 0], ['🎤 콘덴서 마이크는', PRINC, 1], ['📱 가속도 센서는', PRINC, 2]];
  const cardSel = makeSelects($('#cardRows'), CARD_RULES, S.sn.cards, S.sn.cardOK);

  /* ================= 공통 그리기 ================= */
  function drawGauge(cx, cy, r, f, full, opts) {
    opts = opts || {};
    const th = (q) => Math.PI * (1.12 + 0.76 * q);
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, th(0), th(1)); ctx.stroke();
    const n = opts.ticks || 10;
    for (let i = 0; i <= n; i++) { const a = th(i / n), big = i % (n / 2) === 0; ctx.lineWidth = big ? 2.5 : 1.2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * (r - (big ? 11 : 7)), cy + Math.sin(a) * (r - (big ? 11 : 7))); ctx.stroke(); }
    [0, 0.5, 1].forEach((q) => { const a = th(q); T(cx + Math.cos(a) * (r - 22), cy + Math.sin(a) * (r - 22) + 4, String(fmtN(full * q, 0)), 11.5, '#3a465c', 'center', 800); });
    const a = th(clamp(f, 0, 1.04));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5)); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, 5.5, '#394258', { gloss: false });
  }
  function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function polyAt(pts, d) {
    for (let i = 1; i < pts.length; i++) {
      const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= L || i === pts.length - 1) { const f = clamp(d / Math.max(L, 1e-6), 0, 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; }
      d -= L;
    }
    return pts[pts.length - 1];
  }
  const KFLOW = 1.6;                                     // 전류 1 mA당 점의 속력 (px/s)
  function stepSegs(segs, store, dt) { segs.forEach((sg) => { const st = store[sg.k] || (store[sg.k] = { off: 0 }); st.off = (st.off + sg.I * KFLOW * dt) % 22; }); }
  function drawSegs(segs, store) {
    segs.forEach((sg) => {
      if (sg.I < 0.3) return;
      const L = polyLen(sg.pts), off = (store[sg.k] || { off: 0 }).off;
      for (let d = off; d < L; d += 22) { const q = polyAt(sg.pts, d); D.sphere(q[0], q[1], 3.6, '#ff9a3c', { gloss: false, outline: 'rgba(120,60,0,.35)', outlineWidth: 1 }); }
    });
  }
  function wires(list, col) {
    ctx.strokeStyle = col || '#7a8599'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    list.forEach((pts) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); });
  }
  function drawBatt(x, y0, y1, label) {
    D.shadow(() => { D.roundRect(x - 19, y0, 38, y1 - y0, 8); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 2 });
    T(x, y0 + 20, '+', 20, '#ffb4ae', 'center', 800); T(x, y1 - 10, '−', 20, '#a9c4ff', 'center', 800); T(x, (y0 + y1) / 2 + 5, label, 14, '#fff', 'center', 800);
  }
  function drawBulb(x, y, b, r) {
    r = r || 20;
    if (b > 0.02) D.glow(x, y, r * 2 + r * 2.4 * Math.sqrt(clamp(b, 0, 1)), '#ffd447', clamp(0.2 + 0.65 * b, 0, 0.85));
    D.sphere(x, y, r, C.mix('#dfe3ea', '#fff2a8', clamp(0.15 + 0.85 * b, 0, 1)), { shadow: true });
    ctx.strokeStyle = b > 0.05 ? '#f26b3a' : '#8a95a6'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 7, y + 9); ctx.lineTo(x - 4, y - 2); ctx.lineTo(x, y + 3); ctx.lineTo(x + 4, y - 2); ctx.lineTo(x + 7, y + 9); ctx.stroke();
  }
  // 축전기 기호: 두 판. n = 판의 전하 기호 수
  function drawCapPlates(cx, y1, y2, w, n, ratio) {
    const th = 8;
    D.shadow(() => { D.roundRect(cx - w / 2, y1 - th, w, th, 3); ctx.fillStyle = '#9aa6bb'; ctx.fill(); D.roundRect(cx - w / 2, y2, w, th, 3); ctx.fill(); }, { blur: 5, y: 2 });
    for (let i = 0; i < n; i++) { const x = cx - w / 2 + (i + 0.5) * w / Math.max(n, 1); T(x, y1 - th - 4, '+', 14, POS, 'center', 800); T(x, y2 + th + 14, '−', 15, NEG, 'center', 800); }
    if (ratio > 0.03) { for (let i = 0; i < 4; i++) { const x = cx - w / 2 + (i + 0.5) * w / 4, y0 = y1 + 2, yb = y2 - 2; D.arrow(x, y0, x, y0 + (yb - y0) * clamp(ratio, 0.1, 1), { color: '#5a4fcf', width: 2, head: 7, alpha: 0.7 }); } }
  }
  function drawPlot(x, y, w, h, title, hist, cur, active, tag) {
    panel(x, y, w, h, 14);
    T(x + 14, y + 22, title, 13.5, '#26324a', 'left', 800);
    const gx0 = x + 44, gx1 = x + w - 44, gy0 = y + 36, gy1 = y + h - 30;
    ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1;
    [0, 0.5, 1].forEach((q) => { const yy = gy1 - (gy1 - gy0) * q; ctx.beginPath(); ctx.moveTo(gx0, yy); ctx.lineTo(gx1, yy); ctx.stroke(); T(gx0 - 6, yy + 4, String(fmtN(I_GAUGE * q, 0)), 11.5, '#b45309', 'right', 800); T(gx1 + 6, yy + 4, String(fmtN(V_GAUGE * q, 0)), 11.5, '#2f6df6', 'left', 800); });
    [0, 2, 4, 6, 8].forEach((s) => { const xx = gx0 + (gx1 - gx0) * s / T_WIN; ctx.beginPath(); ctx.moveTo(xx, gy1); ctx.lineTo(xx, gy1 + 4); ctx.stroke(); T(xx, gy1 + 17, String(s), 11.5, '#3a465c', 'center', 800); });
    T(gx1, gy1 + 28, '시간 (s)', 11, '#5a6679', 'right', 700); T(x + w - 34, y + 22, 'mA', 11.5, '#b45309', 'right', 800); T(x + w - 14, y + 22, 'V', 11.5, '#2f6df6', 'right', 800);   // 단위는 제목 줄 오른쪽에 (제목·눈금 글자와 겹치지 않게)
    const xs = (t) => gx0 + (gx1 - gx0) * clamp(t, 0, T_WIN) / T_WIN;
    const line = (key, full, col) => {
      if (hist.length < 2) return;
      ctx.beginPath(); hist.forEach((p, i) => { const px = xs(p.t), py = gy1 - (gy1 - gy0) * clamp(p[key] / full, 0, 1); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    };
    line('I', I_GAUGE, '#f2873a'); line('V', V_GAUGE, '#2f6df6');
    if (hist.length < 2) T((gx0 + gx1) / 2, (gy0 + gy1) / 2 + 4, tag, 13, '#98a2b3', 'center', 700);
    if (active && hist.length) { const p = hist[hist.length - 1]; D.sphere(xs(p.t), gy1 - (gy1 - gy0) * clamp(p.I / I_GAUGE, 0, 1), 4.5, '#f2873a', { gloss: false }); D.sphere(xs(p.t), gy1 - (gy1 - gy0) * clamp(p.V / V_GAUGE, 0, 1), 4.5, '#2f6df6', { gloss: false }); }
    void cur;
  }

  /* ================= ① 충전과 방전 ================= */
  const CK = (() => {
    const T_ = 112, B_ = 292, bx = PHONE ? 40 : 64, cx = PHONE ? 330 : 420, px = PHONE ? 200 : 270, c1x = px - 70;
    return { T: T_, B: B_, bx, batT: 168, batB: 232, P: [px, 152], C1: [c1x, T_], C2: [c1x, 192], cx, topY: 208, botY: 252, bulbY: 250 };
  })();
  function ccSegs() {
    const c = S.cc, k = CK;
    if (c.mode === 'charge') return [
      { k: 'a', I: c.I, pts: [[k.bx, k.batT], [k.bx, k.T], k.C1, k.P, [k.cx, k.P[1]], [k.cx, k.topY]] },
      { k: 'b', I: c.I, pts: [[k.cx, k.botY], [k.cx, k.B], [k.bx, k.B], [k.bx, k.batB]] }];
    if (c.mode === 'discharge') return [
      { k: 'c', I: c.I, pts: [[k.cx, k.topY], [k.cx, k.P[1]], k.P, k.C2, [k.C2[0], k.bulbY - 22]] },
      { k: 'd', I: c.I, pts: [[k.C2[0], k.bulbY + 22], [k.C2[0], k.B], [k.cx, k.B], [k.cx, k.botY]] }];
    return [];
  }
  function stepCC(dt) {
    const c = S.cc;
    capStep(c, dt);
    const bulbRef = V_BAT / R_DIS * 1000;
    c.bulb = SciSim.approach(c.bulb, c.mode === 'discharge' ? c.I / bulbRef : 0, dt, 25);
    if (c.mode === 'charge' && c.V >= FULL * c.v0) c.flags.charged = true;
    if (c.mode === 'discharge' && c.bulb >= 0.5) c.flags.flash = true;
    if (c.flags.flash && c.bulb < 0.05) c.flags.dim = true;
    c.lever = SciSim.approach(c.lever == null ? 0.5 : c.lever, c.mode === 'charge' ? 0 : c.mode === 'discharge' ? 1 : 0.5, dt, 12);
    c.nA = SciSim.approach(c.nA || 0, c.I / I_GAUGE, dt, 20); c.nV = SciSim.approach(c.nV || 0, c.V / V_GAUGE, dt, 20);
    stepSegs(ccSegs(), c.seg, dt);
  }
  function drawCC() {
    sceneBg();
    const c = S.cc, k = CK;
    T(14, 26, '🔋 축전기의 충전과 방전', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '스위치를 ⚡ 충전 쪽으로 돌렸다가 💡 방전 쪽으로 돌려 보세요', PHONE ? 11.5 : 13.5, '#5a6679', 'left', 700);
    wires([[[k.bx, k.batT], [k.bx, k.T], k.C1], [[k.P[0], k.P[1]], [k.cx, k.P[1]], [k.cx, k.topY]], [[k.cx, k.botY], [k.cx, k.B], [k.bx, k.B], [k.bx, k.batB]], [k.C2, [k.C2[0], k.bulbY - 22]], [[k.C2[0], k.bulbY + 22], [k.C2[0], k.B]]]);
    drawSegs(ccSegs(), c.seg);
    drawBatt(k.bx, k.batT, k.batB, V_BAT + ' V');
    // 스위치
    const ang = Math.atan2(k.C1[1] - k.P[1], k.C1[0] - k.P[0]), ang2 = Math.atan2(k.C2[1] - k.P[1], k.C2[0] - k.P[0]), angO = Math.PI;
    const lv = c.lever == null ? 0.5 : c.lever;
    const a = lv < 0.5 ? ang + (angO - ang) * (lv / 0.5) : angO + (ang2 - angO) * ((lv - 0.5) / 0.5);
    const Ls = Math.hypot(k.C1[0] - k.P[0], k.C1[1] - k.P[1]);
    ctx.strokeStyle = c.mode === 'open' ? '#e2464b' : '#14a058'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(k.P[0], k.P[1]); ctx.lineTo(k.P[0] + Math.cos(a) * Ls, k.P[1] + Math.sin(a) * Ls); ctx.stroke();
    [k.C1, k.C2, k.P].forEach((q) => D.sphere(q[0], q[1], 5.5, '#394258', { gloss: false }));
    T(k.C1[0] - 8, k.C1[1] - 12, '충전', 13, '#14803f', 'right', 800); T(k.C2[0] + 14, k.C2[1] + 4, '방전', 13, '#b45309', 'left', 800);
    // 전구
    drawBulb(k.C2[0], k.bulbY, c.bulb, 21);
    // 축전기
    const n = Math.round(5 * c.V / c.v0);
    drawCapPlates(k.cx, k.topY + 8, k.botY, 84, n, c.V / c.v0);
    T(k.cx + 56, (k.topY + k.botY) / 2 + 6, '축전기', 13, '#26324a', 'left', 800);
    // 계기판
    const gx = PHONE ? 12 : 556, gy = PHONE ? PY : 58, gw = PHONE ? VW - 24 : VW - 556 - 12, gh = PHONE ? 130 : SH - 58 - 8;
    panel(gx, gy, gw, gh, 14);
    const r = PHONE ? 50 : 46, cy = gy + (PHONE ? 100 : 150);
    const cx1 = gx + gw * 0.27, cx2 = gx + gw * 0.73;
    D.label(cx1, gy + 22, '전류계 (mA)', { bg: '#f2873a', size: 12.5 }); D.label(cx2, gy + 22, '전압계 (V)', { bg: '#2f6df6', size: 12.5 });
    drawGauge(cx1, cy, r, c.nA, I_GAUGE, { ticks: 8 }); drawGauge(cx2, cy, r, c.nV, V_GAUGE, { ticks: 8 });
    T(cx1, cy + (PHONE ? 20 : 26), f1(c.I) + ' mA', PHONE ? 15 : 17, '#26324a', 'center', 800); T(cx2, cy + (PHONE ? 20 : 26), fmtN(c.V, 2) + ' V', PHONE ? 15 : 17, '#26324a', 'center', 800);
    if (!PHONE) T(gx + gw / 2, gy + gh - 14, c.mode === 'charge' ? '전류는 줄고 전압은 늘어요' : c.mode === 'discharge' ? '전류도 전압도 줄어요' : c.V > 0.05 ? '전지를 떼도 전압이 남아 있어요' : '', 12, '#9a3412', 'center', 800);
    // 그래프
    const px = 12, py = PHONE ? PY + 140 : PY;
    if (PHONE) { drawPlot(px, py, VW - 24, (PH - 140 - 10) / 2, '충전 곡선', c.hc, c, c.mode === 'charge', '⚡ 충전하면 그려져요'); drawPlot(px, py + (PH - 140 - 10) / 2 + 10, VW - 24, (PH - 140 - 10) / 2, '방전 곡선', c.hd, c, c.mode === 'discharge', '💡 방전하면 그려져요'); }
    else { const w = (VW - 24 - 10) / 2; drawPlot(px, py, w, PH, '충전 곡선 (스위치를 ⚡로)', c.hc, c, c.mode === 'charge', '⚡ 충전하면 그려져요'); drawPlot(px + w + 10, py, w, PH, '방전 곡선 (스위치를 💡로)', c.hd, c, c.mode === 'discharge', '💡 방전하면 그려져요'); }
  }
  $$('#swSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); capSetMode(S.cc, b.dataset.v); updateCtl(); }));
  $('#bCcReset').addEventListener('click', () => { Sound.click(); const c = S.cc; c.mode = 'open'; c.V = 0; c.I = 0; c.hc = []; c.hd = []; c.t = 0; c.bulb = 0; updateCtl(); });

  /* ================= ② 전하 분리 (두 판 단면 확대) ================= */
  const SPG = (() => {
    const x0 = PHONE ? 160 : 250, w = PHONE ? 230 : 220, yT = PHONE ? 150 : 142, yB = PHONE ? 262 : 238, wx = PHONE ? 70 : 130;
    return { x0, x1: x0 + w, w, yT, yB, wx, nSlot: 12, th: 22 };
  })();
  const slotX = (i) => SPG.x0 + (i + 0.5) * SPG.w / SPG.nSlot;
  const slotY = (plate) => (plate === 'T' ? SPG.yT : SPG.yB) + 5;
  function spInit() {
    const s = S.sp;
    s.nT = N_EL; s.nB = N_EL; s.fly = []; s.spawnT = 0;
  }
  function spPath(fromPlate, i0, toPlate, i1) {
    const g = SPG, yFrom = slotY(fromPlate), yTo = slotY(toPlate), top = g.yT, bot = g.yB;
    const mid = (top + bot) / 2;
    // 윗판 → 왼쪽 도선 → 아랫판 (또는 반대)
    const pts = fromPlate === 'T'
      ? [[slotX(i0), yFrom], [g.x0 - 8, yFrom], [g.wx, top], [g.wx, mid], [g.wx, bot], [g.x0 - 8, yTo], [slotX(i1), yTo]]
      : [[slotX(i0), yFrom], [g.x0 - 8, yFrom], [g.wx, bot], [g.wx, mid], [g.wx, top], [g.x0 - 8, yTo], [slotX(i1), yTo]];
    return pts;
  }
  function stepSP(dt) {
    const s = S.sp;
    capStep(s, dt);
    s.bulb = SciSim.approach(s.bulb || 0, s.mode === 'discharge' ? s.I / (V_BAT / R_DIS * 1000) : 0, dt, 25);
    // 목표 전자 수 (옮겨진 전자 수) = K_MAX × 전압 비율
    const kT = Math.round(K_MAX * s.V / V_BAT);
    const inF = s.fly.filter((f) => f.dir > 0).length, inR = s.fly.filter((f) => f.dir < 0).length;
    const kPlan = (s.nB - N_EL) + inF;                  // 아랫판의 알짜 전자 수 + 날아가는 중인 전자
    s.spawnT -= dt;
    if (s.spawnT <= 0 && s.mode !== 'open') {
      if (kT > kPlan && s.nT > 0 && s.mode === 'charge') {
        const i0 = s.nT - 1, i1 = s.nB + inF; s.nT--;
        s.fly.push({ dir: 1, t: 0, dur: RM ? 0.05 : 1.15, pts: spPath('T', i0, 'B', Math.min(i1, SPG.nSlot - 1)) }); s.spawnT = 0.28;
      } else if (kT < kPlan && s.nB > N_EL && s.mode === 'discharge') {
        const i0 = s.nB - 1, i1 = s.nT + inR; s.nB--;
        s.fly.push({ dir: -1, t: 0, dur: RM ? 0.05 : 1.15, pts: spPath('B', i0, 'T', Math.min(Math.max(i1, 0), SPG.nSlot - 1)) }); s.spawnT = 0.28;
      }
    }
    for (let i = s.fly.length - 1; i >= 0; i--) {
      const f = s.fly[i]; f.t += dt;
      if (f.t >= f.dur) { if (f.dir > 0) s.nB++; else s.nT++; s.fly.splice(i, 1); }
    }
    s.settled = s.fly.length === 0;
    if (s.mode === 'charge' && s.V >= FULL * s.v0 && s.nB - N_EL === K_MAX && s.settled) s.flags.full = true;
    s.nV = SciSim.approach(s.nV || 0, s.V / V_GAUGE, dt, 20);
  }
  function drawSP() {
    sceneBg();
    const s = S.sp, g = SPG;
    T(14, 26, '🔍 축전기 안에서 일어나는 일 (두 판의 단면 확대)', PHONE ? 14 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '전지가 한 판의 전자를 다른 판으로 옮겨요 · 전자 = 파란 공, 이온 = 빨간 +', PHONE ? 11 : 13.5, '#5a6679', 'left', 700);
    // 도선 + 전지/전구
    const mid = (g.yT + g.yB) / 2;
    wires([[[g.x0, g.yT], [g.wx, g.yT], [g.wx, mid - 34]], [[g.x0, g.yB], [g.wx, g.yB], [g.wx, mid + 34]]]);
    if (s.mode === 'discharge') { drawBulb(g.wx, mid, s.bulb, 22); wires([[[g.wx, mid - 34], [g.wx, mid - 22]], [[g.wx, mid + 22], [g.wx, mid + 34]]]); }
    else if (s.mode === 'charge') drawBatt(g.wx, mid - 34, mid + 34, V_BAT + ' V');
    else { // 열림: 전지를 떼어 놓은 모습
      ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.wx, mid - 34); ctx.lineTo(g.wx + 14, mid - 12); ctx.stroke();
      D.sphere(g.wx, mid - 34, 4.5, '#394258', { gloss: false }); D.sphere(g.wx, mid + 34, 4.5, '#394258', { gloss: false });
      T(g.wx + 22, mid + 8, '연결 끊김', 12.5, '#b4231f', 'left', 800);
    }
    T(g.wx - 16, mid - 40 - 6, s.mode === 'discharge' ? '전구' : s.mode === 'charge' ? '전지' : '스위치 열림', 12.5, '#26324a', 'right', 800);
    // 판
    const plate = (yc, label, net) => {
      D.shadow(() => { D.roundRect(g.x0, yc - g.th / 2, g.w, g.th, 6); ctx.fillStyle = '#c9d2e0'; ctx.fill(); }, { blur: 6, y: 2 });
      for (let i = 0; i < 8; i++) T(g.x0 + (i + 0.5) * g.w / 8, yc - 2, '+', 12, '#e2574c', 'center', 800);
      void label; void net;
    };
    plate(g.yT, '윗판', 0); plate(g.yB, '아랫판', 0);
    for (let i = 0; i < s.nT; i++) D.sphere(slotX(i), slotY('T') + 1, 4.8, NEG, { gloss: false, outline: '#1d3f9c', outlineWidth: 1 });
    for (let i = 0; i < s.nB; i++) D.sphere(slotX(i), slotY('B') + 1, 4.8, NEG, { gloss: false, outline: '#1d3f9c', outlineWidth: 1 });
    const a = N_EL - s.nT, b = s.nB - N_EL;
    if (a > 0) T(g.x1 + 10, g.yT + 5, '+' + a, 15, POS, 'left', 800); if (b > 0) T(g.x1 + 10, g.yB + 5, '−' + b, 15, NEG, 'left', 800);
    // 전기장
    const ratio = s.V / V_BAT, n = 6;
    if (ratio > 0.03) for (let i = 0; i < n; i++) { const x = g.x0 + (i + 0.5) * g.w / n, y0 = g.yT + g.th / 2 + 3, yb = g.yB - g.th / 2 - 3; D.arrow(x, y0, x, y0 + (yb - y0) * clamp(ratio, 0.12, 1), { color: '#5a4fcf', width: 2.5, head: 8, alpha: 0.75 }); }
    if (ratio > 0.2) D.label((g.x0 + g.x1) / 2, mid, '전기장 + 전위차', { bg: 'rgba(90,79,207,.9)', size: PHONE ? 11.5 : 12.5 });
    // 이동 중인 전자
    s.fly.forEach((f) => {
      const p = SciSim.ease.inOutQuad(clamp(f.t / f.dur, 0, 1)), L = polyLen(f.pts), q = polyAt(f.pts, L * p);
      D.glow(q[0], q[1], 14, '#7aa2ff', 0.5); D.sphere(q[0], q[1], 5.2, NEG, { gloss: false, outline: '#1d3f9c', outlineWidth: 1 });
    });
    // 전위차 막대
    const bx = PHONE ? 400 : 556, by = PHONE ? 80 : 58, bw = PHONE ? 70 : VW - 556 - 12, bh = SH - by - 8;
    panel(bx, by, bw, bh, 12);
    if (!PHONE) {
      T(bx + 12, by + 22, '전위차 비교', 13.5, '#26324a', 'left', 800);
      const top = by + 56, bot = by + bh - 40, bar = (cx, v, col, nm, val) => {
        const w = 44; D.roundRect(cx - w / 2, top, w, bot - top, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
        const hh = (bot - top) * clamp(v / V_GAUGE, 0, 1); if (hh > 0.5) { ctx.save(); D.roundRect(cx - w / 2, top, w, bot - top, 8); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(cx - w / 2, bot - hh, w, hh); ctx.restore(); }
        T(cx, bot + 17, nm, 12.5, '#3a465c', 'center', 800); T(cx, bot - hh - 7 < top + 12 ? top + 14 : bot - hh - 7, val, 13, hh > (bot - top) - 18 ? '#fff' : '#26324a', 'center', 800);
      };
      bar(bx + bw * 0.27, V_BAT, '#516079', '전지', V_BAT + ' V'); bar(bx + bw * 0.73, s.V, '#5a4fcf', '축전기', fmtN(s.V, 2) + ' V');
      const eqY = by + 56 + (bh - 96) * (1 - V_BAT / V_GAUGE); ctx.save(); ctx.strokeStyle = '#516079'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 10, eqY); ctx.lineTo(bx + bw - 10, eqY); ctx.stroke(); ctx.restore();
    } else {
      T(bx + bw / 2, by + 18, '전위차', 12.5, '#26324a', 'center', 800);
      const top = by + 30, bot = by + bh - 28, w = 26;
      [[bx + bw * 0.28, V_BAT, '#516079', '전지'], [bx + bw * 0.72, s.V, '#5a4fcf', '판']].forEach((q) => { D.roundRect(q[0] - w / 2, top, w, bot - top, 6); ctx.fillStyle = '#eef1f7'; ctx.fill(); const hh = (bot - top) * clamp(q[1] / V_GAUGE, 0, 1); if (hh > 0.5) { ctx.save(); D.roundRect(q[0] - w / 2, top, w, bot - top, 6); ctx.clip(); ctx.fillStyle = q[2]; ctx.fillRect(q[0] - w / 2, bot - hh, w, hh); ctx.restore(); } T(q[0], bot + 15, q[3], 11, '#3a465c', 'center', 800); });
    }
    // 아래: 전자 수 기록
    const f = s.fly.length, tot = a - b - f;
    panel(12, PY, PHONE ? VW - 24 : 520, PHONE ? 190 : PH, 14);
    T(26, PY + 24, '두 판의 전하 (전자는 사라지거나 생기지 않아요)', 13.5, '#26324a', 'left', 800);
    const rows = [['윗판', '전자 ' + s.nT + '개', '이온 ' + N_EL + '개', a > 0 ? '알짜 전하 +' + a : '알짜 전하 0 (중성)'], ['아랫판', '전자 ' + s.nB + '개', '이온 ' + N_EL + '개', b > 0 ? '알짜 전하 −' + b : b < 0 ? '알짜 전하 +' + (-b) : '알짜 전하 0 (중성)']];
    rows.forEach((r, i) => { const yy = PY + 52 + i * 28; T(26, yy, r[0], 13.5, '#26324a', 'left', 800); T(PHONE ? 90 : 100, yy, r[1] + ' · ' + r[2], PHONE ? 12.5 : 13.5, '#3a465c', 'left', 800); T(PHONE ? 270 : 330, yy, r[3], PHONE ? 12.5 : 13.5, i ? NEG : POS, 'left', 800); });
    T(26, PY + 120, '도선 속 전자 ' + f + '개', 13.5, '#3a465c', 'left', 800);
    T(26, PY + 150, '전하의 합 = (' + (a >= 0 ? '+' : '−') + Math.abs(a) + ') + (' + (b > 0 ? '−' + b : b < 0 ? '+' + (-b) : '0') + ') + (' + (f > 0 ? '−' + f : '0') + ') = ' + (tot === 0 ? '0' : String(tot)), PHONE ? 13.5 : 15, '#9a3412', 'left', 800);
    const rx = PHONE ? 12 : 544, ry = PHONE ? PY + 200 : PY, rw = PHONE ? VW - 24 : VW - 544 - 12, rh = PHONE ? PH - 200 : PH;
    panel(rx, ry, rw, rh, 14);
    T(rx + 14, ry + 24, '에너지는 어디에 저장될까?', 13.5, '#26324a', 'left', 800);
    let yy = ry + 46;
    ['분리된 전하들의 전기 위치 에너지로 저장돼요.', '전지 전압과 같아지면 전자가 더 이상 이동하지 않아요.', '방전하면 전자가 도선으로 되돌아오며 에너지를 전구에 전해요.'].forEach((m) => { yy += textBlock(rx + 14, yy, rw - 28, '• ' + m, PHONE ? 12 : 13, '#26324a', PHONE ? 15 : 17, 800) + 4; });
  }
  $$('#spSeg button, #spSeg2 button').forEach((b) => b.addEventListener('click', () => { Sound.click(); capSetMode(S.sp, b.dataset.v); updateCtl(); }));
  $('#bSpReset').addEventListener('click', () => { Sound.click(); spReset(); });
  function spReset() { const s = S.sp; s.mode = 'open'; s.V = 0; s.I = 0; s.hc = []; s.hd = []; s.t = 0; s.bulb = 0; spInit(); updateCtl(); }
  $('#lbTop').addEventListener('change', (e) => { S.sp.lbTop = e.target.value; e.target.classList.remove('ok', 'bad'); Sound.click(); });
  $('#lbBot').addEventListener('change', (e) => { S.sp.lbBot = e.target.value; e.target.classList.remove('ok', 'bad'); Sound.click(); });

  /* ================= ③ 에너지 저장과 순간 방출 ================= */
  const I_GR3 = 100;                                          // ③ 그래프의 전류 눈금 끝 (mA)
  const tOn = (v) => TAU_D * Math.log((v / R_DIS * 1000) / I_TH);       // 전류가 LED 최소 전류(10 mA) 아래로 내려가는 때 (초)
  const q0 = (v) => v / R_DIS * 1000 * TAU_D;                           // 방출하는 전하(곡선 아래 넓이, mA·s)
  const E3 = (() => {
    const cw = PHONE ? 228 : 316, bx = PHONE ? 38 : 56, cx = PHONE ? 112 : 150, lx = PHONE ? 188 : 258;
    return { cw, bx, cx, lx, T: 128, B: 262, topY: 170, botY: 212 };
  })();
  function enSegs() {
    const c = S.en, k = E3, I = Math.min(c.I, 100);
    if (c.mode === 'charge') return [
      { k: 'a', I, pts: [[k.bx, 150], [k.bx, k.T], [k.cx, k.T], [k.cx, k.topY - 8]] },
      { k: 'b', I, pts: [[k.cx, k.botY + 8], [k.cx, k.B], [k.bx, k.B], [k.bx, 230]] }];
    if (c.mode === 'discharge') return [
      { k: 'c', I, pts: [[k.cx, k.topY - 8], [k.cx, k.T], [k.lx, k.T], [k.lx, 158]] },
      { k: 'd', I, pts: [[k.lx, 222], [k.lx, k.B], [k.cx, k.B], [k.cx, k.botY + 8]] }];
    return [];
  }
  function enCharge() {
    const c = S.en; if (c.phase !== 'idle') return;
    c.v0 = c.vSel; c.V = 0; c.hd = []; c.curT = 0; c.onT = 0;
    capSetMode(c, 'charge'); c.phase = 'charging'; Sound.click(); updateCtl();
  }
  function enDischarge() {
    const c = S.en; if (c.phase !== 'ready') return;
    capSetMode(c, 'discharge'); c.phase = 'discharging'; c.dt0 = 0; c.onT = 0; c.wasOn = false; Sound.click(); updateCtl();
  }
  function stepEN(dt) {
    const c = S.en;
    capStep(c, dt);
    if (c.phase === 'charging' && c.V >= 0.99 * c.v0) { c.V = c.v0; capSetMode(c, 'open'); c.phase = 'ready'; Sound.success(); updateCtl(); }
    if (c.phase === 'discharging') {
      c.dt0 += dt;
      const on = c.I >= I_TH;
      if (c.wasOn && !on && c.rec[c.v0] == null) { /* 켜진 시간은 곡선에서 정확히 구해요 */ }
      if (on) c.wasOn = true;
      if (c.I < 0.5) {
        c.rec[c.v0] = { I0: c.v0 / R_DIS * 1000, ton: tOn(c.v0), Q: q0(c.v0) };
        c.lastRec = c.v0; c.phase = 'idle'; capSetMode(c, 'open'); c.V = 0; c.I = 0; Sound.success();
        parts.burst(PHONE ? 188 : 258, 190, { count: 10, speed: 100, size: 3, colors: ['#ffd447', '#f26b3a', '#fff'], gravity: 40 }); updateCtl();
      }
    }
    const ref = 90;
    c.led = SciSim.approach(c.led, c.mode === 'discharge' && c.I >= I_TH ? clamp(c.I / ref, 0.15, 1) : 0, dt, 25);
    stepSegs(enSegs(), c.seg2 || (c.seg2 = {}), dt);
  }
  function drawEN() {
    sceneBg();
    const c = S.en, k = E3;
    T(14, 26, '⚡ 에너지를 모았다가 한꺼번에 내보내기', PHONE ? 14.5 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '충전 전압을 고르고 ⚡ 충전 → 💡 LED로 방전', PHONE ? 11.5 : 13.5, '#5a6679', 'left', 700);
    // 회로
    wires([[[k.bx, 150], [k.bx, k.T], [k.cx - 24, k.T]], [[k.cx + 24, k.T], [k.cx, k.T], [k.cx, k.topY - 8]], [[k.cx, k.botY + 8], [k.cx, k.B], [k.bx, k.B], [k.bx, 230]], [[k.cx, k.T], [k.lx - 24, k.T]], [[k.lx + 24, k.T], [k.lx, k.T], [k.lx, 158]], [[k.lx, 222], [k.lx, k.B], [k.cx, k.B]]]);
    drawSegs(enSegs(), c.seg2 || (c.seg2 = {}));
    drawBatt(k.bx, 150, 230, c.vSel + ' V');
    const sw = (x, y, on, nm) => { ctx.strokeStyle = on ? '#14a058' : '#e2464b'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 20, y); if (on) ctx.lineTo(x + 20, y); else ctx.lineTo(x + 16, y - 14); ctx.stroke(); D.sphere(x - 20, y, 4, '#394258', { gloss: false }); D.sphere(x + 20, y, 4, '#394258', { gloss: false }); T(x, y - 22, nm, 11.5, '#3a465c', 'center', 800); };
    sw((k.bx + k.cx) / 2 + 12, k.T, c.mode === 'charge', '충전');
    sw((k.cx + k.lx) / 2 + 8, k.T, c.mode === 'discharge', '방전');
    // LED
    const lit = c.led > 0.02;
    if (lit) D.glow(k.lx, 190, 24 + 60 * c.led, '#ffd447', 0.3 + 0.5 * c.led);
    D.sphere(k.lx, 190, 18, lit ? C.mix('#fff0a0', '#ffd447', c.led) : '#c9ced8', { shadow: true });
    T(k.lx, 195, 'LED', 11.5, lit ? '#7a5b00' : '#7b8aa3', 'center', 800);
    ctx.fillStyle = C.mix('#eaf1fb', '#f7f9fd', 240 / SH); ctx.fillRect(k.lx - 17, 231, 34, 18);      // 아래로 지나가는 도선이 글자를 가로지르지 않게 가려요
    T(k.lx, 240, lit ? '켜짐' : '꺼짐', 12.5, lit ? '#b45309' : '#98a2b3', 'center', 800);
    // 축전기와 저장 에너지 막대
    drawCapPlates(k.cx, k.topY, k.botY, 76, Math.round(5 * c.V / (c.vSel || 1)), c.V / 9);
    T(k.cx, 285 + (PHONE ? 4 : 8), '축전기 ' + fmtN(c.V, 1) + ' V', 12.5, '#26324a', 'center', 800);
    const eb = 20, ebx = PHONE ? 208 : 292, ey0 = 76, ey1 = 268; D.roundRect(ebx, ey0, eb, ey1 - ey0, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const ef = clamp((c.V * c.V) / 81, 0, 1), eh = (ey1 - ey0) * ef;
    if (eh > 0.5) { ctx.save(); D.roundRect(ebx, ey0, eb, ey1 - ey0, 6); ctx.clip(); ctx.fillStyle = '#f2873a'; ctx.fillRect(ebx, ey1 - eh, eb, eh); ctx.restore(); }
    T(ebx + eb / 2, ey0 - 6, '저장', 11.5, '#9a3412', 'center', 800); T(ebx + eb / 2, ey1 + 14, '에너지', 11.5, '#9a3412', 'center', 800);
    T(14, SH - 8 - (PHONE ? 0 : 0), c.phase === 'idle' ? '1단계: ⚡ 충전하기' : c.phase === 'charging' ? '충전 중…' : c.phase === 'ready' ? '충전 완료! 2단계: 💡 LED로 방전' : '방전 중…', 13, '#9a3412', 'left', 800);
    // 그래프
    const gx = PHONE ? 12 : 340, gy = PHONE ? PY : 58, gw = PHONE ? VW - 24 : VW - 340 - 12, gh = PHONE ? 190 : SH - 58 - 8;
    drawEnGraph(gx, gy, gw, gh);
    // 아래 카드
    const ay = PHONE ? PY + 200 : PY, ah = PHONE ? PH - 200 : PH, aw = PHONE ? VW - 24 : 420;
    drawAED(12, ay, aw, ah);
    if (PHONE) drawEnTable(244, 58, VW - 244 - 8, SH - 58 - 8); else drawEnTable(444, PY, VW - 444 - 12, PH);
  }
  function drawEnGraph(x, y, w, h) {
    const c = S.en;
    panel(x, y, w, h, 14);
    T(x + 14, y + 22, '방전 전류의 변화 (전류–시간 그래프)', 13.5, '#26324a', 'left', 800);
    const gx0 = x + 46, gx1 = x + w - 16, gy0 = y + 42, gy1 = y + h - 34;
    const xs = (t) => gx0 + (gx1 - gx0) * clamp(t, 0, T_WIN) / T_WIN, ys = (I) => gy1 - (gy1 - gy0) * clamp(I / I_GR3, 0, 1);
    ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx0, ys(v)); ctx.lineTo(gx1, ys(v)); ctx.stroke(); T(gx0 - 6, ys(v) + 4, String(v), 11.5, '#3a465c', 'right', 800); });
    [0, 2, 4, 6, 8].forEach((s) => { ctx.beginPath(); ctx.moveTo(xs(s), gy1); ctx.lineTo(xs(s), gy1 + 4); ctx.stroke(); T(xs(s), gy1 + 17, String(s), 11.5, '#3a465c', 'center', 800); });
    T(gx1, gy1 + 30, '방전 시간 (s)', 11, '#5a6679', 'right', 700); T(gx0 - 6, gy0 - 8, 'mA', 11, '#b45309', 'right', 800);
    // LED가 켜지는 최소 전류
    ctx.save(); ctx.strokeStyle = '#e2464b'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx0, ys(I_TH)); ctx.lineTo(gx1, ys(I_TH)); ctx.stroke(); ctx.restore();
    T(gx1 - 4, ys(I_TH) - 5, 'LED 최소 전류 ' + I_TH + ' mA', 11, '#b4231f', 'right', 800);
    // 전지로 같은 전하를 내보낼 때 (약한 전류 · 오랜 시간)
    const sel = c.vSel, I0 = sel / R_DIS * 1000, lvl = q0(sel) / T_BAT;
    D.roundRect(xs(0), ys(lvl), xs(T_BAT) - xs(0), gy1 - ys(lvl), 3); ctx.fillStyle = 'rgba(81,96,121,.14)'; ctx.fill(); ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    // 저장된 기록 곡선
    const COL = { 3: '#8bc34a', 6: '#2f9fd6', 9: '#8b5cf6' };
    const curve = (v, alpha, fill, lw) => {
      const I0v = v / R_DIS * 1000; ctx.beginPath(); ctx.moveTo(xs(0), ys(0));
      for (let t = 0; t <= T_WIN + 0.001; t += 0.1) ctx.lineTo(xs(t), ys(I0v * Math.exp(-t / TAU_D)));
      ctx.lineTo(xs(T_WIN), ys(0)); ctx.closePath();
      if (fill) { ctx.fillStyle = C.rgba(COL[v], 0.18 * alpha); ctx.fill(); }
      ctx.beginPath(); for (let t = 0; t <= T_WIN + 0.001; t += 0.1) { const px = xs(t), py = ys(I0v * Math.exp(-t / TAU_D)); t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.strokeStyle = C.rgba(COL[v], alpha); ctx.lineWidth = lw; ctx.stroke();
    };
    [3, 6, 9].forEach((v) => { if (c.rec[v] && v !== sel) curve(v, 0.55, false, 2); });
    ctx.save(); ctx.setLineDash([3, 4]); curve(sel, 0.5, false, 2); ctx.restore();
    // 지금 방전하는 곡선 (실시간)
    if (c.phase === 'discharging' || (c.rec[sel] && c.phase === 'idle')) {
      const tmax = c.phase === 'discharging' ? Math.min(c.t, T_WIN) : T_WIN;
      ctx.beginPath(); ctx.moveTo(xs(0), ys(0)); for (let t = 0; t <= tmax + 1e-6; t += 0.05) ctx.lineTo(xs(t), ys(I0 * Math.exp(-t / TAU_D))); ctx.lineTo(xs(tmax), ys(0)); ctx.closePath(); ctx.fillStyle = C.rgba(COL[sel], 0.3); ctx.fill();
      ctx.beginPath(); for (let t = 0; t <= tmax + 1e-6; t += 0.05) { const px = xs(t), py = ys(I0 * Math.exp(-t / TAU_D)); t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.strokeStyle = COL[sel]; ctx.lineWidth = 3.5; ctx.stroke();
      if (c.phase === 'discharging') D.sphere(xs(tmax), ys(I0 * Math.exp(-tmax / TAU_D)), 5, COL[sel], { gloss: false });
    }
    if (c.rec[sel]) { const to = c.rec[sel].ton; ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = COL[sel]; ctx.beginPath(); ctx.moveTo(xs(to), ys(I_TH)); ctx.lineTo(xs(to), gy1); ctx.stroke(); ctx.restore(); T(xs(to) + 4, gy1 - 6, 'LED ' + f1(to) + ' s', 11.5, COL[sel], 'left', 800); }
    T(gx1 - 4, gy0 + 14, '곡선 아래 넓이 = 방출한 전하', 11.5, '#5a6679', 'right', 700);      // 곡선이 왼쪽 위에서 시작하므로 설명은 오른쪽에 둬요
    T(gx1 - 4, gy0 + 30, c.vSel + ' V 충전: 처음 ' + fmtN(I0, 0) + ' mA, 넓이 ' + f1(q0(c.vSel)) + ' mA·s', 11.5, COL[c.vSel], 'right', 800);
    T(gx1 - 4, gy0 + 46, '점선 상자(전지): 같은 전하를 ' + f1(lvl) + ' mA로 ' + T_BAT + ' s 동안', 11.5, '#516079', 'right', 800);
  }
  function drawAED(x, y, w, h) {
    panel(x, y, w, h, 14);
    T(x + 14, y + 24, '⚡ 순간 방출: 카메라 플래시와 제세동기(AED)', 13.5, '#26324a', 'left', 800);
    let yy = y + 46;
    yy += textBlock(x + 14, yy, w - 28, '• 카메라 플래시: 전지(수 V)로 몇 초 충전 → 약 ' + FLASH_V + ' V로 모았다가 약 ' + FLASH_MS + ' ms에 방전', PHONE ? 12 : 13, '#26324a', PHONE ? 15 : 17, 800) + 4;
    yy += textBlock(x + 14, yy, w - 28, '• AED: 배터리로 ' + AED_CH + ' 초 충전 → ' + AED_J + ' J을 ' + AED_MS + ' ms에 방출', PHONE ? 12 : 13, '#26324a', PHONE ? 15 : 17, 800) + 6;
    T(x + 14, yy + 6, '충전할 때 평균 전력: ' + AED_J + ' J / ' + AED_CH + ' s = ' + fmtN(AED_J / AED_CH, 0) + ' W', PHONE ? 12.5 : 13.5, '#14803f', 'left', 800);
    T(x + 14, yy + 30, '방전할 때 평균 전력: ' + AED_J + ' J / ' + AED_MS / 1000 + ' s = ' + (S.aedOK ? fmtN(AED_KW, 0) + ' kW (' + fmtN(AED_KW * 1000, 0) + ' W)' : '? kW'), PHONE ? 12.5 : 13.5, '#b4231f', 'left', 800);
    textBlock(x + 14, yy + 52, w - 28, '장면은 보기 쉽게 천천히 보여 줘요. 축전기 덕분에 전지가 낼 수 없는 큰 전력을 순간적으로 낼 수 있어요.', PHONE ? 11.5 : 12.5, '#5a6679', PHONE ? 15 : 16, 700);
  }
  function drawEnTable(x, y, w, h) {
    panel(x, y, w, h, 14);
    T(x + 12, y + 22, '충전 전압별 방전 기록', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
    const cols = PHONE ? [0, 0.30, 0.62] : [0, 0.19, 0.43, 0.71], ww = w - 24;
    const heads = PHONE ? ['전압', '처음 전류', 'LED 켜짐'] : ['전압', '처음 전류', 'LED 시간', '방출 전하'];
    const hy = y + 46, rh = PHONE ? 30 : 34;
    heads.forEach((hd, i) => T(x + 12 + ww * cols[i], hy, hd, 12, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 8, hy + 6); ctx.lineTo(x + w - 8, hy + 6); ctx.stroke();
    [3, 6, 9].forEach((v, i) => {
      const r = S.en.rec[v], yy = hy + 10 + i * rh, mid = yy + rh * 0.66;
      if (S.en.lastRec === v) { D.roundRect(x + 6, yy, w - 12, rh - 2, 6); ctx.fillStyle = 'rgba(255,212,71,.28)'; ctx.fill(); }
      T(x + 12 + ww * cols[0], mid, v + ' V', 13.5, '#26324a', 'left', 800);
      if (!r) { T(x + 12 + ww * cols[1], mid, '—', 13, '#b0b8c6', 'left', 800); return; }
      T(x + 12 + ww * cols[1], mid, fmtN(r.I0, 0) + ' mA', 13, '#26324a', 'left', 800);
      T(x + 12 + ww * cols[2], mid, f1(r.ton) + ' s', 13, '#b45309', 'left', 800);
      if (!PHONE) T(x + 12 + ww * cols[3], mid, f1(r.Q) + ' mA·s', 13, '#26324a', 'left', 800);
    });
    if (!PHONE) textBlock(x + 12, hy + 10 + 3 * rh + 14, w - 24, '높은 전압으로 충전할수록 더 많은 에너지가 저장되어 LED가 더 오래, 더 밝게 켜져요.', 12.5, '#5a6679', 16, 700);
  }
  $$('#evSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.en.phase === 'idle') { S.en.vSel = +b.dataset.v; } updateCtl(); }));
  $('#bEnCharge').addEventListener('click', enCharge);
  $('#bEnDis').addEventListener('click', enDischarge);

  /* ================= ④ 센서 ================= */
  const TC = { cols: 8, rows: 5, cell: 52, gx: PHONE ? 32 : 24, gy: PHONE ? 62 : 62, r: 18 };
  const SIG_SIGMA = TC.cell * 0.55, THRESH = 0.5, GLOVE_GAIN = 0.35;    // 손가락 신호의 퍼짐, 감지 문턱, 장갑일 때 신호의 크기
  const TARGETS = [[2, 1], [5, 3], [7, 0]];                              // 목표 칸 (열, 행) — 0부터 센 값, 화면에는 1부터 써요
  const cellC = (c, r) => ({ x: TC.gx + (c + 0.5) * TC.cell, y: TC.gy + (r + 0.5) * TC.cell });
  function touchSig() {
    const s = S.sn, out = [];
    for (let r = 0; r < TC.rows; r++) for (let c = 0; c < TC.cols; c++) {
      const p = cellC(c, r), d = Math.hypot(s.fx - p.x, s.fy - p.y);
      out.push({ c, r, v: Math.exp(-Math.pow(d / SIG_SIGMA, 2)) * (s.glove ? GLOVE_GAIN : 1) });
    }
    return out;
  }
  function touchDetect(sig) { let best = null; sig.forEach((q) => { if (!best || q.v > best.v) best = q; }); return best && best.v >= THRESH ? best : null; }
  const MIC = (() => { const dp = PHONE ? 150 : 200, bp = dp + (PHONE ? 70 : 80); return { sx: PHONE ? 50 : 66, sy: 190, dp, bp, top: 120, bot: 262 }; })();
  const ACC = (() => { const x0 = PHONE ? 40 : 56, w = PHONE ? 190 : 224, y0 = 120, h = 140; return { x0, w, y0, h, m: 46, x1: x0 + w }; })();
  function stepSN(dt) {
    const s = S.sn;
    s.ph += TAU * s.pc * dt; if (s.ph > 1e4) s.ph -= 1e4 - (1e4 % TAU);
    if (s.sub === 'touch') {
      const sig = touchSig(), det = touchDetect(sig); s.det = det; s.sig = sig;
      const tg = TARGETS[s.tIdx];
      if (tg && det && det.c === tg[0] && det.r === tg[1]) { s.hold += dt; if (s.hold >= 0.5) { s.hold = 0; s.done++; s.tIdx++; Sound.success(); const p = cellC(det.c, det.r); parts.burst(p.x, p.y, { count: 12, speed: 120, size: 3, colors: ['#ffb400', '#2f6df6', '#fff'], gravity: 40 }); } }
      else s.hold = Math.max(0, s.hold - dt * 2);
    } else if (s.sub === 'mic') {
      s.wacc = (s.wacc || 0) + dt;
      while (s.wacc >= 0.02) { s.wacc -= 0.02; s.wave.push(s.ld * Math.sin(s.ph)); if (s.wave.length > 260) s.wave.shift(); }
    } else {
      s.mass = SciSim.approach(s.mass, -s.tilt / 10, dt, 9);
    }
  }
  function drawSN() {
    sceneBg();
    const s = S.sn;
    if (s.sub === 'touch') drawTouch(); else if (s.sub === 'mic') drawMic(); else drawAcc();
  }
  function drawTouch() {
    const s = S.sn, g = TC;
    T(14, 26, '👆 터치스크린: 손가락이 가까워지면 전하가 달라져요', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '격자 모양 전극마다 모이는 전하를 재요 · 칸이 파랗게 변하는 곳이 손가락 위치예요', PHONE ? 10.5 : 13.5, '#5a6679', 'left', 700);
    const sig = s.sig.length ? s.sig : touchSig(), det = s.det, tg = TARGETS[s.tIdx];
    D.shadow(() => { D.roundRect(g.gx - 6, g.gy - 6, g.cols * g.cell + 12, g.rows * g.cell + 12, 14); ctx.fillStyle = '#dfe5f0'; ctx.fill(); }, { blur: 8, y: 3 });
    sig.forEach((q) => {
      const p = cellC(q.c, q.r), x = p.x - g.cell / 2 + 3, y = p.y - g.cell / 2 + 3, w = g.cell - 6;
      D.roundRect(x, y, w, w, 7); ctx.fillStyle = C.mix('#f6f8fc', '#2f6df6', clamp(q.v, 0, 1) * 0.9); ctx.fill();
      ctx.strokeStyle = det && det.c === q.c && det.r === q.r ? '#14a058' : tg && tg[0] === q.c && tg[1] === q.r ? '#f2873a' : 'rgba(120,135,160,.4)'; ctx.lineWidth = det && det.c === q.c && det.r === q.r ? 3.5 : tg && tg[0] === q.c && tg[1] === q.r ? 3 : 1.2; D.roundRect(x, y, w, w, 7); ctx.stroke();
      if (q.v >= 0.06) T(p.x, p.y + 4, Math.round(q.v * 100) + '', 12, q.v > 0.45 ? '#fff' : '#26324a', 'center', 800);
    });
    if (tg) { const p = cellC(tg[0], tg[1]); D.ring(p.x, p.y, g.cell * 0.46, S.t, { color: '#f2873a', speed: 1.1, width: 2.5 }); }
    // 손가락
    const x = s.fx, y = s.fy;
    if (s.glove) { D.shadow(() => D.sphere(x, y, g.r + 8, '#8a95a6', { gloss: false }), { blur: s.drag ? 12 : 6, y: s.drag ? 6 : 3 }); T(x, y + 4, '장갑', 12, '#fff', 'center', 800); }
    else D.shadow(() => D.sphere(x, y, g.r, '#f4b58a', { shadow: false }), { blur: s.drag ? 12 : 6, y: s.drag ? 6 : 3 });
    if (!s.drag && s.done === 0 && S.t > 1.5 && Math.hypot(s.fx - cellC(4, 2).x, s.fy - cellC(4, 2).y) > 120) { T(x, y - 30, '끌어 보세요', 13, '#9a3412', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 }); }
    // 정보
    const ix = PHONE ? 12 : 456, iy = PHONE ? PY : 58, iw = PHONE ? VW - 24 : VW - 456 - 12, ih = PHONE ? 170 : SH - 58 - 8;
    panel(ix, iy, iw, ih, 14);
    T(ix + 14, iy + 24, '제어 장치가 읽은 값', 13.5, '#26324a', 'left', 800);
    const mx = sig.reduce((m, q) => Math.max(m, q.v), 0);
    T(ix + 14, iy + 52, '가장 큰 신호: ' + Math.round(mx * 100) + ' % (감지 문턱 ' + Math.round(THRESH * 100) + ' %)', PHONE ? 12.5 : 14, mx >= THRESH ? '#14803f' : '#b4231f', 'left', 800);
    T(ix + 14, iy + 78, det ? '감지한 칸: 열 ' + (det.c + 1) + ' · 행 ' + (det.r + 1) : s.glove && mx > 0.08 ? '감지 못 함 — 신호가 약해요 (장갑)' : '감지한 칸: 없음', PHONE ? 12.5 : 14, det ? '#26324a' : '#b4231f', 'left', 800);
    T(ix + 14, iy + 104, tg ? '목표 칸: 열 ' + (tg[0] + 1) + ' · 행 ' + (tg[1] + 1) + ' (' + s.done + ' / ' + TARGETS.length + ' 성공)' : '목표를 모두 맞혔어요! (' + s.done + ' / ' + TARGETS.length + ')', PHONE ? 12.5 : 14, '#9a3412', 'left', 800);
    textBlock(ix + 14, iy + 130, iw - 28, '손가락이 가까워지면 그 칸의 전극에 모이는 전하가 달라지고, 그 변화를 읽어 위치를 알아내요.', PHONE ? 11.5 : 12.5, '#5a6679', PHONE ? 15 : 17, 700);
    if (!PHONE) { const hy = iy + ih - 20; T(ix + 14, hy, '칸 안의 숫자 = 전하 변화(상대 %)', 11.5, '#7b8aa3', 'left', 700); }
    drawSnBottom();
  }
  function drawMic() {
    const s = S.sn, m = MIC;
    T(14, 26, '🎤 콘덴서 마이크: 소리로 판이 움직여요', PHONE ? 14.5 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '진동판이 움직여 판 사이 거리가 변하면 전하가 드나들며 전류 신호가 생겨요', PHONE ? 10.5 : 13.5, '#5a6679', 'left', 700);
    const dx = s.ld * 12 * Math.sin(s.ph);
    // 스피커와 음파
    D.sphere(m.sx, m.sy, 20, '#394258', { shadow: true }); T(m.sx, m.sy + 6, '🔊', 18, '#fff', 'center', 700);
    for (let i = 0; i < 4; i++) { const ph = ((S.t * s.pc * 0.5 + i / 4) % 1); const r = 28 + ph * (m.dp - m.sx - 40); ctx.strokeStyle = C.rgba('#5a4fcf', (1 - ph) * 0.5 * (0.4 + 0.6 * s.ld)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(m.sx, m.sy, r, -0.7, 0.7); ctx.stroke(); }
    // 진동판과 고정판
    D.shadow(() => { D.roundRect(m.dp + dx - 4, m.top, 8, m.bot - m.top, 3); ctx.fillStyle = '#9aa6bb'; ctx.fill(); D.roundRect(m.bp - 4, m.top, 8, m.bot - m.top, 3); ctx.fill(); }, { blur: 5, y: 2 });
    T(m.dp, m.top - 8, '진동판', 12.5, '#26324a', 'center', 800); T(m.bp, m.top - 8, '고정판', 12.5, '#26324a', 'center', 800);
    const gap = m.bp - (m.dp + dx);
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(m.dp + dx + 4, m.bot + 14); ctx.lineTo(m.bp - 4, m.bot + 14); ctx.stroke(); T((m.dp + dx + m.bp) / 2, m.bot + 30, '판 사이 거리 ' + fmtN(gap, 0) + ' px', 12, '#3a465c', 'center', 800);
    // 도선과 증폭기
    wires([[[m.dp + dx, m.bot], [m.dp + dx, m.bot + 4]], [[m.bp, m.bot], [m.bp, m.bot + 6]]], '#7a8599');
    if (!PHONE) { D.arrow(m.bp + 14, 190, 322, 190, { color: '#e2552a', width: 3, head: 10, alpha: 0.8 }); T(m.bp + 8, 176, '전류 신호', 12, '#e2552a', 'left', 800); }
    // 파형 패널
    const px = PHONE ? 12 : 330, py = PHONE ? PY : 58, pw = PHONE ? VW - 24 : VW - 330 - 12, ph = PHONE ? 190 : SH - 58 - 8;
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 22, '전류 신호 (소리의 파형과 같은 모양)', 13.5, '#26324a', 'left', 800);
    const gx0 = px + 14, gx1 = px + pw - 14, gym = py + ph / 2 + 12, amp = (ph - 90) / 2;
    ctx.strokeStyle = 'rgba(120,135,160,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gym); ctx.lineTo(gx1, gym); ctx.stroke();
    ctx.beginPath(); s.wave.forEach((v, i) => { const x = gx1 - (s.wave.length - 1 - i) * (gx1 - gx0) / 260, y = gym - v * amp; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    const A = s.ld, a2 = amp * A;
    ctx.save(); ctx.strokeStyle = 'rgba(90,79,207,.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx0, gym - a2); ctx.lineTo(gx1, gym - a2); ctx.stroke(); ctx.restore();
    T(gx0 + 2, gym - a2 - 5, '진폭(소리 크기) ' + A, 12, '#5a4fcf', 'left', 800);
    T(gx1, py + ph - 12, '소리 높이(진동수) ' + s.pc + ' 번/초 — 장면은 느리게 보여 줘요', 11.5, '#5a6679', 'right', 700);
    drawSnBottom();
  }
  function drawAcc() {
    const s = S.sn, a = ACC;
    T(14, 26, '📱 가속도 센서: 질량이 움직이면 판 사이 거리가 변해요', PHONE ? 13 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '가속하면 안의 질량이 반대쪽으로 쏠려요 · 가까워진 판에 전하가 더 모여요', PHONE ? 10.5 : 13.5, '#5a6679', 'left', 700);
    D.shadow(() => { D.roundRect(a.x0 - 8, a.y0 - 8, a.w + 16, a.h + 16, 14); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(a.x0, a.y0, a.w, a.h, 8); ctx.fillStyle = '#eef2fa'; ctx.fill();
    const plate = (x) => { D.roundRect(x - 4, a.y0 + 8, 8, a.h - 16, 3); ctx.fillStyle = '#9aa6bb'; ctx.fill(); };
    const pl = a.x0 + 10, pr = a.x1 - 10;
    plate(pl); plate(pr);
    const range = (pr - pl - a.m) / 2 - 10, cx = (pl + pr) / 2 + s.mass * range, half = a.m / 2;
    // 용수철
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl + 4, a.y0 + a.h / 2); for (let i = 0; i <= 8; i++) ctx.lineTo(pl + 4 + (cx - half - pl - 4) * i / 8, a.y0 + a.h / 2 + (i % 2 ? 6 : -6)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pr - 4, a.y0 + a.h / 2); for (let i = 0; i <= 8; i++) ctx.lineTo(pr - 4 - (pr - 4 - cx - half) * i / 8, a.y0 + a.h / 2 + (i % 2 ? 6 : -6)); ctx.stroke();
    D.shadow(() => { D.roundRect(cx - half, a.y0 + a.h / 2 - half, a.m, a.m, 8); ctx.fillStyle = '#f2873a'; ctx.fill(); }, { blur: 6, y: 2 });
    T(cx, a.y0 + a.h / 2 + 5, '질량', 13, '#fff', 'center', 800);
    const gl = cx - half - pl, gr = pr - (cx + half), g0 = (pr - pl - a.m) / 2;
    const ql = clamp(g0 / gl, 0, 2) / 2, qr = clamp(g0 / gr, 0, 2) / 2;    // 모이는 전하(상대): 평소(가운데)일 때 50 %
    // 왼쪽/오른쪽 판의 전하 (+ 기호)
    for (let i = 0; i < Math.round(ql * 8); i++) T(pl + 12, a.y0 + 22 + i * 14, '+', 13, POS, 'center', 800);
    for (let i = 0; i < Math.round(qr * 8); i++) T(pr - 12, a.y0 + 22 + i * 14, '+', 13, POS, 'center', 800);
    // 가속 방향 화살표
    if (s.tilt !== 0) D.arrow(a.x0 + a.w / 2 - s.tilt * 4, a.y0 + a.h + 28, a.x0 + a.w / 2 + s.tilt * 4 + (s.tilt > 0 ? 6 : -6), a.y0 + a.h + 28, { color: '#14a058', width: 4, head: 11, label: '가속 방향', labelOffset: 16, labelSize: 12 });
    // 스마트폰 화면 회전
    const landscape = Math.abs(s.tilt) >= 6; s.rot = SciSim.approach(s.rot || 0, landscape ? Math.PI / 2 : 0, S.dt || 0.016, 8);
    const phx = PHONE ? 330 : 388, phy = 180;
    ctx.save(); ctx.translate(phx, phy); ctx.rotate(s.rot);
    D.shadow(() => { D.roundRect(-30, -52, 60, 104, 10); ctx.fillStyle = '#26324a'; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(-25, -44, 50, 88, 6); ctx.fillStyle = '#dff0ff'; ctx.fill(); T(0, 8, '▲', 24, '#2f6df6', 'center', 800); ctx.restore();
    T(phx, phy + 74, landscape ? '화면이 가로로 돌아갔어요' : '화면은 세로 그대로', 12.5, '#26324a', 'center', 800);
    // 정보
    const ix = PHONE ? 12 : 470, iy = PHONE ? PY : 58, iw = PHONE ? VW - 24 : VW - 470 - 12, ih = PHONE ? 170 : SH - 58 - 8;
    if (!PHONE) { panel(ix, iy, iw, ih, 14); T(ix + 14, iy + 24, '모이는 전하 (상대 %)', 13.5, '#26324a', 'left', 800); }
    else { panel(ix, iy, iw, ih, 14); T(ix + 14, iy + 24, '모이는 전하 (상대 %)', 13.5, '#26324a', 'left', 800); }
    const bar = (yy, nm, q, col) => { T(ix + 14, yy + 14, nm, 12.5, '#3a465c', 'left', 800); D.roundRect(ix + 100, yy, iw - 100 - 14, 18, 8); ctx.fillStyle = '#eef1f7'; ctx.fill(); const w = (iw - 114) * clamp(q, 0, 1); if (w > 0.5) { ctx.save(); D.roundRect(ix + 100, yy, iw - 114, 18, 8); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(ix + 100, yy, w, 18); ctx.restore(); } T(ix + 100 + Math.max(w - 6, 30), yy + 14, Math.round(q * 100) + ' %', 12, w > 60 ? '#fff' : '#26324a', w > 60 ? 'right' : 'left', 800); };
    bar(iy + 40, '왼쪽 판', ql, '#f2873a'); bar(iy + 70, '오른쪽 판', qr, '#2f9fd6');
    T(ix + 14, iy + 112, '차이(왼쪽 − 오른쪽): ' + (Math.round(ql * 100) - Math.round(qr * 100)) + ' %p', 13.5, '#9a3412', 'left', 800);
    textBlock(ix + 14, iy + 134, iw - 28, '질량이 가까이 간 판에 전하가 더 모여요. 그 차이로 가속 방향과 크기를 알아내요.', PHONE ? 11.5 : 12.5, '#5a6679', PHONE ? 15 : 17, 700);
    drawSnBottom();
  }
  function drawSnBottom() {
    const s = S.sn;
    if (PHONE) {
      if (s.sub === 'touch') { const w = VW - 24; panel(12, PY + 180, w, PH - 180, 14); T(26, PY + 204, '칸의 숫자 = 전하 변화(상대 %). 맨손과 장갑을 비교해 보세요.', 12, '#5a6679', 'left', 700); }
      if (s.sub === 'mic') { panel(12, PY + 200, VW - 24, PH - 200, 14); T(26, PY + 224, '진폭 = 소리 크기 · 진동수 = 소리 높이 (중학교 파동)', 12.5, '#26324a', 'left', 800); textBlock(26, PY + 248, VW - 52, '큰 소리일수록 판이 크게 움직여 신호의 진폭이 커지고, 높은 음일수록 신호가 촘촘해져요.', 12, '#5a6679', 16, 700); }
      if (s.sub === 'acc') { panel(12, PY + 180, VW - 24, PH - 180, 14); T(26, PY + 204, '스마트폰은 이 신호로 화면 방향을 바꿔요.', 12.5, '#26324a', 'left', 800); }
      return;
    }
    const y = PY, h = PH;
    panel(12, y, VW - 24, h, 14);
    T(26, y + 24, s.sub === 'touch' ? '👆 터치스크린의 원리' : s.sub === 'mic' ? '🎤 콘덴서 마이크의 원리' : '📱 가속도 센서의 원리', 13.5, '#26324a', 'left', 800);
    const lines = s.sub === 'touch'
      ? ['격자 모양의 전극에는 전하가 모여 있어요.', '맨손가락이 가까워지면 그 부근 전극에 모이는 전하가 달라지고, 그 변화로 전류가 흘러요.', '제어 장치가 변화가 가장 큰 칸을 찾아 손가락 위치(좌표)로 읽어요.', '장갑을 끼면 손가락이 전극에서 멀어져 변화가 약해서 감지하지 못해요(물방울이 있으면 오작동하기도 해요).']
      : s.sub === 'mic'
        ? ['소리가 진동판을 흔들면 두 판 사이의 거리가 바뀌어요.', '거리가 바뀌면 판에 모이는 전하가 달라져 전하가 도선으로 드나들며 전류가 흘러요.', '이 전류 신호의 모양은 소리의 파형과 같아요. 진폭 = 소리 크기, 진동수 = 소리 높이예요.']
        : ['스마트폰이 가속하면 안의 질량이 관성 때문에 반대쪽으로 쏠려요.', '질량이 움직이면 양쪽 판과의 거리가 달라져 판에 모이는 전하의 양이 달라져요.', '이 차이를 읽어 스마트폰이 어느 쪽으로 움직이는지 알고 화면 방향을 바꿔요.'];
    let yy = y + 46;
    lines.forEach((m) => { yy += textBlock(26, yy, VW - 52, '• ' + m, 13.5, '#26324a', 18, 800) + 5; });
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'sn' || S.sn.sub !== 'touch') return false;
      const s = S.sn, r = s.glove ? TC.r + 8 : TC.r;
      if (Math.hypot(p.x - s.fx, p.y - s.fy) <= r + 14) { s.drag = true; s.dox = s.fx - p.x; s.doy = s.fy - p.y; Sound.click(); return true; }
      return false;
    },
    move(p) { const s = S.sn; if (!s.drag) return; s.fx = clamp(p.x + s.dox, 14, VW - 14); s.fy = clamp(p.y + s.doy, 56, SH - 6); },
    up() { S.sn.drag = false; },
    hover(p) { return S.mode === 'sn' && S.sn.sub === 'touch' && Math.hypot(p.x - S.sn.fx, p.y - S.sn.fy) <= TC.r + 22 ? 'grab' : 'default'; },
  });
  $$('#snSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub(b.dataset.v); }));
  function setSub(v) { const s = S.sn; if (s.sub !== v) { s.sub = v; s.seenSub[v] = true; S.fade = 0.6; parts.clear(); s.wave.length = 0; } updateCtl(); }
  $$('#gvSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sn.glove = +b.dataset.v; updateCtl(); }));
  $$('#ldSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sn.ld = +b.dataset.v; updateCtl(); }));
  $$('#pcSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sn.pc = +b.dataset.v; updateCtl(); }));
  $('#sTilt').addEventListener('input', (e) => { S.sn.tilt = +e.target.value; Sound.tick(); updateCtl(); });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const MODE_NAME = { charge: '⚡ 충전', discharge: '💡 방전', open: '⏸ 열림' };
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'cc') {
      const k = S.cc;
      L1 = '전류'; a = f1(k.I) + ' mA'; L2 = '축전기 전압'; b = fmtN(k.V, 2) + ' V'; L3 = '스위치'; c = MODE_NAME[k.mode];
    } else if (S.mode === 'sp') {
      const k = S.sp, A = N_EL - k.nT, B = k.nB - N_EL;
      L1 = '윗판 · 아랫판의 알짜 전하'; a = '+' + A + ' · −' + B; L2 = '도선 속 이동 중인 전자'; b = k.fly.length + '개'; L3 = '축전기 전압'; c = fmtN(k.V, 2) + ' V';
    } else if (S.mode === 'en') {
      const k = S.en, r = k.rec[k.vSel];
      L1 = '충전 전압 · 상태'; a = k.vSel + ' V · ' + ({ idle: '대기', charging: '충전 중', ready: '충전 완료', discharging: '방전 중' })[k.phase];
      L2 = '방전 전류'; b = f1(k.phase === 'discharging' ? k.I : 0) + ' mA'; L3 = 'LED 켜진 시간'; c = r ? f1(r.ton) + ' s' : '—';
    } else {
      const s = S.sn;
      if (s.sub === 'touch') { L1 = '감지한 칸'; a = s.det ? '열 ' + (s.det.c + 1) + ' · 행 ' + (s.det.r + 1) : '없음'; L2 = '손'; b = s.glove ? '장갑 낀 손' : '맨손'; L3 = '목표 성공'; c = s.done + ' / ' + TARGETS.length; }
      else if (s.sub === 'mic') { L1 = '소리 크기 (진폭)'; a = String(s.ld); L2 = '소리 높이'; b = (s.pc === 1 ? '낮은 음' : '높은 음') + ' · ' + s.pc + ' 번/초'; L3 = '신호'; c = '파형이 같은 모양'; }
      else { L1 = '가속도'; a = (s.tilt > 0 ? '+' : s.tilt < 0 ? '−' : '') + Math.abs(s.tilt); L2 = '질량의 위치'; b = s.tilt === 0 ? '가운데' : s.tilt > 0 ? '왼쪽으로 쏠림' : '오른쪽으로 쏠림'; L3 = '화면 방향'; c = Math.abs(s.tilt) >= 6 ? '가로' : '세로'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const I_CH0 = V_BAT / R_CH * 1000, I_DIS0 = V_BAT / R_DIS * 1000;
  const truthTop = () => { const a = N_EL - S.sp.nT; return a > 0 ? '+' : a < 0 ? '-' : '0'; };
  const truthBot = () => { const b = S.sp.nB - N_EL; return b > 0 ? '-' : b < 0 ? '+' : '0'; };
  const spFull = () => S.sp.settled && S.sp.V >= FULL * S.sp.v0 && S.sp.nB - N_EL === K_MAX;
  const lbOK = () => spFull() && S.sp.lbTop === truthTop() && S.sp.lbBot === truthBot() && S.sp.lbTop !== '' && S.sp.lbBot !== '';
  const pctF = Math.round(FULL * 100);
  const m_aed = {
    title: '제세동기가 내는 평균 전력 구하기', manual: true,
    goal: 'AED는 ' + AED_J + ' J의 에너지를 약 ' + AED_MS + ' ms(= ' + (AED_MS / 1000) + ' s) 동안 방출해요. 평균 전력을 <b>kW</b>로 구해 쓰고 <b>✔ 확인하기</b>를 누르세요.',
    hint: '전력 = 에너지 ÷ 시간이에요. ' + AED_J + ' ÷ ' + (AED_MS / 1000) + ' = ( ) W이고, 1 kW = 1000 W예요.',
    setup() { S.gate = 'aed'; $('#aIn').value = ''; S.aedOK = false; setScene('en'); updateCtl(); },
    check() {
      const v = parseNum($('#aIn').value);
      if (isNaN(v)) return '숫자로 써 주세요.';
      if (Math.abs(v - AED_KW) <= 0.5) return true;
      if (Math.abs(v - AED_KW * 1000) <= 500) return 'kW 단위로 나타내야 해요. 1 kW = 1000 W예요.';
      return '다시 계산해 보세요. 전력 = ' + AED_J + ' J ÷ ' + (AED_MS / 1000) + ' s예요.';
    },
    status: () => ($('#aIn').value.trim() === '' ? '답을 써 주세요' : '쓴 값: ' + $('#aIn').value + ' kW'),
    explain: '평균 전력 = ' + AED_J + ' J ÷ ' + (AED_MS / 1000) + ' s = <b>' + fmtN(AED_KW * 1000, 0) + ' W = ' + fmtN(AED_KW, 0) + ' kW</b>예요. 같은 에너지를 ' + AED_CH + ' s에 걸쳐 충전할 때의 평균 전력(' + fmtN(AED_J / AED_CH, 0) + ' W)보다 <b>' + fmtN(AED_KW * 1000 / (AED_J / AED_CH), 0) + '배</b>예요. 천천히 모았다가 한꺼번에 내보내기 때문에 전지로는 낼 수 없는 큰 전력을 순간적으로 낼 수 있어요.',
    _aed: true,
  };
  const levels = [
    {
      title: '충전과 방전: 전하를 모았다가 내보내기', short: '충·방전', icon: '🔋', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 스마트폰 화면은 어떻게 손가락이 닿은 곳을 알아챌까? 카메라 플래시는 어떻게 순간적으로 밝을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학과 중학교에서</b> 전기 회로의 전류와 전압, 전지의 역할을 배웠어요. 이제 전기 에너지를 <b>저장</b>하는 부품인 <b>축전기</b>를 알아봐요. 축전기는 얇은 절연체를 사이에 둔 <b>두 도체판</b>이에요.</div>' +
        '<p>전지 – 스위치 – 축전기 – 전구 회로예요. 스위치를 ⚡ <b>충전</b> 쪽으로 돌려 전류와 전압이 어떻게 변하는지 그래프로 살펴보고, 💡 <b>방전</b> 쪽으로 돌려 전구를 켜 봐요.</p>',
      features: ['cc'],
      setup() { S.gate = ''; const c = S.cc; c.mode = 'open'; c.V = 0; c.I = 0; c.hc = []; c.hd = []; c.t = 0; c.bulb = 0; c.flags = {}; setScene('cc'); updateCtl(); },
      recap: '충전할 때는 전류가 처음에 크다가 점점 줄어 0이 되고, 축전기의 전압은 전지 전압에 가까워져요. 방전하면 전구가 순간 밝아졌다가 서서히 꺼져요.',
      summary: '<ul><li><b>축전기</b>: 얇은 절연체를 사이에 둔 두 도체판. 전기 에너지를 저장해요.</li><li><b>충전</b>: 전류가 처음엔 크지만(약 ' + fmtN(I_CH0, 0) + ' mA) 점점 줄어 <b>0</b>이 되고, 축전기의 전압은 전지 전압(' + V_BAT + ' V)에 가까워져요.</li><li><b>방전</b>: 전지를 떼고 전구를 연결하면 전류가 흘러 전구가 순간 밝았다가(약 ' + fmtN(I_DIS0, 0) + ' mA) 점점 꺼져요.</li><li>전류는 판 사이의 절연체를 통과하지 않아요. 도선에서 전하가 이동해요.</li></ul>',
      missions: [
        {
          title: '충전하고 방전해서 전구 켜기',
          goal: '스위치를 ⚡ <b>충전</b>에 두어 축전기를 전지 전압의 <b>' + pctF + ' % 이상</b> 충전한 뒤, 💡 <b>방전</b>으로 돌려 전구가 <b>켜졌다 꺼지는</b> 것을 관찰하세요.',
          hint: '⚡ 충전을 누르고 전압이 ' + fmtN(V_BAT * FULL, 2) + ' V 가까이 될 때까지(약 4초) 기다려요. 그 다음 💡 방전을 누르고 전구가 꺼질 때까지 기다려요.',
          setup() { S.gate = ''; const c = S.cc; c.mode = 'open'; c.V = 0; c.I = 0; c.hc = []; c.hd = []; c.t = 0; c.bulb = 0; c.flags = {}; setScene('cc'); updateCtl(); },
          check: () => !!(S.cc.flags.charged && S.cc.flags.flash && S.cc.flags.dim),
          hold: 0.4,
          status: () => mark(S.cc.flags.charged) + ' 충전 완료(' + pctF + ' %) &nbsp; ' + mark(S.cc.flags.flash) + ' 방전: 전구가 켜짐 &nbsp; ' + mark(S.cc.flags.dim) + ' 전구가 꺼짐',
          explain: '충전 곡선에서 전류는 처음 약 <b>' + fmtN(I_CH0, 0) + ' mA</b>로 크다가 점점 줄어 0에 가까워지고, 전압은 <b>' + V_BAT + ' V</b>에 가까워져요. 방전하면 전구에 처음 약 <b>' + fmtN(I_DIS0, 0) + ' mA</b>가 흘러 순간 밝았다가 전류와 전압이 함께 줄며 서서히 꺼져요.',
        },
        {
          type: 'quiz', title: '충전이 끝나면 전류가 0이 되는 까닭',
          goal: '축전기를 충전하다 보면 전류가 점점 줄어 <b>0</b>이 돼요. 그 까닭으로 옳은 것은?',
          setup() { S.gate = ''; setScene('cc'); updateCtl(); },
          choices: ['판 사이의 절연체를 통과해 전류가 흐르다가 다 통과하면 멈춰요', '축전기의 전압이 전지 전압과 같아져 전하를 더 이동시킬 전위차가 없어서예요', '전지가 다 닳아서 전압이 0이 돼서예요', '축전기가 꽉 차서 전선이 끊어져서예요'],
          answer: 1,
          feedback: ['전류는 판 사이의 절연체를 통과하지 않아요. 전하는 도선에서 이동하고, 판 사이는 떨어져 있어요.', '', '충전이 끝난 뒤에도 전지의 전압은 그대로(' + V_BAT + ' V)예요. 전압계로 확인해 보세요.', '전선은 끊어지지 않았어요. 스위치는 ⚡ 충전에 연결된 채로예요.'],
          explain: '충전이 진행될수록 축전기의 전압이 올라가 전지 전압(' + V_BAT + ' V)과 <b>같아지면</b> 전하를 움직이는 전위차가 사라져 전류가 <b>0</b>이 돼요. 전류는 판 사이의 절연체를 통과하지 않고, 도선에서 전하가 이동해 두 판에 쌓이는 거예요.',
        },
      ],
    },
    {
      title: '전하 분리: 전자가 한 판에서 다른 판으로', short: '전하 분리', icon: '🔍', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충전이 끝나면 전류가 0이 된다는 것을 봤어요. 판 사이는 절연체인데, 도대체 무엇이 이동한 걸까요? <b>🔍 두 판의 단면</b>을 크게 확대해서 살펴봐요.</div>' +
        '<p>금속판 속에는 움직일 수 있는 <b>전자</b>(파란 공)와 제자리에 있는 <b>이온</b>(빨간 +)이 있어서 처음엔 중성이에요. 전지가 전자를 한 판에서 다른 판으로 <b>옮기면</b> 한 판은 (+), 다른 판은 (−)가 되고 판 사이에 <b>전기장과 전위차</b>가 생겨요(앞 차시 ‘전기장과 전위차’에서 배운 것).</p>',
      features: ['sp'],
      setup() { S.gate = ''; spReset(); S.sp.flags = {}; S.sp.lbTop = ''; S.sp.lbBot = ''; $('#lbTop').value = ''; $('#lbBot').value = ''; resetSelects(orderSel, S.sp.order, S.sp.orderOK); setScene('sp'); updateCtl(); },
      recap: '충전은 전지가 한 판의 전자를 다른 판으로 옮겨 두 판에 (+)와 (−) 전하를 분리하는 일이에요. 에너지는 분리된 전하들의 전기 위치 에너지로 저장돼요.',
      summary: '<ul><li><b>충전</b> = 전지가 전자를 한 판(전지의 (+)극에 연결된 판)에서 다른 판으로 옮겨요. 그래서 한 판은 (+), 다른 판은 (−)가 돼요.</li><li>두 판 사이에 <b>전기장</b>과 <b>전위차</b>가 생기고, 전위차가 전지 전압과 같아지면 전자는 더 이상 이동하지 않아요(전류 0).</li><li>저장되는 에너지는 <b>분리된 전하들의 전기 위치 에너지</b>예요.</li><li><b>방전</b>하면 전자가 도선으로 되돌아오며 에너지를 전구에 전해요.</li><li>전하는 만들어지거나 사라지지 않고 <b>분리될 뿐</b>이어서 두 판의 전하를 모두 합하면 0이에요.</li></ul>',
      missions: [
        {
          title: '충전 과정 순서 정하기', manual: true,
          goal: '축전기를 충전할 때 일어나는 일의 <b>차례</b>를 1번째부터 4번째까지 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '⚡ 충전을 눌러 전자가 움직이는 모습을 먼저 관찰해요. 전자가 옮겨지면 판에 전하가 생기고, 그 다음에 전위차가 전지 전압과 같아지고, 마지막에 전류가 0이 돼요.',
          setup() { S.gate = 'order'; resetSelects(orderSel, S.sp.order, S.sp.orderOK); setScene('sp'); updateCtl(); },
          check: () => checkSelects(ORDER_RULES, S.sp.order, S.sp.orderOK, orderSel, '빨간 칸의 순서를 다시 생각해 보세요. 전자가 옮겨져야 판에 전하가 생겨요.'),
          status: () => '고른 칸 ' + ORDER_RULES.filter((r, i) => S.sp.order[i]).length + ' / ' + ORDER_RULES.length,
          explain: '① 전지가 한 판의 전자를 다른 판으로 옮겨요 → ② 한 판은 (+), 다른 판은 (−)가 되어 판 사이에 전기장과 전위차가 생겨요 → ③ 전위차가 전지 전압과 같아지면 전자가 더 이상 이동하지 않아요 → ④ 전류가 0이 돼요.',
        },
        {
          title: '판의 전하 알아맞히기',
          goal: '⚡ 충전을 끝낸 뒤, <b>윗판과 아랫판</b>이 각각 어떤 전하로 대전되었는지 골라 보세요.',
          hint: '전자가 ' + K_MAX + '개 옮겨질 때까지 충전을 기다려요. 전자가 빠져나가 모자란 판은 (+), 전자가 늘어난 판은 (−)예요. 윗판이 전지의 (+)극에 연결되어 있어요.',
          setup() { S.gate = 'label'; spReset(); S.sp.lbTop = ''; S.sp.lbBot = ''; $('#lbTop').value = ''; $('#lbBot').value = ''; $('#lbTop').classList.remove('ok', 'bad'); $('#lbBot').classList.remove('ok', 'bad'); setScene('sp'); updateCtl(); },
          check: () => lbOK(),
          hold: 0.5,
          status: () => mark(spFull()) + ' 충전 완료 &nbsp; ' + mark(spFull() && S.sp.lbTop === truthTop() && S.sp.lbTop !== '') + ' 윗판 &nbsp; ' + mark(spFull() && S.sp.lbBot === truthBot() && S.sp.lbBot !== '') + ' 아랫판',
          explain: '전지의 (+)극에 연결된 윗판에서 전자가 빠져나가 <b>(+)</b>로, (−)극에 연결된 아랫판에는 전자가 늘어나 <b>(−)</b>로 대전돼요. 전자는 도선을 따라 윗판에서 아랫판으로 옮겨진 거예요.',
        },
        {
          type: 'quiz', title: '두 판의 전하를 모두 합하면?',
          goal: '충전된 축전기에서 (+)로 대전된 판과 (−)로 대전된 판의 전하를 <b>모두 합하면</b> 얼마일까요?',
          setup() { S.gate = ''; setScene('sp'); updateCtl(); },
          choices: ['0보다 커요. (+)판의 전하가 더 크기 때문이에요', '0이에요. 전하가 새로 만들어지는 것이 아니라 분리될 뿐이에요', '0보다 작아요. (−)판의 전하가 더 크기 때문이에요', '충전 전압에 따라 달라져요'],
          answer: 1,
          feedback: ['(+)판에 생긴 전하만큼 (−)판에 반대 부호의 같은 크기가 생겼어요. 하단의 전하의 합 계산을 보세요.', '', '(−)판에 늘어난 전자는 (+)판에서 온 거예요. 전하의 합은 변하지 않아요.', '충전 전압이 달라져도 전자가 옮겨 갈 뿐이라서 합은 항상 0이에요.'],
          explain: '(+)판에서 빠져나간 전자가 (−)판으로 옮겨 간 것이므로 두 판의 전하를 합하면 늘 <b>0</b>이에요. 전하는 만들어지거나 사라지지 않고 <b>분리</b>될 뿐이에요(전하량 보존).',
        },
      ],
    },
    {
      title: '에너지 저장: 모았다가 한꺼번에 내보내기', short: '에너지 저장', icon: '⚡', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전하를 분리해 두 판 사이에 전위차를 만드는 일이 에너지를 저장하는 일이라는 것을 알았어요. 이 에너지를 한꺼번에 내보내면 어떻게 될까요?</div>' +
        '<p>충전 전압을 <b>' + [3, 6, 9].join(' V, ') + ' V</b> 중에서 골라 축전기를 충전한 뒤 LED로 방전해요. 방전 전류는 처음에 크고 빠르게 줄어요. 전류–시간 그래프에서 곡선 아래 <b>넓이는 방출한 전하</b>예요. 카메라 플래시와 제세동기(AED)도 같은 원리예요.</p>',
      features: ['en'],
      setup() { S.gate = ''; const c = S.en; c.phase = 'idle'; c.mode = 'open'; c.V = 0; c.I = 0; c.rec = {}; c.lastRec = null; c.vSel = 6; c.led = 0; c.hd = []; S.aedOK = false; setScene('en'); updateCtl(); },
      recap: '높은 전압으로 충전할수록 더 많은 에너지가 저장되어 LED가 더 오래, 더 밝게 켜져요. 축전기는 천천히 모은 에너지를 짧은 시간에 내보내 전지로는 낼 수 없는 큰 전력을 낼 수 있어요.',
      summary: '<ul><li>충전 전압이 <b>높을수록</b> 더 많은 에너지가 저장돼요. 방전할 때 처음 전류가 커서 LED가 더 밝고 더 오래 켜져요(예: 3 V ' + f1(tOn(3)) + ' s, 6 V ' + f1(tOn(6)) + ' s, 9 V ' + f1(tOn(9)) + ' s).</li><li>전류–시간 그래프에서 곡선 아래 <b>넓이는 방출한 전하</b>예요. 전지는 같은 전하를 약한 전류로 오래 내보내고, 축전기는 짧고 강하게 내보내요.</li><li>카메라 플래시: 전지로 몇 초 충전 → 약 ' + FLASH_V + ' V → 약 ' + FLASH_MS + ' ms에 방전</li><li>AED: ' + AED_CH + ' s 충전 → ' + AED_J + ' J을 ' + AED_MS + ' ms에 방출 → 평균 전력 ' + fmtN(AED_KW, 0) + ' kW (충전할 때 ' + fmtN(AED_J / AED_CH, 0) + ' W)</li></ul>',
      missions: [
        {
          title: '충전 전압을 바꿔 방전 시간 비교하기',
          goal: '<b>서로 다른 충전 전압 두 가지 이상</b>으로 ⚡ 충전한 뒤 💡 LED로 방전해, LED가 켜져 있던 시간을 기록하세요.',
          hint: '충전 전압을 고르고 ⚡ 충전하기 → 충전 완료 → 💡 LED로 방전을 눌러요. 방전이 끝나면 오른쪽 기록표에 쌓여요. 전압을 바꿔 한 번 더 해요.',
          setup() { S.gate = ''; const c = S.en; c.phase = 'idle'; c.mode = 'open'; c.V = 0; c.I = 0; c.rec = {}; c.lastRec = null; c.led = 0; c.hd = []; setScene('en'); updateCtl(); },
          check: () => Object.keys(S.en.rec).length >= 2,
          hold: 0.5,
          status: () => [3, 6, 9].map((v) => mark(S.en.rec[v]) + ' ' + v + ' V' + (S.en.rec[v] ? ' (' + f1(S.en.rec[v].ton) + ' s)' : '')).join(' &nbsp; ') + ' &nbsp; (2가지 이상)',
          explain: '충전 전압이 높을수록 방전 때 처음 전류(' + [3, 6, 9].map((v) => fmtN(v / R_DIS * 1000, 0) + ' mA').join(', ') + ')가 커서 LED가 켜져 있는 시간이 ' + [3, 6, 9].map((v) => f1(tOn(v)) + ' s').join(', ') + '로 길어져요. 높은 전압으로 충전할수록 더 많은 에너지가 저장돼요.',
        },
        m_aed,
        {
          type: 'quiz', title: '축전기가 전지를 대신할 수 없는 까닭',
          goal: '축전기는 큰 전력을 순간적으로 낼 수 있지만, 일반적으로 <b>전지를 대신하지 못해요</b>. 그 까닭은?',
          setup() { S.gate = ''; setScene('en'); updateCtl(); },
          choices: ['축전기는 전기 에너지를 저장하지 못해서', '저장하는 에너지가 많지 않고 금방 방전되어 오래 쓸 수 없어서', '축전기는 방전할 때 전류가 흐르지 않아서', '축전기는 전압을 만들 수 없어서'],
          answer: 1,
          feedback: ['축전기는 에너지를 저장해요. 그래서 LED가 켜진 것이죠.', '', '방전할 때 전류가 흘러서 LED가 켜졌어요. 그래프의 전류를 보세요.', '전위차는 충전할 때 만들어져요. 전지와 다른 점은 저장량과 방전 속도예요.'],
          explain: '축전기는 <b>저장하는 에너지가 많지 않고</b> 전류가 흐르면서 전압이 금방 줄어요. 그래서 그래프처럼 짧은 시간에 방전되어 오래 쓸 수 없어요. 대신 천천히 모은 에너지를 <b>짧은 순간에 큰 전력</b>으로 내보낼 수 있어 플래시와 AED에 쓰여요.',
        },
      ],
    },
    {
      title: '센서와 입력 장치: 전하의 변화를 읽는다', short: '센서', icon: '📲', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 축전기가 전하를 모아 에너지를 저장한다는 것을 알았어요. 판 사이 거리나 손가락이 가까워지면 <b>모이는 전하가 달라지고</b>, 그 변화로 전류가 흘러요. 이 원리가 센서에 쓰여요.</div>' +
        '<p>세 가지 센서를 살펴봐요. <b>👆 터치스크린</b>(손가락 위치), <b>🎤 콘덴서 마이크</b>(소리 → 전류 신호, 중학교의 진폭·진동수), <b>📱 가속도 센서</b>(화면 회전)예요.</p>',
      features: ['sn'],
      setup() { S.gate = ''; const s = S.sn; s.sub = 'touch'; s.glove = 0; s.tIdx = 0; s.done = 0; s.hold = 0; s.tilt = 0; s.mass = 0; s.wave.length = 0; const p = cellC(6, 4); s.fx = p.x; s.fy = p.y; resetSelects(cardSel, s.cards, s.cardOK); setScene('sn'); updateCtl(); },
      recap: '센서는 손가락, 소리, 가속도 때문에 판에 모이는 전하가 달라지는 것을 읽어요. 장갑을 끼면 손가락이 멀어져 터치 신호가 약해져요.',
      summary: '<ul><li><b>터치스크린</b>: 격자 전극에 모인 전하가 손가락이 가까워지면 달라지는 위치를 읽어요. 장갑을 끼면 손가락이 멀어져 변화가 약해서 감지하지 못해요.</li><li><b>콘덴서 마이크</b>: 소리로 진동판이 움직여 판 사이 거리가 변하면 전하가 드나들며 전류 신호가 생겨요. 진폭 = 소리 크기, 진동수 = 소리 높이.</li><li><b>가속도 센서</b>: 가속하면 안의 질량이 움직여 판 사이 거리가 변하고 모이는 전하가 달라져요. 스마트폰의 화면 회전에 쓰여요.</li></ul>',
      missions: [
        {
          title: '터치 좌표 맞히기',
          goal: '맨손가락(●)을 끌어 <b>주황색 고리가 있는 목표 칸</b>에 대고, 감지된 좌표가 목표와 같도록 <b>' + TARGETS.length + '곳</b>을 차례로 맞혀 보세요.',
          hint: '손가락을 끌어 고리가 있는 칸 한가운데에 놓고 0.5초 기다려요. 신호가 ' + Math.round(THRESH * 100) + ' %를 넘으면 감지돼요. 장갑을 낀 상태라면 맨손으로 바꿔요.',
          setup() { S.gate = ''; const s = S.sn; s.sub = 'touch'; s.glove = 0; s.tIdx = 0; s.done = 0; s.hold = 0; setScene('sn'); updateCtl(); },
          check: () => S.sn.done >= TARGETS.length,
          hold: 0.3,
          status: () => TARGETS.map((t, i) => mark(S.sn.done > i) + ' 열 ' + (t[0] + 1) + ' · 행 ' + (t[1] + 1)).join(' &nbsp; '),
          explain: '손가락이 가까워진 칸의 전극에 모이는 전하의 변화가 가장 커서, 제어 장치가 그 칸을 손가락 위치로 읽어요. 손가락이 칸의 한가운데에 있으면 신호가 100 %에 가깝고, 이웃 칸은 훨씬 약해서 좌표가 하나로 정해져요.',
        },
        {
          title: '센서와 원리 연결하기', manual: true,
          goal: '세 센서가 어떤 원리로 신호를 만드는지 알맞게 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '센서 세 가지(터치, 마이크, 가속도)를 하나씩 눌러 보며 무엇 때문에 판에 모이는 전하가 달라지는지 확인해요.',
          setup() { S.gate = 'cards'; resetSelects(cardSel, S.sn.cards, S.sn.cardOK); setScene('sn'); updateCtl(); },
          check: () => checkSelects(CARD_RULES, S.sn.cards, S.sn.cardOK, cardSel, '빨간 칸을 다시 골라 보세요. 센서마다 판에 모이는 전하를 바꾸는 원인이 달라요.'),
          status: () => '고른 칸 ' + CARD_RULES.filter((r, i) => S.sn.cards[i]).length + ' / ' + CARD_RULES.length,
          explain: '터치스크린은 <b>손가락</b>이 가까워지는 위치, 콘덴서 마이크는 <b>소리로 움직이는 진동판</b>, 가속도 센서는 <b>가속할 때 움직이는 질량</b> 때문에 판 사이 거리나 전하가 변하고, 그 변화로 전류가 흘러 신호가 돼요.',
        },
        {
          type: 'quiz', title: '장갑을 끼면 터치가 안 되는 까닭',
          goal: '두꺼운 장갑을 끼면 터치스크린이 잘 반응하지 않아요. 그 까닭은?',
          setup() { S.gate = ''; S.sn.sub = 'touch'; S.sn.glove = 0; setScene('sn'); updateCtl(); },
          choices: ['장갑이 전기를 막아서 전지가 꺼지기 때문이에요', '손가락이 전극에서 멀어져 전극에 모이는 전하가 달라지는 효과가 약해지기 때문이에요', '장갑에 정전기가 생겨서 화면이 고장 나기 때문이에요', '장갑 때문에 화면을 누르는 힘이 약해지기 때문이에요'],
          answer: 1,
          feedback: ['전지는 꺼지지 않아요. 터치 센서가 읽는 것은 전하의 변화예요. 장갑 모드에서 칸의 신호(%)를 보세요.', '', '정전기 때문이 아니에요. 장갑을 끼면 칸의 신호가 줄어드는 것을 확인해 보세요.', '터치스크린은 누르는 힘이 아니라 손가락이 가까이 있을 때의 전하 변화를 읽어요.'],
          explain: '터치스크린은 누르는 힘이 아니라 손가락이 가까이 올 때 전극에 모이는 <b>전하의 변화</b>를 읽어요. 두꺼운 장갑을 끼면 손가락이 전극에서 멀어져 변화가 약해서(' + Math.round(GLOVE_GAIN * 100) + ' % 정도) 감지 문턱(' + Math.round(THRESH * 100) + ' %)을 넘지 못해요.',
        },
      ],
    },
  ];

  /* 이어 하기(새로고침)로 중간 미션에서 열려도 미션 setup()이 만든 장면을 덮어쓰지 않도록, 장면 상태를 게임보다 먼저 만들어요 */
  spInit();
  { const p = cellC(6, 4); S.sn.fx = p.x; S.sn.fy = p.y; }
  setScene('cc');
  updateCtl();

  game = SciSim.game({
    simId: 'hp-capacitor', mount: '#game', badge: '축전기 박사', homeHref: '../../index.html#hp',
    featureLabels: { cc: '🔋 전지 · 스위치 · 축전기 · 전구 회로', sp: '🔍 두 판의 단면 확대 · 전자 이동', en: '⚡ 충전 전압별 LED 방전 그래프', sn: '📲 터치 · 마이크 · 가속도 센서' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  function stepAll1(dt) {
    if (S.mode === 'cc') stepCC(dt); else if (S.mode === 'sp') stepSP(dt); else if (S.mode === 'en') stepEN(dt); else stepSN(dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    if (game && game.phase === 'success') { const cm = game.current(); if (cm && cm._aed) S.aedOK = true; }
    if (game && game.free) S.aedOK = true;
    view.apply();
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);     // 아래쪽 자료 패널 영역도 매 프레임 지워요(그림자 누적 방지)
    stepAll1(dt);
    if (S.mode === 'cc') drawCC(); else if (S.mode === 'sp') drawSP(); else if (S.mode === 'en') drawEN(); else drawSN();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });
  // ② 판의 전하 고르기 결과 표시
  const lbMark = () => { ['lbTop', 'lbBot'].forEach((id, i) => { const el = $('#' + id), v = el.value; el.classList.remove('ok', 'bad'); if (!v) return; const ok = spFull() && v === (i ? truthBot() : truthTop()); if (spFull()) el.classList.add(ok ? 'ok' : 'bad'); }); };
  $('#lbTop').addEventListener('change', lbMark); $('#lbBot').addEventListener('change', lbMark);

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SH, PY, PH, TC, CK, E3, MIC, ACC, SPG, TARGETS, get game() { return game; },
    setScene, setSub, capSetMode, enCharge, enDischarge, spReset, cellC, touchSig, touchDetect, tOn, q0, lbMark, spFull,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
