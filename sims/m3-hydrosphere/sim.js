/* =========================================================
   중3 Ⅲ. 수권과 해수의 순환 - 수권의 분포와 물의 가치  [9과18-01]
   수권에서 해수, 담수, 빙하의 분포와 활용 사례를 조사하고,
   자원으로서 물의 가치에 대해 토론할 수 있다.
   ① 관찰: 지구의 물 1 L 모형 → ② 탐구: 활용 사례와 우리나라 물 자료
   → ③ 모형: 지하수 단면 → ④ 적용: 우리 마을 물 지키기
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, fmt, Sound, toast } = SciSim;
  const EA = SciSim.ease, RM = !!SciSim.reduceMotion;
  const approach = SciSim.approach;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 840 : 540;
  const FS = PHONE ? 1.15 : 1;
  const fz = (n) => Math.round(n * FS * 2) / 2;
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#dcecf7' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();     // 화면 좌표 (이름표 등)
  const FXL = new SciSim.Particles();    // 플라스크 왼쪽 장면 좌표
  const FXS = new SciSim.Particles();    // 파노라마 좌표
  const FXG = new SciSim.Particles();    // 지하수 단면 좌표
  const FXV = new SciSim.Particles();    // 마을 좌표
  const mixC = SciSim.color.mix, rgba = SciSim.color.rgba, shade = SciSim.color.shade;
  let game = null;
  const gHas = (n) => !!(game && game.has(n));
  const isNew = (n) => !!(game && game.isNew(n));

  /* ---------- 작은 도우미 ---------- */
  const mulberry = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function grad(x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  }
  function T(x, y, str, size, color, o) {
    o = o || {};
    D.text(x, y, str, Object.assign({ size: fz(size), color: color || '#1b2333', weight: 800 }, o));
  }
  function pill(x, y, text, bg, fg, size, o) {
    return D.label(x, y, text, Object.assign({ bg: bg || '#1b2333', color: fg || '#fff', size: fz(size || 13) }, o || {}));
  }
  function rr(x, y, w, h, r) { D.roundRect(x, y, w, h, r); }
  function newRing(x, y, w, h) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.strokeStyle = 'rgba(139,92,246,' + (0.35 + a * 0.5) + ')'; ctx.lineWidth = 4;
    rr(x - 6, y - 6, w + 12, h + 12, 16); ctx.stroke();
    ctx.fillStyle = '#8b5cf6'; rr(x + w - 40, y - 16, 50, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NEW', x + w - 15, y);
    ctx.restore();
  }
  function wavePath(x0, x1, yf, step) {
    ctx.beginPath();
    for (let x = x0; x <= x1 + 0.1; x += step) { const y = yf(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  }
  // 정적 배경 캐시(offscreen)
  function makeCache(w, h, k, fn) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    const cx = c.getContext('2d');
    cx.scale(k, k);
    fn(cx, SciSim.draw(cx));
    return c;
  }
  function pointIn(p, r, pad) { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; }
  // 숫자판 넘기기 도우미: 숫자 하나가 위로 넘어가며 바뀌는 칸
  function rollDigits(x, y, value, w, h, o) {
    o = o || {};
    const s = String(Math.floor(value)).padStart(o.pad || 2, '0');
    const frac = value - Math.floor(value);
    const n = s.length;
    for (let i = 0; i < n; i++) {
      const cx0 = x + i * (w + 4);
      ctx.save();
      D.roundRect(cx0, y, w, h, 6); ctx.fillStyle = o.bg || '#0f172a'; ctx.fill();
      ctx.clip();
      const last = i === n - 1;
      const cur = +s[i];
      const off = last ? EA.inOutCubic(Math.max(0, (frac - 0.55) / 0.45)) * h : 0;
      ctx.font = D.font(h * 0.7, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = o.color || '#fde68a';
      ctx.fillText(String(cur), cx0 + w / 2, y + h / 2 + 1 - off);
      if (off > 0) ctx.fillText(String((cur + 1) % 10), cx0 + w / 2, y + h / 2 + 1 + h - off);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(cx0, y, w, h / 2);
      ctx.restore();
    }
  }

  /* ---------- 상태 ---------- */
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 3600);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  let SCENE = 'flask';                // 지금 보이는 장면
  let prevScene = null, trans = 1;    // 장면 전환(크로스페이드)
  const SCENE_BY_LEVEL = ['flask', 'survey', 'ground', 'village'];
  const SCENE_NAME = {
    flask: '🧪 지구의 물 1 L 모형', survey: '🗂️ 물의 활용 사례 조사', ground: '⛰️ 바닷가 마을의 지하수 단면', village: '🏘️ 우리 마을 물 관리 계획',
  };

  /* =========================================================
     장면 1 · 지구의 물 1 L (flask)
     ========================================================= */
  const GL = { cx: 140, cy: 205, r: 105 };
  const CYL = { x: 280, w: 120, top: 90, bot: 470, k: 0.38 };       // 0.38 px/mL
  const CUP = { x: 470, w: 100, top: 300, bot: 470, k: 0.34 };       // 0.34 px/mL, 0~500 mL
  const LL = PHONE ? { s: 0.86, x: 8, y: 22 } : { s: 1, x: 0, y: 0 };   // 왼쪽 장면 변환
  const PIPE = [[CYL.x + CYL.w - 2, 130], [520, 130], [520, 290]];
  const PN = PHONE
    ? { x: 10, y: 470, w: 580, h: 366, cx: [120, 300, 480], tubeTop: 504, tubeBot: 656, tubeW: 40, slotY: 696, slotW: 110, slotH: 58, trayY: 770, trayCx: [150, 300, 450], title: 490 }
    : { x: 604, y: 74, w: 192, h: 400, cx: [640, 700, 760], tubeTop: 142, tubeBot: 298, tubeW: 34, slotY: 352, slotW: 60, slotH: 56, trayY: 414, trayCx: [636, 700, 764], title: 98 };
  const TUBE_ML = [17.6, 7.6, 0.1];
  const TUBE_NAME = ['빙하', '지하수', '호수·하천수'];
  const PXML = 8;                                                    // 시험관 1 mL = 8 px

  const F = {
    mode: 1,                  // 1: 예측·확인, 2: 담수 나누기, 3: 퀴즈
    poured: false, pourT: 99, level: 1000, slosh: 0, sloshT: 0,
    pred: 300, revealing: false, revealT: 0, revealDone: false, cupMl: 0, num: 0, lensK: 0,
    ghost: false, dragH: false, predSpring: new SciSim.Spring(300, { stiffness: 220, damping: 20 }),
    panelK: new SciSim.Spring(0, { stiffness: 140, damping: 18 }), seqT: -1, cupRot: 0, cupK: 1,
    placedOk: 0, gold: 0, tw: [], valve: 0,
    chips: [],
  };
  const CHIPS = [
    { key: 'ground', emoji: '⛰️', lines: ['지하수'], target: 1 },
    { key: 'lake', emoji: '🏞️', lines: ['호수·', '하천수'], target: 2 },
    { key: 'ice', emoji: '🧊', lines: ['빙하'], target: 0 },
  ];
  const CHIP_FB = {
    lake: ['호수와 강물이 그렇게 많을까요? 담수의 대부분은 극지방·높은 산의 얼음이에요.', '땅속 물보다 호수·하천수가 더 많을까요? 호수와 하천수는 훨씬 적어요.', ''],
    ice: ['', '모래알 사이를 채운 물이 보이나요? 얼음은 담수 중 가장 큰 17.6 mL 쪽이에요.', '겨우 두 방울이에요. 담수에서 가장 큰 몫은 얼음이에요.'],
    ground: ['얼음이 보이나요? 땅속 물은 모래알 사이를 채우고 있어요.', '', '두 방울보다는 훨씬 많아요. 모래 사이에 스며 있는 물이에요.'],
  };
  // 시험관·슬롯·이름표 위치
  function slotRect(i) { return { x: PN.cx[i] - PN.slotW / 2, y: PN.slotY, w: PN.slotW, h: PN.slotH }; }
  function trayPos(i) { return { x: PN.trayCx[i], y: PN.trayY + 30 }; }
  function initChips() {
    F.chips = CHIPS.map((c, i) => {
      const p = trayPos(i);
      return Object.assign({}, c, { i, sx: new SciSim.Spring(p.x, { stiffness: 170, damping: 18 }), sy: new SciSim.Spring(p.y, { stiffness: 170, damping: 18 }),
        x: p.x, y: p.y, drag: false, lift: 0, tilt: 0, placed: -1, shake: 0, ring: 0, vx: 0 });
    });
    F.placedOk = 0;
  }
  initChips();

  function flaskPourStart() {
    F.mode = 1; F.poured = true; F.pourT = 0; F.level = 0; F.slosh = 0; F.sloshT = 99;
    resetReveal();
  }
  function resetReveal() {
    F.revealing = false; F.revealT = 0; F.revealDone = false; F.cupMl = 0; F.num = 0; F.lensK = 0; F.ghost = false; F.seqT = -1;
    F.panelK.value = F.panelK.target = 0; F.cupRot = 0; F.valve = 0;
    F.tw = [0, 0, 0]; initChips();
    if (F.pourT >= 99) { F.level = 1000; }
  }
  function flaskMode(m) {
    if (!F.poured) { F.poured = true; F.pourT = 99; F.level = 1000; }
    F.mode = m;
    if (m === 1) { resetReveal(); }
    else {
      // 담수 25 mL를 얻은 상태에서 시작
      F.revealing = false; F.revealDone = true; F.level = 975; F.cupMl = 25; F.num = 25; F.lensK = 0; F.ghost = true; F.revealT = 1;
      F.tw = [0, 0, 0]; F.panelK.target = 1; F.panelK.value = RM ? 1 : 0; initChips();
      if (m === 2) { F.seqT = 0; F.cupK = 1; }
      else { F.seqT = 99; F.tw = [1, 1, 1]; F.cupMl = 0; F.panelK.value = 1; F.chips.forEach((c) => { c.placed = c.target; const s = slotRect(c.target); c.x = c.sx.value = c.sx.target = s.x + s.w / 2; c.y = c.sy.value = c.sy.target = s.y + s.h / 2; }); F.placedOk = 3; }
    }
  }
  function startReveal() {
    if (F.mode !== 1 || F.revealing) return;
    F.revealing = true; F.revealT = 0; F.revealDone = false; F.cupMl = 0; F.num = 0; F.lensK = 0; F.ghost = true; F.level = 1000;
    hideHint(); Sound.click();
    if (F.pred >= 100) toast('많은 사람이 담수를 실제보다 훨씬 많게 예측해요!', null, 2600);
  }
  // 측정값(미션 상태에서 쓰임)
  function updateFlask(dt, t) {
    // 지구에서 메스실린더로 물 붓기
    if (F.pourT < 99) {
      F.pourT += dt * (RM ? 3 : 1);
      F.level = 1000 * EA.outCubic(clamp(F.pourT / 1.6, 0, 1));
      if (F.pourT < 1.6 && Math.random() < 0.9) {
        FXL.emit({ x: 340 + (Math.random() - 0.5) * 10, y: 462 - 0.38 * F.level - 4, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60, life: 0.5, size: 2.2, color: '#9fd8ff', gravity: 340 });
      }
      if (F.pourT >= 1.6) { F.pourT = 99; F.sloshT = 0; }
    }
    if (F.sloshT < 50) F.sloshT += dt;
    F.slosh = F.sloshT < 1.2 && !RM ? 6 * (1 - F.sloshT / 1.2) : 0;
    // 예측 손잡이
    F.predSpring.target = F.pred; F.predSpring.update(dt);
    // 확인 연출
    if (F.revealing) {
      F.revealT += dt / 2.2;
      const k = EA.inOutCubic(clamp(F.revealT / 0.9 - 0.1, 0, 1));
      F.cupMl = 25 * clamp((F.revealT - 0.12) / 0.7, 0, 1);
      F.level = 1000 - F.cupMl;
      F.num = F.cupMl;
      F.valve += dt * 6;
      if (F.revealT > 0.12 && F.revealT < 0.85 && Math.random() < 0.7) {
        FXL.emit({ x: 520 + (Math.random() - 0.5) * 3, y: CUP.bot - CUP.k * F.cupMl - 3, vx: (Math.random() - 0.5) * 50, vy: -40 - Math.random() * 40, life: 0.35, size: 1.8, color: '#7cc7f5', gravity: 300 });
      }
      if (F.revealT >= 1) {
        F.revealing = false; F.revealDone = true; F.cupMl = 25; F.level = 975; F.num = 25; F.lensK = 0;
        Sound.success();
      }
    }
    if (F.revealDone && F.mode === 1) {
      F.lensK = approach(F.lensK, 1, dt, RM ? 60 : 5);
    } else F.lensK = approach(F.lensK, 0, dt, 12);
    // 담수 나누기 패널·시험관
    F.panelK.update(dt);
    if (F.mode >= 2 && F.seqT >= 0 && F.seqT < 50) {
      F.seqT += dt * (RM ? 6 : 1);
      const T0 = 0.6;
      let poured = 0;
      for (let i = 0; i < 3; i++) {
        const a = T0 + 0.8 * i;
        const p = clamp((F.seqT - a) / 0.8, 0, 1);
        if (p > 0 && F.tw[i] === 0) Sound.tick();
        F.tw[i] = p;
        poured += TUBE_ML[i] * (p >= 0.5 ? 1 : p / 0.5);
      }
      F.cupMl = Math.max(0, 25 - poured);
      F.cupRot = approach(F.cupRot, F.seqT > T0 - 0.2 && F.seqT < T0 + 2.5 ? -0.5 : 0, dt, 7);
      F.num = F.cupMl;
    }
    // 이름표
    F.chips.forEach((c) => {
      c.sx.update(dt); c.sy.update(dt);
      c.x = c.sx.value; c.y = c.sy.value;
      c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 18);
      c.tilt = approach(c.tilt, c.drag ? clamp(c.vx * 0.012, -0.08, 0.08) : 0, dt, 12);
      c.vx = approach(c.vx, 0, dt, 10);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      if (c.ring > 0) c.ring = Math.max(0, c.ring - dt);
    });
    // 퀴즈 정답 → 금색 강조
    const cur = game && game.current();
    const goldOn = !!(cur && cur._level === 0 && cur._index === 2 && game.phase === 'success');
    F.gold = approach(F.gold, goldOn ? 1 : 0, dt, 4);
  }

  /* ----- 지구본 (자전하는 대륙) ----- */
  let globeTex = null;
  function buildGlobeTex() {
    const W = 512, H = 256;
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H;
    const g = c.getContext('2d');
    const r = mulberry(7);
    const blobs = [];
    // 대륙 덩어리 (경도 0~512 안에서 반복)
    const seeds = [[70, 80, 60], [130, 150, 40], [210, 70, 45], [230, 140, 50], [250, 190, 25], [330, 80, 70], [370, 120, 45], [430, 170, 40], [60, 200, 22], [480, 60, 30], [300, 160, 28]];
    seeds.forEach((s) => { for (let i = 0; i < 16; i++) blobs.push([s[0] + (r() - 0.5) * s[2] * 1.5, s[1] + (r() - 0.5) * s[2], 8 + r() * s[2] * 0.5]); });
    for (let rep = 0; rep < 2; rep++) {
      g.save(); g.translate(rep * W, 0);
      g.fillStyle = '#5fae5a';
      blobs.forEach((b) => { g.beginPath(); g.arc(b[0], b[1], b[2], 0, 6.283); g.fill(); g.beginPath(); g.arc(b[0] - W, b[1], b[2], 0, 6.283); g.fill(); });
      g.fillStyle = 'rgba(190,160,90,.45)';
      blobs.forEach((b, i) => { if (i % 3 === 0) { g.beginPath(); g.arc(b[0] + 3, b[1] + 3, b[2] * 0.55, 0, 6.283); g.fill(); } });
      g.fillStyle = '#f3f8ff'; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 12, W, 12);   // 극지방 얼음
      g.restore();
    }
    return c;
  }
  function drawGlobe(t) {
    const { cx, cy, r } = GL;
    if (!globeTex) globeTex = buildGlobeTex();
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#0b3a82'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill(); }, { blur: 18, y: 8, color: 'rgba(15,35,70,.35)' });
    // 대기 광채
    const gl = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.22);
    gl.addColorStop(0, 'rgba(120,190,255,.45)'); gl.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, r * 1.22, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.clip();
    const og = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    og.addColorStop(0, '#2f8fe0'); og.addColorStop(1, '#0b3a82');
    ctx.fillStyle = og; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // 대륙: 세로 띠로 나눠 구면처럼 보이게 (20초에 한 바퀴)
    const rot = RM ? 0.3 : (t / 20) % 1;
    const strip = 3;
    for (let dx = -r; dx < r; dx += strip) {
      const u = (dx + strip / 2) / r;
      const lon = Math.asin(clamp(u, -0.999, 0.999));
      const chord = Math.sqrt(Math.max(0, r * r - (dx + strip / 2) * (dx + strip / 2)));
      const sx = (((lon / Math.PI + 0.5) * 0.5 + rot) % 1) * 512;
      ctx.drawImage(globeTex, sx, 0, 4, 256, cx + dx, cy - chord, strip + 0.6, chord * 2);
    }
    // 밤 쪽 그늘과 하이라이트
    const sh = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.2, cx + r * 0.15, cy + r * 0.2, r * 1.15);
    sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(5,15,40,.55)');
    ctx.fillStyle = sh; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    T(cx, cy + r + 34, '🌍 지구의 모든 물(수권)', 15, '#0b3a82');
  }

  /* ----- 메스실린더 ----- */
  function drawCylinder(t) {
    const x0 = CYL.x, w = CYL.w, top = CYL.top, bot = CYL.bot;
    const yS = bot - CYL.k * F.level;
    ctx.save();
    // 바닥 그림자
    ctx.fillStyle = 'rgba(15,35,70,.18)'; ctx.beginPath(); ctx.ellipse(x0 + w / 2, bot + 8, w * 0.62, 9, 0, 0, 6.283); ctx.fill();
    // 유리 몸통
    D.shadow(() => { rr(x0, top, w, bot - top, 10); ctx.fillStyle = 'rgba(236,246,255,.55)'; ctx.fill(); }, { blur: 14, y: 4, color: 'rgba(15,35,70,.18)' });
    // 물
    if (F.level > 0.5) {
      ctx.save();
      rr(x0 + 3, top, w - 6, bot - top - 3, 8); ctx.clip();
      const A = 1.5 + F.slosh, ph = t * 2.2;
      ctx.beginPath();
      for (let x = x0; x <= x0 + w; x += 4) {
        const y = yS + A * Math.sin(x * 0.09 + ph) * Math.cos(F.sloshT * 7) * (F.slosh > 0.05 ? 1 : 0.6) + 1.2 * Math.sin(x * 0.17 - ph * 1.3);
        x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(x0 + w, bot); ctx.lineTo(x0, bot); ctx.closePath();
      ctx.fillStyle = grad(0, yS, 0, bot, [[0, 'rgba(70,178,222,.95)'], [0.45, 'rgba(18,120,170,.96)'], [1, 'rgba(8,70,120,.98)']]);
      ctx.fill();
      // 수면 하이라이트
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = x0; x <= x0 + w; x += 4) { const y = yS + 1.2 * Math.sin(x * 0.17 - ph * 1.3) + 0.5; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      // 소금(짠물)을 뜻하는 반짝임 12개
      for (let i = 0; i < 12; i++) {
        const px = x0 + 14 + ((i * 53) % (w - 28)), py = bot - 24 - ((i * 97) % Math.max(10, CYL.k * F.level - 30));
        if (py < yS + 8) continue;
        const a = RM ? 0.5 : 0.35 + 0.55 * Math.max(0, Math.sin(t * 2.1 + i * 1.7));
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath(); ctx.arc(px, py, 1.6 + a, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }
    // 유리 테두리 · 하이라이트
    rr(x0, top, w, bot - top, 10); ctx.strokeStyle = 'rgba(120,150,185,.9)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = grad(x0, 0, x0 + 12, 0, [[0, 'rgba(255,255,255,.85)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(x0 + 5, top + 10, 12, bot - top - 26);
    ctx.fillStyle = grad(x0 + w - 18, 0, x0 + w - 8, 0, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.6)']]); ctx.fillRect(x0 + w - 18, top + 10, 8, bot - top - 26);
    // 눈금 (100 mL마다)
    ctx.strokeStyle = 'rgba(40,60,90,.8)'; ctx.lineWidth = 1.5;
    for (let m = 100; m <= 900; m += 100) {
      const y = bot - CYL.k * m, major = m % 500 === 0;
      ctx.beginPath(); ctx.moveTo(x0 + w, y); ctx.lineTo(x0 + w - (major ? 24 : 14), y); ctx.stroke();
    }
    ctx.restore();
    T(x0 + w + 6, bot - CYL.k * 500 + 5, '500', 13, '#33415c', { align: 'left' });
    T(x0 + w + 6, top + 26 - 8 + 4, '1000', 13, '#33415c', { align: 'left' });
    // 안쪽 이름표
    if (F.level > 30) {
      const ly = clamp((yS + bot) / 2 - 14, yS + 20, bot - 40);
      if (F.revealDone || F.revealing) {
        T(x0 + w / 2, ly, '🧂 해수', 16, '#ffffff', { stroke: 'rgba(5,40,80,.7)', strokeWidth: 4 });
        T(x0 + w / 2, ly + 22, fmt(Math.round(F.level)) + ' mL', 16, '#ffffff', { stroke: 'rgba(5,40,80,.7)', strokeWidth: 4 });
      } else {
        T(x0 + w / 2, ly, '지구의 물', 16, '#ffffff', { stroke: 'rgba(5,40,80,.7)', strokeWidth: 4 });
        T(x0 + w / 2, ly + 22, fmt(Math.round(F.level)) + ' mL', 16, '#ffffff', { stroke: 'rgba(5,40,80,.7)', strokeWidth: 4 });
      }
    }
  }

  /* ----- 지구 → 메스실린더 물줄기(리본) ----- */
  function bez(p0, p1, p2, p3, u) {
    const a = 1 - u;
    return [a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * p3[0], a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * p3[1]];
  }
  function drawPourRibbon(t) {
    if (F.pourT >= 1.6 || F.pourT <= 0) return;
    const p0 = [GL.cx + GL.r * 0.8, GL.cy - GL.r * 0.55], p1 = [260, 118], p2 = [310, 70], p3 = [340, 96];
    const fade = clamp((1.6 - F.pourT) / 0.25, 0, 1) * clamp(F.pourT / 0.12, 0, 1);
    ctx.save(); ctx.globalAlpha = fade; ctx.lineCap = 'round';
    const N = 26;
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N;
      const a = bez(p0, p1, p2, p3, u0), b = bez(p0, p1, p2, p3, u1);
      ctx.strokeStyle = '#2d9ad8'; ctx.lineWidth = lerp(14, 5, u0);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.5; ctx.setLineDash([9, 15]); ctx.lineDashOffset = -t * 90;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const a = bez(p0, p1, p2, p3, i / N); i ? ctx.lineTo(a[0], a[1] - 1.5) : ctx.moveTo(a[0], a[1] - 1.5); }
    ctx.stroke(); ctx.setLineDash([]);
    // 열린 입구에서 수면까지 떨어지는 가는 물줄기
    ctx.strokeStyle = '#2d9ad8'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(p3[0], p3[1]); ctx.lineTo(p3[0], Math.max(p3[1] + 4, CYL.bot - CYL.k * F.level)); ctx.stroke();
    // 물방울 6개
    for (let i = 0; i < 6; i++) {
      const u = ((t * 0.9 + i / 6) % 1), a = bez(p0, p1, p2, p3, u);
      D.sphere(a[0], a[1], lerp(6, 3, u), '#7cc7f5', { gloss: true });
    }
    ctx.restore();
  }

  /* ----- 담수 컵 + 파이프 ----- */
  function cupY(ml) { return CUP.bot - CUP.k * ml; }
  function drawPipe(t) {
    const a = 1 - F.panelK.value;
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const path = () => { ctx.beginPath(); PIPE.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
    path(); ctx.strokeStyle = '#7d8ba0'; ctx.lineWidth = 11; ctx.stroke();
    path(); ctx.strokeStyle = '#dbe4ef'; ctx.lineWidth = 7; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.translate(-1.5, -1.5); ctx.stroke(); ctx.translate(1.5, 1.5);
    if (F.revealing) {
      path(); ctx.strokeStyle = '#2f9bde'; ctx.lineWidth = 4; ctx.setLineDash([7, 12]); ctx.lineDashOffset = -t * 120; ctx.stroke(); ctx.setLineDash([]);
    }
    // 밸브 바퀴
    ctx.translate(PIPE[0][0] + 14, PIPE[0][1]); ctx.rotate(F.valve);
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) { ctx.rotate(2.0944); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.stroke(); }
    ctx.restore();
    // 떨어지는 물줄기
    if (F.revealing && F.revealT > 0.1 && F.revealT < 0.9) {
      ctx.save(); ctx.strokeStyle = '#4fb0ea'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(PIPE[2][0], PIPE[2][1]); ctx.lineTo(PIPE[2][0], cupY(F.cupMl) - 1); ctx.stroke(); ctx.restore();
    }
  }
  function drawCup(t) {
    const x0 = CUP.x, w = CUP.w, top = CUP.top, bot = CUP.bot;
    ctx.save();
    // 컵이 기울어지는 연출(왼쪽 장면 + 담수 나누기)
    if (F.cupRot) { ctx.translate(x0 + w, top); ctx.rotate(F.cupRot); ctx.translate(-(x0 + w), -top); }
    if (!F.cupRot) { ctx.fillStyle = 'rgba(15,35,70,.16)'; ctx.beginPath(); ctx.ellipse(x0 + w / 2, bot + 7, w * 0.6, 8, 0, 0, 6.283); ctx.fill(); }
    D.shadow(() => {
      ctx.beginPath(); ctx.moveTo(x0 - 2, top); ctx.lineTo(x0 + 6, bot); ctx.lineTo(x0 + w - 6, bot); ctx.lineTo(x0 + w + 2, top); ctx.closePath();
      ctx.fillStyle = 'rgba(236,246,255,.6)'; ctx.fill();
    }, { blur: 10, y: 3, color: 'rgba(15,35,70,.16)' });
    // 예측 띠
    const py = cupY(F.predSpring.value);
    if (canPredict()) {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x0 - 2, top); ctx.lineTo(x0 + 6, bot); ctx.lineTo(x0 + w - 6, bot); ctx.lineTo(x0 + w + 2, top); ctx.closePath(); ctx.clip();
      ctx.fillStyle = 'rgba(250,204,21,.38)'; ctx.fillRect(x0 - 4, py, w + 8, bot - py);
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0 - 4, py); ctx.lineTo(x0 + w + 4, py); ctx.stroke();
      ctx.restore();
    }
    // 담수(파랑)
    if (F.cupMl > 0.05) {
      const yw = cupY(F.cupMl);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x0 + 0.5, top); ctx.lineTo(x0 + 6, bot - 1); ctx.lineTo(x0 + w - 6, bot - 1); ctx.lineTo(x0 + w - 0.5, top); ctx.closePath(); ctx.clip();
      ctx.fillStyle = grad(0, yw, 0, bot, [[0, 'rgba(150,215,245,.95)'], [1, 'rgba(70,170,225,.95)']]);
      wavePath(x0, x0 + w, (x) => yw + 1.2 * Math.sin(x * 0.2 + t * 3), 4); ctx.lineTo(x0 + w, bot); ctx.lineTo(x0, bot); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(x0 - 2, top); ctx.lineTo(x0 + 6, bot); ctx.lineTo(x0 + w - 6, bot); ctx.lineTo(x0 + w + 2, top);
    ctx.strokeStyle = 'rgba(120,150,185,.95)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 8, top + 8); ctx.lineTo(x0 + 12, bot - 14); ctx.stroke();
    // 눈금
    ctx.strokeStyle = 'rgba(40,60,90,.75)'; ctx.lineWidth = 1.5;
    for (let m = 100; m <= 500; m += 100) {
      const y = cupY(m); ctx.beginPath(); ctx.moveTo(x0 + w - 6 + (top - y) * 0.0, y); ctx.lineTo(x0 + w - 6 - 12, y); ctx.stroke();
    }
    ctx.restore();
    if (!F.cupRot || F.cupRot > -0.05) {
      T(x0 + w / 2, bot + 28, '담수 컵', 14, '#33415c');
      [100, 300, 500].forEach((m) => T(x0 + w + 6, cupY(m) + 5, m + '', 13, '#33415c', { align: 'left' }));
    }
    // 예측 손잡이와 말풍선
    if (F.mode === 1) {
      const showHandle = !F.revealing && !F.revealDone;
      if (showHandle) {
        const hp = 1 + 0.05 * Math.sin(t * 5);
        ctx.save(); ctx.translate(x0 - 22, py);
        D.shadow(() => { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(0, -15 * hp); ctx.lineTo(-14, -15 * hp); ctx.lineTo(-14, 15 * hp); ctx.lineTo(0, 15 * hp); ctx.closePath(); ctx.fill(); }, { blur: F.dragH ? 12 : 6, y: F.dragH ? 6 : 3 });
        ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-8, 6); ctx.moveTo(-3, -6); ctx.lineTo(-3, 6); ctx.stroke();
        ctx.restore();
        pill(x0 + w / 2, py - 20, '내 예측 ' + Math.round(F.predSpring.value) + ' mL', '#b45309', '#fff', 14);
      } else if (F.ghost) {
        ctx.save(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]);
        ctx.beginPath(); ctx.moveTo(x0 - 10, py); ctx.lineTo(x0 + w + 10, py); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        pill(x0 + w / 2, py - 16, '내 예측 ' + F.pred + ' mL', 'rgba(180,83,9,.92)', '#fff', 13);
      }
    }
    if (F.revealDone && F.mode === 1) {
      pill(x0 + w / 2, cupY(Math.max(F.cupMl, 25)) + 16 > bot - 14 ? bot - 40 : cupY(25) + 14, '실제 ' + Math.round(F.num) + ' mL', '#0b6aa8', '#fff', 14);
    }
  }
  function drawLens(t) {
    const k = F.lensK;
    if (k < 0.02) return;
    const cx = 660, cy = 232, r = 64 * k;
    ctx.save();
    ctx.translate(cx, cy);
    // 손잡이
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 11 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.7); ctx.lineTo(-r * 1.55, r * 1.55); ctx.stroke();
    D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fillStyle = '#fffdf3'; ctx.fill(); }, { blur: 14, y: 5 });
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 3, 0, 6.283); ctx.clip();
    ctx.fillStyle = grad(0, -r, 0, r, [[0, '#f4fbff'], [1, '#d7edfb']]); ctx.fillRect(-r, -r, 2 * r, 2 * r);
    // 확대한 컵 바닥 (물 25 mL)
    ctx.fillStyle = 'rgba(70,170,225,.95)'; ctx.fillRect(-r, r * 0.35, 2 * r, r);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-r, r * 0.35, 2 * r, 3);
    ctx.restore();
    ctx.strokeStyle = grad(-r, -r, r, r, [[0, '#f5c14d'], [1, '#b8791b']]); ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.5, r * 0.22, r * 0.11, -0.7, 0, 6.283); ctx.fill();
    ctx.restore();
    if (k > 0.6) {
      const a = clamp((k - 0.6) / 0.4, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      T(cx, cy - 8, '겨우 25 mL!', 19, '#c2410c');
      T(cx, cy + 16, '(전체의 2.5 %)', 14, '#33415c');
      ctx.restore();
    }
  }

  /* ----- 담수 25 mL 확대 패널(시험관 3개) ----- */
  function tubePath(cx, top, w, h) {
    const x = cx - w / 2, r = w / 2;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + h - r); ctx.arc(cx, top + h - r, r, Math.PI, 0, true); ctx.lineTo(x + w, top);
  }
  function drawTube(i, t) {
    const cx = PN.cx[i], top = PN.tubeTop, bot = PN.tubeBot, w = PN.tubeW, h = bot - top;
    const prog = EA.outCubic(clamp((F.tw[i] - 0.4) / 0.6, 0, 1));            // 붓는 동안 차오름
    const hh = TUBE_ML[i] * PXML * prog;
    const gold = F.gold * (i > 0 ? 1 : 0);
    ctx.save();
    // 안쪽 내용물
    if (i === 2) {
      // 물방울 두 개 (확대 렌즈 안에서)
      if (F.tw[i] > 0) {
        const lensR = 22 * clamp(F.tw[i] * 2, 0, 1);
        const fall = clamp(F.tw[i] / 0.55, 0, 1);
        const dy = lerp(top + 10, bot - 10, EA.inCubic(fall));
        const sq = fall < 1 ? 1.35 : 1 - 0.3 * Math.exp(-(F.tw[i] - 0.55) * 12);
        for (let d = 0; d < 2; d++) {
          if (fall < 1 && d === 1 && fall < 0.25) continue;
          const yy = fall < 1 ? dy - d * 18 : bot - 8;
          const xx = cx + (fall < 1 ? 0 : (d ? 6 : -6));
          ctx.fillStyle = 'rgba(90,185,240,.95)';
          ctx.beginPath(); ctx.ellipse(xx, yy, 4.5 / Math.sqrt(sq), 5.5 * sq, 0, 0, 6.283); ctx.fill();
        }
        if (fall >= 1) {
          // 돋보기 원: 방울 확대
          const lx = cx, ly = bot - 58;
          ctx.save();
          D.shadow(() => { ctx.beginPath(); ctx.arc(lx, ly, lensR, 0, 6.283); ctx.fillStyle = '#f6fbff'; ctx.fill(); }, { blur: 8, y: 3 });
          ctx.beginPath(); ctx.arc(lx, ly, lensR - 2, 0, 6.283); ctx.clip();
          for (let d = 0; d < 2; d++) D.sphere(lx + (d ? 7 : -7), ly + 3 + (d ? -3 : 2), 9, '#4fb0ea');
          ctx.restore();
          ctx.strokeStyle = '#b8791b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(lx, ly, lensR, 0, 6.283); ctx.stroke();
          ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx + lensR * 0.7, ly + lensR * 0.7); ctx.lineTo(lx + lensR * 1.2, ly + lensR * 1.2); ctx.stroke();
        }
      }
    } else if (hh > 0.5) {
      ctx.save(); tubePath(cx, top, w - 3, h); ctx.lineTo(cx + w / 2, top); ctx.clip();
      const yTop = bot - hh;
      if (i === 0) {
        ctx.fillStyle = grad(0, yTop, 0, bot, [[0, '#eaf8ff'], [1, '#a9d8f0']]); ctx.fillRect(cx - w / 2, yTop, w, hh + 4);
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.3;
        for (let k = 0; k < 14; k++) { const yy = yTop + 8 + k * 11; ctx.beginPath(); ctx.moveTo(cx - w / 2, yy + 8); ctx.lineTo(cx + w / 2, yy - 6); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(80,150,200,.35)';
        for (let k = 0; k < 6; k++) { const yy = yTop + 14 + k * 21; ctx.beginPath(); ctx.moveTo(cx - 6, yy); ctx.lineTo(cx + 3, yy + 10); ctx.lineTo(cx + 8, yy + 4); ctx.stroke(); }
        const sp = (t * 0.9) % 1;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.9 - sp * 0.9) + ')';
        ctx.beginPath(); ctx.arc(cx - 6, yTop + 12 + sp * 60, 2.5, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = grad(0, yTop, 0, bot, [[0, 'rgba(120,195,240,.9)'], [1, 'rgba(60,150,215,.95)']]); ctx.fillRect(cx - w / 2, yTop, w, hh + 4);
        const rr2 = mulberry(31 + i);
        for (let k = 0; k < 34; k++) {
          const gx = cx - w / 2 + 3 + rr2() * (w - 6), gy = bot - 4 - rr2() * Math.min(hh - 4, 42);
          D.sphere(gx, gy, 3 + rr2() * 2.2, k % 3 ? '#caa56a' : '#a98650', { gloss: false });
        }
      }
      ctx.restore();
    }
    // 유리 테두리
    tubePath(cx, top, w, h);
    ctx.strokeStyle = gold > 0.05 ? 'rgba(234,179,8,' + (0.5 + 0.5 * gold) + ')' : 'rgba(120,150,185,.95)'; ctx.lineWidth = gold > 0.05 ? 2.5 + 3.5 * gold : 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - w / 2 + 5, top + 8); ctx.lineTo(cx - w / 2 + 5, bot - 18); ctx.stroke();
    ctx.restore();
    // 양 표시
    if (F.tw[i] > 0.75) T(cx, bot + 20, TUBE_ML[i] + ' mL', 14, '#1b2333');
  }
  function drawChip(c, t) {
    const w = 60, h = 54;
    ctx.save();
    const sc = 1 + 0.06 * c.lift;
    const shk = c.shake > 0 ? Math.sin(c.shake * 60) * 6 * (c.shake / 0.3) : 0;
    ctx.translate(c.x + shk, c.y - 24 * c.lift); ctx.rotate(c.tilt); ctx.scale(sc, sc);
    if (c.ring > 0) {
      const k = 1 - c.ring / 0.5;
      ctx.strokeStyle = 'rgba(22,163,74,' + (1 - k) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 14 + 40 * k, 0, 6.283); ctx.stroke();
    }
    D.shadow(() => { rr(-w / 2, -h / 2, w, h, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 6 + 8 * c.lift, y: 2 + 5 * c.lift });
    rr(-w / 2, -h / 2, w, h, 12); ctx.strokeStyle = c.placed >= 0 ? '#16a34a' : '#8b5cf6'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.font = D.font(20, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(c.emoji, 0, -14);
    ctx.textBaseline = 'alphabetic';
    c.lines.forEach((ln, k) => T(0, 6 + k * 14 + (c.lines.length === 1 ? 6 : 0), ln, 13, '#1b2333'));
    ctx.restore();
  }
  function drawPanel(t) {
    const k = F.panelK.value;
    if (k < 0.01) return;
    ctx.save();
    if (PHONE) { ctx.translate(0, (1 - k) * 120); } else { ctx.translate((1 - k) * 220, 0); }
    ctx.globalAlpha = clamp(k * 1.4, 0, 1);
    D.shadow(() => { rr(PN.x, PN.y, PN.w, PN.h, 16); ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fill(); }, { blur: 14, y: 5 });
    T(PN.x + PN.w / 2, PN.title, '🔍 담수 25 mL 확대', 14, '#0b3a82');
    for (let i = 0; i < 3; i++) drawTube(i, t);
    // 슬롯
    for (let i = 0; i < 3; i++) {
      const s = slotRect(i);
      const filled = F.chips.some((c) => c.placed === i);
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = filled ? 'rgba(22,163,74,.9)' : '#8b9cb3'; ctx.lineWidth = 2;
      rr(s.x, s.y, s.w, s.h, 12); ctx.stroke(); ctx.restore();
      if (!filled && F.seqT > 3) {
        const a = 0.35 + 0.35 * Math.sin(t * 7.5);
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(139,92,246,.25)'; rr(s.x, s.y, s.w, s.h, 12); ctx.fill(); ctx.restore();
      }
    }
    F.chips.forEach((c) => { if (!c.drag) drawChip(c, t); });
    F.chips.forEach((c) => { if (c.drag) drawChip(c, t); });
    ctx.restore();
  }
  function drawGoldLabel(t) {
    if (F.gold < 0.05) return;
    ctx.save(); ctx.globalAlpha = F.gold;
    pill(PN.x + PN.w / 2, PN.tubeBot + 40, '약 7.7 mL (0.77 %)', '#a16207', '#fff', 13);
    ctx.restore();
  }

  function drawFlask(t) {
    // 배경: 하늘색 → 연한 바다색
    ctx.fillStyle = grad(0, 0, 0, VH, [[0, '#d9ecfa'], [1, '#bcdcf0']]); ctx.fillRect(0, 0, VW, VH);
    ctx.save();
    ctx.translate(LL.x, LL.y); ctx.scale(LL.s, LL.s);
    // 지구에서 메스실린더로 가는 점선 안내(붓기 전)
    drawGlobe(t);
    drawCylinder(t);
    drawPourRibbon(t);
    drawPipe(t);
    drawCup(t);
    drawLens(t);
    FXL.draw(ctx);
    ctx.restore();
    drawPanel(t);
    drawGoldLabel(t);
    FX.draw(ctx);
  }

  // 포인터: 예측 손잡이, 이름표
  const fToL = (p) => ({ x: (p.x - LL.x) / LL.s, y: (p.y - LL.y) / LL.s });
  function flaskDown(p) {
    if (F.mode === 1 && !F.revealing && !F.revealDone) {
      const q = fToL(p);
      if (q.x > CUP.x - 50 && q.x < CUP.x + CUP.w + 20 && q.y > CUP.top - 40 && q.y < CUP.bot + 20) {
        F.dragH = true; flaskMoveH(p); return true;
      }
    }
    if (F.mode >= 2 && F.seqT > 3) {
      for (let i = F.chips.length - 1; i >= 0; i--) {
        const c = F.chips[i];
        if (c.placed >= 0) continue;
        if (Math.abs(p.x - c.x) < 38 && Math.abs(p.y - c.y) < 36) {
          c.drag = true; F.dragChip = c; c.off = { x: c.x - p.x, y: c.y - p.y }; hideHint(); Sound.tick();
          return true;
        }
      }
    }
    return false;
  }
  function flaskMoveH(p) {
    const q = fToL(p);
    const ml = clamp(Math.round((CUP.bot - q.y) / CUP.k / 5) * 5, 0, 500);
    setPred(ml);
  }
  function flaskMove(p) {
    if (F.dragH) { flaskMoveH(p); return; }
    const c = F.dragChip;
    if (c) {
      const nx = p.x + c.off.x, ny = p.y + c.off.y;
      c.vx = nx - c.sx.target;
      c.sx.target = nx; c.sy.target = ny; c.sx.value = lerp(c.sx.value, nx, 0.6); c.sy.value = lerp(c.sy.value, ny, 0.6);
    }
  }
  function flaskUp(p) {
    if (F.dragH) { F.dragH = false; return; }
    const c = F.dragChip;
    if (!c) return;
    F.dragChip = null; c.drag = false;
    // 가장 가까운 슬롯
    let best = -1, bd = 1e9;
    for (let i = 0; i < 3; i++) {
      const s = slotRect(i), d = Math.hypot(c.x - (s.x + s.w / 2), (c.y - 24) - (s.y + s.h / 2));
      if (d < bd) { bd = d; best = i; }
    }
    const tp = trayPos(c.i);
    if (best >= 0 && bd < 70) {
      if (best === c.target && !F.chips.some((o) => o.placed === best)) {
        const s = slotRect(best);
        c.placed = best; c.sx.target = s.x + s.w / 2; c.sy.target = s.y + s.h / 2; c.ring = 0.5; F.placedOk++;
        FX.burst(s.x + s.w / 2, s.y + s.h / 2, { count: 10, colors: ['#16a34a', '#facc15', '#38bdf8'], speed: 120, size: 3 });
        Sound.tick(); Sound.click();
      } else {
        c.shake = 0.3; c.sx.target = tp.x; c.sy.target = tp.y; Sound.fail();
        const msg = CHIP_FB[c.key][best];
        showHint(msg || '그 시험관이 아니에요. 다시 생각해 봐요.', 4200);
      }
    } else { c.sx.target = tp.x; c.sy.target = tp.y; }
  }
  const rangeP = SciSim.bindRange($('#sPred'), $('#oPred'), (v) => v + ' mL', (v) => { if (canPredict()) { F.pred = v; hideHint(); } else rangeP.set(F.pred); });
  function canPredict() { return F.mode === 1 && !F.revealing && !F.revealDone; }
  function setPred(ml) { if (!canPredict()) return; F.pred = ml; rangeP.set(ml); }
  $('#revealBtn').addEventListener('click', () => { if (SCENE === 'flask') startReveal(); });

  /* =========================================================
     장면 2 · 물의 활용 사례 조사 (survey)
     ========================================================= */
  const SVT = PHONE ? { s: 0.75, x: 0, y: 8 } : { s: 1, x: 0, y: 0 };
  const ZONES = {
    ice: { x: 30, y: 40, w: 160, h: 112, name: '🧊 빙하', col: '#7dd3fc' },
    lake: { x: 200, y: 152, w: 195, h: 96, name: '🏞️ 호수·하천수', col: '#38bdf8' },
    ground: { x: 200, y: 282, w: 360, h: 70, name: '⛰️ 지하수', col: '#60a5fa' },
    sea: { x: 620, y: 168, w: 170, h: 180, name: '🌊 해수', col: '#2563eb' },
  };
  const CARDS = [
    { emoji: '🐟', text: '김·미역을 기르고 물고기를 잡는다', zone: 'sea', fb: '김·미역과 물고기는 짠 바닷물에서 자라요. 어느 물일까요?' },
    { emoji: '🧂', text: '염전에서 햇볕으로 물을 증발시켜 소금을 얻는다', zone: 'sea', fb: '소금은 짠물을 증발시켜 얻어요. 어떤 물일까요?' },
    { emoji: '🏭', text: '해수 담수화: 짠물의 염분을 없애 마실 물을 만든다', zone: 'sea', fb: '‘짠물의 염분을 없앤다’는 것은 어떤 물을 쓰는 걸까요?' },
    { emoji: '🏔️', text: '높은 산의 얼음이 녹은 물이 큰 강의 시작이 된다', zone: 'ice', fb: '얼음이 녹은 물이 강의 시작이 돼요. 얼음은 어디에 있을까요?' },
    { emoji: '🌾', text: '관정(우물)으로 땅속 물을 끌어 올려 논밭에 댄다', zone: 'ground', fb: '관정(우물)으로 끌어 올리는 물은 땅속에 있어요.' },
    { emoji: '🏝️', text: '제주도는 화산암 틈에 고인 빗물을 생활용수로 쓴다', zone: 'ground', fb: '빗물이 화산암 틈으로 스며들어 고인 물은 땅속에 있어요.' },
    { emoji: '🚰', text: '댐에 모아 둔 물을 정수해 수돗물과 공업용수로 쓴다', zone: 'lake', fb: '댐에 모아 둔 물은 호수와 하천의 물이에요.' },
    { emoji: '⚡', text: '댐에 모인 물이 떨어지는 힘으로 전기를 만든다', zone: 'lake', fb: '수력 발전은 댐에 모은 강물을 이용해요. 어떤 물일까요?' },
  ];
  const TRAY = PHONE ? { cols: 2, cw: 286, ch: 62, x0: 10, y0: 300, gx: 10, gy: 8 } : { cols: 4, cw: 180, ch: 64, x0: 10, y0: 376, gx: 20, gy: 14 };
  const DP = PHONE ? { x: 10, y: 296, w: 580, h: 360 } : { x: 436, y: 30, w: 356, h: 330 };   // 자료 패널
  const SV = {
    cards: [], drag: null, placedN: 0, panelK: new SciSim.Spring(0, { stiffness: 140, damping: 18 }),
    dataMode: 'none', dataT: 0, glowZone: null, zoneGlow: { ice: 0, lake: 0, ground: 0, sea: 0 }, bg: null,
  };
  const DATA_USE = [
    { k: '농업용수', icon: '🌾', v: 41, c: '#22a559' }, { k: '하천 유지용수', icon: '🏞️', v: 33, c: '#2f8fe0' },
    { k: '생활용수', icon: '🏠', v: 20, c: '#f59e0b' }, { k: '공업용수', icon: '🏭', v: 6, c: '#8b5cf6' },
  ];
  const RAIN_M = [25, 35, 55, 80, 95, 150, 290, 270, 155, 60, 45, 25];

  function trayXY(i) { return { x: TRAY.x0 + (i % TRAY.cols) * (TRAY.cw + TRAY.gx), y: TRAY.y0 + Math.floor(i / TRAY.cols) * (TRAY.ch + TRAY.gy) }; }
  function wrapLines(str, maxW, size, maxLines) {
    ctx.save(); ctx.font = D.font(size, 800);
    const out = []; let line = '';
    for (const ch of str) {
      if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch === ' ' ? '' : ch; } else line += ch;
    }
    if (line) out.push(line);
    ctx.restore();
    return out.slice(0, maxLines || 3);
  }
  function zoneChipPos(zk, n) {
    const z = ZONES[zk];
    const per = Math.max(1, Math.floor((z.w - 24) / 38));
    return { x: z.x + 22 + (n % per) * 38, y: z.y + z.h - 22 - Math.floor(n / per) * 38 };
  }
  function initSurvey() {
    const lines = CARDS.map((c) => wrapLines(c.text, TRAY.cw - 56, fz(13), 3));
    SV.cards = CARDS.map((c, i) => {
      const p = trayXY(i);
      return Object.assign({}, c, { i, lines: lines[i], hx: p.x, hy: p.y, x: p.x, y: p.y, sx: new SciSim.Spring(p.x, { stiffness: 170, damping: 18 }), sy: new SciSim.Spring(p.y, { stiffness: 170, damping: 18 }),
        lift: 0, tilt: 0, vx: 0, shake: 0, placed: false, chipN: -1, ring: 0, mini: 0, off: { x: 0, y: 0 } });
    });
    SV.placedN = 0; SV.drag = null;
  }
  initSurvey();
  function surveyMode(mode) {
    // 'cards' | 'donut' | 'bars'
    if (mode === 'cards') { initSurvey(); SV.dataMode = 'none'; SV.panelK.target = 0; SV.panelK.value = 0; return; }
    // 카드가 모두 분류된 상태에서 시작
    if (SV.placedN < CARDS.length) placeAllCards();
    if (SV.dataMode === 'none') SV.panelK.value = RM ? 1 : 0;
    SV.dataMode = mode; SV.dataT = 0; SV.panelK.target = 1;
  }
  function placeAllCards() {
    const cnt = { ice: 0, lake: 0, ground: 0, sea: 0 };
    SV.cards.forEach((c) => {
      c.placed = true; c.chipN = cnt[c.zone]++; c.mini = 1;
      const q = zoneChipPos(c.zone, c.chipN); c.sx.value = c.sx.target = q.x; c.sy.value = c.sy.target = q.y; c.x = q.x; c.y = q.y;
    });
    SV.placedN = CARDS.length;
  }
  function surveyReset() { initSurvey(); SV.dataMode = 'none'; SV.panelK.target = 0; SV.panelK.value = 0; }

  /* ----- 정적 배경(파노라마) ----- */
  const LAND = [[0, 150], [25, 105], [70, 52], [105, 80], [138, 62], [172, 125], [200, 186], [214, 200], [232, 232], [375, 232], [392, 206], [412, 206], [610, 207], [650, 216], [690, 252], [740, 300], [800, 338]];
  function landY(x) {
    for (let i = 1; i < LAND.length; i++) if (x <= LAND[i][0]) { const a = LAND[i - 1], b = LAND[i]; return lerp(a[1], b[1], (x - a[0]) / Math.max(1, b[0] - a[0])); }
    return LAND[LAND.length - 1][1];
  }
  function buildPanorama() {
    return makeCache(800, 366, 2, (g, d) => {
      const poly = (pts, close) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (close !== false) g.closePath(); };
      const lg = (y0, y1, stops) => { const q = g.createLinearGradient(0, y0, 0, y1); stops.forEach((s) => q.addColorStop(s[0], s[1])); return q; };
      // 하늘
      g.fillStyle = lg(0, 230, [[0, '#8fd0f5'], [1, '#e6f5fc']]); g.fillRect(0, 0, 800, 366);
      // 땅
      poly(LAND.concat([[800, 366], [0, 366]]));
      g.save(); g.clip();
      g.fillStyle = lg(40, 366, [[0, '#9a8f86'], [0.3, '#a58a64'], [1, '#6b4f33']]); g.fillRect(0, 0, 800, 366);
      // 산(바위)과 풀밭
      g.fillStyle = lg(40, 200, [[0, '#8e939c'], [1, '#6f7683']]); poly([[0, 150], [25, 105], [70, 52], [105, 80], [138, 62], [172, 125], [200, 186], [200, 366], [0, 366]]); g.fill();
      g.strokeStyle = '#6cbf5a'; g.lineWidth = 8; g.lineJoin = 'round';
      poly(LAND.filter((p) => p[0] >= 200 && p[0] <= 660), false); g.stroke();
      // 표토층
      g.fillStyle = 'rgba(70,45,25,.35)'; poly(LAND.filter((p) => p[0] >= 200).map((p) => [p[0], p[1] + 8]).concat([[800, 366], [200, 366]])); g.fill();
      // 불포화대 모래 + 대수층(지하수가 찬 모래·자갈)
      g.fillStyle = 'rgba(214,190,140,.55)'; g.fillRect(200, 250, 360, 100);
      g.fillStyle = 'rgba(70,150,230,.45)'; g.fillRect(200, 292, 360, 58);
      const r = mulberry(5);
      for (let i = 0; i < 260; i++) {
        const x = 202 + r() * 356, y = 252 + r() * 96, rad = 1.6 + r() * 3.2;
        g.fillStyle = ['#c9a876', '#b79668', '#d9c39b', '#a88862'][i % 4]; g.globalAlpha = 0.85;
        g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(30,100,200,.7)'; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(200, 292); g.lineTo(560, 292); g.stroke(); g.setLineDash([]);
      // 기반암
      g.fillStyle = 'rgba(55,60,75,.75)'; g.fillRect(0, 350, 800, 20);
      g.restore();
      // 빙하
      g.save(); poly([[40, 100], [70, 66], [100, 92], [136, 76], [168, 128], [194, 180], [182, 184], [150, 150], [120, 130], [90, 118], [62, 126]]); g.clip();
      g.fillStyle = lg(60, 190, [[0, '#f4fbff'], [1, '#a5d8f0']]); g.fillRect(0, 40, 220, 160);
      g.strokeStyle = 'rgba(40,120,190,.55)'; g.lineWidth = 1.6;
      [[80, 100, 96, 122], [112, 96, 122, 126], [140, 104, 158, 140], [64, 112, 80, 128]].forEach((q) => { g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo((q[0] + q[2]) / 2 + 4, (q[1] + q[3]) / 2 - 3); g.lineTo(q[2], q[3]); g.stroke(); });
      g.restore();
      // 눈 덮인 봉우리
      g.fillStyle = '#f8fcff';
      poly([[52, 78], [70, 52], [88, 68], [78, 72], [70, 66], [62, 74]]); g.fill();
      poly([[128, 74], [138, 62], [148, 76], [140, 72], [134, 78]]); g.fill();
      // 호수
      poly([[207, 192], [392, 192], [392, 206], [375, 232], [232, 232], [214, 200]]);
      g.fillStyle = lg(192, 232, [[0, '#6bc3ee'], [1, '#1f78b8']]); g.fill();
      // 댐
      poly([[390, 170], [414, 170], [416, 208], [388, 208]]);
      g.fillStyle = lg(170, 208, [[0, '#d7dce3'], [1, '#98a2b0']]); g.fill();
      g.strokeStyle = 'rgba(80,90,105,.5)'; g.lineWidth = 1;
      for (let y = 178; y < 208; y += 8) { g.beginPath(); g.moveTo(390, y); g.lineTo(415, y); g.stroke(); }
      g.fillStyle = '#7b8696'; g.fillRect(396, 164, 14, 7);   // 발전소 지붕
      g.fillStyle = '#e9edf2'; g.fillRect(398, 166, 10, 5);
      // 논(벼) · 관정 · 마을
      for (let i = 0; i < 4; i++) {
        const x = 424 + i * 20;
        g.fillStyle = '#4fae52'; g.fillRect(x, 196, 17, 9);
        g.fillStyle = '#7fd06a'; for (let k = 0; k < 5; k++) g.fillRect(x + 2 + k * 3, 192, 1.6, 6);
        g.fillStyle = 'rgba(150,215,245,.8)'; g.fillRect(x, 203, 17, 3);
      }
      g.fillStyle = '#5b6575'; g.fillRect(506, 194, 12, 11); g.fillStyle = '#e2464b'; poly([[504, 195], [512, 188], [520, 195]]); g.fill();
      g.strokeStyle = '#7b8696'; g.lineWidth = 3; g.beginPath(); g.moveTo(512, 205); g.lineTo(512, 306); g.stroke();
      g.fillStyle = '#2f6fb0'; g.fillRect(509, 296, 6, 14);
      [[532, 7], [548, 9], [562, 6]].forEach((h, i) => {
        const x = h[0]; g.fillStyle = ['#f2d6b0', '#e9c4a0', '#f7e1c0'][i]; g.fillRect(x, 193, 13, 12);
        g.fillStyle = ['#c0392b', '#2c6fb0', '#8a5a2b'][i]; poly([[x - 2, 193], [x + 6.5, 185], [x + 15, 193]]); g.fill();
      });
      // 해수 담수화 시설
      g.fillStyle = '#b6c3d4'; g.fillRect(578, 178, 38, 29); g.fillStyle = '#7e8fa6'; g.fillRect(584, 168, 7, 12); g.fillRect(600, 172, 7, 8);
      g.fillStyle = '#e9f2fb'; g.fillRect(582, 186, 8, 8); g.fillRect(596, 186, 8, 8);
      g.strokeStyle = '#7e8fa6'; g.lineWidth = 3; g.beginPath(); g.moveTo(616, 200); g.lineTo(660, 214); g.lineTo(690, 226); g.stroke();
      // 염전
      for (let i = 0; i < 3; i++) {
        g.fillStyle = '#e8f2f8'; g.fillRect(622 + i * 22, 208, 19, 7);
        g.strokeStyle = '#a9b8c6'; g.lineWidth = 1; g.strokeRect(622 + i * 22, 208, 19, 7);
      }
      // 바다
      poly([[646, 214], [800, 214], [800, 338], [740, 300], [690, 252], [650, 216]]);
      g.fillStyle = lg(214, 340, [[0, '#6fc9f0'], [0.5, '#2b87c8'], [1, '#14548f']]); g.fill();
      g.strokeStyle = '#8a7348'; g.lineWidth = 3; g.beginPath(); g.moveTo(646, 214); g.lineTo(650, 218); g.lineTo(690, 253); g.lineTo(740, 301); g.lineTo(800, 339); g.stroke();
      // 가장자리 안내선
      g.fillStyle = 'rgba(255,255,255,.0)';
    });
  }

  function drawZone(zk, t) {
    const z = ZONES[zk], glow = SV.zoneGlow[zk];
    const show = SV.dataMode === 'none';
    if (!show) return;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * glow;
    rr(z.x, z.y, z.w, z.h, 16);
    ctx.fillStyle = rgba(z.col, 0.12 + 0.26 * glow); ctx.fill();
    ctx.setLineDash([7, 5]); ctx.strokeStyle = rgba(z.col, 0.9); ctx.lineWidth = 2 + glow * 2; ctx.stroke(); ctx.setLineDash([]);
    if (glow > 0.05) {
      const a = 0.5 + 0.5 * Math.sin(t * 7.5);
      ctx.strokeStyle = rgba('#ffffff', 0.4 + 0.5 * a * glow); ctx.lineWidth = 3;
      rr(z.x - 4 - a * 3, z.y - 4 - a * 3, z.w + 8 + a * 6, z.h + 8 + a * 6, 18); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    pill(z.x + 8, z.y + 14, z.name, z.col === '#7dd3fc' ? '#0369a1' : '#1d4ed8', '#fff', 14, { align: 'left' });
    ctx.restore();
  }
  let clouds = [{ x: 90, y: 22, s: 1 }, { x: 330, y: 40, s: 0.8 }, { x: 560, y: 18, s: 1.2 }];
  function drawPanoramaLive(t, dt) {
    if (!SV.bg) SV.bg = buildPanorama();
    ctx.drawImage(SV.bg, 0, 0, 800, 366);
    // 구름
    clouds.forEach((c, i) => {
      if (!RM) c.x += dt * (3 + i);
      if (c.x > 860) c.x = -80;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      [[0, 0, 18], [18, 4, 14], [-18, 5, 13], [6, -8, 12]].forEach((q) => { ctx.beginPath(); ctx.arc(c.x + q[0] * c.s, c.y + q[1] * c.s, q[2] * c.s, 0, 6.283); ctx.fill(); });
    });
    // 빙하 반짝임
    if (!RM) for (let i = 0; i < 4; i++) {
      const gx = [80, 118, 150, 66][i], gy = [96, 100, 118, 108][i];
      D.spark(gx, gy, 5, t * 1.3 + i * 1.7, '#ffffff');
    }
    // 호수·하천 흐름
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6;
    for (let k = 0; k < 4; k++) { const y = 198 + k * 8; wavePath(234 + k * 4, 372 - k * 4, (x) => y + 1.3 * Math.sin(x * 0.12 + t * 1.8 + k), 4); ctx.stroke(); }
    // 빙하 녹은 물이 호수로
    ctx.strokeStyle = '#5ab9ee'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.moveTo(150, 128); ctx.quadraticCurveTo(178, 150, 196, 184); ctx.lineTo(212, 194); ctx.stroke();
    // 댐 아래 강
    ctx.beginPath(); ctx.moveTo(416, 209); ctx.lineTo(424, 209); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // 댐 방류 물보라
    if (!RM && Math.random() < 0.5) FXS.emit({ x: 416, y: 196, vx: 40 + Math.random() * 30, vy: -10 - Math.random() * 20, life: 0.5, size: 2.2, color: '#bfe6fb', gravity: 260 });
    // 바다 물결·배
    ctx.save();
    ctx.beginPath(); ctx.moveTo(646, 214); ctx.lineTo(800, 214); ctx.lineTo(800, 338); ctx.lineTo(740, 300); ctx.lineTo(690, 252); ctx.closePath(); ctx.clip();
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 - k * 0.1) + ')'; ctx.lineWidth = 2;
      const y = 218 + k * 22; wavePath(640, 800, (x) => y + 2.2 * Math.sin(x * 0.07 + t * 1.5 + k * 1.3) + (RM ? 0 : 0), 4); ctx.stroke();
    }
    ctx.restore();
    // 양식장 부표 + 고깃배
    const by = 214;
    for (let i = 0; i < 4; i++) {
      const x = 700 + i * 24 + 3 * Math.sin(t + i), y = by + 1 + 1.5 * Math.sin(t * 1.6 + i);
      ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 28); ctx.stroke();
    }
    ctx.save(); ctx.translate(760 + 4 * Math.sin(t * 0.4), by - 4 + 1.8 * Math.sin(t * 1.3)); ctx.rotate(0.06 * Math.sin(t * 1.1));
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(-18, -4); ctx.lineTo(18, -4); ctx.lineTo(12, 7); ctx.lineTo(-13, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-4, -14, 9, 10); ctx.fillStyle = '#334155'; ctx.fillRect(-1, -20, 2, 7);
    ctx.restore();
    // 염전·담수화 반짝임
    if (!RM) { D.spark(633, 208, 3.5, t * 1.7, '#ffffff'); D.spark(676, 210 + 0, 3, t * 1.9 + 2, '#ffffff'); }
    // 논 · 관정에서 물이 올라오는 표시
    if (!RM) {
      const k = (t * 0.8) % 1;
      ctx.fillStyle = 'rgba(80,170,240,' + (1 - k) + ')'; ctx.beginPath(); ctx.arc(512, 300 - k * 90, 2.6, 0, 6.283); ctx.fill();
    }
  }
  function drawMiniChip(c, t) {
    const sc = c.mini;
    ctx.save(); ctx.translate(c.x, c.y);
    if (c.ring > 0) {
      const k = 1 - c.ring / 0.5; ctx.strokeStyle = 'rgba(22,163,74,' + (1 - k) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 14 + 40 * k, 0, 6.283); ctx.stroke();
    }
    ctx.scale(sc, sc);
    D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.283); ctx.stroke();
    ctx.font = D.font(20, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.emoji, 0, 1);
    ctx.restore();
  }
  function drawCard(c, t) {
    const w = TRAY.cw, h = TRAY.ch;
    const shk = c.shake > 0 ? Math.sin(c.shake * 60) * 6 * (c.shake / 0.3) : 0;
    ctx.save();
    ctx.translate(c.x + w / 2 + shk, c.y + h / 2 - 24 * c.lift); ctx.rotate(c.tilt); ctx.scale(1 + 0.06 * c.lift, 1 + 0.06 * c.lift);
    D.shadow(() => { rr(-w / 2, -h / 2, w, h, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 5 + 12 * c.lift, y: 2 + 6 * c.lift, color: 'rgba(15,35,70,.22)' });
    rr(-w / 2, -h / 2, w, h, 12); ctx.strokeStyle = c.lift > 0.1 ? '#8b5cf6' : '#cbd5e1'; ctx.lineWidth = c.lift > 0.1 ? 3 : 1.5; ctx.stroke();
    ctx.font = D.font(28, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.emoji, -w / 2 + 26, 1);
    ctx.textBaseline = 'alphabetic';
    const ln = c.lines.length, ls = fz(15);
    c.lines.forEach((s, k) => D.text(-w / 2 + 48, -((ln - 1) * ls) / 2 + k * ls + 5, s, { size: fz(13), color: '#1b2333', align: 'left', weight: 800 }));
    ctx.restore();
  }
  // 용도별 물 이용 도넛
  function drawDonut(px, py, pw, ph, t) {
    const big = pw > 500;
    const cx = big ? px + 170 : px + 100, cy = py + (big ? ph / 2 + 4 : 152), R = big ? 118 : 74, r0 = R * 0.56;
    const e = SV.dataT;
    let a0 = -Math.PI / 2;
    DATA_USE.forEach((d, i) => {
      const k = clamp((e - 0.3 - i * 0.4) / 0.4, 0, 1);
      const sw = (d.v / 100) * 2 * Math.PI * EA.outCubic(k);
      const bump = 1 + 0.07 * (EA.outBack(k) - EA.outCubic(k)) * 3;
      if (k > 0) {
        ctx.beginPath(); ctx.arc(cx, cy, R * bump, a0, a0 + sw); ctx.arc(cx, cy, r0, a0 + sw, a0, true); ctx.closePath();
        ctx.fillStyle = d.c; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        if (k > 0.8) {
          const am = a0 + sw / 2, rm = (R + r0) / 2;
          ctx.font = D.font(big ? 22 : 18, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
          if (d.v >= 15) ctx.fillText(d.icon, cx + Math.cos(am) * rm, cy + Math.sin(am) * rm);
          ctx.textBaseline = 'alphabetic';
        }
      }
      a0 += (d.v / 100) * 2 * Math.PI;
    });
    const num = Math.round(372 * clamp(e / 1.2, 0, 1));
    T(cx, cy - 6, '연간 약', 13, '#33415c'); T(cx, cy + 14, num + '억 m³', big ? 20 : 16, '#0b3a82');
    // 범례
    const lx = big ? px + 330 : px + 200, ly = big ? py + 80 : py + 90;
    DATA_USE.forEach((d, i) => {
      const k = clamp((e - 0.3 - i * 0.4) / 0.4, 0, 1);
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha = k;
      const yy = ly + i * (big ? 54 : 44);
      ctx.fillStyle = d.c; rr(lx, yy - 12, 14, 14, 4); ctx.fill();
      T(lx + 22, yy, d.icon + ' ' + d.k, big ? 17 : 14, '#1b2333', { align: 'left' });
      T(lx + 22, yy + (big ? 22 : 18), Math.round(d.v * EA.outCubic(k)) + ' %', big ? 20 : 16, d.c, { align: 'left' });
      ctx.restore();
    });
    T(px + pw / 2, py + ph - 12, '출처: 국토교통부 수자원장기종합계획(2016), 2014년 기준', 12, '#64748b');
  }
  // 월별 강수 막대
  function drawBars(px, py, pw, ph, t) {
    const big = pw > 500;
    const gx = px + 30, gw = pw - 62, gh = big ? 150 : 120, gb = py + 78 + gh * 0.967;
    const e = SV.dataT;
    T(px + 12, py + 28, '📊 우리나라 월별 강수량 (mm)', 14, '#0b3a82', { align: 'left' });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx - 4, gb); ctx.lineTo(gx + gw, gb); ctx.stroke();
    const bw = gw / 12;
    RAIN_M.forEach((v, i) => {
      const k = EA.outBack(clamp((e - 0.2 - i * 0.1) / 0.5, 0, 1));
      const hh = (v / 300) * gh * k;
      const sum = i >= 5 && i <= 8;
      ctx.fillStyle = sum ? '#1d4ed8' : '#93c5fd';
      rr(gx + i * bw + 3, gb - hh, bw - 6, Math.max(0, hh), 4); ctx.fill();
      T(gx + i * bw + bw / 2, gb + 16, String(i + 1), 13, sum ? '#1d4ed8' : '#475569');
    });
    T(gx + gw + 14, gb + 16, '월', 13, '#475569');
    const k2 = clamp((e - 1.8) / 0.5, 0, 1);
    if (k2 > 0) {
      ctx.save(); ctx.globalAlpha = k2;
      const x0 = gx + 5 * bw + 2, x1 = gx + 9 * bw - 2, yb = gb - (290 / 300) * gh - 10;
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yb + 6); ctx.lineTo(x0, yb); ctx.lineTo(x1, yb); ctx.lineTo(x1, yb + 6); ctx.stroke();
      T(Math.min((x0 + x1) / 2 + 24, px + pw - 110), yb - 6, '6~9월: 연 강수량의 약 2/3', 13, '#1d4ed8');
      ctx.restore();
    }
    const items = ['☔ 연 약 1,300 mm (세계 평균의 약 1.6배)', '👥 1인당 강수 총량: 세계 평균의 약 1/6', '⛰️ 국토의 약 70 %가 산지'];
    items.forEach((s, i) => {
      const k = clamp((e - 2.2 - i * 0.25) / 0.35, 0, 1);
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha = k; ctx.translate((1 - k) * 20, 0);
      const yy = gb + 38 + i * (big ? 36 : 32);
      rr(px + 10, yy - 15, pw - 20, 27, 10); ctx.fillStyle = '#eef6ff'; ctx.fill();
      T(px + 20, yy + 4, s, 14, '#1b2333', { align: 'left' });
      ctx.restore();
    });
    T(px + pw / 2, py + ph - 8, '평년값과 비슷하게 단순화한 값', 12, '#64748b');
  }
  function drawDataPanel(t) {
    const k = SV.panelK.value;
    if (k < 0.01 || !gHas('data')) return;
    ctx.save();
    if (PHONE) ctx.translate(0, (1 - k) * 80); else ctx.translate((1 - k) * 300, 0);
    ctx.globalAlpha = clamp(k * 1.5, 0, 1);
    D.shadow(() => { rr(DP.x, DP.y, DP.w, DP.h, 18); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 16, y: 6 });
    if (SV.dataMode === 'donut') {
      T(DP.x + 12, DP.y + 28, '📊 우리나라 용도별 물 이용', 14, '#0b3a82', { align: 'left' });
      drawDonut(DP.x, DP.y, DP.w, DP.h, t);
    } else if (SV.dataMode === 'bars') drawBars(DP.x, DP.y, DP.w, DP.h, t);
    ctx.restore();
    if (isNew('data') && SV.dataT < 6) newRing(DP.x, DP.y, DP.w, DP.h);
  }
  function updateSurvey(dt, t) {
    SV.panelK.update(dt); SV.dataT += dt;
    // 잡은 카드와 가까운 영역 광채
    let near = null, nd = 1e9;
    if (SV.drag) {
      const c = SV.drag, pc = { x: (c.x + TRAY.cw / 2 - SVT.x) / SVT.s, y: (c.y + TRAY.ch / 2 - 24 - SVT.y) / SVT.s };
      for (const k in ZONES) {
        const z = ZONES[k];
        const dx = Math.max(z.x - pc.x, 0, pc.x - (z.x + z.w)), dy = Math.max(z.y - pc.y, 0, pc.y - (z.y + z.h));
        const d = Math.hypot(dx, dy);
        if (d < nd) { nd = d; near = k; }
      }
      if (nd > 60) near = null;
    }
    SV.glowZone = near;
    for (const k in SV.zoneGlow) SV.zoneGlow[k] = approach(SV.zoneGlow[k], near === k ? 1 : 0, dt, 12);
    SV.cards.forEach((c) => {
      c.sx.update(dt); c.sy.update(dt); c.x = c.sx.value; c.y = c.sy.value;
      c.lift = approach(c.lift, c.pickup ? 1 : 0, dt, 18);
      c.tilt = approach(c.tilt, c.pickup ? clamp(c.vx * 0.012, -0.08, 0.08) : 0, dt, 12);
      c.vx = approach(c.vx, 0, dt, 10);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      if (c.ring > 0) c.ring = Math.max(0, c.ring - dt);
      if (c.placed && c.mini < 1) c.mini = Math.min(1, c.mini + dt * 4);
    });
  }
  function drawSurvey(t, dt) {
    ctx.fillStyle = '#dcecf7'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(SVT.x, SVT.y); ctx.scale(SVT.s, SVT.s);
    drawPanoramaLive(t, dt);
    for (const k in ZONES) drawZone(k, t);
    // 놓인 카드(작은 칩)
    SV.cards.forEach((c) => { if (c.placed) drawMiniChip(c, t); });
    FXS.draw(ctx);
    ctx.restore();
    // 트레이
    if (SV.dataMode === 'none' || PHONE === false) {
      ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(4, TRAY.y0 - 8, VW - 8, PHONE ? 4 * (TRAY.ch + TRAY.gy) + 8 : 2 * (TRAY.ch + TRAY.gy) + 4, 14); ctx.fill();
    }
    SV.cards.forEach((c) => {
      const h = trayXY(c.i);
      if (c.placed || c === SV.drag) {
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.5; rr(h.x, h.y, TRAY.cw, TRAY.ch, 12); ctx.stroke(); ctx.restore();
      }
    });
    if (SV.placedN >= CARDS.length) T(VW / 2, TRAY.y0 + (PHONE ? 100 : 66), '✅ 8장을 모두 분류했어요!', 17, '#15803d');
    SV.cards.forEach((c) => { if (!c.placed && c !== SV.drag) drawCard(c, t); });
    if (SV.drag) drawCard(SV.drag, t);
    drawDataPanel(t);
  }
  function surveyDown(p) {
    if (SV.dataMode !== 'none') return false;
    for (let i = SV.cards.length - 1; i >= 0; i--) {
      const c = SV.cards[i];
      if (c.placed) continue;
      if (p.x >= c.x && p.x <= c.x + TRAY.cw && p.y >= c.y && p.y <= c.y + TRAY.ch) {
        SV.drag = c; c.pickup = true; c.off = { x: c.x - p.x, y: c.y - p.y }; hideHint(); Sound.tick();
        return true;
      }
    }
    return false;
  }
  function surveyMove(p) {
    const c = SV.drag; if (!c) return;
    const nx = p.x + c.off.x, ny = p.y + c.off.y;
    c.vx = nx - c.sx.target;
    c.sx.value = lerp(c.sx.value, nx, 0.65); c.sy.value = lerp(c.sy.value, ny, 0.65); c.sx.target = nx; c.sy.target = ny;
  }
  function surveyUp() {
    const c = SV.drag; if (!c) return;
    SV.drag = null; c.pickup = false;
    const zk = SV.glowZone;
    const home = trayXY(c.i);
    if (zk) {
      if (zk === c.zone) {
        c.placed = true; c.mini = 0.2; c.ring = 0.5;
        c.chipN = SV.cards.filter((o) => o.placed && o.zone === zk && o !== c).length;
        const q = zoneChipPos(zk, c.chipN);
        c.sx.target = q.x; c.sy.target = q.y; SV.placedN++;
        c.sx.value = (c.sx.value + TRAY.cw / 2 - SVT.x) / SVT.s; c.sy.value = (c.sy.value + TRAY.ch / 2 - 24 - SVT.y) / SVT.s;
        c.sx.velocity = c.sy.velocity = 0; c.x = c.sx.value; c.y = c.sy.value;
        FXS.burst(q.x, q.y, { count: 10, colors: ['#16a34a', '#facc15', '#38bdf8'], speed: 130, size: 3 });
        Sound.tick(); Sound.click();
        return;
      }
      c.shake = 0.3; Sound.fail(); showHint(c.fb, 4200);
    }
    c.sx.target = home.x; c.sy.target = home.y;
  }

  /* =========================================================
     장면 3 · 지하수 단면 (ground)
     ========================================================= */
  const GT = PHONE ? { s: 0.75, x: 0, y: 12 } : { s: 1, x: 0, y: 0 };
  const SURF = 170, SL = 240, COAST = 620, BASE = 420, WELL_X = 430, RECHARGE = 3;
  const surfBase = (x) => (x <= 570 ? SURF : x <= COAST ? lerp(SURF, SL, (x - 570) / 50) : SL + (x - COAST) * 0.5);
  const G = {
    hc: 8, year: 0, P: 3, running: false, rewind: false, runLeft: 0, runP: 3, lastRun: null, warned: false, pulse: 0,
    lens: { x: 92, y: 112, r: 64, drag: false, lift: 0, off: { x: 0, y: 0 }, k: 0, hold: 0 },
    sag: 0, tilt: 0, bg: null, dots: [], rain: [], salty: 0, flow: 1, newT: 0,
  };
  const gcone = (x) => 4 * G.P * Math.exp(-(((x - WELL_X) / 35) ** 2));
  const gHeight = (x) => G.hc * Math.sqrt(Math.max(0, (COAST - x) / COAST));
  const wtY = (x) => Math.min(BASE - 4, SL - 4 * gHeight(x) - gcone(x));
  const xToe = () => 560 - 35 * (8 - G.hc);
  const sagAt = (x) => G.sag * Math.exp(-(((x - WELL_X) / 120) ** 2));
  const surfY = (x) => surfBase(x) + (x < 570 ? sagAt(x) : 0);
  function groundReset(P) {
    G.hc = 8; G.year = 0; G.running = false; G.rewind = false; G.lastRun = null; G.warned = false;
    if (P != null) { G.P = P; rangeSP.set(P); }
    $('#sP').disabled = false; $('#runBtn').disabled = false;
  }
  const rangeSP = SciSim.bindRange($('#sP'), $('#oP'), (v) => v, (v) => { if (!G.running && !G.rewind) G.P = v; else rangeSP.set(G.P); });
  rangeSP.set(3);
  function runTen() {
    if (G.running || G.rewind) return;
    Sound.click();
    G.runP = G.P; G.warned = false;
    $('#sP').disabled = true; $('#runBtn').disabled = true;
    const begin = () => { G.rewind = false; G.running = true; G.runLeft = 10; G.hc0 = G.hc; };
    if (Math.abs(G.hc - 8) > 0.01 || G.year > 0.01) {
      G.rewind = true;
      SciSim.tween(G, { hc: 8, year: 0 }, { duration: 0.55, ease: 'inOutCubic', onDone: begin });
    } else begin();
  }
  $('#runBtn').addEventListener('click', () => { if (SCENE === 'ground') runTen(); });
  function updateGround(dt, t) {
    if (G.running) {
      const dy = dt / 0.6 * (RM ? 2 : 1);
      const use = Math.min(dy, G.runLeft);
      G.hc = clamp(G.hc + 0.4 * (RECHARGE - G.runP) * use, -2, 9);
      G.year += use; G.runLeft -= use;
      if (!G.warned && xToe() < WELL_X) {
        G.warned = true; G.pulse = 1.2; Sound.tone(220, 0.25, 'sine', 0.08);
        showHint('⚠️ 바닷물이 지하수층으로 밀려와 우물에 닿았어요!', 3600);
      }
      if (G.runLeft <= 1e-6) {
        G.running = false; G.year = 10;
        G.lastRun = { P: G.runP, hcEnd: G.hc, delta: G.hc - 8, wedge: xToe() < WELL_X };
        $('#sP').disabled = false; $('#runBtn').disabled = false;
      }
    }
    G.pulse = Math.max(0, G.pulse - dt);
    const sagT = clamp((3 - G.hc) * 2, 0, 10);
    G.sag = approach(G.sag, sagT, dt, 6);
    G.salty = approach(G.salty, clamp((WELL_X - xToe()) / 60, 0, 1), dt, 4);
    G.flow = approach(G.flow, G.hc < 1 ? clamp(0.3 + G.hc * 0.35, 0.15, 1) : 1, dt, 4);
    // 빗물이 스며드는 점
    if (G.dots.length < 25 && Math.random() < dt * 9 * (RECHARGE / 3)) G.dots.push({ x: 40 + Math.random() * 220, y: SURF + 2, ph: Math.random() * 6, sp: 0.7 + Math.random() * 0.6 });
    for (let i = G.dots.length - 1; i >= 0; i--) {
      const d = G.dots[i];
      d.y += dt * 20 * d.sp; d.ph += dt * 4;
      if (d.y >= wtY(d.x) - 1) G.dots.splice(i, 1);
    }
    if (G.rain.length === 0) for (let i = 0; i < 26; i++) G.rain.push({ x: 40 + Math.random() * 190, y: 80 + Math.random() * 90, v: 300 + Math.random() * 120 });
    G.rain.forEach((r) => { r.y += r.v * dt; if (r.y > SURF - 2) { r.y = 84 + Math.random() * 10; r.x = 40 + Math.random() * 190; } });
    // 돋보기
    const L = G.lens;
    L.lift = approach(L.lift, L.drag ? 1 : 0, dt, 16);
    G.newT += dt;
  }
  function lensCenter() { return { x: G.lens.x, y: G.lens.y - 22 * G.lens.lift }; }
  function lensRegion() {
    const c = lensCenter();
    if (c.x < 0 || c.x > 800 || c.y < 0 || c.y > 540) return '땅 위';
    if (c.x > COAST) return c.y < SL ? '땅 위' : (c.y < surfBase(c.x) ? '바닷속' : '땅속');
    if (c.y < surfY(c.x)) return '땅 위';
    if (c.y > BASE) return '기반암';
    if (c.y < wtY(c.x)) return '불포화대';
    return '지하수가 찬 곳';
  }
  function lensInAquifer() { const c = lensCenter(); return c.x > 20 && c.x < COAST - 4 && c.y > wtY(c.x) + 6 && c.y < BASE - 4; }

  function buildGroundBg() {
    return makeCache(800, 540, 2, (g, d) => {
      const poly = (pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
      const top = [[0, SURF], [570, SURF], [COAST, SL], [800, 330], [800, 540], [0, 540]];
      poly(top); g.save(); g.clip();
      // 모래·자갈 대수층 (틈에 공기)
      g.fillStyle = '#e8d9b4'; g.fillRect(0, SURF, 800, BASE - SURF);
      const r = mulberry(11);
      for (let i = 0; i < 2600; i++) {
        const x = r() * 800, y = SURF + 12 + r() * (BASE - SURF - 12), rad = 2 + r() * 3.8;
        g.fillStyle = ['#c9a876', '#b79668', '#d9c39b', '#a88862', '#cdb88e'][i % 5];
        g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
        if (i % 4 === 0) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - rad * 0.6, y - rad * 0.2, rad * 0.4, 0, 6.283); g.fill(); }
      }
      // 표토층
      g.fillStyle = grad2(g, SURF, SURF + 14, '#6b4a2b', '#8a6a44'); g.fillRect(0, SURF, 620, 14);
      // 기반암
      g.fillStyle = grad2(g, BASE, 540, '#6d7482', '#434958'); g.fillRect(0, BASE, 800, 140);
      g.strokeStyle = 'rgba(20,24,32,.55)'; g.lineWidth = 1.6;
      for (let i = 0; i < 16; i++) { const x = r() * 800, y = BASE + 8 + r() * 100; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14 * (r() - 0.5), y + 14); g.lineTo(x + 24 * (r() - 0.4), y + 26); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, BASE, 800, 3);
      g.restore();
      // 층 이름
      d.text(560, 507, '기반암(물이 거의 통과하지 못해요)', { size: 13, color: '#e5e9f0', weight: 800, align: 'right' });
    });
  }
  function grad2(g, y0, y1, a, b) { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; }

  function drawHouse(x, baseY, w, h, col, roof, tilt) {
    ctx.save(); ctx.translate(x, baseY); ctx.rotate(tilt);
    D.shadow(() => { ctx.fillStyle = col; ctx.fillRect(-w / 2, -h, w, h); }, { blur: 5, y: 2 });
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(-w / 2 - 4, -h); ctx.lineTo(0, -h - 14); ctx.lineTo(w / 2 + 4, -h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7ec8ee'; ctx.fillRect(-w / 2 + 5, -h + 6, 8, 8); ctx.fillRect(w / 2 - 13, -h + 6, 8, 8);
    ctx.fillStyle = '#7a5530'; ctx.fillRect(-4, -12, 8, 12);
    if (G.sag > 3.2) {
      ctx.strokeStyle = 'rgba(40,20,10,.8)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h + 2); ctx.lineTo(-w / 2 + 8, -h * 0.5); ctx.lineTo(-w / 2 + 4, -4);
      ctx.moveTo(w / 2 - 3, -h + 3); ctx.lineTo(w / 2 - 9, -h * 0.55); ctx.moveTo(2, -h + 1); ctx.lineTo(-1, -h * 0.55); ctx.stroke();
    }
    ctx.restore();
  }
  function drawGround(t) {
    if (!G.bg) G.bg = buildGroundBg();
    // 하늘
    ctx.fillStyle = grad(0, 0, 0, SL + 20, [[0, '#8fd0f5'], [1, '#e4f4fb']]); ctx.fillRect(0, 0, 800, 540);
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(768, 44, 18, 0, 6.283); ctx.fill(); D.glow(768, 44, 48, '#fff3b0', 0.5);
    // 구름과 비
    ctx.fillStyle = '#e9eff6';
    [[70, 62, 22], [100, 52, 28], [138, 60, 24], [168, 66, 18], [110, 68, 24]].forEach((c) => { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, 6.283); ctx.fill(); });
    ctx.strokeStyle = 'rgba(70,140,210,.7)'; ctx.lineWidth = 1.6;
    G.rain.forEach((r) => { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 3, r.y + 9); ctx.stroke(); });
    // 바다
    const wv = (x) => SL + 1.8 * Math.sin(x * 0.06 + t * 1.6) + 1.2 * Math.sin(x * 0.13 - t * 2.1);
    ctx.save(); ctx.beginPath(); ctx.moveTo(COAST - 6, 230);
    for (let x = COAST - 6; x <= 800; x += 4) ctx.lineTo(x, wv(x));
    ctx.lineTo(800, 340); ctx.lineTo(COAST - 6, 340); ctx.closePath();
    ctx.fillStyle = grad(0, SL, 0, 340, [[0, '#5cc0ee'], [1, '#1a6aa8']]); ctx.fill(); ctx.restore();
    // 지면(지반 침하에 맞게 위를 잘라서 그리기)
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, surfY(0));
    for (let x = 0; x <= 570; x += 10) ctx.lineTo(x, surfY(x));
    ctx.lineTo(COAST, SL); ctx.lineTo(800, 330); ctx.lineTo(800, 540); ctx.lineTo(0, 540); ctx.closePath();
    ctx.clip(); ctx.drawImage(G.bg, 0, 0, 800, 540);
    // 포화대(지하수가 찬 곳) - 파란 기운
    ctx.beginPath(); ctx.moveTo(0, wtY(0));
    for (let x = 0; x <= COAST; x += 10) ctx.lineTo(x, wtY(x));
    ctx.lineTo(COAST, BASE); ctx.lineTo(0, BASE); ctx.closePath();
    ctx.fillStyle = grad(0, SL - 40, 0, BASE, [[0, 'rgba(60,150,235,.55)'], [1, 'rgba(25,95,200,.62)']]); ctx.fill();
    // 짠 지하수(해수 침투 쐐기) + 바다 밑 모래
    const xt = xToe();
    ctx.beginPath(); ctx.moveTo(xt, BASE);
    for (let i = 0; i <= 20; i++) { const u = i / 20; ctx.lineTo(xt + (COAST - xt) * u, BASE - 170 * Math.pow(u, 0.55)); }
    ctx.lineTo(COAST, SL + 10); ctx.lineTo(800, 330); ctx.lineTo(800, BASE); ctx.closePath();
    ctx.fillStyle = 'rgba(8,120,140,.7)'; ctx.fill();
    ctx.strokeStyle = 'rgba(210,255,250,.6)'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 5]);
    ctx.beginPath(); for (let i = 0; i <= 20; i++) { const u = i / 20; const px = xt + (COAST - xt) * u, py = BASE - 170 * Math.pow(u, 0.55); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.setLineDash([]);
    if (xt > 300) T(Math.min(700, xt + (COAST - xt) * 0.55 + 60), BASE - 28, '짠 지하수', 14, '#d1fbf5', { stroke: 'rgba(5,60,70,.55)', strokeWidth: 3 });
    // 지하수 흐름 점 (바다 쪽으로 천천히)
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 12; i++) {
      const u = ((t * 0.04 + i / 12) % 1), x = u * (COAST - 30) + 10, y0 = wtY(x), y = y0 + 14 + ((i * 37) % Math.max(10, BASE - y0 - 22));
      if (y < BASE - 6 && x < xt - 6 + (y < BASE - 60 ? 400 : 0)) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill(); }
    }
    ctx.restore();
    // 지하수면(점선)
    ctx.save(); ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 14;
    ctx.beginPath(); for (let x = 0; x <= COAST; x += 6) { const y = wtY(x); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    pill(520, wtY(520) - 14 > surfY(520) + 12 ? wtY(520) - 14 : wtY(520) + 22, '지하수면', '#1d4ed8', '#fff', 13);
    // 해수면 표시선
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(COAST - 140, SL); ctx.lineTo(COAST, SL); ctx.stroke(); ctx.setLineDash([]);
    T(COAST - 70, SL - 7, '해수면', 13, '#0b3a82');
    T(700, SL + 50, '바다', 15, '#ffffff', { stroke: 'rgba(10,50,100,.5)', strokeWidth: 3 });
    T(24, BASE - 8, '대수층(모래·자갈)', 13, '#1e3a8a', { align: 'left' });
    T(24, SURF + 38, '불포화대: 틈에 공기가 있어요', 13, '#7a5a2b', { align: 'left' });
    // 지표면의 풀 · 논 · 집
    ctx.strokeStyle = '#5cb85c'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let x = 0; x <= 570; x += 10) { const y = surfY(x) - 2; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    for (let i = 0; i < 5; i++) {   // 논
      const x = 24 + i * 50, y = surfY(x + 20);
      ctx.fillStyle = '#4fae52'; ctx.fillRect(x, y - 16, 44, 12);
      ctx.fillStyle = 'rgba(150,215,245,.75)'; ctx.fillRect(x, y - 8, 44, 5);
    }
    const tl = (G.sag / 10) * 0.035;
    drawHouse(318, surfY(318) - 2, 34, 26, '#f2d6b0', '#c0392b', tl);
    drawHouse(366, surfY(366) - 2, 30, 24, '#e9c4a0', '#2c6fb0', tl * 0.8);
    drawHouse(500, surfY(500) - 2, 34, 26, '#f7e1c0', '#8a5a2b', -tl);
    // 해안 모래사장
    ctx.fillStyle = '#e9d9a8'; ctx.beginPath(); ctx.moveTo(570, SURF - 2); ctx.lineTo(COAST, SL - 1); ctx.lineTo(COAST + 4, SL + 3); ctx.lineTo(574, SURF + 5); ctx.closePath(); ctx.fill();
    // 스며드는 점
    ctx.fillStyle = '#fafdff'; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.2;
    G.dots.forEach((d) => { const x = d.x + 5 * Math.sin(d.ph); ctx.beginPath(); ctx.arc(x, d.y, 2.6, 0, 6.283); ctx.fill(); ctx.stroke(); });
    drawWell(t);
    // 조작 안내 (돋보기가 있는 단계 처음)
    drawLens2(t);
    // 연도 판 + 경고
    T(650, 26, '흐른 시간', 13, '#0b3a82');
    rollDigits(622, 34, G.year, 24, 34, { pad: 2 });
    T(682, 59, '년', 17, '#0b3a82', { align: 'left' });
    FXG.draw(ctx);
  }
  function drawWell(t) {
    const x = WELL_X, y0 = surfY(x);
    // 관정 파이프 (우물 속 물기둥)
    ctx.save();
    const wy = wtY(x), pipeBot = 392;
    ctx.fillStyle = '#7b8696'; ctx.fillRect(x - 4, y0 - 4, 8, pipeBot - y0 + 4);
    const fresh = '#4fb4f0', salt = '#6e9488';
    const wcol = mixC(fresh, salt, G.salty);
    const colTop = Math.max(wy + 2, y0);
    ctx.fillStyle = wcol; ctx.fillRect(x - 2.5, colTop, 5, pipeBot - colTop);
    ctx.fillStyle = '#44506a'; ctx.fillRect(x - 6, pipeBot, 12, 6);
    ctx.restore();
    // 펌프 하우스
    ctx.save(); ctx.translate(x, y0 - 2);
    D.shadow(() => { ctx.fillStyle = '#5b6575'; ctx.fillRect(-14, -24, 28, 24); }, { blur: 5, y: 2 });
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(-18, -24); ctx.lineTo(0, -38); ctx.lineTo(18, -24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9d3e0'; ctx.fillRect(-8, -18, 16, 10);
    // 펌프 날개 (양수량에 따라 빠르게)
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.save(); ctx.translate(0, -13); ctx.rotate(t * G.P * 1.6);
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke(); ctx.restore();
    // 탱크와 수도꼭지
    ctx.fillStyle = 'rgba(220,235,250,.9)'; rr(16, -50, 20, 28, 5); ctx.fill();
    ctx.fillStyle = wcol; rr(18, -34 + (1 - (0.4 + 0.6 * G.flow)) * 10, 16, 10 + 14 * (0.4 + 0.6 * G.flow), 4); ctx.fill();
    ctx.strokeStyle = '#7b8aa0'; ctx.lineWidth = 2; rr(16, -50, 20, 28, 5); ctx.stroke();
    ctx.fillStyle = '#7b8aa0'; ctx.fillRect(34, -26, 8, 4);
    // 물줄기
    if (G.P > 0 || G.running) {
      ctx.strokeStyle = wcol; ctx.lineWidth = 1.2 + 3.6 * G.flow; ctx.lineCap = 'round';
      ctx.setLineDash([4, 5]); ctx.lineDashOffset = -t * 60;
      ctx.beginPath(); ctx.moveTo(40, -24); ctx.lineTo(40, 4); ctx.stroke(); ctx.setLineDash([]);
    }
    // 염분 막대
    ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(48, -50, 9, 28, 4); ctx.fill();
    ctx.fillStyle = mixC('#38bdf8', '#0f766e', G.salty); const sh = 3 + 25 * G.salty; rr(48, -22 - sh, 9, sh, 4); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2; rr(48, -50, 9, 28, 4); ctx.stroke();
    ctx.restore();
    T(x + 52, y0 - 56, '염분', 12, '#475569');
    if (G.salty > 0.35) {
      const wob = 3 * Math.sin(t * 8);
      pill(x + 20, y0 - 78 + wob, '짜요! 🧂', '#0f766e', '#fff', 14);
    } else if (G.hc < 1) pill(x + 20, y0 - 78, '물이 잘 안 나와요', '#92400e', '#fff', 13);
    // 우물 둘레 경고 펄스
    if (G.pulse > 0) {
      const k = 1 - G.pulse / 1.2;
      ctx.strokeStyle = 'rgba(226,70,75,' + (1 - k) + ')'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y0 - 14, 20 + 80 * k, 0, 6.283); ctx.stroke();
    }
    if (isNew('pump') && G.newT < 6) newRingSmall(x - 22, y0 - 60, 80, 62);
  }
  function newRingSmall(x, y, w, h) { newRing(x, y, w, h); }

  // 돋보기 (2.5배 확대 렌더)
  const gHash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function lensMicro(wx, wy, r, t) {
    const Z = 2.5;
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 3, 0, 6.283); ctx.clip();
    ctx.scale(Z, Z); ctx.translate(-wx, -wy);
    const hw = r / Z + 4;
    const sy = surfY(wx), wt = wtY(wx);
    // 배경
    ctx.fillStyle = '#e8f5ff'; ctx.fillRect(wx - hw, wy - hw, 2 * hw, 2 * hw);
    if (wx <= COAST) {
      const ysurf = sy;
      ctx.fillStyle = '#fbf3df'; ctx.fillRect(wx - hw, ysurf, 2 * hw, wt - ysurf);                        // 공기가 있는 불포화대
      ctx.fillStyle = '#7ec0f5'; ctx.fillRect(wx - hw, wt, 2 * hw, BASE - wt);                            // 물이 찬 틈
      ctx.fillStyle = '#5b6372'; ctx.fillRect(wx - hw, BASE, 2 * hw, 60);
    } else { ctx.fillStyle = '#7ec0f5'; ctx.fillRect(wx - hw, SL, 2 * hw, 200); }
    const cell = 10, i0 = Math.floor((wx - hw) / cell), i1 = Math.ceil((wx + hw) / cell), j0 = Math.floor((wy - hw) / cell), j1 = Math.ceil((wy + hw) / cell);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const gx = (i + 0.2 + gHash(i, j) * 0.6) * cell, gy = (j + 0.2 + gHash(j, i + 7) * 0.6) * cell, rad = 3.4 + gHash(i + 3, j + 5) * 2.4;
      if (wx <= COAST) { if (gy < sy + 2 || gy > BASE - 1) continue; }
      else if (gy < SL + 2) continue;
      ctx.fillStyle = ['#c9a876', '#b79668', '#d9c39b', '#a88862', '#bda47a'][(i * 7 + j * 3 + 100) % 5];
      ctx.beginPath(); ctx.arc(gx, gy, rad, 0, 6.283); ctx.fill();
      if (gy < wt && wx <= COAST) { ctx.strokeStyle = 'rgba(70,150,230,.8)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(gx, gy, rad + 0.7, 0, 6.283); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(gx - rad * 0.35, gy - rad * 0.35, rad * 0.35, 0, 6.283); ctx.fill();
    }
    // 지하수가 찬 곳 흐름 화살표
    if (wx <= COAST && wy + hw > wt + 6) {
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.3;
      for (let k = 0; k < 3; k++) {
        const ax = wx - hw + ((t * 5 + k * 22) % (2 * hw)), ay = Math.max(wt + 12, wy - hw * 0.2) + k * 12;
        if (ay > BASE - 6) continue;
        ctx.beginPath(); ctx.moveTo(ax - 6, ay); ctx.lineTo(ax + 4, ay); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax + 6, ay); ctx.lineTo(ax + 2, ay - 2.2); ctx.lineTo(ax + 2, ay + 2.2); ctx.fill();
      }
    }
    // 지하수면 선
    if (wx <= COAST && Math.abs(wt - wy) < hw) { ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 0.9; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(wx - hw, wt); ctx.lineTo(wx + hw, wt); ctx.stroke(); ctx.setLineDash([]); }
    // 하늘 부분
    if (wx <= COAST && sy > wy - hw) {
      ctx.fillStyle = grad(0, wy - hw, 0, sy, [[0, '#a8d8f5'], [1, '#e1f2fb']]); ctx.fillRect(wx - hw, wy - hw, 2 * hw, sy - (wy - hw));
      ctx.fillStyle = '#5cb85c'; ctx.fillRect(wx - hw, sy - 3, 2 * hw, 3);
    }
    ctx.restore();
  }
  function drawLens2(t) {
    const L = G.lens, c = lensCenter(), r = L.r;
    ctx.save(); ctx.translate(c.x, c.y);
    const sc = 1 + 0.06 * L.lift; ctx.scale(sc, sc);
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.72, r * 0.72); ctx.lineTo(r * 1.45, r * 1.45); ctx.stroke();
    D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10 + 10 * L.lift, y: 4 + 6 * L.lift });
    lensMicro(c.x, c.y, r, t);
    ctx.strokeStyle = grad(-r, -r, r, r, [[0, '#f5c14d'], [1, '#a9690f']]); ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, 6.283); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.52, r * 0.2, r * 0.1, -0.7, 0, 6.283); ctx.fill();
    ctx.restore();
    pill(c.x, c.y + r + 18, '🔍 ' + lensRegion(), '#334155', '#fff', 13);
    if (isNew('lens') && G.newT < 6) newRing(c.x - r, c.y - r, r * 2, r * 2);
  }
  const gToL = (p) => ({ x: (p.x - GT.x) / GT.s, y: (p.y - GT.y) / GT.s });
  function groundDown(p) {
    const q = gToL(p), L = G.lens;
    if (Math.hypot(q.x - L.x, q.y - L.y) < L.r + 10) { L.drag = true; L.off = { x: L.x - q.x, y: L.y - q.y }; hideHint(); Sound.tick(); return true; }
    return false;
  }
  function groundMove(p) {
    const q = gToL(p), L = G.lens;
    L.x = clamp(q.x + L.off.x, 10, 790); L.y = clamp(q.y + L.off.y, 30, 530);
  }
  function groundUp() { G.lens.drag = false; }

  /* =========================================================
     장면 4 · 우리 마을 물 관리 계획 (village)
     ========================================================= */
  const VT = PHONE ? { s: 0.75, x: 0, y: 6 } : { s: 1, x: 0, y: 0 };
  const MONTH_ORDER = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
  const PRECIP = [290, 270, 155, 60, 45, 25, 25, 35, 55, 80, 95, 150];          // 7월 → 6월
  const DEMAND = [16, 16, 15, 14, 14, 14, 14, 14, 15, 22, 24, 22];              // 7월 → 6월 (원본 1~12월: 14,14,15,22,24,22,16,16,15,14,14,14)
  const VCARDS = [
    { k: 'A', emoji: '🪣', title: '빗물 모으기', sub: '빗물 저금통·저류조' },
    { k: 'B', emoji: '🚿', title: '절수 기기', sub: '절수형 샤워기·변기' },
    { k: 'C', emoji: '♻️', title: '물 재이용', sub: '한 번 쓴 물을 처리해 다시 쓰기' },
    { k: 'D', emoji: '🌱', title: '투수성 포장', sub: '빗물이 땅속으로 스며들게' },
    { k: 'E', emoji: '⛽', title: '지하수 펑펑', sub: '지하수를 마음껏 끌어올리기' },
    { k: 'F', emoji: '🏭', title: '해수 담수화', sub: '바닷물로 물 만드는 시설' },
  ];
  const VC = PHONE ? { cols: 2, cw: 286, ch: 92, x0: 10, y0: 300, gx: 10, gy: 10 } : { cols: 6, cw: 124, ch: 118, x0: 8, y0: 398, gx: 8, gy: 0 };
  function simulateYear(sel) {
    const has = (k) => sel.indexOf(k) >= 0;
    let S = 20, tank = 0, gw = 0, energy = 0;
    const months = [], short = [];
    for (let m = 0; m < 12; m++) {
      const inflow = PRECIP[m] * 0.12;
      let level = S + inflow, spill = 0, stored = 0;
      if (level > 50) { spill = level - 50; level = 50; if (has('A')) { stored = Math.min(30 - tank, spill * 0.6); tank += stored; } }
      const peak = level;
      let demand = DEMAND[m] * (has('B') ? 0.85 : 1) * (has('C') ? 0.9 : 1);
      let sup = 2, use = 2;
      if (has('E')) { sup += 6; use += 6; }
      if (has('F')) { sup += 6; energy += 1; }
      let need = Math.max(0, demand - sup);
      const fromS = Math.min(level, need); level -= fromS; need -= fromS;
      const fromT = Math.min(tank, need); tank -= fromT; need -= fromT;
      const sh = need > 1e-9;
      if (sh) short.push(m);
      gw += ((has('D') ? 2.5 : 1.5) - use) / 10;
      S = level;
      months.push({ inflow, peak, S, tank, spill, stored, short: sh, gw, energy, fromT });
    }
    const ok = short.length === 0 && gw >= -1e-9 && energy <= 2;
    return { months, short, gw, energy, ok };
  }
  const VS = {
    sel: [], lift: VCARDS.map(() => new SciSim.Spring(0, { stiffness: 220, damping: 20 })), shake: VCARDS.map(() => 0), state: 'ready', mT: 0, res: null, result: null,
    S: new SciSim.Spring(20, { stiffness: 80, damping: 14 }), gw: 0, en: 0, tank: 0, spillK: 0, curMonth: -1, sprayT: 0, bg: null, cursor: new SciSim.Spring(0, { stiffness: 140, damping: 16 }),
    shortShow: new Array(12).fill(0), pulse: 0, newT: 0, selScale: VCARDS.map(() => 0), cracks: 0, tapBad: 0, built: { D: 0, E: 0, F: 0, A: 0 },
  };
  function vcXY(i) { return { x: VC.x0 + (i % VC.cols) * (VC.cw + VC.gx), y: VC.y0 + Math.floor(i / VC.cols) * (VC.ch + VC.gy) }; }
  function villageReset(clearSel) {
    if (clearSel) VS.sel = [];
    VS.state = 'ready'; VS.mT = 0; VS.res = null; VS.result = null; VS.curMonth = -1;
    VS.S.value = VS.S.target = 20; VS.gw = 0; VS.en = 0; VS.tank = 0; VS.shortShow.fill(0); VS.cracks = 0; VS.tapBad = 0; VS.spillK = 0; VS.cursor.value = VS.cursor.target = 0;
    updateVillageNote();
  }
  function updateVillageNote() {
    $('#villageNote').innerHTML = VS.state === 'run' ? '1년이 흘러가는 중이에요…' : '선택한 카드: <b>' + VS.sel.length + ' / 3</b> · 카드를 다시 누르면 취소돼요.';
  }
  function toggleVCard(i) {
    if (VS.state === 'run') return;
    if (VS.state === 'done') villageReset(false);
    const k = VCARDS[i].k, at = VS.sel.indexOf(k);
    if (at >= 0) { VS.sel.splice(at, 1); Sound.click(); }
    else if (VS.sel.length >= 3) { VS.shake[i] = 0.3; Sound.fail(); toast('카드는 최대 3장까지 고를 수 있어요.', null, 1800); return; }
    else { VS.sel.push(k); Sound.tick(); }
    updateVillageNote();
  }
  function runYear() {
    if (SCENE !== 'village' || VS.state === 'run') return;
    Sound.click();
    villageReset(false);
    VS.res = simulateYear(VS.sel);
    VS.state = 'run'; VS.mT = 0; VS.curMonth = -1; hideHint();
    $('#yearBtn').disabled = true; updateVillageNote();
  }
  $('#yearBtn').addEventListener('click', runYear);
  function finishYear() {
    const r = VS.res;
    VS.state = 'done'; $('#yearBtn').disabled = false; updateVillageNote();
    let msg = '', ok = r.ok;
    const hasE = VS.sel.indexOf('E') >= 0;
    if (hasE) msg = '지하수면이 ' + Math.abs(r.gw).toFixed(1) + ' m나 내려갔어요! 3단계에서 본 해수 침투가 생길 수 있어요.';
    else if (r.energy > 2) msg = '물은 충분하지만 에너지를 너무 많이 써요. 해수 담수화는 물이 정말 부족한 섬·사막 지역에 유용한 방법이에요.';
    else if (r.short.length) msg = MONTH_ORDER[r.short[0]] + '월에 물이 모자랐어요. 여름에 넘쳐 버려지는 빗물을 모으거나 물을 아껴 쓰는 방법을 더해 보세요.';
    else if (r.gw < 0) msg = '부족은 없지만 지하수면이 ' + Math.abs(r.gw).toFixed(1) + ' m 내려갔어요. 빗물이 땅속으로 스며들게 하는 방법을 찾아보세요.';
    else msg = '👏 물 부족 없이, 지하수면도 지키고, 에너지도 아꼈어요!';
    VS.result = { ok, msg, short: r.short, gw: r.gw, energy: r.energy };
    showHint((ok ? '' : '🤔 ') + msg, 7000);
    if (ok) { Sound.success(); FXV.burst(400, 200, { count: 30, speed: 220, colors: ['#16a34a', '#facc15', '#38bdf8', '#f472b6'] }); } else Sound.fail();
  }
  function updateVillage(dt, t) {
    VS.newT += dt;
    VS.cursor.update(dt);
    VS.S.update(dt);
    VCARDS.forEach((c, i) => {
      VS.lift[i].target = VS.sel.indexOf(c.k) >= 0 ? 1 : 0; VS.lift[i].update(dt);
      if (VS.shake[i] > 0) VS.shake[i] = Math.max(0, VS.shake[i] - dt);
      VS.selScale[i] = VS.lift[i].value;
    });
    // 시설이 마을에 생기는 연출
    ['A', 'D', 'E', 'F'].forEach((k) => { VS.built[k] = approach(VS.built[k], VS.sel.indexOf(k) >= 0 ? 1 : 0, dt, 5); });
    if (VS.state === 'run' && VS.res) {
      VS.mT += dt / 0.7 * (RM ? 2 : 1);
      const m = Math.min(11, Math.floor(VS.mT)), f = VS.mT - m;
      const M = VS.res.months[m], P = m > 0 ? VS.res.months[m - 1] : { S: 20, tank: 0, gw: 0, energy: 0 };
      if (m !== VS.curMonth && VS.mT < 12) {
        VS.curMonth = m; Sound.tick();
        VS.cursor.target = m;
        if (M.short) { VS.shortShow[m] = 1; Sound.tone(260, 0.12, 'sawtooth', 0.04); }
        if (M.spill > 0.5) VS.sprayT = 0.7;
      }
      const e1 = EA.outCubic(clamp(f / 0.45, 0, 1)), e2 = EA.inOutCubic(clamp((f - 0.45) / 0.55, 0, 1));
      const lvl = f < 0.45 ? lerp(P.S, M.peak, e1) : lerp(M.peak, M.S, e2);
      VS.S.target = lvl; VS.S.value = lvl; VS.S.velocity = 0;
      VS.tank = lerp(P.tank, M.tank, EA.outCubic(f));
      VS.gw = lerp(P.gw, M.gw, f); VS.en = lerp(P.energy, M.energy, f);
      VS.cracks = approach(VS.cracks, M.short ? 1 : 0, dt, 6);
      VS.tapBad = approach(VS.tapBad, M.short ? 1 : 0, dt, 8);
      VS.spillK = approach(VS.spillK, M.spill > 0.5 && f < 0.7 ? Math.min(1, M.spill / 12) : 0, dt, 8);
      // 비 입자
      if (f < 0.6 && Math.random() < dt * PRECIP[m] * 0.45) for (let i = 0; i < 2; i++) FXV.emit({ x: 20 + Math.random() * 560, y: 100 + Math.random() * 40, vx: -30, vy: 380 + Math.random() * 80, life: 0.35, size: 1.2, color: '#5a9fe0', gravity: 0, shape: 'square', fade: false });
      if (VS.mT >= 12) {
        const L = VS.res.months[11];
        VS.S.value = VS.S.target = L.S; VS.gw = L.gw; VS.en = L.energy; VS.tank = L.tank; VS.spillK = 0; VS.tapBad = 0; VS.cracks = 0;
        finishYear();
      }
    }
    if (VS.sprayT > 0) VS.sprayT -= dt;
    if (VS.spillK > 0.1 && !RM) FXV.emit({ x: 232 + Math.random() * 8, y: 262, vx: 30 + Math.random() * 50, vy: -20 - Math.random() * 40, life: 0.5, size: 2.4, color: '#c8ecff', gravity: 260 });
    if (VS.built.F > 0.6 && !RM && Math.random() < dt * 5) FXV.emit({ x: 566, y: 202, vx: 6, vy: -22, life: 1.6, size: 6, color: 'rgba(150,160,170,.6)', gravity: -8, shape: 'smoke', grow: 8 });
  }
  function buildVillageBg() {
    return makeCache(800, 380, 2, (g, d) => {
      const lg = (y0, y1, a, b) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
      g.fillStyle = lg(0, 260, '#8fd0f5', '#e6f5fc'); g.fillRect(0, 0, 800, 380);
      // 먼 산
      g.fillStyle = '#9dc4a6'; g.beginPath(); g.moveTo(0, 250); g.lineTo(80, 200); g.lineTo(160, 236); g.lineTo(260, 190); g.lineTo(380, 240); g.lineTo(470, 206); g.lineTo(560, 250); g.closePath(); g.fill();
      // 땅 단면
      g.fillStyle = lg(250, 380, '#9a7a52', '#6b4f33'); g.fillRect(0, 250, 560, 130);
      g.fillStyle = '#6cbf5a'; g.fillRect(0, 246, 560, 7);
      // 저수지 웅덩이(단면)
      g.fillStyle = '#5a4a3b'; g.beginPath(); g.moveTo(30, 250); g.lineTo(46, 342); g.lineTo(214, 342); g.lineTo(226, 250); g.closePath(); g.fill();
      // 대수층
      const r = mulberry(3);
      g.fillStyle = 'rgba(214,190,140,.75)'; g.fillRect(250, 304, 310, 76);
      for (let i = 0; i < 300; i++) { const x = 252 + r() * 306, y = 306 + r() * 72, rad = 1.5 + r() * 3; g.fillStyle = ['#c9a876', '#b79668', '#d9c39b', '#a88862'][i % 4]; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill(); }
      g.fillStyle = 'rgba(40,40,50,.55)'; g.fillRect(0, 372, 560, 8);
      // 바다
      g.fillStyle = lg(250, 380, '#5cc0ee', '#1a6aa8'); g.beginPath(); g.moveTo(560, 256); g.lineTo(646, 256); g.lineTo(646, 380); g.lineTo(560, 380); g.closePath(); g.fill();
      g.fillStyle = '#e9d9a8'; g.beginPath(); g.moveTo(552, 250); g.lineTo(580, 256); g.lineTo(572, 262); g.lineTo(552, 262); g.closePath(); g.fill();
      d.text(600, 330, '바다', { size: 14, color: '#fff', weight: 800, stroke: 'rgba(10,50,100,.5)', strokeWidth: 3 });
      d.text(400, 368, '대수층', { size: 13, color: '#1e3a8a', weight: 800 });
    });
  }
  function drawVillage(t, dt) {
    if (!VS.bg) VS.bg = buildVillageBg();
    ctx.fillStyle = '#dcecf7'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(VT.x, VT.y); ctx.scale(VT.s, VT.s);
    ctx.drawImage(VS.bg, 0, 0, 800, 380);
    // 저수지 물
    const lv = clamp(VS.S.value / 50, 0, 1), yW = 342 - lv * 86;
    ctx.save(); ctx.beginPath(); ctx.moveTo(30, 250); ctx.lineTo(46, 342); ctx.lineTo(214, 342); ctx.lineTo(226, 250); ctx.closePath(); ctx.clip();
    ctx.beginPath(); for (let x = 20; x <= 230; x += 4) { const y = yW + 1.5 * Math.sin(x * 0.1 + t * 2); x === 20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.lineTo(230, 345); ctx.lineTo(20, 345); ctx.closePath();
    ctx.fillStyle = grad(0, yW, 0, 342, [[0, 'rgba(100,190,240,.95)'], [1, 'rgba(25,100,170,.97)']]); ctx.fill(); ctx.restore();
    pill(128, 300, '저수지 ' + Math.round(VS.S.value) + ' / 50', 'rgba(15,60,110,.85)', '#fff', 13);
    // 댐
    ctx.fillStyle = grad(0, 250, 0, 342, [[0, '#d7dce3'], [1, '#98a2b0']]); ctx.beginPath(); ctx.moveTo(220, 246); ctx.lineTo(232, 246); ctx.lineTo(232, 256); ctx.lineTo(246, 256); ctx.lineTo(246, 342); ctx.lineTo(220, 342); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(80,90,105,.5)'; ctx.lineWidth = 1; for (let y = 262; y < 342; y += 10) { ctx.beginPath(); ctx.moveTo(220, y); ctx.lineTo(246, y); ctx.stroke(); }
    if (VS.spillK > 0.05) {
      ctx.fillStyle = 'rgba(160,215,245,' + (0.5 + 0.3 * VS.spillK) + ')'; ctx.fillRect(232, 256, 12 * VS.spillK + 4, 90);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 8]); ctx.lineDashOffset = -t * 90; ctx.beginPath(); ctx.moveTo(238, 258); ctx.lineTo(238, 340); ctx.stroke(); ctx.setLineDash([]);
      // 버려지는 물이 땅 위를 흘러 바다로
      ctx.fillStyle = 'rgba(120,200,245,.7)'; ctx.fillRect(246, 338, 310, 3);
      pill(310, 330, '넘쳐 버려지는 빗물', '#b91c1c', '#fff', 13);
    }
    // 논
    const crack = VS.cracks;
    for (let i = 0; i < 3; i++) {
      const x = 258 + i * 40;
      ctx.fillStyle = crack > 0.5 ? '#b99a62' : '#4fae52'; ctx.fillRect(x, 234, 36, 12);
      ctx.fillStyle = crack > 0.5 ? '#a88852' : 'rgba(150,215,245,.8)'; ctx.fillRect(x, 242, 36, 4);
      if (crack > 0.5) { ctx.strokeStyle = '#6b4f2a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x + 6, 235); ctx.lineTo(x + 12, 245); ctx.lineTo(x + 20, 239); ctx.lineTo(x + 30, 246); ctx.stroke(); }
      else { ctx.fillStyle = '#7fd06a'; for (let k = 0; k < 7; k++) ctx.fillRect(x + 3 + k * 5, 228, 1.8, 8); }
    }
    // 집과 수도꼭지
    const houses = [{ x: 410, c: '#f2d6b0', r: '#c0392b' }, { x: 452, c: '#e9c4a0', r: '#2c6fb0' }, { x: 520, c: '#f7e1c0', r: '#8a5a2b' }];
    houses.forEach((h, i) => {
      ctx.save(); ctx.translate(h.x, 247);
      D.shadow(() => { ctx.fillStyle = h.c; ctx.fillRect(-15, -26, 30, 26); }, { blur: 4, y: 2 });
      ctx.fillStyle = h.r; ctx.beginPath(); ctx.moveTo(-19, -26); ctx.lineTo(0, -40); ctx.lineTo(19, -26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7ec8ee'; ctx.fillRect(-10, -20, 7, 7); ctx.fillStyle = '#7a5530'; ctx.fillRect(4, -13, 7, 13);
      // 수도꼭지: 물이 나오면 파란 방울, 부족하면 빨간 ✖
      ctx.translate(0, -48);
      if (VS.tapBad > 0.5) { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-3.5, -3.5); ctx.lineTo(3.5, 3.5); ctx.moveTo(3.5, -3.5); ctx.lineTo(-3.5, 3.5); ctx.stroke(); }
      else { ctx.font = D.font(15, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText('🚰', 0, 0); ctx.textBaseline = 'alphabetic'; }
      ctx.restore();
    });
    if (VS.sel.indexOf('B') >= 0) { ctx.font = D.font(16, 700); ctx.textAlign = 'center'; ctx.fillText('🚿', 410, 190); }
    if (VS.sel.indexOf('C') >= 0) { ctx.font = D.font(16, 700); ctx.textAlign = 'center'; ctx.fillText('♻️', 452, 190); }
    // 관정(우물) — E를 고르면 크게
    const wx = 480, eK = VS.built.E;
    ctx.fillStyle = '#7b8696'; ctx.fillRect(wx - 3, 247, 6, 105);
    ctx.fillStyle = '#5b6575'; ctx.fillRect(wx - 9, 232, 18, 15); ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(wx - 12, 232); ctx.lineTo(wx, 222); ctx.lineTo(wx + 12, 232); ctx.closePath(); ctx.fill();
    if (eK > 0.05) {
      ctx.save(); ctx.globalAlpha = eK; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 8; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 100;
      ctx.beginPath(); ctx.moveTo(wx, 330); ctx.lineTo(wx, 240); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      pill(wx, 208, '펑펑 퍼 올려요!', '#b45309', '#fff', 13);
    }
    // 지하수(대수층) 수면: gw 에 따라 낮아짐
    const gwY = 318 - VS.gw * 6;
    ctx.save(); ctx.beginPath(); ctx.rect(250, 300, 310, 72); ctx.clip();
    ctx.beginPath(); ctx.moveTo(250, gwY);
    for (let x = 250; x <= 560; x += 6) { const cone = (VS.sel.indexOf('E') >= 0 ? 16 : 5) * Math.exp(-(((x - wx) / 36) ** 2)); ctx.lineTo(x, gwY + cone * (VS.state !== 'ready' ? 1 : 0.4)); }
    ctx.lineTo(560, 372); ctx.lineTo(250, 372); ctx.closePath();
    ctx.fillStyle = 'rgba(40,120,225,.5)'; ctx.fill();
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(250, gwY); for (let x = 250; x <= 560; x += 6) { const cone = (VS.sel.indexOf('E') >= 0 ? 16 : 5) * Math.exp(-(((x - wx) / 36) ** 2)); ctx.lineTo(x, gwY + cone * (VS.state !== 'ready' ? 1 : 0.4)); } ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 빗물 저금통(A)
    if (VS.built.A > 0.02) {
      ctx.save(); ctx.translate(372, 247); ctx.scale(VS.built.A, VS.built.A);
      D.shadow(() => { rr(-13, -34, 26, 34, 6); ctx.fillStyle = '#cfe0ef'; ctx.fill(); }, { blur: 4, y: 2 });
      const tf = clamp(VS.tank / 30, 0, 1);
      ctx.save(); rr(-13, -34, 26, 34, 6); ctx.clip(); ctx.fillStyle = 'rgba(70,160,230,.9)'; ctx.fillRect(-13, -34 + 34 * (1 - tf), 26, 34 * tf + 1); ctx.restore();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(-13, -34, 26, 34, 6); ctx.stroke();
      ctx.restore();
      T(372, 214, '저류조', 13, '#0b3a82');
      if (VS.state === 'run' && VS.res && VS.res.months[Math.min(11, Math.floor(VS.mT))].stored > 0.3) {
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 80; ctx.beginPath(); ctx.moveTo(250, 338); ctx.lineTo(372, 338); ctx.lineTo(372, 250); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // 투수성 포장(D)
    if (VS.built.D > 0.02) {
      ctx.save(); ctx.globalAlpha = VS.built.D;
      ctx.fillStyle = '#7e8a76'; ctx.fillRect(392, 246, 150, 5);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 14; i++) ctx.fillRect(394 + i * 10.5, 247, 5, 2);
      ctx.fillStyle = '#3b82f6';
      for (let i = 0; i < 8; i++) { const u = ((t * 0.5 + i / 8) % 1), x = 400 + i * 19; ctx.globalAlpha = VS.built.D * (1 - u); ctx.beginPath(); ctx.arc(x, 251 + u * 56, 2.4, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
    // 해수 담수화 시설(F)
    if (VS.built.F > 0.02) {
      ctx.save(); ctx.translate(556, 250); ctx.scale(VS.built.F, VS.built.F);
      ctx.fillStyle = '#b6c3d4'; ctx.fillRect(-26, -40, 44, 40); ctx.fillStyle = '#7e8fa6'; ctx.fillRect(-18, -52, 8, 14); ctx.fillRect(0, -46, 8, 8);
      ctx.fillStyle = '#e9f2fb'; ctx.fillRect(-20, -30, 10, 10); ctx.fillRect(-4, -30, 10, 10);
      ctx.strokeStyle = '#7e8fa6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(18, -6); ctx.lineTo(44, 4); ctx.lineTo(60, 16); ctx.stroke();
      ctx.restore();
      if (VS.built.F > 0.6) { ctx.font = D.font(16, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('⚡', 556, 190 + 4 * Math.sin(t * 5)); }
    }
    FXV.draw(ctx);
    drawTimeline(t);
    drawGauges(t);
    ctx.restore();
    // 카드
    VCARDS.forEach((c, i) => drawVCard(c, i, t));
    if (PHONE) drawResultBoard();
    if (isNew('village') && VS.newT < 6) newRing(VC.x0, VC.y0, VC.cols * (VC.cw + VC.gx) - VC.gx, PHONE ? 3 * (VC.ch + VC.gy) - VC.gy : VC.ch);
  }
  function drawTimeline(t) {
    ctx.save();
    D.shadow(() => { rr(8, 6, 630, 100, 14); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); }, { blur: 8, y: 3 });
    const x0 = 22, cw = 51;
    // 모내기 철(4~6월) 표시
    ctx.fillStyle = 'rgba(250,204,21,.22)'; rr(x0 + 9 * cw - 2, 10, cw * 3 + 2, 92, 8); ctx.fill();
    T(x0 + 10.5 * cw, 24, '🌾 모내기 철', 13, '#92400e');
    for (let i = 0; i < 12; i++) {
      const x = x0 + i * cw, h = PRECIP[i] / 300 * 52, sum = i <= 2 || i === 11 && false;
      const summer = MONTH_ORDER[i] >= 6 && MONTH_ORDER[i] <= 9;
      if (VS.shortShow[i] > 0.5) { ctx.fillStyle = 'rgba(239,68,68,.2)'; rr(x + 1, 10, cw - 2, 92, 8); ctx.fill(); }
      const cur = VS.state === 'run' && Math.floor(VS.mT) === i;
      if (cur) { ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3; rr(x + 1, 10, cw - 2, 92, 8); ctx.stroke(); }
      ctx.fillStyle = summer ? '#1d4ed8' : '#93c5fd'; rr(x + 10, 80 - h, cw - 20, h, 4); ctx.fill();
      T(x + cw / 2, 97, MONTH_ORDER[i] + '월', 13, cur ? '#6d28d9' : '#475569');
      if (VS.shortShow[i] > 0.5) T(x + cw / 2, 40, '✖', 14, '#dc2626');
    }
    T(14, 20, '월별 강수량', 13, '#0b3a82', { align: 'left' });
    ctx.restore();
  }
  function drawGauges(t) {
    ctx.save();
    D.shadow(() => { rr(646, 6, 148, 366, 14); ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fill(); }, { blur: 8, y: 3 });
    const cols = [{ x: 678, n: '저수지' }, { x: 720, n: '지하수' }, { x: 764, n: '에너지' }];
    const y0 = 70, y1 = 300, h = y1 - y0;
    cols.forEach((c) => T(c.x, 36, c.n, 13, '#0b3a82'));
    T(720, 20, '계기판', 13, '#64748b');
    // 저수지 막대
    const lv = clamp(VS.S.value / 50, 0, 1);
    ctx.fillStyle = '#e8eef6'; rr(665, y0, 26, h, 8); ctx.fill();
    ctx.save(); rr(665, y0, 26, h, 8); ctx.clip(); ctx.fillStyle = grad(0, y1 - lv * h, 0, y1, [[0, '#5fb8f0'], [1, '#1d6fb0']]); ctx.fillRect(665, y1 - lv * h, 26, lv * h + 1); ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; rr(665, y0, 26, h, 8); ctx.stroke();
    T(678, y1 + 20, Math.round(VS.S.value) + '', 15, '#1d6fb0'); T(678, y1 + 36, '용량 50', 12, '#64748b');
    // 지하수 막대 (+1 ~ -8 m)
    const gwTop = 1, gwBot = -8, zy = y0 + (gwTop - 0) / (gwTop - gwBot) * h;
    ctx.fillStyle = '#e8eef6'; rr(707, y0, 26, h, 8); ctx.fill();
    const gy = y0 + (gwTop - clamp(VS.gw, gwBot, gwTop)) / (gwTop - gwBot) * h;
    ctx.save(); rr(707, y0, 26, h, 8); ctx.clip(); ctx.fillStyle = VS.gw >= 0 ? 'rgba(59,130,246,.75)' : 'rgba(239,68,68,.7)'; ctx.fillRect(707, Math.min(zy, gy), 26, Math.abs(gy - zy)); ctx.restore();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(703, zy); ctx.lineTo(737, zy); ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(735, gy); ctx.lineTo(745, gy - 5); ctx.lineTo(745, gy + 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; rr(707, y0, 26, h, 8); ctx.stroke();
    T(720, y1 + 20, (VS.gw >= 0 ? '+' : '−') + Math.abs(VS.gw).toFixed(1) + ' m', 14, VS.gw >= 0 ? '#1d4ed8' : '#b91c1c'); T(720, y1 + 36, '기준 0', 12, '#64748b');
    // 에너지 막대 (0~12), 한도 2
    const ef = clamp(VS.en / 12, 0, 1);
    ctx.fillStyle = '#e8eef6'; rr(751, y0, 26, h, 8); ctx.fill();
    ctx.save(); rr(751, y0, 26, h, 8); ctx.clip(); ctx.fillStyle = VS.en > 2 ? '#f97316' : '#fbbf24'; ctx.fillRect(751, y1 - ef * h, 26, ef * h + 1); ctx.restore();
    const ly = y1 - (2 / 12) * h; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(747, ly); ctx.lineTo(781, ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; rr(751, y0, 26, h, 8); ctx.stroke();
    T(764, y1 + 20, '⚡ ' + Math.round(VS.en), 15, VS.en > 2 ? '#c2410c' : '#a16207'); T(764, y1 + 36, '한도 2', 12, '#16a34a');
    ctx.restore();
  }
  function drawVCard(c, i, t) {
    const p = vcXY(i), w = VC.cw, h = VC.ch, lift = VS.lift[i].value;
    const shk = VS.shake[i] > 0 ? Math.sin(VS.shake[i] * 60) * 6 * (VS.shake[i] / 0.3) : 0;
    const locked = VS.state === 'run';
    ctx.save();
    ctx.translate(p.x + w / 2 + shk, p.y + h / 2 - 10 * lift);
    const sc = 1 + 0.04 * lift; ctx.scale(sc, sc);
    ctx.globalAlpha = locked && lift < 0.5 ? 0.55 : 1;
    D.shadow(() => { rr(-w / 2, -h / 2, w, h, 14); ctx.fillStyle = lift > 0.5 ? '#f5f0ff' : '#ffffff'; ctx.fill(); }, { blur: 5 + 10 * lift, y: 2 + 5 * lift, color: 'rgba(15,35,70,.22)' });
    rr(-w / 2, -h / 2, w, h, 14); ctx.strokeStyle = lift > 0.5 ? '#8b5cf6' : '#cbd5e1'; ctx.lineWidth = lift > 0.5 ? 3.5 : 1.5; ctx.stroke();
    if (PHONE) {
      ctx.font = D.font(34, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.emoji, -w / 2 + 34, 0); ctx.textBaseline = 'alphabetic';
      D.text(-w / 2 + 66, -8, c.title, { size: 16, color: '#1b2333', align: 'left', weight: 800 });
      const ls = wrapLines(c.sub, w - 80, 13, 2); ls.forEach((s, k) => D.text(-w / 2 + 66, 12 + k * 16, s, { size: 13, color: '#64748b', align: 'left', weight: 700 }));
    } else {
      ctx.font = D.font(30, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.emoji, 0, -h / 2 + 30); ctx.textBaseline = 'alphabetic';
      D.text(0, -h / 2 + 64, c.title, { size: 14, color: '#1b2333', weight: 800 });
      const ls = wrapLines(c.sub, w - 18, 13, 3); ls.forEach((s, k) => D.text(0, -h / 2 + 82 + k * 15, s, { size: 13, color: '#64748b', weight: 700 }));
    }
    if (lift > 0.5) { ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(w / 2 - 14, -h / 2 + 14, 11, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(w / 2 - 19, -h / 2 + 14); ctx.lineTo(w / 2 - 15, -h / 2 + 18); ctx.lineTo(w / 2 - 9, -h / 2 + 10); ctx.stroke(); }
    ctx.restore();
  }
  function drawResultBoard() {
    const x = 10, y = 616, w = 580, h = 212;
    ctx.save(); D.shadow(() => { rr(x, y, w, h, 14); ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fill(); }, { blur: 8, y: 3 });
    T(x + 14, y + 28, '📋 1년 결과', 16, '#0b3a82', { align: 'left' });
    const r = VS.state === 'done' ? VS.res : null;
    if (!r) { T(x + w / 2, y + 110, '카드를 고르고 ▶ 1년 돌려 보기를 눌러요', 15, '#64748b'); ctx.restore(); return; }
    T(x + 14, y + 56, '물 부족한 달: ' + (r.short.length ? r.short.map((m) => MONTH_ORDER[m] + '월').join(', ') : '없음 ✅'), 15, r.short.length ? '#b91c1c' : '#15803d', { align: 'left' });
    T(x + 14, y + 82, '지하수면: ' + (r.gw >= 0 ? '+' : '−') + Math.abs(r.gw).toFixed(1) + ' m', 15, r.gw >= 0 ? '#15803d' : '#b91c1c', { align: 'left' });
    T(x + 14, y + 108, '에너지: ' + r.energy + ' (한도 2)', 15, r.energy > 2 ? '#b91c1c' : '#15803d', { align: 'left' });
    if (VS.result) wrapLines(VS.result.msg, w - 28, 15, 4).forEach((s, k) => T(x + 14, y + 140 + k * 22, s, 15, '#1b2333', { align: 'left' }));
    ctx.restore();
  }
  function villageDown(p) {
    for (let i = 0; i < VCARDS.length; i++) {
      const q = vcXY(i);
      if (p.x >= q.x && p.x <= q.x + VC.cw && p.y >= q.y - 6 && p.y <= q.y + VC.ch + 4) { toggleVCard(i); return false; }
    }
    return false;
  }

  /* =========================================================
     입력 · 읽기값 · 장면 전환 · 게임(미션)
     ========================================================= */
  SciSim.pointer(view, {
    hover(p) {
      if (SCENE === 'village') { for (let i = 0; i < VCARDS.length; i++) { const q = vcXY(i); if (p.x >= q.x && p.x <= q.x + VC.cw && p.y >= q.y && p.y <= q.y + VC.ch) return 'pointer'; } }
      return null;
    },
    down(p) {
      if (SCENE === 'flask') return flaskDown(p);
      if (SCENE === 'survey') return surveyDown(SV.dataMode === 'none' ? p : p);
      if (SCENE === 'ground') return groundDown(p);
      if (SCENE === 'village') return villageDown(p);
      return false;
    },
    move(p) {
      if (SCENE === 'flask') flaskMove(p);
      else if (SCENE === 'survey') surveyMove(p);
      else if (SCENE === 'ground') groundMove(p);
    },
    up(p) {
      if (SCENE === 'flask') flaskUp(p);
      else if (SCENE === 'survey') surveyUp(p);
      else if (SCENE === 'ground') groundUp(p);
    },
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (SCENE === 'flask') { if (F.mode === 1) flaskPourStart(); else flaskMode(F.mode); }
    else if (SCENE === 'survey') { if (SV.dataMode === 'none') surveyReset(); else SV.dataT = 0; }
    else if (SCENE === 'ground') { if (!G.running && !G.rewind) { groundReset(); G.lens.x = 92; G.lens.y = 112; } }
    else if (SCENE === 'village') villageReset(true);
  });

  const rd = { r1: $('#r1'), r2: $('#r2'), r3: $('#r3'), l1: $('#l1'), l2: $('#l2'), l3: $('#l3') };
  const rdLast = {};
  function setRd(k, v) { if (rdLast[k] !== v) { rdLast[k] = v; (k[0] === 'l' ? rd[k].textContent = v : rd[k].innerHTML = v); } }
  function updateReadouts() {
    if (SCENE === 'flask') {
      setRd('l1', '내 예측'); setRd('r1', F.pred + '<small>mL</small>');
      setRd('l2', '실제 담수'); setRd('r2', F.revealDone || F.mode > 1 ? '25<small>mL</small>' : (F.revealing ? Math.round(F.num) + '<small>mL</small>' : '?'));
      setRd('l3', '해수'); setRd('r3', fmt(Math.round(F.level)) + '<small>mL</small>');
    } else if (SCENE === 'survey') {
      setRd('l1', '분류한 카드'); setRd('r1', SV.placedN + '<small>/ 8</small>');
      setRd('l2', '가장 많이 쓰는 물'); setRd('r2', SV.dataMode === 'donut' || SV.dataMode === 'bars' ? '농업용수' : '-');
      setRd('l3', '연 강수량(우리나라)'); setRd('r3', SV.dataMode === 'bars' ? '약 1,300<small>mm</small>' : '-');
    } else if (SCENE === 'ground') {
      setRd('l1', '양수량 · 시간'); setRd('r1', G.P + '<small>/년</small> · ' + Math.floor(G.year) + '<small>년째</small>');
      setRd('l2', '지하수면 높이'); setRd('r2', G.hc.toFixed(1) + '<small>m</small>');
      setRd('l3', '우물물'); setRd('r3', G.salty > 0.35 ? '짬 🧂' : G.hc < 1 ? '잘 안 나옴' : '맑음');
    } else {
      const r = VS.state === 'done' ? VS.res : null;
      setRd('l1', '물 부족'); setRd('r1', r ? r.short.length + '<small>달</small>' : (VS.state === 'run' ? '…' : '-'));
      setRd('l2', '지하수면 변화'); setRd('r2', (VS.state === 'ready' ? '-' : (VS.gw >= 0 ? '+' : '−') + Math.abs(VS.gw).toFixed(1) + '<small>m</small>'));
      setRd('l3', '에너지'); setRd('r3', VS.state === 'ready' ? '-' : Math.round(VS.en) + '');
    }
  }
  function setSceneUI() {
    $$('.cg').forEach((el) => {
      const hide = el.getAttribute('data-scene') !== SCENE;
      el.hidden = hide;
      if (el.parentElement && el.parentElement.classList.contains('control')) el.parentElement.style.display = hide ? 'none' : '';
    });
    $('#sceneName').textContent = SCENE_NAME[SCENE];
    hideHint();
  }

  /* ---------- 퀴즈 그림(인라인 SVG) ---------- */
  const FIG_DEBATE = '<svg viewBox="0 0 320 96" width="320" role="img" aria-label="토론 주장 카드"><rect x="4" y="4" width="312" height="70" rx="16" fill="#fff7e6" stroke="#f59e0b" stroke-width="2.5"/><path d="M40 74 L28 92 L64 74 Z" fill="#fff7e6" stroke="#f59e0b" stroke-width="2.5" stroke-linejoin="round"/><rect x="30" y="72" width="40" height="5" fill="#fff7e6"/>' +
    '<text x="160" y="32" text-anchor="middle" font-size="16" font-weight="800" fill="#92400e">🗣️ “우리나라는 비가 많이 오니까</text><text x="160" y="56" text-anchor="middle" font-size="16" font-weight="800" fill="#92400e">물을 아껴 쓸 필요가 없어!”</text></svg>';
  const FIG_BAR = '<div class="bar4"><i style="width:97%;background:#1d6fb0" title="해수"></i><i style="width:6px;background:#bfe6fb"></i><i style="width:5px;background:#caa56a"></i><i style="width:3px;background:#4fb4f0"></i></div>';

  /* ---------- 게임 ---------- */
  game = SciSim.game({
    simId: 'm3-hydrosphere',
    mount: '#game',
    badge: '물 지킴이',
    homeHref: '../../index.html#g3',
    featureLabels: {
      flask: '🧪 지구의 물 1 L 모형', survey: '🗂️ 활용 사례 카드', data: '📊 우리나라 물 자료', ground: '⛰️ 지하수 단면 모형',
      lens: '🔍 돋보기', pump: '🚰 양수량 조절', village: '🏘️ 마을 물 관리 계획',
    },
    levels: [
      {
        title: '지구의 물, 1 L에 담아 보기', short: '물의 분포', icon: '🌍', phase: '관찰',
        features: ['flask'],
        intro: '<p class="si-q">❓ 탐구 질문: 지구 표면의 약 70 %가 바다인 ‘물의 행성’인데, 왜 쓸 수 있는 물이 부족하다고 할까?</p>' +
          '<p>지구의 모든 물을 <b>1 L 병</b>에 줄여 담았다고 생각해 봐요. 이 중 짜지 않은 물(<b>담수</b>)은 몇 mL일까요? 먼저 <b>예측</b>해 봐요.</p>',
        setup() { flaskPourStart(); },
        recap: '지구의 물은 <b>해수가 약 97.5 %</b>이고 <b>담수는 약 2.5 %</b>예요. 담수의 대부분은 빙하이고, 우리가 쉽게 쓰는 물은 1 %도 되지 않아요.',
        summary: '<p><b>수권</b> = 지구에 있는 모든 물</p>' + FIG_BAR + '<p class="bar4-note">▇ 해수 97.47 % · 빙하 1.76 % · 지하수 0.76 % · 호수·하천수 0.01 % (작은 칸은 확대해서 봐요)</p>' +
          '<ul><li>해수 97.47 % · 담수 약 2.5 %</li><li>담수 중 빙하 약 70 %, 지하수 약 30 %, 호수·하천수 1 % 미만</li><li>쉽게 이용하는 물(지하수+호수·하천수)은 지구 전체 물의 1 % 미만</li></ul>',
        missions: [
          {
            title: '예측하고 확인하기',
            goal: '담수 컵의 노란 손잡이를 끌어 1 L 중 담수가 몇 mL일지 <b>예측</b>한 뒤 <b>🔍 확인하기</b>를 누르세요.',
            hint: '손잡이를 끌거나 오른쪽 슬라이더를 움직여 예측량을 정해요. 그다음 🔍 확인하기!',
            hold: 0,
            setup() { flaskMode(1); setSceneUI(); rangeP.set(F.pred); showHint('컵의 노란 손잡이를 끌어 담수의 양을 예측해 봐요', 5000); },
            check: () => F.mode === 1 && F.revealDone,
            status: () => '내 예측 <b>' + F.pred + ' mL</b> · 실제 담수 <b>' + (F.revealDone ? '25 mL' : '?') + '</b>' + (F.revealDone ? '' : ' (공개 후 25 mL)'),
            explain: '1 L 중 담수는 약 <b>25 mL(2.5 %)</b>뿐이에요. 나머지 약 975 mL(97.5 %)는 짠 해수예요. 지구의 물은 대부분 바다에 있어요.',
          },
          {
            title: '담수 나누어 보기',
            goal: '담수 25 mL가 세 시험관에 나뉘어요. 이름표(🧊 빙하·⛰️ 지하수·🏞️ 호수·하천수)를 끌어 알맞은 시험관 아래에 놓으세요.',
            hint: '가장 많은 담수는 얼음 상태로 있어요. 땅속에 스며 있는 물이 그다음이에요.',
            hold: 0.4,
            setup() { flaskMode(2); setSceneUI(); },
            check: () => F.mode === 2 && F.placedOk >= 3,
            status: () => '맞힌 이름표 <b>' + F.placedOk + ' / 3</b>',
            explain: '담수의 약 <b>70 %는 빙하</b>, 약 30 %는 지하수예요. 호수와 하천수는 담수의 1 %도 안 돼 1 L 모형에서는 겨우 두 방울(약 0.1 mL)이에요. 빙하도 짜지 않은 담수지만 대부분 남극·그린란드와 높은 산에 있어요.',
          },
          {
            type: 'quiz', title: '우리가 주로 쓰는 물',
            goal: '사람이 생활에 주로 이용하는 물(지하수, 호수·하천수)은 지구 전체 물의 어느 정도일까요?',
            choices: ['약 97 % — 바다가 넓어서 대부분 쓸 수 있다', '약 2.5 % — 담수는 모두 쉽게 쓸 수 있다', '1 %도 되지 않는다', '약 50 % — 지구의 절반은 육지의 물이다'],
            answer: 2,
            feedback: ['해수는 짜서 그대로 마시거나 농사에 쓸 수 없어요.', '담수의 약 70 %는 극지방과 높은 산의 빙하라서 바로 쓰기 어려워요.', '', '1 L 모형에서 지하수와 호수·하천수를 더하면 몇 mL였나요?'],
            setup() { flaskMode(3); setSceneUI(); },
            explain: '지하수(0.76 %)와 호수·하천수(0.01 %)를 더해도 지구 전체 물의 약 <b>0.77 %</b>예요. 1 L 중 8 mL도 안 돼요. 그래서 물은 아껴 써야 할 소중한 자원이에요.',
          },
        ],
      },
      {
        title: '물은 어디에 어떻게 쓰일까?', short: '활용 사례', icon: '🔎', phase: '탐구',
        features: ['survey', 'data'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구의 물이 해수·빙하·지하수·호수와 하천수로 나뉘고, 쉽게 쓸 수 있는 물은 아주 적다는 것을 알았어요.</div>' +
          '<p>각각의 물은 실제로 어떻게 활용될까요? <b>조사 카드</b>를 알맞은 물에 분류하고, 우리나라의 <b>물 이용 자료</b>를 해석해 봐요.</p>',
        setup() { surveyReset(); },
        recap: '해수·빙하·지하수·호수와 하천수는 <b>각각 다르게 활용</b>돼요. 우리나라는 비가 여름에 몰리고 1인당 쓸 수 있는 물이 적어 물 관리가 중요해요.',
        summary: '<table class="cmp"><tr><th>🌊 해수</th><td>수산물(김·미역·물고기), 소금(염전), 해수 담수화</td></tr><tr><th>🧊 빙하</th><td>녹은 물이 큰 강의 시작이 돼요(직접 쓰기는 어려워요)</td></tr><tr><th>⛰️ 지하수</th><td>관정으로 끌어 올려 식수·농업용수·생활용수로 써요</td></tr><tr><th>🏞️ 호수·하천수</th><td>댐에 모아 수돗물·공업용수·농업용수, 수력 발전</td></tr></table>' +
          '<p>우리나라 용도별 물 이용: <b>농업용수 &gt; 하천 유지용수 &gt; 생활용수 &gt; 공업용수</b></p><p>강수: 연 약 1,300 mm, 여름(6~9월)에 약 2/3가 집중, 1인당 강수 총량은 세계 평균의 약 1/6</p>',
        missions: [
          {
            title: '활용 사례 카드 분류',
            goal: '카드를 끌어 알맞은 물(🌊 해수·🧊 빙하·⛰️ 지하수·🏞️ 호수·하천수)에 놓으세요. <b>8장</b>을 모두 분류해요.',
            hint: '카드 속 낱말을 보세요: 짠물·소금 → 해수, 얼음 → 빙하, 땅속·우물 → 지하수, 댐·강 → 호수·하천수',
            hold: 0.4,
            setup() { surveyMode('cards'); setSceneUI(); showHint('카드를 끌어서 알맞은 물 위에 놓아요', 4500); },
            check: () => SV.dataMode === 'none' && SV.placedN >= 8,
            status: () => '분류한 카드 <b>' + SV.placedN + ' / 8</b>',
            explain: '해수는 수산물·소금·해수 담수화에, 빙하는 녹은 물이 강의 근원이 되고, 지하수는 식수·농업용수로, 호수와 하천수는 댐에 모아 생활·공업·농업용수와 수력 발전에 쓰여요. 빙하는 담수의 대부분이지만 직접 쓰기 어려워요.',
          },
          {
            type: 'quiz', title: '우리나라 물 이용 자료',
            goal: '📊 우리나라의 용도별 물 이용 자료를 바르게 해석한 것은?',
            choices: ['가정·학교에서 쓰는 생활용수가 가장 많다', '농업용수와 하천 유지용수를 합하면 전체의 약 3/4이다', '공업용수가 생활용수보다 많다', '생활용수와 공업용수를 합하면 전체의 절반이 넘는다'],
            answer: 1,
            feedback: ['생활용수는 약 20 %예요. 가장 많은 조각을 다시 보세요.', '', '공업용수는 약 6 %로 가장 적어요.', '20 % + 6 % = 26 %예요.'],
            setup() { surveyMode('donut'); setSceneUI(); },
            explain: '우리나라에서는 논에 물을 대는 벼농사 등 <b>농업용수가 가장 많고(약 41 %)</b>, 강의 생태계와 수질을 지키려고 흘려보내는 하천 유지용수가 그다음(약 33 %)이에요.',
          },
          {
            type: 'quiz', title: '비가 많이 오는데 왜?',
            goal: '우리나라는 연 강수량이 세계 평균보다 많아요. 그런데도 물 관리가 중요한 까닭으로 <b>옳지 않은</b> 것은?',
            choices: ['비가 여름철(6~9월)에 몰려 내린다', '산지가 많아 빗물이 빠르게 바다로 흘러간다', '인구가 많아 1인당 쓸 수 있는 물이 적다', '비가 세계 평균보다 적게 내린다'],
            answer: 3,
            feedback: ['이것은 물 관리가 중요한 실제 까닭이에요. 옳지 않은 것을 찾아요.', '이것은 물 관리가 중요한 실제 까닭이에요. 옳지 않은 것을 찾아요.', '이것은 물 관리가 중요한 실제 까닭이에요. 옳지 않은 것을 찾아요.', ''],
            setup() { surveyMode('bars'); setSceneUI(); },
            explain: '우리나라는 비가 세계 평균보다 많이 오지만 <b>여름에 몰려 내리고</b> 빨리 바다로 흘러가며, 1인당 쓸 수 있는 물은 적어요. 그래서 물을 모아 두고 아껴 쓰는 관리가 꼭 필요해요.',
          },
        ],
      },
      {
        title: '땅속의 보물, 지하수', short: '지하수', icon: '⛰️', phase: '모형',
        features: ['ground', 'lens', 'pump'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지하수가 담수 중 빙하 다음으로 많고, 식수·농업용수로 쓰인다는 것을 알았어요.</div>' +
          '<p>지하수는 땅속 어디에 있고, 어떻게 채워질까요? 바닷가 마을의 <b>지하수 단면 모형</b>으로 알아봐요.</p>',
        setup() { groundReset(3); G.lens.x = 92; G.lens.y = 112; G.newT = 0; },
        recap: '지하수는 <b>땅속 틈을 채운 물</b>이고 빗물로 천천히 채워져요. 채워지는 양보다 많이 쓰면 지하수면이 내려가고 해수 침투·지반 침하가 생겨요.',
        summary: '<ul><li><b>지하수의 가치</b>: 담수 중 빙하 다음으로 많고, 가뭄에도 쓸 수 있으며 수온·수질이 비교적 일정해요.</li><li><b>문제</b>: 지나친 양수 → 지하수면 하강, 지반 침하, 해수 침투. 한번 오염되면 회복이 어려워요.</li><li><b>활용 방안</b>: 빗물이 채워 주는 양 안에서 쓰기, 쓰지 않는 관정 막기, 오염 막기, 빗물이 땅속으로 스며들게 하기</li></ul>',
        missions: [
          {
            title: '지하수는 어디에?',
            goal: '🔍 돋보기를 끌어 <b>지하수가 있는 곳</b>을 찾아 1초 동안 비춰 보세요.',
            hint: '돋보기 속에서 모래알 사이가 모두 파랗게 물로 차 있는 곳이 지하수예요. 지하수면(파란 점선) 아래를 찾아봐요.',
            hold: 1.5,
            setup() { groundReset(3); G.lens.x = 92; G.lens.y = 112; G.newT = 0; setSceneUI(); showHint('돋보기를 끌어 땅속을 들여다봐요', 4500); },
            check: () => SCENE === 'ground' && lensInAquifer(),
            status: () => '돋보기 위치: <b>' + lensRegion() + '</b>',
            explain: '지하수는 땅속의 커다란 호수나 강이 아니라, <b>모래·자갈·암석의 작은 틈을 가득 채운 물</b>이에요. 빗물이 땅속으로 스며들어 천천히 채워져요.',
          },
          {
            title: '너무 많이 뽑아 쓰면?',
            goal: '양수량을 <b>5 이상</b>으로 올리고 <b>⏩ 10년 흘려보기</b>를 눌러 마을에 무슨 일이 생기는지 관찰하세요.',
            hint: '슬라이더로 양수량을 5나 6으로 올린 뒤 ⏩ 버튼을 눌러요.',
            hold: 0.5,
            setup() { groundReset(3); setSceneUI(); },
            check: () => !!(G.lastRun && !G.running && G.lastRun.P >= 5),
            status: () => '양수량 <b>' + G.P + '</b> · <b>' + Math.floor(G.year) + '</b>년째 · 지하수면 <b>' + G.hc.toFixed(1) + ' m</b> · 우물물: <b>' + (G.salty > 0.35 ? '짬' : '맑음') + '</b>',
            explain: '빗물이 스며드는 양(3)보다 많이 뽑아 쓰자 <b>지하수면이 계속 내려갔어요</b>. 바닷가에서는 바닷물이 지하수층으로 밀려들어 우물물이 짜졌고(<b>해수 침투</b>), 땅이 내려앉기도 했어요(<b>지반 침하</b>).',
          },
          {
            title: '오래 쓰는 방법 찾기',
            goal: '마을에 필요한 물(양수량 <b>2 이상</b>)을 얻으면서, 10년 뒤 지하수면이 처음보다 <b>0.5 m 넘게 내려가지 않는</b> 양수량을 찾아 10년 흘려보세요.',
            hint: '빗물이 1년에 채워 주는 양은 3이에요. 그보다 많이 쓰면 어떻게 될까요?',
            hold: 0.5,
            setup() { groundReset(4); setSceneUI(); },
            check: () => !!(G.lastRun && !G.running && G.lastRun.P >= 2 && G.lastRun.hcEnd >= 7.5),
            status: () => '양수량 <b>' + G.P + '</b> · 10년 뒤 지하수면 변화 <b>' + (G.lastRun ? (G.lastRun.delta >= 0 ? '+' : '−') + Math.abs(G.lastRun.delta).toFixed(1) + ' m' : '?') + '</b>',
            explain: '빗물이 채워 주는 만큼만 쓰면 지하수를 오래 쓸 수 있어요. 지하수는 양이 많고(호수·하천수의 약 70배), 가뭄에도 쓸 수 있는 소중한 자원이지만, 한번 줄어들거나 오염되면 회복에 아주 오랜 시간이 걸려요.',
          },
        ],
      },
      {
        title: '우리 마을 물 지키기', short: '물의 가치', icon: '🤝', phase: '적용',
        features: ['village'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지하수는 채워지는 만큼만 써야 오래 쓸 수 있다는 것을 알았어요.</div>' +
          '<p>3단계의 바닷가 마을이 해마다 <b>봄 가뭄(모내기 철)</b>에 물이 부족해요. <b>지속가능한 방법</b>을 골라 1년(7월 → 다음 해 6월)을 버텨 봐요.</p>',
        setup() { villageReset(true); VS.newT = 0; },
        recap: '물은 순환하지만 <b>쉽게 쓸 수 있는 물은 적고 고르게 있지 않아요</b>. 모으고·아끼고·채우는 지속가능한 방법으로 물을 지켜요.',
        summary: '<p><b>지속가능한 수자원 활용 방안</b></p><ul><li>빗물 이용(빗물 저금통·저류조) — 여름에 넘치는 빗물 모으기</li><li>물 재이용, 절수 기기 사용 — 아껴 쓰기</li><li>투수성 포장·빗물 정원 — 빗물이 땅속으로 스며들어 지하수 채우기</li><li>지하수는 채워지는 만큼만 쓰기(적정 양수)</li><li>해수 담수화 — 물이 정말 부족한 곳에 유용하지만 에너지가 많이 들어요</li></ul>' +
          '<p><b>나의 실천 예</b>: 양치 컵 쓰기 · 샤워 시간 줄이기 · 빨래 모아서 하기 · 빗물로 화분 주기</p>',
        missions: [
          {
            title: '봄 가뭄을 이겨 내는 계획',
            goal: '행동 카드를 <b>3장까지</b> 골라 <b>▶ 1년 돌려 보기</b>를 누르세요. 물 부족 없이, 지하수면도 지키고, 에너지도 아끼는 계획을 세워요.',
            hint: '여름에 남는 빗물 모으기(🪣), 물 아끼기(🚿·♻️), 지하수 채우기(🌱) 중에서 골라 보세요.',
            hold: 0.3,
            setup() { villageReset(true); VS.newT = 0; setSceneUI(); },
            check: () => !!(VS.state === 'done' && VS.result && VS.result.ok),
            status: () => {
              const r = VS.state === 'done' ? VS.res : null;
              return '선택 <b>' + VS.sel.length + '/3</b> · 물 부족 <b>' + (r ? r.short.length + '달' : '?') + '</b> · 지하수면 <b>' + (r ? (r.gw >= 0 ? '+' : '−') + Math.abs(r.gw).toFixed(1) + ' m' : '?') + '</b> · 에너지 <b>' + (r ? r.energy : '?') + '</b>';
            },
            explain: '물을 <b>모으고</b>(빗물 이용), <b>아끼고</b>(절수·재이용), 지하수를 <b>채우는</b>(투수성 포장) 방법을 함께 쓰면, 다음 세대도 쓸 수 있게 물을 지속가능하게 이용할 수 있어요.',
          },
          {
            type: 'quiz', title: '토론: 물을 아껴야 할까?',
            figure: FIG_DEBATE,
            goal: '이 주장에 대한 <b>가장 과학적인 반박</b>은?',
            choices: ['맞는 말이다. 연 강수량이 세계 평균보다 많으니 걱정할 필요가 없다', '비가 여름에 몰려 내리고 1인당 쓸 수 있는 물이 적으며, 지하수도 채워지는 양보다 많이 쓰면 줄어든다', '바닷물이 많으니 언제든지 그대로 마시면 된다', '빙하가 많으니 물이 부족할 일은 없다'],
            answer: 1,
            feedback: ['강수량이 많아도 여름에 몰려 내려 대부분 바다로 흘러가 버려요. 2단계 자료를 떠올려 보세요.', '', '해수는 짜서 그대로 마실 수 없고, 담수화에는 많은 에너지가 들어요.', '빙하는 대부분 극지방과 높은 산에 있어 쓰기 어려워요.'],
            setup() { setSceneUI(); },
            explain: '쉽게 쓸 수 있는 담수는 매우 적고, 때와 장소에 따라 고르게 있지 않아요. 빗물 이용, 물 재이용, 절약, 지하수 보호처럼 <b>지속가능한 방법</b>으로 물을 써야 해요. 오늘부터 양치 컵 쓰기, 샤워 시간 줄이기를 실천해 봐요!',
          },
        ],
      },
    ],
  });

  /* ---------- 메인 루프 ---------- */
  const UPDATE = { flask: updateFlask, survey: updateSurvey, ground: updateGround, village: updateVillage };
  const DRAWERS = {
    flask: (t, dt) => drawFlask(t, dt),
    survey: (t, dt) => drawSurvey(t, dt),
    ground: (t, dt) => {
      ctx.fillStyle = '#dcecf7'; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.translate(GT.x, GT.y); ctx.scale(GT.s, GT.s); drawGround(t); ctx.restore();
      if (PHONE) {
        T(300, 450, '빗물이 채워 주는 양: 해마다 3', 17, '#0b3a82');
        T(300, 484, '양수량 ' + G.P + ' / 지하수면 ' + G.hc.toFixed(1) + ' m', 17, '#1b2333');
        T(300, 518, '아래 슬라이더로 양수량을 바꿔요', 15, '#64748b');
      }
    },
    village: (t, dt) => drawVillage(t, dt),
  };
  setSceneUI();
  SciSim.loop((dt, t) => { try { frame(dt, t); } catch (e) { console.error(e); } });
  function frame(dt, t) {
    const want = SCENE_BY_LEVEL[clamp(game.level, 0, 3)];
    if (want !== SCENE) {
      prevScene = SCENE; SCENE = want; trans = RM ? 1 : 0; setSceneUI();
      if (SCENE === 'ground') G.newT = 0;
    }
    if (trans < 1) trans = Math.min(1, trans + dt / 0.6);
    for (const k in UPDATE) UPDATE[k](dt, t);
    FX.update(dt); FXL.update(dt); FXS.update(dt); FXG.update(dt); FXV.update(dt);
    view.clear('#dcecf7');
    if (trans < 1 && prevScene) {
      DRAWERS[prevScene](t, dt);
      const e = EA.inOutCubic(trans);
      ctx.save(); ctx.globalAlpha = e;
      const z = lerp(1.04, 1, e); ctx.translate(VW / 2, VH / 2); ctx.scale(z, z); ctx.translate(-VW / 2, -VH / 2);
      DRAWERS[SCENE](t, dt);
      ctx.restore();
    } else DRAWERS[SCENE](t, dt);
    updateReadouts();
  }

  // 테스트용 보조 도구
  window.__sim = {
    F, SV, G, VS, CARDS, simulateYear, setPred, startReveal, runTen, runYear, toggleVCard,
    get scene() { return SCENE; },
    dropCard(i) { const c = SV.cards[i]; if (!c || c.placed) return; c.placed = true; c.mini = 1; c.chipN = SV.cards.filter((o) => o.placed && o.zone === c.zone && o !== c).length; const q = zoneChipPos(c.zone, c.chipN); c.sx.value = c.sx.target = q.x; c.sy.value = c.sy.target = q.y; c.x = q.x; c.y = q.y; SV.placedN++; },
    placeChip(i) { const c = F.chips[i]; const s = slotRect(c.target); c.placed = c.target; c.sx.value = c.sx.target = s.x + s.w / 2; c.sy.value = c.sy.target = s.y + s.h / 2; F.placedOk++; },
    lensTo(x, y) { G.lens.x = x; G.lens.y = y; },
    setP(v) { G.P = v; rangeSP.set(v); },
    trayXY, vcXY, slotRect, trayPos, lensRegion, wtY, xToe, ZONES, TRAY, VC,
  };
})();
