(function () {
  'use strict';
  const VH0 = 486, YS0 = 18;
  /* =========================================================
     공통 도구 (세 차시가 같은 모양·같은 움직임을 쓰도록 같은 코드를 묶음)
     시간 기준 움직임 · 효과음 · 그림자 패널 · 원자 공 모형(Sys) · 끌기(DragSet) · 전자저울 · 돋보기
     ========================================================= */
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const RM = !!SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const ease = SciSim.ease;
  const rand = (a, b) => a + Math.random() * (b - a);
  const now = () => performance.now() / 1000;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const outBack = (t, s) => { s = s == null ? 1.4 : s; const c3 = s + 1; return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
  const VW = 800, VH = (typeof VH0 === 'number' ? VH0 : 520), YS = (typeof YS0 === 'number' ? YS0 : 0);   // YS: 장면 전체를 위로 올리는 양(위쪽 빈 곳 줄이기)
  const BG = '#f6f9fe';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  const COL = {
    ink: '#1b2333', muted: '#5d6879', line: '#dde4ef', good: '#14a058', bad: '#e2464b', sub: '#8b5cf6', warn: '#f26b3a',
    phys: '#2f7cf6', chem: '#f26b3a',
  };
  let game = null;
  let F = new Set();
  const on = (f) => (game && game.free) || F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const mark = (b) => (b ? '✅' : '⬜');

  /* ---------- 시간 기준 움직임 (프레임 속도와 무관 · ff()로 빨리 감기 가능) ---------- */
  const ANIM = [];
  function tw(obj, to, dur, fn, o) {
    o = o || {};
    const from = {};
    for (const k in to) from[k] = obj[k];
    for (let i = ANIM.length - 1; i >= 0; i--) { const a = ANIM[i]; if (a.obj === obj && Object.keys(to).some((k) => k in a.to)) ANIM.splice(i, 1); }
    const a = { obj, to, from, dur: Math.max(0.001, (o.essential || !RM) ? dur : 0.001), t: -(o.delay || 0), fn: typeof fn === 'function' ? fn : (ease[fn] || ease.outCubic), done: o.onDone, upd: o.onUpdate, finished: false };
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
  let LATER = [];
  function later(sec, fn, tag) { LATER.push({ t: sec, fn, tag }); }
  function updateLater(dt) {
    for (let i = LATER.length - 1; i >= 0; i--) {
      if (!LATER[i]) continue;
      LATER[i].t -= dt;
      if (LATER[i].t <= 0) { const f = LATER.splice(i, 1)[0].fn; f(); }
    }
  }
  function clearLater() { LATER = []; }

  /* ---------- 효과음 (WebAudio 직접 합성) ---------- */
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
    pop() { this.noise(0.14, 1400, 120, 0.5, 'lowpass'); Sound.tone(120, 0.12, 'sine', 0.14); },
    whoosh() { this.noise(0.6, 500, 3200, 0.2, 'bandpass'); },
    fizz() { this.noise(0.3, 3200, 1800, 0.05, 'highpass'); },
    thud() { Sound.tone(80, 0.2, 'sine', 0.2); this.noise(0.1, 320, 80, 0.3, 'lowpass'); },
    zap() { this.noise(0.18, 4200, 900, 0.07, 'bandpass'); },
    glug() { Sound.tone(420 + Math.random() * 160, 0.05, 'sine', 0.03); },
    ding() { Sound.tone(1175, 0.22, 'sine', 0.1); Sound.tone(1568, 0.3, 'sine', 0.07, 0.07); },
    crackle() { this.noise(0.12, 5200, 1500, 0.06, 'highpass'); },
    flame() { this.noise(0.5, 900, 300, 0.12, 'lowpass'); },
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
    o = o || {};
    D.text(x, y, str, Object.assign({ size, color, align: align || 'center', weight: weight || 800 }, o));
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
  /* 화학식 글자: 'H2O' → 아래첨자 숫자 */
  function fparts(s) {
    const out = []; const re = /([A-Z][a-z]?)(\d*)/g; let m;
    while ((m = re.exec(s))) out.push([m[1], m[2] ? +m[2] : 1]);
    return out;
  }
  function formulaWidth(s, size) {
    ctx.save(); let w = 0;
    fparts(s).forEach((pt) => {
      ctx.font = D.font(size, 800); w += ctx.measureText(pt[0]).width;
      if (pt[1] > 1) { ctx.font = D.font(size * 0.62, 800); w += ctx.measureText(String(pt[1])).width + 1; }
    });
    ctx.restore(); return w;
  }
  function fml(s, x, y, size, color, align, alpha) {
    const w = formulaWidth(s, size);
    let cx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    ctx.save(); if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    fparts(s).forEach((pt) => {
      ctx.font = D.font(size, 800); ctx.fillText(pt[0], cx, y); cx += ctx.measureText(pt[0]).width;
      if (pt[1] > 1) { ctx.font = D.font(size * 0.62, 800); ctx.fillText(String(pt[1]), cx + 1, y + size * 0.26); cx += ctx.measureText(String(pt[1])).width + 1; }
    });
    ctx.restore();
    return w;
  }

  /* 부드러운 그림자: 한 번 그려 두고 재사용 */
  const SHC = new Map();
  let shK = 0;
  function rrPath(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function softShadow(x, y, w, h, r, blur, dy, color) {
    const k = Math.max(1, Math.round(view.scale * view.dpr * 2) / 2);
    if (k !== shK) { SHC.clear(); shK = k; }
    const W = Math.round(w), H = Math.round(h), key = W + '|' + H + '|' + r + '|' + blur + '|' + color;
    let sp = SHC.get(key);
    if (!sp) {
      const pad = Math.ceil(blur * 1.5) + 2, OFF = W + pad;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil((W + pad * 2) * k); cv.height = Math.ceil((H + pad * 2) * k);
      const c = cv.getContext('2d');
      c.shadowColor = color; c.shadowBlur = blur * k; c.shadowOffsetX = OFF * k; c.shadowOffsetY = 0;
      c.scale(k, k); c.translate(pad - OFF, pad);
      c.fillStyle = '#000'; rrPath(c, 0, 0, W, H, r); c.fill();
      sp = { cv, pad }; SHC.set(key, sp);
    }
    ctx.drawImage(sp.cv, x - sp.pad, y - sp.pad + dy, sp.cv.width / shK, sp.cv.height / shK);
  }
  function panel(x, y, w, h, r, fill, blur, dy, color) {
    softShadow(x, y, w, h, r, blur == null ? 12 : blur, dy == null ? 4 : dy, color || 'rgba(30,50,100,.2)');
    ctx.fillStyle = fill; D.roundRect(x, y, w, h, r); ctx.fill();
  }
  function groundShadow(cx, cy, rx, ry, a) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, 'rgba(40,30,20,' + (0.3 * (a == null ? 1 : a)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  function bench(x, y, w, h) {
    panel(x, y, w, h, 14, '#e9c997', 12, 4, 'rgba(90,60,20,.28)');
    ctx.save(); ctx.beginPath(); D.roundRect(x, y, w, h, 14); ctx.clip();
    vgrad(ctx, x, y, w, h, '#efd3a6', '#d6ae75');
    ctx.strokeStyle = 'rgba(150,100,50,.13)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) { const yy = y + 10 + i * (h / 7); ctx.beginPath(); ctx.moveTo(x, yy); ctx.bezierCurveTo(x + w * 0.3, yy - 5, x + w * 0.65, yy + 6, x + w, yy - 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x, y, w, 3);
    ctx.restore();
  }
  const pill = (x, y, str, o) => D.label(x, y, str, o);

  /* ---------- 말풍선 · 결과 효과 ---------- */
  const BUB = [];
  function say(x, y, str, o) {
    o = o || {};
    BUB.push({ x, y, str, t: 0, dur: o.dur || 2.8, bg: o.bg || '#1b2333', color: o.color || '#fff', size: o.size || 14, below: !!o.below, maxW: o.maxW || 230 });
    if (BUB.length > 3) BUB.shift();
  }
  function drawBubbles(dt) {
    for (let i = BUB.length - 1; i >= 0; i--) {
      const b = BUB[i];
      b.t += dt;
      if (b.t > b.dur) { BUB.splice(i, 1); continue; }
      const lines = wrapText(b.str, b.maxW, b.size, 800), lh = b.size * 1.35;
      ctx.save(); ctx.font = D.font(b.size, 800);
      let tw0 = 0; lines.forEach((l) => { tw0 = Math.max(tw0, ctx.measureText(l).width); });
      ctx.restore();
      const w = tw0 + 24, h = lines.length * lh + 16;
      const k = outBack(seg(b.t, 0, 0.25)), a = b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1;
      const bx = clamp(b.x - w / 2, 8, VW - w - 8), by = b.below ? b.y + 16 : b.y - 16 - h;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(b.x, b.y); ctx.scale(k, k); ctx.translate(-b.x, -b.y);
      softShadow(bx, by, w, h, 12, 10, 3, 'rgba(20,30,60,.3)');
      ctx.fillStyle = b.bg; D.roundRect(bx, by, w, h, 12); ctx.fill();
      ctx.beginPath();
      if (b.below) { ctx.moveTo(b.x - 7, by + 0.5); ctx.lineTo(b.x, b.y + 2); ctx.lineTo(b.x + 7, by + 0.5); }
      else { ctx.moveTo(b.x - 7, by + h - 0.5); ctx.lineTo(b.x, b.y - 2); ctx.lineTo(b.x + 7, by + h - 0.5); }
      ctx.closePath(); ctx.fill();
      lines.forEach((l, j) => txt(l, bx + 12, by + 8 + b.size + j * lh - 3, b.size, b.color, 'left', 800));
      ctx.restore();
    }
  }
  const WAVES = [], CHECKS = [];
  function okFx(x, y, color, big) {
    WAVES.push({ x, y, t: 0, color: color || COL.good, max: big ? 70 : 44 });
    FX.burst(x, y, { count: RM ? 3 : 8, speed: 130, life: 0.7, size: 3.6, colors: ['#ffd23f', '#fff6c2', '#8b5cf6'], shape: 'star' });
    CHECKS.push({ x, y: y - (big ? 8 : 4), t: 0 });
    Sound.tick();
  }
  function drawWaves(dt) {
    for (let i = WAVES.length - 1; i >= 0; i--) {
      const w = WAVES[i]; w.t += dt;
      if (w.t > 0.7) { WAVES.splice(i, 1); continue; }
      const k = w.t / 0.7;
      ctx.save(); ctx.strokeStyle = rgba(w.color, (1 - k) * 0.85); ctx.lineWidth = 4 * (1 - k) + 1;
      circle(ctx, w.x, w.y, 8 + ease.outCubic(k) * w.max); ctx.stroke(); ctx.restore();
    }
    for (let i = CHECKS.length - 1; i >= 0; i--) {
      const c = CHECKS[i]; c.t += dt;
      if (c.t > 1.3) { CHECKS.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = c.t > 0.9 ? 1 - (c.t - 0.9) / 0.4 : 1;
      const s = 0.7 + 0.3 * outBack(Math.min(1, c.t / 0.3));
      ctx.translate(c.x, c.y - 10 * smooth(c.t / 1.3)); ctx.scale(s, s);
      D.check(0, 0, 14, Math.min(1, c.t / 0.4));
      ctx.restore();
    }
  }
  function newBadge(x, y) {
    const a = 0.5 + 0.5 * Math.sin(now() * 6);
    D.label(x, y, 'NEW', { bg: rgba(COL.sub, 0.85 + a * 0.15), size: 13, pad: 7 });
  }
  function ringRect(r, rad) {
    const a = 0.5 + 0.5 * Math.sin(now() * 6);
    ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.35 + 0.5 * a); ctx.lineWidth = 4; D.roundRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, (rad || 14) + 4); ctx.stroke(); ctx.restore();
    newBadge(r.x + r.w - 20, r.y - 4);
  }
  const FOC = { key: null, t: 0 };
  function setFocus(key) { FOC.key = key; FOC.t = 3.6; }
  function focusRing(r, key, rad) {
    if (FOC.key !== key || FOC.t <= 0) return;
    const a = 0.5 + 0.5 * Math.sin(now() * 9), fade = Math.min(1, FOC.t / 0.5);
    ctx.save(); ctx.globalAlpha = fade; ctx.strokeStyle = rgba(COL.warn, 0.35 + 0.6 * a); ctx.lineWidth = 5;
    D.roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, (rad || 14) + 5); ctx.stroke(); ctx.restore();
  }
  function pulseEl(sel) {
    const e = $(sel); if (!e) return;
    e.classList.remove('feature-new'); void e.offsetWidth; e.classList.add('feature-new');
    setTimeout(() => e.classList.remove('feature-new'), 3800);
  }

  /* 화면 위 안내 (stage-hint) */
  const hintEl = $('#stageHint');
  function showHint(t, ms) { if (!hintEl) return; hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5200); }
  function hideHint() { if (hintEl) hintEl.classList.add('hide'); }

  /* =========================================================
     원자 공 모형 (앞 차시들과 같은 색 · 같은 모양)
     ========================================================= */
  const EL = {
    H:  { name: '수소',   c: '#f5f7fb', edge: '#c4ccd8', ink: '#4b5565', r: 0.36 },
    C:  { name: '탄소',   c: '#3a3f4b', edge: '#8e97ad', ink: '#ffffff', r: 0.52 },
    N:  { name: '질소',   c: '#3f6fe8', ink: '#ffffff', r: 0.5 },
    O:  { name: '산소',   c: '#ef4b4b', ink: '#ffffff', r: 0.5 },
    Na: { name: '나트륨', c: '#9b7be0', ink: '#ffffff', r: 0.58 },
    Cl: { name: '염소',   c: '#3fbf5f', ink: '#ffffff', r: 0.62 },
    Ag: { name: '은',     c: '#c3ccd9', edge: '#8794a8', ink: '#2f3a4d', r: 0.6 },
    Ca: { name: '칼슘',   c: '#f2a93b', ink: '#ffffff', r: 0.64 },
    Fe: { name: '철',     c: '#8b95a6', edge: '#5d6879', ink: '#ffffff', r: 0.58 },
    Cu: { name: '구리',   c: '#c7743b', ink: '#ffffff', r: 0.6 },
  };
  const SPK = 3, SPR = new Map();
  function ballSprite(sym, R) {
    const key = sym + '|' + R;
    let sp = SPR.get(key);
    if (sp) return sp;
    const e = EL[sym] || { c: '#8b95a7', ink: '#fff' };
    const m = 1.1, size = Math.ceil(R * 2 * m * SPK);
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    g.scale(SPK, SPK);
    const cx = R * m, cy = R * m;
    const gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.06, cx, cy, R);
    gr.addColorStop(0, shade(e.c, 0.62)); gr.addColorStop(0.5, e.c); gr.addColorStop(1, shade(e.c, -0.36));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.strokeStyle = e.edge || shade(e.c, -0.45); g.globalAlpha = e.edge ? 0.9 : 0.35; g.lineWidth = 1.1;
    g.beginPath(); g.arc(cx, cy, R - 0.5, 0, TAU); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath(); g.ellipse(cx - R * 0.33, cy - R * 0.42, R * 0.32, R * 0.18, -0.6, 0, TAU); g.fill();
    if (R >= 8) {
      g.fillStyle = e.ink; g.font = D.font(clamp(R * 0.62, 10, 24), 800);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sym, cx, cy + R * 0.06);
    }
    sp = { cv, half: R * m };
    SPR.set(key, sp);
    return sp;
  }
  function drawBall(sym, x, y, R, alpha) {
    if (R < 1.2) return;
    const rr = Math.max(2, Math.round(R * 2) / 2);
    const sp = ballSprite(sym, rr);
    const k = R / rr;
    if (alpha != null && alpha < 1) { ctx.save(); ctx.globalAlpha *= Math.max(0, alpha); ctx.drawImage(sp.cv, x - sp.half * k, y - sp.half * k, sp.half * 2 * k, sp.half * 2 * k); ctx.restore(); }
    else ctx.drawImage(sp.cv, x - sp.half * k, y - sp.half * k, sp.half * 2 * k, sp.half * 2 * k);
  }

  /* 분자 틀: 원자 [기호, x, y]와 결합 [i, j, 차수] (단위: 결합 길이 ≈ 1) */
  const NO3 = [['N', 0, 0], ['O', 0, -1.05], ['O', -0.91, 0.525], ['O', 0.91, 0.525]];
  const NO3B = [[0, 1, 1], [0, 2, 1], [0, 3, 2]];
  const shiftA = (arr, dx, dy) => arr.map((q) => [q[0], q[1] + dx, q[2] + dy]);
  const TPL = {
    H2:   { a: [['H', -0.46, 0], ['H', 0.46, 0]], b: [[0, 1, 1]] },
    O2:   { a: [['O', -0.52, 0], ['O', 0.52, 0]], b: [[0, 1, 2]] },
    N2:   { a: [['N', -0.52, 0], ['N', 0.52, 0]], b: [[0, 1, 3]] },
    H2O:  { a: [['O', 0, -0.3], ['H', -0.8, 0.4], ['H', 0.8, 0.4]], b: [[0, 1, 1], [0, 2, 1]] },
    CO2:  { a: [['C', 0, 0], ['O', -1.12, 0], ['O', 1.12, 0]], b: [[0, 1, 2], [0, 2, 2]] },
    NH3:  { a: [['N', 0, -0.4], ['H', -0.92, 0.32], ['H', 0.92, 0.32], ['H', 0, 0.95]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
    CH4:  { a: [['C', 0, 0], ['H', -0.9, -0.75], ['H', 0.9, -0.75], ['H', -0.9, 0.75], ['H', 0.9, 0.75]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
    C:    { a: [['C', 0, 0]], b: [] },
    Fe:   { a: [['Fe', 0, 0]], b: [] },
    H:    { a: [['H', 0, 0]], b: [] },
    O:    { a: [['O', 0, 0]], b: [] },
    Ag:   { a: [['Ag', 0, 0]], b: [] },
    Na:   { a: [['Na', 0, 0]], b: [] },
    Cl:   { a: [['Cl', 0, 0]], b: [] },
    NO3:  { a: NO3, b: NO3B },
    HCl:  { a: [['H', -0.56, 0], ['Cl', 0.6, 0]], b: [[0, 1, 1]] },
    NaCl: { a: [['Na', -0.62, 0], ['Cl', 0.66, 0]], b: [[0, 1, 1]] },
    AgCl: { a: [['Ag', -0.62, 0], ['Cl', 0.66, 0]], b: [[0, 1, 1]] },
    AgNO3: { a: shiftA(NO3, -0.8, -0.1).concat([['Ag', 1.5, 1.0]]), b: NO3B.concat([[3, 4, 1]]) },
    NaNO3: { a: shiftA(NO3, -0.8, -0.1).concat([['Na', 1.5, 1.0]]), b: NO3B.concat([[3, 4, 1]]) },
    CaCO3: { a: [['C', -0.6, 0], ['O', -0.6, -1.08], ['O', -1.55, 0.54], ['O', 0.35, 0.54], ['Ca', 1.45, 0.5]], b: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [3, 4, 1]] },
    CaCl2: { a: [['Ca', 0, 0], ['Cl', -1.5, 0.15], ['Cl', 1.5, 0.15]], b: [[0, 1, 1], [0, 2, 1]] },
    Fe2O3: { a: [['Fe', -0.95, 0.3], ['Fe', 0.95, 0.3], ['O', 0, 0.45], ['O', -0.95, -0.7], ['O', 0.95, -0.7]], b: [[0, 2, 1], [1, 2, 1], [0, 3, 1], [1, 4, 1]] },
  };
  Object.keys(TPL).forEach((k) => {
    const t = TPL[k]; let r = 0;
    t.a.forEach((q) => { r = Math.max(r, Math.hypot(q[1], q[2]) + EL[q[0]].r); });
    t.rad = r;
  });

  /* 결합 막대 (1~3중) */
  function drawBond(x1, y1, x2, y2, order, msc, w, alpha) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    if (len < 1) return;
    const nx = -dy / len, ny = dx / len;
    const lw = Math.max(2, msc * 0.13) * w, gap = lw * 1.3;
    ctx.save(); ctx.globalAlpha *= (alpha == null ? 1 : alpha) * Math.min(1, w * 1.5); ctx.lineCap = 'round';
    for (let k = 0; k < order; k++) {
      const off = (k - (order - 1) / 2) * gap;
      ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = lw + 1.6; ctx.beginPath(); ctx.moveTo(x1 + nx * off, y1 + ny * off); ctx.lineTo(x2 + nx * off, y2 + ny * off); ctx.stroke();
      ctx.strokeStyle = '#e6ebf3'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1 + nx * off, y1 + ny * off); ctx.lineTo(x2 + nx * off, y2 + ny * off); ctx.stroke();
    }
    ctx.restore();
  }
  /* 물리 계산 없이 분자 한 개를 바로 그리기 (카드 · 저울 · 그림용) */
  function drawMolStatic(type, cx, cy, sc, rot, alpha, scl) {
    const tpl = TPL[type]; if (!tpl) return;
    scl = scl == null ? 1 : scl;
    const cs = Math.cos(rot || 0), sn = Math.sin(rot || 0);
    const P = tpl.a.map((q) => ({ x: cx + (q[1] * cs - q[2] * sn) * sc * scl, y: cy + (q[1] * sn + q[2] * cs) * sc * scl, sym: q[0] }));
    tpl.b.forEach((q) => drawBond(P[q[0]].x, P[q[0]].y, P[q[1]].x, P[q[1]].y, q[2], sc * scl, 1, alpha));
    P.forEach((p) => drawBall(p.sym, p.x, p.y, EL[p.sym].r * sc * scl, alpha));
  }

  class Sys {
    constructor() { this.atoms = []; this.mols = []; this.bonds = []; this.t = 0; this.sc = 30; }
    clear() { this.atoms.length = 0; this.mols.length = 0; this.bonds.length = 0; }
    newAtom(sym, x, y) {
      const a = { sym, x, y, tx: x, ty: y, vx: 0, vy: 0, mol: null, k: 45, z: 0.5, s: 1, alpha: 1, fade: 0 };
      this.atoms.push(a); return a;
    }
    bond(a, b, order, w) {
      const o = { a, b, order: order || 1, w: w || 0, tw: 1 };
      this.bonds.push(o); return o;
    }
    _mol(type, cx, cy, o) {
      return { type, cx, cy, vx: 0, vy: 0, rot: o.rot || 0, vr: o.vr || 0, mode: o.mode || 'gas', box: o.box || null, sc: o.sc || this.sc, atoms: [], ax: cx, ay: cy, amp: o.amp != null ? o.amp : 3, ph: Math.random() * 6.28, jit: 0, scl: o.scl != null ? o.scl : 1, speed: o.speed != null ? o.speed : 40, life: o.life, age: 0, tag: o.tag, chg: o.chg || 0 };
    }
    /* 분자 하나 만들기 (원자도 새로 만듦) */
    addMol(type, cx, cy, o) {
      o = o || {};
      const tpl = TPL[type];
      const m = this._mol(type, cx, cy, o);
      if (m.mode === 'gas' || m.mode === 'fly') {
        const a = Math.random() * TAU; m.vx = Math.cos(a) * m.speed; m.vy = Math.sin(a) * m.speed;
        if (o.vx != null) { m.vx = o.vx; m.vy = o.vy; }
        if (!m.vr) m.vr = rand(-1, 1);
      }
      const cs = Math.cos(m.rot), sn = Math.sin(m.rot);
      tpl.a.forEach((q) => {
        const x = cx + (q[1] * cs - q[2] * sn) * m.sc * m.scl, y = cy + (q[1] * sn + q[2] * cs) * m.sc * m.scl;
        const at = this.newAtom(q[0], x, y); at.mol = m; at.k = 220; at.s = m.scl; m.atoms.push(at);
      });
      tpl.b.forEach((q) => { this.bond(m.atoms[q[0]], m.atoms[q[1]], q[2], 1); });
      this.mols.push(m);
      return m;
    }
    /* 이미 있는 (자유) 원자들로 분자 만들기: 슬롯마다 가장 가까운 같은 종류 원자를 고름 */
    form(type, pool, cx, cy, o) {
      o = o || {};
      const tpl = TPL[type];
      const m = this._mol(type, cx, cy, Object.assign({ mode: 'hold' }, o));
      const cs = Math.cos(m.rot), sn = Math.sin(m.rot);
      const used = new Set();
      for (let i = 0; i < tpl.a.length; i++) {
        const q = tpl.a[i];
        const wx = cx + (q[1] * cs - q[2] * sn) * m.sc, wy = cy + (q[1] * sn + q[2] * cs) * m.sc;
        let best = null, bd = 1e9;
        for (const a of pool) { if (used.has(a) || a.sym !== q[0] || a.mol) continue; const d = Math.hypot(a.x - wx, a.y - wy); if (d < bd) { bd = d; best = a; } }
        if (!best) best = this.newAtom(q[0], wx, wy);
        used.add(best); best.mol = m; best.k = o.k || 120; best.z = o.z != null ? o.z : 0.42; best.s = 1; m.atoms.push(best);
      }
      tpl.b.forEach((q) => this.bond(m.atoms[q[0]], m.atoms[q[1]], q[2], 0));
      this.mols.push(m);
      return m;
    }
    /* 결합 끊기: 원자들이 자유로워짐 */
    dissolve(m, kick) {
      const i = this.mols.indexOf(m); if (i >= 0) this.mols.splice(i, 1);
      m.atoms.forEach((a) => {
        a.mol = null; a.k = 50; a.z = 0.45;
        const ang = rand(0, TAU), sp = kick == null ? 70 : kick;
        a.vx += Math.cos(ang) * sp; a.vy += Math.sin(ang) * sp;
        a.tx = a.x + Math.cos(ang) * 10; a.ty = a.y + Math.sin(ang) * 10;
      });
      this.bonds.forEach((b) => { if (m.atoms.includes(b.a) && m.atoms.includes(b.b)) b.tw = 0; });
      return m.atoms;
    }
    removeMol(m, fadeSec) {
      const i = this.mols.indexOf(m); if (i >= 0) this.mols.splice(i, 1);
      m.atoms.forEach((a) => { a.mol = null; a.fade = fadeSec || 0.01; a.k = 200; a.tx = a.x; a.ty = a.y; });
      this.bonds.forEach((b) => { if (m.atoms.includes(b.a) && m.atoms.includes(b.b)) b.tw = 0; });
    }
    count(sym, fn) { let n = 0; this.atoms.forEach((a) => { if ((!sym || a.sym === sym) && a.fade <= 0 && (!fn || fn(a))) n++; }); return n; }
    molCount(type, fn) { let n = 0; this.mols.forEach((m) => { if ((!type || m.type === type) && (!fn || fn(m))) n++; }); return n; }

    update(dt) {
      this.t += dt;
      const t = this.t;
      for (let i = this.mols.length - 1; i >= 0; i--) {
        const m = this.mols[i];
        m.age += dt;
        if (m.mode === 'gas' || m.mode === 'fly') {
          m.cx += m.vx * dt; m.cy += m.vy * dt; m.rot += m.vr * dt;
          if (m.mode === 'gas') {
            if (Math.random() < dt * 1.2) { const a = Math.atan2(m.vy, m.vx) + rand(-0.9, 0.9); const sp = m.speed * rand(0.7, 1.3); m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp; }
            const b = m.box;
            if (b) {
              const r = TPL[m.type].rad * m.sc * 0.78;
              if (m.cx < b.x + r) { m.cx = b.x + r; m.vx = Math.abs(m.vx); } else if (m.cx > b.x + b.w - r) { m.cx = b.x + b.w - r; m.vx = -Math.abs(m.vx); }
              if (m.cy < b.y + r) { m.cy = b.y + r; m.vy = Math.abs(m.vy); } else if (m.cy > b.y + b.h - r) { m.cy = b.y + b.h - r; m.vy = -Math.abs(m.vy); }
            }
          }
          if (m.life != null && m.age > m.life) { this.removeMol(m, 0.35); continue; }
        } else if (m.mode === 'liquid') {
          m.cx = m.ax + Math.sin(t * 2.1 + m.ph) * m.amp; m.cy = m.ay + Math.cos(t * 1.7 + m.ph * 1.3) * m.amp; m.rot += Math.sin(t * 1.4 + m.ph) * dt * 0.6;
        }
        const jx = m.jit ? rand(-m.jit, m.jit) : 0, jy = m.jit ? rand(-m.jit, m.jit) : 0;
        const cs = Math.cos(m.rot), sn = Math.sin(m.rot), tpl = TPL[m.type];
        for (let k = 0; k < m.atoms.length; k++) {
          const a = m.atoms[k], q = tpl.a[k];
          a.s = m.scl;
          a.tx = m.cx + jx + (q[1] * cs - q[2] * sn) * m.sc * m.scl;
          a.ty = m.cy + jy + (q[1] * sn + q[2] * cs) * m.sc * m.scl;
        }
      }
      for (let i = this.atoms.length - 1; i >= 0; i--) {
        const a = this.atoms[i];
        const c = 2 * a.z * Math.sqrt(a.k);
        const n = dt > 0.025 ? 2 : 1, h = dt / n;
        for (let s = 0; s < n; s++) {
          a.vx += (a.k * (a.tx - a.x) - c * a.vx) * h; a.vy += (a.k * (a.ty - a.y) - c * a.vy) * h;
          a.x += a.vx * h; a.y += a.vy * h;
        }
        if (a.fade > 0) { a.alpha -= dt / a.fade; if (a.alpha <= 0) this.atoms.splice(i, 1); }
      }
      for (let i = this.bonds.length - 1; i >= 0; i--) {
        const b = this.bonds[i];
        b.w = SciSim.approach(b.w, b.tw, dt, 9);
        if ((b.tw === 0 && b.w < 0.03) || b.a.alpha <= 0 || b.b.alpha <= 0) this.bonds.splice(i, 1);
      }
    }
    draw() {
      const sc = this.sc;
      for (const b of this.bonds) {
        if (b.w < 0.02) continue;
        const a = b.a, c = b.b;
        drawBond(a.x, a.y, c.x, c.y, b.order, a.mol ? a.mol.sc : (c.mol ? c.mol.sc : sc), b.w, Math.min(a.alpha, c.alpha));
      }
      const L = this.atoms;
      for (let i = 0; i < L.length; i++) {
        const a = L[i];
        const msc = a.mol ? a.mol.sc : sc;
        drawBall(a.sym, a.x, a.y, EL[a.sym].r * msc * a.s, a.alpha);
      }
      // 이온 전하 표시
      for (const m of this.mols) {
        if (!m.chg) continue;
        const rr = TPL[m.type].rad * m.sc * m.scl;
        const bx = m.cx + rr * 0.78, by = m.cy - rr * 0.78;
        ctx.save(); ctx.fillStyle = m.chg > 0 ? '#e24a4a' : '#3f6fe8'; circle(ctx, bx, by, 7.5); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx - 3.2, by); ctx.lineTo(bx + 3.2, by); if (m.chg > 0) { ctx.moveTo(bx, by - 3.2); ctx.lineTo(bx, by + 3.2); } ctx.stroke(); ctx.restore();
      }
    }
  }

  /* 반응 연출: 모이기 → 흔들림 → 결합이 끊어짐 → 원자가 튕기며 재결합
     opts: {ins: [mol…], outs: [{type, cx, cy, rot, sx, sy, move, after, created}], at: {x, y}, gather, shake, onFlash, onDone} */
  function react(sys, opts) {
    const ins = opts.ins, at = opts.at, gather = opts.gather != null ? opts.gather : 0.7, shake = opts.shake != null ? opts.shake : 0.5;
    const sp = opts.spread != null ? opts.spread : 1;
    ins.forEach((m, i) => {
      m.mode = 'hold'; m.vx = m.vy = 0;
      const ang = (i / ins.length) * TAU + 0.6, rr = (ins.length > 1 ? 1.25 : 0) * sys.sc * sp;
      tw(m, { cx: at.x + Math.cos(ang) * rr, cy: at.y + Math.sin(ang) * rr * 0.8 }, gather, 'inOutCubic', { essential: true });
      later(gather, () => { m.jit = 2.6; });
    });
    later(gather + shake, () => {
      ins.forEach((m) => { m.jit = 0; });
      const pool = [];
      ins.forEach((m) => { sys.dissolve(m, 95).forEach((a) => pool.push(a)); });
      opts.onFlash && opts.onFlash(at);
      later(0.34, () => {
        opts.outs.forEach((o) => {
          const sx = o.sx != null ? o.sx : at.x, sy = o.sy != null ? o.sy : at.y;
          const m = sys.form(o.type, pool, sx, sy, { rot: o.rot, sc: o.sc, mode: 'hold', k: 120, z: 0.4 });
          tw(m, { cx: o.cx, cy: o.cy }, o.move != null ? o.move : 0.9, 'outCubic', { essential: true, onDone: () => { m.ax = m.cx; m.ay = m.cy; if (o.after) o.after(m); } });
          if (o.created) o.created(m);
        });
        later(1.0, () => { opts.onDone && opts.onDone(); });
      });
    });
  }

  /* =========================================================
     끌기 (카드 · 스티커 · 낱말 칸): 눌러서 들어 올리고, 놓으면 튕기며 자리에 붙음
     ========================================================= */
  class DragSet {
    constructor() { this.items = []; this.cur = null; this.off = { x: 0, y: 0 }; }
    add(it) {
      it.x = it.x != null ? it.x : it.hx; it.y = it.y != null ? it.y : it.hy;
      it.tx = it.tx != null ? it.tx : it.x; it.ty = it.ty != null ? it.ty : it.y;
      it.vx = 0; it.vy = 0; it.lift = 0; it.shake = 0; it.pop = 0;
      this.items.push(it); return it;
    }
    hit(p) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (it.hidden || it.locked) continue;
        const hw = (it.w || 60) / 2 + 4, hh = (it.h || 40) / 2 + 4;
        if (Math.abs(p.x - it.x) <= hw && Math.abs(p.y - it.y) <= hh) return it;
      }
      return null;
    }
    down(p) {
      const it = this.hit(p);
      if (!it) return null;
      this.cur = it; this.off = { x: p.x - it.x, y: p.y - it.y };
      const i = this.items.indexOf(it); this.items.splice(i, 1); this.items.push(it);
      it.dragging = true; it.vx = it.vy = 0;
      return it;
    }
    move(p) { const it = this.cur; if (!it) return; it.x = p.x - this.off.x; it.y = p.y - this.off.y; }
    up() { const it = this.cur; this.cur = null; if (it) it.dragging = false; return it; }
    update(dt) {
      for (const it of this.items) {
        it.lift = SciSim.approach(it.lift, it.dragging ? 1 : 0, dt, 14);
        if (it.shake > 0) it.shake = Math.max(0, it.shake - dt * 3);
        if (it.pop > 0) it.pop = Math.max(0, it.pop - dt * 3);
        if (it.dragging) continue;
        const k = it.k || 260, c = it.c || 24;
        const n = dt > 0.025 ? 2 : 1, h = dt / n;
        for (let s = 0; s < n; s++) {
          it.vx += (k * (it.tx - it.x) - c * it.vx) * h; it.vy += (k * (it.ty - it.y) - c * it.vy) * h;
          it.x += it.vx * h; it.y += it.vy * h;
        }
      }
    }
  }

  /* =========================================================
     숫자 굴러가기 + 전자저울
     ========================================================= */
  class Num {
    constructor(v) { this.v = v; this.t = v; this.rate = 5; }
    set(t) { this.t = t; }
    jump(t) { this.v = this.t = t; }
    update(dt) { this.v = SciSim.approach(this.v, this.t, dt, this.rate); if (Math.abs(this.v - this.t) < 0.004) this.v = this.t; }
  }
  /* 주행 거리계처럼 굴러가는 LCD 숫자: 오른쪽 끝(소수점 위치 rx) 기준, 정수 3자리 + . + 소수 1자리 */
  function rollDigitsLCD(rx, y, v, lh, size) {
    const T = Math.max(0, Math.min(9999, v * 10));      // 0.1 단위의 연속값
    const cw = size * 0.62;
    ctx.font = '800 ' + size + 'px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#233a1f';
    for (let k = 0; k < 4; k++) {
      const x = T / Math.pow(10, k), fl = Math.floor(x + 1e-9), d = fl % 10;
      let off;
      if (k === 0) off = x - fl;
      else { const lower = (T / Math.pow(10, k - 1)) % 10; off = lower > 9.6 ? (lower - 9.6) / 0.4 : 0; }
      off = clamp(off, 0, 1);
      if (k >= 2 && fl === 0 && off < 0.001) continue;
      const cx = k === 0 ? rx + cw * 0.85 : rx - cw * (k - 0.5) - cw * 0.35;
      const e = off * off * (3 - 2 * off), yy = y - e * lh;
      ctx.globalAlpha = 1 - e * 0.4; ctx.fillText(String(d), cx, yy);
      if (e > 0.001) { ctx.globalAlpha = 0.6 + e * 0.4; ctx.fillText(String((d + 1) % 10), cx, yy + lh); }
    }
    ctx.globalAlpha = 1;
    ctx.fillText('.', rx, y + 5);
  }
  /* 전자저울: (cx, py)=받침판 윗면. num=Num */
  function drawScale(cx, py, num, o) {
    o = o || {};
    const w = o.w || 300, bh = 64;
    ctx.save();
    groundShadow(cx, py + bh + 18, w / 2 + 14, 11, 0.9);
    const g = ctx.createLinearGradient(0, py + 12, 0, py + 12 + bh);
    g.addColorStop(0, '#f4f6fa'); g.addColorStop(1, '#b9c3d3');
    softShadow(cx - w / 2, py + 12, w, bh, 14, 10, 4, 'rgba(30,40,70,.28)'); ctx.fillStyle = g; D.roundRect(cx - w / 2, py + 12, w, bh, 14); ctx.fill();
    ctx.strokeStyle = '#98a4b8'; ctx.lineWidth = 2; D.roundRect(cx - w / 2, py + 12, w, bh, 14); ctx.stroke();
    const pg = ctx.createLinearGradient(0, py, 0, py + 12); pg.addColorStop(0, '#e9eef6'); pg.addColorStop(1, '#a5b1c4');
    ctx.fillStyle = pg; D.roundRect(cx - w / 2 + 28, py, w - 56, 13, 4); ctx.fill();
    ctx.strokeStyle = '#8e9bb0'; ctx.lineWidth = 1.5; D.roundRect(cx - w / 2 + 28, py, w - 56, 13, 4); ctx.stroke();
    const lw = 160, lh = 42, lx = cx - lw / 2 - 18, ly = py + 24;
    if (o.flash > 0) { ctx.strokeStyle = 'rgba(20,160,88,' + (0.3 + 0.5 * o.flash) + ')'; ctx.lineWidth = 8; D.roundRect(lx - 3, ly - 3, lw + 6, lh + 6, 9); ctx.stroke(); }
    ctx.fillStyle = '#243b30'; D.roundRect(lx - 3, ly - 3, lw + 6, lh + 6, 8); ctx.fill();
    const lg = ctx.createLinearGradient(0, ly, 0, ly + lh); lg.addColorStop(0, '#d6e6c4'); lg.addColorStop(1, '#bfd3ab');
    ctx.fillStyle = lg; D.roundRect(lx, ly, lw, lh, 6); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(lx + 4, ly + 3, lw - 8, lh - 6); ctx.clip();
    rollDigitsLCD(lx + lw - 52, ly + lh / 2 + 1, num.v, 30, 29);
    ctx.restore();
    ctx.font = '800 17px ui-monospace, Menlo, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#233a1f';
    ctx.fillText('g', lx + lw - 24, ly + lh / 2 + 5);
    ctx.textBaseline = 'alphabetic';
    D.sphere(cx + w / 2 - 34, py + 44, 8, '#5b6a82', { gloss: true });
    D.sphere(cx + w / 2 - 34 - 24, py + 48, 5, '#8795ad', { gloss: false });
    txt('전자저울', cx - w / 2 + 22, py + 72, 13, '#6b778c', 'left', 800);
    ctx.restore();
    return py;
  }

  /* 🔍 돋보기: 둥근 렌즈 + 손잡이 + 원본 위치에서 이어지는 점선. drawIn(cx, cy, r)은 렌즈 안을 그림 */
  function lens(cx, cy, r, drawIn, o) {
    o = o || {};
    const k = o.k != null ? o.k : 1;
    if (k <= 0.01) return;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
    ctx.globalAlpha *= Math.min(1, k * 1.4);
    if (o.src) {
      ctx.save();
      ctx.strokeStyle = 'rgba(139,92,246,.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath(); circle(ctx, o.src.x, o.src.y, o.src.r || 18); ctx.stroke();
      const a = Math.atan2(cy - o.src.y, cx - o.src.x);
      ctx.beginPath(); ctx.moveTo(o.src.x + Math.cos(a) * (o.src.r || 18), o.src.y + Math.sin(a) * (o.src.r || 18)); ctx.lineTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); ctx.stroke();
      ctx.restore();
    }
    ctx.save(); ctx.lineCap = 'round';
    const hx = cx + r * 0.72, hy = cy + r * 0.72;
    ctx.strokeStyle = '#5c4a8a'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + r * 0.5, hy + r * 0.5); ctx.stroke();
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + r * 0.5, hy + r * 0.5); ctx.stroke();
    ctx.restore();
    softShadow(cx - r, cy - r, r * 2, r * 2, r, 14, 5, 'rgba(40,30,90,.32)');
    ctx.save();
    circle(ctx, cx, cy, r); ctx.clip();
    const bg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, o.bg || '#eef2fb');
    ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    drawIn(cx, cy, r);
    ctx.restore();
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 7; circle(ctx, cx, cy, r); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r - 7, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    if (o.title) pill(cx, cy - r - 4, o.title, { bg: '#8b5cf6', size: 13, pad: 9 });
    ctx.restore();
  }

  /* =========================================================
     루프 (각 차시가 update/draw를 넘겨 줌)
     ========================================================= */
  let lastDt = 0.016;
  function startLoop(updateScene, drawScene) {
    let FREEZE = false;
    const upd = (dt) => { updateAnims(dt); updateLater(dt); FX.update(dt); if (FOC.t > 0) FOC.t -= dt; updateScene(dt); };
    SciSim.loop((dt) => {
      lastDt = dt;
      if (!FREEZE) upd(dt);
      view.clear(BG);
      ctx.save(); ctx.translate(0, -YS);
      drawScene(now(), dt);
      FX.draw(ctx);
      drawWaves(dt);
      drawBubbles(dt);
      ctx.restore();
    });
    return {
      ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) upd(1 / 60); },
      freeze(v) { FREEZE = !!v; },
    };
  }
  function v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + (y - YS) * r.height / VH }; }

  /* =========================================================
     중3 Ⅰ. 화학 반응의 규칙성 — 화학 반응식  [9과16-02]
     간단한 화학 반응을 화학 반응식으로 표현하고, 계수의 비를 입자 수의 비로 해석할 수 있다.
     ① 모형: 수소 + 산소 → 물 (분자가 깨지고 원자가 재배열) + 단어식
     → ② 탐구: 원자 수 맞추기 (저울) → ③ 설명: 반응식 완성 4단계 → ④ 적용: 계수의 비 = 분자 수의 비
     ※ 상태 기호 · 몰 · 산화/환원 · 질량 계산은 다루지 않음
     ========================================================= */
  const S = { scene: 'react', sceneT: 0 };
  const SC = {};
  const DR = { fn: null };
  const SCENE_LABEL = {
    react: '💥 수소 + 산소가 반응하면 어떻게 될까요?',
    balance: '⚖️ 분자 수를 조절해 원자 수를 맞춰요',
    write: '🧩 화학 반응식을 4단계로 완성해요',
    ratio: '🔢 계수의 비는 분자 수의 비예요',
  };
  const sceneBtns = $$('#sceneSeg button');
  function setScene(name, instant) {
    if (!SC[name]) return;
    S.scene = name; S.sceneT = instant ? 0.3 : 0;
    SC[name].enter && SC[name].enter();
    refreshUI();
  }
  function refreshUI() {
    $$('#ctrlCard .control').forEach((c) => { c.hidden = c.dataset.sc !== S.scene; });
    $('#tbLabel').textContent = SCENE_LABEL[S.scene];
    $('#sceneSeg').hidden = !on('balance');
    sceneBtns.forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
  }
  sceneBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, false); }));
  $('#resetBtn').addEventListener('click', () => { Sound.click(); SC[S.scene].reset && SC[S.scene].reset(true); });

  /* ---- 굴러가는 한 자리 숫자 (계수 · 개수) ---- */
  class RollDigit {
    constructor(n) { this.n = n; this.old = n; this.t = 1; this.dir = 1; }
    set(n) { if (n !== this.n) { this.old = this.n; this.dir = n > this.n ? 1 : -1; this.n = n; this.t = 0; } }
    update(dt) { if (this.t < 1) this.t = Math.min(1, this.t + dt * 4.5); }
    draw(x, y, size, color, align) {
      const p = this.t, e = outBack(p, 1.2), h = size * 0.95;
      ctx.save();
      if (p < 1) { ctx.globalAlpha = Math.max(0, 1 - p * 1.6); txt(String(this.old), x, y - e * h * this.dir, size, color, align || 'center', 800); ctx.globalAlpha = 1; }
      ctx.globalAlpha = p < 1 ? Math.min(1, p * 2.2) : 1;
      txt(String(this.n), x, y + (1 - e) * h * this.dir, size, color, align || 'center', 800);
      ctx.restore();
    }
  }
  const COLH = '#3f8cf0', COLO = '#ef4b4b', COLC = '#3a3f4b', COLN = '#3f6fe8';
  const elCol = (s) => EL[s].c;
  const MOLNAME = { H2: '수소', O2: '산소', H2O: '물', C: '탄소', CO2: '이산화 탄소', N2: '질소', NH3: '암모니아', CH4: '메테인' };

  /* =========================================================
     ① 반응 모형: 반응물 → 생성물
     ========================================================= */
  const LC = { x: 24, y: 104, w: 300, h: 246 }, RC = { x: 476, y: 104, w: 300, h: 246 };
  const lcBox = { x: LC.x + 26, y: LC.y + 30, w: LC.w - 52, h: LC.h - 56 }, rcBox = { x: RC.x + 26, y: RC.y + 30, w: RC.w - 52, h: RC.h - 56 };
  const sysR = new Sys(); sysR.sc = 34;
  const RS = { st: 'idle', flash: 0, spark: 0, words: false, ghost: 1, shown: 0 };
  const dragW = new DragSet();
  const WORDS = ['수소', '산소', '물', '이산화 탄소'];
  const SLOT = [{ x: 230, y: 54 }, { x: 400, y: 54 }, { x: 570, y: 54 }];
  const WSL = [null, null, null];
  const CHIP_Y = 456;
  WORDS.forEach((w, i) => { dragW.add({ word: w, w: 124, h: 42, hx: 130 + i * 180, hy: CHIP_Y + 8, x: 130 + i * 180, y: CHIP_Y + 8, slot: -1, wrong: false }); });
  function wordsReset() { dragW.items.forEach((c) => { c.slot = -1; c.wrong = false; c.tx = c.hx; c.ty = c.hy; }); WSL[0] = WSL[1] = WSL[2] = null; }
  const wordsOk = () => {
    const a = dragW.items.filter((c) => c.slot >= 0);
    const at = (i) => { const c = a.find((q) => q.slot === i); return c ? c.word : null; };
    const r = [at(0), at(1)].sort().join('+'), p = at(2);
    return { filled: a.length === 3, ok: r === '산소+수소' && p === '물', at };
  };
  function reactFill() {
    sysR.clear();
    const mk = (type, x, y) => sysR.addMol(type, x, y, { mode: 'gas', speed: 38, box: lcBox, sc: 34, rot: rand(0, 6) });
    mk('H2', lcBox.x + 70, lcBox.y + 50); mk('H2', lcBox.x + 150, lcBox.y + 120); mk('O2', lcBox.x + 70, lcBox.y + 130);
  }
  function reactReset() {
    clearLater(); FX.clear();
    RS.st = 'idle'; RS.flash = 0; RS.spark = 0; RS.ghost = 1;
    reactFill(); reactUI();
  }
  function reactUI() {
    const b = $('#igniteBtn');
    b.disabled = RS.st === 'run';
    b.textContent = RS.st === 'run' ? '⏳ 반응 중…' : RS.st === 'done' ? '↻ 다시 반응시키기' : '⚡ 점화하기';
  }
  function ignite() {
    if (RS.st === 'run') return;
    if (RS.st === 'done') reactReset();
    RS.st = 'run'; RS.spark = 1; hideHint();
    const at = { x: LC.x + LC.w / 2, y: LC.y + LC.h / 2 };
    sfx.zap();
    react(sysR, {
      ins: sysR.mols.slice(), at, gather: 0.9, shake: 0.7,
      onFlash(p) { RS.flash = 1; FX.burst(p.x, p.y, { count: 22, speed: 190, life: 0.8, size: 4, colors: ['#fff6c2', '#ffd23f', '#ff9f3a'], shape: 'star', gravity: 0 }); sfx.pop(); RS.spark = 0; },
      outs: [
        { type: 'H2O', cx: RC.x + 110, cy: RC.y + 100, rot: -0.2, move: 1.5, after: (m) => { m.mode = 'gas'; m.speed = 30; m.box = rcBox; m.vx = rand(-20, 20); m.vy = rand(-20, 20); m.vr = rand(-0.6, 0.6); } },
        { type: 'H2O', cx: RC.x + 200, cy: RC.y + 160, rot: 0.3, move: 1.5, after: (m) => { m.mode = 'gas'; m.speed = 30; m.box = rcBox; m.vx = rand(-20, 20); m.vy = rand(-20, 20); m.vr = rand(-0.6, 0.6); } },
      ],
      onDone() { RS.st = 'done'; okFx(RC.x + RC.w / 2, RC.y + 36, COL.good, true); sfx.ding(); reactUI(); },
    });
    later(1.9, () => { RS.ghost = 0; });
    reactUI();
  }
  $('#igniteBtn').addEventListener('click', () => { Sound.click(); ignite(); });

  function chamber(c, title, tcol) {
    panel(c.x, c.y, c.w, c.h, 20, 'rgba(235,244,255,.7)', 12, 4);
    ctx.save(); ctx.strokeStyle = 'rgba(143,163,189,.9)'; ctx.lineWidth = 3.5; D.roundRect(c.x, c.y, c.w, c.h, 20); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.x + 14, c.y + 28); ctx.lineTo(c.x + 14, c.y + c.h - 30); ctx.stroke();
    ctx.restore();
    pill(c.x + c.w / 2, c.y - 2, title, { bg: tcol, size: 16, pad: 14 });
  }
  function reactUpdate(dt) {
    sysR.update(dt);
    RS.flash = Math.max(0, RS.flash - dt * 2.2);
    dragW.update(dt);
  }
  function drawWordsBanner() {
    const a = RS.shown;
    if (a < 0.02) return;
    ctx.save(); ctx.globalAlpha = a;
    panel(150, 22, 500, 64, 18, '#ffffff', 10, 3);
    const W = wordsOk();
    SLOT.forEach((s, i) => {
      const filled = dragW.items.some((c) => c.slot === i);
      ctx.save(); ctx.setLineDash(filled ? [] : [7, 5]); ctx.strokeStyle = filled ? 'rgba(139,92,246,.0)' : '#aab6cb'; ctx.lineWidth = 2.2;
      ctx.fillStyle = filled ? 'rgba(139,92,246,.08)' : '#f6f8fc'; D.roundRect(s.x - 70, s.y - 24, 140, 48, 14); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    txt('+', (SLOT[0].x + SLOT[1].x) / 2, SLOT[0].y + 11, 30, COL.muted, 'center', 800);
    D.arrow(SLOT[1].x + 78, SLOT[1].y, SLOT[2].x - 78, SLOT[2].y, { color: COL.muted, width: 4 });
    ctx.restore();
  }
  function drawChip(c, big) {
    const lift = c.lift, w = c.w, h = c.h;
    const sh = c.shake > 0 ? Math.sin(c.shake * 32) * 5 * c.shake : 0;
    const sc = 1 + lift * 0.08 + c.pop * 0.12;
    ctx.save(); ctx.translate(c.x + sh, c.y - lift * 6); ctx.scale(sc, sc);
    softShadow(-w / 2, -h / 2, w, h, 14, 8 + lift * 12, 3 + lift * 8, 'rgba(20,30,70,' + (0.22 + lift * 0.12) + ')');
    const col = c.word === '수소' ? '#3f8cf0' : c.word === '산소' ? '#ef4b4b' : c.word === '물' ? '#0ea5e9' : '#4b5563';
    ctx.fillStyle = col; D.roundRect(-w / 2, -h / 2, w, h, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; D.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h / 2 - 2, 12); ctx.fill();
    if (c.wrong) { ctx.strokeStyle = COL.bad; ctx.lineWidth = 4; D.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 15); ctx.stroke(); }
    txt(c.word, 0, 6, 17, '#fff', 'center', 800);
    ctx.restore();
  }
  function drawReact(t) {
    RS.shown = SciSim.approach(RS.shown, RS.words ? 1 : 0, lastDt, 8);
    drawWordsBanner();
    if (RS.shown < 0.98) { ctx.save(); ctx.globalAlpha = 1 - RS.shown; txt('수소 분자 2개와 산소 분자 1개가 들어 있는 용기예요', 400, 62, 18, COL.ink, 'center', 800); ctx.restore(); }
    chamber(LC, '반응물 (반응 전)', '#3f6fe8');
    chamber(RC, '생성물 (반응 후)', '#0ea5a5');
    // 가운데 화살표
    const ax = 400, ay = LC.y + LC.h / 2;
    D.arrow(ax - 52, ay, ax + 52, ay, { color: '#8b5cf6', width: 7, head: 22 });
    txt('화학 반응', ax, ay - 20, 14, COL.sub, 'center', 800);
    // 전기 불꽃 막대
    const cx = LC.x + LC.w / 2;
    ctx.save(); ctx.fillStyle = '#6b778c';
    D.roundRect(cx - 40, LC.y - 8, 10, 54, 4); ctx.fill(); D.roundRect(cx + 30, LC.y - 8, 10, 54, 4); ctx.fill();
    ctx.restore();
    if (RS.spark > 0) { D.spark(cx, LC.y + 40, 16 + 6 * Math.sin(t * 40), t, '#ffe27a'); ctx.save(); ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 30, LC.y + 40); ctx.lineTo(cx - 14, LC.y + 32); ctx.lineTo(cx, LC.y + 46); ctx.lineTo(cx + 14, LC.y + 34); ctx.lineTo(cx + 30, LC.y + 40); ctx.stroke(); ctx.restore(); }
    // 생성물 자리 (아직 없을 때)
    if (RS.ghost > 0.02) {
      ctx.save(); ctx.globalAlpha = RS.ghost * 0.45;
      drawMolStatic('H2O', RC.x + 110, RC.y + 100, 34, -0.2, 0.5); drawMolStatic('H2O', RC.x + 200, RC.y + 160, 34, 0.3, 0.5);
      txt('?', RC.x + 155, RC.y + 140, 40, '#8995a8', 'center', 800);
      ctx.restore();
    }
    sysR.draw();
    // 섬광
    if (RS.flash > 0) { D.glow(LC.x + LC.w / 2, LC.y + LC.h / 2, 170 * (1.2 - RS.flash * 0.4), '#ffd23f', 0.75 * RS.flash); }
    // 이름표
    const nm = (x, y, s, c) => pill(x, y, s, { bg: c, size: 14, pad: 10 });
    const done = RS.st === 'done';
    nm(LC.x + 80, LC.y + LC.h + 26, '수소 분자 H₂', '#5c86d6'); nm(LC.x + 230, LC.y + LC.h + 26, '산소 분자 O₂', '#d85a5a');
    ctx.save(); ctx.globalAlpha = done ? 1 : 0.4; nm(RC.x + RC.w / 2, RC.y + RC.h + 26, '물 분자 H₂O', '#0ea5a5'); ctx.restore();
    // 칩 트레이
    if (RS.shown > 0.02) {
      ctx.save(); ctx.globalAlpha = RS.shown;
      panel(60, CHIP_Y - 50, 680, 78, 18, '#ffffff', 10, 3);
      txt('낱말 카드를 위 빈칸으로 끌어 단어식을 완성해요', 400, CHIP_Y - 30, 14, COL.muted, 'center', 700);
      dragW.items.forEach((c) => { if (c.slot < 0 && !c.dragging) { ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#d3dae6'; ctx.lineWidth = 1.5; D.roundRect(c.hx - 66, c.hy - 20 + 6, 132, 44, 14); ctx.stroke(); ctx.restore(); } });
      ctx.restore();
      dragW.items.forEach((c) => drawChip(c));
    } else if (done) {
      pill(400, CHIP_Y + 4, '수소와 산소 분자가 깨지고, 원자가 새로 짝지어 물 분자가 되었어요', { bg: '#1b2333', size: 15, pad: 14 });
    }
    // 완성된 단어식 (자유 탐구)
    const Wk = wordsOk();
    SLOT.forEach((s, i) => { const c = dragW.items.find((q) => q.slot === i); if (c) { /* 칩이 직접 그려짐 */ } });
  }
  function wordsDown(p) {
    const it = dragW.down(p);
    if (!it) return false;
    hideHint();
    it.wrong = false; if (it.slot >= 0) { it.slot = -1; }
    return true;
  }
  function wordsUp() {
    const it = dragW.up(); if (!it) return;
    let k = -1, bd = 1e9;
    SLOT.forEach((s, i) => { const d = Math.hypot(it.x - s.x, it.y - s.y); if (d < bd) { bd = d; k = i; } });
    if (bd < 74) {
      const old = dragW.items.find((c) => c.slot === k && c !== it);
      if (old) { old.slot = -1; old.tx = old.hx; old.ty = old.hy; old.wrong = false; }
      it.slot = k; it.tx = SLOT[k].x; it.ty = SLOT[k].y; it.pop = 1; Sound.tick();
    } else { it.slot = -1; it.tx = it.hx; it.ty = it.hy; }
  }
  SC.react = {
    enter() { reactUI(); },
    reset() { reactReset(); wordsReset(); },
    update: reactUpdate,
    draw: drawReact,
    down(p) { return RS.shown > 0.5 ? wordsDown(p) : false; },
    move(p) { dragW.move(p); },
    up: wordsUp,
    hover(p) { return RS.shown > 0.5 && dragW.hit(p) ? 'grab' : null; },
  };
  reactFill();

  /* =========================================================
     ② 원자 수 맞추기: H₂ + O₂ → H₂O  (분자 수를 +/−로 조절, 원자 수 막대 + 저울)
     ========================================================= */
  const SPEC = [
    { type: 'H2', name: '수소 분자', f: 'H2', col: '#3f6fe8' },
    { type: 'O2', name: '산소 분자', f: 'O2', col: '#d85a5a' },
    { type: 'H2O', name: '물 분자', f: 'H2O', col: '#0ea5a5' },
  ];
  const CARDX = [20, 260, 560], CARDY = 66, CARDH = 136, CARDW = 200;
  const BL = {
    n: [1, 1, 1],
    roll: [new RollDigit(1), new RollDigit(1), new RollDigit(1)],
    slot: [[], [], []],
    beam: new SciSim.Spring(0, { stiffness: 55, damping: 6 }),
    was: false, bubbleT: 0, flash: 0, pops: 0,
  };
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) BL.slot[i].push({ s: k < BL.n[i] ? 1 : 0, ph: rand(0, 6), rot: rand(-0.5, 0.5) });
  const counts = (n) => ({ LH: 2 * n[0], LO: 2 * n[1], RH: 2 * n[2], RO: n[2] });
  const isBal = (n) => { const c = counts(n); return (n[0] + n[1] + n[2]) > 0 && c.LH === c.RH && c.LO === c.RO; };
  const isSimple = (n) => n[0] === 2 && n[1] === 1 && n[2] === 2;
  function balSet(i, v) {
    v = clamp(v, 0, 4);
    if (v === BL.n[i]) return;
    BL.n[i] = v; BL.roll[i].set(v);
    Sound.tick();
    balUI();
  }
  function balReset() {
    BL.n = [1, 1, 1]; BL.roll.forEach((r) => { r.n = 1; r.old = 1; r.t = 1; });
    BL.slot.forEach((a, i) => a.forEach((s, k) => { s.s = k < 1 ? 1 : 0; }));
    BL.was = false; BL.beam.value = 0; BL.beam.velocity = 0;
    balUI();
  }
  function balUI() {
    for (let i = 0; i < 3; i++) {
      $('#stv' + i).textContent = BL.n[i];
      $('#stm' + i).disabled = BL.n[i] <= 0; $('#stp' + i).disabled = BL.n[i] >= 4;
    }
    const c = counts(BL.n);
    $('#balNote').innerHTML = isBal(BL.n) ? (isSimple(BL.n) ? '✅ 원자 수가 같아요! 계수는 가장 간단한 정수비예요.' : '원자 수는 같아요. 더 작은 수로도 맞출 수 있어요.') : '저울이 기울었어요. 원자 수가 같아지도록 분자 수를 바꿔요.';
  }
  [0, 1, 2].forEach((i) => {
    $('#stm' + i).addEventListener('click', () => balSet(i, BL.n[i] - 1));
    $('#stp' + i).addEventListener('click', () => balSet(i, BL.n[i] + 1));
  });

  function balUpdate(dt) {
    BL.roll.forEach((r) => r.update(dt));
    BL.slot.forEach((a, i) => a.forEach((s, k) => { const goal = k < BL.n[i] ? 1 : 0; s.s = SciSim.approach(s.s, goal, dt, 11); if (Math.abs(s.s - goal) < 0.002) s.s = goal; }));
    const c = counts(BL.n);
    const dH = c.LH - c.RH, dO = c.LO - c.RO, sum = dH + dO;
    let tgt = 0;
    if (dH !== 0 || dO !== 0) tgt = sum !== 0 ? -clamp(sum * 0.045, -0.3, 0.3) : -Math.sign(Math.abs(dO) >= Math.abs(dH) ? dO : dH) * 0.07;
    BL.beam.target = tgt; BL.beam.update(dt);
    const bal = isBal(BL.n);
    if (bal && !BL.was) { okFx(400, 330, COL.good, true); sfx.ding(); }
    BL.was = bal;
    BL.flash = Math.max(0, BL.flash - dt);
  }
  function drawBar(x, y, n, col, scale, label, sym) {
    ctx.fillStyle = '#eef2f8'; D.roundRect(x + 30, y - 11, 8 * scale + 6, 22, 11); ctx.fill();
    drawBall(sym, x + 14, y, sym === 'H' ? 9 : 11);
    const w = Math.max(0, n * scale);
    if (w > 0) { const g = ctx.createLinearGradient(0, y - 11, 0, y + 11); g.addColorStop(0, shade(col, 0.2)); g.addColorStop(1, col); ctx.fillStyle = g; D.roundRect(x + 33, y - 9, w, 18, 9); ctx.fill(); }
    txt(String(n), x + 33 + w + 16, y + 6, 16, COL.ink, 'center', 800);
  }
  function drawPan(cx, cy, H, O, t) {
    // 접시
    ctx.save();
    const g = ctx.createLinearGradient(cx - 70, 0, cx + 70, 0); g.addColorStop(0, '#cbd3e0'); g.addColorStop(0.5, '#f4f7fc'); g.addColorStop(1, '#aab6c9');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 72, cy - 4); ctx.quadraticCurveTo(cx - 60, cy + 16, cx, cy + 16); ctx.quadraticCurveTo(cx + 60, cy + 16, cx + 72, cy - 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8795ad'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // 원자 더미
    const list = []; for (let i = 0; i < H; i++) list.push('H'); for (let i = 0; i < O; i++) list.push('O');
    list.forEach((s, i) => {
      const row = Math.floor(i / 7), col = i % 7;
      const x = cx - 54 + col * 18 + (row % 2 ? 9 : 0), y = cy - 10 - row * 15;
      drawBall(s, x, y, s === 'H' ? 7.2 : 9);
    });
  }
  function drawBalance(t) {
    // 카드 3개
    for (let i = 0; i < 3; i++) {
      const x = CARDX[i], y = CARDY, S_ = SPEC[i];
      panel(x, y, CARDW, CARDH, 18, '#ffffff', 10, 3);
      ctx.save(); D.roundRect(x, y, CARDW, CARDH, 18); ctx.clip();
      ctx.fillStyle = rgba(S_.col, 0.07); ctx.fillRect(x, y, CARDW, CARDH); ctx.restore();
      // 분자들 (2×2)
      BL.slot[i].forEach((s, k) => {
        if (s.s < 0.01) return;
        const col = k % 2, row = Math.floor(k / 2);
        const mx = x + 54 + col * 92 + Math.sin(t * 1.6 + s.ph) * 2, my = y + 40 + row * 58 + Math.cos(t * 1.3 + s.ph) * 2;
        drawMolStatic(S_.type, mx, my, 27, s.rot + Math.sin(t + s.ph) * 0.1, Math.min(1, s.s * 1.5), s.s);
      });
      // 계수 + 화학식 (카드 위)
      const fw = formulaWidth(S_.f, 30);
      const gx = x + CARDW / 2 - (fw + 40) / 2;
      BL.roll[i].draw(gx + 14, y - 12, 34, BL.n[i] === 0 ? '#b6c0d0' : COL.sub, 'center');
      fml(S_.f, gx + 36, y - 12 + 11, 30, COL.ink, 'left');
      txt(S_.name, x + CARDW / 2, y + CARDH + 22, 14, COL.muted, 'center', 800);
    }
    txt('+', 240, CARDY + 80, 38, COL.muted, 'center', 800);
    D.arrow(482, CARDY + 68, 542, CARDY + 68, { color: '#8b5cf6', width: 6, head: 18 });
    // 저울
    const px = 400, py = 352, L = 140;
    const th = BL.beam.value;
    const c = counts(BL.n);
    ctx.save();
    ctx.fillStyle = '#9aa7ba'; ctx.beginPath(); ctx.moveTo(px - 30, 478); ctx.lineTo(px + 30, 478); ctx.lineTo(px + 10, py + 10); ctx.lineTo(px - 10, py + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7d8aa0'; D.roundRect(px - 56, 470, 112, 10, 5); ctx.fill();
    // 빔
    const lx = px - Math.cos(th) * L, ly = py - Math.sin(th) * L, rx = px + Math.cos(th) * L, ry = py + Math.sin(th) * L;
    const bg = ctx.createLinearGradient(0, py - 8, 0, py + 8); bg.addColorStop(0, '#d6dde9'); bg.addColorStop(1, '#8d99ad');
    ctx.strokeStyle = bg; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx + 4, ly - 3); ctx.lineTo(rx - 4, ry - 3); ctx.stroke();
    D.sphere(px, py, 10, '#5b6a82', { gloss: true });
    // 줄 + 접시
    const dropY = 70;
    [[lx, ly], [rx, ry]].forEach((e, k) => {
      ctx.strokeStyle = '#8795ad'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[0] - 56, e[1] + dropY); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[0] + 56, e[1] + dropY); ctx.stroke();
      D.sphere(e[0], e[1], 5, '#5b6a82', { gloss: false });
    });
    ctx.restore();
    drawPan(lx, ly + dropY, c.LH, c.LO, t);
    drawPan(rx, ry + dropY, c.RH, c.RO, t);
    txt('반응 전', lx, ly + dropY + 40, 14, COL.muted, 'center', 800);
    txt('반응 후', rx, ry + dropY + 40, 14, COL.muted, 'center', 800);
    // 막대 (원자 수)
    const scale = 12;
    txt('반응 전 원자 수', 20, 288, 15, COL.ink, 'left', 800);
    drawBar(14, 324, c.LH, '#8fa6d6', scale, '', 'H'); drawBar(14, 368, c.LO, '#ef6b6b', scale, '', 'O');
    txt('반응 후 원자 수', 566, 288, 15, COL.ink, 'left', 800);
    drawBar(560, 324, c.RH, '#8fa6d6', scale, '', 'H'); drawBar(560, 368, c.RO, '#ef6b6b', scale, '', 'O');
    // 비교 표시
    const mk = (ok, y) => { ctx.save(); ctx.fillStyle = ok ? 'rgba(20,160,88,.14)' : 'rgba(226,70,75,.12)'; D.roundRect(712, y - 14, 72, 28, 14); ctx.fill(); ctx.restore(); txt(ok ? '= 같아요' : '≠ 달라요', 748, y + 6, 14, ok ? COL.good : COL.bad, 'center', 800); };
    mk(c.LH === c.RH, 324); mk(c.LO === c.RO, 368);
    // 판정
    const bal = isBal(BL.n);
    if (bal) pill(400, 252, '✔ 저울이 수평! 원자의 종류와 수가 같아요', { bg: COL.good, size: 15, pad: 14 });
    else pill(400, 252, '원자 수가 달라 저울이 기울었어요', { bg: '#b4440f', size: 15, pad: 14 });
  }
  SC.balance = {
    enter() { balUI(); },
    reset: balReset,
    update: balUpdate,
    draw: drawBalance,
  };

  /* =========================================================
     ③ 반응식 완성: 단어 → 화학식 → 계수 → 1 생략 (3가지 반응)
     ========================================================= */
  const EQS = [
    { key: 'c', name: '탄소 연소', words: ['탄소', '산소', '이산화 탄소'], f: ['C', 'O2', 'CO2'], ops: ['+', '→'], sol: [1, 1, 1], start: [1, 1, 1], first: 0, el: ['C', 'O'], side: [0, 0, 1] },
    { key: 'w', name: '물 분해',   words: ['물', '수소', '산소'], f: ['H2O', 'H2', 'O2'], ops: ['→', '+'], sol: [2, 2, 1], start: [1, 1, 1], first: 2, el: ['H', 'O'], side: [0, 1, 1] },
    { key: 'n', name: '암모니아 생성', words: ['질소', '수소', '암모니아'], f: ['N2', 'H2', 'NH3'], ops: ['+', '→'], sol: [1, 3, 2], start: [1, 1, 1], first: 2, el: ['N', 'H'], side: [0, 0, 1] },
  ];
  const WS = EQS.map((e) => ({ coef: e.start.slice(), st: e.first, solved: false, morph: e.first >= 1 ? 1 : 0, omit: 0, enterT: 0, rolls: e.start.map((v) => new RollDigit(v)), slots: [0, 1, 2].map(() => Array.from({ length: 6 }, () => ({ s: 0, ph: rand(0, 6), rot: rand(-0.4, 0.4) }))) }));
  const WRI = { cur: 0 };
  const TX = [136, 400, 664];                      // 항(화학식) 가운데 x
  const atomsOf = (f, el) => { let n = 0; fparts(f).forEach((p) => { if (p[0] === el) n += p[1]; }); return n; };
  function wCounts(ei) {
    const E = EQS[ei], W = WS[ei], out = [];
    E.el.forEach((el) => {
      let L = 0, R = 0;
      E.f.forEach((f, i) => { const n = atomsOf(f, el) * W.coef[i]; if (E.side[i] === 0) L += n; else R += n; });
      out.push({ el, L, R });
    });
    return out;
  }
  const wBal = (ei) => wCounts(ei).every((c) => c.L === c.R);
  const wSimple = (ei) => EQS[ei].sol.every((v, i) => v === WS[ei].coef[i]);
  function wsRebuild(ei) {
    const W = WS[ei];
    W.slots.forEach((a, i) => a.forEach((s, k) => { s.s = k < W.coef[i] ? 1 : 0; }));
    W.rolls.forEach((r, i) => { r.n = W.coef[i]; r.old = W.coef[i]; r.t = 1; });
  }
  function writeReset(hard) {
    EQS.forEach((e, i) => { const W = WS[i]; W.coef = e.start.slice(); W.st = e.first; W.solved = false; W.morph = e.first >= 1 ? 1 : 0; W.omit = 0; wsRebuild(i); });
    writeUI();
  }
  function writeUI() {
    const W = WS[WRI.cur];
    $$('#eqSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.eq === WRI.cur));
    const b = $('#stageBtn');
    const lab = ['② 화학식으로 바꾸기 ▶', '③ 계수 맞추기 ▶', '✔ 계수 확인하기', '🎉 완성!'];
    b.textContent = lab[W.st]; b.disabled = W.st === 3;
    $('#writeNote').textContent = ['① 반응물과 생성물을 단어로 써요.', '② 물질을 화학식으로 바꿔요. 화학식은 바꾸면 안 돼요!', '③ 앞의 계수만 바꿔 양쪽 원자 수를 같게 해요.', '④ 계수가 1이면 생략해요.'][W.st];
  }
  $$('#eqSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); WRI.cur = +b.dataset.eq; writeUI(); }));
  $('#stageBtn').addEventListener('click', () => {
    Sound.click();
    const ei = WRI.cur, W = WS[ei];
    if (W.st === 0) { W.st = 1; tw(W, { morph: 1 }, 0.7, 'inOutCubic'); sfx.whoosh(); }
    else if (W.st === 1) { W.st = 2; W.enterT = 0; }
    else if (W.st === 2) { wCheck(ei, true); }
    writeUI();
  });
  function wCheck(ei, press) {
    const W = WS[ei];
    if (wBal(ei) && wSimple(ei)) { W.st = 3; W.solved = true; tw(W, { omit: 1 }, 0.8, 'outCubic'); okFx(400, 190, COL.good, true); sfx.ding(); writeUI(); }
    else if (press) {
      if (wBal(ei)) say(400, 130, '원자 수는 같지만, 더 작은 정수로 나타낼 수 있어요.', { bg: '#b4440f', maxW: 260 });
      else say(400, 130, '아직 양쪽 원자 수가 달라요. 계수를 바꿔 보세요!', { bg: '#b4440f', maxW: 260 });
      Sound.fail();
    }
  }
  function wSetCoef(ei, i, d) {
    const W = WS[ei];
    if (W.st !== 2) return;
    const v = clamp(W.coef[i] + d, 1, 6);
    if (v === W.coef[i]) return;
    W.coef[i] = v; W.rolls[i].set(v); Sound.tick();
    W.enterT = Math.max(W.enterT, 1.2);
  }
  function writeUpdate(dt) {
    const ei = WRI.cur, W = WS[ei];
    W.rolls.forEach((r) => r.update(dt));
    WS.forEach((w, e) => w.slots.forEach((a, i) => a.forEach((s, k) => { const goal = (w.st >= 1 && k < w.coef[i]) ? 1 : 0; s.s = SciSim.approach(s.s, goal, dt, 10); if (Math.abs(s.s - goal) < 0.002) s.s = goal; })));
    if (W.st === 2) { W.enterT += dt; if (W.enterT > 1.3 && wBal(ei) && wSimple(ei) && !W.solved) wCheck(ei, false); }
  }
  /* 계수 칸 (▲ 숫자 ▼) */
  function drawSpinner(cx, cy, W, i, active) {
    const a = W.st >= 2 ? 1 : 0;
    const omitted = W.omit > 0 && W.coef[i] === 1;
    const alpha = a * (omitted ? 1 - W.omit : 1);
    if (alpha < 0.02) return;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = active ? '#f3efff' : '#f2f5fb'; D.roundRect(cx - 24, cy - 40, 48, 80, 14); ctx.fill();
    ctx.strokeStyle = active ? 'rgba(139,92,246,.5)' : '#dde4ef'; ctx.lineWidth = 2; D.roundRect(cx - 24, cy - 40, 48, 80, 14); ctx.stroke();
    if (active) {
      const k = (now() * 4) % 2;
      ctx.fillStyle = COL.sub; ctx.beginPath(); ctx.moveTo(cx - 10, cy - 24); ctx.lineTo(cx + 10, cy - 24); ctx.lineTo(cx, cy - 36); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 10, cy + 24); ctx.lineTo(cx + 10, cy + 24); ctx.lineTo(cx, cy + 36); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 22, cy - 20, 44, 40); ctx.clip();
    W.rolls[i].draw(cx, cy + 12, 34, COL.sub, 'center');
    ctx.restore();
    ctx.restore();
  }
  function drawWrite(t) {
    const ei = WRI.cur, E = EQS[ei], W = WS[ei];
    // 단계 표시
    const labs = ['① 단어로', '② 화학식으로', '③ 계수 맞추기', '④ 1은 생략'];
    labs.forEach((l, i) => {
      const x = 130 + i * 180, done = W.st > i, cur = W.st === i;
      ctx.fillStyle = cur ? COL.sub : done ? COL.good : '#e4e9f2'; D.roundRect(x - 78, 22, 156, 36, 18); ctx.fill();
      txt((done ? '✔ ' : '') + l, x, 46, 15, cur || done ? '#fff' : '#8995a8', 'center', 800);
    });
    // 단어식 / 화학식
    const rowY = 160;
    panel(20, 76, 760, 190, 20, '#ffffff', 10, 3);
    const mo = W.morph;
    for (let i = 0; i < 3; i++) {
      const cx = TX[i];
      // 단어
      ctx.save(); ctx.globalAlpha = 1 - mo; txt(E.words[i], cx, rowY + 8, 24, COL.ink, 'center', 800); ctx.restore();
      // 화학식 + 계수
      if (mo > 0.02) {
        ctx.save(); ctx.globalAlpha = mo;
        const fw = formulaWidth(E.f[i], 38);
        const showCoef = W.st >= 2;
        const omitted = W.omit > 0 && W.coef[i] === 1;
        const space = showCoef ? (omitted ? 54 * (1 - W.omit) : 54) : 0;
        const gx = cx - (fw + space) / 2;
        if (showCoef) drawSpinner(gx + 24 - 0, rowY, W, i, W.st === 2);
        fml(E.f[i], gx + space, rowY + 14, 38, COL.ink, 'left');
        ctx.restore();
      }
    }
    // 연산 기호
    const sym = (s, x) => { if (s === '+') txt('+', x, rowY + 12, 36, COL.muted, 'center', 800); else D.arrow(x - 26, rowY, x + 26, rowY, { color: '#8b5cf6', width: 5, head: 16 }); };
    sym(E.ops[0], 268); sym(E.ops[1], 532);
    // 분자 그림
    const MT = { C: 'C', O2: 'O2', CO2: 'CO2', H2O: 'H2O', H2: 'H2', NH3: 'NH3', N2: 'N2' };
    for (let i = 0; i < 3; i++) {
      const n = Math.max(1, W.coef[i]), rows = Math.ceil(n / 3);
      W.slots[i].forEach((s, k) => {
        if (s.s < 0.01) return;
        const r = Math.floor(k / 3), cnt = r < rows - 1 ? 3 : n - 3 * (rows - 1);
        const dx = (k % 3 - (Math.max(1, cnt) - 1) / 2) * 68;
        const mx = TX[i] + dx + Math.sin(t * 1.5 + s.ph) * 1.5, my = (rows === 1 ? 238 : 224 + r * 28) + Math.cos(t * 1.2 + s.ph) * 1.5;
        drawMolStatic(MT[E.f[i]], mx, my, 20, s.rot + Math.sin(t + s.ph) * 0.1, Math.min(1, s.s * 1.5), s.s);
      });
    }
    // 원자 수 표
    const cnt = wCounts(ei);
    panel(20, 282, 760, 188, 20, '#ffffff', 10, 3);
    txt('원자 수 세어 보기', 400, 310, 17, COL.ink, 'center', 800);
    txt('반응 전', 200, 340, 14, COL.muted, 'center', 800); txt('반응 후', 600, 340, 14, COL.muted, 'center', 800);
    cnt.forEach((c, k) => {
      const y = 376 + k * 46, ok = c.L === c.R;
      const show = W.st >= 1 ? 1 : 0;
      ctx.save(); ctx.globalAlpha = show;
      ctx.fillStyle = ok ? 'rgba(20,160,88,.10)' : 'rgba(226,70,75,.10)'; D.roundRect(110, y - 20, 580, 40, 20); ctx.fill();
      drawBall(c.el, 400, y, c.el === 'H' ? 10 : 13);
      txt(c.L + '개', 200, y + 7, 20, COL.ink, 'center', 800); txt(c.R + '개', 600, y + 7, 20, COL.ink, 'center', 800);
      txt(ok ? '= ✔' : '≠ ✗', 470, y + 6, 18, ok ? COL.good : COL.bad, 'left', 800);
      txt(EL[c.el].name + ' 원자', 340, y + 6, 14, COL.muted, 'right', 800);
      ctx.restore();
    });
    if (W.st < 1) txt('화학식으로 바꾸면 원자 수를 셀 수 있어요', 400, 400, 15, '#8995a8', 'center', 700);
    if (W.st === 2) { const bal = wBal(ei); if (bal && !wSimple(ei)) pill(400, 448, '더 작은 정수로 나타낼 수 있어요', { bg: '#b4440f', size: 14, pad: 12 }); }
    if (W.st === 3) pill(400, 448, '🎉 ' + EQS[ei].eqStr, { bg: COL.good, size: 16, pad: 16 });
  }
  EQS[0].eqStr = 'C + O₂ → CO₂ 완성!'; EQS[1].eqStr = '2H₂O → 2H₂ + O₂ 완성!'; EQS[2].eqStr = 'N₂ + 3H₂ → 2NH₃ 완성!';
  SC.write = {
    enter() { writeUI(); },
    reset: writeReset,
    update: writeUpdate,
    draw: drawWrite,
    down(p) {
      const ei = WRI.cur, E = EQS[ei], W = WS[ei];
      if (W.st !== 2) return false;
      for (let i = 0; i < 3; i++) {
        const fw = formulaWidth(E.f[i], 38), gx = TX[i] - (fw + 54) / 2, cx = gx + 24;
        if (Math.abs(p.x - cx) < 30) {
          if (p.y > 160 - 46 && p.y < 160) { wSetCoef(ei, i, +1); return false; }
          if (p.y >= 160 && p.y < 160 + 46) { wSetCoef(ei, i, -1); return false; }
        }
      }
      return false;
    },
    hover(p) { return WS[WRI.cur].st === 2 ? 'pointer' : null; },
  };

  /* =========================================================
     ④ 계수의 비 = 분자 수의 비:  2H₂ + O₂ → 2H₂O  (수소 6개 + 산소 □개)
     ========================================================= */
  const TC = { x: 16, y: 56, w: 352, h: 262 }, TR = { x: 432, y: 56, w: 352, h: 262 };
  const tcBox = { x: TC.x + 24, y: TC.y + 34, w: TC.w - 48, h: TC.h - 56 };
  const trBox = { x: TR.x + 24, y: TR.y + 34, w: TR.w - 48, h: TR.h - 56 };
  const sysT = new Sys(); sysT.sc = 25;
  const RT = { o2: 1, st: 'idle', ran: false, water: 0, usedH: 0, usedO: 0, leftH: 6, leftO: 1, groups: 0, nDone: 0, ring: 0 };
  const RD = { uH: new RollDigit(0), uO: new RollDigit(0), uW: new RollDigit(0), lH: new RollDigit(6), lO: new RollDigit(1) };
  const WSLOTS = [0, 1, 2, 3, 4, 5].map((i) => ({ x: TR.x + 76 + (i % 3) * 100, y: TR.y + 96 + Math.floor(i / 3) * 100 }));
  function ratioFill(pop) {
    sysT.clear(); clearLater();
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push(['H2', tcBox.x + 40 + (i % 3) * 82 + rand(-6, 6), tcBox.y + 36 + Math.floor(i / 3) * 70 + rand(-6, 6)]);
    for (let i = 0; i < RT.o2; i++) pts.push(['O2', tcBox.x + 30 + (i % 4) * 70 + rand(-6, 6), tcBox.y + 4 + 120 + Math.floor(i / 4) * 0 + rand(-4, 4)]);
    pts.forEach((q, i) => {
      const m = sysT.addMol(q[0], q[1], q[2], { mode: 'gas', speed: 30, box: tcBox, sc: 25, rot: rand(0, 6), scl: pop ? 0.01 : 1 });
      if (pop) tw(m, { scl: 1 }, 0.5, 'outBack', { delay: i * 0.04, essential: true });
    });
    RT.st = 'idle'; RT.ran = false; RT.water = 0; RT.usedH = 0; RT.usedO = 0; RT.leftH = 6; RT.leftO = RT.o2; RT.nDone = 0; RT.ring = 0;
    syncRoll();
  }
  function syncRoll() { RD.uH.set(RT.usedH); RD.uO.set(RT.usedO); RD.uW.set(RT.water); RD.lH.set(RT.leftH); RD.lO.set(RT.leftO); }
  function ratioReset() { ratioFill(true); ratioUI(); }
  function ratioUI() {
    $('#o2v').textContent = RT.o2;
    $('#o2m').disabled = RT.st === 'run' || RT.o2 <= 0; $('#o2p').disabled = RT.st === 'run' || RT.o2 >= 6;
    const b = $('#runBtn');
    b.disabled = RT.st === 'run';
    b.textContent = RT.st === 'run' ? '⏳ 반응 중…' : RT.st === 'done' ? '↻ 다시 반응시키기' : '⚡ 반응 시작';
    $('#ratioNote').textContent = RT.st === 'done' ? (RT.leftH + RT.leftO === 0 ? '✅ 남는 분자 없이 모두 반응했어요!' : '남은 분자가 있어요. 산소 분자 수를 바꿔 다시 해 봐요.') : '수소 분자는 6개예요. 산소 분자를 몇 개 넣어야 모두 반응할까요?';
  }
  $('#o2m').addEventListener('click', () => { if (RT.st === 'run') return; RT.o2 = Math.max(0, RT.o2 - 1); Sound.tick(); ratioFill(true); ratioUI(); });
  $('#o2p').addEventListener('click', () => { if (RT.st === 'run') return; RT.o2 = Math.min(6, RT.o2 + 1); Sound.tick(); ratioFill(true); ratioUI(); });
  function ratioRun() {
    if (RT.st === 'run') return;
    if (RT.st === 'done') ratioFill(false);
    RT.st = 'run'; hideHint(); sfx.zap();
    const hs = sysT.mols.filter((m) => m.type === 'H2'), os = sysT.mols.filter((m) => m.type === 'O2');
    const g = Math.min(Math.floor(hs.length / 2), os.length);
    RT.groups = g; RT.nDone = 0;
    if (g === 0) { later(0.5, () => { ratioFinish(); }); say(TC.x + TC.w / 2, TC.y + 70, '산소가 없으면 반응하지 않아요!', { bg: '#b4440f', maxW: 220 }); return; }
    for (let k = 0; k < g; k++) {
      const ins = [hs[2 * k], hs[2 * k + 1], os[k]];
      later(k * 0.85, () => {
        const at = { x: TC.x + TC.w * (0.2 + 0.3 * k), y: TC.y + TC.h * 0.52 };
        react(sysT, {
          ins, at, gather: 0.8, shake: 0.5, spread: 0.8,
          onFlash(p) { FX.burst(p.x, p.y, { count: 14, speed: 150, life: 0.7, size: 3.6, colors: ['#fff6c2', '#ffd23f', '#ff9f3a'], shape: 'star', gravity: 0 }); sfx.pop(); },
          outs: [0, 1].map((j) => ({ type: 'H2O', sx: at.x, sy: at.y, cx: WSLOTS[2 * k + j].x, cy: WSLOTS[2 * k + j].y, rot: rand(-0.4, 0.4), move: 1.3,
            after: (m) => { m.mode = 'liquid'; m.ax = m.cx; m.ay = m.cy; m.amp = 3; } })),
          onDone() {
            RT.nDone++; RT.water += 2; RT.usedH += 2; RT.usedO += 1; syncRoll(); Sound.tick();
            if (RT.nDone >= g) ratioFinish();
          },
        });
      });
    }
    ratioUI();
  }
  function ratioFinish() {
    RT.st = 'done'; RT.ran = true;
    RT.leftH = 6 - RT.usedH; RT.leftO = RT.o2 - RT.usedO; syncRoll();
    // 남은 분자: 왼쪽 상자에 계속 떠다니게
    if (RT.leftH + RT.leftO === 0 && RT.water > 0) okFx(TR.x + TR.w / 2, TR.y + 34, COL.good, true);
    sfx.ding(); ratioUI();
  }
  $('#runBtn').addEventListener('click', () => { Sound.click(); ratioRun(); });

  function ratioUpdate(dt) {
    sysT.update(dt);
    Object.keys(RD).forEach((k) => RD[k].update(dt));
    RT.ring += dt;
  }
  function drawRow(y, label, mol, a, b, c, rdB, rdC, colv) {
    ctx.fillStyle = '#f4f7fc'; D.roundRect(24, y - 18, 480, 34, 12); ctx.fill();
    drawMolStatic(mol, 52, y - 1, 11, 0, 1, 1);
    txt(label, 82, y + 5, 15, COL.ink, 'left', 800);
    txt(a == null ? '–' : a + '개', 300, y + 6, 17, COL.muted, 'center', 800);
    if (rdB) rdB.draw(396, y + 7, 20, COL.sub, 'center'); else txt('–', 396, y + 6, 17, COL.muted, 'center', 800);
    if (rdC) rdC.draw(468, y + 7, 20, colv, 'center'); else txt('–', 468, y + 6, 17, COL.muted, 'center', 800);
  }
  function drawRatio(t) {
    chamber(TC, '반응 전', '#3f6fe8'); chamber(TR, '반응 후', '#0ea5a5');
    D.arrow(372, TC.y + TC.h / 2, 428, TC.y + TC.h / 2, { color: '#8b5cf6', width: 7, head: 20 });
    // 물 분자 자리 표시
    if (RT.st !== 'done' || RT.water === 0) {
      ctx.save(); ctx.globalAlpha = 0.18;
      WSLOTS.forEach((p) => drawMolStatic('H2O', p.x, p.y, 25, 0, 0.6));
      ctx.restore();
    }
    sysT.draw();
    // 남은 분자 강조
    if (RT.st === 'done') {
      sysT.mols.forEach((m) => {
        if (m.box !== tcBox) return;
        const a = 0.5 + 0.5 * Math.sin(RT.ring * 6);
        ctx.save(); ctx.strokeStyle = rgba(COL.bad, 0.4 + 0.5 * a); ctx.lineWidth = 3; ctx.setLineDash([6, 5]); circle(ctx, m.cx, m.cy, 36); ctx.stroke(); ctx.restore();
      });
      if (sysT.mols.some((m) => m.box === tcBox)) pill(TC.x + TC.w / 2, TC.y + TC.h + 14, '빨간 점선 = 남은 분자', { bg: COL.bad, size: 13, pad: 10 });
    }
    // 표
    panel(16, 346, 512, 142, 16, '#ffffff', 10, 3);
    txt('분자 수', 82, 368, 13, COL.muted, 'left', 800); txt('처음', 300, 368, 14, COL.muted, 'center', 800); txt('반응 · 생성', 396, 368, 13, COL.muted, 'center', 800); txt('남은 수', 468, 368, 13, COL.muted, 'center', 800);
    drawRow(394, '수소 분자 H₂', 'H2', 6, 0, 0, RD.uH, RD.lH, RT.leftH > 0 && RT.st === 'done' ? COL.bad : COL.muted);
    drawRow(430, '산소 분자 O₂', 'O2', RT.o2, 0, 0, RD.uO, RD.lO, RT.leftO > 0 && RT.st === 'done' ? COL.bad : COL.muted);
    drawRow(466, '물 분자 H₂O', 'H2O', 0, 0, null, RD.uW, null, COL.muted);
    // 비 카드
    panel(544, 346, 240, 134, 16, RT.st === 'done' && RT.water > 0 ? '#f3efff' : '#ffffff', 10, 3);
    if (RT.st === 'done' && RT.water > 0) {
      txt('반응한 분자 수의 비', 664, 372, 14, COL.sub, 'center', 800);
      txt('H₂ : O₂ : H₂O', 664, 398, 15, COL.muted, 'center', 800);
      txt(RT.usedH + ' : ' + RT.usedO + ' : ' + RT.water, 664, 434, 28, COL.ink, 'center', 800);
      const g = RT.usedO || 1;
      txt('= ' + (RT.usedH / g) + ' : ' + (RT.usedO / g) + ' : ' + (RT.water / g) + ' (계수의 비)', 664, 464, 15, COL.good, 'center', 800);
    } else {
      txt('반응하면 분자 수의 비를', 664, 410, 14, COL.muted, 'center', 700); txt('여기서 확인해요', 664, 432, 14, COL.muted, 'center', 700);
    }
  }
  SC.ratio = {
    enter() { ratioUI(); },
    reset: ratioReset,
    update: ratioUpdate,
    draw: drawRatio,
  };
  ratioFill(false);

  /* =========================================================
     포인터 · 미션 · 루프
     ========================================================= */
  const SP = (p) => ({ x: p.x, y: p.y + YS });
  SciSim.pointer(view, {
    hover(p) { const s = SC[S.scene]; return s && s.hover ? s.hover(SP(p)) : null; },
    down(p, e) { hideHint(); const s = SC[S.scene]; if (s && s.down && s.down(SP(p), e)) { DR.fn = s; return true; } return false; },
    move(p, e) { if (DR.fn && DR.fn.move) DR.fn.move(SP(p), e); },
    up(p, e) { const s = DR.fn; DR.fn = null; if (s && s.up) s.up(SP(p), e); },
  });
  if (window.matchMedia && window.matchMedia('(max-width: 599px)').matches) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0]; if (!tc) return;
      const p = SP(view.toLocal(tc));
      if (S.scene === 'react' && RS.shown > 0.5 && dragW.hit(p)) e.preventDefault();
      if (S.scene === 'write' && WS[WRI.cur].st === 2) e.preventDefault();
    }, { passive: false });
  }
  function update(dt) {
    S.sceneT += dt;
    const s = SC[S.scene];
    if (s && s.update) s.update(dt);
  }
  function draw(t, dt) {
    const s = SC[S.scene];
    if (s && s.draw) s.draw(t, dt);
    if (S.sceneT < 0.3) { ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.3); ctx.fillStyle = BG; ctx.fillRect(0, YS, VW, VH); ctx.restore(); }
  }

  const chip = (ok, s) => mark(ok) + ' ' + s;
  /* 퀴즈 그림용 작은 분자 SVG */
  function svgMol(type, ox, oy, sc) {
    const tpl = TPL[type]; let out = '';
    tpl.b.forEach((b) => { const A = tpl.a[b[0]], B = tpl.a[b[1]]; out += '<line x1="' + (ox + A[1] * sc).toFixed(1) + '" y1="' + (oy + A[2] * sc).toFixed(1) + '" x2="' + (ox + B[1] * sc).toFixed(1) + '" y2="' + (oy + B[2] * sc).toFixed(1) + '" stroke="#9aa7ba" stroke-width="' + (sc * 0.22).toFixed(1) + '" stroke-linecap="round"/>'; });
    tpl.a.forEach((a) => { const e = EL[a[0]]; out += '<circle cx="' + (ox + a[1] * sc).toFixed(1) + '" cy="' + (oy + a[2] * sc).toFixed(1) + '" r="' + (e.r * sc).toFixed(1) + '" fill="' + e.c + '" stroke="' + (e.edge || shade(e.c, -0.3)) + '" stroke-width="1"/>'; });
    return out;
  }
  const FIG_CH4 = '<svg viewBox="0 0 380 110" width="360" height="104" role="img" aria-label="메테인 한 분자와 산소 두 분자가 반응해 이산화 탄소 한 분자와 물 두 분자가 생기는 모형"><g>' +
    svgMol('CH4', 36, 54, 17) + '<text x="78" y="62" font-size="22" font-weight="800" fill="#5d6879">+</text>' + svgMol('O2', 120, 54, 17) + svgMol('O2', 170, 54, 17) +
    '<path d="M205 54 h22 m-7 -7 l7 7 l-7 7" stroke="#8b5cf6" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    svgMol('CO2', 270, 54, 17) + '<text x="304" y="62" font-size="22" font-weight="800" fill="#5d6879">+</text>' + svgMol('H2O', 336, 48, 15) +
    '</g><text x="190" y="102" text-anchor="middle" font-size="12.5" font-weight="800" fill="#5d6879">(그림은 메테인 1개, 산소 2개, 이산화 탄소 1개, 물 1개만 그렸어요)</text></svg>';
  const tbl = (head, rows) => '<table><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';

  function writeResetOne(i) { const e = EQS[i], W = WS[i]; W.coef = e.start.slice(); W.st = e.first; W.solved = false; W.morph = e.first >= 1 ? 1 : 0; W.omit = 0; wsRebuild(i); }

  game = SciSim.game({
    simId: 'm3-chemical-equation',
    mount: '#game',
    badge: '반응식 요리사',
    homeHref: '../../index.html#g3',
    featureLabels: {
      react: '💥 반응 용기와 단어식',
      balance: '⚖️ 분자 수 조절 · 원자 저울',
      write: '🧩 반응식 4단계 작성대',
      ratio: '🔢 분자 수 비교 상자',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onHint(m) { if (m.focus) pulseEl(m.focus); },
    onMissionStart(m) { if (m.scene) setScene(m.scene, false); },
    onComplete() { RS.words = true; refreshUI(); },
    levels: [
      {
        title: '반응 모형', short: '반응 모형', icon: '💥', phase: '모형',
        features: ['react'],
        intro: '<p class="si-q">❓ 탐구 질문: 화학 반응을 누구나 알아볼 수 있게 기호로 간단히 나타내려면 어떻게 해야 할까?</p>' +
          '<p>먼저 <b>수소</b>와 <b>산소</b>가 반응해 <b>물</b>이 되는 모습을 분자 모형으로 관찰하고, 말로 된 식(<b>단어식</b>)으로 써 봐요.</p>' +
          '<p>앞 차시에서 화학 변화는 <b>원자의 배열이 바뀌는 것</b>이었죠?</p>',
        setup() { setScene('react', true); },
        recap: '화학 반응에서는 반응물의 분자가 깨지고 원자가 다시 결합해 생성물이 돼요. 수소 + 산소 → 물.',
        summary: '<span class="formula" style="font-size:15px">수소 + 산소 → 물<br>(반응물)　　　(생성물)</span>' +
          '<ul><li>반응물: 반응하는 물질 (화살표 왼쪽)</li><li>생성물: 반응해서 새로 생긴 물질 (화살표 오른쪽)</li><li>수소 분자(H₂)·산소 분자(O₂)가 깨지고 원자가 다시 결합해 물 분자(H₂O)가 돼요.</li></ul>',
        missions: [
          {
            title: '수소와 산소를 반응시키기', scene: 'react', focus: '#igniteBtn',
            goal: '수소 분자와 산소 분자가 든 용기에 ⚡ 점화해서 물 분자가 만들어지는 모습을 관찰하세요.',
            hint: '⚡ 점화하기 버튼을 눌러요. 분자가 깨지고 원자가 새로 결합하는 모습을 잘 보세요.',
            setup() { setScene('react', true); RS.words = false; wordsReset(); reactReset(); },
            check: () => RS.st === 'done', hold: 0.6,
            status: () => '점화 ' + mark(RS.st !== 'idle') + ' · 물 분자 생성 ' + mark(RS.st === 'done'),
            explain: '수소 분자(H₂)와 산소 분자(O₂)의 결합이 끊어지고, <b>원자가 다시 짝지어</b> 물 분자(H₂O) 2개가 만들어졌어요. 원자는 새로 생기거나 없어지지 않고 <b>배열만 바뀌었어요</b>.',
          },
          {
            title: '단어식으로 나타내기', scene: 'react', manual: true,
            goal: '낱말 카드를 끌어 빈칸을 채워 단어식을 완성하고 ✔ 확인하기를 눌러요.',
            hint: '화살표 왼쪽엔 반응한 물질(반응물) 두 가지, 오른쪽엔 새로 생긴 물질(생성물)이에요.',
            setup() { setScene('react', true); RS.words = true; wordsReset(); if (RS.st !== 'done') reactReset(); },
            check: () => {
              const W = wordsOk();
              if (!W.filled) return '빈칸 세 곳을 모두 채워 주세요.';
              if (W.ok) return true;
              dragW.items.forEach((c) => { if (c.slot >= 0 && !c.wrong) { const good = (c.slot < 2 && (c.word === '수소' || c.word === '산소')) || (c.slot === 2 && c.word === '물'); if (!good) { c.wrong = true; c.shake = 1; } } });
              return '반응물(수소, 산소)은 왼쪽, 생성물(물)은 오른쪽이에요. 빨간 테두리 카드를 다시 놓아 보세요.';
            },
            explain: '<b>수소 + 산소 → 물</b>. 화살표(→) 왼쪽은 <b>반응물</b>, 오른쪽은 <b>생성물</b>이에요. 화살표는 “반응해서 ~이(가) 된다”는 뜻이에요.',
          },
          {
            type: 'quiz', title: '반응물과 생성물', scene: 'react',
            goal: '“수소 + 산소 → 물”에서 반응물과 생성물을 바르게 짝지은 것은?',
            choices: ['반응물: 수소, 산소 / 생성물: 물', '반응물: 물 / 생성물: 수소, 산소', '반응물: 수소 / 생성물: 산소, 물', '반응물: 수소, 산소, 물 / 생성물: 없음'],
            answer: 0,
            feedback: ['', '물이 새로 생긴 물질이에요. 화살표 오른쪽이 생성물이에요.', '산소도 반응해서 없어지는 물질이에요.', '반응 후에 새로 생긴 물질이 생성물이에요.'],
            explain: '반응해서 없어지는 물질은 <b>반응물</b>(수소, 산소), 새로 만들어지는 물질은 <b>생성물</b>(물)이에요.',
          },
        ],
      },
      {
        title: '원자 수 맞추기', short: '원자 수 맞추기', icon: '⚖️', phase: '탐구',
        features: ['balance'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수소 + 산소 → 물을 단어로 나타냈어요. 이제 <b>분자 모형을 몇 개씩</b> 쓰는지까지 나타내 봐요.</div>' +
          '<p>화학 반응에서는 원자가 <b>사라지거나 새로 생기지 않아요</b>. 반응 전과 후의 <b>원자 수가 같아지도록</b> 분자 수를 맞춰 저울을 수평으로 만들어 봐요.</p>',
        setup() { setScene('balance', true); },
        recap: '반응 전후에 원자의 종류와 수가 같도록 화학식 앞의 수(계수)를 맞춰요. 화학식은 바꾸면 안 돼요.',
        summary: '<span class="formula" style="font-size:15px">2H₂ + O₂ → 2H₂O</span>' +
          '<ul><li>반응 전: H 원자 4개, O 원자 2개 → 반응 후: H 원자 4개, O 원자 2개</li><li>맞추는 것은 화학식 앞의 수, <b>계수</b>뿐이에요.</li><li>화학식(H₂O)을 바꾸면 다른 물질이 돼요.</li></ul>',
        missions: [
          {
            title: '저울을 수평으로', scene: 'balance',
            goal: 'H₂, O₂, H₂O 분자 수를 조절해 반응 전후의 H와 O 원자 수를 같게 만드세요. 계수는 가장 작은 정수로!',
            hint: '지금은 산소(O) 원자가 반응 전에 더 많아요. 물 분자를 늘리면 O가 늘지만 H도 같이 늘어요. H₂도 함께 맞춰 보세요.',
            setup() { setScene('balance', true); balReset(); },
            check: () => isBal(BL.n) && isSimple(BL.n), hold: 0.9,
            status: () => { const c = counts(BL.n); return 'H ' + c.LH + '↔' + c.RH + ' ' + mark(c.LH === c.RH) + ' · O ' + c.LO + '↔' + c.RO + ' ' + mark(c.LO === c.RO) + ' · 계수 ' + BL.n.join(' : '); },
            explain: '<b>H₂ 2개, O₂ 1개, H₂O 2개</b>일 때 반응 전 H 4개·O 2개, 반응 후 H 4개·O 2개로 같아져요. 이것을 <b>2H₂ + O₂ → 2H₂O</b>로 나타내요. 화학식 앞의 수 2, 1, 2가 <b>계수</b>예요.',
          },
          {
            type: 'quiz', title: 'H₂O₂로 바꾸면 안 될까?', scene: 'balance',
            goal: '산소 원자 수를 맞추려고 H₂O를 H₂O₂로 바꾸면 안 되는 까닭은?',
            choices: ['H₂O₂는 물과 다른 물질이라서, 화학식은 그대로 두고 계수만 맞춰야 한다.', '화학식의 아래 숫자는 마음대로 바꿔도 되지만 계수는 바꾸면 안 된다.', 'H₂O₂는 원자가 너무 많아 저울에 올릴 수 없다.', '산소 원자가 늘어나면 수소 원자가 줄어들기 때문이다.'],
            answer: 0,
            feedback: ['', '반대예요. 화학식의 아래 숫자를 바꾸면 다른 물질이 돼요. 계수만 바꿀 수 있어요.', '저울에 올릴 수 있는지의 문제가 아니에요.', '원자 수는 서로 영향을 주지 않아요. 물질이 달라지는 게 문제예요.'],
            explain: 'H₂O₂는 <b>과산화 수소</b>라는 다른 물질이에요. 반응식을 맞출 때는 <b>화학식은 그대로 두고 계수만</b> 바꿔요.',
          },
        ],
      },
      {
        title: '반응식 완성', short: '반응식 완성', icon: '🧩', phase: '설명',
        features: ['write'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 계수를 맞춰 원자 수를 같게 했어요. 이제 이 과정을 <b>4단계</b>로 정리해서 여러 반응의 화학 반응식을 직접 완성해 봐요.</div>' +
          '<p>① 단어로 → ② 화학식으로 → ③ 계수 맞추기 → ④ 1은 생략</p>',
        setup() { setScene('write', true); },
        recap: '반응식은 단어 → 화학식 → 계수 맞추기 → 계수 1 생략 순서로 완성해요.',
        summary: '<ol><li>반응물과 생성물을 <b>단어</b>로 쓴다.</li><li>각 물질을 <b>화학식</b>으로 바꾼다.</li><li>양쪽 원자 수가 같도록 <b>계수</b>를 맞춘다.</li><li>계수가 <b>1이면 생략</b>한다.</li></ol>' +
          '<span class="formula" style="font-size:15px">C + O₂ → CO₂<br>2H₂O → 2H₂ + O₂<br>N₂ + 3H₂ → 2NH₃</span>',
        missions: [
          {
            title: '탄소의 연소 반응식', scene: 'write', focus: '#stageBtn',
            goal: '“탄소 + 산소 → 이산화 탄소”를 4단계로 반응식으로 완성해 보세요.',
            hint: '버튼으로 단계를 넘겨요. 계수 단계에서는 양쪽의 C, O 원자 수를 세어 보세요.',
            setup() { setScene('write', true); WRI.cur = 0; writeResetOne(0); writeUI(); },
            check: () => WS[0].solved && WS[0].st === 3, hold: 0.8,
            status: () => ['① 단어', '② 화학식', '③ 계수', '④ 1 생략'].map((s, i) => chip(WS[0].st > i, s)).join(' · '),
            explain: '<b>C + O₂ → CO₂</b>. 탄소 1개, 산소 2개가 양쪽에 모두 있어서 계수가 모두 1이에요. <b>계수가 1이면 쓰지 않아요.</b>',
          },
          {
            title: '두 가지 반응식 더 완성하기', scene: 'write', focus: '#eqSeg',
            goal: '“물 분해”와 “암모니아 생성” 반응식의 계수를 맞춰 완성하세요.',
            hint: '계수 칸의 ▲▼를 눌러 숫자를 바꿔요. 물 분해는 H₂O 앞과 H₂ 앞이 같아야 해요. 암모니아는 H가 6개 필요해요.',
            setup() { setScene('write', true); WRI.cur = 1; writeResetOne(1); writeResetOne(2); writeUI(); },
            check: () => WS[1].solved && WS[2].solved, hold: 0.8,
            status: () => chip(WS[1].solved, '물 분해') + ' · ' + chip(WS[2].solved, '암모니아 생성'),
            explain: '<b>2H₂O → 2H₂ + O₂</b> (H 4개, O 2개)와 <b>N₂ + 3H₂ → 2NH₃</b> (N 2개, H 6개)로 양쪽 원자 수가 같아요. 계수 1은 생략해요.',
          },
          {
            type: 'quiz', title: '반응식을 쓰는 순서', scene: 'write',
            goal: '화학 반응식을 완성하는 순서로 알맞은 것은?',
            choices: ['단어로 쓰기 → 화학식으로 바꾸기 → 계수 맞추기 → 계수 1은 생략하기', '계수 맞추기 → 단어로 쓰기 → 화학식으로 바꾸기', '화학식으로 바꾸기 → 화학식 아래 숫자를 바꿔 원자 수 맞추기', '원자 수 세기 → 화학식을 바꿔 원자 수 맞추기 → 단어로 쓰기'],
            answer: 0,
            feedback: ['', '계수는 화학식이 정해진 다음에 맞춰요.', '화학식의 아래 숫자는 바꾸면 안 돼요. 계수만 바꿔요.', '화학식을 바꾸면 다른 물질이 돼요.'],
            explain: '단어 → 화학식 → <b>계수 맞추기</b> → 1 생략 순서예요. 화학식은 그 물질의 고유한 표현이라 바꾸지 않아요.',
          },
        ],
      },
      {
        title: '계수의 비', short: '계수의 비', icon: '🔢', phase: '적용',
        features: ['ratio'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 2H₂ + O₂ → 2H₂O처럼 반응식을 완성했어요. 그럼 <b>계수 2 : 1 : 2</b>는 무슨 뜻일까요?</div>' +
          '<p>수소 분자 <b>6개</b>와 산소 분자를 반응시켜 보며, 계수의 비가 <b>입자(분자) 수의 비</b>임을 확인해요.</p>',
        setup() { setScene('ratio', true); },
        recap: '화학 반응식에서 계수의 비는 반응하는 입자(분자) 수의 비와 같아요.',
        summary: '<span class="formula" style="font-size:15px">2H₂ + O₂ → 2H₂O<br>분자 수의 비 = 2 : 1 : 2</span>' +
          '<ul><li>수소 6개 + 산소 3개 → 물 6개 (모두 반응)</li><li>수소 6개 + 산소 5개 → 물 6개, 산소 2개 남음</li><li>CH₄ + 2O₂ → CO₂ + 2H₂O: 메테인 1 : 산소 2 : 이산화 탄소 1 : 물 2</li></ul>',
        missions: [
          {
            title: '남김없이 반응시키기', scene: 'ratio', focus: '#o2p',
            goal: '수소 분자 6개와 산소 분자를 반응시켜요. 남는 분자 없이 모두 반응하려면 산소 분자가 몇 개 필요할까요?',
            hint: '2H₂ + O₂ → 2H₂O에서 수소 2개마다 산소 1개가 필요해요. 수소 6개면 산소는 몇 개일까요?',
            setup() { setScene('ratio', true); RT.o2 = 1; ratioReset(); },
            check: () => RT.ran && RT.st === 'done' && RT.leftH === 0 && RT.leftO === 0 && RT.water === 6, hold: 0.9,
            status: () => '산소 ' + RT.o2 + '개 · ' + (RT.st === 'done' ? '남은 분자 ' + (RT.leftH + RT.leftO) + '개 · 물 ' + RT.water + '개' : '반응 전'),
            explain: '수소 분자 6개와 산소 분자 3개가 모두 반응해 물 분자 6개가 생겼어요. 분자 수의 비 <b>6 : 3 : 6 = 2 : 1 : 2</b>로 계수의 비와 같아요. <b>계수의 비 = 반응하는 분자 수의 비</b>예요.',
          },
          {
            type: 'quiz', title: '산소가 더 많다면?', scene: 'ratio',
            goal: '수소 분자 6개와 산소 분자 5개를 반응시키면 어떻게 될까요? (2H₂ + O₂ → 2H₂O)',
            choices: ['물 분자 6개가 생기고 남는 분자는 없다.', '물 분자 6개가 생기고 산소 분자 2개가 남는다.', '물 분자 5개가 생기고 수소 분자 1개가 남는다.', '물 분자 10개가 생긴다.'],
            answer: 1,
            feedback: ['산소 5개 중 3개만 반응할 수 있어요.', '', '수소 6개는 모두 반응해요. 수소가 부족한 쪽이에요.', '수소 분자가 6개뿐이라 물 분자는 6개까지만 만들 수 있어요.'],
            explain: '수소 6개와 반응하는 산소는 3개뿐이라 물 분자 6개가 생기고, <b>산소 분자 2개</b>가 남아요. 계수의 비(2 : 1 : 2)대로만 반응해요.',
          },
          {
            type: 'quiz', title: '메테인 연소의 계수비', scene: 'ratio', figure: FIG_CH4,
            goal: 'CH₄ + 2O₂ → CO₂ + 2H₂O에서 메테인 분자 3개가 완전히 연소할 때 필요한 산소 분자와 생기는 물 분자의 수는?',
            choices: ['산소 분자 3개, 물 분자 3개', '산소 분자 6개, 물 분자 6개', '산소 분자 6개, 물 분자 3개', '산소 분자 2개, 물 분자 2개'],
            answer: 1,
            feedback: ['메테인 1개에 산소 2개가 필요해요. 3배로 늘려 보세요.', '', '물은 메테인 1개당 2개 생겨요. 3개면 6개예요.', '그림은 메테인 1개일 때의 수예요.'],
            explain: '계수의 비 CH₄ : O₂ : CO₂ : H₂O = <b>1 : 2 : 1 : 2</b>. 메테인이 3개면 산소 <b>6개</b>가 필요하고 이산화 탄소 3개, 물 <b>6개</b>가 생겨요.',
          },
        ],
      },
    ],
  });

  refreshUI(); reactUI(); balUI(); writeUI(); ratioUI();
  const LOOP = startLoop(update, draw);
  window.__sim = {
    S, RS, BL, WS, EQS, WRI, RT, sysR, sysT, dragW, SC, SLOT, WORDS, get game() { return game; },
    ff: LOOP.ff, freeze: LOOP.freeze, v2s, setScene, ignite, balSet, ratioRun, wCheck, wSetCoef, isBal, isSimple, counts, wBal, wordsOk, writeResetOne,
  };
})();
