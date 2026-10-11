/* =========================================================
   중2 Ⅰ. 물질의 특성 — 혼합물의 분리 [9과08-03]
   ① [실험] 끓는점 차이: 증류 장치(가지 달린 플라스크 · 냉각기 · 시험관)로 에탄올을 먼저 모으기
   ② [실험] 밀도 차이: 분별 깔때기로 물과 식용유의 아래층(물)만 받기
   ③ [실험] 용해도 차이: 질산 칼륨 + 소량의 염화 나트륨 → 뜨거운 물에 녹였다가 식혀 결정을 거르기(재결정)
   ④ [적용] 크로마토그래피(잉크 색소 분석)와 분리 설계(모래 + 소금 + 철가루)
   ※ 혼합물의 분리 방법과 원리를 이해하는 수준으로 다룸. 분리 결과를 확인하고 생활 사례를 찾아봄.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const RM = !!SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = SciSim.ease;
  const now = () => performance.now() / 1000;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×620) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 620 : 560;
  const BG = '#f6f9fe';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();          // 반짝임, 물방울 같은 장식 효과
  const AFX = new SciSim.Particles();         // 장치 위의 거품 · 김

  let game = null;
  let F = new Set();
  const on = (f) => (game && game.free) || F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));

  const COL = {
    water: '#4f9cf5', salt: '#f59e0b', oil: '#f2c230', eth: '#d946ef', kno3: '#7c3aed', muted: '#5d6879', ink: '#1b2333',
    good: '#14a058', bad: '#e2464b', sub: '#8b5cf6', line: '#dde4ef', hot: '#f26b3a',
    tubeA: '#8b5cf6', tubeB: '#0d9488', tubeC: '#f59e0b',
  };

  /* ---------- 그리기 도우미 ---------- */
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); };
  const inRect = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  function text(x, y, str, o) { D.text(x, y, str, o); }
  function pill(x, y, str, o) { return D.label(x, y, str, o); }
  function vgrad(c, x, y, w, h, top, bottom) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  function wrapText(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const words = str.split(' '), lines = []; let cur = '';
    for (const w of words) {
      const tryS = cur ? cur + ' ' + w : w;
      if (ctx.measureText(tryS).width <= maxW) cur = tryS; else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
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
    softShadow(x, y, w, h, r, blur, dy, color || 'rgba(30,50,100,.2)');
    ctx.fillStyle = fill; D.roundRect(x, y, w, h, r); ctx.fill();
  }
  /* 바닥에 깔리는 타원 그림자 */
  function groundShadow(cx, cy, rx, ry, a) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, 'rgba(40,30,20,' + (0.3 * (a == null ? 1 : a)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  /* 실험대 (나무 판) */
  function bench(x, y, w, h) {
    panel(x, y, w, h, 16, '#e9c997', 12, 4, 'rgba(90,60,20,.28)');
    ctx.save(); ctx.beginPath(); D.roundRect(x, y, w, h, 16); ctx.clip();
    vgrad(ctx, x, y, w, h, '#efd3a6', '#d9b27a');
    ctx.strokeStyle = 'rgba(150,100,50,.13)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 9; i++) { const yy = y + 10 + i * (h / 9); ctx.beginPath(); ctx.moveTo(x, yy); ctx.bezierCurveTo(x + w * 0.3, yy - 5, x + w * 0.65, yy + 6, x + w, yy - 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x, y, w, 3);
    ctx.restore();
  }

  /* ---------- 광택 있는 입자(공) 그림을 미리 그려 두기 ---------- */
  const spriteCache = {};
  function sprite(color, R) {
    const key = color + '|' + R;
    if (spriteCache[key]) return spriteCache[key];
    const k = 4, m = 1.5;
    const size = Math.ceil(R * 2 * m * k);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.scale(k, k);
    const cx = R * m, cy = R * m;
    const sh = g.createRadialGradient(cx + R * 0.12, cy + R * 0.34, R * 0.3, cx + R * 0.12, cy + R * 0.34, R * 1.35);
    sh.addColorStop(0, 'rgba(20,30,60,.28)'); sh.addColorStop(1, 'rgba(20,30,60,0)');
    g.fillStyle = sh; g.beginPath(); g.arc(cx + R * 0.12, cy + R * 0.34, R * 1.35, 0, TAU); g.fill();
    const gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.42, R * 0.06, cx, cy, R);
    gr.addColorStop(0, shade(color, 0.62)); gr.addColorStop(0.5, color); gr.addColorStop(1, shade(color, -0.38));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath(); g.ellipse(cx - R * 0.33, cy - R * 0.42, R * 0.34, R * 0.2, -0.6, 0, TAU); g.fill();
    return (spriteCache[key] = { c, half: R * m });
  }
  function drawBall(c, color, x, y, R, alpha) {
    const rr = Math.max(2, Math.round(R));
    const sp = sprite(color, rr);
    const s = sp.half * 2 * (R / rr);
    if (alpha != null && alpha < 1) c.globalAlpha = alpha;
    c.drawImage(sp.c, x - s / 2, y - s / 2, s, s);
    if (alpha != null && alpha < 1) c.globalAlpha = 1;
  }

  /* ---------- 유리 비커 (옆모습): 속이 비치는 유리 + 액체 + 수면 ----------
     (x, y)=왼쪽 위. o: {level 0~1, liquid, alpha, t, wave, ticks, glass, inner(info)} */
  function glassBeaker(x, y, w, h, o) {
    o = o || {};
    const r = Math.min(14, w * 0.16), lvl = clamp(o.level != null ? o.level : 0.5, 0, 1), t = o.t || 0;
    const body = () => {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h - r); ctx.quadraticCurveTo(x, y + h, x + r, y + h);
      ctx.lineTo(x + w - r, y + h); ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r); ctx.lineTo(x + w, y);
    };
    ctx.save();
    body(); ctx.closePath();
    const gb = ctx.createLinearGradient(x, 0, x + w, 0);
    gb.addColorStop(0, 'rgba(176,200,232,.5)'); gb.addColorStop(0.14, 'rgba(228,241,255,.26)'); gb.addColorStop(0.86, 'rgba(228,241,255,.2)'); gb.addColorStop(1, 'rgba(170,196,230,.5)');
    ctx.fillStyle = gb; ctx.fill();
    let ly = y + h;
    if (lvl > 0.005) {
      ly = y + h - (h - 4) * lvl;
      ctx.save(); body(); ctx.closePath(); ctx.clip();
      const c = o.liquid || '#7cc4ff', a = o.alpha != null ? o.alpha : 0.7;
      const g = ctx.createLinearGradient(0, ly, 0, y + h);
      g.addColorStop(0, rgba(c, a * 0.78)); g.addColorStop(1, rgba(c, Math.min(1, a * 1.12)));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - 4, y + h + 2);
      const wv = o.wave != null ? o.wave : 1.1;
      for (let i = 0; i <= 20; i++) { const px = x - 4 + ((w + 8) * i) / 20; ctx.lineTo(px, ly + Math.sin(t * 2.4 + i * 0.75) * wv); }
      ctx.lineTo(x + w + 4, y + h + 2); ctx.closePath(); ctx.fill();
      const gs = ctx.createLinearGradient(x, 0, x + w, 0);
      gs.addColorStop(0, 'rgba(20,60,120,.2)'); gs.addColorStop(0.2, 'rgba(20,60,120,0)'); gs.addColorStop(0.8, 'rgba(20,60,120,0)'); gs.addColorStop(1, 'rgba(20,60,120,.22)');
      ctx.fillStyle = gs; ctx.fillRect(x, ly - 4, w, y + h - ly + 6);
      ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.beginPath(); ctx.ellipse(x + w / 2, ly, w / 2 - 2, 3.2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x + w / 2, ly, w / 2 - 2, 3.2, 0, 0, TAU); ctx.stroke();
      if (o.inner) o.inner({ x, y, w, h, ly });
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = o.glass || '#8fa3bd'; ctx.lineWidth = 3; body(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y - 1); ctx.lineTo(x + 1, y + 3); ctx.moveTo(x + w + 5, y - 1); ctx.lineTo(x + w - 1, y + 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(143,163,189,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 1, w / 2, 3.6, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = Math.max(2.5, w * 0.04); ctx.beginPath(); ctx.moveTo(x + w * 0.14, y + 14); ctx.lineTo(x + w * 0.14, y + h - 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.87, y + 18); ctx.lineTo(x + w * 0.87, y + h - 20); ctx.stroke();
    if (o.ticks) {
      ctx.strokeStyle = 'rgba(93,104,121,.5)'; ctx.lineWidth = 1.2;
      for (let i = 1; i < o.ticks; i++) { const ty = y + h - ((h - 6) * i) / o.ticks; ctx.beginPath(); ctx.moveTo(x + w - (i % 2 ? 9 : 16), ty); ctx.lineTo(x + w - 3, ty); ctx.stroke(); }
    }
    ctx.restore();
    return { ly };
  }

  /* ---------- 축하 효과 (캔버스 위 체크 + 반짝임) ---------- */
  const checks = [];
  function celebrate(x, y) {
    FX.burst(x, y, { count: 26, speed: 190, life: 0.9, size: 4 });
    checks.push({ x, y, t: 0 });
    Sound.success();
  }
  function drawChecks(dt) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i];
      c.t += dt;
      if (c.t > 1.8) { checks.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = c.t > 1.3 ? 1 - (c.t - 1.3) / 0.5 : 1;
      const s = 0.75 + 0.25 * ease.outBack(Math.min(1, c.t / 0.35));
      ctx.translate(c.x, c.y); ctx.scale(s, s);
      D.check(0, 0, 26, Math.min(1, c.t / 0.5));
      ctx.restore();
    }
  }
  function newBadge(x, y) {
    ctx.save();
    const a = 0.5 + 0.5 * Math.sin(now() * 6);
    D.label(x, y, 'NEW', { bg: rgba(COL.sub, 0.85 + a * 0.15), size: 13, pad: 7 });
    ctx.restore();
  }
  function ringRect(r, t, rad) {
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.35 + 0.5 * a); ctx.lineWidth = 4; D.roundRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, (rad || 16) + 4); ctx.stroke(); ctx.restore();
    newBadge(r.x + r.w - 20, r.y - 4);
  }
  /* 입자 모형 유리창 틀 */
  function lensFrame(r, o, inner) {
    ctx.save();
    panel(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 20, '#fff', 18, 6, 'rgba(40,30,90,.25)');
    ctx.beginPath(); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.clip();
    vgrad(ctx, r.x, r.y, r.w, r.h, o.top || '#f9fcff', o.bot || '#e4effd');
    inner();
    const gl = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.5, r.y + r.h * 0.6);
    gl.addColorStop(0, 'rgba(255,255,255,.3)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    const rg = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    rg.addColorStop(0, '#c4b5fd'); rg.addColorStop(0.5, '#7c3aed'); rg.addColorStop(1, '#4c1d95');
    ctx.strokeStyle = rg; ctx.lineWidth = 5; D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.stroke();
    pill(r.x + 12, r.y + 16, o.title || '🔍 입자 모형', { bg: '#5b21b6', size: 14, align: 'left', pad: 10 });
  }


  /* ---------- 장면 공통 ---------- */
  const S = { scene: 'distill', sceneT: 0 };
  const SC = {};
  const DR = { fn: null };                 // 입력을 받는 장면
  const DBG = {};                           // 시험용 접근 (window.__sim)
  const later = [];                         // 몇 초 뒤에 실행할 일
  function schedule(sec, fn) { later.push({ at: now() + sec, fn }); }
  const mark = (b) => (b ? '✅' : '⬜');
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
  /* 장치를 그리는 좌표계: 원래 크기(sc = 1)로 그린 뒤 화면 칸에 맞게 줄여 그림 */
  function withFrame(r, w, h, fn, dy) {
    const sc = Math.min(r.w / w, r.h / h), ox = r.x + (r.w - w * sc) / 2, oy = r.y + (r.h - h * sc) / 2 + (dy || 0) * sc;
    ctx.save(); ctx.beginPath(); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.clip();
    ctx.translate(ox, oy); ctx.scale(sc, sc); fn(sc); ctx.restore();
    return { sc, ox, oy };
  }
  /* 색(#hex 또는 rgb())에 투명도 주기 */
  const withA = (c, a) => (c.charAt(0) === '#' ? rgba(c, a) : c.replace('rgb(', 'rgba(').replace(')', ',' + a + ')'));
  const toLocal = (p, f) => ({ x: (p.x - f.ox) / f.sc, y: (p.y - f.oy) / f.sc });


  /* =========================================================
     장면 ①: 증류 — 끓는점 차이로 에탄올과 물 분리
       에탄올(끓는점 약 78 °C)이 물(100 °C)보다 먼저 끓어 나와 냉각기에서 액체가 되어 시험관에 모여요.
     ========================================================= */
  const DL = PHONE ? {
    app: { x: 4, y: 4, w: 432, h: 438 }, graph: { x: 4, y: 450, w: 214, h: 166 }, lens: { x: 226, y: 450, w: 210, h: 166 },
  } : {
    app: { x: 16, y: 16, w: 514, h: 528 }, graph: { x: 544, y: 16, w: 240, h: 258 }, lens: { x: 544, y: 286, w: 240, h: 258 },
  };
  const AG = {
    bench: 484, w: 514, h: 528,
    fl: { x: 120, y: 380, r: 54 }, neckW: 26, neckTop: 238, armY: 272,
    C0: { x: 192, y: 280 }, C1: { x: 362, y: 374 }, TIP: { x: 370, y: 390 },
    tubeTop: 410, tubeLen: 70, tubeW: 34, pitch: 54,
    thermo: { x: 120, y: 106, h: 166 },
  };
  const VPATH = [[120, 338], [120, 282], [136, 272], [192, 280], [362, 374]];
  const VLEN = []; let VTOT = 0;
  VPATH.forEach((p, i) => { if (i) { VTOT += Math.hypot(p[0] - VPATH[i - 1][0], p[1] - VPATH[i - 1][1]); } VLEN.push(VTOT); });
  const VCOND0 = VLEN[3];                                  // 냉각기가 시작되는 길이
  function vpos(s) {
    s = clamp(s, 0, VTOT);
    for (let i = 1; i < VPATH.length; i++) if (s <= VLEN[i]) { const k = (s - VLEN[i - 1]) / (VLEN[i] - VLEN[i - 1]); return { x: lerp(VPATH[i - 1][0], VPATH[i][0], k), y: lerp(VPATH[i - 1][1], VPATH[i][1], k) }; }
    return { x: VPATH[VPATH.length - 1][0], y: VPATH[VPATH.length - 1][1] };
  }
  const TUBE_COL = [COL.tubeA, COL.tubeB, COL.tubeC], TUBE_NAME = ['A', 'B', 'C'];
  const DS = {
    t: 0, T: 22, on: false, done: false, boiling: false, fast: false, maxT: 22,
    E0: 24, W0: 16, E: 24, W: 16, alpha: 8, q: 3.0, acc: 0, sel: 0, rack: { x: 0 },
    tubes: [], puffs: [], slides: [], falls: [], bubbles: [], samples: [], sampleT: 0,
    lp: [], lf: [], ping: -9, ping2: -9, flame: 0, frame: null, lcols: 7, lrows: PHONE ? 4 : 5, lcell: PHONE ? 24 : 28, splash: [],
  };
  const dsBp = (E, W) => (E < 0.12 ? 100 : 100 - 21.6 * Math.pow(E / (E + W), 0.25));
  const dsY = (E, W) => { if (E < 0.12) return 0; const x = E / (E + W); return DS.alpha * x / (1 + (DS.alpha - 1) * x); };
  const dsFrac = (tb) => (tb.E + tb.W > 0.01 ? tb.E / (tb.E + tb.W) : 0);
  const dsVol = (tb) => tb.E + tb.W;
  function dsReset() {
    Object.assign(DS, { t: 0, T: 22, on: false, done: false, boiling: false, maxT: 22, E: DS.E0, W: DS.W0, acc: 0, sel: 0, ping: -9, ping2: -9, flame: 0, sampleT: 0 });
    DS.tubes = [0, 1, 2].map(() => ({ E: 0, W: 0, lvl: 0 }));
    DS.puffs = []; DS.slides = []; DS.falls = []; DS.bubbles = []; DS.samples = []; DS.splash = [];
    SciSim.tween(DS.rack, { x: AG.TIP.x }, { duration: 0.001 }); DS.rack.x = AG.TIP.x;
    dsLensFill(); dsRefresh();
  }
  function dsSelect(i, silent) {
    if (DS.sel === i && !silent) return;
    DS.sel = i;
    const x = AG.TIP.x - AG.pitch * i;
    if (RM || silent) DS.rack.x = x; else SciSim.tween(DS.rack, { x }, { duration: 0.5, ease: 'outBack' });
    if (!silent) Sound.tone(520 + i * 80, 0.07, 'triangle', 0.05);
    dsRefresh();
  }
  /* ---- 플라스크 속 입자 (돋보기) ---- */
  function dsLensFill() {
    const n = DS.lcols * DS.lrows, nE = Math.round(DS.E0 * n / 40), nW = Math.round(DS.W0 * n / 40);
    const types = []; for (let i = 0; i < nE; i++) types.push(1); for (let i = 0; i < nW; i++) types.push(0);
    for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
    DS.lp = types.map((ty, i) => ({ type: ty, slot: i, ph: rand(0, TAU), ph2: rand(0, TAU), w: rand(0.8, 1.25), x: 0, y: 0, s: 1 }));
    DS.lf = [];
  }
  function dsLensGeom() {
    const r = DL.lens, cell = DS.lcell, w = DS.lcols * cell, x0 = r.x + (r.w - w) / 2, yb = r.y + r.h - (PHONE ? 38 : 48);
    return { r, cell, w, x0, yb };
  }
  function dsLensSlot(slot) {
    const g = dsLensGeom(), c = slot % DS.lcols, row = Math.floor(slot / DS.lcols);
    return { x: g.x0 + (c + 0.5) * g.cell + (row % 2 ? g.cell * 0.18 : -g.cell * 0.08), y: g.yb - (row + 0.5) * g.cell };
  }
  function dsLensUpdate(dt, t) {
    const nE = Math.round(DS.E * DS.lcols * DS.lrows / 40), nW = Math.round(DS.W * DS.lcols * DS.lrows / 40);
    [[1, nE], [0, nW]].forEach(([ty, target]) => {
      let cnt = DS.lp.filter((p) => p.type === ty).length;
      while (cnt > target) {
        let best = null;
        DS.lp.forEach((p) => { if (p.type === ty && (!best || p.slot > best.slot)) best = p; });
        if (!best) break;
        const g = dsLensGeom();
        DS.lf.push({ x: best.x, y: best.y, vx: rand(-26, 26), vy: -rand(80, 120), type: ty, a: 1 });
        DS.lp.splice(DS.lp.indexOf(best), 1); cnt--;
        // 빈 자리는 맨 위 입자가 내려와 채움
        const top = DS.lp.reduce((m, p) => (p.slot > (m ? m.slot : -1) ? p : m), null);
        if (top && top.slot > best.slot) top.slot = best.slot;
      }
    });
    const g = dsLensGeom(), amp = 1.2 + 4.6 * clamp((DS.T - 22) / 60, 0, 1.2);
    DS.lp.forEach((p) => {
      const q = dsLensSlot(p.slot), a = amp * g.cell * 0.05;
      const tx = q.x + (Math.sin(t * 2.3 * p.w + p.ph) + 0.5 * Math.sin(t * 3.7 + p.ph2)) * a, ty = q.y + (Math.cos(t * 2.1 * p.w + p.ph2) + 0.5 * Math.sin(t * 3.1 + p.ph)) * a;
      if (!p.x) { p.x = tx; p.y = ty - 18; }
      p.x = SciSim.approach(p.x, tx, dt, 9); p.y = SciSim.approach(p.y, ty, dt, 9);
    });
    for (let i = DS.lf.length - 1; i >= 0; i--) {
      const f = DS.lf[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.vx += rand(-60, 60) * dt;
      if (f.x < g.x0 + 8) { f.x = g.x0 + 8; f.vx = Math.abs(f.vx); } else if (f.x > g.x0 + g.w - 8) { f.x = g.x0 + g.w - 8; f.vx = -Math.abs(f.vx); }
      if (f.y < g.r.y + 50) f.a -= dt * 3.5;
      if (f.a <= 0) DS.lf.splice(i, 1);
    }
  }
  /* ---- 시뮬레이션 ---- */
  function dsStep(dt) {
    const speed = (DS.fast ? 3 : 1) * 1.15, dm = dt * speed;                    // 시뮬레이션의 '분'
    const V = DS.E + DS.W, bp = dsBp(DS.E, DS.W);
    DS.flame = SciSim.approach(DS.flame, DS.on && !DS.done ? 1 : 0, dt, 6);
    if (DS.on && !DS.done) {
      DS.t += dm;
      if (!DS.boiling) {
        DS.T += 9.5 * dm;
        if (DS.T >= bp) { DS.T = bp; DS.boiling = true; DS.ping = now(); Sound.tone(880, 0.12, 'triangle', 0.07); }
      } else {
        const T0 = DS.T; DS.T += (bp - DS.T) * Math.min(1, 5 * dm);
        if (T0 < 90 && DS.T >= 90 && DS.ping2 < 0) { DS.ping2 = now(); }
        let dV = Math.min(DS.q * dm, V - 2.4);
        if (dV > 0) {
          const y = dsY(DS.E, DS.W);
          DS.E = Math.max(0, DS.E - dV * y); DS.W = Math.max(0, DS.W - dV * (1 - y)); DS.acc += dV;
          while (DS.acc >= 0.5) { DS.acc -= 0.5; DS.puffs.push({ s: 0, y, dv: 0.5, cs: VCOND0 + rand(0.12, 0.55) * (VTOT - VCOND0), sp: rand(205, 250) }); }
        }
        if (V <= 2.6) { DS.done = true; DS.on = false; DS.boiling = false; DS.ping2 = now(); Sound.success(); dsRefresh(); }
      }
      DS.maxT = Math.max(DS.maxT, DS.T);
      DS.sampleT += dm;
      if (DS.sampleT >= 0.12 || !DS.samples.length) { DS.sampleT = 0; DS.samples.push({ t: DS.t, T: DS.T, k: DS.boiling ? DS.sel : -1 }); }
    } else if (!DS.on) {
      DS.boiling = false;
      if (DS.T > 22) DS.T = Math.max(22, DS.T - 2.6 * dm);
    }
    // 끓는 거품
    if (DS.boiling && !RM && Math.random() < dt * (DS.fast ? 30 : 20)) {
      const A = AG.fl; DS.bubbles.push({ x: A.x + rand(-A.r * 0.55, A.r * 0.55), y: A.y + A.r * 0.78, vy: -rand(60, 95), r: rand(1.8, 4.2) });
    }
    for (let i = DS.bubbles.length - 1; i >= 0; i--) { const b = DS.bubbles[i]; b.y += b.vy * dt; b.x += Math.sin(b.y * 0.2) * 0.2; if (b.y < dsLiqTop() + 2) DS.bubbles.splice(i, 1); }
    // 증기 → 냉각기에서 액체 → 시험관
    for (let i = DS.puffs.length - 1; i >= 0; i--) {
      const p = DS.puffs[i]; p.s += p.sp * dt;
      if (p.s >= p.cs) { DS.slides.push({ s: p.cs, y: p.y, dv: p.dv, sp: rand(70, 110) }); DS.puffs.splice(i, 1); }
    }
    for (let i = DS.slides.length - 1; i >= 0; i--) {
      const d = DS.slides[i]; d.s += d.sp * dt;
      if (d.s >= VTOT) { DS.falls.push({ x: AG.TIP.x + rand(-1, 1), y: AG.TIP.y, vy: 20, y2: d.y, dv: d.dv }); DS.slides.splice(i, 1); }
    }
    for (let i = DS.falls.length - 1; i >= 0; i--) {
      const f = DS.falls[i]; f.vy += 760 * dt; f.y += f.vy * dt;
      if (f.y >= AG.tubeTop + 6) {
        let bi = 0, bd = 1e9; for (let k = 0; k < 3; k++) { const d = Math.abs(f.x - (DS.rack.x + k * AG.pitch)); if (d < bd) { bd = d; bi = k; } }
        const tb = DS.tubes[bi]; tb.E += f.dv * f.y2; tb.W += f.dv * (1 - f.y2);
        DS.splash.push({ x: DS.rack.x + bi * AG.pitch, y: AG.tubeTop + AG.tubeLen - Math.min(AG.tubeLen - 6, dsVol(tb) * 1.6), t: 0, c: dsLiqColor(f.y2) });
        DS.falls.splice(i, 1);
      }
    }
    for (let i = DS.splash.length - 1; i >= 0; i--) { DS.splash[i].t += dt; if (DS.splash[i].t > 0.4) DS.splash.splice(i, 1); }
    DS.tubes.forEach((tb) => { tb.lvl = SciSim.approach(tb.lvl, dsVol(tb), dt, 10); });
  }
  const dsLiqColor = (y) => mix('#8fc8ff', '#e056f5', clamp(y, 0, 1));
  const dsLiqTop = () => AG.fl.y + AG.fl.r - 14 - (AG.fl.r * 1.45) * clamp((DS.E + DS.W) / 40, 0, 1) - 4;
  /* ---- 그리기: 장치 ---- */
  function dsFlaskPath() {
    const A = AG.fl, nw = AG.neckW / 2, dy = Math.sqrt(A.r * A.r - nw * nw), ya = A.y - dy;
    ctx.beginPath(); ctx.moveTo(A.x - nw, AG.neckTop); ctx.lineTo(A.x - nw, ya);
    ctx.arc(A.x, A.y, A.r, Math.atan2(-dy, -nw), Math.atan2(-dy, nw), true);
    ctx.lineTo(A.x + nw, AG.neckTop);
  }
  function dsGlassTube(pts, w, tint) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = w + 3.5; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = tint || 'rgba(232,242,255,.95)'; ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(1.5, w * 0.18); ctx.translate(-w * 0.2, -w * 0.2); ctx.stroke();
    ctx.restore();
  }
  function dsCondenser(t) {
    const C0 = AG.C0, C1 = AG.C1, L = Math.hypot(C1.x - C0.x, C1.y - C0.y), ux = (C1.x - C0.x) / L, uy = (C1.y - C0.y) / L, nx = -uy, ny = ux;
    const a = L * 0.1, b = L * 0.9, hw = 17;
    const P = (s, o) => [C0.x + ux * s + nx * o, C0.y + uy * s + ny * o];
    // 찬물이 채워진 바깥 관
    ctx.save();
    ctx.beginPath(); [P(a, -hw), P(b, -hw), P(b, hw), P(a, hw)].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    const g = ctx.createLinearGradient(P(a, -hw)[0], P(a, -hw)[1], P(a, hw)[0], P(a, hw)[1]);
    g.addColorStop(0, 'rgba(140,200,255,.55)'); g.addColorStop(0.5, 'rgba(190,225,255,.5)'); g.addColorStop(1, 'rgba(120,180,245,.62)');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    const flow = (t * 70) % 26;                                   // 냉각수는 아래쪽(오른쪽 아래)에서 위쪽(왼쪽 위)으로
    for (let s = b - flow; s > a; s -= 26) { const p0 = P(s, -hw * 0.55), p1 = P(s - 11, -hw * 0.55), q0 = P(s - 13, hw * 0.4), q1 = P(s - 24, hw * 0.4); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...P(a, -hw)); ctx.lineTo(...P(b, -hw)); ctx.moveTo(...P(a, hw)); ctx.lineTo(...P(b, hw)); ctx.moveTo(...P(a, -hw)); ctx.lineTo(...P(a, hw)); ctx.moveTo(...P(b, -hw)); ctx.lineTo(...P(b, hw)); ctx.stroke();
    ctx.restore();
    // 냉각수 호스 (아래쪽 입구, 위쪽 출구)
    const ports = [[0.84, 1, '#3b82f6'], [0.16, -1, '#3b82f6']];
    ports.forEach(([f, side]) => {
      const p = P(L * f, side * hw), q = P(L * f, side * (hw + 20));
      ctx.save(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,180,245,.9)'; ctx.lineWidth = 5.5; ctx.stroke(); ctx.restore();
    });
    // 안쪽 관 (증기가 지나가는 길)
    dsGlassTube([[C0.x, C0.y], [C1.x, C1.y], [AG.TIP.x, AG.TIP.y]], 11, 'rgba(238,246,255,.96)');
    return { P, L, ux, uy, nx, ny };
  }
  function dsDrawApp(sc, t) {
    const A = AG.fl, th = DS.T, boil = DS.boiling;
    // 실험대
    ctx.save(); vgrad(ctx, 12, AG.bench, AG.w - 24, 12, '#e8c796', '#cfa56d'); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(12, AG.bench, AG.w - 24, 2); ctx.restore();
    // 스탠드
    const rg = ctx.createLinearGradient(36, 0, 46, 0); rg.addColorStop(0, '#b6bfcd'); rg.addColorStop(1, '#6b7689');
    ctx.fillStyle = rg; ctx.fillRect(36, 190, 9, AG.bench - 190); ctx.fillStyle = '#6b7689'; D.roundRect(14, AG.bench - 7, 64, 9, 3); ctx.fill();
    ctx.fillStyle = '#7d889b'; D.roundRect(40, 296, 66, 7, 3); ctx.fill(); ctx.fillStyle = '#4b5567'; D.roundRect(30, 288, 22, 22, 4); ctx.fill();
    ctx.strokeStyle = '#6b7689'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(100, 292); ctx.lineTo(A.x - 14, 296); ctx.moveTo(100, 306); ctx.lineTo(A.x - 14, 300); ctx.stroke();
    // 삼발이 + 석면망
    ctx.strokeStyle = '#6b7689'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    [[A.x - 46, 440, A.x - 66, AG.bench], [A.x + 46, 440, A.x + 66, AG.bench], [A.x, 440, A.x, AG.bench]].forEach((q) => { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.stroke(); });
    ctx.fillStyle = '#5b6678'; D.roundRect(A.x - 62, 436, 124, 7, 3); ctx.fill(); ctx.fillStyle = 'rgba(205,210,220,.85)'; ctx.fillRect(A.x - 46, 432, 92, 4);
    // 알코올램프
    const lg = ctx.createLinearGradient(A.x - 30, 0, A.x + 30, 0); lg.addColorStop(0, 'rgba(210,235,250,.95)'); lg.addColorStop(0.5, 'rgba(240,250,255,.95)'); lg.addColorStop(1, 'rgba(170,205,232,.95)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(A.x - 11, 466); ctx.lineTo(A.x + 11, 466); ctx.bezierCurveTo(A.x + 34, 472, A.x + 34, AG.bench, A.x + 27, AG.bench); ctx.lineTo(A.x - 27, AG.bench); ctx.bezierCurveTo(A.x - 34, AG.bench, A.x - 34, 472, A.x - 11, 466); ctx.fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = 'rgba(255,170,60,.45)'; ctx.fillRect(A.x - 24, 482, 48, 10);
    ctx.fillStyle = '#9aa5b6'; D.roundRect(A.x - 10, 459, 20, 9, 3); ctx.fill();
    if (DS.flame > 0.02) { D.flame(A.x, 460, 36 * DS.flame, t); }
    // 플라스크: 액체 + 유리
    ctx.save(); dsFlaskPath(); ctx.closePath(); const gb = ctx.createLinearGradient(A.x - A.r, 0, A.x + A.r, 0);
    gb.addColorStop(0, 'rgba(176,200,232,.45)'); gb.addColorStop(0.2, 'rgba(228,241,255,.22)'); gb.addColorStop(0.8, 'rgba(228,241,255,.18)'); gb.addColorStop(1, 'rgba(170,196,230,.45)'); ctx.fillStyle = gb; ctx.fill();
    ctx.clip();
    const V = DS.E + DS.W, ly = dsLiqTop(), xf = V > 0 ? DS.E / V : 0;
    if (V > 0.5) {
      const c = dsLiqColor(xf * 0.9), gl = ctx.createLinearGradient(0, ly, 0, A.y + A.r);
      gl.addColorStop(0, rgba('#8fc8ff', 0.0)); gl.addColorStop(0.02, 'rgba(255,255,255,0)');
      ctx.fillStyle = c; ctx.globalAlpha = 0.62; ctx.beginPath(); ctx.moveTo(A.x - A.r - 4, A.y + A.r + 4);
      for (let i = 0; i <= 18; i++) { const px = A.x - A.r - 4 + ((A.r * 2 + 8) * i) / 18; ctx.lineTo(px, ly + Math.sin(t * (boil ? 7 : 2) + i * 0.8) * (boil ? 2.2 : 0.9)); }
      ctx.lineTo(A.x + A.r + 4, A.y + A.r + 4); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(A.x - A.r, ly - 1, A.r * 2, 2.5);
      DS.bubbles.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.3; circle(ctx, b.x, b.y, b.r); ctx.stroke(); });
    }
    ctx.restore();
    ctx.save(); dsFlaskPath(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(A.x, A.y, A.r - 8, Math.PI * 0.62, Math.PI * 0.95); ctx.stroke(); ctx.restore();
    // 가지(옆관)
    dsGlassTube([[A.x + AG.neckW / 2 - 2, 276], [136, 272], [AG.C0.x, AG.C0.y]], 11, 'rgba(238,246,255,.96)');
    // 온도계 + 고무 마개
    D.thermometer(A.x, AG.thermo.y, AG.thermo.h, th, 0, 110, { ticks: false, color: '#e2464b' });
    ctx.fillStyle = '#b0734a'; ctx.beginPath(); ctx.moveTo(A.x - 15, AG.neckTop - 6); ctx.lineTo(A.x + 15, AG.neckTop - 6); ctx.lineTo(A.x + 12, AG.neckTop + 14); ctx.lineTo(A.x - 12, AG.neckTop + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(A.x - 12, AG.neckTop - 4, 5, 16);
    // 냉각기
    const cg = dsCondenser(t);
    return cg;
  }
  function dsDrawTubes(t) {
    const A = AG, wb = A.tubeW / 2, top = A.tubeTop, len = A.tubeLen, bot = top + len;
    // 받침대
    const x0 = DS.rack.x - 30, x1 = DS.rack.x + 2 * A.pitch + 30;
    ctx.save(); vgrad(ctx, x0, 448, x1 - x0, 13, '#e6c18a', '#c99a5b'); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x0, 461, x1 - x0, 3);
    for (let i = 0; i < 3; i++) {
      const x = DS.rack.x + i * A.pitch, tb = DS.tubes[i], col = TUBE_COL[i], sel = DS.sel === i;
      const path = () => { ctx.beginPath(); ctx.moveTo(x - wb, top); ctx.lineTo(x - wb, bot - wb); ctx.arc(x, bot - wb, wb, Math.PI, 0, true); ctx.lineTo(x + wb, top); };
      const h = Math.min(len - 6, tb.lvl * 1.6), frac = dsFrac(tb);
      ctx.save(); path(); ctx.closePath(); ctx.fillStyle = 'rgba(230,242,255,.3)'; ctx.fill(); ctx.clip();
      if (h > 1) {
        ctx.fillStyle = dsLiqColor(frac); ctx.globalAlpha = 0.78; ctx.fillRect(x - wb - 2, bot - h, A.tubeW + 4, h + 2); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - wb, bot - h, A.tubeW, 2.2);
      }
      DS.splash.forEach((s) => { if (Math.abs(s.x - x) < 2) { const k = s.t / 0.4; ctx.strokeStyle = rgba('#ffffff', 0.8 * (1 - k)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, s.y, 4 + k * 10, 1.5 + k * 2, 0, 0, TAU); ctx.stroke(); } });
      ctx.restore();
      ctx.save(); path(); ctx.strokeStyle = sel ? col : '#8fa3bd'; ctx.lineWidth = sel ? 3.6 : 2.6; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x - wb + 5, top + 8); ctx.lineTo(x - wb + 5, bot - wb - 4); ctx.stroke(); ctx.restore();
      // 이름표
      ctx.fillStyle = '#fff'; circle(ctx, x, bot - 20, 10.5); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.stroke();
      text(x, bot - 15.5, TUBE_NAME[i], { size: 14, weight: 800, color: shade(col, -0.2) });
      // 양 + 에탄올 비율
      const vol = dsVol(tb);
      text(x, bot + 24, vol < 0.05 ? '비었음' : (Math.round(vol * 10) / 10).toFixed(1) + ' mL', { size: 13.5 / LSC, weight: 800, color: vol < 0.05 ? '#9aa5b6' : COL.ink });
      if (vol >= 0.5) {
        const pc = Math.round(frac * 100);
        drawBall(ctx, COL.eth, x - 17, bot + 37, 5.2); text(x - 9, bot + 42, pc + '%', { size: 13.5 / LSC, weight: 800, color: pc >= 85 ? '#a21caf' : COL.muted, align: 'left' });
      }
      if (sel) { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); const yy = top - 12 + Math.sin(t * 6) * 2; ctx.moveTo(x - 7, yy - 8); ctx.lineTo(x + 7, yy - 8); ctx.lineTo(x, yy + 2); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
  }
  let LSC = 1;
  function dsDrawFlow(t) {
    // 증기(떠다니는 알갱이)와 냉각기 안에서 맺히는 물방울
    DS.puffs.forEach((p) => {
      const q = vpos(p.s), a = 0.55;
      ctx.fillStyle = withA(mix('#ffffff', '#e056f5', clamp(p.y, 0, 1)), a); circle(ctx, q.x, q.y, 6.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; circle(ctx, q.x - 1.5, q.y - 1.5, 2.2); ctx.fill();
    });
    DS.slides.forEach((d) => {
      const q = vpos(d.s); ctx.fillStyle = withA(dsLiqColor(d.y), 0.95); circle(ctx, q.x, q.y + 3.5, 3.4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; circle(ctx, q.x - 1, q.y + 2.2, 1.1); ctx.fill();
    });
    DS.falls.forEach((f) => { ctx.fillStyle = withA(dsLiqColor(f.y2), 0.95); ctx.beginPath(); ctx.ellipse(f.x, f.y, 3, 4.4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.85)'; circle(ctx, f.x - 1, f.y - 1.4, 1.1); ctx.fill(); });
  }
  function dsDrawLabels(t, cg) {
    const A = AG.fl, f = (n) => n / LSC;
    D.label(A.x, AG.thermo.y - 14, '온도계', { bg: '#1b2333', size: f(13), pad: 8 });
    const m = cg.P(cg.L * 0.5, -48);
    D.label(m[0], m[1], '냉각기', { bg: '#1b2333', size: f(13), pad: 8 });
    const wi = cg.P(cg.L * 0.84, 56), wo = cg.P(cg.L * 0.16, -48);
    D.label(wi[0] + 4, wi[1], '냉각수 들어감', { bg: '#2563eb', size: f(13), pad: 8 });
    D.label(wo[0] - 6, wo[1] - 8, '냉각수 나옴', { bg: '#2563eb', size: f(13), pad: 8 });
    D.label(A.x, A.y + 8, '에탄올 + 물', { bg: 'rgba(255,255,255,.92)', color: COL.ink, size: f(13), pad: 8, border: 'rgba(30,50,100,.25)' });
    // 끓기 시작 · 물이 끓는 구간 알림
    const age = t - DS.ping;
    if (age < 3.2) { ctx.save(); ctx.globalAlpha = age > 2.6 ? 1 - (age - 2.6) / 0.6 : 1; const k = ease.outBack(Math.min(1, age / 0.3)); ctx.translate(A.x + 66, 150); ctx.scale(k, k); D.label(0, 0, '에탄올이 끓기 시작!', { bg: COL.eth, size: f(14), pad: 9 }); ctx.restore(); }
    const age2 = t - DS.ping2;
    if (DS.ping2 > 0 && age2 < 3.2) { ctx.save(); ctx.globalAlpha = age2 > 2.6 ? 1 - (age2 - 2.6) / 0.6 : 1; const k = ease.outBack(Math.min(1, age2 / 0.3)); ctx.translate(A.x + 66, 178); ctx.scale(k, k); D.label(0, 0, DS.done ? '증류 끝!' : '온도가 올라가요!', { bg: COL.hot, size: f(14), pad: 9 }); ctx.restore(); }
    if (!DS.on && !DS.samples.length) D.label(A.x + 4, 232, '🔥 가열해 보세요', { bg: '#64748b', size: f(14), pad: 10 });
    if (DS.tubes.some((tb) => dsVol(tb) >= 0.5)) text(AG.TIP.x + 2 * AG.pitch + 28, AG.tubeTop - 8, '🟣 = 에탄올 비율', { size: 13 / LSC, weight: 800, color: '#a21caf', align: 'right' });
  }
  function dsDrawGraph(t) {
    const g = DL.graph, X0 = g.x + 42, X1 = g.x + g.w - 12, Y0 = g.y + (PHONE ? 40 : 54), Y1 = g.y + g.h - (PHONE ? 30 : 38), XM = 25, TMIN = 20, TMAX = 110;
    const X = (m) => X0 + (X1 - X0) * m / XM, Y = (T) => Y1 - (Y1 - Y0) * (T - TMIN) / (TMAX - TMIN);
    panel(g.x, g.y, g.w, g.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(g.x + 12, g.y + 26, '📈 ' + (PHONE ? '온도 변화' : '시간–온도 그래프'), { size: PHONE ? 14 : 15, weight: 800, color: COL.ink, align: 'left' });
    ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1;
    for (let T = 20; T <= TMAX; T += 20) { ctx.beginPath(); ctx.moveTo(X0, Y(T)); ctx.lineTo(X1, Y(T)); ctx.stroke(); text(X0 - 6, Y(T) + 4.5, String(T), { size: 13, weight: 700, color: COL.muted, align: 'right' }); }
    for (let m = 0; m <= XM; m += 5) { text(X(m), Y1 + 16, String(m), { size: 13, weight: 700, color: COL.muted }); }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, Y0 - 4); ctx.lineTo(X0, Y1); ctx.lineTo(X1 + 3, Y1); ctx.stroke();
    text(X1, Y1 + (PHONE ? 29 : 31), '가열 시간 (분)', { size: 13, weight: 800, color: COL.muted, align: 'right' });
    // 에탄올 · 물의 끓는점
    [[78, '에탄올 78', COL.eth], [100, '물 100', COL.water]].forEach(([T, lab, c]) => {
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = rgba(c, 0.8); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(X0, Y(T)); ctx.lineTo(X1, Y(T)); ctx.stroke(); ctx.restore();
      text(X1 - 2, Y(T) - 5, lab + ' °C', { size: 13, weight: 800, color: shade(c, -0.15), align: 'right' });
    });
    // 곡선 (시험관 색으로 구분)
    const S_ = DS.samples;
    if (S_.length > 1) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4.5;
      for (let i = 1; i < S_.length; i++) {
        const a = S_[i - 1], b = S_[i];
        ctx.strokeStyle = b.k >= 0 ? TUBE_COL[b.k] : '#94a3b8';
        ctx.beginPath(); ctx.moveTo(X(a.t), Y(a.T)); ctx.lineTo(X(b.t), Y(b.T)); ctx.stroke();
      }
      ctx.restore();
      const h = S_[S_.length - 1], hx = X(Math.min(XM, h.t)), hy = Y(DS.T);
      D.glow(hx, hy, 15, '#8b5cf6', 0.45); D.sphere(hx, hy, 5.6, '#8b5cf6', { gloss: true });
      pill(Math.min(hx + 6, X1 - 40), hy - 16, (Math.round(DS.T * 10) / 10).toFixed(1) + ' °C', { bg: '#5b21b6', size: 13, align: 'left', pad: 7 });
    } else text((X0 + X1) / 2, (Y0 + Y1) / 2, '🔥 가열하면 그려져요', { size: 14, weight: 800, color: '#a3adbd' });
    // 범례
    let lx = g.x + 12; const ly = g.y + (PHONE ? 40 : 46) - 8 + (PHONE ? -4 : 0);
    if (!PHONE) TUBE_NAME.forEach((n, i) => { circle(ctx, lx + 6, g.y + 44, 6); ctx.fillStyle = TUBE_COL[i]; ctx.fill(); text(lx + 16, g.y + 49, n, { size: 13, weight: 800, color: COL.ink, align: 'left' }); lx += 42; });
  }
  function dsDrawLens(t) {
    const g = dsLensGeom(), r = g.r, cell = g.cell;
    lensFrame(r, { title: PHONE ? '🔍 입자' : '🔍 플라스크 속 입자', top: '#fbfdff', bot: '#e9f2fd' }, () => {
      const n = DS.lp.length, rowsUsed = Math.max(1, Math.ceil(n / DS.lcols)), ys = g.yb - rowsUsed * cell + 2;
      if (n > 0) {
        const wg = ctx.createLinearGradient(0, ys, 0, g.yb); wg.addColorStop(0, 'rgba(165,205,250,.36)'); wg.addColorStop(1, 'rgba(140,185,245,.34)');
        ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(r.x, ys);
        for (let i = 0; i <= 20; i++) ctx.lineTo(r.x + (r.w * i) / 20, ys + Math.sin(t * (DS.boiling ? 6 : 2) + i * 0.9) * (DS.boiling ? 1.8 : 0.8));
        ctx.lineTo(r.x + r.w, g.yb + 12); ctx.lineTo(r.x, g.yb + 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x, ys); ctx.lineTo(r.x + r.w, ys); ctx.stroke();
      }
      DS.lp.forEach((p) => drawBall(ctx, p.type ? COL.eth : COL.water, p.x, p.y, cell * 0.42));
      DS.lf.forEach((f) => { ctx.globalAlpha = clamp(f.a, 0, 1); drawBall(ctx, f.type ? COL.eth : COL.water, f.x, f.y, cell * 0.38); ctx.globalAlpha = 1; });
      if (DS.boiling && !PHONE) text(r.x + r.w / 2, r.y + 52, '⬆ 증기가 냉각기로', { size: 13, weight: 800, color: '#7c3aed' });
      const ly = r.y + r.h - 18;
      drawBall(ctx, COL.eth, r.x + (PHONE ? 36 : 40), ly, 8); text(r.x + (PHONE ? 48 : 52), ly + 5, '에탄올', { size: 13.5, weight: 800, color: COL.ink, align: 'left' });
      drawBall(ctx, COL.water, r.x + (PHONE ? 118 : 130), ly, 8); text(r.x + (PHONE ? 130 : 142), ly + 5, '물', { size: 13.5, weight: 800, color: COL.ink, align: 'left' });
    });
  }
  function dsDraw(t) {
    panel(DL.app.x, DL.app.y, DL.app.w, DL.app.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    vgrad(ctx, DL.app.x, DL.app.y + DL.app.h * 0.6, DL.app.w, DL.app.h * 0.4, 'rgba(255,246,232,0)', 'rgba(255,240,222,.5)');
    DS.frame = withFrame({ x: DL.app.x, y: DL.app.y, w: DL.app.w, h: DL.app.h }, AG.w, AG.h, (sc) => {
      LSC = Math.min(1, sc);
      const cg = dsDrawApp(sc, t);
      dsDrawFlow(t); dsDrawTubes(t); dsDrawLabels(t, cg);
      // 돋보기 표시
      ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.6); ctx.lineWidth = 2.4; ctx.setLineDash([5, 4]); circle(ctx, AG.fl.x - 22, AG.fl.y + 24, 15); ctx.stroke(); ctx.restore(); text(AG.fl.x - 22, AG.fl.y + 30, '🔍', { size: 14 });
    }, -26);
    dsDrawGraph(t); dsDrawLens(t);
    if (isNew('distill')) ringRect(DL.app, t);
  }
  function dsTubeAt(p) {
    if (!DS.frame) return -1;
    const q = toLocal(p, DS.frame);
    for (let i = 0; i < 3; i++) { const x = DS.rack.x + i * AG.pitch; if (Math.abs(q.x - x) < AG.tubeW / 2 + 8 && q.y > AG.tubeTop - 14 && q.y < AG.tubeTop + AG.tubeLen + 62) return i; }
    return -1;
  }
  function dsRefresh() {
    const b = $('#dsHeat'); if (!b) return;
    b.textContent = DS.done ? '↺ 다시 하기' : DS.on ? '⏸ 멈추기' : DS.t > 0 ? '▶ 계속 가열하기' : '🔥 가열하기';
    b.classList.toggle('btn-primary', !DS.on);
    $$('#dsTube button').forEach((x) => x.classList.toggle('on', +x.dataset.t === DS.sel));
    $('#dsFast').setAttribute('aria-pressed', DS.fast ? 'true' : 'false');
    $('#dsNote').textContent = '에탄올 24 mL + 물 16 mL 혼합물을 일정한 세기로 가열해요. 1분이 약 1초로 빠르게 재생돼요.';
  }
  function dsToggle() {
    hideHint(); Sound.click();
    if (DS.done) { dsReset(); return; }
    DS.on = !DS.on; dsRefresh();
  }
  SC.distill = {
    label: '⚗️ 증류로 분리하기',
    hint: '🔥 가열하고, 온도를 보며 시험관을 바꿔요',
    enter(reset) { if (reset || !DS.tubes.length) dsReset(); else dsRefresh(); },
    update(dt) { dsStep(dt); dsLensUpdate(dt, now()); },
    draw(t) { dsDraw(t); },
    hover(p) { return dsTubeAt(p) >= 0 ? 'pointer' : null; },
    down(p) { const i = dsTubeAt(p); if (i >= 0) dsSelect(i); return false; },
    refresh() { dsRefresh(); },
    readouts() {
      $('#rDT').innerHTML = (Math.round(DS.T * 10) / 10).toFixed(1) + '<small>°C</small>';
      $('#rDV').innerHTML = (Math.round(DS.tubes.reduce((a, tb) => a + dsVol(tb), 0) * 10) / 10).toFixed(1) + '<small>mL</small>';
      $('#rDS').textContent = TUBE_NAME[DS.sel] + ' 시험관';
    },
  };
  $('#dsHeat').addEventListener('click', dsToggle);
  $('#dsFast').addEventListener('click', () => { Sound.click(); DS.fast = !DS.fast; dsRefresh(); });
  $$('#dsTube button').forEach((b) => b.addEventListener('click', () => dsSelect(+b.dataset.t)));

  Object.assign(DBG, { DS, dsReset, dsSelect, dsToggle, dsStep, AG, dsFrac, dsVol });


  /* =========================================================
     장면 ②: 분별 깔때기 — 밀도 차이로 물과 식용유 분리
       식용유(약 0.92 g/cm³)는 물(1.0 g/cm³)보다 밀도가 작아 위층에 뜨고, 꼭지를 열면 아래층(물)이 먼저 나와요.
     ========================================================= */
  const FL = PHONE ? {
    app: { x: 4, y: 4, w: 432, h: 408 }, dens: { x: 4, y: 420, w: 214, h: 196 }, got: { x: 226, y: 420, w: 210, h: 196 },
  } : {
    app: { x: 218, y: 16, w: 386, h: 528 }, dens: { x: 16, y: 16, w: 190, h: 528 }, got: { x: 616, y: 16, w: 168, h: 528 },
  };
  const FG = { w: 386, h: 528, cx: 208, top: 44, tip: 380, bench: 508, beaker: { x: 124, y: 400, w: 168, h: 108 } };
  /* 깔때기 모양: (높이 y → 반지름) 조절점을 부드럽게 이어서 만듦 */
  const FW = (() => {
    const pts = [[66, 11], [98, 12], [116, 40], [138, 60], [170, 66], [206, 56], [250, 31], [290, 9], [304, 8], [380, 7]];
    const arr = [];
    for (let y = 66; y <= 380; y++) {
      let i = 1; while (i < pts.length - 1 && y > pts[i][0]) i++;
      const a = pts[i - 1], b = pts[i], k = (y - a[0]) / (b[0] - a[0]);
      arr.push(a[1] + (b[1] - a[1]) * k);
    }
    for (let pass = 0; pass < 3; pass++) for (let i = 1; i < arr.length - 1; i++) arr[i] = (arr[i - 1] + arr[i] + arr[i + 1]) / 3;
    return arr;
  })();
  const fw = (y) => FW[clamp(Math.round(y) - 66, 0, FW.length - 1)];
  const FCUM = [];                                           // 아래(꼭지)에서 위로 쌓은 부피 (px³)
  { let acc = 0; for (let y = 380; y >= 66; y--) { acc += Math.PI * fw(y) * fw(y); FCUM[y - 66] = acc; } }
  const FSCALE = 100 / FCUM[128 - 66];                      // 100 mL가 들어가는 높이 = y 128
  const fvol = (y) => FCUM[clamp(Math.round(y), 66, 380) - 66] * FSCALE;
  function fyOf(v) {                                         // 부피 → 높이
    let lo = 66, hi = 380;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (fvol(mid) > v) lo = mid; else hi = mid; }
    return hi;
  }
  const FN = {
    Vw: 60, Vod: 40, Vol: 0, N0: 64, drops: [], shake: 0, shakeT: -9, cock: false, cockA: 0, bw: 0, bo: 0, bwLvl: 0, boLvl: 0,
    flow: 0, flowCol: COL.water, rain: [], splash: [], ping: -9, warn: 0, t: 0, leaked: false, frame: null, ringT: 0,
  };
  function fnShakeMix() {
    FN.Vod += FN.Vol; FN.Vol = 0;
    const need = Math.round(FN.N0 * FN.Vod / 40), top = fyOf(FN.Vw + FN.Vod + FN.Vol);
    FN.drops = [];
    for (let i = 0; i < need; i++) { const y = rand(top + 6, 372); FN.drops.push({ y, x: rand(-0.85, 0.85), vy: -rand(26, 62), r: rand(2.2, 5.2), ph: rand(0, TAU), w: rand(0.7, 1.3) }); }
    FN.shakeT = now();
  }
  function fnReset(first) {
    Object.assign(FN, { Vw: 60, Vod: 40, Vol: 0, cock: false, cockA: 0, bw: 0, bo: 0, bwLvl: 0, boLvl: 0, flow: 0, rain: [], splash: [], ping: -9, warn: 0, leaked: false, shake: 0 });
    FN.drops = []; fnShakeMix();
    if (!first) Sound.tone(300, 0.15, 'sine', 0.05);
    fnRefresh();
  }
  const fnTotal = () => FN.Vw + FN.Vod + FN.Vol;
  const fnLower = () => FN.Vw + FN.Vod;                    // 경계선 아래 액체 (물 + 퍼져 있는 식용유 방울)
  const fnSeparated = () => FN.Vod < 0.8;
  function fnUpdate(dt) {
    FN.t += dt;
    const shaking = now() - FN.shakeT < 1.1;
    FN.shake = SciSim.approach(FN.shake, shaking ? 1 : 0, dt, 12);
    // 식용유 방울이 위로 떠올라 위층에 합쳐짐
    const bd = fyOf(fnLower()), per = 40 / FN.N0;
    for (let i = FN.drops.length - 1; i >= 0; i--) {
      const d = FN.drops[i];
      d.y += (shaking ? rand(-90, 90) * dt * 3 : d.vy * dt * d.w) ; d.ph += dt * 3;
      if (!shaking && d.y <= bd + 2) { FN.drops.splice(i, 1); const mv = Math.min(per, FN.Vod); FN.Vod -= mv; FN.Vol += mv; }
      else if (d.y > 374) d.y = 374;
    }
    if (FN.Vod > 0.05 && !FN.drops.length && !shaking) { FN.Vol += FN.Vod; FN.Vod = 0; }
    // 꼭지
    FN.cockA = SciSim.approach(FN.cockA, FN.cock ? 1 : 0, dt, 14);
    let out = 0, outO = 0, outW = 0;
    if (FN.cock) {
      const lower = fnLower();
      if (lower > 0.05) {
        out = Math.min(lower, 12 * clamp(lower / 9, 0.16, 1) * dt);
        const wf = FN.Vw / lower; outW = out * wf; outO = out - outW;
        FN.Vw -= outW; const dd = Math.min(FN.Vod, outO); FN.Vod -= dd; outO = dd;
        const keep = FN.drops.length; const want = Math.round(FN.N0 * FN.Vod / 40); while (FN.drops.length > want) FN.drops.pop();
      } else if (FN.Vol > 0.02) { out = Math.min(FN.Vol, 9 * dt); FN.Vol -= out; outO = out; }
    }
    FN.bw += outW; FN.bo += outO;
    if (outO > 0.01 && !FN.leaked && FN.bo > 0.8) { FN.leaked = true; FN.ping = now(); Sound.fail(); }
    const col = out > 0 ? (outO > outW ? COL.oil : mix(COL.water, COL.oil, clamp(outO / Math.max(out, 1e-6), 0, 1))) : null;
    FN.flow = SciSim.approach(FN.flow, out > 0 ? 1 : 0, dt, 18);
    if (col) FN.flowCol = col;
    FN.bwLvl = SciSim.approach(FN.bwLvl, FN.bw, dt, 10); FN.boLvl = SciSim.approach(FN.boLvl, FN.bo, dt, 10);
    // 곧 식용유가 나옴 경고
    FN.warn = FN.cock && fnLower() < 7 && fnLower() > 0.05 && FN.Vol > 1 ? 1 : 0;
    if (out > 0 && !RM && Math.random() < dt * 22) FN.splash.push({ t: 0, x: rand(-14, 14) });
    for (let i = FN.splash.length - 1; i >= 0; i--) { FN.splash[i].t += dt; if (FN.splash[i].t > 0.5) FN.splash.splice(i, 1); }
  }
  function fnDrawFunnel(sc, t) {
    const cx = FG.cx, shakeAng = Math.sin(t * 26) * 0.1 * FN.shake, piv = { x: cx, y: 210 };
    const lowerV = fnLower(), totalV = fnTotal();
    const yTop = fyOf(totalV), yBd = fyOf(lowerV);
    const rot = () => { ctx.translate(piv.x, piv.y); ctx.rotate(shakeAng); ctx.translate(-piv.x, -piv.y); };
    const outline = () => {
      ctx.beginPath();
      for (let y = 66; y <= 380; y += 2) ctx.lineTo(cx - fw(y), y);
      for (let y = 380; y >= 66; y -= 2) ctx.lineTo(cx + fw(y), y);
      ctx.closePath();
    };
    // 링 스탠드
    const rg = ctx.createLinearGradient(54, 0, 66, 0); rg.addColorStop(0, '#b6bfcd'); rg.addColorStop(1, '#6b7689');
    ctx.fillStyle = rg; ctx.fillRect(54, 110, 10, FG.bench - 110); ctx.fillStyle = '#6b7689'; D.roundRect(22, FG.bench - 8, 84, 10, 3); ctx.fill();
    ctx.strokeStyle = '#7d889b'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(64, 252); ctx.lineTo(cx - 30, 252); ctx.stroke();
    ctx.fillStyle = '#4b5567'; D.roundRect(48, 244, 22, 18, 4); ctx.fill();
    // 깔때기 (유리 + 액체)
    ctx.save(); ctx.save(); rot(); outline(); ctx.restore(); ctx.clip();
    const gb = ctx.createLinearGradient(cx - 70, 0, cx + 70, 0);
    gb.addColorStop(0, 'rgba(176,200,232,.5)'); gb.addColorStop(0.2, 'rgba(228,241,255,.22)'); gb.addColorStop(0.8, 'rgba(228,241,255,.18)'); gb.addColorStop(1, 'rgba(170,196,230,.5)');
    ctx.fillStyle = gb; ctx.fillRect(cx - 80, 60, 160, 330);
    const wob = (s) => Math.sin(t * 9 + s) * 3 * FN.shake;
    if (totalV > 0.1) {
      // 물 (아래) + 퍼져 있는 식용유 방울이 만드는 뿌연 기운
      const haze = clamp(FN.Vod / 40, 0, 1);
      const wg = ctx.createLinearGradient(0, yBd, 0, 380); wg.addColorStop(0, rgba('#6fb4f7', 0.62)); wg.addColorStop(1, rgba('#4f9cf5', 0.8));
      ctx.fillStyle = wg; ctx.fillRect(cx - 80, yBd + wob(1), 160, 390 - yBd);
      if (haze > 0.02) { ctx.fillStyle = rgba('#ffe27a', 0.42 * haze); ctx.fillRect(cx - 80, yBd + wob(1), 160, 390 - yBd); }
      // 식용유 (위층)
      if (yBd - yTop > 0.5) {
        const og = ctx.createLinearGradient(0, yTop, 0, yBd); og.addColorStop(0, rgba('#ffe27a', 0.92)); og.addColorStop(1, rgba('#f2c230', 0.95));
        ctx.fillStyle = og; ctx.fillRect(cx - 80, yTop + wob(0), 160, yBd - yTop + 1);
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(cx - 80, yTop + wob(0), 160, 2.6);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(cx - 80, yBd - 1.5 + wob(1), 160, 3);      // 두 액체의 경계
      } else if (Math.abs(yBd - yTop) < 0.5) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(cx - 80, yTop, 160, 2.6); }
      // 방울
      FN.drops.forEach((d) => {
        const x = cx + d.x * fw(d.y) * 0.85 + Math.sin(d.ph) * 2.2;
        ctx.fillStyle = 'rgba(255,214,70,.88)'; circle(ctx, x, d.y, d.r); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; circle(ctx, x - d.r * 0.3, d.y - d.r * 0.35, d.r * 0.35); ctx.fill();
      });
    }
    ctx.restore();
    ctx.save(); rot();
    outline(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(cx - 52, 140); ctx.quadraticCurveTo(cx - 58, 180, cx - 40, 230); ctx.stroke();
    // 마개
    ctx.fillStyle = '#b0734a'; ctx.beginPath(); ctx.moveTo(cx - 16, 46); ctx.lineTo(cx + 16, 46); ctx.lineTo(cx + 12, 70); ctx.lineTo(cx - 12, 70); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(cx - 12, 49, 5, 17);
    // 꼭지 (스톱콕)
    const cy = 316, ang = -FN.cockA * Math.PI / 2;
    ctx.fillStyle = '#9aa5b6'; D.roundRect(cx - 17, cy - 7, 34, 14, 6); ctx.fill(); ctx.strokeStyle = '#6b7689'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = FN.cock ? '#16a34a' : '#e2464b'; D.roundRect(-3, -4, 32, 8, 4); ctx.fill(); ctx.restore();
    ctx.restore();
    // 가운데 눈금: 식용유 / 물 이름표
    if (yBd - yTop > 22) pill(cx + 4, (yTop + yBd) / 2, '식용유', { bg: 'rgba(160,110,0,.85)', size: 13 / LSC, pad: 8 });
    if (380 - yBd > 30 && fnSeparated()) pill(cx, Math.min(yBd + 38, 300), '물', { bg: 'rgba(30,90,200,.85)', size: 13 / LSC, pad: 9 });
    return { yTop, yBd };
  }
  function fnDrawBeaker(t) {
    const B = FG.beaker, x = B.x, y = B.y, w = B.w, h = B.h, cx = FG.cx;
    groundShadow(x + w / 2, y + h + 3, w * 0.6, 7, 1);
    // 흘러내리는 액체 줄기
    if (FN.flow > 0.03) {
      const top = FG.tip, bot = y + h - 8 - Math.min(h - 10, (FN.bwLvl + FN.boLvl) * 0.9) - 2;
      ctx.save(); ctx.globalAlpha = Math.min(1, FN.flow * 1.2); ctx.fillStyle = withA(FN.flowCol, 0.9); ctx.fillRect(cx - 2.6, top, 5.2, Math.max(2, bot - top));
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(cx - 1.6, top, 1.3, Math.max(2, bot - top)); ctx.restore();
      FN.splash.forEach((s) => { const k = s.t / 0.5; ctx.strokeStyle = rgba('#ffffff', 0.7 * (1 - k)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(cx + s.x * k, bot, 6 + k * 14, 1.6 + k * 2.2, 0, 0, TAU); ctx.stroke(); });
    }
    const lvW = Math.min(h - 10, FN.bwLvl * 0.9), lvO = Math.min(h - 10 - lvW, FN.boLvl * 0.9);
    glassBeaker(x, y, w, h, {
      level: lvW / (h - 4), liquid: '#4f9cf5', alpha: 0.72, t, wave: FN.flow * 1.4 + 0.5, ticks: 5,
      inner(g) {
        if (lvO > 0.4) { const yo = g.ly - lvO; const og = ctx.createLinearGradient(0, yo, 0, g.ly); og.addColorStop(0, rgba('#ffe27a', 0.9)); og.addColorStop(1, rgba('#f2c230', 0.95)); ctx.fillStyle = og; ctx.fillRect(g.x, yo, g.w, lvO + 1); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(g.x, yo, g.w, 2); }
      },
    });
  }
  function fnDrawApp(sc, t) {
    LSC = Math.min(1, sc);
    // 실험대
    ctx.save(); vgrad(ctx, 12, FG.bench, FG.w - 24, 12, '#e8c796', '#cfa56d'); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(12, FG.bench, FG.w - 24, 2); ctx.restore();
    const info = fnDrawFunnel(sc, t);
    fnDrawBeaker(t);
    // 경고 · 알림
    if (FN.warn && Math.sin(t * 9) > -0.3) { D.label(FG.cx + 96, 318, '⚠ 곧 식용유가 나와요!', { bg: COL.bad, size: 14 / LSC, pad: 10 }); }
    const age = t - FN.ping;
    if (age < 3) { ctx.save(); ctx.globalAlpha = age > 2.4 ? 1 - (age - 2.4) / 0.6 : 1; D.label(FG.cx + 98, 350, '식용유가 섞였어요!', { bg: COL.bad, size: 14 / LSC, pad: 10 }); ctx.restore(); }
    // 안내 문구
    let msg = '';
    if (FN.shake > 0.3) msg = '🫙 흔드는 중…';
    else if (!fnSeparated()) msg = '⏳ 가만히 두면 층이 나뉘어요';
    else if (!FN.cock && FN.bw < 1) msg = '✅ 층이 나뉘었어요. 꼭지를 열어요!';
    else if (FN.cock) msg = '🚰 아래층(물)이 내려가는 중';
    if (msg) D.label(FG.cx + 6, 24, msg, { bg: '#1b2333', size: 14 / LSC, pad: 11 });
  }
  function fnDrawDensity() {
    const R = FL.dens;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(R.x + 14, R.y + 30, '⚖️ 밀도 (g/cm³)', { size: 15.5, weight: 800, color: COL.ink, align: 'left' });
    const rows = [['식용유', 0.92, '#f2c230', '약 0.92'], ['물', 1.0, '#4f9cf5', '1.0']];
    const bw = R.w - 28, y0 = R.y + (PHONE ? 52 : 62);
    rows.forEach((r, i) => {
      const y = y0 + i * (PHONE ? 52 : 62);
      text(R.x + 14, y, r[0], { size: 14.5, weight: 800, color: COL.ink, align: 'left' });
      text(R.x + R.w - 14, y, r[3], { size: 14.5, weight: 800, color: shade(r[2], -0.3), align: 'right' });
      ctx.fillStyle = '#eef2f8'; D.roundRect(R.x + 14, y + 8, bw, 14, 7); ctx.fill();
      ctx.fillStyle = r[2]; D.roundRect(R.x + 14, y + 8, bw * r[1] / 1.1, 14, 7); ctx.fill();
    });
    // 결론: 밀도가 작은 것이 위
    const y1 = R.y + (PHONE ? 160 : 210);
    const bx = R.x + R.w / 2, bw2 = Math.min(96, R.w - 60);
    if (!PHONE) {
      ctx.save(); ctx.fillStyle = rgba('#f2c230', 0.85); D.roundRect(bx - bw2 / 2, y1, bw2, 38, 8); ctx.fill(); ctx.fillStyle = rgba('#4f9cf5', 0.85); D.roundRect(bx - bw2 / 2, y1 + 40, bw2, 56, 8); ctx.fill(); ctx.restore();
      text(bx, y1 + 24, '식용유', { size: 13, weight: 800, color: '#6b4a00' }); text(bx, y1 + 74, '물', { size: 14, weight: 800, color: '#fff' });
      D.arrow(R.x + 24, y1 + 76, R.x + 24, y1 + 100, { color: COL.sub, width: 3.5, head: 11 });
      D.arrow(R.x + R.w - 24, y1 + 34, R.x + R.w - 24, y1 + 4, { color: COL.sub, width: 3.5, head: 11 });
      wrapText('밀도가 작은 물질은 위로 뜨고, 큰 물질은 아래로 가라앉아요.', R.w - 28, 14, 700).forEach((l, i) => text(R.x + 14, y1 + 126 + i * 21, l, { size: 14, weight: 700, color: COL.muted, align: 'left' }));
    } else {
      wrapText('밀도가 작으면 위로 뜨고, 크면 아래로 가라앉아요.', R.w - 24, 14, 700).forEach((l, i) => text(R.x + 12, y1 + i * 21, l, { size: 14, weight: 700, color: COL.muted, align: 'left' }));
    }
  }
  function fnDrawGot() {
    const R = FL.got;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(R.x + 14, R.y + 30, '🥛 받은 액체', { size: 15.5, weight: 800, color: COL.ink, align: 'left' });
    const bars = [['물', FN.bw, '#4f9cf5'], ['식용유', FN.bo, '#f2c230']], y0 = R.y + (PHONE ? 56 : 66);
    bars.forEach((b, i) => {
      const y = y0 + i * (PHONE ? 50 : 62);
      text(R.x + 14, y, b[0], { size: 14.5, weight: 800, color: COL.ink, align: 'left' });
      text(R.x + R.w - 14, y, (Math.round(b[1] * 10) / 10).toFixed(1) + ' mL', { size: 14.5, weight: 800, color: shade(b[2], -0.3), align: 'right' });
      ctx.fillStyle = '#eef2f8'; D.roundRect(R.x + 14, y + 8, R.w - 28, 14, 7); ctx.fill();
      ctx.fillStyle = b[2]; D.roundRect(R.x + 14, y + 8, Math.max(0, (R.w - 28) * Math.min(1, b[1] / 60)), 14, 7); ctx.fill();
    });
    let verdict = '꼭지를 열어 아래층(물)을 받아요.', col = COL.muted;
    if (FN.bo > 0.8) { verdict = '❌ 식용유가 섞였어요. ↺ 다시 해 보세요.'; col = '#b4232b'; }
    else if (FN.bw >= 50 && !FN.cock) { verdict = '✅ 물만 받았어요!'; col = '#0b6b39'; }
    else if (FN.bw > 1) verdict = '🚰 물을 받는 중…';
    wrapText(verdict, R.w - 24, PHONE ? 14 : 14.5, 800).forEach((l, i) => text(R.x + 14, R.y + (PHONE ? 150 : 230) + i * 21, l, { size: PHONE ? 14 : 14.5, weight: 800, color: col, align: 'left' }));
    if (!PHONE) {
      ctx.fillStyle = '#f3efff'; D.roundRect(R.x + 10, R.y + 318, R.w - 20, 118, 12); ctx.fill();
      text(R.x + 20, R.y + 342, '💡 알아 두기', { size: 14, weight: 800, color: COL.sub, align: 'left' });
      wrapText('밀도가 큰 물이 아래층이라서 꼭지를 열면 물이 먼저 나와요. 식용유가 나오기 전에 닫아요!', R.w - 40, 13.5, 700).forEach((l, i) => text(R.x + 20, R.y + 366 + i * 20, l, { size: 13.5, weight: 700, color: COL.ink, align: 'left' }));
    }
  }
  function fnDraw(t) {
    panel(FL.app.x, FL.app.y, FL.app.w, FL.app.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    FN.frame = withFrame(FL.app, FG.w, FG.h, (sc) => fnDrawApp(sc, t));
    fnDrawDensity(); fnDrawGot();
    if (isNew('funnel')) ringRect(FL.app, t);
  }
  function fnToggleCock() {
    hideHint(); Sound.click();
    if (FN.shake > 0.3) return;
    FN.cock = !FN.cock; fnRefresh();
    if (FN.cock) { if (!fnSeparated()) toast('아직 층이 나뉘지 않았어요. 조금 기다려 보세요.', null, 2200); }
  }
  function fnRefresh() {
    const b = $('#fnCock'); if (!b) return;
    b.textContent = FN.cock ? '🔒 꼭지 닫기' : '🚰 꼭지 열기'; b.classList.toggle('btn-primary', !FN.cock);
    $('#fnNote').textContent = '물과 식용유를 흔들어 섞은 뒤, 가만히 두어 층이 나뉘면 꼭지를 열어 아래층만 받아요.';
  }
  SC.funnel = {
    label: '🫙 분별 깔때기로 분리하기',
    hint: '⏳ 층이 나뉘면 꼭지를 열어 물만 받아요',
    enter(reset) { if (reset || !FN.drops) fnReset(true); else fnRefresh(); },
    update(dt) { fnUpdate(dt); },
    draw(t) { fnDraw(t); },
    hover(p) { if (!FN.frame) return null; const q = toLocal(p, FN.frame); return Math.abs(q.x - FG.cx) < 30 && Math.abs(q.y - 316) < 24 ? 'pointer' : null; },
    down(p) { if (!FN.frame) return false; const q = toLocal(p, FN.frame); if (Math.abs(q.x - FG.cx) < 30 && Math.abs(q.y - 316) < 24) fnToggleCock(); return false; },
    refresh() { fnRefresh(); },
    readouts() {
      $('#rFW').innerHTML = (Math.round(FN.Vw * 10) / 10).toFixed(1) + '<small>mL</small>';
      $('#rFO').innerHTML = (Math.round((FN.Vod + FN.Vol) * 10) / 10).toFixed(1) + '<small>mL</small>';
      $('#rFS').textContent = FN.shake > 0.3 ? '흔드는 중' : !fnSeparated() ? '섞여 있음' : '두 층으로 나뉨';
    },
  };
  $('#fnShake').addEventListener('click', () => { hideHint(); Sound.click(); if (FN.cock) return; if (FN.bw > 0.5 || FN.bo > 0.5) { toast('이미 받은 액체가 있어요. ↺ 처음으로 돌아가서 다시 해요.', null, 2400); return; } fnShakeMix(); Sound.tone(220, 0.5, 'triangle', 0.04); });
  $('#fnCock').addEventListener('click', fnToggleCock);
  Object.assign(DBG, { FN, fnReset, fnToggleCock, fnShakeMix, fnUpdate, FG, fnSeparated, fnLower });


  /* =========================================================
     장면 ③: 재결정 — 용해도 차이로 질산 칼륨만 결정으로 얻기
       질산 칼륨 100 g + 염화 나트륨 5 g을 물 100 g에 녹였다가 식히면, 용해도가 크게 줄어드는 질산 칼륨만 결정이 돼요.
       (자료: g/물 100 g — 질산 칼륨 0 °C 13.3 · 20 °C 31.6 · 40 °C 63.9 · 60 °C 110 · 80 °C 169 / 염화 나트륨 35.7 · 35.9 · 36.4 · 37.1 · 38.0)
     ========================================================= */
  const SOL = { T: [0, 20, 40, 60, 80], kno3: [13.3, 31.6, 63.9, 110, 169], nacl: [35.7, 35.9, 36.4, 37.1, 38.0] };
  const solAt = (arr, T) => {
    T = clamp(T, 0, 80); const i = Math.min(3, Math.floor(T / 20)), k = (T - SOL.T[i]) / 20;
    return arr[i] + (arr[i + 1] - arr[i]) * k;
  };
  const sK = (T) => solAt(SOL.kno3, T), sN = (T) => solAt(SOL.nacl, T);
  const KNO3_G = 100, NACL_G = 5, UNIT = 1.2;
  const RL2 = PHONE ? {
    app: { x: 4, y: 4, w: 432, h: 396 }, chart: { x: 4, y: 408, w: 432, h: 208 }, res: null, info: null,
  } : {
    app: { x: 16, y: 16, w: 384, h: 420 }, chart: { x: 414, y: 16, w: 370, h: 296 }, res: { x: 414, y: 324, w: 370, h: 220 }, info: { x: 16, y: 446, w: 384, h: 98 },
  };
  const RG = { w: 384, h: 528, bench: 500, bkx: 128, W: 132, H: 132, rest: 408, bath: 468, fx: 304, lipX: 308, lipY: 268 };
  const RC = {
    phase: 'ready', T: 20, tgt: 20, paper: 0, bath: 0, lamp: 0, fp: 0, filtV: 0, poured: 0, lv: 1, cr: [], slots: [], falls: [], paperCr: [], ions: [],
    cool: 0, ping: -9, frame: null, drips: [], dripT: 0, stream: 0, thermo: 1, kept: 0, filtered: false, keptG: 0, addT: 0, ice: [],
  };
  // 쌓이는 자리: 가운데부터 둥글게
  (function () {
    const rows = [];
    for (let r = 0; r < 16; r++) { const half = 62 - r * 3.8, n = Math.max(1, Math.floor(half * 2 / 7.2)); for (let i = 0; i < n; i++) rows.push({ x: (i - (n - 1) / 2) * 7.2 + rand(-1.4, 1.4), y: -r * 5.6 - 4 + rand(-1, 1), r }); }
    RC.slots = rows;
  })();
  const rcCount = () => RC.cr.filter((c) => c.st !== 'gone').length;
  const rcSolid = () => (RC.phase === 'ready' ? 0 : Math.max(0, KNO3_G - sK(RC.T)));
  function rcReset() {
    Object.assign(RC, { phase: 'ready', T: 20, tgt: 20, paper: 0, bath: 0, lamp: 0, fp: 0, filtV: 0, poured: 0, lv: 1, cr: [], falls: [], paperCr: [], drips: [], stream: 0, thermo: 1, filtered: false, keptG: 0, ping: -9, addT: 0 });
    RC.ions = []; for (let i = 0; i < 9; i++) RC.ions.push({ u: Math.random(), v: Math.random(), ph: rand(0, TAU), w: rand(0.5, 1.2) });
    RC.ice = []; for (let i = 0; i < 9; i++) RC.ice.push({ x: rand(-84, 84), y: rand(0, 1), r: rand(9, 14), ph: rand(0, TAU), rot: rand(-0.4, 0.4) });
    $('#rcTemp').value = 20; $('#rcTemp').dispatchEvent(new Event('input'));
    rcRefresh();
  }
  function rcAssignSlot() { const used = new Set(RC.cr.filter((c) => c.st !== 'gone').map((c) => c.slot)); let i = 0; while (used.has(i) && i < RC.slots.length - 1) i++; return i; }
  function rcBeakerBox() {
    return { x: RG.bkx - RG.W / 2 + 6, y0: 0, w: RG.W - 12 };
  }
  /* 비커의 자세: 평소 위치 → 거름 장치 위로 이동 → 기울이기 */
  function rcPose() {
    const k1 = smooth(seg(RC.fp, 0, 0.16)), k2 = smooth(seg(RC.fp, 0.16, 0.42)), back = smooth(seg(RC.fp, 0.8, 0.97));
    const by0 = lerp(RG.rest, RG.bath, RC.bath), mv = k1 * (1 - back);
    const bx = lerp(RG.bkx, RG.lipX - RG.W / 2, mv), by = lerp(by0, RG.lipY + RG.H, mv);
    const th = 1.18 * k2 * (1 - back);
    return { bx, by, th, lx: bx + RG.W / 2, ly: by - RG.H, mv };
  }
  const rcToWorld = (P, x, y) => { const dx = x - RG.W, dy = y + RG.H, c = Math.cos(P.th), s = Math.sin(P.th); return { x: P.lx + dx * c - dy * s, y: P.ly + dx * s + dy * c }; };
  function rcAreaBelow(P, ys, fill) {                          // 비커 안쪽 사각형에서 수면(ys) 아래 넓이
    const top = -RG.H * fill;
    const poly = [[3, top], [RG.W - 3, top], [RG.W - 3, -2], [3, -2]].map((p) => { const w = rcToWorld(P, p[0], p[1]); return [w.x, w.y]; });
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ia = a[1] >= ys, ib = b[1] >= ys;
      if (ia) out.push(a);
      if (ia !== ib) { const k = (ys - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * k, ys]); }
    }
    let A = 0; for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; A += a[0] * b[1] - b[0] * a[1]; }
    return Math.abs(A) / 2;
  }
  const rcSurfaceY = (P, A) => { let lo = P.ly - RG.W - 40, hi = P.by + 4; for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (rcAreaBelow(P, mid, 0.9) > A) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  const RC_FILL = 0.72;
  function rcUpdate(dt) {
    const t = now();
    RC.lamp = SciSim.approach(RC.lamp, RC.phase === 'heating' ? 1 : 0, dt, 5);
    RC.bath = SciSim.approach(RC.bath, RC.phase === 'cooling' || RC.phase === 'cool' || RC.phase === 'filtering' || RC.phase === 'done' ? 1 : 0, dt, RC.phase === 'filtering' ? 0.01 : 4);
    if (RC.phase === 'filtering' || RC.phase === 'done') RC.bath = 1;
    if (RC.phase === 'adding') {
      RC.addT += dt;
      if (RC.addT > 0.55 && RC.addT < 1.6 && Math.random() < dt * 60) RC.falls.push({ kind: 'pow', x: RG.bkx - 30 + rand(-6, 6), y: 262, vy: 60, vx: rand(10, 40), a: 1 });
      if (RC.addT >= 2.2) { RC.phase = 'heating'; Sound.tone(500, 0.1, 'triangle', 0.05); rcRefresh(); }
    }
    if (RC.phase === 'heating') {
      RC.T = Math.min(60, RC.T + 11 * dt);
      if (RC.T >= 60) { RC.phase = 'hot'; RC.ping = t; Sound.success(); rcRefresh(); }
    }
    if (RC.phase === 'cooling') {
      RC.T = Math.max(RC.tgt, RC.T - 13 * dt);
      if (RC.T <= RC.tgt + 1e-6) { RC.phase = 'cool'; RC.ping = t; rcRefresh(); }
    }
    // 결정 수를 용해도에 맞추기
    if (RC.phase !== 'ready' && RC.phase !== 'filtering' && RC.phase !== 'done') {
      const target = Math.round(rcSolid() / UNIT);
      let cnt = rcCount();
      while (cnt < target && (RC.phase !== 'adding')) { const cur = RC.addT; RC.cr.push({ st: 'float', slot: rcAssignSlot(), t0: t, x0: rand(-52, 52), y0: rand(-RG.H * RC_FILL + 12, -50), rot: rand(0, TAU), s: 0, sz: rand(0.85, 1.15), fall: rand(1.1, 1.9) }); cnt++; }
      while (cnt > target) {
        let best = null; RC.cr.forEach((c) => { if (c.st !== 'gone' && (!best || c.slot > best.slot)) best = c; });
        if (!best) break; best.st = 'melt'; best.mt = t; cnt--; best.slot = -1;
      }
    }
    if (RC.phase === 'adding') {                               // 가루가 물에 떨어지면 바닥에 쌓임
      const target = Math.round((KNO3_G - sK(20)) / UNIT * clamp((RC.addT - 0.7) / 1.1, 0, 1));
      while (rcCount() < target) RC.cr.push({ st: 'float', slot: rcAssignSlot(), t0: now(), x0: rand(-30, 6), y0: -RG.H * RC_FILL + 6, rot: rand(0, TAU), s: 1, sz: rand(0.85, 1.15), fall: rand(0.6, 1.1) });
    }
    RC.cr.forEach((c) => { if (c.st === 'melt' && t - c.mt > 0.7) c.st = 'gone'; });
    RC.cr = RC.cr.filter((c) => c.st !== 'gone');
    // 거르기
    if (RC.phase === 'filtering') {
      RC.fp = Math.min(1, RC.fp + dt / 7.5);
      const P = rcPose(), A0 = RG.W * RG.H * RC_FILL * 0.92;
      const Alq = A0 * RC.lv, Amax = rcAreaBelow(P, P.ly, 0.9);
      let spill = 0;
      if (P.th > 0.2 && Alq > Amax) { spill = Math.max(Alq - Amax, 0) * Math.min(1, dt * 5); spill = Math.max(spill, P.th > 0.9 ? A0 * 0.012 : 0); spill = Math.min(spill, Alq - A0 * 0.015); }
      if (P.th > 0.9 && RC.lv < 0.035) spill = Math.max(0, Alq - A0 * 0.015);
      RC.lv = Math.max(0.015, RC.lv - spill / A0);
      RC.poured = (1 - (RC.lv - 0.015) / (1 - 0.015)) * 100;
      RC.stream = SciSim.approach(RC.stream, spill > 0.01 ? 1 : 0, dt, 12);
      // 결정이 미끄러져 거름종이로
      if (P.th > 0.45) {
        const n = RC.cr.filter((c) => c.st === 'float' || c.st === 'set').length;
        if (n > 0 && Math.random() < dt * Math.min(60, n * 1.1 + 6)) {
          let best = null; RC.cr.forEach((c) => { if ((c.st === 'float' || c.st === 'set') && (!best || c.slot > best.slot)) best = c; });
          if (best) { const q = RC.slots[Math.max(0, best.slot)] || RC.slots[0], w = rcToWorld(P, RG.W / 2 + q.x, -2 + q.y); best.st = 'slide'; best.mt = t; best.sx = w.x; best.sy = w.y; }
        }
      }
      for (let i = 0; i < RC.cr.length; i++) {
        const c = RC.cr[i];
        if (c.st === 'slide') {
          const k = (t - c.mt) / 0.45;
          if (k >= 1) { c.st = 'fall'; c.mt = t; c.fx = RG.lipX + rand(-6, 4); c.fy = RG.lipY + 4; c.fvx = rand(-8, 12); c.fvy = 40; }
        } else if (c.st === 'fall') {
          c.fvy += 520 * dt; c.fy += c.fvy * dt; c.fx += c.fvx * dt;
          if (c.fy >= 346 - Math.min(18, RC.paperCr.length * 0.22)) { c.st = 'gone'; RC.paperCr.push({ x: rand(-17, 17), y: 0, rot: c.rot, sz: c.sz, k: 0 }); }
        }
      }
      RC.cr = RC.cr.filter((c) => c.st !== 'gone');
      // 거른 용액이 아래 플라스크로
      const target = RC.poured; RC.filtV += (target - RC.filtV) * Math.min(1, dt * 1.6);
      RC.dripT += dt; if (RC.filtV < target - 1 && RC.dripT > 0.07) { RC.dripT = 0; RC.drips.push({ y: 396, vy: 30 }); }
      if (RC.fp >= 1 && RC.filtV > target - 1.2) {
        RC.phase = 'done'; RC.filtered = true; RC.keptG = Math.max(0, KNO3_G - sK(RC.T)); RC.ping = t;
        if (RC.keptG >= 60) { Sound.success(); } rcRefresh();
      }
    }
    for (let i = RC.drips.length - 1; i >= 0; i--) { const d = RC.drips[i]; d.vy += 700 * dt; d.y += d.vy * dt; if (d.y > 452) RC.drips.splice(i, 1); }
    RC.paperCr.forEach((c) => { c.k = Math.min(1, c.k + dt * 5); });
    RC.thermo = SciSim.approach(RC.thermo, RC.phase === 'filtering' || RC.phase === 'done' ? 0 : 1, dt, 6);
    // 가루가 하늘에서 떨어짐
    for (let i = RC.falls.length - 1; i >= 0; i--) { const f = RC.falls[i]; f.vy += 520 * dt; f.y += f.vy * dt; f.x += f.vx * dt * 0.2; if (f.y > RG.rest - 40) RC.falls.splice(i, 1); }
  }
  /* ---- 그리기 ---- */
  function rcDrawCrystal(x, y, s, rot, a) {
    if (s <= 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); if (a != null) ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(-6, -6, 6, 6); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d9ccff');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6.5, 1); ctx.lineTo(-2, -6); ctx.lineTo(5.5, -3.5); ctx.lineTo(6.5, 2.5); ctx.lineTo(0, 6.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(124,58,237,.65)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(124,58,237,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(0, 0); ctx.lineTo(6.5, 2.5); ctx.moveTo(0, 0); ctx.lineTo(-6.5, 1); ctx.stroke();
    ctx.restore();
  }
  function rcDrawBeaker(t) {
    const P = rcPose(), W = RG.W, H = RG.H, t0 = now(), A0 = W * H * RC_FILL * 0.92;
    const bodyPath = () => {
      ctx.beginPath(); ctx.moveTo(3, -H); ctx.lineTo(3, -12); ctx.quadraticCurveTo(3, -2, 15, -2); ctx.lineTo(W - 15, -2); ctx.quadraticCurveTo(W - 3, -2, W - 3, -12); ctx.lineTo(W - 3, -H); ctx.closePath();
    };
    const tf = () => { ctx.translate(P.lx, P.ly); ctx.rotate(P.th); ctx.translate(-W, H); };      // 원점 = 비커 왼쪽 아래
    groundShadow(P.bx, P.by + 4, W * 0.62 * (1 - P.mv * 0.4), 7, 1 - P.mv * 0.5);
    const Alq = A0 * RC.lv, ys = rcSurfaceY(P, Alq);
    // 안쪽: 액체 (기울어도 수면은 수평)
    ctx.save(); ctx.save(); tf(); bodyPath(); ctx.restore(); ctx.clip();
    const gb = ctx.createLinearGradient(P.bx - W / 2, 0, P.bx + W / 2, 0); gb.addColorStop(0, 'rgba(176,200,232,.45)'); gb.addColorStop(0.2, 'rgba(228,241,255,.2)'); gb.addColorStop(0.8, 'rgba(228,241,255,.16)'); gb.addColorStop(1, 'rgba(170,196,230,.45)');
    ctx.fillStyle = gb; ctx.fillRect(P.bx - 300, P.ly - 300, 800, 900);
    const wob = Math.sin(t * 2.4) * 0.9 * (RC.phase === 'heating' ? 1.8 : 1);
    const lg = ctx.createLinearGradient(0, ys, 0, ys + 130); lg.addColorStop(0, 'rgba(176,222,255,.55)'); lg.addColorStop(1, 'rgba(120,190,250,.78)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(P.bx - 300, ys + 700);
    for (let i = 0; i <= 24; i++) ctx.lineTo(P.bx - 300 + (600 * i) / 24, ys + Math.sin(t * 2.4 + i * 0.7) * wob);
    ctx.lineTo(P.bx + 300, ys + 700); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(P.bx - 300, ys - 1, 600, 2.4);
    ctx.save(); tf();
    if (RC.phase !== 'ready' && RC.phase !== 'adding') RC.ions.forEach((q) => {                    // 녹아 있는 염화 나트륨 (주황 점)
      const x = 12 + q.u * (W - 24) + Math.sin(t * 0.8 * q.w + q.ph) * 6, y = -H * RC_FILL * (0.12 + q.v * 0.78) + Math.cos(t * 0.7 * q.w + q.ph) * 5;
      ctx.fillStyle = 'rgba(245,158,11,.8)'; circle(ctx, x, y, 2.7); ctx.fill();
    });
    RC.cr.forEach((c) => {
      let x, y, s = c.s, a = 1;
      if (c.st === 'float' || c.st === 'set') {
        const k = clamp((t0 - c.t0) / c.fall, 0, 1), q = RC.slots[c.slot] || RC.slots[0], e = ease.inQuad(k);
        const wx = W / 2 + q.x, wy = -2 + q.y;
        x = lerp(W / 2 + c.x0, wx, e) + Math.sin(t0 * 3 + c.rot) * 3 * (1 - e); y = lerp(c.y0, wy, e);
        c.s = Math.min(1, (t0 - c.t0) / 0.7) * c.sz; s = c.s; if (k >= 1) c.st = 'set';
      } else if (c.st === 'melt') { const k = (t0 - c.mt) / 0.7, q = RC.slots[Math.max(0, c.slot)] || RC.slots[0]; x = W / 2 + q.x; y = -2 + q.y; s = c.sz * (1 - k * 0.8); a = 1 - k; }
      else return;
      rcDrawCrystal(x, y, s, c.rot, a);
    });
    ctx.restore();
    ctx.restore();
    // 유리
    ctx.save(); tf();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, -H - 1); ctx.lineTo(1, -H + 3); ctx.lineTo(1, -12); ctx.quadraticCurveTo(1, -1, 13, -1); ctx.lineTo(W - 13, -1); ctx.quadraticCurveTo(W - 1, -1, W - 1, -12); ctx.lineTo(W - 1, -H + 3); ctx.lineTo(W + 5, -H - 1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(12, -H + 12); ctx.lineTo(12, -18); ctx.stroke();
    ctx.strokeStyle = 'rgba(93,104,121,.5)'; ctx.lineWidth = 1.2; for (let i = 1; i < 6; i++) { const ty = -((H - 6) * i) / 6; ctx.beginPath(); ctx.moveTo(W - (i % 2 ? 9 : 16), ty); ctx.lineTo(W - 3, ty); ctx.stroke(); }
    ctx.restore();
    return { P };
  }
  function rcDrawApp(sc, t) {
    LSC = Math.min(1, sc); const bl = RG.bkx;
    // 실험대
    ctx.save(); vgrad(ctx, 12, RG.bench, RG.w - 24, 12, '#e8c796', '#cfa56d'); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(12, RG.bench, RG.w - 24, 2); ctx.restore();
    // 삼발이 + 알코올램프 (가열할 때)
    const hk = 1 - RC.bath;
    if (hk > 0.02) {
      ctx.save(); ctx.globalAlpha = hk; ctx.translate(0, RC.bath * 40);
      ctx.strokeStyle = '#6b7689'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      [[bl - 56, RG.rest + 2, bl - 76, RG.bench], [bl + 56, RG.rest + 2, bl + 76, RG.bench], [bl, RG.rest + 2, bl, RG.bench]].forEach((q) => { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.stroke(); });
      ctx.fillStyle = '#5b6678'; D.roundRect(bl - 70, RG.rest + 1, 140, 7, 3); ctx.fill();
      const lg = ctx.createLinearGradient(bl - 30, 0, bl + 30, 0); lg.addColorStop(0, 'rgba(210,235,250,.95)'); lg.addColorStop(0.5, 'rgba(240,250,255,.95)'); lg.addColorStop(1, 'rgba(170,205,232,.95)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(bl - 11, 468); ctx.lineTo(bl + 11, 468); ctx.bezierCurveTo(bl + 34, 474, bl + 34, RG.bench, bl + 27, RG.bench); ctx.lineTo(bl - 27, RG.bench); ctx.bezierCurveTo(bl - 34, RG.bench, bl - 34, 474, bl - 11, 468); ctx.fill();
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#9aa5b6'; D.roundRect(bl - 10, 461, 20, 9, 3); ctx.fill();
      if (RC.lamp > 0.02) D.flame(bl, 460, 46 * RC.lamp, t);
      ctx.restore();
    }
    // 얼음물 (식힐 때)
    if (RC.bath > 0.02) {
      const bk = RC.bath;
      ctx.save(); ctx.globalAlpha = Math.min(1, bk * 1.4); ctx.translate(0, (1 - bk) * 60);
      const bx = bl, top = 436, bot = RG.bench - 2;
      ctx.fillStyle = 'rgba(190,225,250,.5)'; ctx.beginPath(); ctx.moveTo(bx - 112, top); ctx.lineTo(bx - 96, bot - 6); ctx.quadraticCurveTo(bx - 94, bot, bx - 84, bot); ctx.lineTo(bx + 84, bot); ctx.quadraticCurveTo(bx + 94, bot, bx + 96, bot - 6); ctx.lineTo(bx + 112, top); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(120,190,250,.55)'; ctx.fillRect(bx - 106, top + 12, 212, bot - top - 14);
      RC.ice.forEach((q) => { const y = top + 6 + q.y * 12 + Math.sin(t * 1.4 + q.ph) * 1.6; ctx.save(); ctx.translate(bx + q.x, y); ctx.rotate(q.rot + Math.sin(t + q.ph) * 0.05); ctx.fillStyle = 'rgba(255,255,255,.82)'; D.roundRect(-q.r, -q.r * 0.8, q.r * 2, q.r * 1.6, 4); ctx.fill(); ctx.strokeStyle = 'rgba(150,200,240,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); });
      ctx.restore();
    }
    // 가루 종이 + 거름 장치
    rcDrawFilterSet(t);
    const bk = rcDrawBeaker(t);
    // 온도계
    if (RC.thermo > 0.02) {
      const P = bk.P; ctx.save(); ctx.globalAlpha = RC.thermo;
      D.thermometer(P.bx + 34, P.by - H0() - 78, H0() + 56, RC.T, 0, 100, { ticks: false, color: '#e2464b' });
      ctx.restore();
    }
    if (RC.phase === 'ready' || RC.phase === 'adding') rcDrawPaper(t);
    // 물방울 · 알림
    const f = (n) => n / LSC;
    if (RC.phase === 'ready') D.label(bl, 350, '물 100 g', { bg: '#1b2333', size: f(14), pad: 9 });
    if (RC.phase === 'heating' || RC.phase === 'hot') D.label(bl, 232, (Math.round(RC.T)) + ' °C', { bg: COL.hot, size: f(15), pad: 10 });
    if (RC.phase === 'cooling' || RC.phase === 'cool') D.label(bl, 232, (Math.round(RC.T)) + ' °C', { bg: '#2563eb', size: f(15), pad: 10 });
    const age = t - RC.ping;
    if (age < 2.8 && RC.phase === 'hot') { ctx.save(); ctx.globalAlpha = age > 2.2 ? 1 - (age - 2.2) / 0.6 : 1; D.label(bl, 204, '모두 녹았어요!', { bg: COL.good, size: f(14), pad: 10 }); ctx.restore(); }
  }
  const H0 = () => RG.H;
  function rcDrawPaper(t) {
    const k = RC.phase === 'adding' ? RC.addT : 0, mv = smooth(seg(k, 0, 0.45)), back = smooth(seg(k, 1.7, 2.2));
    const x = lerp(78, RG.bkx - 4, mv * (1 - back)), y = lerp(196, 244, mv * (1 - back)), tilt = -0.8 * smooth(seg(k, 0.4, 0.8)) * (1 - back);
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(-34, -4, 68, 8, 3); ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#f1f5f9'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; D.roundRect(-34, -4, 68, 8, 3); ctx.fill(); ctx.stroke();
    const rem = RC.phase === 'adding' ? 1 - smooth(seg(k, 0.6, 1.6)) : 1;
    for (let i = 0; i < 26 * rem; i++) { ctx.fillStyle = i % 5 === 0 ? '#e9e3ff' : '#ffffff'; const px = -26 + (i % 9) * 6.4, py = -8 - Math.floor(i / 9) * 5 + (i % 3); ctx.beginPath(); ctx.rect(px, py, 5, 5); ctx.fill(); ctx.strokeStyle = 'rgba(160,170,190,.7)'; ctx.lineWidth = 0.8; ctx.stroke(); }
    ctx.restore();
    if (RC.phase === 'ready') { D.label(78, 156, '하얀 가루 105 g', { bg: '#1b2333', size: 14 / LSC, pad: 8 }); text(78, 226, '질산 칼륨 100 g', { size: 13.5 / LSC, weight: 800, color: '#6d28d9' }); text(78, 244, '+ 염화 나트륨 5 g', { size: 13.5 / LSC, weight: 800, color: '#b45309' }); }
    RC.falls.forEach((f) => { if (f.kind === 'pow') { ctx.fillStyle = '#fff'; ctx.fillRect(f.x, f.y, 4, 4); ctx.strokeStyle = 'rgba(150,160,185,.8)'; ctx.lineWidth = 0.8; ctx.strokeRect(f.x, f.y, 4, 4); } });
  }
  function rcDrawFilterSet(t) {
    const fx = RG.fx, top = 292, stemY = 392;
    // 받침 스탠드는 생략, 삼각 플라스크 + 깔때기
    const fl = clamp(RC.filtV / 100, 0, 1);
    ctx.save(); ctx.globalAlpha = RC.phase === 'filtering' || RC.phase === 'done' ? 1 : 0.9;
    D.flask(fx, RG.bench - 2, 128, 112, { level: fl * 0.78, liquid: '#bfe0ff', t });
    if (fl > 0.02 && RC.phase !== 'ready') {                    // 거른 용액 속에 남은 염화 나트륨 · 질산 칼륨(녹은 것)
      for (let i = 0; i < Math.round(fl * 7); i++) { ctx.fillStyle = 'rgba(245,158,11,.8)'; circle(ctx, fx - 32 + ((i * 29) % 64) + Math.sin(t * 0.7 + i) * 3, RG.bench - 14 - ((i * 13) % 26) * 0.9, 2.5); ctx.fill(); }
    }
    ctx.restore();
    // 깔때기
    const cone = () => { ctx.beginPath(); ctx.moveTo(fx - 58, top); ctx.lineTo(fx + 58, top); ctx.lineTo(fx + 6, 362); ctx.lineTo(fx + 6, stemY); ctx.lineTo(fx - 6, stemY); ctx.lineTo(fx - 6, 362); ctx.closePath(); };
    ctx.save(); cone(); ctx.fillStyle = 'rgba(228,241,255,.35)'; ctx.fill();
    ctx.clip();
    // 거름종이
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.moveTo(fx - 54, top + 2); ctx.lineTo(fx + 54, top + 2); ctx.lineTo(fx + 5, 360); ctx.lineTo(fx - 5, 360); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,165,190,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx - 54, top + 2); ctx.lineTo(fx - 4, 358); ctx.moveTo(fx + 54, top + 2); ctx.lineTo(fx + 4, 358); ctx.moveTo(fx, top + 2); ctx.lineTo(fx, 360); ctx.stroke();
    // 종이 위의 결정
    RC.paperCr.forEach((c, i) => { const row = Math.floor(i / 9), col = i % 9; const w = Math.max(6, 20 - row * 3), px = fx + (col - 4) * (w / 4.6) + c.x * 0.15, py = 352 - row * 5.5 + (i % 2); rcDrawCrystal(px, py, 0.9 * c.k, c.rot, 1); });
    // 깔때기 속 아직 걸러지지 않은 용액
    const wait = clamp((RC.poured - RC.filtV) / 40, 0, 1);
    if (wait > 0.02) { ctx.fillStyle = 'rgba(176,222,255,.6)'; const hy = 350 - wait * 38; ctx.beginPath(); ctx.moveTo(fx - 20 - wait * 24, hy); ctx.lineTo(fx + 20 + wait * 24, hy); ctx.lineTo(fx + 5, 360); ctx.lineTo(fx - 5, 360); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.save(); cone(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx - 48, top + 8); ctx.lineTo(fx - 8, 352); ctx.stroke(); ctx.restore();
    RC.drips.forEach((d) => { ctx.fillStyle = 'rgba(160,210,255,.95)'; ctx.beginPath(); ctx.ellipse(fx, d.y, 2.4, 3.6, 0, 0, TAU); ctx.fill(); });
    // 비커에서 쏟아지는 줄기
    if (RC.stream > 0.03) {
      ctx.save(); ctx.globalAlpha = RC.stream; ctx.strokeStyle = 'rgba(160,210,255,.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(RG.lipX + 2, RG.lipY + 2); ctx.quadraticCurveTo(RG.lipX + 10, RG.lipY + 22, RG.fx + 2, 330); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
    }
    RC.cr.forEach((c) => {
      if (c.st === 'slide') { const k = clamp((now() - c.mt) / 0.45, 0, 1); rcDrawCrystal(lerp(c.sx, RG.lipX, k), lerp(c.sy, RG.lipY + 2, k), c.sz, c.rot, 1); }
      else if (c.st === 'fall') rcDrawCrystal(c.fx, c.fy, c.sz, c.rot + now() * 4, 1);
    });
    if (RC.phase !== 'filtering' && RC.phase !== 'done') { D.label(fx, 270, '거름 장치', { bg: 'rgba(100,116,139,.85)', size: 13 / LSC, pad: 9 }); }
    if (RC.phase === 'done') D.label(RG.w - 8, 266, RC.keptG > 1 ? '거름종이 위: 결정 ' + (Math.round(RC.keptG * 10) / 10) + ' g' : '거름종이 위: 결정 없음', { bg: RC.keptG > 1 ? '#6d28d9' : '#64748b', size: 13.5 / LSC, pad: 9, align: 'right' });
  }
  function rcDrawChart(t) {
    const R = RL2.chart, X0 = R.x + (PHONE ? 46 : 54), X1 = R.x + R.w - 16, Y0 = R.y + (PHONE ? 38 : 56), Y1 = R.y + R.h - (PHONE ? 34 : 44);
    const X = (T) => X0 + (X1 - X0) * T / 80, Y = (g) => Y1 - (Y1 - Y0) * g / 180;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(R.x + 14, R.y + 28, '📈 용해도 곡선 (g / 물 100 g)', { size: PHONE ? 14.5 : 15.5, weight: 800, color: COL.ink, align: 'left' });
    ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1;
    [0, 50, 100, 150].forEach((g) => { ctx.beginPath(); ctx.moveTo(X0, Y(g)); ctx.lineTo(X1, Y(g)); ctx.stroke(); text(X0 - 7, Y(g) + 4.5, String(g), { size: 13, weight: 700, color: COL.muted, align: 'right' }); });
    [0, 20, 40, 60, 80].forEach((T) => text(X(T), Y1 + 17, String(T), { size: 13, weight: 700, color: COL.muted }));
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, Y0 - 4); ctx.lineTo(X0, Y1); ctx.lineTo(X1 + 3, Y1); ctx.stroke();
    text(X1, Y1 + (PHONE ? 30 : 32), '온도 (°C)', { size: 13, weight: 800, color: COL.muted, align: 'right' });
    // 넣은 양 (점선)
    [[KNO3_G, '질산 칼륨 100 g 넣음', COL.kno3, 'left'], [NACL_G, '염화 나트륨 5 g 넣음', '#d97706', 'right']].forEach(([g, lab, c, al]) => {
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = rgba(c, 0.85); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(X0, Y(g)); ctx.lineTo(X1, Y(g)); ctx.stroke(); ctx.restore();
      text(al === 'left' ? X0 + 6 : X1 - 2, Y(g) - 6, lab, { size: 13, weight: 800, color: shade(c, -0.15), align: al });
    });
    // 곡선
    [[SOL.kno3, COL.kno3], [SOL.nacl, '#f59e0b']].forEach(([arr, c]) => {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = c; ctx.lineWidth = 4.5; ctx.beginPath();
      for (let T = 0; T <= 80; T += 2) { const g = solAt(arr, T); T ? ctx.lineTo(X(T), Y(g)) : ctx.moveTo(X(T), Y(g)); }
      ctx.stroke(); SOL.T.forEach((T, i) => { circle(ctx, X(T), Y(arr[i]), 4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.stroke(); }); ctx.restore();
    });
    text(X(66), Y(sK(66)) - 24 + 6, '질산 칼륨', { size: 13.5, weight: 800, color: COL.kno3, align: 'center' });
    text(X(60), Y(40) - 6, '염화 나트륨', { size: 13.5, weight: 800, color: '#b45309', align: 'center' });
    // 지금의 온도
    if (RC.phase !== 'ready') {
      const T = RC.T, gk = sK(T), gn = sN(T), x = X(T), m = Math.max(0, KNO3_G - gk);
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(93,104,121,.7)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, Y0 - 2); ctx.lineTo(x, Y1); ctx.stroke(); ctx.restore();
      if (m > 0.5) {                                           // 결정이 되는 양 (100 g 선 − 용해도)
        const yb = Y(KNO3_G), ya = Y(gk), bw = 15;
        ctx.fillStyle = 'rgba(124,58,237,.28)'; ctx.fillRect(x - bw / 2, yb, bw, ya - yb); ctx.strokeStyle = COL.kno3; ctx.lineWidth = 2; ctx.strokeRect(x - bw / 2, yb, bw, ya - yb);
        const lx = x > X0 + (X1 - X0) * 0.6 ? x - 12 : x + 14;
        pill(lx, (yb + ya) / 2, '결정 ' + (Math.round(m * 10) / 10) + ' g', { bg: '#6d28d9', size: 13, align: x > X0 + (X1 - X0) * 0.6 ? 'right' : 'left', pad: 8 });
      }
      D.sphere(x, Y(gk), 6, COL.kno3, { gloss: true }); D.sphere(x, Y(gn), 6, '#f59e0b', { gloss: true });
    }
  }
  function rcDrawLedger() {
    const R = RL2.res; if (!R) return;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(R.x + 14, R.y + 28, '📒 가루는 어디에 있을까?', { size: 15.5, weight: 800, color: COL.ink, align: 'left' });
    const active = RC.phase !== 'ready' && RC.phase !== 'adding';
    const T = RC.T, dis = active ? Math.min(KNO3_G, sK(T)) : 0, nd = active ? NACL_G : 0, cr = active ? Math.max(0, KNO3_G - sK(T)) : 0;
    const cols = [R.x + 120, R.x + 218, R.x + 312], y0 = R.y + 58;
    ['질산 칼륨', '염화 나트륨'].forEach((h, i) => pill(cols[i + 1] - 6, y0, h, { bg: i ? '#d97706' : COL.kno3, size: 13, pad: 8 }));
    const rows = [['넣은 양', KNO3_G + ' g', NACL_G + ' g', COL.ink], ['물에 녹은 양', (Math.round(dis * 10) / 10) + ' g', nd + ' g', '#0369a1'], ['결정이 된 양', (Math.round(cr * 10) / 10) + ' g', '0 g', '#6d28d9']];
    rows.forEach((r, i) => {
      const y = y0 + 34 + i * 34;
      text(R.x + 14, y, r[0], { size: 14, weight: 800, color: COL.ink, align: 'left' });
      text(cols[1] + 18, y, r[1], { size: 15, weight: 800, color: r[3], align: 'right' }); text(cols[2] + 24, y, r[2], { size: 15, weight: 800, color: r[3], align: 'right' });
      if (i < 2) { ctx.strokeStyle = '#eef2f8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(R.x + 12, y + 14); ctx.lineTo(R.x + R.w - 12, y + 14); ctx.stroke(); }
    });
    let msg = '혼합물을 뜨거운 물에 녹였다가 식혀요.', col = COL.muted;
    if (RC.phase === 'heating' || RC.phase === 'hot') msg = '뜨거울수록 질산 칼륨이 많이 녹아요.';
    else if (RC.phase === 'cooling' || RC.phase === 'cool') msg = '식히니 질산 칼륨만 결정이 돼요. 염화 나트륨은 그대로 녹아 있어요.';
    else if (RC.phase === 'filtering') msg = '거름종이로 결정만 걸러 내고 있어요.';
    else if (RC.phase === 'done') { msg = RC.keptG >= 60 ? '✅ 순수한 질산 칼륨 결정을 얻었어요!' : RC.keptG > 1 ? '결정이 적어요. 더 낮은 온도로 식혀요.' : '결정이 없어요. 먼저 식혀야 해요!'; col = RC.keptG >= 60 ? '#0b6b39' : '#b4232b'; }
    wrapText(msg, R.w - 28, 14.5, 800).forEach((l, i) => text(R.x + 14, R.y + 200 + i * 20 - (wrapText(msg, R.w - 28, 14.5, 800).length - 1) * 10, l, { size: 14.5, weight: 800, color: col, align: 'left' }));
  }
  function rcDrawInfo() {
    const R = RL2.info; if (!R) return;
    panel(R.x, R.y, R.w, R.h, 16, '#f3efff', 10, 3, 'rgba(60,40,140,.14)');
    const msgs = { ready: ['💡 용해도 차이', '질산 칼륨은 온도에 따라 녹는 양이 크게 달라요. 염화 나트륨은 거의 그대로예요.'],
      adding: ['💡 용해도 차이', '질산 칼륨은 온도에 따라 녹는 양이 크게 달라요. 염화 나트륨은 거의 그대로예요.'],
      heating: ['🔥 온도가 오르면', '물 100 g에 녹는 질산 칼륨의 양이 늘어나 가루가 점점 사라져요.'],
      hot: ['🔥 모두 녹았어요', '질산 칼륨 100 g과 염화 나트륨 5 g이 모두 녹았어요. 이제 식혀 볼까요?'],
      cooling: ['❄️ 온도가 내려가면', '질산 칼륨은 녹을 수 있는 양이 줄어 남는 만큼 결정이 돼요. 염화 나트륨 5 g은 계속 녹아 있어요.'],
      cool: ['❄️ 식혔어요', '결정이 된 것은 질산 칼륨뿐이에요. 거름종이로 거르면 결정만 걸러져요.'],
      filtering: ['🧻 거르는 중', '결정은 거름종이에 걸리고, 염화 나트륨이 녹아 있는 용액은 아래로 내려가요.'],
      done: ['✅ 재결정 끝', '용해도 차이를 이용해 질산 칼륨을 순수한 결정으로 분리했어요.'] }[RC.phase];
    text(R.x + 14, R.y + 28, msgs[0], { size: 15, weight: 800, color: COL.sub, align: 'left' });
    wrapText(msgs[1], R.w - 28, 14.5, 700).forEach((l, i) => text(R.x + 14, R.y + 54 + i * 21, l, { size: 14.5, weight: 700, color: COL.ink, align: 'left' }));
  }
  function rcDraw(t) {
    panel(RL2.app.x, RL2.app.y, RL2.app.w, RL2.app.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    RC.frame = withFrame(RL2.app, RG.w, 400, (sc) => rcDrawApp(sc, t), -120);
    rcDrawChart(t); rcDrawLedger(); rcDrawInfo();
    if (isNew('recrys')) ringRect(RL2.app, t);
  }
  function rcRefresh() {
    const b = $('#rcBtn'); if (!b) return;
    const ph = RC.phase, busy = ph === 'adding' || ph === 'heating' || ph === 'cooling' || ph === 'filtering';
    b.textContent = ph === 'ready' ? '🔥 가열해서 녹이기' : ph === 'adding' || ph === 'heating' ? '⏳ 녹이는 중…' : ph === 'hot' ? '❄️ 식히기' : ph === 'cooling' ? '⏳ 식히는 중…' : ph === 'cool' ? '❄️ 더 식히기' : ph === 'filtering' ? '⏳ 거르는 중…' : '↺ 다시 하기';
    b.disabled = busy || (ph === 'cool' && +$('#rcTemp').value >= RC.T - 0.5);
    b.classList.toggle('btn-primary', !busy);
    const box = $('#rcSliderBox'); box.hidden = !(ph === 'hot' || ph === 'cooling' || ph === 'cool');
    $('#rcFilter').disabled = ph === 'cooling';
    $('#rcNote').textContent = ph === 'ready' ? '질산 칼륨 100 g에 염화 나트륨 5 g이 섞인 가루를 물 100 g에 넣고 가열해 녹여요.'
      : ph === 'hot' ? '60 °C에서 모두 녹았어요. 식힐 온도를 고르고 식혀 보세요.' : ph === 'cool' ? '더 낮은 온도로 식히면 결정이 더 많아져요. 준비되면 거르기!' : ph === 'done' ? '거름종이 위에 남은 것이 질산 칼륨 결정이에요.' : '';
  }
  function rcMain() {
    hideHint(); Sound.click();
    const ph = RC.phase;
    if (ph === 'ready') { RC.phase = 'adding'; RC.addT = 0; Sound.tone(420, 0.1, 'triangle', 0.05); }
    else if (ph === 'hot' || ph === 'cool') { RC.tgt = +$('#rcTemp').value; if (RC.tgt < RC.T - 0.5) { RC.phase = 'cooling'; } }
    else if (ph === 'done') { rcReset(); return; }
    rcRefresh();
  }
  function rcFilter() {
    hideHint(); Sound.click();
    if (RC.phase !== 'hot' && RC.phase !== 'cool') return;
    RC.phase = 'filtering'; RC.fp = 0; RC.lv = 1; RC.filtV = 0; RC.poured = 0; RC.paperCr = []; rcRefresh();
  }
  SC.recrys = {
    label: '❄️ 재결정으로 분리하기',
    hint: '🔥 녹이고 ❄️ 식힌 뒤 🧻 걸러 보세요',
    enter(reset) { if (reset || !RC.ions.length) rcReset(); else rcRefresh(); },
    update(dt) { rcUpdate(dt); },
    draw(t) { rcDraw(t); },
    refresh() { rcRefresh(); },
    readouts() {
      $('#rRT').innerHTML = (Math.round(RC.T * 10) / 10).toFixed(1) + '<small>°C</small>';
      $('#rRC').innerHTML = (Math.round((RC.phase === 'done' ? RC.keptG : rcSolid()) * 10) / 10).toFixed(1) + '<small>g</small>';
      $('#rRS').textContent = { ready: '준비', adding: '넣는 중', heating: '녹이는 중', hot: '모두 녹음', cooling: '식히는 중', cool: '식힘', filtering: '거르는 중', done: '거르기 끝' }[RC.phase];
    },
  };
  $('#rcBtn').addEventListener('click', rcMain);
  $('#rcFilter').addEventListener('click', rcFilter);
  SciSim.bindRange($('#rcTemp'), $('#rcTempOut'), (v) => v + ' °C', () => { if (RC.phase === 'cool') rcRefresh(); });
  Object.assign(DBG, { RC, rcReset, rcMain, rcFilter, rcUpdate, sK, sN });


  /* =========================================================
     장면 ④-1: 크로마토그래피 — 잉크 속 색소를 이동 속도 차이로 분리
       물이 종이를 타고 올라갈 때 색소마다 올라가는 빠르기가 달라 색 띠로 나뉘어요.
       증거 잉크와 같은 색소 구성의 사인펜 찾기
     ========================================================= */
  const CL = PHONE ? {
    app: { x: 4, y: 4, w: 432, h: 392 }, lens: { x: 4, y: 404, w: 214, h: 212 }, res: { x: 226, y: 404, w: 210, h: 212 },
  } : {
    app: { x: 16, y: 16, w: 484, h: 528 }, lens: { x: 514, y: 16, w: 270, h: 292 }, res: { x: 514, y: 320, w: 270, h: 224 },
  };
  const CG = { w: 484, h: 528, jar: { x: 84, y: 392, w: 316, h: 110 }, waterY: 458, px: 106, pw: 272, ph: 358, topRest: 62, lift: 54, base: 28, fmax: 322, T: 10 };
  const DYES = {
    Y: { name: '노랑', col: '#ffd60a', rf: 0.92 }, O: { name: '주황', col: '#ff8a1f', rf: 0.76 }, R: { name: '빨강', col: '#ec2d6a', rf: 0.60 }, B: { name: '파랑', col: '#1d6ff2', rf: 0.30 },
  };
  const LANES = [
    { id: 'E', label: '증거', dyes: ['R', 'B', 'Y'], note: '검은색 증거 잉크' },
    { id: 'A', label: 'A', dyes: ['Y', 'B'], note: '초록색 사인펜' },
    { id: 'B', label: 'B', dyes: ['Y', 'R', 'B'], note: '검은색 사인펜' },
    { id: 'C', label: 'C', dyes: ['O', 'R', 'B'], note: '검은색 사인펜' },
  ];
  const CH = { phase: 'ready', t: 0, dip: 0, F: 0, pick: null, ran: 0, frame: null, lp: [], ping: -9, mist: [] };
  const chFront = (t) => CG.fmax * Math.sqrt(clamp(t / CG.T, 0, 1));
  const chProg = () => (CH.phase === 'running' || CH.phase === 'done' ? clamp((CH.F - CG.base) / (CG.fmax - CG.base), 0, 1) : 0);
  function chReset() {
    Object.assign(CH, { phase: 'ready', t: 0, dip: 0, F: 0, ping: -9 });
    CH.lp = [];
    ['Y', 'R', 'B'].forEach((k, ki) => { for (let i = 0; i < 9; i++) CH.lp.push({ k, x: rand(0.1, 0.9), j: rand(-1, 1), ph: rand(0, TAU), r: rand(0.9, 1.15) }); });
    chRefresh();
  }
  function chUpdate(dt) {
    if (CH.phase === 'dipping') { CH.dip = Math.min(1, CH.dip + dt / 1.1); if (CH.dip >= 1) { CH.phase = 'running'; CH.t = 0; } }
    else if (CH.phase === 'running') {
      CH.t += dt; CH.F = chFront(CH.t);
      if (CH.t >= CG.T) { CH.phase = 'done'; CH.ran++; CH.ping = now(); Sound.success(); chRefresh(); }
    }
  }
  function chBlob(cx, cy, rx, ry, col, a) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, withA(col, a)); g.addColorStop(0.62, withA(col, a * 0.85)); g.addColorStop(1, withA(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  function chDrawApp(sc, t) {
    LSC = Math.min(1, sc);
    const dip = ease.outCubic(CH.dip), px = CG.px, pw = CG.pw, ph = CG.ph, J = CG.jar, wy = CG.waterY;
    const top = CG.topRest + CG.lift * dip, bottom = top + ph, yBase = bottom - 44, lanes = LANES.length;
    const frontY = CH.phase === 'ready' ? bottom : CH.phase === 'dipping' ? Math.min(bottom, Math.max(wy, bottom - 0.01)) : Math.min(bottom, wy - CH.F);
    const D = Math.max(0, yBase - frontY);                          // 출발선에서 물이 더 올라간 거리
    // 실험대
    ctx.save(); vgrad(ctx, 12, 502, CG.w - 24, 12, '#e8c796', '#cfa56d'); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(12, 502, CG.w - 24, 2); ctx.restore();
    groundShadow(J.x + J.w / 2, 504, J.w * 0.58, 7, 1);
    // 종이
    ctx.save(); ctx.beginPath(); ctx.rect(px, top, pw, ph); ctx.clip();
    ctx.fillStyle = '#fffdf8'; ctx.fillRect(px, top, pw, ph);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(190,175,150,.10)'; ctx.fillRect(px + ((i * 53) % pw), top + ((i * 97) % ph), 14, 1.2); }
    if (frontY < bottom) {                                          // 젖은 부분
      const wg = ctx.createLinearGradient(0, frontY, 0, bottom); wg.addColorStop(0, 'rgba(120,170,230,.12)'); wg.addColorStop(1, 'rgba(110,165,235,.3)');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(px, bottom);
      for (let i = 0; i <= 20; i++) ctx.lineTo(px + (pw * i) / 20, frontY + Math.sin(t * 3 + i * 0.9) * 1.4);
      ctx.lineTo(px + pw, bottom); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(80,130,210,.55)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 20; i++) { const x = px + (pw * i) / 20, y = frontY + Math.sin(t * 3 + i * 0.9) * 1.4; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(90,90,100,.65)'; ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(px + 8, yBase); ctx.lineTo(px + pw - 8, yBase); ctx.stroke(); ctx.setLineDash([]);
    text(px + pw - 12, yBase + 16, '출발선', { size: 13 / LSC, weight: 700, color: 'rgba(90,90,100,.9)', align: 'right' });
    ctx.globalCompositeOperation = 'multiply';                      // 색소끼리 겹치면 색이 섞여 보임
    LANES.forEach((ln, li) => {
      const cx = px + 34 + li * ((pw - 68) / (lanes - 1));
      ln.dyes.forEach((dk) => {
        const dye = DYES[dk], moved = dye.rf * D, cy = yBase - moved;
        if (moved > 4) chBlob(cx, yBase - moved * 0.5, 9, Math.max(8, moved * 0.5), dye.col, 0.12);
        chBlob(cx, cy, 11 + Math.min(4, moved * 0.02), 8 + Math.min(7, moved * 0.03), dye.col, 0.95);
      });
    });
    ctx.globalCompositeOperation = 'source-over';
    LANES.forEach((ln, li) => { const cx = px + 34 + li * ((pw - 68) / (lanes - 1)); pill(cx, top + 18, ln.label, { bg: ln.id === 'E' ? COL.bad : '#475569', size: 13.5 / LSC, pad: 8 }); });
    ctx.restore();
    ctx.strokeStyle = 'rgba(160,150,130,.7)'; ctx.lineWidth = 1.6; ctx.strokeRect(px, top, pw, ph);
    // 집게(종이를 잡는 막대)
    ctx.save(); ctx.fillStyle = '#6b7689'; D_roundRect(px - 8, top - 14, pw + 16, 14, 5); ctx.restore();
    // 유리병 + 물 (종이 앞쪽)
    const jr = 16, jp = () => { ctx.beginPath(); ctx.moveTo(J.x, J.y); ctx.lineTo(J.x, J.y + J.h - jr); ctx.quadraticCurveTo(J.x, J.y + J.h, J.x + jr, J.y + J.h); ctx.lineTo(J.x + J.w - jr, J.y + J.h); ctx.quadraticCurveTo(J.x + J.w, J.y + J.h, J.x + J.w, J.y + J.h - jr); ctx.lineTo(J.x + J.w, J.y); ctx.closePath(); };
    ctx.save(); jp(); ctx.fillStyle = 'rgba(228,241,255,.18)'; ctx.fill(); ctx.clip();
    const wg2 = ctx.createLinearGradient(0, wy, 0, J.y + J.h); wg2.addColorStop(0, 'rgba(150,200,250,.6)'); wg2.addColorStop(1, 'rgba(100,170,245,.8)');
    ctx.fillStyle = wg2; ctx.beginPath(); ctx.moveTo(J.x - 2, J.y + J.h + 2); for (let i = 0; i <= 20; i++) ctx.lineTo(J.x + (J.w * i) / 20, wy + Math.sin(t * 2.4 + i * 0.7) * 1.2); ctx.lineTo(J.x + J.w + 2, J.y + J.h + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(J.x, wy - 1, J.w, 2.4); ctx.restore();
    ctx.save(); jp(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(J.x + 14, J.y + 14); ctx.lineTo(J.x + 14, J.y + J.h - 22); ctx.stroke(); ctx.restore();
    pill(J.x + 40, J.y + J.h - 26, '물', { bg: 'rgba(30,90,200,.85)', size: 13.5 / LSC, pad: 10 });
    const f = (n) => n / LSC;
    if (CH.phase === 'ready') D_label(CG.w / 2, 36, '잉크 점은 겉보기엔 한 가지 색이에요', { bg: '#1b2333', size: f(14), pad: 11 });
    if (CH.phase === 'dipping' || CH.phase === 'running') D_label(CG.w / 2, 36, '💧 물이 위로 올라가며 색소를 데려가요', { bg: COL.sub, size: f(14), pad: 11 });
    if (CH.phase === 'done') D_label(CG.w / 2, 36, '증거 잉크와 같은 색 띠를 찾아요!', { bg: COL.good, size: f(14), pad: 11 });
    if (CH.phase === 'running') D_arrow(px + pw + 22, wy - 10, px + pw + 22, Math.max(top + 30, frontY), { color: rgba(COL.water, 0.9), width: 4, head: 12 });
  }
  const D_roundRect = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); ctx.fill(); };
  const D_label = (x, y, str, o) => D.label(x, y, str, o);
  const D_arrow = (...a) => D.arrow(...a);
  function chDrawLens(t) {
    const r = CL.lens;
    lensFrame(r, { title: PHONE ? '🔍 종이 속' : '🔍 종이 속 확대', top: '#fbfdff', bot: '#eef3fb' }, () => {
      // 종이 섬유
      ctx.strokeStyle = 'rgba(160,150,130,.35)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 12; i++) { const y = r.y + 46 + i * ((r.h - 70) / 11); ctx.moveTo(r.x, y + (i % 3) * 3); ctx.bezierCurveTo(r.x + r.w * 0.3, y - 8, r.x + r.w * 0.6, y + 9, r.x + r.w, y - 2); }
      for (let i = 0; i < 8; i++) { const x = r.x + 20 + i * ((r.w - 40) / 7); ctx.moveTo(x, r.y + 40); ctx.bezierCurveTo(x + 8, r.y + r.h * 0.4, x - 8, r.y + r.h * 0.7, x + 3, r.y + r.h); }
      ctx.stroke();
      const yb = r.y + r.h - 40, hh = r.h - 100, prog = chProg();
      // 물 알갱이 (위로 흐름)
      if (CH.phase === 'running' || CH.phase === 'done') for (let i = 0; i < 26; i++) {
        const u = (i * 0.618) % 1, x = r.x + 16 + u * (r.w - 32), y = yb - ((t * 40 + i * 31) % (r.h - 70));
        ctx.fillStyle = 'rgba(100,170,245,.45)'; circle(ctx, x, y, 3); ctx.fill();
      }
      // 색소 알갱이
      const run = CH.phase === 'running' || CH.phase === 'done';
      CH.lp.forEach((p) => {
        const dye = DYES[p.k], x = r.x + 16 + p.x * (r.w - 32) + Math.sin(t * 1.7 + p.ph) * 2.5;
        const y = yb - (run ? dye.rf * prog * hh : 0) * p.r - p.j * 10 * (run ? Math.min(1, prog * 2) : 0) + Math.cos(t * 2.1 + p.ph) * 2.5;
        drawBall(ctx, dye.col, x, y, 7.5);
      });
      text(r.x + r.w / 2, yb + 24, '출발선', { size: 13, weight: 700, color: COL.muted });
      if (!PHONE) { D.arrow(r.x + 18, r.y + r.h - 60, r.x + 18, r.y + 64, { color: rgba(COL.water, 0.7), width: 3, head: 10 }); }
    });
  }
  function chDrawRes() {
    const R = CL.res;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(R.x + 14, R.y + 28, '🔎 관찰하기', { size: PHONE ? 15 : 15.5, weight: 800, color: COL.ink, align: 'left' });
    let msg;
    if (CH.phase === 'ready') msg = '검은색 잉크도 사실은 여러 색소가 섞인 혼합물이에요. 물에 담가 분리해 봐요!';
    else if (CH.phase === 'dipping' || CH.phase === 'running') msg = '색소마다 올라가는 빠르기가 달라요. 물에 잘 녹는 색소는 빨리, 종이에 잘 붙는 색소는 천천히 올라가요.';
    else msg = '색 띠의 색과 높이를 비교해요. 같은 색소 구성이면 같은 높이에 같은 색 띠가 생겨요.';
    wrapText(msg, R.w - 28, PHONE ? 13.5 : 14.5, 700).forEach((l, i) => text(R.x + 14, R.y + 54 + i * (PHONE ? 19 : 21), l, { size: PHONE ? 13.5 : 14.5, weight: 700, color: COL.ink, align: 'left' }));
    if (CH.phase === 'done' && !PHONE) {
      LANES.forEach((ln, i) => {
        const y = R.y + 150 + i * 17;
        text(R.x + 14, y + 5, ln.label, { size: 13, weight: 800, color: ln.id === 'E' ? COL.bad : COL.muted, align: 'left' });
        ln.dyes.slice().sort((a, b) => DYES[b].rf - DYES[a].rf).forEach((dk, k) => { drawBall(ctx, DYES[dk].col, R.x + 74 + k * 24, y, 7); });
        text(R.x + 74 + ln.dyes.length * 24 + 4, y + 5, ln.dyes.length + '가지', { size: 13, weight: 700, color: COL.muted, align: 'left' });
      });
    }
  }
  function chDraw(t) {
    panel(CL.app.x, CL.app.y, CL.app.w, CL.app.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    CH.frame = withFrame(CL.app, CG.w, CG.h, (sc) => chDrawApp(sc, t));
    chDrawLens(t); chDrawRes();
    if (isNew('chroma')) ringRect(CL.app, t);
  }
  function chRefresh() {
    const b = $('#chBtn'); if (!b) return;
    const busy = CH.phase === 'dipping' || CH.phase === 'running';
    b.textContent = CH.phase === 'ready' ? '💧 물에 담그기' : busy ? '⏳ 올라가는 중…' : '↺ 다시 하기';
    b.disabled = busy; b.classList.toggle('btn-primary', !busy);
    $$('#penSeg button').forEach((x) => x.classList.toggle('on', x.dataset.p === CH.pick));
    $('#chNote').textContent = CH.phase === 'ready' ? '종이 아래쪽 잉크 점을 물에 담가요. 물이 종이를 타고 올라가요.' : CH.phase === 'done' ? '증거 잉크와 같은 색 띠를 가진 사인펜을 골라요.' : '';
  }
  function chMain() {
    hideHint(); Sound.click();
    if (CH.phase === 'ready') { CH.phase = 'dipping'; CH.dip = 0; Sound.tone(360, 0.2, 'sine', 0.05); }
    else if (CH.phase === 'done') { chReset(); return; }
    chRefresh();
  }
  SC.chroma = {
    label: '🌈 크로마토그래피로 분리하기',
    hint: '💧 물에 담가 잉크 색소를 나눠 봐요',
    enter(reset) { if (reset || !CH.lp.length) chReset(); else chRefresh(); },
    update(dt) { chUpdate(dt); },
    draw(t) { chDraw(t); },
    refresh() { chRefresh(); },
    readouts() {
      $('#rCH').innerHTML = Math.round(CH.F * 0.3) + '<small>mm</small>';
      $('#rCT').innerHTML = Math.round(CH.phase === 'running' ? CH.t : CH.phase === 'done' ? CG.T : 0) + '<small>초</small>';
    },
  };
  $('#chBtn').addEventListener('click', chMain);
  $$('#penSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); CH.pick = b.dataset.p; chRefresh(); }));
  Object.assign(DBG, { CH, chReset, chMain, chUpdate, LANES, DYES, CG });


  /* =========================================================
     장면 ④-2: 분리 설계 — 모래 + 소금 + 철가루를 분리하는 순서를 카드로 설계하고 실행해 확인
       자석(철가루) · 물에 녹이고 거르기(소금 ↔ 모래) · 증발(소금 얻기)
     ========================================================= */
  const DMETH = [
    { id: 'magnet', icon: '🧲', name: '자석으로 끌어 당기기', sn: '자석', desc: '철가루가 달라붙어요', col: '#ef4444' },
    { id: 'filter', icon: '💧', name: '물에 녹이고 거르기', sn: '녹여 거르기', desc: '녹는 것과 안 녹는 것', col: '#0ea5e9' },
    { id: 'evap', icon: '🔥', name: '가열해 증발시키기', sn: '증발', desc: '물을 날려 보내요', col: '#f97316' },
    { id: 'funnel', icon: '🫙', name: '분별 깔때기로 나누기', sn: '분별 깔때기', desc: '섞이지 않는 액체', col: '#a16207' },
    { id: 'chroma', icon: '🌈', name: '크로마토그래피', sn: '크로마토', desc: '색소를 나눠요', col: '#8b5cf6' },
  ];
  const dmeth = (id) => DMETH.find((m) => m.id === id);
  const DGG = PHONE ? {
    mix: { x: 8, y: 8, w: 424, h: 66 }, slot: (i) => ({ x: 8, y: 82 + i * 108, w: 424, h: 100 }),
    tray: { x: 8, y: 414, w: 424, h: 112 }, res: { x: 8, y: 534, w: 424, h: 80 },
    home: (i) => ({ x: 53 + i * 83, y: 470 }), tw: 78, th: 92, sw: 120, sh: 66,
    slotCard: (i) => ({ x: 8 + 78, y: 82 + i * 108 + 50 }), scene: (i) => ({ x: 8 + 148, y: 82 + i * 108 + 6, w: 268, h: 88 }),
  } : {
    mix: { x: 16, y: 16, w: 196, h: 236 }, slot: (i) => ({ x: 228 + i * 190, y: 16, w: 168, h: 236 }),
    tray: { x: 16, y: 262, w: 768, h: 140 }, res: { x: 16, y: 412, w: 768, h: 132 },
    home: (i) => ({ x: 104 + i * 148, y: 332 }), tw: 136, th: 118, sw: 150, sh: 54,
    slotCard: (i) => ({ x: 228 + i * 190 + 84, y: 16 + 56 }), scene: (i) => ({ x: 228 + i * 190 + 8, y: 16 + 86, w: 152, h: 92 }),
  };
  const DG = { cards: [], plan: [null, null, null], drag: null, hot: -1, run: null, final: null, ran: false, sig: '', frame: 0 };
  const dgSig = () => DG.plan.join('|');
  function dgReset() {
    const order = ['filter', 'chroma', 'evap', 'magnet', 'funnel'];
    DG.cards = order.map((id, i) => { const h = DGG.home(i); return { m: id, i, x: h.x, y: h.y, s: 0, lift: 0, slot: -1, shake: -9, sz: 0 }; });
    DG.cards.forEach((c, i) => { if (RM) c.s = 1; else SciSim.tween(c, { s: 1 }, { duration: 0.4, delay: 0.05 * i, ease: 'outBack' }); });
    DG.plan = [null, null, null]; DG.drag = null; DG.hot = -1; DG.run = null; DG.final = null; DG.ran = false; DG.sig = '';
    dgRefresh();
  }
  function dgLayout(animate) {
    DG.cards.forEach((c) => {
      if (c === DG.drag) return;
      const q = c.slot >= 0 ? DGG.slotCard(c.slot) : DGG.home(c.i), sz = c.slot >= 0 ? 1 : 0;
      if (animate && !RM) SciSim.tween(c, { x: q.x, y: q.y, sz }, { duration: 0.4, ease: 'outBack' }); else { c.x = q.x; c.y = q.y; c.sz = sz; }
    });
  }
  const dgPlaced = () => DG.plan.filter(Boolean).length;
  function dgCardAt(p) {
    const list = DG.cards.slice().sort((a, b) => (a === DG.drag) - (b === DG.drag));
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i], w = lerp(DGG.tw, DGG.sw, c.sz), h = lerp(DGG.th, DGG.sh, c.sz);
      if (Math.abs(p.x - c.x) < w / 2 + 2 && Math.abs(p.y - c.y) < h / 2 + 2) return c;
    }
    return null;
  }
  const dgSlotAt = (p) => { for (let i = 0; i < 3; i++) if (inRect(p, DGG.slot(i), 4)) return i; return -1; };
  /* ---- 계획 판정 (무엇이 어디에 남는지 단계마다 계산) ---- */
  function dgSimulate(plan) {
    const st = { iron: 'dry', salt: 'dry', sand: 'dry' }, steps = [];
    plan.forEach((m, i) => {
      const r = { m, ok: false, msg: '', ironIn: st.iron === 'dry' || st.iron === 'residue', saltDry: st.salt === 'dry', saltSol: st.salt === 'solution', sandIn: true };
      if (m === 'magnet') {
        if (r.ironIn) { st.iron = 'got'; r.ok = true; r.msg = '자석에 철가루가 붙어 분리됐어요.'; } else r.msg = '자석에 붙을 철가루가 남아 있지 않아요.';
      } else if (m === 'filter') {
        if (st.salt === 'dry') {
          st.salt = 'solution'; st.sand = 'residue'; if (st.iron === 'dry') st.iron = 'residue';
          r.ok = true; r.msg = st.iron === 'residue' ? '소금은 녹고, 모래와 철가루는 거름종이에 남았어요.' : '소금은 녹고, 모래는 거름종이에 남았어요.';
        } else r.msg = '물에 녹일 소금이 남아 있지 않아요.';
      } else if (m === 'evap') {
        if (st.salt === 'solution') { st.salt = 'got'; r.ok = true; r.msg = '물이 날아가고 소금 결정이 남았어요.'; } else r.msg = '증발시킬 소금물이 없어요. 먼저 물에 녹여 걸러야 해요.';
      } else if (m === 'funnel') r.msg = '서로 섞이지 않는 두 액체가 없어서 쓸 수 없어요.';
      else if (m === 'chroma') r.msg = '분리할 색소가 없어서 쓸 수 없어요.';
      r.snap = Object.assign({}, st); steps.push(r);
    });
    const sandPure = st.sand === 'residue' && st.iron === 'got';
    const ok = st.iron === 'got' && st.salt === 'got' && sandPure;
    return { steps, st, ok, sandPure };
  }
  function dgCheck() {
    if (dgPlaced() < 3) return '카드 3장을 ①②③ 칸에 모두 놓아 보세요. (' + dgPlaced() + ' / 3)';
    if (!DG.final || DG.sig !== dgSig()) return '▶ 실행하기를 눌러 계획이 맞는지 확인해 보세요.';
    if (DG.final.ok) return true;
    const bad = DG.final.steps.findIndex((s) => !s.ok);
    if (bad >= 0) return ['①', '②', '③'][bad] + ' 단계: ' + DG.final.steps[bad].msg;
    return '아직 분리되지 않은 물질이 있어요. 순서를 바꿔 다시 실행해 보세요.';
  }
  function dgRun() {
    hideHint(); Sound.click();
    if (DG.run) return;
    if (dgPlaced() < 3) { toast('카드 3장을 모두 놓아야 실행할 수 있어요.', null, 2200); DG.hot = -2; schedule(0.8, () => { DG.hot = -1; }); return; }
    DG.final = dgSimulate(DG.plan); DG.sig = dgSig(); DG.run = { step: 0, t: 0, done: false };
    DG.cards.forEach((c) => { c.shake = -9; }); dgRefresh();
  }
  function dgUpdate(dt) {
    const R = DG.run; if (!R || R.done) return;
    R.t += dt;
    if (R.t >= 2.7) {
      Sound.tone(R.step === 0 ? 523 : R.step === 1 ? 659 : 784, 0.12, 'triangle', 0.06);
      R.t = 0; R.step++;
      if (R.step >= 3) { R.done = true; R.step = 3; DG.ran = true; if (DG.final.ok) { Sound.success(); } else Sound.fail(); dgRefresh(); }
    }
  }
  /* ---- 그리기 ---- */
  const GR = { sand: '#d9b27a', sandD: '#b98846', iron: '#4b5563', salt: '#ffffff' };
  function dgPile(x, y, w, h, t, o) {
    o = o || {}; let sd = 7;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const grains = [];
    for (let i = 0; i < 46; i++) grains.push([rnd(), rnd(), rnd()]);
    grains.forEach((g, i) => {
      const kind = i % 7 === 0 ? 'iron' : i % 3 === 0 ? 'salt' : 'sand';
      if (o.skip && o.skip[kind]) return;
      const px = x + 8 + g[0] * (w - 16), py = y + h - 6 - g[1] * g[1] * (h - 12) * (0.9 - Math.abs(g[0] - 0.5) * 0.9);
      if (kind === 'sand') { ctx.fillStyle = g[2] > 0.5 ? GR.sand : GR.sandD; circle(ctx, px, py, 3.1); ctx.fill(); }
      else if (kind === 'iron') { ctx.fillStyle = GR.iron; ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px, py - 3.4); ctx.lineTo(px + 3.4, py + 1); ctx.lineTo(px - 1, py + 3); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle = '#fff'; ctx.fillRect(px - 2.8, py - 2.8, 5.6, 5.6); ctx.strokeStyle = 'rgba(150,165,190,.9)'; ctx.lineWidth = 1; ctx.strokeRect(px - 2.8, py - 2.8, 5.6, 5.6); }
    });
  }
  function dgDrawMix(t) {
    const R = DGG.mix;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    if (PHONE) {
      text(R.x + 14, R.y + 28, '🧪 분리할 혼합물', { size: 15, weight: 800, color: COL.ink, align: 'left' });
      dgPile(R.x + 170, R.y + 12, 110, 44, t);
      const lg = [[GR.sand, '모래'], [GR.iron, '철가루'], ['#fff', '소금']];
      lg.forEach((q, i) => { ctx.fillStyle = q[0]; circle(ctx, R.x + 14 + i * 56 + 5, R.y + 52, 5); ctx.fill(); ctx.strokeStyle = 'rgba(150,165,190,.9)'; ctx.lineWidth = 1; ctx.stroke(); text(R.x + 24 + i * 56, R.y + 57, q[1], { size: 13, weight: 800, color: COL.ink, align: 'left' }); });
      return;
    }
    text(R.x + 14, R.y + 30, '🧪 분리할 혼합물', { size: 15.5, weight: 800, color: COL.ink, align: 'left' });
    ctx.save(); vgrad(ctx, R.x + 14, R.y + 50, R.w - 28, 110, '#f6efe2', '#e3d3b6'); ctx.restore();
    ctx.save(); ctx.beginPath(); D.roundRect(R.x + 14, R.y + 50, R.w - 28, 110, 12); ctx.clip(); dgPile(R.x + 14, R.y + 56, R.w - 28, 100, t); ctx.restore();
    ctx.strokeStyle = '#cdb994'; ctx.lineWidth = 2; D.roundRect(R.x + 14, R.y + 50, R.w - 28, 110, 12); ctx.stroke();
    [[GR.sand, '모래'], [GR.iron, '철가루'], ['#fff', '소금']].forEach((q, i) => {
      const y = R.y + 182 + i * 18; ctx.fillStyle = q[0]; circle(ctx, R.x + 24, y - 4, 5.5); ctx.fill(); ctx.strokeStyle = 'rgba(150,165,190,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
      text(R.x + 38, y, q[1], { size: 13.5, weight: 800, color: COL.ink, align: 'left' });
    });
  }
  /* 단계별 작은 장면: k = 0~1 */
  function dgScene(m, r, k, S) {
    ctx.save(); ctx.beginPath(); D.roundRect(S.x, S.y, S.w, S.h, 12); ctx.clip();
    ctx.fillStyle = '#f8fafd'; ctx.fillRect(S.x, S.y, S.w, S.h);
    const x0 = S.x, y0 = S.y, w = S.w, h = S.h, cx = x0 + w / 2;
    if (m === 'magnet') {
      const mg = k < 0.3 ? smooth(k / 0.3) : k < 0.72 ? 1 : 1 - smooth((k - 0.72) / 0.28), my = lerp(y0 + 14, y0 + h * 0.46, mg);
      dgPile(cx - w * 0.32, y0 + h - 40, w * 0.64, 36, 0, { skip: r.ironIn ? { iron: true } : null });
      if (r.ironIn) { for (let i = 0; i < 9; i++) { const px = cx - 22 + (i % 5) * 11, py0 = y0 + h - 12 - (i % 3) * 3, f = smooth(clamp((k - 0.28 - i * 0.02) / 0.4, 0, 1)); const py = lerp(py0, my + 20 + (i % 3) * 4, f), x = lerp(px, cx + (i % 5 - 2) * 6, f); ctx.fillStyle = GR.iron; ctx.beginPath(); ctx.moveTo(x - 3, py); ctx.lineTo(x, py - 3.4); ctx.lineTo(x + 3.4, py + 1); ctx.lineTo(x - 1, py + 3); ctx.closePath(); ctx.fill(); } }
      ctx.lineWidth = 11; ctx.lineCap = 'butt'; ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx, my + 6, 22, 0, Math.PI); ctx.stroke(); ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(cx - 22, my + 6); ctx.lineTo(cx - 22, my + 16); ctx.moveTo(cx + 22, my + 6); ctx.lineTo(cx + 22, my + 16); ctx.stroke();
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(cx - 22, my - 12); ctx.lineTo(cx - 22, my + 6); ctx.moveTo(cx + 22, my - 12); ctx.lineTo(cx + 22, my + 6); ctx.stroke();
    } else if (m === 'filter') {
      const bx = x0 + w * 0.3, by = y0 + h - 18, bw = 52, bh = 52, pour = smooth(clamp((k - 0.45) / 0.3, 0, 1)) * (1 - smooth(clamp((k - 0.85) / 0.15, 0, 1)));
      // 깔때기 + 플라스크
      const fx = x0 + w * 0.74;
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.6; ctx.fillStyle = 'rgba(228,241,255,.5)'; ctx.beginPath(); ctx.moveTo(fx - 24, by - 54); ctx.lineTo(fx + 24, by - 54); ctx.lineTo(fx + 3, by - 24); ctx.lineTo(fx + 3, by - 12); ctx.lineTo(fx - 3, by - 12); ctx.lineTo(fx - 3, by - 24); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx - 3, by - 26); ctx.lineTo(fx - 22, by - 52); ctx.lineTo(fx + 22, by - 52); ctx.lineTo(fx + 3, by - 26); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      if (k > 0.55 && r.sandIn) for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 3 === 0 && r.ironIn ? GR.iron : GR.sand; circle(ctx, fx - 9 + (i % 4) * 6, by - 32 + (i % 2) * 3, 2.8); ctx.fill(); }
      ctx.strokeStyle = '#8fa3bd'; ctx.beginPath(); ctx.moveTo(fx - 8, by - 12); ctx.lineTo(fx - 8, by - 4); ctx.lineTo(fx - 28, by + 14); ctx.lineTo(fx + 28, by + 14); ctx.lineTo(fx + 8, by - 4); ctx.lineTo(fx + 8, by - 12); ctx.stroke();
      const fl = clamp((k - 0.55) / 0.35, 0, 1); if (fl > 0) { ctx.fillStyle = 'rgba(130,190,250,.75)'; ctx.fillRect(fx - 24 + 4, by + 14 - 3 - fl * 9, 40, fl * 9); if (fl < 1 && Math.sin(k * 60) > 0) { ctx.fillStyle = 'rgba(130,190,250,.9)'; circle(ctx, fx, by - 8, 2.2); ctx.fill(); } }
      // 비커 (물 + 가루)
      const bxx = lerp(bx, fx - 34, pour), byy = lerp(by, by - 62, pour), ang = 0.9 * pour;
      ctx.save(); ctx.translate(bxx, byy); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(228,241,255,.55)'; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-bw / 2, -bh); ctx.lineTo(-bw / 2, 0); ctx.lineTo(bw / 2, 0); ctx.lineTo(bw / 2, -bh); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(130,190,250,.7)'; ctx.fillRect(-bw / 2 + 2, -bh * 0.6 * (1 - pour * 0.7), bw - 4, bh * 0.6 * (1 - pour * 0.7) - 2);
      const sink = smooth(clamp(k / 0.3, 0, 1));
      for (let i = 0; i < 8; i++) { const gx = -18 + (i % 4) * 11, gy0 = -bh - 14 - (i % 3) * 8, gy = lerp(gy0, -6 - (i % 2) * 4, sink); const isSalt = i % 3 === 0; if (isSalt && r.saltDry) { const dis = clamp((k - 0.2) / 0.25, 0, 1); if (dis >= 1) continue; ctx.globalAlpha = 1 - dis; ctx.fillStyle = '#fff'; ctx.fillRect(gx - 2.5, gy - 2.5, 5, 5); ctx.globalAlpha = 1; } else if (!isSalt) { ctx.fillStyle = i % 4 === 1 && r.ironIn ? GR.iron : GR.sand; circle(ctx, gx, gy, 3); ctx.fill(); } }
      ctx.restore();
    } else if (m === 'evap') {
      const dx = cx, dy = y0 + h - 28, rr = 38, lv = r.saltSol ? 1 - smooth(clamp((k - 0.1) / 0.65, 0, 1)) : 0;
      ctx.strokeStyle = '#6b7689'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(dx - 40, dy + 4); ctx.lineTo(dx - 52, y0 + h - 2); ctx.moveTo(dx + 40, dy + 4); ctx.lineTo(dx + 52, y0 + h - 2); ctx.stroke(); ctx.fillStyle = '#5b6678'; ctx.fillRect(dx - 46, dy + 2, 92, 4);
      // 불꽃
      const fl = D.flame(dx, y0 + h - 4, 24 + Math.sin(k * 30) * 2, k * 6);
      // 증발 접시
      ctx.beginPath(); ctx.moveTo(dx - rr, dy - 16); ctx.quadraticCurveTo(dx - rr + 4, dy, dx, dy); ctx.quadraticCurveTo(dx + rr - 4, dy, dx + rr, dy - 16); ctx.closePath(); ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.4; ctx.stroke();
      if (lv > 0.02) { ctx.save(); ctx.beginPath(); ctx.moveTo(dx - rr + 2, dy - 16); ctx.quadraticCurveTo(dx - rr + 6, dy - 2, dx, dy - 2); ctx.quadraticCurveTo(dx + rr - 6, dy - 2, dx + rr - 2, dy - 16); ctx.closePath(); ctx.clip(); ctx.fillStyle = 'rgba(130,190,250,.8)'; ctx.fillRect(dx - rr, dy - 2 - lv * 14, rr * 2, lv * 14 + 4); ctx.restore(); }
      if (r.saltSol) { const cr = smooth(clamp((k - 0.6) / 0.35, 0, 1)); for (let i = 0; i < 10; i++) { ctx.globalAlpha = cr; ctx.fillStyle = '#fff'; const px = dx - 18 + (i % 5) * 9, py = dy - 5 - Math.floor(i / 5) * 5; ctx.fillRect(px - 3, py - 3, 6, 6); ctx.strokeStyle = 'rgba(150,165,190,.9)'; ctx.lineWidth = 1; ctx.strokeRect(px - 3, py - 3, 6, 6); } ctx.globalAlpha = 1;
        for (let i = 0; i < 5; i++) { const ph = (k * 1.6 + i * 0.21) % 1; ctx.fillStyle = 'rgba(190,205,225,' + (0.55 * (1 - ph) * (lv > 0.05 ? 1 : 0.3)).toFixed(2) + ')'; circle(ctx, dx - 16 + i * 8 + Math.sin(ph * 6 + i) * 4, dy - 22 - ph * 50, 4 + ph * 5); ctx.fill(); } }
    } else {
      const s = 1 + Math.sin(k * 30) * 0.04;
      ctx.save(); ctx.translate(cx, y0 + h / 2 - 4); ctx.scale(s, s); text(0, 14, dmeth(m).icon, { size: 44 }); ctx.restore();
      text(cx, y0 + h - 14, '여기서는 쓸 수 없어요', { size: 13.5, weight: 800, color: '#b4232b' });
      ctx.strokeStyle = 'rgba(226,70,75,.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 24, y0 + h / 2 - 30); ctx.lineTo(cx + 24, y0 + h / 2 + 22); ctx.moveTo(cx + 24, y0 + h / 2 - 30); ctx.lineTo(cx - 24, y0 + h / 2 + 22); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; D.roundRect(S.x, S.y, S.w, S.h, 12); ctx.stroke();
  }
  function dgDrawSlot(i, t) {
    const R = DGG.slot(i), c = DG.cards.find((q) => q.slot === i), hov = DG.hot === i && DG.drag, run = DG.run, S = DGG.scene(i);
    panel(R.x, R.y, R.w, R.h, 16, hov ? '#f3efff' : '#fff', hov ? 18 : 10, 3, 'rgba(30,50,100,.16)');
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = rgba(COL.sub, hov ? 0.95 : DG.hot === -2 && !c ? 0.9 : 0.35); ctx.lineWidth = hov ? 3 : 2; D.roundRect(R.x + 5, R.y + 5, R.w - 10, R.h - 10, 13); ctx.stroke(); ctx.restore();
    const nb = ['①', '②', '③'][i];
    pill(R.x + (PHONE ? 22 : 24), R.y + (PHONE ? 20 : 22), nb, { bg: COL.sub, size: 15, pad: 8 });
    if (!c) { text(PHONE ? R.x + 96 : R.x + R.w / 2, PHONE ? R.y + 56 : R.y + 98, '카드를 여기에', { size: 14.5, weight: 800, color: '#a3adbd' }); if (hov) D.ring(R.x + R.w / 2, R.y + R.h / 2, 24, t, { color: COL.sub, width: 3 }); return; }
    // 실행 결과
    const fin = DG.final, doneStep = run ? (run.done || run.step > i) : (fin && DG.sig === dgSig() && DG.ran);
    const cur = run && !run.done && run.step === i, st = fin && fin.steps[i];
    if (st && (cur || doneStep || (!run && DG.ran && DG.sig === dgSig()))) {
      const k = cur ? clamp(run.t / 2.3, 0, 1) : 1;
      dgScene(c.m, st, k, S);
      if (!cur) {
        const col = st.ok ? '#0b6b39' : '#b4232b';
        wrapText((st.ok ? '✅ ' : '❌ ') + st.msg, PHONE ? 268 : R.w - 20, PHONE ? 13 : 13.5, 800).slice(0, PHONE ? 1 : 3).forEach((l, k2) => text(PHONE ? S.x + 6 : R.x + 12, PHONE ? S.y + S.h - 8 : S.y + S.h + 17 + k2 * 16, l, { size: PHONE ? 13 : 13.5, weight: 800, color: col, align: 'left', stroke: PHONE ? 'rgba(255,255,255,.9)' : null }));
      }
    } else {
      ctx.fillStyle = '#f8fafd'; D.roundRect(S.x, S.y, S.w, S.h, 12); ctx.fill();
      text(S.x + S.w / 2, S.y + S.h / 2 + (PHONE ? 4 : -2), dmeth(c.m).icon, { size: PHONE ? 30 : 44 });
      if (!PHONE) text(S.x + S.w / 2, S.y + S.h - 14, dmeth(c.m).desc, { size: 13.5, weight: 700, color: COL.muted });
    }
  }
  function dgDrawCard(c, t) {
    const m = dmeth(c.m), k = c.sz, w = lerp(DGG.tw, DGG.sw, k), h = lerp(DGG.th, DGG.sh, k), lift = c.lift, sc = Math.max(0.01, c.s) * (1 + 0.06 * lift);
    let dx = 0; if (t - c.shake < 0.5) dx = Math.sin((t - c.shake) * 42) * 6 * (1 - (t - c.shake) / 0.5);
    ctx.save(); ctx.translate(c.x + dx, c.y - lift * 6); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); }, { blur: 5 + lift * 12, y: 2 + lift * 7, color: 'rgba(20,40,80,.24)' });
    ctx.fillStyle = m.col; D.roundRect(-w / 2, -h / 2, w, 7, 5); ctx.fill();
    ctx.strokeStyle = rgba(m.col, 0.75); ctx.lineWidth = 2; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    if (k > 0.5) {
      text(-w / 2 + 26, 6, m.icon, { size: PHONE ? 26 : 26 });
      ctx.font = D.font(PHONE ? 13.5 : 14.5, 800); const nm = PHONE ? m.sn : m.sn, room = w - 62, nw = ctx.measureText(nm).width;
      text(-w / 2 + 48, 5.5, nm, { size: nw > room ? Math.max(12, (PHONE ? 13.5 : 14.5) * room / nw) : (PHONE ? 13.5 : 14.5), weight: 800, color: COL.ink, align: 'left' });
    } else if (PHONE) {
      text(0, -6, m.icon, { size: 30 }); text(0, 24, m.sn, { size: 13, weight: 800, color: COL.ink });
    } else {
      text(0, -14, m.icon, { size: 36 });
      wrapText(m.name, w - 18, 14.5, 800).slice(0, 2).forEach((l, i, a) => text(0, 20 + i * 18 - (a.length - 1) * 9, l, { size: 14.5, weight: 800, color: COL.ink }));
      text(0, h / 2 - 12, m.desc, { size: 13, weight: 700, color: COL.muted });
    }
    ctx.restore();
  }
  function dgDrawRes(t) {
    const R = DGG.res; panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    const run = DG.run, fin = DG.final;
    let snap = { iron: 'dry', salt: 'dry', sand: 'dry' };
    if (fin && run) snap = run.done ? fin.st : run.step >= 1 ? fin.steps[run.step - 1].snap : snap;
    const prods = [
      ['🧲', '철가루', snap.iron === 'got' ? ['✅ 분리됨', '#0b6b39'] : snap.iron === 'residue' ? ['모래와 섞여 있음', '#b45309'] : ['섞여 있음', COL.muted]],
      ['🏖️', '모래', snap.sand === 'residue' && snap.iron === 'got' ? ['✅ 분리됨', '#0b6b39'] : snap.sand === 'residue' ? ['철가루가 섞여 있음', '#b45309'] : ['섞여 있음', COL.muted]],
      ['🧂', '소금', snap.salt === 'got' ? ['✅ 분리됨', '#0b6b39'] : snap.salt === 'solution' ? ['물에 녹아 있음', '#0369a1'] : ['섞여 있음', COL.muted]],
    ];
    text(R.x + 14, R.y + 28, PHONE ? '📦 얻은 물질' : '📦 얻은 물질 (분리 결과)', { size: 15, weight: 800, color: COL.ink, align: 'left' });
    const cw = PHONE ? 134 : 236, gap = PHONE ? 6 : 14, x0 = R.x + 10, y0 = R.y + (PHONE ? 38 : 44);
    prods.forEach((p, i) => {
      const x = x0 + i * (cw + gap), h = PHONE ? 38 : 50;
      ctx.fillStyle = '#f5f7fb'; D.roundRect(x, y0, cw, h, 12); ctx.fill();
      text(x + 22, y0 + h / 2 + 8, p[0], { size: PHONE ? 20 : 26 });
      text(x + (PHONE ? 38 : 48), y0 + (PHONE ? 16 : 21), p[1], { size: PHONE ? 13 : 14.5, weight: 800, color: COL.ink, align: 'left' });
      text(x + (PHONE ? 38 : 48), y0 + (PHONE ? 33 : 41), p[2][0], { size: 13, weight: 800, color: p[2][1], align: 'left' });
    });
    let msg = '카드를 놓고 ▶ 실행하기를 눌러 보세요.', col = COL.muted;
    if (run && !run.done) msg = ['①', '②', '③'][run.step] + ' 단계를 실행하는 중…', col = COL.sub;
    else if (fin && run && run.done) { msg = fin.ok ? '🎉 세 가지 물질을 모두 분리했어요!' : '아직 다 분리하지 못했어요. 순서와 방법을 바꿔 보세요.'; col = fin.ok ? '#0b6b39' : '#b4232b'; }
    if (!PHONE) text(R.x + 14, R.y + R.h - 14, msg, { size: 15, weight: 800, color: col, align: 'left' }); else text(R.x + 14, R.y + R.h - 10, msg, { size: 13.5, weight: 800, color: col, align: 'left' });
  }
  function dgDraw(t) {
    dgDrawMix(t);
    for (let i = 0; i < 3; i++) dgDrawSlot(i, t);
    for (let i = 0; i < 2; i++) { const a = DGG.slot(i), b = DGG.slot(i + 1); if (!PHONE) D.arrow(a.x + a.w + 4, a.y + a.h / 2, b.x - 4, a.y + a.h / 2, { color: rgba(COL.sub, 0.6), width: 4, head: 11 }); else D.arrow(a.x + a.w / 2, a.y + a.h + 1, a.x + a.w / 2, b.y - 1, { color: rgba(COL.sub, 0.6), width: 3, head: 8 }); }
    const T = DGG.tray; panel(T.x, T.y, T.w, T.h, 16, '#eef2fa', 10, 3, 'rgba(30,50,100,.14)');
    text(T.x + 14, T.y + 22, '🃏 방법 카드', { size: PHONE ? 13 : 14, weight: 800, color: COL.muted, align: 'left' });
    DG.cards.forEach((c) => { if (c.slot < 0 && c !== DG.drag) { const h = DGG.home(c.i); ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(140,155,185,.35)'; ctx.lineWidth = 1.5; D.roundRect(h.x - DGG.tw / 2, h.y - DGG.th / 2, DGG.tw, DGG.th, 12); ctx.stroke(); ctx.restore(); } });
    dgDrawRes(t);
    const order = DG.cards.slice().sort((a, b) => (a === DG.drag) - (b === DG.drag) || a.sz - b.sz);
    order.forEach((c) => dgDrawCard(c, t));
    if (isNew('design') && !DG.drag) ringRect(DGG.tray, t);
  }
  function dgRefresh() {
    const b = $('#dgRun'); if (!b) return;
    const busy = DG.run && !DG.run.done;
    b.textContent = busy ? '⏳ 실행 중…' : DG.ran && DG.sig === dgSig() ? '▶ 다시 실행하기' : '▶ 실행하기'; b.disabled = !!busy;
    $('#dgClear').disabled = !!busy;
  }
  SC.design = {
    label: '📐 분리 방법 설계하기',
    hint: '🃏 카드를 끌어 ①②③ 칸에 순서대로 놓아요',
    enter(reset) { if (reset || !DG.cards.length) { dgReset(); dgLayout(false); } else dgRefresh(); },
    update(dt) { dgUpdate(dt); },
    draw(t) { dgDraw(t); },
    hover(p) { return dgCardAt(p) && !(DG.run && !DG.run.done) ? 'grab' : null; },
    grab(p) { return !!dgCardAt(p) && !(DG.run && !DG.run.done); },
    down(p) {
      if (DG.run && !DG.run.done) return false;
      const c = dgCardAt(p); if (!c) return false;
      DG.drag = c; c.offX = p.x - c.x; c.offY = p.y - c.y; c.sx = p.x; c.sy = p.y; c.moved = false;
      SciSim.tween(c, { lift: 1 }, { duration: 0.15, ease: 'outQuad' }); Sound.click(); return true;
    },
    move(p) {
      const c = DG.drag; if (!c) return;
      if (!c.moved && Math.hypot(p.x - c.sx, p.y - c.sy) > 7) { c.moved = true; if (c.slot >= 0) { DG.plan[c.slot] = null; c.prev = c.slot; c.slot = -1; } }
      if (!c.moved) return;
      c.x = clamp(p.x - c.offX, 20, VW - 20); c.y = clamp(p.y - c.offY, 20, VH - 20); DG.hot = dgSlotAt({ x: c.x, y: c.y });
    },
    up(p) {
      const c = DG.drag; if (!c) return; DG.drag = null; const hot = DG.hot; DG.hot = -1;
      SciSim.tween(c, { lift: 0 }, { duration: 0.22 });
      if (!c.moved) {                                             // 탭: 칸에 있던 카드는 카드 모음으로 돌려보냄
        if (c.slot >= 0) { DG.plan[c.slot] = null; c.slot = -1; Sound.tick(); }
      } else {
        const s = dgSlotAt({ x: c.x, y: c.y });
        if (s >= 0) {
          const other = DG.cards.find((q) => q.slot === s && q !== c);
          if (other) { other.slot = c.prev != null && c.prev >= 0 ? c.prev : -1; if (other.slot >= 0) DG.plan[other.slot] = other.m; }
          c.slot = s; DG.plan[s] = c.m; Sound.tone(620, 0.07, 'triangle', 0.05);
          FX.burst(c.x, c.y, { count: 7, speed: 90, life: 0.5, size: 2.6, colors: ['#ffffff', COL.sub], gravity: 80 });
        } else if (c.prev != null && c.prev >= 0) { /* 칸 밖으로 끌어내면 카드 모음으로 */ }
      }
      c.prev = null; dgLayout(true);
      if (DG.sig !== dgSig()) { DG.run = null; DG.final = null; DG.ran = false; }
      dgRefresh();
    },
    refresh() { dgRefresh(); },
    readouts() {
      $('#rGS').innerHTML = dgPlaced() + '<small>/ 3개</small>';
      const f = DG.final, done = f && DG.ran && DG.sig === dgSig();
      $('#rGP').textContent = done ? [f.st.iron === 'got' ? '철가루' : '', f.st.sand === 'residue' && f.st.iron === 'got' ? '모래' : '', f.st.salt === 'got' ? '소금' : ''].filter(Boolean).join('·') || '없음' : '-';
    },
  };
  $('#dgRun').addEventListener('click', dgRun);
  $('#dgClear').addEventListener('click', () => { Sound.click(); if (DG.run && !DG.run.done) return; DG.plan = [null, null, null]; DG.cards.forEach((c) => { c.slot = -1; }); DG.run = null; DG.final = null; DG.ran = false; DG.sig = ''; dgLayout(true); dgRefresh(); });
  Object.assign(DBG, { DG, DGG, dgReset, dgLayout, dgRun, dgCheck, dgSimulate, dgPlaced, DMETH });


  /* =========================================================
     장면 전환 · UI · 입력
     ========================================================= */
  const hintEl = $('#stageHint');
  function showHint(t, ms) { hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5200); }
  function hideHint() { hintEl.classList.add('hide'); }
  const ready = {};
  function setScene(name, reset) {
    const changed = S.scene !== name;
    if (changed && SC[S.scene] && SC[S.scene].leave) SC[S.scene].leave();
    S.scene = name;
    if (changed) { S.sceneT = 0; FX.clear(); AFX.clear(); DR.fn = null; }
    if (reset || !ready[name]) { SC[name].enter(true); ready[name] = true; } else if (changed && SC[name].enter) SC[name].enter(false);
    $('#tbLabel').textContent = SC[name].label;
    if (changed || reset) showHint(SC[name].hint, 6500);
    refreshUI();
  }
  let lastFree = null;
  function refreshUI() {
    $$('[data-sc]').forEach((node) => {
      const scs = node.getAttribute('data-sc').split(/\s+/);
      node.hidden = scs.indexOf(S.scene) < 0;
    });
    const card = $('#ctrlCard');
    card.hidden = !card.querySelector('.control:not([hidden])');
    const ro = $('#readouts');
    ro.hidden = !ro.querySelector('.readout:not([hidden])');
    const free = !!(game && game.free);
    $('#sceneSeg').hidden = !free;
    $('#tbLabel').hidden = free && window.innerWidth < 1000;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    if (SC[S.scene] && SC[S.scene].refresh) SC[S.scene].refresh();
    lastFree = free;
  }
  $('#resetBtn').addEventListener('click', () => { Sound.click(); SC[S.scene].enter(true); S.sceneT = 0; FX.clear(); AFX.clear(); showHint(SC[S.scene].hint, 5000); refreshUI(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  SciSim.pointer(view, {
    hover(p) { const s = SC[S.scene]; return s && s.hover ? s.hover(p) : null; },
    down(p, e) { hideHint(); const s = SC[S.scene]; if (s && s.down && s.down(p, e)) { DR.fn = s; return true; } return false; },
    move(p, e) { if (DR.fn && DR.fn.move) DR.fn.move(p, e); },
    up(p, e) { const s = DR.fn; DR.fn = null; if (s && s.up) s.up(p, e); },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0], s = SC[S.scene];
      if (!tc || !s || !s.grab) return;
      if (s.grab(view.toLocal(tc))) e.preventDefault();
    }, { passive: false });
  }

  /* =========================================================
     갱신 · 그리기 · 루프
     ========================================================= */
  let lastDt = 0.016;
  function update(dt) {
    S.sceneT += dt;
    FX.update(dt); AFX.update(dt);
    for (let i = later.length - 1; i >= 0; i--) if (later[i].at <= now()) { const f = later[i].fn; later.splice(i, 1); f(); }
    const s = SC[S.scene];
    if (s && s.update) s.update(dt);
  }
  function draw(t) {
    view.clear(BG);
    const s = SC[S.scene];
    if (s && s.draw) s.draw(t);
    AFX.draw(ctx);
    FX.draw(ctx);
    drawChecks(lastDt);
    if (S.sceneT < 0.35) { ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.35); ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); ctx.restore(); }
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
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (lastFree !== !!(game && game.free)) refreshUI();
    const s = SC[S.scene];
    if (s && s.readouts) s.readouts();
  }

  setScene('distill', true);

  /* =========================================================
     미션
     ========================================================= */
  const dsOk = () => DS.tubes.some((tb) => dsVol(tb) >= 10 && dsFrac(tb) >= 0.85) && DS.maxT >= 88;
  const dsStatus = () => {
    const part = DS.tubes.map((tb, i) => (dsVol(tb) >= 0.5 ? TUBE_NAME[i] + ' <b>' + (Math.round(dsVol(tb) * 10) / 10).toFixed(1) + ' mL</b>(에탄올 ' + Math.round(dsFrac(tb) * 100) + '%)' : '')).filter(Boolean).join(' · ');
    return '지금 <b>' + (Math.round(DS.T * 10) / 10).toFixed(1) + ' °C</b> · ' + (part || '아직 모은 액체가 없어요') + '<br>에탄올 85% 이상 10 mL ' + mark(DS.tubes.some((tb) => dsVol(tb) >= 10 && dsFrac(tb) >= 0.85)) + ' · 온도가 오르는 구간까지 관찰 ' + mark(DS.maxT >= 88);
  };
  const chCheck = () => {
    if (CH.phase !== 'done') return '먼저 💧 물에 담가 크로마토그래피를 끝까지 해 보세요.';
    if (!CH.pick) return '증거 잉크와 같은 색 띠를 가진 사인펜(A, B, C)을 골라요.';
    if (CH.pick === 'B') return true;
    return CH.pick === 'A' ? 'A는 노랑·파랑 2가지 색소뿐이라서 증거 잉크(3가지)와 달라요.' : 'C는 가장 위쪽 띠가 주황색이에요. 증거 잉크는 노란색 띠예요. 같은 검은색이어도 색소 구성이 달라요.';
  };
  // 퀴즈 그림: 원유 분별 증류탑
  const FIG_TOWER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 252" width="320" role="img" aria-label="원유 분별 증류탑: 위에서 아래로 ㉠ LPG, ㉡ 휘발유, ㉢ 등유, ㉣ 경유, ㉤ 중유를 얻는다. 아래쪽일수록 온도가 높다.">' +
    '<defs><linearGradient id="twg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset="0.5" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff7a59"/></linearGradient></defs>' +
    '<rect width="320" height="252" rx="12" fill="#f6f9ff"/>' +
    '<rect x="112" y="14" width="76" height="224" rx="14" fill="url(#twg)" stroke="#475569" stroke-width="3"/>' +
    '<g stroke="#fff" stroke-width="2.5" stroke-dasharray="7 5" opacity=".9"><path d="M114 60H186M114 102H186M114 144H186M114 186H186"/></g>' +
    '<g stroke="#475569" stroke-width="3.5" stroke-linecap="round"><path d="M188 38H214M188 80H214M188 122H214M188 164H214M188 206H214"/></g>' +
    '<g font-size="14" font-weight="800" fill="#1b2333"><text x="220" y="43">㉠ LPG</text><text x="220" y="85">㉡ 휘발유</text><text x="220" y="127">㉢ 등유</text><text x="220" y="169">㉣ 경유</text><text x="220" y="211">㉤ 중유</text></g>' +
    '<path d="M18 214H108" stroke="#e2464b" stroke-width="5" stroke-linecap="round"/><path d="M100 206L112 214L100 222Z" fill="#e2464b"/>' +
    '<text x="16" y="200" font-size="13" font-weight="800" fill="#b4232b">가열한 원유</text>' +
    '<text x="16" y="34" font-size="13" font-weight="800" fill="#2563eb">온도 낮음</text><text x="16" y="246" font-size="13" font-weight="800" fill="#b4232b">온도 높음</text></svg>';

  game = SciSim.game({
    simId: 'm2-separation',
    mount: '#game',
    badge: '분리 설계사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      distill: '⚗️ 증류 장치와 가열 곡선',
      funnel: '🫙 분별 깔때기',
      recrys: '❄️ 재결정 장치와 용해도 곡선',
      chroma: '🌈 크로마토그래피',
      design: '📐 분리 방법 카드',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.scene) setScene(m.scene, false);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '끓는점 차이로 분리하기', short: '끓는점 차', icon: '⚗️', phase: '실험',
        features: ['distill'],
        intro: '<p class="si-q">❓ 탐구 질문: 섞여 있는 물질을 다시 따로따로 나누려면 어떤 특성을 이용할까?</p>' +
          '<p>물과 에탄올이 섞인 혼합물을 가열해 봐요. 끓는점이 <b>낮은 물질</b>이 먼저 끓어 나오고, 이 증기를 냉각기에서 식히면 액체로 모여요. 이렇게 끓는점 차이로 분리하는 방법이 <b>증류</b>예요.</p>',
        setup() { setScene('distill', true); },
        recap: '끓는점이 낮은 에탄올이 먼저 끓어 나와 따로 모여요. 이렇게 <b>끓는점 차이</b>로 혼합물을 분리하는 방법이 <b>증류</b>예요.',
        summary: '<ul><li><b>증류</b>: 혼합물을 가열해 <b>끓는점이 낮은 물질</b>을 먼저 끓여 내고, 그 증기를 냉각해 액체로 얻는 방법이에요.</li>' +
          '<li>에탄올(약 78 °C)과 물(100 °C)의 혼합물을 가열하면 에탄올이 많은 액체가 먼저 나오고, 에탄올이 줄면 온도가 올라가며 물이 나와요. 시험관을 바꿔 가며 받으면 따로 얻어요.</li>' +
          '<li>원유는 분별 증류탑에서 끓는점 차이로 LPG · 휘발유 · 등유 · 경유 · 중유로 나눠요. (탑의 아래쪽일수록 끓는점이 높은 성분)</li></ul>',
        missions: [
          {
            title: '에탄올 먼저 모으기', scene: 'distill',
            goal: '혼합물을 가열해서 <b>에탄올이 많은 액체(85 % 이상)를 10 mL 이상</b> 모으세요. 온도가 오르기 시작하면 시험관을 바꿔 받아요.',
            hint: '🔥 가열하기를 누르고 ⏩ 빠르게를 켜도 돼요. 온도가 80 °C 근처에서 거의 일정한 동안 에탄올이 나와요. 온도가 더 오르기 시작하면 A에서 B 시험관으로 바꿔요.',
            setup() { dsReset(); },
            check: dsOk, hold: 0.8, status: dsStatus,
            onWin() { celebrate(PHONE ? 380 : 460, PHONE ? 60 : 70); },
            explain: '에탄올의 끓는점(약 78 °C)이 물(100 °C)보다 낮아서 에탄올이 먼저 끓어 나왔어요. 온도가 80 °C 근처에서 거의 일정한 동안 에탄올이 많은 액체가 모였고, 에탄올이 줄자 온도가 올라가며 물이 섞여 나왔어요. 이렇게 <b>끓는점 차이</b>를 이용하면 혼합물을 분리할 수 있어요.',
          },
          {
            type: 'quiz', title: '증류의 원리', scene: 'distill',
            goal: '물과 에탄올 혼합물을 증류할 때 에탄올이 <b>먼저</b> 나온 까닭은 무엇일까요?',
            choices: ['에탄올의 끓는점이 물보다 낮기 때문이다', '에탄올의 밀도가 물보다 크기 때문이다', '에탄올의 용해도가 물보다 크기 때문이다', '에탄올이 물보다 색이 옅기 때문이다'],
            answer: 0,
            feedback: ['', '밀도는 층을 나누는 분리(분별 깔때기)에서 쓰는 특성이에요. 증류는 끓는 온도의 차이를 이용해요.', '용해도는 결정을 얻는 분리(재결정)에서 쓰는 특성이에요.', '에탄올과 물은 둘 다 무색이에요. 색깔은 분리의 근거가 되지 못해요.'],
            explain: '혼합물을 가열하면 <b>끓는점이 낮은 물질</b>이 먼저 기체가 돼요. 이 증기를 냉각해 액체로 모으는 것이 증류예요.',
          },
          {
            type: 'quiz', title: '원유의 분별 증류', scene: 'distill',
            goal: '원유를 가열해 분별 증류탑에 넣으면 끓는점 차이로 여러 성분이 나뉘어요. 그림에서 <b>끓는점이 가장 높은 성분</b>을 얻는 곳은?',
            figure: FIG_TOWER,
            choices: ['㉠ (맨 위 · LPG)', '㉢ (가운데 · 등유)', '㉤ (맨 아래 · 중유)', '모든 곳의 끓는점이 같다'],
            answer: 2,
            feedback: ['맨 위에서는 온도가 낮은 곳까지 올라가서야 액체가 되는, 끓는점이 가장 낮은 성분을 얻어요.', '가운데 성분은 끓는점이 중간 정도예요.', '', '끓는점이 같다면 한 곳에서 한꺼번에 나와서 분리되지 않아요.'],
            explain: '끓는점이 높은 성분은 탑의 <b>아래쪽(온도가 높은 곳)</b>에서 먼저 액체가 되고, 끓는점이 낮은 성분은 <b>위쪽</b>까지 올라가야 액체가 돼요. 그래서 중유가 맨 아래, LPG가 맨 위에서 나와요.',
          },
        ],
      },
      {
        title: '밀도 차이로 분리하기', short: '밀도 차', icon: '🫙', phase: '실험',
        features: ['funnel'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 끓는점 차이로 섞여 있는 액체를 분리했어요.</div>' +
          '<p>이번에는 서로 섞이지 않는 <b>물</b>과 <b>식용유</b>를 분리해 봐요. 두 액체는 밀도(물 1.0, 식용유 약 0.92 g/cm³)가 달라서 가만히 두면 <b>층</b>이 나뉘어요. <b>분별 깔때기</b>로 아래층부터 따라 내요.</p>',
        setup() { setScene('funnel', true); },
        recap: '밀도가 큰 물은 아래층, 밀도가 작은 식용유는 위층에 떠요. <b>밀도 차이</b>를 이용하면 섞이지 않는 액체를 분리할 수 있어요.',
        summary: '<ul><li>서로 섞이지 않는 액체는 <b>밀도 차이</b>로 분리해요. 밀도가 작은 식용유(약 0.92 g/cm³)는 위층, 큰 물(1.0 g/cm³)은 아래층이에요.</li>' +
          '<li>분별 깔때기의 꼭지를 열면 아래층(물)이 먼저 나와요. 위층(식용유)이 나오기 전에 꼭지를 닫아야 순수하게 얻어요.</li>' +
          '<li>생활 속 사례: 소금물로 볍씨 고르기, 사금 채취, 바다에 유출된 기름을 오일펜스로 모으기</li></ul>',
        missions: [
          {
            title: '아래층(물)만 받기', scene: 'funnel',
            goal: '깔때기 속 액체가 두 <b>층</b>으로 나뉘면 꼭지를 열어 <b>물만</b> 받으세요. 식용유가 나오기 전에 꼭지를 닫아요!',
            hint: '아직 섞여 있다면 조금 기다려요. 층이 나뉘면 🚰 꼭지 열기 → 물이 거의 다 내려가면 곧바로 🔒 꼭지 닫기!',
            setup() { fnReset(false); },
            check: () => FN.bw >= 50 && FN.bo <= 1 && !FN.cock, hold: 0.8,
            status: () => '받은 물 <b>' + (Math.round(FN.bw * 10) / 10).toFixed(1) + ' / 60 mL</b> · 섞인 식용유 <b>' + (Math.round(FN.bo * 10) / 10).toFixed(1) + ' mL</b>' + (FN.bo > 1 ? ' ❌ ↺ 다시 해 보세요' : ''),
            onWin() { celebrate(PHONE ? 220 : FL.got.x + FL.got.w / 2, PHONE ? 500 : 150); },
            explain: '밀도가 큰 물이 아래층, 밀도가 작은 식용유가 위층이라서 꼭지를 열면 물이 먼저 나와요. 이렇게 <b>밀도 차이</b>를 이용하면 서로 섞이지 않는 액체를 분리할 수 있어요.',
          },
          {
            type: 'quiz', title: '생활 속 밀도 차이', scene: 'funnel',
            goal: '다음 중 <b>밀도 차이</b>를 이용해 혼합물을 분리하는 사례가 <b>아닌</b> 것은?',
            choices: ['소금물에 볍씨를 넣어 가라앉은 튼튼한 볍씨를 고른다', '접시에 모래와 물을 넣고 흔들어 가벼운 모래는 흘려보내고 사금을 가려낸다', '바다에 기름이 유출되었을 때 오일펜스로 물 위에 뜬 기름을 모은다', '바닷물을 증발시켜 소금을 얻는다'],
            answer: 3,
            feedback: ['쭉정이는 가벼워 뜨고 튼튼한 볍씨는 가라앉는 밀도 차이를 이용해요.', '밀도가 큰 사금은 가라앉고 가벼운 모래는 물과 함께 흘러가요.', '기름은 물보다 밀도가 작아 물 위에 떠요. 그래서 오일펜스로 둘러 걷어 낼 수 있어요.', ''],
            explain: '바닷물에서 소금을 얻을 때는 물이 증발하고 소금만 남는 성질의 차이를 이용해요. 볍씨 고르기, 사금 채취, 오일펜스는 모두 <b>밀도 차이</b>를 이용한 사례예요.',
          },
        ],
      },
      {
        title: '용해도 차이로 분리하기', short: '용해도 차', icon: '❄️', phase: '실험',
        features: ['recrys'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 밀도 차이로 섞이지 않는 액체를 분리했어요.</div>' +
          '<p>이번에는 둘 다 물에 녹는 <b>질산 칼륨</b>과 <b>염화 나트륨</b>이 섞인 가루를 나눠 봐요. 온도가 내려가면 질산 칼륨은 녹을 수 있는 양이 크게 줄지만 염화 나트륨은 거의 그대로예요(<b>용해도 차이</b>). 이 방법을 <b>재결정</b>이라고 해요.</p>',
        setup() { setScene('recrys', true); },
        recap: '온도에 따른 <b>용해도 차이</b>로, 식힐 때 질산 칼륨만 결정이 되어 나와요. 거르면 순수한 결정을 얻는 <b>재결정</b>이에요.',
        summary: '<ul><li><b>재결정</b>: 온도에 따른 <b>용해도 차이</b>를 이용해 혼합물에서 한 물질만 결정으로 얻는 방법이에요.</li>' +
          '<li>질산 칼륨은 온도가 낮아지면 용해도가 크게 줄어 결정이 되고, 염화 나트륨은 용해도가 거의 변하지 않아 녹아 있어요. 거르면 순수한 질산 칼륨 결정이 걸러져요.</li>' +
          '<li>더 낮은 온도로 식힐수록 결정이 더 많이 얻어져요. (물 100 g에 100 g을 녹였다가 20 °C로 식히면 약 68 g)</li></ul>',
        missions: [
          {
            title: '냉각해 순수한 결정 얻기', scene: 'recrys',
            goal: '혼합물을 가열해 녹인 뒤 식혀서 <b>질산 칼륨 결정을 60 g 이상</b> 얻고 거르세요.',
            hint: '🔥 가열해서 녹이기 → ❄️ 식히기(식힐 온도를 20 °C쯤으로) → 🧻 거르기. 그래프의 보라색 막대가 결정이 되는 양이에요.',
            setup() { rcReset(); },
            check: () => RC.phase === 'done' && RC.keptG >= 60, hold: 0.8,
            status: () => '단계 <b>' + ({ ready: '준비', adding: '넣는 중', heating: '녹이는 중', hot: '모두 녹음', cooling: '식히는 중', cool: '식힘', filtering: '거르는 중', done: '거르기 끝' }[RC.phase]) + '</b> · ' + (RC.phase === 'done' ? '얻은 결정 <b>' + (Math.round(RC.keptG * 10) / 10) + ' g</b> ' + mark(RC.keptG >= 60) : '지금 결정 <b>' + (Math.round(rcSolid() * 10) / 10) + ' g</b>'),
            onWin() { celebrate(PHONE ? 300 : 120, PHONE ? 100 : 130); },
            explain: '질산 칼륨은 온도가 내려가면 용해도가 크게 줄어서 남는 양이 결정으로 나왔어요. 염화 나트륨(5 g)은 용해도가 거의 변하지 않아 계속 녹아 있어서, 거르면 <b>순수한 질산 칼륨 결정</b>만 얻어요.',
          },
          {
            type: 'quiz', title: '질산 칼륨만 결정이 된 까닭', scene: 'recrys',
            goal: '식혔더니 질산 칼륨만 결정으로 나오고 염화 나트륨은 나오지 않았어요. 그 까닭으로 알맞은 것은?',
            choices: ['온도에 따른 용해도 변화가 질산 칼륨은 크고 염화 나트륨은 작기 때문이다', '염화 나트륨은 물에 전혀 녹지 않기 때문이다', '질산 칼륨은 밀도가 커서 가라앉기 때문이다', '질산 칼륨은 끓는점이 낮아서 증발하기 때문이다'],
            answer: 0,
            feedback: ['', '염화 나트륨도 물에 잘 녹아요(20 °C에서 약 35.9 g). 넣은 5 g은 모두 녹아 있었어요.', '결정이 가라앉는 것은 맞지만, 결정이 생기는 까닭은 용해도 변화예요.', '증발해서 사라진 것이 아니라, 녹을 수 있는 양이 줄어서 결정이 된 거예요.'],
            explain: '온도가 내려가면 질산 칼륨은 녹을 수 있는 양이 <b>크게</b> 줄어 넘치는 만큼 결정이 돼요. 염화 나트륨은 녹을 수 있는 양이 <b>거의 변하지 않아서</b> 거른 용액에 그대로 녹아 있어요.',
          },
        ],
      },
      {
        title: '크로마토그래피와 분리 설계', short: '크로마토', icon: '🌈', phase: '적용',
        features: ['chroma', 'design'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 끓는점 · 밀도 · 용해도의 차이로 혼합물을 나눴어요.</div>' +
          '<p>🌈 아주 적은 양의 색소 혼합물은 <b>크로마토그래피</b>로 분리해요. 성분마다 종이를 타고 올라가는 속도가 달라요. 그리고 📐 여러 물질이 섞인 혼합물을 나누는 방법을 직접 <b>설계</b>해 봐요.</p>',
        setup() { setScene('chroma', true); },
        recap: '크로마토그래피는 성분마다 <b>이동 속도가 달라</b> 분리돼요. 혼합물을 나눌 때는 물질의 <b>특성 차이</b>를 찾아 알맞은 방법과 순서를 정해요.',
        summary: '<ul><li><b>크로마토그래피</b>: 성분마다 종이를 타고 이동하는 속도가 달라서 색 띠로 분리되는 방법이에요. 잉크 색소 분석, 식품 색소 분석, 도핑 검사 등에 쓰여요.</li>' +
          '<li><b>분리 설계</b>: 혼합물을 이루는 물질의 <b>특성 차이</b>(자석에 붙는 성질, 물에 녹는 성질, 끓는점 등)를 찾아 순서를 정해요. 예) 모래 + 소금 + 철가루 → 자석 → 물에 녹여 거르기 → 증발</li>' +
          '<li>분리 방법과 이용하는 특성: 증류 — 끓는점 차 / 분별 깔때기 — 밀도 차 / 재결정 — 용해도 차 / 크로마토그래피 — 이동 속도 차</li></ul>',
        missions: [
          {
            title: '증거 잉크의 주인 찾기', scene: 'chroma', manual: true,
            goal: '크로마토그래피로 <b>증거 잉크</b>와 사인펜 A·B·C의 색소를 분리하고, 증거 잉크와 같은 색 띠를 가진 사인펜을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
            hint: '💧 물에 담그기를 누르고 끝까지 기다려요. 색 띠의 색과 높이가 모두 같은 사인펜이 증거 잉크와 같은 잉크예요.',
            setup() { chReset(); CH.pick = null; chRefresh(); },
            check: chCheck,
            status: () => '크로마토그래피 ' + mark(CH.phase === 'done') + ' · 고른 사인펜 <b>' + (CH.pick || '-') + '</b>',
            onWin() { celebrate(PHONE ? 220 : 250, PHONE ? 200 : 300); },
            explain: '증거 잉크와 B 사인펜은 노랑 · 빨강 · 파랑 색소가 같은 높이에서 나뉘었어요. 겉모습이 같은 검은색 잉크라도 <b>색소의 구성</b>이 달라서, 크로마토그래피로 구별할 수 있어요.',
          },
          {
            title: '분리 방법 설계하기', scene: 'design', manual: true,
            goal: '<b>모래 + 소금 + 철가루</b> 혼합물을 모두 분리하는 순서를 <b>방법 카드 3장</b>으로 설계하고, <b>▶ 실행하기</b>로 확인한 뒤 <b>✔ 확인하기</b>를 누르세요.',
            hint: '철가루는 자석에 붙고, 소금은 물에 녹지만 모래는 녹지 않아요. 소금물에서 소금을 얻으려면 물을 증발시켜야 해요. 순서를 생각해요.',
            setup() { dgReset(); dgLayout(false); },
            check: dgCheck,
            status: () => '놓은 카드 <b>' + dgPlaced() + ' / 3</b> · 실행해서 확인 ' + mark(!!(DG.final && DG.sig === dgSig() && DG.run && DG.run.done)),
            onWin() { celebrate(PHONE ? 220 : 400, PHONE ? 300 : 360); },
            explain: '철가루는 <b>자석</b>에 붙고, 소금은 <b>물에 녹고</b> 모래는 녹지 않아요. 물에 녹여 거르면 모래가 남고, 소금물을 <b>증발</b>시키면 소금을 얻어요. 이렇게 물질의 <b>특성 차이</b>를 이용해 분리 순서를 설계해요. (자석은 처음에 써도, 거른 뒤 거름종이 위에서 써도 괜찮아요.)',
          },
          {
            type: 'quiz', title: '분리 방법과 특성 짝짓기', scene: 'design',
            goal: '다음 중 분리 방법과 이용하는 물질의 특성을 <b>잘못</b> 짝지은 것은?',
            choices: ['증류 — 끓는점 차이', '분별 깔때기 — 밀도 차이', '재결정 — 용해도 차이', '크로마토그래피 — 끓는점 차이'],
            answer: 3,
            feedback: ['이 짝은 알맞아요. 잘못된 짝을 찾아 보세요.', '이 짝은 알맞아요. 잘못된 짝을 찾아 보세요.', '이 짝은 알맞아요. 잘못된 짝을 찾아 보세요.', ''],
            explain: '크로마토그래피는 성분이 종이를 타고 <b>이동하는 속도의 차이</b>로 분리해요. 도핑 검사, 식품 색소 분석처럼 아주 적은 양의 혼합물을 분석할 때도 쓰여요.',
          },
        ],
      },
    ],
  });

  refreshUI();
  SciSim.loop((dt, t) => { lastDt = dt; update(dt); draw(now()); updateReadouts(t); watchGame(); });
  window.__sim = Object.assign({ setScene, S, SC, get game() { return game; }, ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); } }, DBG);
})();
