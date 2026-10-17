/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 이온 결합과 소금 [10통과1-02-04]
   ① 모형: 전자 이동 (Na 2-8-1 → Na⁺ 2-8, Cl 2-8-7 → Cl⁻ 2-8-8, 정전기적 인력)
   ② 탐구: 이온 결정 (NaCl 격자 쌓기 · 전하의 합이 0이 되는 화학식 MgO, CaCl₂)
   ③ 실험: 전기 전도성 (고체 · 녹인 상태 · 수용액, 입자 모형)
   ④ 적용: 소금의 역할 (물에 녹는 모형 · 바닷물과 몸속의 이온)
   ※ 결합으로 나타나는 성질은 전기 전도성에 한정 (녹는점·끓는점·경도·용해도는 다루지 않음)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const { tween, approach, Spring, Particles } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 560 : 800, VH = PHONE ? 760 : 600;
  const FS = PHONE ? 1.3 : 1;
  const RM = SciSim.reduceMotion;
  const BG = '#f3f0fb';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const CO = SciSim.color;
  const fx = new Particles();
  const TAU = Math.PI * 2;
  const POS = '#e2464b', NEG = '#3867f4', NEU = '#14a058', ELEC = '#ffb400', INK = '#1b2333', MUTED = '#5d6879';
  const MINUS = '−';
  let game = null;
  let F = new Set();
  const has = (f) => F.has(f);
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const fs = (n) => Math.round(n * FS);
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const subN = (n) => String(n).split('').map((c) => SUBD[+c]).join('');
  const ionHTML = (sym, q) => sym + '<sup>' + (Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : MINUS) + '</sup>';

  /* ---------- 안내 말풍선 · 계기판 ---------- */
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(() => hintEl.classList.add('hide'), ms || 4500);
  }
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k;
    $('#roL' + i).textContent = label;
    $('#roV' + i).innerHTML = value;
  }

  /* ---------- 그리기 도우미 ---------- */
  const pill = (x, y, text, o) => D.label(x, y, text, Object.assign({ size: fs(13) }, o));
  // 원소 기호 + 오른쪽 위 전하 (캔버스용)
  function ionText(x, y, sym, q, size, color, o) {
    o = o || {};
    const mag = Math.abs(q);
    const chg = q === 0 ? '' : (mag > 1 ? mag : '') + (q > 0 ? '+' : MINUS);
    ctx.save();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = D.font(size, 800);
    const w1 = ctx.measureText(sym).width;
    const sz2 = Math.max(10, size * 0.62);
    ctx.font = D.font(sz2, 800);
    const w2 = chg ? ctx.measureText(chg).width + 1 : 0;
    const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w1 - w2 : x - (w1 + w2) / 2;
    ctx.lineJoin = 'round';
    ctx.font = D.font(size, 800);
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeWidth || 4; ctx.strokeText(sym, x0, y); }
    ctx.fillStyle = color; ctx.fillText(sym, x0, y);
    if (chg) {
      ctx.font = D.font(sz2, 800);
      if (o.stroke) ctx.strokeText(chg, x0 + w1 + 1, y - size * 0.32);
      ctx.fillText(chg, x0 + w1 + 1, y - size * 0.32);
    }
    ctx.restore();
    return w1 + w2;
  }
  const shade = (c, a) => CO.shade(c, a);
  // 이온 구슬
  function ionBall(x, y, r, q, sym, o) {
    o = o || {};
    const col = o.color || (q > 0 ? POS : q < 0 ? NEG : NEU);
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; }
    D.sphere(x, y, r, col, { shadow: o.shadow !== false });
    if (sym && r >= 12) ionText(x, y + 1, sym, q, Math.max(11, r * (o.ts || 0.62)), '#fff', { stroke: shade(col, -0.45), strokeWidth: 3 });
    if (o.alpha != null) ctx.restore();
  }
  // 전자 구슬
  function electron(x, y, r, o) {
    o = o || {};
    D.sphere(x, y, r, o.color || ELEC, { shadow: false, outline: o.outline || 'rgba(120,70,0,.55)', outlineWidth: 1.2 });
  }
  function bgFill() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#f7f4fe'); g.addColorStop(1, '#ece7f9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  // 원 안에 글자 줄바꿈 없이 여러 줄 쓰기
  function lines(x, y, arr, o) {
    o = o || {};
    arr.forEach((s, i) => D.text(x, y + i * (o.lh || fs(20)), s, Object.assign({ size: fs(14), weight: 700, color: INK }, o)));
  }

  /* ---------- 화면(장면) ---------- */
  const S = { scene: 'atoms', latView: 'lattice', disView: 'dissolve', sceneA: 1, table: false, bodySeen: false, bodyT: 0 };
  const TB = {
    atoms: '⚛️ 전자의 이동: 나트륨 + 염소', lattice: '🧊 NaCl 이온 결정 (한 층)', formula: '⚖️ 전하의 합이 0이 되는 화학식',
    conduct: '💡 전기 전도성 실험', dissolve: '🧂 소금이 물에 녹을 때', body: '🌊 바닷물과 몸속의 이온',
  };
  const curKey = () => (S.scene === 'lattice' ? S.latView : S.scene === 'dissolve' ? S.disView : S.scene);
  function setScene(sc, sub) {
    S.scene = sc;
    if (sc === 'lattice' && sub) S.latView = sub;
    if (sc === 'dissolve' && sub) S.disView = sub;
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4, ease: 'outCubic' });
    updateUI();
  }
  function updateUI() {
    const sc = S.scene, key = curKey();
    ['atoms', 'lattice', 'conduct', 'dissolve'].forEach((k) => { $('#cs-' + k).hidden = k !== sc; });
    $$('#latTabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.latView));
    $('#formulaRow').hidden = key !== 'formula';
    $$('#disTabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.disView));
    $('#saltRow').hidden = key !== 'dissolve';
    $('#tbLabel').textContent = TB[key];
    $('#tableCard').hidden = !S.table;
    $('#readouts').hidden = !!S.table;
    $('#sceneSeg').hidden = F.size < 2;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    if (key === 'lattice') $('#latNote').textContent = LAT.done ? '한 층이 완성됐어요. 이 층이 위아래로 쌓여 정육면체 모양의 3차원 결정이 돼요. (끌어서 돌려 봐요)' : '아래 이온 통에서 이온을 끌어 격자의 빈칸에 놓아요. 같은 전하끼리는 밀어내요.';
    if (key === 'formula') $('#latNote').textContent = '양이온과 음이온의 개수를 바꿔 저울을 수평으로 맞춰 봐요. 가장 간단한 정수비가 화학식이에요.';
  }

  /* =========================================================
     ① 전자 이동
     ========================================================= */
  const R = PHONE ? [26, 50, 76] : [34, 66, 98];
  const ER = PHONE ? 6 : 6.5;
  const AY = PHONE ? 290 : 268;
  const D_FAR = 2 * R[2] + (PHONE ? 80 : 120), D_NEAR = 2 * R[2] + (PHONE ? 30 : 44), D_ION = R[1] + R[2] + 6;
  const A = {
    slider: 0, d: new Spring(D_FAR, { stiffness: 110, damping: 14 }), phase: 'idle', // idle | drag | fly | done
    ex: 0, ey: 0, eu: 0, fx: 0, fy: 0, qa: 0, s3: 1, press: null, glow: 0,
  };
  const naX = () => VW / 2 - A.d.value / 2 - (A.phase === 'done' ? 0 : 0);
  const clX = () => VW / 2 + A.d.value / 2;
  const canTransfer = () => A.phase === 'idle' && A.slider >= 0.8;
  const merged = () => A.phase === 'done' && A.qa > 0.95 && Math.abs(A.d.value - D_ION) < 2.5;
  function elecHome() { return { x: naX() + R[2], y: AY }; }
  function elecSlot() { return { x: clX() - R[2], y: AY }; }
  function elecPos(t) {
    const slot = elecSlot();
    if (A.phase === 'drag') return { x: A.ex, y: A.ey };
    if (A.phase === 'fly') {
      const u = A.eu, mx = (A.fx + slot.x) / 2, my = Math.min(A.fy, slot.y) - 70;
      const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
      return { x: a * A.fx + b * mx + c * slot.x, y: a * A.fy + b * my + c * slot.y };
    }
    if (A.phase === 'done') return slot;
    const h = elecHome();
    return { x: h.x + Math.cos(t * 2.1) * 1.5, y: h.y + Math.sin(t * 2.7) * 1.5 };
  }
  function resetAtoms() {
    A.slider = 0; A.phase = 'idle'; A.qa = 0; A.s3 = 1; A.eu = 0; A.press = null;
    A.d.value = A.d.target = D_FAR; A.d.velocity = 0;
    const s = $('#sDist'); s.disabled = false; s.value = 0; syncDist();
    $('#atomNote').textContent = '거리를 줄이면 두 원자의 바깥 전자껍질이 맞닿아요. 그다음 금빛 전자를 끌어 옮겨요.';
  }
  function syncDist() {
    const s = $('#sDist'), v = +s.value;
    s.style.setProperty('--pct', v + '%');
    $('#oDist').textContent = A.phase === 'done' ? '결합' : v < 30 ? '멀리' : v < 80 ? '가까워지는 중' : '맞닿음';
  }
  function startFly(fromX, fromY) {
    A.phase = 'fly'; A.fx = fromX; A.fy = fromY; A.eu = 0;
    Sound.tick();
    tween(A, { eu: 1 }, { duration: RM ? 0.01 : 0.8, ease: 'inOutCubic', onDone: finishTransfer });
  }
  function finishTransfer() {
    A.phase = 'done';
    Sound.success();
    const s = elecSlot();
    fx.burst(s.x, s.y, { count: 22, colors: [ELEC, '#fff6c2', NEG, POS], speed: 150, size: 3.5 });
    tween(A, { qa: 1 }, { duration: 0.9, ease: 'outCubic' });
    tween(A, { s3: 0 }, { duration: 0.7, ease: 'outCubic' });
    A.d.target = D_ION;
    const sl = $('#sDist'); sl.disabled = true; syncDist();
    $('#atomNote').textContent = 'Na는 전자 1개를 잃어 Na⁺, Cl는 전자 1개를 얻어 Cl⁻가 됐어요. 반대 전하는 서로 끌어당겨요.';
    showHint('Na⁺와 Cl⁻가 정전기적 인력으로 결합했어요 (이온 결합)', 5200);
  }
  function drawAtom(isNa, x, t) {
    const y = AY;
    const k = A.qa;
    const col = CO.mix(NEU, isNa ? POS : NEG, k);
    const Rr = R;
    // 전자껍질
    ctx.save();
    for (let i = 0; i < 3; i++) {
      let a = 1;
      if (isNa && i === 2) a = A.s3;
      if (a < 0.02) continue;
      ctx.globalAlpha = a;
      ctx.strokeStyle = i < 2 ? '#aab6cc' : col;
      ctx.lineWidth = i < 2 ? 1.6 : 2.6;
      if (i === 2) ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.arc(x, y, Rr[i], 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    if (k > 0.02) D.glow(x, y, Rr[isNa ? 1 : 2] + 26, isNa ? POS : NEG, 0.22 * k);
    // 안쪽 껍질 전자 (2개, 8개)
    const nIn = [2, 8];
    for (let i = 0; i < 2; i++) {
      const n = nIn[i], off = i === 0 ? Math.PI / 2 : Math.PI / 8;
      for (let j = 0; j < n; j++) {
        const ang = off + (j * TAU) / n;
        electron(x + Math.cos(ang) * Rr[i] + Math.cos(t * 1.4 + j + i) * 1.1, y + Math.sin(ang) * Rr[i] + Math.sin(t * 1.7 + j) * 1.1, ER * 0.9);
      }
    }
    // 바깥 껍질 전자
    if (!isNa) {
      for (let j = 1; j < 8; j++) {
        const ang = Math.PI + (j * Math.PI) / 4;
        electron(x + Math.cos(ang) * Rr[2] + Math.cos(t * 1.3 + j) * 1.1, y + Math.sin(ang) * Rr[2] + Math.sin(t * 1.6 + j) * 1.1, ER * 0.9);
      }
    }
    // 원자핵
    const nr = PHONE ? 14 : 17;
    D.sphere(x, y, nr, '#6a7899', { shadow: true });
    D.text(x, y + 4, (isNa ? 11 : 17) + '+', { size: fs(12), weight: 800, color: '#fff' });
  }
  function drawAtoms(t) {
    const nx = naX(), cx = clX();
    const ready = canTransfer();
    A.glow = approach(A.glow, ready ? 1 : 0, 1 / 60, 8);
    drawAtom(true, nx, t);
    drawAtom(false, cx, t);
    // 이름표 (위)
    const topY = AY - R[2] - fs(52);
    const lab = (x, sym, kind, q, phrase) => {
      ionText(x, topY, sym, q, fs(22), INK);
      D.text(x, topY + fs(24), phrase, { size: fs(13), weight: 700, color: MUTED });
    };
    lab(nx, 'Na', 0, A.qa > 0.5 ? 1 : 0, A.qa > 0.5 ? '양이온 (금속 원소)' : '나트륨 원자 (금속 원소)');
    lab(cx, 'Cl', 0, A.qa > 0.5 ? -1 : 0, A.qa > 0.5 ? '음이온 (비금속 원소)' : '염소 원자 (비금속 원소)');
    // 전자 배치 / 전하 알약
    const py = AY + R[2] + fs(34);
    const doneA = A.qa > 0.5;
    const col1 = doneA ? POS : NEU, col2 = doneA ? NEG : NEU;
    pill(nx, py, doneA ? 'Na⁺  2-8' : 'Na  2-8-1', { bg: '#fff', color: shade(col1, -0.3), border: col1 });
    pill(cx, py, doneA ? 'Cl⁻  2-8-8' : 'Cl  2-8-7', { bg: '#fff', color: shade(col2, -0.3), border: col2 });
    D.text(nx, py + fs(34), doneA ? '양성자 11 · 전자 10' : '양성자 11 · 전자 11', { size: fs(13), weight: 700, color: MUTED });
    D.text(cx, py + fs(34), doneA ? '양성자 17 · 전자 18' : '양성자 17 · 전자 17', { size: fs(13), weight: 700, color: MUTED });
    D.text(nx, py + fs(58), doneA ? '전하 +1' : '전하 0', { size: fs(15), weight: 800, color: doneA ? POS : NEU });
    D.text(cx, py + fs(58), doneA ? '전하 −1' : '전하 0', { size: fs(15), weight: 800, color: doneA ? NEG : NEU });
    if (doneA) {
      const a = clamp((A.qa - 0.5) * 2, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      pill(nx, py + fs(92), '네온(Ne)과 같은 배치', { bg: '#e2f6eb', color: '#0b6b39', size: fs(13) });
      pill(cx, py + fs(92), '아르곤(Ar)과 같은 배치', { bg: '#e2f6eb', color: '#0b6b39', size: fs(13) });
      ctx.restore();
    }
    // 정전기적 인력 화살표
    if (A.phase === 'done' && A.qa > 0.6) {
      const mid = (nx + cx) / 2;
      const wob = Math.sin(t * 6) * 3;
      D.arrow(nx + 56 + wob, py, mid - 6, py, { color: '#7c3aed', width: 5 });
      D.arrow(cx - 56 - wob, py, mid + 6, py, { color: '#7c3aed', width: 5 });
      pill(mid, py - fs(30), '정전기적 인력', { bg: '#7c3aed', color: '#fff', size: fs(13) });
    }
    // 전자 한 개 (옮겨 가는 전자)
    const p = elecPos(t);
    const slot = elecSlot();
    if (ready) {
      const k = 0.5 + 0.5 * Math.sin(t * 4);
      D.ring(slot.x, slot.y, 12 + k * 2, t, { color: '#7c3aed', width: 2.5 });
      D.dashedLine(p.x + 10, p.y, slot.x - 10, slot.y, { color: 'rgba(124,58,237,.55)', width: 2, dash: [4, 6], offset: t * 20 });
      D.glow(p.x, p.y, 26 + k * 6, ELEC, 0.55);
    }
    if (A.phase === 'drag') D.glow(p.x, p.y, 30, ELEC, 0.6);
    if (A.phase !== 'done' || A.qa < 1) {
      // 건너가는 전자는 크게 보이게
      const r = ER * (A.phase === 'drag' ? 1.5 : 1.15);
      electron(p.x, p.y, r);
    } else {
      electron(p.x, p.y, ER * 0.95, { outline: '#1d4ed8' });
    }
    // 범례
    const ly = VH - fs(58);
    electron(VW / 2 - fs(118), ly, 6);
    D.text(VW / 2 - fs(106), ly + 5, '전자 (−)', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
    D.sphere(VW / 2 + fs(2), ly, 8, '#6a7899', { gloss: false, shadow: false });
    D.text(VW / 2 + fs(16), ly + 5, '원자핵 (+)', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
    if (ready) pill(VW / 2, AY - R[2] - fs(104), '금빛 전자를 Cl의 점선 자리로 끌어 놓아요', { bg: '#7c3aed', color: '#fff', size: fs(14) });
  }
  function atomsPointer(p, type) {
    if (type === 'down') {
      if (A.phase !== 'idle') return false;
      const h = elecPos(performance.now() / 1000);
      if (Math.hypot(p.x - h.x, p.y - h.y) < (PHONE ? 30 : 26)) {
        if (!canTransfer()) { showHint('Na와 Cl 원자를 더 가까이 가져가야 해요 (↔️ 거리 슬라이더)', 3800); Sound.fail(); return false; }
        A.phase = 'drag'; A.ex = h.x; A.ey = h.y; A.press = { x: p.x, y: p.y, moved: false };
        return true;
      }
      return false;
    }
    if (type === 'move' && A.phase === 'drag') {
      A.ex = p.x; A.ey = p.y;
      if (A.press && Math.hypot(p.x - A.press.x, p.y - A.press.y) > 8) A.press.moved = true;
    } else if (type === 'up' && A.phase === 'drag') {
      const slot = elecSlot();
      const moved = A.press && A.press.moved;
      if (!moved || Math.hypot(p.x - slot.x, p.y - slot.y) < 46) startFly(moved ? p.x : elecHome().x, moved ? p.y : elecHome().y);
      else { // 제자리로
        A.phase = 'idle'; Sound.fail();
        showHint('Cl 원자의 점선 자리(전자가 들어갈 곳)에 놓아요', 3500);
      }
    }
    return true;
  }
  function stepAtoms(dt) {
    if (A.phase === 'done') A.d.target = D_ION;
    else A.d.target = lerp(D_FAR, D_NEAR, A.slider);
    A.d.update(dt);
  }

  /* =========================================================
     ② 이온 결정 · 화학식
     ========================================================= */
  const LG = PHONE ? { cs: 78, x0: (560 - 312) / 2, y0: 132 } : { cs: 84, x0: 60, y0: 132 };
  const LN = 4;
  const rNa = LG.cs * 0.31, rCl = LG.cs * 0.43;
  const PREFILL = [0, 1, 2, 3, 4, 5];
  const LAT = {
    cells: new Array(LN * LN).fill(null), drag: null, loose: [], flashes: [], ghost: 0, wrongs: 0, done: false,
    cube: 0, yaw: 0.7, pitch: 0.5, rot: null, hover: -1,
  };
  const cellXY = (i) => ({ x: LG.x0 + ((i % LN) + 0.5) * LG.cs, y: LG.y0 + (Math.floor(i / LN) + 0.5) * LG.cs });
  const cellType = (i) => (((i % LN) + Math.floor(i / LN)) % 2 === 0 ? 'Na' : 'Cl');
  const dispPos = (type) => (PHONE ? { x: type === "Na" ? 170 : 390, y: 560 } : { x: 600, y: type === "Na" ? 240 : 390 });
  const latCount = (type) => LAT.cells.filter((c) => c && c.type === type).length;
  const latFilled = () => LAT.cells.filter(Boolean).length;
  function makeIon(type, x, y) { return { type, x, y, sc: 1, a: 1, shake: 0 }; }
  function resetLattice() {
    LAT.cells.fill(null);
    LAT.loose.length = 0; LAT.flashes.length = 0; LAT.drag = null;
    LAT.ghost = 0; LAT.wrongs = 0; LAT.done = false; LAT.cube = 0; LAT.yaw = 0.7; LAT.pitch = 0.5; LAT.rot = null;
    PREFILL.forEach((i) => { const c = cellXY(i); LAT.cells[i] = makeIon(cellType(i), c.x, c.y); });
    updateUI();
  }
  function placeIon(i, type) {
    const c = cellXY(i);
    const ion = makeIon(type, c.x, c.y);
    ion.sc = 1.35; tween(ion, { sc: 1 }, { duration: 0.45, ease: 'outBack' });
    LAT.cells[i] = ion;
    Sound.tick();
    fx.burst(c.x, c.y, { count: 8, colors: [type === 'Na' ? POS : NEG, '#fff'], speed: 90, size: 3, gravity: 0, life: 0.5, shape: 'circle' });
    if (latFilled() === LN * LN) {
      LAT.done = true; Sound.success();
      pillBurst();
      setTimeout(() => { tween(LAT, { cube: 1 }, { duration: RM ? 0.01 : 1.3, ease: 'inOutCubic' }); updateUI(); }, RM ? 0 : 900);
    }
  }
  function pillBurst() { fx.burst(LG.x0 + LG.cs * 2, LG.y0 + LG.cs * 2, { count: 26, speed: 220, size: 4 }); }
  function nearestEmpty(p, maxD) {
    let best = -1, bd = maxD;
    for (let i = 0; i < LN * LN; i++) {
      if (LAT.cells[i]) continue;
      const c = cellXY(i), d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function neighbors(i) {
    const r = Math.floor(i / LN), c = i % LN, out = [];
    if (r > 0) out.push(i - LN); if (r < LN - 1) out.push(i + LN); if (c > 0) out.push(i - 1); if (c < LN - 1) out.push(i + 1);
    return out;
  }
  function dropIon(type, p) {
    const idx = nearestEmpty(p, LG.cs * 0.62);
    const dp = dispPos(type);
    const ion = makeIon(type, p.x, p.y);
    if (idx < 0) { LAT.loose.push(ion); returnIon(ion, dp); return; }
    if (cellType(idx) === type) { placeIon(idx, type); return; }
    // 같은 전하끼리 밀어냄
    LAT.wrongs++;
    LAT.ghost = 1;
    const c = cellXY(idx);
    ion.x = c.x; ion.y = c.y;
    LAT.loose.push(ion);
    neighbors(idx).forEach((n) => {
      if (LAT.cells[n] && LAT.cells[n].type === type) { LAT.flashes.push({ x1: c.x, y1: c.y, x2: cellXY(n).x, y2: cellXY(n).y, t: 0 }); LAT.cells[n].shake = 1; }
    });
    ion.shake = 1;
    Sound.fail();
    showHint(type === 'Na' ? 'Na⁺ 옆에는 Cl⁻가 와야 해요. 같은 (+)전하끼리는 밀어내요!' : 'Cl⁻ 옆에는 Na⁺가 와야 해요. 같은 (−)전하끼리는 밀어내요!', 4200);
    setTimeout(() => returnIon(ion, dp), RM ? 0 : 380);
  }
  function returnIon(ion, dp) {
    tween(ion, { x: dp.x, y: dp.y, a: 0, sc: 0.8 }, { duration: RM ? 0.01 : 0.45, ease: 'outCubic', onDone: () => { const k = LAT.loose.indexOf(ion); if (k >= 0) LAT.loose.splice(k, 1); } });
  }
  function latPointer(p, type) {
    if (LAT.done && LAT.cube > 0.5) {
      if (type === 'down') { LAT.rot = { x: p.x, y: p.y, yaw: LAT.yaw, pitch: LAT.pitch }; return true; }
      if (type === 'move' && LAT.rot) {
        LAT.yaw = LAT.rot.yaw + (p.x - LAT.rot.x) * 0.012;
        LAT.pitch = clamp(LAT.rot.pitch + (p.y - LAT.rot.y) * 0.01, -1.2, 1.2);
      } else if (type === 'up') LAT.rot = null;
      return true;
    }
    if (type === 'down') {
      for (const t of ['Na', 'Cl']) {
        const dp = dispPos(t);
        if (Math.hypot(p.x - dp.x, p.y - dp.y) < (t === 'Na' ? 46 : 52)) {
          LAT.drag = { type: t, x: p.x, y: p.y };
          Sound.click();
          return true;
        }
      }
      return false;
    }
    if (!LAT.drag) return true;
    if (type === 'move') { LAT.drag.x = p.x; LAT.drag.y = p.y; LAT.hover = nearestEmpty(p, LG.cs * 0.62); }
    else if (type === 'up') { const d = LAT.drag; LAT.drag = null; LAT.hover = -1; dropIon(d.type, { x: p.x, y: p.y }); }
    return true;
  }
  function stepLattice(dt) {
    LAT.ghost = Math.max(0, LAT.ghost - dt * 0.05);
    LAT.flashes.forEach((f) => { f.t += dt; });
    LAT.flashes = LAT.flashes.filter((f) => f.t < 1.1);
    LAT.cells.forEach((c) => { if (c && c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2.2); });
    LAT.loose.forEach((c) => { if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2.2); });
    if (LAT.done && LAT.cube > 0.5 && !LAT.rot) LAT.yaw += dt * 0.35;
  }
  function drawLattice(t) {
    const cs = LG.cs;
    const gridA = 1 - smooth(LAT.cube * 1.6);
    const cubeA = smooth((LAT.cube - 0.3) / 0.7);
    ctx.save();
    ctx.globalAlpha = gridA;
    if (gridA > 0.02) {
      D.text(LG.x0 + cs * 2, LG.y0 - fs(28), 'NaCl 이온 결정의 한 층 (단면)', { size: fs(16), weight: 800, color: '#4c1d95' });
      // 격자 판
      D.shadow(() => { D.roundRect(LG.x0 - 12, LG.y0 - 12, cs * LN + 24, cs * LN + 24, 18); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 14, y: 5 });
      // 이웃 이온 사이의 인력 선
      ctx.strokeStyle = 'rgba(124,58,237,.18)'; ctx.lineWidth = 3;
      for (let i = 0; i < LN * LN; i++) {
        if (!LAT.cells[i]) continue;
        [i + 1, i + LN].forEach((n) => {
          if (n >= LN * LN || (n === i + 1 && n % LN === 0) || !LAT.cells[n]) return;
          const a = cellXY(i), b = cellXY(n);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        });
      }
      for (let i = 0; i < LN * LN; i++) {
        const c = cellXY(i), ion = LAT.cells[i];
        if (!ion) {
          ctx.strokeStyle = 'rgba(90,100,130,.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
          D.roundRect(c.x - cs * 0.4, c.y - cs * 0.4, cs * 0.8, cs * 0.8, 14); ctx.stroke(); ctx.setLineDash([]);
          if (LAT.ghost > 0.02) {
            const ty = cellType(i);
            D.text(c.x, c.y + fs(7), ty === 'Na' ? '+' : MINUS, { size: fs(24), weight: 800, color: ty === 'Na' ? POS : NEG, alpha: 0.5 * Math.min(1, LAT.ghost * 3) });
          }
        } else {
          const sx = ion.shake > 0 ? Math.sin(ion.shake * 30) * 4 * ion.shake : 0;
          ionBall(ion.x + sx, ion.y, (ion.type === 'Na' ? rNa : rCl) * ion.sc, ion.type === 'Na' ? 1 : -1, ion.type, { ts: ion.type === 'Na' ? 0.9 : 0.78 });
        }
      }
      if (LAT.drag && LAT.hover >= 0) { const c = cellXY(LAT.hover); D.ring(c.x, c.y, cs * 0.42, t, { color: '#7c3aed' }); }
      // 밀어내는 표시
      LAT.flashes.forEach((f) => {
        const a = 1 - f.t / 1.1;
        ctx.save(); ctx.globalAlpha = a;
        ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 4; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.setLineDash([]);
        pill((f.x1 + f.x2) / 2, (f.y1 + f.y2) / 2, '밀어냄!', { bg: '#e2464b', size: fs(13) });
        ctx.restore();
      });
      // 이온 통
      ['Na', 'Cl'].forEach((ty) => {
        const dp = dispPos(ty), r = (ty === 'Na' ? rNa : rCl) * 1.15;
        const full = !LAT.done;
        ctx.save(); ctx.globalAlpha = full ? 1 : 0.35;
        D.shadow(() => { D.roundRect(dp.x - 66, dp.y - 56, 132, 112, 20); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
        ctx.strokeStyle = ty === 'Na' ? 'rgba(226,70,75,.5)' : 'rgba(56,103,244,.5)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
        D.roundRect(dp.x - 66, dp.y - 56, 132, 112, 20); ctx.stroke(); ctx.setLineDash([]);
        const bob = full ? Math.sin(t * 2.2 + (ty === 'Na' ? 0 : 1.5)) * 2 : 0;
        ionBall(dp.x, dp.y - 6 + bob, r, ty === 'Na' ? 1 : -1, ty, { ts: ty === 'Na' ? 0.9 : 0.78 });
        D.text(dp.x, dp.y + 44, ty === 'Na' ? '양이온 (작아요)' : '음이온 (커요)', { size: fs(13), weight: 700, color: MUTED });
        ctx.restore();
      });
      if (!LAT.drag && latFilled() === PREFILL.length && !LAT.done) {
        const dp = dispPos('Na'), cc = cellXY(6);
        D.arrow(dp.x - (PHONE ? 0 : 74), dp.y - (PHONE ? 70 : 0), cc.x + (PHONE ? 4 : cs * 0.55), cc.y + (PHONE ? cs * 0.55 : 0), { color: 'rgba(124,58,237,.55)', width: 3, dash: [7, 6] });
      }
      // 개수 알약
      const ny = PHONE ? 660 : LG.y0 + cs * LN + 56;
      const nNa = latCount('Na'), nCl = latCount('Cl');
      pill(LG.x0 + cs * 0.9, ny, 'Na⁺ ' + nNa + '개', { bg: POS });
      pill(LG.x0 + cs * 2.0, ny, 'Cl⁻ ' + nCl + '개', { bg: NEG });
      pill(LG.x0 + cs * 3.15, ny, nNa === nCl && nNa > 0 ? '개수비 1 : 1' : '개수비 ' + nNa + ' : ' + nCl, { bg: '#fff', color: INK, border: '#c9b6f5' });
    }
    ctx.restore();
    // 드래그 중인 / 돌아가는 이온
    LAT.loose.forEach((ion) => {
      const sx = ion.shake > 0 ? Math.sin(ion.shake * 30) * 5 * ion.shake : 0;
      ionBall(ion.x + sx, ion.y, (ion.type === 'Na' ? rNa : rCl) * ion.sc, ion.type === 'Na' ? 1 : -1, ion.type, { alpha: ion.a * gridA + (ion.shake > 0 ? 0 : 0), ts: ion.type === 'Na' ? 0.9 : 0.78 });
    });
    if (LAT.drag) {
      const d = LAT.drag, r = (d.type === 'Na' ? rNa : rCl) * 1.2;
      D.glow(d.x, d.y + 6, r * 2.2, '#7c3aed', 0.25);
      ionBall(d.x, d.y - 6, r, d.type === 'Na' ? 1 : -1, d.type, { ts: d.type === 'Na' ? 0.9 : 0.78 });
    }
    // 3차원 결정
    if (cubeA > 0.01) {
      ctx.save(); ctx.globalAlpha = cubeA;
      drawCube(t);
      ctx.restore();
    }
  }
  function drawCube(t) {
    const n = 4, sp = PHONE ? 54 : 66, cx = VW / 2, cy = PHONE ? 340 : 300;
    const cy0 = Math.cos(LAT.yaw), sy0 = Math.sin(LAT.yaw), cp = Math.cos(LAT.pitch), sp2 = Math.sin(LAT.pitch);
    const pts = [];
    const idx = (x, y, z) => x + n * (y + n * z);
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const X = (x - 1.5) * sp, Y = (y - 1.5) * sp, Z = (z - 1.5) * sp;
      const x1 = X * cy0 + Z * sy0, z1 = -X * sy0 + Z * cy0;
      const y2 = Y * cp - z1 * sp2, z2 = Y * sp2 + z1 * cp;
      const pf = 520 / (520 - z2);
      pts[idx(x, y, z)] = { sx: cx + x1 * pf, sy: cy + y2 * pf, z: z2, pf, na: (x + y + z) % 2 === 0 };
    }
    D.text(cx, PHONE ? 90 : 60, 'NaCl 이온 결정 (3차원)', { size: fs(17), weight: 800, color: '#4c1d95' });
    ctx.strokeStyle = 'rgba(124,58,237,.22)'; ctx.lineWidth = 2.5;
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const a = pts[idx(x, y, z)];
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((d) => {
        const x2 = x + d[0], y2 = y + d[1], z2 = z + d[2];
        if (x2 >= n || y2 >= n || z2 >= n) return;
        const b = pts[idx(x2, y2, z2)];
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      });
    }
    pts.slice().sort((a, b) => a.z - b.z).forEach((p) => {
      const r = (p.na ? 9 : 13.5) * p.pf * (PHONE ? 0.95 : 1.05);
      ionBall(p.sx, p.sy, r, p.na ? 1 : -1, null, { shadow: false });
    });
    pill(cx, PHONE ? 600 : 520, 'Na⁺ 32개 · Cl⁻ 32개 → 개수비 1 : 1', { bg: '#fff', color: INK, border: '#c9b6f5' });
    pill(cx, PHONE ? 640 : 560, '양이온과 음이온이 번갈아 규칙적으로 배열돼요', { bg: '#7c3aed', color: '#fff' });
    D.text(cx, PHONE ? 676 : 584, '끌어서 돌려 보세요', { size: fs(13), weight: 700, color: MUTED });
  }

  /* ---------- 화학식 만들기 ---------- */
  const CMP = {
    MgO: { cat: ['Mg', 2], an: ['O', 2], nc: 1, na: 1, name: '산화 마그네슘' },
    CaCl2: { cat: ['Ca', 2], an: ['Cl', 1], nc: 1, na: 2, name: '염화 칼슘' },
  };
  const FM = { c: 'MgO', nc: 1, na: 1, beam: new Spring(0, { stiffness: 60, damping: 8 }), done: { MgO: false, CaCl2: false }, okT: 0 };
  const fmCmp = () => CMP[FM.c];
  const fmQp = () => FM.nc * fmCmp().cat[1];
  const fmQm = () => FM.na * fmCmp().an[1];
  const fmBalanced = () => fmQp() === fmQm();
  const fmSimplest = () => FM.nc === fmCmp().nc && FM.na === fmCmp().na;
  function fmFormula() {
    const c = fmCmp();
    return c.cat[0] + (FM.nc > 1 ? subN(FM.nc) : '') + c.an[0] + (FM.na > 1 ? subN(FM.na) : '');
  }
  function fmSync() {
    const c = fmCmp();
    $('#lblCat').innerHTML = ionHTML(c.cat[0], c.cat[1]) + ' (양이온)';
    $('#lblAn').innerHTML = ionHTML(c.an[0], -c.an[1]) + ' (음이온)';
    $('#numCat').textContent = FM.nc; $('#numAn').textContent = FM.na;
    $$('#cmpSeg button').forEach((b) => b.classList.toggle('on', b.dataset.c === FM.c));
    $('#catMinus').disabled = FM.nc <= 1; $('#catPlus').disabled = FM.nc >= 4;
    $('#anMinus').disabled = FM.na <= 1; $('#anPlus').disabled = FM.na >= 4;
  }
  function fmSet(nc, na) {
    FM.nc = clamp(nc, 1, 4); FM.na = clamp(na, 1, 4);
    Sound.tick(); fmSync();
  }
  function fmChoose(c) { FM.c = c; FM.nc = 1; FM.na = 1; FM.okT = 0; Sound.click(); fmSync(); }
  function stepFormula(dt) {
    const bal = fmBalanced();
    FM.beam.target = clamp((fmQp() - fmQm()) * 0.09, -0.34, 0.34);
    FM.beam.update(dt);
    if (bal && fmSimplest() && !FM.done[FM.c]) {
      FM.okT += dt;
      if (FM.okT > 0.5) {
        FM.done[FM.c] = true; Sound.success();
        fx.burst(VW / 2, PHONE ? 600 : 470, { count: 28, speed: 220, size: 4 });
        showHint(fmCmp().name + ' ' + fmFormula() + ' 완성!', 3500);
      }
    } else if (!(bal && fmSimplest())) FM.okT = 0;
  }
  function drawFormula(t) {
    const c = fmCmp();
    const px = VW / 2, py = PHONE ? 210 : 180;
    const half = PHONE ? 150 : 250;
    const a = FM.beam.value;
    const L1 = { x: px - Math.cos(a) * half, y: py + Math.sin(a) * half };
    const R1 = { x: px + Math.cos(a) * half, y: py - Math.sin(a) * half };
    const bal = fmBalanced(), okAll = bal && fmSimplest();
    // 받침대
    D.shadow(() => { D.roundRect(px - 8, py, 16, PHONE ? 300 : 262, 6); ctx.fillStyle = '#8b95a8'; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(px - 70, py + (PHONE ? 300 : 262), 140, 16, 8); ctx.fillStyle = '#6a7899'; ctx.fill();
    // 저울대
    ctx.save();
    ctx.lineCap = 'round'; ctx.strokeStyle = '#4b5873'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(L1.x, L1.y); ctx.lineTo(R1.x, R1.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L1.x, L1.y - 2); ctx.lineTo(R1.x, R1.y - 2); ctx.stroke();
    ctx.restore();
    D.sphere(px, py, 13, bal ? NEU : '#6a7899', { shadow: true });
    // 접시
    const pan = (end, ions, q, name, col) => {
      const drop = PHONE ? 112 : 128, pw = PHONE ? 74 : 118;
      const bx = end.x, by = end.y + drop;
      ctx.strokeStyle = '#8b95a8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(end.x, end.y); ctx.lineTo(bx - pw, by); ctx.moveTo(end.x, end.y); ctx.lineTo(bx + pw, by); ctx.stroke();
      D.shadow(() => {
        ctx.beginPath(); ctx.moveTo(bx - pw - 8, by); ctx.quadraticCurveTo(bx, by + 40, bx + pw + 8, by); ctx.closePath();
        ctx.fillStyle = '#c3cadb'; ctx.fill();
      }, { blur: 8, y: 3 });
      // 구슬
      const r = name.r;
      const perRow = 2;
      ions.forEach((k, i) => {
        const row = Math.floor(i / perRow), colI = i % perRow;
        const rowCount = Math.min(perRow, ions.length - row * perRow);
        const x = bx + (colI - (rowCount - 1) / 2) * (r * 2.1);
        const y = by - r - row * (r * 2.1) + 2;
        const pop = k.pop != null ? k.pop : 1;
        ionBall(x, y, r * pop, name.q, name.sym, { ts: name.sym.length > 1 ? 0.62 : 0.8 });
      });
      pill(bx, by + (PHONE ? 66 : 70), name.label + ' ' + (q > 0 ? '+' : '') + q.toString().replace('-', MINUS), { bg: '#fff', color: shade(col, -0.25), border: col, size: fs(14) });
    };
    const catIons = [], anIons = [];
    for (let i = 0; i < FM.nc; i++) catIons.push({});
    for (let i = 0; i < FM.na; i++) anIons.push({});
    pan(L1, catIons, fmQp(), { r: PHONE ? 22 : 28, q: c.cat[1], sym: c.cat[0], label: '(+) 전하 합' }, POS);
    pan(R1, anIons, -fmQm(), { r: PHONE ? 22 : 30, q: -c.an[1], sym: c.an[0], label: '(−) 전하 합' }, NEG);
    // 위 표지
    D.text(L1.x, py - (PHONE ? 22 : 24), '양이온 ' + c.cat[0] + '  ×' + FM.nc, { size: fs(15), weight: 800, color: shade(POS, -0.2) });
    D.text(R1.x, py - (PHONE ? 22 : 24), '음이온 ' + c.an[0] + '  ×' + FM.na, { size: fs(15), weight: 800, color: shade(NEG, -0.2) });
    // 화학식
    const fy = PHONE ? 620 : 510;
    ctx.save();
    if (okAll) D.glow(px, fy, 130, NEU, 0.35);
    D.roundRect(px - 150, fy - 36, 300, 72, 20); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = okAll ? NEU : bal ? '#f59e0b' : '#c9d2e3'; ctx.stroke();
    ctx.restore();
    D.text(px, fy + 11, fmFormula(), { size: fs(36), weight: 800, color: okAll ? '#0b6b39' : INK });
    D.text(px, fy - 48, c.name, { size: fs(14), weight: 700, color: MUTED });
    const msg = okAll ? '전하의 합이 0 · 가장 간단한 정수비 → 화학식 완성!' : bal ? '전하의 합은 0이지만, 가장 간단한 정수비로 줄여 봐요' : fmQp() > fmQm() ? '(+)가 더 커요. 음이온을 더 넣거나 양이온을 줄여요' : '(−)가 더 커요. 양이온을 더 넣거나 음이온을 줄여요';
    pill(px, fy + (PHONE ? 70 : 62), msg, { bg: okAll ? NEU : bal ? '#f59e0b' : '#fff', color: okAll || bal ? '#fff' : INK, border: okAll || bal ? null : '#c9d2e3', size: fs(13) });
    if (okAll) D.check(px + 120, fy - 40, 17, 1);
  }

  /* =========================================================
     ③ 전기 전도성 실험
     ========================================================= */
  const CG = PHONE ? {
    bat: { x: 58, y: 150 }, topY: 70, bulb: { x: 300, y: 70 }, amm: { x: 490, y: 170 }, rightX: 490,
    box: { x: 56, y: 420, w: 448, h: 246 }, wireY: 330, exInset: 44, exTop: 350,
  } : {
    bat: { x: 100, y: 132 }, topY: 56, bulb: { x: 400, y: 56 }, amm: { x: 690, y: 134 }, rightX: 690,
    box: { x: 210, y: 292, w: 380, h: 208 }, wireY: 210, exInset: 38, exTop: 226,
  };
  const SAMPLES = {
    solid: { name: '고체 NaCl', imax: 0 },
    melt: { name: '녹인 NaCl (액체)', imax: 180 },
    aq: { name: 'NaCl 수용액', imax: 120 },
    water: { name: '증류수', imax: 0 },
  };
  const CD = {
    sample: 'solid', sw: false, swT: 0, temp: 25, heat: 0, I: 0, w: 1, ionA: 1, waterA: 0, flow: 0,
    results: { solid: null, melt: null, aq: null, water: null }, ions: [], waters: [], lampSmooth: 0, trail: [],
  };
  const boxIn = () => { const b = CG.box; return { x0: b.x + 16, x1: b.x + b.w - 16, y0: b.y + 34, y1: b.y + b.h - 14 }; };
  const exX = () => [CG.box.x + CG.exInset, CG.box.x + CG.box.w - CG.exInset];
  function buildCond() {
    const bi = boxIn(), cols = 6, rows = 4;
    const [exL, exR] = exX();
    const span = (exR - exL) - 60;
    const sp = Math.min(PHONE ? 52 : 40, span / (cols - 1));
    const cx = (bi.x0 + bi.x1) / 2, by = bi.y1 - 22;
    CD.ions = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const na = (r + c) % 2 === 0;
      const sx = cx + (c - (cols - 1) / 2) * sp, sy = by - r * sp;
      CD.ions.push({ na, sx, sy, x: sx, y: sy, vx: rnd(-30, 30), vy: rnd(-30, 30), a: 1, j: rnd(0, 6) });
    }
    CD.waters = [];
    for (let i = 0; i < (PHONE ? 30 : 34); i++) CD.waters.push({ x: rnd(bi.x0 + 8, bi.x1 - 8), y: rnd(bi.y0 + 8, bi.y1 - 8), vx: rnd(-25, 25), vy: rnd(-25, 25), th: rnd(0, TAU), w: rnd(-0.8, 0.8) });
  }
  function resetCond() {
    CD.sw = false; CD.swT = 0; CD.sample = 'solid'; CD.temp = 25; CD.heat = 0; CD.I = 0; CD.w = 1; CD.ionA = 1; CD.waterA = 0;
    CD.results = { solid: null, melt: null, aq: null, water: null };
    buildCond(); syncCond();
  }
  function setSample(s) {
    CD.sample = s; CD.sw = false; CD.swT = 0;
    Sound.click(); syncCond();
    const msg = { solid: '고체 소금 결정에 전극을 꽂았어요', melt: '소금을 가열해 801 °C 이상에서 녹여요', aq: '소금을 물에 녹인 수용액이에요', water: '이온이 거의 없는 증류수예요' };
    showHint(msg[s] + '. 스위치를 켜 보세요.', 3800);
  }
  function setSwitch(on) {
    CD.sw = on; if (!on) CD.swT = 0;
    Sound.click(); syncCond();
  }
  function syncCond() {
    $$('#sampleBtns .opt[data-s]').forEach((b) => {
      b.classList.toggle('on', b.dataset.s === CD.sample);
      b.classList.toggle('done', !!CD.results[b.dataset.s]);
    });
    const sw = $('#swBtn');
    sw.textContent = CD.sw ? '⚡ 스위치 끄기' : '⚡ 스위치 켜기';
    sw.classList.toggle('sw-on', CD.sw);
  }
  const condReady = () => (CD.sample === 'melt' ? CD.temp >= 790 : true);
  function recordCond() {
    const s = CD.sample;
    CD.results[s] = { I: Math.round(CD.I), lamp: CD.I > 15 };
    Sound.success();
    const bx = CG.bulb.x, by = CG.bulb.y;
    fx.burst(bx, by + 60, { count: 14, speed: 120, size: 3.5, colors: ['#ffd34d', '#fff'] });
    toast('📝 ' + SAMPLES[s].name + ': 전구 ' + (CD.results[s].lamp ? '켜짐' : '꺼짐') + ' · ' + CD.results[s].I + ' mA (기록됨)', 'good', 2200);
    syncCond();
  }
  function stepCond(dt) {
    const s = CD.sample;
    CD.heat = approach(CD.heat, s === 'melt' ? 1 : 0, dt, 2.5);
    CD.temp = approach(CD.temp, s === 'melt' ? 801 : 25, dt, s === 'melt' ? 1.4 : 2.5);
    const wt = s === 'solid' ? 1 : s === 'melt' ? 1 - smooth((CD.temp - 560) / 230) : 0;
    CD.w = s === 'melt' ? wt : approach(CD.w, wt, dt, 4);
    CD.ionA = approach(CD.ionA, s === 'water' ? 0 : 1, dt, 5);
    CD.waterA = approach(CD.waterA, s === 'aq' || s === 'water' ? 1 : 0, dt, 4);
    const mobile = 1 - CD.w;
    const It = CD.sw ? SAMPLES[s].imax * mobile : 0;
    CD.I = approach(CD.I, It, dt, 5);
    if (CD.I < 0.5 && It === 0) CD.I = 0;
    CD.lampSmooth = approach(CD.lampSmooth, clamp(CD.I / 100, 0, 1), dt, 8);
    CD.flow += dt * (CD.I / 180) * 2.2;
    if (CD.sw && condReady()) CD.swT += dt; else if (!CD.sw) CD.swT = 0;
    if (CD.swT > 1.4 && !CD.results[s]) recordCond();
    // 입자 움직임
    const bi = boxIn(), [exL, exR] = exX();
    CD.ions.forEach((p) => {
      if (mobile > 0.02 || CD.w < 0.98) {
        const k = mobile;
        p.vx += rnd(-1, 1) * 260 * dt * k; p.vy += rnd(-1, 1) * 260 * dt * k;
        if (CD.sw) p.vx += (p.na ? -1 : 1) * 190 * dt * k * (s === 'melt' ? 1.2 : 1);
        const damp = Math.exp(-2.1 * dt); p.vx *= damp; p.vy *= damp;
        const sp = Math.hypot(p.vx, p.vy), mx = s === 'melt' ? 150 : 120;
        if (sp > mx) { p.vx *= mx / sp; p.vy *= mx / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y < bi.y0 + 10) { p.y = bi.y0 + 10; p.vy = Math.abs(p.vy); }
        if (p.y > bi.y1 - 6) { p.y = bi.y1 - 6; p.vy = -Math.abs(p.vy); }
        if (p.x < bi.x0 + 8) { p.x = bi.x0 + 8; p.vx = Math.abs(p.vx); }
        if (p.x > bi.x1 - 8) { p.x = bi.x1 - 8; p.vx = -Math.abs(p.vx); }
        // 전극에 닿으면 반대편에서 다시 나타남 (연속적인 흐름을 보여 주기 위한 모형)
        if (CD.sw && mobile > 0.5) {
          if (p.na && p.x < exL + 12) { p.x = rnd(exR - 70, exR - 24); p.y = rnd(bi.y0 + 14, bi.y1 - 10); p.a = 0; }
          else if (!p.na && p.x > exR - 12) { p.x = rnd(exL + 24, exL + 70); p.y = rnd(bi.y0 + 14, bi.y1 - 10); p.a = 0; }
        }
      } else {
        p.x = approach(p.x, p.sx, dt, 9); p.y = approach(p.y, p.sy, dt, 9); p.vx = p.vy = 0;
      }
      p.a = approach(p.a, 1, dt, 3);
    });
    // 고체로 돌아오는 중이면 위치를 격자 쪽으로
    if (CD.w > 0.02 && s !== 'melt') CD.ions.forEach((p) => { p.x = lerp(p.x, p.sx, Math.min(1, dt * 6 * CD.w)); p.y = lerp(p.y, p.sy, Math.min(1, dt * 6 * CD.w)); });
    CD.waters.forEach((m) => {
      m.vx += rnd(-1, 1) * 120 * dt; m.vy += rnd(-1, 1) * 120 * dt;
      const damp = Math.exp(-1.5 * dt); m.vx *= damp; m.vy *= damp;
      m.x += m.vx * dt; m.y += m.vy * dt; m.th += m.w * dt;
      if (m.x < bi.x0 + 6) { m.x = bi.x0 + 6; m.vx = Math.abs(m.vx); }
      if (m.x > bi.x1 - 6) { m.x = bi.x1 - 6; m.vx = -Math.abs(m.vx); }
      if (m.y < bi.y0 + 4) { m.y = bi.y0 + 4; m.vy = Math.abs(m.vy); }
      if (m.y > bi.y1 - 4) { m.y = bi.y1 - 4; m.vy = -Math.abs(m.vy); }
    });
  }
  function drawBattery(x, y) {
    D.shadow(() => { D.roundRect(x - 26, y - 38, 52, 76, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 17, y - 10); ctx.lineTo(x + 17, y - 10); ctx.stroke();
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - 9, y + 12); ctx.lineTo(x + 9, y + 12); ctx.stroke();
    D.text(x - 32, y - 22, '+', { size: fs(18), weight: 800, color: POS, align: 'right' });
    D.text(x - 32, y + 28, MINUS, { size: fs(20), weight: 800, color: NEG, align: 'right' });
    D.text(x, y + 55, '전지', { size: fs(13), weight: 700, color: MUTED });
  }
  function drawAmmeter(x, y, I) {
    const r = 44, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    const ang = (v) => a0 + (a1 - a0) * clamp(v / 200, 0, 1);
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 9, y: 3 });
    ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#3a4456'; ctx.lineCap = 'butt';
    for (let v = 0; v <= 200; v += 20) {
      const a = ang(v), major = v % 100 === 0;
      ctx.lineWidth = major ? 2.4 : 1.2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 7), y + Math.sin(a) * (r - 7)); ctx.lineTo(x + Math.cos(a) * (r - (major ? 16 : 12)), y + Math.sin(a) * (r - (major ? 16 : 12))); ctx.stroke();
      if (major) D.text(x + Math.cos(a) * (r - 27), y + Math.sin(a) * (r - 27) + 4, String(v), { size: 11, weight: 700, color: '#3a4456' });
    }
    D.text(x, y + 22, 'mA', { size: 12, weight: 800, color: MUTED });
    const a = ang(Math.min(I, 200));
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7); ctx.lineTo(x + Math.cos(a) * (r - 12), y + Math.sin(a) * (r - 12)); ctx.stroke();
    D.sphere(x, y, 5, '#3a4456', { gloss: false, shadow: false });
  }
  function drawBulb(x, y, lamp, t) {
    if (lamp > 0.02) { D.glow(x, y, 80 + lamp * 22, '#ffd34d', 0.65 * lamp); }
    ctx.save();
    const g = ctx.createRadialGradient(x - 7, y - 8, 3, x, y, 26);
    g.addColorStop(0, CO.mix('#eef2f8', '#fff6b0', lamp)); g.addColorStop(1, CO.mix('#cfd8e6', '#ffd34d', lamp));
    ctx.fillStyle = g; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - 4, 24, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8b95a8'; D.roundRect(x - 11, y + 17, 22, 12, 3); ctx.fill();
    ctx.strokeStyle = lamp > 0.05 ? '#f59e0b' : '#7b8799'; ctx.lineWidth = lamp > 0.05 ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(x - 8, y + 17); ctx.lineTo(x - 5, y - 2); ctx.lineTo(x, y + 4); ctx.lineTo(x + 5, y - 2); ctx.lineTo(x + 8, y + 17); ctx.stroke();
    ctx.restore();
    D.text(x, y + 50, '전구', { size: fs(13), weight: 700, color: MUTED });
  }
  const swPos = () => ({ x: CG.bat.x + (CG.bulb.x - CG.bat.x) * 0.42, y: CG.topY });
  function wireSegs() {
    const b = CG.bat, [exL, exR] = exX(), sw = swPos();
    return [
      [[b.x, b.y - 38], [b.x, CG.topY], [sw.x - 26, CG.topY]],
      [[sw.x + 26, CG.topY], [CG.bulb.x - 30, CG.topY]],
      [[CG.bulb.x + 30, CG.topY], [CG.rightX, CG.topY], [CG.rightX, CG.amm.y - 44]],
      [[CG.rightX, CG.amm.y + 44], [CG.rightX, CG.wireY], [exR, CG.wireY], [exR, CG.exTop]],
      [[exL, CG.exTop], [exL, CG.wireY], [b.x, CG.wireY], [b.x, b.y + 38]],
    ];
  }
  function strokePoly(pts, w, col) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  function polyPoint(pts, d) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dy);
      if (d <= acc + l) { const u = (d - acc) / l; return [pts[i - 1][0] + dx * u, pts[i - 1][1] + dy * u]; }
      acc += l;
    }
    return pts[pts.length - 1];
  }
  const polyLen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
  function drawWaterMol(x, y, th, s, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(th);
    const h = (sg) => [Math.cos(0.91) * 8 * s, sg * Math.sin(0.91) * 8 * s];
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2 * s;
    [-1, 1].forEach((sg) => { const p = h(sg); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p[0], p[1]); ctx.stroke(); });
    D.sphere(0, 0, 5.2 * s, '#ef6b5a', { gloss: false, shadow: false });
    [-1, 1].forEach((sg) => { const p = h(sg); D.sphere(p[0], p[1], 3.4 * s, '#f4f7fb', { gloss: false, shadow: false, outline: 'rgba(120,140,170,.6)', outlineWidth: 1 }); });
    ctx.restore();
  }
  function drawCond(t) {
    const b = CG.box, [exL, exR] = exX(), bi = boxIn();
    const s = CD.sample;
    const lamp = CD.lampSmooth;
    // 배선
    const segs = wireSegs();
    segs.forEach((sg) => strokePoly(sg, 5, '#8a96ab'));
    // 전류 점 (전류 방향: 전지 (+) → 전구 → 전류계 → 오른쪽 전극 → 용액 → 왼쪽 전극 → 스위치 → 전지 (−))
    if (CD.I > 2) {
      ctx.fillStyle = '#ffb400';
      ctx.globalAlpha = 0.55 + 0.45 * clamp(CD.I / 120, 0, 1);
      segs.forEach((sg, si) => {
        const L = polyLen(sg), n = Math.max(1, Math.floor(L / 34));
        for (let i = 0; i < n; i++) {
          const d = (((i * 34 + CD.flow * 60 + si * 11) % L) + L) % L;
          const q = polyPoint(sg, d);
          ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, TAU); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    }
    // 전구 · 전류계 · 전지
    drawBulb(CG.bulb.x, CG.topY, lamp, t);
    drawBattery(CG.bat.x, CG.bat.y);
    // 스위치 (왼쪽 아래 선 위)
    const swx = swPos().x, swy = swPos().y;
    D.sphere(swx - 24, swy, 5, '#4b5873', { gloss: false, shadow: false }); D.sphere(swx + 24, swy, 5, '#4b5873', { gloss: false, shadow: false });
    ctx.save(); ctx.strokeStyle = CD.sw ? NEU : '#e2464b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(swx - 24, swy); ctx.lineTo(CD.sw ? swx + 24 : swx + 15, CD.sw ? swy : swy - 20); ctx.stroke(); ctx.restore();
    D.text(swx, swy + 30, '스위치 ' + (CD.sw ? 'ON' : 'OFF'), { size: fs(13), weight: 800, color: CD.sw ? '#0b6b39' : '#a3262b' });
    // 전류계
    drawAmmeter(CG.amm.x, CG.amm.y, CD.I);
    D.text(CG.amm.x, CG.amm.y + 66, '전류 ' + (CD.I < 0.5 ? '0.0' : Math.round(CD.I)) + ' mA', { size: fs(14), weight: 800, color: INK });
    // 가열 불꽃
    if (CD.heat > 0.03) {
      D.flame(b.x + b.w / 2, b.y + b.h + (PHONE ? 52 : 46), 46 * CD.heat, t);
      D.roundRect(b.x + b.w / 2 - 22, b.y + b.h + (PHONE ? 56 : 50), 44, 12, 5); ctx.fillStyle = '#8b95a8'; ctx.fill();
    }
    // 용기
    ctx.save();
    D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 22); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); }, { blur: 14, y: 5 });
    const hot = smooth((CD.temp - 200) / 600);
    if (s === 'melt' || s === 'solid') {
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      g.addColorStop(0, rgbaMix('#fff5e8', '#ffb25c', hot)); g.addColorStop(1, rgbaMix('#ffe9d2', '#ff7a2a', hot));
      D.roundRect(b.x + 6, b.y + 26, b.w - 12, b.h - 32, 18); ctx.fillStyle = g; ctx.globalAlpha = 0.25 + 0.55 * hot; ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (CD.waterA > 0.02) {
      const g = ctx.createLinearGradient(0, b.y + 30, 0, b.y + b.h);
      g.addColorStop(0, 'rgba(150,205,255,.55)'); g.addColorStop(1, 'rgba(110,175,245,.75)');
      ctx.globalAlpha = CD.waterA; D.roundRect(b.x + 6, b.y + 30, b.w - 12, b.h - 36, 18); ctx.fillStyle = g; ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.5; D.roundRect(b.x, b.y, b.w, b.h, 22); ctx.stroke();
    ctx.restore();
    // 물 분자
    if (CD.waterA > 0.02) CD.waters.forEach((m) => drawWaterMol(m.x, m.y, m.th, PHONE ? 1.15 : 1, CD.waterA * 0.95));
    // 이온 (입자 모형)
    const mobile = 1 - CD.w;
    CD.ions.forEach((p) => {
      if (CD.ionA < 0.02) return;
      const jit = CD.w > 0.5 ? Math.sin(t * 9 + p.j) * 1.2 * CD.w : 0;
      const r = p.na ? (PHONE ? 13 : 11.5) : (PHONE ? 18 : 16);
      if (CD.sw && mobile > 0.5 && CD.I > 5) {
        ctx.strokeStyle = p.na ? 'rgba(226,70,75,.28)' : 'rgba(56,103,244,.28)'; ctx.lineWidth = r * 0.9; ctx.lineCap = 'round';
        const dir = p.na ? 1 : -1;
        ctx.globalAlpha = p.a * CD.ionA;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + dir * 20, p.y); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.globalAlpha = p.a * CD.ionA;
      D.sphere(p.x + jit, p.y + jit * 0.6, r, p.na ? POS : NEG, { shadow: false });
      D.text(p.x + jit, p.y + jit * 0.6 + fs(5), p.na ? '+' : MINUS, { size: Math.round(r * 1.25), weight: 800, color: '#fff' });
      ctx.restore();
    });
    // 전극
    [exL, exR].forEach((x, i) => {
      D.shadow(() => { D.roundRect(x - 6, CG.exTop, 12, b.y + b.h - 28 - CG.exTop, 4); ctx.fillStyle = '#7b8799'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - 4, CG.exTop + 2, 3, b.y + b.h - 34 - CG.exTop);
      D.sphere(x, CG.exTop - 14, 14, i ? POS : NEG, { gloss: false, shadow: false });
      D.text(x, CG.exTop - 8, i ? '+' : MINUS, { size: fs(18), weight: 800, color: '#fff' });
    });
    // 이름표
    const nameY = b.y - (PHONE ? 8 : 10);
    pill(b.x + b.w / 2, nameY - 4, '🔍 입자 모형: ' + SAMPLES[s].name, { bg: '#4c1d95', color: '#fff', size: fs(14) });
    if (s === 'melt') pill(b.x + b.w - 70, b.y + b.h - 22, '🌡 ' + Math.round(CD.temp) + ' °C', { bg: CD.temp >= 790 ? '#e2464b' : '#fff', color: CD.temp >= 790 ? '#fff' : INK, border: '#f59e0b', size: fs(13) });
    if (s === 'solid') D.text(b.x + b.w / 2, b.y + b.h + fs(28), '이온이 제자리에 고정되어 있어요', { size: fs(14), weight: 700, color: MUTED });
    else if (s === 'melt') D.text(b.x + b.w / 2, b.y + b.h + fs(80), CD.temp >= 790 ? '녹아서 이온이 자유롭게 움직여요' : '801 °C까지 가열하는 중…', { size: fs(14), weight: 700, color: MUTED });
    else if (s === 'aq') D.text(b.x + b.w / 2, b.y + b.h + fs(28), '이온이 물속에서 자유롭게 움직여요', { size: fs(14), weight: 700, color: MUTED });
    else D.text(b.x + b.w / 2, b.y + b.h + fs(28), '물 분자뿐이고 이온이 거의 없어요', { size: fs(14), weight: 700, color: MUTED });
    // 전극 이동 설명
    if (CD.sw && CD.I > 20) {
      pill(exL - 6, b.y + b.h + fs(50), 'Na⁺ → (−)극', { bg: POS, size: fs(12) });
      pill(exR + 6, b.y + b.h + fs(50), '(+)극 ← Cl⁻', { bg: NEG, size: fs(12) });
    }
    // 측정 기록 표시
    const rec = CD.results[s];
    if (rec) D.check(b.x + 22, b.y + 20, 14, 1);
  }
  function rgbaMix(a, b, t) { return CO.mix(a, b, clamp(t, 0, 1)); }

  /* =========================================================
     ④ 소금의 역할: 물에 녹는 모형 · 바닷물과 몸속
     ========================================================= */
  const BK = PHONE ? { x: 60, y: 340, w: 440, h: 330 } : { x: 190, y: 262, w: 420, h: 290 };
  const HOME = PHONE ? { x: 110, y: 200 } : { x: 100, y: 190 };
  const TOTAL_IONS = 12;
  const DS = {
    crystal: { x: HOME.x, y: HOME.y, state: 'home', sc: 1, ox: 0, oy: 0 }, ions: [], waters: [], free: 0, timer: 0, lamp: 0, splash: 0, bob: 0,
  };
  const waterTop = () => BK.y + 44;
  const bkIn = () => ({ x0: BK.x + 18, x1: BK.x + BK.w - 18, y0: waterTop() + 10, y1: BK.y + BK.h - 14 });
  function resetDissolve() {
    DS.crystal = { x: HOME.x, y: HOME.y, state: 'home', sc: 1, ox: 0, oy: 0 };
    DS.ions = []; DS.free = 0; DS.timer = 0;
    const bi = bkIn();
    DS.waters = [];
    for (let i = 0; i < (PHONE ? 46 : 52); i++) DS.waters.push({ x: rnd(bi.x0, bi.x1), y: rnd(bi.y0, bi.y1), vx: rnd(-20, 20), vy: rnd(-20, 20), th: rnd(0, TAU), w: rnd(-0.8, 0.8) });
  }
  function dropCrystal() {
    const c = DS.crystal;
    c.state = 'fall';
    const bi = bkIn();
    const ty = bi.y1 - 38, tx = BK.x + BK.w / 2;
    tween(c, { x: tx, y: ty }, { duration: RM ? 0.01 : 0.9, ease: 'outBounce', onDone: settleCrystal });
    Sound.tick();
    for (let i = 0; i < 10; i++) fx.emit({ x: c.x + rnd(-14, 14), y: waterTop() + 4, vx: rnd(-40, 40), vy: rnd(-120, -40), life: 0.7, size: rnd(2.5, 4.5), color: '#cfe8ff', gravity: 320, shape: 'bubble' });
  }
  function settleCrystal() {
    const c = DS.crystal;
    c.state = 'gone';
    const cols = 4, rows = 3, sp = PHONE ? 34 : 32;
    const cx = c.x, by = c.y + 14;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const na = (r + k) % 2 === 0;
      const sx = cx + (k - (cols - 1) / 2) * sp, sy = by - r * sp;
      DS.ions.push({ na, x: sx, y: sy, sx, sy, state: 'lattice', r, k, vx: 0, vy: 0, th: rnd(0, TAU), age: 0 });
    }
    DS.timer = 0.9;
    Sound.click();
    showHint('물 분자가 이온을 하나씩 끌어당겨 떼어 내요', 4200);
  }
  function stepDissolve(dt) {
    const bi = bkIn();
    const lattice = DS.ions.filter((p) => p.state === 'lattice');
    // 물 분자
    DS.waters.forEach((m) => {
      m.vx += rnd(-1, 1) * 110 * dt; m.vy += rnd(-1, 1) * 110 * dt;
      if (lattice.length) { // 결정 쪽으로 끌려감
        const cx = BK.x + BK.w / 2, cy = bi.y1 - 36;
        const dx = cx - m.x, dy = cy - m.y, d = Math.hypot(dx, dy) || 1;
        if (d > 70 && d < 190) { m.vx += (dx / d) * 36 * dt; m.vy += (dy / d) * 36 * dt; }
        if (d < 62) { m.vx -= (dx / d) * 80 * dt; m.vy -= (dy / d) * 80 * dt; }
      }
      const damp = Math.exp(-1.4 * dt); m.vx *= damp; m.vy *= damp;
      m.x += m.vx * dt; m.y += m.vy * dt; m.th += m.w * dt;
      if (m.x < bi.x0) { m.x = bi.x0; m.vx = Math.abs(m.vx); }
      if (m.x > bi.x1) { m.x = bi.x1; m.vx = -Math.abs(m.vx); }
      if (m.y < bi.y0) { m.y = bi.y0; m.vy = Math.abs(m.vy); }
      if (m.y > bi.y1) { m.y = bi.y1; m.vy = -Math.abs(m.vy); }
    });
    if (lattice.length && DS.crystal.state === 'gone') {
      DS.timer -= dt;
      if (DS.timer <= 0) {
        DS.timer = 0.5;
        // 가장 바깥(위쪽, 가장자리) 이온부터
        lattice.sort((a, b) => (b.r * 10 + Math.abs(b.k - 1.5)) - (a.r * 10 + Math.abs(a.k - 1.5)));
        const p = lattice[0];
        p.state = 'leaving'; p.age = 0;
        const ang = rnd(-Math.PI * 0.85, -Math.PI * 0.15);
        p.vx = Math.cos(ang) * 70; p.vy = Math.sin(ang) * 70;
        Sound.tick();
      }
    }
    DS.ions.forEach((p) => {
      if (p.state === 'leaving') {
        p.age += dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.age > 0.6) { p.state = "free"; DS.free = DS.ions.filter((q) => q.state === 'free').length; p.vx = rnd(-30, 30); p.vy = rnd(-30, 30); }
      } else if (p.state === 'free') {
        p.age += dt;
        p.vx += rnd(-1, 1) * 120 * dt; p.vy += rnd(-1, 1) * 120 * dt;
        const damp = Math.exp(-1.6 * dt); p.vx *= damp; p.vy *= damp;
        p.x += p.vx * dt; p.y += p.vy * dt; p.th += dt * 0.7;
        if (p.x < bi.x0 + 26) { p.x = bi.x0 + 26; p.vx = Math.abs(p.vx); }
        if (p.x > bi.x1 - 26) { p.x = bi.x1 - 26; p.vx = -Math.abs(p.vx); }
        if (p.y < bi.y0 + 26) { p.y = bi.y0 + 26; p.vy = Math.abs(p.vy); }
        if (p.y > bi.y1 - 20) { p.y = bi.y1 - 20; p.vy = -Math.abs(p.vy); }
      }
    });
    DS.free = DS.ions.filter((q) => q.state === 'free').length;
    DS.lamp = approach(DS.lamp, DS.free / TOTAL_IONS, dt, 3);
    DS.bob += dt;
  }
  function dsPointer(p, type) {
    const c = DS.crystal;
    if (type === 'down') {
      if (c.state === 'home' && Math.hypot(p.x - c.x, p.y - c.y) < 54) { c.state = 'drag'; c.ox = p.x - c.x; c.oy = p.y - c.y; Sound.click(); return true; }
      return false;
    }
    if (c.state !== 'drag') return true;
    if (type === 'move') { c.x = p.x - c.ox; c.y = p.y - c.oy; }
    else if (type === 'up') {
      const inside = c.x > BK.x + 20 && c.x < BK.x + BK.w - 20 && c.y > BK.y - 70 && c.y < BK.y + BK.h;
      if (inside) { c.x = clamp(c.x, BK.x + 60, BK.x + BK.w - 60); c.y = Math.min(c.y, waterTop() - 6); dropCrystal(); }
      else { c.state = 'back'; tween(c, { x: HOME.x, y: HOME.y }, { duration: RM ? 0.01 : 0.4, ease: 'outBack', onDone: () => { c.state = 'home'; } }); showHint('소금 알갱이를 비커의 물 위로 끌어다 놓아요', 3500); }
    }
    return true;
  }
  function drawSaltGrain(x, y, sc, t, lift) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (lift) D.glow(0, 8, 70, '#7c3aed', 0.2);
    D.shadow(() => {
      const s = 18;
      // 작은 정육면체 3개
      [[-16, 8], [14, 10], [-1, -12]].forEach((q, i) => {
        const g = ctx.createLinearGradient(q[0] - s, q[1] - s, q[0] + s, q[1] + s);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d6dbe8');
        D.roundRect(q[0] - s, q[1] - s, s * 2, s * 2, 5); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#b6bfd3'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(q[0] - s + 4, q[1] - s + 4, 9, 4);
      });
    }, { blur: lift ? 14 : 8, y: lift ? 9 : 4 });
    ctx.restore();
  }
  // 이온 주위의 물 분자 (양이온에는 O가, 음이온에는 H가 향함)
  function hydration(p, t, a) {
    const r = p.na ? 13 : 18;
    for (let i = 0; i < 4; i++) {
      const ang = p.th + (i * TAU) / 4;
      const rr = r + (PHONE ? 15 : 13);
      const wx = p.x + Math.cos(ang) * rr, wy = p.y + Math.sin(ang) * rr;
      // 물 분자의 H는 th 방향. 양이온: H가 바깥쪽(O가 이온 쪽), 음이온: H가 이온 쪽
      drawWaterMol(wx, wy, ang + (p.na ? 0 : Math.PI), 0.78, a);
    }
  }
  function drawBeakerScene(t) {
    const bi = bkIn();
    // 회로 (전구 + 전극)
    const exL = BK.x + 58, exR = BK.x + BK.w - 58;
    const topY = PHONE ? 120 : 98;
    strokePoly([[exL, BK.y - 26], [exL, topY], [BK.x + BK.w / 2 - 34, topY]], 5, '#8a96ab');
    strokePoly([[exR, BK.y - 26], [exR, topY], [BK.x + BK.w / 2 + 34, topY]], 5, '#8a96ab');
    ctx.save(); ctx.fillStyle = BG; ctx.fillRect(exL - 30, topY + 38, 60, 40); ctx.restore();
    drawBattery(exL, topY + 62 - 0);
    drawBulb(BK.x + BK.w / 2, topY, DS.lamp, t);
    // 비커
    D.beaker(BK.x, BK.y, BK.w, BK.h, { level: 0.84, liquid: '#8cc8ff', t, wave: 1.6, ticks: 0 });
    // 전극
    [exL, exR].forEach((x, i) => {
      D.shadow(() => { D.roundRect(x - 6, BK.y - 26, 12, BK.h - 70, 4); ctx.fillStyle = '#7b8799'; ctx.fill(); }, { blur: 5, y: 2 });
      D.sphere(x, BK.y - 30, 12, i ? POS : NEG, { gloss: false, shadow: false });
      D.text(x, BK.y - 25, i ? '+' : MINUS, { size: fs(16), weight: 800, color: '#fff' });
    });
    // 물 분자
    DS.waters.forEach((m) => drawWaterMol(m.x, m.y, m.th, PHONE ? 1.1 : 1, 0.9));
    // 결정 이온
    DS.ions.forEach((p) => {
      const r = p.na ? 13 : 18;
      if (p.state === 'lattice') {
        const j = Math.sin(t * 8 + p.r * 2 + p.k) * 0.8;
        D.sphere(p.x + j, p.y, r, p.na ? POS : NEG, { shadow: false });
        D.text(p.x + j, p.y + fs(5), p.na ? '+' : MINUS, { size: Math.round(r * 1.25), weight: 800, color: '#fff' });
      }
    });
    DS.ions.forEach((p) => {
      const r = p.na ? 13 : 18;
      if (p.state === 'lattice') return;
      if (p.state === 'leaving') { const a = clamp(p.age / 0.7, 0, 1); hydration(p, t, a); }
      else hydration(p, t, 1);
      D.sphere(p.x, p.y, r, p.na ? POS : NEG, { shadow: false });
      D.text(p.x, p.y + fs(5), p.na ? '+' : MINUS, { size: Math.round(r * 1.25), weight: 800, color: '#fff' });
    });
    // 소금 알갱이
    const c = DS.crystal;
    if (c.state !== 'gone') {
      const bob = c.state === 'home' ? Math.sin(t * 2) * 2 : 0;
      drawSaltGrain(c.x, c.y + bob, c.state === 'drag' ? 1.25 : 1.1, t, c.state === 'drag');
      if (c.state === 'home') {
        pill(c.x, c.y + fs(52), '소금 알갱이', { bg: '#fff', color: INK, border: '#c9b6f5' });
        D.arrow(c.x + 40, c.y + 4, c.x + 90, c.y + 30, { color: 'rgba(124,58,237,.55)', width: 3, dash: [6, 6] });
      }
    }
    // 설명
    pill(BK.x + BK.w / 2, BK.y + BK.h + fs(24), 'Na⁺ ' + DS.ions.filter((q) => q.na && q.state !== 'lattice').length + '개 · Cl⁻ ' + DS.ions.filter((q) => !q.na && q.state !== 'lattice').length + '개 녹아 나옴', { bg: '#fff', color: INK, border: '#c9b6f5', size: fs(14) });
    if (DS.free > 0) pill(BK.x + BK.w / 2, BK.y + BK.h + fs(58), (PHONE ? 'O는 양이온 쪽, H는 음이온 쪽' : '물 분자의 O는 양이온 쪽, H는 음이온 쪽을 향해요'), { bg: '#7c3aed', color: '#fff', size: fs(13) });
    // 물 분자와 이온의 방향 설명 카드
    const cw = PHONE ? 0 : 168, cxx = BK.x + BK.w + 14, cyy = BK.y + 18;
    if (!PHONE) {
      ctx.save();
      D.roundRect(cxx, cyy, cw, 196, 14); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); ctx.strokeStyle = '#d9cffa'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      D.text(cxx + cw / 2, cyy + 26, '🔍 물 분자가 하는 일', { size: fs(14), weight: 800, color: '#4c1d95' });
      // 양이온 + 물 분자(O가 이온 쪽)
      D.sphere(cxx + 34, cyy + 76, 14, POS, { shadow: false }); D.text(cxx + 34, cyy + 81, '+', { size: 18, weight: 800, color: '#fff' });
      drawWaterMol(cxx + 78, cyy + 76, 0, 1.25, 1);
      D.text(cxx + cw / 2, cyy + 108, 'O가 양이온 쪽', { size: fs(13), weight: 700, color: MUTED });
      D.sphere(cxx + 30, cyy + 144, 18, NEG, { shadow: false }); D.text(cxx + 30, cyy + 150, MINUS, { size: 22, weight: 800, color: '#fff' });
      drawWaterMol(cxx + 90, cyy + 144, Math.PI, 1.25, 1);
      D.text(cxx + cw / 2, cyy + 178, 'H가 음이온 쪽', { size: fs(13), weight: 700, color: MUTED });
    }
  }
  function drawBody(t) {
    // 위: 바닷물
    const topH = PHONE ? 376 : 270;
    D.roundRect(14, 14, VW - 28, topH - 6, 18); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
    const bx = PHONE ? 40 : 56, by = 62, bw = PHONE ? 220 : 250, bh = PHONE ? 200 : 180;
    D.text(PHONE ? 150 : 180, 42, '🌊 바닷물', { size: fs(17), weight: 800, color: '#4c1d95' });
    D.beaker(bx, by + 20, bw, bh - 20, { level: 0.82, liquid: '#5fb2f0', t, wave: 1.6 });
    // 이온 (많음)
    for (let i = 0; i < 26; i++) {
      const sx = bx + 24 + ((i * 53) % (bw - 48)), sy = by + 56 + ((i * 37) % (bh - 90));
      const x = sx + Math.sin(t * 1.3 + i) * 5, y = sy + Math.cos(t * 1.1 + i * 1.7) * 5;
      const na = i % 2 === 0;
      D.sphere(x, y, na ? 8 : 11, na ? POS : NEG, { shadow: false });
    }
    // 전구
    const lampX = bx + bw + (PHONE ? 50 : 70);
    drawBulb(lampX, by + 40, 0.95, t);
    strokePoly([[bx + 40, by - 2], [bx + 40, by + 20 - 24], [lampX - 40, by + 20 - 24], [lampX - 40, by + 40]], 3, '#a6b0c3');
    const tx = PHONE ? 40 : lampX + 62;
    const ty = PHONE ? by + bh + 50 : by + 24;
    lines(tx, ty, ['바닷물에는 소금 등이 녹아', '이온이 많아서 전류가 잘 흘러요.'], { align: 'left', size: fs(14), lh: fs(22) });
    if (!PHONE) lines(tx, ty + 70, ['체액(몸속 액체)에도 Na⁺, Cl⁻ 같은', '이온이 녹아 있어요.', '(생리식염수 ≈ 0.9 % 소금물)'], { align: 'left', size: fs(14), lh: fs(22), color: MUTED });
    // 아래: 신경 세포
    const ay = topH + (PHONE ? 160 : 150);
    const ax0 = 44, ax1 = VW - 44, ah = PHONE ? 70 : 76;
    D.text(VW / 2, topH + 36, '🧠 신경 세포: 신호는 이온의 이동으로 전달돼요', { size: fs(16), weight: 800, color: '#4c1d95' });
    D.text(VW / 2, topH + 60, '몸속 체액의 Na⁺ 이온이 세포막을 드나들며 신호가 흘러가요', { size: fs(13), weight: 700, color: MUTED });
    // 축삭
    D.shadow(() => { D.roundRect(ax0, ay - ah / 2, ax1 - ax0, ah, ah / 2); ctx.fillStyle = '#ffe4d1'; ctx.fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = '#e8a07a'; ctx.lineWidth = 3; D.roundRect(ax0, ay - ah / 2, ax1 - ax0, ah, ah / 2); ctx.stroke();
    // 바깥(체액) Na⁺ 이온
    const per = 3.8, ph = (S.bodyT % per) / per;
    const px = ax0 + 40 + ph * (ax1 - ax0 - 80);
    D.glow(px, ay, ah * 1.3, '#ffd34d', 0.55);
    for (let i = 0; i < 14; i++) {
      const x = ax0 + 30 + i * ((ax1 - ax0 - 60) / 13);
      const d = Math.abs(x - px);
      const near = clamp(1 - d / 70, 0, 1);
      const yOut = ay - ah / 2 - 20 - Math.sin(t * 1.4 + i) * 3;
      const yIn = ay - 6;
      const y = lerp(yOut, yIn, smooth(near));
      D.sphere(x, y, 8, POS, { shadow: false });
    }
    for (let i = 0; i < 14; i++) { // 아래쪽 체액
      const x = ax0 + 44 + i * ((ax1 - ax0 - 60) / 13) + 8;
      D.sphere(x, ay + ah / 2 + 20 + Math.sin(t * 1.2 + i * 2) * 3, 8, i % 2 ? NEG : POS, { shadow: false });
    }
    pill(px, ay + ah / 2 + 52, '신호가 지나가는 곳', { bg: '#f59e0b', size: fs(13) });
    pill(VW / 2, VH - fs(24), PHONE ? '소금(Na⁺, Cl⁻)의 이온은 생존에 필요해요' : '이온이 있어야 몸이 신호를 주고받아요 → 소금(Na⁺, Cl⁻)은 생존에 필요해요', { bg: '#fff', color: INK, border: '#c9b6f5', size: fs(13) });
  }

  /* =========================================================
     결과 표 (전기 전도성)
     ========================================================= */
  const TBL = [
    { k: 'solid', r: '고체 NaCl', lamp: 0, ion: 0, hint: '고체 소금에서는 전구가 켜지지 않았어요. 이온은 격자에 고정돼 있어요.' },
    { k: 'melt', r: '녹인 NaCl', lamp: 1, ion: 1, hint: '녹인 소금에서는 전구가 켜졌어요. 이온이 자유롭게 움직일 수 있어요.' },
    { k: 'aq', r: 'NaCl 수용액', lamp: 1, ion: 1, hint: '소금물에서도 전구가 켜졌어요. 물에 녹은 이온이 자유롭게 움직여요.' },
  ];
  const TOPT = [['켜짐', '꺼짐'], ['고정되어 있음', '자유롭게 움직임']];
  const tblEls = [];
  const TS = { done: false };
  function buildTable() {
    const t = $('#ctable');
    let h = '<thead><tr><th>시료</th><th>전구</th><th>이온의 움직임</th></tr></thead><tbody>';
    TBL.forEach((row, i) => {
      h += '<tr><th>' + row.r + '</th>';
      [0, 1].forEach((j) => {
        const opts = TOPT[j].map((txt, k) => ({ txt, k })); if ((i + j) % 2 === 1) opts.reverse();
        h += '<td><select data-r="' + i + '" data-c="' + j + '" aria-label="' + row.r + (j ? ' 이온의 움직임' : ' 전구') + '"><option value="">선택</option>' + opts.map((o) => '<option value="' + (o.k === (j ? row.ion : row.lamp) ? 'y' : 'n' + o.k) + '">' + o.txt + '</option>').join('') + '</select></td>';
      });
      h += '</tr>';
    });
    t.innerHTML = h + '</tbody>';
    $$('#ctable select').forEach((s) => {
      tblEls.push(s);
      s.addEventListener('change', () => {
        s.classList.remove('bad');
        const ok = s.value === 'y';
        s.classList.toggle('ok', ok);
        if (ok) Sound.click();
        if (tableAllOk() && !TS.done) { TS.done = true; Sound.success(); fx.burst(VW / 2, VH / 2, { count: 18, speed: 160 }); }
      });
    });
  }
  const tableAllOk = () => tblEls.length > 0 && tblEls.every((s) => s.value === 'y');
  function tableCheck() {
    let empty = 0, firstBad = -1;
    tblEls.forEach((s) => {
      if (s.value === '') { empty++; return; }
      if (s.value !== 'y') { if (firstBad < 0) firstBad = +s.dataset.r; if (!s.classList.contains('bad')) s.classList.add('bad'); }
      else s.classList.remove('bad');
    });
    if (tableAllOk()) return true;
    if (firstBad >= 0) return '"' + TBL[firstBad].r + '" 줄을 다시 확인해요. ' + TBL[firstBad].hint;
    return '아직 빈칸이 ' + empty + '개 남았어요.';
  }
  function resetTable() { tblEls.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); TS.done = false; }

  /* =========================================================
     읽기판 · 입력 · 그리기 · 반복
     ========================================================= */
  function updateReadouts() {
    const key = curKey();
    if (key === 'atoms') {
      const done = A.phase === 'done';
      setRO(1, 'Na의 전자 수', done ? '11개 → 10개' : '11개');
      setRO(2, 'Cl의 전자 수', done ? '17개 → 18개' : '17개');
      setRO(3, '만들어진 입자', done ? ionHTML('Na', 1) + ' + ' + ionHTML('Cl', -1) : '원자 (전하 0)');
    } else if (key === 'lattice') {
      const a = latCount('Na'), b = latCount('Cl');
      setRO(1, '놓인 Na⁺', a + '개'); setRO(2, '놓인 Cl⁻', b + '개');
      setRO(3, '개수비 Na⁺ : Cl⁻', a === b && a > 0 ? '1 : 1' : a + ' : ' + b);
    } else if (key === 'formula') {
      const c = fmCmp();
      setRO(1, '(+) 전하의 합', '+' + fmQp()); setRO(2, '(−) 전하의 합', MINUS + fmQm());
      setRO(3, '화학식', fmBalanced() && fmSimplest() ? fmFormula() + ' ✔' : fmBalanced() ? fmFormula() + ' (비를 줄여요)' : '전하의 합 ≠ 0');
    } else if (key === 'conduct') {
      const s = CD.sample;
      setRO(1, '시료', SAMPLES[s].name);
      setRO(2, '전류', (CD.I < 0.5 ? '0.0' : Math.round(CD.I)) + '<small>mA</small>');
      setRO(3, '전구', CD.lampSmooth > 0.1 ? '켜짐 💡' : '꺼짐');
    } else if (key === 'dissolve') {
      setRO(1, '녹아 나온 이온', DS.free + ' / ' + TOTAL_IONS + '개');
      setRO(2, '전구', DS.lamp > 0.1 ? '켜짐 💡 (' + Math.round(DS.lamp * 100) + ' %)' : '꺼짐');
      setRO(3, '상태', DS.free >= TOTAL_IONS ? '모두 녹음' : DS.ions.length ? '녹는 중…' : '소금을 넣어요');
    } else {
      setRO(1, '바닷물', '이온이 많아요'); setRO(2, '체액', 'Na⁺, Cl⁻ 포함'); setRO(3, '신경 신호', '이온의 이동');
    }
  }

  SciSim.pointer(view, {
    down(p) {
      const key = curKey();
      if (key === 'atoms') return atomsPointer(p, 'down');
      if (key === 'lattice') return latPointer(p, 'down');
      if (key === 'dissolve') return dsPointer(p, 'down');
      if (key === 'conduct') {
        if (Math.hypot(p.x - swPos().x, p.y - swPos().y) < 44) setSwitch(!CD.sw);
      }
      return false;
    },
    move(p) {
      const key = curKey();
      if (key === 'atoms') atomsPointer(p, 'move'); else if (key === 'lattice') latPointer(p, 'move'); else if (key === 'dissolve') dsPointer(p, 'move');
    },
    up(p) {
      const key = curKey();
      if (key === 'atoms') atomsPointer(p, 'up'); else if (key === 'lattice') latPointer(p, 'up'); else if (key === 'dissolve') dsPointer(p, 'up');
    },
    hover(p) {
      const key = curKey();
      if (key === 'atoms') { const h = elecPos(performance.now() / 1000); return A.phase === 'idle' && Math.hypot(p.x - h.x, p.y - h.y) < 26 ? 'grab' : null; }
      if (key === 'lattice') { if (LAT.done) return 'grab'; return ['Na', 'Cl'].some((t) => Math.hypot(p.x - dispPos(t).x, p.y - dispPos(t).y) < 50) ? 'grab' : null; }
      if (key === 'dissolve') return DS.crystal.state === 'home' && Math.hypot(p.x - DS.crystal.x, p.y - DS.crystal.y) < 54 ? 'grab' : null;
      return null;
    },
  });

  // 휴대폰: 캔버스 위에서도 페이지가 스크롤되도록 하고, 끌 수 있는 물체를 누를 때만 스크롤을 막아요
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t0 = e.touches[0]; if (!t0) return;
      const p = view.toLocal(t0), key = curKey();
      let hit = false;
      if (key === 'atoms') { const h = elecPos(performance.now() / 1000); hit = A.phase === 'idle' && Math.hypot(p.x - h.x, p.y - h.y) < 34; }
      else if (key === 'lattice') hit = LAT.done || ['Na', 'Cl'].some((t) => Math.hypot(p.x - dispPos(t).x, p.y - dispPos(t).y) < 56);
      else if (key === 'dissolve') hit = DS.crystal.state === 'home' && Math.hypot(p.x - DS.crystal.x, p.y - DS.crystal.y) < 60;
      if (hit) e.preventDefault();
    }, { passive: false });
  }
  $('#sDist').addEventListener('input', (e) => {
    if (A.phase !== 'idle') return;
    A.slider = +e.target.value / 100; syncDist();
    if (A.slider >= 0.8 && !A.hinted) { A.hinted = true; showHint('전자가 반짝여요! 금빛 전자를 Cl의 점선 자리로 끌어 놓아요', 4500); }
  });
  $$('#latTabs button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.latView = b.dataset.v; setScene('lattice'); if (b.dataset.v === 'formula') fmSync(); }));
  $$('#cmpSeg button').forEach((b) => b.addEventListener('click', () => fmChoose(b.dataset.c)));
  $('#catMinus').addEventListener('click', () => fmSet(FM.nc - 1, FM.na));
  $('#catPlus').addEventListener('click', () => fmSet(FM.nc + 1, FM.na));
  $('#anMinus').addEventListener('click', () => fmSet(FM.nc, FM.na - 1));
  $('#anPlus').addEventListener('click', () => fmSet(FM.nc, FM.na + 1));
  $$('#sampleBtns .opt[data-s]').forEach((b) => b.addEventListener('click', () => setSample(b.dataset.s)));
  $('#swBtn').addEventListener('click', () => setSwitch(!CD.sw));
  $$('#disTabs button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); S.disView = b.dataset.v; setScene('dissolve');
    if (b.dataset.v === 'body') { S.bodyT = 0; $('#disNote').textContent = '바닷물과 몸속 체액에도 이온이 녹아 있어요.'; }
    else $('#disNote').textContent = DS.crystal.state === 'home' ? '소금 알갱이를 끌어 물속에 넣어 봐요.' : '물 분자가 이온을 하나씩 떼어 내요.';
  }));
  $('#saltBtn').addEventListener('click', () => { Sound.click(); resetDissolve(); $('#disNote').textContent = '소금 알갱이를 끌어 물속에 넣어 봐요.'; });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); const sc = b.dataset.scene;
    setScene(sc, sc === 'lattice' ? 'lattice' : sc === 'dissolve' ? 'dissolve' : null);
    if (sc === 'lattice') fmSync();
  }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    const key = curKey();
    if (key === 'atoms') resetAtoms();
    else if (key === 'lattice') resetLattice();
    else if (key === 'formula') { FM.nc = 1; FM.na = 1; FM.okT = 0; fmSync(); }
    else if (key === 'conduct') { const was = CD.results; resetCond(); CD.results = was; syncCond(); }
    else if (key === 'dissolve') resetDissolve();
    else S.bodyT = 0;
  });

  function draw(t) {
    view.clear(BG);
    bgFill();
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    const key = curKey();
    if (key === 'atoms') drawAtoms(t);
    else if (key === 'lattice') drawLattice(t);
    else if (key === 'formula') drawFormula(t);
    else if (key === 'conduct') drawCond(t);
    else if (key === 'dissolve') drawBeakerScene(t);
    else drawBody(t);
    fx.draw(ctx);
    ctx.restore();
  }

  /* ---------- 미션 ---------- */
  const levels = [
    /* ---------- 1단계 · 모형 ---------- */
    {
      title: '전자가 옮겨 가요', short: '전자 이동', icon: '⚛️', phase: '모형',
      features: ['atoms'],
      intro: '<p class="si-q">❓ 탐구 질문: 소금은 어떻게 만들어졌고, 왜 고체일 때는 전기가 안 통하고 물에 녹이면 통할까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 원자가 전자를 잃으면 양이온, 얻으면 음이온이 된다고 배웠어요. 앞 차시에서는 이온이 되면 <b>18족 원소와 같은 전자 배치</b>가 된다는 것도 알았지요.</div>' +
        '<p>소금(염화 나트륨)의 재료는 <b>나트륨(Na)</b>과 <b>염소(Cl)</b> 원자예요. 두 원자를 가까이 가져가서 <b>전자 1개가 옮겨 가는</b> 모습을 직접 만들어 봐요.</p>',
      setup() { setScene('atoms'); resetAtoms(); showHint('↔️ 거리 슬라이더로 두 원자를 가까이 가져가 봐요', 4500); },
      recap: 'Na(금속)는 전자 1개를 잃어 <b>Na⁺</b>(2-8), Cl(비금속)는 전자 1개를 얻어 <b>Cl⁻</b>(2-8-8)가 되고, 두 이온이 <b>정전기적 인력</b>으로 결합해요. 이것이 <b>이온 결합</b>이에요.',
      summary: '<ul><li><b>이온 결합</b>: 금속 원소가 전자를 잃어 <b>양이온</b>, 비금속 원소가 전자를 얻어 <b>음이온</b>이 되고, 두 이온이 <b>정전기적 인력</b>(반대 전하끼리 끌어당기는 힘)으로 결합하는 것.</li>' +
        '<li>Na(2-8-1) → <b>Na⁺</b>(2-8, 네온과 같은 배치)<br>Cl(2-8-7) → <b>Cl⁻</b>(2-8-8, 아르곤과 같은 배치)</li></ul>' +
        '<span class="formula">Na − e⁻ → Na⁺ &nbsp;/&nbsp; Cl + e⁻ → Cl⁻</span><p class="note">전자가 옮겨 가도 양성자 수는 그대로예요. 전자의 수가 달라져서 전하를 띠어요.</p>',
      missions: [
        {
          title: '전자 옮기기',
          goal: '<b>거리</b>를 줄여 Na와 Cl 원자를 가까이 한 뒤, Na의 <b>금빛 전자</b>를 Cl의 빈자리로 옮겨 보세요.',
          hint: '슬라이더를 오른쪽 끝까지 밀면 전자가 반짝여요. 전자를 끌어 Cl의 점선 자리에 놓아요. (전자를 한 번 눌러도 돼요.)',
          check: () => merged(),
          hold: 0.6,
          status: () => mark(A.slider >= 0.8 || A.phase !== 'idle') + ' 가까이 · ' + mark(A.phase === 'done') + ' 전자 이동 · ' + mark(merged()) + ' 이온 결합',
          explain: 'Na는 바깥 전자가 1개뿐이라 이 전자를 잃으면 <b>2-8(네온과 같은 배치)</b>이 되어 안정해요. Cl는 바깥 전자가 7개라 1개를 얻으면 <b>2-8-8(아르곤과 같은 배치)</b>이 돼요. 전자를 잃은 Na는 <b>Na⁺</b>, 전자를 얻은 Cl는 <b>Cl⁻</b>가 되어 서로 끌어당겨요.',
        },
        {
          type: 'quiz', title: '양이온이 되는 쪽',
          goal: 'Na와 Cl가 이온 결합을 할 때, <b>양이온이 되는 쪽</b>과 그 까닭으로 옳은 것은?',
          choices: ['Na — 금속 원소는 전자를 잃고 18족(Ne)과 같은 전자 배치가 되기 쉬워요', 'Cl — 비금속 원소라서 전자를 잃어요', 'Na와 Cl 모두 — 전자를 하나씩 내놓아 함께 써요', 'Cl — 전자가 7개로 Na보다 많아서 전자를 잃어요'],
          answer: 0,
          feedback: ['', 'Cl는 전자를 1개 얻으면 2-8-8로 안정해져요. 전자를 얻으면 음이온이 돼요.', '전자를 함께 쓰는 것은 공유 결합이에요(다음 차시). 이온 결합은 전자가 한쪽에서 다른 쪽으로 옮겨 가요.', '전자를 1개 잃어 안정해지는 쪽은 바깥 전자가 1개뿐인 Na예요. Cl는 1개를 얻는 쪽이 쉬워요.'],
          explain: '<b>금속 원소(Na)</b>는 전자를 잃어 <b>양이온</b>이 되고, <b>비금속 원소(Cl)</b>는 전자를 얻어 <b>음이온</b>이 돼요. 두 이온은 반대 전하를 띠어 정전기적 인력으로 결합해요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '이온이 쌓여 결정이 돼요', short: '이온 결정', icon: '🧊', phase: '탐구',
      features: ['lattice'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> Na⁺와 Cl⁻ 한 쌍이 정전기적 인력으로 결합했어요.</div>' +
        '<p>소금 한 알에는 이온이 셀 수 없이 많아요. 이온들은 어떻게 배열되어 있을까요? <b>이온을 하나씩 쌓아</b> 이온 결정을 만들고, 다른 이온 결합 물질의 <b>화학식</b>도 완성해 봐요.</p>',
      setup() { setScene('lattice', 'lattice'); resetLattice(); fmSync(); showHint('이온 통에서 이온을 끌어 격자의 빈칸에 놓아요', 4500); },
      recap: '이온 결합 물질은 양이온과 음이온이 <b>번갈아 규칙적으로 쌓인 이온 결정</b>이고, 전체 전하의 합이 0이 되도록 이온 수의 비로 화학식을 나타내요.',
      summary: '<ul><li><b>이온 결정</b>: 양이온과 음이온이 번갈아 규칙적으로 배열된 고체. NaCl 결정은 정육면체 모양이에요.</li>' +
        '<li>같은 전하끼리는 밀어내고, 반대 전하끼리는 끌어당겨요.</li>' +
        '<li>전체 전하의 합은 0 → <b>이온 수의 비</b>가 화학식이 돼요.</li></ul>' +
        '<table class="mini"><tr><th>물질</th><th>양이온 : 음이온</th><th>화학식</th></tr><tr><td>염화 나트륨</td><td>Na⁺ 1 : Cl⁻ 1</td><td>NaCl</td></tr><tr><td>산화 마그네슘</td><td>Mg²⁺ 1 : O²⁻ 1</td><td>MgO</td></tr><tr><td>염화 칼슘</td><td>Ca²⁺ 1 : Cl⁻ 2</td><td>CaCl₂</td></tr></table>',
      missions: [
        {
          title: '이온 결정 한 층 쌓기',
          goal: 'Na⁺와 Cl⁻를 끌어 격자의 빈칸 <b>10칸</b>을 모두 채워 보세요. 같은 전하끼리는 밀어내요!',
          hint: '이미 놓인 이온을 보세요. Na⁺ 옆에는 Cl⁻, Cl⁻ 옆에는 Na⁺가 와야 해요.',
          setup() { S.latView = 'lattice'; setScene('lattice'); },
          check: () => LAT.done,
          hold: 0.5,
          status: () => mark(LAT.done) + ' 빈칸 ' + (latFilled() - PREFILL.length) + ' / ' + (LN * LN - PREFILL.length) + '칸 채움',
          explain: '이온 결정에서는 양이온과 음이온이 <b>번갈아</b> 놓여요. 가장 가까운 이웃이 모두 반대 전하라서 서로 끌어당기고, 같은 전하는 멀리 떨어져 있어요. 한 층이 위아래로도 번갈아 쌓이면 <b>정육면체 모양</b>의 결정이 돼요.',
        },
        {
          title: '화학식 완성하기', manual: true,
          goal: '<b>MgO</b>와 <b>CaCl₂</b>에서 양이온과 음이온의 개수를 맞춰 <b>전하의 합이 0</b>이 되는 가장 간단한 비를 찾아요.',
          hint: '저울이 수평이 되면 (+)전하의 합과 (−)전하의 합이 같아요. Ca²⁺는 (+)2이고 Cl⁻는 (−)1이에요.',
          setup() { S.latView = 'formula'; fmChoose('MgO'); setScene('lattice'); fmSync(); },
          check: () => (FM.done.MgO && FM.done.CaCl2) ? true : (FM.done.MgO ? 'CaCl₂를 아직 완성하지 않았어요. 위의 CaCl₂ 버튼을 눌러 보세요.' : FM.done.CaCl2 ? 'MgO를 아직 완성하지 않았어요. MgO 버튼을 눌러 보세요.' : '저울을 수평으로 맞추고 가장 간단한 비를 만든 뒤 MgO와 CaCl₂를 모두 완성해요.'),
          status: () => mark(FM.done.MgO) + ' MgO · ' + mark(FM.done.CaCl2) + ' CaCl₂',
          explain: 'Mg²⁺는 +2, O²⁻는 −2라서 <b>1 : 1</b> → MgO. Ca²⁺는 +2, Cl⁻는 −1이라서 전하의 합을 0으로 맞추려면 Ca²⁺ 1개에 Cl⁻ <b>2개</b>가 필요해요 → CaCl₂. 이온 결합 물질의 화학식은 <b>이온 수의 가장 간단한 정수비</b>로 나타내요.',
        },
        {
          type: 'quiz', title: 'CaCl₂에서 Cl⁻가 2개인 까닭',
          goal: '염화 칼슘(CaCl₂)에는 Ca²⁺ 1개당 Cl⁻가 <b>2개</b> 들어 있어요. 그 까닭은?',
          choices: ['Ca²⁺의 (+)전하 2와 Cl⁻ 2개의 (−)전하 2를 맞춰 전체 전하가 0이 되기 때문이에요', 'Cl 원자가 Ca 원자보다 커서 더 많이 필요하기 때문이에요', 'Ca와 Cl가 전자를 2개씩 함께 쓰기 때문이에요', 'Cl⁻가 Ca²⁺보다 전자를 2개 더 갖고 있기 때문이에요'],
          answer: 0,
          feedback: ['', '원자의 크기는 개수비와 관계없어요. 전하의 합이 0이 되도록 개수가 정해져요.', '전자를 함께 쓰는 것은 공유 결합이에요. 이온 결합에서는 전자가 옮겨 가서 이온이 돼요.', 'Ca²⁺는 전자를 2개 잃은 이온이고 Cl⁻는 전자를 1개 얻은 이온이에요. 이온 개수는 전하의 합으로 정해져요.'],
          explain: '이온 결합 물질은 전기적으로 중성이므로 <b>(+)전하의 합 = (−)전하의 합</b>이에요. Ca²⁺ 1개(+2)와 Cl⁻ 2개(−1×2)가 만나야 전하의 합이 0이 돼요.',
        },
      ],
    },
    /* ---------- 3단계 · 실험 ---------- */
    {
      title: '전기가 통할까요?', short: '전기 전도성', icon: '💡', phase: '실험',
      features: ['conduct'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소금은 Na⁺와 Cl⁻가 규칙적으로 쌓인 이온 결정이라는 것을 알았어요.</div>' +
        '<p>그렇다면 소금은 전기가 통할까요? <b>전지와 전구</b>를 이은 회로에 전극을 꽂고, 소금이 <b>고체 · 녹은 액체 · 수용액</b>일 때 전구가 켜지는지 실험해요. 그리고 입자 모형으로 까닭을 찾아봐요.</p>' +
        '<p class="note">값은 설명을 위한 예시예요. 실제 소금은 약 801 °C에서 녹아요.</p>',
      setup() { setScene('conduct'); resetCond(); showHint('시료를 고르고 ⚡ 스위치를 켜 보세요', 4500); },
      recap: '고체 NaCl은 이온이 제자리에 고정되어 <b>전기가 통하지 않고</b>, 녹인 NaCl(액체)과 NaCl 수용액은 이온이 움직일 수 있어 <b>전기가 통해요</b>.',
      summary: '<table class="mini"><tr><th>상태</th><th>이온</th><th>전기</th></tr><tr><td>고체</td><td>격자에 고정</td><td>안 통함</td></tr><tr><td>액체(녹인 상태)</td><td>자유롭게 이동</td><td>통함</td></tr><tr><td>수용액</td><td>자유롭게 이동</td><td>통함</td></tr></table>' +
        '<ul><li>전류가 흐를 때 <b>Na⁺는 (−)극</b>으로, <b>Cl⁻는 (+)극</b>으로 이동해요.</li><li>증류수는 이온이 거의 없어 전기가 거의 통하지 않아요.</li></ul>',
      missions: [
        {
          title: '세 상태 모두 측정하기',
          goal: '<b>고체 NaCl · 녹인 NaCl · NaCl 수용액</b>에서 각각 스위치를 켜고 전구와 전류를 확인해요.',
          hint: '시료를 고른 뒤 ⚡ 스위치를 켜 두면 잠시 뒤 자동으로 기록돼요. 녹인 NaCl은 가열되는 동안 기다려요.',
          check: () => !!(CD.results.solid && CD.results.melt && CD.results.aq),
          hold: 0.4,
          status: () => mark(CD.results.solid) + ' 고체 · ' + mark(CD.results.melt) + ' 녹인 상태 · ' + mark(CD.results.aq) + ' 수용액',
          explain: '고체 소금에서는 전구가 켜지지 않았고, 녹인 소금과 소금물에서는 켜졌어요. 이온 결합 물질은 <b>상태에 따라</b> 전기 전도성이 달라요.',
        },
        {
          key: 'table', title: '결과 표 정리', manual: true,
          goal: '실험 결과를 <b>표</b>로 정리해요. 전구와 이온의 움직임을 골라 보세요.',
          hint: '입자 모형을 떠올려요. 고체에서는 이온이 격자에 고정돼 있었고, 녹이면 자유롭게 움직였어요.',
          check: () => tableCheck(),
          explain: '전류가 흐르려면 <b>전하를 띤 입자가 움직일 수 있어야</b> 해요. 녹인 소금과 소금물에서는 Na⁺와 Cl⁻가 자유롭게 움직여 전류를 나르지만, 고체에서는 이온이 제자리에 고정돼 있어요.',
        },
        {
          type: 'quiz', title: '고체 NaCl이 전기가 안 통하는 까닭',
          goal: '고체 NaCl에 전류가 흐르지 않는 까닭으로 옳은 것은?',
          choices: ['이온은 있지만 제자리에 고정되어 있어 움직일 수 없기 때문이에요', '고체 소금에는 이온이 없기 때문이에요', '고체는 원래 전기가 통하지 않는 물질이기 때문이에요', '(+)이온과 (−)이온이 서로 전하를 없애 버렸기 때문이에요'],
          answer: 0,
          feedback: ['', '고체 소금도 Na⁺와 Cl⁻ 이온으로 이루어져 있어요. 이온이 움직이지 못할 뿐이에요.', '구리 같은 금속은 고체여도 전기가 통해요. 소금이 안 통하는 까닭은 이온이 고정돼 있기 때문이에요.', '전체 전하의 합은 0이지만 각 이온은 전하를 그대로 띠고 있어요. 다만 움직일 수 없어요.'],
          explain: '고체 NaCl에는 이온이 <b>있지만</b> 격자에 고정되어 있어 전류를 나르지 못해요. 녹이거나 물에 녹이면 이온이 자유롭게 움직여 전기가 통해요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '소금의 역할', short: '소금의 역할', icon: '🧂', phase: '적용',
      features: ['dissolve'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소금이 물에 녹으면 이온이 움직여 전기가 통한다는 것을 알았어요.</div>' +
        '<p>소금 알갱이가 물에 녹을 때 이온은 어떻게 될까요? 물 분자가 이온을 <b>둘러싸서 떼어 내는</b> 모습을 보고, <b>바닷물과 우리 몸</b>에서 이온이 하는 일도 살펴봐요.</p>',
      setup() { setScene('dissolve', 'dissolve'); resetDissolve(); $('#disNote').textContent = '소금 알갱이를 끌어 물속에 넣어 봐요.'; showHint('🧂 소금 알갱이를 끌어 비커의 물에 넣어 봐요', 4500); },
      recap: '소금이 물에 녹으면 <b>이온이 물 분자에 둘러싸여 떨어져 나가</b> 자유롭게 움직여요. 그래서 소금물은 전기가 통하고, 몸속의 Na⁺, Cl⁻ 이온은 신경 신호 전달 등에 꼭 필요해요.',
      summary: '<ul><li>소금이 물에 녹으면 Na⁺와 Cl⁻가 <b>물 분자에 둘러싸여</b> 떨어져 나가요.</li><li>이온이 많을수록 전류가 잘 흘러요 (바닷물).</li><li>체액에 녹아 있는 Na⁺, Cl⁻ 같은 이온은 신경·근육의 신호 전달에 필요해요. 소금은 우리 몸에 꼭 필요하지만, 소금물을 많이 마시면 몸에 해로워요.</li></ul>' +
        '<p><b>이온 결합 물질의 공통 특징</b>: 고체에서는 전기가 안 통하지만, 액체나 수용액에서는 이온이 움직여 전기가 통해요.</p>',
      missions: [
        {
          title: '소금 녹이기', 
          goal: '소금 알갱이를 <b>물에 넣어</b> 이온이 모두 녹아 나오게 한 뒤, <b>🌊 바닷물·몸속</b> 탭도 살펴봐요.',
          hint: '소금 알갱이를 끌어 비커의 물 위에 놓아요. 다 녹으면 위의 🌊 탭을 눌러 봐요.',
          check: () => DS.free >= TOTAL_IONS && S.bodySeen,
          hold: 0.4,
          status: () => mark(DS.free >= TOTAL_IONS) + ' 이온 ' + DS.free + ' / ' + TOTAL_IONS + '개 녹음 · ' + mark(S.bodySeen) + ' 바닷물·몸속 살펴보기',
          explain: '물 분자는 양이온에는 <b>산소(O) 쪽</b>, 음이온에는 <b>수소(H) 쪽</b>을 향해 이온을 둘러싸요. 이렇게 이온이 하나씩 떨어져 나오면 물속에서 자유롭게 움직여 전류를 나를 수 있어요. 몸속 체액의 Na⁺, Cl⁻ 이온은 신경 신호를 전달하는 데 쓰여요.',
        },
        {
          type: 'quiz', title: '염화 칼슘 수용액은?',
          goal: '염화 칼슘(CaCl₂)은 이온 결합 물질이에요. 염화 칼슘을 물에 녹인 <b>수용액</b>의 전기 전도성을 예측해 보세요.',
          choices: ['전기가 통해요 — Ca²⁺와 Cl⁻ 이온이 물속에서 자유롭게 움직여요', '전기가 안 통해요 — 염화 칼슘은 원래 고체이기 때문이에요', '전기가 안 통해요 — 전체 전하의 합이 0이기 때문이에요', '전기가 통해요 — 전자가 물을 따라 이동하기 때문이에요'],
          answer: 0,
          feedback: ['', '고체였더라도 물에 녹으면 이온이 떨어져 나와 움직여요. 소금도 고체지만 소금물은 전기가 통했어요.', '전체 전하의 합이 0이어도 이온 하나하나는 전하를 띠고 있어요. 이온이 움직이면 전류가 흘러요.', '용액에서 전류를 나르는 것은 자유롭게 움직이는 이온이에요.'],
          explain: '이온 결합 물질인 염화 칼슘이 물에 녹으면 <b>Ca²⁺와 Cl⁻</b>로 나뉘어 자유롭게 움직여요. 그래서 수용액은 전기가 통해요.',
        },
        {
          type: 'quiz', title: '이온 결합 물질의 공통 특징',
          goal: '이온 결합 물질(NaCl, MgO, CaCl₂ 등)의 <b>전기 전도성</b>에 대해 옳은 것은?',
          choices: ['고체 상태에서도 전기가 잘 통해요', '액체나 수용액 상태에서는 이온이 움직여 전기가 통해요', '어떤 상태에서도 전자를 공유해서 전기가 통하지 않아요', '물에 녹으면 분자 상태로 흩어져서 전기가 통하지 않아요'],
          answer: 1,
          feedback: ['고체에서는 이온이 고정되어 있어 전기가 통하지 않았어요.', '', '전자를 공유하는 것은 공유 결합이에요. 이온 결합 물질은 이온 상태로 존재해요.', '이온 결합 물질은 물에 녹으면 분자가 아니라 양이온과 음이온으로 나뉘어요.'],
          explain: '이온 결합 물질은 <b>고체에서는 전기가 안 통하고, 녹인 액체나 수용액에서는 통해요.</b> 이온이 자유롭게 움직일 수 있는지가 핵심이에요.',
        },
      ],
    },
  ];

  buildCond(); buildTable(); resetDissolve(); resetLattice(); fmSync(); syncCond();
  game = SciSim.game({
    simId: 'h1-ionic-bond',
    mount: '#game',
    badge: '이온 결합 박사',
    homeHref: '../../index.html#h1a',
    featureLabels: { atoms: '⚛️ 원자 모형 · 전자 옮기기', lattice: '🧊 이온 결정 · 화학식 저울', conduct: '💡 전기 전도성 회로', dissolve: '🧂 물에 녹는 모형 · 바닷물·몸속' },
    onFeatures(set) { F = new Set(set); updateUI(); },
    onMissionStart(m) { S.table = m.key === 'table'; if (S.table) resetTable(); updateUI(); },
    levels,
  });

  updateUI();
  let lastT = 0;
  SciSim.loop((dt, t) => {
    const key = curKey();
    if (key === 'atoms') stepAtoms(dt);
    else if (key === 'lattice') stepLattice(dt);
    else if (key === 'formula') stepFormula(dt);
    else if (key === 'conduct') stepCond(dt);
    else if (key === 'dissolve') stepDissolve(dt);
    else { S.bodyT += dt; if (S.bodyT > 2.5) S.bodySeen = true; }
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = {
    S, A, LAT, FM, CD, DS, TBL, tblEls, game, levels, setScene, resetAtoms, startFly, dropIon, placeIon, cellXY, cellType, fmChoose, fmSet, setSample, setSwitch, tableAllOk,
    dropCrystal, resetDissolve, merged, latFilled, dispPos, CG, BK, HOME, exX,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    fillLattice() { for (let i = 0; i < 16; i++) if (!LAT.cells[i]) placeIon(i, cellType(i)); },
  };
})();
