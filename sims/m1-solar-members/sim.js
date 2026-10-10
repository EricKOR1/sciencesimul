/* =========================================================
   중1 Ⅶ. 태양계 - 태양계 구성 천체  [9과07-01 앞부분]
   탐구 흐름(4단계):
   ① 관찰: 태양계 지도를 둘러보며 천체 카드 모으기 (태양·행성·왜소행성·소행성·위성·혜성)
   ② 탐구: 분류 열쇠(무엇의 둘레를 도는가 → 둥근가 → 꼬리 / 궤도 주변을 치웠는가)로 분류
   ③ 모형: 소행성대의 위치, 혜성의 궤도와 꼬리(늘 태양 반대쪽)
   ④ 적용: 탐사 일지 속 새 천체(에리스·유로파·아포피스) 분류
   지도 거리: r = 46 + 92·√AU (압축), 천체 크기는 과장 — "크기와 거리는 실제와 달라요"
   (행성을 지구형·목성형으로 나누는 활동은 다음 차시 m1-planet-types에서 다룹니다)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp } = SciSim;
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;
  const RM = !!SciSim.reduceMotion;
  const shade = SciSim.color.shade;
  const EZ = SciSim.ease;
  const nowS = () => performance.now() / 1000;

  /* =========================================================
     공통 그리기 도우미 (단원 Ⅶ 우주 화면 스타일)
     ========================================================= */
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
    for (let i = 0; i < n; i++) {
      const c = r();
      a.push({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, s: 0.5 + Math.pow(r(), 1.8) * 1.5, p: r() * TAU, k: 0.6 + r() * 1.8, c: c < 0.14 ? '#ffe7c2' : c < 0.3 ? '#cfe0ff' : '#eef3ff' });
    }
    return a;
  }
  function drawStars(ctx, stars, t, alpha) {
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const tw = RM ? 0.7 : 0.45 + 0.4 * Math.sin(t * s.k + s.p);
      ctx.globalAlpha = alpha * tw;
      ctx.fillStyle = s.c;
      if (s.s > 1.45) {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s * 0.75, 0, TAU); ctx.fill();
        ctx.globalAlpha = alpha * tw * 0.35;
        ctx.fillRect(s.x - s.s * 2.2, s.y - 0.4, s.s * 4.4, 0.8);
        ctx.fillRect(s.x - 0.4, s.y - s.s * 2.2, 0.8, s.s * 4.4);
      } else ctx.fillRect(s.x, s.y, s.s * 1.3, s.s * 1.3);
    }
    ctx.globalAlpha = 1;
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); }
  const fnt = (L, px, weight) => (weight ? weight + ' ' : '') + Math.round(px * L.fs) + 'px ' + FONT;
  const dfnt = (L, px) => Math.round(px * L.fs) + 'px ' + DISPLAY;
  function pillWidth(ctx, text, o) { ctx.font = o.font; return ctx.measureText(text).width + (o.pad || 9) * 2; }
  function pill(ctx, text, x, y, o) {
    o = o || {};
    ctx.font = o.font || 'bold 13px ' + FONT;
    const w = ctx.measureText(text).width, h = o.h || 22, pad = o.pad || 9;
    const bx = o.align === 'left' ? x : o.align === 'right' ? x - w - pad * 2 : x - w / 2 - pad;
    ctx.fillStyle = o.bg || 'rgba(6,10,26,.78)';
    roundRect(ctx, bx, y - h / 2, w + pad * 2, h, h / 2); ctx.fill();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + pad, y + 0.5);
    ctx.textBaseline = 'alphabetic';
    return { x: bx, w: w + pad * 2 };
  }
  // 줄바꿈 글자: 낱말 단위로 나누고, 너무 긴 낱말은 글자 단위로 나눔
  function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach((w) => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW || !line) {
        if (!line && ctx.measureText(w).width > maxW) {
          let part = '';
          for (const ch of w) { if (ctx.measureText(part + ch).width > maxW && part) { lines.push(part); part = ch; } else part += ch; }
          line = part;
        } else line = test;
      } else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    const n = maxLines ? Math.min(maxLines, lines.length) : lines.length;
    for (let i = 0; i < n; i++) ctx.fillText(lines[i], x, y + i * lh);
    return y + (n - 1) * lh;
  }
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
    ctx.strokeStyle = 'rgba(94,234,212,' + (0.35 + pulse() * 0.6) + ')'; ctx.lineWidth = 4;
    roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 14); ctx.stroke();
    const th = Math.round(22 * L.fs);
    newTag(ctx, L, x + w - 6, y - th - 6 >= 0 ? y - th - 6 : y + 6);
    ctx.restore();
  }
  function newRingCircle(ctx, L, x, y, r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(94,234,212,' + (0.35 + pulse() * 0.6) + ')'; ctx.lineWidth = 4;
    circle(ctx, x, y, r + 2 * pulse()); ctx.stroke();
    newTag(ctx, L, x + r * 0.71 + 40 * L.fs, y - r * 0.71 - 12 * L.fs);
    ctx.restore();
  }
  function checkMark(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.12, y + s * 0.4); ctx.lineTo(x + s * 0.55, y - s * 0.4); ctx.stroke();
  }
  function spaceBg(ctx, R, cx, cy, rad) {
    const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, rad);
    bg.addColorStop(0, '#17264f'); bg.addColorStop(0.6, '#0e1838'); bg.addColorStop(1, '#070d1f');
    ctx.fillStyle = bg; ctx.fillRect(R.x, R.y, R.w, R.h);
  }
  function panelBase(ctx, P, stars, t) {
    roundRect(ctx, P.x, P.y, P.w, P.h, 14);
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, '#0c1636'); g.addColorStop(1, '#1b2d60');
    ctx.fillStyle = g; ctx.fill();
    if (stars) drawStars(ctx, stars, t, 0.7);
  }
  function panelEdge(ctx, P) {
    roundRect(ctx, P.x, P.y, P.w, P.h, 14);
    ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;

  /* =========================================================
     천체 자료 (거리는 √AU로 압축, 크기는 과장)
     ========================================================= */
  const AU2R = (au) => 46 + 92 * Math.sqrt(au);
  const EARTH_T = 8;                       // 지구 1바퀴 = 8초
  const R_MARS = AU2R(1.52), R_B0 = AU2R(2.2), R_B1 = AU2R(3.3), R_JUP = AU2R(5.2), R_25 = AU2R(2.5);
  const SUN_R = 24;

  const KIND = {
    sun: { name: '태양', badge: '☀️ 태양 (별)', col: '#f59e0b', icon: '☀️' },
    planet: { name: '행성', badge: '🪐 행성', col: '#3b82f6', icon: '🪐' },
    dwarf: { name: '왜소행성', badge: '🟣 왜소행성', col: '#a855f7', icon: '🟣' },
    asteroid: { name: '소행성', badge: '🪨 소행성', col: '#b45309', icon: '🪨' },
    moon: { name: '위성', badge: '🌙 위성', col: '#64748b', icon: '🌙' },
    comet: { name: '혜성', badge: '☄️ 혜성', col: '#0891b2', icon: '☄️' },
  };
  const KIND_ORDER = ['sun', 'planet', 'dwarf', 'asteroid', 'moon', 'comet'];

  const BODY = {
    sun: { name: '태양', kind: 'sun', look: 'sun' },
    mercury: { name: '수성', kind: 'planet', look: 'cratered', col: '#a8a29a', n: 1 },
    venus: { name: '금성', kind: 'planet', look: 'venus', col: '#e3bf78', atmo: '#ffe1a6', n: 2 },
    earth: { name: '지구', kind: 'planet', look: 'earth', col: '#2f6fc8', atmo: '#8cc4ff', n: 3 },
    mars: { name: '화성', kind: 'planet', look: 'mars', col: '#c8582f', atmo: '#ffb08a', n: 4 },
    jupiter: { name: '목성', kind: 'planet', look: 'jupiter', col: '#d6b088', n: 5 },
    saturn: { name: '토성', kind: 'planet', look: 'saturn', col: '#e0c68c', ring: true, n: 6 },
    uranus: { name: '천왕성', kind: 'planet', look: 'ice', col: '#94d8e2', atmo: '#c9f6fa', n: 7 },
    neptune: { name: '해왕성', kind: 'planet', look: 'neptune', col: '#4a6fe0', atmo: '#9db4ff', n: 8 },
    moon: { name: '달', kind: 'moon', look: 'cratered', col: '#bdb9b0', host: '지구' },
    io: { name: '이오', kind: 'moon', look: 'io', col: '#e6cf6e', host: '목성' },
    europa: { name: '유로파', kind: 'moon', look: 'europa', col: '#e4dccb', host: '목성' },
    ganymede: { name: '가니메데', kind: 'moon', look: 'cratered', col: '#a99c8c', host: '목성' },
    callisto: { name: '칼리스토', kind: 'moon', look: 'cratered', col: '#7d7268', host: '목성' },
    ceres: { name: '세레스', kind: 'dwarf', look: 'cratered', col: '#9e9890' },
    pluto: { name: '명왕성', kind: 'dwarf', look: 'pluto', col: '#c9ae8f' },
    eris: { name: '에리스', kind: 'dwarf', look: 'cratered', col: '#dedcd8' },
    asteroid: { name: '소행성', kind: 'asteroid', look: 'rock', col: '#8d8174', seed: 5 },
    vesta: { name: '베스타', kind: 'asteroid', look: 'rock', col: '#9a8f82', seed: 9 },
    apophis: { name: '아포피스', kind: 'asteroid', look: 'rock', col: '#7f7468', seed: 13 },
    comet: { name: '혜성', kind: 'comet', look: 'comet' },
  };
  function cardLines(id) {
    const B = BODY[id];
    if (id === 'sun') return ['태양계의 중심에 있는 별이에요.', '스스로 빛을 내요.'];
    if (B.kind === 'planet') return ['태양에서 ' + B.n + '번째 행성이에요.', '태양 둘레를 도는 둥근 천체예요.'];
    if (id === 'moon') return ['지구 둘레를 도는 위성이에요.', '햇빛을 반사해서 밝게 보여요.'];
    if (id === 'europa') return ['목성 둘레를 도는 천체예요.', '표면이 얼음으로 덮여 있어요.'];
    if (B.kind === 'moon') return [B.host + ' 둘레를 도는 위성이에요.', '목성의 큰 위성 4개 중 하나예요.'];
    if (id === 'ceres') return ['태양 둘레를 도는 둥근 천체예요.', '소행성대에 있어 주변에 비슷한 천체가 많아요.'];
    if (B.kind === 'dwarf') return ['태양 둘레를 도는 둥근 천체예요.', '궤도 주변에 비슷한 천체가 많아요.'];
    if (id === 'apophis') return ['지름 약 340 m의 바위 덩어리예요.', '태양 둘레를 돌아요. 모양이 불규칙해요.'];
    if (B.kind === 'asteroid') return ['태양 둘레를 도는 작은 바위 천체예요.', '모양이 불규칙해요.'];
    if (B.kind === 'comet') return ['얼음과 먼지로 된 작은 천체예요.', '태양에 가까워지면 꼬리가 생겨요.'];
    return [];
  }

  const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  const PD = {
    mercury: { au: 0.39, size: 4.8, th0: 38 }, venus: { au: 0.72, size: 7.2, th0: 146 },
    earth: { au: 1.0, size: 7.6, th0: 228 }, mars: { au: 1.52, size: 5.8, th0: 312 },
    jupiter: { au: 5.2, size: 15, th0: 58 }, saturn: { au: 9.58, size: 12.5, th0: 168 },
    uranus: { au: 19.2, size: 9.4, th0: 262 }, neptune: { au: 30.1, size: 9.4, th0: 338 },
  };
  PLANETS.forEach((id) => { const p = PD[id]; p.rad = AU2R(p.au); p.w = TAU / (EARTH_T * Math.pow(p.au, 1.5)); });
  // 위성: 거리·주기는 보기 좋게 정한 모형 값 (정성적)
  const MOONS = [
    { id: 'moon', parent: 'earth', d: 14, size: 2.6, per: 2.6, th0: 40 },
    { id: 'io', parent: 'jupiter', d: 20, size: 2.0, per: 1.3, th0: 20 },
    { id: 'europa', parent: 'jupiter', d: 25, size: 1.9, per: 2.6, th0: 140 },
    { id: 'ganymede', parent: 'jupiter', d: 31, size: 2.5, per: 5.2, th0: 250 },
    { id: 'callisto', parent: 'jupiter', d: 38, size: 2.3, per: 12.2, th0: 320 },
  ];
  const DWARF_SIZE = { ceres: 2.9, pluto: 3.7, eris: 3.7 };

  /* 기울어진 타원 궤도 (태양이 한 초점). w: 근일점 방향, inc: 기울기, node: 교점 방향 (도) */
  function mkOrbit(rp, ra, w, inc, node, period, M0) {
    const a = (rp + ra) / 2, e = (ra - rp) / (ra + rp), b = a * Math.sqrt(1 - e * e);
    const cw = Math.cos(w * DEG), sw = Math.sin(w * DEG), ci = Math.cos(inc * DEG), si = Math.sin(inc * DEG);
    const cn = Math.cos(node * DEG), sn = Math.sin(node * DEG);
    const o = { a, e, b, rp, ra, n: TAU / period, M0: M0 || 0, pts: [] };
    o.at = function (E, out) {
      const px = a * (Math.cos(E) - e), py = b * Math.sin(E);
      const x1 = px * cw - py * sw, y1 = px * sw + py * cw;
      const y2 = y1 * ci;
      out.x = x1 * cn - y2 * sn; out.y = x1 * sn + y2 * cn; out.z = y1 * si;
      out.r = Math.hypot(px, py);
      return out;
    };
    const tmp = {};
    for (let i = 0; i <= 180; i++) { o.at(i / 180 * TAU, tmp); o.pts.push({ x: tmp.x, y: tmp.y, z: tmp.z }); }
    return o;
  }
  function kepler(M, e) {
    const k = Math.floor((M + Math.PI) / TAU);
    M -= k * TAU;
    let E = M + 0.85 * e * (Math.sin(M) >= 0 ? 1 : -1);
    for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    return E + k * TAU;
  }
  const ORB = {
    ceres: mkOrbit(AU2R(2.77), AU2R(2.77), 0, 0, 0, EARTH_T * 4.6, 105 * DEG),
    pluto: mkOrbit(AU2R(29.7), AU2R(49.3), 112, 17, 110, EARTH_T * 248, 0.55),
    eris: mkOrbit(AU2R(38.3), 742, 18, 44, 30, EARTH_T * 559, 2.1),
    comet: mkOrbit(62, 560, -12, 12, -20, 36, 0),
  };

  // 소행성대: 2.2~3.3 AU, 불규칙한 돌 350개 (안쪽이 조금 빠름)
  const ROCKS = [];
  const ROCK_COL = ['#776c60', '#9b8f80', '#c9bda9'];
  (function () {
    const r = rng(77);
    for (let i = 0; i < 350; i++) {
      const u = (r() + r() + r()) / 3;
      const rad = R_B0 + (R_B1 - R_B0) * u;
      const au = Math.pow((rad - 46) / 92, 2);
      const nv = 5 + Math.floor(r() * 3), vx = [], vy = [];
      for (let k = 0; k < nv; k++) { const a = k / nv * TAU, f = 0.6 + r() * 0.4; vx.push(Math.cos(a) * f); vy.push(Math.sin(a) * f); }
      ROCKS.push({ rad, th0: r() * TAU, w: TAU / (EARTH_T * Math.pow(au, 1.5)), size: 0.7 + Math.pow(r(), 2.4) * 2.1, b: Math.min(2, Math.floor(r() * 3)), vx, vy, rot: r() * TAU, spin: (r() - 0.5) * 1.6 });
    }
  })();
  // 큰 바위 모양 (소행성 카드용)
  const ROCK_SHAPES = {};
  function rockShape(seed) {
    if (ROCK_SHAPES[seed]) return ROCK_SHAPES[seed];
    const r = rng(seed * 31 + 7), n = 22, f = [];
    let prev = 0.86;
    for (let i = 0; i < n; i++) { prev = clamp(prev + (r() - 0.5) * 0.22, 0.68, 1); f.push(prev); }
    f[n - 1] = (f[n - 1] + f[0]) / 2;
    const cr = [];
    for (let i = 0; i < 6; i++) cr.push([(r() - 0.5) * 1.1, (r() - 0.5) * 1.1, 0.08 + r() * 0.14]);
    return (ROCK_SHAPES[seed] = { f, cr });
  }

  /* =========================================================
     상태 · 카메라
     ========================================================= */
  const S = {
    scene: 'map', view: 'inner', panel: 'card', playing: false, time: 0,
    card: null, cardA: { s: 1, a: 1 }, kinds: new Set(), opened: new Set(), selRock: -1,
    keyA: 0, keyMsg: null, flash: null, chips: [], hoverBasket: null,
    lens: null, lensInfo: null, beltFound: false, beltTried: 0,
    cE: 2.2, cDrag: false, cTouched: false, peri: false, outAgain: false,
    subject: null, apophis: false, mapHint: true, panelT: 1,
  };
  let lastPanelKey = null;
  const cSpring = new SciSim.Spring(S.cE, { stiffness: 196, damping: 28 });
  let cSpringActive = false;
  const CAM = { x: 0, y: 0, z: 0.92 };
  const POS = { sun: { x: 0, y: 0, z: 0 } };
  [...PLANETS, 'ceres', 'pluto', 'eris', 'comet', 'apophis'].forEach((id) => { POS[id] = { x: 0, y: 0, z: 0, r: 0 }; });

  let FEAT = new Set();
  const on = (f) => FEAT.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);

  function cometBox() {
    let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
    ORB.comet.pts.forEach((p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }
  const CB = cometBox();
  function presetFor(v) {
    if (v === 'full') return { x: 0, y: 0, z: 0.352 };
    if (v === 'comet') { const L = activeView().L, M = L.main; return { x: CB.cx, y: CB.cy, z: Math.min((M.w - 120) / CB.w, (M.h - 130) / CB.h) / L.zs }; }
    if (v === 'jupiter' || v === 'earth') { const p = POS[v]; return { x: p.x + (v === 'earth' ? 14 : 0), y: p.y - (v === 'earth' ? 6 : 0), z: v === 'jupiter' ? 3.1 : 2.3 }; }
    return { x: 0, y: 0, z: 0.92 };
  }
  function setView(v, instant) {
    computePositions();
    S.view = v;
    const p = presetFor(v);
    if (instant || RM) Object.assign(CAM, p);
    else SciSim.tween(CAM, p, { duration: 0.8, ease: 'inOutCubic' });
    syncControls();
  }

  function computePositions() {
    for (const id of PLANETS) {
      const p = PD[id], th = p.th0 * DEG + S.time * p.w;
      POS[id].x = p.rad * Math.cos(th); POS[id].y = p.rad * Math.sin(th);
    }
    ['ceres', 'pluto', 'eris'].forEach((id) => { const o = ORB[id]; o.at(kepler(o.M0 + o.n * S.time, o.e), POS[id]); });
    ORB.comet.at(S.cE, POS.comet);
    const e = POS.earth;
    POS.apophis.x = e.x + 34; POS.apophis.y = e.y - 15;
  }

  /* =========================================================
     화면 배치: wide(태블릿) 800×600 / tall(휴대폰) 520×846
     ========================================================= */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 600, fs: 1, col: true, main: { x: 0, y: 0, w: 552, h: 600 }, panel: { x: 560, y: 8, w: 232, h: 584 },
      tok: { w: 196, h: 46, mw: 86, mh: 28, font: 15, mfont: 13, ir: 14, mir: 8 } },
    tall: { key: 'tall', vw: 520, vh: 846, fs: 1.2, col: false, main: { x: 0, y: 0, w: 520, h: 548 }, panel: { x: 8, y: 556, w: 504, h: 282 },
      tok: { w: 152, h: 52, mw: 84, mh: 30, font: 16, mfont: 13.5, ir: 15, mir: 8 } },
  };
  Object.keys(LAYOUTS).forEach((k) => {
    const L = LAYOUTS[k], M = L.main;
    L.mcx = M.x + M.w / 2; L.mcy = M.y + M.h / 2; L.zs = Math.min(M.w, M.h) / 548;
  });
  function xfMain(L) {
    const s = CAM.z * L.zs;
    return { s, k: Math.pow(CAM.z / 0.92, 0.55) * L.zs, ox: L.mcx - CAM.x * s, oy: L.mcy + CAM.y * s };
  }
  const SX = (X, p) => X.ox + p.x * X.s;
  const SY = (X, p) => X.oy - p.y * X.s;
  function moonScreen(X, m, out) {
    const P = POS[m.parent], th = m.th0 * DEG + TAU * S.time / m.per;
    out.x = SX(X, P) + m.d * X.k * Math.cos(th); out.y = SY(X, P) - m.d * X.k * Math.sin(th);
    return out;
  }

  /* =========================================================
     천체 그리기
     ========================================================= */
  function drawSun(ctx, x, y, r, t, glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * (glow || 3.4));
    g.addColorStop(0, 'rgba(255,200,96,0.55)'); g.addColorStop(0.3, 'rgba(255,160,64,0.2)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; circle(ctx, x, y, r * (glow || 3.4)); ctx.fill();
    if (!RM) {
      ctx.globalAlpha = 0.16;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + t * 0.05, len = r * (1.9 + 0.5 * Math.sin(t * 0.9 + i * 1.7));
        const rg = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
        rg.addColorStop(0, 'rgba(255,220,140,1)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a + 0.09) * r, y + Math.sin(a + 0.09) * r);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.lineTo(x + Math.cos(a - 0.09) * r, y + Math.sin(a - 0.09) * r);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 가장자리가 3초 주기로 일렁이는 몸체
    const amp = RM ? 0 : 1.5 * Math.min(2.2, r / SUN_R), ph = t * TAU / 3;
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = i / 72 * TAU;
      const rr = r + amp * (0.55 * Math.sin(3 * a + ph) + 0.3 * Math.sin(5 * a - ph * 1.3 + 1) + 0.15 * Math.sin(9 * a + ph * 0.7 + 2));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    const bg = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, r * 0.05, x, y, r * 1.05);
    bg.addColorStop(0, '#fff7d6'); bg.addColorStop(0.55, '#ffcf5a'); bg.addColorStop(1, '#ff9a2e');
    ctx.fillStyle = bg; ctx.fill();
    if (r > 16 && !RM) {
      // 은은한 표면 얼룩
      ctx.save(); ctx.clip();
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4 + t * 0.12 * (i % 2 ? 1 : -1), d = r * (0.25 + 0.5 * ((i * 0.37) % 1));
        const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d, br = r * (0.18 + 0.06 * Math.sin(t + i));
        const sg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        sg.addColorStop(0, '#fffbe8'); sg.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = sg; circle(ctx, bx, by, br); ctx.fill();
      }
      ctx.restore();
    }
  }

  // 태양 반대쪽 반을 어둡게 (원 안에서 호출, ux·uy = 태양 쪽 단위 벡터)
  function nightShade(ctx, x, y, r, ux, uy, k) {
    const g = ctx.createLinearGradient(x + ux * r * 0.18, y + uy * r * 0.18, x - ux * r, y - uy * r);
    g.addColorStop(0, 'rgba(2,5,16,0)');
    g.addColorStop(0.32, 'rgba(2,5,16,' + (0.78 * k) + ')');
    g.addColorStop(1, 'rgba(2,5,16,' + (0.93 * k) + ')');
    ctx.fillStyle = g; ctx.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);
  }
  // 경도·위도로 표면 무늬 배치 (spin: 자전 각)
  function blob(ctx, x, y, r, lon, lat, w, h, col, spin) {
    const L = lon + spin, c = Math.cos(L);
    if (c < -0.1) return;
    const px = x + r * Math.sin(L) * Math.cos(lat), py = y - r * Math.sin(lat);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(px, py, Math.max(0.3, w * r * Math.max(0.12, c)), h * r * Math.cos(lat * 0.8), 0, 0, TAU); ctx.fill();
  }
  const CRATERS = [[0.6, 0.35, 0.16], [2.2, -0.4, 0.12], [3.6, 0.15, 0.2], [4.9, 0.55, 0.1], [1.4, -0.7, 0.11], [5.6, -0.2, 0.14], [0.2, -0.15, 0.09], [2.9, 0.7, 0.08]];
  function surface(ctx, x, y, r, B, t, spin) {
    const look = B.look;
    if (look === 'jupiter' || look === 'saturn') {
      const bands = look === 'jupiter'
        ? [[-0.72, 0.1, '#b98a62'], [-0.45, 0.13, '#f0dbbd'], [-0.2, 0.14, '#c08a5c'], [0.08, 0.12, '#f3e1c4'], [0.3, 0.15, '#b9845a'], [0.56, 0.11, '#ead2b0'], [0.78, 0.1, '#c49a74']]
        : [[-0.6, 0.18, '#d2b67c'], [-0.25, 0.16, '#f0dcae'], [0.1, 0.2, '#d8bd84'], [0.45, 0.16, '#eedaa8']];
      bands.forEach((b) => { ctx.fillStyle = b[2]; ctx.globalAlpha = 0.75; ctx.fillRect(x - r, y + b[0] * r - b[1] * r / 2, r * 2, b[1] * r); });
      ctx.globalAlpha = 1;
      if (look === 'jupiter') blob(ctx, x, y, r, 0.5, -0.38, 0.24, 0.12, '#c4553a', spin);
    } else if (look === 'earth') {
      ['#3f9d5a', '#5aae5f', '#a88a55'].forEach((col, i) => {
        [[0.3, 0.45, 0.32, 0.22], [2.1, -0.2, 0.28, 0.3], [3.8, 0.35, 0.36, 0.2], [5.2, -0.5, 0.22, 0.16]].forEach((c, j) => {
          if ((i + j) % 3 === 0 || i === 0) blob(ctx, x, y, r, c[0] + i * 0.12, c[1], c[2] * (1 - i * 0.25), c[3] * (1 - i * 0.25), col, spin);
        });
      });
      ctx.globalAlpha = 0.75;
      [[1.0, 0.15, 0.5, 0.06], [2.8, -0.5, 0.4, 0.05], [4.4, 0.6, 0.45, 0.05], [5.8, -0.05, 0.35, 0.06]].forEach((c) => blob(ctx, x, y, r, c[0], c[1], c[2], c[3], '#f4f8ff', spin * 1.15));
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(245,250,255,.85)';
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.93, r * 0.45, r * 0.16, 0, 0, TAU); ctx.fill();
    } else if (look === 'mars') {
      [[0.4, 0.1, 0.35, 0.16], [2.4, -0.25, 0.3, 0.14], [4.3, 0.2, 0.4, 0.12]].forEach((c) => blob(ctx, x, y, r, c[0], c[1], c[2], c[3], 'rgba(110,40,20,.45)', spin));
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.9, r * 0.38, r * 0.15, 0, 0, TAU); ctx.fill();
    } else if (look === 'venus') {
      ctx.globalAlpha = 0.45;
      [[-0.45, '#fff0c8'], [0.0, '#d9ad62'], [0.42, '#fff0c8']].forEach((b, i) => {
        ctx.fillStyle = b[1]; ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 0.2 + i) * r * 0.1, y + b[0] * r, r * 1.1, r * 0.16, 0.15, 0, TAU); ctx.fill();
      });
      ctx.globalAlpha = 1;
    } else if (look === 'ice' || look === 'neptune') {
      ctx.globalAlpha = 0.18;
      [-0.45, 0, 0.45].forEach((b) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r, y + b * r - r * 0.06, r * 2, r * 0.12); });
      ctx.globalAlpha = 1;
      if (look === 'neptune') blob(ctx, x, y, r, 0.9, -0.3, 0.2, 0.1, 'rgba(20,30,90,.55)', spin);
    } else if (look === 'io') {
      [[0.3, 0.2, 0.18, 0.14, '#c96a2a'], [2.0, -0.3, 0.16, 0.12, '#8a4a20'], [3.9, 0.4, 0.2, 0.12, '#f4ecc4'], [5.0, -0.1, 0.14, 0.1, '#b0552a']].forEach((c) => blob(ctx, x, y, r, c[0], c[1], c[2], c[3], c[4], spin));
    } else if (look === 'europa') {
      ctx.strokeStyle = 'rgba(150,90,50,.55)'; ctx.lineWidth = Math.max(0.6, r * 0.05);
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x - r, y + (i - 2) * r * 0.38 - r * 0.2);
        ctx.bezierCurveTo(x - r * 0.3, y + (i - 2) * r * 0.3 + r * 0.25, x + r * 0.3, y + (i - 2) * r * 0.42 - r * 0.25, x + r, y + (i - 2) * r * 0.36 + r * 0.1);
        ctx.stroke();
      }
    } else if (look === 'pluto') {
      blob(ctx, x, y, r, 0.35, -0.15, 0.42, 0.36, 'rgba(250,240,225,.75)', spin);
      blob(ctx, x, y, r, 2.6, 0.2, 0.4, 0.2, 'rgba(110,70,50,.45)', spin);
    }
    if (look === 'cratered' || look === 'io' || look === 'europa' || look === 'pluto') {
      if (r > 6 && look !== 'europa') CRATERS.forEach((c) => blob(ctx, x, y, r, c[0], c[1], c[2] * 0.8, c[2] * 0.8, 'rgba(40,32,24,.24)', spin));
    }
  }
  function planetBody(ctx, x, y, r, B, ux, uy, t, o) {
    o = o || {};
    if (r < 1.3) { ctx.fillStyle = B.col; circle(ctx, x, y, Math.max(0.8, r)); ctx.fill(); return; }
    if (r > 3 && o.shadow !== false) {
      const sg = ctx.createRadialGradient(x, y + r * 0.6, r * 0.2, x, y + r * 0.6, r * 1.3);
      sg.addColorStop(0, 'rgba(0,0,0,.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r * 1.3, r * 0.7, 0, 0, TAU); ctx.fill();
    }
    if (B.atmo && r > 2.5) {
      const ag = ctx.createRadialGradient(x + ux * r * 0.2, y + uy * r * 0.2, r * 0.9, x, y, r * 1.5);
      ag.addColorStop(0, SciSim.color.rgba(B.atmo, 0.42)); ag.addColorStop(1, SciSim.color.rgba(B.atmo, 0));
      ctx.fillStyle = ag; circle(ctx, x, y, r * 1.5); ctx.fill();
    }
    const g = ctx.createRadialGradient(x + ux * r * 0.38, y + uy * r * 0.38, r * 0.06, x, y, r * 1.05);
    g.addColorStop(0, shade(B.col, 0.42)); g.addColorStop(0.55, B.col); g.addColorStop(1, shade(B.col, -0.42));
    ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    if (r >= 4.5) surface(ctx, x, y, r, B, t, o.spin || 0);
    nightShade(ctx, x, y, r, ux, uy, o.night != null ? o.night : 1);
    ctx.restore();
    if (r > 4) {
      // 햇빛 쪽 가장자리 빛과 반사광
      const a = Math.atan2(uy, ux);
      ctx.strokeStyle = 'rgba(255,244,214,.55)'; ctx.lineWidth = Math.max(0.8, r * 0.07);
      ctx.beginPath(); ctx.arc(x, y, r - ctx.lineWidth / 2, a - 1.1, a + 1.1); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      ctx.beginPath(); ctx.ellipse(x + ux * r * 0.42, y + uy * r * 0.42, r * 0.26, r * 0.15, a + Math.PI / 2, 0, TAU); ctx.fill();
    }
  }
  // 토성 고리: 뒤쪽 반(front=false)은 행성보다 먼저, 앞쪽 반은 나중에 그림
  function saturnRing(ctx, x, y, r, front, alpha) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.36); ctx.scale(1, 0.36);
    const r0 = r * 1.3, r1 = r * 2.25;
    ctx.beginPath();
    if (front) { ctx.arc(0, 0, r1, 0, Math.PI); ctx.arc(0, 0, r0, Math.PI, 0, true); }
    else { ctx.arc(0, 0, r1, Math.PI, TAU); ctx.arc(0, 0, r0, TAU, Math.PI, true); }
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
    g.addColorStop(0, 'rgba(190,170,130,' + 0.55 * alpha + ')'); g.addColorStop(0.35, 'rgba(236,218,170,' + 0.9 * alpha + ')');
    g.addColorStop(0.62, 'rgba(226,204,150,' + 0.85 * alpha + ')'); g.addColorStop(0.66, 'rgba(60,45,30,' + 0.5 * alpha + ')');
    g.addColorStop(0.7, 'rgba(214,192,140,' + 0.8 * alpha + ')'); g.addColorStop(1, 'rgba(200,180,130,' + 0.45 * alpha + ')');
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  }
  function drawRock(ctx, x, y, r, B, ux, uy, t, o) {
    const sh = rockShape(B.seed), n = sh.f.length, rot = B.seed + (o && o.spin ? t * 0.35 : 0);
    ctx.save();
    if (r > 6) {
      const sg = ctx.createRadialGradient(x, y + r * 0.6, r * 0.2, x, y + r * 0.6, r * 1.3);
      sg.addColorStop(0, 'rgba(0,0,0,.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r * 1.3, r * 0.7, 0, 0, TAU); ctx.fill();
    }
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i % n) / n * TAU + rot, rr = r * sh.f[i % n] * (i % 2 ? 1 : 0.97);
      const px = x + Math.cos(a) * rr * 1.08, py = y + Math.sin(a) * rr * 0.86;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(x + ux * r * 0.4, y + uy * r * 0.4, r * 0.05, x, y, r * 1.1);
    g.addColorStop(0, shade(B.col, 0.38)); g.addColorStop(0.55, B.col); g.addColorStop(1, shade(B.col, -0.5));
    ctx.fillStyle = g; ctx.fill();
    ctx.clip();
    if (r > 7) {
      sh.cr.forEach((c) => {
        const ca = Math.atan2(c[1], c[0]) + rot - B.seed, cd = Math.hypot(c[0], c[1]) * r * 0.85;
        const cx2 = x + Math.cos(ca) * cd, cy2 = y + Math.sin(ca) * cd * 0.85, cr = c[2] * r;
        ctx.fillStyle = 'rgba(30,24,18,.35)'; circle(ctx, cx2, cy2, cr); ctx.fill();
        ctx.strokeStyle = 'rgba(255,240,220,.22)'; ctx.lineWidth = Math.max(0.6, cr * 0.25);
        ctx.beginPath(); ctx.arc(cx2, cy2, cr, Math.atan2(uy, ux) - 1, Math.atan2(uy, ux) + 1); ctx.stroke();
      });
    }
    nightShade(ctx, x, y, r * 1.1, ux, uy, 0.95);
    ctx.restore();
  }
  // 부드러운 빛 덩어리 스프라이트 (혜성 코마·꼬리용, 한 번만 만들어 재사용)
  let GLOW_SPR = null;
  function glowSprite() {
    if (GLOW_SPR) return GLOW_SPR;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(226,242,255,1)'); gr.addColorStop(0.3, 'rgba(190,224,255,.62)'); gr.addColorStop(0.7, 'rgba(160,205,255,.16)'); gr.addColorStop(1, 'rgba(150,200,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (GLOW_SPR = c);
  }
  // 혜성: 핵 + 코마 + 꼬리 (tx, ty = 꼬리 방향 = 태양 반대쪽). 꼬리는 겹친 빛 덩어리로 부드럽게 퍼지며 끝으로 갈수록 옅어져요.
  function drawComet(ctx, x, y, nucR, comaR, tailLen, tx, ty, t) {
    const px = -ty, py = tx, spr = glowSprite();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (tailLen > 2) {
      const N = 26;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1), d = tailLen * Math.pow(u, 1.12);
        const sway = RM ? 0 : Math.sin(t * 1.2 - u * 3.4) * tailLen * 0.05 * u;
        const rr = comaR * 0.7 + tailLen * 0.17 * Math.pow(u, 0.78);
        ctx.globalAlpha = 0.2 * Math.pow(1 - u, 1.45) + 0.012;
        ctx.drawImage(spr, x + tx * d + px * sway - rr, y + ty * d + py * sway - rr, rr * 2, rr * 2);
      }
      // 밝은 중심 줄기
      const M = 12;
      for (let i = 0; i < M; i++) {
        const u = i / (M - 1), d = tailLen * 0.72 * u, rr = comaR * 0.5 + tailLen * 0.05 * u;
        ctx.globalAlpha = 0.34 * Math.pow(1 - u, 1.2);
        ctx.drawImage(spr, x + tx * d - rr, y + ty * d - rr, rr * 2, rr * 2);
      }
    }
    if (comaR > nucR * 1.2) {
      ctx.globalAlpha = 0.85; const cr = comaR * 2.1;
      ctx.drawImage(spr, x - cr, y - cr, cr * 2, cr * 2);
    }
    ctx.restore();
    ctx.fillStyle = '#eef3fb'; circle(ctx, x, y, nucR); ctx.fill();
    ctx.fillStyle = 'rgba(70,82,105,.55)'; circle(ctx, x - tx * nucR * 0.3 + px * nucR * 0.2, y - ty * nucR * 0.3 + py * nucR * 0.2, nucR * 0.5); ctx.fill();
  }
  // 카드·토큰용 천체 하나 그리기 (ux, uy = 태양 쪽)
  function drawBody(ctx, id, x, y, r, ux, uy, t, o) {
    o = o || {};
    const B = BODY[id];
    if (!B) return;
    if (B.look === 'sun') { drawSun(ctx, x, y, r, t, o.glow || 2.2); return; }
    if (B.look === 'rock') { drawRock(ctx, x, y, r, B, ux, uy, t, o); return; }
    if (B.look === 'comet') {
      const tl = r * (o.tail != null ? o.tail : 2.6);
      drawComet(ctx, x - ux * 0 , y, r * 0.16, r * 0.5, tl, -ux, -uy, t);
      return;
    }
    if (B.ring) saturnRing(ctx, x, y, r, false, 1);
    planetBody(ctx, x, y, r, B, ux, uy, t, o);
    if (B.ring) saturnRing(ctx, x, y, r, true, 1);
  }

  /* =========================================================
     지도 그리기
     ========================================================= */
  const tmpP = { x: 0, y: 0 };
  function cometActivity(r) {
    // 꼬리 길이 ∝ 1/r² (목성 궤도 밖에서는 0)
    const r1 = 112, f = (1 / (r * r) - 1 / (R_JUP * R_JUP)) / (1 / (r1 * r1) - 1 / (R_JUP * R_JUP));
    return clamp(f, 0, 1);
  }
  function drawOrbitPts(ctx, X, pts, colFront, colBack, lw) {
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], ok = pass === 0 ? p.z >= 0 : p.z < 0;
        if (ok) { const sx = SX(X, p), sy = SY(X, p); if (pen) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); pen = true; } }
        else pen = false;
      }
      ctx.strokeStyle = pass === 0 ? colFront : colBack; ctx.lineWidth = lw;
      ctx.setLineDash(pass === 0 ? [5, 5] : [2, 6]); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  function drawBelt(ctx, X, t, M, lens) {
    const cx = X.ox, cy = X.oy, r0 = R_B0 * X.s, r1 = R_B1 * X.s;
    const glow = S.beltFound || (game && game.free) || S.beltHint ? 1 : 0;
    const g = ctx.createRadialGradient(cx, cy, r0 * 0.95, cx, cy, r1 * 1.05);
    const a = lens ? 0.05 : 0.07 + 0.08 * glow;
    g.addColorStop(0, 'rgba(200,180,150,0)'); g.addColorStop(0.5, 'rgba(200,180,150,' + a + ')'); g.addColorStop(1, 'rgba(200,180,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r1 * 1.05, 0, TAU); ctx.arc(cx, cy, r0 * 0.95, 0, TAU, true); ctx.fill();
    if (S.beltHint && !lens) {
      ctx.strokeStyle = 'rgba(52,211,153,' + (0.35 + 0.35 * pulse()) + ')'; ctx.lineWidth = (r1 - r0) * 0.9;
      circle(ctx, cx, cy, (r0 + r1) / 2); ctx.stroke();
    }
    const kk = lens ? X.k : X.k;
    const x0 = M.x - 8, x1 = M.x + M.w + 8, y0 = M.y - 8, y1 = M.y + M.h + 8;
    for (let b = 0; b < 3; b++) {
      ctx.beginPath();
      for (let i = 0; i < ROCKS.length; i++) {
        const R = ROCKS[i];
        if (R.b !== b) continue;
        const th = R.th0 + R.w * S.time;
        const x = cx + Math.cos(th) * R.rad * X.s, y = cy - Math.sin(th) * R.rad * X.s;
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        const sz = R.size * kk, rot = R.rot + (RM ? 0 : R.spin * t * 0.3), cr = Math.cos(rot), sr = Math.sin(rot);
        if (sz < 1.1) { ctx.rect(x - sz * 0.7, y - sz * 0.7, sz * 1.4, sz * 1.4); continue; }
        for (let k = 0; k < R.vx.length; k++) {
          const vx = R.vx[k] * sz, vy = R.vy[k] * sz;
          const px = x + vx * cr - vy * sr, py = y + vx * sr + vy * cr;
          if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
      }
      ctx.fillStyle = ROCK_COL[b]; ctx.fill();
    }
  }
  function sunDir(X, x, y) { const dx = X.ox - x, dy = X.oy - y, d = Math.hypot(dx, dy) || 1; return { ux: dx / d, uy: dy / d, d }; }
  function drawMapBodies(ctx, L, X, t, V, lens) {
    const M = L.main;
    // 혜성
    const cp = POS.comet, cx = SX(X, cp), cy = SY(X, cp);
    const f = cometActivity(Math.hypot(cp.x, cp.y, cp.z));
    const cd = sunDir(X, cx, cy);
    const tailLen = 160 * f * Math.min(1.25, Math.pow(X.s / 0.9, 0.55));
    if (cx > M.x - tailLen - 30 && cx < M.x + M.w + tailLen + 30 && cy > M.y - tailLen - 30 && cy < M.y + M.h + tailLen + 30) {
      if (!lens) drawDust(ctx, V, cx, cy, -cd.ux, -cd.uy, tailLen, t);
      drawComet(ctx, cx, cy, Math.max(2.4, 2.4 * X.k), Math.max(3.6, (2 + 8 * f) * X.k), tailLen, -cd.ux, -cd.uy, t);
    }
    // 태양
    drawSun(ctx, X.ox, X.oy, SUN_R * X.k, t);
    // 행성
    for (const id of PLANETS) {
      const p = POS[id], x = SX(X, p), y = SY(X, p), r = PD[id].size * X.k, B = BODY[id];
      if (x < M.x - 60 || x > M.x + M.w + 60 || y < M.y - 60 || y > M.y + M.h + 60) continue;
      const u = sunDir(X, x, y);
      if (B.ring) saturnRing(ctx, x, y, r, false, 1);
      planetBody(ctx, x, y, r, B, u.ux, u.uy, t);
      if (B.ring) saturnRing(ctx, x, y, r, true, 1);
    }
    // 위성
    const k = X.k;
    MOONS.forEach((m) => {
      const P = POS[m.parent], px = SX(X, P), py = SY(X, P);
      if (m.d * k > 13) {
        ctx.strokeStyle = 'rgba(170,190,240,.18)'; ctx.lineWidth = 1;
        circle(ctx, px, py, m.d * k); ctx.stroke();
      }
      moonScreen(X, m, tmpP);
      const u = sunDir(X, tmpP.x, tmpP.y);
      planetBody(ctx, tmpP.x, tmpP.y, m.size * k, BODY[m.id], u.ux, u.uy, t, { shadow: false });
    });
    // 왜소행성
    ['ceres', 'pluto', 'eris'].forEach((id) => {
      const p = POS[id], x = SX(X, p), y = SY(X, p);
      const u = sunDir(X, x, y);
      planetBody(ctx, x, y, DWARF_SIZE[id] * k, BODY[id], u.ux, u.uy, t, { shadow: false });
    });
    if (S.apophis) {
      const p = POS.apophis, x = SX(X, p), y = SY(X, p), u = sunDir(X, x, y);
      drawRock(ctx, x, y, 2.6 * k, BODY.apophis, u.ux, u.uy, t, {});
    }
  }
  // 혜성 꼬리 끝의 먼지 입자 (혜성에 붙은 좌표로 저장)
  function drawDust(ctx, V, x, y, tx, ty, tailLen, t) {
    if (tailLen < 6) return;
    const px = -ty, py = tx;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    V.dust.forEach((d) => {
      const a = Math.max(0, 1 - d.age / d.life) * 0.8;
      const dd = d.d * tailLen, ss = d.s * tailLen * 0.3;
      ctx.globalAlpha = a; ctx.fillStyle = '#e6f2ff';
      circle(ctx, x + tx * dd + px * ss, y + ty * dd + py * ss, d.size); ctx.fill();
    });
    ctx.restore();
  }
  function updateDust(V, dt, f) {
    const rate = (RM ? 10 : 46) * f;
    V.dustAcc = (V.dustAcc || 0) + rate * dt;
    while (V.dustAcc > 1) {
      V.dustAcc -= 1;
      V.dust.push({ d: 0.35 + Math.random() * 0.6, s: (Math.random() - 0.5) * 0.9, vd: 0.12 + Math.random() * 0.2, vs: (Math.random() - 0.5) * 0.25, age: 0, life: 0.8 + Math.random() * 0.9, size: 0.6 + Math.random() * 1.1 });
    }
    for (let i = V.dust.length - 1; i >= 0; i--) {
      const d = V.dust[i];
      d.age += dt; d.d += d.vd * dt; d.s += d.vs * dt;
      if (d.age >= d.life || d.d > 1.3) V.dust.splice(i, 1);
    }
    if (V.dust.length > 120) V.dust.splice(0, V.dust.length - 120);
  }

  function drawMap(ctx, L, t, V) {
    const M = L.main, X = xfMain(L), fs = L.fs;
    ctx.save();
    ctx.beginPath(); ctx.rect(M.x, M.y, M.w, M.h); ctx.clip();
    spaceBg(ctx, M, L.mcx, L.mcy, Math.max(M.w, M.h) * 0.75);
    drawStars(ctx, L.starsMain, t, 1);
    // 궤도
    ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(160,190,255,.3)'; ctx.lineWidth = 1.2;
    PLANETS.forEach((id) => { circle(ctx, X.ox, X.oy, PD[id].rad * X.s); ctx.stroke(); });
    ctx.setLineDash([]);
    drawOrbitPts(ctx, X, ORB.pluto.pts, 'rgba(206,176,255,.5)', 'rgba(206,176,255,.22)', 1.3);
    drawOrbitPts(ctx, X, ORB.eris.pts, 'rgba(206,176,255,.5)', 'rgba(206,176,255,.22)', 1.3);
    const cometHi = S.panel === 'comet' || (S.view === 'comet');
    drawOrbitPts(ctx, X, ORB.comet.pts, cometHi ? 'rgba(150,226,255,.75)' : 'rgba(150,226,255,.3)', cometHi ? 'rgba(150,226,255,.4)' : 'rgba(150,226,255,.16)', cometHi ? 1.8 : 1.2);
    if (S.panel === 'comet') {
      // 목성 궤도 강조 + 근일점 표시
      ctx.strokeStyle = 'rgba(251,146,60,.55)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      circle(ctx, X.ox, X.oy, R_JUP * X.s); ctx.stroke(); ctx.setLineDash([]);
    }
    drawBelt(ctx, X, t, M, false);
    drawMapBodies(ctx, L, X, t, V, false);
    if (S.lens && S.panel === 'lens') {
      const lg = lensGeo(L), fr = lg.r / 4, lx = SX(X, S.lens), ly = SY(X, S.lens);
      ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      circle(ctx, lx, ly, fr); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#5eead4'; circle(ctx, lx, ly, 2.2); ctx.fill();
    }
    drawLabels(ctx, L, X, t);
    drawSelection(ctx, L, X, t);
    drawFx(ctx, V);

    // 제목·안내
    ctx.textAlign = 'left'; ctx.fillStyle = '#e3ebff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('🪐 위에서 내려다본 태양계', M.x + 14, M.y + 26 * fs);
    ctx.font = fnt(L, 13); ctx.fillStyle = 'rgba(212,226,255,.7)';
    ctx.fillText('크기와 거리는 실제와 달라요', M.x + 14, M.y + 46 * fs);
    const vname = { inner: '안쪽 태양계', full: '전체 태양계', comet: '혜성 궤도', jupiter: '목성 둘레', earth: '지구 둘레' }[S.view] || '';
    if (vname) pill(ctx, '🔭 ' + vname, M.x + M.w - 12, M.y + 22 * fs, { align: 'right', font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), bg: 'rgba(14,165,233,.22)', stroke: 'rgba(125,211,252,.55)', color: '#cfefff' });
    // 공전 방향
    const by = M.y + M.h - 12 - 8 * fs;
    ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(190,210,255,.8)';
    const lg2 = '공전 방향 (시계 반대 방향)', lw = ctx.measureText(lg2).width, ir = 5.5 * fs;
    ctx.fillText(lg2, M.x + M.w - 12, by + 4.5 * fs);
    const ix = M.x + M.w - 12 - lw - ir - 8, iy = by;
    const a1 = 0.4 * Math.PI, a2 = a1 - 1.55 * Math.PI;
    ctx.strokeStyle = 'rgba(190,210,255,.8)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(ix, iy, ir, a1, a2, true); ctx.stroke();
    const ex = ix + ir * Math.cos(a2), ey = iy + ir * Math.sin(a2), tx = Math.sin(a2), ty = -Math.cos(a2), hs = 3.6 * fs;
    ctx.fillStyle = 'rgba(190,210,255,.8)';
    ctx.beginPath(); ctx.moveTo(ex + tx * hs, ey + ty * hs); ctx.lineTo(ex - tx * hs * 0.6 - ty * hs, ey - ty * hs * 0.6 + tx * hs); ctx.lineTo(ex - tx * hs * 0.6 + ty * hs, ey - ty * hs * 0.6 - tx * hs); ctx.closePath(); ctx.fill();

    // 첫 안내
    if (S.mapHint && S.scene === 'map' && S.panel === 'card' && on('cards') && game && !game.free && game.level === 0) {
      const txt = '👆 천체를 눌러 카드를 모아 보세요', o = { font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: 'rgba(14,165,233,.94)' };
      pill(ctx, txt, L.mcx, M.y + M.h - 44 * fs, o);
    }
    if (S.panel === 'lens' && !S.beltFound && !S.lens) {
      const txt = '👆 소행성이 가장 많이 모인 곳을 눌러 보세요', o = { font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: 'rgba(14,165,233,.94)' };
      pill(ctx, txt, L.mcx, M.y + M.h - 44 * fs, o);
    }
    if (S.panel === 'comet' && on('comet')) {
      const cp = POS.comet, x = SX(X, cp), y = SY(X, cp);
      if (!S.cTouched || S.cDrag) {
        const rr = 15 + (S.cDrag ? 4 : 2 * Math.sin(t * 4));
        ctx.setLineDash(S.cDrag ? [] : [4, 4]); ctx.strokeStyle = S.cDrag ? 'rgba(94,234,212,.9)' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
        circle(ctx, x, y, rr); ctx.stroke(); ctx.setLineDash([]);
      }
      if (!S.cTouched) {
        const txt = '👆 혜성을 끌어 보세요', o = { font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: 'rgba(14,165,233,.94)' };
        const w = pillWidth(ctx, txt, o);
        pill(ctx, txt, clamp(x, M.x + w / 2 + 8, M.x + M.w - w / 2 - 8), clamp(y + 40 * fs, M.y + 70, M.y + M.h - 30), o);
      }
      // 근일점 표시
      const pp = {}; ORB.comet.at(0, pp);
      {
        const po = { font: fnt(L, 13, 'bold'), h: Math.round(20 * fs), bg: 'rgba(10,16,40,.86)', color: '#bfefff', stroke: 'rgba(150,226,255,.45)' };
        const pw = pillWidth(ctx, '근일점', po), ppx = SX(X, pp), ppy = SY(X, pp);
        const dx = ppx - X.ox, dy = ppy - X.oy, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
        // 근일점 표시점 + 태양 바깥쪽으로 알약
        ctx.strokeStyle = 'rgba(150,226,255,.9)'; ctx.lineWidth = 2; circle(ctx, ppx, ppy, 5 + 1.5 * Math.sin(t * 4)); ctx.stroke();
        const lx = clamp(ppx + ux * (26 + pw / 2 * Math.abs(ux)), M.x + pw / 2 + 6, M.x + M.w - pw / 2 - 6), ly = clamp(ppy + uy * 26 + 6, M.y + 60, M.y + M.h - 44);
        pill(ctx, '근일점', lx, ly, po);
      }
      ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = '#fdba74'; ctx.textAlign = 'center';
      const ja = -2.25, jx = X.ox + Math.cos(ja) * R_JUP * X.s, jy = X.oy - Math.sin(ja) * R_JUP * X.s;
      pill(ctx, '목성 궤도', jx, jy, { font: fnt(L, 13, 'bold'), h: Math.round(20 * fs), bg: 'rgba(40,20,6,.85)', color: '#fdba74', stroke: 'rgba(251,146,60,.5)' });
    }
    if (isNew('comet') && S.scene === 'map') {
      const cp = POS.comet;
      newRingCircle(ctx, L, SX(X, cp), SY(X, cp), 20);
    }
    ctx.restore();
  }

  const LABRECTS = [];
  function drawLabels(ctx, L, X, t) {
    const fs = L.fs, h = Math.round(20 * fs), M = L.main;
    const o = { font: fnt(L, 13, 'bold'), h, pad: Math.round(7 * fs), bg: 'rgba(6,10,26,.74)', color: '#e6eeff' };
    const full = CAM.z < 0.6, zoomed = CAM.z > 1.5;
    const placed = LABRECTS; placed.length = 0;
    // 이미 놓인 이름표와 겹치면 아래·위로 비켜 놓기
    const fit = (cx, cy, w, tries) => {
      for (let k = 0; k < (tries || 4); k++) {
        let hit = false;
        for (let i = 0; i < placed.length; i += 4) {
          if (Math.abs(cx - placed[i]) < (w + placed[i + 2]) / 2 + 2 && Math.abs(cy - placed[i + 1]) < h + 2) { hit = true; break; }
        }
        if (!hit) break;
        cy += (k % 2 === 0 ? 1 : -1) * (h + 3) * (k + 2 >> 1);
      }
      placed.push(cx, cy, w, h);
      return cy;
    };
    const lab = (txt, x, y, r, extra) => {
      if (x < M.x - 20 || x > M.x + M.w + 20 || y < M.y - 20 || y > M.y + M.h + 20) return;
      const oo = extra ? Object.assign({}, o, extra) : o;
      const w = pillWidth(ctx, txt, oo), cx = clamp(x, M.x + w / 2 + 4, M.x + M.w - w / 2 - 4);
      const cy = fit(cx, Math.min(y + r + 5 + h / 2, M.y + M.h - h), w);
      pill(ctx, txt, cx, cy, oo);
    };
    const hidden = (id) => S.subject === id && game && game.phase === 'active';
    // 천체 바깥쪽(중심 cx,cy 반대 방향)에 이름표를 달아 겹치지 않게 함
    const labOut = (txt, x, y, r, cx, cy, extra) => {
      const oo = Object.assign({}, o, extra), w = pillWidth(ctx, txt, oo);
      const a = Math.atan2(y - cy, x - cx), ca = Math.cos(a), sa = Math.sin(a);
      const lx = x + ca * (r + 7 + w / 2 * Math.abs(ca)), ly = y + sa * (r + 7 + h / 2 * Math.abs(sa) + 4);
      if (lx < M.x - 20 || lx > M.x + M.w + 20 || ly < M.y - 20 || ly > M.y + M.h + 20) return;
      const px2 = clamp(lx, M.x + w / 2 + 4, M.x + M.w - w / 2 - 4);
      pill(ctx, txt, px2, fit(px2, clamp(ly, M.y + h, M.y + M.h - h), w), oo);
    };
    if (!full) lab('태양', X.ox, X.oy, SUN_R * X.k + 2, { color: '#ffe7a3' });
    for (const id of PLANETS) {
      if (full && (id === 'mercury' || id === 'venus' || id === 'mars' || id === 'earth')) continue;
      if (id === 'jupiter' && S.view === 'jupiter') continue;
      const p = POS[id];
      lab(BODY[id].name, SX(X, p), SY(X, p), PD[id].size * X.k * (BODY[id].ring ? 0.9 : 1));
    }
    if (!full) {
      const m = MOONS[0]; moonScreen(X, m, tmpP);
      if (zoomed) labOut('달', tmpP.x, tmpP.y, m.size * X.k, SX(X, POS.earth), SY(X, POS.earth), { bg: 'rgba(6,10,26,.6)' });
      lab('세레스', SX(X, POS.ceres), SY(X, POS.ceres), DWARF_SIZE.ceres * X.k);
    }
    if (zoomed && S.view === 'jupiter') MOONS.slice(1).forEach((m) => { moonScreen(X, m, tmpP); labOut(hidden(m.id) ? '❓ 새 천체' : BODY[m.id].name, tmpP.x, tmpP.y, m.size * X.k, SX(X, POS.jupiter), SY(X, POS.jupiter), { bg: 'rgba(6,10,26,.6)' }); });
    ['pluto', 'eris'].forEach((id) => { const p = POS[id]; lab(hidden(id) ? '❓ 새 천체' : BODY[id].name, SX(X, p), SY(X, p), DWARF_SIZE[id] * X.k); });
    const cp = POS.comet;
    lab('혜성', SX(X, cp), SY(X, cp), 6);
    if (S.apophis) { const p = POS.apophis; lab(hidden('apophis') ? '❓ 새 천체' : '아포피스', SX(X, p), SY(X, p), 3 * X.k); }
    if (S.beltFound || (game && game.free)) {
      const a = 2.35, rr = (R_B0 + R_B1) / 2 * X.s;
      if (!full) pill(ctx, '소행성대', X.ox + Math.cos(a) * rr, X.oy - Math.sin(a) * rr, Object.assign({}, o, { color: '#f5deb3', bg: 'rgba(40,28,12,.82)' }));
    }
  }
  function bodyScreen(L, id, out) {
    const X = xfMain(L);
    const m = MOONS.find((q) => q.id === id);
    if (m) return moonScreen(X, m, out);
    const p = POS[id === 'asteroid' ? 'ceres' : id];
    if (!p) return null;
    out.x = SX(X, p); out.y = SY(X, p);
    return out;
  }
  function bodyRadius(L, id) {
    const X = xfMain(L);
    if (id === 'sun') return SUN_R * X.k;
    if (PD[id]) return PD[id].size * X.k;
    const m = MOONS.find((q) => q.id === id);
    if (m) return m.size * X.k;
    if (DWARF_SIZE[id]) return DWARF_SIZE[id] * X.k;
    return 6;
  }
  function drawSelection(ctx, L, X, t) {
    const sel = S.scene === 'map' && S.panel === 'card' ? S.card : null;
    const subj = S.subject;
    const ring = (x, y, r, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      circle(ctx, x, y, r + 5 + 2 * Math.sin(t * 5)); ctx.stroke();
    };
    if (sel === 'asteroid' && S.selRock >= 0) {
      const R = ROCKS[S.selRock], th = R.th0 + R.w * S.time;
      ring(X.ox + Math.cos(th) * R.rad * X.s, X.oy - Math.sin(th) * R.rad * X.s, 3, 'rgba(94,234,212,.9)');
    } else if (sel && sel !== 'asteroid') {
      const p = bodyScreen(L, sel, tmpP);
      if (p) ring(p.x, p.y, Math.max(5, bodyRadius(L, sel)), 'rgba(94,234,212,.9)');
    }
    if (subj && game && game.phase === 'active') {
      const p = bodyScreen(L, subj, { x: 0, y: 0 });
      if (p) {
        const r = Math.max(8, bodyRadius(L, subj) + 6);
        ctx.strokeStyle = 'rgba(255,214,110,' + (0.45 + 0.45 * pulse()) + ')'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
        circle(ctx, p.x, p.y, r + 6); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }

  /* ---------- 효과: 퍼지는 고리 ---------- */
  function ringFx(V, x, y, r, col) { V.fx.push({ x, y, r, col: col || '#34d399', t0: nowS() }); }
  function drawFx(ctx, V) {
    const n = nowS();
    for (let i = V.fx.length - 1; i >= 0; i--) {
      const f = V.fx[i], a = (n - f.t0) / 0.6;
      if (a >= 1) { V.fx.splice(i, 1); continue; }
      ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - a; ctx.lineWidth = 3 * (1 - a) + 1;
      circle(ctx, f.x, f.y, f.r + a * f.r * 1.4 + 4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* =========================================================
     오른쪽(아래쪽) 창: 천체 카드
     ========================================================= */
  function cardGeo(L) {
    const P = L.panel;
    if (L.col) {
      const box = { x: P.x + 10, y: P.y + 42, w: P.w - 20, h: 300 };
      return { tx: P.x + 14, ty: P.y + 28, box, bx: box.x + box.w / 2, by: box.y + 92, br: 50, nx: box.x + box.w / 2, ny: box.y + 186, align: 'center', badgeY: box.y + 214, lx: box.x + 14, ly: box.y + 248, lw: box.w - 28,
        colY: P.y + 372, slots: KIND_ORDER.map((k, i) => ({ x: P.x + 14 + (i % 3) * ((P.w - 28 - 12) / 3 + 6), y: P.y + 384 + Math.floor(i / 3) * 74, w: (P.w - 28 - 12) / 3, h: 66 })) };
    }
    const box = { x: P.x + 10, y: P.y + 38, w: 300, h: P.h - 48 };
    return { tx: P.x + 14, ty: P.y + 26, box, bx: box.x + 66, by: box.y + box.h / 2 - 2, br: 48, nx: box.x + 128, ny: box.y + 50, align: 'left', badgeY: box.y + 84, lx: box.x + 128, ly: box.y + 124, lw: box.w - 140,
      colY: P.y + 26, slots: KIND_ORDER.map((k, i) => ({ x: P.x + 322 + (i % 2) * 88, y: P.y + 38 + Math.floor(i / 2) * 78, w: 82, h: 72 })) };
  }
  function drawCardPanel(ctx, L, t) {
    const P = L.panel, G = cardGeo(L), fs = L.fs;
    panelBase(ctx, P, L.starsPanel, t);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('🪪 천체 카드', G.tx, G.ty);
    const box = G.box, id = S.card;
    if (!id) {
      roundRect(ctx, box.x, box.y, box.w, box.h, 14);
      ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fill();
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(160,190,255,.4)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = 'center'; ctx.fillStyle = '#c7d3f2'; ctx.font = fnt(L, 14, 'bold');
      ctx.fillText('지도에서 천체를', box.x + box.w / 2, box.y + box.h / 2 - 10 * fs);
      ctx.fillText('눌러 보세요 👆', box.x + box.w / 2, box.y + box.h / 2 + 12 * fs);
    } else {
      const B = BODY[id], hideKind = S.subject === id && game && game.phase === 'active';
      const K = KIND[B.kind];
      const a = clamp(S.cardA.a, 0, 1), sc = S.cardA.s;
      ctx.save();
      ctx.globalAlpha = a;
      const ccx = box.x + box.w / 2, ccy = box.y + box.h / 2;
      ctx.translate(ccx, ccy); ctx.scale(sc, sc); ctx.translate(-ccx, -ccy);
      roundRect(ctx, box.x, box.y, box.w, box.h, 14);
      const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
      g.addColorStop(0, '#13265a'); g.addColorStop(1, '#0d1a40');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = hideKind ? 'rgba(255,214,110,.7)' : SciSim.color.rgba(K.col, 0.8); ctx.lineWidth = 2; ctx.stroke();
      // 확대 렌더링
      ctx.save(); roundRect(ctx, box.x + 2, box.y + 2, box.w - 4, box.h - 4, 12); ctx.clip();
      drawBody(ctx, id, G.bx, G.by, G.br * (B.ring ? 0.62 : B.kind === 'comet' ? 0.95 : 1), -0.82, -0.57, t, { spin: RM ? 0 : t * 0.25, glow: 1.9, tail: 2.2 });
      ctx.restore();
      ctx.textAlign = G.align; ctx.fillStyle = '#fff'; ctx.font = dfnt(L, 26);
      ctx.fillText(B.name, G.nx, G.ny);
      const bt = hideKind ? '❓ 분류해 보세요' : K.badge;
      const bo = { font: fnt(L, 13, 'bold'), h: Math.round(24 * fs), pad: 10, bg: hideKind ? 'rgba(255,214,110,.2)' : SciSim.color.rgba(K.col, 0.3), stroke: hideKind ? '#ffd36b' : K.col, color: '#fff', align: G.align === 'left' ? 'left' : undefined };
      pill(ctx, bt, G.nx, G.badgeY, bo);
      ctx.textAlign = 'left'; ctx.font = fnt(L, 13); ctx.fillStyle = '#d6e2ff';
      let y = G.ly;
      const lines = hideKind ? ['탐사 일지를 읽고', '분류 열쇠로 판단해요.'] : cardLines(id);
      lines.forEach((ln) => { y = wrapText(ctx, ln, G.lx, y, G.lw, 19 * fs) + 20 * fs; });
      ctx.restore();
    }
    // 모은 종류
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 14, 'bold');
    const colX = L.col ? P.x + 14 : P.x + 322;
    ctx.fillText('모은 종류 ' + S.kinds.size + ' / 6', colX, G.colY);
    G.slots.forEach((s, i) => {
      const k = KIND_ORDER[i], got = S.kinds.has(k), K = KIND[k];
      roundRect(ctx, s.x, s.y, s.w, s.h, 10);
      ctx.fillStyle = got ? SciSim.color.rgba(K.col, 0.25) : 'rgba(255,255,255,.05)'; ctx.fill();
      ctx.strokeStyle = got ? SciSim.color.rgba(K.col, 0.9) : 'rgba(160,190,255,.25)'; ctx.lineWidth = got ? 2 : 1;
      if (!got) ctx.setLineDash([4, 4]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = 'center'; ctx.font = Math.round(20 * fs) + 'px ' + FONT; ctx.globalAlpha = got ? 1 : 0.35;
      ctx.fillText(K.icon, s.x + s.w / 2, s.y + s.h * 0.45);
      ctx.globalAlpha = 1;
      ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = got ? '#fff' : 'rgba(200,215,245,.6)';
      ctx.fillText(K.name, s.x + s.w / 2, s.y + s.h - 9 * fs);
      if (got) {
        ctx.fillStyle = '#10b981'; circle(ctx, s.x + s.w - 9, s.y + 9, 7.5); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; checkMark(ctx, s.x + s.w - 9, s.y + 9, 7); ctx.lineCap = 'butt';
      }
    });
    panelEdge(ctx, P);
    if (isNew('cards')) newRing(ctx, L, box.x, box.y, box.w, box.h);
  }

  /* =========================================================
     확대 창 (3단계 소행성대)
     ========================================================= */
  function lensGeo(L) {
    const P = L.panel;
    return L.col ? { cx: P.x + P.w / 2, cy: P.y + 150, r: 96, tx: P.x + 14, ty: P.y + 280, tw: P.w - 28 } : { cx: P.x + 118, cy: P.y + 148, r: 104, tx: P.x + 236, ty: P.y + 62, tw: P.w - 248 };
  }
  function regionOf(r) {
    if (r < R_MARS + 9) return { name: '화성 궤도 안쪽', belt: false };
    if (r < R_B0 - 5) return { name: '화성 궤도 바로 바깥', belt: false };
    if (r <= R_B1 + 5) return { name: '화성과 목성 궤도 사이', belt: true };
    if (r < R_JUP + 18) return { name: '목성 궤도 근처', belt: false };
    return { name: '목성 궤도 바깥', belt: false };
  }
  function lensCount(mx, my, rad) {
    let n = 0;
    ROCKS.forEach((R) => { const th = R.th0 + R.w * S.time; if (Math.hypot(Math.cos(th) * R.rad - mx, Math.sin(th) * R.rad - my) < rad) n++; });
    return n;
  }
  function drawLensPanel(ctx, L, t, V) {
    const P = L.panel, G = lensGeo(L), fs = L.fs;
    panelBase(ctx, P, L.starsPanel, t);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('🔍 확대 창 (4배)', P.x + 14, P.y + 28);
    ctx.save();
    circle(ctx, G.cx, G.cy, G.r); ctx.clip();
    ctx.fillStyle = '#070d1f'; ctx.fillRect(G.cx - G.r, G.cy - G.r, G.r * 2, G.r * 2);
    if (S.lens) {
      const X0 = xfMain(L), s = X0.s * 4;
      const X = { s, k: X0.k * 3, ox: G.cx - S.lens.x * s, oy: G.cy + S.lens.y * s };
      const R = { x: G.cx - G.r, y: G.cy - G.r, w: G.r * 2, h: G.r * 2 };
      ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(160,190,255,.3)'; ctx.lineWidth = 1.2;
      PLANETS.forEach((id) => { circle(ctx, X.ox, X.oy, PD[id].rad * X.s); ctx.stroke(); });
      ctx.setLineDash([]);
      drawBelt(ctx, X, t, R, true);
      drawMapBodies(ctx, L, X, t, V, true);
    } else {
      ctx.textAlign = 'center'; ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13, 'bold');
      ctx.fillText('지도를 누르면', G.cx, G.cy - 8 * fs);
      ctx.fillText('그곳을 확대해요', G.cx, G.cy + 12 * fs);
    }
    // 렌즈 유리 반사
    const hg = ctx.createLinearGradient(G.cx - G.r, G.cy - G.r, G.cx + G.r, G.cy + G.r);
    hg.addColorStop(0, 'rgba(255,255,255,.12)'); hg.addColorStop(0.45, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg; ctx.fillRect(G.cx - G.r, G.cy - G.r, G.r * 2, G.r * 2);
    ctx.restore();
    const rg = ctx.createLinearGradient(G.cx - G.r, G.cy - G.r, G.cx + G.r, G.cy + G.r);
    rg.addColorStop(0, '#d7e3ff'); rg.addColorStop(0.5, '#5b6b92'); rg.addColorStop(1, '#a9b9e4');
    ctx.strokeStyle = rg; ctx.lineWidth = 6; circle(ctx, G.cx, G.cy, G.r + 3); ctx.stroke();
    // 설명
    ctx.textAlign = 'left';
    let y = G.ty;
    if (S.lensInfo) {
      const I = S.lensInfo;
      ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = I.belt ? '#86efac' : '#ffd36b';
      y = wrapText(ctx, (I.belt ? '✅ ' : '📍 ') + I.name, G.tx, y, G.tw, 20 * fs) + 24 * fs;
      ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = '#fff';
      ctx.fillText('창 속 소행성: ' + I.count + '개', G.tx, y); y += 22 * fs;
      ctx.font = fnt(L, 13); ctx.fillStyle = '#c7d3f2';
      wrapText(ctx, I.belt ? '작은 바위 천체가 띠처럼 빽빽해요. 모양이 불규칙하고 둥글지 않아요.' : I.count > 0 ? '소행성이 조금 보여요. 더 빽빽한 곳이 있는지 찾아봐요.' : '소행성이 거의 없어요. 다른 곳을 눌러 봐요.', G.tx, y, G.tw, 19 * fs, 4);
    } else {
      ctx.font = fnt(L, 13); ctx.fillStyle = '#c7d3f2';
      wrapText(ctx, '궤도 사이사이를 눌러 확대 창의 모습을 비교해 봐요.', G.tx, y, G.tw, 19 * fs, 4);
    }
    panelEdge(ctx, P);
    if (isNew('belt')) newRingCircle(ctx, L, G.cx, G.cy, G.r + 6);
  }

  /* =========================================================
     혜성 관측 창 (3단계)
     ========================================================= */
  function drawCometPanel(ctx, L, t) {
    const P = L.panel, fs = L.fs;
    panelBase(ctx, P, L.starsPanel, t);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('☄️ 혜성 관측', P.x + 14, P.y + 28);
    const cp = POS.comet, r = Math.hypot(cp.x, cp.y, cp.z), f = cometActivity(r);
    const box = L.col ? { x: P.x + 10, y: P.y + 42, w: P.w - 20, h: 150 } : { x: P.x + 10, y: P.y + 40, w: 250, h: P.h - 50 };
    roundRect(ctx, box.x, box.y, box.w, box.h, 12);
    ctx.fillStyle = '#060b1c'; ctx.fill();
    ctx.save(); roundRect(ctx, box.x, box.y, box.w, box.h, 12); ctx.clip();
    drawStars(ctx, L.starsBox, t, 0.8);
    const nx = box.x + (L.col ? 46 : 52), ny = box.y + box.h / 2;
    drawComet(ctx, nx, ny, 3.5, 4 + 14 * f, (box.w - 70) * f, 1, 0, t);
    ctx.restore();
    ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = '#ffd36b'; ctx.textAlign = 'left';
    ctx.fillText('← 태양 쪽', box.x + 8, box.y + 20 * fs);
    ctx.fillStyle = f > 0.02 ? '#bfefff' : '#9fb3e0'; ctx.textAlign = 'right';
    ctx.fillText(f > 0.02 ? '꼬리가 생겼어요' : '꼬리가 없어요', box.x + box.w - 8, box.y + box.h - 10 * fs);
    // 막대
    const gx = L.col ? P.x + 14 : P.x + 274, gw = L.col ? P.w - 28 : P.w - 288;
    let y = L.col ? box.y + box.h + 30 * fs : P.y + 58;
    const bar = (label, v, col, left, right) => {
      ctx.textAlign = 'left'; ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = '#e3ebff';
      ctx.fillText(label, gx, y);
      y += 10 * fs;
      roundRect(ctx, gx, y, gw, 12, 6); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
      if (v > 0.01) { roundRect(ctx, gx, y, Math.max(12, gw * v), 12, 6); ctx.fillStyle = col; ctx.fill(); }
      if (left) {
        ctx.font = fnt(L, 13); ctx.fillStyle = '#9fb3e0';
        ctx.textAlign = 'left'; ctx.fillText(left, gx, y + 30 * fs);
        ctx.textAlign = 'right'; ctx.fillText(right, gx + gw, y + 30 * fs);
        y += 16 * fs;
      }
      y += 34 * fs;
    };
    const near = clamp((r - ORB.comet.rp) / (ORB.comet.ra - ORB.comet.rp), 0, 1);
    bar('태양과의 거리: ' + (r < R_25 ? '가깝다' : '멀다'), near, 'linear-gradient', '가깝다', '멀다');
    bar('꼬리 길이', f, '#7dd3fc');
    // 진행 표시
    ctx.textAlign = 'left'; ctx.font = fnt(L, 13, 'bold');
    [['목성 궤도 밖에서 출발', true], ['태양 가까이 (근일점)', S.peri], ['다시 멀리 (목성 쪽으로)', S.outAgain]].forEach((it) => {
      ctx.fillStyle = it[1] ? '#86efac' : '#c7d3f2';
      ctx.fillText((it[1] ? '✅ ' : '⬜ ') + it[0], gx, y); y += 22 * fs;
    });
    panelEdge(ctx, P);
  }

  /* =========================================================
     2단계: 분류 열쇠
     ========================================================= */
  const SORT = [
    { id: 'c_moon', body: 'moon', name: '달', topic: '달은', ans: { q1: 'planet' }, chip: { q1: '지구 둘레' } },
    { id: 'c_mars', body: 'mars', name: '화성', topic: '화성은', ans: { q1: 'sun', q2: 'yes', q3: 'yes' }, chip: { q1: '태양 둘레', q2: '둥글다', q3: '치웠다' } },
    { id: 'c_pluto', body: 'pluto', name: '명왕성', topic: '명왕성은', ans: { q1: 'sun', q2: 'yes', q3: 'no' }, chip: { q1: '태양 둘레', q2: '둥글다', q3: '못 치웠다' } },
    { id: 'c_vesta', body: 'vesta', name: '베스타', topic: '베스타는', ans: { q1: 'sun', q2: 'no', q2b: 'no' }, chip: { q1: '태양 둘레', q2: '불규칙하다', q2b: '꼬리 없음' } },
    { id: 'c_halley', body: 'comet', name: '핼리 혜성', topic: '핼리 혜성은', ans: { q1: 'sun', q2: 'no', q2b: 'yes' }, chip: { q1: '태양 둘레', q2: '불규칙하다', q2b: '꼬리 생김' } },
    { id: 'c_gany', body: 'ganymede', name: '가니메데', topic: '가니메데는', ans: { q1: 'planet' }, chip: { q1: '목성 둘레' } },
  ];
  const BASKETS = ['moon', 'comet', 'asteroid', 'planet', 'dwarf'];
  const PATHS = {
    moon: [['q1', 'planet']],
    comet: [['q1', 'sun'], ['q2', 'no'], ['q2b', 'yes']],
    asteroid: [['q1', 'sun'], ['q2', 'no'], ['q2b', 'no']],
    planet: [['q1', 'sun'], ['q2', 'yes'], ['q3', 'yes']],
    dwarf: [['q1', 'sun'], ['q2', 'yes'], ['q3', 'no']],
  };
  const QTEXT = {
    q1: ['무엇의 둘레를 도나요?'],
    q2: ['둥근 모양인가요?'],
    q2b: ['태양에 가까워지면', '꼬리가 생기나요?'],
    q3: ['궤도 주변의 다른 천체를', '끌어당겨 치웠나요?'],
  };
  const QNAME = { q1: '무엇의 둘레를 도나요?', q2: '둥근 모양인가요?', q2b: '꼬리가 생기나요?', q3: '궤도 주변을 치웠나요?' };
  const EDGES = [['q1', 'b:moon', '행성 둘레'], ['q1', 'q2', '태양 둘레'], ['q2', 'q2b', '아니요'], ['q2', 'q3', '예'], ['q2b', 'b:comet', '예'], ['q2b', 'b:asteroid', '아니요'], ['q3', 'b:planet', '예'], ['q3', 'b:dwarf', '아니요']];
  const BRANCH_OF_EDGE = { 'q1>b:moon': 'planet', 'q1>q2': 'sun', 'q2>q2b': 'no', 'q2>q3': 'yes', 'q2b>b:comet': 'yes', 'q2b>b:asteroid': 'no', 'q3>b:planet': 'yes', 'q3>b:dwarf': 'no' };
  const HOP = 0.3;
  const CARDS = SORT.map((c, i) => Object.assign({ cid: i, slot: i, where: 'tray', basket: null, sx: new SciSim.Spring(0, { stiffness: 196, damping: 28 }), sy: new SciSim.Spring(0, { stiffness: 196, damping: 28 }), dragL: null, anim: null, ret: null, bounceT: 0, shakeT: 0 }, c));

  function keyGeo(L) {
    if (L._key) return L._key;
    const M = L.main, fs = L.fs;
    const x0 = M.x + 12, y0 = M.y + 12, w = M.w - 24, h = M.h - 24;
    const sp = w / 5, bw = sp - 10, bh = L.col ? 104 : 100;
    const by = y0 + h - bh - (L.col ? 44 : 40);
    const G = { x0, y0, w, h, nodes: {} };
    BASKETS.forEach((b, k) => { G.nodes['b:' + b] = { kind: 'basket', id: b, cx: x0 + sp * (k + 0.5), y: by, w: bw, h: bh, top: by, bottom: by + bh }; });
    const bx = (b) => G.nodes['b:' + b].cx;
    const q = (id, cx, cy, qw, qh) => { G.nodes[id] = { kind: 'q', id, cx, cy, w: qw, h: qh, top: cy - qh / 2, bottom: cy + qh / 2 }; };
    const one = Math.round(44 * Math.min(fs, 1.1)), two = Math.round(62 * Math.min(fs, 1.1));
    const q2bx = (bx('comet') + bx('asteroid')) / 2, q3x = (bx('planet') + bx('dwarf')) / 2;
    const q2x = (q2bx + q3x) / 2, q1x = (bx('moon') + q2x) / 2 + 12;
    const span = by - y0;
    q('q1', q1x, y0 + span * 0.2, L.col ? 206 : 220, one);
    q('q2', q2x, y0 + span * 0.45, L.col ? 172 : 182, one);
    q('q2b', q2bx, y0 + span * 0.73, L.col ? 194 : 196, two);
    q('q3', q3x, y0 + span * 0.73, L.col ? 198 : 196, two);
    const q3 = G.nodes.q3;
    if (q3.cx + q3.w / 2 > x0 + w - 4) q3.cx = x0 + w - 4 - q3.w / 2;
    const q2b = G.nodes.q2b;
    if (q2b.cx + q2b.w / 2 > q3.cx - q3.w / 2 - 6) q2b.cx = q3.cx - q3.w / 2 - 6 - q2b.w / 2;
    return (L._key = G);
  }
  function seatOf(L, node) {
    const G = keyGeo(L), N = G.nodes[node], T = L.tok;
    if (N.kind === 'q') return { x: N.cx, y: N.top - T.mh / 2 - 3 };
    return { x: N.cx, y: N.top + 16 + T.mh / 2 };
  }
  function basketSeat(L, b, idx) {
    const N = keyGeo(L).nodes['b:' + b], T = L.tok;
    return { x: N.cx, y: N.top + 8 + T.mh / 2 + idx * (T.mh + 6) };
  }
  function slotPos(L, i) {
    const P = L.panel, T = L.tok;
    if (L.col) return { x: P.x + P.w / 2, y: P.y + 74 + i * (T.h + 10) };
    return { x: P.x + 14 + T.w / 2 + (i % 3) * (T.w + 10), y: P.y + 70 + Math.floor(i / 3) * (T.h + 12) };
  }
  function placedIndex(c) { return CARDS.filter((d) => d.where === 'placed' && d.basket === c.basket && d.placedAt < c.placedAt).length; }
  function cardPos(L, c) {
    if (c.where === 'tray') return Object.assign(slotPos(L, c.slot), { mini: 0 });
    if (c.where === 'drag') return c.dragL === L.key ? { x: c.sx.value, y: c.sy.value, mini: 0 } : Object.assign(slotPos(L, c.slot), { mini: 0 });
    if (c.where === 'placed') return Object.assign(basketSeat(L, c.basket, placedIndex(c)), { mini: 1 });
    if (c.where === 'return') {
      const R = c.ret, to = slotPos(L, c.slot), from = R.L === L.key ? R : to, e = EZ.outBack(clamp(R.u, 0, 1));
      return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), mini: 1 - clamp(R.u * 1.4, 0, 1) };
    }
    if (c.where === 'path') {
      const A = c.anim, n = A.steps.length, k = Math.min(A.k, n);
      const to = k < n ? seatOf(L, A.steps[k][0]) : basketSeat(L, A.basket, A.slotIdx);
      let from;
      if (k === 0) from = A.from.L === L.key ? A.from : slotPos(L, c.slot);
      else from = seatOf(L, A.steps[k - 1][0]);
      const u = clamp(A.u, 0, 1);
      const ex = EZ.inOutCubic(u), ey = k === n ? EZ.outBounce(u) : ex;
      return { x: lerp(from.x, to.x, ex), y: lerp(from.y, to.y, ey), mini: k === 0 ? u : 1 };
    }
    return Object.assign(slotPos(L, c.slot), { mini: 0 });
  }
  function resetCards() {
    CARDS.forEach((c) => { c.where = 'tray'; c.basket = null; c.anim = null; c.ret = null; c.placedAt = 0; });
    S.chips = []; S.flash = null; S.keyMsg = null; S.sortTouched = false;
  }
  function placeAll() {
    let n = 0;
    CARDS.forEach((c) => {
      if (c.where === 'placed') return;
      c.where = 'placed'; c.basket = BODY[c.body].kind; c.placedAt = performance.now() + (n++);
      c.anim = null; c.ret = null;
    });
  }
  // 바구니 안 자리 번호: 이미 들어간 카드 + 마지막 칸을 지나는 카드 수
  function seatCount(basket, except) {
    return CARDS.filter((d) => d !== except && ((d.where === 'placed' && d.basket === basket) || (d.where === 'path' && d.anim.basket === basket && d.anim.k >= d.anim.steps.length))).length;
  }
  function startPath(c, basket, L, x, y) {
    S.chips = S.chips.filter((ch) => ch.cid !== c.cid);
    c.where = 'path'; S.sortTouched = true;
    c.anim = { steps: PATHS[basket], basket, k: 0, u: 0, pause: 0, from: { L: L.key, x, y }, fail: false, slotIdx: 0 };
    Sound.click();
  }
  function startReturn(c, L, from) {
    c.where = 'return';
    c.ret = { L: L ? L.key : null, x: from ? from.x : 0, y: from ? from.y : 0, u: 0 };
  }
  function activeView() { return views.find((V) => V.v.canvas.offsetWidth > 0) || views[0]; }
  function arriveNode(c) {
    const A = c.anim, n = A.steps.length;
    if (A.k >= n) {
      c.where = 'placed'; c.basket = A.basket; c.placedAt = performance.now(); c.bounceT = nowS();
      const kindName = KIND[A.basket].name;
      S.keyMsg = { text: '✅ ' + c.name + ' → ' + kindName, good: true, t0: nowS() };
      Sound.tone(880, 0.12, 'triangle', 0.08);
      views.forEach((V) => { const p = basketSeat(V.L, A.basket, placedIndex(c)); ringFx(V, p.x, p.y, 18); V.P.burst(p.x, p.y, { count: 14, colors: ['#34d399', '#5eead4', '#fde68a'], speed: 120, gravity: 120, size: 3 }); });
      return;
    }
    const [node, branch] = A.steps[A.k];
    const truth = c.ans[node];
    const ok = truth === branch;
    S.chips.push({ cid: c.cid, node, text: c.chip[node], ok, t0: nowS() });
    if (ok) { Sound.tick(); A.pause = 0.13; A.next = true; }
    else {
      A.fail = true; A.pause = 0.95;
      c.shakeT = nowS();
      S.flash = { node, t0: nowS() };
      S.keyMsg = { text: '🤔 \'' + QNAME[node] + '\'에서 갈렸어요. ' + c.topic + ' ' + c.chip[node] + '!', good: false, t0: nowS() };
      Sound.fail();
    }
  }
  function updateCards(dt) {
    CARDS.forEach((c) => {
      if (c.where === 'drag') { c.sx.update(dt); c.sy.update(dt); }
      else if (c.where === 'path') {
        const A = c.anim;
        if (A.pause > 0) {
          A.pause -= dt;
          if (A.pause <= 0) {
            if (A.fail) { const V = activeView(); const p = cardPos(V.L, c); startReturn(c, V.L, p); }
            else { A.k++; A.u = 0; A.next = false; if (A.k >= A.steps.length) A.slotIdx = seatCount(A.basket, c); }
          }
          return;
        }
        A.u += dt / HOP;
        if (A.u >= 1) { A.u = 1; arriveNode(c); }
      } else if (c.where === 'return') {
        c.ret.u += dt / 0.5;
        if (c.ret.u >= 1) { c.where = 'tray'; c.ret = null; }
      }
    });
  }
  const sortedCount = () => CARDS.filter((c) => c.where === 'placed').length;

  function drawKey(ctx, L, t) {
    const a = S.keyA;
    if (a <= 0.01) return;
    const G = keyGeo(L), fs = L.fs, nowT = nowS();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, (1 - a) * 18);
    roundRect(ctx, G.x0, G.y0, G.w, G.h, 16);
    const g = ctx.createLinearGradient(0, G.y0, 0, G.y0 + G.h);
    g.addColorStop(0, 'rgba(10,20,52,.9)'); g.addColorStop(1, 'rgba(22,38,86,.92)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(160,190,255,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = dfnt(L, 20);
    ctx.fillText('🔑 분류 열쇠', G.x0 + 14, G.y0 + 30 * fs);
    // 지금 움직이는 카드들의 경로
    const onPath = {};
    CARDS.forEach((mv) => {
      if (mv.where !== 'path') return;
      const st = mv.anim.steps;
      st.forEach((s, i) => { const to = i + 1 < st.length ? st[i + 1][0] : 'b:' + mv.anim.basket; onPath[s[0] + '>' + to] = i < mv.anim.k || (i === mv.anim.k && mv.anim.next) ? 2 : (onPath[s[0] + '>' + to] || 1); });
    });
    // 화살표
    EDGES.forEach(([f, to, lab]) => {
      const A = G.nodes[f], B = G.nodes[to];
      const fx = A.cx + clamp((B.cx - A.cx) * 0.6, -A.w / 2 + 14, A.w / 2 - 14), fy = A.bottom;
      const tx = B.cx, ty = B.top - 2;
      const hl = onPath[f + '>' + to];
      const col = hl ? 'rgba(94,234,212,.95)' : 'rgba(170,195,255,.55)';
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = hl ? 3 : 2;
      const dx = tx - fx, dy = ty - fy, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, hs = 8;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx - ux * hs, ty - uy * hs); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - ux * hs - uy * hs * 0.6, ty - uy * hs + ux * hs * 0.6); ctx.lineTo(tx - ux * hs + uy * hs * 0.6, ty - uy * hs - ux * hs * 0.6); ctx.closePath(); ctx.fill();
      const lx = fx + dx * 0.42, ly = fy + dy * 0.42;
      pill(ctx, lab, lx, ly, { font: fnt(L, 13, 'bold'), h: Math.round(21 * Math.min(fs, 1.1)), pad: 7, bg: hl ? 'rgba(13,80,80,.95)' : 'rgba(8,14,36,.95)', color: lab === '아니요' ? '#fecaca' : lab === '예' ? '#bbf7d0' : '#e0e7ff', stroke: col });
    });
    // 질문 상자
    ['q1', 'q2', 'q2b', 'q3'].forEach((id) => {
      const N = G.nodes[id];
      const fl = S.flash && S.flash.node === id && nowT - S.flash.t0 < 1.1 ? Math.floor((nowT - S.flash.t0) * 7) % 2 === 0 : false;
      roundRect(ctx, N.cx - N.w / 2, N.top, N.w, N.h, 12);
      const qg = ctx.createLinearGradient(0, N.top, 0, N.bottom);
      if (fl) { qg.addColorStop(0, '#7f1d1d'); qg.addColorStop(1, '#5b1414'); }
      else { qg.addColorStop(0, '#1d3f86'); qg.addColorStop(1, '#132c63'); }
      ctx.fillStyle = qg; ctx.fill();
      ctx.strokeStyle = fl ? '#fb7185' : 'rgba(147,197,253,.75)'; ctx.lineWidth = fl ? 3 : 1.6; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = fnt(L, id === 'q1' || id === 'q2' ? 15 : 14, 'bold');
      const lines = QTEXT[id], lh = 19 * Math.min(fs, 1.1);
      lines.forEach((ln, i) => ctx.fillText(ln, N.cx, N.cy + (i - (lines.length - 1) / 2) * lh + 5 * Math.min(fs, 1.1)));
    });
    // 바구니
    BASKETS.forEach((b) => {
      const N = G.nodes['b:' + b], K = KIND[b], hov = S.hoverBasket === b;
      const x = N.cx - N.w / 2;
      roundRect(ctx, x, N.top, N.w, N.h, 12);
      const bg = ctx.createLinearGradient(0, N.top, 0, N.bottom);
      bg.addColorStop(0, hov ? 'rgba(94,234,212,.22)' : 'rgba(255,255,255,.05)'); bg.addColorStop(1, SciSim.color.rgba(K.col, hov ? 0.4 : 0.22));
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = hov ? '#5eead4' : SciSim.color.rgba(K.col, 0.85); ctx.lineWidth = hov ? 3 : 1.8; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x + 6, N.top + 4, N.w - 12, 3);
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      let bf = 14 * L.fs; ctx.font = 'bold ' + bf.toFixed(1) + 'px ' + FONT;
      const bw = ctx.measureText(K.icon + ' ' + K.name).width;
      if (bw > N.w - 8) { bf = Math.max(11, bf * (N.w - 8) / bw); ctx.font = 'bold ' + bf.toFixed(1) + 'px ' + FONT; }
      ctx.fillText(K.icon + ' ' + K.name, N.cx, N.bottom - 10 * Math.min(fs, 1.1));
    });
    // 답 칩
    S.chips.forEach((ch) => {
      const N = G.nodes[ch.node], age = nowT - ch.t0, al = clamp(1.8 - age * 0.5, 0, 1);
      if (al <= 0) return;
      ctx.globalAlpha = a * al;
      pill(ctx, (ch.ok ? '✔ ' : '✖ ') + ch.text, N.cx, N.bottom + 14 * Math.min(fs, 1.1), { font: fnt(L, 13, 'bold'), h: Math.round(22 * Math.min(fs, 1.1)), pad: 8, bg: ch.ok ? 'rgba(6,95,70,.95)' : 'rgba(127,29,29,.95)', color: '#fff', stroke: ch.ok ? '#34d399' : '#fb7185' });
      ctx.globalAlpha = a;
    });
    // 안내 말
    const msgY = G.y0 + G.h - 20 * Math.min(fs, 1.1);
    if (S.keyMsg && nowT - S.keyMsg.t0 < 3.2) {
      const al = clamp((3.2 - (nowT - S.keyMsg.t0)) * 2, 0, 1);
      ctx.globalAlpha = a * al;
      ctx.font = fnt(L, 13.5, 'bold');
      const mw = Math.min(G.w - 20, ctx.measureText(S.keyMsg.text).width + 24);
      pill(ctx, S.keyMsg.text, G.x0 + G.w / 2, msgY, { font: fnt(L, 13.5, 'bold'), h: Math.round(26 * Math.min(fs, 1.1)), pad: 12, bg: S.keyMsg.good ? 'rgba(6,95,70,.95)' : 'rgba(127,29,29,.95)', color: '#fff' });
      void mw;
      ctx.globalAlpha = a;
    } else {
      ctx.textAlign = 'center'; ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = 'rgba(199,211,242,.85)';
      ctx.fillText(sortedCount() < 6 ? '👆 카드를 끌어 알맞은 바구니에 넣어 보세요' : '✔ 여섯 장을 모두 분류했어요', G.x0 + G.w / 2, msgY + 4);
    }
    ctx.restore();
    if (isNew('sorter')) newRing(ctx, L, G.x0, G.y0, G.w, G.h);
  }
  function drawTrayPanel(ctx, L, t) {
    const P = L.panel, fs = L.fs;
    panelBase(ctx, P, L.starsPanel, t);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText('🃏 분류할 카드  ' + sortedCount() + ' / 6', P.x + 14, P.y + 28);
    const T = L.tok;
    CARDS.forEach((c, i) => {
      const s = slotPos(L, i);
      roundRect(ctx, s.x - T.w / 2, s.y - T.h / 2, T.w, T.h, 12);
      ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(160,190,255,.3)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
    });
    if (L.col) {
      ctx.font = fnt(L, 13); ctx.fillStyle = '#c7d3f2';
      const y0 = slotPos(L, 5).y + T.h / 2 + 26;
      wrapText(ctx, '카드를 바구니에 놓으면 카드가 질문을 차례로 지나가요. 질문의 답이 맞으면 바구니에 쏙 들어가요.', P.x + 14, y0, P.w - 28, 19, 6);
    }
    panelEdge(ctx, P);
  }
  function drawToken(ctx, L, c, x, y, mini, lift, t) {
    const T = L.tok;
    const w = lerp(T.w, T.mw, mini), h = lerp(T.h, T.mh, mini), ir = lerp(T.ir, T.mir, mini);
    const B = BODY[c.body], K = KIND[B.kind];
    let sx = x;
    if (c.shakeT && nowS() - c.shakeT < 0.35) { const a = (nowS() - c.shakeT) / 0.35; sx += Math.sin(a * 30) * 6 * (1 - a); }
    let sq = 1;
    if (c.bounceT && nowS() - c.bounceT < 0.4) { const a = (nowS() - c.bounceT) / 0.4; sq = 1 + Math.sin(a * Math.PI * 2) * 0.12 * (1 - a); }
    ctx.save();
    ctx.translate(sx, y); ctx.scale((1 + lift * 0.06) * (2 - sq), (1 + lift * 0.06) * sq);
    ctx.shadowColor = 'rgba(0,0,0,' + (0.35 + lift * 0.2) + ')'; ctx.shadowBlur = 8 + lift * 14; ctx.shadowOffsetY = 3 + lift * 6;
    roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(12, h / 2));
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#24407f'); g.addColorStop(1, '#162c5e');
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = lift ? '#5eead4' : 'rgba(170,200,255,.6)'; ctx.lineWidth = lift ? 2.4 : 1.4; ctx.stroke();
    const ix = -w / 2 + ir + 8;
    ctx.save(); roundRect(ctx, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, Math.min(10, h / 2)); ctx.clip();
    drawBody(ctx, c.body, ix + (B.kind === 'comet' ? -ir * 0.3 : 0), 0, ir * (B.ring ? 0.7 : 1), -0.8, -0.6, t, { glow: 1.6, tail: 2.0, shadow: false });
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = 'bold ' + Math.round(lerp(T.font, T.mfont, mini)) + 'px ' + FONT;
    ctx.textBaseline = 'middle';
    ctx.fillText(c.name, ix + ir + 7, 1);
    ctx.textBaseline = 'alphabetic';
    void K;
    ctx.restore();
  }
  function drawSortHint(ctx, L) {
    const c0 = CARDS[0];
    if (S.sortTouched || S.scene !== 'key' || S.keyA < 0.7 || !on('sorter') || c0.where !== 'tray') return;
    const s = slotPos(L, 0), T = L.tok, pu = RM ? 0.5 : 0.5 + 0.5 * Math.sin(nowS() * 4.2);
    ctx.save();
    ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(94,234,212,' + (0.45 + 0.5 * pu) + ')'; ctx.lineWidth = 2.5;
    roundRect(ctx, s.x - T.w / 2 - 4 - pu * 2, s.y - T.h / 2 - 4 - pu * 2, T.w + 8 + pu * 4, T.h + 8 + pu * 4, 15); ctx.stroke();
    ctx.restore();
    if (L.col) pill(ctx, '👆 끌어 보세요', s.x + T.w / 2 - 8, s.y, { align: 'right', font: fnt(L, 13, 'bold'), h: Math.round(24 * L.fs), bg: 'rgba(14,165,233,.96)' });
  }
  const ORDER_WHERE = { placed: 0, tray: 1, return: 2, path: 3, drag: 4 };
  const TOKEN_SORT = (a, b) => ORDER_WHERE[a.where] - ORDER_WHERE[b.where];
  function drawTokens(ctx, L, t) {
    // 바구니 안 → 쟁반 → 움직이는 카드 → 끄는 카드 순서
    CARDS.slice().sort(TOKEN_SORT).forEach((c) => {
      const p = cardPos(L, c);
      drawToken(ctx, L, c, p.x, p.y, p.mini, c.where === 'drag' ? 1 : 0, t);
    });
    drawSortHint(ctx, L);
  }

  /* =========================================================
     전체 그리기
     ========================================================= */
  function draw(V, t) {
    const { v, L } = V, ctx = v.ctx;
    v.clear('#070d1f');
    drawMap(ctx, L, t, V);
    if (S.keyA > 0.01) {
      const M = L.main;
      ctx.fillStyle = 'rgba(7,13,31,' + (0.93 * S.keyA) + ')'; ctx.fillRect(M.x, M.y, M.w, M.h);
      drawKey(ctx, L, t);
    }
    if (S.scene === 'key') drawTrayPanel(ctx, L, t);
    else if (S.panel === 'lens') drawLensPanel(ctx, L, t, V);
    else if (S.panel === 'comet') drawCometPanel(ctx, L, t);
    else drawCardPanel(ctx, L, t);
    if (S.panelT < 0.995) { // 오른쪽 창이 바뀔 때 부드럽게 나타남
      const P = L.panel;
      ctx.fillStyle = 'rgba(7,13,31,' + ((1 - S.panelT) * 0.96) + ')'; roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.fill();
    }
    if (S.scene === 'key' || CARDS.some((c) => c.where === 'path' || c.where === 'return' || c.where === 'drag')) drawTokens(ctx, L, t);
    V.P.draw(ctx);
  }

  /* =========================================================
     조작
     ========================================================= */
  const playBtn = $('#playBtn');
  function setPlaying(p) {
    S.playing = !!p && S.scene === 'map' && on('map');
    playBtn.innerHTML = S.playing ? '⏸ 멈춤' : '▶ 공전 재생';
    playBtn.classList.toggle('btn-primary', !S.playing);
    playBtn.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    if (S.playing) { cSpringActive = false; S.cDrag = false; }
  }
  playBtn.addEventListener('click', () => { Sound.click(); setPlaying(!S.playing); });
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.v); }));
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.s); }));
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetCards(); });
  function setScene(s) {
    S.scene = s;
    if (s === 'key') { setPlaying(false); SciSim.tween(S, { keyA: 1 }, { duration: 0.5, ease: 'outCubic' }); }
    else SciSim.tween(S, { keyA: 0 }, { duration: 0.35, ease: 'outCubic' });
    syncControls();
  }
  function syncControls() {
    const free = !!(game && game.free);
    const key = S.scene === 'key';
    $('#cScene').classList.toggle('is-off', !free);
    $('#cView').classList.toggle('is-off', key);
    $('#cPlay').classList.toggle('is-off', key);
    $('#cReset').classList.toggle('is-off', !(free && key));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.scene));
    $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.view));
    const note = $('#playNote');
    note.textContent = S.panel === 'lens' ? '지도를 누르면 확대 창에 크게 보여요.' : S.panel === 'comet' ? '혜성을 끌어 궤도를 따라 옮겨 보세요.' : '지도의 천체를 누르면 천체 카드가 열려요.';
    const any = ['#cScene', '#cView', '#cPlay', '#cReset'].some((sel) => { const n = $(sel); return !n.classList.contains('is-off') && !n.hidden; });
    $('#ctrlCard').hidden = !any;
  }

  function showSubject(id) {
    S.subject = id; S.card = id; S.selRock = -1;
    S.cardA.s = 0.85; S.cardA.a = 0;
    SciSim.tween(S.cardA, { s: 1 }, { duration: 0.25, ease: 'outBack' });
    SciSim.tween(S.cardA, { a: 1 }, { duration: 0.2, ease: 'outCubic' });
  }
  function openCard(id, rockIdx) {
    const fresh = S.card !== id;
    S.card = id; S.selRock = rockIdx == null ? -1 : rockIdx;
    S.mapHint = false;
    if (fresh) {
      S.cardA.s = 0.85; S.cardA.a = 0;
      SciSim.tween(S.cardA, { s: 1 }, { duration: 0.25, ease: 'outBack' });
      SciSim.tween(S.cardA, { a: 1 }, { duration: 0.2, ease: 'outCubic' });
    }
    const kind = BODY[id].kind, hidden = S.subject === id && game && game.phase === 'active';
    S.opened.add(id);
    if (!hidden && !S.kinds.has(kind)) {
      S.kinds.add(kind);
      Sound.tone(880, 0.12, 'triangle', 0.08);
      views.forEach((V) => { const G = cardGeo(V.L), sl = G.slots[KIND_ORDER.indexOf(kind)]; ringFx(V, sl.x + sl.w / 2, sl.y + sl.h / 2, 22); });
    } else Sound.click();
  }
  function hitBody(L, p) {
    const X = xfMain(L);
    let best = null, bd = 1e9;
    const test = (id, x, y, r) => { const d = Math.hypot(p.x - x, p.y - y), hr = Math.max(r + 9, 20); if (d < hr && d / hr < bd) { bd = d / hr; best = id; } };
    test('sun', X.ox, X.oy, SUN_R * X.k);
    PLANETS.forEach((id) => test(id, SX(X, POS[id]), SY(X, POS[id]), PD[id].size * X.k * (BODY[id].ring ? 1.4 : 1)));
    MOONS.forEach((m) => { moonScreen(X, m, tmpP); test(m.id, tmpP.x, tmpP.y, m.size * X.k); });
    ['ceres', 'pluto', 'eris'].forEach((id) => test(id, SX(X, POS[id]), SY(X, POS[id]), DWARF_SIZE[id] * X.k));
    test('comet', SX(X, POS.comet), SY(X, POS.comet), 10);
    if (S.apophis) test('apophis', SX(X, POS.apophis), SY(X, POS.apophis), 3 * X.k);
    if (best) return { id: best };
    const mx = (p.x - X.ox) / X.s, my = (X.oy - p.y) / X.s, rr = Math.hypot(mx, my);
    if (rr > R_B0 - 8 && rr < R_B1 + 8) {
      let bi = -1, bdd = 1e9;
      ROCKS.forEach((R, i) => { const th = R.th0 + R.w * S.time; const d = Math.hypot(X.ox + Math.cos(th) * R.rad * X.s - p.x, X.oy - Math.sin(th) * R.rad * X.s - p.y); if (d < bdd) { bdd = d; bi = i; } });
      return { id: 'asteroid', rock: bi };
    }
    return null;
  }
  function inMain(L, p) { const M = L.main; return p.x >= M.x && p.x <= M.x + M.w && p.y >= M.y && p.y <= M.y + M.h; }
  function cometHit(L, p) {
    if (!on('comet') || S.scene !== 'map') return false;
    const X = xfMain(L), x = SX(X, POS.comet), y = SY(X, POS.comet);
    return Math.hypot(p.x - x, p.y - y) < 30;
  }
  function cometTargetE(L, p) {
    const X = xfMain(L), mx = (p.x - X.ox) / X.s, my = (X.oy - p.y) / X.s, o = ORB.comet;
    const cur = cSpring.target, tmp = {};
    let best = cur, bc = 1e18;
    for (let i = -90; i <= 90; i++) {
      const E = cur + i / 90 * Math.PI;
      o.at(E, tmp);
      const c = (tmp.x - mx) * (tmp.x - mx) + (tmp.y - my) * (tmp.y - my) + Math.pow((E - cur) * 26, 2);
      if (c < bc) { bc = c; best = E; }
    }
    return best;
  }
  function tokenHit(L, p) {
    const T = L.tok;
    for (let i = CARDS.length - 1; i >= 0; i--) {
      const c = CARDS[i];
      if (c.where !== 'tray') continue;
      const s = slotPos(L, c.slot);
      if (Math.abs(p.x - s.x) < T.w / 2 + 4 && Math.abs(p.y - s.y) < T.h / 2 + 4) return c;
    }
    return null;
  }
  function basketAt(L, x, y) {
    const G = keyGeo(L);
    let best = null, bd = 1e9;
    BASKETS.forEach((b) => {
      const N = G.nodes['b:' + b];
      if (Math.abs(x - N.cx) < N.w / 2 + 12 && y > N.top - 26 && y < N.bottom + 16) { const d = Math.abs(x - N.cx); if (d < bd) { bd = d; best = b; } }
    });
    return best;
  }
  function attachPointer(V) {
    const { v, L } = V;
    let drag = null;
    SciSim.pointer(v, {
      hover(p) {
        if (S.scene === 'key') return tokenHit(L, p) ? 'grab' : null;
        if (!inMain(L, p)) return null;
        if (cometHit(L, p) && (S.panel === 'comet' || (game && game.free))) return 'grab';
        return on('cards') || S.panel === 'lens' ? (hitBody(L, p) ? 'pointer' : null) : null;
      },
      down(p) {
        if (S.scene === 'key') {
          if (!on('sorter')) return false;
          const c = tokenHit(L, p);
          if (!c) return false;
          const s = slotPos(L, c.slot);
          c.where = 'drag'; c.dragL = L.key; S.sortTouched = true;
          c.sx.value = s.x; c.sy.value = s.y; c.sx.velocity = c.sy.velocity = 0;
          c.grab = { x: p.x - s.x, y: p.y - s.y };
          c.sx.target = s.x; c.sy.target = s.y;
          drag = { type: 'card', c };
          Sound.tone(620, 0.05, 'triangle', 0.05);
          v.canvas.style.cursor = 'grabbing';
          return true;
        }
        if (!inMain(L, p)) return false;
        if (cometHit(L, p) && (S.panel === 'comet' || (game && game.free))) {
          setPlaying(false);
          S.cDrag = true; S.cTouched = true; cSpringActive = true;
          cSpring.value = S.cE; cSpring.target = S.cE; cSpring.velocity = 0;
          drag = { type: 'comet' };
          v.canvas.style.cursor = 'grabbing';
          return true;
        }
        if (S.panel === 'lens') {
          const X = xfMain(L), mx = (p.x - X.ox) / X.s, my = (X.oy - p.y) / X.s;
          S.lens = { x: mx, y: my };
          const reg = regionOf(Math.hypot(mx, my));
          S.lensInfo = { name: reg.name, belt: reg.belt, count: lensCount(mx, my, lensGeo(L).r / (X.s * 4)) };
          S.beltTried++;
          if (reg.belt && !S.beltFound) { S.beltFound = true; Sound.tone(880, 0.12, 'triangle', 0.08); views.forEach((W) => { const G = lensGeo(W.L); ringFx(W, G.cx, G.cy, G.r * 0.6); }); }
          else Sound.click();
          ringFx(V, p.x, p.y, 10, '#5eead4');
          return false;
        }
        if (!on('cards')) return false;
        const h = hitBody(L, p);
        if (!h) return false;
        openCard(h.id, h.rock);
        const bp = h.id === 'asteroid' ? p : bodyScreen(L, h.id, { x: 0, y: 0 });
        ringFx(V, bp.x, bp.y, Math.max(8, h.id === 'asteroid' ? 6 : bodyRadius(L, h.id)), '#5eead4');
        return false;
      },
      move(p) {
        if (!drag) return;
        if (drag.type === 'card') {
          const c = drag.c;
          c.sx.target = p.x - c.grab.x; c.sy.target = p.y - c.grab.y;
          S.hoverBasket = basketAt(L, c.sx.target, c.sy.target);
        } else if (drag.type === 'comet') {
          cSpring.target = cometTargetE(L, p);
        }
      },
      up(p) {
        v.canvas.style.cursor = '';
        if (!drag) return;
        if (drag.type === 'card') {
          const c = drag.c, b = basketAt(L, c.sx.target, c.sy.target);
          S.hoverBasket = null;
          if (b) startPath(c, b, L, c.sx.value, c.sy.value);
          else startReturn(c, L, { x: c.sx.value, y: c.sy.value });
        } else if (drag.type === 'comet') {
          S.cDrag = false;
        }
        drag = null;
      },
    });
    // 휴대폰: 끌 수 있는 대상을 누른 경우가 아니면 페이지를 넘길 수 있게
    if (L.key === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (!tc) return;
        const p = v.toLocal(tc);
        // pointerdown은 touchstart보다 먼저 일어나므로, 이미 끌기가 시작됐으면(drag) 페이지 스크롤을 막아요
        if (drag || (S.scene === 'key' && tokenHit(L, p)) || (S.scene === 'map' && cometHit(L, p) && (S.panel === 'comet' || (game && game.free)))) e.preventDefault();
      }, { passive: false });
    }
  }

  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#070d1f' });
    L.starsMain = makeStars(L.main, 110, k === 'wide' ? 7 : 11);
    L.starsPanel = makeStars(L.panel, 30, k === 'wide' ? 23 : 29);
    L.starsBox = makeStars({ x: L.panel.x, y: L.panel.y, w: L.panel.w, h: 220 }, 26, 41);
    const V = { v, L, fx: [], dust: [], P: new SciSim.Particles() };
    attachPointer(V);
    return V;
  });

  /* =========================================================
     퀴즈 그림 (SVG)
     ========================================================= */
  const SVG_OPEN = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FONT.replace(/"/g, '') + '\'>';
  const sGrad = (id, c0, c1) => '<radialGradient id="' + id + '" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="' + c0 + '"/><stop offset="1" stop-color="' + c1 + '"/></radialGradient>';
  function svgRock(cx, cy, r, seed, fill) {
    const sh = rockShape(seed), n = sh.f.length;
    let d = '';
    for (let i = 0; i < n; i++) { const a = i / n * TAU + seed, rr = r * sh.f[i]; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr * 1.08).toFixed(1) + ',' + (cy + Math.sin(a) * rr * 0.86).toFixed(1); }
    return '<path d="' + d + 'Z" fill="' + fill + '"/>';
  }
  const FIG = {};
  FIG.size = (function () {
    let s = SVG_OPEN(320, 150, '가니메데와 수성의 크기 비교') + '<defs>' + sGrad('fgG', '#cfc3b2', '#5d5248') + sGrad('fgM', '#d4cec6', '#55514c') + '</defs>';
    s += '<rect width="320" height="150" rx="12" fill="#0e1838"/>';
    s += '<circle cx="92" cy="66" r="28.4" fill="url(#fgG)"/><circle cx="228" cy="66" r="26.3" fill="url(#fgM)"/>';
    s += '<circle cx="84" cy="58" r="5" fill="#000" opacity=".15"/><circle cx="102" cy="76" r="4" fill="#000" opacity=".15"/><circle cx="222" cy="74" r="4" fill="#000" opacity=".18"/><circle cx="236" cy="56" r="3" fill="#000" opacity=".18"/>';
    s += '<text x="92" y="116" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">가니메데</text><text x="92" y="136" text-anchor="middle" font-size="13" fill="#c7d3f2">지름 5,268 km</text>';
    s += '<text x="228" y="116" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">수성</text><text x="228" y="136" text-anchor="middle" font-size="13" fill="#c7d3f2">지름 4,879 km</text>';
    s += '<text x="160" y="72" text-anchor="middle" font-size="22" font-weight="800" fill="#ffd36b">&gt;</text>';
    return s + '</svg>';
  })();
  FIG.pluto = (function () {
    let s = SVG_OPEN(320, 150, '명왕성 궤도 주변에 있는 비슷한 천체들') + '<defs>' + sGrad('fgP', '#efdcc4', '#7d6550') + '</defs>';
    s += '<rect width="320" height="150" rx="12" fill="#0e1838"/>';
    s += '<path d="M10,150 A300,300 0 0 1 250,8" fill="none" stroke="#a0beff" stroke-opacity=".45" stroke-dasharray="3 5"/>';
    s += '<path d="M60,150 A300,300 0 0 1 310,30" fill="none" stroke="#d6b8ff" stroke-opacity=".7" stroke-dasharray="5 5"/>';
    const r = rng(5);
    for (let i = 0; i < 46; i++) { const a = 1.25 + r() * 1.05, rad = 268 + (r() - 0.5) * 70; const x = 330 - 300 + Math.cos(Math.PI + a) * -rad + 0, y = 330 - Math.sin(a) * rad - 0; if (x > 6 && x < 314 && y > 6 && y < 144) s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (1 + r() * 2).toFixed(1) + '" fill="#cdd6ea" opacity=".75"/>'; }
    s += '<circle cx="190" cy="84" r="12" fill="url(#fgP)"/>';
    s += '<text x="190" y="116" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">명왕성</text>';
    s += '<text x="14" y="24" font-size="13" font-weight="700" fill="#c7d3f2">해왕성 궤도 바깥쪽</text>';
    s += '<text x="306" y="140" text-anchor="end" font-size="13" font-weight="700" fill="#e9d5ff">궤도 주변의 비슷한 천체들</text>';
    return s + '</svg>';
  })();
  FIG.tail = (function () {
    // 궤도 위 세 곳 (가)~(다): 꼬리는 늘 태양 반대쪽, 노란 화살표는 움직이는 방향
    const W = 360, H = 244, cx = 196, cy = 100, a = 146, b = 74, c = Math.sqrt(a * a - b * b), sx = cx - c, sy = cy;
    let s = SVG_OPEN(W, H, '타원 궤도의 세 곳에 있는 혜성, 움직이는 방향과 꼬리') + '<defs>';
    s += '<radialGradient id="fgS"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffbf47"/><stop offset="1" stop-color="#ff9a2e" stop-opacity="0"/></radialGradient>';
    s += '<filter id="fgB" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>';
    s += '<marker id="fgA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#fde68a"/></marker></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0e1838"/>';
    const st = rng(31);
    for (let i = 0; i < 26; i++) s += '<circle cx="' + (st() * W).toFixed(0) + '" cy="' + (st() * H).toFixed(0) + '" r="' + (0.5 + st() * 0.9).toFixed(1) + '" fill="#fff" opacity="' + (0.25 + st() * 0.4).toFixed(2) + '"/>';
    s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + a + '" ry="' + b + '" fill="none" stroke="#96e2ff" stroke-opacity=".5" stroke-dasharray="4 5"/>';
    s += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy + '" r="26" fill="url(#fgS)"/><circle cx="' + sx.toFixed(1) + '" cy="' + sy + '" r="10" fill="#ffcf5a"/>';
    s += '<text x="' + sx.toFixed(1) + '" y="' + (sy - 22) + '" text-anchor="middle" font-size="14" font-weight="800" fill="#ffd36b">태양</text>';
    // 타원 위의 점: 중심 기준 각 φ (화면에서 반시계로 움직임)
    [[0.85, '(가)', 44], [3.62, '(나)', 78], [4.78, '(다)', 58]].forEach(([ph, lab, len]) => {
      const x = cx + a * Math.cos(ph), y = cy - b * Math.sin(ph);
      const vx = -a * Math.sin(ph), vy = -b * Math.cos(ph), vl = Math.hypot(vx, vy);
      const tx = x - sx, ty = y - sy, tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl, qx = -uy, qy = ux;
      const ex = x + ux * len, ey = y + uy * len, w = len * 0.2 + 3;
      // 꼬리 (부드러운 번짐)
      s += '<linearGradient id="fgT' + lab.charCodeAt(1) + '" gradientUnits="userSpaceOnUse" x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '"><stop offset="0" stop-color="#eaf5ff" stop-opacity=".95"/><stop offset=".55" stop-color="#bfe0ff" stop-opacity=".45"/><stop offset="1" stop-color="#9fd0ff" stop-opacity="0"/></linearGradient>';
      s += '<g filter="url(#fgB)"><path d="M' + (x + qx * 3.5).toFixed(1) + ',' + (y + qy * 3.5).toFixed(1) + ' L' + (ex + qx * w).toFixed(1) + ',' + (ey + qy * w).toFixed(1) + ' L' + (ex - qx * w).toFixed(1) + ',' + (ey - qy * w).toFixed(1) + ' L' + (x - qx * 3.5).toFixed(1) + ',' + (y - qy * 3.5).toFixed(1) + ' Z" fill="url(#fgT' + lab.charCodeAt(1) + ')"/></g>';
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5.5" fill="#fff"/><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="11" fill="#cfe8ff" opacity=".28"/>';
      // 움직이는 방향 화살표
      const ax = x + vx / vl * 30, ay = y + vy / vl * 30;
      s += '<line x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + ax.toFixed(1) + '" y2="' + ay.toFixed(1) + '" stroke="#fde68a" stroke-width="2.4" stroke-linecap="round" marker-end="url(#fgA)"/>';
      // 이름표: 꼬리·화살표의 반대쪽 위쪽 모서리에
      const lx = x - ux * 2 + (vy / vl) * 0, ly = y;
      const side = (qy * 1 > 0 ? -1 : 1);
      s += '<text x="' + (x + qx * 24 * side * -1 * -1).toFixed(1) + '" y="' + (y + qy * 24 * side + 5).toFixed(1) + '" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" stroke="#0e1838" stroke-width="3" paint-order="stroke">' + lab + '</text>';
      void lx; void ly;
    });
    s += '<line x1="14" y1="228" x2="40" y2="228" stroke="#fde68a" stroke-width="2.4" stroke-linecap="round" marker-end="url(#fgA)"/><text x="48" y="233" font-size="13" font-weight="700" fill="#fde68a">움직이는 방향</text>';
    s += '<g filter="url(#fgB)"><rect x="168" y="223" width="26" height="9" rx="4.5" fill="#cfe8ff" opacity=".8"/></g><text x="202" y="233" font-size="13" font-weight="700" fill="#d7ecff">혜성의 꼬리</text>';
    return s + '</svg>';
  })();
  function journal(no, title, body, mini) {
    let s = SVG_OPEN(320, 158, '탐사 일지 ' + no + ': ' + title);
    s += '<defs>' + sGrad('fjE', '#f4f2ee', '#8d8a86') + sGrad('fjU', '#f2ead8', '#9b8a6c') + sGrad('fjJ', '#f0d9b6', '#9a6d45') + sGrad('fjA', '#a59a8c', '#3d352d') + sGrad('fjEa', '#7cc0ff', '#1f5fb6') + '</defs>';
    s += '<rect width="320" height="158" rx="12" fill="#f6efe0"/><rect x="0" y="0" width="320" height="30" rx="12" fill="#e8dcc2"/><rect x="0" y="18" width="320" height="12" fill="#e8dcc2"/>';
    for (let i = 0; i < 5; i++) s += '<line x1="12" y1="' + (52 + i * 22) + '" x2="308" y2="' + (52 + i * 22) + '" stroke="#d9cbb0" stroke-width="1"/>';
    s += '<text x="12" y="21" font-size="14" font-weight="800" fill="#5b4320">🛰️ 탐사 일지 ' + no + '</text><text x="308" y="21" text-anchor="end" font-size="14" font-weight="800" fill="#3b2a12">' + title + '</text>';
    s += '<rect x="12" y="38" width="128" height="110" rx="10" fill="#0e1838"/>' + body;
    s += '<rect x="150" y="38" width="158" height="110" rx="10" fill="#0e1838"/>' + mini;
    return s + '</svg>';
  }
  FIG.eris = (function () {
    let body = '<circle cx="76" cy="90" r="34" fill="url(#fjE)"/><circle cx="66" cy="82" r="6" fill="#000" opacity=".1"/><circle cx="88" cy="100" r="5" fill="#000" opacity=".1"/><text x="76" y="142" text-anchor="middle" font-size="13" font-weight="700" fill="#c7d3f2">둥근 모양</text>';
    let mini = '<circle cx="164" cy="140" r="7" fill="#ffcf5a"/>';
    [40, 60, 84, 106].forEach((r) => { mini += '<path d="M' + (164 + r) + ',140 A' + r + ',' + r + ' 0 0 0 ' + 164 + ',' + (140 - r) + '" fill="none" stroke="#a0beff" stroke-opacity=".45" stroke-dasharray="3 4"/>'; });
    const rr = rng(9);
    for (let i = 0; i < 22; i++) { const a = rr() * 1.45 + 0.05, d = 118 + rr() * 26; const x = 164 + Math.cos(a) * d, y = 140 - Math.sin(a) * d; if (x < 304 && y > 42) mini += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.8 + rr() * 1.4).toFixed(1) + '" fill="#cdd6ea" opacity=".75"/>'; }
    mini += '<circle cx="256" cy="66" r="5" fill="#f4f2ee" stroke="#ffd36b" stroke-width="2"/><text x="252" y="56" text-anchor="end" font-size="13" font-weight="800" fill="#ffd36b">?</text>';
    mini += '<text x="300" y="144" text-anchor="end" font-size="13" font-weight="700" fill="#c7d3f2">해왕성 바깥</text>';
    return journal('①', '에리스', body, mini);
  })();
  FIG.europa = (function () {
    let body = '<circle cx="76" cy="88" r="34" fill="url(#fjU)"/>';
    for (let i = 0; i < 4; i++) body += '<path d="M' + (44 + i * 6) + ',' + (70 + i * 13) + ' C66,' + (60 + i * 14) + ' 86,' + (98 + i * 6) + ' ' + (108 - i * 2) + ',' + (78 + i * 12) + '" fill="none" stroke="#9b5a30" stroke-opacity=".55" stroke-width="1.6"/>';
    body += '<text x="76" y="142" text-anchor="middle" font-size="13" font-weight="700" fill="#c7d3f2">얼음 표면</text>';
    let mini = '<circle cx="229" cy="93" r="18" fill="url(#fjJ)"/><rect x="211" y="86" width="36" height="4" fill="#b98a62" opacity=".6"/><rect x="211" y="96" width="36" height="4" fill="#b98a62" opacity=".6"/>';
    [26, 36, 48, 62].forEach((r, i) => { mini += '<circle cx="229" cy="93" r="' + r + '" fill="none" stroke="#a0beff" stroke-opacity=".35" stroke-dasharray="2 4"/>'; const a = [0.6, 2.4, 3.9, 5.4][i]; mini += '<circle cx="' + (229 + Math.cos(a) * r).toFixed(1) + '" cy="' + (93 - Math.sin(a) * r * 0.8).toFixed(1) + '" r="' + (i === 1 ? 4.5 : 3) + '" fill="' + (i === 1 ? '#f2ead8' : '#b8ad9c') + '"' + (i === 1 ? ' stroke="#ffd36b" stroke-width="2"' : '') + '/>'; });
    mini += '<text x="229" y="144" text-anchor="middle" font-size="13" font-weight="700" fill="#c7d3f2">목성 둘레를 돌아요</text>';
    return journal('②', '유로파', body, mini);
  })();
  FIG.apophis = (function () {
    let body = svgRock(76, 86, 34, 13, 'url(#fjA)') + '<circle cx="66" cy="78" r="5" fill="#000" opacity=".2"/><circle cx="90" cy="94" r="4" fill="#000" opacity=".2"/>';
    body += '<text x="76" y="142" text-anchor="middle" font-size="13" font-weight="700" fill="#c7d3f2">약 340 m 바위</text>';
    let mini = '<circle cx="214" cy="96" r="13" fill="url(#fjEa)"/><circle cx="214" cy="96" r="34" fill="none" stroke="#a0beff" stroke-opacity=".35" stroke-dasharray="2 4"/><circle cx="244" cy="80" r="3.5" fill="#c9c6bf"/>';
    mini += '<path d="M160,140 Q214,60 300,52" fill="none" stroke="#ffd36b" stroke-width="2" stroke-dasharray="5 4"/>';
    mini += svgRock(250, 66, 4.5, 13, '#a59a8c');
    mini += '<text x="214" y="122" text-anchor="middle" font-size="13" font-weight="700" fill="#d6e6ff">지구</text>';
    mini += '<text x="300" y="144" text-anchor="end" font-size="13" font-weight="700" fill="#ffd36b">2029년 4월 13일</text>';
    return journal('③', '아포피스', body, mini);
  })();

  /* =========================================================
     단계별 학습
     ========================================================= */
  function prep() { setPlaying(false); }
  game = SciSim.game({
    simId: 'm1-solar-members',
    mount: '#game',
    badge: '태양계 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      map: '🗺️ 태양계 지도',
      cards: '🪪 천체 카드',
      sorter: '🔑 분류 열쇠',
      belt: '🔍 확대 창 (소행성대)',
      comet: '☄️ 혜성 따라가기',
    },
    onFeatures(set) {
      FEAT = set;
      if (!set.has('map')) setPlaying(false);
      syncControls();
    },
    onMissionStart() { if (S.subject && S.card === S.subject) S.card = null; S.subject = null; S.apophis = false; S.beltHint = false; },
    onHint(m) { if (m.beltHint) S.beltHint = true; },
    onComplete() {
      if (S.subject && S.card === S.subject) S.card = null;
      S.subject = null; S.apophis = false; S.panel = 'card'; S.beltHint = false;
      setPlaying(false); setScene('map'); setView('inner');
    },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '태양계 둘러보기', short: '둘러보기', icon: '🪐', phase: '관찰',
        features: ['map', 'cards'],
        intro: '<p class="si-q">❓ 탐구 질문: 태양계에는 태양과 행성 말고 어떤 천체들이 있을까?</p>' +
          '<p>위에서 내려다본 <b>태양계 지도</b>를 둘러보며 천체를 눌러 <b>천체 카드</b>를 모아 봐요.</p>',
        setup() { prep(); S.panel = 'card'; setScene('map'); setView('inner'); },
        recap: '태양계는 스스로 빛을 내는 <b>태양</b>과 그 둘레를 도는 여러 천체로 이루어져 있어요.',
        summary: '<ul><li>태양계 = <b>태양</b> + 태양 둘레를 도는 <b>행성 8개</b>와 <b>왜소행성·소행성·혜성</b> + 행성 둘레를 도는 <b>위성</b></li>' +
          '<li>태양계에서 <b>스스로 빛을 내는 천체는 태양뿐</b>이에요. 태양은 태양계 전체 질량의 약 <b>99.8 %</b>를 차지해요.</li></ul>',
        missions: [
          {
            title: '🪪 천체 카드 모으기',
            goal: '지도의 천체를 눌러 <b>여섯 종류</b>(태양·행성·왜소행성·소행성·위성·혜성)의 카드를 모두 모아 보세요.',
            hint: '혜성·명왕성은 <b>\'전체 태양계\'</b> 보기에서 찾아요. 아주 작은 돌 조각들도 눌러 보세요.',
            setup() { prep(); S.panel = 'card'; setScene('map'); S.kinds = new Set(); S.opened = new Set(); S.card = null; S.mapHint = true; syncControls(); },
            check: () => S.kinds.size >= 6,
            hold: 0.3,
            status: () => KIND_ORDER.map((k) => chk(S.kinds.has(k), KIND[k].name)).join(' · '),
            explain: '태양계는 <b>태양</b>과 그 둘레를 도는 <b>행성·왜소행성·소행성·혜성</b>, 그리고 행성 둘레를 도는 <b>위성</b>으로 이루어져 있어요.',
          },
          {
            type: 'quiz',
            title: '✨ 스스로 빛나는 천체',
            goal: '태양계의 천체 중 <b>스스로 빛을 내는</b> 천체는 무엇일까요?',
            setup() { S.panel = 'card'; setScene('map'); },
            choices: ['목성 — 가장 큰 행성이라서', '달 — 밤하늘에서 가장 밝아서', '태양', '혜성 — 꼬리가 빛나서'],
            answer: 2,
            feedback: [
              '목성은 크지만 스스로 빛을 내지 못해요. <b>햇빛을 반사</b>해서 밝게 보여요.',
              '달이 밝은 까닭은 <b>햇빛을 반사</b>하기 때문이에요. 스스로 빛을 내지는 못해요.',
              '',
              '혜성의 꼬리도 <b>햇빛을 받아</b> 빛나는 거예요. 스스로 빛을 내지는 못해요.',
            ],
            explain: '태양은 태양계에서 <b>유일하게 스스로 빛을 내는 별</b>이에요. 태양계 전체 질량의 약 <b>99.8 %</b>를 차지해요. 행성·위성·혜성은 햇빛을 반사해서 밝게 보여요.',
          },
        ],
      },
      /* ---------- 2단계 · 탐구 ---------- */
      {
        title: '분류 기준 찾기', short: '분류 기준', icon: '🔑', phase: '탐구',
        features: ['sorter'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양계의 여러 천체 카드를 모았어요.</div>' +
          '<p>이 천체들은 <b>무엇을 기준으로</b> 나눌 수 있을까요? <b>분류 열쇠</b>의 질문을 따라가며 카드를 알맞은 바구니에 넣어 봐요.</p>',
        setup() { prep(); S.panel = 'tray'; resetCards(); setScene('key'); },
        recap: '천체는 <b>무엇의 둘레를 도는지</b>, <b>둥근지</b>, <b>꼬리가 생기는지</b>, <b>궤도 주변을 치웠는지</b>로 분류해요.',
        summary: '<span class="formula">무엇의 둘레를 도나? → 둥근가? → 꼬리 / 궤도 주변을 치웠나?</span>' +
          '<ul><li><b>행성</b>: 태양 둘레를 돌고, 둥글고, 궤도 주변의 다른 천체를 치운 천체 (8개)</li>' +
          '<li><b>왜소행성</b>: 태양 둘레를 돌고 둥글지만, 궤도 주변을 치우지 못한 천체 (명왕성·세레스·에리스 등)</li>' +
          '<li><b>소행성</b>: 태양 둘레를 도는 모양이 불규칙한 작은 천체</li>' +
          '<li><b>혜성</b>: 얼음과 먼지로 되어 있고, 태양에 가까워지면 꼬리가 생기는 천체</li>' +
          '<li><b>위성</b>: 행성 둘레를 도는 천체 (달, 가니메데 등)</li></ul>' +
          '<p class="note">분류 기준은 크기가 아니라 <b>무엇의 둘레를 도는가</b>예요.</p>',
        missions: [
          {
            title: '🗂️ 천체 분류하기',
            goal: '카드 6장(달·화성·명왕성·베스타·핼리 혜성·가니메데)을 끌어 <b>알맞은 바구니</b>에 넣어 보세요.',
            hint: '첫 질문부터 차례로 따져요. <b>무엇의 둘레를 도나요?</b> → 행성 둘레를 돌면 위성이에요. 태양 둘레를 돌면 모양을 살펴봐요.',
            setup() { prep(); S.panel = 'tray'; setScene('key'); if (sortedCount() >= 6) resetCards(); },
            check: () => sortedCount() >= 6,
            hold: 0.4,
            status: () => '분류한 카드: <b>' + sortedCount() + ' / 6</b> · ' + CARDS.map((c) => chk(c.where === 'placed', c.name)).join(' · '),
            explain: '<b>달·가니메데</b>는 행성 둘레를 도는 <b>위성</b>, <b>화성</b>은 <b>행성</b>, <b>명왕성</b>은 궤도 주변을 치우지 못한 <b>왜소행성</b>, <b>베스타</b>는 모양이 불규칙한 <b>소행성</b>, <b>핼리 혜성</b>은 태양 가까이에서 꼬리가 생기는 <b>혜성</b>이에요.',
          },
          {
            type: 'quiz',
            title: '🤔 수성보다 큰 위성?',
            goal: '목성의 <b>가니메데</b>(지름 5,268 km)는 행성인 <b>수성</b>(지름 4,879 km)보다 커요. 그런데도 가니메데가 <b>위성</b>인 까닭은?',
            figure: FIG.size,
            setup() { S.panel = 'tray'; setScene('key'); placeAll(); },
            choices: ['스스로 빛을 내지 못해서', '목성 둘레를 돌기 때문에', '둥근 모양이 아니어서', '크기가 작아서'],
            answer: 1,
            feedback: [
              '행성도 스스로 빛을 내지 못해요. 빛은 분류 기준이 아니에요.',
              '',
              '가니메데는 <b>둥근</b> 천체예요. 분류 열쇠의 첫 질문을 다시 보세요.',
              '가니메데는 수성보다 <b>커요</b>! 크기는 분류 기준이 아니에요.',
            ],
            explain: '분류 기준은 크기가 아니라 <b>무엇의 둘레를 도는가</b>예요. 가니메데는 <b>목성 둘레</b>를 돌기 때문에 위성이에요.',
          },
          {
            type: 'quiz',
            title: '🟣 명왕성은 왜 왜소행성일까?',
            goal: '명왕성은 예전에 행성으로 불렸지만, 지금은 <b>왜소행성</b>으로 분류해요. 그 까닭은?',
            figure: FIG.pluto,
            setup() { S.panel = 'tray'; setScene('key'); placeAll(); },
            choices: ['태양 둘레를 돌지 않아서', '둥근 모양이 아니어서', '위성이 없어서', '태양 둘레를 돌고 둥글지만, 궤도 주변의 다른 천체를 치우지 못해서'],
            answer: 3,
            feedback: [
              '명왕성은 <b>태양 둘레</b>를 돌아요.',
              '명왕성은 <b>둥근</b> 모양이에요.',
              '명왕성에도 위성이 있어요. 위성이 있는지는 분류 기준이 아니에요.',
              '',
            ],
            explain: '명왕성은 태양 둘레를 돌고 둥글지만, 궤도 주변에 비슷한 천체가 많아 <b>궤도 주변을 치우지 못했어요</b>. 그래서 <b>2006년 국제천문연맹</b>이 왜소행성으로 분류했어요. 명왕성이 사라진 게 아니라 <b>분류만 바뀐</b> 거예요.',
          },
        ],
      },
      /* ---------- 3단계 · 모형 ---------- */
      {
        title: '소행성과 혜성', short: '소행성·혜성', icon: '☄️', phase: '모형',
        features: ['belt', 'comet'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소행성과 혜성은 둥글지 않은 작은 천체라는 것을 알았어요.</div>' +
          '<p>이 작은 천체들은 <b>어디에</b> 있고 <b>어떻게</b> 움직일까요? 태양계 모형에서 찾아봐요.</p>',
        setup() { prep(); S.panel = 'lens'; setScene('map'); setView('inner'); S.lens = null; S.lensInfo = null; S.beltFound = false; },
        recap: '소행성은 주로 <b>화성과 목성 궤도 사이</b>에 있고, 혜성은 태양에 가까워질 때 <b>태양 반대쪽</b>으로 꼬리가 생겨요.',
        summary: '<ul><li><b>소행성</b>은 대부분 <b>화성과 목성 궤도 사이</b>(소행성대)에 모여 있고, 모양이 불규칙해요.</li>' +
          '<li><b>혜성</b>은 얼음과 먼지로 되어 있고, 길쭉한 타원 궤도를 돌아요.</li>' +
          '<li>태양에 가까워지면 얼음이 기체가 되어 <b>코마와 꼬리</b>가 생기고, 꼬리는 늘 <b>태양 반대쪽</b>을 향해요. 멀어지면 꼬리가 사라져요.</li></ul>',
        missions: [
          {
            title: '🪨 소행성대 찾기',
            goal: '지도에서 <b>소행성이 가장 많이 모인 곳</b>을 눌러 보세요. 오른쪽 <b>확대 창</b>으로 확인할 수 있어요.',
            hint: '안쪽 행성들의 궤도와 <b>목성 궤도</b> 사이를 차례로 눌러 확대 창 속 소행성 수를 비교해 보세요.',
            beltHint: true,
            setup() { prep(); S.panel = 'lens'; setScene('map'); setView('inner'); S.lens = null; S.lensInfo = null; S.beltFound = false; syncControls(); },
            check: () => S.beltFound,
            hold: 0.3,
            status: () => S.lensInfo ? '누른 곳: <b>' + S.lensInfo.name + '</b> · 창 속 소행성 <b>' + S.lensInfo.count + '개</b>' : '지도를 눌러 확대 창을 살펴보세요.',
            explain: '소행성은 대부분 <b>화성과 목성 궤도 사이</b>에 띠처럼 모여 있어요. 이곳을 <b>소행성대</b>라고 해요. 소행성은 크기가 작고 <b>모양이 불규칙</b>해요.',
          },
          {
            title: '☄️ 혜성 따라가기',
            goal: '혜성을 끌어 궤도를 따라 옮겨 보세요. <b>목성 궤도 밖 → 태양 가까이 → 다시 멀리</b> 가는 동안 꼬리를 살펴봐요.',
            hint: '혜성을 누른 채 밝은 점선 궤도를 따라 태양 쪽으로 끌어요. 태양을 돌아 반대쪽으로 다시 멀어지게 해요.',
            setup() {
              prep(); S.panel = 'comet'; setScene('map'); setView('comet');
              S.cE = Math.PI; cSpring.value = cSpring.target = S.cE; cSpring.velocity = 0; cSpringActive = false;
              S.peri = false; S.outAgain = false; S.cTouched = false; syncControls();
            },
            check: () => S.peri && S.outAgain,
            hold: 0.4,
            status: () => {
              const cp = POS.comet, r = Math.hypot(cp.x, cp.y, cp.z), f = cometActivity(r), n = Math.round(f * 5);
              return [chk(true, '목성 궤도 밖'), chk(S.peri, '태양 가까이'), chk(S.outAgain, '다시 멀리')].join(' · ') +
                '<br>태양과의 거리: <b>' + (r < R_25 ? '가깝다' : '멀다') + '</b> · 꼬리 ' + '▮'.repeat(n) + '▯'.repeat(5 - n);
            },
            explain: '혜성은 <b>얼음과 먼지</b>로 되어 있어요. 태양에 가까워지면 얼음이 태양열을 받아 기체가 되면서 <b>코마</b>와 <b>꼬리</b>가 생기고, 태양에서 멀어지면 꼬리가 사라져요.',
          },
          {
            type: 'quiz',
            title: '🧭 꼬리의 방향',
            goal: '그림은 궤도의 세 곳 (가)~(다)에 있는 혜성과 움직이는 방향이에요. 혜성의 꼬리는 어느 쪽을 향할까요?',
            figure: FIG.tail,
            setup() { S.panel = 'comet'; setScene('map'); setView('comet'); setPlaying(true); },
            choices: ['항상 움직이는 방향의 뒤쪽을 향한다', '항상 화면의 아래쪽을 향한다', '항상 태양 반대쪽을 향한다', '항상 태양 쪽을 향한다'],
            answer: 2,
            feedback: [
              '자동차 배기가스처럼 뒤로 끌리는 게 아니에요. (다)처럼 태양에서 <b>멀어질 때는 꼬리가 앞장서요</b>.',
              '우주에는 위아래가 없어요. 꼬리의 방향은 <b>태양의 위치</b>로 정해져요.',
              '',
              '꼬리는 태양 쪽에서 밀려나 태양 <b>반대쪽</b>으로 뻗어요. 지도에서 혜성을 다시 살펴보세요.',
            ],
            explain: '혜성의 꼬리는 늘 <b>태양 반대쪽</b>을 향해요. 그래서 태양에 다가갈 때는 꼬리가 뒤에 있지만, 태양에서 <b>멀어질 때는 꼬리가 혜성보다 앞장서요</b>.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '새 천체 분류하기', short: '새 천체', icon: '🛰️', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 분류 열쇠로 천체를 나누고, 소행성과 혜성의 모습을 살펴봤어요.</div>' +
          '<p>탐사선이 보내온 <b>탐사 일지</b>를 읽고, <b>분류 열쇠</b>로 새 천체를 분류해 봐요.</p>',
        setup() { prep(); S.panel = 'card'; setScene('map'); setView('full'); },
        recap: '분류 열쇠를 쓰면 새로 발견된 천체도 분류할 수 있어요.',
        summary: '<ul><li><b>에리스</b> → 태양 둘레를 돌고 둥글지만 궤도 주변을 치우지 못함 → <b>왜소행성</b></li>' +
          '<li><b>유로파</b> → 목성 둘레를 돎 → <b>위성</b></li>' +
          '<li><b>아포피스</b> → 태양 둘레를 도는 불규칙한 바위 → <b>소행성</b>. 지구 가까이 오는 소행성은 망원경으로 늘 감시해요.</li></ul>' +
          '<p class="note">밤하늘의 행성은 별처럼 보이지만 스스로 빛나지 않고 <b>햇빛을 반사</b>해요.</p>',
        missions: [
          {
            type: 'quiz',
            title: '🛰️ 탐사 일지 ① 에리스',
            goal: '<b>에리스</b>: 해왕성 바깥에서 <b>태양 둘레</b>를 돌고, <b>둥근</b> 모양이에요. 궤도 주변에 <b>비슷한 천체가 많아요</b>. 에리스는 무엇일까요?',
            figure: FIG.eris,
            setup() { prep(); S.panel = 'card'; setScene('map'); setView('full'); showSubject('eris'); },
            choices: ['행성', '왜소행성', '소행성', '혜성'],
            answer: 1,
            feedback: [
              '둥글고 태양 둘레를 돌지만, 궤도 주변에 비슷한 천체가 많아요. 궤도 주변을 <b>치우지 못했어요</b>.',
              '',
              '소행성은 모양이 <b>불규칙</b>한 작은 천체예요. 에리스는 둥근 모양이에요.',
              '혜성은 태양 가까이에서 꼬리가 생기는 얼음 천체예요. 에리스가 <b>둥근</b> 모양이라는 점에 주목해요.',
            ],
            explain: '에리스는 태양 둘레를 돌고 둥글지만 궤도 주변을 치우지 못해 <b>왜소행성</b>이에요. 명왕성과 같은 무리예요.',
          },
          {
            type: 'quiz',
            title: '🛰️ 탐사 일지 ② 유로파',
            goal: '<b>유로파</b>: <b>목성 둘레</b>를 돌고, 표면이 <b>얼음</b>으로 덮여 있어요. 유로파는 무엇일까요?',
            figure: FIG.europa,
            setup() { prep(); S.panel = 'card'; setScene('map'); showSubject('europa'); setView('jupiter'); },
            choices: ['행성', '왜소행성', '위성', '혜성'],
            answer: 2,
            feedback: [
              '유로파는 태양이 아니라 <b>목성 둘레</b>를 돌아요.',
              '왜소행성은 <b>태양 둘레</b>를 도는 천체예요.',
              '',
              '얼음이 있다고 모두 혜성은 아니에요. 분류 열쇠의 첫 질문은 <b>무엇의 둘레를 도나요?</b>예요.',
            ],
            explain: '유로파는 <b>행성(목성) 둘레</b>를 돌기 때문에 <b>위성</b>이에요. 1단계 지도에서 본 목성의 큰 위성 4개 중 하나예요.',
          },
          {
            type: 'quiz',
            title: '🛰️ 탐사 일지 ③ 아포피스',
            goal: '<b>아포피스</b>: 지름 약 <b>340 m</b>의 <b>불규칙한 바위</b> 덩어리로 <b>태양 둘레</b>를 돌아요. <b>2029년 4월 13일</b>에 지구에서 약 <b>3만 2천 km</b>까지 다가와요. 아포피스는 무엇일까요?',
            figure: FIG.apophis,
            setup() { prep(); S.panel = 'card'; setScene('map'); S.apophis = true; showSubject('apophis'); setView('earth'); },
            choices: ['위성', '소행성', '왜소행성', '혜성'],
            answer: 1,
            feedback: [
              '아포피스는 지구 둘레가 아니라 <b>태양 둘레</b>를 돌아요. 지구 가까이 지나갈 뿐이에요.',
              '',
              '왜소행성은 <b>둥근</b> 모양이에요. 아포피스는 불규칙한 바위 덩어리예요.',
              '꼬리가 생긴다는 기록이 없어요. 얼음이 아닌 <b>바위</b> 덩어리예요.',
            ],
            explain: '아포피스는 태양 둘레를 도는 <b>불규칙한 바위</b> 덩어리라서 <b>소행성</b>이에요. 지구 가까이 오는 소행성은 망원경으로 늘 <b>감시</b>해요.',
          },
        ],
      },
    ],
  });

  /* =========================================================
     움직임
     ========================================================= */
  function update(dt, t) {
    const pk = S.scene === 'key' ? 'tray' : S.panel;
    if (pk !== lastPanelKey) {
      if (lastPanelKey !== null) { S.panelT = 0; SciSim.tween(S, { panelT: 1 }, { duration: 0.45, ease: 'outCubic' }); }
      lastPanelKey = pk;
    }
    if (S.playing) {
      S.time += dt;
      if (!S.cDrag) { const o = ORB.comet, rev = Math.floor((S.cE + Math.PI) / TAU), Er = S.cE - rev * TAU; S.cE = kepler(Er - o.e * Math.sin(Er) + o.n * dt, o.e) + rev * TAU; }
    } else if (cSpringActive) {
      S.cE = cSpring.update(dt);
      if (!S.cDrag && cSpring.settled) cSpringActive = false;
    }
    computePositions();
    // 혜성 단계 기록 (끌거나 재생하며)
    if (S.panel === 'comet') {
      const cp = POS.comet, r = Math.hypot(cp.x, cp.y, cp.z);
      if (r < ORB.comet.rp + 20 && !S.peri) { S.peri = true; Sound.tone(880, 0.12, 'triangle', 0.08); views.forEach((V) => { const X = xfMain(V.L); ringFx(V, SX(X, cp), SY(X, cp), 14); }); }
      if (S.peri && r > R_25 && !S.outAgain) { S.outAgain = true; Sound.tone(988, 0.12, 'triangle', 0.08); views.forEach((V) => { const X = xfMain(V.L); ringFx(V, SX(X, cp), SY(X, cp), 14); }); }
    }
    updateCards(dt);
    const cp = POS.comet, f = cometActivity(Math.hypot(cp.x, cp.y, cp.z));
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) { updateDust(V, dt, f); V.P.update(dt); } });
  }
  computePositions();
  setView(S.view, true);
  let frameMs = 0;
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    frameMs += (performance.now() - t0 - frameMs) * 0.05;
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, CAM, CARDS, FIG, frameMs: () => frameMs, game: () => game,
    view: () => activeView(),
    // 화면(클라이언트) 좌표로 바꾸기
    client(L, x, y) { const V = views.find((q) => q.L === L) || activeView(); const r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    bodyClient(id) { const V = activeView(); const p = bodyScreen(V.L, id, { x: 0, y: 0 }); return this.client(V.L, p.x, p.y); },
    beltClient() { const V = activeView(), X = xfMain(V.L), a = 1.1, rr = (R_B0 + R_B1) / 2 * X.s; return this.client(V.L, X.ox + Math.cos(a) * rr, X.oy - Math.sin(a) * rr); },
    slotClient(i) { const V = activeView(), p = slotPos(V.L, i); return this.client(V.L, p.x, p.y); },
    basketClient(b) { const V = activeView(), N = keyGeo(V.L).nodes['b:' + b]; return this.client(V.L, N.cx, N.top + N.h / 2); },
    cometOrbitClient(E) { const V = activeView(), X = xfMain(V.L), p = {}; ORB.comet.at(E, p); return this.client(V.L, SX(X, p), SY(X, p)); },
    kindOf: (body) => BODY[body].kind,
  };
})();
