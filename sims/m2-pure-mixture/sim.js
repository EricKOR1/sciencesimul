/* =========================================================
   중2 Ⅰ. 물질의 특성 — 순물질과 혼합물 [9과08-02]
   ① [관찰] 분류 기준: 겉모습으로 나눠 보기 → 겉모습만으로는 구별할 수 없음 → 기준은 '물질의 특성이 일정한가'
   ② [실험] 가열 곡선 비교: 물(끓는 동안 온도 일정) vs 소금물(100 °C보다 높은 온도에서 끓기 시작, 계속 상승)
   ③ [모형] 입자 모형: 순물질(한 종류) · 균일 혼합물(고르게) · 불균일 혼합물(고르지 않게) 입자 상자 만들기
   ④ [적용] 분류 게임: 주변 물질 10가지를 순물질 / 균일 혼합물 / 불균일 혼합물로 분류
   ※ 원소·화합물의 구분은 다음 단원(물질의 구성)에서 배우므로 다루지 않음. 우유처럼 애매한 예는 쓰지 않음.
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
    water: '#4f9cf5', salt: '#f59e0b', soil: '#9a6a3a', ink: '#1b2333', muted: '#5d6879',
    good: '#14a058', bad: '#e2464b', sub: '#8b5cf6', line: '#dde4ef', hot: '#f26b3a',
    pure: '#2f7de1', uni: '#0d9488', hetero: '#d97706',          // 순물질 · 균일 혼합물 · 불균일 혼합물
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
  const S = { scene: 'look', sceneT: 0 };
  const SC = {};
  const DR = { fn: null };                 // 입력을 받는 장면

  /* =========================================================
     장면 ①: 겉모습으로 나누기 — 비커 A~D를 '맑은 것' / '탁한 것'으로
     (A 증류수 · B 소금물 · C 설탕물은 겉모습이 똑같고, D 흙탕물만 탁함)
     ========================================================= */
  const LKI = {
    A: { id: 'A', name: '증류수', type: '순물질', pure: true, cloudy: false, comp: '물만 있어요' },
    B: { id: 'B', name: '소금물', type: '혼합물', pure: false, cloudy: false, comp: '물 + 소금' },
    C: { id: 'C', name: '설탕물', type: '혼합물', pure: false, cloudy: false, comp: '물 + 설탕' },
    D: { id: 'D', name: '흙탕물', type: '혼합물', pure: false, cloudy: true, comp: '물 + 흙' },
  };
  const LKG = PHONE ? {
    zone: { clear: { x: 8, y: 8, w: 208, h: 292 }, cloudy: { x: 224, y: 8, w: 208, h: 292 } },
    bw: 70, bh: 98, perRow: 2, px: 84, py: 116, padB: 28,
    bench: { x: 8, y: 312, w: 424, h: 164 }, tray: (i) => ({ x: 56 + i * 110, y: 424 }),
    obs: { x: 8, y: 488, w: 424, h: 82 },
  } : {
    zone: { clear: { x: 16, y: 14, w: 376, h: 252 }, cloudy: { x: 408, y: 14, w: 376, h: 252 } },
    bw: 92, bh: 126, perRow: 3, px: 112, py: 140, padB: 34,
    bench: { x: 16, y: 282, w: 768, h: 262 }, tray: (i) => ({ x: 106 + i * 196, y: 420 }),
    obs: { x: 36, y: 462, w: 728, h: 66 },
  };
  const LK = { bk: [], drag: null, hover: null, obsId: null, msg: null, revealed: false, seq: 1 };
  function lkReset() {
    LK.bk = ['A', 'B', 'C', 'D'].map((id, i) => {
      const p = LKG.tray(i);
      const specks = [];
      for (let k = 0; k < 18; k++) specks.push({ u: Math.random(), v: Math.random(), s: rand(0.8, 2.1), ph: rand(0, TAU), c: Math.random() < 0.5 ? '#6b4a2b' : '#c79a64' });
      return { id, i, x: p.x, y: p.y, zone: null, order: 0, lift: 0, shake: -9, flip: 0, specks };
    });
    LK.drag = null; LK.hover = null; LK.obsId = null; LK.msg = null; LK.revealed = false;
  }
  lkReset();
  const lkOk = (b) => b.zone === (LKI[b.id].cloudy ? 'cloudy' : 'clear');
  const lkSolved = () => LK.bk.every(lkOk);
  function lkSlot(b) {
    const Z = LKG.zone[b.zone];
    const list = LK.bk.filter((q) => q.zone === b.zone).sort((a, c) => a.order - c.order);
    const idx = list.indexOf(b), k = list.length, per = LKG.perRow;
    const row = Math.floor(idx / per), n = Math.min(per, k - row * per), col = idx - row * per, rows = Math.ceil(k / per);
    return { x: Z.x + Z.w / 2 + (col - (n - 1) / 2) * LKG.px, y: Z.y + Z.h - LKG.padB - (rows - 1 - row) * LKG.py };
  }
  function lkLayout(animate) {
    LK.bk.forEach((b) => {
      if (b === LK.drag) return;
      const q = b.zone ? lkSlot(b) : LKG.tray(b.i);
      if (animate && !RM) SciSim.tween(b, { x: q.x, y: q.y }, { duration: 0.45, ease: 'outBack' });
      else { b.x = q.x; b.y = q.y; }
    });
  }
  function lkSolve(instant) {
    LK.bk.forEach((b) => { b.zone = LKI[b.id].cloudy ? 'cloudy' : 'clear'; b.order = LK.seq++; });
    lkLayout(!instant);
  }
  function lkReveal(onOff, instant) {
    LK.revealed = onOff;
    LK.bk.forEach((b, i) => {
      if (instant || RM) { b.flip = onOff ? 1 : 0; return; }
      SciSim.tween(b, { flip: onOff ? 1 : 0 }, { duration: 0.55, delay: i * 0.16, ease: 'inOutCubic' });
    });
    if (onOff && !instant) Sound.tone(880, 0.1, 'triangle', 0.05);
  }
  function lkAt(p) {
    const order = LK.bk.slice().sort((a, b) => (a === LK.drag) - (b === LK.drag));
    for (let i = order.length - 1; i >= 0; i--) {
      const b = order[i];
      if (p.x > b.x - LKG.bw / 2 - 6 && p.x < b.x + LKG.bw / 2 + 6 && p.y > b.y - LKG.bh - 6 && p.y < b.y + 8) return b;
    }
    return null;
  }
  function lkZoneAt(p) {
    for (const k of ['clear', 'cloudy']) if (inRect(p, LKG.zone[k], 0)) return k;
    return null;
  }
  function drawLkBeaker(b, t) {
    const bw = LKG.bw, bh = LKG.bh, info = LKI[b.id];
    const lift = b.lift, sc = 1 + 0.07 * lift;
    let dx = 0;
    if (t - b.shake < 0.5) dx = Math.sin((t - b.shake) * 42) * 7 * (1 - (t - b.shake) / 0.5);
    groundShadow(b.x + dx, b.y + 3, bw * (0.62 + lift * 0.1), 7 + lift * 2, 1 - lift * 0.45);
    ctx.save();
    ctx.translate(b.x + dx, b.y - lift * 10); ctx.scale(sc, sc); ctx.translate(-b.x - dx, -b.y);
    const x = b.x + dx - bw / 2, y = b.y - bh;
    const cloudy = info.cloudy;
    glassBeaker(x, y, bw, bh, {
      level: 0.64, liquid: cloudy ? '#a67a4b' : '#c7e6ff', alpha: cloudy ? 0.86 : 0.5, t: t + b.i, wave: 0.9, ticks: 5,
      inner(g) {
        if (!cloudy) {                                      // 맑은 액체: 아주 은은한 빛 번짐만
          ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(g.x, g.ly, g.w, 10);
          return;
        }
        const sed = ctx.createLinearGradient(0, g.y + g.h - 16, 0, g.y + g.h);                  // 바닥에 가라앉은 흙
        sed.addColorStop(0, 'rgba(92,62,32,0)'); sed.addColorStop(1, 'rgba(92,62,32,.85)');
        ctx.fillStyle = sed; ctx.fillRect(g.x, g.y + g.h - 16, g.w, 16);
        b.specks.forEach((s) => {                           // 둥둥 떠다니는 흙 알갱이
          const px = g.x + 6 + ((s.u + Math.sin(t * 0.6 + s.ph) * 0.05 + 1) % 1) * (g.w - 12);
          const py = g.ly + 6 + ((s.v + t * 0.015 * s.s + 1) % 1) * (g.y + g.h - g.ly - 14);
          ctx.fillStyle = s.c; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(px, py, s.s, 0, TAU); ctx.fill();
        });
        ctx.globalAlpha = 1;
      },
    });
    // 이름표: 처음엔 A~D 글자 → 정체가 밝혀지면 뒤집혀서 이름으로
    const f = b.flip, cx = b.x + dx, cy = y + bh * 0.46;
    const sx = f < 0.5 ? 1 - f * 2 : f * 2 - 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(Math.max(0.05, sx), 1);
    if (f < 0.5) {
      panel(-18, -15, 36, 30, 9, '#fff', 4, 2, 'rgba(30,50,100,.25)');
      ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2; D.roundRect(-18, -15, 36, 30, 9); ctx.stroke();
      text(0, 7, b.id, { size: PHONE ? 18 : 21, weight: 800, color: '#5b21b6' });
    } else {
      ctx.font = D.font(PHONE ? 13 : 14, 800);
      const tw = ctx.measureText(info.name).width + 14, col = info.pure ? COL.pure : COL.hetero;
      panel(-tw / 2, -14, tw, 28, 9, '#fff', 4, 2, 'rgba(30,50,100,.25)');
      ctx.strokeStyle = col; ctx.lineWidth = 2; D.roundRect(-tw / 2, -14, tw, 28, 9); ctx.stroke();
      text(0, 5, info.name, { size: PHONE ? 13 : 14, weight: 800, color: shade(col, -0.25) });
    }
    ctx.restore();
    ctx.restore();
    // 정체가 밝혀진 뒤 아래에 나타나는 설명
    if (f > 0.55) {
      const a = (f - 0.55) / 0.45, col = info.pure ? COL.pure : COL.hetero;
      ctx.save(); ctx.globalAlpha = a;
      pill(b.x + dx, b.y + 20 - (1 - a) * -6, info.type, { bg: col, size: 12.5, pad: 7 });
      ctx.restore();
    }
  }
  function drawLkZone(key, t) {
    const Z = LKG.zone[key], clear = key === 'clear';
    const col = clear ? '#2f7de1' : '#a8743a', hov = LK.hover === key && LK.drag;
    panel(Z.x, Z.y, Z.w, Z.h, 18, hov ? (clear ? '#eaf4ff' : '#fbf1e4') : '#ffffff', hov ? 18 : 10, 3, 'rgba(30,50,100,.16)');
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = rgba(col, hov ? 0.95 : 0.4); ctx.lineWidth = hov ? 3 : 2;
    D.roundRect(Z.x + 5, Z.y + 5, Z.w - 10, Z.h - 10, 14); ctx.stroke(); ctx.restore();
    text(Z.x + Z.w / 2, Z.y + (PHONE ? 31 : 36), (clear ? '💧 ' : '🟤 ') + (clear ? '맑고 투명해요' : '탁하고 알갱이가 보여요'), { size: PHONE ? 14 : 18, weight: 800, color: shade(col, -0.2) });
    // 선반 (비커가 놓이는 자리)
    const rows = Math.max(1, Math.ceil(LK.bk.filter((q) => q.zone === key).length / LKG.perRow));
    for (let r = 0; r < Math.max(1, rows); r++) {
      const yy = Z.y + Z.h - LKG.padB - (rows - 1 - r) * LKG.py + 6;
      ctx.fillStyle = rgba(col, 0.1); D.roundRect(Z.x + 14, yy, Z.w - 28, 9, 4); ctx.fill();
    }
    if (hov) { D.ring(Z.x + Z.w / 2, Z.y + Z.h / 2, Math.min(Z.w, Z.h) * 0.12, t, { color: col, width: 3 }); }
  }
  function drawLkObs(t) {
    const O = LKG.obs;
    const b = LK.obsId && LK.bk.find((q) => q.id === LK.obsId);
    panel(O.x, O.y, O.w, O.h, 14, '#fff', 8, 2, 'rgba(30,50,100,.2)');
    if (LK.msg && t - LK.msg.t0 < 2.6) {
      ctx.fillStyle = 'rgba(226,70,75,.1)'; D.roundRect(O.x, O.y, O.w, O.h, 14); ctx.fill();
      ctx.strokeStyle = rgba(COL.bad, 0.6); ctx.lineWidth = 2; D.roundRect(O.x, O.y, O.w, O.h, 14); ctx.stroke();
      const ls = wrapText('🚫 ' + LK.msg.text, O.w - 30, PHONE ? 14 : 15.5, 800);
      ls.forEach((l, i) => text(O.x + 16, O.y + O.h / 2 - (ls.length - 1) * 11 + i * 22 + 5, l, { size: PHONE ? 14 : 15.5, weight: 800, color: '#b91c1c', align: 'left' }));
      return;
    }
    if (!b) {
      const ls = wrapText('🔎 비커를 눌러 겉모습을 살펴보고, 끌어서 두 상자 중 한 곳에 넣어요.', O.w - 30, PHONE ? 14 : 15.5, 700);
      ls.forEach((l, i) => text(O.x + 16, O.y + O.h / 2 - (ls.length - 1) * 11 + i * 22 + 5, l, { size: PHONE ? 14 : 15.5, weight: 700, color: COL.muted, align: 'left' }));
      return;
    }
    const info = LKI[b.id];
    text(O.x + 16, O.y + (PHONE ? 26 : 22), '🔎 비커 ' + b.id + ' 관찰 결과', { size: 14, weight: 800, color: COL.sub, align: 'left' });
    const ls = wrapText(info.cloudy ? '누런 갈색 · 탁해요 · 흙 알갱이가 보이고 가라앉아요' : '색깔 없음 · 맑고 투명해요 · 알갱이가 보이지 않아요', O.w - 30, PHONE ? 14.5 : 16, 700);
    ls.forEach((l, i) => text(O.x + 16, O.y + (PHONE ? 52 : 46) + i * 22, l, { size: PHONE ? 14.5 : 16, weight: 700, color: COL.ink, align: 'left' }));
  }
  SC.look = {
    label: '🔎 겉모습으로 나누기',
    hint: '✋ 비커를 끌어 두 상자 중 한 곳에 넣어요',
    enter(reset) { if (reset) { lkReset(); lkLayout(false); } },
    update(dt) {},
    draw(t) {
      drawLkZone('clear', t); drawLkZone('cloudy', t);
      bench(LKG.bench.x, LKG.bench.y, LKG.bench.w, LKG.bench.h);
      drawLkObs(t);
      const order = LK.bk.slice().sort((a, b) => (a === LK.drag) - (b === LK.drag));
      order.forEach((b) => drawLkBeaker(b, t));
      if (isNew('look') && !LK.drag) ringRect(LKG.zone.clear, t);
    },
    hover(p) { return lkAt(p) ? 'grab' : null; },
    grab(p) { return !!lkAt(p); },
    down(p) {
      const b = lkAt(p);
      if (!b) return false;
      LK.drag = b; b.offX = p.x - b.x; b.offY = p.y - b.y; b.moved = false; b.sx = p.x; b.sy = p.y;
      LK.obsId = b.id; LK.msg = null;
      SciSim.tween(b, { lift: 1 }, { duration: 0.16, ease: 'outQuad' });
      Sound.click();
      return true;
    },
    move(p) {
      const b = LK.drag; if (!b) return;
      if (Math.hypot(p.x - b.sx, p.y - b.sy) > 6) b.moved = true;
      b.x = clamp(p.x - b.offX, 30, VW - 30); b.y = clamp(p.y - b.offY, LKG.bh + 6, VH - 8);
      LK.hover = lkZoneAt({ x: b.x, y: b.y - LKG.bh / 2 });
    },
    up(p) {
      const b = LK.drag; if (!b) return;
      LK.drag = null;
      SciSim.tween(b, { lift: 0 }, { duration: 0.22 });
      const zone = b.moved ? lkZoneAt({ x: b.x, y: b.y - LKG.bh / 2 }) : null;
      LK.hover = null;
      if (zone) {
        const should = LKI[b.id].cloudy ? 'cloudy' : 'clear';
        if (zone === should) {
          b.zone = zone; b.order = LK.seq++;
          Sound.tone(660, 0.07, 'triangle', 0.05);
          FX.burst(b.x, b.y - LKG.bh / 2, { count: 8, speed: 90, life: 0.5, size: 2.6, colors: ['#ffffff', '#c4b5fd'], gravity: 80 });
        } else {
          b.zone = null; b.shake = now(); Sound.fail();
          LK.msg = { t0: now(), text: zone === 'cloudy' ? '비커 ' + b.id + '는 맑고 투명해요. 왼쪽 상자에 넣어 보세요.' : '비커 ' + b.id + '는 탁하고 알갱이가 보여요. 오른쪽 상자에 넣어 보세요.' };
        }
      } else b.zone = b.zone && !b.moved ? b.zone : null;
      lkLayout(true);
    },
  };

  /* =========================================================
     장면 ②: 가열 곡선 — 물 · 소금물 · 진한 소금물을 같은 불꽃으로 가열
       20 °C에서 분당 8 °C씩 올라가다가 끓기 시작 → 9분 동안 끓음
       물: 100 °C 일정 / 소금물: 102 → 106 °C / 진한 소금물: 105 → 110 °C (예시 값)
     ========================================================= */
  const SAM = {
    water: { id: 'water', name: '물', short: '물', long: '물 100 g', icon: '💧', color: '#2f7de1', Tb0: 100, rise: 0, spoons: 0 },
    salt1: { id: 'salt1', name: '소금물', short: '소금물', long: '물 100 g에 소금 한 숟가락(약 10 g)을 녹인 소금물', icon: '🧂', color: '#f97316', Tb0: 102, rise: 4, spoons: 1 },
    salt2: { id: 'salt2', name: '진한 소금물', short: '진한', long: '물 100 g에 소금 두 숟가락(약 20 g)을 녹인 소금물', icon: '🧂', color: '#dc2626', Tb0: 105, rise: 5, spoons: 2 },
  };
  const SKEYS = ['water', 'salt1', 'salt2'];
  const T0 = 20, RATE = 8, BOILMIN = 9, XMAX = 20, YMIN = 20, YMAX = 120;
  const HL = PHONE
    ? { app: { x: 6, y: 8, w: 152, h: 326 }, graph: { x: 164, y: 8, w: 270, h: 326 }, cards: { x: 6, y: 342, w: 428, h: 228 } }
    : { app: { x: 16, y: 16, w: 246, h: 528 }, graph: { x: 276, y: 16, w: 508, h: 332 }, cards: { x: 276, y: 358, w: 508, h: 186 } };
  const RUN = {};
  SKEYS.forEach((k) => { const s = SAM[k], th = (s.Tb0 - T0) / RATE; RUN[k] = { s, t: 0, on: false, done: false, th, tEnd: th + BOILMIN, ping: -9 }; });
  const HS = { sample: 'water', fast: false, salt2: false, spoonT: -1, spoonN: 0, swap: 1, c3: 0, off: 0 };
  const later = [];                                           // 몇 초 뒤에 실행할 일
  function schedule(sec, fn) { later.push({ at: now() + sec, fn }); }
  const sampleT = (s, t) => { const th = (s.Tb0 - T0) / RATE; return t <= th ? T0 + RATE * t : s.Tb0 + s.rise * Math.min(1, (t - th) / BOILMIN); };
  function runInfo(R) {
    const T = sampleT(R.s, R.t), f = clamp((R.t - R.th) / BOILMIN, 0, 1);
    const phase = R.t <= 0 ? 'ready' : R.t < R.th ? 'heat' : R.done ? 'done' : 'boil';
    return { T, f, phase, boilT: Math.max(0, R.t - R.th) };
  }
  const salt2Open = () => HS.salt2 || !!(game && game.free);
  const passedBoil = (k) => RUN[k].t >= RUN[k].th + 3;            // 끓는 구간을 충분히 관찰함
  function resetRun(k) { const R = RUN[k]; R.t = 0; R.on = false; R.done = false; R.ping = -9; }
  function startSpoons(k) {
    const R = RUN[k];
    if (!R.s.spoons || R.t > 0) { HS.spoonT = -1; return; }
    HS.spoonT = 0; HS.spoonN = R.s.spoons;
  }

  /* ---------- 그래프 ---------- */
  function hGeom() {
    const g = HL.graph;
    const P = PHONE ? { x0: g.x + 40, y0: g.y + 70, x1: g.x + g.w - 12, y1: g.y + g.h - 40 } : { x0: g.x + 54, y0: g.y + 68, x1: g.x + g.w - 18, y1: g.y + g.h - 42 };
    return { g, P, X: (t) => P.x0 + (P.x1 - P.x0) * t / XMAX, Y: (T) => P.y1 - (P.y1 - P.y0) * (T - YMIN) / (YMAX - YMIN) };
  }
  const GB = { k: 0, cv: null };
  function hBase() {
    const k = Math.max(1, Math.round(view.scale * view.dpr * 2) / 2);
    if (GB.cv && GB.k === k) return GB;
    const { g, P, X, Y } = hGeom();
    const cvs = document.createElement('canvas');
    cvs.width = Math.ceil(g.w * k); cvs.height = Math.ceil(g.h * k);
    const c = cvs.getContext('2d'), d = SciSim.draw(c);
    c.scale(k, k); c.translate(-g.x, -g.y);
    d.text(g.x + 14, g.y + 26, '📈 ' + (PHONE ? '시간–온도' : '시간–온도 그래프'), { size: PHONE ? 14 : 15, weight: 800, color: COL.ink, align: 'left' });
    c.strokeStyle = 'rgba(120,135,160,.22)'; c.lineWidth = 1;
    for (let T = 20; T <= YMAX + 0.1; T += 20) {
      const y = Y(T);
      c.beginPath(); c.moveTo(P.x0, y); c.lineTo(P.x1, y); c.stroke();
      d.text(P.x0 - 8, y + 4.5, String(T), { size: 13, weight: 700, color: COL.muted, align: 'right' });
    }
    for (let m = 0; m <= XMAX + 0.1; m += 5) {
      const x = X(m);
      c.beginPath(); c.moveTo(x, P.y0); c.lineTo(x, P.y1); c.stroke();
      d.text(x, P.y1 + 17, String(m), { size: 13, weight: 700, color: COL.muted });
    }
    c.strokeStyle = '#5d6879'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(P.x0, P.y0 - 4); c.lineTo(P.x0, P.y1); c.lineTo(P.x1 + 4, P.y1); c.stroke();
    d.text(P.x0 - 8, P.y0 - 8, '°C', { size: 13, weight: 800, color: COL.muted, align: 'right' });
    d.text(P.x1, P.y1 + 33, '가열 시간 (분)', { size: 13, weight: 800, color: COL.muted, align: 'right' });
    GB.k = k; GB.cv = cvs;
    return GB;
  }
  function drawHeatGraph(t) {
    const { g, P, X, Y } = hGeom();
    panel(g.x, g.y, g.w, g.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    ctx.drawImage(hBase().cv, g.x, g.y, g.w, g.h);
    // 물의 끓는점 기준선
    const y100 = Y(100);
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(93,104,121,.65)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(P.x0, y100); ctx.lineTo(P.x1, y100); ctx.stroke(); ctx.restore();
    // 범례
    let lx = g.x + 14;
    SKEYS.forEach((k) => {
      const R = RUN[k];
      if (k === 'salt2' && !salt2Open()) return;
      const act = R.t > 0 || HS.sample === k;
      ctx.save(); ctx.globalAlpha = act ? 1 : 0.4;
      const b = pill(lx, g.y + 48, R.s.icon + ' ' + (PHONE ? R.s.short : R.s.name), { bg: R.s.color, size: 13, align: 'left', pad: 8 });
      ctx.restore();
      lx += b.w + 6;
    });
    // 곡선
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    SKEYS.forEach((k) => {
      const R = RUN[k], s = R.s;
      if (R.t <= 0.001) return;
      const tc = R.t, th = R.th;
      ctx.strokeStyle = s.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(X(0), Y(T0));
      ctx.lineTo(X(Math.min(tc, th)), Y(sampleT(s, Math.min(tc, th))));
      ctx.stroke();
      if (tc > th) {
        ctx.beginPath(); ctx.moveTo(X(th), Y(s.Tb0)); ctx.lineTo(X(tc), Y(sampleT(s, tc)));
        ctx.strokeStyle = rgba(s.color, 0.2); ctx.lineWidth = 12; ctx.stroke();
        ctx.strokeStyle = s.color; ctx.lineWidth = 4.5; ctx.stroke();
        // 끓기 시작 표시
        circle(ctx, X(th), Y(s.Tb0), 5.5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.stroke();
        const age = t - R.ping;
        if (age < 2.8) {
          ctx.save(); ctx.globalAlpha = age > 2.2 ? 1 - (age - 2.2) / 0.6 : 1;
          const k2 = ease.outBack(Math.min(1, age / 0.35));
          ctx.translate(X(th), Y(s.Tb0) + 24); ctx.scale(k2, k2);
          pill(0, 0, '끓기 시작 ' + s.Tb0 + ' °C', { bg: s.color, size: 13, pad: 8 });
          ctx.restore();
        }
      }
    });
    ctx.restore();
    // 머리 점 (지금 가열 중인 시료)
    const R = RUN[HS.sample];
    if (R.t > 0.001) {
      const T = sampleT(R.s, R.t), hx = X(R.t), hy = Y(T);
      D.glow(hx, hy, 18, R.s.color, 0.5);
      D.sphere(hx, hy, 6.5, R.s.color, { gloss: true });
      if (!R.done) pill(Math.min(hx + 8, P.x1 - 44), hy - 18, Math.round(T * 10) / 10 + ' °C', { bg: R.s.color, size: 13, align: 'left', pad: 8 });
    }
    if (!SKEYS.some((k) => RUN[k].t > 0)) text((P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2, '🔥 가열하면 그래프가 그려져요', { size: 15, weight: 800, color: '#a3adbd' });
    text(P.x0 + 8, y100 - 7, '100 °C', { size: 13, weight: 800, color: COL.muted, align: 'left' });
  }

  /* ---------- 끓는 동안의 온도 확대 카드 ---------- */
  function hCards() {
    const C = HL.cards, gap = 10, ne = 2 + HS.c3, w = (C.w - gap * (ne - 1)) / ne, h = C.h;
    return SKEYS.map((k, i) => ({ k, x: C.x + i * (w + gap), y: C.y, w, h, a: i < 2 ? 1 : HS.c3 }));
  }
  function miniPlot(pr, R, I, t) {
    const s = R.s, Y0 = 96, Y1 = 114;
    const px = (m) => pr.x + 30 + (pr.w - 38) * m / BOILMIN, py = (T) => pr.y + pr.h - 6 - (pr.h - 12) * (T - Y0) / (Y1 - Y0);
    ctx.fillStyle = '#f3f6fb'; D.roundRect(pr.x, pr.y, pr.w, pr.h, 8); ctx.fill();
    ctx.save(); ctx.beginPath(); D.roundRect(pr.x, pr.y, pr.w, pr.h, 8); ctx.clip();
    ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1;
    [104, 108, 112].forEach((T) => { ctx.beginPath(); ctx.moveTo(pr.x + 30, py(T)); ctx.lineTo(pr.x + pr.w, py(T)); ctx.stroke(); });
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(93,104,121,.75)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(pr.x + 30, py(100)); ctx.lineTo(pr.x + pr.w, py(100)); ctx.stroke(); ctx.setLineDash([]);
    if (I.boilT > 0) {
      const b = Math.min(BOILMIN, I.boilT), T1 = s.Tb0 + s.rise * (b / BOILMIN);
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(s.color, 0.22); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(px(0), py(s.Tb0)); ctx.lineTo(px(b), py(T1)); ctx.stroke();
      ctx.strokeStyle = s.color; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(px(0), py(s.Tb0)); ctx.lineTo(px(b), py(T1)); ctx.stroke();
      if (R.on) D.sphere(px(b), py(T1), 5, s.color, { gloss: false });
    }
    ctx.restore();
    text(pr.x + 26, py(100) + 4.5, '100', { size: 13, weight: 800, color: COL.muted, align: 'right' });
    text(pr.x + 26, py(110) + 4.5, '110', { size: 13, weight: 700, color: '#8a95a6', align: 'right' });
  }
  function drawHeatCard(c, t) {
    const R = RUN[c.k], s = R.s, I = runInfo(R);
    ctx.save(); ctx.globalAlpha = c.a;
    const sel = HS.sample === c.k;
    panel(c.x, c.y, c.w, c.h, 14, '#fff', 8, 2, 'rgba(30,50,100,.16)');
    ctx.strokeStyle = rgba(s.color, R.t > 0 ? 0.85 : sel ? 0.55 : 0.28); ctx.lineWidth = sel ? 3 : 2; D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.stroke();
    text(c.x + 12, c.y + 25, s.icon + ' ' + (PHONE || c.w < 170 ? s.short : s.name), { size: PHONE ? 14.5 : 15.5, weight: 800, color: shade(s.color, -0.25), align: 'left' });
    const pr = { x: c.x + 8, y: c.y + 34, w: c.w - 16, h: PHONE ? 86 : 64 };
    miniPlot(pr, R, I, t);
    text(pr.x + pr.w - 6, pr.y + 16, '🔍 끓는 구간 확대', { size: 13, weight: 700, color: '#8a95a6', align: 'right' });
    const ty = pr.y + pr.h + 23, fs = PHONE ? 13 : 13.5;
    if (R.t <= 0) {
      text(c.x + c.w / 2, ty + 12, '가열하면 여기에 기록돼요', { size: 13, weight: 700, color: '#a3adbd' });
    } else if (I.phase === 'heat') {
      text(c.x + 12, ty, '아직 끓지 않았어요', { size: fs, weight: 800, color: COL.muted, align: 'left' });
      text(c.x + 12, ty + 21, '지금 ' + Math.round(I.T) + ' °C', { size: fs, weight: 700, color: COL.muted, align: 'left' });
    } else {
      text(c.x + 12, ty, '끓기 시작  ' + s.Tb0 + ' °C', { size: fs, weight: 800, color: COL.ink, align: 'left' });
      text(c.x + 12, ty + 21, '지금  ' + Math.round(sampleT(s, R.t)) + ' °C', { size: fs, weight: 700, color: COL.muted, align: 'left' });
      if (I.boilT >= 3) {
        const same = s.rise === 0;
        pill(c.x + c.w / 2, c.y + c.h - 18, same ? '끓는 동안 온도 일정' : '끓는 동안 온도 상승', { bg: same ? COL.pure : s.color, size: 13, pad: 8 });
      }
    }
    ctx.restore();
  }

  /* ---------- 가열 장치 (가상 좌표 246 × 528) ---------- */
  function appPt(x, y) { const r = HL.app, sc = r.w / 246; return { x: r.x + x * sc, y: r.y + y * sc, sc }; }
  const AP = { cx: 112, bx: 52, by: 172, bw: 120, bh: 148 };
  const waterLevel = (R, I) => 0.5 - 0.05 * (R.t > R.th ? I.f : 0);
  function wavyArrow(x, y0, y1, t, color) {
    ctx.save();
    const n = 18, dy = y1 - y0;
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    let lx = x, ly = y0;
    for (let i = 0; i <= n; i++) { const u = i / n, px = x + Math.sin(u * 7 - t * 5) * 5, py = y0 + dy * u; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); lx = px; ly = py; }
    ctx.stroke();
    const sg = Math.sign(dy) || 1;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(lx, ly + sg * 11); ctx.lineTo(lx - 9, ly - sg * 3); ctx.lineTo(lx + 9, ly - sg * 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function tempCard(cx, y, T, col) {
    ctx.save();
    panel(cx - 56, y, 112, 44, 14, '#fff', 8, 2, 'rgba(30,50,100,.2)');
    ctx.strokeStyle = rgba(col, 0.7); ctx.lineWidth = 2.5; D.roundRect(cx - 56, y, 112, 44, 14); ctx.stroke();
    text(cx, y + 31, (Math.round(T * 10) / 10).toFixed(T >= 100 ? 1 : 0) + ' °C', { size: 25, weight: 800, color: col });
    ctx.restore();
  }
  /* 소금 숟가락: u 0~1 사이의 자세 */
  function spoonPose(u, cx) {
    const A = { x: cx + 122, y: 108 }, B = { x: cx + 30, y: 128 };
    if (u < 0.25) { const k = ease.outCubic(u / 0.25); return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), th: 0, pour: 0 }; }
    if (u < 0.45) { const k = smooth((u - 0.25) / 0.2); return { x: B.x, y: B.y, th: -0.85 * k, pour: 0 }; }
    if (u < 0.75) return { x: B.x, y: B.y, th: -0.85, pour: (u - 0.45) / 0.3 };
    if (u < 0.9) { const k = smooth((u - 0.75) / 0.15); return { x: B.x, y: B.y, th: -0.85 * (1 - k), pour: 1 }; }
    const k = ease.inCubic((u - 0.9) / 0.1); return { x: lerp(B.x, A.x, k), y: lerp(B.y, A.y, k), th: 0, pour: 1 };
  }
  function drawSpoon(pose, kind) {
    ctx.save(); ctx.translate(pose.x, pose.y); ctx.rotate(pose.th);
    const hg = ctx.createLinearGradient(0, -4, 0, 4); hg.addColorStop(0, '#d7dde8'); hg.addColorStop(1, '#8e9aae');
    ctx.fillStyle = hg; D.roundRect(14, -3.5, 62, 7, 3.5); ctx.fill();
    const bg = ctx.createLinearGradient(0, -12, 0, 12); bg.addColorStop(0, '#eef2f8'); bg.addColorStop(1, '#9aa6ba');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, 21, 11, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 1.5; ctx.stroke();
    if (pose.pour < 1) {                                   // 숟가락 위의 소금 알갱이
      const n = Math.round(12 * (1 - pose.pour));
      ctx.fillStyle = kind === 'soil' ? '#7a4f26' : '#fff';
      for (let i = 0; i < n; i++) { ctx.beginPath(); if (kind === 'soil') ctx.arc(-12 + (i % 6) * 5.2, -2 - (i % 3) * 2.4 - Math.floor(i / 6) * 2, 2.8, 0, TAU); else ctx.rect(-14 + (i % 6) * 5.4, -3 - (i % 3) * 2.2 - Math.floor(i / 6) * 2, 3.2, 3.2); ctx.fill(); }
    }
    ctx.restore();
  }
  function drawHeatApp(R, t) {
    const r = HL.app, sc = r.w / 246, I = runInfo(R), T = I.T, s = R.s, A = AP, cx = A.cx;
    const col = I.phase === 'boil' || I.phase === 'done' ? COL.hot : T > 60 ? '#c2410c' : '#475569';
    ctx.save(); ctx.translate(r.x, r.y); ctx.scale(sc, sc);
    panel(0, 0, 246, 528, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    vgrad(ctx, 0, 0, 246, 528, 'rgba(255,248,238,0)', 'rgba(255,236,214,.5)');
    text(123, PHONE ? 31 : 28, PHONE ? '🔥 가열' : '🔥 가열 장치', { size: PHONE ? 15 / sc : 15, weight: 800, color: COL.ink });
    tempCard(123, 44, T, col);
    // 실험대
    vgrad(ctx, 14, 462, 218, 14, '#e8c796', '#cfa56d');
    // 받침대(스탠드) + 집게
    ctx.fillStyle = '#6b7689'; D.roundRect(cx + 66, 454, 70, 9, 3); ctx.fill();
    const pg = ctx.createLinearGradient(cx + 96, 0, cx + 108, 0); pg.addColorStop(0, '#aab3c3'); pg.addColorStop(1, '#6b7689');
    ctx.fillStyle = pg; ctx.fillRect(cx + 98, 104, 8, 352);
    ctx.fillStyle = '#7d889b'; D.roundRect(cx + 20, 108, 84, 7, 3); ctx.fill();
    ctx.fillStyle = '#4b5567'; D.roundRect(cx + 4, 102, 22, 19, 4); ctx.fill();
    ctx.fillStyle = '#4b5567'; D.roundRect(cx + 94, 100, 18, 14, 3); ctx.fill();
    // 삼발이와 석면망
    ctx.strokeStyle = '#6b7689'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    [[cx - 58, 326, cx - 78, 462], [cx + 58, 326, cx + 78, 462]].forEach((q) => { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.stroke(); });
    ctx.strokeStyle = '#98a3b6'; ctx.beginPath(); ctx.moveTo(cx, 326); ctx.lineTo(cx, 462); ctx.stroke();
    ctx.fillStyle = '#5b6678'; D.roundRect(cx - 72, 318, 144, 8, 3); ctx.fill();
    ctx.fillStyle = 'rgba(200,205,214,.8)'; ctx.fillRect(cx - 50, 314, 100, 4);
    // 알코올램프
    const lg = ctx.createLinearGradient(cx - 34, 0, cx + 34, 0); lg.addColorStop(0, 'rgba(210,235,250,.95)'); lg.addColorStop(0.5, 'rgba(240,250,255,.95)'); lg.addColorStop(1, 'rgba(170,205,232,.95)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(cx - 14, 410); ctx.lineTo(cx + 14, 410); ctx.bezierCurveTo(cx + 40, 418, cx + 40, 462, cx + 32, 462); ctx.lineTo(cx - 32, 462); ctx.bezierCurveTo(cx - 40, 462, cx - 40, 418, cx - 14, 410); ctx.fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,170,60,.45)'; ctx.fillRect(cx - 30, 440, 60, 20);
    ctx.fillStyle = '#9aa5b6'; D.roundRect(cx - 12, 402, 24, 12, 3); ctx.fill();
    ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, 402); ctx.lineTo(cx, 392); ctx.stroke();
    // 온도계 (물속에 잠겨 보이도록 비커보다 먼저 그림)
    D.thermometer(cx + 15, 118, 178, T, 0, 120, { ticks: false, color: I.phase === 'boil' || I.phase === 'done' ? '#e2464b' : '#e2464b' });
    // 비커 + 액체
    const lvl = waterLevel(R, I), boiling = (I.phase === 'boil' || I.phase === 'done') ? 1 : 0;
    const ba = clamp((T - 60) / 40, 0, 1);
    glassBeaker(A.bx, A.by, A.bw, A.bh, {
      level: lvl, liquid: '#8ccaff', alpha: 0.62, t, wave: 0.9 + ba * 0.8 + boiling * 1.8, ticks: 6,
      inner(g) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.07 + ba * 0.1) + ')'; ctx.fillRect(g.x, g.ly, g.w, g.y + g.h - g.ly);
      },
    });
    // 이름표
    {
      const nm = PHONE ? s.short : s.name, fsz = PHONE ? 14 / sc : (nm.length > 4 ? 13 : 15);
      ctx.font = D.font(fsz, 800);
      const tw = Math.max(54, ctx.measureText(nm).width + 22), ty = A.by + A.bh * 0.5;
      panel(cx - tw / 2, ty - 14, tw, 28, 9, '#fff', 4, 2, 'rgba(30,50,100,.22)');
      ctx.strokeStyle = rgba(s.color, 0.9); ctx.lineWidth = 2; D.roundRect(cx - tw / 2, ty - 14, tw, 28, 9); ctx.stroke();
      text(cx, ty + 5.5, nm, { size: fsz, weight: 800, color: shade(s.color, -0.2) });
    }
    // 불꽃과 열 화살표
    if (R.on) {
      D.flame(cx, 392, 64, t);
      wavyArrow(cx - 54, 388, 336, t, rgba(COL.hot, 0.9));
      wavyArrow(cx + 54, 388, 336, t, rgba(COL.hot, 0.9));
      pill(cx + 10, 494, PHONE ? '🔥 가열 중' : '🔥 열 공급: 일정한 세기', { bg: COL.hot, size: PHONE ? 13 / sc : 13, pad: 10 });
    } else {
      pill(cx + 10, 494, PHONE ? (R.done ? '✅ 측정 끝' : R.t > 0 ? '⏸ 멈춤' : '🔥 불을 켜요') : (R.done ? '✅ 측정을 마쳤어요' : R.t > 0 ? '⏸ 가열을 멈췄어요' : '🔥 불을 켜 보세요'), { bg: '#64748b', size: PHONE ? 13 / sc : 13, pad: 10 });
    }
    // 소금을 넣는 숟가락
    if (HS.spoonT >= 0) {
      const idx = Math.min(HS.spoonN - 1, Math.floor(HS.spoonT / 2.2)), u = (HS.spoonT - idx * 2.2) / 2.0;
      if (u >= 0 && u <= 1) drawSpoon(spoonPose(u, cx));
    }
    // 끓기 시작 알림
    const age = t - R.ping;
    if (age < 2.6) {
      ctx.save(); ctx.globalAlpha = age > 2 ? 1 - (age - 2) / 0.6 : 1;
      const k2 = ease.outBack(Math.min(1, age / 0.3));
      ctx.translate(cx + 15, 96); ctx.scale(k2, k2);
      pill(0, 0, '끓기 시작! ' + s.Tb0 + ' °C', { bg: s.color, size: PHONE ? 13 / sc : 14, pad: 9 });
      ctx.restore();
    }
    ctx.restore();
  }
  function emitHeatFX(R, I, dt) {
    if (RM) return;
    const A = AP, lvl = waterLevel(R, I), ySurf = A.by + A.bh - (A.bh - 4) * lvl;
    const T = I.T, boil = I.phase === 'boil' || I.phase === 'done';
    if (R.on) {
      const rate = boil ? 26 : clamp((T - 55) / 45, 0, 1) * 8;
      if (Math.random() < dt * rate) {
        const x = rand(A.bx + 16, A.bx + A.bw - 16), p0 = appPt(x, A.by + A.bh - 6), p1 = appPt(x, ySurf);
        AFX.emit({ x: p0.x, y: p0.y, vx: rand(-3, 3), vy: -(p0.y - p1.y) / 0.62, life: 0.62, size: rand(1.8, boil ? 5.2 : 3.2) * p0.sc, color: '#ffffff', shape: 'bubble', fade: true });
      }
      if (T > 82 && Math.random() < dt * (boil ? 9 : (T - 82) / 6)) {
        const q = appPt(A.cx + rand(-34, 34), ySurf - 4);
        AFX.emit({ x: q.x, y: q.y, vx: rand(-6, 6) * q.sc, vy: -rand(26, 44) * q.sc, life: 1.5, size: rand(7, 12) * q.sc, grow: 8 * q.sc, color: 'rgba(238,243,252,.55)', shape: 'smoke', fade: true });
      }
    }
    if (HS.spoonT >= 0) {
      const idx = Math.min(HS.spoonN - 1, Math.floor(HS.spoonT / 2.2)), u = (HS.spoonT - idx * 2.2) / 2.0;
      if (u > 0.45 && u < 0.75 && Math.random() < dt * 34) {
        const pose = spoonPose(u, A.cx), tipX = pose.x - 20 * Math.cos(pose.th), tipY = pose.y - 20 * Math.sin(pose.th);
        const g = 560, d = Math.max(10, ySurf - tipY), tf = Math.sqrt(2 * d / g) * 0.92;
        const q = appPt(tipX + rand(-3, 3), tipY);
        AFX.emit({ x: q.x, y: q.y, vx: rand(-8, -2) * q.sc, vy: 20 * q.sc, gravity: g * q.sc, life: tf, size: rand(1.8, 2.8) * q.sc, color: '#ffffff', shape: 'square', fade: false });
        const sx = q.x + rand(-8, -2) * q.sc * tf;
        schedule(tf, () => {
          const w = appPt(tipX - 6, ySurf + 4);
          for (let i = 0; i < 2; i++) AFX.emit({ x: w.x + rand(-6, 6), y: w.y, vx: rand(-10, 10), vy: rand(14, 34) * w.sc, life: 0.9, size: rand(1.6, 2.8) * w.sc, grow: -1.6, color: 'rgba(255,255,255,.9)', shape: 'circle', fade: true });
        });
      }
    }
  }

  /* ---------- 장면 등록 ---------- */
  function hCheckBoilPing(R, pt) {
    if (pt < R.th && R.t >= R.th) { R.ping = now(); Sound.tone(880, 0.12, 'triangle', 0.07); Sound.tone(1320, 0.14, 'triangle', 0.05, 0.1); }
  }
  SC.heat = {
    label: '🔥 가열 곡선 그리기',
    hint: '🔥 시료를 고르고 가열해 보세요',
    enter(reset) {
      if (reset) { SKEYS.forEach(resetRun); HS.spoonT = -1; GB.cv = null; AFX.clear(); startSpoons(HS.sample); }
      selectSample(HS.sample, true);
    },
    update(dt) {
      const R = RUN[HS.sample], I = runInfo(R);
      if (R.on) {
        const pt = R.t;
        R.t = Math.min(R.tEnd, R.t + dt * (HS.fast ? 3.3 : 1.05));
        hCheckBoilPing(R, pt);
        if (R.t >= R.tEnd - 1e-6) { R.on = false; R.done = true; SC.heat.refresh(); }
      }
      if (HS.spoonT >= 0) { HS.spoonT += dt; if (HS.spoonT > HS.spoonN * 2.2 + 0.1) HS.spoonT = -1; }
      emitHeatFX(R, runInfo(R), dt);
      HS.c3 = SciSim.approach(HS.c3, salt2Open() ? 1 : 0, dt, 6);
      HS.off = SciSim.approach(HS.off, salt2Open() ? 0 : 1, dt, 6);
      HS.swap = Math.min(1, HS.swap + dt * 4);
    },
    draw(t) {
      const R = RUN[HS.sample];
      drawHeatApp(R, t);
      drawHeatGraph(t);
      hCards().forEach((c) => { if (c.a > 0.02) drawHeatCard(c, t); });
      if (isNew('heat')) ringRect(HL.graph, t);
      if (HS.swap < 1) { const r = HL.app; ctx.save(); ctx.globalAlpha = (1 - HS.swap) * 0.5; ctx.fillStyle = '#fff'; D.roundRect(r.x + 30, r.y + 150, r.w - 60, r.h * 0.4, 16); ctx.fill(); ctx.restore(); }
    },
    hover(p) { return inRect(p, HL.app) ? 'pointer' : null; },
    down(p) { if (inRect(p, HL.app)) toggleRun(); return false; },
    refresh() {
      const R = RUN[HS.sample], s = R.s;
      const rb = $('#runBtn');
      rb.textContent = R.done ? '↺ 다시 가열하기' : R.on ? '⏸ 멈추기' : R.t > 0 ? '▶ 계속하기' : '🔥 가열하기';
      rb.classList.toggle('btn-primary', !R.on);
      $('#fastBtn').setAttribute('aria-pressed', HS.fast ? 'true' : 'false');
      $('#runNote').textContent = s.long + '을 일정한 세기의 불로 가열해요. 1분이 약 1초로 빠르게 재생돼요.';
      $$('#sampleSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.s === HS.sample); b.hidden = b.dataset.s === 'salt2' && !salt2Open(); });
    },
    readouts() {
      const R = RUN[HS.sample], I = runInfo(R);
      $('#rT').innerHTML = (Math.round(I.T * 10) / 10).toFixed(1) + '<small>°C</small>';
      $('#rTime').innerHTML = R.t.toFixed(1) + '<small>분</small>';
      $('#rState').textContent = { ready: '가열 전', heat: '가열 중 (끓기 전)', boil: '끓는 중', done: '끓는 중 (측정 끝)' }[I.phase];
    },
  };
  function selectSample(k, silent) {
    const old = RUN[HS.sample];
    if (HS.sample !== k && old) old.on = false;
    const changed = HS.sample !== k;
    HS.sample = k;
    if (changed) { HS.swap = 0; AFX.clear(); }
    if (!silent || changed) startSpoons(k);
    SC.heat.refresh();
  }
  function toggleRun() {
    const R = RUN[HS.sample];
    hideHint();
    if (R.done) { resetRun(HS.sample); AFX.clear(); Sound.click(); startSpoons(HS.sample); SC.heat.refresh(); return; }
    R.on = !R.on; Sound.click(); SC.heat.refresh();
  }
  $('#runBtn').addEventListener('click', toggleRun);
  $('#fastBtn').addEventListener('click', () => { Sound.click(); HS.fast = !HS.fast; SC.heat.refresh(); });
  $$('#sampleSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); selectSample(b.dataset.s); }));

/*__SCENES__*/

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

/*__GAME__*/
  setScene('look', true);
  SciSim.loop((dt, t) => { lastDt = dt; update(dt); draw(now()); updateReadouts(t); watchGame(); });
  window.__sim = {
    setScene, S, SC, LK, lkSolve, lkReveal, lkLayout, RUN, HS, selectSample, toggleRun,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
  };
})();
