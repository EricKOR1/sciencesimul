/* =========================================================
   중2 Ⅷ. 별과 우주 - 우주 탐사  [9과15-04]
   탐구 흐름(4단계):
   ① 관찰: 로켓 발사(우주로 가는 방법) + 우주 탐사 역사 연표(세계 · 우리나라) 순서 맞추기
   ② 탐구: 탐사 목표 ↔ 탐사 방법(착륙선·탐사선·우주 망원경·우주 정거장) 짝짓기, 지상 vs 우주 망원경 비교
   ③ 설명: 집 안에서 우주 기술(스핀오프) 찾기, 인공위성의 활용, 우주 쓰레기 문제
   ④ 적용: 목표·방법·핵심 기술을 골라 탐사 계획서 완성 → 발사·도착 애니메이션
   역사 연도: 1957 스푸트니크 1호, 1961 가가린, 1969 아폴로 11호, 1977 보이저 1·2호, 1990 허블, 1998 국제 우주 정거장 건설 시작,
             2021 제임스 웹, 1992 우리별 1호, 2013 나로호, 2022 누리호 2차 발사 성공·다누리 발사
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp } = SciSim;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;
  const RM = !!SciSim.reduceMotion;
  const rgba = SciSim.color.rgba, shade = SciSim.color.shade, mixc = SciSim.color.mix;
  const approach = SciSim.approach, ease = SciSim.ease;
  const VW = 800, VH = 660;
  const V = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#0a1230' });
  const ctx = V.ctx;
  const D = SciSim.draw(ctx);
  const FXS = new SciSim.Particles();   // 연기
  const FXF = new SciSim.Particles();   // 불꽃 (밝게 겹쳐 그림)
  const FX = new SciSim.Particles();    // 반짝이
  let game = null;
  const has = (f) => (game ? game.has(f) : f === 'launch');
  const f = (px, weight) => (weight || 700) + ' ' + px + 'px ' + FONT;
  const txt = (x, y, s, o) => D.text(x, y, s, o);
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  const pill = (x, y, s, o) => D.label(x, y, s, Object.assign({ bg: 'rgba(8,16,44,.88)', color: '#fff', size: 14 }, o || {}));
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const SPRITES = {}, SPR = Math.min(2, window.devicePixelRatio || 1);
  function sprite(key, w, h, fn) {
    let c = SPRITES[key];
    if (!c) {
      c = document.createElement('canvas'); c.width = Math.ceil(w * SPR); c.height = Math.ceil(h * SPR);
      const g = c.getContext('2d'); g.scale(SPR, SPR); fn(g, w, h);
      SPRITES[key] = c;
    }
    return c;
  }
  const WRAPC = {};
  function wrap(text, maxW, font) {
    const key = text + '|' + maxW + '|' + font;
    if (WRAPC[key]) return WRAPC[key];
    ctx.save(); ctx.font = font;
    const words = text.split(' '), lines = [];
    let cur = '';
    const push = (w) => { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width <= maxW || !cur) cur = test; else { lines.push(cur); cur = w; } };
    words.forEach((w) => {
      if (ctx.measureText(w).width > maxW) { let part = ''; for (const ch of w) { if (ctx.measureText(part + ch).width > maxW && part) { push(part); part = ch; } else part += ch; } push(part); }
      else push(w);
    });
    if (cur) lines.push(cur);
    ctx.restore();
    return (WRAPC[key] = lines);
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    D.roundRect(x, y, w, h, o.r || 14); ctx.fillStyle = o.fill || 'rgba(10,18,44,.82)'; ctx.fill();
    ctx.strokeStyle = o.stroke || 'rgba(160,190,255,.28)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  const inRect = (p, r, pad) => p.x >= r.x - (pad || 0) && p.x <= r.x + r.w + (pad || 0) && p.y >= r.y - (pad || 0) && p.y <= r.y + r.h + (pad || 0);

  const S = {
    scene: 'history', sceneA: 1,
    // ①
    launchOK: false, tlWorldOK: false, tlKoreaOK: false, lastCheck: 0, wrongShown: false, tl: 'world',
    // ②
    matchOK: false, scopeV: 'ground', scopeSeen: { ground: 0, space: 0 }, scopeDone: { ground: false, space: false }, scopeA: 0,
    // ③
    found: [false, false, false, false], infoSel: -1, shake: [0, 0, 0, 0], satSel: -1, decoyMsg: null, decoyT: 0, houseA: 0,
    // ④
    plan: { goal: -1, method: -1, tech: -1 }, arrived: false, flight: null, planPop: [0, 0, 0],
  };

  /* =========================================================
     카드 보드 (끌어서 놓기)
     ========================================================= */
  function mkBoard(opts) {
    const B = { slots: opts.slots, pool: opts.pool, tokens: [], reveal: opts.slots.map(() => 0), done: false, kind: opts.kind };
    opts.items.forEach((it, i) => B.tokens.push(Object.assign({ zone: -1, x: 0, y: 0, tx: 0, ty: 0, w: opts.slots[0].w, h: opts.slots[0].h, lift: 0, drag: false, order: 0, shake: 0, wrong: false, tw: null, home: i }, it)));
    return B;
  }
  function bTarget(B, t) {
    if (t.zone >= 0) { const s = B.slots[t.zone]; return { x: s.x + (s.w - t.w) / 2, y: s.y + (s.h - t.h) / 2 }; }
    return B.pool[t.home];
  }
  function bSettle(B, instant) {
    B.tokens.forEach((t) => {
      if (t.drag) return;
      const g = bTarget(B, t);
      if (instant) { if (t.tw) t.tw.cancel(); t.x = t.tx = g.x; t.y = t.ty = g.y; return; }
      if (Math.abs(g.x - t.tx) > 0.5 || Math.abs(g.y - t.ty) > 0.5) {
        t.tx = g.x; t.ty = g.y; if (t.tw) t.tw.cancel();
        t.tw = SciSim.tween(t, { x: g.x, y: g.y }, { duration: 0.42, ease: 'outBack' });
      }
    });
  }
  function bHit(B, p) {
    for (let i = B.tokens.length - 1; i >= 0; i--) { const t = B.tokens[i]; if (p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h) return t; }
    return null;
  }
  let orderCtr = 1;
  function bDrop(B, t, p) {
    let z = B.slots.findIndex((s) => inRect(p, s, 10));
    if (z < 0) { // 카드 중심이 칸 안에 들어오면 그 칸으로
      const c = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
      z = B.slots.findIndex((s) => inRect(c, s, 0));
    }
    t.wrong = false;
    if (z >= 0) {
      const occ = B.tokens.find((o) => o.zone === z && o !== t);
      if (occ) { occ.zone = -1; occ.wrong = false; }
      t.zone = z; t.order = orderCtr++; Sound.tone(520 + z * 60, 0.08, 'triangle', 0.08);
    } else t.zone = -1;
  }
  function bTap(B, t) {
    if (t.zone >= 0) { t.zone = -1; t.wrong = false; Sound.click(); return; }
    // 비어 있는 첫 칸으로
    for (let i = 0; i < B.slots.length; i++) if (!B.tokens.some((o) => o.zone === i)) { t.zone = i; t.order = orderCtr++; t.wrong = false; Sound.tone(520 + i * 60, 0.08, 'triangle', 0.08); return; }
  }
  function bReset(B) { B.tokens.forEach((t) => { t.zone = -1; t.wrong = false; t.drag = false; }); B.done = false; B.reveal = B.slots.map(() => 0); bSettle(B, true); }
  function bCheck(B) {
    S.lastCheck = performance.now();
    const un = B.tokens.filter((t) => t.zone < 0).length;
    if (un) return '아직 놓지 않은 카드가 ' + un + '장 있어요.';
    const bad = B.tokens.filter((t) => t.zone !== t.kind).length;
    if (bad) return bad + '장이 알맞지 않아요. 빨간 테두리 카드를 다시 생각해 봐요.';
    return true;
  }
  function refreshWrong(B) { B.tokens.forEach((t) => { t.wrong = t.zone >= 0 && t.zone !== t.kind; }); }
  const wrongNow = () => performance.now() - S.lastCheck < 1100;

  /* ---------- 연표 카드 ---------- */
  const WORLD = [
    { year: 1957, name: '스푸트니크 1호', sub: '최초의 인공위성', icon: '🛰️' },
    { year: 1961, name: '가가린', sub: '최초의 유인 우주 비행', icon: '👨‍🚀' },
    { year: 1969, name: '아폴로 11호', sub: '최초의 유인 달 착륙', icon: '🌕' },
    { year: 1977, name: '보이저 1·2호', sub: '발사', icon: '🚀' },
    { year: 1990, name: '허블 우주 망원경', sub: '발사', icon: '🔭' },
    { year: 1998, name: '국제 우주 정거장', sub: '건설 시작', icon: '🏗️' },
    { year: 2021, name: '제임스 웹 우주 망원경', sub: '발사', icon: '✨' },
  ];
  const KOREA = [
    { year: 1992, name: '우리별 1호', sub: '우리나라 최초의 인공위성', icon: '🇰🇷' },
    { year: 2013, name: '나로호', sub: '우리 땅에서 쏘아 올린 로켓', icon: '🚀' },
    { year: 2022, name: '누리호 · 다누리', sub: '누리호 2차 발사 성공, 달 궤도선 다누리 발사', icon: '🌙' },
  ];
  const slotsW = [], poolW = [];
  for (let i = 0; i < 7; i++) { slotsW.push({ x: 15 + i * 111, y: 306, w: 104, h: 124 }); poolW.push({ x: 15 + i * 111, y: 482 }); }
  const slotsK = [], poolK = [];
  for (let i = 0; i < 3; i++) { slotsK.push({ x: 14 + i * 262, y: 306, w: 248, h: 124 }); poolK.push({ x: 14 + i * 262, y: 482 }); }
  const ORD_W = [4, 1, 6, 0, 3, 5, 2], ORD_K = [2, 0, 1];
  const BW = mkBoard({ kind: 'tl', slots: slotsW, pool: poolW, items: ORD_W.map((k) => Object.assign({ kind: k }, WORLD[k])) });
  const BK = mkBoard({ kind: 'tl', slots: slotsK, pool: poolK, items: ORD_K.map((k) => Object.assign({ kind: k }, KOREA[k])) });
  // 정답 순서에 맞춰 칸마다 연도 저장
  BW.years = WORLD.map((e) => e.year); BK.years = KOREA.map((e) => e.year);
  bSettle(BW, true); bSettle(BK, true);

  function drawCard(t, B, tag) {
    const sc = 1 + t.lift * 0.06, sx = t.shake > 0 ? Math.sin(t.shake * 28) * 6 * t.shake : 0;
    ctx.save();
    ctx.translate(t.x + sx + t.w / 2, t.y - t.lift * 5 + t.h / 2); ctx.scale(sc, sc); ctx.translate(-t.w / 2, -t.h / 2);
    const showWrong = t.zone >= 0 && t.wrong && wrongNow() && game && game.phase === 'active';
    D.shadow(() => { D.roundRect(0, 0, t.w, t.h, 12); const g = ctx.createLinearGradient(0, 0, 0, t.h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8eefb'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6 + t.lift * 14, y: 2 + t.lift * 7, color: 'rgba(0,0,0,.5)' });
    D.roundRect(0, 0, t.w, t.h, 12); ctx.strokeStyle = B.done && t.zone >= 0 ? '#22c55e' : t.zone >= 0 ? 'rgba(99,102,241,.8)' : 'rgba(148,163,184,.9)'; ctx.lineWidth = B.done && t.zone >= 0 ? 3 : 2; ctx.stroke();
    if (showWrong) { D.roundRect(-2, -2, t.w + 4, t.h + 4, 14); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3.5; ctx.stroke(); }
    const wide = t.w > 150;
    txt(t.w / 2, wide ? 38 : 34, t.icon, { size: wide ? 32 : 28 });
    const nl = wrap(t.name, t.w - 14, f(wide ? 16 : 14, 800));
    nl.forEach((ln, i) => txt(t.w / 2, (wide ? 62 : 56) + i * (wide ? 19 : 17), ln, { size: wide ? 16 : 14, weight: 800, color: '#1e293b' }));
    const sl = wrap(t.sub, t.w - 14, f(13, 600));
    sl.forEach((ln, i) => txt(t.w / 2, (wide ? 62 : 56) + nl.length * (wide ? 19 : 17) + 5 + i * 15, ln, { size: 13, weight: 600, color: '#475569' }));
    ctx.restore();
  }

  /* =========================================================
     로켓 · 발사 장면
     ========================================================= */
  function rocketShape(x, y, sc, rot, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); if (alpha != null) ctx.globalAlpha = alpha;
    // 날개
    [-1, 1].forEach((k) => {
      const g = ctx.createLinearGradient(0, 0, 26 * k, 0); g.addColorStop(0, '#e11d48'); g.addColorStop(1, '#9f1239');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(13 * k, 12); ctx.lineTo(27 * k, 38); ctx.lineTo(13 * k, 31); ctx.closePath(); ctx.fill();
    });
    // 노즐
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(-8, 33); ctx.lineTo(8, 33); ctx.lineTo(11, 45); ctx.lineTo(-11, 45); ctx.closePath(); ctx.fill();
    // 몸통
    const bg = ctx.createLinearGradient(-13, 0, 13, 0); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, '#e5ebf6'); bg.addColorStop(1, '#a9b6cc');
    D.roundRect(-13, -32, 26, 68, 7); ctx.fillStyle = bg; ctx.fill();
    // 줄무늬
    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-13, 6, 26, 7);
    // 코
    const ng = ctx.createLinearGradient(-13, 0, 13, 0); ng.addColorStop(0, '#fb7185'); ng.addColorStop(1, '#be123c');
    ctx.fillStyle = ng; ctx.beginPath(); ctx.moveTo(-13, -30); ctx.quadraticCurveTo(0, -66, 13, -30); ctx.closePath(); ctx.fill();
    // 창
    D.sphere(0, -14, 7, '#38bdf8', { gloss: true, outline: '#e2e8f0', outlineWidth: 2.5 });
    ctx.restore();
  }
  function flameShape(x, y, sc, rot, len, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalCompositeOperation = 'lighter';
    const L = len * (0.85 + 0.25 * Math.sin(t * 40) + 0.1 * Math.sin(t * 77));
    const g = ctx.createLinearGradient(0, 44, 0, 44 + L); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.25, 'rgba(255,214,120,.9)'); g.addColorStop(0.65, 'rgba(255,120,40,.55)'); g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-9, 44); ctx.quadraticCurveTo(-12, 44 + L * 0.5, 0, 44 + L); ctx.quadraticCurveTo(12, 44 + L * 0.5, 9, 44); ctx.closePath(); ctx.fill();
    const g2 = ctx.createLinearGradient(0, 44, 0, 44 + L * 0.55); g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(-5, 44); ctx.quadraticCurveTo(-6, 44 + L * 0.3, 0, 44 + L * 0.55); ctx.quadraticCurveTo(6, 44 + L * 0.3, 5, 44); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const LP = { x: 14, y: 14, w: 772, h: 236 };
  const GROUND_Y = 212;
  const LC = { phase: 'idle', t: 0, alt: 0, v: 0, rx: 190, ry: 166, rot: 0, ra: 1, shake: 0, earthA: 0, ot: 0, satOpen: 0, satA: 0, flash: 0, lastNum: 0, thrust: 0, sepT: 0 };
  const CLOUDS = [[1.2, 90, 1.0], [2.5, 330, 1.3], [3.5, 520, 0.9], [5.0, 250, 1.5], [6.8, 640, 1.1], [8.5, 130, 1.2], [11, 470, 1.4], [14, 700, 1.0], [18, 300, 1.6], [24, 560, 1.3], [32, 180, 1.2], [42, 420, 1.0]];
  const STARS_L = []; { const r = rng(5); for (let i = 0; i < 90; i++) STARS_L.push([LP.x + r() * LP.w, LP.y + r() * LP.h, 0.6 + r() * 1.4, r() * TAU]); }
  function launch() {
    if (LC.phase !== 'idle' && LC.phase !== 'done') return;
    Object.assign(LC, { phase: 'count', t: 0, alt: 0, v: 0, rx: 190, ry: 166, rot: 0, ra: 1, shake: 0, earthA: 0, ot: 0, satOpen: 0, satA: 0, flash: 0, lastNum: 0, thrust: 0 });
    FXS.clear(); FXF.clear(); S.launchOK = false;
    Sound.click();
    syncLaunchUI();
  }
  function syncLaunchUI() {
    const b = $('#launchBtn'), n = $('#launchNote');
    const run = LC.phase !== 'idle' && LC.phase !== 'done';
    b.disabled = run; b.textContent = run ? '🔥 발사 중…' : LC.phase === 'done' ? '↺ 다시 발사!' : '🚀 로켓 발사!';
    n.textContent = run ? '로켓이 우주를 향해 날아가요. 고도를 살펴봐요.' : LC.phase === 'done' ? '인공위성이 궤도에 올랐어요! 다시 볼 수 있어요.' : '버튼을 누르면 카운트다운 뒤에 로켓이 날아올라요.';
  }
  const camSpeed = () => clamp(LC.v * 12, 0, 430);
  function updateLaunch(dt, t) {
    const L = LC;
    if (L.phase === 'idle') { L.shake = 0; return; }
    L.t += dt;
    if (L.phase === 'count') {
      const n = 3 - Math.floor(L.t / 0.8);
      if (n !== L.lastNum && n >= 1) { L.lastNum = n; Sound.tone(480, 0.12, 'square', 0.05); }
      if (L.t > 2.0) { // 점화: 연기와 진동
        L.shake = clamp((L.t - 2.0) / 0.6, 0, 1); L.thrust = L.shake * 0.7;
        if (!RM && Math.random() < dt * 80) puffGround(1);
      }
      if (L.t >= 2.7) { L.phase = 'burn'; L.t = 0; L.v = 0; Sound.tone(70, 1.6, 'sawtooth', 0.06); Sound.tone(110, 1.2, 'triangle', 0.05, 0.1); for (let i = 0; i < 14; i++) puffGround(1.6); }
    } else if (L.phase === 'burn' || L.phase === 'coast') {
      const burning = L.phase === 'burn' || L.t < 0.9;
      if (burning) { L.v = Math.min(36, L.v + 8.5 * dt); L.thrust = approach(L.thrust, 1, dt, 6); } else { L.thrust = approach(L.thrust, 0, dt, 10); L.v = Math.max(20, L.v - dt * 4); }
      L.alt += L.v * dt;
      L.shake = burning ? (L.alt < 3 ? 0.7 : 0.25) : 0;
      if (L.phase === 'burn' && L.alt >= 100) { L.phase = 'coast'; L.t = 0; L.flash = 1; Sound.tone(880, 0.25, 'triangle', 0.1); Sound.tone(1175, 0.3, 'triangle', 0.08, 0.15); }
      if (L.phase === 'coast' && L.t > 1.5) { L.phase = 'orbit'; L.ot = 0; L.o0 = { x: L.rx, y: L.ry }; }
    } else if (L.phase === 'orbit' || L.phase === 'done') {
      L.shake = 0; L.thrust = 0; L.ot += dt;
      L.earthA = clamp(L.ot / 1.4, 0, 1);
      if (L.phase === 'orbit' && L.ot > 4.6) { L.phase = 'done'; S.launchOK = true; syncLaunchUI(); FX.burst(560, 110, { count: 18, colors: ['#fde68a', '#ffffff', '#5eead4'], speed: 150, gravity: 20, size: 3 }); Sound.success(); }
      L.satA += dt * 0.5;
    }
    L.flash = Math.max(0, L.flash - dt * 1.4);
    // 카메라(고도)에 따른 로켓 위치
    const k = ease.outCubic(clamp(L.alt / 5, 0, 1));
    if (L.phase === 'burn' || L.phase === 'coast' || L.phase === 'count') { L.rx = 190; L.ry = GROUND_Y - 46 - 48 * k; }
    if (L.phase === 'orbit' || L.phase === 'done') {
      const ob = orbitPoint(clamp((L.ot - 0.2) / 4.2, 0, 1), L);
      L.rx = ob.x; L.ry = ob.y; L.rot = ob.rot;
    }
    // 연기 · 불꽃 방출
    if (!RM && (L.phase === 'burn' || L.phase === 'coast') && L.thrust > 0.2) emitExhaust(dt);
    if (L.phase === 'burn' && L.alt < 3 && !RM && Math.random() < dt * 60) puffGround(0.8);
  }
  function orbitPoint(u, L) {
    const e = ease.inOutSine(u), cx = 400, cy = 820, R = 668;
    const a = -Math.PI / 2 - 0.42 + e * 0.9;
    const px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
    const blend = ease.outCubic(clamp(u * 3, 0, 1));
    const o0 = L.o0 || { x: 190, y: 120 };
    return { x: o0.x + (px - o0.x) * blend, y: o0.y + (py - o0.y) * blend, rot: (a + Math.PI / 2) * blend };
  }
  function puffGround(k) {
    const x = LC.rx + (Math.random() - 0.5) * 30, y = GROUND_Y - 4 + LC.alt * -0;
    const gy = Math.min(GROUND_Y + LC.alt * 14, GROUND_Y + 200) - 4;
    if (gy > LP.y + LP.h) return;
    const dir = Math.random() < 0.5 ? -1 : 1;
    FXS.emit({ x, y: gy, vx: dir * (50 + Math.random() * 130) * k, vy: -10 - Math.random() * 24, life: 1.8, size: 10 + Math.random() * 10, grow: 24 + Math.random() * 16, color: 'rgba(238,240,246,.9)', shape: 'smoke', alpha: 0.55, drag: 1.2, gravity: -6 });
    void y;
  }
  function emitExhaust(dt) {
    const L = LC, d = 46, nx = L.rx - Math.sin(L.rot) * d, ny = L.ry + Math.cos(L.rot) * d;
    const cs = camSpeed();
    const nf = dt * 130 * L.thrust;
    for (let i = 0; i < nf + (Math.random() < nf % 1 ? 1 : 0); i++) {
      FXF.emit({ x: nx + (Math.random() - 0.5) * 8, y: ny + 6, vx: (Math.random() - 0.5) * 70, vy: 220 + Math.random() * 120 + cs * 0.3, life: 0.28 + Math.random() * 0.2, size: 4 + Math.random() * 4, grow: -10, color: Math.random() < 0.5 ? '#ffd27a' : '#ff8a3d', shape: 'circle', gravity: 0 });
    }
    if (L.alt < 60) {
      const ns = dt * 70 * L.thrust * (1 - L.alt / 70);
      for (let i = 0; i < ns + (Math.random() < ns % 1 ? 1 : 0); i++) {
        FXS.emit({ x: nx + (Math.random() - 0.5) * 10, y: ny + 14, vx: (Math.random() - 0.5) * 50, vy: cs * 0.55 + 20 + Math.random() * 40, life: 1.3 + Math.random() * 0.6, size: 7 + Math.random() * 4, grow: 24 + Math.random() * 14, color: 'rgba(240,242,248,.9)', shape: 'smoke', alpha: 0.5 * (1 - L.alt / 70), drag: 0.8 });
      }
    }
  }
  function drawLaunch(t) {
    const L = LC;
    ctx.save();
    D.roundRect(LP.x, LP.y, LP.w, LP.h, 16); ctx.clip();
    const f0 = clamp(L.alt / 100, 0, 1);
    const top = mixc('#3b9cf0', '#040612', Math.pow(f0, 0.75)), bot = mixc('#cfe9ff', '#0a1430', Math.pow(f0, 0.55));
    const g = ctx.createLinearGradient(0, LP.y, 0, LP.y + LP.h); g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(LP.x, LP.y, LP.w, LP.h);
    // 별
    const sa = clamp((f0 - 0.35) / 0.4, 0, 1) + (L.phase === 'orbit' || L.phase === 'done' ? 1 : 0);
    if (sa > 0) { ctx.save(); ctx.fillStyle = '#fff'; STARS_L.forEach((s) => { ctx.globalAlpha = clamp(sa, 0, 1) * (0.4 + 0.5 * Math.sin(t * 1.5 + s[3])); ctx.fillRect(s[0], s[1], s[2], s[2]); }); ctx.restore(); }
    // 구름
    const sc = 14;
    CLOUDS.forEach((c) => {
      const y = L.ry - 6 + (L.alt - c[0]) * sc + 40; if (y < LP.y - 40 || y > LP.y + LP.h + 40) return;
      ctx.save(); ctx.globalAlpha = 0.85 * (1 - f0 * 1.2 > 0 ? 1 - f0 * 1.2 : 0);
      const x = c[1] % 700 + 40; ctx.fillStyle = '#ffffff';
      [[0, 0, 26], [28, 6, 20], [-26, 8, 18], [52, 12, 14]].forEach((q) => { ctx.beginPath(); ctx.arc(x + q[0] * c[2], y + q[1], q[2] * c[2] * 0.8, 0, TAU); ctx.fill(); });
      ctx.restore();
    });
    // 우주의 경계 (100 km)
    {
      const y = L.ry - 6 + (L.alt - 100) * sc + 40;
      if (L.phase === 'burn' && y > LP.y - 10 && y < LP.y + LP.h) {
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(LP.x, y); ctx.lineTo(LP.x + LP.w, y); ctx.stroke(); ctx.setLineDash([]);
        txt(LP.x + LP.w - 14, y - 8, '우주의 경계 (고도 100 km)', { size: 14, weight: 800, color: '#fff', align: 'right', stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 }); ctx.restore();
      }
    }
    // 땅과 발사대
    const off = Math.min(L.alt * 14 + (L.phase === 'burn' || L.phase === 'coast' ? 0 : 0), 400);
    if (L.phase === 'idle' || L.phase === 'count' || L.alt < 30) {
      const gy = GROUND_Y + (L.phase === 'idle' || L.phase === 'count' ? 0 : off);
      if (gy < LP.y + LP.h + 4) {
        const gg = ctx.createLinearGradient(0, gy, 0, gy + 60); gg.addColorStop(0, '#5b8f4a'); gg.addColorStop(1, '#2f5d2e');
        ctx.fillStyle = gg; ctx.fillRect(LP.x, gy, LP.w, 80);
        ctx.fillStyle = '#7a8594'; ctx.fillRect(130, gy - 6, 120, 8); // 발사대
        ctx.fillStyle = '#5a6678'; ctx.fillRect(138, gy, 104, 12);
        // 발사탑
        ctx.strokeStyle = '#3f4a5c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(262, gy - 6); ctx.lineTo(262, gy - 120); ctx.moveTo(278, gy - 6); ctx.lineTo(278, gy - 120);
        for (let i = 0; i < 7; i++) { ctx.moveTo(262, gy - 6 - i * 17); ctx.lineTo(278, gy - 23 - i * 17); ctx.moveTo(278, gy - 6 - i * 17); ctx.lineTo(262, gy - 23 - i * 17); }
        ctx.stroke(); ctx.fillStyle = '#e11d48'; ctx.fillRect(258, gy - 126, 24, 7);
        // 먼 산
        ctx.fillStyle = '#7da6c6'; ctx.beginPath(); ctx.moveTo(LP.x, gy); for (let x = 0; x <= LP.w; x += 40) ctx.lineTo(LP.x + x, gy - 22 - 16 * Math.sin(x * 0.02 + 1)); ctx.lineTo(LP.x + LP.w, gy); ctx.closePath(); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    // 지구 (궤도 단계)
    if (L.earthA > 0.01) {
      const ea = ease.outCubic(L.earthA), cx = 400, cy = 820 + (1 - ea) * 120, R = 620;
      ctx.save(); ctx.globalAlpha = ea;
      const ag = ctx.createRadialGradient(cx, cy, R - 4, cx, cy, R + 36); ag.addColorStop(0, 'rgba(120,190,255,.7)'); ag.addColorStop(1, 'rgba(120,190,255,0)');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, R + 36, 0, TAU); ctx.fill();
      const eg = ctx.createRadialGradient(cx - 120, cy - 300, 20, cx, cy, R); eg.addColorStop(0, '#4a98e8'); eg.addColorStop(0.55, '#1f64c4'); eg.addColorStop(1, '#0c2e6e');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      // 대륙(조각)
      ctx.fillStyle = 'rgba(90,170,90,.85)'; [[-220, -570, 60, 22], [-60, -600, 90, 26], [130, -590, 70, 20], [260, -540, 80, 28]].forEach((q) => { ctx.beginPath(); ctx.ellipse(cx + q[0], cy + q[1] + 22, q[2], q[3], 0.2, 0, TAU); ctx.fill(); });
      ctx.fillStyle = 'rgba(255,255,255,.35)'; [[-120, -604, 70, 8], [60, -612, 90, 9], [210, -578, 60, 7]].forEach((q) => { ctx.beginPath(); ctx.ellipse(cx + q[0], cy + q[1] + 22, q[2], q[3], 0, 0, TAU); ctx.fill(); });
      ctx.restore();
    }
    // 연기
    FXS.draw(ctx);
    // 인공위성 (궤도 단계)
    if (L.phase === 'orbit' || L.phase === 'done') {
      const so = clamp((L.ot - 3.4) / 0.9, 0, 1);
      if (so > 0) {
        const open = ease.outBack(so);
        const px = L.rx + (L.phase === 'done' ? Math.min(60, (L.ot - 4.6) * 40) : 0), py = L.ry - 56 - open * 8;
        drawSatellite(px, py, 0.9, open, t);
      }
    }
    // 로켓과 불꽃
    {
      const sh = L.shake, jx = RM ? 0 : (Math.random() - 0.5) * sh * 3, jy = RM ? 0 : (Math.random() - 0.5) * sh * 2;
      const vis = L.phase === 'orbit' || L.phase === 'done' ? clamp(1 - Math.max(0, L.ot - 4.6) * 0.8, 0.25, 1) : 1;
      if (L.thrust > 0.05) flameShape(L.rx + jx, L.ry + jy, 1, L.rot, 36 + 40 * L.thrust, t);
      rocketShape(L.rx + jx, L.ry + jy, 1, L.rot, vis);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; FXF.draw(ctx); ctx.restore();
    // 우주 도착 섬광
    if (L.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + L.flash * 0.45 + ')'; ctx.fillRect(LP.x, LP.y, LP.w, LP.h); }
    // 숫자 카운트다운
    if (L.phase === 'count') {
      const n = 3 - Math.floor(L.t / 0.8);
      if (n >= 1) { const k = (L.t % 0.8) / 0.8, sc2 = 1 + (1 - ease.outCubic(clamp(k * 2, 0, 1))) * 0.6; txt(560, 150, String(n), { size: 100 * sc2, weight: 400, color: '#fff', stroke: 'rgba(10,20,60,.55)', strokeWidth: 8, alpha: 1 - k * 0.5 }); ctx.font = DISPLAY; }
      else txt(560, 140, '발사!', { size: 64, weight: 400, color: '#fde68a', stroke: 'rgba(10,20,60,.6)', strokeWidth: 7 });
    }
    // 계기판
    const run = L.phase !== 'idle';
    const alt = Math.min(Math.round(L.alt), L.phase === 'orbit' || L.phase === 'done' ? 400 : 999);
    const inSpace = L.alt >= 100;
    D.label(LP.x + 14, LP.y + 22, run ? '고도 ' + (inSpace && L.phase !== 'burn' ? '100+' : alt) + ' km' : '🌍 발사 준비 완료', { size: 15, align: 'left', bg: 'rgba(6,12,34,.82)', color: '#fff', pad: 10 });
    if (run) { D.label(LP.x + 14, LP.y + 52, inSpace ? '🌌 우주' : '🌤️ 대기권', { size: 14, align: 'left', bg: inSpace ? 'rgba(76,29,149,.85)' : 'rgba(3,105,161,.85)', color: '#fff', pad: 10 }); }
    if (L.phase === 'orbit' || L.phase === 'done') D.label(LP.x + LP.w - 14, LP.y + 22, '🛰️ 궤도 비행', { size: 14, align: 'right', bg: 'rgba(6,12,34,.82)', color: '#bae6fd', pad: 10 });
    if (L.phase === 'done') { D.label(LP.x + LP.w / 2, LP.y + 62, '인공위성이 궤도에 올랐어요!', { size: 17, bg: 'rgba(20,83,45,.92)', color: '#dcfce7', pad: 14 }); }
    ctx.restore();
    D.roundRect(LP.x, LP.y, LP.w, LP.h, 16); ctx.strokeStyle = 'rgba(160,190,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
  }
  function drawSatellite(x, y, sc, open, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(Math.sin(t * 0.8) * 0.08);
    // 태양 전지판
    [-1, 1].forEach((k) => {
      ctx.save(); ctx.scale(k * open, 1);
      ctx.fillStyle = '#1d4ed8'; ctx.fillRect(10, -7, 40, 14);
      ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < 4; i++) { ctx.moveTo(10 + i * 10, -7); ctx.lineTo(10 + i * 10, 7); } ctx.moveTo(10, 0); ctx.lineTo(50, 0); ctx.stroke();
      ctx.restore();
    });
    const bg = ctx.createLinearGradient(-9, -9, 9, 9); bg.addColorStop(0, '#fde68a'); bg.addColorStop(1, '#b45309');
    D.roundRect(-10, -10, 20, 20, 3); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(0, -14, 5, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -14); ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     탐사 장비 그림
     ========================================================= */
  function iconLander(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(-23, 24); ctx.moveTo(9, 6); ctx.lineTo(23, 24); ctx.moveTo(-3, 8); ctx.lineTo(-8, 24); ctx.moveTo(3, 8); ctx.lineTo(8, 24); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; [[-23, 25], [23, 25]].forEach((q) => { ctx.beginPath(); ctx.ellipse(q[0], q[1], 6, 2.4, 0, 0, TAU); ctx.fill(); });
    const g = ctx.createLinearGradient(-16, -14, 16, 10); g.addColorStop(0, '#fde68a'); g.addColorStop(0.5, '#f59e0b'); g.addColorStop(1, '#b45309');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(-17, -4); ctx.lineTo(-9, -13); ctx.lineTo(9, -13); ctx.lineTo(17, -4); ctx.lineTo(14, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,53,15,.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(6, 8); ctx.lineTo(8, 14); ctx.lineTo(-8, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.arc(0, -4, 4.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(8, -13); ctx.lineTo(8, -22); ctx.stroke(); ctx.beginPath(); ctx.arc(8, -23, 2.6, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function iconProbe(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(30, 14); ctx.moveTo(-8, 4); ctx.lineTo(-28, 12); ctx.stroke();
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(31, 15, 3, 0, TAU); ctx.fill(); ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(-29, 12, 3, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(-12, 0, 12, 12); g.addColorStop(0, '#e2e8f0'); g.addColorStop(1, '#94a3b8');
    ctx.fillStyle = g; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ctx.lineTo(Math.cos(a) * 11, 4 + Math.sin(a) * 9); } ctx.closePath(); ctx.fill();
    const dg = ctx.createRadialGradient(-4, -14, 2, 0, -10, 20); dg.addColorStop(0, '#ffffff'); dg.addColorStop(1, '#a7b4c8');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(0, -9, 21, 8, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(0, -9, 3.5, 1.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function iconScope(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot != null ? rot : -0.45); ctx.scale(s, s);
    [-1, 1].forEach((k) => { ctx.fillStyle = '#1d4ed8'; ctx.fillRect(-7, k > 0 ? 8 : -26, 14, 18); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, k > 0 ? 8 : -26); ctx.lineTo(0, k > 0 ? 26 : -8); ctx.moveTo(-7, k > 0 ? 17 : -17); ctx.lineTo(7, k > 0 ? 17 : -17); ctx.stroke(); });
    const g = ctx.createLinearGradient(0, -9, 0, 9); g.addColorStop(0, '#f1f5f9'); g.addColorStop(0.5, '#cbd5e1'); g.addColorStop(1, '#64748b');
    ctx.fillStyle = g; D.roundRect(-28, -9, 52, 18, 4); ctx.fill();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(25, 0, 4, 10, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.ellipse(25, 0, 2, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(-28, -9, 6, 18);
    ctx.restore();
  }
  function iconStation(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(32, 0); ctx.stroke();
    [-26, -14, 14, 26].forEach((px) => { ctx.fillStyle = '#1e40af'; ctx.fillRect(px - 5, -19, 10, 14); ctx.fillRect(px - 5, 5, 10, 14); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 0.8; ctx.strokeRect(px - 5, -19, 10, 14); ctx.strokeRect(px - 5, 5, 10, 14); });
    const g = ctx.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#94a3b8');
    ctx.fillStyle = g; D.roundRect(-9, -6, 18, 12, 4); ctx.fill(); D.roundRect(-3, -11, 6, 22, 3); ctx.fill();
    ctx.fillStyle = '#7dd3fc'; ctx.fillRect(-5, -2, 3, 3);
    ctx.restore();
  }
  function iconMoon(x, y, r) {
    D.sphere(x, y, r, '#c9ced6', { light: '#f3f4f6', dark: '#7b8494', gloss: false });
    ctx.save(); ctx.fillStyle = 'rgba(90,100,115,.35)'; [[-0.3, -0.2, 0.2], [0.25, 0.15, 0.26], [0.0, 0.5, 0.14], [-0.35, 0.35, 0.12]].forEach((q) => { ctx.beginPath(); ctx.arc(x + q[0] * r, y + q[1] * r, q[2] * r, 0, TAU); ctx.fill(); }); ctx.restore();
  }
  function iconPlanet(x, y, r, ringBack) {
    ctx.save();
    if (ringBack) { ctx.strokeStyle = 'rgba(240,215,160,.55)'; ctx.lineWidth = r * 0.28; ctx.beginPath(); ctx.ellipse(x, y, r * 1.8, r * 0.5, -0.35, Math.PI, TAU); ctx.stroke(); }
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, '#fde7b0'); g.addColorStop(0.6, '#e8b45f'); g.addColorStop(1, '#8a5a24');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,100,40,.35)'; ctx.lineWidth = r * 0.1; [-0.4, 0, 0.35].forEach((k) => { ctx.beginPath(); ctx.ellipse(x, y + k * r, r * 0.95, r * 0.12, 0, 0, TAU); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(240,215,160,.85)'; ctx.lineWidth = r * 0.28; ctx.beginPath(); ctx.ellipse(x, y, r * 1.8, r * 0.5, -0.35, 0, Math.PI); ctx.stroke();
    ctx.restore();
  }
  function iconGalaxy(x, y, r, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate((t || 0) * 0.1); ctx.globalCompositeOperation = 'lighter';
    D.glow(0, 0, r, '#9db8ff', 0.5); D.glow(0, 0, r * 0.4, '#ffe6b0', 0.9);
    ctx.strokeStyle = 'rgba(190,210,255,.8)'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
    for (let a = 0; a < 2; a++) { ctx.beginPath(); for (let i = 0; i <= 24; i++) { const th = i / 24 * 4.2, rr = r * (0.12 + 0.75 * i / 24); const ang = th + a * Math.PI; i ? ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr * 0.75) : ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr * 0.75); } ctx.stroke(); }
    ctx.restore();
  }
  function methodIcon(kind, x, y, s, t) {
    if (kind === 0) iconLander(x, y, s); else if (kind === 1) iconProbe(x, y, s); else if (kind === 2) iconScope(x, y, s); else iconStation(x, y, s);
  }

  /* =========================================================
     ① 역사 장면 (발사 + 연표)
     ========================================================= */
  function drawHistory(t) {
    drawLaunch(t);
    const B = S.tl === 'korea' ? BK : BW;
    // 시간 화살표
    ctx.save();
    const rg = ctx.createLinearGradient(14, 0, 786, 0); rg.addColorStop(0, 'rgba(96,165,250,.2)'); rg.addColorStop(1, 'rgba(250,204,21,.9)');
    ctx.strokeStyle = rg; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(90, 272); ctx.lineTo(744, 272); ctx.stroke();
    ctx.fillStyle = 'rgba(250,204,21,.95)'; ctx.beginPath(); ctx.moveTo(760, 272); ctx.lineTo(742, 263); ctx.lineTo(742, 281); ctx.closePath(); ctx.fill();
    txt(16, 277, '옛날', { size: 14, weight: 800, color: '#93c5fd', align: 'left' }); txt(786, 277, '요즘', { size: 14, weight: 800, color: '#fde68a', align: 'right' });
    ctx.restore();
    // 칸
    B.slots.forEach((s, i) => {
      ctx.save();
      D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(160,190,255,.75)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      D.sphere(s.x + 16, s.y + 16, 11, '#3b82f6', { gloss: false, text: String(i + 1), textScale: 1.1 });
      const rv = ease.outCubic(clamp(B.reveal[i], 0, 1));
      if (rv > 0.01) { ctx.globalAlpha = rv; txt(s.x + s.w / 2, s.y - 8 - (1 - rv) * 8, B.years[i] + '년', { size: 20, weight: 400, color: '#fde68a', stroke: 'rgba(8,16,44,.8)', strokeWidth: 4 }); }
      else if (!B.tokens.some((o) => o.zone === i)) { txt(s.x + s.w / 2, s.y + s.h / 2 + 6, '?', { size: 30, weight: 800, color: 'rgba(160,190,255,.5)' }); }
      ctx.restore();
    });
    if (B.tokens.some((o) => o.zone < 0)) txt(400, 462, '👇 카드를 끌어다 위 칸에 시간 순서대로 놓아요 (누르면 빈 칸으로 가요)', { size: 14, weight: 700, color: '#9fb4ee' });
    else txt(400, 462, B.done ? '🎉 연도 순서가 모두 맞아요!' : '모두 놓았어요! 아래 [확인하기]를 눌러 봐요.', { size: 14.5, weight: 800, color: '#5eead4' });
    drawBoardTokens(B);
  }
  function drawBoardTokens(B) {
    const arr = B.tokens.slice().sort((a, b) => (a.drag ? 1 : 0) - (b.drag ? 1 : 0) || a.lift - b.lift);
    arr.forEach((tk) => drawCard(tk, B));
  }

  /* =========================================================
     ② 탐사 방법: 짝짓기 + 망원경 비교
     ========================================================= */
  const GOALS = [
    { icon: '🌕', title: '달 표면 연구', desc: '달의 흙과 암석을 직접 조사해요.' },
    { icon: '🪐', title: '먼 행성 관찰', desc: '태양계 먼 행성 가까이를 지나며 사진을 찍어요.' },
    { icon: '🌌', title: '먼 우주 관측', desc: '아주 먼 천체를 선명하게 관측해요.' },
    { icon: '🧪', title: '우주 생활 실험', desc: '우주인이 머물며 우주 환경을 실험해요.' },
  ];
  const METHODS = [
    { name: '착륙선', sub: '천체 표면에 내려앉아요' },
    { name: '탐사선', sub: '(근접 통과) 가까이 지나가요' },
    { name: '우주 망원경', sub: '대기권 밖에서 관측해요' },
    { name: '우주 정거장', sub: '우주인이 머물러요' },
  ];
  const slotsM = [], poolM = [];
  for (let i = 0; i < 4; i++) { slotsM.push({ x: 408, y: 74 + i * 134, w: 192, h: 122 }); poolM.push({ x: 612, y: 80 + i * 134 }); }
  const ORD_M = [3, 0, 2, 1];
  const BM = mkBoard({ kind: 'match', slots: slotsM, pool: poolM, items: ORD_M.map((k) => Object.assign({ kind: k, w: 176, h: 110 }, METHODS[k])) });
  bSettle(BM, true);
  function drawMatchTok(t) {
    const sc = 1 + t.lift * 0.06, sx = t.shake > 0 ? Math.sin(t.shake * 28) * 6 * t.shake : 0;
    ctx.save();
    ctx.translate(t.x + sx + t.w / 2, t.y - t.lift * 5 + t.h / 2); ctx.scale(sc, sc); ctx.translate(-t.w / 2, -t.h / 2);
    const showWrong = t.zone >= 0 && t.wrong && wrongNow() && game && game.phase === 'active';
    D.shadow(() => { D.roundRect(0, 0, t.w, t.h, 14); const g = ctx.createLinearGradient(0, 0, 0, t.h); g.addColorStop(0, '#1b2a5a'); g.addColorStop(1, '#101c44'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6 + t.lift * 14, y: 2 + t.lift * 7, color: 'rgba(0,0,0,.5)' });
    D.roundRect(0, 0, t.w, t.h, 14); ctx.strokeStyle = BM.done && t.zone >= 0 ? '#22c55e' : t.zone >= 0 ? '#818cf8' : 'rgba(160,190,255,.6)'; ctx.lineWidth = BM.done && t.zone >= 0 ? 3.5 : 2; ctx.stroke();
    if (showWrong) { D.roundRect(-2, -2, t.w + 4, t.h + 4, 16); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3.5; ctx.stroke(); }
    ctx.save(); ctx.beginPath(); D.roundRect(6, 8, 74, 94, 10); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(6, 8, 74, 94); ctx.restore();
    methodIcon(t.kind, 43, 54, t.kind === 3 ? 1.05 : t.kind === 2 ? 1.15 : t.kind === 1 ? 1.15 : 1.4);
    const nl = wrap(t.name, 90, f(16, 800));
    nl.forEach((ln, i) => txt(86, 38 + i * 19, ln, { size: 16, weight: 800, color: '#fff', align: 'left' }));
    wrap(t.sub, 86, f(13, 600)).forEach((ln, i) => txt(86, 38 + nl.length * 19 + 5 + i * 16, ln, { size: 13, weight: 600, color: '#a5b4d8', align: 'left' }));
    ctx.restore();
  }
  function drawMatch(t) {
    txt(204, 40, '탐사 목표 (왜 가요?)', { size: 16, weight: 800, color: '#fde68a' });
    txt(504, 40, '알맞은 방법을 여기에', { size: 16, weight: 800, color: '#93c5fd' });
    txt(700, 40, '탐사 방법 카드', { size: 16, weight: 800, color: '#a7f3d0' });
    GOALS.forEach((g, i) => {
      const y = 74 + i * 134, s = slotsM[i];
      ctx.save();
      D.roundRect(14, y, 380, 122, 14); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,190,255,.3)'; ctx.lineWidth = 1.5; ctx.stroke();
      txt(56, y + 76, g.icon, { size: 44 });
      txt(100, y + 44, g.title, { size: 20, weight: 800, color: '#fff', align: 'left' });
      wrap(g.desc, 270, f(14.5, 600)).forEach((ln, k) => txt(100, y + 70 + k * 20, ln, { size: 14.5, weight: 600, color: '#c7d2fe', align: 'left' }));
      D.arrow(396, y + 61, 406, y + 61, { color: '#818cf8', width: 3, head: 9 });
      D.roundRect(s.x, s.y, s.w, s.h, 14); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill(); ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(147,197,253,.7)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      if (!BM.tokens.some((o) => o.zone === i)) txt(s.x + s.w / 2, s.y + s.h / 2 + 5, '방법 카드 놓기', { size: 14, weight: 700, color: '#6f86c4' });
      if (BM.done) D.check(s.x + s.w - 4, s.y + 6, 12, 1);
      ctx.restore();
    });
    // 보관 칸
    ctx.save(); D.roundRect(604, 66, 188, 540, 14); ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fill(); ctx.restore();
    const arr = BM.tokens.slice().sort((a, b) => (a.drag ? 1 : 0) - (b.drag ? 1 : 0) || a.lift - b.lift);
    arr.forEach((tk) => drawMatchTok(tk));
    const un = BM.tokens.filter((o) => o.zone < 0).length;
    txt(400, 636, un ? '👇 방법 카드를 끌어다 목표 옆 칸에 놓아요' : (BM.done ? '🎉 짝이 모두 맞아요!' : '모두 놓았어요! 아래 [확인하기]를 눌러 봐요.'), { size: 14.5, weight: 800, color: un ? '#9fb4ee' : '#5eead4' });
  }
  /* 망원경 비교 */
  const SC_STARS = []; { const r = rng(31); for (let i = 0; i < 70; i++) SC_STARS.push({ x: r(), y: r(), m: r(), p: r() * TAU }); }
  function drawScope(t) {
    const sp = S.scopeV === 'space';
    // 왼쪽 장면
    const X0 = 14, Y0 = 14, W = 430, H = 632;
    ctx.save(); D.roundRect(X0, Y0, W, H, 16); ctx.clip();
    const sg = ctx.createLinearGradient(0, Y0, 0, Y0 + H); sg.addColorStop(0, '#02040e'); sg.addColorStop(0.36, '#060b24'); sg.addColorStop(0.37, '#2c6fbe'); sg.addColorStop(0.7, '#8fc4f0'); sg.addColorStop(0.71, '#2f4a35'); sg.addColorStop(1, '#1b2f22');
    ctx.fillStyle = sg; ctx.fillRect(X0, Y0, W, H);
    const r = rng(2); ctx.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(t + i)); ctx.fillRect(X0 + r() * W, Y0 + r() * 220, 1.6, 1.6); } ctx.globalAlpha = 1;
    // 대기권 표시
    const aTop = Y0 + 232, aBot = Y0 + 436;
    const ag = ctx.createLinearGradient(0, aTop, 0, aBot); ag.addColorStop(0, 'rgba(120,190,255,0)'); ag.addColorStop(0.3, 'rgba(120,190,255,.35)'); ag.addColorStop(1, 'rgba(180,225,255,.55)');
    ctx.fillStyle = ag; ctx.fillRect(X0, aTop, W, aBot - aTop);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([8, 7]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X0, aTop + 8); ctx.lineTo(X0 + W, aTop + 8); ctx.stroke(); ctx.setLineDash([]);
    txt(X0 + 14, aTop + 28, '대기권 (공기층)', { size: 14, weight: 800, color: '#e0f2fe', align: 'left' });
    txt(X0 + 14, Y0 + 28, '우주 (공기가 없어요)', { size: 14, weight: 800, color: '#a5b4fc', align: 'left' });
    // 공기 알갱이 흔들림
    ctx.fillStyle = 'rgba(255,255,255,.45)'; const r2 = rng(9);
    for (let i = 0; i < 40; i++) { const bx = X0 + r2() * W, by = aTop + 30 + r2() * (aBot - aTop - 40); ctx.beginPath(); ctx.arc(bx + Math.sin(t * 1.5 + i) * 7, by + Math.cos(t * 1.9 + i * 1.3) * 5, 2, 0, TAU); ctx.fill(); }
    // 산과 천문대
    ctx.fillStyle = '#26402e'; ctx.beginPath(); ctx.moveTo(X0, Y0 + 640); ctx.lineTo(X0, Y0 + 520); ctx.lineTo(X0 + 90, Y0 + 470); ctx.lineTo(X0 + 190, Y0 + 520); ctx.lineTo(X0 + 300, Y0 + 490); ctx.lineTo(X0 + W, Y0 + 540); ctx.lineTo(X0 + W, Y0 + 640); ctx.closePath(); ctx.fill();
    const gx = X0 + 96, gy = Y0 + 462; // 지상 망원경
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(gx, gy, 24, Math.PI, 0); ctx.fill(); ctx.fillRect(gx - 24, gy, 48, 12);
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(gx - 6, gy - 22); ctx.lineTo(gx + 6, gy - 22); ctx.lineTo(gx + 6, gy); ctx.lineTo(gx - 6, gy); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(gx, gy - 6); ctx.rotate(-0.45); ctx.fillStyle = '#e2e8f0'; D.roundRect(-6, -30, 12, 34, 3); ctx.fill(); ctx.fillStyle = '#334155'; ctx.fillRect(-6, -32, 12, 5); ctx.restore();
    // 우주 망원경
    const stx = X0 + 330, sty = Y0 + 150;
    iconScope(stx, sty, 1.5, -0.55);
    // 별과 빛줄기
    const bx = X0 + 215, by = Y0 + 60;
    D.glow(bx, by, 40, '#ffffff', 0.55); D.spark(bx, by, 16, t, '#fff6c2');
    txt(bx, by - 26, '먼 별', { size: 14, weight: 800, color: '#fff' });
    const target = (sel, tx, ty, wavy) => {
      const on = (S.scopeV === 'space') === !wavy; const a = on ? 1 : 0.35;
      for (let k = -1; k <= 1; k++) {
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = wavy ? 'rgba(255,240,180,' + (0.7 - 0.0) + ')' : 'rgba(255,248,210,.95)'; ctx.lineWidth = wavy ? 2 : 2.4;
        ctx.beginPath();
        const N = 40;
        for (let i = 0; i <= N; i++) {
          const u = i / N, x = bx + (tx - bx) * u + k * 8 * u, y = by + 14 + (ty - by - 14) * u;
          let dx = 0;
          if (wavy && y > aTop) { const w = (y - aTop) / (ty - aTop); dx = Math.sin(y * 0.09 + t * 5 + k) * 9 * Math.min(1, w * 3) * (RM ? 0.3 : 1); }
          i ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y);
        }
        ctx.stroke(); ctx.restore();
      }
      // 빛 알갱이
      if (!RM) for (let i = 0; i < 4; i++) { const u = ((t * 0.35 + i / 4) % 1); ctx.save(); ctx.globalAlpha = a; D.glow(bx + (tx - bx) * u, by + 14 + (ty - by - 14) * u, 7, '#ffffff', 0.9); ctx.restore(); }
    };
    target(0, stx - 18, sty - 10, false); target(1, gx - 2, gy - 36, true);
    // 이름표 · 선택 고리
    const selX = sp ? stx : gx, selY = sp ? sty : gy - 8;
    D.ring(selX, selY, sp ? 44 : 38, t, { color: '#5eead4', width: 3 });
    D.label(stx, sty + 50, '우주 망원경', { size: 14, bg: sp ? 'rgba(13,148,136,.92)' : 'rgba(8,16,44,.85)', color: '#fff' });
    D.label(gx, gy + 40, '지상 망원경', { size: 14, bg: !sp ? 'rgba(13,148,136,.92)' : 'rgba(8,16,44,.85)', color: '#fff' });
    ctx.restore();
    // 오른쪽: 찍은 사진
    const IX = 462, IY = 40, IW = 324, IH = 300;
    txt(IX + IW / 2, 30, sp ? '🛰️ 우주 망원경이 찍은 사진' : '⛰️ 지상 망원경이 찍은 사진', { size: 15.5, weight: 800, color: '#fff' });
    ctx.save(); D.roundRect(IX, IY, IW, IH, 14); ctx.clip(); ctx.fillStyle = '#02040e'; ctx.fillRect(IX, IY, IW, IH);
    const blur = 1 - S.scopeA;
    ctx.globalCompositeOperation = 'lighter';
    SC_STARS.forEach((s, i) => {
      const x = IX + 14 + s.x * (IW - 28), y = IY + 14 + s.y * (IH - 28), m = s.m;
      // 선명한 별
      ctx.globalAlpha = 0.25 + 0.75 * (1 - blur * 0.0);
      const sharpA = S.scopeA;
      if (sharpA > 0.02) { ctx.globalAlpha = sharpA; ctx.fillStyle = '#fff'; const rr = 0.9 + m * 1.9; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); if (m > 0.7) { ctx.globalAlpha = sharpA * 0.5; ctx.fillRect(x - 7, y - 0.5, 14, 1); ctx.fillRect(x - 0.5, y - 7, 1, 14); } }
      // 흐릿하고 흔들리는 별 (m이 작은 별은 안 보임)
      if (blur > 0.02 && m > 0.38) {
        const jx = Math.sin(t * 7 + s.p) * 3 + Math.sin(t * 13 + s.p * 2) * 2, jy = Math.cos(t * 6 + s.p) * 3;
        const rr = 6 + m * 7; const gr = ctx.createRadialGradient(x + jx, y + jy, 0, x + jx, y + jy, rr);
        gr.addColorStop(0, 'rgba(255,255,255,' + 0.5 * blur * (0.6 + 0.4 * Math.sin(t * 9 + i)) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x + jx, y + jy, rr, 0, TAU); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    // 은하
    { const gx2 = IX + IW * 0.7, gy2 = IY + IH * 0.62; ctx.globalAlpha = 0.2 + 0.8 * S.scopeA; iconGalaxy(gx2, gy2, 34, t * 0); ctx.globalAlpha = 1; }
    ctx.restore();
    D.roundRect(IX, IY, IW, IH, 14); ctx.strokeStyle = 'rgba(160,190,255,.5)'; ctx.lineWidth = 2; ctx.stroke();
    // 설명 카드
    const cards = [
      { on: !sp, icon: '⛰️', head: '지상 망원경', body: '별빛이 공기(대기)를 지나며 흔들리고 일부가 흡수돼요. 사진이 흐리고 깜빡여요.', col: '#fbbf24' },
      { on: sp, icon: '🛰️', head: '우주 망원경', body: '대기권 밖에는 공기가 없어요. 별빛이 흔들리지 않아 선명하고, 더 어두운 별도 보여요.', col: '#5eead4' },
    ];
    cards.forEach((c, i) => {
      const y = 362 + i * 140;
      ctx.save(); ctx.globalAlpha = c.on ? 1 : 0.5;
      panel(IX, y, IW, 126, { stroke: c.on ? c.col : 'rgba(160,190,255,.25)', fill: 'rgba(10,18,44,.85)' });
      txt(IX + 16, y + 34, c.icon + ' ' + c.head, { size: 17, weight: 800, color: c.col, align: 'left' });
      wrap(c.body, IW - 32, f(14.5, 600)).forEach((ln, k) => txt(IX + 16, y + 62 + k * 21, ln, { size: 14.5, weight: 600, color: '#dbe5ff', align: 'left' }));
      ctx.restore();
    });
  }

  /* =========================================================
     ③ 생활 속 우주 기술: 집 단면 + 하늘의 인공위성
     ========================================================= */
  const HS = [
    { id: 0, type: 'spin', name: '메모리폼 베개', icon: '🛏️', x: 124, y: 322, r: 38, clue: '잠잘 때 쓰는 물건', info: '우주선 좌석의 충격을 줄이려고 개발한 소재예요.' },
    { id: 1, type: 'spin', name: '정수기 필터', icon: '💧', x: 112, y: 502, r: 34, clue: '물을 깨끗하게 하는 물건', info: '우주인이 마실 물을 깨끗하게 하던 기술이에요.' },
    { id: 2, type: 'spin', name: '적외선 체온계', icon: '🌡️', x: 366, y: 316, r: 30, clue: '몸이 아플 때 쓰는 물건', info: '별의 온도를 재던 적외선 기술이에요.' },
    { id: 3, type: 'spin', name: '동결 건조 식품', icon: '🍜', x: 214, y: 498, r: 32, clue: '가볍고 오래 두는 간편 식품', info: '우주인의 식량으로 발달한 기술이에요.' },
    { id: 4, type: 'decoy', name: '액자', x: 222, y: 214, r: 30 },
    { id: 5, type: 'decoy', name: '화분', x: 486, y: 316, r: 30 },
    { id: 6, type: 'decoy', name: '시계', x: 372, y: 452, r: 28 },
    { id: 7, type: 'decoy', name: '책', x: 432, y: 334, r: 28 },
  ];
  const SATS = [
    { name: '통신 위성', icon: '📡', col: '#60a5fa', R: 440, u: 0.15, v: 0.075, to: [470, 98], msg: '방송·전화·인터넷 신호를 전해 줘요.' },
    { name: 'GPS 위성', icon: '🧭', col: '#4ade80', R: 478, u: 0.55, v: 0.06, to: [334, 596], msg: '내 위치를 알려 줘서 길 안내에 써요.' },
    { name: '기상 위성', icon: '☁️', col: '#fde047', R: 516, u: 0.85, v: 0.045, to: [486, 524], msg: '구름 사진을 찍어 일기 예보에 써요.' },
  ];
  const SP = { x: 576, y: 14, w: 212, h: 290 }, EARTH = { x: 682, y: 680, r: 420 };
  const ORB_SPAN = 0.27; // 화면에 보이는 궤도 각도(라디안)
  const DEBRIS = []; { const r = rng(77); for (let i = 0; i < 46; i++) DEBRIS.push({ R: 436 + r() * 90, u: r(), v: (r() < 0.7 ? 1 : -1) * (0.03 + r() * 0.07), s: 1.8 + r() * 2.4, rot: r() * TAU }); }
  const orbXY = (R, u) => { const a = -Math.PI / 2 - ORB_SPAN + 2 * ORB_SPAN * u; return { x: EARTH.x + R * Math.cos(a), y: EARTH.y + R * Math.sin(a) }; };
  const orbFade = (u) => Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.4);
  function satPos(s) { return orbXY(s.R, s.u); }
  function rr(x, y, w, h, r, fill, stroke) { D.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } }
  function drawHouse(t) {
    // 하늘 배경 (집 둘레)
    const bg = ctx.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, '#0a1230'); bg.addColorStop(1, '#14264d');
    ctx.fillStyle = bg; ctx.fillRect(14, 14, 552, 632);
    // 지붕
    const rg = ctx.createLinearGradient(0, 40, 0, 150); rg.addColorStop(0, '#b4533f'); rg.addColorStop(1, '#8c3a2e');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(26, 154); ctx.lineTo(288, 40); ctx.lineTo(550, 154); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(26 + i * 12, 154 - i * 22); ctx.lineTo(550 - i * 12, 154 - i * 22); ctx.stroke(); }
    rr(364, 56, 26, 52, 3, '#7a3128'); rr(358, 50, 38, 10, 3, '#5b241d');
    // 위성 안테나 (지붕)
    ctx.save(); ctx.translate(470, 100); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-6, 26); ctx.stroke();
    ctx.rotate(-0.5); const dg = ctx.createRadialGradient(-3, -3, 2, 0, 0, 22); dg.addColorStop(0, '#ffffff'); dg.addColorStop(1, '#94a3b8'); ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(0, 0, 9, 22, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    // 벽
    rr(44, 150, 488, 484, 8, '#f6e7cc', '#c9a97c');
    // 방 배경
    rr(50, 156, 238, 232, 4, '#fbe0d2'); rr(294, 156, 232, 232, 4, '#dcecd6');
    rr(50, 398, 238, 230, 4, '#fff1b8'); rr(294, 398, 232, 230, 4, '#d8e6f7');
    // 바닥
    ctx.fillStyle = '#c6965f'; ctx.fillRect(50, 366, 238, 22); ctx.fillRect(294, 366, 232, 22); ctx.fillRect(50, 606, 238, 22); ctx.fillRect(294, 606, 232, 22);
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(44, 388, 488, 10);
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; for (let x = 60; x < 520; x += 34) { ctx.beginPath(); ctx.moveTo(x, 366); ctx.lineTo(x, 388); ctx.moveTo(x, 606); ctx.lineTo(x, 628); ctx.stroke(); }
    // 방 이름
    [['침실', 60, 178, '#9a4b36'], ['서재', 304, 178, '#3f6b3a'], ['주방', 60, 420, '#8a6d00'], ['거실', 304, 420, '#2b5d9a']].forEach((q) => txt(q[1], q[2], q[0], { size: 14, weight: 800, color: q[3], align: 'left', alpha: 0.85 }));
    // 침실: 창문, 침대
    rr(70, 198, 70, 86, 6, '#1c2f5c', '#e6d3b0'); ctx.fillStyle = '#fff'; ctx.fillRect(104, 198, 3, 86); ctx.fillRect(70, 238, 70, 3); ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(120, 220, 7, 0, TAU); ctx.fill();
    rr(80, 336, 196, 14, 4, '#8a5a30'); rr(80, 322, 14, 44, 4, '#7a4a28'); rr(262, 332, 14, 34, 4, '#7a4a28');
    rr(94, 322, 168, 20, 6, '#c7d7f0', '#a8bde0'); rr(94, 322, 168, 8, 4, '#dfe9f8');
    ctx.fillStyle = '#9fb7e0'; ctx.beginPath(); ctx.ellipse(122, 320, 32, 13, -0.05, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.ellipse(122, 317, 30, 10, -0.05, 0, TAU); ctx.fill(); // 베개
    // 액자
    rr(196, 190, 52, 44, 4, '#8a5a30'); rr(202, 196, 40, 32, 2, '#a7d3f5'); ctx.fillStyle = '#6fbf73'; ctx.beginPath(); ctx.moveTo(202, 228); ctx.lineTo(214, 210); ctx.lineTo(226, 222); ctx.lineTo(234, 214); ctx.lineTo(242, 228); ctx.closePath(); ctx.fill();
    // 서재: 책상, 책, 화분, 체온계, 선반
    rr(318, 352, 190, 12, 3, '#7a4a28'); rr(326, 364, 10, 24, 2, '#6a3e20'); rr(490, 364, 10, 24, 2, '#6a3e20');
    rr(372, 196, 130, 10, 3, '#8a5a30'); // 선반
    [['#ef4444', 384], ['#3b82f6', 400], ['#22c55e', 414], ['#f59e0b', 428]].forEach((q) => rr(q[1], 166, 12, 30, 2, q[0]));
    rr(420, 322, 26, 30, 2, '#6366f1'); rr(424, 312, 26, 10, 2, '#ec4899'); // 책
    rr(472, 330, 26, 22, 4, '#c2410c'); ctx.fillStyle = '#4ade80'; [[-8, -8], [0, -14], [8, -7], [-2, -2]].forEach((q) => { ctx.beginPath(); ctx.ellipse(485 + q[0], 326 + q[1], 5, 9, q[0] * 0.08, 0, TAU); ctx.fill(); }); // 화분
    // 체온계 (귀 체온계 모양)
    ctx.save(); ctx.translate(366, 328); ctx.rotate(-0.5); rr(-8, -4, 16, 26, 6, '#f8fafc', '#94a3b8'); rr(-4, -16, 8, 14, 3, '#38bdf8'); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, 8, 3, 0, TAU); ctx.fill(); ctx.restore();
    // 주방: 윗장, 조리대, 싱크, 수도꼭지
    rr(62, 434, 214, 42, 6, '#e8d2a2', '#b99b62'); ctx.fillStyle = '#b99b62'; ctx.fillRect(168, 434, 2, 42);
    rr(58, 520, 224, 12, 3, '#6b7280'); rr(62, 532, 214, 74, 4, '#d6bd88', '#b99b62'); ctx.fillStyle = '#b99b62'; ctx.fillRect(168, 532, 2, 74);
    rr(86, 514, 62, 8, 3, '#94a3b8'); // 싱크
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(112, 514); ctx.lineTo(112, 486); ctx.quadraticCurveTo(112, 478, 124, 478); ctx.lineTo(132, 478); ctx.stroke(); // 수도꼭지
    const wf = ctx.createLinearGradient(100, 0, 124, 0); wf.addColorStop(0, '#bae6fd'); wf.addColorStop(1, '#0ea5e9'); rr(98, 494, 28, 20, 5, wf, '#0369a1'); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(104, 498, 4, 12); // 필터
    // 동결 건조 식품 (컵)
    ctx.save(); ctx.translate(214, 500); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-15, -22); ctx.lineTo(15, -22); ctx.lineTo(11, 12); ctx.lineTo(-11, 12); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fef08a'; ctx.fillRect(-14, -12, 28, 12); ctx.fillStyle = '#fff'; ctx.fillRect(-13, -26, 26, 5); ctx.restore();
    // 거실: 시계, 소파, TV, 휴대폰
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(372, 452, 20, 0, TAU); ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(372, 452); ctx.lineTo(372, 440); ctx.moveTo(372, 452); ctx.lineTo(381, 456); ctx.stroke();
    rr(306, 566, 124, 40, 12, '#e07a5f'); rr(300, 546, 24, 60, 10, '#cf6a50'); rr(412, 546, 24, 60, 10, '#cf6a50'); rr(320, 546, 96, 24, 8, '#eb8d73');
    rr(444, 540, 82, 66, 4, '#8a5a30'); rr(446, 482, 76, 48, 5, '#111827', '#475569'); const tv = ctx.createLinearGradient(448, 484, 520, 528); tv.addColorStop(0, '#3b82c4'); tv.addColorStop(1, '#1e4f8a'); ctx.fillStyle = tv; ctx.fillRect(451, 487, 66, 38);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; [[466, 500, 9], [482, 496, 11], [500, 504, 8]].forEach((q) => { ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, TAU); ctx.fill(); }); // 구름 사진 (일기 예보)
    rr(452, 530, 8, 6, 2, '#94a3b8'); rr(326, 590, 16, 26, 4, '#0f172a', '#64748b'); ctx.fillStyle = '#4ade80'; ctx.fillRect(329, 595, 10, 14); // 휴대폰
    // 하늘 패널(위성)
    drawSatPanel(t);
    // 핫스팟
    HS.forEach((h, i) => {
      const found = h.type === 'spin' && S.found[h.id];
      const sx = S.shake[h.id] > 0 ? Math.sin(S.shake[h.id] * 30) * 5 * S.shake[h.id] : 0;
      ctx.save();
      if (found) {
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
        D.check(h.x + h.r * 0.8, h.y - h.r * 0.8, 11, 1);
        D.label(h.x, h.y - h.r - 14, h.name, { size: 13.5, bg: 'rgba(21,128,61,.95)', color: '#fff' });
      } else if (game && (game.phase === 'active' || game.free)) {
        const a = 0.35 + 0.35 * Math.sin(t * 3 + i);
        ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.setLineDash([5, 6]); ctx.lineWidth = 2.5; ctx.lineDashOffset = -t * 10; ctx.beginPath(); ctx.arc(h.x + sx, h.y, h.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
    });
    if (S.decoyT > 0 && S.decoyMsg) D.label(clamp(S.decoyMsg.x, 120, 460), S.decoyMsg.y - 40, S.decoyMsg.text, { size: 14, bg: '#fff1f2', color: '#9f1239', border: '#fb7185' });
    drawInfoCard();
  }
  function drawSatPanel(t) {
    ctx.save(); D.roundRect(SP.x, SP.y, SP.w, SP.h, 16); ctx.clip();
    const g = ctx.createLinearGradient(0, SP.y, 0, SP.y + SP.h); g.addColorStop(0, '#02040e'); g.addColorStop(1, '#0b1a3e'); ctx.fillStyle = g; ctx.fillRect(SP.x, SP.y, SP.w, SP.h);
    const r = rng(4); ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(t * 0.8 + i)); ctx.fillRect(SP.x + r() * SP.w, SP.y + r() * SP.h, 1.5, 1.5); } ctx.globalAlpha = 1;
    // 지구
    const ag = ctx.createRadialGradient(EARTH.x, EARTH.y, EARTH.r - 4, EARTH.x, EARTH.y, EARTH.r + 26); ag.addColorStop(0, 'rgba(120,190,255,.7)'); ag.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(EARTH.x, EARTH.y, EARTH.r + 26, 0, TAU); ctx.fill();
    const eg = ctx.createRadialGradient(EARTH.x - 60, EARTH.y - 90, 10, EARTH.x, EARTH.y, EARTH.r); eg.addColorStop(0, '#4a98e8'); eg.addColorStop(1, '#0c2e6e');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(EARTH.x, EARTH.y, EARTH.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(90,170,90,.85)'; [[-70, -405, 40, 10], [20, -412, 50, 12], [90, -402, 30, 9]].forEach((q) => { ctx.beginPath(); ctx.ellipse(EARTH.x + q[0], EARTH.y + q[1] + 20, q[2], q[3], 0.1, 0, TAU); ctx.fill(); });
    // 궤도 점선
    ctx.strokeStyle = 'rgba(160,190,255,.22)'; ctx.setLineDash([3, 6]); ctx.lineWidth = 1.2; SATS.forEach((s) => { ctx.beginPath(); ctx.arc(EARTH.x, EARTH.y, s.R, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4); ctx.stroke(); }); ctx.setLineDash([]);
    // 우주 쓰레기
    DEBRIS.forEach((d) => { const q = orbXY(d.R, d.u); ctx.save(); ctx.globalAlpha = orbFade(d.u); ctx.translate(q.x, q.y); ctx.rotate(d.rot + t * 0.5); ctx.fillStyle = 'rgba(190,196,208,.95)'; ctx.fillRect(-d.s, -d.s * 0.6, d.s * 2, d.s * 1.2); ctx.restore(); });
    // 위성과 신호
    SATS.forEach((s, i) => {
      const p = satPos(s);
      ctx.save(); ctx.globalAlpha = orbFade(s.u); drawSatellite(p.x, p.y, 0.55, 1, t + i);
      if (S.satSel === i) D.ring(p.x, p.y, 24, t, { color: s.col, width: 2.5 });
      ctx.restore();
    });
    ctx.restore();
    D.roundRect(SP.x, SP.y, SP.w, SP.h, 16); ctx.strokeStyle = 'rgba(160,190,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
    // 안내
    if (S.satSel >= 0) { const s = SATS[S.satSel]; D.label(SP.x + SP.w / 2, SP.y + 22, s.icon + ' ' + s.name, { size: 14.5, bg: hexBg(s.col), color: '#0b1230', pad: 10 }); wrap(s.msg, SP.w - 20, f(13.5, 700)).forEach((ln, i) => txt(SP.x + SP.w / 2, SP.y + 52 + i * 18, ln, { size: 13.5, weight: 700, color: '#e0e7ff', stroke: 'rgba(2,4,14,.8)', strokeWidth: 3 })); }
    else txt(SP.x + SP.w / 2, SP.y + 26, '🛰️ 인공위성을 눌러 보세요', { size: 14, weight: 800, color: '#a5b4fc', alpha: 0.7 + 0.3 * pulse() });
    pill(SP.x + 70, SP.y + 118, '🗑️ 우주 쓰레기', { size: 13, bg: 'rgba(60,64,80,.9)', color: '#e2e8f0', pad: 8 });
    // 신호선 (집으로)
    if (S.satSel >= 0) {
      const s = SATS[S.satSel], p = satPos(s);
      if (s.u > 0.04 && s.u < 0.96) {
        ctx.save(); ctx.strokeStyle = s.col; ctx.lineWidth = 2.4; ctx.setLineDash([7, 7]); ctx.lineDashOffset = -t * 40; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(s.to[0], s.to[1]); ctx.stroke(); ctx.setLineDash([]);
        const u = (t * 0.8) % 1; D.glow(p.x + (s.to[0] - p.x) * u, p.y + (s.to[1] - p.y) * u, 10, s.col, 0.95); ctx.restore();
        D.ring(s.to[0], s.to[1], 20, t, { color: s.col, width: 2.5 });
      }
    }
  }
  const hexBg = (c) => c;
  function drawInfoCard() {
    const x = 576, y = 316, w = 212, h = 330;
    panel(x, y, w, h);
    const n = S.found.filter(Boolean).length;
    txt(x + 14, y + 28, '🔎 우주 기술 찾기', { size: 16, weight: 800, color: '#fff', align: 'left' });
    txt(x + w - 14, y + 28, n + '/4', { size: 16, weight: 800, color: n === 4 ? '#5eead4' : '#fde68a', align: 'right' });
    HS.filter((h2) => h2.type === 'spin').forEach((h2, i) => {
      const yy = y + 42 + i * 72, found = S.found[h2.id];
      ctx.save();
      D.roundRect(x + 8, yy, w - 16, 66, 10); ctx.fillStyle = found ? 'rgba(34,197,94,.16)' : 'rgba(255,255,255,.05)'; ctx.fill(); ctx.strokeStyle = found ? '#22c55e' : 'rgba(160,190,255,.25)'; ctx.lineWidth = 1.4; ctx.stroke();
      if (found) {
        txt(x + 18, yy + 22, h2.icon + ' ' + h2.name, { size: 14.5, weight: 800, color: '#bbf7d0', align: 'left' });
        wrap(h2.info, w - 34, f(13, 600)).forEach((ln, k) => txt(x + 18, yy + 41 + k * 16, ln, { size: 13, weight: 600, color: '#dbe5ff', align: 'left' }));
      } else {
        txt(x + 18, yy + 28, '❔ ' + h2.clue, { size: 14, weight: 800, color: '#c7d2fe', align: 'left' });
        txt(x + 18, yy + 50, '집에서 찾아 눌러 봐요', { size: 13, weight: 600, color: '#7c8fc4', align: 'left' });
      }
      ctx.restore();
    });
  }

  /* =========================================================
     ④ 탐사 계획서 + 발사 애니메이션
     ========================================================= */
  const GOAL_OPT = GOALS.map((g, i) => ({ name: g.title, icon: g.icon, kind: i }));
  const METH_OPT = [3, 0, 2, 1].map((k) => ({ name: METHODS[k].name, kind: k, icon: ['🛬', '📡', '🔭', '🏠'][k] }));
  const TECH_OPT = [
    { name: '장거리 통신 안테나와 태양 전지판', kind: 1, icon: '📡' },
    { name: '생명 유지 장치 (공기·물 순환)', kind: 3, icon: '💨' },
    { name: '정밀 착륙 장치', kind: 0, icon: '🛬' },
    { name: '정밀 거울과 냉각 장치', kind: 2, icon: '🔍' },
  ];
  // 목표 번호(0~3) = 알맞은 방법/기술의 kind
  const ROWS = [
    { key: 'goal', label: '① 목표', opts: GOAL_OPT, col: '#f59e0b', y: 388 },
    { key: 'method', label: '② 방법', opts: METH_OPT, col: '#3b82f6', y: 454 },
    { key: 'tech', label: '③ 핵심 기술', opts: TECH_OPT, col: '#10b981', y: 520 },
  ];
  const CHIP = { x0: 118, w: 160, h: 54, gap: 7 };
  const chipRect = (row, i) => ({ x: CHIP.x0 + i * (CHIP.w + CHIP.gap), y: row.y, w: CHIP.w, h: CHIP.h });
  const PP = { x: 14, y: 14, w: 772, h: 316 };
  const planValid = () => { const p = S.plan; if (p.goal < 0 || p.method < 0 || p.tech < 0) return false; return METH_OPT[p.method].kind === GOAL_OPT[p.goal].kind && TECH_OPT[p.tech].kind === GOAL_OPT[p.goal].kind; };
  const planMsg = () => {
    const p = S.plan;
    if (p.goal < 0) return '먼저 탐사 목표를 골라요.';
    if (p.method < 0 || p.tech < 0) return '방법과 핵심 기술도 골라요.';
    if (METH_OPT[p.method].kind !== GOAL_OPT[p.goal].kind) return '목표와 탐사 방법이 맞지 않아요. 앞에서 한 짝짓기를 떠올려 봐요.';
    if (TECH_OPT[p.tech].kind !== GOAL_OPT[p.goal].kind) return '이 탐사에 꼭 필요한 기술이 아니에요. 다시 골라 봐요.';
    return '계획이 완성됐어요! 발사해 볼까요?';
  };
  function syncPlanUI() {
    const b = $('#planBtn'), n = $('#planNote'), ok = planValid(), fl = S.flight && !S.flight.done;
    b.disabled = !ok || !!fl; b.textContent = fl ? '🔥 비행 중…' : S.arrived ? '↺ 다시 발사!' : '🚀 계획대로 발사!';
    n.textContent = fl ? '목적지를 향해 날아가는 중이에요.' : planMsg();
  }
  const EAR = { x: 118, y: 336, r: 120 };
  const STN = { r: 172, a: -0.5 };
  function bez(p0, p1, p2, u) { const k = 1 - u; return { x: k * k * p0.x + 2 * k * u * p1.x + u * u * p2.x, y: k * k * p0.y + 2 * k * u * p1.y + u * u * p2.y }; }
  function bezT(p0, p1, p2, u) { return Math.atan2(2 * (1 - u) * (p1.y - p0.y) + 2 * u * (p2.y - p1.y), 2 * (1 - u) * (p1.x - p0.x) + 2 * u * (p2.x - p1.x)); }
  const P0 = { x: 140, y: 222 };
  function goalGeom(g) {
    if (g === 0) return { M: { x: 656, y: 140, r: 38 } };
    if (g === 1) return { Pl: { x: 618, y: 168, r: 44 } };
    if (g === 2) return { F: { x: 690, y: 92 } };
    return { ST: { r: STN.r } };
  }
  function startFlight() {
    if (!planValid() || (S.flight && !S.flight.done)) return;
    S.flight = { g: GOAL_OPT[S.plan.goal].kind, t: 0, dur: 7.2, done: false, flash: 0, label: null };
    S.arrived = false; FXS.clear(); FXF.clear(); Sound.click(); Sound.tone(70, 1.4, 'sawtooth', 0.05); syncPlanUI();
  }
  function flightPos(F) {
    const u = F.t / F.dur, g = F.g;
    if (g === 0) {
      const a = clamp(u / 0.68, 0, 1), e = ease.inOutSine(a);
      const p = bez(P0, { x: 360, y: 10 }, { x: 580, y: 30 }, e);
      return { x: p.x, y: p.y, rot: bezT(P0, { x: 360, y: 10 }, { x: 580, y: 30 }, e) + Math.PI / 2, burn: u < 0.66 };
    }
    if (g === 1) {
      // 행성 가까이(A)를 지나 계속 날아가는 근접 통과 경로
      const A = { x: 600, y: 108 }, C1 = { x: 330, y: 8 }, C2 = { x: 700, y: 100 }, E = { x: 800, y: 40 };
      const e = ease.inOutSine(clamp(u / 0.94, 0, 1)), k = e < 0.6 ? e / 0.6 : (e - 0.6) / 0.4;
      const p = e < 0.6 ? bez(P0, C1, A, k) : bez(A, C2, E, k);
      const rot = (e < 0.6 ? bezT(P0, C1, A, k) : bezT(A, C2, E, k)) + Math.PI / 2;
      return { x: p.x, y: p.y, rot, burn: u < 0.3 };
    }
    if (g === 2) {
      const e = ease.inOutSine(clamp(u / 0.62, 0, 1));
      const p = bez(P0, { x: 380, y: 12 }, { x: 690, y: 92 }, e);
      return { x: p.x, y: p.y, rot: bezT(P0, { x: 380, y: 12 }, { x: 690, y: 92 }, e) + Math.PI / 2, burn: u < 0.5 };
    }
    // 정거장: 지구 둘레 궤도로 올라가 도킹
    const e = ease.inOutSine(clamp(u / 0.85, 0, 1));
    const R = EAR.r + 2 + (STN.r - EAR.r - 2) * ease.outCubic(clamp(e * 2.4, 0, 1));
    const ang = -1.38 + (STN.a + 1.38) * e;
    return { x: EAR.x + R * Math.cos(ang), y: EAR.y + R * Math.sin(ang), rot: ang + Math.PI / 2, burn: u < 0.4 };
  }
  function updateFlight(dt, t) {
    const F = S.flight; if (!F || F.done) return;
    F.t += dt; F.flash = Math.max(0, F.flash - dt * 2);
    const u = F.t / F.dur, pos = flightPos(F);
    if (!RM && pos.burn && u < 0.7) {
      const nx = pos.x - Math.sin(pos.rot) * 20, ny = pos.y + Math.cos(pos.rot) * 20;
      for (let i = 0; i < 2; i++) FXF.emit({ x: nx + (Math.random() - 0.5) * 3, y: ny, vx: -Math.sin(pos.rot) * 60 + (Math.random() - 0.5) * 30, vy: Math.cos(pos.rot) * 60 + (Math.random() - 0.5) * 30, life: 0.35, size: 2.5 + Math.random() * 2, grow: -4, color: '#ffd27a', shape: 'circle' });
    }
    if (!F.sound1 && u > 0.5) { F.sound1 = true; }
    if (F.g === 1 && !F.shot && u > 0.6) { F.shot = true; F.flash = 1; Sound.tone(1500, 0.05, 'square', 0.05); Sound.tone(900, 0.08, 'square', 0.05, 0.06); }
    if (F.g === 0 && u > 0.7 && !F.landSnd) { F.landSnd = true; }
    if (F.t >= F.dur) {
      F.done = true; S.arrived = true; syncPlanUI(); Sound.success();
      const gm = F.g === 0 ? [656, 124] : F.g === 1 ? [660, 120] : F.g === 2 ? [690, 92] : [EAR.x + STN.r * Math.cos(STN.a), EAR.y + STN.r * Math.sin(STN.a)];
      FX.burst(gm[0], gm[1], { count: 22, colors: ['#fde68a', '#ffffff', '#5eead4', '#a78bfa'], speed: 170, gravity: 30, size: 3.5, life: 1 });
    }
  }
  const FLIGHT_MSG = ['달 착륙 성공! 달 표면을 직접 조사해요.', '근접 통과 성공! 행성 가까이에서 관측했어요.', '관측 성공! 먼 우주를 선명하게 봤어요.', '도킹 성공! 우주인이 머물며 실험해요.'];
  function drawPlanTop(t) {
    ctx.save(); D.roundRect(PP.x, PP.y, PP.w, PP.h, 16); ctx.clip();
    const g = ctx.createLinearGradient(0, PP.y, 0, PP.y + PP.h); g.addColorStop(0, '#02040e'); g.addColorStop(1, '#0b1a3e'); ctx.fillStyle = g; ctx.fillRect(PP.x, PP.y, PP.w, PP.h);
    const r = rng(8); ctx.fillStyle = '#fff'; for (let i = 0; i < 80; i++) { ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(t * 0.9 + i)); ctx.fillRect(PP.x + r() * PP.w, PP.y + r() * PP.h, 1.6, 1.6); } ctx.globalAlpha = 1;
    // 지구
    const ag = ctx.createRadialGradient(EAR.x, EAR.y, EAR.r - 4, EAR.x, EAR.y, EAR.r + 28); ag.addColorStop(0, 'rgba(120,190,255,.7)'); ag.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(EAR.x, EAR.y, EAR.r + 28, 0, TAU); ctx.fill();
    const eg = ctx.createRadialGradient(EAR.x - 40, EAR.y - 50, 10, EAR.x, EAR.y, EAR.r); eg.addColorStop(0, '#4a98e8'); eg.addColorStop(0.6, '#1f64c4'); eg.addColorStop(1, '#0c2e6e');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(EAR.x, EAR.y, EAR.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(90,170,90,.85)'; [[-30, -80, 36, 14], [20, -70, 26, 10], [-70, -30, 24, 16]].forEach((q) => { ctx.beginPath(); ctx.ellipse(EAR.x + q[0], EAR.y + q[1], q[2], q[3], 0.3, 0, TAU); ctx.fill(); });
    txt(EAR.x + 20, PP.y + PP.h - 14, '지구', { size: 15, weight: 800, color: '#e0f2fe' });
    const F = S.flight, goal = S.plan.goal >= 0 ? GOAL_OPT[S.plan.goal].kind : -1;
    // 목적지 미리보기
    const pv = F ? F.g : goal;
    const fa = F && !F.done ? 1 : 1;
    if (pv < 0) {
      txt(470, 160, '❓', { size: 70, alpha: 0.3 + 0.2 * pulse() }); txt(470, 214, '목표를 고르면 목적지가 나타나요', { size: 15, weight: 700, color: '#93a7de' });
    } else drawDestination(pv, t, F, fa);
    // 비행
    if (F) drawFlight(F, t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; FXF.draw(ctx); ctx.restore(); FXS.draw(ctx);
    if (F && F.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + F.flash * 0.6 + ')'; ctx.fillRect(PP.x, PP.y, PP.w, PP.h); }
    if (F && F.done) { D.label(PP.x + PP.w / 2, PP.y + 36, FLIGHT_MSG[F.g], { size: 16.5, bg: 'rgba(20,83,45,.93)', color: '#dcfce7', pad: 14 }); }
    ctx.restore();
    D.roundRect(PP.x, PP.y, PP.w, PP.h, 16); ctx.strokeStyle = 'rgba(160,190,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
  }
  function drawDestination(g, t, F, a) {
    const u = F ? F.t / F.dur : 0;
    if (g === 0) { const M = goalGeom(0).M; iconMoon(M.x, M.y, M.r); txt(M.x, M.y + M.r + 22, '달', { size: 15, weight: 800, color: '#e5e7eb' }); }
    if (g === 1) { const P = goalGeom(1).Pl; iconPlanet(P.x, P.y, P.r, true); txt(P.x, P.y + P.r + 30, '먼 행성', { size: 15, weight: 800, color: '#fde68a' }); }
    if (g === 2) {
      const Fp = goalGeom(2).F; ctx.save(); ctx.globalAlpha = 0.9; iconGalaxy(600, 230, 46, t); iconGalaxy(740, 220, 26, t * 1.2); ctx.restore();
      txt(600, 292, '먼 우주', { size: 15, weight: 800, color: '#c7d2fe' });
      ctx.save(); ctx.strokeStyle = 'rgba(167,243,208,.5)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(Fp.x, Fp.y, 30, 0, TAU); ctx.stroke(); ctx.restore();
      void u;
    }
    if (g === 3) {
      const R = STN.r;
      ctx.save(); ctx.strokeStyle = 'rgba(167,243,208,.5)'; ctx.setLineDash([5, 7]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(EAR.x, EAR.y, R, 0, TAU); ctx.stroke(); ctx.restore();
      const ang = STN.a + (RM ? 0 : Math.sin(t * 0.5) * 0.01);
      const sx = EAR.x + R * Math.cos(ang), sy = EAR.y + R * Math.sin(ang);
      iconStation(sx, sy, 1.0); txt(sx + 16, sy - 30, '우주 정거장', { size: 14, weight: 800, color: '#a7f3d0', align: 'left' });
    }
  }
  function drawFlight(F, t) {
    const u = F.t / F.dur, pos = flightPos(F), g = F.g;
    // 지나온 길
    ctx.save(); ctx.setLineDash([3, 7]); ctx.strokeStyle = 'rgba(253,230,138,.55)'; ctx.lineWidth = 2; ctx.beginPath();
    const n = 40, tmp = { g: F.g, t: 0, dur: F.dur };
    for (let i = 0; i <= n; i++) { tmp.t = F.t * i / n; const p = flightPos(tmp); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    ctx.stroke(); ctx.restore();
    if (g === 0) {
      if (u < 0.68) { rocketShape(pos.x, pos.y, 0.42, pos.rot); if (pos.burn) flameShape(pos.x, pos.y, 0.42, pos.rot, 40, t); }
      else {
        const k = ease.inOutSine(clamp((u - 0.68) / 0.32, 0, 1)), M = goalGeom(0).M;
        const sx = 580, sy = 30;
        // 모선은 달 궤도에서 대기, 착륙선이 내려감
        rocketShape(sx, sy, 0.34, Math.PI * 0.5, 0.9);
        const ly = 56 + (M.y - M.r - 16 - 56) * k, lx = 616 + (M.x - 616) * k;
        if (k < 0.97 && !RM) { FXF.emit({ x: lx, y: ly + 20, vx: (Math.random() - 0.5) * 30, vy: 80, life: 0.3, size: 2.4, grow: -4, color: '#ffd27a', shape: 'circle' }); }
        if (k > 0.85 && !RM && Math.random() < 0.7) FXS.emit({ x: lx + (Math.random() - 0.5) * 10, y: M.y - M.r + 10, vx: (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 40), vy: -10, life: 0.9, size: 5, grow: 18, color: 'rgba(200,200,205,.9)', shape: 'smoke', alpha: 0.6, drag: 1.5 });
        iconLander(lx, ly, 0.62);
      }
    } else if (g === 1) {
      const dim = u < 0.92 ? 1 : 1;
      if (u < 0.3) { rocketShape(pos.x, pos.y, 0.42, pos.rot, dim); if (pos.burn) flameShape(pos.x, pos.y, 0.42, pos.rot, 40, t); }
      else { ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(Math.sin(t * 2) * 0.05); iconProbe(0, 0, 0.62); ctx.restore(); }
      if (u >= 0.3) { /* 탐사선으로 바뀜 */ }
      const P = goalGeom(1).Pl; const d = Math.hypot(pos.x - P.x, pos.y - P.y);
      if (d < 120 && u > 0.5) D.label(pos.x, pos.y - 26, '📷 촬영 중', { size: 13.5, bg: 'rgba(8,16,44,.9)', color: '#fde68a' });
    } else if (g === 2) {
      if (u < 0.62) { rocketShape(pos.x, pos.y, 0.42, pos.rot); if (pos.burn) flameShape(pos.x, pos.y, 0.42, pos.rot, 40, t); }
      else {
        const Fp = goalGeom(2).F, k = clamp((u - 0.62) / 0.3, 0, 1);
        // 접혀 있던 거울이 펼쳐짐
        ctx.save(); ctx.translate(Fp.x, Fp.y); ctx.scale(1.6, 1.6);
        const sg = ctx.createLinearGradient(-40, 30, 40, 40); sg.addColorStop(0, '#94a3b8'); sg.addColorStop(1, '#e2e8f0');
        ctx.globalAlpha = ease.outCubic(k); ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(-46 * k, 25); ctx.lineTo(46 * k, 25); ctx.lineTo(30 * k, 34); ctx.lineTo(-30 * k, 34); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        const hx = [[0, 0], [-1, 0.5], [1, 0.5], [-1, -0.5], [1, -0.5], [0, 1], [0, -1]];
        hx.forEach((q, i) => { const kk = clamp(k * 7 - i, 0, 1); if (kk <= 0) return; ctx.save(); ctx.translate(q[0] * 11, q[1] * 12.5); ctx.scale(kk, kk); ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1; ctx.beginPath(); for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3 + Math.PI / 6; ctx.lineTo(Math.cos(an) * 7.2, Math.sin(an) * 7.2); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
        ctx.restore();
        if (u > 0.9) { const k2 = ease.outBack(clamp((u - 0.9) / 0.1, 0, 1)); ctx.save(); ctx.translate(450, 232); ctx.scale(k2, k2); rr(-56, -40, 112, 80, 8, '#02040e', '#e2e8f0'); iconGalaxy(0, 0, 26, t); ctx.restore(); }
      }
    } else {
      rocketShape(pos.x, pos.y, 0.34, pos.rot, u < 0.85 ? 1 : clamp(1 - (u - 0.85) * 6, 0, 1)); if (pos.burn) flameShape(pos.x, pos.y, 0.34, pos.rot, 36, t);
    }
  }
  function drawPlan(t) {
    drawPlanTop(t);
    panel(14, 342, 772, 304);
    txt(30, 370, '🪪 나만의 우주 탐사 계획서', { size: 18, weight: 800, color: '#fff', align: 'left' });
    const ok = planValid();
    D.label(770, 364, ok ? '✅ 계획 완성' : '✏️ 작성 중', { size: 14, align: 'right', bg: ok ? 'rgba(21,128,61,.95)' : 'rgba(71,85,105,.9)', color: '#fff', pad: 10 });
    ROWS.forEach((row, ri) => {
      txt(30, row.y + 33, row.label, { size: 15.5, weight: 800, color: row.col === '#f59e0b' ? '#fde68a' : row.col === '#3b82f6' ? '#93c5fd' : '#6ee7b7', align: 'left' });
      row.opts.forEach((o, i) => {
        const rc = chipRect(row, i), sel = S.plan[row.key] === i;
        const pop = sel ? S.planPop[ri] : 0, sc = 1 + pop * 0.08;
        ctx.save(); ctx.translate(rc.x + rc.w / 2, rc.y + rc.h / 2); ctx.scale(sc, sc); ctx.translate(-rc.w / 2, -rc.h / 2);
        D.shadow(() => { D.roundRect(0, 0, rc.w, rc.h, 12); ctx.fillStyle = sel ? row.col : 'rgba(255,255,255,.1)'; ctx.fill(); }, { blur: sel ? 10 : 0, y: 3, color: 'rgba(0,0,0,.4)' });
        D.roundRect(0, 0, rc.w, rc.h, 12); ctx.strokeStyle = sel ? '#fff' : 'rgba(160,190,255,.45)'; ctx.lineWidth = sel ? 2.5 : 1.5; ctx.stroke();
        txt(24, 34, o.icon, { size: 22 });
        const lines = wrap(o.name, rc.w - 54, f(14, 800));
        const lh = 17, y0 = rc.h / 2 - ((lines.length - 1) * lh) / 2 + 5;
        lines.forEach((ln, k) => txt(44, y0 + k * lh, ln, { size: 14, weight: 800, color: '#fff', align: 'left' }));
        if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(rc.w - 20, 14); ctx.lineTo(rc.w - 15, 19); ctx.lineTo(rc.w - 7, 9); ctx.stroke(); }
        ctx.restore();
      });
    });
    const msg = planMsg();
    const col = ok ? '#5eead4' : (S.plan.goal >= 0 && S.plan.method >= 0 && S.plan.tech >= 0 ? '#fca5a5' : '#9fb4ee');
    wrap(msg, 740, f(15, 800)).forEach((ln, i) => txt(400, 606 + i * 20, ln, { size: 15, weight: 800, color: col }));
  }

  /* =========================================================
     장면 · 조작 · 갱신
     ========================================================= */
  function resetLaunch() {
    Object.assign(LC, { phase: 'idle', t: 0, alt: 0, v: 0, rx: 190, ry: GROUND_Y - 46, rot: 0, ra: 1, shake: 0, earthA: 0, ot: 0, satOpen: 0, satA: 0, flash: 0, lastNum: 0, thrust: 0 });
    FXS.clear(); FXF.clear(); S.launchOK = false; syncLaunchUI();
  }
  function setScene(name, instant) {
    if (S.scene === name) return;
    S.scene = name; S.sceneA = instant || RM ? 1 : 0;
    if (!instant) SciSim.tween(S, { sceneA: 1 }, { duration: 0.5, ease: 'outCubic' });
    if (name === 'history') bSettle(S.tl === 'korea' ? BK : BW, true);
    if (name === 'match') bSettle(BM, true);
    if (name === 'plan') syncPlanUI();
    syncControls();
  }
  function syncControls() {
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.scene));
    $$('#tlSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.tl));
    $$('#scopeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.scopeV));
    $('#cLaunch').classList.toggle('is-off', S.scene !== 'history');
    $('#cTL').classList.toggle('is-off', S.scene !== 'history');
    $('#cScope').classList.toggle('is-off', S.scene !== 'scope');
    $('#cPlan').classList.toggle('is-off', S.scene !== 'plan');
    $('#cReset').classList.toggle('is-off', S.scene !== 'history' && S.scene !== 'match');
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.s); }));
  $$('#tlSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.tl = b.dataset.v; bSettle(S.tl === 'korea' ? BK : BW, true); syncControls(); }));
  $$('#scopeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.scopeV = b.dataset.v; syncControls(); }));
  $('#launchBtn').addEventListener('click', launch);
  $('#planBtn').addEventListener('click', () => { if (S.arrived) { S.flight = null; S.arrived = false; } startFlight(); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); const B = S.scene === 'match' ? BM : S.tl === 'korea' ? BK : BW; bReset(B); });

  function setDone(B) {
    if (B.done) return; B.done = true;
    B.slots.forEach((sl, i) => {
      SciSim.tween(B.reveal, { [i]: 1 }, { delay: 0.1 * i, duration: 0.5, ease: 'outBack' });
      SciSim.tween({ v: 0 }, { v: 1 }, { delay: 0.1 * i, duration: 0.01, onDone: () => FX.burst(sl.x + sl.w / 2, sl.y + sl.h / 2, { count: 8, colors: ['#fde68a', '#ffffff', '#5eead4'], speed: 110, gravity: 30, size: 3 }) });
    });
  }
  const checkBoard = (B) => () => { const r = bCheck(B); if (r === true) setDone(B); return r; };

  function update(dt, t) {
    updateLaunch(dt, t);
    if (S.scene === 'history' || LC.phase !== 'idle') { /* 로켓은 보이지 않을 때도 진행 */ }
    FXS.update(dt); FXF.update(dt); FX.update(dt);
    S.scopeA = RM ? (S.scopeV === 'space' ? 1 : 0) : approach(S.scopeA, S.scopeV === 'space' ? 1 : 0, dt, 5);
    if (S.scene === 'scope' && game && game.phase === 'active') {
      S.scopeSeen[S.scopeV] += dt;
      if (S.scopeSeen.ground > 1.2) S.scopeDone.ground = true;
      if (S.scopeSeen.space > 1.2) S.scopeDone.space = true;
    }
    [BW, BK, BM].forEach((B) => B.tokens.forEach((tk) => { tk.lift = approach(tk.lift, tk.drag ? 1 : 0, dt, 16); if (tk.shake > 0) tk.shake = Math.max(0, tk.shake - dt * 2.4); }));
    const w = wrongNow() && game && game.phase === 'active';
    if (w && !S.wrongShown) { [BW, BK, BM].forEach((B) => B.tokens.forEach((tk) => { if (tk.wrong && tk.zone >= 0) tk.shake = 1; })); Sound.fail(); }
    S.wrongShown = w;
    SATS.forEach((s) => { s.u = (s.u + s.v * dt * (RM ? 0.3 : 1)) % 1; });
    DEBRIS.forEach((d) => { d.u = (d.u + d.v * dt * (RM ? 0.3 : 1) + 1) % 1; });
    S.shake = S.shake.map((v) => Math.max(0, v - dt * 2.4));
    S.decoyT = Math.max(0, S.decoyT - dt);
    S.planPop = S.planPop.map((v) => approach(v, 0, dt, 8));
    updateFlight(dt, t);
  }
  function draw(t) {
    ctx.fillStyle = '#0a1230'; ctx.fillRect(0, 0, VW, VH);
    const a = ease.outCubic(clamp(S.sceneA, 0, 1));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 16);
    if (S.scene === 'history') drawHistory(t);
    else if (S.scene === 'match') drawMatch(t);
    else if (S.scene === 'scope') drawScope(t);
    else if (S.scene === 'house') drawHouse(t);
    else drawPlan(t);
    FX.draw(ctx);
    ctx.restore();
  }

  /* ---------- 포인터 ---------- */
  let pdrag = null;
  const boardOf = () => (S.scene === 'history' ? (S.tl === 'korea' ? BK : BW) : S.scene === 'match' ? BM : null);
  SciSim.pointer(V, {
    hover(p) {
      const B = boardOf(); if (B) return bHit(B, p) ? 'grab' : null;
      if (S.scene === 'house') return (HS.some((h) => Math.hypot(p.x - h.x, p.y - h.y) < h.r + 6) || SATS.some((s) => { const q = satPos(s); return Math.hypot(p.x - q.x, p.y - q.y) < 28; })) ? 'pointer' : null;
      if (S.scene === 'plan') return chipAt(p) ? 'pointer' : null;
      return null;
    },
    down(p) {
      const B = boardOf();
      if (B) {
        const tk = bHit(B, p); if (!tk) return false;
        if (tk.tw) tk.tw.cancel();
        tk.drag = true; tk.wrong = false; pdrag = { tk, B, ox: p.x - tk.x, oy: p.y - tk.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true;
      }
      if (S.scene === 'house') { houseTap(p); return false; }
      if (S.scene === 'plan') { const c = chipAt(p); if (c) { const changed = S.plan[c.row.key] !== c.i; S.plan[c.row.key] = c.i; S.planPop[c.ri] = 1; Sound.tone(560 + c.ri * 90, 0.08, 'triangle', 0.08); if (changed) { S.flight = null; S.arrived = false; FXS.clear(); FXF.clear(); } syncPlanUI(); } return false; }
      if (S.scene === 'scope') {
        const sx = 14 + 330, sy = 14 + 150, gx = 14 + 96, gy = 14 + 462;
        if (Math.hypot(p.x - sx, p.y - sy) < 56) { S.scopeV = 'space'; Sound.click(); syncControls(); } else if (Math.hypot(p.x - gx, p.y - gy) < 56) { S.scopeV = 'ground'; Sound.click(); syncControls(); }
      }
      return false;
    },
    move(p) {
      if (!pdrag) return;
      const tk = pdrag.tk; if (Math.hypot(p.x - pdrag.sx, p.y - pdrag.sy) > 7) pdrag.moved = true;
      tk.x = p.x - pdrag.ox; tk.y = p.y - pdrag.oy;
    },
    up(p) {
      const d = pdrag; pdrag = null; if (!d) return;
      const tk = d.tk; tk.drag = false;
      if (!d.moved) bTap(d.B, tk); else bDrop(d.B, tk, p);
      refreshWrong(d.B); bSettle(d.B);
    },
  });
  function chipAt(p) {
    for (let ri = 0; ri < ROWS.length; ri++) { const row = ROWS[ri]; for (let i = 0; i < row.opts.length; i++) if (inRect(p, chipRect(row, i), 2)) return { row, i, ri }; }
    return null;
  }
  function houseTap(p) {
    // 위성
    for (let i = 0; i < SATS.length; i++) { const q = satPos(SATS[i]); if (Math.hypot(p.x - q.x, p.y - q.y) < 30 && SATS[i].u > 0.03 && SATS[i].u < 0.97) { S.satSel = i; Sound.tone(600 + i * 100, 0.1, 'triangle', 0.08); return; } }
    const h = HS.find((q) => Math.hypot(p.x - q.x, p.y - q.y) < q.r + 6);
    if (!h) return;
    if (h.type === 'spin') {
      if (!S.found[h.id]) { S.found[h.id] = true; Sound.tone(700 + h.id * 80, 0.14, 'triangle', 0.1); FX.burst(h.x, h.y, { count: 14, colors: ['#bbf7d0', '#fde68a', '#ffffff'], speed: 130, gravity: 40, size: 3 }); S.infoSel = h.id; }
      else Sound.tick();
    } else { S.shake[h.id] = 1; S.decoyMsg = { x: h.x, y: h.y, text: h.name + (((h.name.charCodeAt(h.name.length - 1) - 0xAC00) % 28) ? '은' : '는') + ' 우주 기술과 관계가 없어요' }; S.decoyT = 1.8; Sound.fail(); }
  }

  /* =========================================================
     퀴즈 그림 (인라인 SVG)
     ========================================================= */
  const FIG = {};
  const svgText = (x, y, s, size, col, anchor) => '<text x="' + x + '" y="' + y + '" font-size="' + size + '" font-weight="800" fill="' + col + '" text-anchor="' + (anchor || 'middle') + '" font-family="sans-serif">' + s + '</text>';
  FIG.scope = '<svg viewBox="0 0 360 210" width="360" role="img" aria-label="별빛이 대기를 지나며 흔들려 지상 망원경에는 흐리게, 대기권 밖 우주 망원경에는 선명하게 도착하는 그림">' +
    '<rect width="360" height="210" rx="12" fill="#060b24"/><rect y="78" width="360" height="82" fill="#3b82c4" opacity=".55"/><rect y="160" width="360" height="50" rx="0" fill="#26402e"/>' +
    '<circle cx="180" cy="20" r="6" fill="#fff"/><circle cx="180" cy="20" r="14" fill="#fff" opacity=".25"/>' +
    '<path d="M186 26 L270 56" stroke="#fff6c2" stroke-width="2.4"/><rect x="262" y="50" width="34" height="12" rx="3" fill="#cbd5e1" transform="rotate(25 279 56)"/><rect x="278" y="36" width="10" height="14" fill="#1d4ed8"/><rect x="278" y="62" width="10" height="14" fill="#1d4ed8"/>' +
    '<path d="M174 26 L160 78 Q150 92 162 104 Q172 118 154 130 Q142 142 120 160" fill="none" stroke="#fff6c2" stroke-width="2" opacity=".75"/>' +
    '<path d="M70 190 a22 22 0 0 1 44 0" fill="#cbd5e1"/><rect x="86" y="162" width="12" height="30" rx="3" fill="#e2e8f0" transform="rotate(-25 92 190)"/>' +
    svgText(290, 100, '대기권 밖', 12.5, '#e0f2fe') + svgText(300, 40, '우주 망원경', 12.5, '#c7d2fe') + svgText(80, 124, '대기권 (공기)', 12.5, '#e0f2fe', 'middle') + svgText(92, 205, '지상 망원경', 12.5, '#fff') + '</svg>';
  FIG.sats = '<svg viewBox="0 0 360 190" width="360" role="img" aria-label="지구 둘레를 도는 통신 위성, GPS 위성, 기상 위성">' +
    '<rect width="360" height="190" rx="12" fill="#060b24"/><circle cx="180" cy="250" r="140" fill="#1f64c4"/><circle cx="180" cy="250" r="140" fill="none" stroke="#7dd3fc" stroke-width="5" opacity=".5"/>' +
    [[70, 70, '#60a5fa', '통신 위성'], [180, 40, '#4ade80', 'GPS 위성'], [290, 70, '#fde047', '기상 위성']].map((q) => '<rect x="' + (q[0] - 8) + '" y="' + (q[1] - 8) + '" width="16" height="16" rx="3" fill="' + q[2] + '"/><rect x="' + (q[0] - 30) + '" y="' + (q[1] - 4) + '" width="18" height="8" fill="#1d4ed8"/><rect x="' + (q[0] + 12) + '" y="' + (q[1] - 4) + '" width="18" height="8" fill="#1d4ed8"/>' + svgText(q[0], q[1] + 28, q[3], 13, q[2])).join('') + '</svg>';
  FIG.debris = (function () {
    const r = rng(12); let d = '';
    for (let i = 0; i < 150; i++) { const a = r() * TAU, R = 150 + r() * 36; d += '<rect x="' + (180 + R * Math.cos(a)).toFixed(1) + '" y="' + (240 + R * Math.sin(a)).toFixed(1) + '" width="' + (1.6 + r() * 2.4).toFixed(1) + '" height="2" fill="#c7ccd8" transform="rotate(' + Math.round(r() * 90) + ')" opacity=".9"/>'; }
    return '<svg viewBox="0 0 360 190" width="360" role="img" aria-label="지구 둘레를 도는 우주 쓰레기 조각들과 인공위성">' +
      '<rect width="360" height="190" rx="12" fill="#060b24"/><circle cx="180" cy="240" r="132" fill="#1f64c4"/><circle cx="180" cy="240" r="132" fill="none" stroke="#7dd3fc" stroke-width="5" opacity=".5"/>' +
      d.replace(/transform="rotate\(\d+\)"/g, '') + '<rect x="214" y="36" width="14" height="14" rx="3" fill="#fde68a"/><rect x="190" y="40" width="22" height="6" fill="#1d4ed8"/><rect x="230" y="40" width="22" height="6" fill="#1d4ed8"/>' +
      svgText(290, 30, '우주 쓰레기', 13, '#e2e8f0') + svgText(220, 70, '인공위성', 13, '#fde68a') + '</svg>';
  })();
  FIG.history = '';

  /* =========================================================
     게임(4단계)
     ========================================================= */
  const plural = (n) => n;
  void plural;
  game = SciSim.game({
    simId: 'm2-space-exploration',
    mount: '#game',
    badge: '우주 탐사 대원',
    homeHref: '../../index.html#g2',
    featureLabels: { launch: '🚀 로켓 발사', timeline: '📜 탐사 역사 연표', methods: '🧩 탐사 방법 · 🔭 망원경 비교', house: '🏠 우주 기술을 찾는 집', plan: '📋 탐사 계획서' },
    onFeatures() { syncControls(); },
    onComplete() { },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '로켓과 탐사의 역사', short: '탐사 역사', icon: '🚀', phase: '관찰',
        features: ['launch', 'timeline'],
        intro: '<p class="si-q">❓ 탐구 질문: 사람들은 왜 우주를 탐사할까?</p>' +
          '<p>먼저 <b>로켓</b>을 발사해 우주로 올라가 봐요. 그리고 지금까지 사람들이 우주를 탐사해 온 <b>역사</b>를 연표로 정리해 봐요.</p>' +
          '<p>🚀 로켓을 쏘아 올린 뒤에는 인공위성이 궤도에 오르는 모습까지 지켜봐요.</p>',
        setup() { setScene('history', true); S.tl = 'world'; resetLaunch(); bReset(BW); bReset(BK); syncControls(); },
        recap: '로켓은 뜨거운 가스를 힘차게 내뿜어 우주로 올라가요. 1957년 스푸트니크 1호를 시작으로 인류의 우주 탐사가 이어져 왔어요.',
        summary: '<ul><li><b>로켓</b>은 연료를 태워 뜨거운 가스를 아래로 내뿜고, 그 힘으로 우주(고도 약 100 km 이상)까지 올라가요.</li>' +
          '<li><b>1957</b> 스푸트니크 1호(최초의 인공위성) → <b>1961</b> 가가린(최초의 유인 우주 비행) → <b>1969</b> 아폴로 11호(최초의 유인 달 착륙) → <b>1977</b> 보이저 1·2호 발사 → <b>1990</b> 허블 우주 망원경 → <b>1998</b> 국제 우주 정거장 건설 시작 → <b>2021</b> 제임스 웹 우주 망원경 발사</li>' +
          '<li>우리나라: <b>1992</b> 우리별 1호 → <b>2013</b> 나로호 → <b>2022</b> 누리호 2차 발사 성공, 달 궤도선 다누리 발사</li></ul>',
        missions: [
          {
            title: '🚀 로켓 발사하기',
            goal: '[🚀 로켓 발사!]를 눌러, 로켓이 <b>우주(고도 100 km)</b>를 지나 인공위성을 궤도에 올리는 것까지 지켜봐요.',
            hint: '카운트다운 뒤에 로켓이 날아올라요. 고도 표시가 100 km를 넘으면 우주예요. 끝까지 보면 성공!',
            setup() { setScene('history'); resetLaunch(); },
            check: () => S.launchOK,
            hold: 0.3,
            status: () => chk(LC.alt >= 100, '우주(100 km) 도착') + ' · ' + chk(S.launchOK, '위성 궤도 진입') + (LC.phase !== 'idle' && !S.launchOK ? '<br>고도 ' + Math.min(LC.alt, 100).toFixed(0) + ' km' : ''),
            explain: '로켓은 연료를 태워 <b>뜨거운 가스를 아래로 힘차게 내뿜고</b>, 그 힘으로 올라가요. 공기가 거의 없는 고도 100 km 이상이 우주예요. 높이 올라갈수록 연기가 퍼지지 않고 사라지는 것도 공기가 없기 때문이에요.',
          },
          {
            title: '📜 세계 우주 탐사 연표',
            goal: '카드 7장을 <b>옛날부터 요즘</b> 순서대로 위 칸에 놓고 [확인하기]를 눌러요.',
            hint: '스푸트니크 1호(최초의 인공위성)가 가장 먼저, 제임스 웹 우주 망원경이 가장 나중이에요. 사람이 달에 간 것은 허블 망원경보다 앞이에요.',
            manual: true,
            setup() { setScene('history'); S.tl = 'world'; bReset(BW); S.lastCheck = 0; syncControls(); },
            check: checkBoard(BW),
            explain: '1957 스푸트니크 1호 → 1961 가가린 → 1969 아폴로 11호 → 1977 보이저 1·2호 → 1990 허블 우주 망원경 → 1998 국제 우주 정거장 → 2021 제임스 웹 우주 망원경 순서예요.',
          },
          {
            title: '🇰🇷 우리나라의 우주 탐사',
            goal: '우리나라의 우주 탐사 카드 3장을 <b>옛날부터 요즘</b> 순서대로 놓고 [확인하기]를 눌러요.',
            hint: '우리나라 최초의 인공위성 우리별 1호가 가장 먼저예요. 달 궤도선 다누리는 가장 최근이에요.',
            manual: true,
            setup() { setScene('history'); S.tl = 'korea'; bReset(BK); S.lastCheck = 0; syncControls(); },
            check: checkBoard(BK),
            explain: '1992 우리별 1호 → 2013 나로호 → 2022 누리호 2차 발사 성공과 달 궤도선 다누리 발사 순서예요. 우리나라도 점점 더 멀리, 더 스스로 우주를 탐사하고 있어요.',
          },
        ],
      },
      /* ---------- 2단계 · 탐구 ---------- */
      {
        title: '목표에 맞는 탐사 방법', short: '탐사 방법', icon: '🛰️', phase: '탐구',
        features: ['methods'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 사람들이 달, 행성, 먼 우주까지 탐사해 온 역사를 살펴봤어요.</div>' +
          '<p>탐사 <b>목표</b>가 다르면 쓰는 <b>방법</b>도 달라요. <b>착륙선</b>, <b>탐사선</b>, <b>우주 망원경</b>, <b>우주 정거장</b>이 각각 어떤 목표에 알맞은지 짝지어 봐요.</p>' +
          '<p>또 <b>우주 망원경</b>이 지상 망원경보다 좋은 점도 비교해 봐요.</p>',
        setup() { setScene('match', true); bReset(BM); syncControls(); },
        recap: '탐사 목표에 따라 착륙선, 탐사선, 우주 망원경, 우주 정거장을 알맞게 써요. 우주 망원경은 대기권 밖에서 별빛이 흔들리지 않아 선명해요.',
        summary: '<ul><li><b>착륙선</b>: 달 같은 천체 표면에 내려앉아 흙과 암석을 직접 조사해요.</li><li><b>탐사선(근접 통과)</b>: 먼 행성 가까이를 지나가며 사진과 자료를 얻어요.</li>' +
          '<li><b>우주 망원경</b>: 대기권 밖에서 먼 우주를 관측해요. 공기에 흔들리거나 가려지지 않아 선명해요.</li><li><b>우주 정거장</b>: 우주인이 머물며 우주 환경에서 실험해요.</li></ul>',
        missions: [
          {
            title: '🧩 목표와 방법 짝짓기',
            goal: '탐사 방법 카드 4장을 알맞은 <b>탐사 목표</b> 옆 칸에 놓고 [확인하기]를 눌러요.',
            hint: '달 표면에 직접 내려앉는 것은 착륙선, 먼 행성 옆을 지나가는 것은 탐사선이에요.',
            manual: true,
            setup() { setScene('match'); bReset(BM); S.lastCheck = 0; },
            check: checkBoard(BM),
            explain: '<b>달 표면 연구 - 착륙선</b>, <b>먼 행성 관찰 - 탐사선(근접 통과)</b>, <b>먼 우주 관측 - 우주 망원경</b>, <b>우주 생활 실험 - 우주 정거장</b>이 알맞은 짝이에요.',
          },
          {
            title: '🔭 지상 vs 우주 망원경',
            goal: '[⛰️ 지상]과 [🛰️ 우주]를 모두 눌러, 같은 별이 어떻게 다르게 찍히는지 1초 이상 살펴봐요.',
            hint: '오른쪽 위 버튼이나 그림 속 망원경을 눌러 바꿔요. 사진의 별 모양과 개수를 비교해 보세요.',
            setup() { setScene('scope'); S.scopeV = 'ground'; S.scopeSeen = { ground: 0, space: 0 }; S.scopeDone = { ground: false, space: false }; syncControls(); },
            check: () => S.scopeDone.ground && S.scopeDone.space,
            hold: 0.3,
            status: () => chk(S.scopeDone.ground, '지상 망원경') + ' · ' + chk(S.scopeDone.space, '우주 망원경'),
            explain: '지상 망원경으로 보면 별빛이 <b>공기(대기)</b>를 지나며 흔들리고 일부가 흡수되어 흐려요. 대기권 밖 <b>우주 망원경</b>은 공기가 없어 별빛이 선명하게 도착해요.',
          },
          {
            type: 'quiz',
            title: '🌌 우주 망원경이 유리한 까닭',
            goal: '우주 망원경은 왜 지상 망원경보다 먼 우주를 <b>더 선명하게</b> 볼 수 있을까요?',
            figure: FIG.scope,
            setup() { setScene('scope'); },
            choices: ['망원경이 지상보다 훨씬 커서', '대기권 밖이라 공기가 별빛을 흔들거나 흡수하지 않아서', '우주에는 낮이 없어서 항상 어두워서', '별에 더 가까이 가서 별이 커 보여서'],
            answer: 1,
            feedback: [
              '우주 망원경이 항상 더 큰 것은 아니에요. 중요한 것은 공기층 바깥에 있다는 점이에요.',
              '',
              '지상에서도 밤에는 어두워요. 문제는 별빛이 공기층을 통과하면서 흔들린다는 거예요.',
              '별까지의 거리는 수광년 이상이라, 지구 둘레의 우주 망원경도 별에 가까워진 것은 아니에요.',
            ],
            explain: '지상 망원경으로 별을 볼 때는 별빛이 <b>대기를 통과</b>하면서 흔들리고 일부가 흡수돼요. <b>대기권 밖</b>에 있는 우주 망원경(허블, 제임스 웹 등)은 이런 영향이 없어 선명하게 관측해요.',
          },
        ],
      },
      /* ---------- 3단계 · 설명 ---------- */
      {
        title: '생활 속 우주 기술', short: '우주 기술', icon: '🏠', phase: '설명',
        features: ['house'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탐사 방법과 우주 망원경을 알아봤어요. 우주 탐사를 위해 만든 기술은 우리 <b>생활</b>에도 쓰이고 있어요.</div>' +
          '<p>집 안에서 우주 기술에서 나온 물건 <b>4가지</b>를 찾아봐요. 단서는 오른쪽 카드에 있어요. 하늘의 <b>인공위성</b>도 눌러 보세요.</p>',
        setup() { setScene('house', true); syncControls(); },
        recap: '우주 기술은 메모리폼, 정수 필터, 적외선 체온계, 동결 건조 식품처럼 생활에 쓰이고, 인공위성은 통신·GPS·기상 예보에 쓰여요. 우주 쓰레기는 위성과 충돌할 위험이 있어 줄여야 해요.',
        summary: '<div class="note-fig">' + FIG.sats + '</div><ul><li><b>우주 기술이 생활에 쓰인 예</b>: 메모리폼(우주선 좌석), 정수 필터(우주인 물), 적외선 체온계(별의 온도 측정), 동결 건조 식품(우주 식량)</li>' +
          '<li><b>인공위성의 활용</b>: 통신·방송, GPS(위치 확인), 기상 관측(일기 예보)</li>' +
          '<li><b>우주 쓰레기</b>: 수명이 다한 위성과 로켓 조각이 매우 빠르게 돌아서 위성·우주선과 충돌할 위험이 있어요.</li></ul>',
        missions: [
          {
            title: '🔎 우주 기술 찾기',
            goal: '집 안에서 <b>우주 기술에서 나온 물건 4가지</b>를 찾아 눌러요. 오른쪽 카드의 단서를 참고해요.',
            hint: '단서: 잠잘 때 쓰는 물건 / 물을 깨끗하게 하는 물건 / 몸이 아플 때 쓰는 물건 / 가볍고 오래 두는 식품. 점선 원이 눌러 볼 수 있는 물건이에요.',
            setup() { setScene('house'); S.found = [false, false, false, false]; S.satSel = -1; S.decoyT = 0; },
            check: () => S.found.every(Boolean),
            hold: 0.5,
            status: () => HS.filter((h) => h.type === 'spin').map((h) => chk(S.found[h.id], S.found[h.id] ? h.name : '?')).join(' · '),
            explain: '<b>메모리폼</b>(우주선 좌석의 충격 흡수), <b>정수 필터</b>(우주인의 물), <b>적외선 체온계</b>(별의 온도 측정), <b>동결 건조 식품</b>(우주 식량)처럼 우주 탐사를 위해 개발한 기술이 생활에서도 쓰여요.',
          },
          {
            type: 'quiz',
            title: '🛰️ 인공위성의 활용',
            goal: '다음 중 <b>인공위성을 활용한 것이 아닌</b> 것은?',
            figure: FIG.sats,
            setup() { setScene('house'); },
            choices: ['해외 경기를 TV로 바로 보여 주는 방송', '스마트폰으로 길을 안내해 주는 GPS', '구름 사진으로 날씨를 알려 주는 일기 예보', '땅속 깊은 곳의 석유를 직접 퍼 올리기'],
            answer: 3,
            feedback: [
              '통신 위성이 방송 신호를 전해 줘서 해외 경기도 바로 볼 수 있어요. 위성을 활용한 거예요.',
              'GPS 위성이 내 위치를 알려 줘요. 위성을 활용한 거예요.',
              '기상 위성이 구름 사진을 찍어 일기 예보에 써요. 위성을 활용한 거예요.',
              '',
            ],
            explain: '인공위성은 <b>통신·방송</b>, <b>GPS(위치 확인)</b>, <b>기상 관측</b> 등에 활용돼요. 땅속 석유를 퍼 올리는 일은 위성이 하는 일이 아니에요.',
          },
          {
            type: 'quiz',
            title: '🗑️ 우주 쓰레기 문제',
            goal: '지구 둘레에는 수명이 다한 위성과 로켓 조각 같은 <b>우주 쓰레기</b>가 떠돌고 있어요. 이것이 문제가 되는 가장 큰 까닭은?',
            figure: FIG.debris,
            setup() { setScene('house'); },
            choices: ['너무 커서 밤하늘을 가려 버려서', '아주 빠른 속도로 돌고 있어서 인공위성이나 우주선과 충돌할 위험이 있어서', '지구의 자전을 느리게 만들어서', '지구로 떨어지면 모두 바다에 퐁당 빠져서'],
            answer: 1,
            feedback: [
              '우주 쓰레기는 대부분 작은 조각이라서 밤하늘을 가리지는 않아요.',
              '',
              '우주 쓰레기가 지구의 자전에 영향을 줄 만큼 크지는 않아요.',
              '우주 쓰레기는 궤도를 돌고 있어요. 문제는 떨어질 때가 아니라 돌면서 충돌할 위험이에요.',
            ],
            explain: '우주 쓰레기는 아주 빠른 속도로 지구 둘레를 돌아서, 작은 조각이라도 인공위성이나 우주선과 부딪치면 큰 피해를 줘요. 그래서 우주 쓰레기를 <b>줄이고 치우려는 노력</b>이 필요해요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '나만의 탐사 계획', short: '탐사 계획', icon: '📋', phase: '적용',
        features: ['plan'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탐사 방법과 우주 기술이 생활에 쓰이는 것을 알았어요.</div>' +
          '<p>이제 <b>나만의 우주 탐사 계획서</b>를 만들어요. <b>① 목표 → ② 방법 → ③ 핵심 기술</b>을 차례로 골라 계획서를 완성하고, 계획대로 <b>발사</b>해서 목적지에 도착하는 모습을 봐요.</p>',
        setup() { setScene('plan', true); S.plan = { goal: -1, method: -1, tech: -1 }; S.flight = null; S.arrived = false; FXS.clear(); FXF.clear(); syncPlanUI(); syncControls(); },
        recap: '탐사 목표에 알맞은 방법과 핵심 기술을 고르면 탐사 계획을 세울 수 있어요. 우주 탐사는 우주를 이해하게 하고, 개발한 기술은 생활에도 쓰여요.',
        summary: '<ul><li><b>탐사 계획</b>은 ① 목표 → ② 방법 → ③ 핵심 기술 순서로 세워요.</li><li>달 표면 연구는 착륙선(정밀 착륙 장치), 먼 행성 관찰은 탐사선(장거리 통신 안테나·태양 전지판), 먼 우주 관측은 우주 망원경(정밀 거울과 냉각 장치), 우주 생활 실험은 우주 정거장(생명 유지 장치)이 알맞아요.</li>' +
          '<li>우주 탐사는 우주에 대한 이해를 넓히고, 개발된 기술은 생활(스핀오프)에도 쓰여 <b>과학의 유용성</b>을 보여 줘요.</li></ul>',
        missions: [
          {
            title: '📋 탐사 계획서 완성하고 발사',
            goal: '<b>목표 · 방법 · 핵심 기술</b>을 하나씩 골라 계획서를 완성하고, [🚀 계획대로 발사!]를 눌러 목적지에 도착해요.',
            hint: '목표를 먼저 고른 뒤, 그 목표에 알맞은 방법과 기술을 골라요. 계획서가 맞지 않으면 안내 문구가 나와요.',
            setup() { setScene('plan'); S.plan = { goal: -1, method: -1, tech: -1 }; S.flight = null; S.arrived = false; syncPlanUI(); },
            check: () => S.arrived,
            hold: 0.5,
            status: () => chk(S.plan.goal >= 0, '목표') + ' · ' + chk(S.plan.method >= 0, '방법') + ' · ' + chk(S.plan.tech >= 0, '기술') + '<br>' + chk(planValid(), '계획 완성') + ' · ' + chk(S.arrived, '목적지 도착'),
            explain: '목표에 알맞은 <b>탐사 방법</b>과 <b>핵심 기술</b>을 골랐더니 계획대로 목적지에 도착했어요. 탐사 방법은 목표에 따라 달라지고, 그에 맞는 기술이 필요해요.',
          },
          {
            type: 'quiz',
            title: '🌍 우주 탐사의 의의',
            goal: '우주 탐사의 <b>의의와 인류에게 미치는 영향</b>으로 가장 알맞은 것은?',
            setup() { setScene('plan'); },
            choices: ['탐사선을 만들 때 쓴 기술은 우주에서만 쓸 수 있다', '우주를 이해하는 데 도움이 되고, 개발한 기술이 우리 생활에도 쓰인다', '우주 탐사는 지구 생활에 아무 영향을 주지 않는다', '이미 우주의 모든 것을 알아서 더 탐사할 필요가 없다'],
            answer: 1,
            feedback: [
              '메모리폼, 정수 필터, 적외선 체온계처럼 우주 기술은 생활에서도 쓰여요.',
              '',
              '인공위성(통신·GPS·기상)과 우주 기술 덕분에 우리 생활이 달라졌어요. 영향이 아주 커요.',
              '우주에는 아직 모르는 것이 훨씬 많아요. 탐사는 계속되고 있어요.',
            ],
            explain: '우주 탐사는 <b>우주를 이해하는 데 도움</b>이 되고, 탐사를 위해 개발한 기술은 <b>생활에도 쓰여요</b>. 이처럼 과학은 우리 삶에 매우 유용해요.',
          },
        ],
      },
    ],
  });

  /* =========================================================
     시작
     ========================================================= */
  syncControls(); syncLaunchUI(); syncPlanUI();
  resetLaunch();
  let frameMs = 0;
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    draw(t);
    frameMs += (performance.now() - t0 - frameMs) * 0.05;
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, LC, BW, BK, BM, HS, SATS, ROWS, game: () => game, frameMs: () => frameMs, V, setScene, planValid, chipRect, startFlight, syncPlanUI, satPos: (i) => satPos(SATS[i]), launch,
    client(x, y) { const r = V.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    tokCenter(B, id) { const t = B.tokens.find((q) => q.id === id || q.name === id); return { x: t.x + t.w / 2, y: t.y + t.h / 2 }; },
    slotCenter(B, i) { const s = B.slots[i]; return { x: s.x + s.w / 2, y: s.y + s.h / 2 }; },
  };
})();
