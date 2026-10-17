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
     중3 Ⅰ. 화학 반응의 규칙성 — 화학 반응과 열에너지  [9과16-06]
     ① 관찰: 손난로 · 냉각 팩의 온도 변화 → ② 실험: 발열 반응 (CaO + 물 · 중화 · 메테인 연소)
     → ③ 실험: 흡열 반응 (수산화 바륨 + 염화 암모늄 · 탄산수소 나트륨 가열) → ④ 적용: 냉각 장치 설계 · 사례 카드
     ※ 반응열 계산 · 엔탈피 · 에너지 도표의 수치는 다루지 않음 (온도 변화와 열의 출입 방향만)
     ========================================================= */
  let lastFree = false, CTRL_READY = false;
  const q = (id) => document.getElementById(id);
  const dis = (id, v) => { const n = q(id); if (n) n.disabled = !!v; };
  const E = Math.exp;
  const HOT = '#f26b3a', COLD = '#2f7de1';
  const SCN = {
    packs: { label: '🧤 손난로와 냉각 팩의 온도를 재요', btn: '🧤 팩' },
    exo: { label: '🔥 열을 내보내는 반응 (발열)', btn: '🔥 발열' },
    endo: { label: '🧊 열을 흡수하는 반응 (흡열)', btn: '🧊 흡열' },
    design: { label: '🥤 냉각 장치를 설계해요', btn: '🥤 냉각 장치' },
    cards: { label: '🗂️ 생활 속 사례를 분류해요', btn: '🗂️ 사례 카드' },
  };
  const GROUPS = { design: ['design', 'cards'], cards: ['design', 'cards'] };
  const segEl = $('#sceneSeg'), subEl = $('#subSeg');
  Object.keys(SCN).forEach((k) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.scene = k; b.textContent = SCN[k].btn; segEl.appendChild(b);
    b.addEventListener('click', () => { Sound.click(); setScene(k); });
  });
  function subItems() {
    if (S.scene === 'exo') return Object.keys(EXO.defs).map((k) => ({ t: EXO.defs[k].btn, on: EXO.k === k, fn: () => exoSelect(k) }));
    if (S.scene === 'endo') return [{ t: '🧊 Ba(OH)₂ + NH₄Cl', on: ENDO.k === 'ba', fn: () => endoSelect('ba') }, { t: '🍞 NaHCO₃ 가열', on: ENDO.k === 'na', fn: () => endoSelect('na') }];
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
    $$('#ctrlCard .control, #readouts .readout').forEach((n) => { n.hidden = !(n.dataset.sc || '').split(' ').includes(sc) || !!(n.dataset.sub && n.dataset.sub !== ENDO.k); });
    const list = lastFree ? Object.keys(SCN) : (GROUPS[sc] || []);
    segEl.hidden = list.length < 2;
    $$('button', segEl).forEach((b) => { b.hidden = !list.includes(b.dataset.scene); b.classList.toggle('on', b.dataset.scene === sc); });
    if (SCN[sc]) $('#tbLabel').textContent = SCN[sc].label;
    subSig = ''; refreshSub();
    syncControls();
  }
  function room() { vgrad(ctx, 0, 0, VW, VH, '#f7faff', '#e3ebf7'); }
  function table(y0) {
    vgrad(ctx, 0, y0, VW, 46, '#e1c398', '#c9a06a'); vgrad(ctx, 0, y0 + 46, VW, VH - y0 - 46, '#b48a56', '#9a7343');
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, y0, VW, 2);
  }
  const setR = (id, html) => { const n = q(id); if (n && n.dataset.v !== html) { n.dataset.v = html; n.innerHTML = html; } };
  const u = (v, unit) => v + '<small>' + unit + '</small>';
  const fT = (v) => v.toFixed(1);

  /* ---------- 온도 모델: dT/dt = R(t) − h (T − Ta)  (시간 단위: 분, 1초 = 0.8분) ---------- */
  const TS = 0.8;
  function mkHT(o) { const h = Object.assign({ T: 22, T0: 22, Ta: 22, h: 0.2, R: () => 0, tEnd: 14, t: 0, on: false, pts: [], acc: 0, peak: 22, low: 22, rate: 0, done: false, Rref: 10 }, o); h.T = h.T0; h.peak = h.low = h.T0; h.pts = [{ t: 0, T: h.T0 }]; return h; }
  function htReset(o) { o.T = o.T0; o.t = 0; o.on = false; o.pts = [{ t: 0, T: o.T0 }]; o.acc = 0; o.peak = o.low = o.T0; o.rate = 0; o.done = false; }
  function htUpdate(o, dt) {
    if (!o.on) { o.rate = SciSim.approach(o.rate, 0, dt, 6); return; }
    let left = dt * TS;
    while (left > 1e-9) { const s = Math.min(0.02, left); o.T += (o.R(o.t) - o.h * (o.T - o.Ta)) * s; o.t += s; left -= s; }
    o.rate = o.R(o.t);
    o.acc += dt * TS; if (o.acc >= 0.08) { o.acc = 0; o.pts.push({ t: o.t, T: o.T }); }
    o.peak = Math.max(o.peak, o.T); o.low = Math.min(o.low, o.T);
    if (o.t >= o.tEnd) { o.on = false; o.done = true; o.pts.push({ t: o.t, T: o.T }); }
  }
  /* 실시간 온도 그래프: series=[{o, color, name}] */
  function tgraph(X, Y, W, H, g, series, t) {
    panel(X, Y, W, H);
    txt(g.title || '🌡️ 온도 변화', X + W / 2, Y + 26, 15, COL.ink, 'center', 800);
    const px0 = X + 50, px1 = X + W - 16, py0 = Y + 44, py1 = Y + H - 44;
    const gx = (m) => px0 + (px1 - px0) * (m / g.tmax), gy = (T) => py1 - (py1 - py0) * ((T - g.Tmin) / (g.Tmax - g.Tmin));
    ctx.save(); ctx.font = D.font(12.5, 700);
    for (let T = g.Tmin; T <= g.Tmax + 1e-6; T += g.step) { ctx.strokeStyle = T === 0 && g.Tmin < 0 ? '#9fb0c6' : '#e8edf5'; ctx.lineWidth = T === 0 && g.Tmin < 0 ? 1.8 : 1; ctx.beginPath(); ctx.moveTo(px0, gy(T)); ctx.lineTo(px1, gy(T)); ctx.stroke(); ctx.fillStyle = COL.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(T, px0 - 7, gy(T)); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let m = 0; m <= g.tmax + 1e-6; m += g.xstep) { ctx.fillStyle = COL.muted; ctx.fillText(m, gx(m), py1 + 6); }
    ctx.restore();
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px0, py0 - 6); ctx.lineTo(px0, py1); ctx.lineTo(px1 + 4, py1); ctx.stroke();
    txt('시간(분)', (px0 + px1) / 2, py1 + 34, 13, COL.muted, 'center', 700);
    txt('°C', px0 - 8, py0 - 12, 12, COL.muted, 'right', 800);
    if (g.line != null) { D.dashedLine(px0, gy(g.line), px1, gy(g.line), { color: COL.good, width: 2, dash: [7, 5], offset: t * 10 }); txt(g.lineLabel || '', px1 - 4, gy(g.line) - 6, 12.5, COL.good, 'right', 800); }
    series.forEach((s) => {
      const o = s.o; if (o.pts.length < 1) return;
      ctx.strokeStyle = s.color; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
      o.pts.forEach((p, i) => { const x = gx(Math.min(p.t, g.tmax)), y = gy(clamp(p.T, g.Tmin, g.Tmax)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      const cx = gx(Math.min(o.t, g.tmax)), cy = gy(clamp(o.T, g.Tmin, g.Tmax)); ctx.lineTo(cx, cy); ctx.stroke();
      D.glow(cx, cy, 16, s.color, 0.35); D.sphere(cx, cy, 6, s.color, { shadow: true, outline: '#fff', outlineWidth: 2 });
    });
  }
  /* LCD 온도 표시 */
  function lcd(x, y, w, T, label, color) {
    D.shadow(() => { D.roundRect(x, y, w, 46, 10); ctx.fillStyle = '#26313f'; ctx.fill(); }, { blur: 8, y: 3 });
    txt(fT(T) + ' °C', x + w / 2, y + 31, 22, color || '#7dffb0', 'center', 800);
    if (label) txt(label, x + w / 2, y - 8, 14, COL.ink, 'center', 800);
  }
  /* 열 화살표: 방향(out=주황 나감 / in=파랑 들어옴), 세기 s(0~1) */
  function heatArrow(x, y, ang, s, out, t, o) {
    if (s < 0.04) return;
    o = o || {};
    const len = 26 + 52 * s, w = 4 + 4 * s, ux = Math.cos(ang), uy = Math.sin(ang);
    const ph = (t * 1.1) % 1, shift = (out ? 1 : -1) * 6 * Math.sin(ph * TAU);
    const cx = x + ux * shift, cy = y + uy * shift;
    const x1 = cx - ux * len / 2, y1 = cy - uy * len / 2, x2 = cx + ux * len / 2, y2 = cy + uy * len / 2;
    ctx.save(); ctx.globalAlpha = Math.min(1, 0.35 + s);
    if (out) D.arrow(x1, y1, x2, y2, { color: HOT, width: w, head: 12 + 6 * s }); else D.arrow(x2, y2, x1, y1, { color: COLD, width: w, head: 12 + 6 * s });
    ctx.restore();
  }

  /* =========================================================
     장면 1 · 손난로와 냉각 팩
     ========================================================= */
  const PK = {
    w: mkHT({ T0: 22, Ta: 22, h: 0.2, R: (t) => 11 * (1 - E(-t / 1)) * E(-t / 22), tEnd: 12, Rref: 5 }),
    c: mkHT({ T0: 22, Ta: 22, h: 0.2, R: (t) => -40 * (1 - E(-t / 0.15)) * E(-t / 0.9), tEnd: 12, Rref: 18 }),
    shakeE: 0, shakeV: 0, burst: 0, grains: [], frost: [], cg: [], lastX: 0, drag: false,
  };
  const WP = { x: 36, y: 196, w: 150, h: 112 }, CP = { x: 274, y: 196, w: 150, h: 112 };
  function pkInit() {
    htReset(PK.w); htReset(PK.c); PK.shakeE = 0; PK.shakeV = 0; PK.burst = 0; PK.drag = false;
    PK.grains = []; for (let i = 0; i < 46; i++) PK.grains.push({ x: rand(0.1, 0.9), y: rand(0.2, 0.9), vx: 0, vy: 0, ph: rand(0, 6) });
    PK.cg = []; for (let i = 0; i < 30; i++) PK.cg.push({ x: rand(0.28, 0.72), y: rand(0.3, 0.8), vx: 0, vy: 0, d: 0 });
    PK.frost = []; for (let i = 0; i < 40; i++) PK.frost.push({ x: rand(0.04, 0.96), y: rand(0.06, 0.94), s: rand(3, 8), a: rand(0, 3.14), th: Math.random() });
  }
  pkInit();
  function pkWarm() { if (PK.w.on || PK.w.done) return; PK.w.on = true; sfx.fizz(); PK.shakeV = 1; FX.burst(WP.x + WP.w / 2, WP.y + WP.h / 2, { count: 10, speed: 90, colors: ['#8a7f73', '#c9a06a', '#fff'], size: 2.6, life: 0.6, gravity: 80 }); hideHint(); }
  function pkCold() { if (PK.c.on || PK.c.done) return; PK.c.on = true; PK.burst = 0; tw(PK, { burst: 1 }, 0.5, 'outCubic', { essential: true }); sfx.pop(); FX.burst(CP.x + CP.w / 2, CP.y + CP.h / 2, { count: 14, speed: 110, colors: ['#bfe3ff', '#ffffff', '#7cc4ff'], size: 3, life: 0.7, gravity: 120 }); hideHint(); }
  SC.packs = {
    enter() { if (!PK.w.on && !PK.c.on) showHint('손난로를 흔들고, 냉각 팩의 속주머니를 눌러 터뜨려 보세요', 5600); },
    update(dt) {
      htUpdate(PK.w, dt); htUpdate(PK.c, dt);
      PK.shakeE = Math.max(0, PK.shakeE - dt * 0.6); PK.shakeV = SciSim.approach(PK.shakeV, PK.drag ? 1 : 0, dt, 5);
      if (PK.w.on || PK.drag) PK.grains.forEach((g) => { g.vx += (Math.random() - 0.5) * 6 * dt * (PK.shakeV + 0.4); g.vy += (Math.random() - 0.5) * 6 * dt * (PK.shakeV + 0.4); g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= 0.9; g.vy *= 0.9; if (g.x < 0.06 || g.x > 0.94) g.vx *= -1; if (g.y < 0.15 || g.y > 0.92) g.vy *= -1; g.x = clamp(g.x, 0.06, 0.94); g.y = clamp(g.y, 0.15, 0.92); });
      if (PK.c.on) PK.cg.forEach((g) => { g.d = Math.min(1, g.d + dt * 0.5); g.x += (Math.sin(S.sceneT * 1.7 + g.y * 20) * 0.02) * dt * 2 + (Math.random() - 0.5) * dt * 0.3; g.y += (Math.random() - 0.5) * dt * 0.3; g.x = clamp(g.x, 0.06, 0.94); g.y = clamp(g.y, 0.18, 0.92); });
      if (PK.w.on && PK.w.rate > 1 && Math.random() < dt * 4) FX.emit({ x: WP.x + rand(20, WP.w - 20), y: WP.y + 6, vx: rand(-6, 6), vy: -rand(30, 50), life: 1.4, size: 6, grow: 10, color: '#ffd6a8', shape: 'smoke', alpha: 0.6 });
    },
    hover(p) { if (!PK.w.on && inRect(p, WP, 10)) return 'grab'; if (!PK.c.on && inRect(p, CP, 10)) return 'pointer'; return null; },
    down(p) {
      if (!PK.c.on && inRect(p, CP, 6)) { pkCold(); return false; }
      if (!PK.w.on && inRect(p, WP, 8)) { PK.drag = true; PK.lastX = p.x; return true; }
      return false;
    },
    move(p) { PK.shakeE += Math.abs(p.x - PK.lastX) * 0.012; PK.lastX = p.x; if (PK.shakeE > 1.2) { PK.drag = false; pkWarm(); } },
    up() { PK.drag = false; },
    draw(t) {
      room(); table(316);
      // ----- 손난로
      const wT = PK.w.T, wk = clamp((wT - 22) / 30, 0, 1);
      const jx = (PK.drag || PK.shakeV > 0.1 ? Math.sin(t * 46) * 4 * PK.shakeV : 0), jr = (PK.drag || PK.shakeV > 0.1 ? Math.sin(t * 38) * 0.05 * PK.shakeV : 0);
      ctx.save(); ctx.translate(WP.x + WP.w / 2 + jx, WP.y + WP.h / 2); ctx.rotate(jr);
      D.shadow(() => { D.roundRect(-WP.w / 2, -WP.h / 2, WP.w, WP.h, 18); ctx.fillStyle = mix('#e9e4da', '#ffc78a', wk); ctx.fill(); }, { blur: 12, y: 6 });
      D.roundRect(-WP.w / 2, -WP.h / 2, WP.w, WP.h, 18); ctx.strokeStyle = mix('#b8b0a2', '#e08a38', wk); ctx.lineWidth = 3; ctx.stroke();
      ctx.setLineDash([4, 5]); D.roundRect(-WP.w / 2 + 9, -WP.h / 2 + 9, WP.w - 18, WP.h - 18, 12); ctx.strokeStyle = 'rgba(120,100,80,.35)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      PK.grains.forEach((g) => { ctx.fillStyle = mix('#4b4540', '#a8552a', wk); ctx.beginPath(); ctx.arc(-WP.w / 2 + g.x * WP.w, -WP.h / 2 + g.y * WP.h, 3.1, 0, TAU); ctx.fill(); });
      if (wk > 0.05) D.glow(0, 0, 90, '#ff8a3d', 0.4 * wk);
      ctx.restore();
      txt('손난로', WP.x + WP.w / 2, WP.y - 18, 16, COL.ink, 'center', 800);
      textBlock('철 가루 + 소금물 + 활성탄', WP.x + WP.w / 2, WP.y + WP.h + 24, 160, 12.5, COL.muted, 'center', 16, 700);
      if (!PK.w.on && !PK.w.done) { D.ring(WP.x + WP.w / 2, WP.y + WP.h / 2, 90, t, { color: '#8b5cf6' }); txt('흔들어요 ↔', WP.x + WP.w / 2, WP.y + WP.h / 2 + 6, 15, '#6d28d9', 'center', 800); }
      // ----- 냉각 팩
      const cT = PK.c.T, ck = clamp((22 - cT) / 26, 0, 1);
      D.shadow(() => { D.roundRect(CP.x, CP.y, CP.w, CP.h, 18); ctx.fillStyle = mix('#eaf1fb', '#cfe8ff', ck); ctx.fill(); }, { blur: 12, y: 6 });
      D.roundRect(CP.x, CP.y, CP.w, CP.h, 18); ctx.strokeStyle = mix('#a9bcd6', '#6fb6f0', ck); ctx.lineWidth = 3; ctx.stroke();
      // 속주머니
      const bl = 1 - PK.burst;
      if (bl > 0.02) { ctx.save(); ctx.globalAlpha = bl; D.roundRect(CP.x + 38, CP.y + 26, CP.w - 76, CP.h - 52, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#b9c3d3'; ctx.lineWidth = 2; ctx.stroke(); txt('질산 암모늄', CP.x + CP.w / 2, CP.y + CP.h / 2 + 5, 13, COL.muted, 'center', 800); ctx.restore(); }
      if (PK.c.on) PK.cg.forEach((g) => { const a = (1 - g.d * 0.7); ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * a).toFixed(2) + ')'; ctx.fillRect(CP.x + g.x * CP.w - 3, CP.y + g.y * CP.h - 3, 6, 6); });
      PK.frost.forEach((f) => { if (f.th < clamp((12 - cT) / 12, 0, 1)) { ctx.save(); ctx.translate(CP.x + f.x * CP.w, CP.y + f.y * CP.h); ctx.rotate(f.a); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-f.s, 0); ctx.lineTo(f.s, 0); ctx.stroke(); } ctx.restore(); } });
      txt('냉각 팩', CP.x + CP.w / 2, CP.y - 18, 16, COL.ink, 'center', 800);
      textBlock('속주머니(질산 암모늄) + 물', CP.x + CP.w / 2, CP.y + CP.h + 24, 170, 12.5, COL.muted, 'center', 16, 700);
      if (!PK.c.on && !PK.c.done) { D.ring(CP.x + CP.w / 2, CP.y + CP.h / 2, 90, t, { color: '#8b5cf6' }); txt('눌러요 👇', CP.x + CP.w / 2, CP.y + CP.h / 2 + 34, 15, '#6d28d9', 'center', 800); }
      // 온도계
      D.thermometer(214, 110, 150, wT, -10, 60, { color: HOT, step: 10, unit: '°' });
      D.thermometer(452, 110, 150, cT, -10, 60, { color: COLD, step: 10, unit: '°' });
      // LCD
      lcd(WP.x + 2, 350, 146, wT, null, '#ffb27a'); lcd(CP.x + 2, 350, 146, cT, null, '#8fd0ff');
      txt('기록: 최고 ' + fT(PK.w.peak) + ' °C', WP.x + 75, 424, 14, '#fff', 'center', 800, { stroke: 'rgba(80,50,20,.5)', strokeWidth: 3 });
      txt('기록: 최저 ' + fT(PK.c.low) + ' °C', CP.x + 75, 424, 14, '#fff', 'center', 800, { stroke: 'rgba(80,50,20,.5)', strokeWidth: 3 });
      // 그래프
      tgraph(512, 18, 280, 340, { tmax: 12, xstep: 2, Tmin: -10, Tmax: 60, step: 10, title: '🌡️ 온도 변화 그래프' }, [{ o: PK.w, color: HOT }, { o: PK.c, color: COLD }], t);
      D.label(570, 380, '● 손난로', { bg: HOT, size: 13, pad: 8 }); D.label(668, 380, '● 냉각 팩', { bg: COLD, size: 13, pad: 8 });
    },
  };

  /* =========================================================
     장면 2 · 발열 반응
     ========================================================= */
  const EXO = {
    k: 'cao', done: {},
    defs: {
      cao: { btn: '🧱 산화 칼슘 + 물', eq: 'CaO + H₂O → Ca(OH)₂ + 열', ht: () => mkHT({ T0: 25, Ta: 25, h: 0.25, R: (t) => 90 * E(-t / 0.7), tEnd: 8, Rref: 50 }) },
      hcl: { btn: '🧪 염산 + 수산화 나트륨', eq: 'HCl + NaOH → NaCl + H₂O + 열', ht: () => mkHT({ T0: 25, Ta: 25, h: 0.35, R: (t) => 22 * E(-t / 0.3), tEnd: 6, Rref: 14 }) },
      ch4: { btn: '🔥 메테인 연소', eq: 'CH₄ + 2O₂ → CO₂ + 2H₂O + 열', ht: () => mkHT({ T0: 25, Ta: 25, h: 0.25, R: (t) => 22 * Math.min(1, t / 0.2) * (t < 2.5 ? 1 : E(-(t - 2.5) / 0.3)), tEnd: 8, Rref: 22 }) },
    },
    ht: null, anim: 0, bub: [],
  };
  function exoInit() { EXO.ht = EXO.defs[EXO.k].ht(); EXO.anim = 0; EXO.bub = []; }
  exoInit();
  function exoSelect(k) { if (EXO.ht.on) return; EXO.k = k; exoInit(); syncControls(); }
  function exoGo() {
    if (EXO.ht.on) return;
    if (EXO.ht.done) { exoInit(); return; }
    EXO.ht.on = true; EXO.anim = 0; sfx.whoosh(); hideHint();
  }
  const BK = { x: 64, y: 190, w: 190, h: 200 };
  SC.exo = {
    enter() { if (!EXO.ht.on && !EXO.ht.done) showHint('▶ 반응시키기를 눌러 온도 변화와 열의 이동을 살펴보세요', 5200); },
    update(dt) {
      const o = EXO.ht, wasOn = o.on; htUpdate(o, dt);
      if (o.on) EXO.anim += dt;
      if (wasOn && o.done) { EXO.done[EXO.k] = { peak: o.peak }; later(0.2, () => okFx(BK.x + BK.w / 2, BK.y + 30, HOT)); syncControls(); }
      // 효과
      const k = EXO.k, a = EXO.anim;
      if (o.on && k === 'cao' && a < 5 && Math.random() < dt * 40 * clamp(o.rate / 40, 0, 1.5)) EXO.bub.push({ x: rand(0.1, 0.9), y: 1, vy: rand(0.5, 1.1), r: rand(2, 4.6) });
      if (o.on && k === 'cao' && o.rate > 8 && Math.random() < dt * 8) FX.emit({ x: BK.x + rand(20, BK.w - 20), y: BK.y - 6, vx: rand(-8, 8), vy: -rand(36, 66), life: 1.6, size: 8, grow: 14, color: '#f4f7fb', shape: 'smoke', alpha: 0.8 });
      if (o.on && k === 'ch4' && o.t < 2.6 && Math.random() < dt * 4) FX.emit({ x: BK.x + BK.w / 2 + rand(-20, 20), y: BK.y + BK.h + 8, vx: rand(-14, 14), vy: -rand(30, 60), life: 1.3, size: 6, grow: 10, color: '#fff2e0', shape: 'smoke', alpha: 0.5 });
      EXO.bub.forEach((b) => { b.y -= b.vy * dt; }); EXO.bub = EXO.bub.filter((b) => b.y > 0.02);
    },
    draw(t) {
      room(); table(EXO.k === 'ch4' ? 484 : 402);
      const o = EXO.ht, k = EXO.k, def = EXO.defs[k], a = EXO.anim;
      const s = clamp(Math.abs(o.rate) / o.Rref, 0, 1), cx = BK.x + BK.w / 2;
      D.label(210, 36, def.eq, { bg: '#1b2333', size: 15 });
      // 비커 + 내용물
      let liquid = '#9fd3ff', level = 0.62;
      if (k === 'hcl') { const mixk = clamp((a - 0.9) / 0.6, 0, 1); liquid = a < 0.9 ? '#f5d84a' : mix('#f5d84a', '#6ccf8a', mixk); level = 0.5 + 0.1 * clamp(a / 0.9, 0, 1); }
      if (k === 'ch4') level = 0.6;
      if (k === 'cao') liquid = mix('#9fd3ff', '#eaf3fb', clamp(a / 2, 0, 0.6));
      D.beaker(BK.x, BK.y, BK.w, BK.h, { level: o.on || o.done || k !== 'hcl' ? level : 0.5, liquid, t, ticks: 5, wave: o.on ? 3 : 1.2 });
      // 산화 칼슘 알갱이 / 기포
      if (k === 'cao') {
        if (!o.on && !o.done) { for (let i = 0; i < 7; i++) { ctx.fillStyle = '#f7f7f4'; ctx.strokeStyle = '#c9cfd8'; ctx.lineWidth = 1.5; D.roundRect(BK.x + 24 + (i % 4) * 30 + (i > 3 ? 14 : 0), 128 - Math.floor(i / 4) * 22 + Math.sin(t * 2 + i) * 2, 22, 16, 5); ctx.fill(); ctx.stroke(); } txt('산화 칼슘(CaO)', cx, 100, 14, COL.ink, 'center', 800); }
        else for (let i = 0; i < 7; i++) { const p = clamp((a - i * 0.07) / 0.5, 0, 1); if (p > 0 && p < 1) { ctx.fillStyle = '#f7f7f4'; ctx.strokeStyle = '#c9cfd8'; D.roundRect(BK.x + 24 + (i % 4) * 30 + (i > 3 ? 14 : 0), lerp(130, BK.y + BK.h * 0.55, ease.inQuad(p)), 22, 16, 5); ctx.fill(); ctx.stroke(); } }
        ctx.save(); D.roundRect(BK.x + 3, BK.y + BK.h * 0.3, BK.w - 6, BK.h * 0.68, 8); ctx.clip();
        EXO.bub.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(BK.x + 8 + b.x * (BK.w - 16), BK.y + BK.h * 0.3 + b.y * BK.h * 0.66, b.r, 0, TAU); ctx.stroke(); });
        ctx.restore();
      }
      // 중화: 시험관 두 개
      if (k === 'hcl') {
        const p1 = ease.inOutCubic(clamp(a / 0.8, 0, 1)), p2 = clamp((a - 0.8) / 0.5, 0, 1);
        const tube = (x, col, name, dir) => {
          const ang = dir * 2.25 * (a < 1.3 ? smooth(a / 0.7) : Math.max(0, 1 - (a - 1.3) * 1.5));
          ctx.save(); ctx.translate(x, 108); ctx.rotate(ang * (o.on || o.done ? 1 : 0));
          D.testTube(0, -50, 34, 110, { level: o.on || o.done ? clamp(0.8 - p1 * 0.8, 0, 0.8) : 0.8, liquid: col });
          ctx.restore(); txt(name, x, 76, 13, COL.ink, 'center', 800);
        };
        tube(cx - 70, '#f5d84a', '염산(HCl)', 1); tube(cx + 70, '#4a86f0', '수산화 나트륨(NaOH)', -1);
        if (a > 0.3 && a < 1.3) { ctx.strokeStyle = 'rgba(245,216,74,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 32, 140); ctx.lineTo(cx - 8, BK.y + BK.h * 0.42); ctx.stroke(); ctx.strokeStyle = 'rgba(74,134,240,.9)'; ctx.beginPath(); ctx.moveTo(cx + 32, 140); ctx.lineTo(cx + 8, BK.y + BK.h * 0.42); ctx.stroke(); }
      }
      // 메테인 버너
      if (k === 'ch4') {
        const fx = cx, fy = BK.y + BK.h + 88;
        D.roundRect(fx - 9, fy - 2, 18, 40, 4); const bg = ctx.createLinearGradient(fx - 9, 0, fx + 9, 0); bg.addColorStop(0, '#9aa7ba'); bg.addColorStop(0.5, '#e6ecf4'); bg.addColorStop(1, '#8794a8'); ctx.fillStyle = bg; ctx.fill();
        D.roundRect(fx - 30, fy + 34, 60, 12, 6); ctx.fillStyle = '#5d6879'; ctx.fill();
        const on = o.on && o.t < 2.6 ? 1 : 0; EXO.fl = SciSim.approach(EXO.fl || 0, on, lastDt, 8);
        if (EXO.fl > 0.03) D.flame(fx, fy - 2, 84 * EXO.fl, t, { glow: '#ffa733' });
        txt('메테인(CH₄)', fx + 24, fy + 20, 13, COL.ink, 'left', 800);
        ctx.strokeStyle = '#6b7686'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(BK.x + 20, fy + 44); ctx.lineTo(BK.x + 20, BK.y + BK.h + 2); ctx.moveTo(BK.x + BK.w - 20, fy + 44); ctx.lineTo(BK.x + BK.w - 20, BK.y + BK.h + 2); ctx.stroke();
      }
      // 열 화살표 (주황: 나감)
      if (s > 0.04) {
        const out = [[BK.x - 30, BK.y + 100, Math.PI], [BK.x + BK.w + 30, BK.y + 100, 0], [cx, BK.y - 34, -Math.PI / 2], [BK.x - 24, BK.y + 30, -Math.PI * 0.75], [BK.x + BK.w + 24, BK.y + 30, -Math.PI * 0.25]];
        if (k === 'ch4') { out.length = 0; out.push([BK.x - 22, BK.y + BK.h - 24, -Math.PI * 0.8], [cx - 70, BK.y + BK.h + 40, Math.PI * 0.85], [cx + 70, BK.y + BK.h + 40, Math.PI * 0.15]); }
        out.forEach((p) => heatArrow(p[0], p[1], p[2], s, true, t));
        D.label(cx, k === 'ch4' ? BK.y - 22 : BK.y + BK.h + 24, '열에너지가 밖으로 나가요', { bg: 'rgba(255,255,255,.95)', color: '#c2410c', size: 13.5, border: '#f9c9a4' });
      }
      // 온도계
      D.thermometer(318, 110, 200, o.T, 0, 80, { color: HOT, step: 10, unit: '°' });
      lcd(292, 355, 86, o.T, null, '#ffb27a');
      // 그래프
      tgraph(404, 18, 386, 330, { tmax: 8, xstep: 1, Tmin: 20, Tmax: 80, step: 10, title: '🌡️ ' + def.btn.slice(2) + ' — 온도 변화' }, [{ o, color: HOT }], t);
      panel(404, 362, 386, 146);
      if (o.done) {
        txt('최고 온도 ' + fT(o.peak) + ' °C (+' + fT(o.peak - o.T0) + ' °C)', 597, 394, 16, '#c2410c', 'center', 800);
        textBlock('온도가 올라갔어요 → 반응하면서 열에너지를 방출해요. 이런 반응이 발열 반응이에요.', 424, 424, 346, 14.5, COL.ink, 'left', 21, 700);
      } else if (o.on) textBlock('온도계의 눈금과 주황색 화살표를 살펴보세요…', 424, 400, 346, 15, COL.muted, 'left', 22, 700);
      else textBlock('반응시키면 온도가 어떻게 변할까요? 열은 어느 쪽으로 이동할까요?', 424, 400, 346, 15, COL.muted, 'left', 22, 700);
      const ds = Object.keys(EXO.defs).map((kk) => (EXO.done[kk] ? '✅' : '⬜'));
      txt('측정한 반응 ' + ds.join(' '), 597, 492, 13, COL.muted, 'center', 800);
    },
  };

  /* =========================================================
     장면 3 · 흡열 반응
     ========================================================= */
  const ENDO = { k: 'ba' };
  const BA = { ht: null, stirT: 0, ice: 0, frost: 0, lift: 0, lifted: false, stuck: false, tries: 0, nh3: [] };
  const NA = { flame: false, prog: 0, offT: 0, offSeen: false, t: 0, pts: [], acc: 0, bub: [], fl: 0, everOn: false, milk: 0 };
  function baInit() { for (let i = ANIM.length - 1; i >= 0; i--) if (ANIM[i].obj === BA) ANIM.splice(i, 1); BA.sticking = false; BA.ht = mkHT({ T0: 22, Ta: 22, h: 0.15, R: (t) => -60 * (1 - E(-t / 0.2)) * E(-t / 1.2), tEnd: 8, Rref: 25 }); BA.stirT = 0; BA.ice = 0; BA.frost = 0; BA.lift = 0; BA.lifted = false; BA.stuck = false; BA.tries = 0; BA.nh3 = []; }
  function naInit() { NA.flame = false; NA.prog = 0; NA.offT = 0; NA.offSeen = false; NA.t = 0; NA.pts = [{ t: 0, p: 0, f: 0 }]; NA.acc = 0; NA.bub = []; NA.fl = 0; NA.everOn = false; NA.milk = 0; }
  baInit(); naInit();
  function endoSelect(k) { ENDO.k = k; syncControls(); }
  function baStir() { if (BA.ht.on || BA.ht.done) return; BA.ht.on = true; BA.stirT = 2.6; sfx.fizz(); hideHint(); }
  function baLift() {
    if (!BA.ht.on && !BA.ht.done) { showHint('먼저 🥄 섞기를 눌러 반응시켜요', 3200); return; }
    if (BA.lifted) { BA.lifted = false; tw(BA, { lift: 0 }, 0.8, 'outBounce', { essential: true }); return; }
    BA.lifted = true; BA.tries++;
    const stick = BA.ice > 0.8; BA.sticking = stick;
    tw(BA, { lift: 1 }, 0.9, 'outCubic', { essential: true, onDone: () => {
      if (!BA.lifted) return;
      if (stick) { BA.stuck = true; sfx.ding(); FX.burst(230, 330, { count: 14, speed: 120, colors: ['#bfe3ff', '#ffffff', '#7cc4ff'], size: 3, life: 0.8, gravity: 160 }); showHint('나무판이 비커에 붙어서 같이 올라왔어요!', 4200); }
      else { sfx.thud(); showHint('아직 물이 얼지 않아서 나무판이 떨어져 있어요. 온도가 더 내려갈 때까지 기다려요', 4600); }
    } });
  }
  function naToggle() { NA.flame = !NA.flame; NA.everOn = NA.everOn || NA.flame; if (NA.flame) sfx.whoosh(); hideHint(); }
  const BB = { x: 120, w: 200, bot: 366, h: 176 };
  SC.endo = {
    enter() { if (ENDO.k === 'ba' && !BA.ht.on) showHint('🥄 섞기를 눌러 두 물질을 섞어 보세요', 4800); if (ENDO.k === 'na' && !NA.everOn) showHint('🔥 가열을 눌러 탄산수소 나트륨을 가열해 보세요', 4800); },
    update(dt) {
      // 수산화 바륨
      const o = BA.ht; htUpdate(o, dt);
      if (BA.stirT > 0) BA.stirT -= dt;
      if (o.on || o.done) { BA.ice = Math.max(BA.ice, clamp((2 - o.T) / 8, 0, 1)); BA.frost = Math.max(BA.frost, clamp((12 - o.T) / 30, 0, 1)); }
      if (o.on && BA.stirT > 0 && Math.random() < dt * 5) BA.nh3.push({ x: rand(0.2, 0.8), y: 0, a: 1 });
      BA.nh3.forEach((n) => { n.y += dt * 40; n.a -= dt * 0.5; }); BA.nh3 = BA.nh3.filter((n) => n.a > 0);
      // 탄산수소 나트륨
      NA.fl = SciSim.approach(NA.fl, NA.flame ? 1 : 0, dt, 8);
      if (NA.flame && NA.prog < 1) { NA.prog = Math.min(1, NA.prog + dt * 0.085); NA.offT = 0; if (Math.random() < dt * 14) NA.bub.push({ x: rand(0.2, 0.8), y: 1, vy: rand(0.5, 1), r: rand(2.4, 4.4) }); }
      else if (!NA.flame) { NA.offT += dt; if (NA.offT > 1.6 && NA.prog > 0.3) NA.offSeen = true; }
      NA.bub.forEach((b) => { b.y -= b.vy * dt; }); NA.bub = NA.bub.filter((b) => b.y > 0.02);
      NA.milk = SciSim.approach(NA.milk, NA.prog, dt, 2);
      if (NA.flame || NA.pts.length > 1 || NA.everOn) { NA.t += dt; NA.acc += dt; if (NA.acc > 0.12) { NA.acc = 0; NA.pts.push({ t: NA.t, p: NA.prog, f: NA.flame ? 1 : 0 }); if (NA.pts.length > 500) NA.pts.shift(); } }
    },
    draw(t) {
      room(); table(380);
      if (ENDO.k === 'ba') drawBa(t); else drawNa(t);
    },
  };
  function drawBa(t) {
    const o = BA.ht, cx = BB.x + BB.w / 2, s = clamp(Math.abs(o.rate) / o.Rref, 0, 1);
    const liftY = -92 * BA.lift;
    D.label(240, 34, 'Ba(OH)₂·8H₂O + 2NH₄Cl → BaCl₂ + 2NH₃ + 10H₂O (열 흡수)', { bg: '#1b2333', size: 13, pad: 9 });
    // 나무판 (붙으면 같이 올라감)
    const bdY = 380 + (BA.stuck || (BA.lifted && BA.sticking) ? liftY : 0);
    D.shadow(() => { D.roundRect(BB.x - 24, bdY - 14, BB.w + 48, 18, 4); const g = ctx.createLinearGradient(0, bdY - 14, 0, bdY + 4); g.addColorStop(0, '#d8b27a'); g.addColorStop(1, '#b98a52'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(120,80,40,.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(BB.x - 14 + i * 70, bdY - 11); ctx.lineTo(BB.x + 18 + i * 70, bdY - 5); ctx.stroke(); }
    // 물 (젖은 나무판) / 얼음
    const ice = BA.ice;
    ctx.fillStyle = ice > 0.5 ? 'rgba(220,240,255,' + (0.7 + 0.3 * ice).toFixed(2) + ')' : 'rgba(110,180,255,.65)';
    ctx.beginPath(); ctx.ellipse(cx, bdY - 14, 98, 5 + 1.5 * ice, 0, 0, TAU); ctx.fill();
    if (ice > 0.3) { ctx.strokeStyle = 'rgba(255,255,255,' + ice.toFixed(2) + ')'; ctx.lineWidth = 1.5; for (let i = 0; i < 9; i++) { const x = cx - 80 + i * 20; ctx.beginPath(); ctx.moveTo(x, bdY - 16); ctx.lineTo(x + 5, bdY - 12); ctx.stroke(); } }
    // 비커
    const by = BB.bot - BB.h + liftY;
    D.beaker(BB.x, by, BB.w, BB.h, { level: 0.34, liquid: '#e9eef5', t, ticks: 4, wave: 0 });
    // 가루 / 슬러시
    ctx.save(); D.roundRect(BB.x + 3, by + BB.h * 0.62, BB.w - 6, BB.h * 0.36, 8); ctx.clip();
    const mixk = clamp(BA.stirT > -9 && (o.on || o.done) ? 1 : 0, 0, 1);
    ctx.fillStyle = o.on || o.done ? 'rgba(235,240,248,.95)' : '#fbfcfe'; ctx.fillRect(BB.x, by + BB.h * 0.62, BB.w, BB.h * 0.4);
    for (let i = 0; i < 40; i++) { const px = BB.x + 10 + ((i * 53) % (BB.w - 20)), py = by + BB.h * 0.66 + ((i * 29) % (BB.h * 0.3)); ctx.fillStyle = (i % 2 && !(o.on || o.done)) ? '#dfe6f0' : '#ffffff'; ctx.fillRect(px, py, 5, 4); }
    ctx.restore();
    // 서리
    if (BA.frost > 0.03) { ctx.save(); D.roundRect(BB.x - 2, by + 6, BB.w + 4, BB.h - 6, 10); ctx.clip(); for (let i = 0; i < 70; i++) { const fx = BB.x + ((i * 37) % (BB.w)), fy = by + 14 + ((i * 53) % (BB.h - 20)); if ((i % 10) / 10 < BA.frost * 1.6) { ctx.save(); ctx.translate(fx, fy); ctx.rotate(i); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); } ctx.restore(); } } ctx.fillStyle = 'rgba(235,246,255,' + (0.35 * BA.frost).toFixed(2) + ')'; ctx.fillRect(BB.x - 4, by, BB.w + 8, BB.h); ctx.restore(); }
    // 젓개
    if (BA.stirT > 0 || (o.on && BA.stirT > -1)) { const sw = Math.sin(t * 9) * 26 * clamp(BA.stirT, 0, 1); ctx.strokeStyle = 'rgba(120,150,190,.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + 40 + sw * 0.3, by - 36); ctx.lineTo(cx + sw, by + BB.h - 24); ctx.stroke(); }
    // 암모니아 냄새
    BA.nh3.forEach((n) => { ctx.save(); ctx.globalAlpha = Math.max(0, n.a) * 0.7; ctx.strokeStyle = '#7bc47a'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 10; i++) { const yy = by - 6 - n.y - i * 3, xx = BB.x + n.x * BB.w + Math.sin(i * 0.9 + t * 3) * 6; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore(); });
    if (BA.nh3.length) txt('NH₃ 냄새', BB.x - 10, by - 40, 13, '#3f8f3e', 'right', 800);
    // 열 화살표 (파랑: 들어옴)
    if (s > 0.04) {
      [[BB.x - 34, by + 90, Math.PI], [BB.x + BB.w + 34, by + 90, 0], [cx, by - 40, -Math.PI / 2], [BB.x - 26, by + 20, -Math.PI * 0.75], [BB.x + BB.w + 26, by + 20, -Math.PI * 0.25]].forEach((p) => heatArrow(p[0], p[1], p[2], s, false, t));
      D.label(cx, by + BB.h + 36, '주변의 열에너지를 흡수해요', { bg: 'rgba(255,255,255,.95)', color: '#1d5fb8', size: 13.5, border: '#a8c9f1' });
    }
    // 온도계
    D.thermometer(360, 90, 200, o.T, -30, 40, { color: COLD, step: 10, unit: '°' });
    lcd(334, 396, 86, o.T, null, '#8fd0ff');
    // 그래프
    tgraph(432, 18, 358, 300, { tmax: 8, xstep: 1, Tmin: -30, Tmax: 30, step: 10, title: '🌡️ 온도 변화', line: 0, lineLabel: '0 °C' }, [{ o, color: COLD }], t);
    panel(432, 330, 358, 170);
    const st = [['반응 시작', o.on || o.done], ['온도가 0 °C 이하', o.low <= 0], ['나무판의 물이 얼음', BA.ice > 0.8], ['나무판이 비커에 붙음', BA.stuck]];
    st.forEach((r, i) => { txt((r[1] ? '✅ ' : '⬜ ') + r[0], 452, 362 + i * 28, 15, r[1] ? '#0b7a41' : COL.muted, 'left', 800); });
    if (o.low < 22) txt('최저 ' + fT(o.low) + ' °C', 770, 362, 15, COLD, 'right', 800);
    txt(BA.stuck ? '열을 흡수해 물이 얼었어요 → 흡열 반응!' : '온도가 내려가면 열을 흡수하는 반응이에요', 611, 486, 13.5, COL.muted, 'center', 800);
  }
  function drawNa(t) {
    const prog = NA.prog;
    D.label(240, 34, '2NaHCO₃ → Na₂CO₃ + H₂O + CO₂ (계속 가열해야 분해)', { bg: '#1b2333', size: 13, pad: 9 });
    // 시험관 (기울어진)
    ctx.save(); ctx.translate(200, 250); ctx.rotate(0.22);
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(-90, -20); ctx.lineTo(70, -20); ctx.arc(70, 0, 20, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-90, 20); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.beginPath(); ctx.moveTo(-90, -20); ctx.lineTo(70, -20); ctx.arc(70, 0, 20, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-90, 20); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.moveTo(-90, -20); ctx.lineTo(70, -20); ctx.arc(70, 0, 20, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-90, 20); ctx.clip();
    ctx.fillStyle = mix('#fbfcfe', '#e7e1d6', prog * 0.8); ctx.fillRect(10, -2, 80, 24);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#e5eaf2'; ctx.fillRect(14 + (i * 17) % 70, 2 + (i * 7) % 16, 4, 3); }
    ctx.restore();
    D.roundRect(-96, -18, 16, 36, 4); ctx.fillStyle = '#c89b63'; ctx.fill();
    ctx.restore();
    txt('탄산수소 나트륨(NaHCO₃)', 190, 190, 14, COL.ink, 'center', 800);
    // 물방울 (입구)
    if (prog > 0.2) { ctx.fillStyle = 'rgba(120,190,255,.85)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(116 + i * 5, 258 + i * 2 - 2, 2.4, 0, TAU); ctx.fill(); } }
    // 유도관
    ctx.strokeStyle = 'rgba(143,163,189,.9)'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(108, 229); ctx.lineTo(84, 229); ctx.lineTo(84, 346); ctx.stroke();
    // 석회수 (왼쪽)
    const lx = 24, ly = 300, lw = 120, lh = 130;
    D.beaker(lx, ly - 10, lw, lh, { level: 0.58, liquid: mix('#bfe3ff', '#f4f6f8', clamp(NA.milk * 1.1, 0, 0.95)), t, ticks: 0, wave: 1.5 });
    ctx.save(); D.roundRect(lx + 3, ly + 40, lw - 6, 76, 8); ctx.clip(); NA.bub.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(lx + 18 + b.x * (lw - 36), ly + 40 + b.y * 76, b.r, 0, TAU); ctx.stroke(); }); ctx.restore();
    txt('석회수 (CO₂ → 뿌옇게)', lx + lw / 2, ly + lh + 18, 13, COL.ink, 'center', 800);
    // 버너
    const fx = 262, fy = 372;
    ctx.strokeStyle = '#6b7686'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fx - 70, 380); ctx.lineTo(fx - 52, 296); ctx.moveTo(fx + 70, 380); ctx.lineTo(fx + 52, 296); ctx.stroke();
    D.roundRect(fx - 8, fy - 10, 16, 36, 4); const bg = ctx.createLinearGradient(fx - 8, 0, fx + 8, 0); bg.addColorStop(0, '#9aa7ba'); bg.addColorStop(0.5, '#e6ecf4'); bg.addColorStop(1, '#8794a8'); ctx.fillStyle = bg; ctx.fill();
    D.roundRect(fx - 30, fy + 22, 60, 12, 6); ctx.fillStyle = '#5d6879'; ctx.fill();
    if (NA.fl > 0.03) D.flame(fx, fy - 10, 84 * NA.fl, t, { glow: '#ffa733' });
    // 열 화살표 (파랑: 들어옴)
    if (NA.flame && prog < 1) { [[fx - 40, 316, -Math.PI * 0.75], [fx, 300, -Math.PI / 2], [fx + 46, 312, -Math.PI * 0.3]].forEach((p) => heatArrow(p[0], p[1], p[2] + Math.PI, 0.9, false, t)); }
    if (NA.flame && prog < 1) D.label(fx + 70, 272, '열을 흡수해서 분해돼요', { bg: 'rgba(255,255,255,.95)', color: '#1d5fb8', size: 13, border: '#a8c9f1' });
    // 오른쪽 패널
    panel(432, 18, 358, 300);
    txt('📈 분해된 정도', 611, 46, 15, COL.ink, 'center', 800);
    const gx0 = 480, gx1 = 770, gy0 = 80, gy1 = 270, tmax = 40;
    ctx.save(); ctx.font = D.font(12.5, 700); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let p = 0; p <= 100; p += 25) { const y = gy1 - (gy1 - gy0) * p / 100; ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); ctx.stroke(); ctx.fillStyle = COL.muted; ctx.fillText(p + '%', gx0 - 6, y); }
    ctx.restore();
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 6); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1 + 4, gy1); ctx.stroke();
    txt('시간(초)', (gx0 + gx1) / 2, gy1 + 34, 13, COL.muted, 'center', 700);
    const px = (tt) => gx0 + (gx1 - gx0) * Math.min(1, tt / tmax), py = (p) => gy1 - (gy1 - gy0) * p;
    const t0 = Math.max(0, NA.t - tmax), off = t0;
    for (let i = 1; i < NA.pts.length; i++) { const a = NA.pts[i - 1], b = NA.pts[i]; if (a.f) { ctx.fillStyle = 'rgba(242,107,58,.16)'; ctx.fillRect(px(a.t - off), gy0, Math.max(1, px(b.t - off) - px(a.t - off)), gy1 - gy0); } }
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath(); NA.pts.forEach((p, i) => { const x = px(p.t - off), y = py(p.p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    const lp = NA.pts[NA.pts.length - 1]; D.sphere(px(lp.t - off), py(NA.prog), 6, '#8b5cf6', { shadow: true, outline: '#fff', outlineWidth: 2 });
    D.label(700, gy0 + 4, '■ 주황: 가열 중', { bg: 'rgba(255,255,255,.92)', color: '#c2410c', size: 12, pad: 6 });
    panel(432, 330, 358, 170);
    txt('분해 ' + Math.round(prog * 100) + ' %', 611, 366, 22, '#6d28d9', 'center', 800);
    D.roundRect(458, 380, 306, 20, 10); ctx.fillStyle = '#eef0f6'; ctx.fill(); D.roundRect(458, 380, Math.max(14, 306 * prog), 20, 10); ctx.fillStyle = '#8b5cf6'; ctx.fill();
    const msg = !NA.everOn ? '불을 켜서 가열해 보세요' : NA.flame ? (prog < 1 ? '가열하는 동안만 분해가 계속돼요' : '모두 분해됐어요') : (NA.prog > 0.01 ? '불을 끄면 분해가 멈춰요! 열이 계속 필요해요' : '불이 꺼져 있어요');
    textBlock(msg, 611, 432, 320, 15, COL.ink, 'center', 22, 800);
    textBlock('불을 껐다 켜며 분해가 어떻게 달라지는지 비교해 봐요', 611, 466, 320, 13, COL.muted, 'center', 19, 700);
  }

  /* =========================================================
     장면 4a · 냉각 장치 설계
     ========================================================= */
  const MATS = {
    nh4: { name: '질산 암모늄', short: '질산 암모늄', sgn: -1, tau: 1.6, col: '#f2f5f9', kind: '흡열' },
    cao: { name: '산화 칼슘', short: '산화 칼슘', sgn: 1.4, tau: 0.8, col: '#f5f5f0', kind: '발열' },
    cacl: { name: '염화 칼슘', short: '염화 칼슘', sgn: 0.8, tau: 0.8, col: '#eef3f8', kind: '발열' },
  };
  const DS = { mat: 'nh4', amt: 20, ins: false, J: 25, Dk: 25, t: 0, run: false, pts: [], jpts: [], acc: 0, min: 25, max: 25, S: 0, runs: [], best: null, last: null, fxDone: false, pop: 0, foam: 0 };
  function dsReset() { DS.J = 25; DS.Dk = 25; DS.t = 0; DS.run = false; DS.pts = [{ t: 0, T: 25 }]; DS.jpts = [{ t: 0, T: 25 }]; DS.acc = 0; DS.min = 25; DS.max = 25; DS.S = 0; DS.last = null; DS.pop = 0; }
  dsReset();
  function dsStart() { if (DS.run) return; dsReset(); DS.run = true; sfx.whoosh(); hideHint(); syncControls(); }
  function dsSet(k, v) { if (DS.run && k !== 'ins') return; DS[k] = v; sfx.snap(); dsStart(); }
  function dsStep(dt) {
    if (DS.foam !== (DS.ins ? 1 : 0)) DS.foam = SciSim.approach(DS.foam, DS.ins ? 1 : 0, dt, 6);
    if (!DS.run) return;
    const m = MATS[DS.mat], h = DS.ins ? 0.03 : 0.16, g = 0.7, Ta = 25;
    let left = dt * TS;
    while (left > 1e-9) {
      const s = Math.min(0.02, left); left -= s;
      const S = m.sgn * (DS.amt / 10) * 9.2 * E(-DS.t / m.tau); DS.S = S;
      DS.J += (S + g * (DS.Dk - DS.J) + h * (Ta - DS.J)) * s;
      DS.Dk += (g * (DS.J - DS.Dk) + 0.03 * (Ta - DS.Dk)) / 1.8 * s;
      DS.t += s;
    }
    DS.min = Math.min(DS.min, DS.Dk); DS.max = Math.max(DS.max, DS.Dk);
    DS.acc += dt * TS; if (DS.acc >= 0.08) { DS.acc = 0; DS.pts.push({ t: DS.t, T: DS.Dk }); DS.jpts.push({ t: DS.t, T: DS.J }); }
    if (DS.t >= 10) {
      DS.run = false; DS.pts.push({ t: DS.t, T: DS.Dk });
      const r = { mat: DS.mat, amt: DS.amt, ins: DS.ins, min: DS.min, max: DS.max, ok: DS.min <= 15 };
      DS.last = r; DS.runs.push(r); if (!DS.best || r.min < DS.best.min) DS.best = r;
      tw(DS, { pop: 1 }, 0.6, 'outBack', { essential: true });
      if (r.ok) later(0.3, () => { okFx(200, 300, COL.good); showHint('성공! 음료가 15 °C 이하로 식었어요', 4200); });
      syncControls();
    }
  }
  SC.design = {
    enter() { if (!DS.runs.length && !DS.run) showHint('재료 · 양 · 단열재를 바꾸면 바로 실험이 시작돼요', 5200); },
    update(dt) { dsStep(dt); },
    draw(t) {
      room(); table(400);
      const m = MATS[DS.mat], cx = 200;
      const cool = DS.Dk, jT = DS.J;
      D.label(cx, 30, '음료 25 °C → 15 °C 이하로!', { bg: '#1b2333', size: 14 });
      // 겉 컵 (재료 + 물)
      const jx = 100, jy = 150, jw = 200, jh = 230;
      D.shadow(() => { D.roundRect(jx, jy, jw, jh, 14); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); }, { blur: 10, y: 5 });
      ctx.save(); D.roundRect(jx + 3, jy + 3, jw - 6, jh - 6, 12); ctx.clip();
      const jl = jy + jh * 0.34; ctx.fillStyle = mix('#a8d4ff', '#eef3f8', 0.55); ctx.fillRect(jx, jl, jw, jh);
      for (let i = 0; i < 36; i++) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(jx + 8 + ((i * 41) % (jw - 16)), jl + 12 + ((i * 29) % (jh * 0.6)), 4, 3); }
      ctx.restore();
      // 서리 / 열기
      const fr = clamp((12 - jT) / 14, 0, 1);
      if (fr > 0.03) { ctx.save(); D.roundRect(jx, jy, jw, jh, 14); ctx.clip(); for (let i = 0; i < 60; i++) { if ((i % 10) / 10 < fr * 1.5) { ctx.save(); ctx.translate(jx + ((i * 37) % jw), jy + 10 + ((i * 53) % (jh - 14))); ctx.rotate(i); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.4; for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); } ctx.restore(); } } ctx.restore(); }
      D.roundRect(jx, jy, jw, jh, 14); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.5; ctx.stroke();
      if (jT > 33 && DS.run && Math.random() < 0.12) FX.emit({ x: jx + rand(20, jw - 20), y: jy, vx: rand(-6, 6), vy: -rand(30, 56), life: 1.3, size: 7, grow: 12, color: '#f4f7fb', shape: 'smoke', alpha: 0.6 });
      // 음료 캔
      const dx = cx - 38, dy = jy + 22, dw = 76, dh = 160;
      const dc = mix('#ee9a3c', '#a9d8f8', clamp((25 - cool) / 22, 0, 0.6));
      D.shadow(() => { D.roundRect(dx, dy, dw, dh, 12); const g = ctx.createLinearGradient(dx, 0, dx + dw, 0); g.addColorStop(0, shade(dc, 0.35)); g.addColorStop(0.35, dc); g.addColorStop(1, shade(dc, -0.25)); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 4 });
      D.roundRect(dx + 6, dy + 52, dw - 12, 44, 6); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); txt('음료', cx, dy + 82, 17, '#1b2333', 'center', 800);
      D.roundRect(dx + 10, dy - 6, dw - 20, 10, 4); ctx.fillStyle = '#c7d0de'; ctx.fill();
      // 단열재 (스티로폼) 씌우기
      if (DS.foam > 0.02) {
        ctx.save(); ctx.globalAlpha = DS.foam; const o = (1 - DS.foam) * -30;
        D.shadow(() => { D.roundRect(jx - 14, jy - 12 + o, jw + 28, jh + 26, 18); ctx.fillStyle = 'rgba(210,222,235,.0)'; ctx.fill(); }, { blur: 0 });
        ctx.lineWidth = 14; ctx.strokeStyle = '#dfe6ee'; D.roundRect(jx - 8, jy - 6 + o, jw + 16, jh + 14, 18); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = '#b9c4d2'; D.roundRect(jx - 15, jy - 13 + o, jw + 30, jh + 28, 20); ctx.stroke(); D.roundRect(jx - 1, jy + 1 + o, jw + 2, jh + 2, 12); ctx.stroke();
        for (let i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(160,175,195,.35)'; ctx.beginPath(); ctx.arc(jx - 8 + ((i * 59) % (jw + 16)), jy - 6 + o + ((i * 31) % 6 > 3 ? 0 : jh + 14), 2, 0, TAU); ctx.fill(); }
        ctx.restore();
        txt('단열재', jx + jw + 22, jy + 40, 13, '#6b7a92', 'left', 800);
      }
      // 열 화살표
      const rate = Math.abs(DS.S) / 20;
      if (DS.run && rate > 0.03) {
        if (m.sgn < 0) { [[jx - 36, jy + 110, Math.PI], [jx + jw + 36, jy + 110, 0]].forEach((p) => heatArrow(p[0], p[1], p[2], rate * (DS.ins ? 0.5 : 1), false, t)); [[cx - 80, 0], [cx + 80, Math.PI]].forEach((p) => heatArrow(p[0], jy + 100, p[1], clamp(rate * 0.9, 0, 1), false, t, {})); }
        else [[jx - 36, jy + 110, Math.PI], [jx + jw + 36, jy + 110, 0], [cx, jy - 36, -Math.PI / 2]].forEach((p) => heatArrow(p[0], p[1], p[2], clamp(rate, 0, 1), true, t));
      }
      if (DS.run && rate > 0.03) D.label(cx, jy - 26, m.sgn < 0 ? '열을 흡수해요' : '열을 내보내요', { bg: 'rgba(255,255,255,.95)', color: m.sgn < 0 ? '#1d5fb8' : '#c2410c', size: 13, border: m.sgn < 0 ? '#a8c9f1' : '#f9c9a4' });
      txt(m.name + ' ' + DS.amt + ' g + 물', cx, jy + jh + 26, 15, COL.ink, 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
      // 온도계 + LCD
      D.thermometer(354, 90, 170, DS.Dk, 0, 40, { color: '#e0526b', step: 10, unit: '°' });
      lcd(326, 420, 84, DS.Dk, '음료', '#8fd0ff');
      // 그래프
      tgraph(424, 18, 366, 296, { tmax: 10, xstep: 2, Tmin: 0, Tmax: 40, step: 10, title: '🌡️ 음료와 겉 컵의 온도', line: 15, lineLabel: '목표 15 °C' }, [{ o: { pts: DS.jpts, t: DS.t, T: DS.J }, color: '#9aa7ba' }, { o: { pts: DS.pts, t: DS.t, T: DS.Dk }, color: '#e0526b' }], t);
      panel(424, 326, 366, 180);
      txt('🏁 결과', 442, 354, 15, COL.ink, 'left', 800);
      if (DS.best) txt('최고 기록 ' + fT(DS.best.min) + ' °C', 772, 354, 14, DS.best.ok ? COL.good : COL.muted, 'right', 800);
      if (DS.last) {
        const r = DS.last;
        ctx.save(); ctx.translate(607, 400); ctx.scale(DS.pop || 1, DS.pop || 1);
        D.roundRect(-170, -22, 340, 44, 22); ctx.fillStyle = r.ok ? '#e6f7ee' : '#fdecec'; ctx.fill(); ctx.strokeStyle = r.ok ? '#9fdcba' : '#f3b2b5'; ctx.lineWidth = 2; ctx.stroke();
        txt(r.ok ? '✅ 최저 ' + fT(r.min) + ' °C — 목표 달성!' : (r.max > 26 ? '🔥 음료가 최고 ' + fT(r.max) + ' °C로 뜨거워졌어요' : '최저 ' + fT(r.min) + ' °C — 아직 15 °C보다 높아요'), 0, 6, 15, r.ok ? '#0b7a41' : '#c8323a', 'center', 800);
        ctx.restore();
        textBlock(MATS[r.mat].short + ' ' + r.amt + ' g · 단열재 ' + (r.ins ? '있음' : '없음') + ' · ' + (MATS[r.mat].kind === '흡열' ? '열을 흡수하는 재료예요' : '열을 내보내는 재료예요'), 442, 440, 330, 14, COL.muted, 'left', 20, 700);
      } else textBlock(DS.run ? '음료의 온도를 지켜보세요…' : '설정을 바꾸면 실험이 시작돼요', 442, 392, 330, 15, COL.muted, 'left', 22, 700);
      txt('시도 ' + DS.runs.length + '회', 772, 492, 13, COL.muted, 'right', 800);
    },
  };

  /* =========================================================
     장면 4b · 생활 속 사례 카드 분류 (발열 / 흡열)
     ========================================================= */
  const CARDS = [
    { id: 0, t: '🧤 철 가루 손난로', ans: 'exo', clue: '손난로를 흔들었을 때 온도 그래프가 어떻게 변했죠?', info: '철 가루가 산소와 반응(산화)하며 열을 방출해 따뜻해져요.' },
    { id: 1, t: '🍱 발열 도시락', ans: 'exo', clue: '산화 칼슘과 물을 섞었을 때를 떠올려 봐요.', info: '산화 칼슘이 물과 반응하면서 내보내는 열로 음식을 데워요.' },
    { id: 2, t: '🔥 가스레인지 연소', ans: 'exo', clue: '메테인 연소 때 열 화살표는 어느 쪽이었죠?', info: '도시가스(메테인)가 탈 때 빛과 열을 방출해요.' },
    { id: 3, t: '🫁 세포 호흡', ans: 'exo', clue: '우리 몸은 영양소를 분해해 체온을 유지해요.', info: '영양소가 분해될 때 열이 나와 체온을 유지하는 데 쓰여요.' },
    { id: 4, t: '🧊 질산 암모늄 냉각 팩', ans: 'endo', clue: '냉각 팩의 온도 그래프는 어떻게 내려갔죠?', info: '질산 암모늄이 물에 녹으며 주변의 열을 흡수해 차가워져요.' },
    { id: 5, t: '🍞 베이킹파우더 가열', ans: 'endo', clue: '탄산수소 나트륨은 계속 가열해야 분해됐어요.', info: '탄산수소 나트륨이 열을 흡수해 분해되며 이산화 탄소가 빵을 부풀려요.' },
    { id: 6, t: '🌱 광합성', ans: 'endo', clue: '식물은 햇빛 에너지를 흡수해요.', info: '식물이 빛에너지를 흡수해 포도당을 만들어요.' },
    { id: 7, t: '⚡ 물의 전기 분해', ans: 'endo', clue: '전기에너지를 계속 공급해야 분해돼요.', info: '전기에너지를 공급받아 물이 수소와 산소로 분해돼요.' },
  ];
  const CBOX = { exo: { x: 20, y: 34, w: 370, h: 222, col: HOT, bg: '#fff3ea', name: '🔥 발열 반응 (열을 내보내요)' }, endo: { x: 410, y: 34, w: 370, h: 222, col: COLD, bg: '#eaf3ff', name: '🧊 흡열 반응 (열을 흡수해요)' } };
  const CW = 170, CH = 54;
  const CD = { cards: [], drag: null, sel: -1, msg: '', msgT: 0, placedN: 0 };
  function cdInit() {
    const order = [5, 0, 7, 2, 1, 6, 3, 4];
    CD.cards = order.map((id, i) => Object.assign({}, CARDS[id], { x: 30 + (i % 4) * 190, y: 292 + Math.floor(i / 4) * 70, hx: 30 + (i % 4) * 190, hy: 292 + Math.floor(i / 4) * 70, placed: null, lift: 0, shake: 0, pop: 1 }));
    CD.drag = null; CD.sel = -1; CD.msg = ''; CD.placedN = 0;
  }
  cdInit();
  const cdSlot = (box, n) => ({ x: CBOX[box].x + 10 + (n % 2) * 180, y: CBOX[box].y + 54 + Math.floor(n / 2) * 72 });
  const cdAt = (p) => { for (let i = CD.cards.length - 1; i >= 0; i--) { const c = CD.cards[i]; if (inRect(p, { x: c.x, y: c.y, w: CW, h: CH })) return c; } return null; };
  SC.cards = {
    enter() { if (CD.placedN === 0) showHint('카드를 끌어서 발열 / 흡열 상자에 넣어요', 4800); },
    update(dt) { CD.cards.forEach((c) => { c.lift = SciSim.approach(c.lift, CD.drag && CD.drag.c === c ? 1 : 0, dt, 14); if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2.2); }); if (CD.msgT > 0) CD.msgT -= dt; },
    hover(p) { return cdAt(p) ? 'grab' : null; },
    down(p) { const c = cdAt(p); if (!c) return false; CD.drag = { c, ox: c.x - p.x, oy: c.y - p.y, sx: p.x, sy: p.y, moved: 0 }; sfx.snap(); return true; },
    move(p) { const d = CD.drag; if (!d) return; d.moved = Math.max(d.moved, Math.hypot(p.x - d.sx, p.y - d.sy)); if (d.moved > 6) { d.c.x = p.x + d.ox; d.c.y = p.y + d.oy; } },
    up(p) {
      const d = CD.drag; CD.drag = null; if (!d) return;
      const c = d.c;
      if (d.moved <= 6) { if (c.placed) { CD.sel = c.id; sfx.snap(); } else { tw(c, { x: c.hx, y: c.hy }, 0.2, 'outCubic', { essential: true }); } return; }
      const bx = ['exo', 'endo'].find((k) => inRect({ x: c.x + CW / 2, y: c.y + CH / 2 }, CBOX[k]));
      if (!bx || c.placed === bx) { tw(c, { x: c.placed ? c.sx : c.hx, y: c.placed ? c.sy : c.hy }, 0.4, 'outBack', { essential: true }); return; }
      if (bx === c.ans) {
        const n = CD.cards.filter((o) => o.placed === bx).length, sl = cdSlot(bx, n);
        c.placed = bx; c.slot = n; c.sx = sl.x; c.sy = sl.y; CD.placedN++;
        tw(c, { x: sl.x, y: sl.y }, 0.4, 'outBack', { essential: true });
        sfx.snap(); FX.burst(sl.x + CW / 2, sl.y + CH / 2, { count: 10, speed: 100, colors: [CBOX[bx].col, '#ffd23f', '#fff'], size: 3, life: 0.6 }); CD.sel = c.id;
        if (CD.placedN === 8) later(0.4, () => { okFx(400, 150, COL.good); showHint('모두 분류했어요! 카드를 눌러 발표 카드를 읽어 보세요', 5200); });
      } else {
        c.shake = 1; sfx.thud(); CD.msg = '아직이에요! ' + c.clue; CD.msgT = 5;
        tw(c, { x: c.placed ? c.sx : c.hx, y: c.placed ? c.sy : c.hy }, 0.5, 'outBack', { essential: true });
      }
    },
    draw(t) {
      room();
      ['exo', 'endo'].forEach((k) => {
        const b = CBOX[k], n = CD.cards.filter((c) => c.placed === k).length;
        D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.fillStyle = b.bg; ctx.fill(); }, { blur: 8, y: 3 });
        D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.setLineDash([9, 6]); ctx.strokeStyle = b.col; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
        txt(b.name, b.x + b.w / 2, b.y + 34, 17, b.col, 'center', 800);
        for (let i = 0; i < 4; i++) { if (i >= n) { const s = cdSlot(k, i); D.roundRect(s.x, s.y, CW, CH, 12); ctx.strokeStyle = rgba(b.col, 0.25); ctx.lineWidth = 1.5; ctx.stroke(); } }
        if (CD.drag && CD.drag.moved > 6 && inRect({ x: CD.drag.c.x + CW / 2, y: CD.drag.c.y + CH / 2 }, b)) { D.roundRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 22); ctx.strokeStyle = b.col; ctx.lineWidth = 4; ctx.stroke(); }
      });
      txt('사례 카드', 30, 284, 14, COL.muted, 'left', 800);
      const order = CD.cards.slice().sort((a, b) => a.lift - b.lift);
      order.forEach((c) => {
        const sh = c.shake > 0 ? Math.sin(c.shake * 40) * 6 * c.shake : 0, sc = 1 + 0.06 * c.lift;
        ctx.save(); ctx.translate(c.x + CW / 2 + sh, c.y + CH / 2); ctx.scale(sc, sc); ctx.translate(-CW / 2, -CH / 2);
        const col = c.placed ? CBOX[c.placed].col : '#8b5cf6';
        D.shadow(() => { D.roundRect(0, 0, CW, CH, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + c.lift * 14, y: 3 + c.lift * 8 });
        D.roundRect(0, 0, CW, CH, 12); ctx.strokeStyle = CD.sel === c.id && c.placed ? col : (c.shake > 0 ? '#e2464b' : '#dfe3ee'); ctx.lineWidth = CD.sel === c.id && c.placed ? 3.5 : 2; ctx.stroke();
        if (c.placed) { D.roundRect(0, 0, 8, CH, 4); ctx.fillStyle = col; ctx.fill(); }
        { const nl = wrapText(c.t, CW - 24, 14.5, 800).length; textBlock(c.t, CW / 2 + 2, CH / 2 - (nl - 1) * 8.5 + 5, CW - 22, 14.5, COL.ink, 'center', 17, 800); }
        ctx.restore();
      });
      // 발표 카드 / 안내
      panel(20, 438, 760, 70, { r: 16 });
      const sel = CD.sel >= 0 ? CARDS[CD.sel] : null;
      if (CD.msgT > 0 && CD.msg) textBlock(CD.msg, 400, 468, 720, 15, '#c8323a', 'center', 21, 800);
      else if (sel) { txt('🎤 발표 카드 · ' + sel.t, 40, 464, 14, CBOX[sel.ans].col, 'left', 800); textBlock(sel.info, 40, 488, 720, 15, COL.ink, 'left', 21, 700); }
      else textBlock(CD.placedN === 8 ? '카드를 눌러 발표 카드를 읽어 보세요' : '카드를 알맞은 상자에 넣어요 (' + CD.placedN + '/8)', 400, 478, 720, 15, COL.muted, 'center', 21, 700);
    },
  };

  /* =========================================================
     컨트롤 연결
     ========================================================= */
  function syncControls() {
    if (!CTRL_READY) return;
    dis('shakeBtn', PK.w.on || PK.w.done); dis('burstBtn', PK.c.on || PK.c.done); dis('pkResetBtn', !PK.w.on && !PK.c.on && !PK.w.done && !PK.c.done);
    q('exoBtn').textContent = EXO.ht.on ? '반응 중…' : EXO.ht.done ? '↺ 다시 하기' : '▶ 반응시키기'; dis('exoBtn', EXO.ht.on);
    dis('baStirBtn', BA.ht.on || BA.ht.done); dis('baLiftBtn', !(BA.ht.on || BA.ht.done));
    q('baLiftBtn').textContent = BA.lifted ? '⬇ 내려놓기' : '🫳 비커 들어올리기';
    q('naBtn').textContent = NA.flame ? '🔥 불 끄기' : '🔥 가열하기'; dis('naBtn', NA.prog >= 1 && !NA.flame);
    $$('#matSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.v === DS.mat); b.disabled = DS.run; });
    $$('#amtSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === DS.amt); b.disabled = DS.run; });
    q('insBtn').setAttribute('aria-pressed', DS.ins ? 'true' : 'false');
    refreshSub();
  }
  function syncReadouts() {
    const sc = S.scene;
    if (sc === 'packs') { setR('rW', u(fT(PK.w.T), ' °C')); setR('rWp', u(fT(PK.w.peak), ' °C')); setR('rC', u(fT(PK.c.T), ' °C')); setR('rCl', u(fT(PK.c.low), ' °C')); }
    else if (sc === 'exo') { const o = EXO.ht; setR('rEq', EXO.defs[EXO.k].btn.slice(2)); setR('rET', u(fT(o.T), ' °C')); setR('rEp', u(fT(o.peak), ' °C')); setR('rEd', (o.peak - o.T0 >= 0 ? '+' : '') + fT(o.peak - o.T0) + '<small> °C</small>'); }
    else if (sc === 'endo') {
      if (ENDO.k === 'ba') { setR('rBT', u(fT(BA.ht.T), ' °C')); setR('rBl', u(fT(BA.ht.low), ' °C')); setR('rBs', BA.stuck ? '붙음' : BA.ice > 0.8 ? '얼음' : '물'); }
      else { setR('rNp', u(Math.round(NA.prog * 100), ' %')); setR('rNf', NA.flame ? '켜짐' : '꺼짐'); setR('rNs', NA.prog >= 1 ? '완료' : NA.offSeen ? '멈춤 확인' : '-'); }
    } else if (sc === 'design') { setR('rDT', u(fT(DS.Dk), ' °C')); setR('rDb', DS.best ? u(fT(DS.best.min), ' °C') : '-'); setR('rDn', u(DS.runs.length, '회')); }
    else if (sc === 'cards') setR('rCn', u(CD.placedN + '/8', '장'));
  }
  setInterval(() => { syncReadouts(); syncControls(); }, 150);
  q('shakeBtn').addEventListener('click', () => { Sound.click(); pkWarm(); syncControls(); });
  q('burstBtn').addEventListener('click', () => { Sound.click(); pkCold(); syncControls(); });
  q('pkResetBtn').addEventListener('click', () => { Sound.click(); pkInit(); syncControls(); });
  q('exoBtn').addEventListener('click', () => { Sound.click(); exoGo(); syncControls(); });
  q('baStirBtn').addEventListener('click', () => { Sound.click(); baStir(); syncControls(); });
  q('baLiftBtn').addEventListener('click', () => { Sound.click(); baLift(); syncControls(); });
  q('baResetBtn').addEventListener('click', () => { Sound.click(); baInit(); syncControls(); });
  q('naBtn').addEventListener('click', () => { Sound.click(); naToggle(); syncControls(); });
  q('naResetBtn').addEventListener('click', () => { Sound.click(); naInit(); syncControls(); });
  $$('#matSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); dsSet('mat', b.dataset.v); }));
  $$('#amtSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); dsSet('amt', +b.dataset.v); }));
  q('insBtn').addEventListener('click', () => { Sound.click(); DS.ins = !DS.ins; DS.run = false; dsStart(); });
  q('cdResetBtn').addEventListener('click', () => { Sound.click(); cdInit(); syncControls(); });
  q('resetBtn').addEventListener('click', () => {
    Sound.click();
    ({ packs: pkInit, exo: exoInit, endo: () => (ENDO.k === 'ba' ? baInit() : naInit()), design: () => { dsReset(); dsStart(); }, cards: cdInit })[S.scene]();
    syncControls();
  });

  /* =========================================================
     미션
     ========================================================= */
  const FIG_EXO = '<svg viewBox="0 0 280 130" width="280" height="130" role="img" aria-label="반응 용기에서 열이 주변으로 나가는 그림"><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#f26b3a"/></marker></defs><rect x="100" y="40" width="80" height="70" rx="8" fill="#cfe8ff" stroke="#8fa3bd" stroke-width="3"/><text x="140" y="82" text-anchor="middle" font-size="14" font-weight="800" fill="#1b2333">반응</text><g stroke="#f26b3a" stroke-width="5" marker-end="url(#ah)"><line x1="92" y1="75" x2="40" y2="75"/><line x1="188" y1="75" x2="240" y2="75"/><line x1="140" y1="34" x2="140" y2="8"/></g><text x="140" y="126" text-anchor="middle" font-size="13" font-weight="800" fill="#c2410c">열에너지 방출 → 주변 온도 ?</text></svg>';
  const FIG_ENDO = '<svg viewBox="0 0 280 130" width="280" height="130" role="img" aria-label="주변의 열이 반응 용기로 들어오는 그림"><defs><marker id="ab" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#2f7de1"/></marker></defs><rect x="100" y="40" width="80" height="70" rx="8" fill="#e9eef5" stroke="#8fa3bd" stroke-width="3"/><text x="140" y="82" text-anchor="middle" font-size="14" font-weight="800" fill="#1b2333">반응</text><g stroke="#2f7de1" stroke-width="5" marker-end="url(#ab)"><line x1="40" y1="75" x2="92" y2="75"/><line x1="240" y1="75" x2="188" y2="75"/><line x1="140" y1="8" x2="140" y2="34"/></g><text x="140" y="126" text-anchor="middle" font-size="13" font-weight="800" fill="#1d5fb8">열에너지 흡수 → 주변 온도 ?</text></svg>';

  game = SciSim.game({
    simId: 'm3-reaction-heat',
    mount: '#game',
    badge: '열에너지 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      packs: '🧤 손난로 · 냉각 팩 · 온도 그래프',
      exo: '🔥 발열 반응 실험대 · 열 화살표',
      endo: '🧊 흡열 반응 실험대',
      design: '🥤 냉각 장치 설계',
      cards: '🗂️ 사례 카드 분류',
    },
    onFeatures(set) { F = set; if (game) refreshUI(); },
    onHint(m) { if (m.focus) pulseEl('#' + m.focus); },
    onMissionStart(m) { if (game && game.free) return; if (m.scene) setScene(m.scene); refreshUI(); },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '손난로와 냉각 팩의 온도 변화', short: '온도 변화', icon: '🌡️', phase: '관찰',
        features: ['packs'],
        intro: '<p class="si-q">❓ 탐구 질문: 손난로는 어떻게 따뜻해지고, 냉각 팩은 어떻게 차가워질까?</p>' +
          '<p><b>손난로</b>를 흔들고, <b>냉각 팩</b>의 속주머니를 터뜨려 보세요. 디지털 온도계와 <b>실시간 그래프</b>로 온도가 어떻게 변하는지 관찰해요.</p>',
        setup() { setScene('packs'); },
        recap: '화학 반응이 일어날 때 온도가 올라가기도(손난로), 내려가기도(냉각 팩) 해요.',
        summary: sumTable([['손난로', '철 가루 + 산소 + 소금물', '온도 올라감'], ['냉각 팩', '질산 암모늄 + 물', '온도 내려감']], ['팩', '속 물질', '온도 변화']) +
          '<ul><li>화학 반응이 일어나면 <b>온도가 변해요</b>. 열에너지가 출입하기 때문이에요.</li></ul>',
        missions: [
          {
            title: '두 팩의 온도 재기', scene: 'packs', focus: 'shakeBtn',
            goal: '손난로를 흔들고 냉각 팩의 속주머니를 터뜨려 보세요. 손난로가 40 °C 이상, 냉각 팩이 10 °C 이하가 될 때까지 지켜봐요.',
            hint: '손난로는 손으로 끌어 좌우로 흔들거나 💪 버튼을 눌러요. 냉각 팩은 눌러서 터뜨려요. 그래프가 올라가고 내려가는 걸 기다려 봐요.',
            setup() { pkInit(); setScene('packs'); syncControls(); },
            check: () => PK.w.peak >= 40 && PK.c.low <= 10, hold: 0.6,
            status: () => '손난로 최고 <b>' + fT(PK.w.peak) + ' °C</b> ' + MARK(PK.w.peak >= 40) + ' · 냉각 팩 최저 <b>' + fT(PK.c.low) + ' °C</b> ' + MARK(PK.c.low <= 10),
            explain: '손난로는 철 가루가 산소와 반응하며 온도가 <b>올라가고</b>, 냉각 팩은 질산 암모늄이 물과 섞이며 온도가 <b>내려가요</b>. 둘 다 화학 반응이 일어날 때 열에너지가 출입해서 생기는 변화예요.',
          },
          {
            type: 'quiz', title: '온도 변화로 알 수 있는 것', scene: 'packs',
            goal: '손난로는 따뜻해지고 냉각 팩은 차가워졌어요. 이 관찰로 알 수 있는 것은?',
            choices: ['화학 반응이 일어날 때 온도가 올라가기도 하고 내려가기도 한다.', '화학 반응이 일어나면 항상 온도가 올라간다.', '화학 반응이 일어나도 온도는 변하지 않는다.', '온도가 변하면 화학 반응이 끝난 것이다.'],
            answer: 0,
            feedback: ['', '냉각 팩에서는 온도가 내려갔어요.', '두 팩 모두 온도가 변했어요.', '온도가 변하는 것은 반응이 진행되는 동안 열이 출입하기 때문이에요.'],
            explain: '화학 반응이 일어날 때는 <b>열에너지가 출입</b>해서 주변의 온도가 올라가거나 내려가요.',
          },
        ],
      },
      {
        title: '열을 내보내는 반응', short: '발열 반응', icon: '🔥', phase: '실험',
        features: ['exo'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 손난로는 온도가 올라갔어요.</div>' +
          '<p>세 가지 반응(산화 칼슘 + 물, 염산 + 수산화 나트륨, 메테인 연소)에서 온도와 <b>열에너지의 이동</b>을 살펴봐요. 주황색 화살표가 열이 움직이는 방향이에요.</p>',
        setup() { setScene('exo'); },
        recap: '반응하면서 열에너지를 방출해 주변 온도가 올라가는 반응이 발열 반응이에요.',
        summary: sumTable([['산화 칼슘 + 물', '발열 도시락'], ['염산 + 수산화 나트륨(중화)', '온도 상승'], ['메테인 연소', '가스레인지']], ['발열 반응', '예']) +
          '<ul><li><b>발열 반응</b>: 열에너지를 <b>방출</b> → 주변 온도 <b>상승</b></li><li>예: 연소, 손난로, 발열 도시락, 중화 반응, 세포 호흡</li></ul>',
        missions: [
          {
            title: '세 반응의 온도 재기', scene: 'exo', focus: 'exoBtn',
            goal: '▶ 반응시키기로 세 가지 반응을 모두 측정해 보세요. 위 단추에서 반응을 바꿔요.',
            hint: '반응 하나가 끝나면(그래프가 완성되면) 다른 반응을 골라요.',
            setup() { EXO.k = 'cao'; EXO.done = {}; exoInit(); setScene('exo'); refreshUI(); },
            check: () => Object.keys(EXO.defs).every((k) => EXO.done[k]) && !EXO.ht.on, hold: 0.6,
            status: () => Object.keys(EXO.defs).map((k) => EXO.defs[k].btn.slice(3) + ' ' + MARK(!!EXO.done[k])).join(' · '),
            explain: '세 반응 모두 <b>온도가 올라갔어요</b>. 반응하면서 열에너지가 밖으로 나가 주변을 데웠기 때문이에요(주황색 화살표).',
          },
          {
            type: 'quiz', title: '발열 도시락의 원리', scene: 'exo',
            goal: '발열 도시락의 가열 주머니에는 산화 칼슘이 들어 있어요. 물을 부으면 음식이 데워지는 원리는?',
            choices: ['산화 칼슘이 물과 반응하면서 열에너지를 방출한다.', '산화 칼슘이 물과 반응하면서 열에너지를 흡수한다.', '산화 칼슘과 물이 섞이기만 할 뿐 반응은 일어나지 않는다.', '물이 끓으면서 산화 칼슘이 얼어붙는다.'],
            answer: 0,
            feedback: ['', '열을 흡수하면 온도가 내려가요. 실험에서는 온도가 올라갔어요.', '온도가 변한 것은 화학 반응이 일어났기 때문이에요.', '물이 끓는 것은 발열 반응의 결과이고, 산화 칼슘이 얼어붙지는 않아요.'],
            explain: '산화 칼슘 + 물 → 수산화 칼슘 + <b>열</b>. 발열 반응에서 나온 열로 음식을 데워요.',
          },
          {
            type: 'quiz', title: '발열 반응의 열의 이동', scene: 'exo', figure: FIG_EXO,
            goal: '그림처럼 발열 반응에서 열에너지가 밖으로 나갈 때, 주변의 온도는 어떻게 변할까요?',
            choices: ['열에너지가 반응에서 주변으로 나가므로 주변 온도가 올라간다.', '열에너지가 주변에서 반응으로 들어오므로 주변 온도가 올라간다.', '열에너지가 주변으로 나가므로 주변 온도가 내려간다.', '열에너지가 출입하지 않으므로 온도가 변하지 않는다.'],
            answer: 0,
            feedback: ['', '발열 반응은 열이 밖으로 나가는 반응이에요. 화살표 방향을 봐요.', '열을 받은 주변은 따뜻해져요.', '열이 이동하면 주변 온도가 변해요.'],
            explain: '발열 반응에서는 열에너지가 <b>반응에서 주변으로</b> 나가므로 주변 온도가 <b>올라가요</b>.',
          },
        ],
      },
      {
        title: '열을 흡수하는 반응', short: '흡열 반응', icon: '🧊', phase: '실험',
        features: ['endo'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 발열 반응은 열을 내보내 주변을 데웠어요.</div>' +
          '<p>반대로 <b>열을 흡수하는 반응</b>도 있어요. 수산화 바륨과 염화 암모늄을 <b>물에 젖은 나무판</b> 위 비커에서 섞으면 어떻게 될까요? 파란 화살표는 주변에서 반응으로 들어오는 열이에요.</p>' +
          '<p>⚠️ 실험할 때는 보안경을 쓰고, 암모니아 냄새를 직접 맡지 않아요.</p>',
        setup() { endoSelect('ba'); setScene('endo'); },
        recap: '반응하면서 주변의 열에너지를 흡수해 주변 온도가 내려가는 반응이 흡열 반응이에요.',
        summary: sumTable([['수산화 바륨 + 염화 암모늄', '온도 −20 °C 이하, 물이 얼어 나무판이 붙음'], ['탄산수소 나트륨 가열', '계속 가열해야 분해']], ['흡열 반응', '관찰']) +
          '<ul><li><b>흡열 반응</b>: 열에너지를 <b>흡수</b> → 주변 온도 <b>하강</b></li><li>예: 냉각 팩, 빵 부풀리기(탄산수소 나트륨), 광합성, 물의 전기 분해</li></ul>',
        missions: [
          {
            title: '나무판 붙이기', scene: 'endo', focus: 'baStirBtn',
            goal: '수산화 바륨과 염화 암모늄을 섞어 온도를 내려 보세요. 나무판의 물이 얼면 비커를 들어 올려 나무판이 붙는지 확인해요.',
            hint: '🥄 섞기 → 온도가 많이 내려가 ‘나무판의 물이 얼음’ ✅이 켜질 때까지 기다린 뒤 🫳 비커 들어올리기!',
            setup() { baInit(); endoSelect('ba'); setScene('endo'); refreshUI(); },
            check: () => BA.stuck, hold: 0.6,
            status: () => '섞기 ' + MARK(BA.ht.on || BA.ht.done) + ' · 최저 <b>' + fT(BA.ht.low) + ' °C</b> · 나무판 붙음 ' + MARK(BA.stuck),
            explain: '이 반응은 주변의 열을 <b>흡수</b>해서 온도가 크게 내려가요. 나무판 위의 물이 얼어붙어서 나무판이 비커에 붙어요.',
          },
          {
            title: '불을 끄면 어떻게 될까?', scene: 'endo', focus: 'naBtn',
            goal: '탄산수소 나트륨을 가열해 분해시켜 보세요. 분해가 30 % 넘게 진행되면 불을 끄고 어떻게 되는지 확인해요.',
            hint: '🔥 가열하기를 누르고 분해 정도가 올라가면 불을 꺼 봐요. 그래프가 평평해지는지 보세요.',
            setup() { naInit(); endoSelect('na'); setScene('endo'); refreshUI(); },
            check: () => NA.offSeen && NA.prog > 0.3, hold: 0.5,
            status: () => '분해 <b>' + Math.round(NA.prog * 100) + '%</b> · 가열 ' + MARK(NA.prog > 0.3) + ' · 불 끄고 멈춤 확인 ' + MARK(NA.offSeen),
            explain: '탄산수소 나트륨은 <b>열을 계속 흡수해야</b> 분해돼요. 불을 끄면 열이 공급되지 않아 분해가 <b>멈춰요</b>(흡열 반응).',
          },
          {
            type: 'quiz', title: '나무판이 붙은 까닭', scene: 'endo', figure: FIG_ENDO,
            goal: '수산화 바륨과 염화 암모늄을 섞자 비커가 나무판에 붙었어요. 그 까닭은?',
            choices: ['반응이 주변의 열에너지를 흡수해서 온도가 크게 내려가고, 나무판의 물이 얼었기 때문이다.', '반응이 열에너지를 방출해서 물이 끓어 증기가 붙였기 때문이다.', '반응으로 생긴 기체가 나무판을 눌러 붙였기 때문이다.', '두 물질이 반응해서 나무판이 자석이 되었기 때문이다.'],
            answer: 0,
            feedback: ['', '온도계는 크게 내려갔어요. 열을 방출하는 반응이 아니에요.', '기체(암모니아)가 생기지만 나무판을 붙이는 것은 얼음이에요.', '나무판은 자석이 되지 않아요. 얼음이 접착제처럼 붙여요.'],
            explain: '흡열 반응에서는 열에너지가 <b>주변에서 반응으로 들어와</b> 주변 온도가 <b>내려가요</b>. 그래서 물이 얼어 나무판이 붙어요.',
          },
        ],
      },
      {
        title: '냉각 장치 만들기와 사례 조사', short: '냉각 장치', icon: '🥤', phase: '적용',
        features: ['design', 'cards'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 흡열 반응은 주변의 열을 흡수해 온도를 낮춘다는 것을 알았어요.</div>' +
          '<p>이 원리로 <b>25 °C 음료를 15 °C 이하로</b> 식히는 냉각 장치를 설계해 봐요. 재료, 양, 단열재를 고르면 바로 실험이 시작돼요. 그다음 우리 생활 속 사례를 발열 / 흡열로 분류해 발표 카드를 만들어요.</p>',
        setup() { setScene('design'); },
        recap: '열을 흡수하는 반응으로 냉각 장치를 만들 수 있어요. 생활 속에는 발열 반응과 흡열 반응이 모두 쓰여요.',
        summary: sumTable([['손난로 · 발열 도시락 · 연소 · 세포 호흡', '발열 반응'], ['냉각 팩 · 빵 부풀리기 · 광합성 · 물의 전기 분해', '흡열 반응']], ['사례', '구분']) +
          '<ul><li>냉각 장치: <b>열을 흡수하는</b> 재료(질산 암모늄)를 쓰고, 단열재로 바깥 열을 막아요.</li></ul>',
        missions: [
          {
            title: '냉각 장치 설계하기', scene: 'design', manual: true, focus: 'matSeg',
            goal: '재료, 양, 단열재를 골라 25 °C 음료를 15 °C 이하로 식혀 보세요. 성공하면 ✔ 확인하기를 눌러요.',
            hint: '열을 흡수하는 재료를 골라야 해요. 양을 늘리고 단열재를 씌우면 더 많이 내려가요.',
            setup() { DS.runs = []; DS.best = null; DS.mat = 'cao'; DS.amt = 10; DS.ins = false; dsReset(); setScene('design'); refreshUI(); },
            check: () => {
              if (DS.best && DS.best.ok) return true;
              const l = DS.last;
              if (!l) return '먼저 재료와 양을 골라 실험해 보세요.';
              if (MATS[l.mat].kind === '발열') return '이 재료는 열을 내보내서 음료가 오히려 따뜻해져요. 열을 흡수하는 재료를 골라 봐요.';
              return '아직 15 °C까지 내려가지 않았어요. 양을 늘리거나 단열재를 씌워 봐요.';
            },
            explain: '질산 암모늄은 물에 녹을 때 열을 <b>흡수</b>해서 주변이 차가워져요. 양을 늘리면 더 많은 열을 흡수하고, 단열재는 바깥의 열이 들어오는 것을 막아 줘요. 산화 칼슘과 염화 칼슘은 열을 <b>내보내는</b> 재료라 냉각에는 맞지 않아요.',
          },
          {
            title: '사례 카드 분류하기', scene: 'cards', manual: true, focus: 'cdResetBtn',
            goal: '생활 속 사례 카드 8장을 발열 반응 / 흡열 반응 상자로 끌어다 놓으세요. 다 끝나면 카드를 눌러 발표 카드를 읽어 봐요.',
            hint: '열을 내보내 따뜻해지면 발열, 열을 흡수해 차가워지거나 에너지를 계속 공급해야 하면 흡열이에요.',
            setup() { cdInit(); setScene('cards'); refreshUI(); },
            check: () => (CD.placedN === 8 ? true : '아직 분류하지 않은 카드가 ' + (8 - CD.placedN) + '장 있어요.'),
            explain: '<b>발열</b>: 손난로, 발열 도시락, 연소, 세포 호흡. <b>흡열</b>: 냉각 팩, 빵 부풀리기(탄산수소 나트륨 분해), 광합성, 물의 전기 분해. 생활 속 사례를 조사해 발표할 때도 이렇게 분류해 보세요.',
          },
          {
            type: 'quiz', title: '냉각 장치의 재료', scene: 'design',
            goal: '화학 반응을 이용한 냉각 장치(냉각 팩)에 알맞은 재료와 까닭은?',
            choices: ['질산 암모늄 — 물에 녹을 때 열에너지를 흡수하여 주변이 차가워진다.', '산화 칼슘 — 물과 반응할 때 열에너지를 흡수하여 주변이 차가워진다.', '염화 칼슘 — 물에 녹을 때 열에너지를 흡수하여 주변이 차가워진다.', '철 가루 — 산소와 반응할 때 열에너지를 흡수하여 주변이 차가워진다.'],
            answer: 0,
            feedback: ['', '산화 칼슘은 물과 반응하며 열을 내보내요(발열 도시락).', '염화 칼슘은 물에 녹을 때 열을 내보내서 온도가 올라가요.', '철 가루는 산소와 반응하며 열을 내보내요(손난로).'],
            explain: '냉각 장치에는 <b>열을 흡수하는(흡열)</b> 재료인 질산 암모늄을 써요. 발열 반응 재료는 오히려 온도를 높여요.',
          },
        ],
      },
    ],
  });

  CTRL_READY = true;
  setScene('packs');
  refreshUI();
  const DBG = { PK, EXO, BA, NA, DS, CD, ENDO, MATS, pkWarm, pkCold, pkInit, exoGo, exoSelect, exoInit, baInit, baStir, baLift, naInit, naToggle, endoSelect, dsSet, dsStart, dsReset, cdInit, CARDS, CBOX, get F() { return F; } };
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
