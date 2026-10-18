/* =========================================================
   물리학 Ⅱ. 전기와 자기 - 전동기와 스피커 (단원 6차시)
   성취기준 [12물리02-05] 전류의 자기 작용을 이용하여 에너지를 전환하는 장치의 원리를 알고, 스피커와 전동기 등을 설계할 수 있다.
   ① 실험: 자기장 속 도선이 받는 힘 F = BIL (힘의 요인)
   ② 모형: 전동기 (코일 · 정류자 · 입력 전력 · 열 · 출력, 부하와 막힘)
   ③ 설명: 스피커의 원리 (보이스 코일 · 진동판, 진폭과 진동수)
   ④ 적용: 스피커 설계 (사양 확인 → 선택 → 시험 → 개선)
   정류자의 상세 회로, 교류·유도 전동기, 토크 식, 스피커 공진 주파수 식, 임피던스는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
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
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const sgn = (v) => (v >= 0 ? '+' : '−');
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const r2 = (v) => Math.round(v * 100) / 100;
  const fmtF = (F) => { let s = F.toFixed(3); if (s.endsWith('0')) s = s.slice(0, -1); return s; };   // 0.200 → 0.20, 0.025 그대로
  function dotSym(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TAU); ctx.fillStyle = '#26324a'; ctx.fill(); }
  function crossSym(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.6; ctx.stroke(); const k = r * 0.62; ctx.beginPath(); ctx.moveTo(x - k, y - k); ctx.lineTo(x + k, y + k); ctx.moveTo(x + k, y - k); ctx.lineTo(x - k, y + k); ctx.stroke(); }
  function spring(x1, x2, y, coils, amp, color) {
    ctx.strokeStyle = color || '#7a8599'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x1, y);
    const n = coils * 2, d = (x2 - x1) / (n + 2); ctx.lineTo(x1 + d, y);
    for (let i = 0; i < n; i++) ctx.lineTo(x1 + d * (i + 1.5), y + (i % 2 ? amp : -amp));
    ctx.lineTo(x2 - d, y); ctx.lineTo(x2, y); ctx.stroke();
  }

  /* ---------- 모델 상수 (화면의 숫자와 모두 같은 값) ---------- */
  // ① 자기장 속 도선
  const B_LV = [0.2, 0.4, 0.6], L_LV = [0.1, 0.25, 0.4], I_MAX = 4, L_ROD = 0.4;
  const B0 = 0.4, I0 = 2.0, L0 = 0.25;                          // 기준 조건 (F = 0.20 N)
  const PRED = { B: 0.4, I: 3.0, L: 0.4 };                      // 예측 문제의 조건 → 0.48 N
  // ② 전동기
  const V_SUP = 24, R_COIL = 1.5, TURNS = 50, B_M = 0.4, SIDE_L = 0.25, COIL_W = 0.1;
  const K_M = TURNS * B_M * (SIDE_L * COIL_W);                  // 토크 상수 = N·B·(L×폭) = 0.5 N·m/A
  const J_ROT = 0.05, LOAD0 = 1.0, T_ROOM = 20, T_BURN = 150, C_TH = 15, H_TH = 0.5, P_SCALE = 400;
  const SLOW_M = 0.125;                                         // 화면에서 보이는 회전은 실제의 1/8
  const arrowOf = (F) => F * 3.4;                               // 힘 화살표 (px/N)
  // ③ 스피커
  const N3 = 50, B3 = 0.4, R3 = N3 * 0.06, K_SUSP = 300, LT = TAU * 0.015, A_MAX = 0.2, SLOW_SP = 500, SOUND_EFF = 0.02, PXMM = 20, XGAP = 1.5;
  const xAmp3 = (A) => N3 * B3 * A * LT / K_SUSP * 1000;       // 진동판 진폭 (mm)
  // ④ 설계
  const FC_BASE = 3000, M_REF = 3.0;
  const CUP = { small: { A: 20, m: { thin: 1.5, thick: 3.0 }, cost: 4 }, large: { A: 60, m: { thin: 3.0, thick: 6.0 }, cost: 9 } };
  const MAT_COST = { thin: 2, thick: 5 };
  const WIRE = { thin: { mw: 0.03, rt: 0.06, cost: 4 }, thick: { mw: 0.06, rt: 0.03, cost: 9 } };
  const MAG_COST = { 0.2: 6, 0.4: 14, 0.6: 26 };
  const I_DES = 0.1, F_LO = 200, F_HI = 4000;
  const COIL_X0 = 40, COIL_W3 = 46, POLE0 = COIL_X0 + COIL_W3 / 2 - (COIL_W3 + 2 * XGAP * PXMM) / 2, POLE1 = POLE0 + COIL_W3 + 2 * XGAP * PXMM;   // 자석 틈의 범위 (그림 좌표)
  const SPEC = { l1: 5.0, l3: 2.5, gap: XGAP };
  const designOf = (d) => {
    const F = d.N * d.B * I_DES * LT, x0 = F / K_SUSP * 1000, cup = CUP[d.cup];
    const m = cup.m[d.mat] + d.N * WIRE[d.wire].mw, fc = FC_BASE * M_REF / m;
    const X = (f) => x0 / Math.sqrt(1 + (f / fc) * (f / fc));
    const L = (f) => X(f) * cup.A / 10;
    const R = d.N * WIRE[d.wire].rt;
    return { F, x0, m, fc, X, L, R, P: I_DES * I_DES * R * 1000, cost: d.N * 0.5 + MAG_COST[d.B] + cup.cost + MAT_COST[d.mat] + WIRE[d.wire].cost,
      l1: r2(L(1000)), l3: r2(L(3000)), xmax: r2(X(F_LO)) };
  };
  const sigOf = (d) => [d.N, d.B, d.cup, d.mat, d.wire].join('|');

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'force', fade: 0, t: 0,
    f: { B: 0.4, I: 2.0, L: 0.25, dir: 1, par: false, x: new SciSim.Spring(0, { stiffness: 190, damping: 17 }), rows: [], seen: {}, showF: false, pred: '' },
    mt: { on: false, load: LOAD0, stall: false, w: 0, I: 0, phi: 0, T: T_ROOM, burnt: false, seen: {}, stallT: 0, nomT: 0, heavyT: 0, lastCos: 1, eta: '' },
    sp: { kind: 'ac', A: 0.05, f: 400, ph: 0, x: 0, hist: [], hAcc: 0, rings: [], ringAcc: 0, seen: {}, hold: 0 },
    ds: { N: 40, B: 0.4, cup: 'small', mat: 'thin', wire: 'thin', tested: '', sweep: -1, sweepF: 0, ph: 0, why: {}, whyOK: {} },
    hits: [], press: null,
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');

  /* ---------- 화면(뷰) ---------- */
  const VIEWS = [
    { id: 'force', label: '⚡ 힘의 요인', grp: 0 },
    { id: 'motor', label: '⚙️ 전동기', grp: 1 },
    { id: 'speaker', label: '🔊 스피커 원리', grp: 2 },
    { id: 'design', label: '🛠️ 스피커 설계', grp: 3 },
  ];
  const viewSeg = $('#viewSeg');
  VIEWS.forEach((v) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.view = v.id; b.textContent = v.label;
    b.addEventListener('click', () => { Sound.click(); setScene(v.id); });
    viewSeg.appendChild(b);
  });
  let need = '';
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.press = null; }
    S.mode = mode;
    $('#tbLabel').textContent = VIEWS.find((v) => v.id === mode).label;
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-need')) on = n.getAttribute('data-need') === need;
      if (on && n.id === 'freqCtl') on = S.sp.kind === 'ac';
      n.hidden = !on;
    });
    const lvl = game ? game.level : 0, free = !!(game && game.free);
    let shown = 0;
    $$('#viewSeg button').forEach((b) => {
      const v = VIEWS.find((x) => x.id === b.dataset.view);
      const vis = free || v.grp === lvl;
      b.hidden = !vis; if (vis) shown++;
      b.classList.toggle('on', b.dataset.view === S.mode);
    });
    $('#viewCtl').hidden = shown < 2;
    const sync = (id, v) => $$(id + ' button').forEach((b) => b.classList.toggle('on', String(+b.dataset.v) === String(v) || b.dataset.v === String(v)));
    sync('#dirSeg', S.f.dir); sync('#bSeg', S.f.B); sync('#lSeg', S.f.L);
    const sc = $('#sCur'); if (+sc.value !== S.f.I) sc.value = S.f.I; sc.style.setProperty('--pct', (S.f.I / I_MAX * 100) + '%'); $('#oCur').textContent = f1(S.f.I) + ' A';
    $$('#pwSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === S.mt.on));
    const sl = $('#sLoad'); if (+sl.value !== S.mt.load) sl.value = S.mt.load; sl.style.setProperty('--pct', ((S.mt.load - 0.5) / 7 * 100) + '%'); $('#oLoad').textContent = f1(S.mt.load) + ' N·m';
    const bs = $('#bStall'); bs.textContent = S.mt.burnt ? '🔧 수리하기' : S.mt.stall ? '🔓 막기 풀기' : '🛑 회전 막기';
    $$('#kindSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sp.kind));
    const sa = $('#sAmp'); if (+sa.value !== S.sp.A) sa.value = S.sp.A; sa.style.setProperty('--pct', (S.sp.A / A_MAX * 100) + '%'); $('#oAmp').textContent = f2(S.sp.A) + ' A';
    const sf = $('#sFrq'); if (+sf.value !== S.sp.f) sf.value = S.sp.f; sf.style.setProperty('--pct', ((S.sp.f - 200) / 1800 * 100) + '%'); $('#oFrq').textContent = S.sp.f + ' Hz';
    const st = $('#sTurn'); if (+st.value !== S.ds.N) st.value = S.ds.N; st.style.setProperty('--pct', ((S.ds.N - 20) / 80 * 100) + '%'); $('#oTurn').textContent = S.ds.N + '회';
    sync('#wireSeg', S.ds.wire); sync('#magSeg', S.ds.B); sync('#cupSeg', S.ds.cup); sync('#matSeg', S.ds.mat);
  }

  /* ================= ① 도선이 받는 힘 ================= */
  const G1 = PHONE
    ? { lpx: 400, y1: 72, xr0: 74, xr1: 470, pl: 124, pr: 424, xc: 274, fw: 176, sx: 18, sw: 46, kd: 40, ka: 100 }
    : { lpx: 600, y1: 94, xr0: 116, xr1: 490, pl: 170, pr: 430, xc: 300, fw: 224, sx: 14, sw: 88, kd: 60, ka: 150 };
  G1.y2 = G1.y1 + L_ROD * G1.lpx; G1.ym = (G1.y1 + G1.y2) / 2;
  const sinTh = (f) => (f.par ? 0 : 1);
  const forceSigned = (f) => f.dir * f.B * f.I * f.L * sinTh(f);   // N, + 는 오른쪽
  const nChanged = (f) => (f.B !== B0 ? 1 : 0) + (f.I !== I0 ? 1 : 0) + (f.L !== L0 ? 1 : 0);
  function stepForce(dt) {
    const f = S.f, Fs = forceSigned(f);
    f.x.target = Fs * G1.kd; f.x.update(dt);
    if (S.mode === 'force' && f.I > 0 && !f.par) {
      if (Fs > 0.04) f.seen.right = true;
      if (Fs < -0.04) f.seen.left = true;
    }
    if (S.mode === 'force' && f.par && f.I > 0) { f.parT = (f.parT || 0) + dt; if (f.parT > 1.0) f.seen.par = true; } else f.parT = 0;
  }
  function record() {
    const f = S.f;
    if (f.par) { SciSim.toast('도선을 자기장과 수직으로 놓고 측정해요.', 'bad'); Sound.fail(); return; }
    if (f.I <= 0) { SciSim.toast('전류를 0보다 크게 해야 힘을 측정할 수 있어요.', 'bad'); Sound.fail(); return; }
    if (nChanged(f) > 1 && !(game && game.free)) { SciSim.toast('한 번에 하나만 바꿔요. 기준(0.40 T · 2.0 A · 0.25 m)에서 하나만 바꾼 값을 기록해요.', 'bad'); Sound.fail(); return; }
    const row = { B: f.B, I: f.I, L: f.L, F: f.B * f.I * f.L, dir: f.dir };
    const i = S.f.rows.findIndex((r) => r.B === row.B && r.I === row.I && r.L === row.L);
    if (i >= 0) S.f.rows[i] = row; else S.f.rows.push(row);
    Sound.success(); parts.burst(G1.xc + f.x.value, G1.ym, { count: 8, speed: 100, size: 3, colors: ['#ffb400', '#f26b3a', '#3867f4'], gravity: 150 });
  }
  const rowBase = (r) => r.B === B0 && r.I === I0 && r.L === L0;
  const rowI = (r) => r.B === B0 && r.L === L0 && r.I !== I0;
  const rowB = (r) => r.I === I0 && r.L === L0 && r.B !== B0;
  const rowL = (r) => r.B === B0 && r.I === I0 && r.L !== L0;
  function drawForce(dt) {
    const f = S.f, g = G1;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    const Fs = forceSigned(f), F = Math.abs(Fs);
    // 바닥판
    const bw = PHONE ? 456 : 500, bh = PHONE ? 298 : 350;
    D.roundRect(PHONE ? 12 : 14, PHONE ? 8 : 14, bw, bh, 14); ctx.fillStyle = '#f7f9fd'; ctx.fill(); ctx.strokeStyle = '#dfe5ef'; ctx.lineWidth = 2; ctx.stroke();
    T(PHONE ? 24 : 28, PHONE ? 30 : 38, '위에서 내려다본 모습 · 도선(막대)이 레일 위에 놓여 있어요', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    // 자기장 영역
    const fh = f.L * g.lpx, fx = g.xc - g.fw / 2;
    D.roundRect(fx, g.ym - fh / 2, g.fw, fh, 12); ctx.fillStyle = 'rgba(124,92,255,.12)'; ctx.fill();
    ctx.strokeStyle = 'rgba(124,92,255,.65)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); D.roundRect(fx, g.ym - fh / 2, g.fw, fh, 12); ctx.clip();
    const gx = PHONE ? 30 : 36, gy = PHONE ? 26 : 30;
    if (!f.par) { for (let x = fx + gx / 2; x < fx + g.fw; x += gx) for (let y = g.ym - fh / 2 + gy / 2; y < g.ym + fh / 2; y += gy) dotSym(x, y, 4.6); }
    else { for (let x = fx + gx / 2; x < fx + g.fw; x += gx) for (let y = g.ym - fh / 2 + gy / 2; y < g.ym + fh / 2; y += gy) D.arrow(x, y + 9, x, y - 9, { color: '#7c5cff', width: 2, head: 7 }); }
    ctx.restore();
    T(fx, g.ym - fh / 2 - 8, f.par ? '자기장 B ↑ (도선과 나란한 방향)' : '자기장 B ⊙ (화면 밖으로)', PHONE ? 12 : 13.5, '#5b3fd0', 'left', 800);
    T(fx + g.fw + 6, g.ym - fh / 2 + 14, 'L = ' + f2(f.L) + ' m', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    // 레일 + 전원
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g.xr0, g.y1); ctx.lineTo(g.xr1, g.y1); ctx.moveTo(g.xr0, g.y2); ctx.lineTo(g.xr1, g.y2); ctx.stroke();
    ctx.strokeStyle = '#b6bfcd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.xr0, g.y1 - 1); ctx.lineTo(g.xr1, g.y1 - 1); ctx.moveTo(g.xr0, g.y2 - 1); ctx.lineTo(g.xr1, g.y2 - 1); ctx.stroke();
    D.shadow(() => { D.roundRect(g.sx, g.ym - 54, g.sw, 108, 10); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 2 });
    T(g.sx + g.sw / 2, g.ym - 30, '전원', PHONE ? 12 : 13, '#fff', 'center', 800);
    T(g.sx + g.sw / 2, g.ym + 4, f1(f.I) + ' A', PHONE ? 14 : 16, '#ffd447', 'center', 800);
    T(g.sx + g.sw / 2, g.ym + 28, f.I > 0 ? (f.dir > 0 ? '↑ 위로' : '↓ 아래로') : '꺼짐', PHONE ? 11.5 : 13, '#cfd6e2', 'center', 800);
    ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.sx + g.sw, g.ym - 40); ctx.lineTo(g.xr0 - 6, g.ym - 40); ctx.lineTo(g.xr0 - 6, g.y1); ctx.lineTo(g.xr0, g.y1); ctx.moveTo(g.sx + g.sw, g.ym + 40); ctx.lineTo(g.xr0 - 6, g.ym + 40); ctx.lineTo(g.xr0 - 6, g.y2); ctx.lineTo(g.xr0, g.y2); ctx.stroke();
    // 받침(스프링 고정대)
    [g.pl, g.pr].forEach((x) => { D.roundRect(x - 6, g.ym - 16, 12, 32, 3); ctx.fillStyle = '#6b7488'; ctx.fill(); });
    const rx = g.xc + f.x.value;
    spring(g.pl + 6, rx - 7, g.ym, 7, 7); spring(rx + 7, g.pr - 6, g.ym, 7, 7);
    // 도선(막대)
    const inL = Math.min(f.L, L_ROD) * g.lpx;
    D.shadow(() => { D.roundRect(rx - 7, g.y1 - 4, 14, g.y2 - g.y1 + 8, 6); const gr = ctx.createLinearGradient(rx - 7, 0, rx + 7, 0); gr.addColorStop(0, '#f2f5fa'); gr.addColorStop(0.5, '#b9c2d0'); gr.addColorStop(1, '#7f8a9c'); ctx.fillStyle = gr; ctx.fill(); }, { blur: 5, y: 2 });
    if (f.I > 0) { D.roundRect(rx - 7, g.ym - inL / 2, 14, inL, 5); ctx.fillStyle = 'rgba(255,180,0,.55)'; ctx.fill(); }
    // 전류 점
    if (f.I > 0) {
      ctx.fillStyle = '#e2552a';
      const n = 6;
      for (let i = 0; i < n; i++) { const q = ((S.t * (0.4 + f.I * 0.18) * f.dir + i / n) % 1 + 1) % 1; const y = g.y2 - q * (g.y2 - g.y1); ctx.beginPath(); ctx.arc(rx, y, 3, 0, TAU); ctx.fill(); }
      D.arrow(rx + 24, g.y1 + 40, rx + 24, g.y1 + 8, { color: '#e2552a', width: 3, head: 10, alpha: f.dir > 0 ? 1 : 0 });
      D.arrow(rx + 24, g.y1 + 8, rx + 24, g.y1 + 40, { color: '#e2552a', width: 3, head: 10, alpha: f.dir < 0 ? 1 : 0 });
      T(rx + 34, g.y1 + 30, 'I', 13, '#c2410c', 'left', 800);
    }
    // 힘 화살표
    const al = F * g.ka;
    if (al >= 6) { D.arrow(rx, g.ym, rx + Math.sign(Fs) * al, g.ym, { color: '#14a058', width: 6, head: Math.min(16, al * 0.6) }); T(rx + Math.sign(Fs) * (al + 8), g.ym - 12, 'F', 14, '#0f7a43', Fs > 0 ? 'left' : 'right', 800); }
    // 자석 눕히기 버튼
    S.hits = [];
    const bx = fx, by = g.y2 + 26, bw2 = PHONE ? 150 : 176, bh2 = 40;
    D.roundRect(bx, by, bw2, bh2, 20); ctx.fillStyle = f.par ? '#fff1dd' : '#fff'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = f.par ? '#f2873a' : '#9aa7bd'; ctx.stroke();
    T(bx + bw2 / 2, by + 26, f.par ? '🧲 자기장 수직으로' : '🧲 자기장 나란하게', PHONE ? 13 : 14.5, '#26324a', 'center', 800);
    S.hits.push({ x: bx, y: by, w: bw2, h: bh2, fn: () => { f.par = !f.par; Sound.click(); updateCtl(); } });
    // 설명 상자 (태블릿: 아래, 폰: 생략)
    if (!PHONE) {
      const lx = 14, ly = g.y2 + 76, lw = 500, lh = VH - ly - 14;
      panel(lx, ly, lw, lh, 14);
      T(lx + 14, ly + 26, '힘의 방향', 14, '#26324a', 'left', 800);
      D.arrow(lx + 60, ly + 86, lx + 60, ly + 44, { color: '#e2552a', width: 4, head: 12 }); T(lx + 60, ly + 106, '전류 I', 13, '#c2410c', 'center', 800);
      dotSym(lx + 150, ly + 66, 9); T(lx + 150, ly + 106, '자기장 B', 13, '#5b3fd0', 'center', 800);
      D.arrow(lx + 220, ly + 66, lx + 270, ly + 66, { color: '#14a058', width: 4, head: 12 }); T(lx + 245, ly + 106, '힘 F', 13, '#0f7a43', 'center', 800);
      textBlock(lx + 300, ly + 48, lw - 316, '힘은 전류와 자기장에 모두 수직이에요. 전류나 자기장의 방향을 바꾸면 힘의 방향도 반대가 돼요.', 13.5, '#3a465c', 19, 800);
    }
    // 힘 센서 + 기록표
    drawForceData();
    parts.update(dt); parts.draw(ctx);
  }
  function drawForceData() {
    const f = S.f, Fs = forceSigned(f), F = Math.abs(Fs);
    const px = PHONE ? 12 : 524, pw = PHONE ? 456 : 264, py = PHONE ? 308 : 14;
    const sh = PHONE ? 74 : 110;
    panel(px, py, pw, sh, 14);
    T(px + 14, py + 24, '힘 센서의 값', 13.5, '#26324a', 'left', 800);
    T(px + pw - 14, py + 24, Fs === 0 ? '힘 없음' : (Fs > 0 ? '→ 오른쪽으로 밀어요' : '← 왼쪽으로 밀어요'), 13, '#0f7a43', 'right', 800);
    T(px + 14, py + (PHONE ? 58 : 66), 'F = ' + fmtF(F) + ' N', PHONE ? 24 : 30, '#14653b', 'left', 800);
    if (!PHONE) {
      if (S.f.showF || (game && game.free)) T(px + 14, py + 96, 'F = B × I × L  (θ = ' + (f.par ? '0°' : '90°') + ')', 13, '#5a6679', 'left', 800);
    } else if (S.f.showF || (game && game.free)) T(px + pw - 14, py + 58, 'F = B × I × L', 13.5, '#5a6679', 'right', 800);
    // 기록표
    const ty = PHONE ? py + sh + 10 : py + sh + 12, th = PHONE ? VH - ty - 12 : VH - ty - 14;
    panel(px, ty, pw, th, 14);
    T(px + 14, ty + 24, '측정 기록표', 13.5, '#26324a', 'left', 800);
    const cols = PHONE ? [px + 14, px + 120, px + 210, px + 300] : [px + 12, px + 70, px + 128, px + 186];
    ['B (T)', 'I (A)', 'L (m)', 'F (N)'].forEach((h, i) => T(cols[i], ty + 46, h, 12.5, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 10, ty + 53); ctx.lineTo(px + pw - 10, ty + 53); ctx.stroke();
    const rh = PHONE ? 26 : 29, nrows = Math.floor((th - 70) / rh), rows = S.f.rows.slice(-nrows);
    rows.forEach((r, i) => {
      const y = ty + 54 + i * rh + rh / 2 + 5, hi = (v, b) => (v !== b ? '#c2410c' : '#26324a');
      T(cols[0], y, f2(r.B), 14, hi(r.B, B0), 'left', 800); T(cols[1], y, f1(r.I), 14, hi(r.I, I0), 'left', 800); T(cols[2], y, f2(r.L), 14, hi(r.L, L0), 'left', 800); T(cols[3], y, fmtF(r.F) + (r.dir > 0 ? ' →' : ' ←'), 14, '#14653b', 'left', 800);
    });
    if (!rows.length) T(px + pw / 2, ty + 54 + 40, '📏 기록하기를 눌러 값을 모아요', 13.5, '#98a2b3', 'center', 700);
    T(px + pw - 14, ty + th - 10, '주황색 = 기준(0.40 T · 2.0 A · 0.25 m)과 다른 값', PHONE ? 11 : 10.5, '#7b8aa3', 'right', 700);
  }

  /* ================= ② 전동기 ================= */
  function stepMotor(dt) {
    const m = S.mt;
    const steps = Math.max(1, Math.ceil(dt / 0.004)), h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const live = m.on && !m.burnt;
      if (m.stall) { m.w = 0; m.I = live ? V_SUP / R_COIL : 0; }
      else if (live) {
        m.I = Math.max(0, (V_SUP - K_M * m.w) / R_COIL);
        m.w = Math.max(0, m.w + (K_M * m.I - m.load) / J_ROT * h);
      } else { m.I = 0; m.w = Math.max(0, m.w - m.load / J_ROT * h); }
      const heat = m.I * m.I * R_COIL;
      m.T += (heat - H_TH * (m.T - T_ROOM)) / C_TH * h;
      if (m.T < T_ROOM) m.T = T_ROOM;
    }
    if (!m.burnt && m.T >= T_BURN) { m.burnt = true; m.on = false; m.stall = false; Sound.fail(); updateCtl(); for (let k = 0; k < 18; k++) parts.emit({ x: 249 + (Math.random() - 0.5) * 60, y: 160, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 50, life: 2.2, size: 12, color: '#555b66', shape: 'smoke', fade: true, grow: 14 }); }
    m.pin = V_SUP * m.I; m.heat = m.I * m.I * R_COIL; m.pout = K_M * m.w * m.I;
    m.phi += m.w * SLOW_M * dt;
    const cs = Math.cos(m.phi);
    if (Math.sign(cs) !== Math.sign(m.lastCos) && m.I > 0.2 && S.mode === 'motor' && !RM) {
      const g = G2; parts.burst(g.rx + (cs > 0 ? 6 : -6), g.ry - g.rr - 4, { count: 4, speed: 80, size: 2, colors: ['#ffd447', '#fff'], gravity: 120, life: 0.35 });
    }
    m.lastCos = cs;
    // 미션 기록
    const near = (a, b, e) => Math.abs(a - b) < e;
    if (m.on && !m.stall && !m.burnt && m.load === LOAD0 && near(m.I, I0, 0.05)) m.nomT += dt; else m.nomT = 0;
    if (m.on && !m.stall && !m.burnt && m.load >= 4 && m.I >= 8 - 0.05) m.heavyT += dt; else m.heavyT = 0;
    if (m.on && m.stall && !m.burnt && near(m.I, V_SUP / R_COIL, 0.01)) m.stallT += dt; else if (!m.stall) m.stallT = 0;
    if (m.heavyT > 0.8) m.seen.heavy = true;
    if (m.stallT > 1.0) m.seen.stall = true;
  }
  const G2 = PHONE
    ? { px: 12, py: 12, pw: 456, ph: 250, cx: 240, cy: 140, rr: 56, nx: 34, sx: 386, bw: 44, bh: 100 }
    : { px: 14, py: 14, pw: 470, ph: 300, cx: 249, cy: 176, rr: 78, nx: 36, sx: 404, bw: 60, bh: 150 };
  G2.rx = G2.cx; G2.ry = G2.cy;
  function drawMotor(dt) {
    const m = S.mt, g = G2;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    panel(g.px, g.py, g.pw, g.ph, 14);
    T(g.px + 14, g.py + 26, '자기장 속 코일의 단면 (축 방향에서 본 모습)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    // 자극
    [[g.nx, '#e2464b', 'N'], [g.sx, '#2f6df6', 'S']].forEach((p) => {
      D.shadow(() => { D.roundRect(p[0], g.cy - g.bh / 2, g.bw, g.bh, 8); ctx.fillStyle = p[1]; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(p[0] + 4, g.cy - g.bh / 2 + 4, g.bw - 8, 8);
      T(p[0] + g.bw / 2, g.cy + 8, p[2], PHONE ? 22 : 28, '#fff', 'center', 800);
    });
    const fx0 = g.nx + g.bw + 6, fx1 = g.sx - 6;
    ctx.save(); ctx.globalAlpha = 0.65;
    for (let k = -2; k <= 2; k++) D.arrow(fx0, g.cy + k * (g.bh / 5.4), fx1, g.cy + k * (g.bh / 5.4), { color: '#7c5cff', width: 1.8, head: 8, dash: [6, 6] });
    ctx.restore();
    T(g.cx, g.cy - g.bh / 2 - 8, '자기장 B (N → S)', PHONE ? 12 : 13, '#5b3fd0', 'center', 800);
    // 코일 (변 2개)
    const c = Math.cos(m.phi), s = Math.sin(m.phi);
    const ax = g.cx + g.rr * c, ay = g.cy + g.rr * s, bx = g.cx - g.rr * c, by = g.cy - g.rr * s;
    ctx.lineCap = 'round'; ctx.strokeStyle = m.burnt ? '#2a1d19' : '#a65d22'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = m.burnt ? '#5a4036' : '#e39a45'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    D.sphere(g.cx, g.cy, 6, '#394258', { gloss: false });
    const live = m.I > 0.01;
    [[ax, ay], [bx, by]].forEach((p) => {
      const right = p[0] > g.cx;
      if (live) { right ? crossSym(p[0], p[1], 10) : dotSym(p[0], p[1], 10); } else D.sphere(p[0], p[1], 9, m.burnt ? '#4a3a33' : '#e39a45', { gloss: false });
      if (live) {
        const Fside = TURNS * B_M * m.I * SIDE_L, len = Math.min(90, arrowOf(Fside)), dir = right ? 1 : -1;      // 오른쪽 변은 아래로, 왼쪽 변은 위로
        if (len >= 4) D.arrow(p[0], p[1] + dir * 14, p[0], p[1] + dir * (14 + len), { color: '#14a058', width: 5, head: Math.min(14, len * 0.7) });
      }
    });
    if (live) {
      const Fside = TURNS * B_M * m.I * SIDE_L;
      T(g.cx, g.py + g.ph - 12, '각 변이 받는 힘 F = ' + f1(Fside) + ' N' + (arrowOf(Fside) > 90 ? ' (화살표는 일정 길이까지만 그려요)' : ''), PHONE ? 11.5 : 13, '#0f7a43', 'center', 800);
    } else T(g.cx, g.py + g.ph - 12, m.burnt ? '코일이 타 버렸어요. 수리하기를 눌러요.' : '전원을 켜면 코일에 전류가 흘러요.', PHONE ? 11.5 : 13, '#5a6679', 'center', 800);
    T(g.px + 14, g.py + 46, '코일 ' + TURNS + '회 · B ' + f2(B_M) + ' T · 변 길이 ' + f2(SIDE_L) + ' m · 느리게 보여요(1/8)', PHONE ? 10.5 : 12, '#5a6679', 'left', 700);
    if (m.burnt) { D.label(g.cx, g.cy - g.bh / 2 + 6, '소손!', { bg: '#e2464b', size: 16 }); }
    // 에너지 패널
    drawMotorEnergy();
    drawCommutator();
    drawMotorFlow();
    parts.update(dt); parts.draw(ctx);
  }
  function drawMotorEnergy() {
    const m = S.mt;
    const px = PHONE ? 12 : 496, py = PHONE ? 272 : 14, pw = PHONE ? 456 : 290, ph = PHONE ? 120 : 300;
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 26, '전력 (W) · 눈금 0 ~ ' + P_SCALE + ' W', 13.5, '#26324a', 'left', 800);
    const rows = [['입력 P = V × I', m.pin, '#2f6df6'], ['열 I²R', m.heat, '#e2464b'], ['출력 (운동)', m.pout, '#14a058']];
    const lh = PHONE ? 28 : 54, bx = px + (PHONE ? 130 : 14), bw = pw - (PHONE ? 130 + 78 : 28);
    rows.forEach((r, i) => {
      const y = py + (PHONE ? 38 : 48) + i * lh;
      if (PHONE) T(px + 14, y + 14, r[0], 12.5, '#3a465c', 'left', 800); else T(bx, y, r[0], 13, '#3a465c', 'left', 800);
      const by = PHONE ? y + 3 : y + 8, bh = PHONE ? 16 : 20;
      ctx.fillStyle = '#eef1f7'; ctx.fillRect(bx, by, bw, bh);
      const w = bw * clamp(r[1] / P_SCALE, 0, 1); if (w > 0.1) { ctx.fillStyle = r[2]; ctx.fillRect(bx, by, w, bh); }
      T(PHONE ? px + pw - 14 : bx + bw, PHONE ? by + 13 : y, f1(r[1]) + ' W', PHONE ? 13.5 : 14, r[2], 'right', 800);
    });
    if (!PHONE) {
      T(px + 14, py + 224, 'V = ' + V_SUP + ' V  ·  코일 저항 R = ' + f1(R_COIL) + ' Ω', 13, '#3a465c', 'left', 800);
      T(px + 14, py + 248, '전류 I = ' + f1(m.I) + ' A  ·  회전 ' + f1(m.w / TAU) + ' 회/초', 13, '#3a465c', 'left', 800);
      T(px + 14, py + 272, '입력 = 열 + 출력', 13, '#5a6679', 'left', 800);
      if (S.mt.showEta || (game && game.free)) T(px + pw - 14, py + 272, '효율 ' + (m.pin > 0.5 ? Math.round(m.pout / m.pin * 100) : 0) + ' %', 14, '#0f7a43', 'right', 800);
    }
  }
  function drawCommutator() {
    const m = S.mt;
    const px = PHONE ? 12 : 14, py = PHONE ? 402 : 326, pw = PHONE ? 222 : 300, ph = PHONE ? 170 : 220;
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 24, '🔍 정류자와 솔', 13.5, '#26324a', 'left', 800);
    const cx = px + pw / 2, cy = py + (PHONE ? 78 : 100), r = PHONE ? 30 : 44, th = PHONE ? 9 : 12;
    const a0 = m.phi;
    [['#e2464b', a0 + 0.12, a0 + Math.PI - 0.12], ['#2f6df6', a0 + Math.PI + 0.12, a0 + TAU - 0.12]].forEach((sgm) => { ctx.beginPath(); ctx.arc(cx, cy, r, sgm[1], sgm[2]); ctx.strokeStyle = sgm[0]; ctx.lineWidth = th; ctx.lineCap = 'butt'; ctx.stroke(); });
    D.sphere(cx, cy, 5, '#394258', { gloss: false });
    [[cx, cy - r - th / 2 - 8, '+', '#e2464b'], [cx, cy + r + th / 2 + 8, '−', '#2f6df6']].forEach((b) => {
      D.roundRect(b[0] - 12, b[1] - 8, 24, 16, 3); ctx.fillStyle = '#4a5568'; ctx.fill(); T(b[0] + 22, b[1] + 5, b[2], 15, b[3], 'center', 800);
    });
    textBlock(px + 14, py + ph - (PHONE ? 26 : 38), pw - 28, PHONE ? '반 바퀴마다 전류 방향이 바뀌어요' : '반 바퀴마다 솔이 닿는 쪽이 바뀌어 코일의 전류 방향이 반대가 돼요.', PHONE ? 11.5 : 12.5, '#5a6679', 16, 700);
  }
  function drawMotorFlow() {
    const m = S.mt;
    const px = PHONE ? 244 : 326, py = PHONE ? 402 : 326, pw = PHONE ? 224 : 460, ph = PHONE ? 170 : 220;
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 24, '에너지 전환', 13.5, '#26324a', 'left', 800);
    if (!PHONE) {
      const bw = 112, bh = 56, y = py + 56;
      [[px + 14, '전기 에너지', '#2f6df6'], [px + 174, '전동기', '#566178'], [px + 334, '운동 에너지', '#14a058']].forEach((b) => {
        D.roundRect(b[0], y, bw, bh, 12); ctx.fillStyle = C.rgba(b[2], 0.12); ctx.fill(); ctx.strokeStyle = b[2]; ctx.lineWidth = 2; ctx.stroke(); T(b[0] + bw / 2, y + 33, b[1], 14, '#26324a', 'center', 800);
      });
      const w1 = 2 + 18 * clamp(m.pin / P_SCALE, 0, 1), w2 = 2 + 18 * clamp(m.pout / P_SCALE, 0, 1);
      D.arrow(px + 14 + bw + 4, y + bh / 2, px + 174 - 4, y + bh / 2, { color: '#2f6df6', width: w1, head: 10 + w1 * 0.6 });
      D.arrow(px + 174 + bw + 4, y + bh / 2, px + 334 - 4, y + bh / 2, { color: '#14a058', width: w2, head: 10 + w2 * 0.6 });
      D.arrow(px + 230, y + bh + 4, px + 230, y + bh + 30, { color: '#e2464b', width: 2 + 18 * clamp(m.heat / P_SCALE, 0, 1), head: 12 });
      T(px + 244, y + bh + 24, '열 ' + f1(m.heat) + ' W', 13, '#c0392b', 'left', 800);
      T(px + 14 + bw / 2, y + bh + 20, f1(m.pin) + ' W', 13.5, '#1d4ed8', 'center', 800); T(px + 334 + bw / 2, y + bh + 20, f1(m.pout) + ' W', 13.5, '#0f7a43', 'center', 800);
    } else {
      T(px + 14, py + 50, '전기 ' + f1(m.pin) + ' W', 13, '#1d4ed8', 'left', 800); T(px + 14, py + 70, '→ 운동 ' + f1(m.pout) + ' W', 13, '#0f7a43', 'left', 800); T(px + 14, py + 90, '→ 열 ' + f1(m.heat) + ' W', 13, '#c0392b', 'left', 800);
    }
    // 코일 온도
    const tx = px + 14, ty = py + ph - (PHONE ? 46 : 54), tw = pw - 28;
    T(tx, ty - 6, '코일 온도 ' + Math.round(m.T) + ' °C', 13, m.T > 100 ? '#b42318' : '#26324a', 'left', 800);
    T(tx + tw, ty - 6, T_BURN + ' °C에서 소손', 12, '#b42318', 'right', 800);
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(tx, ty, tw, 14);
    const w = tw * clamp((m.T - T_ROOM) / (T_BURN - T_ROOM), 0, 1); if (w > 0.1) { ctx.fillStyle = C.mix('#ffb400', '#e2464b', clamp((m.T - T_ROOM) / (T_BURN - T_ROOM), 0, 1)); ctx.fillRect(tx, ty, w, 14); }
    T(tx, ty + 30, T_ROOM + ' °C', 11.5, '#5a6679', 'left', 700); T(tx + tw, ty + 30, T_BURN + ' °C', 11.5, '#5a6679', 'right', 700);
  }

  /* ================= ③ 스피커 원리 ================= */
  function stepSpeaker(dt) {
    const s = S.sp;
    const fv = s.f / SLOW_SP;
    s.ph += TAU * fv * dt; if (s.ph > 1e4) s.ph -= 1e4 - (1e4 % TAU);
    const cur = s.kind === 'ac' ? s.A * Math.sin(s.ph) : s.A;
    s.i = cur;
    const xt = xAmp3(cur);                                    // mm
    s.x = SciSim.approach(s.x, xt, dt, 40);
    s.hAcc += dt; while (s.hAcc >= 0.02) { s.hAcc -= 0.02; s.hist.push({ t: S.t, i: cur, x: xt }); }
    while (s.hist.length && S.t - s.hist[0].t > 2.05) s.hist.shift();
    if (s.kind === 'ac' && s.A > 0.005) { s.ringAcc += dt * fv; while (s.ringAcc >= 1) { s.ringAcc -= 1; s.rings.push({ r: 4, a: clamp(s.A / A_MAX, 0.15, 1) }); } }
    s.rings.forEach((r) => { r.r += dt * 150; });
    s.rings = s.rings.filter((r) => r.r < 300);
    if (s.kind === 'ac' && s.A >= 0.15 && s.f >= 1000) s.hold += dt; else s.hold = 0;
    if (s.hold > 0.5) s.seen.both = true;
  }
  const G3 = PHONE
    ? { px: 12, py: 12, pw: 456, ph: 230, cy: 128, ox: 40, sc: 0.8 }
    : { px: 14, py: 14, pw: 500, ph: 330, cy: 184, ox: 52, sc: 1 };
  // 스피커 단면: o = {cx, cy, sc, x (mm), i (A), big, thick, turns, bmag, forces}
  function drawSpeakerSection(o) {
    const sc = o.sc, X = o.x * PXMM * sc;
    ctx.save(); ctx.translate(o.ox, o.cy); ctx.scale(sc, sc);
    const px = (v) => v;       // (0,0) = 자석 뒤판의 축 높이
    // 자석 (고정)
    const bcol = o.bmag != null ? clamp((o.bmag - 0.2) / 0.4, 0, 1) : 0.5;
    // 자석의 자기장이 센 구간은 x = POLE0 ~ POLE1 (코일 폭 + 양쪽 틈 한계 ±XGAP)
    D.shadow(() => { D.roundRect(-14, -96, 24, 192, 5); ctx.fillStyle = '#7a8599'; ctx.fill(); }, { blur: 6, y: 2 });
    [[-96, -62], [62, 96]].forEach((b) => { D.roundRect(POLE0, b[0], POLE1 - POLE0, b[1] - b[0], 5); ctx.fillStyle = C.mix('#8aa7f2', '#2f6df6', bcol); ctx.fill(); ctx.strokeStyle = 'rgba(40,50,70,.5)'; ctx.lineWidth = 1.4; ctx.stroke(); });
    D.roundRect(POLE0, -28, POLE1 - POLE0, 56, 5); ctx.fillStyle = C.mix('#f2a0a3', '#e2464b', bcol); ctx.fill(); ctx.strokeStyle = 'rgba(40,50,70,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
    T((POLE0 + POLE1) / 2, 7, 'N', 18, '#fff', 'center', 800); T((POLE0 + POLE1) / 2, -74, 'S', 15, '#fff', 'center', 800); T((POLE0 + POLE1) / 2, 88, 'S', 15, '#fff', 'center', 800);
    // 방사형 자기장 화살표 (중심 N → 바깥 S)
    ctx.save(); ctx.globalAlpha = 0.9;
    [POLE0 + 20, (POLE0 + POLE1) / 2, POLE1 - 20].forEach((x) => { D.arrow(x, -30, x, -58, { color: '#7c5cff', width: 1.8, head: 7 }); D.arrow(x, 30, x, 58, { color: '#7c5cff', width: 1.8, head: 7 }); });
    ctx.restore();
    const big = o.big, ry = big ? 136 : 100, rimx = 222, fry = ry + 14;
    // 프레임
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(POLE1, -96); ctx.lineTo(200, -fry); ctx.lineTo(200, -fry - 10); ctx.moveTo(POLE1, 96); ctx.lineTo(200, fry); ctx.lineTo(200, fry + 10); ctx.stroke();
    // 움직이는 부분
    ctx.save(); ctx.translate(X / sc, 0);
    const coneC = o.thick ? '#b88a4a' : '#f1e7d0';
    ctx.strokeStyle = 'rgba(80,60,30,.6)'; ctx.lineWidth = 1.4;
    const thick = o.thick ? 9 : 5;
    [[-1], [1]].forEach((sg) => {
      const s = sg[0];
      ctx.beginPath(); ctx.moveTo(86, s * 46); ctx.lineTo(rimx, s * ry); ctx.lineTo(rimx, s * (ry - thick)); ctx.lineTo(86 + thick * 0.4, s * (46 - thick * 0.6)); ctx.closePath(); ctx.fillStyle = coneC; ctx.fill(); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(86, -46); ctx.quadraticCurveTo(112, 0, 86, 46); ctx.strokeStyle = 'rgba(80,60,30,.6)'; ctx.lineWidth = 3; ctx.stroke();
    // 보이스 코일 (틈 속)
    const n = Math.round((o.turns || N3) / 10), cw = 46;
    [[-1], [1]].forEach((sg) => {
      const s = sg[0], yc = s * 45;
      D.roundRect(86 - cw, yc - 5, cw, 10, 2); ctx.fillStyle = '#d9b27a'; ctx.fill();
      ctx.strokeStyle = '#a65d22'; ctx.lineWidth = 2; for (let k = 0; k < n; k++) { const x = 86 - cw + (k + 0.5) * cw / n; ctx.beginPath(); ctx.moveTo(x, yc - 5); ctx.lineTo(x, yc + 5); ctx.stroke(); }
    });
    // 전류 기호와 힘 화살표
    if (o.i != null && Math.abs(o.i) > 0.004) {
      const pos = o.i > 0;
      [[-1], [1]].forEach((sg) => {
        const s = sg[0], yc = s * 45, inward = (s < 0) === pos;      // 위쪽 코일: 전류가 양일 때 화면 안쪽(×)
        const sx = 86 - cw / 2;
        if (inward) crossSym(sx, yc - s * 16, 7); else dotSym(sx, yc - s * 16, 7);
        if (o.forces) { const Fi = o.nTurns * o.bT * Math.abs(o.i) * LT, len = Fi * 100; if (len >= 5) D.arrow(sx, yc + s * 12, sx + (pos ? 1 : -1) * len, yc + s * 12, { color: '#14a058', width: 4, head: Math.min(11, len * 0.7) }); }
      });
    }
    ctx.restore();
    // 서라운드·스파이더(스프링)
    ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 2;
    [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(200, s * fry); ctx.quadraticCurveTo((200 + rimx + X / sc) / 2, s * (fry + 8), rimx + X / sc, s * (ry - 2)); ctx.stroke(); });
    ctx.restore();
  }
  function drawSpeaker(dt) {
    const s = S.sp, g = G3;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    panel(g.px, g.py, g.pw, g.ph, 14);
    T(g.px + 14, g.py + 26, '스피커의 단면', PHONE ? 13 : 14, '#26324a', 'left', 800);
    T(g.px + g.pw - 14, g.py + 26, '화면은 실제보다 ' + SLOW_SP + '배 느려요', PHONE ? 11.5 : 12.5, '#5a6679', 'right', 800);
    // 공기 파동 링 (진동판 앞에서 퍼져 나감)
    const x0 = g.px + g.ox + 222 * g.sc + s.x * PXMM * g.sc, cy = g.py + g.cy;
    ctx.save(); D.roundRect(g.px + 4, g.py + 34, g.pw - 8, g.ph - 40, 12); ctx.clip();
    s.rings.forEach((r) => { ctx.strokeStyle = C.rgba('#3867f4', 0.5 * r.a * (1 - r.r / 300)); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x0 - 20, cy, r.r, -0.9, 0.9); ctx.stroke(); });
    ctx.restore();
    // 단면 그림 (그림 안의 좌표는 g.py 기준)
    drawSpeakerSection({ ox: g.px + g.ox, cy: g.py + g.cy, sc: g.sc, x: s.x, i: s.i, big: false, thick: false, turns: N3, bmag: B3, forces: true, nTurns: N3, bT: B3 });
    // 눈금 막대 (1 mm)
    const kx = g.px + g.pw - 24 - PXMM * g.sc, ky = g.py + g.ph - 20;
    ctx.fillStyle = '#26324a'; ctx.fillRect(kx, ky, PXMM * g.sc, 4); T(kx - 6, ky + 6, '1 mm', 12, '#26324a', 'right', 800);
    T(g.px + 14, g.py + g.ph - 12, '코일 ' + N3 + '회 · B ' + f2(B3) + ' T', PHONE ? 11.5 : 12.5, '#5a6679', 'left', 700);
    // 파형 패널
    const wx = PHONE ? 12 : 526, wy = PHONE ? 252 : 14, ww = PHONE ? 456 : 262, wh = PHONE ? 170 : 330;
    panel(wx, wy, ww, wh, 14);
    const pw2 = PHONE ? (ww - 36) / 2 : ww - 28, ph2 = PHONE ? wh - 56 : (wh - 90) / 2;
    const plot = (x, y, title, key, amax, unit, col) => {
      T(x, y - 6, title, 12.5, '#26324a', 'left', 800);
      const yb = y + ph2 / 2;
      ctx.fillStyle = '#f7f9fd'; ctx.fillRect(x, y, pw2, ph2); ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x + pw2, yb); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + pw2, y + 1); ctx.moveTo(x, y + ph2 - 1); ctx.lineTo(x + pw2, y + ph2 - 1); ctx.stroke();
      T(x + 3, y + 12, '+' + amax, 10.5, '#5a6679', 'left', 700); T(x + 3, y + ph2 - 3, '−' + amax, 10.5, '#5a6679', 'left', 700);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, pw2, ph2); ctx.clip();
      ctx.beginPath(); let first = true;
      s.hist.forEach((h) => { const px2 = x + pw2 - (S.t - h.t) / 2 * pw2, py2 = yb - clamp(h[key] / (key === 'i' ? A_MAX : XGAP), -1, 1) * (ph2 / 2 - 2); if (first) { ctx.moveTo(px2, py2); first = false; } else ctx.lineTo(px2, py2); });
      ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
      T(x + pw2 - 3, y + ph2 + 14, '지금 →', 10.5, '#7b8aa3', 'right', 700);
    };
    plot(wx + 14, wy + 28, '신호 전류 i (A)', 'i', f2(A_MAX), 'A', '#e2552a');
    plot(PHONE ? wx + 22 + pw2 : wx + 14, PHONE ? wy + 28 : wy + 28 + ph2 + 46, '진동판 위치 x (mm)', 'x', f1(XGAP), 'mm', '#2f6df6');
    // 에너지 흐름도
    drawSpeakerFlow();
    parts.update(dt); parts.draw(ctx);
  }
  function drawSpeakerFlow() {
    const s = S.sp;
    const px = PHONE ? 12 : 14, py = PHONE ? 432 : 356, pw = PHONE ? 456 : 774, ph = PHONE ? 150 : 190;
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 24, '에너지의 흐름', 13.5, '#26324a', 'left', 800);
    const peak = s.kind === 'ac' ? s.A : s.A, Pel = s.kind === 'ac' ? s.A * s.A * R3 / 2 * 1000 : s.A * s.A * R3 * 1000;   // mW (교류는 평균)
    const PMAX = A_MAX * A_MAX * R3 * 1000;
    const bw = PHONE ? 130 : 190, bh = PHONE ? 54 : 64, y = py + (PHONE ? 38 : 46);
    const xs = PHONE ? [px + 8, px + 163, px + 318] : [px + 20, px + 292, px + 564];
    const lab = [['신호 전류', '전기 에너지', '#2f6df6'], ['코일의 운동', '운동 에너지', '#14a058'], ['소리', '소리 에너지', '#f2873a']];
    lab.forEach((b, i) => {
      D.roundRect(xs[i], y, bw, bh, 12); ctx.fillStyle = C.rgba(b[2], 0.12); ctx.fill(); ctx.strokeStyle = b[2]; ctx.lineWidth = 2; ctx.stroke();
      T(xs[i] + bw / 2, y + 22, b[0], PHONE ? 11.5 : 12.5, b[2], 'center', 800); T(xs[i] + bw / 2, y + 44, b[1], PHONE ? 12.5 : 15, '#26324a', 'center', 800);
    });
    const wA = 2 + 14 * clamp(Pel / (PMAX / 2 + 1e-9), 0, 1);
    D.arrow(xs[0] + bw + 3, y + bh / 2, xs[1] - 3, y + bh / 2, { color: '#2f6df6', width: wA, head: 8 + wA * 0.5 });
    D.arrow(xs[1] + bw + 3, y + bh / 2, xs[2] - 3, y + bh / 2, { color: '#f2873a', width: Math.max(1.5, wA * SOUND_EFF * 8), head: 9 });
    D.arrow(xs[1] + bw / 2, y + bh + 3, xs[1] + bw / 2, y + bh + 26, { color: '#e2464b', width: Math.max(2, wA * (1 - SOUND_EFF) * 0.6), head: 9 });
    T(xs[1] + bw / 2 + 12, y + bh + 22, '대부분은 열', PHONE ? 11.5 : 12.5, '#c0392b', 'left', 800);
    T(px + 14, py + ph - (PHONE ? 38 : 26), (s.kind === 'ac' ? '평균 전력 ' : '전력 ') + f2(Pel) + ' mW (코일 저항 R = ' + f1(R3) + ' Ω)', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    T(px + 14, py + ph - (PHONE ? 16 : 6), '소리 에너지는 전기 에너지의 ' + Math.round(SOUND_EFF * 100) + ' %로 그렸어요 (실제 스피커는 수 % 이하)', PHONE ? 11 : 12.5, '#5a6679', 'left', 700);
  }

  /* ================= ④ 설계 ================= */
  function stepDesign(dt) {
    const d = S.ds;
    d.ph += TAU * 2 * dt;
    if (d.sweep >= 0) {
      d.sweep += dt / 4.5;
      d.sweepF = F_LO + (F_HI - F_LO) * Math.min(1, d.sweep);
      if (d.sweep >= 1) { d.sweep = -1; d.tested = sigOf(d); Sound.success(); const ev = designOf(d); showHint('시험 완료! 1 kHz 소리 크기 ' + f2(ev.l1) + ' · 3 kHz ' + f2(ev.l3) + ' · 최대 진폭 ' + f2(ev.xmax) + ' mm', 4200); }
    }
  }
  const specChecks = (ev) => [
    { ok: ev.l1 >= SPEC.l1, text: '1 kHz 소리 크기 ' + f2(ev.l1) + ' (목표 ' + f1(SPEC.l1) + ' 이상)' },
    { ok: ev.l3 >= SPEC.l3, text: '3 kHz 소리 크기 ' + f2(ev.l3) + ' (목표 ' + f1(SPEC.l3) + ' 이상)' },
    { ok: ev.xmax <= SPEC.gap, text: '최대 진폭 ' + f2(ev.xmax) + ' mm (자석 틈 ' + f1(SPEC.gap) + ' mm 이하)' },
  ];
  function drawDesign(dt) {
    const d = S.ds, ev = designOf(d), g = PHONE ? { dx: 12, dy: 12, dw: 456, dh: 150 } : { dx: 14, dy: 14, dw: 300, dh: 256 };
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    panel(g.dx, g.dy, g.dw, g.dh, 14);
    T(g.dx + 14, g.dy + 24, '내 스피커 설계', 13.5, '#26324a', 'left', 800);
    const sweeping = d.sweep >= 0, f = sweeping ? d.sweepF : 1000;
    const xcur = ev.X(f) * Math.sin(d.ph), sc = PHONE ? 0.44 : 0.68;
    ctx.save(); ctx.beginPath(); ctx.rect(g.dx + 2, g.dy + 32, g.dw - 4, g.dh - 36); ctx.clip();
    drawSpeakerSection({ ox: g.dx + (PHONE ? 80 : 30), cy: g.dy + g.dh / 2 + 12, sc, x: Math.max(-XGAP * 1.4, Math.min(XGAP * 1.4, xcur)), i: null, big: d.cup === 'large', thick: d.mat === 'thick', turns: d.N, bmag: d.B, forces: false });
    ctx.restore();
    const lx = PHONE ? g.dx + 250 : g.dx + 14, ly = g.dy + g.dh - (PHONE ? 130 : 10);
    if (PHONE) {
      ['N ' + d.N + '회 · ' + (d.wire === 'thin' ? '얇은 선' : '굵은 선'), '자석 ' + f2(d.B) + ' T', (d.cup === 'small' ? '작은 컵' : '큰 컵') + ' · ' + (d.mat === 'thin' ? '얇은 종이' : '두꺼운 판지'), '진동판 m = ' + f1(ev.m) + ' g'].forEach((t, i) => T(lx, g.dy + 62 + i * 24, t, 13, '#26324a', 'left', 800));
    } else T(lx, ly, (sweeping ? '시험 중 ' + Math.round(f) + ' Hz' : '화면은 느리게 보여 줘요 (1 kHz 기준)'), 12, '#5a6679', 'left', 700);
    // 곡선
    const pg = PHONE ? { x: 12, y: 170, w: 456, h: 160 } : { x: 326, y: 14, w: 462, h: 256 };
    panel(pg.x, pg.y, pg.w, pg.h, 14);
    T(pg.x + 14, pg.y + 24, '주파수에 따른 소리 크기 (시험 곡선)', 13.5, '#26324a', 'left', 800);
    const ax0 = pg.x + 44, ax1 = pg.x + pg.w - 16, ay0 = pg.y + 38, ay1 = pg.y + pg.h - 34, LMAX = 12;
    const fx = (fr) => ax0 + (fr - F_LO) / (F_HI - F_LO) * (ax1 - ax0), ly2 = (v) => ay1 - clamp(v / LMAX, 0, 1) * (ay1 - ay0);
    ctx.fillStyle = '#f7f9fd'; ctx.fillRect(ax0, ay0, ax1 - ax0, ay1 - ay0);
    [0, 3, 6, 9, 12].forEach((v) => { ctx.strokeStyle = v === 0 ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = v === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(ax0, ly2(v)); ctx.lineTo(ax1, ly2(v)); ctx.stroke(); T(ax0 - 6, ly2(v) + 4, String(v), 12, '#3a465c', 'right', 800); });
    [500, 1000, 2000, 3000, 4000].forEach((fr) => { ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx(fr), ay0); ctx.lineTo(fx(fr), ay1); ctx.stroke(); T(fx(fr), ay1 + 16, fr >= 1000 ? (fr / 1000) + ' kHz' : fr + ' Hz', 11.5, '#3a465c', 'center', 800); });
    // 목표 지점
    [[1000, SPEC.l1, ev.l1 >= SPEC.l1], [3000, SPEC.l3, ev.l3 >= SPEC.l3]].forEach((t) => {
      const x = fx(t[0]), y = ly2(t[1]);
      ctx.strokeStyle = t[2] ? '#14a058' : '#e2464b'; ctx.lineWidth = 2.4; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x + 24, y); ctx.stroke(); ctx.setLineDash([]);
      T(x, y - 8, '목표 ' + f1(t[1]), 11.5, t[2] ? '#0f7a43' : '#b42318', 'center', 800);
    });
    // 곡선 (시험한 만큼)
    const upto = sweeping ? d.sweepF : (d.tested === sigOf(d) ? F_HI : -1);
    if (upto > F_LO) {
      ctx.beginPath(); let first = true;
      for (let fr = F_LO; fr <= upto + 0.1; fr += 25) { const x = fx(fr), y = ly2(ev.L(fr)); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
      ctx.strokeStyle = '#2f6df6'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.stroke();
      // 찌그러짐 구간 (진폭이 자석 틈보다 큰 곳)
      ctx.beginPath(); first = true;
      for (let fr = F_LO; fr <= upto + 0.1; fr += 25) { if (ev.X(fr) > SPEC.gap) { const x = fx(fr), y = ly2(ev.L(fr)); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); } else first = true; }
      ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 4.4; ctx.stroke();
      if (sweeping) D.sphere(fx(d.sweepF), ly2(ev.L(d.sweepF)), 6, '#f26b3a', { shadow: true });
    } else T((ax0 + ax1) / 2, (ay0 + ay1) / 2 + (PHONE ? 0 : 62), '🔊 시험하기를 누르면 곡선이 그려져요', PHONE ? 13 : 14.5, '#98a2b3', 'center', 700);
    if (d.tested && d.tested !== sigOf(d) && !sweeping) T((ax0 + ax1) / 2, ay0 + 22, '설계가 바뀌었어요. 다시 시험해요.', 12.5, '#c2410c', 'center', 800);
    // 사양 카드
    const sp = PHONE ? { x: 12, y: 338, w: 456, h: 290 } : { x: 14, y: 282, w: 774, h: 264 };
    panel(sp.x, sp.y, sp.w, sp.h, 14);
    T(sp.x + 14, sp.y + 26, '요구 사양과 설계 결과', 14, '#26324a', 'left', 800);
    const checks = specChecks(ev), tested = d.tested === sigOf(d);
    checks.forEach((c, i) => { T(sp.x + 14, sp.y + 56 + i * 26, (c.ok ? '✅ ' : '⬜ ') + c.text, PHONE ? 13 : 15, c.ok ? '#0f7a43' : '#26324a', 'left', 800); });
    const allOk = checks.every((c) => c.ok);
    // 숫자 카드
    const nx = PHONE ? sp.x + 14 : sp.x + 14, ny = sp.y + 56 + 3 * 26 + 8;
    const stat = [['진동판 질량', f1(ev.m) + ' g'], ['코일 저항', f1(ev.R) + ' Ω'], ['소비 전력', f1(ev.P) + ' mW'], ['비용 점수', String(ev.cost)]];
    const cw = (sp.w - 28 - 36) / 4;
    stat.forEach((s2, i) => {
      const cx = nx + i * (cw + 12), cy = ny;
      D.roundRect(cx, cy, cw, 40, 10); ctx.fillStyle = '#f5f7fb'; ctx.fill();
      T(cx + 10, cy + 16, s2[0], 12, '#5a6679', 'left', 800); T(cx + 10, cy + 34, s2[1], 15, '#26324a', 'left', 800);
    });
    // 진폭 막대 (자석 틈 한계)
    const by = ny + 66, bw = sp.w - 28;
    T(sp.x + 14, by + 10, '코일 진폭(최대) ' + f2(ev.xmax) + ' mm / 자석 틈 ±' + f1(SPEC.gap) + ' mm', 12.5, '#26324a', 'left', 800);
    const ratio = ev.xmax / (SPEC.gap * 1.5), bx0 = sp.x + 14, bwid = bw;
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(bx0, by + 18, bwid, 14);
    ctx.fillStyle = ev.xmax <= SPEC.gap ? '#14a058' : '#e2464b'; ctx.fillRect(bx0, by + 18, bwid * clamp(ratio, 0, 1), 14);
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; const gx = bx0 + bwid * (SPEC.gap / (SPEC.gap * 1.5)); ctx.beginPath(); ctx.moveTo(gx, by + 14); ctx.lineTo(gx, by + 36); ctx.stroke();
    T(gx, by + 50, '틈 한계 ' + f1(SPEC.gap) + ' mm', 11.5, '#26324a', 'center', 800); T(bx0 + bwid, by + 50, f1(SPEC.gap * 1.5) + ' mm', 11, '#5a6679', 'right', 700); T(bx0, by + 50, '0', 11, '#5a6679', 'left', 700);
    // 도장
    if (allOk && tested) {
      ctx.save(); ctx.translate(sp.x + sp.w - (PHONE ? 70 : 110), sp.y + (PHONE ? 52 : 70)); ctx.rotate(-0.2);
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 4; D.roundRect(-52, -22, 104, 44, 10); ctx.stroke(); T(0, 8, '설계 완료', 18, '#14a058', 'center', 800); ctx.restore();
    } else if (allOk) T(sp.x + sp.w - 14, sp.y + 26, '사양 만족! 🔊 시험하기로 확인해요', PHONE ? 11.5 : 13, '#0f7a43', 'right', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 설계 근거 (manual) ---------- */
  const WHY = [
    ['코일 감은 수를 2배로 하면 (같은 전류에서) 코일이 받는 힘은', [['2', '2배가 돼요'], ['1', '변하지 않아요'], ['h', '절반이 돼요']], '2'],
    ['같은 코일에 더 센 자석을 쓰면 힘은', [['up', '커져요'], ['same', '변하지 않아요'], ['down', '작아져요']], 'up'],
    ['진동판이 무거워지면 높은 음(3 kHz)의 소리 크기는', [['down', '작아지기 쉬워요'], ['same', '변하지 않아요'], ['up', '반드시 커져요']], 'down'],
  ];
  const whySels = [];
  WHY.forEach((w, i) => {
    const row = document.createElement('div'); row.className = 'sel-row';
    row.innerHTML = '<div class="q">' + w[0] + '</div>';
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', w[0]);
    sel.innerHTML = '<option value="">— 고르기 —</option>' + w[1].map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
    sel.addEventListener('change', () => { S.ds.why[i] = sel.value; sel.classList.remove('ok', 'bad'); delete S.ds.whyOK[i]; Sound.click(); });
    row.appendChild(sel); $('#whyRows').appendChild(row); whySels.push(sel);
  });
  function resetWhy() { S.ds.why = {}; S.ds.whyOK = {}; whySels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ---------- 포인터 (캔버스 버튼) ---------- */
  function hitAt(p) { for (let i = S.hits.length - 1; i >= 0; i--) { const h = S.hits[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
  SciSim.pointer(view, {
    down(p) { const h = hitAt(p); if (h) { S.press = { hit: h, x: p.x, y: p.y }; return true; } return false; },
    move() {},
    up(p) { if (S.press && Math.hypot(p.x - S.press.x, p.y - S.press.y) < 14) S.press.hit.fn(); S.press = null; },
    hover(p) { return hitAt(p) ? 'pointer' : 'default'; },
  });

  /* ---------- 컨트롤 연결 ---------- */
  $('#sCur').addEventListener('input', (e) => { S.f.I = +e.target.value; Sound.tick(); updateCtl(); });
  $$('#dirSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.f.dir = +b.dataset.v; updateCtl(); }));
  $$('#bSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.f.B = +b.dataset.v; updateCtl(); }));
  $$('#lSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.f.L = +b.dataset.v; updateCtl(); }));
  $('#bRec').addEventListener('click', record);
  $('#bRecClear').addEventListener('click', () => { Sound.click(); S.f.rows = []; });
  $('#inF').addEventListener('input', (e) => { S.f.pred = e.target.value; e.target.classList.remove('ok', 'bad'); });
  $$('#pwSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.mt.burnt) { showHint('코일이 타 버렸어요. 먼저 수리하기를 눌러요.', 3000); return; } S.mt.on = b.dataset.v === '1'; updateCtl(); }));
  $('#sLoad').addEventListener('input', (e) => { S.mt.load = +e.target.value; Sound.tick(); updateCtl(); });
  $('#bStall').addEventListener('click', () => {
    Sound.click(); const m = S.mt;
    if (m.burnt) { m.burnt = false; m.T = T_ROOM; m.stall = false; m.w = 0; parts.clear(); }
    else if (m.stall) m.stall = false; else { m.stall = true; if (!m.on) showHint('전원이 꺼져 있어요. 전원을 켜면 막힌 전동기에 큰 전류가 흘러요.', 3600); }
    updateCtl();
  });
  $('#inEta').addEventListener('input', (e) => { S.mt.eta = e.target.value; e.target.classList.remove('ok', 'bad'); });
  $$('#kindSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sp.kind = b.dataset.v; S.sp.rings.length = 0; updateCtl(); }));
  $('#sAmp').addEventListener('input', (e) => { S.sp.A = Math.round(+e.target.value * 100) / 100; Sound.tick(); updateCtl(); });
  $('#sFrq').addEventListener('input', (e) => { S.sp.f = +e.target.value; Sound.tick(); updateCtl(); });
  $('#bTone').addEventListener('click', () => { Sound.tone(S.sp.f, 0.6, 'sine', clamp(0.02 + S.sp.A / A_MAX * 0.16, 0.02, 0.18)); });
  $('#sTurn').addEventListener('input', (e) => { S.ds.N = +e.target.value; Sound.tick(); updateCtl(); });
  $$('#wireSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ds.wire = b.dataset.v; updateCtl(); }));
  $$('#magSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ds.B = +b.dataset.v; updateCtl(); }));
  $$('#cupSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ds.cup = b.dataset.v; updateCtl(); }));
  $$('#matSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ds.mat = b.dataset.v; updateCtl(); }));
  $('#bTest').addEventListener('click', () => { Sound.click(); if (S.ds.sweep < 0) { S.ds.sweep = 0; S.ds.sweepF = F_LO; } });
  // 설계가 바뀌면 시험 중이던 곡선은 멈춰요
  ['#sTurn', '#wireSeg', '#magSeg', '#cupSeg', '#matSeg'].forEach((s) => $(s).addEventListener(s === '#sTurn' ? 'input' : 'click', () => { S.ds.sweep = -1; }));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'force') {
      const f = S.f, Fs = forceSigned(f);
      L1 = '힘 센서 F'; a = fmtF(Math.abs(Fs)) + ' N';
      L2 = '힘의 방향'; b = Fs === 0 ? '없음' : Fs > 0 ? '→ 오른쪽' : '← 왼쪽';
      L3 = '조건'; c = f2(f.B) + ' T · ' + f1(f.I) + ' A · ' + f2(f.L) + ' m';
    } else if (S.mode === 'motor') {
      const m = S.mt;
      L1 = '전류 I'; a = f1(m.I) + ' A'; L2 = '회전 속도'; b = f1(m.w / TAU) + ' 회/초'; L3 = '코일 온도'; c = Math.round(m.T) + ' °C' + (m.burnt ? ' (소손)' : '');
    } else if (S.mode === 'speaker') {
      const s = S.sp;
      L1 = '진동판 진폭'; a = f2(xAmp3(s.A)) + ' mm'; L2 = '음의 높이'; b = s.kind === 'ac' ? s.f + ' Hz' : '소리 없음 (직류)'; L3 = '신호'; c = (s.kind === 'ac' ? '교류 ' : '직류 ') + f2(s.A) + ' A';
    } else {
      const ev = designOf(S.ds);
      L1 = '1 kHz 소리 크기'; a = f2(ev.l1); L2 = '3 kHz 소리 크기'; b = f2(ev.l3); L3 = '최대 진폭'; c = f2(ev.xmax) + ' mm';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const nSpec = () => specChecks(designOf(S.ds)).filter((c) => c.ok).length;
  const levels = [
    {
      title: '자기장 속 전류가 받는 힘', short: '힘의 요인', icon: '⚡', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 전류가 흐르는 도선이 자석 속에서 힘을 받는다면, 이 힘으로 어떻게 소리를 낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 전류가 흐르는 도선이 자기장 속에서 힘을 받아 움직이고, 이것을 이용한 장치가 <b>전동기</b>라고 배웠어요. 이번에는 그 힘의 크기를 <b>식</b>으로 알아봐요.</div>' +
        '<p>자기장 속에 놓인 도선(막대)이 받는 힘을 <b>힘 센서</b>로 재요. <b>전류 I, 자기장의 세기 B, 자기장 속 도선 길이 L</b>을 한 번에 하나씩만 바꾸어 기록해요.</p>',
      features: ['force'],
      setup() { S.f = { B: B0, I: I0, L: L0, dir: 1, par: false, x: new SciSim.Spring(0, { stiffness: 190, damping: 17 }), rows: [], seen: {}, showF: false, pred: '' }; need = ''; $('#inF').value = ''; setScene('force'); updateCtl(); },
      recap: '자기장 속 도선이 받는 힘은 전류 · 자기장의 세기 · 자기장 속 도선 길이에 각각 비례해요 (F = BIL). 방향은 전류와 자기장에 모두 수직이고, 전류를 반대로 하면 힘도 반대가 돼요.',
      summary: '<ul><li>자기장 속에서 전류가 흐르는 도선은 힘을 받아요. 도선이 자기장에 <b>수직</b>일 때 <b>F = BIL</b> (B 자기장의 세기 T, I 전류 A, L 자기장 속 도선 길이 m).</li><li>예) B = ' + f2(B0) + ' T, I = ' + f1(I0) + ' A, L = ' + f2(L0) + ' m → F = ' + f2(B0) + ' × ' + f1(I0) + ' × ' + f2(L0) + ' = <b>' + f2(B0 * I0 * L0) + ' N</b></li><li>전류가 <b>2배</b>이면 힘도 <b>2배</b>. 전류 방향이 <b>반대</b>이면 힘의 방향도 <b>반대</b>.</li><li>힘의 방향은 전류와 자기장에 <b>모두 수직</b>이에요. 도선이 자기장과 <b>나란하면 힘은 0</b>이에요.</li></ul>',
      missions: [
        {
          title: 'F를 결정하는 요인 측정하기',
          goal: '기준(' + f2(B0) + ' T · ' + f1(I0) + ' A · ' + f2(L0) + ' m)을 기록한 뒤, <b>I · B · L</b>을 각각 하나씩만 바꿔 기록하세요. 방향을 바꿔 보고, 도선을 자기장과 나란하게도 놓아 보세요.',
          hint: '먼저 기준 조건 그대로 📏 기록하기를 눌러요. 그다음 전류만(예: 4.0 A), 자기장만(예: 0.60 T), 길이만(예: 0.40 m) 바꿔 기록해요. 방향 버튼과 “자기장 나란하게” 버튼도 눌러 봐요.',
          setup() { need = ''; updateCtl(); setScene('force'); },
          check: () => S.f.rows.some(rowBase) && S.f.rows.some(rowI) && S.f.rows.some(rowB) && S.f.rows.some(rowL) && S.f.seen.right && S.f.seen.left && S.f.seen.par,
          hold: 0.6,
          status: () => mark(S.f.rows.some(rowBase)) + ' 기준 &nbsp; ' + mark(S.f.rows.some(rowI)) + ' 전류만 &nbsp; ' + mark(S.f.rows.some(rowB)) + ' B만 &nbsp; ' + mark(S.f.rows.some(rowL)) + ' L만<br>' + mark(S.f.seen.right && S.f.seen.left) + ' 방향 바꿔 보기 &nbsp; ' + mark(S.f.seen.par) + ' 나란하게 놓기(1초)',
          explain: '기준 조건에서 F = ' + f2(B0) + ' × ' + f1(I0) + ' × ' + f2(L0) + ' = <b>' + f2(B0 * I0 * L0) + ' N</b>이에요. 전류를 2배(4.0 A)로 하면 <b>' + f2(B0 * 4 * L0) + ' N</b>, B를 0.60 T로 하면 <b>' + f2(0.6 * I0 * L0) + ' N</b>, L을 0.40 m로 하면 <b>' + f2(B0 * I0 * 0.4) + ' N</b>이에요. 힘은 I · B · L에 각각 비례하고, 전류 방향이 반대이면 힘의 방향도 반대, 나란하게 놓으면 힘이 0이에요.',
        },
        {
          title: '식으로 힘 예측하기', manual: true,
          goal: '실험 결과를 식으로 정리해 보세요. B = ' + f2(PRED.B) + ' T, I = ' + f1(PRED.I) + ' A, L = ' + f2(PRED.L) + ' m일 때의 <b>힘 F(N)</b>를 예측해서 입력하고 ✔ 확인하기를 누르세요.',
          hint: '힘은 B, I, L에 각각 비례하니 세 값을 곱해요. F = B × I × L',
          setup() { need = 'pred'; S.f.pred = ''; $('#inF').value = ''; updateCtl(); setScene('force'); },
          check() {
            const v = parseFloat(String(S.f.pred).replace(',', '.'));
            if (!isFinite(v)) { $('#inF').classList.add('bad'); return '힘 F를 숫자(N)로 입력해 주세요.'; }
            const ans = PRED.B * PRED.I * PRED.L;
            if (Math.abs(v - ans) <= 0.011) { $('#inF').classList.remove('bad'); $('#inF').classList.add('ok'); return true; }
            $('#inF').classList.add('bad');
            if (Math.abs(v - PRED.B * PRED.I) < 0.011) return 'B × I만 곱했어요. 도선 길이 L도 곱해야 해요.';
            return '아직 아니에요. F = B × I × L에 ' + f2(PRED.B) + ', ' + f1(PRED.I) + ', ' + f2(PRED.L) + '을 넣어 곱해 보세요. 화면의 센서 값으로 확인할 수 있어요.';
          },
          status: () => '예측 문제: ' + f2(PRED.B) + ' T · ' + f1(PRED.I) + ' A · ' + f2(PRED.L) + ' m (확인한 뒤 화면에서 직접 맞춰 봐도 좋아요)',
          explain: 'F = BIL = ' + f2(PRED.B) + ' × ' + f1(PRED.I) + ' × ' + f2(PRED.L) + ' = <b>' + f2(PRED.B * PRED.I * PRED.L) + ' N</b>이에요. 힘 센서가 이 값을 보여 주는지 확인해 보세요.',
        },
        {
          type: 'quiz', title: '전류를 반대로 하면?',
          goal: '다른 조건은 그대로 두고 전류의 <b>방향만 반대로</b> 하면 도선이 받는 힘의 크기와 방향은?',
          setup() { need = ''; S.f.showF = true; updateCtl(); setScene('force'); },
          choices: ['크기도 방향도 변하지 않는다', '크기는 같고 방향은 반대가 된다', '크기가 2배가 되고 방향은 같다', '힘이 0이 된다'],
          answer: 1,
          feedback: ['방향 버튼을 눌러 보세요. 힘 화살표가 반대로 바뀌어요.', '', '크기는 B, I, L 값이 정해요. 방향만 바뀌었으니 크기는 그대로예요.', '힘이 0이 되는 경우는 도선이 자기장과 나란할 때예요.'],
          explain: '힘의 크기는 <b>B · I · L</b>이 정하고, <b>방향</b>은 전류와 자기장의 방향이 정해요. 전류 방향만 바꾸면 크기는 같고 방향만 <b>반대</b>가 돼요.',
        },
      ],
    },
    {
      title: '전동기: 전기 에너지를 운동 에너지로', short: '전동기', icon: '⚙️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자기장 속 전류가 받는 힘이 F = BIL임을 알았어요. 코일의 <b>양쪽 변</b>이 서로 <b>반대 방향</b>의 힘을 받으면 코일이 <b>회전</b>해요. 이것이 전동기예요.</div>' +
        '<p>코일이 계속 한 방향으로 돌도록 <b>정류자</b>가 반 바퀴마다 전류 방향을 바꿔 줘요. 전원은 ' + V_SUP + ' V, 코일 저항은 ' + f1(R_COIL) + ' Ω이에요. 입력 전력이 열과 운동으로 나뉘는 모습을 살펴봐요.</p>',
      features: ['motor'],
      setup() { S.mt = { on: false, load: LOAD0, stall: false, w: 0, I: 0, phi: 0, T: T_ROOM, burnt: false, seen: {}, stallT: 0, nomT: 0, heavyT: 0, lastCos: 1, eta: '', showEta: false }; need = ''; $('#inEta').value = ''; parts.clear(); setScene('motor'); updateCtl(); },
      recap: '전동기는 전기 에너지를 운동 에너지로 바꿔요. 입력 전력(VI)의 일부는 코일 저항에서 열(I²R)이 되고 나머지가 운동으로 출력돼요. 부하가 커져 느리게 돌면 전류가 늘고, 막히면 큰 전류가 흘러 과열돼요.',
      summary: '<ul><li>코일의 양쪽 변이 <b>반대 방향의 힘</b>을 받아 회전하고, <b>정류자</b>가 반 바퀴마다 전류 방향을 바꿔 한 방향으로 계속 돌아요.</li><li>입력 전력 P = VI = ' + V_SUP + ' V × ' + f1(I0) + ' A = <b>' + Math.round(V_SUP * I0) + ' W</b> → 열 I²R = ' + f1(I0 * I0 * R_COIL) + ' W, 출력 <b>' + Math.round(V_SUP * I0 - I0 * I0 * R_COIL) + ' W</b> (효율 약 ' + Math.round((V_SUP * I0 - I0 * I0 * R_COIL) / (V_SUP * I0) * 100) + ' %).</li><li>코일이 돌면 <b>반대 방향 유도 전류</b>가 생겨 전류를 줄여요. 부하가 커져 느려지면 전류가 <b>늘어요</b>.</li><li>회전이 막히면 I = V ÷ R = ' + V_SUP + ' ÷ ' + f1(R_COIL) + ' = <b>' + Math.round(V_SUP / R_COIL) + ' A</b>, 열 <b>' + Math.round(Math.pow(V_SUP / R_COIL, 2) * R_COIL) + ' W</b> → 과열·소손.</li></ul>',
      missions: [
        {
          title: '전동기의 효율 구하기', manual: true,
          goal: '전원을 켜고 부하를 <b>' + f1(LOAD0) + ' N·m</b>로 두세요. 입력 전력과 출력을 보고 <b>효율(%) = 출력 ÷ 입력 × 100</b>을 구해 입력하세요.',
          hint: '전원을 켜고 부하 슬라이더를 ' + f1(LOAD0) + ' N·m로 맞춰요. 입력 ' + Math.round(V_SUP * I0) + ' W 중 출력이 몇 W인지 전력 막대 옆 숫자에서 읽어요. 소수점은 반올림해요.',
          setup() { need = 'eta'; S.mt.showEta = false; S.mt.eta = ''; $('#inEta').value = ''; updateCtl(); setScene('motor'); },
          check() {
            const m = S.mt, inp = $('#inEta');
            if (!m.on || m.stall || m.burnt || m.load !== LOAD0 || Math.abs(m.I - I0) > 0.05) return '먼저 전원을 켜고 부하를 ' + f1(LOAD0) + ' N·m로 맞춰 안정될 때까지 기다려요.';
            const v = parseFloat(String(m.eta).replace(',', '.'));
            if (!isFinite(v)) { inp.classList.add('bad'); return '효율을 숫자(%)로 입력해 주세요.'; }
            const ans = m.pout / m.pin * 100;
            if (Math.abs(v - ans) <= 1.5) { inp.classList.remove('bad'); inp.classList.add('ok'); return true; }
            inp.classList.add('bad');
            return '다시 계산해 보세요. 효율 = 출력 ÷ 입력 × 100이에요. 열로 사라지는 전력은 출력이 아니에요.';
          },
          status: () => 'V = ' + V_SUP + ' V, I = ' + f1(S.mt.I) + ' A → 입력 ' + f1(S.mt.pin) + ' W · 열 ' + f1(S.mt.heat) + ' W · 출력 ' + f1(S.mt.pout) + ' W',
          explain: '입력 ' + Math.round(V_SUP * I0) + ' W = 열 ' + f1(I0 * I0 * R_COIL) + ' W + 출력 ' + Math.round(V_SUP * I0 - I0 * I0 * R_COIL) + ' W이에요. 효율 = ' + Math.round(V_SUP * I0 - I0 * I0 * R_COIL) + ' ÷ ' + Math.round(V_SUP * I0) + ' × 100 ≈ <b>' + Math.round((V_SUP * I0 - I0 * I0 * R_COIL) / (V_SUP * I0) * 100) + ' %</b>. 나머지는 코일 저항에서 열로 사라져요.',
        },
        {
          title: '부하가 커지면 전류는?',
          goal: '부하 토크를 <b>4.0 N·m 이상</b>으로 올려 전류가 <b>8 A 이상</b>이 되게 하고, <b>🛑 회전 막기</b>로 전류가 최대(' + Math.round(V_SUP / R_COIL) + ' A)가 되는 것도 확인하세요.',
          hint: '부하 슬라이더를 오른쪽으로 올려요. 4.0 N·m에서 전류가 8.0 A가 돼요. 회전 막기는 1초쯤 유지하고, 코일 온도가 ' + T_BURN + ' °C에 닿기 전에 풀어 주세요.',
          setup() { need = ''; S.mt.seen = {}; S.mt.heavyT = 0; S.mt.stallT = 0; updateCtl(); setScene('motor'); },
          check: () => S.mt.seen.heavy && S.mt.seen.stall,
          hold: 0.2,
          status: () => mark(S.mt.seen.heavy) + ' 부하 4.0 N·m 이상 · 전류 8 A 이상 &nbsp; ' + mark(S.mt.seen.stall) + ' 막기 ' + Math.round(V_SUP / R_COIL) + ' A<br>지금 부하 ' + f1(S.mt.load) + ' N·m · 전류 ' + f1(S.mt.I) + ' A · 온도 ' + Math.round(S.mt.T) + ' °C',
          explain: '코일이 돌면 <b>반대 방향 유도 전류</b>가 생겨 전류를 줄여요. 부하가 커져 느려지면 유도 효과가 줄어 <b>전류가 늘어요</b> (4.0 N·m에서 8 A). 완전히 막히면 유도 효과가 없어 I = ' + V_SUP + ' ÷ ' + f1(R_COIL) + ' = <b>' + Math.round(V_SUP / R_COIL) + ' A</b>, 열은 I²R = <b>' + Math.round(Math.pow(V_SUP / R_COIL, 2) * R_COIL) + ' W</b>가 되어 코일이 빨리 과열돼요.',
        },
        {
          type: 'quiz', title: '전동기는 에너지를 만들어 낼까?',
          goal: '전동기에 대한 설명으로 옳은 것은?',
          setup() { need = ''; updateCtl(); setScene('motor'); },
          choices: ['전동기는 전기 에너지를 새로 만들어 낸다', '전기 에너지를 운동 에너지로 바꾸고, 일부는 열이 되어 사라진다', '운동 에너지를 전기 에너지로 바꾸는 장치이다', '입력한 전기 에너지가 모두 운동 에너지가 된다'],
          answer: 1,
          feedback: ['에너지는 새로 만들어지지 않아요. 입력한 전기 에너지가 형태를 바꿀 뿐이에요.', '', '그것은 발전기예요. 전동기는 반대로 전기를 쓰는 장치예요.', '코일 저항에서 열이 생겨 출력은 입력보다 작아요 (' + Math.round(V_SUP * I0) + ' W → ' + Math.round(V_SUP * I0 - I0 * I0 * R_COIL) + ' W).'],
          explain: '전동기는 <b>전기 에너지를 운동 에너지로 전환</b>하는 장치예요. 코일 저항에서 열(I²R)이 생기므로 출력은 입력보다 작아요. 거꾸로 운동 에너지를 전기 에너지로 바꾸는 것이 발전기예요.',
        },
      ],
    },
    {
      title: '스피커: 전류가 진동판을 떨게 해요', short: '스피커', icon: '🔊', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자기장 속 코일의 전류가 힘을 만들고, 전류가 바뀌면 힘도 바뀐다는 것을 알았어요. 코일을 <b>회전</b> 대신 <b>앞뒤로 움직이게</b> 하면 스피커가 돼요.</div>' +
        '<p>스피커는 <b>영구자석</b>의 방사형 자기장 속에 <b>보이스 코일</b>이 있고, 코일에 진동판(콘)이 붙어 있어요. 마이크가 소리를 <b>전류 신호</b>로 바꾸고, 이 전류가 코일에 흐르면 진동판이 떨려 <b>소리</b>가 나요. 진폭은 소리의 크기, 진동수는 음의 높이예요.</p>',
      features: ['speaker'],
      setup() { S.sp = { kind: 'ac', A: 0.05, f: 400, ph: 0, x: 0, i: 0, hist: [], hAcc: 0, rings: [], ringAcc: 0, seen: {}, hold: 0 }; need = ''; setScene('speaker'); updateCtl(); },
      recap: '신호 전류가 보이스 코일에 흐르면 전류의 크기와 방향에 따라 힘이 바뀌어 진동판이 앞뒤로 진동하고, 공기를 눌러 소리가 나요. 진폭은 소리의 크기, 진동수는 음의 높이를 정해요.',
      summary: '<ul><li>스피커는 <b>영구자석 + 보이스 코일 + 진동판</b>이에요. 코일의 힘은 전류에 비례(F = N·B·I·L)하고, 전류의 방향이 바뀌면 힘의 방향도 바뀌어요.</li><li>음성 신호 전류(<b>교류</b>)가 흐르면 진동판이 <b>앞뒤로 진동</b>하고, 공기가 눌렸다 풀리며 <b>소리</b>가 퍼져요.</li><li>신호의 <b>진폭 ↑</b> → 소리 <b>크기 ↑</b>, 신호의 <b>진동수 ↑</b> → <b>높은 음</b>.</li><li><b>직류</b>가 흐르면 진동판은 한쪽으로 밀려 있기만 해서 소리가 나지 않아요.</li><li>에너지: <b>전기 신호 → 코일의 운동 → 소리</b> (대부분은 열이 되어 소리 효율은 수 % 이하).</li></ul>',
      missions: [
        {
          title: '크고 높은 소리 만들기',
          goal: '신호를 <b>교류</b>로 두고, 진폭을 <b>0.15 A 이상</b>, 진동수를 <b>1000 Hz 이상</b>으로 만드세요.',
          hint: '신호 종류가 교류인지 확인하고, 진폭 슬라이더를 0.15 A 이상, 진동수 슬라이더를 1000 Hz 이상으로 올려요. 0.5초쯤 유지하면 돼요.',
          setup() { need = ''; S.sp.seen = {}; S.sp.hold = 0; updateCtl(); setScene('speaker'); },
          check: () => S.sp.seen.both,
          hold: 0.1,
          status: () => mark(S.sp.kind === 'ac') + ' 교류 &nbsp; ' + mark(S.sp.A >= 0.15) + ' 진폭 ' + f2(S.sp.A) + ' A (0.15 이상) &nbsp; ' + mark(S.sp.f >= 1000) + ' ' + S.sp.f + ' Hz (1000 이상)',
          explain: '진폭이 클수록 코일이 받는 힘이 커서 진동판이 크게 움직여요. 0.20 A에서 진폭은 <b>' + f2(xAmp3(0.2)) + ' mm</b>, 0.15 A에서 <b>' + f2(xAmp3(0.15)) + ' mm</b>예요. 진동수가 높을수록 진동판이 더 빨리 떨려서 <b>높은 음</b>이 나요.',
        },
        {
          type: 'quiz', title: '직류를 흘리면?',
          goal: '스피커 코일에 <b>직류</b>를 흘리면 진동판은 어떻게 될까요?',
          setup() { need = ''; updateCtl(); setScene('speaker'); },
          choices: ['앞뒤로 빠르게 진동하며 큰 소리가 난다', '한쪽으로 밀려서 그대로 있어 소리가 나지 않는다', '아무 힘도 받지 않는다', '진동판이 회전한다'],
          answer: 1,
          feedback: ['진동하려면 전류의 방향이 번갈아 바뀌어야 해요. 직류는 방향이 일정해요.', '', '코일은 전류에 비례하는 힘을 받아요. 힘이 일정해서 움직이지 않을 뿐이에요.', '스피커 진동판은 앞뒤로만 움직여요.'],
          explain: '직류는 전류의 크기와 방향이 일정해서 코일이 받는 <b>힘도 일정</b>해요. 진동판은 한쪽으로 밀린 채 멈춰서 공기를 주기적으로 누르지 못하니 소리가 나지 않아요. 소리를 내려면 방향이 번갈아 바뀌는 <b>교류 신호</b>가 필요해요.',
        },
      ],
    },
    {
      title: '요구 사양에 맞는 스피커 설계하기', short: '설계', icon: '🛠️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 힘 F = N·B·I·L이 코일을 움직이고, 진폭이 소리 크기를 정한다는 것을 알았어요. 이제 <b>요구 사양</b>을 만족하는 스피커를 직접 <b>설계</b>해요.</div>' +
        '<p><b>설계 순환</b>: ① 사양 확인 → ② 재료와 값 고르기 → ③ <b>🔊 시험하기</b> → ④ 개선. 코일 감은 수 · 선 굵기 · 자석 · 진동판(크기와 재질)을 바꾸며 시험해요. 큰 진동판은 소리를 키우지만 <b>무거워서 높은 음에 약해요</b>. 코일이 자석 틈 밖으로 나갈 만큼 크게 움직이면 소리가 <b>찌그러져요</b>.</p>' +
        '<ul><li>1 kHz 소리 크기 <b>' + f1(SPEC.l1) + ' 이상</b></li><li>3 kHz 소리 크기 <b>' + f1(SPEC.l3) + ' 이상</b></li><li>최대 진폭 <b>' + f1(SPEC.gap) + ' mm 이하</b> (찌그러짐 없음)</li></ul>',
      features: ['design'],
      setup() { S.ds = { N: 40, B: 0.4, cup: 'small', mat: 'thin', wire: 'thin', tested: '', sweep: -1, sweepF: 0, ph: 0, why: {}, whyOK: {} }; need = ''; resetWhy(); setScene('design'); updateCtl(); },
      recap: '코일 감은 수와 자석이 셀수록 힘이 커지고, 큰 진동판은 소리를 키우지만 무거워 높은 음에 약해요. 진폭이 자석 틈보다 커지면 소리가 찌그러져요. 시험하고 고치는 순환으로 사양에 맞게 설계해요.',
      summary: '<ul><li>코일의 힘 <b>F = N·B·I·L</b>: 감은 수 N과 자석 B가 클수록 진동판이 크게 움직여요.</li><li>소리 크기는 진동판의 <b>진폭 × 넓이</b>에 비례해요. 큰 진동판은 소리가 커지지만 <b>무거워서</b> 높은 음에서 응답이 약해져요.</li><li>코일이 자석 <b>틈(' + f1(SPEC.gap) + ' mm)</b> 밖으로 나가면 힘이 일정하지 않아 소리가 <b>찌그러져요</b>.</li><li>공학 설계: <b>사양 확인 → 선택 → 시험 → 개선</b>을 되풀이하고, 비용 점수와 소비 전력도 함께 비교해요.</li></ul>',
      missions: [
        {
          title: '사양을 만족하는 설계 제출하기', manual: true,
          goal: '세 가지 사양을 모두 만족하도록 설계하고 <b>🔊 시험하기</b>로 확인한 뒤 <b>✔ 확인하기</b>(제출)를 누르세요.',
          hint: '큰 컵 + 센 자석이 소리를 키워요. 진동판 질량(코일 + 컵)이 크면 3 kHz가 약해지니 얇은 종이를 써요. 진폭이 ' + f1(SPEC.gap) + ' mm를 넘으면 감은 수나 자석을 줄여요.',
          setup() { need = ''; updateCtl(); setScene('design'); },
          check() {
            const d = S.ds, ev = designOf(d), ch = specChecks(ev);
            if (d.tested !== sigOf(d)) return '먼저 현재 설계로 🔊 시험하기를 눌러 곡선을 확인해요. (설계를 바꾸면 다시 시험해야 해요)';
            const bad = ch.filter((c) => !c.ok);
            if (bad.length) {
              let msg = '아직 만족하지 못한 사양이 ' + bad.length + '개 있어요. ';
              if (!ch[0].ok) msg += '1 kHz 소리가 작아요: 진동판을 키우거나 자석·감은 수를 늘려 보세요. ';
              if (!ch[1].ok) msg += '3 kHz가 약해요: 진동판 질량을 줄여 보세요(얇은 종이, 적은 감은 수). ';
              if (!ch[2].ok) msg += '진폭이 자석 틈보다 커서 찌그러져요: 감은 수나 자석을 줄여 보세요.';
              return msg;
            }
            return true;
          },
          status: () => { const ev = designOf(S.ds), ch = specChecks(ev); return ch.map((c) => mark(c.ok)).join(' ') + ' 사양 ' + nSpec() + ' / 3 &nbsp; ' + mark(S.ds.tested === sigOf(S.ds)) + ' 시험함'; },
          explain: '이 설계는 1 kHz에서 <b>' + f2(designOf({ N: 70, B: 0.6, cup: 'large', mat: 'thin', wire: 'thin' }).l1) + '</b>, 3 kHz에서 <b>' + f2(designOf({ N: 70, B: 0.6, cup: 'large', mat: 'thin', wire: 'thin' }).l3) + '</b>, 최대 진폭 <b>' + f2(designOf({ N: 70, B: 0.6, cup: 'large', mat: 'thin', wire: 'thin' }).xmax) + ' mm</b>인 설계(예: 70회 · 강한 자석 · 큰 컵 · 얇은 종이)처럼 세 사양을 함께 만족해야 해요. 소리 크기 · 음역 · 왜곡 사이에서 균형을 찾는 것이 공학 설계예요.',
        },
        {
          title: '설계 근거 고르기', manual: true,
          goal: '세 문장의 빈칸을 골라 <b>설계 근거</b>를 완성하고 ✔ 확인하기를 누르세요.',
          hint: '힘 F = N·B·I·L에서 N과 B는 곱해져요. 진동판이 무거우면 빠르게 떨기 어려워요.',
          setup() { need = 'why'; resetWhy(); updateCtl(); setScene('design'); },
          check() {
            const miss = WHY.filter((w, i) => !S.ds.why[i]);
            if (miss.length) return '아직 고르지 않은 문장이 ' + miss.length + '개 있어요.';
            let bad = 0;
            WHY.forEach((w, i) => {
              const ok = S.ds.why[i] === w[2];
              if (!ok) bad++;
              if (!ok && S.ds.whyOK[i] !== false) { whySels[i].classList.remove('ok', 'bad'); void whySels[i].offsetWidth; whySels[i].classList.add('bad'); }
              if (ok) { whySels[i].classList.remove('bad'); whySels[i].classList.add('ok'); }
              S.ds.whyOK[i] = ok;
            });
            return bad ? '빨간 칸을 다시 골라 보세요. 설계 화면에서 값을 바꿔 보며 확인할 수 있어요.' : true;
          },
          status: () => '고른 문장 ' + WHY.filter((w, i) => S.ds.why[i]).length + ' / ' + WHY.length,
          explain: '<b>F = N·B·I·L</b>이므로 감은 수 N을 2배로 하면 힘도 <b>2배</b>, 더 센 자석(B ↑)이면 힘이 <b>커져요</b>. 진동판이 무거우면 높은 진동수를 따라가기 어려워서 3 kHz 같은 <b>높은 음의 소리가 약해지기 쉬워요</b>.',
        },
        {
          type: 'quiz', title: '소리가 찌그러지는 까닭',
          goal: '코일이 자석 틈 <b>밖으로 빠질 만큼</b> 크게 움직이면 소리가 찌그러지는 까닭은?',
          setup() { need = ''; updateCtl(); setScene('design'); },
          choices: ['코일의 저항이 0이 되어서', '틈 밖에서는 코일이 받는 힘이 작아져 진동판의 움직임이 전류 신호와 비례하지 않아서', '진동판이 가벼워져서', '자석이 더 세어져서'],
          answer: 1,
          feedback: ['저항은 변하지 않아요. 문제는 자기장이에요.', '', '진동판 무게는 그대로예요. 코일이 놓인 자기장이 달라져요.', '자석의 세기는 그대로이고, 코일이 자기장이 센 곳을 벗어나는 거예요.'],
          explain: '코일이 센 자기장이 있는 <b>틈 안</b>에 있을 때만 힘이 전류에 비례해요. 틈 밖으로 나가면 자기장이 약해 힘이 줄어, 진동판의 움직임이 신호와 <b>달라지고(왜곡)</b> 소리가 찌그러져요. 그래서 최대 진폭이 틈(' + f1(SPEC.gap) + ' mm) 안이어야 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-motor-speaker', mount: '#game', badge: '전자기 공학자', homeHref: '../../index.html#hp',
    featureLabels: { force: '⚡ 도선 · 힘 센서 · 기록표', motor: '⚙️ 전동기 코일 · 전력 막대', speaker: '🔊 스피커 단면 · 신호 파형', design: '🛠️ 스피커 설계 · 시험 곡선' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('force');
  updateCtl();
  let lastFree = false, lastLvl = -1, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && (game.free !== lastFree || game.level !== lastLvl)) { lastFree = game.free; lastLvl = game.level; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    stepForce(dt); stepMotor(dt); stepSpeaker(dt); stepDesign(dt);
    view.apply(); S.hits = S.hits || [];
    if (S.mode === 'force') drawForce(dt);
    else { S.hits = []; if (S.mode === 'motor') drawMotor(dt); else if (S.mode === 'speaker') drawSpeaker(dt); else drawDesign(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, designOf, sigOf, specChecks, SPEC, forceSigned, record, updateCtl, G1, G2, G3, xAmp3, WHY, K_M, V_SUP, R_COIL,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepForce(0.02); stepMotor(0.02); stepSpeaker(0.02); stepDesign(0.02); } },
  };
})();
