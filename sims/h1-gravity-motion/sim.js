/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 중력과 낙하 운동 (단원 5차시)
   성취기준 [10통과1-03-03] 중력의 작용으로 인한 지구 표면과 지구 주위의 다양한 운동을 설명할 수 있다.
   ① 관찰: 자유 낙하 (1 kg · 5 kg 공의 다중섬광 사진)
   ② 분석: 수평으로 던지기 (던진 공과 떨어뜨린 공의 다중섬광 사진, 격자 읽기)
   ③ 탐구: 두 운동 비교 (속력 1~4 m/s, 속도 성분 화살표, 낙하 시간 · 도달 거리 표)
   ④ 적용: 여러 천체 (달 · 화성 · 지구 · 목성에서 낙하와 점프)
   g = 9.8 m/s², 공기 저항 무시
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 860 : 560;
  const FS = PHONE ? 1.2 : 1;
  const RM = SciSim.reduceMotion;
  const MINUS = '−';
  const mark = (b) => (b ? '✅' : '⬜');
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const G = 9.8, H_CLIFF = 19.6, V_PLANET = 3.0, JUMP_V = 3.0;
  const SLOW = 0.45;                       // 다중섬광 장면 재생 속도(실제 시간의 0.45배)
  const COL = { b1: '#5aa7ff', b5: '#f5a524', drop: '#5aa7ff', thr: '#ff7a3d' };
  const BODIES = [
    { id: 'moon', name: '달', g: 1.6, sky: ['#05060f', '#141a33'], gnd: '#9aa0aa', gnd2: '#6b7078', stars: true },
    { id: 'mars', name: '화성', g: 3.7, sky: ['#e9a77c', '#f6d2b0'], gnd: '#c2673c', gnd2: '#8f4a2b' },
    { id: 'earth', name: '지구', g: 9.8, sky: ['#7ec0f7', '#e6f4ff'], gnd: '#6cbf6a', gnd2: '#a88660' },
    { id: 'jup', name: '목성', g: 24.8, sky: ['#d9b48a', '#f1dcc0'], gnd: '#b98a5c', gnd2: '#8a5f3a' },
  ];
  const BD = {}; BODIES.forEach((b) => { BD[b.id] = b; });
  const tFall = (g) => Math.sqrt(2 * H_CLIFF / g);
  const jumpH = (g) => JUMP_V * JUMP_V / (2 * g);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const fcm = (v) => { const r = Math.round(v * 10) / 10; return (Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : r.toFixed(1)); };
  const STROBE = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
  const sCm = (t) => 100 * 0.5 * G * t * t;       // 낙하 거리 (cm)
  const T_LAND2 = Math.sqrt(2 * 2.0 / G);          // 2.0 m 높이 낙하 시간 (≈0.64 s)

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'fall', clock: 0, fade: 0,
    F: { state: 'ready', t: 0, shown: 1, flash: 0, sel: -1, landed: false },
    read: new Set(), fallDone: 0,
    v: 2, T: { state: 'ready', t: 0, shown: 1, flash: 0, v: 2, landed: false }, throwRuns: new Set(), throwLand: [],
    cv: 2, C: { state: 'ready', t: 0, v: 2, strobe: 0 }, cres: {}, cpaths: [], predOK: false, showPred: false, showRead: false,
    body: 'earth', P: { state: 'ready', t: 0, body: 'earth' }, pres: {}, jumped: 0, J: { state: 'idle', t: 0, body: null, done: false }, jumpAny: false,
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2f8' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const font = (n, w) => D.font(n, w || 700);
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const AP = (c, t, dt, r) => (RM ? t : SciSim.approach(c, t, dt, r));
  const rgba = SciSim.color.rgba;

  const wrapCache = new Map();
  function wrap(text, maxW, fnt) {
    const key = text + '|' + Math.round(maxW) + '|' + fnt;
    if (wrapCache.has(key)) return wrapCache.get(key);
    ctx.save(); ctx.font = fnt;
    const lines = []; let cur = '';
    const push = (w) => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW) { cur = t; return; }
      if (cur) { lines.push(cur); cur = ''; }
      if (ctx.measureText(w).width <= maxW) { cur = w; return; }
      let s = '';
      for (const ch of w) { if (ctx.measureText(s + ch).width > maxW && s) { lines.push(s); s = ''; } s += ch; }
      cur = s;
    };
    text.split(' ').forEach(push);
    if (cur) lines.push(cur);
    ctx.restore();
    wrapCache.set(key, lines);
    return lines;
  }
  function textBlock(text, x, y, maxW, o) {
    o = o || {};
    const size = o.size || 14, lh = o.lh || size * 1.34 * FS;
    const lines = wrap(text, maxW, font(size, o.weight || 700));
    lines.forEach((ln, i) => D.text(x, y + i * lh, ln, { size, weight: o.weight || 700, color: o.color || '#1b2333', align: o.align || 'left', baseline: 'middle' }));
    return lines.length * lh;
  }
  function panel(r, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(r.x, r.y, r.w, r.h, o.r || 14).fill(); }, { blur: 12, y: 3 });
  }
  function darkPanel(r) {
    ctx.save();
    rr(r.x, r.y, r.w, r.h, 14).clip();
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, '#0b1226'); g.addColorStop(1, '#1d2a52');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }
  function ball(x, y, r, color, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    D.sphere(x, y, r, color, { shadow: a == null || a >= 0.9 });
    ctx.restore();
  }

  /* ======================================================
     ① 자유 낙하 (다중섬광 사진)
     ====================================================== */
  const LF = PHONE ? { P: { x: 12, y: 12, w: 576, h: 500 }, T: { x: 12, y: 524, w: 576, h: 324 } } : { P: { x: 12, y: 12, w: 470, h: 536 }, T: { x: 494, y: 12, w: 294, h: 536 } };
  function fallGeo() {
    const P = LF.P, y0 = P.y + 80, k = (P.h - 124) / 200;
    return { P, y0, k, r: 11 * (PHONE ? 1.15 : 1), x1: P.x + P.w * 0.36, x2: P.x + P.w * 0.64, yy: (cm) => y0 + cm * k };
  }
  function startFall() {
    const F = S.F;
    if (F.state === 'run') return;
    F.state = 'run'; F.t = 0; F.shown = 1; F.flash = 1; F.landed = false; F.sel = -1;
    Sound.click();
  }
  function resetFall() { Object.assign(S.F, { state: 'ready', t: 0, shown: 1, flash: 0, sel: -1, landed: false }); S.read.clear(); updateCtl(); }
  function stepFall(dt) {
    const F = S.F;
    F.flash = AP(F.flash, 0, dt, 6);
    if (F.state !== 'run') return;
    F.t += dt * SLOW;
    const n = Math.min(7, Math.floor(F.t * 10 + 1e-6) + 1);
    if (n > F.shown) { F.shown = n; F.flash = 1; Sound.tick(); }
    if (F.t >= T_LAND2) {
      F.t = T_LAND2; F.state = 'done'; F.landed = true; S.fallDone++;
      const g = fallGeo();
      parts.burst(g.x1, g.yy(200), { count: 10, speed: 90, size: 3, life: 0.6, colors: ['#cbd5e1', '#94a3b8'], gravity: 120 });
      parts.burst(g.x2, g.yy(200), { count: 10, speed: 90, size: 3, life: 0.6, colors: ['#cbd5e1', '#94a3b8'], gravity: 120 });
      Sound.success();
    }
  }
  function fallCmNow() { const F = S.F; return F.state === 'ready' ? 0 : Math.min(200, sCm(F.t)); }

  function drawFall(t) {
    const g = fallGeo(), P = g.P, F = S.F;
    darkPanel(P);
    // 눈금과 격자
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    for (let cm = 0; cm <= 200; cm += 20) {
      const y = g.yy(cm);
      ctx.strokeStyle = cm % 100 === 0 ? 'rgba(180,200,255,.38)' : 'rgba(180,200,255,.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(P.x + 56, y); ctx.lineTo(P.x + P.w - 12, y); ctx.stroke();
      D.text(P.x + 50, y + 4.5, cm + '', { size: 12.5, weight: 700, color: '#aebbe0', align: 'right' });
    }
    D.text(P.x + 14, P.y + 26, '📸 다중섬광 사진 (0.1초마다)', { size: 15, weight: 800, color: '#e8eeff', align: 'left', baseline: 'middle' });
    D.text(P.x + 14, P.y + 48, '세로 눈금: 낙하 거리 (cm)', { size: 12, weight: 700, color: '#aebbe0', align: 'left', baseline: 'middle' });
    // 바닥
    const gy = g.yy(200);
    ctx.fillStyle = '#334155'; ctx.fillRect(P.x, gy + g.r, P.w, P.h);
    ctx.fillStyle = '#64748b'; ctx.fillRect(P.x, gy + g.r, P.w, 4);
    // 전자석
    [g.x1, g.x2].forEach((x, i) => {
      ctx.fillStyle = '#64748b'; rr(x - 17, g.y0 - g.r - 16, 34, 12, 4).fill();
      D.sphere(x + 9, g.y0 - g.r - 10, 3, F.state === 'ready' ? '#ef4444' : '#64748b', { gloss: false });
      D.text(x, g.y0 - g.r - 24, i ? '5 kg' : '1 kg', { size: 14, weight: 800, color: i ? COL.b5 : COL.b1, align: 'center' });
    });
    // 같은 높이 점선 + 잔상
    for (let i = 1; i < F.shown; i++) {
      const y = g.yy(sCm(STROBE[i]));
      ctx.strokeStyle = F.sel === i ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.22)'; ctx.lineWidth = F.sel === i ? 2 : 1.2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(g.x1 - 20, y); ctx.lineTo(g.x2 + 30, y); ctx.stroke(); ctx.setLineDash([]);
    }
    for (let i = 0; i < F.shown; i++) {
      const y = g.yy(sCm(STROBE[i]));
      const a = (F.state === 'ready' ? 1 : 0.55) * (F.sel === i ? 1.5 : 1);
      if (i > 0) { ball(g.x1, y, g.r, COL.b1, Math.min(1, a)); ball(g.x2, y, g.r, COL.b5, Math.min(1, a)); }
      if (i > 0) D.text(g.x2 + 26, y + 4.5, f1(STROBE[i]) + ' s', { size: 12.5, weight: 800, color: F.sel === i ? '#fff' : '#cbd5f5', align: 'left' });
    }
    // 지금 공
    const cm = fallCmNow(), yb = g.yy(cm);
    ball(g.x1, yb, g.r, COL.b1); ball(g.x2, yb, g.r, COL.b5);
    // 중력 화살표 (일정)
    const as = 1.2;
    if (yb + 49 * as + 16 < gy + g.r) {
      D.arrow(g.x1 + g.r + 8, yb, g.x1 + g.r + 8, yb + 9.8 * as, { color: '#ff6b6b', width: 4, head: 9 });
      D.arrow(g.x2 - g.r - 8, yb, g.x2 - g.r - 8, yb + 49 * as, { color: '#ff6b6b', width: 4, head: 11 });
      D.text(g.x1 + g.r + 14, yb + 9.8 * as + 14, '9.8 N', { size: 12.5, weight: 800, color: '#ffb4b4', align: 'left' });
      D.text(g.x2 - g.r - 14, yb + 49 * as + 14, '49 N', { size: 12.5, weight: 800, color: '#ffb4b4', align: 'right' });
    }
    if (F.state === 'ready' || F.t < 0.15) D.text(P.x + P.w / 2, g.yy(150), '빨간 화살표 = 공에 작용하는 중력', { size: 12.5, weight: 700, color: '#ffb4b4', alpha: 0.9 });
    // 번쩍임
    if (F.flash > 0.02 && !RM) { ctx.fillStyle = 'rgba(255,255,255,' + 0.22 * F.flash + ')'; ctx.fillRect(P.x, P.y, P.w, P.h); }
    ctx.restore();
    drawFallTable(t);
  }
  function drawFallTable(t) {
    const T = LF.T, F = S.F;
    panel(T);
    D.text(T.x + 14, T.y + 24, '📋 측정값', { size: 15, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
    D.text(T.x + T.w - 12, T.y + 24, '행을 누르면 사진에서 표시돼요', { size: 11.5, weight: 700, color: '#94a3b8', align: 'right', baseline: 'middle' });
    const cw = PHONE ? [90, 160, 160, 130] : [52, 78, 70, 82];
    const x0 = T.x + 10, hh = PHONE ? 30 : 34, rh = PHONE ? 32 : 38, y0 = T.y + 40;
    const heads = ['t (s)', '낙하 거리 s (cm)', '구간 거리 (cm)', ''];
    let x = x0;
    ctx.fillStyle = '#eef2f8'; rr(x0 - 2, y0, T.w - 16, hh, 8).fill();
    heads.forEach((h, i) => { if (h) { const lines = wrap(h, cw[i] - 4, font(11.5, 800)); lines.forEach((ln, j) => D.text(x + cw[i] / 2, y0 + hh / 2 + (j - (lines.length - 1) / 2) * 13 * FS, ln, { size: 11.5, weight: 800, color: '#475569', baseline: 'middle' })); } x += cw[i]; });
    for (let i = 1; i <= 6; i++) {
      const y = y0 + hh + 4 + (i - 1) * rh, shown = i < F.shown, sel = F.sel === i;
      if (sel) { ctx.fillStyle = '#fff1e8'; rr(x0 - 2, y, T.w - 16, rh - 2, 8).fill(); ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2; rr(x0 - 2, y, T.w - 16, rh - 2, 8).stroke(); }
      else if (S.read.has(i)) { ctx.fillStyle = '#f1fbf5'; rr(x0 - 2, y, T.w - 16, rh - 2, 8).fill(); }
      const s = sCm(STROBE[i]), ds = s - sCm(STROBE[i - 1]);
      let xx = x0;
      const cells = [f1(STROBE[i]), fcm(s), fcm(ds)];
      cells.forEach((c, j) => { D.text(xx + cw[j] / 2, y + rh / 2 - 1, shown ? c : '—', { size: 13.5, weight: shown ? 800 : 700, color: shown ? '#1b2333' : '#cbd5e1', baseline: 'middle' }); xx += cw[j]; });
      if (shown) { const bw = Math.max(0, ds / 54 * (cw[3] - 10)); ctx.fillStyle = '#f26b3a'; rr(xx + 2, y + rh / 2 - 6, bw, 12, 4).fill(); }
    }
    const yb = y0 + hh + 4 + 6 * rh + 8;
    ctx.fillStyle = '#f8fafc'; rr(T.x + 10, yb, T.w - 20, T.y + T.h - yb - 10, 10).fill();
    const lx = T.x + 20, tw = T.w - 40;
    let yy = yb + 16 * FS;
    yy += textBlock('s = ½ g t²  (g = 9.8 m/s²)', lx, yy, tw, { size: 13.5, weight: 800, color: '#9a3412' });
    yy += 4;
    yy += textBlock('1 kg 공: 9.8 N / 1 kg = 9.8 m/s²', lx, yy + 4, tw, { size: 13, weight: 700, color: COL.b1 === '#5aa7ff' ? '#1d5fc4' : '#1d5fc4' });
    yy += textBlock('5 kg 공: 49 N / 5 kg = 9.8 m/s²', lx, yy + 6, tw, { size: 13, weight: 700, color: '#a8620a' });
    if (!PHONE || yy < T.y + T.h - 30) textBlock('가속도 = 중력 / 질량 → 질량이 달라도 같아요.', lx, yy + 10, tw, { size: 13, weight: 800, color: '#1b2333' });
  }
  function fallClick(p) {
    const g = fallGeo(), F = S.F;
    for (let i = 1; i < F.shown; i++) {
      const y = g.yy(sCm(STROBE[i]));
      if (Math.abs(p.y - y) < 17 && ((Math.abs(p.x - g.x1) < 22) || (Math.abs(p.x - g.x2) < 22))) { selectRead(i); return true; }
    }
    const T = LF.T, cwTotal = 0, rh = PHONE ? 32 : 38, hh = PHONE ? 30 : 34, y0 = T.y + 40 + hh + 4;
    if (p.x >= T.x && p.x <= T.x + T.w) for (let i = 1; i < F.shown; i++) { const y = y0 + (i - 1) * rh; if (p.y >= y && p.y < y + rh) { selectRead(i); return true; } }
    return false;
  }
  function selectRead(i) { S.F.sel = i; S.read.add(i); Sound.click(); updateCtl(); }

  /* ======================================================
     ② 수평으로 던지기 (격자 위 다중섬광 사진)
     ====================================================== */
  const TG = PHONE ? { P: { x: 12, y: 12, w: 576, h: 556 }, R: { x: 12, y: 580, w: 576, h: 268 }, k: 1.85, ox: 58, oy: 86 }
    : { P: { x: 12, y: 12, w: 776, h: 536 }, R: { x: 604, y: 100, w: 172, h: 372 }, k: 1.75, ox: 90, oy: 84 };
  const TX = (cm) => TG.P.x + TG.ox + cm * TG.k, TY = (cm) => TG.P.y + TG.oy + cm * TG.k;
  function startThrow() {
    const T = S.T;
    if (T.state === 'run') return;
    Object.assign(T, { state: 'run', t: 0, shown: 1, flash: 1, v: S.v, landed: false });
    Sound.click();
  }
  function resetThrow() { Object.assign(S.T, { state: 'ready', t: 0, shown: 1, flash: 0, landed: false }); updateCtl(); }
  function stepThrow(dt) {
    const T = S.T;
    T.flash = AP(T.flash, 0, dt, 6);
    if (T.state !== 'run') return;
    T.t += dt * SLOW;
    const n = Math.min(7, Math.floor(T.t * 10 + 1e-6) + 1);
    if (n > T.shown) { T.shown = n; T.flash = 1; Sound.tick(); }
    if (T.t >= T_LAND2) {
      T.t = T_LAND2; T.state = 'done'; T.landed = true; S.throwRuns.add(T.v);
      parts.burst(TX(0), TY(200), { count: 8, speed: 80, size: 3, life: 0.5, colors: ['#cbd5e1', '#94a3b8'], gravity: 120 });
      parts.burst(TX(100 * T.v * T_LAND2), TY(200), { count: 8, speed: 80, size: 3, life: 0.5, colors: ['#cbd5e1', '#94a3b8'], gravity: 120 });
      Sound.success();
      updateCtl();
    }
  }
  function drawThrow(t) {
    const P = TG.P, T = S.T, k = TG.k, r = 8 * (PHONE ? 1.2 : 1);
    darkPanel(P);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    // 격자 (20 cm 간격)
    for (let cm = 0; cm <= 260; cm += 20) {
      ctx.strokeStyle = cm % 100 === 0 ? 'rgba(180,200,255,.38)' : 'rgba(180,200,255,.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(TX(cm), TY(0)); ctx.lineTo(TX(cm), TY(200)); ctx.stroke();
      D.text(TX(cm), TY(0) - 8, cm + '', { size: 11.5, weight: 700, color: '#aebbe0', align: 'center' });
    }
    for (let cm = 0; cm <= 200; cm += 20) {
      ctx.strokeStyle = cm % 100 === 0 ? 'rgba(180,200,255,.38)' : 'rgba(180,200,255,.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(TX(0), TY(cm)); ctx.lineTo(TX(260), TY(cm)); ctx.stroke();
      D.text(TX(260) + 8, TY(cm) + 4, cm + '', { size: 11.5, weight: 700, color: '#aebbe0', align: 'left' });
    }
    D.text(P.x + 14, P.y + 24, '📸 격자 위 다중섬광 사진 (0.1초마다, 한 칸 = 20 cm)', { size: 14, weight: 800, color: '#e8eeff', align: 'left', baseline: 'middle' });
    D.text(TX(130), TY(0) - 26, '수평 위치 (cm)', { size: 12, weight: 700, color: '#aebbe0', align: 'center' });
    D.text(TX(260) + 8, TY(0) - 26, '낙하 (cm)', { size: 12, weight: 700, color: '#aebbe0', align: 'left' });
    // 바닥 · 발사 장치
    ctx.fillStyle = '#334155'; ctx.fillRect(P.x, TY(200) + r, P.w, P.h);
    ctx.fillStyle = '#64748b'; ctx.fillRect(P.x, TY(200) + r, P.w, 4);
    ctx.fillStyle = '#475569'; rr(TX(0) - 48, TY(0) + r + 1, 46, 14, 3).fill();
    ctx.fillStyle = '#334155'; ctx.fillRect(TX(0) - 40, TY(0) + r + 14, 10, TY(200) - TY(0));
    D.text(TX(0) - 24, TY(0) + r + 34, '발사대', { size: 11.5, weight: 700, color: '#cbd5e1', align: 'center' });
    ctx.fillStyle = '#64748b'; rr(TX(0) - 10, TY(0) - r - 16, 20, 9, 3).fill();
    // 같은 높이 점선 · 잔상
    const v = T.state === 'ready' ? S.v : T.v;
    for (let i = 1; i < T.shown; i++) {
      const y = TY(sCm(STROBE[i])), x = TX(100 * v * STROBE[i]);
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(TX(0), y); ctx.lineTo(Math.max(x, TX(0) + 4), y); ctx.stroke(); ctx.setLineDash([]);
    }
    for (let i = 1; i < T.shown; i++) {
      const y = TY(sCm(STROBE[i])), x = TX(100 * v * STROBE[i]);
      ball(TX(0), y, r, COL.drop, 0.55); ball(x, y, r, COL.thr, 0.6);
      D.text(x + r + 4, y - r - 3, f1(STROBE[i]) + ' s', { size: 11.5, weight: 800, color: '#ffd9c2', align: 'left', stroke: 'rgba(8,12,30,.8)', strokeWidth: 3 });
    }
    // 지금 공
    const tt = T.state === 'ready' ? 0 : T.t, ys = TY(Math.min(200, sCm(tt))), xs = TX(100 * v * tt);
    ball(xs, ys, r, COL.thr); ball(TX(0), ys, r * 0.92, COL.drop);
    if (T.state !== 'ready' && T.v > 0) D.arrow(xs + r + 3, ys, xs + r + 3 + 12 * v, ys, { color: '#ffd9c2', width: 3, head: 8 });
    if (T.flash > 0.02 && !RM) { ctx.fillStyle = 'rgba(255,255,255,' + 0.2 * T.flash + ')'; ctx.fillRect(P.x, P.y, P.w, P.h); }
    ctx.restore();
    // 범례
    ctx.save(); ctx.font = font(13, 800);
    const lg = [['#ff7a3d', '던진 공'], ['#5aa7ff', '떨어뜨린 공']];
    lg.forEach(([c, n], i) => { D.sphere(P.x + 22 + i * 110, P.y + P.h - 22, 8, c, { gloss: false }); D.text(P.x + 36 + i * 110, P.y + P.h - 17, n, { size: 13, weight: 800, color: '#e8eeff', align: 'left' }); });
    ctx.restore();
    drawThrowInfo(t);
  }
  function drawThrowInfo(t) {
    const R = TG.R, T = S.T, v = T.state === 'ready' ? S.v : T.v;
    if (PHONE) panel(R); else { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(R.x, R.y, R.w, R.h, 12).fill(); }
    const lx = R.x + 14, tw = R.w - 28;
    let y = R.y + 24;
    D.text(lx, y, '관찰 포인트', { size: PHONE ? 16 : 14.5, weight: 800, color: '#9a3412', align: 'left', baseline: 'middle' }); y += 24 * FS;
    y += textBlock('수평 방향 → 힘이 없어서 속력이 일정해요. 0.1초마다 ' + fcm(100 * v * 0.1) + ' cm씩 가요 (v₀ = ' + f1(v) + ' m/s).', lx, y, tw, { size: PHONE ? 15.5 : 13.5, color: '#2b3445' }) + 8;
    y += textBlock('연직 방향 → 중력만 받아요. 두 공의 높이가 항상 같아요.', lx, y, tw, { size: PHONE ? 15.5 : 13.5, color: '#2b3445' }) + 8;
    if (T.landed) {
      y += textBlock('두 공이 땅에 닿은 시각: ' + f2(T_LAND2) + ' s (같아요!)', lx, y, tw, { size: PHONE ? 15.5 : 13.5, weight: 800, color: '#0b6b39' }) + 4;
      textBlock('던진 공은 ' + f2(100 * T.v * T_LAND2 / 100) + ' m 떨어진 곳에 닿았어요.', lx, y, tw, { size: PHONE ? 15.5 : 13.5, weight: 700, color: '#0b6b39' });
    }
  }

  /* ======================================================
     ③ ④ 절벽 장면 (두 운동 비교 · 여러 천체)
     ====================================================== */
  const CF = PHONE ? { P: { x: 12, y: 12, w: 576, h: 560 }, R: { x: 12, y: 584, w: 576, h: 264 } } : { P: { x: 12, y: 12, w: 480, h: 536 }, R: { x: 504, y: 12, w: 284, h: 536 } };
  function cliffGeo() {
    const P = CF.P, r = 8 * (PHONE ? 1.2 : 1), k = (P.h - 58 - 48) / H_CLIFF;
    const ox = P.x + (PHONE ? 62 : 62), oy = P.y + 58;
    return { P, r, k, ox, oy, sx: ox + r + 2, ground: oy + H_CLIFF * k, X: (m) => ox + r + 2 + m * k, Y: (m) => oy + m * k };
  }
  const CLIFF_COL = ['#ff7a3d', '#f5a524', '#34c28b', '#8b5cf6'];
  function startCliff(st, v, g) {
    if (st.state === 'run') return false;
    Object.assign(st, { state: 'run', t: 0, v, g, tL: Math.sqrt(2 * H_CLIFF / g), landed: false });
    Sound.click();
    return true;
  }
  function stepCliff(st, dt, kind) {
    if (st.state !== 'run') return;
    st.t += dt;
    if (st.t >= st.tL) {
      st.t = st.tL; st.state = 'done'; st.landed = true;
      const g = cliffGeo();
      parts.burst(g.sx, g.ground, { count: 10, speed: 90, size: 3, life: 0.6, colors: ['#e5e7eb', '#9ca3af'], gravity: 120 });
      parts.burst(g.X(st.v * st.tL), g.ground, { count: 12, speed: 100, size: 3, life: 0.7, colors: ['#ffb27a', '#ff7a3d'], gravity: 140 });
      if (kind === 'compare') S.cres[st.v] = { t: st.tL, x: st.v * st.tL };
      else S.pres[S.body] = { t: st.tL, x: st.v * st.tL };
      Sound.success(); updateCtl();
    }
  }
  function drawBackdrop(P, theme, g, t) {
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    const sk = ctx.createLinearGradient(0, P.y, 0, g.ground);
    sk.addColorStop(0, theme.sky[0]); sk.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sk; ctx.fillRect(P.x, P.y, P.w, P.h);
    if (theme.stars) { ctx.fillStyle = '#fff'; for (let i = 0; i < 46; i++) { const x = P.x + ((i * 97) % 100) / 100 * P.w, y = P.y + ((i * 53) % 100) / 100 * (g.ground - P.y); ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 1.2 + i)); ctx.fillRect(x, y, 1.6, 1.6); } ctx.globalAlpha = 1; }
    else if (theme.id === 'earth') { ctx.fillStyle = 'rgba(255,255,255,.8)'; [[0.45, 0.2], [0.75, 0.38]].forEach(([fx, fy], i) => { const x = P.x + P.w * fx + (RM ? 0 : Math.sin(t * 0.2 + i) * 6), y = P.y + (g.ground - P.y) * fy; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.arc(x + 15, y - 6, 15, 0, 7); ctx.arc(x + 32, y, 11, 0, 7); ctx.fill(); }); }
    else if (theme.id === 'jup') { for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(160,100,60,' + (0.12 + 0.05 * (i % 2)) + ')'; ctx.fillRect(P.x, P.y + (g.ground - P.y) * (0.1 + i * 0.17), P.w, 22 + 6 * i); } }
    // 땅
    ctx.fillStyle = theme.gnd2; ctx.fillRect(P.x, g.ground, P.w, P.h);
    ctx.fillStyle = theme.gnd; ctx.fillRect(P.x, g.ground, P.w, 8);
    // 절벽
    const cg = ctx.createLinearGradient(P.x, 0, g.ox, 0); cg.addColorStop(0, '#6b7280'); cg.addColorStop(1, '#4b5563');
    ctx.fillStyle = cg; ctx.fillRect(P.x, g.oy, g.ox - P.x, g.ground - g.oy + 8);
    ctx.fillStyle = theme.gnd; ctx.fillRect(P.x, g.oy - 4, g.ox - P.x + 2, 6);
    // 높이 눈금
    [0, 5, 10, 15, H_CLIFF].forEach((m) => { const y = g.Y(m); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g.ox - 14, y); ctx.lineTo(g.ox, y); ctx.stroke(); D.text(g.ox - 18, y + 4.5, (m === H_CLIFF ? '19.6' : m) + ' m', { size: 12, weight: 800, color: '#f3f4f6', align: 'right' }); });
    ctx.save(); ctx.translate(P.x + 14, (g.oy + g.ground) / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, '높이 (낙하 거리)', { size: 12, weight: 700, color: '#d1d5db' }); ctx.restore();
    // 거리 눈금 (땅 위)
    for (let m = 0; m <= 30; m += 1) { const x = g.X(m); if (x > P.x + P.w - 8) break; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, g.ground); ctx.lineTo(x, g.ground + (m % 2 ? 5 : 9)); ctx.stroke(); if (m % 2 === 0 && m > 0) D.text(x, g.ground + 24, m + '', { size: 12, weight: 800, color: '#f3f4f6' }); }
    D.text(g.sx, g.ground + 42, '수평 거리 (m)', { size: 12, weight: 700, color: '#e5e7eb', align: 'left' });
    ctx.restore();
  }
  function cliffMarkDt(tL) { return tL > 3 ? 1 : tL > 1.6 ? 0.5 : 0.25; }
  function drawCliff(st, theme, kind, t) {
    const g = cliffGeo(), P = g.P, r = g.r;
    drawBackdrop(P, theme, g, t);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    const gg = st.state === 'ready' ? theme.g : st.g, v = st.state === 'ready' ? (kind === 'compare' ? S.cv : V_PLANET) : st.v, tL = Math.sqrt(2 * H_CLIFF / gg);
    const px = (tt) => g.X(v * tt), py = (tt) => g.Y(Math.min(H_CLIFF, 0.5 * gg * tt * tt));
    // 이전 기록 경로 (비교 장면)
    if (kind === 'compare') {
      Object.keys(S.cres).forEach((key) => {
        const vv = +key, c = CLIFF_COL[vv - 1];
        ctx.strokeStyle = rgba(c, 0.55); ctx.lineWidth = 2.5; ctx.setLineDash([4, 5]); ctx.beginPath();
        for (let tt = 0; tt <= tL + 1e-6; tt += 0.05) { const x = g.X(vv * tt), y = g.Y(0.5 * G * tt * tt); tt === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke(); ctx.setLineDash([]);
        const lx = g.X(vv * tL);
        D.label(lx, g.ground - 16, f1(vv * tL) + ' m', { bg: c, size: 12, pad: 7 });
      });
    }
    // 지금 경로 + 같은 시각 표시
    const tn = st.state === 'ready' ? 0 : st.t;
    if (st.state !== 'ready') {
      const c = kind === 'compare' ? CLIFF_COL[v - 1] : COL.thr;
      ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 2.5; ctx.beginPath();
      for (let tt = 0; tt <= tn + 1e-6; tt += 0.03) { const x = px(tt), y = py(tt); tt === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      const dm = cliffMarkDt(tL);
      for (let m = dm; m <= tn + 1e-6; m += dm) {
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(g.sx, py(m)); ctx.lineTo(px(m), py(m)); ctx.stroke(); ctx.setLineDash([]);
        ball(g.sx, py(m), r * 0.8, COL.drop, 0.5); ball(px(m), py(m), r * 0.8, c, 0.6);
        D.text(g.sx + r + 6, py(m) - 5, f1(m) + ' s', { size: 11.5, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(0,0,0,.55)', strokeWidth: 3 });
      }
    }
    // 공
    const c0 = kind === 'compare' && st.state !== 'ready' ? CLIFF_COL[v - 1] : COL.thr;
    ball(g.sx, py(tn), r, COL.drop); ball(px(tn), py(tn), r, c0);
    D.text(g.sx - 4, g.oy - r - 6, '● 놓은 공', { size: 12, weight: 800, color: theme.stars ? '#9cc7ff' : '#1d5fc4', align: 'left' });
    D.text(g.sx + 70 * FS, g.oy - r - 6, '● 던진 공', { size: 12, weight: 800, color: theme.stars ? '#ffb185' : '#c2410c', align: 'left' });
    // 속도 성분 화살표 (비교 장면)
    if (kind === 'compare' && st.state !== 'ready' && st.state === 'run') {
      const bx = px(tn), by = py(tn), sc = 3.2, vy = G * tn;
      if (v > 0) D.arrow(bx + r, by, bx + r + v * sc + 2, by, { color: '#ffffff', width: 3, head: 8 });
      if (vy > 0.3) D.arrow(bx, by + r, bx, by + r + vy * sc, { color: '#ffe066', width: 3, head: 8 });
    }
    ctx.restore();
    D.label(P.x + P.w - 14 - 4, P.y + 24, theme.name + ' · g = ' + theme.g + ' m/s²', { bg: 'rgba(15,23,42,.78)', size: 13.5, pad: 9, align: 'right' });
    D.text(P.x + 14, P.y + 20, kind === 'compare' ? '절벽 높이 ' + H_CLIFF + ' m' : '절벽 높이 ' + H_CLIFF + ' m · 수평 속력 ' + V_PLANET + ' m/s', { size: 14, weight: 800, color: theme.stars ? '#f3f4f6' : '#1b2333', align: 'left', baseline: 'middle' });
    // 지구 중심 방향 안내
    const ax = P.x + P.w - 30, ay = g.ground - 96;
    D.arrow(ax, ay, ax, ay + 78, { color: '#ef4444', width: 3.5, head: 10 });
    D.text(ax - 8, ay + 28, '중력', { size: 12.5, weight: 800, color: theme.stars ? '#fff' : '#7f1d1d', align: 'right', stroke: theme.stars ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.7)', strokeWidth: 3 });
    D.text(ax - 8, ay + 46, '(천체 중심 방향)', { size: 11, weight: 700, color: theme.stars ? '#fff' : '#7f1d1d', align: 'right', stroke: theme.stars ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.7)', strokeWidth: 3 });
  }

  /* ---------- 오른쪽 패널: 비교 ---------- */
  function drawCompareInfo(t) {
    const R = CF.R, C = S.C;
    panel(R);
    const g = C.state === 'ready' ? G : C.g, v = C.state === 'ready' ? S.cv : C.v;
    const tn = C.state === 'ready' ? 0 : C.t, vy = G * tn;
    // 속도 분해 그림
    const bw = PHONE ? 270 : R.w - 24, bh = PHONE ? 214 : 196, bx = R.x + 12, by = R.y + 36;
    D.text(R.x + 14, R.y + 22, '➡️ 속도의 성분 (지금 순간)', { size: 14, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
    ctx.fillStyle = '#f5f8fd'; rr(bx, by, bw, bh, 10).fill();
    const sc = PHONE ? 7 : 6.5, ox = bx + 24, oy = by + 18;
    // 눈금(5 m/s)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let q = 5; q <= 20; q += 5) { ctx.beginPath(); ctx.moveTo(ox - 4, oy + q * sc); ctx.lineTo(ox + 70, oy + q * sc); ctx.stroke(); D.text(ox - 8, oy + q * sc + 4, q + '', { size: 11, weight: 700, color: '#94a3b8', align: 'right' }); }
    D.sphere(ox, oy, 5, '#334155', { gloss: false });
    const vx = v;
    if (vx > 0) D.arrow(ox, oy, ox + vx * sc, oy, { color: '#2563eb', width: 4, head: 10 });
    if (vy > 0.3) {
      D.arrow(ox, oy, ox, oy + vy * sc, { color: '#d97706', width: 4, head: 10 });
      if (vx > 0) D.arrow(ox, oy, ox + vx * sc, oy + vy * sc, { color: '#7c3aed', width: 2.5, head: 9, dash: [6, 5] });
    }
    D.text(ox + 78, oy + 6, 'vₓ = ' + f1(vx) + ' m/s (일정)', { size: 12.5, weight: 800, color: '#2563eb', align: 'left' });
    D.text(ox + 78, oy + 24, 'v_y = ' + f1(vy) + ' m/s (증가)', { size: 12.5, weight: 800, color: '#b45309', align: 'left' });
    D.text(ox + 78, oy + 42, '노랑 + 파랑 → 합친 속도', { size: 11.5, weight: 700, color: '#7c3aed', align: 'left' });
    D.text(bx + bw - 8, by + bh - 8, '속력 눈금: m/s (세로)', { size: 11, weight: 700, color: '#94a3b8', align: 'right' });
    // 표
    const tx = PHONE ? R.x + 296 : R.x + 12, ty = PHONE ? R.y + 36 : by + bh + 14, tw = PHONE ? R.w - 308 : R.w - 24;
    D.text(tx + 2, ty + 8, '📋 던진 기록', { size: 14, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
    const rh = PHONE ? 34 : 34, y0 = ty + 22;
    const cw = [tw * 0.3, tw * 0.34, tw * 0.36];
    ctx.fillStyle = '#eef2f8'; rr(tx, y0, tw, 28, 8).fill();
    ['속력 v₀', '낙하 시간 t', '도달 거리 x'].forEach((h, i) => D.text(tx + cw.slice(0, i).reduce((a, b) => a + b, 0) + cw[i] / 2, y0 + 14, h, { size: 11.5, weight: 800, color: '#475569', baseline: 'middle' }));
    [1, 2, 3, 4].forEach((vv, i) => {
      const y = y0 + 32 + i * rh, res = S.cres[vv], pred = vv === 4 && S.predOK && !res;
      const cur = (C.state !== 'ready' ? C.v : S.cv) === vv;
      if (cur) { ctx.fillStyle = rgba(CLIFF_COL[vv - 1], 0.14); rr(tx, y, tw, rh - 3, 8).fill(); }
      D.sphere(tx + 10, y + rh / 2 - 1, 5, CLIFF_COL[vv - 1], { gloss: false });
      const cells = [vv + ' m/s', res ? f1(res.t) + ' s' : pred ? '2.0 s ✔' : '—', res ? f1(res.x) + ' m' : pred ? '8.0 m ✔' : '—'];
      cells.forEach((c, j) => D.text(tx + cw.slice(0, j).reduce((a, b) => a + b, 0) + cw[j] / 2 + (j === 0 ? 6 : 0), y + rh / 2 - 1, c, { size: 13, weight: 800, color: c === '—' ? '#cbd5e1' : pred && j > 0 ? '#0b6b39' : '#1b2333', baseline: 'middle' }));
    });
    const gy = PHONE ? by + bh + 12 : y0 + 32 + 4 * rh + 6;
    const gx = R.x + 14;
    D.arrow(gx + 4, gy + 4, gx + 4, gy + 38, { color: '#ef4444', width: 3.5, head: 9 });
    textBlock('중력 가속도 g = 9.8 m/s²  (항상 아래쪽, 지구 중심 방향)', gx + 20, gy + 14, R.w - 40, { size: 12.5, weight: 800, color: '#b91c1c' });
    if (!PHONE) textBlock('x = v₀ × t', gx + 20, gy + 50, R.w - 40, { size: 13.5, weight: 800, color: '#1b2333' });
  }

  /* ---------- 오른쪽 패널: 천체 ---------- */
  function drawPlanetInfo(t) {
    const R = CF.R, Pn = S.P;
    panel(R);
    const b = BD[S.body];
    D.text(R.x + 14, R.y + 22, '🪐 천체별 낙하 기록', { size: 14.5, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
    const tx = R.x + 10, tw = R.w - 20, y0 = R.y + 38, rh = PHONE ? 38 : 40;
    const cw = [tw * 0.2, tw * 0.24, tw * 0.28, tw * 0.28];
    ctx.fillStyle = '#eef2f8'; rr(tx, y0, tw, 30, 8).fill();
    ['천체', 'g (m/s²)', '낙하 시간', '던진 공 거리'].forEach((h, i) => D.text(tx + cw.slice(0, i).reduce((a, c) => a + c, 0) + cw[i] / 2, y0 + 15, h, { size: 11.5, weight: 800, color: '#475569', baseline: 'middle' }));
    BODIES.forEach((bd, i) => {
      const y = y0 + 34 + i * rh, res = S.pres[bd.id], cur = bd.id === S.body;
      if (cur) { ctx.fillStyle = '#fff1e8'; rr(tx, y, tw, rh - 3, 8).fill(); ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2; rr(tx, y, tw, rh - 3, 8).stroke(); }
      const cells = [bd.name, String(bd.g), res ? f1(res.t) + ' s' : '—', res ? '약 ' + Math.round(res.x) + ' m' : '—'];
      cells.forEach((c, j) => D.text(tx + cw.slice(0, j).reduce((a, q) => a + q, 0) + cw[j] / 2, y + rh / 2 - 1, c, { size: 13, weight: 800, color: c === '—' ? '#cbd5e1' : '#1b2333', baseline: 'middle' }));
    });
    let y = y0 + 34 + 4 * rh + 8;
    const lx = R.x + 14, w = R.w - 28;
    ctx.fillStyle = '#f8fafc'; rr(R.x + 10, y, R.w - 20, R.y + R.h - y - 10, 10).fill();
    y += 18 * FS;
    y += textBlock('t = √(2h / g)', lx + 4, y, w, { size: 14, weight: 800, color: '#9a3412' }) + 2;
    y += textBlock('= √(2 × ' + H_CLIFF + ' / ' + b.g + ') = ' + f1(tFall(b.g)) + ' s', lx + 4, y, w, { size: 13.5, weight: 800, color: '#1b2333' }) + 6;
    y += textBlock('던진 공 거리 ≈ ' + V_PLANET + ' m/s × ' + f1(tFall(b.g)) + ' s ≈ ' + Math.round(V_PLANET * tFall(b.g)) + ' m', lx + 4, y, w, { size: 13, weight: 700, color: '#2b3445' }) + 6;
    if (!PHONE || y < R.y + R.h - 40) textBlock(b.id === 'jup' ? '※ 목성은 단단한 땅이 없어요. 같은 중력 값의 가상 바닥으로 가정했어요.' : '두 공은 항상 같은 시각에 땅에 닿아요.', lx + 4, y, w, { size: 12.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     점프 체험 (같은 처음 속력 3.0 m/s로 뛰기)
     ====================================================== */
  const JS = 0.6;     // 재생 속도
  function jumpCells() {
    const P = { x: 12, y: 12, w: VW - 24, h: VH - 24 };
    if (!PHONE) { const w = (P.w - 3 * 8) / 4; return BODIES.map((b, i) => ({ b, x: P.x + i * (w + 8), y: P.y, w, h: P.h, k: 100 })); }
    const w = (P.w - 8) / 2, h = (P.h - 12) / 2;
    return BODIES.map((b, i) => ({ b, x: P.x + (i % 2) * (w + 8), y: P.y + Math.floor(i / 2) * (h + 12), w, h, k: 70 }));
  }
  function startJump() {
    const J = S.J;
    if (J.state === 'run') return;
    Object.assign(J, { state: 'run', t: 0, done: false });
    Sound.click();
  }
  function stepJump(dt) {
    const J = S.J;
    if (J.state !== 'run') return;
    J.t += dt * JS;
    const tEnd = 2 * JUMP_V / BD.moon.g;
    if (J.t >= tEnd) { J.t = tEnd; J.state = 'done'; J.done = true; S.jumpAny = true; Sound.success(); updateCtl(); }
  }
  function drawAstronaut(cx, fy, k, squash, lean) {
    const H = 1.8 * k, sq = squash || 1;
    ctx.save(); ctx.translate(cx, fy); ctx.scale(1, sq);
    const legs = (dx) => { ctx.fillStyle = '#e5e7eb'; rr(cx * 0 + dx - 0.085 * k, -0.9 * k, 0.17 * k, 0.9 * k, 0.07 * k).fill(); ctx.fillStyle = '#9ca3af'; rr(cx * 0 + dx - 0.1 * k, -0.1 * k, 0.22 * k, 0.1 * k, 0.04 * k).fill(); };
    legs(-0.1 * k); legs(0.1 * k);
    ctx.fillStyle = '#cbd5e1'; rr(-0.34 * k, -1.45 * k, 0.2 * k, 0.5 * k, 0.07 * k).fill();             // 배낭
    D.shadow(() => { ctx.fillStyle = '#f3f4f6'; rr(-0.22 * k, -1.5 * k, 0.44 * k, 0.65 * k, 0.1 * k).fill(); }, { blur: 4, y: 2 });
    ctx.fillStyle = '#f26b3a'; rr(-0.1 * k, -1.32 * k, 0.2 * k, 0.12 * k, 0.03 * k).fill();
    ctx.fillStyle = '#f3f4f6'; rr(-0.34 * k, -1.45 * k, 0.12 * k, 0.1 * k, 0.04 * k).fill();
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.14 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.2 * k, -1.4 * k); ctx.lineTo((0.34 + lean * 0.1) * k, -1.15 * k - lean * 0.25 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.2 * k, -1.4 * k); ctx.lineTo((-0.34 - lean * 0.1) * k, -1.15 * k - lean * 0.25 * k); ctx.stroke();
    D.sphere(0.02 * k, -1.66 * k, 0.2 * k, '#f3f4f6', { gloss: false });
    ctx.fillStyle = '#1e3a8a'; rr(0.02 * k, -1.74 * k, 0.17 * k, 0.15 * k, 0.07 * k).fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(0.07 * k, -1.72 * k, 0.07 * k, 0.04 * k, 0.02 * k).fill();
    ctx.restore();
  }
  function drawJump(t) {
    const J = S.J, k0 = jumpCells()[0].k;
    jumpCells().forEach((c) => {
      const b = c.b, P = { x: c.x, y: c.y, w: c.w, h: c.h }, gnd = c.y + c.h - 40, k = c.k;
      ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
      const sk = ctx.createLinearGradient(0, P.y, 0, gnd); sk.addColorStop(0, b.sky[0]); sk.addColorStop(1, b.sky[1]);
      ctx.fillStyle = sk; ctx.fillRect(P.x, P.y, P.w, P.h);
      if (b.stars) { ctx.fillStyle = '#fff'; for (let i = 0; i < 30; i++) { ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t + i)); ctx.fillRect(P.x + ((i * 97) % 100) / 100 * P.w, P.y + ((i * 53) % 100) / 100 * (gnd - P.y), 1.6, 1.6); } ctx.globalAlpha = 1; }
      ctx.fillStyle = b.gnd2; ctx.fillRect(P.x, gnd, P.w, P.h); ctx.fillStyle = b.gnd; ctx.fillRect(P.x, gnd, P.w, 8);
      // 높이 눈금 (0.5 m마다)
      const light = b.stars;
      for (let m = 0; m <= 4.5; m += 0.5) { const y = gnd - m * k; if (y < P.y + 44) break; ctx.strokeStyle = light ? 'rgba(255,255,255,.5)' : 'rgba(30,40,60,.35)'; ctx.lineWidth = m % 1 === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(P.x + 8, y); ctx.lineTo(P.x + (m % 1 === 0 ? 24 : 16), y); ctx.stroke(); if (m % 1 === 0) D.text(P.x + 28, y + 4, m + ' m', { size: 11.5, weight: 800, color: light ? '#e5e7eb' : '#334155', align: 'left' }); }
      // 점프 계산
      const tt = J.state === 'idle' ? 0 : J.t, tAir = 2 * JUMP_V / b.g;
      const air = tt > 0 && tt < tAir - 1e-9;
      const hnow = tt >= tAir ? 0 : JUMP_V * tt - 0.5 * b.g * tt * tt;
      const apexT = JUMP_V / b.g, hmax = jumpH(b.g);
      const cx = P.x + P.w * 0.5, fy = gnd - hnow * k;
      // 최고점 선
      if (tt >= apexT && J.state !== 'idle') {
        const ya = gnd - hmax * k - 1.8 * k;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(P.x + 8, gnd - hmax * k); ctx.lineTo(P.x + P.w - 8, gnd - hmax * k); ctx.stroke(); ctx.setLineDash([]);
      }
      // 그림자 · 우주인
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, gnd + 8, 0.28 * k * (1 - Math.min(0.5, hnow / 4)), 4, 0, 0, Math.PI * 2); ctx.fill();
      const sq = !air && J.state === 'run' && tt < 0.05 ? 0.9 : !air && J.state === 'run' ? 1 : 1;
      drawAstronaut(cx, fy, k, sq, air ? 1 : 0);
      if (tt >= apexT && J.state !== 'idle') D.label(P.x + P.w - 10, gnd - hmax * k + 14, '최고 ' + f1(hmax) + ' m', { bg: '#ef4444', size: 13, pad: 8, align: 'right' });   // 우주인 위에 보이도록 마지막에 그려요
      ctx.restore();
      D.label(P.x + P.w / 2, P.y + 20, b.name + ' · g = ' + b.g + ' m/s²', { bg: 'rgba(15,23,42,.8)', size: 13.5, pad: 9 });
    });
  }

  /* ======================================================
     화면 · 조작 연결
     ====================================================== */
  const hint = $('#stageHint');
  let hintTimer = 0;
  function showHint(msg, ms) { hint.textContent = msg; hint.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.add('hide'), ms || 4200); }
  const TB = { fall: '📸 자유 낙하', throw: '➡️ 수평으로 던지기', compare: '📐 두 운동 비교', planet: '🪐 여러 천체에서 낙하', jump: '🦘 천체별 점프' };
  function cancelRuns(keep) {
    if (keep !== 'fall' && S.F.state === 'run') Object.assign(S.F, { state: 'ready', t: 0, shown: 1, flash: 0, sel: -1, landed: false });
    if (keep !== 'throw' && S.T.state === 'run') Object.assign(S.T, { state: 'ready', t: 0, shown: 1, flash: 0, landed: false });
    if (keep !== 'compare' && S.C.state === 'run') Object.assign(S.C, { state: 'ready', t: 0, landed: false });
    if (keep !== 'planet' && S.P.state === 'run') Object.assign(S.P, { state: 'ready', t: 0, landed: false });
    if (keep !== 'jump' && S.J.state === 'run') Object.assign(S.J, { state: 'idle', t: 0, done: false });
  }
  function setMode(m) {
    if (S.mode !== m) { S.mode = m; S.fade = 1; parts.clear(); cancelRuns(m); }
    updateCtl();
  }
  const barMode = () => (S.mode === 'jump' ? 'planet' : S.mode);
  function setBody(id) { if (S.P.state === 'run') return; S.body = id; Object.assign(S.P, { state: 'ready', t: 0, landed: false }); updateCtl(); }
  function setCv(v) { if (S.C.state === 'run') return; S.cv = v; Object.assign(S.C, { state: 'ready', t: 0, landed: false }); updateCtl(); }
  function updateCtl() {
    $$('#ctrlCard .control').forEach((c) => { const ms = (c.dataset.modes || '').split(/\s+/); let h = ms.indexOf(S.mode) < 0; if (c.id === 'readBox') h = h || !S.showRead; if (c.id === 'predBox') h = h || !S.showPred; c.hidden = h; });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === barMode()));
    $('#tbLabel').textContent = TB[S.mode];
    $('#sV').value = S.v; $('#sV').style.setProperty('--pct', (S.v / 4 * 100) + '%'); $('#oV').textContent = f1(S.v) + ' m/s';
    $('#oCv').textContent = S.cv + ' m/s';
    $$('#cvSeg .opt').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.v === S.cv ? 'true' : 'false'));
    $$('#bodySeg .opt').forEach((b) => b.setAttribute('aria-pressed', b.dataset.b === S.body ? 'true' : 'false'));
    $('#oBody').textContent = BD[S.body].name + ' (g = ' + BD[S.body].g + ' m/s²)';
    $('#fallGo').disabled = S.F.state === 'run'; $('#throwGo').disabled = S.T.state === 'run'; $('#cmpGo').disabled = S.C.state === 'run';
    $('#planGo').disabled = S.P.state === 'run' || S.J.state === 'run';
    $('#planGo').textContent = S.mode === 'jump' ? '▶ 점프!' : '▶ 놓고 던지기';
    $('#planMode').textContent = S.mode === 'jump' ? '🪂 낙하 실험으로' : '🦘 점프 체험';
    $('#planNote').textContent = S.mode === 'jump' ? '똑같이 3.0 m/s로 뛰어올라요. 천체마다 최고 높이가 달라요.' : '높이 ' + H_CLIFF + ' m에서 파랑 공은 놓고, 주황 공은 ' + V_PLANET + ' m/s로 던져요.';
    $$('#sV, #sTime').forEach((e) => e.disabled = false);
    $('#sV').disabled = S.T.state === 'run';
    $$('#cvSeg .opt, #bodySeg .opt').forEach((b) => { b.disabled = S.C.state === 'run' || S.P.state === 'run'; });
    readouts();
  }
  function readouts() {
    const L = ['', '', ''], V = ['', '', ''];
    if (S.mode === 'fall') {
      const F = S.F, cm = fallCmNow();
      L[0] = '경과 시간 t'; V[0] = f2(F.state === 'ready' ? 0 : F.t) + ' s';
      L[1] = '낙하 거리 s'; V[1] = f1(cm) + ' cm';
      L[2] = '속력 v = g t'; V[2] = f2(G * (F.state === 'ready' ? 0 : F.t)) + ' m/s';
    } else if (S.mode === 'throw') {
      const T = S.T, v = T.state === 'ready' ? S.v : T.v, tt = T.state === 'ready' ? 0 : T.t;
      L[0] = '수평 속력 v₀'; V[0] = f1(v) + ' m/s (일정)';
      L[1] = '경과 시간 t'; V[1] = f2(tt) + ' s';
      L[2] = '낙하 거리 (두 공 같음)'; V[2] = f1(Math.min(200, sCm(tt))) + ' cm';
    } else if (S.mode === 'compare') {
      const C = S.C, tt = C.state === 'ready' ? 0 : C.t, v = C.state === 'ready' ? S.cv : C.v;
      L[0] = '수평 속력 v₀'; V[0] = v + ' m/s';
      L[1] = '경과 시간 t'; V[1] = f2(tt) + ' s';
      L[2] = '수평 이동 거리 x'; V[2] = f1(v * tt) + ' m';
    } else if (S.mode === 'planet') {
      const P = S.P, b = BD[S.body], tt = P.state === 'ready' ? 0 : P.t;
      L[0] = '천체 · 중력 가속도'; V[0] = b.name + ' · ' + b.g + ' m/s²';
      L[1] = '경과 시간 t'; V[1] = f2(tt) + ' s';
      L[2] = '낙하 시간(예상)'; V[2] = f1(tFall(b.g)) + ' s';
    } else {
      L[0] = '처음 속력(모두 같음)'; V[0] = JUMP_V.toFixed(1) + ' m/s';
      L[1] = '높이 공식'; V[1] = 'h = v² / (2g)';
      L[2] = '달 / 지구 (최고 높이)'; V[2] = '약 ' + Math.round(jumpH(1.6) / jumpH(9.8)) + '배';
    }
    for (let i = 0; i < 3; i++) { const a = $('#l' + (i + 1)), b = $('#v' + (i + 1)); if (a.textContent !== L[i]) a.textContent = L[i]; if (b.textContent !== V[i]) b.textContent = V[i]; }
  }
  $('#fallGo').addEventListener('click', () => { if (S.F.state === 'done') resetFall(); startFall(); updateCtl(); });
  $('#fallReset').addEventListener('click', () => { Sound.click(); resetFall(); });
  $('#sV').addEventListener('input', (e) => { S.v = +e.target.value; if (S.T.state !== 'run') resetThrow(); updateCtl(); });
  $('#throwGo').addEventListener('click', () => { if (S.T.state === 'done') resetThrow(); startThrow(); updateCtl(); });
  $('#throwReset').addEventListener('click', () => { Sound.click(); resetThrow(); });
  $$('#cvSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setCv(+b.dataset.v); }));
  $('#cmpGo').addEventListener('click', () => { if (startCliff(S.C, S.cv, G)) updateCtl(); });
  $('#cmpReset').addEventListener('click', () => { Sound.click(); S.cres = {}; S.predOK = false; Object.assign(S.C, { state: 'ready', t: 0, landed: false }); updateCtl(); });
  $$('#bodySeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setBody(b.dataset.b); }));
  $('#planGo').addEventListener('click', () => { if (S.mode === 'jump') { if (S.J.state === 'done') Object.assign(S.J, { state: 'idle', t: 0 }); startJump(); } else startCliff(S.P, V_PLANET, BD[S.body].g); updateCtl(); });
  $('#planMode').addEventListener('click', () => { Sound.click(); setMode(S.mode === 'jump' ? 'planet' : 'jump'); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'fall' && fallClick(p)) return false; return false; },
    hover(p) { if (S.mode !== 'fall') return null; const g = fallGeo(), F = S.F; for (let i = 1; i < F.shown; i++) { const y = g.yy(sCm(STROBE[i])); if (Math.abs(p.y - y) < 17 && (Math.abs(p.x - g.x1) < 22 || Math.abs(p.x - g.x2) < 22)) return 'pointer'; } return null; },
  });
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const chip3 = (items) => items.map(([ok, label]) => mark(ok) + ' ' + label).join('  ');
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const levels = [
    {
      title: '자유 낙하: 질량이 달라도 같을까?', short: '자유 낙하', icon: '🍎', phase: '관찰',
      features: ['fall'],
      intro: '<p class="si-q">❓ 탐구 질문: 수평으로 세게 던진 공과 그냥 떨어뜨린 공 중 어느 쪽이 먼저 땅에 닿을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 자유 낙하 운동은 속력이 1초마다 9.8 m/s씩 일정하게 늘고, 공기 저항이 없으면 질량과 관계없다고 배웠어요(중3). 이번에는 이것을 <b>수평으로 던진 공</b>과 비교하고, 모든 낙하 운동이 <b>지구 중심 방향의 중력 가속도 운동</b>임을 확인해요.</div>' +
        '<p>먼저 <b>1 kg 공과 5 kg 공</b>을 같은 높이에서 동시에 떨어뜨려 <b>다중섬광 사진</b>으로 찍어 봐요. (공기 저항은 무시해요.)</p>',
      setup() { setMode('fall'); resetFall(); },
      recap: '질량이 달라도 두 공은 항상 같은 위치에 있어요. 중력은 질량에 비례하지만 가속도는 중력 ÷ 질량이라 똑같이 g = 9.8 m/s²예요.',
      summary: '<ul><li><b>다중섬광 사진</b>: 0.1초마다 공의 위치를 찍어요. 간격이 점점 넓어지면 점점 빨라지는 거예요.</li><li>낙하 거리 <span class="formula">s = ½ g t²</span> (g = 9.8 m/s²)</li></ul>' +
        '<table class="mini"><tr><th>t (s)</th><th>0.1</th><th>0.2</th><th>0.3</th><th>0.4</th><th>0.5</th></tr><tr><th>s (cm)</th><td>4.9</td><td>19.6</td><td>44.1</td><td>78.4</td><td>122.5</td></tr></table>' +
        '<p class="note">구간 거리는 1 : 3 : 5 : 7 : 9 … 로 늘어요. 질량과 상관없이 가속도는 g로 같아요.</p>',
      missions: [
        {
          title: '떨어뜨리고 사진 읽기',
          goal: '두 공을 <b>떨어뜨린</b> 뒤, 사진 속 공(또는 표의 행)을 <b>3곳 이상</b> 눌러 시간마다 위치와 구간 거리를 읽어요.',
          hint: '▶ 떨어뜨리기를 누르고, 낙하가 끝나면 0.1 s, 0.2 s … 라고 적힌 곳의 공을 눌러 보세요.',
          setup() { setMode('fall'); resetFall(); showHint('▶ 떨어뜨리기를 눌러 보세요', 5000); },
          hold: 0.5,
          check: () => S.F.landed && S.read.size >= 3,
          status: () => chip3([[S.F.landed, '떨어뜨리기'], [S.read.size >= 3, '사진 읽기 ' + Math.min(3, S.read.size) + ' / 3']]),
          explain: '0.1초마다 공의 간격이 <b>4.9 → 14.7 → 24.5 → 34.3 cm</b>로 점점 넓어져요. 같은 시간 동안 더 멀리 가니 속력이 늘어나는 거예요. 그리고 두 공은 항상 <b>같은 높이</b>에 있어요.',
        },
        {
          type: 'quiz', title: '무거운 공도 같이 떨어질까?',
          goal: '5 kg 공의 중력(49 N)은 1 kg 공의 중력(9.8 N)보다 <b>5배</b> 커요. 그런데도 두 공이 같이 떨어지는 까닭은 무엇일까요?',
          setup() { setMode('fall'); },
          choices: ['무거운 공이 지구에 더 세게 끌리므로 더 빨리 떨어진다', '중력은 5배 크지만 질량도 5배라서 가속도(= 중력 ÷ 질량)가 같다', '가벼운 공은 중력을 받지 않아서 천천히 떨어진다', '두 공은 서로 끌어당겨서 같이 움직인다'],
          answer: 1,
          feedback: ['중력이 커지는 만큼 질량도 커서 움직이기 어려워요. 가속도는 중력 ÷ 질량이에요.', '', '가벼운 공도 중력을 받아요(9.8 N). 사진에서 화살표를 다시 봐요.', '두 공 사이의 끌림은 너무 작아서 낙하에 영향을 주지 않아요.'],
          explain: '가속도 = 중력 ÷ 질량이에요. 1 kg 공은 9.8 N ÷ 1 kg = 9.8 m/s², 5 kg 공은 49 N ÷ 5 kg = <b>9.8 m/s²</b>로 같아요. 그래서 공기 저항이 없으면 질량과 관계없이 같은 시간에 떨어져요.',
        },
      ],
    },
    {
      title: '수평으로 던지기: 격자 위의 두 공', short: '수평으로 던지기', icon: '➡️', phase: '분석',
      features: ['throw'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 낙하하는 공의 가속도는 질량과 관계없이 g = 9.8 m/s²이고, 중력은 항상 아래쪽이라는 것을 확인했어요.</div>' +
        '<p>이번에는 한 공은 <b>수평으로 던지고</b>, 다른 공은 같은 순간에 <b>떨어뜨려요</b>. 격자(한 칸 = 20 cm) 위에 찍은 다중섬광 사진으로 <b>수평 위치</b>와 <b>연직 위치</b>를 따로 살펴봐요.</p>',
      setup() { setMode('throw'); S.showRead = false; resetThrow(); },
      recap: '수평으로 던진 공은 수평 방향으로는 일정한 속력으로 가고, 연직 방향으로는 떨어뜨린 공과 똑같이 자유 낙하해요. 그래서 두 공은 동시에 땅에 닿아요.',
      summary: '<ul><li><b>수평 방향</b>: 힘이 없어서 속력이 일정 → 0.1초마다 같은 거리 (x = v₀ t)</li><li><b>연직 방향</b>: 중력만 작용 → 떨어뜨린 공과 같은 자유 낙하 (y = ½ g t²)</li><li>두 공은 항상 <b>같은 높이</b>에 있고 <b>동시에</b> 땅에 닿아요.</li></ul>' +
        '<table class="mini"><tr><th>t (s)</th><th>수평 x (v₀ = 2 m/s)</th><th>연직 y</th></tr><tr><td>0.2</td><td>40 cm</td><td>19.6 cm</td></tr><tr><td>0.4</td><td>80 cm</td><td>78.4 cm</td></tr></table>',
      missions: [
        {
          title: '2 m/s로 던져 보기',
          goal: '수평 속력을 <b>2.0 m/s</b>로 맞추고 <b>던지기</b>를 눌러서 두 공을 함께 찍어요.',
          hint: '슬라이더를 2.0 m/s에 맞춘 뒤 ▶ 던지기를 눌러요. 공이 땅에 닿을 때까지 지켜봐요.',
          setup() { setMode('throw'); S.showRead = false; S.v = 2; resetThrow(); showHint('수평 속력 2.0 m/s로 던져 봐요', 5000); },
          hold: 0.5,
          check: () => S.T.landed && S.T.v === 2,
          status: () => chip3([[S.v === 2, '속력 2.0 m/s'], [S.T.landed && S.T.v === 2, '던지기 완료']]),
          explain: '던진 공(주황)은 0.1초마다 <b>20 cm</b>씩 같은 간격으로 나아가고, 연직 위치는 떨어뜨린 공(파랑)과 늘 같아요. 수평 방향 속력은 변하지 않고, 아래로는 자유 낙하하기 때문이에요.',
        },
        {
          title: '격자에서 위치 읽기', manual: true,
          goal: '방금 찍은 사진에서 <b>0.4 s</b>일 때 주황 공의 <b>수평 위치</b>와 <b>낙하 거리</b>를 격자에서 읽어 적고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '격자 한 칸은 20 cm예요. 수평 위치는 왼쪽 0 cm에서부터, 낙하 거리는 위쪽 0 cm에서부터 읽어요. (오차 ±5 cm까지 괜찮아요)',
          setup() { setMode('throw'); S.showRead = true; updateCtl(); showHint('사진의 0.4 s 주황 공을 찾아 격자를 읽어요', 5200); },
          check() {
            const T = S.T;
            if (T.state === 'ready' || T.shown < 5) return '먼저 <b>던지기</b>로 사진을 찍어요. (0.4 s 사진이 나올 때까지)';
            const x = parseFloat($('#inX').value), y = parseFloat($('#inY').value);
            if (!isFinite(x) || !isFinite(y)) return '수평 위치와 낙하 거리를 모두 적어 주세요. (단위: cm)';
            const ex = 100 * T.v * 0.4, ey = sCm(0.4);
            const okx = near(x, ex, 5), oky = near(y, ey, 5);
            if (okx && oky) return true;
            if (!okx && !oky) return '둘 다 조금 달라요. 0.4 s라고 적힌 <b>주황 공</b>의 가로·세로 눈금을 다시 읽어 보세요.';
            if (!okx) return '수평 위치가 달라요. 왼쪽 <b>0 cm</b>에서 주황 공까지 가로로 몇 cm인지 읽어 보세요.';
            return '낙하 거리가 달라요. 위쪽 <b>0 cm</b>에서 공까지 세로로 몇 cm 내려왔는지 읽어 보세요.';
          },
          explain: '수평 위치는 <b>x = v₀ t</b> = 2.0 m/s × 0.4 s = 0.80 m = <b>80 cm</b>, 낙하 거리는 <b>y = ½ g t²</b> = ½ × 9.8 × 0.4² = 0.784 m ≈ <b>78 cm</b>예요. 수평과 연직을 따로 나누어 보면 각각 간단한 식으로 나타낼 수 있어요.',
        },
        {
          type: 'quiz', title: '왜 동시에 땅에 닿을까?',
          goal: '던진 공과 떨어뜨린 공이 <b>동시에</b> 땅에 닿는 까닭은 무엇일까요?',
          setup() { setMode('throw'); S.showRead = false; updateCtl(); },
          choices: ['던진 공은 수평으로 힘을 받아 아래로 느리게 떨어지므로', '두 공 모두 연직 방향으로는 중력만 받아 같은 자유 낙하를 하므로', '던진 공이 더 멀리 가서 땅이 더 낮아지므로', '수평으로 던진 공은 중력을 받지 않으므로'],
          answer: 1,
          feedback: ['수평 속력은 아래로 떨어지는 운동에 영향을 주지 않아요. 사진에서 두 공의 높이가 늘 같았어요.', '', '땅은 평평해서 높이가 같아요. 중요한 것은 연직 방향의 운동이에요.', '던진 공도 중력을 받아요. 그래서 곡선을 그리며 떨어져요.'],
          explain: '수평 방향에는 힘이 없어 속력이 일정하고, 연직 방향에는 두 공 모두 <b>중력</b>(지구 중심 방향)만 작용해요. 연직 방향의 운동이 같으니 같은 높이에서 출발하면 <b>동시에</b> 땅에 닿아요.',
        },
      ],
    },
    {
      title: '두 운동 비교: 속력과 속도 성분', short: '두 운동 비교', icon: '📐', phase: '탐구',
      features: ['compare'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수평으로 던진 공은 수평으로는 일정한 속력, 연직으로는 자유 낙하를 한다는 것을 알았어요.</div>' +
        '<p>이제 <b>높이 19.6 m 절벽</b>에서 속력을 바꿔 가며 던져 봐요. 속력이 달라지면 <b>낙하 시간</b>과 <b>도달 거리</b>는 어떻게 달라질까요? 속도를 수평 성분과 연직 성분으로 나눠서 봐요.</p>',
      setup() { setMode('compare'); S.showPred = false; Object.assign(S.C, { state: 'ready', t: 0, landed: false }); updateCtl(); },
      recap: '낙하 시간은 속력과 관계없이 같고(t = √(2h ÷ g) = 2.0 s), 도달 거리만 x = v₀ × t로 속력에 비례해요. 속도의 수평 성분은 일정, 연직 성분은 g t씩 늘어요.',
      summary: '<table class="mini"><tr><th>수평 속력 v₀</th><th>낙하 시간 t</th><th>도달 거리 x</th></tr><tr><td>1 m/s</td><td>2.0 s</td><td>2 m</td></tr><tr><td>2 m/s</td><td>2.0 s</td><td>4 m</td></tr><tr><td>3 m/s</td><td>2.0 s</td><td>6 m</td></tr><tr><td>4 m/s</td><td>2.0 s</td><td>8 m</td></tr></table>' +
        '<ul><li>낙하 시간 <span class="formula">t = √(2h ÷ g)</span> = √(2 × 19.6 ÷ 9.8) = 2.0 s</li><li>속도: 수평 성분 vₓ = v₀ (일정), 연직 성분 v_y = g t (증가)</li><li>중력 가속도는 항상 지구 중심(아래) 방향이에요.</li></ul>',
      missions: [
        {
          title: '속력을 바꿔 던지기',
          goal: '수평 속력 <b>1, 2, 3 m/s</b>로 한 번씩 던져서 낙하 시간과 도달 거리를 기록해요.',
          hint: '1 m/s, 2 m/s, 3 m/s 버튼을 차례로 고르고 ▶ 던지기를 누르세요. 공이 땅에 닿으면 표에 기록돼요.',
          setup() { setMode('compare'); S.showPred = false; updateCtl(); showHint('속력을 바꿔 가며 던져 보세요', 5000); },
          hold: 0.5,
          check: () => !!(S.cres[1] && S.cres[2] && S.cres[3]),
          status: () => chip3([[!!S.cres[1], '1 m/s'], [!!S.cres[2], '2 m/s'], [!!S.cres[3], '3 m/s']]),
          explain: '속력이 달라도 낙하 시간은 모두 <b>2.0 s</b>예요. 도달 거리만 2 m, 4 m, 6 m로 속력에 비례해서 늘어요. 낙하 시간은 연직 방향의 자유 낙하가 결정하기 때문이에요.',
        },
        {
          title: '4 m/s일 때 예측하기', manual: true,
          goal: '수평 속력 <b>4 m/s</b>로 던진다면 낙하 시간과 도달 거리는 얼마일까요? 계산해서 적고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '낙하 시간은 속력과 관계없이 앞에서 본 값과 같아요. 도달 거리는 x = v₀ × t로 구해요.',
          setup() { setMode('compare'); delete S.cres[4]; S.predOK = false; S.showPred = true; $('#inT').value = ''; $('#inD').value = ''; updateCtl(); },
          check() {
            const t = parseFloat($('#inT').value), x = parseFloat($('#inD').value);
            if (!isFinite(t) || !isFinite(x)) return '낙하 시간(s)과 도달 거리(m)를 모두 적어 주세요.';
            const okt = near(t, 2.0, 0.1), okx = near(x, 8.0, 0.3);
            if (okt && okx) { S.predOK = true; return true; }
            if (okx && !okt) return '도달 거리는 맞지만 낙하 시간이 달라요. 속력이 달라져도 낙하 시간은 변하지 않아요.';
            if (okt && !okx) return '낙하 시간은 맞아요! 도달 거리는 <b>x = v₀ × t</b>로 구해요.';
            return '표를 다시 보세요. 낙하 시간은 모두 같고, 도달 거리는 속력에 비례해서 2 m, 4 m, 6 m로 늘었어요.';
          },
          explain: '낙하 시간은 속력과 관계없이 <b>t = √(2h ÷ g) = 2.0 s</b>예요. 그래서 4 m/s로 던지면 x = 4 m/s × 2.0 s = <b>8 m</b>예요. 던져서 확인해 봐도 좋아요!',
        },
        {
          type: 'quiz', title: '빠르게 던지면 늦게 떨어질까?',
          goal: '더 <b>빠르게</b> 던질수록 공이 땅에 닿는 시간은 어떻게 될까요?',
          setup() { setMode('compare'); S.showPred = false; updateCtl(); },
          choices: ['속력이 클수록 오래 날아가서 늦게 떨어진다', '속력이 달라도 낙하 시간은 같고, 더 멀리 떨어진다', '속력이 클수록 중력이 약해져서 천천히 떨어진다', '수평 속력이 0일 때 가장 빨리 떨어진다'],
          answer: 1,
          feedback: ['오래 날아가는 것이 아니라 더 멀리 가는 거예요. 표에서 낙하 시간은 모두 2.0 s였어요.', '', '수평 속력은 중력의 크기를 바꾸지 못해요. 중력 가속도는 늘 9.8 m/s²예요.', '수평 속력이 0이면 자유 낙하인데, 이때도 낙하 시간은 2.0 s로 같아요.'],
          explain: '연직 방향 운동은 수평 속력과 상관없이 <b>자유 낙하</b>예요. 그래서 수평 속력이 0이든 4 m/s이든 낙하 시간은 같고, <b>도달 거리</b>만 속력에 비례해서 커져요.',
        },
      ],
    },
    {
      title: '여러 천체: 중력이 다르면?', short: '여러 천체', icon: '🪐', phase: '적용',
      features: ['planet'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 낙하 시간은 t = √(2h ÷ g)로 정해지고, 수평 속력은 도달 거리만 바꾼다는 것을 알았어요.</div>' +
        '<p>중력 가속도 g가 다른 <b>달(1.6) · 화성(3.7) · 지구(9.8) · 목성(24.8 m/s²)</b>에서 같은 실험을 해 봐요. 그리고 같은 힘으로 뛰어오르면 얼마나 높이 올라갈지 <b>가상 점프 체험</b>도 해 봐요.</p>',
      setup() { setMode('planet'); },
      recap: '달에도 중력이 작용해요. g가 작을수록 낙하 시간이 길어서 같은 수평 속력으로 던져도 더 멀리 가고, 같은 속력으로 뛰면 더 높이 올라가요.',
      summary: '<table class="mini"><tr><th>천체</th><th>g (m/s²)</th><th>낙하 시간 (19.6 m)</th><th>3 m/s 던진 공</th></tr><tr><td>달</td><td>1.6</td><td>4.9 s</td><td>약 15 m</td></tr><tr><td>화성</td><td>3.7</td><td>3.3 s</td><td>약 10 m</td></tr><tr><td>지구</td><td>9.8</td><td>2.0 s</td><td>약 6 m</td></tr><tr><td>목성</td><td>24.8</td><td>1.3 s</td><td>약 4 m</td></tr></table>' +
        '<ul><li>우주(달)에도 중력이 있어요. 달의 g는 지구의 약 1/6이에요.</li><li>점프 최고 높이 h = v² ÷ 2g (3.0 m/s: 달 2.8 m, 지구 0.5 m)</li></ul>',
      missions: [
        {
          title: '네 천체에서 실험하기',
          goal: '달 · 화성 · 지구 · 목성에서 <b>놓고 던지기</b>를 한 번씩 하고, <b>점프 체험</b>도 한 번 해 봐요.',
          hint: '천체를 고르고 ▶ 놓고 던지기를 눌러요. 네 천체를 모두 마치면 🦘 점프 체험으로 바꿔서 ▶ 점프!를 눌러요.',
          setup() { S.pres = {}; S.jumpAny = false; Object.assign(S.P, { state: 'ready', t: 0, landed: false }); setMode('planet'); showHint('천체를 바꿔 가며 실험해 보세요', 5000); },
          hold: 0.5,
          check: () => BODIES.every((b) => S.pres[b.id]) && S.jumpAny,
          status: () => chip3(BODIES.map((b) => [!!S.pres[b.id], b.name]).concat([[S.jumpAny, '점프 체험']])),
          explain: '낙하 시간 <b>t = √(2h ÷ g)</b>는 g가 작을수록 길어요. 달에서는 약 4.9 s, 지구에서는 2.0 s, 목성에서는 1.3 s예요. 같은 처음 속력으로 뛰어도 g가 작은 달에서는 최고 높이 h = v² ÷ 2g가 지구의 약 6배예요.',
        },
        {
          type: 'quiz', title: '달에서도 중력이 작용할까?',
          goal: '달에서 놓은 공도 아래로 떨어졌어요. 그 까닭은 무엇일까요?',
          setup() { setMode('planet'); },
          choices: ['우주에는 중력이 없으므로 공이 저절로 천천히 내려오는 것이다', '달에도 중력이 작용하기 때문이다. 지구의 약 1/6일 뿐이다', '달에는 공기가 없어서 공이 밑으로 빨려 내려가는 것이다', '달의 땅이 자석처럼 공을 끌어당기는 것이다'],
          answer: 1,
          feedback: ['우주라고 해서 중력이 없는 것은 아니에요. 천체 가까이에는 그 천체의 중력이 작용해요.', '', '공기가 없는 것과 아래로 떨어지는 것은 관계없어요. 중력 때문에 떨어져요.', '자기력이 아니라 달의 중력이에요. 질량이 있는 물체끼리는 서로 당겨요.'],
          explain: '달도 질량이 있는 천체라서 <b>중력</b>이 작용해요. 달의 중력 가속도 1.6 m/s²는 지구(9.8)의 약 <b>1/6</b>이에요. 달에서도 공은 <b>달 중심 방향</b>으로 가속하며 떨어져요.',
        },
        {
          type: 'quiz', title: '달에서는 왜 더 멀리 갈까?',
          goal: '같은 3 m/s로 던졌는데 달에서 던진 공이 지구보다 <b>훨씬 멀리</b> 간 까닭은 무엇일까요?',
          setup() { setMode('planet'); },
          choices: ['달에서는 수평 속력이 더 빨라지기 때문이다', '달에서는 낙하 시간이 길어서 수평으로 더 오래 움직이기 때문이다', '달에서는 공이 중력을 받지 않아 계속 날아가기 때문이다', '달의 하늘에는 공기가 없어서 공이 위로 올라가기 때문이다'],
          answer: 1,
          feedback: ['수평 속력은 처음 값 3 m/s 그대로예요. 달라진 것은 떨어지는 시간이에요.', '', '달에서도 공은 땅에 떨어져요. 중력은 작용하지만 지구보다 약해요.', '공은 위로 올라가지 않아요. 아래로 천천히 가속하며 떨어져요.'],
          explain: '수평 거리는 <b>x = v₀ × t</b>예요. 달은 g가 작아서 낙하 시간 t가 약 4.9 s로 길어요. 수평 속력이 같아도 더 오래 움직이니 약 15 m나 멀리 가요(지구는 약 6 m).',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-gravity-motion', mount: '#game', badge: '낙하 운동 박사', homeHref: '../../index.html#h1a',
    featureLabels: { fall: '📸 다중섬광 사진 · 측정표', throw: '➡️ 수평 속력 슬라이더 · 격자 사진', compare: '📐 속도 성분 화살표 · 기록표', planet: '🪐 천체 선택 · 🦘 점프 체험' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    stepFall(dt); stepThrow(dt); stepCliff(S.C, dt, 'compare'); stepCliff(S.P, dt, 'planet'); stepJump(dt); parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eef2f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'fall') drawFall(t);
    else if (S.mode === 'throw') drawThrow(t);
    else if (S.mode === 'compare') { drawCliff(S.C, { id: 'earth', name: '지구', g: G, sky: BD.earth.sky, gnd: BD.earth.gnd, gnd2: BD.earth.gnd2 }, 'compare', t); drawCompareInfo(t); }
    else if (S.mode === 'planet') { const b = BD[S.body]; drawCliff(S.P, Object.assign({ id: b.id }, b), 'planet', t); drawPlanetInfo(t); }
    else drawJump(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setMode, setBody, setCv, updateCtl, fallGeo, TG, cliffGeo,
    quick(kind, v) {   // 결과를 바로 만들어 줌 (테스트용)
      if (kind === 'fall') { Object.assign(S.F, { state: 'done', t: T_LAND2, shown: 7, landed: true }); S.fallDone++; }
      if (kind === 'throw') { Object.assign(S.T, { state: 'done', t: T_LAND2, shown: 7, v: v == null ? S.v : v, landed: true }); S.throwRuns.add(S.T.v); }
      if (kind === 'compare') { S.cres[v] = { t: 2, x: 2 * v }; }
      if (kind === 'planet') { S.pres[BD[S.body].id] = { t: tFall(BD[S.body].g), x: V_PLANET * tFall(BD[S.body].g) }; }
      if (kind === 'jump') { S.jumpAny = true; }
      updateCtl();
    },
  };
})();
