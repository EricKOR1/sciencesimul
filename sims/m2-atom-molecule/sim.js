/* =========================================================
   중2 Ⅳ. 물질의 구성 — 원자와 분자  [9과11-04 앞부분]
   물질을 이루는 입자는 원자, 분자, 이온 등으로 존재할 수 있음을 안다.
   ① 관찰: 물방울을 끝까지 나누어 분자 찾기 → ② 탐구: 원자로 / 분자로 존재하는 물질
   → ③ 모형: 원소 · 원자 · 분자 구별하기(렌즈 · 조립대) → ④ 적용: 원자 · 분자 · 이온 분류
   ※ 결합의 원리 · 분자 모양 설명 · 화학 반응식 · 이온 생성 과정은 다루지 않음
   ========================================================= */
(function () {
  'use strict';
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
  const VW = 800, VH = 520;
  const BGC0 = '#f6f9fe';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BGC0 });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();          // 반짝임 · 불티 · 별가루
  const MINUS = '−';

  let game = null;
  let F = new Set();
  const on = (f) => (game && game.free) || F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const COL = {
    ink: '#1b2333', muted: '#5d6879', line: '#dde4ef', good: '#14a058', bad: '#e2464b', sub: '#8b5cf6', warn: '#f26b3a',
    atom: '#0ea5a5', mol: '#8b5cf6', ion: '#f08c2e',
  };

  /* ---------- 시간 기준 움직임 도우미 (프레임 속도와 무관 · ff()로 빨리 감기 가능) ---------- */
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

  /* ---------- 효과음 (WebAudio 직접 합성: 퍽 · 쉬익 · 쿵) ---------- */
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
    glug() { Sound.tone(420 + Math.random() * 160, 0.05, 'sine', 0.035); },
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
  /* 화학식 글자: parts = [[기호, 개수], …] → 기호는 크게, 개수는 작게 아래첨자 */
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

  /* 부드러운 그림자: 한 번 그려 두고 재사용 (매 프레임 shadowBlur를 쓰지 않도록) */
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
  /* 실험대 (나무 판) */
  function bench(x, y, w, h) {
    panel(x, y, w, h, 14, '#e9c997', 12, 4, 'rgba(90,60,20,.28)');
    ctx.save(); ctx.beginPath(); D.roundRect(x, y, w, h, 14); ctx.clip();
    vgrad(ctx, x, y, w, h, '#efd3a6', '#d6ae75');
    ctx.strokeStyle = 'rgba(150,100,50,.13)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) { const yy = y + 10 + i * (h / 7); ctx.beginPath(); ctx.moveTo(x, yy); ctx.bezierCurveTo(x + w * 0.3, yy - 5, x + w * 0.65, yy + 6, x + w, yy - 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x, y, w, 3);
    ctx.restore();
  }
  /* 연구실 벽 배경 */
  function wall() {
    ctx.fillStyle = BGC0; ctx.fillRect(0, 0, VW, VH);
  }
  function pill(x, y, str, o) { return D.label(x, y, str, o); }

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
      ctx.save(); ctx.globalAlpha = a; ctx.translate(b.x, b.below ? b.y : b.y); ctx.scale(k, k); ctx.translate(-b.x, -b.y);
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
    FX.burst(x, y, { count: RM ? 3 : 6, speed: 130, life: 0.7, size: 3.6, colors: ['#ffd23f', '#fff6c2', '#8b5cf6'], shape: 'star' });
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
  /* 힌트 버튼을 눌렀을 때 3.6초 동안 깜빡이는 표시 */
  const FOC = { key: null, t: 0 };
  function setFocus(key) { FOC.key = key; FOC.t = 3.6; }
  function focusRing(r, key, rad) {
    if (FOC.key !== key || FOC.t <= 0) return;
    const a = 0.5 + 0.5 * Math.sin(now() * 9), fade = Math.min(1, FOC.t / 0.5);
    ctx.save(); ctx.globalAlpha = fade; ctx.strokeStyle = rgba(COL.warn, 0.35 + 0.6 * a); ctx.lineWidth = 5;
    D.roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, (rad || 14) + 5); ctx.stroke(); ctx.restore();
  }


  /* =========================================================
     장면 공통
     ========================================================= */
  const S = { scene: 'zoom', sceneT: 0 };
  const SC = {};
  const DR = { fn: null };
  const DBG = {};
  const hintEl = $('#stageHint');
  function showHint(t, ms) { hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5200); }
  function hideHint() { hintEl.classList.add('hide'); }
  const mark = (b) => (b ? '✅' : '⬜');


  /* =========================================================
     원자 공 · 분자 입자 모형 (앞 차시들과 같은 색 · 같은 모양)
     좌표 단위: Å, 1 Å = 55 px(기준) → 장면마다 sc(px/Å)를 정해 그림
     ========================================================= */
  const EL = {
    H:  { name: '수소',   c: '#f5f7fb', edge: '#c4ccd8', ink: '#4b5565', r: 22 },
    He: { name: '헬륨',   c: '#7fd8e8', ink: '#0f4a57', r: 24 },
    C:  { name: '탄소',   c: '#3a3f4b', edge: '#8e97ad', ink: '#ffffff', r: 30 },
    N:  { name: '질소',   c: '#3f6fe8', ink: '#ffffff', r: 28 },
    O:  { name: '산소',   c: '#ef4b4b', ink: '#ffffff', r: 29 },
    Ne: { name: '네온',   c: '#ff8a5c', ink: '#ffffff', r: 27 },
    Cu: { name: '구리',   c: '#c7743b', ink: '#ffffff', r: 33 },
    Na: { name: '나트륨', c: '#9b7be0', ink: '#ffffff', r: 22 },
    Cl: { name: '염소',   c: '#3fbf5f', ink: '#ffffff', r: 37 },
  };
  const SC0 = 27;                                   // 기본 크기: 1 Å = 27 px
  const rOf = (sym, sc) => EL[sym].r * (sc / 55);
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
    if (R >= 8 && sym) {
      g.fillStyle = e.ink; g.font = D.font(clamp(R * 0.62, 11, 24), 800);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sym, cx, cy + R * 0.06);
    }
    sp = { cv, half: R * m };
    SPR.set(key, sp);
    return sp;
  }
  /* 공 하나 (x, y) 중심, R 반지름. o: {alpha, dark} */
  function drawBall(sym, x, y, R, o) {
    o = o || {};
    if (R < 1.2) return;
    const rr = Math.max(2, Math.round(R));
    const sp = ballSprite(sym, rr);
    const s = sp.half * 2 * (R / rr);
    const a0 = ctx.globalAlpha;
    if (o.alpha != null && o.alpha < 1) ctx.globalAlpha = a0 * o.alpha;
    ctx.drawImage(sp.cv, x - s / 2, y - s / 2, s, s);
    if (o.dark > 0.01) { ctx.fillStyle = 'rgba(20,24,50,' + o.dark.toFixed(3) + ')'; circle(ctx, x, y, R); ctx.fill(); }
    ctx.globalAlpha = a0;
  }
  /* 이온 배지 '+' / '−' 와 얇은 광환 */
  function ionBadge(x, y, R, plus, a) {
    const k = a == null ? 1 : a;
    ctx.save(); ctx.globalAlpha *= k;
    ctx.strokeStyle = plus ? 'rgba(255,170,70,.75)' : 'rgba(70,150,255,.75)'; ctx.lineWidth = 2.2;
    circle(ctx, x, y, R + 3); ctx.stroke();
    const br = Math.max(7, Math.min(10, R * 0.5)), bx = x + R * 0.62, by = y - R * 0.62;
    ctx.fillStyle = '#fff'; circle(ctx, bx, by, br); ctx.fill();
    ctx.strokeStyle = plus ? '#f08c2e' : '#3b82f6'; ctx.lineWidth = 1.6; ctx.stroke();
    txt(plus ? '+' : MINUS, bx, by + 5, 14, plus ? '#d9731a' : '#2563eb', 'center', 800);
    ctx.restore();
  }

  /* ---------- 분자 자료 (좌표: Å) ---------- */
  const T4 = 0.63;
  const MOLS = {
    H2O: { name: '물', f: { H: 2, O: 1 }, atoms: [['O', 0, 0.2, 0], ['H', -0.76, -0.39, 0], ['H', 0.76, -0.39, 0]] },
    O2:  { name: '산소', f: { O: 2 }, atoms: [['O', -0.6, 0, 0], ['O', 0.6, 0, 0]] },
    H2:  { name: '수소', f: { H: 2 }, atoms: [['H', -0.37, 0, 0], ['H', 0.37, 0, 0]] },
    N2:  { name: '질소', f: { N: 2 }, atoms: [['N', -0.55, 0, 0], ['N', 0.55, 0, 0]] },
    CO2: { name: '이산화 탄소', f: { C: 1, O: 2 }, atoms: [['O', -1.16, 0, 0], ['C', 0, 0, 0], ['O', 1.16, 0, 0]] },
    CH4: { name: '메테인', f: { C: 1, H: 4 }, atoms: [['C', 0, 0, 0], ['H', T4, T4, T4], ['H', T4, -T4, -T4], ['H', -T4, T4, -T4], ['H', -T4, -T4, T4]] },
    NH3: { name: '암모니아', f: { N: 1, H: 3 }, atoms: [['N', 0, -0.12, 0], ['H', 0, 0.33, 0.94], ['H', 0.81, 0.33, -0.47], ['H', -0.81, 0.33, -0.47]] },
  };
  Object.keys(MOLS).forEach((k) => { const m = MOLS[k]; m.key = k; m.P = m.atoms.map(() => ({ x: 0, y: 0, z: 0, sym: '', k: 1, dark: 0, i: 0, r: 0 })); });
  // 분자 하나의 바깥 반지름(Å 단위가 아닌 sc=1 기준 비율)
  function molExtent(mol) {
    let m = 0; mol.atoms.forEach((a) => { m = Math.max(m, Math.hypot(a[1], a[2], a[3]) + EL[a[0]].r / 55); }); return m;
  }
  Object.keys(MOLS).forEach((k) => { MOLS[k].ext = molExtent(MOLS[k]); });
  const fText = (f, order) => (order || Object.keys(f)).map((s) => s + (f[s] > 1 ? f[s] : '')).join('');
  const molCount = (mol) => mol.atoms.length;

  /* 3축 회전 후 정사영: P[i] = {x, y, z, r, k, dark} (px) */
  function rotMol(mol, rx, ry, rz, sc, P) {
    P = P || mol.P;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    for (let i = 0; i < mol.atoms.length; i++) {
      const a = mol.atoms[i];
      const x = a[1], y = a[2], z = a[3];
      const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
      const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
      const x3 = x2 * cz - y1 * sz, y3 = x2 * sz + y1 * cz;
      const p = P[i];
      p.x = x3 * sc; p.y = y3 * sc; p.z = z2 * sc; p.sym = a[0]; p.i = i;
      const d = clamp(z2 / 1.3, -1, 1);
      p.k = 0.96 + 0.04 * d; p.dark = Math.max(0, -d) * 0.12;
      p.r = rOf(a[0], sc) * p.k;
    }
    return P;
  }
  const ORD = [];
  /* 깊이순으로 그리기 (분자 하나) */
  function drawMolP(P, cx, cy, o) {
    o = o || {};
    const n = P.length;
    ORD.length = 0; for (let i = 0; i < n; i++) ORD.push(P[i]);
    ORD.sort((a, b) => a.z - b.z);
    const rs = o.rs || 1;
    for (let i = 0; i < n; i++) { const p = ORD[i]; drawBall(p.sym, cx + p.x, cy + p.y, p.r * rs, { dark: p.dark, alpha: o.alpha }); }
  }
  /* 분자 그림자 (바닥 느낌) */
  function molShadow(P, cx, cy, a) {
    let minX = 1e9, maxX = -1e9, maxY = -1e9;
    P.forEach((p) => { minX = Math.min(minX, p.x - p.r); maxX = Math.max(maxX, p.x + p.r); maxY = Math.max(maxY, p.y + p.r); });
    groundShadow(cx + (minX + maxX) / 2, cy + maxY + 8, (maxX - minX) / 2 + 12, 5, a == null ? 1 : a);
  }
  /* 볼록 껍질 (분자 렌즈): 각 원자 둘레 점들의 convex hull */
  const HP = [];
  function hullPath(P, cx, cy, pad) {
    HP.length = 0;
    for (let i = 0; i < P.length; i++) { const p = P[i], r = p.r + pad; for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; HP.push([cx + p.x + Math.cos(a) * r, cy + p.y + Math.sin(a) * r]); } }
    HP.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (let i = 0; i < HP.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], HP[i]) <= 0) lo.pop(); lo.push(HP[i]); }
    for (let i = HP.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], HP[i]) <= 0) up.pop(); up.push(HP[i]); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }
  function drawHull(P, cx, cy, pad, fill, stroke, lw) {
    const h = hullPath(P, cx, cy, pad);
    ctx.beginPath();
    for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(a[0], a[1], mx, my); }
    { const a = h[0], b = h[1]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke();
    return h;
  }
  /* 작은 분자 그림(상자 · 퀴즈용): 정지 자세 */
  function drawMolStatic(key, cx, cy, sc, ang) {
    const mol = MOLS[key];
    const P = rotMol(mol, 0.35, ang == null ? 0.5 : ang, 0, sc, mol.P);
    drawMolP(P, cx, cy);
  }

  /* =========================================================
     장면 1 · zoom — 물방울을 1/10씩 나누며 확대 (1단계)
     ========================================================= */
  const DROP = { x: 350, y: 256, r: 92 };
  const ZL = [
    { dia: '1 mm', bar: '1 mm', n: '약 1.7×10¹⁹개', alt: '약 1700경 개' },
    { dia: '0.1 mm', bar: '0.1 mm', n: '약 1.7×10¹⁶개', alt: '' },
    { dia: '10 µm (0.01 mm)', bar: '10 µm', n: '약 1.7×10¹³개', alt: '약 17조 개' },
    { dia: '1 µm (0.001 mm)', bar: '1 µm', n: '약 1.7×10¹⁰개', alt: '약 170억 개' },
    { dia: '0.1 µm', bar: '0.1 µm', n: '약 1.7×10⁷개', alt: '약 1700만 개' },
    { dia: '10 nm', bar: '10 nm', n: '약 1만 7000개', alt: '' },
    { dia: '1 nm', bar: '1 nm', n: '약 17개', alt: '' },
    { dia: '약 0.3 nm', bar: '약 0.3 nm', n: '1개', alt: '' },
  ];
  const ZM = {
    level: 0, phase: 'idle', t: 0, e: 0, frag: [], pop: 1, split: false, spread: 0, apart: 0, crack: -1, badgeIn: 1,
    ang: { rx: 0.3, ry: 0.4, rz: 0.1 }, flash: 0, tx: 0, tt: 0,
  };
  const zoomMax = () => ZM.level >= 7;
  const zoomBusy = () => ZM.phase !== 'idle';

  /* ----- 배경 (한 번만 그려 두고 재사용) ----- */
  const BGS = [];
  function makeBg(level) {
    const cv = document.createElement('canvas'); cv.width = VW; cv.height = VH;
    const g = cv.getContext('2d');
    let seed = 7 + level * 131; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    if (level === 0) {
      const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#86dc8f'); gr.addColorStop(1, '#2f9c52');
      g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
      const rg = g.createRadialGradient(200, 120, 20, 200, 120, 520); rg.addColorStop(0, 'rgba(255,255,220,.45)'); rg.addColorStop(1, 'rgba(255,255,220,0)');
      g.fillStyle = rg; g.fillRect(0, 0, VW, VH);
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(225,255,205,.6)'; g.lineWidth = 16; g.beginPath(); g.moveTo(-30, 470); g.bezierCurveTo(240, 420, 520, 190, 840, 60); g.stroke();
      g.strokeStyle = 'rgba(240,255,225,.55)'; g.lineWidth = 6; g.stroke();
      g.strokeStyle = 'rgba(225,255,205,.38)'; g.lineWidth = 6;
      for (let i = 0; i < 9; i++) {
        const t = (i + 0.7) / 9.6, bx = -30 + 870 * t, by = 470 - 410 * Math.pow(t, 1.05);
        for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + sgn * 40 + 20, by + sgn * 80, bx + sgn * 120 + 60, by + sgn * 190); g.stroke(); }
      }
    } else if (level === 1) {
      g.fillStyle = '#c9e9bd'; g.fillRect(0, 0, VW, VH);
      const R = 34, hh = R * Math.sqrt(3);
      for (let row = -1; row < VH / hh + 2; row++) for (let col = -1; col < VW / (R * 1.5) + 2; col++) {
        const x = col * R * 1.5, y = row * hh + (col % 2 ? hh / 2 : 0);
        g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const px = x + Math.cos(a) * (R - 2), py = y + Math.sin(a) * (R - 2); k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath();
        g.fillStyle = 'rgba(' + (150 + Math.floor(rnd() * 40)) + ',' + (205 + Math.floor(rnd() * 30)) + ',160,.55)'; g.fill();
        g.strokeStyle = 'rgba(70,140,80,.45)'; g.lineWidth = 3; g.stroke();
        for (let c = 0; c < 3; c++) { g.fillStyle = 'rgba(60,150,80,.4)'; g.beginPath(); g.arc(x + (rnd() - 0.5) * R, y + (rnd() - 0.5) * R * 0.9, 3 + rnd() * 3, 0, TAU); g.fill(); }
      }
    } else if (level === 2 || level === 3) {
      const c0 = level === 2 ? ['#d9e4dc', '#aebfb4'] : ['#b9c4d4', '#8694ab'];
      const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, c0[0]); gr.addColorStop(1, c0[1]); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * VW, y = rnd() * VH, r = 30 + rnd() * 70;
        const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(255,255,255,' + (0.18 + rnd() * 0.15).toFixed(2) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
    } else {
      const rg = g.createRadialGradient(VW * 0.45, VH * 0.4, 30, VW * 0.5, VH * 0.5, 560); rg.addColorStop(0, '#26335f'); rg.addColorStop(1, '#0a1020');
      g.fillStyle = rg; g.fillRect(0, 0, VW, VH);
      g.fillStyle = 'rgba(180,210,255,.10)';
      for (let x = 20; x < VW; x += 40) for (let y = 20; y < VH; y += 40) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
      for (let i = 0; i < 10; i++) { const x = rnd() * VW, y = rnd() * VH, r = 20 + rnd() * 50; const gg = g.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, 'rgba(120,160,255,.08)'); gg.addColorStop(1, 'rgba(120,160,255,0)'); g.fillStyle = gg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    }
    return cv;
  }
  const bgFor = (lv) => { const k = Math.min(lv, 4); return BGS[k] || (BGS[k] = makeBg(k)); };
  function drawBg(lv, a, s) {
    const bg = bgFor(lv);
    ctx.save(); ctx.globalAlpha *= a;
    if (s && s !== 1) { ctx.translate(DROP.x, DROP.y); ctx.scale(s, s); ctx.translate(-DROP.x, -DROP.y); }
    ctx.drawImage(bg, 0, 0, VW, VH);
    ctx.restore();
  }

  /* ----- 물방울 · 입자 모형 ----- */
  function packDisc(n, rho, seed) {
    let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const P = [];
    for (let i = 0; i < n; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * (1 - rho); P.push({ x: Math.cos(a) * r, y: Math.sin(a) * r }); }
    for (let it = 0; it < 160; it++) {
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = P[j].x - P[i].x, dy = P[j].y - P[i].y, d = Math.hypot(dx, dy) || 1e-4, mn = 2 * rho * 0.96;
        if (d < mn) { const k = (mn - d) / 2 / d; P[i].x -= dx * k; P[i].y -= dy * k; P[j].x += dx * k; P[j].y += dy * k; }
      }
      for (let i = 0; i < n; i++) { const d = Math.hypot(P[i].x, P[i].y), mx = 1 - rho * 0.9; if (d > mx) { P[i].x *= mx / d; P[i].y *= mx / d; } }
    }
    return P;
  }
  const LQ = {};
  function liquid(level) {
    if (LQ[level]) return LQ[level];
    const n = level === 5 ? 40 : 17, rho = level === 5 ? 0.125 : 0.2;
    const homes = packDisc(n, rho, 11 + level * 7);
    let s = level * 97 + 5; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const mols = homes.map((h) => ({ hx: h.x, hy: h.y, ph: rnd() * TAU, ph2: rnd() * TAU, w: 0.5 + rnd() * 0.5, P: MOLS.H2O.atoms.map(() => ({ x: 0, y: 0, z: 0, sym: '', k: 1, dark: 0, i: 0, r: 0 })) }));
    return (LQ[level] = { rho, mols });
  }
  function drawWaterDrop(cx, cy, r, a, t, o) {
    o = o || {};
    if (r < 0.8) return;
    ctx.save(); ctx.globalAlpha *= a;
    if (o.shadow) {
      const g = ctx.createRadialGradient(cx + r * 0.12, cy + r * 0.2, r * 0.3, cx + r * 0.12, cy + r * 0.2, r * 1.35);
      g.addColorStop(0, 'rgba(10,50,20,.5)'); g.addColorStop(0.7, 'rgba(10,50,20,.18)'); g.addColorStop(1, 'rgba(10,50,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx + r * 0.12, cy + r * 0.26, r * 1.3, r * 1.2, 0, 0, TAU); ctx.fill();
    }
    ctx.beginPath();
    if (o.bumpy) { for (let i = 0; i <= 72; i++) { const th = (i / 72) * TAU, rr = r * (1 + 0.035 * Math.sin(th * 7 + t * 1.6) + 0.025 * Math.sin(th * 13 - t * 2.1) + 0.015 * Math.sin(th * 23 + t * 3)); const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
    else ctx.arc(cx, cy, r, 0, TAU);
    const gr = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
    if (o.dark) { gr.addColorStop(0, 'rgba(170,215,255,.30)'); gr.addColorStop(0.75, 'rgba(90,150,235,.38)'); gr.addColorStop(1, 'rgba(120,190,255,.75)'); }
    else { gr.addColorStop(0, 'rgba(215,240,255,.22)'); gr.addColorStop(0.62, 'rgba(120,190,240,.34)'); gr.addColorStop(0.88, 'rgba(36,110,190,.58)'); gr.addColorStop(1, 'rgba(20,80,160,.8)'); }
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = o.dark ? 'rgba(170,220,255,.9)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, r * 0.022); ctx.stroke();
    // 아래쪽 집광점
    const cg = ctx.createRadialGradient(cx + r * 0.18, cy + r * 0.5, 0, cx + r * 0.18, cy + r * 0.5, r * 0.42);
    cg.addColorStop(0, o.dark ? 'rgba(200,230,255,.5)' : 'rgba(255,255,255,.6)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx + r * 0.18, cy + r * 0.5, r * 0.42, 0, TAU); ctx.fill();
    // 왼쪽 위 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.38, cy - r * 0.45, r * 0.24, r * 0.12, -0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(cx - r * 0.14, cy - r * 0.6, r * 0.045, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawLiquidDrop(level, cx, cy, r, a, t) {
    if (r < 0.8) return;
    const L = liquid(level);
    ctx.save(); ctx.globalAlpha *= a;
    D.glow(cx, cy, r * 1.25, '#7cc4ff', 0.28);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
    const gr = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
    gr.addColorStop(0, 'rgba(140,200,255,.10)'); gr.addColorStop(0.8, 'rgba(110,180,255,.16)'); gr.addColorStop(1, 'rgba(150,210,255,.45)');
    ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = 'rgba(160,215,255,.85)'; ctx.lineWidth = Math.max(1, r * 0.022); ctx.stroke();
    const sc = L.rho * r / 1.25, rot = t * 0.12, cr = Math.cos(rot), sr = Math.sin(rot), rr = r * 0.97;
    if (sc * 0.5 > 0.6) {
      L.mols.forEach((m) => {
        const hx = m.hx * cr - m.hy * sr, hy = m.hx * sr + m.hy * cr;
        const wx = Math.sin(t * 1.3 + m.ph) * 0.012, wy = Math.cos(t * 1.1 + m.ph2) * 0.012;
        const x = cx + (hx + wx) * rr, y = cy + (hy + wy) * rr;
        rotMol(MOLS.H2O, 0.25 + 0.5 * Math.sin(t * 0.7 + m.ph), t * 0.5 * m.w + m.ph, 0.6 * Math.sin(t * 0.55 + m.ph2), sc, m.P);
        drawMolP(m.P, x, y);
      });
    }
    ctx.restore();
  }
  /* 한 레벨의 모습을 (cx, cy) · 반지름 r로 그린다 */
  function drawLevelBody(level, cx, cy, r, a, t) {
    if (level <= 3) drawWaterDrop(cx, cy, r, a, t, { shadow: level <= 2 });
    else if (level === 4) drawWaterDrop(cx, cy, r, a, t, { bumpy: true, dark: true });
    else if (level <= 6) drawLiquidDrop(level, cx, cy, r, a, t);
    else {
      const P = rotMol(MOLS.H2O, ZM.ang.rx, ZM.ang.ry, ZM.ang.rz, r * 1.0, MOLS.H2O.P);
      ctx.save(); ctx.globalAlpha *= a; D.glow(cx, cy + r * 0.05, r * 1.35, '#7cc4ff', 0.22); ctx.restore();
      if (r > 20) molShadow(P, cx, cy, a * 0.7);
      drawMolP(P, cx, cy, { alpha: a });
    }
  }

  /* ----- 쪼개기 · 확대 ----- */
  function makeFrag() {
    ZM.frag = [];
    for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU + rand(-0.12, 0.12); ZM.frag.push({ a, d: rand(34, 150), r: rand(4, 13), delay: rand(0, 0.08) }); }
  }
  function zoomStep() {
    if (zoomBusy()) return false;
    if (ZM.level < 7) { ZM.phase = 'split'; ZM.t = 0; makeFrag(); sfx.pop(); zoomRefresh(); return true; }
    if (!ZM.split) { ZM.phase = 'bond'; ZM.t = 0; sfx.whoosh(); zoomRefresh(); return true; }
    return false;
  }
  function zoomReset() {
    if (ZM.level === 0 && ZM.phase === 'idle' && !ZM.split) return;
    ZM.phase = 'rev'; ZM.t = 0; ZM.split = false; ZM.spread = 0; ZM.apart = 0; ZM.crack = -1; ZM.badgeIn = 1; ZM.level = 0; ZM.flash = 1;
    makeFrag(); sfx.whoosh(); zoomRefresh();
  }
  function zoomRefresh() {
    const b = $('#zoomBtn'); if (!b) return;
    b.textContent = ZM.level >= 7 ? '✂️ 더 나누기' : '✂️ 1/10로 나누기';
    b.disabled = zoomBusy() || (ZM.level >= 7 && ZM.split);
    if (ZM.level >= 7 && ZM.split) b.textContent = '✔ 나누기 끝';
    const r = $('#zoomResetBtn'); if (r) r.disabled = ZM.level === 0 && !zoomBusy() && !ZM.split;
  }
  const FRAG_END = (f) => ({ x: Math.cos(f.a) * f.d, y: Math.sin(f.a) * f.d });
  function zoomUpdate(dt) {
    ZM.tt += dt;
    ZM.pop = Math.min(1, ZM.pop + dt / 0.35);
    ZM.flash = Math.max(0, ZM.flash - dt * 4);
    ZM.ang.ry = 0.35 + Math.sin(ZM.tt * 0.6) * 0.8; ZM.ang.rx = 0.28 + Math.sin(ZM.tt * 0.43) * 0.12; ZM.ang.rz = Math.sin(ZM.tt * 0.37) * 0.22;
    if (ZM.phase === 'split') {
      ZM.t += dt;
      if (ZM.t >= 0.4) { ZM.phase = 'zoom'; ZM.t = 0; ZM.e = 0; Sound.tone(300, 0.5, 'sine', 0.05); }
    } else if (ZM.phase === 'zoom') {
      ZM.t += dt / (RM ? 0.45 : 0.9);
      ZM.e = ease.inOutCubic(Math.min(1, ZM.t));
      if (ZM.t >= 1) { ZM.level++; ZM.phase = 'idle'; ZM.e = 0; ZM.frag = []; ZM.pop = 0; Sound.tick(); zoomRefresh(); }
    } else if (ZM.phase === 'rev') {
      ZM.t += dt / 0.7;
      ZM.e = 1 - ease.outCubic(Math.min(1, ZM.t));
      if (ZM.t >= 1) { ZM.phase = 'idle'; ZM.e = 0; ZM.frag = []; ZM.pop = 0; zoomRefresh(); }
    } else if (ZM.phase === 'bond') {
      ZM.t += dt;
      ZM.spread = ease.outCubic(Math.min(1, ZM.t / 0.7)) * 20;
      if (ZM.t >= 0.75) {
        ZM.phase = 'apart'; ZM.t = 0; ZM.split = true; ZM.crack = 0; ZM.apartAng = { rx: ZM.ang.rx, ry: ZM.ang.ry, rz: ZM.ang.rz };
        sfx.pop();
        FX.burst(DROP.x, DROP.y + 6, { count: RM ? 8 : 22, speed: 220, life: 0.7, size: 3.6, colors: ['#fff6c2', '#ffd23f', '#ffffff'], shape: 'star', gravity: 60 });
      }
    } else if (ZM.phase === 'apart') {
      ZM.t += dt;
      ZM.apart = ease.outBack(Math.min(1, ZM.t / 0.75));
      if (ZM.crack >= 0) ZM.crack = Math.min(1.2, ZM.crack + dt / 0.35);
      if (ZM.t >= 1.0) { ZM.phase = 'idle'; zoomRefresh(); }
    }
    if (ZM.split) ZM.apart = Math.max(ZM.apart, ZM.phase === 'apart' ? ZM.apart : 1);
  }

  /* ----- 그리기 ----- */
  function zoomChips() {
    const x = 556, y = 12, w = 228, lv = Math.min(ZM.level, 7), L = ZL[lv];
    panel(x, y, w, 128, 14, 'rgba(255,255,255,.95)', 10, 3);
    const k = outBack(ZM.pop);
    txt(lv === 7 ? '크기' : '물방울 지름', x + 14, y + 25, 13, COL.muted, 'left', 700);
    ctx.save(); ctx.translate(x + 14, y + 47); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); txt(L.dia, 0, 0, 17, COL.ink, 'left', 800); ctx.restore();
    txt('물 분자 수', x + 14, y + 74, 13, COL.muted, 'left', 700);
    ctx.save(); ctx.translate(x + 14, y + 97); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); txt(L.n, 0, 0, 17, COL.mol, 'left', 800); ctx.restore();
    if (L.alt) txt('(' + L.alt + ')', x + 14, y + 118, 13, COL.muted, 'left', 700);
    // 배지
    const bx = x + w / 2, by = y + 152;
    if (!ZM.split) {
      D.label(bx, by, '여전히 물 ✔', { bg: '#0f8a4b', size: 15, pad: 12 });
    } else {
      const c = ZM.crack;
      if (c < 1) {
        const kk = Math.max(0, c);
        [-1, 1].forEach((sg) => {
          ctx.save(); ctx.globalAlpha = 1 - kk * 0.85;
          ctx.translate(bx + sg * kk * 26, by + kk * kk * 90); ctx.rotate(sg * kk * 0.7);
          ctx.beginPath(); ctx.rect(sg < 0 ? -90 : 0, -30, 90, 60); ctx.clip();
          D.label(0, 0, '여전히 물 ✔', { bg: '#0f8a4b', size: 15, pad: 12 });
          ctx.restore();
        });
      } else {
        const kk = outBack(Math.min(1, (c - 1) / 0.2) * 1);
        ctx.save(); ctx.translate(bx, by); ctx.scale(Math.max(0.01, kk), Math.max(0.01, kk)); D.label(0, 0, '더 이상 물이 아니에요 ✗', { bg: COL.bad, size: 14, pad: 12 }); ctx.restore();
      }
    }
  }
  function zoomScaleBar() {
    const lv = Math.min(ZM.level, 7), L = ZL[lv], x0 = 40, y0 = 494, w = DROP.r * 2;
    const a = ZM.phase === 'zoom' ? 1 - smooth(ZM.t * 3) * 0.8 : ZM.phase === 'split' ? 1 : 1;
    ctx.save(); ctx.globalAlpha = a;
    const dark = lv >= 4 || ZM.phase === 'zoom';
    ctx.strokeStyle = dark ? '#e8f0ff' : '#1b2333'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.moveTo(x0, y0 - 7); ctx.lineTo(x0, y0 + 7); ctx.moveTo(x0 + w, y0 - 7); ctx.lineTo(x0 + w, y0 + 7); ctx.stroke();
    txt(L.bar, x0 + w / 2, y0 - 12, 15, dark ? '#e8f0ff' : '#1b2333', 'center', 800, { stroke: dark ? 'rgba(10,16,32,.7)' : 'rgba(255,255,255,.8)', strokeWidth: 4 });
    ctx.restore();
  }
  function zoomDraw(t) {
    const lv = ZM.level, cx = DROP.x, cy = DROP.y;
    if (ZM.phase === 'zoom' || ZM.phase === 'rev') {
      const e = ZM.e, s = Math.pow(10, e);
      drawBg(lv, 1 - e, s);
      drawBg(lv + 1, e, 1);
      // 흩어진 작은 물방울: 화면 밖으로 밀려난다
      ZM.frag.forEach((f) => { const q = FRAG_END(f); drawLevelBody(Math.min(lv, 4) , cx + q.x * s, cy + q.y * s, f.r * s, Math.max(0, 0.55 - e * 1.2), t); });
      drawLevelBody(Math.min(lv + 1, 7), cx, cy, 9.2 * s, 1, t);
      txt('🔍 ×10', cx, cy - DROP.r - 20, 22, '#fff', 'center', 800, { stroke: 'rgba(20,30,60,.55)', strokeWidth: 5 });
    } else {
      drawBg(lv, 1, 1);
      if (ZM.phase === 'split') {
        const p = ease.outCubic(Math.min(1, ZM.t / 0.4));
        ZM.frag.forEach((f) => { const q = FRAG_END(f), pp = ease.outCubic(clamp((ZM.t - f.delay) / 0.32, 0, 1)); drawLevelBody(Math.min(lv, 4), cx + q.x * pp, cy + q.y * pp, f.r * (1 - 0.1 * pp), 0.95, t); });
        drawLevelBody(lv, cx, cy, lerp(DROP.r, 9.2, p), 1, t);
      } else if (lv === 7 && (ZM.phase === 'bond' || ZM.split)) {
        zoomAtoms(t);
      } else {
        drawLevelBody(lv, cx, cy, DROP.r, 1, t);
        if (lv === 5) txt('일부만 그림', cx, cy + DROP.r + 22, 13, '#cfe0ff', 'center', 800);
        if (lv === 7) {
          const a = ease.outCubic(clamp(ZM.pop * 2 - 0.4, 0, 1));
          ctx.save(); ctx.globalAlpha = a;
          D.label(cx, cy + DROP.r + 42, '물 분자(H₂O): 산소 원자 1개 + 수소 원자 2개', { bg: 'rgba(30,50,110,.92)', size: 14, pad: 12 });
          ctx.restore();
        }
      }
    }
    zoomChips();
    zoomScaleBar();
    if (ZM.flash > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + (ZM.flash * 0.7).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); }
    focusRing({ x: 30, y: 60, w: 520, h: 400 }, 'zoomBtn', 16);
  }
  /* 물 분자 → 원자 3개 */
  function zoomAtoms(t) {
    const cx = DROP.x, cy = DROP.y;
    const ang = ZM.split && ZM.apartAng ? ZM.apartAng : ZM.ang;
    const sc = DROP.r * 1.0;
    const P = rotMol(MOLS.H2O, ang.rx, ang.ry, ang.rz, sc, MOLS.H2O.P);
    const sp = ZM.phase === 'bond' ? ZM.spread : 20;
    const ap = ZM.split ? ZM.apart : 0;
    const finals = [{ x: 0, y: -40 }, { x: -178, y: 58 }, { x: 178, y: 58 }];
    const pos = P.map((p, i) => {
      const len = Math.hypot(p.x, p.y) || 1;
      const bx = p.x + (p.x / len) * sp * (i === 0 ? 0 : 1) * (ZM.phase === 'bond' ? 1 : 0) + (ZM.phase === 'bond' ? Math.sin(t * 60 + i * 2) * 1.6 * (sp / 20) : 0);
      const by = p.y + (p.y / len) * sp * (i === 0 ? 0 : 1) * (ZM.phase === 'bond' ? 1 : 0);
      return { x: lerp(bx, finals[i].x, ap), y: lerp(by, finals[i].y + Math.sin(t * 1.6 + i * 2) * 3 * ap, ap), p };
    });
    // 결합 막대 (늘어나며 빛남)
    if (ZM.phase === 'bond') {
      const k = ZM.spread / 20, glow = 0.5 + 0.5 * Math.sin(t * 28);
      [1, 2].forEach((j) => {
        ctx.save(); ctx.lineCap = 'round';
        ctx.strokeStyle = rgba('#fff6c2', 0.35 + 0.45 * k * glow); ctx.lineWidth = 16 * (1 - 0.6 * k) + 4;
        ctx.beginPath(); ctx.moveTo(cx + pos[0].x, cy + pos[0].y); ctx.lineTo(cx + pos[j].x, cy + pos[j].y); ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', 0.5 + 0.4 * glow); ctx.lineWidth = Math.max(1.5, 6 * (1 - k));
        ctx.stroke(); ctx.restore();
      });
    }
    const order = pos.map((q, i) => i).sort((a, b) => P[a].z - P[b].z);
    if (ap < 0.05) molShadow(P, cx, cy, 0.6);
    order.forEach((i) => { const q = pos[i]; drawBall(P[i].sym, cx + q.x, cy + q.y, P[i].r, { dark: P[i].dark }); });
    if (ZM.split && ap > 0.6) {
      const names = ['산소 원자', '수소 원자', '수소 원자'], a = smooth((ap - 0.6) / 0.4);
      order.forEach((i) => { const q = pos[i]; ctx.save(); ctx.globalAlpha = a; D.label(cx + q.x, cy + q.y + P[i].r + 24, names[i], { bg: i === 0 ? '#c0392b' : '#5b6779', size: 14, pad: 11 }); ctx.restore(); });
    }
    if (ZM.phase === 'bond') D.label(cx, cy + DROP.r + 52, '결합이 늘어나요…', { bg: 'rgba(30,50,110,.92)', size: 14, pad: 12 });
  }
  SC.zoom = {
    label: '💧 물방울을 1/10로 계속 나눠요',
    get hint() { return '✂️ 버튼을 눌러 물방울을 1/10 크기로 나누고 확대해요'; },
    enter() { zoomRefresh(); },
    update(dt) { zoomUpdate(dt); },
    draw(t) { zoomDraw(t); },
    hover() { return null; },
  };
  Object.assign(DBG, { ZM, ZL, zoomStep, zoomReset, DROP });

  /* =========================================================
     장면 2 · scope — 입자 현미경 (2 · 4단계) : 원자 / 분자 / 이온으로 분류
     ========================================================= */
  const WIN = { x: 290, y: 186, R: 156, Rin: 142 };
  const SCW = 30;                                     // 현미경 속 크기: 1 Å = 30 px
  const SAMPLES = {
    he:   { name: '헬륨 풍선', short: '헬륨', kind: 'atom', formula: 'He', cap: '헬륨 원자가 하나씩 따로 떨어져 빠르게 날아다녀요.' },
    ne:   { name: '네온사인', short: '네온', kind: 'atom', formula: 'Ne', cap: '네온 원자가 하나씩 따로 떨어져 빠르게 날아다녀요.' },
    cu:   { name: '구리 전선', short: '구리', kind: 'atom', formula: 'Cu', cap: '구리 원자가 규칙적으로 끝없이 이어져 있어요. 제자리에서 떨기만 해요.' },
    o2:   { name: '산소통', short: '산소', kind: 'mol', formula: 'O₂', cap: '산소 원자 2개가 결합한 입자(분자)가 한 덩어리로 날아다녀요.' },
    co2:  { name: '이산화 탄소', short: '이산화 탄소', kind: 'mol', formula: 'CO₂', cap: '탄소 원자 1개와 산소 원자 2개가 결합한 입자(분자)예요.' },
    h2o:  { name: '물 컵', short: '물', kind: 'mol', formula: 'H₂O', cap: '산소 원자 1개와 수소 원자 2개가 결합한 입자(분자)가 붙어서 미끄러져요.' },
    ch4:  { name: '메테인', short: '메테인', kind: 'mol', formula: 'CH₄', cap: '탄소 원자 1개와 수소 원자 4개가 결합한 입자(분자)가 날아다녀요.' },
    nacl: { name: '소금', short: '소금', kind: 'ion', formula: 'NaCl', cap: '(+)전하를 띤 입자와 (−)전하를 띤 입자가 번갈아 규칙적으로 배열해 있어요.', cap2: '이렇게 전하를 띤 입자를 이온이라고 해요.' },
  };
  const LIST2 = ['he', 'ne', 'cu', 'o2', 'co2', 'h2o'];
  const LIST4 = ['he', 'cu', 'o2', 'h2o', 'co2', 'ch4', 'nacl'];
  const LISTF = ['he', 'ne', 'cu', 'o2', 'co2', 'h2o', 'ch4', 'nacl'];
  const BOXK = {
    atom: { title: '원자로 존재', color: '#0ea5a5', bg: '#e3f7f7' },
    mol: { title: '분자로 존재', color: '#8b5cf6', bg: '#efe9fe' },
    ion: { title: '이온으로 존재', color: '#f08c2e', bg: '#fff0de' },
  };
  const BOX_ORDER = ['atom', 'mol', 'ion'];
  const SCP = {
    list: [], items: [], placed: {}, seen: {}, cur: null, ap: 0, sys: null, chip: null, ghosts: [], b3: 0, drag: null, boxShake: {}, boxMsg: {}, hoverBox: null,
    tokenT: {}, t: 0, saltSeen: false, listKey: '',
  };
  const SHELF = { x: 16, y: 416, w: 768, h: 98 };

  /* ----- 시료 그림 (선반 · 칩) ----- */
  function drawSampleIcon(id, cx, cy, s, a) {
    ctx.save(); ctx.globalAlpha *= a == null ? 1 : a; ctx.translate(cx, cy); ctx.scale(s, s);
    if (id === 'he') {
      ctx.strokeStyle = '#8a97ab'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-6, 20, 6, 24, 0, 30); ctx.stroke();
      const g = ctx.createRadialGradient(-6, -14, 3, 0, -6, 24); g.addColorStop(0, '#d8fbff'); g.addColorStop(0.5, '#6ad3e6'); g.addColorStop(1, '#1f9db5');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -6, 17, 21, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1f9db5'; ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(-4, 20); ctx.lineTo(4, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-7, -14, 4, 8, 0.5, 0, TAU); ctx.fill();
    } else if (id === 'ne') {
      D.glow(0, 0, 40, '#ff8a5c', 0.45);
      ctx.fillStyle = '#1b2333'; D.roundRect(-26, -17, 52, 34, 7); ctx.fill();
      ctx.strokeStyle = '#ffb08a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-18, 7); ctx.lineTo(-18, -8); ctx.lineTo(-8, 7); ctx.lineTo(-8, -8); ctx.moveTo(2, 7); ctx.bezierCurveTo(2, -12, 18, -12, 18, 2); ctx.stroke();
      ctx.strokeStyle = '#ff6a35'; ctx.lineWidth = 2.4; ctx.stroke();
    } else if (id === 'cu') {
      for (let i = 0; i < 5; i++) {
        const y = -12 + i * 7.5, g = ctx.createLinearGradient(-20, y, 20, y); g.addColorStop(0, '#8a4a22'); g.addColorStop(0.35, '#f0a066'); g.addColorStop(1, '#8a4a22');
        ctx.strokeStyle = g; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, y, 19, 6, 0, 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = '#c7743b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(18, 22); ctx.bezierCurveTo(26, 28, 22, 32, 14, 30); ctx.stroke();
    } else if (id === 'o2') {
      const g = ctx.createLinearGradient(-12, 0, 12, 0); g.addColorStop(0, '#8dbaff'); g.addColorStop(0.4, '#4a7be8'); g.addColorStop(1, '#2a3fa8');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-12, -14); ctx.quadraticCurveTo(-12, -24, 0, -24); ctx.quadraticCurveTo(12, -24, 12, -14); ctx.lineTo(12, 24); ctx.lineTo(-12, 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4b5563'; D.roundRect(-4, -32, 8, 9, 2); ctx.fill(); ctx.fillStyle = '#9ca3af'; D.roundRect(-8, -35, 16, 5, 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; D.roundRect(-9, -6, 18, 16, 3); ctx.fill(); txt('O₂', 0, 7, 12, '#2a3fa8', 'center', 800);
    } else if (id === 'co2') {
      ctx.fillStyle = 'rgba(205,224,246,.55)'; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; D.roundRect(-13, -20, 26, 44, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c99a62'; D.roundRect(-9, -27, 18, 9, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(110,120,140,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 12); ctx.bezierCurveTo(-2, 4, 4, 14, 7, 4); ctx.moveTo(-6, 0); ctx.bezierCurveTo(-2, -8, 4, 2, 7, -8); ctx.stroke();
      txt('CO₂', 0, 20, 11, '#3b4453', 'center', 800);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-10, -16, 3, 30);
    } else if (id === 'h2o') {
      ctx.beginPath(); ctx.moveTo(-17, -20); ctx.lineTo(-13, 22); ctx.quadraticCurveTo(0, 27, 13, 22); ctx.lineTo(17, -20); ctx.closePath();
      ctx.fillStyle = 'rgba(214,232,250,.6)'; ctx.fill();
      ctx.save(); ctx.clip(); const g = ctx.createLinearGradient(0, -6, 0, 26); g.addColorStop(0, '#9fd3ff'); g.addColorStop(1, '#3e92e0'); ctx.fillStyle = g; ctx.fillRect(-20, -6, 40, 36);
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-20, -7, 40, 2.5); ctx.restore();
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-17, -20); ctx.lineTo(-13, 22); ctx.quadraticCurveTo(0, 27, 13, 22); ctx.lineTo(17, -20); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(-12, -16, 3, 28);
    } else if (id === 'ch4') {
      const g = ctx.createLinearGradient(-14, 0, 14, 0); g.addColorStop(0, '#ffe58a'); g.addColorStop(0.5, '#f5c542'); g.addColorStop(1, '#c79a1a');
      ctx.fillStyle = g; D.roundRect(-13, -6, 26, 32, 5); ctx.fill();
      ctx.fillStyle = '#6b7280'; D.roundRect(-6, -12, 12, 7, 2); ctx.fill();
      const fl = 0.9 + 0.1 * Math.sin(now() * 14);
      ctx.fillStyle = 'rgba(70,130,255,.9)'; ctx.beginPath(); ctx.moveTo(0, -36 * fl); ctx.quadraticCurveTo(10, -22, 6, -12); ctx.lineTo(-6, -12); ctx.quadraticCurveTo(-10, -22, 0, -36 * fl); ctx.fill();
      ctx.fillStyle = 'rgba(190,225,255,.95)'; ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(4, -19, 3, -13); ctx.lineTo(-3, -13); ctx.quadraticCurveTo(-4, -19, 0, -26); ctx.fill();
      txt('CH₄', 0, 18, 11, '#7a5a00', 'center', 800);
    } else if (id === 'nacl') {
      const s2 = 17;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#b7c3d6'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, -s2 - 6); ctx.lineTo(s2 + 3, -s2 / 2 - 2); ctx.lineTo(0, 4); ctx.lineTo(-s2 - 3, -s2 / 2 - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e4eaf3'; ctx.beginPath(); ctx.moveTo(-s2 - 3, -s2 / 2 - 2); ctx.lineTo(0, 4); ctx.lineTo(0, s2 + 10); ctx.lineTo(-s2 - 3, s2 / 2 + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#cfd8e6'; ctx.beginPath(); ctx.moveTo(s2 + 3, -s2 / 2 - 2); ctx.lineTo(0, 4); ctx.lineTo(0, s2 + 10); ctx.lineTo(s2 + 3, s2 / 2 + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(-6, -10, 2.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ----- 입자 계(현미경 속) ----- */
  const newP = (mol) => mol.atoms.map(() => ({ x: 0, y: 0, z: 0, sym: '', k: 1, dark: 0, i: 0, r: 0 }));
  function buildSys(id) {
    const R = WIN.Rin, S0 = { id, t: 0, kind: '', parts: [] };
    const spawn = (n, br, speed, make, k) => {                  // br: 바깥 반지름, k: 충돌 반지름 비율
      let guard = 0;
      const er = br * (k || 1), wr = k ? br * 0.92 : br;
      while (S0.parts.length < n && guard++ < 8000) {
        const a = rand(0, TAU), d = Math.sqrt(Math.random()) * (R - wr - 4), x = Math.cos(a) * d, y = Math.sin(a) * d;
        if (S0.parts.some((q) => Math.hypot(q.x - x, q.y - y) < q.er + er + 4)) continue;
        const va = rand(0, TAU), sp = speed * rand(0.8, 1.2);
        S0.parts.push(make(x, y, Math.cos(va) * sp, Math.sin(va) * sp, br));
      }
    };
    if (id === 'he' || id === 'ne') {
      S0.kind = 'gas'; const r = rOf(id === 'he' ? 'He' : 'Ne', SCW);
      spawn(10, r, 160, (x, y, vx, vy, br) => ({ x, y, vx, vy, br, er: br, sym: id === 'he' ? 'He' : 'Ne', r: br }));
    } else if (id === 'o2' || id === 'co2' || id === 'ch4') {
      S0.kind = 'gas'; const mol = MOLS[id.toUpperCase()], n = id === 'o2' ? 7 : 5, br = mol.ext * SCW, kk = id === 'o2' ? 0.9 : id === 'co2' ? 0.8 : 0.85;
      spawn(n, br, 150, (x, y, vx, vy, b) => ({ x, y, vx, vy, br: b, er: b * kk, wr: b * 0.92, mol, P: newP(mol), rx: rand(0, TAU), ry: rand(0, TAU), rz: rand(0, TAU), wx: rand(-1.4, 1.4), wy: rand(-1.4, 1.4), wz: (Math.random() < 0.5 ? -1 : 1) * rand(1.2, 2.8) }), kk);
    } else if (id === 'h2o') {
      S0.kind = 'liquid';
      const homes = packDisc(10, 0.27, 31);
      S0.parts = homes.map((h, i) => ({ hx: h.x * (R - 34), hy: h.y * (R - 34), x: 0, y: 0, ph: rand(0, TAU), ph2: rand(0, TAU), rz0: rand(0, TAU), P: newP(MOLS.H2O), br: 30 }));
    } else if (id === 'cu') {
      S0.kind = 'lattice'; const a = 36, dy = a * 0.866;
      for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
        const x = i * a + (j & 1 ? a / 2 : 0), y = j * dy;
        if (Math.hypot(x, y) < R + 22) S0.parts.push({ x, y, ph: rand(0, TAU), ph2: rand(0, TAU) });
      }
    } else if (id === 'nacl') {
      S0.kind = 'salt';
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
        const inner = Math.abs(i) <= 1 && Math.abs(j) <= 1 && Math.abs(k) <= 1;
        S0.parts.push({ i, j, k, cl: ((i + j + k) % 2 + 2) % 2 === 1, inner, order: 0, x: 0, y: 0, z: 0 });
      }
      let n = 0; S0.parts.filter((q) => q.inner).sort((a, b) => (a.i + a.j + a.k) - (b.i + b.j + b.k) || a.i - b.i).forEach((q) => { q.order = n++; });
    }
    return S0;
  }
  function sysUpdate(S0, dt) {
    S0.t += dt;
    const t = S0.t, R = WIN.Rin;
    if (S0.kind === 'gas') {
      const ps = S0.parts;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.mol) { p.rx += p.wx * dt; p.ry += p.wy * dt; p.rz += p.wz * dt; }
        const d = Math.hypot(p.x, p.y), lim = R - (p.wr || p.er);
        if (d > lim) { const nx = p.x / d, ny = p.y / d, dot = p.vx * nx + p.vy * ny; if (dot > 0) { p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny; } p.x = nx * lim; p.y = ny * lim; }
      }
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-3, mn = a.er + b.er;
        if (d < mn) {
          const nx = dx / d, ny = dy / d, dvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (dvn < 0) { a.vx += dvn * nx; a.vy += dvn * ny; b.vx -= dvn * nx; b.vy -= dvn * ny; }
          const push = (mn - d) / 2; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        }
      }
    } else if (S0.kind === 'liquid') {
      const rot = t * 0.14, cr = Math.cos(rot), sr = Math.sin(rot);
      S0.parts.forEach((p) => { p.x = p.hx * cr - p.hy * sr + Math.sin(t * 1.4 + p.ph) * 3; p.y = p.hx * sr + p.hy * cr + Math.cos(t * 1.2 + p.ph2) * 3; });
    }
  }
  function sysDraw(S0, cx, cy, t) {
    const R = WIN.Rin;
    if (S0.kind === 'gas') {
      const id3 = S0.id === 'ch4';
      S0.parts.forEach((p) => {
        if (p.mol) {
          rotMol(p.mol, id3 ? p.rx : 0.9 * Math.sin(p.rx), id3 ? p.ry : 0.9 * Math.sin(p.ry), p.rz, SCW, p.P);
          molShadow(p.P, cx + p.x, cy + p.y, 0.0);
          drawMolP(p.P, cx + p.x, cy + p.y);
        } else {
          if (p.sym === 'Ne') D.glow(cx + p.x, cy + p.y, p.r * 2.1, '#ff8a5c', 0.3);
          drawBall(p.sym, cx + p.x, cy + p.y, p.r);
        }
      });
    } else if (S0.kind === 'liquid') {
      S0.parts.forEach((p) => {
        rotMol(MOLS.H2O, 0.12, 0.2 * Math.sin(t * 0.8 + p.ph), p.rz0 + 0.3 * Math.sin(t * 0.7 + p.ph2), SCW * 0.86, p.P);
        drawMolP(p.P, cx + p.x, cy + p.y);
      });
    } else if (S0.kind === 'lattice') {
      const r = rOf('Cu', SCW);
      S0.parts.forEach((p) => { drawBall('Cu', cx + p.x + Math.sin(t * 9 + p.ph) * 1.5, cy + p.y + Math.sin(t * 8 + p.ph2) * 1.5, r); });
    } else if (S0.kind === 'salt') {
      const d = 72, ry = t * 0.3, rx = 0.5, cyr = Math.cos(ry), syr = Math.sin(ry), cxr = Math.cos(rx), sxr = Math.sin(rx);
      S0.parts.forEach((p) => {
        const x0 = p.i * d, y0 = p.j * d, z0 = p.k * d;
        const x1 = x0 * cyr + z0 * syr, z1 = -x0 * syr + z0 * cyr, y2 = y0 * cxr - z1 * sxr, z2 = y0 * sxr + z1 * cxr;
        p.x = x1; p.y = y2; p.z = z2;
      });
      const ord = S0.parts.slice().sort((a, b) => a.z - b.z);
      const first = !SCP.saltSeen;
      ord.forEach((p) => {
        const sc = 1 + p.z / 700, r = rOf(p.cl ? 'Cl' : 'Na', SCW) * sc * 0.92, dim = clamp(-p.z / 400, 0, 1) * 0.2;
        const a = p.inner ? 1 : 0.26;
        drawBall(p.cl ? 'Cl' : 'Na', cx + p.x, cy + p.y, r, { dark: dim, alpha: a });
        if (p.inner) {
          const k = first ? clamp((S0.t - 1.0 - p.order * 0.05) / 0.2, 0, 1) : clamp((S0.t - 0.5) / 0.2, 0, 1);
          if (k > 0) ionBadge(cx + p.x, cy + p.y, r, !p.cl, outBack(k));
        }
      });
      if (first && S0.t > 1.0 + 27 * 0.05 + 0.3) SCP.saltSeen = true;
    }
  }
  function sysHit(S0, p) {                              // 창 안 입자 누르기 → 설명
    const lx = p.x - WIN.x, ly = p.y - WIN.y;
    if (Math.hypot(lx, ly) > WIN.Rin) return null;
    if (S0.kind === 'gas' || S0.kind === 'liquid') {
      let best = null, bd = 1e9;
      S0.parts.forEach((q) => { const d = Math.hypot(q.x - lx, q.y - ly); if (d < (q.br || 30) + 4 && d < bd) { bd = d; best = q; } });
      if (!best) return null;
      return { x: WIN.x + best.x, y: WIN.y + best.y - (best.br || 20), msg: { he: '헬륨 원자 1개', ne: '네온 원자 1개', o2: '산소 분자 1개 = 산소 원자 2개', co2: '이산화 탄소 분자 1개 = 탄소 원자 1개 + 산소 원자 2개', h2o: '물 분자 1개 = 산소 원자 1개 + 수소 원자 2개', ch4: '메테인 분자 1개 = 탄소 원자 1개 + 수소 원자 4개' }[S0.id] };
    }
    if (S0.kind === 'lattice') { let best = null, bd = 1e9; S0.parts.forEach((q) => { const d = Math.hypot(q.x - lx, q.y - ly); if (d < 20 && d < bd) { bd = d; best = q; } }); return best ? { x: WIN.x + best.x, y: WIN.y + best.y - 20, msg: '구리 원자' } : null; }
    if (S0.kind === 'salt') { let best = null, bd = 1e9; S0.parts.forEach((q) => { if (!q.inner) return; const d = Math.hypot(q.x - lx, q.y - ly); if (d < 24 && d < bd) { bd = d; best = q; } }); return best ? { x: WIN.x + best.x, y: WIN.y + best.y - 24, msg: best.cl ? '(−)전하를 띤 입자' : '(+)전하를 띤 입자' } : null; }
    return null;
  }

  /* ----- 선반 · 상자 배치 ----- */
  function sampleKey() { return (game && game.free) ? 'F' : on('ion') ? '4' : '2'; }
  function setList(key, keepPlaced) {
    SCP.listKey = key;
    SCP.list = key === 'F' ? LISTF : key === '4' ? LIST4 : LIST2;
    const n = SCP.list.length, w = SHELF.w / n;
    const old = {}; SCP.items.forEach((q) => { old[q.id] = q; });
    SCP.items = SCP.list.map((id, i) => {
      const hx = SHELF.x + w * (i + 0.5), hy = SHELF.y + 36, o = old[id];
      return o ? Object.assign(o, { hx, hy }) : { id, hx, hy, x: hx, y: hy + 70, vx: 0, vy: 0, s: 1, lift: 0, hold: false };
    });
    if (!keepPlaced) { SCP.placed = {}; }
    Object.keys(SCP.placed).forEach((id) => { if (SCP.list.indexOf(id) < 0) delete SCP.placed[id]; });
  }
  function scopeReset(clearSeen) {
    SCP.placed = {}; SCP.cur = null; SCP.sys = null; SCP.ap = 0; SCP.chip = null; SCP.ghosts = []; SCP.tokenT = {}; SCP.drag = null; SCP.boxMsg = {};
    if (clearSeen) SCP.seen = {};
    setList(sampleKey(), false);
    SCP.items.forEach((q) => { q.x = q.hx; q.y = q.hy + 60; q.vx = q.vy = 0; q.hold = false; });
  }
  const nSeen = () => SCP.list.filter((id) => SCP.seen[id]).length;
  const nPlaced = () => SCP.list.filter((id) => SCP.placed[id]).length;
  function boxRects() {
    const b3 = SCP.b3, out = {};
    const L2 = [[28, 182], [224, 182]], L3 = [[28, 120], [160, 120], [292, 120]];
    BOX_ORDER.forEach((k, i) => {
      let y, h, a = 1;
      if (i < 2) { y = lerp(L2[i][0], L3[i][0], b3); h = lerp(L2[i][1], L3[i][1], b3); }
      else { y = lerp(520, L3[2][0], ease.outCubic(b3)); h = L3[2][1]; a = smooth(b3 * 1.6); }
      out[k] = { x: 546, y, w: 238, h, a, k, i };
    });
    return out;
  }
  function boxAt(p) {
    const r = boxRects();
    for (const k of BOX_ORDER) { if (k === 'ion' && SCP.b3 < 0.5) continue; const q = r[k]; if (p.x >= q.x - 6 && p.x <= q.x + q.w + 6 && p.y >= q.y - 6 && p.y <= q.y + q.h + 6) return k; }
    return null;
  }
  const inWin = (p) => Math.hypot(p.x - WIN.x, p.y - WIN.y) < WIN.R + 14;

  /* ----- 관찰 · 분류 ----- */
  function observe(id) {
    const it = SCP.items.find((q) => q.id === id); if (!it) return;
    SCP.ghosts.push({ id, x0: it.hold ? it.x : it.hx, y0: it.hold ? it.y : it.hy, t: 0 });
    SCP.cur = id; SCP.sys = buildSys(id); SCP.ap = 0; SCP.chip = null;
    tw(SCP, { ap: 1 }, 0.7, 'outCubic', { delay: 0.25 });
    sfx.whoosh();
    later(0.55, () => { if (SCP.cur === id) { SCP.seen[id] = true; SCP.chip = { id, k: 0 }; tw(SCP.chip, { k: 1 }, 0.4, 'outBack', { essential: true }); Sound.tick(); } });
    SCP.seen[id] = true;                                // 바로 기록 (상태 표시용)
    hideHint();
  }
  const WRONG = {
    atom: { mol: (s) => s.id === 'cu' ? '구리 원자는 따로 떨어진 덩어리를 만들지 않고 끝없이 이어져 있어요.' : SAMPLES[s.id].short + ' 원자는 결합한 덩어리 없이 하나씩 따로 있어요.', ion: (s) => SAMPLES[s.id].short + ' 입자는 전하를 띠고 있지 않아요.' },
    mol: { atom: (s) => (s.id === 'o2' ? '산소 원자 2개가 붙어 한 덩어리로 움직이고 있어요!' : '원자 여러 개가 결합한 덩어리(분자)로 움직이고 있어요!'), ion: (s) => '이 입자는 전하를 띠고 있지 않아요. 원자가 결합한 분자예요.' },
    ion: { atom: () => '소금 속 입자는 (+)·(−)전하를 띠고 있어요. 이온 상자를 찾아봐요.', mol: () => '소금 속에는 따로 떨어진 분자가 없어요. (+)·(−)전하를 띤 입자가 번갈아 이어져 있어요.' },
  };
  function classify(id, boxKey, from) {
    const s = SAMPLES[id], r = boxRects()[boxKey];
    if (!SCP.seen[id]) { SCP.boxShake[boxKey] = 0.4; Sound.fail(); say(r.x + r.w / 2, r.y + 34, '먼저 입자 현미경으로 관찰해요!', { bg: COL.warn, maxW: 210, dur: 2.6, below: true }); return false; }
    if (s.kind === boxKey) {
      SCP.placed[id] = boxKey; SCP.tokenT[id] = 0;
      okFx(r.x + r.w / 2, r.y + r.h / 2, BOXK[boxKey].color, false);
      if (SCP.cur === id) { SCP.chip = null; }
      sfx.ding();
      return true;
    }
    SCP.boxShake[boxKey] = 0.45; Sound.fail();
    say(r.x + r.w / 2, r.y + 34, (WRONG[s.kind][boxKey] || (() => '다시 한번 생각해 봐요.'))(Object.assign({ id }, s)), { bg: COL.bad, maxW: 224, dur: 3.8, below: true });
    return false;
  }

  /* ----- 갱신 ----- */
  function scopeUpdate(dt) {
    SCP.t += dt;
    SCP.b3 = SciSim.approach(SCP.b3, on('ion') ? 1 : 0, dt, 4.5);
    if (Math.abs(SCP.b3 - (on('ion') ? 1 : 0)) < 0.002) SCP.b3 = on('ion') ? 1 : 0;
    const key = sampleKey(); if (key !== SCP.listKey) setList(key, true);
    SCP.items.forEach((q) => {
      q.lift = SciSim.approach(q.lift, q.hold ? 1 : 0, dt, 16);
      q.s = SciSim.approach(q.s, q.hold ? 1.14 : 1, dt, 16);
      if (!q.hold) { const K = 190, Dm = 15, n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n; for (let k = 0; k < n; k++) { q.vx += ((q.hx - q.x) * K - q.vx * Dm) * h; q.vy += ((q.hy - q.y) * K - q.vy * Dm) * h; q.x += q.vx * h; q.y += q.vy * h; } }
    });
    if (SCP.chip && !SCP.chip.hold) { const c = SCP.chip; c.x = SciSim.approach(c.x == null ? CHIP.x : c.x, CHIP.x, dt, 14); c.y = SciSim.approach(c.y == null ? CHIP.y : c.y, CHIP.y, dt, 14); }
    for (let i = SCP.ghosts.length - 1; i >= 0; i--) { const g = SCP.ghosts[i]; g.t += dt / 0.5; if (g.t >= 1) SCP.ghosts.splice(i, 1); }
    Object.keys(SCP.boxShake).forEach((k) => { SCP.boxShake[k] -= dt; if (SCP.boxShake[k] <= 0) delete SCP.boxShake[k]; });
    Object.keys(SCP.tokenT).forEach((id) => { SCP.tokenT[id] = Math.min(1, SCP.tokenT[id] + dt / 0.45); });
    if (SCP.sys) sysUpdate(SCP.sys, dt);
  }
  const CHIP = { x: WIN.x, y: WIN.y + WIN.R - 2, w: 188, h: 32 };

  /* ----- 그리기 ----- */
  function drawWindow(t) {
    const { x, y, R, Rin } = WIN;
    // 그림자
    const sg = ctx.createRadialGradient(x + 4, y + 10, R * 0.7, x + 4, y + 10, R + 28); sg.addColorStop(0, 'rgba(20,30,70,.32)'); sg.addColorStop(1, 'rgba(20,30,70,0)');
    ctx.fillStyle = sg; circle(ctx, x + 4, y + 10, R + 28); ctx.fill();
    // 금속 테두리 (동심 3겹)
    const ring = (r, w, c0, c1, c2) => { const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c2); ctx.strokeStyle = g; ctx.lineWidth = w; circle(ctx, x, y, r); ctx.stroke(); };
    ring(R - 3, 12, '#f1f4f9', '#8794ab', '#cfd8e6');
    ring(R - 11, 5, '#7b88a0', '#dfe6f1', '#5f6b82');
    // 안쪽
    ctx.save(); circle(ctx, x, y, Rin); ctx.clip();
    const bg = ctx.createRadialGradient(x - 30, y - 40, 10, x, y, Rin); bg.addColorStop(0, '#26335f'); bg.addColorStop(1, '#0b1226');
    ctx.fillStyle = bg; ctx.fillRect(x - Rin, y - Rin, Rin * 2, Rin * 2);
    ctx.fillStyle = 'rgba(180,210,255,.07)';
    for (let gx = -Rin; gx <= Rin; gx += 34) for (let gy = -Rin; gy <= Rin; gy += 34) { circle(ctx, x + gx, y + gy, 1.3); ctx.fill(); }
    if (SCP.sys && SCP.ap > 0.001) {
      ctx.save(); circle(ctx, x, y, Math.max(1, SCP.ap * Rin * 1.02)); ctx.clip();
      sysDraw(SCP.sys, x, y, SCP.sys.t);
      ctx.restore();
      if (SCP.ap < 0.98) { ctx.strokeStyle = 'rgba(210,230,255,' + (0.8 * (1 - SCP.ap)).toFixed(2) + ')'; ctx.lineWidth = 3; circle(ctx, x, y, SCP.ap * Rin); ctx.stroke(); }
      D.label(x, y - Rin + 52, '입자 모형 (실제보다 아주 크게)', { bg: 'rgba(8,14,36,.78)', size: 13, pad: 10 });
    } else {
      txt('🔬', x, y - 6, 34, '#fff', 'center', 800);
      txt('시료를 끌어 넣어요', x, y + 28, 15, 'rgba(210,225,255,.85)', 'center', 800);
    }
    // 안쪽 그림자 · 위쪽 반사광
    const ig = ctx.createRadialGradient(x, y, Rin * 0.78, x, y, Rin); ig.addColorStop(0, 'rgba(0,0,0,0)'); ig.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = ig; ctx.fillRect(x - Rin, y - Rin, Rin * 2, Rin * 2);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, Rin - 8, Math.PI * 1.12, Math.PI * 1.45); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, Rin - 8, Math.PI * 1.5, Math.PI * 1.58); ctx.stroke(); ctx.restore();
    // 드롭 대상 표시
    const d = SCP.drag;
    if (d && d.kind === 'item') { const near = inWin(d.p); ctx.save(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 24; ctx.strokeStyle = near ? 'rgba(255,255,255,.95)' : rgba('#ffffff', 0.45 + 0.3 * Math.sin(t * 6)); ctx.lineWidth = near ? 5 : 3; circle(ctx, x, y, R + 8); ctx.stroke(); ctx.restore(); }
  }
  function drawCaption() {
    const id = SCP.cur; if (!id || SCP.ap < 0.9) return;
    const s = SAMPLES[id], a = smooth((SCP.ap - 0.9) / 0.1);
    ctx.save(); ctx.globalAlpha = a;
    panel(16, 370, 516, s.cap2 ? 40 : 40, 12, 'rgba(255,255,255,.96)', 8, 2);
    if (s.cap2) { txt(s.cap, 28, 387, 13.5, COL.ink, 'left', 800); txt(s.cap2, 28, 405, 13.5, COL.ion, 'left', 800); }
    else { const lines = wrapText(s.cap, 492, 13.5, 800); lines.slice(0, 2).forEach((l, i) => txt(l, 28, (lines.length > 1 ? 387 : 395) + i * 18, 13.5, COL.ink, 'left', 800)); }
    ctx.restore();
  }
  function drawChip(t) {
    const c = SCP.chip; if (!c) return;
    const k = outBack(clamp(c.k, 0, 1)); if (k < 0.02) return;
    if (c.x == null) { c.x = CHIP.x; c.y = CHIP.y; }
    const s = SAMPLES[c.id], w = CHIP.w;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(k * (c.hold ? 1.08 : 1), k * (c.hold ? 1.08 : 1));
    softShadow(-w / 2, -CHIP.h / 2, w, CHIP.h, 16, c.hold ? 16 : 8, c.hold ? 8 : 3, 'rgba(20,30,80,.35)');
    ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -CHIP.h / 2, w, CHIP.h, 16); ctx.fill();
    ctx.strokeStyle = COL.sub; ctx.lineWidth = 2.4; D.roundRect(-w / 2, -CHIP.h / 2, w, CHIP.h, 16); ctx.stroke();
    drawSampleIcon(c.id, -w / 2 + 22, 1, 0.42);
    txt(s.short + ' ' + s.formula, -w / 2 + 40, 5, 14, COL.ink, 'left', 800);
    txt('➜', w / 2 - 16, 6, 15, COL.sub, 'center', 800);
    ctx.restore();
    if (!SCP.drag && Object.keys(SCP.placed).length === 0 && SCP.sys) { const a = 0.55 + 0.45 * Math.sin(t * 5); txt('👆 칩을 오른쪽 상자로 끌어요', CHIP.x, CHIP.y + 28, 13, rgba(COL.sub, a), 'center', 800); }
  }
  function drawBoxes(t) {
    const R = boxRects(), d = SCP.drag;
    BOX_ORDER.forEach((k) => {
      const r = R[k]; if (r.a < 0.01) return;
      const B = BOXK[k], shake = SCP.boxShake[k] ? Math.sin(SCP.boxShake[k] * 60) * 4 : 0;
      const hover = d && boxAt(d.p) === k;
      ctx.save(); ctx.globalAlpha = r.a; ctx.translate(shake, 0);
      panel(r.x, r.y, r.w, r.h, 16, hover ? B.bg : '#fff', hover ? 18 : 10, hover ? 6 : 3);
      ctx.strokeStyle = B.color; ctx.lineWidth = hover ? 4 : 2.4; ctx.setLineDash(hover ? [] : [7, 5]); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.stroke(); ctx.setLineDash([]);
      txt(B.title, r.x + 14, r.y + 25, 16, B.color, 'left', 800);
      // 작은 그림
      const mx = r.x + r.w - 46, my = r.y + 20;
      if (k === 'atom') { drawBall('He', mx - 12, my + 2, 8); drawBall('Ne', mx + 14, my - 2, 9); }
      else if (k === 'mol') { drawBall('O', mx - 6, my, 8); drawBall('O', mx + 7, my, 8); }
      else { drawBall('Na', mx - 12, my, 8); drawBall('Cl', mx + 12, my, 10); txt('+', mx - 12, my + 5, 13, '#fff', 'center', 800); txt(MINUS, mx + 12, my + 5, 13, '#fff', 'center', 800); }
      // 들어 있는 시료 (이름표)
      const ids = SCP.list.filter((id) => SCP.placed[id] === k);
      ids.forEach((id, i) => {
        const col = i % 2, row = Math.floor(i / 2), tk = outBack(clamp(SCP.tokenT[id] == null ? 1 : SCP.tokenT[id], 0, 1));
        const px = r.x + 12 + col * 114 + 53, py = r.y + 54 + row * 33 + (r.h < 130 ? -2 : 6);
        ctx.save(); ctx.translate(px, py); ctx.scale(tk, tk);
        ctx.fillStyle = B.bg; D.roundRect(-53, -14, 106, 28, 14); ctx.fill(); ctx.strokeStyle = B.color; ctx.lineWidth = 1.6; D.roundRect(-53, -14, 106, 28, 14); ctx.stroke();
        drawSampleIcon(id, -38, 0, 0.3);
        txt(SAMPLES[id].short, -22, 5, 13.5, COL.ink, 'left', 800);
        ctx.restore();
      });
      ctx.restore();
    });
    if (isNew('ion') && SCP.b3 > 0.7) { const r = R.ion; ringRect({ x: r.x, y: r.y, w: r.w, h: r.h }, 16); }
  }
  function drawShelf(t) {
    panel(SHELF.x, SHELF.y, SHELF.w, SHELF.h, 18, 'rgba(255,255,255,.96)', 10, 3);
    const items = SCP.items.slice().sort((a, b) => a.lift - b.lift);
    items.forEach((q) => {
      const s = SAMPLES[q.id], placed = SCP.placed[q.id], seen = SCP.seen[q.id];
      const on1 = SCP.cur === q.id && SCP.ap > 0.3;
      ctx.save();
      if (placed && !q.hold) ctx.globalAlpha = 0.28;
      if (q.lift > 0.02) softShadow(q.x - 28, q.y + 26, 56, 8, 4, 8 + q.lift * 8, 6 + q.lift * 8, 'rgba(20,30,70,.25)');
      if (on1) { ctx.fillStyle = 'rgba(139,92,246,.12)'; D.roundRect(q.hx - 46, SHELF.y + 6, 92, SHELF.h - 12, 14); ctx.fill(); }
      ctx.translate(q.x, q.y); ctx.scale(q.s, q.s); ctx.translate(-q.x, -q.y);
      drawSampleIcon(q.id, q.x, q.y, 1);
      ctx.restore();
      ctx.save(); if (placed && !q.hold) ctx.globalAlpha = 0.35;
      txt(s.short, q.hx, SHELF.y + SHELF.h - 14, 14, COL.ink, 'center', 800);
      ctx.restore();
      if (seen && !placed) { ctx.fillStyle = COL.sub; circle(ctx, q.hx + 24, SHELF.y + 14, 9); ctx.fill(); txt('🔍', q.hx + 24, SHELF.y + 18, 10, '#fff', 'center', 800); }
      if (placed) { ctx.fillStyle = COL.good; circle(ctx, q.hx + 24, SHELF.y + 14, 9); ctx.fill(); D.check(q.hx + 24, SHELF.y + 14, 7, 1); }
    });
    if (!SCP.cur && !SCP.drag && Object.keys(SCP.seen).length === 0) { const a = 0.5 + 0.5 * Math.sin(t * 5); txt('👆 시료를 눌러 보거나 현미경 창으로 끌어요', SHELF.x + SHELF.w / 2, SHELF.y - 8, 13.5, rgba(COL.sub, 0.55 + 0.45 * a), 'center', 800); }
  }
  function scopeDraw(t) {
    wall();
    drawShelf(t);
    drawBoxes(t);
    drawWindow(t);
    drawCaption();
    drawChip(t);
    // 날아가는 시료 (선반 → 창)
    SCP.ghosts.forEach((g) => {
      const k = ease.inOutCubic(Math.min(1, g.t)), x = lerp(g.x0, WIN.x, k), y = lerp(g.y0, WIN.y, k) - Math.sin(k * Math.PI) * 30, s = lerp(1, 0.2, k);
      ctx.save(); ctx.globalAlpha = 1 - k * 0.8; drawSampleIcon(g.id, x, y, s * 1.1); ctx.restore();
    });
    // 끌고 있는 시료
    SCP.items.filter((q) => q.hold).forEach((q) => { ctx.save(); softShadow(q.x - 26, q.y + 28, 52, 8, 4, 16, 12, 'rgba(20,30,70,.3)'); drawSampleIcon(q.id, q.x, q.y, q.s); ctx.restore(); });
    focusRing({ x: SHELF.x, y: SHELF.y, w: SHELF.w, h: SHELF.h }, 'scope', 18);
    if (FOC.key === 'scopeWin' && FOC.t > 0) focusRing({ x: WIN.x - WIN.R, y: WIN.y - WIN.R, w: WIN.R * 2, h: WIN.R * 2 }, 'scopeWin', WIN.R);
  }
  SC.scope = {
    label: '🔬 입자 현미경으로 물질을 들여다봐요',
    get hint() { return on('ion') ? '시료를 현미경에 넣어 관찰하고 원자·분자·이온 상자로 분류해요' : '시료를 눌러 현미경으로 관찰하고, 알맞은 상자에 넣어요'; },
    enter() { if (SCP.listKey === '') setList(sampleKey(), false); },
    update(dt) { scopeUpdate(dt); },
    draw(t) { scopeDraw(t); },
    hover(p) {
      if (SCP.chip && Math.abs(p.x - SCP.chip.x) < CHIP.w / 2 && Math.abs(p.y - SCP.chip.y) < CHIP.h / 2 + 4) return 'grab';
      if (SCP.items.some((q) => !SCP.placed[q.id] && Math.abs(p.x - q.x) < 34 && Math.abs(p.y - q.y) < 38)) return 'grab';
      return null;
    },
    down(p) {
      if (SCP.chip && SCP.chip.k > 0.6 && Math.abs(p.x - SCP.chip.x) < CHIP.w / 2 + 4 && Math.abs(p.y - SCP.chip.y) < CHIP.h / 2 + 8) {
        SCP.chip.hold = true; SCP.drag = { kind: 'chip', id: SCP.chip.id, p, ox: SCP.chip.x - p.x, oy: SCP.chip.y - p.y, t0: now() }; sfx.glug(); hideHint(); return true;
      }
      for (const q of SCP.items) {
        if (SCP.placed[q.id]) continue;
        if (Math.abs(p.x - q.x) < 34 && Math.abs(p.y - q.y) < 38) { q.hold = true; SCP.drag = { kind: 'item', id: q.id, it: q, p, ox: clamp(q.x - p.x, -14, 14), oy: Math.min(q.y - p.y, -22), sx: p.x, sy: p.y, t0: now(), moved: 0 }; sfx.glug(); hideHint(); return true; }
      }
      if (SCP.sys && SCP.ap > 0.9) { const h = sysHit(SCP.sys, p); if (h && h.msg) { say(h.x, h.y, h.msg, { bg: '#1b2333', maxW: 250, dur: 2.6 }); Sound.tick(); } }
      return false;
    },
    move(p) {
      const d = SCP.drag; if (!d) return; d.p = p;
      if (d.kind === 'chip') { SCP.chip.x = p.x + d.ox; SCP.chip.y = p.y + d.oy; }
      else { const q = d.it; q.x = clamp(p.x + d.ox, 20, 780); q.y = clamp(p.y + d.oy, 20, 500); d.moved = Math.max(d.moved, Math.hypot(p.x - d.sx, p.y - d.sy)); }
    },
    up(p) {
      const d = SCP.drag; if (!d) return; SCP.drag = null;
      if (d.kind === 'chip') {
        SCP.chip.hold = false;
        const bk = boxAt(p);
        if (bk) classify(d.id, bk, 'chip');
        return;
      }
      const q = d.it; q.hold = false;
      const bk = boxAt(p);
      if (bk) { classify(d.id, bk, 'item'); return; }
      if (inWin(p) || (d.moved < 8 && now() - d.t0 < 0.6)) observe(d.id);
    },
  };
  Object.assign(DBG, { SCP, SAMPLES, scopeReset, observe, classify, boxRects, setList, WIN, CHIP });

  /* =========================================================
     장면 3 · count — 분자·원자·원소 렌즈로 세어 보고, 분자 조립대에서 만들기 (3단계)
     ========================================================= */
  const BX = { x: 40, y: 62, w: 380, h: 376 };
  const SCC = 48;                                     // 상자 속 크기: 1 Å = 38 px
  const CIR = { x: 618, y: 300, R: 82 };
  const RING_COL = { H: '#1fb5d4', O: '#ff5d5d', C: '#5b6475', N: '#3f6fe8' };
  const SYM_NAME = { H: '수소', O: '산소', C: '탄소', N: '질소' };
  const RECIPES = [
    { key: 'CH4', f: { C: 1, H: 4 } }, { key: 'NH3', f: { N: 1, H: 3 } }, { key: 'CO2', f: { C: 1, O: 2 } },
    { key: 'H2O', f: { H: 2, O: 1 } }, { key: 'O2', f: { O: 2 } }, { key: 'N2', f: { N: 2 } }, { key: 'H2', f: { H: 2 } },
  ];
  const CT = {
    mode: 'view', mols: [], atoms: [], lens: 'mol', lk: { mol: 1, atom: 0, elem: 0 }, preset: 'h2o3', buildOn: false, used: { C: 0, O: 0, H: 0, N: 0 },
    idle: 0, drag: null, t: 0, asm: [], baskets: [], bsk: 0, guide: 0, complete: 0,
  };
  const mkMol = (key, x, y) => {
    const mol = MOLS[key];
    return { key, mol, x, y, vx: rand(-1, 1), vy: rand(-1, 1), rx: rand(0, TAU), ry: rand(0, TAU), rz: rand(0, TAU), wx: rand(-0.35, 0.35), wy: rand(-0.35, 0.35), wz: (Math.random() < 0.5 ? -1 : 1) * rand(0.35, 0.7), P: newP(mol), er: mol.ext * SCC * (key === 'CO2' ? 0.78 : 0.82), wr: mol.ext * SCC, born: 0, fly: null };
  };
  function freeSpot(er, wr) {
    wr = wr || er;
    for (let k = 0; k < 80; k++) {
      const x = rand(BX.x + wr + 8, BX.x + BX.w - wr - 8), y = rand(BX.y + wr + 8, BX.y + BX.h - wr - 8);
      if (CT.mols.every((m) => Math.hypot(m.x - x, m.y - y) > (m.wr + wr) * 0.97)) return { x, y };
    }
    return { x: rand(BX.x + wr, BX.x + BX.w - wr), y: rand(BX.y + wr, BX.y + BX.h - wr) };
  }
  function ctPreset(name) {
    CT.preset = name; CT.mols = []; CT.atoms = []; CT.asm = []; CT.used = { C: 0, O: 0, H: 0, N: 0 }; CT.drag = null;
    const n = name === 'h2o3' ? 3 : name === 'h2o1' ? 1 : 0;
    for (let i = 0; i < n; i++) { const m = mkMol('H2O', 0, 0); const s = freeSpot(m.er, m.wr); m.x = s.x; m.y = s.y; m.born = 0; CT.mols.push(m); }
  }
  function ctBaskets() {
    const syms = (game && game.free) ? ['C', 'O', 'H', 'N'] : ['C', 'O'];
    const xs = syms.length === 2 ? [548, 690] : [494, 576, 660, 742];
    CT.baskets = syms.map((s, i) => ({ sym: s, hx: xs[i], y: 128, k: 0, pulse: 0 }));
  }
  function ctSetLens(l) {
    CT.lens = l;
    $$('#lensSeg button').forEach((b) => b.classList.toggle('on', b.dataset.lens === l));
  }
  const molCnt = () => CT.mols.length;
  const atomCnt = () => CT.mols.reduce((s, m) => s + m.mol.atoms.length, 0);
  const co2Cnt = () => CT.mols.filter((m) => m.key === 'CO2').length;
  const inCircle = () => CT.atoms.filter((a) => a.state === 'in' || a.state === 'asm');

  /* ----- 조립 ----- */
  function recipeFor() {
    const free = !!(game && game.free), list = free ? RECIPES : RECIPES.filter((r) => r.key === 'CO2');
    const cnt = {}; CT.atoms.filter((a) => a.state === 'in').forEach((a) => { cnt[a.sym] = (cnt[a.sym] || 0) + 1; });
    const total = Object.keys(cnt).reduce((s, k) => s + cnt[k], 0);
    for (const r of list) {
      const need = Object.keys(r.f);
      if (!need.every((k) => (cnt[k] || 0) >= r.f[k])) continue;
      const rt = need.reduce((s, k) => s + r.f[k], 0);
      if (free && (total !== rt || Object.keys(cnt).length !== need.length)) continue;
      return r;
    }
    return null;
  }
  function startAssemble(r) {
    const mol = MOLS[r.key], P = rotMol(mol, 0.12, 0.3, 0, 34, newP(mol));
    const group = []; const need = Object.assign({}, r.f);
    CT.atoms.forEach((a) => { if (a.state === 'in' && need[a.sym] > 0) { need[a.sym]--; group.push(a); } });
    const gi = {}; const used = {};
    // 분자 속 원자 자리에 같은 기호의 원자를 배정
    mol.atoms.forEach((at, i) => { const a = group.find((q) => q.sym === at[0] && !used[group.indexOf(q)]); if (a) { used[group.indexOf(a)] = 1; a.state = 'asm'; a.tx = CIR.x + P[i].x; a.ty = CIR.y + P[i].y; a.z = P[i].z; a.asmT = 0; a.key = r.key; } });
    CT.asm.push({ key: r.key, t: 0, atoms: group, done: false });
    sfx.whoosh();
  }
  function finishAssemble(g) {
    const mol = MOLS[g.key], m = mkMol(g.key, CIR.x, CIR.y), s = freeSpot(m.er, m.wr);
    m.born = 0; m.fly = { x0: CIR.x, y0: CIR.y, x1: s.x, y1: s.y, t: 0 };
    CT.mols.push(m);
    CT.atoms = CT.atoms.filter((a) => g.atoms.indexOf(a) < 0);
    FX.burst(CIR.x, CIR.y, { count: RM ? 4 : 12, speed: 160, life: 0.7, size: 3.4, colors: ['#ffd23f', '#fff6c2', '#8b5cf6'], shape: 'star' });
    WAVES.push({ x: CIR.x, y: CIR.y, t: 0, color: COL.sub, max: 70 });
    sfx.ding();
    // 완성 분자가 상자에 들어가면 상자가 살짝 반짝
    CT.complete = 1;
  }
  function ctClearCircle() {
    CT.atoms.forEach((a) => { if (a.state !== 'drag' && a.state !== 'back') { CT.used[a.sym] = Math.max(0, CT.used[a.sym] - 1); a.state = 'back'; a.t = 0; a.x0 = a.x; a.y0 = a.y; } });
    CT.asm = [];
    sfx.glug();
  }
  function ctReset() { ctPreset(CT.preset); }

  /* ----- 갱신 ----- */
  function ctUpdate(dt) {
    CT.t += dt;
    ['mol', 'atom', 'elem'].forEach((k) => { CT.lk[k] = SciSim.approach(CT.lk[k], CT.lens === k ? 1 : 0, dt, 11); });
    const buildOn = ctBuildOn();
    if (buildOn !== CT.buildOn) { CT.buildOn = buildOn; ctBaskets(); if (!buildOn) { CT.atoms = []; CT.asm = []; } }
    CT.bsk = SciSim.approach(CT.bsk, buildOn ? 1 : 0, dt, 6);
    CT.guide = SciSim.approach(CT.guide, buildOn ? 0 : 1, dt, 6);
    CT.complete = Math.max(0, CT.complete - dt * 2);
    CT.baskets.forEach((b, i) => { b.k = Math.min(1, b.k + dt / 0.45 - (i === 0 ? 0 : 0)); b.pulse = Math.max(0, b.pulse - dt * 4); });
    // 상자 속 분자
    const ms = CT.mols;
    ms.forEach((m) => {
      m.born = Math.min(1, m.born + dt / 0.5);
      m.rx += m.wx * dt; m.ry += m.wy * dt; m.rz += m.wz * dt;
      if (m.fly) {
        m.fly.t += dt / 0.8; const k = ease.outCubic(Math.min(1, m.fly.t));
        m.x = lerp(m.fly.x0, m.fly.x1, k); m.y = lerp(m.fly.y0, m.fly.y1, k) - Math.sin(k * Math.PI) * 24;
        if (m.fly.t >= 1) m.fly = null;
        return;
      }
      m.x += m.vx * 30 * dt; m.y += m.vy * 30 * dt;
      const l = BX.x + m.wr + 6, r = BX.x + BX.w - m.wr - 6, tp = BX.y + m.wr + 6, bt = BX.y + BX.h - m.wr - 6;
      if (m.x < l) { m.x = l; m.vx = Math.abs(m.vx); } if (m.x > r) { m.x = r; m.vx = -Math.abs(m.vx); }
      if (m.y < tp) { m.y = tp; m.vy = Math.abs(m.vy); } if (m.y > bt) { m.y = bt; m.vy = -Math.abs(m.vy); }
    });
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i], b = ms[j]; if (a.fly || b.fly) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-3, mn = (a.wr + b.wr) * 0.97;
      if (d < mn) { const nx = dx / d, ny = dy / d, push = (mn - d) * 0.5; a.x -= nx * push * Math.min(1, dt * 8); a.y -= ny * push * Math.min(1, dt * 8); b.x += nx * push * Math.min(1, dt * 8); b.y += ny * push * Math.min(1, dt * 8); a.vx -= nx * 0.05; a.vy -= ny * 0.05; b.vx += nx * 0.05; b.vy += ny * 0.05; }
    }
    ms.forEach((m) => { const sp = Math.hypot(m.vx, m.vy); if (sp < 0.4 || sp > 1.6) { const k = clamp(sp, 0.4, 1.6) / (sp || 1); m.vx *= k; m.vy *= k; if (sp < 1e-3) { m.vx = 0.7; m.vy = 0.5; } } });
    // 원자 (조립 원 안)
    const inn = CT.atoms.filter((a) => a.state === 'in'), n = inn.length;
    inn.forEach((a, i) => {
      const ang = CT.t * 0.45 + (i * TAU) / Math.max(1, n), rr = n > 1 ? Math.min(54, 26 + n * 6) : 0;
      a.x = SciSim.approach(a.x, CIR.x + Math.cos(ang) * rr, dt, 9); a.y = SciSim.approach(a.y, CIR.y + Math.sin(ang) * rr, dt, 9);
      a.s = SciSim.approach(a.s, 1, dt, 14);
    });
    CT.atoms.forEach((a) => {
      if (a.state === 'drag') { a.s = SciSim.approach(a.s, 1.12, dt, 18); }
      else if (a.state === 'asm') { a.asmT += dt; a.x = SciSim.approach(a.x, a.tx, dt, 9); a.y = SciSim.approach(a.y, a.ty, dt, 9); a.s = SciSim.approach(a.s, 1, dt, 14); }
      else if (a.state === 'back') { a.t += dt / 0.4; const k = ease.inOutCubic(Math.min(1, a.t)), b = CT.baskets.find((q) => q.sym === a.sym); a.x = lerp(a.x0, b ? b.hx : a.x0, k); a.y = lerp(a.y0, b ? b.y : a.y0, k); a.s = 1 - 0.7 * k; if (a.t >= 1) a.gone = true; }
    });
    CT.atoms = CT.atoms.filter((a) => !a.gone);
    CT.asm.forEach((g) => { g.t += dt; if (!g.done && g.t > 0.75) { g.done = true; finishAssemble(g); } });
    CT.asm = CT.asm.filter((g) => !g.done);
    // 자동 조립
    if (CT.buildOn && !CT.drag && !CT.asm.length) {
      CT.idle += dt;
      const free = !!(game && game.free);
      if (CT.idle > (free ? 0.9 : 0.3)) { const r = recipeFor(); if (r) { startAssemble(r); CT.idle = 0; } }
    } else CT.idle = 0;
  }
  const ctBuildOn = () => !!((game && game.free) || CT.mode === 'build');

  /* ----- 그리기 ----- */
  function drawGlassBox() {
    const { x, y, w, h } = BX;
    softShadow(x, y, w, h, 22, 16, 6, 'rgba(30,60,120,.28)');
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(236,246,255,.95)'); g.addColorStop(1, 'rgba(212,230,250,.95)');
    ctx.fillStyle = g; D.roundRect(x, y, w, h, 22); ctx.fill();
    ctx.save(); D.roundRect(x, y, w, h, 22); ctx.clip();
    const bg = ctx.createLinearGradient(0, y + h - 60, 0, y + h); bg.addColorStop(0, 'rgba(120,160,210,0)'); bg.addColorStop(1, 'rgba(120,160,210,.28)'); ctx.fillStyle = bg; ctx.fillRect(x, y + h - 60, w, 60);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(x + 40, y); ctx.lineTo(x + 90, y); ctx.lineTo(x + 20, y + h * 0.5); ctx.lineTo(x, y + h * 0.5); ctx.lineTo(x, y + 60); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(x + 112, y); ctx.lineTo(x + 130, y); ctx.lineTo(x + 56, y + h * 0.55); ctx.lineTo(x + 38, y + h * 0.55); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#9cb3d2'; ctx.lineWidth = 3.4; D.roundRect(x, y, w, h, 22); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; D.roundRect(x + 4, y + 4, w - 8, h - 8, 19); ctx.stroke();
    if (CT.complete > 0.02) { ctx.strokeStyle = rgba('#8b5cf6', CT.complete * 0.8); ctx.lineWidth = 6; D.roundRect(x - 2, y - 2, w + 4, h + 4, 24); ctx.stroke(); }
  }
  function drawMolecules(t) {
    CT.mols.forEach((m) => {
      rotMol(m.mol, 0.32 * Math.sin(m.rx), 0.42 * Math.sin(m.ry), m.rz, SCC, m.P);
      const k = outBack(m.born);
      ctx.save(); ctx.translate(m.x, m.y); ctx.scale(k, k); ctx.translate(-m.x, -m.y);
      molShadow(m.P, m.x, m.y, 0.55);
      drawMolP(m.P, m.x, m.y);
      ctx.restore();
    });
    // 렌즈
    const L = CT.lk;
    let atomNo = 0;
    CT.mols.forEach((m, mi) => {
      const k = outBack(m.born); if (k < 0.5) { atomNo += m.mol.atoms.length; return; }
      const P = m.P, cx = m.x, cy = m.y;
      if (L.mol > 0.02) {
        ctx.save(); ctx.globalAlpha = L.mol;
        const h = drawHull(P, cx, cy, 7, 'rgba(139,92,246,.16)', 'rgba(139,92,246,.85)', 2.6);
        let bx = -1e9, by = 1e9; h.forEach((q) => { if (q[0] - q[1] > bx - by) { bx = q[0]; by = q[1]; } });
        ctx.fillStyle = COL.sub; circle(ctx, bx, by, 13); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.stroke();
        txt(String(mi + 1), bx, by + 5.5, 16, '#fff', 'center', 800);
        ctx.restore();
      }
      const order = P.map((p, i) => i);
      if (L.atom > 0.02) {
        ctx.save(); ctx.globalAlpha = L.atom;
        order.forEach((i) => { const p = P[i]; ctx.strokeStyle = '#2b3350'; ctx.lineWidth = 2; circle(ctx, cx + p.x, cy + p.y, p.r + 3); ctx.stroke(); });
        order.forEach((i) => { const p = P[i], bx = cx + p.x + p.r * 0.72, by = cy + p.y - p.r * 0.72; ctx.fillStyle = '#2b3350'; circle(ctx, bx, by, 10); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); txt(String(atomNo + i + 1), bx, by + 5, 13.5, '#fff', 'center', 800); });
        ctx.restore();
      }
      if (L.elem > 0.02) {
        ctx.save(); ctx.globalAlpha = L.elem;
        order.forEach((i) => { const p = P[i]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; circle(ctx, cx + p.x, cy + p.y, p.r + 3); ctx.stroke(); ctx.strokeStyle = RING_COL[p.sym]; ctx.lineWidth = 4.5; circle(ctx, cx + p.x, cy + p.y, p.r + 3); ctx.stroke(); });
        ctx.restore();
      }
      atomNo += P.length;
    });
    // 원소 렌즈 범례
    if (L.elem > 0.05) {
      const syms = []; CT.mols.forEach((m) => m.mol.atoms.forEach((a) => { if (syms.indexOf(a[0]) < 0) syms.push(a[0]); }));
      if (syms.length) {
        ctx.save(); ctx.globalAlpha = L.elem;
        const names = syms.map((s) => SYM_NAME[s]); const w = 28 + syms.reduce((a, s, i) => a + names[i].length * 15 + 34, 0) + 66, x0 = BX.x + 16, y0 = BX.y + BX.h - 46;
        panel(x0, y0, w, 34, 17, 'rgba(255,255,255,.96)', 8, 2);
        let xx = x0 + 16;
        syms.forEach((s, i) => { txt(names[i], xx, y0 + 23, 15, COL.ink, 'left', 800); xx += names[i].length * 15 + 8; ctx.fillStyle = RING_COL[s]; circle(ctx, xx + 4, y0 + 17, 8); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); xx += 26; });
        txt('→ ' + syms.length + '종류', xx, y0 + 23, 15, COL.mol, 'left', 800);
        ctx.restore();
      }
    }
  }
  function drawBuild(t) {
    const k = CT.bsk; if (k < 0.01) return;
    ctx.save(); ctx.globalAlpha = k; ctx.translate((1 - k) * 40, 0);
    panel(452, 62, 332, 376, 22, 'rgba(255,255,255,.88)', 12, 4);
    txt('🧩 분자 조립대', 468, 90, 16, COL.ink, 'left', 800);
    // 바구니
    CT.baskets.forEach((b) => {
      const x = b.hx, y = b.y, e = EL[b.sym], R = rOf(b.sym, 34) + 1, sc = 1 + b.pulse * 0.12;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      groundShadow(0, 36, 40, 8, 1);
      drawBall(b.sym, -14, 4, R * 0.95); drawBall(b.sym, 14, 2, R * 0.95); drawBall(b.sym, 0, -8, R);
      const g = ctx.createLinearGradient(-38, 0, 38, 0); g.addColorStop(0, '#e1b27a'); g.addColorStop(0.5, '#f2cf9b'); g.addColorStop(1, '#c4915a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-40, 8); ctx.quadraticCurveTo(-34, 38, 0, 38); ctx.quadraticCurveTo(34, 38, 40, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,40,.35)'; ctx.lineWidth = 1.6; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 14, 10); ctx.lineTo(i * 12, 36); ctx.stroke(); }
      ctx.restore();
      txt(e.name + ' ' + b.sym, x, y + 62, 14, COL.ink, 'center', 800);
    });
    // 조립 원
    const pu = 0.5 + 0.5 * Math.sin(t * 4), ang = CT.drag ? Math.hypot(CT.drag.x - CIR.x, CT.drag.y - CIR.y) < CIR.R + 16 : false;
    ctx.save();
    ctx.fillStyle = ang ? 'rgba(139,92,246,.14)' : 'rgba(139,92,246,.06)'; circle(ctx, CIR.x, CIR.y, CIR.R); ctx.fill();
    ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 18; ctx.strokeStyle = rgba('#8b5cf6', ang ? 0.95 : 0.5 + 0.25 * pu); ctx.lineWidth = ang ? 4 : 3; circle(ctx, CIR.x, CIR.y, CIR.R); ctx.stroke(); ctx.restore();
    if (!CT.atoms.length && !CT.mols.length && !CT.drag) txt('원자를 여기로 끌어 와요', CIR.x, CIR.y + 5, 14, 'rgba(110,80,200,.85)', 'center', 800);
    ctx.restore();
    // 조립 중 빛
    CT.asm.forEach((g) => { const a = smooth(g.t / 0.75); D.glow(CIR.x, CIR.y, 60 + 30 * a, '#ffd23f', 0.5 * a); });
    // 원자들
    const list = CT.atoms.slice().sort((a, b) => (a.state === 'drag') - (b.state === 'drag'));
    list.forEach((a) => {
      const R = rOf(a.sym, 34) * (a.s || 1) * 1.0;
      ctx.save(); if (a.state === 'asm' || a.state === 'in') {}
      if (a.state === 'drag') softShadow(a.x - R, a.y + R * 0.8, R * 2, 8, 4, 14, 10, 'rgba(20,30,70,.3)');
      else groundShadow(a.x, a.y + R + 3, R, 4, 0.7);
      drawBall(a.sym, a.x, a.y, R);
      ctx.restore();
    });
  }
  function drawGuide(t) {
    const k = CT.guide; if (k < 0.01) return;
    ctx.save(); ctx.globalAlpha = k; ctx.translate((1 - k) * 40, 0);
    panel(452, 62, 332, 376, 22, 'rgba(255,255,255,.9)', 12, 4);
    txt('🔍 렌즈 사용법', 468, 90, 16, COL.ink, 'left', 800);
    const rows = [
      ['mol', '🫧 분자 렌즈', '결합한 덩어리 하나가 분자 1개', '분자: 개수로 세요'],
      ['atom', '⚪ 원자 렌즈', '공 하나하나가 원자 1개', '원자: 개수로 세요'],
      ['elem', '🎨 원소 렌즈', '같은 색 테두리 = 같은 원소', '원소: 종류로 세요'],
    ];
    rows.forEach((r, i) => {
      const y = 110 + i * 100, on1 = CT.lens === r[0];
      ctx.fillStyle = on1 ? 'rgba(139,92,246,.12)' : 'rgba(240,243,250,.8)'; D.roundRect(468, y, 300, 88, 14); ctx.fill();
      ctx.strokeStyle = on1 ? COL.sub : '#d8e0ee'; ctx.lineWidth = on1 ? 3 : 1.6; D.roundRect(468, y, 300, 88, 14); ctx.stroke();
      txt(r[1], 484, y + 28, 16, on1 ? COL.sub : COL.ink, 'left', 800);
      txt(r[2], 484, y + 52, 14, COL.muted, 'left', 700);
      txt(r[3], 484, y + 74, 14.5, on1 ? COL.sub : COL.ink, 'left', 800);
    });
    ctx.restore();
  }
  function ctDraw(t) {
    wall();
    drawGlassBox();
    drawMolecules(t);
    drawGuide(t);
    drawBuild(t);
    focusRing({ x: 452, y: 62, w: 332, h: 376 }, 'build', 22);
    focusRing({ x: BX.x, y: BX.y, w: BX.w, h: BX.h }, 'box', 22);
    // 안내
    if (CT.buildOn) {
      if (CT.mols.length === 0 && !CT.atoms.length) txt('상자 속 분자가 여기에 모여요', BX.x + BX.w / 2, BX.y + BX.h / 2, 15, 'rgba(90,120,170,.7)', 'center', 800);
    }
  }
  function ctAtomAt(p) {
    if (!CT.buildOn) return null;
    for (const b of CT.baskets) if (b.k > 0.5 && Math.abs(p.x - b.hx) < 46 && p.y > b.y - 30 && p.y < b.y + 46) return b;
    return null;
  }
  SC.count = {
    label: '🔍 렌즈로 분자·원자·원소를 세어 봐요',
    get hint() { return ctBuildOn() ? '원자 바구니에서 원자를 끌어 조립 원에 놓아요' : '렌즈를 바꿔 끼우며 분자·원자·원소를 세어 봐요'; },
    enter() { ctBaskets(); },
    update(dt) { ctUpdate(dt); },
    draw(t) { ctDraw(t); },
    hover(p) { if (ctAtomAt(p)) return 'grab'; if (CT.atoms.some((a) => a.state === 'in' && Math.hypot(a.x - p.x, a.y - p.y) < 22)) return 'grab'; return null; },
    down(p) {
      const b = ctAtomAt(p);
      if (b) {
        if (CT.atoms.filter((a) => a.state === 'in' || a.state === 'asm').length >= 9) { say(CIR.x, CIR.y - CIR.R - 6, '조립 원이 가득 찼어요. ↺로 비워요', { bg: COL.warn, maxW: 220 }); Sound.fail(); return false; }
        const a = { sym: b.sym, x: p.x, y: p.y - 20, s: 0.7, state: 'drag', oy: -20 };
        CT.atoms.push(a); CT.drag = a; b.pulse = 1; CT.used[b.sym]++; sfx.glug(); hideHint(); return true;
      }
      const ex = CT.atoms.find((a) => a.state === 'in' && Math.hypot(a.x - p.x, a.y - p.y) < 22);
      if (ex) { ex.state = 'drag'; ex.oy = -16; CT.drag = ex; sfx.glug(); return true; }
      return false;
    },
    move(p) { const a = CT.drag; if (!a) return; a.x = clamp(p.x, 460, 776); a.y = clamp(p.y + a.oy, 80, 430); },
    up(p) {
      const a = CT.drag; if (!a) return; CT.drag = null;
      if (Math.hypot(a.x - CIR.x, a.y - CIR.y) < CIR.R + 14) { a.state = 'in'; a.s = 1.12; CT.idle = 0; Sound.click(); }
      else { CT.used[a.sym] = Math.max(0, CT.used[a.sym] - 1); a.state = 'back'; a.t = 0; a.x0 = a.x; a.y0 = a.y; }
    },
  };
  Object.assign(DBG, { CT, ctPreset, ctClearCircle, ctSetLens, ctReset, CIR, BX, mkMol });

  /* =========================================================
     장면 전환 · UI · 입력
     ========================================================= */
  function setScene(name, reset) {
    const changed = S.scene !== name;
    S.scene = name;
    if (changed || reset) { S.sceneT = 0; FX.clear(); BUB.length = 0; WAVES.length = 0; CHECKS.length = 0; }
    const sc = SC[name];
    if (sc.enter) sc.enter(!!reset);
    $('#tbLabel').textContent = sc.label;
    if (changed || reset) showHint(sc.hint, 6500);
    refreshUI();
  }
  let lastFree = null;
  function pulseEl(sel) { const n = $(sel); if (!n) return; n.classList.remove('feature-new'); void n.offsetWidth; n.classList.add('feature-new'); setTimeout(() => n.classList.remove('feature-new'), 4600); }
  function refreshUI() {
    $$('[data-sc]').forEach((node) => { node.hidden = node.getAttribute('data-sc').split(/\s+/).indexOf(S.scene) < 0; });
    zoomRefresh();
    const free = !!(game && game.free);
    const cw = $('#clearWrap'); if (cw) cw.hidden = S.scene !== 'count' || !ctBuildOn();
    const zn = $('#zoomNote'); if (zn) zn.textContent = ZM.split ? '물 분자를 나누면 원자가 되어, 더 이상 물이 아니에요.' : ZM.level >= 7 ? '물 분자 1개까지 왔어요. 한 번 더 나누면 어떻게 될까요?' : '버튼을 누를 때마다 물방울이 1/10 크기로 나뉘고, 그 속을 10배 확대해서 봐요.';
    const sn = $('#scopeNote'); if (sn) sn.textContent = on('ion') ? '시료를 눌러 현미경으로 관찰한 뒤, 원자·분자·이온 상자에 넣어요. 관찰하기 전에는 상자에 넣을 수 없어요.' : '시료를 눌러(또는 창으로 끌어) 관찰한 뒤, 아래 칩을 알맞은 상자에 끌어 넣어요.';
    const cn = $('#countNote'); if (cn) cn.textContent = ctBuildOn() ? '원자를 조립 원에 놓으면 분자가 만들어져 상자로 들어가요.' : '렌즈를 바꾸면 같은 상자를 다른 눈으로 볼 수 있어요.';
    $('#resetBtn').hidden = S.scene === 'zoom';
    $('#sceneSeg').hidden = !free;
    $('#tbLabel').hidden = free && window.innerWidth < 1000;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    const card = $('#ctrlCard');
    card.hidden = !Array.from(card.children).some((n) => !n.hidden);
    lastFree = free;
  }
  $('#zoomBtn').addEventListener('click', () => { Sound.click(); zoomStep(); refreshUI(); });
  $('#zoomResetBtn').addEventListener('click', () => { Sound.click(); zoomReset(); refreshUI(); });
  $('#clearBtn').addEventListener('click', () => { Sound.click(); ctClearCircle(); });
  $$('#lensSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); ctSetLens(b.dataset.lens); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'scope') scopeReset(false);
    else if (S.scene === 'count') ctReset();
    refreshUI();
  });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click();
    const to = b.dataset.scene;
    if (to === 'scope') { scopeReset(false); }
    if (to === 'count' && S.scene !== 'count') { ctPreset(CT.preset === 'empty' ? 'h2o3' : CT.preset); }
    setScene(to, true);
  }));

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
     갱신 · 그리기 · 루프
     ========================================================= */
  function update(dt) {
    S.sceneT += dt;
    updateAnims(dt); updateLater(dt);
    FX.update(dt);
    if (FOC.t > 0) FOC.t -= dt;
    const s = SC[S.scene];
    if (s && s.update) s.update(dt);
  }
  let lastDt = 0.016;
  function draw(t) {
    view.clear(BGC0);
    const s = SC[S.scene];
    if (s && s.draw) s.draw(t, lastDt);
    FX.draw(ctx);
    drawWaves(lastDt);
    drawBubbles(lastDt);
    if (S.sceneT < 0.3) { ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.3); ctx.fillStyle = BGC0; ctx.fillRect(0, 0, VW, VH); ctx.restore(); }
  }

  /* =========================================================
     미션
     ========================================================= */
  const MARK = (b) => (b ? '✅' : '⬜');
  function zoomJump(level, split) { ZM.level = level; ZM.phase = 'idle'; ZM.split = !!split; ZM.spread = 0; ZM.apart = split ? 1 : 0; ZM.crack = split ? 1.2 : -1; ZM.frag = []; ZM.e = 0; ZM.pop = 1; }
  function useZoom(level) { zoomJump(level || 0, false); setScene('zoom', true); }
  function useScope() { setScene('scope', true); scopeReset(false); }
  function useCount(preset, mode) { CT.mode = mode; ctPreset(preset); ctBaskets(); CT.buildOn = ctBuildOn(); CT.bsk = CT.buildOn ? 1 : 0; CT.guide = CT.buildOn ? 0 : 1; setScene('count', true); }
  const FIG_H2O = '<svg viewBox="0 0 220 130" width="220" height="130" role="img" aria-label="물 분자 모형"><defs><radialGradient id="gO" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffb4b4"/><stop offset=".55" stop-color="#ef4b4b"/><stop offset="1" stop-color="#a82a2a"/></radialGradient><radialGradient id="gH" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#e8edf5"/><stop offset="1" stop-color="#a9b3c4"/></radialGradient></defs><ellipse cx="110" cy="108" rx="70" ry="8" fill="rgba(60,40,30,.15)"/><circle cx="62" cy="76" r="22" fill="url(#gH)" stroke="#b9c3d3"/><circle cx="158" cy="76" r="22" fill="url(#gH)" stroke="#b9c3d3"/><circle cx="110" cy="52" r="34" fill="url(#gO)"/><text x="110" y="60" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">O</text><text x="62" y="84" text-anchor="middle" font-size="19" font-weight="800" fill="#4b5565">H</text><text x="158" y="84" text-anchor="middle" font-size="19" font-weight="800" fill="#4b5565">H</text><text x="110" y="126" text-anchor="middle" font-size="14" font-weight="800" fill="#5d6879">물 분자 1개</text></svg>';
  const sumTable = (rows, head) => '<table style="table-layout:auto"><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';

  game = SciSim.game({
    simId: 'm2-atom-molecule',
    mount: '#game',
    badge: '입자 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      zoom: '✂️ 물방울 나누기(확대)',
      scope: '🔬 입자 현미경',
      sort2: '🗃️ 원자·분자 분류 상자',
      lens: '🔍 분자·원자·원소 렌즈',
      build: '🧩 분자 조립대',
      ion: '⚡ 이온 상자(새 분류)',
    },
    onFeatures(set) { F = set; if (game) refreshUI(); },
    onHint(m) { if (m.focus === 'zoomBtn') pulseEl('#zoomBtn'); else if (m.focus === 'lensSeg') pulseEl('#lensSeg'); else if (m.focus) setFocus(m.focus); },
    onMissionStart() { if (game && game.free) return; refreshUI(); },
    onComplete() { CT.mode = 'free'; scopeReset(false); setScene('scope', true); refreshUI(); },
    levels: [
      {
        title: '물질의 성질을 가진 가장 작은 입자', short: '분자', icon: '💧', phase: '관찰',
        features: ['zoom'],
        intro: '<p class="si-q">❓ 탐구 질문: 물방울을 계속 작게 나누면 마지막에는 무엇이 남을까? 그것도 여전히 물일까?</p>' +
          '<p>잎 위의 물방울을 <b>1/10 크기</b>로 계속 나누며 확대해 봐요. 아무리 작아져도 물일까요?</p>' +
          '<p>앞 차시에서 물의 화학식은 <b>H₂O</b>였죠?</p>',
        setup() { useZoom(0); },
        recap: '분자는 원자가 결합하여 만들어진, 물질의 성질을 나타내는 가장 작은 입자예요.',
        summary: '<span class="formula" style="font-size:15px">분자 = 원자가 결합하여 만들어진 입자로,<br>물질의 성질을 나타내는 가장 작은 입자</span>' +
          '<ul><li>물 분자(H₂O) = 산소 원자 1개 + 수소 원자 2개</li><li>지름 1 mm 물방울 속 물 분자 약 1.7×10¹⁹개</li></ul>' +
          '<div class="note">그림의 입자는 실제보다 훨씬 크게, 일부만 그렸어요.</div>',
        missions: [
          {
            title: '어디까지 물일까?', scene: 'zoom', focus: 'zoomBtn',
            goal: '물방울을 1/10 크기로 계속 나누어 보세요. 물의 성질을 지닌 가장 작은 알갱이가 나올 때까지!',
            hint: '✂️ 나누기를 여러 번 눌러요. 확대되어도 물방울은 같은 크기로 보여요. 축척 막대를 보세요!',
            setup() { useZoom(0); },
            check: () => ZM.level >= 7 && ZM.phase === 'idle', hold: 0.5,
            status: () => { const L = ZL[Math.min(ZM.level, 7)]; return (ZM.level >= 7 ? '크기 <b>' : '지름 <b>') + L.dia.replace(/ \(.*\)/, '') + '</b> · 물 분자 <b>' + L.n + '</b> · 여전히 물 ' + (ZM.split ? '✗' : '✔'); },
            onWin() { okFx(DROP.x, DROP.y - 30, COL.good, true); },
            explain: '아무리 작게 나누어도 물이었어요. 마지막에 남은 알갱이가 <b>물 분자</b>예요. 지름 1 mm 물방울 하나에도 물 분자가 약 1.7×10¹⁹개(약 1700경 개)나 들어 있어요.',
          },
          {
            title: '물 분자를 더 나누면?', scene: 'zoom', focus: 'zoomBtn',
            goal: '물 분자 1개를 한 번 더 나누어 보세요. 무엇이 생기고, 그래도 물일까요?',
            hint: '물 분자까지 왔다면 ✂️ 더 나누기를 눌러요.',
            setup() { zoomJump(7, false); setScene('zoom', true); },
            check: () => ZM.split && ZM.phase === 'idle', hold: 0.4,
            status: () => '물 분자 나누기 ' + MARK(ZM.split),
            onWin() { okFx(DROP.x, DROP.y - 90, COL.good, false); },
            explain: '물 분자를 나누면 <b>수소 원자 2개와 산소 원자 1개</b>가 되어 더 이상 물이 아니에요. 이처럼 원자가 결합하여 만들어진 입자로, 물질의 성질을 나타내는 가장 작은 입자를 <b>분자</b>라고 해요.',
          },
          {
            type: 'quiz', title: '분자에 대한 생각', scene: 'zoom',
            goal: '분자에 대한 설명으로 옳은 것은?',
            choices: ['물방울을 작게 나누면 물 분자도 점점 작아진다.', '분자는 더 이상 쪼갤 수 없는 가장 작은 입자이다.', '분자는 원자가 결합한 입자로, 물질의 성질을 나타내는 가장 작은 입자이다.', '물 분자를 원자로 나누어도 여전히 물의 성질을 가진다.'],
            answer: 2,
            feedback: ['물방울이 작아져도 물 분자 하나의 크기는 그대로예요. 분자의 개수만 줄어요.', '분자는 원자로 나눌 수 있어요. 다만 나누면 그 물질의 성질이 사라져요.', '', '나누어 생긴 수소 원자와 산소 원자는 물이 아니에요.'],
            explain: '분자는 <b>원자가 결합하여 만들어진 입자로, 물질의 성질을 나타내는 가장 작은 입자</b>예요.',
          },
        ],
      },
      {
        title: '원자로 존재하는 물질, 분자로 존재하는 물질', short: '원자·분자', icon: '🔬', phase: '탐구',
        features: ['scope', 'sort2'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물은 물 분자로 이루어져 있음을 알았어요.</div>' +
          '<p>모든 물질이 분자로 이루어져 있을까요? 여러 물질을 <b>입자 현미경</b>으로 들여다보고, <b>원자로 존재하는 물질</b>과 <b>분자로 존재하는 물질</b>로 나누어 봐요.</p>',
        setup() { useScope(); },
        recap: '물질은 원자로 존재하기도 하고(헬륨, 구리), 원자가 결합한 분자로 존재하기도 해요(산소, 물, 이산화 탄소).',
        summary: sumTable([['헬륨', 'He', '원자', '원자가 따로따로'], ['구리', 'Cu', '원자', '원자가 규칙적으로 끝없이'], ['산소', 'O₂', '분자', '원자 2개가 결합'], ['이산화 탄소', 'CO₂', '분자', '원자 3개가 결합'], ['물', 'H₂O', '분자', '원자 3개가 결합']], ['물질', '화학식', '입자', '모습']),
        missions: [
          {
            title: '입자로 분류하기', scene: 'scope', focus: 'scope',
            goal: '여섯 가지 물질을 입자 현미경으로 관찰하고 원자로 존재하는 물질과 분자로 존재하는 물질로 분류하세요.',
            hint: '입자가 하나씩 따로 움직이는지, 원자 여러 개가 붙어 한 덩어리로 움직이는지 보세요. 관찰하기 전에는 상자에 넣을 수 없어요.',
            setup() { useScope(); },
            check: () => SCP.list.length === 6 && nPlaced() === 6, hold: 0.3,
            status: () => '관찰 <b>' + nSeen() + '/' + SCP.list.length + '</b> · 분류 <b>' + nPlaced() + '/' + SCP.list.length + '</b>',
            explain: '헬륨·네온은 원자가 하나씩 따로 떨어져 있고, 구리 같은 금속은 수많은 원자가 규칙적으로 배열해 있어요. 산소·이산화 탄소·물은 원자가 결합한 <b>분자</b>로 존재해요.',
          },
          {
            type: 'quiz', title: '헬륨과 산소', scene: 'scope',
            goal: '헬륨 풍선 속 헬륨과 산소통 속 산소를 입자로 비교한 것으로 옳은 것은?',
            choices: ['헬륨과 산소는 모두 원소이므로 둘 다 원자로 존재한다.', '헬륨은 원자가 하나씩 따로 존재하고, 산소는 산소 원자 2개가 결합한 분자로 존재한다.', '헬륨은 화합물이라서 분자로 존재한다.', '산소 분자 속에는 헬륨 원자가 들어 있다.'],
            answer: 1,
            feedback: ['산소는 원소이지만 산소 원자 2개가 결합한 분자(O₂)로 존재해요.', '', '헬륨은 한 가지 원소로 된 물질이에요.', '산소 분자는 산소 원자로만 이루어져 있어요.'],
            explain: '헬륨, 네온, 아르곤 같은 <b>18족 원소</b>는 다른 원자와 거의 결합하지 않아 원자 하나하나가 따로 존재해요(주기율표 차시의 18족 안정성!). 같은 원소라도 산소는 원자 2개가 결합한 분자로 존재해요.',
          },
        ],
      },
      {
        title: '원소, 원자, 분자 구별하기', short: '세어 보기', icon: '🔍', phase: '모형',
        features: ['lens', 'build'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물질에 따라 원자로, 또는 분자로 존재한다는 것을 알았어요.</div>' +
          '<p>원소, 원자, 분자는 헷갈리기 쉬워요. <b>원소는 성분의 ‘종류’</b>, <b>원자와 분자는 ‘입자’</b>예요. 렌즈를 바꿔 끼우며 세어 봐요.</p>',
        setup() { useCount('h2o3', 'view'); ctSetLens('mol'); },
        recap: '원소는 성분의 종류, 원자와 분자는 입자예요. 물 분자 1개는 원소 2종류, 원자 3개로 이루어져 있어요.',
        summary: sumTable([['뜻', '물질을 이루는 성분의 종류', '원소를 이루는 아주 작은 입자', '원자가 결합한 입자'], ['세는 법', '종류로', '개수로', '개수로'], ['예: 물 분자 3개', '2종류(수소, 산소)', '9개', '3개'], ['예: 이산화 탄소 분자 2개', '2종류(탄소, 산소)', '6개', '2개']], ['', '원소', '원자', '분자']),
        missions: [
          {
            type: 'quiz', title: '물 분자 3개 세기', scene: 'count', focus: 'lensSeg',
            setup() { useCount('h2o3', 'view'); ctSetLens('mol'); },
            goal: '상자 속 물질의 분자 수, 원자 수, 원소의 종류 수는? 렌즈를 바꿔 끼우며 세어 보세요.',
            choices: ['분자 3개, 원자 3개, 원소 2종류', '분자 3개, 원자 9개, 원소 2종류', '분자 9개, 원자 9개, 원소 3종류', '분자 3개, 원자 9개, 원소 9종류'],
            answer: 1,
            feedback: ['원자 렌즈로 세어 보세요. 분자 하나에 원자가 3개씩!', '', '원자 9개가 3개씩 결합해 분자 3개를 이뤄요. 원소는 수소와 산소 두 종류예요.', '원소는 입자의 개수가 아니라 종류예요.'],
            explain: '물 분자 3개 = 원자 9개(수소 원자 6 + 산소 원자 3), 원소는 수소와 산소 2종류예요. <b>원소는 종류로, 원자·분자는 개수로</b> 세요.',
          },
          {
            title: '이산화 탄소 분자 2개 만들기', scene: 'count', focus: 'build',
            setup() { useCount('empty', 'build'); ctSetLens('mol'); },
            goal: '원자 바구니에서 원자를 꺼내 이산화 탄소(CO₂) 분자 2개를 조립해 상자에 넣으세요.',
            hint: 'CO₂ 분자 하나 = 탄소 원자 1개 + 산소 원자 2개. 2개를 만들려면 원자가 모두 몇 개 필요할까요?',
            check: () => CT.mode === 'build' && co2Cnt() === 2 && !CT.atoms.length && !CT.asm.length, hold: 0.4,
            status: () => '탄소 원자 <b>' + CT.used.C + '</b> · 산소 원자 <b>' + CT.used.O + '</b> 사용 / 완성 분자 <b>' + co2Cnt() + '/2</b>',
            explain: 'CO₂ 분자 2개 = 원자 6개(탄소 2 + 산소 4), 원소는 탄소와 산소 2종류예요.',
          },
          {
            type: 'quiz', title: '물 분자 속에는?', scene: 'count', figure: FIG_H2O,
            setup() { useCount('h2o1', 'view'); ctSetLens('atom'); },
            goal: '물 분자 1개에 대한 설명으로 옳은 것은?',
            choices: ['3종류의 원소로 이루어져 있다.', '수소 분자(H₂) 1개와 산소 원자 1개가 결합해 있다.', '2종류의 원소, 3개의 원자로 이루어져 있다.', '원자 2개로 이루어져 있다.'],
            answer: 2,
            feedback: ['원자는 3개지만 원소(종류)는 수소와 산소 2가지예요.', '물 분자 속에 수소 분자가 따로 들어 있지 않아요. 수소 원자 2개가 각각 산소 원자와 결합해 있어요.', '', 'H₂O의 2는 수소 원자 수예요. 산소 원자 1개도 있어요(1은 생략).'],
            explain: '물 분자(H₂O) 1개는 <b>원소 2종류(수소, 산소), 원자 3개</b>로 이루어져 있어요.',
          },
        ],
      },
      {
        title: '원자·분자·이온으로 분류하기', short: '입자 분류', icon: '🧂', phase: '적용',
        features: ['ion'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원소·원자·분자를 구별해 세어 보았어요.</div>' +
          '<p>그런데 <b>소금(염화 나트륨) 속에는 분자가 없대요!</b> 입자 현미경으로 들여다보고 우리 주변 물질을 원자·분자·이온으로 분류해 봐요.</p>',
        setup() { useScope(); },
        recap: '물질을 이루는 입자는 원자, 분자, 이온 등으로 존재해요. 이온은 전하를 띤 입자예요.',
        summary: sumTable([['헬륨, 네온, 구리', '산소, 물, 이산화 탄소, 메테인', '염화 나트륨']], ['원자로 존재', '분자로 존재', '이온으로 존재']) + '<div class="note">이온이 생기는 과정은 다음 차시에서 배워요.</div>',
        missions: [
          {
            title: '원자·분자·이온 분류', scene: 'scope', focus: 'scope',
            goal: '소금을 먼저 관찰한 뒤, 일곱 가지 물질을 원자·분자·이온으로 존재하는 물질로 분류하세요.',
            hint: '원자가 따로 있는지, 원자가 결합한 덩어리(분자)인지, 전하(+, −)를 띤 입자인지 보세요.',
            setup() { useScope(); },
            check: () => SCP.list.length === 7 && nPlaced() === 7, hold: 0.3,
            status: () => '분류 <b>' + nPlaced() + '/' + SCP.list.length + '</b>' + (SCP.seen.nacl ? '' : ' · 소금을 먼저 관찰해요'),
            explain: '헬륨·구리는 <b>원자</b>로, 산소·물·이산화 탄소·메테인은 <b>분자</b>로, 염화 나트륨은 <b>이온</b>으로 이루어져 있어요. 물질을 이루는 입자는 원자, 분자, 이온 등으로 존재할 수 있어요.',
          },
          {
            type: 'quiz', title: '원소·화합물과 입자', scene: 'scope',
            goal: '다음 중 옳은 것은?',
            choices: ['원소는 모두 원자로 존재한다.', '화합물은 모두 분자로 존재한다.', '원소인 산소는 분자로, 화합물인 염화 나트륨은 이온으로 존재한다.', '염화 나트륨은 나트륨 원자 1개와 염소 원자 1개가 결합한 분자이다.'],
            answer: 2,
            feedback: ['산소(O₂)는 원소이지만 분자로 존재해요.', '염화 나트륨은 화합물이지만 이온으로 이루어져 있어요.', '', '화학식 NaCl은 두 입자가 1 : 1로 들어 있다는 뜻이에요. 소금 속에는 따로 떨어진 분자가 없어요.'],
            explain: '원소인지 화합물인지(성분)와 원자·분자·이온 중 어떤 입자로 존재하는지(입자)는 <b>서로 다른 기준</b>이에요. 그런데 이온은 어떻게 전하를 띠게 될까요? 👉 다음 차시 ⚡ 이온의 형성에서 알아봐요!',
          },
        ],
      },
    ],
  });

  ctSetLens('mol');
  refreshUI();
  let FREEZE = false;
  SciSim.loop((dt, t) => { lastDt = dt; if (!FREEZE) update(dt); draw(now()); if (lastFree !== !!(game && game.free)) refreshUI(); });
  window.__sim = Object.assign({
    S, SC, get game() { return game; }, ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    setScene, refreshUI, freeze(v) { FREEZE = !!v; }, zoomJump, useScope, useCount,
  }, DBG);
})();
