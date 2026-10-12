/* =========================================================
   중2 Ⅷ. 별과 우주 - 우리은하와 성운·성단  [9과15-02]
   탐구 흐름(4단계):
   ① 관찰: 여름·겨울 밤하늘의 은하수(여름이 더 밝고 넓음) → 은하수는 우리은하의 원반을 안에서 본 모습
   ② 모형: 회전하는 우리은하 모형 - 위에서(막대 나선) / 옆에서(볼록한 원반), 지름 약 10만 광년, 태양계는 중심에서 약 3만 광년
   ③ 탐구: 산개 성단 vs 구상 성단 (별 수·모양·색(나이)·위치) 카드 비교 → 분류
   ④ 적용: 방출·반사·암흑 성운의 빛 원리(빛 화살표) → 사진 분류
   하늘 계산: 은하 좌표(l, b) → 적도 좌표 → 서울(북위 37.5°)의 밤 10시 하늘. 여름 = 8월 초, 겨울 = 1월 중순.
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
  const V = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#050a1a' });
  const ctx = V.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  let game = null;
  const has = (f) => (game ? game.has(f) : f === 'sky');

  /* ---------------- 작은 도우미 ---------------- */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0, v = 0; while (u < 1e-9) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
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
    const push = (w) => {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW || !cur) cur = test; else { lines.push(cur); cur = w; }
    };
    words.forEach((w) => {
      if (ctx.measureText(w).width > maxW) { // 긴 낱말은 글자 단위로
        let part = '';
        for (const ch of w) { if (ctx.measureText(part + ch).width > maxW && part) { push(part); part = ch; } else part += ch; }
        push(part);
      } else push(w);
    });
    if (cur) lines.push(cur);
    ctx.restore();
    return (WRAPC[key] = lines);
  }
  const f = (px, weight) => (weight || 700) + ' ' + px + 'px ' + FONT;
  function panel(x, y, w, h, o) {
    o = o || {};
    D.roundRect(x, y, w, h, o.r || 14);
    ctx.fillStyle = o.fill || 'rgba(10,18,44,.82)'; ctx.fill();
    ctx.strokeStyle = o.stroke || 'rgba(160,190,255,.28)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function txt(x, y, s, o) { return D.text(x, y, s, o); }
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const hexA = rgba;

  /* =========================================================
     상태
     ========================================================= */
  const S = {
    scene: 'sky', sceneA: 1,
    // ① 하늘
    season: 'summer', lst: 19, lstT: 19, seenS: 0, seenW: 0, seen: { summer: false, winter: false },
    tap: null, foundGC: false, gcReveal: 0, tapMoves: 0,
    // ② 원반
    yaw: 24, yawV: 0, tilt: 0, tiltV: 0, tiltT: 0, pause: 0, zoom: 1, dragView: false,
    sun: { mode: 'park', gx: 0, gy: 0, sx: 702, sy: 548, lift: 0, pop: 0, bob: 0, shown: 0 },
    seenTopT: 0, seenSideT: 0, seenTop: false, seenSide: false, sunHint: '',
    // ③ 성단
    opened: [false, false], facts: [0, 0], sortDone: false,
    // ④ 성운
    neb: 0, nebA: 1, nebSeen: [0, 0, 0], nebDone: [false, false, false], nebSort: false,
    lastCheck: 0, wrongShown: false,
  };

  /* =========================================================
     ① 하늘: 은하 좌표 ↔ 서울의 하늘
     ========================================================= */
  const LAT = 37.5 * DEG, SINL = Math.sin(LAT), COSL = Math.cos(LAT);
  const GM = [[-0.0548755604, 0.4941094279, -0.8676661490], [-0.8734370902, -0.4448296300, -0.1980763734], [-0.4838350155, 0.7469822445, 0.4559837762]];
  function gal2eq(l, b) {
    const cb = Math.cos(b), gx = cb * Math.cos(l), gy = cb * Math.sin(l), gz = Math.sin(b);
    const ex = GM[0][0] * gx + GM[0][1] * gy + GM[0][2] * gz, ey = GM[1][0] * gx + GM[1][1] * gy + GM[1][2] * gz, ez = GM[2][0] * gx + GM[2][1] * gy + GM[2][2] * gz;
    return [Math.atan2(ey, ex), Math.asin(clamp(ez, -1, 1))];
  }
  function eq2gal(ra, dec) {
    const ex = Math.cos(dec) * Math.cos(ra), ey = Math.cos(dec) * Math.sin(ra), ez = Math.sin(dec);
    const gx = GM[0][0] * ex + GM[1][0] * ey + GM[2][0] * ez, gy = GM[0][1] * ex + GM[1][1] * ey + GM[2][1] * ez, gz = GM[0][2] * ex + GM[1][2] * ey + GM[2][2] * ez;
    return [Math.atan2(gy, gx), Math.asin(clamp(gz, -1, 1))];
  }
  function hor2eq(alt, az, th) {
    const sd = Math.sin(alt) * SINL + Math.cos(alt) * COSL * Math.cos(az);
    const dec = Math.asin(clamp(sd, -1, 1)), cd = Math.max(1e-6, Math.cos(dec));
    const sH = -Math.sin(az) * Math.cos(alt) / cd, cH = (Math.sin(alt) - sd * SINL) / (cd * COSL);
    return [th - Math.atan2(sH, cH), dec];
  }
  // 은하수 밝기(0~1): 은하 중심 방향(l=0)에서 가장 밝고 넓음
  const wl = (l) => { const a = Math.abs(((l / DEG + 540) % 360) - 180); return a; };
  const sigB = (lw) => (3.4 + 7.5 * Math.exp(-Math.pow(lw / 38, 2))) * DEG;
  function brightGB(l, b) {
    const lw = wl(l);
    return (0.25 + 0.75 * Math.exp(-Math.pow(lw / 55, 2))) * Math.exp(-0.5 * Math.pow(b / sigB(lw), 2));
  }
  const SK = { cx: 304, cy: 340, R: 268 };
  function makeSkySet(n, gen) {
    const s = { n, ra: new Float32Array(n), sd: new Float32Array(n), cd: new Float32Array(n), w: new Float32Array(n), sx: new Float32Array(n), sy: new Float32Array(n), alt: new Float32Array(n), bk: new Uint8Array(n), ph: new Float32Array(n) };
    for (let i = 0; i < n; i++) { const g = gen(i); s.ra[i] = g[0]; s.sd[i] = Math.sin(g[1]); s.cd[i] = Math.cos(g[1]); s.w[i] = g[2]; s.ph[i] = g[3] || 0; }
    return s;
  }
  function projectSet(s, th, bucketCount) {
    for (let i = 0; i < s.n; i++) {
      const H = th - s.ra[i], cH = Math.cos(H);
      const alt = Math.asin(clamp(s.sd[i] * SINL + s.cd[i] * COSL * cH, -1, 1));
      const az = Math.atan2(-s.cd[i] * Math.sin(H), s.sd[i] * COSL - s.cd[i] * SINL * cH);
      const r = SK.R * (1 - alt / (Math.PI / 2));
      s.sx[i] = SK.cx - r * Math.sin(az); s.sy[i] = SK.cy - r * Math.cos(az); s.alt[i] = alt;
      if (bucketCount) {
        const a = (0.2 + 0.8 * s.w[i]) * clamp(alt / (10 * DEG), 0, 1);
        s.bk[i] = alt < 0 ? 255 : Math.min(bucketCount - 1, Math.floor(a * bucketCount));
      }
    }
  }
  const rs = rng(11);
  const MW = makeSkySet(3400, () => {
    for (;;) {
      const l = (rs() * 2 - 1) * Math.PI, lw = wl(l);
      if (rs() > 0.26 + 0.74 * Math.exp(-Math.pow(lw / 55, 2))) continue;
      const b = gauss(rs) * sigB(lw), e = gal2eq(l, b);
      return [e[0], e[1], brightGB(l, b)];
    }
  });
  const BLOB = makeSkySet(190, () => {
    for (;;) {
      const l = (rs() * 2 - 1) * Math.PI, lw = wl(l);
      if (rs() > 0.2 + 0.8 * Math.exp(-Math.pow(lw / 60, 2))) continue;
      const b = gauss(rs) * sigB(lw) * 0.55, e = gal2eq(l, b);
      return [e[0], e[1], brightGB(l, b)];
    }
  });
  const BG = makeSkySet(300, () => [rs() * TAU, Math.asin(rs() * 2 - 1), 0.1 + 0.9 * Math.pow(rs(), 2.2), rs() * TAU]);
  const GCEQ = gal2eq(0, 0);
  const LAND = [
    { name: '백조자리', ra: 20.6 * 15 * DEG, dec: 42 * DEG },
    { name: '카시오페이아자리', ra: 1.0 * 15 * DEG, dec: 60 * DEG },
    { name: '오리온자리', ra: 5.6 * 15 * DEG, dec: 0 },
    { name: '궁수자리', ra: GCEQ[0], dec: GCEQ[1], gc: true },
  ];
  const LS = { summer: 19, winter: 6 };
  // 계절별 '하늘 전체의 은하수 밝기' (여름을 100으로)
  const VIS = {};
  ['summer', 'winter'].forEach((k) => {
    projectSet(MW, LS[k] * 15 * DEG, 6);
    let sum = 0;
    for (let i = 0; i < MW.n; i++) if (MW.alt[i] > 8 * DEG) sum += 0.2 + 0.8 * MW.w[i];
    VIS[k] = sum;
  });
  VIS.winter = Math.round((VIS.winter / VIS.summer) * 100); VIS.summer = 100;
  let skyCalcLst = -99;
  function skyRefresh() {
    if (Math.abs(S.lst - skyCalcLst) < 1e-4) return;
    skyCalcLst = S.lst;
    const th = S.lst * 15 * DEG;
    projectSet(MW, th, 6); projectSet(BLOB, th, 0); projectSet(BG, th, 0);
  }
  const blobSpr = () => sprite('blob', 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(210,225,255,1)'); gr.addColorStop(0.35, 'rgba(170,195,255,.45)'); gr.addColorStop(1, 'rgba(120,150,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  function skyMeasure(p) {
    const dx = SK.cx - p.x, dy = SK.cy - p.y, r = Math.hypot(dx, dy);
    if (r > SK.R + 6) return null;
    const alt = (1 - Math.min(1, r / SK.R)) * 90 * DEG;
    const az = Math.atan2(dx, dy); // 북=0, 동(왼쪽)=+90°
    const e = hor2eq(alt, az, S.lst * 15 * DEG), g = eq2gal(e[0], e[1]);
    const gl = wl(g[0]);
    const dGC = Math.hypot(gl, g[1] / DEG);
    const az360 = ((az / DEG) + 360) % 360;
    return { x: p.x, y: p.y, br: brightGB(g[0], g[1]), alt: alt / DEG, dir: DIRS[Math.round(az360 / 45) % 8], dGC };
  }

  function drawSky(t) {
    skyRefresh();
    const { cx, cy, R } = SK;
    // 돔
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy, R);
    g.addColorStop(0, '#0a1a44'); g.addColorStop(0.75, '#050d26'); g.addColorStop(1, '#02040f');
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // 은하수 번짐
    ctx.globalCompositeOperation = 'lighter';
    const bs = blobSpr();
    for (let i = 0; i < BLOB.n; i++) {
      const alt = BLOB.alt[i]; if (alt < -0.05) continue;
      const a = (0.045 + 0.1 * BLOB.w[i]) * clamp(alt / (12 * DEG) + 0.1, 0, 1);
      const sz = 44 + 52 * BLOB.w[i];
      ctx.globalAlpha = a; ctx.drawImage(bs, BLOB.sx[i] - sz / 2, BLOB.sy[i] - sz / 2, sz, sz);
    }
    // 은하수 별 점
    const BK = ['rgba(200,215,255,.22)', 'rgba(205,220,255,.38)', 'rgba(215,226,255,.52)', 'rgba(225,232,255,.66)', 'rgba(240,240,255,.8)', 'rgba(255,248,235,.95)'];
    ctx.globalAlpha = 1;
    for (let b = 0; b < 6; b++) {
      ctx.fillStyle = BK[b];
      const sz = b > 3 ? 1.9 : 1.4;
      for (let i = 0; i < MW.n; i++) if (MW.bk[i] === b) ctx.fillRect(MW.sx[i], MW.sy[i], sz, sz);
    }
    // 배경 별
    for (let i = 0; i < BG.n; i++) {
      if (BG.alt[i] < 0.02) continue;
      const tw = RM ? 0.8 : 0.55 + 0.45 * Math.sin(t * 1.3 + BG.ph[i]);
      const big = BG.w[i] > 0.55;
      ctx.globalAlpha = (0.35 + 0.65 * BG.w[i]) * tw * clamp(BG.alt[i] / (8 * DEG), 0, 1);
      ctx.fillStyle = BG.ph[i] > 3.6 ? '#ffe3c0' : '#e8f0ff';
      const s = big ? 2.3 : 1.3;
      ctx.fillRect(BG.sx[i] - s / 2, BG.sy[i] - s / 2, s, s);
      if (big) { ctx.globalAlpha *= 0.35; ctx.fillRect(BG.sx[i] - 4, BG.sy[i] - 0.4, 8, 0.8); ctx.fillRect(BG.sx[i] - 0.4, BG.sy[i] - 4, 0.8, 8); }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // 지평선 가까이 붉은 빛
    const hg = ctx.createRadialGradient(cx, cy, R * 0.78, cx, cy, R);
    hg.addColorStop(0, 'rgba(255,140,90,0)'); hg.addColorStop(1, 'rgba(255,150,100,.16)');
    ctx.fillStyle = hg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // 고도 고리
    ctx.strokeStyle = 'rgba(160,190,255,.14)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
    [1 / 3, 2 / 3].forEach((k) => { ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, TAU); ctx.stroke(); });
    ctx.setLineDash([]);
    // 이정표 (별자리)
    const labels = [];
    LAND.forEach((L) => {
      if (L.gc && !(S.foundGC || (game && game.free) || S.gcReveal > 0)) return;
      const th = S.lst * 15 * DEG, H = th - L.ra, sd = Math.sin(L.dec), cd = Math.cos(L.dec);
      const alt = Math.asin(clamp(sd * SINL + cd * COSL * Math.cos(H), -1, 1));
      if (alt < 7 * DEG) return;
      const az = Math.atan2(-cd * Math.sin(H), sd * COSL - cd * SINL * Math.cos(H));
      const r = R * (1 - alt / (Math.PI / 2)), x = cx - r * Math.sin(az), y = cy - r * Math.cos(az);
      ctx.globalAlpha = clamp((alt - 7 * DEG) / (10 * DEG), 0, 1) * 0.95;
      if (L.gc) { D.ring(x, y, 22, t, { color: '#fde68a', width: 2.5 }); }
      labels.push([x, y + (L.gc ? -38 : 14), L, ctx.globalAlpha]);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    labels.forEach((q) => {
      ctx.save(); ctx.globalAlpha = q[3];
      const L = q[2];
      D.label(clamp(q[0], L.gc ? 150 : 90, SK.cx + SK.R - 40), q[1], L.gc ? '궁수자리 쪽 (은하 중심 방향)' : L.name, { size: 13, bg: L.gc ? 'rgba(120,80,0,.9)' : 'rgba(10,20,50,.7)', color: L.gc ? '#fff3c4' : '#c9d6ff' });
      ctx.restore();
    });
    // 테두리와 방위
    ctx.strokeStyle = 'rgba(150,180,255,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    [['북', 0, -1], ['남', 0, 1], ['동', -1, 0], ['서', 1, 0]].forEach((d) => {
      txt(cx + d[1] * (R + 19), cy + d[2] * (R + 19) + 5, d[0], { size: 16, weight: 800, color: d[0] === '북' ? '#fde68a' : '#b9c8ff' });
    });
    // 누른 곳 표시
    if (S.tap) {
      const k = S.tap, a = ease.outCubic(clamp(k.age * 3, 0, 1));
      ctx.save(); ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(k.x, k.y, 8 + (1 - a) * 22, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(k.x, k.y, 3, 0, TAU); ctx.fillStyle = '#5eead4'; ctx.fill();
      ctx.restore();
    }
    drawSkyPanel(t);
    FX.draw(ctx);
  }
  function bar(x, y, w, h, frac, color, bg) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = bg || 'rgba(255,255,255,.12)'; ctx.fill();
    if (frac > 0.005) { D.roundRect(x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2); ctx.fillStyle = color; ctx.fill(); }
  }
  function drawSkyPanel(t) {
    const x = 612, w = 180;
    panel(x, 40, w, 158);
    const sm = S.season === 'summer';
    txt(x + 14, 72, sm ? '🌞 여름밤' : '❄️ 겨울밤', { size: 24, weight: 400, color: '#fff', align: 'left' });
    txt(x + 14, 98, sm ? '8월 초 · 밤 10시' : '1월 중순 · 밤 10시', { size: 14, color: '#b9c8ff', align: 'left' });
    txt(x + 14, 124, '서울에서 올려다본 하늘', { size: 13.5, color: '#8da2dd', align: 'left' });
    txt(x + 14, 146, '동쪽이 왼쪽이에요.', { size: 13.5, color: '#8da2dd', align: 'left' });
    txt(x + 14, 168, '가운데가 머리 위예요.', { size: 13.5, color: '#8da2dd', align: 'left' });
    panel(x, 212, w, 128);
    txt(x + 14, 240, '하늘 전체의 은하수', { size: 14, weight: 800, color: '#dbe5ff', align: 'left' });
    [['summer', '여름', '#fde68a'], ['winter', '겨울', '#93c5fd']].forEach((q, i) => {
      const yy = 260 + i * 32, on = S.season === q[0];
      txt(x + 14, yy + 13, q[1], { size: 14, weight: 800, color: on ? '#fff' : '#8da2dd', align: 'left' });
      bar(x + 54, yy, 82, 15, (S.barA[q[0]] || 0) / 100, on ? q[2] : mixc(q[2], '#475569', 0.55));
      txt(x + 142, yy + 13, VIS[q[0]] + '%', { size: 13.5, weight: 800, color: on ? '#fff' : '#8da2dd', align: 'left' });
    });
    panel(x, 354, w, 168);
    txt(x + 14, 382, '📏 누른 곳의 밝기', { size: 14, weight: 800, color: '#dbe5ff', align: 'left' });
    if (S.tap) {
      const k = S.tap;
      txt(x + 14, 410, k.dir + '쪽 하늘 · 높이 ' + Math.round(k.alt) + '°', { size: 13.5, color: '#b9c8ff', align: 'left' });
      bar(x + 14, 424, w - 28, 18, S.brA, k.br > 0.6 ? '#fbbf24' : '#60a5fa');
      txt(x + 14, 468, '은하수 밝기 ' + Math.round(S.brA * 100) + '%', { size: 16, weight: 800, color: k.br > 0.6 ? '#fde68a' : '#c9d6ff', align: 'left' });
      txt(x + 14, 494, k.br > 0.6 ? '아주 밝아요!' : k.br > 0.3 ? '희미하게 보여요' : '거의 안 보여요', { size: 13.5, color: '#8da2dd', align: 'left' });
    } else {
      txt(x + w / 2, 440, '👆 하늘을 눌러 보세요', { size: 14, weight: 800, color: '#5eead4', alpha: 0.6 + 0.4 * pulse() });
      txt(x + w / 2, 466, '끌면 밝기가 바뀌어요', { size: 13.5, color: '#8da2dd' });
    }
  }
  S.barA = { summer: 0, winter: 0 }; S.brA = 0;

  /* =========================================================
     ② 우리은하 모형 (점 수천 개)
     ========================================================= */
  const DC = { cx: 330, cy: 322, k: 4.7 };
  const GR = 50; // 반지름 5만 광년 = 50 kly
  const GROUPS = [
    { name: 'arm', col: '#a9c4ff', a: 0.8 }, { name: 'disc', col: '#ffe9c9', a: 0.62 },
    { name: 'bulge', col: '#ffcf70', a: 0.75 }, { name: 'halo', col: '#ff9c78', a: 0.5 },
  ];
  const GAL = { x: [], y: [], z: [], big: [] };
  GROUPS.forEach(() => { GAL.x.push([]); GAL.y.push([]); GAL.z.push([]); GAL.big.push([]); });
  const GCL = []; // 구상 성단 위치
  const ARMB = []; // 나선팔을 따라 번지는 푸른 빛
  (function genGalaxy() {
    const r = rng(2024);
    const add = (g, x, y, z) => { GAL.x[g].push(x); GAL.y[g].push(y); GAL.z[g].push(z); GAL.big[g].push(r() < 0.1 ? 1 : 0); };
    // 나선팔: 막대 끝에서 시작하는 4개의 팔
    const kk = Math.tan(17 * DEG), r0 = 7, TH = Math.log(GR / r0) / kk;
    for (let a = 0; a < 4; a++) {
      const n = a % 2 === 0 ? 1150 : 620;
      for (let i = 0; i < n; i++) {
        const th = Math.pow(r(), 0.8) * TH, rr = r0 * Math.exp(kk * th), ang = th + a * Math.PI / 2;
        const sc = 0.75 + 0.032 * rr;
        add(r() < 0.9 ? 0 : 1, rr * Math.cos(ang) + gauss(r) * sc, rr * Math.sin(ang) + gauss(r) * sc, gauss(r) * 0.55);
      }
    }
    for (let a = 0; a < 4; a++) {
      const nb = a % 2 === 0 ? 46 : 28;
      for (let i = 0; i < nb; i++) {
        const th = (i / nb) * TH, rr = r0 * Math.exp(kk * th), ang = th + a * Math.PI / 2;
        ARMB.push([rr * Math.cos(ang), rr * Math.sin(ang), 5 + rr * 0.16, a % 2 === 0 ? 1 : 0.6]);
      }
    }
    // 원반 (팔 사이)
    for (let i = 0; i < 760; i++) {
      const rr = Math.min(GR, -Math.log(1 - r() * 0.97) * 16 + 2), ang = r() * TAU;
      add(1, rr * Math.cos(ang), rr * Math.sin(ang), gauss(r) * 0.6);
    }
    // 중심부 팽대부 + 막대
    for (let i = 0; i < 780; i++) add(2, gauss(r) * 3.4, gauss(r) * 3.4, gauss(r) * 2.9);
    for (let i = 0; i < 520; i++) { const u = (r() * 2 - 1) * 9; add(2, u, gauss(r) * 1.5 + u * 0.05, gauss(r) * 1.4); }
    // 헤일로
    for (let i = 0; i < 340; i++) {
      const rr = 6 + Math.pow(r(), 0.8) * 40, th = Math.acos(r() * 2 - 1), ph = r() * TAU;
      add(3, rr * Math.sin(th) * Math.cos(ph), rr * Math.sin(th) * Math.sin(ph), rr * Math.cos(th) * 0.9);
    }
    // 구상 성단 (헤일로·중심부)
    for (let i = 0; i < 16; i++) {
      const rr = 5 + r() * 38, th = Math.acos(r() * 2 - 1), ph = r() * TAU;
      GCL.push([rr * Math.sin(th) * Math.cos(ph), rr * Math.sin(th) * Math.sin(ph), rr * Math.cos(th) * 0.9]);
    }
  })();
  function dproj(x, y, z, o) {
    const yw = S.yaw * DEG, tl = S.tilt * DEG;
    const cY = Math.cos(yw), sY = Math.sin(yw), cT = Math.cos(tl), sT = Math.sin(tl);
    const x1 = x * cY - y * sY, y1 = x * sY + y * cY;
    const k = DC.k * S.zoom;
    o.x = DC.cx + k * x1; o.y = DC.cy - k * (y1 * cT + z * sT);
    return o;
  }
  const _p = { x: 0, y: 0 }, _q = { x: 0, y: 0 };
  function discInverse(sx, sy) { // 위에서 본 화면 좌표 → 은하 좌표(kly)
    const yw = S.yaw * DEG, cY = Math.cos(yw), sY = Math.sin(yw), cT = Math.max(0.2, Math.cos(S.tilt * DEG));
    const k = DC.k * S.zoom, x1 = (sx - DC.cx) / k, y1 = -(sy - DC.cy) / k / cT;
    return { x: x1 * cY + y1 * sY, y: -x1 * sY + y1 * cY };
  }
  const sunDist = () => Math.hypot(S.sun.gx, S.sun.gy);
  const fmtLy = (kly) => (kly / 10).toFixed(1) + '만 광년';
  const glowSpr = () => sprite('glowY', 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,230,170,.95)'); gr.addColorStop(0.3, 'rgba(255,200,110,.45)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const discSpr = () => sprite('glowB', 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(150,175,255,.30)'); gr.addColorStop(0.7, 'rgba(120,150,255,.10)'); gr.addColorStop(1, 'rgba(100,130,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });

  const armSpr = () => sprite('armB', 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(140,175,255,.55)'); gr.addColorStop(0.5, 'rgba(120,150,255,.2)'); gr.addColorStop(1, 'rgba(110,140,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  function drawDisc(t) {
    const k = DC.k * S.zoom, tl = S.tilt * DEG, cT = Math.cos(tl), sT = Math.sin(tl);
    const { cx, cy } = DC;
    // 배경
    ctx.save();
    // 눈금: 반지름 고리 (위에서 볼 때 선명)
    const ringA = clamp(1 - S.tilt / 55, 0, 1) * S.zoom;
    if (ringA > 0.02) {
      ctx.save(); ctx.globalAlpha = ringA * 0.9;
      for (let m = 1; m <= 5; m++) {
        ctx.strokeStyle = m === 5 ? 'rgba(160,190,255,.5)' : 'rgba(160,190,255,.2)'; ctx.lineWidth = m === 5 ? 2 : 1;
        ctx.setLineDash(m === 5 ? [] : [3, 6]);
        ctx.beginPath(); ctx.ellipse(cx, cy, 10 * m * k, 10 * m * k * cT, 0, 0, TAU); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let m = 1; m <= 5; m++) {
        const lx = cx + 10 * m * k * 0.7071, ly = cy + 10 * m * k * 0.7071 * cT;
        txt(lx + 3, ly + 14, m + '만', { size: 13, weight: 800, color: '#9fb4ee', stroke: 'rgba(5,10,26,.9)', strokeWidth: 3, align: 'left' });
      }
      ctx.restore();
    }
    // 은하 후광
    ctx.globalCompositeOperation = 'lighter';
    {
      const ry = Math.hypot(GR * k * cT, 5 * k * sT);
      ctx.globalAlpha = 0.9 * S.zoom; ctx.drawImage(discSpr(), cx - GR * k * 1.04, cy - ry * 1.04, GR * k * 2.08, ry * 2.08);
      const a = 9 * k, ry2 = Math.hypot(a * cT, 7 * k * sT);
      ctx.globalAlpha = 0.95; ctx.drawImage(glowSpr(), cx - a * 1.5, cy - ry2 * 1.5, a * 3, ry2 * 3);
    }
    // 나선팔 번짐
    {
      const bs = armSpr(), yw0 = S.yaw * DEG, cY0 = Math.cos(yw0), sY0 = Math.sin(yw0);
      for (let i = 0; i < ARMB.length; i++) {
        const q = ARMB[i], x1 = q[0] * cY0 - q[1] * sY0, y1 = q[0] * sY0 + q[1] * cY0;
        const sz = q[2] * k * 2, ry = Math.max(sz * Math.abs(cT), 3);
        ctx.globalAlpha = 0.5 * q[3] * Math.max(0.12, cT);
        ctx.drawImage(bs, cx + k * x1 - sz / 2, cy - k * (y1 * cT) - ry / 2, sz, ry);
      }
    }
    // 별 점
    const yw = S.yaw * DEG, cY = Math.cos(yw), sY = Math.sin(yw);
    const haloOn = has('cluster') || S.tilt > 30;
    for (let g = 0; g < GROUPS.length; g++) {
      if (g === 3 && !haloOn) { /* 헤일로는 옆에서 볼 때 또는 성단 단계에서 */ }
      const xs = GAL.x[g], ys = GAL.y[g], zs = GAL.z[g], bg = GAL.big[g], n = xs.length;
      const ga = g === 3 ? (0.18 + 0.4 * clamp(S.tilt / 90, 0, 1)) : 1;
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = hexA(GROUPS[g].col, GROUPS[g].a * ga * (pass ? 1 : 0.85));
        const s = (pass ? 2.6 : 1.5) * (0.8 + 0.2 * S.zoom);
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (bg[i] !== pass) continue;
          const x1 = xs[i] * cY - ys[i] * sY, y1 = xs[i] * sY + ys[i] * cY;
          ctx.rect(cx + k * x1 - s / 2, cy - k * (y1 * cT + zs[i] * sT) - s / 2, s, s);
        }
        ctx.fill();
      }
    }
    // 구상 성단 (성단 단계 이후)
    if (has('cluster')) {
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < GCL.length; i++) {
        dproj(GCL[i][0], GCL[i][1], GCL[i][2], _q);
        const rr = 2.4 + 1.4 * Math.sin(t * 2 + i);
        ctx.fillStyle = 'rgba(255,200,120,.55)'; ctx.beginPath(); ctx.arc(_q.x, _q.y, rr + 2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd9a0'; ctx.beginPath(); ctx.arc(_q.x, _q.y, 1.8, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // 지름 눈금 (화면 아래)
    {
      const y = cy + GR * k * Math.max(cT, 0.0) + 26, yy = Math.max(y, cy + GR * k * 0.55 + 20);
      const rulerY = 604;
      ctx.save(); ctx.strokeStyle = '#cfe0ff'; ctx.fillStyle = '#cfe0ff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      const x0 = cx - GR * k, x1 = cx + GR * k;
      ctx.beginPath(); ctx.moveTo(x0, rulerY); ctx.lineTo(x1, rulerY); ctx.stroke();
      for (let m = -5; m <= 5; m++) {
        const xx = cx + m * 10 * k; ctx.lineWidth = m % 5 === 0 ? 2.5 : 1.5;
        ctx.beginPath(); ctx.moveTo(xx, rulerY - (m % 5 === 0 ? 8 : 5)); ctx.lineTo(xx, rulerY + (m % 5 === 0 ? 8 : 5)); ctx.stroke();
      }
      D.label(cx, rulerY + 22, '우리은하의 지름 ≈ 10만 광년', { size: 15, bg: 'rgba(20,40,90,.9)', color: '#e5edff', border: 'rgba(160,190,255,.5)' });
      ctx.restore();
      void yy;
    }
    // 이름표
    const topA = clamp(1 - S.tilt / 40, 0, 1), sideA = clamp((S.tilt - 50) / 40, 0, 1);
    if (topA > 0.05) {
      ctx.save(); ctx.globalAlpha = topA * S.zoom;
      dproj(9.5, 0, 0, _p);
      leader(_p.x, _p.y, _p.x + 40, _p.y - 60, '막대 구조', '#ffd27a');
      // 나선팔 이름표: 팔 위의 점
      const kk = Math.tan(17 * DEG), th = 4.3, rr = 7 * Math.exp(kk * th);
      dproj(rr * Math.cos(th + Math.PI / 2), rr * Math.sin(th + Math.PI / 2), 0, _p);
      leader(_p.x, _p.y, _p.x - 54, _p.y - 36, '나선팔', '#9db8ff');
      ctx.restore();
    }
    if (sideA > 0.05) {
      ctx.save(); ctx.globalAlpha = sideA * S.zoom;
      dproj(0, 0, 5.5, _p); leader(_p.x, _p.y, _p.x + 6, _p.y - 78, '중심부는 볼록해요', '#ffd27a');
      dproj(-30, 0, 0.8, _p); leader(_p.x, _p.y, _p.x - 6, _p.y + 62, '납작한 원반', '#9db8ff');
      if (has('cluster')) { dproj(14, 8, 22, _p); leader(_p.x, _p.y, _p.x + 48, _p.y - 50, '구상 성단들', '#ffd9a0'); }
      ctx.restore();
    }
    // 중심 표시
    dproj(0, 0, 0, _p);
    if (topA > 0.05) { ctx.save(); ctx.globalAlpha = topA * 0.9; txt(_p.x, _p.y + 5, '', { size: 1 }); ctx.restore(); }
    // 태양
    drawSun(t, topA);
    drawDiscPanel(t, topA, sideA);
  }
  function leader(x, y, lx, ly, text, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
    D.label(lx, ly, text, { size: 13.5, bg: 'rgba(8,16,40,.86)', color: col, border: col });
    ctx.restore();
  }
  function sunSphere(x, y, r, scale) {
    D.glow(x, y, r * 3.2 * scale, '#ffd43b', 0.55);
    D.sphere(x, y, r * scale, '#ffc61a', { light: '#fff3b0', dark: '#e88a00', shadow: true });
  }
  function drawSun(t, topA) {
    const sun = S.sun;
    if (!has('disc')) return;
    const placed = sun.mode === 'placed';
    if (placed) {
      dproj(sun.gx, sun.gy, 0, _p); sun.sx = _p.x; sun.sy = _p.y;
      // 은하 중심 방향 점선 + 반대 방향
      dproj(0, 0, 0, _q);
      ctx.save(); ctx.globalAlpha = 0.9;
      D.dashedLine(sun.sx, sun.sy, _q.x, _q.y, { color: '#fde68a', width: 2, dash: [7, 6], offset: RM ? 0 : t * 22 });
      ctx.restore();
      // 중심 쪽 화살표 표시
      const dx = _q.x - sun.sx, dy = _q.y - sun.sy, L = Math.hypot(dx, dy) || 1;
      if (topA > 0.3 && L > 60) {
        ctx.save(); ctx.globalAlpha = topA;
        const mx = sun.sx + dx * 0.5, my = sun.sy + dy * 0.5;
        D.label(mx, my - 15, '중심에서 약 ' + fmtLy(sunDist()), { size: 14, bg: 'rgba(90,60,0,.92)', color: '#fff3c4', border: '#fde68a' });
        ctx.restore();
      }
    } else if (sun.mode === 'park') {
      sun.sx = 702 + Math.sin(t * 2.1) * 2; sun.sy = 548 + (RM ? 0 : Math.sin(t * 2.6) * 4);
    }
    const r = 10, sc = 1 + sun.lift * 0.35 + sun.pop * 0.5;
    if (sun.mode === 'park' || sun.mode === 'drag' || sun.mode === 'return') {
      if (sun.mode === 'park' && game && game.phase === 'active' && game.current() && game.current()._sunTask) D.ring(sun.sx, sun.sy, 24, t, { color: '#fbbf24' });
    }
    sunSphere(sun.sx, sun.sy, r, sc);
    if (placed || sun.mode === 'drag') {
      D.label(sun.sx, sun.sy - 26, '☀ 태양계', { size: 14, bg: 'rgba(120,70,0,.92)', color: '#fff3c4' });
    }
    if (sun.mode === 'drag') {
      const d = discInverse(sun.sx, sun.sy), dist = Math.hypot(d.x, d.y);
      if (topA > 0.3) {
        dproj(0, 0, 0, _q);
        ctx.save(); ctx.globalAlpha = 0.7; D.dashedLine(sun.sx, sun.sy, _q.x, _q.y, { color: '#fde68a', width: 2 }); ctx.restore();
        D.label(sun.sx + 6, sun.sy + 34, '중심에서 ' + fmtLy(dist), { size: 14, bg: 'rgba(8,16,40,.92)', color: '#fde68a', border: '#fde68a' });
      }
    }
  }
  function drawDiscPanel(t, topA, sideA) {
    const x = 612, w = 180;
    panel(x, 40, w, 214);
    const top = S.tilt < 45;
    txt(x + 14, 70, top ? '⬆️ 위에서 본 모습' : '➡️ 옆에서 본 모습', { size: 17, weight: 800, color: '#fff', align: 'left' });
    const rows = top
      ? [['모양', '막대 구조가 있는 나선'], ['지름', '약 10만 광년'], ['태양계', '나선팔 위, 중심에서 약 3만 광년']]
      : [['모양', '중심부가 볼록한 납작한 원반'], ['지름', '약 10만 광년'], ['두께', '지름에 비해 아주 얇아요']];
    let yy = 92;
    rows.forEach((q) => {
      txt(x + 14, yy + 3, q[0], { size: 13, weight: 800, color: '#fbbf24', align: 'left' });
      const lines = wrap(q[1], w - 28, f(14, 700));
      lines.forEach((ln, i) => txt(x + 14, yy + 22 + i * 18, ln, { size: 14, color: '#e5edff', align: 'left' }));
      yy += 28 + lines.length * 18;
    });
    // 태양 칸
    const sun = S.sun;
    panel(x, 268, w, 104);
    txt(x + 14, 294, '☀ 태양계의 위치', { size: 14, weight: 800, color: '#dbe5ff', align: 'left' });
    if (sun.mode === 'placed') {
      txt(x + 14, 324, '중심에서 ' + fmtLy(sunDist()), { size: 17, weight: 800, color: '#fde68a', align: 'left' });
      txt(x + 14, 348, S.sunHint || '', { size: 13.5, color: '#9fb4ee', align: 'left' });
    } else {
      txt(x + 14, 322, '아래 ☀를 끌어다', { size: 13.5, color: '#9fb4ee', align: 'left' });
      txt(x + 14, 344, '은하 위에 놓아 봐요.', { size: 13.5, color: '#9fb4ee', align: 'left' });
    }
    if (sun.mode !== 'placed' || true) {
      if (sun.mode === 'park' || sun.mode === 'return' || sun.mode === 'drag') {
        txt(702, 592, '태양계 ☀', { size: 13.5, weight: 800, color: '#fde68a', alpha: 0.9 });
      }
    }
  }

  /* =========================================================
     ③ 성단 카드 / ④ 성운: 끌어서 분류하는 카드
     ========================================================= */
  function mkTok(id, text, kind, o) {
    return Object.assign({ id, text, kind, zone: -1, x: 0, y: 0, tx: 0, ty: 0, w: 176, h: 48, lift: 0, drag: false, order: 0, shake: 0, wrong: false, tw: null, color: '#f1f5f9', ink: '#1e293b' }, o || {});
  }
  const CL = {
    cards: [{ x: 14, y: 14, w: 372, h: 262 }, { x: 414, y: 14, w: 372, h: 262 }],
    zones: [{ x: 14, y: 288, w: 372, h: 150 }, { x: 414, y: 288, w: 372, h: 150 }],
    poolX: [36, 222, 408, 594], poolY: [480, 538],
  };
  const CTEXT = [
    ['별이 수십~수천 개', 0], ['느슨하고 불규칙하게 모여 있다', 0], ['파란 별이 많고, 비교적 젊다', 0], ['은하 원반(나선팔)에 많다', 0],
    ['별이 수만~수십만 개', 1], ['공 모양으로 빽빽하게 모여 있다', 1], ['붉은 별이 많고, 나이가 많다', 1], ['은하 중심부와 헤일로에 많다', 1],
  ];
  const ORDER_C = [5, 0, 7, 2, 4, 3, 1, 6];
  const CTOK = ORDER_C.map((i) => mkTok('c' + i, CTEXT[i][0], CTEXT[i][1]));
  CTOK.forEach((t, i) => { t.home = i; });
  const NL = {
    cards: [{ x: 14, y: 356, w: 252, h: 150 }, { x: 274, y: 356, w: 252, h: 150 }, { x: 534, y: 356, w: 252, h: 150 }],
    slots: [{ x: 14, y: 514, w: 252, h: 50 }, { x: 274, y: 514, w: 252, h: 50 }, { x: 534, y: 514, w: 252, h: 50 }],
    poolX: [118, 325, 532], poolY: 606,
  };
  const NTYPE = [
    { name: '방출 성운', col: '#e11d48' }, { name: '반사 성운', col: '#2563eb' }, { name: '암흑 성운', col: '#475569' },
  ];
  // 사진 순서: 사진마다 정답이 다르게 (사진0 = 암흑?) → 사진 i의 종류
  const NPHOTO = [
    { kind: 1, name: 'M78 (오리온자리)' }, { kind: 2, name: '말머리 성운 (오리온자리)' }, { kind: 0, name: '오리온 대성운 (M42)' },
  ];
  const NTOK = [0, 1, 2].map((k) => mkTok('n' + k, NTYPE[k].name, k, { w: 150, h: 40, color: NTYPE[k].col, ink: '#fff' }));
  NTOK.forEach((t, i) => { t.home = i; t.kind = NPHOTO.findIndex((q) => q.kind === i); }); // kind = 알맞은 사진(칸) 번호
  function tokTarget(list, kind, t) {
    if (t.zone >= 0) {
      if (kind === 'c') {
        const z = CL.zones[t.zone], order = list.filter((o) => o.zone === t.zone && o.order < t.order).length;
        return { x: z.x + 6 + (order % 2) * 184, y: z.y + 32 + Math.floor(order / 2) * 54 };
      }
      const s = NL.slots[t.zone]; return { x: s.x + (s.w - t.w) / 2, y: s.y + (s.h - t.h) / 2 };
    }
    if (kind === 'c') return { x: CL.poolX[t.home % 4], y: CL.poolY[Math.floor(t.home / 4)] };
    return { x: NL.poolX[t.home] - 0, y: NL.poolY };
  }
  function settleTokens(list, kind, instant) {
    list.forEach((t) => {
      if (t.drag) return;
      const g = tokTarget(list, kind, t);
      if (instant) { if (t.tw) t.tw.cancel(); t.x = t.tx = g.x; t.y = t.ty = g.y; return; }
      if (Math.abs(g.x - t.tx) > 0.5 || Math.abs(g.y - t.ty) > 0.5) {
        t.tx = g.x; t.ty = g.y;
        if (t.tw) t.tw.cancel();
        t.tw = SciSim.tween(t, { x: g.x, y: g.y }, { duration: 0.42, ease: 'outBack' });
      }
    });
  }
  let orderCtr = 1;
  function dropTok(list, kind, t, p) {
    const zones = kind === 'c' ? CL.zones : NL.slots;
    let z = zones.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y - 6 && p.y <= r.y + r.h + 6);
    if (kind === 'n' && z < 0) { // 사진 카드 위에 놓아도 아래 칸에 들어가도록
      z = NL.cards.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    }
    t.wrong = false;
    if (z >= 0) {
      if (kind === 'c') {
        const cnt = list.filter((o) => o.zone === z && o !== t).length;
        if (cnt >= 4) { t.zone = -1; t.shake = 1; toast4(); Sound.fail(); return; }
      } else {
        const occ = list.find((o) => o.zone === z && o !== t);
        if (occ) { occ.zone = -1; occ.wrong = false; }
      }
      t.zone = z; t.order = orderCtr++; Sound.tone(520 + z * 120, 0.08, 'triangle', 0.08);
    } else { t.zone = -1; }
  }
  let toast4T = 0;
  function toast4() { toast4T = 2.2; }
  function wrongNow() { return performance.now() - S.lastCheck < 1100; }

  function drawTok(t, kind, list, t0) {
    const sc = 1 + t.lift * 0.07;
    let sx = 0;
    if (t.shake > 0) sx = Math.sin(t.shake * 28) * 6 * t.shake;
    const x = t.x + sx, y = t.y - t.lift * 5;
    ctx.save();
    ctx.translate(x + t.w / 2, y + t.h / 2); ctx.scale(sc, sc); ctx.translate(-t.w / 2, -t.h / 2);
    const showWrong = t.zone >= 0 && wrongNow() && game && game.phase === 'active' && t.wrong;
    D.shadow(() => { D.roundRect(0, 0, t.w, t.h, kind === 'n' ? t.h / 2 : 11); ctx.fillStyle = t.color; ctx.fill(); }, { blur: 6 + t.lift * 14, y: 2 + t.lift * 7, color: 'rgba(0,0,0,.45)' });
    if (kind === 'c') { // 아래쪽 은은한 그림자 띠
      D.roundRect(0, 0, t.w, t.h, 11); ctx.strokeStyle = t.zone >= 0 ? (S.sortDone ? '#22c55e' : 'rgba(99,102,241,.7)') : 'rgba(148,163,184,.8)'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      D.roundRect(0, 0, t.w, t.h, t.h / 2); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
    }
    if (showWrong) { D.roundRect(-2, -2, t.w + 4, t.h + 4, 13); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3.5; ctx.stroke(); }
    if (kind === 'c') {
      const lines = wrap(t.text, t.w - 14, f(14, 700));
      const lh = 18, y0 = t.h / 2 - ((lines.length - 1) * lh) / 2 + 5;
      lines.forEach((ln, i) => txt(t.w / 2, y0 + i * lh, ln, { size: 14, weight: 700, color: t.ink }));
    } else {
      txt(t.w / 2, t.h / 2 + 5.5, t.text, { size: 16, weight: 800, color: t.ink });
    }
    ctx.restore();
  }

  /* ---- 성단 사진 (한 번만 그려 둠) ---- */
  function photoOpen(g, w, h) {
    const r = rng(45);
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#05091c'); bg.addColorStop(1, '#0b1a3e');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) { // 푸른 반사 성운 번짐
      const x = w * 0.5 + gauss(r) * 70, y = h * 0.5 + gauss(r) * 50, rr = 40 + r() * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(90,140,255,.14)'); gr.addColorStop(1, 'rgba(90,140,255,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.15 + r() * 0.4) + ')'; g.fillRect(r() * w, r() * h, 1.2, 1.2); }
    const cols = ['#cfe0ff', '#b4cdff', '#ffffff', '#9fc0ff'];
    for (let i = 0; i < 70; i++) {
      const x = w * 0.5 + gauss(r) * 78, y = h * 0.5 + gauss(r) * 62, big = i < 8;
      const rr = big ? 4 + r() * 3 : 1 + r() * 1.5, c = cols[i % 4];
      const gr = g.createRadialGradient(x, y, 0, x, y, rr * (big ? 6 : 3.5)); gr.addColorStop(0, hexA(c, 0.9)); gr.addColorStop(0.25, hexA(c, 0.35)); gr.addColorStop(1, hexA(c, 0));
      g.fillStyle = gr; g.fillRect(x - rr * 7, y - rr * 7, rr * 14, rr * 14);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, rr * 0.6, 0, TAU); g.fill();
      if (big) { g.fillStyle = hexA(c, 0.55); g.fillRect(x - rr * 3.6, y - 0.5, rr * 7.2, 1); g.fillRect(x - 0.5, y - rr * 3.6, 1, rr * 7.2); }
    }
  }
  function photoGlob(g, w, h) {
    const r = rng(77);
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#04060f'); bg.addColorStop(1, '#0a0d1c');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.1 + r() * 0.3) + ')'; g.fillRect(r() * w, r() * h, 1.2, 1.2); }
    const cx = w / 2, cy = h / 2;
    const cg = g.createRadialGradient(cx, cy, 0, cx, cy, 90); cg.addColorStop(0, 'rgba(255,200,120,.55)'); cg.addColorStop(0.5, 'rgba(255,150,80,.2)'); cg.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = cg; g.fillRect(cx - 100, cy - 100, 200, 200);
    const cols = ['#ffd9a0', '#ffb877', '#ff9d6a', '#ffe8c4', '#ffc58a'];
    for (let i = 0; i < 3300; i++) {
      const u = Math.max(0.0005, r()), rr = 34 / Math.sqrt(Math.pow(u, -2 / 3) - 1), a = r() * TAU;
      if (rr > 120) continue;
      const x = cx + rr * Math.cos(a) * 1.04, y = cy + rr * Math.sin(a);
      g.fillStyle = hexA(cols[i % 5], 0.35 + r() * 0.6); g.fillRect(x, y, 1.3 + (i % 11 === 0 ? 0.9 : 0), 1.3 + (i % 11 === 0 ? 0.9 : 0));
    }
  }
  const CARD = [
    { title: '산개 성단', sub: '플레이아데스 (M45)', draw: photoOpen,
      facts: [['별의 수', '수십~수천 개'], ['모양', '느슨하고 불규칙하게 모여 있어요'], ['색 · 나이', '표면 온도가 높은 파란 별이 많고, 비교적 젊어요'], ['위치', '은하 원반(나선팔)에 있어요']] },
    { title: '구상 성단', sub: 'M13 (헤라클레스자리)', draw: photoGlob,
      facts: [['별의 수', '수만~수십만 개'], ['모양', '공 모양으로 빽빽하게 모여 있어요'], ['색 · 나이', '붉은 별이 많고, 나이가 많아요'], ['위치', '은하 중심부와 헤일로에 있어요']] },
  ];
  // 은하 단면(옆) 안에서의 위치 표시
  function miniGalaxy(x, y, w, h, kind, t) {
    ctx.save();
    D.roundRect(x, y, w, h, 8); ctx.fillStyle = 'rgba(5,10,30,.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,190,255,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = 'rgba(255,160,110,.14)'; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.42, h * 0.46, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(180,200,255,.5)'; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.44, h * 0.07, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,120,.7)'; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.12, h * 0.2, 0, 0, TAU); ctx.fill();
    const a = 0.6 + 0.4 * Math.sin(t * 4);
    ctx.fillStyle = kind === 0 ? '#60a5fa' : '#fb923c';
    const pts = kind === 0 ? [[-0.36, 0], [-0.24, 0.01], [0.2, -0.01], [0.32, 0], [0.4, 0.01]] : [[-0.14, -0.34], [0.2, -0.3], [-0.3, 0.2], [0.28, 0.28], [0.02, -0.15], [-0.05, 0.33], [0.1, 0.12]];
    pts.forEach((q) => { ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(cx + q[0] * w, cy + q[1] * h, 3.2, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1; ctx.restore();
  }
  function drawCluster(t) {
    for (let i = 0; i < 2; i++) {
      const c = CL.cards[i], info = CARD[i];
      const spr = sprite('cl' + i, c.w, c.h, (g, w, h) => info.draw(g, w, h));
      ctx.save();
      D.shadow(() => { D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.fillStyle = '#05091c'; ctx.fill(); }, { blur: 14, y: 5, color: 'rgba(0,0,0,.5)' });
      D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.clip();
      const zs = 1 + 0.03 * S.facts[i];
      ctx.drawImage(spr, c.x - (zs - 1) * c.w / 2, c.y - (zs - 1) * c.h / 2, c.w * zs, c.h * zs);
      // 이름표
      D.label(c.x + 12, c.y + 22, info.title + ' · ' + info.sub, { size: 14, align: 'left', bg: 'rgba(5,10,30,.78)', color: '#fff' });
      miniGalaxy(c.x + c.w - 100, c.y + 10, 88, 42, i, t);
      // 특징 패널 (눌러서 열기)
      const fa = ease.outCubic(S.facts[i]);
      if (fa > 0.01) {
        const ph = 206, py = c.y + c.h - ph * fa;
        ctx.fillStyle = 'rgba(6,12,34,.92)'; ctx.fillRect(c.x, py, c.w, ph + 4);
        ctx.fillStyle = 'rgba(160,190,255,.4)'; ctx.fillRect(c.x, py, c.w, 1.5);
        let yy = py + 28;
        info.facts.forEach((q) => {
          txt(c.x + 14, yy, q[0], { size: 13.5, weight: 800, color: '#fbbf24', align: 'left' });
          const lines = wrap(q[1], 262, f(14, 700));
          lines.forEach((ln, li) => txt(c.x + 92, yy + li * 18, ln, { size: 14, color: '#e8efff', align: 'left' }));
          yy += Math.max(1, lines.length) * 18 + 14;
        });
      } else {
        const a2 = 0.7 + 0.3 * pulse();
        D.label(c.x + c.w / 2, c.y + c.h - 22, S.opened[i] ? '👆 눌러서 특징 다시 보기' : '👆 눌러서 특징 살펴보기', { size: 14, bg: 'rgba(20,40,90,.9)', color: '#e5edff', border: 'rgba(160,190,255,.6)' });
        void a2;
      }
      ctx.restore();
      if (S.opened[i] && S.facts[i] < 0.01) { /* 확인 표시 */ }
      if (S.opened[i]) D.check(c.x + c.w - 16, c.y + c.h - 16, 10, 1);
    }
    // 분류 칸
    for (let i = 0; i < 2; i++) {
      const z = CL.zones[i], col = i === 0 ? '#60a5fa' : '#fb923c';
      ctx.save();
      D.roundRect(z.x, z.y, z.w, z.h, 14); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = hexA(col, 0.8); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      txt(z.x + 14, z.y + 20, (i === 0 ? '🔵 산개 성단' : '🟠 구상 성단') + '의 특징', { size: 14.5, weight: 800, color: col, align: 'left' });
      const cnt = CTOK.filter((o) => o.zone === i).length;
      txt(z.x + z.w - 14, z.y + 20, cnt + '/4', { size: 14, weight: 800, color: '#b9c8ff', align: 'right' });
      ctx.restore();
    }
    const un = CTOK.filter((o) => o.zone < 0).length;
    if (un > 0) txt(400, 464, '👇 카드를 끌어다 알맞은 성단 칸에 놓아요 (누르면 반대쪽으로 옮겨져요)', { size: 13.5, weight: 700, color: '#9fb4ee' });
    else txt(400, 464, S.sortDone ? '🎉 모두 알맞게 분류했어요!' : '모두 놓았어요! 아래 [확인] 버튼을 눌러 봐요.', { size: 14, weight: 800, color: '#5eead4' });
    drawToks(CTOK, 'c', t);
    if (toast4T > 0) D.label(400, 452, '칸이 가득 찼어요. 맞지 않는 카드를 먼저 빼 보세요', { size: 14, bg: '#ef4444', color: '#fff' });
  }
  function drawToks(list, kind, t) {
    const arr = list.slice().sort((a, b) => (a.drag ? 1 : 0) - (b.drag ? 1 : 0) || a.lift - b.lift);
    arr.forEach((tk) => drawTok(tk, kind, list, t));
  }

  /* ---- 성운 사진 ---- */
  function nebPhoto(kind) {
    return sprite('nb' + kind, 252, 150, (g, w, h) => {
      const r = rng(300 + kind);
      g.fillStyle = '#04060f'; g.fillRect(0, 0, w, h);
      const blob = (x, y, rr, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, hexA(c, a)); gr.addColorStop(1, hexA(c, 0)); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); };
      if (kind === 0) { // 방출 성운 M42
        for (let i = 0; i < 38; i++) blob(w * 0.5 + gauss(r) * 52, h * 0.52 + gauss(r) * 34, 24 + r() * 40, i % 3 === 0 ? '#ff7a9a' : i % 3 === 1 ? '#ff4d6d' : '#c026d3', 0.2);
        blob(w * 0.5, h * 0.5, 36, '#fff1d6', 0.85); blob(w * 0.5, h * 0.5, 14, '#ffffff', 0.9);
        for (let i = 0; i < 4; i++) { const x = w * 0.48 + i * 4, y = h * 0.5 + (i % 2) * 3; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
      } else if (kind === 1) { // 반사 성운 M78
        for (let i = 0; i < 34; i++) blob(w * 0.5 + gauss(r) * 46, h * 0.5 + gauss(r) * 30, 22 + r() * 36, i % 2 ? '#5b8cff' : '#8fb4ff', 0.22);
        blob(w * 0.4, h * 0.46, 22, '#e6efff', 0.7); blob(w * 0.56, h * 0.54, 18, '#e6efff', 0.6);
        [[0.4, 0.46], [0.56, 0.54]].forEach((q) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(w * q[0], h * q[1], 2.4, 0, TAU); g.fill(); });
      } else { // 암흑 성운 (말머리)
        const bgG = g.createLinearGradient(0, h * 0.2, 0, h); bgG.addColorStop(0, 'rgba(120,20,40,.0)'); bgG.addColorStop(0.5, 'rgba(255,90,100,.55)'); bgG.addColorStop(1, 'rgba(255,150,130,.8)');
        g.fillStyle = bgG; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 14; i++) blob(r() * w, h * (0.45 + r() * 0.5), 26 + r() * 30, '#ff8a8a', 0.2);
        g.fillStyle = '#05060c';
        g.beginPath();
        g.moveTo(w * 0.34, h); g.lineTo(w * 0.36, h * 0.62); g.quadraticCurveTo(w * 0.37, h * 0.5, w * 0.43, h * 0.42);
        g.lineTo(w * 0.46, h * 0.28); g.quadraticCurveTo(w * 0.49, h * 0.2, w * 0.54, h * 0.22); g.lineTo(w * 0.58, h * 0.3);
        g.quadraticCurveTo(w * 0.66, h * 0.34, w * 0.66, h * 0.45); g.lineTo(w * 0.62, h * 0.5);
        g.quadraticCurveTo(w * 0.6, h * 0.58, w * 0.64, h * 0.66); g.lineTo(w * 0.66, h * 0.8); g.lineTo(w * 0.66, h); g.closePath(); g.fill();
      }
      for (let i = 0; i < 110; i++) { if (kind === 2 && i % 2 && 0) continue; g.fillStyle = 'rgba(255,255,255,' + (0.15 + r() * 0.6) + ')'; const x = r() * w, y = r() * h; if (kind === 2 && x > w * 0.34 && x < w * 0.66 && y > h * 0.22) continue; g.fillRect(x, y, 1.3, 1.3); }
    });
  }

  /* ---- 성운 빛 원리 그림 ---- */
  const EYE = { x: 712, y: 168 };
  function eye(x, y) {
    ctx.save();
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(x, y, 30, 19, 0, 0, TAU); ctx.fill();
    D.sphere(x - 3, y, 11.5, '#38bdf8', { gloss: false }); ctx.fillStyle = '#0b1228'; ctx.beginPath(); ctx.arc(x - 4, y, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x - 8, y - 4, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
    txt(x, y + 44, '지구에서 보는 눈', { size: 13.5, weight: 800, color: '#cfe0ff' });
  }
  function flow(x1, y1, x2, y2, color, t, o) {
    o = o || {};
    const len = Math.hypot(x2 - x1, y2 - y1), a = o.reveal != null ? o.reveal : 1;
    const ex = x1 + (x2 - x1) * a, ey = y1 + (y2 - y1) * a;
    D.arrow(x1, y1, ex, ey, { color, width: o.width || 3.5, head: o.head || 13, alpha: 0.88, dash: o.dash });
    if (a > 0.95 && !RM) {
      const n = Math.max(2, Math.round(len / 55));
      for (let i = 0; i < n; i++) {
        const k = ((t * (o.speed || 0.5) + i / n) % 1), px = x1 + (x2 - x1) * k, py = y1 + (y2 - y1) * k;
        if (o.stop != null && k > o.stop) continue;
        D.glow(px, py, 9, color, 0.9);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill();
      }
    }
  }
  function star(x, y, r, col, t) {
    D.glow(x, y, r * 4.4, col, 0.55);
    D.sphere(x, y, r, '#ffffff', { light: '#ffffff', dark: col, gloss: false });
    ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff';
    const L = r * (3.2 + 0.5 * Math.sin(t * 3 + x));
    ctx.fillRect(x - L, y - 0.8, L * 2, 1.6); ctx.fillRect(x - 0.8, y - L, 1.6, L * 2); ctx.restore();
  }
  function cloud(x, y, rx, ry, col, a, t, seed) {
    const r = rng(seed);
    for (let i = 0; i < 9; i++) {
      const ox = (r() - 0.5) * rx * 1.1 + Math.sin(t * 0.5 + i) * 4, oy = (r() - 0.5) * ry * 1.1 + Math.cos(t * 0.6 + i) * 3, rr = (0.45 + r() * 0.5) * Math.max(rx, ry);
      const gr = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr);
      gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x + ox, y + oy, rr, 0, TAU); ctx.fill();
    }
  }
  function drawNebDiagram(t) {
    const A = ease.outCubic(S.nebA);
    ctx.save();
    D.roundRect(14, 14, 772, 330, 16); ctx.fillStyle = 'rgba(6,12,34,.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,190,255,.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.clip();
    const k = S.neb;
    const cap = ['스스로 빛을 내요', '별빛을 반사해요', '뒤쪽의 빛을 가려요'][k];
    const col = ['#fb7185', '#60a5fa', '#94a3b8'][k];
    txt(34, 44, ['🔴 방출 성운', '🔵 반사 성운', '⚫ 암흑 성운'][k], { size: 22, weight: 400, color: '#fff', align: 'left' });
    D.label(190 + 28, 38, cap, { size: 14.5, bg: hexA(col, 0.9), color: '#fff', align: 'left', pad: 10 });
    if (k === 0) {
      cloud(420, 176, 120, 70, '#ff4d6d', 0.55 * A, t, 5); cloud(450, 190, 90, 50, '#c026d3', 0.3 * A, t, 6);
      [[330, 150, 8], [362, 200, 7], [318, 196, 6]].forEach((s) => star(s[0], s[1], s[2], '#8ab4ff', t));
      txt(318, 250, '뜨겁고 밝은 별', { size: 14, weight: 800, color: '#cfe0ff' });
      // 별빛(자외선) → 가스
      [[338, 152, 410, 120], [368, 198, 450, 214], [326, 192, 390, 170]].forEach((q, i) => flow(q[0], q[1], q[2], q[3], '#c4b5fd', t + i * 0.2, { reveal: clamp(A * 1.4, 0, 1), width: 3, speed: 0.55 }));
      D.label(402, 98, '별빛(강한 빛)이 가스를 비춰요', { size: 13.5, bg: 'rgba(76,29,149,.9)', color: '#ede9fe' });
      // 가스 → 눈
      [[505, 150, 670, 158], [515, 180, 670, 168], [505, 212, 670, 180]].forEach((q, i) => flow(q[0], q[1], q[2], q[3], '#ff6b81', t + i * 0.33, { reveal: clamp(A * 1.4 - 0.3, 0, 1), width: 4, speed: 0.45 }));
      D.label(590, 118, '가스가 붉은 빛을 내요', { size: 14, bg: 'rgba(159,18,57,.92)', color: '#ffe4e9' });
    } else if (k === 1) {
      cloud(460, 176, 105, 62, '#5b8cff', 0.55 * A, t, 8); cloud(480, 160, 60, 40, '#a5c4ff', 0.3 * A, t, 9);
      for (let i = 0; i < 26; i++) { const r = rng(40 + i); ctx.fillStyle = 'rgba(210,225,255,.55)'; ctx.fillRect(400 + r() * 120, 140 + r() * 70, 2, 2); }
      star(250, 168, 11, '#ffffff', t);
      txt(250, 214, '가까이 있는 별', { size: 14, weight: 800, color: '#cfe0ff' });
      [[268, 160, 400, 150], [270, 170, 400, 176], [268, 178, 405, 204]].forEach((q, i) => flow(q[0], q[1], q[2], q[3], '#ffffff', t + i * 0.25, { reveal: clamp(A * 1.4, 0, 1), width: 3, speed: 0.5 }));
      D.label(335, 118, '별빛이 먼지에 닿아요', { size: 13.5, bg: 'rgba(30,41,59,.92)', color: '#f1f5f9' });
      [[520, 150, 670, 158], [530, 178, 670, 168], [520, 206, 670, 178]].forEach((q, i) => flow(q[0], q[1], q[2], q[3], '#6ea8ff', t + i * 0.3, { reveal: clamp(A * 1.4 - 0.3, 0, 1), width: 4, speed: 0.45 }));
      D.label(600, 118, '푸른 빛을 반사해요', { size: 14, bg: 'rgba(30,64,175,.92)', color: '#dbeafe' });
    } else {
      // 뒤쪽 밝은 배경 (구름 뒤에서 빛나는 가스)
      {
        ctx.save(); ctx.translate(380, 176); ctx.scale(1, 0.55);
        const bgG = ctx.createRadialGradient(0, 0, 10, 0, 0, 260);
        bgG.addColorStop(0, 'rgba(255,120,130,' + 0.75 * A + ')'); bgG.addColorStop(0.6, 'rgba(255,100,120,' + 0.38 * A + ')'); bgG.addColorStop(1, 'rgba(255,100,120,0)');
        ctx.fillStyle = bgG; ctx.beginPath(); ctx.arc(0, 0, 260, 0, TAU); ctx.fill(); ctx.restore();
      }
      for (let i = 0; i < 36; i++) { const r = rng(90 + i); ctx.fillStyle = 'rgba(255,235,235,.8)'; ctx.fillRect(150 + r() * 330, 70 + r() * 200, 1.8, 1.8); }
      txt(220, 300, '뒤쪽의 밝은 빛', { size: 14, weight: 800, color: '#fecaca' });
      // 어두운 구름
      const cx = 450, cy = 176;
      for (let i = 0; i < 11; i++) {
        const r = rng(120 + i), ox = (r() - 0.5) * 80, oy = (r() - 0.5) * 110, rr = 44 + r() * 34;
        const gr = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rr);
        gr.addColorStop(0, 'rgba(6,6,12,' + 0.98 * A + ')'); gr.addColorStop(0.7, 'rgba(10,10,20,' + 0.85 * A + ')'); gr.addColorStop(1, 'rgba(10,10,20,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx + ox, cy + oy, rr, 0, TAU); ctx.fill();
      }
      txt(cx, 300, '짙은 가스와 먼지 구름', { size: 14, weight: 800, color: '#cbd5e1' });
      const rows = [72, 118, 158, 198, 238, 282];
      rows.forEach((yy, i) => {
        const blocked = yy > 100 && yy < 260;
        const x2 = blocked ? 392 : 668;
        flow(176, yy, x2, blocked ? yy : yy + (170 - yy) * 0.1, '#fda4af', t + i * 0.17, { reveal: clamp(A * 1.5, 0, 1), width: 3, head: 11, stop: blocked ? 1 : undefined, speed: 0.4 });
        if (blocked && A > 0.9) txt(404, yy + 6, '✖', { size: 17, weight: 800, color: '#fb7185' });
      });
      D.label(560, 104, '위·아래로 지나온 빛만 보여요', { size: 13.5, bg: 'rgba(51,65,85,.92)', color: '#e2e8f0' });
      D.label(520, 214, '구름에 막힌 빛', { size: 13.5, bg: 'rgba(51,65,85,.92)', color: '#e2e8f0' });
    }
    // 눈
    eye(EYE.x, EYE.y);
    ctx.restore();
  }
  function drawNebula(t) {
    drawNebDiagram(t);
    // 사진 카드
    for (let i = 0; i < 3; i++) {
      const c = NL.cards[i];
      ctx.save();
      D.shadow(() => { D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.fillStyle = '#05091c'; ctx.fill(); }, { blur: 10, y: 4, color: 'rgba(0,0,0,.5)' });
      D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
      ctx.drawImage(nebPhoto(NPHOTO[i].kind), c.x, c.y, c.w, c.h);
      D.label(c.x + 8, c.y + 17, '사진 ' + 'ABC'[i] + ' · ' + NPHOTO[i].name, { size: 13, align: 'left', bg: 'rgba(5,10,30,.8)', color: '#fff', pad: 7 });
      ctx.restore();
    }
    for (let i = 0; i < 3; i++) {
      const s = NL.slots[i];
      ctx.save(); D.roundRect(s.x, s.y, s.w, s.h, 24); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(160,190,255,.7)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      if (!NTOK.some((o) => o.zone === i)) txt(s.x + s.w / 2, s.y + s.h / 2 + 5, '이름표를 놓는 곳', { size: 13.5, weight: 700, color: '#6f86c4' });
      ctx.restore();
    }
    const un = NTOK.filter((o) => o.zone < 0).length;
    txt(400, 592, un ? '👇 이름표를 끌어다 알맞은 사진 아래에 놓아요' : (S.nebSort ? '🎉 모두 알맞게 분류했어요!' : '모두 놓았어요! 아래 [확인] 버튼을 눌러 봐요.'), { size: 13.5, weight: 700, color: un ? '#9fb4ee' : '#5eead4' });
    drawToks(NTOK, 'n', t);
  }

  /* =========================================================
     장면 전환 · 그리기 루프
     ========================================================= */
  function setScene(name, instant) {
    if (S.scene === name) return;
    S.scene = name; S.sceneA = instant || RM ? 1 : 0;
    if (!instant) SciSim.tween(S, { sceneA: 1 }, { duration: 0.55, ease: 'outCubic' });
    if (name === 'disc') { S.zoom = instant || RM ? 1 : 0.35; if (!instant) SciSim.tween(S, { zoom: 1 }, { duration: 0.9, ease: 'outCubic' }); }
    if (name === 'cluster') settleTokens(CTOK, 'c', true);
    if (name === 'nebula') { settleTokens(NTOK, 'n', true); S.nebA = 0; SciSim.tween(S, { nebA: 1 }, { duration: 0.8, ease: 'outCubic' }); }
    syncControls();
  }
  const FEATS = { sky: 'sky', disc: 'disc', cluster: 'cluster', nebula: 'nebula' };
  function syncControls() {
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.scene));
    $$('#seasonSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.season));
    $$('#viewSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'top') === (S.tiltT < 45)));
    $$('#nebSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.neb));
    $('#cSeason').classList.toggle('is-off', S.scene !== 'sky');
    $('#cView').classList.toggle('is-off', S.scene !== 'disc');
    $('#cNeb').classList.toggle('is-off', S.scene !== 'nebula');
    $('#cReset').classList.toggle('is-off', S.scene !== 'cluster' && S.scene !== 'nebula');
  }
  function setSeason(s) {
    if (S.season === s) return;
    S.season = s; S.lstT = LS[s]; S.tap = null; Sound.click(); syncControls();
  }
  function setView(v) { S.tiltT = v === 'top' ? 0 : 90; S.pause = 3; Sound.click(); syncControls(); }
  function setNeb(k) { if (S.neb === k) return; S.neb = k; S.nebA = 0; SciSim.tween(S, { nebA: 1 }, { duration: 0.8, ease: 'outCubic' }); Sound.click(); syncControls(); }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.s); }));
  $$('#seasonSeg button').forEach((b) => b.addEventListener('click', () => setSeason(b.dataset.v)));
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.v)));
  $$('#nebSeg button').forEach((b) => b.addEventListener('click', () => setNeb(+b.dataset.v)));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    const list = S.scene === 'nebula' ? NTOK : CTOK;
    list.forEach((t) => { t.zone = -1; t.wrong = false; });
    settleTokens(list, S.scene === 'nebula' ? 'n' : 'c');
  });

  function update(dt, t) {
    // 하늘
    S.lst = RM ? S.lstT : approach(S.lst, S.lstT, dt, 4);
    if (Math.abs(S.lst - S.lstT) < 0.01) S.lst = S.lstT;
    S.barA.summer = approach(S.barA.summer, S.scene === 'sky' ? VIS.summer : 0, dt, 5);
    S.barA.winter = approach(S.barA.winter, S.scene === 'sky' ? VIS.winter : 0, dt, 5);
    if (S.tap) { S.tap.age += dt; S.brA = approach(S.brA, S.tap.br, dt, 10); } else S.brA = 0;
    S.gcReveal = Math.max(0, S.gcReveal - dt);
    const settledSky = Math.abs(S.lst - S.lstT) < 0.3 && S.scene === 'sky' && game && game.phase === 'active';
    if (settledSky) {
      if (S.season === 'summer') S.seenS += dt; else S.seenW += dt;
      if (S.seenS > 0.6) S.seen.summer = true;
      if (S.seenW > 0.6) S.seen.winter = true;
    }
    // 원반
    S.pause = Math.max(0, S.pause - dt);
    if (!S.dragView) {
      if (S.pause <= 0 && S.scene === 'disc' && S.sun.mode !== 'drag') S.yaw += dt * (RM ? 0 : 7);
      S.yaw += S.yawV * dt; S.yawV = approach(S.yawV, 0, dt, 3);
    }
    if (!S.dragView) {
      S.tilt = RM ? S.tiltT : approach(S.tilt, S.tiltT, dt, 4.2);
      if (Math.abs(S.tilt - S.tiltT) < 0.1) S.tilt = S.tiltT;
    }
    const sun = S.sun;
    sun.lift = approach(sun.lift, sun.mode === 'drag' ? 1 : 0, dt, 14);
    sun.pop = approach(sun.pop, 0, dt, 5);
    if (S.scene === 'disc' && game && game.phase === 'active') {
      const settled = !S.dragView && Math.abs(S.tilt - S.tiltT) < 3;
      if (settled && S.tilt < 6) { S.seenTopT += dt; if (S.seenTopT > 0.7) S.seenTop = true; }
      if (settled && S.tilt > 84) { S.seenSideT += dt; if (S.seenSideT > 0.7) S.seenSide = true; }
    }
    // 카드 특징 패널
    for (let i = 0; i < 2; i++) S.facts[i] = RM ? (S.factsT ? S.factsT[i] : 0) : approach(S.facts[i], S.factsT ? S.factsT[i] : 0, dt, 9);
    if (S.scene === 'nebula' && game && game.phase === 'active') {
      S.nebSeen[S.neb] += dt;
      for (let i = 0; i < 3; i++) if (S.nebSeen[i] > 1.2) S.nebDone[i] = true;
    }
    // 카드 끌기
    [CTOK, NTOK].forEach((list) => list.forEach((tk) => {
      tk.lift = approach(tk.lift, tk.drag ? 1 : 0, dt, 16);
      if (tk.shake > 0) tk.shake = Math.max(0, tk.shake - dt * 2.4);
    }));
    toast4T = Math.max(0, toast4T - dt);
    // 틀린 카드 흔들기 (확인 버튼을 눌렀을 때 새로 틀린 것만)
    const active = game && game.phase === 'active';
    const w = wrongNow() && active;
    if (w && !S.wrongShown) { [CTOK, NTOK].forEach((list) => list.forEach((tk) => { if (tk.wrong && tk.zone >= 0) tk.shake = 1; })); Sound.fail(); }
    S.wrongShown = w;
    FX.update(dt);
  }
  function draw(t) {
    V.clear('#050a1a');
    // 배경 별
    ctx.save();
    ctx.fillStyle = '#050a1a'; ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
    const a = ease.outCubic(clamp(S.sceneA, 0, 1));
    ctx.save();
    ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 16);
    if (S.scene === 'sky') drawSky(t);
    else if (S.scene === 'disc') drawDisc(t);
    else if (S.scene === 'cluster') drawCluster(t);
    else drawNebula(t);
    ctx.restore();
    if (S.scene !== 'sky') FX.draw(ctx);
  }

  /* =========================================================
     포인터 (하늘 누르기 · 모형 돌리기 · 카드 끌기)
     ========================================================= */
  let pdrag = null;
  function hitTok(list, p) {
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i];
      if (p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h) return t;
    }
    return null;
  }
  function tapSky(p, quiet) {
    const m = skyMeasure(p);
    if (!m) return false;
    m.age = 0;
    const first = !S.tap;
    S.tap = m; S.tapMoves++;
    if (!quiet && (first || S.tapMoves % 4 === 0)) Sound.tick();
    if (S.season === 'summer' && m.dGC < 25 && !S.foundGC) {
      S.foundGC = true; Sound.tone(880, 0.14, 'triangle', 0.09);
      FX.burst(m.x, m.y, { count: 16, colors: ['#fde68a', '#ffffff', '#5eead4'], speed: 130, gravity: 30, size: 3 });
    }
    return true;
  }
  SciSim.pointer(V, {
    hover(p) {
      if (S.scene === 'cluster') { if (hitTok(CTOK, p)) return 'grab'; if (CL.cards.some((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h)) return 'pointer'; }
      if (S.scene === 'nebula' && hitTok(NTOK, p)) return 'grab';
      if (S.scene === 'sky') return 'crosshair';
      if (S.scene === 'disc') return 'grab';
      return null;
    },
    down(p) {
      if (S.scene === 'sky') { if (tapSky(p)) { pdrag = { kind: 'sky' }; return true; } return false; }
      if (S.scene === 'disc') {
        const sun = S.sun;
        if (has('disc') && Math.hypot(p.x - sun.sx, p.y - sun.sy) < 34 && (sun.mode === 'park' || sun.mode === 'placed' || sun.mode === 'return')) {
          if (S.tilt > 20) { S.tiltT = 0; S.pause = 3; syncControls(); }
          sun.mode = 'drag'; sun.sx = p.x; sun.sy = p.y; sun.pop = 0;
          pdrag = { kind: 'sun' }; S.pause = 9; Sound.tick(); return true;
        }
        pdrag = { kind: 'view', x: p.x, y: p.y, vx: 0 }; S.dragView = true; S.pause = 4; S.yawV = 0;
        return true;
      }
      const list = S.scene === 'cluster' ? CTOK : S.scene === 'nebula' ? NTOK : null;
      if (!list) return false;
      const kind = S.scene === 'cluster' ? 'c' : 'n';
      const tk = hitTok(list, p);
      if (tk) {
        if (game && game.phase !== 'active' && game.phase !== 'intro') { /* 자유 탐구 허용 */ }
        if (tk.tw) tk.tw.cancel();
        tk.drag = true; tk.wrong = false;
        pdrag = { kind: 'tok', tk, list, k: kind, ox: p.x - tk.x, oy: p.y - tk.y, sx: p.x, sy: p.y, moved: false };
        Sound.tick(); return true;
      }
      if (S.scene === 'cluster') {
        const ci = CL.cards.findIndex((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);
        if (ci >= 0) {
          S.factsT = S.factsT || [0, 0];
          S.factsT[ci] = S.factsT[ci] ? 0 : 1; if (S.factsT[ci]) S.opened[ci] = true;
          Sound.tone(S.factsT[ci] ? 700 : 520, 0.07, 'triangle', 0.07);
        }
      }
      return false;
    },
    move(p) {
      if (!pdrag) return;
      if (pdrag.kind === 'sky') tapSky(p, true);
      else if (pdrag.kind === 'sun') { S.sun.sx = clamp(p.x, 20, VW - 20); S.sun.sy = clamp(p.y, 20, VH - 20); }
      else if (pdrag.kind === 'view') {
        const dx = p.x - pdrag.x, dy = p.y - pdrag.y; pdrag.x = p.x; pdrag.y = p.y; pdrag.vx = dx;
        S.yaw += dx * 0.45;
        S.tilt = clamp(S.tilt + dy * 0.35, 0, 90); S.tiltT = S.tilt; S.tiltV = 0;
      } else if (pdrag.kind === 'tok') {
        const tk = pdrag.tk;
        if (Math.hypot(p.x - pdrag.sx, p.y - pdrag.sy) > 7) pdrag.moved = true;
        tk.x = p.x - pdrag.ox; tk.y = p.y - pdrag.oy;
      }
    },
    up(p) {
      const d = pdrag; pdrag = null;
      if (!d) return;
      if (d.kind === 'view') {
        S.dragView = false; S.yawV = clamp(d.vx * 22, -90, 90);
        S.tiltT = S.tilt < 45 ? 0 : 90; S.pause = 3; syncControls(); // 가까운 방향으로 자리 잡기
      } else if (d.kind === 'sun') {
        const sun = S.sun;
        const dd = discInverse(sun.sx, sun.sy), dist = Math.hypot(dd.x, dd.y);
        if (S.tilt < 25 && dist <= GR + 3) {
          sun.mode = 'placed'; sun.gx = dd.x; sun.gy = dd.y; sun.pop = 1;
          S.sunHint = dist < 22 ? '중심에 너무 가까워요' : dist > 34 ? '중심에서 너무 멀어요' : '나선팔 위에 있어요';
          Sound.tone(660, 0.1, 'triangle', 0.09);
          FX.burst(sun.sx, sun.sy, { count: 12, colors: ['#fde68a', '#ffffff'], speed: 110, gravity: 20, size: 3 });
        } else {
          sun.mode = 'return';
          const from = { x: sun.sx, y: sun.sy };
          SciSim.tween(sun, { sx: 702, sy: 548 }, { duration: 0.55, ease: 'outBack', onDone: () => { if (sun.mode === 'return') sun.mode = 'park'; } });
          void from;
        }
      } else if (d.kind === 'tok') {
        const tk = d.tk; tk.drag = false;
        if (!d.moved) { // 눌러서 반대쪽으로
          if (d.k === 'c') { tk.zone = tk.zone < 0 ? 0 : 1 - tk.zone; const cnt = d.list.filter((o) => o.zone === tk.zone && o !== tk).length; if (cnt >= 4) { tk.zone = -1; tk.shake = 1; toast4(); } else tk.order = orderCtr++; Sound.click(); }
          else { tk.zone = -1; Sound.click(); }
        } else dropTok(d.list, d.k, tk, p);
        refreshWrong(d.list, d.k);
        settleTokens(d.list, d.k);
        if (tk.zone < 0 && tk.tx === tk.x) { /* 제자리 */ }
      }
    },
  });
  function refreshWrong(list, kind) { list.forEach((t) => { t.wrong = t.zone >= 0 && t.zone !== t.kind; }); }

  /* =========================================================
     퀴즈 그림 (인라인 SVG)
     ========================================================= */
  function svgStars(n, seed, fn) {
    const r = rng(seed); let s = '';
    for (let i = 0; i < n; i++) { const q = fn(r, i); s += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + q[2] + '" fill="' + q[3] + '" opacity="' + q[4] + '"/>'; }
    return s;
  }
  const FIG = {};
  FIG.side = '<svg viewBox="0 0 360 176" width="360" role="img" aria-label="우리은하를 옆에서 본 그림. 태양계는 원반 안쪽에 있고, 원반 방향으로는 별이 많이 겹쳐 보여요.">' +
    '<rect width="360" height="176" rx="12" fill="#0b1228"/>' +
    '<ellipse cx="180" cy="98" rx="160" ry="10" fill="#cfd8ff" opacity=".28"/><ellipse cx="180" cy="98" rx="38" ry="28" fill="#ffd27a" opacity=".4"/>' +
    svgStars(240, 4, (r) => { const x = 25 + r() * 310; const k = Math.abs(x - 180) < 40 ? 22 : 5; return [x, 98 + (r() - 0.5) * k * (1 - Math.abs(x - 180) / 200), r() < 0.12 ? 1.6 : 0.9, '#dfe8ff', 0.55 + r() * 0.4]; }) +
    '<circle cx="262" cy="98" r="6" fill="#ffc61a"/><circle cx="262" cy="98" r="11" fill="#ffc61a" opacity=".3"/>' +
    '<text x="262" y="126" font-size="13" font-weight="800" fill="#fde68a" text-anchor="middle" font-family="sans-serif">태양계</text>' +
    '<path d="M250 98 L96 98" stroke="#5eead4" stroke-width="3" marker-end="url(#ah)"/><path d="M262 86 L262 30" stroke="#94a3b8" stroke-width="3" marker-end="url(#ah2)"/>' +
    '<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#5eead4"/></marker><marker id="ah2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#94a3b8"/></marker></defs>' +
    '<text x="170" y="84" font-size="12.5" font-weight="800" fill="#5eead4" text-anchor="middle" font-family="sans-serif">원반 방향: 별이 많이 겹쳐 보여요</text>' +
    '<text x="262" y="22" font-size="12.5" font-weight="800" fill="#cbd5e1" text-anchor="middle" font-family="sans-serif">위쪽: 별이 적어요</text></svg>';
  FIG.top = (function () {
    const kk = Math.tan(17 * DEG);
    let arms = '';
    for (let a = 0; a < 4; a++) {
      let d = '';
      for (let i = 0; i <= 40; i++) {
        const th = (i / 40) * Math.log(50 / 7) / kk, rr = 7 * Math.exp(kk * th), ang = th + a * Math.PI / 2;
        d += (i ? 'L' : 'M') + (180 + rr * 1.55 * Math.cos(ang)).toFixed(1) + ' ' + (92 - rr * 1.55 * Math.sin(ang)).toFixed(1);
      }
      arms += '<path d="' + d + '" fill="none" stroke="' + (a % 2 ? '#7f9be0' : '#a9c4ff') + '" stroke-width="' + (a % 2 ? 5 : 8) + '" stroke-linecap="round" opacity=".7"/>';
    }
    const sx = 180 + 30 * 1.55 * Math.cos(2.3), sy = 92 - 30 * 1.55 * Math.sin(2.3);
    return '<svg viewBox="0 0 360 200" width="360" role="img" aria-label="우리은하를 위에서 본 그림. 지름은 약 10만 광년이고 태양계는 중심에서 약 3만 광년 떨어져 있어요.">' +
      '<rect width="360" height="200" rx="12" fill="#0b1228"/>' + arms +
      '<ellipse cx="180" cy="92" rx="22" ry="7" fill="#ffd27a" opacity=".9"/><circle cx="180" cy="92" r="9" fill="#ffd27a" opacity=".8"/>' +
      '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="5.5" fill="#ffc61a" stroke="#fff" stroke-width="1.5"/>' +
      '<text x="' + (sx + 10).toFixed(1) + '" y="' + (sy - 6).toFixed(1) + '" font-size="12.5" font-weight="800" fill="#fde68a" font-family="sans-serif">태양계</text>' +
      '<path d="M180 92 L' + sx.toFixed(1) + ' ' + sy.toFixed(1) + '" stroke="#fde68a" stroke-width="1.6" stroke-dasharray="4 3"/>' +
      '<path d="M102 176 L258 176" stroke="#cfe0ff" stroke-width="2"/><path d="M102 170 v12 M258 170 v12" stroke="#cfe0ff" stroke-width="2"/>' +
      '<text x="180" y="194" font-size="13" font-weight="800" fill="#e5edff" text-anchor="middle" font-family="sans-serif">우리은하의 지름</text></svg>';
  })();
  FIG.glob = '<svg viewBox="0 0 360 150" width="360" role="img" aria-label="붉고 노란 별 수십만 개가 공 모양으로 빽빽이 모인 성단 사진">' +
    '<rect width="360" height="150" rx="12" fill="#070a16"/>' +
    '<circle cx="180" cy="75" r="62" fill="#ff9d6a" opacity=".12"/>' +
    svgStars(900, 6, (r) => { const rr = 40 / Math.sqrt(Math.pow(Math.max(0.001, r()), -2 / 3) - 1), a = r() * TAU; return [180 + Math.min(rr, 80) * Math.cos(a), 75 + Math.min(rr, 80) * Math.sin(a) * 0.95, 0.85, ['#ffd9a0', '#ffb877', '#ff9d6a', '#ffe8c4'][Math.floor(r() * 4)], 0.8]; }) + '</svg>';
  FIG.dark = '<svg viewBox="0 0 360 150" width="360" role="img" aria-label="붉게 빛나는 성운 앞에 말머리 모양의 검은 그림자가 있는 사진">' +
    '<defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a0a18"/><stop offset=".55" stop-color="#d94a5a"/><stop offset="1" stop-color="#ff9a8a"/></linearGradient></defs>' +
    '<rect width="360" height="150" rx="12" fill="url(#hg)"/>' +
    svgStars(60, 8, (r) => [r() * 360, r() * 150, 0.9, '#fff', 0.7]) +
    '<path d="M120 150 L124 92 Q126 74 138 64 L144 42 Q149 30 160 32 L170 46 Q188 50 188 68 L180 76 Q178 90 186 100 L190 122 L188 150 Z" fill="#06070d"/></svg>';

  /* =========================================================
     게임(4단계)
     ========================================================= */
  function sortCheck(list, sortKey) {
    S.lastCheck = performance.now();
    const un = list.filter((t) => t.zone < 0).length;
    if (sortKey === 'c' && !(S.opened[0] && S.opened[1])) return '먼저 두 성단 카드를 눌러서 특징을 살펴봐요.';
    if (un) return '아직 놓지 않은 카드가 ' + un + '장 있어요.';
    const bad = list.filter((t) => t.zone !== t.kind).length;
    if (bad) return bad + '장이 알맞지 않아요. 빨간 테두리 카드를 다시 생각해 봐요. 카드나 사진을 눌러 특징을 확인할 수 있어요.';
    return true;
  }
  function resetSort(list, kind) { list.forEach((t) => { t.zone = -1; t.wrong = false; t.drag = false; }); settleTokens(list, kind, true); }

  game = SciSim.game({
    simId: 'm2-milky-way',
    mount: '#game',
    badge: '은하 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      sky: '🌠 밤하늘의 은하수', disc: '🌌 회전하는 우리은하 모형', cluster: '⭐ 성단 카드', nebula: '🌫️ 성운의 빛 원리',
    },
    onFeatures() { syncControls(); },
    onMissionStart() { },
    onComplete() { S.lstT = LS.summer; },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '밤하늘의 은하수', short: '은하수', icon: '🌠', phase: '관찰',
        features: ['sky'],
        intro: '<p class="si-q">❓ 탐구 질문: 밤하늘의 은하수는 무엇이고, 우리는 우주 어디쯤 있을까?</p>' +
          '<p>맑고 어두운 밤하늘에는 희뿌연 <b>띠</b>가 길게 걸려 있어요. 이것이 <b>은하수</b>예요. 서울의 <b>여름밤</b>과 <b>겨울밤</b> 하늘을 비교하고, 은하수가 가장 밝은 쪽을 찾아봐요.</p>' +
          '<p>🔦 밤하늘을 직접 관측할 때는 어른과 함께, 안전한 곳에서 해요.</p>',
        setup() { setScene('sky', true); S.season = 'summer'; S.lstT = LS.summer; S.lst = LS.summer; skyCalcLst = -99; S.tap = null; S.foundGC = false; S.seenS = S.seenW = 0; S.seen = { summer: false, winter: false }; syncControls(); },
        recap: '은하수는 밤하늘에 띠처럼 보이는 수많은 별의 무리예요. 여름밤에는 더 밝고 넓게 보이고, 남쪽 하늘의 궁수자리 쪽이 가장 밝아요.',
        summary: '<ul><li><b>은하수</b>는 밤하늘에 희뿌옇게 띠처럼 보이는 수많은 별의 무리예요.</li>' +
          '<li><b>여름밤</b>의 은하수가 겨울밤보다 더 <b>밝고 넓게</b> 보여요.</li>' +
          '<li>여름밤에는 남쪽 하늘의 <b>궁수자리</b> 쪽이 가장 밝아요. 이 방향에 <b>우리은하의 중심</b>이 있어요.</li></ul>',
        missions: [
          {
            title: '🌞❄️ 여름밤과 겨울밤',
            goal: '[🌞 여름밤]과 [❄️ 겨울밤]을 모두 눌러, 각각 1초쯤 하늘을 살펴봐요.',
            hint: '오른쪽 위 버튼으로 계절을 바꾸면 하늘이 천천히 돌아가요. 은하수의 밝기와 폭이 어떻게 다른지 보세요.',
            setup() { setScene('sky'); S.seenS = S.seenW = 0; S.seen = { summer: false, winter: false }; },
            check: () => S.seen.summer && S.seen.winter,
            hold: 0.4,
            status: () => chk(S.seen.summer, '여름밤 보기') + ' · ' + chk(S.seen.winter, '겨울밤 보기'),
            explain: '여름밤에는 은하수가 <b>더 밝고 넓게</b> 보이고, 겨울밤에는 <b>희미하고 가늘게</b> 보여요. 오른쪽 막대처럼 하늘 전체의 은하수 밝기도 여름이 더 커요.',
          },
          {
            title: '🧭 가장 밝은 방향 찾기',
            goal: '<b>여름밤</b> 하늘에서 은하수가 <b>가장 밝은 곳</b>을 눌러 봐요. 밝기 막대가 길게 차오르는 곳이에요.',
            hint: '[🌞 여름밤]으로 바꾼 뒤, 은하수 띠를 따라 손가락을 끌어 보세요. 남쪽 하늘 낮은 곳에서 밝기가 가장 커져요.',
            setup() { setScene('sky'); setSeason('summer'); S.foundGC = false; S.tap = null; S.tapMoves = 0; },
            check: () => S.foundGC,
            hold: 0.5,
            status: () => chk(S.season === 'summer', '여름밤') + ' · ' + chk(S.foundGC, '가장 밝은 곳 찾기') + (S.tap ? '<br>누른 곳: ' + S.tap.dir + '쪽 · 밝기 ' + Math.round(S.tap.br * 100) + '%' : ''),
            explain: '여름밤에는 <b>남쪽 하늘의 궁수자리 쪽</b>이 가장 밝아요. 그쪽에 <b>우리은하의 중심</b>이 있어서 별이 가장 많이 모여 있기 때문이에요.',
          },
          {
            type: 'quiz',
            title: '🌠 은하수의 정체',
            goal: '그림은 우리은하를 옆에서 본 모습이에요. 밤하늘에 띠처럼 보이는 <b>은하수</b>는 무엇일까요?',
            figure: FIG.side,
            setup() { setScene('sky'); },
            choices: ['구름이 길게 늘어서 있는 것', '우리은하의 원반을 안쪽에서 본 모습', '우리은하 바깥에 있는 다른 은하', '태양계의 행성들이 한 줄로 늘어선 것'],
            answer: 1,
            feedback: [
              '은하수는 구름이 아니에요. 망원경으로 보면 수많은 별이 모여 있는 것을 볼 수 있어요.',
              '',
              '은하수는 우리은하의 일부예요. 우리는 우리은하 안에 있어서, 그 안쪽에서 바라보고 있어요.',
              '행성은 몇 개뿐이에요. 은하수는 수천억 개나 되는 별들이 모여 있는 거예요.',
            ],
            explain: '태양계는 우리은하의 <b>원반 안쪽</b>에 있어요. 원반 방향으로 보면 별이 아주 많이 겹쳐서 <b>띠(은하수)</b>로 보이고, 원반 위·아래 방향으로는 별이 적게 보여요. 즉 <b>은하수는 우리은하의 원반을 안에서 본 모습</b>이에요.',
          },
        ],
      },
      /* ---------- 2단계 · 모형 ---------- */
      {
        title: '우리은하의 모양과 크기', short: '은하 모형', icon: '🌌', phase: '모형',
        features: ['disc'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 은하수가 우리은하의 원반을 안에서 본 모습이라는 걸 알았어요.</div>' +
          '<p>이제 우리은하를 <b>밖에서</b> 본 <b>모형</b>이에요. 별 수천 개의 점으로 만들었어요. 끌어서 돌려 보고, <b>위</b>와 <b>옆</b>에서 모습을 비교해 봐요.</p>' +
          '<p>우리은하의 지름은 약 <b>10만 광년</b>이고, 태양계는 중심에서 약 <b>3만 광년</b> 떨어진 곳에 있어요. ☀를 끌어다 알맞은 곳에 놓아 봐요.</p>',
        setup() { setScene('disc', true); S.tiltT = 0; S.tilt = 0; S.zoom = 1; syncControls(); },
        recap: '우리은하는 위에서 보면 막대 구조가 있는 나선 모양, 옆에서 보면 중심부가 볼록한 납작한 원반이에요. 지름은 약 10만 광년이고, 태양계는 중심에서 약 3만 광년 떨어져 있어요.',
        summary: '<div class="note-fig">' + FIG.top + '</div><ul><li>위에서 본 우리은하: 중심에 <b>막대 구조</b>가 있는 <b>나선</b> 모양이에요.</li>' +
          '<li>옆에서 본 우리은하: <b>중심부가 볼록한 납작한 원반</b> 모양이에요.</li>' +
          '<li>지름은 약 <b>10만 광년</b>이에요. (1광년 = 빛이 1년 동안 가는 거리)</li>' +
          '<li><b>태양계</b>는 은하 중심에서 약 <b>3만 광년</b> 떨어진 <b>나선팔</b> 위에 있어요.</li></ul>',
        missions: [
          {
            title: '☀ 태양계를 제자리에',
            goal: '위에서 본 모형에서 ☀를 끌어다, <b>은하 중심에서 약 3만 광년</b> 떨어진 곳에 놓아요.',
            hint: '원 눈금은 1만 광년마다 하나씩이에요. 중심에서 3번째 원 둘레에 놓아 보세요. 놓은 뒤에도 다시 끌어 옮길 수 있어요.',
            setup() { setScene('disc'); S.tiltT = 0; S.pause = 3; S.sun.mode = 'park'; S.sun.sx = 702; S.sun.sy = 548; S.sunHint = ''; syncControls(); },
            _sunTask: true,
            check: () => S.sun.mode === 'placed' && sunDist() >= 22 && sunDist() <= 34,
            hold: 0.6,
            status: () => S.sun.mode === 'placed' ? chk(sunDist() >= 22 && sunDist() <= 34, '중심에서 ' + fmtLy(sunDist()) + ' (목표: 약 3만 광년)') : chk(false, '☀를 은하 위에 놓기'),
            explain: '태양계는 은하 중심에서 약 <b>3만 광년</b> 떨어진 <b>나선팔</b> 위에 있어요. 중심도, 가장자리도 아닌 중간쯤이에요.',
          },
          {
            title: '🔄 위에서, 옆에서',
            goal: '모형을 <b>위</b>에서 보고, <b>옆</b>에서도 보세요. 각각 1초쯤 멈춰서 모양을 살펴봐요.',
            hint: '[⬆️ 위에서] [➡️ 옆에서] 버튼을 누르거나 모형을 위아래로 끌어 돌려 보세요.',
            setup() { setScene('disc'); S.seenTopT = S.seenSideT = 0; S.seenTop = S.seenSide = false; S.pause = 0; syncControls(); },
            check: () => S.seenTop && S.seenSide,
            hold: 0.3,
            status: () => chk(S.seenTop, '위에서 보기') + ' · ' + chk(S.seenSide, '옆에서 보기'),
            explain: '위에서 보면 <b>막대 구조가 있는 나선 모양</b>이고, 옆에서 보면 <b>중심부가 볼록한 납작한 원반</b>이에요. 지름에 비해 두께가 아주 얇아요.',
          },
          {
            type: 'quiz',
            title: '📏 우리은하의 구조와 크기',
            goal: '우리은하에 대한 설명으로 <b>옳은 것</b>은?',
            figure: FIG.top,
            setup() { setScene('disc'); },
            choices: ['태양계는 우리은하의 한가운데에 있다', '옆에서 보면 전체가 둥근 공 모양이다', '위에서 보면 막대 구조가 있는 나선 모양이고, 지름은 약 10만 광년이다', '위에서 보면 둥근 공 모양이고, 지름은 약 1만 광년이다'],
            answer: 2,
            feedback: [
              '태양계는 중심에서 약 3만 광년 떨어진 나선팔 위에 있어요. 한가운데가 아니에요.',
              '옆에서 보면 중심부만 볼록하고 나머지는 납작한 원반이에요.',
              '',
              '지름은 약 10만 광년으로 훨씬 커요. 위에서 본 모양도 나선이에요.',
            ],
            explain: '우리은하는 위에서 보면 <b>막대 구조가 있는 나선 모양</b>, 옆에서 보면 <b>중심부가 볼록한 납작한 원반</b>이고, 지름은 약 <b>10만 광년</b>이에요.',
          },
        ],
      },
      /* ---------- 3단계 · 탐구 ---------- */
      {
        title: '성단: 별들의 모임', short: '성단', icon: '⭐', phase: '탐구',
        features: ['cluster'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 우리은하에는 별이 수천억 개 있다는 걸 알았어요. 별들 가운데에는 <b>무리를 지어 모여 있는 것</b>도 있어요.</div>' +
          '<p>별이 모여 있는 집단을 <b>성단</b>이라고 해요. <b>산개 성단</b>과 <b>구상 성단</b> 사진 카드를 눌러 특징을 비교한 뒤, 특징 카드를 알맞게 분류해 봐요.</p>',
        setup() { setScene('cluster', true); S.factsT = [0, 0]; },
        recap: '산개 성단은 파란 젊은 별이 흩어져 있고 원반에 있어요. 구상 성단은 늙은 붉은 별이 공 모양으로 빽빽하고 중심부와 헤일로에 있어요.',
        summary: '<ul><li><b>산개 성단</b>: 별이 수십~수천 개, 느슨하고 불규칙한 모양. 표면 온도가 높은 <b>파란 별</b>이 많고 비교적 <b>젊어요</b>. 은하 <b>원반(나선팔)</b>에 있어요. 예) 플레이아데스</li>' +
          '<li><b>구상 성단</b>: 별이 수만~수십만 개, <b>공 모양</b>으로 빽빽해요. <b>붉은 별</b>이 많고 나이가 <b>많아요</b>. 은하 <b>중심부와 헤일로</b>에 있어요. 예) M13</li></ul>',
        missions: [
          {
            title: '🗂️ 성단 특징 분류하기',
            goal: '두 성단 카드를 눌러 특징을 살펴본 뒤, 특징 카드 8장을 알맞은 성단 칸에 놓고 [확인]을 눌러요.',
            hint: '사진을 누르면 별의 수·모양·색(나이)·위치가 나와요. 카드를 끌어 놓거나, 카드를 눌러 반대쪽으로 보낼 수 있어요.',
            manual: true,
            setup() { setScene('cluster'); S.factsT = [0, 0]; S.sortDone = false; resetSort(CTOK, 'c'); S.lastCheck = 0; },
            check() { const r = sortCheck(CTOK, 'c'); if (r === true) S.sortDone = true; return r; },
            explain: '<b>산개 성단</b>은 젊고 파란 별이 느슨하게 모여 <b>원반(나선팔)</b>에 있고, <b>구상 성단</b>은 늙고 붉은 별 수십만 개가 <b>공 모양</b>으로 빽빽하게 모여 <b>중심부와 헤일로</b>에 있어요.',
          },
          {
            type: 'quiz',
            title: '🔴 이 성단은?',
            goal: '그림처럼 <b>붉고 늙은 별 수십만 개</b>가 공 모양으로 빽빽이 모인 성단은 어떤 성단이고, 주로 어디에 있을까요?',
            figure: FIG.glob,
            setup() { setScene('cluster'); },
            choices: ['산개 성단 · 은하 원반의 나선팔', '산개 성단 · 은하 중심부와 헤일로', '구상 성단 · 은하 중심부와 헤일로', '구상 성단 · 은하 원반의 나선팔'],
            answer: 2,
            feedback: [
              '산개 성단은 별이 느슨하게 흩어져 있어요. 공 모양으로 빽빽한 것은 구상 성단이에요.',
              '산개 성단이 아니에요. 공 모양으로 빽빽하게 모인 것은 구상 성단이에요.',
              '',
              '구상 성단은 나이가 많은 별들이 모인 것이라서, 별이 새로 태어나는 나선팔보다 은하 중심부와 헤일로에 있어요.',
            ],
            explain: '공 모양으로 빽빽한 <b>구상 성단</b>은 나이가 많고 붉은 별이 많으며, 주로 은하 <b>중심부와 헤일로</b>에 있어요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '성운: 가스와 먼지 구름', short: '성운', icon: '🌫️', phase: '적용',
        features: ['nebula'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별이 모여 있는 <b>성단</b>을 비교했어요. 은하 속에는 별 말고도 <b>가스와 먼지 구름</b>이 있어요.</div>' +
          '<p>이런 구름을 <b>성운</b>이라고 해요. 성운은 <b>빛이 어떻게 되는지</b>에 따라 <b>방출 · 반사 · 암흑 성운</b>으로 나눠요. 빛 화살표를 따라가며 원리를 알아보고, 사진을 분류해 봐요.</p>',
        setup() { setScene('nebula', true); S.neb = 0; S.nebA = 1; syncControls(); },
        recap: '방출 성운은 스스로 빛을 내(붉은색), 반사 성운은 별빛을 반사해(푸른색), 암흑 성운은 뒤쪽의 빛을 가려서 어둡게 보여요.',
        summary: '<div class="note-fig">' + FIG.dark + '</div><ul><li><b>방출 성운</b>: 뜨거운 별빛을 받은 가스가 <b>스스로 빛</b>을 내요. 주로 <b>붉게</b> 보여요. 예) 오리온 대성운</li>' +
          '<li><b>반사 성운</b>: 주변 별빛을 먼지가 <b>반사</b>해서 보여요. 주로 <b>푸르게</b> 보여요.</li>' +
          '<li><b>암흑 성운</b>: 짙은 가스와 먼지가 뒤쪽의 빛을 <b>가려서</b> 어둡게 보여요. 예) 말머리 성운</li></ul>',
        missions: [
          {
            title: '💡 세 가지 빛 원리 보기',
            goal: '[방출] [반사] [암흑]을 차례로 눌러, 빛 화살표가 어떻게 움직이는지 1초 이상 살펴봐요.',
            hint: '오른쪽 위 버튼으로 성운 종류를 바꿔요. 색이 있는 화살표를 따라가 보세요.',
            setup() { setScene('nebula'); S.neb = 0; S.nebSeen = [0, 0, 0]; S.nebDone = [false, false, false]; syncControls(); },
            check: () => S.nebDone.every(Boolean),
            hold: 0.3,
            status: () => chk(S.nebDone[0], '방출') + ' · ' + chk(S.nebDone[1], '반사') + ' · ' + chk(S.nebDone[2], '암흑'),
            explain: '<b>방출 성운</b>은 가스가 스스로 빛을 내고, <b>반사 성운</b>은 먼지가 별빛을 반사하고, <b>암흑 성운</b>은 구름이 뒤쪽의 빛을 가려요.',
          },
          {
            title: '🖼️ 성운 사진 분류하기',
            goal: '이름표 3장을 끌어다 알맞은 성운 사진 아래에 놓고 [확인]을 눌러요.',
            hint: '붉게 빛나는 것 / 푸르게 빛나는 것 / 밝은 배경 앞에 검은 그림자가 있는 것을 구분해 봐요.',
            manual: true,
            setup() { setScene('nebula'); S.nebSort = false; resetSort(NTOK, 'n'); S.lastCheck = 0; },
            check() { const r = sortCheck(NTOK, 'n'); if (r === true) S.nebSort = true; return r; },
            explain: '붉게 빛나는 오리온 대성운은 <b>방출 성운</b>, 푸르게 보이는 M78은 <b>반사 성운</b>, 밝은 배경 앞에 검은 그림자로 보이는 말머리 성운은 <b>암흑 성운</b>이에요.',
          },
          {
            type: 'quiz',
            title: '⚫ 어둡게 보이는 까닭',
            goal: '말머리 성운은 뒤쪽의 붉은 성운 앞에서 <b>검게</b> 보여요. 왜 어둡게 보일까요?',
            figure: FIG.dark,
            setup() { setScene('nebula'); S.neb = 2; syncControls(); },
            choices: ['스스로 빛을 내지만 너무 약해서', '짙은 가스와 먼지가 뒤쪽에서 오는 빛을 가려서', '별빛을 파란색으로 반사해서', '별이 하나도 없는 빈 공간이어서'],
            answer: 1,
            feedback: [
              '암흑 성운은 스스로 빛을 내지 않아요. 구름 뒤쪽의 빛을 막아서 어둡게 보이는 거예요.',
              '',
              '별빛을 반사해서 푸르게 보이는 것은 반사 성운이에요. 암흑 성운은 빛을 가려요.',
              '빈 공간이 아니라 가스와 먼지가 아주 짙게 모여 있는 구름이에요.',
            ],
            explain: '<b>암흑 성운</b>은 짙은 가스와 먼지가 <b>뒤쪽에서 오는 빛을 가려서</b> 어두운 그림자처럼 보여요.',
          },
        ],
      },
    ],
  });

  /* =========================================================
     시작
     ========================================================= */
  syncControls();
  let frameMs = 0;
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    draw(t);
    frameMs += (performance.now() - t0 - frameMs) * 0.05;
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, game: () => game, frameMs: () => frameMs, CTOK, NTOK, CL, NL, V, setScene, setSeason, setView, setNeb, GC: () => ({ eq: GCEQ }),
    skyXY(altDeg, azDeg) { const r = SK.R * (1 - altDeg / 90), a = azDeg * DEG; return { x: SK.cx - r * Math.sin(a), y: SK.cy - r * Math.cos(a) }; },
    gcXY() { const th = S.lst * 15 * DEG, H = th - GCEQ[0], sd = Math.sin(GCEQ[1]), cd = Math.cos(GCEQ[1]); const alt = Math.asin(sd * SINL + cd * COSL * Math.cos(H)), az = Math.atan2(-cd * Math.sin(H), sd * COSL - cd * SINL * Math.cos(H)); return this.skyXY(alt / DEG, az / DEG); },
    client(x, y) { const r = V.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    sunClient() { return this.client(S.sun.sx, S.sun.sy); },
    discPoint(distKly) { const g = { x: distKly, y: 0 }; const yw = S.yaw * DEG; const x1 = g.x * Math.cos(yw) - g.y * Math.sin(yw), y1 = g.x * Math.sin(yw) + g.y * Math.cos(yw); return { x: DC.cx + DC.k * x1, y: DC.cy - DC.k * y1 }; },
    VIS,
  };
})();
