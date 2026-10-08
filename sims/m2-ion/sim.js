/* =========================================================
   중2 Ⅳ. 물질의 구성 - 이온의 형성  [9과11-04]
   원자가 전기적으로 중성임을 토대로, 전자를 잃으면 양이온, 얻으면 음이온이 된다.
   이온은 전하를 띤다 (탐구: 전기력을 이용한 실험으로 이온의 이동 관찰하기)
   ① 관찰: 중성 원자 → ② 탐구: 전자를 잃으면(양이온)
   → ③ 탐구: 전자를 얻으면(음이온) → ④ 확인: 이온의 이동
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;

  /* ---------- 원소 자료 ---------- */
  const ELEMENTS = [null,
    ['H', '수소'], ['He', '헬륨'], ['Li', '리튬'], ['Be', '베릴륨'], ['B', '붕소'],
    ['C', '탄소'], ['N', '질소'], ['O', '산소'], ['F', '플루오린'], ['Ne', '네온'],
    ['Na', '나트륨'], ['Mg', '마그네슘'], ['Al', '알루미늄'], ['Si', '규소'], ['P', '인'],
    ['S', '황'], ['Cl', '염소'], ['Ar', '아르곤'], ['K', '칼륨'], ['Ca', '칼슘'],
  ];
  const NEUT = [0, 0, 2, 4, 5, 6, 6, 7, 8, 10, 10, 12, 12, 14, 14, 16, 16, 18, 22, 20, 20];
  const MINUS = '−';
  const MAX_E = 20;
  function signed(q) { return q > 0 ? '+' + q : q < 0 ? MINUS + (-q) : '0'; }
  function chargeSup(q) { if (!q) return ''; const n = Math.abs(q); return (n === 1 ? '' : String(n)) + (q > 0 ? '+' : MINUS); }
  function formulaHTML(sym, q) { return sym + (q ? '<sup>' + chargeSup(q) + '</sup>' : ''); }
  function identify(p, e) {
    const el = ELEMENTS[clamp(p, 1, 20)], q = p - e;
    return { p, e, q, sym: el[0], name: el[1], kind: q === 0 ? 'atom' : q > 0 ? 'cation' : 'anion' };
  }
  const KIND = {
    atom: { c: '#14a058', band: '원자 · 전기적으로 중성', short: '원자' },
    cation: { c: '#e2464b', band: '양이온 · (+)전하', short: '양이온' },
    anion: { c: '#3867f4', band: '음이온 · (−)전하', short: '음이온' },
  };

  /* ---------- 배치(가상 좌표 800 x 520) ---------- */
  const C = { x: 372, y: 262 };
  const SHELL_R = [80, 116, 152, 186];
  const SHELL_CAP = [2, 8, 8, 4];
  const SHELL_SPEED = [0.5, 0.33, 0.24, 0.18];
  const SHELL_OFF = [-Math.PI / 2, -Math.PI / 2 + 0.2, -Math.PI / 2 + 0.45, -Math.PI / 4];
  const ATOM_R = 214;
  const NR = 9, ER = 10;
  const EBIN = { x: 16, y: 176, w: 132, h: 168 };
  const CARD1 = { x: 598, y: 14, w: 188, h: 246 };
  const CARD2 = { x: 598, y: 272, w: 188, h: 234 };
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const COL = { p: '#e2464b', e: '#3867f4', good: '#14a058', ink: '#1b2333', muted: '#5d6879', line: '#dde4ef', warn: '#f26b3a', sub: '#8b5cf6', cu: '#1f7ae0', mn: '#8e2fb5' };
  const MAXQ = 4;

  // 이온의 이동 실험
  const PSU = { x: 300, y: 16, w: 200, h: 84 };
  const PLATE = { x: 60, y: 196, w: 680, h: 160 };
  const STRIP = { x: 100, y: 228, w: 600, h: 84 };
  const MID = STRIP.x + STRIP.w / 2;
  const MAXD = 236;                 // 색 띠가 이동할 수 있는 최대 거리
  const SPEED = 46;                 // 전원이 켜졌을 때 이동 빠르기(px/s)
  const PANEL = { x: 60, y: 368, w: 680, h: 142 };

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'atom',
    nucleons: [], electrons: [],
    drag: null, flying: [], pulses: [],
    phase: [0, 0, 0, 0],
    target: null, needle: 0, ringR: 120,
    lastP: 11, lastE: 11,
    banner: null, idFlash: null, focus: null, ePt: null, lockToast: 0,
    time: 0,
    mig: { on: false, leftPos: true, cu: 0, mn: 0, moved: 0, ions: [] },
  };

  let F = new Set();
  const on = (f) => F.has(f);
  let game = null;
  const isNew = (f) => !!(game && game.isNew(f));

  const np = () => S.nucleons.filter((q) => q.type === 'p').length;
  const ne = () => S.electrons.length + (S.drag && S.drag.from === 'atom' ? 1 : 0);

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: 800, height: 520, background: '#fff' });
  const ctx = view.ctx;

  /* ---------- 원자핵 (양성자 + 중성자: 이온이 될 때 변하지 않음) ---------- */
  function relax(iter) {
    const ps = S.nucleons, minD = NR * 2 * 0.93;
    for (let k = 0; k < iter; k++) {
      for (let i = 0; i < ps.length; i++) { ps[i].hx *= 0.96; ps[i].hy *= 0.96; }
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i], b = ps[j];
          let dx = b.hx - a.hx, dy = b.hy - a.hy, d = Math.hypot(dx, dy);
          if (d < 1e-3) { const ang = (i * 2.4 + j) % (Math.PI * 2); dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
          if (d < minD) {
            const push = (minD - d) / 2, ux = dx / d, uy = dy / d;
            a.hx -= ux * push; a.hy -= uy * push; b.hx += ux * push; b.hy += uy * push;
          }
        }
      }
    }
  }
  function nucleusR() { let r = 0; S.nucleons.forEach((q) => { r = Math.max(r, Math.hypot(q.hx, q.hy)); }); return r + NR; }
  function newElectron(x, y, fresh) { return { x, y, sx: x, sy: y, t: fresh ? 0 : 1, dur: 0.38, fresh: !!fresh, key: null }; }

  function shellOf(i) {
    let k = 0, start = 0;
    while (k < SHELL_CAP.length - 1 && i >= start + SHELL_CAP[k]) { start += SHELL_CAP[k]; k++; }
    return { k, start };
  }
  function slot(i, n) {
    const { k, start } = shellOf(i);
    const count = k === SHELL_CAP.length - 1 ? n - start : Math.min(SHELL_CAP[k], n - start);
    const a = S.phase[k] + SHELL_OFF[k] + (Math.PI * 2 * (i - start)) / count;
    return { k, x: C.x + Math.cos(a) * SHELL_R[k], y: C.y + Math.sin(a) * SHELL_R[k], key: k + ':' + (i - start) + ':' + count };
  }
  function shellsUsed(n) { return n <= 0 ? 0 : shellOf(n - 1).k + 1; }
  function outerR() { const n = ne(); return n ? SHELL_R[shellsUsed(n) - 1] + ER : Math.max(nucleusR(), 24) + 18; }

  function setState(p, e) {
    S.drag = null; S.flying = []; S.pulses = [];
    S.nucleons = [];
    const n = NEUT[p];
    for (let i = 0; i < p + n; i++) {
      const type = Math.floor((i + 1) * p / (p + n)) > Math.floor(i * p / (p + n)) ? 'p' : 'n';
      const ang = i * 2.39996, r = 8 * Math.sqrt(i);
      S.nucleons.push({ type, hx: Math.cos(ang) * r, hy: Math.sin(ang) * r, x: C.x, y: C.y });
    }
    relax(100);
    S.nucleons.forEach((q) => { q.x = C.x + q.hx; q.y = C.y + q.hy; });
    S.electrons = [];
    for (let i = 0; i < e; i++) { const s = slot(i, e); const el = newElectron(s.x, s.y, false); el.key = s.key; S.electrons.push(el); }
    S.lastP = p; S.lastE = e;
    S.banner = null; S.idFlash = null; S.ePt = null;
    S.needle = p - e;
    S.ringR = outerR() + 18;
    $$('#pickSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.z === p));
    updateUI(true);
  }

  const inRect = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  const inAtom = (p) => Math.hypot(p.x - C.x, p.y - C.y) <= ATOM_R && !inRect(p, EBIN);
  const binTop = () => ({ x: EBIN.x + EBIN.w / 2, y: EBIN.y + 90 });

  function addElectron(x, y) { S.electrons.push(newElectron(x, y, true)); Sound.tone(760, 0.06, 'triangle', 0.07); }
  function flyToBin(x, y) { const b = binTop(); S.flying.push({ x0: x, y0: y, x1: b.x, y1: b.y, t: 0 }); }

  const hintEl = $('#stageHint');
  function showHint(text, ms) { hintEl.textContent = text; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000); }
  function hideHint() { hintEl.classList.add('hide'); }

  function plusE() {
    hideHint();
    if (ne() >= MAX_E) { toast('전자는 ' + MAX_E + '개까지 넣을 수 있어요'); return; }
    const b = binTop(); addElectron(b.x, b.y);
  }
  function minusE() {
    hideHint();
    if (ne() <= 0) { toast('뺄 전자가 없어요'); return; }
    const el = S.electrons.pop(); flyToBin(el.x, el.y);
    Sound.tone(330, 0.07, 'triangle', 0.06);
  }
  function nucleusLocked() {
    if (S.time - S.lockToast > 2.5) { toast('🔒 이온이 될 때 원자핵(양성자 수)은 변하지 않아요'); S.lockToast = S.time; }
  }

  /* ---------- 이온의 이동 실험 ---------- */
  function resetPaper() {
    const m = S.mig;
    m.on = false; m.cu = 0; m.mn = 0; m.moved = 0;
    m.ions = [];
    // 두 종류의 이온을 엇갈린 격자로 배치 (처음에는 가운데에 섞여 있음)
    for (let i = 0; i < 8; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      m.ions.push({ kind: 'cu', ox: -78 + col * 52, oy: PANEL.y + 50 + row * 46, ph: Math.random() * 6.28 });
      m.ions.push({ kind: 'mn', ox: -52 + col * 52, oy: PANEL.y + 73 + row * 46, ph: Math.random() * 6.28 });
    }
    updateMoveUI();
  }
  function setPower(v) {
    S.mig.on = v; updateMoveUI();
    Sound.tone(v ? 880 : 300, 0.08, 'triangle', 0.08);
    hideHint();
  }
  function swapPoles() {
    S.mig.leftPos = !S.mig.leftPos; updateMoveUI();
    Sound.click(); hideHint();
    toast('🔄 전극을 바꾸었어요: 왼쪽 ' + (S.mig.leftPos ? '(+)극' : '(−)극') + ', 오른쪽 ' + (S.mig.leftPos ? '(−)극' : '(+)극'));
  }
  // 양이온(구리 이온)은 (−)극 쪽으로, 음이온(과망가니즈산 이온)은 (+)극 쪽으로
  const dirCu = () => (S.mig.leftPos ? 1 : -1);
  function stepMig(dt) {
    const m = S.mig;
    if (!m.on) return;
    m.cu = clamp(m.cu + dirCu() * SPEED * dt, -MAXD, MAXD);
    m.mn = clamp(m.mn - dirCu() * SPEED * dt, -MAXD, MAXD);
  }
  function setScene(sc) {
    S.scene = sc;
    document.body.classList.toggle('scene-move', sc === 'move');
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    S.drag = null;
  }

  /* ---------- 끌기 / 누르기 ---------- */
  function hitElectron(p) {
    let best = -1, bd = 26;
    S.electrons.forEach((el, i) => { const d = Math.hypot(el.x - p.x, el.y - p.y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  SciSim.pointer(view, {
    hover(p) {
      if (S.scene === 'move') return inRect(p, PSU) ? 'pointer' : null;
      if (!on('ebin')) return null;
      return inRect(p, EBIN) || hitElectron(p) >= 0 ? 'grab' : null;
    },
    down(p, ev) {
      if (S.scene === 'move') { if (inRect(p, PSU)) setPower(!S.mig.on); return false; }
      if (!on('ebin')) return false;
      if (S.flying.length > 30) S.flying = [];
      const off = ev && ev.pointerType === 'touch' ? -26 : 0;
      if (inRect(p, EBIN)) {
        if (ne() >= MAX_E) { toast('전자는 ' + MAX_E + '개까지 넣을 수 있어요'); return false; }
        S.drag = { from: 'bin', x: p.x, y: p.y + off, off };
      } else {
        const ei = hitElectron(p);
        if (ei < 0) { if (Math.hypot(p.x - C.x, p.y - C.y) <= nucleusR() + 14) nucleusLocked(); return false; }
        S.electrons.splice(ei, 1);
        S.drag = { from: 'atom', x: p.x, y: p.y + off, off };
      }
      hideHint();
      view.canvas.style.cursor = 'grabbing';
      Sound.tone(440, 0.04, 'triangle', 0.05);
      return true;
    },
    move(p) { if (S.drag) { S.drag.x = p.x; S.drag.y = p.y + S.drag.off; } },
    up() {
      const d = S.drag;
      if (!d) return;
      S.drag = null;
      view.canvas.style.cursor = 'grab';
      const pt = { x: clamp(d.x, 0, 800), y: clamp(d.y, 0, 520) };
      if (inAtom(pt)) addElectron(pt.x, pt.y);
      else { flyToBin(pt.x, pt.y); if (d.from === 'atom') Sound.tone(330, 0.07, 'triangle', 0.06); }
    },
  });

  /* ---------- 갱신 ---------- */
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  function step(dt) {
    S.time += dt;
    stepMig(dt);
    for (let k = 0; k < 4; k++) S.phase[k] += SHELL_SPEED[k] * dt;
    relax(2);
    S.nucleons.forEach((q, i) => {
      q.x = C.x + q.hx + 0.5 * Math.sin(S.time * 2.2 + i * 1.7);
      q.y = C.y + q.hy + 0.5 * Math.cos(S.time * 1.9 + i);
    });
    const n = S.electrons.length;
    S.electrons.forEach((el, i) => {
      const s = slot(i, n);
      if (el.key !== s.key) { if (el.key !== null) { el.sx = el.x; el.sy = el.y; el.t = 0; el.dur = 0.32; } el.key = s.key; }
      el.t = Math.min(1, el.t + dt / el.dur);
      const k = ease(el.t);
      el.x = lerp(el.sx, s.x, k); el.y = lerp(el.sy, s.y, k);
      if (el.fresh && el.t >= 1) { el.fresh = false; S.pulses.push({ x: el.x, y: el.y, t: 0 }); Sound.tick(); }
    });
    if (n) {
      const d = S.ringR + 20, ax = Math.min(590, C.x + d * 0.74) + 16, ay = Math.min(446, C.y + d * 0.68);
      let best = null, bd = Infinity;
      S.electrons.forEach((el) => { const dd = Math.hypot(el.x - ax, el.y - ay); if (dd < bd) { bd = dd; best = el; } });
      if (!S.ePt) S.ePt = { x: best.x, y: best.y };
      const k = Math.min(1, dt * 9);
      S.ePt.x += (best.x - S.ePt.x) * k; S.ePt.y += (best.y - S.ePt.y) * k;
    } else S.ePt = null;
    S.flying.forEach((f) => { f.t += dt / 0.35; });
    S.flying = S.flying.filter((f) => f.t < 1);
    S.pulses.forEach((pl) => { pl.t += dt / 0.45; });
    S.pulses = S.pulses.filter((pl) => pl.t < 1);

    const p = np(), e = ne();
    S.needle += (p - e - S.needle) * Math.min(1, dt * 7);
    S.ringR += (outerR() + 18 - S.ringR) * Math.min(1, dt * 6);
    if (e !== S.lastE || p !== S.lastP) {
      if (p === S.lastP) {
        S.idFlash = { t0: S.time };
        if (on('ion')) S.banner = { text: '🔒 전자 수만 바뀌었어요 → 원소는 그대로 ‘' + identify(p, e).name + '’', color: COL.good, t0: S.time };
      }
      S.lastP = p; S.lastE = e;
      updateUI();
    }
  }

  /* ---------- 그리기 도우미 ---------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function font(size, bold) { return (bold ? 'bold ' : '') + size + 'px ' + FONT; }
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function cardBg(b) {
    ctx.save(); ctx.shadowColor = 'rgba(20,40,80,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.restore();
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5; roundRect(b.x, b.y, b.w, b.h, 14); ctx.stroke();
  }
  function newRing(b) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.35 + a * 0.5); ctx.lineWidth = 4;
    roundRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10, 17); ctx.stroke();
    const bx = Math.min(b.x + b.w - 44, 800 - 54), by = Math.max(b.y - 12, 2);
    ctx.fillStyle = COL.sub; roundRect(bx, by, 50, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(13, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NEW', bx + 25, by + 12);
    ctx.restore();
  }
  function focusRing() {
    const f = S.focus;
    if (!f) return;
    const age = S.time - f.t0;
    if (age > 4) { S.focus = null; return; }
    const b = { e: EBIN, card: CARD1, meter: CARD2, psu: PSU, strip: STRIP }[f.what];
    if (!b) return;
    const a = (0.5 + 0.5 * Math.sin(age * 9)) * (age > 3.4 ? (4 - age) / 0.6 : 1);
    ctx.save(); ctx.strokeStyle = rgba(COL.warn, 0.25 + 0.65 * a); ctx.lineWidth = 5;
    roundRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12, 18); ctx.stroke(); ctx.restore();
  }
  function drawBall(x, y, kind, scale, alpha) {
    const r = (kind === 'e' ? ER : NR) * (scale || 1);
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (kind === 'p') { g.addColorStop(0, '#ffb6b6'); g.addColorStop(0.55, '#e2464b'); g.addColorStop(1, '#a8222a'); }
    else if (kind === 'n') { g.addColorStop(0, '#f4f6f9'); g.addColorStop(0.55, '#a6afbd'); g.addColorStop(1, '#6b7486'); }
    else { g.addColorStop(0, '#b8d0ff'); g.addColorStop(0.55, '#3867f4'); g.addColorStop(1, '#1f3fa8'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (kind !== 'n') {
      ctx.fillStyle = '#fff'; ctx.font = font(Math.round(14 * (scale || 1)), true);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(kind === 'p' ? '+' : MINUS, x, y + 1);
    }
    ctx.restore();
  }
  // 원소 기호 + 위첨자 전하
  function formulaWidth(sym, q, size) {
    ctx.font = font(size, true);
    let w = ctx.measureText(sym).width;
    if (q) { ctx.font = font(Math.round(size * 0.52), true); w += size * 0.05 + ctx.measureText(chargeSup(q)).width; }
    return w;
  }
  function drawFormula(sym, q, x, y, size, color, supColor, align) {
    const w = formulaWidth(sym, q, size);
    const left = align === 'left' ? x : x - w / 2;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = font(size, true); ctx.fillStyle = color; ctx.fillText(sym, left, y);
    if (q) {
      const sw = ctx.measureText(sym).width;
      ctx.font = font(Math.round(size * 0.52), true); ctx.fillStyle = supColor || color;
      ctx.fillText(chargeSup(q), left + sw + size * 0.05, y - size * 0.42);
    }
    return w;
  }
  // 화학식 조각 그리기: [['MnO'], ['4','sub'], ['−','sup']]
  function chem(parts, x, y, size, color, align) {
    const widths = parts.map(([t, k]) => { ctx.font = font(k ? Math.round(size * 0.62) : size, true); return ctx.measureText(t).width; });
    const total = widths.reduce((a, b) => a + b, 0);
    let cx = align === 'center' ? x - total / 2 : x;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
    parts.forEach(([t, k], i) => {
      ctx.font = font(k ? Math.round(size * 0.62) : size, true);
      ctx.fillText(t, cx, k === 'sub' ? y + size * 0.22 : k === 'sup' ? y - size * 0.42 : y);
      cx += widths[i];
    });
    return total;
  }

  /* ---------- 그리기: 원자 → 이온 ---------- */
  function drawAtomScene() {
    const p = np(), e = ne(), q = p - e, id = identify(p, e);
    drawAtom(q);
    if (on('meter') && !S.drag) drawLabels(p, e);
    if (on('ebin')) drawBin();
    drawIdCard(CARD1, id);
    if (isNew('ion')) newRing(CARD1);
    if (on('meter')) { drawMeter(CARD2, p, e); if (isNew('meter')) newRing(CARD2); }
    drawTarget(p, e);
    drawBanner();
    S.flying.forEach((f) => { const k = ease(f.t); drawBall(lerp(f.x0, f.x1, k), lerp(f.y0, f.y1, k), 'e', 1 - 0.3 * k, 1 - f.t * 0.8); });
    if (S.drag) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      drawBall(S.drag.x, S.drag.y, 'e', 1.3); ctx.restore();
    }
  }
  function drawAtom(q) {
    const ringR = S.ringR;
    const bg = ctx.createRadialGradient(C.x, C.y, 10, C.x, C.y, ringR + 6);
    bg.addColorStop(0, '#f7f9ff'); bg.addColorStop(1, '#eef3fb');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(C.x, C.y, ringR + 6, 0, Math.PI * 2); ctx.fill();
    if (on('ion') && q !== 0) {
      // 이온 빛: 양이온은 붉은빛, 음이온은 푸른빛 (부드러운 빛만)
      const col = q > 0 ? COL.p : COL.e, a = clamp(0.2 + 0.1 * Math.abs(q), 0.2, 0.5);
      const g = ctx.createRadialGradient(C.x, C.y, ringR - 30, C.x, C.y, ringR + 18);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.62, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C.x, C.y, ringR + 18, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = q === 0 ? 'rgba(20,160,88,.4)' : 'rgba(93,104,121,.22)'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]);
      ctx.beginPath(); ctx.arc(C.x, C.y, ringR, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (S.drag) {
      const intoAtom = S.drag.from === 'bin', over = inAtom(S.drag);
      ctx.save(); ctx.setLineDash([9, 7]);
      ctx.strokeStyle = intoAtom ? rgba(COL.e, over ? 0.9 : 0.5) : 'rgba(93,104,121,.45)';
      ctx.lineWidth = intoAtom && over ? 3 : 2;
      ctx.fillStyle = intoAtom ? rgba(COL.e, over ? 0.07 : 0.03) : 'rgba(0,0,0,0)';
      ctx.beginPath(); ctx.arc(C.x, C.y, ATOM_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
      const label = intoAtom ? '이 원 안에 놓으면 전자를 얻어요' : '원 밖으로 끌어내면 전자를 잃어요';
      ctx.font = font(14, true);
      const tw = ctx.measureText(label).width + 22, ly = C.y + ATOM_R - 10;
      ctx.fillStyle = intoAtom ? COL.e : '#5d6879';
      roundRect(C.x - tw / 2, ly - 13, tw, 26, 13); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, C.x, ly + 1);
    }
    const used = shellsUsed(S.electrons.length);
    for (let k = 0; k < used; k++) {
      ctx.strokeStyle = 'rgba(56,103,244,.28)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(C.x, C.y, SHELL_R[k], 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
    const nr = nucleusR();
    const ng = ctx.createRadialGradient(C.x, C.y, 2, C.x, C.y, nr + 12);
    ng.addColorStop(0, 'rgba(255,205,205,.6)'); ng.addColorStop(1, 'rgba(255,205,205,0)');
    ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(C.x, C.y, nr + 12, 0, Math.PI * 2); ctx.fill();
    S.nucleons.slice().sort((a, b) => a.y - b.y).forEach((q2) => drawBall(q2.x, q2.y, q2.type, 1));
    S.electrons.forEach((el) => drawBall(el.x, el.y, 'e', el.t < 1 ? 1.15 - 0.15 * el.t : 1));
    S.pulses.forEach((pl) => {
      ctx.strokeStyle = rgba(COL.e, (1 - pl.t) * 0.8); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pl.x, pl.y, 10 + pl.t * 18, 0, Math.PI * 2); ctx.stroke();
    });
  }
  function tag(x, y, text, col) {
    ctx.font = font(14, true);
    const w = ctx.measureText(text).width + 22, h = 28;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
    roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + 1); ctx.textBaseline = 'alphabetic';
  }
  function leader(x0, y0, x1, y1, col, gap) {
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ex = x1 - (x1 - x0) / d * gap, ey = y1 - (y1 - y0) / d * gap;
    ctx.strokeStyle = rgba(col, 0.75); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  function drawLabels(p, e) {
    const pc = '#c4313a', ec = '#2a52d6';
    const nt = '원자핵 +' + p, et = e > 0 && S.ePt ? '전자 ' + e + '개 · ' + MINUS + e : '';
    const d = S.ringR + 20;
    ctx.font = font(14, true);
    const nw = ctx.measureText(nt).width + 22, ew = et ? ctx.measureText(et).width + 22 : 0;
    const nb = { x: Math.max(158, C.x - d * 0.74 - nw), y: Math.max(48, C.y - d * 0.68 - 28), w: nw, h: 28 };
    const eb = { x: Math.min(590 - ew, C.x + d * 0.74), y: Math.min(446, C.y + d * 0.68) };
    const nr = nucleusR(), sx = nb.x + nb.w - 16, sy = nb.y + nb.h, ang = Math.atan2(sy - C.y, sx - C.x);
    leader(sx, sy, C.x + Math.cos(ang) * nr, C.y + Math.sin(ang) * nr, pc, 2);
    tag(nb.x, nb.y, nt, pc);
    if (et) { leader(eb.x + 16, eb.y, S.ePt.x, S.ePt.y, ec, ER + 2); tag(eb.x, eb.y, et, ec); }
  }
  function drawBin() {
    const b = EBIN, dropHere = S.drag && S.drag.from === 'atom', over = dropHere && inRect(S.drag, b), full = ne() >= MAX_E;
    ctx.save();
    if (dropHere) { ctx.shadowColor = rgba(COL.e, 0.5); ctx.shadowBlur = over ? 22 : 12; }
    ctx.fillStyle = '#f0f4ff'; roundRect(b.x, b.y, b.w, b.h, 16); ctx.fill(); ctx.restore();
    ctx.strokeStyle = rgba(COL.e, dropHere ? 0.95 : 0.35); ctx.lineWidth = dropHere ? 3 : 2;
    if (dropHere) ctx.setLineDash([7, 5]);
    roundRect(b.x, b.y, b.w, b.h, 16); ctx.stroke(); ctx.setLineDash([]);
    const cx = b.x + b.w / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.e; ctx.font = font(17, true); ctx.fillText('전자 상자', cx, b.y + 28);
    ctx.fillStyle = COL.muted; ctx.font = font(14, true); ctx.fillText('(−)전하', cx, b.y + 48);
    [[-30, -10, 10, 30], [-20, 0, 20], [-10, 10]].forEach((row, ri) => row.forEach((dx) => drawBall(cx + dx, b.y + 124 - ri * 17, 'e', 1, full ? 0.3 : 1)));
    ctx.font = font(14, true); ctx.fillStyle = dropHere ? COL.e : COL.muted; ctx.textAlign = 'center';
    ctx.fillText(dropHere ? '여기에 놓아 빼기' : full ? '최대 개수예요' : '끌어서 넣기 ▶', cx, b.y + b.h - 14);
    if (isNew('ebin')) newRing(b);
  }
  function drawIdCard(c, id) {
    const cx = c.x + c.w / 2, ion = on('ion'), K = KIND[id.kind];
    cardBg(c);
    ctx.save(); roundRect(c.x, c.y, c.w, c.h, 14); ctx.clip();
    ctx.fillStyle = ion ? K.c : COL.sub; ctx.fillRect(c.x, c.y, c.w, 34); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = font(15, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ion ? K.band : '🏷️ 원소 카드', cx, c.y + 18);
    const f = S.idFlash, flashing = f && S.time - f.t0 < 1.6;
    if (flashing && ion) {
      const a = 1 - (S.time - f.t0) / 1.6;
      ctx.fillStyle = rgba(COL.good, 0.16 * a + 0.04); ctx.strokeStyle = rgba(COL.good, 0.9 * a); ctx.lineWidth = 2.5;
      roundRect(c.x + 10, c.y + 44, c.w - 20, 132, 12); ctx.fill(); ctx.stroke();
    }
    const qs = ion ? id.q : 0;
    let size = 58;
    while (formulaWidth(id.sym, qs, size) > c.w - 30 && size > 30) size -= 2;
    drawFormula(id.sym, qs, cx, c.y + 102, size, COL.ink, K.c);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.ink; ctx.font = font(21, true); ctx.fillText(id.name, cx, c.y + 136);
    ctx.fillStyle = COL.muted; ctx.font = font(14, true);
    ctx.fillText((flashing && ion ? '🔒 ' : '') + '양성자 ' + id.p + '개인 원소', cx, c.y + 160);
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c.x + 14, c.y + 184); ctx.lineTo(c.x + c.w - 14, c.y + 184); ctx.stroke();
    const big = (t, col) => { ctx.fillStyle = col; ctx.font = font(19, true); ctx.fillText(t, cx, c.y + 212); };
    const small = (t) => { ctx.fillStyle = COL.muted; ctx.font = font(13, true); ctx.fillText(t, cx, c.y + 234); };
    if (id.q === 0) { big(id.name + ' 원자', COL.good); small('전기적으로 중성'); }
    else if (ion) { big(K.short, K.c); small(id.q > 0 ? '원자가 전자 ' + id.q + '개를 잃음' : '원자가 전자 ' + (-id.q) + '개를 얻음'); }
    else { big('전체 전하 ' + signed(id.q), COL.warn); small('🔒 2단계에서 알아봐요'); }
  }
  function drawMeter(c, p, e) {
    const cx = c.x + c.w / 2, q = p - e;
    cardBg(c);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    ctx.fillStyle = COL.ink; ctx.font = font(16, true); ctx.fillText('⚖️ 전체 전하', cx, c.y + 24);
    const gx = cx, gy = c.y + 110, r = 58;
    const ang = (v) => Math.PI * 1.5 + (clamp(v, -MAXQ - 0.4, MAXQ + 0.4) / MAXQ) * Math.PI * 0.5;
    ctx.lineCap = 'butt'; ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(56,103,244,.75)'; ctx.beginPath(); ctx.arc(gx, gy, r, ang(-MAXQ), ang(-0.3)); ctx.stroke();
    ctx.strokeStyle = 'rgba(226,70,75,.8)'; ctx.beginPath(); ctx.arc(gx, gy, r, ang(0.3), ang(MAXQ)); ctx.stroke();
    ctx.strokeStyle = COL.good; ctx.beginPath(); ctx.arc(gx, gy, r, ang(-0.3), ang(0.3)); ctx.stroke();
    for (let v = -MAXQ; v <= MAXQ; v++) {
      const a = ang(v);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * (r - 7), gy + Math.sin(a) * (r - 7)); ctx.lineTo(gx + Math.cos(a) * (r + 7), gy + Math.sin(a) * (r + 7)); ctx.stroke();
      if (v % 2 === 0) {
        ctx.fillStyle = v > 0 ? '#c4313a' : v < 0 ? '#2a52d6' : '#0f8a4b';
        ctx.font = font(13, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(signed(v), gx + Math.cos(a) * (r + 18), gy + Math.sin(a) * (r + 16));
      }
    }
    ctx.textBaseline = 'alphabetic'; ctx.font = font(13, true); ctx.textAlign = 'center';
    const negL = on('ion') ? '음이온' : '(−)가 많음', posL = on('ion') ? '양이온' : '(+)가 많음';
    if (q < -MAXQ) { ctx.fillStyle = '#2a52d6'; ctx.fillText('◀ 범위 넘음', gx - 42, gy + 20); } else { ctx.fillStyle = COL.muted; ctx.fillText(negL, gx - 42, gy + 20); }
    if (q > MAXQ) { ctx.fillStyle = '#c4313a'; ctx.fillText('범위 넘음 ▶', gx + 42, gy + 20); } else { ctx.fillStyle = COL.muted; ctx.fillText(posL, gx + 42, gy + 20); }
    const a = ang(S.needle);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * (r - 14), gy + Math.sin(a) * (r - 14)); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(gx, gy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = q > 0 ? '#c4313a' : q < 0 ? '#2a52d6' : '#0f8a4b'; ctx.font = font(30, true);
    ctx.fillText(signed(q), gx, gy + 54);
    ctx.font = font(14, true);
    ctx.textAlign = 'right'; ctx.fillStyle = '#c4313a'; ctx.fillText('양성자 +' + p, gx - 8, c.y + c.h - 14);
    ctx.textAlign = 'left'; ctx.fillStyle = '#2a52d6'; ctx.fillText('전자 ' + (e ? MINUS + e : '0'), gx + 8, c.y + c.h - 14);
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx, c.y + c.h - 29); ctx.lineTo(gx, c.y + c.h - 11); ctx.stroke();
  }
  function drawTarget(p, e) {
    const T = S.target;
    if (!T) return;
    const ok = p === T.p && e === T.e, tid = identify(T.p, T.e), showF = T.formula && on('ion');
    const pre = ok ? '✔ 목표 달성: ' : '🎯 목표: ';
    ctx.font = font(15, true);
    const w1 = ctx.measureText(pre).width, wf = showF ? formulaWidth(tid.sym, tid.q, 19) + 8 : 0;
    ctx.font = font(15, true);
    const w3 = ctx.measureText(T.text).width, tw = w1 + wf + w3 + 28, x = C.x - tw / 2, y = 8, h = 32;
    ctx.fillStyle = ok ? COL.good : '#fff'; ctx.strokeStyle = ok ? COL.good : COL.sub; ctx.lineWidth = 2;
    roundRect(x, y, tw, h, 16); ctx.fill(); ctx.stroke();
    const tc = ok ? '#fff' : '#5b37c9';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = font(15, true); ctx.fillStyle = tc;
    ctx.fillText(pre, x + 14, y + 22);
    if (showF) drawFormula(tid.sym, tid.q, x + 14 + w1, y + 23, 19, tc, tc, 'left');
    ctx.textAlign = 'left'; ctx.font = font(15, true); ctx.fillStyle = tc;
    ctx.fillText(T.text, x + 14 + w1 + wf, y + 22);
  }
  function drawBanner() {
    const b = S.banner;
    if (!b) return;
    const age = S.time - b.t0;
    if (age > 2.8) { S.banner = null; return; }
    const a = age < 0.15 ? age / 0.15 : age > 2.4 ? (2.8 - age) / 0.4 : 1;
    ctx.font = font(15, true);
    const tw = ctx.measureText(b.text).width + 26, y = 484 + (1 - a) * 8;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = b.color; roundRect(C.x - tw / 2, y, tw, 30, 15); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, C.x, y + 16);
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }

  /* ---------- 그리기: 이온의 이동 실험 ---------- */
  function drawMoveScene() {
    const m = S.mig, leftPos = m.leftPos;
    const L = { x: STRIP.x - 6, y: STRIP.y - 12 }, R = { x: STRIP.x + STRIP.w - 22, y: STRIP.y - 12 };
    const posClip = leftPos ? L : R, negClip = leftPos ? R : L;
    // 전원 장치
    cardBg(PSU);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.ink; ctx.font = font(16, true); ctx.fillText('전원 장치', PSU.x + 92, PSU.y + 30);
    ctx.fillStyle = COL.muted; ctx.font = font(13, true); ctx.fillText(m.on ? '켜짐 (눌러서 끄기)' : '꺼짐 (눌러서 켜기)', PSU.x + 92, PSU.y + 52);
    const lx = PSU.x + PSU.w - 26, ly = PSU.y + 34;
    if (m.on) { const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 22); g.addColorStop(0, 'rgba(20,200,90,.9)'); g.addColorStop(1, 'rgba(20,200,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 22, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = m.on ? '#14c35a' : '#c9d1dd'; ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fill();
    const tp = { x: PSU.x + 40, y: PSU.y + PSU.h }, tn = { x: PSU.x + PSU.w - 40, y: PSU.y + PSU.h };
    // 전선
    const wire = (from, to, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.bezierCurveTo(from.x, from.y + 60, to.x + 11, to.y - 70, to.x + 11, to.y); ctx.stroke();
      ctx.lineCap = 'butt';
    };
    wire(tp, posClip, '#d0343a'); wire(tn, negClip, '#2b3445');
    [[tp, '#d0343a', '+'], [tn, '#2b3445', MINUS]].forEach(([t, col, s]) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(t.x, t.y - 4, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = font(17, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, t.x, t.y - 3);
    });
    ctx.textBaseline = 'alphabetic';
    if (isNew('move')) newRing(PSU);
    // 유리판 + 거름종이
    ctx.fillStyle = 'rgba(200,225,240,.45)'; ctx.strokeStyle = 'rgba(120,160,190,.6)'; ctx.lineWidth = 2;
    roundRect(PLATE.x, PLATE.y, PLATE.w, PLATE.h, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbfaf5'; ctx.strokeStyle = '#e1ddd0'; ctx.lineWidth = 1.5;
    roundRect(STRIP.x, STRIP.y, STRIP.w, STRIP.h, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.muted; ctx.font = font(13, true); ctx.textAlign = 'center';
    ctx.fillText('질산 칼륨 수용액을 적신 거름종이', MID, PLATE.y + PLATE.h - 10);
    // 색 띠 (이동 자취 + 현재 위치)
    const sy = STRIP.y + STRIP.h / 2;
    const band = (disp, col) => {
      const x = MID + disp;
      const g = ctx.createLinearGradient(MID, 0, x, 0);
      g.addColorStop(0, rgba(col, 0.04)); g.addColorStop(1, rgba(col, 0.28));
      ctx.fillStyle = g; ctx.fillRect(Math.min(MID, x), sy - 18, Math.abs(disp), 36);
      const rg = ctx.createRadialGradient(x, sy, 2, x, sy, 30);
      rg.addColorStop(0, rgba(col, 0.85)); rg.addColorStop(0.6, rgba(col, 0.55)); rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(x, sy, 32, 26, 0, 0, Math.PI * 2); ctx.fill();
    };
    band(m.mn, COL.mn); band(m.cu, COL.cu);
    if (m.on) {
      const arrow = (disp, dir, col) => {
        const x = MID + disp + dir * 40, y = STRIP.y + STRIP.h - 12;
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - dir * 16, y); ctx.lineTo(x + dir * 6, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + dir * 14, y); ctx.lineTo(x + dir * 4, y - 6); ctx.lineTo(x + dir * 4, y + 6); ctx.closePath(); ctx.fill();
      };
      if (Math.abs(m.cu) < MAXD) arrow(m.cu, dirCu(), COL.cu);
      if (Math.abs(m.mn) < MAXD) arrow(m.mn, -dirCu(), COL.mn);
    }
    // 전극(집게)
    [[L, leftPos], [R, !leftPos]].forEach(([clip, isPos]) => {
      ctx.fillStyle = '#6b7486'; roundRect(clip.x, clip.y, 28, STRIP.h + 24, 5); ctx.fill();
      ctx.fillStyle = '#9aa3b2'; ctx.fillRect(clip.x + 5, clip.y + 6, 18, STRIP.h + 12);
      const col = isPos ? "#d0343a" : "#2b3445", lx2 = clip.x + 14, ly2 = PLATE.y + PLATE.h - 17;
      ctx.fillStyle = col; roundRect(lx2 - 32, ly2 - 14, 64, 26, 13); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = font(15, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(isPos ? '(+)극' : '(−)극', lx2, ly2);
      ctx.textBaseline = 'alphabetic';
    });
    drawPanel();
    focusRing();
  }
  // 입자 모형으로 보기
  function drawPanel() {
    const P = PANEL, m = S.mig;
    ctx.fillStyle = '#f7f9fd'; ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5;
    roundRect(P.x, P.y, P.w, P.h, 12); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.ink; ctx.font = font(15, true); ctx.fillText('🔍 입자 모형으로 보면', P.x + 14, P.y + 24);
    // 범례
    let lx = P.x + 220;
    ionBall(lx, P.y + 19, 'cu', 0.75); lx += 16;
    lx += chem([['구리 이온 Cu'], ['2+', 'sup']], lx, P.y + 25, 14, COL.cu) + 22;
    ionBall(lx, P.y + 19, 'mn', 0.75); lx += 16;
    chem([['과망가니즈산 이온 MnO'], ['4', 'sub'], [MINUS, 'sup']], lx, P.y + 25, 14, COL.mn);
    // 양쪽 전극
    [[P.x + 8, m.leftPos], [P.x + P.w - 18, !m.leftPos]].forEach(([x, isPos]) => {
      ctx.fillStyle = isPos ? 'rgba(208,52,58,.85)' : 'rgba(43,52,69,.85)';
      roundRect(x, P.y + 38, 10, P.h - 48, 5); ctx.fill();
      ctx.fillStyle = isPos ? '#c4313a' : '#2b3445'; ctx.font = font(15, true); ctx.textAlign = 'center';
      ctx.fillText(isPos ? '+' : MINUS, x + 5 + (x < MID ? 18 : -18), P.y + P.h / 2 + 12);
    });
    ctx.save(); roundRect(P.x + 20, P.y + 34, P.w - 40, P.h - 40, 8); ctx.clip();
    m.ions.forEach((ion) => {
      const disp = ion.kind === 'cu' ? m.cu : m.mn;
      const jx = 4 * Math.sin(S.time * 3.1 + ion.ph), jy = 3 * Math.cos(S.time * 2.7 + ion.ph * 1.3);
      const x = clamp(MID + disp * 0.9 + ion.ox + jx, P.x + 44, P.x + P.w - 44);
      ionBall(x, ion.oy + jy, ion.kind, 1);
    });
    ctx.restore();
    ctx.textAlign = 'left';
  }
  function ionBall(x, y, kind, s) {
    const r = 15 * s, col = kind === 'cu' ? COL.cu : COL.mn;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, kind === 'cu' ? '#9fd0ff' : '#e3b5f5'); g.addColorStop(0.6, col); g.addColorStop(1, kind === 'cu' ? '#0f4f9e' : '#5e1a7c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (s >= 1) {
      ctx.fillStyle = '#fff'; ctx.font = font(kind === 'cu' ? 13 : 17, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(kind === 'cu' ? '2+' : MINUS, x, y + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  function draw() {
    view.clear('#ffffff');
    if (S.scene === 'move') drawMoveScene();
    else { drawAtomScene(); focusRing(); }
  }

  /* ---------- DOM ---------- */
  const rP = $('#rP'), rE = $('#rE'), rQ = $('#rQ'), rK = $('#rK'), oE = $('#oE');
  let uiKey = '';
  function updateUI(force) {
    const p = np(), e = ne(), key = p + ':' + e;
    if (!force && key === uiKey) return;
    uiKey = key;
    const id = identify(p, e);
    rP.innerHTML = p + '<small>개 (+' + p + ')</small>';
    rE.innerHTML = e + '<small>개 (' + (e ? MINUS + e : '0') + ')</small>';
    rQ.textContent = signed(id.q);
    rQ.className = 'value ' + (id.q > 0 ? 'q-pos' : id.q < 0 ? 'q-neg' : 'q-zero');
    rK.innerHTML = KIND[id.kind].short + ' <small>' + formulaHTML(id.sym, id.q) + '</small>';
    oE.textContent = e;
    $('#eMinus').disabled = e <= 0; $('#ePlus').disabled = e >= MAX_E;
  }
  function updateMoveUI() {
    const pb = $('#powerBtn');
    pb.textContent = S.mig.on ? '⏻ 전원 끄기' : '⚡ 전원 켜기';
    pb.classList.toggle('on', S.mig.on);
  }
  function sideNote() {
    if (on('picker')) return '💡 원자를 골라 전자를 잃게 하거나 얻게 해 보세요. 원자핵은 그대로예요.';
    if (on('ion')) return '💡 전자를 <b>잃으면 양이온</b>이 돼요. 원자핵(양성자 수)은 그대로!';
    return '💡 전자를 원 안에 끌어다 놓으면 들어가고, 원 밖으로 끌어내면 빠져요.';
  }

  $('#ePlus').addEventListener('click', plusE);
  $('#eMinus').addEventListener('click', minusE);
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetCurrent(); });
  $$('#pickSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); hideHint(); const z = +b.dataset.z; setState(z, z); }));
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#powerBtn').addEventListener('click', () => setPower(!S.mig.on));
  $('#swapBtn').addEventListener('click', swapPoles);
  $('#paperBtn').addEventListener('click', () => { Sound.click(); resetPaper(); });

  /* ---------- 미션 도우미 ---------- */
  const is = (p, e) => np() === p && ne() === e;
  function setTarget(p, e, text, formula) { S.target = { p, e, text, formula: !!formula }; }
  function statusLine() {
    const p = np(), e = ne(), id = identify(p, e);
    let s = identify(p, e).name + ': 양성자 <b>' + p + '</b>개 · 전자 <b>' + e + '</b>개 → 전체 전하 <b>' + signed(id.q) + '</b>';
    if (on('ion')) s += ' (' + (id.q === 0 ? '원자' : '<b>' + formulaHTML(id.sym, id.q) + '</b> ' + KIND[id.kind].short) + ')';
    return s;
  }
  const atomMission = (p, e0, e1, text) => () => { setScene('atom'); setState(p, e0); setTarget(p, e1, text, true); };
  const moveStatus = () => {
    const m = S.mig;
    const where = (d) => (Math.abs(d) < 8 ? '가운데' : (d < 0 ? '왼쪽' : '오른쪽') + '으로 ' + Math.round(Math.abs(d) / 4) + ' mm');
    return '전원 <b>' + (m.on ? '켜짐' : '꺼짐') + '</b> · 왼쪽 ' + (m.leftPos ? '(+)극' : '(−)극') + ' / 오른쪽 ' + (m.leftPos ? '(−)극' : '(+)극') +
      '<br>파란색: <b>' + where(m.cu) + '</b> · 보라색: <b>' + where(m.mn) + '</b>';
  };

  /* ---------- 탐구 단계 ---------- */
  const LEVELS = [
    {
      title: '중성 원자', short: '중성 원자', icon: '⚛️', phase: '관찰',
      features: ['ebin', 'meter'],
      intro: '<p>❓ <b>탐구 질문: 전기적으로 중성인 원자가 전자를 잃거나 얻으면 어떻게 될까?</b></p>' +
        '<p>먼저 <b>나트륨 원자</b>를 살펴봐요. 원자핵에는 양성자 11개(+11)가 있고, 원자는 전기적으로 중성이었죠?</p>',
      setup() { setScene('atom'); setState(11, 8); showHint('👆 전자 상자에서 전자를 끌어 원자에 넣어 보세요', 6000); },
      recap: '나트륨 원자는 양성자 11개와 전자 11개의 전하량이 같아 <b>전기적으로 중성</b>이에요.',
      summary: '<span class="formula">양성자 수 = 전자 수 → 원자는 전기적으로 중성</span>' +
        '<ul><li>원자는 (+)전하를 띤 원자핵과 (−)전하를 띤 전자로 이루어져 있다.</li>' +
        '<li>원자 속 (+)전하량과 (−)전하량이 같다. 예: 나트륨 원자 (+11) + (−11) = 0</li></ul>',
      missions: [
        {
          title: '나트륨 원자 완성하기',
          goal: '나트륨의 원자핵(+11) 주위에 전자가 8개뿐이에요. 전자를 넣어 <b>중성 원자</b>를 완성하세요.',
          hint: '파란 <b>전자 상자</b>에서 전자를 끌어 원 안에 놓아요. 전자 <b>+</b> 버튼도 돼요. 계기판이 0이 될 때까지!',
          focus: 'e',
          setup() { setScene('atom'); setState(11, 8); setTarget(11, 11, '나트륨 원자 (전체 전하 0)'); },
          check: () => is(11, 11),
          status: () => statusLine() + (ne() > 11 ? '<br>⚠️ 전자가 너무 많아요. 중성 원자는 양성자 수 = 전자 수!' : ''),
          hold: 0.6,
          explain: '양성자 11개(+11)와 전자 11개(−11)의 전하량이 같아 전체 전하가 <b>0</b>이에요. 이것이 전기적으로 중성인 <b>나트륨 원자</b>예요.',
        },
        {
          type: 'quiz',
          title: '원자는 왜 중성일까?',
          goal: '나트륨 원자가 전기적으로 중성인 까닭으로 옳은 것은?',
          choices: [
            '원자핵이 전하를 띠지 않기 때문',
            '양성자 11개의 (+)전하량과 전자 11개의 (−)전하량이 같기 때문',
            '중성자가 양성자와 전자의 전하를 없애기 때문',
            '전자가 원자핵 속에 들어가 있기 때문',
          ],
          answer: 1,
          feedback: [
            '원자핵 속 양성자는 (+)전하를 띠어요. 계기판의 ‘양성자 +11’을 보세요.',
            '',
            '중성자는 전하가 없어서 다른 입자의 전하에 영향을 주지 않아요.',
            '전자는 원자핵 <b>바깥</b>, 그 주위를 움직여요.',
          ],
          explain: '원자는 <b>양성자 수 = 전자 수</b>라서 (+)전하량과 (−)전하량이 같아요. 그런데 전자 수가 바뀌면 어떻게 될까요? 다음 단계에서 알아봐요!',
        },
      ],
    },
    {
      title: '전자를 잃으면 → 양이온', short: '양이온', icon: '🔴', phase: '탐구',
      features: ['ion'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원자는 양성자 수와 전자 수가 같아 <b>전기적으로 중성</b>임을 확인했어요.</div>' +
        '<p>그렇다면 원자가 <b>전자를 잃으면</b> 전체 전하는 어떻게 될까요? 원소 카드가 이제 <b>원자 · 양이온 · 음이온</b>을 구별하고, 이온식(예: Na<sup>+</sup>)으로 보여 줘요.</p>',
      setup() { setScene('atom'); setState(11, 11); showHint('👆 바깥쪽 전자 하나를 원 밖으로 끌어내 보세요', 6000); },
      recap: '원자가 <b>전자를 잃으면</b> (+)전하량이 더 많아져 <b>양이온</b>이 돼요. 양성자 수는 그대로라 원소도 그대로예요.',
      summary: '<ul><li>원자가 전자를 <b>잃으면</b> (+)전하량 &gt; (−)전하량 → <b>양이온</b></li>' +
        '<li>Na → Na<sup>+</sup> (전자 1개 잃음), Mg → Mg<sup>2+</sup> (전자 2개 잃음)</li>' +
        '<li>이온이 되어도 양성자 수는 그대로 → 원소의 종류는 변하지 않는다.</li></ul>' +
        '<span class="formula">Na → Na<sup>+</sup> + ⊖</span>' +
        '<p class="note">⊖는 전자를 나타내요. 이온식은 원소 기호 오른쪽 위에 이온의 전하를 써요(1은 생략).</p>',
      missions: [
        {
          title: '나트륨 원자가 전자를 잃으면?',
          goal: '<b>나트륨 원자</b>에서 전자 <b>1개</b>를 떼어 내 보세요. 전체 전하와 원소 카드가 어떻게 바뀌나요?',
          hint: '가장 바깥쪽 전자 1개를 집어 원 <b>밖</b>(전자 상자)으로 끌어내요. 전자 <b>−</b> 버튼도 돼요.',
          focus: 'e',
          setup: atomMission(11, 11, 10, '(전자 1개를 잃은 나트륨)'),
          check: () => is(11, 10),
          status: () => statusLine() + (ne() > 11 ? '<br>🤔 전자를 넣으면 (−)전하가 늘어나요. 이번엔 전자를 <b>잃어</b> 봐요.' : ne() < 10 ? '<br>⚠️ 전자를 너무 많이 뺐어요.' : ''),
          hold: 0.6,
          explain: '전자 1개를 잃자 (+11) + (−10) = <b>+1</b>, (+)전하를 띠는 <b>양이온</b>이 되었어요. 이온식은 <b>Na<sup>+</sup></b>예요. 원자핵은 그대로라 여전히 나트륨이에요.',
        },
        {
          title: '마그네슘 원자는 2개!',
          goal: '<b>마그네슘 원자</b>가 전자 <b>2개</b>를 잃은 이온 <b>Mg<sup>2+</sup></b>를 만들어 보세요.',
          hint: '마그네슘 원자(양성자 12개, 전자 12개)에서 전자 2개를 빼요. 전체 전하가 +2가 되어야 해요.',
          focus: 'e',
          setup: atomMission(12, 12, 10, '(전자 2개를 잃은 마그네슘)'),
          check: () => is(12, 10),
          status: () => statusLine() + (ne() === 11 ? '<br>👍 지금은 +1이에요. 전자를 하나 더 잃어야 해요.' : ne() > 12 ? '<br>🤔 전자를 얻으면 (−)전하가 늘어나요.' : ne() < 10 ? '<br>⚠️ 전자를 너무 많이 뺐어요.' : ''),
          hold: 0.6,
          explain: '마그네슘 원자가 전자 2개를 잃으면 (+12) + (−10) = <b>+2</b>, 이온식은 <b>Mg<sup>2+</sup></b>예요. 오른쪽 위의 <b>2+</b>는 전자 2개를 잃어 (+)전하가 2만큼 많다는 뜻이에요.',
        },
        {
          type: 'quiz',
          title: 'Na<sup>+</sup>도 나트륨일까?',
          goal: '나트륨 원자가 전자를 잃어 Na<sup>+</sup>이 되어도 여전히 ‘나트륨’인 까닭은? (화면의 Na<sup>+</sup>을 살펴보세요)',
          setup() { setScene('atom'); setState(11, 10); },
          choices: [
            '전자 수가 변하지 않았기 때문',
            '양성자도 전자와 함께 1개 줄었기 때문',
            'Na<sup>+</sup>도 전기적으로 중성이기 때문',
            '원자핵 속 양성자 수가 그대로이기 때문',
          ],
          answer: 3,
          feedback: [
            '전자 수는 11개 → 10개로 <b>변했어요</b>. 아래 측정값을 확인해 보세요.',
            '이온이 될 때 양성자 수는 변하지 않아요. 아래 측정값을 보세요: 양성자는 여전히 11개!',
            'Na<sup>+</sup>은 전체 전하가 +1이라 중성이 아니에요.',
            '',
          ],
          explain: '원소의 종류는 <b>양성자 수</b>로 정해져요. 이온이 될 때는 <b>전자만</b> 이동하고 원자핵은 그대로이므로 Na<sup>+</sup>도 나트륨이에요. 그래서 이온식에도 같은 원소 기호 Na를 써요.',
        },
      ],
    },
    {
      title: '전자를 얻으면 → 음이온', short: '음이온', icon: '🔵', phase: '탐구',
      features: ['picker'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원자가 전자를 <b>잃으면 양이온</b>이 된다는 것을 알았어요.</div>' +
        '<p>이번에는 반대로 원자가 <b>전자를 얻으면</b> 어떻게 될까요? <b>원자 고르기</b>로 여러 원자를 골라 실험해 봐요.</p>',
      setup() { setScene('atom'); setState(17, 17); showHint('👆 전자 상자에서 전자를 끌어 원자에 넣어 보세요', 6000); },
      recap: '원자가 <b>전자를 얻으면</b> (−)전하량이 더 많아져 <b>음이온</b>이 돼요. 이때도 양성자 수는 그대로예요.',
      summary: '<ul><li>원자가 전자를 <b>얻으면</b> (−)전하량 &gt; (+)전하량 → <b>음이온</b></li>' +
        '<li>Cl → Cl<sup>−</sup> (전자 1개 얻음), O → O<sup>2−</sup> (전자 2개 얻음)</li></ul>' +
        '<span class="formula">Cl + ⊖ → Cl<sup>−</sup></span>' +
        '<p class="note">⚠️ 이온은 <b>전자</b>를 잃거나 얻어서 생겨요. 양성자를 얻거나 잃는 것이 아니에요!</p>',
      missions: [
        {
          title: '염소 원자가 전자를 얻으면?',
          goal: '<b>염소 원자</b>에 전자 <b>1개</b>를 더해 보세요. 전체 전하와 원소 카드가 어떻게 바뀌나요?',
          hint: '파란 <b>전자 상자</b>에서 전자 1개를 끌어 원자 안에 놓아요.',
          focus: 'e',
          setup: atomMission(17, 17, 18, '(전자 1개를 얻은 염소)'),
          check: () => is(17, 18),
          status: () => statusLine() + (np() !== 17 ? '<br>🔀 원자 고르기에서 <b>Cl</b>을 골라요.' : ne() < 17 ? '<br>🤔 전자를 잃으면 양이온이 돼요. 이번엔 전자를 <b>얻어</b> 봐요.' : ne() > 18 ? '<br>⚠️ 전자를 너무 많이 넣었어요.' : ''),
          hold: 0.6,
          explain: '전자 1개를 얻자 (+17) + (−18) = <b>−1</b>, (−)전하를 띠는 <b>음이온</b>이 되었어요. 이온식은 <b>Cl<sup>−</sup></b>예요. 원자핵은 그대로라 원소는 여전히 염소예요.',
        },
        {
          title: '산소 원자로 O<sup>2−</sup> 만들기',
          goal: '<b>원자 고르기</b>에서 산소(O)를 고른 뒤, 이온 <b>O<sup>2−</sup></b>를 만들어 보세요.',
          hint: '산소 원자(양성자 8개, 전자 8개)에 전자 <b>2개</b>를 더해요. 2−는 전자 2개를 얻었다는 뜻이에요.',
          setup() { setScene('atom'); setState(17, 17); setTarget(8, 10, '(전자 2개를 얻은 산소)', true); showHint('🔀 원자 고르기에서 O를 골라요', 6000); },
          check: () => is(8, 10),
          status: () => {
            if (np() !== 8) return statusLine() + '<br>🔀 <b>원자 고르기</b>에서 <b>O</b>를 골라요.';
            return statusLine() + (ne() === 9 ? '<br>👍 지금은 −1이에요. 전자를 하나 더 얻어야 해요.' : ne() < 8 ? '<br>🤔 전자를 잃으면 양이온이 돼요.' : ne() > 10 ? '<br>⚠️ 전자를 너무 많이 넣었어요.' : '');
          },
          hold: 0.6,
          explain: '산소 원자가 전자 2개를 얻으면 (+8) + (−10) = <b>−2</b>, 이온식은 <b>O<sup>2−</sup></b>예요. 양성자 수 8개는 그대로라 원소는 산소예요.',
        },
        {
          type: 'quiz',
          title: '이온은 어떻게 생길까?',
          goal: '원자가 이온이 되는 과정을 바르게 설명한 것은?',
          choices: [
            '원자가 양성자를 얻으면 양이온이 된다',
            '원자가 전자를 잃으면 음이온이 된다',
            '원자가 전자를 얻으면 음이온이 된다',
            '원자가 중성자를 잃으면 양이온이 된다',
          ],
          answer: 2,
          feedback: [
            '이온이 될 때 원자핵(양성자 수)은 <b>변하지 않아요</b>. 양성자 수가 바뀌면 아예 다른 원소가 돼요!',
            '전자를 <b>잃으면</b> (−)전하가 줄어 (+)전하가 더 많아져요. 그러면 어떤 이온일까요?',
            '',
            '중성자는 전하가 없고, 이온이 될 때 원자핵은 그대로예요.',
          ],
          explain: '이온은 원자가 <b>전자</b>를 잃거나 얻어서 생겨요. 전자를 <b>잃으면 양이온</b>, 전자를 <b>얻으면 음이온</b>이 돼요. 원자핵(양성자, 중성자)은 변하지 않아요.',
        },
      ],
    },
    {
      title: '이온은 전하를 띤다: 이온의 이동', short: '이온의 이동', icon: '🔌', phase: '확인',
      features: ['move'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원자가 전자를 잃으면 <b>양이온</b>, 얻으면 <b>음이온</b>이 된다는 것을 알았어요.</div>' +
        '<p>이온이 정말 전하를 띠고 있는지 <b>전기</b>를 걸어 확인해 봐요. 서로 다른 전하는 끌어당기니까, 이온은 어느 전극 쪽으로 움직일까요?</p>' +
        '<p>거름종이 가운데에 <b>파란색</b> 구리 이온(Cu<sup>2+</sup>)과 <b>보라색</b> 과망가니즈산 이온(MnO<sub>4</sub><sup>−</sup>)이 들어 있는 용액을 떨어뜨렸어요.</p>',
      setup() { setScene('move'); S.mig.leftPos = true; resetPaper(); showHint('⚡ 전원 장치를 눌러 전원을 켜 보세요', 6000); },
      recap: '(+)전하를 띤 양이온은 (−)극으로, (−)전하를 띤 음이온은 (+)극으로 이동해요. <b>이온은 전하를 띠고 있어요.</b>',
      summary: '<ul><li>전원을 연결하면 <b>양이온</b>은 (−)극 쪽으로, <b>음이온</b>은 (+)극 쪽으로 이동한다.</li>' +
        '<li>파란색 구리 이온(Cu<sup>2+</sup>) → (−)극, 보라색 과망가니즈산 이온(MnO<sub>4</sub><sup>−</sup>) → (+)극</li>' +
        '<li>전극을 바꾸면 이동 방향도 바뀐다 → <b>이온은 전하를 띠고 있다.</b></li></ul>' +
        '<p class="note">색이 없는 이온(칼륨 이온, 황산 이온 등)도 함께 이동하지만 눈에 보이지 않아요.</p>',
      missions: [
        {
          title: '전원을 켜고 관찰하기',
          goal: '전원을 켜고 <b>파란색</b>과 <b>보라색</b>이 각각 어느 극 쪽으로 움직이는지 관찰하세요.',
          hint: '캔버스 위쪽 <b>전원 장치</b>를 누르거나 <b>⚡ 전원 켜기</b> 버튼을 눌러요. 잠시 기다리며 지켜봐요.',
          focus: 'psu',
          setup() { setScene('move'); S.mig.leftPos = true; resetPaper(); },
          check: () => S.mig.on && Math.abs(S.mig.cu) >= 100 && Math.abs(S.mig.mn) >= 100,
          status: moveStatus,
          hold: 0.3,
          explain: '파란색(구리 이온 Cu<sup>2+</sup>)은 <b>(−)극</b> 쪽으로, 보라색(과망가니즈산 이온 MnO<sub>4</sub><sup>−</sup>)은 <b>(+)극</b> 쪽으로 이동했어요.',
        },
        {
          type: 'quiz',
          title: '왜 반대쪽으로 갈까?',
          goal: '이 실험 결과를 바르게 설명한 것은?',
          choices: [
            '구리 이온은 (−)전하를 띠어서 (−)극으로 이동했다',
            '구리 이온은 (+)전하를 띠어 (−)극에 끌려가고, 과망가니즈산 이온은 (−)전하를 띠어 (+)극에 끌려갔다',
            '전원을 켜면 물이 한쪽으로 흘러 색이 퍼졌다',
            '전원을 켜면 원자가 새로 이온으로 바뀌어 움직였다',
          ],
          answer: 1,
          feedback: [
            '같은 종류의 전하는 서로 <b>밀어내요</b>. (−)극 쪽으로 끌려간 입자는 어떤 전하를 띨까요?',
            '',
            '물이 흘렀다면 두 색이 같은 방향으로 움직였을 거예요. 두 색은 <b>반대 방향</b>으로 갔어요.',
            '이온은 용액 속에 처음부터 있었어요. 전기는 이미 있는 이온을 끌어당길 뿐이에요.',
          ],
          explain: '서로 다른 전하는 끌어당겨요. (+)전하를 띤 <b>양이온</b>은 (−)극으로, (−)전하를 띤 <b>음이온</b>은 (+)극으로 이동해요. 이온이 <b>전하를 띠고 있다는 증거</b>예요.',
        },
        {
          title: '전극을 바꾸면?',
          goal: '새 거름종이로 다시 실험해요. <b>전극을 바꾸어</b> 연결하고 전원을 켜서, 파란색이 어느 쪽으로 가는지 확인하세요.',
          hint: '<b>🔄 전극 바꾸기</b>를 누르면 왼쪽이 (−)극이 돼요. 그다음 전원을 켜요.',
          focus: 'strip',
          setup() { setScene('move'); S.mig.leftPos = true; resetPaper(); },
          check: () => !S.mig.leftPos && S.mig.on && S.mig.cu <= -100,
          status: () => moveStatus() + (S.mig.leftPos && S.mig.on ? '<br>🔄 전극을 바꾸어 연결해 보세요.' : ''),
          hold: 0.3,
          explain: '전극을 바꾸자 파란색 구리 이온이 이번에는 <b>왼쪽</b>으로 이동했어요. 이온은 언제나 <b>반대 전하를 띤 극</b> 쪽으로 움직여요. 이온은 전하를 띠고 있어요!',
        },
      ],
    },
  ];

  function resetCurrent() {
    if (!game || game.phase === 'complete' || game.free) { setState(np() || 11, np() || 11); return; }
    const m = game.current();
    if (game.phase !== 'intro' && m && m.setup && m.type !== 'quiz') { m.setup(); return; }
    const lv = LEVELS[game.level];
    if (lv && lv.setup) lv.setup();
  }

  game = SciSim.game({
    simId: 'm2-ion',
    mount: '#game',
    badge: '이온 연금술사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      ebin: '🔵 전자 상자 · 전자 넣고 빼기',
      meter: '⚖️ 전하 계기판',
      ion: '⚡ 원자/양이온/음이온 구별 · 이온식',
      picker: '🔀 원자 고르기 (Na · Mg · O · Cl)',
      move: '🔌 이온의 이동 실험',
    },
    onFeatures(set) {
      F = set;
      if (!on('move') && S.scene === 'move') setScene('atom');
      $('#sideNote').innerHTML = sideNote();
      if (!on('ion')) S.banner = null;
      updateUI(true);
    },
    onMissionStart(m) {
      S.target = null; S.focus = null;
      if (!S.nucleons.length) { const lv = LEVELS[m._level]; if (lv && lv.setup) lv.setup(); }
    },
    onHint(m) { if (m.focus) S.focus = { what: m.focus, t0: S.time }; },
    onComplete() { S.target = null; S.focus = null; },
    levels: LEVELS,
  });

  /* ---------- 시작 ---------- */
  if (!S.nucleons.length) setState(11, 11);
  if (!S.mig.ions.length) resetPaper();
  SciSim.loop((dt) => { step(dt); draw(); updateUI(); });
})();
