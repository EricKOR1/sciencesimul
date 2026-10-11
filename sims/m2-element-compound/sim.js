/* =========================================================
   중2 Ⅳ. 물질의 구성 — 원소와 화합물  [9과11-01]
   원소와 화합물의 정의를 알고, 원소와 화합물을 화학식으로 표현할 수 있다.
   ① 관찰: 물의 전기 분해 → ② 탐구: 분해해서 원소·화합물로 분류
   → ③ 모형: 원자 모형을 보고 화학식 쓰기 → ④ 적용: 지구 환경 물질을 화학식으로 쓰고 분류
   ※ '분자' 낱말·계수·반응식·기체 부피비의 의미는 다루지 않음 (다음 차시 이후)
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
    neg: '#3a4150', pos: '#e2464b', elem: '#0ea5a5', comp: '#f08c2e',
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

  /* ---------- 원소 · 원자 공 ---------- */
  const EL = {
    H:  { name: '수소',   c: '#f5f7fb', edge: '#c4ccd8', ink: '#4b5565', r: 22 },
    He: { name: '헬륨',   c: '#7fd8e8', ink: '#0f4a57', r: 24 },
    C:  { name: '탄소',   c: '#3a3f4b', ink: '#ffffff', r: 30 },
    N:  { name: '질소',   c: '#3f6fe8', ink: '#ffffff', r: 28 },
    O:  { name: '산소',   c: '#ef4b4b', ink: '#ffffff', r: 29 },
    S:  { name: '황',     c: '#f2c230', ink: '#4a3a00', r: 34 },
    Cl: { name: '염소',   c: '#3fbf5f', ink: '#ffffff', r: 32 },
    Na: { name: '나트륨', c: '#9b7be0', ink: '#ffffff', r: 30 },
    Fe: { name: '철',     c: '#9a6b52', ink: '#ffffff', r: 30 },
    Co: { name: '코발트', c: '#5b7bb5', ink: '#ffffff', r: 30 },
    Cu: { name: '구리',   c: '#c7743b', ink: '#ffffff', r: 30 },
    Ag: { name: '은',     c: '#cfd5de', edge: '#a9b2bf', ink: '#3b4453', r: 30 },
    Hg: { name: '수은',   c: '#b9c0cc', edge: '#9aa3b1', ink: '#3b4453', r: 32 },
    HgB: { name: '수은', c: '#b9c0cc', edge: '#9aa3b1', ink: '#3b4453', r: 32, noText: true },
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
    if (R >= 9 && sym && !e.noText) {
      g.fillStyle = e.ink; g.font = D.font(clamp(R * 0.62, 12, 24), 800);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sym, cx, cy + R * 0.06);
    }
    sp = { cv, half: R * m };
    SPR.set(key, sp);
    return sp;
  }
  /* 공 하나 그리기 (x, y)=중심, R=반지름, o: {alpha, dark 0~1, label:false} */
  function drawBall(sym, x, y, R, o) {
    o = o || {};
    const rr = Math.max(2, Math.round(R));
    const sp = ballSprite(sym, rr);
    const s = sp.half * 2 * (R / rr);
    if (o.alpha != null && o.alpha < 1) ctx.globalAlpha = o.alpha;
    ctx.drawImage(sp.cv, x - s / 2, y - s / 2, s, s);
    if (o.dark > 0.01) { ctx.fillStyle = 'rgba(20,24,50,' + o.dark.toFixed(3) + ')'; circle(ctx, x, y, R); ctx.fill(); }
    if (o.alpha != null && o.alpha < 1) ctx.globalAlpha = 1;
  }

  /* ---------- 입자 모형 (좌표 단위: Å, 1 Å = 55 px) ---------- */
  const T4 = 0.63;
  const MOLS = {
    H2O: { name: '물', f: { H: 2, O: 1 }, atoms: [['O', 0, 0.2, 0], ['H', -0.76, -0.39, 0], ['H', 0.76, -0.39, 0]] },
    O2:  { name: '산소', f: { O: 2 }, atoms: [['O', -0.6, 0, 0], ['O', 0.6, 0, 0]] },
    CO:  { name: '일산화 탄소', f: { C: 1, O: 1 }, atoms: [['C', -0.56, 0, 0], ['O', 0.56, 0, 0]] },
    CH4: { name: '메테인', f: { C: 1, H: 4 }, atoms: [['C', 0, 0, 0], ['H', T4, T4, T4], ['H', T4, -T4, -T4], ['H', -T4, T4, -T4], ['H', -T4, -T4, T4]] },
    O3:  { name: '오존', f: { O: 3 }, atoms: [['O', 0, -0.45, 0], ['O', -1.09, 0.22, 0], ['O', 1.09, 0.22, 0]] },
    CO2: { name: '이산화 탄소', f: { C: 1, O: 2 }, atoms: [['O', -1.16, 0, 0], ['C', 0, 0, 0], ['O', 1.16, 0, 0]] },
    SO2: { name: '이산화 황', f: { S: 1, O: 2 }, atoms: [['S', 0, -0.4, 0], ['O', -1.23, 0.33, 0], ['O', 1.23, 0.33, 0]] },
    N2:  { name: '질소', f: { N: 2 }, atoms: [['N', -0.55, 0, 0], ['N', 0.55, 0, 0]] },
    NH3: { name: '암모니아', f: { N: 1, H: 3 }, atoms: [['N', 0, -0.12, 0], ['H', 0, 0.33, 0.94], ['H', 0.81, 0.33, -0.47], ['H', -0.81, 0.33, -0.47]] },
    Hg:  { name: '수은', f: { Hg: 1 }, atoms: [['HgB', 0, 0, 0], ['HgB', 1, 0, 0], ['HgB', -1, 0, 0], ['HgB', 0, 1, 0], ['HgB', 0, -1, 0], ['HgB', 0, 0, 1], ['HgB', 0, 0, -1]], blob: true },
  };
  const fText = (f, order) => (order || Object.keys(f)).map((s) => s + (f[s] > 1 ? f[s] : '')).join('');
  const fParts = (f, order) => (order || Object.keys(f)).map((s) => [s, f[s]]);
  function projMol(mol, o) {
    const ang = o.ang || 0, tilt = o.tilt != null ? o.tilt : 0.3, sc = o.scale || 55, spread = o.spread || 0, t = o.t || 0;
    const ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(tilt), st = Math.sin(tilt);
    const P = mol._p || (mol._p = mol.atoms.map(() => ({})));
    mol.atoms.forEach((a, i) => {
      let x = a[1] * sc, y = a[2] * sc, z = a[3] * sc;
      if (mol.blob) { x += Math.sin(t * 2.1 + i * 1.7) * 2.2; y += Math.cos(t * 1.7 + i * 2.3) * 2.2; }
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
      const y1 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      const len = Math.hypot(x1, y1) || 1;
      const p = P[i];
      p.x = x1 + (x1 / len) * spread; p.y = y1 + (y1 / len) * spread; p.z = z2; p.sym = a[0];
      const d = clamp(z2 / (sc * 1.1), -1, 1);
      p.k = 0.96 + 0.04 * d; p.dark = Math.max(0, -d) * 0.12; p.i = i;
    });
    return P;
  }
  /* 입자 모형 그리기: o = {ang, tilt, scale, rs(반지름 배율), spread, alpha, shadow, mark(i,p) → {color, tag}} */
  function drawMol(mol, cx, cy, o) {
    o = o || {};
    const rs = o.rs || 1, P = projMol(mol, o);
    let minX = 1e9, maxX = -1e9, maxY = -1e9;
    P.forEach((p) => {
      p.r = (EL[p.sym] ? EL[p.sym].r : 28) * (o.scale ? o.scale / 55 : 1) * rs * p.k;
      minX = Math.min(minX, p.x - p.r); maxX = Math.max(maxX, p.x + p.r); maxY = Math.max(maxY, p.y + p.r);
    });
    if (o.shadow !== false) groundShadow(cx + (minX + maxX) / 2, cy + maxY + 12 * rs, (maxX - minX) / 2 + 16 * rs, (maxX - minX) / 2 * 0.1 + 4, o.alpha == null ? 1 : o.alpha);
    const order = P.slice().sort((a, b) => a.z - b.z);
    if (o.alpha != null && o.alpha < 1) ctx.globalAlpha = o.alpha;
    order.forEach((p) => {
      drawBall(p.sym, cx + p.x, cy + p.y, p.r, { dark: p.dark });
      if (o.mark) {
        const mk = o.mark(p.i, p);
        if (mk) {
          const ph = (now() % 1.2) / 1.2, rr = p.r + 4 + ph * 8;
          ctx.save(); ctx.strokeStyle = rgba(mk.color, (1 - ph) * 0.9); ctx.lineWidth = 4 * (1 - ph) + 1.5; circle(ctx, cx + p.x, cy + p.y, rr); ctx.stroke();
          ctx.strokeStyle = rgba(mk.color, 0.95); ctx.lineWidth = 3; circle(ctx, cx + p.x, cy + p.y, p.r + 3); ctx.stroke();
          if (mk.tag != null) {
            const tx = cx + p.x + p.r * 0.72, ty = cy + p.y - p.r * 0.72;
            ctx.fillStyle = mk.color; circle(ctx, tx, ty, 11); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            txt(String(mk.tag), tx, ty + 5, 14, '#fff', 'center', 800);
          }
          ctx.restore();
        }
      }
    });
    if (o.alpha != null && o.alpha < 1) ctx.globalAlpha = 1;
    return P;
  }

  /* =========================================================
     장면 공통
     ========================================================= */
  const S = { scene: 'electro', sceneT: 0 };
  const SC = {};
  const DR = { fn: null };                 // 입력을 받는 장면
  const DBG = {};                           // 시험용 접근 (window.__sim)
  const hintEl = $('#stageHint');
  function showHint(t, ms) { hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5200); }
  function hideHint() { hintEl.classList.add('hide'); }
  const mark = (b) => (b ? '✅' : '⬜');

  /* 보안경 (벡터로 그린 아이콘) */
  function drawGoggles(x, y, s, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); if (a != null) ctx.globalAlpha = a;
    ctx.strokeStyle = '#5b6b86'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-22, -2); ctx.lineTo(-27, -2); ctx.moveTo(22, -2); ctx.lineTo(27, -2); ctx.stroke();
    ctx.fillStyle = 'rgba(160,215,255,.55)'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.6;
    D.roundRect(-22, -12, 20, 20, 8); ctx.fill(); ctx.stroke();
    D.roundRect(2, -12, 20, 20, 8); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(2, -3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(-15, -6, 4, 2, -0.6, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(9, -6, 4, 2, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     장면 1 · electro — 물의 전기 분해
     ========================================================= */
  const TUBE = { w: 52, topY: 200, mouthY: 400, scaleTop: 214, pxMl: 8.5, cy: 300 };
  const TX = [290, 430];
  const TROUGH = { x: 200, y: 232, w: 320, h: 208 };
  const WATER_Y = 264;
  const LIFT = 160;
  const PSU = { x: 604, y: 292, w: 170, h: 148 };
  const SWR = { x: 684, y: 322, w: 72, h: 40 };
  const TERM = [{ x: 644, y: 418, c: '#2b2f38', lab: MINUS }, { x: 706, y: 418, c: '#d6343a', lab: '+' }];
  const WIRES = [
    [[TX[0], 438], [TX[0], 472], [TERM[0].x, 472], [TERM[0].x, 420]],
    [[TX[1], 438], [TX[1], 492], [TERM[1].x, 492], [TERM[1].x, 420]],
  ];
  const TOOLS_HOME = { match: { x: 64, y: 388 }, incense: { x: 142, y: 388 } };
  const VB = 0.06;                      // 기포 하나가 가진 기체 부피 (mL)
  const RATE = [1.2, 0.6];              // (−)극 : (+)극 = 2 : 1 (mL/s)

  const EZ = {
    goggles: false, gogFly: null, power: false, led: 0, knob: 0, flow: 0, t: 0,
    tubes: [0, 1].map((i) => ({ x: TX[i], V: 0, Vd: 0, acc: 0, boost: 0, lift: 0, flip: 0, water: 1, name: '', ripple: [] })),
    bubbles: [], ripples: [],
    toolsOn: false, toolsShown: 0, toolsNewAt: 0,
    tools: [{ id: 'match', x: 64, y: 388, lift: 0, hold: false }, { id: 'incense', x: 142, y: 388, lift: 0, hold: false }],
    drag: null, test: null, found: { H: false, O: false }, log: [], rec: [{}, {}], recFlash: [0, 0], recShown: 0,
  };
  const tubeMenY = (tb) => TUBE.scaleTop + tb.Vd * TUBE.pxMl;
  function ezReset(keepTools) {
    EZ.power = false; EZ.bubbles.length = 0; EZ.ripples.length = 0; EZ.test = null; EZ.drag = null;
    EZ.tubes.forEach((tb) => { tb.V = 0; tb.Vd = 0; tb.acc = 0; tb.boost = 0; tb.lift = 0; tb.flip = 0; tb.water = 1; tb.name = ''; });
    EZ.found = { H: false, O: false }; EZ.log = []; EZ.rec = [{}, {}]; EZ.recFlash = [0, 0]; EZ.toolsEver = false;
    if (!keepTools) { EZ.toolsOn = false; EZ.toolsShown = 0; }
    EZ.tools.forEach((t) => { t.x = TOOLS_HOME[t.id].x; t.y = TOOLS_HOME[t.id].y; t.lift = 0; t.hold = false; });
    refreshElectroUI();
  }
  function setPower(v, silent) {
    if (v && !EZ.goggles) { toast('🥽 보안경을 먼저 써요!', 'bad'); say(60, 66, '🥽 보안경을 먼저 써요!', { bg: COL.bad }); EZ.shakeGog = 0.6; return false; }
    if (v && EZ.tubes[0].V >= 19.9) { toast('시험관이 가득 찼어요. ↺로 다시 시작해요.'); return false; }
    EZ.power = v;
    if (v) hideHint();
    if (!silent) { Sound.click(); if (v) sfx.zap(); }
    refreshElectroUI();
    return true;
  }
  function wearGoggles() {
    if (EZ.goggles) return;
    EZ.goggles = true; EZ.gogFly = { t: 0 };
    Sound.tick();
    refreshElectroUI();
  }
  function refreshElectroUI() {
    const pb = $('#powerBtn'), gb = $('#gogglesCtl');
    if (pb) {
      pb.innerHTML = EZ.power ? '⏹ 전원 끄기' : '⚡ 전원 켜기';
      pb.classList.toggle('btn-primary', !EZ.power);
      pb.setAttribute('aria-pressed', EZ.power ? 'true' : 'false');
    }
    if (gb) gb.hidden = EZ.goggles || S.scene !== 'electro';
    const nt = $('#elNote');
    if (nt) nt.textContent = EZ.goggles ? (EZ.power ? '두 전극에서 기포가 생겨요.' : '전원을 켜면 물에 전류가 흘러요.') : '실험 전에 꼭 보안경을 써요.';
  }

  function spawnBubble(i) {
    const x0 = TX[i] + rand(-5, 5);
    EZ.bubbles.push({ i, x0, x: x0, y: rand(402, 428), r: 0.6, rMax: rand(1.9, 2.8), grow: rand(0.3, 0.8), age: 0, state: 0, vy: rand(45, 75), ph: rand(0, TAU) });
  }
  function ezUpdate(dt) {
    EZ.t += dt;
    EZ.led = SciSim.approach(EZ.led, EZ.power ? 1 : 0, dt, 12);
    EZ.knob = SciSim.approach(EZ.knob, EZ.power ? 1 : 0, dt, 16);
    if (EZ.power) EZ.flow += dt;
    if (EZ.gogFly) { EZ.gogFly.t += dt; if (EZ.gogFly.t > 0.9) EZ.gogFly.done = true; }
    if (EZ.shakeGog > 0) EZ.shakeGog -= dt;
    // 기체 만들기 (전극마다 속도가 다르다)
    EZ.tubes.forEach((tb, i) => {
      if (EZ.power && tb.V < 19.9) {
        const boost = tb.boost > 0 ? 3 : 1;
        tb.acc += (RATE[i] * boost * dt) / (VB * (RM ? 2 : 1));
        while (tb.acc >= 1) { tb.acc -= 1; spawnBubble(i); }
      }
      if (tb.boost > 0 && tb.V >= tb.boost) tb.boost = 0;
      tb.Vd = SciSim.approach(tb.Vd, tb.V, dt, 14);
      if (Math.abs(tb.Vd - tb.V) < 0.002) tb.Vd = tb.V;
    });
    // 기포 움직임
    for (let k = EZ.bubbles.length - 1; k >= 0; k--) {
      const b = EZ.bubbles[k], tb = EZ.tubes[b.i];
      b.age += dt;
      if (b.state === 0) {
        b.r = lerp(0.6, b.rMax, Math.min(1, b.age / b.grow));
        if (b.age >= b.grow) { b.state = 1; b.age = 0; }
        b.x = b.x0 + Math.sin(EZ.t * 9 + b.ph) * 0.4;
        continue;
      }
      b.y -= b.vy * (1 + (410 - b.y) / 520) * dt;
      b.x = b.x0 + Math.sin(b.age * TAU * 6 + b.ph) * 1.5;
      const covered = tb.lift < 14;
      const men = tubeMenY(tb);
      if (covered && b.y <= men) {
        const v = VB * (RM ? 2 : 1);
        tb.V = Math.min(20, tb.V + v);
        EZ.ripples.push({ x: b.x, y: men, t: 0, small: true });
        if (Math.random() < 0.12) sfx.glug();
        EZ.bubbles.splice(k, 1);
        if (tb.V >= 19.95 && EZ.power) { EZ.power = false; toast('시험관이 가득 찼어요. 전원이 꺼져요.'); refreshElectroUI(); }
        continue;
      }
      if (!covered && b.y <= WATER_Y + 3) { EZ.ripples.push({ x: b.x, y: WATER_Y + 1, t: 0, small: true }); EZ.bubbles.splice(k, 1); continue; }
      if (b.y < 120) EZ.bubbles.splice(k, 1);
    }
    for (let k = EZ.ripples.length - 1; k >= 0; k--) { EZ.ripples[k].t += dt; if (EZ.ripples[k].t > 0.6) EZ.ripples.splice(k, 1); }
    // 기체 확인 도구가 나타남
    if (EZ.tubes[0].V >= 4 && EZ.tubes[1].V >= 4 && (EZ.toolsOn || (game && game.free)) && !EZ.toolsEver) { EZ.toolsEver = true; EZ.toolsNewAt = EZ.t; }
    const want = (EZ.toolsOn || (game && game.free)) && EZ.toolsEver ? 1 : 0;
    EZ.toolsShown = SciSim.approach(EZ.toolsShown, want, dt, 5);
    if (Math.abs(EZ.toolsShown - want) < 0.003) EZ.toolsShown = want;
    // 도구 스프링 복귀
    EZ.tools.forEach((t) => {
      if (!t.hold && !(EZ.test && EZ.test.tool === t.id)) {
        t.x = SciSim.approach(t.x, TOOLS_HOME[t.id].x, dt, 12);
        t.y = SciSim.approach(t.y, TOOLS_HOME[t.id].y, dt, 12);
      }
      t.lift = SciSim.approach(t.lift, t.hold ? 1 : 0, dt, 18);
    });
    if (EZ.test) testUpdate(dt);
  }

  /* ---------- 기체 확인 연출 (시간 t의 함수) ---------- */
  function startTest(ti, toolId, from) {
    const tb = EZ.tubes[ti];
    if (EZ.test) return;
    if (tb.V < 4) {
      say(tb.x, 190, '기체를 더 모아요! (전원을 켜 두면 기체가 모여요)', { below: false });
      return;
    }
    const kind = ti === 0 ? (toolId === 'match' ? 'pop' : 'dim') : (toolId === 'incense' ? 'relight' : 'bright');
    const dur = { pop: 3.5, relight: 4.5, bright: 3.2, dim: 3.2 }[kind];
    EZ.test = { ti, tool: toolId, kind, t: 0, dur, from: { x: from.x, y: from.y }, flags: {} };
    hideHint();
  }
  const mouthLifted = () => TUBE.mouthY - LIFT;     // 들어 올린 뒤 입구의 y (입구가 아래일 때)
  function testPose(tt) {
    const k = tt.kind, t = tt.t, P = { lift: 0, flip: 0, thumb: 0, thumbA: 0, tool: null, flame: 0, ember: 0.35, water: 1, pop: 0 };
    const up = (t0, t1) => ease.outCubic(seg(t, t0, t1));
    const back = (t0, t1) => ease.inOutCubic(seg(t, t0, t1));
    const x = EZ.tubes[tt.ti].x;
    if (k === 'pop' || k === 'bright' || k === 'dim') {
      const tEnd = tt.dur - 0.7;
      P.lift = LIFT * (up(0, 0.6) - back(tEnd, tt.dur));
      P.thumbA = 1; P.thumb = 0;
      const thumbOut = k === 'pop' ? 1.25 : 1.2;
      P.thumb = ease.outCubic(seg(t, thumbOut, thumbOut + 0.2)) * 44;
      P.thumbA = 1 - seg(t, thumbOut + 0.1, thumbOut + 0.3);
      P.water = 1 - seg(t, 0.15, 0.55) + seg(t, tEnd + 0.1, tt.dur);
      // 도구: 입구 아래로 접근
      const mY = TUBE.mouthY - P.lift;
      const tx = x, ty = tt.tool === 'match' ? mY + 28 : mY - 12;
      const a = ease.inOutCubic(seg(t, 0.6, 1.15)), b = ease.inCubic(seg(t, tEnd - 0.1, tEnd + 0.35));
      const fx = lerp(tt.from.x, tx, a), fy = lerp(tt.from.y, ty, a);
      P.tool = { x: lerp(fx, TOOLS_HOME[tt.tool].x, b), y: lerp(fy, TOOLS_HOME[tt.tool].y, b) };
      if (tt.tool === 'match') {
        const since = t - 1.25;
        P.flame = 1;
        if (k === 'bright') P.flame = 1 + 0.9 * Math.sin(Math.PI * seg(t, 1.2, 2.2));
      } else {
        P.ember = k === 'dim' ? lerp(0.35, 0.08, seg(t, 1.2, 1.9)) : 0.35;
      }
      if (k === 'pop') P.pop = t - 1.25;
    } else if (k === 'relight') {
      const tEnd = tt.dur - 0.9;
      P.lift = LIFT * (up(0, 0.6) - back(tEnd, tt.dur));
      P.flip = ease.inOutCubic(seg(t, 0.6, 1.15)) - ease.inOutCubic(seg(t, tEnd, tt.dur));
      P.thumbA = 1 - seg(t, 1.85, 2.05); P.thumb = ease.outCubic(seg(t, 1.85, 2.05)) * 44;
      P.water = 1 - seg(t, 0.15, 0.55) + seg(t, tEnd + 0.1, tt.dur);
      // 뒤집힌 시험관의 입구: 위쪽 (x, cy - 100 - lift)
      const cyL = TUBE.cy - LIFT;
      const mouthUp = cyL - 100;
      const a = ease.inOutCubic(seg(t, 1.1, 1.75)), b = ease.inCubic(seg(t, tEnd - 0.2, tEnd + 0.1));
      // 향불 막대는 아래쪽이 불씨. 입구 안쪽(아래로 40px)까지 넣는다.
      const tx = x, ty = mouthUp + 62;
      const sx = tt.from.x, sy = tt.from.y;
      const fx = lerp(sx, tx, a), fy = lerp(sy, ty - 30 * (1 - a), a);
      P.tool = { x: lerp(fx, TOOLS_HOME[tt.tool].x, b), y: lerp(fy, TOOLS_HOME[tt.tool].y, b), rot: Math.PI * (ease.inOutCubic(seg(t, 0.9, 1.5)) - ease.inOutCubic(seg(t, tEnd - 0.2, tEnd + 0.1))) };
      P.ember = 0.35 + 0.65 * ease.outCubic(seg(t, 1.9, 2.3));
      P.flame = ease.outBack(seg(t, 1.9, 2.4)) * (1 - 0.5 * seg(t, tEnd - 0.2, tEnd + 0.1));
    }
    return P;
  }
  function testUpdate(dt) {
    const tt = EZ.test;
    tt.t += dt;
    const tb = EZ.tubes[tt.ti], P = testPose(tt), fl = tt.flags;
    tb.lift = P.lift; tb.flip = P.flip; tb.water = P.water;
    EZ.testPose = P;
    const mY = TUBE.mouthY - P.lift;
    if (tt.kind === 'pop' && !fl.pop && tt.t >= 1.25) {
      fl.pop = true; sfx.pop();
      for (let i = 0; i < (RM ? 7 : 16); i++) { const a = rand(0, TAU), s = rand(60, 170); FX.emit({ x: tb.x, y: mY + 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.5), size: rand(2, 4), color: i % 2 ? '#ffb347' : '#8ec5ff', drag: 3, shape: 'circle' }); }
    }
    if (tt.kind === 'pop' && !fl.drip && tt.t >= 0.2) {
      fl.drip = true;
      for (let i = 0; i < (RM ? 4 : 9); i++) FX.emit({ x: tb.x + rand(-18, 18), y: TUBE.mouthY - 70, vx: rand(-14, 14), vy: rand(10, 60), life: 0.7, size: rand(1.4, 2.4), color: '#9fd0ff', gravity: 520, shape: 'circle' });
    }
    if (tt.kind === 'relight' && !fl.relight && tt.t >= 1.9) {
      fl.relight = true; sfx.whoosh();
      for (let i = 0; i < (RM ? 6 : 14); i++) FX.emit({ x: tb.x + rand(-6, 6), y: P.tool ? P.tool.y + 20 : 100, vx: rand(-60, 60), vy: rand(-110, -30), life: rand(0.5, 1), size: rand(1.6, 3), color: i % 2 ? '#ffe27a' : '#ffb347', gravity: 120, shape: 'circle' });
    }
    if (tt.kind === 'bright' && !fl.br && tt.t >= 1.3) { fl.br = true; sfx.fizz(); }
    if (!fl.chip && tt.t >= (tt.kind === 'relight' ? 2.7 : 1.8)) {
      fl.chip = true;
      const msg = { pop: '퍽 소리를 내며 탐', relight: '불씨가 다시 타오름', bright: '조금 더 밝게 탐', dim: '불씨가 어두워짐' }[tt.kind];
      EZ.log.push({ ti: tt.ti, kind: tt.kind, msg });
      EZ.rec[tt.ti][tt.tool] = msg; EZ.recFlash[tt.ti] = 1.6;
      if (tt.kind === 'pop') { EZ.found.H = true; tb.name = '수소'; }
      if (tt.kind === 'relight') { EZ.found.O = true; tb.name = '산소'; }
      if (tt.kind === 'pop' || tt.kind === 'relight') { Sound.success(); okFx(tb.x, 120, COL.good, true); }
    }
    if (tt.t >= tt.dur) {
      EZ.test = null; EZ.testPose = null;
      tb.lift = 0; tb.flip = 0; tb.water = 1; tb.V = 0; tb.Vd = 0; tb.acc = 0;
      tb.boost = EZ.power ? 10 : 0;               // 전원이 켜져 있으면 3배 빠르게 다시 모인다
      tb.ripple = [];
      const t = EZ.tools.find((q) => q.id === tt.tool); if (t) { t.x = TOOLS_HOME[t.id].x; t.y = TOOLS_HOME[t.id].y; }
      for (let i = 0; i < 6; i++) EZ.ripples.push({ x: tb.x + rand(-20, 20), y: WATER_Y + 1, t: rand(0, 0.2), small: false });
    }
  }

  /* ---------- 그리기 ---------- */
  function drawBubbleDot(x, y, r) {
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.strokeStyle = 'rgba(70,130,200,.75)'; ctx.lineWidth = Math.max(0.8, r * 0.28);
    circle(ctx, x, y, r); ctx.fill(); ctx.stroke();
    if (r > 1.4) { ctx.fillStyle = 'rgba(255,255,255,.95)'; circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.28); ctx.fill(); }
  }
  function tubePath(x, top, w, bottom) {
    ctx.beginPath(); ctx.moveTo(x - w / 2, bottom); ctx.lineTo(x - w / 2, top + w / 2); ctx.arc(x, top + w / 2, w / 2, Math.PI, 0, false); ctx.lineTo(x + w / 2, bottom);
  }
  function drawTube(i) {
    const tb = EZ.tubes[i], x = tb.x, w = TUBE.w, top = TUBE.topY, bot = TUBE.mouthY;
    const lifted = tb.lift > 0.5 || tb.flip > 0;
    ctx.save();
    if (lifted) {
      const cyL = TUBE.cy - tb.lift;
      ctx.translate(x, cyL); ctx.rotate(tb.flip * Math.PI); ctx.translate(-x, -TUBE.cy);
    }
    const men = TUBE.scaleTop + tb.Vd * TUBE.pxMl;
    // 안쪽: 기체(위)와 물(아래)
    ctx.save();
    tubePath(x, top + 2, w - 4, bot); ctx.closePath(); ctx.clip();
    // 기체층
    const gg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gg.addColorStop(0, 'rgba(235,242,252,.55)'); gg.addColorStop(0.5, 'rgba(250,252,255,.7)'); gg.addColorStop(1, 'rgba(225,235,250,.5)');
    ctx.fillStyle = gg; ctx.fillRect(x - w / 2, top, w, men - top + 3);
    // 물
    if (tb.water > 0.01) {
      ctx.globalAlpha = tb.water;
      const wy = men;
      const wg = ctx.createLinearGradient(0, wy, 0, bot);
      wg.addColorStop(0, '#d2e9ff'); wg.addColorStop(1, '#a9d3f7');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.moveTo(x - w / 2 - 2, wy - 3); ctx.quadraticCurveTo(x, wy + 6, x + w / 2 + 2, wy - 3); ctx.lineTo(x + w / 2 + 2, bot + 2); ctx.lineTo(x - w / 2 - 2, bot + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 1, wy - 2); ctx.quadraticCurveTo(x, wy + 4.5, x + w / 2 - 1, wy - 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 유리
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const gl = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gl.addColorStop(0, 'rgba(150,178,212,.55)'); gl.addColorStop(0.2, 'rgba(225,238,255,.18)'); gl.addColorStop(0.8, 'rgba(225,238,255,.14)'); gl.addColorStop(1, 'rgba(140,170,210,.55)');
    tubePath(x, top, w, bot); ctx.lineTo(x + w / 2 - 3.5, bot); ctx.lineTo(x + w / 2 - 3.5, top + w / 2); ctx.arc(x, top + w / 2, w / 2 - 3.5, 0, Math.PI, true); ctx.lineTo(x - w / 2 + 3.5, bot); ctx.closePath();
    ctx.fillStyle = gl; ctx.fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.6; tubePath(x, top, w, bot); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 8, top + 26); ctx.lineTo(x - w / 2 + 8, bot - 30); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w / 2 - 7, top + 30); ctx.lineTo(x + w / 2 - 7, bot - 40); ctx.stroke();
    // 눈금 (0 ~ 20 mL, 2 mL마다)
    ctx.strokeStyle = 'rgba(70,86,110,.65)'; ctx.lineWidth = 1.3; ctx.fillStyle = 'rgba(55,70,95,.9)';
    ctx.font = D.font(12, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let m = 0; m <= 20; m += 2) {
      const yy = TUBE.scaleTop + m * TUBE.pxMl, major = m % 10 === 0;
      ctx.beginPath(); ctx.moveTo(x + w / 2 - 2, yy); ctx.lineTo(x + w / 2 + (major ? 9 : 5), yy); ctx.stroke();
      if (major && Math.abs(tb.flip) < 0.05) ctx.fillText(String(m), x + w / 2 + 12, yy);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    // 엄지 (입구를 막는 손가락)
    if (lifted && EZ.testPose && EZ.testPose.thumbA > 0.01) {
      const tp = EZ.testPose;
      ctx.save(); ctx.globalAlpha = tp.thumbA;
      const tx = x + tp.thumb, ty = bot + 3;
      const g = ctx.createLinearGradient(0, ty - 8, 0, ty + 10);
      g.addColorStop(0, '#ffd9b8'); g.addColorStop(1, '#f1b189');
      ctx.fillStyle = g; D.roundRect(tx - 24, ty - 7, 48, 17, 9); ctx.fill();
      ctx.strokeStyle = 'rgba(160,90,50,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function drawElectrodes() {
    TX.forEach((x, i) => {
      const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
      g.addColorStop(0, '#8a93a3'); g.addColorStop(0.45, '#cfd5df'); g.addColorStop(1, '#5d6676');
      ctx.fillStyle = g; D.roundRect(x - 4, 392, 8, 46, 3); ctx.fill();
      ctx.fillStyle = '#3f4652'; D.roundRect(x - 10, 428, 20, 10, 4); ctx.fill();
    });
  }
  function drawWires() {
    const clr = ['#262a33', '#d6343a'];
    WIRES.forEach((w, i) => {
      const [a, b, c, d] = w;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(60,40,20,.28)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(a[0] + 2, a[1] + 4); ctx.bezierCurveTo(b[0] + 2, b[1] + 4, c[0] + 2, c[1] + 4, d[0] + 2, d[1] + 4); ctx.stroke();
      ctx.strokeStyle = clr[i]; ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.bezierCurveTo(b[0], b[1], c[0], c[1], d[0], d[1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(a[0] - 1.2, a[1]); ctx.bezierCurveTo(b[0] - 1.2, b[1] - 1.2, c[0] - 1.2, c[1] - 1.2, d[0] - 1.2, d[1]); ctx.stroke();
      ctx.restore();
    });
    // 전류가 흐르는 모습 (+ 단자 → (+)극, (−)극 → − 단자)
    if (EZ.led > 0.05) {
      WIRES.forEach((w, i) => {
        const [a, b, c, d] = w, n = 9;
        for (let k = 0; k < n; k++) {
          let u = ((EZ.flow * 0.42 + k / n) % 1);
          if (i === 1) u = 1 - u;                 // 빨간 선: 단자에서 전극 쪽으로 (u를 거꾸로)
          if (i === 0) u = u;                     // 검은 선: 전극에서 단자 쪽으로
          const m = 1 - u;
          const x = m * m * m * a[0] + 3 * m * m * u * b[0] + 3 * m * u * u * c[0] + u * u * u * d[0];
          const y = m * m * m * a[1] + 3 * m * m * u * b[1] + 3 * m * u * u * c[1] + u * u * u * d[1];
          ctx.fillStyle = 'rgba(255,224,102,' + (0.9 * EZ.led).toFixed(2) + ')'; circle(ctx, x, y, 2.6); ctx.fill();
        }
      });
    }
  }
  function drawPSU() {
    const P = PSU;
    panel(P.x, P.y, P.w, P.h, 16, '#3a414e', 16, 6, 'rgba(20,24,40,.4)');
    ctx.save(); D.roundRect(P.x, P.y, P.w, P.h, 16); ctx.clip();
    vgrad(ctx, P.x, P.y, P.w, P.h, '#667084', '#353c49');
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(P.x, P.y, P.w, 7);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(P.x, P.y + P.h - 22, P.w, 22);
    ctx.restore();
    txt('직류 전원 장치', P.x + P.w / 2, P.y + 28, 14, '#eef2f8', 'center', 800);
    // LED
    const lx = P.x + 30, ly = P.y + 62;
    if (EZ.led > 0.02) D.glow(lx, ly, 26, '#4ade80', 0.65 * EZ.led);
    ctx.fillStyle = mix('#1d4d2d', '#7dff9f', EZ.led); circle(ctx, lx, ly, 7.5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; circle(ctx, lx - 2.3, ly - 2.5, 2); ctx.fill();
    txt(EZ.power ? 'ON' : 'OFF', lx + 16, ly + 5, 13, EZ.power ? '#9bf0b4' : '#9aa5b6', 'left', 800);
    // 큰 스위치
    const S1 = SWR, on1 = EZ.knob;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; D.roundRect(S1.x - 3, S1.y - 3, S1.w + 6, S1.h + 6, 22); ctx.fill();
    ctx.fillStyle = mix('#59616f', '#22c55e', on1); D.roundRect(S1.x, S1.y, S1.w, S1.h, 20); ctx.fill();
    const kx = S1.x + 20 + on1 * (S1.w - 40), ky = S1.y + S1.h / 2;
    D.sphere(kx, ky, 16, '#f5f7fb', { dark: '#aab4c3', light: '#fff' });
    txt(on1 > 0.5 ? 'ON' : 'OFF', S1.x + (on1 > 0.5 ? 20 : S1.w - 20), S1.y + S1.h / 2 + 5, 12, 'rgba(255,255,255,.9)', 'center', 800);
    // 단자
    TERM.forEach((tm) => {
      txt(tm.lab, tm.x, tm.y - 16, 17, tm.lab === '+' ? '#ff9ea1' : '#c9d1de', 'center', 800);
      D.sphere(tm.x, tm.y, 11, tm.c, { dark: '#111', gloss: false });
      ctx.fillStyle = '#0d0f14'; circle(ctx, tm.x, tm.y, 4.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; circle(ctx, tm.x - 4, tm.y - 4, 2); ctx.fill();
    });
    focusRing({ x: SWR.x, y: SWR.y, w: SWR.w, h: SWR.h }, 'power', 20);
  }
  /* 성냥 · 향 아이콘: (x, y) = 불이 붙은 끝(성냥 머리 · 향의 불씨). o: {lift, flame, ember, rot(라디안, 불씨 기준), seed} */
  function drawToolIcon(id, x, y, o) {
    o = o || {};
    const sc = 1 + (o.lift || 0) * 0.1, rot = o.rot || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (o.lift > 0.05 && !rot) { ctx.fillStyle = 'rgba(30,40,70,' + (0.16 * o.lift).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(8 * o.lift, 56, 18, 4.5, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.rotate(rot);
    if (id === 'match') {
      // 나무 성냥개비 (머리 = 불꽃이 붙는 끝)
      const g = ctx.createLinearGradient(-3, 0, 3, 0); g.addColorStop(0, '#e8c48a'); g.addColorStop(1, '#b98a52');
      ctx.fillStyle = g; D.roundRect(-3, -2, 6, 54, 2.5); ctx.fill();
      D.sphere(0, -3, 6.4, '#c0392b', { dark: '#6b1d14', light: '#ff9d86' });
    } else {
      // 향: 가는 막대 + 불씨
      const g = ctx.createLinearGradient(-2, 0, 2, 0); g.addColorStop(0, '#9a6b3e'); g.addColorStop(1, '#6e4724');
      ctx.fillStyle = g; D.roundRect(-2, 0, 4, 62, 2); ctx.fill();
      const em = o.ember != null ? o.ember : 0.35;
      ctx.fillStyle = '#4a3a30'; D.roundRect(-2.6, -5, 5.2, 9, 2); ctx.fill();
      D.glow(0, -3, 10 + em * 22, mix('#ff7a1a', '#ffe27a', em), 0.3 + em * 0.6);
      ctx.fillStyle = mix('#7a2a0c', '#fff0a0', em); circle(ctx, 0, -3, 3 + em * 2.2); ctx.fill();
    }
    ctx.restore();
    // 불꽃과 연기는 항상 위로 (회전하지 않음)
    if (id === 'match') {
      const f = o.flame != null ? o.flame : 1;
      if (f > 0.02) D.flame(0, -8, 26 * f, now() + (o.seed || 0));
    } else {
      const em = o.ember != null ? o.ember : 0.35;
      if (em > 0.45 && (o.flame || 0) > 0.05) D.flame(0, -4, 34 * o.flame, now(), { glow: '#ffd27a' });
      if (!rot) {
        ctx.strokeStyle = 'rgba(150,155,170,' + (0.5 * (1 - em * 0.5)).toFixed(2) + ')'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const yy = -8 - k * 5, xx = Math.sin(now() * 2.2 + k * 0.7) * (2 + k * 0.5); k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  const TRAY = { x: 18, y: 292, w: 172, h: 148 };
  function drawToolsTray() {
    const k = EZ.toolsShown;
    if (k < 0.01) return;
    const slide = (1 - ease.outBack(Math.min(1, k))) * 110;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.translate(0, slide);
    const R = TRAY;
    panel(R.x, R.y, R.w, R.h, 16, 'rgba(255,255,255,.94)', 12, 4);
    txt('기체 확인 도구', R.x + R.w / 2, R.y + 22, 14, COL.muted, 'center', 800);
    if (EZ.t - EZ.toolsNewAt < 6 && EZ.toolsNewAt > 0) ringRect(R, 16);
    txt('성냥불', TOOLS_HOME.match.x, R.y + 44, 13.5, COL.ink, 'center', 800);
    txt('꺼져 가는', TOOLS_HOME.incense.x, R.y + 44, 13.5, COL.ink, 'center', 800);
    txt('향불', TOOLS_HOME.incense.x, R.y + 60, 13.5, COL.ink, 'center', 800);
    ctx.restore();
    // 도구 (트레이 위에서)
    EZ.tools.forEach((t) => {
      if (EZ.test && EZ.test.tool === t.id) return;
      const homeish = !t.hold && Math.hypot(t.x - TOOLS_HOME[t.id].x, t.y - TOOLS_HOME[t.id].y) < 3;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.6);
      if (homeish) ctx.translate(0, slide);
      drawToolIcon(t.id, t.x, t.y, { lift: t.lift, flame: t.id === 'match' ? 1 : 0, ember: 0.35, seed: t.id === 'match' ? 0 : 3 });
      ctx.restore();
    });
  }
  function drawTestTool() {
    const tt = EZ.test, P = EZ.testPose;
    if (!tt || !P || !P.tool) return;
    if (tt.tool === 'match') drawToolIcon('match', P.tool.x, P.tool.y, { flame: P.flame, lift: 1 });
    else drawToolIcon('incense', P.tool.x, P.tool.y, { ember: P.ember, flame: P.flame, lift: 1, rot: P.tool.rot || 0 });
  }
  /* 관찰 기록 카드 (오른쪽 위) */
  const REC = { x: 552, y: 22, w: 238, h: 206 };
  function drawRecord(dt) {
    const k = EZ.recShown = SciSim.approach(EZ.recShown, EZ.toolsShown > 0.9 ? 1 : 0, dt, 6);
    if (k < 0.01) return;
    EZ.recFlash = EZ.recFlash.map((v) => Math.max(0, v - dt));
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.5); ctx.translate((1 - ease.outBack(Math.min(1, k))) * 120, 0);
    const R = REC;
    panel(R.x, R.y, R.w, R.h, 16, 'rgba(255,255,255,.95)', 12, 4);
    txt('📋 관찰 기록', R.x + 14, R.y + 26, 15, COL.ink, 'left', 800);
    const rows = [
      { ti: 0, head: '(−)극 기체', c: COL.neg, notes: [['match', '성냥불'], ['incense', '향불']] },
      { ti: 1, head: '(+)극 기체', c: COL.pos, notes: [['match', '성냥불'], ['incense', '향불']] },
    ];
    rows.forEach((row, ri) => {
      const y0 = R.y + 42 + ri * 80, tb = EZ.tubes[row.ti], fl = EZ.recFlash[row.ti];
      if (fl > 0) { ctx.fillStyle = 'rgba(255,214,102,' + (0.45 * Math.min(1, fl)).toFixed(2) + ')'; D.roundRect(R.x + 6, y0 - 4, R.w - 12, 74, 10); ctx.fill(); }
      ctx.fillStyle = row.c; D.roundRect(R.x + 14, y0, 6, 66, 3); ctx.fill();
      txt(row.head + ': ', R.x + 28, y0 + 16, 14, COL.ink, 'left', 800);
      ctx.save(); ctx.font = D.font(14, 800); const hw = ctx.measureText(row.head + ': ').width; ctx.restore();
      txt(tb.name || '?', R.x + 28 + hw, y0 + 16, 15, tb.name ? '#0f8a4b' : '#9aa5b6', 'left', 800);
      row.notes.forEach((n, ni) => {
        const m = EZ.rec[row.ti][n[0]];
        const good = m && ((row.ti === 0 && n[0] === 'match') || (row.ti === 1 && n[0] === 'incense'));
        const line = n[1] + ': ' + (m || '아직 안 해 봤어요');
        const lines = wrapText(line, R.w - 46, good ? 13.5 : 12.5, 700);
        txt(lines[0], R.x + 28, y0 + 36 + ni * 17, good ? 13.5 : 12.5, good ? '#0b6b39' : (m ? '#6b7486' : '#b0b9c8'), 'left', good ? 800 : 700);
        if (lines[1]) txt(lines[1], R.x + 28, y0 + 36 + ni * 17 + 14, 12.5, '#6b7486', 'left', 700);
      });
    });
    ctx.restore();
  }
  function drawTestFx() {
    const tt = EZ.test, P = EZ.testPose;
    if (!tt || !P) return;
    const tb = EZ.tubes[tt.ti], mY = TUBE.mouthY - P.lift;
    if (tt.kind === 'pop' && P.pop >= 0 && P.pop < 0.9) {
      const q = P.pop;
      // 섬광
      const fr = lerp(0, 40, Math.min(1, q / 0.18)), fa = 1 - seg(q, 0.12, 0.4);
      if (fa > 0) {
        D.glow(tb.x, mY + 8, fr * 1.5 + 8, '#ffb347', 0.9 * fa);
        D.glow(tb.x, mY + 8, fr * 1.0 + 4, '#8ec5ff', 0.8 * fa);
        D.glow(tb.x, mY + 8, fr * 0.5, '#ffffff', 0.95 * fa);
      }
      // 충격파 링
      if (q < 0.6) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - q / 0.6)).toFixed(2) + ')'; ctx.lineWidth = 3; circle(ctx, tb.x, mY + 8, 12 + ease.outCubic(q / 0.6) * 70); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,170,60,' + (0.6 * (1 - q / 0.6)).toFixed(2) + ')'; ctx.lineWidth = 2; circle(ctx, tb.x, mY + 8, 8 + ease.outCubic(q / 0.6) * 50); ctx.stroke(); }
      // 말풍선 '퍽!'
      if (q > 0.04 && q < 0.85) {
        const s = q < 0.16 ? q / 0.16 * 1.25 : q < 0.28 ? 1.25 - 0.25 * ((q - 0.16) / 0.12) : 1;
        const a = q > 0.6 ? 1 - (q - 0.6) / 0.25 : 1;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(tb.x + 56, mY + 40); ctx.scale(s, s); ctx.rotate(-0.08);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k < 16; k++) { const a2 = (k / 16) * TAU, rr = k % 2 ? 24 : 34; ctx.lineTo(Math.cos(a2) * rr * 1.25, Math.sin(a2) * rr * 0.9); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        txt('퍽!', 0, 8, 26, '#e0561a', 'center', 800);
        ctx.restore();
      }
    }
    if (tt.kind === 'relight' && tt.t > 1.9 && tt.t < 3.2) {
      const q = tt.t - 1.9;
      D.glow(tb.x, P.tool.y - 6, 40 + 18 * Math.sin(q * 9), '#ffe27a', 0.45 * Math.min(1, q * 3));
    }
  }
  function drawLabels() {
    EZ.tubes.forEach((tb, i) => {
      if (tb.lift > 4) return;
      const polar = i === 0 ? '(−)극' : '(+)극';
      D.label(tb.x, 150, polar + (tb.name ? ' · ' + tb.name : ''), { bg: i === 0 ? COL.neg : COL.pos, size: 14, pad: 10 });
      const vtxt = (Math.round(tb.Vd * 10) / 10).toFixed(1) + ' mL';
      D.label(tb.x, 178, vtxt, { bg: '#ffffff', color: COL.ink, border: '#c9d4e6', size: 14, pad: 10 });
    });
  }
  SC.electro = {
    label: '⚡ 물에 전기를 흘려 보내요',
    hint: '🥽 보안경을 쓰고 ⚡ 전원을 켜 보세요',
    enter() { refreshElectroUI(); },
    update(dt) { ezUpdate(dt); },
    draw(t, dt) {
      wall();
      // 왼쪽 위 메모 + 보안경
      const gx = 30, gy = 30;
      if (EZ.goggles && (!EZ.gogFly || EZ.gogFly.done)) {
        D.label(gx + 52, gy, '보안경 착용', { bg: '#e8f6ee', color: '#0b6b39', border: '#9fd9b8', size: 13, pad: 10, align: 'left' });
        drawGoggles(gx + 6, gy, 0.9, 1);
      } else if (!EZ.goggles) {
        const sh = EZ.shakeGog > 0 ? Math.sin(EZ.shakeGog * 50) * 4 : 0;
        ctx.save(); ctx.translate(sh, 0); ctx.setLineDash([5, 4]);
        D.label(gx + 52, gy, '보안경 쓰기', { bg: '#fff', color: EZ.shakeGog > 0 ? COL.bad : COL.muted, border: EZ.shakeGog > 0 ? COL.bad : '#b6c1d4', size: 13, pad: 10, align: 'left' });
        ctx.setLineDash([]); drawGoggles(gx + 6, gy, 0.9, 0.45); ctx.restore();
      }
      if (EZ.gogFly && !EZ.gogFly.done) {
        const q = ease.outCubic(Math.min(1, EZ.gogFly.t / 0.8));
        drawGoggles(lerp(VW - 120, gx + 6, q), lerp(250, gy, q) - Math.sin(q * Math.PI) * 60, lerp(3.2, 0.9, q), 1);
      }
      ctx.fillStyle = 'rgba(255,255,255,.82)'; D.roundRect(16, 62, 176, 70, 12); ctx.fill();
      txt('💧 물에 수산화 나트륨을', 26, 85, 13, COL.muted, 'left', 700);
      txt('조금 녹였어요. 전류가', 26, 103, 13, COL.muted, 'left', 700);
      txt('잘 흐르게 도와줘요.', 26, 121, 13, COL.muted, 'left', 700);
      // 실험대
      bench(0, 440, VW, 90);
      // 수조 뒤쪽 유리
      const T = TROUGH;
      groundShadow(T.x + T.w / 2, T.y + T.h + 6, T.w / 2 + 14, 9, 1);
      ctx.fillStyle = 'rgba(214,230,250,.28)'; D.roundRect(T.x, T.y, T.w, T.h, 12); ctx.fill();
      // 물 (수조 안쪽)
      ctx.save(); D.roundRect(T.x + 3, T.y + 3, T.w - 6, T.h - 6, 10); ctx.clip();
      const wg = ctx.createLinearGradient(0, WATER_Y, 0, T.y + T.h);
      wg.addColorStop(0, 'rgba(227,243,255,.9)'); wg.addColorStop(1, 'rgba(191,224,251,.95)');
      ctx.fillStyle = wg; ctx.fillRect(T.x, WATER_Y, T.w, T.h);
      ctx.restore();
      // 시험관 · 전극
      drawElectrodes();
      EZ.tubes.forEach((tb, i) => { if (tb.lift <= 0.5 && tb.flip <= 0) drawTube(i); });
      // 물 속 기포
      EZ.bubbles.forEach((b) => drawBubbleDot(b.x, b.y, b.r));
      // 물 앞쪽 색 덮기 (물 속 부분이 푸르게 보이도록)
      ctx.save(); D.roundRect(T.x + 3, T.y + 3, T.w - 6, T.h - 6, 10); ctx.clip();
      ctx.fillStyle = 'rgba(120,180,240,.13)'; ctx.fillRect(T.x, WATER_Y, T.w, T.h);
      // 수면 반짝임 2줄
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6;
      for (let l = 0; l < 2; l++) { ctx.beginPath(); for (let x = T.x; x <= T.x + T.w; x += 6) { const yy = WATER_Y + 5 + l * 7 + Math.sin(x * 0.07 + t * (1.2 + l * 0.5) + l) * 1.4; x === T.x ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(T.x, WATER_Y - 1, T.w, 2);
      ctx.restore();
      // 물결 호
      EZ.ripples.forEach((r) => {
        const k = r.t / 0.6;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(2) + ')'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, (r.small ? 4 : 9) + k * (r.small ? 8 : 16), (r.small ? 1.4 : 2.4) + k * 2, 0, 0, TAU); ctx.stroke();
      });
      // 수조 앞 유리 (테두리 · 반사광)
      ctx.save();
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(T.x - 4, T.y - 1); ctx.lineTo(T.x, T.y + 3); ctx.lineTo(T.x, T.y + T.h - 12); ctx.quadraticCurveTo(T.x, T.y + T.h, T.x + 12, T.y + T.h); ctx.lineTo(T.x + T.w - 12, T.y + T.h); ctx.quadraticCurveTo(T.x + T.w, T.y + T.h, T.x + T.w, T.y + T.h - 12); ctx.lineTo(T.x + T.w, T.y + 3); ctx.lineTo(T.x + T.w + 4, T.y - 1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(T.x + 10, T.y + 16); ctx.lineTo(T.x + 10, T.y + T.h - 22); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(T.x + T.w - 9, T.y + 20); ctx.lineTo(T.x + T.w - 9, T.y + T.h - 30); ctx.stroke();
      ctx.restore();
      drawWires();
      drawPSU();
      // 들어 올린 시험관 (앞에 그린다)
      EZ.tubes.forEach((tb, i) => { if (tb.lift > 0.5 || tb.flip > 0) drawTube(i); });
      drawLabels();
      drawRecord(dt);
      drawToolsTray();
      drawTestTool();
      drawTestFx();
      // 끌고 있는 도구
      if (EZ.drag) {
        const q = EZ.drag, tool = EZ.tools.find((x2) => x2.id === q.id);
        const tubeHit = tubeAt(tool);
        if (tubeHit >= 0) {
          const tb = EZ.tubes[tubeHit];
          ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.5 + 0.4 * Math.sin(t * 9)); ctx.lineWidth = 4; D.roundRect(tb.x - 38, TUBE.topY - 12, 76, TUBE.mouthY - TUBE.topY + 28, 22); ctx.stroke(); ctx.restore();
        }
        drawToolIcon(tool.id, tool.x, tool.y, { lift: tool.lift, flame: tool.id === 'match' ? 1 : 0, ember: 0.35 });
      }
    },
    hover(p) {
      if (EZ.toolsShown > 0.9 && !EZ.test) for (const t of EZ.tools) if (Math.hypot(p.x - t.x, p.y - (t.y + 20)) < 40) return 'grab';
      if (inRect(p, SWR, 8)) return 'pointer';
      return null;
    },
    down(p) {
      if (inRect(p, SWR, 10)) { setPower(!EZ.power); return false; }
      if (!EZ.test && EZ.toolsShown > 0.9) {
        for (const t of EZ.tools) {
          if (Math.hypot(p.x - t.x, p.y - (t.y + 20)) < 42) {
            EZ.drag = { id: t.id, ox: clamp(t.x - p.x, -10, 10), oy: Math.min(t.y - p.y, -34) }; t.hold = true; sfx.glug();
            return true;
          }
        }
      }
      return false;
    },
    move(p) {
      if (!EZ.drag) return;
      const t = EZ.tools.find((x) => x.id === EZ.drag.id);
      t.x = clamp(p.x + EZ.drag.ox, 20, 780); t.y = clamp(p.y + EZ.drag.oy, 40, 500);
    },
    up(p) {
      if (!EZ.drag) return;
      const t = EZ.tools.find((x) => x.id === EZ.drag.id);
      EZ.drag = null; t.hold = false;
      const ti = tubeAt(t);
      if (ti >= 0) startTest(ti, t.id, { x: t.x, y: t.y });
    },
  };
  function tubeAt(t) {
    // 도구 끝(성냥 머리 · 불씨)이 시험관 위에 오면 인식
    const tip = { x: t.x, y: t.y };
    for (let i = 0; i < 2; i++) {
      const tb = EZ.tubes[i];
      if (Math.abs(tip.x - tb.x) < 46 && tip.y > TUBE.topY - 40 && tip.y < TUBE.mouthY + 50) return i;
    }
    return -1;
  }
  Object.assign(DBG, { EZ, ezReset, setPower, wearGoggles, startTest, TX, TUBE, LIFT });

  /* =========================================================
     장면 2 · decomp — 분해 장치로 원소와 화합물 가려내기
     ========================================================= */
  const ITEMS = [
    { id: 'h2',   name: '수소',       el: true,  parts: [] },
    { id: 'o2',   name: '산소',       el: true,  parts: [] },
    { id: 'cu',   name: '구리',       el: true,  parts: [] },
    { id: 'h2o',  name: '물',         el: false, parts: ['수소', '산소'], sym: ['H', 'O'], line: '물 → 수소 + 산소', how: '전기 분해 중…' },
    { id: 'nacl', name: '염화 나트륨', el: false, parts: ['나트륨', '염소'], sym: ['Na', 'Cl'], line: '염화 나트륨 → 나트륨 + 염소', how: '녹여서 전기 분해 중…' },
    { id: 'ag2o', name: '산화 은',    el: false, parts: ['은', '산소'], sym: ['Ag', 'O'], line: '산화 은 → 은 + 산소', how: '가열 중…' },
  ];
  const SHELF = { x: 12, y: 40, w: 188, h: 336 };
  const CELL = { w: 80, h: 86 };
  const cellPos = (i) => ({ x: 20 + (i % 2) * 92, y: 78 + Math.floor(i / 2) * 98 });
  const DEV = { x: 232, y: 56, w: 296, h: 352, cx: 380 };
  const DOME = { cx: 380, cy: 214, r: 118, x0: 262, x1: 498, floor: 372 };
  const CHAMBER = { x: 380, y: 332 };
  const LCD = { x: 274, y: 386, w: 212, h: 44 };
  const TRAYR = { x: 274, y: 446, w: 212, h: 62 };
  const BOX = [
    { id: 'el',  x: 566, y: 32,  w: 224, h: 198, name: '원소',   c: '#0ea5a5', soft: '#e2f6f6', meaning: '더 이상 다른 물질로 분해되지 않는, 물질을 이루는 기본 성분', typed: 0, unlocked: false, lid: 0, items: [] },
    { id: 'co',  x: 566, y: 240, w: 224, h: 198, name: '화합물', c: '#f08c2e', soft: '#fff1e1', meaning: '두 가지 이상의 원소가 결합하여 만들어진 물질', typed: 0, unlocked: false, lid: 0, items: [] },
  ];
  const DC = {
    items: ITEMS.map((d, i) => Object.assign({ x: cellPos(i).x + 40, y: cellPos(i).y + 32, hx: cellPos(i).x + 40, hy: cellPos(i).y + 32, s: 1, state: 'shelf', tested: false, box: null, chip: 0, lift: 0, hold: false, badgeT: 0 }, d)),
    run: null, loaded: null, drag: null, last: '', stamp: 0, tray: [], lcd: 0, heat: 0, arcT: 0, arcs: [], bub: [], bubAcc: [0, 0], glowHint: true, hazeT: 0,
  };
  const dcItem = (id) => DC.items.find((q) => q.id === id);
  const SLOT0 = 128;
  function dcReset() {
    DC.run = null; DC.loaded = null; DC.drag = null; DC.last = ''; DC.stamp = 0; DC.tray = []; DC.heat = 0; DC.bub.length = 0; DC.glowHint = true;
    DC.items.forEach((it, i) => { it.state = 'shelf'; it.tested = false; it.box = null; it.chip = 0; it.s = 1; it.hold = false; it.x = it.hx; it.y = it.hy; it.badgeT = 0; });
    BOX.forEach((b) => { b.typed = 0; b.unlocked = false; b.lid = 0; b.items = []; });
    dcRefresh();
  }
  const dcTested = () => DC.items.filter((q) => q.tested).length;
  const dcPlaced = () => DC.items.filter((q) => q.state === 'box' && ((q.el && q.box === 'el') || (!q.el && q.box === 'co'))).length;
  function dcRefresh() {
    const b = $('#decBtn');
    if (b) b.disabled = !DC.loaded || !!DC.run;
    const n = $('#dcNote');
    if (n) n.textContent = DC.run ? '분해를 시도하는 중이에요…' : DC.loaded ? '‘' + DC.loaded.name + '’을(를) 장치에 넣었어요. 눌러 보세요!' : '물질을 장치 위로 끌어 놓아요.';
  }
  function dcStart() {
    if (DC.run || !DC.loaded) return;
    const it = DC.loaded;
    DC.run = { it, t: 0, dur: it.el ? 2.6 : it.id === 'nacl' ? 3.4 : 3.0, flags: {}, prod: [] };
    DC.tray = []; DC.glowHint = false; dcRefresh(); hideHint();
    sfx.zap();
  }
  function dcFinish() {
    const r = DC.run, it = r.it;
    it.tested = true; it.badgeT = 0;
    DC.last = it.el ? it.name + ' → 변화 없음 (분해되지 않음)' : it.line;
    // 첫 원소 · 첫 화합물을 시험하면 상자의 뜻이 펼쳐진다
    const box = BOX[it.el ? 0 : 1];
    if (!box.unlocked) { box.unlocked = true; box.typed = 0; }
    DC.run = null; DC.loaded = null;
    // 시험한 물질은 선반으로 돌아간다
    it.state = 'shelf'; tw(it, { s: 1 }, 0.4, 'outBack');
    dcRefresh();
  }
  function dcPutBack(it) { it.state = 'shelf'; if (DC.loaded === it) DC.loaded = null; tw(it, { s: 1 }, 0.4, 'outBack'); dcRefresh(); }

  /* ---------- 물질 아이콘 (80 × 60 안에 들어오는 크기) ---------- */
  function cube(x, y, s, top, left, right, alpha) {
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.87, y - s * 0.5); ctx.lineTo(x, y); ctx.lineTo(x - s * 0.87, y - s * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = left; ctx.beginPath(); ctx.moveTo(x - s * 0.87, y - s * 0.5); ctx.lineTo(x, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.87, y + s * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = right; ctx.beginPath(); ctx.moveTo(x + s * 0.87, y - s * 0.5); ctx.lineTo(x, y); ctx.lineTo(x, y + s); ctx.lineTo(x + s * 0.87, y + s * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function bottleIcon(stopper, t) {
    const path = () => { ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(-7, -12); ctx.quadraticCurveTo(-18, -10, -18, 2); ctx.lineTo(-18, 18); ctx.quadraticCurveTo(-18, 28, -8, 28); ctx.lineTo(8, 28); ctx.quadraticCurveTo(18, 28, 18, 18); ctx.lineTo(18, 2); ctx.quadraticCurveTo(18, -10, 7, -12); ctx.lineTo(7, -26); };
    ctx.save(); path(); ctx.closePath();
    const g = ctx.createLinearGradient(-18, 0, 18, 0); g.addColorStop(0, 'rgba(165,195,230,.6)'); g.addColorStop(0.25, 'rgba(235,245,255,.5)'); g.addColorStop(1, 'rgba(165,195,230,.55)');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(120,150,200,.35)'; ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let i = 0; i <= 10; i++) { const yy = 24 - i * 3.4 - k * 2, xx = -10 + k * 10 + Math.sin(t * 1.6 + i * 0.7 + k * 2) * 3.4; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    ctx.restore();
    ctx.save(); path(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-13, 2); ctx.lineTo(-13, 20); ctx.stroke();
    ctx.restore();
    if (stopper) { const g2 = ctx.createLinearGradient(-8, 0, 8, 0); g2.addColorStop(0, '#d9a066'); g2.addColorStop(1, '#a8703a'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(-6, -27); ctx.lineTo(6, -27); ctx.lineTo(8, -34); ctx.lineTo(-8, -34); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(90,50,10,.4)'; ctx.lineWidth = 1; ctx.stroke(); }
    else { ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-9, -26); ctx.lineTo(9, -26); ctx.stroke(); }
  }
  /* o: {heat 0~1, melt 0~1, silver 0~1, t} */
  function drawItemIcon(id, cx, cy, s, o) {
    o = o || {};
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    if (id === 'h2') bottleIcon(true, o.t || 0);
    else if (id === 'o2') bottleIcon(false, (o.t || 0) + 1.3);
    else if (id === 'cu') {
      const pts = [[-26, 8], [-15, -12], [5, -19], [25, -8], [27, 12], [9, 23], [-15, 21]];
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      const g = ctx.createLinearGradient(-26, -19, 27, 23);
      const h = o.heat || 0;
      g.addColorStop(0, mix('#f0b27a', '#ffb066', h)); g.addColorStop(0.5, mix('#c9733a', '#ff5a1f', h)); g.addColorStop(1, mix('#8a4320', '#c8280c', h));
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(90,40,10,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-15, -12); ctx.lineTo(5, -19); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-26, 8); ctx.moveTo(-4, -4); ctx.lineTo(9, 23); ctx.stroke();
      if (h > 0.05) { ctx.restore(); ctx.save(); D.glow(cx, cy, 44 * s, '#ff6a2a', 0.5 * h); ctx.translate(cx, cy); ctx.scale(s, s); }
    } else if (id === 'h2o') {
      D.beaker(-20, -24, 40, 46, { level: 0.62, liquid: '#7cc4ff', t: o.t || 0, wave: 1.3 });
    } else if (id === 'nacl') {
      const m = o.melt || 0, glowK = o.heat || 0;
      if (m < 0.98) {
        const sc = 1 - m * 0.5, dy = m * 10;
        const top = mix('#ffffff', '#ff9a6a', glowK), left = mix('#e4e9f2', '#e8683a', glowK), right = mix('#cdd5e3', '#c8451f', glowK);
        cube(-14, 6 + dy, 15 * sc, top, left, right, 1 - m * 0.9);
        cube(13, 8 + dy, 14 * sc, top, left, right, 1 - m * 0.9);
        cube(0, -6 + dy, 15 * sc, top, left, right, 1 - m * 0.9);
      }
      if (m > 0.02) {
        const g = ctx.createRadialGradient(0, 18, 2, 0, 18, (o.wide ? 100 : 34) * m);
        g.addColorStop(0, '#ffe2b8'); g.addColorStop(0.6, '#ff9a4a'); g.addColorStop(1, 'rgba(255,90,40,.15)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 18, (o.wide ? 100 : 32) * m, 9 * m, 0, 0, TAU); ctx.fill();
      }
    } else if (id === 'ag2o') {
      ctx.fillStyle = '#f4f6fa'; ctx.strokeStyle = '#b8c2d2'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 16, 30, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
      const sv = o.silver || 0;
      const g = ctx.createLinearGradient(0, -14, 0, 18);
      g.addColorStop(0, mix('#4b3a30', '#f3f5f8', sv)); g.addColorStop(1, mix('#2b211c', '#aab3c0', sv));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-24, 15); ctx.quadraticCurveTo(-12, -14, 0, -15); ctx.quadraticCurveTo(12, -14, 24, 15); ctx.quadraticCurveTo(0, 22, -24, 15); ctx.closePath(); ctx.fill();
      if (sv > 0.1) { for (let k = 0; k < 4; k++) { const ph = (o.t || 0) * 3 + k * 1.7, a = 0.5 + 0.5 * Math.sin(ph); ctx.fillStyle = 'rgba(255,255,255,' + (a * sv).toFixed(2) + ')'; const px = -14 + k * 9, py = -4 + (k % 2) * 8; ctx.beginPath(); ctx.moveTo(px, py - 4 * a); ctx.lineTo(px + 1.4, py); ctx.lineTo(px, py + 4 * a); ctx.lineTo(px - 1.4, py); ctx.closePath(); ctx.fill(); } }
    }
    ctx.restore();
  }

  /* ---------- 장치 그리기 ---------- */
  function drawDevice(t) {
    const R = DOME;
    // 받침
    groundShadow(R.cx, R.floor + 36, 150, 10, 1);
    panel(DEV.x, R.floor - 2, DEV.w, 64, 14, '#505968', 14, 5, 'rgba(20,24,40,.35)');
    ctx.save(); D.roundRect(DEV.x, R.floor - 2, DEV.w, 64, 14); ctx.clip();
    vgrad(ctx, DEV.x, R.floor - 2, DEV.w, 64, '#7a8498', '#444c5a');
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(DEV.x, R.floor - 2, DEV.w, 5);
    ctx.restore();
    // LCD
    ctx.fillStyle = '#0c1a16'; D.roundRect(LCD.x, LCD.y, LCD.w, LCD.h, 8); ctx.fill();
    ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 2; ctx.stroke();
    const run = DC.run;
    let l1 = '여러 방법(가열·전기 분해)으로', l2 = '분해를 시도하는 장치 · 공기 차단';
    if (run) { l1 = run.it.el ? '가열 · 전기 분해 중…' : run.it.how; l2 = run.it.id === 'nacl' ? '공장에서 쓰는 방법' : '공기를 막고 분해를 시도해요'; }
    txt(l1, LCD.x + LCD.w / 2, LCD.y + 18, 13, run ? '#b9ffd2' : '#7fe0a5', 'center', 800);
    txt(l2, LCD.x + LCD.w / 2, LCD.y + 35, 12.5, run ? '#8fe8b0' : '#5cc58b', 'center', 700);
    // 유리 돔 (뒤쪽 면)
    ctx.save();
    const domePath = () => { ctx.beginPath(); ctx.moveTo(R.x0, R.floor); ctx.lineTo(R.x0, R.cy); ctx.arc(R.cx, R.cy, R.r, Math.PI, 0, false); ctx.lineTo(R.x1, R.floor); };
    domePath(); ctx.closePath();
    const gd = ctx.createLinearGradient(R.x0, 0, R.x1, 0);
    gd.addColorStop(0, 'rgba(176,200,232,.45)'); gd.addColorStop(0.2, 'rgba(235,244,255,.28)'); gd.addColorStop(0.8, 'rgba(235,244,255,.2)'); gd.addColorStop(1, 'rgba(170,196,230,.45)');
    ctx.fillStyle = gd; ctx.fill();
    const gv = ctx.createLinearGradient(0, R.cy - R.r, 0, R.floor);
    gv.addColorStop(0, 'rgba(255,255,255,.35)'); gv.addColorStop(1, 'rgba(220,235,255,.12)');
    ctx.fillStyle = gv; ctx.fill();
    ctx.restore();
    // 바닥판 · 코일 · 전극
    ctx.fillStyle = '#3a414e'; D.roundRect(R.x0 + 6, R.floor - 16, R.x1 - R.x0 - 12, 14, 5); ctx.fill();
    const heat = DC.heat;
    // 가열 코일
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = mix('#505866', '#ff7a2a', heat); ctx.lineWidth = 5;
    const coil = () => { ctx.beginPath(); for (let i = 0; i <= 16; i++) { const x = 322 + i * 4.5, y = R.floor - 22 + (i % 2 ? -7 : 7); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
    coil(); ctx.stroke();
    if (heat > 0.02) { ctx.save(); ctx.beginPath(); ctx.rect(R.x0, 60, R.x1 - R.x0, R.floor - 60 - 4); ctx.clip(); D.glow(380, R.floor - 24, 30 + heat * 42, '#ff8a3d', 0.5 * heat); ctx.restore(); coil(); ctx.strokeStyle = rgba('#ffe0a8', 0.7 * heat); ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    // 전극 2개
    [292, 468].forEach((x, i) => {
      const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0); g.addColorStop(0, '#9aa3b2'); g.addColorStop(0.5, '#e1e6ee'); g.addColorStop(1, '#69717f');
      ctx.fillStyle = g; D.roundRect(x - 4, 290, 8, R.floor - 292, 3); ctx.fill();
      D.sphere(x, 290, 7, '#cfd6e2', { dark: '#6b7585' });
    });
    // 아지랑이
    if (heat > 0.1 && !RM) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,170,90,' + (0.22 * heat).toFixed(2) + ')'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let j = 0; j <= 12; j++) { const yy = R.floor - 34 - j * 9, xx = 350 + k * 30 + Math.sin(t * 3.2 + j * 0.8 + k) * (4 + j * 0.5); j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawArcs(t) {
    if (!DC.run || DC.arcAlpha <= 0.02) return;
    const y0 = 296;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    DC.arcs.forEach((pts, k) => {
      ctx.strokeStyle = k === 0 ? 'rgba(210,235,255,' + (0.95 * DC.arcAlpha).toFixed(2) + ')' : 'rgba(110,170,255,' + (0.7 * DC.arcAlpha).toFixed(2) + ')';
      ctx.lineWidth = k === 0 ? 2.2 : 3.4;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    });
    D.glow(292, y0, 18, '#8ec5ff', 0.7 * DC.arcAlpha); D.glow(468, y0, 18, '#8ec5ff', 0.7 * DC.arcAlpha);
    ctx.restore();
  }
  function drawDomeFront() {
    const R = DOME;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(R.x0, R.floor); ctx.lineTo(R.x0, R.cy); ctx.arc(R.cx, R.cy, R.r, Math.PI, 0, false); ctx.lineTo(R.x1, R.floor); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(R.cx, R.cy, R.r - 12, Math.PI * 1.03, Math.PI * 1.38, false); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(R.x0 + 11, R.cy + 8); ctx.lineTo(R.x0 + 11, R.floor - 40); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(R.x1 - 10, R.cy + 20); ctx.lineTo(R.x1 - 10, R.floor - 50); ctx.stroke();
    ctx.restore();
    txt('분해 장치', DEV.x + 4, 76, 15, COL.muted, 'left', 800);
  }
  function drawHatch(t) {
    // 투입구 (점선 원) — 물질을 끌어 올 때 강조
    const over = DC.drag && inDevice(DC.drag);
    const cx = DOME.cx, cy = 66, r = 26;
    ctx.save();
    ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 14;
    ctx.strokeStyle = over ? COL.sub : '#a5b0c6'; ctx.lineWidth = over ? 3.4 : 2.4;
    ctx.fillStyle = over ? 'rgba(139,92,246,.12)' : 'rgba(255,255,255,.5)';
    circle(ctx, cx, cy, r); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    txt('여기에', cx, cy - 1, 12.5, over ? COL.sub : '#8a95a8', 'center', 800);
    txt('넣어요', cx, cy + 13, 12.5, over ? COL.sub : '#8a95a8', 'center', 800);
    if (over) { ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.5); ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.moveTo(DOME.x0, DOME.floor); ctx.lineTo(DOME.x0, DOME.cy); ctx.arc(DOME.cx, DOME.cy, DOME.r, Math.PI, 0, false); ctx.lineTo(DOME.x1, DOME.floor); ctx.stroke(); ctx.restore(); }
  }
  const inDevice = (p) => p.x > DEV.x && p.x < DEV.x + DEV.w && p.y > 40 && p.y < DOME.floor + 20;

  /* ---------- 갱신 ---------- */
  function dcUpdate(dt) {
    const run = DC.run;
    // 선반 · 장치 · 상자 위치로 움직이기
    DC.items.forEach((it) => {
      if (it.hold) return;
      let tx = it.hx, ty = it.hy;
      if (it.state === 'dev') { tx = CHAMBER.x; ty = CHAMBER.y; }
      else if (it.state === 'box') { const b = BOX.find((q) => q.id === it.box); const k = b.items.indexOf(it); tx = b.x + 112; ty = b.y + SLOT0 + k * 26; }
      const rate = it.state === 'box' ? 9 : 11;
      it.x = SciSim.approach(it.x, tx, dt, rate); it.y = SciSim.approach(it.y, ty, dt, rate);
      if (it.state === 'dev' && !(run && run.it === it)) it.s = SciSim.approach(it.s, 0.9, dt, 10);
      if (it.state === 'box') it.chip = SciSim.approach(it.chip, 1, dt, 7);
    });
    DC.items.forEach((it) => { it.lift = SciSim.approach(it.lift, it.hold ? 1 : 0, dt, 18); it.badgeT += dt; });
    BOX.forEach((b) => {
      b.lid = SciSim.approach(b.lid, DC.drag && b.hover ? 1 : 0, dt, 14);
      if (b.msgT > 0) b.msgT -= dt;
      if (b.shake > 0) b.shake -= dt;
      if (b.unlocked && b.typed < b.meaning.length) b.typed = Math.min(b.meaning.length, b.typed + dt * (RM ? 400 : 38));
    });
    DC.arcAlpha = SciSim.approach(DC.arcAlpha || 0, run && run.arc ? 1 : 0, dt, 18);
    DC.heat = SciSim.approach(DC.heat, run ? run.heat != null ? run.heat : 0 : 0, dt, run ? 5 : 1.8);
    DC.stamp = Math.max(0, DC.stamp - dt);
    DC.arcT -= dt;
    if (run && DC.arcAlpha > 0.1 && DC.arcT <= 0) {
      DC.arcT = 0.08; DC.arcs = [];
      for (let k = 0; k < 3; k++) { const pts = [[292, 296 + rand(-4, 4)]]; const n = 9; for (let i = 1; i < n; i++) pts.push([lerp(292, 468, i / n) + rand(-4, 4), 296 + rand(-14, 14) * (k === 0 ? 0.6 : 1)]); pts.push([468, 296 + rand(-4, 4)]); DC.arcs.push(pts); }
      if (Math.random() < 0.3) sfx.zap();
    }
    if (run) dcRunUpdate(run, dt);
    // 기포
    for (let k = DC.bub.length - 1; k >= 0; k--) {
      const b = DC.bub[k]; b.age += dt;
      if (b.state === 0) { b.r = lerp(0.6, b.rMax, Math.min(1, b.age / b.grow)); if (b.age >= b.grow) { b.state = 1; b.age = 0; } continue; }
      b.y -= b.vy * dt; b.x = b.x0 + Math.sin(b.age * TAU * 5 + b.ph) * 1.6;
      if (b.clr < 2 && run && run.it.id === 'h2o' && b.y < 256) { run.gas = Math.min(1, (run.gas || 0) + 0.016); DC.bub.splice(k, 1); continue; }
      if (b.y < 130) DC.bub.splice(k, 1);
    }
    // 생긴 물질 칩
    DC.tray.forEach((c) => { c.t += dt; });
  }
  function emitBubbles(dt, x, y, rate, clr) {
    DC.bubAcc[clr] += rate * dt;
    while (DC.bubAcc[clr] >= 1) {
      DC.bubAcc[clr] -= 1;
      DC.bub.push({ x0: x + rand(-4, 4), x: x, y: y + rand(-10, 10), r: 0.6, rMax: rand(2, 3.4), grow: rand(0.2, 0.5), age: 0, state: 0, vy: rand(55, 90), ph: rand(0, TAU), clr });
    }
  }
  function addProduct(run, i) {
    const it = run.it;
    DC.tray.push({ name: it.parts[i], sym: it.sym[i], t: 0, slot: i, from: { x: 380 + (i ? 40 : -40), y: it.id === 'h2o' ? 176 : 250 } });
    Sound.tick();
    FX.burst(380 + (i ? 40 : -40), it.id === 'h2o' ? 176 : 250, { count: RM ? 3 : 6, speed: 90, life: 0.5, size: 3, colors: ['#8b5cf6', '#ffd23f', '#fff'], gravity: 80 });
  }
  function dcRunUpdate(run, dt) {
    run.t += dt;
    const t = run.t, it = run.it, fl = run.flags;
    run.arc = t > 0.35 && t < run.dur - 0.5;
    // 가열 (코일이 달아오른다)
    run.heat = seg(t, 0, 0.7) * (1 - 0.6 * seg(t, run.dur - 0.6, run.dur)) * (it.id === 'h2o' ? 0.3 : 1);
    if (it.id === 'h2o') {
      if (t > 0.5 && t < 2.0) { emitBubbles(dt, 292, 334, RM ? 14 : 28, 0); emitBubbles(dt, 468, 334, RM ? 7 : 14, 1); }
      if (t > 1.7 && !fl.p0) { fl.p0 = true; addProduct(run, 0); }
      if (t > 1.95 && !fl.p1) { fl.p1 = true; addProduct(run, 1); }
    } else if (it.id === 'nacl') {
      run.melt = ease.inOutCubic(seg(t, 0.3, 1.2));
      if (t > 0.3 && !fl.msg) { fl.msg = true; say(380, 280, '약 801 °C에서 녹아요', { bg: '#c2410c', below: false, dur: 1.7 }); }
      if (t > 1.3 && t < 2.5) { emitBubbles(dt, 468, 330, RM ? 8 : 18, 2); }
      if (t > 1.3 && t < 2.2 && !fl.na) { fl.na = true; run.drop = 0; }
      if (run.drop != null) run.drop = Math.min(1, run.drop + dt / 1.0);
      if (t > 2.45 && !fl.p0) { fl.p0 = true; addProduct(run, 0); }
      if (t > 2.7 && !fl.p1) { fl.p1 = true; addProduct(run, 1); }
    } else if (it.id === 'ag2o') {
      run.silver = ease.inOutCubic(seg(t, 0.4, 1.9));
      if (t > 0.6 && t < 2.2) emitBubbles(dt, 380, 322, RM ? 8 : 16, 1);
      if (t > 2.1 && !fl.p0) { fl.p0 = true; addProduct(run, 0); }
      if (t > 2.35 && !fl.p1) { fl.p1 = true; addProduct(run, 1); }
      if (t > 1.0 && !fl.sp) { fl.sp = true; }
    } else {
      // 원소: 변화 없음
      if (it.id === 'cu') run.heat = Math.max(run.heat, seg(t, 0, 1.1) * (1 - seg(t, 1.5, 2.4)));
      run.cuHeat = it.id === 'cu' ? seg(t, 0.2, 1.1) * (1 - seg(t, 1.5, 2.4)) : 0;
      if (t > 1.6 && !fl.stamp) { fl.stamp = true; DC.stamp = 1.5; sfx.thud(); FX.burst(380, 250, { count: RM ? 4 : 10, speed: 120, life: 0.5, size: 3, colors: ['#e2464b', '#ffd23f'], gravity: 100 }); }
    }
    if (t >= run.dur) dcFinish();
  }

  /* ---------- 그리기 ---------- */
  function drawBoxes(t) {
    BOX.forEach((b) => {
      ctx.save();
      if (b.shake > 0) ctx.translate(Math.sin(b.shake * 60) * 4 * Math.min(1, b.shake * 3), 0);
      const open = b.lid;
      const glow = b.hover && DC.drag ? 1 : 0;
      panel(b.x, b.y + 14, b.w, b.h - 14, 14, '#fff', 12, 4);
      ctx.save(); D.roundRect(b.x, b.y + 14, b.w, b.h - 14, 14); ctx.clip();
      ctx.fillStyle = b.soft; ctx.fillRect(b.x, b.y + 14, b.w, b.h - 14);
      ctx.restore();
      if (glow) { ctx.save(); ctx.strokeStyle = rgba(b.c, 0.5 + 0.4 * Math.sin(t * 9)); ctx.lineWidth = 5; D.roundRect(b.x - 3, b.y + 11, b.w + 6, b.h - 8, 17); ctx.stroke(); ctx.restore(); }
      ctx.strokeStyle = b.c; ctx.lineWidth = 2.4; D.roundRect(b.x, b.y + 14, b.w, b.h - 14, 14); ctx.stroke();
      // 뚜껑 (왼쪽 경첩, 위로 15° 열림)
      ctx.save(); ctx.translate(b.x + 6, b.y + 14); ctx.rotate(-open * 0.26);
      ctx.fillStyle = b.c; D.roundRect(-6, -14, b.w + 0, 30, 12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.22)'; D.roundRect(-4, -12, b.w - 4, 8, 6); ctx.fill();
      txt(b.name + ' 상자', 12, 7, 17, '#fff', 'left', 800);
      ctx.restore();
      // 뜻 한 줄
      const ty = b.y + 50;
      if (!b.unlocked) { txt('?', b.x + b.w / 2, ty + 36, 40, rgba(b.c, 0.45), 'center', 800); txt('분해해 보면 알 수 있어요', b.x + b.w / 2, ty + 56, 12.5, '#98a3b6', 'center', 700); }
      else {
        const shown = b.meaning.slice(0, Math.floor(b.typed));
        const lines = wrapText(b.meaning, b.w - 28, 13.5, 800);
        let used = 0;
        lines.forEach((l, i) => { const n = Math.max(0, Math.min(l.length, Math.floor(b.typed) - used)); used += l.length + 1; if (n > 0) txt(l.slice(0, n), b.x + 14, ty + 12 + i * 18, 13.5, '#2b3445', 'left', 800); });
      }
      // 틀렸을 때 알려 주는 말
      if (b.msgT > 0) {
        const a = Math.min(1, b.msgT * 3);
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = b.msgC; D.roundRect(b.x + 8, b.y + 38, b.w - 16, 76, 12); ctx.fill();
        textBlock(b.msg, b.x + 18, b.y + 60, b.w - 36, 14, '#fff', 'left', 19, 800);
        ctx.restore();
      }
      // 칸 3개
      for (let i = 0; i < 3; i++) {
        const sy = b.y + SLOT0 + i * 26;
        ctx.fillStyle = 'rgba(255,255,255,.75)'; D.roundRect(b.x + 12, sy - 11, b.w - 24, 23, 12); ctx.fill();
        ctx.strokeStyle = rgba(b.c, 0.35); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; D.roundRect(b.x + 12, sy - 11, b.w - 24, 23, 12); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
    });
  }
  function drawItemsAndChips(t) {
    // 선반
    panel(SHELF.x, SHELF.y, SHELF.w, SHELF.h, 16, 'rgba(255,255,255,.9)', 12, 4);
    txt('🗃️ 물질 선반', SHELF.x + 14, SHELF.y + 24, 15, COL.ink, 'left', 800);
    DC.items.forEach((it, i) => {
      const cp = cellPos(i);
      // 빈 칸 (물질이 떠나 있으면 점선)
      ctx.save();
      ctx.fillStyle = it.state === 'shelf' && !it.hold ? 'rgba(245,248,253,1)' : 'rgba(245,248,253,.55)';
      D.roundRect(cp.x, cp.y, CELL.w, CELL.h, 12); ctx.fill();
      ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; if (it.state !== 'shelf') ctx.setLineDash([4, 4]); D.roundRect(cp.x, cp.y, CELL.w, CELL.h, 12); ctx.stroke(); ctx.setLineDash([]);
      // 처음에는 수소 · 산소 병이 반짝인다
      if (DC.glowHint && (it.id === 'h2' || it.id === 'o2') && it.state === 'shelf' && !it.tested) {
        ctx.strokeStyle = rgba(COL.warn, 0.4 + 0.5 * Math.sin(t * 6 + (it.id === 'o2' ? 1.2 : 0))); ctx.lineWidth = 4; D.roundRect(cp.x - 3, cp.y - 3, CELL.w + 6, CELL.h + 6, 15); ctx.stroke();
      }
      ctx.restore();
      txt(it.name, cp.x + CELL.w / 2, cp.y + CELL.h - 8, it.name.length > 4 ? 12.5 : 14, COL.ink, 'center', 800);
      // 시험 결과 배지
      if (it.tested) {
        const dec = !it.el, k = outBack(Math.min(1, it.badgeT / 0.3));
        ctx.save(); ctx.translate(cp.x + CELL.w - 6, cp.y + 6); ctx.scale(k, k);
        ctx.fillStyle = dec ? '#0f8a4b' : '#6b7486'; D.roundRect(-52, -9, 56, 18, 9); ctx.fill();
        txt(dec ? '✔ 분해됨' : '✖ 분해 안 됨', -24, 4.5, 11.5, '#fff', 'center', 800);
        ctx.restore();
      }
    });
  }
  function drawPool(t, k, gas) {
    const R = DOME, wy = 252;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(R.x0 + 2, R.floor - 3); ctx.lineTo(R.x0 + 2, R.cy); ctx.arc(R.cx, R.cy, R.r - 2, Math.PI, 0, false); ctx.lineTo(R.x1 - 2, R.floor - 3); ctx.closePath(); ctx.clip();
    // 모인 기체 (돔 꼭대기)
    if (gas > 0.01) { D.glow(R.cx, 170, 40 + 90 * gas, '#ffffff', 0.85 * gas); D.glow(R.cx, 160, 30 + 60 * gas, '#cfe6ff', 0.5 * gas); }
    const g = ctx.createLinearGradient(0, wy, 0, R.floor);
    g.addColorStop(0, 'rgba(210,235,255,' + (0.62 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(160,205,246,' + (0.78 * k).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(R.x0, R.floor);
    for (let x = R.x0; x <= R.x1; x += 6) ctx.lineTo(x, wy + Math.sin(x * 0.06 + t * 1.6) * 1.4);
    ctx.lineTo(R.x1, R.floor); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * k).toFixed(2) + ')'; ctx.lineWidth = 1.8;
    for (let l = 0; l < 2; l++) { ctx.beginPath(); for (let x = R.x0; x <= R.x1; x += 6) { const yy = wy + 6 + l * 8 + Math.sin(x * 0.07 + t * (1.2 + l * 0.5) + l) * 1.4; x === R.x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
    ctx.restore();
  }
  function drawItemBodies(t, mode) {
    // mode A: 선반 · 장치 안 / B: 상자 안(칩) / C: 끌고 있는 것
    const order = DC.items.filter((it) => (mode === 'C' ? it.hold : mode === 'B' ? (!it.hold && it.state === 'box') : (!it.hold && it.state !== 'box')));
    order.forEach((it) => {
      const run = DC.run && DC.run.it === it ? DC.run : null;
      if (it.state === 'dev' && !it.hold && it.id === 'h2o') { DC.poolK = SciSim.approach(DC.poolK || 0, 1, 1 / 60, 3); drawPool(t, 1, run ? run.gas || 0 : 0); return; }
      const sc = it.s * (1 + it.lift * 0.08) * (it.state === 'box' ? 1 - it.chip * 0.55 : 1);
      if (it.lift > 0.02) { ctx.fillStyle = 'rgba(30,40,70,' + (0.18 * it.lift).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(it.x + 6 * it.lift, it.y + 40 * sc, 26, 6, 0, 0, TAU); ctx.fill(); }
      const o = { t, wide: it.state === 'dev', heat: run ? (it.id === 'cu' ? run.cuHeat : it.id === 'nacl' ? seg(run.t, 0.0, 0.9) * (run.melt != null ? 1 : 0) : 0) : 0, melt: run ? run.melt || 0 : 0, silver: run ? run.silver || 0 : (it.tested && it.id === 'ag2o' && it.state !== 'dev' ? 0 : 0) };
      if (it.state === 'box') {
        ctx.save(); ctx.globalAlpha = 1 - it.chip;
        if (it.chip < 0.98) drawItemIcon(it.id, it.x, it.y, sc, o);
        ctx.restore();
      } else {
        if (it.state === 'dev' && !it.hold) {
          // 장치 안에서는 유리 뒤에 있는 느낌으로 살짝 밝게
        }
        drawItemIcon(it.id, it.x, it.y, sc, o);
      }
      if (it.state === 'box') {
        const b = BOX.find((q) => q.id === it.box);
        const k = b.items.indexOf(it), sy = b.y + SLOT0 + k * 26;
        ctx.save(); ctx.globalAlpha = it.chip;
        ctx.fillStyle = '#fff'; D.roundRect(b.x + 14, sy - 10, b.w - 28, 21, 11); ctx.fill();
        ctx.strokeStyle = b.c; ctx.lineWidth = 1.8; D.roundRect(b.x + 14, sy - 10, b.w - 28, 21, 11); ctx.stroke();
        ctx.fillStyle = b.c; circle(ctx, b.x + 28, sy, 6); ctx.fill();
        txt(it.name, b.x + 42, sy + 5, 13.5, COL.ink, 'left', 800);
        D.check(b.x + b.w - 28, sy, 7.5, 1);
        ctx.restore();
      }
    });
  }
  function drawTrayAndLast(t) {
    // 생긴 물질 받침
    panel(TRAYR.x, TRAYR.y, TRAYR.w, TRAYR.h, 14, 'rgba(255,255,255,.92)', 10, 3);
    txt('생긴 물질', TRAYR.x + 12, TRAYR.y + 20, 13.5, COL.muted, 'left', 800);
    for (let i = 0; i < 2; i++) {
      const sx = TRAYR.x + 10 + i * 100, sy = TRAYR.y + 28;
      ctx.strokeStyle = '#cdd6e6'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; D.roundRect(sx, sy, 92, 28, 14); ctx.stroke(); ctx.setLineDash([]);
    }
    DC.tray.forEach((c) => {
      const sx = TRAYR.x + 10 + c.slot * 100 + 46, sy = TRAYR.y + 42;
      const k = c.t < 0.35 ? outBack(c.t / 0.35) : 1;
      const f = ease.inOutCubic(seg(c.t, 0.45, 1.05));
      const x = lerp(c.from.x, sx, f), y = lerp(c.from.y, sy, f) - Math.sin(f * Math.PI) * 60;
      ctx.save(); ctx.translate(x, y); ctx.scale(k * (1 - 0.1 * f), k * (1 - 0.1 * f));
      const clr = EL[c.sym] ? EL[c.sym].c : '#8b95a7';
      softShadow(-44, -14, 88, 28, 14, 8, 2, 'rgba(30,40,70,.25)');
      ctx.fillStyle = '#fff'; D.roundRect(-44, -14, 88, 28, 14); ctx.fill();
      ctx.strokeStyle = shade(clr, -0.15); ctx.lineWidth = 2; D.roundRect(-44, -14, 88, 28, 14); ctx.stroke();
      drawBall(c.sym, -27, 0, 10, {});
      txt(c.name, -11, 5, c.name.length > 3 ? 12.5 : 14, COL.ink, 'left', 800);
      ctx.restore();
    });
    // 마지막 결과 카드
    const R = { x: 566, y: 448, w: 224, h: 60 };
    panel(R.x, R.y, R.w, R.h, 14, 'rgba(255,255,255,.92)', 10, 3);
    txt('마지막 결과', R.x + 12, R.y + 20, 13.5, COL.muted, 'left', 800);
    const ln = wrapText(DC.last || '아직 시험하지 않았어요', R.w - 24, 14, 800);
    ln.slice(0, 2).forEach((l, i) => txt(l, R.x + 12, R.y + 40 + i * 17, 14, DC.last ? COL.ink : '#9aa5b6', 'left', 800));
  }
  function drawStamp() {
    if (DC.stamp <= 0) return;
    const age = 1.5 - DC.stamp, k = age < 0.22 ? 1.6 - 0.6 * ease.outCubic(age / 0.22) : 1, a = DC.stamp < 0.4 ? DC.stamp / 0.4 : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(380, 200); ctx.rotate(-8 * Math.PI / 180); ctx.scale(k, k);
    ctx.strokeStyle = '#d6343a'; ctx.lineWidth = 4; ctx.fillStyle = 'rgba(255,255,255,.88)';
    D.roundRect(-104, -34, 208, 68, 12); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.6; D.roundRect(-98, -28, 196, 56, 8); ctx.stroke();
    txt('변화 없음', 0, -4, 24, '#d6343a', 'center', 800);
    txt('더 이상 분해되지 않아요', 0, 20, 14, '#d6343a', 'center', 800);
    ctx.restore();
  }
  function drawBubbleCol() {
    DC.bub.forEach((b) => {
      ctx.save();
      if (b.clr === 2) { ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(190,240,120,.45)'; ctx.strokeStyle = 'rgba(120,190,40,.85)'; ctx.lineWidth = 1.3; circle(ctx, b.x, b.y, b.r); ctx.fill(); ctx.stroke(); }
      else drawBubbleDot(b.x, b.y, b.r);
      ctx.restore();
    });
  }
  SC.decomp = {
    label: '🔬 분해 장치로 시험해요',
    hint: '물질을 장치 위로 끌어 놓고 🔬 분해하기를 눌러요',
    enter() { dcRefresh(); },
    update(dt) { dcUpdate(dt); },
    draw(t) {
      wall();
      // 사용 순서 안내
      ctx.fillStyle = 'rgba(255,255,255,.7)'; D.roundRect(12, 388, 188, 118, 14); ctx.fill();
      txt('이렇게 해 봐요', 24, 410, 13.5, COL.sub, 'left', 800);
      txt('① 물질을 장치에 넣어요', 24, 432, 13, COL.muted, 'left', 700);
      txt('② 🔬 분해하기를 눌러요', 24, 452, 13, COL.muted, 'left', 700);
      txt('③ 결과를 보고 상자에 넣어요', 24, 472, 13, COL.muted, 'left', 700);
      txt('(원소? 화합물?)', 24, 492, 13, COL.muted, 'left', 700);
      drawDevice(t);
      drawItemsAndChips(t);
      const run = DC.run;
      drawItemBodies(t, 'A');
      drawBubbleCol();
      // 나트륨 은빛 방울
      if (run && run.it.id === 'nacl' && run.drop != null) {
        const d = run.drop; ctx.save(); const x = 292, y = 330 - d * 6; D.sphere(x, y + 4, 4 + d * 6, '#dfe4ec', { dark: '#8a93a3', light: '#fff' }); ctx.restore();
      }
      drawArcs(t);
      drawDomeFront();
      drawHatch(t);
      drawBoxes(t);
      drawItemBodies(t, 'B');
      drawStamp();
      drawTrayAndLast(t);
      drawItemBodies(t, 'C');
      focusRing({ x: DEV.x, y: 40, w: DEV.w, h: 372 }, 'decomp', 16);
    },
    hover(p) {
      for (const it of DC.items) if (!it.hold && Math.hypot(p.x - it.x, p.y - it.y) < 40 && it.state !== 'box') return 'grab';
      return null;
    },
    down(p) {
      // 위에 그려진 것(장치 안 · 선반)을 우선
      const cand = DC.items.filter((it) => it.state !== 'box' && Math.hypot(p.x - it.x, p.y - it.y) < 42);
      if (!cand.length) return false;
      const it = cand[0];
      if (DC.run && DC.run.it === it) return false;
      DC.drag = it; it.hold = true; it.ox = it.x - p.x; it.oy = it.y - p.y;
      it.state = it.state === 'dev' ? 'dev' : 'shelf';
      sfx.glug(); tw(it, { s: 1 }, 0.15, 'outCubic');
      if (DC.loaded === it) { DC.loaded = null; dcRefresh(); }
      hideHint();
      return true;
    },
    move(p) {
      const it = DC.drag; if (!it) return;
      it.x = clamp(p.x + it.ox, 20, 780); it.y = clamp(p.y + it.oy, 30, 500);
      BOX.forEach((b) => { b.hover = it.x > b.x - 10 && it.x < b.x + b.w + 10 && it.y > b.y && it.y < b.y + b.h + 6; });
    },
    up(p) {
      const it = DC.drag; if (!it) return;
      DC.drag = null; it.hold = false; BOX.forEach((b) => { b.hover = false; });
      const bx = BOX.find((b) => it.x > b.x - 10 && it.x < b.x + b.w + 10 && it.y > b.y && it.y < b.y + b.h + 6);
      if (bx) { dcDropInBox(it, bx); return; }
      if (inDevice({ x: it.x, y: it.y })) {
        if (DC.loaded && DC.loaded !== it) dcPutBack(DC.loaded);
        it.state = 'dev'; DC.loaded = it;
        okFx(CHAMBER.x, 250, COL.sub); sfx.thud();
        dcRefresh();
        return;
      }
      it.state = 'shelf'; dcRefresh();
    },
  };
  function boxMsg(b, text, color) { b.msg = text; b.msgC = color; b.msgT = 3.2; b.shake = 0.45; }
  function dcDropInBox(it, bx) {
    const correct = (it.el && bx.id === 'el') || (!it.el && bx.id === 'co');
    if (!it.tested) { it.state = 'shelf'; boxMsg(bx, '먼저 분해 장치로 확인해요', COL.warn); Sound.fail(); dcRefresh(); return; }
    if (!correct) {
      it.state = 'shelf';
      // 감쇠 스프링으로 튕겨 나오는 느낌
      it.x += -18; Sound.fail();
      boxMsg(bx, it.el ? '분해되지 않았어요! 더 이상 분해되지 않으면 원소예요.' : '분해 장치에서 두 가지 물질로 나뉘었어요!', COL.bad);
      return;
    }
    it.state = 'box'; it.box = bx.id; it.chip = 0; bx.items.push(it);
    okFx(bx.x + bx.w / 2, bx.y + SLOT0 + (bx.items.length - 1) * 26, bx.c);
    sfx.ding();
    dcRefresh();
  }
  Object.assign(DBG, { DC, BOX, ITEMS, dcReset, dcStart, dcItem, dcDropInBox, CHAMBER });

  /* =========================================================
     화학식 띠 (장면 3 · 4에서 함께 쓰는 부품)
     슬롯 3칸: 원소 기호(크게) + 아래첨자(원자 수, 1은 생략)
     ========================================================= */
  function makeStrip(rect, o) {
    o = o || {};
    const st = { rect, slots: [], sel: -1, maxSlots: 3, gap: o.gap != null ? o.gap : 12, locked: !!o.locked, compact: !!o.compact, order: null, onChange: null, flyIn: [] };
    const sw = () => (rect.w - st.gap * (st.maxSlots - 1)) / st.maxSlots;
    st.slotRect = (i) => ({ x: rect.x + i * (sw() + st.gap), y: rect.y, w: sw(), h: rect.h });
    st.value = () => { const v = {}; st.slots.forEach((s) => { if (!s.bad && !s.dying) v[s.sym] = (v[s.sym] || 0) + s.n; }); return v; };
    st.parts = (ord) => { const a = st.slots.filter((s) => !s.bad && !s.dying).map((s) => [s.sym, s.n]); if (ord) a.sort((x, y) => ord.indexOf(x[0]) - ord.indexOf(y[0])); return a; };
    st.text = () => st.parts().map((p) => p[0] + (p[1] > 1 ? p[1] : '')).join('');
    st.clear = () => { st.slots.length = 0; st.sel = -1; st.flyIn.length = 0; st.changed(); };
    st.changed = () => { if (st.onChange) st.onChange(st); };
    st.addSlot = (sym, n, immediate) => {
      const i = st.slots.length, r = st.slotRect(i);
      const s = { sym, n: n || 1, px: r.x, k: immediate ? 1 : 0, bad: 0, dying: 0, shake: 0, roll: null, pulse: 0 };
      st.slots.push(s); return s;
    };
    /* 타일을 눌렀을 때: from = 날아오는 시작점 */
    st.add = (sym, from, model) => {
      if (st.locked) return 'locked';
      const exist = st.slots.find((s) => s.sym === sym && !s.bad && !s.dying);
      if (exist) {
        if (exist.n < 9) { exist.roll = { from: exist.n, t: 0, dir: 1 }; exist.n++; }
        exist.pulse = 1; st.sel = st.slots.indexOf(exist);
        const r = st.slotRect(st.sel);
        say(r.x + r.w / 2, r.y - 4, '같은 원소는 한 번만 쓰고 개수는 숫자로!', { bg: COL.sub, maxW: 220, dur: 2.6 });
        Sound.tick(); st.changed(); return 'dup';
      }
      if (st.slots.filter((s) => !s.dying).length >= st.maxSlots) { say(st.rect.x + st.rect.w / 2, st.rect.y - 4, '칸이 가득 찼어요. ×로 지우고 다시 해 봐요.', { bg: COL.warn, maxW: 220 }); return 'full'; }
      const s = st.addSlot(sym, 1, false);
      const r = st.slotRect(st.slots.length - 1);
      s.fly = { x0: from ? from.x : r.x + r.w / 2, y0: from ? from.y : r.y + r.h + 80, t: 0, dur: 0.35 };
      s.bad = model && !(sym in model.f) ? 0.001 : 0;
      st.sel = st.slots.length - 1;
      Sound.tick(); st.changed();
      return s.bad ? 'bad' : 'ok';
    };
    st.inc = (d) => {
      const s = st.slots[st.sel];
      if (!s || s.bad || st.locked) return false;
      const n2 = clamp(s.n + d, 1, 9);
      if (n2 === s.n) return false;
      s.roll = { from: s.n, t: 0, dir: d > 0 ? 1 : -1 }; s.n = n2; s.pulse = 1;
      Sound.tick(); st.changed(); return true;
    };
    st.remove = (i) => {
      const s = st.slots[i]; if (!s || s.dying) return;
      s.dying = 0.001; Sound.click();
      if (st.sel === i) st.sel = -1;
    };
    st.hit = (p) => {
      for (let i = 0; i < st.slots.length; i++) {
        const s = st.slots[i], r = st.slotRect(i);
        if (s.dying) continue;
        const xb = { x: s.px + r.w - 16, y: r.y + 16 };
        if (!st.locked && Math.hypot(p.x - xb.x, p.y - xb.y) < 20) return { i, kind: 'x' };
        if (p.x > s.px && p.x < s.px + r.w && p.y > r.y && p.y < r.y + r.h) return { i, kind: 'slot' };
      }
      return null;
    };
    /* 순서를 관례대로 (H₂O, CO₂ …): 슬롯이 FLIP으로 자리를 바꾼다. 바뀌었으면 true */
    st.reorder = (ord) => {
      const live = st.slots.filter((s) => !s.dying);
      const sorted = live.slice().sort((a, b) => ord.indexOf(a.sym) - ord.indexOf(b.sym));
      if (sorted.every((s, i) => s === live[i])) return false;
      const selS = st.slots[st.sel];
      st.slots = sorted.concat(st.slots.filter((s) => s.dying));
      st.sel = selS ? st.slots.indexOf(selS) : -1;
      return true;
    };
    st.update = (dt) => {
      st.slots.forEach((s, i) => {
        const r = st.slotRect(i);
        s.px = SciSim.approach(s.px, r.x, dt, 12);
        if (s.fly) { s.fly.t += dt; if (s.fly.t >= s.fly.dur) { s.fly = null; s.k = 1.0001; s.landed = 0.0001; } }
        if (!s.fly && s.k < 1 && !s.landed) s.k = 1;
        if (s.landed != null) { s.landed += dt; const q = s.landed / 0.35; s.k = q >= 1 ? 1 : 1 + 0.16 * Math.sin(q * Math.PI) * (1 - q); if (q >= 1) s.landed = null; }
        if (s.roll) { s.roll.t += dt; if (s.roll.t >= 0.18) s.roll = null; }
        if (s.pulse > 0) s.pulse = Math.max(0, s.pulse - dt * 2.2);
        if (s.shake > 0) s.shake = Math.max(0, s.shake - dt);
        if (s.bad) { s.bad += dt; s.shake = Math.max(s.shake, 0.1); if (s.bad > 0.95 && !s.dying) { s.dying = 0.001; } }
        if (s.dying) s.dying += dt * 4;
      });
      for (let i = st.slots.length - 1; i >= 0; i--) {
        if (st.slots[i].dying >= 1) { st.slots.splice(i, 1); if (st.sel >= i) st.sel = Math.min(st.sel, st.slots.length - 1); if (st.sel === i) st.sel = -1; st.changed(); }
      }
    };
    st.symPos = (sym) => {
      const i = st.slots.findIndex((s) => s.sym === sym && !s.dying);
      if (i < 0) return null;
      const r = st.slotRect(i), s = st.slots[i];
      return { x: s.px + r.w * 0.36, y: r.y + r.h * 0.54 };
    };
    st.draw = (t, o2) => {
      o2 = o2 || {};
      const R = st.rect, symS = st.compact ? 36 : 52, nS = st.compact ? 22 : 31;
      for (let i = 0; i < st.maxSlots; i++) {
        const r = st.slotRect(i), s = st.slots[i];
        if (!s) {
          // 빈 칸
          const nextEmpty = i === st.slots.length && !st.locked;
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill();
          ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 8; ctx.strokeStyle = nextEmpty ? rgba(COL.sub, 0.6 + 0.3 * Math.sin(t * 5)) : '#c8d1e2'; ctx.lineWidth = nextEmpty ? 2.6 : 1.8;
          D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke(); ctx.setLineDash([]);
          txt(String(i + 1), r.x + r.w / 2, r.y + r.h / 2 + 8, 24, '#d0d8e6', 'center', 800);
          ctx.restore();
          continue;
        }
        const e = EL[s.sym] || { c: '#8b95a7' };
        const dy = s.dying ? -8 * s.dying : 0, ka = s.fly ? 0 : 1;
        const cx = s.px + r.w / 2, cy = r.y + r.h / 2;
        const sx = s.shake > 0 ? Math.sin(s.shake * 70) * 5 : 0;
        ctx.save();
        ctx.globalAlpha = s.dying ? 1 - clamp(s.dying, 0, 1) : (s.fly ? 0.35 : 1);
        ctx.translate(cx + sx, cy + dy); ctx.scale(s.k * (s.dying ? 1 - 0.2 * clamp(s.dying, 0, 1) : 1), s.k * (s.dying ? 1 - 0.2 * clamp(s.dying, 0, 1) : 1)); ctx.translate(-cx, -cy);
        const sel = st.sel === i && !st.locked;
        softShadow(s.px, r.y, r.w, r.h, 14, 10, 3, 'rgba(30,40,80,.22)');
        const bgc = s.bad ? '#ffe6e6' : mix('#ffffff', e.c, 0.1);
        ctx.fillStyle = bgc; D.roundRect(s.px, r.y, r.w, r.h, 14); ctx.fill();
        ctx.fillStyle = s.bad ? COL.bad : (e.edge || e.c); ctx.globalAlpha *= 0.9; D.roundRect(s.px, r.y, r.w, 8, 6); ctx.fill(); ctx.globalAlpha = s.dying ? 1 - clamp(s.dying, 0, 1) : (s.fly ? 0.35 : 1);
        ctx.strokeStyle = s.bad ? COL.bad : sel ? COL.sub : (e.edge || shade(e.c, -0.2)); ctx.lineWidth = sel ? 3.6 : 2; D.roundRect(s.px, r.y, r.w, r.h, 14); ctx.stroke();
        if (sel && s.pulse > 0) { ctx.strokeStyle = rgba(COL.sub, 0.5 * s.pulse); ctx.lineWidth = 4 + 8 * (1 - s.pulse); D.roundRect(s.px - 3, r.y - 3, r.w + 6, r.h + 6, 17); ctx.stroke(); }
        // 기호 + 아래첨자
        ctx.font = D.font(symS, 800); const symW = ctx.measureText(s.sym).width;
        ctx.font = D.font(nS, 800); const nW = ctx.measureText('8').width;
        const tot = symW + nW + 2, x0 = cx - tot / 2, by = cy + symS * 0.28 - (st.compact ? 0 : 2);
        txt(s.sym, x0, by, symS, COL.ink, 'left', 800);
        const nx = x0 + symW + 2, ny = by + symS * 0.3;
        if (s.n === 1 && !s.roll) txt('1', nx, ny, nS, 'rgba(120,130,150,.35)', 'left', 800);
        else if (s.roll) {
          const q = ease.outCubic(s.roll.t / 0.18), off = nS * 0.85;
          ctx.save(); ctx.beginPath(); ctx.rect(nx - 2, ny - nS * 1.05, nW + 6, nS * 1.35); ctx.clip();
          txt(String(s.roll.from), nx, ny - s.roll.dir * q * off * -1 + 0, nS, 'rgba(60,70,90,' + (1 - q).toFixed(2) + ')', 'left', 800);
          txt(String(s.n), nx, ny + s.roll.dir * (1 - q) * off, nS, COL.ink, 'left', 800);
          ctx.restore();
        } else txt(String(s.n), nx, ny, nS, COL.ink, 'left', 800);
        if (sel && s.n === 1 && !s.bad) txt('1은 생략', cx, r.y + r.h - 9, 12.5, COL.muted, 'center', 800);
        if (!st.locked) {
          ctx.fillStyle = 'rgba(120,130,150,.18)'; circle(ctx, s.px + r.w - 16, r.y + 20, 10.5); ctx.fill();
          txt('×', s.px + r.w - 16, r.y + 25.5, 17, '#6b7486', 'center', 800);
        }
        if (o2.ok) D.check(s.px + 14, r.y + r.h - 16, 8.5, 1);
        ctx.restore();
        // 날아오는 타일
        if (s.fly) {
          const q = ease.outCubic(s.fly.t / s.fly.dur), tx = lerp(s.fly.x0, cx, q), ty = lerp(s.fly.y0, cy, q) - Math.sin(q * Math.PI) * 54;
          ctx.save(); ctx.translate(tx, ty); ctx.scale(1 - 0.18 * q, 1 - 0.18 * q);
          const g = ctx.createLinearGradient(0, -28, 0, 28); g.addColorStop(0, shade(e.c, 0.35)); g.addColorStop(1, e.c);
          softShadow(-28, -28, 56, 56, 14, 10, 4, 'rgba(30,40,80,.3)');
          ctx.fillStyle = g; D.roundRect(-28, -28, 56, 56, 14); ctx.fill();
          txt(s.sym, 0, 9, 26, EL[s.sym] ? EL[s.sym].ink : '#fff', 'center', 800);
          ctx.restore();
        }
      }
    };
    return st;
  }

  /* =========================================================
     장면 3 · formula — 입자 모형을 보고 화학식 쓰기
     ========================================================= */
  const MOL_SC = { H2O: 86, O2: 88, CO: 88, CO2: 70, CH4: 80, NH3: 86, N2: 92, O3: 72, SO2: 64 };
  const FM = {
    key: 'H2O', mol: MOLS.H2O, tiles: ['H', 'O', 'C', 'N'], caption: '물 입자 모형', mode: 'build', ang: 0.5, spread: 0, cele: null, done: false, wasOk: false,
    strip: makeStrip({ x: 438, y: 102, w: 346, h: 120 }),
  };
  FM.strip.onChange = () => { fmSync(); };
  const molCount = (mol) => { const c = {}; mol.atoms.forEach((a) => { c[a[0]] = (c[a[0]] || 0) + 1; }); return c; };
  function stripMatches(st, mol) {
    const v = st.value(), f = mol.f, ks = Object.keys(f);
    return Object.keys(v).length === ks.length && ks.every((k) => v[k] === f[k]);
  }
  function fmSet(key, tiles, caption, mode) {
    FM.key = key; FM.mol = MOLS[key]; FM.tiles = tiles; FM.caption = caption; FM.mode = mode || 'build';
    FM.strip.clear(); FM.done = false; FM.wasOk = false; FM.cele = null; FM.spread = 0;
    buildTiles(); fmSync();
  }
  function buildTiles() {
    const box = $('#tiles'); if (!box) return;
    const syms = S.scene === 'earth' ? EA.tiles : FM.tiles;
    box.innerHTML = '';
    syms.forEach((sym) => {
      const e = EL[sym];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tile'; b.dataset.sym = sym;
      b.style.background = 'linear-gradient(160deg,' + shade(e.c, 0.3) + ',' + e.c + ')';
      b.style.color = e.ink; if (e.edge) b.style.borderColor = e.edge;
      b.innerHTML = '<b>' + sym + '</b><small>' + e.name + '</small>';
      b.addEventListener('click', () => tileClick(sym, b));
      box.appendChild(b);
    });
    refreshSub();
  }
  function curStrip() { return S.scene === 'earth' ? (EA.open ? EA.open.strip : null) : FM.strip; }
  function curModel() { return S.scene === 'earth' ? (EA.open ? EA.open.mol : null) : (FM.mode === 'build' ? FM.mol : null); }
  function tileClick(sym, btn) {
    const st = curStrip();
    if (!st || st.locked) return;
    if (S.scene === 'formula' && FM.mode !== 'build') return;
    const r = btn.getBoundingClientRect(), cr = view.canvas.getBoundingClientRect();
    const from = { x: clamp((r.left + r.width / 2 - cr.left) * VW / cr.width, -20, VW + 20), y: clamp((r.top + r.height / 2 - cr.top) * VH / cr.height, -20, VH + 20) };
    const res = st.add(sym, from, curModel());
    if (res === 'bad') {
      const r2 = st.slotRect(st.slots.length - 1);
      later(0.4, () => say(r2.x + r2.w / 2, r2.y - 4, '모형에 이 원자가 없어요', { bg: COL.bad, dur: 2.2 }));
      Sound.fail();
    }
  }
  function refreshSub() {
    const st = curStrip(), up = $('#subUp'), dn = $('#subDown'), out = $('#subVal');
    const s = st && st.sel >= 0 ? st.slots[st.sel] : null;
    const en = !!s && !s.bad && !(st && st.locked);
    if (up) up.disabled = !en || s.n >= 9;
    if (dn) dn.disabled = !en || s.n <= 1;
    if (out) out.textContent = s ? (s.n === 1 ? '1' : String(s.n)) : '-';
    const lb = $('#subLbl'); if (lb) lb.textContent = s ? (s.n === 1 ? '개수 1 (숫자는 쓰지 않아요)' : '원자 ' + s.n + '개') : '칸을 먼저 골라요';
  }
  function fmSync() { refreshSub(); }
  /* 완성 확인: 모형과 같은 원소 · 개수 */
  function fmCorrect() { return FM.mode === 'build' && stripMatches(FM.strip, FM.mol); }
  function fmCheckComplete() {
    const ok = fmCorrect();
    if (ok && !FM.wasOk) {
      FM.wasOk = true; FM.done = true;
      const ord = Object.keys(FM.mol.f);
      const moved = FM.strip.reorder(ord);
      const r = FM.strip.slotRect(0);
      if (moved) say(r.x + r.w / 2, r.y - 4, '화학식은 정해진 순서로 써요', { bg: COL.sub, dur: 2.6 });
      FM.cele = { t: 0 };
      okFx(r.x + FM.strip.rect.w / 2, r.y + r.h / 2, COL.good, true);
      Sound.success();
    } else if (!ok) { FM.wasOk = false; FM.done = false; }
  }
  function fmUpdate(dt) {
    FM.strip.update(dt);
    FM.t = (FM.t || 0) + dt;
    FM.ang = RM ? 0.4 : 0.85 * Math.sin(FM.t * 0.5 + 0.6);     // 천천히 좌우로 돌며 3차원임을 보여 줌 (약 15°/s)
    refreshSubThrottled();
    fmCheckComplete();
    if (FM.cele) {
      FM.cele.t += dt;
      const q = FM.cele.t / 0.9;
      FM.spread = q < 0.5 ? 20 * ease.outCubic(q / 0.5) : 20 * (1 - ease.inOutCubic((q - 0.5) / 0.5));
      if (q >= 1) { FM.spread = 0; FM.cele = null; }
    }
  }
  let lastSubKey = '';
  function refreshSubThrottled() {
    const st = curStrip(); const s = st && st.sel >= 0 ? st.slots[st.sel] : null;
    const k = (s ? s.sym + s.n + (s.bad ? 'b' : '') : '-') + (st && st.locked ? 'L' : '') + S.scene;
    if (k !== lastSubKey) { lastSubKey = k; refreshSub(); }
  }
  /* 입자 모형 스테이지 + 범례 */
  function drawModelStage(t) {
    const cx = 226, cy = 244;
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 190);
    g.addColorStop(0, 'rgba(196,181,253,.55)'); g.addColorStop(0.7, 'rgba(221,214,254,.3)'); g.addColorStop(1, 'rgba(221,214,254,0)');
    ctx.fillStyle = g; circle(ctx, cx, cy, 190); ctx.fill();
    ctx.strokeStyle = 'rgba(139,92,246,.18)'; ctx.lineWidth = 2; ctx.setLineDash([3, 9]); circle(ctx, cx, cy, 168); ctx.stroke(); ctx.setLineDash([]);
    D.label(26, 52, FM.caption, { bg: '#5b21b6', size: 14, pad: 11, align: 'left' });
    const cnt = molCount(FM.mol), st = FM.strip;
    const marks = {};
    st.slots.forEach((s) => { if (!s.bad && !s.dying && !s.fly) marks[s.sym] = s.n === cnt[s.sym] ? COL.good : COL.sub; });
    const order = {};
    const mark = FM.mode === 'build' ? (i, p) => {
      const c = marks[p.sym]; if (!c) return null;
      order[p.sym] = (order[p.sym] || 0) + 1;
      return { color: c, tag: FM.mol.atoms.slice(0, i + 1).filter((a) => a[0] === p.sym).length };
    } : null;
    const msc = MOL_SC[FM.key] || 70;
    const P = drawMol(FM.mol, cx, cy - 6, { ang: FM.ang, tilt: 0.3, scale: msc, spread: FM.spread, mark });
    FM.lastP = P; FM.lastC = { x: cx, y: cy - 6 };
    // 범례 칩 (개수가 맞으면 ✔)
    const keys = Object.keys(FM.mol.f);
    const wTot = keys.length * 112;
    keys.forEach((sym, i) => {
      const x = cx - wTot / 2 + i * 112 + 56, y = 446;
      const s = st.slots.find((q) => q.sym === sym && !q.bad && !q.dying);
      const okc = s && s.n === cnt[sym];
      ctx.fillStyle = '#fff'; D.roundRect(x - 52, y - 15, 104, 30, 15); ctx.fill();
      ctx.strokeStyle = okc ? COL.good : '#cfd8e6'; ctx.lineWidth = okc ? 2.4 : 1.6; D.roundRect(x - 52, y - 15, 104, 30, 15); ctx.stroke();
      drawBall(sym, x - 34, y, 9.5, {});
      txt(sym + ' ' + EL[sym].name, x - 20, y + 5, 13.5, COL.ink, 'left', 800);
      if (okc) D.check(x + 40, y, 8, 1);
    });
  }
  function drawCorrespondence(t) {
    if (!(FM.cele && FM.mode === 'build' && FM.lastP)) return;
    const P = FM.lastP, cx = FM.lastC.x, cy = FM.lastC.y;
    const q = FM.cele.t / 0.9, a = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
    P.forEach((p) => {
      const to = FM.strip.symPos(p.sym); if (!to) return;
      const x0 = cx + p.x, y0 = cy + p.y, pr = clamp(q * 1.7, 0, 1);
      ctx.save(); ctx.strokeStyle = rgba('#7c3aed', 0.9 * a); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([2, 7]); ctx.lineDashOffset = -t * 40;
      const mx = (x0 + to.x) / 2, my = Math.min(y0, to.y) - 36;
      const e = ease.outCubic(pr), ex = lerp(x0, to.x, e), ey = lerp(y0, to.y, e);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(lerp(x0, mx, pr), lerp(y0, my, pr), ex, ey); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = rgba('#7c3aed', a); circle(ctx, ex, ey, 4); ctx.fill();
      ctx.restore();
    });
  }
  /* 화학식 읽기 카드 */
  function drawReadCard(t) {
    const R = { x: 438, y: 244, w: 346, h: 186 }, st = FM.strip;
    panel(R.x, R.y, R.w, R.h, 16, 'rgba(255,255,255,.93)', 12, 4);
    txt('📖 화학식 읽기', R.x + 14, R.y + 26, 15, COL.ink, 'left', 800);
    const live = st.slots.filter((s) => !s.bad && !s.dying && !s.fly);
    if (!live.length) { textBlock('원소 기호 타일을 눌러 화학식을 만들어 봐요. 숫자는 원자가 몇 개인지를 나타내요.', R.x + 14, R.y + 56, R.w - 28, 14, COL.muted, 'left', 20, 700); return; }
    live.forEach((s, i) => {
      const y = R.y + 60 + i * 36;
      drawBall(s.sym, R.x + 30, y - 6, 13, {});
      drawFormula([[s.sym, s.n]], R.x + 56, y + 2, 20, COL.ink, 'left');
      txt('= ' + EL[s.sym].name + ' 원자 ' + s.n + '개', R.x + 116, y + 1, 15, COL.ink, 'left', 800);
      if (s.n === 1) txt('(1은 쓰지 않아요)', R.x + R.w - 14, y + 1, 12.5, COL.muted, 'right', 700);
    });
    if (FM.done) { txt('원소 기호의 종류 ' + live.length + '가지 → ' + (live.length === 1 ? '원소' : '화합물'), R.x + 14, R.y + R.h - 14, 14, live.length === 1 ? COL.elem : COL.comp, 'left', 800); }
  }
  function drawQuizCards(t) {
    const R = { x: 438, y: 102, w: 346, h: 300 };
    panel(R.x, R.y, R.w, R.h, 16, 'rgba(255,255,255,.93)', 12, 4);
    txt('🔎 화학식 읽기', R.x + 14, R.y + 28, 15, COL.ink, 'left', 800);
    [['CO', [['C', 1], ['O', 1]], '일산화 탄소'], ['Co', [['Co', 1]], '코발트']].forEach((c, i) => {
      const x = R.x + 18 + i * 164, y = R.y + 50;
      ctx.fillStyle = '#f6f8fd'; D.roundRect(x, y, 146, 150, 14); ctx.fill();
      ctx.strokeStyle = '#d9e1ee'; ctx.lineWidth = 1.6; D.roundRect(x, y, 146, 150, 14); ctx.stroke();
      ctx.font = D.font(54, 800); const w = ctx.measureText(c[0]).width;
      txt(c[0], x + 73, y + 78, 54, COL.ink, 'center', 800);
    });
    textBlock('대문자와 소문자를 잘 보세요. 원소 기호가 몇 개인지 세어 봐요.', R.x + 18, R.y + 232, R.w - 36, 14.5, COL.muted, 'left', 21, 700);
  }
  SC.formula = {
    label: '🧩 입자 모형을 보고 화학식을 써요',
    hint: '원소 기호 타일을 눌러 화학식을 만들어요',
    enter() { fmSync(); buildTiles(); },
    update(dt) { fmUpdate(dt); },
    draw(t) {
      wall();
      drawModelStage(t);
      if (FM.mode === 'build') {
        txt('✏️ 화학식 띠', 438, 90, 15, COL.muted, 'left', 800);
        FM.strip.draw(t, { ok: FM.done });
        drawReadCard(t);
        drawCorrespondence(t);
      } else drawQuizCards(t);
    },
    hover(p) { const h = FM.mode === 'build' && FM.strip.hit(p); return h ? 'pointer' : null; },
    down(p) {
      if (FM.mode !== 'build') return false;
      const h = FM.strip.hit(p);
      if (!h) return false;
      if (h.kind === 'x') FM.strip.remove(h.i); else { FM.strip.sel = h.i; Sound.click(); refreshSub(); }
      return false;
    },
  };
  Object.assign(DBG, { FM, fmSet, makeStrip, molCount });

  /* =========================================================
     장면 4 · earth — 지구 환경 물질 도감
     ========================================================= */
  const SUBS = {
    ch4: { key: 'CH4', name: '메테인', el: false, at: { x: 214, y: 300 }, src: { x: 160, y: 372 }, tiles: ['C', 'H', 'O', 'N'],
      facts: ['소의 트림, 논, 쓰레기 매립지에서 나와요.', '같은 양이면 이산화 탄소보다 열을 훨씬 잘 가두는(약 28배, 100년 기준) 온실 기체예요.'] },
    o3: { key: 'O3', name: '오존', el: true, at: { x: 404, y: 100 }, src: { x: 404, y: 60 }, tiles: ['O', 'C', 'N', 'H'],
      facts: ['성층권의 오존층은 태양의 자외선을 막아 줘요.', '지표 근처의 오존은 눈과 호흡기를 해치는 대기 오염 물질이에요.'] },
    co2: { key: 'CO2', name: '이산화 탄소', el: false, at: { x: 612, y: 142 }, src: { x: 606, y: 196 }, given: true,
      facts: ['화석 연료가 탈 때 나오는 대표적인 온실 기체예요.', '공기의 약 0.04 %를 차지해요.'] },
    so2: { key: 'SO2', name: '이산화 황', el: false, at: { x: 700, y: 214 }, src: { x: 640, y: 236 }, given: true,
      facts: ['석탄·석유 속 황이 탈 때 나와 산성비의 원인이 돼요.'] },
    n2: { key: 'N2', name: '질소', el: true, at: { x: 130, y: 150 }, src: { x: 130, y: 150 }, given: true,
      facts: ['공기의 약 78 %를 차지해요.', '질소 원자 2개가 결합해 있어요.'] },
    hg: { key: 'Hg', name: '수은', el: true, at: { x: 728, y: 340 }, src: { x: 712, y: 400 }, given: true,
      facts: ['폐건전지·형광등의 수은이 흘러나오면 물과 땅을 오염시키고 생물 몸에 쌓여요(미나마타병).', '상온에서 액체인 금속이에요.'] },
    co: { key: 'CO', name: '일산화 탄소', el: false, at: { x: 468, y: 352 }, src: { x: 468, y: 420 }, tiles: ['C', 'O', 'H', 'N'], bonus: true,
      facts: ['연료가 불완전 연소할 때 생기는 유독한 기체예요.'] },
    nh3: { key: 'NH3', name: '암모니아', el: false, at: { x: 52, y: 262 }, src: { x: 80, y: 372 }, tiles: ['N', 'H', 'O', 'C'], bonus: true,
      facts: ['질소 비료·축산에서 나와 미세먼지 생성에 관여해요.'] },
  };
  const EA = {
    tiles: ['C', 'H', 'O', 'N'], open: null, chip: null, placed: {}, show: new Set(['ch4']), lit: {}, t: 0,
    bubbles: Object.keys(SUBS).map((id, i) => ({ id, sub: SUBS[id], mol: MOLS[SUBS[id].key], x: SUBS[id].at.x, y: SUBS[id].at.y, ph: i * 1.3, k: 0, ang: i })),
    puffs: [], burps: [], carX: -80, uvT: 0, shelfItems: [], finale: -1, ozone: 0, drops: [], pb: [],
  };
  const SHELF_R = { el: { x: 12, y: 468, w: 380, h: 46 }, co: { x: 408, y: 468, w: 380, h: 46 } };
  const eaCap = (comp) => (comp === 'co' && game && game.free ? 5 : 3);
  function eaReset() {
    EA.open = null; EA.chip = null; EA.placed = {}; EA.shelfItems = []; EA.lit = {}; EA.finale = -1; EA.ozone = 0;
    EA.bubbles.forEach((b) => { b.k = 0; });
    eaRefresh();
  }
  const eaDone = () => EA.shelfItems.length;
  const eaCount = (ids) => ids.filter((id) => EA.placed[id] === (SUBS[id].el ? 'el' : 'co')).length;
  function eaRefresh() {
    const has = !!(EA.open && !EA.open.strip.locked && !EA.open.closing && !EA.open.okT);
    const fc = $('#fmCtl'), nt = $('#earthNote');
    if (fc) fc.hidden = S.scene === 'earth' ? !(EA.open && !EA.open.strip.locked) : S.scene !== 'formula' || FM.mode !== 'build';
    if (nt) nt.hidden = !(S.scene === 'earth' && !(EA.open && !EA.open.strip.locked));
    if (nt && S.scene === 'earth') nt.textContent = EA.open ? '이 물질은 화학식이 적혀 있어요. 읽고 📒 도감에 담기를 눌러요.' : EA.chip ? '카드를 도감 칸으로 끌어 놓아요.' : '풍경 속 둥근 버블을 눌러 물질 카드를 열어요.';
    if (S.scene === 'earth') { EA.tiles = EA.open ? (EA.open.sub.tiles || tilesFor(EA.open.mol, 4)) : EA.tiles; buildTiles(); }
  }
  function openCard(b) {
    if (EA.open || EA.chip) return;
    const sub = b.sub, mol = b.mol, given = !!sub.given && !(game && game.free);
    const card = { x: 170, y: 82, w: 460, h: 306 };
    const st = makeStrip({ x: card.x + 20, y: card.y + 62, w: 420, h: 66 }, { compact: true, locked: given, gap: 10 });
    if (given) Object.keys(mol.f).forEach((s) => st.addSlot(s, mol.f[s], true));
    const o = { b, sub, mol, card, strip: st, k: 0, from: { x: b.x, y: b.y }, ang: 0.4, okT: 0, closing: null, shown: 0, given, age: 0 };
    st.onChange = () => { refreshSub(); };
    EA.open = o; Sound.click(); sfx.glug();
    tw(o, { k: 1 }, 0.45, (t) => outBack(t, 1.2), { essential: true });
    eaRefresh();
  }
  function closeCard(toChip) {
    const o = EA.open; if (!o || o.closing) return;
    o.closing = { chip: !!toChip, t: 0 };
    tw(o, { k: 0 }, 0.35, 'inCubic', { essential: true, onDone: () => { if (EA.open === o) EA.open = null; eaRefresh(); } });
    if (toChip) {
      const rest = { x: 400, y: 436 };
      EA.chip = { b: o.b, sub: o.sub, mol: o.mol, x: o.card.x + o.card.w / 2, y: o.card.y + o.card.h / 2, tx: rest.x, ty: rest.y, k: 0, lift: 0, hold: false, t: 0 };
      tw(EA.chip, { k: 1 }, 0.4, (t) => outBack(t, 1.5), { essential: true, delay: 0.1 });
      Sound.success();
    }
    eaRefresh();
  }
  function eaPlace(chip, comp) {
    const sub = chip.sub, id = chip.b.id;
    const correct = (sub.el && comp === 'el') || (!sub.el && comp === 'co');
    const cx = SHELF_R[comp].x + SHELF_R[comp].w / 2;
    if (!correct) {
      Sound.fail(); chip.shake = 0.5;
      const nk = Object.keys(sub && MOLS[sub.key].f).length;
      const msg = id === 'o3' ? '원자가 3개라도 모두 산소 원자예요. 원소 기호가 한 종류뿐이면?'
        : sub.el ? '원소 기호가 한 종류뿐이에요. 한 가지 원소로만 이루어졌으면 원소예요!'
          : '원소 기호가 ' + nk + '종류예요. 두 종류 이상이면 화합물이에요!';
      say(clamp(chip.x, 120, 680), SHELF_R[comp].y - 6, msg, { bg: COL.bad, maxW: 260, dur: 3.6 });
      chip.hold = false; return false;
    }
    const cap = eaCap(comp);
    if (EA.shelfItems.filter((q) => q.comp === comp).length >= cap) { say(cx, SHELF_R[comp].y - 6, '칸이 가득 찼어요', { bg: COL.warn }); return false; }
    EA.placed[id] = comp; EA.lit[id] = 1;
    const idx = EA.shelfItems.filter((q) => q.comp === comp).length;
    EA.shelfItems.push({ id, comp, sub, x: chip.x, y: chip.y, idx, k: 0, t: 0, from: { x: chip.x, y: chip.y } });
    okFx(slotPos(comp, idx).x, slotPos(comp, idx).y, comp === 'el' ? COL.elem : COL.comp, true);
    sfx.ding();
    EA.chip = null; eaRefresh();
    if (['ch4', 'o3', 'co2', 'so2', 'n2', 'hg'].every((q) => EA.placed[q])) { EA.finale = 0; }
    return true;
  }
  function slotPos(comp, idx) {
    const R = SHELF_R[comp], cap = eaCap(comp), w = Math.min(100, (R.w - 92) / cap - 4);
    return { x: R.x + 86 + idx * (w + 4) + w / 2, y: R.y + R.h / 2, w };
  }
  /* ---------- 배경 (미리 그려 두기) ---------- */
  let BGC = null;
  function buildEarthBG() {
    const k = 2, cv = document.createElement('canvas');
    cv.width = VW * k; cv.height = VH * k;
    const c = cv.getContext('2d'); c.scale(k, k);
    // 하늘
    const sk = c.createLinearGradient(0, 0, 0, 330);
    sk.addColorStop(0, '#2c5cc5'); sk.addColorStop(0.55, '#7fb4ee'); sk.addColorStop(1, '#d4e9ff');
    c.fillStyle = sk; c.fillRect(0, 0, VW, 340);
    // 태양
    const sg = c.createRadialGradient(34, 6, 4, 34, 6, 120);
    sg.addColorStop(0, 'rgba(255,244,190,.95)'); sg.addColorStop(0.25, 'rgba(255,230,140,.5)'); sg.addColorStop(1, 'rgba(255,230,140,0)');
    c.fillStyle = sg; c.fillRect(0, 0, 180, 160);
    c.fillStyle = '#ffe58a'; c.beginPath(); c.arc(34, 6, 30, 0, TAU); c.fill();
    c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(30, 2, 20, 0, TAU); c.fill();
    // 구름
    const cloud = (x, y, s) => { c.fillStyle = 'rgba(255,255,255,.85)'; [[0, 0, 22], [22, -8, 26], [50, 0, 20], [26, 8, 22]].forEach((q) => { c.beginPath(); c.arc(x + q[0] * s, y + q[1] * s, q[2] * s, 0, TAU); c.fill(); }); };
    cloud(250, 190, 0.8); cloud(520, 160, 0.6); cloud(70, 250, 0.7);
    // 멀리 있는 언덕
    c.fillStyle = '#a7dca0'; c.beginPath(); c.moveTo(0, 300); c.bezierCurveTo(120, 262, 240, 292, 360, 286); c.bezierCurveTo(480, 280, 600, 262, 800, 292); c.lineTo(800, 360); c.lineTo(0, 360); c.closePath(); c.fill();
    c.fillStyle = '#8fd08a'; c.beginPath(); c.moveTo(0, 330); c.bezierCurveTo(140, 300, 280, 330, 420, 318); c.bezierCurveTo(560, 306, 680, 322, 800, 306); c.lineTo(800, 520); c.lineTo(0, 520); c.closePath(); c.fill();
    // 앞쪽 풀밭
    const gg = c.createLinearGradient(0, 330, 0, 470);
    gg.addColorStop(0, '#7ccb74'); gg.addColorStop(1, '#58a85a');
    c.fillStyle = gg; c.beginPath(); c.moveTo(0, 346); c.bezierCurveTo(160, 330, 300, 352, 460, 342); c.bezierCurveTo(600, 334, 700, 348, 800, 338); c.lineTo(800, 470); c.lineTo(0, 470); c.closePath(); c.fill();
    // 논 (물 댄 밭)
    c.fillStyle = '#9fd9ee'; c.beginPath(); c.moveTo(300, 388); c.lineTo(470, 388); c.lineTo(486, 414); c.lineTo(284, 414); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(304, 396); c.lineTo(466, 396); c.moveTo(298, 405); c.lineTo(474, 405); c.stroke();
    c.fillStyle = '#5a9b45'; c.fillRect(280, 412, 210, 4);
    c.strokeStyle = '#4d9a3a'; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const x = 312 + i * 10.4, y = 402 + (i % 3) * 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 11); c.moveTo(x, y); c.lineTo(x + 3, y - 10); c.stroke(); }
    // 도로
    c.fillStyle = '#5a6272'; c.fillRect(0, 430, 650, 26);
    c.fillStyle = '#7a8394'; c.fillRect(0, 430, 650, 3);
    c.strokeStyle = '#f2e6a0'; c.lineWidth = 2.4; c.setLineDash([16, 12]); c.beginPath(); c.moveTo(0, 443); c.lineTo(650, 443); c.stroke(); c.setLineDash([]);
    // 개울
    const st = c.createLinearGradient(0, 372, 0, 456);
    st.addColorStop(0, '#6fb8ee'); st.addColorStop(1, '#3f93d6');
    c.fillStyle = st; c.beginPath(); c.moveTo(640, 366); c.bezierCurveTo(690, 372, 740, 366, 800, 360); c.lineTo(800, 440); c.bezierCurveTo(750, 452, 690, 446, 650, 458); c.lineTo(640, 458); c.closePath(); c.fill();
    c.fillStyle = '#6b5a45'; c.beginPath(); c.moveTo(640, 458); c.lineTo(640, 366); c.lineTo(648, 366); c.lineTo(648, 458); c.closePath(); c.fill();
    // 공장
    c.fillStyle = '#c2c9d6'; c.fillRect(520, 292, 96, 60);
    c.fillStyle = '#9aa3b4'; c.beginPath(); c.moveTo(520, 292); c.lineTo(540, 270); c.lineTo(540, 292); c.lineTo(560, 270); c.lineTo(560, 292); c.lineTo(580, 270); c.lineTo(580, 292); c.closePath(); c.fill();
    c.fillStyle = '#8b94a7'; c.fillRect(520, 340, 96, 12);
    c.fillStyle = '#ffd98a'; [[530, 304], [556, 304], [582, 304]].forEach((q) => { c.fillRect(q[0], q[1], 16, 14); });
    const ch = c.createLinearGradient(596, 0, 620, 0); ch.addColorStop(0, '#b4543c'); ch.addColorStop(0.5, '#d9704f'); ch.addColorStop(1, '#9a4430');
    c.fillStyle = ch; c.beginPath(); c.moveTo(600, 352); c.lineTo(603, 196); c.lineTo(619, 196); c.lineTo(622, 352); c.closePath(); c.fill();
    c.fillStyle = '#f4f1ea'; c.fillRect(602, 214, 18, 7); c.fillRect(602, 236, 18, 7);
    c.fillStyle = '#3a3f4b'; c.fillRect(600, 190, 24, 8);
    // 나무
    [[60, 346, 1], [770, 330, 0.9], [492, 326, 0.7]].forEach((q) => { c.fillStyle = '#7a5a3a'; c.fillRect(q[0] - 3 * q[2], q[1] - 6, 6 * q[2], 24 * q[2]); c.fillStyle = '#3f9a52'; c.beginPath(); c.arc(q[0], q[1] - 14 * q[2], 20 * q[2], 0, TAU); c.fill(); c.fillStyle = '#56b366'; c.beginPath(); c.arc(q[0] - 6 * q[2], q[1] - 20 * q[2], 11 * q[2], 0, TAU); c.fill(); });
    // 버려진 건전지 · 형광등
    const bg = c.createLinearGradient(0, 380, 0, 400); bg.addColorStop(0, '#aeb8c6'); bg.addColorStop(1, '#6b7587');
    c.save(); c.translate(704, 396); c.rotate(-0.4); c.fillStyle = bg; c.beginPath(); c.moveTo(-20, -7); c.lineTo(20, -7); c.lineTo(20, 7); c.lineTo(-20, 7); c.closePath(); c.fill(); c.fillStyle = '#3f9a52'; c.fillRect(-20, -7, 14, 14); c.fillStyle = '#ddd'; c.fillRect(20, -3, 4, 6); c.restore();
    c.save(); c.translate(752, 408); c.rotate(0.15); c.fillStyle = 'rgba(245,248,252,.95)'; c.strokeStyle = '#a8b3c4'; c.lineWidth = 1.4; c.beginPath(); c.roundRect ? c.roundRect(-34, -4, 68, 8, 4) : c.rect(-34, -4, 68, 8); c.fill(); c.stroke(); c.fillStyle = '#7b8596'; c.fillRect(-36, -5, 5, 10); c.fillRect(31, -5, 5, 10); c.restore();
    return cv;
  }
  function drawCow(x, y, s, flip, t, ph) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 1.4 + ph) * 0.8); ctx.scale(flip ? -s : s, s);
    ctx.fillStyle = 'rgba(30,60,30,.22)'; ctx.beginPath(); ctx.ellipse(6, 20, 38, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8eaee'; [[-22, 0], [-10, 2], [14, 0], [26, 2]].forEach((l) => { D.roundRect(l[0], l[1] - 6, 7, 24, 2); ctx.fill(); });
    ctx.fillStyle = '#444b57'; [[-22, 0], [-10, 2], [14, 0], [26, 2]].forEach((l) => { ctx.fillRect(l[0], l[1] + 14, 7, 4); });
    const gb = ctx.createLinearGradient(0, -36, 0, 4); gb.addColorStop(0, '#ffffff'); gb.addColorStop(1, '#dfe3ea');
    ctx.fillStyle = gb; D.roundRect(-32, -36, 68, 40, 17); ctx.fill();
    ctx.fillStyle = '#2f3440'; ctx.beginPath(); ctx.ellipse(-12, -24, 12, 8, 0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(14, -12, 9, 7, -0.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(22, -30, 7, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#d8dce4'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-31, -26); ctx.quadraticCurveTo(-42, -20, -38, -4); ctx.stroke();
    ctx.fillStyle = '#fff'; D.roundRect(30, -46, 28, 30, 11); ctx.fill();
    ctx.fillStyle = '#f4b6c2'; ctx.beginPath(); ctx.ellipse(52, -22, 9, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c47a8a'; ctx.beginPath(); ctx.arc(50, -23, 1.4, 0, TAU); ctx.arc(55, -23, 1.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(44, -36, 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9ced8'; ctx.beginPath(); ctx.ellipse(34, -44, 6, 3.2, -0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e9d9a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(40, -47); ctx.lineTo(38, -53); ctx.moveTo(49, -47); ctx.lineTo(51, -53); ctx.stroke();
    ctx.restore();
  }
  function drawCar(x, y, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 12, 34, 5, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(0, -20, 0, 8); g.addColorStop(0, '#ff7a7a'); g.addColorStop(1, '#d6343a');
    ctx.fillStyle = g; D.roundRect(-34, -10, 68, 20, 8); ctx.fill();
    ctx.fillStyle = '#e24a4f'; ctx.beginPath(); ctx.moveTo(-18, -10); ctx.lineTo(-10, -22); ctx.lineTo(14, -22); ctx.lineTo(24, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,230,255,.9)'; ctx.beginPath(); ctx.moveTo(-14, -11); ctx.lineTo(-8, -20); ctx.lineTo(0, -20); ctx.lineTo(0, -11); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, -11); ctx.lineTo(4, -20); ctx.lineTo(12, -20); ctx.lineTo(20, -11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b2f38'; [-18, 18].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, 10, 7, 0, TAU); ctx.fill(); ctx.fillStyle = '#aab2c0'; ctx.beginPath(); ctx.arc(wx, 10, 3, 0, TAU); ctx.fill(); ctx.fillStyle = '#2b2f38'; });
    ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(33, -2, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function puffDraw(p) {
    const a = p.a * (1 - p.t / p.life);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, rgba(p.c, a)); g.addColorStop(1, rgba(p.c, 0));
    ctx.fillStyle = g; circle(ctx, p.x, p.y, p.r); ctx.fill();
  }
  function ozoneBand(t) {
    const boost = EA.ozone;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, 74);
    for (let x = 0; x <= VW; x += 10) ctx.lineTo(x, 70 + Math.sin(x * 0.02 + t * 0.7) * 4 + Math.sin(x * 0.047 + t * 0.4) * 2);
    for (let x = VW; x >= 0; x -= 10) ctx.lineTo(x, 32 + Math.sin(x * 0.025 - t * 0.6) * 4 + Math.sin(x * 0.05 + t * 0.5) * 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 28, 0, 76);
    g.addColorStop(0, 'rgba(215,240,255,' + (0.3 + boost * 0.3) + ')'); g.addColorStop(0.5, 'rgba(190,230,255,' + (0.55 + boost * 0.3) + ')'); g.addColorStop(1, 'rgba(215,240,255,' + (0.25 + boost * 0.25) + ')');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 + boost * 0.3) + ')'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    D.label(560, 54, '오존층(지상 약 20~30 km)', { bg: 'rgba(20,50,120,.55)', size: 13, pad: 10 });
  }
  function uvArrows(t) {
    // 태양에서 내려오다가 오존층에서 흩어지는 자외선
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.34 + i / 3) % 1), x0 = 60 + i * 52, y0 = -20, x1 = 150 + i * 70, y1 = 34 + i * 2;
      const p = Math.min(1, ph / 0.8);
      const x = lerp(x0, x1, p), y = lerp(y0, y1, p);
      if (ph < 0.8) {
        const ang = Math.atan2(y1 - y0, x1 - x0);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.strokeStyle = 'rgba(190,120,255,.95)'; ctx.fillStyle = 'rgba(190,120,255,.95)'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-3, -5.5); ctx.lineTo(-3, 5.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        const q = (ph - 0.8) / 0.2;
        for (let k = 0; k < 4; k++) { const a = -0.6 + k * 0.55, r = 4 + q * 20; ctx.fillStyle = 'rgba(190,120,255,' + (0.8 * (1 - q)).toFixed(2) + ')'; circle(ctx, x1 + Math.cos(a) * r, y1 + Math.sin(a) * r * 0.6 - 2, 2.4 * (1 - q * 0.5)); ctx.fill(); }
      }
    }
    txt('자외선', 150, 22, 13, 'rgba(226,205,255,.95)', 'left', 800);
  }
  function eaUpdate(dt) {
    EA.t += dt;
    const t = EA.t;
    // 연기 · 배기가스 · 트림
    if (!RM || Math.random() < 0.5) {
      EA.smokeAcc = (EA.smokeAcc || 0) + dt;
      if (EA.smokeAcc > (RM ? 0.7 : 0.38)) { EA.smokeAcc = 0; EA.puffs.push({ x: 612 + rand(-3, 3), y: 190, vx: rand(10, 22), vy: rand(-26, -18), r: 8, grow: 14, t: 0, life: 4.2, a: 0.7, c: '#8a93a3' }); }
    }
    EA.carX += dt * 52; if (EA.carX > 700) EA.carX = -80;
    EA.carAcc = (EA.carAcc || 0) + dt;
    if (EA.carAcc > 0.5 && EA.carX < 640) { EA.carAcc = 0; EA.puffs.push({ x: EA.carX - 36, y: 438, vx: -16, vy: -12, r: 4, grow: 9, t: 0, life: 1.6, a: 0.5, c: '#6b7280' }); }
    EA.burpT = (EA.burpT || 3) - dt;
    if (EA.burpT <= 0) { EA.burpT = rand(4.5, 7); const c = Math.random() < 0.5 ? [150, 352, false] : [238, 372, true]; EA.puffs.push({ x: c[0] + (c[2] ? -34 : 40), y: c[1] - 26, vx: c[2] ? -12 : 12, vy: -16, r: 5, grow: 11, t: 0, life: 2.2, a: 0.55, c: '#9fb08a' }); }
    EA.pbAcc = (EA.pbAcc || 0) + dt;
    if (EA.pbAcc > 0.7) { EA.pbAcc = 0; EA.pb.push({ x: rand(318, 460), y: 408, t: 0 }); }
    for (let i = EA.pb.length - 1; i >= 0; i--) { EA.pb[i].t += dt; if (EA.pb[i].t > 1.4) EA.pb.splice(i, 1); }
    EA.dropAcc = (EA.dropAcc || 0) + dt;
    if (EA.dropAcc > 1.6) { EA.dropAcc = 0; EA.drops.push({ x: 696 + rand(-2, 2), y: 400, t: 0 }); }
    for (let i = EA.drops.length - 1; i >= 0; i--) { EA.drops[i].t += dt; if (EA.drops[i].t > 1.1) EA.drops.splice(i, 1); }
    for (let i = EA.puffs.length - 1; i >= 0; i--) { const p = EA.puffs[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.grow * dt; if (p.t > p.life) EA.puffs.splice(i, 1); }
    // 버블 보이기 / 숨기기
    EA.bubbles.forEach((b) => {
      const want = eaVisible(b) ? 1 : 0;
      b.k = SciSim.approach(b.k, want, dt, 6);
      if (Math.abs(b.k - want) < 0.004) b.k = want;
      b.ang += dt * 0.5 * (RM ? 0 : 1);
      if (EA.lit[b.id] > 0) EA.lit[b.id] = Math.max(0.55, EA.lit[b.id] - dt * 0.3);
    });
    if (EA.open) { EA.open.ang += dt * (RM ? 0 : 0.7); EA.open.age += dt; EA.open.strip.update(dt); eaCardCheck(dt); }
    if (EA.chip) {
      const c = EA.chip;
      c.t += dt; c.lift = SciSim.approach(c.lift, c.hold ? 1 : 0, dt, 18);
      if (!c.hold) { c.x = SciSim.approach(c.x, c.tx, dt, 9); c.y = SciSim.approach(c.y, c.ty, dt, 9); }
      if (c.shake > 0) c.shake -= dt;
    }
    EA.shelfItems.forEach((s) => {
      s.t += dt; const sp = slotPos(s.comp, s.idx);
      const q = clamp(s.t / 0.5, 0, 1); const e = outBack(q, 1.3);
      s.x = lerp(s.from.x, sp.x, e); s.y = lerp(s.from.y, sp.y, e); s.k = Math.min(1, s.t / 0.2);
    });
    if (EA.finale >= 0) { EA.finale += dt; EA.ozone = Math.min(1, EA.finale / 1.6); if (EA.finale > 2.4) EA.finale = 99; }
  }
  function eaVisible(b) {
    if (EA.chip && EA.chip.b === b) return false;
    if (game && game.free) return true;
    return EA.show.has(b.id) && !EA.placed[b.id];
  }
  function eaCardCheck(dt) {
    const o = EA.open; if (!o || o.closing) return;
    if (o.given) return;
    const okNow = stripMatches(o.strip, o.mol);
    if (okNow) {
      if (!o.okT) { o.okT = 0.001; okFx(o.card.x + 230, o.card.y + 96, COL.good, true); Sound.success(); }
      o.okT += dt;
      if (o.okT > 1.0) {
        const placed = EA.placed[o.b.id];
        if (placed) { closeCard(false); toast('📒 도감에 이미 있는 물질이에요.'); }
        else closeCard(true);
      }
    } else o.okT = 0;
  }
  /* ---------- 그리기 ---------- */
  function drawBubbleOrb(b, t, op) {
    if (b.k < 0.01) return;
    const sub = b.sub, fl = Math.sin(t * 1.1 + b.ph) * 5, x = b.x, y = b.y + fl, R = 36 * (0.55 + 0.45 * ease.outBack(clamp(b.k, 0, 1), 1.5)), a = clamp(b.k, 0, 1);
    const placed = !!EA.placed[b.id];
    ctx.save(); ctx.globalAlpha = a * (placed ? 0.55 : 1);
    // 그림자 (공중이므로 부드럽게)
    const sg = ctx.createRadialGradient(x, y + 46, 2, x, y + 46, 30); sg.addColorStop(0, 'rgba(20,30,70,.28)'); sg.addColorStop(1, 'rgba(20,30,70,0)');
    ctx.save(); ctx.translate(0, 0); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x, y + 46, 30, 8, 0, 0, TAU); ctx.fill(); ctx.restore();
    // 유리구슬
    const gg = ctx.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R);
    gg.addColorStop(0, 'rgba(255,255,255,.55)'); gg.addColorStop(0.7, 'rgba(235,245,255,.35)'); gg.addColorStop(1, 'rgba(170,200,240,.55)');
    ctx.fillStyle = gg; circle(ctx, x, y, R); ctx.fill();
    // 안쪽 입자 모형
    ctx.save(); circle(ctx, x, y, R - 2); ctx.clip();
    const sc = (R / 36) * ({ CO2: 23, SO2: 22, O3: 24, Hg: 24, CH4: 30, N2: 31, CO: 31, NH3: 28 }[sub.key] || 26);
    drawMol(b.mol, x, y - 1, { ang: b.ang, tilt: 0.3, scale: sc, shadow: false });
    ctx.restore();
    // 테두리 · 반사
    const rg = ctx.createLinearGradient(x - R, y - R, x + R, y + R); rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(0.5, 'rgba(160,190,235,.6)'); rg.addColorStop(1, 'rgba(110,150,215,.85)');
    ctx.strokeStyle = rg; ctx.lineWidth = 2.6; circle(ctx, x, y, R); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(x, y, R - 6, Math.PI * 1.12, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(x - R * 0.42, y - R * 0.5, R * 0.16, R * 0.09, -0.7, 0, TAU); ctx.fill();
    ctx.restore();
    // 이름표 (화학식이 적힌 버블은 화학식도)
    if (a > 0.8) {
      const given = sub.given && game && !game.free;
      const nameTxt = sub.name;
      ctx.save(); ctx.globalAlpha = a * (placed ? 0.6 : 1);
      if (given) {
        ctx.font = D.font(14, 800); const nw = ctx.measureText(nameTxt).width;
        const parts = fParts(MOLS[sub.key].f, Object.keys(MOLS[sub.key].f)); const fw = formulaWidth(parts, 16);
        const w = nw + fw + 34;
        ctx.fillStyle = 'rgba(20,30,70,.78)'; D.roundRect(x - w / 2, y + R + 6, w, 26, 13); ctx.fill();
        txt(nameTxt, x - w / 2 + 12, y + R + 24, 14, '#fff', 'left', 800);
        drawFormula(parts, x - w / 2 + 22 + nw, y + R + 25, 16, '#ffe27a', 'left');
      } else D.label(x, y + R + 18, nameTxt, { bg: 'rgba(20,30,70,.78)', size: 14, pad: 10 });
      ctx.restore();
    }
    if (placed) D.check(x + R * 0.7, y - R * 0.7, 11, 1);
    // 눌러 보라는 표시
    const active = eaVisible(b) && !placed && !EA.open && !EA.chip && !(game && game.free);
    if (active && a > 0.9) D.ring(x, y, R + 5, t, { color: '#ffd23f', speed: 1 });
  }
  function drawSources(t) {
    // 도감에 넣은 물질의 오염원이 살짝 밝아진다
    Object.keys(EA.lit).forEach((id) => {
      const s = SUBS[id].src, k = EA.lit[id];
      D.glow(s.x, s.y, 54, '#fff7c2', 0.5 * k + 0.1);
    });
  }
  function drawCard(t) {
    const o = EA.open; if (!o) return;
    const C = o.card, k = o.k;
    if (k < 0.01) return;
    const mx = C.x + C.w / 2, my = C.y + C.h / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(20,30,70,' + (0.35 * clamp(k, 0, 1)).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH);
    // 시작점(버블)에서 카드 가운데로 커짐
    const ox = lerp(o.from.x, mx, clamp(k, 0, 1)), oy = lerp(o.from.y, my, clamp(k, 0, 1));
    ctx.translate(ox, oy); ctx.scale(Math.max(0.01, k), Math.max(0.01, k)); ctx.translate(-mx, -my);
    ctx.globalAlpha = clamp(k * 1.4, 0, 1);
    panel(C.x, C.y, C.w, C.h, 20, 'rgba(255,255,255,.97)', 26, 10, 'rgba(10,20,60,.4)');
    // 머리글
    txt(o.sub.name, C.x + 24, C.y + 40, 24, COL.ink, 'left', 800);
    if (!o.sub.given && !stripMatches(o.strip, o.mol)) txt('원소 기호 타일로 화학식을 써요', C.x + C.w - 62, C.y + 38, 13.5, COL.muted, 'right', 700);
    // 닫기 버튼
    ctx.fillStyle = '#eef1f7'; circle(ctx, C.x + C.w - 30, C.y + 28, 17); ctx.fill();
    txt('×', C.x + C.w - 30, C.y + 36, 24, '#5d6879', 'center', 800);
    // 화학식 띠
    o.strip.draw(t, { ok: stripMatches(o.strip, o.mol) });
    // 모형 + 설명
    const my2 = C.y + 222;
    const g = ctx.createRadialGradient(C.x + 100, my2, 10, C.x + 100, my2, 96); g.addColorStop(0, 'rgba(196,181,253,.5)'); g.addColorStop(1, 'rgba(221,214,254,0)');
    ctx.fillStyle = g; circle(ctx, C.x + 100, my2, 96); ctx.fill();
    const sc = o.sub.key === 'CO2' || o.sub.key === 'SO2' || o.sub.key === 'O3' ? 34 : o.sub.key === 'Hg' ? 34 : 40;
    drawMol(o.mol, C.x + 100, my2 - 4, { ang: o.ang, tilt: 0.3, scale: sc, rs: 1 });
    let yy = C.y + 176;
    o.sub.facts.forEach((f) => { yy += textBlock('• ' + f, C.x + 214, yy + 4, C.w - 236, 13.5, '#2b3445', 'left', 19, 700) + 6; });
    if (o.given) {
      txt('화학식을 읽어 봐요', C.x + 24, C.y + C.h - 18, 13.5, COL.sub, 'left', 800);
      const B = takeBtn(o), a = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = o.age > 0.8 ? COL.sub : '#c9c3e6'; D.roundRect(B.x, B.y, B.w, B.h, 19); ctx.fill();
      if (o.age > 0.8) { ctx.strokeStyle = rgba(COL.sub, 0.3 + 0.3 * a); ctx.lineWidth = 4; D.roundRect(B.x - 3, B.y - 3, B.w + 6, B.h + 6, 22); ctx.stroke(); }
      txt('📒 도감에 담기', B.x + B.w / 2, B.y + 25, 15, '#fff', 'center', 800);
    } else if (stripMatches(o.strip, o.mol)) txt('정답이에요! 도감 카드로 바뀌어요', C.x + 214, C.y + C.h - 16, 13.5, COL.good, 'left', 800);
    ctx.restore();
  }
  const takeBtn = (o) => ({ x: o.card.x + o.card.w - 172, y: o.card.y + o.card.h - 52, w: 152, h: 38 });
  function drawChip(c, t) {
    const w = 168, h = 42;
    ctx.save();
    const sc = c.k * (1 + c.lift * 0.08);
    ctx.translate(c.x + (c.shake > 0 ? Math.sin(c.shake * 60) * 5 : 0), c.y); ctx.scale(sc, sc);
    if (!c.hold && c.k >= 1) { const a = 0.5 + 0.5 * Math.sin(t * 5); D.glow(0, 0, 70, '#ffd23f', 0.2 + 0.2 * a); }
    softShadow(-w / 2, -h / 2, w, h, 21, 10 + c.lift * 8, 4 + c.lift * 6, 'rgba(20,30,70,' + (0.28 + c.lift * 0.12) + ')');
    ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 21); ctx.fill();
    ctx.strokeStyle = c.sub.el ? COL.elem : COL.comp; ctx.lineWidth = 3; D.roundRect(-w / 2, -h / 2, w, h, 21); ctx.stroke();
    const parts = fParts(MOLS[c.sub.key].f, Object.keys(MOLS[c.sub.key].f));
    drawFormula(parts, -w / 2 + 16, 8, 22, COL.ink, 'left');
    txt(c.sub.name, w / 2 - 14, 6, 14, COL.muted, 'right', 800);
    ctx.restore();
    if (!c.hold && c.k >= 1 && c.t > 0.6) {
      const ay = c.y - 36 + Math.sin(t * 6) * 3;
      txt('⬇ 원소 칸 또는 화합물 칸으로 끌어요', c.x, ay, 14, '#4c1d95', 'center', 800, { stroke: 'rgba(255,255,255,.95)', strokeWidth: 5 });
    }
  }
  function drawShelf(t) {
    ['el', 'co'].forEach((comp) => {
      const R = SHELF_R[comp], c = comp === 'el' ? COL.elem : COL.comp;
      const hot = EA.chip && EA.chip.hold && EA.chip.x > R.x && EA.chip.x < R.x + R.w && EA.chip.y > R.y - 24;
      panel(R.x, R.y, R.w, R.h, 14, hot ? mix('#ffffff', c, 0.12) : '#fff', 10, 3);
      ctx.strokeStyle = hot ? c : rgba(c, 0.55); ctx.lineWidth = hot ? 4 : 2.2; D.roundRect(R.x, R.y, R.w, R.h, 14); ctx.stroke();
      ctx.fillStyle = c; D.roundRect(R.x + 6, R.y + 6, 74, R.h - 12, 10); ctx.fill();
      txt(comp === 'el' ? '📒 원소' : '📒 화합물', R.x + 43, R.y + R.h / 2 + 5, 13.5, '#fff', 'center', 800);
      const cap = eaCap(comp);
      for (let i = 0; i < cap; i++) {
        const sp = slotPos(comp, i);
        ctx.strokeStyle = rgba(c, 0.4); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; D.roundRect(sp.x - sp.w / 2, sp.y - 16, sp.w, 32, 16); ctx.stroke(); ctx.setLineDash([]);
      }
    });
    EA.shelfItems.forEach((s) => {
      const sp = slotPos(s.comp, s.idx), c = s.comp === 'el' ? COL.elem : COL.comp;
      const parts = fParts(MOLS[s.sub.key].f, Object.keys(MOLS[s.sub.key].f));
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(0.7 + 0.3 * s.k, 0.7 + 0.3 * s.k);
      ctx.fillStyle = '#fff'; D.roundRect(-sp.w / 2, -16, sp.w, 32, 16); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2.2; D.roundRect(-sp.w / 2, -16, sp.w, 32, 16); ctx.stroke();
      const fw = formulaWidth(parts, 17);
      drawFormula(parts, -sp.w / 2 + 10, 6, 17, COL.ink, 'left');
      if (sp.w > 74) txt(s.sub.name.length > 4 ? s.sub.name.slice(0, 4) : s.sub.name, sp.w / 2 - 6, 5, 11.5, COL.muted, 'right', 800);
      ctx.restore();
    });
  }
  function drawFinale(t) {
    if (EA.finale < 0 || EA.finale > 2.4) return;
    const q = EA.finale / 1.6, x = lerp(-120, VW + 120, clamp(q, 0, 1));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 100, 0, x + 100, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,248,200,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 100, 0, 200, 466);
    ctx.restore();
    if (!EA.finaleFx && q > 0.05) { EA.finaleFx = true; for (let i = 0; i < 14; i++) FX.emit({ x: rand(40, 760), y: rand(60, 380), vx: 0, vy: rand(-20, -6), life: rand(0.9, 1.6), size: rand(3, 5.5), color: i % 2 ? '#fff6c2' : '#ffd23f', shape: 'star', rot: rand(0, 6), vr: 2 }); }
  }
  SC.earth = {
    label: '🌏 지구 환경 물질 도감을 채워요',
    hint: '풍경 속 둥근 버블을 눌러 물질 카드를 열어요',
    enter() { if (!BGC) BGC = buildEarthBG(); eaRefresh(); },
    update(dt) { eaUpdate(dt); },
    draw(t) {
      if (!BGC) BGC = buildEarthBG();
      ctx.drawImage(BGC, 0, 0, VW, VH);
      ozoneBand(t); uvArrows(t);
      drawSources(t);
      // 풍경 속 움직임
      drawCow(150, 372, 1, false, t, 0); drawCow(244, 386, 0.9, true, t, 2);
      EA.pb.forEach((b) => { const k = b.t / 1.4; ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(2) + ')'; ctx.lineWidth = 1.4; circle(ctx, b.x, b.y - k * 14, 2 + k * 2.2); ctx.stroke(); });
      EA.drops.forEach((d) => { const k = d.t / 1.1; ctx.fillStyle = 'rgba(210,218,230,' + (1 - k * 0.6).toFixed(2) + ')'; circle(ctx, d.x, d.y + k * 20 * k * 3, 2.6 - k); ctx.fill(); if (k > 0.8) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(d.x, 421, (k - 0.8) * 30, (k - 0.8) * 8, 0, 0, TAU); ctx.stroke(); } });
      // 개울 물결
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6;
      for (let l = 0; l < 3; l++) { ctx.beginPath(); for (let x = 652; x <= 796; x += 6) { const yy = 414 + l * 10 - (x - 652) * 0.1 + Math.sin(x * 0.09 - t * 2 + l) * 1.6; x === 652 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
      ctx.restore();
      drawCar(EA.carX, 436, t);
      EA.puffs.forEach(puffDraw);
      // 버블 (카드가 열린 동안에는 흐리게)
      EA.bubbles.forEach((b) => { if (EA.open && EA.open.b === b) { const bb = Object.assign({}, b); bb.k = Math.max(0, b.k * (1 - EA.open.k)); drawBubbleOrb(bb, t); } else drawBubbleOrb(b, t); });
      drawFinale(t);
      drawShelf(t);
      drawCard(t);
      if (EA.chip) drawChip(EA.chip, t);
    },
    hover(p) {
      if (EA.open) return null;
      if (EA.chip && Math.hypot(p.x - EA.chip.x, p.y - EA.chip.y) < 60) return 'grab';
      return EA.bubbles.some((b) => b.k > 0.5 && Math.hypot(p.x - b.x, p.y - b.y) < 42) ? 'pointer' : null;
    },
    down(p) {
      if (EA.open) {
        const o = EA.open, C = o.card;
        if (o.closing) return false;
        if (Math.hypot(p.x - (C.x + C.w - 30), p.y - (C.y + 28)) < 24) { closeCard(false); Sound.click(); return false; }
        if (o.given) {
          const B = takeBtn(o);
          if (p.x > B.x - 6 && p.x < B.x + B.w + 6 && p.y > B.y - 6 && p.y < B.y + B.h + 6) {
            if (o.age < 0.8) return false;
            if (EA.placed[o.b.id]) { closeCard(false); toast('📒 도감에 이미 있는 물질이에요.'); } else closeCard(true);
            return false;
          }
        }
        if (p.x < C.x || p.x > C.x + C.w || p.y < C.y || p.y > C.y + C.h) { closeCard(false); Sound.click(); return false; }
        const h = o.strip.hit(p);
        if (h && !o.strip.locked) { if (h.kind === 'x') o.strip.remove(h.i); else { o.strip.sel = h.i; Sound.click(); refreshSub(); } }
        return false;
      }
      if (EA.chip && EA.chip.k > 0.9) {
        const c = EA.chip;
        if (Math.abs(p.x - c.x) < 90 && Math.abs(p.y - c.y) < 30) { c.hold = true; c.ox = c.x - p.x; c.oy = c.y - p.y; sfx.glug(); hideHint(); return true; }
      }
      for (const b of EA.bubbles) {
        if (b.k > 0.5 && Math.hypot(p.x - b.x, p.y - (b.y + Math.sin(EA.t * 1.1 + b.ph) * 5)) < 44) {
          if (!eaVisible(b)) continue;
          if (EA.chip) { say(400, 400, '먼저 카드를 도감 칸에 넣어요', { bg: COL.warn }); return false; }
          hideHint(); openCard(b); return false;
        }
      }
      return false;
    },
    move(p) { const c = EA.chip; if (!c || !c.hold) return; c.x = clamp(p.x + c.ox, 90, 710); c.y = clamp(p.y + c.oy, 60, 500); },
    up(p) {
      const c = EA.chip; if (!c || !c.hold) return;
      c.hold = false;
      const comp = ['el', 'co'].find((k) => c.x > SHELF_R[k].x && c.x < SHELF_R[k].x + SHELF_R[k].w && c.y > SHELF_R[k].y - 28);
      if (comp) eaPlace(c, comp);
    },
  };
  Object.assign(DBG, { EA, SUBS, eaReset, openCard, closeCard, eaPlace, SHELF_R, slotPos });

  /* =========================================================
     장면 전환 · UI · 입력
     ========================================================= */
  const ready = {};
  function setScene(name, reset) {
    const changed = S.scene !== name;
    S.scene = name;
    if (changed) { S.sceneT = 0; FX.clear(); BUB.length = 0; }
    const sc = SC[name];
    if (sc.enter) sc.enter(!!reset);
    $('#tbLabel').textContent = sc.label;
    if (changed || reset) showHint(sc.hint, 6500);
    refreshUI();
  }
  let lastFree = null;
  function refreshUI() {
    $$('[data-sc]').forEach((node) => {
      const scs = node.getAttribute('data-sc').split(/\s+/);
      node.hidden = scs.indexOf(S.scene) < 0;
    });
    refreshElectroUI(); eaRefresh(); dcRefresh();
    const free = !!(game && game.free);
    $('#sceneSeg').hidden = !free;
    $('#tbLabel').hidden = free && window.innerWidth < 1000;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    const card = $('#ctrlCard');
    card.hidden = !Array.from(card.children).some((n) => !n.hidden);
    refreshSub();
    lastFree = free;
  }
  $('#gogglesBtn').addEventListener('click', () => { wearGoggles(); });
  $('#powerBtn').addEventListener('click', () => { setPower(!EZ.power); });
  $('#decBtn').addEventListener('click', () => { Sound.click(); dcStart(); });
  $('#subUp').addEventListener('click', () => { const st = curStrip(); if (st) { st.inc(1); refreshSub(); } });
  $('#subDown').addEventListener('click', () => { const st = curStrip(); if (st) { st.inc(-1); refreshSub(); } });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'electro') { ezReset(true); showHint(SC.electro.hint, 4000); }
    else if (S.scene === 'decomp') { dcReset(); showHint(SC.decomp.hint, 4000); }
    else if (S.scene === 'formula') { FM.strip.clear(); FM.done = false; FM.wasOk = false; showHint(SC.formula.hint, 4000); }
    else if (S.scene === 'earth') {
      if (game && game.free) eaReset();
      else { if (EA.open) closeCard(false); if (EA.chip) { EA.chip = null; } eaRefresh(); }
      showHint(SC.earth.hint, 4000);
    }
    refreshUI();
  });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click();
    const to = b.dataset.scene;
    setScene(to, false);
    if (to === 'electro') { EZ.toolsOn = true; }
    if (to === 'formula' && FM.mode !== 'build') fmFree(0);
    if (to === 'decomp') dcRefresh();
    if (to === 'earth') { EA.show = new Set(Object.keys(SUBS)); eaRefresh(); }
  }));

  /* 자유 탐구: 모형을 눌러 다른 물질로 바꾸기 */
  const FREE_MOLS = ['H2O', 'O2', 'CO', 'CO2', 'CH4', 'NH3', 'N2', 'O3', 'SO2'];
  const TILE_ORDER = ['H', 'C', 'N', 'O', 'S', 'Cl'];
  function tilesFor(mol, n) {
    const need = Object.keys(mol.f), pool = TILE_ORDER.filter((s) => need.indexOf(s) < 0);
    return need.concat(pool.slice(0, Math.max(0, (n || 4) - need.length))).sort((a, b) => TILE_ORDER.indexOf(a) - TILE_ORDER.indexOf(b));
  }
  let freeIdx = 0;
  function fmFree(d) {
    freeIdx = (freeIdx + d + FREE_MOLS.length) % FREE_MOLS.length;
    const key = FREE_MOLS[freeIdx], mol = MOLS[key];
    fmSet(key, tilesFor(mol, 5), mol.name + ' 입자 모형', 'build');
    refreshUI();
  }

  /* 입력 */
  SciSim.pointer(view, {
    hover(p) { const s = SC[S.scene]; return s && s.hover ? s.hover(p) : null; },
    down(p, e) {
      hideHint();
      const s = SC[S.scene];
      if (s && s.down && s.down(p, e)) { DR.fn = s; return true; }
      // 자유 탐구: 입자 모형을 누르면 다음 물질
      if (S.scene === 'formula' && game && game.free && FM.mode === 'build' && Math.hypot(p.x - 226, p.y - 240) < 150) { fmFree(1); Sound.click(); }
      return false;
    },
    move(p, e) { if (DR.fn && DR.fn.move) DR.fn.move(p, e); },
    up(p, e) { const s = DR.fn; DR.fn = null; if (s && s.up) s.up(p, e); },
  });

  // 휴대폰: 캔버스 위에서도 페이지를 세로로 밀 수 있게 하고, 끌 수 있는 물체를 잡았을 때만 스크롤을 막는다
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
    // 장면 밖에서도 진행 중인 기체 확인 연출은 계속
    if (S.scene !== 'electro' && EZ.test) testUpdate(dt);
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
  let lastPhase = '', lastIdx = -1;
  function watchGame() {
    if (!game) return;
    const ph = game.phase, idx = game.index;
    if (ph === 'success' && (lastPhase !== 'success' || lastIdx !== idx)) {
      const m = game.current();
      if (m && m.onWin) { try { m.onWin(); } catch (e) { console.error(e); } }
    }
    lastPhase = ph; lastIdx = idx;
  }

  /* =========================================================
     미션
     ========================================================= */
  const fHTML = (parts) => parts.map((p) => p[0] + (p[1] > 1 ? '<sub>' + p[1] + '</sub>' : '')).join('');
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const NOBUN = '<span class="mono">';
  // 퀴즈 그림: CO 와 Co
  function svgBall(cx, cy, r, c, c2, sym, ink, id) {
    return '<defs><radialGradient id="' + id + '" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="' + c2 + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + shade(c, -0.38) + '"/></radialGradient></defs>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + id + ')"/><ellipse cx="' + (cx - r * 0.33) + '" cy="' + (cy - r * 0.42) + '" rx="' + r * 0.3 + '" ry="' + r * 0.17 + '" fill="#fff" opacity=".55" transform="rotate(-35 ' + (cx - r * 0.33) + ' ' + (cy - r * 0.42) + ')"/>' +
      (sym ? '<text x="' + cx + '" y="' + (cy + r * 0.28) + '" text-anchor="middle" font-size="' + Math.round(r * 0.8) + '" font-weight="800" fill="' + ink + '" font-family="sans-serif">' + sym + '</text>' : '');
  }
  const FIG_CO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 178" width="320" role="img" aria-label="왼쪽: 탄소 원자와 산소 원자가 결합한 일산화 탄소(CO), 오른쪽: 푸른 은빛 금속 코발트(Co)">' +
    '<rect x="2" y="2" width="160" height="174" rx="14" fill="#f6f8fd" stroke="#d9e1ee" stroke-width="2"/><rect x="178" y="2" width="160" height="174" rx="14" fill="#f6f8fd" stroke="#d9e1ee" stroke-width="2"/>' +
    svgBall(60, 62, 30, '#3a3f4b', '#7a8394', 'C', '#fff', 'gc') + svgBall(104, 62, 29, '#ef4b4b', '#ffb3b3', 'O', '#fff', 'go') +
    '<text x="82" y="112" text-anchor="middle" font-size="22" font-weight="800" fill="#1b2333" font-family="sans-serif">CO</text><text x="82" y="130" text-anchor="middle" font-size="14" font-weight="800" fill="#5d6879" font-family="sans-serif">일산화 탄소</text><text x="82" y="147" text-anchor="middle" font-size="12.5" font-weight="700" fill="#7a8394" font-family="sans-serif">불완전 연소 때 생기는</text><text x="82" y="163" text-anchor="middle" font-size="12.5" font-weight="700" fill="#7a8394" font-family="sans-serif">유독한 기체</text>' +
    '<defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfe9fb"/><stop offset=".5" stop-color="#7f9fd3"/><stop offset="1" stop-color="#3f5f9a"/></linearGradient></defs><path d="M222 78 L244 44 L282 40 L300 66 L292 94 L254 100 Z" fill="url(#gm)" stroke="#34507f" stroke-width="2"/><path d="M244 44 L262 70 L292 94 M262 70 L222 78" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6"/>' +
    '<text x="262" y="112" text-anchor="middle" font-size="22" font-weight="800" fill="#1b2333" font-family="sans-serif">Co</text><text x="262" y="130" text-anchor="middle" font-size="14" font-weight="800" fill="#5d6879" font-family="sans-serif">코발트</text><text x="262" y="147" text-anchor="middle" font-size="12.5" font-weight="700" fill="#7a8394" font-family="sans-serif">배터리 재료로</text><text x="262" y="163" text-anchor="middle" font-size="12.5" font-weight="700" fill="#7a8394" font-family="sans-serif">쓰이는 금속</text></svg>';
  const FIG_HE_FE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 112" width="300" role="img" aria-label="왼쪽: 헬륨 원자가 띄엄띄엄 떨어져 있는 모습, 오른쪽: 철 원자가 촘촘히 모여 있는 모습">' +
    '<rect x="2" y="2" width="158" height="108" rx="12" fill="#f6f8fd" stroke="#d9e1ee" stroke-width="2"/><rect x="170" y="2" width="158" height="108" rx="12" fill="#f6f8fd" stroke="#d9e1ee" stroke-width="2"/>' +
    svgBall(34, 34, 13, '#7fd8e8', '#d6f6fb', 'He', '#0f4a57', 'h1') + svgBall(112, 28, 13, '#7fd8e8', '#d6f6fb', 'He', '#0f4a57', 'h2') + svgBall(78, 62, 13, '#7fd8e8', '#d6f6fb', 'He', '#0f4a57', 'h3') + svgBall(130, 76, 13, '#7fd8e8', '#d6f6fb', 'He', '#0f4a57', 'h4') +
    '<text x="81" y="102" text-anchor="middle" font-size="12.5" font-weight="800" fill="#1b2333" font-family="sans-serif">헬륨 He: 원자가 띄엄띄엄</text>' +
    [0, 1, 2].map((r) => [0, 1, 2, 3].map((q) => svgBall(196 + q * 26 + (r % 2) * 13, 24 + r * 22, 13, '#9a6b52', '#d9ad94', '', '#fff', 'f' + r + q)).join('')).join('') +
    '<text x="249" y="102" text-anchor="middle" font-size="12.5" font-weight="800" fill="#1b2333" font-family="sans-serif">철 Fe: 원자가 촘촘히</text></svg>';

  const dcStatus = () => '시험 <b>' + dcTested() + '/6</b> · 분류 <b>' + dcPlaced() + '/6</b>' + (DC.last ? '<br><span style="font-weight:600">' + DC.last + '</span>' : '');
  const statusFormula = () => {
    const st = FM.strip, cnt = molCount(FM.mol), parts = st.parts(Object.keys(FM.mol.f));
    const ft = parts.length ? fHTML(parts) : '(아직 없음)';
    const lines = Object.keys(cnt).map((sym) => { const s = st.slots.find((q) => q.sym === sym && !q.bad && !q.dying); const have = s ? s.n : 0; return EL[sym].name + ' 원자 ' + have + '/' + cnt[sym] + ' ' + mark(have === cnt[sym]); });
    return '지금 화학식: <b>' + ft + '</b><br>' + lines.join(' · ');
  };
  const earthStatus = (id, fname) => () => {
    const b = EA.bubbles.find((q) => q.id === id), done = EA.placed[id] === (SUBS[id].el ? 'el' : 'co');
    const built = done || (EA.open && EA.open.b.id === id && stripMatches(EA.open.strip, EA.open.mol)) || (EA.chip && EA.chip.b.id === id);
    return '화학식 ' + mark(built) + ' · 분류 ' + mark(done);
  };

  game = SciSim.game({
    simId: 'm2-element-compound',
    mount: '#game',
    badge: '원소 감별사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      electro: '⚡ 물의 전기 분해 장치',
      gastest: '🔥 기체 확인 도구(성냥불·향불)',
      decomp: '🔬 분해 장치',
      sort: '🗃️ 원소·화합물 분류 상자',
      formula: '🧩 원자 모형 → 화학식 만들기',
      earth: '🌏 지구 환경 물질 지도',
    },
    onFeatures(set) { F = set; if (game) refreshUI(); },
    onHint(m) { if (m.focus) setFocus(m.focus); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.scene && m.scene !== S.scene) setScene(m.scene, false);
      refreshUI();
    },
    onComplete() { EZ.toolsOn = true; refreshUI(); },
    levels: [
      {
        title: '물에 전기를 흘려 보내요', short: '물의 분해', icon: '⚡', phase: '관찰',
        features: ['electro', 'gastest'],
        intro: '<p class="si-q">❓ 탐구 질문: 물은 더 이상 다른 물질로 나눌 수 없는 기본 성분일까?</p>' +
          '<p>옛날 사람들은 물·불·흙·공기를 모든 물질의 기본 성분이라고 생각했어요. 물에 전기를 흘려 보내면 어떤 일이 일어나는지 관찰해 봐요.</p>' +
          '<div class="safe-note">🥽 <b>안전 메모</b> 물에 전류가 잘 흐르도록 수산화 나트륨을 조금 녹였어요. 수산화 나트륨은 분해되지 않고 전류만 잘 흐르게 해요. 피부에 닿으면 위험하니 <b>보안경과 장갑</b>을 써요.</div>',
        setup() { setScene('electro', true); ezReset(false); },
        recap: '물을 전기 분해하면 (−)극에서 수소, (+)극에서 산소가 생겨요. 물은 더 기본적인 성분으로 나뉘는 물질이에요.',
        summary: '<table><tr><th>전극</th><th>생기는 기체</th><th>확인 방법</th></tr>' +
          '<tr><td>(−)극</td><td><b>수소</b></td><td>불을 대면 ‘퍽’ 소리</td></tr>' +
          '<tr><td>(+)극</td><td><b>산소</b></td><td>꺼져 가는 불씨가 다시 타오름</td></tr></table>' +
          '<span class="formula">물 → 수소 + 산소<br><small style="font-weight:700;color:#5d6879">(물은 분해된다)</small></span>' +
          '<div class="note">⚠️ 수산화 나트륨은 피부에 닿지 않게!</div>',
        missions: [
          {
            title: '기체 모으기', scene: 'electro', focus: 'power',
            goal: '🥽 보안경을 쓰고 ⚡ 전원을 켜서 두 시험관에 기체가 모이는 모습을 관찰하세요. (−)극 10 mL, (+)극 5 mL 이상 모아요.',
            hint: '오른쪽 전원 장치의 스위치를 눌러요. 두 전극에서 무엇이 생기는지 보세요.',
            setup() { setScene('electro', false); ezReset(false); },
            check: () => EZ.tubes[0].V >= 10 && EZ.tubes[1].V >= 5, hold: 0.3,
            status: () => {
              if (!EZ.goggles) return '🥽 먼저 보안경을 써요';
              if (!EZ.power && EZ.tubes[0].V < 0.5 && EZ.tubes[1].V < 0.5) return '⚡ 전원을 켜 보세요';
              return '(−)극 쪽 기체 <b>' + f1(EZ.tubes[0].V) + ' mL</b> ' + mark(EZ.tubes[0].V >= 10) + ' · (+)극 쪽 기체 <b>' + f1(EZ.tubes[1].V) + ' mL</b> ' + mark(EZ.tubes[1].V >= 5);
            },
            onWin() { okFx(360, 200, COL.good, true); },
            explain: '전원을 켜자 두 전극에서 기포가 생겨 시험관 위쪽에 기체가 모였어요. 물에서 <b>새로운 기체</b>가 생겨난 거예요. 이 기체들은 무엇일까요?',
          },
          {
            title: '기체의 정체', scene: 'electro', focus: 'tools',
            goal: '🔥 성냥불과 🪵 꺼져 가는 향불로 두 시험관의 기체를 확인하세요.',
            hint: '수소는 불을 대면 ‘퍽’ 소리를 내며 타고, 산소는 꺼져 가는 불씨를 다시 타오르게 해요. 도구를 시험관으로 끌어 놓아요.',
            setup() { setScene('electro', false); EZ.toolsOn = true; if (EZ.tubes[0].V < 4 || EZ.tubes[1].V < 4) { showHint('전원을 켜서 두 시험관에 기체를 4 mL 이상 모아요', 5200); } refreshElectroUI(); },
            check: () => EZ.found.H && EZ.found.O, hold: 0.4,
            status: () => {
              const g = (i, nm) => '(' + (i ? '+' : MINUS) + ')극 기체: ' + (EZ.tubes[i].name ? '<b>' + EZ.tubes[i].name + '</b> ✅' : '<b>?</b>');
              const extra = EZ.log.filter((l) => l.kind === 'bright' || l.kind === 'dim').map((l) => '<small style="color:#8a95a8">(' + (l.ti ? '+' : MINUS) + ')극 ' + (l.kind === 'bright' ? '+ 성냥불: 조금 더 밝게' : '+ 향불: 불씨가 어두워짐') + '</small>');
              return g(0) + '<br>' + g(1) + (extra.length ? '<br>' + extra.slice(-2).join(' ') : '');
            },
            explain: '(−)극에서는 <b>수소</b>, (+)극에서는 <b>산소</b>가 생겼어요. 물이 성질이 전혀 다른 두 물질로 나뉘었어요!',
          },
          {
            type: 'quiz', title: '물은 기본 성분일까?', scene: 'electro',
            goal: '이 실험 결과로 알 수 있는 것은?',
            choices: ['물은 원소이고, 전기가 물을 수소와 산소로 바꾸었을 뿐이다.', '물은 수소와 산소로 분해되므로 더 이상 분해되지 않는 기본 성분이 아니다.', '물속에 원래 섞여 있던 수소 기체와 산소 기체가 빠져나온 것이다.', '물이 끓어서 생긴 수증기가 모인 것이다.'],
            answer: 1,
            feedback: ['물에서 수소와 산소가 나왔다면 물은 그보다 더 기본적인 성분으로 이루어져 있다는 뜻이에요.', '', '물은 수소와 산소의 혼합물이 아니에요. 물은 불을 끄지만 수소는 ‘퍽’ 타고, 산소는 불씨를 살려요. 성질이 전혀 달라요. 전원을 끄면 기체도 더 생기지 않았죠?', '물은 끓지 않았어요. 수증기는 ‘퍽’ 소리를 내며 타지 않고 불씨도 살리지 못해요.'],
            explain: '물은 전기로 수소와 산소로 분해돼요. 그러니 물은 기본 성분이 아니에요. 그럼 수소와 산소는 더 분해될까요? 다음 단계에서 확인해요!',
          },
        ],
      },
      {
        title: '분해해서 원소와 화합물 나누기', short: '원소·화합물', icon: '🔬', phase: '탐구',
        features: ['decomp', 'sort'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물이 수소와 산소로 분해되는 것을 보았어요.</div>' +
          '<p>그럼 수소와 산소도 더 분해될까요? 여러 물질을 분해 장치에 넣어, <b>분해되는 물질</b>과 <b>분해되지 않는 물질</b>로 나누어 봐요.</p>',
        setup() { setScene('decomp', true); dcReset(); },
        recap: '더 이상 분해되지 않는 기본 성분이 원소, 두 가지 이상의 원소가 결합한 물질이 화합물이에요.',
        summary: '<ul><li>물질<ul><li><b>순물질</b><ul><li><b>원소</b>: 수소, 산소, 구리</li><li><b>화합물</b>: 물, 염화 나트륨, 산화 은</li></ul></li><li><b>혼합물</b>: 공기, 소금물</li></ul></li></ul>' +
          '<span class="formula" style="font-size:15px;text-align:left">원소 = 더 이상 분해되지 않는 기본 성분<br>화합물 = 두 가지 이상의 원소가 결합한 물질</span>' +
          '<div class="note">분리(혼합물을 나눔) ≠ 분해(화합물이 성분 원소로 나뉨)</div>',
        missions: [
          {
            title: '분해해서 분류하기', scene: 'decomp', focus: 'decomp',
            goal: '여섯 가지 물질을 분해 장치로 하나씩 시험한 뒤 원소와 화합물 상자에 나누어 넣으세요. 먼저 수소와 산소부터!',
            hint: '다른 물질로 나뉘면 화합물, 어떤 방법으로도 나뉘지 않으면 원소예요.',
            setup() { setScene('decomp', false); dcReset(); },
            check: () => dcPlaced() === 6, hold: 0.3, status: dcStatus,
            onWin() { okFx(676, 236, COL.good, true); },
            explain: '수소·산소·구리는 더 이상 분해되지 않는 <b>원소</b>예요. 물(수소 + 산소), 염화 나트륨(나트륨 + 염소), 산화 은(은 + 산소)은 두 가지 원소가 결합한 <b>화합물</b>이에요. 산소는 여러 화합물 속에 들어 있는 성분이에요.',
          },
          {
            type: 'quiz', title: '공기는 화합물일까?', scene: 'decomp',
            goal: '공기에는 질소, 산소, 아르곤, 이산화 탄소 등이 들어 있어요. 공기는 어떤 물질일까요?',
            choices: ['여러 원소로 이루어져 있으니 화합물이다.', '기체 한 가지이므로 원소이다.', '여러 순물질이 결합하지 않고 섞여 있는 혼합물이다.', '공기에서 질소와 산소를 얻을 수 있으니 화합물이다.'],
            answer: 2,
            feedback: ['공기 속 질소와 산소는 서로 결합하지 않고 섞여 있을 뿐이에요. 결합해야 화합물!', '공기에는 질소 약 78 %, 산소 약 21 % 등 여러 물질이 섞여 있어요.', '', '공기에서 질소·산소를 얻는 것은 섞인 것을 끓는점 차이로 분리하는 것이지 분해가 아니에요.'],
            explain: '원소와 화합물은 모두 한 가지 물질로 된 <b>순물질</b>이에요. 화합물은 원소가 결합해 성질이 전혀 다른 새 물질이 된 것이고(물은 수소·산소와 성질이 달라요), 혼합물은 섞인 물질이 각자의 성질을 그대로 지녀요.',
          },
        ],
      },
      {
        title: '원자 모형으로 화학식 쓰기', short: '화학식', icon: '🧩', phase: '모형',
        features: ['formula'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물은 수소와 산소, 두 가지 원소가 결합한 화합물임을 알았어요.</div>' +
          '<p>원소를 이루는 아주 작은 입자를 <b>원자</b>라고 해요. (원자의 속 구조는 다음 차시에서!) 원소마다 원자의 종류가 다르고, 원소는 <b>원소 기호</b>로 나타내요. 원소 기호와 숫자로 물질을 나타낸 식이 <b>화학식</b>이에요.</p>',
        setup() { setScene('formula', true); fmSet('H2O', ['H', 'O', 'C', 'N'], '물 입자 모형', 'build'); },
        recap: '화학식은 원소 기호와 숫자로 물질을 이루는 원소의 종류와 원자 수를 나타내요.',
        summary: '<span class="formula" style="font-size:15px;text-align:left">① 원소 기호: 첫 글자 대문자 (+ 둘째 글자 소문자)<br>② 원자 수는 오른쪽 아래 작은 숫자, 1은 생략<br>③ 기호 종류 1개 → 원소 (O<sub>2</sub>, He, Fe)<br>　 기호 종류 2개 이상 → 화합물 (H<sub>2</sub>O, CO)</span>' +
          '<table><tr><th>기호</th><th>원소</th><th>기호</th><th>원소</th></tr><tr><td>H</td><td>수소</td><td>Cl</td><td>염소</td></tr><tr><td>He</td><td>헬륨</td><td>Na</td><td>나트륨</td></tr><tr><td>C</td><td>탄소</td><td>Fe</td><td>철</td></tr><tr><td>N</td><td>질소</td><td>Co</td><td>코발트</td></tr><tr><td>O</td><td>산소</td><td>Cu</td><td>구리</td></tr><tr><td>S</td><td>황</td><td>Ag</td><td>은</td></tr><tr><td colspan="2"></td><td>Hg</td><td>수은</td></tr></table>' +
          '<div class="note">라틴어 이름에서 온 기호: Na(Natrium), Fe(Ferrum), Cu(Cuprum), Ag(Argentum), Hg(Hydrargyrum)</div>',
        missions: [
          {
            title: '물의 화학식', scene: 'formula', focus: 'formula',
            goal: '물 입자 모형을 보고 원소 기호 타일과 숫자로 물의 화학식을 완성하세요.',
            hint: '흰색 수소 원자와 빨간색 산소 원자를 세어 봐요. 원자가 1개일 때는 숫자를 쓰지 않아요.',
            setup() { setScene('formula', false); fmSet('H2O', ['H', 'O', 'C', 'N'], '물 입자 모형', 'build'); },
            check: () => FM.mode === 'build' && FM.key === 'H2O' && FM.done && stripMatches(FM.strip, FM.mol), hold: 0.5, status: statusFormula,
            explain: '물 입자 하나는 수소 원자 2개와 산소 원자 1개가 결합해 있어서 화학식은 <b>H<sub>2</sub>O</b>예요. 원자 수는 원소 기호 오른쪽 아래에 작게 쓰고, 1은 생략해요.',
          },
          {
            title: '원소도 화학식으로: 산소', scene: 'formula', focus: 'formula',
            goal: '산소 기체를 이루는 입자 모형이에요. 화학식으로 나타내 보세요.',
            hint: '산소 원자 몇 개가 결합해 있나요?',
            setup() { setScene('formula', false); fmSet('O2', ['O', 'H', 'N'], '산소 기체 입자 모형', 'build'); },
            check: () => FM.mode === 'build' && FM.key === 'O2' && FM.done && stripMatches(FM.strip, FM.mol), hold: 0.5, status: statusFormula,
            explain: '산소 기체는 산소 원자 2개가 결합한 입자로 이루어져 있어 <b>O<sub>2</sub></b>로 나타내요. 원소도 화학식으로 나타내요. 헬륨(He)처럼 원자가 하나씩 떨어져 있거나, 철(Fe)처럼 한 종류의 원자가 끝없이 모여 있는 원소는 원소 기호를 그대로 화학식으로 써요.' +
              '<div style="text-align:center;margin-top:8px">' + FIG_HE_FE + '</div>',
          },
          {
            type: 'quiz', title: 'CO와 Co', scene: 'formula',
            setup() { setScene('formula', false); fmSet('CO', [], 'CO 입자 모형', 'quiz'); showHint('대문자와 소문자를 잘 보고 알맞은 설명을 골라요', 5000); },
            figure: FIG_CO,
            goal: '화학식 CO와 Co에 대한 설명으로 옳은 것은?',
            choices: ['둘은 같은 물질을 다르게 쓴 것이다.', 'CO는 탄소와 산소로 이루어진 화합물이고, Co는 코발트라는 한 가지 원소이다.', 'CO는 원소이고 Co는 화합물이다.', '둘 다 두 가지 원소로 이루어진 화합물이다.'],
            answer: 1,
            feedback: ['대문자는 새 원소 기호의 시작이에요. CO는 C와 O, 기호 두 개예요.', '', '거꾸로예요. 원소 기호가 몇 종류인지 세어 보세요.', 'Co의 o는 소문자예요. 둘째 글자는 소문자로 써서 기호 하나를 이뤄요.'],
            explain: '원소 기호는 첫 글자를 대문자, 둘째 글자를 소문자로 써요(Co, Cl, Na). 화학식 속 원소 기호가 한 종류면 <b>원소</b>, 두 종류 이상이면 <b>화합물</b>이에요.',
          },
        ],
      },
      {
        title: '지구 환경 물질 도감 만들기', short: '지구 환경', icon: '🌏', phase: '적용',
        features: ['earth'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원자 모형을 보고 화학식을 쓰고, 원소 기호의 종류로 원소와 화합물을 구별했어요.</div>' +
          '<p>지구 환경에 영향을 주는 물질을 <b>화학식</b>으로 나타내고 <b>원소와 화합물</b>로 구분해서 ‘지구 환경 물질 도감’을 완성해요.</p>',
        setup() { EA.show = new Set(['ch4']); eaReset(); setScene('earth', true); },
        recap: '지구 환경에 영향을 주는 물질도 화학식으로 나타내고, 원소 기호의 종류로 원소와 화합물을 구별해요.',
        summary: '<table><tr><th>물질</th><th>화학식</th><th>구분</th><th>환경과의 관계</th></tr>' +
          '<tr><td>메테인</td><td>CH<sub>4</sub></td><td>화합물</td><td>온실 기체</td></tr>' +
          '<tr><td>이산화 탄소</td><td>CO<sub>2</sub></td><td>화합물</td><td>온실 기체</td></tr>' +
          '<tr><td>오존</td><td>O<sub>3</sub></td><td>원소</td><td>자외선 차단(성층권)·대기 오염(지표)</td></tr>' +
          '<tr><td>이산화 황</td><td>SO<sub>2</sub></td><td>화합물</td><td>산성비</td></tr>' +
          '<tr><td>질소</td><td>N<sub>2</sub></td><td>원소</td><td>공기의 약 78 %</td></tr>' +
          '<tr><td>수은</td><td>Hg</td><td>원소</td><td>중금속 오염</td></tr></table>' +
          '<div class="note">원자 수(숫자)가 아니라 <b>원소 기호의 종류</b>로 구분!</div>',
        missions: [
          {
            title: '온실 기체 메테인', scene: 'earth', focus: 'earth',
            goal: '소 옆의 버블을 눌러 메테인의 화학식을 쓰고, 원소인지 화합물인지 도감에 분류하세요.',
            hint: '검은 탄소 원자 1개, 흰 수소 원자 4개! 원소 기호가 두 종류면?',
            setup() { EA.show = new Set(['ch4']); eaReset(); setScene('earth', false); },
            check: () => EA.placed.ch4 === 'co', hold: 0.4, status: earthStatus('ch4'),
            explain: '메테인은 탄소 원자 1개와 수소 원자 4개가 결합해 <b>CH<sub>4</sub></b>예요. 두 가지 원소로 이루어졌으니 <b>화합물</b>이에요.',
          },
          {
            title: '오존층의 오존', scene: 'earth', focus: 'earth',
            goal: '오존층 버블을 눌러 오존의 화학식을 쓰고 분류하세요.',
            hint: '산소 원자가 몇 개 있나요? 원소 기호는 몇 종류인가요?',
            setup() { EA.show = new Set(['o3']); eaRefresh(); setScene('earth', false); },
            check: () => EA.placed.o3 === 'el', hold: 0.4, status: earthStatus('o3'),
            explain: '오존은 산소 원자 3개가 결합한 <b>O<sub>3</sub></b>예요. 한 가지 원소(산소)로만 되어 있으니 <b>원소</b>예요. 산소(O<sub>2</sub>)와 오존(O<sub>3</sub>)은 같은 원소로 되어 있지만 서로 다른 물질이에요.',
          },
          {
            title: '도감 완성', scene: 'earth', focus: 'earth',
            goal: '남은 버블 4개에는 화학식이 적혀 있어요. 화학식을 읽고 원소와 화합물로 분류해 도감을 완성하세요.',
            hint: '화학식 속 원소 기호의 종류를 세어 보세요. 숫자(원자 수)는 상관없어요.',
            setup() { EA.show = new Set(['co2', 'so2', 'n2', 'hg']); eaRefresh(); setScene('earth', false); },
            check: () => ['co2', 'so2', 'n2', 'hg'].every((id) => EA.placed[id] === (SUBS[id].el ? 'el' : 'co')), hold: 0.4,
            status: () => '도감 <b>' + Object.keys(EA.placed).filter((id) => EA.placed[id] === (SUBS[id].el ? 'el' : 'co') && !SUBS[id].bonus).length + '/6</b>',
            explain: 'N<sub>2</sub>와 Hg는 한 가지 원소로 된 <b>원소</b>, CO<sub>2</sub>와 SO<sub>2</sub>는 두 가지 원소가 결합한 <b>화합물</b>이에요. 화학식으로 쓰면 세계 어디서나 같은 물질로 알아볼 수 있어요. 온실 기체를 줄이려면 우리는 무엇을 실천할 수 있을까요?',
          },
        ],
      },
    ],
  });

  refreshUI();
  let FREEZE = false;
  SciSim.loop((dt, t) => { lastDt = dt; if (!FREEZE) update(dt); draw(now()); watchGame(); if (lastFree !== !!(game && game.free)) refreshUI(); });
  window.__sim = Object.assign({
    S, SC, get game() { return game; }, ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    setScene, refreshUI, EL, MOLS, drawMol, freeze(v) { FREEZE = !!v; },
  }, DBG);
})();
