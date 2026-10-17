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
     중3 Ⅰ. 화학 반응의 규칙성 — 기체 반응 법칙  [9과16-05]
     ① 실험: 수소 + 산소 → 수증기 (기체 주사기 · 전기 불꽃) → ② 분석: 반응한 부피만 골라 2 : 1 : 2
     → ③ 모형: 같은 크기의 칸 = 분자 1개 (산소는 O₂) → ④ 적용: 암모니아 · 부피는 줄어도 질량은 보존
     ※ 몰 · 기체 상수 · 질량 계산은 다루지 않음. 일정한 온도 · 압력에서만 비교.
     ========================================================= */
  let lastFree = false, CTRL_READY = false;
  const q = (id) => document.getElementById(id);
  const dis = (id, v) => { const n = q(id); if (n) n.disabled = !!v; };
  const REAC = {
    water: { key: 'water', btn: '수증기', A: { n: '수소', f: [['H', 2]], c: '#9db2d1' }, B: { n: '산소', f: [['O', 2]], c: '#ef6a6a' }, C: { n: '수증기', f: [['H', 2], ['O', 1]], c: '#6fbaf5' }, a: 2, b: 1, c: 2, eq: '2H₂ + O₂ → 2H₂O', cases: [[20, 10], [20, 20], [30, 10]] },
    ammonia: { key: 'ammonia', btn: '암모니아', A: { n: '질소', f: [['N', 2]], c: '#4a7bf0' }, B: { n: '수소', f: [['H', 2]], c: '#9db2d1' }, C: { n: '암모니아', f: [['N', 1], ['H', 3]], c: '#b08af2' }, a: 1, b: 3, c: 2, eq: 'N₂ + 3H₂ → 2NH₃', cases: [[10, 30], [10, 40], [20, 30]] },
    hcl: { key: 'hcl', btn: '염화 수소', A: { n: '수소', f: [['H', 2]], c: '#9db2d1' }, B: { n: '염소', f: [['Cl', 2]], c: '#7fd16a' }, C: { n: '염화 수소', f: [['H', 1], ['Cl', 1]], c: '#f2b84b' }, a: 1, b: 1, c: 2, eq: 'H₂ + Cl₂ → 2HCl', cases: [[10, 10], [10, 20], [20, 10]] },
  };
  const RKEYS = Object.keys(REAC);
  function rxResult(rx, va, vb) {
    const k = Math.min(va / rx.a, vb / rx.b);
    const r = { k, usedA: k * rx.a, usedB: k * rx.b, vC: k * rx.c, leftA: va - k * rx.a, leftB: vb - k * rx.b };
    r.left = r.leftA > 1e-9 ? { who: 'A', v: r.leftA } : r.leftB > 1e-9 ? { who: 'B', v: r.leftB } : null;
    r.after = r.vC + r.leftA + r.leftB;
    return r;
  }
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const ratioOf = (arr) => { const g = arr.reduce((x, y) => gcd(x, y)); return arr.map((v) => Math.round(v / g)); };
  const fmtMl = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1));

  const SCN = {
    react: { label: '💨 기체 주사기로 반응시켜요', btn: '🧪 반응 실험' },
    table: { label: '📊 반응한 부피만 골라 비교해요', btn: '📊 부피비 분석' },
    model: { label: '🧩 같은 크기의 칸 = 분자 1개', btn: '🧩 분자 모형' },
  };
  const segEl = $('#sceneSeg'), subEl = $('#subSeg');
  Object.keys(SCN).forEach((k) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.scene = k; b.textContent = SCN[k].btn; segEl.appendChild(b);
    b.addEventListener('click', () => { Sound.click(); setScene(k, true); });
  });
  function subItems() {
    if (S.scene === 'model') return [{ t: '🧩 실제 (산소는 O₂)', on: !MD.hypo, fn: () => mdMode(false) }, { t: '❓ 산소가 O 1개라면', on: MD.hypo, fn: () => mdMode(true) }];
    if (S.scene === 'table' || (S.scene === 'react' && !RS.rxLocked) ) return RKEYS.map((k) => ({ t: REAC[k].btn, on: (S.scene === 'table' ? TB.rx : RS.rx) === k, fn: () => (S.scene === 'table' ? tbSelect(k) : rsSelect(k)) }));
    return [];
  }
  let subSig = '';
  function refreshSub() {
    const items = subItems(), sig = S.scene + '|' + items.map((i) => i.t + i.on).join('|');
    if (sig === subSig) return; subSig = sig;
    subEl.innerHTML = '';
    items.forEach((it) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = it.t; b.classList.toggle('on', it.on); b.addEventListener('click', () => { Sound.click(); it.fn(); refreshUI(); }); subEl.appendChild(b); });
    subEl.hidden = !items.length;
  }
  function setScene(name) {
    if (S.scene === name) return;
    S.scene = name; S.sceneT = 0; hideHint();
    const s = SC[name]; if (s && s.enter) s.enter();
    refreshUI();
  }
  function refreshUI() {
    lastFree = !!(game && game.free);
    const sc = S.scene;
    $$('#ctrlCard .control, #readouts .readout').forEach((n) => { n.hidden = !(n.dataset.sc || '').split(' ').includes(sc); });
    segEl.hidden = !lastFree;
    $$('button', segEl).forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    if (SCN[sc]) $('#tbLabel').textContent = SCN[sc].label;
    subSig = ''; refreshSub();
    syncControls();
  }
  function room() { vgrad(ctx, 0, 0, VW, VH, '#f7faff', '#e3ebf7'); }
  const setR = (id, html) => { const n = q(id); if (n && n.dataset.v !== html) { n.dataset.v = html; n.innerHTML = html; } };
  const u = (v, unit) => v + '<small>' + unit + '</small>';

  /* ---------- 그리기: 분자 · 기체 ---------- */
  const ATOM_R = { H: 13, O: 18, N: 17, Cl: 20 };
  const ATOM_C = { H: '#e6ecf5', O: '#ef5a5a', N: '#4a7bf0', Cl: '#6fcf55' };
  function atomBall(x, y, el, r, alpha) {
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    const rr = r || ATOM_R[el];
    D.sphere(x, y, rr, ATOM_C[el], { shadow: true, outline: el === 'H' ? '#a9b6cb' : null, text: el, textColor: el === 'H' ? '#4b5565' : '#fff', textScale: el === 'Cl' ? 0.8 : 1 });
    ctx.restore();
  }

  /* =========================================================
     장면 1 · 반응 용기 (기체 주사기 · 피스톤 · 전기 불꽃)
     ========================================================= */
  const SYR = { x0: 28, x1: 268, perMl: 4.8, yA: 130, yB: 300 };
  const VES = { x: 340, w: 112, bottom: 440, top: 70, perMl: 4.625 };
  const RS = { rx: 'water', rxLocked: true, va: 20, vb: 10, dispA: 20, dispB: 10, phase: 'idle', pt: 0, dots: [], vol: 0, spark: 0, flash: 0, hist: { water: [], ammonia: [], hcl: [] }, res: null, drag: null, morphed: false, lastRun: null, runs: [], pop: 0 };
  const rsRx = () => REAC[RS.rx];
  const pistonY = () => VES.bottom - RS.vol * VES.perMl;
  function rsReset(keepRes) {
    RS.phase = 'idle'; RS.pt = 0; RS.morphed = false; RS.res = null;
    RS.dots.forEach((d) => { d.kill = true; });
    syncControls();
  }
  function rsSet(which, v) {
    v = clamp(Math.round(v / 10) * 10, 10, 40);
    if (RS.phase === 'run') return;
    if (which === 'A') RS.va = v; else RS.vb = v;
    if (RS.phase === 'done') rsReset();
    sfx.snap(); syncControls();
  }
  function rsSelect(k) { if (RS.phase === 'run') return; RS.rx = k; const c = REAC[k].cases[0]; RS.va = c[0]; RS.vb = c[1]; rsReset(); RS.dispA = RS.va; RS.dispB = RS.vb; syncControls(); }
  function rsGo() {
    if (RS.phase === 'run') return;
    if (RS.phase === 'done') { rsReset(); return; }
    if (RS.phase !== 'idle') return;
    RS.phase = 'run'; RS.pt = 0; RS.morphed = false; RS.dots = [];
    const rx = rsRx(), nA = Math.round(RS.va / 2.5), nB = Math.round(RS.vb / 2.5);
    const mk = (t, n) => { for (let i = 0; i < n; i++) RS.dots.push({ t, rx: rand(0.1, 0.9), ry: rand(0.1, 0.95), vx: rand(-0.35, 0.35), vy: rand(-0.35, 0.35), a: 0, delay: 0.1 + rand(0, 0.9), flash: 0, kill: false, ph: rand(0, 6) }); };
    mk('A', nA); mk('B', nB);
    RS.res = rxResult(rx, RS.va, RS.vb);
    sfx.whoosh(); hideHint(); syncControls();
  }
  function rsMorph() {
    RS.morphed = true;
    const r = RS.res, nA2 = Math.round(r.leftA / 2.5), nB2 = Math.round(r.leftB / 2.5), nC = Math.round(r.vC / 2.5);
    const As = RS.dots.filter((d) => d.t === 'A'), Bs = RS.dots.filter((d) => d.t === 'B');
    const cons = As.slice(nA2).concat(Bs.slice(nB2));
    cons.forEach((d, i) => { d.flash = 1; if (i < nC) { d.t = 'C'; } else { d.kill = true; } });
    sfx.pop(); FX.burst(VES.x + VES.w / 2, VES.bottom - 40, { count: 16, speed: 120, colors: ['#fff3a8', '#ffd23f', '#ffffff'], size: 3, life: 0.6, gravity: 0 });
  }
  function rsUpdate(dt) {
    const rx = rsRx();
    const tgtA = RS.phase === 'run' ? RS.va * (1 - smooth(RS.pt / 1.1)) : (RS.phase === 'done' ? 0 : RS.va);
    const tgtB = RS.phase === 'run' ? RS.vb * (1 - smooth(RS.pt / 1.1)) : (RS.phase === 'done' ? 0 : RS.vb);
    if (RS.phase === 'run') { RS.dispA = tgtA; RS.dispB = tgtB; } else { RS.dispA = SciSim.approach(RS.dispA, tgtA, dt, 9); RS.dispB = SciSim.approach(RS.dispB, tgtB, dt, 9); }
    if (RS.phase === 'run') {
      RS.pt += dt;
      const tot = RS.va + RS.vb;
      if (RS.pt < 1.2) RS.vol = tot * smooth(RS.pt / 1.1);
      if (RS.pt >= 1.2 && RS.pt < 2.0) { RS.vol = tot; RS.spark = 1; if (Math.random() < dt * 40) FX.emit({ x: VES.x + VES.w / 2 + rand(-6, 6), y: VES.bottom - 12, vx: rand(-90, 90), vy: -rand(20, 100), life: 0.3, size: 2, color: '#fff3a8', gravity: 120 }); }
      if (RS.pt >= 2.0 && !RS.morphed) { RS.spark = 0; rsMorph(); RS.flash = 1; }
      if (RS.morphed) RS.vol = lerp(tot, RS.res.after, smooth((RS.pt - 2.0) / 1.0));
      if (RS.pt > 3.2) {
        RS.phase = 'done'; RS.vol = RS.res.after;
        const e = { va: RS.va, vb: RS.vb, r: RS.res, pop: 0 };
        const H = RS.hist[RS.rx]; const ex = H.findIndex((h) => h.va === e.va && h.vb === e.vb); if (ex >= 0) H.splice(ex, 1);
        H.push(e); if (H.length > 6) H.shift(); tw(e, { pop: 1 }, 0.5, 'outBack', { essential: true });
        RS.lastRun = { rx: RS.rx, va: RS.va, vb: RS.vb, r: RS.res };
        RS.runs.push({ rx: RS.rx, va: RS.va, vb: RS.vb, none: !RS.res.left });
        if (!RS.res.left) later(0.4, () => okFx(VES.x + VES.w / 2, pistonY() + 40, COL.good));
        syncControls();
      }
    } else if (RS.phase === 'idle') RS.vol = SciSim.approach(RS.vol, 0, dt, 6);
    RS.spark = RS.phase === 'run' && RS.pt >= 1.2 && RS.pt < 2.0 ? 1 : 0;
    RS.flash = SciSim.approach(RS.flash, 0, dt, 4);
    // 점들
    for (let i = RS.dots.length - 1; i >= 0; i--) {
      const d = RS.dots[i];
      if (d.kill) { d.a -= dt * 3; if (d.a <= 0) { RS.dots.splice(i, 1); continue; } }
      else if (d.delay > 0) d.delay -= dt; else d.a = Math.min(1, d.a + dt * 3);
      const sp = RS.phase === 'run' && RS.pt >= 1.2 ? 1.5 : 1;
      d.rx += d.vx * dt * sp; d.ry += d.vy * dt * sp;
      if (d.rx < 0.08 || d.rx > 0.92) d.vx *= -1; if (d.ry < 0.06 || d.ry > 0.95) d.vy *= -1;
      d.rx = clamp(d.rx, 0.06, 0.94); d.ry = clamp(d.ry, 0.05, 0.96);
      d.flash = Math.max(0, d.flash - dt * 2.5);
    }
  }
  /* 기체 주사기 */
  function syringe(cy, vol, color, name, formula, key) {
    const bx = SYR.x0, bw = SYR.x1 - SYR.x0, bh = 40;
    const head = SYR.x1 - vol * SYR.perMl;
    // 기체
    D.roundRect(bx, cy - bh / 2, bw, bh, 8); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
    ctx.save(); D.roundRect(bx, cy - bh / 2, bw, bh, 8); ctx.clip();
    ctx.fillStyle = rgba(color, 0.55); ctx.fillRect(head, cy - bh / 2, SYR.x1 - head, bh);
    ctx.restore();
    // 눈금
    ctx.strokeStyle = 'rgba(70,86,110,.55)'; ctx.lineWidth = 1.4; ctx.font = D.font(11, 700); ctx.fillStyle = COL.muted; ctx.textAlign = 'center';
    for (let m = 0; m <= 50; m += 10) { const x = SYR.x1 - m * SYR.perMl; ctx.beginPath(); ctx.moveTo(x, cy - bh / 2); ctx.lineTo(x, cy - bh / 2 + (m % 10 === 0 ? 10 : 5)); ctx.stroke(); if (m > 0) ctx.fillText(m, x, cy + bh / 2 + 13); }
    D.roundRect(bx, cy - bh / 2, bw, bh, 8); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(bx + 8, cy - bh / 2 + 5, bw - 16, 4);
    // 노즐
    ctx.fillStyle = '#9fb0c6'; ctx.fillRect(SYR.x1, cy - 5, 14, 10);
    // 피스톤 + 막대 + 손잡이
    D.roundRect(head - 10, cy - bh / 2 + 2, 14, bh - 4, 3); ctx.fillStyle = '#3a4456'; ctx.fill();
    ctx.fillStyle = '#c7d0de'; ctx.fillRect(head - 54, cy - 3, 46, 6);
    const lift = RS.drag && RS.drag.key === key ? 1 : 0;
    D.shadow(() => { D.roundRect(head - 62, cy - 20, 14, 40, 6); ctx.fillStyle = RS.phase === 'idle' || RS.phase === 'done' ? '#5b6b85' : '#9aa7ba'; ctx.fill(); }, { blur: 6 + lift * 8, y: 2 + lift * 4 });
    // 라벨
    D.label(bx + bw / 2, cy - bh / 2 - 26, name + ' ', { bg: color, color: '#fff', size: 14 });
    return head;
  }
  const TUBE = {
    A: [[268 + 14, 130], [316, 130], [316, 392], [340, 392]],
    B: [[268 + 14, 300], [304, 300], [304, 420], [340, 420]],
  };
  function tubePath(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); }
  function tubePoint(pts, k) {
    let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
    let d = k * L; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const t2 = d / seg[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t2, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t2]; } d -= seg[i]; }
    return pts[pts.length - 1];
  }
  const dotColor = (d) => (d.t === 'A' ? rsRx().A.c : d.t === 'B' ? rsRx().B.c : rsRx().C.c);
  function drawReact(t) {
    room();
    const rx = rsRx();
    // 튜브
    ['A', 'B'].forEach((k) => {
      const col = rx[k].c;
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      tubePath(TUBE[k]); ctx.strokeStyle = 'rgba(143,163,189,.8)'; ctx.lineWidth = 9; ctx.stroke();
      tubePath(TUBE[k]); ctx.strokeStyle = 'rgba(240,246,255,.9)'; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
      if (RS.phase === 'run' && RS.pt < 1.3) for (let i = 0; i < 9; i++) { const kk = ((RS.pt * 2.2 + i / 9) % 1); const p = tubePoint(TUBE[k], kk); D.sphere(p[0], p[1], 3.2, col, { gloss: false }); }
    });
    // 주사기
    const hA = syringe(SYR.yA, RS.dispA, rx.A.c, rx.A.n + ' ' + Math.round(RS.dispA) + ' mL', '', 'A');
    const hB = syringe(SYR.yB, RS.dispB, rx.B.c, rx.B.n + ' ' + Math.round(RS.dispB) + ' mL', '', 'B');
    RS.handle = { A: { x: hA - 55, y: SYR.yA }, B: { x: hB - 55, y: SYR.yB } };
    if (isNew('react') && RS.phase === 'idle') { D.ring(hA - 55, SYR.yA, 26, t); }
    // 범례
    D.roundRect(24, 386, 258, 84, 14); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
    [rx.A, rx.B, rx.C].forEach((g, i) => {
      const y = 405 + i * 26;
      D.sphere(44, y - 4, 7.5, g.c, { outline: g.c === '#9db2d1' ? '#7f8fa6' : null, outlineWidth: 1 });
      txt(g.n, 62, y + 1, 14, COL.ink, 'left', 800); drawFormula(g.f, 150, y + 2, 15, '#5b6b85', 'left');
    });
    // 반응 용기
    const X = VES.x, W = VES.w, top = VES.top, bot = VES.bottom, py = pistonY();
    D.shadow(() => { D.roundRect(X - 4, top - 6, W + 8, bot - top + 14, 12); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }, { blur: 12, y: 5 });
    // 가스 영역
    ctx.save(); ctx.beginPath(); ctx.rect(X, py, W, bot - py); ctx.clip();
    vgrad(ctx, X, py, W, bot - py, 'rgba(255,248,225,.55)', 'rgba(255,241,200,.25)');
    const gx0 = X + 8, gw = W - 16, gy0 = py + 8, gh = Math.max(4, bot - py - 16);
    RS.dots.forEach((d) => {
      if (d.a <= 0.01) return;
      const x = gx0 + d.rx * gw, y = gy0 + d.ry * gh;
      ctx.globalAlpha = Math.min(1, d.a);
      if (d.flash > 0.05) D.glow(x, y, 20, '#fff3a8', 0.8 * d.flash);
      D.sphere(x, y, 7.4, dotColor(d), { gloss: true, outline: d.t === 'A' && rx.key !== 'ammonia' && rx.A.c === '#9db2d1' ? '#7f8fa6' : null, outlineWidth: 1 });
      ctx.globalAlpha = 1;
    });
    if (RS.flash > 0.02) { D.glow(X + W / 2, bot - 30, 90, '#ffe9a8', 0.8 * RS.flash); }
    ctx.restore();
    // 전극과 불꽃
    ctx.strokeStyle = '#5b6b85'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X - 6, bot - 12); ctx.lineTo(X + W / 2 - 10, bot - 12); ctx.moveTo(X + W + 6, bot - 12); ctx.lineTo(X + W / 2 + 10, bot - 12); ctx.stroke();
    if (RS.spark) {
      ctx.save(); ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 3; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(X + W / 2 - 10, bot - 12); for (let i = 1; i < 4; i++) ctx.lineTo(X + W / 2 - 10 + i * 5, bot - 12 + (Math.random() - 0.5) * 16); ctx.lineTo(X + W / 2 + 10, bot - 12); ctx.stroke(); ctx.restore();
      D.spark(X + W / 2, bot - 12, 18, t * 3, '#fff6b0');
    }
    // 유리 용기
    ctx.save(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(X, top - 2); ctx.lineTo(X, bot - 8); ctx.quadraticCurveTo(X, bot, X + 10, bot); ctx.lineTo(X + W - 10, bot); ctx.quadraticCurveTo(X + W, bot, X + W, bot - 8); ctx.lineTo(X + W, top - 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X + 8, top + 10); ctx.lineTo(X + 8, bot - 20); ctx.stroke();
    ctx.restore();
    // 눈금 (오른쪽)
    ctx.save(); ctx.font = D.font(12, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let m = 0; m <= 80; m += 10) { const y = bot - m * VES.perMl; ctx.strokeStyle = '#6b7a92'; ctx.lineWidth = m % 20 === 0 ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(X + W, y); ctx.lineTo(X + W + (m % 20 === 0 ? 12 : 7), y); ctx.stroke(); if (m % 20 === 0) { ctx.fillStyle = COL.muted; ctx.fillText(m, X + W + 15, y); } }
    ctx.restore();
    txt('mL', X + W + 26, top - 14, 12, COL.muted, 'center', 800);
    // 피스톤
    D.shadow(() => { D.roundRect(X + 2, py - 16, W - 4, 16, 4); const g = ctx.createLinearGradient(0, py - 16, 0, py); g.addColorStop(0, '#5b6b85'); g.addColorStop(1, '#3a4456'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#c7d0de'; ctx.fillRect(X + W / 2 - 3, Math.max(24, py - 64), 6, py - 16 - Math.max(24, py - 64));
    D.roundRect(X + W / 2 - 18, Math.max(24, py - 64) - 8, 36, 10, 5); ctx.fillStyle = '#5b6b85'; ctx.fill();
    // 부피 표시 + 조건 칩
    D.label(X + W / 2, Math.max(40, py - 88), '기체 부피 ' + fmtMl(RS.vol) + ' mL', { bg: '#1b2333', size: 13 });
    D.label(X + W / 2, 470, rx.key === 'water' ? '100 °C 이상 · 같은 압력 (물은 수증기)' : '같은 온도 · 같은 압력', { bg: 'rgba(255,255,255,.95)', color: '#a14a22', size: 13, border: '#f4c77a' });
    // 결과 패널
    drawRsTable(t);
  }
  function drawRsTable(t) {
    const rx = rsRx(), X = 518, W = 272, Y = 16;
    panel(X, Y, W, 330);
    txt('📋 실험 결과표 (mL)', X + W / 2, Y + 28, 15, COL.ink, 'center', 800);
    const cols = [X + 36, X + 100, X + 170, X + 238];
    const heads = ['넣은\n' + rx.A.n, '넣은\n' + rx.B.n, '남은\n기체', '생성\n' + rx.C.n];
    heads.forEach((h, i) => { const ls = h.split('\n'); txt(ls[0], cols[i], Y + 56, 12, COL.muted, 'center', 800); txt(ls[1], cols[i], Y + 72, 13, [rx.A.c, rx.B.c, '#c8323a', rx.C.c][i] === rx.C.c && i === 3 ? '#2f7de1' : COL.ink, 'center', 800); });
    ctx.strokeStyle = COL.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 12, Y + 82); ctx.lineTo(X + W - 12, Y + 82); ctx.stroke();
    const H = RS.hist[rx.key];
    if (!H.length) textBlock('반응시키면 결과가 쌓여요', X + W / 2, Y + 150, 220, 14, '#9aa5b6', 'center');
    H.forEach((e, i) => {
      const y = Y + 104 + i * 36;
      ctx.save(); ctx.translate(X + W / 2, y); ctx.scale(e.pop, e.pop); ctx.translate(-(X + W / 2), -y);
      if (i === H.length - 1) { D.roundRect(X + 10, y - 17, W - 20, 34, 10); ctx.fillStyle = 'rgba(139,92,246,.1)'; ctx.fill(); }
      txt(String(e.va), cols[0], y + 5, 16, COL.ink, 'center', 800); txt(String(e.vb), cols[1], y + 5, 16, COL.ink, 'center', 800);
      const l = e.r.left; txt(l ? (l.who === 'A' ? rx.A.n : rx.B.n) + ' ' + fmtMl(l.v) : '없음', cols[2], y + 5, l ? 14 : 15, l ? '#c8323a' : COL.good, 'center', 800);
      txt(fmtMl(e.r.vC), cols[3], y + 5, 16, '#2f7de1', 'center', 800);
      ctx.restore();
    });
    // 요약 카드
    panel(X, 360, W, 148);
    if (RS.phase === 'done' && RS.res) {
      const r = RS.res;
      txt('이번 실험', X + W / 2, 388, 14, COL.muted, 'center', 800);
      textBlock(rx.A.n + ' ' + RS.va + ' mL + ' + rx.B.n + ' ' + RS.vb + ' mL → ' + rx.C.n + ' ' + fmtMl(r.vC) + ' mL', X + 16, 414, W - 32, 15, COL.ink, 'left', 21, 800);
      D.label(X + W / 2, 470, r.left ? (r.left.who === 'A' ? rx.A.n : rx.B.n) + ' ' + fmtMl(r.left.v) + ' mL 남음' : '남는 기체 없음!', { bg: r.left ? '#fdecec' : '#e6f7ee', color: r.left ? '#c8323a' : '#0b7a41', size: 15, border: r.left ? '#f3b2b5' : '#9fdcba' });
    } else if (RS.phase === 'run') textBlock('기체가 들어가고 전기 불꽃이 튀어요…', X + 16, 410, W - 32, 15, COL.muted, 'left', 21, 700);
    else textBlock('기체 주사기의 부피를 고르고 ⚡ 반응시키기를 눌러요', X + 16, 410, W - 32, 15, COL.muted, 'left', 21, 700);
  }
  SC.react = {
    enter() { if (RS.phase === 'idle') showHint('주사기 손잡이를 끌거나 − + 버튼으로 기체의 부피를 정해 보세요', 5200); },
    update: rsUpdate,
    hover(p) { if (RS.phase !== 'idle' && RS.phase !== 'done') return null; for (const k of ['A', 'B']) { const h = RS.handle && RS.handle[k]; if (h && Math.abs(p.x - h.x) < 24 && Math.abs(p.y - h.y) < 30) return 'grab'; } return null; },
    down(p) {
      if (RS.phase !== 'idle' && RS.phase !== 'done') return false;
      for (const k of ['A', 'B']) { const h = RS.handle && RS.handle[k]; if (h && Math.abs(p.x - h.x) < 26 && Math.abs(p.y - h.y) < 32) { RS.drag = { key: k }; sfx.snap(); return true; } }
      return false;
    },
    move(p) { const d = RS.drag; if (!d) return; const head = p.x + 55; const v = (SYR.x1 - head) / SYR.perMl; const sv = clamp(Math.round(v / 10) * 10, 10, 40); if ((d.key === 'A' ? RS.va : RS.vb) !== sv) rsSet(d.key, sv); },
    up() { RS.drag = null; },
    draw: drawReact,
  };

  /* =========================================================
     장면 2 · 부피비 분석 (표에서 반응한 부피만 골라내기)
     ========================================================= */
  const TB = { rx: 'water', rows: {}, guess: {}, bad: {}, flash: {}, lastCheck: '' };
  function tbInit() {
    RKEYS.forEach((k) => {
      TB.rows[k] = REAC[k].cases.map((c) => ({ va: c[0], vb: c[1], r: rxResult(REAC[k], c[0], c[1]), rev: 0, revealed: false, pop: 0 }));
      TB.guess[k] = [0, 0, 0]; TB.bad[k] = [0, 0, 0];
    });
  }
  tbInit();
  const tbAll = (k) => TB.rows[k].every((r) => r.revealed);
  const tbCount = () => RKEYS.reduce((n, k) => n + TB.rows[k].filter((r) => r.revealed).length, 0);
  const tbRight = (k) => { const rx = REAC[k], g = TB.guess[k]; return g[0] === rx.a && g[1] === rx.b && g[2] === rx.c; };
  function tbSelect(k) { TB.rx = k; sfx.snap(); }
  function tbReveal(i, delay) {
    const row = TB.rows[TB.rx][i]; if (row.revealed) return;
    row.revealed = true; tw(row, { rev: 1 }, 0.9, 'outCubic', { essential: true, delay: delay || 0 });
    later(delay || 0, () => sfx.snap());
  }
  function tbRevealAll() { TB.rows[TB.rx].forEach((r, i) => tbReveal(i, i * 0.45)); }
  const TBR = (i) => ({ x: 20, y: 112 + i * 84, w: 760, h: 74 });
  const TBC = [128, 226, 338, 488, 586, 700];
  const GCH = (j) => ({ x: 250 + j * 150, y: 410, w: 84, h: 52 });
  SC.table = {
    enter() { if (tbCount() === 0) showHint('실험 줄을 누르면 반응한 부피가 나타나요. 🔍 버튼으로 한꺼번에 볼 수도 있어요', 5600); },
    update() {},
    hover(p) { for (let i = 0; i < 3; i++) if (inRect(p, TBR(i)) && !TB.rows[TB.rx][i].revealed) return 'pointer'; for (let j = 0; j < 3; j++) if (inRect(p, GCH(j))) return 'pointer'; return null; },
    down(p) {
      for (let i = 0; i < 3; i++) if (inRect(p, TBR(i))) { tbReveal(i); return false; }
      for (let j = 0; j < 3; j++) if (inRect(p, GCH(j))) {
        if (!tbAll(TB.rx)) { showHint('먼저 세 실험에서 반응한 부피를 구해요 (실험 줄을 눌러요)', 3600); return false; }
        const g = TB.guess[TB.rx]; g[j] = (g[j] + 1) % 5; TB.bad[TB.rx][j] = 0; sfx.snap();
        const o = { s: 1.18 }; TB.flash[TB.rx + j] = o; tw(o, { s: 1 }, 0.3, 'outBack', { essential: true });
        return false;
      }
      return false;
    },
    draw(t) {
      room();
      const k = TB.rx, rx = REAC[k];
      txt(rx.A.n + ' + ' + rx.B.n + ' → ' + rx.C.n, 400, 50, 22, COL.ink, 'center', 800);
      txt('(같은 온도 · 같은 압력, 단위 mL)', 400, 76, 14, COL.muted, 'center', 700);
      const heads = ['넣은 ' + rx.A.n, '넣은 ' + rx.B.n, '남은 기체', '반응한 ' + rx.A.n, '반응한 ' + rx.B.n, '생성된 ' + rx.C.n];
      heads.forEach((h, i) => txt(h, TBC[i], 104, 13, i === 5 ? '#2f7de1' : i >= 3 ? '#7c3aed' : COL.muted, 'center', 800));
      TB.rows[k].forEach((row, i) => {
        const R = TBR(i), cy = R.y + R.h / 2;
        panel(R.x, R.y, R.w, R.h, { r: 16, blur: 6 });
        D.roundRect(R.x + 12, cy - 15, 62, 30, 15); ctx.fillStyle = row.revealed ? COL.good : '#8b5cf6'; ctx.fill(); txt('실험 ' + (i + 1), R.x + 43, cy + 5, 14, '#fff', 'center', 800);
        txt(String(row.va), TBC[0], cy + 8, 26, COL.ink, 'center', 800); txt(String(row.vb), TBC[1], cy + 8, 26, COL.ink, 'center', 800);
        const l = row.r.left;
        const ltxt = l ? (l.who === 'A' ? rx.A.n : rx.B.n) + ' ' + fmtMl(l.v) : '없음';
        txt(ltxt, TBC[2], cy + 7, l ? 19 : 20, l ? '#c8323a' : COL.good, 'center', 800);
        if (l && row.rev > 0) { ctx.strokeStyle = '#c8323a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; const w2 = 58 * row.rev; ctx.beginPath(); ctx.moveTo(TBC[2] - w2, cy + 1); ctx.lineTo(TBC[2] + w2, cy + 1); ctx.stroke(); }
        D.arrow(TBC[2] + 70, cy, TBC[3] - 62, cy, { color: row.revealed ? '#8b5cf6' : '#cfd6e2', width: 3, head: 10 });
        // 반응한 부피
        const used = [row.r.usedA, row.r.usedB];
        [0, 1].forEach((j) => {
          const x = TBC[3 + j];
          if (row.rev < 0.02) { D.roundRect(x - 34, cy - 20, 68, 40, 10); ctx.fillStyle = '#f5f1ff'; ctx.fill(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#c9b8f6'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); txt('?', x, cy + 9, 24, '#a78bfa', 'center', 800); }
          else { D.roundRect(x - 34, cy - 20, 68, 40, 10); ctx.fillStyle = '#efe7ff'; ctx.fill(); txt(fmtMl(used[j] * row.rev), x, cy + 9, 24, '#6d28d9', 'center', 800); }
        });
        txt(fmtMl(row.r.vC), TBC[5], cy + 9, 24, '#2f7de1', 'center', 800);
      });
      // 비 입력 줄
      const done = tbAll(k);
      panel(20, 372, 760, 110, { r: 18, fill: done ? '#fff' : '#f4f6fa' });
      txt('반응한 부피의 비 =', 130, 428, 17, COL.ink, 'center', 800);
      const names = [rx.A.n, rx.B.n, rx.C.n];
      for (let j = 0; j < 3; j++) {
        const g = GCH(j), v = TB.guess[k][j], o = TB.flash[k + j], sc = o ? o.s : 1, bad = TB.bad[k][j];
        ctx.save(); ctx.translate(g.x + g.w / 2, g.y + g.h / 2); ctx.scale(sc, sc); ctx.translate(-g.w / 2, -g.h / 2);
        D.roundRect(0, 0, g.w, g.h, 14); ctx.fillStyle = bad ? '#fdecec' : v ? '#f5f1ff' : '#fff'; ctx.fill(); ctx.strokeStyle = bad ? '#e2464b' : done ? '#8b5cf6' : '#cfd6e2'; ctx.lineWidth = 2.5; ctx.stroke();
        txt(v ? String(v) : '?', g.w / 2, g.h / 2 + 11, 32, v ? '#6d28d9' : '#b9b0d6', 'center', 800);
        ctx.restore();
        txt(names[j], g.x + g.w / 2, g.y - 8, 14, COL.muted, 'center', 800);
        if (j < 2) txt(':', g.x + g.w + 33, g.y + g.h / 2 + 10, 28, COL.muted, 'center', 800);
        if (done && !v && Math.floor(t * 1.2) % 2 === 0) D.ring(g.x + g.w / 2, g.y + g.h / 2, 36, t, { color: '#8b5cf6' });
      }
      if (done && tbRight(k)) { D.check(740, 436, 18, 1); }
      txt(done ? '칸을 눌러 숫자를 바꿔요' : '실험 줄을 눌러 반응한 부피를 구해요', 400, 480 - 6, 13, COL.muted, 'center', 700);
    },
  };

  /* =========================================================
     장면 3 · 분자 모형 (칸 = 분자 1개)
     ========================================================= */
  const MD = { hypo: false, atoms: [], cells: [], prod: [], drag: null, done: false, fail: false, ban: 0, failA: 0, auto: false, shake: 0 };
  const PC = [{ cx: 530, cy: 214 }, { cx: 672, cy: 214 }];
  function mdInit() {
    MD.atoms = []; MD.cells = []; MD.drag = null; MD.done = false; MD.fail = false; MD.ban = 0; MD.failA = 0; MD.auto = false;
    const cx = [88, 200, 312], cy = 214;
    const mols = MD.hypo ? [['H', 'H'], ['H', 'H'], ['O']] : [['H', 'H'], ['H', 'H'], ['O', 'O']];
    mols.forEach((m, i) => {
      MD.cells.push({ cx: cx[i], cy, label: m.length === 1 ? '산소 O (원자 1개)' : m[0] === 'H' ? '수소 H₂' : '산소 O₂' });
      m.forEach((el, j) => {
        const r = ATOM_R[el], off = m.length === 1 ? 0 : (j ? 1 : -1) * r * 0.95;
        const a = { el, r, x: cx[i] + off, y: cy, hx: cx[i] + off, hy: cy, sock: null, inMol: m.length > 1, mol: i, lift: 0, id: MD.atoms.length };
        MD.atoms.push(a);
      });
    });
    MD.prod = PC.map((c) => ({ cx: c.cx, cy: c.cy, socks: [{ k: 'O', x: c.cx, y: c.cy + 24, r: 22, atom: null }, { k: 'H', x: c.cx - 40, y: c.cy - 30, r: 16, atom: null }, { k: 'H', x: c.cx + 40, y: c.cy - 30, r: 16, atom: null }], glow: 0 }));
  }
  mdInit();
  function mdMode(h) { if (MD.hypo === h) return; MD.hypo = h; mdInit(); if (h) showHint('산소가 원자 1개짜리 분자(O)라면 어떻게 될까요? 원자를 빈칸에 끌어다 놓아 보세요', 6000); syncControls(); }
  const mdSocks = () => MD.prod.reduce((a, c) => a.concat(c.socks), []);
  const mdCellsDone = () => MD.prod.filter((c) => c.socks.every((s) => s.atom)).length;
  function mdPlace(a, s, soft) {
    if (a.sock) { a.sock.atom = null; a.sock = null; }
    s.atom = a; a.sock = s; a.hx = s.x; a.hy = s.y;
    if (a.inMol) { a.inMol = false; MD.atoms.filter((b) => b.mol === a.mol).forEach((b) => (b.inMol = false)); }
    tw(a, { x: s.x, y: s.y }, soft ? 0.5 : 0.32, 'outBack', { essential: true });
    sfx.snap();
    later(0.25, () => {
      FX.burst(s.x, s.y, { count: 6, speed: 60, colors: ['#ffd23f', '#fff'], size: 2.4, life: 0.45, gravity: 0 });
      const cell = MD.prod.find((c) => c.socks.includes(s));
      if (cell && cell.socks.every((x) => x.atom) && !cell.done) { cell.glow = 1; cell.done = true; sfx.ding(); FX.burst(cell.cx, cell.cy, { count: 16, speed: 130, colors: ['#6fbaf5', '#bfe3ff', '#fff'], size: 3.4, life: 0.8 }); }
      mdCheck();
    });
  }
  function mdCheck() {
    if (!MD.hypo && mdCellsDone() === 2 && !MD.done) { MD.done = true; tw(MD, { ban: 1 }, 0.7, 'outBack', { essential: true }); later(0.3, () => okFx(600, 214, COL.good)); }
    if (MD.hypo && !MD.fail) {
      const H = MD.atoms.filter((a) => a.el === 'H'), O = MD.atoms.filter((a) => a.el === 'O');
      if (H.every((a) => a.sock) && O.every((a) => a.sock)) { MD.fail = true; sfx.thud(); tw(MD, { failA: 1 }, 0.5, 'outBack', { essential: true }); MD.shake = 1; tw(MD, { shake: 0 }, 0.6, 'outCubic', { essential: true }); }
    }
    syncControls();
  }
  function mdAuto() {
    if (MD.auto) return; MD.auto = true;
    const socks = mdSocks().filter((s) => !s.atom);
    const order = socks.sort((x, y) => (x.k === 'O' ? -1 : 1) - (y.k === 'O' ? -1 : 1));
    let d = 0;
    const used = new Set();
    order.forEach((s) => { const a = MD.atoms.find((at) => at.el === s.k && !at.sock && !used.has(at)); if (!a) return; used.add(a); later(d, () => { if (!s.atom && !a.sock) mdPlace(a, s, true); }); d += 0.3; });
    later(d + 0.2, () => { MD.auto = false; syncControls(); });
  }
  const mdAtomAt = (p) => { for (let i = MD.atoms.length - 1; i >= 0; i--) { const a = MD.atoms[i]; if (Math.hypot(p.x - a.x, p.y - a.y) < a.r + 8) return a; } return null; };
  SC.model = {
    enter() { showHint(MD.hypo ? '산소가 원자 1개짜리 분자(O)라면 어떻게 될까요? 원자를 빈칸에 끌어다 놓아 보세요' : '원자를 끌어다 오른쪽 물 분자 칸(점선)에 놓아 수증기를 만들어요', 6000); },
    update(dt) { MD.atoms.forEach((a) => { a.lift = SciSim.approach(a.lift, MD.drag && MD.drag.a === a ? 1 : 0, dt, 14); }); MD.prod.forEach((c) => { c.glow = Math.max(0, c.glow - dt * 0.7); }); },
    hover(p) { return mdAtomAt(p) ? 'grab' : null; },
    down(p) { const a = mdAtomAt(p); if (!a || MD.auto) return false; MD.drag = { a, ox: a.x - p.x, oy: a.y - p.y }; sfx.snap(); return true; },
    move(p) { const d = MD.drag; if (!d) return; d.a.x = p.x + d.ox; d.a.y = p.y + d.oy; if (d.a.inMol) { d.a.inMol = false; MD.atoms.filter((b) => b.mol === d.a.mol).forEach((b) => (b.inMol = false)); } },
    up() {
      const d = MD.drag; MD.drag = null; if (!d) return;
      const a = d.a;
      let best = null, bd = 56;
      mdSocks().forEach((s) => { if (s.atom && s.atom !== a) return; const dd = Math.hypot(a.x - s.x, a.y - s.y); if (dd < bd) { bd = dd; best = s; } });
      if (best && best.k === a.el) mdPlace(a, best);
      else {
        if (best) { MD.wrong = { s: best, t: 0 }; sfx.thud(); showHint(best.k === 'O' ? '여기는 산소 원자 자리예요' : '여기는 수소 원자 자리예요', 2200); }
        tw(a, { x: a.hx, y: a.hy }, 0.4, 'outBack', { essential: true });
      }
    },
    draw(t) {
      room();
      const xs = MD.shake > 0 ? Math.sin(t * 60) * 5 * MD.shake : 0;
      panel(20, 30, 360, 336, { r: 18 }); panel(420, 30, 360, 336, { r: 18 });
      txt('반응 전', 200, 66, 18, COL.ink, 'center', 800); txt('반응 후', 600, 66, 18, COL.ink, 'center', 800);
      D.arrow(384, 214, 416, 214, { color: '#8b5cf6', width: 5, head: 12 });
      // 반응 전 칸
      MD.cells.forEach((c) => {
        D.roundRect(c.cx - 50, c.cy - 52, 100, 104, 14); ctx.fillStyle = '#f6f8fc'; ctx.fill(); ctx.setLineDash([7, 5]); ctx.strokeStyle = '#b9c3d3'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        txt(c.label, c.cx, c.cy + 76, 13, COL.muted, 'center', 800);
      });
      txt(MD.hypo ? '수소 2칸 + 산소 1칸(O)' : '수소 2칸 + 산소 1칸(O₂)', 200, 340, 15, COL.ink, 'center', 800);
      // 반응 후 칸
      MD.prod.forEach((c, i) => {
        const full = c.socks.every((s) => s.atom), g = c.glow;
        ctx.save(); ctx.translate(c.cx + (full ? 0 : xs * (i === 1 ? 1 : 0)), 0);
        D.roundRect(-64, c.cy - 72, 128, 146, 16); ctx.fillStyle = full ? '#eaf5ff' : '#f6f8fc'; ctx.fill(); ctx.setLineDash(full ? [] : [7, 5]); ctx.strokeStyle = full ? '#6fbaf5' : '#b9c3d3'; ctx.lineWidth = full ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        c.socks.forEach((s) => {
          if (s.atom) return;
          const failHere = MD.hypo && MD.fail && s.k === 'O';
          ctx.save(); ctx.translate(failHere ? xs : 0, 0);
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.setLineDash([5, 4]); ctx.strokeStyle = failHere ? '#e2464b' : ATOM_C[s.k] === '#e6ecf5' ? '#98a6bb' : '#ef8a8a'; ctx.lineWidth = failHere ? 3.5 : 2.4; ctx.stroke(); ctx.setLineDash([]);
          txt(s.k, s.x, s.y + 6, 15, failHere ? '#e2464b' : '#a9b6cb', 'center', 800);
          ctx.restore();
        });
        if (full) { D.glow(c.cx, c.cy, 90, '#6fbaf5', 0.35); txt('H₂O', c.cx, c.cy + 62, 14, '#2f7de1', 'center', 800); }
      });
      // 결합선
      for (let m = 0; m < MD.cells.length; m++) { const as = MD.atoms.filter((a) => a.mol === m); if (as.length === 2 && as[0].inMol && as[1].inMol) { ctx.strokeStyle = as[0].el === 'H' ? '#a9b6cb' : '#b9272d'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(as[0].x, as[0].y); ctx.lineTo(as[1].x, as[1].y); ctx.stroke(); } }
      // 원자
      MD.atoms.slice().sort((a, b) => a.lift - b.lift).forEach((a) => {
        const sc = 1 + 0.16 * a.lift;
        if (a.lift > 0.05) D.glow(a.x, a.y, a.r * 2.2, '#8b5cf6', 0.25 * a.lift);
        atomBall(a.x, a.y, a.el, a.r * sc);
      });
      if (MD.wrong) { MD.wrong.t += lastDt; if (MD.wrong.t > 0.5) MD.wrong = null; else { ctx.save(); ctx.globalAlpha = 1 - MD.wrong.t / 0.5; ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 4; circle(ctx, MD.wrong.s.x, MD.wrong.s.y, MD.wrong.s.r + 6); ctx.stroke(); ctx.restore(); } }
      // 하단 설명
      panel(20, 378, 760, 96, { r: 18 });
      if (MD.hypo) {
        if (MD.fail) {
          D.label(400, 410, '산소 원자 1개로는 물 분자 2개를 만들 수 없어요!', { bg: '#e2464b', size: 16 });
          textBlock('원자는 쪼갤 수 없어요. 그러니 산소는 원자 2개가 결합한 O₂ 분자여야 해요.', 400, 442, 700, 15, COL.ink, 'center', 22, 800);
        } else textBlock('수소 2칸 + 산소 1칸으로 수증기 2칸을 만들려면 물 분자마다 산소 원자가 1개씩, 모두 2개가 필요해요. 직접 확인해 봐요!', 400, 414, 700, 15, COL.ink, 'center', 22, 700);
      } else if (MD.done) {
        ctx.save(); ctx.translate(400, 408); ctx.scale(MD.ban, MD.ban);
        drawFormula([['2'], ['H', 2], [' + '], ['O', 2], ['  →  '], ['2'], ['H', 2], ['O', 1]], 0, 0, 24, '#1b2333', 'center');
        ctx.restore();
        txt('부피비 = 분자 수의 비 = 반응식의 계수비 = 2 : 1 : 2', 400, 450, 16, '#0b7a41', 'center', 800);
      } else {
        const n = mdCellsDone();
        textBlock('원자를 끌어 물 분자 칸을 채워요 (' + n + '/2칸 완성). 수소 원자 4개, 산소 원자 2개를 모두 써야 해요.', 400, 414, 700, 15, COL.ink, 'center', 22, 700);
      }
    },
  };

  /* =========================================================
     컨트롤 연결
     ========================================================= */
  function syncControls() {
    if (!CTRL_READY) return;
    const rx = rsRx(), busy = RS.phase === 'run';
    q('lblA').innerHTML = '<i class="dot" style="background:' + rx.A.c + '"></i> ' + rx.A.n + ' 부피';
    q('lblB').innerHTML = '<i class="dot" style="background:' + rx.B.c + '"></i> ' + rx.B.n + ' 부피';
    q('aVal').textContent = RS.va + ' mL'; q('bVal').textContent = RS.vb + ' mL';
    dis('aDn', busy || RS.va <= 10); dis('aUp', busy || RS.va >= 40); dis('bDn', busy || RS.vb <= 10); dis('bUp', busy || RS.vb >= 40);
    q('goBtn').textContent = RS.phase === 'idle' ? '⚡ 반응시키기' : busy ? '반응 중…' : '↺ 새 실험'; dis('goBtn', busy);
    q('rxNote').textContent = rx.key === 'ammonia' ? '※ 실제로는 촉매와 높은 압력이 필요하지만, 여기서는 단순하게 나타냈어요.' : rx.key === 'water' ? '주사기 손잡이를 끌어도 부피를 바꿀 수 있어요.' : '같은 온도 · 같은 압력에서 비교해요.';
    dis('revBtn', TB.rows[TB.rx].every((r) => r.revealed)); dis('tbResetBtn', tbCount() === 0);
    dis('mdAutoBtn', MD.auto || MD.done || MD.fail); dis('mdResetBtn', MD.auto);
    refreshSub();
  }
  function syncReadouts() {
    const sc = S.scene, rx = rsRx();
    if (sc === 'react') {
      setR('rdA', u(RS.va, ' mL')); setR('rdB', u(RS.vb, ' mL')); setR('rdLA', '넣은 ' + rx.A.n); setR('rdLB', '넣은 ' + rx.B.n);
      setR('rdBef', u(RS.va + RS.vb, ' mL')); setR('rdAft', RS.phase === 'done' ? u(fmtMl(RS.res.after), ' mL') : '-');
    } else if (sc === 'table') {
      setR('rdExp', u(tbCount() + '/9', '개')); const k = TB.rx, all = tbAll(k);
      setR('rdTR', all ? ratioOf(TB.rows[k][0] ? [TB.rows[k][0].r.usedA, TB.rows[k][0].r.usedB, TB.rows[k][0].r.vC].map((v) => Math.round(v)) : [1, 1, 1]).join(' : ') : '-');
    } else if (sc === 'model') {
      const n = MD.atoms.filter((a) => a.sock).length;
      setR('rdCell', MD.prod.filter((c) => c.socks.every((s) => s.atom)).length + '/2'); setR('rdAtom', u(n + '/' + MD.atoms.length, '개'));
      setR('rdMol', MD.hypo ? '수소 4 · 산소 1' : '수소 4 · 산소 2');
    }
  }
  setInterval(() => { syncReadouts(); syncControls(); }, 150);
  q('aDn').addEventListener('click', () => { Sound.click(); rsSet('A', RS.va - 10); });
  q('aUp').addEventListener('click', () => { Sound.click(); rsSet('A', RS.va + 10); });
  q('bDn').addEventListener('click', () => { Sound.click(); rsSet('B', RS.vb - 10); });
  q('bUp').addEventListener('click', () => { Sound.click(); rsSet('B', RS.vb + 10); });
  q('goBtn').addEventListener('click', () => { Sound.click(); rsGo(); });
  q('revBtn').addEventListener('click', () => { Sound.click(); tbRevealAll(); });
  q('tbResetBtn').addEventListener('click', () => { Sound.click(); tbInit(); });
  q('mdAutoBtn').addEventListener('click', () => { Sound.click(); mdAuto(); });
  q('mdResetBtn').addEventListener('click', () => { Sound.click(); mdInit(); syncControls(); });
  q('resetBtn').addEventListener('click', () => { Sound.click(); ({ react: () => rsReset(), table: tbInit, model: mdInit })[S.scene](); syncControls(); });

  /* =========================================================
     미션
     ========================================================= */
  const FIG_GRID = '<svg viewBox="0 0 300 120" width="300" height="120" role="img" aria-label="수소 2칸과 산소 1칸이 반응해 수증기 2칸이 되는 부피 모형"><g font-family="sans-serif" font-weight="800" font-size="13" text-anchor="middle"><rect x="8" y="22" width="52" height="52" rx="8" fill="#f6f8fc" stroke="#b9c3d3" stroke-dasharray="5 4"/><circle cx="26" cy="48" r="9" fill="#e6ecf5" stroke="#a9b6cb"/><circle cx="43" cy="48" r="9" fill="#e6ecf5" stroke="#a9b6cb"/><rect x="66" y="22" width="52" height="52" rx="8" fill="#f6f8fc" stroke="#b9c3d3" stroke-dasharray="5 4"/><circle cx="84" cy="48" r="9" fill="#e6ecf5" stroke="#a9b6cb"/><circle cx="101" cy="48" r="9" fill="#e6ecf5" stroke="#a9b6cb"/><rect x="124" y="22" width="52" height="52" rx="8" fill="#f6f8fc" stroke="#b9c3d3" stroke-dasharray="5 4"/><circle cx="141" cy="48" r="12" fill="#ef5a5a"/><circle cx="160" cy="48" r="12" fill="#ef5a5a"/><text x="92" y="98" fill="#5d6879">수소 2칸 + 산소 1칸</text><text x="192" y="52" font-size="22" fill="#8b5cf6">→</text><rect x="210" y="22" width="40" height="52" rx="8" fill="#eaf5ff" stroke="#6fbaf5"/><rect x="254" y="22" width="40" height="52" rx="8" fill="#eaf5ff" stroke="#6fbaf5"/><text x="252" y="98" fill="#2f7de1">수증기 2칸</text></g></svg>';

  game = SciSim.game({
    simId: 'm3-gas-volume',
    mount: '#game',
    badge: '기체 부피 탐정',
    homeHref: '../../index.html#g3',
    featureLabels: {
      react: '🧪 기체 주사기 · 반응 용기',
      table: '📊 부피비 분석표',
      model: '🧩 분자 칸 모형',
    },
    onFeatures(set) { F = set; if (game) refreshUI(); },
    onHint(m) { if (m.focus) pulseEl('#' + m.focus); },
    onMissionStart(m) { if (game && game.free) return; if (m.scene) setScene(m.scene); refreshUI(); },
    onComplete() { RS.rxLocked = false; refreshUI(); },
    levels: [
      {
        title: '수소와 산소로 수증기 만들기', short: '수증기 생성', icon: '💨', phase: '실험',
        features: ['react'],
        intro: '<p class="si-q">❓ 탐구 질문: 기체끼리 반응할 때 부피 사이에도 규칙이 있을까?</p>' +
          '<p>기체 주사기로 <b>수소</b>와 <b>산소</b>를 반응 용기에 넣고 <b>전기 불꽃</b>으로 반응시켜요. 반응이 끝나면 남은 기체의 부피를 살펴봐요.</p>' +
          '<p>용기는 <b>100 °C 이상</b>이라 생긴 물이 <b>수증기(기체)</b>로 있고, 온도와 압력은 항상 같아요.</p>',
        setup() { RS.rxLocked = true; setScene('react'); },
        recap: '수소와 산소는 2 : 1의 부피비로 반응해 수증기가 돼요. 한쪽이 많으면 남은 기체가 생겨요.',
        summary: sumTable([['20', '10', '없음', '20'], ['20', '20', '산소 10', '20'], ['30', '10', '수소 10', '20']], ['수소', '산소', '남은 기체', '수증기']) +
          '<ul><li>단위는 mL. 같은 온도 · 압력에서 측정해요.</li><li>수소 20 + 산소 10 → 수증기 20 (남는 기체 없음)</li></ul>',
        missions: [
          {
            title: '남는 기체가 없는 조합 찾기', scene: 'react', focus: 'goBtn',
            goal: '수소와 산소의 부피를 바꿔 가며 반응시켜 보세요. 반응 후 남는 기체가 하나도 없는 조합을 찾아요.',
            hint: '수소의 부피가 산소의 몇 배일 때 딱 맞을까요? 오른쪽 결과표를 비교해 봐요.',
            setup() { RS.rxLocked = true; if (RS.rx !== 'water') rsSelect('water'); RS.va = 20; RS.vb = 20; RS.dispA = 20; RS.dispB = 20; RS.runs = []; rsReset(); setScene('react'); },
            check: () => RS.phase === 'done' && RS.rx === 'water' && !!RS.res && !RS.res.left, hold: 0.6,
            status: () => '시도 <b>' + RS.runs.filter((r) => r.rx === 'water').length + '회</b> · 남는 기체 없음 ' + MARK(RS.phase === 'done' && RS.rx === 'water' && !!RS.res && !RS.res.left),
            explain: '수소 20 mL와 산소 10 mL(또는 40 : 20)가 남김없이 반응해 <b>수증기 20 mL</b>가 돼요. 수소와 산소는 <b>2 : 1</b>의 부피비로 반응해요.',
          },
          {
            type: 'quiz', title: '남은 산소', scene: 'react',
            goal: '수소 20 mL와 산소 20 mL를 반응시켰더니 수증기 20 mL가 생기고 산소 10 mL가 남았어요. 산소가 남은 까닭은?',
            choices: ['수소 20 mL와 반응하는 산소는 10 mL뿐이라서, 나머지 10 mL는 반응하지 못했다.', '산소는 수증기를 만들지 못하는 기체라서 항상 남는다.', '전기 불꽃이 약해서 산소가 덜 반응했다.', '수소와 산소가 1 : 1로 반응하는데 수소가 모자랐다.'],
            answer: 0,
            feedback: ['', '산소도 수소와 반응해 수증기가 돼요. 이번에는 필요한 양보다 많이 넣었을 뿐이에요.', '불꽃의 세기가 아니라 반응하는 부피의 비 때문이에요.', '수소와 산소는 2 : 1의 부피비로 반응해요. 수소 20 mL에는 산소 10 mL가 필요해요.'],
            explain: '반응하는 부피의 비는 <b>수소 : 산소 = 2 : 1</b>로 정해져 있어서, 수소 20 mL는 산소 10 mL하고만 반응해요. 남은 산소 10 mL는 반응하지 못하고 기체로 남아요.',
          },
        ],
      },
      {
        title: '부피비 분석하기', short: '부피비 분석', icon: '📊', phase: '분석',
        features: ['table'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수소 20 mL와 산소 10 mL가 딱 맞게 반응했어요.</div>' +
          '<p>남는 기체가 있는 실험에서도 <b>반응한 부피만</b> 골라내면 규칙이 보여요.</p>' +
          '<p><b>반응한 부피 = 넣은 부피 − 남은 부피</b>. 수증기 말고도 암모니아, 염화 수소를 만들 때의 자료를 해석해 봐요.</p>',
        setup() { setScene('table'); },
        recap: '반응한 기체와 생성된 기체의 부피 사이에는 간단한 정수비가 성립해요 (2 : 1 : 2, 1 : 3 : 2, 1 : 1 : 2).',
        summary: sumTable([['수소 + 산소 → 수증기', '2 : 1 : 2'], ['질소 + 수소 → 암모니아', '1 : 3 : 2'], ['수소 + 염소 → 염화 수소', '1 : 1 : 2']], ['반응', '부피비']) +
          '<ul><li>일정한 온도 · 압력에서 기체끼리 반응하면 부피 사이에 <b>간단한 정수비</b>가 성립해요. (<b>기체 반응 법칙</b>)</li></ul>',
        missions: [
          {
            title: '반응한 부피 구하기', scene: 'table', focus: 'revBtn',
            goal: '세 가지 반응의 결과표에서 실험 줄을 눌러 반응한 부피를 모두 구해요. 반응 종류는 위 단추로 바꿔요.',
            hint: '🔍 버튼을 누르면 한 반응의 세 실험이 한꺼번에 계산돼요. 반응을 바꿔 가며 해 봐요.',
            setup() { tbInit(); TB.rx = 'water'; setScene('table'); },
            check: () => tbCount() === 9, hold: 0.8,
            status: () => '확인한 실험 <b>' + tbCount() + '/9</b>',
            explain: '남은 기체를 빼고 나면 <b>반응한 부피</b>만 남아요. 실험이 달라도 반응한 부피의 비는 같아요.',
          },
          {
            title: '부피비 찾기', scene: 'table', manual: true,
            goal: '반응한 부피를 비교해 세 반응의 부피비를 완성하세요. 칸을 누르면 숫자가 바뀌어요.',
            hint: '반응한 부피를 서로 나누어 가장 간단한 정수로 나타내요. 예) 20 : 10 : 20 → 2 : 1 : 2',
            setup() { setScene('table'); },
            check: () => {
              if (tbCount() < 9) return '먼저 세 반응 모두 반응한 부피를 구해요.';
              const bad = RKEYS.filter((k) => !tbRight(k));
              if (!bad.length) return true;
              bad.forEach((k) => { const c = [REAC[k].a, REAC[k].b, REAC[k].c]; TB.bad[k] = TB.guess[k].map((v, j) => (v !== c[j] ? 1 : 0)); });
              return '아직 맞지 않은 부피비가 있어요. 빨간 칸을 다시 생각해 봐요.';
            },
            explain: '수증기 <b>2 : 1 : 2</b>, 암모니아 <b>1 : 3 : 2</b>, 염화 수소 <b>1 : 1 : 2</b>. 어느 반응이든 기체의 부피 사이에는 <b>간단한 정수비</b>가 성립해요.',
          },
          {
            type: 'quiz', title: '질소와 수소', scene: 'table',
            goal: '질소 : 수소 : 암모니아 = 1 : 3 : 2의 부피비로 반응해요. 질소 20 mL가 모두 반응하려면 수소는 몇 mL가 필요하고, 암모니아는 몇 mL가 생길까요?',
            choices: ['수소 60 mL, 암모니아 40 mL', '수소 20 mL, 암모니아 20 mL', '수소 40 mL, 암모니아 40 mL', '수소 60 mL, 암모니아 80 mL'],
            answer: 0,
            feedback: ['', '질소 1 : 수소 3의 비예요. 수소가 질소의 3배 필요해요.', '수소는 질소의 3배인 60 mL가 필요해요.', '암모니아는 질소의 2배인 40 mL예요. 부피비 1 : 3 : 2를 다시 봐요.'],
            explain: '1 : 3 : 2 = 20 : □ : △ 이므로 질소가 <b>1×20 mL</b>예요. 수소는 3×20 = <b>60 mL</b>, 암모니아는 2×20 = <b>40 mL</b>예요.',
          },
        ],
      },
      {
        title: '분자 모형으로 보기', short: '분자 모형', icon: '🧩', phase: '모형',
        features: ['model'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기체의 부피비가 2 : 1 : 2처럼 간단한 정수비임을 알았어요.</div>' +
          '<p>왜 정수비일까요? <b>같은 온도 · 압력</b>에서는 기체의 종류에 상관없이 <b>같은 부피 속에 같은 수의 분자</b>가 들어 있어요. 그래서 <b>같은 크기의 칸 하나 = 분자 1개</b>로 그릴 수 있어요.</p>',
        setup() { setScene('model'); },
        recap: '부피비 = 분자 수의 비 = 반응식의 계수비. 산소는 원자 2개가 결합한 O₂ 분자예요.',
        summary: '<span class="formula" style="font-size:15px">2H₂ + O₂ → 2H₂O<br>부피비 2 : 1 : 2 = 분자 수의 비 = 계수비</span>' +
          '<ul><li>같은 온도 · 압력에서 같은 부피 속 분자 수는 기체의 종류와 관계없이 같아요.</li><li>원자는 쪼갤 수 없으므로 산소는 원자 2개가 결합한 <b>O₂</b>예요.</li><li>부피는 보존되지 않을 수 있어요 (3칸 → 2칸).</li></ul>',
        missions: [
          {
            title: '수증기 칸 채우기', scene: 'model', focus: 'mdAutoBtn',
            goal: '수소 분자 2칸과 산소 분자 1칸의 원자를 끌어다 물 분자 칸 2개를 완성하세요.',
            hint: '산소 원자는 빨간 점선, 수소 원자는 회색 점선 자리에 놓아요. 어렵다면 ✨ 자동으로 맞추기!',
            setup() { MD.hypo = false; mdInit(); setScene('model'); refreshUI(); },
            check: () => MD.done && !MD.hypo, hold: 0.6,
            status: () => '완성한 물 분자 칸 <b>' + mdCellsDone() + '/2</b>',
            explain: '반응 전 3칸(분자 3개)이 반응 후 2칸(분자 2개)이 되었어요. <b>수소 2칸 : 산소 1칸 : 수증기 2칸</b> = 2 : 1 : 2, 반응식의 계수비와 같아요.',
          },
          {
            title: '산소가 O 1개라면?', scene: 'model', focus: 'mdResetBtn',
            goal: '❓ 산소가 원자 1개짜리 분자(O)라고 가정하고 같은 반응을 만들어 보세요. 어떤 문제가 생기나요?',
            hint: '위 단추에서 ❓ 가정 모형을 고른 뒤, 원자를 모두 끌어다 놓아 봐요.',
            setup() { MD.hypo = true; mdInit(); setScene('model'); refreshUI(); },
            check: () => MD.hypo && MD.fail, hold: 0.5,
            status: () => (MD.hypo ? '원자 ' + MD.atoms.filter((a) => a.sock).length + '/' + MD.atoms.length + ' 배치' : '❓ 가정 모형을 골라요') + ' · 문제 발견 ' + MARK(MD.hypo && MD.fail),
            explain: '산소 원자가 1개뿐이면 물 분자 1개밖에 못 만들어요. 수증기 2칸이 되려면 산소 원자가 2개 필요하니 <b>산소는 원자 2개가 결합한 O₂ 분자</b>여야 해요. (원자는 쪼갤 수 없어요.)',
          },
          {
            type: 'quiz', title: '부피비와 계수비', scene: 'model', figure: FIG_GRID,
            goal: '기체 반응에서 부피비가 반응식의 계수비와 같은 까닭은?',
            choices: ['같은 온도 · 압력에서 기체의 부피는 분자 수에 비례하므로, 부피비 = 분자 수의 비 = 계수비이다.', '부피비는 반응하는 기체의 질량의 비와 같기 때문이다.', '기체 분자의 크기가 달라 크기만큼 부피를 차지하기 때문이다.', '부피비와 계수비는 우연히 같을 뿐 관계가 없다.'],
            answer: 0,
            feedback: ['', '질량의 비와는 달라요. 수소 : 산소 부피비 2 : 1이지만 질량비는 1 : 8이에요.', '같은 온도 · 압력에서는 기체의 종류와 관계없이 같은 부피에 같은 수의 분자가 들어 있어요.', '부피가 분자 수에 비례하기 때문에 서로 같아요. 우연이 아니에요.'],
            explain: '같은 온도 · 압력에서 <b>같은 부피 속 분자 수는 같아요</b>. 그래서 부피비 = 분자 수의 비 = 반응식의 계수비가 돼요.',
          },
        ],
      },
      {
        title: '다른 기체 반응에 적용하기', short: '적용', icon: '🏠', phase: '적용',
        features: ['react'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 부피비는 분자 수의 비, 즉 계수비임을 알았어요.</div>' +
          '<p>이제 새로운 기체 반응에 적용해 봐요. <b>암모니아</b>를 만들 때 질소 10 mL와 수소 40 mL를 반응시키면 어떻게 될까요? 반응 전후 <b>부피</b>와 <b>질량</b>도 비교해 봐요.</p>',
        setup() { RS.rxLocked = false; setScene('react'); },
        recap: '기체 반응에서 부피비는 계수비와 같지만, 반응 전후의 부피 합은 달라질 수 있어요. (질량은 보존)',
        summary: sumTable([['2H₂ + O₂ → 2H₂O', '2 : 1 : 2', '3 → 2'], ['N₂ + 3H₂ → 2NH₃', '1 : 3 : 2', '4 → 2'], ['H₂ + Cl₂ → 2HCl', '1 : 1 : 2', '2 → 2']], ['반응식', '부피비', '부피(칸) 변화']) +
          '<div class="note">예) 질소 10 + 수소 40 = 50 mL → 암모니아 20 + 수소 10 = 30 mL (부피는 줄었지만 질량은 보존)</div>',
        missions: [
          {
            title: '암모니아 만들기', scene: 'react', focus: 'goBtn',
            goal: '질소 10 mL와 수소 40 mL를 반응시켜 보세요. 남는 기체와 생성된 암모니아의 부피를 확인해요.',
            hint: '위 단추에서 암모니아를 고르고 수소의 부피를 40 mL로 바꿔요.',
            setup() { RS.rxLocked = false; rsSelect('ammonia'); RS.va = 10; RS.vb = 20; RS.dispA = 10; RS.dispB = 20; rsReset(); setScene('react'); refreshUI(); },
            check: () => RS.phase === 'done' && RS.rx === 'ammonia' && RS.va === 10 && RS.vb === 40, hold: 0.6,
            status: () => '질소 ' + (RS.rx === 'ammonia' ? RS.va : '-') + ' mL · 수소 ' + (RS.rx === 'ammonia' ? RS.vb : '-') + ' mL ' + MARK(RS.phase === 'done' && RS.rx === 'ammonia' && RS.va === 10 && RS.vb === 40),
            explain: '질소 10 mL는 수소 30 mL와 반응해 <b>암모니아 20 mL</b>가 돼요. 수소 <b>10 mL</b>가 남아서 반응 후 기체는 모두 20 + 10 = 30 mL예요.',
          },
          {
            type: 'quiz', title: '부피는 줄었는데 질량은?', scene: 'react',
            goal: '질소 10 mL + 수소 40 mL(반응 전 50 mL)가 반응해 암모니아 20 mL와 수소 10 mL(반응 후 30 mL)가 되었어요. 옳은 설명은?',
            choices: ['부피는 줄었지만, 질량은 변하지 않고 보존된다.', '부피가 줄었으니 질량도 줄었다.', '줄어든 20 mL만큼의 기체가 사라졌다.', '기체 반응에서는 부피도 항상 보존된다.'],
            answer: 0,
            feedback: ['', '분자 수와 원자 수는 변하지 않아서 질량은 그대로예요. (질량 보존 법칙)', '기체가 사라진 것이 아니라 분자들이 결합해 분자 수(4칸 → 2칸)가 줄었어요.', '기체 반응에서 부피의 합은 반응마다 달라질 수 있어요. 암모니아는 줄고, 염화 수소는 같아요.'],
            explain: '질소 분자 1개와 수소 분자 3개(4칸)가 암모니아 분자 2개(2칸)가 되어 <b>부피(분자 수)는 줄어요</b>. 하지만 원자의 종류와 수는 그대로여서 <b>질량은 보존</b>돼요.',
          },
          {
            type: 'quiz', title: '염화 수소 만들기', scene: 'react',
            setup() { RS.rxLocked = false; rsSelect('hcl'); setScene('react'); refreshUI(); },
            goal: '수소 : 염소 : 염화 수소 = 1 : 1 : 2의 부피비로 반응해요. 수소 30 mL와 염소 30 mL가 모두 반응하면 염화 수소는 몇 mL가 생길까요?',
            choices: ['30 mL', '60 mL', '90 mL', '15 mL'],
            answer: 1,
            feedback: ['염화 수소는 수소(염소)의 2배가 생겨요. 1 : 1 : 2를 다시 봐요.', '', '30 + 30 + 30이 아니라, 부피비 1 : 1 : 2에서 2배인 60 mL예요.', '염화 수소가 가장 많이 생겨요(계수 2).'],
            explain: '1 : 1 : 2 = 30 : 30 : □ 이므로 염화 수소는 <b>60 mL</b>예요. 이 반응은 반응 전 60 mL → 후 60 mL로 부피가 같지만, 그건 우연이에요. 부피는 항상 보존되는 게 아니에요.',
          },
        ],
      },
    ],
  });

  CTRL_READY = true;
  setScene('react');
  refreshUI();
  const DBG = { RS, TB, MD, REAC, rsGo, rsSet, rsSelect, rsReset, tbReveal, tbRevealAll, tbInit, mdInit, mdMode, mdAuto, mdPlace, mdCheck, tbRight, get F() { return F; } };
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
