(function () {
  'use strict';
  const VH0 = 486, YS0 = 36;
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
    HCl:  { a: [['H', -0.56, 0], ['Cl', 0.6, 0]], b: [[0, 1, 1]] },
    NaCl: { a: [['Na', -0.62, 0], ['Cl', 0.66, 0]], b: [[0, 1, 1]] },
    AgCl: { a: [['Ag', -0.62, 0], ['Cl', 0.66, 0]], b: [[0, 1, 1]] },
    AgNO3: { a: shiftA(NO3, -0.8, -0.1).concat([['Ag', 1.3, 0.95]]), b: NO3B.concat([[3, 4, 1]]) },
    NaNO3: { a: shiftA(NO3, -0.8, -0.1).concat([['Na', 1.3, 0.95]]), b: NO3B.concat([[3, 4, 1]]) },
    CaCO3: { a: [['C', -0.6, 0], ['O', -0.6, -1.08], ['O', -1.55, 0.54], ['O', 0.35, 0.54], ['Ca', 1.45, 0.5]], b: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [3, 4, 1]] },
    CaCl2: { a: [['Ca', 0, 0], ['Cl', -1.5, 0.15], ['Cl', 1.5, 0.15]], b: [[0, 1, 1], [0, 2, 1]] },
    Fe2O3: { a: [['Fe', -0.95, 0.3], ['Fe', 0.95, 0.3], ['O', 0, 0.45], ['O', -0.95, -0.7], ['O', 0.95, -0.7]], b: [[0, 2, 1], [1, 2, 1], [0, 3, 1], [1, 4, 1]] },
  };
  Object.keys(TPL).forEach((k) => {
    const t = TPL[k]; let r = 0;
    t.a.forEach((q) => { r = Math.max(r, Math.hypot(q[1], q[2]) + EL[q[0]].r); });
    t.rad = r;
  });

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
      return { type, cx, cy, vx: 0, vy: 0, rot: o.rot || 0, vr: o.vr || 0, mode: o.mode || 'gas', box: o.box || null, sc: o.sc || this.sc, atoms: [], ax: cx, ay: cy, amp: o.amp != null ? o.amp : 3, ph: Math.random() * 6.28, jit: 0, scl: o.scl != null ? o.scl : 1, speed: o.speed != null ? o.speed : 40, life: o.life, age: 0, tag: o.tag };
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
        const dx = c.x - a.x, dy = c.y - a.y, len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
        const msc = (a.mol ? a.mol.sc : (c.mol ? c.mol.sc : sc));
        const lw = Math.max(2, msc * 0.13) * b.w, gap = lw * 1.3;
        ctx.save(); ctx.globalAlpha *= Math.min(a.alpha, c.alpha) * Math.min(1, b.w * 1.5); ctx.lineCap = 'round';
        for (let k = 0; k < b.order; k++) {
          const off = (k - (b.order - 1) / 2) * gap;
          const x1 = a.x + nx * off, y1 = a.y + ny * off, x2 = c.x + nx * off, y2 = c.y + ny * off;
          ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = lw + 1.6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.strokeStyle = '#e6ebf3'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.restore();
      }
      const L = this.atoms;
      for (let i = 0; i < L.length; i++) {
        const a = L[i];
        const msc = a.mol ? a.mol.sc : sc;
        drawBall(a.sym, a.x, a.y, EL[a.sym].r * msc * a.s, a.alpha);
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
      else { const lower = (T / Math.pow(10, k - 1)) % 10; off = lower > 9 ? lower - 9 : 0; }
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
     중3 Ⅰ. 화학 반응의 규칙성 — 물리 변화와 화학 변화  [9과16-01]
     물리 변화와 화학 변화의 의미를 알고, 화학 변화에서 새로운 물질이 생성됨을 관찰할 수 있다.
     ① 관찰: 종이·설탕을 두 가지 방법으로 바꾸기 → ② 실험: 새 물질의 증거 4가지 + 스티커
     → ③ 모형: 물이 끓음 vs 물의 전기 분해(🔍 입자 모형) → ④ 적용: 카드 10장 분류
     ※ 화학 반응식·질량 보존은 다음 차시. 화학식은 모형 이름표 정도만 사용.
     ========================================================= */
  const S = { scene: 'obs', sceneT: 0 };
  const SC = {};
  const DR = { fn: null };
  const FIRE = new SciSim.Particles();         // 불꽃 · 불티 (밝게 겹쳐 그림)
  function drawFire() { FIRE.draw(ctx); }
  const SCENE_LABEL = {
    obs: '📄 종이와 설탕을 두 가지 방법으로 바꿔 봐요',
    lab: '🧪 네 실험대에서 새 물질의 증거를 찾아요',
    model: '🔍 같은 물, 다른 변화를 입자 모형으로 비교해요',
    sort: '🗃️ 카드를 물리 변화 · 화학 변화 상자로 끌어 넣어요',
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
    const seg = $('#sceneSeg');
    seg.hidden = !on('lab');
    sceneBtns.forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    SC[S.scene] && SC[S.scene].ui && SC[S.scene].ui();
  }
  sceneBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, false); }));
  $('#resetBtn').addEventListener('click', () => { Sound.click(); SC[S.scene].reset && SC[S.scene].reset(true); });

  /* =========================================================
     ① 관찰 — 종이 자르기 / 태우기, 설탕 녹이기 / 가열하기
     ========================================================= */
  const AR = { x: 16, y: 52, w: 548, h: 420 };          // 왼쪽 큰 무대
  const BENCH_Y = 396;
  const ACT = {
    cut:      { mat: 'paper', icon: '✂️', name: '종이 자르기',   dur: 3.8, kind: 'same', log: '모양만 변함 · 여전히 종이', res: '모양과 크기만 변했어요. 조각도 여전히 종이예요.' },
    burn:     { mat: 'paper', icon: '🔥', name: '종이 태우기',   dur: 7.2, kind: 'new',  log: '재·연기가 생김 · 종이가 아님', res: '재와 연기가 생겼어요. 다시 종이로 되돌릴 수 없어요.' },
    dissolve: { mat: 'sugar', icon: '💧', name: '설탕 녹이기',   dur: 5.2, kind: 'same', log: '단맛 그대로 · 여전히 설탕', res: '눈에는 안 보여도 설탕은 물에 섞여 있어요. 단맛도 그대로예요.' },
    heat:     { mat: 'sugar', icon: '🔥', name: '설탕 가열하기', dur: 7.6, kind: 'new',  log: '검게 탐 · 탄 냄새 · 설탕 아님', res: '검게 타고 탄 냄새가 나요. 설탕과는 다른 물질이에요.' },
  };
  const ACT_IDS = ['cut', 'burn', 'dissolve', 'heat'];
  const OB = {
    mat: 'paper', act: null, last: null, matK: 0, matGoal: 0,
    done: { cut: false, burn: false, dissolve: false, heat: false },
    paper: { state: 'fresh', p: -0.2, cutA: 0, cutB: 0, ap1: 0, ap2: 0, match: 0, ash: 0, sway: 0 },
    sugar: { diss: 0, cubes: [], heatQ: 0, flame: 0, state: 'fresh', lampOn: 0, bubble: 0 },
  };

  /* ---- 종이 그림(바탕) ---- */
  function makePaperTex(w, h, k) {
    const cv = document.createElement('canvas'); cv.width = w * k; cv.height = h * k;
    const g = cv.getContext('2d'); g.scale(k, k);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#efe9da');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,150,200,.35)'; g.lineWidth = 1;
    for (let y = 22; y < h - 6; y += 15) { g.beginPath(); g.moveTo(8, y); g.lineTo(w - 8, y); g.stroke(); }
    g.strokeStyle = 'rgba(230,100,100,.45)'; g.beginPath(); g.moveTo(24, 0); g.lineTo(24, h); g.stroke();
    g.fillStyle = 'rgba(80,90,110,.55)'; g.font = '700 ' + Math.round(h * 0.11) + 'px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('종이', 34, h * 0.12);
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    return cv;
  }
  const PW = 130, PH = 170, PBW = 52, PBH = 68;
  const PT = makePaperTex(PW, PH, 2);                  // 세로 종이 (태우기)
  const PTL = makePaperTex(230, 150, 2);               // 가로 종이 (자르기)
  const TMP = document.createElement('canvas'); TMP.width = PW * 2; TMP.height = PH * 2;
  const tctx = TMP.getContext('2d');
  const MKc = document.createElement('canvas'); MKc.width = PBW; MKc.height = PBH;
  const LYc = document.createElement('canvas'); LYc.width = PBW; LYc.height = PBH;
  const mctx = MKc.getContext('2d'), lctx = LYc.getContext('2d');
  const MKd = mctx.createImageData(PBW, PBH), LYd = lctx.createImageData(PBW, PBH);
  // 탈 순서 (왼쪽 아래 모서리에서 번져 가며, 가장자리는 들쭉날쭉)
  const BT = new Float32Array(PBW * PBH);
  (function () {
    const gx = 7, gy = 9, g = [];
    for (let i = 0; i < gx * gy; i++) g.push(Math.random());
    const nz = (u, v) => {
      const x = u * (gx - 1), y = v * (gy - 1), x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(gx - 1, x0 + 1), y1 = Math.min(gy - 1, y0 + 1);
      const fx = smooth(x - x0), fy = smooth(y - y0);
      return lerp(lerp(g[y0 * gx + x0], g[y0 * gx + x1], fx), lerp(g[y1 * gx + x0], g[y1 * gx + x1], fx), fy);
    };
    for (let j = 0; j < PBH; j++) for (let i = 0; i < PBW; i++) {
      const u = (i + 0.5) / PBW, v = (j + 0.5) / PBH;
      const d = Math.hypot(u * PW, (1 - v) * PH) / Math.hypot(PW, PH);
      BT[j * PBW + i] = d * 0.78 + nz(u, v) * 0.16 + 0.02;
    }
  })();
  const c1 = (h) => { const m = /#(..)(..)(..)/.exec(h); return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]; };
  const CH = { yel: c1('#ffd24a'), org: c1('#ff5a1f'), dark: c1('#2a1a12'), brn: c1('#8a5a2b') };
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function burnPaintPaper(p) {
    const M = MKd.data, L = LYd.data;
    for (let k = 0; k < PBW * PBH; k++) {
      const v = p - BT[k], o = k * 4;
      let pa = 1, r = 0, g = 0, b = 0, a = 0;
      if (v > 0.03) pa = 1 - smooth((v - 0.03) / 0.13);
      if (v > -0.08 && v <= 0) { a = 0.6 * smooth((v + 0.08) / 0.08); r = CH.brn[0]; g = CH.brn[1]; b = CH.brn[2]; }
      else if (v > 0 && v <= 0.05) { const c = mixc(CH.yel, CH.org, v / 0.05); r = c[0]; g = c[1]; b = c[2]; a = 1; }
      else if (v > 0.05 && v <= 0.17) { const c = mixc(CH.org, CH.dark, smooth((v - 0.05) / 0.06)); r = c[0]; g = c[1]; b = c[2]; a = 1 - smooth((v - 0.1) / 0.07); }
      M[o] = M[o + 1] = M[o + 2] = 255; M[o + 3] = Math.round(pa * 255);
      L[o] = r; L[o + 1] = g; L[o + 2] = b; L[o + 3] = Math.round(a * 255);
    }
    mctx.putImageData(MKd, 0, 0); lctx.putImageData(LYd, 0, 0);
    tctx.globalCompositeOperation = 'source-over'; tctx.clearRect(0, 0, TMP.width, TMP.height);
    tctx.drawImage(PT, 0, 0);
    tctx.globalCompositeOperation = 'destination-in'; tctx.imageSmoothingEnabled = true; tctx.imageSmoothingQuality = 'high';
    tctx.drawImage(MKc, 0, 0, TMP.width, TMP.height);
    tctx.globalCompositeOperation = 'source-over';
    tctx.drawImage(LYc, 0, 0, TMP.width, TMP.height);
  }

  /* ---- 재 더미 ---- */
  const ASH = [];
  for (let i = 0; i < 18; i++) ASH.push({ x: rand(-28, 28), y: rand(-4, 4), w: rand(6, 13), h: rand(3, 6), r: rand(-0.6, 0.6), c: rand(0, 1) });

  /* ---- 활동 시작 ---- */
  const hasHold = () => !!OB.act;
  function resetItem(id) {
    if (id === 'cut' || id === 'burn') {
      const P = OB.paper; P.state = 'fresh'; P.p = -0.2; P.cutA = 0; P.cutB = 0; P.ap1 = 0; P.ap2 = 0; P.match = 0; P.ash = 0;
    } else if (id === 'heat') {
      const G = OB.sugar; G.heatQ = 0; G.state = 'fresh'; G.lampOn = 0; G.bubble = 0;
    } else {
      const G = OB.sugar; G.diss = 0;
      G.cubes = [0, 1, 2].map((i) => ({ x: 285 + i * 3, y: 378 - i * 17, s: 1, st: 'plate', t: 0, rot: rand(-0.2, 0.2) }));
    }
  }
  function obsReset(hard) {
    OB.act = null; FIRE.clear(); FX.clear();
    resetItem('cut'); resetItem('dissolve'); resetItem('heat');
    OB.matGoal = OB.mat === 'paper' ? 0 : 0;
    obsUI();
  }
  function startAct(id) {
    if (OB.act) return;
    const A = ACT[id];
    if (OB.mat !== A.mat) setMat(A.mat);
    resetItem(id);
    FIRE.clear();
    OB.act = { id, t: 0, dur: A.dur, fired: 0 };
    OB.last = id;
    hideHint();
    if (id === 'cut') { OB.view = 'mat'; }
    if (id === 'burn') { OB.view = 'front'; tw(OB.paper, { match: 1 }, 0.7, 'outCubic'); }
    if (id === 'dissolve') { OB.sugar.diss = 0; }
    if (id === 'heat') { tw(OB.sugar, { lampOn: 1 }, 0.5, 'outCubic'); }
    obsUI();
  }
  function endAct() {
    const a = OB.act; if (!a) return;
    OB.done[a.id] = true;
    OB.act = null;
    const A = ACT[a.id];
    if (a.id === 'cut') OB.paper.state = 'cut';
    if (a.id === 'burn') OB.paper.state = 'burnt';
    if (a.id === 'dissolve') OB.sugar.diss = 1;
    if (a.id === 'heat') { OB.sugar.state = 'burnt'; tw(OB.sugar, { lampOn: 0 }, 0.6, 'outCubic'); }
    okFx(A.mat === 'paper' ? 290 : 290, 108, A.kind === 'new' ? COL.chem : COL.phys, false);
    sfx.ding();
    obsUI();
  }
  function setMat(m) {
    OB.mat = m;
    $$('#matSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mat === m));
    OB.view = 'front';
    obsUI();
  }
  function obsUI() {
    const a = OB.mat === 'paper' ? ['✂️ 종이 자르기', '🔥 종이 태우기'] : ['💧 설탕 물에 녹이기', '🔥 설탕 가열하기'];
    $('#actA').textContent = a[0]; $('#actB').textContent = a[1];
    const busy = !!OB.act;
    $('#actA').disabled = busy; $('#actB').disabled = busy;
    $('#obsNote').textContent = busy ? '지켜보는 중…' : (OB.last ? ACT[OB.last].res : '두 가지 방법을 모두 해 보고, 변하기 전과 비교해요.');
  }
  $$('#matSeg button').forEach((b) => b.addEventListener('click', () => { if (OB.act) return; Sound.click(); setMat(b.dataset.mat); }));
  $('#actA').addEventListener('click', () => { Sound.click(); startAct(OB.mat === 'paper' ? 'cut' : 'dissolve'); });
  $('#actB').addEventListener('click', () => { Sound.click(); startAct(OB.mat === 'paper' ? 'burn' : 'heat'); });

  /* ---- 갱신 ---- */
  function obsUpdate(dt) {
    const P = OB.paper, G = OB.sugar;
    OB.matK = SciSim.approach(OB.matK, OB.view === 'mat' ? 1 : 0, dt, 7);
    P.sway += dt;
    const a = OB.act;
    if (a) {
      a.t += dt;
      const t = a.t;
      if (a.id === 'cut') {
        P.cutA = seg(t, 0.35, 1.5); P.cutB = seg(t, 1.9, 3.0);
        P.ap1 = SciSim.approach(P.ap1, P.cutA >= 1 ? 1 : 0, dt, 9);
        P.ap2 = SciSim.approach(P.ap2, P.cutB >= 1 ? 1 : 0, dt, 9);
        if ((P.cutA > 0 && P.cutA < 1) || (P.cutB > 0 && P.cutB < 1)) {
          a.snip = (a.snip || 0) + dt;
          if (a.snip > 0.17) { a.snip = 0; Sound.tone(1500 + Math.random() * 300, 0.04, 'square', 0.025); }
          const pt = scissorsPos();
          if (!RM && Math.random() < 0.5) FX.emit({ x: pt.tx, y: pt.ty, vx: rand(-40, 40), vy: rand(-30, 10), life: 0.7, size: rand(1.5, 2.6), color: '#f5efe0', gravity: 220, shape: 'square', rot: rand(0, 6), vr: rand(-8, 8) });
        }
      } else if (a.id === 'burn') {
        P.p = -0.2 + 1.55 * seg(t, 0.8, 6.6);
        if (t > 1.7 && P.match > 0.5 && !a.matchOff) { a.matchOff = 1; tw(P, { match: 0 }, 0.6, 'inCubic'); }
        if (t > 0.8 && !a.fired) { a.fired = 1; sfx.flame(); }
        burnEmit(dt);
        P.ash = clamp((P.p - 0.55) / 0.75, 0, 1);
      } else if (a.id === 'dissolve') {
        sugarDissolveUpdate(a, dt);
      } else if (a.id === 'heat') {
        G.heatQ = seg(t, 0.8, 7.0);
        G.flame = G.lampOn;
        heatEmit(dt, a);
      }
      if (t >= a.dur) endAct();
    }
    if (G.state === 'burnt' && !OB.act) heatSmoke(dt);
    FIRE.update(dt);
  }
  function burnEmit(dt) {
    const P = OB.paper;
    if (P.p < -0.05 || P.p > 1.45 || RM) return;
    const n = Math.ceil(dt * 160);
    for (let i = 0; i < n; i++) {
      const k = (Math.random() * PBW * PBH) | 0, v = P.p - BT[k];
      if (v > 0.0 && v < 0.06) {
        const i0 = k % PBW, j0 = (k / PBW) | 0;
        const x = 290 - PW / 2 + (i0 + 0.5) / PBW * PW, y = 140 + (j0 + 0.5) / PBH * PH * (1 - 0.06 * smooth(P.p));
        FIRE.emit({ x, y, vx: rand(-12, 12), vy: rand(-70, -30), life: rand(0.35, 0.7), size: rand(5, 10), color: Math.random() < 0.5 ? 'rgba(255,150,40,.55)' : 'rgba(255,90,30,.5)', shape: 'smoke', grow: -6, drag: 1 });
        if (Math.random() < 0.18) FIRE.emit({ x, y, vx: rand(-30, 30), vy: rand(-110, -50), life: rand(0.5, 1.0), size: rand(1.2, 2.2), color: '#ffd45a', gravity: 60, shape: 'circle' });
        if (Math.random() < 0.28) FX.emit({ x, y: y - 6, vx: rand(-10, 10), vy: rand(-55, -30), life: rand(1.2, 2.0), size: rand(8, 13), color: 'rgba(95,95,100,.45)', shape: 'smoke', grow: 11, drag: 0.4 });
      } else if (v > 0.12 && v < 0.18 && Math.random() < 0.05) {
        const i0 = k % PBW, j0 = (k / PBW) | 0;
        FX.emit({ x: 290 - PW / 2 + (i0 + 0.5) / PBW * PW, y: 140 + (j0 + 0.5) / PBH * PH, vx: rand(-14, 14), vy: rand(0, 20), life: 1.3, size: rand(1.4, 2.6), color: '#3b3636', gravity: 240, drag: 0.6, shape: 'square', rot: rand(0, 6), vr: rand(-6, 6) });
      }
    }
  }
  function heatEmit(dt, a) {
    const G = OB.sugar, q = G.heatQ;
    if (RM) return;
    if (q > 0.42 && Math.random() < dt * (5 + q * 14)) FX.emit({ x: 395 + rand(-18, 18), y: 292, vx: rand(-8, 8), vy: rand(-48, -26), life: rand(1.8, 2.6), size: rand(8, 12), color: 'rgba(85,85,92,' + (0.25 + q * 0.3).toFixed(2) + ')', shape: 'smoke', grow: 10, drag: 0.4 });
    if (q > 0.3 && Math.random() < dt * 4) FX.emit({ x: 395 + rand(-20, 20), y: 300, vx: rand(-14, 14), vy: rand(-60, -30), life: 0.7, size: rand(2.5, 4.5), color: '#fff', shape: 'bubble', gravity: -10 });
    // 불꽃 알갱이
    if (Math.random() < dt * 30) FIRE.emit({ x: 395 + rand(-6, 6), y: 340 + rand(-4, 2), vx: rand(-6, 6), vy: rand(-60, -30), life: 0.35, size: rand(3, 6), color: 'rgba(255,170,60,.5)', shape: 'smoke', grow: -6 });
  }
  function heatSmoke(dt) {
    const G = OB.sugar;
    if (RM) return;
    if (Math.random() < dt * 3.4) FX.emit({ x: 395 + rand(-14, 14), y: 292, vx: rand(-6, 6), vy: rand(-40, -24), life: rand(1.6, 2.4), size: rand(8, 11), color: 'rgba(85,85,92,.3)', shape: 'smoke', grow: 10, drag: 0.4 });
  }
  function sugarDissolveUpdate(a, dt) {
    const G = OB.sugar, t = a.t;
    G.cubes.forEach((c, i) => {
      const t0 = 0.3 + i * 0.65;
      c.t = t - t0;
      if (c.t < 0) return;
      const tt = c.t;
      if (c.st === 'plate' && tt >= 0) { c.st = 'fly'; c.x0 = c.x; c.y0 = c.y; }
      if (c.st === 'fly') {
        const k = clamp(tt / 0.7, 0, 1), e = ease.inOutCubic(k);
        c.x = lerp(c.x0, 178 + i * 8, e); c.y = lerp(c.y0, 270, e) - Math.sin(k * Math.PI) * 70; c.rot += dt * 5;
        if (k >= 1) { c.st = 'sink'; sfx.thud(); splash(178 + i * 8, 266); }
      } else if (c.st === 'sink') {
        const k = clamp((tt - 0.7) / 2.8, 0, 1);
        c.y = lerp(270, 352, ease.outQuad(k)); c.x = 178 + i * 8 + Math.sin(tt * 3) * 4; c.s = 1 - smooth(seg(k, 0.15, 1)); c.rot += dt * 0.8;
        if (!RM && c.s > 0.05 && Math.random() < dt * 30) FX.emit({ x: c.x + rand(-9, 9), y: c.y + rand(-6, 6), vx: rand(-14, 14), vy: rand(-8, 16), life: rand(0.8, 1.6), size: rand(1.4, 2.4), color: 'rgba(255,255,255,.9)', shape: 'circle', drag: 1 });
        if (k >= 1) { c.st = 'gone'; }
      }
    });
    G.diss = seg(t, 0.4, 4.4);
  }
  function splash(x, y) {
    if (RM) return;
    for (let i = 0; i < 12; i++) FX.emit({ x: x + rand(-10, 10), y, vx: rand(-60, 60), vy: rand(-170, -80), life: 0.7, size: rand(1.8, 3.4), color: 'rgba(160,210,255,.9)', gravity: 520, shape: 'circle' });
    sfx.glug();
  }

  /* ---- 그리기: 공통 배경 ---- */
  function arenaClip(fn) {
    ctx.save(); D.roundRect(AR.x, AR.y, AR.w, AR.h, 18); ctx.clip(); fn(); ctx.restore();
  }
  function frontBg() {
    panel(AR.x, AR.y, AR.w, AR.h, 18, '#fff', 14, 4);
    arenaClip(() => {
      vgrad(ctx, AR.x, AR.y, AR.w, AR.h, '#f7faff', '#e4ecf8');
      // 벽 타일 무늬
      ctx.strokeStyle = 'rgba(120,140,180,.10)'; ctx.lineWidth = 1;
      for (let x = AR.x; x < AR.x + AR.w; x += 46) { ctx.beginPath(); ctx.moveTo(x, AR.y); ctx.lineTo(x, BENCH_Y); ctx.stroke(); }
      for (let y = AR.y; y < BENCH_Y; y += 46) { ctx.beginPath(); ctx.moveTo(AR.x, y); ctx.lineTo(AR.x + AR.w, y); ctx.stroke(); }
      // 실험대
      vgrad(ctx, AR.x, BENCH_Y, AR.w, AR.y + AR.h - BENCH_Y, '#efd3a6', '#d2a86e');
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(AR.x, BENCH_Y, AR.w, 3);
      ctx.strokeStyle = 'rgba(150,100,50,.13)'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) { const yy = BENCH_Y + 14 + i * 16; ctx.beginPath(); ctx.moveTo(AR.x, yy); ctx.bezierCurveTo(AR.x + 160, yy - 5, AR.x + 360, yy + 6, AR.x + AR.w, yy - 2); ctx.stroke(); }
    });
  }
  function matBg() {
    panel(AR.x, AR.y, AR.w, AR.h, 18, '#6bb383', 14, 4);
    arenaClip(() => {
      vgrad(ctx, AR.x, AR.y, AR.w, AR.h, '#7cc096', '#5aa274');
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
      for (let x = AR.x + 10; x < AR.x + AR.w; x += 28) { ctx.beginPath(); ctx.moveTo(x, AR.y); ctx.lineTo(x, AR.y + AR.h); ctx.stroke(); }
      for (let y = AR.y + 10; y < AR.y + AR.h; y += 28) { ctx.beginPath(); ctx.moveTo(AR.x, y); ctx.lineTo(AR.x + AR.w, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = D.font(12, 700); ctx.textAlign = 'left';
      for (let i = 0; i < 12; i++) ctx.fillText(String(i), AR.x + 10 + i * 56 - 3, AR.y + 14);
    });
  }

  /* ---- 종이 (앞에서 본 모습) ---- */
  function drawTongs(x, y, open) {
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x - 3, y + 6); ctx.lineTo(x + 34, y - 74); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 3, y + 6); ctx.lineTo(x + 52, y - 70); ctx.stroke();
    ctx.strokeStyle = '#8a97ad'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 3, y + 6); ctx.lineTo(x + 34, y - 74); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 3, y + 6); ctx.lineTo(x + 52, y - 70); ctx.stroke();
    D.sphere(x + 20, y - 36, 5, '#5b6a82', { gloss: false });
    ctx.restore();
  }
  function drawDish(cx, y) {
    groundShadow(cx, y + 6, 78, 9, 0.9);
    ctx.save();
    const g = ctx.createLinearGradient(cx - 62, 0, cx + 62, 0); g.addColorStop(0, '#dfe5ee'); g.addColorStop(0.45, '#ffffff'); g.addColorStop(1, '#c4cddb');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 64, y - 20); ctx.quadraticCurveTo(cx - 52, y + 4, cx, y + 4); ctx.quadraticCurveTo(cx + 52, y + 4, cx + 64, y - 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9fabc0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#eef2f8'; ctx.beginPath(); ctx.ellipse(cx, y - 20, 64, 8, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawAsh(cx, y, amt) {
    const n = Math.floor(amt * ASH.length);
    for (let i = 0; i < n; i++) {
      const f = ASH[i];
      ctx.save(); ctx.translate(cx + f.x, y - 21 + f.y - (1 - Math.abs(f.x) / 30) * 2); ctx.rotate(f.r);
      ctx.fillStyle = mix('#58524f', '#9b9693', f.c); D.roundRect(-f.w / 2, -f.h / 2, f.w, f.h, 2); ctx.fill();
      ctx.restore();
    }
  }
  function drawMatch(P) {
    if (P.match <= 0.01) return;
    const k = P.match, hx = lerp(150, 224, ease.outCubic(k)), hy = lerp(380, 312, ease.outCubic(k));
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 2);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#a97c45'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hx - 82, hy + 62); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = '#d9b27a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(hx - 82, hy + 60); ctx.lineTo(hx - 3, hy - 1); ctx.stroke();
    D.sphere(hx, hy, 6.5, '#e2464b', { gloss: true });
    D.flame(hx + 1, hy - 5, 34 * k, now() * 1.2);
    ctx.restore();
  }
  function drawPaperFront(t) {
    const P = OB.paper;
    const px = 290 - PW / 2, py = 140;
    if (P.state === 'burnt' && !OB.act) { drawTongs(290, 140); return; }
    const burning = OB.act && OB.act.id === 'burn';
    ctx.save();
    ctx.translate(290, 140);
    const heat = burning ? clamp(P.p, 0, 1) : 0;
    ctx.rotate(Math.sin(t * 1.3) * 0.012 + heat * 0.03 * Math.sin(t * 6));
    ctx.scale(1 - 0.05 * smooth(heat), 1 - 0.06 * smooth(heat));
    ctx.translate(-290, -140);
    const showBurn = burning || P.p > -0.19;
    if (showBurn) burnPaintPaper(P.p);
    softShadow(px + 4, py + 6, PW - 6, PH - 10, 6, 14, 6, 'rgba(30,40,80,.18)');
    ctx.drawImage(showBurn ? TMP : PT, px, py, PW, PH);
    ctx.restore();
    if (burning && P.p > 0 && P.p < 1.4) {
      // 불빛
      const gl = clamp(Math.sin(smooth(seg(P.p, 0, 1.3)) * Math.PI), 0, 1);
      D.glow(290, 140 + PH * (1 - clamp(P.p, 0, 1) * 0.8), 120, '#ff8a3d', 0.35 * gl);
    }
    drawTongs(290, 140);
  }

  /* ---- 종이 자르기 (위에서 본 모습) ---- */
  const MAT_C = { x: 290, y: 262 }, MAT_W = 230, MAT_H = 150;
  function scissorsPos() {
    const P = OB.paper, cx = MAT_C.x, cy = MAT_C.y;
    if (P.cutA < 1 && P.cutA > 0 || (P.cutB <= 0 && P.cutA > 0)) {
      const y = cy - MAT_H / 2 + P.cutA * MAT_H;
      return { tx: cx, ty: y, ang: Math.PI / 2, on: P.cutA < 1 };
    }
    if (P.cutB > 0) { const x = cx + MAT_W / 2 + P.ap1 * 10 - P.cutB * (MAT_W + 20); return { tx: x, ty: cy, ang: Math.PI, on: P.cutB < 1 }; }
    return { tx: cx, ty: cy - MAT_H / 2 - 20, ang: Math.PI / 2, on: false };
  }
  function drawScissors(tx, ty, ang, open, alpha) {
    const L = 104;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(tx, ty); ctx.rotate(ang); ctx.translate(-L, 0);
    softShadow(0, -10, L + 10, 20, 8, 8, 6, 'rgba(0,0,0,.25)');
    [-1, 1].forEach((s) => {
      ctx.save(); ctx.rotate(s * open);
      const g = ctx.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, '#f3f6fb'); g.addColorStop(1, '#8e9bb0');
      ctx.fillStyle = g; ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(L, 0); ctx.lineTo(-8, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = s > 0 ? '#ef4b4b' : '#3f6fe8'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(-30, -s * 0 + s * 9, 17, 10, s * 0.35, 0, TAU); ctx.stroke();
      ctx.restore();
    });
    D.sphere(0, 0, 4, '#5b6a82', { gloss: false });
    ctx.restore();
  }
  function paperQuad(i, texture) {
    // 사분면 i: 0 왼위, 1 오른위, 2 왼아래, 3 오른아래
    const P = OB.paper, sx = i % 2 === 0 ? -1 : 1, sy = i < 2 ? -1 : 1;
    const hw = MAT_W / 2, hh = MAT_H / 2;
    const qx = i % 2 === 0 ? -hw : 0, qy = i < 2 ? -hh : 0;
    const ox = sx * 9 * P.ap1 * (1 + 0.25 * P.ap2), oy = sy * 9 * P.ap2;
    const rot = P.ap2 * [-0.07, 0.05, 0.06, -0.05][i] + P.ap1 * 0.01 * sx;
    return { qx, qy, ox, oy, rot, hw, hh };
  }
  function drawPaperMat() {
    const P = OB.paper, cx = MAT_C.x, cy = MAT_C.y;
    for (let i = 0; i < 4; i++) {
      const q = paperQuad(i);
      const mx = cx + q.qx + q.hw / 2, my = cy + q.qy + q.hh / 2;
      ctx.save();
      ctx.translate(mx + q.ox, my + q.oy); ctx.rotate(q.rot);
      const ext = P.ap1 + P.ap2 > 0 ? 0 : 1;
      softShadow(-q.hw / 2, -q.hh / 2, q.hw, q.hh, 2, 8 + 6 * (P.ap1 + P.ap2), 3 + 3 * (P.ap1 + P.ap2), 'rgba(10,50,30,.35)');
      ctx.beginPath(); ctx.rect(-q.hw / 2 - ext, -q.hh / 2 - ext, q.hw + ext * 2, q.hh + ext * 2); ctx.clip();
      ctx.drawImage(PTL, -q.hw / 2 - (i % 2 === 0 ? 0 : q.hw), -q.hh / 2 - (i < 2 ? 0 : q.hh), MAT_W, MAT_H);
      ctx.restore();
    }
    // 자르는 선 (잘린 부분)
    ctx.save(); ctx.strokeStyle = 'rgba(70,60,40,.5)'; ctx.lineWidth = 1.6;
    if (P.cutA > 0 && P.ap1 < 0.2) { ctx.beginPath(); ctx.moveTo(cx, cy - MAT_H / 2); ctx.lineTo(cx, cy - MAT_H / 2 + P.cutA * MAT_H); ctx.stroke(); }
    if (P.cutB > 0 && P.ap2 < 0.2) { ctx.beginPath(); ctx.moveTo(cx + MAT_W / 2 + P.ap1 * 10, cy); ctx.lineTo(cx + MAT_W / 2 + P.ap1 * 10 - P.cutB * (MAT_W + P.ap1 * 20), cy); ctx.stroke(); }
    ctx.restore();
  }

  /* ---- 설탕 ---- */
  function cubeDraw(x, y, s, rot) {
    if (s <= 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    softShadow(-11, -11, 22, 22, 4, 6, 3, 'rgba(30,40,80,.25)');
    const g = ctx.createLinearGradient(-11, -11, 11, 11); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dfe6f1');
    ctx.fillStyle = g; D.roundRect(-11, -11, 22, 22, 4); ctx.fill();
    ctx.strokeStyle = '#b9c4d6'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-7, -8, 6, 3); ctx.fillRect(2, 1, 3, 3);
    ctx.restore();
  }
  function drawSugarStations(t) {
    const G = OB.sugar;
    // ---- 왼쪽: 물이 든 비커 + 설탕 접시
    const bx = 118, by = 252, bw = 112, bh = 140;
    const plate = (px, py) => {
      groundShadow(px, py + 4, 46, 7, 0.8);
      const g = ctx.createLinearGradient(px - 40, 0, px + 40, 0); g.addColorStop(0, '#eef2f8'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#c9d2e0');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, 44, 9, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#a8b3c6'; ctx.lineWidth = 1.5; ctx.stroke();
    };
    plate(292, 391);
    // 비커 속 물 (설탕이 녹으면 아주 살짝 빛남)
    D.beaker(bx, by, bw, bh, { level: 0.62, liquid: '#8ccaff', t, ticks: 5, wave: 1.4 });
    if (G.diss > 0 && G.diss < 1 && !RM) {
      // 녹으며 번지는 줄무늬
      ctx.save(); D.roundRect(bx + 3, by + bh * 0.4, bw - 6, bh * 0.58, 8); ctx.clip();
      const a = Math.sin(G.diss * Math.PI) * 0.35;
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let y = 0; y <= 60; y += 6) { const xx = bx + 30 + i * 18 + Math.sin(t * 1.6 + y * 0.12 + i) * 8; if (y === 0) ctx.moveTo(xx, by + 80); else ctx.lineTo(xx, by + 80 + y); }
        ctx.stroke();
      }
      ctx.restore();
    }
    txt('물', bx + bw / 2, by + bh + 20, 14, '#5d6879', 'center', 800);
    // 설탕 조각
    G.cubes.forEach((c) => { if (c.st !== 'gone') cubeDraw(c.x, c.y, c.s, c.rot); });
    txt('설탕', 292, 414, 14, '#7a5a2c', 'center', 800);
    // ---- 오른쪽: 알코올램프 + 숟가락
    const lx = 395, ly = 392;
    groundShadow(lx, ly + 2, 40, 7, 0.9);
    ctx.save();
    const lg = ctx.createLinearGradient(lx - 30, 0, lx + 30, 0); lg.addColorStop(0, 'rgba(190,225,255,.9)'); lg.addColorStop(0.5, 'rgba(235,248,255,.95)'); lg.addColorStop(1, 'rgba(160,200,235,.9)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(lx - 12, ly - 46); ctx.quadraticCurveTo(lx - 34, ly - 40, lx - 32, ly - 14); ctx.quadraticCurveTo(lx - 32, ly, lx - 20, ly); ctx.lineTo(lx + 20, ly); ctx.quadraticCurveTo(lx + 32, ly, lx + 32, ly - 14); ctx.quadraticCurveTo(lx + 34, ly - 40, lx + 12, ly - 46); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(lx - 24, ly - 22, 5, 16);
    ctx.fillStyle = '#9aa7ba'; D.roundRect(lx - 12, ly - 56, 24, 12, 3); ctx.fill();
    ctx.fillStyle = '#f2e4c4'; ctx.fillRect(lx - 3, ly - 66, 6, 12);
    ctx.restore();
    if (G.lampOn > 0.02) D.flame(lx, ly - 64, 42 * G.lampOn, t);
    // 스탠드 + 숟가락
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(515, ly + 2); ctx.lineTo(515, 230); ctx.stroke();
    ctx.strokeStyle = '#a7b3c6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(513, ly); ctx.lineTo(513, 232); ctx.stroke();
    ctx.fillStyle = '#6b778c'; D.roundRect(480, ly - 2, 70, 10, 5); ctx.fill();
    ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(515, 262); ctx.lineTo(455, 292); ctx.stroke();
    // 숟가락 자루 + 그릇
    const sg = ctx.createLinearGradient(0, 270, 0, 310); sg.addColorStop(0, '#f1f4f9'); sg.addColorStop(1, '#8d99ad');
    ctx.strokeStyle = sg; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(470, 284); ctx.lineTo(412, 300); ctx.stroke();
    ctx.fillStyle = sg; ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(366, 296); ctx.quadraticCurveTo(366, 322, 398, 322); ctx.quadraticCurveTo(430, 322, 430, 296); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // 숟가락 속 설탕 (가열할수록 색이 변함)
    const q = G.heatQ;
    let col = '#ffffff';
    if (q < 0.22) col = '#ffffff'; else if (q < 0.4) col = mix('#ffffff', '#f6e3a6', seg(q, 0.22, 0.4)); else if (q < 0.65) col = mix('#f6e3a6', '#c47a22', seg(q, 0.4, 0.65)); else if (q < 0.85) col = mix('#c47a22', '#4a2410', seg(q, 0.65, 0.85)); else col = mix('#4a2410', '#14100e', seg(q, 0.85, 1));
    ctx.save();
    ctx.beginPath(); ctx.moveTo(369, 296); ctx.quadraticCurveTo(369, 318, 398, 318); ctx.quadraticCurveTo(427, 318, 427, 296); ctx.closePath(); ctx.clip();
    const melt = smooth(seg(q, 0.2, 0.42));
    const top = lerp(288 - 6, 298, melt);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(366, 330);
    ctx.lineTo(366, top + 6);
    const puff = G.state === 'burnt' ? 1 : seg(q, 0.7, 1);
    for (let x = 366; x <= 430; x += 6) { const bump = (1 - melt) * (Math.sin(x * 0.9) * 3 + 3) + puff * (Math.abs(Math.sin(x * 0.5 + t * 3)) * 8); ctx.lineTo(x, top - bump); }
    ctx.lineTo(430, 330); ctx.closePath(); ctx.fill();
    if (melt > 0.5 && q < 0.9) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(374, top + 2, 18, 3); }
    ctx.restore();
    if (q > 0.55 && G.state !== 'burnt' && !RM) {
      // 탄 냄새 (물결 줄)
      ctx.save(); ctx.strokeStyle = 'rgba(160,110,60,' + (0.55 * seg(q, 0.55, 0.7)).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let y = 0; y < 50; y += 4) { const xx = 440 + i * 14 + Math.sin(t * 3 + y * 0.18 + i) * 5; if (y === 0) ctx.moveTo(xx, 262); else ctx.lineTo(xx, 262 - y); } ctx.stroke(); }
      ctx.restore();
      pill(470, 214, '탄 냄새!', { bg: '#a56a2a', size: 13, pad: 8 });
    }
    txt('설탕 가열', 395, 414, 14, '#7a5a2c', 'center', 800);
  }

  /* ---- 오른쪽 관찰 기록 ---- */
  function drawLog() {
    const x = 578, y = AR.y, w = 206, h = AR.h;
    panel(x, y, w, h, 16, '#ffffff', 12, 4);
    txt('📋 관찰 기록', x + w / 2, y + 28, 17, COL.ink, 'center', 800);
    ACT_IDS.forEach((id, i) => {
      const A = ACT[id], ry = y + 44 + i * 84, d = OB.done[id];
      const cur = OB.act && OB.act.id === id;
      ctx.fillStyle = d ? (A.kind === 'new' ? '#fff3ea' : '#eaf2ff') : '#f4f6fa';
      D.roundRect(x + 10, ry, w - 20, 76, 12); ctx.fill();
      if (cur) { ctx.strokeStyle = rgba(COL.sub, 0.4 + 0.4 * Math.sin(now() * 7)); ctx.lineWidth = 3; D.roundRect(x + 10, ry, w - 20, 76, 12); ctx.stroke(); }
      ctx.fillStyle = d ? (A.kind === 'new' ? COL.chem : COL.phys) : '#cbd3df'; D.roundRect(x + 10, ry, 7, 76, 4); ctx.fill();
      txt(A.icon + ' ' + A.name, x + 26, ry + 24, 15, d ? COL.ink : COL.muted, 'left', 800);
      if (d) { textBlock(A.log, x + 26, ry + 46, w - 52, 13, A.kind === 'new' ? '#b4440f' : '#1d5fc9', 'left', 17, 800); }
      else txt(cur ? '관찰 중…' : '아직 안 해 봤어요', x + 26, ry + 48, 13, '#8995a8', 'left', 700);
    });
    // 범례
    ctx.fillStyle = COL.phys; D.roundRect(x + 16, y + h - 46, 14, 14, 4); ctx.fill(); txt('같은 물질', x + 36, y + h - 34, 13, COL.muted, 'left', 700);
    ctx.fillStyle = COL.chem; D.roundRect(x + 112, y + h - 46, 14, 14, 4); ctx.fill(); txt('다른 물질', x + 132, y + h - 34, 13, COL.muted, 'left', 700);
    txt('(변한 뒤의 물질)', x + w / 2, y + h - 14, 12.5, '#8995a8', 'center', 700);
  }

  SC.obs = {
    enter() { obsUI(); },
    reset() { obsReset(true); setMat(OB.mat); },
    update: obsUpdate,
    draw(t) {
      const k = OB.matK;
      if (k < 0.98) {
        frontBg();
        arenaClip(() => {
          if (OB.mat === 'paper') {
            drawDish(290, BENCH_Y + 14);
            drawAsh(290, BENCH_Y + 14, OB.paper.ash);
            if (OB.paper.state === 'cut' && k < 0.02) { /* 자른 뒤 앞 화면에는 종이를 다시 걸지 않음 */ }
            drawPaperFront(t);
            drawMatch(OB.paper);
            txt('종이', 290, 438, 14, '#7a5a2c', 'center', 800);
          } else {
            drawSugarStations(t);
          }
        });
      }
      if (k > 0.02) {
        ctx.save(); ctx.globalAlpha = k;
        matBg();
        arenaClip(() => {
          groundShadow(MAT_C.x, MAT_C.y + MAT_H / 2 + 8, 150, 14, 0.5);
          drawPaperMat();
          const sp = scissorsPos(), A = OB.act;
          const on_ = A && A.id === 'cut' && sp.on;
          if (A && A.id === 'cut') {
            const open = 0.07 + 0.2 * (0.5 + 0.5 * Math.sin(OB.act.t * 18));
            // 날 끝이 자르는 위치
            drawScissors(sp.tx, sp.ty, sp.ang, on_ ? open : 0.3, 1);
          }
        });
        ctx.restore();
      }
      drawLog();
      // 결과 한 줄
      if (OB.last && OB.done[OB.last] && !OB.act) {
        const A = ACT[OB.last];
        pill(AR.x + AR.w / 2, 496, A.res, { bg: A.kind === 'new' ? '#b4440f' : '#1d5fc9', size: 15, pad: 14 });
      }
      FX.draw && 0;
      drawFire();
    },
  };
  // 자르는 중에는 종이 위에 눌려 있던 연기 등이 없으므로, 장면 위 효과는 공통 FX가 그림
  SC.obs.status = () => ACT_IDS.map((id) => ACT[id].icon + ' ' + ACT[id].name.replace(/종이 |설탕 /, '') + ' ' + mark(OB.done[id])).join(' · ');
  OB.view = 'front';
  resetItem('cut'); resetItem('dissolve'); resetItem('heat');

  /* =========================================================
     ② 실험 — 새 물질이 생긴 증거 4가지 (실험대 4개 + 증거 스티커)
     ========================================================= */
  const LAB = [
    { name: '마그네슘 리본 + 묽은 염산', dur: 5.4, ev: 'gas',   res: '기포(수소 기체)가 계속 생겨요.', short: '🫧 마그네슘' },
    { name: '염화 나트륨 수용액 + 질산 은 수용액', dur: 5.0, ev: 'ppt', res: '흰색 앙금(염화 은)이 가라앉아요.', short: '☁️ 앙금' },
    { name: '구리판 가열', dur: 5.6, ev: 'color', res: '붉은 구리가 검게 변했어요.', short: '🎨 구리' },
    { name: '강철 솜 연소', dur: 5.6, ev: 'light', res: '밝은 빛과 열을 내며 타요.', short: '✨ 강철 솜' },
  ];
  const EVID = {
    gas:   { label: '🫧 기체 발생', color: '#3f8cf0' },
    ppt:   { label: '☁️ 앙금 생성', color: '#7384a0' },
    color: { label: '🎨 색 변화',   color: '#e8832b' },
    light: { label: '✨ 빛·열 발생', color: '#d9a000' },
  };
  const CARD = { y: 44, w: 186, h: 340 };
  const cardX = (i) => 12 + i * 194;
  const cardC = (i) => cardX(i) + CARD.w / 2;
  const LB = LAB.map(() => ({ st: 'idle', q: 0, t: 0, stk: null, shake: 0, puffs: [], drops: [], pulse: 0 }));
  const LS = { sel: 0, shaken: new Set() };
  const dragL = new DragSet();
  const STK_Y = 458;
  ['gas', 'ppt', 'color', 'light'].forEach((k, i) => {
    dragL.add({ kind: k, w: 166, h: 42, hx: 115 + i * 190, hy: STK_Y, x: 115 + i * 190, y: STK_Y, slot: -1, wrong: false });
  });
  // 강철 솜 (구불구불한 실 가닥)
  const WOOL = [];
  for (let i = 0; i < 52; i++) {
    const a0 = rand(0, TAU), rr = rand(10, 36);
    const x0 = Math.cos(a0) * rr, y0 = Math.sin(a0) * rr * 0.9;
    const a1 = a0 + rand(-1.6, 1.6), r1 = rand(10, 38);
    WOOL.push({ x0, y0, x1: Math.cos(a1) * r1, y1: Math.sin(a1) * r1 * 0.9, cx: rand(-40, 40), cy: rand(-36, 36), ht: clamp((0.5 + (y0 + rand(-6, 6)) / 74), 0, 1), w: rand(0.8, 1.7) });
  }
  const labDone = () => LB.every((e) => e.st === 'done');
  const nLabDone = () => LB.filter((e) => e.st === 'done').length;
  const nPlaced = () => dragL.items.filter((s) => s.slot >= 0).length;
  const nStickRight = () => dragL.items.filter((s) => s.slot >= 0 && LAB[s.slot].ev === s.kind).length;

  function labReset(hard) {
    LB.forEach((e) => { e.st = 'idle'; e.q = 0; e.t = 0; e.stk = null; e.puffs = []; e.drops = []; e.pulse = 0; });
    dragL.items.forEach((s) => { s.slot = -1; s.wrong = false; s.tx = s.hx; s.ty = s.hy; s.w = 166; });
    LS.sel = 0; LS.shaken = new Set(); FIRE.clear(); FX.clear();
    labUI();
  }
  function labStart(i) {
    const e = LB[i];
    if (e.st === 'run') return;
    if (e.st === 'done') { e.st = 'idle'; e.q = 0; e.t = 0; e.puffs = []; e.drops = []; FIRE.clear(); }
    e.st = 'run'; e.t = 0; e.q = 0;
    if (i === 1) { e.dd = [0.5, 1.15, 1.8, 2.45]; e.dn = 0; }
    if (i === 3 || i === 2) sfx.flame();
    if (i === 0) sfx.fizz();
    hideHint(); labUI();
  }
  function labUI() {
    $$('#labSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.lab === LS.sel));
    const e = LB[LS.sel];
    $('#labGo').textContent = e.st === 'run' ? '⏳ 실험 중…' : e.st === 'done' ? '↻ 다시 해 보기' : '▶ 실험 시작';
    $('#labGo').disabled = e.st === 'run';
    $('#labNote').innerHTML = nLabDone() < 4 ? '🥽 실제 실험에서는 보안경을 꼭 써요.<br>실험대를 눌러도 시작돼요.' : '👇 아래 <b>증거 스티커</b>를 알맞은 실험대에 끌어 붙여요.';
  }
  $$('#labSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); LS.sel = +b.dataset.lab; labUI(); }));
  $('#labGo').addEventListener('click', () => { Sound.click(); labStart(LS.sel); });

  function labEmit(i, dt) {
    const e = LB[i], c = cardC(i), q = e.q, t = e.t;
    if (i === 0) {
      const rate = 26 * (1 - 0.55 * q);
      let n = rate * dt; while (n > 0 && (n >= 1 || Math.random() < n)) { n -= 1;
        const y0 = 262 - rand(0, 40) * (1 - q * 0.5);
        const sp = rand(55, 85);
        FX.emit({ x: c + rand(-8, 8), y: y0, vx: rand(-4, 4), vy: -sp, life: Math.max(0.2, (y0 - 214) / sp), size: rand(1.8, 4.2), color: '#aee0ff', shape: 'bubble' });
      }
      if (!RM && Math.random() < dt * 14) FX.emit({ x: c + rand(-14, 14), y: 212, vx: rand(-20, 20), vy: rand(-60, -25), life: 0.5, size: rand(1.2, 2), color: 'rgba(200,235,255,.9)', shape: 'circle', gravity: 200 });
      if (!RM && Math.random() < dt * 5) FX.emit({ x: c + rand(-6, 6), y: 150, vx: rand(-6, 6), vy: rand(-28, -14), life: 1.3, size: rand(7, 10), color: 'rgba(170,215,255,.35)', shape: 'smoke', grow: 8 });
    } else if (i === 1) {
      while (e.dn < e.dd.length && t >= e.dd[e.dn]) {
        e.drops.push({ y: 182, v: 0, c: 0, x: c + rand(-3, 3) }); e.dn++; Sound.tone(900, 0.04, 'sine', 0.05);
      }
      for (let k = e.drops.length - 1; k >= 0; k--) {
        const d = e.drops[k]; d.v += 520 * dt; d.y += d.v * dt;
        if (d.y >= 222) {
          e.drops.splice(k, 1);
          for (let j = 0; j < 4; j++) e.puffs.push({ x: d.x + rand(-6, 6), y: 226 + rand(0, 6), r: rand(5, 9), vr: rand(14, 24), vx: rand(-6, 6), vy: rand(6, 20), a: 0.95, age: 0 });
          if (!RM) for (let j = 0; j < 4; j++) FX.emit({ x: d.x, y: 220, vx: rand(-40, 40), vy: rand(-90, -40), life: 0.45, size: 1.8, color: 'rgba(220,235,255,.9)', gravity: 500 });
          sfx.glug();
        }
      }
      e.puffs.forEach((p) => { p.age += dt; p.r += p.vr * dt * Math.exp(-p.age * 0.8); p.x += p.vx * dt; p.y += p.vy * dt; p.a = Math.max(0, 0.95 - p.age * 0.5); });
      e.puffs = e.puffs.filter((p) => p.a > 0.02);
    } else if (i === 2) {
      if (!RM && Math.random() < dt * 20) FIRE.emit({ x: c + rand(-5, 5), y: 276, vx: rand(-6, 6), vy: rand(-50, -28), life: 0.3, size: rand(3, 5), color: 'rgba(255,170,60,.5)', shape: 'smoke', grow: -5 });
    } else if (i === 3) {
      if (RM) return;
      const g = Math.sin(Math.PI * clamp(q * 1.05, 0, 1));
      if (Math.random() < dt * 24) FIRE.emit({ x: c + rand(-5, 5), y: 276, vx: rand(-6, 6), vy: rand(-50, -28), life: 0.3, size: rand(3, 5), color: 'rgba(255,170,60,.5)', shape: 'smoke', grow: -5 });
      let n = g * 70 * dt; while (n > 0 && (n >= 1 || Math.random() < n)) { n -= 1;
        const gy = 232 + 36 - clamp(q * 1.25, 0, 1) * 72 + rand(-8, 8);
        const a = rand(-Math.PI, 0), sp = rand(70, 190);
        FIRE.emit({ x: c + rand(-24, 24), y: gy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: rand(0.5, 1.1), size: rand(1.2, 2.4), color: Math.random() < 0.5 ? '#ffe27a' : '#ff9a3a', gravity: 360, shape: 'circle', drag: 0.6 });
      }
      if (g > 0.4 && Math.random() < dt * 5) FX.emit({ x: c + rand(-14, 14), y: 190, vx: rand(-8, 8), vy: rand(-36, -20), life: 1.6, size: rand(8, 12), color: 'rgba(120,115,115,.25)', shape: 'smoke', grow: 10 });
    }
  }
  function labFinish(i) {
    const e = LB[i];
    e.st = 'done'; e.q = 1; e.pulse = 1;
    okFx(cardC(i), 150, COL.chem, false);
    labUI();
  }

  function labUpdate(dt) {
    LB.forEach((e, i) => {
      if (e.st === 'run') {
        e.t += dt; e.q = clamp(e.t / LAB[i].dur, 0, 1);
        labEmit(i, dt);
        if (e.q >= 1) labFinish(i);
      }
      if (e.pulse > 0) e.pulse = Math.max(0, e.pulse - dt * 1.2);
      if (e.shake > 0) e.shake = Math.max(0, e.shake - dt * 3);
    });
    dragL.update(dt);
    FIRE.update(dt);
  }

  /* ---- 실험대 그림 ---- */
  function glassTube(c, top, h, w, level, liquid, t) {
    D.testTube(c, top, w, h, { level, liquid, glass: '#8fa3bd' });
  }
  function drawLabVessel(i, t) {
    const e = LB[i], c = cardC(i), q = e.q;
    const gy = 282;
    if (i === 0) {
      // 시험관 받침대
      groundShadow(c, gy + 4, 50, 7, 0.7);
      ctx.fillStyle = '#c99a5f'; D.roundRect(c - 46, gy - 8, 92, 12, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(c - 44, gy - 8, 88, 3);
      D.testTube(c, 140, 44, 140, { level: 0.62, liquid: '#bfe3ff', glass: '#8fa3bd' });
      // 마그네슘 리본 (점점 짧아짐)
      const len = lerp(70, 6, ease.inOutQuad(q));
      ctx.save(); ctx.strokeStyle = '#c9d0db'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c - 6, 264); ctx.bezierCurveTo(c - 12, 264 - len * 0.35, c + 8, 264 - len * 0.55, c + 2, 264 - len); ctx.stroke();
      ctx.strokeStyle = '#f2f5fa'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(c - 7, 262); ctx.bezierCurveTo(c - 13, 262 - len * 0.35, c + 7, 262 - len * 0.55, c + 1, 262 - len); ctx.stroke();
      ctx.restore();
      if (e.st !== 'idle') pill(c, 128, 'H₂ 기체', { bg: '#3f8cf0', size: 13, pad: 8 });
    } else if (i === 1) {
      // 비커 + 스포이트
      groundShadow(c, gy + 4, 62, 8, 0.7);
      const milk = e.st === 'idle' ? 0 : smooth(seg(e.t, 0.7, 3.6));
      const liq = mix('#cfe6ff', '#fbfdff', milk * 0.92);
      D.beaker(c - 48, 182, 96, 100, { level: 0.6, liquid: liq, t, ticks: 4, wave: 1 });
      // 구름 퍼짐
      ctx.save(); D.roundRect(c - 45, 182, 90, 97, 8); ctx.clip();
      e.puffs.forEach((p) => {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, 'rgba(255,255,255,' + p.a.toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      });
      // 가라앉은 앙금
      const th = 14 * smooth(seg(e.t, 2.2, 5.0));
      if (th > 0.2) { ctx.fillStyle = '#fdfdfd'; ctx.beginPath(); ctx.moveTo(c - 46, 282); for (let x = -46; x <= 46; x += 6) ctx.lineTo(c + x, 280 - th - Math.sin(x * 0.4) * 1.5); ctx.lineTo(c + 46, 282); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(150,170,200,.45)'; ctx.stroke(); }
      ctx.restore();
      // 스포이트
      const sq = e.st === 'run' ? 1 : 0;
      ctx.save(); ctx.translate(c, 0);
      ctx.fillStyle = '#e24a4a'; D.roundRect(-11, 114, 22, 38, 11); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-6, 120, 4, 22);
      ctx.fillStyle = 'rgba(210,235,255,.9)'; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-7, 150); ctx.lineTo(7, 150); ctx.lineTo(3, 180); ctx.lineTo(-3, 180); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(230,240,250,.9)'; ctx.beginPath(); ctx.moveTo(-5, 154); ctx.lineTo(5, 154); ctx.lineTo(2, 175); ctx.lineTo(-2, 175); ctx.closePath(); ctx.fill();
      ctx.restore();
      // 떨어지는 방울
      e.drops.forEach((d) => { ctx.fillStyle = 'rgba(205,225,250,.95)'; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(d.x, d.y, 3.4, 5, 0, 0, TAU); ctx.fill(); ctx.stroke(); });
      txt('질산 은', c + 18, 134, 13, COL.muted, 'left', 700); txt('수용액', c + 18, 150, 13, COL.muted, 'left', 700);
    } else if (i === 2) {
      // 삼발이 + 석면 철망 + 구리판 + 알코올램프
      groundShadow(c, gy + 4, 60, 8, 0.7);
      ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c - 52, 218); ctx.lineTo(c - 62, gy + 2); ctx.moveTo(c + 52, 218); ctx.lineTo(c + 62, gy + 2); ctx.stroke();
      ctx.strokeStyle = '#8a97ad'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c - 54, 218); ctx.lineTo(c + 54, 218); ctx.stroke();
      ctx.fillStyle = '#c7ced9'; D.roundRect(c - 52, 214, 104, 7, 3); ctx.fill();
      // 램프
      ctx.save();
      const lg = ctx.createLinearGradient(c - 22, 0, c + 22, 0); lg.addColorStop(0, 'rgba(190,225,255,.95)'); lg.addColorStop(0.5, 'rgba(240,250,255,.98)'); lg.addColorStop(1, 'rgba(160,200,235,.95)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(c - 9, gy - 30); ctx.quadraticCurveTo(c - 24, gy - 26, c - 22, gy - 10); ctx.quadraticCurveTo(c - 22, gy, c - 14, gy); ctx.lineTo(c + 14, gy); ctx.quadraticCurveTo(c + 22, gy, c + 22, gy - 10); ctx.quadraticCurveTo(c + 24, gy - 26, c + 9, gy - 30); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#9aa7ba'; D.roundRect(c - 8, gy - 38, 16, 9, 3); ctx.fill(); ctx.fillStyle = '#f2e4c4'; ctx.fillRect(c - 2, gy - 46, 4, 9);
      ctx.restore();
      if (e.st === 'run') D.flame(c, gy - 44, 44, t);
      // 구리판
      const px = c - 46, py = 196, pw = 92, ph = 20;
      ctx.save();
      softShadow(px, py, pw, ph + 6, 4, 8, 4, 'rgba(0,0,0,.25)');
      // 옆면
      ctx.fillStyle = mix('#a85e2c', '#1e1815', smooth(q)); D.roundRect(px, py + ph - 4, pw, 9, 3); ctx.fill();
      // 윗면: 가장자리부터 검게
      const cr = lerp(70, 0, ease.inOutQuad(q));
      const tg = ctx.createRadialGradient(c, py + 8, 0, c, py + 8, Math.max(1, cr));
      tg.addColorStop(0, '#e08c52'); tg.addColorStop(0.7, '#c7743b'); tg.addColorStop(1, mix('#c7743b', '#26201d', clamp(q * 1.2, 0, 1)));
      ctx.beginPath(); ctx.moveTo(px + 10, py); ctx.lineTo(px + pw - 4, py); ctx.lineTo(px + pw, py + ph); ctx.lineTo(px, py + ph); ctx.closePath();
      ctx.fillStyle = q >= 1 ? '#2a2420' : tg; ctx.fill();
      // 어두운 영역 (바깥쪽부터 번짐)
      if (q > 0 && q < 1) { ctx.save(); ctx.clip(); const dk = 1 - cr / 70; ctx.fillStyle = 'rgba(30,24,22,' + (0.9 * dk).toFixed(2) + ')'; ctx.fillRect(px, py, pw * 0.5 * dk * 1.1, ph); ctx.fillRect(px + pw - pw * 0.5 * dk * 1.1, py, pw, ph); ctx.restore(); }
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * (1 - q)).toFixed(2) + ')'; ctx.fillRect(px + 8, py + 2, pw - 20, 3);
      ctx.restore();
      if (e.st === 'run' && !RM) {
        ctx.save(); ctx.strokeStyle = 'rgba(255,170,90,.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let y = 0; y < 36; y += 4) { const xx = c - 20 + k * 20 + Math.sin(t * 5 + y * 0.3 + k) * 4; if (y === 0) ctx.moveTo(xx, 190); else ctx.lineTo(xx, 190 - y); } ctx.stroke(); }
        ctx.restore();
      }
      pill(c, 150, q < 0.5 ? '구리 (붉은색)' : q < 1 ? '색이 변하는 중' : '산화 구리(Ⅱ) (검은색)', { bg: q < 0.5 ? '#b0602f' : '#3a322e', size: 13, pad: 8 });
    } else {
      // 강철 솜 + 집게 + 램프
      groundShadow(c, gy + 4, 54, 8, 0.7);
      ctx.save();
      const lg = ctx.createLinearGradient(c - 22, 0, c + 22, 0); lg.addColorStop(0, 'rgba(190,225,255,.95)'); lg.addColorStop(0.5, 'rgba(240,250,255,.98)'); lg.addColorStop(1, 'rgba(160,200,235,.95)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(c - 9, gy - 30); ctx.quadraticCurveTo(c - 24, gy - 26, c - 22, gy - 10); ctx.quadraticCurveTo(c - 22, gy, c - 14, gy); ctx.lineTo(c + 14, gy); ctx.quadraticCurveTo(c + 22, gy, c + 22, gy - 10); ctx.quadraticCurveTo(c + 24, gy - 26, c + 9, gy - 30); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#9aa7ba'; D.roundRect(c - 8, gy - 38, 16, 9, 3); ctx.fill(); ctx.fillStyle = '#f2e4c4'; ctx.fillRect(c - 2, gy - 46, 4, 9);
      ctx.restore();
      if (e.st === 'run' && q < 0.9) D.flame(c, gy - 44, 36, t);
      const wy = 228;
      const g = Math.sin(Math.PI * clamp(q * 1.05, 0, 1));
      if (e.st !== 'idle') D.glow(c, wy + 10, 70, '#ff8a3d', 0.5 * g);
      // 집게
      ctx.save(); ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c + 16, wy - 20); ctx.lineTo(c + 40, 126); ctx.moveTo(c + 24, wy - 14); ctx.lineTo(c + 56, 130); ctx.stroke();
      ctx.restore();
      // 솜
      ctx.save(); ctx.translate(c, wy); ctx.lineCap = 'round';
      WOOL.forEach((s) => {
        const burn = q * 1.3 - (1 - s.ht) * 1.0;      // 아래쪽부터
        let col, lw = s.w;
        if (e.st === 'idle' || burn <= 0) col = '#a7b0bf';
        else if (burn < 0.35) { col = mix('#ffe27a', '#ff6a2a', burn / 0.35); lw += 1.4; }
        else col = mix('#ff6a2a', '#403b3b', clamp((burn - 0.35) / 0.4, 0, 1));
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1); ctx.stroke();
      });
      ctx.restore();
      if (e.st !== 'idle') pill(c, 128, q < 0.95 ? '강철 솜(철)' : '검게 변한 물질', { bg: q < 0.95 ? '#6b778c' : '#3a322e', size: 13, pad: 8 });
    }
  }

  function drawSticker(s) {
    const lift = s.lift, w = s.w, h = s.h;
    const sh = s.shake > 0 ? Math.sin(s.shake * 30) * 5 * s.shake : 0;
    const sc = 1 + lift * 0.08 + s.pop * 0.12;
    ctx.save(); ctx.translate(s.x + sh, s.y - lift * 6); ctx.scale(sc, sc);
    softShadow(-w / 2, -h / 2, w, h, 14, 8 + lift * 12, 3 + lift * 8, 'rgba(20,30,70,' + (0.25 + lift * 0.12) + ')');
    const E = EVID[s.kind];
    ctx.fillStyle = E.color; D.roundRect(-w / 2, -h / 2, w, h, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; D.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h / 2 - 2, 12); ctx.fill();
    if (s.wrong) { ctx.strokeStyle = COL.bad; ctx.lineWidth = 4; D.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 15); ctx.stroke(); }
    txt(E.label, 0, 6, 17, '#fff', 'center', 800);
    ctx.restore();
  }
  function drawLab(t) {
    // 카드
    for (let i = 0; i < 4; i++) {
      const e = LB[i], x = cardX(i), y = CARD.y, c = cardC(i);
      const sel = LS.sel === i;
      panel(x, y, CARD.w, CARD.h, 16, e.st === 'done' ? '#ffffff' : '#fbfcff', 10, 3);
      if (sel) { ctx.strokeStyle = rgba(COL.sub, 0.55 + 0.25 * Math.sin(now() * 5)); ctx.lineWidth = 3.5; D.roundRect(x - 1, y - 1, CARD.w + 2, CARD.h + 2, 17); ctx.stroke(); }
      ctx.save(); D.roundRect(x, y, CARD.w, CARD.h, 16); ctx.clip();
      vgrad(ctx, x, y, CARD.w, 250, '#f3f7ff', '#e6edf8');
      vgrad(ctx, x, y + 250, CARD.w, 40, '#efd3a6', '#d6ae75');
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x, y + 250, CARD.w, 2.5);
      ctx.restore();
      // 제목
      ctx.fillStyle = '#fff'; D.roundRect(x + 8, y + 8, CARD.w - 16, 56, 11); ctx.fill();
      textBlock(LAB[i].name, c, y + 30, CARD.w - 30, 14, COL.ink, 'center', 17, 800);
      drawLabVessel(i, t);
      // 결과 글 / 안내
      if (e.st === 'done') {
        const a = 1 - e.pulse * 0.5;
        ctx.save(); ctx.globalAlpha = a; textBlock(LAB[i].res, c, y + 262 + 12, CARD.w - 24, 13, '#b4440f', 'center', 16, 800); ctx.restore();
      } else if (e.st === 'run') {
        txt('관찰 중…', c, y + 270, 14, COL.sub, 'center', 800);
      } else {
        const a = 0.6 + 0.4 * Math.sin(now() * 4 + i);
        ctx.save(); ctx.globalAlpha = a; txt('▶ 눌러서 실험하기', c, y + 270, 14, COL.sub, 'center', 800); ctx.restore();
      }
      // 스티커 칸
      const sx = c - 85, sy = y + CARD.h - 52;
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = e.st === 'done' ? rgba(COL.sub, 0.7) : '#c3ccd9'; ctx.lineWidth = 2;
      D.roundRect(sx, sy, 170, 44, 14); ctx.stroke(); ctx.restore();
      if (!dragL.items.some((s) => s.slot === i) && e.st === 'done') txt('스티커 붙이는 곳', c, sy + 27, 13, '#8995a8', 'center', 700);
    }
    // 스티커 판
    panel(12, 392, 776, 116, 16, '#ffffff', 10, 3);
    txt('🏷️ 증거 스티커 — 알맞은 실험대에 끌어 붙여요', 400, 418, 15, COL.ink, 'center', 800);
    dragL.items.forEach((s, i) => {
      if (s.slot < 0 && !s.dragging) { ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#d3dae6'; ctx.lineWidth = 1.5; D.roundRect(s.hx - 84, s.hy - 23, 168, 46, 14); ctx.stroke(); ctx.restore(); }
    });
    dragL.items.forEach(drawSticker);
    drawFire();
  }
  function labDown(p) {
    // 스티커 우선
    if (nLabDone() >= 1) {
      const it = dragL.down(p);
      if (it) { hideHint(); it.wrong = false; if (it.slot >= 0) { LB[it.slot].stk = null; it.slot = -1; } it.w = 166; return true; }
    }
    // 카드 탭
    for (let i = 0; i < 4; i++) {
      if (inRect(p, { x: cardX(i), y: CARD.y, w: CARD.w, h: CARD.h - 60 })) {
        LS.sel = i; labUI();
        if (LB[i].st === 'idle') labStart(i);
        Sound.click();
        return false;
      }
    }
    return false;
  }
  function labUp() {
    const it = dragL.up();
    if (!it) return;
    let target = -1;
    for (let i = 0; i < 4; i++) if (inRect({ x: it.x, y: it.y }, { x: cardX(i), y: CARD.y, w: CARD.w, h: CARD.h }, 4)) target = i;
    if (target >= 0 && LB[target].st === 'done') {
      const old = dragL.items.find((s) => s.slot === target && s !== it);
      if (old) { old.slot = -1; old.tx = old.hx; old.ty = old.hy; old.wrong = false; }
      it.slot = target; it.tx = cardC(target); it.ty = CARD.y + CARD.h - 30; it.pop = 1; Sound.tick();
      LS.shaken.delete(target);
    } else {
      it.slot = -1; it.tx = it.hx; it.ty = it.hy;
      if (target >= 0) { it.shake = 1; say(cardC(target), CARD.y + 150, '먼저 이 실험부터 해 봐요!', { bg: '#b4440f', maxW: 160 }); Sound.fail && Sound.fail(); }
    }
  }
  SC.lab = {
    enter() { labUI(); if (nLabDone() === 0) showHint('실험대를 눌러 네 가지 실험을 해 보세요', 4200); },
    reset: labReset,
    update: labUpdate,
    draw: drawLab,
    down: labDown,
    move(p) { dragL.move(p); },
    up: labUp,
    hover(p) { return dragL.hit(p) ? 'grab' : 'pointer'; },
  };

  /* =========================================================
     ③ 모형 — 같은 물, 다른 변화: 끓음(물리) vs 전기 분해(화학)  (🔍 입자 모형)
     ========================================================= */
  const MC = [
    { x: 12, w: 380, lx: 124, ly: 380, r: 88, sys: new Sys(), id: 'boil' },
    { x: 408, w: 380, lx: 520, ly: 380, r: 88, sys: new Sys(), id: 'elec' },
  ];
  MC.forEach((c) => { c.sys.sc = 17; });
  const MS = { lensOn: true, lensK: 1, boil: { st: 'idle', t: 0, k: 0, flame: 0, level: 0.62 }, elec: { st: 'idle', t: 0, k: 0, level: 0.66, power: 0 }, used: { boil: false, elec: false }, pop: {}, lensUsed: false };
  const SA = MC[0].sys, SB = MC[1].sys;
  const H_INIT = 8, O_INIT = 4;
  function modelFill() {
    SA.clear(); SB.clear();
    const a = MC[0], b = MC[1];
    [[-24, 58], [24, 58], [0, 16], [-48, 22]].forEach((o) => {
      SA.addMol('H2O', a.lx + o[0], a.ly + o[1], { mode: 'liquid', amp: 2.4, rot: rand(0, TAU), sc: 17 });
    });
    [[-34, -26], [34, -26], [-34, 28], [34, 28]].forEach((o) => {
      SB.addMol('H2O', b.lx + o[0], b.ly + o[1], { mode: 'liquid', amp: 2.4, rot: rand(0, TAU), sc: 17 });
    });
  }
  function modelReset() {
    clearLater();
    MS.boil = { st: 'idle', t: 0, k: 0, flame: 0, level: 0.62 };
    MS.elec = { st: 'idle', t: 0, k: 0, level: 0.66, power: 0 };
    MS.used = { boil: false, elec: false };
    FX.clear();
    modelFill(); modelUI();
  }
  function modelUI() {
    const bo = MS.boil.st, el = MS.elec.st;
    $('#boilBtn').textContent = bo === 'run' ? '⏳ 끓는 중…' : bo === 'done' ? '↻ 다시 끓이기' : '💧 물 끓이기';
    $('#elecBtn').textContent = el === 'run' ? '⏳ 분해 중…' : el === 'done' ? '↻ 다시 분해하기' : '⚡ 물 전기 분해';
    $('#boilBtn').disabled = bo === 'run'; $('#elecBtn').disabled = el === 'run';
    $('#lensBtn').setAttribute('aria-pressed', MS.lensOn ? 'true' : 'false');
  }
  function boilStart() {
    const B = MS.boil;
    if (B.st === 'run') return;
    if (B.st === 'done') { SA.clear(); [[-24, 58], [24, 58], [0, 16], [-48, 22]].forEach((o) => SA.addMol('H2O', MC[0].lx + o[0], MC[0].ly + o[1], { mode: 'liquid', amp: 2.4, rot: rand(0, TAU), sc: 17 })); B.level = 0.62; B.k = 0; }
    B.st = 'run'; B.t = 0; MS.used.boil = false; hideHint();
    sfx.flame(); modelUI();
  }
  function elecStart() {
    const E = MS.elec;
    if (E.st === 'run') return;
    if (E.st === 'done') { SB.clear(); [[-34, -26], [34, -26], [-34, 28], [34, 28]].forEach((o) => SB.addMol('H2O', MC[1].lx + o[0], MC[1].ly + o[1], { mode: 'liquid', amp: 2.4, rot: rand(0, TAU), sc: 17 })); E.level = 0.66; }
    E.st = 'run'; E.t = 0; E.step = 0; MS.used.elec = false; hideHint();
    sfx.zap(); modelUI();
  }
  $('#boilBtn').addEventListener('click', () => { Sound.click(); boilStart(); });
  $('#elecBtn').addEventListener('click', () => { Sound.click(); elecStart(); });
  $('#lensBtn').addEventListener('click', () => { Sound.click(); MS.lensOn = !MS.lensOn; MS.lensUsed = true; modelUI(); });

  function boilUpdate(dt) {
    const B = MS.boil, a = MC[0];
    if (B.st !== 'run' && B.st !== 'done') { B.flame = SciSim.approach(B.flame, 0, dt, 6); return; }
    if (B.st === 'run') {
      B.t += dt;
      B.flame = SciSim.approach(B.flame, 1, dt, 5);
      B.k = seg(B.t, 1.6, 5.2);                       // 끓는 정도
      if (B.t > 1.0 && !B.s1) { B.s1 = 1; SA.mols.forEach((m) => { m.amp = 5; }); }
      if (B.t > 2.2 && !B.s2) {
        B.s2 = 1;
        SA.mols.forEach((m, i) => {
          m.mode = 'gas'; m.speed = 55; m.box = { x: a.lx - 64, y: a.ly - 66, w: 128, h: 132 }; m.vr = rand(-1.2, 1.2);
          const ang = rand(0, TAU); m.vx = Math.cos(ang) * 55; m.vy = Math.sin(ang) * 55;
        });
        Sound.tone(300, 0.2, 'sine', 0.05);
      }
      B.level = 0.62 - 0.12 * B.k;
      if (!RM && B.k > 0.02) {
        const cx = a.x + 190;
        if (Math.random() < dt * (10 + 40 * B.k)) FX.emit({ x: cx + rand(-44, 44), y: 207, vx: rand(-4, 4), vy: -rand(40, 70), life: 0.9, size: rand(2, 5), color: '#d6efff', shape: 'bubble' });
        if (B.k > 0.3 && Math.random() < dt * (3 + 8 * B.k)) FX.emit({ x: cx + rand(-30, 30), y: 98, vx: rand(-8, 8), vy: -rand(26, 44), life: 1.6, size: rand(9, 13), color: 'rgba(235,242,250,.7)', shape: 'smoke', grow: 12, drag: 0.5 });
      }
      if (B.t > 6.2) { B.st = 'done'; MS.used.boil = true; okFx(a.x + 190, 100, COL.phys, false); sfx.ding(); modelUI(); }
    } else {
      B.flame = SciSim.approach(B.flame, 0, dt, 2);
      if (!RM && B.flame > 0.1 && Math.random() < dt * 4) FX.emit({ x: a.x + 190 + rand(-30, 30), y: 98, vx: rand(-8, 8), vy: -rand(26, 40), life: 1.4, size: rand(9, 12), color: 'rgba(235,242,250,.6)', shape: 'smoke', grow: 12, drag: 0.5 });
    }
  }
  function elecUpdate(dt) {
    const E = MS.elec, b = MC[1];
    E.power = SciSim.approach(E.power, E.st === 'run' ? 1 : 0, dt, 6);
    if (E.st !== 'run') return;
    E.t += dt;
    const t = E.t;
    const cx = b.x + 190;
    if (!RM && t > 0.5) {
      if (Math.random() < dt * 34) FX.emit({ x: cx - 40 + rand(-4, 4), y: 244, vx: rand(-6, 6), vy: -rand(50, 90), life: 1.0, size: rand(2, 4), color: '#d6efff', shape: 'bubble' });
      if (Math.random() < dt * 17) FX.emit({ x: cx + 40 + rand(-4, 4), y: 244, vx: rand(-6, 6), vy: -rand(50, 90), life: 1.0, size: rand(2, 4), color: '#ffd9d9', shape: 'bubble' });
    }
    if (t > 0.8 && !E.s1) { E.s1 = 1; SB.mols.forEach((m) => { m.jit = 1.6; }); }
    // 분자를 하나씩 쪼갬
    if (t > 1.8 && E.step < 4) {
      const due = Math.floor((t - 1.8) / 0.45) + 1;
      while (E.step < Math.min(4, due)) {
        const m = SB.mols.find((q) => q.type === 'H2O');
        if (!m) break;
        E.step++;
        const atoms = SB.dissolve(m, 40);
        atoms.forEach((at) => {
          if (at.sym === 'H') { at.tx = b.lx - 56 + rand(-14, 14); at.ty = b.ly + rand(-64, 64); at.k = 22; }
          else { at.tx = b.lx + 56 + rand(-14, 14); at.ty = b.ly + rand(-64, 64); at.k = 22; }
        });
        FX.burst(m.cx, m.cy, { count: 5, speed: 70, life: 0.5, size: 2.6, colors: ['#fff6c2', '#ffd23f'], shape: 'star', gravity: 0 });
        sfx.zap();
      }
    }
    if (t > 4.4 && !E.s3) {
      E.s3 = 1;
      const pool = SB.atoms.filter((q) => !q.mol);
      [[-70, -34], [-34, -34], [-70, 22], [-34, 22]].forEach((o) => {
        const m = SB.form('H2', pool, b.lx + o[0], b.ly + o[1], { k: 70, z: 0.4, rot: rand(0, 3) });
        m.cx = b.lx + o[0]; m.cy = b.ly + o[1]; m.ax = m.cx; m.ay = m.cy; m.mode = 'gas'; m.speed = 26; m.vr = rand(-1, 1);
        m.box = { x: b.lx - 78, y: b.ly - 62, w: 62, h: 124 };
        m.vx = rand(-20, 20); m.vy = rand(-20, 20);
      });
      [[52, -20], [52, 30]].forEach((o) => {
        const m = SB.form('O2', pool, b.lx + o[0], b.ly + o[1], { k: 70, z: 0.4, rot: rand(0, 3) });
        m.cx = b.lx + o[0]; m.cy = b.ly + o[1]; m.ax = m.cx; m.ay = m.cy; m.mode = 'gas'; m.speed = 26; m.vr = rand(-1, 1);
        m.box = { x: b.lx + 14, y: b.ly - 62, w: 64, h: 124 };
        m.vx = rand(-20, 20); m.vy = rand(-20, 20);
      });
      okFx(b.lx, b.ly - 10, COL.chem, false);
    }
    if (t > 6.6) { E.st = 'done'; MS.used.elec = true; sfx.ding(); modelUI(); }
    E.level = 0.66 - 0.04 * seg(t, 1, 6);
  }
  function modelUpdate(dt) {
    MS.lensK = SciSim.approach(MS.lensK, MS.lensOn ? 1 : 0, dt, 9);
    boilUpdate(dt); elecUpdate(dt);
    SA.update(dt); SB.update(dt);
    ['pA', 'pB'].forEach((k) => { if (MS.pop[k] > 0) MS.pop[k] = Math.max(0, MS.pop[k] - dt * 3); });
  }

  /* ---- 그리기 ---- */
  function drawBoilVessel(t) {
    const B = MS.boil, a = MC[0], cx = a.x + 190;
    // 삼발이 · 철망 · 램프
    ctx.save();
    groundShadow(cx, 276, 80, 9, 0.7);
    ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 62, 224); ctx.lineTo(cx - 72, 274); ctx.moveTo(cx + 62, 224); ctx.lineTo(cx + 72, 274); ctx.stroke();
    ctx.fillStyle = '#c7ced9'; D.roundRect(cx - 66, 218, 132, 7, 3); ctx.fill();
    ctx.restore();
    // 램프
    ctx.save();
    const lg = ctx.createLinearGradient(cx - 22, 0, cx + 22, 0); lg.addColorStop(0, 'rgba(190,225,255,.95)'); lg.addColorStop(0.5, 'rgba(240,250,255,.98)'); lg.addColorStop(1, 'rgba(160,200,235,.95)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(cx - 9, 252); ctx.quadraticCurveTo(cx - 24, 256, cx - 22, 266); ctx.quadraticCurveTo(cx - 22, 276, cx - 14, 276); ctx.lineTo(cx + 14, 276); ctx.quadraticCurveTo(cx + 22, 276, cx + 22, 266); ctx.quadraticCurveTo(cx + 24, 256, cx + 9, 252); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#9aa7ba'; D.roundRect(cx - 8, 245, 16, 8, 3); ctx.fill();
    ctx.restore();
    if (B.flame > 0.02) D.flame(cx, 244, 36 * B.flame, t);
    // 비커 (끓으면 물이 출렁임)
    D.beaker(cx - 60, 100, 120, 118, { level: B.level, liquid: '#8ccaff', t: t * (1 + 3 * B.k), wave: 1.2 + 3 * B.k, ticks: 4 });
    if (B.st === 'done' || B.k > 0.9) pill(cx, 84, '수증기 (기체 상태의 물)', { bg: '#5b7fb5', size: 13, pad: 9 });
  }
  function drawElecVessel(t) {
    const E = MS.elec, b = MC[1], cx = b.x + 190;
    groundShadow(cx, 276, 90, 9, 0.7);
    // 전지
    const bx = cx - 40, by = 82;
    panel(bx, by, 80, 28, 7, '#f6f8fc', 8, 3);
    ctx.fillStyle = '#e24a4a'; D.roundRect(bx + 40, by, 40, 28, 7); ctx.fill();
    ctx.fillStyle = '#3f6fe8'; D.roundRect(bx, by, 40, 28, 7); ctx.fill();
    txt('−', bx + 20, by + 20, 20, '#fff', 'center', 800); txt('+', bx + 60, by + 20, 20, '#fff', 'center', 800);
    // 전선
    ctx.save(); ctx.strokeStyle = '#2f3a4d'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(bx + 6, by + 14); ctx.lineTo(bx - 4, by + 14); ctx.lineTo(cx - 40, 125); ctx.lineTo(cx - 40, 130); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 74, by + 14); ctx.lineTo(bx + 84, by + 14); ctx.lineTo(cx + 40, 125); ctx.lineTo(cx + 40, 130); ctx.stroke();
    ctx.restore();
    // 비커 + 전극
    D.beaker(cx - 76, 150, 152, 122, { level: E.level, liquid: '#a9d8ff', t, wave: 1.2, ticks: 4 });
    [-40, 40].forEach((dx, k) => {
      const ex = cx + dx;
      ctx.fillStyle = '#4a4f5b'; D.roundRect(ex - 6, 126, 12, 128, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(ex - 4, 128, 3, 120);
    });
    pill(cx - 40, 140, '−극', { bg: '#3f6fe8', size: 13, pad: 8 });
    pill(cx + 40, 140, '+극', { bg: '#e24a4a', size: 13, pad: 8 });
    if (E.t > 3 || E.st === 'done') {
      pill(cx - 40, 288, '수소 기체 (2)', { bg: '#3f8cf0', size: 13, pad: 8 });
      pill(cx + 40, 288, '산소 기체 (1)', { bg: '#d9534f', size: 13, pad: 8 });
    }
  }
  function drawLensCol(c, i) {
    const sys = c.sys, k = MS.lensK;
    const isB = i === 1;
    const src = isB ? { x: c.x + 190, y: 232, r: 16 } : { x: c.x + 176, y: 190, r: 16 };
    if (k > 0.01) {
      lens(c.lx, c.ly, c.r, () => {
        // 안쪽 배경: 액체/기체 구분 힌트
        if (!isB) {
          const B = MS.boil;
          const g = ctx.createLinearGradient(0, c.ly - c.r, 0, c.ly + c.r);
          g.addColorStop(0, 'rgba(235,244,255,0)'); g.addColorStop(1, 'rgba(140,200,255,' + (0.35 * (1 - B.k * 0.8)).toFixed(2) + ')');
          ctx.fillStyle = g; ctx.fillRect(c.lx - c.r, c.ly - c.r, c.r * 2, c.r * 2);
        } else {
          ctx.fillStyle = 'rgba(169,216,255,' + (0.28 * (1 - MS.elec.power * 0.4)).toFixed(2) + ')'; ctx.fillRect(c.lx - c.r, c.ly - c.r, c.r * 2, c.r * 2);
          if (MS.elec.st !== 'idle') {
            txt('−극', c.lx - 66, c.ly - 66, 13, '#3f6fe8', 'center', 800);
            txt('+극', c.lx + 66, c.ly - 66, 13, '#e24a4a', 'center', 800);
          }
        }
        sys.draw();
      }, { k, src, title: '🔍 입자 모형' });
    } else {
      pill(c.lx, c.ly, '🔍 켜서 입자를 봐요', { bg: '#8b5cf6', size: 14, pad: 12 });
    }
  }
  function drawLegend(c, i) {
    const sys = c.sys, lx = c.x + 226;
    const nW = sys.molCount('H2O'), nH2 = sys.molCount('H2'), nO2 = sys.molCount('O2');
    const nH = sys.count('H'), nO = sys.count('O');
    txt('분자의 종류', lx, 306, 15, COL.ink, 'left', 800);
    const row = (y, label, n, f) => {
      ctx.save(); ctx.globalAlpha = n > 0 ? 1 : 0.4;
      ctx.fillStyle = '#f2f5fb'; D.roundRect(lx - 4, y - 16, 160, 29, 10); ctx.fill();
      f(lx + 14, y);
      txt(label, lx + 46, y + 5, 14, COL.ink, 'left', 800);
      txt(n + '개', lx + 150, y + 6, 17, n > 0 ? COL.sub : COL.muted, 'right', 800);
      ctx.restore();
    };
    row(332, '물 분자', nW, (x, y) => { drawBall('O', x, y - 1, 6.5); drawBall('H', x - 8, y + 5, 4.4); drawBall('H', x + 8, y + 5, 4.4); });
    row(366, '수소 분자', nH2, (x, y) => { drawBall('H', x - 6, y, 5.6); drawBall('H', x + 6, y, 5.6); });
    row(400, '산소 분자', nO2, (x, y) => { drawBall('O', x - 6, y, 6.4); drawBall('O', x + 6, y, 6.4); });
    txt('원자의 종류·수', lx, 436, 14, COL.ink, 'left', 800);
    const state = i === 0 ? MS.boil.st : MS.elec.st;
    if (state === 'done' && nH === H_INIT && nO === O_INIT) txt('✔ 그대로', lx + 156, 436, 14, COL.good, 'right', 800);
    ctx.fillStyle = '#f2f5fb'; D.roundRect(lx - 4, 446, 160, 29, 10); ctx.fill();
    drawBall('H', lx + 12, 460, 6); txt('H ' + nH, lx + 24, 466, 15, COL.ink, 'left', 800);
    drawBall('O', lx + 84, 460, 7); txt('O ' + nO, lx + 97, 466, 15, COL.ink, 'left', 800);
    if (state === 'done') {
      const chem = i === 1;
      ctx.fillStyle = chem ? '#fff1e8' : '#eaf2ff'; D.roundRect(lx - 4, 484, 160, 40 - 6, 10); ctx.fill();
      ctx.strokeStyle = chem ? COL.chem : COL.phys; ctx.lineWidth = 2; D.roundRect(lx - 4, 484, 160, 34, 10); ctx.stroke();
      txt(chem ? '분자의 종류가 달라짐' : '분자의 종류는 그대로', lx + 76, 499, 13, chem ? '#b4440f' : '#1d5fc9', 'center', 800);
      txt(chem ? '→ 화학 변화' : '→ 물리 변화', lx + 76, 514, 13, chem ? '#b4440f' : '#1d5fc9', 'center', 800);
    }
  }
  function drawModel(t) {
    MC.forEach((c, i) => {
      panel(c.x, 44, c.w, 466, 18, '#ffffff', 12, 4);
      ctx.save(); D.roundRect(c.x, 44, c.w, 466, 18); ctx.clip();
      vgrad(ctx, c.x, 44, c.w, 242, '#f5f9ff', '#e6eefa');
      ctx.restore();
      const done = (i === 0 ? MS.boil.st : MS.elec.st) === 'done';
      pill(c.x + 100, 62, i === 0 ? '💧 물이 끓음' : '⚡ 물의 전기 분해', { bg: i === 0 ? '#2f7cf6' : '#f26b3a', size: 15, pad: 12 });
      if (i === 0) drawBoilVessel(t); else drawElecVessel(t);
      drawLensCol(c, i);
      drawLegend(c, i);
    });
    drawFire();
  }
  SC.model = {
    enter() { modelUI(); if (MS.boil.st === 'idle' && MS.elec.st === 'idle') showHint('두 버튼을 눌러, 같은 물이 어떻게 달라지는지 입자 모형으로 비교해 보세요', 5200); },
    reset: modelReset,
    update: modelUpdate,
    draw: drawModel,
  };
  modelFill();

  /* =========================================================
     ④ 적용 — 카드 10장을 물리 변화 / 화학 변화 상자로 끌어 넣기
     ========================================================= */
  const CARDS = [
    { ic: '🔩', t: '철이 녹슨다', k: 'chem', why: '철이 산소와 반응해 붉은 녹이라는 새로운 물질이 생겨요.' },
    { ic: '🧊', t: '얼음이 녹는다', k: 'phys', why: '고체에서 액체로 상태만 변하고 여전히 물이에요.' },
    { ic: '🥛', t: '유리컵이 깨진다', k: 'phys', why: '모양만 변하고 조각도 여전히 유리예요.' },
    { ic: '🥬', t: '김치가 시어진다', k: 'chem', why: '발효로 신맛이 나는 새로운 물질이 생겨요.' },
    { ic: '🍬', t: '설탕이 물에 녹는다', k: 'phys', why: '설탕이 물에 섞일 뿐 설탕의 성질은 그대로예요.' },
    { ic: '🥚', t: '달걀을 삶는다', k: 'chem', why: '단백질이 변해 처음과 다른 성질의 물질이 돼요.' },
    { ic: '❄️', t: '드라이아이스가 작아진다', k: 'phys', why: '고체 이산화 탄소가 기체 이산화 탄소로 상태만 변해요.' },
    { ic: '🍌', t: '과일이 익는다', k: 'chem', why: '맛·색·향이 다른 새로운 물질이 생겨요.' },
    { ic: '🌸', t: '향수 냄새가 퍼진다', k: 'phys', why: '향수 분자가 공기 중으로 퍼져 나갈 뿐이에요(확산).' },
    { ic: '🕯️', t: '양초 심지에 불이 붙어 탄다', k: 'chem', why: '양초가 산소와 반응해 이산화 탄소와 수증기가 생겨요.' },
  ];
  const BOX = {
    phys: { x: 12, y: 44, w: 220, h: 466, color: '#2f7cf6', bg: '#eaf2ff', title: '🧊 물리 변화', sub: '모양·상태만 변해요' },
    chem: { x: 568, y: 44, w: 220, h: 466, color: '#f26b3a', bg: '#fff1e8', title: '🔥 화학 변화', sub: '새로운 물질이 생겨요' },
  };
  const dragS = new DragSet();
  const SORT = { flagged: new Set(), order: [], sel: 0 };
  const POOL_W = 146, POOL_H = 56;
  const poolPos = (n) => ({ x: 244 + 4 + POOL_W / 2 + (n % 2) * 158, y: 98 + Math.floor(n / 2) * 74 });
  function sortBuild(shuffle) {
    dragS.items.length = 0; SORT.flagged = new Set();
    const idx = CARDS.map((_, i) => i);
    if (shuffle) for (let i = idx.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [idx[i], idx[j]] = [idx[j], idx[i]]; }
    idx.forEach((ci, n) => {
      const p = poolPos(n);
      const it = dragS.add({ ci, c: 24, w: POOL_W, h: POOL_H, hx: p.x, hy: p.y, x: p.x, y: p.y + 20 + n * 3, box: null, wrong: false, k: 230, tw_: POOL_W, th_: POOL_H });
      it.tx = p.x; it.ty = p.y;
    });
  }
  function boxItems(k) { return dragS.items.filter((s) => s.box === k).sort((a, b) => a.order - b.order); }
  function reflowBox(k) {
    const B = BOX[k];
    boxItems(k).forEach((s, i) => { s.order = i; s.tx = B.x + B.w / 2; s.ty = B.y + 100 + i * 36; });
  }
  function sortReset() {
    sortBuild(true); sortUI();
  }
  const nSorted = () => dragS.items.filter((s) => s.box).length;
  const nSortRight = () => dragS.items.filter((s) => s.box && CARDS[s.ci].k === s.box).length;
  function sortUI() {
    $('#sortNote').innerHTML = '카드를 끌어 알맞은 상자에 넣어요. <b>' + nSorted() + ' / ' + CARDS.length + '</b>장 분류했어요.';
  }
  $('#sortReset').addEventListener('click', () => { Sound.click(); sortReset(); });

  function drawCard(s) {
    const c = CARDS[s.ci];
    const placed = !!s.box;
    s.tw_ = placed ? 200 : POOL_W; s.th_ = placed ? 32 : POOL_H;
    s.w = SciSim.approach(s.w, s.tw_, lastDt, 14); s.h = SciSim.approach(s.h, s.th_, lastDt, 14);
    const w = s.w, h = s.h, lift = s.lift;
    const sh = s.shake > 0 ? Math.sin(s.shake * 34) * 6 * s.shake : 0;
    const sc = 1 + lift * 0.08 + s.pop * 0.1;
    ctx.save(); ctx.translate(s.x + sh, s.y - lift * 7); ctx.scale(sc, sc);
    softShadow(-w / 2, -h / 2, w, h, 12, 7 + lift * 12, 3 + lift * 8, 'rgba(20,30,70,' + (0.2 + lift * 0.12) + ')');
    ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill();
    const col = s.box ? BOX[s.box].color : '#cfd7e6';
    ctx.strokeStyle = s.wrong ? COL.bad : col; ctx.lineWidth = s.wrong ? 4 : 2; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    if (placed) {
      txt(c.ic + ' ' + c.t, 0, 5, 13.5, COL.ink, 'center', 800);
    } else {
      txt(c.ic, -w / 2 + 22, 8, 24, COL.ink, 'center', 800);
      const lines = wrapText(c.t, w - 52, 13, 800);
      const lh = 16, y0 = -((lines.length - 1) * lh) / 2 + 5;
      lines.forEach((l, i) => txt(l, -w / 2 + 40, y0 + i * lh, 13, COL.ink, 'left', 800));
    }
    ctx.restore();
  }
  function drawSort(t) {
    ['phys', 'chem'].forEach((k) => {
      const B = BOX[k];
      panel(B.x, B.y, B.w, B.h, 18, B.bg, 12, 4);
      ctx.strokeStyle = rgba(B.color, 0.55); ctx.lineWidth = 3; ctx.setLineDash([9, 7]); D.roundRect(B.x + 6, B.y + 6, B.w - 12, B.h - 12, 14); ctx.stroke(); ctx.setLineDash([]);
      txt(B.title, B.x + B.w / 2, B.y + 38, 20, B.color, 'center', 800);
      txt(B.sub, B.x + B.w / 2, B.y + 62, 13.5, COL.muted, 'center', 700);
      if (dragS.cur) {
        const it = dragS.cur, inside = inRect({ x: it.x, y: it.y }, B);
        if (inside) { ctx.fillStyle = rgba(B.color, 0.12 + 0.06 * Math.sin(now() * 8)); D.roundRect(B.x, B.y, B.w, B.h, 18); ctx.fill(); }
      }
      if (!boxItems(k).length) txt('여기에 넣어요', B.x + B.w / 2, B.y + 250, 15, rgba(B.color, 0.6), 'center', 800);
    });
    // 가운데 바닥 (카드 놓는 곳)
    panel(244, 44, 312, 466, 18, '#ffffff', 10, 3);
    txt('📇 분류할 카드', 400, 70, 15, COL.muted, 'center', 800);
    dragS.items.forEach(drawCard);
  }
  function sortDown(p) {
    const it = dragS.down(p);
    if (!it) return false;
    hideHint();
    if (it.box) { const k = it.box; it.box = null; it.wrong = false; SORT.flagged.delete(it.ci); reflowBox(k); sortUI(); }
    return true;
  }
  function sortUp() {
    const it = dragS.up();
    if (!it) return;
    let k = null;
    ['phys', 'chem'].forEach((kk) => { if (inRect({ x: it.x, y: it.y }, BOX[kk])) k = kk; });
    if (k) {
      it.box = k; it.order = boxItems(k).length; it.pop = 1;
      reflowBox(k); Sound.tick();
    } else {
      it.tx = it.hx; it.ty = it.hy;
    }
    sortUI();
  }
  SC.sort = {
    enter() { sortUI(); if (nSorted() === 0) showHint('카드를 끌어서 물리 변화 상자 또는 화학 변화 상자에 넣어요', 5200); },
    reset: sortReset,
    update(dt) { dragS.update(dt); },
    draw: drawSort,
    down: sortDown,
    move(p) { dragS.move(p); },
    up: sortUp,
    hover(p) { return dragS.hit(p) ? 'grab' : null; },
  };
  sortBuild(true);

  /* =========================================================
     포인터 · 미션 · 루프
     ========================================================= */
  const SP = (p) => ({ x: p.x, y: p.y + YS });          // 화면 좌표 → 장면 좌표
  SciSim.pointer(view, {
    hover(p) { const s = SC[S.scene]; return s && s.hover ? s.hover(SP(p)) : null; },
    down(p, e) { hideHint(); const s = SC[S.scene]; if (s && s.down && s.down(SP(p), e)) { DR.fn = s; return true; } return false; },
    move(p, e) { if (DR.fn && DR.fn.move) DR.fn.move(SP(p), e); },
    up(p, e) { const s = DR.fn; DR.fn = null; if (s && s.up) s.up(SP(p), e); },
  });
  if (window.matchMedia && window.matchMedia('(max-width: 599px)').matches) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0], s = SC[S.scene];
      if (!tc || !s || !s.hover) return;
      const p = SP(view.toLocal(tc));
      if ((S.scene === 'lab' && dragL.hit(p)) || (S.scene === 'sort' && dragS.hit(p))) e.preventDefault();
    }, { passive: false });
  }
  // lab 장면은 카드를 눌러도 동작하므로 pointerup을 따로 연결
  const _labDown = SC.lab.down;
  SC.lab.down = (p, e) => { const r = _labDown(p, e); return r; };

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

  const chip = (ok, txt_) => mark(ok) + ' ' + txt_;
  const SVG_CANDLE = '<svg viewBox="0 0 300 150" width="300" height="150" role="img" aria-label="촛농이 녹아 흐르는 모습과 심지에서 타는 불꽃"><defs><linearGradient id="cw" x1="0" x2="1"><stop offset="0" stop-color="#fff8e6"/><stop offset="1" stop-color="#f3dfae"/></linearGradient><radialGradient id="cf" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#ffb02e"/><stop offset="1" stop-color="#ff5a1f" stop-opacity=".1"/></radialGradient></defs><ellipse cx="150" cy="136" rx="80" ry="8" fill="rgba(60,40,30,.15)"/><rect x="118" y="56" width="64" height="78" rx="6" fill="url(#cw)" stroke="#d9c58c"/><path d="M118 56 q10 20 18 8 q4 18 12 6 q8 16 16 2 q6 12 18 -2 v-14 h-64z" fill="#fffdf4" stroke="#d9c58c"/><path d="M136 64 q-2 22 3 26" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="148" y="40" width="4" height="18" fill="#3a322e"/><path d="M150 14 q-18 22 0 30 q18 -8 0 -30z" fill="url(#cf)"/><text x="62" y="46" text-anchor="middle" font-size="14" font-weight="800" fill="#2f7cf6">㉠ 촛농이 녹아</text><text x="62" y="64" text-anchor="middle" font-size="14" font-weight="800" fill="#2f7cf6">흘러내려요</text><text x="238" y="40" text-anchor="middle" font-size="14" font-weight="800" fill="#f26b3a">㉡ 심지에서</text><text x="238" y="58" text-anchor="middle" font-size="14" font-weight="800" fill="#f26b3a">양초가 타요</text></svg>';
  const tbl = (head, rows) => '<table><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';

  game = SciSim.game({
    simId: 'm3-physical-chemical',
    mount: '#game',
    badge: '변화 탐정',
    homeHref: '../../index.html#g3',
    featureLabels: {
      obs: '📄 종이·설탕 변화 관찰대',
      lab: '🧪 실험대 4개와 증거 스티커',
      model: '🔍 입자 모형 돋보기',
      sort: '🗃️ 물리·화학 변화 분류 상자',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onHint(m) { if (m.focus === 'actA') pulseEl('#actA'); else if (m.focus === 'actB') pulseEl('#actB'); else if (m.focus === 'labGo') pulseEl('#labGo'); else if (m.focus === 'boilBtn') pulseEl('#boilBtn'); else if (m.focus === 'elecBtn') pulseEl('#elecBtn'); },
    onMissionStart(m) { if (m.scene) setScene(m.scene, false); },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '두 가지 변화', short: '두 가지 변화', icon: '👀', phase: '관찰',
        features: ['obs'],
        intro: '<p class="si-q">❓ 탐구 질문: 종이를 자를 때와 태울 때, 무엇이 다를까?</p>' +
          '<p>종이와 설탕에 <b>두 가지 방법</b>을 써 봐요. 변한 뒤에도 <b>처음과 같은 물질</b>일까요, 아니면 <b>다른 물질</b>이 생겼을까요?</p>' +
          '<p class="note">🔥 불을 쓰는 실험은 실제로는 선생님과 함께, 보안경을 쓰고 해요.</p>',
        setup() { setScene('obs', true); },
        recap: '자르기·녹이기는 물질이 그대로이고, 태우기·가열하기는 성질이 다른 새로운 물질이 생겨요.',
        summary: '<ul><li><b>종이 자르기</b>: 모양과 크기만 변함 → 여전히 종이</li><li><b>종이 태우기</b>: 재·연기가 생김 → 종이가 아님</li><li><b>설탕 녹이기</b>: 눈에 안 보여도 설탕은 그대로(단맛)</li><li><b>설탕 가열</b>: 검게 타고 탄 냄새 → 설탕이 아님</li></ul>' +
          '<span class="formula" style="font-size:15px">물리 변화: 물질의 성질은 그대로<br>화학 변화: 성질이 다른 새로운 물질이 생김</span>',
        missions: [
          {
            title: '네 가지 변화 해 보기', scene: 'obs', focus: 'actA',
            goal: '종이와 설탕에 두 가지 방법씩, 네 가지 변화를 모두 해 보세요.',
            hint: '재료를 고르고 두 버튼을 차례로 눌러요. 변한 뒤의 모습을 오른쪽 관찰 기록과 비교해 보세요.',
            setup() { setScene('obs', true); OB.done = { cut: false, burn: false, dissolve: false, heat: false }; OB.last = null; obsReset(true); setMat('paper'); },
            check: () => ACT_IDS.every((id) => OB.done[id]) && !OB.act, hold: 0.7,
            status: () => ACT_IDS.map((id) => chip(OB.done[id], ACT[id].name.replace('설탕 ', '설탕 ').replace('종이 ', '종이 '))).join(' · '),
            explain: '종이를 <b>자르면</b> 모양과 크기만 달라질 뿐 조각도 여전히 종이예요. 종이를 <b>태우면</b> 재와 연기처럼 종이와 <b>성질이 다른 물질</b>이 생기고, 다시 종이가 되지 않아요. 설탕을 물에 <b>녹이면</b> 눈에는 안 보여도 설탕이 그대로 섞여 있어요. <b>가열</b>하면 검게 타서 설탕과 다른 물질이 돼요.',
          },
          {
            type: 'quiz', title: '새로운 물질이 생긴 변화', scene: 'obs',
            goal: '네 가지 중 변하기 전과 성질이 다른 새로운 물질이 생긴 변화끼리 짝지은 것은?',
            choices: ['종이 자르기, 설탕 물에 녹이기', '종이 태우기, 설탕 가열하기', '종이 자르기, 설탕 가열하기', '종이 태우기, 설탕 물에 녹이기'],
            answer: 1,
            feedback: ['종이 조각은 여전히 종이고, 설탕물 속 설탕도 그대로 설탕이에요.', '', '종이 자르기는 모양만 달라진 거예요.', '설탕이 물에 녹아도 설탕은 그대로예요. 물을 증발시키면 설탕이 다시 나와요.'],
            explain: '종이 태우기·설탕 가열은 재, 연기, 검은 덩어리처럼 <b>새로운 물질</b>이 생겨요. 이런 변화를 <b>화학 변화</b>라고 해요. 자르기·녹이기처럼 물질의 성질은 그대로이고 모양·크기·상태만 달라지는 변화는 <b>물리 변화</b>예요.',
          },
          {
            type: 'quiz', title: '설탕은 어디로 갔을까?', scene: 'obs',
            goal: '설탕이 물에 녹아 눈에 보이지 않아요. 설탕은 어떻게 된 걸까요?',
            choices: ['설탕이 사라졌다.', '설탕이 물과 반응해 다른 물질로 변했다.', '설탕이 아주 작은 알갱이로 나뉘어 물에 골고루 섞여 있다.', '설탕이 물로 바뀌었다.'],
            answer: 2,
            feedback: ['물을 증발시키면 설탕이 다시 남아요. 사라진 게 아니에요.', '설탕물은 여전히 달아요. 설탕의 성질이 그대로라는 뜻이에요.', '', '물은 달지 않지만 설탕물은 달아요. 설탕이 물로 바뀐 게 아니에요.'],
            explain: '설탕은 <b>작은 알갱이(입자)로 나뉘어 물에 섞인 것</b>이라 눈에 보이지 않을 뿐이에요. 물질의 종류는 그대로이니 <b>물리 변화</b>예요.',
          },
        ],
      },
      {
        title: '새 물질이 생긴 증거', short: '새 물질의 증거', icon: '🧪', phase: '실험',
        features: ['lab'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 종이를 태우면 재와 연기라는 새로운 물질이 생겼죠? 그럼 <b>새로운 물질이 생겼다는 증거</b>는 무엇일까요?</div>' +
          '<p>실험대 4곳에서 일어나는 변화를 관찰하고, 알맞은 <b>증거 스티커</b>를 붙여 봐요.</p>' +
          '<p class="note">🥽 실험할 때는 보안경을 꼭 써요. (화면 속 실험이에요!)</p>',
        setup() { setScene('lab', true); },
        recap: '기체 발생, 앙금 생성, 색 변화, 빛과 열의 발생은 새로운 물질이 생겼다는 증거예요.',
        summary: tbl(['실험', '관찰', '증거'], [['마그네슘 + 묽은 염산', '기포(수소)', '기체 발생'], ['염화 나트륨 + 질산 은', '흰 앙금', '앙금 생성'], ['구리판 가열', '붉은색 → 검은색', '색 변화'], ['강철 솜 연소', '밝은 빛과 열', '빛·열 발생']]) +
          '<div class="note">냄새가 달라지는 것도 증거예요. 단, 물이 끓을 때 생기는 기포는 수증기(물)라서 새 물질이 아니에요.</div>',
        missions: [
          {
            title: '네 가지 실험 관찰', scene: 'lab', focus: 'labGo',
            goal: '실험대 네 곳에서 실험을 모두 해 보세요. 어떤 변화가 보이나요?',
            hint: '실험대를 눌러도 되고, 위에서 실험을 고른 뒤 ▶ 실험 시작을 눌러도 돼요.',
            setup() { setScene('lab', true); labReset(true); },
            check: () => labDone(), hold: 0.6,
            status: () => LAB.map((x, i) => chip(LB[i].st === 'done', x.short)).join(' · '),
            explain: '마그네슘에 묽은 염산을 넣으면 <b>기포(수소 기체)</b>가, 두 수용액을 섞으면 <b>흰색 앙금(염화 은)</b>이, 구리판을 가열하면 <b>검은색</b>(산화 구리(Ⅱ))이, 강철 솜을 태우면 <b>빛과 열</b>이 나와요. 모두 처음과 다른 물질이 생긴 거예요.',
          },
          {
            title: '증거 스티커 붙이기', scene: 'lab', manual: true,
            goal: '네 가지 증거 스티커를 알맞은 실험대에 끌어다 붙이고 ✔ 확인하기를 눌러요.',
            hint: '기포 → 기체 발생, 하얀 가루가 가라앉음 → 앙금 생성, 붉은색 → 검은색 → 색 변화, 밝은 불꽃 → 빛·열 발생이에요.',
            setup() { setScene('lab', true); dragL.items.forEach((s) => { s.slot = -1; s.wrong = false; s.tx = s.hx; s.ty = s.hy; }); LB.forEach((e) => { e.stk = null; }); LS.shaken = new Set(); },
            check: () => {
              const n = nPlaced();
              if (n < 4) return '스티커 ' + (4 - n) + '장이 남았어요. 모두 붙여 주세요.';
              const bad = dragL.items.filter((s) => LAB[s.slot].ev !== s.kind);
              if (!bad.length) return true;
              bad.forEach((s) => { if (!LS.shaken.has(s.slot)) { LS.shaken.add(s.slot); s.shake = 1; s.wrong = true; } });
              return '빨간 테두리 스티커 ' + bad.length + '장이 알맞지 않아요. 실험 결과를 다시 떠올려 봐요.';
            },
            explain: '<b>기체 발생</b>(기포), <b>앙금 생성</b>(흰 앙금), <b>색 변화</b>(구리가 검게), <b>빛·열 발생</b>(강철 솜 연소)은 모두 새로운 물질이 생긴 증거예요. 냄새가 달라지는 것도 증거가 될 수 있어요.',
          },
          {
            type: 'quiz', title: '끓을 때도 기포가 생기는데?', scene: 'lab',
            goal: '물이 끓을 때도 기포가 생겨요. 그런데 이것은 화학 변화가 아니에요. 그 까닭은?',
            choices: ['기포가 너무 작아서', '기포는 물이 기체로 변한 수증기라서 새로운 물질이 아니다', '불을 계속 쓰고 있어서', '물의 양이 줄어들어서'],
            answer: 1,
            feedback: ['기포의 크기와는 관계없어요.', '', '불을 써도 새 물질이 없으면 화학 변화가 아니에요.', '양이 줄어도 수증기는 여전히 물이에요.'],
            explain: '끓을 때 생기는 기포는 <b>물이 기체 상태가 된 수증기</b>예요. 물질이 그대로이고 상태만 변했으니 <b>물리 변화</b>예요. 증거를 볼 때는 “<b>정말 다른 물질이 생겼나?</b>”를 꼭 확인해야 해요.',
          },
        ],
      },
      {
        title: '입자 모형으로 보기', short: '입자 모형', icon: '🔍', phase: '모형',
        features: ['model'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 눈으로 보이는 증거로 새 물질을 찾았어요. 이번에는 <b>같은 물</b>의 두 가지 변화를 🔍 입자 모형으로 들여다봐요.</div>' +
          '<p>물이 <b>끓을 때</b>와 물에 <b>전류를 흘릴 때</b>, 분자와 원자는 어떻게 달라질까요?</p>',
        setup() { setScene('model', true); },
        recap: '화학 변화에서는 분자의 종류가 변하지만, 원자의 종류와 수는 변하지 않아요.',
        summary: tbl(['', '물이 끓음', '물의 전기 분해'], [['변화', '물리 변화', '화학 변화'], ['분자', '물 분자 그대로 (사이만 멀어짐)', '물 분자 → 수소 분자 + 산소 분자'], ['원자', '종류·수 그대로', '종류·수 그대로(재배열)']]) +
          '<div class="note">화학 변화에서 원자는 새로 생기거나 사라지지 않고, 짝만 바꿔요.</div>',
        missions: [
          {
            title: '같은 물, 다른 변화', scene: 'model', focus: 'boilBtn',
            goal: '물 끓이기와 물의 전기 분해를 모두 실행하고, 🔍 안의 분자 종류를 비교해 보세요.',
            hint: '두 버튼을 차례로 눌러요. 렌즈 속 분자의 모양이 그대로인지, 달라졌는지 보세요.',
            setup() { setScene('model', true); modelReset(); MS.lensOn = true; modelUI(); },
            check: () => MS.boil.st === 'done' && MS.elec.st === 'done', hold: 0.6,
            status: () => chip(MS.boil.st === 'done', '물 끓이기') + ' · ' + chip(MS.elec.st === 'done', '전기 분해'),
            explain: '물이 끓어도 <b>물 분자(H₂O)</b>는 그대로이고 분자 사이의 거리만 멀어져요. 전기 분해에서는 물 분자가 깨지고 원자가 다시 짝지어 <b>수소 분자(H₂)</b>와 <b>산소 분자(O₂)</b>라는 다른 분자가 돼요. 두 경우 모두 수소 원자 8개, 산소 원자 4개로 <b>원자의 종류와 수는 그대로</b>예요.',
          },
          {
            type: 'quiz', title: '화학 변화에서 달라지는 것', scene: 'model',
            goal: '화학 변화가 일어날 때 변하는 것과 변하지 않는 것을 바르게 짝지은 것은?',
            choices: ['변하는 것: 분자의 종류 / 변하지 않는 것: 원자의 종류와 수', '변하는 것: 원자의 종류 / 변하지 않는 것: 분자의 종류', '변하는 것: 원자의 수 / 변하지 않는 것: 분자의 종류와 수', '변하는 것: 분자 사이의 거리 / 변하지 않는 것: 분자의 종류'],
            answer: 0,
            feedback: ['', '원자의 종류는 바뀌지 않아요. 물이 수소와 산소로 나뉘어도 수소 원자와 산소 원자 그대로예요.', '원자는 사라지거나 새로 생기지 않아요. 수를 세어 보면 같았어요.', '이것은 끓음·응고 같은 물리 변화에서 일어나는 모습이에요.'],
            explain: '화학 변화에서는 원자의 <b>배열</b>이 바뀌어 <b>분자의 종류</b>가 달라져요. 하지만 <b>원자의 종류와 수는 변하지 않아요</b>. (다음 차시에서 이것을 화학 반응식으로 나타내 봐요!)',
          },
        ],
      },
      {
        title: '물리 변화와 화학 변화 분류하기', short: '분류하기', icon: '🗃️', phase: '적용',
        features: ['sort'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화학 변화는 <b>새로운 물질이 생기는 변화</b>이고, 물리 변화는 <b>물질은 그대로인 변화</b>임을 알았어요.</div>' +
          '<p>우리 생활 속 변화 10가지를 알맞은 상자에 넣어 봐요.</p>',
        setup() { setScene('sort', true); },
        recap: '새로운 물질이 생기면 화학 변화, 모양·크기·상태만 변하면 물리 변화예요.',
        summary: '<ul><li><b>물리 변화</b>: 얼음이 녹음, 유리컵이 깨짐, 설탕이 물에 녹음, 드라이아이스가 작아짐, 향수 냄새가 퍼짐, 촛농이 녹아 흐름</li><li><b>화학 변화</b>: 철이 녹슮, 김치가 시어짐, 달걀을 삶음, 과일이 익음, 양초가 탐</li></ul>' +
          '<div class="note">같은 양초라도 녹는 것은 물리 변화, 타는 것은 화학 변화예요.</div>',
        missions: [
          {
            title: '변화 카드 분류하기', scene: 'sort', manual: true,
            goal: '카드 10장을 물리 변화 상자와 화학 변화 상자에 나누어 넣고 ✔ 확인하기를 눌러요.',
            hint: '“처음과 다른 성질의 새로운 물질이 생겼나?”를 생각해 보세요. 모양이나 상태만 변하면 물리 변화예요.',
            setup() { setScene('sort', true); sortReset(); },
            check: () => {
              const n = nSorted();
              if (n < CARDS.length) return '아직 ' + (CARDS.length - n) + '장이 남았어요. 모든 카드를 상자에 넣어 주세요.';
              const bad = dragS.items.filter((s) => CARDS[s.ci].k !== s.box);
              if (!bad.length) return true;
              bad.forEach((s) => { if (!SORT.flagged.has(s.ci)) { SORT.flagged.add(s.ci); s.shake = 1; s.wrong = true; } });
              return '빨간 테두리 카드 ' + bad.length + '장이 잘못 들어갔어요. 예) “' + CARDS[bad[0].ci].t + '” → ' + CARDS[bad[0].ci].why;
            },
            explain: '<b>화학 변화</b>: 철이 녹슨다, 김치가 시어진다, 달걀을 삶는다, 과일이 익는다, 양초가 탄다 — 모두 <b>새로운 물질</b>이 생겨요. <b>물리 변화</b>: 얼음이 녹는다, 유리컵이 깨진다, 설탕이 물에 녹는다, 드라이아이스가 작아진다, 향수 냄새가 퍼진다 — 물질은 그대로예요.',
          },
          {
            type: 'quiz', title: '양초의 두 가지 변화', scene: 'sort', figure: SVG_CANDLE,
            goal: '양초를 가열하면 ㉠ 촛농이 녹아 흐르고, ㉡ 심지에서 양초가 타요. 화학 변화는 어느 것일까요?',
            choices: ['㉠만', '㉡만', '㉠과 ㉡ 모두', '㉠과 ㉡ 모두 아니다'],
            answer: 1,
            feedback: ['촛농이 녹는 것은 고체 양초가 액체가 된 상태 변화예요. 식으면 다시 양초(촛농)로 굳어요.', '', '촛농이 녹는 것은 같은 물질의 상태만 변하는 물리 변화예요.', '양초가 타면 이산화 탄소와 수증기라는 새로운 물질이 생겨요.'],
            explain: '양초가 <b>녹는 것(㉠)</b>은 물질이 그대로인 <b>물리 변화</b>이고, 양초가 <b>타는 것(㉡)</b>은 이산화 탄소와 수증기가 생기는 <b>화학 변화</b>예요. 한 현상 안에 두 가지 변화가 함께 일어날 수도 있어요.',
          },
        ],
      },
    ],
  });
  game.showTab && 0;

  refreshUI();
  obsUI(); labUI(); modelUI(); sortUI();
  const LOOP = startLoop(update, draw);
  window.__sim = {
    S, OB, LB, LS, MS, MC, dragL, dragS, CARDS, BOX, SORT, ACT, ACT_IDS, LAB, SC, get game() { return game; },
    ff: LOOP.ff, freeze: LOOP.freeze, v2s, setScene, startAct, labStart, boilStart, elecStart, setMat, cardX, cardC, CARD, poolPos, nPlaced, nSorted, reflowBox, boxItems,
  };
})();
