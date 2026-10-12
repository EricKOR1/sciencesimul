/* =========================================================
   중2 Ⅳ. 물질의 구성 — 주기율표  [9과11-03]
   원소는 양성자의 수에 따라 주기율표에 배치됨을 알고, 주기율표에서 성질이 유사한 원소를 찾을 수 있다.
   ① 관찰: 원자 카드를 양성자 수 순서로 놓기 → ② 탐구: 주기와 족
   → ③ 실험: 같은 족 원소의 성질(1족 + 물, 18족 + 달군 철솜) → ④ 적용: 성질이 비슷한 원소 찾기
   ※ 반응식·원리·전자 배치·원소의 주기성은 다루지 않음
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


  /* =========================================================
     장면 공통
     ========================================================= */
  const S = { scene: 'table', sceneT: 0 };
  const SC = {};
  const DR = { fn: null };
  const DBG = {};
  const hintEl = $('#stageHint');
  function showHint(t, ms) { hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5200); }
  function hideHint() { hintEl.classList.add('hide'); }
  const mark = (b) => (b ? '✅' : '⬜');

  /* =========================================================
     원소 자료 (118종) · 주기율표 배치
     ========================================================= */
  const SYMS = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' ');
  const NAMES = ('수소 헬륨 리튬 베릴륨 붕소 탄소 질소 산소 플루오린 네온 나트륨 마그네슘 알루미늄 규소 인 황 염소 아르곤 칼륨 칼슘 스칸듐 타이타늄 바나듐 크로뮴 망가니즈 철 코발트 니켈 구리 아연 갈륨 저마늄 비소 셀레늄 브로민 크립톤 루비듐 스트론튬 이트륨 지르코늄 나이오븀 몰리브데넘 테크네튬 루테늄 로듐 팔라듐 은 카드뮴 인듐 주석 안티모니 텔루륨 아이오딘 제논 세슘 바륨 란타넘 세륨 프라세오디뮴 네오디뮴 프로메튬 사마륨 유로퓸 가돌리늄 터븀 디스프로슘 홀뮴 어븀 툴륨 이터븀 루테튬 하프늄 탄탈럼 텅스텐 레늄 오스뮴 이리듐 백금 금 수은 탈륨 납 비스무트 폴로늄 아스타틴 라돈 프랑슘 라듐 악티늄 토륨 프로트악티늄 우라늄 넵투늄 플루토늄 아메리슘 퀴륨 버클륨 캘리포늄 아인슈타이늄 페르뮴 멘델레븀 노벨륨 로렌슘 러더퍼듐 더브늄 시보귬 보륨 하슘 마이트너륨 다름슈타튬 뢴트게늄 코페르니슘 니호늄 플레로븀 모스코븀 리버모륨 테네신 오가네손').split(' ');
  // 원자핵 속 중성자 수 (원자의 구조 차시와 같은 값: 1~20번)
  const NEUT = [0, 0, 2, 4, 5, 6, 6, 7, 8, 10, 10, 12, 12, 14, 14, 16, 16, 18, 22, 20, 20];
  function posOf(Z) {
    if (Z === 1) return { p: 1, g: 1 };
    if (Z === 2) return { p: 1, g: 18 };
    if (Z <= 4) return { p: 2, g: Z - 2 };
    if (Z <= 10) return { p: 2, g: Z + 8 };
    if (Z <= 12) return { p: 3, g: Z - 10 };
    if (Z <= 18) return { p: 3, g: Z };
    if (Z <= 36) return { p: 4, g: Z - 18 };
    if (Z <= 54) return { p: 5, g: Z - 36 };
    if (Z <= 56) return { p: 6, g: Z - 54 };
    if (Z <= 71) return { p: 6, g: 3, f: Z - 57, frow: 0 };
    if (Z <= 86) return { p: 6, g: Z - 68 };
    if (Z <= 88) return { p: 7, g: Z - 86 };
    if (Z <= 103) return { p: 7, g: 3, f: Z - 89, frow: 1 };
    return { p: 7, g: Z - 100 };
  }
  const ELM = SYMS.map((s, i) => Object.assign({ Z: i + 1, sym: s, name: NAMES[i] }, posOf(i + 1)));
  const E = (Z) => ELM[Z - 1];
  const TBG = { x0: 40, y0: 76, cw: 38, ch: 40, pitchX: 41, pitchY: 43 };
  function cellRect(Z) {
    const e = E(Z);
    if (e.f != null) return { x: TBG.x0 + (2 + e.f) * TBG.pitchX, y: TBG.y0 + 7 * TBG.pitchY + 12 + e.frow * 29, w: TBG.cw, h: 26, f: true };
    return { x: TBG.x0 + (e.g - 1) * TBG.pitchX, y: TBG.y0 + (e.p - 1) * TBG.pitchY, w: TBG.cw, h: TBG.ch };
  }
  const gx = (g) => TBG.x0 + (g - 1) * TBG.pitchX;
  const py = (p) => TBG.y0 + (p - 1) * TBG.pitchY;
  const TB_BOTTOM = TBG.y0 + 7 * TBG.pitchY - 3;
  const posText = (Z) => E(Z).p + '주기 ' + E(Z).g + '족';
  const GCOL = (g) => (g === 1 ? '#ffb35c' : g === 18 ? '#a78bfa' : '#6cb8f5');

  /* ---------- 원자 그림: 원자핵(양성자 + 중성자) + 구름처럼 떠도는 전자 (껍질 원은 그리지 않음) ---------- */
  const NUCS = new Map();
  function nucSprite(Z, br) {
    const key = Z + '|' + br;
    let sp = NUCS.get(key);
    if (sp) return sp;
    const n = Z + NEUT[Z], k = 3;
    const R = Math.ceil(br * 1.75 * Math.sqrt(n) + br + 2);
    const cv = document.createElement('canvas'); cv.width = cv.height = R * 2 * k;
    const g = cv.getContext('2d'); g.scale(k, k);
    // 양성자 · 중성자 섞기 (Z번 고정된 순서)
    const types = []; for (let i = 0; i < n; i++) types.push(i < Z ? 1 : 0);
    let seed = Z * 9301 + 49297; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = types[i]; types[i] = types[j]; types[j] = t; }
    const order = []; for (let i = 0; i < n; i++) { const a = i * 2.39996, r = br * 1.75 * Math.sqrt(i + 0.35); order.push({ x: R + Math.cos(a) * r, y: R + Math.sin(a) * r, t: types[i] }); }
    order.sort((a, b) => a.y - b.y);
    order.forEach((q) => {
      const gr = g.createRadialGradient(q.x - br * 0.35, q.y - br * 0.4, br * 0.1, q.x, q.y, br);
      if (q.t) { gr.addColorStop(0, '#ffb6b6'); gr.addColorStop(0.55, '#e2464b'); gr.addColorStop(1, '#a8222a'); }
      else { gr.addColorStop(0, '#f4f6f9'); gr.addColorStop(0.55, '#a6afbd'); gr.addColorStop(1, '#6b7486'); }
      g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, br, 0, TAU); g.fill();
    });
    sp = { cv, R };
    NUCS.set(key, sp);
    return sp;
  }
  const ELECS = {};
  function elecs(Z) {
    if (ELECS[Z]) return ELECS[Z];
    let seed = Z * 7919 + 13; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return (ELECS[Z] = Array.from({ length: Z }, () => ({ rho: 0.55 + rnd() * 0.45, w: (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 1.0), ph: rnd() * TAU, ry: 0.55 + rnd() * 0.3 })));
  }
  /* (cx, cy) 가운데, rx = 전자 구름 가로 반지름 */
  function drawAtomPic(Z, cx, cy, rx, br, t) {
    const sp = nucSprite(Z, br);
    const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx * 1.1);
    cg.addColorStop(0, 'rgba(120,150,255,.16)'); cg.addColorStop(0.7, 'rgba(120,150,255,.08)'); cg.addColorStop(1, 'rgba(120,150,255,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.1, rx * 0.82, 0, 0, TAU); ctx.fill();
    ctx.drawImage(sp.cv, cx - sp.R, cy - sp.R, sp.R * 2, sp.R * 2);
    const es = elecs(Z), er = Math.max(1.5, br * 0.5);
    ctx.fillStyle = 'rgba(56,103,244,.85)';
    es.forEach((e) => {
      const th = e.ph + t * e.w * (RM ? 0 : 1), rr = Math.max(sp.R * 0.55 + 4, rx * e.rho);
      ctx.beginPath(); ctx.arc(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr * e.ry, er, 0, TAU); ctx.fill();
    });
  }

  /* =========================================================
     장면 1 · table — 주기율표 (1 · 2 · 4단계)
     ========================================================= */
  const DECK_Z = [11, 18, 3, 19, 10];                // 섞인 순서: 나트륨, 아르곤, 리튬, 칼륨, 네온
  const EMPTY_Z = [3, 10, 11, 18, 19];
  const T = {
    mode: 'free',            // place | address | detective | rb | free
    filled: {}, flip: {}, lit: {}, pop: {}, shakeZ: {}, wave: [],
    g: null, p: null, gA: 0, pA: 0, xA: 0, gLast: 1, pLast: 1,
    cards: [], hoverZ: null, sweep: null, sweepDone: false, placedN: 0,
    q: null, qSlide: 1, info: null, rbT: 0, deckShown: 0, fShown: 0, hdrOn: false, t: 0,
  };
  function tableMode(mode) {
    T.mode = mode;
    if (mode === 'place') { T.filled = {}; for (let Z = 1; Z <= 20; Z++) if (EMPTY_Z.indexOf(Z) < 0) T.filled[Z] = true; }
    else { for (let Z = 1; Z <= 20; Z++) T.filled[Z] = true; }
    T.flip = {}; T.lit = {}; T.pop = {}; T.info = null; T.sweep = null; T.sweepDone = false; T.placedN = 0;
    T.g = null; T.p = null; T.gA = 0; T.pA = 0; T.xA = 0;
    T.cards = mode === 'place' ? DECK_Z.map((Z, i) => { const h = deckHome(i); return { Z, hx: h.x, hy: h.y, x: h.x, y: h.y + 120, s: 1, rot: 0, tilt: 0, vx: 0, vy: 0, hold: false, state: 'deck', lift: 0, t: 0 }; }) : [];
    T.q = null;
    if (mode === 'rb') { T.g = 1; T.gA = 0; }
  }
  const deckHome = (i) => ({ x: 118 + i * 118 + 46, y: 446 });
  function startQuiz(kind) {
    if (kind === 'address') T.q = { kind, list: [{ p: 2, g: 17, Z: 9 }, { p: 3, g: 2, Z: 12 }, { p: 4, g: 1, Z: 19 }], i: 0, done: 0 };
    else T.q = {
      kind: 'detective', i: 0, done: 0, list: [
        { c1: '물에 넣으면 기체가 생기고 페놀프탈레인 용액을 붉게 만드는 금속', c2: '4주기', Z: 19 },
        { c1: '다른 물질과 거의 반응하지 않는 기체', c2: '2주기', Z: 10 },
      ],
    };
    T.qSlide = 0;
  }
  const qDone = () => T.q && T.q.done >= T.q.list.length;
  function cellAt(p, cardMode) {
    for (let Z = 1; Z <= 118; Z++) {
      const r = cellRect(Z);
      if (r.f && !T.fShown) continue;
      const pad = cardMode ? 2 : 0;
      if (p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad) return Z;
    }
    return null;
  }
  function hdrAt(p) {
    if (!T.hdrOn) return null;
    for (let g = 1; g <= 18; g++) { const x = gx(g); if (p.x >= x - 1 && p.x <= x + TBG.cw + 1 && p.y >= 40 && p.y <= TBG.y0 - 2) return { kind: 'g', n: g }; }
    for (let q = 1; q <= 7; q++) { const y = py(q); if (p.x >= 6 && p.x <= TBG.x0 - 2 && p.y >= y - 1 && p.y <= y + TBG.ch + 1) return { kind: 'p', n: q }; }
    return null;
  }
  function toggleHdr(h) {
    Sound.click();
    if (h.kind === 'g') { T.g = T.g === h.n ? null : h.n; if (T.g) { T.gLast = h.n; T.gA = 0; } T.xA = 0; }
    else { T.p = T.p === h.n ? null : h.n; if (T.p) { T.pLast = h.n; T.pA = 0; } T.xA = 0; }
  }
  /* 카드를 칸에 놓기 */
  function placeCard(c, Z) {
    c.state = 'snap'; c.t = 0; c.to = cellRect(Z); c.toZ = Z; c.hold = false;
  }
  function cardLanded(c) {
    const Z = c.Z;
    T.filled[Z] = true; T.flip[Z] = { t: 0 }; T.placedN++;
    c.state = 'gone';
    const r = cellRect(Z);
    WAVES.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, t: 0, color: COL.sub, max: 46 });
    FX.burst(r.x + r.w / 2, r.y + r.h / 2, { count: RM ? 3 : 6, speed: 110, life: 0.7, size: 3.4, colors: ['#ffd23f', '#fff6c2', '#8b5cf6'], shape: 'star' });
    sfx.ding();
    if (T.placedN >= 5) later(0.5, startSweep);
  }
  function startSweep() { T.sweep = { t: 0, i: 0 }; T.sweepDone = false; }
  function ptReset() {
    if (T.mode === 'place') { tableMode('place'); }
    T.g = null; T.p = null; T.info = null;
  }

  /* ---------- 갱신 ---------- */
  function tableUpdate(dt) {
    T.t += dt;
    T.gA = T.g ? Math.min(1, T.gA + dt / 0.4) : Math.max(0, T.gA - dt * 4);
    T.pA = T.p ? Math.min(1, T.pA + dt / 0.4) : Math.max(0, T.pA - dt * 4);
    T.xA = (T.g && T.p && T.gA > 0.95 && T.pA > 0.95) ? Math.min(1, T.xA + dt / 0.35) : Math.max(0, T.xA - dt * 5);
    T.qSlide = Math.min(1, T.qSlide + dt / 0.4);
    T.deckShown = SciSim.approach(T.deckShown, T.mode === 'place' ? 1 : 0, dt, 6);
    T.fShown = SciSim.approach(T.fShown, T.mode === 'place' ? 0 : 1, dt, 6);
    T.hdrOn = T.mode !== 'place' || (T.mode === 'place' && false);
    if (Math.abs(T.fShown - (T.mode === 'place' ? 0 : 1)) < 0.01) T.fShown = T.mode === 'place' ? 0 : 1;
    Object.keys(T.flip).forEach((Z) => { const f = T.flip[Z]; f.t += dt / 0.4; if (f.t >= 1) delete T.flip[Z]; });
    Object.keys(T.lit).forEach((Z) => { T.lit[Z] -= dt * 2.5; if (T.lit[Z] <= 0) delete T.lit[Z]; });
    Object.keys(T.pop).forEach((Z) => { T.pop[Z] -= dt; if (T.pop[Z] <= 0) delete T.pop[Z]; });
    Object.keys(T.shakeZ).forEach((Z) => { T.shakeZ[Z] -= dt; if (T.shakeZ[Z] <= 0) delete T.shakeZ[Z]; });
    if (T.info) { T.info.t += dt; if (T.info.t > 5) T.info = null; }
    T.rbT += dt;
    // 카드
    T.cards.forEach((c, i) => {
      c.lift = SciSim.approach(c.lift, c.hold ? 1 : 0, dt, 16);
      if (c.state === 'deck') {
        if (!c.hold) {
          // 감쇠 스프링으로 덱 자리로 돌아간다
          const K = 190, Dm = 15, n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
          c.vx = c.vx || 0; c.vy = c.vy || 0;
          for (let k = 0; k < n; k++) { c.vx += ((c.hx - c.x) * K - c.vx * Dm) * h; c.vy += ((c.hy - c.y) * K - c.vy * Dm) * h; c.x += c.vx * h; c.y += c.vy * h; }
          c.rot = SciSim.approach(c.rot, 0, dt, 9); c.tilt = 0;
          c.s = SciSim.approach(c.s, 1, dt, 14);
        } else {
          c.s = SciSim.approach(c.s, 1.08, dt, 20); c.tilt = SciSim.approach(c.tilt || 0, 0, dt, 5); c.rot = SciSim.approach(c.rot, c.tilt, dt, 14);
          c.oy = SciSim.approach(c.oy, c.oyT, dt, 14); c.ox = SciSim.approach(c.ox, c.oxT, dt, 14);
          const nx = clamp(c.px + c.ox, 50, 750), ny = clamp(c.py + c.oy, 50, 500), vx = (nx - c.x) / Math.max(dt, 1e-3);
          c.tilt = clamp(vx * 0.00022, -0.105, 0.105); c.x = nx; c.y = ny; c.vx = 0; c.vy = 0;
        }
      } else if (c.state === 'snap') {
        c.t += dt;
        const q = ease.outCubic(Math.min(1, c.t / 0.28)), r = c.to;
        c.sx = q; c.rot = SciSim.approach(c.rot, 0, dt, 20);
        if (c.t >= 0.28) cardLanded(c);
      }
    });
    T.cards = T.cards.filter((c) => c.state !== 'gone');
    // 1 → 20 훑기
    if (T.sweep) {
      const sw = T.sweep; sw.t += dt;
      const step = 0.08;
      while (sw.i < 20 && sw.t >= sw.i * step) {
        const Z = sw.i + 1; T.lit[Z] = 1; sw.i++;
        Sound.tone(392 * Math.pow(2, (sw.i - 1) / 14), 0.09, 'triangle', 0.07);
      }
      if (sw.i >= 20 && sw.t > 20 * step + 0.5) { T.sweepDone = true; T.sweep = null; }
    }
    // 정답을 기다리는 동안의 Rb 반짝임 등은 그리기에서
  }

  /* ---------- 그리기 ---------- */
  function cellFace(Z, r, o) {
    // 흰 카드 (1~20번): 번호 · 기호
    const e = E(Z);
    ctx.save();
    if (o.k !== 1) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(o.k, o.k); ctx.translate(-r.x - r.w / 2, -r.y - r.h / 2); }
    softShadow(r.x, r.y, r.w, r.h, 6, 6, 2, 'rgba(30,50,100,' + (o.sh || 0.18) + ')');
    ctx.fillStyle = o.fill || '#fff'; D.roundRect(r.x, r.y, r.w, r.h, 6); ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 2.4; D.roundRect(r.x, r.y, r.w, r.h, 6); ctx.stroke(); }
    txt(String(Z), r.x + 4, r.y + 14, 13, '#7a8699', 'left', 700);
    txt(e.sym, r.x + r.w / 2 + 1, r.y + r.h - 9, 20, COL.ink, 'center', 800);
    ctx.restore();
  }
  function drawTable(t) {
    const showF = T.fShown > 0.02;
    // 족 · 주기 번호 머리글
    for (let g = 1; g <= 18; g++) {
      const x = gx(g), on = T.g === g;
      if (T.hdrOn) {
        ctx.fillStyle = on ? GCOL(g) : 'rgba(255,255,255,.9)'; D.roundRect(x, 48, TBG.cw, 22, 11); ctx.fill();
        ctx.strokeStyle = on ? shade(GCOL(g), -0.2) : '#cfd8e6'; ctx.lineWidth = on ? 2.4 : 1.4; D.roundRect(x, 48, TBG.cw, 22, 11); ctx.stroke();
        txt(String(g), x + TBG.cw / 2, 64, 13.5, on ? '#fff' : COL.muted, 'center', 800);
      } else txt(String(g), x + TBG.cw / 2, 64, 13, '#9aa5b6', 'center', 800);
    }
    for (let q = 1; q <= 7; q++) {
      const y = py(q), on = T.p === q;
      if (T.hdrOn) {
        ctx.fillStyle = on ? '#6cb8f5' : 'rgba(255,255,255,.9)'; D.roundRect(8, y + 7, 26, 26, 13); ctx.fill();
        ctx.strokeStyle = on ? '#3b8fd8' : '#cfd8e6'; ctx.lineWidth = on ? 2.4 : 1.4; D.roundRect(8, y + 7, 26, 26, 13); ctx.stroke();
        txt(String(q), 21, y + 25, 13.5, on ? '#fff' : COL.muted, 'center', 800);
      } else txt(String(q), 21, y + 25, 13, '#9aa5b6', 'center', 800);
    }
    if (T.hdrOn) { txt('족 ▸', 14, 64, 12.5, '#8a95a8', 'left', 800); }
    // 칸
    for (let Z = 1; Z <= 118; Z++) {
      const r = cellRect(Z), e = E(Z);
      if (r.f && !showF) continue;
      const rr = r.f ? { x: r.x, y: r.y, w: r.w, h: r.h } : r;
      ctx.save();
      if (r.f) ctx.globalAlpha = 0.5 * T.fShown;
      if (Z <= 20) {
        const fl = T.flip[Z], filled = !!T.filled[Z];
        let k = 1, face = filled, sx = 1;
        if (fl) { const c = Math.cos(Math.PI * fl.t); sx = Math.max(0.02, Math.abs(c)); face = fl.t >= 0.5; }
        const popK = T.pop[Z] ? 1 + 0.1 * Math.sin(Math.min(1, (0.8 - T.pop[Z]) / 0.25) * Math.PI) * (T.pop[Z] > 0.4 ? 1 : T.pop[Z] / 0.4) : 1;
        const lit = T.lit[Z] || 0;
        const hv = T.hoverZ === Z && T.mode === 'place' && T.cards.some((c) => c.hold);
        const shk = T.shakeZ[Z] ? Math.sin(T.shakeZ[Z] * 60) * 4 : 0;
        ctx.save();
        ctx.translate(rr.x + rr.w / 2 + shk, rr.y + rr.h / 2); ctx.scale(sx * popK, popK); ctx.translate(-rr.x - rr.w / 2, -rr.y - rr.h / 2);
        if (face) {
          const gold = T.pop[Z] > 0;
          cellFace(Z, rr, { k: 1, fill: lit > 0 ? mix('#ffffff', '#fff1a8', lit) : '#fff', border: gold ? '#ffb400' : hv ? COL.sub : null, bw: 3 });
        } else {
          // 번호만 보이는 빈칸 (점선 · 은은한 맥동)
          const pu = 0.5 + 0.5 * Math.sin(t * 3 + Z);
          ctx.fillStyle = hv ? 'rgba(139,92,246,.2)' : 'rgba(255,255,255,.55)'; D.roundRect(rr.x, rr.y, rr.w, rr.h, 6); ctx.fill();
          ctx.setLineDash([4, 3]); ctx.strokeStyle = hv ? COL.sub : rgba('#8b5cf6', 0.35 + 0.35 * pu); ctx.lineWidth = hv ? 3 : 2; D.roundRect(rr.x, rr.y, rr.w, rr.h, 6); ctx.stroke(); ctx.setLineDash([]);
          txt(String(Z), rr.x + rr.w / 2, rr.y + rr.h / 2 + 5, 15, hv ? COL.sub : '#8a95a8', 'center', 800);
        }
        ctx.restore();
      } else {
        const bright = (T.mode === 'rb' && (Z === 37 || Z === 54)) || (T.mode === 'free' && false);
        if (bright) {
          const bl = 0.5 + 0.5 * Math.sin(T.rbT * 6);
          cellFace(Z, rr, { k: 1, fill: Z === 37 ? mix('#ffffff', '#ffd9a0', 0.5 + 0.5 * bl) : '#fff', border: Z === 37 ? '#ff9a2e' : '#8b5cf6', bw: 3 });
        } else {
          ctx.fillStyle = r.f ? '#eef2f7' : '#eef2f7'; D.roundRect(rr.x, rr.y, rr.w, rr.h, 5); ctx.fill();
          txt(e.sym, rr.x + rr.w / 2, rr.y + rr.h / 2 + (r.f ? 5 : 5), r.f ? 12 : 13, '#aab4c3', 'center', 700);
        }
      }
      ctx.restore();
    }
    if (showF) {
      ctx.save(); ctx.globalAlpha = 0.6 * T.fShown;
      txt('*', gx(3) + TBG.cw / 2, py(6) + 28, 16, '#8a95a8', 'center', 800); txt('**', gx(3) + TBG.cw / 2, py(7) + 28, 14, '#8a95a8', 'center', 800);
      txt('*  란타넘족', TBG.x0 - 4, TB_BOTTOM + 30, 12.5, '#8a95a8', 'left', 700); txt('** 악티늄족', TBG.x0 - 4, TB_BOTTOM + 59, 12.5, '#8a95a8', 'left', 700);
      ctx.restore();
    }
  }
  function drawBands(t) {
    // 족: 위 → 아래로 쓸어내려 가는 세로 띠 / 주기: 왼쪽 → 오른쪽 가로 띠
    if (T.gA > 0.01) {
      const g = T.g || T.gLast, x = gx(g), h = (TB_BOTTOM - TBG.y0 + 8) * ease.outCubic(T.gA);
      const col = GCOL(g);
      const gr = ctx.createLinearGradient(0, TBG.y0, 0, TBG.y0 + h); gr.addColorStop(0, rgba(col, 0.42)); gr.addColorStop(1, rgba(col, 0.3));
      ctx.fillStyle = gr; D.roundRect(x - 2, TBG.y0 - 3, TBG.cw + 4, h, 8); ctx.fill();
      ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2; D.roundRect(x - 2, TBG.y0 - 3, TBG.cw + 4, h, 8); ctx.stroke();
    }
    if (T.pA > 0.01) {
      const p = T.p || T.pLast, y = py(p), w = (18 * TBG.pitchX + 2) * ease.outCubic(T.pA);
      const col = '#6cb8f5';
      ctx.fillStyle = rgba(col, 0.33); D.roundRect(TBG.x0 - 3, y - 2, w, TBG.ch + 4, 8); ctx.fill();
      ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2; D.roundRect(TBG.x0 - 3, y - 2, w, TBG.ch + 4, 8); ctx.stroke();
    }
    if (T.xA > 0.01 && T.g && T.p) {
      const x = gx(T.g) + TBG.cw / 2, y = py(T.p) + TBG.ch / 2, k = ease.outCubic(T.xA), r = lerp(46, 25, k);
      ctx.save(); ctx.strokeStyle = rgba('#e2464b', 0.95 * T.xA); ctx.lineWidth = 3; circle(ctx, x, y, r); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r - 8, y); ctx.lineTo(x - r + 8, y); ctx.moveTo(x + r - 8, y); ctx.lineTo(x + r + 8, y); ctx.moveTo(x, y - r - 8); ctx.lineTo(x, y - r + 8); ctx.moveTo(x, y + r - 8); ctx.lineTo(x, y + r + 8); ctx.stroke();
      ctx.restore();
    }
  }
  function drawCard(c, t) {
    const w = 92, h = 88;
    ctx.save();
    let x = c.x, y = c.y, sc = c.s * (1 + c.lift * 0.04), rot = c.rot;
    if (c.state === 'snap') {
      const q = ease.outCubic(Math.min(1, c.t / 0.28)); const r = c.to;
      x = lerp(c.x0 != null ? c.x0 : c.x, r.x + r.w / 2, q); y = lerp(c.y0 != null ? c.y0 : c.y, r.y + r.h / 2, q); sc = lerp(c.s0 || 1, 38 / 92, q); rot = 0;
      if (c.x0 == null) { c.x0 = c.x; c.y0 = c.y; c.s0 = c.s; }
    }
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    const sh = 8 + c.lift * 14;
    softShadow(-w / 2, -h / 2, w, h, 12, sh, 3 + c.lift * 8, 'rgba(30,40,90,' + (0.22 + c.lift * 0.12) + ')');
    ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill();
    ctx.strokeStyle = c.hold ? COL.sub : '#d7deec'; ctx.lineWidth = c.hold ? 3 : 1.8; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    ctx.save(); D.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, 50, 9); ctx.clip();
    ctx.fillStyle = '#f4f7ff'; ctx.fillRect(-w / 2, -h / 2, w, 56);
    ctx.translate(0, -h / 2 + 28); drawAtomPic(c.Z, 0, 0, 36, c.Z > 12 ? 2.6 : 3.2, t + c.Z); ctx.restore();
    txt('양성자 ' + c.Z + '개', 0, 22, 14, COL.pos, 'center', 800);
    txt(E(c.Z).name, 0, 38, 13, COL.muted, 'center', 800);
    ctx.restore();
  }
  function drawInfo(t) {
    const I = T.info; if (!I) return;
    const e = E(I.Z), r = cellRect(I.Z), w = 168, h = 94;
    const k = outBack(seg(I.t, 0, 0.25)), a = I.t > 4.5 ? (5 - I.t) / 0.5 : 1;
    let bx = clamp(r.x + r.w / 2 - w / 2, 8, VW - w - 8), by = r.y - h - 12, below = false;
    if (by < 30) { by = r.y + r.h + 12; below = true; }
    const tx = clamp(r.x + r.w / 2, bx + 16, bx + w - 16);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(tx, below ? by - 12 : by + h + 12); ctx.scale(k, k); ctx.translate(-tx, -(below ? by - 12 : by + h + 12));
    softShadow(bx, by, w, h, 14, 14, 5, 'rgba(20,30,70,.3)');
    ctx.fillStyle = '#fff'; D.roundRect(bx, by, w, h, 14); ctx.fill();
    ctx.beginPath(); if (below) { ctx.moveTo(tx - 8, by + 0.5); ctx.lineTo(tx, by - 10); ctx.lineTo(tx + 8, by + 0.5); } else { ctx.moveTo(tx - 8, by + h - 0.5); ctx.lineTo(tx, by + h + 10); ctx.lineTo(tx + 8, by + h - 0.5); } ctx.closePath(); ctx.fill();
    txt(e.name, bx + 12, by + 26, 17, COL.ink, 'left', 800);
    txt('원자 번호 ' + e.Z, bx + 12, by + 47, 13.5, COL.muted, 'left', 700);
    txt(posText(e.Z), bx + 12, by + 68, 14, COL.sub, 'left', 800);
    txt(e.sym, bx + 12, by + 88, 13, '#9aa5b6', 'left', 800);
    ctx.save(); D.roundRect(bx + w - 66, by + 10, 58, 60, 10); ctx.clip(); ctx.fillStyle = '#f4f7ff'; ctx.fillRect(bx + w - 70, by + 6, 66, 68); drawAtomPic(e.Z, bx + w - 37, by + 40, 22, e.Z > 12 ? 1.9 : 2.4, t); ctx.restore();
    ctx.restore();
  }
  function drawBanner(t) {
    const Q = T.q;
    if (!Q || (T.mode !== 'address' && T.mode !== 'detective')) return;
    const k = ease.outCubic(T.qSlide);
    if (T.mode === 'address') {
      const cur = Q.list[Math.min(Q.i, Q.list.length - 1)];
      ctx.save(); ctx.translate((1 - k) * 80, 0); ctx.globalAlpha = k;
      panel(180, 6, 440, 34, 17, '#fff', 10, 3);
      ctx.strokeStyle = COL.sub; ctx.lineWidth = 2.4; D.roundRect(180, 6, 440, 34, 17); ctx.stroke();
      if (qDone()) txt('🎉 세 원소의 주소를 모두 찾았어요!', 400, 29, 16, COL.good, 'center', 800);
      else { txt('🧭 찾아요', 200, 29, 14, COL.sub, 'left', 800); txt(cur.p + '주기 ' + cur.g + '족', 400, 30, 20, COL.ink, 'center', 800); txt((Q.done) + ' / ' + Q.list.length, 604, 29, 14, COL.muted, 'right', 800); }
      ctx.restore();
    } else {
      const cur = Q.list[Math.min(Q.i, Q.list.length - 1)];
      ctx.save(); ctx.translate((1 - k) * 80, 0); ctx.globalAlpha = k;
      panel(70, 2, 660, 44, 14, '#fff', 10, 3);
      ctx.strokeStyle = COL.sub; ctx.lineWidth = 2.4; D.roundRect(70, 2, 660, 44, 14); ctx.stroke();
      if (qDone()) txt('🕵️ 두 원소를 모두 찾았어요!', 400, 31, 17, COL.good, 'center', 800);
      else {
        txt('🕵️ 단서 ①', 82, 19, 13, COL.sub, 'left', 800); txt(cur.c1, 160, 19, 13.5, COL.ink, 'left', 700);
        txt('단서 ②', 82, 39, 13, COL.sub, 'left', 800); txt(cur.c2, 142, 39, 14, COL.ink, 'left', 800);
        txt((Q.done) + ' / ' + Q.list.length, 716, 31, 14, COL.muted, 'right', 800);
      }
      ctx.restore();
    }
  }
  /* 주소 찾기 · 원소 탐정에서 칸을 눌렀을 때 */
  function answerCell(Z) {
    const Q = T.q, r = cellRect(Z), cur = Q.list[Q.i], cx = r.x + r.w / 2;
    if (Z === cur.Z) {
      T.pop[Z] = 0.8; T.lit[Z] = 1; okFx(cx, r.y + r.h / 2, COL.good, true); sfx.ding();
      FX.burst(cx, r.y + r.h / 2, { count: RM ? 4 : 9, speed: 140, life: 0.8, size: 3.6, colors: ['#ffd23f', '#fff6c2'], shape: 'star' });
      Q.done++; Q.i++; T.qSlide = 0;
      return true;
    }
    T.shakeZ[Z] = 0.45; Sound.fail();
    let msg;
    if (Q.kind === 'address') msg = '이 원소는 ' + posText(Z) + '이에요';
    else if (Z === 20) msg = '칼슘은 4주기 2족이에요. 단서 ①은 어느 족의 성질일까요?';
    else if (Z === 18 && cur.Z === 10) msg = '아르곤도 18족이지만 3주기예요.';
    else if (Z === 1) msg = '수소는 1족이지만 금속이 아닌 기체예요.';
    else msg = E(Z).name + '은(는) ' + posText(Z) + '이에요.';
    say(cx, r.y - 4, msg, { bg: COL.bad, maxW: 240, dur: 3.4 });
    return false;
  }
  const hasInfo = (Z) => Z <= 20;
  SC.table = {
    label: '🗂️ 주기율표',
    get hint() { return T.mode === 'place' ? '원자 카드를 끌어 양성자 수와 같은 번호의 칸에 놓아요' : T.mode === 'address' ? '위쪽 족 번호와 왼쪽 주기 번호를 눌러 줄을 강조해요' : T.mode === 'detective' ? '단서에 맞는 원소 칸을 눌러요' : '칸을 눌러 원소의 이름과 위치를 알아봐요'; },
    enter() { },
    update(dt) { tableUpdate(dt); },
    draw(t) {
      wall();
      drawTable(t);
      drawBands(t);
      T.cards.slice().sort((a, b) => (a.hold ? 1 : 0) - (b.hold ? 1 : 0)).forEach((c) => drawCard(c, t));
      if (T.deckShown > 0.02 && T.mode === 'place') {
        ctx.save(); ctx.globalAlpha = 0.9 * T.deckShown;
        txt('🃏 원자 카드를 끌어 알맞은 칸에 놓아요', 400, 396, 14, COL.muted, 'center', 800);
        ctx.restore();
      }
      if (T.hoverZ && T.cards.some((c) => c.hold)) { const r = cellRect(T.hoverZ); D.label(r.x + r.w / 2, r.y + r.h + 16, T.hoverZ + '번 칸', { bg: COL.sub, size: 14, pad: 9 }); }
      drawInfo(t);
      drawBanner(t);
      if (T.sweep) {
        // 빛나는 점이 1 → 20번을 차례로 지난다
        const sw = T.sweep, Z = clamp(sw.i, 1, 20), r = cellRect(Z);
        D.glow(r.x + r.w / 2, r.y + r.h / 2, 34, '#ffd23f', 0.85);
        ctx.fillStyle = '#fff'; circle(ctx, r.x + r.w / 2, r.y + r.h / 2, 5); ctx.fill();
      }
      if (T.mode === 'place' && T.sweepDone) { D.label(400, 396, '✨ 1번부터 20번까지, 양성자 수가 커지는 순서로 놓여 있어요', { bg: '#0f8a4b', size: 14, pad: 12 }); }
      if (T.mode === 'rb') { const r37 = cellRect(37); D.label(r37.x + r37.w / 2, r37.y + r37.h + 18, '루비듐 Rb · 5주기 1족', { bg: '#c2410c', size: 13, pad: 9 }); }
      focusRing({ x: 30, y: 74, w: 18 * TBG.pitchX + 14, h: 300 }, 'table', 12);
      if (T.mode === 'address' || T.mode === 'detective') focusRing({ x: 30, y: 44, w: 18 * TBG.pitchX + 14, h: 30 }, 'headers', 12);
      if (T.mode === 'place' && FOC.key === 'deck' && FOC.t > 0) focusRing({ x: 104, y: 396, w: 600, h: 96 }, 'deck', 14);
    },
    hover(p) {
      if (T.mode === 'place') return T.cards.some((c) => c.state === 'deck' && Math.abs(p.x - c.x) < 46 && Math.abs(p.y - c.y) < 44) ? 'grab' : null;
      if (hdrAt(p)) return 'pointer';
      const Z = cellAt(p); if (Z && (hasInfo(Z) || false)) return 'pointer';
      return null;
    },
    down(p) {
      if (T.mode === 'place') {
        for (let i = T.cards.length - 1; i >= 0; i--) {
          const c = T.cards[i];
          if (c.state === 'deck' && Math.abs(p.x - c.x) < 46 && Math.abs(p.y - c.y) < 44) { c.hold = true; c.px = p.x; c.py = p.y; c.ox = c.x - p.x; c.oy = c.y - p.y; c.oxT = clamp(c.x - p.x, -22, 22); c.oyT = Math.min(c.y - p.y, -82); hideHint(); sfx.glug(); return true; }
        }
        return false;
      }
      const h = hdrAt(p);
      if (h) { toggleHdr(h); T.info = null; return false; }
      const Z = cellAt(p);
      if (Z && Z <= 20) {
        if ((T.mode === 'address' || T.mode === 'detective') && T.q && !qDone()) { T.info = null; answerCell(Z); }
        else if (T.mode === 'address' || T.mode === 'free' || T.mode === 'detective' || T.mode === 'rb') { T.info = { Z, t: 0 }; Sound.tick(); T.lit[Z] = 0.6; }
        return false;
      }
      T.info = null;
      return false;
    },
    move(p) {
      const c = T.cards.find((q) => q.hold); if (!c) return;
      c.px = p.x; c.py = p.y;                                  // 위치 · 기울기(끄는 방향으로 ±6°)는 갱신 단계에서 부드럽게 따라가요
      T.hoverZ = cellAt(p);
    },
    up(p) {
      const c = T.cards.find((q) => q.hold); if (!c) return;
      c.hold = false;
      const Z = cellAt(p); T.hoverZ = null;
      if (Z == null) { Sound.click(); return; }
      if (Z === c.Z && !T.filled[Z]) { placeCard(c, Z); return; }
      // 틀린 칸: 흔들린 뒤 덱으로
      c.rot = 0.14; T.shakeZ[Z] = 0.4; Sound.fail();
      const r = cellRect(Z);
      say(clamp(r.x + r.w / 2, 120, 680), r.y - 2, '이 칸은 ' + Z + '번이에요. 양성자 수와 같은 번호의 칸을 찾아요.', { bg: COL.bad, maxW: 250, dur: 3.2 });
    },
  };
  Object.assign(DBG, { T, E, ELM, tableMode, startQuiz, cellRect, placeCard, SYMS, NAMES, answerCell, toggleHdr, DECK_Z, EMPTY_Z, hdrAt, cellAt, startSweep });

  /* =========================================================
     장면 2 · lab — 같은 족 원소의 성질 (물과 반응 / 달군 철솜 + 기체)
     ========================================================= */
  const METALS = [
    { id: 'li', name: '리튬', sym: 'Li', pos: '2주기 1족', g: 1, life: 12 },
    { id: 'na', name: '나트륨', sym: 'Na', pos: '3주기 1족', g: 1, life: 6 },
    { id: 'k', name: '칼륨', sym: 'K', pos: '4주기 1족', g: 1, life: 4 },
    { id: 'mg', name: '마그네슘', sym: 'Mg', pos: '3주기 2족', g: 2, life: 10 },
  ];
  const BK = { w: 130, h: 150, bottom: 436, level: 0.62 };
  const BKX = [120, 290, 460, 630];
  const WS = BK.bottom - BK.h * BK.level;           // 수면 높이
  const W = {
    bk: BKX.map((x, i) => ({ x, i, tint: 0, ink: [], bub: [], piece: null, used: false, sh: 0 })),
    tray: METALS.map((m, i) => ({ id: m.id, m, hx: BKX[i], hy: 150, x: BKX[i], y: 150, vx: 0, vy: 0, hold: false, lift: 0, state: 'dish' })),
    seen: {}, rows: {}, t: 0, drag: null, tw: null,
  };
  const GAS = [
    { id: 'o2', name: '산소', pos: '2주기 16족', burn: true, x: 330 },
    { id: 'he', name: '헬륨', pos: '1주기 18족', x: 450 },
    { id: 'ne', name: '네온', pos: '2주기 18족', x: 570 },
    { id: 'ar', name: '아르곤', pos: '3주기 18족', x: 690 },
  ];
  const JAR = { w: 92, h: 176, bottom: 436 };
  const FLAME = { x: 100, y: 342 };
  const G = {
    jars: GAS.map((g) => Object.assign({ tested: false, lid: 0, flash: 0, sparks: [], res: '', stamp: 0, glow: 0 }, g)),
    wool: { x: 190, y: 404, hx: 190, hy: 404, heat: 0, hold: false, lift: 0, state: 'home', st: null, burnt: 0, seed: 1 },
    seen: {}, t: 0, run: null, msg: 0,
  };
  const LAB = { mode: 'water' };
  function labReset() {
    W.bk.forEach((b) => { b.tint = 0; b.ink = []; b.bub = []; b.piece = null; b.used = false; });
    W.tray.forEach((tr) => { tr.state = 'dish'; tr.x = tr.hx; tr.y = tr.hy; tr.hold = false; });
    W.seen = {}; W.rows = {}; W.drag = null; W.tw = null;
    G.jars.forEach((j) => { j.tested = false; j.lid = 0; j.flash = 0; j.sparks = []; j.res = ''; j.stamp = 0; j.glow = 0; });
    G.wool.x = G.wool.hx; G.wool.y = G.wool.hy; G.wool.heat = 0; G.wool.hold = false; G.wool.state = 'home'; G.wool.burnt = 0;
    G.seen = {}; G.run = null; labTables();
  }
  function setLabMode(m) { LAB.mode = m; labTables(); }

  /* 결과표 (사이드 카드) — 관찰 후 타자 효과로 채워짐 */
  const RESULT_TXT = {
    li: ['발생해요', '붉게 변해요'], na: ['발생해요', '붉게 변해요'], k: ['발생해요', '붉게 변해요'], mg: ['거의 없어요', '변화 없어요'],
    o2: ['불꽃을 튀기며 타요'], he: ['변화 없어요'], ne: ['변화 없어요'], ar: ['변화 없어요'],
  };
  const typing = {};
  function typeInto(el, text, key) {
    clearInterval(typing[key]); el.textContent = ''; let i = 0;
    typing[key] = setInterval(() => { i++; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typing[key]); }, RM ? 1 : 34);
    if (RM) { clearInterval(typing[key]); el.textContent = text; }
  }
  function labTables() {
    const wt = $('#tblWater'), gt = $('#tblGas');
    if (wt) { wt.hidden = S.scene !== 'lab' || LAB.mode !== 'water'; }
    if (gt) { gt.hidden = S.scene !== 'lab' || LAB.mode !== 'gas'; }
    METALS.forEach((m) => {
      const r = $('#rw-' + m.id); if (!r) return;
      const done = !!W.rows[m.id];
      const c1 = r.querySelector('.c1'), c2 = r.querySelector('.c2');
      c1.textContent = done ? RESULT_TXT[m.id][0] : '?'; c2.textContent = done ? RESULT_TXT[m.id][1] : '?';
      r.classList.toggle('done', done);
    });
    GAS.forEach((g) => { const r = $('#rg-' + g.id); if (!r) return; const c = r.querySelector('.c1'); const done = !!G.seen[g.id]; c.textContent = done ? RESULT_TXT[g.id][0] : '?'; r.classList.toggle('done', done); });
  }
  function revealRow(kind, id) {
    const r = $((kind === 'w' ? '#rw-' : '#rg-') + id); if (!r) return;
    r.classList.add('done');
    r.querySelectorAll('.c1, .c2').forEach((c, i) => { const tx = RESULT_TXT[id][i]; if (tx != null && c) typeInto(c, tx, kind + id + i); });
  }

  /* ---------- 유리 비커 ---------- */
  function beakerGlass(x, bottom, w, h, level, tint, t, inner) {
    const top = bottom - h, r = 12, ly = bottom - h * level;
    const body = () => { ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x - w / 2, bottom - r); ctx.quadraticCurveTo(x - w / 2, bottom, x - w / 2 + r, bottom); ctx.lineTo(x + w / 2 - r, bottom); ctx.quadraticCurveTo(x + w / 2, bottom, x + w / 2, bottom - r); ctx.lineTo(x + w / 2, top); };
    groundShadow(x, bottom + 6, w / 2 + 8, 7, 1);
    ctx.save(); body(); ctx.closePath();
    const gb = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gb.addColorStop(0, 'rgba(176,200,232,.5)'); gb.addColorStop(0.14, 'rgba(228,241,255,.26)'); gb.addColorStop(0.86, 'rgba(228,241,255,.2)'); gb.addColorStop(1, 'rgba(170,196,230,.5)');
    ctx.fillStyle = gb; ctx.fill();
    ctx.save(); body(); ctx.closePath(); ctx.clip();
    const wg = ctx.createLinearGradient(0, ly, 0, bottom);
    wg.addColorStop(0, mix('#d7ecff', '#ffc2de', tint)); wg.addColorStop(1, mix('#aed6f8', '#ff9ac6', tint));
    ctx.fillStyle = wg; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 4, bottom + 2);
    for (let i = 0; i <= 20; i++) { const px = x - w / 2 - 4 + ((w + 8) * i) / 20; ctx.lineTo(px, ly + Math.sin(t * 2.4 + i * 0.75 + x) * 1.1); }
    ctx.lineTo(x + w / 2 + 4, bottom + 2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x, ly, w / 2 - 2, 3.2, 0, 0, TAU); ctx.fill();
    if (inner) inner({ x, top, bottom, ly, w });
    ctx.restore();
    ctx.restore();
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; body(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 5, top - 1); ctx.lineTo(x - w / 2 + 1, top + 3); ctx.moveTo(x + w / 2 + 5, top - 1); ctx.lineTo(x + w / 2 - 1, top + 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - w * 0.36, top + 14); ctx.lineTo(x - w * 0.36, bottom - 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.37, top + 18); ctx.lineTo(x + w * 0.37, bottom - 20); ctx.stroke();
    ctx.restore();
  }
  /* 금속 조각 그림 (석유 속 · 물 위) */
  function metalPiece(id, x, y, r, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (id === 'mg') {
      // 회백색 리본 조각 (말려 있음)
      ctx.rotate(o.rot || 0);
      const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#e9ecf0'); g.addColorStop(1, '#9aa1ad');
      ctx.fillStyle = g; ctx.strokeStyle = '#7a8291'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-r * 1.5, r * 0.15); ctx.bezierCurveTo(-r, -r * 0.9, -r * 0.2, r * 0.7, r * 0.3, -r * 0.2); ctx.bezierCurveTo(r * 0.7, -r * 0.8, r * 1.1, r * 0.4, r * 1.6, -r * 0.1); ctx.lineTo(r * 1.6, r * 0.28); ctx.bezierCurveTo(r * 1.1, r * 0.7, r * 0.7, -r * 0.5, r * 0.3, r * 0.1); ctx.bezierCurveTo(-r * 0.2, r * 1.0, -r, -r * 0.5, -r * 1.5, r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore(); return;
    }
    const f = o.form || 0, rad = lerp(r * 0.22, r, f);
    ctx.rotate((o.rot || 0) * (1 - f));
    const gr = ctx.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#d9dee6'); gr.addColorStop(1, '#98a1af');
    ctx.fillStyle = gr; ctx.strokeStyle = 'rgba(90,100,120,.7)'; ctx.lineWidth = 1.2;
    D.roundRect(-r, -r * lerp(0.9, 1, f), r * 2, r * 2 * lerp(0.9, 1, f), rad); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.38, r * 0.2, -0.6, 0, TAU); ctx.fill();
    if (id !== 'k' || true) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(r * 0.3, r * 0.35, r * 0.18, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function dish(x, y, oil) {
    ctx.save();
    const g = ctx.createLinearGradient(0, y - 6, 0, y + 14); g.addColorStop(0, 'rgba(230,240,255,.8)'); g.addColorStop(1, 'rgba(176,196,228,.7)');
    ctx.fillStyle = g; ctx.strokeStyle = '#98abc6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + 4, 52, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (oil) { ctx.fillStyle = 'rgba(245,214,120,.75)'; ctx.beginPath(); ctx.ellipse(x, y + 3, 44, 10, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x - 8, y, 14, 3, 0, Math.PI, TAU); ctx.stroke(); }
    ctx.restore();
  }

  /* ---------- 물과 반응 ---------- */
  function ink(bk, x, y, r0, a0, life) { bk.ink.push({ x, y, r: r0, a: a0, t: 0, life, ph: Math.random() * TAU, g: rand(14, 26) }); if (bk.ink.length > 60) bk.ink.shift(); }
  function dropPiece(bk, tr) {
    const m = tr.m;
    bk.used = true; tr.state = 'used';
    bk.piece = { id: m.id, m, x: bk.x, y: 210, vx: 0, vy: 0, r: m.id === 'mg' ? 11 : 12, r0: m.id === 'mg' ? 11 : 12, form: 0, t: -1, state: 'tw', tt: 0, from: { x: tr.x, y: tr.y }, dir: Math.random() < 0.5 ? -1 : 1, rot: 0.2, flame: 0, acc: 0 };
    sfx.glug();
  }
  function bkUpdate(bk, dt) {
    bk.sh = Math.max(0, bk.sh - dt);
    // 물 색 (분홍)
    const p = bk.piece;
    // 잉크 번짐
    for (let i = bk.ink.length - 1; i >= 0; i--) { const b = bk.ink[i]; b.t += dt; b.r += b.g * dt; if (b.t > b.life) bk.ink.splice(i, 1); }
    for (let i = bk.bub.length - 1; i >= 0; i--) { const b = bk.bub[i]; b.age += dt; b.y -= b.vy * dt; b.x += Math.sin(b.age * 14 + b.ph) * 0.3; if (b.y < WS + 1) bk.bub.splice(i, 1); }
    if (!p) return;
    const m = p.m, left = bk.x - BK.w / 2 + 6, right = bk.x + BK.w / 2 - 6;
    if (p.state === 'tw') {
      p.tt += dt; const q = ease.inOutCubic(clamp(p.tt / 0.38, 0, 1));
      p.x = lerp(p.from.x, bk.x, q); p.y = lerp(p.from.y, 232, q);
      if (p.tt >= 0.38) { p.state = 'fall'; p.vy = 40; sfx.glug(); }
      return;
    }
    if (p.state === 'fall') {
      p.vy += 700 * dt; p.y += p.vy * dt;
      if (p.y >= WS - 2) {
        p.state = 'react'; p.t = 0; p.y = WS;
        for (let k = 0; k < 4; k++) bk.bub.push({ x: p.x + rand(-6, 6), y: WS + rand(2, 14), vy: rand(30, 60), age: 0, ph: rand(0, 6), r: rand(1.2, 2.2) });
        for (let k = 0; k < (RM ? 3 : 8); k++) FX.emit({ x: p.x + rand(-6, 6), y: WS - 2, vx: rand(-50, 50), vy: rand(-140, -50), life: rand(0.35, 0.6), size: rand(1.4, 2.6), color: '#cfe8ff', gravity: 420, shape: 'circle' });
        sfx.fizz();
        if (m.id === 'mg') { p.state = 'sink'; p.vy = 30; }
      }
      return;
    }
    if (p.state === 'sink') {
      p.t += dt; p.vy = Math.min(p.vy + 260 * dt, 150); p.y += p.vy * dt * 0.8; p.x += Math.sin(p.t * 3) * 0.3;
      const floor = BK.bottom - 12;
      if (p.y >= floor) { p.y = floor; p.vy = 0; p.state = 'rest'; }
      return;
    }
    p.t += dt;
    if (p.state === 'rest') {
      if ((p.t > 3 && !p.b1) || (p.t > 7 && !p.b2)) { if (!p.b1) p.b1 = true; else p.b2 = true; bk.bub.push({ x: p.x + rand(-5, 5), y: p.y - 6, vy: 28, age: 0, ph: 1, r: 1.4 }); }
      if (p.t > m.life) bk.piece = null;
      return;
    }
    // 떠서 움직이는 금속 (리튬 · 나트륨 · 칼륨)
    const speed = m.id === 'li' ? 15 : m.id === 'na' ? 110 : 190;
    p.form = ease.outCubic(clamp(p.t / (m.id === 'li' ? 0.01 : 0.4), 0, 1)) * (m.id === 'li' ? 0 : 1);
    if (m.id === 'li') p.form = 0;
    p.x += p.dir * speed * dt;
    if (p.x < left + p.r) { p.x = left + p.r; p.dir = 1; if (m.id !== 'li') p.rot = rand(0, 6); }
    if (p.x > right - p.r) { p.x = right - p.r; p.dir = -1; }
    if (m.id !== 'li' && Math.random() < dt * 0.9) p.dir *= -1;
    p.y = WS - p.r * 0.15 + (m.id === 'li' ? Math.sin(p.t * 5) * 2 : Math.sin(p.t * 17) * 0.8);
    const shrink = m.id === 'li' ? 1 - 0.8 * clamp(p.t / m.life, 0, 1) : (1 - 0.7 * clamp((p.t - (m.life - 2)) / 2, 0, 1));
    p.r = p.r0 * shrink;
    // 기포 · 분홍 번짐 · 불티
    p.acc += dt * (m.id === 'li' ? (RM ? 8 : 15) : m.id === 'na' ? (RM ? 12 : 30) : (RM ? 14 : 38));
    while (p.acc >= 1) { p.acc -= 1; bk.bub.push({ x: p.x + rand(-p.r, p.r), y: p.y + p.r * 0.6, vy: rand(25, 55), age: 0, ph: rand(0, 6), r: rand(1.1, 2.1) }); }
    p.inkT = (p.inkT || 0) - dt;
    if (p.inkT <= 0) { p.inkT = m.id === 'li' ? 0.3 : 0.05; ink(bk, p.x, p.y + 4, 5, m.id === 'li' ? 0.34 : 0.3, m.id === 'li' ? 3.4 : 2.6); }
    const rise = m.id === 'li' ? 0.045 : m.id === 'na' ? 0.16 : 0.2;
    bk.tint = Math.min(0.58, bk.tint + dt * rise);
    if (m.id === 'na' && Math.random() < dt * 4) FX.emit({ x: p.x, y: WS - 4, vx: rand(-40, 40), vy: rand(-110, -50), life: rand(0.3, 0.55), size: rand(1.3, 2.2), color: '#ffd23f', gravity: 380, shape: 'circle' });
    if (m.id === 'k') {
      p.flame = clamp(p.t / 0.3, 0, 1);
      if (Math.random() < dt * 6) FX.emit({ x: p.x, y: WS - 10, vx: rand(-50, 50), vy: rand(-120, -40), life: rand(0.3, 0.6), size: rand(1.4, 2.4), color: '#d9b8ff', gravity: 320, shape: 'circle' });
    }
    p.fz = (p.fz || 0) - dt;
    if (p.fz <= 0 && m.id !== 'li') { p.fz = m.id === 'k' ? 0.09 : 0.16; if (m.id === 'k') sfx.zap(); else sfx.fizz(); }
    if (m.id === 'k' && !p.popped && p.t > m.life - 0.25) { p.popped = true; sfx.pop(); FX.burst(p.x, WS - 6, { count: RM ? 4 : 10, speed: 150, life: 0.5, size: 2.8, colors: ['#e9d5ff', '#ffffff', '#c9a0ff'], gravity: 300 }); }
    if (p.t > m.life) { bk.piece = null; if (m.id === 'na') FX.burst(p.x, WS - 4, { count: RM ? 3 : 7, speed: 100, life: 0.4, size: 2.4, colors: ['#e5e7eb', '#ffffff'], gravity: 260 }); }
  }
  function labUpdateWater(dt) {
    W.t += dt;
    W.bk.forEach((bk) => bkUpdate(bk, dt));
    W.tray.forEach((tr) => {
      tr.lift = SciSim.approach(tr.lift, tr.hold ? 1 : 0, dt, 18);
      if (tr.state === 'dish' && !tr.hold) {
        const K = 200, Dm = 16, n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
        for (let k = 0; k < n; k++) { tr.vx += ((tr.hx - tr.x) * K - tr.vx * Dm) * h; tr.vy += ((tr.hy - tr.y) * K - tr.vy * Dm) * h; tr.x += tr.vx * h; tr.y += tr.vy * h; }
      }
    });
    // 지켜본 시간 (2.5초 이상)
    W.bk.forEach((bk) => {
      const p = bk.piece; if (!p) return;
      const id = p.id;
      if (p.t >= 2.5 && !W.seen[id]) { W.seen[id] = true; W.rows[id] = true; revealRow('w', id); Sound.tick(); }
    });
  }
  function drawWaterBench(t) {
    bench(0, 440, VW, 90);
    // 시료 접시 선반
    panel(52, 78, 696, 128, 18, 'rgba(255,255,255,.92)', 12, 4);
    txt('🧪 금속 조각 (석유 속에 보관) — 끌어서 비커에 넣어요', 70, 100, 14, COL.muted, 'left', 800);
    W.tray.forEach((tr, i) => {
      dish(tr.hx, tr.hy + 18, true);
      const m = tr.m;
      txt(m.name, tr.hx, tr.hy + 56, 14.5, COL.ink, 'center', 800);
      txt(m.pos, tr.hx, tr.hy + 73, 13, COL.sub, 'center', 800);
    });
    W.tray.forEach((tr) => {
      if (tr.state !== 'dish') return;
      const lift = tr.lift, sc = 1 + lift * 0.18;
      ctx.save(); ctx.translate(tr.x, tr.y); ctx.scale(sc, sc);
      if (lift > 0.02) { ctx.fillStyle = 'rgba(30,40,70,' + (0.2 * lift).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(8 * lift, 26, 18, 5, 0, 0, TAU); ctx.fill(); }
      metalPiece(tr.id, 0, 0, tr.m.id === 'mg' ? 11 : 12, { rot: tr.m.id === 'mg' ? 0.15 : 0.2 });
      ctx.restore();
    });
    // 비커
    W.bk.forEach((bk) => {
      const dropOn = W.drag && Math.abs(W.drag.x - bk.x) < 76 && W.drag.y > 180;
      ctx.save(); if (bk.sh > 0) ctx.translate(Math.sin(bk.sh * 60) * 3, 0);
      beakerGlass(bk.x, BK.bottom, BK.w, BK.h, BK.level, bk.tint, t, (info) => {
        // 분홍 번짐
        bk.ink.forEach((b) => {
          const k = b.t / b.life, a = b.a * (1 - k) * (k < 0.1 ? k / 0.1 : 1);
          for (let j = 0; j < 3; j++) { const ox = Math.sin(b.ph + j * 2.1 + b.t * 1.4) * b.r * 0.32, oy = Math.cos(b.ph + j * 1.7 + b.t * 1.1) * b.r * 0.26; const g = ctx.createRadialGradient(b.x + ox, b.y + oy, 0, b.x + ox, b.y + oy, b.r); g.addColorStop(0, rgba('#ff4fa3', a)); g.addColorStop(1, rgba('#ff4fa3', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x + ox, b.y + oy, b.r, 0, TAU); ctx.fill(); }
        });
        // 기포
        bk.bub.forEach((b) => { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.strokeStyle = 'rgba(70,130,200,.8)'; ctx.lineWidth = 1; circle(ctx, b.x, b.y, b.r); ctx.fill(); ctx.stroke(); });
        // 가라앉은 마그네슘
        const p = bk.piece;
        if (p && (p.state === 'sink' || p.state === 'rest')) metalPiece('mg', p.x, p.y, p.r, { rot: 0.1 });
      });
      ctx.restore();
      // 수면 위 금속 · 불꽃
      const p = bk.piece;
      if (p && p.state !== 'sink' && p.state !== 'rest') {
        if (p.state === 'tw' || p.state === 'fall') {
          if (p.state === 'tw') { ctx.save(); ctx.strokeStyle = '#8b94a3'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x + 5, p.y - 14); ctx.lineTo(p.x + 40, p.y - 78); ctx.moveTo(p.x - 5, p.y - 14); ctx.lineTo(p.x + 28, p.y - 82); ctx.stroke(); ctx.strokeStyle = '#c3cad6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x + 5, p.y - 14); ctx.lineTo(p.x + 40, p.y - 78); ctx.stroke(); ctx.restore(); }
          metalPiece(p.id, p.x, p.y, p.r, { rot: p.rot });
        } else {
          if (p.m.id === 'k') {
            const fl = p.flame, fh = 40 * fl * (1 + Math.sin(t * 22) * 0.12);
            D.glow(p.x, p.y - 6, 40, '#c9a0ff', 0.35 * fl);
            ctx.save(); ctx.translate(p.x, p.y - 4);
            const g = ctx.createLinearGradient(0, 0, 0, -fh); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.45, 'rgba(201,160,255,.85)'); g.addColorStop(1, 'rgba(201,160,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.bezierCurveTo(-18, -fh * 0.5, -4 + Math.sin(t * 17) * 4, -fh * 0.8, Math.sin(t * 11) * 3, -fh); ctx.bezierCurveTo(4 + Math.sin(t * 15) * 4, -fh * 0.8, 18, -fh * 0.5, 15, 0); ctx.closePath(); ctx.fill();
            const g2 = ctx.createLinearGradient(0, 0, 0, -fh * 0.6); g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(0, -fh * 0.75, 6, 0); ctx.closePath(); ctx.fill();
            ctx.restore();
          }
          ctx.save(); D.roundRect(bk.x - BK.w / 2 + 2, p.y - 24, BK.w - 4, 30, 4); ctx.restore();
          metalPiece(p.id, p.x, p.y, p.r, { form: p.form, rot: p.rot });
        }
      }
      txt('물 + 페놀프탈레인 용액', bk.x, BK.bottom + 24, 13, COL.muted, 'center', 800);
      if (dropOn) { ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.5 + 0.4 * Math.sin(t * 9)); ctx.lineWidth = 4; D.roundRect(bk.x - BK.w / 2 - 8, BK.bottom - BK.h - 14, BK.w + 16, BK.h + 20, 14); ctx.stroke(); ctx.restore(); }
    });
    // 끌고 있는 조각은 맨 위에
    if (W.drag) {
      const tr = W.drag.tr;
      ctx.save(); ctx.translate(tr.x, tr.y); ctx.scale(1.18, 1.18);
      ctx.fillStyle = 'rgba(30,40,70,.22)'; ctx.beginPath(); ctx.ellipse(8, 26, 18, 5, 0, 0, TAU); ctx.fill();
      metalPiece(tr.id, 0, 0, tr.m.id === 'mg' ? 11 : 12, { rot: 0.2 });
      ctx.restore();
    }
  }

  /* ---------- 달군 철솜 + 기체 집기병 ---------- */
  function woolDraw(x, y, heat, burnt, seed, sc, o) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc || 1, sc || 1);
    // 손잡이 (철사)
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(66, 58); ctx.stroke();
    ctx.strokeStyle = '#9aa3b2'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(7, 7); ctx.lineTo(65, 57); ctx.stroke();
    const sz = (1 - burnt * 0.25) * 17;
    if (heat > 0.05) D.glow(0, 0, sz * (1.6 + heat * 1.8), mix('#ff7a2a', '#ffd27a', heat * heat), 0.35 + 0.5 * heat);
    const base = burnt > 0.5 ? '#24262c' : mix('#8a909c', mix('#d8421a', '#ffb347', Math.max(0, heat - 0.55) * 2), clamp(heat * 1.25, 0, 1));
    ctx.fillStyle = base; circle(ctx, 0, 0, sz * 0.82); ctx.fill();
    let sd = seed * 977 + 13; const rn = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 34; i++) {
      const a = rn() * TAU, r1 = rn() * sz * 0.9, l = 3 + rn() * 7;
      ctx.strokeStyle = burnt > 0.5 ? (i % 2 ? '#33353c' : '#1a1b20') : heat > 0.2 ? mix(i % 2 ? '#a8aebb' : '#6f7684', i % 2 ? '#ff9a4a' : '#ff5a1f', clamp(heat * 1.3, 0, 1)) : (i % 2 ? '#b4bac6' : '#6f7684');
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a + 0.6) * (r1 + l), Math.sin(a + 0.6) * (r1 + l) * 0.9); ctx.stroke();
    }
    ctx.restore();
  }
  function lampDraw(t) {
    const x = 100, b = 436;
    groundShadow(x, b + 4, 44, 6, 1);
    // 유리 몸통
    const g = ctx.createLinearGradient(x - 34, 0, x + 34, 0); g.addColorStop(0, 'rgba(176,205,236,.7)'); g.addColorStop(0.3, 'rgba(235,246,255,.55)'); g.addColorStop(1, 'rgba(170,196,230,.7)');
    ctx.fillStyle = g; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(x - 12, b - 52); ctx.quadraticCurveTo(x - 34, b - 40, x - 34, b - 18); ctx.quadraticCurveTo(x - 34, b, x - 18, b); ctx.lineTo(x + 18, b); ctx.quadraticCurveTo(x + 34, b, x + 34, b - 18); ctx.quadraticCurveTo(x + 34, b - 40, x + 12, b - 52); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,214,150,.55)'; ctx.beginPath(); ctx.moveTo(x - 31, b - 22); ctx.quadraticCurveTo(x, b - 30, x + 31, b - 22); ctx.lineTo(x + 30, b - 14); ctx.quadraticCurveTo(x, b - 6, x - 30, b - 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 26, b - 34); ctx.lineTo(x - 26, b - 12); ctx.stroke();
    // 뚜껑 모양 목 + 심지
    ctx.fillStyle = '#9ca3af'; D.roundRect(x - 10, b - 62, 20, 12, 3); ctx.fill();
    ctx.fillStyle = '#4b5563'; D.roundRect(x - 3, b - 70, 6, 10, 2); ctx.fill();
    D.flame(x, b - 70, 40, t, { glow: '#ffa733' });
  }
  function labUpdateGas(dt) {
    G.t += dt; const w = G.wool;
    w.lift = SciSim.approach(w.lift, w.hold ? 1 : 0, dt, 16);
    const nearFlame = Math.hypot(w.x - FLAME.x, w.y - FLAME.y) < 40;
    if (!G.run) {
      if (nearFlame && w.state !== 'run') w.heat = Math.min(1, w.heat + dt / 1.2);
      else w.heat = Math.max(0, w.heat - dt / (w.hold ? 3.5 : 2.5));
      if (!w.hold && w.state === 'home') {
        const K = 190, Dm = 15, n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
        w.vx = w.vx || 0; w.vy = w.vy || 0;
        for (let k = 0; k < n; k++) { w.vx += ((w.hx - w.x) * K - w.vx * Dm) * h; w.vy += ((w.hy - w.y) * K - w.vy * Dm) * h; w.x += w.vx * h; w.y += w.vy * h; }
      }
    }
    if (nearFlame && w.heat < 1 && !G.run && Math.random() < dt * 14) FX.emit({ x: FLAME.x + rand(-10, 10), y: FLAME.y + rand(-6, 10), vx: rand(-20, 20), vy: rand(-60, -20), life: 0.5, size: rand(1.4, 2.4), color: '#ffd27a', gravity: 60, shape: 'circle' });
    G.msg = Math.max(0, G.msg - dt);
    G.jars.forEach((j) => {
      j.glow = Math.max(0, j.glow - dt); j.flash = Math.max(0, j.flash - dt * 2.2); j.stamp = Math.max(0, j.stamp - dt);
      const lidT = G.run && G.run.jar === j && G.run.t < G.run.dur - 0.3 ? 1 : 0;
      j.lid = SciSim.approach(j.lid, lidT, dt, 12);
      for (let i = j.sparks.length - 1; i >= 0; i--) {
        const s = j.sparks[i]; s.age += dt; if (s.age > s.life) { j.sparks.splice(i, 1); continue; }
        s.vy += 520 * dt; s.vx *= Math.exp(-1.8 * dt); s.x += s.vx * dt; s.y += s.vy * dt;
        const L = G.jars.indexOf(j), cx = j.x;
        if (s.x < cx - JAR.w / 2 + 4) { s.x = cx - JAR.w / 2 + 4; s.vx *= -0.5; } if (s.x > cx + JAR.w / 2 - 4) { s.x = cx + JAR.w / 2 - 4; s.vx *= -0.5; }
        if (s.y > JAR.bottom - 18) { s.y = JAR.bottom - 18; s.vy *= -0.2; }
      }
    });
    if (G.run) gasRunUpdate(dt);
  }
  function startGasRun(j) {
    const w = G.wool;
    G.run = { jar: j, t: 0, dur: j.burn ? 3.6 : 3.2, flags: {}, x0: w.x, y0: w.y, heat0: w.heat };
    w.state = 'run'; w.hold = false; w.vx = 0; w.vy = 0; sfx.glug();
  }
  function gasRunUpdate(dt) {
    const r = G.run, j = r.jar, w = G.wool, t = (r.t += dt);
    const cx = j.x, inX = cx + 6, inY = 332;
    // 병 입구 위로 → 안으로 → 잠시 머물기 → 나오기
    const a = ease.inOutCubic(seg(t, 0, 0.6)), b = ease.inOutCubic(seg(t, 0.6, 1.2)), c = ease.inOutCubic(seg(t, r.dur - 0.9, r.dur - 0.2));
    const mx = lerp(r.x0, cx, a), my = lerp(r.y0, 240, a);
    w.x = lerp(lerp(mx, inX, b), w.hx, c); w.y = lerp(lerp(my, inY, b), w.hy, c);
    if (j.burn) {
      if (t >= 1.2 && !r.flags.burn) {
        r.flags.burn = true; j.flash = 1; sfx.whoosh(); sfx.noise(0.5, 3500, 900, 0.1, 'highpass');
        for (let i = 0; i < (RM ? 36 : 80); i++) { const an = rand(0, TAU), sp = rand(80, 240); j.sparks.push({ x: inX, y: inY - 4, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 80, age: 0, life: rand(0.6, 1.2) }); }
      }
      if (t >= 1.2 && t < r.dur - 1.0 && Math.random() < dt * 20) { j.sparks.push({ x: inX + rand(-6, 6), y: inY - 4, vx: rand(-120, 120), vy: rand(-220, -60), age: 0, life: rand(0.5, 1) }); sfx.zap(); }
      w.heat = t < 1.2 ? r.heat0 : Math.min(1, 0.6 + 0.4 * Math.sin(t * 18) * 0.5 + 0.4);
      w.burnt = seg(t, 1.3, 2.4);
    } else {
      w.heat = t < 1.2 ? r.heat0 : r.heat0 * (1 - seg(t, 1.2, 3.0));
      if (t >= 2.6 && !r.flags.stamp) { r.flags.stamp = true; j.stamp = 1.4; }
    }
    if (t >= r.dur) {
      j.tested = true; G.seen[j.id] = true; j.glow = 1; revealRow('g', j.id); Sound.tick();
      w.state = 'home'; w.x = w.hx; w.y = w.hy; w.heat = 0; w.burnt = 0; if (j.burn) w.seed += 1;
      G.run = null;
    }
  }
  function drawGasBench(t) {
    bench(0, 440, VW, 90);
    lampDraw(t);
    txt('알코올램프', 100, 463, 13.5, COL.muted, 'center', 800);
    // 달굼 막대
    const w = G.wool;
    ctx.save(); ctx.translate(30, 270);
    txt('🔥 철솜 달구기', 0, 0, 13.5, COL.muted, 'left', 800);
    ctx.fillStyle = '#e8edf5'; D.roundRect(0, 8, 130, 14, 7); ctx.fill();
    const hg = ctx.createLinearGradient(0, 0, 130, 0); hg.addColorStop(0, '#ffb347'); hg.addColorStop(1, '#e2464b');
    ctx.fillStyle = hg; D.roundRect(0, 8, Math.max(0, 130 * w.heat), 14, 7); ctx.fill();
    ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 1.4; D.roundRect(0, 8, 130, 14, 7); ctx.stroke();
    txt(w.heat > 0.85 ? '빨갛게 달았어요!' : w.heat > 0.05 ? '달구는 중…' : '불꽃에 대어 봐요', 0, 40, 13, w.heat > 0.85 ? COL.warn : '#8a95a8', 'left', 800);
    ctx.restore();
    // 집기병
    G.jars.forEach((j) => {
      const x = j.x, top = JAR.bottom - JAR.h;
      groundShadow(x, JAR.bottom + 5, JAR.w / 2 + 8, 6, 1);
      const body = () => { ctx.beginPath(); ctx.moveTo(x - JAR.w / 2, top); ctx.lineTo(x - JAR.w / 2, JAR.bottom - 10); ctx.quadraticCurveTo(x - JAR.w / 2, JAR.bottom, x - JAR.w / 2 + 10, JAR.bottom); ctx.lineTo(x + JAR.w / 2 - 10, JAR.bottom); ctx.quadraticCurveTo(x + JAR.w / 2, JAR.bottom, x + JAR.w / 2, JAR.bottom - 10); ctx.lineTo(x + JAR.w / 2, top); };
      ctx.save(); body(); ctx.closePath();
      const gb = ctx.createLinearGradient(x - JAR.w / 2, 0, x + JAR.w / 2, 0); gb.addColorStop(0, 'rgba(176,200,232,.5)'); gb.addColorStop(0.15, 'rgba(228,241,255,.22)'); gb.addColorStop(0.85, 'rgba(228,241,255,.18)'); gb.addColorStop(1, 'rgba(170,196,230,.5)');
      ctx.fillStyle = gb; ctx.fill(); ctx.clip();
      // 바닥 모래
      ctx.fillStyle = '#e8d3a2'; ctx.fillRect(x - JAR.w / 2, JAR.bottom - 16, JAR.w, 18);
      // 기체의 일렁임
      ctx.strokeStyle = 'rgba(140,170,215,.25)'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let i = 0; i <= 10; i++) { const yy = JAR.bottom - 24 - i * 14 - k * 6, xx = x - 24 + k * 24 + Math.sin(t * 1.4 + i * 0.7 + k * 2 + j.x) * 4; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
      if (j.flash > 0) D.glow(x + 6, 332, 80 * (0.6 + j.flash), '#ffffff', 0.9 * j.flash);
      // 불티
      j.sparks.forEach((s) => { const a = 1 - s.age / s.life; ctx.strokeStyle = 'rgba(255,' + Math.round(180 + 60 * a) + ',' + Math.round(80 + 100 * a) + ',' + a.toFixed(2) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03); ctx.stroke(); });
      ctx.restore();
      ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; body(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - JAR.w * 0.34, top + 16); ctx.lineTo(x - JAR.w * 0.34, JAR.bottom - 24); ctx.stroke();
      ctx.restore();
      // 뚜껑 (열리면 옆으로 미끄러지며 들린다)
      const ls = j.lid;
      ctx.save(); ctx.translate(x + ls * 42, top - 4 - ls * 18); ctx.rotate(ls * 0.35);
      ctx.fillStyle = 'rgba(190,215,245,.75)'; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.4; D.roundRect(-JAR.w / 2 - 6, -6, JAR.w + 12, 10, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c0cfe6'; D.roundRect(-6, -13, 12, 8, 3); ctx.fill();
      ctx.restore();
      // 이름표 · 결과
      txt(j.name, x, JAR.bottom + 24, 15, COL.ink, 'center', 800);
      txt(j.pos, x, JAR.bottom + 42, 13, COL.sub, 'center', 800);
      if (j.tested) { const ok = j.burn; ctx.save(); ctx.translate(x, top + 34); D.label(0, 0, ok ? '🔥 불꽃을 튀기며 탔어요' : '변화 없음', { bg: ok ? '#c2410c' : '#6b7486', size: 13, pad: 9 }); ctx.restore(); }
      if (j.stamp > 0) { const k = j.stamp > 1.1 ? 1.5 - (1.4 - j.stamp) * 1.6 : 1; ctx.save(); ctx.globalAlpha = Math.min(1, j.stamp * 2); ctx.translate(x, top + 80); ctx.rotate(-0.12); ctx.scale(k, k); ctx.strokeStyle = '#d6343a'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,.9)'; D.roundRect(-44, -17, 88, 34, 8); ctx.fill(); ctx.stroke(); txt('변화 없음', 0, 6, 17, '#d6343a', 'center', 800); ctx.restore(); }
      if (G.drag && Math.abs(G.drag.x - x) < 56 && G.drag.y < 330) { ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.5 + 0.4 * Math.sin(t * 9)); ctx.lineWidth = 4; D.roundRect(x - JAR.w / 2 - 8, top - 30, JAR.w + 16, 62, 12); ctx.stroke(); ctx.restore(); }
    });
    // 철솜
    woolDraw(w.x, w.y, w.heat, w.burnt, w.seed, 1 + w.lift * 0.1);
    if (!w.hold && w.state === 'home' && w.heat < 0.05 && G.t > 0.4) { const a = 0.5 + 0.5 * Math.sin(t * 5); txt('👆 철솜을 끌어요', w.hx - 20, w.hy + 44, 13.5, rgba(COL.sub, 0.6 + 0.4 * a), 'center', 800); }
    if (G.msg > 0) { }
  }
  SC.lab = {
    get label() { return LAB.mode === 'water' ? '💧 1족 · 2족 금속을 물에 넣어요' : '🔥 달군 철솜을 기체 속에 넣어요'; },
    get hint() { return LAB.mode === 'water' ? '금속 조각을 끌어 비커 위에 놓아요' : '철솜을 램프 불꽃에서 달군 뒤 집기병 입구에 놓아요'; },
    enter() { labTables(); },
    update(dt) { if (LAB.mode === 'water') labUpdateWater(dt); else labUpdateGas(dt); },
    draw(t) {
      wall();
      if (LAB.mode === 'water') drawWaterBench(t); else drawGasBench(t);
      focusRing(LAB.mode === 'water' ? { x: 52, y: 78, w: 696, h: 128 } : { x: 30, y: 260, w: 200, h: 170 }, 'tray', 16);
    },
    hover(p) {
      if (LAB.mode === 'water') return W.tray.some((tr) => tr.state === 'dish' && Math.hypot(p.x - tr.x, p.y - tr.y) < 36) ? 'grab' : null;
      return !G.run && Math.hypot(p.x - G.wool.x, p.y - G.wool.y) < 34 ? 'grab' : null;
    },
    down(p) {
      if (LAB.mode === 'water') {
        for (const tr of W.tray) if (tr.state === 'dish' && Math.hypot(p.x - tr.x, p.y - tr.y) < 38) { tr.hold = true; W.drag = { tr, x: p.x, y: p.y, ox: clamp(tr.x - p.x, -14, 14), oy: Math.min(tr.y - p.y, -26) }; sfx.glug(); hideHint(); return true; }
        return false;
      }
      if (!G.run && Math.hypot(p.x - G.wool.x, p.y - G.wool.y) < 36) { G.wool.hold = true; G.wool.state = 'drag'; G.drag = { ox: clamp(G.wool.x - p.x, -12, 12), oy: Math.min(G.wool.y - p.y, -22), x: G.wool.x, y: G.wool.y }; sfx.glug(); hideHint(); return true; }
      return false;
    },
    move(p) {
      if (LAB.mode === 'water' && W.drag) { const d = W.drag; d.tr.x = clamp(p.x + d.ox, 30, 770); d.tr.y = clamp(p.y + d.oy, 30, 500); d.x = d.tr.x; d.y = d.tr.y + 24; }
      else if (G.drag) { const d = G.drag, w = G.wool; w.x = clamp(p.x + d.ox, 20, 780); w.y = clamp(p.y + d.oy, 40, 500); d.x = w.x; d.y = w.y; }
    },
    up(p) {
      if (LAB.mode === 'water' && W.drag) {
        const d = W.drag, tr = d.tr; W.drag = null; tr.hold = false;
        const bk = W.bk.find((b) => Math.abs(tr.x - b.x) < 76 && tr.y + 24 > 190);
        if (bk) {
          if (bk.used) { bk.sh = 0.4; Sound.fail(); say(bk.x, 220, '이 비커는 이미 썼어요. ↺ 새 비커를 눌러요', { bg: COL.warn, maxW: 200 }); return; }
          dropPiece(bk, tr);
        }
        return;
      }
      if (G.drag) {
        const w = G.wool; G.drag = null; w.hold = false;
        const j = G.jars.find((q) => Math.abs(w.x - q.x) < 56 && w.y < 330 && w.y > 150);
        if (j) {
          if (w.heat < 0.6) { Sound.fail(); say(j.x, 190, '철솜이 아직 차가워요. 먼저 램프 불꽃에서 빨갛게 달궈요!', { bg: COL.warn, maxW: 230, dur: 3.2 }); w.state = 'home'; return; }
          startGasRun(j); return;
        }
        w.state = 'home';
      }
    },
  };
  Object.assign(DBG, { W, G, GAS, METALS, labReset, setLabMode, LAB, dropPiece, startGasRun, FLAME, JAR, BKX });

  /* =========================================================
     장면 3 · airship — 안전한 비행선 (수소 vs 헬륨)
     ========================================================= */
  const AS = {
    gas: null, fill: 0, rise: 0, test: null, passed: false, burned: 0, ex: 0, ey: 0, hose: null, t: 0, clouds: [], shake: 0, flash: 0, fire: [], dim: 0, tested: { H: false, He: false },
    tanks: [
      { id: 'H', name: '수소', sym: 'H', pos: '1주기 1족', hx: 170, hy: 408, x: 170, y: 408, vx: 0, vy: 0, hold: false, lift: 0, used: false, c: '#ef6a4b' },
      { id: 'He', name: '헬륨', sym: 'He', pos: '1주기 18족', hx: 630, hy: 408, x: 630, y: 408, vx: 0, vy: 0, hold: false, lift: 0, used: false, c: '#3ab3d6' },
    ],
    drag: null,
  };
  for (let i = 0; i < 7; i++) AS.clouds.push({ x: rand(0, VW), y: rand(40, 330), s: rand(0.6, 1.3), v: rand(4, 14) * (i % 2 ? 1 : 0.5), layer: i % 2 });
  const SHIP = { cx: 400, cy: 214 };
  function asReset() {
    AS.gas = null; AS.fill = 0; AS.rise = 0; AS.test = null; AS.passed = false; AS.burned = 0; AS.ex = 0; AS.ey = 0; AS.hose = null; AS.fire = []; AS.dim = 0; AS.flash = 0;
    AS.tanks.forEach((tk) => { tk.used = false; tk.hold = false; tk.x = tk.hx; tk.y = tk.hy; });
    asRefresh();
  }
  function asRefresh() {
    const b = $('#lightBtn');
    if (b) { b.disabled = !(AS.gas && AS.fill > 0.95 && !AS.test && !AS.passed); b.hidden = S.scene !== 'airship'; }
    const nt = $('#asNote');
    if (nt) nt.textContent = AS.passed ? '🎉 번개 시험을 통과했어요!' : AS.test ? '번개가 치고 있어요…' : AS.gas ? '비행선에 ' + (AS.gas === 'H' ? '수소' : '헬륨') + '를 채웠어요. 번개 시험을 해 보세요.' : '기체 탱크를 비행선 위로 끌어 놓아요.';
  }
  function fillShip(tk) {
    AS.gas = tk.id; AS.fill = 0; AS.hose = { t: 0, from: tk, id: tk.id }; tk.used = true;
    sfx.whoosh(); asRefresh();
  }
  function startLightning() {
    if (!AS.gas || AS.test || AS.fill < 0.95) return;
    AS.test = { t: 0, flags: {}, gas: AS.gas }; Sound.click(); asRefresh();
  }
  function asUpdate(dt) {
    AS.t += dt;
    AS.clouds.forEach((c) => { c.x += c.v * dt * (c.layer ? 1.6 : 1); if (c.x > VW + 120) c.x = -120; });
    AS.tanks.forEach((tk) => {
      tk.lift = SciSim.approach(tk.lift, tk.hold ? 1 : 0, dt, 16);
      if (!tk.hold) { const K = 190, Dm = 15, n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n; for (let k = 0; k < n; k++) { tk.vx += ((tk.hx - tk.x) * K - tk.vx * Dm) * h; tk.vy += ((tk.hy - tk.y) * K - tk.vy * Dm) * h; tk.x += tk.vx * h; tk.y += tk.vy * h; } }
    });
    if (AS.hose) { AS.hose.t += dt; if (AS.hose.t > 1.5) AS.hose = null; }
    if (AS.gas && AS.fill < 1) AS.fill = Math.min(1, AS.fill + dt / 1.0);
    else if (!AS.gas) AS.fill = Math.max(0, AS.fill - dt * 2);
    const wantRise = AS.gas ? AS.fill : 0;
    AS.rise = SciSim.approach(AS.rise, wantRise, dt, 6);
    AS.shake = Math.max(0, AS.shake - dt); AS.flash = Math.max(0, AS.flash - dt * 6);
    AS.dim = SciSim.approach(AS.dim, AS.test && !AS.test.done ? (AS.test.t < 0.3 ? 0.3 : 0.1) : 0, dt, 4);
    const T2 = AS.test;
    if (T2) {
      T2.t += dt; const t = T2.t, fl = T2.flags;
      if (t >= 0.45 && !fl.bolt) { fl.bolt = true; AS.flash = 1; AS.shake = 0.35; sfx.noise(0.5, 900, 80, 0.7, 'lowpass'); Sound.tone(70, 0.4, 'sawtooth', 0.12); sfx.zap(); T2.bolt = makeBolt(); FX.burst(420, 188, { count: RM ? 4 : 10, speed: 200, life: 0.5, size: 3, colors: ['#fff6c2', '#ffffff', '#c4b5fd'], gravity: 100 }); }
      if (T2.gas === 'H') {
        if (t >= 0.8 && !fl.fire) { fl.fire = true; sfx.whoosh(); }
        if (t >= 0.8 && t < 2.3) { for (let i = 0; i < (RM ? 1 : 3); i++) { const a = rand(0, TAU); AS.fire.push({ x: SHIP.cx + Math.cos(a) * 150 * (0.4 + 0.6 * Math.min(1, (t - 0.8) / 1.0)), y: SHIP.cy + Math.sin(a) * 52 - AS.rise * 0 , vy: rand(-90, -40), vx: rand(-20, 20), age: 0, life: rand(0.5, 0.9), r: rand(12, 24) }); } }
        AS.burned = seg(t, 0.8, 2.2);
        if (t >= 1.3 && !fl.msg) { fl.msg = true; say(SHIP.cx, 110, '⚠️ 수소는 공기 중에서 불이 붙으면 잘 타요 (1937년 힌덴부르크호 사고)', { bg: COL.bad, maxW: 330, dur: 3.6, size: 14 }); }
        if (t >= 3.8 && !fl.reset) { fl.reset = true; AS.tested.H = true; asReset(); }
      } else {
        if (t >= 0.9 && !fl.ok) { fl.ok = true; AS.passed = true; AS.tested.He = true; okFx(SHIP.cx, SHIP.cy - 30, COL.good, true); Sound.success(); asRefresh(); say(SHIP.cx, 110, '번개가 쳐도 아무 일 없어요! 헬륨은 불에 타지 않아요', { bg: '#0f8a4b', maxW: 300, dur: 3.4, size: 14 }); }
        if (T2.t >= 1.2) { AS.ex += dt * 46; AS.ey -= dt * 14; }
      }
    }
    for (let i = AS.fire.length - 1; i >= 0; i--) { const f = AS.fire[i]; f.age += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.age > f.life) AS.fire.splice(i, 1); }
    if (AS.passed && AS.ex > 560) { /* 날아가 버림 */ }
  }
  function makeBolt() {
    const pts = [[520 + rand(-20, 20), -10]]; let x = pts[0][0], y = -10;
    while (y < 190) { y += rand(22, 38); x += rand(-26, 12) - 10; pts.push([x, y]); }
    pts[pts.length - 1] = [418, 192];
    return pts;
  }
  function drawCloud(c, t) {
    ctx.save(); ctx.globalAlpha = c.layer ? 0.9 : 0.6; ctx.fillStyle = '#fff'; ctx.translate(c.x, c.y); ctx.scale(c.s, c.s);
    [[0, 0, 22], [24, -9, 27], [54, 0, 21], [28, 8, 23]].forEach((q) => { ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  function drawShip(t) {
    const fill = AS.fill, rise = AS.rise;
    const cx = SHIP.cx + AS.ex, cy = SHIP.cy + AS.ey + (1 - rise) * 56 + Math.sin(t * 1.3) * 2.5 * rise;
    const rx = 150, ry = lerp(30, 56, ease.outCubic(fill));
    ctx.save(); ctx.translate(cx, cy);
    // 그림자
    ctx.fillStyle = 'rgba(30,50,90,.12)'; ctx.beginPath(); ctx.ellipse(0, 250 - cy + SHIP.cy * 0, 130, 12, 0, 0, TAU); ctx.restore();
    ctx.save(); ctx.translate(cx, cy);
    const charred = AS.burned;
    // 꼬리 날개
    ctx.fillStyle = mix('#c9ced8', '#3a3a40', charred); ctx.beginPath(); ctx.moveTo(-rx + 12, -4); ctx.lineTo(-rx - 22, -ry * 0.9); ctx.lineTo(-rx - 8, 0); ctx.lineTo(-rx - 22, ry * 0.9); ctx.lineTo(-rx + 12, 4); ctx.closePath(); ctx.fill();
    // 곤돌라 · 줄
    ctx.strokeStyle = 'rgba(80,60,40,.6)'; ctx.lineWidth = 1.6; [[-40, 26], [40, 26], [-24, 30], [24, 30]].forEach((q) => { ctx.beginPath(); ctx.moveTo(q[0], ry * 0.85); ctx.lineTo(q[0] * 0.6, ry + 22); ctx.stroke(); });
    ctx.fillStyle = '#8b5a2b'; D.roundRect(-34, ry + 18, 68, 22, 8); ctx.fill(); ctx.fillStyle = '#ffe9a8'; for (let i = 0; i < 4; i++) { D.roundRect(-26 + i * 15, ry + 23, 10, 9, 3); ctx.fill(); }
    // 외피
    const g = ctx.createLinearGradient(0, -ry, 0, ry);
    g.addColorStop(0, mix('#ffffff', '#4a4a50', charred)); g.addColorStop(0.5, mix('#dfe5ef', '#34343a', charred)); g.addColorStop(1, mix('#a9b4c8', '#26262b', charred));
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(90,100,125,.7)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.clip();
    // 주름 (비어 있을수록 많다)
    const wr = 1 - ease.outCubic(fill);
    ctx.strokeStyle = 'rgba(70,85,115,' + (0.35 * wr).toFixed(2) + ')'; ctx.lineWidth = 2;
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * 24, -ry); ctx.quadraticCurveTo(i * 24 + 14 * Math.sin(i + t), 0, i * 24 - 6, ry); ctx.stroke(); }
    // 이음선
    ctx.strokeStyle = 'rgba(120,135,165,.45)'; ctx.lineWidth = 1.4; for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, Math.abs(i) * 36 + 1, ry, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-30, -ry * 0.55, rx * 0.5, ry * 0.2, -0.05, 0, TAU); ctx.fill();
    ctx.restore();
    // 표시
    if (AS.gas && fill > 0.5) { txt(AS.gas === 'H' ? 'H' : 'He', 0, 8, 28, 'rgba(60,75,110,.55)', 'center', 800); }
    ctx.restore();
  }
  function drawTank(tk, t) {
    ctx.save(); ctx.translate(tk.x, tk.y); const sc = 1 + tk.lift * 0.08; ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(30,50,90,' + (0.16 + tk.lift * 0.08).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(6 * tk.lift, 56, 34, 8, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(-26, 0, 26, 0); g.addColorStop(0, shade(tk.c, 0.35)); g.addColorStop(0.35, tk.c); g.addColorStop(1, shade(tk.c, -0.3));
    ctx.fillStyle = g; ctx.strokeStyle = shade(tk.c, -0.4); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-26, -34); ctx.quadraticCurveTo(-26, -58, 0, -58); ctx.quadraticCurveTo(26, -58, 26, -34); ctx.lineTo(26, 50); ctx.lineTo(-26, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-18, -50, 7, 92);
    ctx.fillStyle = '#4b5563'; D.roundRect(-8, -70, 16, 14, 3); ctx.fill(); ctx.fillStyle = '#9ca3af'; D.roundRect(-14, -74, 28, 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(-22, -14, 44, 36, 6); ctx.fill();
    txt(tk.sym, 0, 14, 22, shade(tk.c, -0.35), 'center', 800);
    ctx.restore();
    txt(tk.name + ' ' + tk.sym, tk.hx, tk.hy + 82, 14.5, COL.ink, 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
    txt(tk.pos, tk.hx, tk.hy + 99, 13, COL.sub, 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
  }
  SC.airship = {
    label: '🎈 안전한 비행선을 만들어요',
    hint: '기체 탱크를 비행선 위로 끌어 놓고 ⚡ 번개 시험을 해요',
    enter() { asRefresh(); },
    update(dt) { asUpdate(dt); },
    draw(t) {
      ctx.save();
      if (AS.shake > 0) ctx.translate(rand(-3, 3) * Math.min(1, AS.shake * 4), rand(-3, 3) * Math.min(1, AS.shake * 4));
      const sk = ctx.createLinearGradient(0, 0, 0, VH); sk.addColorStop(0, '#8ec8f5'); sk.addColorStop(0.7, '#d7ecff'); sk.addColorStop(1, '#eaf6e4');
      ctx.fillStyle = sk; ctx.fillRect(-10, -10, VW + 20, VH + 20);
      AS.clouds.filter((c) => !c.layer).forEach((c) => drawCloud(c, t));
      // 언덕
      ctx.fillStyle = '#a8dca0'; ctx.beginPath(); ctx.moveTo(-10, 470); ctx.bezierCurveTo(160, 420, 320, 470, 480, 446); ctx.bezierCurveTo(620, 424, 720, 462, 820, 440); ctx.lineTo(820, 540); ctx.lineTo(-10, 540); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#86cc7c'; ctx.beginPath(); ctx.moveTo(-10, 500); ctx.bezierCurveTo(200, 470, 400, 510, 820, 480); ctx.lineTo(820, 540); ctx.lineTo(-10, 540); ctx.closePath(); ctx.fill();
      AS.clouds.filter((c) => c.layer).forEach((c) => drawCloud(c, t));
      // 비행선 · 받는 곳 표시
      const over = AS.drag && Math.hypot(AS.drag.x - SHIP.cx, AS.drag.y - SHIP.cy) < 190;
      if (!AS.gas && !over) { ctx.save(); ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = 'rgba(80,100,150,.45)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(SHIP.cx, SHIP.cy + 48, 190, 92, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
      if (over) { ctx.save(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 24; ctx.strokeStyle = rgba(COL.sub, 0.9); ctx.lineWidth = 4; ctx.fillStyle = 'rgba(139,92,246,.1)'; ctx.beginPath(); ctx.ellipse(SHIP.cx, SHIP.cy + 48, 190, 92, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
      // 호스 (탱크 → 비행선)
      if (AS.hose) {
        const h = AS.hose, tk = h.from, x0 = tk.hx, y0 = tk.hy - 74, x1 = SHIP.cx + (tk.id === 'H' ? -40 : 40), y1 = SHIP.cy + 70;
        ctx.save(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0, y0 - 90, x1, y1 + 80, x1, y1); ctx.stroke();
        ctx.strokeStyle = '#a3aab8'; ctx.lineWidth = 2; ctx.stroke();
        for (let k = 0; k < 7; k++) { const u = ((h.t * 1.1 + k / 7) % 1), m = 1 - u; const bx = m * m * m * x0 + 3 * m * m * u * x0 + 3 * m * u * u * x1 + u * u * u * x1, by = m * m * m * y0 + 3 * m * m * u * (y0 - 90) + 3 * m * u * u * (y1 + 80) + u * u * u * y1; ctx.fillStyle = rgba(tk.c, 0.8); circle(ctx, bx, by, 3); ctx.fill(); }
        ctx.restore();
      }
      drawShip(t);
      // 불길
      AS.fire.forEach((f) => { const k = f.age / f.life; ctx.save(); ctx.globalAlpha = 1 - k; const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * (1 - k * 0.3)); g.addColorStop(0, '#fff6c2'); g.addColorStop(0.35, '#ffb347'); g.addColorStop(0.75, 'rgba(240,80,30,.6)'); g.addColorStop(1, 'rgba(240,80,30,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - k * 0.3), 0, TAU); ctx.fill(); ctx.restore(); });
      AS.tanks.forEach((tk) => { if (!tk.hold) drawTank(tk, t); });
      AS.tanks.forEach((tk) => { if (tk.hold) drawTank(tk, t); });
      // 번개
      if (AS.test && AS.test.bolt && AS.test.t < 0.9) {
        const b = AS.test.bolt, a = 1 - AS.test.t / 0.9 + (AS.test.t < 0.6 ? 0.3 : 0);
        ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(196,181,253,' + Math.min(1, a * 0.7) + ')'; ctx.lineWidth = 12; ctx.beginPath(); b.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(1, a) + ')'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      }
      if (AS.dim > 0.01) { ctx.fillStyle = 'rgba(20,24,60,' + AS.dim.toFixed(3) + ')'; ctx.fillRect(-10, -10, VW + 20, VH + 20); }
      if (AS.flash > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * AS.flash).toFixed(3) + ')'; ctx.fillRect(-10, -10, VW + 20, VH + 20); }
      ctx.restore();
    },
    hover(p) { return AS.tanks.some((tk) => !tk.used && Math.abs(p.x - tk.x) < 40 && Math.abs(p.y - tk.y) < 66) ? 'grab' : null; },
    down(p) {
      if (AS.test || AS.passed) return false;
      for (const tk of AS.tanks) if (!tk.used && Math.abs(p.x - tk.x) < 42 && Math.abs(p.y - tk.y) < 68) { tk.hold = true; AS.drag = { tk, ox: clamp(tk.x - p.x, -14, 14), oy: Math.min(tk.y - p.y, -30), x: tk.x, y: tk.y }; sfx.glug(); hideHint(); return true; }
      return false;
    },
    move(p) { const d = AS.drag; if (!d) return; d.tk.x = clamp(p.x + d.ox, 30, 770); d.tk.y = clamp(p.y + d.oy, 60, 480); d.x = d.tk.x; d.y = d.tk.y; },
    up(p) {
      const d = AS.drag; if (!d) return; AS.drag = null; const tk = d.tk; tk.hold = false;
      if (Math.hypot(tk.x - SHIP.cx, tk.y - SHIP.cy) < 190) {
        if (AS.gas) { say(SHIP.cx, 120, '비행선에 이미 기체가 들어 있어요. ↺로 비워요', { bg: COL.warn, maxW: 250 }); return; }
        fillShip(tk);
      }
    },
  };
  Object.assign(DBG, { AS, asReset, startLightning, fillShip, SHIP });

  /* =========================================================
     루비듐 예상 확인 (4단계 퀴즈 정답 뒤 인셋)
     ========================================================= */
  const RBX = { on: false, t: 0, bub: [], ink: [], tint: 0, y: 0, vy: 0 };
  function startRbx() { Object.assign(RBX, { on: true, t: 0, bub: [], ink: [], tint: 0, y: 150, vy: 0 }); sfx.fizz(); }
  function rbxUpdate(dt) {
    if (!RBX.on) return;
    RBX.t += dt; const t = RBX.t;
    // 가라앉으며 격렬하게 반응 (3초)
    if (t < 0.5) { RBX.vy += 600 * dt; RBX.y += RBX.vy * dt; if (RBX.y > 262) { RBX.y = 262; RBX.vy = 0; } }
    else RBX.y = Math.min(318, RBX.y + 60 * dt);
    if (t > 0.4 && t < 3) {
      for (let i = 0; i < (RM ? 1 : 3); i++) RBX.bub.push({ x: 400 + rand(-26, 26), y: RBX.y + rand(-4, 8), vy: rand(60, 130), age: 0, ph: rand(0, 6), r: rand(1.5, 3.2) });
      if (Math.random() < dt * 14) RBX.ink.push({ x: 400 + rand(-30, 30), y: RBX.y + rand(-8, 8), r: 6, a: 0.4, t: 0, life: 2.6, ph: rand(0, 6), g: rand(16, 30) });
      RBX.tint = Math.min(0.62, RBX.tint + dt * 0.3);
      if (Math.random() < dt * 8) sfx.fizz();
    }
    for (let i = RBX.bub.length - 1; i >= 0; i--) { const b = RBX.bub[i]; b.age += dt; b.y -= b.vy * dt; b.x += Math.sin(b.age * 14 + b.ph) * 0.5; if (b.y < 232) RBX.bub.splice(i, 1); }
    for (let i = RBX.ink.length - 1; i >= 0; i--) { const b = RBX.ink[i]; b.t += dt; b.r += b.g * dt; if (b.t > b.life) RBX.ink.splice(i, 1); }
    if (t > 4.4) RBX.on = false;
  }
  function drawRbx(t) {
    if (!RBX.on) return;
    const k = outBack(seg(RBX.t, 0, 0.3)) * (RBX.t > 4 ? (4.4 - RBX.t) / 0.4 : 1);
    ctx.save(); ctx.translate(400, 270); ctx.scale(Math.max(0.01, k), Math.max(0.01, k)); ctx.translate(-400, -270);
    ctx.fillStyle = 'rgba(20,30,70,.28)'; ctx.fillRect(0, 0, VW, VH);
    panel(250, 130, 300, 262, 20, 'rgba(255,255,255,.97)', 24, 8, 'rgba(10,20,60,.4)');
    txt('루비듐(Rb)을 물에 넣으면?', 400, 164, 17, COL.ink, 'center', 800);
    beakerGlass(400, 372, 124, 150, 0.62, RBX.tint, t, () => {
      RBX.ink.forEach((b) => { const kk = b.t / b.life, a = b.a * (1 - kk); const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, rgba('#ff4fa3', a)); g.addColorStop(1, rgba('#ff4fa3', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); });
      RBX.bub.forEach((b) => { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.strokeStyle = 'rgba(70,130,200,.85)'; ctx.lineWidth = 1; circle(ctx, b.x, b.y, b.r); ctx.fill(); ctx.stroke(); });
    });
    if (RBX.t < 3.6) metalPiece('k', 400 + Math.sin(RBX.t * 20) * 2, RBX.y, 12 * (1 - 0.5 * seg(RBX.t, 2, 3.6)), { rot: RBX.t });
    txt('가라앉으며 격렬하게 반응해요!', 400, 396 + 0, 14, COL.sub, 'center', 800);
    ctx.restore();
  }

  /* =========================================================
     장면 전환 · UI · 입력
     ========================================================= */
  function setScene(name, reset) {
    const changed = S.scene !== name;
    S.scene = name;
    if (changed || reset) { S.sceneT = 0; FX.clear(); BUB.length = 0; }
    const sc = SC[name];
    if (sc.enter) sc.enter(!!reset);
    $('#tbLabel').textContent = sc.label;
    if (changed || reset) showHint(sc.hint, 6500);
    refreshUI();
  }
  function useTable(mode) { tableMode(mode); setScene('table', true); }
  function useLab(mode, reset) { setLabMode(mode); if (reset) labReset(); setScene('lab', true); }
  let lastFree = null;
  function refreshUI() {
    $$('[data-sc]').forEach((node) => { node.hidden = node.getAttribute('data-sc').split(/\s+/).indexOf(S.scene) < 0; });
    labTables(); asRefresh();
    // 장면 · 모드에 따른 조작
    const place = S.scene === 'table' && T.mode === 'place';
    const cr = $('#cardResetCtl'); if (cr) cr.hidden = !place;
    const tn = $('#tableNote'); if (tn) { tn.hidden = !(S.scene === 'table' && !place); tn.textContent = T.mode === 'address' ? '위쪽 족 번호와 왼쪽 주기 번호를 눌러 줄을 강조해요. 칸을 누르면 원소의 이름과 위치가 나와요.' : T.mode === 'detective' ? '단서에 맞는 원소 칸을 눌러요. 족 번호와 주기 번호를 눌러 줄을 강조하면 쉬워요.' : T.mode === 'rb' ? '루비듐(Rb)은 5주기 1족이에요. 같은 족 원소의 성질을 떠올려 봐요.' : '칸을 누르면 원소의 이름과 위치가 나와요. 족 번호와 주기 번호도 눌러 보세요.'; }
    const lr = $('#labResetBtn'); if (lr) lr.textContent = LAB.mode === 'water' ? '↺ 새 비커' : '↺ 새 집기병';
    const free = !!(game && game.free);
    $('#sceneSeg').hidden = !free;
    $('#tbLabel').hidden = free && window.innerWidth < 1000;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.scene === S.scene) && (!b.dataset.mode || b.dataset.mode === (S.scene === 'lab' ? LAB.mode : 'x'))));
    const card = $('#ctrlCard');
    card.hidden = !Array.from(card.children).some((n) => !n.hidden);
    lastFree = free;
  }
  $('#cardResetBtn').addEventListener('click', () => { Sound.click(); tableMode('place'); refreshUI(); showHint(SC.table.hint, 4000); });
  $('#labResetBtn').addEventListener('click', () => { Sound.click(); labReset(); refreshUI(); });
  $('#lightBtn').addEventListener('click', () => { startLightning(); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'table') { if (T.mode === 'place') tableMode('place'); else { T.g = null; T.p = null; T.info = null; if (T.q) { startQuiz(T.q.kind); } } }
    else if (S.scene === 'lab') labReset();
    else if (S.scene === 'airship') asReset();
    refreshUI();
  });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click();
    const to = b.dataset.scene;
    if (to === 'table') useTable('free');
    else if (to === 'lab') useLab(b.dataset.mode || 'water', false);
    else setScene(to, true);
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
    // 장면 밖에서도 반응 · 연출은 계속 (비커, 번개 시험)
    if (S.scene !== 'lab') { if (LAB.mode === 'water') labUpdateWater(dt); }
    rbxUpdate(dt);
  }
  let lastDt = 0.016;
  function draw(t) {
    view.clear(BGC0);
    const s = SC[S.scene];
    if (s && s.draw) s.draw(t, lastDt);
    drawRbx(t);
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
  const metalStatus = () => METALS.map((m) => {
    const seen = !!W.seen[m.id], running = W.bk.some((b) => b.piece && b.piece.id === m.id);
    const res = seen ? (m.id === 'mg' ? '기체 거의 없음 · 변화 없음' : '기체 ✔ · 붉게 ✔') : running ? '관찰하는 중…' : '아직 안 넣었어요';
    return '<b>' + m.name + '</b>(' + m.pos + '): ' + res;
  }).join('<br>');
  const gasStatus = () => GAS.map((g) => '<b>' + g.name + '</b>: ' + (G.seen[g.id] ? (g.burn ? '불꽃을 튀기며 탐' : '변화 없음') : '아직 안 해 봤어요')).join('<br>');
  const MINI = (rows) => '<table style="table-layout:fixed"><tr>' + rows + '</tr></table>';
  const miniRow = (a) => '<tr>' + a.map((z) => '<td style="padding:3px 1px;line-height:1.2"><small style="color:#7a8699;font-weight:700">' + z + '</small><br><b>' + SYMS[z - 1] + '</b></td>').join('') + '</tr>';

  game = SciSim.game({
    simId: 'm2-periodic-table',
    mount: '#game',
    badge: '원소 탐정',
    homeHref: '../../index.html#g2',
    featureLabels: {
      table: '🗂️ 주기율표 판',
      deck: '🃏 원자 카드',
      address: '🧭 주기·족 줄 강조 · 원소 정보',
      lab: '🧪 같은 족 실험대(물 · 달군 철솜)',
      detective: '🕵️ 원소 탐정 · 비행선',
    },
    onFeatures(set) { F = set; if (game) refreshUI(); },
    onHint(m) { if (m.focus) setFocus(m.focus); },
    onMissionStart(m) {
      if (game && game.free) return;
      refreshUI();
    },
    onComplete() { useTable('free'); refreshUI(); },
    levels: [
      {
        title: '양성자 수 순서로 놓기', short: '양성자 순', icon: '🃏', phase: '관찰',
        features: ['table', 'deck'],
        intro: '<p class="si-q">❓ 탐구 질문: 118가지 원소를 어떻게 정리하면 성질이 비슷한 원소를 한눈에 찾을 수 있을까?</p>' +
          '<p>앞 차시에서 원소의 종류는 <b>양성자 수</b>로 정해진다는 것을 배웠어요. 주기율표의 칸마다 적힌 번호는 무엇을 뜻할까요? 원자 카드를 직접 놓아 보며 알아봐요.</p>',
        setup() { useTable('place'); },
        recap: '주기율표는 원소를 양성자 수(원자 번호) 순서로 배치한 표예요.',
        summary: '<span class="formula">원자 번호 = 양성자 수</span>' +
          '<table style="table-layout:fixed">' + miniRow([1, 2]).replace('<tr>', '<tr>') + miniRow([3, 4, 5, 6, 7, 8, 9, 10]) + miniRow([11, 12, 13, 14, 15, 16, 17, 18]) + miniRow([19, 20]) + '</table>' +
          '<div class="note">현재 118종의 원소가 알려져 있어요.</div>',
        missions: [
          {
            title: '원자 카드 놓기', scene: 'table', focus: 'deck',
            goal: '원자 카드 5장을 양성자 수와 같은 번호가 적힌 칸에 놓으세요.',
            hint: '칸 왼쪽 위 번호를 원자 번호라고 해요. 카드의 양성자 수와 같은 번호를 찾아요. 번호는 왼쪽에서 오른쪽으로, 줄이 바뀌면 다음 줄 맨 앞에서 이어져요.',
            setup() { useTable('place'); },
            check: () => T.mode === 'place' && T.placedN >= 5 && T.sweepDone, hold: 0.3,
            status: () => '놓은 카드 <b>' + T.placedN + '/5</b>' + (T.placedN >= 5 && !T.sweepDone ? ' · 번호 순서를 확인하는 중…' : ''),
            onWin() { okFx(400, 200, COL.good, true); },
            explain: '주기율표 칸의 번호를 <b>원자 번호</b>라고 해요. 원자 번호는 <b>양성자 수</b>와 같아요. 원소들은 양성자 수가 커지는 순서로 놓여 있어요.',
          },
          {
            type: 'quiz', title: '배치 기준', scene: 'table',
            goal: '오늘날 주기율표에서 원소를 배치한 기준은?',
            choices: ['원소 이름의 가나다(알파벳) 순서', '원소가 발견된 순서', '원자 번호, 즉 양성자 수 순서', '원자 1개의 질량 순서'],
            answer: 2,
            feedback: ['나트륨 다음이 마그네슘인 것은 이름 순서가 아니에요. 칸의 번호를 보세요.', '산소는 1774년, 헬륨은 1868년에 발견되었지만 헬륨이 2번이에요.', '', '처음 주기율표를 만든 멘델레예프(1869년)는 원자의 질량 순서로 정리했지만, 오늘날 주기율표는 양성자 수 순서로 배치해요.'],
            explain: '주기율표는 원소를 <b>양성자 수(원자 번호)</b> 순서로 배치하고, 성질이 비슷한 원소가 같은 세로줄에 오도록 만든 표예요. 지금까지 118가지 원소가 알려져 있어요.',
          },
        ],
      },
      {
        title: '주기와 족 알아보기', short: '주기와 족', icon: '🧭', phase: '탐구',
        features: ['address'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원소가 양성자 수 순서로 놓여 있음을 알았어요.</div>' +
          '<p>주기율표의 <b>가로줄을 주기</b>, <b>세로줄을 족</b>이라고 해요. 왼쪽 주기 번호와 위쪽 족 번호를 눌러 줄을 강조해 보고, 원소의 ‘주소’를 찾아봐요.</p>',
        setup() { useTable('address'); },
        recap: '주기율표의 가로줄은 주기, 세로줄은 족이에요.',
        summary: '<span class="formula" style="font-size:15px">주기 = 가로줄(1~7)<br>족 = 세로줄(1~18)</span>' +
          '<ul><li>나트륨(Na): 3주기 1족</li><li>네온(Ne): 2주기 18족</li><li>칼륨(K): 4주기 1족</li></ul>',
        missions: [
          {
            title: '원소의 주소 찾기', scene: 'table', focus: 'headers',
            goal: '배너의 주소에 있는 원소를 찾아 누르세요.',
            hint: '주기는 가로줄(왼쪽 번호), 족은 세로줄(위쪽 번호)! 두 번호를 눌러 줄을 강조하면 만나는 칸이 보여요.',
            setup() { useTable('address'); startQuiz('address'); },
            check: () => T.mode === 'address' && qDone(), hold: 0.2,
            status: () => { const Q = T.q; if (!Q) return ''; const cur = Q.list[Math.min(Q.i, 2)]; return '찾은 원소 <b>' + Q.done + '/3</b>' + (Q.done < 3 ? ' · 지금 문제: <b>' + cur.p + '주기 ' + cur.g + '족</b>' : ''); },
            explain: '가로줄은 <b>주기</b>(1~7주기), 세로줄은 <b>족</b>(1~18족)이에요. 플루오린은 2주기 17족, 마그네슘은 3주기 2족, 칼륨은 4주기 1족이에요.',
          },
          {
            type: 'quiz', title: '같은 족 원소', scene: 'table',
            goal: '같은 족 원소끼리 바르게 짝지은 것은?',
            choices: ['리튬, 베릴륨, 붕소', '리튬, 나트륨, 칼륨', '나트륨, 마그네슘, 알루미늄', '수소, 헬륨'],
            answer: 1,
            feedback: ['같은 가로줄, 즉 같은 주기(2주기)예요.', '', '3주기에 나란히 있는 원소예요. 족은 세로줄이에요.', '1주기의 두 원소예요. 수소는 1족, 헬륨은 18족이에요.'],
            explain: '리튬·나트륨·칼륨은 모두 <b>1족</b>이에요. 같은 족 원소는 성질이 비슷할까요? 다음 단계에서 실험으로 확인해요!',
          },
        ],
      },
      {
        title: '같은 족 원소의 성질 실험', short: '같은 족', icon: '🧪', phase: '실험',
        features: ['lab'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 리튬·나트륨·칼륨이 같은 1족임을 알았어요.</div>' +
          '<p>같은 족 원소는 성질도 비슷할까요? <b>1족 원소</b>를 물에 넣고, <b>18족 기체</b> 속에 달군 철솜을 넣어 비교해요. 비교를 위해 다른 족 원소도 함께 시험해요.</p>' +
          '<div class="safe-note">⚠️ 1족 금속은 물과 격렬하게 반응해요. 실제로는 선생님 시범(쌀알만 한 조각, 보안경)이나 영상으로 관찰하고, 칼륨은 특히 위험해요.</div>',
        setup() { useLab('water', true); },
        recap: '같은 족 원소는 성질이 비슷해요. 1족(수소 제외)은 물과 잘 반응하고, 18족은 다른 물질과 거의 반응하지 않아요.',
        summary: '<table><tr><th>원소</th><th>기체 발생</th><th>용액 색</th></tr><tr><td>1족 리튬·나트륨·칼륨</td><td>발생</td><td>붉게 변함</td></tr><tr><td>2족 마그네슘</td><td>거의 없음</td><td>변화 없음</td></tr></table>' +
          '<table><tr><th>기체</th><th>달군 철솜의 변화</th></tr><tr><td>산소(16족)</td><td>불꽃을 튀기며 탐</td></tr><tr><td>헬륨·네온·아르곤(18족)</td><td>변화 없음</td></tr></table>' +
          '<span class="formula" style="font-size:15px">같은 족 원소(동족 원소)<br>= 성질이 비슷한 원소</span>' +
          '<div class="note">반응의 세기는 조금씩 달라요. 수소는 1족이지만 금속이 아니어서 1족 금속과 성질이 달라요.</div>',
        missions: [
          {
            title: '1족 원소를 물에', scene: 'lab', focus: 'tray',
            goal: '리튬, 나트륨, 칼륨(1족)과 마그네슘(2족)을 각각 페놀프탈레인 용액을 떨어뜨린 물에 넣고 관찰하세요.',
            hint: '접시의 금속 조각을 끌어 비커 위에 놓아요. 1족 원소끼리 무엇이 같은지 보세요.',
            setup() { useLab('water', true); },
            check: () => METALS.every((m) => W.seen[m.id]), hold: 0.3, status: metalStatus,
            onWin() { okFx(400, 250, COL.good, true); },
            explain: '리튬, 나트륨, 칼륨은 모두 물과 반응해 <b>기체가 생기고</b> 페놀프탈레인 용액이 <b>붉게</b> 변했어요(용액이 염기성이 됨). 같은 3주기인 마그네슘은 거의 변화가 없었어요.',
          },
          {
            type: 'quiz', title: '결과로 추론하기', scene: 'lab',
            goal: '이 실험으로 추론할 수 있는 것은?',
            choices: ['1족 원소인 리튬, 나트륨, 칼륨은 물과 반응하는 비슷한 성질이 있다.', '양성자 수가 비슷한 나트륨(11)과 마그네슘(12)은 성질이 비슷하다.', '금속은 모두 물과 격렬하게 반응한다.', '1족 원소는 물과 반응하는 모습이 완전히 똑같다.'],
            answer: 0,
            feedback: ['', '두 원소는 물에서 아주 다르게 행동했어요. 같은 주기라고 성질이 비슷한 것은 아니에요.', '마그네슘도 금속이지만 찬물과 거의 반응하지 않았어요.', '반응의 세기는 조금씩 달랐어요(칼륨이 가장 격렬). 그래도 물과 반응해 기체가 생기고 용액이 붉어지는 성질이 비슷해요.'],
            explain: '같은 족 원소는 <b>성질이 비슷해요</b>. 1족 금속은 공기 중의 산소·수분과도 잘 반응해서 석유 속에 보관해요.',
          },
          {
            title: '18족 기체와 달군 철솜', scene: 'lab', focus: 'tray',
            goal: '철솜을 알코올램프로 달군 뒤 산소, 헬륨, 네온, 아르곤이 든 집기병에 차례로 넣어 비교하세요.',
            hint: '철솜을 불꽃에 대어 빨갛게 달군 다음 집기병 입구로 끌어 놓아요. 식으면 다시 달궈요.',
            setup() { useLab('gas', true); },
            check: () => GAS.every((g) => G.seen[g.id]), hold: 0.3, status: gasStatus,
            onWin() { okFx(500, 250, COL.good, true); },
            explain: '철솜은 산소 속에서는 불꽃을 튀기며 탔지만, 헬륨·네온·아르곤 속에서는 <b>아무 변화가 없었어요</b>. 18족 원소는 다른 물질과 거의 반응하지 않는(안정한) 비슷한 성질이 있어요.',
          },
        ],
      },
      {
        title: '성질이 비슷한 원소 찾기', short: '원소 찾기', icon: '🕵️', phase: '적용',
        features: ['detective'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 족 원소는 성질이 비슷하다는 것을 실험으로 확인했어요.</div>' +
          '<p>이제 주기율표에서 <b>성질이 비슷한 원소</b>를 찾고, 처음 보는 원소의 성질도 예상해 봐요.</p>',
        setup() { useTable('detective'); startQuiz('detective'); },
        recap: '주기율표에서 같은 족을 찾으면 성질이 비슷한 원소를 찾고, 처음 보는 원소의 성질도 예상할 수 있어요.',
        summary: '<table><tr><th>같은 족</th><th>성질이 비슷해요</th></tr><tr><td>1족 (Li, Na, K, Rb …)</td><td>물과 잘 반응해요</td></tr><tr><td>18족 (He, Ne, Ar, Kr …)</td><td>다른 물질과 거의 반응하지 않아요</td></tr></table>' +
          '<div class="note">이용 예: 헬륨 — 비행선·풍선 / 네온 — 네온사인 / 아르곤 — 전구 속, 용접할 때 공기를 막는 기체</div>',
        missions: [
          {
            title: '원소 탐정', scene: 'table', focus: 'headers',
            goal: '단서에 맞는 원소를 주기율표에서 찾아 누르세요.',
            hint: '단서 ①로 족(세로줄)을, 단서 ②로 주기(가로줄)를 정해요.',
            setup() { useTable('detective'); startQuiz('detective'); },
            check: () => T.mode === 'detective' && qDone(), hold: 0.2,
            status: () => { const Q = T.q; return Q ? '찾은 원소 <b>' + Q.done + '/2</b>' : ''; },
            explain: '성질이 비슷한 원소는 <b>같은 족</b>에 있어요. 주기율표에서 같은 족을 찾으면 성질이 비슷한 원소를 쉽게 찾을 수 있어요.',
          },
          {
            type: 'quiz', title: '처음 보는 원소, 루비듐', scene: 'table',
            setup() { useTable('rb'); },
            goal: '루비듐(Rb)은 5주기 1족 원소예요. 루비듐을 물에 넣으면 어떻게 될까요?',
            choices: ['같은 5주기인 제논(Xe)처럼 거의 반응하지 않는다.', '같은 1족인 나트륨, 칼륨처럼 물과 반응해 기체가 생기고 용액이 붉어진다.', '마그네슘처럼 물과 거의 반응하지 않는다.', '원자 번호가 커서 물에 넣어도 아무 변화가 없다.'],
            answer: 1,
            feedback: ['같은 주기라고 성질이 비슷하지 않아요. 같은 족을 보세요.', '', '마그네슘은 2족이에요.', '원자 번호가 크다고 반응하지 않는 것은 아니에요. 같은 족 원소의 성질을 떠올려 보세요.'],
            onWin() { startRbx(); },
            explain: '루비듐은 1족이라 물과 잘 반응해요. 실제로는 칼륨보다 더 격렬해요. <b>족을 보면</b> 처음 보는 원소의 성질도 예상할 수 있어요.',
          },
          {
            title: '안전한 비행선', scene: 'airship',
            goal: '비행선에 넣을 기체를 골라 채우고 번개 시험을 통과하세요.',
            hint: '18족 원소의 성질을 떠올려 보세요.',
            setup() { asReset(); setScene('airship', true); },
            check: () => AS.passed && AS.gas === 'He', hold: 0.3,
            status: () => '기체: <b>' + (AS.gas ? (AS.gas === 'H' ? '수소' : '헬륨') : '아직 안 채웠어요') + '</b> · 번개 시험 ' + mark(AS.passed),
            explain: '헬륨은 18족 원소라 다른 물질과 거의 반응하지 않아 <b>불이 붙지 않아요</b>. 그래서 오늘날 비행선과 풍선에는 헬륨을 써요. 네온(네온사인), 아르곤(전구 속, 용접할 때 공기를 막는 기체)도 18족의 안정한 성질을 이용해요.',
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
    setScene, refreshUI, useTable, useLab, freeze(v) { FREEZE = !!v; }, RBX,
  }, DBG);
})();
