/* =========================================================
   물리학 Ⅱ. 전기와 자기 - 소비 전력과 전기 안전 (단원 3차시)
   성취기준 [12물리02-02] 전기 회로에서 저항의 연결에 따라 소비 전력이 달라짐을 알고, 다양한 전기 기구에서 적용되는 사례를 찾을 수 있다. (소비 전력·전기 안전 부분)
   ① 관찰: 소비 전력 (정격 전류 I = P / V, 전력량 E = Pt)
   ② 분석: 연결과 소비 전력 (60 W · 100 W 전구의 직렬·병렬, P = I²R)
   ③ 탐구: 가정 배선과 과부하 (병렬 배선, 멀티탭 15 A, 전선 발열 I²R, 차단기)
   ④ 적용: 안전 설계 (콘센트 배치, LED 절약)
   교류의 실효값 · 위상 · 역률 · 3상 전력은 다루지 않아요.
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
  const fmtN = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const f1 = (v) => fmtN(v, 1);
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };

  /* ---------- 물리 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const VOLT = 220;                              // 가정용 전압 (V)
  const PROD = [
    { id: 'ac', name: '에어컨', icon: '❄️', P: 1500 },
    { id: 'heater', name: '전기 히터', icon: '🔥', P: 1200 },
    { id: 'cooker', name: '전기밥솥', icon: '🍚', P: 1000 },
    { id: 'dryer', name: '드라이어', icon: '💨', P: 1800 },
    { id: 'micro', name: '전자레인지', icon: '♨️', P: 1200 },
    { id: 'laptop', name: '노트북 충전기', icon: '💻', P: 60 },
  ];
  const SHORT = { ac: '에어컨', heater: '히터', cooker: '밥솥', dryer: '드라이어', micro: '전자레인지', laptop: '충전기' };
  PROD.forEach((p) => { p.I = Math.round(p.P / VOLT * 10) / 10; p.short = SHORT[p.id]; });     // 정격 전류 = P ÷ V (소수 첫째 자리, 제품 표시값)
  const prodOf = (id) => PROD.find((p) => p.id === id);
  const LIMIT = 15;                                                   // 멀티탭 정격 전류 (A) → 3300 W
  const LIMIT_W = VOLT * LIMIT;
  const WIRE_R = 0.10, T0 = 25, TK = 2;                               // 전선 저항 (Ω), 실온 (°C), 발열 1 W당 온도 상승 (°C)
  const wireHeat = (I) => I * I * WIRE_R;                             // 전선 발열 (W)
  const wireTemp = (I) => T0 + TK * wireHeat(I);                      // 전선 온도 (°C)
  const T_LIMIT = wireTemp(LIMIT);                                    // 15 A일 때의 온도 (°C)
  const TRIP_T = 2.5;                                                 // 15 A를 넘은 채로 이 시간(초)이 지나면 차단기가 작동
  const B1 = 60, B2 = 100;                                            // 전구 정격 전력 (W)
  const RB = (P) => VOLT * VOLT / P;                                  // 전구 저항 (Ω)
  const KFLOW = 220;                                                  // 전류 1 A당 전하 점의 속력 (px/s)
  const LED_W = 8, INC_W = 60, HRS = 5, DAYS = 30;                    // 백열전구 60 W, LED 8 W, 하루 5시간, 30일
  const kwh = (W, h) => W * h / 1000;

  // 전구 연결 계산 (② 모형)
  function bulbCalc(conn, pair) {
    const Ps = pair === 'same' ? [B2, B2] : [B1, B2], R = Ps.map(RB);
    if (conn === 'parallel') return { Ps, R, V: [VOLT, VOLT], I: R.map((r) => VOLT / r), P: Ps.slice() };
    const I = VOLT / (R[0] + R[1]), V = R.map((r) => I * r);
    return { Ps, R, V, I: [I, I], P: R.map((r) => I * I * r) };
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'rate', t: 0, fade: 0, gate: '',
    rt: { sel: 0, ok: {}, shown: {}, hours: 2, run: null, lastE: null, elog: [], needle: new SciSim.Spring(0, { stiffness: 220, damping: 20 }), shake: 0, calc: {} },
    cn: { conn: 'parallel', pair: 'mixed', rec: {}, last: null, glow: [0, 0], seg: {} },
    hm: { on: PROD.map(() => false), plug: PROD.map(() => 0), ov: 0, tripped: false, trips: 0, seenN: {}, temp: T0, needle: new SciSim.Spring(0, { stiffness: 200, damping: 18 }), lever: 1, seg: {}, shake: 0, flash: 0 },
    pn: { sub: 'room', bay: PROD.map(() => -1), pos: [], drag: null, ok: false, saveView: 0, seenSave: false },
    kwhOK: false,
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { rate: '🔆 소비 전력', conn: '💡 연결과 전력', home: '🔌 과부하', plan: '🏠 안전 설계' };

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
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = S.pn.sub === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#prodSeg button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.rt.sel); b.classList.toggle('done', !!S.rt.ok[PROD[k].id]); });
    $$('#hrSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.rt.hours));
    $('#bRun').disabled = !!S.rt.run;
    $$('#cnSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.cn.conn));
    $$('#pairSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.cn.pair));
    $$('#devChips button').forEach((b) => b.classList.toggle('on', S.hm.on[+b.dataset.v]));
    $('#bBreaker').disabled = !S.hm.tripped;
    $('#bUnplug').disabled = !S.hm.on.some(Boolean);
    $$('#subSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.pn.sub));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  // 제품 고르기 단추 · 기구 칩
  PROD.forEach((p, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = p.icon + ' ' + p.name; $('#prodSeg').appendChild(b);
    const c = document.createElement('button'); c.type = 'button'; c.dataset.v = k; c.textContent = p.icon + ' ' + p.name; $('#devChips').appendChild(c);
  });

  /* ================= ① 소비 전력 ================= */
  const fT = (v) => String(+v.toFixed(2));                       // 전력량 표시: 소수 둘째 자리까지, 끝의 0은 생략
  function drawGauge(cx, cy, r, f, full, opts) {
    // 반원형 계기: 눈금 0 ~ full, 바늘 위치 f(0~1), opts.red = [시작 눈금, 끝 눈금]
    opts = opts || {};
    const th = (q) => Math.PI * (1.12 + 0.76 * q);
    if (opts.red) { ctx.strokeStyle = 'rgba(226,70,75,.35)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, r - 6, th(opts.red[0] / full), th(opts.red[1] / full)); ctx.stroke(); }
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, th(0), th(1)); ctx.stroke();
    const n = opts.ticks || 10;
    for (let i = 0; i <= n; i++) { const a = th(i / n), big = i % 5 === 0 || n <= 6; ctx.lineWidth = big ? 2.5 : 1.2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * (r - (big ? 13 : 8)), cy + Math.sin(a) * (r - (big ? 13 : 8))); ctx.stroke(); }
    const lab = opts.labels || [0, 0.5, 1];
    lab.forEach((q) => { const a = th(q); T(cx + Math.cos(a) * (r - 27), cy + Math.sin(a) * (r - 27) + 4, String(fmtN(full * q, full >= 10 ? 0 : 1)), 12, '#3a465c', 'center', 800); });
    const a = th(clamp(f, 0, 1.04));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, 6, '#394258', { gloss: false });
  }
  function rtRun() {
    const t = S.rt; if (t.run) return;
    const p = PROD[t.sel];
    t.run = { prod: p, h: t.hours, t: 0, dur: RM ? 0.01 : 2.2 };
    Sound.click(); updateCtl();
  }
  function rtConfirm() {
    const t = S.rt, p = PROD[t.sel], val = parseNum($('#iIn').value);
    if (isNaN(val)) { showHint('I = P ÷ V 값을 숫자로 써 주세요.', 3200); Sound.fail(); t.shake = 0.4; return; }
    t.shown[p.id] = true; t.calc[p.id] = val; t.needle.target = p.I / 10;
    if (Math.abs(val - p.I) <= 0.05) {
      if (!t.ok[p.id]) { t.ok[p.id] = true; Sound.success(); parts.burst(PHONE ? 315 : 406, PHONE ? 210 : 190, { count: 12, speed: 120, size: 3, colors: ['#ffb400', '#14a058', '#fff'] }); }
    } else {
      t.ok[p.id] = false; t.shake = 0.45; Sound.fail(); showHint('계산한 값과 전류계의 눈금이 달라요. I = P ÷ V를 다시 계산해 보세요.', 4200);
    }
    updateCtl();
  }
  function stepRate(dt) {
    const t = S.rt;
    t.needle.update(dt); t.shake = Math.max(0, t.shake - dt);
    if (t.run) {
      const r = t.run; r.t += dt;
      if (r.t >= r.dur) {
        const E = kwh(r.prod.P, r.h);
        t.lastE = { name: r.prod.name, P: r.prod.P, h: r.h, E };
        t.elog.push(t.lastE); if (t.elog.length > 6) t.elog.shift();
        t.run = null; Sound.success(); parts.burst(PHONE ? 240 : 678, 180, { count: 10, speed: 100, size: 3, colors: ['#ffb400', '#f26b3a'], gravity: 60 });
        updateCtl();
      }
    }
  }
  function curE() { const r = S.rt.run; if (r) { const f = SciSim.ease.inOutQuad(clamp(r.t / r.dur, 0, 1)); return { h: r.h * f, E: kwh(r.prod.P, r.h * f), name: r.prod.name, P: r.prod.P }; } const l = S.rt.lastE; return l ? { h: l.h, E: l.E, name: l.name, P: l.P } : null; }
  function drawRate() {
    sceneBg();
    const t = S.rt, p = PROD[t.sel], shown = !!t.shown[p.id];
    T(14, 26, '🔆 소비 전력과 정격 전류', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '제품에 적힌 정격 전력 P와 전압 V로 전류 I = P ÷ V를 구해요', PHONE ? 11.5 : 13.5, '#5a6679', 'left', 700);
    // 제품 명판
    const nx = 14, ny = 62, nw = PHONE ? 140 : 226, nh = SH - 62 - 8;
    panel(nx, ny, nw, nh, 14);
    ctx.save(); ctx.translate(nx + nw / 2, ny + (PHONE ? 52 : 70)); const sh = t.shake > 0 ? Math.sin(S.t * 60) * 4 : 0; ctx.translate(sh, 0);
    D.glow(0, 0, PHONE ? 50 : 62, '#ffd447', 0.35); T(0, PHONE ? 14 : 20, p.icon, PHONE ? 46 : 64, '#000', 'center', 700); ctx.restore();
    T(nx + nw / 2, ny + (PHONE ? 100 : 136), p.name, PHONE ? 15 : 18, '#26324a', 'center', 800);
    D.roundRect(nx + 12, ny + (PHONE ? 112 : 150), nw - 24, PHONE ? 78 : 92, 10); ctx.fillStyle = '#26324a'; ctx.fill();
    T(nx + nw / 2, ny + (PHONE ? 134 : 176), '정격 전압  ' + VOLT + ' V', PHONE ? 13 : 15, '#fff', 'center', 800);
    T(nx + nw / 2, ny + (PHONE ? 160 : 204), '정격 전력  ' + p.P + ' W', PHONE ? 13 : 15, '#ffd447', 'center', 800);
    T(nx + nw / 2, ny + nh - 12, '제품 표시', 11.5, '#98a2b3', 'center', 700);
    // 전류계
    const dx = PHONE ? 160 : 256, dw = PHONE ? 310 : 300;
    panel(dx, ny, dw, nh, 14);
    D.label(dx + 12, ny + 22, '전류계 (A)', { bg: '#f2873a', size: 13, align: 'left' });
    const gcx = dx + dw / 2, gcy = ny + (PHONE ? 150 : 176), gr = PHONE ? 100 : 112;
    drawGauge(gcx, gcy, gr, t.needle.value, 10, { ticks: 10, labels: [0, 0.5, 1] });
    T(gcx, gcy + 30, shown ? f1(p.I) + ' A' : '? A', PHONE ? 22 : 26, shown ? '#26324a' : '#98a2b3', 'center', 800);
    T(gcx, gcy + 52, shown ? p.name + '의 정격 전류' : '계산한 값을 쓰고 확인해요', 12.5, '#5a6679', 'center', 800);
    // 전력량계
    const E = curE(), kx = PHONE ? 12 : 568, ky = PHONE ? PY : 62, kw = PHONE ? VW - 24 : VW - 568 - 12, kh = PHONE ? 120 : SH - 62 - 8;
    panel(kx, ky, kw, kh, 14);
    D.label(kx + 12, ky + 22, '전력량계 (kWh)', { bg: '#5a4fcf', size: 13, align: 'left' });
    const kcx = PHONE ? kx + 96 : kx + kw / 2;
    const dispE = E ? fT(E.E) : '0';
    T(PHONE ? kx + 160 : kcx, ky + (PHONE ? 62 : 76), dispE + ' kWh', PHONE ? 26 : 32, '#26324a', PHONE ? 'left' : 'center', 800);
    if (E) {
      T(PHONE ? kx + 160 : kcx, ky + (PHONE ? 86 : 104), E.name + ' ' + E.P + ' W', 13.5, '#5a6679', PHONE ? 'left' : 'center', 800);
      T(PHONE ? kx + 160 : kcx, ky + (PHONE ? 106 : 126), '사용 시간 ' + fmtN(E.h, 1) + ' h', 13.5, '#5a6679', PHONE ? 'left' : 'center', 800);
    } else T(PHONE ? kx + 160 : kcx, ky + (PHONE ? 86 : 104), '쓰는 시간을 정하고 사용해 봐요', 12.5, '#98a2b3', PHONE ? 'left' : 'center', 800);
    // 시계
    const ccx = PHONE ? kx + 64 : kcx, ccy = PHONE ? ky + 74 : ky + 172, cr = PHONE ? 30 : 36;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, TAU); ctx.fill(); ctx.strokeStyle = '#516079'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 - Math.PI / 2; ctx.lineWidth = i % 3 === 0 ? 2.2 : 1; ctx.beginPath(); ctx.moveTo(ccx + Math.cos(a) * (cr - 4), ccy + Math.sin(a) * (cr - 4)); ctx.lineTo(ccx + Math.cos(a) * (cr - (i % 3 === 0 ? 10 : 7)), ccy + Math.sin(a) * (cr - (i % 3 === 0 ? 10 : 7))); ctx.stroke(); }
    const hh = E ? E.h : 0, ha = hh * TAU / 12 - Math.PI / 2;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.lineTo(ccx + Math.cos(ha) * (cr - 9), ccy + Math.sin(ha) * (cr - 9)); ctx.stroke();
    D.sphere(ccx, ccy, 3, '#394258', { gloss: false });
    if (!PHONE) T(kx + 14, ky + kh - 14, '전력량 = 전력 × 시간', 12.5, '#9a3412', 'left', 800);
    drawRateTable(12, PHONE ? PY + 130 : PY, VW - 24, PHONE ? PH - 130 : PH);
  }
  function drawRateTable(x, y, w, h) {
    panel(x, y, w, h, 14);
    T(x + 14, y + 24, '제품 표시와 전류 확인표', 13.5, '#26324a', 'left', 800);
    const cols = PHONE ? [0, 0.40, 0.58, 0.78] : [0, 0.30, 0.46, 0.66, 0.84], ww = w - 28;
    const heads = PHONE ? ['제품', '전력', '내 계산', '전류계'] : ['제품', '정격 전력', '내가 계산한 I', '전류계의 I', '확인'];
    const hy = y + 46, rh = Math.min(26, (h - 62) / 6);
    heads.forEach((hd, i) => T(x + 14 + ww * cols[i], hy, hd, 12.5, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, hy + 6); ctx.lineTo(x + w - 10, hy + 6); ctx.stroke();
    PROD.forEach((p, i) => {
      const yy = hy + 10 + i * rh, mid = yy + rh * 0.68, sel = S.rt.sel === i, shown = S.rt.shown[p.id], ok = S.rt.ok[p.id];
      if (sel) { D.roundRect(x + 8, yy, w - 16, rh - 1, 6); ctx.fillStyle = 'rgba(255,212,71,.28)'; ctx.fill(); }
      T(x + 14 + ww * cols[0], mid, p.icon + ' ' + p.name, PHONE ? 12 : 13.5, '#26324a', 'left', 800);
      T(x + 14 + ww * cols[1], mid, p.P + ' W', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
      const c = S.rt.calc[p.id];
      T(x + 14 + ww * cols[2], mid, c != null ? fmtN(c, 2).replace(/0$/, '') + ' A' : '—', PHONE ? 12 : 13.5, c != null ? '#26324a' : '#b0b8c6', 'left', 800);
      T(x + 14 + ww * cols[3], mid, shown ? f1(p.I) + ' A' : '—', PHONE ? 12 : 13.5, shown ? '#b45309' : '#b0b8c6', 'left', 800);
      if (!PHONE) T(x + 14 + ww * cols[4], mid, ok ? '✅ 일치' : shown ? '❌ 다시 계산' : '', 13, ok ? '#14803f' : '#b4231f', 'left', 800);
    });
  }
  $$('#prodSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.rt.sel = +b.dataset.v; $('#iIn').value = ''; const p = PROD[S.rt.sel]; S.rt.needle.target = S.rt.shown[p.id] ? p.I / 10 : 0; updateCtl(); }));
  $$('#hrSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.rt.hours = +b.dataset.v; updateCtl(); }));
  $('#bConfirm').addEventListener('click', rtConfirm);
  $('#bRun').addEventListener('click', rtRun);

  /* ================= ② 연결과 소비 전력 ================= */
  const CK = (conn, pair) => conn + '-' + pair;
  const CN_NAME = { 'parallel-mixed': '병렬 · 60 W + 100 W', 'series-mixed': '직렬 · 60 W + 100 W', 'parallel-same': '병렬 · 100 W + 100 W', 'series-same': '직렬 · 100 W + 100 W' };
  const CN = (() => {
    const L = PHONE ? 70 : 96, R = PHONE ? 400 : 480, TOP = PHONE ? 130 : 112, BOT = SH - 40, mid = (TOP + BOT) / 2;
    return { L, R, TOP, BOT, mid, bx: [L + (R - L) * 0.28, L + (R - L) * 0.70], batT: mid - 30, batB: mid + 30 };
  })();
  function cnSegs(c) {
    const o = [], { L, R, TOP, BOT, bx, batT, batB } = CN, sc = S.cn.conn;
    if (sc === 'series') {
      o.push({ k: 'c0', I: c.I[0], pts: [[L, batT], [L, TOP], [R, TOP], [R, BOT], [L, BOT], [L, batB]] });
    } else {
      o.push({ k: 'c0', I: c.I[0] + c.I[1], pts: [[L, batT], [L, TOP], [bx[0], TOP]] });
      o.push({ k: 'c1', I: c.I[1], pts: [[bx[0], TOP], [bx[1], TOP]] });
      o.push({ k: 'cb0', I: c.I[0], pts: [[bx[0], TOP], [bx[0], BOT]] });
      o.push({ k: 'cb1', I: c.I[1], pts: [[bx[1], TOP], [bx[1], BOT]] });
      o.push({ k: 'c2', I: c.I[1], pts: [[bx[1], BOT], [bx[0], BOT]] });
      o.push({ k: 'c3', I: c.I[0] + c.I[1], pts: [[bx[0], BOT], [L, BOT], [L, batB]] });
    }
    return o;
  }
  function stepFlowList(segs, store, dt) { segs.forEach((sg) => { const st = store[sg.k] || (store[sg.k] = { off: 0 }); st.off = (st.off + sg.I * KFLOW * dt) % 24; }); }
  function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function polyAt(pts, d) {
    for (let i = 1; i < pts.length; i++) {
      const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= L || i === pts.length - 1) { const f = clamp(d / Math.max(L, 1e-6), 0, 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; }
      d -= L;
    }
    return pts[pts.length - 1];
  }
  function drawFlowList(segs, store) {
    segs.forEach((sg) => {
      if (sg.I < 1e-6) return;
      const L = polyLen(sg.pts), off = (store[sg.k] || { off: 0 }).off;
      for (let d = off; d < L; d += 24) { const q = polyAt(sg.pts, d); D.sphere(q[0], q[1], 3.7, '#ff9a3c', { gloss: false, outline: 'rgba(120,60,0,.35)', outlineWidth: 1 }); }
    });
  }
  function wiresList(list) {
    ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    list.forEach((pts) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); });
  }
  function drawSource(x, y0, y1, label) {
    D.shadow(() => { D.roundRect(x - 22, y0, 44, y1 - y0, 8); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 2 });
    T(x, (y0 + y1) / 2 - 2, label, 13.5, '#fff', 'center', 800); T(x, (y0 + y1) / 2 + 16, '교류', 11, '#a9b6cf', 'center', 700);
  }
  function drawBulb(x, y, br, name) {
    const b = clamp(br, 0, 1.2);
    if (b > 0.02) D.glow(x, y, 30 + 42 * Math.sqrt(b), '#ffd447', clamp(0.15 + 0.6 * b, 0, 0.8));
    D.sphere(x, y, PHONE ? 20 : 24, C.mix('#dfe3ea', '#fff2a8', clamp(0.2 + 0.8 * b, 0, 1)), { shadow: true });
    ctx.strokeStyle = b > 0.05 ? '#f26b3a' : '#8a95a6'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 8, y + 10); ctx.lineTo(x - 5, y - 2); ctx.lineTo(x, y + 4); ctx.lineTo(x + 5, y - 2); ctx.lineTo(x + 8, y + 10); ctx.stroke();
    ctx.fillStyle = '#8a95a6'; ctx.fillRect(x - 9, y + 20, 18, 9);
    T(x, y + 46, name, PHONE ? 12.5 : 14, '#26324a', 'center', 800);
  }
  function cnRecord() {
    const c = S.cn, calc = bulbCalc(c.conn, c.pair), k = CK(c.conn, c.pair);
    c.rec[k] = { P: calc.P.slice(), tot: calc.P[0] + calc.P[1], I: calc.I.slice() };
    c.last = k; Sound.success();
    parts.burst(CN.R + 30, CN.mid, { count: 10, speed: 100, size: 3, colors: ['#ffb400', '#f26b3a', '#14a058'], gravity: 60 }); updateCtl();
  }
  function stepConn(dt) {
    const c = S.cn, calc = bulbCalc(c.conn, c.pair);
    stepFlowList(cnSegs(calc), c.seg, dt);
    calc.P.forEach((p, i) => { c.glow[i] = SciSim.approach(c.glow[i], p / B2, dt, 8); });
  }
  function drawConn() {
    sceneBg();
    const c = S.cn, calc = bulbCalc(c.conn, c.pair), segs = cnSegs(calc), { L, R, TOP, BOT, mid, bx, batT, batB } = CN;
    T(14, 26, '💡 연결 방법에 따라 달라지는 소비 전력', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '가정용 ' + VOLT + ' V · 전구의 밝기는 소비 전력 P = I²R에 따라 정해져요', PHONE ? 11.5 : 13.5, '#5a6679', 'left', 700);
    if (c.conn === 'series') wiresList([[[L, batT], [L, TOP], [R, TOP], [R, BOT], [L, BOT], [L, batB]]]);
    else wiresList([[[L, batT], [L, TOP], [bx[1], TOP]], [[bx[1], BOT], [L, BOT], [L, batB]], [[bx[0], TOP], [bx[0], BOT]], [[bx[1], TOP], [bx[1], BOT]]]);
    drawFlowList(segs, c.seg); drawSource(L, batT, batB, VOLT + ' V');
    const names = [c.pair === 'same' ? '100 W 전구' : '60 W 전구', '100 W 전구'];
    if (c.conn === 'series') {
      const xs = [L + (R - L) * 0.30, L + (R - L) * 0.70];
      xs.forEach((x, i) => { drawBulb(x, TOP, c.glow[i], names[i]); labelBulb(x, TOP + 88, i, calc); });
    } else {
      bx.forEach((x, i) => { drawBulb(x, mid, c.glow[i], names[i]); labelBulb(x + 36, mid - 4, i, calc, 'left'); });
    }
    // 소비 전력 막대
    const bxp = PHONE ? 12 : 556, byp = PHONE ? PY : 58, bw = PHONE ? VW - 24 : VW - 556 - 12, bh = PHONE ? 130 : SH - 58 - 8;
    panel(bxp, byp, bw, bh, 14);
    T(bxp + 14, byp + 24, '소비 전력 (W)', 13.5, '#26324a', 'left', 800);
    const MAXW = 200, rows = [['전구 1', calc.P[0], '#f2873a'], ['전구 2', calc.P[1], '#f26b3a'], ['전체', calc.P[0] + calc.P[1], '#516079']];
    const bl = bxp + 62, blw = bw - 62 - 14, rh = PHONE ? 30 : 36;
    rows.forEach((r, i) => {
      const yy = byp + 42 + i * rh;
      T(bxp + 14, yy + 16, r[0], 12.5, '#3a465c', 'left', 800);
      D.roundRect(bl, yy + 2, blw, 20, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const w = blw * clamp(r[1] / MAXW, 0, 1);
      if (w > 0.5) { ctx.save(); D.roundRect(bl, yy + 2, blw, 20, 8); ctx.clip(); ctx.fillStyle = r[2]; ctx.fillRect(bl, yy + 2, w, 20); ctx.restore(); }
      const txt = f1(r[1]) + ' W';
      T(bl + Math.min(w, blw) - 6 > bl + 60 ? bl + w - 6 : bl + w + 6, yy + 17, txt, 12.5, w > 70 ? '#fff' : '#26324a', w > 70 ? 'right' : 'left', 800);
    });
    T(bxp + bw - 14, byp + 42 + 3 * rh + 10, '눈금 끝 = ' + MAXW + ' W', 11, '#7b8aa3', 'right', 700);
    drawConnTable(12, PHONE ? PY + 140 : PY, VW - 24, PHONE ? PH - 140 : PH);
  }
  function labelBulb(x, y, i, calc, align) {
    const al = align || 'center', sz = PHONE ? 11.5 : 12.5;
    T(x, y - 18, 'R ≈ ' + fmtN(calc.R[i], 0) + ' Ω', sz, '#5a6679', al, 700);
    T(x, y, f1(calc.V[i]) + ' V · ' + fmtN(calc.I[i], 3) + ' A', sz, '#26324a', al, 800);
    T(x, y + 19, '→ ' + f1(calc.P[i]) + ' W', PHONE ? 13.5 : 15, '#b45309', al, 800);
  }
  function drawConnTable(x, y, w, h) {
    panel(x, y, w, h, 14);
    T(x + 14, y + 24, '소비 전력 기록표 (📏로 기록해요)', 13.5, '#26324a', 'left', 800);
    const cols = PHONE ? [0, 0.46, 0.64, 0.82] : [0, 0.34, 0.48, 0.62, 0.78], ww = w - 28;
    const heads = PHONE ? ['연결', '전구 1', '전구 2', '전체'] : ['연결 · 전구', '전구 1', '전구 2', '전체', 'P₀(' + B2 + ' W)와 비교'];
    const hy = y + 46, rh = Math.min(30, (h - 64) / 5);
    heads.forEach((hd, i) => T(x + 14 + ww * cols[i], hy, hd, PHONE ? 12 : 12.5, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, hy + 6); ctx.lineTo(x + w - 10, hy + 6); ctx.stroke();
    Object.keys(CN_NAME).forEach((k, i) => {
      const r = S.cn.rec[k], yy = hy + 10 + i * rh, mid = yy + rh * 0.68;
      if (S.cn.last === k) { D.roundRect(x + 8, yy, w - 16, rh - 1, 6); ctx.fillStyle = 'rgba(255,212,71,.28)'; ctx.fill(); }
      T(x + 14 + ww * cols[0], mid, CN_NAME[k], PHONE ? 11.5 : 13.5, '#26324a', 'left', 800);
      if (!r) { T(x + 14 + ww * cols[1], mid, '—', 13, '#b0b8c6', 'left', 800); return; }
      T(x + 14 + ww * cols[1], mid, f1(r.P[0]) + ' W', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
      T(x + 14 + ww * cols[2], mid, f1(r.P[1]) + ' W', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
      T(x + 14 + ww * cols[3], mid, f1(r.tot) + ' W', PHONE ? 12 : 13.5, '#b45309', 'left', 800);
      if (!PHONE && k.endsWith('same')) T(x + 14 + ww * cols[4], mid, '= P₀의 ' + fmtN(r.tot / B2, 1) + '배', 13.5, '#5a4fcf', 'left', 800);
    });
  }
  $$('#cnSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cn.conn = b.dataset.v; S.fade = 0.4; updateCtl(); }));
  $$('#pairSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cn.pair = b.dataset.v; S.fade = 0.4; updateCtl(); }));
  $('#bRec').addEventListener('click', cnRecord);
  $('#bRecClear').addEventListener('click', () => { Sound.click(); S.cn.rec = {}; S.cn.last = null; });

  /* ================= ③ 가정 배선과 과부하 ================= */
  const HM = (() => {
    const sp = PHONE ? 64 : 72, w = PHONE ? 58 : 66, h = PHONE ? 66 : 76;
    const stx = PHONE ? 62 : 150, sty = PHONE ? 214 : 206, stH = 40, cy0 = PHONE ? 62 : 66;
    return { sp, w, h, stx, sty, stH, cy0, stw: 6 * sp, bx: PHONE ? 8 : 14, bw: PHONE ? 44 : 60, by: PHONE ? 160 : 150, bh: PHONE ? 110 : 128 };
  })();
  const hmCx = (k) => HM.stx + HM.sp * k + HM.sp / 2;
  const hmI = () => (S.hm.tripped ? 0 : PROD.reduce((s, p, k) => s + (S.hm.on[k] ? p.I : 0), 0));
  const hmIreq = () => PROD.reduce((s, p, k) => s + (S.hm.on[k] ? p.I : 0), 0);          // 차단기 상태와 상관없이 꽂은 기구의 전류 합
  const hmN = () => S.hm.on.filter(Boolean).length;
  const wireCol = (T) => (T <= 45 ? '#7a8599' : T <= T_LIMIT ? C.mix('#7a8599', '#f2873a', (T - 45) / (T_LIMIT - 45)) : C.mix('#f2873a', '#e2262b', clamp((T - T_LIMIT) / 80, 0, 1)));
  function togglePlug(k) {
    const h = S.hm;
    h.on[k] = !h.on[k];
    Sound.click();
    if (h.on[k] && !h.tripped) {
      const n = hmN(), I = hmIreq();
      if (!h.seenN[n]) h.seenN[n] = { I, H: wireHeat(I), name: PROD[k].name };
      else h.seenN[n] = { I, H: wireHeat(I), name: PROD[k].name };
    }
    updateCtl();
  }
  function resetBreaker() {
    const h = S.hm; if (!h.tripped) return;
    h.tripped = false; h.ov = 0; Sound.click(); updateCtl();
  }
  function stepHome(dt) {
    const h = S.hm;
    for (let k = 0; k < PROD.length; k++) h.plug[k] = SciSim.approach(h.plug[k], h.on[k] ? 1 : 0, dt, 12);
    h.lever = SciSim.approach(h.lever, h.tripped ? 0 : 1, dt, 18);
    h.shake = Math.max(0, h.shake - dt); h.flash = Math.max(0, h.flash - dt * 2);
    const Ireq = hmIreq();
    if (!h.tripped) {
      if (Ireq > LIMIT + 1e-9) {
        h.ov += dt;
        if (h.ov >= TRIP_T) { h.tripped = true; h.trips++; h.shake = 0.5; h.flash = 1; Sound.fail(); showHint('차단기가 내려갔어요! 기구를 빼고 차단기를 올려요.', 4200); parts.burst(HM.bx + HM.bw / 2, HM.by + 30, { count: 12, speed: 120, size: 3, colors: ['#ffb400', '#e2464b', '#fff'], gravity: 40 }); updateCtl(); }
      } else h.ov = Math.max(0, h.ov - dt * 0.8);
    }
    const I = hmI();
    h.needle.target = clamp(I / 30, 0, 1.04); h.needle.update(dt);
    h.temp = SciSim.approach(h.temp, wireTemp(I), dt, 3);
    // 전하 점
    const segs = hmSegs();
    stepFlowList(segs, h.seg, dt);
  }
  function hmSegs() {
    const o = [], I = hmI(), y = HM.sty + HM.stH / 2;
    o.push({ k: 'h0', I, pts: [[HM.bx + HM.bw, y + 20], [HM.stx - 4, y + 20]] });
    PROD.forEach((p, k) => { if (S.hm.on[k] && !S.hm.tripped) o.push({ k: 'hc' + k, I: p.I, pts: [[hmCx(k), HM.sty + 12], [hmCx(k), HM.cy0 + HM.h]] }); });
    return o;
  }
  function drawHome() {
    sceneBg();
    const h = S.hm, I = hmI(), Ireq = hmIreq(), over = Ireq > LIMIT + 1e-9;
    T(14, 26, '🔌 집 안의 병렬 배선과 멀티탭', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '기구를 누르면 멀티탭에 꽂혀요 · 모든 기구에 ' + VOLT + ' V가 걸려요(병렬)', PHONE ? 11.5 : 13.5, '#5a6679', 'left', 700);
    const sy = HM.sty, y = sy + HM.stH / 2;
    const wcol = wireCol(h.temp);
    // 공급선
    D.glow(HM.stx - 20, y + 20, 36, '#e2262b', over ? 0.25 : 0);
    ctx.strokeStyle = wcol; ctx.lineWidth = over && !h.tripped ? 8 : 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(HM.bx + HM.bw, y + 20); ctx.lineTo(HM.stx - 4, y + 20); ctx.stroke();
    // 차단기 상자
    const bshake = h.shake > 0 ? Math.sin(S.t * 70) * 3 : 0;
    ctx.save(); ctx.translate(bshake, 0);
    D.shadow(() => { D.roundRect(HM.bx, HM.by, HM.bw, HM.bh, 10); ctx.fillStyle = '#d7dde8'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(HM.bx + 8, HM.by + 26, HM.bw - 16, HM.bh - 36, 6); ctx.fillStyle = '#394258'; ctx.fill();
    T(HM.bx + HM.bw / 2, HM.by + 17, '차단기', PHONE ? 11 : 12.5, '#26324a', 'center', 800);
    const ly = HM.by + 34 + (1 - h.lever) * (HM.bh - 78);
    D.shadow(() => { D.roundRect(HM.bx + 14, ly, HM.bw - 28, 34, 6); ctx.fillStyle = h.tripped ? '#e2464b' : '#14a058'; ctx.fill(); }, { blur: 5, y: 2 });
    T(HM.bx + HM.bw / 2, ly + 22, h.tripped ? 'OFF' : 'ON', 12, '#fff', 'center', 800);
    T(HM.bx + HM.bw / 2, HM.by + HM.bh + 17, LIMIT + ' A', 12.5, '#5a6679', 'center', 800);
    ctx.restore();
    // 멀티탭
    D.shadow(() => { D.roundRect(HM.stx, sy, HM.stw, HM.stH, 10); ctx.fillStyle = over ? C.mix('#e8ecf3', '#ffd0cc', clamp((Ireq - LIMIT) / 8, 0, 1)) : '#e8ecf3'; ctx.fill(); }, { blur: 8, y: 3 });
    D.sphere(HM.stx + HM.stw - 12, sy + HM.stH / 2, 5, h.tripped ? '#8a95a6' : over ? '#e2262b' : '#14a058', { gloss: false });
    // 기구
    flowDraw();
    PROD.forEach((p, k) => {
      const cx = hmCx(k), top = HM.cy0, on = h.on[k], pl = h.plug[k];
      // 코드와 플러그
      const plugY = sy - 28 + pl * 36;
      ctx.strokeStyle = '#4a5569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, top + HM.h); ctx.lineTo(cx, plugY - 8); ctx.stroke();
      D.roundRect(cx - 9, plugY - 8, 18, 16, 3); ctx.fillStyle = '#394258'; ctx.fill(); ctx.fillStyle = '#c9d2e0'; ctx.fillRect(cx - 5, plugY + 8, 3, 7); ctx.fillRect(cx + 2, plugY + 8, 3, 7);
      // 소켓
      ctx.fillStyle = '#394258'; D.roundRect(cx - 9, sy + 11, 18, 18, 4); ctx.fill();
      // 카드
      const lit = on && !h.tripped;
      D.shadow(() => { D.roundRect(cx - HM.w / 2, top, HM.w, HM.h, 10); ctx.fillStyle = lit ? '#fff4d6' : '#fff'; ctx.fill(); }, { blur: on ? 8 : 4, y: 2 });
      ctx.strokeStyle = lit ? '#f2b630' : '#d6dcea'; ctx.lineWidth = lit ? 2.5 : 1.5; D.roundRect(cx - HM.w / 2, top, HM.w, HM.h, 10); ctx.stroke();
      T(cx, top + (PHONE ? 26 : 32), p.icon, PHONE ? 22 : 28, '#000', 'center', 700);
      T(cx, top + (PHONE ? 42 : 51), p.short, PHONE ? 10.5 : 12, '#26324a', 'center', 800);
      T(cx, top + (PHONE ? 57 : 67), p.P + ' W', PHONE ? 10.5 : 12, '#b45309', 'center', 800);
    });
    if (!PHONE) drawHomeMeters(594, 58, VW - 594 - 12, SH - 58 - 8);
    // 아래
    const ty = PHONE ? PY + 190 : PY, th = PHONE ? PH - 190 : PH;
    if (PHONE) drawHomeMeters(12, PY, VW - 24, 180);
    drawHomeTable(12, ty, VW - 24, th);
  }
  function flowDraw() { drawFlowList(hmSegs(), S.hm.seg); }
  function drawHomeMeters(x, y, w, h) {
    const hm = S.hm, I = hmI(), Ireq = hmIreq(), over = Ireq > LIMIT + 1e-9, hp = wireHeat(I), tt = wireTemp(I);
    panel(x, y, w, h, 14);
    if (!PHONE) {
      D.label(x + 12, y + 22, '전체 전류 (A)', { bg: '#f2873a', size: 13, align: 'left' });
      drawGauge(x + w / 2, y + 100, 60, hm.needle.value, 30, { ticks: 6, red: [LIMIT, 30], labels: [0, 0.5, 1] });
      T(x + w / 2, y + 122, f1(I) + ' A', 22, over && !hm.tripped ? '#b4231f' : '#26324a', 'center', 800);
      T(x + w / 2, y + 140, '정격 ' + LIMIT + ' A (' + LIMIT_W + ' W)', 12, '#5a6679', 'center', 800);
      const by = y + 158;
      T(x + 14, by + 2, '전선 발열 (I²R, r = ' + fmtN(WIRE_R, 2) + ' Ω)', 12, '#5a6679', 'left', 700);
      T(x + 14, by + 28, f1(hp) + ' W · ' + fmtN(tt, 0) + ' °C', 16, tt > T_LIMIT + 0.5 ? '#b4231f' : '#26324a', 'left', 800);
      // 온도 막대
      const bx = x + 14, bw = w - 28, bt = by + 36, TM = 150;
      D.roundRect(bx, bt, bw, 14, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const f = clamp((tt - T0) / (TM - T0), 0, 1), fw = bw * f;
      if (fw > 0.5) { ctx.save(); D.roundRect(bx, bt, bw, 14, 7); ctx.clip(); ctx.fillStyle = wireCol(tt); ctx.fillRect(bx, bt, fw, 14); ctx.restore(); }
      const lx = bx + bw * (T_LIMIT - T0) / (TM - T0); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, bt - 4); ctx.lineTo(lx, bt + 18); ctx.stroke();
      T(lx, bt + 31, fmtN(T_LIMIT, 0) + '°C (15 A)', 11, '#5a6679', 'center', 700);
      T(bx, bt + 31, T0 + '', 11, '#7b8aa3', 'left', 700); T(bx + bw, bt + 31, TM + '', 11, '#7b8aa3', 'right', 700);
      // 차단기 타이머
      const tp = hm.tripped ? 1 : clamp(hm.ov / TRIP_T, 0, 1);
      if (over || hm.tripped) { T(bx, y + h - 8, '차단기 작동까지', 11, '#b4231f', 'left', 700); D.roundRect(bx + 92, y + h - 16, bw - 92, 8, 4); ctx.fillStyle = '#eef1f7'; ctx.fill(); if (tp > 0.01) { D.roundRect(bx + 92, y + h - 16, (bw - 92) * tp, 8, 4); ctx.fillStyle = '#e2464b'; ctx.fill(); } }
    } else {
      D.label(x + 12, y + 22, '전체 전류 (A)', { bg: '#f2873a', size: 13, align: 'left' });
      drawGauge(x + 100, y + 150, 80, hm.needle.value, 30, { ticks: 6, red: [LIMIT, 30], labels: [0, 0.5, 1] });
      T(x + 210, y + 66, f1(I) + ' A', 24, over && !hm.tripped ? '#b4231f' : '#26324a', 'left', 800);
      T(x + 210, y + 88, '정격 ' + LIMIT + ' A', 12.5, '#5a6679', 'left', 800);
      T(x + 210, y + 118, '전선 발열 ' + f1(hp) + ' W', 14, '#26324a', 'left', 800);
      T(x + 210, y + 140, fmtN(tt, 0) + ' °C (15 A일 때 ' + fmtN(T_LIMIT, 0) + ' °C)', 12, tt > T_LIMIT + 0.5 ? '#b4231f' : '#5a6679', 'left', 800);
      if (over || hm.tripped) { const tp = hm.tripped ? 1 : clamp(hm.ov / TRIP_T, 0, 1); D.roundRect(x + 210, y + 154, w - 224, 8, 4); ctx.fillStyle = '#eef1f7'; ctx.fill(); if (tp > 0.01) { D.roundRect(x + 210, y + 154, (w - 224) * tp, 8, 4); ctx.fillStyle = '#e2464b'; ctx.fill(); } }
    }
  }
  function drawHomeTable(x, y, w, h) {
    panel(x, y, w, h, 14);
    T(x + 14, y + 24, '하나씩 꽂을 때의 기록 (꽂은 개수 → 전체 전류)', 13.5, '#26324a', 'left', 800);
    const cols = PHONE ? [0, 0.22, 0.46, 0.70] : [0, 0.12, 0.30, 0.52, 0.72], ww = w - 28;
    const heads = PHONE ? ['개수', '전체 전류', '발열', '판정'] : ['개수', '마지막에 꽂은 기구', '전체 전류', '전선 발열', '판정'];
    const hy = y + 46, rh = Math.min(26, (h - 62) / 6);
    heads.forEach((hd, i) => T(x + 14 + ww * cols[i], hy, hd, 12.5, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, hy + 6); ctx.lineTo(x + w - 10, hy + 6); ctx.stroke();
    for (let n = 1; n <= 6; n++) {
      const r = S.hm.seenN[n], yy = hy + 10 + (n - 1) * rh, mid = yy + rh * 0.68;
      T(x + 14 + ww * cols[0], mid, n + '개', PHONE ? 12 : 13.5, r ? '#26324a' : '#b0b8c6', 'left', 800);
      if (!r) continue;
      const bad = r.I > LIMIT + 1e-9;
      if (!PHONE) T(x + 14 + ww * cols[1], mid, r.name, 13, '#5a6679', 'left', 800);
      T(x + 14 + ww * cols[PHONE ? 1 : 2], mid, f1(r.I) + ' A', PHONE ? 12 : 13.5, bad ? '#b4231f' : '#26324a', 'left', 800);
      T(x + 14 + ww * cols[PHONE ? 2 : 3], mid, f1(r.H) + ' W', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
      T(x + 14 + ww * cols[PHONE ? 3 : 4], mid, bad ? '⚠️ ' + LIMIT + ' A 초과' : '안전', PHONE ? 12 : 13.5, bad ? '#b4231f' : '#14803f', 'left', 800);
    }
  }
  function homeHit(p) {
    for (let k = 0; k < PROD.length; k++) { const cx = hmCx(k); if (Math.abs(p.x - cx) <= HM.w / 2 && p.y >= HM.cy0 && p.y <= HM.cy0 + HM.h) return k; }
    return -1;
  }
  $$('#devChips button').forEach((b) => b.addEventListener('click', () => togglePlug(+b.dataset.v)));
  $('#bUnplug').addEventListener('click', () => { Sound.click(); S.hm.on = PROD.map(() => false); S.hm.ov = 0; updateCtl(); });
  $('#bBreaker').addEventListener('click', resetBreaker);

  /* ================= ④ 안전 설계 ================= */
  const CARD = PHONE ? { w: 56, h: 52 } : { w: 72, h: 58 };
  const BAYS = (() => {
    const bw = PHONE ? 150 : 164, gap = PHONE ? 6 : 10, x0 = (VW - (3 * bw + 2 * gap)) / 2, by = PHONE ? 136 : 140, bh = SH - by - 8;
    return [0, 1, 2].map((i) => ({ x: x0 + i * (bw + gap), y: by, w: bw, h: bh, cap: i === 0 ? 1 : 4, name: '콘센트 ' + (i + 1) }));
  })();
  const TRAYY = PHONE ? 90 : 96;
  const trayPos = (k) => { const sp = PHONE ? 74 : 80, x0 = (VW - (5 * sp)) / 2; return { x: x0 + k * sp, y: TRAYY }; };
  function slotPos(bay, i) {
    const b = BAYS[bay], top = b.y + 42;
    if (b.cap === 1) return { x: b.x + b.w / 2, y: top + (b.h - 44) / 2 };
    const cx = b.x + b.w / 2, dx = CARD.w / 2 + 3, dy = CARD.h / 2 + 3, r0 = top + dy + 2;
    return { x: cx + (i % 2 ? dx : -dx), y: r0 + Math.floor(i / 2) * (CARD.h + 6) };
  }
  const bayList = (b) => PROD.map((p, k) => k).filter((k) => S.pn.bay[k] === b);
  const bayI = (b) => Math.round(bayList(b).reduce((s, k) => s + PROD[k].I, 0) * 10) / 10;
  const ALL_I = Math.round(PROD.reduce((s, p) => s + p.I, 0) * 10) / 10;
  function freeSlot(b, except) { const used = bayList(b).filter((k) => k !== except).map((k) => S.pn.slotOf[k]); for (let i = 0; i < BAYS[b].cap; i++) if (!used.includes(i)) return i; return -1; }
  S.pn.slotOf = PROD.map(() => -1); S.pn.pos = PROD.map((p, k) => Object.assign({}, trayPos(k)));
  function targetOf(k) { const b = S.pn.bay[k]; return b < 0 ? trayPos(k) : slotPos(b, S.pn.slotOf[k]); }
  function placeAll(layout) { PROD.forEach((p, k) => { S.pn.bay[k] = -1; S.pn.slotOf[k] = -1; }); (layout || []).forEach(([k, b]) => { S.pn.bay[k] = b; S.pn.slotOf[k] = freeSlot(b, k); }); }
  function clearRoom() { placeAll([]); S.pn.drag = null; PROD.forEach((p, k) => { S.pn.pos[k] = Object.assign({}, trayPos(k)); }); }
  function planPointInBay(p) { for (let b = 0; b < 3; b++) { const r = BAYS[b]; if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return b; } return -1; }
  function planDown(p) {
    if (S.mode !== 'plan' || S.pn.sub !== 'room') return false;
    let best = -1, bd = 1e9;
    PROD.forEach((q, k) => { const t = S.pn.pos[k]; if (Math.abs(p.x - t.x) <= CARD.w / 2 + 4 && Math.abs(p.y - t.y) <= CARD.h / 2 + 4) { const d = Math.hypot(p.x - t.x, p.y - t.y); if (d < bd) { bd = d; best = k; } } });
    if (best < 0) return false;
    S.pn.drag = { k: best, ox: S.pn.pos[best].x - p.x, oy: S.pn.pos[best].y - p.y, from: S.pn.bay[best], fromSlot: S.pn.slotOf[best] };
    S.pn.bay[best] = -2; Sound.click(); return true;                 // -2: 들고 있는 중 (어느 칸에도 속하지 않아요)
  }
  function planMove(p) { const d = S.pn.drag; if (!d) return; S.pn.pos[d.k].x = clamp(p.x + d.ox, 20, VW - 20); S.pn.pos[d.k].y = clamp(p.y + d.oy, 20, SH - 10); }
  function planUp(p) {
    const d = S.pn.drag; if (!d) return;
    S.pn.drag = null;
    const b = planPointInBay(p);
    if (b >= 0) {
      const fs = freeSlot(b, d.k);
      if (fs >= 0) { S.pn.bay[d.k] = b; S.pn.slotOf[d.k] = fs; Sound.click(); parts.burst(slotPos(b, fs).x, slotPos(b, fs).y, { count: 6, speed: 60, size: 2.4, colors: ['#ffb400', '#14a058'], gravity: 0 }); }
      else { S.pn.bay[d.k] = d.from; S.pn.slotOf[d.k] = d.fromSlot; Sound.fail(); showHint(b === 0 ? '콘센트 1에는 기구를 한 개만 꽂을 수 있어요.' : '이 멀티탭은 이미 가득 찼어요 (4개까지).', 3200); }
    } else if (p.y < BAYS[0].y) { S.pn.bay[d.k] = -1; S.pn.slotOf[d.k] = -1; Sound.click(); }
    else { S.pn.bay[d.k] = d.from; S.pn.slotOf[d.k] = d.fromSlot; if (d.from === undefined) S.pn.bay[d.k] = -1; }
    updateCtl();
  }
  function stepPlan(dt) {
    PROD.forEach((p, k) => {
      if (S.pn.drag && S.pn.drag.k === k) return;
      const t = targetOf(k), q = S.pn.pos[k];
      q.x = SciSim.approach(q.x, t.x, dt, 14); q.y = SciSim.approach(q.y, t.y, dt, 14);
    });
    S.pn.saveView = SciSim.approach(S.pn.saveView, S.pn.sub === 'save' ? 1 : 0, dt, 5);
    S.pn.t2 = (S.pn.t2 || 0) + dt;
  }
  function drawCard(k, lift) {
    const p = PROD[k], q = S.pn.pos[k], w = CARD.w, h = CARD.h;
    D.shadow(() => { D.roundRect(q.x - w / 2, q.y - h / 2, w, h, 9); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: lift ? 12 : 4, y: lift ? 6 : 2 });
    ctx.strokeStyle = lift ? '#f26b3a' : '#d6dcea'; ctx.lineWidth = lift ? 2.5 : 1.5; D.roundRect(q.x - w / 2, q.y - h / 2, w, h, 9); ctx.stroke();
    T(q.x, q.y - h * 0.08, p.icon, PHONE ? 20 : 24, '#000', 'center', 700);
    T(q.x, q.y + h * 0.22, p.short, PHONE ? 10 : 11.5, '#26324a', 'center', 800);
    T(q.x, q.y + h * 0.42, f1(p.I) + ' A', PHONE ? 10 : 11.5, '#b45309', 'center', 800);
  }
  function drawPlan() {
    sceneBg();
    const sv = S.pn.saveView;
    if (S.pn.sub === 'save' || sv > 0.02) { ctx.globalAlpha = clamp(sv, 0, 1); drawSave(); ctx.globalAlpha = 1; }
    if (S.pn.sub === 'room' || sv < 0.98) { ctx.globalAlpha = clamp(1 - sv, 0, 1); drawRoom(); ctx.globalAlpha = 1; }
    drawPlanPanels();
  }
  function drawRoom() {
    T(14, 26, '🏠 원룸의 전기 기구를 콘센트에 나누어 꽂기', PHONE ? 14 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '카드(기구)를 끌어 콘센트 칸에 놓아요 · 한 콘센트의 전류가 ' + LIMIT + ' A를 넘으면 안 돼요', PHONE ? 11 : 13.5, '#5a6679', 'left', 700);
    // 대기 칸
    ctx.strokeStyle = '#cfd6e4'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); D.roundRect(8, 58, VW - 16, PHONE ? 66 : 76, 12); ctx.stroke(); ctx.setLineDash([]);
    BAYS.forEach((b, i) => {
      const I = bayI(i), over = I > LIMIT + 1e-9, full = bayList(i).length;
      panel(b.x, b.y, b.w, b.h, 12, over ? '#fff1f0' : '#fff');
      T(b.x + 10, b.y + 19, b.name, PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
      const bx = b.x + 10, bw = b.w - 20, by = b.y + 27;
      D.roundRect(bx, by, bw, 8, 4); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const f = clamp(I / (LIMIT * 1.4), 0, 1);
      if (f > 0.005) { ctx.save(); D.roundRect(bx, by, bw, 8, 4); ctx.clip(); ctx.fillStyle = over ? '#e2464b' : '#14a058'; ctx.fillRect(bx, by, bw * f, 8); ctx.restore(); }
      const lx = bx + bw / 1.4; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, by - 3); ctx.lineTo(lx, by + 11); ctx.stroke();
      T(b.x + b.w - 10, b.y + 19, f1(I) + ' / ' + LIMIT + ' A', PHONE ? 11.5 : 12.5, over ? '#b4231f' : '#14803f', 'right', 800);
      // 칸 표시
      for (let s = 0; s < b.cap; s++) { const sp = slotPos(i, s); ctx.strokeStyle = '#d6dcea'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); D.roundRect(sp.x - CARD.w / 2, sp.y - CARD.h / 2, CARD.w, CARD.h, 9); ctx.stroke(); ctx.setLineDash([]); }
      T(b.x + b.w / 2, b.y + b.h - 5, over ? '⚠️ 과부하!' : i === 0 ? '직접 꽂기 (1개)' : '멀티탭 (4구)', PHONE ? 11 : 11.5, over ? '#b4231f' : '#98a2b3', 'center', 800);
      void full;
    });
    PROD.forEach((p, k) => { if (!(S.pn.drag && S.pn.drag.k === k)) drawCard(k, false); });
    if (S.pn.drag) drawCard(S.pn.drag.k, true);
  }
  function drawSave() {
    T(14, 26, '💡 같은 밝기, 다른 전력량', PHONE ? 15 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, '하루 ' + HRS + '시간, 한 달(' + DAYS + '일) 동안 켰을 때의 전력량', PHONE ? 11.5 : 13.5, '#5a6679', 'left', 700);
    const E = [kwh(INC_W, HRS * DAYS), kwh(LED_W, HRS * DAYS)], cols = ['#f2873a', '#14a058'];
    // 전구 (같은 밝기로 켜져 있어요)
    [0, 1].forEach((i) => {
      const cx = PHONE ? 66 + i * 104 : 120 + i * 170, cy = 150;
      D.glow(cx, cy, 52, '#ffd447', 0.5); D.sphere(cx, cy, 20, '#fff2a8', { shadow: true });
      ctx.fillStyle = '#8a95a6'; ctx.fillRect(cx - 9, cy + 20, 18, 10);
      T(cx, cy + 56, i ? 'LED ' + LED_W + ' W' : '백열 ' + INC_W + ' W', PHONE ? 12.5 : 14, '#26324a', 'center', 800);
      T(cx, cy + 76, '같은 밝기', 12, '#5a6679', 'center', 700);
      if (i === 0 && !RM) for (let q = 0; q < 3; q++) { const ph = (S.t * 0.9 + q / 3) % 1; ctx.globalAlpha = 0.65 * (1 - ph); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 24 + q * 24, cy - 28 - ph * 24); ctx.quadraticCurveTo(cx - 18 + q * 24, cy - 36 - ph * 24, cx - 24 + q * 24, cy - 44 - ph * 24); ctx.stroke(); ctx.globalAlpha = 1; }
    });
    if (!RM) T(PHONE ? 66 : 120, 92, '열로 사라져요', 11.5, '#b4231f', 'center', 700, { alpha: 0.8 });
    // 막대 그래프
    const gx = PHONE ? 262 : 470, gw = PHONE ? 196 : 300, gy0 = 92, gh = 190, bw2 = PHONE ? 70 : 100;
    ctx.strokeStyle = 'rgba(120,135,160,.35)'; ctx.lineWidth = 1;
    [0, 5, 10].forEach((v) => { const yy = gy0 + gh - gh * v / MAXE_E; ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + gw, yy); ctx.stroke(); T(gx - 6, yy + 4, v + '', 12, '#3a465c', 'right', 800); });
    T(gx - 6, gy0 - 8, 'kWh', 11.5, '#5a6679', 'right', 700);
    [0, 1].forEach((i) => {
      const bx2 = gx + (gw / 2) * i + (gw / 2 - bw2) / 2, h2 = gh * E[i] / MAXE_E;
      D.roundRect(bx2, gy0 + gh - h2, bw2, h2, 8); ctx.fillStyle = cols[i]; ctx.fill();
      T(bx2 + bw2 / 2, gy0 + gh - h2 - 8, f1(E[i]) + ' kWh', 13.5, '#26324a', 'center', 800);
      T(bx2 + bw2 / 2, gy0 + gh + 18, i ? 'LED' : '백열전구', 12.5, '#3a465c', 'center', 800);
    });
  }
  const MAXE_E = 10;
  function drawPlanPanels() {
    const lw = PHONE ? VW - 24 : 400, lh = PHONE ? 150 : PH;
    panel(12, PY, lw, lh, 14);
    if (S.pn.sub === 'room') {
      T(26, PY + 24, '🛡️ 안전 수칙', 13.5, '#26324a', 'left', 800);
      let yy = PY + 44;
      ['소비 전력이 큰 기구(에어컨 · 히터 · 드라이어)는 한 콘센트에 몰아 꽂지 않아요.', '멀티탭은 정격 전류(' + LIMIT + ' A) 이내로만 써요. 멀티탭을 이어 꽂지 않아요.', '쓰지 않는 기구는 플러그를 뽑아 대기 전력을 줄여요.'].forEach((m) => { yy += textBlock(26, yy, lw - 40, '• ' + m, PHONE ? 12 : 13.5, '#26324a', PHONE ? 15 : 18, 800) + 4; });
    } else {
      T(26, PY + 24, '🔎 계산해 보기', 13.5, '#26324a', 'left', 800);
      T(26, PY + 52, INC_W + ' W × ' + HRS + ' h × ' + DAYS + '일 = ' + f1(kwh(INC_W, HRS * DAYS)) + ' kWh', PHONE ? 13.5 : 15, '#b45309', 'left', 800);
      T(26, PY + 80, LED_W + ' W × ' + HRS + ' h × ' + DAYS + '일 = ' + f1(kwh(LED_W, HRS * DAYS)) + ' kWh', PHONE ? 13.5 : 15, '#14803f', 'left', 800);
      T(26, PY + 112, '차이: ' + f1(kwh(INC_W, HRS * DAYS) - kwh(LED_W, HRS * DAYS)) + ' kWh 절약', PHONE ? 14 : 16, '#26324a', 'left', 800);
    }
    const rx = PHONE ? 12 : 424, ry = PHONE ? PY + lh + 10 : PY, rw = PHONE ? VW - 24 : VW - rx - 12, rh = PHONE ? PH - lh - 10 : PH;
    panel(rx, ry, rw, rh, 14);
    if (S.pn.sub === 'room') {
      T(rx + 14, ry + 24, '콘센트별 전류 합계', 13.5, '#26324a', 'left', 800);
      [0, 1, 2].forEach((b, i) => { const I = bayI(b), over = I > LIMIT + 1e-9; T(rx + 14, ry + 52 + i * 26, BAYS[b].name + ': ' + f1(I) + ' A' + (over ? ' ⚠️' : ''), PHONE ? 12.5 : 13.5, over ? '#b4231f' : '#26324a', 'left', 800); });
      textBlock(rx + 14, ry + 52 + 3 * 26 + 6, rw - 28, '6개 기구의 전류를 모두 더하면 ' + f1(ALL_I) + ' A예요. 한 콘센트(' + LIMIT + ' A)로는 부족해요.', PHONE ? 12 : 13, '#5a6679', 17, 700);
    } else {
      T(rx + 14, ry + 24, '왜 LED가 적게 쓸까?', 13.5, '#26324a', 'left', 800);
      let yy = ry + 48;
      ['백열전구는 전기 에너지의 대부분이 열로 사라져요.', 'LED는 같은 밝기를 훨씬 적은 전력으로 내요.', '소비 전력이 작으면 같은 시간 동안 쓰는 전력량도 작아요.'].forEach((m) => { yy += textBlock(rx + 14, yy, rw - 28, '• ' + m, PHONE ? 12 : 13.5, '#26324a', PHONE ? 15 : 18, 800) + 4; });
    }
  }
  $$('#subSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pn.sub = b.dataset.v; if (S.pn.sub === 'save') S.pn.seenSave = true; updateCtl(); }));
  $('#bClearRoom').addEventListener('click', () => { Sound.click(); clearRoom(); updateCtl(); });
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'home') {
        const k = homeHit(p); if (k >= 0) { togglePlug(k); return false; }
        if (p.x >= HM.bx - 4 && p.x <= HM.bx + HM.bw + 4 && p.y >= HM.by && p.y <= HM.by + HM.bh && S.hm.tripped) { resetBreaker(); return false; }
        return false;
      }
      return planDown(p);
    },
    move(p) { if (S.mode === 'plan') planMove(p); },
    up(p) { if (S.mode === 'plan') planUp(p); },
    hover(p) {
      if (S.mode === 'home') return homeHit(p) >= 0 ? 'pointer' : 'default';
      if (S.mode === 'plan' && S.pn.sub === 'room') return PROD.some((q, k) => Math.abs(p.x - S.pn.pos[k].x) <= CARD.w / 2 && Math.abs(p.y - S.pn.pos[k].y) <= CARD.h / 2) ? 'grab' : 'default';
      return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'rate') {
      const p = PROD[S.rt.sel], E = curE();
      L1 = '고른 제품'; a = p.name + ' ' + p.P + ' W';
      L2 = '정격 전류 I = P ÷ V'; b = S.rt.shown[p.id] ? f1(p.I) + ' A' : '? (계산해 보세요)';
      L3 = '전력량계'; c = E ? fT(E.E) + ' kWh' : '0 kWh';
    } else if (S.mode === 'conn') {
      const k = S.cn, calc = bulbCalc(k.conn, k.pair);
      L1 = '연결 · 전구'; a = CN_NAME[CK(k.conn, k.pair)];
      L2 = '각 전구의 소비 전력'; b = f1(calc.P[0]) + ' W · ' + f1(calc.P[1]) + ' W';
      L3 = '전체 소비 전력'; c = f1(calc.P[0] + calc.P[1]) + ' W';
    } else if (S.mode === 'home') {
      const h = S.hm, I = hmI();
      L1 = '전체 전류 (정격 ' + LIMIT + ' A)'; a = f1(I) + ' A';
      L2 = '전선 발열 I²R'; b = f1(wireHeat(I)) + ' W · ' + fmtN(wireTemp(I), 0) + ' °C';
      L3 = '차단기'; c = h.tripped ? '꺼짐 (작동!)' : hmIreq() > LIMIT + 1e-9 ? '곧 작동해요…' : '켜짐';
    } else if (S.pn.sub === 'room') {
      const placed = PROD.filter((p, k) => S.pn.bay[k] >= 0).length, mx = Math.max(bayI(0), bayI(1), bayI(2));
      L1 = '콘센트에 꽂은 기구'; a = placed + ' / ' + PROD.length + '개';
      L2 = '가장 큰 콘센트 전류'; b = f1(mx) + ' A';
      L3 = '판정'; c = mx > LIMIT + 1e-9 ? '⚠️ ' + LIMIT + ' A 초과' : placed < PROD.length ? '배치 중' : '안전해요';
    } else {
      L1 = '백열전구 ' + INC_W + ' W'; a = f1(kwh(INC_W, HRS * DAYS)) + ' kWh';
      L2 = 'LED ' + LED_W + ' W'; b = f1(kwh(LED_W, HRS * DAYS)) + ' kWh';
      L3 = '한 달 절약'; c = f1(kwh(INC_W, HRS * DAYS) - kwh(LED_W, HRS * DAYS)) + ' kWh';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const okCount = () => PROD.filter((p) => S.rt.ok[p.id]).length;
  const cnOK = (k) => !!S.cn.rec[k];
  const cP = bulbCalc('parallel', 'mixed'), cS = bulbCalc('series', 'mixed'), cPs = bulbCalc('parallel', 'same'), cSs = bulbCalc('series', 'same');
  const ex3 = PROD.filter((p) => ['ac', 'heater', 'cooker'].includes(p.id));
  const ex3I = Math.round(ex3.reduce((s, p) => s + p.I, 0) * 10) / 10, ex3W = ex3.reduce((s, p) => s + p.P, 0);
  const levels = [
    {
      title: '소비 전력: 제품에 적힌 W와 전류', short: '소비 전력', icon: '🔆', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 전구 두 개를 직렬로 켜면 어두워지는데, 멀티탭에 기구를 너무 많이 꽂으면 왜 위험할까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 전력은 1초 동안 쓰는 전기 에너지라고 배웠고, <b>앞 차시에서</b> 직렬·병렬연결의 전류와 전압을 직접 쟀어요. 이제 가정용 전기 제품의 <b>소비 전력</b>과 <b>전류</b>를 숫자로 따져 봐요.</div>' +
        '<p>전기 제품에는 정격 전압 ' + VOLT + ' V와 정격 전력(W)이 적혀 있어요. 전력은 <b>P = VI</b>이므로 정격 전류는 <b>I = P ÷ V</b>예요. 계산한 값을 전류계로 확인하고, 전력량계로 <b>전력량 E = Pt</b>도 살펴봐요.</p>',
      features: ['rate'],
      setup() { S.gate = ''; S.rt.ok = {}; S.rt.shown = {}; S.rt.calc = {}; S.rt.run = null; S.rt.lastE = null; S.rt.elog = []; S.rt.needle.target = 0; S.rt.needle.value = 0; $('#iIn').value = ''; $('#kIn').value = ''; S.rt.sel = 0; setScene('rate'); updateCtl(); },
      recap: '소비 전력 P = VI이므로 정격 전류는 I = P ÷ V예요. 전력은 1초당 쓰는 에너지(W)이고, 전력량 E = Pt는 쓴 에너지(kWh)예요.',
      summary: '<ul><li><b>소비 전력</b> P = VI (단위 W): 1초 동안 쓰는 전기 에너지예요.</li><li>정격 전류 I = P ÷ V. 예) ' + PROD[3].name + ' ' + PROD[3].P + ' W, ' + VOLT + ' V → ' + f1(PROD[3].I) + ' A</li><li><b>전력량</b> E = Pt (단위 kWh): 쓴 에너지의 양이에요. 예) ' + PROD[1].P + ' W 히터를 2시간 쓰면 ' + fT(kwh(PROD[1].P, 2)) + ' kWh</li><li>W는 <b>전력</b>(1초당 에너지)의 단위, kWh는 <b>전력량</b>(에너지)의 단위예요.</li></ul>',
      missions: [
        {
          title: '정격 전류 계산해서 확인하기',
          goal: '제품 <b>3개</b>를 골라 <b>I = P ÷ V</b>를 계산해 쓰고, <b>🔌 전류계로 확인</b>을 눌러 계산값과 전류계 눈금이 일치하는지 확인하세요.',
          hint: '제품을 고르고 정격 전력 ÷ ' + VOLT + ' V를 계산해 소수 첫째 자리까지 써요. 일치하면 표에 ✅가 생겨요.',
          setup() { S.gate = ''; setScene('rate'); updateCtl(); },
          check: () => okCount() >= 3,
          hold: 0.5,
          status: () => '일치한 제품 ' + okCount() + ' / 3 &nbsp; ' + PROD.map((p) => (S.rt.ok[p.id] ? '✅ ' + p.name : '')).filter(Boolean).join(' · '),
          explain: '전력 P = VI에서 I = P ÷ V예요. 예를 들어 ' + PROD[2].name + ' ' + PROD[2].P + ' W는 ' + PROD[2].P + ' ÷ ' + VOLT + ' ≈ <b>' + f1(PROD[2].I) + ' A</b>, ' + PROD[3].name + ' ' + PROD[3].P + ' W는 <b>' + f1(PROD[3].I) + ' A</b>예요. 전력이 클수록 전류도 커요.',
        },
        {
          title: '전력량 계산하기', manual: true,
          goal: '<b>1200 W</b> 전기 히터를 <b>2시간</b> 쓰면 전력량은 몇 kWh일까요? 계산해서 쓰고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '전력량 = 전력 × 시간이고 1 kW = 1000 W예요. 전기 히터를 고르고 2시간으로 ⏩ 사용해 보면 전력량계로 확인할 수 있어요.',
          setup() { S.gate = 'kwh'; $('#kIn').value = ''; setScene('rate'); updateCtl(); },
          check() {
            const v = parseNum($('#kIn').value), ans = kwh(PROD[1].P, 2);
            if (isNaN(v)) return '숫자로 써 주세요.';
            if (Math.abs(v - ans) <= 0.01) return true;
            if (Math.abs(v - PROD[1].P * 2) <= 1) return 'kWh 단위로 나타내야 해요. 1 kW = 1000 W예요.';
            return '다시 계산해 보세요. 전력량 = 전력(kW) × 시간(h)이에요.';
          },
          status: () => ($('#kIn').value.trim() === '' ? '답을 써 주세요' : '쓴 값: ' + $('#kIn').value + ' kWh'),
          explain: '전력량 E = Pt = ' + fmtN(PROD[1].P / 1000, 1) + ' kW × 2 h = <b>' + fT(kwh(PROD[1].P, 2)) + ' kWh</b>예요. 소비 전력이 같아도 오래 쓰면 쓴 에너지(전력량)가 늘어나요.',
        },
        {
          type: 'quiz', title: 'W와 kWh의 차이',
          goal: '전기 제품에 적힌 <b>W</b>와 전기 요금 고지서의 <b>kWh</b>에 대한 설명으로 옳은 것은?',
          setup() { S.gate = ''; setScene('rate'); updateCtl(); },
          choices: ['둘 다 에너지의 단위예요', 'W는 1초당 쓰는 에너지(전력)의 단위이고, kWh는 쓴 에너지(전력량)의 단위예요', 'W는 쓴 에너지의 단위이고, kWh는 전력의 단위예요', '둘 다 전력의 단위예요'],
          answer: 1,
          feedback: ['W는 에너지가 아니라 1초 동안 쓰는 에너지, 즉 전력이에요. 전력량계로 시간을 곱해 보세요.', '', '서로 바뀌었어요. 전력량은 전력에 시간을 곱한 값이에요.', 'kWh는 전력(kW)에 시간(h)을 곱한 값이라서 전력이 아니라 에너지예요.'],
          explain: '<b>W</b>(= J/s)는 1초 동안 쓰는 에너지, 즉 <b>전력</b>의 단위예요. <b>kWh</b>는 전력(kW) × 시간(h)이라서 <b>쓴 에너지</b>(전력량)의 단위예요. 전기 요금은 쓴 에너지인 kWh에 따라 정해져요.',
        },
      ],
    },
    {
      title: '연결과 소비 전력: 직렬과 병렬의 전구', short: '연결과 전력', icon: '💡', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 정격 전력은 정격 전압 ' + VOLT + ' V에서의 소비 전력이라는 것을 알았어요. 그럼 전구를 <b>직렬</b>로 연결하면 어떻게 될까요?</div>' +
        '<p>전구의 저항은 R = V² ÷ P예요. ' + B1 + ' W 전구는 약 <b>' + fmtN(RB(B1), 0) + ' Ω</b>, ' + B2 + ' W 전구는 <b>' + fmtN(RB(B2), 0) + ' Ω</b>이에요. 병렬과 직렬로 바꿔 가며 각 전구의 소비 전력 <b>P = I²R</b>과 밝기를 비교해 봐요. 전구의 밝기는 소비 전력에 따라 정해져요.</p>',
      features: ['conn'],
      setup() { S.gate = ''; S.cn.rec = {}; S.cn.last = null; S.cn.conn = 'parallel'; S.cn.pair = 'mixed'; setScene('conn'); updateCtl(); },
      recap: '병렬에서는 각 전구가 정격 전력으로 켜지고, 직렬에서는 저항이 큰 전구가 더 밝고 둘 다 정격보다 어두워요. 같은 전구 둘은 병렬이면 전체 전력이 2배, 직렬이면 절반이에요.',
      summary: '<ul><li>전구의 저항 R = V² ÷ P: ' + B1 + ' W → 약 ' + fmtN(RB(B1), 0) + ' Ω, ' + B2 + ' W → ' + fmtN(RB(B2), 0) + ' Ω</li><li><b>병렬</b>: 각 전구에 ' + VOLT + ' V → ' + f1(cP.P[0]) + ' W, ' + f1(cP.P[1]) + ' W (합 ' + f1(cP.P[0] + cP.P[1]) + ' W)</li><li><b>직렬</b>: 같은 전류가 흘러 P = I²R, 저항이 큰 ' + B1 + ' W 전구가 ' + f1(cS.P[0]) + ' W로 더 밝고 ' + B2 + ' W 전구는 ' + f1(cS.P[1]) + ' W (합 ' + f1(cS.P[0] + cS.P[1]) + ' W로 줄어요)</li><li>같은 전구 두 개: 병렬 전체 전력 ' + f1(cPs.P[0] + cPs.P[1]) + ' W = 2P₀, 직렬 ' + f1(cSs.P[0] + cSs.P[1]) + ' W = P₀의 절반</li><li>정격 전력은 <b>정격 전압에서의 값</b>이에요. W 숫자가 큰 전구가 항상 더 밝은 것은 아니에요.</li></ul>',
      missions: [
        {
          title: '병렬과 직렬의 소비 전력 기록하기',
          goal: '<b>병렬 · 직렬</b>로 바꿔 가며 <b>60 W + 100 W</b>, <b>100 W + 100 W</b> 두 경우를 모두 <b>📏 전력 재서 기록</b>하세요. (모두 4가지)',
          hint: '연결 방법과 전구를 고른 뒤 📏 단추를 눌러요. 병렬·직렬 각각에서 두 가지 전구 조합을 기록해요.',
          setup() { S.gate = ''; setScene('conn'); updateCtl(); },
          check: () => Object.keys(CN_NAME).every(cnOK),
          hold: 0.6,
          status: () => Object.keys(CN_NAME).map((k) => mark(cnOK(k)) + ' ' + CN_NAME[k]).join(' &nbsp; '),
          explain: '병렬은 각 전구에 ' + VOLT + ' V가 걸려 정격대로 <b>' + f1(cP.P[0]) + ' W · ' + f1(cP.P[1]) + ' W</b>예요. 직렬은 같은 전류가 흘러 P = I²R이므로 저항이 큰 ' + B1 + ' W 전구가 <b>' + f1(cS.P[0]) + ' W</b>, ' + B2 + ' W 전구가 <b>' + f1(cS.P[1]) + ' W</b>이고 전체 전력은 ' + f1(cS.P[0] + cS.P[1]) + ' W로 줄어요. 같은 전구 둘은 병렬이면 <b>2P₀</b>(' + f1(cPs.P[0] + cPs.P[1]) + ' W), 직렬이면 <b>P₀의 절반</b>(' + f1(cSs.P[0] + cSs.P[1]) + ' W)이에요.',
        },
        {
          type: 'quiz', title: '직렬에서 더 밝은 전구는?',
          goal: '<b>' + B1 + ' W 전구와 ' + B2 + ' W 전구</b>를 직렬로 연결했을 때 더 밝은 전구는?',
          setup() { S.gate = ''; setScene('conn'); S.cn.conn = 'series'; S.cn.pair = 'mixed'; updateCtl(); },
          choices: [B2 + ' W 전구 — 정격 전력이 더 크므로', B1 + ' W 전구 — 저항이 더 커서 소비 전력이 더 크므로', '두 전구의 밝기가 같다 — 전류가 같으므로', '두 전구 모두 정격 전력으로 켜진다'],
          answer: 1,
          feedback: ['정격 전력은 정격 전압(' + VOLT + ' V)에서의 값이에요. 직렬에서는 전구에 걸리는 전압이 달라서 바뀌어요. 📏로 직접 재 보세요.', '', '전류는 같지만 소비 전력 P = I²R은 저항 R이 큰 쪽이 더 커요.', '직렬에서는 전압이 나뉘어서 두 전구 모두 정격 전력보다 어두워요.'],
          explain: '직렬에서는 두 전구에 같은 전류가 흘러서 소비 전력 <b>P = I²R</b>은 저항이 큰 전구가 커요. 저항이 큰 ' + B1 + ' W 전구(' + f1(cS.P[0]) + ' W)가 ' + B2 + ' W 전구(' + f1(cS.P[1]) + ' W)보다 밝고, 둘 다 정격 전력보다 어두워요. 정격 전력이 큰 전구가 항상 더 밝은 것은 아니에요.',
        },
      ],
    },
    {
      title: '과부하: 멀티탭에 너무 많이 꽂으면', short: '과부하', icon: '🔌', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 병렬로 연결하면 각 기구에 ' + VOLT + ' V가 걸리고 기구를 더할수록 <b>전류가 더해진다</b>는 것을 알았어요. 집 안의 전기 기구도 모두 병렬로 연결되어 있어요.</div>' +
        '<p>멀티탭의 정격 전류는 <b>' + LIMIT + ' A</b>(' + LIMIT_W + ' W)예요. 기구를 하나씩 꽂으며 전체 전류가 얼마나 늘어나는지 보고, 전선이 <b>얼마나 뜨거워지는지</b>(발열 P = I²r, 전선 저항 r = ' + fmtN(WIRE_R, 2) + ' Ω) 살펴봐요. ' + LIMIT + ' A를 넘으면 차단기가 내려가요.</p>',
      features: ['home'],
      setup() { S.gate = ''; S.hm.on = PROD.map(() => false); S.hm.tripped = false; S.hm.ov = 0; S.hm.trips = 0; S.hm.seenN = {}; S.hm.temp = T0; setScene('home'); updateCtl(); },
      recap: '병렬로 기구를 더 꽂을수록 전체 전류가 커지고, 전선 발열 I²r은 전류의 제곱에 비례해 더 크게 늘어요. 정격 전류를 넘으면 위험해서 차단기가 전류를 끊어요.',
      summary: '<ul><li>집 안의 기구는 <b>병렬</b>로 연결되어 각각 ' + VOLT + ' V가 걸려요. 기구를 더 꽂을수록 <b>전체 전류</b>가 더해져 늘어요.</li><li>멀티탭 정격 ' + LIMIT + ' A(' + LIMIT_W + ' W). 예) ' + ex3.map((p) => p.name).join(' + ') + ' = ' + ex3W + ' W → ' + f1(ex3I) + ' A (' + LIMIT + ' A 초과, 과부하)</li><li>전선 발열 <b>P = I²r</b>: ' + LIMIT + ' A에서 ' + f1(wireHeat(LIMIT)) + ' W, 전류가 2배(' + (2 * LIMIT) + ' A)면 발열은 <b>4배</b>(' + f1(wireHeat(2 * LIMIT)) + ' W)예요.</li><li>과부하가 계속되면 전선이 뜨거워져 화재 위험이 있어서 <b>차단기·퓨즈</b>가 전류를 끊어요. 퓨즈는 전류가 크면 열로 녹아 끊어져요.</li></ul>',
      missions: [
        {
          title: '하나씩 꽂으며 전체 전류 기록하기',
          goal: '기구를 <b>하나씩 3개</b> 꽂아 보세요. 꽂을 때마다 전체 전류가 기록표에 쌓여요.',
          hint: '아래 기구 단추나 그림의 기구를 눌러 하나씩 꽂아요. 꽂을 때마다 전체 전류가 얼마나 늘어나는지 살펴보세요.',
          setup() { S.gate = ''; S.hm.on = PROD.map(() => false); S.hm.tripped = false; S.hm.ov = 0; S.hm.seenN = {}; setScene('home'); updateCtl(); },
          check: () => !!(S.hm.seenN[1] && S.hm.seenN[2] && S.hm.seenN[3]),
          hold: 0.6,
          status: () => [1, 2, 3].map((n) => mark(S.hm.seenN[n]) + ' ' + n + '개' + (S.hm.seenN[n] ? ' (' + f1(S.hm.seenN[n].I) + ' A)' : '')).join(' &nbsp; '),
          explain: '병렬로 꽂는 기구가 늘어날수록 각 기구의 전류가 더해져 <b>전체 전류가 커져요</b>. 소비 전력이 큰 기구일수록 전류가 많이 늘어요.',
        },
        {
          title: '한계를 넘는 조합 찾기',
          goal: '전체 전류가 <b>' + LIMIT + ' A</b>를 넘도록 기구를 꽂아 <b>차단기가 작동</b>하게 해 보세요.',
          hint: ex3.map((p) => p.name).join(' + ') + ' = ' + f1(ex3I) + ' A처럼 ' + LIMIT + ' A를 넘는 조합을 만들어요. 넘은 채로 잠시 두면 차단기가 내려가요.',
          setup() { S.gate = ''; S.hm.on = PROD.map(() => false); S.hm.tripped = false; S.hm.ov = 0; S.hm.trips = 0; setScene('home'); updateCtl(); },
          check: () => S.hm.trips >= 1,
          hold: 0.3,
          status: () => mark(hmIreq() > LIMIT + 1e-9 || S.hm.trips >= 1) + ' ' + LIMIT + ' A 넘기기 &nbsp; ' + mark(S.hm.trips >= 1) + ' 차단기 작동',
          explain: ex3.map((p) => p.name).join(' + ') + '의 소비 전력은 ' + ex3W + ' W로 ' + LIMIT_W + ' W보다 커서 전류가 <b>' + f1(ex3I) + ' A</b>예요. 이때 전선 발열은 ' + f1(wireHeat(ex3I)) + ' W로 ' + LIMIT + ' A일 때(' + f1(wireHeat(LIMIT)) + ' W)보다 커져요. 차단기는 이런 과부하에서 회로를 끊어 화재를 막아요.',
        },
        {
          type: 'quiz', title: '전류가 2배가 되면 전선의 발열은?',
          goal: '멀티탭에 흐르는 전류가 <b>2배</b>가 되면 전선에서 생기는 발열(P = I²r)은 몇 배가 될까요?',
          setup() { S.gate = ''; setScene('home'); updateCtl(); },
          choices: ['2배', '4배', '변하지 않아요', '절반으로 줄어요'],
          answer: 1,
          feedback: ['발열은 전류에 비례하지 않고 전류의 제곱에 비례해요(P = I²r). ' + LIMIT + ' A일 때 ' + f1(wireHeat(LIMIT)) + ' W와 ' + (2 * LIMIT) + ' A일 때를 비교해 보세요.', '', '전류가 커지면 발열도 커져요. 그림의 전선 발열 숫자를 비교해 보세요.', '전류가 커지면 전선은 더 뜨거워져요.'],
          explain: '발열 P = I²r이므로 전류가 2배가 되면 발열은 <b>4배</b>예요. ' + LIMIT + ' A일 때 ' + f1(wireHeat(LIMIT)) + ' W, ' + (2 * LIMIT) + ' A일 때 ' + f1(wireHeat(2 * LIMIT)) + ' W예요. 그래서 한 멀티탭에 기구를 이어 꽂는 문어발식 연결은 매우 위험해요.',
        },
      ],
    },
    {
      title: '안전 설계: 콘센트 배치와 절약', short: '안전 설계', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전류가 ' + LIMIT + ' A를 넘으면 전선이 뜨거워져 위험하다는 것을 알았어요. 이제 배운 것을 <b>안전한 전기 사용</b>에 적용해 봐요.</div>' +
        '<p>원룸에는 전기 기구 6개와 콘센트 3곳이 있어요(콘센트 2 · 3에는 멀티탭이 하나씩 있어요). <b>어느 콘센트도 ' + LIMIT + ' A를 넘지 않게</b> 나누어 꽂아 보고, 백열전구와 LED의 <b>에너지 절약</b>도 따져 봐요.</p>',
      features: ['plan'],
      setup() { S.gate = ''; S.pn.sub = 'room'; clearRoom(); setScene('plan'); updateCtl(); },
      recap: '소비 전력이 큰 기구는 콘센트에 나누어 꽂아 어느 곳도 정격 전류를 넘지 않게 해요. 소비 전력이 작은 LED는 같은 밝기에서 전력량을 크게 줄여요.',
      summary: '<ul><li>기구 6개의 전류 합은 ' + f1(ALL_I) + ' A라서 한 콘센트(' + LIMIT + ' A)로는 부족해요. <b>콘센트마다 ' + LIMIT + ' A 이내</b>가 되게 나누어 꽂아요.</li><li>안전 수칙: 큰 전력 기구(에어컨 · 히터 · 드라이어)는 한 곳에 몰아 꽂지 않기, 멀티탭 이어 꽂지 않기, 안 쓰는 기구는 플러그 뽑기(대기 전력).</li><li>같은 전압에서 저항이 작아지면 소비 전력이 커져요(P = V² ÷ R). 전열기구의 발열선을 짧게 하면 전력이 커지고, 드라이어의 강·약은 발열선의 연결(직렬·병렬)을 바꾸어 전력을 조절해요.</li><li>백열전구 ' + INC_W + ' W와 LED ' + LED_W + ' W를 하루 ' + HRS + '시간, ' + DAYS + '일 켜면 ' + f1(kwh(INC_W, HRS * DAYS)) + ' kWh와 ' + f1(kwh(LED_W, HRS * DAYS)) + ' kWh예요.</li></ul>',
      missions: [
        {
          title: '콘센트에 나누어 꽂기', manual: true,
          goal: '기구 <b>6개</b>를 모두 콘센트 1~3에 꽂되, <b>어느 콘센트도 ' + LIMIT + ' A를 넘지 않게</b> 하세요. 다 꽂았으면 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드를 끌어 콘센트 칸에 놓아요. 전류가 큰 드라이어(' + f1(PROD[3].I) + ' A)와 에어컨(' + f1(PROD[0].I) + ' A)을 서로 다른 콘센트에 나누고, 나머지를 채워 보세요.',
          setup() { S.gate = ''; S.pn.sub = 'room'; clearRoom(); setScene('plan'); updateCtl(); },
          check() {
            const left = PROD.filter((p, k) => S.pn.bay[k] < 0).length;
            if (left) return '아직 콘센트에 꽂지 않은 기구가 ' + left + '개 있어요.';
            const bad = [0, 1, 2].filter((b) => bayI(b) > LIMIT + 1e-9);
            if (bad.length) return '콘센트 ' + (bad[0] + 1) + '의 전류가 ' + f1(bayI(bad[0])) + ' A로 ' + LIMIT + ' A를 넘어요. 큰 전력 기구를 다른 콘센트로 옮겨 보세요.';
            return true;
          },
          status: () => '꽂은 기구 ' + PROD.filter((p, k) => S.pn.bay[k] >= 0).length + ' / ' + PROD.length + ' · 콘센트별 ' + [0, 1, 2].map((b) => f1(bayI(b)) + ' A').join(' / '),
          explain: '기구 6개의 전류 합은 ' + f1(ALL_I) + ' A로 콘센트 하나(' + LIMIT + ' A)로는 안 되지만, 나누어 꽂으면 모든 콘센트가 ' + LIMIT + ' A 이내가 돼요. 예) 드라이어 ' + f1(PROD[3].I) + ' A / 에어컨 + 밥솥 + 충전기 ' + f1(PROD[0].I + PROD[2].I + PROD[5].I) + ' A / 히터 + 전자레인지 ' + f1(PROD[1].I + PROD[4].I) + ' A. 소비 전력이 큰 기구는 한곳에 몰지 않는 것이 안전해요.',
        },
        {
          type: 'quiz', title: '발열선을 반으로 줄이면?',
          goal: '전열기구의 발열선을 <b>반으로</b> 줄이면 저항이 <b>반</b>이 돼요. 전압이 같을 때 소비 전력은 어떻게 될까요?',
          setup() { S.gate = ''; setScene('plan'); updateCtl(); },
          choices: ['절반이 된다', '변하지 않는다', '2배가 된다', '4배가 된다'],
          answer: 2,
          feedback: ['P = V² ÷ R에서 R이 작아지면 P는 커져요.', 'R이 반이 되면 같은 전압에서 전류가 2배가 되어 전력이 달라져요.', '', 'R이 반이 되면 P = V² ÷ R은 2배가 돼요. 4배는 전압이 2배일 때예요.'],
          explain: '같은 전압에서 <b>P = V² ÷ R</b>이므로 R이 반이 되면 소비 전력은 <b>2배</b>가 돼요. 드라이어의 강·약 스위치는 발열선의 연결(직렬·병렬)을 바꾸어 저항을 달리해서 전력을 조절해요. 같은 R 두 개를 병렬로 하면 전력이 2배(2P₀), 직렬로 하면 절반(P₀의 절반)이었죠?',
        },
        {
          type: 'quiz', title: 'LED로 바꾸면 얼마나 절약될까?',
          goal: '같은 밝기의 백열전구(' + INC_W + ' W)를 LED(' + LED_W + ' W)로 바꾸면, 하루 ' + HRS + '시간씩 ' + DAYS + '일 동안 줄어드는 전력량은?',
          setup() { S.gate = ''; S.pn.sub = 'save'; S.pn.seenSave = true; setScene('plan'); updateCtl(); },
          choices: [f1(kwh(LED_W, HRS * DAYS)) + ' kWh', f1(kwh(INC_W, HRS * DAYS) - kwh(LED_W, HRS * DAYS)) + ' kWh', f1(kwh(INC_W, HRS * DAYS)) + ' kWh', f1(kwh(INC_W, HRS * DAYS) + kwh(LED_W, HRS * DAYS)) + ' kWh'],
          answer: 1,
          feedback: ['LED가 쓰는 전력량이에요. 줄어드는 양은 백열전구와의 차이예요.', '', '백열전구가 쓰는 전력량이에요. LED도 일부는 쓰니까 줄어드는 양은 그보다 작아요.', '두 전력량의 합이 아니라 차이를 구해야 해요.'],
          explain: '백열전구 ' + INC_W + ' W × ' + HRS + ' h × ' + DAYS + '일 = ' + f1(kwh(INC_W, HRS * DAYS)) + ' kWh, LED ' + LED_W + ' W × ' + HRS + ' h × ' + DAYS + '일 = ' + f1(kwh(LED_W, HRS * DAYS)) + ' kWh예요. 차이는 <b>' + f1(kwh(INC_W, HRS * DAYS) - kwh(LED_W, HRS * DAYS)) + ' kWh</b>로, 같은 밝기에서 소비 전력이 작은 LED가 에너지를 아껴요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-electric-power', mount: '#game', badge: '전기 안전 박사', homeHref: '../../index.html#hp',
    featureLabels: { rate: '🔆 제품 명판 · 전류계 · 전력량계', conn: '💡 직렬·병렬 전구와 소비 전력 막대', home: '🔌 멀티탭 · 전선 발열 · 차단기', plan: '🏠 콘센트 배치 · LED 절약' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  clearRoom();
  setScene('rate');
  updateCtl();
  function stepAll1(dt) {
    if (S.mode === 'rate') stepRate(dt); else if (S.mode === 'conn') stepConn(dt); else if (S.mode === 'home') stepHome(dt); else stepPlan(dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    if (S.mode === 'rate') drawRate(); else if (S.mode === 'conn') drawConn(); else if (S.mode === 'home') drawHome(); else drawPlan();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SH, PY, PH, HM, BAYS, CARD, PROD, get game() { return game; },
    setScene, togglePlug, resetBreaker, rtConfirm, rtRun, cnRecord, bayI, placeAll, homeHit, hmCx, trayPos, slotPos, clearRoom,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
