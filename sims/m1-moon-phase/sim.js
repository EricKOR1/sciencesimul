/* =========================================================
   중1 Ⅶ. 태양계 - 달의 위상 변화  [9과07-04]
   탐구 흐름(4단계):
   ① 관찰: 한 달 동안 달의 모양(음력 관측 기록장)
   ② 모형: 햇빛을 받는 달 — 태양 쪽 절반이 밝고, 지구에서는 지구 쪽 절반만 보임
   ③ 설명: 공전 위치와 위상 — 삭·상현·망·하현, 초승달 / 지구 그림자 오개념
   ④ 적용: 음력 날짜와 관측 시각·방향
   θ : 지구→태양 방향을 0°로 하여 시계 반대 방향(공전 방향)으로 잰 달의 위치 각
       지구에서 밝게 보이는 부분 = (1 − cos θ) / 2
   (일식·월식은 다음 차시 m1-eclipse에서 다룹니다)
   ========================================================= */
(function () {
  'use strict';
  const { $, Sound, clamp } = SciSim;
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;

  const R = 195, RE = 20, RM = 10;          // 궤도 반지름, 지구·달 반지름 (가상 좌표, 실제 비율과 다름)
  const SPOTS = [45, 135, 225, 315];         // 2단계: 달을 옮겨 볼 자리
  const SPOT_TOL = 25;
  const FIVE = ['wxc', 'fq', 'full', 'lq', 'wnc'];
  const FOUR = ['new', 'fq', 'full', 'lq'];

  const S = {
    theta: 0, playing: false, ghost: false,
    day: 3, obs: new Set([3]), found: new Set(), logFound: false,   // 1단계: 관측 기록장
    dragging: false, target: null, interacted: false,
    spots: false, visit: new Set(),                                 // 2단계
    four: false, made: new Set(), holdKey: null, holdT: 0,          // 3단계
  };
  S.thV = S.theta; S.dayV = 0;               // 화면에 그리는 각(실제 값을 부드럽게 따라가요)
  S.lift = new SciSim.Spring(1, { stiffness: 230, damping: 14 });   // 달을 집어 올리는 느낌
  S.calT = {}; S.spotT = {}; S.selC = 2; S.selR = 0; S.nameT = null; S.nameKey = '';

  let FEAT = new Set();          // 열린 도구
  const on = (f) => FEAT.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);
  const modelOn = () => on('model');
  const ghostOn = () => on('marks') && S.ghost;

  const norm = (a) => ((a % 360) + 360) % 360;
  const signed = (a) => { a = norm(a); return a > 180 ? a - 360 : a; };
  const litFrac = (th) => (1 - Math.cos(th * DEG)) / 2;
  const lunarDay = (th) => Math.floor(norm(th) / 360 * 29.5) + 1;
  const dayTheta = (d) => norm((d - 0.5) / 29.5 * 360);      // 음력 d일 무렵 달의 위치 (lunarDay의 역)
  const inArc = (th, lo, hi) => Math.abs(signed(th - (lo + hi) / 2)) <= (hi - lo) / 2;
  const spotAt = (th) => SPOTS.findIndex((a) => Math.abs(signed(th - a)) <= SPOT_TOL);
  const curTheta = () => (modelOn() ? S.theta : dayTheta(S.day));

  /* ---------- 애니메이션 도구 (anim.js) ---------- */
  const REDUCE = !!SciSim.reduceMotion;
  const approach = SciSim.approach;
  const ease = SciSim.ease;
  const _dm = new WeakMap();
  const Dof = (ctx) => { let d = _dm.get(ctx); if (!d) { d = SciSim.draw(ctx); _dm.set(ctx, d); } return d; };
  const _sh = {};
  const shd = (c, a) => _sh[c + a] || (_sh[c + a] = SciSim.color.shade(c, a));
  const C_EARTH = ['#9bd6ff', '#2f86e0', '#10366f'];
  const C_MOON = ['#56628a', '#343c58', '#12172b'];
  const WIN_COLORS = ['#ffd36b', '#5eead4', '#fff7d6', '#a5b4fc', '#fda4af'];
  /* 빛이 (lx, ly) 방향에서 오는 공 (기본: 오른쪽 = 태양 쪽) */
  function litSphere(ctx, x, y, r, c, lx, ly) {
    if (lx == null) { lx = 0.8; ly = -0.25; }
    const g = ctx.createRadialGradient(x + lx * r * 0.5, y + ly * r * 0.5, r * 0.06, x, y, r * 1.04);
    g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  const angApproach = (cur, target, dt, rate) => norm(cur + signed(target - cur) * (1 - Math.exp(-rate * dt)));
  const popT = (t0, dur) => (t0 == null || REDUCE ? 1 : Math.max(0, (SciSim.time() - t0) / (dur || 0.45)));

  /* 성공 효과: 터지는 반짝임 + 체크 표시 (화면 배치마다 따로 가지고 있음) */
  function fxBurst(posFn, o) {
    views.forEach(({ L }) => {
      const p = posFn(L);
      if (p) L.fx.burst(p.x, p.y, Object.assign({ count: 22, colors: WIN_COLORS, speed: 170, size: 3.6, gravity: 120, life: 0.9 }, o));
    });
  }
  function winPop(posFn) {
    views.forEach(({ L }) => { const p = posFn(L); if (p) L.win = { x: p.x, y: p.y, t: 0 }; });
  }
  function drawWin(ctx, L) {
    const w = L.win;
    if (!w) return;
    const k = REDUCE ? 1 : clamp(w.t / 0.45, 0, 1), s = ease.outBack(k), a = w.t > 1.5 ? 1 - (w.t - 1.5) / 0.5 : 1, sz = Math.max(0.5, 17 * L.fs * s);
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    Dof(ctx).glow(w.x, w.y, sz * 2.3, '#34d399', 0.4).check(w.x, w.y, sz, clamp(w.t / 0.35, 0, 1));
    ctx.restore();
  }
  function fxStep(dt) {
    views.forEach(({ L }) => { L.fx.update(dt); if (L.win) { L.win.t += dt; if (L.win.t > 2.1) L.win = null; } });
  }
  /* 미션 성공 순간 감지 (공통 엔진에는 성공 알림이 없어 phase로 알아냄) */
  let _wp = '', _wi = -1;
  function watchGame(onWin) {
    if (!game) return;
    const ph = game.phase, idx = game.index;
    if (ph === 'success' && (_wp !== 'success' || _wi !== idx)) onWin();
    _wp = ph; _wi = idx;
  }

  /* ---------- 위상 이름 · 모양 · 관측 ---------- */
  const PH = {
    new:  { name: '삭', short: '삭', look: '달이 보이지 않아요', sky: '태양과 함께 떠서 보이지 않아요' },
    wxc:  { name: '초승달', short: '초승달', look: '오른쪽이 가늘게 밝아요', sky: '초저녁 서쪽 하늘에서 보여요' },
    fq:   { name: '상현달', short: '상현달', look: '오른쪽 반이 밝아요', sky: '초저녁 남쪽 하늘에서 보여요' },
    wxg:  { name: '볼록한 달', short: '볼록한 달', look: '상현달과 보름달 사이', sky: '초저녁 남동쪽 하늘에서 보여요' },
    full: { name: '보름달 (망)', short: '보름달', look: '둥근 면 전체가 밝아요', sky: '초저녁 동쪽에서 떠서 밤새 보여요' },
    wng:  { name: '볼록한 달', short: '볼록한 달', look: '보름달과 하현달 사이', sky: '새벽 남서쪽 하늘에서 보여요' },
    lq:   { name: '하현달', short: '하현달', look: '왼쪽 반이 밝아요', sky: '새벽 남쪽 하늘에서 보여요' },
    wnc:  { name: '그믐달', short: '그믐달', look: '왼쪽이 가늘게 밝아요', sky: '새벽 동쪽 하늘에서 보여요' },
  };
  function phaseKey(th) {
    th = norm(th);
    if (th < 12 || th >= 348) return 'new';
    if (th < 75) return 'wxc';
    if (th <= 105) return 'fq';
    if (th < 165) return 'wxg';
    if (th <= 195) return 'full';
    if (th < 255) return 'wng';
    if (th <= 285) return 'lq';
    return 'wnc';
  }

  /* ---------- 화면 배치 ----------
     wide: 태블릿 — 왼쪽 [관측 기록장 / 위에서 본 모형], 오른쪽 '지구에서 본 달' 창
     tall: 휴대폰 — 위아래로 쌓음 */
  const LAYOUTS = {
    wide: { vw: 800, vh: 600, fs: 1, col: true, main: { x: 0, y: 0, w: 540, h: 600 }, cx: 266, cy: 302, panel: { x: 548, y: 8, w: 244, h: 584 } },
    tall: { vw: 520, vh: 846, fs: 1.2, col: false, main: { x: 0, y: 0, w: 520, h: 540 }, cx: 250, cy: 270, panel: { x: 8, y: 548, w: 504, h: 290 } },
  };
  function panelGeo(L) {
    const P = L.panel;
    if (L.col) {
      const cx = P.x + P.w / 2;
      return {
        tx: cx, ty: P.y + 28, sy: P.y + 48, align: 'center',
        dx: cx, dy: P.y + 148, dr: 64,
        nx: cx, ny: P.y + 266, n2y: P.y + 292, dateY: P.y + 320,
        barX: P.x + 20, barW: P.w - 40, barLabelY: P.y + 352, barY: P.y + 360,
        capY: P.y + 410, strip: [0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ x: cx - 81 + (k % 4) * 54, y: P.y + (k < 4 ? 448 : 524) })), sr: 15, labDy: 33,
        qbox: { x: P.x + 12, y: P.y + 392, w: P.w - 24, h: 180 },
        textX: P.x + 10, textW: P.w - 20,
      };
    }
    const x0 = P.x + 180;
    return {
      tx: P.x + 16, ty: P.y + 30, sy: P.y + 52, align: 'left',
      dx: P.x + 90, dy: P.y + 142, dr: 60,
      nx: x0, ny: P.y + 100, n2y: P.y + 126, dateY: P.y + 152,
      barX: x0, barW: 160, barLabelY: null, barY: P.y + 166,
      capY: null, strip: [0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ x: P.x + 38 + k * 61, y: P.y + 236 })), sr: 16, labDy: 38,
      qbox: { x: x0 - 8, y: P.y + 192, w: P.x + P.w - x0 - 4, h: 88 },
      textX: x0 - 8, textW: P.x + P.w - x0,
    };
  }
  function calGeo(L) {
    const M = L.main;
    if (L.col) return { x0: M.x + 14, y0: M.y + 70, cw: (M.w - 28) / 7, ch: (M.h - 70 - 46) / 5, ty: M.y + 27, sy: M.y + 49, fy: M.y + M.h - 16 };
    return { x0: M.x + 10, y0: M.y + 80, cw: (M.w - 20) / 7, ch: (M.h - 80 - 40) / 5, ty: M.y + 30, sy: M.y + 56, fy: M.y + M.h - 12 };
  }

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeStars(rect, n, seed) {
    const r = rng(seed), a = [];
    for (let i = 0; i < n; i++) a.push({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, s: 0.5 + r() * 1.1, p: r() * TAU, k: 0.6 + r() * 1.8 });
    return a;
  }

  /* ---------- 그리기 도우미 ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  const fnt = (L, px, weight) => (weight ? weight + ' ' : '') + Math.round(px * L.fs) + 'px ' + FONT;
  function pillWidth(ctx, text, o) { ctx.font = o.font; return ctx.measureText(text).width + (o.pad || 9) * 2; }
  function pill(ctx, text, x, y, o) {
    o = o || {};
    ctx.font = o.font || 'bold 13px ' + FONT;
    const w = ctx.measureText(text).width, h = o.h || 22, pad = o.pad || 9;
    const bx = o.align === 'left' ? x : o.align === 'right' ? x - w - pad * 2 : x - w / 2 - pad;
    ctx.fillStyle = o.bg || 'rgba(6,10,26,.78)';
    roundRect(ctx, bx, y - h / 2, w + pad * 2, h, h / 2); ctx.fill();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + pad, y + 0.5);
    ctx.textBaseline = 'alphabetic';
    return bx + w + pad * 2;
  }
  // 줄바꿈 글자 (한 줄 너비를 넘으면 낱말 단위로 줄을 나눔)
  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '', yy = y;
    words.forEach((w) => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
      else line = test;
    });
    if (line) ctx.fillText(line, x, yy);
    return yy;
  }
  function sunIcon(ctx, x, y, r) {
    ctx.save();
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35); ctx.lineTo(x + Math.cos(a) * r * 1.85, y + Math.sin(a) * r * 1.85); ctx.stroke();
    }
    circle(ctx, x, y, r); ctx.fillStyle = '#ffd36b'; ctx.fill();
    ctx.restore();
  }
  function starShape(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function checkMark(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.12, y + s * 0.4); ctx.lineTo(x + s * 0.55, y - s * 0.4); ctx.stroke();
  }
  function drawStars(ctx, stars, t, alpha) {
    ctx.fillStyle = '#dfe8ff';
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i], tw = REDUCE ? 0.5 : 0.5 + 0.5 * Math.sin(t * s.k + s.p);
      ctx.globalAlpha = alpha * (0.32 + 0.55 * tw);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.s * 0.7, 0, TAU); ctx.fill();
      if (s.s > 1.4) {   // 밝은 별: 십자 모양으로 반짝여요
        const g = (0.4 + 0.6 * tw) * 3.6;
        ctx.globalAlpha = alpha * 0.5 * tw;
        ctx.fillRect(s.x - g, s.y - 0.4, g * 2, 0.8); ctx.fillRect(s.x - 0.4, s.y - g, 0.8, g * 2);
      }
    }
    ctx.globalAlpha = 1;
  }
  // 우주 배경: 은은한 성운 + 반짝이는 별 (별 위치는 seed로 고정)
  function spaceBg(ctx, L, M, cx, cy, t) {
    const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, 340);
    bg.addColorStop(0, '#17264f'); bg.addColorStop(0.6, '#0e1838'); bg.addColorStop(1, '#070d1f');
    ctx.fillStyle = bg; ctx.fillRect(M.x, M.y, M.w, M.h);
    const D = Dof(ctx);
    D.glow(M.x + M.w * 0.16, M.y + M.h * 0.84, 190, '#7c5cff', 0.13);
    D.glow(M.x + M.w * 0.5, M.y + M.h * 0.08, 170, '#2dd4bf', 0.07);
    drawStars(ctx, L.starsMain, t, 1);
  }
  // 새로 열린 도구 강조
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  function newTag(ctx, L, rx, ty) {
    ctx.font = fnt(L, 13, 'bold');
    const tw = ctx.measureText('NEW').width + 16, th = Math.round(22 * L.fs);
    ctx.fillStyle = '#0ea5e9'; roundRect(ctx, rx - tw, ty, tw, th, th / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NEW', rx - tw / 2, ty + th / 2 + 0.5); ctx.textBaseline = 'alphabetic';
  }
  function newRing(ctx, L, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56,189,248,' + (0.5 + pulse() * 0.45) + ')'; ctx.lineWidth = 4;
    roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 14); ctx.stroke();
    if (!REDUCE) {   // 바깥으로 퍼지는 물결
      const k = (performance.now() / 1000 * 1.1) % 1, e = 4 + k * 12;
      ctx.strokeStyle = 'rgba(56,189,248,' + 0.55 * (1 - k) + ')'; ctx.lineWidth = 3;
      roundRect(ctx, x - e, y - e, w + e * 2, h + e * 2, 14 + e); ctx.stroke();
    }
    newTag(ctx, L, x + w - 6, Math.max(0, y - Math.round(11 * L.fs)));   // 테두리 위에 걸쳐서 (제목을 가리지 않게)
    ctx.restore();
  }
  function newRingCircle(ctx, L, x, y, r) {
    ctx.save();
    Dof(ctx).ring(x, y, r + 2 * pulse(), REDUCE ? 0 : performance.now() / 1000, { color: '#38bdf8', width: 4, speed: 1.1 });
    newTag(ctx, L, x + r * 0.71 + 40 * L.fs, y - r * 0.71 - 12 * L.fs);
    ctx.restore();
  }

  /* 지구에서 본 달의 모양: 원점 기준, 오른쪽이 밝은 경우의 밝은 영역 (t: 0~180°) */
  function litPath(ctx, r, t) {
    const c = Math.cos(t * DEG), a = Math.max(0.001, r * Math.abs(c));
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    if (c >= 0) ctx.ellipse(0, 0, a, r, 0, Math.PI / 2, -Math.PI / 2, true);
    else ctx.ellipse(0, 0, a, r, 0, Math.PI / 2, Math.PI * 1.5, false);
    ctx.closePath();
  }
  const CRATERS = [[-0.36, -0.3, 0.17], [0.28, 0.36, 0.13], [0.42, -0.22, 0.1], [-0.08, 0.52, 0.09], [-0.52, 0.22, 0.12], [0.06, -0.06, 0.08], [0.2, -0.55, 0.07]];
  function drawPhase(ctx, x, y, r, th, o) {
    o = o || {};
    th = norm(th);
    const waxing = th <= 180, t = waxing ? th : 360 - th, side = waxing ? 1 : -1, dk = o.dark || '#262d40';
    // 어두운 쪽도 은은하게 입체감 (지구에서 반사된 빛)
    const dg = ctx.createRadialGradient(x + side * r * 0.3, y - r * 0.1, r * 0.1, x, y, r * 1.02);
    dg.addColorStop(0, shd(dk, 0.2)); dg.addColorStop(1, shd(dk, -0.4));
    ctx.fillStyle = dg; circle(ctx, x, y, r); ctx.fill();
    if (t > 0.4) {
      ctx.save(); ctx.translate(x, y); if (!waxing) ctx.scale(-1, 1);
      litPath(ctx, r, t);
      const g = ctx.createRadialGradient(r * 0.3, -r * 0.3, r * 0.08, 0, 0, r * 1.05);
      g.addColorStop(0, '#fffef6'); g.addColorStop(0.6, '#f6e6a8'); g.addColorStop(1, '#d9bf6c');
      ctx.fillStyle = g; ctx.fill();
      ctx.clip();
      // 밝은 부분과 어두운 부분의 경계는 부드럽게
      const c = Math.cos(t * DEG), a = r * Math.abs(c), x0 = c >= 0 ? a : -a;
      const tg = ctx.createLinearGradient(x0, 0, x0 + (r - x0) * 0.6, 0);
      tg.addColorStop(0, 'rgba(120,92,30,.4)'); tg.addColorStop(1, 'rgba(120,92,30,0)');
      ctx.fillStyle = tg; ctx.fillRect(-r, -r, r * 2, r * 2);
      if (o.craters) {
        if (!waxing) ctx.scale(-1, 1);
        ctx.fillStyle = 'rgba(150,128,80,.2)';
        CRATERS.forEach((cr) => { circle(ctx, cr[0] * r, cr[1] * r, cr[2] * r); ctx.fill(); });
        ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
        CRATERS.forEach((cr) => { ctx.beginPath(); ctx.arc(cr[0] * r, cr[1] * r, cr[2] * r, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke(); });
      }
      ctx.restore();
    }
    circle(ctx, x, y, r);
    ctx.strokeStyle = 'rgba(190,205,240,.38)'; ctx.lineWidth = o.mini ? 1 : 1.5; ctx.stroke();
  }
  /* 위에서 본 달: 태양 쪽(오른쪽) 반이 항상 밝음. lift > 1이면 들어 올린 느낌(빛무리) */
  function drawMoonTop(ctx, x, y, r, alpha, lift) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    if (lift > 1.03) Dof(ctx).glow(x, y, r * 2.6, '#fff3c0', Math.min(0.5, (lift - 1) * 0.8));
    litSphere(ctx, x, y, r, C_MOON, 0.9, -0.1);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.clip();
    const g = ctx.createRadialGradient(x + r * 0.45, y - r * 0.3, r * 0.05, x + r * 0.1, y, r * 1.05);
    g.addColorStop(0, '#fffef4'); g.addColorStop(0.65, '#f7e7ab'); g.addColorStop(1, '#d9bf6c');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const tg = ctx.createLinearGradient(x, 0, x + r * 0.75, 0);
    tg.addColorStop(0, 'rgba(110,84,24,.45)'); tg.addColorStop(1, 'rgba(110,84,24,0)');
    ctx.fillStyle = tg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
    circle(ctx, x, y, r); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.restore();
  }
  /* 지구: 오른쪽(태양 쪽)이 낮, 왼쪽이 밤. 북극 위에서 본 모습이라 대륙이 천천히 돌아요 */
  function drawEarth(ctx, L, x, y, r, t) {
    const D = Dof(ctx);
    D.glow(x, y, r * 2.2, '#6cb8ff', 0.4);
    litSphere(ctx, x, y, r, C_EARTH);
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    ctx.translate(x, y); ctx.rotate(REDUCE ? 0.6 : (t || 0) * 0.28);
    ctx.fillStyle = '#3fae6a';
    [[0.35, -0.45, 0.32, 0.22], [-0.3, 0.35, 0.36, 0.2], [0.5, 0.45, 0.2, 0.16], [-0.55, -0.35, 0.22, 0.14]].forEach((c) => {
      ctx.beginPath(); ctx.ellipse(c[0] * r, c[1] * r, c[2] * r, c[3] * r, 0.5, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(0.1 * r, -0.05 * r, 0.3 * r, 0.06 * r, 0.4, 0, TAU); ctx.fill();   // 구름
    ctx.rotate(REDUCE ? -0.6 : -(t || 0) * 0.28); ctx.translate(-x, -y);
    const sh = ctx.createRadialGradient(x + r * 0.45, y - r * 0.25, r * 0.1, x, y, r * 1.05);
    sh.addColorStop(0, 'rgba(255,255,255,.2)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,10,40,.4)');
    ctx.fillStyle = sh; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const ng = ctx.createLinearGradient(x - r, 0, x + 3, 0);   // 밤 쪽
    ng.addColorStop(0, 'rgba(3,7,22,.84)'); ng.addColorStop(0.86, 'rgba(3,7,22,.7)'); ng.addColorStop(1, 'rgba(3,7,22,0)');
    ctx.fillStyle = ng; ctx.fillRect(x - r - 1, y - r - 1, r + 4, r * 2 + 2);
    ctx.restore();
    circle(ctx, x, y, r); ctx.strokeStyle = 'rgba(200,225,255,.55)'; ctx.lineWidth = 1; ctx.stroke();
    const fs = Math.round(13 * L.fs);
    D.text(x + r * 0.5, y + 1, '낮', { size: fs, color: '#06325f', stroke: 'rgba(255,255,255,.55)', strokeWidth: 3, baseline: 'middle' });
    D.text(x - r * 0.5, y + 1, '밤', { size: fs, color: '#d4defc', stroke: 'rgba(3,7,22,.6)', strokeWidth: 3, baseline: 'middle' });
  }

  /* ---------- ① 관측 기록장 (음력 달력) ---------- */
  function drawCalendar(ctx, L, t) {
    const M = L.main, G = calGeo(L), fs = L.fs;
    ctx.save();
    ctx.beginPath(); ctx.rect(M.x, M.y, M.w, M.h); ctx.clip();
    spaceBg(ctx, L, M, M.x + M.w / 2, M.y + M.h / 2, t);
    ctx.textAlign = 'left'; ctx.fillStyle = '#e6eeff'; ctx.font = fnt(L, 16, 'bold');
    ctx.fillText('📅 달 관측 기록장 (음력)', G.x0 + 2, G.ty);
    ctx.font = fnt(L, 13); ctx.fillStyle = 'rgba(212,226,255,.75)';
    ctx.fillText('같은 시각, 같은 장소에서 날마다 관측한 달의 모양', G.x0 + 2, G.sy);
    const r = Math.min(G.cw, G.ch) * 0.27;
    for (let d = 1; d <= 30; d++) {
      const i = d - 1, x = G.x0 + (i % 7) * G.cw, y = G.y0 + Math.floor(i / 7) * G.ch;
      const sel = d === S.day, seen = S.obs.has(d);
      roundRect(ctx, x + 3, y + 3, G.cw - 6, G.ch - 6, 10);
      ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill();
      ctx.strokeStyle = 'rgba(160,185,235,.22)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.textAlign = 'left'; ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = sel ? '#5eead4' : '#b9c8ee';
      ctx.fillText(d + '일', x + 10, y + 21 * fs);
      const mx = x + G.cw / 2, my = y + G.ch * 0.6;
      if (seen) {
        const k = popT(S.calT[d], 0.5), sc = k >= 1 ? 1 : ease.outBack(Math.min(1, k));
        drawPhase(ctx, mx, my, Math.max(0.5, r * sc), dayTheta(d), { mini: true, dark: '#283150' });
      } else {
        ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(160,185,235,.4)'; ctx.lineWidth = 1.2;
        circle(ctx, mx, my, r); ctx.stroke(); ctx.setLineDash([]);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fnt(L, 16, 'bold'); ctx.fillStyle = 'rgba(190,205,240,.55)';
        ctx.fillText('?', mx, my + 1); ctx.textBaseline = 'alphabetic';
      }
    }
    // 선택 칸 표시: 날짜를 바꾸면 미끄러지듯 따라가요
    const sx = G.x0 + S.selC * G.cw, sy = G.y0 + S.selR * G.ch;
    ctx.save();
    ctx.shadowColor = 'rgba(94,234,212,.7)'; ctx.shadowBlur = 14;
    roundRect(ctx, sx + 3, sy + 3, G.cw - 6, G.ch - 6, 10);
    ctx.fillStyle = 'rgba(94,234,212,.14)'; ctx.fill();
    ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    ctx.textAlign = 'left'; ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = 'rgba(190,210,255,.85)';
    ctx.fillText(S.obs.size >= 30 ? '✔ 한 달 동안의 관측 기록이 완성됐어요' : '👆 날짜 칸을 누르면 그날 밤의 달을 관측해요', G.x0 + 2, G.fy);
    ctx.restore();
  }

  /* ---------- ②~④ 북극 위에서 내려다본 모형 ---------- */
  function moonPos(L, th) {
    th = th == null ? S.thV : th;
    return { x: L.cx + R * Math.cos(th * DEG), y: L.cy - R * Math.sin(th * DEG) };
  }
  function drawSpots(ctx, L, t) {
    const D = Dof(ctx);
    SPOTS.forEach((a, k) => {
      const p = moonPos(L, a), done = S.visit.has(k);
      const q = { x: L.cx + (R - 38) * Math.cos(a * DEG), y: L.cy - (R - 38) * Math.sin(a * DEG) };
      ctx.save();
      if (done) {
        const pr = popT(S.spotT[k], 0.5), e = ease.outBack(Math.min(1, pr));
        ctx.fillStyle = 'rgba(52,211,153,' + 0.2 * Math.min(1, pr * 2) + ')'; circle(ctx, p.x, p.y, 19); ctx.fill();
        ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2.5; circle(ctx, p.x, p.y, 19 * (0.75 + 0.25 * Math.min(1, e))); ctx.stroke();
        D.check(q.x, q.y, Math.max(0.5, 11 * L.fs * e), Math.min(1, pr * 1.6));
      } else {
        D.ring(p.x, p.y, 19, REDUCE ? 0 : t + k * 0.27, { color: '#ffd36b', width: 2.5, speed: 0.9 });
        D.spark(q.x, q.y, 11 * L.fs, REDUCE ? 0 : t + k, '#ffd66b');
      }
      ctx.restore();
    });
  }
  // 정오·해 질 무렵·자정·해 뜰 무렵 (4단계). 아래쪽 이름표의 왼쪽 끝 x를 돌려줌
  function drawTimes(ctx, L) {
    const cx = L.cx, cy = L.cy, h = Math.round(20 * L.fs), gap = RE + 6;
    const o = { h, pad: Math.round(7 * L.fs), font: fnt(L, 13, 'bold'), bg: 'rgba(10,16,40,.86)', color: '#ffe8a3', stroke: 'rgba(255,224,140,.45)' };
    pill(ctx, '정오', cx + gap, cy, Object.assign({ align: 'left' }, o));
    pill(ctx, '자정', cx - gap, cy, Object.assign({ align: 'right' }, o));
    pill(ctx, '해 질 무렵', cx, cy - gap - h / 2, o);
    pill(ctx, '해 뜰 무렵', cx, cy + gap + h / 2, o);
    return cx - pillWidth(ctx, '해 뜰 무렵', o) / 2;
  }
  function drawMoonLight(ctx, m) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,214,110,.8)'; ctx.fillStyle = 'rgba(255,214,110,.9)'; ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]); ctx.lineDashOffset = REDUCE ? 0 : -(performance.now() / 1000 * 40);
    [-6.5, 0, 6.5].forEach((dy) => {
      const y = m.y + dy, x1 = m.x + Math.sqrt(RM * RM - dy * dy) + 3, x0 = m.x + RM + 40;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 + 6, y); ctx.stroke();
    });
    ctx.setLineDash([]);
    [-6.5, 0, 6.5].forEach((dy) => {
      const y = m.y + dy, x1 = m.x + Math.sqrt(RM * RM - dy * dy) + 3;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + 7, y - 3.5); ctx.lineTo(x1 + 7, y + 3.5); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  function drawModel(ctx, L, t) {
    const M = L.main, cx = L.cx, cy = L.cy, right = M.x + M.w, fs = L.fs;
    const m = moonPos(L);
    ctx.save();
    ctx.beginPath(); ctx.rect(M.x, M.y, M.w, M.h); ctx.clip();
    spaceBg(ctx, L, M, cx, cy, t);

    const D = Dof(ctx);
    // 태양 (오른쪽 가장자리에 걸친 큰 공) + 지구 쪽으로 흘러오는 햇빛
    const sunX = right + 128, sunR = 178;
    D.glow(sunX, cy, sunR * 2.1, '#ffb21e', 0.3);
    const sgr = ctx.createRadialGradient(sunX - sunR * 0.55, cy - sunR * 0.15, sunR * 0.1, sunX, cy, sunR);
    sgr.addColorStop(0, '#fffbe0'); sgr.addColorStop(0.45, '#ffd24a'); sgr.addColorStop(1, '#ff8a1e');
    ctx.fillStyle = sgr; circle(ctx, sunX, cy, sunR); ctx.fill();
    D.glow(sunX, cy, sunR * (1.3 + (REDUCE ? 0 : 0.05 * Math.sin(t * 1.4))), '#ffe08a', 0.2);
    const rayEnd = cx + RE + 8, rg = ctx.createLinearGradient(right - 58, 0, rayEnd, 0);
    rg.addColorStop(0, 'rgba(255,214,110,.85)'); rg.addColorStop(1, 'rgba(255,214,110,0)');
    ctx.strokeStyle = rg; ctx.lineWidth = 2.2; ctx.lineCap = 'butt'; ctx.setLineDash([14, 22]); ctx.lineDashOffset = REDUCE ? 0 : -(t * 46);
    ctx.fillStyle = 'rgba(255,214,110,.9)';
    for (let dy = -240; dy <= 240; dy += 60) {
      const y = cy + dy;
      if (y < M.y + 48 || y > M.y + M.h - 40) continue;
      ctx.beginPath(); ctx.moveTo(right - 58, y); ctx.lineTo(rayEnd, y); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    for (let dy = -240; dy <= 240; dy += 60) {
      const y = cy + dy, x1 = right - 96;
      if (y < M.y + 48 || y > M.y + M.h - 40) continue;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + 9, y - 5); ctx.lineTo(x1 + 9, y + 5); ctx.closePath(); ctx.fill();
    }

    // 공전 궤도와 방향
    ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(160,190,255,.45)'; ctx.lineWidth = 1.5;
    circle(ctx, cx, cy, R); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(170,200,255,.75)';
    for (let k = 0; k < 4; k++) {
      const a = (22.5 + 90 * k + (REDUCE ? 0 : (t * 7) % 90)) * DEG, px = cx + R * Math.cos(a), py = cy - R * Math.sin(a);
      const tx = -Math.sin(a), ty = -Math.cos(a), nx = Math.cos(a), ny = -Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(px + tx * 8, py + ty * 8);
      ctx.lineTo(px - tx * 5 + nx * 6, py - ty * 5 + ny * 6);
      ctx.lineTo(px - tx * 5 - nx * 6, py - ty * 5 - ny * 6);
      ctx.closePath(); ctx.fill();
    }

    // 힌트 목표 구간
    if (S.target) {
      const p = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.strokeStyle = 'rgba(52,211,153,' + (0.3 + 0.25 * p) + ')'; ctx.lineWidth = 26;
      ctx.beginPath(); ctx.arc(cx, cy, R, -S.target.hi * DEG, -S.target.lo * DEG); ctx.stroke();
    }
    if (S.spots) drawSpots(ctx, L, t);

    // 8개 위치
    if (ghostOn()) {
      for (let k = 0; k < 8; k++) {
        const p = moonPos(L, k * 45);
        drawMoonTop(ctx, p.x, p.y, 8, 0.5);
        const a = k * 45 * DEG, lx = cx + (R + 24 * fs) * Math.cos(a), ly = cy - (R + 24 * fs) * Math.sin(a);
        circle(ctx, lx, ly, 11 * fs); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(k + 1), lx, ly + 0.5); ctx.textBaseline = 'alphabetic';
      }
    }

    // 지구에서 바라본 선
    const ux = Math.cos(S.thV * DEG), uy = -Math.sin(S.thV * DEG), mr = RM * S.lift.value;
    const sight = on('sight');
    if (sight) {
      ctx.setLineDash([6, 5]); ctx.lineDashOffset = REDUCE ? 0 : -(t * 24); ctx.strokeStyle = 'rgba(94,234,212,.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + ux * (RE + 4), cy + uy * (RE + 4)); ctx.lineTo(m.x - ux * (mr + 5), m.y - uy * (mr + 5)); ctx.stroke(); ctx.lineDashOffset = 0;
      ctx.setLineDash([]);
    }
    drawEarth(ctx, L, cx, cy, RE, t);
    const times = on('sky');
    const timesLeft = times ? drawTimes(ctx, L) : 0;
    if (sight) { circle(ctx, cx + ux * RE, cy + uy * RE, 3.6); ctx.fillStyle = '#5eead4'; ctx.fill(); }

    // 달 (끌면 위로 번쩍 들리고, 놓으면 살짝 튕기며 내려앉아요)
    if (!S.interacted && !S.dragging) D.ring(m.x, m.y, RM + 11, REDUCE ? 0 : t, { color: '#ffffff', width: 2, speed: 1 });
    drawMoonTop(ctx, m.x, m.y, mr, 1, S.lift.value);
    if (sight) {
      // 달에서 지구를 향한 반쪽 (지구에서 보이는 쪽)
      const fa = Math.atan2(cy - m.y, cx - m.x);
      ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(m.x, m.y, mr + 3.5, fa - Math.PI / 2, fa + Math.PI / 2); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    const lightAid = !ghostOn();
    if (lightAid) drawMoonLight(ctx, m);

    // ----- 글자 -----
    const ph = Math.round(20 * fs), pp = Math.round(7 * fs);
    if (S.target) {
      const mid = ((S.target.lo + S.target.hi) / 2) * DEG;
      pill(ctx, '🎯 이쯤!', cx + (R - 50) * Math.cos(mid), cy - (R - 50) * Math.sin(mid), { bg: 'rgba(16,128,86,.92)', font: fnt(L, 13, 'bold'), h: Math.round(22 * fs) });
    }
    if (!ghostOn()) {
      const lo = { h: ph, pad: pp, font: fnt(L, 13, 'bold'), bg: 'rgba(255,240,190,.92)', color: '#3b3000' };
      if (lightAid && Math.abs(signed(S.theta)) < 35) pill(ctx, '달', m.x, m.y - mr - 10 - ph / 2, lo);   // 햇빛 화살표와 겹치지 않게
      else { const a = S.thV * DEG, rr = R + 25 * fs; pill(ctx, '달', cx + rr * Math.cos(a), cy - rr * Math.sin(a), lo); }
    }
    const eo = { h: ph, pad: pp, font: fnt(L, 13, 'bold'), color: '#d6e6ff' };
    if (times) pill(ctx, '지구', timesLeft - 6, cy + RE + 6 + ph * 1.1, Object.assign({ align: 'right' }, eo));
    else {
      const ey = RE + 8 + ph / 2, below = !(sight && inArc(S.theta, 245, 295));
      pill(ctx, '지구', cx, below ? cy + ey : cy - ey, eo);
    }
    ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'left'; ctx.fillStyle = '#d4e2ff';
    ctx.fillText('북극 위에서 내려다본 모습', M.x + 12, M.y + 24 * fs);
    ctx.font = fnt(L, 13); ctx.fillStyle = 'rgba(212,226,255,.66)';
    ctx.fillText('크기와 거리는 실제와 달라요', M.x + 12, M.y + 43 * fs);
    ctx.font = fnt(L, 15, 'bold'); ctx.textAlign = 'right'; ctx.fillStyle = '#ffd36b';
    const sw = ctx.measureText('태양 빛').width;
    ctx.fillText('태양 빛', right - 8, M.y + 25 * fs);
    sunIcon(ctx, right - 8 - sw - 12 * fs, M.y + 20 * fs, 4.5 * fs);

    // 공전 방향
    const by = M.y + M.h - 8 - 13 * fs;
    ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(190,210,255,.85)';
    const lg = '공전 방향 (시계 반대 방향)', lw = ctx.measureText(lg).width, ir = 5.5 * fs;
    ctx.fillText(lg, right - 12, by + 4.5 * fs);
    const ix = right - 12 - lw - ir - 7, iy = by;
    const a1 = 0.4 * Math.PI, a2 = a1 - 1.55 * Math.PI;
    ctx.strokeStyle = 'rgba(190,210,255,.85)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(ix, iy, ir, a1, a2, true); ctx.stroke();
    const ex = ix + ir * Math.cos(a2), ey2 = iy + ir * Math.sin(a2), tx = Math.sin(a2), ty = -Math.cos(a2), hs = 3.6 * fs;
    ctx.beginPath();
    ctx.moveTo(ex + tx * hs, ey2 + ty * hs);
    ctx.lineTo(ex - tx * hs * 0.6 - ty * hs, ey2 - ty * hs * 0.6 + tx * hs);
    ctx.lineTo(ex - tx * hs * 0.6 + ty * hs, ey2 - ty * hs * 0.6 - tx * hs);
    ctx.closePath(); ctx.fill();

    if (sight) {
      // 범례: 청록색 테두리 = 지구에서 보이는 쪽
      const lx = M.x + 14 + 8 * fs, ly = by;
      ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(lx, ly - 2, 7 * fs, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'left'; ctx.fillStyle = '#5eead4';
      ctx.fillText('지구에서 보이는 쪽', lx + 6 * fs, ly + 4.5 * fs);
    }

    // 새로 열린 도구 강조
    if (isNew('sight')) newRingCircle(ctx, L, m.x, m.y, RM + 14);
    if (isNew('sky') && times) newRingCircle(ctx, L, cx, cy, 78 * fs);

    // 처음 안내
    if (!S.interacted && !S.dragging) {
      const txt = '👆 달을 끌어서 옮겨 보세요', o = { font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: 'rgba(14,165,233,.94)' };
      const w = pillWidth(ctx, txt, o);
      const hx = clamp(m.x, M.x + w / 2 + 8, right - w / 2 - 8);
      let hy = m.y + 44 * fs;
      if (hy > M.y + M.h - 50) hy = m.y - 44 * fs;
      pill(ctx, txt, hx, hy, o);
    }
    ctx.restore();
  }

  /* ---------- 오른쪽 창: 지구(우리나라)에서 본 달 ---------- */
  function drawPanel(ctx, L, t) {
    const P = L.panel, G = panelGeo(L), fs = L.fs, th = curTheta(), model = modelOn(), thd = model ? S.thV : S.dayV, D = Dof(ctx);
    ctx.save();
    roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.clip();
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, '#0c1636'); g.addColorStop(1, '#1b2d60');
    ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
    drawStars(ctx, L.starsPanel, t, 0.8);

    ctx.textAlign = G.align; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText(model ? '지구(우리나라)에서 본 달' : '🔭 관측한 달', G.tx, G.ty);
    ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13);
    ctx.fillText(model ? '북반구에서 바라본 모습' : '음력 ' + S.day + '일 밤', G.tx, G.sy);

    const lf = litFrac(th), lfd = litFrac(thd);
    if (lfd > 0.02) D.glow(G.dx, G.dy, G.dr * (1.7 + (REDUCE ? 0 : 0.05 * lfd * Math.sin(t * 2))), '#fff0b8', 0.3 * lfd);
    drawPhase(ctx, G.dx, G.dy, G.dr, thd, { craters: true });

    const key = phaseKey(th), Pk = PH[key];
    ctx.textAlign = G.align; ctx.fillStyle = '#fff';
    ctx.font = Math.round(28 * fs) + 'px ' + DISPLAY;
    const nk = popT(S.nameT, 0.4), ns = nk >= 1 ? 1 : 0.8 + 0.2 * ease.outBack(Math.min(1, nk));
    ctx.save(); ctx.translate(G.nx, G.ny); ctx.scale(ns, ns); ctx.globalAlpha = Math.min(1, 0.4 + nk);
    ctx.fillText(Pk.name, 0, 0);
    ctx.restore();
    ctx.font = fnt(L, 13); ctx.fillStyle = on('sky') ? '#ffe7b0' : '#b9c8ee';
    ctx.fillText(on('sky') ? '🕖 ' + Pk.sky : Pk.look, G.nx, G.n2y);
    if (!model || on('date')) {
      ctx.fillStyle = '#ffe08a'; ctx.font = fnt(L, 15, 'bold');
      ctx.fillText(model ? '음력 약 ' + lunarDay(th) + '일' : '음력 ' + S.day + '일', G.nx, G.dateY);
    }

    // 막대: 밝게 보이는 부분
    const pct = Math.round(lf * 100) + '%';
    if (G.barLabelY) {
      ctx.font = fnt(L, 13); ctx.textAlign = 'left'; ctx.fillStyle = '#c7d3f2';
      ctx.fillText('밝게 보이는 부분', G.barX, G.barLabelY);
      ctx.textAlign = 'right'; ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = '#fff';
      ctx.fillText(pct, G.barX + G.barW, G.barLabelY);
    } else {
      ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
      ctx.fillText('밝은 부분 ' + pct, G.barX + G.barW + 10, G.barY + 11);
    }
    ctx.fillStyle = 'rgba(255,255,255,.16)'; roundRect(ctx, G.barX, G.barY, G.barW, 12, 6); ctx.fill();
    if (lfd > 0.004) {
      const bg = ctx.createLinearGradient(G.barX, 0, G.barX + G.barW, 0);
      bg.addColorStop(0, '#fde68a'); bg.addColorStop(1, '#facc15');
      ctx.fillStyle = bg; roundRect(ctx, G.barX, G.barY, Math.max(12, G.barW * lfd), 12, 6); ctx.fill();
    }

    if (model) {
      // 한 달 동안의 변화 (관측 기록 요약)
      if (G.capY) {
        ctx.font = fnt(L, 13); ctx.textAlign = 'center'; ctx.fillStyle = '#9fb3e0';
        ctx.fillText('한 달 동안의 변화 (음력)', G.dx, G.capY);
      }
      const cur = Math.round(norm(th) / 45) % 8;
      G.strip.forEach((p, k) => {
        drawPhase(ctx, p.x, p.y, G.sr, k * 45, { mini: true, dark: '#2b3350' });
        if (k === cur) { ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 2.2; circle(ctx, p.x, p.y, G.sr + 4); ctx.stroke(); }
        ctx.font = fnt(L, 13, k === cur ? 'bold' : ''); ctx.textAlign = 'center'; ctx.fillStyle = k === cur ? '#5eead4' : '#b9c8ee';
        ctx.fillText(lunarDay(k * 45) + '일', p.x, p.y + G.labDy);
      });
    } else {
      // 탐구 질문
      const q = G.qbox;
      roundRect(ctx, q.x, q.y, q.w, q.h, 12);
      ctx.fillStyle = 'rgba(255,214,110,.1)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,110,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = 'left'; ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = '#ffd36b';
      ctx.fillText('🔍 탐구 질문', q.x + 12, q.y + 26 * fs);
      ctx.font = Math.round(19 * fs) + 'px ' + DISPLAY; ctx.fillStyle = '#fff';
      wrapText(ctx, '달의 모양은 왜 매일 달라질까?', q.x + 12, q.y + 56 * fs, q.w - 24, 26 * fs);
      if (L.col) {
        ctx.font = fnt(L, 13); ctx.fillStyle = '#c7d3f2';
        wrapText(ctx, '먼저 한 달 동안 달의 모양이 어떻게 바뀌는지 관찰해 봐요.', q.x + 12, q.y + 118, q.w - 24, 19);
      }
    }
    ctx.restore();
    roundRect(ctx, P.x, P.y, P.w, P.h, 14);
    ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (isNew('date') || isNew('sky')) newRing(ctx, L, G.textX, G.n2y - 18 * fs, G.textW, G.dateY - G.n2y + 26 * fs);
  }

  function draw(v, L, t) {
    v.clear('#070d1f');
    if (modelOn()) drawModel(v.ctx, L, t); else drawCalendar(v.ctx, L, t);
    drawPanel(v.ctx, L, t);
    L.fx.draw(v.ctx);
    drawWin(v.ctx, L);
  }

  /* ---------- 입력 ---------- */
  const rangeTheta = SciSim.bindRange($('#sTheta'), $('#oTheta'), (v) => v + '°', (v) => { setPlaying(false); setTheta(v); interacted(); });
  const rangeDay = SciSim.bindRange($('#sDay'), $('#oDay'), (v) => v + '일', (v) => { selectDay(v); });
  function setTheta(a) {
    S.theta = norm(a);
    rangeTheta.set(Math.round(S.theta) % 360);
  }
  function selectDay(d) {
    d = clamp(Math.round(d), 1, 30);
    if (d !== S.day) Sound.tick();
    S.day = d; rangeDay.set(d);
    if (!S.obs.has(d)) S.calT[d] = SciSim.time();
    S.obs.add(d);
    if (S.logFound) {
      const k = phaseKey(dayTheta(d));
      if (FIVE.indexOf(k) >= 0 && !S.found.has(k)) {
        S.found.add(k); Sound.tone(880, 0.12, 'triangle', 0.08);
        fxBurst((L) => { const G = calGeo(L), i = d - 1; return { x: G.x0 + (i % 7) * G.cw + G.cw / 2, y: G.y0 + Math.floor(i / 7) * G.ch + G.ch * 0.6 }; }, { count: 12, speed: 110, size: 3, gravity: 60, life: 0.7 });
      }
    }
  }
  const playBtn = $('#playBtn');
  function setPlaying(p) {
    S.playing = !!p && on('orbit');
    playBtn.innerHTML = S.playing ? '⏸ 정지' : '▶ 공전 재생';
    playBtn.classList.toggle('btn-primary', !S.playing);
    playBtn.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  playBtn.addEventListener('click', () => { Sound.click(); setPlaying(!S.playing); interacted(); });
  const tGhost = $('#tGhost');
  tGhost.addEventListener('change', () => { Sound.click(); S.ghost = tGhost.checked; });
  function setGhost(v) { S.ghost = !!v; tGhost.checked = S.ghost; }
  function interacted() { S.interacted = true; }

  function attachPointer(v, L) {
    const hitMoon = (p) => { const m = moonPos(L); return Math.hypot(p.x - m.x, p.y - m.y) < 36; };
    const onOrbit = (p) => {
      const M = L.main;
      if (p.x < M.x || p.x > M.x + M.w || p.y < M.y || p.y > M.y + M.h) return false;
      return Math.abs(Math.hypot(p.x - L.cx, p.y - L.cy) - R) < 32;
    };
    const calDay = (p) => {
      const G = calGeo(L);
      const c = Math.floor((p.x - G.x0) / G.cw), r = Math.floor((p.y - G.y0) / G.ch);
      if (c < 0 || c > 6 || r < 0 || r > 4) return 0;
      const d = r * 7 + c + 1;
      return d <= 30 ? d : 0;
    };
    const dragTo = (p) => setTheta(norm(Math.atan2(L.cy - p.y, p.x - L.cx) / DEG));
    SciSim.pointer(v, {
      hover: (p) => (modelOn() ? (hitMoon(p) ? 'grab' : onOrbit(p) ? 'pointer' : null) : (calDay(p) ? 'pointer' : null)),
      down(p) {
        if (!modelOn()) { const d = calDay(p); if (!d) return false; selectDay(d); return true; }
        if (!hitMoon(p) && !onOrbit(p)) return false;
        S.dragging = true; setPlaying(false); interacted(); dragTo(p);
        v.canvas.style.cursor = 'grabbing';
        return true;
      },
      move(p) {
        if (!modelOn()) { const d = calDay(p); if (d) selectDay(d); return; }
        dragTo(p);
      },
      up() { S.dragging = false; v.canvas.style.cursor = ''; },
    });
    return (p) => (modelOn() ? hitMoon(p) || onOrbit(p) : !!calDay(p));
  }

  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#070d1f' });
    L.starsMain = makeStars(L.main, 80, k === 'wide' ? 7 : 11);
    L.starsPanel = makeStars(L.panel, 34, k === 'wide' ? 23 : 29);
    L.fx = new SciSim.Particles(); L.win = null;
    const hits = attachPointer(v, L);
    if (k === 'tall') {
      // 휴대폰: 달·궤도·날짜 칸을 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc && hits(v.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
    return { v, L };
  });

  /* ---------- 퀴즈 그림 (SVG) ---------- */
  function svgLit(cx, cy, r, th) {
    th = norm(th);
    const waxing = th <= 180, t = waxing ? th : 360 - th;
    if (t < 0.5) return '';
    const c = Math.cos(t * DEG), a = (r * Math.abs(c)).toFixed(2);
    const top = cx + ',' + (cy - r), bot = cx + ',' + (cy + r);
    if (waxing) return 'M' + top + ' A' + r + ',' + r + ' 0 0 1 ' + bot + ' A' + a + ',' + r + ' 0 0 ' + (c >= 0 ? 0 : 1) + ' ' + top + ' Z';
    return 'M' + top + ' A' + r + ',' + r + ' 0 0 0 ' + bot + ' A' + a + ',' + r + ' 0 0 ' + (c >= 0 ? 1 : 0) + ' ' + top + ' Z';
  }
  const LITGRAD = (id) => '<radialGradient id="' + id + '" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#fffdf2"/><stop offset="1" stop-color="#e8d18a"/></radialGradient>';
  function svgPhase(cx, cy, r, th, gid) {
    const p = svgLit(cx, cy, r, th);
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#283048" stroke="#9aa8d4" stroke-opacity=".45"/>' + (p ? '<path d="' + p + '" fill="url(#' + gid + ')"/>' : '');
  }
  function svgEarth(x, y, r) {
    return '<defs><radialGradient id="fgEarth" cx="75%" cy="35%" r="80%"><stop offset="0" stop-color="#9bd6ff"/><stop offset=".5" stop-color="#2f86e0"/><stop offset="1" stop-color="#10366f"/></radialGradient></defs><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#fgEarth)"/><path d="M' + x + ',' + (y - r) + ' A' + r + ',' + r + ' 0 0 0 ' + x + ',' + (y + r) + ' Z" fill="#040a1f" opacity=".72"/>';
  }
  function svgSunArrows(x0, x1, ys) {
    return ys.map((y) => '<line x1="' + x0 + '" y1="' + y + '" x2="' + (x1 + 6) + '" y2="' + y + '" stroke="#ffd36b" stroke-width="2"/><path d="M' + x1 + ',' + y + ' l8,-4.5 v9 z" fill="#ffd36b"/>').join('');
  }
  const SVG_OPEN = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FONT.replace(/"/g, '') + '\'>';

  const FIG = {};
  FIG.order = (function () {
    const list = [['(가)', 180], ['(나)', 270], ['(다)', 45], ['(라)', 315], ['(마)', 90]];
    let s = SVG_OPEN(330, 106, '뒤섞인 다섯 가지 달의 모양') + '<defs>' + LITGRAD('fgB') + '</defs>';
    s += '<rect x="0" y="0" width="330" height="106" rx="12" fill="#14224d"/>';
    list.forEach((it, i) => {
      const x = 37 + i * 64;
      s += svgPhase(x, 44, 25, it[1], 'fgB');
      s += '<text x="' + x + '" y="94" text-anchor="middle" font-size="15" font-weight="700" fill="#d4e2ff">' + it[0] + '</text>';
    });
    return s + '</svg>';
  })();
  FIG.see = (function () {
    const cx = 150, cy = 100, R2 = 62;
    let s = SVG_OPEN(320, 172, '지구 위쪽에 있는 달과 오른쪽에서 오는 햇빛');
    s += '<rect x="0" y="0" width="320" height="172" rx="12" fill="#0e1838"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R2 + '" fill="none" stroke="#a0beff" stroke-opacity=".5" stroke-dasharray="3 5"/>';
    s += svgSunArrows(314, 280, [44, 84, 124, 160]);
    s += '<text x="312" y="24" text-anchor="end" font-size="14" font-weight="700" fill="#ffd36b">태양 빛</text>';
    s += svgEarth(cx, cy, 12);
    s += '<text x="' + cx + '" y="' + (cy + 31) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#d6e6ff">지구</text>';
    const my = cy - R2, r = 16;
    s += '<circle cx="' + cx + '" cy="' + my + '" r="' + r + '" fill="#3a4258"/><path d="M' + cx + ',' + (my - r) + ' A' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (my + r) + ' Z" fill="#fff6d2"/>';
    s += '<path d="M' + (cx - r - 3) + ',' + my + ' A' + (r + 3) + ',' + (r + 3) + ' 0 0 0 ' + (cx + r + 3) + ',' + my + '" fill="none" stroke="#5eead4" stroke-width="3" stroke-linecap="round"/>';
    s += '<text x="' + (cx - 26) + '" y="' + (my + 5) + '" text-anchor="end" font-size="14" font-weight="700" fill="#fff">달</text>';
    s += '<text x="' + (cx + 26) + '" y="' + (my + 22) + '" font-size="13" font-weight="700" fill="#5eead4">지구 쪽 절반</text>';
    return s + '</svg>';
  })();
  FIG.evening = (function () {
    let s = SVG_OPEN(320, 172, '해 질 무렵 남쪽 하늘을 바라본 모습');
    s += '<defs><linearGradient id="fgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2c63"/><stop offset=".62" stop-color="#6f5b9b"/><stop offset="1" stop-color="#f6a65f"/></linearGradient>';
    s += '<radialGradient id="fgSun"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="#ff9f43" stop-opacity="0"/></radialGradient>';
    s += '<clipPath id="fgClip"><rect x="0" y="0" width="320" height="172" rx="12"/></clipPath></defs>';
    s += '<g clip-path="url(#fgClip)"><rect x="0" y="0" width="320" height="172" fill="url(#fgSky)"/>';
    s += '<circle cx="288" cy="130" r="34" fill="url(#fgSun)"/><circle cx="288" cy="130" r="15" fill="#ffb347"/>';
    s += '<path d="M0,130 Q160,122 320,130 L320,172 L0,172 Z" fill="#1d3527"/></g>';
    s += '<circle cx="160" cy="58" r="23" fill="#ffffff" fill-opacity=".1" stroke="#fff" stroke-width="2" stroke-dasharray="5 4"/>';
    s += '<text x="160" y="67" text-anchor="middle" font-size="26" font-weight="800" fill="#fff">?</text>';
    s += '<text x="12" y="24" font-size="14" font-weight="700" fill="#fff">음력 7~8일 · 해 질 무렵</text>';
    s += '<text x="24" y="157" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">동</text>';
    s += '<text x="160" y="157" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">남</text>';
    s += '<text x="296" y="157" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">서</text>';
    s += '<text x="244" y="116" text-anchor="middle" font-size="13" font-weight="700" fill="#fff4d6">지는 해</text>';
    return s + '</svg>';
  })();

  /* ---------- 미션 도우미 ---------- */
  function aids() { S.target = null; S.spots = false; S.four = false; S.logFound = false; }
  function prep() { setPlaying(false); }
  function ensureOutside(lo, hi, fallback) { if (inArc(S.theta, lo, hi)) setTheta(fallback); }
  const thetaTxt = () => Math.round(norm(S.theta)) % 360;
  const playNote = () => (S.playing ? '<br>⏸ 공전을 멈추고 달을 놓아 보세요.' : '');
  const nowStatus = () => '지금 달: <b>' + PH[phaseKey(S.theta)].short + '</b> · θ = <b>' + thetaTxt() + '°</b>' + playNote();
  const isPhase = (k) => !S.playing && phaseKey(S.theta) === k;
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;

  /* ---------- 단계별 학습 ---------- */
  game = SciSim.game({
    simId: 'm1-moon-phase',
    mount: '#game',
    badge: '달의 위상 탐정',
    homeHref: '../../index.html#g1',
    featureLabels: {
      calendar: '📅 달 관측 기록장 (음력)',
      model: '🌍 태양–지구–달 모형',
      sight: '👀 지구에서 보이는 쪽',
      orbit: '▶ 공전 재생',
      marks: '🔢 8개 위치 표시',
      date: '📅 모형의 음력 날짜',
      sky: '🕖 관측 시각 · 방향',
    },
    onFeatures(set) {
      FEAT = set;
      if (!set.has('orbit')) setPlaying(false);
      if (!set.has('marks')) setGhost(false);
      $('#ctrlDay').hidden = set.has('model');
    },
    onMissionStart() { aids(); },
    onHint(m) { if (m.target) S.target = m.target; },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '한 달 동안 달의 모양', short: '관찰', icon: '📅', phase: '관찰',
        features: ['calendar'],
        intro: '<p><b>🔍 탐구 질문: 달의 모양은 왜 매일 달라질까?</b></p>' +
          '<p>먼저 한 달 동안 밤하늘의 달을 관측한 <b>관측 기록장</b>을 살펴봐요. 날짜는 달의 모양 변화를 기준으로 만든 <b>음력</b>이에요.</p>',
        setup() { aids(); prep(); S.obs = new Set([S.day]); },
        recap: '달의 모양은 <b>초승달 → 상현달 → 보름달 → 하현달 → 그믐달</b> 순서로 바뀌고, 약 한 달마다 되풀이돼요.',
        summary: '<span class="formula">삭 → 초승달 → 상현달 → 보름달(망) → 하현달 → 그믐달 → 삭</span>' +
          '<ul><li>달의 모양은 날마다 조금씩 바뀌며, 약 <b>29.5일</b>마다 같은 모양이 되풀이된다.</li>' +
          '<li>보름달 전에는 <b>오른쪽</b>부터 차오르고, 보름달 뒤에는 오른쪽부터 줄어 <b>왼쪽</b>만 남는다 (북반구).</li></ul>',
        missions: [
          {
            title: '🔭 다섯 가지 모양 찾기',
            goal: '날짜 칸을 눌러(또는 슬라이더로) 그날 밤의 달을 관측하며, <b>다섯 가지 모양</b>을 모두 찾아보세요.',
            hint: '<b>📅 음력 날짜</b> 슬라이더를 1일부터 30일까지 천천히 움직여 보세요. <b>관측한 달</b> 창에 모양의 이름이 나와요.',
            setup() { prep(); S.found = new Set(); S.logFound = true; selectDay(S.day); },
            check: () => FIVE.every((k) => S.found.has(k)),
            hold: 0,
            status: () => FIVE.map((k) => chk(S.found.has(k), PH[k].short)).join(' · '),
            explain: '음력 날짜가 지나면서 달은 <b>초승달 → 상현달 → 보름달 → 하현달 → 그믐달</b>로 바뀌어요. 음력 1일(삭) 무렵에는 달이 보이지 않고, 약 <b>29.5일</b>이 지나면 다시 같은 모양이 돼요.',
          },
          {
            type: 'quiz',
            title: '🔍 뒤죽박죽 달 사진',
            goal: '달 사진의 순서가 뒤섞였어요. 음력 1일(삭) 이후 한 달 동안 보이는 순서대로 나열한 것은?',
            figure: FIG.order,
            setup() { prep(); for (let d = 1; d <= 30; d++) S.obs.add(d); },
            choices: [
              '(라) → (나) → (가) → (마) → (다)',
              '(다) → (나) → (가) → (마) → (라)',
              '(다) → (마) → (가) → (나) → (라)',
              '(가) → (마) → (다) → (라) → (나)',
            ],
            answer: 2,
            feedback: [
              '순서가 거꾸로예요! 관측 기록장을 보면 달은 <b>오른쪽부터</b> 차올라요.',
              '(나)와 (마)의 순서가 바뀌었어요. 보름달 <b>전</b>에는 오른쪽이, <b>뒤</b>에는 왼쪽이 밝아요.',
              '',
              '삭 바로 다음에는 달이 가느다랗게 보이기 시작해요. 보름달은 한 달의 한가운데(음력 15일 무렵)예요.',
            ],
            explain: '(다) 초승달 → (마) 상현달 → (가) 보름달 → (나) 하현달 → (라) 그믐달. 그런데 달의 모양은 <b>왜</b> 이렇게 바뀔까요? 다음 단계에서 모형으로 알아봐요!',
          },
        ],
      },
      /* ---------- 2단계 · 모형 ---------- */
      {
        title: '햇빛을 받는 달', short: '모형', icon: '🌞', phase: '모형',
        features: ['model', 'sight'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 달의 모양이 약 한 달마다 차례로 바뀌는 것을 관찰했어요.</div>' +
          '<p>이제 북극 위에서 내려다본 <b>태양–지구–달 모형</b>으로 그 까닭을 찾아봐요. 햇빛은 화면 <b>오른쪽</b>에서 들어와요.</p>',
        setup() { aids(); prep(); setTheta(90); S.interacted = false; },
        recap: '달은 <b>햇빛을 반사</b>해 태양 쪽 절반만 밝고, 지구에서는 달의 <b>지구 쪽 절반</b>만 보여요.',
        summary: '<ul><li>달은 스스로 빛을 내지 못하고 <b>태양 빛을 반사</b>하여 밝게 보인다.</li>' +
          '<li>달이 어디에 있든 <b>태양을 향한 쪽 절반</b>은 늘 밝다.</li>' +
          '<li>지구에서는 달의 <b>지구를 향한 쪽 절반</b>만 보인다. 그중 밝은 부분만큼 달이 밝게 보인다.</li></ul>',
        missions: [
          {
            title: '🌙 달을 여기저기 옮겨 보자',
            goal: '달을 끌어서 궤도 위 <b>노란 점선 동그라미</b> 4곳 중 <b>3곳</b>으로 옮겨 보세요. 달의 <b>어느 쪽</b>이 밝은지 살펴봐요.',
            hint: '달(또는 궤도 위 아무 곳)을 손가락으로 누른 채 원을 따라 끌어요. <b>🌙 달의 위치</b> 슬라이더를 써도 돼요.',
            setup() { prep(); setTheta(90); S.visit = new Set(); S.spots = true; },
            check: () => S.visit.size >= 3,
            hold: 0,
            status: () => '옮겨 본 자리: <b>' + Math.min(3, S.visit.size) + ' / 3</b>' + (S.visit.size ? ' · 밝은 쪽은 어느 쪽이었나요?' : ''),
            explain: '달이 어디에 있든 <b>태양을 향한 오른쪽 절반</b>만 밝았어요. 햇빛이 태양 쪽에서 오기 때문이에요. 달이 햇빛을 받는 부분은 언제나 <b>절반</b>이에요.',
          },
          {
            type: 'quiz',
            title: '🤔 달은 왜 밝게 보일까?',
            goal: '밤하늘의 달이 밝게 보이는 까닭으로 옳은 것은?',
            choices: ['달이 스스로 빛을 내기 때문', '달이 태양 빛을 반사하기 때문', '지구의 불빛이 달을 비추기 때문', '달 표면이 뜨거워서 빛나기 때문'],
            answer: 1,
            feedback: [
              '달이 스스로 빛난다면 어느 위치에서나 <b>전체</b>가 밝아야 해요. 모형에서는 늘 <b>태양 쪽 절반</b>만 밝았죠?',
              '',
              '지구의 불빛은 너무 약해서 달을 밝게 비출 수 없어요. 밝은 쪽은 지구 쪽이 아니라 <b>태양 쪽</b>이었어요.',
              '달은 스스로 빛을 낼 만큼 뜨겁지 않아요. 밝은 쪽이 늘 <b>태양 쪽</b>이라는 점이 단서예요.',
            ],
            explain: '달은 스스로 빛을 내지 못하고 <b>태양 빛을 반사</b>해서 밝게 보여요. 그래서 햇빛을 받는 쪽만 밝고, 반대쪽은 어두워요.',
          },
          {
            type: 'quiz',
            title: '👀 지구에서는 어디가 보일까?',
            goal: '지구에서 볼 수 있는 것은 달의 어느 부분일까요? (그림의 청록색 테두리를 보세요)',
            figure: FIG.see,
            choices: ['달 전체', '태양을 향한 쪽 절반', '지구를 향한 쪽 절반', '밝은 부분 전체'],
            answer: 2,
            feedback: [
              '달은 공 모양이라 한쪽에서는 <b>절반</b>만 볼 수 있어요. 달의 뒤쪽은 지구에서 보이지 않아요.',
              '태양 쪽 절반은 <b>밝은</b> 부분이에요. 그런데 우리가 보는 쪽은 태양 쪽이 아니라 <b>지구</b> 쪽이에요.',
              '',
              '밝은 부분이 지구를 등지고 있으면 지구에서는 보이지 않아요.',
            ],
            explain: '지구에서는 달의 <b>지구를 향한 쪽 절반</b>만 보여요. 그래서 밝은 절반 중 지구 쪽 절반에 들어 있는 부분만큼만 밝게 보여요. 그림의 달은 <b>오른쪽 반</b>만 밝게 보이겠죠?',
          },
        ],
      },
      /* ---------- 3단계 · 설명 ---------- */
      {
        title: '공전 위치와 위상', short: '원리', icon: '🌓', phase: '설명',
        features: ['orbit', 'marks'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 달의 밝은 절반 중 <b>지구 쪽 절반</b>에 든 부분만 보인다는 것을 알았어요.</div>' +
          '<p>달은 지구 둘레를 <b>시계 반대 방향</b>으로 <b>공전</b>해요. 달의 위치에 따라 모양(<b>위상</b>)이 어떻게 달라지는지 직접 만들어 봐요.</p>',
        setup() { aids(); prep(); setGhost(true); setTheta(30); },
        recap: '달이 공전하면 지구에서 보이는 밝은 부분이 달라져 <b>위상</b>이 바뀌어요.',
        summary: '<ul><li><b>삭</b>: 태양–달–지구 순서. 밝은 쪽이 지구 반대편을 향해 보이지 않는다.</li>' +
          '<li><b>상현달</b>: 태양–지구–달이 직각(삭에서 ¼ 바퀴). 오른쪽 반이 밝다.</li>' +
          '<li><b>망(보름달)</b>: 태양–지구–달 순서. 밝은 쪽 전체가 보인다.</li>' +
          '<li><b>하현달</b>: 망에서 ¼ 바퀴 더. 왼쪽 반이 밝다.</li></ul>' +
          '<p class="note">⚠️ 달의 위상 변화는 <b>지구의 그림자 때문이 아니에요.</b> 달이 공전하면서 밝은 부분이 보이는 정도가 달라지기 때문이에요.</p>',
        missions: [
          {
            title: '🌑🌓🌕🌗 네 가지 위상 만들기',
            goal: '달을 옮겨 <b>삭, 상현달, 망(보름달), 하현달</b>을 하나씩 만들어 보세요. 모양이 될 때마다 잠깐 멈춰요.',
            hint: '삭은 태양 쪽(1번), 상현달은 3번, 망은 태양 반대편(5번), 하현달은 7번 자리예요. <b>▶ 공전 재생</b>으로 미리 살펴봐도 좋아요.',
            setup() { prep(); S.made = new Set(); S.holdKey = null; S.four = true; },
            check: () => FOUR.every((k) => S.made.has(k)),
            hold: 0,
            status: () => FOUR.map((k) => chk(S.made.has(k), PH[k].short)).join(' · ') + '<br>지금 달: <b>' + PH[phaseKey(S.theta)].short + '</b>' + playNote(),
            explain: '<b>삭</b>(태양–달–지구): 밝은 쪽이 보이지 않아요. <b>상현달</b>: 밝은 쪽의 절반만 보여 오른쪽 반이 밝아요. <b>망</b>(태양–지구–달): 밝은 쪽 전체가 보여 보름달! <b>하현달</b>: 다시 절반만 보여 왼쪽 반이 밝아요.',
          },
          {
            title: '🌒 가느다란 초승달',
            goal: '<b>오른쪽</b>이 가늘게 빛나는 <b>초승달</b>을 만들어 보세요.',
            hint: '초승달은 삭(1번)과 상현달(3번) 사이, 2번 자리 근처예요.',
            target: { lo: 25, hi: 65 },
            setup() { prep(); ensureOutside(15, 75, 180); },
            check: () => isPhase('wxc'),
            hold: 0.8,
            status: nowStatus,
            explain: '삭에서 조금 공전하면 밝은 쪽의 <b>가장자리</b>만 지구를 향해, 오른쪽이 가늘게 빛나는 <b>초승달</b>이 돼요.',
          },
          {
            type: 'quiz',
            title: '🤔 달 모양은 왜 바뀔까?',
            goal: '달의 위상이 바뀌는 까닭으로 옳은 것은?',
            choices: [
              '지구의 그림자가 달을 가리는 정도가 달라지기 때문',
              '달이 공전하면서, 밝은 부분이 지구에서 보이는 정도가 달라지기 때문',
              '달이 햇빛을 받는 부분이 절반보다 많아지거나 적어지기 때문',
              '달의 실제 크기가 커졌다 작아졌다 하기 때문',
            ],
            answer: 1,
            feedback: [
              '많은 사람이 이렇게 착각해요! 지구의 그림자는 언제나 태양의 <b>반대쪽</b>에 생겨요. 상현달일 때 달은 그 그림자에서 멀리 떨어져 있어요.',
              '',
              '달은 어디에 있든 늘 <b>절반</b>이 햇빛을 받아요(2단계). 달라지는 것은 <b>지구에서 보이는</b> 부분이에요.',
              '달의 크기는 변하지 않아요. 어두운 부분까지 합치면 늘 같은 크기의 원이에요.',
            ],
            explain: '달은 늘 태양 쪽 절반이 밝아요. 달이 지구 둘레를 <b>공전</b>하면 그 밝은 절반 중 지구에서 보이는 부분이 달라져 <b>위상</b>이 바뀌어요. 지구의 그림자가 달을 가리는 것은 <b>월식</b>이라는 다른 현상이에요(다음 차시).',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '음력 날짜와 달 관측', short: '적용', icon: '🕖', phase: '적용',
        features: ['date', 'sky'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 달의 공전 위치에 따라 위상이 정해진다는 것을 알았어요.</div>' +
          '<p>음력 날짜를 알면 그날 밤 어떤 달이 <b>언제, 어느 하늘</b>에 보일지 예측할 수 있어요. 지구 둘레의 <b>정오 · 해 질 무렵 · 자정 · 해 뜰 무렵</b> 위치를 단서로 추리해 봐요.</p>',
        setup() { aids(); prep(); setTheta(90); },
        recap: '음력 날짜로 달의 위상을 알 수 있고, 위상에 따라 <b>보이는 시각과 방향</b>도 정해져요.',
        summary: '<ul><li><b>초승달</b>(음력 2~3일 무렵): 초저녁 <b>서쪽</b> 하늘</li>' +
          '<li><b>상현달</b>(음력 7~8일): 초저녁 <b>남쪽</b> 하늘</li>' +
          '<li><b>보름달</b>(음력 15일 무렵): 초저녁 <b>동쪽</b>에서 떠서 밤새 보임</li>' +
          '<li><b>하현달</b>(음력 22~23일): 새벽 <b>남쪽</b> 하늘</li>' +
          '<li><b>그믐달</b>(음력 27~28일 무렵): 새벽 <b>동쪽</b> 하늘</li></ul>' +
          '<p class="note">지구가 자전하므로 관측자는 하루 동안 정오 → 해 질 무렵 → 자정 → 해 뜰 무렵 위치를 차례로 지나요.</p>',
        missions: [
          {
            type: 'quiz',
            title: '🔍 해 질 녘 남쪽 하늘',
            goal: '음력 <b>7~8일</b>, 해가 질 무렵 <b>남쪽 하늘</b>에 높이 떠 있는 달은?',
            figure: FIG.evening,
            choices: ['초승달', '하현달', '상현달', '보름달'],
            answer: 2,
            feedback: [
              '초승달은 음력 2~3일 무렵, 초저녁 <b>서쪽</b> 하늘에 낮게 떠 있다가 곧 져요.',
              '하현달은 음력 22~23일의 달로 <b>새벽</b>에 남쪽 하늘에서 보여요. 상현과 하현을 헷갈리지 마세요!',
              '',
              '보름달은 음력 15일 무렵, 해가 질 때 <b>동쪽</b>에서 떠올라요.',
            ],
            explain: '음력 7~8일에 달은 3번 자리에 있어요. 지구 위쪽 <b>해 질 무렵</b> 위치에 선 사람에게 이 달은 머리 위 <b>남쪽 하늘</b>에 보이고, 태양이 있는 서쪽(오른쪽)이 밝은 <b>상현달</b>이에요.',
          },
          {
            type: 'quiz',
            title: '🌕 음력 15일의 보름달',
            goal: '음력 15일 무렵의 보름달은 언제, 어디에서 볼 수 있을까요?',
            setup() { prep(); setTheta(180); },
            choices: [
              '해 질 무렵 서쪽 하늘에서 잠깐 보인다',
              '한밤중에만 잠깐 보였다가 사라진다',
              '해 질 무렵 동쪽에서 떠서 밤새 보이다가 새벽에 서쪽으로 진다',
              '새벽에 동쪽 하늘에서만 보인다',
            ],
            answer: 2,
            feedback: [
              '해 질 무렵 서쪽 하늘의 달은 <b>초승달</b>이에요.',
              '보름달은 태양의 정반대편에 있어서 밤새 하늘에 떠 있어요. 지구 둘레의 시각 이름표를 보세요.',
              '',
              '새벽 동쪽 하늘의 가는 달은 <b>그믐달</b>이에요.',
            ],
            explain: '망의 달은 태양의 <b>정반대편</b>에 있어요. 관측자가 <b>해 질 무렵</b> 위치에 오면 동쪽에서 떠오르고, <b>자정</b>에는 남쪽 하늘 높이, <b>해 뜰 무렵</b>에는 서쪽으로 져요.',
          },
          {
            title: '🔍 음력 22~23일의 달',
            goal: '<b>음력 22~23일</b>의 달을 모형에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요. 모양과 보이는 시각도 확인해요.',
            manual: true,
            hint: '<b>지구에서 본 달</b> 창의 <b>음력 날짜</b>를 보면서 달을 돌려 보세요. 보름달(음력 15일)에서 공전 방향으로 ¼ 바퀴 더!',
            target: { lo: 258, hi: 280 },
            setup() { prep(); ensureOutside(250, 290, 180); },
            status: () => '지금: 음력 약 <b>' + lunarDay(S.theta) + '일</b> · <b>' + PH[phaseKey(S.theta)].short + '</b>' + playNote(),
            check() {
              if (S.playing) return '⏸ 공전을 멈추고 달을 놓은 뒤 확인해요.';
              const d = lunarDay(S.theta);
              if (d === 22 || d === 23) return true;
              if (d < 22) return '지금은 음력 약 ' + d + '일이에요. 공전 방향(시계 반대 방향)으로 조금 더 돌려 보세요.';
              return '지금은 음력 약 ' + d + '일이에요. 너무 많이 돌렸어요! 조금 되돌려 보세요.';
            },
            explain: '음력 22~23일에 달은 7번 자리에 있어 <b>왼쪽 반</b>이 밝은 <b>하현달</b>이에요. 자정 무렵 동쪽에서 떠서 <b>해 뜰 무렵 남쪽 하늘</b>에서 보여요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  const winPoint = (L) => {
    if (modelOn()) return moonPos(L);
    const G = panelGeo(L);
    return { x: G.dx, y: G.dy };
  };
  function onWin() {
    fxBurst(winPoint);
    winPop((L) => { const p = winPoint(L); return { x: p.x + 30 * L.fs, y: p.y - 30 * L.fs }; });
  }
  S.dayV = dayTheta(S.day); S.selC = (S.day - 1) % 7; S.selR = Math.floor((S.day - 1) / 7);
  let lastKey = phaseKey(S.theta);
  SciSim.loop((dt, t) => {
    if (S.playing) setTheta(S.theta + 30 * dt);
    // 화면에 그리는 값이 실제 값을 부드럽게 따라가요
    S.thV = REDUCE ? S.theta : angApproach(S.thV, S.theta, dt, S.playing ? 40 : 16);
    S.dayV = REDUCE ? dayTheta(S.day) : angApproach(S.dayV, dayTheta(S.day), dt, 14);
    S.selC = REDUCE ? (S.day - 1) % 7 : approach(S.selC, (S.day - 1) % 7, dt, 18);
    S.selR = REDUCE ? Math.floor((S.day - 1) / 7) : approach(S.selR, Math.floor((S.day - 1) / 7), dt, 18);
    S.lift.target = S.dragging ? 1.55 : 1; S.lift.update(dt);
    const nm = phaseKey(curTheta());
    if (nm !== S.nameKey) { S.nameKey = nm; S.nameT = SciSim.time(); }
    if (modelOn()) {
      if (S.spots) {
        const k = spotAt(S.theta);
        if (k >= 0 && !S.visit.has(k)) {
          S.visit.add(k); S.spotT[k] = SciSim.time(); Sound.tone(880, 0.12, 'triangle', 0.08);
          fxBurst((L) => { const a = SPOTS[k] * DEG; return { x: L.cx + (R - 38) * Math.cos(a), y: L.cy - (R - 38) * Math.sin(a) }; }, { count: 14, speed: 120, size: 3, gravity: 40, life: 0.7 });
        }
      }
      const key = phaseKey(S.theta);
      if (S.four && !S.playing) {
        if (key === S.holdKey) S.holdT += dt; else { S.holdKey = key; S.holdT = 0; }
        if (FOUR.indexOf(key) >= 0 && S.holdT >= 0.4 && !S.made.has(key)) {
          S.made.add(key); Sound.tone(880, 0.12, 'triangle', 0.08);
          fxBurst((L) => moonPos(L), { count: 12, speed: 110, size: 3, gravity: 40, life: 0.7 });
        }
      }
      if (key !== lastKey) { if (!S.playing) Sound.tick(); lastKey = key; }
    }
    watchGame(onWin);
    fxStep(dt);
    views.forEach(({ v, L }) => { if (v.canvas.offsetWidth > 0) draw(v, L, t); });
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, game: () => game, setTheta, selectDay, moonPos, calGeo, panelGeo, views, norm, phaseKey,
    active() { return views.find((q) => q.v.canvas.offsetWidth > 0) || views[0]; },
    client(x, y) { const V = this.active(), r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
  };
})();
