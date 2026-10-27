/* =========================================================
   화학 Ⅰ. 화학의 언어 - 양적 관계 실험 [12화학01-03]
   ① 예측(계획): 가설 · 변인 표 · 측정 방법 (CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂)
   ② 실험: 안전 점검 · 질량 감소법 (염산 2.0 M 50 mL = 0.100 mol 고정, CaCO₃ 질량만 변경)
   ③ 분석: 그래프 해석 (꺾이는 점 CaCO₃ 5.00 g = 0.0500 mol → HCl : CaCO₃ = 2 : 1, 기울기 0.44 g/g = 44 ÷ 100)
   ④ 확인: 보조 계(Mg + 2HCl, 기체 부피) 해석 · 결론 · 오차 토의
   수득률 · 오차 전파 계산은 다루지 않아요. 몰 농도의 상세는 단원 36에서 다뤄요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#1b2333', MUTED = '#5d6879', VIO = '#7c3aed', AMB = '#d97706', GOOD = '#14a058', BAD = '#e2464b', BLU = '#3867f4';
  const BGC = '#f4f1fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BGC });
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
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const fT = (v) => String(+(+v).toFixed(4));
  const f2 = (v) => (+v).toFixed(2);
  const fm = (v) => (+v).toPrecision(3);                       // 몰수: 유효숫자 3자리 (0.100, 0.0500 …)
  const parseNum = (s) => { const fr = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(String(s)); if (fr && +fr[2] !== 0) return +fr[1] / +fr[2]; const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const tws = [];
  function tw(o, to, opts) { const h = SciSim.tween(o, to, opts); tws.push(h); if (tws.length > 80) tws.splice(0, 40); return h; }

  /* ---------- 실험 자료 (원자량은 반올림 값) ---------- */
  const M_CACO3 = 40 + 12 + 3 * 16, M_CO2 = 12 + 2 * 16, M_MG = 24;       // 100, 44, 24 (g/mol)
  const HCL_N = 2.0 * 0.050;                                              // 염산 2.0 M × 50 mL = 0.100 mol
  const MS = [0.5, 1, 2, 3, 4, 5, 6, 7];                                  // CaCO₃ 질량 (g)
  const DEC = [0.21, 0.43, 0.88, 1.31, 1.77, 2.20, 2.21, 2.19];           // 측정한 감소 질량 (g)
  const THEO = MS.map((m) => r6(Math.min(m / M_CACO3, HCL_N / 2) * M_CO2)); // 이론값 = 몰수 × 44
  const KNEE_CA = 5;                                                      // 꺾이는 점: CaCO₃ 5.00 g
  const FLASK0 = 125.30;                                                  // 플라스크 + 염산의 질량 (g)
  const MG_MS = [0.12, 0.24, 0.36, 0.48];                                 // Mg 질량 (g)
  const MG_V = [122.5, 245, 245, 245];                                    // 발생한 H₂ 부피 (mL, 25 °C)
  const MG_HCL = 0.020, VM25 = 24.5;
  const MG_THEO = MG_MS.map((m) => r6(Math.min(m / M_MG, MG_HCL / 2) * VM25 * 1000));
  const KNEE_MG = 0.24;
  const UNIT_CA = 0.5, UNIT_HCL = 0.010, N_HCL = 10;                     // 입자 모형: ■ = CaCO₃ 0.5 g(0.005 mol), ● = HCl 0.010 mol
  const cents = (v) => Math.round(v * 100);

  const HYP = { h1: 'CaCO₃가 늘면 CO₂도 계속 같은 비율로 늘어난다', h2: 'CaCO₃가 늘면 CO₂도 늘다가 어느 양부터는 더 늘지 않는다', h3: 'CaCO₃의 양과 관계없이 CO₂는 일정하다' };
  const VOPT = [['', '고르세요'], ['A', 'CaCO₃의 질량'], ['B', '염산의 양과 농도'], ['C', '줄어든 질량 (날아간 CO₂)'], ['D', '플라스크의 색']];
  const VTXT = { A: 'CaCO₃의 질량', B: '염산의 양과 농도', C: '줄어든 질량 (날아간 CO₂)', D: '플라스크의 색' };
  const METH = { mass: '⚖️ 질량 감소법', gas: '💧 기체 포집법' };
  const REAS = { r1: '저울만 있으면 되어 간단하고, 날아간 CO₂의 질량이 바로 나와요', r2: '기체의 부피를 바로 눈으로 읽을 수 있어요', r3: '염산이 없어도 반응이 일어나요', r4: '반응이 일어나지 않아도 측정할 수 있어요' };
  const SAFE = [['g', '보안경과 실험복을 입는다', true], ['s', '산 용액이 피부에 닿지 않게 조심한다', true], ['w', '반응이 끝난 폐액은 정해진 방법으로 처리한다', true], ['n', '냄새를 직접 맡아 확인한다', false], ['f', '반응 중에 플라스크 입구에 얼굴을 가까이 댄다', false]];
  const CAUSES = [['scale', '저울 눈금의 한계 (마지막 자리의 읽기 오차)', true], ['drop', '반응 중 물방울이 CO₂와 함께 날아감', true], ['sol', 'CO₂가 용액에 조금 녹음', true], ['pure', 'CaCO₃ 시료의 순도 (불순물)', true], ['ratio', '실험마다 계수비가 달라짐', false], ['mass', '질량 보존 법칙이 깨짐', false]];

  /* ---------- 상태 ---------- */
  const mkGraph = (n) => ({ plotted: false, pop: Array.from({ length: n }, () => ({ p: 0 })), mk: null, drag: false, ok: false, ratioOK: false, fit: { p: 0 } });
  const S = {
    mode: 'plan', sub1: 'var', sub4: 'aux', t: 0, fade: 0, safe: false,
    plan: { hyp: '', man: '', ctl: '', dep: '', meth: '', rea: '' },
    run: { sel: -1, phase: 'idle', t: 0, rec: MS.map(() => null), pieces: [], bub: [], paper: { p: 0 }, read: FLASK0, dur: 0, consumedU: 0 },
    gr: { ca: mkGraph(MS.length), mg: mkGraph(MG_MS.length) },
    conc: { c1: '', c2: '', c3: '', causes: {}, ok: false },
    safeSel: {}, shake: { safe: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { plan: '📝 계획 세우기', run: '🧪 실험 수행', graph: '📈 그래프 해석', concl: '🏁 결론 · 오차' };
  const viewOf = () => (S.mode === 'plan' ? (S.sub1 === 'var' ? 'var' : 'meth') : S.mode === 'concl' ? S.sub4 : S.mode);
  const gKey = () => (S.mode === 'graph' ? 'ca' : 'mg');
  const measured = () => S.run.rec.filter(Boolean).length;
  const gateVal = (n) => (n === 'safeOK' ? S.safe : n === 'plotted' ? S.gr[gKey()].plotted : n === 'ratio' ? S.gr[gKey()].plotted && S.gr[gKey()].ok : false);

  /* ---------- 공통 UI ---------- */
  function cancelRun() { const r = S.run; r.phase = 'idle'; r.t = 0; r.pieces = []; r.bub = []; r.paper.p = 0; r.consumedU = 0; r.read = FLASK0 + (r.sel >= 0 ? MS[r.sel] : 0); }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); if (S.mode === 'run') cancelRun(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'graph' || mode === 'concl') refreshGraphUI();
    updateCtl();
  }
  function updateCtl() {
    const vw = viewOf();
    $$('#ctrlCard [data-views]').forEach((n) => {
      let on = n.getAttribute('data-views').split(' ').indexOf(vw) >= 0;
      if (on && n.hasAttribute('data-gate')) on = !!gateVal(n.getAttribute('data-gate'));
      if (on && n.hasAttribute('data-gate-off')) on = !gateVal(n.getAttribute('data-gate-off'));
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#planSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub1));
    $$('#subSeg4 button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub4));
    $$('#methChips button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.plan.meth));
    $$('#massChips button').forEach((b, i) => { b.classList.toggle('on', i === S.run.sel); b.classList.toggle('done', !!S.run.rec[i]); b.disabled = S.run.phase !== 'idle'; });
    $('#bRun').disabled = S.run.phase !== 'idle' || S.run.sel < 0 || !!S.run.rec[S.run.sel];
    $$('#safeChips button').forEach((b) => b.classList.toggle('on', !!S.safeSel[b.dataset.v]));
    $$('#causeChips button').forEach((b) => b.classList.toggle('on', !!S.conc.causes[b.dataset.v]));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#planSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sub1 = b.dataset.v; updateCtl(); }));
  $$('#subSeg4 button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sub4 = b.dataset.v; refreshGraphUI(); updateCtl(); }));

  /* ---------- ① 계획 입력 ---------- */
  ['manSel', 'ctlSel', 'depSel'].forEach((id) => {
    const el = $('#' + id); VOPT.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; el.appendChild(o); });
  });
  const bindSel = (id, key) => $('#' + id).addEventListener('change', () => { S.plan[key] = $('#' + id).value; Sound.click(); });
  bindSel('hypSel', 'hyp'); bindSel('manSel', 'man'); bindSel('ctlSel', 'ctl'); bindSel('depSel', 'dep'); bindSel('reaSel', 'rea');
  $$('#methChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.plan.meth = b.dataset.v; updateCtl(); }));
  function resetPlan() {
    S.plan = { hyp: '', man: '', ctl: '', dep: '', meth: '', rea: '' }; S.sub1 = 'var';
    ['hypSel', 'manSel', 'ctlSel', 'depSel', 'reaSel'].forEach((id) => { $('#' + id).value = ''; });
  }

  /* ---------- ② 안전 점검 · 질량 고르기 ---------- */
  SAFE.forEach(([k, t]) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.className = 'chk'; b.textContent = t;
    b.addEventListener('click', () => { Sound.click(); S.safeSel[k] = !S.safeSel[k]; b.classList.remove('bad', 'good'); updateCtl(); });
    $('#safeChips').appendChild(b);
  });
  $('#bSafe').addEventListener('click', () => {
    const wrongOn = SAFE.filter((s) => !s[2] && S.safeSel[s[0]]), missing = SAFE.filter((s) => s[2] && !S.safeSel[s[0]]);
    if (wrongOn.length || missing.length) {
      Sound.fail();
      $$('#safeChips button').forEach((b) => { b.classList.remove('bad'); if (wrongOn.some((s) => s[0] === b.dataset.v)) { void b.offsetWidth; b.classList.add('bad'); } });
      showHint(wrongOn.length ? '"' + wrongOn[0][1] + '"는 위험한 행동이에요. 빼 주세요.' : '안전한 행동이 아직 ' + missing.length + '개 더 있어요.', 4200); return;
    }
    S.safe = true; Sound.success(); showHint('안전 점검 완료! 이제 반응시킬 수 있어요.', 2800); updateCtl();
  });
  MS.forEach((m, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = f2(m);
    b.addEventListener('click', () => {
      if (S.run.phase !== 'idle') return; Sound.click(); S.run.sel = i; S.run.read = FLASK0 + MS[i]; S.run.pieces = []; updateCtl();
    });
    $('#massChips').appendChild(b);
  });
  $('#bRun').addEventListener('click', startRun);

  /* ================= ② 실험 수행 ================= */
  const RL = PHONE
    ? { sc: { x: 8, y: 8, w: 464, h: 266 }, inset: { x: 8, y: 282, w: 464, h: 138 }, tb: { x: 8, y: 428, w: 464, h: 264 }, fw: 104, fh: 132, cx: 140, by: 190, balW: 270, balCx: 226 }
    : { sc: { x: 8, y: 8, w: 480, h: 372 }, inset: { x: 8, y: 388, w: 480, h: 164 }, tb: { x: 496, y: 8, w: 296, h: 544 }, fw: 150, fh: 190, cx: 188, by: 272, balW: 300, balCx: 248 };
  const flaskG = () => { const { fw, fh, cx, by } = RL; return { cx, by, fw, fh, neckW: fw * 0.28, neckBot: by - fh * 0.68, top: by - fh, level: 0.4, liqY: by - fh * 0.68 * 0.4 }; };
  const halfW = (g, y) => (y <= g.neckBot ? g.neckW / 2 : g.neckW / 2 + ((y - g.neckBot) / (g.by - 8 - g.neckBot)) * (g.fw / 2 - g.neckW / 2));
  const paperPos = (p) => { const g = flaskG(), x0 = RL.balCx + 85, y0 = g.by - 6, x1 = g.cx + 78, y1 = g.top - 26; return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p, a: -0.6 * p }; };
  const SZ = PHONE ? 7 : 9;
  function slotPos(j) {
    const g = flaskG(), perRow = Math.max(4, Math.floor((g.fw - 36) / (SZ + 2))), row = Math.floor(j / perRow), col = j % perRow;
    const cnt = Math.min(perRow, 99), x = g.cx + (col - (perRow - 1) / 2) * (SZ + 2), y = g.by - 12 - row * (SZ + 2);
    return { x, y };
  }
  function startRun() {
    const r = S.run; if (r.phase !== 'idle' || r.sel < 0 || r.rec[r.sel] || !S.safe) return;
    const m = MS[r.sel], U = Math.round(m / UNIT_CA), g = flaskG();
    r.m = m; r.U = U; r.cons = Math.min(U, N_HCL); r.pieces = []; r.bub = []; r.t = 0; r.goneN = 0;
    for (let j = 0; j < U; j++) r.pieces.push({ j, launch: 0.45 + j * 0.07, st: 'wait', slot: slotPos(j), x: 0, y: 0, k: 1 });
    r.phase = 'pour'; r.bC = cents(r6(FLASK0 + m)); r.dC = cents(DEC[r.sel]);
    Sound.click(); updateCtl();
  }
  function finishRun() {
    const r = S.run, i = r.sel;
    r.rec[i] = { m: r.m, before: r.bC / 100, after: (r.bC - r.dC) / 100, dec: r.dC / 100 };
    r.pieces.forEach((q) => { if (q.st === 'gone') q.k = 0; });
    r.read = r.rec[i].after; r.phase = 'idle'; r.t = 0; Sound.success();
    const g = flaskG(); parts.burst(g.cx, g.top - 10, { count: 12, speed: 110, size: 3, colors: ['#8b5cf6', '#14a058', '#ffb400'], gravity: 160 });
    updateCtl();
  }
  function stepRun(dt) {
    const r = S.run; r.paper.p = RM ? (r.phase === 'pour' ? 1 : 0) : SciSim.approach(r.paper.p, r.phase === 'pour' ? 1 : 0, dt, 5);
    const g = flaskG();
    const rb = r.bub;
    for (let i = rb.length - 1; i >= 0; i--) {
      const b = rb[i]; b.y -= b.vy * dt; b.age += dt;
      if (b.kind === 'b' && b.y <= g.liqY) { b.kind = 's'; b.vy = 70; }
      if (b.y < g.top - 60) rb.splice(i, 1);
    }
    if (r.phase === 'idle') { r.read = r.rec[r.sel] && r.pieces.length ? r.rec[r.sel].after : FLASK0 + (r.sel >= 0 ? MS[r.sel] : 0); return; }
    r.t += dt;
    if (r.phase === 'pour') {
      const pp = paperPos(Math.max(r.paper.p, 0.01)), tip = { x: pp.x - 38 * Math.cos(-pp.a), y: pp.y - 38 * Math.sin(-pp.a) + 4 };
      let allRest = true;
      r.pieces.forEach((q) => {
        const k = (r.t - q.launch) / 0.9;
        if (k < 0) { q.st = 'wait'; allRest = false; return; }
        if (k >= 1) { q.st = 'rest'; q.x = q.slot.x; q.y = q.slot.y; return; }
        allRest = false; q.st = 'fly';
        if (k < 0.45) { const u = SciSim.ease.outQuad(k / 0.45); q.x = tip.x + (g.cx - tip.x) * u; q.y = tip.y + (g.top - 4 - tip.y) * u - Math.sin(Math.PI * u) * 14; }
        else { const u = SciSim.ease.inQuad((k - 0.45) / 0.55); q.x = g.cx + (q.slot.x - g.cx) * u; q.y = g.top - 4 + (q.slot.y - (g.top - 4)) * u; }
      });
      if (allRest && r.t > 0.6) { r.phase = 'react'; r.t = 0; r.goneN = 0; Sound.click(); }
      r.read = r.bC / 100;
    } else if (r.phase === 'react') {
      const dur = RM ? 0.05 : 2.8, prog = clamp(r.t / dur, 0, 1), e = SciSim.ease.inOutQuad(prog);
      r.read = (r.bC - r.dC * e) / 100;
      // 소비 시점: 위쪽 입자부터 사라져요
      const wantGone = r.cons === 0 ? 0 : Math.min(r.cons, Math.floor((prog * 1.05) * r.cons + (prog > 0 ? 1 : 0)));
      while (r.goneN < wantGone) {
        const q = r.pieces[r.U - 1 - r.goneN]; if (q) { q.st = 'gone'; q.k = 1; }
        for (let b = 0; b < 3; b++) r.bub.push({ u: (Math.random() * 2 - 1) * 0.8, y: q ? q.y : g.by - 14, vy: 52 + Math.random() * 26, kind: 'b', r: 2.5 + Math.random() * 2.6, age: 0 });
        r.goneN++;
      }
      if (Math.random() < dt * 10 && r.goneN < r.cons + 1 && prog < 0.95) r.bub.push({ u: (Math.random() * 2 - 1) * 0.8, y: g.by - 16, vy: 50 + Math.random() * 24, kind: 'b', r: 2.2 + Math.random() * 2.2, age: 0 });
      if (r.t >= dur + 0.25) { finishRun(); return; }
    }
    r.pieces.forEach((q) => { if (q.st === 'gone') q.k = Math.max(0, q.k - dt * 3); });
  }
  function drawFlaskScene() {
    const sc = RL.sc, g = flaskG(), r = S.run;
    panel(sc.x, sc.y, sc.w, sc.h, 14);
    T(sc.x + 14, sc.y + 24, '🧪 실험 장치', 14.5, INK, 'left', 800);
    D.label(sc.x + sc.w - 14, sc.y + 22, '염산 2.0 M 50 mL = HCl ' + fm(HCL_N) + ' mol', { bg: '#3867f4', size: 12.5, align: 'right', pad: 7 });
    // 저울
    const bx = RL.balCx - RL.balW / 2, bw = RL.balW, panY = g.by;
    D.shadow(() => { D.roundRect(bx, panY + 4, bw, 66, 12); ctx.fillStyle = '#cfd6e6'; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(bx + 6, panY - 4, bw - 12, 10, 5); ctx.fillStyle = '#9aa3b5'; ctx.fill();
    D.roundRect(bx + 24, panY + 18, bw - 48, 38, 8); ctx.fillStyle = '#17223a'; ctx.fill();
    const rd = r.read; T(bx + bw - 34, panY + 46, f2(rd), 24, '#7ef0a8', 'right', 800); T(bx + bw - 30, panY + 46, 'g', 14, '#7ef0a8', 'left', 800);
    T(bx + 34, panY + 40, '전자저울', 12.5, '#8fa3bd', 'left', 800);
    // 플라스크 (염산 50 mL)
    D.flask(g.cx, g.by, g.fw, g.fh, { level: g.level, liquid: '#bfe3ff', t: S.t });
    // 플라스크 안의 CaCO₃ 조각
    r.pieces.forEach((q) => {
      if (q.st === 'wait') return;
      const k = q.st === 'gone' ? q.k : 1; if (k <= 0.02) return;
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(k, k); D.roundRect(-SZ / 2, -SZ / 2, SZ, SZ, 2); ctx.fillStyle = '#e5e7eb'; ctx.fill(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    });
    // 기포와 이산화 탄소
    r.bub.forEach((b) => {
      const hw = halfW(g, b.y) * 0.85, x = g.cx + b.u * hw;
      if (b.kind === 'b') { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke(); }
      else { const a = clamp(1 - Math.max(0, (g.top - b.y)) / 60, 0, 1); ctx.save(); ctx.globalAlpha = 0.75 * a; const gr = ctx.createRadialGradient(x, b.y, 0, x, b.y, 7 + b.r); gr.addColorStop(0, '#94a3b8'); gr.addColorStop(1, 'rgba(148,163,184,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, b.y, 7 + b.r, 0, TAU); ctx.fill(); ctx.restore(); }
    });
    if (r.bub.some((b) => b.kind === 's' && b.y < g.top + 10)) D.label(g.cx + (PHONE ? 62 : 84), g.top - 8, 'CO₂ ↑ 날아가요', { bg: '#64748b', size: 12.5, align: 'left', pad: 7 });
    // 약포지 + CaCO₃
    const pp = paperPos(r.paper.p), m = r.sel >= 0 ? MS[r.sel] : 0;
    ctx.save(); ctx.translate(pp.x, pp.y); ctx.rotate(pp.a);
    D.shadow(() => { D.roundRect(-40, -3, 80, 6, 3); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.strokeStyle = '#c7ceda'; ctx.lineWidth = 1.2; D.roundRect(-40, -3, 80, 6, 3); ctx.stroke();
    if (r.sel >= 0 && !r.rec[r.sel] && r.phase !== 'react') {
      const left = r.phase === 'pour' ? r.pieces.filter((q) => q.st === 'wait').length : Math.round(m / UNIT_CA);
      for (let j = 0; j < left; j++) { const cols = 7, rr = Math.floor(j / cols), cc = j % cols; D.roundRect(-34 + cc * 10, -3 - SZ - rr * (SZ - 1), SZ - 1, SZ - 1, 2); ctx.fillStyle = '#e5e7eb'; ctx.fill(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    ctx.restore();
    if (r.sel >= 0 && r.phase === 'idle' && !r.pieces.length) T(RL.balCx + 85, g.by + 18 - 40, 'CaCO₃ ' + f2(m) + ' g', 12.5, INK, 'center', 800);
    if (r.phase === 'idle' && r.sel < 0) T(sc.x + sc.w / 2, sc.y + 54, S.safe ? '아래에서 CaCO₃의 질량을 고르세요' : '먼저 오른쪽 안전 점검을 마쳐요', 13.5, MUTED, 'center', 800);
  }
  function drawInset() {
    const n = RL.inset, r = S.run; panel(n.x, n.y, n.w, n.h, 14);
    T(n.x + 14, n.y + 24, '🔍 입자 모형으로 보기', 14.5, INK, 'left', 800);
    T(n.x + n.w - 14, n.y + 24, '■ CaCO₃ 0.5 g(0.005 mol) · ● HCl 0.010 mol', 12.5, MUTED, 'right', 800);
    const U = r.sel >= 0 ? Math.round(MS[r.sel] / UNIT_CA) : 0, gone = r.phase === 'react' || r.phase === 'idle' ? r.goneN || (r.rec[r.sel] ? Math.min(U, N_HCL) : 0) : 0, cons = r.sel >= 0 ? Math.min(U, N_HCL) : 0;
    const done = r.sel >= 0 && !!r.rec[r.sel] && r.pieces.length > 0, nGone = done ? cons : (r.phase === 'react' ? r.goneN : 0);
    const gx = n.x + 20, gy = n.y + 46, cell = PHONE ? 22 : 28;
    T(gx, gy - 6, 'HCl', 12.5, '#1d4ed8', 'left', 800);
    for (let j = 0; j < N_HCL; j++) {
      const cx = gx + 8 + (j % 5) * cell + cell / 2, cy = gy + 6 + Math.floor(j / 5) * cell + cell / 2 - 4, used = j >= N_HCL - nGone;
      ctx.save(); ctx.globalAlpha = used ? 0.2 : 1; D.sphere(cx, cy, cell * 0.36, '#3b82f6'); ctx.restore();
    }
    const hx = n.x + n.w - 20 - 7 * cell - 8;
    T(hx, gy - 6, 'CaCO₃', 12.5, '#475569', 'left', 800);
    for (let j = 0; j < 14; j++) {
      const cx = hx + 8 + (j % 7) * cell + cell / 2, cy = gy + 6 + Math.floor(j / 7) * cell + cell / 2 - 4;
      if (j >= U) { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#d5d9e6'; ctx.lineWidth = 1.2; D.roundRect(cx - cell * 0.3, cy - cell * 0.3, cell * 0.6, cell * 0.6, 3); ctx.stroke(); ctx.restore(); continue; }
      const used = j >= U - nGone;
      ctx.save(); ctx.globalAlpha = used ? 0.2 : 1; D.roundRect(cx - cell * 0.3, cy - cell * 0.3, cell * 0.6, cell * 0.6, 3); ctx.fillStyle = '#e5e7eb'; ctx.fill(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
    }
    D.arrow(gx + 8 + 5 * cell + 10, gy + cell, hx - 4, gy + cell, { color: '#b7bdd0', width: 3, head: 9 });
    T((gx + 8 + 5 * cell + hx) / 2 + 2, gy + cell - 8, '1 : 1', 12.5, VIO, 'center', 800);
    if (done) {
      const leftH = N_HCL - cons, leftC = U - cons;
      const msg = leftC > 0 ? 'HCl ●이 모두 사라졌어요 → CaCO₃ ■ ' + leftC + '개(' + f2(leftC * UNIT_CA) + ' g)가 남았어요' : leftH > 0 ? 'CaCO₃ ■이 모두 사라졌어요 → HCl ● ' + leftH + '개(' + fm(leftH * UNIT_HCL) + ' mol)가 남았어요' : 'CaCO₃와 HCl이 딱 맞게 모두 반응했어요';
      textBlock(n.x + 16, n.y + n.h - 40, n.w - 32, msg, PHONE ? 13 : 14, '#0b6b39', 18, 800);
    } else T(n.x + 16, n.y + n.h - 14, '■ 1개와 ● 1개가 짝지어 반응해요. 짝이 없는 쪽이 남아요.', 13, MUTED, 'left', 800);
  }
  function drawRecTable() {
    const t = RL.tb, r = S.run; panel(t.x, t.y, t.w, t.h, 14);
    T(t.x + 14, t.y + 24, '📋 측정 기록표 (단위: g)', 14.5, INK, 'left', 800);
    const cx = [0.05, 0.27, 0.52, 0.77].map((f) => t.x + t.w * f);
    ['CaCO₃', '반응 전', '반응 후', '감소'].forEach((h, i) => T(cx[i], t.y + 50, h, PHONE ? 11.5 : 12, MUTED, 'left', 800));
    const rows = MS.length, rh = Math.min(30, (t.h - 100) / rows);
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(t.x + 10, t.y + 58); ctx.lineTo(t.x + t.w - 10, t.y + 58); ctx.stroke();
    MS.forEach((m, i) => {
      const y = t.y + 62 + i * rh, rec = r.rec[i], act = i === r.sel && r.phase !== 'idle';
      if (act || i === r.sel) { D.roundRect(t.x + 8, y, t.w - 16, rh - 2, 8); ctx.fillStyle = act ? 'rgba(245,158,11,.22)' : 'rgba(139,92,246,.10)'; ctx.fill(); }
      T(cx[0], y + rh * 0.68, f2(m), 14, INK, 'left', 800);
      if (rec) { T(cx[1], y + rh * 0.68, f2(rec.before), 14, INK, 'left', 800); T(cx[2], y + rh * 0.68, f2(rec.after), 14, INK, 'left', 800); T(cx[3], y + rh * 0.68, f2(rec.dec), 14, '#0b7a41', 'left', 800); }
      else T(cx[1], y + rh * 0.68, '—', 14, '#b0b8c6', 'left', 800);
    });
    T(t.x + 14, t.y + t.h - 16, '측정 ' + measured() + ' / ' + MS.length + ' · 5개 이상 측정해요', 13, measured() >= 5 ? '#0b7a41' : MUTED, 'left', 800);
  }
  function drawRun() { drawFlaskScene(); drawInset(); drawRecTable(); }

  /* ================= ③ 그래프 해석 · ④ 보조 계 ================= */
  const GCFG = {
    ca: { xs: MS, xmax: 8, ymax: 2.5, xt: [0, 1, 2, 3, 4, 5, 6, 7, 8], yt: [0, 0.5, 1, 1.5, 2, 2.5], fx: f2, fy: f2, xl: 'CaCO₃의 질량 (g)', yl: '감소한 질량 (g)', knee: KNEE_CA, unitX: ' g', unitY: ' g' },
    mg: { xs: MG_MS, xmax: 0.6, ymax: 300, xt: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], yt: [0, 100, 200, 300], fx: f2, fy: (v) => String(+v.toFixed(1)), xl: 'Mg의 질량 (g)', yl: '발생한 H₂ 부피 (mL)', knee: KNEE_MG, unitX: ' g', unitY: ' mL' },
  };
  const gYs = (k) => (k === 'ca' ? MS.map((m, i) => (S.run.rec[i] ? S.run.rec[i].dec : DEC[i])) : MG_V);
  const gHollow = (k, i) => (k === 'ca' ? !S.run.rec[i] : false);
  const GL = PHONE
    ? { graph: { x: 8, y: 8, w: 464, h: 396 }, info: { x: 8, y: 412, w: 464, h: 280 }, g2: { x: 8, y: 8, w: 464, h: 330 }, tab: { x: 8, y: 346, w: 464, h: 190 }, info2: { x: 8, y: 544, w: 464, h: 148 } }
    : { graph: { x: 8, y: 8, w: 524, h: 544 }, info: { x: 540, y: 8, w: 252, h: 544 }, g2: { x: 8, y: 8, w: 480, h: 322 }, tab: { x: 8, y: 338, w: 480, h: 214 }, info2: { x: 496, y: 8, w: 296, h: 544 } };
  function plotBox(rect) { return { px0: rect.x + (PHONE ? 54 : 66), px1: rect.x + rect.w - 22, py0: rect.y + rect.h - (PHONE ? 52 : 60), py1: rect.y + 80 }; }
  function curGraph() { return S.mode === 'graph' ? { key: 'ca', rect: GL.graph } : S.mode === 'concl' ? { key: 'mg', rect: GL.g2 } : null; }
  function refreshGraphUI() {
    const k = gKey(), g = S.gr[k];
    $('#plotHead').textContent = k === 'ca' ? '📈 측정값을 그래프에 찍기' : '📈 보조 계 자료 찍기';
    $('#plotNote').textContent = k === 'ca' ? '측정하지 않은 값은 예시 자료(속이 빈 점)로 채워서 그려요.' : 'Mg + 2HCl → MgCl₂ + H₂: HCl 0.020 mol 일정, Mg 질량을 바꾼 자료예요.';
    $('#mkHead').textContent = '📍 꺾이는 점 표시하기';
    $('#mkNote').textContent = g.ok ? '꺾이는 점을 찾았어요! 아래에서 몰수비를 계산해 봐요.' : '그래프를 눌러 보세요. 세로선이 가장 가까운 자료 위치로 붙어요. 끌어서 옮길 수도 있어요.';
    $('#ratHead').textContent = k === 'ca' ? '🧮 꺾이는 점에서 몰수비' : '🧮 꺾이는 점에서 Mg와 HCl의 몰수비';
    $('#gNl').textContent = k === 'ca' ? 'CaCO₃의 몰수 (꺾이는 점)' : 'Mg의 몰수 (꺾이는 점)';
    $('#gRl').textContent = k === 'ca' ? 'HCl : CaCO₃ = □ : 1' : 'HCl : Mg = □ : 1';
    $('#gN').value = g.ratioOK ? (k === 'ca' ? '0.0500' : '0.0100') : ''; $('#gR').value = g.ratioOK ? '2' : '';
    $('#gN').disabled = $('#gR').disabled = $('#bRatio').disabled = g.ratioOK;
  }
  $('#bPlot').addEventListener('click', () => {
    const k = gKey(), g = S.gr[k]; if (g.plotted) return;
    g.plotted = true; Sound.click();
    g.pop.forEach((o, i) => { o.p = 0; tw(o, { p: 1 }, { duration: 0.55, delay: i * 0.13, ease: 'outBack' }); });
    refreshGraphUI(); updateCtl();
  });
  $('#bRatio').addEventListener('click', () => {
    const k = gKey(), g = S.gr[k]; if (g.ratioOK) return;
    if (!g.ok) { Sound.fail(); showHint('먼저 그래프에서 꺾이는 점을 표시해 주세요.', 3200); return; }
    const n = parseNum($('#gN').value), q = parseNum($('#gR').value);
    const nExp = k === 'ca' ? r6(KNEE_CA / M_CACO3) : r6(KNEE_MG / M_MG), hcl = k === 'ca' ? HCL_N : MG_HCL;
    if (isNaN(n) || isNaN(q)) { Sound.fail(); showHint('두 칸에 모두 숫자를 써 주세요.', 2800); return; }
    if (Math.abs(n - nExp) > nExp * 0.02) { Sound.fail(); $('#gN').classList.remove('bad'); void $('#gN').offsetWidth; $('#gN').classList.add('bad'); showHint('몰수 = 질량 ÷ 몰질량이에요. ' + f2(g.mk) + ' g ÷ ' + (k === 'ca' ? M_CACO3 : M_MG) + ' g/mol을 계산해 보세요.', 4400); return; }
    $('#gN').classList.remove('bad'); $('#gN').classList.add('ok');
    if (Math.abs(q - hcl / nExp) > 0.05) { Sound.fail(); $('#gR').classList.remove('bad'); void $('#gR').offsetWidth; $('#gR').classList.add('bad'); showHint('반응한 HCl의 몰수 ' + fm(hcl) + ' mol을 ' + (k === 'ca' ? 'CaCO₃' : 'Mg') + '의 몰수 ' + fm(nExp) + ' mol로 나누어 보세요.', 4600); return; }
    $('#gR').classList.add('ok'); g.ratioOK = true; Sound.success(); refreshGraphUI(); updateCtl();
    const R = curGraph().rect; parts.burst(R.x + R.w / 2, R.y + R.h / 2, { count: 20, speed: 160, size: 3.4, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
  });
  ['gN', 'gR'].forEach((id) => $('#' + id).addEventListener('input', () => { $('#' + id).classList.remove('bad'); }));

  function snapMarker(p) {
    const cg = curGraph(); if (!cg) return false;
    const g = S.gr[cg.key], cfg = GCFG[cg.key], pb = plotBox(cg.rect);
    if (!g.plotted) return false;
    if (p.x < pb.px0 - 14 || p.x > pb.px1 + 14 || p.y < pb.py1 - 36 || p.y > pb.py0 + 14) return false;
    const x = ((p.x - pb.px0) / (pb.px1 - pb.px0)) * cfg.xmax;
    let best = cfg.xs[0]; cfg.xs.forEach((v) => { if (Math.abs(v - x) < Math.abs(best - x)) best = v; });
    return best;
  }
  function setMarker(val, final) {
    const cg = curGraph(), g = S.gr[cg.key], cfg = GCFG[cg.key], was = g.ok;
    if (g.mk !== val) { g.mk = val; if (!final) Sound.click(); }
    g.ok = Math.abs(val - cfg.knee) < 1e-9;
    if (g.ok && !was) { Sound.success(); tw(g.fit, { p: 1 }, { duration: RM ? 0.01 : 0.9, ease: 'outCubic' }); const pb = plotBox(cg.rect); parts.burst(pb.px0 + (val / cfg.xmax) * (pb.px1 - pb.px0), pb.py1 + 20, { count: 14, speed: 120, size: 3, colors: ['#14a058', '#ffb400', '#8b5cf6'] }); }
    if (!g.ok && was) { g.fit.p = 0; }
    refreshGraphUI(); updateCtl();
  }
  SciSim.pointer(view, {
    down(p) { const v = snapMarker(p); if (v === false) return false; S.gr[curGraph().key].drag = true; setMarker(v, false); return true; },
    move(p) { const cg = curGraph(); if (!cg || !S.gr[cg.key].drag) return; const pb = plotBox(cg.rect), cfg = GCFG[cg.key]; const x = clamp(((p.x - pb.px0) / (pb.px1 - pb.px0)) * cfg.xmax, 0, cfg.xmax); let best = cfg.xs[0]; cfg.xs.forEach((v) => { if (Math.abs(v - x) < Math.abs(best - x)) best = v; }); if (best !== S.gr[cg.key].mk) setMarker(best, false); },
    up() { const cg = curGraph(); if (cg) S.gr[cg.key].drag = false; },
    hover(p) { const cg = curGraph(); return cg && S.gr[cg.key].plotted && snapMarker(p) !== false ? 'ew-resize' : 'default'; },
  });
  function drawGraph(rect, key) {
    const g = S.gr[key], cfg = GCFG[key], pb = plotBox(rect), { px0, px1, py0, py1 } = pb, ys = gYs(key);
    const X = (v) => px0 + (v / cfg.xmax) * (px1 - px0), Y = (v) => py0 - (v / cfg.ymax) * (py0 - py1);
    panel(rect.x, rect.y, rect.w, rect.h, 14);
    T(rect.x + 14, rect.y + 26, key === 'ca' ? '📈 CaCO₃의 질량과 감소한 질량' : '📈 Mg의 질량과 발생한 H₂의 부피', 14.5, INK, 'left', 800);
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5;
    cfg.yt.forEach((v) => { ctx.beginPath(); ctx.moveTo(px0, Y(v)); ctx.lineTo(px1, Y(v)); ctx.stroke(); T(px0 - 8, Y(v) + 4, cfg.fy(v), 12.5, MUTED, 'right', 800); });
    cfg.xt.forEach((v) => { T(X(v), py0 + 18, String(+v.toFixed(2)), 12.5, MUTED, 'center', 800); });
    ctx.strokeStyle = '#7b8499'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px0, py1 - 6); ctx.lineTo(px0, py0); ctx.lineTo(px1 + 6, py0); ctx.stroke();
    T(px1, py0 + 38, cfg.xl, 13, INK, 'right', 800); T(px0 + 4, py1 - 16, cfg.yl, 13, INK, 'left', 800);
    // 이론 · 추세선
    if (g.ok && g.fit.p > 0.01) {
      const yk = ys[cfg.xs.indexOf(cfg.knee)], p = g.fit.p;
      ctx.save(); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.setLineDash([9, 6]);
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(0) + (X(cfg.knee) - X(0)) * p, Y(0) + (Y(yk) - Y(0)) * p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(cfg.knee), Y(yk)); ctx.lineTo(X(cfg.knee) + (X(cfg.xmax) - X(cfg.knee)) * p, Y(yk)); ctx.stroke(); ctx.restore();
    }
    // 점
    cfg.xs.forEach((x, i) => {
      const pop = clamp(g.pop[i].p, 0, 1.3); if (pop <= 0.02 || !g.plotted) return;
      const cx = X(x), cy = Y(ys[i]), hollow = gHollow(key, i);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(pop, pop);
      if (hollow) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, TAU); ctx.fill(); ctx.stroke(); }
      else D.sphere(0, 0, 8, '#8b5cf6', { gloss: true });
      ctx.restore();
    });
    // 꺾이는 점 표시선
    if (g.mk != null) {
      const mx = X(g.mk), yi = ys[cfg.xs.indexOf(g.mk)], pul = g.ok ? 1 + 0.12 * Math.sin(S.t * 6) : 1;
      ctx.save(); ctx.strokeStyle = g.ok ? '#14a058' : '#f59e0b'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(mx, py0); ctx.lineTo(mx, py1 - 4); ctx.stroke(); ctx.restore();
      D.sphere(mx, py1 - 12, 10 * pul, g.ok ? '#14a058' : '#f59e0b', { gloss: true });
      D.label(clamp(mx, rect.x + 60, rect.x + rect.w - 60), py1 - 34, cfg.fx(g.mk) + cfg.unitX + ' → ' + cfg.fy(yi) + cfg.unitY, { bg: g.ok ? '#14a058' : '#f59e0b', size: 12.5, pad: 7 });
    }
    if (!g.plotted) T((px0 + px1) / 2, (py0 + py1) / 2, '“📈 점 찍기”를 눌러 자료를 그려 봐요', 15, MUTED, 'center', 800);
    else if (g.mk == null) T((px0 + px1) / 2, py0 - 12, '그래프를 눌러 꺾이는 점을 표시해요', 13.5, '#b45309', 'center', 800);
    else if (g.ok) { T(X(cfg.knee * 0.5) - (PHONE ? 38 : 62), Y(ys[cfg.xs.indexOf(cfg.knee)] * 0.5) - 6, key === 'ca' ? '비례: 기울기 0.44' : '비례', 13, '#0b7a41', 'center', 800, { alpha: g.fit.p }); T(X((cfg.knee + cfg.xmax) / 2), Y(ys[cfg.xs.indexOf(cfg.knee)]) - 14, '더 늘지 않아요 (일정)', 13, '#0b7a41', 'center', 800, { alpha: g.fit.p }); }
    if (key === 'ca' && g.plotted) { ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(px1 - 150, rect.y + 24, 5, 0, TAU); ctx.fill(); T(px1 - 140, rect.y + 28, '측정', 12, MUTED, 'left', 800); ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px1 - 96, rect.y + 24, 5, 0, TAU); ctx.stroke(); T(px1 - 86, rect.y + 28, '예시 자료', 12, MUTED, 'left', 800); }
  }
  function infoLines(rect, title, lines) {
    panel(rect.x, rect.y, rect.w, rect.h, 14);
    T(rect.x + 14, rect.y + 26, title, 14.5, INK, 'left', 800);
    let y = rect.y + 52;
    lines.forEach((ln) => {
      if (!ln.on) return;
      const h = textBlock(rect.x + 14, y, rect.w - 28, ln.t, PHONE ? 13.5 : 14.5, ln.c || INK, PHONE ? 19 : 20, 800); y += h + 8;
    });
  }
  function drawGraphScene() {
    drawGraph(GL.graph, 'ca');
    const g = S.gr.ca, cf = GCFG.ca, i5 = MS.indexOf(KNEE_CA), y5 = gYs('ca')[i5];
    infoLines(GL.info, '📐 그래프에서 읽기', [
      { on: !g.plotted, t: '자료를 그래프에 찍어 봐요.', c: MUTED },
      { on: g.plotted && !g.ok, t: 'CaCO₃가 늘어도 감소한 질량이 더 늘지 않는 곳, 직선이 꺾이는 점을 찾아요.', c: MUTED },
      { on: g.ok, t: '꺾이는 점: CaCO₃ ' + f2(KNEE_CA) + ' g, 감소 ' + f2(y5) + ' g' },
      { on: g.ok, t: '기울기 = ' + f2(y5) + ' / ' + f2(KNEE_CA) + ' = ' + fT(r6(y5 / KNEE_CA)) + ' g/g = 44 / 100 (CO₂와 CaCO₃의 몰질량비)', c: '#0b7a41' },
      { on: g.ok, t: 'n(HCl) = 2.0 M × 0.050 L = ' + fm(HCL_N) + ' mol (일정)' },
      { on: g.ratioOK, t: 'n(CaCO₃) = ' + f2(KNEE_CA) + ' / ' + M_CACO3 + ' = ' + fm(r6(KNEE_CA / M_CACO3)) + ' mol' },
      { on: g.ratioOK, t: 'HCl : CaCO₃ = ' + fm(HCL_N) + ' : ' + fm(r6(KNEE_CA / M_CACO3)) + ' = 2 : 1', c: VIO },
      { on: g.ratioOK, t: '= 반응식의 계수비 (CaCO₃ + 2HCl → …)', c: '#0b7a41' },
    ]);
  }
  function diffTxt(a, b) { const d = cents(a) - cents(b); return d === 0 ? '0.00' : (d > 0 ? '+' : '−') + (Math.abs(d) / 100).toFixed(2); }
  function drawConclScene() {
    drawGraph(GL.g2, 'mg');
    const t = GL.tab, ys = gYs('ca'); panel(t.x, t.y, t.w, t.h, 14);
    T(t.x + 14, t.y + 24, 'CaCO₃ 계: 측정값과 이론값 (이론값 = 몰수 × 44)', PHONE ? 13 : 14, INK, 'left', 800);
    const cx = [0.05, 0.27, 0.5, 0.74].map((f) => t.x + t.w * f);
    ['CaCO₃(g)', '측정(g)', '이론(g)', '차(g)'].forEach((h, i) => T(cx[i], t.y + 48, h, 12.5, MUTED, 'left', 800));
    const rh = Math.min(20, (t.h - 64) / 8);
    MS.forEach((m, i) => {
      const y = t.y + 60 + i * rh, d = diffTxt(ys[i], THEO[i]);
      T(cx[0], y + rh * 0.78, f2(m), 13, INK, 'left', 800); T(cx[1], y + rh * 0.78, f2(ys[i]), 13, INK, 'left', 800); T(cx[2], y + rh * 0.78, f2(THEO[i]), 13, MUTED, 'left', 800); T(cx[3], y + rh * 0.78, d, 13, d === '0.00' ? '#0b7a41' : AMB, 'left', 800);
    });
    const g = S.gr.mg, i24 = MG_MS.indexOf(KNEE_MG), y24 = MG_V[i24], c = S.conc;
    const hypOK = S.plan.hyp === 'h2';
    infoLines(GL.info2, S.sub4 === 'aux' ? '📐 보조 계 해석' : '🏁 결론 정리', S.sub4 === 'aux' ? [
      { on: !g.plotted, t: '보조 계 자료를 그래프에 찍어 봐요.', c: MUTED },
      { on: g.plotted && !g.ok, t: 'CaCO₃ 계와 같은 방법으로 꺾이는 점을 찾아 표시해요.', c: MUTED },
      { on: g.ok, t: '꺾이는 점: Mg ' + f2(KNEE_MG) + ' g, H₂ ' + fT(y24) + ' mL' },
      { on: g.ok, t: 'H₂ ' + fT(y24) + ' mL / 24500 mL/mol = ' + fm(r6(y24 / (VM25 * 1000))) + ' mol (25 °C, 1 mol = 24.5 L)' },
      { on: g.ok, t: 'n(HCl) = ' + fm(MG_HCL) + ' mol (일정)' },
      { on: g.ratioOK, t: 'n(Mg) = ' + f2(KNEE_MG) + ' / ' + M_MG + ' = ' + fm(r6(KNEE_MG / M_MG)) + ' mol' },
      { on: g.ratioOK, t: 'HCl : Mg = ' + fm(MG_HCL) + ' : ' + fm(r6(KNEE_MG / M_MG)) + ' = 2 : 1', c: VIO },
    ] : [
      { on: !c.ok, t: '결론 문장을 완성하고, 오차의 원인을 골라 보세요.', c: MUTED },
      { on: c.ok, t: 'CaCO₃ : HCl = 1 : 2, Mg : HCl = 1 : 2', c: VIO },
      { on: c.ok, t: '두 반응 모두 반응물의 몰수비 = 반응식의 계수비예요.', c: '#0b7a41' },
      { on: c.ok, t: S.plan.hyp ? (hypOK ? '✔ 내 가설과 같았어요: CaCO₃가 늘다가 ' + f2(KNEE_CA) + ' g부터 더 늘지 않았어요.' : '내 가설과 달랐어요. 가설이 틀려도 새로운 사실을 알려 주는 좋은 결과예요.') : '가설을 세웠다면 결과와 비교해 보세요.', c: hypOK ? '#0b7a41' : AMB },
      { on: c.ok, t: '오차 원인: ' + CAUSES.filter((q) => q[2] && c.causes[q[0]]).map((q) => q[1].replace(/ \(.*\)/, '')).join(', ') },
    ]);
  }
  function stepGraphs(dt) {}

  /* ================= ① 계획 세우기 ================= */
  const PL = PHONE
    ? { A: { x: 8, y: 8, w: 464, h: 222 }, B: { x: 8, y: 238, w: 464, h: 262 }, C: { x: 8, y: 508, w: 464, h: 184 } }
    : { A: { x: 8, y: 8, w: 300, h: 544 }, B: { x: 316, y: 8, w: 476, h: 314 }, C: { x: 316, y: 330, w: 476, h: 222 } };
  function drawBench() {
    const a = PL.A; panel(a.x, a.y, a.w, a.h, 14);
    T(a.x + 14, a.y + 26, '🧰 실험 준비', 14.5, INK, 'left', 800);
    const fx = PHONE ? a.x + 100 : a.x + 112, by = a.y + (PHONE ? 172 : 232), fw = PHONE ? 84 : 120, fh = PHONE ? 104 : 150;
    D.shadow(() => { D.roundRect(fx - fw * 0.8, by + 2, fw * 2.2, 38, 10); ctx.fillStyle = '#cfd6e6'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(fx - fw * 0.68, by + 11, fw * 1.96, 20, 6); ctx.fillStyle = '#17223a'; ctx.fill(); T(fx + fw * 1.2, by + 27, '125.30 g', 13, '#7ef0a8', 'right', 800);
    D.flask(fx, by, fw, fh, { level: 0.4, liquid: '#bfe3ff', t: S.t });
    D.label(fx, by - fh - 12, '염산 2.0 M 50 mL', { bg: '#3867f4', size: 12.5, pad: 7 });
    // 약포지
    D.shadow(() => { D.roundRect(fx + fw * 0.62, by - 6, 56, 6, 3); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
    for (let j = 0; j < 6; j++) { D.roundRect(fx + fw * 0.62 + 6 + j * 8, by - 14 - (j % 2) * 5, 7, 7, 2); ctx.fillStyle = '#e5e7eb'; ctx.fill(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1; ctx.stroke(); }
    const items = ['⚖️ 전자저울 · 삼각 플라스크', '🧪 염산 2.0 M 50 mL (HCl 0.100 mol)', '⚪ CaCO₃ 0.50 ~ 7.00 g, 약포지', '🥽 보안경 · 실험복', '반응: CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂'];
    const lx = PHONE ? a.x + 214 : a.x + 14, ly = PHONE ? a.y + 52 : by + 70;
    let y = ly; items.forEach((t, i) => { y += textBlock(lx, y, a.w - (lx - a.x) - 12, t, i === 4 ? 12.5 : PHONE ? 13 : 14, i === 4 ? VIO : INK, PHONE ? 17 : 19, 800) + 6; });
  }
  function secRow(x, y, w, label, col, text, filled) {
    D.label(x, y + 10, label, { bg: col, size: 12, align: 'left', pad: 7 });
    const ls = wrap(text, w - 78, PHONE ? 13 : 14, 800);
    ls.forEach((l, i) => T(x + 74, y + 15 + i * 18, l, PHONE ? 13 : 14, filled ? INK : '#a3acbd', 'left', 800));
    return Math.max(30, ls.length * 18 + 10);
  }
  function drawPlan() {
    drawBench();
    const b = PL.B, p = S.plan; panel(b.x, b.y, b.w, b.h, 14);
    T(b.x + 14, b.y + 26, '📝 실험 계획서', 15, INK, 'left', 800);
    let y = b.y + 42;
    y += secRow(b.x + 14, y, b.w - 28, '탐구 질문', '#64748b', '반응물의 양을 바꾸면 생성물의 양은 어떻게 변할까?', true) + 6;
    y += secRow(b.x + 14, y, b.w - 28, '가설', '#8b5cf6', p.hyp ? HYP[p.hyp] : '(가설을 고르세요)', !!p.hyp) + 6;
    y += secRow(b.x + 14, y, b.w - 28, '조작 변인', '#f59e0b', p.man ? VTXT[p.man] : '(고르세요)', !!p.man) + 4;
    y += secRow(b.x + 14, y, b.w - 28, '통제 변인', '#3b82f6', p.ctl ? VTXT[p.ctl] : '(고르세요)', !!p.ctl) + 4;
    y += secRow(b.x + 14, y, b.w - 28, '종속 변인', '#14a058', p.dep ? VTXT[p.dep] : '(고르세요)', !!p.dep) + 6;
    secRow(b.x + 14, y, b.w - 28, '측정 방법', '#ec7a52', p.meth ? METH[p.meth] + (p.rea ? ' — ' + REAS[p.rea] : '') : '(방법을 고르세요)', !!p.meth);
    // 방법 비교 카드
    const c = PL.C; panel(c.x, c.y, c.w, c.h, 14);
    T(c.x + 14, c.y + 26, '⚖️ 두 가지 측정 방법', 14.5, INK, 'left', 800);
    const cw = (c.w - 40) / 2;
    [['mass', '질량 감소법', ['저울만 있으면 돼요', '장치가 간단해요'], ['물방울이 CO₂와 함께 날아가면 오차가 생겨요']], ['gas', '기체 포집법', ['기체의 부피를 바로 읽어요'], ['CO₂가 물에 조금 녹아 부피가 작게 나와요', '장치가 복잡해요']]].forEach(([k, name, pro, con], i) => {
      const x = c.x + 14 + i * (cw + 12), on = p.meth === k;
      D.roundRect(x, c.y + 40, cw, c.h - 54, 12); ctx.fillStyle = on ? '#f3efff' : '#f8f9fc'; ctx.fill(); ctx.strokeStyle = on ? VIO : '#d5d9e6'; ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
      T(x + 12, c.y + 64, (k === 'mass' ? '⚖️ ' : '💧 ') + name, 14.5, on ? '#5b21b6' : INK, 'left', 800);
      let yy = c.y + 86;
      pro.forEach((t) => { yy += textBlock(x + 12, yy, cw - 24, '👍 ' + t, PHONE ? 12.5 : 13.5, '#0b6b39', PHONE ? 16 : 18, 800) + 4; });
      con.forEach((t) => { yy += textBlock(x + 12, yy, cw - 24, '👎 ' + t, PHONE ? 12.5 : 13.5, '#b4231f', PHONE ? 16 : 18, 800) + 4; });
    });
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'plan') {
      L1 = '조작 변인'; a = S.plan.man ? VTXT[S.plan.man] : '?'; L2 = '통제 변인'; b = S.plan.ctl ? VTXT[S.plan.ctl] : '?'; L3 = '종속 변인'; c = S.plan.dep ? VTXT[S.plan.dep] : '?';
    } else if (S.mode === 'run') {
      const r = S.run, rec = r.sel >= 0 ? r.rec[r.sel] : null;
      L1 = '고른 CaCO₃'; a = r.sel >= 0 ? f2(MS[r.sel]) + ' g' : '—';
      L2 = '감소한 질량'; b = rec ? f2(rec.dec) + ' g' : r.phase === 'react' ? '반응 중…' : '?';
      L3 = '측정한 횟수'; c = measured() + ' / ' + MS.length;
    } else {
      const k = gKey(), g = S.gr[k], cfg = GCFG[k], nExp = k === 'ca' ? KNEE_CA / M_CACO3 : KNEE_MG / M_MG;
      L1 = '표시한 점'; a = g.mk != null ? cfg.fx(g.mk) + cfg.unitX : '—';
      L2 = k === 'ca' ? 'CaCO₃의 몰수' : 'Mg의 몰수'; b = g.ratioOK ? fm(r6(nExp)) + ' mol' : g.ok ? '꺾이는 점 ✔' : '?';
      L3 = k === 'ca' ? 'HCl : CaCO₃' : 'HCl : Mg'; c = g.ratioOK ? '2 : 1' : '?';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 결론 입력 ---------- */
  CAUSES.forEach(([k, t]) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.className = 'chk'; b.textContent = t;
    b.addEventListener('click', () => { Sound.click(); S.conc.causes[k] = !S.conc.causes[k]; updateCtl(); });
    $('#causeChips').appendChild(b);
  });
  ['c1', 'c2', 'c3'].forEach((id) => $('#' + id).addEventListener('change', () => { S.conc[id] = $('#' + id).value; Sound.click(); }));
  const concValid = () => S.conc.c1 === '2' && S.conc.c2 === '2' && S.conc.c3 === 'coef' && CAUSES.filter((q) => q[2] && S.conc.causes[q[0]]).length >= 2 && !CAUSES.some((q) => !q[2] && S.conc.causes[q[0]]);

  /* ---------- 장면 초기화 ---------- */
  function resetGraph(k) {
    tws.forEach((h) => h.cancel()); tws.length = 0;
    const g = S.gr[k]; g.plotted = false; g.mk = null; g.drag = false; g.ok = false; g.ratioOK = false; g.fit.p = 0; g.pop.forEach((o) => { o.p = 0; });
    ['gN', 'gR'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); });
  }
  function resetRun() {
    cancelRun(); S.safe = false; S.safeSel = {}; S.run.sel = -1; S.run.rec = MS.map(() => null); S.run.pieces = []; S.run.read = FLASK0;
    $$('#safeChips button').forEach((b) => b.classList.remove('bad', 'good'));
  }
  function resetConc() { S.conc = { c1: '', c2: '', c3: '', causes: {}, ok: false }; ['c1', 'c2', 'c3'].forEach((id) => { $('#' + id).value = ''; }); }

  /* ================= 미션 ================= */
  const leftover = r6(HCL_N - 4.0 / M_CACO3 * 2);
  const slope = r6(DEC[MS.indexOf(KNEE_CA)] / KNEE_CA);
  const levels = [
    {
      title: '계획 세우기: 가설 · 변인 · 방법', short: '계획 세우기', icon: '📝', phase: '예측',
      intro: '<p class="si-q">❓ 탐구 질문: 반응물의 양을 바꾸면 생성물의 양은 어떻게 변할까? 반응물 사이에는 어떤 비가 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 계수비는 몰수의 비이고, 먼저 소진되는 반응물이 생성물의 양을 정한다는 것을 배웠어요. 이번에는 그것을 <b>실험으로 확인</b>해 봐요.</div>' +
        '<p>주 실험은 <b>CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂</b>예요. 염산의 양은 <b>일정</b>(2.0 M 50 mL, HCl 0.100 mol — 농도는 단원 36에서 자세히 배워요)하게 하고 CaCO₃ 질량만 바꾸며, 열린 용기에서 <b>줄어든 질량(= 날아간 CO₂의 질량)</b>을 재요. 먼저 가설 · 변인 · 측정 방법을 계획해요.</p>',
      features: ['plan'],
      setup() { resetPlan(); setScene('plan'); updateCtl(); },
      recap: '실험 계획에는 가설, 바꾸는 변인(CaCO₃ 질량), 같게 하는 변인(염산의 양과 농도), 측정할 변인(줄어든 질량), 측정 방법이 필요해요.',
      summary: '<ul><li>탐구 질문: 반응물의 양을 바꾸면 생성물의 양은 어떻게 변할까?</li><li><b>조작 변인</b>: CaCO₃의 질량 / <b>통제 변인</b>: 염산의 양과 농도(2.0 M 50 mL = HCl ' + fm(HCL_N) + ' mol), 온도 / <b>종속 변인</b>: 줄어든 질량(날아간 CO₂)</li><li>측정 방법: <b>질량 감소법</b> — 저울만 있으면 되고 CO₂의 질량이 바로 나와요. (기체 포집법은 CO₂가 물에 녹아 오차가 생겨요.)</li><li>안전: 보안경 · 실험복 착용, 산 용액이 피부에 닿지 않게, 폐액은 정해진 방법으로 처리.</li></ul>',
      missions: [
        {
          title: '가설과 변인 표 완성하기', manual: true,
          goal: '가설을 하나 고르고, <b>조작 · 통제 · 종속 변인</b>에 알맞은 것을 골라 계획서를 채운 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '바꾸는 것은 CaCO₃의 질량, 같게 하는 것은 염산의 양과 농도, 재는 것은 줄어든 질량이에요. 가설은 맞고 틀림이 없어요. 내 생각을 골라요.',
          setup() { S.sub1 = 'var'; setScene('plan'); updateCtl(); },
          check() {
            const p = S.plan;
            if (!p.hyp) return '가설을 하나 골라 주세요.';
            if (!p.man || !p.ctl || !p.dep) return '변인 세 칸을 모두 골라 주세요.';
            if (p.man !== 'A') return '조작 변인은 우리가 일부러 바꾸는 것이에요. 이 실험에서는 무엇을 바꿀까요?';
            if (p.ctl !== 'B') return '통제 변인은 결과에 영향을 주지 않도록 같게 유지하는 것이에요. 염산의 양과 농도를 같게 해요.';
            if (p.dep !== 'C') return '종속 변인은 조작 변인에 따라 변해서 측정하는 것이에요. 저울로 재는 값은 무엇일까요?';
            return true;
          },
          explain: '<b>조작 변인</b>은 바꾸는 CaCO₃의 질량, <b>통제 변인</b>은 같게 하는 염산의 양과 농도, <b>종속 변인</b>은 측정하는 줄어든 질량(날아간 CO₂)이에요. 한 번에 하나(CaCO₃ 질량)만 바꿔야 결과의 원인을 알 수 있어요.',
        },
        {
          title: '측정 방법과 이유 정하기', manual: true,
          goal: '<b>⚖️ 측정 방법</b>에서 이 실험에 쓸 방법과 그 이유를 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '두 방법의 장단점 카드를 읽어 보세요. 이 실험실에는 전자저울이 준비되어 있어요.',
          setup() { S.sub1 = 'meth'; S.plan.meth = ''; S.plan.rea = ''; $('#reaSel').value = ''; setScene('plan'); updateCtl(); },
          check() {
            const p = S.plan;
            if (!p.meth) return '측정 방법을 골라 주세요.';
            if (p.meth === 'gas') return '기체 포집법은 CO₂가 물에 녹아 부피 오차가 생기고 장치도 복잡해요. 저울이 준비되어 있으니 다른 방법을 살펴보세요.';
            if (!p.rea) return '그 방법을 고른 이유를 골라 주세요.';
            if (p.rea !== 'r1') return p.rea === 'r2' ? '기체의 부피를 읽는 것은 기체 포집법의 장점이에요.' : '이유가 알맞지 않아요. 두 방법 카드를 다시 읽어 보세요.';
            return true;
          },
          explain: '<b>질량 감소법</b>은 열린 용기에서 줄어든 질량을 재요. 줄어든 질량이 곧 날아간 <b>CO₂의 질량</b>이고, 저울만 있으면 돼서 간단해요. 다만 물방울이 함께 날아가면 오차가 생길 수 있어요.',
        },
        {
          type: 'quiz', title: '염산의 양을 일정하게 해야 하는 이유',
          goal: 'CaCO₃의 질량만 바꾸고 <b>염산의 양과 농도는 같게</b> 해야 하는 이유는 무엇일까요?',
          setup() { S.sub1 = 'var'; setScene('plan'); updateCtl(); },
          choices: ['염산의 양도 함께 바뀌면, 감소량이 무엇 때문에 달라졌는지 알 수 없기 때문이에요', '염산이 비싸서 아껴 쓰기 위해서예요', '염산이 많으면 반응이 일어나지 않기 때문이에요', '다른 조건은 결과에 영향을 주지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '경제적인 이유가 아니라, 결과의 원인을 알아내기 위한 조건이에요.', '염산이 많아도 반응은 일어나요. 오히려 CaCO₃가 모두 소진될 수 있어요.', '반응하는 양에 영향을 주는 조건을 같게 해야 비교할 수 있어요.'],
          explain: '두 가지 이상을 한꺼번에 바꾸면 결과가 어떤 변인 때문인지 알 수 없어요. 그래서 <b>하나의 변인(CaCO₃ 질량)만 바꾸고</b> 나머지(염산의 양 · 농도 · 온도)는 <b>통제</b>해요.',
        },
      ],
    },
    {
      title: '실험 수행: 질량이 줄어드는 반응', short: '실험 수행', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> CaCO₃의 질량만 바꾸고 염산은 같게 하는 계획을 세웠어요. 이제 가상 저울 위에서 실험해 봐요.</div>' +
        '<p>먼저 <b>안전 점검</b>을 마쳐요. 그다음 CaCO₃ 질량을 하나 고르고 <b>▶ 반응시키기</b>를 눌러요. 기포(CO₂)가 날아가며 저울 눈금이 줄어들고, 반응 전 · 후의 질량과 줄어든 질량이 기록표에 쌓여요. <b>5개 이상</b> 측정해요.</p>',
      features: ['run'],
      setup() { resetRun(); setScene('run'); updateCtl(); },
      recap: 'CaCO₃가 염산과 반응하면 CO₂가 열린 용기 밖으로 나가서 저울 눈금이 줄어요. 줄어든 질량이 날아간 CO₂의 질량이에요.',
      summary: '<ul><li>CaCO₃ + 2HCl → CaCl₂ + H₂O + <b>CO₂(g)</b>: 열린 용기에서는 CO₂가 날아가 <b>질량이 줄어요</b>.</li><li>측정한 감소량 (CaCO₃ g → 감소 g): ' + MS.map((m, i) => f2(m) + ' → ' + f2(DEC[i])).join(', ') + '</li><li>이론값(몰수 × 44): ' + THEO.map((v) => f2(v)).join(', ') + ' — 측정값은 이론값과 조금씩 달라요.</li><li>염산 ' + fm(HCL_N) + ' mol은 일정, CaCO₃ ■ 1개(0.5 g = 0.005 mol)와 HCl ● 1개(0.010 mol)가 짝지어 반응하는 모형으로 설명해요.</li></ul>',
      missions: [
        {
          title: '5개 이상 측정하기',
          goal: '<b>안전 점검</b>을 마치고, 서로 다른 CaCO₃ 질량으로 <b>5번 이상</b> 반응시켜 기록표를 채우세요.',
          hint: '안전한 행동 3개(보안경, 피부 조심, 폐액 처리)를 고르고 ✔ 점검 끝을 눌러요. 그다음 질량을 고르고 ▶ 반응시키기를 눌러요. 질량마다 한 번씩만 측정할 수 있어요.',
          setup() { setScene('run'); updateCtl(); },
          check: () => S.safe && measured() >= 5,
          hold: 0.8,
          status: () => mark(S.safe) + ' 안전 점검 &nbsp; ' + mark(measured() >= 5) + ' 측정 ' + measured() + ' / 5개 이상',
          explain: '염산의 양은 같게 하고 CaCO₃ 질량만 바꾸어 측정했어요. 질량이 작을 때는 감소량이 CaCO₃에 비례하다가, 질량이 커지면 감소량이 일정해지는 것을 다음 단계 그래프에서 확인해요.',
        },
        {
          type: 'quiz', title: '반응 후 저울 눈금이 줄어든 까닭',
          goal: '반응이 끝난 뒤 저울의 눈금이 <b>줄어든</b> 까닭으로 알맞은 것은?',
          setup() { setScene('run'); updateCtl(); },
          choices: ['생성된 CO₂가 열린 용기 밖으로 빠져나갔기 때문이에요', '질량 보존 법칙이 깨졌기 때문이에요', 'CaCO₃가 사라져 버렸기 때문이에요', '저울이 고장 났기 때문이에요'],
          answer: 0,
          feedback: ['', '질량 보존은 늘 성립해요. 용기를 빠져나간 CO₂의 질량까지 합하면 같아요.', '원자는 사라지지 않고 다른 물질(CaCl₂, H₂O, CO₂)이 돼요.', '저울은 정상이에요. 기체 CO₂가 날아간 것이 원인이에요.'],
          explain: 'CO₂는 기체라서 열린 용기 밖으로 나가요. 줄어든 질량 = 날아간 <b>CO₂의 질량</b>이에요. 용기를 막고 재면 질량은 변하지 않아요(질량 보존).',
        },
      ],
    },
    {
      title: '그래프 해석: 꺾이는 점 찾기', short: '그래프 해석', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> CaCO₃ 질량에 따라 감소한 질량을 측정했어요. 이제 기록을 <b>그래프</b>로 그려 읽어 봐요. (측정하지 않은 값은 예시 자료로 채워요.)</div>' +
        '<p>x축은 CaCO₃의 질량, y축은 줄어든 질량이에요. 처음에는 원점을 지나는 <b>직선</b>이다가 어느 질량부터는 <b>수평</b>이 돼요. 직선이 꺾이는 점에서 CaCO₃와 HCl의 몰수비를 구하고, 반응식의 계수비와 비교해 봐요.</p>',
      features: ['graph'],
      setup() { resetGraph('ca'); setScene('graph'); updateCtl(); },
      recap: '직선이 꺾이는 점(CaCO₃ 5.00 g = 0.0500 mol)에서 두 반응물이 모두 소진돼요. 그때 HCl : CaCO₃ = 0.100 : 0.0500 = 2 : 1로 계수비와 같아요.',
      summary: '<ul><li>그래프: 처음에는 원점을 지나는 직선(기울기 ' + fT(slope) + ' g/g = 44 ÷ 100), CaCO₃ <b>' + f2(KNEE_CA) + ' g</b>부터는 감소량이 ' + f2(DEC[MS.indexOf(KNEE_CA)]) + ' g 근처로 일정해요.</li><li>꺾이는 점에서 CaCO₃ ' + f2(KNEE_CA) + ' g ÷ 100 g/mol = <b>' + fm(KNEE_CA / M_CACO3) + ' mol</b>, HCl <b>' + fm(HCL_N) + ' mol</b> → HCl : CaCO₃ = <b>2 : 1</b> = 계수비</li><li>꺾이는 점 이후에는 염산이 먼저 모두 소진되어 CaCO₃가 남고, CO₂는 더 생기지 않아요. 최대 CO₂ = ' + fm(KNEE_CA / M_CACO3) + ' mol × 44 = ' + f2(r6(KNEE_CA / M_CACO3 * M_CO2)) + ' g</li></ul>',
      missions: [
        {
          title: '꺾이는 점 표시하기',
          goal: '<b>📈 점 찍기</b>로 자료를 그린 뒤, 그래프를 눌러 직선이 <b>꺾이는 점</b>(감소량이 더 늘지 않기 시작하는 CaCO₃ 질량)을 표시하세요.',
          hint: '앞부분은 원점을 지나는 직선, 뒷부분은 수평선이에요. 두 선이 만나는 점의 CaCO₃ 질량을 눌러요.',
          setup() { setScene('graph'); updateCtl(); },
          check: () => S.gr.ca.plotted && S.gr.ca.ok,
          hold: 0.6,
          status: () => mark(S.gr.ca.plotted) + ' 점 찍기 &nbsp; ' + mark(S.gr.ca.ok) + ' 꺾이는 점 표시',
          explain: '직선은 CaCO₃ <b>' + f2(KNEE_CA) + ' g</b>까지 이어지고 그 뒤는 수평이에요. 기울기 ' + f2(DEC[MS.indexOf(KNEE_CA)]) + ' ÷ ' + f2(KNEE_CA) + ' = ' + fT(slope) + ' g/g는 <b>44 ÷ 100</b>, 즉 CO₂와 CaCO₃의 몰질량비예요(CaCO₃ 1 mol → CO₂ 1 mol).',
        },
        {
          title: '꺾이는 점에서 몰수비 구하기',
          goal: '꺾이는 점에서 <b>CaCO₃의 몰수</b>와, HCl(0.100 mol)에 대한 <b>HCl : CaCO₃</b> 비를 구해 <b>✔ 계산 확인</b>을 누르세요.',
          hint: 'CaCO₃ 5.00 g ÷ 100 g/mol = 0.0500 mol이에요. HCl 0.100 mol ÷ 0.0500 mol이 비의 앞쪽 수예요.',
          setup() { S.gr.ca.ratioOK = false; ['gN', 'gR'].forEach((id) => $('#' + id).classList.remove('ok', 'bad')); setScene('graph'); refreshGraphUI(); updateCtl(); },
          check: () => S.gr.ca.ratioOK,
          hold: 0.5,
          status: () => mark(S.gr.ca.ok) + ' 꺾이는 점 &nbsp; ' + mark(S.gr.ca.ratioOK) + ' 몰수비 계산',
          explain: '꺾이는 점에서 CaCO₃ ' + f2(KNEE_CA) + ' g = <b>' + fm(KNEE_CA / M_CACO3) + ' mol</b>과 HCl <b>' + fm(HCL_N) + ' mol</b>이 딱 맞게 반응해요. HCl : CaCO₃ = ' + fm(HCL_N) + ' : ' + fm(KNEE_CA / M_CACO3) + ' = <b>2 : 1</b>이고, 반응식 CaCO₃ + 2HCl → …의 <b>계수비</b>와 같아요.',
        },
        {
          type: 'quiz', title: '꺾이는 점 이후에도 CO₂가 늘지 않는 까닭',
          goal: 'CaCO₃가 5.00 g보다 많아져도 날아간 CO₂의 질량이 <b>더 늘지 않는</b> 까닭은?',
          setup() { setScene('graph'); updateCtl(); },
          choices: ['CaCO₃가 먼저 모두 소진되기 때문이에요', '염산이 먼저 모두 소진되어 더 반응할 수 없기 때문이에요', '저울이 더 이상 줄어든 질량을 재지 못하기 때문이에요', 'CaCO₃가 염산에 녹지 않기 때문이에요'],
          answer: 1,
          feedback: ['5.00 g보다 많으면 CaCO₃가 남아요. 먼저 없어지는 쪽은 염산이에요.', '', '저울은 늘 정확하게 재고 있어요. 반응하는 양 자체가 늘지 않아요.', 'CaCO₃는 염산과 반응해요. 5.00 g까지는 감소량이 늘었잖아요.'],
          explain: '염산(HCl ' + fm(HCL_N) + ' mol)은 CaCO₃ ' + fm(KNEE_CA / M_CACO3) + ' mol(' + f2(KNEE_CA) + ' g)과 반응하면 모두 소진돼요. 그 뒤에 넣는 CaCO₃는 반응하지 못하고 남아서 CO₂의 양이 늘지 않아요. <b>먼저 소진되는 반응물이 생성물의 양을 정해요.</b>',
        },
      ],
    },
    {
      title: '결론 · 오차: 다른 반응으로 일반화', short: '결론·오차', icon: '🏁', phase: '확인',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 꺾이는 점에서 HCl : CaCO₃ = 2 : 1임을 찾았어요. 다른 반응에서도 같은 방법으로 비를 구할 수 있을까요?</div>' +
        '<p>보조 계는 <b>Mg + 2HCl → MgCl₂ + H₂</b>예요. 염산(HCl 0.020 mol)은 일정하게 하고 Mg의 질량을 바꾸며 발생한 <b>H₂의 부피(25 °C)</b>를 재었어요. 같은 방법으로 해석한 뒤 결론을 쓰고, 측정값이 이론값과 조금 다른 까닭도 토의해요.</p>',
      features: ['concl'],
      setup() { resetGraph('mg'); resetConc(); S.sub4 = 'aux'; setScene('concl'); updateCtl(); },
      recap: 'Mg + HCl에서도 꺾이는 점(Mg 0.24 g = 0.010 mol)에서 Mg : HCl = 1 : 2예요. 두 반응 모두 반응물의 몰수비는 반응식의 계수비와 같고, 측정값의 작은 차이는 측정 · 시료의 한계 때문이에요.',
      summary: '<ul><li>보조 계 Mg + 2HCl → MgCl₂ + H₂: 꺾이는 점 Mg <b>' + f2(KNEE_MG) + ' g = ' + fm(KNEE_MG / M_MG) + ' mol</b>, HCl ' + fm(MG_HCL) + ' mol → Mg : HCl = <b>1 : 2</b> (H₂ ' + fT(MG_V[1]) + ' mL = ' + fm(r6(MG_V[1] / (VM25 * 1000))) + ' mol)</li><li>결론: CaCO₃ : HCl = 1 : 2, Mg : HCl = 1 : 2 → 반응물의 몰수비는 반응식의 <b>계수비</b>와 같아요.</li><li>오차의 원인: 저울 눈금의 한계, 물방울이 CO₂와 함께 날아감, CO₂가 용액에 조금 녹음, 시료의 순도. (질량 보존 법칙이 깨진 것은 아니에요.)</li><li>CaCO₃ 4.00 g이면 CaCO₃ ' + fm(4 / M_CACO3) + ' mol이 HCl ' + fm(r6(4 / M_CACO3 * 2)) + ' mol과 반응해 HCl ' + fm(leftover) + ' mol이 남아요.</li></ul>',
      missions: [
        {
          title: '보조 계 해석하기',
          goal: '<b>📈 점 찍기</b> 후 Mg의 <b>꺾이는 점</b>을 표시하고, <b>Mg의 몰수</b>와 <b>HCl : Mg</b>를 구하세요.',
          hint: '꺾이는 점은 H₂의 부피가 더 늘지 않기 시작하는 Mg 질량이에요. Mg 0.24 g ÷ 24 g/mol이 몰수이고, HCl은 0.020 mol이에요.',
          setup() { S.sub4 = 'aux'; setScene('concl'); refreshGraphUI(); updateCtl(); },
          check: () => S.gr.mg.ratioOK,
          hold: 0.6,
          status: () => mark(S.gr.mg.plotted) + ' 점 찍기 &nbsp; ' + mark(S.gr.mg.ok || S.gr.mg.ratioOK) + ' 꺾이는 점 (Mg ' + f2(KNEE_MG) + ' g) &nbsp; ' + mark(S.gr.mg.ratioOK) + ' 몰수비',
          explain: 'Mg ' + f2(KNEE_MG) + ' g ÷ 24 g/mol = <b>' + fm(KNEE_MG / M_MG) + ' mol</b>이 HCl ' + fm(MG_HCL) + ' mol과 딱 맞게 반응해요. Mg : HCl = <b>1 : 2</b>이고, 반응식 Mg + 2HCl → …의 계수비와 같아요. H₂ ' + fT(MG_V[1]) + ' mL는 25 °C에서 ' + fm(r6(MG_V[1] / (VM25 * 1000))) + ' mol이라 Mg와 같은 몰수예요(계수비 1 : 1).',
        },
        {
          title: '결론 문장과 오차 원인', manual: true,
          goal: '결론 문장의 빈칸을 고르고, 측정값이 이론값과 조금 다른 <b>까닭 2개 이상</b>을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '두 반응에서 구한 몰수비는 모두 1 : 2였어요. 질량 보존 법칙은 깨지지 않고, 실험마다 계수비가 달라지지도 않아요.',
          setup() { S.sub4 = 'conc'; setScene('concl'); updateCtl(); },
          check() {
            const c = S.conc;
            if (!c.c1 || !c.c2 || !c.c3) return '결론 문장의 빈칸 세 곳을 모두 골라 주세요.';
            if (c.c1 !== '2') return 'CaCO₃ 1 mol과 반응하는 HCl의 몰수는 꺾이는 점에서 구한 비 1 : 2를 보세요.';
            if (c.c2 !== '2') return 'Mg 1 mol과 반응하는 HCl의 몰수는 보조 계에서 구한 비 1 : 2를 보세요.';
            if (c.c3 !== 'coef') return '몰수비는 반응식의 계수의 비와 같았어요.';
            if (CAUSES.some((q) => !q[2] && c.causes[q[0]])) return '계수비가 달라지거나 질량 보존이 깨지는 것은 오차의 원인이 아니에요. 측정과 시료의 한계를 찾아요.';
            if (CAUSES.filter((q) => q[2] && c.causes[q[0]]).length < 2) return '오차의 원인을 2개 이상 골라 주세요.';
            return true;
          },
          explain: 'CaCO₃ : HCl = 1 : 2, Mg : HCl = 1 : 2로, 반응물의 몰수비는 반응식의 <b>계수비</b>와 같아요. 측정값과 이론값의 작은 차이는 저울의 읽기 한계, 물방울 손실, CO₂의 용해, 시료의 순도 같은 <b>측정과 시료의 한계</b> 때문이에요.',
        },
        {
          type: 'quiz', title: 'CaCO₃ 4.00 g일 때 남는 염산',
          goal: 'CaCO₃ <b>4.00 g</b>을 염산 <b>0.100 mol</b>과 반응시켰어요. 반응이 끝난 뒤 남는 HCl은 몇 mol일까요?',
          setup() { S.sub4 = 'conc'; setScene('concl'); updateCtl(); },
          choices: [fm(leftover) + ' mol', fm(r6(4 / M_CACO3 * 2)) + ' mol', fm(r6(4 / M_CACO3)) + ' mol', fm(HCL_N) + ' mol'],
          answer: 0,
          feedback: ['', '이것은 반응한 HCl의 몰수예요. 처음 양에서 빼야 해요.', '이것은 CaCO₃의 몰수예요. 계수비 1 : 2를 써서 HCl 몰수를 구해요.', '처음 HCl의 양이에요. 일부는 반응에 쓰였어요.'],
          explain: 'CaCO₃ 4.00 g ÷ 100 g/mol = ' + fm(r6(4 / M_CACO3)) + ' mol → 반응하는 HCl = ' + fm(r6(4 / M_CACO3)) + ' × 2 = ' + fm(r6(4 / M_CACO3 * 2)) + ' mol이에요. 남는 HCl = ' + fm(HCL_N) + ' − ' + fm(r6(4 / M_CACO3 * 2)) + ' = <b>' + fm(leftover) + ' mol</b>이에요. (이때는 CaCO₃가 먼저 소진돼요.)',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-stoich-experiment', mount: '#game', badge: '탐구 실험 박사', homeHref: '../../index.html#hc',
    featureLabels: { plan: '📝 실험 계획서 · 변인 표', run: '🧪 가상 저울 · 기록표 · 입자 모형', graph: '📈 그래프 · 꺾이는 점 표시', concl: '🏁 보조 계 그래프 · 결론 · 오차 토의' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene(S.mode);
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; refreshGraphUI(); updateCtl(); }
    S.conc.ok = concValid();
    view.apply();
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'plan') drawPlan();
    else if (S.mode === 'run') { stepRun(dt); drawRun(); }
    else if (S.mode === 'graph') drawGraphScene();
    else drawConclScene();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MS, DEC, THEO, MG_MS, MG_V, MG_THEO, RL, GL, PL, GCFG, flaskG, plotBox, get game() { return game; },
    setScene, startRun, snapMarker, setMarker, resetRun, resetGraph,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; if (S.mode === 'run') stepRun(0.02); parts.update(0.02); } },
  };
})();
