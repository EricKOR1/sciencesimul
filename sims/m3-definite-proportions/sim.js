(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound } = SciSim;
  const RM = !!SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const ease = SciSim.ease;
  const rand = (a, b) => a + Math.random() * (b - a);
  const now = () => performance.now() / 1000;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const outBack = (t, s) => { s = s == null ? 1.4 : s; const c3 = s + 1; return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
  const VW = 800, VH = 520;
  const BGC0 = '#f6f9fe';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BGC0 });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  let game = null;
  let F = new Set();
  const on = (f) => (game && game.free) || F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const COL = { ink: '#1b2333', muted: '#5d6879', line: '#dde4ef', good: '#14a058', bad: '#e2464b', sub: '#8b5cf6', warn: '#f26b3a', hot: '#f26b3a', cold: '#2f7de1' };
  const MARK = (b) => (b ? '✅' : '⬜');

  /* ---------- 시간 기준 움직임 (프레임 속도와 무관) ---------- */
  const ANIM = [];
  function tw(obj, to, dur, fn, o) {
    o = o || {};
    const from = {};
    for (const k in to) from[k] = obj[k];
    for (let i = ANIM.length - 1; i >= 0; i--) { const a = ANIM[i]; if (a.obj === obj && Object.keys(to).some((k) => k in a.to)) ANIM.splice(i, 1); }
    const a = { obj, to, from, dur: Math.max(0.001, o.essential || !RM ? dur : 0.001), t: -(o.delay || 0), fn: typeof fn === 'function' ? fn : (ease[fn] || ease.outCubic), done: o.onDone, upd: o.onUpdate, finished: false };
    ANIM.push(a);
    return a;
  }
  function updateAnims(dt) {
    for (let i = 0; i < ANIM.length; i++) {
      const a = ANIM[i];
      a.t += dt;
      if (a.t < 0) continue;
      const p = Math.min(1, a.t / a.dur), e = a.fn(p);
      for (const k in a.to) a.obj[k] = a.from[k] + (a.to[k] - a.from[k]) * e;
      if (a.upd) a.upd(a.obj, p);
      if (p >= 1) a.finished = true;
    }
    for (let i = ANIM.length - 1; i >= 0; i--) if (ANIM[i].finished) { const a = ANIM.splice(i, 1)[0]; if (a.done) a.done(a.obj); }
  }
  const LATER = [];
  function later(sec, fn) { LATER.push({ t: sec, fn }); }
  function updateLater(dt) {
    for (let i = LATER.length - 1; i >= 0; i--) {
      LATER[i].t -= dt;
      if (LATER[i].t <= 0) { const f = LATER.splice(i, 1)[0].fn; f(); }
    }
  }

  /* ---------- 효과음 ---------- */
  const sfx = {
    noise(dur, f0, f1, vol, type) {
      const c = Sound._ensure && Sound._ensure();
      if (!c) return;
      const n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource(); src.buffer = buf;
      const flt = c.createBiquadFilter(); flt.type = type || 'lowpass';
      flt.frequency.setValueAtTime(f0, c.currentTime); flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), c.currentTime + dur);
      const g = c.createGain(); g.gain.value = vol;
      src.connect(flt); flt.connect(g); g.connect(c.destination); src.start();
    },
    pop() { this.noise(0.14, 1400, 120, 0.55, 'lowpass'); Sound.tone(120, 0.12, 'sine', 0.16); },
    whoosh() { this.noise(0.6, 500, 3200, 0.2, 'bandpass'); },
    fizz() { this.noise(0.3, 3200, 1800, 0.05, 'highpass'); },
    thud() { Sound.tone(80, 0.2, 'sine', 0.22); this.noise(0.1, 320, 80, 0.3, 'lowpass'); },
    zap() { this.noise(0.18, 4200, 900, 0.07, 'bandpass'); },
    snap() { Sound.tone(660, 0.07, 'sine', 0.08); },
    ding() { Sound.tone(1175, 0.22, 'sine', 0.1); Sound.tone(1568, 0.3, 'sine', 0.07, 0.07); },
  };

  /* ---------- 그리기 도우미 ---------- */
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); };
  const inRect = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function vgrad(c, x, y, w, h, top, bottom) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  function txt(str, x, y, size, color, align, weight, o) {
    D.text(x, y, str, Object.assign({ size, color, align: align || 'center', weight: weight || 800 }, o || {}));
  }
  function wrapText(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const words = String(str).split(' '), lines = []; let cur = '';
    for (const w of words) {
      const tryS = cur ? cur + ' ' + w : w;
      if (ctx.measureText(tryS).width <= maxW) cur = tryS; else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  }
  function textBlock(str, x, y, maxW, size, color, align, lh, weight) {
    const lines = wrapText(str, maxW, size, weight);
    lh = lh || size * 1.4;
    lines.forEach((l, i) => txt(l, x, y + i * lh, size, color, align || 'left', weight || 700));
    return lines.length * lh;
  }
  /* 화학식: parts = [[기호, 개수], …] */
  function formulaWidth(parts, size) {
    ctx.save(); let w = 0;
    parts.forEach((pt) => {
      ctx.font = D.font(size, 800); w += ctx.measureText(pt[0]).width;
      if (pt[1] > 1) { ctx.font = D.font(size * 0.62, 800); w += ctx.measureText(String(pt[1])).width + 1; }
    });
    ctx.restore(); return w;
  }
  function drawFormula(parts, x, y, size, color, align, alpha) {
    const w = formulaWidth(parts, size);
    let cx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    parts.forEach((pt) => {
      ctx.font = D.font(size, 800); ctx.fillText(pt[0], cx, y); cx += ctx.measureText(pt[0]).width;
      if (pt[1] > 1) { ctx.font = D.font(size * 0.62, 800); ctx.fillText(String(pt[1]), cx + 1, y + size * 0.26); cx += ctx.measureText(String(pt[1])).width + 1; }
    });
    ctx.restore();
    return w;
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { D.roundRect(x, y, w, h, o.r || 14); ctx.fillStyle = o.fill || '#fff'; ctx.fill(); }, { blur: o.blur != null ? o.blur : 10, y: 3 });
    if (o.stroke !== false) { D.roundRect(x, y, w, h, o.r || 14); ctx.strokeStyle = o.stroke || COL.line; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  /* 전자저울: (x, y)=왼쪽 위, 숫자 val */
  function balance(x, y, w, val, o) {
    o = o || {};
    D.shadow(() => { D.roundRect(x, y + 34, w, 34, 10); const g = ctx.createLinearGradient(0, y + 34, 0, y + 68); g.addColorStop(0, '#e6ebf3'); g.addColorStop(1, '#b9c3d3'); ctx.fillStyle = g; ctx.fill(); }, { blur: 10, y: 5 });
    D.roundRect(x + w * 0.1, y + 26, w * 0.8, 12, 6); ctx.fillStyle = '#9aa7ba'; ctx.fill();
    D.roundRect(x + w * 0.1, y + 26, w * 0.8, 6, 3); ctx.fillStyle = '#d4dbe7'; ctx.fill();
    const dw = Math.min(w * 0.46, 104);
    D.roundRect(x + w - dw - 12, y + 42, dw, 20, 5); ctx.fillStyle = '#26313f'; ctx.fill();
    const txtv = o.text != null ? o.text : (val.toFixed(o.dec != null ? o.dec : 2) + ' g');
    txt(txtv, x + w - 12 - dw / 2, y + 58, 15, o.color || '#7dffb0', 'center', 800);
    circle(ctx, x + 22, y + 52, 4); ctx.fillStyle = '#7b8798'; ctx.fill();
  }
  /* 둥근 알약 버튼(캔버스 위) */
  function pill(x, y, w, h, label, o) {
    o = o || {};
    D.shadow(() => { D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = o.fill || '#fff'; ctx.fill(); }, { blur: o.lift ? 14 : 7, y: o.lift ? 6 : 3 });
    D.roundRect(x, y, w, h, h / 2); ctx.strokeStyle = o.stroke || COL.line; ctx.lineWidth = 2; ctx.stroke();
    txt(label, x + w / 2, y + h / 2 + 5, o.size || 15, o.color || COL.ink, 'center', 800);
  }

  /* ---------- 안내 · 강조 ---------- */
  const hintEl = $('#stageHint');
  function showHint(t, ms) { if (!hintEl) return; hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5200); }
  function hideHint() { if (hintEl) hintEl.classList.add('hide'); }
  function pulseEl(sel) { const n = $(sel); if (!n) return; n.classList.remove('feature-new'); void n.offsetWidth; n.classList.add('feature-new'); setTimeout(() => n.classList.remove('feature-new'), 4600); }
  const FOC = { key: '', t: 0 };
  function setFocus(key) { FOC.key = key; FOC.t = 3.6; }
  function okFx(x, y, color) {
    sfx.ding();
    FX.burst(x, y, { count: 16, speed: 150, colors: [color || COL.good, '#ffd23f', '#fff'], size: 3.5, life: 0.9 });
  }
  function numRoll(cur, target, dt, rate) { const v = SciSim.approach(cur, target, dt, rate || 7); return Math.abs(v - target) < 0.0005 ? target : v; }
  const sumTable = (rows, head) => '<table style="table-layout:auto"><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
  /* 장면 등록 · 포인터 */
  const SC = {};
  const S = { scene: '', sceneT: 0 };
  const DR = { fn: null };
  SciSim.pointer(view, {
    hover(p) { const s = SC[S.scene]; return s && s.hover ? s.hover(p) : null; },
    down(p, e) { hideHint(); const s = SC[S.scene]; if (s && s.down && s.down(p, e)) { DR.fn = s; return true; } return false; },
    move(p, e) { if (DR.fn && DR.fn.move) DR.fn.move(p, e); },
    up(p, e) { const s = DR.fn; DR.fn = null; if (s && s.up) s.up(p, e); },
  });
  if (window.matchMedia && window.matchMedia('(max-width: 599px)').matches) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0], s = SC[S.scene];
      if (!tc || !s || !s.hover) return;
      if (s.hover(view.toLocal(tc))) e.preventDefault();
    }, { passive: false });
  }
  /* =========================================================
     중3 Ⅰ. 화학 반응의 규칙성 — 일정 성분비 법칙  [9과16-04]
     ① 실험: 구리 가루를 가열해 질량이 일정해질 때까지 → ② 분석: 모둠 데이터 그래프, 구리 : 산소 = 4 : 1
     → ③ 모형: 원자 짝짓기(CuO), 혼합물(설탕물)과 비교 → ④ 적용: 마그네슘(3 : 2), 물(1 : 8)
     ※ 몰 · 원자량 계산식은 다루지 않음 (원자 1개의 질량은 '상대 칸 수'로만 표현)
     ========================================================= */
  let lastFree = false, CTRL_READY = false;
  const q = (id) => document.getElementById(id);
  const dis = (id, v) => { const n = q(id); if (n) n.disabled = !!v; };
  const SCN = {
    lab: { label: '🔥 구리 가루를 가열하며 질량을 재요', btn: '🔥 구리 가열' },
    graph: { label: '📊 모둠 데이터를 그래프로 나타내요', btn: '📊 그래프' },
    cuo: { label: '🧩 구리 원자와 산소 원자가 짝을 지어요', btn: '🧱 산화 구리' },
    sugar: { label: '🧃 설탕물(혼합물)은 어떨까요?', btn: '🧃 설탕물' },
    mg: { label: '⚡ 마그네슘을 태워 질량을 재요', btn: '⚡ 마그네슘' },
    water: { label: '💧 수소와 산소가 물이 돼요', btn: '💧 물 생성' },
  };
  const GROUPS = { lab: ['lab'], graph: ['graph'], cuo: ['cuo', 'sugar'], sugar: ['cuo', 'sugar'], mg: ['mg', 'water'], water: ['mg', 'water'] };
  const segEl = $('#sceneSeg');
  Object.keys(SCN).forEach((k) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.scene = k; b.textContent = SCN[k].btn; segEl.appendChild(b);
    b.addEventListener('click', () => { Sound.click(); setScene(k, true); });
  });
  function setScene(name, instant) {
    if (S.scene === name) return;
    S.scene = name; S.sceneT = instant ? 0 : 0;
    const s = SC[name]; if (s && s.enter) s.enter();
    refreshUI();
  }
  function refreshUI() {
    lastFree = !!(game && game.free);
    const sc = S.scene;
    $$('#ctrlCard .control, #readouts .readout').forEach((n) => { n.hidden = !(n.dataset.sc || '').split(' ').includes(sc); });
    const list = lastFree ? Object.keys(SCN) : (GROUPS[sc] || []);
    segEl.hidden = list.length < 2;
    $$('button', segEl).forEach((b) => { b.hidden = !list.includes(b.dataset.scene); b.classList.toggle('on', b.dataset.scene === sc); });
    if (SCN[sc]) $('#tbLabel').textContent = SCN[sc].label;
    syncControls();
  }
  const fmt2 = (v) => v.toFixed(2);
  function setR(id, html) { const n = $('#' + id); if (n && n.dataset.v !== html) { n.dataset.v = html; n.innerHTML = html; } }
  const u = (v, unit) => v + '<small>' + unit + '</small>';

  /* ---------- 공통 그리기: 실험대 · 도가니 ---------- */
  const BENCH_Y = 420, CS = 1.35;
  function room() {
    vgrad(ctx, 0, 0, VW, VH, '#f7faff', '#e3ebf7');
  }
  function bench() {
    vgrad(ctx, 0, BENCH_Y, VW, 52, '#e1c398', '#c9a06a');
    vgrad(ctx, 0, BENCH_Y + 52, VW, VH - BENCH_Y - 52, '#b48a56', '#9a7343');
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, BENCH_Y, VW, 2);
  }
  /* 도가니(단면): (cx, by)=바닥 가운데. 안의 내용은 fn(ctx)로 그림 */
  function crucible(cx, by, fn, sc) {
    ctx.save(); ctx.translate(cx, by); if (sc) ctx.scale(sc, sc);
    const path = () => { ctx.beginPath(); ctx.moveTo(-52, -54); ctx.lineTo(-32, -4); ctx.quadraticCurveTo(-30, 0, -24, 0); ctx.lineTo(24, 0); ctx.quadraticCurveTo(30, 0, 32, -4); ctx.lineTo(52, -54); };
    ctx.save(); path(); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-60, -60, 120, 64);
    if (fn) fn();
    ctx.restore();
    D.shadow(() => { path(); ctx.strokeStyle = '#b9a58c'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke(); }, { blur: 8, y: 4, color: 'rgba(60,40,20,.2)' });
    ctx.strokeStyle = '#efe6d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-47, -50); ctx.lineTo(-31, -10); ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     장면 1 · 구리 가열
     ========================================================= */
  const MS = [2.00, 2.28, 2.41, 2.47, 2.50, 2.50, 2.50, 2.50, 2.50, 2.50];
  const LAB = { phase: 'idle', pt: 0, round: 0, mass: 2.00, scaleVal: 2.00, pts: [], flame: 0, hot: 0, u: 0, stir: 0, fracT: 0, fracS: 0, grains: [], stable: false, busy: false, burst: 0 };
  const TRI = { x: 190, baseY: 330 };               // 삼발이 위 도가니
  const PAN = { x: 430, baseY: 418 };               // 저울 위 도가니
  function labInit() {
    LAB.grains = [];
    for (let i = 0; i < 170; i++) {
      const x = rand(-37, 37), edge = 1 - Math.pow(Math.abs(x) / 39, 2);
      LAB.grains.push({ x, y: -rand(3, 6 + 26 * edge * rand(0.35, 1)), r: rand(2.4, 4.1), th: Math.random(), b: 0, ph: rand(0, 6) });
    }
    LAB.grains.sort((a, b) => a.y - b.y);
    Object.assign(LAB, { phase: 'idle', pt: 0, round: 0, mass: 2.00, scaleVal: 2.00, flame: 0, hot: 0, u: 0, stir: 0, fracT: 0, fracS: 0, stable: false, busy: false });
    LAB.pts = [{ r: 0, m: 2.00, s: 1 }];
  }
  labInit();
  function labRound() {
    if (LAB.busy) return;
    LAB.busy = true; LAB.round++;
    LAB.target = MS[Math.min(LAB.round, MS.length - 1)];
    LAB.fracT = (LAB.target - 2) / 0.5;
    sfx.whoosh();
    if (LAB.u > 0.02) { LAB.phase = 'back'; LAB.pt = 0; tw(LAB, { u: 0 }, 0.55, 'inOutCubic', { essential: true }); }
    else { LAB.phase = 'heat'; LAB.pt = 0; }
    hideHint();
  }
  function labUpdate(dt) {
    LAB.pt += dt;
    if (LAB.phase === 'back' && LAB.pt > 0.58) { LAB.phase = 'heat'; LAB.pt = 0; }
    if (LAB.phase === 'heat') {
      LAB.flame = SciSim.approach(LAB.flame, 1, dt, 7);
      LAB.hot = SciSim.approach(LAB.hot, 1, dt, 3);
      LAB.stir += dt;
      LAB.fracS = SciSim.approach(LAB.fracS, LAB.fracT, dt, 1.7);
      if (Math.random() < dt * 14) FX.emit({ x: TRI.x + rand(-34, 34), y: TRI.baseY - 78, vx: rand(-8, 8), vy: -rand(30, 55), life: 1.3, size: 7, grow: 14, color: '#dfe5ee', shape: 'smoke', alpha: 0.7 });
      if (Math.random() < dt * 9) FX.emit({ x: TRI.x + rand(-30, 30), y: TRI.baseY - 30, vx: rand(-40, 40), vy: -rand(40, 110), life: 0.5, size: 1.6, color: '#ffb15a', gravity: 160, shape: 'circle' });
      if (LAB.pt > 2.2) { LAB.phase = 'move'; LAB.pt = 0; tw(LAB, { u: 1 }, 0.95, 'inOutCubic', { essential: true }); }
    } else {
      LAB.flame = SciSim.approach(LAB.flame, 0, dt, 9);
      LAB.hot = SciSim.approach(LAB.hot, 0, dt, 1.4);
      LAB.fracS = SciSim.approach(LAB.fracS, LAB.fracT, dt, 3);
    }
    if (LAB.phase === 'move' && LAB.pt > 1.0) {
      LAB.phase = 'weigh'; LAB.pt = 0; sfx.thud();
      const prev = LAB.mass; LAB.mass = LAB.target;
      const pt = { r: LAB.round, m: LAB.mass, s: 0 }; LAB.pts.push(pt);
      tw(pt, { s: 1 }, 0.6, 'outBack', { essential: true });
      if (LAB.round >= 2 && Math.abs(LAB.mass - prev) < 1e-9) {
        LAB.stable = true;
        later(0.5, () => { okFx(PAN.x, PAN.baseY - 70, COL.good); showHint('질량이 더 이상 늘지 않아요! 구리가 모두 반응했어요.', 4200); });
      }
    }
    if (LAB.phase === 'weigh') { LAB.scaleVal = numRoll(LAB.scaleVal, LAB.mass, dt, 6); if (LAB.pt > 0.9) { LAB.phase = 'idle'; LAB.busy = false; } }
    LAB.grains.forEach((g) => { g.b = SciSim.approach(g.b, clamp((LAB.fracS - g.th) * 9, 0, 1), dt, 5); });
  }
  function grainColor(g) {
    const base = mix('#cf6b3c', '#1b1818', g.b);
    return LAB.hot > 0.02 ? mix(base, '#ff7a24', LAB.hot * 0.5 * (1 - g.b * 0.5)) : base;
  }
  function drawCuLab(t) {
    room(); bench();
    // 알코올 아닌 가스버너 + 삼발이
    const bx = TRI.x;
    ctx.strokeStyle = '#6b7686'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    [[-62, 0], [62, 0]].forEach((s) => { ctx.beginPath(); ctx.moveTo(bx + s[0], BENCH_Y + 34); ctx.lineTo(bx + s[0] * 0.55, TRI.baseY + 2); ctx.stroke(); });
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx - 40, TRI.baseY + 2); ctx.lineTo(bx + 40, TRI.baseY + 2); ctx.stroke();
    ctx.strokeStyle = '#d5b48a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 34, TRI.baseY + 5); ctx.lineTo(bx + 34, TRI.baseY + 5); ctx.stroke();
    // 버너
    D.shadow(() => { D.roundRect(bx - 34, BENCH_Y + 26, 68, 14, 7); ctx.fillStyle = '#5d6879'; ctx.fill(); }, { blur: 6, y: 3 });
    D.roundRect(bx - 8, BENCH_Y - 22, 16, 50, 4); const bg = ctx.createLinearGradient(bx - 8, 0, bx + 8, 0); bg.addColorStop(0, '#9aa7ba'); bg.addColorStop(0.5, '#e6ecf4'); bg.addColorStop(1, '#8794a8'); ctx.fillStyle = bg; ctx.fill();
    D.roundRect(bx - 11, BENCH_Y - 4, 22, 9, 3); ctx.fillStyle = '#394557'; ctx.fill();
    if (LAB.flame > 0.02) D.flame(bx, BENCH_Y - 22, 74 * LAB.flame, t, { glow: '#ffa733' });
    // 도가니 (삼발이 ↔ 저울 사이 호)
    const uu = LAB.u, cx = lerp(TRI.x, PAN.x, uu), cy = lerp(TRI.baseY, PAN.baseY, uu) - Math.sin(Math.PI * uu) * 70;
    // 저울
    balance(PAN.x - 92, BENCH_Y - 24, 184, LAB.scaleVal);
    txt('전자저울', PAN.x - 6, BENCH_Y + 62, 13, COL.muted, 'center', 800);
    crucible(cx, cy, () => {
      LAB.grains.forEach((g) => {
        const jit = LAB.phase === 'heat' ? Math.sin(t * 9 + g.ph) * 1.3 : 0;
        ctx.fillStyle = grainColor(g); ctx.beginPath(); ctx.arc(g.x + jit, g.y + Math.cos(t * 7 + g.ph) * (LAB.phase === 'heat' ? 0.9 : 0), g.r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (0.34 * (1 - g.b * 0.7)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(g.x - g.r * 0.3 + jit, g.y - g.r * 0.35, g.r * 0.35, 0, TAU); ctx.fill();
      });
      if (LAB.hot > 0.05) { D.glow(0, -16, 46, '#ff6a1f', 0.28 * LAB.hot); }
    }, CS);
    // 젓개
    if (LAB.phase === 'heat' || LAB.stir > 0 && LAB.phase === 'back') {
      const sw = Math.sin(LAB.stir * 8) * 14;
      ctx.save(); ctx.strokeStyle = 'rgba(120,150,190,.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + 74 + sw * 0.4, cy - 150); ctx.lineTo(cx + sw * 1.2, cy - 18); ctx.stroke();
      ctx.restore();
    }
    // 이름표
        if (uu < 0.5) { const lb = LAB.fracS < 0.12 ? '구리 가루(붉은색)' : LAB.fracS > 0.97 ? '산화 구리(검은색)' : '구리 + 산화 구리'; D.label(TRI.x, 222, lb, { bg: 'rgba(255,255,255,.92)', color: COL.ink, size: 14 }); }
    // 그래프 패널
    drawLabChart(t);
  }
  function drawLabChart(t) {
    const X = 536, Y = 18, W = 248, H = 292;
    panel(X, Y, W, H);
    txt('📈 가열 횟수와 질량', X + W / 2, Y + 28, 15, COL.ink, 'center', 800);
    const px0 = X + 52, px1 = X + W - 18, py0 = Y + 64, py1 = Y + H - 56;
    const gx = (r) => px0 + (px1 - px0) * (r / 6), gy = (m) => py1 - (py1 - py0) * ((m - 2.0) / 0.6);
    ctx.save(); ctx.font = D.font(13, 700); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let m = 2.0; m <= 2.601; m += 0.2) {
      ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px0, gy(m)); ctx.lineTo(px1, gy(m)); ctx.stroke();
      ctx.fillStyle = COL.muted; ctx.fillText(m.toFixed(1), px0 - 7, gy(m));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let r = 0; r <= 6; r++) { ctx.fillStyle = COL.muted; ctx.fillText(r, gx(r), py1 + 6); }
    ctx.restore();
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px0, py0 - 6); ctx.lineTo(px0, py1); ctx.lineTo(px1 + 4, py1); ctx.stroke();
    txt('가열 횟수(회)', (px0 + px1) / 2, py1 + 34, 13, COL.muted, 'center', 700);
    ctx.save(); ctx.translate(X + 14, (py0 + py1) / 2); ctx.rotate(-Math.PI / 2); txt('질량(g)', 0, 0, 13, COL.muted, 'center', 700); ctx.restore();
    // 처음 구리 질량 기준선 + 일정해진 선
    D.dashedLine(px0, gy(2.0), px1, gy(2.0), { color: '#b7c1d1', width: 1.5, dash: [4, 4] });
    if (LAB.stable) {
      const last = LAB.pts[LAB.pts.length - 1];
      D.dashedLine(gx(4), gy(2.5), px1, gy(2.5), { color: rgba(COL.good, 0.8), width: 2, dash: [6, 5], offset: t * 12 });
      D.arrow(px1 - 6, gy(2.0) - 2, px1 - 6, gy(2.5) + 4, { color: COL.good, width: 2.4, head: 9 });
      D.label(px1 - 28, (gy(2.0) + gy(2.5)) / 2, 'O 0.50 g', { bg: '#fff', color: COL.good, size: 13, border: COL.good, align: 'right' });
      txt('일정!', gx(5.2), gy(2.5) - 10, 14, COL.good, 'center', 800);
    }
    // 선 + 점
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    LAB.pts.forEach((p, i) => { const x = gx(p.r), y = gy(p.m); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    LAB.pts.forEach((p) => { if (p.s > 0.02) D.sphere(gx(p.r), gy(p.m), 6.5 * p.s, '#8b5cf6', { shadow: true }); });
    // 범례
    const ly = Y + H + 12;
    panel(X, ly, W, 100);
    D.sphere(X + 26, ly + 28, 9, '#cf6b3c', {}); txt('구리 (붉은색)', X + 44, ly + 33, 14, COL.ink, 'left', 800);
    D.sphere(X + 26, ly + 58, 9, '#1b1818', {}); txt('산화 구리(Ⅱ) (검은색)', X + 44, ly + 63, 14, COL.ink, 'left', 800);
    txt('구리 + 산소 → 산화 구리(Ⅱ)', X + W / 2, ly + 88, 13, COL.sub, 'center', 800);
  }
  SC.lab = {
    enter() { if (!LAB.busy && LAB.round === 0) showHint('🔥 버튼을 눌러 구리 가루를 가열하고 저어 주세요', 4800); },
    update: labUpdate,
    draw: drawCuLab,
  };

  /* =========================================================
     장면 2 · 모둠 데이터 보드 + 그래프
     ========================================================= */
  const DATA = [
    { g: 1, cu: 1.0, cuo: 1.26 }, { g: 2, cu: 2.0, cuo: 2.49 }, { g: 3, cu: 3.0, cuo: 3.76 }, { g: 4, cu: 4.0, cuo: 4.98 },
  ];
  DATA.forEach((d) => { d.o = +(d.cuo - d.cu).toFixed(2); });
  const GP = { x0: 452, x1: 756, y0: 74, y1: 378, xmax: 4.5, ymax: 1.2 };
  const gX = (cu) => GP.x0 + (GP.x1 - GP.x0) * (cu / GP.xmax), gY = (o) => GP.y1 - (GP.y1 - GP.y0) * (o / GP.ymax);
  const CARD = { x: 20, w: 336, h: 86, y0: 66, gap: 104 };
  const GD = { got: false, rows: [], fitted: false, fitP: 0, sel: -1, tokens: [], drag: null, ratio: 0, badge: 0 };
  function gdInit() {
    GD.got = false; GD.fitted = false; GD.fitP = 0; GD.sel = -1; GD.tokens = []; GD.drag = null; GD.badge = 0;
    GD.rows = DATA.map((d, i) => ({ d, i, ox: -380, dx: 0, dy: 0, lift: 0, done: 0, ps: 0, plotted: false, shown: false }));
  }
  gdInit();
  const plottedN = () => GD.rows.filter((r) => r.plotted).length;
  function gdReceive() {
    if (GD.got) return;
    GD.got = true; sfx.whoosh();
    GD.rows.forEach((r, i) => { tw(r, { ox: 0 }, 0.7, 'outBack', { delay: i * 0.16, essential: true }); });
  }
  function gdPlot(r) {
    if (r.plotted) return;
    r.plotted = true;
    const x0 = CARD.x + CARD.w / 2 + r.dx, y0 = CARD.y0 + r.i * CARD.gap + CARD.h / 2 + r.dy;
    const tk = { r, k: 0, x0, y0 };
    GD.tokens.push(tk);
    tw(r, { dx: 0, dy: 0 }, 0.01, 'linear');
    tw(tk, { k: 1 }, 0.85, 'inOutCubic', { essential: true, onDone: () => {
      GD.tokens.splice(GD.tokens.indexOf(tk), 1);
      tw(r, { ps: 1 }, 0.55, 'outBack', { essential: true });
      sfx.snap(); FX.burst(gX(r.d.cu), gY(r.d.o), { count: 12, speed: 110, colors: ['#8b5cf6', '#ffd23f', '#fff'], size: 3, life: 0.7 });
    } });
    tw(r, { done: 1 }, 0.5, 'outCubic', { essential: true });
    sfx.whoosh();
  }
  function gdFit() {
    if (GD.fitted || plottedN() < 4) return false;
    GD.fitted = true; GD.fitP = 0;
    let sxy = 0, sxx = 0; DATA.forEach((d) => { sxy += d.cu * d.o; sxx += d.cu * d.cu; });
    GD.slope = sxy / sxx; GD.ratio = 1 / GD.slope;
    tw(GD, { fitP: 1 }, 1.1, 'inOutCubic', { essential: true, onDone: () => { tw(GD, { badge: 1 }, 0.6, 'outBack', { essential: true }); okFx(gX(2), gY(2 * GD.slope), COL.sub); } });
    sfx.whoosh();
    return true;
  }
  function gdCardRect(i) { return { x: CARD.x + GD.rows[i].ox + GD.rows[i].dx, y: CARD.y0 + i * CARD.gap + GD.rows[i].dy, w: CARD.w, h: CARD.h }; }
  SC.graph = {
    enter() { if (!GD.got) showHint('📨 모둠 데이터 받기를 눌러 보세요', 4200); },
    update(dt) { GD.rows.forEach((r) => { r.lift = SciSim.approach(r.lift, GD.drag && GD.drag.r === r ? 1 : 0, dt, 14); }); },
    hover(p) { for (const r of GD.rows) if (r.ox > -5 && !r.plotted && inRect(p, gdCardRect(r.i))) return 'grab'; return null; },
    down(p) {
      for (let i = GD.rows.length - 1; i >= 0; i--) {
        const r = GD.rows[i];
        if (r.ox > -5 && !r.plotted && inRect(p, gdCardRect(i))) { GD.drag = { r, sx: p.x, sy: p.y, moved: 0 }; sfx.snap(); return true; }
      }
      // 점을 눌러 보기
      if (plottedN()) {
        let best = -1, bd = 26;
        GD.rows.forEach((r) => { if (r.plotted && r.ps > 0.8) { const d = Math.hypot(p.x - gX(r.d.cu), p.y - gY(r.d.o)); if (d < bd) { bd = d; best = r.i; } } });
        GD.sel = best; if (best >= 0) sfx.snap();
      }
      return false;
    },
    move(p) { const d = GD.drag; if (!d) return; d.moved = Math.max(d.moved, Math.hypot(p.x - d.sx, p.y - d.sy)); d.r.dx = p.x - d.sx; d.r.dy = p.y - d.sy; },
    up(p) {
      const d = GD.drag; GD.drag = null; if (!d) return;
      if (d.moved < 10 || p.x > 372) gdPlot(d.r);
      else { tw(d.r, { dx: 0, dy: 0 }, 0.45, 'outBack', { essential: true }); }
    },
    draw(t) {
      room();
      // 보드
      txt('📋 모둠 데이터 보드', CARD.x + 6, 44, 17, COL.ink, 'left', 800);
      if (!GD.got) { D.roundRect(CARD.x, CARD.y0, CARD.w, 4 * CARD.gap - 18, 16); ctx.fillStyle = 'rgba(139,92,246,.06)'; ctx.fill(); ctx.setLineDash([8, 7]); ctx.strokeStyle = 'rgba(139,92,246,.45)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); textBlock('각 모둠이 구리를 가열한 결과가 여기에 모여요', CARD.x + CARD.w / 2, 230, 260, 15, COL.muted, 'center'); }
      const order = GD.rows.slice().sort((a, b) => a.lift - b.lift);
      order.forEach((r) => {
        const i = r.i, c = gdCardRect(i);
        if (c.x + c.w < 0) return;
        const lift = r.lift, sc = 1 + 0.04 * lift, cxm = c.x + c.w / 2, cym = c.y + c.h / 2;
        ctx.save(); ctx.translate(cxm, cym); ctx.scale(sc, sc); ctx.translate(-cxm, -cym);
        ctx.globalAlpha = 1 - 0.45 * r.done;
        D.shadow(() => { D.roundRect(c.x, c.y, c.w, c.h, 16); ctx.fillStyle = r.plotted ? '#f1f4f9' : '#fff'; ctx.fill(); }, { blur: 8 + lift * 14, y: 3 + lift * 8 });
        D.roundRect(c.x, c.y, c.w, c.h, 16); ctx.strokeStyle = r.plotted ? COL.line : '#cdbef8'; ctx.lineWidth = 2; ctx.stroke();
        D.roundRect(c.x + 10, c.y + 10, 56, 28, 14); ctx.fillStyle = '#8b5cf6'; ctx.fill();
        txt(r.d.g + '모둠', c.x + 38, c.y + 30, 14, '#fff', 'center', 800);
        txt('구리 ' + r.d.cu.toFixed(1) + ' g  →  산화 구리 ' + r.d.cuo.toFixed(2) + ' g', c.x + 78, c.y + 31, 15, COL.ink, 'left', 800);
        const eq = '결합한 산소 = ' + r.d.cuo.toFixed(2) + ' − ' + r.d.cu.toFixed(1) + ' = ';
        ctx.save(); ctx.font = D.font(14, 700); const eqw = ctx.measureText(eq).width; ctx.restore();
        txt(eq, c.x + 16, c.y + 66, 14, COL.muted, 'left', 700);
        txt(r.d.o.toFixed(2) + ' g', c.x + 16 + eqw + 2, c.y + 66, 16, '#3867f4', 'left', 800);
        if (r.plotted) txt('✓ 찍음', c.x + c.w - 14, c.y + 66, 14, COL.good, 'right', 800);
        else txt('끌기 ▶', c.x + c.w - 14, c.y + 66, 14, '#8b5cf6', 'right', 800);
        ctx.restore();
      });
      // 그래프 패널
      const PX = 372, PY = 18, PW = 408, PH = 484;
      panel(PX, PY, PW, PH);
      txt('📈 구리 질량과 결합한 산소 질량', PX + PW / 2, PY + 28, 16, COL.ink, 'center', 800);
      // 그리드
      ctx.save(); ctx.font = D.font(13, 700);
      for (let o = 0; o <= 1.201; o += 0.2) { ctx.strokeStyle = o === 0 ? '#8a95a6' : '#e8edf5'; ctx.lineWidth = o === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(GP.x0, gY(o)); ctx.lineTo(GP.x1, gY(o)); ctx.stroke(); ctx.fillStyle = COL.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(o.toFixed(1), GP.x0 - 8, gY(o)); }
      for (let c = 0; c <= 4.001; c += 1) { ctx.strokeStyle = c === 0 ? '#8a95a6' : '#e8edf5'; ctx.lineWidth = c === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(gX(c), GP.y0 - 6); ctx.lineTo(gX(c), GP.y1); ctx.stroke(); ctx.fillStyle = COL.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(c, gX(c), GP.y1 + 7); }
      ctx.restore();
      txt('구리 질량(g)', (GP.x0 + GP.x1) / 2, GP.y1 + 38, 14, COL.muted, 'center', 700);
      ctx.save(); ctx.translate(PX + 22, (GP.y0 + GP.y1) / 2); ctx.rotate(-Math.PI / 2); txt('결합한 산소 질량(g)', 0, 0, 14, COL.muted, 'center', 700); ctx.restore();
      D.sphere(gX(0), gY(0), 5, '#b7c1d1', { gloss: false });
      // 직선
      if (GD.fitted) {
        const xe = GP.xmax * GD.fitP, ye = GD.slope * xe;
        ctx.save(); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(gX(0), gY(0)); ctx.lineTo(gX(xe), gY(ye)); ctx.stroke(); ctx.restore();
        if (GD.fitP > 0.6) D.glow(gX(0), gY(0), 22, '#e2464b', 0.35 * (GD.fitP - 0.6) / 0.4);
      }
      // 점
      GD.rows.forEach((r) => {
        if (r.ps > 0.02) {
          const x = gX(r.d.cu), y = gY(r.d.o);
          if (GD.sel === r.i) D.ring(x, y, 14, t, { color: COL.sub });
          D.sphere(x, y, 9 * r.ps, '#8b5cf6', { shadow: true, outline: '#fff', outlineWidth: 2 });
        }
      });
      // 날아가는 점
      GD.tokens.forEach((tk) => {
        const tx = gX(tk.r.d.cu), ty = gY(tk.r.d.o), k = tk.k;
        const cx = (tk.x0 + tx) / 2, cy = Math.min(tk.y0, ty) - 90;
        const x = (1 - k) * (1 - k) * tk.x0 + 2 * (1 - k) * k * cx + k * k * tx, y = (1 - k) * (1 - k) * tk.y0 + 2 * (1 - k) * k * cy + k * k * ty;
        D.glow(x, y, 20, '#8b5cf6', 0.5); D.sphere(x, y, 9, '#8b5cf6', { shadow: true });
      });
      // 선택 점 설명
      if (GD.sel >= 0) {
        const d = DATA[GD.sel], x = gX(d.cu), y = gY(d.o);
        const lb = d.cu.toFixed(1) + ' : ' + d.o.toFixed(2) + ' ≈ ' + (d.cu / d.o).toFixed(1) + ' : 1';
        D.label(clamp(x, 540, 700), y - 30, '구리 : 산소 ' + lb, { bg: '#1b2333', size: 13 });
      }
      // 아래 설명 / 결론
      const by = PY + PH - 54;
      if (GD.badge > 0.01) {
        ctx.save(); ctx.translate(PX + PW / 2, by + 8); ctx.scale(GD.badge, GD.badge);
        D.shadow(() => { D.roundRect(-176, -22, 352, 46, 23); ctx.fillStyle = '#fff3f3'; ctx.fill(); }, { blur: 10, y: 3 });
        D.roundRect(-176, -22, 352, 46, 23); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.stroke();
        txt('원점을 지나는 직선 → 구리 : 산소 = ' + Math.round(GD.ratio) + ' : 1', 0, 7, 17, '#c8323a', 'center', 800);
        ctx.restore();
      } else {
        const n = plottedN();
        const msg = !GD.got ? '먼저 모둠 데이터를 받아요' : n < 4 ? '카드를 끌어 점을 찍어요 (' + n + '/4)' : '점을 모두 찍었어요! 📏 직선을 그어 봐요';
        txt(msg, PX + PW / 2, by + 14, 15, COL.muted, 'center', 800);
      }
    },
  };

  /* =========================================================
     장면 3 · 원자 짝짓기 (CuO)
     ========================================================= */
  const CU = { cu: [], mol: [], atoms: [], pairs: 0, found: false, drag: null, barC: 0, barO: 0, auto: false };
  const CUCOL = '#d2693a', OCOL = '#e2464b';
  function cuInit() {
    CU.cu = []; CU.mol = []; CU.atoms = []; CU.pairs = 0; CU.found = false; CU.drag = null; CU.auto = false; CU.barC = 0; CU.barO = 0;
    for (let i = 0; i < 6; i++) CU.cu.push({ x: 70 + (i % 3) * 112, y: 200 + Math.floor(i / 3) * 130, r: 34, atom: null, pop: 0, dark: 0 });
    [[412, 150], [504, 220], [412, 320], [504, 392]].forEach((h, k) => {
      const m = { k, x: h[0], y: h[1], hx: h[0], hy: h[1], ph: rand(0, 6), split: false, a: [] };
      for (let j = 0; j < 2; j++) { const at = { x: h[0] + (j ? 19 : -19), y: h[1], r: 19, mol: m, j, bonded: -1, hx: h[0], hy: h[1], ph: rand(0, 6) }; m.a.push(at); CU.atoms.push(at); }
      CU.mol.push(m);
    });
  }
  cuInit();
  function cuSplit(m) {
    if (m.split) return;
    m.split = true; sfx.pop();
    FX.burst(m.x, m.y, { count: 8, speed: 70, colors: ['#ffd1d1', '#fff'], size: 2.5, life: 0.5, gravity: 0 });
    m.a.forEach((at, j) => {
      const tx = clamp(m.x + (j ? 40 : -40), 384, 546), ty = clamp(m.y + rand(-14, 14), 120, 450);
      at.hx = tx; at.hy = ty;
      tw(at, { x: tx, y: ty }, 0.5, 'outBack', { essential: true });
    });
  }
  function cuBond(at, ci) {
    const cu = CU.cu[ci]; if (cu.atom || at.bonded >= 0) return false;
    if (!at.mol.split) cuSplit(at.mol);
    cu.atom = at; at.bonded = ci; CU.pairs++;
    tw(at, { x: cu.x + 52, y: cu.y }, 0.45, 'outBack', { essential: true });
    tw(cu, { dark: 1 }, 0.9, 'outCubic', { essential: true });
    cu.pop = 1; tw(cu, { pop: 0 }, 0.6, 'outCubic', { essential: true, delay: 0.3 });
    sfx.snap();
    later(0.35, () => FX.burst(cu.x + 28, cu.y, { count: 10, speed: 90, colors: ['#ffb15a', '#ffd23f', '#fff'], size: 3, life: 0.6 }));
    if (CU.pairs === 6) later(0.7, () => { sfx.ding(); showHint('구리 원자 6개가 모두 짝을 지었어요. 남은 입자는 무엇일까요? 눌러 보세요', 6000); });
    return true;
  }
  const cuLeft = () => CU.atoms.filter((a) => a.bonded < 0);
  function cuAuto() {
    if (CU.auto || CU.pairs >= 6) return;
    CU.auto = true;
    const run = () => {
      const free = CU.cu.findIndex((c) => !c.atom);
      if (free < 0) { CU.auto = false; return; }
      let at = CU.atoms.find((a) => a.bonded < 0 && a.mol.split);
      if (!at) { const m = CU.mol.find((mm) => !mm.split); at = m.a[0]; cuSplit(m); }
      cuBond(at, free);
      later(0.55, run);
    };
    run();
  }
  const molOf = (p) => CU.mol.find((m) => !m.split && Math.hypot(p.x - m.x, p.y - m.y) < 40);
  const atomOf = (p) => { let b = null, bd = 32; CU.atoms.forEach((a) => { if (a.bonded < 0 && a.mol.split) { const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < bd) { bd = d; b = a; } } }); return b; };
  SC.cuo = {
    enter() { showHint('산소 분자(O₂)를 눌러 쪼개고, 산소 원자를 구리 원자 옆으로 끌어다 놓아요', 6000); },
    update(dt) {
      CU.mol.forEach((m) => { if (!m.split && !(CU.drag && CU.drag.m === m)) { m.a[0].x = m.x - 19; m.a[0].y = m.y; m.a[1].x = m.x + 19; m.a[1].y = m.y; } });
      if (CU.drag && CU.drag.m) { const m = CU.drag.m; m.a[0].x = m.x - 19; m.a[0].y = m.y; m.a[1].x = m.x + 19; m.a[1].y = m.y; }
      CU.barC = SciSim.approach(CU.barC, CU.pairs * 4, dt, 5); CU.barO = SciSim.approach(CU.barO, CU.pairs, dt, 5);
    },
    hover(p) { return molOf(p) || atomOf(p) ? 'grab' : null; },
    down(p) {
      const a = atomOf(p);
      if (a) { CU.drag = { a, sx: p.x, sy: p.y, moved: 0, ox: a.x - p.x, oy: a.y - p.y }; sfx.snap(); return true; }
      const m = molOf(p);
      if (m) { CU.drag = { m, sx: p.x, sy: p.y, moved: 0, ox: m.x - p.x, oy: m.y - p.y }; sfx.snap(); return true; }
      return false;
    },
    move(p) {
      const d = CU.drag; if (!d) return;
      d.moved = Math.max(d.moved, Math.hypot(p.x - d.sx, p.y - d.sy));
      if (d.moved < 8) return;
      if (d.a) { d.a.x = p.x + d.ox; d.a.y = p.y + d.oy; } else if (d.m) { d.m.x = p.x + d.ox; d.m.y = p.y + d.oy; }
    },
    up(p) {
      const d = CU.drag; CU.drag = null; if (!d) return;
      const obj = d.a || d.m, ax = d.a ? d.a.x : d.m.x, ay = d.a ? d.a.y : d.m.y;
      if (d.moved < 8) {
        if (d.m) { if (CU.pairs === 6) CU.found = true; else cuSplit(d.m); }
        else if (CU.pairs === 6) CU.found = true;
        return;
      }
      // 가까운 빈 구리 원자 찾기
      let ci = -1, bd = 84;
      CU.cu.forEach((c, i) => { if (!c.atom) { const dd = Math.hypot(ax - (c.x + 26), ay - c.y); if (dd < bd) { bd = dd; ci = i; } } });
      if (ci >= 0) {
        const at = d.a || d.m.a[0];
        if (d.m) { const m = d.m; m.hx = m.x; m.hy = m.y; cuSplit(m); }
        cuBond(at, ci);
      } else if (d.a) { tw(d.a, { x: clamp(d.a.x, 384, 546), y: clamp(d.a.y, 120, 450) }, 0.4, 'outBack', { essential: true }); d.a.hx = clamp(d.a.x, 384, 546); d.a.hy = clamp(d.a.y, 120, 450); }
      else if (d.m) { tw(d.m, { x: d.m.hx, y: d.m.hy }, 0.5, 'outBack', { essential: true }); }
    },
    draw(t) {
      room();
      panel(14, 14, 556, 492, { r: 18 });
      txt('구리 원자 (Cu) 6개', 40, 56, 15, '#a14a22', 'left', 800);
      txt('산소 분자 (O₂) 4개', 384, 56, 15, '#b9272d', 'left', 800);
      // 구분선
      D.dashedLine(362, 70, 362, 480, { color: '#dde4ef', width: 2, dash: [5, 7] });
      const drag = CU.drag && CU.drag.moved >= 8 ? CU.drag : null;
      CU.cu.forEach((c) => {
        const col = mix(CUCOL, '#2b2523', c.dark);
        if (!c.atom && drag) D.ring(c.x, c.y, c.r + 12, t, { color: COL.good, speed: 1.4 });
        const sc = 1 + 0.16 * c.pop;
        D.sphere(c.x, c.y, c.r * sc, col, { shadow: true, text: 'Cu', textScale: 0.8 });
        if (c.atom) { D.glow(c.x + 22, c.y, 44, '#ffb15a', 0.28 * (1 - c.pop) * 0 + 0.0); }
      });
      // 산소
      CU.atoms.forEach((a) => {
        const free = a.bonded < 0, lifted = CU.drag && (CU.drag.a === a || CU.drag.m === a.mol) && CU.drag.moved >= 8;
        const bob = free && !lifted ? Math.sin(t * 1.5 + a.ph) * 3.2 : 0, bobx = free && !lifted ? Math.cos(t * 1.1 + a.ph) * 2.2 : 0;
        const x = a.x + bobx, y = a.y + bob;
        if (!a.mol.split && a.j === 1) {
          // 결합선
          const o = a.mol.a[0]; ctx.strokeStyle = shade(OCOL, -0.3); ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(o.x + bobx, o.y + bob); ctx.lineTo(x, y); ctx.stroke();
        }
        D.sphere(x, y, a.r * (lifted ? 1.15 : 1), OCOL, { shadow: true, text: 'O', textScale: 0.95 });
      });
      // 남은 입자 강조
      if (CU.pairs === 6) {
        const left = cuLeft();
        if (!CU.found) left.forEach((a) => { if (!a.mol.split || a.j === 0 || true) D.ring(a.x, a.y + Math.sin(t * 1.5 + a.ph) * 3, 24, t, { color: '#f26b3a' }); });
        else {
          const m = CU.mol.find((mm) => !mm.split);
          const lab = m ? '남은 산소 분자 O₂ ' + CU.mol.filter((mm) => !mm.split).length + '개' : '남은 산소 원자 ' + left.length + '개';
          const ref = m ? m : left[0];
          D.label(ref.x, ref.y - 38, lab, { bg: '#f26b3a', size: 14 });
        }
      }
      // 안내
      const msg = CU.pairs === 0 ? '산소 분자를 눌러 쪼갠 뒤, 산소 원자를 구리 원자 옆에 놓아요' : CU.pairs < 6 ? '구리 원자와 산소 원자가 1 : 1로 결합해요 (' + CU.pairs + '/6)' : CU.found ? '구리 원자 6개 + 산소 원자 6개 → 산화 구리(CuO) 6개' : '남은 입자를 눌러 보세요';
      D.label(292, 92, msg, { bg: 'rgba(27,35,51,.88)', size: 14 });
      // 질량 비교 패널
      const PX = 586, PW = 200;
      panel(PX, 14, PW, 492, { r: 18 });
      txt('⚖️ 질량 비교', PX + PW / 2, 44, 16, COL.ink, 'center', 800);
      txt('(상대 질량 칸)', PX + PW / 2, 64, 13, COL.muted, 'center', 700);
      const base = 400, bh = 7.4;
      const nC = Math.round(CU.barC), nO = Math.round(CU.barO);
      for (let i = 0; i < nC; i++) { D.roundRect(PX + 34, base - (i + 1) * bh, 50, bh - 1.5, 2); ctx.fillStyle = i < nC ? mix('#e08a58', '#b5532b', (i % 4) / 4) : '#eee'; ctx.fill(); }
      for (let i = 0; i < nO; i++) { D.roundRect(PX + 116, base - (i + 1) * bh, 50, bh - 1.5, 2); ctx.fillStyle = '#ef6a6a'; ctx.fill(); }
      ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PX + 22, base); ctx.lineTo(PX + PW - 22, base); ctx.stroke();
      txt('구리', PX + 59, base + 20, 14, '#a14a22', 'center', 800); txt('산소', PX + 141, base + 20, 14, '#b9272d', 'center', 800);
      if (CU.pairs > 0) txt(CU.pairs * 4 + ' : ' + CU.pairs + ' = 4 : 1', PX + PW / 2, base + 48, 18, COL.sub, 'center', 800);
      else textBlock('짝을 지으면 질량 칸이 쌓여요', PX + PW / 2, 200, 150, 14, COL.muted, 'center');
      // 원자 1개의 질량
      D.roundRect(PX + 12, 452, PW - 24, 44, 12); ctx.fillStyle = '#faf7ff'; ctx.fill();
      txt('Cu 1개 = ', PX + 20, 478, 13, '#a14a22', 'left', 800);
      for (let i = 0; i < 4; i++) { D.roundRect(PX + 82 + i * 12, 468, 10, 10, 2); ctx.fillStyle = '#d2693a'; ctx.fill(); }
      txt('O =', PX + 140, 478, 13, '#b9272d', 'left', 800);
      D.roundRect(PX + 170, 468, 10, 10, 2); ctx.fillStyle = '#ef6a6a'; ctx.fill();
    },
  };

  /* =========================================================
     장면 3b · 설탕물(혼합물)
     ========================================================= */
  const SG = { sugar: 0, water: 100, hist: [], lvl: 0.4, dots: [], tilt: 0, tiltW: 0, st: 0 };
  function sgReset() { SG.sugar = 0; SG.water = 100; SG.hist = []; SG.dots = []; }
  function sgSetDots() {
    const n = Math.round(Math.min(SG.sugar, 120) / 4);
    while (SG.dots.length < n) SG.dots.push({ x: rand(0.1, 0.9), y: rand(0.2, 0.95), vx: rand(-.04, .04), vy: rand(-.04, .04), a: 0 });
    SG.dots.length = n;
  }
  function sgAdd(kind) {
    if (kind === 's') { if (SG.sugar >= 120) { showHint('설탕을 더 넣기엔 비커가 가득해요. 비우고 다시 해 봐요', 3000); return; } SG.sugar += 10; tw(SG, { tilt: 1 }, 0.25, 'outCubic', { essential: true, onDone: () => tw(SG, { tilt: 0 }, 0.4, 'outBack', { essential: true }) }); for (let i = 0; i < 6; i++) FX.emit({ x: 214 + rand(-24, 24), y: 120 + rand(-6, 6), vx: rand(-14, 14), vy: rand(60, 120), gravity: 380, life: 0.42, size: 4, color: '#fdf0cf', shape: 'square', fade: false }); }
    else { if (SG.water >= 300) { showHint('물이 가득해요. 비우고 다시 해 봐요', 3000); return; } SG.water += 50; tw(SG, { tiltW: 1 }, 0.25, 'outCubic', { essential: true, onDone: () => tw(SG, { tiltW: 0 }, 0.4, 'outBack', { essential: true }) }); for (let i = 0; i < 10; i++) FX.emit({ x: 340 + rand(-5, 5), y: 150 + rand(0, 20), vx: rand(-40, -10), vy: rand(20, 80), gravity: 420, life: 0.5, size: 3, color: '#7cc4ff' }); }
    sfx.fizz(); sgSetDots();
    if (SG.sugar > 0) { const v = SG.sugar / SG.water; if (!SG.hist.some((h) => Math.abs(h.s / h.w - v) < 1e-9)) { SG.hist.push({ s: SG.sugar, w: SG.water, pop: 0 }); const h = SG.hist[SG.hist.length - 1]; tw(h, { pop: 1 }, 0.5, 'outBack', { essential: true }); } }
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  SC.sugar = {
    enter() { showHint('설탕과 물을 마음대로 넣어 보세요', 4200); },
    update(dt) {
      const tgt = clamp((SG.water + SG.sugar * 0.35) / 340, 0.1, 0.95);
      SG.lvl = SciSim.approach(SG.lvl, tgt, dt, 4);
      SG.dots.forEach((d) => { d.a = Math.min(1, d.a + dt * 1.5); d.x += d.vx * dt + Math.sin(S.sceneT * 1.3 + d.y * 9) * 0.0015; d.y += d.vy * dt; if (d.x < 0.08 || d.x > 0.92) d.vx *= -1; if (d.y < 0.08 || d.y > 0.95) d.vy *= -1; d.x = clamp(d.x, 0.06, 0.94); d.y = clamp(d.y, 0.06, 0.97); });
    },
    draw(t) {
      room(); bench();
      // 설탕 단지
      ctx.save(); ctx.translate(76, 414); ctx.rotate(-0.7 * SG.tilt);
      D.shadow(() => { D.roundRect(-34, -64, 68, 70, 12); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); }, { blur: 8, y: 4 });
      D.roundRect(-34, -64, 68, 70, 12); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
      D.roundRect(-30, -40, 60, 42, 8); ctx.fillStyle = '#fdf6e3'; ctx.fill();
      D.roundRect(-38, -76, 76, 16, 8); ctx.fillStyle = '#8b5cf6'; ctx.fill();
      txt('설탕', 0, -14, 15, '#a67c1d', 'center', 800);
      ctx.restore();
      // 물병
      ctx.save(); ctx.translate(374, 384); ctx.rotate(-0.9 * SG.tiltW);
      D.shadow(() => { D.roundRect(-30, -62, 60, 98, 14); ctx.fillStyle = 'rgba(160,210,255,.55)'; ctx.fill(); }, { blur: 8, y: 4 });
      D.roundRect(-30, -62, 60, 98, 14); ctx.strokeStyle = '#7ca7d6'; ctx.lineWidth = 3; ctx.stroke();
      D.roundRect(-14, -78, 28, 18, 5); ctx.fillStyle = '#5b8fd1'; ctx.fill();
      txt('물', 0, 8, 17, '#2f6db8', 'center', 800);
      ctx.restore();
      // 비커
      const bx = 150, by = 164, bw = 190, bh = 252;
      D.beaker(bx, by, bw, bh, { level: SG.lvl, liquid: mix('#8fc9ff', '#ffe9b8', clamp(SG.sugar / 240, 0, 0.5)), t, ticks: 6 });
      ctx.save(); D.roundRect(bx + 3, by + 4, bw - 6, bh - 8, 8); ctx.clip();
      const ly = by + bh - bh * SG.lvl;
      SG.dots.forEach((d) => { const x = bx + d.x * bw, y = ly + 8 + d.y * (by + bh - ly - 14); ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * d.a).toFixed(2) + ')'; ctx.strokeStyle = 'rgba(255,200,90,' + (0.7 * d.a).toFixed(2) + ')'; ctx.lineWidth = 1.2; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.strokeRect(x - 3, y - 3, 6, 6); });
      ctx.restore();
      D.label(bx + bw / 2, 470, '설탕 ' + SG.sugar + ' g + 물 ' + SG.water + ' g', { bg: 'rgba(255,255,255,.94)', color: COL.ink, size: 16 });
      // 비교 카드
      const X = 408, W = 376;
      panel(X, 18, W, 150);
      txt('🧱 산화 구리(Ⅱ) — 화합물', X + 16, 46, 15, COL.ink, 'left', 800);
      D.roundRect(X + 16, 62, 150, 28, 14); ctx.fillStyle = '#d2693a'; ctx.fill(); txt('구리 4', X + 91, 82, 15, '#fff', 'center', 800);
      D.roundRect(X + 170, 62, 38, 28, 14); ctx.fillStyle = '#ef6a6a'; ctx.fill(); txt('산소 1', X + 240, 82, 15, '#b9272d', 'center', 800);
      D.label(X + W / 2, 126, '질량비 구리 : 산소 = 4 : 1  (항상 일정)', { bg: '#e6f7ee', color: '#0b7a41', size: 14 });
      panel(X, 184, W, 288);
      txt('🧃 설탕물 — 혼합물', X + 16, 212, 15, COL.ink, 'left', 800);
      textBlock('성분비가 정해져 있지 않아서 마음대로 달라져요', X + 16, 236, W - 32, 14, COL.muted, 'left');
      txt('만든 설탕 : 물 (질량)', X + 16, 280, 14, COL.ink, 'left', 800);
      if (!SG.hist.length) txt('아직 없어요', X + 16, 316, 14, '#9aa5b6', 'left', 700);
      SG.hist.slice(-8).forEach((h, i) => {
        const col = i % 2, row = Math.floor(i / 2), g = gcd(h.s, h.w);
        const px = X + 16 + col * 176, py = 296 + row * 40;
        ctx.save(); ctx.translate(px + 80, py + 16); ctx.scale(h.pop, h.pop);
        D.roundRect(-80, -16, 160, 32, 16); ctx.fillStyle = '#fff4dd'; ctx.fill(); ctx.strokeStyle = '#f4c77a'; ctx.lineWidth = 2; ctx.stroke();
        txt(h.s + ' : ' + h.w + (g > 1 ? '  = ' + (h.s / g) + ' : ' + (h.w / g) : ''), 0, 5, 14, '#8a5a00', 'center', 800);
        ctx.restore();
      });
    },
  };

  /* =========================================================
     장면 4a · 마그네슘 연소 (3 : 2)
     ========================================================= */
  const MG = { amt: 6, phase: 'idle', pt: 0, p: 0, flame: 0, scale: 6, bp: 0, hist: [], grains: [] };
  const MGX = 160, MGPAN = 418, MCS = 1.7;
  const mgOut = (a) => a * 5 / 3;
  function mgInit() {
    MG.phase = 'idle'; MG.pt = 0; MG.p = 0; MG.flame = 0; MG.scale = MG.amt; MG.bp = 0;
    MG.grains = []; for (let i = 0; i < 70; i++) MG.grains.push({ x: rand(-34, 34), y: -rand(3, 20 * (1 - Math.pow(Math.abs(MG.grains.length ? 0 : 0), 2)) + 6), r: rand(2.4, 4), th: Math.random() });
    MG.grains.forEach((g) => { g.y = -rand(3, 4 + 22 * (1 - Math.pow(Math.abs(g.x) / 38, 2))); });
    syncControls();
  }
  mgInit();
  function mgBurn() {
    if (MG.phase !== 'idle') { mgInit(); return; }
    MG.phase = 'burn'; MG.pt = 0; sfx.zap(); hideHint(); syncControls();
  }
  const MG_DUR = 2.6;
  SC.mg = {
    enter() { if (MG.phase === 'idle') showHint('마그네슘 양을 고르고 🔥 태우기를 눌러 보세요', 4600); },
    update(dt) {
      if (MG.phase === 'burn') {
        MG.pt += dt; MG.p = clamp(MG.pt / MG_DUR, 0, 1);
        MG.flame = SciSim.approach(MG.flame, 1, dt, 10);
        for (let i = 0; i < 2; i++) if (Math.random() < dt * 40) FX.emit({ x: MGX + rand(-36, 36), y: MGPAN - 90 + rand(-8, 8), vx: rand(-110, 110), vy: -rand(40, 170), gravity: 280, life: rand(0.35, 0.7), size: rand(1.6, 3), color: Math.random() < 0.5 ? '#ffffff' : '#bfe0ff', shape: Math.random() < 0.4 ? 'star' : 'circle' });
        if (Math.random() < dt * 8) FX.emit({ x: MGX + rand(-26, 26), y: MGPAN - 100, vx: rand(-6, 6), vy: -rand(30, 60), life: 1.2, size: 8, grow: 14, color: '#f3f5f8', shape: 'smoke', alpha: 0.75 });
        if (MG.p >= 1) {
          MG.phase = 'done'; sfx.thud();
          tw(MG, { bp: 1 }, 0.9, 'outCubic', { essential: true });
          if (!MG.hist.some((h) => h.a === MG.amt)) { MG.hist.push({ a: MG.amt, pop: 0 }); const h = MG.hist[MG.hist.length - 1]; tw(h, { pop: 1 }, 0.5, 'outBack', { essential: true }); MG.hist.sort((a, b) => a.a - b.a); }
          later(0.5, () => okFx(MGX, MGPAN - 100, COL.good));
          syncControls();
        }
      } else MG.flame = SciSim.approach(MG.flame, 0, dt, 9);
      MG.scale = MG.phase === 'done' ? numRoll(MG.scale, mgOut(MG.amt), dt, 5) : MG.scale;
    },
    draw(t) {
      room(); bench();
      balance(MGX - 115, MGPAN - 26, 230, MG.scale, { dec: 1 });
      txt('전자저울', MGX, MGPAN + 66, 13, COL.muted, 'center', 800);
      // 도가니: 리본 → 흰 가루
      const burnP = MG.p;
      crucible(MGX, MGPAN - 2, () => {
        // 가루
        MG.grains.forEach((g) => {
          const a = clamp((burnP - g.th * 0.8) * 6, 0, 1); if (a <= 0) return;
          ctx.fillStyle = 'rgba(250,250,252,' + a.toFixed(2) + ')'; ctx.beginPath(); ctx.arc(g.x, g.y, g.r + 0.8, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(210,216,226,' + (a * 0.6).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(g.x + 1, g.y + 1.2, g.r * 0.6, 0, TAU); ctx.fill();
        });
        // 리본
        const len = (22 + MG.amt * 3.2) * (1 - burnP);
        if (len > 1) {
          ctx.strokeStyle = '#aab4c3'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
          for (let i = 0; i <= 26; i++) { const k = i / 26, x = -40 + k * 80 * (len / (22 + MG.amt * 3.2)) , y = -12 - Math.abs(Math.sin(k * 7)) * 14 * (0.5 + 0.5 * k) - 4; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; ctx.stroke();
        }
      }, MCS);
      if (MG.flame > 0.03) {
        const fy = MGPAN - 80;
        D.flame(MGX, fy, 128 * MG.flame, t, { base: 'rgba(255,255,255,.98)', core: 'rgba(120,180,255,.95)', glow: '#bfe6ff' });
        D.glow(MGX, fy - 30, 150 * MG.flame, '#ffffff', 0.5 * MG.flame);
      }
      txt(MG.phase === 'done' ? '흰색 산화 마그네슘(MgO)' : '은백색 마그네슘(Mg)', MGX, 128, 15, COL.ink, 'center', 800);
      D.label(MGX, 160, '마그네슘 ' + MG.amt + ' g', { bg: '#475569', size: 14 });
      // 막대
      const X = 420, W = 362, base = 304, k = 14.5;
      panel(X, 16, W, 332);
      txt('⚖️ 질량 변화', X + W / 2, 44, 16, COL.ink, 'center', 800);
      ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 24, base); ctx.lineTo(X + W - 24, base); ctx.stroke();
      const bw = 78, b1 = X + 62, b2 = X + 218;
      const hMg = MG.amt * k, hO = mgOut(MG.amt) * k - hMg;
      // 반응 전
      D.roundRect(b1, base - hMg, bw, hMg, 8); ctx.fillStyle = '#aab4c3'; ctx.fill();
      txt('Mg ' + MG.amt.toFixed(1) + ' g', b1 + bw / 2, base - hMg / 2 + 5, 15, '#fff', 'center', 800, { stroke: 'rgba(60,70,90,.4)', strokeWidth: 3 });
      txt('반응 전', b1 + bw / 2, base + 24, 14, COL.muted, 'center', 800);
      // 반응 후
      D.roundRect(b2, base - hMg, bw, hMg, 8); ctx.fillStyle = '#aab4c3'; ctx.fill();
      txt('Mg ' + MG.amt.toFixed(1) + ' g', b2 + bw / 2, base - hMg / 2 + 5, 15, '#fff', 'center', 800, { stroke: 'rgba(60,70,90,.4)', strokeWidth: 3 });
      if (MG.bp > 0.01) {
        const oh = hO * MG.bp;
        D.roundRect(b2, base - hMg - oh, bw, oh + 6, 8); ctx.fillStyle = '#7cc4ff'; ctx.fill();
        if (oh > 18) txt('O ' + (mgOut(MG.amt) - MG.amt).toFixed(1) + ' g', b2 + bw / 2, base - hMg - oh / 2 + 5, 15, '#fff', 'center', 800, { stroke: 'rgba(30,80,140,.5)', strokeWidth: 3 });
        if (MG.bp > 0.9) D.label(b2 + bw / 2, base - hMg - oh - 20, 'MgO ' + mgOut(MG.amt).toFixed(1) + ' g', { bg: '#1b2333', size: 14 });
      } else { D.roundRect(b2, base - hMg - 4, bw, 4, 2); ctx.fillStyle = 'rgba(124,196,255,.4)'; ctx.fill(); }
      txt('반응 후', b2 + bw / 2, base + 24, 14, COL.muted, 'center', 800);
      D.arrow(b1 + bw + 14, base - 50, b2 - 14, base - 50, { color: '#8a95a6', width: 3, head: 11 });
      txt('+ 산소', (b1 + bw + b2) / 2, base - 62, 13, '#2f7de1', 'center', 800);
      // 기록
      panel(X, 360, W, 148);
      txt('📋 기록', X + 16, 386, 14, COL.ink, 'left', 800);
      MG.hist.forEach((h, i) => {
        ctx.save(); ctx.translate(X + W / 2, 410 + i * 30); ctx.scale(h.pop, h.pop);
        txt('마그네슘 ' + h.a + ' g + 산소 ' + (mgOut(h.a) - h.a).toFixed(0) + ' g → 산화 마그네슘 ' + mgOut(h.a).toFixed(0) + ' g', 0, 5, 14, COL.ink, 'center', 700);
        ctx.restore();
      });
      if (MG.hist.length >= 2) D.label(X + W / 2, 492, '마그네슘 : 산소 = 3 : 2  (항상 일정)', { bg: '#e6f7ee', color: '#0b7a41', size: 14 });
      else if (!MG.hist.length) txt('태워 보면 여기에 기록돼요', X + W / 2, 440, 14, '#9aa5b6', 'center', 700);
    },
  };

  /* =========================================================
     장면 4b · 수소 + 산소 → 물 (1 : 8)
     ========================================================= */
  const WT = { o: 20, phase: 'idle', pt: 0, bp: 0, hist: [], flash: 0, drops: 0, ran: {} };
  const wtRes = (o) => { const k = Math.min(2, o / 8); return { water: 9 * k, hUsed: k, oUsed: 8 * k, hLeft: 2 - k, oLeft: o - 8 * k }; };
  function wtInit() { WT.phase = 'idle'; WT.pt = 0; WT.bp = 0; WT.flash = 0; WT.drops = 0; syncControls(); }
  function wtRun() {
    if (WT.phase !== 'idle') { wtInit(); return; }
    WT.phase = 'run'; WT.pt = 0; sfx.zap(); hideHint(); syncControls();
  }
  SC.water = {
    enter() { if (WT.phase === 'idle') showHint('수소 2 g과 반응시킬 산소의 양을 골라 보세요', 4600); },
    update(dt) {
      if (WT.phase === 'run') {
        WT.pt += dt;
        if (WT.pt > 0.9 && WT.pt < 1.1) WT.flash = 1;
        WT.flash = SciSim.approach(WT.flash, 0, dt, 5);
        if (WT.pt > 1.0) WT.drops = SciSim.approach(WT.drops, 1, dt, 1.6);
        if (WT.pt > 2.2) {
          WT.phase = 'done'; tw(WT, { bp: 1 }, 1.0, 'outCubic', { essential: true });
          const r = wtRes(WT.o); WT.ran[WT.o] = true;
          if (!WT.hist.some((h) => h.o === WT.o)) WT.hist.push({ o: WT.o, pop: 0 }), tw(WT.hist[WT.hist.length - 1], { pop: 1 }, 0.5, 'outBack', { essential: true });
          later(0.6, () => okFx(180, 250, COL.good));
          syncControls();
        }
      }
    },
    draw(t) {
      room(); bench();
      const r = wtRes(WT.o);
      // 플라스크
      const fx = 180, fby = BENCH_Y + 10;
      D.flask(fx, fby, 230, 270, { level: 0, t });
      ctx.save(); ctx.beginPath(); ctx.arc(fx, fby - 90, 76, 0, TAU); ctx.clip();
      const nH = 6, nO = Math.round(WT.o / 4);
      const gas = (i, n, col, lab, off) => {
        const a = i * 2.399 + off, rr = 14 + (i * 13) % 56;
        let x = fx + Math.cos(a + t * 0.6 * (i % 2 ? 1 : -1)) * rr * 0.9, y = fby - 90 + Math.sin(a * 1.3 + t * 0.7) * rr * 0.9;
        return { x, y };
      };
      const phase = WT.phase === 'idle' ? 0 : clamp((WT.pt - 0.9) / 0.8, 0, 1) * (WT.phase === 'done' ? 1 : 1);
      for (let i = 0; i < 6; i++) { const q = gas(i, 6, '#e8edf5', 'H', 0); const used = i < Math.round(r.hUsed * 3); const al = used ? 1 - phase : 1; if (al > 0.02) { ctx.globalAlpha = al; D.sphere(q.x, q.y, 7, '#cfd8e6', { outline: '#98a6bb', outlineWidth: 1.5 }); ctx.globalAlpha = 1; } }
      for (let i = 0; i < nO; i++) { const q = gas(i + 7, nO, OCOL, 'O', 1); const usedN = Math.round(r.oUsed / 4); const used = i < usedN; const al = used ? 1 - phase : 1; if (al > 0.02) { ctx.globalAlpha = al; D.sphere(q.x, q.y, 9, OCOL, { text: 'O', textScale: 1 }); ctx.globalAlpha = 1; } }
      ctx.restore();
      if (WT.flash > 0.02) D.glow(fx, fby - 90, 120, '#ffe9a8', 0.7 * WT.flash);
      if (WT.phase === 'run' && WT.pt < 0.9) { D.spark(fx, fby - 125, 16, t * 2.4, '#fff3a8'); if (Math.random() < 0.3) FX.emit({ x: fx + rand(-10, 10), y: fby - 125, vx: rand(-60, 60), vy: rand(-60, 20), life: 0.3, size: 2, color: '#fff3a8', gravity: 100 }); }
      // 물방울
      for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.4, d = WT.drops * (0.55 + (i % 3) * 0.12); if (WT.drops > 0.05 && r.water > 0.5) { ctx.fillStyle = 'rgba(100,170,240,' + (0.85 * clamp(WT.drops * 1.4 - i * 0.05, 0, 1)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 62 * d, fby - 60 + Math.sin(a * 1.7) * 18 * d + 34 * d, 3.2 + (i % 3), 0, TAU); ctx.fill(); } }
      D.label(fx, 176, WT.phase === 'idle' ? '수소 2 g + 산소 ' + WT.o + ' g' : WT.phase === 'run' ? '전기 불꽃!' : '물 ' + r.water.toFixed(0) + ' g 생성', { bg: '#1b2333', size: 14 });
      // 막대
      const X = 392, W = 392, base = 292, k = 9;
      panel(X, 16, W, 332);
      txt('⚖️ 질량 변화 (g)', X + W / 2, 44, 16, COL.ink, 'center', 800);
      ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 20, base); ctx.lineTo(X + W - 20, base); ctx.stroke();
      const bw = 52;
      const bar = (x, h, col, label, val) => { if (h < 0.5) return; D.roundRect(x, base - h, bw, h + 0, 6); ctx.fillStyle = col; ctx.fill(); if (val != null) txt(val, x + bw / 2, base - h - 8, 14, COL.ink, 'center', 800); };
      // 반응 전
      bar(X + 28, 2 * k, '#cfd8e6', 'H', '2'); txt('수소', X + 28 + bw / 2, base + 22, 14, COL.muted, 'center', 800);
      bar(X + 92, WT.o * k, '#ef6a6a', 'O', String(WT.o)); txt('산소', X + 92 + bw / 2, base + 22, 14, COL.muted, 'center', 800);
      txt('반응 전', X + 92, 76, 14, COL.muted, 'center', 800);
      D.arrow(X + 158, base - 90, X + 190, base - 90, { color: '#8a95a6', width: 3, head: 10 });
      // 반응 후
      const bp = WT.bp, ex = X + 214;
      if (bp > 0.01) {
        const hh = r.hUsed * k * bp, oh = r.oUsed * k * bp;
        D.roundRect(ex, base - hh - oh, bw, hh + oh, 6); ctx.fillStyle = '#7cc4ff'; ctx.fill();
        D.roundRect(ex, base - hh, bw, hh, 6); ctx.fillStyle = '#b6c2d6'; ctx.fill();
        txt('물 ' + r.water.toFixed(0) + ' g', ex + bw / 2, base - hh - oh - 8, 14, COL.ink, 'center', 800);
        const lh = (r.oLeft > 0.01 ? r.oLeft : r.hLeft) * k * bp, lc = r.oLeft > 0.01 ? '#ef6a6a' : '#cfd8e6';
        if (lh > 1) { D.roundRect(ex + 70, base - lh, bw, lh, 6); ctx.fillStyle = lc; ctx.fill(); txt((r.oLeft > 0.01 ? '산소 ' + r.oLeft.toFixed(0) : '수소 ' + r.hLeft.toFixed(0)) + ' g', ex + 70 + bw / 2, base - lh - 8, 14, '#c8323a', 'center', 800); }
        txt('남은 ' + (r.oLeft > 0.01 ? '산소' : r.hLeft > 0.01 ? '수소' : '것 없음'), ex + 70 + bw / 2, base + 22, 14, COL.muted, 'center', 800);
      }
      txt('물', ex + bw / 2, base + 22, 14, COL.muted, 'center', 800);
      txt('반응 후', ex + 40, 76, 14, COL.muted, 'center', 800);
      // 비
      panel(X, 360, W, 148);
      txt('💧 물 18 g = 수소 2 g + 산소 16 g', X + W / 2, 392, 15, COL.ink, 'center', 800);
      D.label(X + W / 2, 428, '수소 : 산소 = 1 : 8 (항상 일정)', { bg: '#e6f7ee', color: '#0b7a41', size: 15 });
      if (WT.phase === 'done') textBlock('수소 2 g은 산소 16 g과 결합해요. ' + (WT.o > 16 ? '산소 ' + (WT.o - 16) + ' g은 반응하지 못하고 남아요.' : WT.o < 16 ? '산소가 모자라 수소 ' + r.hLeft.toFixed(0) + ' g이 남아요.' : '남는 물질이 없어요.'), X + 24, 462, W - 48, 14, COL.ink, 'left', 20, 700);
      else textBlock('반응시키기를 누르면 물이 생기고 남는 기체가 있는지 알 수 있어요', X + 24, 462, W - 48, 14, COL.muted, 'left', 20, 700);
    },
  };

  /* =========================================================
     컨트롤 연결
     ========================================================= */
  function syncControls() {
    if (!CTRL_READY) return;
    dis('heatBtn', LAB.busy); dis('labResetBtn', LAB.busy || LAB.round === 0);
    q('heatBtn').textContent = LAB.stable ? '🔥 더 가열해 보기' : LAB.round === 0 ? '🔥 가열하며 젓기' : '🔥 한 번 더 가열';
    dis('recvBtn', GD.got); dis('fitBtn', GD.fitted || plottedN() < 4 || !GD.got); dis('gdResetBtn', !GD.got);
    dis('autoBtn', CU.auto || CU.pairs >= 6); dis('cuoResetBtn', CU.auto);
    q('mgBtn').textContent = MG.phase === 'idle' ? '🔥 태우기' : MG.phase === 'burn' ? '태우는 중…' : '↺ 다시 하기'; dis('mgBtn', MG.phase === 'burn');
    q('wtBtn').textContent = WT.phase === 'idle' ? '💧 반응시키기' : WT.phase === 'run' ? '반응 중…' : '↺ 다시 하기'; dis('wtBtn', WT.phase === 'run');
    $$('#mgAmt button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === MG.amt); b.disabled = MG.phase === 'burn'; });
    $$('#wtAmt button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === WT.o); b.disabled = WT.phase === 'run'; });
  }
  function syncReadouts() {
    const sc = S.scene;
    if (sc === 'lab') {
      setR('rC', u('2.00', ' g')); setR('rRound', u(LAB.round, '회')); setR('rMass', u(LAB.scaleVal.toFixed(2), ' g'));
      setR('rO', LAB.phase === 'weigh' || LAB.phase === 'idle' ? u((LAB.mass - 2).toFixed(2), ' g') : '…');
    } else if (sc === 'graph') {
      setR('rPts', u(plottedN() + '/4', '개')); setR('rSlope', GD.fitted ? u(GD.slope.toFixed(2), '') : '-'); setR('rRatio', GD.fitted ? Math.round(GD.ratio) + ' : 1' : '-');
    } else if (sc === 'cuo') {
      setR('rPair', u(CU.pairs + '/6', '쌍')); setR('rLeftO', u(cuLeft().length, '개')); setR('rMR', CU.pairs ? CU.pairs * 4 + ' : ' + CU.pairs : '-');
    } else if (sc === 'sugar') {
      setR('rSug', u(SG.sugar, ' g')); setR('rWat', u(SG.water, ' g')); setR('rSW', SG.sugar ? (() => { const g = gcd(SG.sugar, SG.water); return SG.sugar / g + ' : ' + SG.water / g; })() : '-');
    } else if (sc === 'mg') {
      setR('rMg', u(MG.amt.toFixed(1), ' g')); setR('rMgO', MG.phase === 'done' ? u((mgOut(MG.amt) - MG.amt).toFixed(1), ' g') : '-'); setR('rMgOx', MG.phase === 'done' ? u(mgOut(MG.amt).toFixed(1), ' g') : '-');
    } else if (sc === 'water') {
      const r = wtRes(WT.o);
      setR('rH', u('2', ' g')); setR('rO2', u(WT.o, ' g')); setR('rWa', WT.phase === 'done' ? u(r.water.toFixed(0), ' g') : '-');
    }
  }
  setInterval(() => { syncReadouts(); syncControls(); }, 150);

  q('heatBtn').addEventListener('click', () => { Sound.click(); labRound(); syncControls(); });
  q('labResetBtn').addEventListener('click', () => { Sound.click(); labInit(); syncControls(); });
  q('recvBtn').addEventListener('click', () => { Sound.click(); gdReceive(); syncControls(); });
  q('fitBtn').addEventListener('click', () => { Sound.click(); gdFit(); syncControls(); });
  q('gdResetBtn').addEventListener('click', () => { Sound.click(); gdInit(); syncControls(); });
  q('autoBtn').addEventListener('click', () => { Sound.click(); cuAuto(); syncControls(); });
  q('cuoResetBtn').addEventListener('click', () => { Sound.click(); cuInit(); syncControls(); });
  q('sugarBtn').addEventListener('click', () => { Sound.click(); sgAdd('s'); });
  q('waterAddBtn').addEventListener('click', () => { Sound.click(); sgAdd('w'); });
  q('sugarResetBtn').addEventListener('click', () => { Sound.click(); sgReset(); });
  q('mgBtn').addEventListener('click', () => { Sound.click(); mgBurn(); });
  q('wtBtn').addEventListener('click', () => { Sound.click(); wtRun(); });
  $$('#mgAmt button').forEach((b) => b.addEventListener('click', () => { Sound.click(); MG.amt = +b.dataset.v; mgInit(); }));
  $$('#wtAmt button').forEach((b) => b.addEventListener('click', () => { Sound.click(); WT.o = +b.dataset.v; wtInit(); }));
  q('resetBtn').addEventListener('click', () => {
    Sound.click();
    ({ lab: labInit, graph: gdInit, cuo: cuInit, sugar: sgReset, mg: mgInit, water: wtInit })[S.scene]();
    syncControls();
  });

  /* =========================================================
     미션
     ========================================================= */
  const FIG_CUO = '<svg viewBox="0 0 260 110" width="260" height="110" role="img" aria-label="구리 원자 1개와 산소 원자 1개가 결합한 산화 구리 모형"><defs><radialGradient id="gC" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#f6c3a4"/><stop offset=".55" stop-color="#d2693a"/><stop offset="1" stop-color="#8d3d1b"/></radialGradient><radialGradient id="gO2" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffb4b4"/><stop offset=".55" stop-color="#ef4b4b"/><stop offset="1" stop-color="#a82a2a"/></radialGradient></defs><circle cx="90" cy="52" r="34" fill="url(#gC)"/><text x="90" y="60" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">Cu</text><circle cx="156" cy="52" r="24" fill="url(#gO2)"/><text x="156" y="60" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">O</text><text x="123" y="102" text-anchor="middle" font-size="14" font-weight="800" fill="#5d6879">산화 구리(CuO) 1쌍</text></svg>';

  game = SciSim.game({
    simId: 'm3-definite-proportions',
    mount: '#game',
    badge: '성분비 탐정',
    homeHref: '../../index.html#g3',
    featureLabels: {
      lab: '🔥 구리 가열 실험대',
      graph: '📊 모둠 데이터 보드 · 그래프',
      fit: '📏 직선 긋기',
      cuo: '🧩 원자 짝짓기 모형',
      sugar: '🧃 설탕물(혼합물) 비교',
      mg: '⚡ 마그네슘 연소',
      water: '💧 물 생성',
    },
    onFeatures(set) { F = set; if (game) refreshUI(); },
    onHint(m) { if (m.focus) pulseEl('#' + m.focus); },
    onMissionStart(m) { if (game && game.free) return; if (m.scene) setScene(m.scene, true); refreshUI(); },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '구리를 가열하면 어떻게 될까?', short: '구리의 산화', icon: '🔥', phase: '실험',
        features: ['lab'],
        intro: '<p class="si-q">❓ 탐구 질문: 구리를 가열하면 산소와 아무 비율로나 결합할까?</p>' +
          '<p>도가니 속 <b>붉은 구리 가루 2.00 g</b>을 가열하면서 저어 주면 색이 변해요. 식힌 뒤 질량을 재고, <b>질량이 더 이상 변하지 않을 때까지</b> 반복해 봐요.</p>' +
          '<p>구리 + 산소 → <b>산화 구리(Ⅱ)</b> (검은색)</p>',
        setup() { setScene('lab', true); },
        recap: '구리는 산소와 결합해 검은색 산화 구리(Ⅱ)가 되고, 구리 2.00 g은 산소 0.50 g과 결합해 2.50 g이 돼요.',
        summary: '<span class="formula" style="font-size:15px">구리 + 산소 → 산화 구리(Ⅱ)<br>2.00 g + 0.50 g = 2.50 g</span>' +
          '<ul><li>가열하면 붉은 구리가 <b>검게</b> 변하고 질량이 <b>늘어요</b> (산소가 결합).</li><li>구리가 모두 반응하면 질량이 더 이상 늘지 않아요(<b>일정</b>).</li></ul>' +
          '<div class="note">결합한 산소의 질량 = 산화 구리의 질량 − 처음 구리의 질량</div>',
        missions: [
          {
            title: '질량이 일정해질 때까지 가열', scene: 'lab', focus: 'heatBtn',
            goal: '구리 가루를 가열하고 저은 뒤 질량을 재요. 질량이 더 이상 늘지 않을 때까지 반복해 보세요.',
            hint: '🔥 버튼을 계속 눌러요. 그래프의 점이 수평선이 되면 끝!',
            setup() { labInit(); setScene('lab', true); syncControls(); },
            check: () => LAB.stable && !LAB.busy, hold: 0.5,
            status: () => '가열 <b>' + LAB.round + '회</b> · 질량 <b>' + LAB.scaleVal.toFixed(2) + ' g</b> · 일정해짐 ' + MARK(LAB.stable),
            explain: '구리가 공기 중의 산소와 결합해 <b>산화 구리(Ⅱ)</b>가 되면서 질량이 늘었어요. 구리가 모두 반응하면 더 결합할 구리가 없으므로 질량이 <b>2.50 g에서 일정</b>해져요.',
          },
          {
            type: 'quiz', title: '결합한 산소의 질량', scene: 'lab',
            goal: '구리 2.00 g이 모두 반응하여 산화 구리(Ⅱ) 2.50 g이 되었어요. 구리와 결합한 산소는 몇 g일까요?',
            choices: ['0.50 g', '2.00 g', '2.50 g', '4.50 g'],
            answer: 0,
            feedback: ['', '2.00 g은 처음 구리의 질량이에요.', '2.50 g은 산화 구리 전체의 질량이에요. 구리 몫을 빼 보세요.', '구리와 산화 구리를 더하는 게 아니라 질량의 차이를 구해요.'],
            explain: '결합한 산소 = 2.50 g − 2.00 g = <b>0.50 g</b>. 구리 : 산소 = 2.00 : 0.50 = <b>4 : 1</b>이에요.',
          },
        ],
      },
      {
        title: '그래프로 질량비 찾기', short: '질량비 그래프', icon: '📈', phase: '분석',
        features: ['graph', 'fit'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 구리 2.00 g은 산소 0.50 g과 결합했어요.</div>' +
          '<p>구리의 양이 달라지면 결합하는 산소의 양은 어떻게 될까요? 여러 모둠이 실험한 <b>데이터를 모아</b> 그래프로 나타내 봐요.</p>',
        setup() { setScene('graph', true); },
        recap: '구리와 결합한 산소의 질량은 구리의 질량에 비례해요. 구리 : 산소 = 4 : 1 로 일정해요.',
        summary: sumTable([['1모둠', '1.0', '1.26', '0.26'], ['2모둠', '2.0', '2.49', '0.49'], ['3모둠', '3.0', '3.76', '0.76'], ['4모둠', '4.0', '4.98', '0.98']], ['모둠', '구리(g)', '산화 구리(g)', '산소(g)']) +
          '<ul><li>점들이 <b>원점을 지나는 직선</b> 위에 있어요.</li><li>구리 : 산소 = <b>4 : 1</b> (질량비 일정) — <b>일정 성분비 법칙</b></li></ul>',
        missions: [
          {
            title: '점 4개 찍기', scene: 'graph', focus: 'recvBtn',
            goal: '모둠 데이터를 받아 카드를 그래프 위로 끌어다 놓으세요(눌러도 돼요). 점을 4개 찍어요.',
            hint: '카드를 끌어서 오른쪽 그래프 위에 놓아요. 가로는 구리 질량, 세로는 결합한 산소 질량이에요.',
            setup() { gdInit(); setScene('graph', true); syncControls(); },
            check: () => plottedN() === 4 && GD.tokens.length === 0, hold: 0.5,
            status: () => '받은 데이터 ' + MARK(GD.got) + ' · 찍은 점 <b>' + plottedN() + '/4</b>',
            explain: '결합한 산소의 질량은 <b>(산화 구리의 질량) − (구리의 질량)</b>으로 구해요. 측정 오차가 조금 있어서 점이 직선에서 아주 약간 벗어날 수 있어요.',
          },
          {
            title: '직선 긋기', scene: 'graph', focus: 'fitBtn',
            goal: '점들을 지나는 직선을 그어 보세요. 직선은 어디를 지나갈까요?',
            hint: '점 4개를 모두 찍은 뒤 📏 직선 긋기를 눌러요. 점을 눌러 구리 : 산소를 확인해 봐도 좋아요.',
            check: () => GD.fitted && GD.fitP >= 1, hold: 0.8,
            status: () => '점 ' + plottedN() + '/4 · 직선 ' + MARK(GD.fitted),
            explain: '점들이 <b>원점을 지나는 직선</b> 위에 놓였어요. 직선 위의 어느 점에서도 구리 : 산소 ≈ <b>4 : 1</b>이에요.',
          },
          {
            type: 'quiz', title: '직선이 뜻하는 것', scene: 'graph',
            goal: '그래프가 원점을 지나는 직선이에요. 이것으로 알 수 있는 것은?',
            choices: ['구리의 양이 달라져도 구리와 산소의 질량비는 일정하다.', '구리가 많을수록 구리와 결합하는 산소의 비율이 커진다.', '구리의 양과 관계없이 항상 같은 질량의 산소가 결합한다.', '구리 4 g일 때만 산소가 결합한다.'],
            answer: 0,
            feedback: ['', '비율이 커지면 직선이 아니라 위로 휘어진 곡선이 돼요.', '산소의 질량은 구리의 질량에 비례해 늘어나요. 수평선이 아니에요.', '모든 점이 한 직선 위에 있어요. 어떤 양에서도 4 : 1이에요.'],
            explain: '구리의 질량이 2배, 3배가 되면 결합하는 산소의 질량도 2배, 3배가 돼요(<b>비례</b>). 그래서 구리 : 산소 = 4 : 1로 일정해요. 이것이 <b>일정 성분비 법칙</b>이에요.',
          },
        ],
      },
      {
        title: '입자 모형으로 보기', short: '입자 모형', icon: '🧩', phase: '모형',
        features: ['cuo', 'sugar'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 구리 : 산소 질량비가 언제나 4 : 1임을 알았어요.</div>' +
          '<p>왜 항상 같을까요? 구리 원자와 산소 원자는 <b>1개씩 짝</b>을 지어 결합하고, 원자 1개의 질량이 정해져 있기 때문이에요. 모형으로 확인하고, 혼합물인 <b>설탕물</b>과 비교해 봐요.</p>',
        setup() { setScene('cuo', true); },
        recap: '구리 원자와 산소 원자가 1 : 1로 결합하고 원자 1개의 질량이 정해져 있어서 질량비가 일정해요.',
        summary: '<span class="formula" style="font-size:15px">Cu 1개 + O 1개 → CuO 1쌍<br>질량 칸 수 4 : 1 (항상)</span>' +
          '<ul><li>산소는 O₂ 분자로 있다가 원자로 나뉘어 구리와 짝을 지어요.</li><li>남은 산소 분자는 반응하지 못하고 그대로 남아요.</li><li><b>혼합물(설탕물)</b>은 성분비가 일정하지 않아요.</li><li>성분비가 일정하므로 산화 구리를 언제나 <b>CuO</b>로 나타낼 수 있어요.</li></ul>',
        missions: [
          {
            title: '남는 입자 찾기', scene: 'cuo', focus: 'autoBtn',
            goal: '구리 원자 6개와 산소 분자 4개가 있어요. 산소 원자를 구리 원자와 1개씩 짝지은 뒤, 남는 입자를 눌러 찾으세요.',
            hint: '산소 분자를 눌러 쪼개요. 산소 원자를 구리 원자 옆으로 끌어다 놓아요. 어렵다면 ✨ 자동으로 짝짓기!',
            setup() { cuInit(); setScene('cuo', true); syncControls(); },
            check: () => CU.pairs === 6 && CU.found, hold: 0.4,
            status: () => '짝 <b>' + CU.pairs + '/6</b> · 남는 입자 찾기 ' + MARK(CU.found),
            explain: '구리 원자 6개는 산소 <b>원자</b> 6개(= 산소 분자 3개)와 짝을 지어요. 그러면 <b>산소 분자 1개가 남아요</b>. 원자 1개의 질량이 정해져 있으니 구리와 산소의 질량비는 언제나 4 : 1이에요.',
          },
          {
            title: '설탕물은 어떨까?', scene: 'sugar', focus: 'sugarBtn',
            goal: '설탕물은 혼합물이에요. 설탕과 물을 마음대로 넣어 서로 다른 설탕 : 물 비율을 3가지 만들어 보세요.',
            hint: '🥄 설탕과 💧 물을 번갈아 넣어요. 오른쪽 상자에 비율이 쌓여요.',
            setup() { sgReset(); setScene('sugar', true); },
            check: () => SG.hist.length >= 3, hold: 0.5,
            status: () => '만든 비율 <b>' + SG.hist.length + '/3</b>가지',
            explain: '설탕물은 설탕과 물을 <b>얼마든지</b> 섞을 수 있어서 성분비가 정해져 있지 않아요(혼합물). 하지만 산화 구리 같은 <b>화합물</b>은 성분 원소의 질량비가 언제나 일정해요.',
          },
          {
            type: 'quiz', title: '화학식의 근거', scene: 'cuo', figure: FIG_CUO,
            goal: '일정 성분비 법칙이 화합물을 화학식으로 나타낼 수 있는 근거가 되는 까닭은?',
            choices: ['화합물은 성분 원소가 일정한 비율로 결합하므로, 언제나 같은 화학식(예: CuO)으로 나타낼 수 있다.', '화합물을 이루는 원소의 질량이 모두 같기 때문이다.', '화학식은 화합물마다 마음대로 정해도 되기 때문이다.', '혼합물도 성분비가 일정하여 화학식으로 나타낼 수 있기 때문이다.'],
            answer: 0,
            feedback: ['', '구리와 산소의 질량은 같지 않아요(4 : 1). 원자의 개수비와 질량비는 달라요.', '성분비가 일정하기 때문에 화학식이 하나로 정해지는 거예요.', '혼합물은 성분비가 달라질 수 있어서 화학식으로 나타내지 못해요.'],
            explain: '물은 어디에서 얻든 언제나 수소와 산소가 일정한 비율로 결합해 있어서 <b>H₂O</b>라는 하나의 화학식으로 나타낼 수 있어요. 일정 성분비 법칙은 화학식의 근거예요.',
          },
        ],
      },
      {
        title: '다른 화합물에도 성립할까?', short: '적용', icon: '🧱', phase: '적용',
        features: ['mg', 'water'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화합물은 성분 원소의 질량비가 언제나 일정하다고 정리했어요.</div>' +
          '<p>다른 화합물에서도 질량비가 일정할까요? <b>마그네슘</b>을 태워 산화 마그네슘을 만들고, 수소와 산소로 <b>물</b>을 만들어 보며 확인해 봐요.</p>',
        setup() { setScene('mg', true); },
        recap: '산화 마그네슘은 마그네슘 : 산소 = 3 : 2, 물은 수소 : 산소 = 1 : 8 로 질량비가 언제나 일정해요.',
        summary: sumTable([['산화 구리(Ⅱ)', '구리 : 산소', '4 : 1'], ['산화 마그네슘', '마그네슘 : 산소', '3 : 2'], ['물', '수소 : 산소', '1 : 8']], ['화합물', '성분 원소', '질량비']) +
          '<ul><li>질량비대로 반응하고, 남는 성분은 반응하지 못해요.</li></ul><div class="note">예) 수소 2 g + 산소 20 g → 물 18 g + 산소 4 g 남음</div>',
        missions: [
          {
            title: '마그네슘 연소', scene: 'mg', focus: 'mgBtn',
            goal: '마그네슘 3 g과 6 g을 각각 태워 보세요. 산화 마그네슘의 질량과 결합한 산소의 질량을 비교해요.',
            hint: '양을 고르고 🔥 태우기를 눌러요. 끝나면 다른 양으로 다시 해 봐요.',
            setup() { MG.amt = 3; MG.hist = []; mgInit(); setScene('mg', true); },
            check: () => MG.hist.some((h) => h.a === 3) && MG.hist.some((h) => h.a === 6) && MG.phase !== 'burn', hold: 0.5,
            status: () => '3 g ' + MARK(MG.hist.some((h) => h.a === 3)) + ' · 6 g ' + MARK(MG.hist.some((h) => h.a === 6)),
            explain: '마그네슘 3 g → 산화 마그네슘 5 g (산소 2 g), 6 g → 10 g (산소 4 g)이에요. 마그네슘 : 산소 = <b>3 : 2</b>로 양이 달라도 <b>일정</b>해요.',
          },
          {
            type: 'quiz', title: '마그네슘 12 g', scene: 'mg',
            goal: '마그네슘 12 g을 모두 태우면 산화 마그네슘은 몇 g이 될까요? (마그네슘 : 산소 = 3 : 2)',
            choices: ['16 g', '20 g', '24 g', '18 g'],
            answer: 1,
            feedback: ['산소는 12 g × 2/3 = 8 g이에요. 12 g + 8 g을 구해 보세요.', '', '산소를 12 g 더하면 안 돼요. 마그네슘의 2/3만큼만 결합해요.', '산소는 6 g이 아니라 8 g이에요(3 : 2 = 12 : 8).'],
            explain: '3 : 2 = 12 : 8 이므로 결합하는 산소는 <b>8 g</b>, 산화 마그네슘은 12 + 8 = <b>20 g</b>이에요.',
          },
          {
            type: 'quiz', title: '물이 만들어질 때', scene: 'water',
            setup() { WT.o = 20; wtInit(); setScene('water', true); },
            goal: '수소 2 g과 산소 20 g을 반응시켰어요. 물은 몇 g 생기고, 무엇이 얼마나 남을까요? (수소 : 산소 = 1 : 8)',
            choices: ['물 22 g, 남는 것 없음', '물 18 g, 산소 4 g 남음', '물 18 g, 수소 2 g 남음', '물 20 g, 산소 2 g 남음'],
            answer: 1,
            feedback: ['질량비대로만 반응해요. 산소는 수소 2 g과 16 g만 결합할 수 있어요.', '', '수소 2 g은 산소 16 g과 모두 반응해서 남지 않아요.', '물의 질량은 수소 2 g + 산소 16 g = 18 g이에요.'],
            explain: '수소 2 g은 산소 <b>16 g</b>(1 : 8)과 결합해 물 <b>18 g</b>이 돼요. 산소 20 g 중 <b>4 g은 반응하지 못하고 남아요</b>. 물질은 정해진 질량비로만 결합해요.',
          },
        ],
      },
    ],
  });

  CTRL_READY = true;
  setScene('lab', true);
  refreshUI();
  const DBG = { LAB, GD, CU, SG, MG, WT, DATA, labRound, gdReceive, gdPlot, gdFit, cuAuto, cuBond, cuSplit, sgAdd, sgReset, mgBurn, wtRun, mgInit, wtInit, labInit, gdInit, cuInit, get F() { return F; } };
  /* ---------- 루프 ---------- */
  let lastDt = 0.016, FREEZE = false;
  function update(dt) {
    S.sceneT += dt;
    updateAnims(dt); updateLater(dt);
    FX.update(dt);
    if (FOC.t > 0) FOC.t -= dt;
    const s = SC[S.scene];
    if (s && s.update) s.update(dt);
  }
  function drawAll(t) {
    view.clear(BGC0);
    const s = SC[S.scene];
    if (s && s.draw) s.draw(t, lastDt);
    FX.draw(ctx);
    if (S.sceneT < 0.3) { ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.3); ctx.fillStyle = BGC0; ctx.fillRect(0, 0, VW, VH); ctx.restore(); }
  }
  SciSim.loop((dt) => { lastDt = dt; if (!FREEZE) update(dt); drawAll(now()); if (lastFree !== !!(game && game.free)) refreshUI(); });
  window.__sim = Object.assign({
    S, SC, FX, get game() { return game; }, ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    setScene, refreshUI, freeze(v) { FREEZE = !!v; },
  }, DBG);
})();
