/* =========================================================
   물리학 Ⅱ. 전기와 자기 - 저항의 연결 (단원 2차시)
   성취기준 [12물리02-02] 전기 회로에서 저항의 연결에 따라 소비 전력이 달라짐을 알고, 다양한 전기 기구에서 적용되는 사례를 찾을 수 있다. (저항의 연결 부분)
   ① 실험: 직렬 측정 (전류계 · 전압계, 전원 12 V, R₁ 20 Ω, R₂ 30 Ω)
   ② 실험: 병렬 측정 (가지 스위치, 저항 하나 더 연결)
   ③ 모형: 합성 저항 (도선 통로 모형, R = V / I)
   ④ 예측: 직렬 + 병렬 혼합 회로 (예측 → 측정 → 오차)
   소비 전력은 다음 차시(hp-electric-power)에서 다뤄요. 키르히호프 법칙 · 내부 저항 · 휘트스톤 브리지는 다루지 않아요.
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
  const fA = (v) => fmtN(v, 3) + ' A';       // 전류는 소수 셋째 자리까지
  const fV = (v) => fmtN(v, 2) + ' V';       // 전압은 소수 둘째 자리까지
  const fR = (v) => fmtN(v, 1) + ' Ω';       // 저항은 소수 첫째 자리까지

  /* ---------- 물리 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const VS = 12;                              // 전원 전압 (V)
  const R1 = 20, R2S = [30, 60], R3 = 60;     // 저항 (Ω). 직렬에서 R₂는 30 Ω 또는 60 Ω, 병렬·혼합에서 R₂ = 30 Ω
  const R2 = R2S[0];
  const TOL = 0.02;                           // 예측·실측 일치로 보는 허용 오차 (2 %)
  const KFLOW = 150;                          // 전류 1 A당 전하 점의 속력 (px/s)
  // 측정 오차(±1 % 이내, 위치마다 정해진 값): 측정값 = 이론값 × (1 + 오차/100)
  const NZ = {
    sA1: 0.6, sA2: -0.4, sA3: 0.3, sV1: -0.5, sV2: 0.7, sVS: 0.2,
    pA0: -0.3, pA1: 0.5, pA2: -0.6, pA3: 0.4, pV1: 0.3, pV2: -0.2, pV3: 0.5, pVS: -0.4,
    mA0: 0.4, mA2: -0.5, mA3: 0.6, mV1: -0.3, mVP: 0.5, mVS: 0.2,
  };
  const NZM = { s2: [0.4, -0.6], s3: [-0.3, 0.5], p2: [-0.5, 0.4], p3: [0.6, -0.3] };   // 합성 저항 측정 [전압 오차, 전류 오차] (%)

  /* ---------- 회로 계산 ---------- */
  const para = (arr) => 1 / arr.reduce((s, r) => s + 1 / r, 0);
  const MIX = (() => { const Rp = para([R2, R3]), Rt = R1 + Rp, I = VS / Rt, V1 = I * R1, VP = I * Rp; return { Rp, Rt, I, V1, VP, I2: VP / R2, I3: VP / R3 }; })();
  function seriesVals(r2) { const I = VS / (R1 + r2); return { A1: I, A2: I, A3: I, V1: I * R1, V2: I * r2, VS }; }
  function parallelVals(sw) {
    const Rk = [R1, R2, R3], Ik = Rk.map((r, k) => (sw[k] ? VS / r : 0)), It = Ik[0] + Ik[1] + Ik[2];
    return { A0: It, A1: Ik[0], A2: Ik[1], A3: Ik[2], V1: sw[0] ? VS : 0, V2: sw[1] ? VS : 0, V3: sw[2] ? VS : 0, VS, Ik, It };
  }
  function mixedVals() { return { A0: MIX.I, A2: MIX.I2, A3: MIX.I3, V1: MIX.V1, VP: MIX.VP, VS }; }
  // 합성 저항 모형 (③)
  const mdRes = (conn, n3) => { const a = n3 ? [R1, R2, R3] : [R1, R2]; return conn === 'series' ? a.reduce((s, r) => s + r, 0) : para(a); };
  const mdKey = (conn, n3) => (conn === 'series' ? 's' : 'p') + (n3 ? 3 : 2);
  const mdFormula = (conn, n3) => {
    const a = n3 ? [R1, R2, R3] : [R1, R2];
    return conn === 'series' ? a.join(' + ') + ' = ' + fmtN(mdRes(conn, n3), 1) + ' Ω' : a.map((r) => '1/' + r).join(' + ') + ' → ' + fmtN(mdRes(conn, n3), 1) + ' Ω';
  };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'series', t: 0, fade: 0, gate: '',
    r2: R2, sw: [true, true, false],
    rec: { series: {}, parallel: {}, mixed: {} },
    dial: { type: 'A', spot: null, val: 0, full: 0.5, needle: new SciSim.Spring(0, { stiffness: 220, damping: 20 }) },
    md: { conn: 'series', n3: false, rec: {}, last: null },
    segs: {}, pred: null, predOK: false, flashSpot: null, flashT: 0, swUsed: false,
    rule1: {}, ruleOK1: {}, rule2: {}, ruleOK2: {}, hist: {},
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { series: '🔌 직렬 측정', parallel: '🔀 병렬 측정', model: '🧩 합성 저항', mixed: '🎯 회로 예측' };

  /* ---------- 공통 UI ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); resetDial(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#r2Seg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.r2));
    $$('#swChips button').forEach((b) => b.classList.toggle('on', S.sw[+b.dataset.v]));
    $$('#connSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.md.conn));
    $$('#n3Seg button').forEach((b) => b.classList.toggle('on', (+b.dataset.v === 1) === S.md.n3));
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
  const RULES1 = [
    ['직렬연결에서 전류는', ['회로의 어디서나 같아요', '저항이 큰 쪽이 더 커요', '전원에서 멀수록 작아져요'], 0],
    ['R₁과 R₂에 걸리는 전압을 더하면', ['전원 전압과 같아요', '전원 전압보다 커요', '전원 전압보다 작아요'], 0],
    ['저항이 더 큰 쪽에 걸리는 전압은', ['더 커요', '더 작아요', '같아요'], 0],
  ];
  const RULES2 = [
    ['병렬연결에서 각 저항에 걸리는 전압은', ['모두 전원 전압과 같아요', '저항이 클수록 커요', '저항이 클수록 작아요'], 0],
    ['각 가지의 전류를 모두 더하면', ['전체 전류와 같아요', '전체 전류보다 커요', '전체 전류보다 작아요'], 0],
    ['저항이 더 작은 가지에 흐르는 전류는', ['더 커요', '더 작아요', '같아요'], 0],
    ['저항을 병렬로 하나 더 연결하면 전체 전류는', ['커져요', '작아져요', '변하지 않아요'], 0],
  ];
  const ruleSel1 = makeSelects($('#ruleRows1'), RULES1, S.rule1, S.ruleOK1);
  const ruleSel2 = makeSelects($('#ruleRows2'), RULES2, S.rule2, S.ruleOK2);

  /* ================= 회로 그림 · 측정 ================= */
  const CB = PHONE ? { x: 10, y: 64, w: 460, h: 262 } : { x: 24, y: 64, w: 520, h: 256 };
  const cxf = (f) => CB.x + CB.w * f;
  const TOPY = CB.y + 46, BOTY = CB.y + CB.h - 26, MIDY = (TOPY + BOTY) / 2;
  const BL = CB.x + (PHONE ? 54 : 46), BATT = MIDY - 36, BATB = MIDY + 36;
  const RLEN = 80, RC = MIDY + 40, SWY = TOPY + 68;
  const G = {
    s: { r1x: cxf(0.40), xr: cxf(0.72) },
    p: { xs: [cxf(0.36), cxf(0.60), cxf(0.84)] },
    m: { r1x: cxf(0.30), xs: [cxf(0.62), cxf(0.86)] },
  };
  const AMAX = { series: 0.5, parallel: 1.5, mixed: 0.5 }, VMAXD = 15;       // 계기의 눈금 끝값
  const TYPE_NAME = { A: '전류계', V: '전압계' };

  function valsOf(mode) { return mode === 'series' ? seriesVals(S.r2) : mode === 'parallel' ? parallelVals(S.sw) : mixedVals(); }
  function spotsOf(mode) {
    const out = [], s = G.s, p = G.p, m = G.m;
    const vs = { id: 'VS', type: 'V', x: BL - 34, y: MIDY, name: '전원 양단', leads: [[BL, BATT], [BL, BATB]] };
    if (mode === 'series') {
      out.push({ id: 'A1', type: 'A', x: cxf(0.20), y: TOPY, name: '전류계 ① (R₁ 앞)' });
      out.push({ id: 'A2', type: 'A', x: (s.r1x + RLEN / 2 + s.xr) / 2, y: TOPY, name: '전류계 ② (R₁과 R₂ 사이)' });
      out.push({ id: 'A3', type: 'A', x: cxf(0.46), y: BOTY, name: '전류계 ③ (R₂ 뒤)' });
      out.push({ id: 'V1', type: 'V', x: s.r1x, y: TOPY - 34, name: 'R₁ 양단', leads: [[s.r1x - RLEN / 2, TOPY], [s.r1x + RLEN / 2, TOPY]] });
      out.push({ id: 'V2', type: 'V', x: s.xr + 40, y: MIDY, name: 'R₂ 양단', leads: [[s.xr, MIDY - RLEN / 2], [s.xr, MIDY + RLEN / 2]] });
      out.push(vs);
    } else if (mode === 'parallel') {
      out.push({ id: 'A0', type: 'A', x: cxf(0.20), y: TOPY, name: '전체 전류 I' });
      ['I₁ (R₁ 가지)', 'I₂ (R₂ 가지)', 'I₃ (R₃ 가지)'].forEach((nm, k) => out.push({ id: 'A' + (k + 1), type: 'A', x: p.xs[k], y: TOPY + 32, name: nm }));
      ['R₁ 양단', 'R₂ 양단', 'R₃ 양단'].forEach((nm, k) => out.push({ id: 'V' + (k + 1), type: 'V', x: p.xs[k] + 38, y: RC, name: nm, leads: [[p.xs[k], RC - RLEN / 2], [p.xs[k], RC + RLEN / 2]] }));
      out.push(vs);
    } else {
      out.push({ id: 'A0', type: 'A', x: (BL + m.r1x - RLEN / 2) / 2, y: TOPY, name: '전체 전류 I' });
      out.push({ id: 'A2', type: 'A', x: m.xs[0], y: TOPY + 32, name: 'R₂ 가지 전류' });
      out.push({ id: 'A3', type: 'A', x: m.xs[1], y: TOPY + 32, name: 'R₃ 가지 전류' });
      out.push({ id: 'V1', type: 'V', x: m.r1x, y: TOPY - 34, name: 'R₁ 양단', leads: [[m.r1x - RLEN / 2, TOPY], [m.r1x + RLEN / 2, TOPY]] });
      out.push({ id: 'VP', type: 'V', x: (m.xs[0] + m.xs[1]) / 2, y: TOPY + 84, name: '병렬부(R₂·R₃) 양단', leads: [[m.xs[0], TOPY], [m.xs[0], BOTY]] });
      out.push(vs);
    }
    return out;
  }
  const modeKey = { series: 's', parallel: 'p', mixed: 'm' };
  const spotKey = (mode, id) => modeKey[mode] + id;
  // 기록은 회로 조건(R₂ 값, 스위치 조합)마다 따로 쌓아요
  const cfgKey = (mode) => (mode === 'series' ? String(S.r2) : mode === 'parallel' ? S.sw.map(Number).join('') : 'm');
  const curRecs = (mode) => { const r = S.rec[mode], k = cfgKey(mode); return r[k] || (r[k] = {}); };
  const hasRec = (mode, id, key) => { const r = S.rec[mode][key == null ? cfgKey(mode) : key]; return !!(r && r[id]); };
  function resetDial() { const d = S.dial; d.spot = null; d.val = 0; d.needle.target = 0; d.needle.value = 0; d.needle.velocity = 0; }

  function measure(spot) {
    const mode = S.mode; if (!(mode in S.rec)) return;
    if (S.gate === 'predict') return;
    const tv = valsOf(mode)[spot.id], nz = NZ[spotKey(mode, spot.id)] || 0;
    const val = tv * (1 + nz / 100);
    curRecs(mode)[spot.id] = { val, tv, nz };
    const d = S.dial; d.type = spot.type; d.spot = spot.id; d.val = val;
    d.full = spot.type === 'A' ? AMAX[mode] : VMAXD;
    d.needle.target = clamp(val / d.full, 0, 1.0);
    S.flashSpot = spot.id; S.flashT = S.t;
    Sound.click();
    parts.burst(spot.x, spot.y, { count: 6, speed: 70, size: 2.6, colors: ['#ffb400', '#14a058'], gravity: 0 });
    updateCtl();
  }
  function hitSpot(p) {
    if (!(S.mode in S.rec) || S.gate === 'predict') return null;
    let best = null, bd = 22;
    spotsOf(S.mode).forEach((s) => { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; best = s; } });
    return best;
  }
  function swHit(p) {
    if (S.mode !== 'parallel' || S.gate === 'rule2') return -1;
    for (let k = 0; k < 3; k++) if (Math.hypot(p.x - G.p.xs[k], p.y - SWY) < 22) return k;
    return -1;
  }
  function toggleSw(k) {
    S.sw[k] = !S.sw[k]; S.swUsed = true; resetDial(); Sound.click(); updateCtl();
  }
  SciSim.pointer(view, {
    down(p) {
      const k = swHit(p); if (k >= 0) { toggleSw(k); return false; }
      const s = hitSpot(p); if (s) { measure(s); return false; }
      return false;
    },
    move() {}, up() {},
    hover(p) { return swHit(p) >= 0 || hitSpot(p) ? 'pointer' : 'default'; },
  });
  $$('#r2Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const v = +b.dataset.v; if (v !== S.r2) { S.r2 = v; resetDial(); S.fade = 0.3; } updateCtl(); }));
  $$('#swChips button').forEach((b) => b.addEventListener('click', () => toggleSw(+b.dataset.v)));

  /* ---- 전하 점 (전류의 크기 = 점이 움직이는 빠르기) ---- */
  function segsOf(mode) {
    const out = [];
    if (mode === 'series') {
      const v = seriesVals(S.r2), s = G.s;
      out.push({ k: 's0', I: v.A1, pts: [[BL, BATT], [BL, TOPY], [s.xr, TOPY], [s.xr, BOTY], [BL, BOTY], [BL, BATB]] });
    } else if (mode === 'parallel') {
      const v = parallelVals(S.sw), x = G.p.xs;
      out.push({ k: 'p0', I: v.It, pts: [[BL, BATT], [BL, TOPY], [x[0], TOPY]] });
      out.push({ k: 'p1', I: v.Ik[1] + v.Ik[2], pts: [[x[0], TOPY], [x[1], TOPY]] });
      out.push({ k: 'p2', I: v.Ik[2], pts: [[x[1], TOPY], [x[2], TOPY]] });
      [0, 1, 2].forEach((k) => out.push({ k: 'pb' + k, I: v.Ik[k], pts: [[x[k], TOPY], [x[k], BOTY]] }));
      out.push({ k: 'p3', I: v.Ik[2], pts: [[x[2], BOTY], [x[1], BOTY]] });
      out.push({ k: 'p4', I: v.Ik[1] + v.Ik[2], pts: [[x[1], BOTY], [x[0], BOTY]] });
      out.push({ k: 'p5', I: v.It, pts: [[x[0], BOTY], [BL, BOTY], [BL, BATB]] });
    } else {
      const v = mixedVals(), x = G.m.xs;
      out.push({ k: 'm0', I: v.A0, pts: [[BL, BATT], [BL, TOPY], [x[0], TOPY]] });
      out.push({ k: 'm1', I: v.A3, pts: [[x[0], TOPY], [x[1], TOPY]] });
      out.push({ k: 'mb0', I: v.A2, pts: [[x[0], TOPY], [x[0], BOTY]] });
      out.push({ k: 'mb1', I: v.A3, pts: [[x[1], TOPY], [x[1], BOTY]] });
      out.push({ k: 'm2', I: v.A3, pts: [[x[1], BOTY], [x[0], BOTY]] });
      out.push({ k: 'm3', I: v.A0, pts: [[x[0], BOTY], [BL, BOTY], [BL, BATB]] });
    }
    return out;
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
  function stepFlow(segs, dt) {
    segs.forEach((sg) => {
      const L = polyLen(sg.pts), st = S.segs[sg.k] || (S.segs[sg.k] = { off: 0 });
      st.off = (st.off + sg.I * KFLOW * dt) % 24;
    });
  }
  function drawFlow(segs) {
    segs.forEach((sg) => {
      if (sg.I < 1e-6) return;
      const L = polyLen(sg.pts), off = (S.segs[sg.k] || { off: 0 }).off;
      for (let d = off; d < L; d += 24) { const q = polyAt(sg.pts, d); D.sphere(q[0], q[1], 3.7, '#ff9a3c', { gloss: false, outline: 'rgba(120,60,0,.35)', outlineWidth: 1 }); }
    });
  }

  /* ---- 부품 그림 ---- */
  function wires(list) {
    ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    list.forEach((pts) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); });
  }
  function drawBattery() {
    D.shadow(() => { D.roundRect(BL - 19, BATT, 38, BATB - BATT, 8); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 2 });
    T(BL, BATT + 20, '+', 20, '#ffb4ae', 'center', 800); T(BL, BATB - 10, '−', 20, '#a9c4ff', 'center', 800); T(BL, MIDY + 6, VS + ' V', 14, '#fff', 'center', 800);
  }
  function drawRes(x, y, vertical, nm, val, glow) {
    ctx.save(); ctx.translate(x, y); if (vertical) ctx.rotate(Math.PI / 2);
    const h = RLEN / 2;
    ctx.fillStyle = 'rgba(255,255,255,.96)'; D.roundRect(-h + 6, -13, RLEN - 12, 26, 6); ctx.fill();
    ctx.strokeStyle = glow ? '#e2574c' : '#8a5a2c'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    ctx.moveTo(-h, 0); ctx.lineTo(-h + 10, 0);
    for (let i = 0; i < 6; i++) ctx.lineTo(-h + 10 + (i + 0.5) * (RLEN - 20) / 6, i % 2 ? 9 : -9);
    ctx.lineTo(h - 10, 0); ctx.lineTo(h, 0); ctx.stroke();
    ctx.restore();
    if (vertical) { T(x - 16, y - 4, nm, 14, '#26324a', 'right', 800); T(x - 16, y + 14, val, 13, '#5a6679', 'right', 800); }
    else { T(x, y + 32, nm + '  ' + val, 14, '#26324a', 'center', 800); }
  }
  function drawSwitch(x, k, on) {
    const y = SWY;
    ctx.strokeStyle = on ? '#14a058' : '#e2464b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 14);
    if (on) ctx.lineTo(x, y - 14); else ctx.lineTo(x + 13, y - 9);
    ctx.stroke();
    D.sphere(x, y + 14, 4, '#394258', { gloss: false }); D.sphere(x, y - 14, 4, '#394258', { gloss: false });
    T(x - 20, y + 5, on ? '켜짐' : '꺼짐', 11.5, on ? '#14803f' : '#b4231f', 'right', 800);
  }
  function drawSpots(mode) {
    const recs = curRecs(mode);
    spotsOf(mode).forEach((sp) => {
      const sel = S.dial.spot === sp.id, got = !!recs[sp.id];
      if (sel && sp.leads) { ctx.save(); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); sp.leads.forEach((q) => { ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(q[0], q[1]); ctx.stroke(); D.sphere(q[0], q[1], 4, '#14a058', { gloss: false }); }); ctx.restore(); }
      const col = sp.type === 'A' ? '#f2873a' : '#14a058';
      if (!got && S.t > 0.6) D.ring(sp.x, sp.y, 17, S.t + sp.x * 0.01, { color: col, speed: 0.8, width: 1.5 });
      D.shadow(() => D.sphere(sp.x, sp.y, 14, col, { text: sp.type, textScale: 1.05 }), { blur: sel ? 10 : 4, y: sel ? 4 : 2 });
      if (sel) { ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sp.x, sp.y, 18, 0, TAU); ctx.stroke(); }
      if (got) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sp.x + 11, sp.y - 11, 7.5, 0, TAU); ctx.fill(); T(sp.x + 11, sp.y - 6.5, '✓', 11, '#14803f', 'center', 800); }
    });
  }

  /* ---- 계기판 ---- */
  function drawDial(x, y, w, h, vertical) {
    const d = S.dial, col = d.type === 'A' ? '#f2873a' : '#14a058';
    panel(x, y, w, h, 14);
    const hasV = d.spot != null;
    const title = hasV ? TYPE_NAME[d.type] + (d.type === 'A' ? ' (A)' : ' (V)') : '계기';
    D.label(x + 12, y + 22, title, { bg: hasV ? col : '#8a95a6', size: 13, align: 'left' });
    const cxg = vertical ? x + 110 : x + w / 2, cyg = vertical ? y + h - 22 : y + 170, r = vertical ? 76 : 92;
    // 눈금
    const full = hasV ? d.full : 1;
    const th = (f) => Math.PI * (1.12 + 0.76 * f);
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cxg, cyg, r, th(0), th(1)); ctx.stroke();
    for (let i = 0; i <= 10; i++) { const a = th(i / 10), big = i % 5 === 0; ctx.lineWidth = big ? 2.5 : 1.2; ctx.beginPath(); ctx.moveTo(cxg + Math.cos(a) * r, cyg + Math.sin(a) * r); ctx.lineTo(cxg + Math.cos(a) * (r - (big ? 13 : 8)), cyg + Math.sin(a) * (r - (big ? 13 : 8))); ctx.stroke(); }
    [0, 5, 10].forEach((i) => { const a = th(i / 10); T(cxg + Math.cos(a) * (r - 26), cyg + Math.sin(a) * (r - 26) + 4, hasV ? String(+(full * i / 10).toFixed(2)) : '', 12, '#3a465c', 'center', 800); });
    // 바늘
    const a = th(clamp(d.needle.value, 0, 1.05));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cxg, cyg); ctx.lineTo(cxg + Math.cos(a) * (r - 6), cyg + Math.sin(a) * (r - 6)); ctx.stroke(); ctx.restore();
    D.sphere(cxg, cyg, 6, '#394258', { gloss: false });
    // 숫자
    const tx = vertical ? x + w - 14 : cxg, align = vertical ? 'right' : 'center', ty = vertical ? y + 64 : y + h - 56;
    if (hasV) {
      T(tx, ty, d.type === 'A' ? fA(d.val) : fV(d.val), vertical ? 24 : 26, '#26324a', align, 800);
      const nm = (spotsOf(S.mode).find((s) => s.id === d.spot) || {}).name || '';
      T(tx, ty + 24, nm, 13, '#5a6679', align, 800);
    } else {
      T(tx, ty, '측정할 곳을 눌러요', 15, '#8a95a6', align, 800);
      T(tx, ty + 22, 'A = 전류계, V = 전압계', 12.5, '#98a2b3', align, 700);
    }
  }
  function drawTable(x, y, w, h, mode) {
    panel(x, y, w, h, 14);
    const recs = curRecs(mode), sp = spotsOf(mode);
    T(x + 14, y + 24, '측정 기록표 (전류계·전압계가 잰 값)', 13.5, '#26324a', 'left', 800);
    const cols = [sp.filter((s) => s.type === 'A'), sp.filter((s) => s.type === 'V')], cw = (w - 36) / 2;
    const rh = Math.min(30, (h - 70) / Math.max(cols[0].length, cols[1].length));
    cols.forEach((list, c) => {
      const cx0 = x + 14 + c * (cw + 8);
      T(cx0, y + 48, c ? '전압 (V)' : '전류 (A)', 12.5, c ? '#14803f' : '#b45309', 'left', 800);
      ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx0, y + 54); ctx.lineTo(cx0 + cw, y + 54); ctx.stroke();
      list.forEach((s, i) => {
        const yy = y + 58 + i * rh, r = recs[s.id];
        if (S.dial.spot === s.id) { D.roundRect(cx0 - 4, yy, cw + 8, rh - 2, 6); ctx.fillStyle = 'rgba(255,212,71,.28)'; ctx.fill(); }
        T(cx0, yy + rh * 0.66, s.name, PHONE ? 12 : 13.5, '#26324a', 'left', 700);
        T(cx0 + cw, yy + rh * 0.66, r ? (s.type === 'A' ? fA(r.val) : fV(r.val)) : '—', PHONE ? 13 : 14.5, r ? '#26324a' : '#b0b8c6', 'right', 800);
      });
    });
  }
  const colorOfRes = (mode, id) => false;
  function drawCircuitMode(mode) {
    sceneBg();
    const titles = { series: '🔌 직렬연결: 저항이 한 줄로', parallel: '🔀 병렬연결: 저항이 나란히', mixed: '🎯 혼합 회로: 직렬 + 병렬' };
    const subs = { series: '전원 ' + VS + ' V · R₁ ' + R1 + ' Ω · R₂ ' + S.r2 + ' Ω — 계기 단추(A, V)를 눌러 재요', parallel: '전원 ' + VS + ' V · R₁ ' + R1 + ' Ω · R₂ ' + R2 + ' Ω · R₃ ' + R3 + ' Ω — 단추를 눌러 재요', mixed: '전원 ' + VS + ' V · R₁ ' + R1 + ' Ω 직렬 + (R₂ ' + R2 + ' Ω ∥ R₃ ' + R3 + ' Ω)' };
    T(14, 26, titles[mode], PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, subs[mode], PHONE ? 11.5 : 13.5, '#5a6679', 'left', 700);
    const segs = segsOf(mode);
    if (mode === 'series') {
      const s = G.s;
      wires([[[BL, BATT], [BL, TOPY], [s.xr, TOPY], [s.xr, BOTY], [BL, BOTY], [BL, BATB]]]);
      drawFlow(segs); drawBattery();
      drawRes(s.r1x, TOPY, false, 'R₁', R1 + ' Ω'); drawRes(s.xr, MIDY, true, 'R₂', S.r2 + ' Ω');
    } else if (mode === 'parallel') {
      const x = G.p.xs, v = parallelVals(S.sw);
      wires([[[BL, BATT], [BL, TOPY], [x[2], TOPY]], [[x[2], BOTY], [BL, BOTY], [BL, BATB]], ...x.map((xx) => [[xx, TOPY], [xx, BOTY]])]);
      drawFlow(segs); drawBattery();
      [R1, R2, R3].forEach((r, k) => { drawRes(x[k], RC, true, 'R' + ['₁', '₂', '₃'][k], r + ' Ω'); drawSwitch(x[k], k, S.sw[k]); });
    } else {
      const m = G.m, x = m.xs;
      wires([[[BL, BATT], [BL, TOPY], [x[1], TOPY]], [[x[1], BOTY], [BL, BOTY], [BL, BATB]], ...x.map((xx) => [[xx, TOPY], [xx, BOTY]])]);
      drawFlow(segs); drawBattery();
      drawRes(m.r1x, TOPY, false, 'R₁', R1 + ' Ω'); drawRes(x[0], RC, true, 'R₂', R2 + ' Ω'); drawRes(x[1], RC, true, 'R₃', R3 + ' Ω');
    }
    if (S.gate !== 'predict') drawSpots(mode);
    // 계기판과 기록표
    if (PHONE) { drawDial(12, PY, VW - 24, 130, true); }
    else drawDial(CB.x + CB.w + 14, 58, VW - (CB.x + CB.w + 14) - 12, SH - 58 - 8, false);
    const ty = PHONE ? PY + 140 : PY, th = PHONE ? PH - 140 : PH;
    if (mode === 'mixed') drawMixedBottom(12, ty, VW - 24, th); else drawTable(12, ty, VW - 24, th, mode);
    if (mode === 'series' && S.gate !== 'rule1') { /* 직렬 */ }
  }

  /* ================= ③ 합성 저항 (도선 통로 모형) ================= */
  const GATE_OHM = 10;                            // 장애물(문) 하나 = 10 Ω
  const LX1 = BL + 46, LX2 = CB.x + CB.w - 30, LANE_H = 34, LANE_P = 60, LY0 = TOPY + 14;
  function mdLanes() {
    const m = S.md, R = m.n3 ? [R1, R2, R3] : [R1, R2], names = ['R₁', 'R₂', 'R₃'];
    if (m.conn === 'series') {
      const tot = R.reduce((s, r) => s + r, 0), I = VS / tot;
      return { conn: 'series', tot, I, lanes: [{ y: LY0, R: tot, I, parts: R.map((r, i) => ({ n: r / GATE_OHM, name: names[i], r })) }] };
    }
    const lanes = R.map((r, k) => ({ y: LY0 + k * LANE_P, R: r, I: VS / r, parts: [{ n: r / GATE_OHM, name: names[k], r }] }));
    return { conn: 'parallel', tot: para(R), I: lanes.reduce((s, l) => s + l.I, 0), lanes };
  }
  function mdSegs(L) {
    const out = [], ys = L.lanes.map((l) => l.y), n = ys.length;
    if (L.conn === 'series') {
      out.push({ k: 'd0', I: L.I, pts: [[BL, BATT], [BL, ys[0]], [LX1, ys[0]]] });
      out.push({ k: 'd1', I: L.I, pts: [[LX1, ys[0]], [LX2, ys[0]]] });
      out.push({ k: 'd2', I: L.I, pts: [[LX2, ys[0]], [LX2, BOTY], [BL, BOTY], [BL, BATB]] });
      return out;
    }
    out.push({ k: 'd0', I: L.I, pts: [[BL, BATT], [BL, ys[0]], [LX1, ys[0]]] });
    for (let k = 0; k < n; k++) {
      out.push({ k: 'dl' + k, I: L.lanes[k].I, pts: [[LX1, ys[k]], [LX2, ys[k]]] });
      if (k < n - 1) {
        const below = L.lanes.slice(k + 1).reduce((s, l) => s + l.I, 0), upto = L.lanes.slice(0, k + 1).reduce((s, l) => s + l.I, 0);
        out.push({ k: 'dbl' + k, I: below, pts: [[LX1, ys[k]], [LX1, ys[k + 1]]] });
        out.push({ k: 'dbr' + k, I: upto, pts: [[LX2, ys[k]], [LX2, ys[k + 1]]] });
      }
    }
    out.push({ k: 'd2', I: L.I, pts: [[LX2, ys[n - 1]], [LX2, BOTY], [BL, BOTY], [BL, BATB]] });
    return out;
  }
  function mdWires(L) {
    const ys = L.lanes.map((l) => l.y), n = ys.length, w = [[[BL, BATT], [BL, ys[0]], [LX1, ys[0]]], [[LX2, ys[n - 1]], [LX2, BOTY], [BL, BOTY], [BL, BATB]]];
    if (n > 1) { w.push([[LX1, ys[0]], [LX1, ys[n - 1]]]); w.push([[LX2, ys[0]], [LX2, ys[n - 1]]]); }
    return w;
  }
  const mdRec = () => S.md.rec[mdKey(S.md.conn, S.md.n3)];
  function mdMeasure() {
    const m = S.md, L = mdLanes(), key = mdKey(m.conn, m.n3), nz = NZM[key];
    const V = VS * (1 + nz[0] / 100), I = L.I * (1 + nz[1] / 100), Rm = V / I, Rth = L.tot;
    m.rec[key] = { V, I, R: Rm, Rth, err: (Rm - Rth) / Rth * 100, conn: m.conn, n3: m.n3 };
    m.last = key; Sound.success();
    parts.burst(LX2 - 20, MIDY, { count: 10, speed: 100, size: 3, colors: ['#ffb400', '#5a4fcf', '#14a058'], gravity: 80 });
    updateCtl();
  }
  const MD_NAME = { s2: '직렬 R₁ + R₂', s3: '직렬 R₁ + R₂ + R₃', p2: '병렬 R₁ ∥ R₂', p3: '병렬 R₁ ∥ R₂ ∥ R₃' };
  function drawModel() {
    sceneBg();
    const m = S.md, L = mdLanes(), segs = mdSegs(L);
    T(14, 26, '🧩 도선 통로 모형으로 본 합성 저항', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '문(장애물) 하나 = ' + GATE_OHM + ' Ω · 전하가 지나갈 길이 많을수록 전류가 커요', PHONE ? 11.5 : 13.5, '#5a6679', 'left', 700);
    // 통로
    L.lanes.forEach((ln) => {
      D.roundRect(LX1, ln.y - LANE_H / 2, LX2 - LX1, LANE_H, 10); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill(); ctx.strokeStyle = '#c3cbdb'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    wires(mdWires(L));
    drawFlow(segs); drawBattery();
    // 문(장애물): 문 사이의 틈으로 전하가 지나가요
    const laneLen = LX2 - LX1;
    L.lanes.forEach((ln) => {
      if (L.conn === 'series') {
        const nG = ln.parts.reduce((s, p) => s + p.n, 0), nGrp = ln.parts.length, sp = laneLen / (nG + (nGrp - 1) + 2);
        let slot = 1;
        ln.parts.forEach((pt) => {
          const xa = LX1 + (slot + 0.5) * sp, xb = LX1 + (slot + pt.n - 0.5) * sp;
          for (let i = 0; i < pt.n; i++) gate(LX1 + (slot + i + 0.5) * sp, ln.y);
          const by = ln.y + LANE_H / 2 + 8;
          ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xa - 8, by); ctx.lineTo(xb + 8, by); ctx.stroke();
          T((xa + xb) / 2, by + 17, pt.name + ' ' + pt.r + ' Ω', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
          slot += pt.n + 1;
        });
      } else {
        const sp = PHONE ? 22 : 30, n = ln.parts[0].n, x0 = (LX1 + LX2) / 2 - (n - 1) * sp / 2;
        for (let i = 0; i < n; i++) gate(x0 + i * sp, ln.y);
        T(LX1 + 10, ln.y - LANE_H / 2 - 5, ln.parts[0].name + ' ' + ln.parts[0].r + ' Ω', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
        T(LX2 - 10, ln.y - LANE_H / 2 - 5, '전류 ' + fmtN(ln.I, 2) + ' A', PHONE ? 12 : 13.5, '#b45309', 'right', 800);
      }
    });
    if (L.conn === 'series') T(LX2 - 10, L.lanes[0].y - LANE_H / 2 - 5, '전류 ' + fmtN(L.I, 3) + ' A', PHONE ? 12 : 13.5, '#b45309', 'right', 800);
    // 오른쪽 카드 (합성 저항)
    const rec = mdRec();
    const cx0 = PHONE ? 12 : CB.x + CB.w + 14, cy0 = PHONE ? PY : 58, cw = PHONE ? VW - 24 : VW - cx0 - 12, ch = PHONE ? 150 : SH - 58 - 8;
    panel(cx0, cy0, cw, ch, 14);
    T(cx0 + 14, cy0 + 24, (m.conn === 'series' ? '직렬' : '병렬') + ' · 합성 저항', 13.5, '#26324a', 'left', 800);
    T(cx0 + 14, cy0 + 52, '식으로 구한 R', 12.5, '#5a6679', 'left', 700);
    textBlock(cx0 + 14, cy0 + 72, cw - 28, mdFormula(m.conn, m.n3), PHONE ? 13.5 : 14.5, '#5a4fcf', 18, 800);
    T(cx0 + 14, cy0 + 118 - (PHONE ? 8 : 0), '재서 구한 R = V / I', 12.5, '#5a6679', 'left', 700);
    if (rec) {
      T(cx0 + 14, cy0 + 142 - (PHONE ? 8 : 0), fV(rec.V) + ' / ' + fA(rec.I), 13.5, '#26324a', 'left', 800);
      T(cx0 + 14, cy0 + 170 - (PHONE ? 10 : 0), '= ' + fR(rec.R), PHONE ? 18 : 20, '#14803f', 'left', 800);
      T(cx0 + 14, cy0 + 194 - (PHONE ? 6 : 0), '오차 ' + (rec.err >= 0 ? '+' : '−') + fmtN(Math.abs(rec.err), 1) + ' %', 13, '#5a6679', 'left', 800);
    } else T(cx0 + 14, cy0 + 142 - (PHONE ? 8 : 0), '📏 단추를 눌러 재 봐요', 13.5, '#98a2b3', 'left', 800);
    // 아래 표
    drawModelTable(12, PHONE ? PY + 160 : PY, VW - 24, PHONE ? PH - 160 : PH);
  }
  function gate(xc, y) {
    ctx.fillStyle = '#8a5a2c';
    D.roundRect(xc - 3.5, y - LANE_H / 2 + 2, 7, 12, 2); ctx.fill();
    D.roundRect(xc - 3.5, y + LANE_H / 2 - 14, 7, 12, 2); ctx.fill();
  }
  function drawModelTable(x, y, w, h) {
    panel(x, y, w, h, 14);
    T(x + 14, y + 24, '합성 저항 기록 (R = V / I로 구한 값과 식의 값 비교)', 13.5, '#26324a', 'left', 800);
    const cols = PHONE ? [0, 0.40, 0.58, 0.76] : [0, 0.31, 0.45, 0.60, 0.76, 0.90];
    const heads = PHONE ? ['연결', 'V / I', '식', '오차'] : ['연결', '전체 전압', '전체 전류', 'R = V / I', '식으로 구한 R', '오차'];
    const hy = y + 52, rh = PHONE ? 30 : 32, ww = w - 28;
    heads.forEach((hd, i) => T(x + 14 + ww * cols[i], hy, hd, 12.5, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, hy + 7); ctx.lineTo(x + w - 10, hy + 7); ctx.stroke();
    ['s2', 's3', 'p2', 'p3'].forEach((k, i) => {
      const r = S.md.rec[k], yy = hy + 14 + i * rh, mid = yy + rh * 0.62;
      if (S.md.last === k) { D.roundRect(x + 8, yy, w - 16, rh - 2, 6); ctx.fillStyle = 'rgba(255,212,71,.28)'; ctx.fill(); }
      T(x + 14 + ww * cols[0], mid, MD_NAME[k], PHONE ? 11.5 : 13.5, '#26324a', 'left', 800);
      if (!r) { T(x + 14 + ww * (PHONE ? cols[1] : cols[3]), mid, '—', 13, '#b0b8c6', 'left', 800); return; }
      const cell = PHONE ? [null, fmtN(r.R, 1) + ' Ω', fmtN(r.Rth, 1) + ' Ω', (r.err >= 0 ? '+' : '−') + fmtN(Math.abs(r.err), 1) + '%'] : [null, fV(r.V), fA(r.I), fmtN(r.R, 1) + ' Ω', fmtN(r.Rth, 1) + ' Ω', (r.err >= 0 ? '+' : '−') + fmtN(Math.abs(r.err), 1) + ' %'];
      cell.forEach((c, j) => { if (c != null) T(x + 14 + ww * cols[j], mid, c, PHONE ? 13 : 14, '#26324a', 'left', 800); });
    });
  }
  $$('#connSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.md.conn = b.dataset.v; S.fade = 0.4; updateCtl(); }));
  $$('#n3Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.md.n3 = +b.dataset.v === 1; S.fade = 0.4; updateCtl(); }));
  $('#bMeasure').addEventListener('click', mdMeasure);
  $('#bMClear').addEventListener('click', () => { Sound.click(); S.md.rec = {}; S.md.last = null; });

  /* ================= ④ 혼합 회로 예측 ================= */
  const PRED = [
    { id: 'pR', key: 'R', name: '전체 저항', unit: 'Ω', ans: MIX.Rt, dec: 1 },
    { id: 'pI', key: 'I', name: '전체 전류', unit: 'A', ans: MIX.I, dec: 3 },
    { id: 'pV', key: 'V', name: 'R₁ 양단 전압', unit: 'V', ans: MIX.V1, dec: 2 },
    { id: 'pJ', key: 'J', name: 'R₂ 가지 전류', unit: 'A', ans: MIX.I2, dec: 3 },
  ];
  const parseNum = (s) => { const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  function checkPred() {
    const vals = PRED.map((p) => parseNum($('#' + p.id).value));
    if (vals.some((v) => isNaN(v))) { PRED.forEach((p, i) => { if (isNaN(vals[i])) $('#' + p.id).classList.add('bad'); }); return '네 칸을 모두 숫자로 써 주세요.'; }
    let bad = 0;
    PRED.forEach((p, i) => {
      const el = $('#' + p.id), ok = Math.abs(vals[i] - p.ans) <= TOL * p.ans;
      if (!ok) { bad++; if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } } else { el.classList.remove('bad'); el.classList.add('ok'); }
    });
    if (bad) return '빨간 칸을 다시 계산해 보세요. 아래 풀이 순서 카드의 차례대로 풀면 돼요.';
    S.pred = { R: vals[0], I: vals[1], V: vals[2], J: vals[3] }; return true;
  }
  function resetPred() { PRED.forEach((p) => { const el = $('#' + p.id); el.value = ''; el.classList.remove('ok', 'bad'); }); S.pred = null; }
  PRED.forEach((p) => $('#' + p.id).addEventListener('input', () => { $('#' + p.id).classList.remove('ok', 'bad'); }));
  function drawMixedBottom(x, y, w, h) {
    if (!S.pred) {
      panel(x, y, w, h, 14);
      T(x + 14, y + 24, '풀이 순서 카드 (이 순서대로 풀어 보세요)', 13.5, '#26324a', 'left', 800);
      const cards = [['① 병렬부 합성', 'R₂와 R₃이 나란히 연결된 부분을 저항 한 개로 바꿔요'], ['② 전체 저항', '직렬로 이어진 R₁과 병렬부의 합성 저항을 더해요'], ['③ 전체 전류', '전원 전압 / 전체 저항 (옴의 법칙)'], ['④ 전압과 전류 나누기', 'R₁ 전압 = 전류 × R₁, 병렬부 전압 = 나머지, 가지 전류 = 병렬부 전압 / 저항']];
      const cols = PHONE ? 2 : 4, cw = (w - 28 - (cols - 1) * 8) / cols, chh = PHONE ? (h - 50 - 8) / 2 : h - 50;
      cards.forEach((c, i) => {
        const cx0 = x + 14 + (i % cols) * (cw + 8), cy0 = y + 40 + Math.floor(i / cols) * (chh + 8);
        D.roundRect(cx0, cy0, cw, chh, 10); ctx.fillStyle = '#f5f7fb'; ctx.fill(); ctx.strokeStyle = '#d6dcea'; ctx.lineWidth = 1.5; ctx.stroke();
        T(cx0 + 10, cy0 + 22, c[0], PHONE ? 12.5 : 14, '#5a4fcf', 'left', 800);
        textBlock(cx0 + 10, cy0 + 44, cw - 20, c[1], PHONE ? 12 : 13, '#26324a', PHONE ? 15 : 17, 700);
      });
      return;
    }
    panel(x, y, w, h, 14);
    T(x + 14, y + 24, '예측 – 측정 비교표', 13.5, '#26324a', 'left', 800);
    const cols = [0, 0.34, 0.54, 0.74, 0.88], heads = ['구분', '내 예측', '측정값', '오차', ''];
    const hy = y + 52, rh = PHONE ? 34 : 36, ww = w - 28;
    heads.forEach((hd, i) => T(x + 14 + ww * cols[i], hy, hd, 12.5, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, hy + 7); ctx.lineTo(x + w - 10, hy + 7); ctx.stroke();
    const meas = mixedMeasured();
    PRED.forEach((p, i) => {
      const yy = hy + 14 + i * rh, mid = yy + rh * 0.62, pv = S.pred[p.key], mv = meas[p.key];
      T(x + 14 + ww * cols[0], mid, p.name, PHONE ? 12.5 : 14, '#26324a', 'left', 800);
      T(x + 14 + ww * cols[1], mid, fmtN(pv, p.dec) + ' ' + p.unit, PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      if (mv == null) { T(x + 14 + ww * cols[2], mid, '— (재 보세요)', PHONE ? 12 : 13, '#b0b8c6', 'left', 800); return; }
      const err = (mv - pv) / pv * 100;
      T(x + 14 + ww * cols[2], mid, fmtN(mv, p.dec) + ' ' + p.unit, PHONE ? 13 : 14.5, '#14803f', 'left', 800);
      T(x + 14 + ww * cols[3], mid, (err >= 0 ? '+' : '−') + fmtN(Math.abs(err), 1) + ' %', PHONE ? 13 : 14.5, '#5a6679', 'left', 800);
    });
  }
  function mixedMeasured() {
    const m = curRecs('mixed'), o = { R: null, I: null, V: null, J: null };
    if (m.A0) o.I = m.A0.val; if (m.V1) o.V = m.V1.val; if (m.A2) o.J = m.A2.val;
    if (m.A0 && m.VS) o.R = m.VS.val / m.A0.val;
    return o;
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function lastMeasured() {
    const d = S.dial; if (d.spot == null || !(S.mode in S.rec)) return '—';
    const nm = (spotsOf(S.mode).find((s) => s.id === d.spot) || {}).name || '';
    return nm + ' ' + (d.type === 'A' ? fA(d.val) : fV(d.val));
  }
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'series') {
      L1 = '전원 전압'; a = VS + ' V'; L2 = '저항 R₁ · R₂'; b = R1 + ' Ω · ' + S.r2 + ' Ω (직렬)'; L3 = '마지막 측정'; c = lastMeasured();
    } else if (S.mode === 'parallel') {
      const on = ['R₁', 'R₂', 'R₃'].filter((n, k) => S.sw[k]);
      L1 = '전원 전압'; a = VS + ' V'; L2 = '연결된 가지'; b = on.length ? on.join(', ') + ' (' + on.length + '개)' : '없음'; L3 = '마지막 측정'; c = lastMeasured();
    } else if (S.mode === 'model') {
      const m = S.md, r = mdRec(), L = mdLanes();
      L1 = '연결 방법'; a = (m.conn === 'series' ? '직렬' : '병렬') + (m.n3 ? ' · 저항 3개' : ' · 저항 2개');
      L2 = '재서 구한 R = V / I'; b = r ? fR(r.R) : '—'; L3 = '식으로 구한 R'; c = fR(L.tot);
    } else {
      const got = ['A0', 'VS', 'V1', 'A2'].filter((id) => curRecs('mixed')[id]).length;
      L1 = '전원 전압'; a = VS + ' V'; L2 = '측정한 곳 (예측 확인용)'; b = got + ' / 4'; L3 = '마지막 측정'; c = lastMeasured();
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const sv30 = seriesVals(R2S[0]), sv60 = seriesVals(R2S[1]);
  const hasS = (id) => hasRec('series', id, String(R2S[0]));
  const hasP = (id, key) => hasRec('parallel', id, key);
  const KEY_P = '110', KEY_P3 = '111';
  const mdOK = (k) => { const r = S.md.rec[k]; return !!r && Math.abs(r.err) <= TOL * 100; };
  const pv = parallelVals([true, true, false]);
  const levels = [
    {
      title: '직렬 측정: 전류는 같고 전압은 나뉜다', short: '직렬 측정', icon: '🔌', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 저항을 하나 더 연결하면 회로 전체의 저항은 커질까, 작아질까? 연결 방법에 따라 달라질까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 옴의 법칙 V = IR과 직렬·병렬연결의 특징(전류의 세기, 전구의 밝기)을 배웠어요. 이제 전류계와 전압계로 값을 직접 재서 <b>숫자로</b> 확인해요.</div>' +
        '<p>전원 ' + VS + ' V에 저항 R₁ = ' + R1 + ' Ω과 R₂ = ' + R2S[0] + ' Ω을 <b>한 줄로</b>(직렬) 연결했어요. 회로 그림의 <b>A</b>(전류계) · <b>V</b>(전압계) 단추를 누르면 그곳에서 잰 값이 기록표에 쌓여요. 측정값에는 ±1 % 정도의 오차가 있어요.</p>',
      features: ['series'],
      setup() { S.gate = ''; S.r2 = R2S[0]; S.rec.series = {}; resetSelects(ruleSel1, S.rule1, S.ruleOK1); setScene('series'); resetDial(); updateCtl(); },
      recap: '직렬연결에서는 전류가 어디서나 같고, 각 저항에 걸리는 전압의 합이 전원 전압과 같아요. 저항이 큰 쪽에 더 큰 전압이 걸려요.',
      summary: '<ul><li>직렬연결: 전류가 <b>어디서나 같아요</b> (I = I₁ = I₂). 전원 ' + VS + ' V, R₁ ' + R1 + ' Ω, R₂ ' + R2S[0] + ' Ω에서 ' + fmtN(sv30.A1, 2) + ' A예요.</li><li>전압은 저항에 비례해 <b>나뉘고</b> 합은 전원 전압과 같아요 (V = V₁ + V₂). ' + fmtN(sv30.V1, 1) + ' V + ' + fmtN(sv30.V2, 1) + ' V = ' + VS + ' V</li><li>저항이 <b>큰</b> 쪽에 더 큰 전압이 걸려요. R₂를 ' + R2S[1] + ' Ω으로 바꾸면 R₂ 양단 전압이 ' + fmtN(sv60.V2, 1) + ' V가 돼요.</li></ul>',
      missions: [
        {
          title: '전류 3곳 · 전압 3곳 재기',
          goal: '회로 그림의 <b>A</b> 단추 세 개(전류)와 <b>V</b> 단추 세 개(R₁ · R₂ · 전원)를 눌러 모두 측정하세요.',
          hint: '주황색 A 세 개와 초록색 V 세 개를 차례로 눌러요. R₂는 ' + R2S[0] + ' Ω으로 두세요.',
          setup() { S.gate = ''; S.r2 = R2S[0]; setScene('series'); updateCtl(); },
          check: () => ['A1', 'A2', 'A3', 'V1', 'V2', 'VS'].every(hasS),
          hold: 0.6,
          status: () => mark(hasS('A1')) + ' 전류 ① &nbsp; ' + mark(hasS('A2')) + ' ② &nbsp; ' + mark(hasS('A3')) + ' ③ &nbsp; ' + mark(hasS('V1')) + ' R₁ 전압 &nbsp; ' + mark(hasS('V2')) + ' R₂ 전압 &nbsp; ' + mark(hasS('VS')) + ' 전원 전압',
          explain: '세 곳에서 잰 전류가 모두 <b>약 ' + fmtN(sv30.A1, 2) + ' A</b>로 같아요(오차 범위 안). 전압은 R₁ <b>약 ' + fmtN(sv30.V1, 1) + ' V</b>, R₂ <b>약 ' + fmtN(sv30.V2, 1) + ' V</b>로 나뉘고 합이 전원 ' + VS + ' V예요. 저항의 비 ' + R1 + ' : ' + R2S[0] + '와 전압의 비가 같아요.',
        },
        {
          title: '규칙 문장 완성하기', manual: true,
          goal: '기록표를 보고 세 문장의 빈칸을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '전류 ①②③의 값을 비교하고, R₁ 전압 + R₂ 전압이 전원 전압과 같은지 더해 보세요. R₁과 R₂ 중 어느 쪽 전압이 더 큰가요?',
          setup() { S.gate = 'rule1'; resetSelects(ruleSel1, S.rule1, S.ruleOK1); setScene('series'); updateCtl(); },
          check: () => checkSelects(RULES1, S.rule1, S.ruleOK1, ruleSel1, '빨간 칸을 다시 골라 보세요. 기록표의 전류와 전압 값을 비교해 보세요.'),
          status: () => '고른 문장 ' + RULES1.filter((r, i) => S.rule1[i]).length + ' / ' + RULES1.length,
          explain: '직렬에서는 전류가 <b>어디서나 같고</b>, 전압은 나뉘어 <b>합이 전원 전압</b>이 돼요. 저항이 더 큰 R₂(' + R2S[0] + ' Ω)에 더 큰 전압(' + fmtN(sv30.V2, 1) + ' V)이 걸려요.',
        },
        {
          type: 'quiz', title: 'R₂를 더 큰 저항으로 바꾸면?',
          goal: '<b>R₂ 버튼</b>으로 ' + R2S[0] + ' Ω을 ' + R2S[1] + ' Ω으로 바꾸면 R₂ 양단에 걸리는 전압은 어떻게 될까요?',
          setup() { S.gate = ''; S.r2 = R2S[0]; setScene('series'); updateCtl(); },
          choices: ['커져요', '작아져요', '변하지 않아요', '0이 돼요'],
          answer: 0,
          feedback: ['', '직렬에서는 저항이 큰 쪽에 더 큰 전압이 걸려요. R₂ 버튼을 눌러 R₂의 V 단추로 직접 재 보세요.', '전류가 줄어도 R₂의 비율이 커져서 R₂에 걸리는 전압은 변해요. 직접 재 보세요.', '전류는 흐르고 있어요. R₂ 양단 전압이 0이 될 수 없어요.'],
          explain: 'R₂가 커지면 전체 저항이 커져 전류는 ' + fmtN(sv30.A1, 2) + ' A에서 ' + fmtN(sv60.A1, 2) + ' A로 줄지만, R₂가 전압을 더 많이 나눠 가져 R₂ 양단 전압은 <b>' + fmtN(sv30.V2, 1) + ' V → ' + fmtN(sv60.V2, 1) + ' V</b>로 커져요. 직렬에서는 저항이 클수록 전압을 더 많이 받아요.',
        },
      ],
    },
    {
      title: '병렬 측정: 전압은 같고 전류는 나뉜다', short: '병렬 측정', icon: '🔀', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 직렬연결은 전류가 같고 전압이 나뉘는 것을 확인했어요. 이번에는 저항을 <b>나란히</b>(병렬) 연결해 같은 방법으로 재 봐요.</div>' +
        '<p>전원 ' + VS + ' V에 R₁ = ' + R1 + ' Ω, R₂ = ' + R2 + ' Ω을 병렬로 연결했어요. 가지마다 <b>스위치</b>가 있어서 R₃ = ' + R3 + ' Ω 가지를 켜면 저항을 <b>하나 더</b> 연결할 수 있어요. 전체 전류 I와 가지 전류 I₁, I₂, 각 저항의 전압을 재 봐요.</p>',
      features: ['parallel'],
      setup() { S.gate = ''; S.sw = [true, true, false]; S.rec.parallel = {}; resetSelects(ruleSel2, S.rule2, S.ruleOK2); setScene('parallel'); resetDial(); updateCtl(); },
      recap: '병렬연결에서는 각 저항에 걸리는 전압이 전원 전압과 같고, 가지 전류의 합이 전체 전류예요. 저항을 하나 더 연결하면 전체 전류가 늘어요.',
      summary: '<ul><li>병렬연결: 각 저항에 걸리는 전압이 <b>모두 같아요</b> (V = V₁ = V₂ = ' + VS + ' V).</li><li>전류는 가지로 <b>나뉘고</b> 합이 전체 전류예요 (I = I₁ + I₂). ' + fmtN(pv.A1, 2) + ' A + ' + fmtN(pv.A2, 2) + ' A = ' + fmtN(pv.It, 2) + ' A</li><li>저항이 <b>작은</b> 가지에 더 큰 전류가 흘러요.</li><li>저항을 병렬로 <b>하나 더</b> 연결하면 전체 전류가 늘어요. 한 가지를 끊어도 다른 가지의 전류는 그대로예요.</li></ul>',
      missions: [
        {
          title: '전류 · 전압 재고 R₃ 켜 보기',
          goal: 'R₁ · R₂ 가지에서 전체 전류 I, 가지 전류 I₁ · I₂, 전압 V₁ · V₂를 재고, <b>R₃ 가지를 켠 뒤</b> 전체 전류도 재 보세요.',
          hint: '먼저 R₃ 스위치는 꺼 둔 채 A 단추 셋(I, I₁, I₂)과 V 단추 둘(R₁, R₂)을 눌러요. 그 다음 R₃ 가지를 켜고 전체 전류 A 단추를 한 번 더 눌러요.',
          setup() { S.gate = ''; S.sw = [true, true, false]; setScene('parallel'); updateCtl(); },
          check: () => ['A0', 'A1', 'A2', 'V1', 'V2'].every((id) => hasP(id, KEY_P)) && hasP('A0', KEY_P3),
          hold: 0.6,
          status: () => mark(hasP('A0', KEY_P)) + ' 전체 I &nbsp; ' + mark(hasP('A1', KEY_P)) + ' I₁ &nbsp; ' + mark(hasP('A2', KEY_P)) + ' I₂ &nbsp; ' + mark(hasP('V1', KEY_P)) + ' V₁ &nbsp; ' + mark(hasP('V2', KEY_P)) + ' V₂ &nbsp; ' + mark(hasP('A0', KEY_P3)) + ' R₃ 켠 뒤 전체 I',
          explain: '두 저항 모두 전압이 전원과 같은 <b>' + VS + ' V</b>이고, 전류는 I₁ <b>약 ' + fmtN(pv.A1, 2) + ' A</b>, I₂ <b>약 ' + fmtN(pv.A2, 2) + ' A</b>로 나뉘어 합이 전체 전류 <b>약 ' + fmtN(pv.It, 2) + ' A</b>예요. R₃ 가지를 켜면 전체 전류가 <b>' + fmtN(parallelVals([true, true, true]).It, 2) + ' A</b>로 늘어요.',
        },
        {
          title: '규칙 문장 완성하기', manual: true,
          goal: '기록표를 보고 네 문장의 빈칸을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '전압 V₁, V₂를 비교하고, I₁ + I₂가 전체 전류와 같은지 더해 보세요. 어느 쪽 저항 가지에 전류가 더 많이 흘렀나요? R₃을 켠 뒤 전체 전류는 어떻게 변했나요?',
          setup() { S.gate = 'rule2'; resetSelects(ruleSel2, S.rule2, S.ruleOK2); setScene('parallel'); updateCtl(); },
          check: () => checkSelects(RULES2, S.rule2, S.ruleOK2, ruleSel2, '빨간 칸을 다시 골라 보세요. 기록표의 전압과 전류를 비교해 보세요.'),
          status: () => '고른 문장 ' + RULES2.filter((r, i) => S.rule2[i]).length + ' / ' + RULES2.length,
          explain: '병렬에서는 <b>전압이 같고</b>, <b>전류는 나뉘어</b> 합이 전체 전류예요. 저항이 작은 R₁ 가지(' + fmtN(pv.A1, 2) + ' A)에 더 큰 전류가 흐르고, 저항을 하나 더 연결하면 길이 늘어나 <b>전체 전류가 커져요</b>.',
        },
        {
          type: 'quiz', title: '가지를 하나 끊어도 다른 가지는?',
          goal: '병렬 회로에서 스위치로 가지 하나를 끊어도 <b>다른 가지의 전류는 그대로</b>인 까닭은?',
          setup() { S.gate = ''; S.sw = [true, true, true]; setScene('parallel'); updateCtl(); },
          choices: ['각 가지에 전원 전압이 그대로 걸려 있어서', '끊어진 가지의 전류가 다른 가지로 옮겨 가서', '전원이 전압을 자동으로 높여 주어서', '다른 가지의 저항이 저절로 작아져서'],
          answer: 0,
          feedback: ['', '끊어진 가지의 전류는 사라질 뿐, 다른 가지로 옮겨 가지 않아요. 전체 전류만 줄어요.', '전원 전압은 ' + VS + ' V로 일정해요. 스위치를 꺼 가며 V 단추로 재 보세요.', '저항은 연결과 상관없이 그대로예요. 전압과 전류의 관계(I = V ÷ R)를 떠올려 보세요.'],
          explain: '병렬에서는 각 가지에 <b>전원 전압 ' + VS + ' V</b>가 그대로 걸려요. 그래서 각 가지의 전류 I = V ÷ R은 다른 가지와 상관없이 일정하고, 가지를 끊으면 <b>전체 전류만 줄어요</b>. 집의 전기 기구를 병렬로 연결하는 까닭이에요.',
        },
      ],
    },
    {
      title: '합성 저항: 한 개의 저항으로 바꾸면?', short: '합성 저항', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 직렬은 전압을 나누고 병렬은 전류를 나누는 것을 재 봤어요. 그렇다면 회로 전체를 <b>저항 한 개</b>로 바꾸면 몇 Ω일까요?</div>' +
        '<p>전체 전압 V와 전체 전류 I를 재면 합성 저항 R = V ÷ I를 구할 수 있어요. <b>도선 통로 모형</b>에서는 문(장애물) 하나가 ' + GATE_OHM + ' Ω이에요. 직렬은 통로가 <b>길어지고</b>, 병렬은 통로가 <b>나란히 늘어요</b>. 실험값을 식과 비교해 봐요.</p>',
      features: ['model'],
      setup() { S.gate = ''; S.md = { conn: 'series', n3: false, rec: {}, last: null }; setScene('model'); updateCtl(); },
      recap: '직렬의 합성 저항은 R = R₁ + R₂로 커지고, 병렬의 합성 저항은 1/R = 1/R₁ + 1/R₂로 가장 작은 저항보다도 작아져요.',
      summary: '<ul><li>합성 저항은 회로 전체를 저항 한 개로 바꾼 값이에요. <b>R = V ÷ I</b></li><li><b>직렬</b>: R = R₁ + R₂ (통로가 길어져 커져요). ' + R1 + ' + ' + R2 + ' = ' + fmtN(mdRes('series', false), 0) + ' Ω</li><li><b>병렬</b>: 1/R = 1/R₁ + 1/R₂ (통로가 늘어 작아져요). ' + R1 + ' Ω과 ' + R2 + ' Ω의 병렬은 ' + fmtN(mdRes('parallel', false), 0) + ' Ω으로 <b>가장 작은 저항(' + R1 + ' Ω)보다 작아요</b>.</li><li>같은 저항 n개를 병렬로 연결하면 R의 n분의 1이 돼요.</li><li>병렬로 저항을 <b>하나 더</b> 연결하면 합성 저항은 더 <b>작아져요</b> (R₃ 추가: ' + fmtN(mdRes('parallel', true), 0) + ' Ω).</li></ul>',
      missions: [
        {
          title: '세 가지 합성 저항 재서 비교하기',
          goal: '<b>직렬(R₁ + R₂)</b>, <b>병렬(R₁ ∥ R₂)</b>, <b>병렬에 R₃ 추가</b>를 각각 📏 재서 기록하고, 식으로 구한 값과 비교하세요.',
          hint: '연결 방법과 R₃ 추가 여부를 고르고 📏 단추를 눌러요. 직렬(R₃ 없이), 병렬(R₃ 없이), 병렬(R₃ 추가) 세 번 기록해요.',
          setup() { S.gate = ''; setScene('model'); updateCtl(); },
          check: () => mdOK('s2') && mdOK('p2') && mdOK('p3'),
          hold: 0.6,
          status: () => mark(mdOK('s2')) + ' 직렬 ' + fmtN(mdRes('series', false), 0) + ' Ω &nbsp; ' + mark(mdOK('p2')) + ' 병렬 ' + fmtN(mdRes('parallel', false), 0) + ' Ω &nbsp; ' + mark(mdOK('p3')) + ' 병렬 + R₃ ' + fmtN(mdRes('parallel', true), 0) + ' Ω' + (mdOK('p2') ? ' &nbsp; (병렬 ' + fmtN(S.md.rec.p2.R, 1) + ' Ω &lt; R₁ ' + R1 + ' Ω)' : ''),
          explain: '직렬은 <b>' + R1 + ' + ' + R2 + ' = ' + fmtN(mdRes('series', false), 0) + ' Ω</b>, 병렬은 1/R = 1/' + R1 + ' + 1/' + R2 + '에서 <b>' + fmtN(mdRes('parallel', false), 0) + ' Ω</b>, R₃을 더하면 <b>' + fmtN(mdRes('parallel', true), 0) + ' Ω</b>예요. V ÷ I로 잰 값이 식의 값과 오차 ±1 % 안에서 같아요. 병렬 합성 저항은 가장 작은 저항(' + R1 + ' Ω)보다도 작고, 저항을 더 연결할수록 더 작아져요.',
        },
        {
          type: 'quiz', title: '병렬로 저항을 하나 더 연결하면?',
          goal: '병렬로 연결된 회로에 저항을 <b>하나 더</b> 병렬로 연결하면 회로 전체의 합성 저항은 어떻게 될까요?',
          setup() { S.gate = ''; setScene('model'); updateCtl(); },
          choices: ['커진다. 방해하는 저항이 하나 더 늘어나므로', '작아진다. 전류가 지나갈 길이 하나 더 늘어나므로', '변하지 않는다', '추가한 저항 값에 따라 커질 수도 있다'],
          answer: 1,
          feedback: ['직렬이라면 커지지만 병렬은 길이 늘어나요. 병렬 R₃ 추가 기록의 합성 저항(' + fmtN(mdRes('parallel', true), 0) + ' Ω)이 ' + fmtN(mdRes('parallel', false), 0) + ' Ω보다 어떤가요?', '', '병렬 R₃ 추가 기록에서 합성 저항이 바뀌었는지 비교해 보세요.', '아무리 큰 저항을 병렬로 추가해도 전류가 지나갈 길은 늘어나서 합성 저항은 줄어들어요.'],
          explain: '병렬로 저항을 연결하면 전류가 지날 <b>길이 늘어</b> 전체 저항은 오히려 <b>작아져요</b>(' + fmtN(mdRes('parallel', false), 0) + ' Ω → ' + fmtN(mdRes('parallel', true), 0) + ' Ω). 큰 저항을 추가해도 마찬가지예요. 직렬은 통로가 길어져 커지고, 병렬은 통로가 늘어 작아져요.',
        },
      ],
    },
    {
      title: '회로 예측: 직렬 + 병렬 혼합', short: '예측', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 직렬은 저항을 더하고(R₁ + R₂), 병렬은 1/R을 더한다는 것을 알았어요. 둘이 섞인 회로도 <b>단계별로</b> 풀 수 있어요.</div>' +
        '<p>R₁ = ' + R1 + ' Ω을 직렬로, R₂ = ' + R2 + ' Ω과 R₃ = ' + R3 + ' Ω을 병렬로 연결했어요(전원 ' + VS + ' V). 아래 <b>풀이 순서 카드</b>를 따라 전체 저항, 전체 전류, R₁ 양단 전압, R₂ 가지 전류를 <b>먼저 예측</b>한 뒤, 계기로 재서 확인하고 오차를 따져 봐요.</p>',
      features: ['mixed'],
      setup() { S.gate = 'predict'; S.rec.mixed = {}; resetPred(); setScene('mixed'); resetDial(); updateCtl(); },
      recap: '혼합 회로는 병렬부를 먼저 합성하고, 직렬로 더해 전체 저항을 구한 뒤, 전류와 전압 분배를 차례로 구하면 돼요. 실제 측정값은 오차 범위 안에서 예측과 같아요.',
      summary: '<ul><li>풀이 순서: ① 병렬부 합성 (R₂ ∥ R₃ = ' + fmtN(MIX.Rp, 0) + ' Ω) → ② 전체 저항 (R₁ + 병렬부 = ' + fmtN(MIX.Rt, 0) + ' Ω) → ③ 전체 전류 (I = ' + VS + ' ÷ ' + fmtN(MIX.Rt, 0) + ' = ' + fmtN(MIX.I, 2) + ' A) → ④ 전압·전류 나누기</li><li>R₁ 양단 전압 ' + fmtN(MIX.V1, 0) + ' V, 병렬부 전압 ' + fmtN(MIX.VP, 0) + ' V (합 ' + VS + ' V)</li><li>가지 전류 I₂ = ' + fmtN(MIX.I2, 2) + ' A, I₃ = ' + fmtN(MIX.I3, 2) + ' A (합 = 전체 전류)</li><li>예측과 측정의 차이(오차)는 계기의 ±1 % 정도 오차 때문이에요.</li></ul>',
      missions: [
        {
          title: '풀이 순서대로 예측하기', manual: true,
          goal: '카드의 순서대로 풀어 <b>전체 저항 · 전체 전류 · R₁ 양단 전압 · R₂ 가지 전류</b>를 쓰고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '① R₂ ∥ R₃의 합성 저항을 구해요. ② 거기에 R₁을 더해요. ③ 전원 전압 ÷ 전체 저항. ④ R₁ 전압 = 전류 × R₁, 병렬부 전압 = 전원 − R₁ 전압, R₂ 전류 = 병렬부 전압 ÷ R₂.',
          setup() { S.gate = 'predict'; setScene('mixed'); resetPred(); S.rec.mixed = {}; resetDial(); updateCtl(); },
          check: () => checkPred(),
          status: () => '쓴 칸 ' + PRED.filter((p) => $('#' + p.id).value.trim() !== '').length + ' / ' + PRED.length,
          explain: '병렬부 R₂ ∥ R₃ = ' + R2 + '×' + R3 + ' ÷ (' + R2 + '+' + R3 + ') = <b>' + fmtN(MIX.Rp, 0) + ' Ω</b>, 전체 저항 = ' + R1 + ' + ' + fmtN(MIX.Rp, 0) + ' = <b>' + fmtN(MIX.Rt, 0) + ' Ω</b>, 전체 전류 = ' + VS + ' ÷ ' + fmtN(MIX.Rt, 0) + ' = <b>' + fmtN(MIX.I, 2) + ' A</b>, R₁ 전압 = ' + fmtN(MIX.I, 2) + ' × ' + R1 + ' = <b>' + fmtN(MIX.V1, 0) + ' V</b>, 병렬부 전압 = ' + fmtN(MIX.VP, 0) + ' V이므로 I₂ = ' + fmtN(MIX.VP, 0) + ' ÷ ' + R2 + ' = <b>' + fmtN(MIX.I2, 2) + ' A</b>예요.',
        },
        {
          title: '계기로 확인하고 오차 따지기',
          goal: '<b>전체 전류(A) · 전원 전압(V) · R₁ 전압(V) · R₂ 가지 전류(A)</b>를 재서 예측과 비교하세요. (전체 저항 = 전원 전압 ÷ 전체 전류)',
          hint: '그림의 A 단추 두 개(전체 전류, R₂ 가지)와 V 단추 두 개(R₁ 양단, 전원 양단)를 눌러요. 아래 표에 예측과 측정값, 오차가 나타나요.',
          setup() { S.gate = ''; setScene('mixed'); updateCtl(); },
          check: () => ['A0', 'VS', 'V1', 'A2'].every((id) => hasRec('mixed', id, 'm')),
          hold: 0.8,
          status: () => mark(hasRec('mixed', 'A0', 'm')) + ' 전체 전류 &nbsp; ' + mark(hasRec('mixed', 'VS', 'm')) + ' 전원 전압 &nbsp; ' + mark(hasRec('mixed', 'V1', 'm')) + ' R₁ 전압 &nbsp; ' + mark(hasRec('mixed', 'A2', 'm')) + ' R₂ 전류',
          explain: '예측과 측정값의 차이는 모두 <b>±1 % 안팎</b>이에요. 계기의 눈금을 읽는 오차와 계기 자체의 오차 때문에 생기는 것으로, 풀이 방법이 맞다는 뜻이에요. 오차가 이보다 훨씬 크다면 풀이 순서에서 실수가 있었는지 점검해야 해요.',
        },
        {
          type: 'quiz', title: '전구 두 개를 연결할 때',
          goal: '같은 전구 두 개를 연결했을 때 알맞은 설명은?',
          setup() { S.gate = ''; setScene('mixed'); updateCtl(); },
          choices: ['직렬: 한 개가 끊어져도 다른 전구는 켜져 있다. 병렬: 한 개가 끊어지면 다른 전구도 꺼진다', '직렬: 한 개가 끊어지면 다른 전구도 꺼진다. 병렬: 한 개가 끊어져도 다른 전구는 켜져 있고, 전구를 더 연결할수록 전원에서 흐르는 전체 전류는 커진다', '직렬·병렬 모두 한 개가 끊어지면 다른 전구도 꺼진다', '직렬: 전구를 더 연결하면 전체 전류가 커진다. 병렬: 전구를 더 연결하면 전체 전류가 작아진다'],
          answer: 1,
          feedback: ['직렬과 병렬이 서로 바뀌었어요. 직렬은 길이 한 줄뿐이라서 한 곳이 끊어지면 전류가 흐를 수 없어요.', '', '병렬은 각 가지가 따로 전원에 연결되어 있어서 한 가지가 끊어져도 다른 가지는 그대로예요.', '직렬은 전구를 더 연결하면 저항이 커져 전류가 줄고, 병렬은 가지가 늘어 전체 전류가 늘어요. 반대로 생각했어요.'],
          explain: '직렬은 전류가 지나는 길이 <b>한 줄</b>뿐이어서 하나가 끊어지면 모두 꺼져요. 병렬은 가지마다 전원 전압이 걸려 있어서 하나가 끊어져도 나머지는 그대로 켜져 있고, 가지가 늘수록 <b>전체 전류가 늘어요</b>. 그래서 집의 전기 기구는 병렬로 연결해요.',
        },
      ],
    },
  ];

  /* 이어 하기(새로고침)로 중간 미션에서 열려도 미션 setup()이 만든 장면을 덮어쓰지 않도록, 장면을 게임보다 먼저 만들어요 */
  setScene('series');
  updateCtl();
  game = SciSim.game({
    simId: 'hp-resistor-connection', mount: '#game', badge: '회로 분석가', homeHref: '../../index.html#hp',
    featureLabels: { series: '🔌 직렬 회로 · 전류계 · 전압계', parallel: '🔀 병렬 회로 · 가지 스위치', model: '🧩 도선 통로 모형 · 합성 저항', mixed: '🎯 혼합 회로 · 예측 비교표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  function stepAll1(dt) {
    S.dial.needle.update(dt);
    if (S.mode === 'model') stepFlow(mdSegs(mdLanes()), dt);
    else stepFlow(segsOf(S.mode), dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);   // 매 프레임 전체를 다시 칠해요 (아래 자료 영역의 그림자가 겹쳐 쌓여 어두워지지 않게)
    stepAll1(dt);
    if (S.mode === 'model') drawModel(); else drawCircuitMode(S.mode);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SH, PY, PH, G, CB, get game() { return game; },
    setScene, spotsOf, measure, mdMeasure, curRecs, toggleSw, swHit, hitSpot, mdLanes, MIX, PRED, seriesVals, parallelVals, resetDial,
    spot(id) { return spotsOf(S.mode).find((s) => s.id === id); },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
