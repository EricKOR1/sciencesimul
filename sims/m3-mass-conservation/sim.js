(function () {
  'use strict';
  const VH0 = 486, YS0 = 30;
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
     중3 Ⅰ. 화학 반응의 규칙성 — 질량 보존 법칙  [9과16-03]
     화학 반응에서 질량이 보존됨을 실험을 통해 추론할 수 있다.
     ① 앙금 생성(전자저울 위 두 비커) → ② 기체 발생(열린 / 닫힌 용기) → ③ 연소(강철 솜 · 나무 · 밀폐)
     → ④ 원자 모형(원자 수 카운터)
     ※ 기체의 질량을 잴 때 부력이 영향을 줄 수 있어 풍선 대신 단단한 밀폐 용기를 사용
     ========================================================= */
  const S = { scene: 'ppt', sceneT: 0 };
  const SC = {};
  const DR = { fn: null };
  const FIRE = new SciSim.Particles();
  function drawFire() { FIRE.draw(ctx); }
  const SCENE_LABEL = {
    ppt: '⚖️ 두 용액을 섞으면 질량이 어떻게 될까요?',
    gas: '⚖️ 열린 용기와 닫힌 용기에서 기체가 생겨요',
    burn: '⚖️ 강철 솜과 나무를 태우면 질량은?',
    atoms: '🔍 원자 공 모형으로 반응 전후 원자 수를 세어요',
  };
  const sceneBtns = $$('#sceneSeg button');
  const LENS = { on: true, k: 1 };
  function setScene(name, instant) {
    if (!SC[name]) return;
    S.scene = name; S.sceneT = instant ? 0.3 : 0;
    SC[name].enter && SC[name].enter();
    refreshUI();
  }
  function refreshUI() {
    $$('#ctrlCard .control').forEach((c) => { c.hidden = c.dataset.sc !== S.scene; });
    $('#tbLabel').textContent = SCENE_LABEL[S.scene];
    $('#sceneSeg').hidden = !on('gas');
    sceneBtns.forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    const lb = $('#lensBtn'); lb.hidden = !(S.scene === 'ppt' || S.scene === 'burn'); lb.setAttribute('aria-pressed', LENS.on ? 'true' : 'false');
  }
  sceneBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, false); }));
  $('#resetBtn').addEventListener('click', () => { Sound.click(); SC[S.scene].reset && SC[S.scene].reset(true); });
  $('#lensBtn').addEventListener('click', () => { Sound.click(); LENS.on = !LENS.on; refreshUI(); });

  const fmtG = (v) => v.toFixed(1) + ' g';
  /* 오른쪽 기록 카드 */
  function recPanel(x, y, w, h, title, rows) {
    panel(x, y, w, h, 16, '#ffffff', 10, 3);
    txt(title, x + w / 2, y + 26, 15, COL.ink, 'center', 800);
    rows.forEach((r, i) => {
      const ry = y + 40 + i * 44;
      ctx.fillStyle = r.bg || '#f4f7fc'; D.roundRect(x + 10, ry, w - 20, 36, 12); ctx.fill();
      if (r.on) { ctx.strokeStyle = rgba(COL.sub, 0.5); ctx.lineWidth = 2; D.roundRect(x + 10, ry, w - 20, 36, 12); ctx.stroke(); }
      txt(r.label, x + 20, ry + 23, 14, COL.muted, 'left', 800);
      txt(r.val, x + w - 20, ry + 25, r.size || 19, r.col || COL.ink, 'right', 800);
    });
  }
  function benchBack(x, y, w, h) {
    panel(x, y, w, h, 22, '#c9d7ec', 12, 4);
    ctx.save(); D.roundRect(x, y, w, h, 22); ctx.clip(); vgrad(ctx, x, y, w, h, '#d3deef', '#b9c9e2'); ctx.restore();
  }
  function glassCloud(puffs) {
    puffs.forEach((p) => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, 'rgba(255,255,255,' + p.a.toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    });
  }

  /* =========================================================
     ① 앙금 생성: 질산 은 수용액 + 염화 나트륨 수용액
     ========================================================= */
  const PS = { x: 290, py: 340, w: 380 };
  const PB = { lx: 228, rx: 352, w: 100, h: 118 };
  const PP = {
    st: 'idle', t: 0, tp: 0, fL: 0.45, fR: 0.45, milk: 0, ppt: 0, puffs: [], mass: new Num(150), flash: 0,
    before: 150.0, after: null, mixed: false, stream: 0,
  };
  const sysI = new Sys(); sysI.sc = 14;
  const IC = { x: 676, y: 150, r: 86 };
  const ibox = { x: IC.x - 62, y: IC.y - 62, w: 124, h: 124 };
  function ionFill() {
    sysI.clear();
    const add = (type, x, y, chg) => sysI.addMol(type, x, y, { mode: 'gas', speed: 22, box: ibox, sc: 14, rot: rand(0, 6), chg });
    for (let i = 0; i < 3; i++) { add('Na', IC.x - 40 + i * 36 + rand(-6, 6), IC.y - 8 + rand(-24, 24), 1); add('Cl', IC.x - 30 + i * 34 + rand(-6, 6), IC.y + 24 + rand(-8, 8), -1); }
  }
  function pptReset() {
    clearLater(); FX.clear(); FIRE.clear();
    Object.assign(PP, { st: 'idle', t: 0, tp: 0, fL: 0.45, fR: 0.45, milk: 0, ppt: 0, puffs: [], flash: 0, after: null, mixed: false, stream: 0, ionStep: 0 });
    PP.mass.jump(150);
    ionFill(); pptUI();
  }
  function pptUI() {
    const b = $('#mixBtn');
    b.disabled = PP.st === 'run';
    b.textContent = PP.st === 'run' ? '⏳ 섞는 중…' : PP.st === 'done' ? '↻ 다시 해 보기' : '🧪 두 용액 섞기';
    $('#pptNote').textContent = PP.st === 'done' ? '흰색 앙금이 생겼는데도 저울의 숫자는 그대로예요!' : '왼쪽 비커에 오른쪽 비커의 용액을 부어요. 저울의 숫자를 잘 봐요.';
  }
  $('#mixBtn').addEventListener('click', () => { Sound.click(); if (PP.st === 'done') pptReset(); pptStart(); });
  function pptStart() {
    if (PP.st === 'run') return;
    PP.st = 'run'; PP.t = 0; PP.before = 150.0; PP.ionStep = 0; hideHint(); pptUI();
  }
  function pptUpdate(dt) {
    PP.mass.update(dt);
    PP.flash = Math.max(0, PP.flash - dt * 1.4);
    sysI.update(dt);
    PP.puffs.forEach((p) => { p.age += dt; p.r += p.vr * dt * Math.exp(-p.age * 0.7); p.x += p.vx * dt; p.y += p.vy * dt; p.a = Math.max(0, 0.9 - p.age * 0.35); });
    PP.puffs = PP.puffs.filter((p) => p.a > 0.02);
    if (PP.st !== 'run') return;
    PP.t += dt;
    const t = PP.t;
    PP.tp = ease.inOutCubic(seg(t, 0, 1.1)) - ease.inOutCubic(seg(t, 3.6, 4.6));
    const pour = seg(t, 1.2, 3.4);
    PP.fR = 0.45 * (1 - pour); PP.fL = 0.45 + 0.43 * pour;
    PP.stream = (t > 1.15 && t < 3.5) ? 1 : 0;
    if (PP.stream && Math.random() < dt * 40) {
      PP.puffs.push({ x: PB.lx + rand(-10, 10), y: 340 - PB.h * PP.fL + rand(0, 10), r: rand(6, 11), vr: rand(16, 30), vx: rand(-14, 14), vy: rand(6, 28), a: 0.9, age: 0 });
      if (!RM && Math.random() < 0.5) FX.emit({ x: PB.lx + rand(-5, 5), y: 340 - PB.h * PP.fL, vx: rand(-40, 40), vy: rand(-90, -40), life: 0.45, size: 1.8, color: 'rgba(210,230,255,.9)', gravity: 480, shape: 'circle' });
    }
    PP.milk = smooth(seg(t, 1.4, 4.2)) * (1 - 0.35 * smooth(seg(t, 4.6, 6.4)));
    PP.ppt = 16 * smooth(seg(t, 3.8, 6.4));
    // 입자 돋보기: 용액이 섞이면 Ag⁺, NO₃⁻가 들어와 Ag⁺ + Cl⁻ → AgCl
    if (t > 1.3 && PP.ionStep === 0) {
      PP.ionStep = 1;
      for (let i = 0; i < 3; i++) {
        const a = sysI.addMol('Ag', IC.x - 44 + i * 40, IC.y - 78, { mode: 'gas', speed: 30, box: ibox, sc: 14, rot: 0, chg: 1, vx: rand(-10, 10), vy: 60 });
        const n = sysI.addMol('NO3', IC.x - 24 + i * 34 + (i === 1 ? 6 : 0), IC.y - 98, { mode: 'gas', speed: 22, box: ibox, sc: 14, rot: rand(0, 6), chg: -1, vx: rand(-10, 10), vy: 60 });
      }
    }
    if (t > 3.0 && PP.ionStep === 1) { PP.ionStep = 2; pairIons(); }
    if (t > 6.6) {
      PP.st = 'done'; PP.mixed = true; PP.after = 150.0; PP.flash = 1; sfx.ding(); okFx(PS.x, 150, COL.good, true); pptUI();
    }
  }
  function pairIons() {
    const ags = sysI.mols.filter((m) => m.type === 'Ag'), cls = sysI.mols.filter((m) => m.type === 'Cl');
    const n = Math.min(ags.length, cls.length);
    for (let i = 0; i < n; i++) {
      const A = ags[i];
      let C = null, bd = 1e9; cls.forEach((c) => { if (!c._used) { const d = Math.hypot(c.cx - A.cx, c.cy - A.cy); if (d < bd) { bd = d; C = c; } } });
      if (!C) continue; C._used = true;
      const tx = (A.cx + C.cx) / 2, ty = (A.cy + C.cy) / 2;
      later(0.25 * i, () => {
        A.mode = 'hold'; C.mode = 'hold'; A.chg = 0; C.chg = 0;
        tw(A, { cx: tx - 9, cy: ty }, 0.55, 'inOutCubic', { essential: true }); tw(C, { cx: tx + 9, cy: ty }, 0.55, 'inOutCubic', { essential: true });
        later(0.6, () => {
          const pool = sysI.dissolve(A, 0).concat(sysI.dissolve(C, 0));
          const m = sysI.form('AgCl', pool, tx, ty, { mode: 'hold', sc: 14, k: 150, z: 0.5 });
          m.cx = tx; m.cy = ty; FX.burst(tx, ty, { count: 6, speed: 70, life: 0.5, size: 2.6, colors: ['#ffffff', '#c9d6f0'], shape: 'star', gravity: 0 });
          const gx = IC.x - 40 + i * 40 + rand(-4, 4), gy = IC.y + 52 - (i % 2) * 0;
          tw(m, { cx: gx, cy: gy }, 1.4, 'inOutCubic', { essential: true, onDone: () => { m.mode = 'liquid'; m.ax = m.cx; m.ay = m.cy; m.amp = 1.6; } });
          sfx.pop();
        });
      });
    }
  }

  /* ---- 그리기 ---- */
  function tiltedBeaker(px, py, w, h, ang, f, liquid, t) {
    // 유리 + (수평을 유지하는) 액체
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
    D.beaker(-w / 2, -h, w, h, { level: 0, ticks: 4 });
    ctx.restore();
    if (f <= 0.001) return;
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang); D.roundRect(-w / 2 + 3, -h + 2, w - 6, h - 5, 8); ctx.restore();
    ctx.save(); ctx.clip();
    const lipLocal = { x: -w / 2, y: -h };
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const lipY = py + lipLocal.x * sn + lipLocal.y * cs;
    const surf = Math.max(py - f * h * Math.cos(ang) * 1.05, lipY + 3);
    ctx.fillStyle = rgba(liquid, 0.72); ctx.fillRect(px - 200, surf, 400, 300);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(px - 200, surf, 400, 2);
    ctx.restore();
  }
  function drawPpt(t) {
    benchBack(66, 140, 448, 340);
    // 저울
    drawScale(PS.x, PS.py, PP.mass, { w: PS.w, flash: PP.flash });
    // 안내 이름표
    pill(PB.lx, 186, '염화 나트륨 수용액', { bg: '#7aa0d6', size: 13, pad: 9 });
    ctx.save(); ctx.globalAlpha = 1 - 0.9 * PP.tp; pill(PB.rx, 186, '질산 은 수용액', { bg: '#7a8da8', size: 13, pad: 9 }); ctx.restore();
    // 왼쪽 비커 (섞이는 쪽)
    const lx = PB.lx - PB.w / 2, ly = PS.py - PB.h;
    const base = mix('#bcdaf8', '#ffffff', PP.milk);
    D.beaker(lx, ly, PB.w, PB.h, { level: PP.fL, liquid: base, t, ticks: 4, wave: 1.1 });
    ctx.save(); D.roundRect(lx + 3, ly + 2, PB.w - 6, PB.h - 5, 8); ctx.clip();
    glassCloud(PP.puffs);
    if (PP.ppt > 0.2) {
      ctx.fillStyle = '#fdfdfd'; ctx.beginPath(); ctx.moveTo(lx, PS.py);
      for (let x = 0; x <= PB.w; x += 6) ctx.lineTo(lx + x, PS.py - 3 - PP.ppt - Math.sin(x * 0.45) * 1.6);
      ctx.lineTo(lx + PB.w, PS.py); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(150,170,200,.5)'; ctx.stroke();
    }
    ctx.restore();
    // 오른쪽 비커 (기울여 붓기)
    const tp = PP.tp;
    const px = PB.rx, py = PS.py - 100 * tp, ang = -0.95 * tp;
    tiltedBeaker(px, py, PB.w, PB.h, ang, PP.fR, '#cfe6ff', t);
    // 물줄기
    if (PP.stream) {
      const cs = Math.cos(ang), sn = Math.sin(ang);
      const lipx = px + (-PB.w / 2) * cs - (-PB.h) * sn, lipy = py + (-PB.w / 2) * sn + (-PB.h) * cs;
      const endY = PS.py - PB.h * PP.fL + 2;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(160,205,250,.85)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(lipx - 2, lipy + 2); ctx.quadraticCurveTo(lipx - 6, lipy + 18, PB.lx + 8, endY); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lipx - 3, lipy + 3); ctx.quadraticCurveTo(lipx - 7, lipy + 18, PB.lx + 7, endY); ctx.stroke();
      ctx.restore();
    }
    // 반응식 한 줄
    txt('질산 은 + 염화 나트륨 → 염화 은(흰 앙금) + 질산 나트륨', PS.x, 462, 14, COL.muted, 'center', 800);
    // 기록 카드
    const bef = PP.before, aft = PP.after;
    recPanel(566, 296, 226, 178, '⚖️ 질량 기록', [
      { label: '섞기 전', val: PP.st === 'idle' || PP.st === 'run' || PP.mixed ? fmtG(150) : fmtG(150), on: PP.st === 'idle' },
      { label: '섞은 후', val: PP.mixed ? fmtG(150) : '? g', col: PP.mixed ? COL.good : COL.muted, on: PP.mixed },
      { label: '비교', val: PP.mixed ? '= 같아요' : '–', col: PP.mixed ? COL.good : COL.muted, size: 17, bg: PP.mixed ? 'rgba(20,160,88,.12)' : '#f4f7fc' },
    ]);
    // 입자 돋보기
    LENS.k = SciSim.approach(LENS.k, LENS.on ? 1 : 0, lastDt, 9);
    if (LENS.k > 0.01) {
      lens(IC.x, IC.y, IC.r, () => {
        ctx.fillStyle = 'rgba(207,230,255,.45)'; ctx.fillRect(IC.x - IC.r, IC.y - IC.r, IC.r * 2, IC.r * 2);
        sysI.draw();
        if (PP.ionStep >= 2) txt('Ag⁺ + Cl⁻ → AgCl', IC.x, IC.y + 62, 12.5, '#5d6879', 'center', 800);
      }, { k: LENS.k, src: { x: PB.lx - 14, y: 296, r: 16 }, title: '🔍 이온 모형' });
    } else pill(IC.x, IC.y, '🔍 켜서 입자를 봐요', { bg: '#8b5cf6', size: 14, pad: 12 });
    // 이온 이름
    const lg = (x, y, c, s) => { ctx.fillStyle = c; circle(ctx, x, y, 6); ctx.fill(); txt(s, x + 11, y + 5, 13, COL.muted, 'left', 800); };
    lg(578, 276, EL.Na.c, 'Na⁺'); lg(630, 276, EL.Cl.c, 'Cl⁻'); lg(682, 276, EL.Ag.c, 'Ag⁺'); lg(730, 276, '#3f6fe8', 'NO₃⁻');
    drawFire();
  }
  SC.ppt = {
    enter() { pptUI(); },
    reset: pptReset,
    update: pptUpdate,
    draw: drawPpt,
  };
  ionFill(); PP.ionStep = 0;

  /* =========================================================
     ② 기체 발생: 탄산 칼슘 2.5 g + 묽은 염산  (열린 용기 vs 닫힌 용기)
     ========================================================= */
  const GX = 250, GPY = 346, GW = 330;                    // 저울 가운데 · 받침판 높이 · 폭
  const FL = { w: 170, h: 190 };
  const neckTop = GPY - FL.h, neckBot = GPY - FL.h + FL.h * 0.32, neckW = FL.w * 0.28;
  const liqSurf = GPY - (FL.h - FL.h * 0.32) * 0.35;
  const gbox = { x: GX - 52, y: neckBot + 14, w: 104, h: liqSurf - neckBot - 24 };
  const sysG = new Sys(); sysG.sc = 17;
  const GS = {
    box: 'open', st: 'idle', t: 0, lid: 'on', lidK: { x: 0, y: 0, r: 0 }, mass: new Num(120), flash: 0,
    drop: 0, emitted: 0, left: 0, N: 8, lidT: -1, doneOpen: false, doneClosed: false, doneLid: false,
    chips: [{ x: -9, y: 0, r: 0.3, s: 1 }, { x: 8, y: 2, r: -0.5, s: 1 }, { x: -2, y: -7, r: 0.8, s: 1 }, { x: 12, y: -4, r: 0.1, s: 1 }],
    resting: [{ x: -34, y: 0 }, { x: -10, y: 2 }, { x: 14, y: 0 }, { x: 36, y: 3 }],
    rec: { open: null, closed: null, lid: null },
  };
  function gasReset() {
    clearLater(); FX.clear(); sysG.clear();
    Object.assign(GS, { st: 'idle', t: 0, lid: 'on', drop: 0, emitted: 0, left: 0, lidT: -1 });
    GS.lidK = { x: 0, y: 0, r: 0 }; GS.mass.jump(120); GS.chips.forEach((c) => { c.s = 1; });
    GS.rec = { open: null, closed: null, lid: null };
    gasUI();
  }
  function gasUI() {
    $$('#boxSeg button').forEach((b) => b.classList.toggle('on', b.dataset.box === GS.box));
    const b = $('#gasBtn'), run = GS.st === 'run';
    b.disabled = run; b.textContent = run ? '⏳ 반응 중…' : GS.st === 'done' ? '↻ 다시 해 보기' : '🧪 반응시키기';
    $$('#boxSeg button').forEach((x) => { x.disabled = run; });
    const lb = $('#lidBtn');
    lb.hidden = !(GS.box === 'closed' && GS.st === 'done' && GS.lid === 'on');
    $('#gasNote').textContent = GS.box === 'open' ? '열린 용기: 생긴 기체가 공기 중으로 빠져나갈 수 있어요.' : (GS.st === 'done' ? '닫힌 용기: 질량이 그대로예요. 이제 뚜껑을 열어 볼까요?' : '닫힌 용기: 생긴 기체가 용기 안에 머물러요.');
  }
  $$('#boxSeg button').forEach((b) => b.addEventListener('click', () => { if (GS.st === 'run') return; Sound.click(); GS.box = b.dataset.box; gasReset(); }));
  $('#gasBtn').addEventListener('click', () => { Sound.click(); if (GS.st !== 'idle') gasReset(); gasStart(); });
  $('#lidBtn').addEventListener('click', () => { Sound.click(); gasLid(); });
  function gasStart() {
    if (GS.st === 'run') return;
    GS.st = 'run'; GS.t = 0; hideHint(); gasUI(); sfx.fizz();
  }
  function gasLid() {
    if (GS.lid === 'off' || GS.st !== 'done') return;
    GS.lid = 'off'; GS.lidT = 0; GS.left = 0;
    tw(GS.lidK, { y: -64, x: 40, r: 0.4 }, 0.35, 'outCubic', { essential: true, onDone: () => { tw(GS.lidK, { y: 0, x: 112 - 0, r: 1.2 }, 0.55, 'outBounce', { essential: true }); } });
    sfx.pop();
    // 갇혀 있던 이산화 탄소가 빠져나감
    sysG.mols.filter((m) => m.type === 'CO2').forEach((m, i) => {
      later(0.2 + i * 0.16, () => { m.mode = 'fly'; m.vx = (GX - m.cx) * 1.6; m.vy = -70; m.life = m.age + 3.2; });
    });
    gasUI();
  }
  function spawnCO2() {
    const m = sysG.addMol('CO2', GX + rand(-22, 22), liqSurf - 14, { mode: 'gas', speed: 24, box: gbox, sc: 17, rot: rand(0, 3), scl: 0.01 });
    tw(m, { scl: 1 }, 0.4, 'outBack', { essential: true });
    if (GS.box === 'open') { m.mode = 'fly'; m.vx = rand(-8, 8); m.vy = -62; m.life = 4.2; m.vr = rand(-0.6, 0.6); }
  }
  function gasUpdate(dt) {
    GS.mass.update(dt); GS.flash = Math.max(0, GS.flash - dt * 1.4);
    sysG.update(dt);
    // 열린 용기: 목을 지나 빠져나간 분자를 세어 질량 갱신
    sysG.mols.forEach((m) => {
      if (m.type !== 'CO2' || m.counted) return;
      if (m.mode === 'fly' && m.cy < neckTop + 20) {
        m.counted = true; GS.left++; GS.mass.set(120 - 1.1 * GS.left / GS.N);
      } else if (m.mode === 'fly' && m.cy > neckBot) {
        // 목을 향해 모이도록
        m.vx += (GX - m.cx) * dt * 3;
      }
    });
    if (GS.lid === 'off' && GS.lidT >= 0) {
      GS.lidT += dt;
      if (GS.left >= GS.N && GS.lidT > 0.6 && !GS.doneLid) { GS.doneLid = true; GS.rec.lid = 118.9; GS.flash = 1; sfx.ding(); okFx(GX, 140, COL.good, true); gasUI(); }
    }
    if (GS.st !== 'run') return;
    GS.t += dt;
    const t = GS.t;
    GS.drop = ease.outCubic(seg(t, 0.2, 0.9));
    GS.chips.forEach((c, i) => { c.s = 1 - smooth(seg(t, 1.2 + i * 0.1, 4.9)); });
    // 기포
    if (t > 0.9 && t < 5.0) {
      const rate = 46 * (1 - seg(t, 1.0, 5.0) * 0.7);
      let n = rate * dt; while (n > 0 && (n >= 1 || Math.random() < n)) { n -= 1;
        const x = GX + rand(-34, 34), y0 = GPY - 14, sp = rand(55, 95);
        FX.emit({ x, y: y0, vx: rand(-5, 5), vy: -sp, life: Math.max(0.2, (y0 - liqSurf) / sp), size: rand(1.8, 4.6), color: '#6aa9e6', shape: 'bubble' });
      }
      if (!RM && Math.random() < dt * 22) FX.emit({ x: GX + rand(-34, 34), y: liqSurf, vx: rand(-20, 20), vy: rand(-45, -20), life: 0.5, size: 1.4, color: 'rgba(205,230,255,.9)', gravity: 200, shape: 'circle' });
    }
    // 이산화 탄소 분자 하나씩 생김
    while (GS.emitted < GS.N && t > 1.0 + GS.emitted * 0.46) { GS.emitted++; spawnCO2(); }
    if (t > (GS.box === 'open' ? 6.8 : 5.6) && GS.st === 'run') {
      GS.st = 'done'; GS.flash = 1;
      if (GS.box === 'open') { GS.rec.open = 118.9; GS.doneOpen = true; GS.mass.set(118.9); okFx(GX, 120, COL.chem, false); }
      else { GS.rec.closed = 120.0; GS.doneClosed = true; okFx(GX, 140, COL.good, false); }
      sfx.ding(); gasUI();
    }
  }
  function drawGas(t) {
    benchBack(50, 116, 400, 366);
    drawScale(GX, GPY, GS.mass, { w: GW, flash: GS.flash });
    // 마개 (닫힌 용기)
    const closed = GS.box === 'closed';
    // 플라스크
    const lvl = 0.35;
    D.flask(GX, GPY, FL.w, FL.h, { level: lvl, liquid: '#bfdcfa', t });
    // 안에 든 조각 · 바구니
    const dropK = GS.drop;
    const bx = GX, by = lerp(neckBot + 20, GPY - 12, ease.inQuad(dropK) * 0.0 + dropK);
    if (dropK < 0.999 || GS.st === 'idle') {
      const y = lerp(neckBot + 22, liqSurf + 6, dropK);
      // 줄
      ctx.save(); ctx.strokeStyle = 'rgba(80,70,60,.8)'; ctx.lineWidth = 1.8;
      if (dropK < 0.05) { ctx.beginPath(); ctx.moveTo(GX, neckTop + 8); ctx.lineTo(GX, y - 14); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(GX, y - 14); ctx.lineTo(GX + 3, y - 26); ctx.stroke(); }
      // 바구니
      ctx.save(); ctx.translate(GX, y); ctx.rotate(dropK * 0.5);
      ctx.fillStyle = 'rgba(210,190,150,.9)'; ctx.strokeStyle = '#8a7350'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-18, -12); ctx.lineTo(18, -12); ctx.lineTo(13, 10); ctx.lineTo(-13, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(138,115,80,.6)'; ctx.lineWidth = 1; for (let k = -12; k <= 12; k += 8) { ctx.beginPath(); ctx.moveTo(k, -12); ctx.lineTo(k * 0.75, 10); ctx.stroke(); }
      ctx.restore();
      ctx.restore();
    }
    // 대리암 조각 (바구니 속 → 바닥)
    GS.chips.forEach((c, i) => {
      const rest = GS.resting[i];
      const x = lerp(GX + c.x * 0.7, GX + rest.x, ease.inCubic(dropK)), y = lerp(lerp(neckBot + 22, liqSurf + 6, dropK) - 6 + c.y, GPY - 9 + rest.y * 0.5, ease.inQuad(dropK));
      if (c.s < 0.03) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(c.r + dropK * 2); ctx.scale(c.s, c.s);
      ctx.fillStyle = '#f7f6f2'; ctx.strokeStyle = '#b9b5a8'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-2, -8); ctx.lineTo(7, -5); ctx.lineTo(9, 3); ctx.lineTo(1, 7); ctx.lineTo(-7, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    // 입구: 막대(열린 용기) 또는 고무마개(닫힌 용기)
    if (!closed) {
      ctx.save(); ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(GX - neckW / 2 - 8, neckTop - 2); ctx.lineTo(GX + neckW / 2 + 8, neckTop - 2); ctx.stroke(); ctx.restore();
    }
    // 분자 + 효과
    sysG.draw();
    if (closed) {
      const lk = GS.lidK, op = GS.lid === 'off';
      ctx.save(); ctx.translate(GX + lk.x, neckTop - 6 + lk.y); ctx.rotate(lk.r);
      softShadow(-neckW / 2 - 6, -4, neckW + 12, 28, 6, 8, 4, 'rgba(60,30,10,.3)');
      const g = ctx.createLinearGradient(0, -4, 0, 24); g.addColorStop(0, '#d98a4c'); g.addColorStop(1, '#a8602a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-neckW / 2 - 6, -4); ctx.lineTo(neckW / 2 + 6, -4); ctx.lineTo(neckW / 2 - 2, 24); ctx.lineTo(-neckW / 2 + 2, 24); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7a4520'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    // 표시: 이산화 탄소 / 질량
    if (GS.st === 'run' || GS.st === 'done') {
      if (GS.box === 'open') pill(GX + 100, 130, 'CO₂가 빠져나가요 ↑', { bg: '#b4440f', size: 13, pad: 10 });
      else pill(GX + 110, neckBot + 28, 'CO₂는 용기 안에!', { bg: '#1d7a5a', size: 13, pad: 10 });
    }
    pill(GX, 456, '※ 부력의 영향을 줄이려고 풍선 대신 단단한 용기를 써요', { bg: '#5b7fb5', size: 13, pad: 12 });
    // 기록 카드
    const r = GS.rec;
    const rows = [
      { label: '반응 전', val: fmtG(120) },
      { label: GS.box === 'open' ? '반응 후' : '반응 후 (뚜껑 닫힘)', val: GS.box === 'open' ? (r.open != null ? fmtG(r.open) : '? g') : (r.closed != null ? fmtG(r.closed) : '? g'), col: GS.box === 'open' ? (r.open != null ? COL.bad : COL.muted) : (r.closed != null ? COL.good : COL.muted), on: GS.st === 'done' && GS.lid === 'on' },
    ];
    if (GS.box === 'closed') rows.push({ label: '뚜껑 연 뒤', val: r.lid != null ? fmtG(r.lid) : '? g', col: r.lid != null ? COL.bad : COL.muted, on: GS.lid === 'off' });
    recPanel(566, 70, 226, GS.box === 'closed' ? 190 : 146, '⚖️ 질량 기록', rows);
    // 해설 풍선
    let msg = null;
    if (GS.box === 'open' && GS.st === 'done') msg = '이산화 탄소 1.1 g이 공기 중으로 빠져나가서 줄었어요.';
    if (GS.box === 'closed' && GS.st === 'done' && GS.lid === 'on') msg = '기체가 용기 안에 있어서 질량은 그대로예요.';
    if (GS.box === 'closed' && GS.lid === 'off' && GS.doneLid) msg = '뚜껑을 열자 기체가 빠져나가 1.1 g이 줄었어요.';
    if (msg) { ctx.fillStyle = '#fff'; D.roundRect(566, 276, 226, 76, 14); ctx.fill(); ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 2; ctx.stroke(); textBlock(msg, 580, 303, 200, 14, COL.ink, 'left', 19, 800); }
    drawFire();
  }
  SC.gas = {
    enter() { gasUI(); },
    reset() { gasReset(); },
    update: gasUpdate,
    draw: drawGas,
  };

  /* =========================================================
     ③ 연소: 강철 솜(증가) vs 나무(감소), 밀폐 용기(일정)  — 예측 후 확인
     ========================================================= */
  const OUT = { 'wool-open': { after: 2.4, k: 'up' }, 'wood-open': { after: 0.4, k: 'down' }, 'wool-closed': { after: 2.0, k: 'same' }, 'wood-closed': { after: 2.0, k: 'same' } };
  const KNAME = { wool: '강철 솜', wood: '나무' }, CNAME = { open: '열린 공간', closed: '밀폐 용기' };
  const KSYM = { up: '증가 ↑', down: '감소 ↓', same: '그대로 =' };
  const BS = {
    mat: 'wool', ctn: 'open', st: 'idle', t: 0, q: 0, mass: new Num(2.0), flash: 0, pred: {}, res: {}, glow: 0, flameK: 0, o2n: 0, done: 0,
  };
  const bkey = () => BS.mat + '-' + BS.ctn;
  const sysB = new Sys(); sysB.sc = 13;
  const sysL = new Sys(); sysL.sc = 18;
  const LC3 = { x: 466, y: 188, r: 72 };
  const SX = 250, SPY = 346;                            // 저울 가운데 · 받침판
  const jarR = { x: 172, y: 190, w: 156, h: SPY - 190 };
  const openBox = { x: 128, y: 180, w: 244, h: SPY - 190 }, closedBox = { x: jarR.x + 10, y: jarR.y + 16, w: jarR.w - 20, h: jarR.h - 26 };
  const WOOLF = [];
  for (let i = 0; i < 46; i++) {
    const a0 = rand(0, TAU), rr = rand(8, 28);
    const x0 = Math.cos(a0) * rr, y0 = Math.sin(a0) * rr * 0.85, a1 = a0 + rand(-1.7, 1.7), r1 = rand(8, 30);
    WOOLF.push({ x0, y0, x1: Math.cos(a1) * r1, y1: Math.sin(a1) * r1 * 0.85, cx: rand(-34, 34), cy: rand(-30, 30), ht: clamp(0.5 + y0 / 56 + rand(-0.1, 0.1), 0, 1), w: rand(0.8, 1.6) });
  }
  const STICKS = [];
  for (let i = 0; i < 6; i++) STICKS.push({ x: rand(-22, 22), y: -i * 5.5 - 4, a: rand(-0.16, 0.16), l: rand(54, 74), c: mix('#c8a06a', '#a97c45', Math.random()) });
  function burnFillGas() {
    sysB.clear();
    const box = BS.ctn === 'closed' ? closedBox : openBox;
    for (let i = 0; i < 7; i++) sysB.addMol('O2', box.x + 24 + (i % 4) * 54 + rand(-8, 8), box.y + 24 + Math.floor(i / 4) * 60 + rand(-8, 8), { mode: 'gas', speed: 26, box, sc: 13, rot: rand(0, 6) });
  }
  function lensFill() {
    sysL.clear();
    const cx = LC3.x, cy = LC3.y;
    if (BS.mat === 'wool') {
      for (let i = 0; i < 4; i++) sysL.addMol('Fe', cx - 45 + i * 30, cy + 46, { mode: 'liquid', amp: 1.2, sc: 18 });
      [[-34, -40], [34, -36]].forEach((o) => sysL.addMol('O2', cx + o[0], cy + o[1], { mode: 'gas', speed: 18, box: { x: cx - 62, y: cy - 62, w: 124, h: 80 }, sc: 18, rot: rand(0, 6) }));
    } else {
      [[-32, 38], [32, 38]].forEach((o) => sysL.addMol('C', cx + o[0], cy + o[1], { mode: 'liquid', amp: 1.2, sc: 18 }));
      [[-46, -26], [40, -34]].forEach((o) => sysL.addMol('O2', cx + o[0], cy + o[1], { mode: 'gas', speed: 18, box: { x: cx - 62, y: cy - 62, w: 124, h: 80 }, sc: 18, rot: rand(0, 6) }));
    }
  }
  function burnReset() {
    clearLater(); FX.clear(); FIRE.clear();
    Object.assign(BS, { st: 'idle', t: 0, q: 0, flash: 0, glow: 0, flameK: 0, o2n: 0, done: 0 });
    BS.mass.jump(2.0);
    burnFillGas(); lensFill(); burnUI();
  }
  function burnUI() {
    $$('#matSeg2 button').forEach((b) => { b.classList.toggle('on', b.dataset.mat === BS.mat); b.disabled = BS.st === 'run'; });
    $$('#ctnSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.ctn === BS.ctn); b.disabled = BS.st === 'run'; });
    const b = $('#burnBtn'), has = !!BS.pred[bkey()];
    b.disabled = BS.st === 'run' || (!has && BS.st === 'idle');
    b.textContent = BS.st === 'run' ? '⏳ 타는 중…' : BS.st === 'done' ? '↻ 다시 해 보기' : (has ? '🔥 태워서 확인하기' : '👉 먼저 예상을 골라요');
    $('#burnNote').textContent = BS.ctn === 'open' ? '열린 공간: 공기 중의 산소가 드나들 수 있어요.' : '밀폐 용기: 뚜껑이 닫혀 기체가 드나들지 못해요.';
  }
  $$('#matSeg2 button').forEach((b) => b.addEventListener('click', () => { if (BS.st === 'run') return; Sound.click(); BS.mat = b.dataset.mat; burnReset(); }));
  $$('#ctnSeg button').forEach((b) => b.addEventListener('click', () => { if (BS.st === 'run') return; Sound.click(); BS.ctn = b.dataset.ctn; burnReset(); }));
  $('#burnBtn').addEventListener('click', () => { Sound.click(); if (BS.st === 'done') burnReset(); burnStart(); });
  function burnStart() {
    if (BS.st === 'run' || !BS.pred[bkey()]) return;
    BS.st = 'run'; BS.t = 0; BS.done = 0; hideHint(); burnUI(); sfx.zap();
    lensStart();
  }
  function lensStart() {
    const cx = LC3.x, cy = LC3.y, open = BS.ctn === 'open';
    if (BS.mat === 'wool') {
      const os = sysL.mols.filter((m) => m.type === 'O2'), fes = sysL.mols.filter((m) => m.type === 'Fe');
      os.forEach((o, j) => {
        later(1.4 + j * 1.6, () => {
          o.mode = 'hold'; const f1 = fes[2 * j], f2 = fes[2 * j + 1];
          tw(o, { cx: (f1.cx + f2.cx) / 2, cy: f1.cy - 40 }, 0.8, 'inOutCubic', { essential: true });
          later(0.9, () => {
            const at = sysL.dissolve(o, 20);
            [[at[0], f1], [at[1], f2]].forEach((pr) => { const a1 = pr[0], f = pr[1]; a1.tx = f.cx; a1.ty = f.cy - 25; a1.k = 80; a1.z = 0.45; sysL.bond(f.atoms[0], a1, 1, 0); });
            FX.burst((f1.cx + f2.cx) / 2, f1.cy - 24, { count: 6, speed: 60, life: 0.5, size: 2.4, colors: ['#ffd23f', '#ff9f3a'], shape: 'star', gravity: 0 });
            sfx.pop();
          });
        });
      });
    } else {
      const cs = sysL.mols.filter((m) => m.type === 'C'), os = sysL.mols.filter((m) => m.type === 'O2');
      cs.forEach((c, i) => {
        later(1.4 + i * 1.3, () => {
          react(sysL, {
            ins: [c, os[i]], at: { x: cx + (i ? 28 : -28), y: cy + 6 }, gather: 0.7, shake: 0.4, spread: 0.6,
            onFlash(p) { FX.burst(p.x, p.y, { count: 8, speed: 90, life: 0.5, size: 2.6, colors: ['#fff6c2', '#ffd23f'], shape: 'star', gravity: 0 }); sfx.pop(); },
            outs: [{ type: 'CO2', cx: cx + (i ? 24 : -24), cy: cy - 8 + i * 14, rot: 0.2, move: 0.7, after: (m) => { if (open) { m.mode = 'fly'; m.vx = rand(-8, 8); m.vy = -52; m.life = m.age + 2.6; m.vr = rand(-0.5, 0.5); } else { m.mode = 'gas'; m.speed = 16; m.box = { x: cx - 56, y: cy - 62, w: 112, h: 110 }; m.vx = rand(-12, 12); m.vy = rand(-12, 12); } } }],
            onDone() {},
          });
        });
      });
    }
  }
  function burnUpdate(dt) {
    BS.mass.update(dt); BS.flash = Math.max(0, BS.flash - dt * 1.4);
    sysB.update(dt); sysL.update(dt); FIRE.update(dt);
    if (BS.st !== 'run') { BS.glow = SciSim.approach(BS.glow, 0, dt, 2); BS.flameK = SciSim.approach(BS.flameK, 0, dt, 3); return; }
    BS.t += dt; const t = BS.t;
    const wool = BS.mat === 'wool', open = BS.ctn === 'open';
    BS.q = wool ? seg(t, 0.8, 5.4) : seg(t, 1.0, 5.6);
    BS.glow = SciSim.approach(BS.glow, t > 0.5 ? 1 : 0, dt, 5);
    BS.flameK = SciSim.approach(BS.flameK, (!wool && t > 0.9 && BS.q < 0.98) ? 1 : 0, dt, 4);
    const out = OUT[bkey()];
    if (open) BS.mass.set(wool ? 2.0 + 0.4 * BS.q : 2.0 - 1.6 * BS.q); else BS.mass.set(2.0);
    // 산소 분자가 샘플로 다가가 결합 (기체 입자)
    if (t > 1.2 && BS.o2n < 3 && t > 1.2 + BS.o2n * 1.1) {
      BS.o2n++;
      const cand = sysB.mols.filter((m) => m.type === 'O2' && m.mode === 'gas');
      const m = cand[0];
      if (m) {
        m.mode = 'hold'; m.vx = m.vy = 0;
        tw(m, { cx: SX + rand(-8, 8), cy: SPY - 34 }, 1.0, 'inOutCubic', { essential: true, onDone: () => {
          sysB.removeMol(m, 0.3);
          if (!wool) {
            const co = sysB.addMol('CO2', SX + rand(-10, 10), SPY - 44, { mode: open ? 'fly' : 'gas', speed: 20, box: closedBox, sc: 13, rot: rand(0, 3), vx: rand(-10, 10), vy: open ? -52 : rand(-12, 12), life: open ? 3.4 : undefined, scl: 0.01 });
            tw(co, { scl: 1 }, 0.3, 'outBack', { essential: true });
          }
        } });
      }
    }
    // 불꽃 · 불티
    if (!RM) {
      if (wool) {
        const g = Math.sin(Math.PI * clamp(BS.q * 1.05, 0, 1));
        let n = g * 60 * dt; while (n > 0 && (n >= 1 || Math.random() < n)) { n -= 1;
          const a = rand(-Math.PI, 0), sp = rand(60, 170);
          FIRE.emit({ x: SX + rand(-22, 22), y: SPY - 34 - clamp(BS.q * 1.25, 0, 1) * 44 + 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: rand(0.5, 1.0), size: rand(1.2, 2.4), color: Math.random() < 0.5 ? '#ffe27a' : '#ff9a3a', gravity: 360, drag: 0.6 });
        }
      } else if (BS.flameK > 0.05) {
        if (Math.random() < dt * 40) FIRE.emit({ x: SX + rand(-26, 26), y: SPY - 24 - rand(0, 10), vx: rand(-8, 8), vy: -rand(40, 80), life: rand(0.35, 0.65), size: rand(5, 10), color: Math.random() < 0.5 ? 'rgba(255,150,40,.6)' : 'rgba(255,90,30,.55)', shape: 'smoke', grow: -6, drag: 1 });
        if (open && Math.random() < dt * 5) FX.emit({ x: SX + rand(-20, 20), y: SPY - 70, vx: rand(-8, 8), vy: -rand(26, 44), life: 1.8, size: rand(8, 12), color: 'rgba(110,105,105,.25)', shape: 'smoke', grow: 10 });
      }
    }
    if (t > 6.4) {
      BS.st = 'done'; BS.flash = 1;
      const pred = BS.pred[bkey()];
      BS.res[bkey()] = { before: 2.0, after: out.after, pred, ok: pred === out.k, k: out.k };
      BS.mass.set(out.after);
      okFx(SX, 150, pred === out.k ? COL.good : COL.chem, false); sfx.ding(); burnUI();
    }
  }

  /* ---- 그리기 ---- */
  function drawWoolTuft(cx, cy, q, st, t) {
    ctx.save(); ctx.translate(cx, cy); ctx.lineCap = 'round';
    WOOLF.forEach((s) => {
      const burn = q * 1.3 - (1 - s.ht) * 1.0;
      let col, lw = s.w;
      if (st === 'idle' || burn <= 0) col = '#a7b0bf';
      else if (burn < 0.35) { col = mix('#ffe27a', '#ff6a2a', burn / 0.35); lw += 1.2; }
      else col = mix('#ff6a2a', '#403b3b', clamp((burn - 0.35) / 0.4, 0, 1));
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1); ctx.stroke();
    });
    ctx.restore();
  }
  function drawWoodPile(cx, cy, q, t) {
    ctx.save(); ctx.translate(cx, cy);
    STICKS.forEach((s) => {
      const ch = smooth(seg(q, 0.05 + (1 - (-s.y / 36)) * 0.1, 0.7));
      const len = s.l * (1 - 0.7 * smooth(seg(q, 0.3, 1)));
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
      ctx.fillStyle = mix(s.c, '#2a2220', ch); D.roundRect(-len / 2, -3.2, len, 6.4, 3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(-len / 2 + 4, -0.5, len - 8, 1.2);
      if (ch > 0.2 && ch < 0.95) { ctx.fillStyle = 'rgba(255,120,40,' + (0.7 * Math.sin(Math.PI * ch)).toFixed(2) + ')'; D.roundRect(-len / 2, -3.2, len, 6.4, 3); ctx.fill(); }
      ctx.restore();
    });
    ctx.restore();
  }
  function drawBurn(t) {
    benchBack(50, 116, 400, 366);
    drawScale(SX, SPY, BS.mass, { w: 330, flash: BS.flash });
    const wool = BS.mat === 'wool', closed = BS.ctn === 'closed';
    // 접시
    groundShadow(SX, SPY + 2, 66, 8, 0.8);
    ctx.save();
    const dg = ctx.createLinearGradient(SX - 56, 0, SX + 56, 0); dg.addColorStop(0, '#dfe5ee'); dg.addColorStop(0.5, '#fff'); dg.addColorStop(1, '#c4cddb');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(SX - 56, SPY - 14); ctx.quadraticCurveTo(SX - 46, SPY, SX, SPY); ctx.quadraticCurveTo(SX + 46, SPY, SX + 56, SPY - 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9fabc0'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    // 점화선
    const hot = BS.glow;
    ctx.save(); ctx.strokeStyle = '#3a3f4b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(SX + 70, 158); ctx.quadraticCurveTo(SX + 60, 240, SX + 10, SPY - 26); ctx.stroke();
    if (hot > 0.05) { ctx.strokeStyle = 'rgba(255,' + Math.round(140 + 60 * hot) + ',60,' + (0.85 * hot).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(SX + 34, SPY - 76); ctx.quadraticCurveTo(SX + 26, SPY - 50, SX + 10, SPY - 26); ctx.stroke(); D.glow(SX + 12, SPY - 28, 30, '#ff8a3d', 0.5 * hot); }
    ctx.restore();
    // 시료
    if (wool) { if (BS.st !== 'idle') D.glow(SX, SPY - 36, 70, '#ff8a3d', 0.4 * Math.sin(Math.PI * clamp(BS.q * 1.05, 0, 1))); drawWoolTuft(SX, SPY - 34, BS.q, BS.st, t); }
    else { drawWoodPile(SX, SPY - 10, BS.q, t); if (BS.flameK > 0.02) { D.flame(SX - 12, SPY - 18, 46 * BS.flameK, t); D.flame(SX + 14, SPY - 18, 38 * BS.flameK, t + 1.3); } }
    // 기체 입자
    sysB.draw();
    // 용기 (밀폐)
    if (closed) {
      ctx.save();
      ctx.fillStyle = 'rgba(214,236,255,.22)'; D.roundRect(jarR.x, jarR.y, jarR.w, jarR.h, 14); ctx.fill();
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.5; D.roundRect(jarR.x, jarR.y, jarR.w, jarR.h, 14); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(jarR.x + 12, jarR.y + 24); ctx.lineTo(jarR.x + 12, jarR.y + jarR.h - 20); ctx.stroke();
      const lg = ctx.createLinearGradient(0, jarR.y - 14, 0, jarR.y + 6); lg.addColorStop(0, '#b9c3d3'); lg.addColorStop(1, '#7d8aa0');
      ctx.fillStyle = lg; D.roundRect(jarR.x - 6, jarR.y - 12, jarR.w + 12, 18, 6); ctx.fill();
      ctx.restore();
      pill(jarR.x + jarR.w / 2, jarR.y - 28, '밀폐 용기 (뚜껑 닫힘)', { bg: '#5b7fb5', size: 13, pad: 10 });
    } else {
      pill(SX, 160, '열린 공간 (공기 중)', { bg: '#7a8da8', size: 13, pad: 10 });
    }
    pill(SX, 440, '접시와 용기는 영점 조정했어요 → 시료의 질량만 보여요', { bg: '#5b7fb5', size: 13, pad: 12 });
    // 입자 돋보기
    LENS.k = SciSim.approach(LENS.k, LENS.on ? 1 : 0, lastDt, 9);
    if (LENS.k > 0.01) {
      lens(LC3.x, LC3.y, LC3.r, () => {
        ctx.fillStyle = 'rgba(255,240,225,.5)'; ctx.fillRect(LC3.x - LC3.r, LC3.y - LC3.r, LC3.r * 2, LC3.r * 2);
        sysL.draw();
        const cap = wool ? '철 + 산소 → 산화 철 (결합)' : (BS.ctn === 'open' ? 'CO₂가 날아가요' : 'CO₂가 용기 안에');
        txt(cap, LC3.x, LC3.y + 58, 12, '#5d6879', 'center', 800);
      }, { k: LENS.k, src: { x: SX + 8, y: SPY - 40, r: 22 }, title: '🔍 입자 모형' });
    } else pill(LC3.x, LC3.y, '🔍 켜서 입자를 봐요', { bg: '#8b5cf6', size: 14, pad: 12 });
    // 예상 카드
    const key = bkey(), pr = BS.pred[key], rs = BS.res[key];
    panel(566, 56, 226, 188, 16, '#ffffff', 10, 3);
    txt('🎯 예상해 봐요', 679, 82, 16, COL.ink, 'center', 800);
    txt(KNAME[BS.mat] + ' · ' + CNAME[BS.ctn], 679, 102, 13, COL.muted, 'center', 800);
    ['up', 'down', 'same'].forEach((k, i) => {
      const y = 112 + i * 40, sel = pr === k, ans = rs && rs.k === k;
      ctx.fillStyle = sel ? '#f3efff' : '#f4f7fc'; D.roundRect(578, y, 202, 34, 12); ctx.fill();
      ctx.strokeStyle = rs ? (ans ? COL.good : (sel ? COL.bad : '#dde4ef')) : (sel ? COL.sub : '#dde4ef'); ctx.lineWidth = sel || (rs && ans) ? 3 : 1.5; D.roundRect(578, y, 202, 34, 12); ctx.stroke();
      txt('질량이 ' + KSYM[k], 679, y + 23, 15, sel ? COL.sub : COL.ink, 'center', 800);
      if (rs && ans) txt('✔', 764, y + 24, 16, COL.good, 'center', 800); else if (rs && sel) txt('✗', 764, y + 24, 16, COL.bad, 'center', 800);
    });
    if (!pr && BS.st === 'idle') { const a = 0.55 + 0.45 * Math.sin(now() * 5); ctx.save(); ctx.globalAlpha = a; txt('👆 하나를 골라요', 679, 236, 13, COL.sub, 'center', 800); ctx.restore(); }
    else if (rs) txt(rs.ok ? '🎉 예상이 맞았어요!' : '다시 생각해 봐요 — 결과: ' + KSYM[rs.k], 679, 236, 13, rs.ok ? COL.good : '#b4440f', 'center', 800);
    // 기록 카드
    const rows = ['wool-open', 'wood-open', 'wool-closed', 'wood-closed'].map((k) => {
      const [m, c] = k.split('-'), r = BS.res[k];
      return { label: KNAME[m] + (c === 'closed' ? ' (밀폐)' : ''), val: r ? '2.0 → ' + r.after.toFixed(1) + ' g' : '–', col: r ? (r.k === 'up' ? COL.chem : r.k === 'down' ? COL.phys : COL.good) : COL.muted, size: 15, on: k === key };
    });
    recPanel(566, 256, 226, 222, '⚖️ 질량 기록', rows);
    drawFire();
  }
  function burnDown(p) {
    if (BS.st === 'run') return false;
    for (let i = 0; i < 3; i++) {
      const y = 112 + i * 40;
      if (inRect(p, { x: 578, y, w: 202, h: 34 })) {
        const k = ['up', 'down', 'same'][i];
        if (!BS.res[bkey()] || BS.st === 'idle') { BS.pred[bkey()] = k; Sound.tick(); burnUI(); }
        return false;
      }
    }
    return false;
  }
  SC.burn = {
    enter() { burnUI(); },
    reset() { burnReset(); },
    update: burnUpdate,
    draw: drawBurn,
    down: burnDown,
    hover(p) { for (let i = 0; i < 3; i++) if (inRect(p, { x: 578, y: 112 + i * 40, w: 202, h: 34 })) return 'pointer'; return null; },
  };
  burnFillGas(); lensFill();

  /* =========================================================
     ④ 원자 모형: 세 반응을 원자 공 모형으로 재생 → 원자 개수 카운터가 같음
     ========================================================= */
  class RollDigit {
    constructor(n) { this.n = n; this.old = n; this.t = 1; this.dir = 1; }
    set(n) { if (n !== this.n) { this.old = this.n; this.dir = n > this.n ? 1 : -1; this.n = n; this.t = 0; } }
    update(dt) { if (this.t < 1) this.t = Math.min(1, this.t + dt * 5); }
    draw(x, y, size, color) {
      const p = this.t, e = outBack(p, 1.2), h = size * 0.95;
      ctx.save();
      if (p < 1) { ctx.globalAlpha = Math.max(0, 1 - p * 1.6); txt(String(this.old), x, y - e * h * this.dir, size, color, 'center', 800); ctx.globalAlpha = 1; }
      ctx.globalAlpha = p < 1 ? Math.min(1, p * 2.2) : 1;
      txt(String(this.n), x, y + (1 - e) * h * this.dir, size, color, 'center', 800);
      ctx.restore();
    }
  }
  const LB4 = { x: 20, y: 50, w: 330, h: 222 }, RB4 = { x: 450, y: 50, w: 330, h: 222 };
  const MID4 = { x: 400, y: 160 };
  const RXS = [
    { key: 'ppt', name: '앙금 생성', eq: 'AgNO₃ + NaCl → AgCl + NaNO₃', note: '은 이온과 염화 이온이 짝을 바꿔요',
      el: ['Ag', 'Na', 'Cl', 'N', 'O'],
      ins: [['AgNO3', 80, 110], ['NaCl', 238, 160]], outs: [['AgCl', 90, 110, 0.2], ['NaNO3', 220, 150, -0.1]] },
    { key: 'gas', name: '기체 발생', eq: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂', note: '생긴 이산화 탄소도 원자 수에 포함해요',
      el: ['Ca', 'C', 'O', 'H', 'Cl'],
      ins: [['CaCO3', 90, 80], ['HCl', 214, 76], ['HCl', 250, 160]], outs: [['CaCl2', 80, 82, 0], ['H2O', 230, 70, 0.2], ['CO2', 160, 160, 0]] },
    { key: 'burn', name: '연소', eq: 'C + O₂ → CO₂', note: '탄소가 산소와 결합해 이산화 탄소가 돼요',
      el: ['C', 'O'],
      ins: [['C', 100, 110], ['O2', 236, 110]], outs: [['CO2', 150, 110, 0]] },
  ];
  const sysA = new Sys(); sysA.sc = 22;
  const AS = { sel: 0, st: 'idle', done: { ppt: false, gas: false, burn: false }, rd: [], flash: 0, init: {}, level: 0 };
  for (let i = 0; i < 5; i++) AS.rd.push([new RollDigit(0), new RollDigit(0)]);
  function atomsFill() {
    sysA.clear(); clearLater(); FX.clear();
    const R = RXS[AS.sel];
    R.ins.forEach((q) => { sysA.addMol(q[0], LB4.x + q[1], LB4.y + q[2] + 6, { mode: 'liquid', amp: 2.4, sc: 22, rot: rand(-0.3, 0.3) }); });
    AS.st = 'idle'; AS.flash = 0;
    AS.init = {}; R.el.forEach((e) => { AS.init[e] = sysA.count(e); });
    AS.rd.forEach((r) => { r[0].n = r[0].old = 0; r[1].n = r[1].old = 0; r[0].t = r[1].t = 1; });
    atomsUI();
  }
  const sideCount = (e, right) => sysA.count(e, (a) => (right ? a.x >= 400 : a.x < 400));
  function atomsUI() {
    $$('#rxSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.rx === AS.sel); b.disabled = AS.st === 'run'; });
    const b = $('#playBtn'); b.disabled = AS.st === 'run';
    b.textContent = AS.st === 'run' ? '⏳ 재생 중…' : AS.st === 'done' ? '↻ 다시 재생' : '▶ 반응 재생';
    $('#atomsNote').textContent = RXS[AS.sel].note;
  }
  $$('#rxSeg button').forEach((b) => b.addEventListener('click', () => { if (AS.st === 'run') return; Sound.click(); AS.sel = +b.dataset.rx; atomsFill(); }));
  $('#playBtn').addEventListener('click', () => { Sound.click(); if (AS.st === 'done') atomsFill(); atomsPlay(); });
  function atomsPlay() {
    if (AS.st === 'run') return;
    const R = RXS[AS.sel];
    AS.st = 'run'; hideHint(); atomsUI(); sfx.zap();
    react(sysA, {
      ins: sysA.mols.slice(), at: MID4, gather: 1.0, shake: 0.7, spread: 1.1,
      onFlash(p) { AS.flash = 1; FX.burst(p.x, p.y, { count: 18, speed: 160, life: 0.8, size: 3.8, colors: ['#fff6c2', '#ffd23f', '#ff9f3a'], shape: 'star', gravity: 0 }); sfx.pop(); },
      outs: R.outs.map((o) => ({ type: o[0], cx: RB4.x + o[1], cy: RB4.y + o[2] + 6, rot: o[3], move: 1.5, after: (m) => { m.mode = 'liquid'; m.ax = m.cx; m.ay = m.cy; m.amp = 2.4; } })),
      onDone() { AS.st = 'done'; AS.done[R.key] = true; sfx.ding(); okFx(RB4.x + RB4.w / 2, RB4.y + 28, COL.good, true); atomsUI(); },
    });
  }
  function atomsUpdate(dt) {
    sysA.update(dt); AS.flash = Math.max(0, AS.flash - dt * 2);
    const R = RXS[AS.sel];
    R.el.forEach((e, i) => { AS.rd[i][0].set(AS.init[e]); AS.rd[i][1].set(sideCount(e, true)); AS.rd[i][0].update(dt); AS.rd[i][1].update(dt); });
  }
  function drawAtoms(t) {
    const R = RXS[AS.sel];
    // 상자 두 개
    const box = (b, title, col) => {
      panel(b.x, b.y, b.w, b.h, 20, 'rgba(236,244,255,.75)', 12, 4);
      ctx.save(); ctx.strokeStyle = 'rgba(143,163,189,.9)'; ctx.lineWidth = 3.5; D.roundRect(b.x, b.y, b.w, b.h, 20); ctx.stroke(); ctx.restore();
      pill(b.x + b.w / 2, b.y - 2, title, { bg: col, size: 15, pad: 13 });
    };
    box(LB4, '반응 전', '#3f6fe8'); box(RB4, '반응 후', '#0ea5a5');
    D.arrow(362, MID4.y, 438, MID4.y, { color: '#8b5cf6', width: 7, head: 20 });
    // 식
    txt(R.eq, 400, 300 - 12, 17, COL.ink, 'center', 800);
    if (AS.flash > 0) D.glow(MID4.x, MID4.y, 150, '#ffd23f', 0.7 * AS.flash);
    sysA.draw();
    // 원자 수 카운터
    panel(20, 300, 760, 184, 18, '#ffffff', 10, 3);
    txt('원자 수 카운터', 120, 326, 15, COL.ink, 'center', 800);
    txt('반응 전', 330, 326, 14, COL.muted, 'center', 800); txt('반응 후(지금까지)', 470, 326, 13.5, COL.muted, 'center', 800);
    let allEq = AS.st === 'done';
    R.el.forEach((e, i) => {
      const y = 350 + i * 26;
      const Rr = sideCount(e, true), ini = AS.init[e];
      ctx.fillStyle = '#f4f7fc'; D.roundRect(34, y - 11, 520, 24, 10); ctx.fill();
      drawBall(e, 58, y + 1, e === 'H' ? 8 : 10);
      txt(EL[e].name + ' (' + e + ')', 82, y + 6, 14, COL.ink, 'left', 800);
      ctx.save(); ctx.beginPath(); ctx.rect(300, y - 11, 60, 24); ctx.clip(); AS.rd[i][0].draw(330, y + 8, 18, COL.ink); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(440, y - 11, 60, 24); ctx.clip(); AS.rd[i][1].draw(470, y + 8, 18, COL.ink); ctx.restore();
      txt('→', 400, y + 6, 16, COL.muted, 'center', 800);
      const same = AS.st === 'done' && Rr === ini;
      txt(same ? '✔' : '', 520, y + 7, 16, COL.good, 'center', 800);
      if (!same) allEq = false;
    });
    // 오른쪽: 저울 그림 (원자 수가 같으면 수평)
    const bx = 668, by = 396;
    ctx.save();
    ctx.fillStyle = '#9aa7ba'; ctx.beginPath(); ctx.moveTo(bx - 14, by + 44); ctx.lineTo(bx + 14, by + 44); ctx.lineTo(bx + 5, by); ctx.lineTo(bx - 5, by); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx - 66, by - 2); ctx.lineTo(bx + 66, by - 2); ctx.stroke();
    ctx.restore();
    const tot0 = R.el.reduce((a, e) => a + AS.init[e], 0);
    [[bx - 66, '반응 전'], [bx + 66, '반응 후']].forEach((p, k) => {
      ctx.strokeStyle = '#8795ad'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p[0], by - 2); ctx.lineTo(p[0] - 22, by + 24); ctx.moveTo(p[0], by - 2); ctx.lineTo(p[0] + 22, by + 24); ctx.stroke();
      ctx.fillStyle = '#cfd7e4'; D.roundRect(p[0] - 28, by + 22, 56, 8, 4); ctx.fill();
      pill(p[0], by + 46, tot0 + '개', { bg: k === 0 ? '#3f6fe8' : '#0ea5a5', size: 13, pad: 8 });
    });
    if (AS.st === 'done') pill(bx, 340, '원자 수 같음 → 질량 같음', { bg: COL.good, size: 13, pad: 10 });
    else txt('원자 수가 같으면', bx, 346, 13, COL.muted, 'center', 800), txt('질량도 같아요', bx, 363, 13, COL.muted, 'center', 800);
    drawFire();
  }
  SC.atoms = {
    enter() { atomsUI(); },
    reset() { atomsFill(); },
    update: atomsUpdate,
    draw: drawAtoms,
  };
  atomsFill();

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
  const tbl = (head, rows) => '<table><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
  const NOTE_BUOY = '<p class="note">※ 기체의 질량을 잴 때는 공기의 부력이 영향을 줄 수 있어요. 그래서 풍선 대신 <b>단단한 밀폐 용기</b>를 써요.</p>';

  game = SciSim.game({
    simId: 'm3-mass-conservation',
    mount: '#game',
    badge: '질량 지킴이',
    homeHref: '../../index.html#g3',
    featureLabels: {
      ppt: '⚖️ 전자저울과 두 비커 · 🔍 이온 돋보기',
      gas: '🫧 열린 · 닫힌 용기 실험',
      burn: '🔥 연소 실험과 예상 카드',
      atoms: '🔍 원자 공 모형과 원자 카운터',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onHint(m) { if (m.focus) pulseEl(m.focus); },
    onMissionStart(m) { if (m.scene) setScene(m.scene, false); },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '앙금 생성 반응', short: '앙금 생성', icon: '☁️', phase: '실험',
        features: ['ppt'],
        intro: '<p class="si-q">❓ 탐구 질문: 물질이 타서 재만 남으면 질량은 사라진 걸까?</p>' +
          '<p>먼저 눈에 보이는 변화부터 살펴봐요. <b>두 수용액을 섞어</b> 흰색 앙금이 생길 때, 전자저울의 숫자는 어떻게 될까요?</p>' +
          '<p>🔍 이온 돋보기로 입자가 어떻게 달라지는지도 봐요.</p>',
        setup() { setScene('ppt', true); },
        recap: '앙금이 생기는 반응에서도 반응 전후의 질량은 같아요.',
        summary: '<span class="formula" style="font-size:15px">질산 은 + 염화 나트륨 → 염화 은(흰 앙금) + 질산 나트륨</span>' +
          '<ul><li>섞기 전 150.0 g → 섞은 후 150.0 g (변화 없음)</li><li>이온의 짝만 바뀌고, 이온(원자)의 종류와 수는 그대로예요.</li></ul>',
        missions: [
          {
            title: '두 용액을 섞고 질량 비교', scene: 'ppt', focus: '#mixBtn',
            goal: '🧪 두 용액을 섞어 흰색 앙금이 생기는 것을 보고, 섞기 전과 후의 질량을 비교하세요.',
            hint: '🧪 두 용액 섞기 버튼을 눌러요. 저울의 숫자와 오른쪽 질량 기록을 비교해요. 🔍도 켜 보세요.',
            setup() { setScene('ppt', true); pptReset(); },
            check: () => PP.mixed, hold: 0.8,
            status: () => '섞기 ' + mark(PP.st !== 'idle') + ' · 앙금 생성 ' + mark(PP.ppt > 10) + ' · 질량 비교 ' + mark(PP.mixed),
            explain: '섞기 전과 후 모두 <b>150.0 g</b>이에요. 은 이온(Ag⁺)과 염화 이온(Cl⁻)이 만나 <b>염화 은(AgCl, 흰 앙금)</b>이 생기고, 나트륨 이온과 질산 이온은 그대로 녹아 있어요. 입자의 <b>짝만 바뀌었을 뿐</b>이에요.',
          },
          {
            type: 'quiz', title: '질량이 그대로인 까닭', scene: 'ppt',
            goal: '새로운 물질(흰 앙금)이 생겼는데도 질량이 변하지 않았어요. 이 실험으로 알 수 있는 것은?',
            choices: ['화학 반응이 일어나도 반응 전후 물질의 총질량은 같다.', '앙금은 질량이 없어서 저울에 나타나지 않는다.', '이 변화는 화학 반응이 아니다.', '새로운 물질이 생기면 질량이 늘어나야 한다.'],
            answer: 0,
            feedback: ['', '앙금도 질량이 있어요. 용액과 앙금이 모두 비커 안에 있어서 합쳐서 150.0 g이에요.', '흰 앙금이 생겼으니 새 물질이 생긴 화학 반응이에요.', '새 물질이 생겨도 질량이 새로 생기지는 않아요. 총질량은 같아요.'],
            explain: '화학 반응이 일어나도 <b>반응 전 물질의 총질량 = 반응 후 물질의 총질량</b>이에요. 이것을 <b>질량 보존 법칙</b>이라고 해요.',
          },
        ],
      },
      {
        title: '기체 발생 반응', short: '기체 발생', icon: '🫧', phase: '실험',
        features: ['gas'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 앙금이 생겨도 질량은 같았어요. <b>기체가 생기는 반응</b>은 어떨까요?</div>' +
          '<p>탄산 칼슘(대리암)에 묽은 염산을 넣으면 이산화 탄소가 생겨요. <b>열린 용기</b>와 <b>닫힌 용기</b>에서 질량을 비교해 봐요.</p>' + NOTE_BUOY,
        setup() { setScene('gas', true); },
        recap: '기체가 빠져나가면 질량이 줄어 보이지만, 닫힌 용기에서는 질량이 그대로예요.',
        summary: tbl(['용기', '반응 전', '반응 후'], [['열린 용기', '120.0 g', '118.9 g (CO₂ 1.1 g 빠져나감)'], ['닫힌 용기', '120.0 g', '120.0 g'], ['뚜껑을 연 뒤', '120.0 g', '118.9 g']]) +
          '<div class="note">탄산 칼슘 + 염산 → 염화 칼슘 + 물 + 이산화 탄소. 기체의 질량은 부력의 영향이 있을 수 있어 단단한 용기를 써요.</div>',
        missions: [
          {
            title: '열린 용기에서 반응시키기', scene: 'gas', focus: '#gasBtn',
            goal: '열린 용기를 고르고 🧪 반응시킨 뒤, 저울의 숫자가 어떻게 달라지는지 관찰하세요.',
            hint: '「열린 용기」를 고르고 🧪 반응시키기를 눌러요. 이산화 탄소 분자가 어디로 가는지 보세요.',
            setup() { setScene('gas', true); GS.box = 'open'; GS.doneOpen = false; GS.doneClosed = false; GS.doneLid = false; gasReset(); },
            check: () => GS.doneOpen, hold: 0.8,
            status: () => '반응 ' + mark(GS.st !== 'idle' && GS.box === 'open') + ' · 질량 확인 ' + mark(GS.doneOpen) + (GS.st === 'run' ? ' · ' + GS.mass.v.toFixed(1) + ' g' : ''),
            explain: '열린 용기에서는 생긴 <b>이산화 탄소 분자가 공기 중으로 빠져나가</b> 저울의 숫자가 120.0 g → 118.9 g으로 줄었어요(1.1 g).',
          },
          {
            title: '닫힌 용기에서 반응시키고 뚜껑 열기', scene: 'gas', focus: '#boxSeg',
            goal: '닫힌 용기를 골라 반응시킨 뒤 질량을 확인하고, 🔓 뚜껑을 열어 달라지는 질량을 관찰하세요.',
            hint: '「닫힌 용기」를 고르고 반응시킨 뒤, 나타나는 🔓 뚜껑 열기를 눌러요.',
            setup() { setScene('gas', true); GS.box = 'closed'; GS.doneClosed = false; GS.doneLid = false; gasReset(); },
            check: () => GS.doneClosed && GS.doneLid, hold: 0.8,
            status: () => '닫힌 채로 반응 ' + mark(GS.doneClosed) + ' · 뚜껑 열기 ' + mark(GS.doneLid),
            explain: '닫힌 용기에서는 이산화 탄소가 <b>용기 안에 그대로</b> 있어서 질량이 <b>120.0 g으로 일정</b>해요. 뚜껑을 열면 기체가 빠져나가 118.9 g이 돼요.',
          },
          {
            type: 'quiz', title: '열린 용기에서 질량이 줄어든 까닭', scene: 'gas',
            goal: '열린 용기에서 반응한 뒤 질량이 줄어든 까닭은 무엇일까요?',
            choices: ['반응으로 생긴 이산화 탄소가 공기 중으로 빠져나갔기 때문이다.', '반응하면서 물질이 사라졌기 때문이다.', '염산이 모두 증발했기 때문이다.', '탄산 칼슘이 반응하면 질량이 줄기 때문이다.'],
            answer: 0,
            feedback: ['', '물질은 사라지지 않아요. 닫힌 용기에서는 질량이 그대로였죠.', '증발한 염산이 아니라 새로 생긴 기체가 나간 거예요.', '닫힌 용기에서는 줄지 않았으니 반응 자체로 줄어든 게 아니에요.'],
            explain: '줄어든 1.1 g은 사라진 게 아니라 <b>이산화 탄소 기체의 질량</b>이에요. 기체까지 모두 합치면 반응 전후 질량이 같아요.',
          },
        ],
      },
      {
        title: '연소 반응', short: '연소', icon: '🔥', phase: '실험',
        features: ['burn'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기체가 빠져나가면 질량이 줄어 보였어요. 그럼 <b>물질이 타서 재만 남으면</b> 질량은 사라진 걸까요?</div>' +
          '<p>강철 솜과 나무를 태우기 전에 <b>예상</b>을 골라 보고, 결과를 확인해요. 마지막에는 <b>밀폐 용기</b> 속에서도 태워 봐요.</p>',
        setup() { setScene('burn', true); },
        recap: '열린 공간에서는 산소가 결합하면 늘고 기체가 날아가면 줄지만, 밀폐 용기에서는 일정해요.',
        summary: tbl(['시료', '열린 공간', '밀폐 용기'], [['강철 솜 2.0 g', '2.4 g (증가)', '2.0 g (일정)'], ['나무 2.0 g', '0.4 g (감소)', '2.0 g (일정)']]) +
          '<div class="note">강철 솜은 공기 중의 산소가 결합해 늘고, 나무는 이산화 탄소·수증기가 날아가 줄어요.</div>',
        missions: [
          {
            title: '예상하고 태워 보기 (열린 공간)', scene: 'burn', focus: '#burnBtn',
            goal: '열린 공간에서 강철 솜과 나무를 태우기 전에 질량 변화를 예상하고, 태워서 확인하세요.',
            hint: '재료를 고르고, 오른쪽 🎯 예상 카드에서 하나를 고른 뒤 🔥 버튼을 눌러요.',
            setup() { setScene('burn', true); BS.res = {}; BS.pred = {}; BS.mat = 'wool'; BS.ctn = 'open'; burnReset(); },
            check: () => !!BS.res['wool-open'] && !!BS.res['wood-open'], hold: 0.8,
            status: () => chip(!!BS.res['wool-open'], '강철 솜') + ' · ' + chip(!!BS.res['wood-open'], '나무'),
            explain: '강철 솜은 <b>산소와 결합</b>해 질량이 늘고(2.0 → 2.4 g), 나무는 <b>이산화 탄소와 수증기가 날아가</b> 질량이 줄어요(2.0 → 0.4 g). 사라진 게 아니라 <b>기체의 출입</b> 때문이에요.',
          },
          {
            title: '밀폐 용기 속에서 태우기', scene: 'burn', focus: '#ctnSeg',
            goal: '「밀폐 용기」를 골라 강철 솜이나 나무를 태우고 질량 변화를 확인하세요. (예상 먼저!)',
            hint: '밀폐 용기를 고르고 예상을 선택한 뒤 태워 봐요. 기체가 용기 밖으로 나갈 수 있을까요?',
            setup() { setScene('burn', true); BS.ctn = 'closed'; burnReset(); },
            check: () => !!BS.res['wool-closed'] || !!BS.res['wood-closed'], hold: 0.8,
            status: () => '밀폐 용기 연소 ' + mark(!!BS.res['wool-closed'] || !!BS.res['wood-closed']),
            explain: '밀폐 용기에서는 <b>기체가 드나들지 못하므로 질량이 2.0 g으로 일정</b>해요. 반응에 쓰인 산소와 생긴 기체가 모두 용기 안에 있기 때문이에요.',
          },
          {
            type: 'quiz', title: '강철 솜의 질량이 늘어난 까닭', scene: 'burn',
            goal: '강철 솜을 열린 공간에서 태웠더니 질량이 늘어났어요. 그 까닭은?',
            choices: ['공기 중의 산소가 철과 결합했기 때문이다.', '철이 새로 만들어졌기 때문이다.', '불꽃의 열이 질량을 더했기 때문이다.', '강철 솜이 부풀어 올랐기 때문이다.'],
            answer: 0,
            feedback: ['', '철 원자는 새로 생기지 않아요.', '열(에너지)이 질량을 더하는 것이 아니에요.', '부피가 아니라 질량이 늘었어요.'],
            explain: '철이 탈 때 <b>산소가 결합</b>해 산화 철이 돼요. 결합한 산소의 질량만큼 늘어난 거예요. 늘어난 만큼의 산소는 공기에서 왔어요.',
          },
        ],
      },
      {
        title: '원자 모형으로 보기', short: '원자 모형', icon: '🔍', phase: '모형',
        features: ['atoms'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기체의 출입까지 따지면 질량은 늘 같았어요. 왜 그럴까요?</div>' +
          '<p>세 반응을 <b>원자 공 모형</b>으로 재생하면서 반응 전후의 <b>원자 개수</b>를 세어 봐요.</p>',
        setup() { setScene('atoms', true); },
        recap: '화학 반응에서 원자의 배열만 바뀌고 원자의 종류와 수는 변하지 않아서 질량이 보존돼요.',
        summary: '<span class="formula" style="font-size:15px">반응 전 물질의 총질량 = 반응 후 물질의 총질량<br>(질량 보존 법칙)</span>' +
          '<ul><li>화학 반응에서는 원자의 <b>배열만</b> 바뀌어요.</li><li>원자의 <b>종류와 수</b>는 변하지 않아요 → 질량도 보존돼요.</li></ul>',
        missions: [
          {
            title: '원자 수 세어 확인하기', scene: 'atoms', focus: '#playBtn',
            goal: '세 반응(앙금 · 기체 발생 · 연소)을 모두 재생하고, 반응 전후의 원자 수가 같은지 확인하세요.',
            hint: '반응을 고르고 ▶ 반응 재생을 눌러요. 카운터의 숫자가 왼쪽에서 오른쪽으로 옮겨 가요.',
            setup() { setScene('atoms', true); AS.done = { ppt: false, gas: false, burn: false }; AS.sel = 0; atomsFill(); },
            check: () => AS.done.ppt && AS.done.gas && AS.done.burn, hold: 0.8,
            status: () => RXS.map((r) => chip(AS.done[r.key], r.name)).join(' · '),
            explain: '어느 반응에서도 반응 전과 후의 <b>원자의 종류와 수가 같아요</b>. 원자의 배열만 달라져 새 물질이 되었을 뿐이에요. 원자 하나의 질량도 그대로이니 <b>총질량이 보존</b>돼요(질량 보존 법칙).',
          },
          {
            type: 'quiz', title: '밀폐 용기 속 양초', scene: 'atoms',
            goal: '뚜껑을 닫은 밀폐 용기 속에서 양초를 태웠어요. 타기 전과 탄 뒤의 용기 전체 질량은?',
            choices: ['줄어든다. 양초가 타서 없어졌으니까.', '늘어난다. 새 물질이 생겼으니까.', '그대로이다. 기체도 용기 안에 있으니까.', '알 수 없다.'],
            answer: 2,
            feedback: ['양초가 변한 물질(이산화 탄소, 수증기)이 모두 용기 안에 있어요.', '새 물질이 생기는 만큼 반응물이 줄어서 총질량은 그대로예요.', '', '질량 보존 법칙으로 알 수 있어요. 원자의 종류와 수가 같아요.'],
            explain: '밀폐 용기 안에서는 양초와 산소가 이산화 탄소와 수증기로 바뀔 뿐, 원자가 나가지도 들어오지도 않아요. 그래서 <b>전체 질량은 일정</b>해요.',
          },
          {
            type: 'quiz', title: '녹슨 철못의 질량', scene: 'atoms',
            goal: '철못이 오래 두면 녹이 슬어요. 녹슨 철못의 질량은 처음 철못과 비교해 어떨까요?',
            choices: ['늘어난다. 공기 중의 산소가 철과 결합하기 때문이다.', '줄어든다. 철이 녹아서 없어지기 때문이다.', '그대로이다. 철이 변하지 않기 때문이다.', '늘어난다. 철이 새로 생기기 때문이다.'],
            answer: 0,
            feedback: ['', '철은 없어지지 않고 산소와 결합한 산화 철이 돼요.', '철이 산화 철로 변했으니 달라져요.', '철 원자는 새로 생기지 않아요. 산소가 더해진 거예요.'],
            explain: '철이 산소와 결합해 <b>산화 철(녹)</b>이 되므로 <b>질량이 늘어요</b>. 결합한 산소의 질량만큼 늘어난 것이고, 질량 보존 법칙에 어긋나지 않아요.',
          },
        ],
      },
    ],
  });

  refreshUI(); pptUI(); gasUI(); burnUI(); atomsUI();
  const LOOP = startLoop(update, draw);
  window.__sim = {
    S, PP, GS, BS, AS, LENS, SC, RXS, OUT, sysI, sysG, sysB, sysL, sysA, get game() { return game; },
    ff: LOOP.ff, freeze: LOOP.freeze, v2s, setScene, pptStart, gasStart, gasLid, gasReset, burnStart, burnReset, atomsPlay, atomsFill, bkey,
  };
})();
