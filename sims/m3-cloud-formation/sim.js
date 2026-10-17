/* =========================================================
   중3 Ⅱ. 날씨와 기후변화 — 구름의 생성과 강수 [9과17-03]
   ① [실험] 단열 팽창: 펌프 뚜껑 페트병 + 디지털 온도·압력 센서 — 압축하면 온도↑, 뚜껑을 열어 팽창시키면 온도↓
   ② [실험] 구름 실험: 물만 넣은 병(B)과 물 + 향 연기(응결핵)를 넣은 병(A) — 팽창시키면 A만 뿌옇게 흐려진다
   ③ [모형] 구름의 생성: 산비탈을 오르는 공기 덩어리(부피↑·기온↓) → 이슬점에 닿은 높이에서 구름 밑면, 상승 원인 4가지 짝짓기
   ④ [설명] 강수 과정(정성적): 병합설(따뜻한 구름) · 빙정설(차가운 구름) — 비와 눈
   ※ 단열 감률 수치 계산, 구름 10종 분류는 다루지 않는다. (화면의 수치는 모형값)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×640) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 640 : 560;
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#16203a' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  const TAU = Math.PI * 2;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const ease = SciSim.ease;
  const rand = (a, b) => a + Math.random() * (b - a);
  const appr = (c, t, dt, k) => SciSim.approach(c, t, dt, k);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const COL = { ink: '#1b2333', muted: '#5d6879', good: '#14a058', bad: '#e2464b', warm: '#f26b3a', cold: '#2f7de1', sky: '#0ea5e9', skyD: '#0369a1' };
  const CLK = { t: 0 };
  const text = (x, y, s, o) => D.text(x, y, s, o);
  const P = PHONE ? { x: 8, y: 8, w: 424, h: 624 } : { x: 14, y: 12, w: 772, h: 536 };

  /* ---------- 포화 수증기량 (g/kg) — 앞 차시와 같은 값 ---------- */
  const TT = [0, 5, 10, 15, 20, 25, 30, 35, 40];
  const WW = [3.8, 5.4, 7.6, 10.6, 14.7, 20.0, 27.1, 36.6, 49.0];
  function satW(T) {
    const n = TT.length, h = 5, ln = (i) => Math.log(WW[i]);
    if (T <= 0) return Math.exp(ln(0) + ((ln(1) - ln(0)) / h) * T);
    if (T >= 40) return Math.exp(ln(n - 1) + ((ln(n - 1) - ln(n - 2)) / h) * (T - 40));
    const i = Math.min(n - 2, Math.floor(T / h)), s = (T - i * h) / h;
    const y0 = ln(i), y1 = ln(i + 1);
    const m0 = i > 0 ? (ln(i + 1) - ln(i - 1)) / 2 : ln(1) - ln(0);
    const m1 = i + 2 < n ? (ln(i + 2) - ln(i)) / 2 : ln(n - 1) - ln(n - 2);
    const s2 = s * s, s3 = s2 * s;
    return Math.exp((2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * m1);
  }

  /* ---------- 부드러운 그림자 · 패널 ---------- */
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
  function card(x, y, w, h, r, fill, a) {
    softShadow(x, y, w, h, r, 12, 4, 'rgba(10,20,50,.35)');
    ctx.save(); if (a != null) ctx.globalAlpha *= a;
    ctx.fillStyle = fill || '#fff'; D.roundRect(x, y, w, h, r); ctx.fill(); ctx.restore();
  }
  function contactShadow(cx, cy, rx, ry, a) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(0,0,0,' + (0.5 * (a == null ? 1 : a)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  const checks = [];
  function celebrate(x, y) {
    FX.burst(x, y, { count: 24, speed: 190, life: 0.9, size: 4 });
    checks.push({ x, y, t: 0 });
    Sound.success();
  }
  function drawChecks(dt) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i];
      c.t += dt;
      if (c.t > 1.6) { checks.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = c.t > 1.1 ? 1 - (c.t - 1.1) / 0.5 : 1;
      const s = 0.75 + 0.25 * ease.outBack(Math.min(1, c.t / 0.35));
      ctx.translate(c.x, c.y - c.t * 14); ctx.scale(s, s);
      D.check(0, 0, 22, Math.min(1, c.t / 0.5));
      ctx.restore();
    }
  }

  /* ---------- 스프라이트 (공기 분자 · 물 분자 · 구름 솜털) ---------- */
  const SPR = new Map();
  let sprK = 0;
  function sprKey() { const k = Math.max(1, Math.round(view.scale * view.dpr * 2) / 2); if (k !== sprK) { SPR.clear(); sprK = k; } return k; }
  function mkSprite(key, half, fn) {
    const k = sprKey();
    let s = SPR.get(key);
    if (s) return s;
    const cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil(half * 2 * k);
    const c = cv.getContext('2d'); c.scale(k, k); c.translate(half, half);
    fn(c);
    s = { cv, half }; SPR.set(key, s);
    return s;
  }
  function ball(c, x, y, r, c1, c2, c3) {
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, c1); g.addColorStop(0.55, c2); g.addColorStop(1, c3);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  function drawSpr(sp, x, y, rot, a, sc) {
    ctx.save();
    if (a != null && a < 1) ctx.globalAlpha *= Math.max(0, a);
    ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sc != null && sc !== 1) ctx.scale(sc, sc);
    ctx.drawImage(sp.cv, -sp.half, -sp.half, sp.half * 2, sp.half * 2);
    ctx.restore();
  }
  const airSpr = (r) => mkSprite('air' + r, r + 2, (c) => ball(c, 0, 0, r, '#e4eaf4', '#9fb0c9', '#5d6f8d'));
  const molSpr = (r) => mkSprite('mol' + r, r * 1.9, (c) => {
    const hr = r * 0.56, hx = r * 0.98, hy = r * 0.78;
    ball(c, -hx, hy, hr, '#ffffff', '#eef5fc', '#b8cde4'); ball(c, hx, hy, hr, '#ffffff', '#eef5fc', '#b8cde4');
    ball(c, 0, 0, r, '#d6efff', '#4aa8f2', '#1f6fc4');
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.45, r * 0.3, r * 0.17, -0.6, 0, TAU); c.fill();
  });
  const puffSpr = () => mkSprite('puff', 32, (c) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 32, 0, TAU); c.fill();
  });

  /* =========================================================
     상태
     ========================================================= */
  let game = null, F = new Set();
  const S = { scene: 'pump', tr: 1 };
  const T0 = 20, P0 = 1013;                                 // 실내 온도 · 1기압(hPa)
  const SC = { pump: '💨 페트병 속 공기를 압축·팽창시키기', cloud: '☁️ 구름 만들기 실험 (병 A · 병 B)', mtn: '⛰️ 산비탈을 오르는 공기 덩어리', rain: '🌧️ 구름 속에서 비와 눈이 만들어지는 과정' };
  const HINT = { pump: '💨 펌프질을 여러 번 하고 센서를 살펴보세요', cloud: '🕯️ 연기를 넣고 → 💨 펌프질 → 🔓 뚜껑 열기', mtn: '공기 덩어리를 끌어서 산비탈 위로 올려 보세요', rain: '구름 속 물방울의 움직임을 지켜보세요' };
  let hintTimer = 0;
  function showHint(msg) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), 4200); }

  /* ---------- ①② 페트병 ---------- */
  function mkBottle(water) {
    return {
      n: 1, Tc: T0, P: P0, w: water ? satW(T0) * 0.97 : 0, F: 0, nuclei: false, nu: 0, water, cap: new SciSim.Spring(0, { stiffness: 150, damping: 11 }),
      hp: 0, busy: false, openT: 0, parts: [], puffs: [], specks: [], hist: [], hT: 0, bulge: 0, Fv: 0, vapAcc: 0,
    };
  }
  const BA = mkBottle(true), BB = mkBottle(true);
  const REC = { hi: null, lo: null, armed: false, strokes: 0, opened: 0 };
  const SM = { on: false, t: 0, done: false };                 // 향 연기 장면
  let GEO = {};
  function layoutPump(scene) {
    const mk = (cx, s) => {
      const bw = 148 * s, bh = 240 * s, sh = 34 * s, nw = 42 * s, nh = 20 * s, base = P.y + P.h - (PHONE ? 92 : 96);
      const bodyTop = base - bh, shTop = bodyTop - sh, neckTop = shTop - nh;
      return { cx, s, base, bw, bh, sh, nw, nh, bodyTop, shTop, neckTop, x0: cx - bw / 2 + 10 * s, x1: cx + bw / 2 - 10 * s, y0: bodyTop + 10 * s, y1: base - 14 * s };
    };
    GEO = scene === 'pump'
      ? { A: mk(PHONE ? P.x + 108 : P.x + 214, PHONE ? 0.86 : 1.0) }
      : { A: mk(PHONE ? P.x + 108 : P.x + 244, PHONE ? 0.78 : 0.94), B: mk(PHONE ? P.x + 316 : P.x + 528, PHONE ? 0.78 : 0.94) };
  }
  function initBottle(b, g) {
    b.parts.length = 0; b.puffs.length = 0; b.specks.length = 0;
    const want = Math.round(16 * b.n);
    for (let i = 0; i < want; i++) b.parts.push(mkPart(g, 'air'));
    for (let i = 0; i < 16; i++) b.puffs.push({ x: rand(g.x0, g.x1), y: rand(g.y0 + 20 * g.s, g.y1), r: rand(26, 44) * g.s, ph: rand(0, TAU), v: rand(5, 12) });
    for (let i = 0; i < 28; i++) b.specks.push({ x: rand(g.x0 + 4, g.x1 - 4), y: rand(g.y0 + 30 * g.s, g.y1 - 20 * g.s), ph: rand(0, TAU) });
  }
  function mkPart(g, kind, atNeck) {
    const sp = 58 * g.s, a = rand(0, TAU);
    return {
      kind, x: atNeck ? g.cx + rand(-6, 6) * g.s : rand(g.x0, g.x1), y: atNeck ? g.shTop + 6 * g.s : rand(g.y0, g.y1),
      vx: Math.cos(a) * sp, vy: atNeck ? 110 * g.s : Math.sin(a) * sp, rot: rand(0, TAU), vr: rand(-2, 2), leaving: false, s: atNeck ? 0 : 1, fade: 0,
    };
  }
  function resetBottles() {
    [BA, BB].forEach((b) => Object.assign(b, mkBottle(true), { cap: new SciSim.Spring(0, { stiffness: 150, damping: 11 }) }));
    REC.hi = null; REC.lo = null; REC.armed = false; REC.strokes = 0; REC.opened = 0;
    SM.on = false; SM.t = 0; SM.done = false;
    layoutPump(S.scene === 'cloud' ? 'cloud' : 'pump');
    initBottle(BA, GEO.A); if (GEO.B) initBottle(BB, GEO.B);
    if (S.scene === 'pump') { BA.water = false; BA.w = 0; }
    refreshUI();
  }
  const bottles = () => (S.scene === 'cloud' ? [BA, BB] : [BA]);
  const geoOf = (b) => (b === BB ? GEO.B : GEO.A);

  function pump() {
    const bs = bottles();
    if (bs.some((b) => b.busy || b.openT > 0)) return;
    if (bs[0].n >= 1.44) { toast('병이 가득 찼어요! <b>뚜껑 열기</b>로 팽창시켜 봐요', 'bad', 1800); return; }
    Sound.click();
    bs.forEach((b) => {
      b.busy = true;
      SciSim.tween(b, { hp: 1 }, {
        duration: 0.17, ease: 'inQuad',
        onDone() {
          b.n = Math.min(1.45, b.n + 0.09); b.Tc += 4; REC.strokes++;
          const g = geoOf(b);
          for (let i = 0; i < 2; i++) { const q = mkPart(g, 'air', true); q.vy = 150 * g.s; b.parts.push(q); }
          FX.emit({ x: g.cx, y: g.neckTop - 4, vx: 0, vy: 40, life: 0.35, size: 8 * g.s, color: 'rgba(210,230,255,.8)', shape: 'smoke', grow: 20 });
          SciSim.tween(b, { hp: 0 }, { duration: 0.3, ease: 'outCubic', onDone() { b.busy = false; } });
        },
      });
    });
    refreshUI();
  }
  function openCap() {
    const bs = bottles();
    if (bs.some((b) => b.openT > 0)) return;
    Sound.click();
    bs.forEach((b) => { b.openT = 1.4; b.cap.target = 1; });
    REC.armed = true; REC.opened++; if (bs[0].n > 1.04) REC.lo = bs[0].Tc;
    refreshUI();
  }
  function smoke() {
    if (S.scene !== 'cloud' || SM.on || BA.nuclei) return;
    Sound.click();
    SM.on = true; SM.t = 0; SM.done = false;
    refreshUI();
  }

  function bottleUpdate(b, g, dt) {
    b.Tc += (T0 - b.Tc) * (1 - Math.exp(-dt / 2.5));
    if (b.openT > 0) {
      b.openT -= dt;
      const dn = (b.n - 1) * (1 - Math.exp(-dt / 0.28));
      if (dn > 0) { b.n -= dn; b.Tc -= 18 * dn * ((b.Tc + 273.15) / 293.15); }
      if (dn > 0.002 && Math.random() < 0.8) FX.emit({ x: g.cx + rand(-6, 6) * g.s, y: g.neckTop - 14 * g.s, vx: rand(-40, 40), vy: -rand(90, 190), life: 0.55, size: 6 * g.s, color: 'rgba(210,230,255,.85)', shape: 'smoke', grow: 24 });
      if (b.openT <= 0) { b.cap.target = 0; b.openT = 0; b.n = Math.max(1, b.n); }
    }
    b.cap.update(dt);
    b.P = P0 * b.n * (b.Tc + 273.15) / (T0 + 273.15);
    b.bulge = appr(b.bulge, clamp((b.P / P0 - 1) * 0.16, 0, 0.09), dt, 8);
    // 수증기 · 응결 (물이 들어 있는 병)
    if (b.water) {
      const sat = satW(b.Tc);
      if (b.w > sat) {
        const ex = b.w - sat, d = ex * (1 - Math.exp(-dt * (b.nuclei ? 5 : 0.008)));
        b.w -= d; b.F += d;
      } else {
        if (b.F > 0) { const d = Math.min(b.F, (sat - b.w) * (1 - Math.exp(-dt * 1.1))); b.F -= d; b.w += d; }
        const tgt = Math.min(sat, satW(T0)) * 0.97;                // 닫힌 병 안의 수증기량은 실내(20 °C) 포화량 근처 — 가열돼도 늘지 않아요
        if (b.w < tgt && b.F < 0.01) b.w += (tgt - b.w) * (1 - Math.exp(-dt / 6));
      }
    }
    b.Fv = appr(b.Fv, b.F, dt, 7);
    b.nu = appr(b.nu, b.nuclei ? 1 : 0, dt, 2.5);
    // 기록
    b.hT += dt;
    if (b.hT >= 0.25) { b.hT = 0; b.hist.push({ T: b.Tc, P: b.P }); if (b.hist.length > 140) b.hist.shift(); }
    // 분자: 개수 맞추기 (펌프질하면 들어오고, 뚜껑을 열면 나가요)
    const want = Math.round(16 * b.n);
    let have = 0, vap = 0;
    b.parts.forEach((q) => { if (q.kind === 'air' && !q.leaving) have++; else if (q.kind === 'vap' && !q.leaving) vap++; });
    while (have < want) { b.parts.push(mkPart(g, 'air', true)); have++; }
    if (have > want) {
      for (let k = 0; k < have - want; k++) {
        const c = b.parts.filter((q) => q.kind === 'air' && !q.leaving);
        if (c.length) { const q = c[(Math.random() * c.length) | 0]; q.leaving = true; }
      }
    }
    const wantV = b.water ? Math.round(clamp(b.w, 0, 30) * 0.4) : 0;
    while (vap < wantV) { b.parts.push(mkPart(g, 'vap')); vap++; }
    if (vap > wantV) {
      const c = b.parts.filter((q) => q.kind === 'vap' && !q.leaving);
      if (c.length) { const q = c[(Math.random() * c.length) | 0]; q.leaving = true; q.fade = 1; }
    }
    const sp = clamp(1 + (b.Tc - T0) * 0.03, 0.55, 1.6) * 58 * g.s;
    for (let i = b.parts.length - 1; i >= 0; i--) {
      const q = b.parts[i];
      q.rot += q.vr * dt; q.s = Math.min(1, q.s + dt * 5);
      if (q.leaving) {
        if (q.kind === 'vap') { q.fade -= dt * 3; if (q.fade <= 0) b.parts.splice(i, 1); continue; }
        const dx = g.cx - q.x, dy = g.shTop - q.y, d = Math.hypot(dx, dy) || 1;
        q.vx = appr(q.vx, (dx / d) * 260 * g.s, dt, 6); q.vy = appr(q.vy, (dy / d) * 260 * g.s, dt, 6);
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.y <= g.shTop + 4 * g.s) b.parts.splice(i, 1);
        continue;
      }
      const v = Math.hypot(q.vx, q.vy) || 1, k = appr(v, sp, dt, 2.5) / v;
      q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.x < g.x0) { q.x = g.x0; q.vx = Math.abs(q.vx); } else if (q.x > g.x1) { q.x = g.x1; q.vx = -Math.abs(q.vx); }
      if (q.y < g.y0) { q.y = g.y0; q.vy = Math.abs(q.vy); } else if (q.y > g.y1) { q.y = g.y1; q.vy = -Math.abs(q.vy); }
    }
    b.puffs.forEach((p) => { p.x += Math.sin(CLK.t * 0.6 + p.ph) * p.v * dt; p.y += Math.cos(CLK.t * 0.5 + p.ph) * p.v * 0.6 * dt; p.x = clamp(p.x, g.x0, g.x1); p.y = clamp(p.y, g.y0 + 10, g.y1); });
  }

  function pumpUpdate(dt) {
    bottles().forEach((b) => bottleUpdate(b, geoOf(b), dt));
    if (REC.hi == null || BA.Tc > REC.hi) REC.hi = BA.Tc;
    if (REC.armed && REC.lo != null && BA.Tc < REC.lo) REC.lo = BA.Tc;
    if (SM.on) {
      SM.t += dt;
      const g = GEO.A, k = clamp(SM.t / 1.4, 0, 1);
      if (Math.random() < dt * 28 && SM.t < 1.9) FX.emit({ x: g.cx + 70 * g.s * (1 - k), y: g.neckTop - 26 * g.s + 40 * k * g.s, vx: -20 + rand(-10, 10), vy: rand(-18, 6), life: 1.2, size: 5 * g.s, color: 'rgba(210,210,220,.8)', shape: 'smoke', grow: 16 });
      if (SM.t > 2.0) { SM.on = false; SM.done = true; BA.nuclei = true; Sound.success(); toast('🕯️ 연기 입자(응결핵)가 병 A에 들어갔어요', 'good', 2200); refreshUI(); }
    }
  }

  /* =========================================================
     ③ 산비탈을 오르는 공기 덩어리
     ========================================================= */
  const MG = PHONE
    ? { base: P.y + P.h - 84, k: 0.19, x0: P.x + 70, dx: 240 }
    : { base: P.y + P.h - 62, k: 0.168, x0: P.x + 214, dx: 350 };
  const HMAX = 2000, LCL = 1000, TG = 25, TD = 15;            // 지면 25 °C · 이슬점 15 °C → 구름 밑면 1000 m (모형값)
  const mx = (h) => MG.x0 + (MG.dx * h) / HMAX, my = (h) => MG.base - MG.k * h;
  const tAt = (h) => (h <= LCL ? TG - 10 * (h / 1000) : TD - 6 * ((h - LCL) / 1000));
  const pAt = (h) => P0 * Math.exp(-h / 8400);
  const radAt = (h) => (PHONE ? 20 : 26) * (1 + 0.0004 * h);
  const MT = { h: 0, Hv: 0, cloudA: 0, formed: false, mode: 'lift', drag: false, windT: 0, puffs: [], maxH: 0, mols: [] };
  const SLOPE = (() => { const tx = MG.dx, ty = -MG.k * HMAX, L = Math.hypot(tx, ty); return { tx: tx / L, ty: ty / L, nx: ty / L, ny: -tx / L, L }; })();
  for (let i = 0; i < 30; i++) MT.puffs.push({ dx: rand(-150, 30), v: rand(0, 1), r: rand(20, 40), ph: rand(0, TAU) });
  for (let i = 0; i < 9; i++) MT.mols.push({ a: rand(0, TAU), d: rand(0.2, 0.85), ph: rand(0, TAU) });
  const parcelPos = (h) => { const r = radAt(h); return { x: mx(h) + SLOPE.nx * (r + 3), y: my(h) + SLOPE.ny * (r + 3), r }; };
  function mtnUpdate(dt) {
    const M = MT;
    M.Hv = appr(M.Hv, M.h, dt, 7);
    M.windT += dt;
    const above = M.Hv > LCL + 60;
    M.cloudA = appr(M.cloudA, above ? clamp((M.Hv - LCL) / 260, 0.55, 1) : 0, dt, above ? 2.6 : 3.4);
    if (above && !M.formed) {
      M.formed = true;
      const p = parcelPos(M.Hv);
      celebrate(p.x, p.y - p.r);
      toast('☁️ <b>이슬점</b>에 도달! 여기가 구름 밑면이에요', 'good', 2400);
    }
    if (!above && M.Hv < LCL - 60) M.formed = false;
    M.maxH = Math.max(M.maxH, M.Hv);
  }

  /* ---------- 상승 원인 짝짓기 ---------- */
  const TAGS = [
    { id: 'heat', label: '지표가 가열될 때' }, { id: 'mtn', label: '산을 타고 오를 때' },
    { id: 'front', label: '찬·따뜻한 공기가 만날 때' }, { id: 'conv', label: '공기가 모여들 때' },
  ];
  const ORDER = ['conv', 'heat', 'front', 'mtn'];               // 그림 순서 (섞음)
  const MS = { slots: [], tags: [], marks: [], done: false };
  (function initMatch() {
    const pw = PHONE ? 202 : 372, ph = PHONE ? 170 : 148, gx0 = P.x + (PHONE ? 8 : 14), gy0 = P.y + (PHONE ? 50 : 46);
    const gap = PHONE ? 8 : 16;
    ORDER.forEach((id, i) => {
      const cx = i % 2, cy = (i / 2) | 0;
      const x = gx0 + cx * (pw + gap), y = gy0 + cy * (38 + ph + (PHONE ? 8 : 10));
      MS.slots.push({ id, x, y, w: pw, h: ph, sx: x, sy: y, sw: pw, sh: 34, tag: null });
    });
    const tw = PHONE ? 196 : 176, th = 42, hy = P.y + P.h - (PHONE ? 100 : 66);
    TAGS.forEach((t, i) => {
      const hx = PHONE ? P.x + 10 + (i % 2) * (tw + 12) : P.x + 24 + i * (tw + 12), hy2 = PHONE ? hy + ((i / 2) | 0) * (th + 6) : hy;
      MS.tags.push({ id: t.id, label: t.label, x: hx, y: hy2, hx, hy: hy2, w: tw, h: th, slot: -1, drag: false, lift: 0, gx: 0, gy: 0 });
    });
  })();
  function slotOf(tag) { return MS.slots.findIndex((s) => s.tag === tag); }
  function snapTag(tag, i) {
    const s = MS.slots[i];
    tag.slot = i;
    SciSim.tween(tag, { x: s.sx + (s.sw - tag.w) / 2, y: s.sy + (s.sh - tag.h) / 2 }, { duration: 0.32, ease: 'outBack' });
  }
  function homeTag(tag) { tag.slot = -1; SciSim.tween(tag, { x: tag.hx, y: tag.hy }, { duration: 0.3, ease: 'outBack' }); }
  function matchReset() {
    MS.slots.forEach((s) => { s.tag = null; });
    MS.tags.forEach((t) => { t.x = t.hx; t.y = t.hy; t.slot = -1; t.drag = false; t.lift = 0; });
    MS.marks = []; MS.done = false;
  }
  function matchWrong() { return MS.slots.map((s, i) => (s.tag && s.tag.id !== s.id ? i : -1)).filter((i) => i >= 0); }
  const matchPlaced = () => MS.slots.filter((s) => s.tag).length;
  const matchRight = () => MS.slots.filter((s) => s.tag && s.tag.id === s.id).length;

  /* =========================================================
     ④ 강수 과정 — 병합설(따뜻한 구름) · 빙정설(차가운 구름)
     ========================================================= */
  const RC = PHONE ? { x: P.x + 18, y: P.y + 92, w: 388, h: 136 } : { x: P.x + 58, y: P.y + 96, w: 656, h: 150 };
  const GY = P.y + P.h - (PHONE ? 78 : 74);
  const RRAIN = 9.6, TS = 1.5;
  const PR = {
    type: 'warm', ground: 'warm', drops: [], crys: [], vap: [], falls: [], cnt: { warm: 0, cold: 0, snow: 0 }, merges: 0, arrivals: 0, fell: 0,
    yf: 9999, snowH: 0, gc: 0, seedT: 0, flakes: [],
  };
  function precipReset(type, ground) {
    PR.type = type || PR.type; PR.ground = ground || PR.ground;
    PR.drops.length = 0; PR.crys.length = 0; PR.vap.length = 0; PR.falls.length = 0; PR.flakes.length = 0;
    PR.cnt.warm = PR.cnt.cold = PR.cnt.snow = 0; PR.merges = PR.arrivals = PR.fell = 0; PR.snowH = 0; PR.seedT = 0;
    PR.yf = PR.type === 'cold' ? (PR.ground === 'warm' ? GY - 120 : GY + 24) : 9999;
    PR.gc = PR.type === 'cold' && PR.ground === 'cold' ? 1 : 0;
    const cold = PR.type === 'cold';
    const nSmall = cold ? 80 : 120;
    for (let i = 0; i < nSmall; i++) PR.drops.push(mkDrop(cold ? rand(2.8, 3.8) : rand(3.0, 4.2), 1));
    if (!cold) {
      for (let i = 0; i < 3; i++) PR.drops.push(mkDrop(8.4, 1));
      for (let i = 0; i < 3; i++) PR.drops.push(mkDrop(6.4, 1));
    } else {
      for (let i = 0; i < 5; i++) PR.crys.push(mkCrys(rand(7, 9), 1));
    }
    refreshUI();
  }
  function mkDrop(r, a) { return { x: rand(RC.x + 16, RC.x + RC.w - 16), y: rand(RC.y + 16, RC.y + RC.h - 18), r, a, ph: rand(0, TAU), pulse: 0, st: 'cloud', vy: 0 }; }
  function mkCrys(r, a) { return { x: rand(RC.x + 30, RC.x + RC.w - 30), y: rand(RC.y + 24, RC.y + RC.h - 30), r, a, ph: rand(0, TAU), rot: rand(0, TAU), vr: rand(-0.4, 0.4), st: 'cloud', vy: 0, m: 0, pop: 0 }; }
  const cbrt = Math.cbrt;
  function precipUpdate(dt0) {
    const R = PR, dt = dt0 * TS, t = CLK.t, cold = R.type === 'cold';
    R.gc = appr(R.gc, cold && R.ground === 'cold' ? 1 : 0, dt0, 3);
    const yfT = cold ? (R.ground === 'warm' ? GY - 120 : GY + 24) : 9999;
    R.yf = R.yf > 5000 && yfT < 5000 ? yfT : (yfT > 5000 ? 9999 : appr(R.yf, yfT, dt0, 2.2));
    R.snowH = appr(R.snowH, R.ground === 'cold' && cold ? Math.min(16, R.cnt.snow * 2.4) : 0, dt0, R.ground === 'cold' ? 1.5 : 0.8);
    // 물방울
    let nSmall = 0, nBig = 0;
    for (let i = R.drops.length - 1; i >= 0; i--) {
      const d = R.drops[i];
      d.a = Math.min(1, d.a + dt0 * 2); d.pulse = Math.max(0, d.pulse - dt0 * 3);
      if (d.st === 'cloud') {
        if (cold) {
          d.x += Math.sin(t * 0.9 + d.ph) * 5 * dt; d.y += Math.cos(t * 0.7 + d.ph * 1.3) * 4 * dt;
        } else {
          const vt = 0.85 * d.r * d.r;
          d.y += (vt - 12 + Math.sin(t * 1.3 + d.ph) * 4) * dt; d.x += Math.sin(t * 0.8 + d.ph) * 7 * dt;
        }
        if (d.x < RC.x + 14) d.x = RC.x + 14; else if (d.x > RC.x + RC.w - 14) d.x = RC.x + RC.w - 14;
        if (d.y < RC.y + 12) d.y = RC.y + 12;
        if (d.y > RC.y + RC.h - 14) {
          if (!cold && d.r >= RRAIN) { d.st = 'fall'; d.vy = 0.85 * d.r * d.r; R.fell++; }
          else { d.y = RC.y + 12 + rand(0, 14); d.x = clamp(d.x + rand(-60, 60), RC.x + 14, RC.x + RC.w - 14); }
        }
        if (d.r < 4.6) nSmall++; else nBig++;
      } else if (d.st === 'fall') {
        d.vy = Math.min(380, d.vy + 520 * dt); d.y += d.vy * dt;
        if (d.y >= GY) {
          R.cnt.warm++; for (let k = 0; k < 6; k++) FX.emit({ x: d.x, y: GY, vx: rand(-60, 60), vy: -rand(60, 140), life: 0.45, size: 2.4, color: '#9fd0ff', gravity: 520 });
          R.drops.splice(i, 1);
        }
      }
    }
    if (!cold) {
      // 큰 물방울이 작은 물방울과 부딪쳐 합쳐져요 (병합)
      for (let i = 0; i < R.drops.length; i++) {
        const a = R.drops[i];
        if (a.st !== 'cloud' || a.r < 4.6) continue;
        for (let j = R.drops.length - 1; j >= 0; j--) {
          const b = R.drops[j];
          if (b === a || b.st !== 'cloud' || b.r >= a.r || a.r < b.r + 0.5) continue;
          const dx = a.x - b.x, dy = a.y - b.y, rr = (a.r + b.r) * 1.9;
          if (dx * dx + dy * dy < rr * rr && b.a > 0.6) {
            a.r = cbrt(a.r * a.r * a.r + b.r * b.r * b.r); a.pulse = 1; R.merges++;
            FX.emit({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vy: -8, life: 0.4, size: 7, color: '#ffffff', shape: 'bubble' });
            R.drops.splice(j, 1); if (j < i) i--;
          }
        }
      }
      R.seedT += dt0;
      if (R.seedT > 2.2 && nBig < 8) { R.seedT = 0; const d = mkDrop(6.6, 0); d.y = RC.y + 18; d.pulse = 1; R.drops.push(d); }
    }
    while (nSmall < (cold ? 80 : 120)) { R.drops.push(mkDrop(cold ? rand(2.8, 3.8) : rand(3.0, 4.2), 0)); nSmall++; }
    // 빙정
    if (cold) {
      let inCloud = 0;
      for (let i = R.crys.length - 1; i >= 0; i--) {
        const c = R.crys[i];
        c.a = Math.min(1, c.a + dt0 * 2); c.rot += c.vr * dt; c.pop = Math.max(0, c.pop - dt0 * 4);
        if (c.st === 'cloud') {
          inCloud++;
          c.x += Math.sin(t * 0.5 + c.ph) * 6 * dt; c.y += Math.cos(t * 0.6 + c.ph) * 4 * dt;
          c.x = clamp(c.x, RC.x + 28, RC.x + RC.w - 28); c.y = clamp(c.y, RC.y + 26, RC.y + RC.h - 30);
          if (Math.random() < 2.1 * dt && R.drops.length) {            // 물방울에서 수증기가 빠져나와 빙정에 붙어요
            const d = R.drops[(Math.random() * R.drops.length) | 0];
            if (d.st === 'cloud' && d.a > 0.8 && Math.hypot(d.x - c.x, d.y - c.y) < (PHONE ? 220 : 300)) {
              d.r = cbrt(Math.max(0.3, d.r * d.r * d.r - 8));
              R.vap.push({ x: d.x, y: d.y, c, sp: rand(130, 190) });
              if (d.r < 1.7) R.drops.splice(R.drops.indexOf(d), 1);
            }
          }
          if (c.r >= 14) { c.st = 'fall'; c.vy = 8; R.fell++; }
        } else if (c.st === 'fall') {
          c.vy = Math.min(62, c.vy + 40 * dt); c.y += c.vy * dt; c.x += Math.sin(t * 1.8 + c.ph) * 16 * dt;
          if (c.y > RC.y + RC.h + 6 && R.yf < GY && c.y >= R.yf) { c.st = 'melt'; c.m = 0; }
          if (c.y >= GY) { landCrys(c); R.crys.splice(i, 1); }
        } else if (c.st === 'melt') {
          c.m += dt / 0.7; c.y += 40 * dt;
          if (c.m >= 1) { c.st = 'rain'; c.vy = 60; }
        } else if (c.st === 'rain') {
          c.vy = Math.min(360, c.vy + 520 * dt); c.y += c.vy * dt;
          if (c.y >= GY) { landCrys(c); R.crys.splice(i, 1); }
        }
      }
      if (inCloud < 5 && Math.random() < dt0 * 0.8) { const c = mkCrys(6.4, 0); c.pop = 1; R.crys.push(c); }
      for (let i = R.vap.length - 1; i >= 0; i--) {
        const v = R.vap[i], c = v.c;
        if (c.st !== 'cloud') { R.vap.splice(i, 1); continue; }
        const dx = c.x - v.x, dy = c.y - v.y, d = Math.hypot(dx, dy) || 1;
        v.x += (dx / d) * v.sp * dt; v.y += (dy / d) * v.sp * dt;
        if (d < c.r + 3) { c.r = Math.min(17, c.r + 0.6); c.pop = 1; R.arrivals++; R.vap.splice(i, 1); }
      }
    }
  }
  function landCrys(c) {
    const R = PR;
    if (c.st === 'rain' || c.m >= 1) { R.cnt.cold++; for (let k = 0; k < 6; k++) FX.emit({ x: c.x, y: GY, vx: rand(-60, 60), vy: -rand(60, 140), life: 0.45, size: 2.4, color: '#9fd0ff', gravity: 520 }); }
    else { R.cnt.snow++; for (let k = 0; k < 7; k++) FX.emit({ x: c.x, y: GY - 2, vx: rand(-40, 40), vy: -rand(30, 80), life: 0.7, size: 2.6, color: '#ffffff', gravity: 160, shape: 'star' }); }
  }

  /* =========================================================
     장면 전환 · 컨트롤
     ========================================================= */
  function setScene(name, reset) {
    const changed = S.scene !== name;
    S.scene = name;
    if (changed || reset) {
      if (name === 'pump' || name === 'cloud') resetBottles();
      else if (name === 'mtn') { MT.h = 0; MT.Hv = 0; MT.cloudA = 0; MT.formed = false; MT.maxH = 0; syncRange($('#liftR'), 0); }
      else precipReset(PR.type, PR.ground);
    }
    if (changed) { S.tr = 0; SciSim.tween(S, { tr: 1 }, { duration: 0.5, ease: 'outCubic' }); }
    view.wrap.style.setProperty('--stage-bg', name === 'pump' || name === 'cloud' ? '#16203a' : '#d6e9f8');
    refreshUI();
    showHint(HINT[name]);
  }
  const binds = {};
  function syncRange(el, v) { if (el && binds[el.id]) binds[el.id].set(v); }
  binds.liftR = SciSim.bindRange($('#liftR'), $('#liftO'), (v) => v + ' m', (v) => { MT.h = +v; });
  $('#pumpBtn').addEventListener('click', pump);
  $('#openBtn').addEventListener('click', openCap);
  $('#smokeBtn').addEventListener('click', smoke);
  $('#resetBtn').addEventListener('click', () => { Sound.click(); setScene(S.scene, true); if (S.scene === 'mtn' && MT.mode === 'match') matchReset(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, false); }));
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#cloudSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setCloud(b.dataset.ct); }));
  $$('#groundSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setGround(b.dataset.g); }));
  function setMode(m) { MT.mode = m; refreshUI(); }
  function setCloud(c) { if (PR.type === c) return; precipReset(c, PR.ground); }
  function setGround(g) {
    if (PR.ground === g) return;
    PR.ground = g; refreshUI();
  }
  function refreshUI() {
    const sc = S.scene;
    $('#ctlPump').hidden = !(sc === 'pump' || sc === 'cloud');
    $('#ctlMtn').hidden = sc !== 'mtn';
    $('#ctlRain').hidden = sc !== 'rain';
    $('#liftBox').hidden = MT.mode !== 'lift';
    $('#groundBox').hidden = PR.type !== 'cold';
    $('#smokeBtn').hidden = !(sc === 'cloud') || !(F.has('smoke') || (game && game.free));
    $('#smokeBtn').disabled = SM.on || BA.nuclei;
    $('#smokeBtn').textContent = BA.nuclei ? '✅ 연기가 들어갔어요 (병 A)' : '🕯️ 향 연기 넣기 (병 A)';
    const bs = bottles();
    const full = bs[0].n >= 1.44, busy = bs.some((b) => b.busy || b.openT > 0);
    $('#pumpBtn').disabled = busy; $('#openBtn').disabled = bs.some((b) => b.openT > 0);
    $('#pumpBtn').textContent = full ? '💨 가득 찼어요!' : '💨 펌프질 (압축)';
    $('#pumpNote').textContent = sc === 'cloud' ? '연기를 넣고, 펌프질을 여러 번 한 뒤 병이 식으면 뚜껑을 열어요. 두 병에 똑같이 적용돼요.' : '펌프질을 여러 번 한 뒤, 병이 실내 온도로 돌아오면 뚜껑을 열어요.';
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    $('#tbLabel').textContent = SC[sc];
    $$('#modeSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === MT.mode)));
    $$('#cloudSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ct === PR.type)));
    $$('#groundSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === PR.ground)));
  }
  let lastUIKey = '';
  function uiTick() {          // 펌프·뚜껑 단추의 사용 가능 여부는 상태가 바뀔 때만 갱신
    if (S.scene !== 'pump' && S.scene !== 'cloud') return;
    const bs = bottles(), key = bs.map((b) => (b.busy ? 1 : 0) + '' + (b.openT > 0 ? 1 : 0) + (b.n >= 1.44 ? 1 : 0)).join('') + SM.on + BA.nuclei;
    if (key !== lastUIKey) { lastUIKey = key; refreshUI(); }
  }

  /* =========================================================
     그리기 — ①② 페트병 장면
     ========================================================= */
  function bottlePath(g) {
    const { cx, s, bw, nw, sh, base, bodyTop, shTop, neckTop } = g;
    const hw = bw / 2, nhw = nw / 2, r = 24 * s;
    ctx.beginPath();
    ctx.moveTo(cx - nhw, neckTop); ctx.lineTo(cx - nhw, shTop);
    ctx.bezierCurveTo(cx - nhw - 4 * s, shTop + sh * 0.55, cx - hw, bodyTop - sh * 0.1, cx - hw, bodyTop + 8 * s);
    ctx.lineTo(cx - hw, base - r); ctx.quadraticCurveTo(cx - hw, base, cx - hw + r, base);
    ctx.lineTo(cx + hw - r, base); ctx.quadraticCurveTo(cx + hw, base, cx + hw, base - r);
    ctx.lineTo(cx + hw, bodyTop + 8 * s);
    ctx.bezierCurveTo(cx + hw, bodyTop - sh * 0.1, cx + nhw + 4 * s, shTop + sh * 0.55, cx + nhw, shTop);
    ctx.lineTo(cx + nhw, neckTop); ctx.closePath();
  }
  function lcd(x, y, w, h, label, val, unit, color, size) {
    ctx.save();
    ctx.fillStyle = '#0c1626'; D.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(160,190,230,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    text(x + 10, y + 16, label, { size: 12.5, weight: 800, align: 'left', color: 'rgba(190,210,240,.85)' });
    ctx.save();
    ctx.font = '800 ' + (size || 30) + 'px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = color; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.fillText(val, x + w - 12 - (unit ? ctx.measureText(unit).width * 0.55 + 6 : 0), y + h - 10);
    ctx.restore();
    if (unit) text(x + w - 10, y + h - 10, unit, { size: 13, weight: 800, align: 'right', color: 'rgba(190,210,240,.9)' });
  }
  const tCol = (T) => (T > T0 + 1.5 ? '#ffb15c' : T < T0 - 1.5 ? '#6fd3ff' : '#8dffb4');
  function drawBottle(b, g) {
    const s = g.s, cx = g.cx;
    const dT = clamp((b.Tc - T0) / 10, -1, 1);
    // 온도 빛
    if (Math.abs(dT) > 0.05) D.glow(cx, (g.bodyTop + g.base) / 2, 150 * s, dT > 0 ? '#ff8a3d' : '#4cc3ff', 0.42 * Math.abs(dT));
    contactShadow(cx, g.base + 6, g.bw * 0.62, 8, 1);
    // 병 몸통 (압력이 높으면 살짝 부풀어요)
    ctx.save();
    ctx.translate(cx, 0); ctx.scale(1 + b.bulge, 1); ctx.translate(-cx, 0);
    bottlePath(g);
    const fg = ctx.createLinearGradient(g.cx - g.bw / 2, 0, g.cx + g.bw / 2, 0);
    fg.addColorStop(0, 'rgba(170,205,245,.20)'); fg.addColorStop(0.5, 'rgba(210,230,255,.07)'); fg.addColorStop(1, 'rgba(170,205,245,.2)');
    ctx.fillStyle = fg; ctx.fill();
    ctx.save(); bottlePath(g); ctx.clip();
    ctx.translate(cx, 0); ctx.scale(1 / (1 + b.bulge), 1); ctx.translate(-cx, 0);
    // 물
    if (b.water) {
      const wy = g.base - 36 * s;
      const wg = ctx.createLinearGradient(0, wy, 0, g.base);
      wg.addColorStop(0, 'rgba(120,190,255,.55)'); wg.addColorStop(1, 'rgba(60,130,220,.75)');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(g.x0 - 20, g.base);
      for (let i = 0; i <= 16; i++) ctx.lineTo(g.x0 - 20 + ((g.x1 - g.x0 + 40) * i) / 16, wy + Math.sin(CLK.t * 2.2 + i * 0.8) * 1.6);
      ctx.lineTo(g.x1 + 20, g.base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(g.x0 - 10, wy - 1, g.x1 - g.x0 + 20, 2);
    }
    // 안개(구름) 솜털
    const k = clamp(b.Fv / 2.2, 0, 1);
    if (k > 0.01) {
      const pf = puffSpr();
      b.puffs.forEach((p) => drawSpr(pf, p.x, p.y, 0, 0.62 * k, p.r / 32));
    }
    // 응결핵 (연기 입자)와 물방울
    if (b.nu > 0.02) {
      b.specks.forEach((p) => {
        const x = p.x + Math.sin(CLK.t * 0.8 + p.ph) * 3, y = p.y + Math.cos(CLK.t * 0.7 + p.ph) * 3;
        if (k > 0.05) {
          const dr = (1.4 + 3.6 * k) * s;
          ctx.fillStyle = 'rgba(235,245,255,' + (0.28 * b.nu + 0.4 * k).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y, dr, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * k).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x - dr * 0.3, y - dr * 0.35, dr * 0.3, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = 'rgba(70,70,80,' + (0.95 * b.nu).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.7 * s, 0, TAU); ctx.fill();
      });
    }
    // 분자
    const ar = Math.round(5 * s * 2) / 2, vr = Math.round(5.6 * s * 2) / 2;
    const as = airSpr(ar), vs = molSpr(vr);
    b.parts.forEach((q) => {
      if (q.kind === 'air') drawSpr(as, q.x, q.y, 0, 1, ease.outBack(q.s));
      else drawSpr(vs, q.x, q.y, q.rot, q.fade > 0 || q.leaving ? q.fade : 1, ease.outBack(q.s));
    });
    ctx.restore();
    // 병 윤곽과 반사
    bottlePath(g);
    ctx.strokeStyle = 'rgba(205,225,250,.85)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5;
    [0.28, 0.4, 0.82].forEach((f) => { const y = g.bodyTop + g.bh * f; ctx.beginPath(); ctx.moveTo(cx - g.bw / 2 * (1 + b.bulge) + 3, y); ctx.lineTo(cx + g.bw / 2 * (1 + b.bulge) - 3, y); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - g.bw / 2 * (1 + b.bulge) + 12 * s, g.bodyTop + 22 * s); ctx.lineTo(cx - g.bw / 2 * (1 + b.bulge) + 12 * s, g.base - 40 * s); ctx.stroke();
    ctx.restore();
    // 목 · 뚜껑 · 펌프
    const cv = b.cap.value, nhw = g.nw / 2;
    ctx.fillStyle = 'rgba(205,225,250,.55)'; D.roundRect(cx - nhw - 3 * s, g.neckTop + 6 * s, g.nw + 6 * s, 4 * s, 2); ctx.fill();
    ctx.save();
    ctx.translate(cx - nhw, g.neckTop); ctx.rotate(-0.55 * cv); ctx.translate(-cx + nhw, -g.neckTop - 62 * s * cv);
    const capY = g.neckTop - 14 * s;
    softShadow(cx - nhw * 1.5, capY, g.nw * 1.5, 14 * s, 5, 6, 3, 'rgba(0,0,0,.4)');
    const cg = ctx.createLinearGradient(0, capY, 0, capY + 14 * s); cg.addColorStop(0, '#4a86f0'); cg.addColorStop(1, '#2457b8');
    ctx.fillStyle = cg; D.roundRect(cx - nhw * 1.5, capY, g.nw * 1.5, 14 * s, 5 * s); ctx.fill();
    const bTop = capY - 66 * s;
    const bg2 = ctx.createLinearGradient(cx - 13 * s, 0, cx + 13 * s, 0); bg2.addColorStop(0, '#9aa8bc'); bg2.addColorStop(0.35, '#eef3f9'); bg2.addColorStop(1, '#8796ab');
    ctx.fillStyle = bg2; D.roundRect(cx - 14 * s, bTop, 28 * s, 66 * s, 5 * s); ctx.fill();
    ctx.strokeStyle = 'rgba(40,60,90,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    const hy = bTop - 22 * s + b.hp * 42 * s;
    ctx.fillStyle = '#c7d0dd'; ctx.fillRect(cx - 3.5 * s, hy + 8 * s, 7 * s, bTop + 14 * s - hy);
    const hg = ctx.createLinearGradient(0, hy, 0, hy + 12 * s); hg.addColorStop(0, '#ff6b72'); hg.addColorStop(1, '#c42a31');
    softShadow(cx - 36 * s, hy, 72 * s, 12 * s, 6 * s, 6, 3, 'rgba(0,0,0,.4)');
    ctx.fillStyle = hg; D.roundRect(cx - 36 * s, hy, 72 * s, 12 * s, 6 * s); ctx.fill();
    ctx.restore();
  }
  function drawStageBg() {
    const bg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    bg.addColorStop(0, '#26335a'); bg.addColorStop(1, '#101a30');
    softShadow(P.x, P.y, P.w, P.h, 16, 12, 4, 'rgba(10,20,50,.3)');
    ctx.fillStyle = bg; D.roundRect(P.x, P.y, P.w, P.h, 16); ctx.fill();
    ctx.save(); D.roundRect(P.x, P.y, P.w, P.h, 16); ctx.clip();
    const sp = ctx.createRadialGradient(P.x + P.w * 0.35, P.y + 60, 20, P.x + P.w * 0.35, P.y + 160, P.w * 0.7);
    sp.addColorStop(0, 'rgba(140,170,230,.28)'); sp.addColorStop(1, 'rgba(140,170,230,0)');
    ctx.fillStyle = sp; ctx.fillRect(P.x, P.y, P.w, P.h);
    const ty = P.y + P.h - (PHONE ? 86 : 90);
    const tg = ctx.createLinearGradient(0, ty, 0, P.y + P.h); tg.addColorStop(0, '#3a4a6e'); tg.addColorStop(1, '#232f4b');
    ctx.fillStyle = tg; ctx.fillRect(P.x, ty, P.w, P.y + P.h - ty);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(P.x, ty, P.w, 2);
    ctx.restore();
  }
  function drawSparkline(x, y, w, h) {
    const b = BA;
    ctx.fillStyle = '#f4f7fb'; D.roundRect(x, y, w, h, 10); ctx.fill();
    const px = x + 38, pw = w - 38 - 40, py = y + 40, ph = h - 40 - 26;
    ctx.save();
    ctx.strokeStyle = 'rgba(93,104,121,.2)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const yy = py + (ph * i) / 4; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke(); }
    ctx.restore();
    const Y = (T) => py + ph - ((T - 5) / 40) * ph, YP = (P_) => py + ph - ((P_ - 950) / 600) * ph;
    D.dashedLine(px, Y(T0), px + pw, Y(T0), { color: 'rgba(242,107,58,.55)', width: 1.5, dash: [4, 4] });
    D.dashedLine(px, YP(P0), px + pw, YP(P0), { color: 'rgba(47,125,225,.55)', width: 1.5, dash: [4, 4] });
    [5, 20, 35].forEach((T) => text(px - 4, Y(T) + 4.5, String(T), { size: 12, weight: 700, align: 'right', color: '#c2410c' }));
    [1000, 1250, 1500].forEach((P_) => text(px + pw + 4, YP(P_) + 4.5, String(P_), { size: 12, weight: 700, align: 'left', color: '#1d4ed8' }));
    text(px - 4, py - 8, '°C', { size: 12.5, weight: 800, align: 'right', color: '#c2410c' });
    text(px + pw + 4, py - 8, 'hPa', { size: 12.5, weight: 800, align: 'left', color: '#1d4ed8' });
    text(x + 10, y + 17, '센서 기록 (최근 35초)', { size: 13, weight: 800, align: 'left', color: COL.ink });
    const n = b.hist.length, XS = (i) => px + pw - (n - 1 - i) * (pw / 140);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(px, py - 4, pw, ph + 8); ctx.clip();
    ctx.strokeStyle = '#2f7de1'; ctx.beginPath(); b.hist.forEach((q, i) => { const X = XS(i); i ? ctx.lineTo(X, YP(q.P)) : ctx.moveTo(X, YP(q.P)); }); ctx.stroke();
    ctx.strokeStyle = '#f26b3a'; ctx.beginPath(); b.hist.forEach((q, i) => { const X = XS(i); i ? ctx.lineTo(X, Y(q.T)) : ctx.moveTo(X, Y(q.T)); }); ctx.stroke();
    ctx.restore();
    text(px + pw / 2, y + h - 7, '점선: 실내 20 °C · 1기압(1013 hPa)', { size: 12.5, weight: 700, color: COL.muted });
  }
  function drawPumpScene() {
    drawStageBg();
    const g = GEO.A;
    D.label(P.x + 14, P.y + 24, '🔍 입자 모형', { align: 'left', bg: 'rgba(14,165,233,.9)', size: PHONE ? 13 : 14 });
    drawBottle(BA, g);
    // 센서 카드
    const cw = PHONE ? 200 : 292, cxx = P.x + P.w - cw - (PHONE ? 8 : 16), cy = P.y + (PHONE ? 50 : 22), ch = PHONE ? 330 : P.h - 44;
    card(cxx, cy, cw, ch, 16, '#fff');
    text(cxx + 14, cy + 26, '🔬 디지털 센서', { size: 16, weight: 800, align: 'left', color: COL.ink });
    const lh = PHONE ? 58 : 70, lsz = PHONE ? 26 : 32;
    lcd(cxx + 12, cy + 38, cw - 24, lh, '온도 센서', f1(BA.Tc), '°C', tCol(BA.Tc), lsz);
    lcd(cxx + 12, cy + 46 + lh, cw - 24, lh, '압력 센서', String(Math.round(BA.P)), 'hPa', '#7fd3ff', lsz);
    const sy = cy + 54 + lh * 2;
    drawSparkline(cxx + 12, sy, cw - 24, ch - (sy - cy) - 12);
    // 안내
    if (REC.strokes > 0 || REC.opened > 0) {
      const t = BA.openT > 0 ? '🔓 팽창 중' : BA.busy ? '⬇ 압축 중' : '';
      if (t) D.label(g.cx, g.neckTop - 110 * g.s - 18, t, { bg: BA.openT > 0 ? COL.cold : COL.warm, size: 14 });
    }
    if (BA.openT <= 0 && BA.n > 1.2) D.label(g.cx, g.base + 42, '압력이 높아졌어요 (' + Math.round(BA.P) + ' hPa)', { bg: 'rgba(242,107,58,.9)', size: 13 });
    FX.draw(ctx);
  }
  function drawCloudScene() {
    drawStageBg();
    D.label(P.x + 14, P.y + 24, '🔍 입자 모형', { align: 'left', bg: 'rgba(14,165,233,.9)', size: PHONE ? 13 : 14 });
    [['A', BA, GEO.A, '물 + 향 연기'], ['B', BB, GEO.B, '물만']].forEach(([id, b, g, nm]) => {
      drawBottle(b, g);
      D.label(g.cx, P.y + (PHONE ? 62 : 56), '병 ' + id + ' · ' + nm, { bg: id === 'A' ? '#8b5a2b' : '#3b5b8f', size: PHONE ? 13 : 15 });
      const k = clamp(b.Fv / 2.2, 0, 1);
      D.label(g.cx, P.y + (PHONE ? 90 : 86), k > 0.45 ? '☁️ 뿌옇다 (구름!)' : k > 0.12 ? '조금 흐려요' : '맑다', { bg: k > 0.45 ? COL.good : 'rgba(255,255,255,.18)', size: 13 });
      // 작은 센서
      const lw = PHONE ? 150 : 176, lx = g.cx - lw / 2, ly = g.base + 18;
      lcd(lx, ly, lw / 2 - 2, 46, '온도', f1(b.Tc), '', tCol(b.Tc), PHONE ? 17 : 20);
      lcd(lx + lw / 2 + 2, ly, lw / 2 - 2, 46, '압력', String(Math.round(b.P)), '', '#7fd3ff', PHONE ? 17 : 20);
    });
    // 향 연기
    if (SM.on) {
      const g = GEO.A, k = ease.outCubic(clamp(SM.t / 1.2, 0, 1)), out = SM.t > 1.6 ? clamp((SM.t - 1.6) / 0.4, 0, 1) : 0;
      const ix = g.cx + (92 - 70 * k + 90 * out) * g.s, iy = g.neckTop - 30 * g.s + 46 * k * g.s - 0;
      ctx.save(); ctx.translate(ix, iy); ctx.rotate(-0.6);
      ctx.fillStyle = '#8b5a2b'; D.roundRect(0, -2.5, 120 * g.s, 5, 2.5); ctx.fill();
      ctx.restore();
      D.glow(ix, iy, 16, '#ff6a30', 0.9);
      D.sphere(ix, iy, 3.2, '#ff5a2a', { gloss: false });
    }
    // 범례
    if (!PHONE) {
      const mx0 = P.x + P.w / 2 - 14;
      text(mx0 + 6, P.y + 245, 'VS', { size: 26, weight: 800, color: 'rgba(255,255,255,.35)' });
      ctx.fillStyle = 'rgba(70,70,80,.95)'; ctx.beginPath(); ctx.arc(mx0 - 34, P.y + 296, 3.4, 0, TAU); ctx.fill();
      text(mx0 - 24, P.y + 301, '응결핵(연기)', { size: 13, weight: 700, align: 'left', color: 'rgba(230,238,250,.85)' });
      drawSpr(airSpr(5), mx0 - 34, P.y + 322, 0, 1, 1);
      text(mx0 - 24, P.y + 327, '공기 분자', { size: 13, weight: 700, align: 'left', color: 'rgba(230,238,250,.85)' });
      drawSpr(molSpr(5.5), mx0 - 34, P.y + 348, 0, 1, 1);
      text(mx0 - 24, P.y + 353, '수증기 분자', { size: 13, weight: 700, align: 'left', color: 'rgba(230,238,250,.85)' });
    }
    FX.draw(ctx);
  }

  /* =========================================================
     그리기 — ③ 산 · 공기 덩어리
     ========================================================= */
  function drawMtn() {
    const M = MT, hv = M.Hv, r0 = parcelPos(hv);
    ctx.save();
    softShadow(P.x, P.y, P.w, P.h, 16, 12, 4, 'rgba(10,30,70,.25)');
    D.roundRect(P.x, P.y, P.w, P.h, 16); ctx.clip();
    const sg = ctx.createLinearGradient(0, P.y, 0, MG.base);
    sg.addColorStop(0, mix('#8fc7f2', '#bcd9f0', clamp(M.cloudA, 0, 1) * 0.7)); sg.addColorStop(1, '#e8f4fd');
    ctx.fillStyle = sg; ctx.fillRect(P.x, P.y, P.w, P.h);
    D.glow(P.x + P.w - 70, P.y + 64, 70, '#fff3b0', 0.9); D.sphere(P.x + P.w - 70, P.y + 64, 22, '#ffd54a', { gloss: false });
    // 산
    const top = my(HMAX), xr = P.x + P.w;
    ctx.beginPath(); ctx.moveTo(P.x, MG.base); ctx.lineTo(MG.x0, MG.base);
    ctx.lineTo(mx(HMAX), top);
    ctx.quadraticCurveTo(mx(HMAX) + 40, top - 4, mx(HMAX) + 90, my(1500));
    ctx.lineTo(xr, my(250)); ctx.lineTo(xr, P.y + P.h); ctx.lineTo(P.x, P.y + P.h); ctx.closePath();
    const mg = ctx.createLinearGradient(0, top, 0, MG.base);
    mg.addColorStop(0, '#dfe7ee'); mg.addColorStop(0.2, '#a9b6a3'); mg.addColorStop(0.55, '#79a86a'); mg.addColorStop(1, '#5e9a58');
    ctx.fillStyle = mg; ctx.fill();
    // 눈 덮인 꼭대기
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(mx(1720), my(1720)); ctx.lineTo(mx(HMAX) + 70, my(1720)); ctx.lineTo(mx(HMAX) + 90, my(1500)); ctx.lineTo(mx(HMAX), top - 6); ctx.closePath(); ctx.fill(); ctx.restore();
    // 나무
    for (let i = 0; i < 9; i++) {
      const h = 40 + i * 85, x = mx(h) + 10 + (i % 3) * 14, y = my(h) + 16 + (i % 2) * 8;
      ctx.fillStyle = '#2f7a46'; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.fill();
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 1.5, y, 3, 4);
    }
    ctx.fillStyle = '#4f8f4c'; ctx.fillRect(P.x, MG.base, MG.x0 - P.x, P.y + P.h - MG.base);
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(P.x, MG.base, MG.x0 - P.x, 3);
    // 구름 밑면 표시
    const yL = my(LCL);
    D.dashedLine(P.x + 14, yL, mx(LCL) + 6, yL, { color: 'rgba(3,105,161,.65)', width: 2, dash: [8, 6], offset: -CLK.t * 14 });
    if (!M.formed && M.cloudA < 0.05) D.ring(mx(LCL) - 8, yL, 12, CLK.t, { color: COL.warm });
    // 구름 (밑면은 평평하게)
    if (M.cloudA > 0.02) {
      ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y, P.w, yL + 3); ctx.clip();
      const pf = puffSpr();
      M.puffs.forEach((p) => {
        const y = yL - 6 - p.v * (PHONE ? 70 : 84) - p.r * 0.3 + Math.sin(CLK.t * 0.7 + p.ph) * 2;
        const x = mx((MG.base - y) / MG.k) + p.dx * (PHONE ? 0.7 : 1) + Math.cos(CLK.t * 0.5 + p.ph) * 3;
        drawSpr(pf, x, y, 0, 0.88 * M.cloudA, (p.r * (0.6 + 0.4 * M.cloudA) * 1.5) / 32);
      });
      ctx.restore();
    }
    D.label(P.x + (PHONE ? 62 : 84), yL - 14, '구름 밑면 · ' + LCL + ' m', { bg: 'rgba(3,105,161,.9)', size: 13 });
    // 올라가는 바람 화살표
    for (let i = 0; i < 3; i++) {
      const f = ((M.windT * 0.35 + i / 3) % 1), h = 80 + f * 1500;
      const a = Math.sin(f * Math.PI) * 0.8;
      const ox = SLOPE.nx * 70, oy = SLOPE.ny * 70;
      if (h + 140 < HMAX + 200) D.arrow(mx(h) + ox, my(h) + oy, mx(h + 150) + ox, my(h + 150) + oy, { color: '#2f7de1', width: 4, head: 11, alpha: a });
    }
    if (M.Hv < 120) text(MG.x0 - (PHONE ? 20 : 60), MG.base - 56, '바람 ↗', { size: 13, weight: 800, color: '#1d4ed8' });
    // 공기 덩어리
    const cl = clamp((M.cloudA), 0, 1), warmK = clamp((TG - tAt(hv)) / 20, 0, 1);
    const x = r0.x, y = r0.y, r = r0.r;
    ctx.save();
    if (M.drag) { D.glow(x, y, r * 2.2, '#ffffff', 0.5); }
    softShadow(x - r, y - r, r * 2, r * 2, r, 12, 6, 'rgba(20,40,80,.3)');
    const pg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    const c1 = mix('#ffe2c4', '#e6f4ff', cl), c2 = mix(mix('#ffb27a', '#8fc8ff', warmK), '#ffffff', cl * 0.7);
    pg.addColorStop(0, c1); pg.addColorStop(1, rgba(c2, 0.9));
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.5; ctx.stroke();
    // 분자(간격이 벌어져요)
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 2, 0, TAU); ctx.clip();
    M.mols.forEach((m) => {
      const mxp = x + Math.cos(m.a) * m.d * r * 0.86 + Math.sin(CLK.t * 1.3 + m.ph) * 2.5, myp = y + Math.sin(m.a) * m.d * r * 0.86 + Math.cos(CLK.t * 1.1 + m.ph) * 2.5;
      if (cl > 0.3) { ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * cl).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(mxp, myp, 2.6 + cl * 1.6, 0, TAU); ctx.fill(); }
      else drawSpr(airSpr(3), mxp, myp, 0, 1, 1);
    });
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.5, r * 0.28, r * 0.15, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
    if (M.Hv < 30 && !M.drag) { D.ring(x, y, r + 8, CLK.t, { color: COL.warm }); D.label(x + r + (PHONE ? 40 : 56), y - r - 6, '← 끌어 올리기', { bg: COL.warm, size: 13 }); }
    if (hv > 80) D.label(x + r + 8, y + r + 14, '부피가 커져요 ▲', { align: 'left', bg: 'rgba(27,35,51,.78)', size: 13 });
    // 정보 카드
    const T = tAt(hv), cw = PHONE ? 196 : 226, ch = PHONE ? 92 : 104;
    ctx.save(); ctx.globalAlpha = 0.96; card(P.x + 12, P.y + 12, cw, ch, 12, '#fff'); ctx.restore();
    text(P.x + 24, P.y + 36, '높이 ' + Math.round(hv).toLocaleString('ko-KR') + ' m', { size: 15, weight: 800, align: 'left', color: COL.ink });
    text(P.x + 24, P.y + 58, '기온 ' + f1(T) + ' °C', { size: 15, weight: 800, align: 'left', color: T > TD ? COL.warm : COL.cold });
    text(P.x + cw - 8, P.y + 58, '이슬점 ' + TD + ' °C', { size: 13, weight: 800, align: 'right', color: COL.skyD });
    const st = M.cloudA > 0.5 ? '☁️ 구름이 생겨요!' : T > TD ? '이슬점까지 ' + f1(T - TD) + ' °C 더' : '이슬점에 가까워요';
    D.label(P.x + 12 + cw / 2, P.y + ch - 12, st, { bg: M.cloudA > 0.5 ? COL.good : '#5d6879', size: 13 });
    ctx.restore();
    FX.draw(ctx);
  }

  /* =========================================================
     그리기 — 상승 원인 짝짓기 (그림 4장)
     ========================================================= */
  function artSky(x, y, w, h) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#9ccff5'); g.addColorStop(1, '#e8f4fd'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  function artCloud(cx, cy, s) {
    const pf = puffSpr();
    [[-18, 4, 1], [0, -6, 1.25], [20, 3, 1.05], [38, 6, .8]].forEach(([dx, dy, k]) => drawSpr(pf, cx + dx * s, cy + dy * s, 0, 0.95, (22 * s * k) / 32 * 1.6));
  }
  function artRise(x, y, w, h, kind, t) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    artSky(x, y, w, h);
    const gy0 = y + h - 34;
    if (kind === 'heat') {
      D.glow(x + 40, y + 34, 44, '#fff3b0', 0.9); D.sphere(x + 40, y + 34, 16, '#ffd54a', { gloss: false });
      for (let i = 0; i < 4; i++) D.arrow(x + 40, y + 34, x + 30 + i * 12, y + 34 + 38 + i * 4, { color: 'rgba(255,190,60,.8)', width: 2.5, head: 7 });
      ctx.fillStyle = '#c8a46a'; ctx.fillRect(x, gy0, w, 34); ctx.fillStyle = '#e8c27e'; ctx.fillRect(x, gy0, w, 4);
      for (let i = 0; i < 3; i++) { const fx = x + w * (0.35 + i * 0.2), f = ((t * 0.5 + i / 3) % 1); D.arrow(fx, gy0 - 4 - f * 20, fx, gy0 - 50 - f * 20, { color: '#f26b3a', width: 4, head: 11, alpha: Math.sin(f * Math.PI) }); }
      artCloud(x + w * 0.66, y + 30, 0.9);
    } else if (kind === 'mtn') {
      ctx.fillStyle = '#7aa96a'; ctx.beginPath(); ctx.moveTo(x + w * 0.2, gy0 + 34); ctx.lineTo(x + w * 0.66, y + 40); ctx.lineTo(x + w, gy0 - 10); ctx.lineTo(x + w, gy0 + 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + w * 0.66, y + 40); ctx.lineTo(x + w * 0.58, y + 66); ctx.lineTo(x + w * 0.74, y + 66); ctx.fill();
      ctx.fillStyle = '#5e9a58'; ctx.fillRect(x, gy0 + 20, w, 14);
      for (let i = 0; i < 2; i++) { const f = ((t * 0.4 + i / 2) % 1); D.arrow(x + w * (0.1 + f * 0.42), gy0 + 8 - f * 70, x + w * (0.22 + f * 0.42), gy0 - 14 - f * 70, { color: '#2f7de1', width: 4, head: 11, alpha: Math.sin(f * Math.PI) }); }
      artCloud(x + w * 0.4, y + 40, 0.75);
    } else if (kind === 'front') {
      ctx.fillStyle = '#7aa96a'; ctx.fillRect(x, gy0 + 20, w, 14);
      ctx.fillStyle = 'rgba(70,130,230,.85)'; ctx.beginPath(); ctx.moveTo(x + w, gy0 + 20); ctx.lineTo(x + w * 0.3, gy0 + 20); ctx.lineTo(x + w, gy0 - 52); ctx.closePath(); ctx.fill();
      text(x + w * 0.8, gy0 + 12, '찬 공기', { size: 13, weight: 800, color: '#fff' });
      for (let i = 0; i < 2; i++) { const f = ((t * 0.4 + i / 2) % 1); D.arrow(x + 10 + f * w * 0.3, gy0 - 8 - f * 50, x + 10 + f * w * 0.3 + 40, gy0 - 22 - f * 50, { color: '#e2464b', width: 4, head: 11, alpha: Math.sin(f * Math.PI) }); }
      text(x + 12, y + 20, '따뜻한 공기', { size: 13, weight: 800, align: 'left', color: '#c2410c' });
      artCloud(x + w * 0.52, y + 56, 0.8);
    } else {
      ctx.fillStyle = '#7aa96a'; ctx.fillRect(x, gy0 + 14, w, 20);
      const f = (t * 0.6) % 1;
      D.arrow(x + 14 + f * 20, gy0 + 4, x + w / 2 - 14, gy0 + 4, { color: '#2f7de1', width: 4, head: 11 });
      D.arrow(x + w - 14 - f * 20, gy0 + 4, x + w / 2 + 14, gy0 + 4, { color: '#2f7de1', width: 4, head: 11 });
      D.arrow(x + w / 2, gy0 - 4, x + w / 2, y + 52, { color: '#f26b3a', width: 5, head: 13 });
      artCloud(x + w / 2, y + 36, 0.85);
    }
    ctx.restore();
  }
  function drawMatch() {
    softShadow(P.x, P.y, P.w, P.h, 16, 12, 4, 'rgba(10,30,70,.25)');
    ctx.fillStyle = '#f4f9ff'; D.roundRect(P.x, P.y, P.w, P.h, 16); ctx.fill();
    text(P.x + P.w / 2, P.y + (PHONE ? 30 : 32), '공기가 위로 올라가는 까닭에 맞는 이름표를 끌어다 놓아요', { size: PHONE ? 13 : 16, weight: 800, color: COL.ink });
    MS.slots.forEach((s, i) => {
      ctx.save(); softShadow(s.x, s.y, s.w, s.h, 12, 8, 3, 'rgba(10,30,70,.2)');
      ctx.fillStyle = '#fff'; D.roundRect(s.x, s.y, s.w, s.h + 38, 12); ctx.fill();
      ctx.restore();
      ctx.save(); D.roundRect(s.x + 3, s.y + 38, s.w - 6, s.h - 3, 10); ctx.clip(); artRise(s.x + 3, s.y + 38, s.w - 6, s.h - 3, s.id, CLK.t); ctx.restore();
      // 이름표 자리
      const wrong = MS.marks.indexOf(i) >= 0;
      const slotY = s.sy, slotH = s.sh;
      ctx.save();
      ctx.strokeStyle = wrong ? COL.bad : s.tag ? 'rgba(20,160,88,.0)' : 'rgba(14,165,233,.8)'; ctx.lineWidth = 2.5; ctx.setLineDash(s.tag ? [] : [6, 5]);
      ctx.fillStyle = 'rgba(14,165,233,.08)'; D.roundRect(s.sx + 6, slotY + 3, s.sw - 12, slotH - 6, 10); ctx.fill(); if (!s.tag || wrong) ctx.stroke();
      ctx.restore();
      if (!s.tag) text(s.sx + s.sw / 2, slotY + slotH / 2 + 5, (i + 1) + '번 그림의 이름표', { size: 13, weight: 700, color: 'rgba(3,105,161,.7)' });
      D.label(s.x + 18, s.y + 38 + s.h - 16, String(i + 1), { bg: 'rgba(27,35,51,.75)', size: 13, pad: 7 });
    });
    // 이름표
    MS.tags.slice().sort((a, b) => a.lift - b.lift).forEach((t) => {
      ctx.save();
      if (t.drag) ctx.globalAlpha = 0.97;
      const sc = 1 + 0.06 * t.lift;
      ctx.translate(t.x + t.w / 2, t.y + t.h / 2); ctx.scale(sc, sc); ctx.translate(-(t.x + t.w / 2), -(t.y + t.h / 2));
      softShadow(t.x, t.y, t.w, t.h, 12, 8 + 8 * t.lift, 3 + 6 * t.lift, 'rgba(10,30,70,.35)');
      const ok = MS.done;
      ctx.fillStyle = ok && t.slot >= 0 ? '#e5f8ec' : '#fff'; D.roundRect(t.x, t.y, t.w, t.h, 12); ctx.fill();
      ctx.strokeStyle = ok && t.slot >= 0 ? COL.good : t.slot >= 0 ? COL.skyD : '#8fb4d8'; ctx.lineWidth = 2.5; ctx.stroke();
      text(t.x + t.w / 2, t.y + t.h / 2 + 5, t.label, { size: PHONE ? 13 : 14, weight: 800, color: COL.ink });
      ctx.restore();
    });
    if (matchPlaced() === 0) D.label(P.x + P.w / 2, P.y + P.h - (PHONE ? 124 : 96), '⬇ 이름표를 그림 위 칸으로 끌어요', { bg: COL.warm, size: 13 });
    FX.draw(ctx);
  }

  /* =========================================================
     그리기 — ④ 강수 과정
     ========================================================= */
  function drawCrystal(x, y, r, rot, a, pop) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const sc = 1 + 0.25 * (pop || 0); ctx.scale(sc, sc);
    ctx.globalAlpha *= a;
    const arms = r > 10.5;
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = Math.max(1.4, r * 0.16); ctx.lineCap = 'round';
    if (arms) {
      for (let k = 0; k < 6; k++) {
        ctx.save(); ctx.rotate((k * Math.PI) / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 1.15, 0); ctx.stroke();
        ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.beginPath(); ctx.moveTo(r * 0.55, 0); ctx.lineTo(r * 0.85, r * 0.32); ctx.moveTo(r * 0.55, 0); ctx.lineTo(r * 0.85, -r * 0.32); ctx.stroke();
        ctx.lineWidth = Math.max(1.4, r * 0.16);
        ctx.restore();
      }
    }
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = (k * Math.PI) / 3; k ? ctx.lineTo(Math.cos(an) * r * 0.62, Math.sin(an) * r * 0.62) : ctx.moveTo(Math.cos(an) * r * 0.62, Math.sin(an) * r * 0.62); } ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 1, 0, 0, r * 0.7); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bfe8ff');
    ctx.fillStyle = g; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function dropShape(x, y, r, a) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = 'rgba(80,160,235,.9)'; ctx.beginPath(); ctx.moveTo(x, y - r * 1.9); ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.2, x, y + r * 0.9); ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.2, x, y - r * 1.9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawRain() {
    const R = PR, cold = R.type === 'cold', gk = R.gc;
    ctx.save();
    softShadow(P.x, P.y, P.w, P.h, 16, 12, 4, 'rgba(10,30,70,.25)');
    D.roundRect(P.x, P.y, P.w, P.h, 16); ctx.clip();
    const sg = ctx.createLinearGradient(0, P.y, 0, GY);
    sg.addColorStop(0, mix(cold ? '#b9c9dc' : '#a9d3f5', '#aeb8c6', gk * 0.5)); sg.addColorStop(1, mix('#eaf5fe', '#f3f6fa', gk));
    ctx.fillStyle = sg; ctx.fillRect(P.x, P.y, P.w, P.h);
    // 땅
    const gg = ctx.createLinearGradient(0, GY, 0, P.y + P.h);
    gg.addColorStop(0, mix('#78b862', '#eef3f8', gk)); gg.addColorStop(1, mix('#4f9244', '#cfd9e6', gk));
    ctx.fillStyle = gg; ctx.fillRect(P.x, GY, P.w, P.y + P.h - GY);
    ctx.fillStyle = mix('#8fd18a', '#ffffff', gk); ctx.fillRect(P.x, GY, P.w, 3);
    if (R.snowH > 0.3) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(P.x, GY + 2); for (let i = 0; i <= 30; i++) ctx.lineTo(P.x + (P.w * i) / 30, GY - R.snowH + Math.sin(i * 1.7) * 2 - 1); ctx.lineTo(P.x + P.w, GY + 2); ctx.closePath(); ctx.fill(); }
    // 구름 몸통
    const bumps = 13, base = RC.y + RC.h;
    const body = (dy, col, a) => { ctx.fillStyle = col; ctx.globalAlpha = a; for (let i = 0; i < bumps; i++) { const f = 0.05 + 0.9 * (i + 0.5) / bumps, cx = RC.x + f * RC.w, hh = Math.sin(f * Math.PI), r = RC.h * (0.34 + 0.34 * hh) + (i % 3) * 5; ctx.beginPath(); ctx.arc(cx, RC.y + RC.h * 0.62 - hh * 14 + dy + ((i % 2) * 8), r, 0, TAU); ctx.fill(); } ctx.fillRect(RC.x + 18, RC.y + RC.h * 0.45 + dy, RC.w - 36, RC.h * 0.45); ctx.globalAlpha = 1; };
    ctx.save(); ctx.beginPath(); ctx.rect(RC.x - 90, RC.y - 60, RC.w + 180, RC.h + 56 + 20); ctx.clip();
    body(8, cold ? '#aab8cc' : '#a9b6c8', 0.5);
    body(0, cold ? '#e3ebf5' : '#f2f6fb', 1);
    ctx.restore();
    ctx.fillStyle = cold ? 'rgba(120,150,190,.18)' : 'rgba(120,140,170,.14)'; ctx.fillRect(RC.x + 10, base - 16, RC.w - 20, 16);
    // 0 °C 높이
    if (cold && R.yf < P.y + P.h + 40) {
      D.dashedLine(P.x + 10, R.yf, P.x + P.w - 10, R.yf, { color: '#1d4ed8', width: 2.5, dash: [9, 7], offset: -CLK.t * 16 });
      D.label(P.x + 14, R.yf - 14, R.ground === 'warm' ? '0 °C 높이 (여기서 녹아요)' : '0 °C 높이 (땅 아래)', { align: 'left', bg: '#1d4ed8', size: 13 });
    }
    // 물방울
    const dr = (d) => { const k = 1 + 0.35 * d.pulse; return d.r * k; };
    R.drops.forEach((d) => {
      if (d.st === 'cloud') {
        const r = dr(d), big = d.r >= 4.6;
        ctx.globalAlpha = d.a;
        const gr = ctx.createRadialGradient(d.x - r * 0.3, d.y - r * 0.35, r * 0.1, d.x, d.y, r);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, cold ? '#a9d4ff' : '#8cc6fb'); gr.addColorStop(1, cold ? '#5a95d6' : '#3f86d9');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, TAU); ctx.fill();
        if (big) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = 'rgba(90,160,235,.5)'; ctx.lineWidth = Math.max(1.5, d.r * 0.35); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(d.x, d.y - d.vy * 0.05 - 8); ctx.lineTo(d.x, d.y - 4); ctx.stroke();
        dropShape(d.x, d.y, d.r * 0.8, 1);
      }
    });
    // 수증기 이동
    R.vap.forEach((v) => { ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(40,120,200,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(v.x, v.y, 2.4, 0, TAU); ctx.fill(); ctx.stroke(); });
    // 빙정
    R.crys.forEach((c) => {
      if (c.st === 'cloud' || c.st === 'fall') drawCrystal(c.x, c.y, c.r, c.rot, c.a, c.pop);
      else if (c.st === 'melt') { drawCrystal(c.x, c.y, c.r, c.rot, 1 - c.m, 0); dropShape(c.x, c.y, c.r * 0.5, c.m); }
      else { ctx.strokeStyle = 'rgba(90,160,235,.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c.x, c.y - c.vy * 0.05 - 8); ctx.lineTo(c.x, c.y - 4); ctx.stroke(); dropShape(c.x, c.y, c.r * 0.5, 1); }
    });
    // 구름 이름표
    D.label(RC.x + RC.w / 2, RC.y - 12, cold ? '차가운 구름 · 구름 속 0 °C 이하 (물방울 + 빙정)' : '따뜻한 구름 · 구름 속 0 °C 이상 (물방울만)', { bg: cold ? '#3b6fb5' : '#5a7da8', size: PHONE ? 12 : 14 });
    // 설명 칩 3개
    const caps = cold ? ['① 수증기가 빙정에 붙어요', '② 커져서 떨어져요', '③ 녹으면 비 · 안 녹으면 눈'] : ['① 부딪쳐 합쳐져요', '② 무거워져 떨어져요', '③ 비가 내려요'];
    const okc = cold ? [R.arrivals >= 6, R.fell >= 1, R.cnt.cold + R.cnt.snow >= 1] : [R.merges >= 3, R.fell >= 1, R.cnt.warm >= 1];
    const cwid = PHONE ? 130 : 226, cgap = PHONE ? 6 : 10, x0 = P.x + (P.w - (cwid * 3 + cgap * 2)) / 2;
    caps.forEach((s, i) => {
      const x = x0 + i * (cwid + cgap), y = P.y + 14, h = PHONE ? 46 : 34;
      ctx.fillStyle = okc[i] ? 'rgba(20,160,88,.92)' : 'rgba(27,35,51,.7)'; D.roundRect(x, y, cwid, h, h / 2 > 18 ? 14 : h / 2); ctx.fill();
      if (PHONE) { text(x + cwid / 2, y + 20, s.slice(0, 2) + (okc[i] ? ' ✓' : ''), { size: 13, weight: 800, color: '#fff' }); text(x + cwid / 2, y + 37, s.slice(2).trim(), { size: 12, weight: 700, color: '#fff' }); }
      else text(x + cwid / 2, y + 22, (okc[i] ? '✓ ' : '') + s, { size: 13.5, weight: 800, color: '#fff' });
    });
    // 지면 이름표와 카운터
    const lab = (cold ? (R.ground === 'cold' ? '🥶 땅 가까이도 0 °C 아래 → 눈' : '🌞 땅 가까이는 따뜻 → 도중에 녹아 비') : '🌧️ 비');
    D.label(P.x + P.w / 2, GY + (PHONE ? 30 : 34), lab + ' · ' + (cold ? '비 ' + R.cnt.cold + ' · 눈 ' + R.cnt.snow : '내린 빗방울 ' + R.cnt.warm + '개'), { bg: 'rgba(27,35,51,.78)', size: PHONE ? 13 : 15 });
    ctx.restore();
    FX.draw(ctx);
  }

  /* =========================================================
     포인터 (공기 덩어리 끌기 · 이름표 끌기)
     ========================================================= */
  function liftFromPointer(p) {
    const dx = p.x - MG.x0, dy = p.y - MG.base, along = dx * SLOPE.tx + dy * SLOPE.ty;
    return clamp((along / SLOPE.L) * HMAX, 0, HMAX);
  }
  let dragTag = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'mtn' && MT.mode === 'lift') {
        const pp = parcelPos(MT.Hv);
        if (Math.hypot(p.x - pp.x, p.y - pp.y) < pp.r + 18) { MT.drag = true; Sound.click(); return true; }
      } else if (S.scene === 'mtn' && MT.mode === 'match' && !MS.done) {
        for (let i = MS.tags.length - 1; i >= 0; i--) {
          const t = MS.tags[i];
          if (p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h) {
            dragTag = t; t.drag = true; t.gx = p.x - t.x; t.gy = p.y - t.y;
            if (t.slot >= 0) { MS.slots[t.slot].tag = null; t.slot = -1; }
            SciSim.tween(t, { lift: 1 }, { duration: 0.15 });
            Sound.click(); return true;
          }
        }
      }
      return false;
    },
    move(p) {
      if (MT.drag) { MT.h = Math.round(liftFromPointer(p) / 10) * 10; syncRange($('#liftR'), MT.h); }
      else if (dragTag) { dragTag.x = p.x - dragTag.gx; dragTag.y = p.y - dragTag.gy; }
    },
    up() {
      if (MT.drag) { MT.drag = false; return; }
      const t = dragTag; dragTag = null;
      if (!t) return;
      t.drag = false; SciSim.tween(t, { lift: 0 }, { duration: 0.2 });
      const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
      let best = -1, bd = 1e9;
      MS.slots.forEach((s, i) => { const d = Math.hypot(cx - (s.sx + s.sw / 2), cy - (s.sy + s.sh / 2)); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && bd < (PHONE ? 90 : 110)) {
        const s = MS.slots[best];
        if (s.tag) homeTag(s.tag);
        s.tag = t; snapTag(t, best); MS.marks = [];
      } else homeTag(t);
    },
    hover(p) {
      if (S.scene === 'mtn' && MT.mode === 'lift') { const pp = parcelPos(MT.Hv); return Math.hypot(p.x - pp.x, p.y - pp.y) < pp.r + 18 ? 'grab' : 'default'; }
      if (S.scene === 'mtn' && MT.mode === 'match') return MS.tags.some((t) => p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h) ? 'grab' : 'default';
      return 'default';
    },
  });

  /* =========================================================
     읽기 값
     ========================================================= */
  const roCache = {};
  function ro(i, label, html) {
    if (roCache['l' + i] !== label) { $('#rl' + i).textContent = label; roCache['l' + i] = label; }
    if (roCache['v' + i] !== html) { $('#r' + i).innerHTML = html; roCache['v' + i] = html; }
  }
  const U = (n, u) => n + '<small>' + u + '</small>';
  function refreshReadouts() {
    const sc = S.scene;
    if (sc === 'pump') { ro(1, '온도 센서', U(f1(BA.Tc), '°C')); ro(2, '압력 센서', U(Math.round(BA.P), 'hPa')); ro(3, '병 속 공기의 양', U(BA.n.toFixed(2), '배')); }
    else if (sc === 'cloud') { ro(1, '병 A (연기) 온도', U(f1(BA.Tc), '°C')); ro(2, '병 B (물만) 온도', U(f1(BB.Tc), '°C')); ro(3, '뿌연 정도 A · B', U(Math.round(clamp(BA.Fv / 2.2, 0, 1) * 100), '%') + ' · ' + U(Math.round(clamp(BB.Fv / 2.2, 0, 1) * 100), '%')); }
    else if (sc === 'mtn') {
      if (MT.mode === 'match') { ro(1, '이름표를 놓은 수', U(matchPlaced(), '/ 4')); ro(2, '맞게 놓은 수', U(matchRight(), '/ 4')); ro(3, '상승 원인', '<small>4가지</small>'); }
      else { ro(1, '높이', U(Math.round(MT.Hv), 'm')); ro(2, '공기 덩어리 기온', U(f1(tAt(MT.Hv)), '°C')); ro(3, '기압', U(Math.round(pAt(MT.Hv)), 'hPa')); }
    } else {
      ro(1, '병합설: 내린 비', U(PR.cnt.warm, '방울')); ro(2, '빙정설: 녹아서 비', U(PR.cnt.cold, '방울')); ro(3, '빙정설: 눈', U(PR.cnt.snow, '송이'));
    }
  }

  /* =========================================================
     한 프레임
     ========================================================= */
  let lastDt = 1 / 60;
  function update(dt) {
    lastDt = dt; CLK.t += dt;
    if (S.scene === 'pump' || S.scene === 'cloud') pumpUpdate(dt);
    else if (S.scene === 'mtn') mtnUpdate(dt);
    else precipUpdate(dt);
    FX.update(dt);
    uiTick();
  }
  function draw() {
    const dark = S.scene === 'pump' || S.scene === 'cloud';
    view.clear(dark ? '#16203a' : '#d6e9f8');
    const a = clamp(S.tr, 0, 1);
    ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * a; ctx.translate(0, (1 - a) * 10);
    if (S.scene === 'pump') drawPumpScene();
    else if (S.scene === 'cloud') drawCloudScene();
    else if (S.scene === 'mtn') { if (MT.mode === 'match') drawMatch(); else drawMtn(); }
    else drawRain();
    ctx.restore();
    drawChecks(lastDt);
  }

  /* =========================================================
     미션 (4단계)
     ========================================================= */
  const chip = (ok, s) => (ok ? '✅ ' : '⬜ ') + s;
  const hiOk = () => REC.hi != null && REC.hi >= T0 + 5;
  const loOk = () => REC.lo != null && REC.lo <= T0 - 3;

  game = SciSim.game({
    simId: 'm3-cloud-formation',
    mount: '#game',
    badge: '구름 박사',
    homeHref: '../../index.html#g3',
    featureLabels: {
      pump: '💨 펌프 뚜껑 페트병 · 디지털 온도·압력 센서',
      cloud: '☁️ 병 A·B 비교 · 응결핵(향 연기)',
      smoke: '🕯️ 향 연기 넣기',
      mtn: '⛰️ 산비탈을 오르는 공기 덩어리 · 상승 원인 짝짓기',
      rain: '🌧️ 병합설 · 빙정설 구름 시뮬레이션',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.scene && m.scene !== S.scene) setScene(m.scene, false);
      if (m.mode) setMode(m.mode);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '단열 팽창: 공기를 누르면, 풀어 주면?', short: '단열 팽창', icon: '💨', phase: '실험',
        features: ['pump'],
        intro: '<p class="si-q">❓ 탐구 질문: 하늘의 구름은 어떻게 만들어질까?</p>' +
          '<p>구름을 이해하려면 먼저 <b>공기를 누르거나 풀어 줄 때</b> 온도가 어떻게 달라지는지 알아야 해요. <b>펌프가 달린 페트병</b>에 <b>디지털 온도·압력 센서</b>를 달았어요. 🔍 입자 모형으로 병 속 공기 분자도 함께 살펴봐요.</p>',
        setup() { setScene('pump', true); },
        recap: '공기를 <b>압축</b>하면 온도가 올라가고, 갑자기 <b>팽창</b>시키면 온도가 내려가요. 이렇게 외부와 열을 주고받지 않고 부피가 변하면서 온도가 달라지는 것을 <b>단열 변화</b>라고 해요.',
        summary: '<ul><li>펌프질로 공기를 <b>압축</b>하면 압력과 <b>온도가 올라가요</b> (단열 압축).</li>' +
          '<li>뚜껑을 열어 공기를 <b>팽창</b>시키면 압력이 내려가고 <b>온도가 내려가요</b> (단열 팽창).</li>' +
          '<li>바깥과 열을 주고받지 않고 부피가 변해서 온도가 달라지는 변화를 <b>단열 변화</b>라고 해요.</li>' +
          '<li>공기가 위로 올라가면 주위 기압이 낮아져 팽창하고, 그래서 온도가 내려가요.</li></ul>',
        missions: [
          {
            title: '압축 후 팽창시켜 온도 변화 기록', scene: 'pump',
            goal: '💨 펌프질을 <b>연달아 3번쯤</b> 해서 온도가 오르는 것을 보고, 병이 실내 온도로 돌아오면 🔓 뚜껑을 열어 팽창시켜요.',
            hint: '펌프질을 빠르게 3번 한 뒤, 센서의 온도가 20 °C 근처로 돌아올 때까지 5~6초 기다렸다가 뚜껑을 열어요.',
            check: () => S.scene === 'pump' && hiOk() && loOk(),
            hold: 0.5,
            status: () => chip(hiOk(), '압축 최고 ' + (REC.hi != null ? f1(REC.hi) : '-') + ' °C') + ' · ' + chip(loOk(), '팽창 최저 ' + (REC.lo != null && REC.armed ? f1(REC.lo) : '-') + ' °C'),
            explain: '펌프질로 공기를 누르면 분자들이 빽빽해지고 빨라져서 <b>온도가 올라가요</b>. 뚜껑을 열면 공기가 갑자기 팽창하면서 <b>온도가 내려가요</b>. 실내(20 °C)보다 낮아진 온도가 센서에 기록돼요.',
          },
          {
            type: 'quiz', title: '팽창하면 온도는?', scene: 'pump',
            goal: '병 속 공기가 갑자기 팽창할 때(뚜껑을 열 때) 공기의 온도는 어떻게 될까요?',
            choices: ['내려간다', '올라간다', '변하지 않는다', '처음에는 내려가다 계속 올라간다'],
            answer: 0,
            feedback: ['', '올라가는 것은 공기를 누를 때(압축)예요. 센서 그래프에서 뚜껑을 열 때의 변화를 다시 봐요.', '센서의 온도 그래프를 보면 뚜껑을 열 때 분명히 달라졌어요.', '팽창하는 동안에는 계속 낮아졌다가 시간이 지나면 실내 온도로 돌아올 뿐이에요.'],
            explain: '공기가 팽창하면 <b>온도가 내려가요</b> (단열 팽창). 하늘로 올라가는 공기도 주위 기압이 낮아져 팽창하면서 식어요.',
          },
        ],
      },
      {
        title: '구름 실험: 병 속에 구름 만들기', short: '구름 실험', icon: '☁️', phase: '실험',
        features: ['cloud', 'smoke'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 공기가 팽창하면 온도가 내려간다는 것을 알았어요.</div>' +
          '<p>병 속에 물을 조금 넣고 팽창시키면 구름이 생길까요? <b>병 A</b>에는 <b>향 연기</b>(작은 먼지 같은 입자)를 넣고, <b>병 B</b>는 물만 넣었어요. 두 병을 똑같이 눌렀다가 열어서 비교해요.</p>',
        setup() { setScene('cloud', true); },
        recap: '공기가 팽창해서 <b>이슬점 아래로 냉각</b>되면 수증기가 응결해서 구름(작은 물방울)이 돼요. 연기·먼지 같은 <b>응결핵</b>이 있으면 응결이 잘 일어나요.',
        summary: '<ul><li>팽창 → 온도 하강 → 이슬점에 도달 → 수증기가 <b>응결</b> → 뿌연 구름(작은 물방울).</li>' +
          '<li>연기·먼지 같은 <b>응결핵</b>이 있으면 수증기가 그 둘레에 달라붙어 응결이 잘 일어나요.</li>' +
          '<li>응결핵이 없는 병(B)은 거의 흐려지지 않아요.</li>' +
          '<li>뚜껑을 열어 팽창시킨 병이 다시 따뜻해지면 구름은 사라져요.</li></ul>',
        missions: [
          {
            title: '병 속에 구름 만들기', scene: 'cloud',
            goal: '🕯️ 병 A에 향 연기를 넣고, 💨 펌프질을 한 뒤 🔓 뚜껑을 열어요. <b>병 A만 뿌옇게</b> 흐려지면 성공이에요!',
            hint: '순서: 향 연기 넣기 → 펌프질 3~4번 → 병이 식을 때까지 기다리기 → 뚜껑 열기. 펌프질을 많이 할수록 구름이 진해져요.',
            setup() { if (!BA.nuclei && !SM.on && REC.opened === 0 && BA.n === 1) refreshUI(); },
            check: () => S.scene === 'cloud' && BA.nuclei && REC.opened > 0 && BA.Fv >= 1.2 && BB.Fv <= 0.35,
            hold: 0.8,
            status: () => chip(BA.nuclei, '연기 넣기') + ' · ' + chip(REC.opened > 0, '뚜껑 열기') + ' · ' + chip(BA.Fv >= 1.2 && BB.Fv <= 0.35, '병 A만 뿌옇게'),
            explain: '뚜껑을 열면 병 속 공기가 <b>팽창하며 냉각</b>되고, 수증기가 <b>이슬점</b> 아래로 식어요. 연기 입자(<b>응결핵</b>)가 있는 병 A에서는 수증기가 입자 둘레에 응결해 작은 물방울이 되어 뿌옇게 보여요. 응결핵이 없는 병 B는 거의 맑아요.',
          },
          {
            type: 'quiz', title: '뿌옇게 된 까닭', scene: 'cloud',
            goal: '병 A가 뿌옇게 흐려진 까닭을 바르게 설명한 것은?',
            choices: ['연기가 병 속에서 퍼졌기 때문이다', '팽창하며 온도가 내려가 수증기가 응결했기 때문이다', '펌프질로 공기가 더 많이 들어갔기 때문이다', '병 속의 물이 끓어서 수증기가 늘었기 때문이다'],
            answer: 1,
            feedback: ['연기는 응결이 시작될 자리(응결핵)를 줄 뿐이에요. 연기가 퍼지는 것만으로는 뿌예지지 않아요. 병 B와 비교해 봐요.', '', '펌프질 때는 오히려 온도가 올라가 맑았어요. 뚜껑을 열어 팽창할 때 뿌옇게 됐어요.', '병 속의 물은 끓지 않았어요. 온도가 내려가서 수증기가 응결한 거예요.'],
            explain: '<b>팽창 → 온도 하강 → 이슬점 도달 → 수증기 응결</b>. 하늘의 구름도 같은 원리로 생겨요. 연기·먼지 같은 응결핵이 응결을 도와줘요.',
          },
        ],
      },
      {
        title: '구름의 생성: 산을 오르는 공기', short: '구름의 생성', icon: '⛰️', phase: '모형',
        features: ['mtn'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 팽창해서 식은 공기에서 수증기가 응결해 구름이 생기는 것을 실험했어요.</div>' +
          '<p>하늘에서는 <b>공기 덩어리가 위로 올라갈 때</b> 같은 일이 일어나요. 올라가면 주위 기압이 낮아져 <b>팽창</b>하고 <b>식어요</b>. 산비탈을 오르는 공기 덩어리를 끌어 올려, 구름이 생기기 시작하는 높이를 찾아봐요. (그림의 수치는 모형값이에요.)</p>',
        setup() { setScene('mtn', true); setMode('lift'); },
        recap: '위로 올라가는 공기는 <b>팽창 → 기온 하강</b>하다가 <b>이슬점</b>에 도달하는 높이부터 구름이 생겨요. 공기가 올라가는 까닭은 지표 가열·산비탈·찬 공기와 따뜻한 공기가 만날 때·공기가 모여들 때 등이 있어요.',
        summary: '<ul><li>공기 덩어리가 상승 → 주위 기압 낮아짐 → <b>팽창</b> → <b>기온 하강</b> → <b>이슬점</b> 도달 → 응결 → <b>구름</b>.</li>' +
          '<li>이슬점에 도달한 높이가 <b>구름 밑면</b>이에요.</li>' +
          '<li>공기가 상승하는 경우: ① 지표가 <b>가열</b>될 때 ② <b>산비탈</b>을 따라 오를 때 ③ <b>찬 공기와 따뜻한 공기</b>가 만날 때 ④ 공기가 <b>모여들 때</b>.</li></ul>',
        missions: [
          {
            title: '공기 덩어리를 끌어 올려 구름 만들기', scene: 'mtn', mode: 'lift',
            goal: '공기 덩어리를 <b>끌어서</b>(또는 슬라이더로) 산비탈 위로 올려요. 부피와 기온이 어떻게 변하는지 보고, <b>구름이 생기기 시작하는 높이</b>를 찾아요.',
            hint: '올라갈수록 덩어리가 커지고 기온이 내려가요. 기온이 이슬점(15 °C)과 같아지는 곳, 점선 \'구름 밑면\' 위로 올려 보세요.',
            check: () => S.scene === 'mtn' && MT.mode === 'lift' && MT.Hv > LCL + 270 && Math.abs(MT.Hv - MT.h) < 20 && MT.cloudA > 0.95,
            hold: 1.0,
            status: () => '높이 <b>' + Math.round(MT.Hv) + ' m</b> · 기온 <b>' + f1(tAt(MT.Hv)) + ' °C</b> ' + (MT.cloudA > 0.95 ? '✅ 구름 생성' : '⬜ 아직 구름이 없어요'),
            explain: '공기 덩어리가 올라가면 <b>주위 기압이 낮아져 팽창</b>하고 <b>기온이 내려가요</b>. 기온이 이슬점(15 °C)에 닿는 높이(약 1000 m)에서 수증기가 응결하기 시작해 <b>구름 밑면</b>이 생겨요.',
          },
          {
            title: '공기가 올라가는 4가지 까닭', scene: 'mtn', mode: 'match', manual: true,
            goal: '그림 4장에 맞는 이름표를 끌어다 놓고 <b>확인하기</b>를 눌러요.',
            hint: '지면이 햇볕에 달궈지면? 산이 바람을 막으면? 찬 공기가 따뜻한 공기 밑으로 파고들면? 양쪽에서 공기가 모이면? 공기는 어디로 갈까요?',
            setup() { matchReset(); },
            check: () => {
              if (matchPlaced() < 4) return '이름표 4개를 모두 그림 위 칸에 놓아 주세요. (지금 ' + matchPlaced() + '개)';
              MS.marks = matchWrong();
              if (MS.marks.length) return MS.marks.length + '개가 맞지 않아요. 빨간 칸의 그림을 다시 살펴봐요.';
              MS.done = true;
              return true;
            },
            status: () => '이름표 <b>' + matchPlaced() + ' / 4</b> 놓음',
            explain: '공기가 위로 올라가는 까닭은 ① 지표가 <b>가열</b>될 때 ② <b>산비탈</b>을 타고 오를 때 ③ <b>찬 공기와 따뜻한 공기</b>가 만나 따뜻한 공기가 위로 올라갈 때 ④ 공기가 <b>모여들어</b> 갈 곳이 없어 위로 올라갈 때예요.',
          },
          {
            type: 'quiz', title: '구름이 생기는 순서', scene: 'mtn', mode: 'lift',
            goal: '산비탈을 오르는 공기 덩어리에서 구름이 생기기까지의 순서로 옳은 것은?',
            choices: ['상승 → 팽창 → 기온 하강 → 이슬점 도달 → 응결', '상승 → 압축 → 기온 상승 → 이슬점 도달 → 응결', '기온 하강 → 상승 → 팽창 → 응결 → 이슬점 도달', '상승 → 팽창 → 이슬점 도달 → 기온 하강 → 응결'],
            answer: 0,
            feedback: ['', '올라가면 주위 기압이 낮아져서 공기는 압축이 아니라 팽창해요. 그래서 기온은 내려가요.', '공기가 올라가기 때문에 기온이 내려가요. 원인과 결과의 순서를 바꾸지 않았는지 생각해 봐요.', '이슬점에 도달하는 것은 기온이 내려간 결과예요. 기온 하강이 먼저예요.'],
            explain: '<b>상승 → 주위 기압 낮아짐 → 팽창 → 기온 하강 → 이슬점 도달 → 수증기 응결 → 구름</b> 순서예요.',
          },
        ],
      },
      {
        title: '강수 과정: 비와 눈은 어떻게?', short: '강수 과정', icon: '🌧️', phase: '설명',
        features: ['rain'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 구름은 작은 물방울(또는 얼음 알갱이)로 이루어져 있다는 것을 알았어요.</div>' +
          '<p>구름 속의 작은 물방울은 너무 가벼워 떨어지지 않아요. 비나 눈이 되려면 <b>커져야</b> 해요. <b>따뜻한 구름</b>(0 °C 이상)에서는 물방울이 <b>합쳐져서</b>(병합설), <b>차가운 구름</b>(0 °C 이하)에서는 <b>빙정</b>에 수증기가 달라붙어서(빙정설) 커져요. 두 구름을 살펴봐요.</p>',
        setup() { setScene('rain', true); },
        recap: '<b>병합설</b>: 따뜻한 구름에서 물방울이 부딪쳐 합쳐져 커지면 비. <b>빙정설</b>: 차가운 구름에서 빙정에 수증기가 달라붙어 커져 떨어지고, 녹으면 비·녹지 않으면 눈.',
        summary: '<ul><li><b>병합설</b>: 따뜻한 구름(0 °C 이상)에서 크고 작은 물방울이 <b>충돌·병합</b>해 무거워지면 떨어져 <b>비</b>가 돼요.</li>' +
          '<li><b>빙정설</b>: 차가운 구름(0 °C 이하)에서 <b>빙정</b>에 수증기가 달라붙어 커지고, 무거워지면 떨어져요.</li>' +
          '<li>떨어지다가 <b>녹으면 비</b>, <b>녹지 않으면 눈</b>이에요.</li></ul>',
        missions: [
          {
            title: '따뜻한 구름에서 비 내리게 하기', scene: 'rain',
            goal: '<b>따뜻한 구름</b>에서 물방울이 부딪쳐 합쳐지는 과정을 지켜보고, 빗방울이 <b>5개</b> 땅에 내릴 때까지 기다려요.',
            hint: '큰 물방울이 떨어지며 작은 물방울과 부딪쳐 합쳐져요. 충분히 무거워지면 구름 밖으로 떨어져 비가 돼요. 조금만 기다려 보세요.',
            setup() { precipReset('warm', PR.ground); },
            check: () => S.scene === 'rain' && PR.type === 'warm' && PR.cnt.warm >= 5,
            hold: 0.3,
            status: () => (PR.type !== 'warm' ? '⬜ 따뜻한 구름을 골라요' : '내린 빗방울 <b>' + PR.cnt.warm + ' / 5</b>개 · 합쳐진 횟수 ' + PR.merges),
            explain: '따뜻한 구름 속 크고 작은 물방울이 <b>부딪쳐 합쳐지면서</b>(병합설) 점점 무거워져요. 상승 기류로 떠 있을 수 없을 만큼 커지면 <b>빗방울</b>이 되어 떨어져요.',
          },
          {
            title: '차가운 구름에서 비와 눈 내리게 하기', scene: 'rain',
            goal: '<b>차가운 구름</b>을 고르고, 땅 가까이 기온을 <b>따뜻함/추움</b>으로 바꿔 가며 <b>비</b>와 <b>눈</b>이 모두 내리게 해요.',
            hint: '차가운 구름의 빙정이 커져서 떨어져요. 땅 가까이가 따뜻하면 도중에 녹아 비, 추우면 녹지 않고 눈이 돼요. 단추로 바꿔 가며 기다려 봐요.',
            setup() { precipReset('cold', 'warm'); },
            check: () => S.scene === 'rain' && PR.type === 'cold' && PR.cnt.cold >= 2 && PR.cnt.snow >= 3,
            hold: 0.3,
            status: () => (PR.type !== 'cold' ? '⬜ 차가운 구름을 골라요' : chip(PR.cnt.cold >= 2, '녹아서 비 ' + PR.cnt.cold + ' / 2') + ' · ' + chip(PR.cnt.snow >= 3, '눈 ' + PR.cnt.snow + ' / 3')),
            explain: '차가운 구름에서는 <b>빙정</b>에 수증기가 달라붙어 커지고(빙정설), 무거워지면 떨어져요. 떨어지다 <b>0 °C 이상의 공기에서 녹으면 비</b>, <b>녹지 않으면 눈</b>이 돼요.',
          },
          {
            type: 'quiz', title: '겨울에 눈이 내리는 과정', scene: 'rain',
            goal: '우리나라 겨울에 눈이 만들어지는 과정으로 옳은 것은?',
            choices: ['차가운 구름 속 빙정에 수증기가 달라붙어 커진 뒤, 녹지 않고 떨어진다', '따뜻한 구름 속 물방울이 합쳐져 커진 뒤, 땅에 닿기 전에 언다', '비가 내리다가 땅 가까이에서 얼어서 눈이 된다', '구름이 땅 가까이로 내려와 갑자기 얼어붙는다'],
            answer: 0,
            feedback: ['', '물방울이 합쳐져 커지는 것은 병합설로, 따뜻한 구름의 비를 설명해요. 눈은 빙정에서 시작해요.', '내리다가 언 알갱이는 눈이 아니에요. 눈은 구름 속 빙정이 자란 거예요.', '구름이 내려와서 어는 것이 아니에요. 구름 속 빙정이 커져서 떨어지는 거예요.'],
            explain: '겨울의 눈은 <b>빙정설</b>로 설명해요. 차가운 구름 속 빙정이 수증기를 받아 커지고, 땅 가까이도 기온이 낮아 <b>녹지 않고</b> 눈으로 내려요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  setScene('pump', true);
  SciSim.loop((dt) => { update(dt); draw(); refreshReadouts(); });

  window.__sim = {
    VW, VH, S, BA, BB, REC, MT, PR, MS, SM, TAGS,
    get game() { return game; },
    get GEO() { return GEO; },
    setScene, pump, openCap, smoke, setMode, setCloud, setGround, precipReset, matchReset, update, draw, tAt, satW,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    setLift(h) { MT.h = h; binds.liftR.set(h); },
    place(tagId, slotIdx) {
      const t = MS.tags.find((x) => x.id === tagId), s = MS.slots[slotIdx];
      if (s.tag) homeTag(s.tag);
      if (t.slot >= 0) MS.slots[t.slot].tag = null;
      s.tag = t; snapTag(t, slotIdx);
    },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    parcelPos, liftFromPointer,
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
  };
})();
