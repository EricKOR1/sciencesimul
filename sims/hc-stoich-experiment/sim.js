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
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const fT = (v) => String(+(+v).toFixed(4));
  const f2 = (v) => (+v).toFixed(2);
  const parseNum = (s) => { const fr = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(String(s)); if (fr && +fr[2] !== 0) return +fr[1] / +fr[2]; const t = String(s).replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
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
    ? { sc: { x: 8, y: 8, w: 464, h: 300 }, inset: { x: 8, y: 316, w: 464, h: 152 }, tb: { x: 8, y: 476, w: 464, h: 216 }, fw: 118, fh: 150, cx: 150, by: 218, balW: 270, balCx: 236 }
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
    r.read = r.rec[i].after; r.phase = 'idle'; r.t = 0; Sound.success();
    const g = flaskG(); parts.burst(g.cx, g.top - 10, { count: 12, speed: 110, size: 3, colors: ['#8b5cf6', '#14a058', '#ffb400'], gravity: 160 });
    updateCtl();
  }
  function stepRun(dt) {
    const r = S.run; r.paper.p = RM ? (r.phase === 'pour' ? 1 : 0) : SciSim.approach(r.paper.p, r.phase === 'pour' ? 1 : 0, dt, 5);
    const g = flaskG();
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
    // 기포 · 이산화 탄소 (용기 안에서만 위로 올라가요)
    const rb = r.bub;
    for (let i = rb.length - 1; i >= 0; i--) {
      const b = rb[i]; b.y -= b.vy * dt; b.age += dt;
      if (b.kind === 'b' && b.y <= g.liqY) { b.kind = 's'; b.vy = 70; }
      if (b.y < g.top - 60) rb.splice(i, 1);
    }
  }
  function drawFlaskScene() {
    const sc = RL.sc, g = flaskG(), r = S.run;
    panel(sc.x, sc.y, sc.w, sc.h, 14);
    T(sc.x + 14, sc.y + 24, '🧪 실험 장치', 14.5, INK, 'left', 800);
    D.label(sc.x + sc.w - 14, sc.y + 22, '염산 2.0 M 50 mL = HCl ' + fT(HCL_N) + ' mol', { bg: '#3867f4', size: 12.5, align: 'right', pad: 7 });
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
      const msg = leftC > 0 ? 'HCl ●이 모두 사라졌어요 → CaCO₃ ■ ' + leftC + '개(' + f2(leftC * UNIT_CA) + ' g)가 남았어요' : leftH > 0 ? 'CaCO₃ ■이 모두 사라졌어요 → HCl ● ' + leftH + '개(' + fT(leftH * UNIT_HCL) + ' mol)가 남았어요' : 'CaCO₃와 HCl이 딱 맞게 모두 반응했어요';
      textBlock(n.x + 16, n.y + n.h - 40, n.w - 32, msg, PHONE ? 13 : 14, '#0b6b39', 18, 800);
    } else T(n.x + 16, n.y + n.h - 14, '■ 1개와 ● 1개가 짝지어 반응해요. 짝이 없는 쪽이 남아요.', 13, MUTED, 'left', 800);
  }
  function drawRecTable() {
    const t = RL.tb, r = S.run; panel(t.x, t.y, t.w, t.h, 14);
    T(t.x + 14, t.y + 24, '📋 측정 기록표', 14.5, INK, 'left', 800);
    const cx = [0.04, 0.22, 0.47, 0.73].map((f) => t.x + t.w * f);
    ['CaCO₃(g)', '반응 전(g)', '반응 후(g)', '감소(g)'].forEach((h, i) => T(cx[i], t.y + 50, h, PHONE ? 11.5 : 12, MUTED, 'left', 800));
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
