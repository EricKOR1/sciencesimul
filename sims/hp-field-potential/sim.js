/* =========================================================
   물리학 Ⅱ. 전기와 자기 - 전기장과 전위차 (단원 1차시)
   성취기준 [12물리02-01] 전하를 띤 입자들이 전기장과 전위차를 형성하여 서로 전기적으로 상호작용함을 설명할 수 있다.
   ① 관찰: 전기력 (두 점전하, 전하량·거리·부호)
   ② 모형: 전기장 (시험 전하 +1이 받는 힘의 화살표 지도, 정성적)
   ③ 탐구: 전위차 (평행판, 에너지 = qV, 전자총)
   ④ 적용: 회로의 전위 · 전기 집진기 · 번개와 피뢰침
   전기력선, 전기장 E의 정량 계산, 쿨롱 법칙의 식은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
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
  const potCol = (f) => { f = clamp(f, 0, 1); return f < 0.5 ? C.mix('#4a7be0', '#f6f2ea', f * 2) : C.mix('#f6f2ea', '#e2574c', (f - 0.5) * 2); };
  const POS = '#e2464b', NEG = '#2f6df6';

  /* ---------- 물리 상수 (화면의 숫자와 모두 같은 값) ---------- */
  // ① 전기력 (정성적 관계 F ∝ qA·qB / d², 화면에는 '가장 센 배치 = 100 %'로 상대 크기만 보여 줘요)
  const DMIN = 2, DMAX = 5, QMAX = 3;
  const FMAX = (QMAX * QMAX) / (DMIN * DMIN);
  const FU = PHONE ? 50 : 82, FXA = PHONE ? 104 : 200, FSY = PHONE ? 176 : 172;
  const LF = PHONE ? 66 : 140;                       // 가장 센 힘의 화살표 길이
  const rQ = (q) => 14 + 6 * q;
  // ② 전기장 지도
  const MX0 = 20, MX1 = VW - 20, MY0 = 56, MY1 = SH - 8;
  const GRID = PHONE ? 48 : 52;
  const QR = 20;                                      // 점전하 그림 반지름
  const E_REF = 60;                                   // 상대 세기 1.0이 되는 거리 (px)
  const FIELD_CX = VW / 2, FIELD_CY = (MY0 + MY1) / 2;
  const SEP = PHONE ? 80 : 110;                       // 두 전하 배치에서 중심으로부터의 거리
  // ③ 평행판
  const DCM = 6, VMAX = 12;
  const PU = PHONE ? 38 : 64, PX0 = PHONE ? 46 : 150;           // cm당 px, 전하 위치 0 cm의 x
  const PXR = PX0 + DCM * PU;                                    // 6 cm 위치의 x
  const PYT = 90, PYB = 258, PYM = 174;                          // 판 위/아래, 전하가 움직이는 줄
  const CR = 11;                                                 // 움직이는 전하의 반지름 (판 안쪽 면에 닿는 위치 = 0 cm, 6 cm)
  const MASS = 0.24;                                             // 시험 전하의 (가상) 질량
  const ACC_E = 0.694;                                           // 전자 가속도 = ACC_E × 전압 (cm/s², 느리게 보여 주려는 값)
  const V_E = 0.593;                                             // 전자 속력 (10^6 m/s) = V_E × √(운동 에너지[eV])
  const px = (cm) => PX0 + cm * PU;
  // ④ 적용
  const BAT = 3, R1 = 10, R2 = 20, I_C = BAT / (R1 + R2);          // 전지 3 V, 전구 10 Ω · 20 Ω (직렬) → 0.10 A
  const U1 = I_C * R1, U2 = I_C * R2;                              // 전구 1: 1 V, 전구 2: 2 V
  const LVEXP = 8, LV = Math.pow(10, LVEXP), LQ = 15, LE = LV * LQ;   // 번개: 약 10^8 V, 약 15 C → 1.5×10^9 J
  const fmtN = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'force', t: 0, fade: 0, gate: '',
    f: { qa: 1, qb: 1, sb: 1, d: 3.0, ra: rQ(1), rb: rQ(1), lA: 0, lB: 0, bar: 0, tw: null, drag: false, hov: false },
    fl: { preset: 'p1', ch: [], cells: [], tok: { st: 'tray', x: 0, y: 0, sx: 0, sy: 0, trail: [], path: 0, ox: 0, oy: 0 }, flow: [], done: {}, loaded: false },
    pl: { V: 12, q: 1, kind: 'charge', x: 0, v: 0, st: 'rest', ex: 0, E0: 0, recs: [], erecs: {}, arrived: false, trail: [], eSt: 'rest', tw: null, ev: 0, ekE: 0, wait: 0, shake: 0 },
    ap: { sub: 'circuit', ph: 0, lv: 0, dust: [], stuck: [], caught: 0, passed: 0, acc: 0, rod: 0, bolt: null, charged: 1, dmg: 0, flash: 0, struck: false, seenSub: {}, clean: 0 },
    rule: {}, ruleOK: {}, blank: {}, blankOK: {},
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { force: '⚡ 전기력', field: '🧭 전기장 지도', plates: '🔋 평행판 전위차', apply: '🏠 적용' };

  /* ---------- 공통 UI ---------- */
  function setScene(mode) {
    if (S.mode !== mode) {
      S.fade = 1; parts.clear();
      if (S.f.tw) { S.f.tw.cancel(); S.f.tw = null; }
      tokReset(true); plReset(true);
      S.ap.bolt = null; S.ap.flash = 0; S.ap.dmg = 0;
    }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    const sub = S.ap.sub, kind = S.pl.kind;
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = sub === n.getAttribute('data-sub');
      if (on && n.hasAttribute('data-kind')) on = kind === n.getAttribute('data-kind');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#qaSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.f.qa));
    $$('#qbSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.f.qb));
    $$('#sbSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.f.sb));
    const sd = $('#sDist'); if (Math.abs(+sd.value - S.f.d) > 0.001) sd.value = S.f.d;
    sd.style.setProperty('--pct', ((S.f.d - DMIN) / (DMAX - DMIN) * 100) + '%');
    $('#oDist').textContent = S.f.d.toFixed(1) + '칸';
    $('#dMinus').disabled = S.f.d <= DMIN + 0.001; $('#dPlus').disabled = S.f.d >= DMAX - 0.001;
    $$('#prSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.fl.preset));
    const tk = S.fl.tok;
    $('#bRelease').disabled = tk.st !== 'placed'; $('#bBack').disabled = tk.st === 'tray' || tk.st === 'returning';
    const busyP = S.pl.st === 'free' || S.pl.st === 'carry' || S.pl.eSt === 'fly';
    const sv = $('#sVolt'); if (+sv.value !== S.pl.V) sv.value = S.pl.V;
    sv.disabled = busyP; sv.style.setProperty('--pct', (S.pl.V / VMAX * 100) + '%'); $('#oVolt').textContent = S.pl.V + ' V';
    $$('#kindSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.pl.kind); b.disabled = busyP; });
    $$('#qSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.pl.q); b.disabled = busyP || S.pl.x > 0.001; });
    $('#bCarry').disabled = S.pl.st === 'free' || S.pl.st === 'carry' || S.pl.x >= DCM - 0.001;
    $('#bDrop').disabled = !(S.pl.st === 'held' && S.pl.x > 0.001);
    $('#bShoot').disabled = S.pl.eSt !== 'rest';
    $$('#subSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.ap.sub));
    $$('#lvSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.ap.lv));
    $$('#rodSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.ap.rod); b.disabled = !!S.ap.bolt; });
    $('#bStrike').disabled = !!S.ap.bolt;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* 규칙·빈칸 선택 상자 */
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
  const RULES = [
    ['전하량이 클수록 두 전하 사이의 힘은', ['커져요', '작아져요', '변하지 않아요'], 0],
    ['두 전하 사이의 거리가 멀수록 힘은', ['커져요', '작아져요', '변하지 않아요'], 1],
    ['A가 B에 작용하는 힘과 B가 A에 작용하는 힘은', ['크기가 같고 방향이 반대예요', 'A가 B에 작용하는 힘이 더 커요', 'B가 A에 작용하는 힘이 더 커요'], 0],
    ['같은 부호의 전하끼리는', ['서로 밀어내요', '서로 끌어당겨요', '힘이 작용하지 않아요'], 0],
  ];
  const ruleSel = makeSelects($('#ruleRows'), RULES, S.rule, S.ruleOK);
  const BLANKS = [
    ['전지를 지나면 1 C의 전하는 에너지를 얻어 전위가 0 V에서 ( )가 돼요', ['1 V', '2 V', '3 V'], 2],
    ['전구 1을 지난 직후(B점)의 전위는', ['3 V', '2 V', '1 V'], 1],
    ['전구 2에서 1 C의 전하가 내놓는 에너지는', ['1 J', '2 J', '3 J'], 1],
    ['전구 1과 2에서 내놓은 에너지의 합은 전지가 준 에너지와', ['같아요', '더 커요', '더 작아요'], 0],
  ];
  const blankSel = makeSelects($('#blankRows'), BLANKS, S.blank, S.blankOK);
  function resetSelects(sels, store, okStore) { Object.keys(store).forEach((k) => delete store[k]); Object.keys(okStore).forEach((k) => delete okStore[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ================= ① 전기력 ================= */
  const fF = () => (S.f.qa * S.f.qb) / (S.f.d * S.f.d);          // 상대 힘 (정성적 모형)
  const fPct = () => Math.round(100 * fF() / FMAX);
  const sameSign = () => S.f.sb > 0;
  const setD = (d, anim) => {
    const f = S.f; d = clamp(Math.round(d * 10) / 10, DMIN, DMAX);
    if (f.tw) { f.tw.cancel(); f.tw = null; }
    if (anim && !RM) f.tw = SciSim.tween(f, { d }, { duration: 0.35, ease: 'outCubic', onDone: () => { f.tw = null; f.d = d; updateCtl(); } });
    else f.d = d;
    updateCtl();
  };
  function stepForce(dt) {
    const f = S.f, rep = sameSign() ? 1 : -1, L = LF * Math.sqrt(fF() / FMAX);
    f.ra = SciSim.approach(f.ra, rQ(f.qa), dt, 14); f.rb = SciSim.approach(f.rb, rQ(f.qb), dt, 14);
    f.lB = SciSim.approach(f.lB, rep * L, dt, 12); f.lA = SciSim.approach(f.lA, -rep * L, dt, 12);
    f.bar = SciSim.approach(f.bar, fF() / FMAX, dt, 12);
    if (f.tw) updateCtl();
  }
  function forceArrow(x, y, len, label, up) {
    D.arrow(x, y, x + len, y, { color: '#f26b3a', width: 5, head: Math.min(14, Math.abs(len) * 0.6 + 4) });
    D.label(x + len / 2, y + (up ? -17 : 19), label, { bg: 'rgba(255,255,255,.95)', color: '#9a3412', size: PHONE ? 12 : 13, border: '#f6b08a' });
  }
  function drawForce() {
    sceneBg();
    const f = S.f, xA = FXA, xB = FXA + f.d * FU;
    T(14, 26, '⚡ 두 전하 사이에 작용하는 전기력', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '전하 B를 끌어 거리를 바꾸고, 화살표(힘)를 비교해요', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    ctx.save(); ctx.strokeStyle = 'rgba(120,135,160,.4)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(14, FSY); ctx.lineTo(VW - 14, FSY); ctx.stroke(); ctx.restore();
    const yB = FSY - 74, yA = FSY + 74;
    // 힘 화살표 (전하와 이어 주는 가는 선)
    ctx.strokeStyle = 'rgba(242,107,58,.45)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(xB, FSY - f.rb); ctx.lineTo(xB, yB); ctx.moveTo(xA, FSY + f.ra); ctx.lineTo(xA, yA); ctx.stroke(); ctx.setLineDash([]);
    forceArrow(xB, yB, f.lB, 'B가 받는 힘', true);
    forceArrow(xA, yA, f.lA, 'A가 받는 힘', false);
    // 전하
    D.sphere(xA, FSY, f.ra, POS, { shadow: true, text: '+' + f.qa });
    const sgn = sameSign() ? 1 : -1;
    D.sphere(xB, FSY, f.rb, sgn > 0 ? POS : NEG, { shadow: !f.drag, text: (sgn > 0 ? '+' : '−') + f.qb });
    if (f.drag) { ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(xB, FSY, f.rb + 5, 0, TAU); ctx.stroke(); ctx.restore(); }
    T(xA, FSY + f.ra + 17, 'A', 14, '#26324a', 'center', 800); T(xB, FSY + f.rb + 17, 'B', 14, '#26324a', 'center', 800);
    // 거리 자
    const ry = FSY + 106;
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xA, ry); ctx.lineTo(xB, ry); ctx.stroke();
    for (let u = 0; u <= f.d + 0.001; u += 1) { const xx = xA + u * FU; ctx.beginPath(); ctx.moveTo(xx, ry - 6); ctx.lineTo(xx, ry + 6); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(xB, ry - 8); ctx.lineTo(xB, ry + 8); ctx.stroke();
    D.label((xA + xB) / 2, ry + 22, '거리 ' + f.d.toFixed(1) + '칸', { bg: '#516079', size: PHONE ? 12 : 13 });
    if (!f.hov && !S.seenDrag && S.t > 1.2) {
      D.arrow(xB + f.rb + 36, FSY + 36, xB + f.rb + 8, FSY + 8, { color: '#f26b3a', width: 3 });
      T(xB + f.rb + 36, FSY + 54, '끌어 보세요', 13, '#9a3412', 'center', 800);
    }
    drawForcePanel();
  }
  function drawForcePanel() {
    const f = S.f;
    const lw = PHONE ? VW - 24 : 400, lh = PHONE ? 112 : PH;
    panel(12, PY, lw, lh, 14);
    T(26, PY + 24, '힘의 세기 (가장 센 배치 = 100 %)', 13.5, '#26324a', 'left', 800);
    const bx = 26, bw = lw - 28, by = PY + 40, bh = 22;
    D.roundRect(bx, by, bw, bh, 9); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const fw = bw * clamp(f.bar, 0, 1);
    if (fw > 0.5) { D.roundRect(bx, by, fw, bh, 9); ctx.fillStyle = '#f2873a'; ctx.fill(); }
    [0, 50, 100].forEach((v) => { const xx = bx + bw * v / 100; ctx.strokeStyle = 'rgba(60,70,90,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, by + bh); ctx.lineTo(xx, by + bh + 5); ctx.stroke(); T(xx, by + bh + 19, v + ' %', 12, '#3a465c', v === 0 ? 'left' : v === 100 ? 'right' : 'center', 800); });
    const num = fPct() + ' %';
    T(bx + Math.min(Math.max(fw, 50), bw) - 8, by + 16.5, num, 14, fw > 56 ? '#fff' : '#26324a', fw > 56 ? 'right' : 'left', 800);
    if (!PHONE) {
      // 두 힘의 크기 비교
      const cy = by + bh + 44;
      D.roundRect(26, cy, bw, 74, 10); ctx.fillStyle = '#f5f7fb'; ctx.fill();
      T(40, cy + 22, 'A가 받는 힘의 크기  ' + fPct() + ' %', 14, '#26324a', 'left', 800);
      T(40, cy + 44, 'B가 받는 힘의 크기  ' + fPct() + ' %', 14, '#26324a', 'left', 800);
      T(40, cy + 64, '→ 크기는 같고 방향은 반대예요 (작용·반작용)', 13, '#9a3412', 'left', 800);
    }
    const rx = PHONE ? 12 : 424, ry = PHONE ? PY + lh + 10 : PY, rw = PHONE ? VW - 24 : VW - 436, rh = PHONE ? PH - lh - 10 : PH;
    panel(rx, ry, rw, rh, 14);
    T(rx + 14, ry + 24, '지금 배치 읽기', 13.5, '#26324a', 'left', 800);
    const lines = [
      '부호: ' + (sameSign() ? '같은 부호 → 서로 밀어내요' : '다른 부호 → 서로 끌어당겨요'),
      '전하량: A = ' + f.qa + '단위, B = ' + f.qb + '단위',
      '거리: ' + f.d.toFixed(1) + '칸',
      '힘: 최대 배치의 ' + fPct() + ' %',
    ];
    lines.forEach((l, i) => T(rx + 14, ry + 50 + i * (PHONE ? 22 : 26), '• ' + l, PHONE ? 13 : 14, '#26324a', 'left', 800));
    if (!PHONE) textBlock(rx + 14, ry + 50 + 4 * 26 + 8, rw - 28, '전하량이 클수록, 거리가 가까울수록 힘이 커져요.', 13, '#5a6679', 17, 700);
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'force') {
        const xB = FXA + S.f.d * FU;
        if (Math.abs(p.x - xB) <= S.f.rb + 14 && Math.abs(p.y - FSY) <= S.f.rb + 22) {
          if (S.f.tw) { S.f.tw.cancel(); S.f.tw = null; }
          S.f.drag = true; S.seenDrag = true; Sound.click(); return true;
        }
        return false;
      }
      if (S.mode === 'field') return fieldDown(p);
      if (S.mode === 'plates') return platesDown(p);
      return false;
    },
    move(p) {
      if (S.mode === 'force') { if (S.f.drag) { S.f.d = clamp(Math.round((p.x - FXA) / FU * 10) / 10, DMIN, DMAX); updateCtl(); } }
      else if (S.mode === 'field') fieldMove(p);
      else if (S.mode === 'plates') platesMove(p);
    },
    up(p) {
      if (S.mode === 'force') { S.f.drag = false; updateCtl(); }
      else if (S.mode === 'field') fieldUp(p);
      else if (S.mode === 'plates') platesUp(p);
    },
    hover(p) {
      if (S.mode === 'force') { const xB = FXA + S.f.d * FU; S.f.hov = Math.abs(p.x - xB) <= S.f.rb + 14 && Math.abs(p.y - FSY) <= S.f.rb + 22; return S.f.hov ? 'grab' : 'default'; }
      if (S.mode === 'field') return fieldHover(p);
      if (S.mode === 'plates') return platesHover(p);
      return 'default';
    },
  });
  $$('#qaSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.f.qa = +b.dataset.v; updateCtl(); }));
  $$('#qbSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.f.qb = +b.dataset.v; updateCtl(); }));
  $$('#sbSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.f.sb = +b.dataset.v; updateCtl(); }));
  $('#sDist').addEventListener('input', (e) => { setD(+e.target.value, false); Sound.tick(); });
  $('#dMinus').addEventListener('click', () => { Sound.click(); setD(S.f.d - 0.5, true); });
  $('#dPlus').addEventListener('click', () => { Sound.click(); setD(S.f.d + 0.5, true); });

  /* ================= ② 전기장 지도 ================= */
  const TRAY_W = PHONE ? 150 : 220;
  const TRAY = { x: 12 + TRAY_W / 2, y: PY + PH / 2 + 8 };
  function presetCharges(p) {
    const cx = FIELD_CX, cy = FIELD_CY;
    if (p === 'n1') return [{ x: cx, y: cy, s: -1 }];
    if (p === 'pn') return [{ x: cx - SEP, y: cy, s: 1 }, { x: cx + SEP, y: cy, s: -1 }];
    if (p === 'pp') return [{ x: cx - SEP, y: cy, s: 1 }, { x: cx + SEP, y: cy, s: 1 }];
    return [{ x: cx, y: cy, s: 1 }];
  }
  function fieldAt(x, y) {
    let ex = 0, ey = 0;
    S.fl.ch.forEach((c) => {
      const dx = x - c.x, dy = y - c.y, r2 = Math.max(dx * dx + dy * dy, 400), r = Math.sqrt(r2);
      const k = c.s * (E_REF * E_REF) / (r2 * r);
      ex += k * dx; ey += k * dy;
    });
    const e = Math.hypot(ex, ey);
    return { ex, ey, e, ux: e > 1e-9 ? ex / e : 0, uy: e > 1e-9 ? ey / e : 0 };
  }
  const strengthTxt = (e) => (e >= 1.5 ? '강함' : e >= 0.4 ? '보통' : '약함');
  const dirTxt = (f) => {
    if (f.e < 0.03) return '없음 (힘이 0)';
    const a = Math.atan2(f.uy, f.ux), names = ['→ 오른쪽', '↘ 오른쪽 아래', '↓ 아래', '↙ 왼쪽 아래', '← 왼쪽', '↖ 왼쪽 위', '↑ 위', '↗ 오른쪽 위'];
    return names[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  };
  function buildCells() {
    const cols = Math.floor((MX1 - MX0) / GRID), rows = Math.floor((MY1 - MY0) / GRID);
    const ox = MX0 + ((MX1 - MX0) - cols * GRID) / 2, oy = MY0 + ((MY1 - MY0) - rows * GRID) / 2;
    const cells = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ x: ox + (i + 0.5) * GRID, y: oy + (j + 0.5) * GRID, vx: 0, vy: 0, w: 1.6, a: 0 });
    S.fl.cells = cells;
  }
  function newFlow() { const p = { x: 0, y: 0, age: rnd(0, 6) }; respawn(p, true); return p; }
  function respawn(p, anywhere) {
    const pos = S.fl.ch.filter((c) => c.s > 0);
    if (pos.length && !anywhere) { const c = pos[Math.floor(Math.random() * pos.length)], a = rnd(0, TAU); p.x = c.x + Math.cos(a) * (QR + 4); p.y = c.y + Math.sin(a) * (QR + 4); }
    else {
      for (let k = 0; k < 8; k++) {
        p.x = rnd(MX0 + 4, MX1 - 4); p.y = rnd(MY0 + 4, MY1 - 4);
        if (S.fl.ch.every((c) => Math.hypot(p.x - c.x, p.y - c.y) > QR + 12)) break;
      }
    }
    p.age = 0;
  }
  function loadPreset(p, instant) {
    const fl = S.fl;
    fl.preset = p; fl.ch = presetCharges(p).map((c) => Object.assign(c, { tx: c.x, ty: c.y }));
    if (!fl.cells.length) buildCells();
    fl.flow = []; for (let i = 0; i < (PHONE ? 40 : 70); i++) fl.flow.push(newFlow());
    tokReset(true);
    if (!instant) S.fade = 0.6;
    updateCtl();
  }
  function tokReset(instant) {
    const t = S.fl.tok;
    t.st = 'tray'; t.x = TRAY.x; t.y = TRAY.y; t.trail = []; t.path = 0; t.stall = 0; t.shake = 0; t.wait = 0;
    updateCtl();
  }
  function tokBack() { const t = S.fl.tok; if (t.st === 'tray') return; t.st = 'returning'; t.trail = []; updateCtl(); }
  const inMap = (x, y, m) => x >= MX0 + (m || 0) && x <= MX1 - (m || 0) && y >= MY0 + (m || 0) && y <= MY1 - (m || 0);
  const nearCharge = (x, y, r) => S.fl.ch.some((c) => Math.hypot(x - c.x, y - c.y) < r);
  let dragCh = null;
  function fieldDown(p) {
    const t = S.fl.tok;
    if ((t.st === 'tray' || t.st === 'placed') && Math.hypot(p.x - t.x, p.y - t.y) <= 24) {
      t.st = 'held'; t.trail = []; Sound.click(); updateCtl(); return true;
    }
    for (const c of S.fl.ch) if (Math.hypot(p.x - c.x, p.y - c.y) <= QR + 12) { dragCh = c; Sound.click(); return true; }
    return false;
  }
  function fieldMove(p) {
    const t = S.fl.tok;
    if (t.st === 'held') { t.x = p.x; t.y = p.y; return; }
    if (dragCh) {
      let nx = clamp(p.x, MX0 + QR + 4, MX1 - QR - 4), ny = clamp(p.y, MY0 + QR + 4, MY1 - QR - 4);
      S.fl.ch.forEach((o) => { if (o !== dragCh) { const d = Math.hypot(nx - o.x, ny - o.y); if (d < 2 * QR + 16) { const k = (2 * QR + 16) / Math.max(d, 1); nx = o.x + (nx - o.x) * k; ny = o.y + (ny - o.y) * k; } } });
      dragCh.x = nx; dragCh.y = ny;
    }
  }
  function fieldUp(p) {
    const t = S.fl.tok;
    if (dragCh) {
      dragCh = null;
      if (t.st === 'placed' && nearCharge(t.x, t.y, QR + 16)) { tokBack(); }
    }
    if (t.st === 'held') {
      if (inMap(p.x, p.y, 8) && !nearCharge(p.x, p.y, QR + 16)) { t.x = p.x; t.y = p.y; t.st = 'placed'; Sound.click(); }
      else { t.shake = 0.4; Sound.fail(); showHint(inMap(p.x, p.y, 8) ? '전하 바로 위에는 놓을 수 없어요. 조금 떨어진 곳에 놓아 보세요.' : '시험 전하는 지도 위에 놓아요.', 3200); t.st = 'returning'; t.trail = []; }
      updateCtl();
    }
  }
  function fieldHover(p) {
    const t = S.fl.tok;
    if ((t.st === 'tray' || t.st === 'placed') && Math.hypot(p.x - t.x, p.y - t.y) <= 24) return 'grab';
    return S.fl.ch.some((c) => Math.hypot(p.x - c.x, p.y - c.y) <= QR + 12) ? 'grab' : 'default';
  }
  function releaseTok() {
    const t = S.fl.tok; if (t.st !== 'placed') return;
    t.st = 'moving'; t.trail = [{ x: t.x, y: t.y }]; t.path = 0; t.stall = 0; t.lastTx = t.x; t.lastTy = t.y; t.pre = S.fl.preset; Sound.click(); updateCtl();
  }
  function stepField(dt) {
    const fl = S.fl;
    fl.ch.forEach((c) => { /* 전하는 끄는 대로 움직여요 */ });
    // 화살표 지도
    fl.cells.forEach((c) => {
      let tx = 0, ty = 0, tw = 1.6;
      if (!nearCharge(c.x, c.y, QR + 18)) {
        const f = fieldAt(c.x, c.y);
        const len = (GRID * 0.85) * Math.tanh(0.8 * Math.sqrt(f.e));
        if (len >= 2.5) { tx = f.ux * len; ty = f.uy * len; tw = 1.6 + 3 * Math.tanh(f.e / 1.5); }
      }
      c.vx = SciSim.approach(c.vx, tx, dt, 14); c.vy = SciSim.approach(c.vy, ty, dt, 14); c.w = SciSim.approach(c.w, tw, dt, 10);
    });
    // 흐르는 점
    if (!RM) fl.flow.forEach((p) => {
      p.age += dt;
      const f = fieldAt(p.x, p.y);
      if (f.e < 0.02) { respawn(p); return; }
      const sp = clamp(26 + 34 * Math.sqrt(f.e), 26, 110);
      p.x += f.ux * sp * dt; p.y += f.uy * sp * dt;
      if (p.age > 9 || !inMap(p.x, p.y, 0) || fl.ch.some((c) => c.s < 0 && Math.hypot(p.x - c.x, p.y - c.y) < QR + 2)) respawn(p);
    });
    // 시험 전하
    const t = fl.tok;
    t.shake = Math.max(0, t.shake - dt);
    if (t.st === 'moving') {
      let ended = false;
      const n = Math.max(1, Math.ceil(dt / 0.02)), h = dt / n;
      for (let i = 0; i < n && !ended; i++) {
        const f = fieldAt(t.x, t.y);
        if (f.e < 0.03) { t.stall += h; if (t.stall > 1) { t.st = 'placed'; showHint('두 전하의 힘이 서로 비겨 시험 전하가 받는 힘이 0이에요.', 3600); ended = true; updateCtl(); } continue; }
        t.stall = 0;
        const sp = clamp(20 + 60 * Math.sqrt(f.e), 30, 190);
        t.x += f.ux * sp * h; t.y += f.uy * sp * h; t.path += sp * h;
        if (Math.hypot(t.x - t.lastTx, t.y - t.lastTy) > 7) { t.trail.push({ x: t.x, y: t.y }); t.lastTx = t.x; t.lastTy = t.y; if (t.trail.length > 160) t.trail.shift(); }
        if (t.path >= 140 && t.pre === 'p1') fl.done.plus = true;
        const hit = fl.ch.find((c) => c.s < 0 && Math.hypot(t.x - c.x, t.y - c.y) < QR + 4);
        if (hit) {
          if (t.path >= 140) { if (t.pre === 'n1') fl.done.minus = true; if (t.pre === 'pn') fl.done.pair = true; }
          parts.burst(t.x, t.y, { count: 12, speed: 110, size: 3, colors: ['#ffb400', '#2f6df6', '#ffffff'], gravity: 0 });
          Sound.success(); t.st = 'absorbed'; t.wait = 0.8; ended = true; updateCtl();
        } else if (!inMap(t.x, t.y, -4)) { t.st = 'returning'; ended = true; updateCtl(); }
      }
    } else if (t.st === 'absorbed') {
      t.wait -= dt; if (t.wait <= 0) { t.st = 'returning'; updateCtl(); }
    } else if (t.st === 'returning') {
      t.x = SciSim.approach(t.x, TRAY.x, dt, 9); t.y = SciSim.approach(t.y, TRAY.y, dt, 9);
      if (Math.hypot(t.x - TRAY.x, t.y - TRAY.y) < 1.5) { t.st = 'tray'; t.x = TRAY.x; t.y = TRAY.y; t.trail = []; updateCtl(); }
    }
  }
  function drawField() {
    sceneBg();
    const fl = S.fl;
    drawFieldPanel();
    T(14, 26, '🧭 전하 주위 전기장 지도', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '화살표 = 그 자리에 놓은 +1 시험 전하가 받는 힘', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    D.roundRect(MX0, MY0, MX1 - MX0, MY1 - MY0, 12); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,135,160,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); D.roundRect(MX0, MY0, MX1 - MX0, MY1 - MY0, 12); ctx.clip();
    // 화살표
    fl.cells.forEach((c) => {
      const len = Math.hypot(c.vx, c.vy);
      if (len < 2.5) return;
      const a = clamp(0.5 + 0.45 * (c.w - 1.6) / 3, 0.4, 0.95);
      D.arrow(c.x - c.vx / 2, c.y - c.vy / 2, c.x + c.vx / 2, c.y + c.vy / 2, { color: C.mix('#9a8ae8', '#4b2fc8', (c.w - 1.6) / 3), width: c.w, head: Math.min(9, len * 0.5 + 3), alpha: a });
    });
    // 흐르는 점
    fl.flow.forEach((p) => { const al = Math.min(1, p.age * 2.2, (9 - p.age) / 1.5); if (al <= 0.02) return; ctx.globalAlpha = al * 0.65; ctx.fillStyle = '#8b7cf0'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; });
    ctx.restore();
    // 시험 전하 길
    const t = fl.tok;
    if (t.trail.length > 1) {
      ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,.75)'; ctx.lineWidth = 3; ctx.setLineDash([2, 6]); ctx.lineCap = 'round';
      ctx.beginPath(); t.trail.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke(); ctx.restore();
    }
    // 점전하
    fl.ch.forEach((c) => {
      D.glow(c.x, c.y, QR * 2.4, c.s > 0 ? POS : NEG, 0.35);
      D.sphere(c.x, c.y, QR, c.s > 0 ? POS : NEG, { shadow: true, text: c.s > 0 ? '+' : '−' });
    });
    // 시험 전하 + 받는 힘
    if (t.st !== 'tray' && t.st !== 'returning' && inMap(t.x, t.y, 0)) {
      const f = fieldAt(t.x, t.y);
      if (f.e >= 0.03 && t.st !== 'absorbed') {
        const L = 20 + 40 * Math.tanh(0.8 * Math.sqrt(f.e));
        D.arrow(t.x, t.y, t.x + f.ux * (L + 12), t.y + f.uy * (L + 12), { color: '#f26b3a', width: 4.5, head: 12 });
      }
      if (t.st === 'placed') D.ring(t.x, t.y, 17, S.t, { color: '#f26b3a', speed: 1.2, width: 2.5 });
    }
    if (t.st !== 'absorbed') drawTok(t.x + (t.shake > 0 ? Math.sin(S.t * 60) * 4 : 0), t.y, t.st === 'held');
  }
  function drawTok(x, y, lift) {
    D.shadow(() => D.sphere(x, y, lift ? 14 : 12, '#ffb400', { text: '+1' }), { blur: lift ? 12 : 5, y: lift ? 6 : 2 });
  }
  function drawFieldPanel() {
    const t = S.fl.tok;
    panel(12, PY, TRAY_W, PH, 14);
    T(12 + TRAY_W / 2, PY + 24, '🔴 시험 전하 (+1)', PHONE ? 13 : 14, '#26324a', 'center', 800);
    if (t.st === 'tray') { D.ring(TRAY.x, TRAY.y, 24, S.t, { color: '#f26b3a', speed: 1, width: 2 }); }
    ctx.strokeStyle = '#cfd6e4'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); D.roundRect(12 + 14, PY + 38, TRAY_W - 28, PH - 52, 12); ctx.stroke(); ctx.setLineDash([]);
    if (t.st === 'tray' || t.st === 'returning') {/* 토큰은 위에서 그려요 */}
    T(12 + TRAY_W / 2, PY + PH - 16, t.st === 'tray' ? '끌어서 지도 위에 놓기' : '지도 위에 놓았어요', 12.5, '#5a6679', 'center', 700);
    const rx = 12 + TRAY_W + 10, rw = VW - rx - 12;
    panel(rx, PY, rw, PH, 14);
    T(rx + 14, PY + 24, '지도 읽는 법', 13.5, '#26324a', 'left', 800);
    const msgs = ['화살표의 방향 = +1 전하가 받는 힘의 방향', '화살표가 길고 굵을수록 힘이 세요', '전하에 가까울수록 세고, 멀어도 화살표가 있어요 (공간 어디에나!)'];
    let yy = PY + 48;
    msgs.forEach((m) => { yy += textBlock(rx + 14, yy, rw - 28, '• ' + m, PHONE ? 12.5 : 14, '#26324a', PHONE ? 16 : 19, 800) + 6; });
  }
  $$('#prSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); loadPreset(b.dataset.v); }));
  $('#bRelease').addEventListener('click', releaseTok);
  $('#bBack').addEventListener('click', () => { Sound.click(); tokBack(); });

  /* ================= ③ 평행판 전위차 ================= */
  const potAt = (cm) => S.pl.V * cm / DCM;                         // 위치 cm에서의 전위 (V)
  const r1 = (v) => Math.round(v * 10) / 10;                       // 화면에는 소수 첫째 자리까지 (식·막대·표 모두 같은 반올림)
  const chargeU = () => S.pl.q * r1(potAt(S.pl.x));                // 전기 위치 에너지 U = qV (J), (−)판이 0
  const chargeK = () => r1(0.5 * MASS * S.pl.v * S.pl.v);          // 운동 에너지 (J)
  const elecKE = () => S.pl.ev * S.pl.ev / (12 * ACC_E);           // 전자의 운동 에너지 (eV) = 얻은 전위차
  const elecSpeed = (ke) => V_E * Math.sqrt(Math.max(0, ke));     // 10^6 m/s
  const elecKd = () => r1(elecKE());                               // 화면에 보이는 운동 에너지 (eV)
  const elecU = () => r1(S.pl.V - elecKd());                       // 전자의 전기 위치 에너지 (eV), (+)판이 0
  const trim = (s) => s.replace(/\.0$/, '');
  function plReset(instant) {
    const p = S.pl;
    if (p.tw) { p.tw.cancel(); p.tw = null; }
    p.x = 0; p.v = 0; p.st = 'held'; p.ex = 0; p.ev = 0; p.eSt = 'rest'; p.trail = []; p.wait = 0; p.arrived = false; p.shake = 0;
    updateCtl();
  }
  function arrive() {
    const p = S.pl;
    if (p.arrived) return;
    p.arrived = true;
    const E = p.q * p.V, i = p.recs.findIndex((r) => r.q === p.q && r.V === p.V);
    const rec = { q: p.q, V: p.V, E };
    if (i >= 0) p.recs[i] = rec; else p.recs.push(rec);
    if (p.recs.length > 12) p.recs.shift();
    parts.burst(px(DCM), PYM, { count: 10, speed: 110, size: 3, colors: ['#ffb400', '#e2574c', '#fff'], gravity: 0 });
    Sound.success();
  }
  function startCarry() {
    const p = S.pl;
    if (p.kind !== 'charge' || p.st === 'free' || p.st === 'carry' || p.x >= DCM - 0.001) return;
    p.st = 'carry'; p.arrived = false; p.v = 0;
    const dur = RM ? 0.01 : 0.45 + 0.2 * (DCM - p.x);
    p.tw = SciSim.tween(p, { x: DCM }, { duration: dur, ease: 'inOutQuad', onDone: () => { p.tw = null; p.x = DCM; p.st = 'held'; arrive(); updateCtl(); } });
    Sound.click(); updateCtl();
  }
  function dropCharge() {
    const p = S.pl;
    if (p.kind !== 'charge' || p.st !== 'held' || p.x <= 0.001) return;
    if (p.V === 0) { showHint('전압이 0이면 판 사이에 전기장이 없어서 전하가 힘을 받지 않아요.', 3800); Sound.fail(); return; }
    p.st = 'free'; p.v = 0; Sound.click(); updateCtl();
  }
  function shoot() {
    const p = S.pl;
    if (p.kind !== 'electron' || p.eSt !== 'rest') return;
    if (p.V === 0) { showHint('전압이 0이면 전자가 힘을 받지 않아 출발하지 않아요. 전압을 올려요.', 3800); Sound.fail(); return; }
    p.eSt = 'fly'; p.ex = 0; p.ev = 0; p.trail = []; Sound.click(); updateCtl();
  }
  function stepPlates(dt) {
    const p = S.pl;
    p.shake = Math.max(0, p.shake - dt);
    if (p.kind === 'charge') {
      if (p.st === 'free') {
        const a = (p.q * p.V) / (MASS * DCM);                    // 가속도 a = qE/m, E = V/d
        let landed = false;
        const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
        for (let i = 0; i < n && !landed; i++) {
          p.v += a * h; p.x -= p.v * h;                          // v: (−)판 쪽으로 향하는 속력(cm/s)
          if (p.x <= 0) { p.x = 0; landed = true; }
        }
        if (landed) { p.v = 0; p.st = 'held'; parts.burst(px(0), PYM, { count: 8, speed: 80, size: 2.6, colors: ['#ffb400', '#8aa0c8'], gravity: 0 }); Sound.tick(); updateCtl(); }
      }
      if (p.st !== 'free') p.v = 0;
      if (p.x < DCM - 0.5) p.arrived = false;
    } else {
      if (p.eSt === 'fly') {
        const a = ACC_E * p.V;
        const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
        for (let i = 0; i < n && p.eSt === 'fly'; i++) {
          p.ev += a * h; p.ex += p.ev * h;
          if (p.ex >= DCM) {
            p.ex = DCM; p.eSt = 'hit'; p.wait = 1.0; p.ev = Math.sqrt(12 * ACC_E * p.V);
            const ke = Math.round(elecKE() * 1000) / 1000;        // 얻은 운동 에너지 = V (eV)
            p.erecs[p.V] = { ke, v: elecSpeed(ke) };
            parts.burst(px(DCM), PYM, { count: 12, speed: 120, size: 3, colors: ['#ffb400', '#e2574c', '#fff'], gravity: 0 });
            Sound.success(); updateCtl();
          }
        }
        if (p.eSt === 'fly') { p.trail.push({ x: p.ex, t: S.t }); }
      } else if (p.eSt === 'hit') {
        p.wait -= dt;
        if (p.wait <= 0) { p.eSt = 'rest'; p.ex = 0; p.ev = 0; p.trail = []; updateCtl(); }
      }
      while (p.trail.length && S.t - p.trail[0].t > 0.6) p.trail.shift();
    }
  }
  function platesDown(p) {
    const s = S.pl;
    if (s.kind !== 'charge' || s.st === 'free' || s.st === 'carry') return false;
    if (Math.abs(p.x - px(s.x)) <= CR + 16 && Math.abs(p.y - PYM) <= CR + 22) { s.st = 'held'; s.drag = true; s.arrived = false; Sound.click(); return true; }
    return false;
  }
  function platesMove(p) {
    const s = S.pl; if (!s.drag) return;
    s.x = clamp((p.x - PX0) / PU, 0, DCM);
    if (s.x < 0.03) s.x = 0;
    if (s.x > DCM - 0.03) s.x = DCM;
    updateCtl();
  }
  function platesUp() {
    const s = S.pl; if (!s.drag) return;
    s.drag = false;
    if (s.x >= DCM - 0.001) arrive();
    updateCtl();
  }
  function platesHover(p) {
    const s = S.pl;
    return s.kind === 'charge' && s.st !== 'free' && s.st !== 'carry' && Math.abs(p.x - px(s.x)) <= CR + 16 && Math.abs(p.y - PYM) <= CR + 22 ? 'grab' : 'default';
  }
  const barCol = { U: '#f2873a', K: '#14a058', T: '#516079' };
  function drawPlates() {
    sceneBg();
    const s = S.pl, V = s.V, el = s.kind === 'electron';
    T(14, 26, '🔋 평행판 사이의 전위차', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, el ? '전자를 (−)판에서 놓으면 (+)판 쪽으로 가속돼요' : '전하를 (−)판에서 (+)판 쪽으로 옮기면 에너지가 쌓여요', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    const xl = px(0) - CR, xr = px(DCM) + CR;
    // 전위 색 (고전위 붉은색 → 저전위 푸른색)
    const g = ctx.createLinearGradient(xl, 0, xr, 0);
    g.addColorStop(0, potCol(0)); g.addColorStop(1, potCol(V / VMAX));
    ctx.fillStyle = g; ctx.fillRect(xl, PYT, xr - xl, PYB - PYT);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; for (let i = 1; i < DCM; i++) { ctx.beginPath(); ctx.moveTo(px(i), PYT); ctx.lineTo(px(i), PYB); ctx.stroke(); }
    // 전기장 화살표 (판 사이 어디서나 같은 크기·방향)
    if (V > 0) {
      const len = (xr - xl - 24) * V / VMAX, cx = (xl + xr) / 2;
      [PYT + 26, PYT + 62, PYB - 62, PYB - 26].forEach((yy) => D.arrow(cx + len / 2, yy, cx - len / 2, yy, { color: '#1f2a44', width: 3, head: Math.min(12, len * 0.6), alpha: 0.72 }));
      D.label(cx, PYT + 44, '전기장 방향 (+1이 받는 힘)', { bg: 'rgba(255,255,255,.88)', color: '#1f2a44', size: PHONE ? 11 : 12 });
    }
    // 판
    const plate = (x0, w, sign, volt) => {
      D.shadow(() => { D.roundRect(x0, PYT - 4, w, PYB - PYT + 8, 5); ctx.fillStyle = '#9aa6bb'; ctx.fill(); }, { blur: 6, y: 2 });
      const n = sign > 0 ? Math.round(1 + 5 * volt / VMAX) : Math.round(1 + 5 * volt / VMAX);
      const step = (PYB - PYT) / (n + 1);
      for (let i = 1; i <= n; i++) T(x0 + w / 2, PYT + step * i + 5, sign > 0 ? '+' : '−', 15, '#fff', 'center', 800);
    };
    plate(xl - 14, 14, -1, V); plate(xr, 14, 1, V);
    D.label(xl - 14, PYT - 22, '(−)판 0 V', { bg: '#3b63c4', size: PHONE ? 12 : 13, color: '#fff', align: 'left' });
    D.label(xr + 14, PYT - 22, '(+)판 ' + V + ' V', { bg: '#c0392b', size: PHONE ? 12 : 13, color: '#fff', align: 'right' });
    // 위치 눈금 (cm)
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px(0), PYB + 14); ctx.lineTo(px(DCM), PYB + 14); ctx.stroke();
    for (let i = 0; i <= DCM; i++) { ctx.beginPath(); ctx.moveTo(px(i), PYB + 9); ctx.lineTo(px(i), PYB + 19); ctx.stroke(); T(px(i), PYB + 34, i + (i === 0 || i === DCM ? ' cm' : ''), 12, '#3a465c', 'center', 800); }
    // 움직이는 전하
    if (!el) {
      const cx = px(s.x);
      if (s.drag) { ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, PYM, CR + 5, 0, TAU); ctx.stroke(); ctx.restore(); }
      D.shadow(() => D.sphere(cx, PYM, CR, POS, { text: '+' }), { blur: s.drag ? 10 : 4, y: s.drag ? 5 : 2 });
      D.label(Math.max(cx, px(0) + 30), PYM - 24, 'q = ' + s.q + ' C', { bg: '#26324a', size: PHONE ? 11.5 : 12.5 });
      if (s.st === 'held' && s.x === 0 && S.t > 1 && !S.seenPlates) { D.arrow(cx + 34, PYM + 36, cx + 14, PYM + 14, { color: '#f26b3a', width: 3 }); T(cx + 40, PYM + 54, '끌어 보세요', 13, '#7a2e0b', 'left', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 }); }
    } else {
      s.trail.forEach((q) => { const al = clamp(1 - (S.t - q.t) / 0.6, 0, 1); ctx.globalAlpha = al * 0.5; ctx.fillStyle = '#2f6df6'; ctx.beginPath(); ctx.arc(px(q.x), PYM, 6 * al + 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; });
      if (s.eSt !== 'hit') D.shadow(() => D.sphere(px(s.ex), PYM, CR, NEG, { text: '−' }), { blur: 4, y: 2 });
      if (s.eSt === 'rest') D.label(px(0) + 30, PYM - 24, '전자 e⁻', { bg: '#26324a', size: PHONE ? 11.5 : 12.5 });
    }
    drawEnergyBars();
    drawPlatesPanel();
  }
  function drawEnergyBars() {
    const s = S.pl, el = s.kind === 'electron';
    const x0 = PXR + CR + 34, w = VW - x0 - 12, top = 100, bot = 262, bh = bot - top;
    panel(x0, 56, w, SH - 56 - 6, 12, 'rgba(255,255,255,.92)');
    const unit = el ? 'eV' : 'J', MAXV = el ? VMAX : QMAX * VMAX;
    T(x0 + w / 2, 78, '에너지 (' + unit + ')', PHONE ? 12.5 : 13.5, '#26324a', 'center', 800);
    const u = el ? elecU() : chargeU(), k = el ? elecKd() : chargeK();
    const vals = [['U', u, '위치'], ['K', k, '운동'], ['T', r1(u + k), '합']];
    const bw = PHONE ? 28 : 38, gap = (w - 3 * bw) / 4;
    ctx.strokeStyle = 'rgba(120,135,160,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 6, bot); ctx.lineTo(x0 + w - 6, bot); ctx.stroke();
    vals.forEach((v, i) => {
      const bx = x0 + gap + i * (bw + gap), hh = bh * clamp(v[1] / MAXV, 0, 1);
      D.roundRect(bx, top, bw, bh, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
      if (hh > 0.5) { ctx.save(); D.roundRect(bx, top, bw, bh, 6); ctx.clip(); ctx.fillStyle = barCol[v[0]]; ctx.fillRect(bx, bot - hh, bw, hh); ctx.restore(); }
      T(bx + bw / 2, Math.min(bot - 4, bot - hh - 6), fmtN(v[1], 1), PHONE ? 11.5 : 12.5, '#26324a', 'center', 800);
      T(bx + bw / 2, bot + 17, v[2], PHONE ? 11.5 : 12.5, '#3a465c', 'center', 800);
    });
    T(x0 + w - 8, top - 4, '눈금 끝 = ' + MAXV + ' ' + unit, 11, '#7b8aa3', 'right', 700);
    T(x0 + w / 2, SH - 14, el ? '기준(0): (+)판' : '기준(0): (−)판', 11.5, '#5a6679', 'center', 700);
  }
  function drawPlatesPanel() {
    const s = S.pl, el = s.kind === 'electron', V = s.V;
    const lw = PHONE ? VW - 24 : PXR + CR + 14 - 12 + 12, lh = PHONE ? 150 : PH;
    panel(12, PY, lw, lh, 14);
    T(26, PY + 24, '위치에 따른 전위 (그래프)', 13.5, '#26324a', 'left', 800);
    const gx0 = PX0, gx1 = PXR, gy0 = PY + 40, gy1 = PY + lh - 36;
    ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1;
    [0, 6, 12].forEach((v) => { const yy = gy1 - (gy1 - gy0) * v / VMAX; ctx.beginPath(); ctx.moveTo(gx0, yy); ctx.lineTo(gx1, yy); ctx.stroke(); T(gx0 - 6, yy + 4, v + ' V', 12, '#3a465c', 'right', 800); });
    for (let i = 0; i <= DCM; i++) { const xx = px(i); ctx.beginPath(); ctx.moveTo(xx, gy1); ctx.lineTo(xx, gy1 + 5); ctx.stroke(); T(xx, gy1 + 19, String(i), 12, '#3a465c', 'center', 800); }
    T(gx1, gy1 + 33, '위치 (cm)', 11.5, '#5a6679', 'right', 700);
    const yv = (v) => gy1 - (gy1 - gy0) * v / VMAX;
    if (V > 0) {
      ctx.beginPath(); ctx.moveTo(gx0, yv(0)); ctx.lineTo(gx1, yv(V)); ctx.lineTo(gx1, yv(0)); ctx.closePath();
      const g = ctx.createLinearGradient(gx0, 0, gx1, 0); g.addColorStop(0, C.rgba(potCol(0), 0.35)); g.addColorStop(1, C.rgba(potCol(V / VMAX), 0.35)); ctx.fillStyle = g; ctx.fill();
    }
    ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    const lg = ctx.createLinearGradient(gx0, 0, gx1, 0); lg.addColorStop(0, potCol(0)); lg.addColorStop(1, V > 0 ? potCol(V / VMAX) : potCol(0)); ctx.strokeStyle = lg;
    ctx.beginPath(); ctx.moveTo(gx0, yv(0)); ctx.lineTo(gx1, yv(V)); ctx.stroke();
    const cm = el ? s.ex : s.x, vv = potAt(cm);
    if (!(el && s.eSt === 'hit' && false)) {
      ctx.save(); ctx.strokeStyle = 'rgba(60,70,90,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px(cm), gy1); ctx.lineTo(px(cm), yv(vv)); ctx.lineTo(gx0, yv(vv)); ctx.stroke(); ctx.restore();
      D.sphere(px(cm), yv(vv), 6.5, el ? NEG : POS, { gloss: false });
      D.label(clamp(px(cm), gx0 + 50, gx1 - 40), yv(vv) - 26 < gy0 - 6 ? yv(vv) + 24 : yv(vv) - 26, '이 위치의 전위 ' + trim(fmtN(vv, 1)) + ' V', { bg: '#26324a', size: PHONE ? 11.5 : 12.5 });
    }
    // 오른쪽 카드: 에너지 = 전하 × 전위차
    const rx = PHONE ? 12 : lw + 24, ry = PHONE ? PY + lh + 10 : PY, rw = PHONE ? VW - 24 : VW - rx - 12, rh = PHONE ? PH - lh - 10 : PH;
    panel(rx, ry, rw, rh, 14);
    const x = rx + 14; let y = ry + 24;
    if (!el) {
      T(x, y, '전하 q가 전위차 V를 지나면', 13.5, '#26324a', 'left', 800); y += 22;
      T(x, y, '에너지 변화 = q × V', 15, '#9a3412', 'left', 800); y += 28;
      T(x, y, s.q + ' C × ' + trim(fmtN(potAt(s.x), 1)) + ' V = ' + trim(fmtN(chargeU(), 1)) + ' J', PHONE ? 15 : 17, '#26324a', 'left', 800); y += 14;
      T(x, y + 14, '(1 V = 1 J/C)', 12.5, '#5a6679', 'left', 700); y += 36;
      T(x, y, '기록 (끝까지 옮겼을 때)', 12.5, '#5a6679', 'left', 800); y += 20;
      const rs = s.recs.slice(-(PHONE ? 3 : 4));
      if (!rs.length) T(x, y, '— (+)판까지 옮겨 보세요', 12.5, '#98a2b3', 'left', 700);
      rs.forEach((r, i) => T(x, y + i * 19, r.q + ' C · ' + r.V + ' V → ' + r.E + ' J', 13.5, '#26324a', 'left', 800));
    } else {
      T(x, y, '전자가 전위차 V를 지나면', 13.5, '#26324a', 'left', 800); y += 22;
      T(x, y, '운동 에너지 = V (eV)', 15, '#9a3412', 'left', 800); y += 26;
      const ke = elecKE();
      T(x, y, '지금 ' + trim(fmtN(elecKd(), 1)) + ' eV · ' + fmtN(elecSpeed(ke), 2) + ' ×10⁶ m/s', 14, '#26324a', 'left', 800); y += 20;
      T(x, y, '(1 eV = 1.6 × 10⁻¹⁹ J)', 12, '#5a6679', 'left', 700); y += 24;
      T(x, y, '기록 (도착했을 때)', 12.5, '#5a6679', 'left', 800); y += 20;
      const ks = Object.keys(s.erecs).map(Number).sort((a, b) => a - b).slice(-(PHONE ? 3 : 4));
      if (!ks.length) T(x, y, '— 전자를 놓아 보세요', 12.5, '#98a2b3', 'left', 700);
      ks.forEach((kk, i) => T(x, y + i * 19, kk + ' V → ' + kk + ' eV · ' + fmtN(s.erecs[kk].v, 2) + ' ×10⁶ m/s', 13, '#26324a', 'left', 800));
    }
  }
  $('#sVolt').addEventListener('input', (e) => { S.pl.V = +e.target.value; S.pl.arrived = false; Sound.tick(); updateCtl(); });
  $$('#kindSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.pl.kind !== b.dataset.v) { plReset(true); S.pl.kind = b.dataset.v; S.fade = 0.5; } updateCtl(); }));
  $$('#qSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pl.q = +b.dataset.v; updateCtl(); }));
  $('#bCarry').addEventListener('click', startCarry);
  $('#bDrop').addEventListener('click', dropCharge);
  $('#bShoot').addEventListener('click', shoot);

  /* ================= ④ 적용 ================= */
  // ---- (a) 회로의 전위 ----
  const CIR = (() => {
    const L = PHONE ? 64 : 120, R = PHONE ? 312 : 470, TOP = 104, BOT = SH - 52, by = (TOP + BOT) / 2;
    const batT = by - 36, batB = by + 36, b1x = (L + R) / 2;
    const verts = [[L, batB, 0], [L, batT, BAT], [L, TOP, BAT], [b1x - 26, TOP, BAT], [b1x + 26, TOP, BAT - U1], [R, TOP, BAT - U1], [R, by - 26, BAT - U1], [R, by + 26, 0], [R, BOT, 0], [L, BOT, 0]];
    const cum = [0]; let tot = 0;
    verts.forEach((v, i) => { const w = verts[(i + 1) % verts.length]; tot += Math.hypot(w[0] - v[0], w[1] - v[1]); cum.push(tot); });
    return { L, R, TOP, BOT, by, batT, batB, b1x, verts, cum, tot };
  })();
  function cirPos(s) {
    s = ((s % CIR.tot) + CIR.tot) % CIR.tot;
    let i = 0; while (i < CIR.verts.length - 1 && CIR.cum[i + 1] <= s) i++;
    const a = CIR.verts[i], b = CIR.verts[(i + 1) % CIR.verts.length], f = (s - CIR.cum[i]) / Math.max(1e-6, CIR.cum[i + 1] - CIR.cum[i]);
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, pot: a[2] + (b[2] - a[2]) * f };
  }
  const cirPot = (s) => cirPos(s).pot;
  const CIR_SPEED = 70;                                          // 전하가 도는 속력 (px/s)
  function cirLedger(s) {                                        // 이번 바퀴에서 이 전하가 얻은/내놓은 에너지 (1 C 기준, J)
    const seg = (i, from, to) => { const a = CIR.cum[i], b = CIR.cum[i + 1]; return clamp((s - a) / (b - a), 0, 1) * Math.abs(to - from); };
    return { gain: seg(0, 0, BAT), l1: seg(3, BAT, BAT - U1), l2: seg(6, BAT - U1, 0) };
  }
  function stepCircuit(dt) {
    const a = S.ap;
    const prev = a.ph; a.ph += dt * CIR_SPEED / CIR.tot;
    if (Math.floor(a.ph) > Math.floor(prev)) a.lapDone = true;
    a.ph %= 1000;
  }
  function drawCircuit() {
    sceneBg();
    const a = S.ap, c = CIR;
    T(14, 26, '🔌 회로에서 전하의 전위 변화', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '1 C의 전하를 따라가며 전위(전기적 높이)를 살펴봐요', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    // 도선
    ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); c.verts.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.stroke();
    // 전지
    const bw = 40;
    D.shadow(() => { D.roundRect(c.L - bw / 2, c.batT, bw, c.batB - c.batT, 8); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 2 });
    T(c.L, c.batT + 20, '+', 20, '#ffb4ae', 'center', 800); T(c.L, c.batB - 10, '−', 20, '#a9c4ff', 'center', 800);
    T(c.L, c.by + 6, BAT + ' V', 14, '#fff', 'center', 800);
    T(c.L - bw / 2 - 8, c.by + 5, '전지', 13, '#26324a', 'right', 800);
    // 전구
    const bulb = (x, y, drop, name, side) => {
      const br = clamp(drop / BAT, 0, 1);
      D.glow(x, y, 46, '#ffd447', 0.25 + 0.5 * br);
      D.sphere(x, y, 20, C.mix('#e8e2c8', '#ffd447', 0.45 + 0.55 * br), { shadow: true });
      T(x, y + 4.5, '✕', 14, '#7a6a2a', 'center', 800);
      if (side) T(x + 30, y + 5, name, 13, '#26324a', 'left', 800); else T(x, y + 38, name, 13, '#26324a', 'center', 800);
    };
    bulb(c.b1x, c.TOP, U1, '전구 1');
    bulb(c.R, c.by, U2, '전구 2', true);
    // 점 A, B, C
    const pin = (x, y, t, dx, dy) => D.label(x + dx, y + dy, t, { bg: '#5a4fcf', size: 12.5, pad: 7 });
    pin(c.L, c.TOP, 'A', -22, -2); pin(c.R, c.TOP, 'B', 22, -2); pin(c.R, c.BOT, 'C', 22, 2);
    // 전하들
    const N = 10;
    for (let i = 1; i < N; i++) { const q = cirPos((a.ph + i / N) * c.tot); D.sphere(q.x, q.y, 4.2, potCol(q.pot / BAT), { gloss: false, outline: 'rgba(30,40,70,.35)', outlineWidth: 1 }); }
    const tk = cirPos(a.ph * c.tot);
    D.glow(tk.x, tk.y, 24, potCol(tk.pot / BAT), 0.5);
    D.sphere(tk.x, tk.y, 9, potCol(tk.pot / BAT), { outline: '#26324a', outlineWidth: 2 });
    D.label(tk.x, tk.y - 22, '1 C', { bg: '#26324a', size: 12.5 });
    if (!PHONE) {
      const lg = cirLedger((a.ph % 1) * c.tot), x0 = c.R + 84, w = VW - x0 - 14;
      panel(x0, 62, w, SH - 62 - 8, 12, 'rgba(255,255,255,.92)');
      T(x0 + 14, 86, '이번 바퀴의 1 C 전하', 13.5, '#26324a', 'left', 800);
      T(x0 + 14, 114, '지금 전위 ' + fmtN(cirPot((a.ph % 1) * c.tot), 1) + ' V', 17, '#5a4fcf', 'left', 800);
      T(x0 + 14, 146, '전지에서 얻은 에너지', 12.5, '#5a6679', 'left', 700); T(x0 + w - 14, 146, '+' + fmtN(lg.gain, 1) + ' J', 15, '#14803f', 'right', 800);
      T(x0 + 14, 172, '전구 1에서 내놓은 에너지', 12.5, '#5a6679', 'left', 700); T(x0 + w - 14, 172, (lg.l1 < 0.05 ? '' : '−') + fmtN(lg.l1, 1) + ' J', 15, '#b4231f', 'right', 800);
      T(x0 + 14, 198, '전구 2에서 내놓은 에너지', 12.5, '#5a6679', 'left', 700); T(x0 + w - 14, 198, (lg.l2 < 0.05 ? '' : '−') + fmtN(lg.l2, 1) + ' J', 15, '#b4231f', 'right', 800);
      textBlock(x0 + 14, 228, w - 28, '한 바퀴를 돌면 전위는 처음 값으로 돌아와요.', 12.5, '#5a6679', 16, 700);
    }
    drawCircuitPanel();
  }
  function drawCircuitPanel() {
    const a = S.ap, c = CIR;
    const lw = PHONE ? VW - 24 : 548, lh = PHONE ? 170 : PH;
    panel(12, PY, lw, lh, 14);
    T(26, PY + 24, '전위 그래프 (전하가 지나가는 위치에 따른 전위)', 13.5, '#26324a', 'left', 800);
    const gx0 = 56, gx1 = 12 + lw - 18, gy0 = PY + 44, gy1 = PY + lh - 40;
    const xs = (s) => gx0 + (gx1 - gx0) * s / c.tot, yv = (v) => gy1 - (gy1 - gy0) * v / BAT;
    ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1;
    for (let v = 0; v <= BAT; v++) { ctx.beginPath(); ctx.moveTo(gx0, yv(v)); ctx.lineTo(gx1, yv(v)); ctx.stroke(); T(gx0 - 6, yv(v) + 4, v + ' V', 12, '#3a465c', 'right', 800); }
    // 곡선
    const NS = 120;
    ctx.beginPath(); ctx.moveTo(xs(0), yv(0));
    for (let i = 0; i <= NS; i++) { const s = c.tot * i / NS; ctx.lineTo(xs(s), yv(cirPot(Math.min(s, c.tot - 0.01)))); }
    ctx.lineTo(xs(c.tot), yv(0)); ctx.closePath(); ctx.fillStyle = 'rgba(124,92,255,.12)'; ctx.fill();
    ctx.beginPath(); for (let i = 0; i <= NS; i++) { const s = c.tot * i / NS; const y = yv(cirPot(Math.min(s, c.tot - 0.01))); i ? ctx.lineTo(xs(s), y) : ctx.moveTo(xs(s), y); }
    ctx.strokeStyle = '#5a4fcf'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
    // 구간 이름과 점
    const names = [[0, 1, '전지'], [3, 4, '전구 1'], [6, 7, '전구 2']];
    names.forEach((n) => { const xa = xs(c.cum[n[0]]), xb = xs(c.cum[n[1]]); T((xa + xb) / 2, gy1 + 18, n[2], 12, '#3a465c', 'center', 800); ctx.strokeStyle = 'rgba(60,70,90,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xa, gy1 + 5); ctx.lineTo(xb, gy1 + 5); ctx.stroke(); });
    [[2, 'A'], [5, 'B'], [8, 'C']].forEach((p) => { const x = xs(c.cum[p[0]]); ctx.fillStyle = '#5a4fcf'; ctx.beginPath(); ctx.arc(x, yv(cirPot(c.cum[p[0]] + 0.01)), 5, 0, TAU); ctx.fill(); T(x, yv(cirPot(c.cum[p[0]] + 0.01)) - 10, p[1], 12.5, '#5a4fcf', 'center', 800); });
    const s = (a.ph % 1) * c.tot, pv = cirPot(s);
    ctx.save(); ctx.strokeStyle = 'rgba(60,70,90,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xs(s), gy1); ctx.lineTo(xs(s), yv(pv)); ctx.lineTo(gx0, yv(pv)); ctx.stroke(); ctx.restore();
    D.sphere(xs(s), yv(pv), 7, potCol(pv / BAT), { outline: '#26324a', outlineWidth: 2 });
    const rx = PHONE ? 12 : lw + 24, ry = PHONE ? PY + lh + 10 : PY, rw = PHONE ? VW - 24 : VW - rx - 12, rh = PHONE ? PH - lh - 10 : PH;
    panel(rx, ry, rw, rh, 14);
    T(rx + 14, ry + 24, '회로 정보', 13.5, '#26324a', 'left', 800);
    const lines = ['전지 ' + BAT + ' V', '전구 1: ' + R1 + ' Ω · 전구 2: ' + R2 + ' Ω (직렬)', '전류 ' + fmtN(I_C, 2) + ' A (어디서나 같아요)'];
    let ly = ry + 48; lines.forEach((l) => { ly += textBlock(rx + 14, ly, rw - 28, '• ' + l, PHONE ? 12.5 : 13.5, '#26324a', 17, 800) + 3; });
    if (a.lapDone || PHONE) textBlock(rx + 14, ly + 6, rw - 28, '한 바퀴: 전지 +' + fmtN(BAT, 1) + ' J, 전구 1 −' + fmtN(U1, 1) + ' J, 전구 2 −' + fmtN(U2, 1) + ' J', PHONE ? 12.5 : 13, '#9a3412', 17, 800);
  }

  // ---- (b) 전기 집진기 ----
  const PC = (() => {
    const w = PHONE ? 170 : 220, x0 = PHONE ? 150 : 270, top = 100, bot = SH - 24;
    return { x0, x1: x0 + w, w, top, bot, band: bot - 34 };
  })();
  const LV_VX = [0, 42, 95], UP = 70;                              // 단계별 옆으로 끌려가는 속력, 공기 속력 (px/s)
  function stepPrecip(dt) {
    const a = S.ap;
    a.acc += dt * 8;
    while (a.acc >= 1) { a.acc -= 1; if (a.dust.length < 90) a.dust.push({ x: rnd(PC.x0 + 6, PC.x1 - 6), y: PC.bot, vx: 0, ch: false, r: rnd(2.2, 3.4) }); }
    for (let i = a.dust.length - 1; i >= 0; i--) {
      const p = a.dust[i];
      p.y -= UP * dt;
      if (!p.ch && a.lv > 0 && p.y <= PC.band) p.ch = true;       // 대전 구역을 지나면 (−)로 대전
      const tvx = p.ch ? -LV_VX[a.lv] : 0;
      p.vx = SciSim.approach(p.vx, tvx, dt, 6);
      p.x += p.vx * dt + (p.ch ? 0 : Math.sin(S.t * 3 + i) * 3 * dt);
      p.x = clamp(p.x, PC.x0 + 1, PC.x1 - 1);
      if (p.x <= PC.x0 + 2 && p.ch && a.lv > 0) {                  // (+)판에 붙어요
        a.stuck.push({ y: p.y, o: rnd(0, 7), r: p.r }); a.caught++; a.dust.splice(i, 1);
        if (a.stuck.length >= 260) { a.stuck.length = 0; parts.burst(PC.x0 - 10, (PC.top + PC.bot) / 2, { count: 14, speed: 60, size: 3, colors: ['#8a7a6a'], gravity: 220, shape: 'circle' }); }
      } else if (p.y <= PC.top) { a.passed++; a.dust.splice(i, 1); }
    }
  }
  function drawPrecip() {
    sceneBg();
    const a = S.ap, p = PC;
    T(14, 26, '🌫️ 전기 집진기', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '먼지에 전하를 띠게 해서 전기장으로 걸러 내요', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    // 통로
    ctx.fillStyle = a.lv ? 'rgba(124,92,255,.08)' : 'rgba(255,255,255,.55)'; ctx.fillRect(p.x0, p.top, p.w, p.bot - p.top);
    if (a.lv > 0) { const len = (p.w - 30) * a.lv / 2; [p.top + 60, (p.top + p.bot) / 2, p.bot - 80].forEach((yy) => D.arrow(p.x0 + 15, yy, p.x0 + 15 + len, yy, { color: '#5a4fcf', width: 3, head: 10, alpha: 0.6 })); }
    // 대전 구역
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(242,107,58,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x0, p.band); ctx.lineTo(p.x1, p.band); ctx.stroke(); ctx.restore();
    T(p.x1 + 24, p.band + 4, '대전 구역', 12, '#9a3412', 'left', 800);
    // 판
    const plate = (x, w, sign) => { D.shadow(() => { D.roundRect(x, p.top - 6, w, p.bot - p.top + 12, 5); ctx.fillStyle = '#9aa6bb'; ctx.fill(); }, { blur: 6, y: 2 }); const n = a.lv ? 2 + a.lv * 2 : 0; for (let i = 1; i <= n; i++) T(x + w / 2, p.top + (p.bot - p.top) * i / (n + 1) + 5, sign, 15, '#fff', 'center', 800); };
    plate(p.x0 - 14, 14, '+'); plate(p.x1, 14, '−');
    D.label(p.x0 - 7, p.top - 22, '(+)판 · 집진판', { bg: '#e2574c', size: 12, align: 'center' });
    D.label(p.x1 + 7, p.top - 22, '(−)판', { bg: '#4a7be0', size: 12 });
    // 붙은 먼지
    a.stuck.forEach((s) => { ctx.fillStyle = '#6b5d4f'; ctx.beginPath(); ctx.arc(p.x0 + s.r + s.o * 0.35, s.y, s.r, 0, TAU); ctx.fill(); });
    // 떠다니는 먼지
    a.dust.forEach((d) => { D.sphere(d.x, d.y, d.r, d.ch ? '#4a6fd0' : '#8a7a6a', { gloss: false }); });
    T(p.x0 + p.w / 2, p.bot + 17, '↑ 더러운 공기', 12.5, '#5a6679', 'center', 800); T(p.x0 + p.w / 2, p.top - 8, '깨끗한 공기 ↑', 12.5, '#14803f', 'center', 800);
    if (!PHONE) {
      const x = 14; panel(x, 70, 210, 150, 12, 'rgba(255,255,255,.92)');
      T(x + 12, 92, '범례', 13, '#26324a', 'left', 800);
      D.sphere(x + 20, 112, 4, '#8a7a6a', { gloss: false }); T(x + 34, 116, '먼지 (전하 없음)', 12.5, '#26324a', 'left', 800);
      D.sphere(x + 20, 136, 4, '#4a6fd0', { gloss: false }); T(x + 34, 140, '(−)로 대전된 먼지', 12.5, '#26324a', 'left', 800);
      D.arrow(x + 12, 166, x + 52, 166, { color: '#5a4fcf', width: 3, head: 10, alpha: 0.7 }); T(x + 60, 170, '전기장 방향', 12.5, '#26324a', 'left', 800);
      T(x + 12, 198, '(−) 먼지는 전기장 반대쪽', 12, '#9a3412', 'left', 800);
    }
    // 아래 카드
    const tot = a.caught + a.passed, pct = tot ? Math.round(100 * a.caught / tot) : 0;
    const lw = PHONE ? VW - 24 : 400, lh = PHONE ? 140 : PH;
    panel(12, PY, lw, lh, 14);
    T(26, PY + 24, '집진기가 일하는 원리', 13.5, '#26324a', 'left', 800);
    let yy = PY + 46;
    ['① 먼지가 대전 구역에서 (−)전하를 띠어요.', '② (+)판과 (−)판 사이에 전기장이 생겨요.', '③ (−) 먼지는 전기장 반대쪽 힘을 받아 (+)판에 붙어요.'].forEach((m) => { yy += textBlock(26, yy, lw - 40, m, PHONE ? 12.5 : 14, '#26324a', PHONE ? 16 : 19, 800) + 4; });
    const rx = PHONE ? 12 : 424, ry = PHONE ? PY + lh + 10 : PY, rw = PHONE ? VW - 24 : VW - rx - 12, rh = PHONE ? PH - lh - 10 : PH;
    panel(rx, ry, rw, rh, 14);
    T(rx + 14, ry + 24, '걸러 낸 먼지', 13.5, '#26324a', 'left', 800);
    T(rx + 14, ry + 56, a.lv ? '전압: ' + (a.lv === 1 ? '약하게' : '강하게') : '전압: 끔', 14, '#26324a', 'left', 800);
    T(rx + 14, ry + 84, '붙은 먼지 ' + a.caught + '개 / 지나간 먼지 ' + a.passed + '개', 13.5, '#26324a', 'left', 800);
    T(rx + 14, ry + 116, '걸러진 비율 ' + pct + ' %', 18, '#5a4fcf', 'left', 800);
  }

  // ---- (c) 번개와 피뢰침 ----
  const LG = (() => {
    const hx = PHONE ? 330 : 470, gy = SH - 34, cx = PHONE ? 170 : 300;
    return { hx, gy, cx, cy: 92, roofY: gy - 74, tipY: gy - 74 - 46 };
  })();
  function makeBolt(x0, y0, x1, y1) {
    const pts = [[x0, y0]]; const n = 9;
    for (let i = 1; i < n; i++) { const f = i / n; pts.push([x0 + (x1 - x0) * f + rnd(-22, 22), y0 + (y1 - y0) * f]); }
    pts.push([x1, y1]);
    const br = [];
    [3, 6].forEach((k) => { const q = pts[k], dir = Math.random() < 0.5 ? -1 : 1; const bp = [[q[0], q[1]]]; for (let i = 1; i <= 4; i++) bp.push([bp[i - 1][0] + dir * rnd(8, 18), bp[i - 1][1] + rnd(10, 20)]); br.push(bp); });
    return { pts, br, t: 0, tgt: [x1, y1] };
  }
  function strike() {
    const a = S.ap; if (a.bolt) return;
    const tx = LG.hx, ty = a.rod ? LG.tipY : LG.roofY;
    a.bolt = makeBolt(LG.cx + rnd(-20, 20), LG.cy + 22, tx, ty); a.struck = false; a.charged = 1; a.hit = a.rod ? 'rod' : 'house';
    Sound.click(); updateCtl();
  }
  function stepLight(dt) {
    const a = S.ap;
    if (a.bolt) {
      a.bolt.t += dt;
      if (a.bolt.t > 0.28 && !a.struck) {
        a.struck = true; a.flash = 1; a.hitT = 0; Sound.success();
        parts.burst(a.bolt.tgt[0], a.bolt.tgt[1], { count: 16, speed: 150, size: 3, colors: ['#fff6c2', '#ffd447', '#fff'], gravity: 60 });
        if (!a.rod) a.dmg = 1;
        S.ap.seenLight = true;
      }
      if (a.bolt.t > 1.5) { a.bolt = null; a.cd = 0; updateCtl(); }
    }
    a.flash = Math.max(0, a.flash - dt * 2.2);
    if (a.struck) a.hitT = (a.hitT || 0) + dt;
    if (!a.bolt) { a.charged = Math.min(1, a.charged + dt * 0.45); if (a.dmg && a.charged >= 1) a.dmg = Math.max(0, a.dmg - dt * 0.4); }
    else a.charged = Math.max(0, a.charged - dt * (a.struck ? 2.5 : 0));
  }
  function drawLight() {
    sceneBg();
    const a = S.ap, g = LG;
    ctx.fillStyle = '#3d4a63'; ctx.fillRect(0, 0, VW, SH); const sky = ctx.createLinearGradient(0, 0, 0, SH); sky.addColorStop(0, '#39445c'); sky.addColorStop(1, '#6b7a99'); ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, SH);
    T(14, 26, '⛈️ 번개와 피뢰침', PHONE ? 15 : 17, '#fff', 'left', 800);
    T(14, PHONE ? 46 : 50, a.rod ? '피뢰침이 있는 집에 번개가 치면?' : '피뢰침이 없는 집에 번개가 치면?', PHONE ? 12 : 13.5, '#d6deee', 'left', 700);
    // 땅
    ctx.fillStyle = '#4b5b3d'; ctx.fillRect(0, g.gy, VW, SH - g.gy); ctx.fillStyle = '#5d6f4b'; ctx.fillRect(0, g.gy, VW, 5);
    // 구름
    const cw = PHONE ? 170 : 240;
    [[-0.28, 6, 0.9], [0, -6, 1.05], [0.28, 8, 0.95], [-0.1, 14, 0.8], [0.12, 14, 0.8]].forEach((c) => { D.sphere(g.cx + c[0] * cw, g.cy + c[1], 34 * c[2], '#6f7b96', { gloss: false }); });
    const nM = 8;
    for (let i = 0; i < nM; i++) { const x = g.cx - cw * 0.34 + (cw * 0.68) * i / (nM - 1); ctx.globalAlpha = 0.25 + 0.75 * a.charged; T(x, g.cy + 40, '−', 16, '#a9c4ff', 'center', 800); ctx.globalAlpha = 1; }
    // 땅·집 위의 (+) 유도 전하
    for (let x = 30; x < VW - 20; x += 56) { if (Math.abs(x - g.hx) < 100) continue; ctx.globalAlpha = 0.25 + 0.75 * a.charged; T(x, g.gy + 20, '+', 15, '#ffb4ae', 'center', 800); ctx.globalAlpha = 1; }
    // 집
    const hx = g.hx, hw = PHONE ? 90 : 120, top = g.roofY;
    D.shadow(() => { ctx.fillStyle = '#e8d9b8'; ctx.fillRect(hx - hw / 2, top + 22, hw, g.gy - top - 22); }, { blur: 6, y: 2 });
    ctx.fillStyle = '#b4573b'; ctx.beginPath(); ctx.moveTo(hx - hw / 2 - 10, top + 24); ctx.lineTo(hx, top); ctx.lineTo(hx + hw / 2 + 10, top + 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(hx - 11, g.gy - 38, 22, 38); ctx.fillStyle = '#cfe6fb'; ctx.fillRect(hx - hw / 2 + 12, top + 38, 24, 22); ctx.fillRect(hx + hw / 2 - 36, top + 38, 24, 22);
    // 피뢰침
    if (a.rod) {
      ctx.strokeStyle = '#c9d2e0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, top); ctx.lineTo(hx, g.tipY + 6); ctx.stroke();
      ctx.fillStyle = '#e8edf5'; ctx.beginPath(); ctx.moveTo(hx, g.tipY - 6); ctx.lineTo(hx - 4, g.tipY + 8); ctx.lineTo(hx + 4, g.tipY + 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8791a5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx + hw / 2 + 4, top + 22); ctx.lineTo(hx + hw / 2 + 24, top + 22); ctx.lineTo(hx + hw / 2 + 24, g.gy + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + hw / 2 + 14, g.gy + 8); ctx.lineTo(hx + hw / 2 + 34, g.gy + 8); ctx.moveTo(hx + hw / 2 + 18, g.gy + 13); ctx.lineTo(hx + hw / 2 + 30, g.gy + 13); ctx.stroke();
      ctx.strokeStyle = '#8791a5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, top); ctx.lineTo(hx + hw / 2 + 4, top + 22); ctx.stroke();
      // 뾰족한 끝에 전하가 모여요
      for (let i = 0; i < 6; i++) { const t = i / 5, y = g.tipY + 2 + (top - g.tipY) * t * t * t; ctx.globalAlpha = (0.3 + 0.7 * a.charged); T(hx + 11, y + 5, '+', 14, '#ffb4ae', 'left', 800); ctx.globalAlpha = 1; }
      D.label(hx - 54, g.tipY - 6, PHONE ? '전하가 모여요' : '뾰족한 끝에 전하가 모여요', { bg: 'rgba(255,255,255,.9)', color: '#26324a', size: PHONE ? 11 : 12.5, align: 'right' });
    } else {
      for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.3 + 0.7 * a.charged; T(hx - 36 + i * 18, top + 24 + Math.abs(i - 2) * 8 - 4, '+', 14, '#ffb4ae', 'center', 800); ctx.globalAlpha = 1; }
    }
    if (a.dmg > 0) { ctx.globalAlpha = Math.min(1, a.dmg); ctx.fillStyle = 'rgba(20,20,20,.55)'; ctx.beginPath(); ctx.moveTo(hx - 24, top + 24); ctx.lineTo(hx, top + 2); ctx.lineTo(hx + 24, top + 24); ctx.closePath(); ctx.fill(); D.label(hx, top - 18, '지붕이 불타요!', { bg: '#e2464b', size: 12.5 }); ctx.globalAlpha = 1; }
    // 번개
    if (a.bolt) {
      const b = a.bolt, prog = clamp(b.t / 0.28, 0, 1), fade = b.t > 0.4 ? clamp(1 - (b.t - 0.4) / 1.0, 0, 1) : 1;
      const drawPath = (pts, w, col, frac) => {
        const m = Math.max(1, Math.floor(frac * (pts.length - 1)));
        ctx.beginPath(); for (let i = 0; i <= m; i++) { const q = pts[Math.min(i, pts.length - 1)]; i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke();
      };
      ctx.save(); ctx.globalAlpha = fade; ctx.shadowColor = '#fff6a8'; ctx.shadowBlur = 16;
      drawPath(b.pts, 6, 'rgba(255,240,150,.5)', prog); drawPath(b.pts, 2.6, '#ffffff', prog);
      b.br.forEach((bp) => { if (prog > 0.5) drawPath(bp, 1.8, '#fffbe0', 1); });
      ctx.restore();
      if (a.struck && a.rod) {                                     // 전류가 도선을 따라 땅으로
        for (let i = 0; i < 6; i++) { const q = (((a.hitT || 0) * 2.2 + i / 6) % 1); const x = hx + hw / 2 + 24, y0 = top + 22; const yy = q < 0.5 ? g.tipY + (top - g.tipY) * (q / 0.5) : top + 22 + (g.gy + 8 - top - 22) * ((q - 0.5) / 0.5); D.sphere(q < 0.5 ? hx : x, yy, 3.4, '#ffe45e', { gloss: false }); }
      }
    }
    if (a.flash > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + a.flash * 0.5 + ')'; ctx.fillRect(0, 0, VW, SH); }
    // 아래 카드
    const lw = PHONE ? VW - 24 : 400, lh = PHONE ? 130 : PH;
    panel(12, PY, lw, lh, 14);
    T(26, PY + 24, '번개 한 번이 옮기는 에너지', 13.5, '#26324a', 'left', 800);
    T(26, PY + 52, '구름–지면 전위차  약 10' + sup(LVEXP) + ' V', PHONE ? 14 : 15, '#26324a', 'left', 800);
    T(26, PY + 78, '이동하는 전하  약 ' + LQ + ' C', PHONE ? 14 : 15, '#26324a', 'left', 800);
    T(26, PY + 108, '에너지 = ' + LQ + ' C × 10' + sup(LVEXP) + ' V = ' + fmtN(LE / 1e9, 1) + ' × 10⁹ J', PHONE ? 14 : 16, '#9a3412', 'left', 800);
    const rx = PHONE ? 12 : 424, ry = PHONE ? PY + lh + 10 : PY, rw = PHONE ? VW - 24 : VW - rx - 12, rh = PHONE ? PH - lh - 10 : PH;
    panel(rx, ry, rw, rh, 14);
    T(rx + 14, ry + 24, '피뢰침의 역할', 13.5, '#26324a', 'left', 800);
    let yy = ry + 48;
    ['뾰족한 도체 끝에는 전하가 모여요.', '번개는 피뢰침 끝으로 떨어지고, 전하는 도선을 따라 땅으로 흘러가요.', '그래서 집은 안전해요.'].forEach((m) => { yy += textBlock(rx + 14, yy, rw - 28, '• ' + m, PHONE ? 12.5 : 13.5, '#26324a', PHONE ? 16 : 18, 800) + 4; });
  }
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function sup(n) { return String(n).split('').map((c) => SUP[c] || c).join(''); }

  function stepApply(dt) {
    const sub = S.ap.sub;
    if (sub === 'circuit') stepCircuit(dt); else if (sub === 'precip') stepPrecip(dt); else stepLight(dt);
  }
  function drawApply() {
    const sub = S.ap.sub;
    if (sub === 'circuit') drawCircuit(); else if (sub === 'precip') drawPrecip(); else drawLight();
  }
  function setSub(sub) {
    const a = S.ap;
    if (a.sub !== sub) { a.sub = sub; a.seenSub[sub] = true; a.bolt = null; a.flash = 0; a.dmg = 0; S.fade = 0.7; parts.clear(); a.dust.length = 0; a.stuck.length = 0; a.caught = 0; a.passed = 0; a.ph = 0; }
    updateCtl();
  }
  $$('#subSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub(b.dataset.v); }));
  $$('#lvSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const lv = +b.dataset.v; if (lv !== S.ap.lv) { S.ap.lv = lv; S.ap.caught = 0; S.ap.passed = 0; S.ap.dust.forEach((d) => { if (lv === 0) d.ch = false; }); } updateCtl(); }));
  $('#bClean').addEventListener('click', () => { Sound.click(); S.ap.stuck.length = 0; S.ap.caught = 0; S.ap.passed = 0; parts.burst(PC.x0 - 10, (PC.top + PC.bot) / 2, { count: 12, speed: 50, size: 3, colors: ['#8a7a6a'], gravity: 220 }); });
  $$('#rodSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (!S.ap.bolt) { S.ap.rod = +b.dataset.v; S.ap.dmg = 0; } updateCtl(); }));
  $('#bStrike').addEventListener('click', strike);

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const PRESET_NAME = { p1: '(+) 전하 한 개', n1: '(−) 전하 한 개', pn: '(+)와 (−) 한 쌍', pp: '(+)와 (+) 한 쌍' };
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'force') {
      L1 = '힘의 세기 (최대 배치 = 100 %)'; a = fPct() + ' %';
      L2 = '두 전하가 받는 힘'; b = '크기 같음 · 방향 반대 (' + (sameSign() ? '밀어냄' : '끌어당김') + ')';
      L3 = '거리 · 전하량'; c = S.f.d.toFixed(1) + '칸 · A ' + S.f.qa + ' · B ' + S.f.qb;
    } else if (S.mode === 'field') {
      const t = S.fl.tok, on = t.st === 'placed' || t.st === 'moving' || t.st === 'held';
      L1 = '전하 배치'; a = PRESET_NAME[S.fl.preset];
      const f = on && inMap(t.x, t.y, 0) ? fieldAt(t.x, t.y) : null;
      L2 = '시험 전하가 받는 힘의 방향'; b = f ? dirTxt(f) : '시험 전하를 놓아 보세요';
      L3 = '힘의 세기'; c = f && f.e >= 0.03 ? strengthTxt(f.e) : '—';
    } else if (S.mode === 'plates') {
      const p = S.pl, el = p.kind === 'electron';
      L1 = '판 사이 전압 (전위차)'; a = p.V + ' V';
      if (!el) { L2 = '전기 위치 에너지 U = qV'; b = trim(fmtN(chargeU(), 1)) + ' J'; L3 = '운동 에너지 K'; c = trim(fmtN(chargeK(), 1)) + ' J'; }
      else { L2 = '전자의 운동 에너지'; b = trim(fmtN(elecKd(), 1)) + ' eV'; L3 = '전자의 속력'; c = fmtN(elecSpeed(elecKE()), 2) + ' ×10⁶ m/s'; }
    } else {
      const ap = S.ap;
      if (ap.sub === 'circuit') { L1 = '지금 전하의 전위'; a = fmtN(cirPot((ap.ph % 1) * CIR.tot), 1) + ' V'; L2 = '전류'; b = fmtN(I_C, 2) + ' A'; L3 = '전지 전압'; c = BAT + ' V'; }
      else if (ap.sub === 'precip') { const tot = ap.caught + ap.passed; L1 = '집진기 전압'; a = ['끔', '약하게', '강하게'][ap.lv]; L2 = '붙은 먼지 / 지나간 먼지'; b = ap.caught + ' / ' + ap.passed + '개'; L3 = '걸러진 비율'; c = (tot ? Math.round(100 * ap.caught / tot) : 0) + ' %'; }
      else { L1 = '구름–지면 전위차'; a = '약 10' + sup(LVEXP) + ' V'; L2 = '이동한 전하'; b = '약 ' + LQ + ' C'; L3 = '번개의 에너지'; c = '약 ' + fmtN(LE / 1e9, 1) + ' × 10⁹ J'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const doneRec = (q, V) => S.pl.recs.some((r) => r.q === q && r.V === V);
  const birdFig = '<svg viewBox="0 0 300 120" width="300" role="img" aria-label="고압선 한 줄에 앉은 새. 두 발이 같은 전선 위에 있어 전위가 같다.">' +
    '<rect width="300" height="120" fill="#eaf1fb" rx="10"/><line x1="10" y1="78" x2="290" y2="78" stroke="#516079" stroke-width="5" stroke-linecap="round"/>' +
    '<ellipse cx="150" cy="56" rx="26" ry="17" fill="#8a6a44"/><circle cx="174" cy="42" r="10" fill="#8a6a44"/><polygon points="183,42 194,45 183,48" fill="#f2b630"/><circle cx="177" cy="40" r="2" fill="#fff"/>' +
    '<line x1="144" y1="70" x2="144" y2="78" stroke="#f2873a" stroke-width="3"/><line x1="158" y1="70" x2="158" y2="78" stroke="#f2873a" stroke-width="3"/>' +
    '<text x="144" y="100" font-size="12" font-weight="800" text-anchor="middle" fill="#26324a">발 1</text><text x="158" y="114" font-size="12" font-weight="800" text-anchor="middle" fill="#26324a">발 2</text>' +
    '<text x="40" y="66" font-size="13" font-weight="800" fill="#b4231f">고압선 (매우 높은 전위)</text></svg>';
  const levels = [
    {
      title: '전기력: 전하끼리 주고받는 힘', short: '전기력', icon: '⚡', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 전지는 전선 속 전자에게 무엇을 주기에 전구가 켜질까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 마찰 전기로 물체가 전하를 띠고, 같은 부호의 전하는 서로 밀고 다른 부호의 전하는 서로 당기는 <b>전기력</b>이 작용한다고 배웠어요.</div>' +
        '<p>먼저 전기력이 <b>전하량</b>과 <b>거리</b>에 따라 어떻게 달라지는지 살펴봐요. 전하 B를 끌어 움직이며 두 전하가 서로 받는 힘(주황 화살표)을 비교해요. 화살표가 길수록 힘이 세요.</p>',
      features: ['force'],
      setup() { S.gate = ''; S.f.qa = 1; S.f.qb = 1; S.f.sb = 1; setD(3, false); resetSelects(ruleSel, S.rule, S.ruleOK); setScene('force'); },
      recap: '전하량이 클수록, 거리가 가까울수록 전기력이 커요. 두 전하는 크기가 같고 방향이 반대인 힘을 서로 주고받아요(같은 부호는 밀고, 다른 부호는 당겨요).',
      summary: '<ul><li>전하 사이에는 <b>전기력</b>이 작용해요. 같은 부호는 <b>밀어내고</b>, 다른 부호는 <b>끌어당겨요</b>.</li><li>전하량이 <b>클수록</b>, 거리가 <b>가까울수록</b> 전기력이 커요.</li><li>A가 B에 작용하는 힘과 B가 A에 작용하는 힘은 <b>크기가 같고 방향이 반대</b>예요(작용·반작용).</li><li>한쪽 전하량만 2배로 해도 두 전하가 받는 힘이 <b>모두</b> 2배가 돼요.</li></ul>',
      missions: [
        {
          title: '가장 센 힘 만들기',
          goal: '두 전하 사이의 힘을 <b>100 %</b>(가장 센 배치)로 만들어 보세요.',
          hint: '두 전하의 전하량을 모두 3단위로 하고, 거리를 가장 가까운 2.0칸으로 해요. 부호는 상관없어요.',
          setup() { S.gate = ''; setScene('force'); updateCtl(); },
          check: () => S.f.qa === QMAX && S.f.qb === QMAX && S.f.d <= DMIN + 0.001,
          hold: 0.8,
          status: () => mark(S.f.qa === QMAX) + ' A ' + QMAX + '단위 &nbsp; ' + mark(S.f.qb === QMAX) + ' B ' + QMAX + '단위 &nbsp; ' + mark(S.f.d <= DMIN + 0.001) + ' 거리 ' + DMIN + '.0칸 &nbsp; (힘 ' + fPct() + ' %)',
          explain: '전하량이 둘 다 최대(' + QMAX + '단위)이고 거리가 가장 가까울(' + DMIN + '.0칸) 때 힘이 가장 세서 <b>100 %</b>예요. 같은 부호든 다른 부호든 힘의 <b>크기</b>는 같고, 방향만 달라요.',
        },
        {
          title: '규칙 문장 완성하기', manual: true,
          goal: '관찰한 내용으로 네 문장의 빈칸을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '앞 미션에서 전하량과 거리를 바꿀 때 힘의 세기(%)가 어떻게 달라졌는지, 두 화살표의 길이가 어땠는지 떠올려 보세요.',
          setup() { S.gate = 'rule'; resetSelects(ruleSel, S.rule, S.ruleOK); setScene('force'); updateCtl(); },
          check: () => checkSelects(RULES, S.rule, S.ruleOK, ruleSel, '빨간 칸을 다시 골라 보세요. 전하량과 거리를 바꿔 가며 화살표를 관찰해 보세요.'),
          status: () => '고른 문장 ' + RULES.filter((r, i) => S.rule[i]).length + ' / ' + RULES.length,
          explain: '전하량이 <b>클수록</b> 힘이 커지고, 거리가 <b>멀수록</b> 힘이 작아져요. 두 전하는 서로 <b>크기가 같고 방향이 반대</b>인 힘을 주고받으며, <b>같은 부호</b>끼리는 밀어내요.',
        },
        {
          type: 'quiz', title: '한쪽 전하량만 2배로 하면?',
          goal: '전하 A의 전하량만 <b>2배</b>로 하고 나머지는 그대로 둘 때, 두 전하가 서로 받는 힘은 어떻게 될까요?',
          setup() { S.gate = ''; setScene('force'); updateCtl(); },
          choices: ['A가 받는 힘만 2배가 되고 B가 받는 힘은 그대로예요', 'A와 B가 받는 힘이 모두 2배가 돼요', 'B가 받는 힘만 2배가 되고 A가 받는 힘은 그대로예요', '두 힘 모두 변하지 않아요'],
          answer: 1,
          feedback: ['두 전하가 받는 힘은 서로 크기가 같아요. 한쪽만 커질 수 없어요. 화면에서 A만 2단위로 바꿔 두 화살표를 비교해 보세요.', '', 'A가 받는 힘과 B가 받는 힘은 크기가 같아서 한쪽만 변하지 않아요.', '전하량이 커지면 힘도 커져요. 전하 A를 1단위에서 2단위로 바꿔 보세요.'],
          explain: '전기력은 두 전하가 <b>서로 주고받는</b> 힘이라서 크기가 같아요(작용·반작용). 한쪽 전하량이 2배가 되면 두 전하가 받는 힘이 <b>모두 2배</b>가 돼요.',
        },
      ],
    },
    {
      title: '전기장: 전하가 만드는 공간', short: '전기장', icon: '🧭', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 떨어져 있는 두 전하가 서로 힘을 주고받는 것을 봤어요. 접촉하지 않았는데 어떻게 힘이 전달될까요?</div>' +
        '<p>전하는 주변 공간을 바꾸어 놓아요. 그 공간에 놓인 다른 전하가 힘을 받는 성질을 <b>전기장</b>이라고 해요. 공간 곳곳에 <b>+1 시험 전하</b>를 놓았을 때 받는 힘의 방향과 세기를 화살표 지도로 나타내 볼게요.</p>',
      features: ['field'],
      setup() { S.gate = ''; setScene('field'); loadPreset('p1', true); S.fl.done = {}; },
      recap: '전하는 주변 공간에 전기장을 만들어요. (+)전하의 전기장은 바깥쪽, (−)전하의 전기장은 안쪽을 향하고, 전하에 가까울수록 세요.',
      summary: '<ul><li>전하는 주변 공간에 <b>전기장</b>을 만들고, 그 공간의 다른 전하가 <b>힘</b>을 받아요. 전기장은 전하 사이뿐 아니라 <b>공간 어디에나</b> 있어요.</li><li>전기장의 방향은 <b>+1 시험 전하가 받는 힘</b>의 방향이에요. (+)전하 주위는 바깥쪽, (−)전하 주위는 안쪽이에요.</li><li>전하에 가까울수록 화살표가 길고 굵어요(전기장이 세요).</li><li>같은 자리에서 전자(−)는 시험 전하(+)와 <b>반대 방향</b>으로 힘을 받아요.</li></ul>',
      missions: [
        {
          title: '시험 전하를 내보내기',
          goal: '세 가지 배치에서 시험 전하를 놓고 ▶ <b>놓아 주기</b>를 눌러 움직임을 관찰하세요.',
          hint: '(+) 한 개: 전하에서 조금 떨어진 곳에 놓아요 → 멀어져요. (−) 한 개: 전하에서 멀리 놓아요 → 끌려가요. (+)와 (−): 두 전하 사이의 (+)전하 가까이에 놓아요 → (−)로 가요.',
          setup() { S.gate = ''; setScene('field'); S.fl.done = {}; loadPreset('p1', true); },
          check: () => S.fl.done.plus && S.fl.done.minus && S.fl.done.pair,
          hold: 0.3,
          status: () => mark(S.fl.done.plus) + ' (+) 한 개: 바깥으로 멀어짐 &nbsp; ' + mark(S.fl.done.minus) + ' (−) 한 개: 전하에 닿음 &nbsp; ' + mark(S.fl.done.pair) + ' (+)(−) 한 쌍: (−)에 닿음',
          explain: '(+)전하의 시험 전하는 <b>바깥쪽</b>으로 밀려나고, (−)전하 쪽에서는 <b>안쪽</b>으로 끌려가요. (+)와 (−)가 함께 있으면 (+)에서 출발한 시험 전하가 (−)로 가요. 화살표 지도는 이 힘의 방향을 미리 보여 줘요.',
        },
        {
          type: 'quiz', title: '전기장에 대한 설명',
          goal: '전기장에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { S.gate = ''; setScene('field'); },
          choices: ['전기장은 두 전하 사이에만 있어요', '같은 자리에서 전자는 +1 시험 전하와 반대 방향으로 힘을 받아요. 전하의 부호가 반대이기 때문이에요', '시험 전하를 놓지 않으면 그 자리에는 전기장이 없어요', '전하에서 조금만 멀어져도 전기장이 완전히 사라져요'],
          answer: 1,
          feedback: ['전기장은 전하 주위의 공간 어디에나 있어요. 지도에서 전하 바깥에도 화살표가 있었죠?', '', '시험 전하는 전기장을 확인하는 도구예요. 놓지 않아도 전하가 만든 전기장은 그 자리에 있어요.', '멀어질수록 약해지지만 사라지지 않아요. 먼 곳의 화살표도 짧게나마 있었어요.'],
          explain: '전하가 만든 전기장은 <b>공간 어디에나</b> 있고, 멀수록 약해질 뿐이에요. 전기장 방향은 <b>+1 시험 전하</b>가 받는 힘의 방향으로 정하므로, 같은 자리에서 전자는 <b>반대 방향</b>의 힘을 받아요.',
        },
      ],
    },
    {
      title: '전위차: 단위 전하당 에너지', short: '전위차', icon: '🔋', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전기장 속의 전하가 힘을 받는다는 것을 알았어요. 힘을 받는 전하가 움직이면 <b>에너지</b>가 오가요. 높이 h의 위치 에너지 mgh처럼, 전기에도 전기적 \'높이\'인 <b>전위</b>가 있어요.</div>' +
        '<p>평행한 두 금속판 사이에는 어디서나 같은 전기장이 생겨요. 두 판의 전위의 차이가 <b>전위차</b>(전압)예요. 전하를 (−)판에서 (+)판으로 옮길 때 필요한 에너지와, 전자를 가속할 때 얻는 에너지를 알아봐요.</p>',
      features: ['plates'],
      setup() { S.gate = ''; setScene('plates'); plReset(true); S.pl.kind = 'charge'; S.pl.q = 1; S.pl.V = 4; S.pl.recs = []; S.pl.erecs = {}; updateCtl(); },
      recap: '전위차 V는 전하 1 C당 에너지의 차이(1 V = 1 J/C)예요. 전하 q가 전위차 V를 지나면 에너지가 qV만큼 변하고, 전자 1개가 V볼트를 지나면 V eV의 운동 에너지를 얻어요.',
      summary: '<ul><li><b>전위차</b> V는 단위 전하(1 C)당 에너지의 차이예요. <b>1 V = 1 J/C</b></li><li>전하 q가 전위차 V를 지나면 에너지가 <b>qV</b>만큼 변해요. 예) 2 C, 12 V → 24 J</li><li>(+)전하는 (−)판에서 (+)판으로 가려면 에너지를 받아야 하고(전위 에너지 증가), 놓으면 위치 에너지가 줄어든 만큼 운동 에너지를 얻어요.</li><li>전자 1개가 12 V의 전위차를 지나면 <b>12 eV</b>(≈ 1.9 × 10⁻¹⁸ J)의 운동 에너지를 얻어요. 전위차가 클수록 더 빨라져요.</li></ul>',
      missions: [
        {
          title: '1 C이 지나는 에너지 읽기',
          goal: '<b>1 C</b>의 시험 전하를 (−)판에서 (+)판까지 옮겨, 전압이 <b>4 V · 8 V · 12 V</b>일 때의 에너지를 각각 기록하세요.',
          hint: '전하량을 1 C으로 하고 전압을 정한 뒤 ⬆ (+)판까지 옮기기를 눌러요. 옮긴 뒤 ✋ 놓기로 되돌린 다음 전압을 바꾸어 다시 해요.',
          setup() { S.gate = ''; setScene('plates'); plReset(true); S.pl.kind = 'charge'; S.pl.q = 1; S.pl.V = 4; S.pl.recs = []; updateCtl(); },
          check: () => doneRec(1, 4) && doneRec(1, 8) && doneRec(1, 12),
          hold: 0.5,
          status: () => mark(doneRec(1, 4)) + ' 4 V &nbsp; ' + mark(doneRec(1, 8)) + ' 8 V &nbsp; ' + mark(doneRec(1, 12)) + ' 12 V',
          explain: '1 C이 4 V를 지나면 <b>4 J</b>, 8 V면 <b>8 J</b>, 12 V면 <b>12 J</b>의 에너지가 필요해요. 그래서 전위차 1 V는 전하 1 C당 에너지 <b>1 J</b>, 즉 <b>1 V = 1 J/C</b>이에요.',
        },
        {
          title: '전자를 가속하기',
          goal: '전압 <b>3 V</b>와 <b>12 V</b>에서 전자를 (−)판에서 놓아 (+)판에 도착하게 하고, 속력을 비교하세요.',
          hint: '전자 (−) 버튼으로 바꾸고 전압을 3 V로 맞춘 뒤 ▶ 전자 놓기를 눌러요. 도착하면 전압을 12 V로 바꾸어 한 번 더 해요.',
          setup() { S.gate = ''; setScene('plates'); plReset(true); S.pl.kind = 'electron'; S.pl.V = 3; S.pl.erecs = {}; S.fade = 0.4; updateCtl(); },
          check: () => !!S.pl.erecs[3] && !!S.pl.erecs[12],
          hold: 0.4,
          status: () => mark(S.pl.erecs[3]) + ' 3 V' + (S.pl.erecs[3] ? ' → ' + fmtN(S.pl.erecs[3].v, 2) + ' ×10⁶ m/s' : '') + ' &nbsp; ' + mark(S.pl.erecs[12]) + ' 12 V' + (S.pl.erecs[12] ? ' → ' + fmtN(S.pl.erecs[12].v, 2) + ' ×10⁶ m/s' : ''),
          explain: '전자가 얻는 운동 에너지는 지나간 전위차와 같아서 3 V면 <b>3 eV</b>, 12 V면 <b>12 eV</b>예요. 전위 에너지가 줄어든 만큼 운동 에너지가 늘어나 속력이 빨라져요. 12 V에서는 3 V의 <b>2배</b> 속력이에요.',
        },
        {
          type: 'quiz', title: '전위차와 에너지',
          goal: '전하량이 <b>2 C</b>인 전하가 <b>12 V</b>의 전위차를 지나면 에너지 변화는 얼마일까요? (1 V = 1 J/C)',
          setup() { S.gate = ''; setScene('plates'); updateCtl(); },
          choices: ['6 J', '12 J', '24 J', '36 J'],
          answer: 2,
          feedback: ['전하량을 곱하지 않았어요. 에너지 변화 = 전하량 × 전위차예요.', '1 C일 때의 값이에요. 전하가 2 C이면 2배가 돼요.', '', '3 C일 때의 값이에요. 2 C × 12 V를 계산해 보세요.'],
          explain: '에너지 변화 = qV = 2 C × 12 V = <b>24 J</b>이에요. 같은 전하라면 전위차가 클수록 더 큰 에너지를 얻거나 잃어요.',
        },
      ],
    },
    {
      title: '회로와 장치: 전위차의 쓰임', short: '적용', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전위차는 전하 1 C당 에너지의 차이라는 것을 알았어요. 처음의 탐구 질문으로 돌아가 볼까요? <b>전지는 전선 속 전자에게 에너지를 주고, 전구는 그 에너지를 빛과 열로 바꿔요.</b></div>' +
        '<p>회로 속 전하의 <b>전위 변화</b>를 따라가 보고, 전위차와 전기장이 쓰이는 <b>전기 집진기</b>와 <b>번개·피뢰침</b>도 살펴봐요.</p>',
      features: ['apply'],
      setup() { S.gate = ''; setScene('apply'); setSub('circuit'); S.ap.lapDone = false; resetSelects(blankSel, S.blank, S.blankOK); },
      recap: '전지는 전하를 높은 전위로 올려 주고, 전구에서 전하는 낮은 전위로 내려오며 에너지를 빛과 열로 내놓아요. 전압은 \'전류의 힘\'이 아니라 단위 전하당 에너지예요.',
      summary: '<ul><li>회로에서 <b>전지</b>는 전하의 전위를 높여 주고(예: 0 V → ' + BAT + ' V), <b>전구</b>에서 전위가 내려오며 에너지를 빛·열로 내놓아요.</li><li>' + BAT + ' V 전지를 지나는 1 C은 ' + BAT + ' J을 얻고, 전구 1에서 ' + fmtN(U1, 1) + ' J, 전구 2에서 ' + fmtN(U2, 1) + ' J을 내놓아요(합 ' + BAT + ' J).</li><li><b>전기 집진기</b>: 대전된 먼지가 판 사이 전기장의 힘을 받아 집진판에 붙어요.</li><li><b>번개</b>: 구름과 지면의 전위차 약 10⁸ V, 이동 전하 약 15 C → 에너지 약 10⁹ J. <b>피뢰침</b>은 번개의 전하를 땅으로 흘려 보내요.</li><li>전압은 \'전류의 힘\'이 아니라 <b>단위 전하당 에너지</b>(전위의 차이)예요.</li></ul>',
      missions: [
        {
          title: '전위 그래프 빈칸 채우기', manual: true,
          goal: '🔌 회로 장면에서 1 C 전하를 따라가며 전위 그래프를 읽고 빈칸을 채운 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '그래프에서 A, B, C 점의 높이(전위)를 읽어요. 전구를 지날 때마다 그래프가 내려간 만큼이 그 전구에서 내놓는 에너지예요.',
          setup() { S.gate = 'blank'; setScene('apply'); setSub('circuit'); resetSelects(blankSel, S.blank, S.blankOK); updateCtl(); },
          check: () => checkSelects(BLANKS, S.blank, S.blankOK, blankSel, '빨간 칸을 다시 골라 보세요. 그래프에서 A, B, C 점의 높이(전위)를 읽어 보세요.'),
          status: () => '고른 문장 ' + BLANKS.filter((r, i) => S.blank[i]).length + ' / ' + BLANKS.length,
          explain: '전지를 지나면 전위가 0 V에서 <b>' + BAT + ' V</b>로 올라가요. 전구 1을 지나면 ' + fmtN(U1, 1) + ' V만큼 내려와 B점은 <b>' + fmtN(BAT - U1, 1) + ' V</b>, 전구 2에서는 나머지 <b>' + fmtN(U2, 1) + ' V</b>가 내려와 C점은 0 V예요. 전구 2에서 1 C이 내놓는 에너지는 <b>' + fmtN(U2, 1) + ' J</b>이고, 두 전구의 합 ' + BAT + ' J은 전지가 준 에너지와 <b>같아요</b>.',
        },
        {
          type: 'quiz', title: '전압이란?',
          goal: '전압(전위차)의 뜻으로 가장 알맞은 것은?',
          setup() { S.gate = ''; setScene('apply'); updateCtl(); },
          choices: ['전류를 밀어 주는 힘', '전하 1 C당 에너지의 차이', '전지 속에 들어 있는 전하의 양', '전선을 흐르는 전류의 세기'],
          answer: 1,
          feedback: ['전압은 힘이 아니에요. 전하 1 C이 받거나 내놓는 에너지로 나타내요.', '', '전하의 양은 \'전하량\'이에요(단위 C). 전압은 단위 전하당 에너지예요.', '전류의 세기는 단위가 A예요. 전압(V)과 달라요.'],
          explain: '전압(전위차)은 전하 <b>1 C당 에너지</b>의 차이로, 단위는 V(= J/C)예요. 전지의 전압이 크면 같은 전하가 더 많은 에너지를 얻어 회로에서 내놓을 수 있어요.',
        },
        {
          type: 'quiz', title: '새와 고압선', figure: birdFig,
          goal: '새가 고압선 <b>한 줄</b>에 앉아 있어도 감전되지 않는 까닭은?',
          setup() { S.gate = ''; setScene('apply'); updateCtl(); },
          choices: ['새의 몸이 절연체라서', '두 발 사이의 전위차가 거의 0이라 몸으로 전류가 거의 흐르지 않아서', '고압선에는 전류가 전혀 흐르지 않아서', '새가 가벼워서'],
          answer: 1,
          feedback: ['새의 몸은 전류가 어느 정도 흐르는 도체예요. 다른 까닭을 찾아보세요.', '', '고압선에는 전류가 흘러요. 새의 몸을 통해 흐르지 않는 까닭이 필요해요.', '몸무게와 전류는 관계가 없어요. 전위의 차이(전압)를 생각해 보세요.'],
          explain: '새의 두 발이 같은 전선 위에 있어서 <b>두 발 사이의 전위차가 거의 0</b>이에요. 전류는 전위차가 있어야 흐르므로 새의 몸으로는 거의 흐르지 않아요. 한 발은 전선에, 다른 발은 땅이나 다른 전선에 닿으면 큰 전위차가 생겨 위험해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-field-potential', mount: '#game', badge: '전기장 박사', homeHref: '../../index.html#hp',
    featureLabels: { force: '⚡ 두 점전하와 전기력 화살표', field: '🧭 전기장 화살표 지도 · 시험 전하', plates: '🔋 평행판 · 전위 그래프 · 전자총', apply: '🏠 회로 전위 · 집진기 · 번개' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  loadPreset('p1', true);
  plReset(true);
  setScene('force');
  updateCtl();
  function stepAll1(dt) {
    if (S.mode === 'force') stepForce(dt);
    else if (S.mode === 'field') stepField(dt);
    else if (S.mode === 'plates') stepPlates(dt);
    else stepApply(dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    if (S.mode === 'force') drawForce(); else if (S.mode === 'field') drawField(); else if (S.mode === 'plates') drawPlates(); else drawApply();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SH, PY, PH, FXA, FU, FSY, PX0, PU, PYM, PC, LG, CIR, MX0, MX1, MY0, MY1, TRAY, get game() { return game; },
    setScene, setD, loadPreset, releaseTok, tokBack, startCarry, dropCharge, shoot, strike, setSub, plReset, fPct, fieldAt, ruleSel, blankSel, RULES, BLANKS, chargeU, chargeK, elecKE, elecSpeed, potAt, arrive,
    place(x, y) { const t = S.fl.tok; t.st = 'placed'; t.x = x; t.y = y; updateCtl(); },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
