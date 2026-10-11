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
    salt2: { id: 'salt2', name: '진한 소금물', short: '진한', long: '물 100 g에 소금 두 숟가락(약 20 g)을 녹인 소금물', icon: '🧂', color: '#dc2626', Tb0: 104, rise: 5, spoons: 2 },
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
    text(c.x + 12, c.y + 25, s.icon + ' ' + (PHONE || c.w < 120 ? s.short : s.name), { size: PHONE ? 14.5 : 15.5, weight: 800, color: shade(s.color, -0.25), align: 'left' });
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

  /* =========================================================
     장면 ③-1: 입자 돋보기 — 소금과 흙을 물에 넣고 저어 보기
       소금: 입자가 물 입자 사이로 고르게 퍼짐(균일 혼합물)
       흙: 알갱이가 물 입자와 섞이지 않고 가라앉음(불균일 혼합물)
     ========================================================= */
  const PCOL = ['#4f9cf5', '#f59e0b', '#9a6a3a'];                 // 물 · 소금 · 흙 입자 색
  const MXG = PHONE ? {
    bk: { x: 8, y: 8, w: 424, h: 198 }, lens: { x: 8, y: 214, w: 424, h: 296 }, vd: { x: 8, y: 518, w: 424, h: 94 },
    bm: { x: 70, y: 66, w: 104, h: 112 }, rad: 8.4, gr: 13.5, ring: 40, surf: 50,
  } : {
    bk: { x: 16, y: 16, w: 276, h: 528 }, lens: { x: 306, y: 16, w: 478, h: 402 }, vd: { x: 306, y: 428, w: 478, h: 116 },
    bm: { x: 79, y: 252, w: 150, h: 196 }, rad: 10.6, gr: 17, ring: 50, surf: 74,
  };
  const T_SP0 = 0.95, T_SP1 = 1.55, T_DONE = 6.0, T_END = 6.3;      // 시간표 (초)
  const MX = {
    sub: 'salt', t: -1, run: false, done: { salt: false, soil: false },
    P: [], grid: [], gw: 0, gh: 0, cs: 30, spawned: 0, M: 0, homes: false, stir: 0,
    ring: { u: 0.5, v: 0.62, drag: false, off: { x: 0, y: 0 }, shown: false, moved: 0 },
    macro: [], rod: 0, pour: 0,
  };
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
  function mxLens() {
    const r = MXG.lens, x0 = r.x + 14, x1 = r.x + r.w - 14, y0 = r.y + 46, y1 = r.y + r.h - 40;
    return { r, x0, x1, y0, y1, ys: y0 + MXG.surf, W: x1 - x0, H: y1 - (y0 + MXG.surf) };
  }
  const SOLUTE = {
    salt: { name: '소금', icon: '🧂', col: PCOL[1], kind: '소금 입자', n: 40, verdict: '균일 혼합물', vcol: COL.uni },
    soil: { name: '흙', icon: '🟤', col: PCOL[2], kind: '흙 알갱이', n: 6, verdict: '불균일 혼합물', vcol: COL.hetero },
  };
  /* 흙 알갱이 그림 (울퉁불퉁한 덩어리) */
  const blobCache = {};
  function blobSprite(rad, v) {
    const R = Math.round(rad), key = R + '|' + v;
    if (blobCache[key]) return blobCache[key];
    const k = 3, m = 1.35, size = Math.ceil(R * 2 * m * k);
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.scale(k, k);
    const cx = R * m, cy = R * m, n = 11;
    let sd = 91 + v * 37; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rr = R * (0.84 + rnd() * 0.2); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    const path = () => {
      g.beginPath(); const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = mid(pts[n - 1], pts[0]);
      g.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const mm = mid(pts[i], pts[(i + 1) % n]); g.quadraticCurveTo(pts[i][0], pts[i][1], mm[0], mm[1]); }
      g.closePath();
    };
    const sh = g.createRadialGradient(cx + R * 0.1, cy + R * 0.3, R * 0.4, cx + R * 0.1, cy + R * 0.3, R * 1.3);
    sh.addColorStop(0, 'rgba(40,25,10,.3)'); sh.addColorStop(1, 'rgba(40,25,10,0)');
    g.fillStyle = sh; g.beginPath(); g.arc(cx + R * 0.1, cy + R * 0.3, R * 1.3, 0, TAU); g.fill();
    path(); const gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05);
    gr.addColorStop(0, '#c9965c'); gr.addColorStop(0.55, '#8d5f32'); gr.addColorStop(1, '#4e321a'); g.fillStyle = gr; g.fill();
    g.save(); path(); g.clip();
    for (let i = 0; i < 9; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(60,38,18,.55)' : 'rgba(235,200,150,.45)'; g.beginPath(); g.arc(cx + (rnd() - 0.5) * R * 1.3, cy + (rnd() - 0.5) * R * 1.3, R * (0.06 + rnd() * 0.08), 0, TAU); g.fill(); }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(cx - R * 0.35, cy - R * 0.45, R * 0.28, R * 0.15, -0.6, 0, TAU); g.fill();
    return (blobCache[key] = { c, half: R * m });
  }
  function drawPart(p) {
    if (p.k === 2) { const sp = blobSprite(p.rad, p.v || 0), s = sp.half * 2 * (p.rad / Math.round(p.rad)); ctx.drawImage(sp.c, p.x - s / 2, p.y - s / 2, s, s); }
    else drawBall(ctx, PCOL[p.k], p.x, p.y, p.rad);
  }

  /* ---- 입자 시뮬레이션: 물 입자는 제자리(집)에서 떨며 밀려났다 돌아오고, 넣은 물질이 떨어져 섞임 ---- */
  function mxFill() {
    const L = mxLens(), rd = MXG.rad;
    MX.P = [];
    const N = Math.round(0.64 * L.W * L.H / (Math.PI * rd * rd));
    const d = Math.sqrt((2 * L.W * L.H) / (1.7321 * N)), rowH = d * 0.866;
    for (let j = 0, y = L.ys + rd + 2; y < L.y1 - rd; j++, y += rowH) {
      for (let x = L.x0 + rd + (j % 2 ? d / 2 : 0); x < L.x1 - rd; x += d) {
        const px = x + rand(-0.14, 0.14) * d, py = y + rand(-0.14, 0.14) * d;
        MX.P.push({ x: px, y: py, vx: 0, vy: 0, k: 0, rad: rd * rand(0.9, 1.08), m: 1, inW: true, hx: px, hy: py });
      }
    }
    MX.nWater = MX.P.length;
    MX.cs = MXG.gr * 2 + 2;
    MX.gw = Math.ceil(L.W / MX.cs) + 3; MX.gh = Math.ceil((L.y1 - L.y0) / MX.cs) + 3;
    MX.grid = []; for (let i = 0; i < MX.gw * MX.gh; i++) MX.grid.push([]);
    for (let i = 0; i < 24; i++) mxSub(1 / 60, 0, true);               // 처음 배열을 한 번 풀어 줌
    MX.P.forEach((p) => { p.vx = p.vy = 0; p.hx = p.x; p.hy = p.y; });
  }
  function mxReset(sub) {
    MX.sub = sub || MX.sub; MX.t = -1; MX.run = false; MX.spawned = 0; MX.homes = false; MX.stir = 0; MX.rod = 0; MX.pour = 0;
    MX.ring.shown = false; MX.ring.drag = false; MX.ring.u = 0.5; MX.ring.v = 0.62; MX.ring.moved = 0;
    mxFill(); mxMacroInit(); mxUI();
  }
  function mxSpawn() {
    const L = mxLens(), S0 = SOLUTE[MX.sub], total = S0.n, want = Math.round(total * seg(MX.t, T_SP0, T_SP1));
    while (MX.spawned < want) {
      const i = MX.spawned++;
      const salt = MX.sub === 'salt', rad = salt ? MXG.rad * 0.98 : MXG.gr * rand(0.82, 1.08);
      MX.P.push({
        x: L.x0 + L.W * 0.5 + rand(-0.09, 0.09) * L.W + (salt ? 0 : (i - 2.5) * 16), y: L.y0 + 4 + rand(0, salt ? 40 : 8),
        vx: rand(-14, 14), vy: rand(60, 120), k: salt ? 1 : 2, rad, m: salt ? 1.1 : 14, inW: false, hx: 0, hy: 0, v: i % 3, sw: Math.random() < 0.5 ? -1 : 1,
      });
    }
  }
  /* 소금 입자가 나중에 자리 잡을 고른 위치 (한 칸에 하나씩) */
  function mxAssignHomes() {
    const L = mxLens(), salts = MX.P.filter((p) => p.k === 1), M = salts.length;
    if (!M) return;
    const cols = Math.max(2, Math.ceil(Math.sqrt(M * L.W / L.H))), rows = Math.ceil(M / cols);
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      cells.push({ x: L.x0 + MXG.rad + (c + 0.5 + rand(-0.22, 0.22)) * (L.W - 2 * MXG.rad) / cols, y: L.ys + MXG.rad + 4 + (r + 0.5 + rand(-0.22, 0.22)) * (L.H - 2 * MXG.rad - 6) / rows, used: false });
    }
    salts.slice().sort((a, b) => a.y - b.y).forEach((p) => {
      let best = null, bd = 1e12;
      cells.forEach((c) => { if (c.used) return; const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2; if (d < bd) { bd = d; best = c; } });
      if (best) { best.used = true; p.bx = best.x; p.by = best.y; }
      p.cx = clamp(p.x, L.x0 + p.rad, L.x1 - p.rad); p.cy = p.y;
    });
    MX.homes = true;
  }
  const mxStirEnv = (T) => smooth(seg(T, 1.9, 2.3)) * (1 - smooth(seg(T, 3.9, 4.3)));
  function mxGridFill(L) {
    const G = MX.grid, P = MX.P, cs = MX.cs, gw = MX.gw;
    for (let i = 0; i < G.length; i++) G[i].length = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], gx = clamp(Math.floor((p.x - L.x0) / cs) + 1, 1, gw - 2), gy = clamp(Math.floor((p.y - L.y0) / cs) + 1, 1, MX.gh - 2);
      G[gy * gw + gx].push(i);
    }
  }
  function mxSub(h, T, pre) {
    const L = mxLens(), P = MX.P, N = P.length;
    const stir = pre ? 0 : MX.stir, W = L.W, H = L.H, ph = 1.1 * Math.sin(1.7 * T), fyK = 2 * H / W;
    const kickA = 24 * Math.sqrt(24 * 3 * h), dragK = Math.exp(-3 * h);
    const mv = MX.homes ? smooth(seg(T, 1.9, 4.2)) : 0;                // 소금이 퍼져 가는 정도
    for (let i = 0; i < N; i++) {
      const p = P[i];
      if (!p.inW) {                                                    // 공기 중에서 떨어지는 중
        p.vy += 560 * h;
        if (p.y >= L.ys + p.rad * 0.1) { p.inW = true; p.vy *= 0.3; p.vx *= 0.4; p.ax = p.x; }
      } else {
        p.vx += (Math.random() - 0.5) * kickA; p.vy += (Math.random() - 0.5) * kickA;
        const flowing = stir > 0.003 && p.k !== 2;
        if (p.k === 0) { p.vx += (p.hx - p.x) * 8 * h; p.vy += (p.hy - p.y) * 8 * h; }
        else if (p.k === 1) {                                          // 소금: 가라앉은 덩어리 → 고르게 퍼진 자리로
          let tx, ty;
          if (!MX.homes) { tx = p.ax; ty = Math.min(p.y + 40, L.ys + L.H * 0.35); }
          else {
            tx = lerp(p.cx, p.bx, mv); ty = lerp(p.cy, p.by, mv);
            const dx = p.bx - p.cx, dy = p.by - p.cy, dl = Math.hypot(dx, dy) + 1e-6, amp = Math.sin(Math.PI * mv) * 46 * p.sw;
            tx += (-dy / dl) * amp; ty += (dx / dl) * amp;
          }
          p.vx += (tx - p.x) * 13 * h; p.vy += (ty - p.y) * 13 * h;
        }
        if (flowing) {                                                  // 젓는 물살 (원래 자리 둘레로 크게 흔들림)
          const u = (p.x - L.x0) / W, v = clamp((p.y - L.ys) / H, 0, 1);
          p.vx += Math.sin(TAU * u + ph) * Math.cos(Math.PI * v) * 230 * stir * h;
          p.vy += -fyK * Math.cos(TAU * u + ph) * Math.sin(Math.PI * v) * 230 * stir * h;
        }
        if (p.k === 2) {                                                // 흙 알갱이: 물살을 조금 따르며 가라앉음
          const u = (p.x - L.x0) / W, v = clamp((p.y - L.ys) / H, 0, 1);
          const fx = 120 * Math.sin(TAU * u + ph) * Math.cos(Math.PI * v) * stir, fy = -120 * fyK * Math.cos(TAU * u + ph) * Math.sin(Math.PI * v) * stir;
          const tvx = fx * 0.6, tvy = (stir > 0.02 ? 150 * (1 - 0.85 * stir) : 230) + fy * 0.6, kf = 1 - Math.exp(-6 * h);
          p.vx += (tvx - p.vx) * kf; p.vy += (tvy - p.vy) * kf;
        }
        p.vx *= dragK; p.vy *= dragK;
      }
      p.x += p.vx * h; p.y += p.vy * h;
      const x0 = L.x0 + p.rad, x1 = L.x1 - p.rad, yb = L.y1 - p.rad;
      if (p.x < x0) { p.x = x0; p.vx = Math.abs(p.vx) * 0.3; } else if (p.x > x1) { p.x = x1; p.vx = -Math.abs(p.vx) * 0.3; }
      if (p.y > yb) { p.y = yb; p.vy = -Math.abs(p.vy) * 0.2; }
      if (p.inW && p.y < L.ys + p.rad * 0.85) { p.y = L.ys + p.rad * 0.85; if (p.vy < 0) p.vy *= -0.2; }
    }
    // 입자끼리 겹치지 않게 밀어내기
    const cs = MX.cs, gw = MX.gw, G = MX.grid;
    for (let pass = 0; pass < 2; pass++) {
      mxGridFill(L);
      for (let gy = 1; gy < MX.gh - 1; gy++) for (let gx = 1; gx < gw - 1; gx++) {
        const c = G[gy * gw + gx]; if (!c.length) continue;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const o = G[(gy + oy) * gw + gx + ox]; if (!o.length) continue;
          for (let a = 0; a < c.length; a++) for (let b = 0; b < o.length; b++) {
            const ia = c[a], ib = o[b]; if (ia >= ib) continue;
            const pa = P[ia], pb = P[ib];
            if (!pa.inW && !pb.inW) continue;
            const dx = pb.x - pa.x, dy = pb.y - pa.y, R = pa.rad + pb.rad, d2 = dx * dx + dy * dy;
            if (d2 >= R * R || d2 < 1e-6) continue;
            const d = Math.sqrt(d2), ov = (R - d) * 0.55, nx = dx / d, ny = dy / d, wa = pb.m / (pa.m + pb.m), wb = pa.m / (pa.m + pb.m);
            pa.x -= nx * ov * wa; pa.y -= ny * ov * wa; pb.x += nx * ov * wb; pb.y += ny * ov * wb;
            const rv = (pb.vx - pa.vx) * nx + (pb.vy - pa.vy) * ny;
            if (rv < 0) { const j = rv * 0.35; pa.vx += nx * j * wa; pa.vy += ny * j * wa; pb.vx -= nx * j * wb; pb.vy -= ny * j * wb; }
          }
        }
      }
    }
  }
  function mxStep(dt) {
    if (MX.t >= 0 && MX.run) {
      MX.t += dt;
      if (MX.t >= T_SP0) mxSpawn();
      if (MX.t >= 1.9 && !MX.homes && MX.sub === 'salt') mxAssignHomes();
      if (MX.t >= T_DONE && !MX.done[MX.sub]) { MX.done[MX.sub] = true; mxDoneFx(); }
      if (MX.t >= T_END) MX.run = false;
    }
    MX.stir = MX.t >= 0 && MX.run ? mxStirEnv(MX.t) : 0;
    const n = Math.max(1, Math.ceil(dt / 0.0167));
    for (let i = 0; i < n; i++) mxSub(dt / n, MX.t < 0 ? 0 : MX.t);
    const key = (MX.run ? 1 : 0) + '|' + (MX.t >= 0 ? 1 : 0) + '|' + (MX.t >= T_DONE - 0.01 ? 1 : 0);
    if (key !== MX.uiKey) { MX.uiKey = key; mxUI(); }
  }
  function mxDoneFx() {
    const L = mxLens(), S0 = SOLUTE[MX.sub];
    celebrate(MXG.lens.x + MXG.lens.w - 40, MXG.lens.y + 44);
    MX.ring.shown = true;
    showHint('🔍 렌즈 안의 동그라미를 끌어서 여러 곳을 살펴보세요', 7000);
    mxUI();
  }
  function mxCount() {
    const L = mxLens(), R = MXG.ring, rg = MX.ring, cx = L.x0 + R + rg.u * (L.W - 2 * R), cy = L.ys + R * 0.6 + rg.v * (L.H - R * 1.2);
    let w = 0, s = 0;
    MX.P.forEach((p) => { if ((p.x - cx) ** 2 + (p.y - cy) ** 2 < (R - p.rad * 0.4) ** 2) { if (p.k === 0) w++; else s++; } });
    return { cx, cy, w, s, R };
  }

  /* ---- 비커 속(실물) 장면: 시간표만으로 그려서 언제든 다시 재생 가능 ---- */
  function mxMacroInit() {
    const b = MXG.bm, n = MX.sub === 'salt' ? 26 : 16;
    MX.macro = [];
    for (let i = 0; i < n; i++) MX.macro.push({ te: T_SP0 + (T_SP1 - T_SP0) * (i / n), dx: rand(-0.34, 0.34), vs: rand(34, 66), life: rand(1.3, 2.7), ph: rand(0, TAU), sz: MX.sub === 'salt' ? rand(2.2, 3.6) : rand(2.4, 4.2) });
  }
  function spoonPoseAB(u, A, B) {
    if (u < 0.25) { const k = ease.outCubic(u / 0.25); return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), th: 0, pour: 0 }; }
    if (u < 0.45) { const k = smooth((u - 0.25) / 0.2); return { x: B.x, y: B.y, th: -0.85 * k, pour: 0 }; }
    if (u < 0.75) return { x: B.x, y: B.y, th: -0.85, pour: (u - 0.45) / 0.3 };
    if (u < 0.9) { const k = smooth((u - 0.75) / 0.15); return { x: B.x, y: B.y, th: -0.85 * (1 - k), pour: 1 }; }
    const k = ease.inCubic((u - 0.9) / 0.1); return { x: lerp(B.x, A.x, k), y: lerp(B.y, A.y, k), th: 0, pour: 1 };
  }
  function mxSpoonAB() {
    const b = MXG.bm;
    const R = MXG.bk;
    return { A: { x: Math.min(b.x + b.w + (PHONE ? 104 : 54), R.x + R.w - 92), y: b.y - (PHONE ? 22 : 74) }, B: { x: b.x + b.w * 0.5 + 24, y: b.y - (PHONE ? 20 : 34) } };
  }
  const MX_SP_DUR = 2.1;
  function drawMxBeaker(t) {
    const R = MXG.bk, b = MXG.bm, T = MX.t, soil = MX.sub === 'soil', S0 = SOLUTE[MX.sub];
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(R.x + (PHONE ? 20 : R.w / 2), R.y + 30, '🥛 비커 속 모습', { size: PHONE ? 15 : 16, weight: 800, color: COL.ink, align: PHONE ? 'left' : 'center' });
    // 실험대
    const by = b.y + b.h + 2;
    ctx.save(); vgrad(ctx, R.x + 16, by, R.w - 32, 14, '#e8c796', '#cfa56d'); ctx.restore();
    // 물질 이름표 (숟가락 위 놓인 곳)
    const { A, B } = mxSpoonAB();
    const tt = T < 0 ? -1 : T, u = tt < 0 ? 2 : tt / MX_SP_DUR;
    // 비커
    const cloud = soil && tt >= 0 ? smooth(seg(tt, 1.1, 2.8)) * (1 - 0.92 * smooth(seg(tt, 4.3, 5.9))) : 0;
    const sed = soil && tt >= 0 ? smooth(seg(tt, 1.9, 5.9)) : 0;
    const stir = MX.stir, wv = 0.9 + stir * 2.6;
    const lvl = 0.62;
    groundShadow(b.x + b.w / 2, by + 2, b.w * 0.62, 8, 1);
    let lyOut = 0;
    const lk = glassBeaker(b.x, b.y, b.w, b.h, {
      level: lvl, liquid: '#c7e6ff', alpha: 0.5, t, wave: wv, ticks: 5,
      inner(g) {
        if (cloud > 0.01) { ctx.fillStyle = rgba('#9a6e3f', 0.82 * cloud); ctx.fillRect(g.x, g.ly, g.w, g.y + g.h - g.ly); }
        if (sed > 0.01) {
          const sh = (PHONE ? 16 : 24) * sed, gr = ctx.createLinearGradient(0, g.y + g.h - sh, 0, g.y + g.h);
          gr.addColorStop(0, 'rgba(110,76,40,0)'); gr.addColorStop(0.35, 'rgba(110,76,40,.9)'); gr.addColorStop(1, 'rgba(78,50,26,1)');
          ctx.fillStyle = gr; ctx.fillRect(g.x, g.y + g.h - sh, g.w, sh + 1);
        }
        // 물속으로 가라앉는 알갱이
        MX.macro.forEach((q) => {
          if (tt < 0) return;
          const age = tt - q.te; if (age < 0) return;
          const tipX = B.x - 14 + q.dx * 6, fall = Math.max(0, (g.ly - (B.y + 16))) , tf = Math.sqrt(2 * fall / 560) + 0.02;
          if (age < tf) return;
          const ia = age - tf;
          const sw = Math.sin(tt * 3 + q.ph) * 14 * stir;
          let y = g.ly + 4 + ia * q.vs * (soil ? 1.2 : 1), x = clamp(tipX + q.dx * 16 + sw, g.x + 8, g.x + g.w - 8);
          const bottom = g.y + g.h - 6;
          if (soil) { if (y > bottom) return; ctx.fillStyle = rgba('#5a3a1c', 0.95); ctx.beginPath(); ctx.arc(x, y, q.sz * 0.85, 0, TAU); ctx.fill(); }
          else {
            if (ia > q.life || y > bottom) return;
            const a = 1 - ia / q.life; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.fillRect(x - q.sz / 2, y - q.sz / 2, q.sz, q.sz);
            ctx.strokeStyle = 'rgba(160,185,215,.7)'; ctx.lineWidth = 0.8; ctx.strokeRect(x - q.sz / 2, y - q.sz / 2, q.sz, q.sz); ctx.restore();
          }
        });
        // 젓는 물살
        if (stir > 0.02) {
          ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * stir).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) { const yy = g.ly + 14 + i * ((g.y + g.h - g.ly - 24) / 3), a0 = tt * 5 + i * 2.1; ctx.beginPath(); ctx.ellipse(g.x + g.w / 2, yy, g.w * 0.3, 5, 0, a0, a0 + 2.3); ctx.stroke(); }
          ctx.restore();
        }
      },
    });
    lyOut = lk.ly;
    // 숟가락에서 물 위로 떨어지는 알갱이
    if (tt >= 0) MX.macro.forEach((q) => {
      const age = tt - q.te; if (age < 0) return;
      const fall = Math.max(0, lyOut - (B.y + 16)), tf = Math.sqrt(2 * fall / 560) + 0.02;
      if (age >= tf) return;
      const x = B.x - 14 + q.dx * 6 - 10 * age, y = B.y + 16 + 280 * age * age;
      if (soil) { ctx.fillStyle = '#6b4526'; ctx.beginPath(); ctx.arc(x, y, q.sz * 0.85, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = '#fff'; ctx.fillRect(x - q.sz / 2, y - q.sz / 2, q.sz, q.sz); ctx.strokeStyle = 'rgba(160,185,215,.8)'; ctx.lineWidth = 0.8; ctx.strokeRect(x - q.sz / 2, y - q.sz / 2, q.sz, q.sz); }
    });
    // 이름표 (유리 겉)
    {
      const nm = tt < 0 ? '물' : (soil ? '흙탕물' : '소금물') + (tt < 2.2 ? '?' : ''), tw = Math.max(48, nm.length * 15 + 18);
      panel(b.x + b.w / 2 - tw / 2, b.y + b.h * 0.12, tw, 26, 9, 'rgba(255,255,255,.94)', 4, 2, 'rgba(30,50,100,.22)');
      ctx.strokeStyle = tt < 0 ? '#9db2cf' : rgba(S0.col, 0.95); ctx.lineWidth = 2; D.roundRect(b.x + b.w / 2 - tw / 2, b.y + b.h * 0.12, tw, 26, 9); ctx.stroke();
      text(b.x + b.w / 2, b.y + b.h * 0.12 + 18.5, nm, { size: 14, weight: 800, color: tt < 0 ? COL.muted : shade(S0.col, -0.3) });
    }
    // 젓는 막대
    const rodIn = smooth(seg(tt, 1.7, 2.2)) * (1 - smooth(seg(tt, 4.2, 4.7)));
    if (tt >= 1.6 && rodIn > 0.01) {
      const sx = Math.sin(tt * 5.2) * b.w * 0.22 * smooth(seg(tt, 2.0, 2.5)) * (1 - smooth(seg(tt, 3.9, 4.3)));
      const topX = b.x + b.w * 0.5 + 22 + (1 - rodIn) * 40, topY = b.y - (PHONE ? 28 : 56) - (1 - rodIn) * 30;
      const botX = b.x + b.w * 0.5 + sx - 6, botY = b.y + b.h - 18 - (1 - rodIn) * 60;
      const rg = ctx.createLinearGradient(topX - 4, 0, topX + 4, 0); rg.addColorStop(0, 'rgba(200,225,250,.95)'); rg.addColorStop(0.45, 'rgba(255,255,255,.95)'); rg.addColorStop(1, 'rgba(150,185,225,.9)');
      ctx.save(); ctx.strokeStyle = 'rgba(120,150,190,.9)'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(botX, botY); ctx.stroke();
      ctx.strokeStyle = 'rgba(235,245,255,.92)'; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(botX, botY); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(topX - 1.5, topY + 4); ctx.lineTo(botX - 1.5, botY - 4); ctx.stroke(); ctx.restore();
    }
    // 숟가락
    if (tt >= 0 && u >= 0 && u <= 1) drawSpoon(spoonPoseAB(u, A, B), soil ? 'soil' : 'salt');
    else if (tt < 0) {                                              // 대기 중: 숟가락에 물질이 담겨 있음
      drawSpoon({ x: A.x, y: A.y, th: 0, pour: 0 }, soil ? 'soil' : 'salt');
      text(A.x + 40, A.y - 24, S0.name + ' 한 숟가락', { size: 13.5, weight: 800, color: shade(S0.col, -0.2) });
    }
    // 관찰 문장
    const msgs = tt < 0 ? ['물만 들어 있어요.', '맑고 투명해요.']
      : !MX.done[MX.sub] && tt < T_DONE ? [soil ? '흙을 넣고 저으면 뿌옇게 흐려져요.' : '저으면 소금이 사라져요.', '']
        : soil ? ['흙이 바닥에 가라앉았어요.', '위쪽 물은 다시 맑아져요.'] : ['소금이 보이지 않아요.', '맑고 투명해서 물과 똑같아 보여요.'];
    const my = PHONE ? R.y + 70 : by + 62;
    msgs.forEach((m, i) => { if (m) text(PHONE ? R.x + 210 : R.x + R.w / 2, my + i * 22 + (PHONE ? 20 : 0), m, { size: PHONE ? 14 : 14.5, weight: 700, color: COL.ink, align: PHONE ? 'left' : 'center' }); });
    // 확대 표시 (돋보기 동그라미 + 깔때기)
    const zx = b.x + b.w * 0.5, zy = lyOut + 44, zr = 17;
    ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.55); ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(zx, zy, zr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    text(zx, zy + 5, '🔍', { size: 15 });
    ctx.restore();
    if (PHONE) { D.arrow(zx + zr + 14, zy, R.x + R.w - 150, zy, { color: rgba(COL.sub, 0.55), width: 3, head: 11 }); text(zx + zr + 22, zy - 8, '렌즈로 확대', { size: 13, weight: 800, color: COL.sub, align: 'left' }); }
    else { D.arrow(zx + zr + 6, zy, R.x + R.w - 8, zy, { color: rgba(COL.sub, 0.55), width: 3, head: 11, dash: [6, 5] }); text(zx + zr + 12, zy - 10, '확대', { size: 13, weight: 800, color: COL.sub, align: 'left' }); }
  }

  function mxVerdict(t) {
    const V = MXG.vd, S0 = SOLUTE[MX.sub], done = MX.done[MX.sub] && MX.t >= T_DONE - 0.01, soil = MX.sub === 'soil';
    panel(V.x, V.y, V.w, V.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    const fs = PHONE ? 14 : 15.5, lh = PHONE ? 21 : 23;
    if (MX.t < 0) {
      const ls = wrapText('🥄 아래에서 물질을 고르고 [넣고 저어 보기]를 눌러요. 입자가 어떻게 섞이는지 렌즈로 살펴봐요.', V.w - 36, fs, 700);
      ls.forEach((l, i) => text(V.x + 18, V.y + (PHONE ? 30 : 38) + i * lh, l, { size: fs, weight: 700, color: COL.muted, align: 'left' }));
    } else if (!done) {
      const ph = MX.t < T_SP1 + 0.3 ? '물에 넣는 중…' : MX.t < 4.2 ? '막대로 젓는 중…' : '가만히 두는 중…';
      text(V.x + 18, V.y + (PHONE ? 34 : 44), '🔬 ' + ph, { size: fs + 1, weight: 800, color: COL.sub, align: 'left' });
      ctx.fillStyle = '#e8edf6'; D.roundRect(V.x + 18, V.y + V.h - 28, V.w - 36, 10, 5); ctx.fill();
      ctx.fillStyle = COL.sub; D.roundRect(V.x + 18, V.y + V.h - 28, Math.max(10, (V.w - 36) * clamp(MX.t / T_DONE, 0, 1)), 10, 5); ctx.fill();
    } else {
      const k = ease.outBack(clamp((MX.t - T_DONE) / 0.4 + 1, 0, 1));
      ctx.save(); ctx.translate(V.x + 18, V.y + (PHONE ? 28 : 34)); ctx.scale(Math.min(1, 0.6 + 0.4 * k), Math.min(1, 0.6 + 0.4 * k));
      const b = pill(0, 0, S0.icon + ' ' + (soil ? '흙탕물 → ' : '소금물 → ') + S0.verdict, { bg: S0.vcol, size: PHONE ? 14 : 16, align: 'left', pad: 10 });
      ctx.restore();
      const body = soil ? '흙 알갱이는 물 입자와 섞이지 않고 가라앉았어요. 위와 아래의 모습이 달라요.' : '소금 입자가 물 입자 사이에 고르게 퍼졌어요. 어디를 떠 보아도 구성이 같아요.';
      wrapText(body, V.w - 36, fs, 700).forEach((l, i) => text(V.x + 18, V.y + (PHONE ? 56 : 66) + i * lh, l, { size: fs, weight: 700, color: COL.ink, align: 'left' }));
    }
  }

  function drawMxLens(t) {
    const L = mxLens(), r = L.r, S0 = SOLUTE[MX.sub], stir = MX.stir;
    lensFrame(r, { title: '🔍 입자 모형 (확대)', top: '#fbfdff', bot: '#e9f2fd' }, () => {
      // 물 (표면 아래)
      const wy = L.ys, wg = ctx.createLinearGradient(0, wy, 0, L.y1 + 40);
      wg.addColorStop(0, 'rgba(160,205,250,.34)'); wg.addColorStop(1, 'rgba(110,170,240,.3)');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(r.x, wy);
      for (let i = 0; i <= 24; i++) ctx.lineTo(r.x + (r.w * i) / 24, wy + Math.sin(t * 2 + i * 0.8) * 1.6);
      ctx.lineTo(r.x + r.w, r.y + r.h); ctx.lineTo(r.x, r.y + r.h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const px = r.x + (r.w * i) / 24, py = wy + Math.sin(t * 2 + i * 0.8) * 1.6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      text(L.x1 - 4, wy - 8, '수면', { size: 13, weight: 700, color: '#7d8fab', align: 'right' });
      // 입자 (물 → 소금 → 흙 순서로)
      for (let pass = 0; pass < 2; pass++) MX.P.forEach((p) => { if ((pass === 0) === (p.k === 0)) drawPart(p); });
      // 젓는 물살 표시
      if (stir > 0.02) {
        ctx.save(); ctx.globalAlpha = 0.5 * stir; ctx.strokeStyle = '#6d5bd0'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.fillStyle = '#6d5bd0';
        [[0.25, 1], [0.75, -1]].forEach(([fx, dir]) => {
          const cx = L.x0 + L.W * fx, cy = L.ys + L.H * 0.5, rr = Math.min(L.W * 0.14, L.H * 0.3), a0 = t * 3.2 * dir;
          ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a0 + 4.2 * dir, dir < 0); ctx.stroke();
          const ea = a0 + 4.2 * dir, ex = cx + Math.cos(ea) * rr, ey = cy + Math.sin(ea) * rr, tg = ea + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
          ctx.beginPath(); ctx.moveTo(ex + Math.cos(tg) * 9, ey + Math.sin(tg) * 9); ctx.lineTo(ex + Math.cos(tg + 2.5) * 8, ey + Math.sin(tg + 2.5) * 8); ctx.lineTo(ex + Math.cos(tg - 2.5) * 8, ey + Math.sin(tg - 2.5) * 8); ctx.closePath(); ctx.fill();
        });
        ctx.restore();
        pill((L.x0 + L.x1) / 2, L.ys + L.H * 0.5, '젓는 중', { bg: 'rgba(91,33,182,.78)', size: 13, pad: 9 });
      }
      // 눈금 범례
      const ly = r.y + r.h - 20;
      const items = [[PCOL[0], '물 입자'], [S0.col, S0.kind]];
      let lx = r.x + r.w / 2 - (PHONE ? 120 : 130);
      items.forEach((it) => { drawBall(ctx, it[0], lx, ly, 8.5); text(lx + 14, ly + 5, it[1], { size: PHONE ? 13.5 : 14.5, weight: 800, color: COL.ink, align: 'left' }); lx += PHONE ? 118 : 138; });
      // 떠 보는 동그라미
      if (MX.ring.shown) {
        const c = mxCount(), g = ctx.createRadialGradient(c.cx, c.cy, c.R * 0.2, c.cx, c.cy, c.R);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.35)');
        ctx.fillStyle = g; circle(ctx, c.cx, c.cy, c.R); ctx.fill();
        ctx.save(); ctx.strokeStyle = '#5b21b6'; ctx.lineWidth = MX.ring.drag ? 4 : 3; ctx.setLineDash([9, 6]); ctx.lineDashOffset = -t * 18; circle(ctx, c.cx, c.cy, c.R); ctx.stroke(); ctx.restore();
        const lab = MX.sub === 'salt' ? '🔵 ' + c.w + '  🟠 ' + c.s : '🔵 ' + c.w + '  🟤 ' + c.s;
        const ly2 = c.cy - c.R - 16 < L.ys - 8 ? c.cy + c.R + 18 : c.cy - c.R - 16;
        pill(clamp(c.cx, r.x + 70, r.x + r.w - 70), ly2, lab, { bg: '#5b21b6', size: PHONE ? 13.5 : 15, pad: 10 });
        if (!MX.ring.moved && MX.done[MX.sub]) D.ring(c.cx, c.cy, c.R + 6, t, { color: COL.sub });
      }
    });
    if (isNew('mix')) ringRect(r, t);
  }

  function mxUI(soft) {
    const sub = MX.sub, running = MX.t >= 0 && MX.run, done = MX.t >= T_DONE - 0.01;
    const btn = $('#mixBtn');
    if (!btn) return;
    const txt = running ? '⏳ 섞는 중…' : MX.t >= 0 ? '↺ 다시 해 보기' : '🥄 넣고 저어 보기';
    if (btn.textContent !== txt) btn.textContent = txt;
    btn.disabled = running; btn.classList.toggle('btn-primary', !running);
    if (!soft) {
      $$('#mixSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.k === sub); b.disabled = false; });
      $('#mixNote').textContent = sub === 'salt' ? '소금 한 숟가락을 물에 넣고 저어요. 소금 입자가 어떻게 섞이는지 렌즈로 봐요.' : '흙 한 숟가락을 물에 넣고 저어요. 흙 알갱이가 어떻게 되는지 렌즈로 봐요.';
    }
    $$('#mixSeg button').forEach((b) => { b.disabled = running; });
  }
  function mxStart() {
    if (MX.run) return;
    hideHint();
    if (MX.t >= 0) mxReset(MX.sub);
    MX.t = 0; MX.run = true; MX.stir = 0; mxMacroInit();
    Sound.click();
    if (RM) { for (let i = 0; i < Math.round(T_END * 30); i++) mxStep(1 / 30); MX.ring.shown = true; }
    mxUI();
  }
  const mxRingAt = (p) => { if (!MX.ring.shown) return false; const c = mxCount(); return Math.hypot(p.x - c.cx, p.y - c.cy) < c.R + 10; };
  SC.mix = {
    label: '🔬 입자 돋보기: 물에 넣고 저어 보기',
    hint: '🧂 물질을 고르고 🥄 넣고 저어 보세요',
    enter(reset) { if (reset || !MX.P.length) mxReset(MX.sub); else mxUI(); },
    update(dt) { mxStep(dt); },
    draw(t) {
      drawMxBeaker(t); drawMxLens(t); mxVerdict(t);
    },
    hover(p) { return mxRingAt(p) ? 'grab' : null; },
    grab(p) { return mxRingAt(p); },
    down(p) {
      if (!mxRingAt(p)) return false;
      const c = mxCount(); MX.ring.drag = true; MX.ring.off = { x: p.x - c.cx, y: p.y - c.cy }; Sound.click(); return true;
    },
    move(p) {
      const L = mxLens(), R = MXG.ring, rg = MX.ring, cx = p.x - rg.off.x, cy = p.y - rg.off.y;
      const u0 = (cx - L.x0 - R) / (L.W - 2 * R), v0 = (cy - L.ys - R * 0.6) / (L.H - R * 1.2);
      const nu = clamp(u0, 0, 1), nv = clamp(v0, 0, 1);
      rg.moved += Math.hypot((nu - rg.u) * L.W, (nv - rg.v) * L.H); rg.u = nu; rg.v = nv;
    },
    up() { MX.ring.drag = false; },
    refresh() { mxUI(); },
    readouts() {
      const S0 = SOLUTE[MX.sub];
      $('#rMixK').textContent = MX.t < 0 ? S0.name + ' (넣기 전)' : S0.name;
      $('#rMixS').textContent = MX.t < 0 ? '-' : MX.t < T_DONE - 0.01 ? '섞이는 중' : MX.sub === 'salt' ? '고르게 섞임' : '고르지 않음 (가라앉음)';
    },
  };
  $('#mixBtn').addEventListener('click', mxStart);
  $$('#mixSeg button').forEach((b) => b.addEventListener('click', () => { if (MX.run) return; Sound.click(); mxReset(b.dataset.k); mxUI(); }));


  /* =========================================================
     장면 ③-2: 입자 상자 만들기 — 순물질 · 균일 혼합물 · 불균일 혼합물
       상자(6×3칸)를 손가락으로 쓸어 입자를 놓아요. 모형이 맞으면 입자가 살아 움직여요.
     ========================================================= */
  const BCOLS = 6, BROWS = 3, BXN = BCOLS * BROWS;
  const BXI = [
    { id: 'pure', no: '①', type: '순물질', name: '증류수', col: COL.pure, rule: '한 종류의 입자만 있어요', other: '#f59e0b', oname: '다른 물질 입자', empty: '물 입자 18개를 놓아요' },
    { id: 'uni', no: '②', type: '균일 혼합물', name: '소금물', col: COL.uni, rule: '두 종류가 고르게 섞여 있어요', other: '#f59e0b', oname: '소금 입자', empty: '물 입자와 소금 입자를 골고루 놓아요' },
    { id: 'hetero', no: '③', type: '불균일 혼합물', name: '흙탕물', col: COL.hetero, rule: '두 종류가 고르지 않게 섞여 있어요', other: '#9a6a3a', oname: '흙 알갱이', empty: '물 입자와 흙 알갱이를 놓되 흙을 한곳에 모아요' },
  ];
  const BXG = PHONE ? {
    cell: 36,
    at(i) { const y = 6 + i * 205; return { cap: { x: 10, y: y + 14 }, rule: { x: 10, y: y + 44 }, bk: { x: 24, y: y + 58, w: 76, h: 92 }, box: { x: 200, y: y + 54, w: 232, h: 124 }, lat: { x: 208, y: y + 62 }, msg: { x: 10, y: y + 196 } }; },
  } : {
    cell: 38,
    at(i) { const x = 15 + i * 262; return { cap: { x: x + 123, y: 28 }, rule: { x: x + 123, y: 56 }, bk: { x: x + 80, y: 68, w: 86, h: 100 }, box: { x, y: 200, w: 246, h: 142 }, lat: { x: x + 9, y: 214 }, msg: { x: x + 6, y: 362 } }; },
  };
  const BX = [0, 1, 2].map(() => ({ cells: [], n: 0, ok: false, alive: false, msg: '', tone: 'info', hl: [], wake: -9, shake: -9, flagged: false }));
  const BR = { k: 1, stroke: null, hot: null };
  const bxCol = (i, k) => (k === 1 ? PCOL[0] : BXI[i].other);
  const bxCenter = (i, j) => { const g = BXG.at(i); return { x: g.lat.x + (j % BCOLS + 0.5) * BXG.cell, y: g.lat.y + (Math.floor(j / BCOLS) + 0.5) * BXG.cell }; };
  function bxPuff(i, j, k) {
    if (RM) return; const c = bxCenter(i, j);
    FX.emit({ x: c.x, y: c.y, vx: rand(-26, 26), vy: rand(-46, -10), life: 0.45, size: 6, color: rgba(bxCol(i, k), 0.7), shape: 'circle', gravity: 60 });
  }
  function bxReset(anim) {
    BX.forEach((B, i) => {
      if (anim) B.cells.forEach((c, j) => { if (c.k) bxPuff(i, j, c.k); });
      B.cells = []; for (let j = 0; j < BXN; j++) B.cells.push({ k: 0, s: 0, ph: Math.random() * TAU, ph2: Math.random() * TAU, w: rand(0.8, 1.25) });
      B.alive = false; B.flagged = false; bxEval(i);
    });
    BR.stroke = null; BR.hot = null;
  }
  /* 판정: 가로 2칸씩 3구역과 가로줄 3개에 모두 다른 입자가 있고 가득 차지 않으면 '고르게' */
  function bxBands(B) {
    const bands = [];
    for (let b = 0; b < 3; b++) { const idx = []; for (let r = 0; r < BROWS; r++) for (let c = b * 2; c < b * 2 + 2; c++) idx.push(r * BCOLS + c); bands.push({ idx }); }
    for (let r = 0; r < BROWS; r++) { const idx = []; for (let c = 0; c < BCOLS; c++) idx.push(r * BCOLS + c); bands.push({ idx }); }
    return bands.map((b) => Object.assign(b, { o: b.idx.filter((j) => B.cells[j].k === 2).length, n: b.idx.length }));
  }
  function bxLargest(B) {
    const seen = new Set(); let best = 0;
    for (let j = 0; j < BXN; j++) {
      if (B.cells[j].k !== 2 || seen.has(j)) continue;
      let size = 0; const st = [j]; seen.add(j);
      while (st.length) {
        const q = st.pop(); size++;
        const c = q % BCOLS, r = Math.floor(q / BCOLS);
        [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].forEach(([cc, rr]) => {
          if (cc < 0 || cc >= BCOLS || rr < 0 || rr >= BROWS) return;
          const nj = rr * BCOLS + cc; if (B.cells[nj].k === 2 && !seen.has(nj)) { seen.add(nj); st.push(nj); }
        });
      }
      best = Math.max(best, size);
    }
    return best;
  }
  function bxEval(i) {
    const B = BX[i], I = BXI[i];
    const n = B.cells.filter((c) => c.k).length, o = B.cells.filter((c) => c.k === 2).length, w = n - o;
    B.n = n; B.hl = []; B.ok = false;
    let msg = '', tone = 'info';
    const others = () => B.cells.map((c, j) => (c.k === 2 ? j : -1)).filter((j) => j >= 0);
    if (n === 0) msg = I.empty;
    else if (n < BXN) msg = n + ' / ' + BXN + '개 놓았어요';
    else if (i === 0) {
      if (o > 0) { msg = '다른 물질 입자가 섞여 있어요. 순물질은 한 종류의 입자만 있어요.'; tone = 'bad'; B.hl = others(); }
      else { B.ok = true; msg = '한 종류의 입자만 있어요 → 순물질'; tone = 'good'; }
    } else if (o === 0) { msg = I.oname + '(' + (i === 1 ? '🟠' : '🟤') + ')도 놓아요. 혼합물은 두 종류 이상이에요.'; tone = 'bad'; }
    else if (w < 4) { msg = '물 입자(🔵)가 너무 적어요. 4개 이상 놓아요.'; tone = 'bad'; }
    else if (o < (i === 1 ? 5 : 4)) { msg = I.oname + '가 너무 적어요. ' + (i === 1 ? 5 : 4) + '개 이상 놓아요.'; tone = 'bad'; }
    else if (i === 1) {
      const bad = bxBands(B).filter((b) => b.o === 0 || b.o === b.n);
      if (bad.length) { bad.forEach((b) => b.idx.forEach((j) => { if (B.hl.indexOf(j) < 0) B.hl.push(j); })); msg = '소금 입자가 한쪽에 몰려 있어요. 빨간 칸까지 골고루 섞어요.'; tone = 'bad'; }
      else { B.ok = true; msg = '두 종류가 고르게 섞였어요 → 균일 혼합물'; tone = 'good'; }
    } else {
      const big = bxLargest(B);
      if (big < Math.ceil(o * 0.7)) { msg = '흙 알갱이가 흩어져 있어요. 흙은 한곳에 모여요.'; tone = 'bad'; B.hl = others(); }
      else { B.ok = true; msg = '두 종류가 고르지 않게 섞였어요 → 불균일 혼합물'; tone = 'good'; }
    }
    B.msg = msg; B.tone = tone;
    if (!B.ok) B.alive = false;
  }
  const bxTotal = () => BX.reduce((a, B) => a + B.n, 0);
  const bxDone = () => BX.filter((B) => B.ok).length;
  function bxCheck() {
    for (let i = 0; i < 3; i++) {
      const B = BX[i];
      if (B.ok) continue;
      if (B.n === BXN && !B.flagged) { B.flagged = true; B.shake = now(); }
      return BXI[i].no + ' ' + BXI[i].type + ' 상자: ' + (B.n === BXN ? B.msg : '입자를 ' + BXN + '개 모두 놓아 보세요. (' + B.n + ' / ' + BXN + ')');
    }
    return true;
  }
  function bxCellAt(p, only) {
    for (let i = 0; i < 3; i++) {
      if (only != null && only !== i) continue;
      const g = BXG.at(i), b = g.box, pad = 4;
      if (p.x < b.x - pad || p.x > b.x + b.w + pad || p.y < b.y - pad || p.y > b.y + b.h + pad) continue;
      const cs = BXG.cell, c = Math.floor((p.x - g.lat.x) / cs), r = Math.floor((p.y - g.lat.y) / cs);
      if (c < 0 || c >= BCOLS || r < 0 || r >= BROWS) return { i, idx: -1 };
      return { i, idx: r * BCOLS + c };
    }
    return null;
  }
  function bxApply(i, idx, mode) {
    const B = BX[i], cell = B.cells[idx]; if (!cell) return false;
    if (mode === 'paint') {
      if (cell.k === BR.k) return false;
      cell.k = BR.k; cell.s = 0;
      if (RM) cell.s = 1; else SciSim.tween(cell, { s: 1 }, { duration: 0.28, ease: 'outBack' });
    } else {
      if (!cell.k) return false;
      bxPuff(i, idx, cell.k); cell.k = 0; cell.s = 0;
    }
    B.alive = false; B.flagged = false; Sound.tick();
    bxEval(i);
    return true;
  }
  function bxWake(i) {
    const B = BX[i], b = BXG.at(i).box;
    B.alive = true; B.wake = now();
    Sound.tone(660, 0.09, 'triangle', 0.06); Sound.tone(990, 0.14, 'triangle', 0.06, 0.08);
    FX.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 16, colors: [BXI[i].col, '#ffb400', '#ffffff'], speed: 150, life: 0.8, size: 3.6 });
  }
  /* 작은 비커 그림: 상자가 나타내는 물질 */
  function drawMiniBeaker(g, i, t) {
    const b = g.bk;
    groundShadow(b.x + b.w / 2, b.y + b.h + 2, b.w * 0.6, 6, 0.9);
    glassBeaker(b.x, b.y, b.w, b.h, {
      level: 0.66, liquid: i === 2 ? '#a67a4b' : '#c7e6ff', alpha: i === 2 ? 0.82 : 0.5, t: t + i, wave: 0.7, ticks: 0,
      inner(q) {
        if (i === 2) {
          const sed = ctx.createLinearGradient(0, q.y + q.h - 14, 0, q.y + q.h); sed.addColorStop(0, 'rgba(92,62,32,0)'); sed.addColorStop(1, 'rgba(92,62,32,.9)');
          ctx.fillStyle = sed; ctx.fillRect(q.x, q.y + q.h - 14, q.w, 14);
          for (let k = 0; k < 9; k++) { ctx.fillStyle = k % 2 ? '#6b4a2b' : '#c79a64'; ctx.beginPath(); ctx.arc(q.x + 8 + ((k * 37 + 11) % (q.w - 16)), q.ly + 10 + ((k * 23) % 36) + Math.sin(t * 0.8 + k) * 2, 1.6, 0, TAU); ctx.fill(); }
        } else { ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(q.x, q.ly, q.w, 8); }
      },
    });
  }
  function drawBxBox(i, t) {
    const g = BXG.at(i), b = g.box, B = BX[i], I = BXI[i], cs = BXG.cell, cell = B.cells;
    let dx = 0; if (t - B.shake < 0.5) dx = Math.sin((t - B.shake) * 40) * 5 * (1 - (t - B.shake) / 0.5);
    const wk = now() - B.wake;
    ctx.save(); ctx.translate(dx, 0);
    panel(b.x, b.y, b.w, b.h, 16, '#fff', B.alive ? 20 : 10, 4, B.alive ? rgba(COL.good, 0.35) : 'rgba(30,50,100,.18)');
    ctx.save(); D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.clip();
    vgrad(ctx, b.x, b.y, b.w, b.h, '#fbfdff', i === 2 ? '#f7efe3' : '#e8f1fc');
    for (let j = 0; j < BXN; j++) {                                  // 놓을 칸 안내
      if (cell[j].k) continue;
      const c = bxCenter(i, j);
      ctx.strokeStyle = 'rgba(120,135,170,.3)'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]); circle(ctx, c.x, c.y, cs * 0.4); ctx.stroke(); ctx.setLineDash([]);
    }
    for (let j = 0; j < BXN; j++) {                                  // 입자
      const c = cell[j]; if (!c.k) continue;
      const q = bxCenter(i, j); let cx = q.x, cy = q.y;
      if (B.alive && !RM) {
        const a = Math.min(1, wk / 0.5) * cs * 0.1;
        cx += (Math.sin(t * 1.9 * c.w + c.ph) + 0.5 * Math.sin(t * 3.1 + c.ph2)) * a; cy += (Math.cos(t * 1.7 * c.w + c.ph2) + 0.5 * Math.sin(t * 2.7 + c.ph)) * a;
      }
      if (B.hl.indexOf(j) >= 0) { const s = 0.5 + 0.5 * Math.sin(t * 8); ctx.strokeStyle = rgba(COL.bad, 0.55 + 0.4 * s); ctx.lineWidth = 3.2; circle(ctx, cx, cy, cs * 0.47 + s * 1.5); ctx.stroke(); }
      drawBall(ctx, bxCol(i, c.k), cx, cy, cs * 0.43 * Math.max(0.01, c.s));
    }
    if (BR.hot && BR.hot.i === i && BR.hot.idx >= 0) {              // 지금 닿은 칸
      const c = bxCenter(i, BR.hot.idx);
      ctx.strokeStyle = rgba(bxCol(i, BR.k), 0.9); ctx.lineWidth = 3; circle(ctx, c.x, c.y, cs * 0.47); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = B.alive ? rgba(COL.good, 0.95) : B.tone === 'bad' && B.n === BXN ? rgba(COL.bad, 0.7) : rgba(I.col, 0.55); ctx.lineWidth = B.alive ? 4 : 3;
    D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.stroke();
    if (B.alive) { const k = ease.outBack(Math.min(1, wk / 0.4)); ctx.save(); ctx.translate(b.x + b.w - 8, b.y + 8); ctx.scale(k, k); D.check(0, 0, 14, Math.min(1, wk / 0.5)); ctx.restore(); }
    ctx.restore();
  }
  function drawBuild(t) {
    for (let i = 0; i < 3; i++) {
      const g = BXG.at(i), b = g.box, I = BXI[i], B = BX[i], bk = g.bk;
      if (PHONE) {
        pill(g.cap.x, g.cap.y, I.no + ' ' + I.type + ' (' + I.name + ')', { bg: I.col, size: 14, align: 'left', pad: 10 });
        text(g.rule.x, g.rule.y, '→ ' + I.rule, { size: 13.5, weight: 800, color: shade(I.col, -0.2), align: 'left' });
      } else {
        pill(g.cap.x, g.cap.y, I.no + ' ' + I.type, { bg: I.col, size: 15, pad: 12 });
        text(g.rule.x, g.rule.y, I.name, { size: 15, weight: 800, color: COL.ink });
      }
      drawMiniBeaker(g, i, t);
      ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.45); ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath();     // 확대 선
      if (PHONE) { ctx.moveTo(bk.x + bk.w + 6, bk.y + 4); ctx.lineTo(b.x - 4, b.y + 6); ctx.moveTo(bk.x + bk.w + 6, bk.y + bk.h - 4); ctx.lineTo(b.x - 4, b.y + b.h - 6); }
      else { ctx.moveTo(bk.x + 6, bk.y + bk.h + 6); ctx.lineTo(b.x + 14, b.y - 4); ctx.moveTo(bk.x + bk.w - 6, bk.y + bk.h + 6); ctx.lineTo(b.x + b.w - 14, b.y - 4); }
      ctx.stroke(); ctx.restore();
      pill(PHONE ? (bk.x + bk.w + b.x) / 2 + 2 : b.x + b.w / 2, PHONE ? bk.y + bk.h / 2 : (bk.y + bk.h + b.y) / 2, '🔍 확대', { bg: 'rgba(91,33,182,.88)', size: 13, pad: 8 });
      drawBxBox(i, t);
      const col = B.tone === 'good' ? '#0b6b39' : B.tone === 'bad' && B.n === BXN ? '#b4232b' : COL.muted;
      const good = B.tone === 'good';
      if (!PHONE && !good) text(g.msg.x, g.msg.y, '→ ' + I.rule, { size: 13.5, weight: 800, color: shade(I.col, -0.2), align: 'left' });
      wrapText((good ? '✅ ' : '') + B.msg, PHONE ? 424 : b.w - 10, PHONE ? 13.5 : 14.5, 800).slice(0, PHONE ? 1 : 3)
        .forEach((l, k) => text(g.msg.x, g.msg.y + (PHONE || good ? 0 : 22) + k * 19, l, { size: PHONE ? 13.5 : 14.5, weight: 800, color: col, align: 'left' }));
    }
    if (!PHONE) {
      const cy = 448, ch = 96;
      panel(15, cy, 770, ch, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
      text(34, cy + 30, '🖌️ 상자 안을 손가락으로 쓸어서 입자를 놓아요', { size: 16, weight: 800, color: COL.ink, align: 'left' });
      text(34, cy + 54, '같은 종류를 다시 쓸면 지워져요. 모형이 맞으면 입자가 살아 움직여요!', { size: 14, weight: 700, color: COL.muted, align: 'left' });
      let lx = 34;
      [[PCOL[0], '물 입자'], ['#f59e0b', '소금 입자'], ['#9a6a3a', '흙 알갱이']].forEach((it) => { drawBall(ctx, it[0], lx + 9, cy + 76, 9); text(lx + 24, cy + 81, it[1], { size: 14, weight: 800, color: COL.ink, align: 'left' }); lx += 118; });
    }
    if (isNew('build')) ringRect(PHONE ? { x: 4, y: 4, w: 432, h: 200 } : { x: 11, y: 190, w: 254, h: 156 }, t);
  }
  SC.build = {
    label: '🧩 입자 상자 만들기',
    hint: '🖌️ 상자 안을 손가락으로 쓸어 입자를 놓아요',
    enter(reset) { if (reset || !BX[0].cells.length) bxReset(false); SC.build.refresh(); },
    update(dt) {},
    draw(t) { drawBuild(t); },
    hover(p) { const h = bxCellAt(p); return h && h.idx >= 0 ? 'crosshair' : null; },
    grab(p) { const h = bxCellAt(p); return !!(h && h.idx >= 0); },
    down(p) {
      const h = bxCellAt(p); if (!h || h.idx < 0) return false;
      const mode = BX[h.i].cells[h.idx].k === BR.k ? 'erase' : 'paint';
      BR.stroke = { i: h.i, mode }; BR.hot = h;
      bxApply(h.i, h.idx, mode);
      return true;
    },
    move(p) {
      const s = BR.stroke; if (!s) return;
      const h = bxCellAt(p, s.i); BR.hot = h;
      if (h && h.idx >= 0) bxApply(h.i, h.idx, s.mode);
    },
    up() {
      const s = BR.stroke; BR.stroke = null; BR.hot = null; if (!s) return;
      const B = BX[s.i];
      if (B.ok && !B.alive) bxWake(s.i);
      else if (!B.ok && B.n === BXN) { B.shake = now(); B.flagged = true; Sound.fail(); }
    },
    refresh() { $$('#brushSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.b === BR.k - 1)); },
    readouts() { $('#rBuild').innerHTML = bxTotal() + '<small>/ ' + BXN * 3 + '개</small>'; },
  };
  $$('#brushSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); BR.k = +b.dataset.b + 1; SC.build.refresh(); }));
  $('#clearBtn').addEventListener('click', () => { Sound.click(); bxReset(true); });


  /* =========================================================
     장면 ④: 분류 게임 — 주변 물질 10가지를 순물질 / 균일 혼합물 / 불균일 혼합물로
       카드를 누르면 근거(구성 + 특성 + 입자 모형)가 나와요. 끌어서 상자에 넣고 ✔ 확인하기.
     ========================================================= */
  const SBINS = [
    { id: 'pure', name: '순물질', sub: '한 종류의 물질', short: '한 종류', col: COL.pure, icon: '🔵' },
    { id: 'uni', name: '균일 혼합물', sub: '고르게 섞인 혼합물', short: '고르게 섞임', col: COL.uni, icon: '🟢' },
    { id: 'hetero', name: '불균일 혼합물', sub: '고르지 않게 섞인 혼합물', short: '고르지 않게 섞임', col: COL.hetero, icon: '🟠' },
  ];
  const W_ = '#4f9cf5', SALT_ = '#f59e0b';
  const PAT1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const SCARDS = [
    { id: 'gold', name: '금', icon: '🥇', type: 0, kinds: ['#e0a800'], pat: PAT1, comp: '금 입자만 있어요.', ev: '녹는점이 1064 °C로 일정해요.' },
    { id: 'air', name: '공기', icon: '🌬️', type: 1, kinds: ['#60a5fa', '#ef4444'], pat: [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0], comp: '질소, 산소 등 여러 기체가 고르게 섞여 있어요.', ev: '섞인 비율에 따라 특성이 달라질 수 있어요.' },
    { id: 'mud', name: '흙탕물', icon: '🟤', type: 2, kinds: [W_, '#9a6a3a'], pat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1], comp: '물에 흙 알갱이가 고르지 않게 섞여 있어요.', ev: '가만히 두면 흙이 가라앉아 위쪽과 아래쪽이 달라져요.' },
    { id: 'sugar', name: '설탕', icon: '🍬', type: 0, kinds: ['#f472b6'], pat: PAT1, comp: '설탕 입자만 있어요.', ev: '한 가지 물질이라서 특성이 항상 일정해요.' },
    { id: 'sea', name: '바닷물', icon: '🌊', type: 1, kinds: [W_, SALT_], pat: [0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0], comp: '물에 소금 등이 녹아 고르게 섞여 있어요.', ev: '끓는 동안 온도가 계속 올라가요.' },
    { id: 'water', name: '증류수', icon: '💧', type: 0, kinds: [W_], pat: PAT1, comp: '물 입자만 있어요.', ev: '끓는점이 100 °C로 일정해요.' },
    { id: 'granite', name: '화강암', icon: '🪨', type: 2, kinds: ['#e5e7eb', '#f9a8d4', '#475569'], pat: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 0, 0, 2, 2, 0, 0], comp: '석영, 장석, 운모 등의 알갱이가 고르지 않게 섞여 있어요.', ev: '눈으로 보아도 여러 종류의 알갱이가 보여요.' },
    { id: 'oxygen', name: '산소', icon: 'O₂', glyph: true, type: 0, kinds: ['#ef4444'], pat: PAT1, comp: '산소 입자만 있어요.', ev: '끓는점이 −183 °C로 일정해요.' },
    { id: 'steel', name: '스테인리스강', icon: '🥄', type: 1, kinds: ['#94a3b8', '#14b8a6', '#a78bfa'], pat: [0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0], comp: '철에 크로뮴, 니켈 등이 고르게 섞인 합금이에요.', ev: '성분의 비율에 따라 단단함 같은 특성이 달라져요.' },
    { id: 'soda', name: '탄산음료', icon: '🥤', type: 1, kinds: [W_, '#f472b6', '#9ca3af'], pat: [0, 1, 0, 2, 2, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 2], comp: '물에 설탕, 이산화 탄소 등이 녹아 고르게 섞여 있어요.', ev: '성분의 양에 따라 맛과 끓는점이 달라져요.' },
  ];
  const SG = PHONE ? {
    tray: { x: 4, y: 6, w: 432, h: 126 }, dw: 80, dh: 52, bw: 124, bh: 30,
    deck: (i) => ({ x: 48 + (i % 5) * 86, y: 38 + Math.floor(i / 5) * 58 }),
    bin: (b) => ({ x: 8 + b * 144, y: 140, w: 136, h: 300 }),
    slot(b, idx, n) { const r = SG.bin(b), pitch = Math.min(32, (r.h - 62) / Math.max(1, n)); return { x: r.x + r.w / 2, y: r.y + 62 + pitch * idx + 15 }; },
    info: { x: 4, y: 450, w: 432, h: 166 },
  } : {
    tray: { x: 15, y: 296, w: 770, h: 114 }, dw: 138, dh: 46, bw: 114, bh: 38,
    deck: (i) => ({ x: 100 + (i % 5) * 150, y: 330 + Math.floor(i / 5) * 52 }),
    bin: (b) => ({ x: 15 + b * 262, y: 10, w: 246, h: 278 }),
    slot(b, idx) { const r = SG.bin(b); return { x: r.x + 63 + (idx % 2) * 120, y: r.y + 85 + Math.floor(idx / 2) * 42 }; },
    info: { x: 15, y: 418, w: 770, h: 130 },
  };
  const SC_ = { cards: [], sel: null, drag: null, hot: -1, solved: false, seq: 1 };
  function sortReset() {
    SC_.cards = SCARDS.map((d, i) => {
      const h = SG.deck(i);
      const c = { def: d, i, x: h.x, y: h.y, sz: 0, lift: 0, pop: 0, bin: -1, order: 0, flagged: false, shake: -9, locked: false, jit: [], hx: h.x, hy: h.y };
      for (let k = 0; k < 16; k++) c.jit.push([rand(-0.08, 0.08), rand(-0.08, 0.08), rand(0, TAU)]);
      if (RM) c.pop = 1; else SciSim.tween(c, { pop: 1 }, { duration: 0.4, delay: 0.04 * i, ease: 'outBack' });
      return c;
    });
    SC_.sel = null; SC_.drag = null; SC_.hot = -1; SC_.solved = false; SC_.seq = 1;
  }
  const inBin = (b) => SC_.cards.filter((c) => c.bin === b).sort((p, q) => p.order - q.order);
  function sortLayout(animate) {
    SC_.cards.forEach((c) => {
      if (c === SC_.drag) return;
      let q;
      if (c.bin >= 0) { const list = inBin(c.bin); q = SG.slot(c.bin, list.indexOf(c), list.length); } else q = SG.deck(c.i);
      const sz = c.bin >= 0 ? 1 : 0;
      if (animate && !RM) SciSim.tween(c, { x: q.x, y: q.y, sz }, { duration: 0.42, ease: 'outBack' });
      else { c.x = q.x; c.y = q.y; c.sz = sz; }
    });
  }
  const sortCount = () => SC_.cards.filter((c) => c.bin >= 0).length;
  function sortCard(p) {
    const list = SC_.cards.slice().sort((a, b) => (a === SC_.drag) - (b === SC_.drag));
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i], k = c.sz, w = PHONE ? (k < 0.5 ? SG.dw : SG.bw) : lerp(SG.dw, SG.bw, k), h = PHONE ? (k < 0.5 ? SG.dh : SG.bh) : lerp(SG.dh, SG.bh, k);
      if (Math.abs(p.x - c.x) < w / 2 + 3 && Math.abs(p.y - c.y) < h / 2 + 3) return c;
    }
    return null;
  }
  function sortBinAt(p) { for (let b = 0; b < 3; b++) if (inRect(p, SG.bin(b), 4)) return b; return -1; }
  function sortCheck() {
    const un = SC_.cards.filter((c) => c.bin < 0).length;
    if (un) return '아직 상자에 넣지 않은 카드가 ' + un + '장 있어요.';
    const bad = SC_.cards.filter((c) => c.bin !== c.def.type);
    bad.forEach((c) => { if (!c.flagged) { c.flagged = true; c.shake = now(); } });
    if (bad.length) return bad.length + '장이 알맞지 않은 상자에 있어요. 빨간 표시가 있는 카드를 눌러 근거를 다시 읽어 보세요.';
    return true;
  }
  function sortWin() {
    SC_.solved = true; SC_.cards.forEach((c) => { c.locked = true; c.flagged = false; });
    for (let b = 0; b < 3; b++) { const r = SG.bin(b); FX.burst(r.x + r.w / 2, r.y + 90, { count: 14, colors: [SBINS[b].col, '#ffb400', '#ffffff'], speed: 140, life: 0.8, size: 3.6 }); }
    celebrate(SG.tray.x + SG.tray.w / 2, SG.tray.y + SG.tray.h / 2);
  }
  /* 입자 모형 그림 (4×4칸) */
  function drawMini(x, y, s, d, t, a) {
    const cs = s / 4;
    ctx.save(); if (a != null) ctx.globalAlpha = a;
    ctx.fillStyle = '#fff'; D.roundRect(x, y, s, s, 12); ctx.fill();
    ctx.save(); D.roundRect(x, y, s, s, 12); ctx.clip();
    vgrad(ctx, x, y, s, s, '#fbfdff', '#e9f1fc');
    for (let k = 0; k < 16; k++) {
      const j = d.jit[k], cx = x + (k % 4 + 0.5 + j[0]) * cs + Math.sin(t * 1.8 + j[2]) * cs * 0.05, cy = y + (Math.floor(k / 4) + 0.5 + j[1]) * cs + Math.cos(t * 1.5 + j[2]) * cs * 0.05;
      const col = d.def.kinds[d.def.pat[k]];
      drawBall(ctx, col, cx, cy, cs * 0.37);
      if (col === '#e5e7eb') { ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1; circle(ctx, cx, cy, cs * 0.37); ctx.stroke(); }
    }
    ctx.restore();
    ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2.5; D.roundRect(x, y, s, s, 12); ctx.stroke();
    ctx.restore();
  }
  function drawIconBadge(x, y, r, d, bg) {
    ctx.save(); ctx.fillStyle = bg || '#f3efff'; circle(ctx, x, y, r); ctx.fill();
    if (d.glyph) text(x, y + r * 0.2, d.icon, { size: r * 0.78, weight: 800, color: '#b91c1c' });
    else text(x, y + r * 0.34, d.icon, { size: r * 1.05 });
    ctx.restore();
  }
  function drawSortCard(c, t) {
    const d = c.def, k = c.sz, bin = c.bin >= 0 ? SBINS[c.bin] : null;
    const deckMode = PHONE ? k < 0.5 : false;
    const w = PHONE ? (deckMode ? SG.dw : SG.bw) : lerp(SG.dw, SG.bw, k), h = PHONE ? (deckMode ? SG.dh : SG.bh) : lerp(SG.dh, SG.bh, k);
    const fs = PHONE ? 13 : lerp(15.5, 13.5, k), lift = c.lift, sc = Math.max(0.01, c.pop) * (1 + 0.06 * lift);
    let dx = 0; if (t - c.shake < 0.5) dx = Math.sin((t - c.shake) * 42) * 6 * (1 - (t - c.shake) / 0.5);
    ctx.save(); ctx.translate(c.x + dx, c.y - lift * 6); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 11); ctx.fill(); }, { blur: 5 + lift * 12, y: 2 + lift * 7, color: 'rgba(20,40,80,.24)' });
    const stripe = c.locked ? COL.good : c.flagged ? COL.bad : bin ? bin.col : '#cbd5e1';
    ctx.fillStyle = stripe;
    if (PHONE && deckMode) { D.roundRect(-w / 2, -h / 2, w, 6, 4); } else D.roundRect(-w / 2, -h / 2, 8, h, 5);
    ctx.fill();
    const sel = SC_.sel === c;
    ctx.strokeStyle = c.flagged ? COL.bad : c.locked ? rgba(COL.good, 0.8) : sel ? COL.sub : rgba(stripe, 0.75); ctx.lineWidth = c.flagged || sel ? 3 : 2;
    D.roundRect(-w / 2, -h / 2, w, h, 11); ctx.stroke();
    if (PHONE && deckMode) {
      if (d.glyph) text(0, -2, d.icon, { size: 17, weight: 800, color: '#b91c1c' }); else text(0, -3, d.icon, { size: 20 });
      text(0, 16, d.name, { size: fs, weight: 800, color: COL.ink });
    } else {
      const ix = -w / 2 + (PHONE ? 20 : lerp(26, 17, k));
      if (d.glyph) text(ix, 5.5, d.icon, { size: PHONE ? 14 : 15 + 2 * (1 - k), weight: 800, color: '#b91c1c' }); else text(ix, 6, d.icon, { size: PHONE ? 16 : 17 + 3 * (1 - k) });
      const nx = ix + (PHONE ? 17 : lerp(21, 14, k)), room = w / 2 - nx - 6;
      ctx.font = D.font(fs, 800); const nw = ctx.measureText(d.name).width;
      text(nx, 5.2, d.name, { size: nw > room ? Math.max(11, fs * room / nw) : fs, weight: 800, color: COL.ink, align: 'left' });
    }
    if (c.flagged) { circle(ctx, w / 2 - 6, -h / 2 + 6, 9); ctx.fillStyle = COL.bad; ctx.fill(); text(w / 2 - 6, -h / 2 + 11, '!', { size: 13, weight: 800, color: '#fff' }); }
    ctx.restore();
  }
  function drawSortInfo(t) {
    const R = SG.info, c = SC_.sel, d = c && c.def;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    if (!c) {
      const s = SC_.solved ? '🎉 10가지를 모두 알맞게 분류했어요!' : '🔍 카드를 눌러 근거를 확인하고, 알맞은 상자로 끌어다 놓아요.';
      wrapText(s, R.w - 40, PHONE ? 15 : 16.5, 800).forEach((l, i) => text(R.x + R.w / 2, R.y + R.h / 2 - 8 + i * 24, l, { size: PHONE ? 15 : 16.5, weight: 800, color: SC_.solved ? '#0b6b39' : COL.muted }));
      return;
    }
    const ms = PHONE ? 92 : 112, mx = R.x + R.w - ms - 16, my = R.y + (R.h - ms) / 2;
    drawIconBadge(R.x + (PHONE ? 34 : 48), R.y + (PHONE ? 36 : 44), PHONE ? 22 : 28, d);
    text(R.x + (PHONE ? 66 : 88), R.y + (PHONE ? 44 : 52), d.name, { size: PHONE ? 19 : 22, weight: 800, color: COL.ink, align: 'left' });
    const tw = mx - R.x - (PHONE ? 20 : 96) - 14, y0 = R.y + (PHONE ? 78 : 80);
    let yy = y0;
    [['구성', d.comp, COL.sub], ['특성', d.ev, '#0b6b39']].forEach((q) => {
      const ls = wrapText(q[1], tw - 50, PHONE ? 14 : 15, 700);
      pill(R.x + (PHONE ? 16 : 88), yy - 5, q[0], { bg: q[2], size: 13, align: 'left', pad: 7 });
      ls.forEach((l, i) => text(R.x + (PHONE ? 62 : 138), yy + i * 19, l, { size: PHONE ? 14 : 15, weight: 700, color: COL.ink, align: 'left' }));
      yy += Math.max(1, ls.length) * 19 + 11;
    });
    if (c.flagged) text(R.x + (PHONE ? 16 : 88), R.y + R.h - 12, '❌ 다시 생각해 보세요: 입자 모형과 특성을 살펴봐요.', { size: 13.5, weight: 800, color: '#b4232b', align: 'left' });
    drawMini(mx, my, ms, c, t);
    text(mx + ms / 2, my + ms + 14, '입자 모형', { size: 13, weight: 800, color: COL.sub });
  }
  function drawSort(t) {
    panel(SG.tray.x, SG.tray.y, SG.tray.w, SG.tray.h, 16, '#eef2fa', 10, 3, 'rgba(30,50,100,.14)');
    if (sortCount() === SC_.cards.length && SC_.cards.length) text(SG.tray.x + SG.tray.w / 2, SG.tray.y + SG.tray.h / 2 + 6, SC_.solved ? '🎉 모두 알맞게 분류했어요!' : '✋ 카드를 모두 넣었어요. ✔ 확인하기를 눌러 보세요!', { size: PHONE ? 15 : 17, weight: 800, color: SC_.solved ? '#0b6b39' : COL.muted });
    for (let b = 0; b < 3; b++) {
      const r = SG.bin(b), B = SBINS[b], hov = SC_.hot === b && SC_.drag, n = inBin(b).length;
      panel(r.x, r.y, r.w, r.h, 18, hov ? shade(B.col, 0.9) : '#ffffff', hov ? 18 : 10, 3, 'rgba(30,50,100,.16)');
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = rgba(B.col, hov ? 0.95 : 0.4); ctx.lineWidth = hov ? 3 : 2; D.roundRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10, 14); ctx.stroke(); ctx.restore();
      pill(r.x + r.w / 2, r.y + (PHONE ? 22 : 24), B.name, { bg: B.col, size: PHONE ? 14 : 16, pad: PHONE ? 8 : 12 });
      text(r.x + r.w / 2, r.y + (PHONE ? 46 : 50), PHONE ? B.short : B.sub, { size: PHONE ? 13 : 13.5, weight: 700, color: COL.muted });
      if (n) text(r.x + r.w - 14, r.y + (PHONE ? 22 : 24) + 5, n + '장', { size: 13, weight: 800, color: shade(B.col, -0.2), align: 'right', alpha: PHONE ? 0 : 1 });
      if (hov) D.ring(r.x + r.w / 2, r.y + r.h / 2 + 20, 26, t, { color: B.col, width: 3 });
    }
    const order = SC_.cards.slice().sort((a, b) => (a === SC_.drag) - (b === SC_.drag) || a.sz - b.sz);
    order.forEach((c) => drawSortCard(c, t));
    drawSortInfo(t);
    if (isNew('sort') && !SC_.drag) ringRect(SG.tray, t);
  }
  SC.sort = {
    label: '🗂️ 분류 게임',
    hint: '🔍 카드를 눌러 근거를 보고, 알맞은 상자로 끌어 놓아요',
    enter(reset) { if (reset || !SC_.cards.length) { sortReset(); sortLayout(false); } },
    update(dt) {},
    draw(t) { drawSort(t); },
    hover(p) { return sortCard(p) ? 'grab' : null; },
    grab(p) { return !!sortCard(p); },
    down(p) {
      const c = sortCard(p); if (!c) return false;
      SC_.sel = c; Sound.click();
      if (c.locked) return false;
      SC_.drag = c; c.offX = p.x - c.x; c.offY = p.y - c.y; c.sx = p.x; c.sy = p.y; c.moved = false;
      SciSim.tween(c, { lift: 1 }, { duration: 0.15, ease: 'outQuad' });
      return true;
    },
    move(p) {
      const c = SC_.drag; if (!c) return;
      if (!c.moved && Math.hypot(p.x - c.sx, p.y - c.sy) > 7) { c.moved = true; c.flagged = false; if (c.bin >= 0) { c.prevBin = c.bin; c.bin = -1; sortLayout(true); } else c.prevBin = -1; }
      if (!c.moved) return;
      c.x = clamp(p.x - c.offX, 20, VW - 20); c.y = clamp(p.y - c.offY, 20, VH - 20);
      SC_.hot = sortBinAt(p);
    },
    up(p) {
      const c = SC_.drag; if (!c) return;
      SC_.drag = null; SC_.hot = -1;
      SciSim.tween(c, { lift: 0 }, { duration: 0.22 });
      if (c.moved) {
        const b = sortBinAt(p);
        c.bin = b; c.order = b >= 0 ? SC_.seq++ : 0;
        if (b >= 0) { Sound.tone(620, 0.07, 'triangle', 0.05); FX.burst(p.x, p.y, { count: 7, speed: 90, life: 0.5, size: 2.6, colors: ['#ffffff', SBINS[b].col], gravity: 80 }); }
      }
      sortLayout(true);
    },
    refresh() {},
    readouts() { $('#rSort').innerHTML = sortCount() + '<small>/ 10장</small>'; },
  };



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

  setScene('look', true);

  /* =========================================================
     미션
     ========================================================= */
  const mark = (b) => (b ? '✅' : '⬜');

  // 퀴즈 그림: 같은 불꽃으로 가열한 물질 X, Y의 시간–온도 그래프 (두 칸)
  const figPanel = (x0, name, col, d) =>
    '<g transform="translate(' + x0 + ',0)"><rect x="4" y="4" width="152" height="150" rx="12" fill="#fff" stroke="#dde4ef" stroke-width="2"/>' +
    '<text x="80" y="26" font-size="15" font-weight="800" text-anchor="middle" fill="' + col + '">물질 ' + name + '</text>' +
    '<path d="M26 40 V128 H146" fill="none" stroke="#5d6879" stroke-width="2"/>' +
    '<text x="24" y="38" font-size="11.5" font-weight="700" fill="#5d6879" text-anchor="end">온도</text><text x="146" y="146" font-size="11.5" font-weight="700" fill="#5d6879" text-anchor="end">가열 시간</text>' +
    '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></g>';
  const FIG_XY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 158" width="320" role="img" aria-label="물질 X는 끓는 동안 온도가 일정하고, 물질 Y는 끓는 동안에도 온도가 계속 올라가는 가열 곡선">' +
    '<rect width="320" height="158" rx="12" fill="#f6f9ff"/>' + figPanel(0, 'X', '#2f7de1', 'M32 120 L72 62 L140 62') + figPanel(160, 'Y', '#f97316', 'M32 120 L72 74 L140 46') + '</svg>';

  const heatStatus = () => {
    const R = RUN[HS.sample], I = runInfo(R);
    return '지금 <b>' + R.s.icon + ' ' + R.s.name + ' ' + Math.round(I.T) + ' °C</b> · ' +
      SKEYS.filter((k) => k !== 'salt2' || HS.salt2).map((k) => RUN[k].s.icon + ' ' + RUN[k].s.short + ' ' + mark(passedBoil(k))).join(' · ');
  };

  game = SciSim.game({
    simId: 'm2-pure-mixture',
    mount: '#game',
    badge: '물질 분류 탐정',
    homeHref: '../../index.html#g2',
    featureLabels: {
      look: '🔎 비커 4개와 겉모습 분류 상자',
      heat: '🔥 가열 장치와 시간–온도 그래프',
      mix: '🔬 입자 돋보기',
      build: '🧩 입자 상자 만들기',
      sort: '🗂️ 분류 카드와 3개의 상자',
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
        title: '겉모습으로 나누면 충분할까?', short: '분류 기준', icon: '🔎', phase: '관찰',
        features: ['look'],
        intro: '<p class="si-q">❓ 탐구 질문: 겉으로 똑같아 보이는 물과 소금물을 어떻게 구별할까?</p>' +
          '<p>비커 4개를 <b>겉모습</b>(맑은가, 탁한가)만 보고 두 상자로 나눠 봐요. 다 나누면 비커 속 물질의 정체가 밝혀져요!</p>',
        setup() { setScene('look', true); },
        recap: '겉모습만으로는 순물질과 혼합물을 구별할 수 없어요. 구별하는 기준은 <b>물질의 특성(끓는점 등)이 일정한가</b>예요.',
        summary: '<ul><li>겉모습(색, 맑기)만으로는 순물질과 혼합물을 구별할 수 없는 경우가 있다. (증류수, 소금물, 설탕물은 모두 맑고 투명하다.)</li>' +
          '<li><b>순물질</b>: 한 가지 물질로만 이루어진 물질. 끓는점·녹는점·밀도 같은 <b>물질의 특성이 일정</b>하다.</li>' +
          '<li><b>혼합물</b>: 두 가지 이상의 물질이 섞여 있는 물질. 섞인 비율에 따라 물질의 특성이 달라진다.</li>' +
          '<li>구별 기준: 물질의 특성이 <b>일정한가?</b></li></ul>',
        missions: [
          {
            title: '겉모습으로 나누기', scene: 'look',
            goal: '비커 A~D를 눌러 살펴본 뒤, 끌어서 <b>맑고 투명해요</b> 상자와 <b>탁하고 알갱이가 보여요</b> 상자에 나누어 넣으세요.',
            hint: '비커를 누르면 겉모습이 아래에 적혀요. 색깔이 없고 맑으면 왼쪽, 탁하면 오른쪽 상자에 넣어요.',
            setup() { lkReset(); lkLayout(false); },
            check: () => lkSolved(), hold: 0.5,
            status: () => '상자에 넣은 비커 <b>' + LK.bk.filter((b) => b.zone).length + ' / 4</b>' + (lkSolved() ? ' · 이제 정체를 밝혀요!' : ''),
            onWin() { lkReveal(true); celebrate(VW / 2, PHONE ? 396 : 360); },
            explain: '맑고 투명한 상자에 A·B·C 세 비커가 들어갔어요. 정체를 밝히니 A는 <b>증류수(순물질)</b>, B와 C는 소금물·설탕물(<b>혼합물</b>)이었어요. 겉모습이 같아도 순물질일 수도, 혼합물일 수도 있어요.',
          },
          {
            type: 'quiz', title: '겉모습으로 나눈 결과', scene: 'look',
            goal: '맑고 투명한 상자 안에 <b>순물질</b>과 <b>혼합물</b>이 함께 들어 있었어요. 이 결과에서 알 수 있는 것은?',
            choices: ['맑고 투명한 물질은 모두 순물질이다', '겉모습만으로는 순물질인지 혼합물인지 구별할 수 없는 경우가 있다', '탁한 물질만 혼합물이고, 맑은 물질은 혼합물이 아니다', '혼합물은 눈으로 보면 언제나 구별할 수 있다'],
            answer: 1,
            feedback: ['소금물(B)과 설탕물(C)도 맑고 투명했지만 혼합물이었어요.', '', '소금물과 설탕물은 맑지만 물에 소금·설탕이 녹아 섞여 있는 혼합물이에요.', '맑은 소금물은 눈으로 봐도 물과 구별하기 어려워요.'],
            explain: '소금물과 설탕물은 물에 다른 물질이 <b>녹아 있어서</b> 겉으로는 물처럼 보여요. 그래서 겉모습이 아닌 <b>다른 기준</b>이 필요해요.',
          },
          {
            type: 'quiz', title: '순물질과 혼합물의 기준', scene: 'look',
            goal: '겉모습 대신, 순물질과 혼합물을 구별할 수 있는 알맞은 기준은 무엇일까요?',
            choices: ['색깔이 있는가, 없는가', '끓는점·녹는점·밀도 같은 물질의 특성이 일정한가', '질량이 많은가, 적은가', '비커에 담은 양이 얼마인가'],
            answer: 1,
            feedback: ['색깔은 겉모습이에요. 소금물처럼 색이 없어도 혼합물일 수 있어요.', '', '질량은 양에 따라 달라지는 값이라서 물질을 구별하는 기준이 되지 못해요.', '담은 양과 관계없이 물질 자체의 특성으로 구별해야 해요.'],
            explain: '<b>순물질</b>은 한 가지 물질이라서 끓는점·녹는점·밀도 같은 특성이 <b>일정</b>해요. <b>혼합물</b>은 섞인 비율에 따라 특성이 달라져요. 다음 단계에서 이 기준을 가열 곡선으로 확인해 봐요.',
          },
        ],
      },
      {
        title: '가열 곡선으로 구별하기', short: '가열 곡선', icon: '📈', phase: '실험',
        features: ['heat'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물과 소금물은 겉모습으로 구별할 수 없었어요. 기준은 <b>물질의 특성이 일정한가</b>였지요.</div>' +
          '<p>같은 불꽃으로 <b>물</b>과 <b>소금물</b>을 가열하며 시간에 따른 온도를 그래프로 그려 봐요. 끓는 동안 온도는 어떻게 될까요?</p>',
        setup() { setScene('heat', true); HS.salt2 = false; },
        recap: '<b>순물질(물)</b>은 끓는 동안 온도가 <b>일정</b>해요. <b>혼합물(소금물)</b>은 더 높은 온도에서 끓기 시작하고, 끓는 동안 온도가 <b>계속 올라가요</b>.',
        summary: '<ul><li>같은 불꽃으로 가열한 <b>물</b>은 100 °C에서 끓기 시작하고, 끓는 동안 온도가 <b>일정</b>하다. → 끓는점이 일정한 <b>순물질</b></li>' +
          '<li><b>소금물</b>은 100 °C보다 높은 온도에서 끓기 시작하고, 끓는 동안 온도가 <b>계속 올라간다</b>. → <b>혼합물</b></li>' +
          '<li>소금을 더 많이 녹일수록 끓기 시작하는 온도가 더 높다. 혼합물은 섞인 <b>비율</b>에 따라 특성이 달라진다.</li></ul>',
        missions: [
          {
            title: '물과 소금물의 가열 곡선', scene: 'heat',
            goal: '<b>물</b>과 <b>소금물</b>을 차례로 가열해서, 끓는 구간이 나타날 때까지 그래프를 그리세요.',
            hint: '<b>🔥 가열하기</b>를 눌러요. 오래 걸리면 <b>⏩ 빠르게</b>를 켜 보세요. 끓기 시작한 뒤 온도가 어떻게 변하는지 그래프에서 살펴봐요.',
            setup() { HS.salt2 = false; SKEYS.forEach(resetRun); AFX.clear(); selectSample('water'); SC.heat.refresh(); },
            check: () => passedBoil('water') && passedBoil('salt1'), hold: 0.8,
            status: heatStatus,
            onWin() { celebrate(HL.graph.x + HL.graph.w - 44, HL.graph.y + 42); },
            explain: '물은 100 °C에서 끓기 시작해서 끓는 동안 온도가 <b>일정</b>했어요. 소금물은 100 °C보다 높은 온도에서 끓기 시작했고, 끓는 동안 온도가 <b>계속 올라갔어요</b>.',
          },
          {
            type: 'quiz', title: '그래프로 순물질 찾기', scene: 'heat',
            goal: '두 가열 곡선을 비교했어요. <b>순물질</b>이라고 할 수 있는 것과 그 까닭으로 알맞은 것은?',
            choices: ['소금물 — 끓는 동안 온도가 계속 올라가기 때문이다', '물 — 끓는 동안 온도가 일정해서 끓는점이 일정하기 때문이다', '둘 다 순물질이다 — 둘 다 끓기 때문이다', '둘 다 혼합물이다 — 둘 다 투명하기 때문이다'],
            answer: 1,
            feedback: ['끓는 동안 온도가 계속 올라가는 것은 혼합물의 특징이에요.', '', '끓는 것은 모든 액체의 공통점이에요. 끓는 동안 온도가 일정한지가 중요해요.', '투명한지는 겉모습일 뿐이에요. 물은 한 가지 물질로 이루어진 순물질이에요.'],
            explain: '순물질인 물은 끓는점이 <b>100 °C</b>로 일정해서 끓는 동안 온도가 변하지 않아요. 혼합물인 소금물은 끓으면서 물이 수증기로 날아가 점점 진해지기 때문에 끓는 온도가 계속 올라가요.',
          },
          {
            title: '소금을 더 넣으면?', scene: 'heat',
            goal: '소금을 <b>두 숟가락</b> 녹인 <b>진한 소금물</b>도 가열해 보세요. 끓기 시작하는 온도가 소금물과 어떻게 다른지 비교해요.',
            hint: '<b>🔥 가열하기</b>를 눌러요. 그래프에서 소금물(주황)과 진한 소금물(빨강)이 끓기 시작하는 온도를 비교해요.',
            setup() { HS.salt2 = true; selectSample('salt2'); SC.heat.refresh(); },
            check: () => passedBoil('salt2'), hold: 0.8,
            status: heatStatus,
            onWin() { celebrate(HL.graph.x + HL.graph.w - 44, HL.graph.y + 42); },
            explain: '진한 소금물은 소금물보다 <b>더 높은 온도</b>에서 끓기 시작했어요. 혼합물은 섞인 <b>비율</b>에 따라 끓는점이 달라져요. 반면 순물질인 물은 항상 끓는점이 100 °C로 일정해요.',
          },
        ],
      },
      {
        title: '입자 모형으로 보기', short: '입자 모형', icon: '🧩', phase: '모형',
        features: ['mix', 'build'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소금물은 끓는점이 일정하지 않은 <b>혼합물</b>이었어요.</div>' +
          '<p>🔬 <b>입자 돋보기</b>로 소금과 흙을 물에 넣었을 때 입자가 어떻게 섞이는지 보고, 🧩 <b>입자 상자</b>에 순물질과 혼합물의 모형을 직접 만들어 봐요.</p>',
        setup() { setScene('mix', true); },
        recap: '<b>순물질</b>은 한 종류의 입자로 이루어져요. 혼합물은 두 종류 이상이 <b>고르게</b> 섞이면 <b>균일 혼합물</b>, <b>고르지 않게</b> 섞이면 <b>불균일 혼합물</b>이에요.',
        summary: '<ul><li><b>순물질</b>: 한 종류의 입자로만 이루어져 있다.</li>' +
          '<li><b>균일 혼합물</b>: 두 종류 이상의 입자가 <b>고르게</b> 섞여 있다. 어디를 떠 보아도 구성이 같다. (소금물, 공기)</li>' +
          '<li><b>불균일 혼합물</b>: 두 종류 이상이 <b>고르지 않게</b> 섞여 있다. 부분마다 구성이 다르다. (흙탕물, 과일 주스 알갱이)</li></ul>' +
          '<p class="note">※ 순물질을 원소와 화합물로 나누는 것은 ‘물질의 구성’에서 배워요.</p>',
        missions: [
          {
            title: '소금과 흙을 물에 넣어 보기', scene: 'mix',
            goal: '<b>🧂 소금</b>과 <b>🟤 흙</b>을 각각 물에 넣고 저어 보세요. 🔍 입자 돋보기로 입자가 어떻게 섞이는지 관찰해요.',
            hint: '물질을 고르고 <b>🥄 넣고 저어 보기</b>를 눌러요. 다 섞인 뒤에는 렌즈 안의 동그라미를 끌어서 여러 곳을 떠 보세요.',
            setup() { MX.done = { salt: false, soil: false }; mxReset('salt'); },
            check: () => MX.done.salt && MX.done.soil, hold: 0.8,
            status: () => '🧂 소금 ' + mark(MX.done.salt) + ' · 🟤 흙 ' + mark(MX.done.soil) + (MX.run ? ' · 섞는 중…' : ''),
            explain: '소금 입자는 물 입자 사이로 <b>고르게</b> 퍼졌어요(<b>균일 혼합물</b>). 흙 알갱이는 물 입자와 섞이지 않고 <b>가라앉아서</b> 위와 아래가 달랐어요(<b>불균일 혼합물</b>).',
          },
          {
            type: 'quiz', title: '균일 혼합물과 불균일 혼합물', scene: 'mix',
            goal: '소금물과 흙탕물을 입자 모형으로 비교했어요. 알맞은 설명은?',
            choices: ['소금물과 흙탕물은 모두 고르게 섞인 균일 혼합물이다', '소금물은 고르게 섞인 균일 혼합물이고, 흙탕물은 고르지 않게 섞인 불균일 혼합물이다', '소금물은 순물질이고, 흙탕물은 혼합물이다', '소금물은 불균일 혼합물이고, 흙탕물은 균일 혼합물이다'],
            answer: 1,
            feedback: ['흙은 물과 섞이지 않고 가라앉아서 위쪽과 아래쪽이 달랐어요.', '', '소금물은 물과 소금 두 가지가 섞인 혼합물이에요. 가열 곡선에서도 끓는 동안 온도가 올라갔어요.', '반대로 생각했어요. 어디를 떠 보아도 같은 쪽이 균일 혼합물이에요.'],
            explain: '<b>균일 혼합물</b>은 어디를 떠 보아도 구성이 같아요(소금물, 공기). <b>불균일 혼합물</b>은 부분마다 구성이 달라요(흙탕물, 화강암).',
          },
          {
            title: '입자 상자 만들기', scene: 'build', manual: true,
            goal: '입자를 놓아 <b>순물질 · 균일 혼합물 · 불균일 혼합물</b>의 입자 모형 상자를 3개 모두 완성하고 <b>✔ 확인하기</b>를 누르세요.',
            hint: '순물질은 한 종류만! 균일 혼합물은 두 종류를 <b>골고루</b>, 불균일 혼합물은 다른 입자를 <b>한곳으로 몰아서</b> 놓아요.',
            setup() { bxReset(false); },
            check: () => bxCheck(),
            status: () => '완성한 상자 <b>' + bxDone() + ' / 3</b> · 놓은 입자 <b>' + bxTotal() + ' / ' + BXN * 3 + '</b>',
            onWin() { BX.forEach((B, i) => { if (!B.alive) bxWake(i); }); celebrate(PHONE ? 60 : 700, PHONE ? 330 : 496); },
            explain: '<b>순물질</b>은 한 종류의 입자만, <b>균일 혼합물</b>은 두 종류가 골고루, <b>불균일 혼합물</b>은 두 종류가 한쪽으로 몰려 있어요. 입자의 섞인 모습이 순물질과 혼합물을 나누는 모형이에요.',
          },
        ],
      },
      {
        title: '주변 물질 분류하기', short: '분류하기', icon: '🗂️', phase: '적용',
        features: ['sort'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 순물질, 균일 혼합물, 불균일 혼합물의 입자 모형을 만들었어요.</div>' +
          '<p>이제 우리 주변의 물질 <b>10가지</b>를 <b>물질의 특성</b>과 <b>입자 모형</b>을 근거로 분류해 봐요. 카드를 누르면 근거가 나와요.</p>',
        setup() { setScene('sort', true); },
        recap: '분류의 근거는 겉모습이 아니라 <b>물질의 특성</b>(끓는점·녹는점이 일정한가)과 <b>입자의 섞인 모습</b>이에요.',
        summary: '<ul><li><b>순물질</b>: 증류수, 금, 산소, 설탕 — 한 종류의 입자, 특성이 일정</li>' +
          '<li><b>균일 혼합물</b>: 공기, 바닷물, 탄산음료, 스테인리스강(합금) — 고르게 섞임</li>' +
          '<li><b>불균일 혼합물</b>: 흙탕물, 화강암 — 고르지 않게 섞임</li>' +
          '<li>겉으로 맑아도 혼합물일 수 있다. 분류의 근거는 <b>물질의 특성</b>이다.</li></ul>',
        missions: [
          {
            title: '카드 10장 분류하기', scene: 'sort', manual: true,
            goal: '물질 카드 10장을 <b>순물질 · 균일 혼합물 · 불균일 혼합물</b> 상자에 나누어 넣고 <b>✔ 확인하기</b>를 누르세요.',
            hint: '카드를 누르면 구성과 특성이 나와요. 한 종류의 입자만 있으면 순물질, 두 종류 이상이면 고르게 섞였는지를 살펴봐요.',
            setup() { SC.sort.enter(true); },
            check: () => sortCheck(),
            status: () => '상자에 넣은 카드 <b>' + sortCount() + ' / 10</b>',
            onWin: sortWin,
            explain: '<b>증류수·금·산소·설탕</b>은 한 종류의 입자뿐인 순물질, <b>공기·바닷물·탄산음료·스테인리스강</b>은 고르게 섞인 균일 혼합물, <b>흙탕물·화강암</b>은 고르지 않게 섞인 불균일 혼합물이에요.',
          },
          {
            type: 'quiz', title: '그래프로 혼합물 찾기', scene: 'sort',
            goal: '물질 X와 Y를 같은 불꽃으로 가열했더니 그래프와 같았어요. <b>혼합물</b>이라고 판단할 수 있는 것은?',
            figure: FIG_XY,
            choices: ['X — 끓는 동안 온도가 일정하기 때문이다', 'Y — 끓는 동안 온도가 계속 올라가기 때문이다', 'X와 Y 모두 — 둘 다 끓기 때문이다', '그래프만으로는 알 수 없다'],
            answer: 1,
            feedback: ['끓는 동안 온도가 일정한 X는 끓는점이 일정한 순물질이에요.', '', '끓는 것은 모든 액체의 공통점이에요. 끓는 동안의 온도 변화가 근거예요.', '끓는 동안 온도가 일정한지를 보면 순물질인지 혼합물인지 알 수 있어요.'],
            explain: '끓는 동안 온도가 <b>일정한 X</b>는 끓는점이 일정한 <b>순물질</b>, 끓는 동안에도 온도가 <b>계속 올라가는 Y</b>는 <b>혼합물</b>이에요.',
          },
        ],
      },
    ],
  });

  refreshUI();
  SciSim.loop((dt, t) => { lastDt = dt; update(dt); draw(now()); updateReadouts(t); watchGame(); });
  window.__sim = {
    setScene, S, SC, LK, lkSolve, lkReveal, lkLayout, RUN, HS, selectSample, toggleRun, game, MX, mxStart, mxReset, BX, BR, bxEval, bxWake, bxReset, bxCheck, SC_, sortReset, sortLayout, sortCheck, sortCount, SCARDS, SG, BXG, bxCenter, mxCount, mxLens, MXG,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
  };
})();
